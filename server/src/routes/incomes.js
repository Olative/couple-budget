import { Router } from 'express';
import db from '../db.js';
import { materializeRecurring } from '../insights.js';

const router = Router();

export const INCOME_SOURCES = ['salary', 'side', 'gift', 'refund', 'other'];

router.get('/budgets/:budgetId/incomes', async (req, res) => {
  const { month, limit = 50, offset = 0 } = req.query;
  await materializeRecurring(req.params.budgetId);
  const params = [req.params.budgetId];
  let sql = `
    SELECT i.*, u.first_name as user_name
    FROM incomes i JOIN users u ON i.user_id = u.id
    WHERE i.budget_id = ?`;
  if (month) {
    sql += ' AND i.date LIKE ?';
    params.push(`${month}%`);
  }
  sql += ' ORDER BY i.date DESC, i.created_at DESC LIMIT ? OFFSET ?';
  params.push(Number(limit), Number(offset));
  res.json(await db.prepare(sql).all(...params));
});

router.post('/budgets/:budgetId/incomes', async (req, res) => {
  const { amount, description, date } = req.body;
  const source = INCOME_SOURCES.includes(req.body.source) ? req.body.source : 'other';
  if (!amount || amount <= 0) return res.status(400).json({ error: 'Введите сумму больше нуля' });

  const income = await db.prepare(
    'INSERT INTO incomes (budget_id, user_id, amount, source, description, date) VALUES (?, ?, ?, ?, ?, ?) RETURNING *'
  ).get(req.params.budgetId, req.userId, amount, source, description || null, date || new Date().toISOString().slice(0, 10));
  res.json(income);
});

router.put('/incomes/:id', async (req, res) => {
  const income = await db.prepare('SELECT * FROM incomes WHERE id = ?').get(req.params.id);
  if (!income) return res.status(404).json({ error: 'Not found' });
  if (income.user_id !== req.userId) return res.status(403).json({ error: 'Можно менять только свои доходы' });
  const amount = req.body.amount != null ? Number(req.body.amount) : Number(income.amount);
  if (!(amount > 0)) return res.status(400).json({ error: 'Сумма должна быть больше нуля' });
  const source = INCOME_SOURCES.includes(req.body.source) ? req.body.source : income.source;
  const description = req.body.description !== undefined ? ((req.body.description || '').trim() || null) : income.description;
  const date = /^\d{4}-\d{2}-\d{2}$/.test(req.body.date || '') ? req.body.date : income.date;
  res.json(await db.prepare('UPDATE incomes SET amount = ?, source = ?, description = ?, date = ? WHERE id = ? RETURNING *')
    .get(amount, source, description, date, income.id));
});

router.delete('/incomes/:id', async (req, res) => {
  const income = await db.prepare('SELECT * FROM incomes WHERE id = ?').get(req.params.id);
  if (!income) return res.status(404).json({ error: 'Not found' });
  if (income.user_id !== req.userId) return res.status(403).json({ error: 'Можно удалять только свои доходы' });
  await db.prepare('DELETE FROM incomes WHERE id = ?').run(income.id);
  res.json({ ok: true });
});

export default router;
