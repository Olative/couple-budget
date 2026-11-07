import { Router } from 'express';
import db from '../db.js';
import { materializeRecurring } from '../insights.js';
import { onExpenseAdded, notifyUser } from '../notify.js';
import { learnMerchant } from '../importer.js';

const router = Router();

router.get('/budgets/:budgetId/expenses', async (req, res) => {
  const { budgetId } = req.params;
  const { month, category_id, limit = 50, offset = 0 } = req.query;
  await materializeRecurring(budgetId);

  let query = `
    SELECT e.*, c.name as category_name, c.icon as category_icon, c.color as category_color,
           u.first_name as user_name,
           (SELECT group_concat(r.emoji, '') FROM reactions r WHERE r.expense_id = e.id) as reactions,
           (SELECT COUNT(*) FROM comments cm WHERE cm.expense_id = e.id) as comment_count,
           EXISTS (SELECT 1 FROM receipts rc WHERE rc.expense_id = e.id) as has_receipt,
           EXISTS (SELECT 1 FROM expense_edits ed WHERE ed.expense_id = e.id AND ed.user_id != e.user_id) as edited_by_other
    FROM expenses e
    JOIN categories c ON e.category_id = c.id
    JOIN users u ON e.user_id = u.id
    WHERE e.budget_id = ?
  `;
  const params = [budgetId];

  if (month) {
    query += ' AND e.date LIKE ?';
    params.push(`${month}%`);
  }
  if (category_id) {
    query += ' AND e.category_id = ?';
    params.push(category_id);
  }

  query += ' ORDER BY e.date DESC, e.created_at DESC LIMIT ? OFFSET ?';
  params.push(Number(limit), Number(offset));

  const expenses = await db.prepare(query).all(...params);
  res.json(expenses);
});

router.post('/budgets/:budgetId/expenses', async (req, res) => {
  const { budgetId } = req.params;
  const { category_id, amount, description, date } = req.body;
  const userId = req.userId;

  if (!category_id || !amount || amount <= 0) {
    return res.status(400).json({ error: 'category_id and positive amount required' });
  }

  const result = await db.prepare(
    'INSERT INTO expenses (budget_id, category_id, user_id, amount, description, date) VALUES (?, ?, ?, ?, ?, ?) RETURNING *'
  ).get(budgetId, category_id, userId, amount, description || null, date || new Date().toISOString().slice(0, 10));
  res.json(result);
  onExpenseAdded(result, req.user).catch(e => console.error('Expense notify failed:', e.message));
});

const FIELD_NAMES = { category: 'категория', amount: 'сумма', description: 'описание', date: 'дата' };
const fmtDate = (d) => `${Number(d.slice(8, 10))}.${d.slice(5, 7)}`;

// Either member can fix an expense; every change is kept so the other one can see who changed what.
router.put('/expenses/:id', async (req, res) => {
  const e = await db.prepare(`
    SELECT e.*, c.name as category_name, b.currency FROM expenses e
    JOIN categories c ON c.id = e.category_id JOIN budgets b ON b.id = e.budget_id WHERE e.id = ?
  `).get(req.params.id);
  if (!e) return res.status(404).json({ error: 'Трата не найдена' });
  const member = await db.prepare('SELECT 1 FROM budget_members WHERE budget_id = ? AND user_id = ?').get(e.budget_id, req.userId);
  if (!member) return res.status(403).json({ error: 'Нет доступа' });

  const changes = [];
  const next = { category_id: e.category_id, amount: Number(e.amount), description: e.description, date: e.date };
  if (req.body.category_id != null && Number(req.body.category_id) !== Number(e.category_id)) {
    const cat = await db.prepare('SELECT * FROM categories WHERE id = ? AND budget_id = ?').get(req.body.category_id, e.budget_id);
    if (!cat) return res.status(400).json({ error: 'Нет такой категории' });
    next.category_id = cat.id;
    changes.push(['category', e.category_name, cat.name]);
  }
  if (req.body.amount != null) {
    const amount = Number(req.body.amount);
    if (!(amount > 0)) return res.status(400).json({ error: 'Сумма должна быть больше нуля' });
    if (amount !== Number(e.amount)) { next.amount = amount; changes.push(['amount', String(e.amount), String(amount)]); }
  }
  if (req.body.description !== undefined) {
    const d = (req.body.description || '').trim() || null;
    if (d !== e.description) { next.description = d; changes.push(['description', e.description || '', d || '']); }
  }
  if (req.body.date && /^\d{4}-\d{2}-\d{2}$/.test(req.body.date) && req.body.date !== e.date) {
    next.date = req.body.date;
    changes.push(['date', e.date, req.body.date]);
  }
  if (!changes.length) return res.json({ ok: true, changed: 0 });

  await db.batch([
    { sql: 'UPDATE expenses SET category_id = ?, amount = ?, description = ?, date = ? WHERE id = ?', args: [next.category_id, next.amount, next.description, next.date, e.id] },
    ...changes.map(([field, from, to]) => ({
      sql: 'INSERT INTO expense_edits (expense_id, user_id, field, old_value, new_value) VALUES (?, ?, ?, ?, ?)',
      args: [e.id, req.userId, field, from, to],
    })),
  ]);
  if (changes.some(c => c[0] === 'category') && next.description) await learnMerchant(e.budget_id, next.description, next.category_id);

  if (e.user_id !== req.userId) {
    const what = changes.map(([field, from, to]) => {
      const show = (v) => (field === 'amount' ? `${Math.round(Number(v))} ${e.currency}` : field === 'date' ? fmtDate(v) : `«${v || '—'}»`);
      return `${FIELD_NAMES[field]} ${show(from)} → ${show(to)}`;
    }).join(', ');
    notifyUser(e.user_id, `✏️ ${req.user.first_name}: правка в вашей трате «${e.description || e.category_name}» — ${what}`)
      .catch(err => console.error('Edit notify failed:', err.message));
  }
  res.json({ ok: true, changed: changes.length });
});

router.delete('/expenses/:id', async (req, res) => {
  const expense = await db.prepare('SELECT * FROM expenses WHERE id = ?').get(req.params.id);
  if (!expense) return res.status(404).json({ error: 'Not found' });
  if (expense.user_id !== req.userId) {
    return res.status(403).json({ error: 'Можно удалять только свои траты' });
  }
  await db.prepare('DELETE FROM reactions WHERE expense_id = ?').run(expense.id);
  await db.prepare('DELETE FROM comments WHERE expense_id = ?').run(expense.id);
  await db.prepare('DELETE FROM receipts WHERE expense_id = ?').run(expense.id);
  await db.prepare('DELETE FROM expense_edits WHERE expense_id = ?').run(expense.id);
  await db.prepare('DELETE FROM expenses WHERE id = ?').run(expense.id);
  res.json({ ok: true });
});

export default router;
