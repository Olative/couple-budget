import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import db from '../db.js';
import { buildForecast, buildRecap, currentMonth, shiftMonth } from '../insights.js';
import { inviteLink } from '../bot.js';

const router = Router();

const DEFAULT_CATEGORIES = [
  { name: 'Продукты', icon: '🛒', color: '#22c55e' },
  { name: 'Кафе и рестораны', icon: '🍕', color: '#f97316' },
  { name: 'Транспорт', icon: '🚌', color: '#3b82f6' },
  { name: 'Жильё', icon: '🏠', color: '#8b5cf6' },
  { name: 'Коммунальные', icon: '💡', color: '#eab308' },
  { name: 'Здоровье', icon: '💊', color: '#ef4444' },
  { name: 'Одежда', icon: '👕', color: '#ec4899' },
  { name: 'Развлечения', icon: '🎬', color: '#06b6d4' },
  { name: 'Подписки', icon: '📱', color: '#6366f1' },
  { name: 'Прочее', icon: '📦', color: '#78716c' },
];

router.post('/budgets', async (req, res) => {
  const { name, currency } = req.body;
  const userId = req.userId;
  const id = uuidv4();
  const inviteCode = crypto.randomBytes(6).toString('hex');

  try {
    await db.prepare('INSERT INTO budgets (id, name, currency, created_by, invite_code) VALUES (?, ?, ?, ?, ?)')
      .run(id, name || 'Наш бюджет', currency || '₽', userId, inviteCode);

    await db.prepare('INSERT INTO budget_members (budget_id, user_id, role) VALUES (?, ?, ?)')
      .run(id, userId, 'owner');

    for (const [i, cat] of DEFAULT_CATEGORIES.entries()) {
      await db.prepare('INSERT INTO categories (budget_id, name, icon, color, sort_order) VALUES (?, ?, ?, ?, ?)')
        .run(id, cat.name, cat.icon, cat.color, i);
    }

    const budget = await db.prepare('SELECT * FROM budgets WHERE id = ?').get(id);
    res.json(budget);
  } catch (e) {
    console.error('Budget creation error:', e);
    res.status(500).json({ error: 'Failed to create budget' });
  }
});

router.post('/budgets/join', async (req, res) => {
  const { inviteCode } = req.body;
  const userId = req.userId;

  const budget = await db.prepare('SELECT * FROM budgets WHERE invite_code = ?').get(inviteCode);
  if (!budget) return res.status(404).json({ error: 'Приглашение не найдено. Попросите партнёра прислать новую ссылку' });

  const existing = await db.prepare('SELECT * FROM budget_members WHERE budget_id = ? AND user_id = ?').get(budget.id, userId);
  if (existing) return res.json(budget);

  const members = await db.prepare('SELECT COUNT(*) as count FROM budget_members WHERE budget_id = ?').get(budget.id);
  if (members.count >= 2) return res.status(400).json({ error: 'В этом бюджете уже двое участников' });

  await db.prepare('INSERT INTO budget_members (budget_id, user_id) VALUES (?, ?)').run(budget.id, userId);
  res.json(budget);
});

router.get('/budgets/:id', async (req, res) => {
  const budget = await db.prepare('SELECT * FROM budgets WHERE id = ?').get(req.params.id);
  if (!budget) return res.status(404).json({ error: 'Not found' });

  const members = await db.prepare(
    'SELECT u.*, bm.role FROM users u JOIN budget_members bm ON u.id = bm.user_id WHERE bm.budget_id = ?'
  ).all(budget.id);

  const categories = await db.prepare('SELECT * FROM categories WHERE budget_id = ? ORDER BY sort_order').all(budget.id);

  res.json({ ...budget, members, categories, invite_link: inviteLink(budget.invite_code) });
});

router.put('/budgets/:id', async (req, res) => {
  const { currency, name } = req.body;
  const budget = await db.prepare('SELECT * FROM budgets WHERE id = ?').get(req.params.id);
  if (!budget) return res.status(404).json({ error: 'Not found' });

  await db.prepare('UPDATE budgets SET currency = COALESCE(?, currency), name = COALESCE(?, name) WHERE id = ?')
    .run(currency || null, name || null, req.params.id);

  const updated = await db.prepare('SELECT * FROM budgets WHERE id = ?').get(req.params.id);
  res.json(updated);
});

router.get('/budgets/:id/summary', async (req, res) => {
  const { id } = req.params;
  const { month } = req.query;
  const currentMonth = month || new Date().toISOString().slice(0, 7);

  const totalRow = await db.prepare('SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE budget_id = ? AND date LIKE ?')
    .get(id, `${currentMonth}%`);

  const byCategory = await db.prepare(`
    SELECT c.id, c.name, c.icon, c.color, c.planned_amount,
           COALESCE(SUM(e.amount), 0) as spent
    FROM categories c
    LEFT JOIN expenses e ON c.id = e.category_id AND e.date LIKE ?
    WHERE c.budget_id = ?
    GROUP BY c.id
    ORDER BY c.sort_order
  `).all(`${currentMonth}%`, id);

  const byMember = await db.prepare(`
    SELECT u.id, u.first_name, u.username, COALESCE(SUM(e.amount), 0) as spent
    FROM users u
    JOIN budget_members bm ON u.id = bm.user_id
    LEFT JOIN expenses e ON u.id = e.user_id AND e.budget_id = ? AND e.date LIKE ?
    WHERE bm.budget_id = ?
    GROUP BY u.id
  `).all(id, `${currentMonth}%`, id);

  const totalPlanned = byCategory.reduce((sum, c) => sum + (c.planned_amount || 0), 0);

  res.json({ totalSpent: totalRow.total, totalPlanned, byCategory, byMember, month: currentMonth });
});

const MONTH_RE = /^\d{4}-\d{2}$/;

router.get('/budgets/:id/forecast', async (req, res) => {
  const month = MONTH_RE.test(req.query.month || '') ? req.query.month : currentMonth();
  res.json(await buildForecast(req.params.id, month));
});

router.get('/budgets/:id/recap', async (req, res) => {
  const month = MONTH_RE.test(req.query.month || '') ? req.query.month : shiftMonth(currentMonth(), -1);
  res.json(await buildRecap(req.params.id, month));
});

export default router;
