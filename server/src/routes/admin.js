import { Router } from 'express';
import express from 'express';
import crypto from 'crypto';
import db from '../db.js';
import { telegramUserFromInitData, devMode } from '../telegramAuth.js';
import { adminTelegramId, deliverPost, sendSupportReply } from '../bot.js';
import { sanitizeTgHtml, tgTextLength } from '../tgHtml.js';

// The admin panel (CRM): users, dialogs, broadcasts, growth. Only the bot's admin gets in: inside Telegram
// by the signed launch data, in a browser by a one-time link the bot sends to the admin's chat.
// Budgets' money (amounts, expenses) is never shown here — only counts and dates.
const router = Router();
router.use(express.json({ limit: '30mb' }));

const isAdminId = (id) => adminTelegramId() && String(id) === String(adminTelegramId());

router.post('/login', async (req, res) => {
  let ok = false;
  if (req.body.initData) {
    const tgUser = devMode()
      ? JSON.parse(new URLSearchParams(req.body.initData).get('user') || 'null')
      : telegramUserFromInitData(req.body.initData, process.env.BOT_TOKEN);
    ok = !!tgUser && isAdminId(tgUser.id);
  } else if (req.body.token) {
    const used = await db.prepare(
      "DELETE FROM admin_tokens WHERE token = ? AND kind = 'login' AND expires_at > datetime('now') RETURNING token"
    ).get(String(req.body.token));
    ok = !!used;
  }
  if (!ok) return res.status(401).json({ error: 'Ссылка устарела или вход не из аккаунта администратора. Отправьте боту /admin ещё раз' });
  const session = crypto.randomBytes(32).toString('hex');
  await db.prepare("INSERT INTO admin_tokens (token, kind, expires_at) VALUES (?, 'session', datetime('now', '+30 days'))").run(session);
  await db.prepare("DELETE FROM admin_tokens WHERE expires_at < datetime('now')").run();
  res.json({ session });
});

router.use(async (req, res, next) => {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  const row = token && await db.prepare("SELECT 1 FROM admin_tokens WHERE token = ? AND kind = 'session' AND expires_at > datetime('now')").get(token);
  if (!row) return res.status(401).json({ error: 'Нужно войти заново' });
  req.adminSession = token;
  next();
});

router.post('/logout', async (req, res) => {
  await db.prepare('DELETE FROM admin_tokens WHERE token = ?').run(req.adminSession);
  res.json({ ok: true });
});

const ACTIVITY = `SELECT user_id, created_at FROM expenses UNION ALL SELECT user_id, created_at FROM incomes
  UNION ALL SELECT user_id, created_at FROM personal_expenses`;
const n = async (sql, ...args) => Number((await db.prepare(sql).get(...args))?.n || 0);

router.get('/stats', async (req, res) => {
  const [users, new7, new30, active7, active30, budgets, pairs, auto, records, newDaily, activeDaily, unread] = await Promise.all([
    n('SELECT COUNT(*) n FROM users WHERE telegram_id > 0'),
    n("SELECT COUNT(*) n FROM users WHERE telegram_id > 0 AND created_at >= datetime('now', '-7 days')"),
    n("SELECT COUNT(*) n FROM users WHERE telegram_id > 0 AND created_at >= datetime('now', '-30 days')"),
    n(`SELECT COUNT(DISTINCT user_id) n FROM (${ACTIVITY}) WHERE created_at >= datetime('now', '-7 days')`),
    n(`SELECT COUNT(DISTINCT user_id) n FROM (${ACTIVITY}) WHERE created_at >= datetime('now', '-30 days')`),
    n('SELECT COUNT(*) n FROM budgets'),
    n('SELECT COUNT(*) n FROM (SELECT budget_id FROM budget_members GROUP BY budget_id HAVING COUNT(*) > 1)'),
    n('SELECT COUNT(DISTINCT user_id) n FROM bank_events'),
    n(`SELECT COUNT(*) n FROM (${ACTIVITY})`),
    db.prepare("SELECT date(created_at) d, COUNT(*) n FROM users WHERE telegram_id > 0 AND created_at >= date('now', '-29 days') GROUP BY d").all(),
    db.prepare(`SELECT date(created_at) d, COUNT(DISTINCT user_id) n FROM (${ACTIVITY}) WHERE created_at >= date('now', '-29 days') GROUP BY d`).all(),
    n("SELECT COUNT(*) n FROM messages WHERE direction = 'in' AND read = 0"),
  ]);
  const days = Array.from({ length: 30 }, (_, i) => new Date(Date.now() - (29 - i) * 864e5).toISOString().slice(0, 10));
  const pick = (rows) => Object.fromEntries(rows.map(r => [r.d, Number(r.n)]));
  const nd = pick(newDaily), ad = pick(activeDaily);
  res.json({
    users, new7, new30, active7, active30, budgets, pairs, auto, records, unread,
    daily: days.map(d => ({ d, new: nd[d] || 0, active: ad[d] || 0 })),
  });
});

router.get('/users', async (req, res) => {
  const rows = await db.prepare(`
    SELECT u.id, u.first_name, u.last_name, u.username, u.created_at,
      (SELECT COUNT(*) FROM budget_members bm WHERE bm.user_id = u.id) AS budgets,
      EXISTS (SELECT 1 FROM budget_members a JOIN budget_members b ON b.budget_id = a.budget_id AND b.user_id != a.user_id WHERE a.user_id = u.id) AS paired,
      (SELECT MAX(created_at) FROM (${ACTIVITY}) act WHERE act.user_id = u.id) AS last_active,
      (SELECT COUNT(*) FROM (${ACTIVITY}) act WHERE act.user_id = u.id) AS records,
      EXISTS (SELECT 1 FROM bank_events be WHERE be.user_id = u.id) AS auto,
      (SELECT COUNT(*) FROM messages m WHERE m.user_id = u.id AND m.direction = 'in' AND m.read = 0) AS unread
    FROM users u WHERE u.telegram_id > 0 ORDER BY u.created_at DESC LIMIT 1000
  `).all();
  res.json(rows);
});

router.get('/users/:id', async (req, res) => {
  const user = await db.prepare(`
    SELECT id, first_name, last_name, username, created_at, tutorial_done, (hook_token IS NOT NULL) AS has_link
    FROM users WHERE id = ? AND telegram_id > 0
  `).get(req.params.id);
  if (!user) return res.status(404).json({ error: 'Пользователь не найден' });
  const [budgets, messages] = await Promise.all([
    db.prepare(`
      SELECT b.id, b.name, b.currency, bm.joined_at,
        (SELECT GROUP_CONCAT(u2.first_name, ', ') FROM budget_members m2 JOIN users u2 ON u2.id = m2.user_id WHERE m2.budget_id = b.id) AS people,
        (SELECT COUNT(*) FROM expenses e WHERE e.budget_id = b.id) AS expenses
      FROM budget_members bm JOIN budgets b ON b.id = bm.budget_id WHERE bm.user_id = ?
    `).all(user.id),
    db.prepare('SELECT id, direction, text, created_at FROM messages WHERE user_id = ? ORDER BY id').all(user.id),
  ]);
  res.json({ user, budgets, messages });
});

router.get('/dialogs', async (req, res) => {
  res.json(await db.prepare(`
    SELECT u.id, u.first_name, u.username, m.text AS last_text, m.direction AS last_direction, m.created_at AS last_at,
      (SELECT COUNT(*) FROM messages x WHERE x.user_id = u.id AND x.direction = 'in' AND x.read = 0) AS unread
    FROM users u JOIN messages m ON m.id = (SELECT MAX(id) FROM messages WHERE user_id = u.id)
    WHERE u.telegram_id > 0 ORDER BY m.id DESC
  `).all());
});

router.post('/users/:id/read', async (req, res) => {
  await db.prepare("UPDATE messages SET read = 1 WHERE user_id = ? AND direction = 'in'").run(req.params.id);
  res.json({ ok: true });
});

router.post('/users/:id/messages', async (req, res) => {
  const text = String(req.body.text || '').trim().slice(0, 4000);
  if (!text) return res.status(400).json({ error: 'Напишите сообщение' });
  const user = await db.prepare('SELECT * FROM users WHERE id = ? AND telegram_id > 0').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'Пользователь не найден' });
  try {
    const msg = await sendSupportReply(user, text);
    await db.prepare("UPDATE messages SET read = 1 WHERE user_id = ? AND direction = 'in'").run(user.id);
    res.json(msg);
  } catch (e) {
    res.status(502).json({ error: e.response?.statusCode === 403 ? 'Пользователь остановил бота — сообщение не доставить' : `Не отправилось: ${e.message}` });
  }
});

// ---------- broadcasts ----------

const AUDIENCES = {
  all: 'SELECT telegram_id FROM users WHERE telegram_id > 0',
  active30: `SELECT u.telegram_id FROM users u WHERE u.telegram_id > 0 AND u.id IN (SELECT user_id FROM (${ACTIVITY}) WHERE created_at >= datetime('now', '-30 days'))`,
  inactive30: `SELECT u.telegram_id FROM users u WHERE u.telegram_id > 0 AND u.id NOT IN (SELECT user_id FROM (${ACTIVITY}) WHERE created_at >= datetime('now', '-30 days'))`,
  nopair: `SELECT u.telegram_id FROM users u WHERE u.telegram_id > 0 AND NOT EXISTS
    (SELECT 1 FROM budget_members a JOIN budget_members b ON b.budget_id = a.budget_id AND b.user_id != a.user_id WHERE a.user_id = u.id)`,
  new7: "SELECT telegram_id FROM users WHERE telegram_id > 0 AND created_at >= datetime('now', '-7 days')",
};

function readPost(body) {
  // The editor sends Telegram-style HTML (bold, italic, links, spoilers…).
  const text = sanitizeTgHtml(String(body.text || ''));
  const len = tgTextLength(text);
  if (!len) throw new Error('Напишите текст поста');
  const media = body.media || null;
  if (media && len > 1024) throw new Error('С фото или видео текст должен быть не длиннее 1024 символов');
  if (len > 4096) throw new Error('Текст длиннее 4096 символов');
  const post = { text, html: true, buttons: body.buttons || {}, media: null };
  if (media?.type === 'guide') post.media = { type: 'guide' };
  else if (media?.file_id && ['photo', 'video'].includes(media.type)) post.media = { type: media.type, file_id: String(media.file_id) };
  else if (media?.data && ['photo', 'video'].includes(media.type)) {
    post.media = { type: media.type, buffer: Buffer.from(media.data, 'base64'), filename: media.filename, mime: media.mime };
  }
  return post;
}

router.get('/audience', async (req, res) => {
  const sql = AUDIENCES[req.query.segment] || AUDIENCES.all;
  res.json({ count: (await db.prepare(sql).all()).length });
});

// Sends the post to the admin only, so it can be checked in Telegram. Returns the uploaded media's id for the real send.
router.post('/broadcasts/test', async (req, res) => {
  try {
    const post = readPost(req.body);
    const fileId = await deliverPost(adminTelegramId(), post);
    res.json({ ok: true, media: post.media && post.media.type !== 'guide' ? { type: post.media.type, file_id: fileId } : post.media });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.post('/broadcasts', async (req, res) => {
  let post;
  try {
    post = readPost(req.body);
    if (post.media?.buffer) throw new Error('Сначала отправьте пост себе на проверку');
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
  const segment = AUDIENCES[req.body.segment] ? req.body.segment : 'all';
  const recipients = await db.prepare(AUDIENCES[segment]).all();
  const row = await db.prepare(`
    INSERT INTO broadcasts (text, media_type, media_file, buttons, audience, total) VALUES (?, ?, ?, ?, ?, ?) RETURNING *
  `).get(post.text, post.media?.type || null, post.media?.file_id || null, JSON.stringify(post.buttons), segment, recipients.length);
  res.json(row);

  // Sent in the background at ~15 messages a second, under Telegram's limit; progress is saved as it goes.
  (async () => {
    let sent = 0, failed = 0;
    for (const [i, r] of recipients.entries()) {
      try {
        const id = await deliverPost(r.telegram_id, post);
        if (id && post.media && post.media.type !== 'guide' && !post.media.file_id) post.media.file_id = id;
        sent++;
      } catch {
        failed++;
      }
      if (i % 20 === 19) await db.prepare('UPDATE broadcasts SET sent = ?, failed = ? WHERE id = ?').run(sent, failed, row.id);
      await new Promise(r2 => setTimeout(r2, 70));
    }
    await db.prepare("UPDATE broadcasts SET sent = ?, failed = ?, status = 'done' WHERE id = ?").run(sent, failed, row.id);
  })().catch(e => console.error('Broadcast failed:', e.message));
});

router.get('/broadcasts', async (req, res) => {
  res.json(await db.prepare('SELECT * FROM broadcasts ORDER BY id DESC LIMIT 100').all());
});

export default router;
