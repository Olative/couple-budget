import TelegramBot from 'node-telegram-bot-api';
import db from './db.js';
import { currentMonth, shiftMonth } from './insights.js';

const BOT_TOKEN = process.env.BOT_TOKEN;
const WEB_APP_URL = process.env.WEB_APP_URL || 'https://couple-budget-z17f.onrender.com';
const ADMIN_ID = process.env.ADMIN_TELEGRAM_ID;

const openButton = (text = 'Открыть Lolo & Pepe', url = WEB_APP_URL) => ({
  reply_markup: { inline_keyboard: [[{ text, web_app: { url } }]] },
});

let bot;
let botUsername = process.env.BOT_USERNAME || null;
const pendingBroadcasts = new Map();

export function inviteLink(code) {
  return botUsername ? `https://t.me/${botUsername}?start=${code}` : null;
}

const isAdmin = (msg) => ADMIN_ID && String(msg.from.id) === String(ADMIN_ID);

// During a Render deploy the old and new instance briefly poll together, and an update
// the old one handled but never acknowledged is redelivered to the new one.
async function firstTime(key) {
  const res = await db.prepare('INSERT OR IGNORE INTO handled_updates (key) VALUES (?)').run(key);
  return res.rowsAffected > 0;
}
const msgKey = (msg) => `m:${msg.chat.id}:${msg.message_id}`;

async function setupProfile() {
  await bot.setMyDescription({
    description: 'Считайте деньги вдвоём — без таблиц и споров 🐧\n\n' +
      'Видно, кто сколько потратил, сколько осталось до конца месяца и сколько уже отложено на мечту.',
  });
  await bot.setMyShortDescription({ short_description: 'Бюджет для двоих: общие траты, лимиты, копилка и итоги месяца 🐧' });
  await bot.setChatMenuButton({ menu_button: JSON.stringify({ type: 'web_app', text: 'Открыть', web_app: { url: WEB_APP_URL } }) });
  await bot.setMyCommands([
    { command: 'start', description: 'Открыть приложение' },
    { command: 'help', description: 'Помощь' },
  ]);
  if (ADMIN_ID) {
    await bot.setMyCommands([
      { command: 'start', description: 'Открыть приложение' },
      { command: 'stats', description: 'Статистика' },
      { command: 'broadcast', description: 'Рассылка всем пользователям' },
      { command: 'help', description: 'Помощь' },
    ], { scope: { type: 'chat', chat_id: Number(ADMIN_ID) } });
  }
}

export function startBot() {
  if (!BOT_TOKEN) {
    console.log('BOT_TOKEN not set, bot disabled');
    return;
  }

  bot = new TelegramBot(BOT_TOKEN, { polling: true });
  bot.getMe().then(me => { botUsername = me.username; }).catch(e => console.error('getMe failed:', e.message));
  setupProfile().catch(e => console.error('Bot profile setup failed:', e.message));

  bot.onText(/^\/start(.*)/, async (msg, match) => {
    if (!(await firstTime(msgKey(msg)))) return;
    const chatId = msg.chat.id;
    const param = (match[1] || '').trim();
    const photo = `${WEB_APP_URL}/bot/welcome.jpg`;

    let inviter = null;
    if (param) {
      const row = await db.prepare(
        'SELECT u.first_name FROM budgets b JOIN users u ON u.id = b.created_by WHERE b.invite_code = ?'
      ).get(param);
      inviter = row?.first_name;
    }

    const [caption, button] = param
      ? [
        `${inviter ? `${inviter} приглашает вас` : 'Вас пригласили'} в общий бюджет Lolo & Pepe 🐧\n\n` +
        'Нажмите кнопку ниже — и вы сразу окажетесь в нём. Траты, лимиты и копилка станут общими.',
        openButton('Присоединиться', `${WEB_APP_URL}?join=${encodeURIComponent(param)}`),
      ]
      : [
        `Привет, ${msg.from.first_name}! 🐧\n\n` +
        'Рады, что вы здесь. Приступим:\n\n' +
        '1. Создайте общий бюджет\n' +
        '2. Позовите второго пингвина по ссылке\n' +
        '3. Добавьте первую трату\n\n' +
        'Остальное посчитают пингвины.',
        openButton(),
      ];

    try {
      await bot.sendPhoto(chatId, photo, { caption, ...button });
    } catch (e) {
      // Only fall back to text when Telegram rejected the photo; a network error may mean it was delivered.
      if (e.code !== 'ETELEGRAM') {
        console.error('Welcome photo send failed:', e.message);
        return;
      }
      await bot.sendMessage(chatId, caption, button);
    }
  });

  bot.onText(/^\/help/, async (msg) => {
    if (!(await firstTime(msgKey(msg)))) return;
    let text = 'Всё самое важное — в приложении: нажмите кнопку «Открыть» внизу или кнопку под этим сообщением.\n\n' +
      '/start — открыть приложение\n/myid — узнать свой Telegram ID';
    if (isAdmin(msg)) {
      text += '\n\nДля администратора:\n/stats — статистика\n/broadcast текст — рассылка всем пользователям';
    }
    bot.sendMessage(msg.chat.id, text, openButton());
  });

  bot.onText(/^\/myid/, async (msg) => {
    if (!(await firstTime(msgKey(msg)))) return;
    bot.sendMessage(msg.chat.id, `Ваш Telegram ID: ${msg.from.id}`);
  });

  bot.onText(/^\/stats/, async (msg) => {
    if (!isAdmin(msg) || !(await firstTime(msgKey(msg)))) return;
    const month = currentMonth();
    const one = async (sql, ...args) => Number((await db.prepare(sql).get(...args)).n);
    const users = await one('SELECT COUNT(*) as n FROM users');
    const budgets = await one('SELECT COUNT(*) as n FROM budgets');
    const pairs = await one('SELECT COUNT(*) as n FROM (SELECT budget_id FROM budget_members GROUP BY budget_id HAVING COUNT(*) >= 2)');
    const active = await one('SELECT COUNT(DISTINCT budget_id) as n FROM expenses WHERE date LIKE ?', `${month}%`);
    const expenses = await one('SELECT COUNT(*) as n FROM expenses WHERE date LIKE ?', `${month}%`);
    bot.sendMessage(msg.chat.id,
      `📊 Статистика\n\n` +
      `Пользователей: ${users}\n` +
      `Бюджетов: ${budgets}, из них пар: ${pairs}\n` +
      `Активны в этом месяце: ${active}\n` +
      `Трат в этом месяце: ${expenses}`);
  });

  bot.onText(/^\/broadcast(?:@\w+)?([\s\S]*)/, async (msg, match) => {
    if (!isAdmin(msg) || !(await firstTime(msgKey(msg)))) return;
    const text = (match[1] || '').trim();
    if (!text) {
      bot.sendMessage(msg.chat.id, 'Напишите текст сразу после команды, например:\n\n/broadcast Привет! Мы добавили итоги месяца 🐧');
      return;
    }
    const { n } = await db.prepare('SELECT COUNT(*) as n FROM users').get();
    pendingBroadcasts.set(msg.chat.id, text);
    await bot.sendMessage(msg.chat.id, `Так сообщение увидят пользователи (${n}):\n\n———\n${text}\n———`, {
      reply_markup: {
        inline_keyboard: [[
          { text: `Отправить всем (${n})`, callback_data: 'bc:send' },
          { text: 'Отмена', callback_data: 'bc:cancel' },
        ]],
      },
    });
  });

  bot.on('callback_query', async (q) => {
    if (!q.data?.startsWith('bc:') || !isAdmin(q)) return;
    const chatId = q.message.chat.id;
    if (!(await firstTime(`bc:${chatId}:${q.message.message_id}`))) {
      await bot.answerCallbackQuery(q.id).catch(() => {});
      return;
    }
    const text = pendingBroadcasts.get(chatId);
    pendingBroadcasts.delete(chatId);
    await bot.answerCallbackQuery(q.id);
    await bot.editMessageReplyMarkup({ inline_keyboard: [] }, { chat_id: chatId, message_id: q.message.message_id });

    if (q.data === 'bc:cancel' || !text) {
      bot.sendMessage(chatId, text ? 'Рассылка отменена.' : 'Черновик рассылки не найден, отправьте /broadcast ещё раз.');
      return;
    }

    const users = await db.prepare('SELECT telegram_id FROM users').all();
    let sent = 0;
    let failed = 0;
    for (const u of users) {
      try {
        await bot.sendMessage(u.telegram_id, text, openButton());
        sent++;
      } catch {
        failed++;
      }
      await new Promise(r => setTimeout(r, 60));
    }
    bot.sendMessage(chatId, `Готово ✅\nДоставлено: ${sent}${failed ? `\nНе доставлено: ${failed} (пользователь не запускал бота или заблокировал его)` : ''}`);
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
        await bot.sendMessage(m.telegram_id, `🐧 Итоги ${label} готовы!\n\nСколько потратили, на что ушло больше всего и что ждёт в новом месяце.`,
          openButton('Смотреть итоги', `${WEB_APP_URL}?recap=${month}`));
      } catch (e) {
        console.error(`Recap message to ${m.telegram_id} failed:`, e.message);
      }
    }
  }
}
