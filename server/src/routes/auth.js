import { Router } from 'express';
import crypto from 'crypto';
import db from '../db.js';

const router = Router();

function validateTelegramData(initData, botToken) {
  if (!botToken) return true; // skip validation in dev mode
  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  params.delete('hash');
  const sorted = [...params.entries()].sort(([a], [b]) => a.localeCompare(b));
  const dataCheckString = sorted.map(([k, v]) => `${k}=${v}`).join('\n');
  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
  const hmac = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
  return hmac === hash;
}

router.post('/auth', (req, res) => {
  const { initData } = req.body;

  if (!initData) {
    return res.status(400).json({ error: 'initData is required' });
  }

  const botToken = process.env.BOT_TOKEN;
  if (!validateTelegramData(initData, botToken)) {
    return res.status(401).json({ error: 'Invalid Telegram data' });
  }

  let userData;
  try {
    const params = new URLSearchParams(initData);
    userData = JSON.parse(params.get('user'));
  } catch {
    return res.status(400).json({ error: 'Invalid user data' });
  }

  const upsert = db.prepare(`
    INSERT INTO users (telegram_id, first_name, last_name, username)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(telegram_id) DO UPDATE SET
      first_name = excluded.first_name,
      last_name = excluded.last_name,
      username = excluded.username
    RETURNING *
  `);

  const user = upsert.get(
    userData.id,
    userData.first_name,
    userData.last_name || null,
    userData.username || null
  );

  const budgets = db.prepare(`
    SELECT b.* FROM budgets b
    JOIN budget_members bm ON b.id = bm.budget_id
    WHERE bm.user_id = ?
  `).all(user.id);

  res.json({ user, budgets });
});

export default router;
