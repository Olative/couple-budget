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
]);

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
