import { Router } from 'express';
import db from '../db.js';

const router = Router();

router.put('/categories/:id', async (req, res) => {
  const { name, icon, color, planned_amount } = req.body;
  const cat = await db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id);
  if (!cat) return res.status(404).json({ error: 'Not found' });

  await db.prepare(
    'UPDATE categories SET name = COALESCE(?, name), icon = COALESCE(?, icon), color = COALESCE(?, color), planned_amount = COALESCE(?, planned_amount) WHERE id = ?'
  ).run(name || null, icon || null, color || null, planned_amount ?? null, req.params.id);

  const updated = await db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id);
  res.json(updated);
});

router.post('/budgets/:budgetId/categories', async (req, res) => {
  const { icon, color, planned_amount } = req.body;
  const name = (req.body.name || '').trim().slice(0, 40);
  if (!name) return res.status(400).json({ error: 'Введите название категории' });

  const maxOrder = await db.prepare('SELECT COALESCE(MAX(sort_order), -1) as m FROM categories WHERE budget_id = ?')
    .get(req.params.budgetId);

  // RETURNING instead of last_insert_rowid(): over Turso's HTTP API each statement may run on its own connection.
  const result = await db.prepare(
    'INSERT INTO categories (budget_id, name, icon, color, planned_amount, sort_order) VALUES (?, ?, ?, ?, ?, ?) RETURNING *'
  ).get(req.params.budgetId, name, icon || '📦', color || '#6366f1', Number(planned_amount) || 0, (maxOrder?.m ?? -1) + 1);
  res.json(result);
});

router.delete('/categories/:id', async (req, res) => {
  const expenses = await db.prepare('SELECT COUNT(*) as c FROM expenses WHERE category_id = ?').get(req.params.id);
  if (expenses.c > 0) {
    return res.status(400).json({ error: 'Cannot delete category with expenses' });
  }
  await db.prepare('DELETE FROM categories WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

export default router;
