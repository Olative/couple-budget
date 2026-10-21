import { Router } from 'express';
import db from '../db.js';

const router = Router();

router.get('/budgets/:budgetId/expenses', (req, res) => {
  const { budgetId } = req.params;
  const { month, category_id, limit = 50, offset = 0 } = req.query;

  let query = `
    SELECT e.*, c.name as category_name, c.icon as category_icon, c.color as category_color,
           u.first_name as user_name
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

  const expenses = db.prepare(query).all(...params);
  res.json(expenses);
});

router.post('/budgets/:budgetId/expenses', (req, res) => {
  const { budgetId } = req.params;
  const { category_id, amount, description, date } = req.body;
  const userId = req.userId;

  if (!category_id || !amount || amount <= 0) {
    return res.status(400).json({ error: 'category_id and positive amount required' });
  }

  db.prepare('INSERT INTO expenses (budget_id, category_id, user_id, amount, description, date) VALUES (?, ?, ?, ?, ?, ?)')
    .run(budgetId, category_id, userId, amount, description || null, date || new Date().toISOString().slice(0, 10));

  const result = db.prepare('SELECT * FROM expenses WHERE rowid = last_insert_rowid()').get();
  res.json(result);
});

router.delete('/expenses/:id', (req, res) => {
  const expense = db.prepare('SELECT * FROM expenses WHERE id = ?').get(req.params.id);
  if (!expense) return res.status(404).json({ error: 'Not found' });
  if (expense.user_id !== req.userId) {
    return res.status(403).json({ error: 'Can only delete own expenses' });
  }
  db.prepare('DELETE FROM expenses WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

export default router;
