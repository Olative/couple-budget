import { Router } from 'express';
import db from '../db.js';
import { sendDocumentToUser, exportCaption } from '../bot.js';
import { tr, normLang } from '../i18n.js';

const router = Router();
const MAX_BYTES = 1.5 * 1024 * 1024;

async function expenseInMyBudget(expenseId, userId) {
  return db.prepare(`
    SELECT e.* FROM expenses e JOIN budget_members bm ON bm.budget_id = e.budget_id
    WHERE e.id = ? AND bm.user_id = ?
  `).get(expenseId, userId);
}

router.put('/expenses/:id/receipt', async (req, res) => {
  const expense = await expenseInMyBudget(req.params.id, req.userId);
  if (!expense) return res.status(404).json({ error: 'Трата не найдена' });
  const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(req.body.image || '');
  if (!match) return res.status(400).json({ error: 'Нужна картинка' });
  if (match[2].length * 0.75 > MAX_BYTES) return res.status(413).json({ error: 'Фото слишком большое' });

  await db.prepare(`
    INSERT INTO receipts (expense_id, user_id, mime, data) VALUES (?, ?, ?, ?)
    ON CONFLICT (expense_id) DO UPDATE SET user_id = excluded.user_id, mime = excluded.mime, data = excluded.data, created_at = datetime('now')
  `).run(expense.id, req.userId, match[1], match[2]);
  res.json({ ok: true });
});

router.get('/expenses/:id/receipt', async (req, res) => {
  if (!(await expenseInMyBudget(req.params.id, req.userId))) return res.status(404).end();
  const r = await db.prepare('SELECT mime, data FROM receipts WHERE expense_id = ?').get(req.params.id);
  if (!r) return res.status(404).end();
  res.set('Content-Type', r.mime).set('Cache-Control', 'private, max-age=86400').send(Buffer.from(r.data, 'base64'));
});

router.delete('/expenses/:id/receipt', async (req, res) => {
  if (!(await expenseInMyBudget(req.params.id, req.userId))) return res.status(404).json({ error: 'Трата не найдена' });
  await db.prepare('DELETE FROM receipts WHERE expense_id = ?').run(req.params.id);
  res.json({ ok: true });
});

const csvCell = (v) => {
  const s = v == null ? '' : String(v);
  return /[";,\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const SOURCE_NAMES = { salary: 'Зарплата', side: 'Подработка', gift: 'Подарок', refund: 'Возврат, кешбэк', other: 'Другое' };

export async function buildExport(budgetId, userId, lang = 'ru') {
  const budget = await db.prepare('SELECT * FROM budgets WHERE id = ?').get(budgetId);
  const expenses = await db.prepare(`
    SELECT e.date, c.name as category, e.description, u.first_name as who, e.amount, e.personal
    FROM expenses e JOIN categories c ON c.id = e.category_id JOIN users u ON u.id = e.user_id
    WHERE e.budget_id = ?
  `).all(budgetId);
  const incomes = await db.prepare(`
    SELECT i.date, i.source, i.description, u.first_name as who, i.amount
    FROM incomes i JOIN users u ON u.id = i.user_id WHERE i.budget_id = ?
  `).all(budgetId);

  const rows = [
    ...expenses.map(e => [e.date, tr(lang, e.personal ? 'Расход (личный)' : 'Расход'), e.category, e.description, e.who, -Number(e.amount)]),
    ...incomes.map(i => [i.date, tr(lang, 'Доход'), tr(lang, SOURCE_NAMES[i.source] || 'Другое'), i.description, i.who, Number(i.amount)]),
  ].sort((a, b) => b[0].localeCompare(a[0]));

  // Semicolons, comma decimals and a BOM make Excel with a Russian locale open it directly;
  // English Excel expects commas and dot decimals.
  const en = lang === 'en';
  const sep = en ? ',' : ';';
  const header = ['Дата', 'Тип', 'Категория', 'Описание', 'Кто'].map(h => tr(lang, h)).concat(tr(lang, 'Сумма, {currency}', { currency: budget.currency }));
  const lines = [header, ...rows]
    .map(r => r.map((v, i) => (i === 5 && typeof v === 'number' ? (en ? String(v) : String(v).replace('.', ',')) : csvCell(v))).join(sep));
  return { buffer: Buffer.from(`﻿${lines.join('\r\n')}`, 'utf8'), filename: `lolo-pepe-${new Date().toISOString().slice(0, 10)}.csv`, count: rows.length };
}

router.post('/budgets/:id/export', async (req, res) => {
  const member = await db.prepare('SELECT 1 FROM budget_members WHERE budget_id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!member) return res.status(403).json({ error: 'Нет доступа' });
  const lang = normLang(req.user.lang);
  const file = await buildExport(req.params.id, req.userId, lang);
  try {
    await sendDocumentToUser(req.user.telegram_id, file, exportCaption(file.count, lang));
  } catch (e) {
    console.error('Export send failed:', e.message);
    return res.status(502).json({ error: 'Не получилось отправить файл. Напишите боту /start и попробуйте ещё раз' });
  }
  res.json({ ok: true, count: file.count });
});

export default router;
