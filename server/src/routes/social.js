import { Router } from 'express';
import db from '../db.js';
import { expenseLabel, getPrefs, notifyUser } from '../notify.js';

const router = Router();

export const REACTIONS = ['😍', '👍', '😱', '🤔', '💸', '🐧'];

router.get('/expenses/:id/thread', async (req, res) => {
  const expense = await db.prepare(`
    SELECT e.*, c.name as category_name, c.icon as category_icon, u.first_name as user_name
    FROM expenses e JOIN categories c ON c.id = e.category_id JOIN users u ON u.id = e.user_id
    WHERE e.id = ?
  `).get(req.params.id);
  if (!expense) return res.status(404).json({ error: 'Трата не найдена' });

  const reactions = await db.prepare(`
    SELECT r.emoji, r.user_id, u.first_name as user_name FROM reactions r JOIN users u ON u.id = r.user_id
    WHERE r.expense_id = ? ORDER BY r.created_at
  `).all(expense.id);
  const comments = await db.prepare(`
    SELECT c.id, c.text, c.user_id, c.created_at, u.first_name as user_name FROM comments c JOIN users u ON u.id = c.user_id
    WHERE c.expense_id = ? ORDER BY c.created_at
  `).all(expense.id);
  const edits = await db.prepare(`
    SELECT ed.field, ed.old_value, ed.new_value, ed.created_at, ed.user_id, u.first_name as user_name
    FROM expense_edits ed JOIN users u ON u.id = ed.user_id WHERE ed.expense_id = ? AND ed.kind = 'expense' ORDER BY ed.created_at
  `).all(expense.id);
  res.json({ expense, reactions, comments, edits });
});

router.put('/expenses/:id/reaction', async (req, res) => {
  const { emoji } = req.body;
  const info = await expenseLabel(req.params.id);
  if (!info) return res.status(404).json({ error: 'Трата не найдена' });

  if (!emoji) {
    await db.prepare('DELETE FROM reactions WHERE expense_id = ? AND user_id = ?').run(info.e.id, req.userId);
    return res.json({ ok: true });
  }
  if (!REACTIONS.includes(emoji)) return res.status(400).json({ error: 'Unknown reaction' });

  const prev = await db.prepare('SELECT emoji FROM reactions WHERE expense_id = ? AND user_id = ?').get(info.e.id, req.userId);
  await db.prepare(`
    INSERT INTO reactions (expense_id, user_id, emoji) VALUES (?, ?, ?)
    ON CONFLICT (expense_id, user_id) DO UPDATE SET emoji = excluded.emoji, created_at = datetime('now')
  `).run(info.e.id, req.userId, emoji);

  if (info.e.user_id !== req.userId && prev?.emoji !== emoji) {
    await notifyUser(info.e.user_id, `${req.user.first_name}: ${emoji} на трату ${info.label}`);
  }
  res.json({ ok: true });
});

router.post('/expenses/:id/comments', async (req, res) => {
  const text = String(req.body.text || '').trim().slice(0, 500);
  if (!text) return res.status(400).json({ error: 'Напишите комментарий' });
  const info = await expenseLabel(req.params.id);
  if (!info) return res.status(404).json({ error: 'Трата не найдена' });

  const comment = await db.prepare('INSERT INTO comments (expense_id, user_id, text) VALUES (?, ?, ?) RETURNING *')
    .get(info.e.id, req.userId, text);

  if (info.e.user_id !== req.userId) {
    await notifyUser(info.e.user_id, `💬 ${req.user.first_name} к трате ${info.label}:\n«${text}»`);
  }
  res.json({ ...comment, user_name: req.user.first_name });
});

router.delete('/comments/:id', async (req, res) => {
  const c = await db.prepare('SELECT * FROM comments WHERE id = ?').get(req.params.id);
  if (!c) return res.status(404).json({ error: 'Not found' });
  if (c.user_id !== req.userId) return res.status(403).json({ error: 'Можно удалять только свои комментарии' });
  await db.prepare('DELETE FROM comments WHERE id = ?').run(c.id);
  res.json({ ok: true });
});

router.get('/me/notify', async (req, res) => {
  res.json(await getPrefs(req.userId));
});

router.put('/me/notify', async (req, res) => {
  await getPrefs(req.userId);
  const fields = { partner_activity: 'bool', limits: 'bool', reminder: 'bool', savings: 'bool', tz_offset: 'int' };
  for (const [key, type] of Object.entries(fields)) {
    if (!(key in req.body)) continue;
    let value = type === 'bool' ? (req.body[key] ? 1 : 0) : Math.round(Number(req.body[key]));
    if (type === 'int' && !(Math.abs(value) <= 14 * 60)) continue;
    await db.prepare(`UPDATE notify_prefs SET ${key} = ? WHERE user_id = ?`).run(value, req.userId);
  }
  res.json(await getPrefs(req.userId));
});

// The budget the app opens with and the bot records quick adds into.
router.put('/me/active-budget', async (req, res) => {
  const member = await db.prepare('SELECT 1 FROM budget_members WHERE budget_id = ? AND user_id = ?').get(req.body.budget_id, req.userId);
  if (!member) return res.status(404).json({ error: 'Бюджет не найден' });
  await db.prepare('UPDATE users SET active_budget_id = ? WHERE id = ?').run(req.body.budget_id, req.userId);
  res.json({ ok: true });
});

router.put('/me/tutorial', async (req, res) => {
  await db.prepare('UPDATE users SET tutorial_done = ? WHERE id = ?').run(req.body.done ? 1 : 0, req.userId);
  res.json({ ok: true });
});

export default router;
