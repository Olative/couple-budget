import db from './db.js';

export function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

export function shiftMonth(month, delta) {
  const [y, m] = month.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1 + delta, 1)).toISOString().slice(0, 7);
}

export function daysInMonth(month) {
  const [y, m] = month.split('-').map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

export async function monthTotal(budgetId, month) {
  const row = await db.prepare('SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE budget_id = ? AND date LIKE ?')
    .get(budgetId, `${month}%`);
  return Number(row.total);
}

// Average of the last (up to) 3 months before `month` that have any expenses.
export async function typicalMonth(budgetId, month) {
  const rows = await db.prepare(`
    SELECT substr(date, 1, 7) as m, category_id, SUM(amount) as s
    FROM expenses
    WHERE budget_id = ? AND date >= ? AND date < ?
    GROUP BY m, category_id
  `).all(budgetId, `${shiftMonth(month, -12)}-01`, `${month}-01`);

  const months = [...new Set(rows.map(r => r.m))].sort().slice(-3);
  const byCategory = {};
  let total = 0;
  for (const r of rows) {
    if (!months.includes(r.m)) continue;
    byCategory[r.category_id] = (byCategory[r.category_id] || 0) + Number(r.s) / months.length;
    total += Number(r.s) / months.length;
  }
  return { months: months.length, total, byCategory };
}

export async function goalEta(goalId, current, target) {
  const row = await db.prepare(
    "SELECT COALESCE(SUM(amount), 0) as s FROM savings_contributions WHERE goal_id = ? AND created_at >= datetime('now', '-90 days')"
  ).get(goalId);
  const monthlyRate = Number(row.s) / 3;
  const remaining = target - current;
  if (remaining <= 0) return { monthlyRate, etaMonth: currentMonth() };
  if (monthlyRate <= 0) return { monthlyRate, etaMonth: null };
  return { monthlyRate, etaMonth: shiftMonth(currentMonth(), Math.ceil(remaining / monthlyRate)) };
}

export async function buildForecast(budgetId, month) {
  const now = currentMonth();
  const dim = daysInMonth(month);
  const isCurrent = month === now;
  const day = isCurrent ? new Date().getUTCDate() : month < now ? dim : 0;

  const cats = await db.prepare(`
    SELECT c.id, c.planned_amount, COALESCE(SUM(e.amount), 0) as spent
    FROM categories c
    LEFT JOIN expenses e ON c.id = e.category_id AND e.date LIKE ?
    WHERE c.budget_id = ?
    GROUP BY c.id
  `).all(`${month}%`, budgetId);

  const spent = cats.reduce((s, c) => s + Number(c.spent), 0);
  const planned = cats.reduce((s, c) => s + Number(c.planned_amount || 0), 0);
  const projected = isCurrent && day > 0 ? (spent / day) * dim : spent;

  const categories = cats.map(c => {
    const catSpent = Number(c.spent);
    const catPlanned = Number(c.planned_amount || 0);
    let runsOutDay = null;
    const exhausted = catPlanned > 0 && catSpent >= catPlanned;
    if (isCurrent && catPlanned > 0 && !exhausted && day >= 3 && catSpent > 0) {
      const d = Math.ceil(catPlanned / (catSpent / day));
      if (d <= dim) runsOutDay = d;
    }
    return { id: c.id, spent: catSpent, planned: catPlanned, runsOutDay, exhausted };
  });

  const typical = await typicalMonth(budgetId, month);
  const prev = shiftMonth(now, -1);
  const recapMonth = (await monthTotal(budgetId, prev)) > 0 ? prev : null;

  return { month, isCurrent, day, daysInMonth: dim, spent, planned, projected, categories, typical, recapMonth };
}

export async function buildRecap(budgetId, month) {
  const prev = shiftMonth(month, -1);

  const cats = await db.prepare(`
    SELECT c.id, c.name, c.icon, c.planned_amount,
      COALESCE(SUM(CASE WHEN e.date LIKE ? THEN e.amount END), 0) as spent,
      COALESCE(SUM(CASE WHEN e.date LIKE ? THEN e.amount END), 0) as prev_spent
    FROM categories c
    LEFT JOIN expenses e ON c.id = e.category_id
    WHERE c.budget_id = ?
    GROUP BY c.id
  `).all(`${month}%`, `${prev}%`, budgetId);

  const totalSpent = cats.reduce((s, c) => s + Number(c.spent), 0);
  const totalPlanned = cats.reduce((s, c) => s + Number(c.planned_amount || 0), 0);
  if (totalSpent === 0) return { month, hasData: false };

  const top = [...cats].sort((a, b) => b.spent - a.spent)[0];
  let limitRunOutDay = null;
  if (top.planned_amount > 0 && top.spent > top.planned_amount) {
    const rows = await db.prepare('SELECT amount, date FROM expenses WHERE category_id = ? AND date LIKE ? ORDER BY date, created_at')
      .all(top.id, `${month}%`);
    let acc = 0;
    for (const r of rows) {
      acc += Number(r.amount);
      if (acc > top.planned_amount) { limitRunOutDay = Number(r.date.slice(8, 10)); break; }
    }
  }

  const byMember = await db.prepare(`
    SELECT u.id, u.first_name, COALESCE(SUM(e.amount), 0) as spent
    FROM users u
    JOIN budget_members bm ON u.id = bm.user_id
    LEFT JOIN expenses e ON u.id = e.user_id AND e.budget_id = ? AND e.date LIKE ?
    WHERE bm.budget_id = ?
    GROUP BY u.id
    ORDER BY bm.joined_at
  `).all(budgetId, `${month}%`, budgetId);

  // Skip recurring payments (same category and amount last month, e.g. rent) — they aren't news.
  const biggestSql = (skipRecurring) => `
    SELECT e.amount, e.description, e.date, c.name as category_name, c.icon as category_icon, u.first_name as user_name
    FROM expenses e
    JOIN categories c ON e.category_id = c.id
    JOIN users u ON e.user_id = u.id
    WHERE e.budget_id = ? AND e.date LIKE ?
    ${skipRecurring ? `AND NOT EXISTS (
      SELECT 1 FROM expenses p WHERE p.budget_id = e.budget_id AND p.category_id = e.category_id
        AND p.amount = e.amount AND p.date LIKE ?
    )` : ''}
    ORDER BY e.amount DESC LIMIT 1
  `;
  const biggest = await db.prepare(biggestSql(true)).get(budgetId, `${month}%`, `${prev}%`)
    || await db.prepare(biggestSql(false)).get(budgetId, `${month}%`);

  const saved = await db.prepare(`
    SELECT COALESCE(SUM(sc.amount), 0) as s FROM savings_contributions sc
    JOIN savings_goals g ON g.id = sc.goal_id
    WHERE g.budget_id = ? AND sc.created_at LIKE ?
  `).get(budgetId, `${month}%`);

  const goalRow = await db.prepare(`
    SELECT g.id, g.name, g.target_amount, COALESCE(SUM(sc.amount), 0) as current_amount
    FROM savings_goals g
    LEFT JOIN savings_contributions sc ON g.id = sc.goal_id
    WHERE g.budget_id = ?
    GROUP BY g.id
    ORDER BY g.created_at
    LIMIT 1
  `).get(budgetId);
  let goal = null;
  if (goalRow) {
    const current = Number(goalRow.current_amount);
    const target = Number(goalRow.target_amount);
    goal = { name: goalRow.name, current, target, ...(await goalEta(goalRow.id, current, target)) };
  }

  const typical = await typicalMonth(budgetId, shiftMonth(month, 1));
  const catById = Object.fromEntries(cats.map(c => [c.id, c]));
  const nextTop = Object.entries(typical.byCategory)
    .filter(([id]) => catById[id])
    .sort(([, a], [, b]) => b - a)
    .slice(0, 2)
    .map(([id, avg]) => ({ name: catById[id].name, avg }));
  const warnings = Object.entries(typical.byCategory)
    .filter(([id, avg]) => catById[id] && catById[id].planned_amount > 0 && avg > catById[id].planned_amount)
    .map(([id, avg]) => ({ name: catById[id].name, avg, planned: Number(catById[id].planned_amount) }))
    .slice(0, 2);

  return {
    month,
    hasData: true,
    totalSpent,
    totalPlanned,
    top: { name: top.name, icon: top.icon, spent: Number(top.spent), prevSpent: Number(top.prev_spent), planned: Number(top.planned_amount || 0), limitRunOutDay },
    byMember: byMember.map(m => ({ id: m.id, first_name: m.first_name, spent: Number(m.spent) })),
    biggest: biggest ? { ...biggest, amount: Number(biggest.amount) } : null,
    saved: Number(saved.s),
    goal,
    next: { months: typical.months, total: typical.total, top: nextTop, warnings },
  };
}
