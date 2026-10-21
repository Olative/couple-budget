import { Router } from 'express';
import db from '../db.js';

const router = Router();

router.put('/categories/:id', (req, res) => {
  const { name, icon, color, planned_amount } = req.body;
  const cat = db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id);
  if (!cat) return res.status(404).json({ error: 'Not found' });

  db.prepare(
    'UPDATE categories SET name = COALESCE(?, name), icon = COALESCE(?, icon), color = COALESCE(?, color), planned_amount = COALESCE(?, planned_amount) WHERE id = ?'
  ).run(name || null, icon || null, color || null, planned_amount ?? null, req.params.id);

  const updated = db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id);
  res.json(updated);
});

router.post('/budgets/:budgetId/categories', (req, res) => {
  const { name, icon, color } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });

  const maxOrder = db.prepare('SELECT COALESCE(MAX(sort_order), -1) as m FROM categories WHERE budget_id = ?')
    .get(req.params.budgetId);

  db.prepare('INSERT INTO categories (budget_id, name, icon, color, sort_order) VALUES (?, ?, ?, ?, ?)')
    .run(req.params.budgetId, name, icon || '📦', color || '#6366f1', (maxOrder?.m ?? -1) + 1);

  const result = db.prepare('SELECT * FROM categories WHERE rowid = last_insert_rowid()').get();
  res.json(result);
});

router.delete('/categories/:id', (req, res) => {
  const expenses = db.prepare('SELECT COUNT(*) as c FROM expenses WHERE category_id = ?').get(req.params.id);
  if (expenses.c > 0) {
    return res.status(400).json({ error: 'Cannot delete category with expenses' });
  }
  db.prepare('DELETE FROM categories WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

export default router;
