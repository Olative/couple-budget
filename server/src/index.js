import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import db, { dbKind } from './db.js';
import authRoutes from './routes/auth.js';
import budgetRoutes from './routes/budgets.js';
import expenseRoutes from './routes/expenses.js';
import categoryRoutes from './routes/categories.js';
import savingsRoutes from './routes/savings.js';
import incomeRoutes from './routes/incomes.js';
import recurringRoutes from './routes/recurring.js';
import socialRoutes from './routes/social.js';
import splitRoutes from './routes/split.js';
import fileRoutes from './routes/files.js';
import { startBot } from './bot.js';

// Bot handlers are async; a failure in one must not take the whole server down.
process.on('unhandledRejection', (e) => console.error('Unhandled rejection:', e));

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '3mb' }));

// Every database round trip to Turso costs ~150 ms, so the user row is remembered for a few minutes.
const userCache = new Map();
const USER_TTL_MS = 5 * 60 * 1000;

async function authMiddleware(req, res, next) {
  const telegramId = Number(req.headers['x-telegram-user-id']);
  if (!telegramId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  let cached = userCache.get(telegramId);
  if (!cached || Date.now() - cached.at > USER_TTL_MS) {
    const row = await db.prepare('SELECT * FROM users WHERE telegram_id = ?').get(telegramId);
    if (!row) {
      return res.status(401).json({ error: 'User not found' });
    }
    cached = { user: row, at: Date.now() };
    userCache.set(telegramId, cached);
  }
  const user = cached.user;
  req.userId = user.id;
  req.user = user;
  next();
}

app.get('/api/health', (req, res) => res.json({ ok: true, db: dbKind }));
app.use('/api', authRoutes);
app.use('/api', authMiddleware, budgetRoutes);
app.use('/api', authMiddleware, expenseRoutes);
app.use('/api', authMiddleware, categoryRoutes);
app.use('/api', authMiddleware, savingsRoutes);
app.use('/api', authMiddleware, incomeRoutes);
app.use('/api', authMiddleware, recurringRoutes);
app.use('/api', authMiddleware, socialRoutes);
app.use('/api', authMiddleware, splitRoutes);
app.use('/api', authMiddleware, fileRoutes);

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Built files have content hashes in their names, so phones may keep them for good.
app.use('/assets', express.static(join(__dirname, '..', 'public', 'assets'), { immutable: true, maxAge: '1y' }));
app.use(express.static(join(__dirname, '..', 'public')));
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, '..', 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  startBot();
});
