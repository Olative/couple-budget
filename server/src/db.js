import { createClient } from '@libsql/client';

// Render's disk is wiped on every deploy, so a local file there silently loses all data.
if (process.env.RENDER && !process.env.TURSO_DATABASE_URL) {
  throw new Error('TURSO_DATABASE_URL is not set on Render — refusing to start with a throwaway local database');
}

for (const key of ['TURSO_DATABASE_URL', 'TURSO_AUTH_TOKEN']) {
  const value = process.env[key];
  if (value && !/^[\x21-\x7e]+$/.test(value.trim())) {
    throw new Error(`${key} contains spaces or non-ASCII characters (e.g. "•" copied from a masked field) — paste the real value again`);
  }
}

export const dbKind = process.env.TURSO_DATABASE_URL?.startsWith('libsql://') ? 'turso' : 'local-file';

const client = createClient({
  url: process.env.TURSO_DATABASE_URL?.trim() || 'file:local.db',
  authToken: process.env.TURSO_AUTH_TOKEN?.trim(),
});
console.log(`Database: ${dbKind}`);

await client.batch([
  `CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    telegram_id INTEGER UNIQUE NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT,
    username TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS budgets (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    currency TEXT DEFAULT '₽',
    created_by INTEGER NOT NULL,
    invite_code TEXT UNIQUE NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS budget_members (
    budget_id TEXT NOT NULL,
    user_id INTEGER NOT NULL,
    role TEXT DEFAULT 'member',
    joined_at TEXT DEFAULT (datetime('now')),
    PRIMARY KEY (budget_id, user_id)
  )`,
  `CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    budget_id TEXT NOT NULL,
    name TEXT NOT NULL,
    icon TEXT DEFAULT '📦',
    color TEXT DEFAULT '#6366f1',
    planned_amount REAL DEFAULT 0,
    sort_order INTEGER DEFAULT 0
  )`,
  `CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    budget_id TEXT NOT NULL,
    category_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    amount REAL NOT NULL,
    description TEXT,
    date TEXT DEFAULT (date('now')),
    created_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS savings_goals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    budget_id TEXT NOT NULL,
    name TEXT NOT NULL,
    target_amount REAL NOT NULL,
    current_amount REAL DEFAULT 0,
    icon TEXT DEFAULT '🎯',
    deadline TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS savings_contributions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    goal_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    amount REAL NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS incomes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    budget_id TEXT NOT NULL,
    user_id INTEGER NOT NULL,
    amount REAL NOT NULL,
    source TEXT NOT NULL DEFAULT 'other',
    description TEXT,
    date TEXT DEFAULT (date('now')),
    created_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS handled_updates (
    key TEXT PRIMARY KEY,
    created_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS recap_sent (
    budget_id TEXT NOT NULL,
    month TEXT NOT NULL,
    PRIMARY KEY (budget_id, month)
  )`,
  `CREATE TABLE IF NOT EXISTS reactions (
    expense_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    emoji TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    PRIMARY KEY (expense_id, user_id)
  )`,
  `CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    expense_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    text TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS notify_prefs (
    user_id INTEGER PRIMARY KEY,
    partner_activity INTEGER NOT NULL DEFAULT 1,
    limits INTEGER NOT NULL DEFAULT 1,
    reminder INTEGER NOT NULL DEFAULT 0,
    tz_offset INTEGER NOT NULL DEFAULT 0,
    last_reminder TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS expense_edits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    expense_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    field TEXT NOT NULL,
    old_value TEXT,
    new_value TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS bank_events (
    user_id INTEGER NOT NULL,
    hash TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    PRIMARY KEY (user_id, hash)
  )`,
  `CREATE TABLE IF NOT EXISTS merchant_categories (
    budget_id TEXT NOT NULL,
    merchant TEXT NOT NULL,
    category_id INTEGER NOT NULL,
    PRIMARY KEY (budget_id, merchant)
  )`,
  `CREATE TABLE IF NOT EXISTS imports (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    budget_id TEXT NOT NULL,
    payload TEXT NOT NULL,
    done INTEGER NOT NULL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS savings_alerts (
    goal_id INTEGER NOT NULL,
    month TEXT NOT NULL,
    PRIMARY KEY (goal_id, month)
  )`,
  `CREATE TABLE IF NOT EXISTS limit_alerts (
    category_id INTEGER NOT NULL,
    month TEXT NOT NULL,
    level INTEGER NOT NULL,
    PRIMARY KEY (category_id, month, level)
  )`,
  `CREATE TABLE IF NOT EXISTS personal_expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    budget_id TEXT NOT NULL,
    user_id INTEGER NOT NULL,
    category_id INTEGER,
    amount REAL NOT NULL,
    description TEXT,
    date TEXT DEFAULT (date('now')),
    created_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS receipts (
    expense_id INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL,
    mime TEXT NOT NULL,
    data TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS settlements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    budget_id TEXT NOT NULL,
    from_user INTEGER NOT NULL,
    to_user INTEGER NOT NULL,
    amount REAL NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS recurring (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    budget_id TEXT NOT NULL,
    user_id INTEGER NOT NULL,
    kind TEXT NOT NULL,
    amount REAL NOT NULL,
    category_id INTEGER,
    source TEXT,
    description TEXT,
    day_of_month INTEGER NOT NULL,
    start_month TEXT NOT NULL,
    last_month TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  )`,
]);

// Columns added after launch; ALTER fails harmlessly once they exist.
for (const sql of [
  'ALTER TABLE expenses ADD COLUMN recurring_id INTEGER',
  'ALTER TABLE incomes ADD COLUMN recurring_id INTEGER',
  'ALTER TABLE budget_members ADD COLUMN share REAL',
  'ALTER TABLE budget_members ADD COLUMN personal_limit REAL NOT NULL DEFAULT 0',
  'ALTER TABLE users ADD COLUMN active_budget_id TEXT',
  'ALTER TABLE users ADD COLUMN tutorial_done INTEGER NOT NULL DEFAULT 0',
  'ALTER TABLE savings_goals ADD COLUMN monthly_plan REAL NOT NULL DEFAULT 0',
  'ALTER TABLE notify_prefs ADD COLUMN savings INTEGER NOT NULL DEFAULT 1',
  'ALTER TABLE users ADD COLUMN hook_token TEXT',
  "ALTER TABLE expense_edits ADD COLUMN kind TEXT NOT NULL DEFAULT 'expense'",
]) {
  await client.execute(sql).catch(() => {});
}

console.log('Database tables initialized');

const db = {
  prepare(sql) {
    return {
      async run(...params) {
        return client.execute({ sql, args: params });
      },
      async get(...params) {
        const result = await client.execute({ sql, args: params });
        return result.rows[0] || undefined;
      },
      async all(...params) {
        const result = await client.execute({ sql, args: params });
        return result.rows;
      },
    };
  },
  async batch(statements) {
    await client.batch(statements);
  },
};

export default db;
