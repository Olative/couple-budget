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
import { startBot } from './bot.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

async function authMiddleware(req, res, next) {
  const telegramId = req.headers['x-telegram-user-id'];
  if (!telegramId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  const user = await db.prepare('SELECT * FROM users WHERE telegram_id = ?').get(Number(telegramId));
  if (!user) {
    return res.status(401).json({ error: 'User not found' });
  }
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

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.use(express.static(join(__dirname, '..', 'public')));
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, '..', 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  startBot();
});
