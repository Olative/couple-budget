import { Router } from 'express';
import crypto from 'crypto';
import db from '../db.js';

const router = Router();

function verifyTelegramHash(initData, botToken) {
  try {
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    if (!hash) return false;

    params.delete('hash');
    const sorted = [...params.entries()].sort(([a], [b]) => a.localeCompare(b));
    const dataCheckString = sorted.map(([k, v]) => `${k}=${v}`).join('\n');

    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
    const computed = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
    return computed === hash;
  } catch {
    return false;
  }
}

router.post('/auth', async (req, res) => {
  const { initData } = req.body;
  if (!initData) return res.status(400).json({ error: 'initData is required' });

  const botToken = process.env.BOT_TOKEN;
  if (botToken) {
    const hashOk = verifyTelegramHash(initData, botToken);
    if (!hashOk) {
      console.log('Hash verification failed — check BOT_TOKEN matches the bot that opened the app');
    }
  }

  let userData;
  try {
    const params = new URLSearchParams(initData);
    const userStr = params.get('user');
    if (!userStr) return res.status(400).json({ error: 'No user in initData' });
    userData = JSON.parse(userStr);
    if (!userData?.id) return res.status(400).json({ error: 'No user id' });
  } catch {
    return res.status(400).json({ error: 'Invalid user data' });
  }

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
