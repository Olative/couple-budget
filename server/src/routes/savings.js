import { Router } from 'express';
import db from '../db.js';
import { goalEta, currentMonth } from '../insights.js';

const router = Router();

router.get('/budgets/:budgetId/savings', async (req, res) => {
  const goals = await db.prepare(`
    SELECT sg.id, sg.budget_id, sg.name, sg.target_amount, sg.icon, sg.deadline, sg.created_at, sg.monthly_plan,
           COALESCE(SUM(sc.amount), 0) as current_amount,
           COALESCE(SUM(CASE WHEN sc.created_at LIKE ? THEN sc.amount END), 0) as month_saved
    FROM savings_goals sg
    LEFT JOIN savings_contributions sc ON sg.id = sc.goal_id
    WHERE sg.budget_id = ?
    GROUP BY sg.id
    ORDER BY sg.created_at DESC
  `).all(`${currentMonth()}%`, req.params.budgetId);

  res.json(await Promise.all(goals.map(async g => {
    const { monthlyRate, etaMonth } = await goalEta(g.id, Number(g.current_amount), Number(g.target_amount));
    return { ...g, monthly_rate: monthlyRate, eta_month: etaMonth };
  })));
});

router.post('/budgets/:budgetId/savings', async (req, res) => {
  const { name, target_amount, icon, deadline, monthly_plan } = req.body;
  if (!name || !target_amount) {
    return res.status(400).json({ error: 'name and target_amount required' });
  }

  const result = await db.prepare('INSERT INTO savings_goals (budget_id, name, target_amount, icon, deadline, monthly_plan) VALUES (?, ?, ?, ?, ?, ?) RETURNING *')
    .get(req.params.budgetId, name, target_amount, icon || '🎯', deadline || null, Math.max(0, Number(monthly_plan) || 0));
  res.json(result);
});

router.put('/savings/:id', async (req, res) => {
  const { name, target_amount, deadline, monthly_plan } = req.body;
  await db.prepare(`
    UPDATE savings_goals SET name = COALESCE(?, name), target_amount = COALESCE(?, target_amount),
      deadline = ?, monthly_plan = ? WHERE id = ?
  `).run(name || null, Number(target_amount) || null, deadline || null, Math.max(0, Number(monthly_plan) || 0), req.params.id);
  res.json(await db.prepare('SELECT * FROM savings_goals WHERE id = ?').get(req.params.id));
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
