import { Router } from 'express';
import db from '../db.js';
import { notifyPartners } from '../notify.js';

const router = Router();

let resetUserCache = () => {};
export function setUserCacheReset(fn) { resetUserCache = fn; }

// Everything stored for one budget, removed when its last member deletes their account.
function budgetWipe(id) {
  const expenseIds = 'SELECT id FROM expenses WHERE budget_id = ?';
  const goalIds = 'SELECT id FROM savings_goals WHERE budget_id = ?';
  return [
    { sql: `DELETE FROM reactions WHERE expense_id IN (${expenseIds})`, args: [id] },
    { sql: `DELETE FROM comments WHERE expense_id IN (${expenseIds})`, args: [id] },
    { sql: `DELETE FROM receipts WHERE expense_id IN (${expenseIds})`, args: [id] },
    { sql: `DELETE FROM expense_edits WHERE kind = 'expense' AND expense_id IN (${expenseIds})`, args: [id] },
    { sql: "DELETE FROM expense_edits WHERE kind = 'personal' AND expense_id IN (SELECT id FROM personal_expenses WHERE budget_id = ?)", args: [id] },
    { sql: 'DELETE FROM expenses WHERE budget_id = ?', args: [id] },
    { sql: 'DELETE FROM incomes WHERE budget_id = ?', args: [id] },
    { sql: 'DELETE FROM personal_expenses WHERE budget_id = ?', args: [id] },
    { sql: `DELETE FROM savings_contributions WHERE goal_id IN (${goalIds})`, args: [id] },
    { sql: `DELETE FROM savings_alerts WHERE goal_id IN (${goalIds})`, args: [id] },
    { sql: 'DELETE FROM savings_goals WHERE budget_id = ?', args: [id] },
    { sql: 'DELETE FROM recurring WHERE budget_id = ?', args: [id] },
    { sql: 'DELETE FROM settlements WHERE budget_id = ?', args: [id] },
    { sql: 'DELETE FROM recap_sent WHERE budget_id = ?', args: [id] },
    { sql: 'DELETE FROM limit_alerts WHERE category_id IN (SELECT id FROM categories WHERE budget_id = ?)', args: [id] },
    { sql: 'DELETE FROM merchant_categories WHERE budget_id = ?', args: [id] },
    { sql: 'DELETE FROM imports WHERE budget_id = ?', args: [id] },
    { sql: 'DELETE FROM categories WHERE budget_id = ?', args: [id] },
    { sql: 'DELETE FROM budget_members WHERE budget_id = ?', args: [id] },
    { sql: 'DELETE FROM budgets WHERE id = ?', args: [id] },
  ];
}

// Deletes the account. Budgets nobody else uses are deleted whole. In a shared budget the other member keeps
// the shared history (shared expenses, savings), but everything personal of this user is removed and their
// name is replaced, so nothing points back to the person.
router.delete('/me', async (req, res) => {
  const uid = req.userId;
  const budgets = await db.prepare(`
    SELECT bm.budget_id as id, b.name, (SELECT COUNT(*) FROM budget_members x WHERE x.budget_id = bm.budget_id) as members
    FROM budget_members bm JOIN budgets b ON b.id = bm.budget_id WHERE bm.user_id = ?
  `).all(uid);

  for (const b of budgets.filter(b => b.members > 1)) {
    await notifyPartners(b.id, uid, `🐧 ${req.user.first_name} удаляет свой аккаунт и больше не участвует в бюджете «${b.name}». Общие траты и копилка остаются у вас.`);
  }

  const statements = budgets.filter(b => b.members <= 1).flatMap(b => budgetWipe(b.id));
  statements.push(
    { sql: "DELETE FROM expense_edits WHERE kind = 'personal' AND expense_id IN (SELECT id FROM personal_expenses WHERE user_id = ?)", args: [uid] },
    { sql: 'DELETE FROM personal_expenses WHERE user_id = ?', args: [uid] },
    { sql: 'DELETE FROM incomes WHERE user_id = ?', args: [uid] },
    { sql: 'DELETE FROM recurring WHERE user_id = ?', args: [uid] },
    { sql: 'DELETE FROM receipts WHERE user_id = ?', args: [uid] },
    { sql: 'DELETE FROM comments WHERE user_id = ?', args: [uid] },
    { sql: 'DELETE FROM reactions WHERE user_id = ?', args: [uid] },
    { sql: 'DELETE FROM imports WHERE user_id = ?', args: [uid] },
    { sql: 'DELETE FROM bank_events WHERE user_id = ?', args: [uid] },
    { sql: 'DELETE FROM notify_prefs WHERE user_id = ?', args: [uid] },
    { sql: 'DELETE FROM budget_members WHERE user_id = ?', args: [uid] },
    // The row stays only as an anonymous author of shared records; a negative id never matches a Telegram user.
    { sql: "UPDATE users SET telegram_id = -id, first_name = 'Удалённый аккаунт', last_name = NULL, username = NULL, hook_token = NULL, active_budget_id = NULL, tutorial_done = 0 WHERE id = ?", args: [uid] },
  );
  await db.batch(statements);
  resetUserCache(req.user.telegram_id);
  res.json({ ok: true });
});

export default router;
