import { Router } from 'express';
import crypto from 'crypto';
import db from '../db.js';
import { parseStatement } from '../bank.js';
import { prepareImport, commitImport, hookToken } from '../importer.js';

const router = Router();

// The address this server is reached at (Render passes the original https scheme in a header).
const publicUrl = (req) => `${req.get('x-forwarded-proto') || req.protocol}://${req.get('host')}`;

// Personal address for the iPhone "Shortcuts" automation that forwards bank SMS.
router.get('/me/hook', async (req, res) => {
  res.json({ url: `${publicUrl(req)}/hook/${await hookToken(req.userId)}` });
});

router.post('/me/hook/reset', async (req, res) => {
  const token = crypto.randomBytes(16).toString('hex');
  await db.prepare('UPDATE users SET hook_token = ? WHERE id = ?').run(token, req.userId);
  res.json({ url: `${publicUrl(req)}/hook/${token}` });
});

// Statement upload from the app: the file comes as base64, the summary goes back for confirmation.
router.post('/budgets/:id/import', async (req, res) => {
  const member = await db.prepare('SELECT 1 FROM budget_members WHERE budget_id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!member) return res.status(403).json({ error: 'Нет доступа' });
  const { filename, data } = req.body;
  if (!filename || !data) return res.status(400).json({ error: 'Нет файла' });
  try {
    const ops = await parseStatement(Buffer.from(data, 'base64'), filename);
    const budget = await db.prepare('SELECT * FROM budgets WHERE id = ?').get(req.params.id);
    res.json(await prepareImport(req.user, budget, ops));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.post('/imports/:id/commit', async (req, res) => {
  try {
    res.json(await commitImport(req.params.id, req.userId));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

export default router;
