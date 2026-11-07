import db from './db.js';
import { sendToUser } from './bot.js';
import { currentMonth } from './insights.js';
import { tr, langOfTelegram } from './i18n.js';

const fmt = (n, cur) => `${new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(Math.round(n))} ${cur}`;

// Notices that some routes still build as ready Russian text, recognised and retold in English.
const EDIT_FIELDS = { 'категория': 'category', 'сумма': 'amount', 'описание': 'description', 'дата': 'date', 'личная': 'personal' };
const NOTICE_PATTERNS = [
  [/^🐧 (.+?) удаляет свой аккаунт и больше не участвует в бюджете «(.*)»\. Общие траты и копилка остаются у вас\.$/s,
    (m) => `🐧 ${m[1]} is deleting their account and is no longer a member of the budget «${m[2]}». Shared expenses and savings stay with you.`],
  [/^🐧 (.+?): бюджет «(.*)» очищен и начат заново\. Вы больше не участник этого бюджета\.$/s,
    (m) => `🐧 ${m[1]}: the budget «${m[2]}» was cleared and started over. You are no longer a member of this budget.`],
  [/^🐧 (.+?): бюджет «(.*)» очищен — траты, доходы и копилка начинаются с нуля\.$/s,
    (m) => `🐧 ${m[1]}: the budget «${m[2]}» was cleared — expenses, income and savings start from zero.`],
  [/^🤝 (.+?): долг (.+) → (.+) (\S+ \S+) отмечен как возвращённый\. Вы в расчёте\.$/s,
    (m) => `🤝 ${m[1]}: the debt ${m[2]} → ${m[3]} ${m[4]} is marked as paid back. You're all square.`],
  [/^✏️ (.+?): правка в вашей трате «(.*?)» — (.*)$/s, (m) => {
    const what = m[3]
      .replace(/(^|, )(категория|сумма|описание|дата|личная) /g, (x, sep, f) => `${sep}${EDIT_FIELDS[f]} `)
      .replace(/(^|, )personal (да|нет) → (да|нет)/g, (x, sep, a, b) => `${sep}personal ${a === 'да' ? 'yes' : 'no'} → ${b === 'да' ? 'yes' : 'no'}`);
    return `✏️ ${m[1]}: an edit to your expense «${m[2]}» — ${what}`;
  }],
];

// A notification is either a function of the language or a ready Russian text.
function localize(text, lang) {
  if (typeof text === 'function') return text(lang);
  if (lang !== 'en') return text;
  for (const [re, en] of NOTICE_PATTERNS) {
    const m = re.exec(text);
    if (m) return en(m);
  }
  return tr(lang, text);
}

export async function getPrefs(userId) {
  await db.prepare('INSERT OR IGNORE INTO notify_prefs (user_id) VALUES (?)').run(userId);
  return db.prepare('SELECT * FROM notify_prefs WHERE user_id = ?').get(userId);
}

async function members(budgetId) {
  return db.prepare(`
    SELECT u.id, u.telegram_id, u.first_name, COALESCE(p.partner_activity, 1) as partner_activity, COALESCE(p.limits, 1) as limits
    FROM users u JOIN budget_members bm ON bm.user_id = u.id
    LEFT JOIN notify_prefs p ON p.user_id = u.id
    WHERE bm.budget_id = ?
  `).all(budgetId);
}

// Fire-and-forget: a failed Telegram message must never break the request that triggered it.
function deliver(telegramId, text) {
  (async () => {
    const lang = await langOfTelegram(telegramId);
    await sendToUser(telegramId, localize(text, lang), lang);
  })().catch(e => console.error('Notify failed:', e.message));
}

export async function notifyPartners(budgetId, actorId, text) {
  for (const m of await members(budgetId)) {
    if (m.id !== actorId && m.partner_activity) deliver(m.telegram_id, text);
  }
}

export async function notifyUser(userId, text) {
  const u = await db.prepare(`
    SELECT u.telegram_id, COALESCE(p.partner_activity, 1) as partner_activity
    FROM users u LEFT JOIN notify_prefs p ON p.user_id = u.id WHERE u.id = ?
  `).get(userId);
  if (u?.partner_activity) deliver(u.telegram_id, text);
}

export async function expenseLabel(expenseId) {
  const e = await db.prepare(`
    SELECT e.*, c.name as category_name, b.currency, b.id as budget_id
    FROM expenses e JOIN categories c ON c.id = e.category_id JOIN budgets b ON b.id = e.budget_id
    WHERE e.id = ?
  `).get(expenseId);
  return e ? { e, label: `«${e.description || e.category_name}, ${fmt(e.amount, e.currency)}»` } : null;
}

export async function onExpenseAdded(expense, actor) {
  const info = await expenseLabel(expense.id);
  if (!info) return;
  await notifyPartners(info.e.budget_id, actor.id, (lang) => tr(lang, '🐧 {name}: новая трата {label}', { name: actor.first_name, label: info.label }));
  await checkLimit(info.e.budget_id, info.e.category_id, info.e.currency);
}

// Each category alerts once per month at 80% and once at 100% of its limit.
export async function checkLimit(budgetId, categoryId, currency) {
  const month = currentMonth();
  const cat = await db.prepare(`
    SELECT c.name, c.planned_amount, COALESCE(SUM(e.amount), 0) as spent
    FROM categories c LEFT JOIN spending e ON e.category_id = c.id AND e.date LIKE ?
    WHERE c.id = ? GROUP BY c.id
  `).get(`${month}%`, categoryId);
  const planned = Number(cat?.planned_amount || 0);
  if (!planned) return;
  const spent = Number(cat.spent);
  const level = spent >= planned ? 100 : spent >= planned * 0.8 ? 80 : 0;
  if (!level) return;
  const res = await db.prepare('INSERT OR IGNORE INTO limit_alerts (category_id, month, level) VALUES (?, ?, ?)').run(categoryId, month, level);
  if (!res.rowsAffected) return;
  if (level === 100) await db.prepare('INSERT OR IGNORE INTO limit_alerts (category_id, month, level) VALUES (?, ?, 80)').run(categoryId, month);

  const vars = { name: cat.name, spent: fmt(spent, currency), planned: fmt(planned, currency), pct: Math.round((spent / planned) * 100) };
  const text = (lang) => (level === 100
    ? tr(lang, '🔴 «{name}»: лимит на месяц исчерпан — {spent} из {planned}', vars)
    : tr(lang, '⚠️ «{name}»: потрачено {pct}% лимита — {spent} из {planned}', vars));
  for (const m of await members(budgetId)) if (m.limits) deliver(m.telegram_id, text);
}

// Runs periodically: at 20:00 local time remind users with nothing recorded today.
export async function sendEveningReminders() {
  const users = await db.prepare(`
    SELECT u.id, u.telegram_id, p.tz_offset, p.last_reminder FROM notify_prefs p JOIN users u ON u.id = p.user_id
    WHERE p.reminder = 1
  `).all();
  for (const u of users) {
    const local = new Date(Date.now() + Number(u.tz_offset) * 60000);
    const localDate = local.toISOString().slice(0, 10);
    if (local.getUTCHours() !== 20 || u.last_reminder === localDate) continue;
    await db.prepare('UPDATE notify_prefs SET last_reminder = ? WHERE user_id = ?').run(localDate, u.id);
    const row = await db.prepare(`
      SELECT COUNT(*) as n FROM spending e JOIN budget_members bm ON bm.budget_id = e.budget_id
      WHERE bm.user_id = ? AND e.date = ?
    `).get(u.id, localDate);
    if (Number(row.n) === 0) {
      deliver(u.telegram_id, (lang) => tr(lang, '🐧 Сегодня ни одной траты? Если что-то покупали — запишите, пока помните.'));
    }
  }
}

// From the 20th, nudge once a month about goals whose monthly plan isn't met yet.
export async function sendSavingsReminders() {
  const now = new Date();
  if (now.getUTCDate() < 20 || now.getUTCHours() < 9) return;
  const month = currentMonth();
  const goals = await db.prepare(`
    SELECT sg.id, sg.budget_id, sg.name, sg.monthly_plan, b.currency,
           COALESCE(SUM(CASE WHEN sc.created_at LIKE ? THEN sc.amount END), 0) as month_saved,
           COALESCE(SUM(sc.amount), 0) as total_saved, sg.target_amount
    FROM savings_goals sg JOIN budgets b ON b.id = sg.budget_id
    LEFT JOIN savings_contributions sc ON sc.goal_id = sg.id
    WHERE sg.monthly_plan > 0
    GROUP BY sg.id
  `).all(`${month}%`);
  for (const g of goals) {
    const saved = Number(g.month_saved);
    if (saved >= Number(g.monthly_plan) || Number(g.total_saved) >= Number(g.target_amount)) continue;
    const res = await db.prepare('INSERT OR IGNORE INTO savings_alerts (goal_id, month) VALUES (?, ?)').run(g.id, month);
    if (!res.rowsAffected) continue;
    const vars = { name: g.name, saved: fmt(saved, g.currency), plan: fmt(g.monthly_plan, g.currency), left: fmt(g.monthly_plan - saved, g.currency) };
    const text = (lang) => (saved > 0
      ? tr(lang, '🐧 Копилка «{name}»: в этом месяце отложено {saved} из {plan}. Осталось {left}', vars)
      : tr(lang, '🐧 Копилка «{name}»: в этом месяце ещё ничего не отложено, а план — {plan}', vars));
    const people = await db.prepare(`
      SELECT u.telegram_id FROM users u JOIN budget_members bm ON bm.user_id = u.id
      LEFT JOIN notify_prefs p ON p.user_id = u.id
      WHERE bm.budget_id = ? AND COALESCE(p.savings, 1) = 1
    `).all(g.budget_id);
    for (const p of people) deliver(p.telegram_id, text);
  }
}
