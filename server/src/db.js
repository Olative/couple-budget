import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const db = new Database(join(__dirname, '..', 'budget.db'));

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY,
    telegram_id INTEGER UNIQUE NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT,
    username TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS budgets (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    currency TEXT DEFAULT '₽',
    created_by INTEGER NOT NULL REFERENCES users(id),
    invite_code TEXT UNIQUE NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS budget_members (
    budget_id TEXT NOT NULL REFERENCES budgets(id),
    user_id INTEGER NOT NULL REFERENCES users(id),
    role TEXT DEFAULT 'member',
    joined_at TEXT DEFAULT (datetime('now')),
    PRIMARY KEY (budget_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    budget_id TEXT NOT NULL REFERENCES budgets(id),
    name TEXT NOT NULL,
    icon TEXT DEFAULT '📦',
    color TEXT DEFAULT '#6366f1',
    planned_amount REAL DEFAULT 0,
    sort_order INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    budget_id TEXT NOT NULL REFERENCES budgets(id),
    category_id INTEGER NOT NULL REFERENCES categories(id),
    user_id INTEGER NOT NULL REFERENCES users(id),
    amount REAL NOT NULL,
    description TEXT,
    date TEXT DEFAULT (date('now')),
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS savings_goals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    budget_id TEXT NOT NULL REFERENCES budgets(id),
    name TEXT NOT NULL,
    target_amount REAL NOT NULL,
    current_amount REAL DEFAULT 0,
    icon TEXT DEFAULT '🎯',
    deadline TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS savings_contributions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    goal_id INTEGER NOT NULL REFERENCES savings_goals(id),
    user_id INTEGER NOT NULL REFERENCES users(id),
    amount REAL NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );
`);

export default db;
