import { Router } from 'express';
import db from '../db.js';
import { currentMonth } from '../insights.js';
import { notifyPartners } from '../notify.js';

const router = Router();

async function memberOf(budgetId, userId) {
  return db.prepare('SELECT * FROM budget_members WHERE budget_id = ? AND user_id = ?').get(budgetId, userId);
}

// Shared expenses are split by each member's share (equal unless set); settlements move the balance.
export async function computeBalance(budgetId) {
  const members = await db.prepare(`
    SELECT u.id, u.first_name, bm.share,
      (SELECT COALESCE(SUM(e.amount), 0) FROM expenses e WHERE e.budget_id = bm.budget_id AND e.user_id = u.id) as paid,
      (SELECT COALESCE(SUM(s.amount), 0) FROM settlements s WHERE s.budget_id = bm.budget_id AND s.from_user = u.id) as sent,
      (SELECT COALESCE(SUM(s.amount), 0) FROM settlements s WHERE s.budget_id = bm.budget_id AND s.to_user = u.id) as received
    FROM budget_members bm JOIN users u ON u.id = bm.user_id
    WHERE bm.budget_id = ? ORDER BY bm.joined_at
  `).all(budgetId);

  const explicit = members.filter(m => m.share != null);
  const rest = members.length - explicit.length;
  const left = 100 - explicit.reduce((s, m) => s + Number(m.share), 0);
  const total = members.reduce((s, m) => s + Number(m.paid), 0);

  const rows = members.map(m => {
    const share = m.share != null ? Number(m.share) : rest ? left / rest : 0;
    const net = Number(m.paid) - (total * share) / 100 + Number(m.sent) - Number(m.received);
    return { id: m.id, first_name: m.first_name, paid: Number(m.paid), share, net };
  });

  let debt = null;
  if (rows.length === 2) {
    const [a, b] = rows;
    const amount = Math.round(Math.abs(a.net));
    if (amount >= 1) debt = a.net > 0 ? { from: b, to: a, amount } : { from: a, to: b, amount };
  }
  return { members: rows, debt };
}

router.get('/budgets/:id/balance', async (req, res) => {
  res.json(await computeBalance(req.params.id));
});

router.post('/budgets/:id/settle', async (req, res) => {
  if (!(await memberOf(req.params.id, req.userId))) return res.status(403).json({ error: 'Нет доступа' });
  const { debt } = await computeBalance(req.params.id);
  if (!debt) return res.json({ ok: true });
  await db.prepare('INSERT INTO settlements (budget_id, from_user, to_user, amount) VALUES (?, ?, ?, ?)')
    .run(req.params.id, debt.from.id, debt.to.id, debt.amount);
  const budget = await db.prepare('SELECT currency FROM budgets WHERE id = ?').get(req.params.id);
  await notifyPartners(req.params.id, req.userId,
    `🤝 ${req.user.first_name}: долг ${debt.from.first_name} → ${debt.to.first_name} ${Math.round(debt.amount)} ${budget.currency} отмечен как возвращённый. Вы в расчёте.`);
  res.json({ ok: true });
});

router.put('/budgets/:id/shares', async (req, res) => {
  const myShare = Number(req.body.myShare);
  if (!(myShare >= 0 && myShare <= 100)) return res.status(400).json({ error: 'Доля от 0 до 100%' });
  if (!(await memberOf(req.params.id, req.userId))) return res.status(403).json({ error: 'Нет доступа' });
  const others = await db.prepare('SELECT user_id FROM budget_members WHERE budget_id = ? AND user_id != ?').all(req.params.id, req.userId);
  await db.prepare('UPDATE budget_members SET share = ? WHERE budget_id = ? AND user_id = ?').run(myShare, req.params.id, req.userId);
  for (const o of others) {
    await db.prepare('UPDATE budget_members SET share = ? WHERE budget_id = ? AND user_id = ?').run((100 - myShare) / others.length, req.params.id, o.user_id);
  }
  res.json(await computeBalance(req.params.id));
});

router.get('/budgets/:id/personal', async (req, res) => {
  const month = /^\d{4}-\d{2}$/.test(req.query.month || '') ? req.query.month : currentMonth();
  const items = await db.prepare(`
    SELECT p.*, c.name as category_name, c.icon as category_icon
    FROM personal_expenses p LEFT JOIN categories c ON c.id = p.category_id
    WHERE p.budget_id = ? AND p.user_id = ?
    ORDER BY p.date DESC, p.created_at DESC LIMIT 100
  `).all(req.params.id, req.userId);
  const totals = await db.prepare(`
    SELECT u.id, u.first_name, bm.personal_limit,
      (SELECT COALESCE(SUM(p.amount), 0) FROM personal_expenses p WHERE p.budget_id = bm.budget_id AND p.user_id = u.id AND p.date LIKE ?) as spent
    FROM budget_members bm JOIN users u ON u.id = bm.user_id
    WHERE bm.budget_id = ? ORDER BY bm.joined_at
  `).all(`${month}%`, req.params.id);
  res.json({
    items,
    members: totals.map(t => ({ id: t.id, first_name: t.first_name, limit: Number(t.personal_limit), spent: Number(t.spent) })),
  });
});

router.post('/budgets/:id/personal', async (req, res) => {
  const amount = Number(req.body.amount);
  if (!(amount > 0)) return res.status(400).json({ error: 'Введите сумму больше нуля' });
  if (!(await memberOf(req.params.id, req.userId))) return res.status(403).json({ error: 'Нет доступа' });
  const item = await db.prepare(
    'INSERT INTO personal_expenses (budget_id, user_id, category_id, amount, description, date) VALUES (?, ?, ?, ?, ?, ?) RETURNING *'
  ).get(req.params.id, req.userId, req.body.category_id || null, amount, req.body.description || null,
    /^\d{4}-\d{2}-\d{2}$/.test(req.body.date || '') ? req.body.date : new Date().toISOString().slice(0, 10));
  res.json(item);
});

router.delete('/personal/:id', async (req, res) => {
  const item = await db.prepare('SELECT * FROM personal_expenses WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!item) return res.status(404).json({ error: 'Not found' });
  await db.prepare('DELETE FROM personal_expenses WHERE id = ?').run(item.id);
  res.json({ ok: true });
});

router.put('/budgets/:id/personal-limit', async (req, res) => {
  const amount = Math.max(0, Number(req.body.amount) || 0);
  await db.prepare('UPDATE budget_members SET personal_limit = ? WHERE budget_id = ? AND user_id = ?').run(amount, req.params.id, req.userId);
  res.json({ ok: true, limit: amount });
});

export default router;
