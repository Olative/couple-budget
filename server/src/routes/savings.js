import { Router } from 'express';
import db from '../db.js';
import { goalEta } from '../insights.js';

const router = Router();

router.get('/budgets/:budgetId/savings', async (req, res) => {
  const goals = await db.prepare(`
    SELECT sg.id, sg.budget_id, sg.name, sg.target_amount, sg.icon, sg.deadline, sg.created_at,
           COALESCE(SUM(sc.amount), 0) as current_amount
    FROM savings_goals sg
    LEFT JOIN savings_contributions sc ON sg.id = sc.goal_id
    WHERE sg.budget_id = ?
    GROUP BY sg.id
    ORDER BY sg.created_at DESC
  `).all(req.params.budgetId);

  const withEta = [];
  for (const g of goals) {
    const { monthlyRate, etaMonth } = await goalEta(g.id, Number(g.current_amount), Number(g.target_amount));
    withEta.push({ ...g, monthly_rate: monthlyRate, eta_month: etaMonth });
  }
  res.json(withEta);
});

router.post('/budgets/:budgetId/savings', async (req, res) => {
  const { name, target_amount, icon, deadline } = req.body;
  if (!name || !target_amount) {
    return res.status(400).json({ error: 'name and target_amount required' });
  }

  await db.prepare('INSERT INTO savings_goals (budget_id, name, target_amount, icon, deadline) VALUES (?, ?, ?, ?, ?)')
    .run(req.params.budgetId, name, target_amount, icon || '🎯', deadline || null);

  const result = await db.prepare('SELECT * FROM savings_goals WHERE rowid = last_insert_rowid()').get();
  res.json(result);
});

router.post('/savings/:goalId/contribute', async (req, res) => {
  const { amount } = req.body;
  const userId = req.userId;
  if (!amount || amount <= 0) {
    return res.status(400).json({ error: 'Positive amount required' });
  }

  await db.prepare('INSERT INTO savings_contributions (goal_id, user_id, amount) VALUES (?, ?, ?)')
    .run(req.params.goalId, userId, amount);

  const goal = await db.prepare(`
    SELECT sg.id, sg.budget_id, sg.name, sg.target_amount, sg.icon, sg.deadline, sg.created_at,
           COALESCE(SUM(sc.amount), 0) as current_amount
    FROM savings_goals sg
    LEFT JOIN savings_contributions sc ON sg.id = sc.goal_id
    WHERE sg.id = ?
    GROUP BY sg.id
  `).get(req.params.goalId);

  res.json(goal);
});

router.delete('/savings/:id', async (req, res) => {
  await db.prepare('DELETE FROM savings_contributions WHERE goal_id = ?').run(req.params.id);
  await db.prepare('DELETE FROM savings_goals WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

export default router;
