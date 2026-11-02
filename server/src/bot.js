import TelegramBot from 'node-telegram-bot-api';
import db from './db.js';
import { currentMonth, shiftMonth } from './insights.js';

const BOT_TOKEN = process.env.BOT_TOKEN;
const WEB_APP_URL = process.env.WEB_APP_URL || 'https://couple-budget-z17f.onrender.com';

let bot;

export function startBot() {
  if (!BOT_TOKEN) {
    console.log('BOT_TOKEN not set, bot disabled');
    return;
  }

  bot = new TelegramBot(BOT_TOKEN, { polling: true });

  bot.onText(/\/start(.*)/, (msg, match) => {
    const chatId = msg.chat.id;
    const param = (match[1] || '').trim();

    if (param) {
      bot.sendMessage(chatId, `Вас пригласили в парный бюджет!\n\nНажмите кнопку ниже, чтобы присоединиться:`, {
        reply_markup: {
          inline_keyboard: [[
            { text: '💰 Присоединиться', web_app: { url: `${WEB_APP_URL}?join=${param}` } }
          ]]
        }
      });
    } else {
      bot.sendMessage(chatId,
        `Привет, ${msg.from.first_name}! 👋\n\n` +
        `Я помогу вам с партнёром вести общий бюджет:\n\n` +
        `💸 Записывайте расходы по категориям\n` +
        `📊 Смотрите, кто сколько потратил\n` +
        `📋 Планируйте лимиты на месяц\n` +
        `🎯 Копите на общие цели\n\n` +
        `Нажмите кнопку ниже, чтобы начать!`,
        {
          reply_markup: {
            inline_keyboard: [[
              { text: '💰 Открыть бюджет', web_app: { url: WEB_APP_URL } }
            ]]
          }
        }
      );
    }
  });

  bot.onText(/\/help/, (msg) => {
    bot.sendMessage(msg.chat.id,
      `Команды бота:\n\n` +
      `/start — открыть приложение\n` +
      `/help — помощь\n\n` +
      `Все действия — в мини-приложении 👇`,
      {
        reply_markup: {
          inline_keyboard: [[
            { text: '💰 Открыть бюджет', web_app: { url: WEB_APP_URL } }
          ]]
        }
      }
    );
  });

  bot.on('polling_error', (err) => {
    console.error('Bot polling error:', err.message);
  });

  console.log('Telegram bot started');

  sendMonthlyRecaps().catch(e => console.error('Recap send error:', e));
  setInterval(() => sendMonthlyRecaps().catch(e => console.error('Recap send error:', e)), 60 * 60 * 1000);
}

const MONTHS_GEN = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];

// Render's free tier sleeps, so instead of firing exactly on the 1st we catch up during the first week.
async function sendMonthlyRecaps() {
  if (!bot || new Date().getUTCDate() > 7) return;
  const month = shiftMonth(currentMonth(), -1);

  const budgets = await db.prepare(`
    SELECT DISTINCT e.budget_id as id FROM expenses e
    WHERE e.date LIKE ? AND e.budget_id NOT IN (SELECT budget_id FROM recap_sent WHERE month = ?)
  `).all(`${month}%`, month);

  for (const { id } of budgets) {
    await db.prepare('INSERT OR IGNORE INTO recap_sent (budget_id, month) VALUES (?, ?)').run(id, month);
    const members = await db.prepare(
      'SELECT u.telegram_id FROM users u JOIN budget_members bm ON u.id = bm.user_id WHERE bm.budget_id = ?'
    ).all(id);
    const label = MONTHS_GEN[Number(month.slice(5, 7)) - 1];
    for (const m of members) {
      try {
        await bot.sendMessage(m.telegram_id, `🐧 Итоги ${label} готовы!\n\nСколько потратили, на что ушло больше всего и что ждёт в новом месяце.`, {
          reply_markup: { inline_keyboard: [[{ text: 'Смотреть итоги', web_app: { url: `${WEB_APP_URL}?recap=${month}` } }]] },
        });
      } catch (e) {
        console.error(`Recap message to ${m.telegram_id} failed:`, e.message);
      }
    }
  }
}
