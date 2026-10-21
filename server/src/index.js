import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import db from './db.js';
import authRoutes from './routes/auth.js';
import budgetRoutes from './routes/budgets.js';
import expenseRoutes from './routes/expenses.js';
import categoryRoutes from './routes/categories.js';
import savingsRoutes from './routes/savings.js';
import { startBot } from './bot.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

function authMiddleware(req, res, next) {
  const telegramId = req.headers['x-telegram-user-id'];
  if (!telegramId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  const user = db.prepare('SELECT * FROM users WHERE telegram_id = ?').get(Number(telegramId));
  if (!user) {
    return res.status(401).json({ error: 'User not found' });
  }
  req.userId = user.id;
  req.user = user;
  next();
}

app.use('/api', authRoutes);
app.use('/api', authMiddleware, budgetRoutes);
app.use('/api', authMiddleware, expenseRoutes);
app.use('/api', authMiddleware, categoryRoutes);
app.use('/api', authMiddleware, savingsRoutes);

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
