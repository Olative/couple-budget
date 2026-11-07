import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import db from '../db.js';
import { buildForecast, buildRecap, currentMonth, shiftMonth, materializeRecurring } from '../insights.js';
import { inviteLink } from '../bot.js';
import { textOf } from '../validate.js';
import { notifyPartners } from '../notify.js';
import { langOfUser } from '../i18n.js';

const router = Router();

const DEFAULT_CATEGORIES = [
  { name: 'Продукты', en: 'Groceries', icon: '🛒', color: '#22c55e' },
  { name: 'Кафе и рестораны', en: 'Cafes & restaurants', icon: '🍕', color: '#f97316' },
  { name: 'Транспорт', en: 'Transport', icon: '🚌', color: '#3b82f6' },
  { name: 'Жильё', en: 'Housing', icon: '🏠', color: '#8b5cf6' },
  { name: 'Коммунальные', en: 'Utilities', icon: '💡', color: '#eab308' },
  { name: 'Здоровье', en: 'Health', icon: '💊', color: '#ef4444' },
  { name: 'Одежда', en: 'Clothes', icon: '👕', color: '#ec4899' },
  { name: 'Развлечения', en: 'Entertainment', icon: '🎬', color: '#06b6d4' },
  { name: 'Подписки', en: 'Subscriptions', icon: '📱', color: '#6366f1' },
  { name: 'Прочее', en: 'Other', icon: '📦', color: '#78716c' },
];

router.post('/budgets', async (req, res) => {
  const name = textOf(req.body.name, 60), currency = textOf(req.body.currency, 8);
  const userId = req.userId;
  const id = uuidv4();
  const inviteCode = crypto.randomBytes(6).toString('hex');
  const en = (await langOfUser(userId)) === 'en';

  try {
    await db.prepare('INSERT INTO budgets (id, name, currency, created_by, invite_code) VALUES (?, ?, ?, ?, ?)')
      .run(id, name || (en ? 'Our budget' : 'Наш бюджет'), currency || '₽', userId, inviteCode);

    await db.prepare('INSERT INTO budget_members (budget_id, user_id, role) VALUES (?, ?, ?)')
      .run(id, userId, 'owner');

    for (const [i, cat] of DEFAULT_CATEGORIES.entries()) {
      await db.prepare('INSERT INTO categories (budget_id, name, icon, color, sort_order) VALUES (?, ?, ?, ?, ?)')
        .run(id, en ? cat.en : cat.name, cat.icon, cat.color, i);
    }

    await db.prepare('UPDATE users SET active_budget_id = ? WHERE id = ?').run(id, userId);
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
  if (!budget) return res.status(404).json({ error: 'Приглашение не найдено. Попросите прислать новую ссылку' });

  const existing = await db.prepare('SELECT * FROM budget_members WHERE budget_id = ? AND user_id = ?').get(budget.id, userId);
  if (existing) return res.json(budget);

  const members = await db.prepare('SELECT COUNT(*) as count FROM budget_members WHERE budget_id = ?').get(budget.id);
  if (members.count >= 2) return res.status(400).json({ error: 'В этом бюджете уже двое участников' });

  await db.prepare('INSERT INTO budget_members (budget_id, user_id) VALUES (?, ?)').run(budget.id, userId);
  await db.prepare('UPDATE users SET active_budget_id = ? WHERE id = ?').run(budget.id, userId);
  res.json(budget);
});

// Every budget of the user with who is in it, for the switcher.
router.get('/me/budgets', async (req, res) => {
  const budgets = await db.prepare(`
    SELECT b.*, (
      SELECT GROUP_CONCAT(u.first_name, ' и ') FROM budget_members m JOIN users u ON u.id = m.user_id WHERE m.budget_id = b.id
    ) as people
    FROM budgets b JOIN budget_members bm ON b.id = bm.budget_id WHERE bm.user_id = ?
    ORDER BY bm.joined_at
  `).all(req.userId);
  res.json(budgets);
});

router.get('/budgets/:id', async (req, res) => {
  const budget = await db.prepare('SELECT * FROM budgets WHERE id = ?').get(req.params.id);
  if (!budget) return res.status(404).json({ error: 'Not found' });

  const [members, categories] = await Promise.all([
    db.prepare('SELECT u.id, u.first_name, u.username, bm.role FROM users u JOIN budget_members bm ON u.id = bm.user_id WHERE bm.budget_id = ?').all(budget.id),
    db.prepare('SELECT * FROM categories WHERE budget_id = ? ORDER BY sort_order').all(budget.id),
  ]);

  res.json({ ...budget, members, categories, invite_link: inviteLink(budget.invite_code) });
});

router.put('/budgets/:id', async (req, res) => {
  const name = textOf(req.body.name, 60), currency = textOf(req.body.currency, 8);
  const budget = await db.prepare('SELECT * FROM budgets WHERE id = ?').get(req.params.id);
  if (!budget) return res.status(404).json({ error: 'Not found' });

  await db.prepare('UPDATE budgets SET currency = COALESCE(?, currency), name = COALESCE(?, name) WHERE id = ?')
    .run(currency || null, name || null, req.params.id);

  const updated = await db.prepare('SELECT * FROM budgets WHERE id = ?').get(req.params.id);
  res.json(updated);
});

// Start the budget over: drop every record, keep the budget and its categories, optionally the second member.
router.post('/budgets/:id/reset', async (req, res) => {
  const { id } = req.params;
  const member = await db.prepare('SELECT 1 FROM budget_members WHERE budget_id = ? AND user_id = ?').get(id, req.userId);
  if (!member) return res.status(403).json({ error: 'Нет доступа' });
  const removePartner = !!req.body.remove_partner;
  const budget = await db.prepare('SELECT name FROM budgets WHERE id = ?').get(id);

  await notifyPartners(id, req.userId, removePartner
    ? `🐧 ${req.user.first_name}: бюджет «${budget.name}» очищен и начат заново. Вы больше не участник этого бюджета.`
    : `🐧 ${req.user.first_name}: бюджет «${budget.name}» очищен — траты, доходы и копилка начинаются с нуля.`);

  const expenseIds = `SELECT id FROM expenses WHERE budget_id = ?`;
  const goalIds = `SELECT id FROM savings_goals WHERE budget_id = ?`;
  const statements = [
    { sql: `DELETE FROM reactions WHERE expense_id IN (${expenseIds})`, args: [id] },
    { sql: `DELETE FROM comments WHERE expense_id IN (${expenseIds})`, args: [id] },
    { sql: `DELETE FROM receipts WHERE expense_id IN (${expenseIds})`, args: [id] },
    { sql: 'DELETE FROM expenses WHERE budget_id = ?', args: [id] },
    { sql: 'DELETE FROM incomes WHERE budget_id = ?', args: [id] },
    { sql: `DELETE FROM savings_contributions WHERE goal_id IN (${goalIds})`, args: [id] },
    { sql: `DELETE FROM savings_alerts WHERE goal_id IN (${goalIds})`, args: [id] },
    { sql: 'DELETE FROM savings_goals WHERE budget_id = ?', args: [id] },
    { sql: 'DELETE FROM recurring WHERE budget_id = ?', args: [id] },
    { sql: 'DELETE FROM settlements WHERE budget_id = ?', args: [id] },
    { sql: 'DELETE FROM personal_expenses WHERE budget_id = ?', args: [id] },
    { sql: 'DELETE FROM recap_sent WHERE budget_id = ?', args: [id] },
    { sql: 'DELETE FROM limit_alerts WHERE category_id IN (SELECT id FROM categories WHERE budget_id = ?)', args: [id] },
    { sql: 'UPDATE categories SET planned_amount = 0 WHERE budget_id = ?', args: [id] },
    { sql: 'UPDATE budget_members SET share = NULL, personal_limit = 0 WHERE budget_id = ?', args: [id] },
  ];
  if (removePartner) {
    statements.push({ sql: 'DELETE FROM budget_members WHERE budget_id = ? AND user_id != ?', args: [id, req.userId] });
    // A fresh invite code so the old link no longer lets the removed member back in.
    statements.push({ sql: 'UPDATE budgets SET invite_code = ? WHERE id = ?', args: [crypto.randomBytes(6).toString('hex'), id] });
  }
  await db.batch(statements);
  res.json({ ok: true });
});

router.get('/budgets/:id/summary', async (req, res) => {
  const { id } = req.params;
  const { month } = req.query;
  const currentMonth = month || new Date().toISOString().slice(0, 7);
  await materializeRecurring(id);

  const [totalRow, byCategory, byMember, incomeRow] = await Promise.all([
    db.prepare('SELECT COALESCE(SUM(amount), 0) as total FROM spending WHERE budget_id = ? AND date LIKE ?').get(id, `${currentMonth}%`),
    db.prepare(`
    SELECT c.id, c.name, c.icon, c.color, c.planned_amount,
           COALESCE(SUM(e.amount), 0) as spent
    FROM categories c
    LEFT JOIN spending e ON c.id = e.category_id AND e.date LIKE ?
    WHERE c.budget_id = ?
    GROUP BY c.id
    ORDER BY c.sort_order
  `).all(`${currentMonth}%`, id),
    db.prepare(`
    SELECT u.id, u.first_name, u.username, bm.personal_limit as personal_limit,
      -- "Who spent how much" is about personal spending only; shared expenses belong to both.
      (SELECT COALESCE(SUM(p.amount), 0) FROM expenses p WHERE p.user_id = u.id AND p.budget_id = ? AND p.personal = 1 AND p.date LIKE ?) as spent,
      (SELECT COALESCE(SUM(i.amount), 0) FROM incomes i WHERE i.user_id = u.id AND i.budget_id = ? AND i.date LIKE ?) as earned
    FROM users u
    JOIN budget_members bm ON u.id = bm.user_id
    WHERE bm.budget_id = ?
    ORDER BY bm.joined_at
  `).all(id, `${currentMonth}%`, id, `${currentMonth}%`, id),
    db.prepare('SELECT COALESCE(SUM(amount), 0) as total FROM incomes WHERE budget_id = ? AND date LIKE ?').get(id, `${currentMonth}%`),
  ]);

  const totalPlanned = byCategory.reduce((sum, c) => sum + (c.planned_amount || 0), 0);

  const carryOver = await carryOverInto(id, currentMonth);
  res.json({ totalSpent: totalRow.total, totalIncome: Number(incomeRow.total), carryOver, totalPlanned, byCategory, byMember, month: currentMonth });
});

// What is left from earlier months: incomes minus all spending, counted from the first month
// that has any income (budgets that never record income have nothing to carry).
async function carryOverInto(budgetId, month) {
  const first = await db.prepare("SELECT MIN(substr(date, 1, 7)) as m FROM incomes WHERE budget_id = ?").get(budgetId);
  if (!first?.m || first.m >= month) return 0;
  const [inc, exp] = await Promise.all([
    db.prepare('SELECT COALESCE(SUM(amount), 0) as s FROM incomes WHERE budget_id = ? AND date >= ? AND date < ?').get(budgetId, `${first.m}-01`, `${month}-01`),
    db.prepare('SELECT COALESCE(SUM(amount), 0) as s FROM spending WHERE budget_id = ? AND date >= ? AND date < ?').get(budgetId, `${first.m}-01`, `${month}-01`),
  ]);
  return Math.round((Number(inc.s) - Number(exp.s)) * 100) / 100;
}

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
