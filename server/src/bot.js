import TelegramBot from 'node-telegram-bot-api';
import db from './db.js';

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
}
