import { Router } from 'express';
import { telegramUserFromInitData, devMode } from '../telegramAuth.js';
import db from '../db.js';

const router = Router();

router.post('/auth', async (req, res) => {
  const { initData } = req.body;
  if (!initData) return res.status(400).json({ error: 'initData is required' });

  let userData;
  if (devMode()) {
    try {
      userData = JSON.parse(new URLSearchParams(initData).get('user') || 'null');
    } catch { /* handled below */ }
  } else {
    userData = telegramUserFromInitData(initData, process.env.BOT_TOKEN);
    if (!userData) console.log('Telegram signature check failed: BOT_TOKEN must belong to the bot that opens the app');
  }
  if (!userData?.id) return res.status(401).json({ error: 'Откройте приложение из Telegram' });

  const user = await db.prepare(`
    INSERT INTO users (telegram_id, first_name, last_name, username) VALUES (?, ?, ?, ?)
    ON CONFLICT(telegram_id) DO UPDATE SET first_name = excluded.first_name, last_name = excluded.last_name, username = excluded.username
    RETURNING *
  `).get(userData.id, userData.first_name, userData.last_name || null, userData.username || null);

  // The budget picked last comes first, then the newest ones.
  const budgets = await db.prepare(`
    SELECT b.* FROM budgets b JOIN budget_members bm ON b.id = bm.budget_id WHERE bm.user_id = ?
    ORDER BY b.id = ? DESC, bm.joined_at DESC
  `).all(user.id, user.active_budget_id || '');

  res.json({ user, budgets });
});

export default router;
