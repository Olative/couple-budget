import { Router } from 'express';
import db from '../db.js';
import { materializeRecurring } from '../insights.js';
import { INCOME_SOURCES } from './incomes.js';

const router = Router();

router.get('/budgets/:budgetId/recurring', async (req, res) => {
  const rows = await db.prepare(`
    SELECT r.*, c.name as category_name, c.icon as category_icon, u.first_name as user_name
    FROM recurring r
    LEFT JOIN categories c ON c.id = r.category_id
    JOIN users u ON u.id = r.user_id
    WHERE r.budget_id = ?
    ORDER BY r.kind DESC, r.day_of_month
  `).all(req.params.budgetId);
  res.json(rows);
});

router.post('/budgets/:budgetId/recurring', async (req, res) => {
  const { budgetId } = req.params;
  const kind = req.body.kind === 'income' ? 'income' : 'expense';
  const amount = Number(req.body.amount);
  const date = /^\d{4}-\d{2}-\d{2}$/.test(req.body.date || '') ? req.body.date : new Date().toISOString().slice(0, 10);
  if (!(amount > 0)) return res.status(400).json({ error: 'Введите сумму больше нуля' });

  let categoryId = null;
  let source = null;
  if (kind === 'expense') {
    const cat = await db.prepare('SELECT id FROM categories WHERE id = ? AND budget_id = ?').get(req.body.category_id, budgetId);
    if (!cat) return res.status(400).json({ error: 'Выберите категорию' });
    categoryId = cat.id;
  } else {
    source = INCOME_SOURCES.includes(req.body.source) ? req.body.source : 'other';
  }

  const rule = await db.prepare(`
    INSERT INTO recurring (budget_id, user_id, kind, amount, category_id, source, description, day_of_month, start_month)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING *
  `).get(budgetId, req.userId, kind, amount, categoryId, source, req.body.description || null, Number(date.slice(8, 10)), date.slice(0, 7));

  await materializeRecurring(budgetId, { force: true });
  res.json(rule);
});

router.delete('/recurring/:id', async (req, res) => {
  await db.prepare('DELETE FROM recurring WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

export default router;
