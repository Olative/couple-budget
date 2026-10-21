import { Router } from 'express';
import db from '../db.js';

const router = Router();

router.get('/budgets/:budgetId/savings', (req, res) => {
  const goals = db.prepare(`
    SELECT sg.*,
           COALESCE(SUM(sc.amount), 0) as current_amount
    FROM savings_goals sg
    LEFT JOIN savings_contributions sc ON sg.id = sc.goal_id
    WHERE sg.budget_id = ?
    GROUP BY sg.id
    ORDER BY sg.created_at DESC
  `).all(req.params.budgetId);

  res.json(goals);
});

router.post('/budgets/:budgetId/savings', (req, res) => {
  const { name, target_amount, icon, deadline } = req.body;
  if (!name || !target_amount) {
    return res.status(400).json({ error: 'name and target_amount required' });
  }

  const result = db.prepare(`
    INSERT INTO savings_goals (budget_id, name, target_amount, icon, deadline)
    VALUES (?, ?, ?, ?, ?)
    RETURNING *
  `).get(req.params.budgetId, name, target_amount, icon || '🎯', deadline || null);

  res.json(result);
});

router.post('/savings/:goalId/contribute', (req, res) => {
  const { amount } = req.body;
  const userId = req.userId;

  if (!amount || amount <= 0) {
    return res.status(400).json({ error: 'Positive amount required' });
  }

  db.prepare(`
    INSERT INTO savings_contributions (goal_id, user_id, amount)
    VALUES (?, ?, ?)
  `).run(req.params.goalId, userId, amount);

  const goal = db.prepare(`
    SELECT sg.*, COALESCE(SUM(sc.amount), 0) as current_amount
    FROM savings_goals sg
    LEFT JOIN savings_contributions sc ON sg.id = sc.goal_id
    WHERE sg.id = ?
    GROUP BY sg.id
  `).get(req.params.goalId);

  res.json(goal);
});

router.delete('/savings/:id', (req, res) => {
  db.prepare('DELETE FROM savings_contributions WHERE goal_id = ?').run(req.params.id);
  db.prepare('DELETE FROM savings_goals WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

export default router;
