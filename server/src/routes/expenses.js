import { Router } from 'express';
import db from '../db.js';
import { materializeRecurring } from '../insights.js';
import { onExpenseAdded } from '../notify.js';

const router = Router();

router.get('/budgets/:budgetId/expenses', async (req, res) => {
  const { budgetId } = req.params;
  const { month, category_id, limit = 50, offset = 0 } = req.query;
  await materializeRecurring(budgetId);

  let query = `
    SELECT e.*, c.name as category_name, c.icon as category_icon, c.color as category_color,
           u.first_name as user_name,
           (SELECT group_concat(r.emoji, '') FROM reactions r WHERE r.expense_id = e.id) as reactions,
           (SELECT COUNT(*) FROM comments cm WHERE cm.expense_id = e.id) as comment_count
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

router.delete('/expenses/:id', async (req, res) => {
  const expense = await db.prepare('SELECT * FROM expenses WHERE id = ?').get(req.params.id);
  if (!expense) return res.status(404).json({ error: 'Not found' });
  if (expense.user_id !== req.userId) {
    return res.status(403).json({ error: 'Можно удалять только свои траты' });
  }
  await db.prepare('DELETE FROM reactions WHERE expense_id = ?').run(expense.id);
  await db.prepare('DELETE FROM comments WHERE expense_id = ?').run(expense.id);
  await db.prepare('DELETE FROM expenses WHERE id = ?').run(expense.id);
  res.json({ ok: true });
});

export default router;
