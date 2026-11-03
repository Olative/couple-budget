// Recording operations that came from a bank: single notifications and whole statements.
import crypto from 'crypto';
import db from './db.js';
import { categorize, merchantKey, incomeSource } from './bank.js';

export async function learnedCategories(budgetId) {
  const rows = await db.prepare('SELECT merchant, category_id FROM merchant_categories WHERE budget_id = ?').all(budgetId);
  return Object.fromEntries(rows.map(r => [r.merchant, r.category_id]));
}

// Remember "this shop goes to this category" for the next time it shows up.
export async function learnMerchant(budgetId, description, categoryId) {
  const key = merchantKey(description);
  if (!key) return;
  await db.prepare(`INSERT INTO merchant_categories (budget_id, merchant, category_id) VALUES (?, ?, ?)
    ON CONFLICT(budget_id, merchant) DO UPDATE SET category_id = excluded.category_id`).run(budgetId, key, categoryId);
}

const prettyMerchant = (m) => (m && /^[A-Z0-9 .&'-]+$/.test(m) ? m.toLowerCase().replace(/(^|\s)\S/g, c => c.toUpperCase()) : m);

// One notification: returns { kind, rec, category } or { duplicate: true }.
export async function recordNotice(user, budget, parsed, rawText) {
  const hash = crypto.createHash('sha1').update(rawText.trim()).digest('hex');
  const fresh = await db.prepare('INSERT OR IGNORE INTO bank_events (user_id, hash) VALUES (?, ?)').run(user.id, hash);
  if (!fresh.rowsAffected) return { duplicate: true };
  const description = prettyMerchant(parsed.merchant);
  if (parsed.kind === 'income') {
    const rec = await db.prepare('INSERT INTO incomes (budget_id, user_id, amount, source, description, date) VALUES (?, ?, ?, ?, ?, ?) RETURNING *')
      .get(budget.id, user.id, parsed.amount, incomeSource(rawText), description, parsed.date);
    return { kind: 'income', rec };
  }
  const categories = await db.prepare('SELECT * FROM categories WHERE budget_id = ? ORDER BY sort_order').all(budget.id);
  const category = categorize(parsed.merchant || rawText, categories, await learnedCategories(budget.id));
  const rec = await db.prepare('INSERT INTO expenses (budget_id, category_id, user_id, amount, description, date) VALUES (?, ?, ?, ?, ?, ?) RETURNING *')
    .get(budget.id, category.id, user.id, parsed.amount, description, parsed.date);
  return { kind: 'expense', rec, category };
}

// A statement is stored first and summarised, and only written after the user confirms.
export async function prepareImport(user, budget, ops) {
  const id = crypto.randomBytes(8).toString('hex');
  await db.prepare('INSERT INTO imports (id, user_id, budget_id, payload) VALUES (?, ?, ?, ?)').run(id, user.id, budget.id, JSON.stringify(ops));
  const spent = ops.filter(o => o.kind === 'expense').reduce((s, o) => s + o.amount, 0);
  const earned = ops.filter(o => o.kind === 'income').reduce((s, o) => s + o.amount, 0);
  const dates = ops.map(o => o.date).sort();
  return { id, count: ops.length, expenses: ops.filter(o => o.kind === 'expense').length, incomes: ops.filter(o => o.kind === 'income').length,
    spent, earned, from: dates[0], to: dates[dates.length - 1], currency: budget.currency, budgetName: budget.name };
}

export async function commitImport(importId, userId) {
  const imp = await db.prepare('SELECT * FROM imports WHERE id = ? AND user_id = ?').get(importId, userId);
  if (!imp) throw new Error('Загрузка не найдена, отправьте выписку ещё раз');
  const claimed = await db.prepare('UPDATE imports SET done = 1 WHERE id = ? AND done = 0').run(importId);
  if (!claimed.rowsAffected) return { added: 0, skipped: 0, already: true };
  const ops = JSON.parse(imp.payload);
  const categories = await db.prepare('SELECT * FROM categories WHERE budget_id = ? ORDER BY sort_order').all(imp.budget_id);
  const learned = await learnedCategories(imp.budget_id);
  let added = 0, skipped = 0;
  const statements = [];
  // Skip what is already in the budget: same day, same amount (typed by hand or imported before).
  const dates = ops.map(o => o.date).sort();
  // Counted, so two identical coffees on one day both come in, but a re-imported statement doesn't.
  const existing = new Map();
  for (const table of ['expenses', 'incomes']) {
    const rows = await db.prepare(`SELECT date, amount FROM ${table} WHERE budget_id = ? AND date BETWEEN ? AND ?`).all(imp.budget_id, dates[0], dates[dates.length - 1]);
    rows.forEach(r => { const k = `${table}|${r.date}|${Number(r.amount)}`; existing.set(k, (existing.get(k) || 0) + 1); });
  }
  for (const o of ops) {
    const table = o.kind === 'income' ? 'incomes' : 'expenses';
    const key = `${table}|${o.date}|${o.amount}`;
    if (existing.get(key) > 0) { existing.set(key, existing.get(key) - 1); skipped++; continue; }
    const description = prettyMerchant(o.description);
    if (o.kind === 'income') {
      statements.push({ sql: 'INSERT INTO incomes (budget_id, user_id, amount, source, description, date) VALUES (?, ?, ?, ?, ?, ?)',
        args: [imp.budget_id, userId, o.amount, incomeSource(`${o.description || ''} ${o.bankCategory || ''}`), description, o.date] });
    } else {
      const cat = categorize(`${o.description || ''} ${o.bankCategory || ''}`, categories, learned);
      statements.push({ sql: 'INSERT INTO expenses (budget_id, category_id, user_id, amount, description, date) VALUES (?, ?, ?, ?, ?, ?)',
        args: [imp.budget_id, cat.id, userId, o.amount, description, o.date] });
    }
    added++;
  }
  for (let i = 0; i < statements.length; i += 100) await db.batch(statements.slice(i, i + 100));
  return { added, skipped };
}

export async function hookToken(userId) {
  const u = await db.prepare('SELECT hook_token FROM users WHERE id = ?').get(userId);
  if (u?.hook_token) return u.hook_token;
  const token = crypto.randomBytes(16).toString('hex');
  await db.prepare('UPDATE users SET hook_token = ? WHERE id = ?').run(token, userId);
  return token;
}
