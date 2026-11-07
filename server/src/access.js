import db from './db.js';

// One place that checks the caller may touch what a URL points at: the budget itself, or the budget
// that owns an expense, category, goal, etc. Routes still check authorship where only the author may act.
const OWNER = [
  [/^\/budgets\/([^/]+)/, null],
  [/^\/expenses\/(\d+)/, 'SELECT budget_id FROM expenses WHERE id = ?'],
  [/^\/categories\/(\d+)/, 'SELECT budget_id FROM categories WHERE id = ?'],
  [/^\/savings\/(\d+)/, 'SELECT budget_id FROM savings_goals WHERE id = ?'],
  [/^\/recurring\/(\d+)/, 'SELECT budget_id FROM recurring WHERE id = ?'],
  [/^\/incomes\/(\d+)/, 'SELECT budget_id FROM incomes WHERE id = ?'],
  [/^\/personal\/(\d+)/, 'SELECT budget_id FROM personal_expenses WHERE id = ?'],
  [/^\/comments\/(\d+)/, 'SELECT e.budget_id FROM comments c JOIN expenses e ON e.id = c.expense_id WHERE c.id = ?'],
];

export async function isMember(budgetId, userId) {
  return !!(await db.prepare('SELECT 1 FROM budget_members WHERE budget_id = ? AND user_id = ?').get(budgetId, userId));
}

export async function accessGuard(req, res, next) {
  try {
    for (const [re, sql] of OWNER) {
      const m = req.path.match(re);
      if (!m) continue;
      if (!sql && m[1] === 'join') return next();
      const budgetId = sql ? (await db.prepare(sql).get(m[1]))?.budget_id : m[1];
      if (!budgetId) return res.status(404).json({ error: 'Не найдено' });
      if (!(await isMember(budgetId, req.userId))) return res.status(403).json({ error: 'Нет доступа' });
      return next();
    }
    next();
  } catch (e) {
    next(e);
  }
}
