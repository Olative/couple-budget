import TelegramBot from 'node-telegram-bot-api';
import db from './db.js';
import { currentMonth, shiftMonth } from './insights.js';
import { sendEveningReminders, sendSavingsReminders, onExpenseAdded } from './notify.js';
import { parseMessage } from './quickadd.js';
import { looksLikeBankNotice, parseBankNotice, parseStatement } from './bank.js';
import { recordNotice, prepareImport, commitImport, learnMerchant, hookToken } from './importer.js';
import { buildExport } from './routes/files.js';
import { readFileSync } from 'fs';
import crypto, { createHash } from 'crypto';
import { CONTACT_EMAIL } from './legal.js';

// Telegram caches media by URL, so a replaced clip needs a new URL to show up.
function mediaVersion(file) {
  try {
    return createHash('md5').update(readFileSync(new URL(`../public/bot/${file}`, import.meta.url))).digest('hex').slice(0, 8);
  } catch {
    return 'dev';
  }
}
const WELCOME_VERSION = mediaVersion('welcome.mp4');
const RECAP_VERSION = mediaVersion('recap.mp4');
const AUTO_VIDEO_VERSION = mediaVersion('auto-guide.mp4');

const BOT_TOKEN = process.env.BOT_TOKEN;
const WEB_APP_URL = process.env.WEB_APP_URL || 'https://couple-budget-z17f.onrender.com';
const ADMIN_ID = process.env.ADMIN_TELEGRAM_ID;

const openButton = (text = 'Открыть Lolo & Pepe', url = WEB_APP_URL) => ({
  reply_markup: { inline_keyboard: [[{ text, web_app: { url } }]] },
});

// A broadcast mentioning /auto also gets a button that sends the setup guide right away.
const AUTO_BUTTON = { text: '⚙️ Как настроить автоучёт', callback_data: 'auto:show' };
function broadcastButtons(text) {
  const rows = [[{ text: 'Открыть Lolo & Pepe', web_app: { url: WEB_APP_URL } }]];
  if (/\/auto\b/.test(text)) rows.unshift([AUTO_BUTTON]);
  return { reply_markup: { inline_keyboard: rows } };
}

// The setup video: sent by URL once, then by Telegram's file_id so it isn't downloaded again.
let autoVideoId = null;
async function sendAutoVideo(chatId, caption, extra = {}) {
  const res = await bot.sendVideo(chatId, autoVideoId || `${WEB_APP_URL}/bot/auto-guide.mp4?v=${AUTO_VIDEO_VERSION}`,
    { caption, supports_streaming: true, width: 1080, height: 1080, ...extra });
  if (res?.video?.file_id) autoVideoId = res.video.file_id;
  return res;
}
// Captions are limited to 1024 characters; a longer broadcast goes out as plain text.
const withAutoVideo = (text) => /\/auto\b/.test(text) && text.length <= 1024;

let bot;
let botUsername = process.env.BOT_USERNAME || null;
const pendingBroadcasts = new Map();

export async function sendToUser(telegramId, text) {
  if (!bot) return;
  await bot.sendMessage(telegramId, text, openButton('Открыть Lolo & Pepe'));
}

export async function sendDocumentToUser(telegramId, file, caption) {
  if (!bot) throw new Error('Bot is disabled');
  await bot.sendDocument(telegramId, file.buffer, { caption }, { filename: file.filename, contentType: 'text/csv' });
}

// ---------- posts and support dialogs (used by the admin panel) ----------

export const adminTelegramId = () => ADMIN_ID;
export const botName = () => botUsername;

function requireBot() {
  if (!bot) throw new Error('Бот не запущен');
  return bot;
}

// Buttons under a post: open the app, the auto-recording guide, and an optional link.
function postMarkup(buttons = {}) {
  const rows = [];
  if (buttons.auto) rows.push([AUTO_BUTTON]);
  if (buttons.link?.text && /^https:\/\//.test(buttons.link.url || '')) rows.push([{ text: buttons.link.text.slice(0, 40), url: buttons.link.url }]);
  if (buttons.open !== false) rows.push([{ text: 'Открыть Lolo & Pepe', web_app: { url: WEB_APP_URL } }]);
  return { reply_markup: { inline_keyboard: rows } };
}

// Sends a post (text, optional photo or video, buttons) and returns the Telegram file id of its media,
// so the same upload can be reused for every recipient.
export async function deliverPost(chatId, post) {
  const b = requireBot();
  const extra = { ...postMarkup(post.buttons), ...(post.html ? { parse_mode: 'HTML' } : {}) };
  const m = post.media;
  if (!m) {
    await b.sendMessage(chatId, post.text, extra);
    return null;
  }
  const opts = { caption: post.text, ...extra };
  if (m.type === 'guide') {
    const res = await sendAutoVideo(chatId, post.text, extra);
    return res?.video?.file_id || null;
  }
  const file = m.file_id || m.buffer;
  const fileOpts = m.buffer ? { filename: m.filename || 'file', contentType: m.mime } : undefined;
  const res = m.type === 'photo'
    ? await b.sendPhoto(chatId, file, opts, fileOpts)
    : await b.sendVideo(chatId, file, { ...opts, supports_streaming: true }, fileOpts);
  return res?.photo?.at(-1)?.file_id || res?.video?.file_id || res?.animation?.file_id || null;
}

const REPLY_BUTTON = { reply_markup: { inline_keyboard: [[{ text: '✍️ Ответить', callback_data: 'sup:reply' }]] } };
// While a support chat is open, text goes to the team instead of being recorded as an expense; this button closes it.
const DONE_BUTTON = { reply_markup: { inline_keyboard: [[{ text: '✅ Готово — снова записывать траты', callback_data: 'sup:done' }]] } };

// A message from the team to one user; they can answer with the button underneath.
export async function sendSupportReply(user, text) {
  await requireBot().sendMessage(user.telegram_id, `💬 Lolo & Pepe:\n${text}`, REPLY_BUTTON);
  return db.prepare("INSERT INTO messages (user_id, direction, text, read) VALUES (?, 'out', ?, 1) RETURNING *").get(user.id, text);
}

async function startSupport(chatId, telegramId) {
  await db.prepare("UPDATE users SET support_until = datetime('now', '+15 minutes') WHERE telegram_id = ?").run(telegramId);
  await bot.sendMessage(chatId, '✍️ Напишите, что случилось или что хотите предложить, — передам команде Lolo & Pepe. Ответ придёт сюда же.\n\nПока открыт этот разговор, сообщения не записываются как траты.', DONE_BUTTON);
}

// A user's message in support mode: saved, copied to the admin, and acknowledged.
async function handleSupportMessage(msg, user) {
  await db.prepare("UPDATE users SET support_until = datetime('now', '+15 minutes') WHERE id = ?").run(user.id);
  const rec = await db.prepare("INSERT INTO messages (user_id, direction, text) VALUES (?, 'in', ?) RETURNING id").get(user.id, msg.text.slice(0, 4000));
  if (ADMIN_ID) {
    const who = `${user.first_name}${user.username ? ` (@${user.username})` : ''}`;
    const copy = await bot.sendMessage(ADMIN_ID, `💬 ${who}:\n${msg.text}\n\n↩️ Ответьте на это сообщение — ответ уйдёт пользователю.`).catch(() => null);
    if (copy) await db.prepare('UPDATE messages SET admin_msg_id = ? WHERE id = ?').run(copy.message_id, rec.id);
  }
  await bot.sendMessage(msg.chat.id, 'Передала команде ✉️ Ответ придёт сюда. Можно дописать ещё — я всё передам.', DONE_BUTTON);
}

// The admin answered a copied support message in Telegram: forward the answer to that user.
async function handleAdminReply(msg) {
  const row = await db.prepare(`
    SELECT u.* FROM messages m JOIN users u ON u.id = m.user_id WHERE m.admin_msg_id = ? AND u.telegram_id > 0
  `).get(msg.reply_to_message.message_id);
  if (!row) return false;
  await sendSupportReply(row, msg.text);
  await db.prepare("UPDATE messages SET read = 1 WHERE user_id = ? AND direction = 'in'").run(row.id);
  await bot.sendMessage(msg.chat.id, `✓ Отправлено: ${row.first_name}`);
  return true;
}

// One-time sign-in to the admin panel in a browser.
async function sendAdminLinks(chatId) {
  const token = crypto.randomBytes(24).toString('hex');
  await db.prepare("INSERT INTO admin_tokens (token, kind, expires_at) VALUES (?, 'login', datetime('now', '+15 minutes'))").run(token);
  await bot.sendMessage(chatId, '🛠 CRM Lolo & Pepe\n\nВ Telegram — первая кнопка. На компьютере — вторая: ссылка одноразовая и работает 15 минут, никому её не пересылайте.', {
    reply_markup: { inline_keyboard: [
      [{ text: 'Открыть CRM', web_app: { url: `${WEB_APP_URL}/admin/` } }],
      [{ text: 'Открыть в браузере', url: `${WEB_APP_URL}/admin/?t=${token}` }],
    ] },
  });
}

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

const BOT_NAME = 'Lolo & Pepe: бюджет на двоих';

async function setupProfile() {
  // Telegram rate-limits name changes, so only set it when it differs.
  try {
    const current = await bot._request('getMyName', { form: {} });
    if (current.name !== BOT_NAME) await bot._request('setMyName', { form: { name: BOT_NAME } });
  } catch (e) {
    console.error('Bot name update failed:', e.message);
  }
  await bot.setMyDescription({
    description: 'Считайте деньги вдвоём — без таблиц 🐧\n\n' +
      'Видно, кто сколько потратил, сколько осталось до конца месяца и сколько уже отложено на мечту.',
  });
  await bot.setMyShortDescription({ short_description: 'Бюджет для двоих: общие траты, лимиты, копилка и итоги месяца 🐧' });
  await bot.setChatMenuButton({ menu_button: JSON.stringify({ type: 'web_app', text: 'Открыть', web_app: { url: WEB_APP_URL } }) });
  await bot.setMyCommands([
    { command: 'start', description: 'Открыть приложение' },
    { command: 'auto', description: 'Как настроить автоматический учёт трат и доходов' },
    { command: 'export', description: 'Выгрузить траты в Excel' },
    { command: 'support', description: 'Написать команде' },
    { command: 'help', description: 'Помощь' },
  ]);
  if (ADMIN_ID) {
    await bot.setMyCommands([
      { command: 'start', description: 'Открыть приложение' },
      { command: 'auto', description: 'Как настроить автоматический учёт трат и доходов' },
      { command: 'export', description: 'Выгрузить траты в Excel' },
      { command: 'admin', description: 'CRM: пользователи, диалоги, рассылки' },
      { command: 'stats', description: 'Статистика' },
      { command: 'broadcast', description: 'Рассылка всем пользователям' },
      { command: 'support', description: 'Написать команде' },
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
    if (param === 'support') {
      await startSupport(chatId, msg.from.id);
      return;
    }
    const animation = `${WEB_APP_URL}/bot/welcome.mp4?v=${WELCOME_VERSION}`;

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
      await bot.sendAnimation(chatId, animation, { caption, ...button });
    } catch (e) {
      // Only fall back to text when Telegram rejected the animation; a network error may mean it was delivered.
      if (e.code !== 'ETELEGRAM') {
        console.error('Welcome animation send failed:', e.message);
        return;
      }
      await bot.sendMessage(chatId, caption, button);
    }
  });

  bot.onText(/^\/help/, async (msg) => {
    if (!(await firstTime(msgKey(msg)))) return;
    let text = 'Всё самое важное — в приложении: нажмите кнопку «Открыть» внизу или кнопку под этим сообщением.\n\n' +
      'А траты можно записывать прямо здесь — просто напишите:\n«кофе 250», «такси 300 вчера», «+5000 подработка»\n\n' +
      'Или перешлите SMS/уведомление банка — запишу сама. А выписку из банка (PDF, Excel или CSV) просто пришлите файлом.\n\n' +
      '/start — открыть приложение\n/auto — как настроить автоматический учёт трат и доходов\n/export — выгрузить все траты в Excel\n/support — написать команде: вопрос или идея\n/myid — узнать свой Telegram ID';
    if (isAdmin(msg)) {
      text += '\n\nДля администратора:\n/admin — CRM\n/stats — статистика\n/broadcast текст — рассылка всем пользователям';
    }
    bot.sendMessage(msg.chat.id, text, openButton());
  });

  bot.onText(/^\/auto/, async (msg) => {
    if (msg.chat.type !== 'private') return;
    if (!(await firstTime(msgKey(msg)))) return;
    await sendAutoGuide(msg.chat.id, msg.from.id);
  });

  bot.on('callback_query', async (q) => {
    if (q.data !== 'auto:show') return;
    if (!(await firstTime(`cb:${q.id}`))) return;
    await bot.answerCallbackQuery(q.id).catch(() => {});
    sendAutoGuide(q.from.id, q.from.id).catch(e => console.error('Auto guide failed:', e));
  });

  bot.onText(/^\/export/, async (msg) => {
    if (msg.chat.type !== 'private' || !(await firstTime(msgKey(msg)))) return;
    const { user, budget } = await quickAddContext(msg.from.id);
    if (!user || !budget) {
      await bot.sendMessage(msg.chat.id, 'Пока нечего выгружать — сначала создайте бюджет в приложении.', openButton());
      return;
    }
    const file = await buildExport(budget.id, user.id);
    await sendDocumentToUser(msg.chat.id, file, `📊 Все траты и доходы — ${file.count} записей. Файл открывается в Excel и Google Таблицах.`);
  });

  bot.onText(/^\/admin\b/, async (msg) => {
    if (msg.chat.type !== 'private' || !(await firstTime(msgKey(msg)))) return;
    if (!isAdmin(msg)) {
      console.log(`/admin from ${msg.from.id}: not the admin (ADMIN_TELEGRAM_ID ${ADMIN_ID ? 'is set' : 'is not set'})`);
      await bot.sendMessage(msg.chat.id, 'Эта команда только для администратора бота.');
      return;
    }
    try {
      await sendAdminLinks(msg.chat.id);
    } catch (e) {
      console.error('Admin links failed:', e.message);
      await bot.sendMessage(msg.chat.id, `Не получилось открыть CRM: ${e.message}`).catch(() => {});
    }
  });

  bot.onText(/^\/support\b/, async (msg) => {
    if (msg.chat.type !== 'private' || !(await firstTime(msgKey(msg)))) return;
    await startSupport(msg.chat.id, msg.from.id);
  });

  bot.on('callback_query', async (q) => {
    if (!['sup:reply', 'sup:done'].includes(q.data) || !(await firstTime(`cb:${q.id}`))) return;
    await bot.answerCallbackQuery(q.id).catch(() => {});
    if (q.data === 'sup:reply') {
      await startSupport(q.from.id, q.from.id);
      return;
    }
    await db.prepare('UPDATE users SET support_until = NULL WHERE telegram_id = ?').run(q.from.id);
    await bot.editMessageReplyMarkup({ inline_keyboard: [] }, { chat_id: q.message.chat.id, message_id: q.message.message_id }).catch(() => {});
    await bot.sendMessage(q.from.id, 'Готово 🐧 Теперь сообщения снова записываются как траты. Написать нам — /support.');
  });

  // Telegram shows /privacy in the bot profile; the answer links to the documents.
  bot.onText(/^\/(privacy|terms)/, async (msg) => {
    await bot.sendMessage(msg.chat.id,
      `Политика конфиденциальности: ${WEB_APP_URL}/privacy\nПользовательское соглашение: ${WEB_APP_URL}/terms\n\n` +
      `Privacy Policy: ${WEB_APP_URL}/privacy?lang=en\nTerms of Use: ${WEB_APP_URL}/terms?lang=en\n\n` +
      `Вопросы и удаление данных / Questions and data deletion: ${CONTACT_EMAIL}\n` +
      'Удалить аккаунт можно и в приложении: Настройки → Удалить аккаунт и данные.',
      { disable_web_page_preview: true });
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
    const confirm = {
      reply_markup: {
        inline_keyboard: [[
          { text: `Отправить всем (${n})`, callback_data: 'bc:send' },
          { text: 'Отмена', callback_data: 'bc:cancel' },
        ]],
      },
    };
    if (withAutoVideo(text)) {
      // Show the real post: the video with the text under it; the user buttons are listed in the note below.
      try {
        await sendAutoVideo(msg.chat.id, text);
        await bot.sendMessage(msg.chat.id, `Так пост увидят пользователи (${n}): видеоинструкция с этим текстом.\nКнопки: [⚙️ Как настроить автоучёт] [Открыть Lolo & Pepe]`, confirm);
        return;
      } catch (e) {
        console.error('Auto video preview failed:', e.message);
      }
    }
    const buttons = /\/auto\b/.test(text) ? '[⚙️ Как настроить автоучёт]\n[Открыть Lolo & Pepe]' : '[Открыть Lolo & Pepe]';
    await bot.sendMessage(msg.chat.id, `Так сообщение увидят пользователи (${n}):\n\n———\n${text}\n\nКнопки: ${buttons}\n———`, confirm);
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
        if (withAutoVideo(text)) {
          try {
            await sendAutoVideo(u.telegram_id, text, broadcastButtons(text));
          } catch (e) {
            if (e.response?.statusCode === 403) throw e;
            await bot.sendMessage(u.telegram_id, text, broadcastButtons(text));
          }
        } else {
          await bot.sendMessage(u.telegram_id, text, broadcastButtons(text));
        }
        sent++;
      } catch {
        failed++;
      }
      await new Promise(r => setTimeout(r, 60));
    }
    bot.sendMessage(chatId, `Готово ✅\nДоставлено: ${sent}${failed ? `\nНе доставлено: ${failed} (пользователь не запускал бота или заблокировал его)` : ''}`);
  });

  bot.on('message', async (msg) => {
    if (msg.chat.type !== 'private') return;
    if (msg.document) {
      if (!(await firstTime(msgKey(msg)))) return;
      handleStatement(msg).catch(e => console.error('Statement import failed:', e));
      return;
    }
    if (!msg.text || msg.text.startsWith('/')) return;
    if (!(await firstTime(msgKey(msg)))) return;
    if (isAdmin(msg) && msg.reply_to_message && (await handleAdminReply(msg).catch(e => { console.error('Admin reply failed:', e.message); return false; }))) return;
    const supportUser = await db.prepare("SELECT * FROM users WHERE telegram_id = ? AND support_until > datetime('now')").get(msg.from.id);
    if (supportUser) {
      handleSupportMessage(msg, supportUser).catch(e => console.error('Support message failed:', e.message));
      return;
    }
    const handler = looksLikeBankNotice(msg.text) ? handleBankText : handleQuickAdd;
    handler(msg).catch(e => console.error('Quick add failed:', e));
  });

  bot.on('callback_query', async (q) => {
    if (!q.data?.startsWith('imp:')) return;
    if (!(await firstTime(`cb:${q.id}`))) return;
    handleImportCallback(q).catch(e => console.error('Import callback failed:', e));
  });

  bot.on('callback_query', async (q) => {
    if (!q.data?.startsWith('qa:')) return;
    if (!(await firstTime(`cb:${q.id}`))) return;
    handleQuickAddCallback(q).catch(e => console.error('Quick add callback failed:', e));
  });

  bot.on('polling_error', (err) => {
    console.error('Bot polling error:', err.message);
  });

  console.log('Telegram bot started');

  sendMonthlyRecaps().catch(e => console.error('Recap send error:', e));
  setInterval(() => sendMonthlyRecaps().catch(e => console.error('Recap send error:', e)), 60 * 60 * 1000);
  setInterval(() => sendEveningReminders().catch(e => console.error('Reminder error:', e)), 10 * 60 * 1000);
  setInterval(() => sendSavingsReminders().catch(e => console.error('Savings reminder error:', e)), 60 * 60 * 1000);
}

const money = (n, cur) => `${new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(n)} ${cur}`;
const SOURCE_NAMES = { salary: '💼 Зарплата', side: '💻 Подработка', gift: '🎁 Подарок', refund: '↩️ Возврат, кешбэк', other: '💰 Другое' };

async function quickAddContext(telegramId) {
  const user = await db.prepare('SELECT * FROM users WHERE telegram_id = ?').get(telegramId);
  if (!user) return { user: null };
  const budget = await db.prepare(`
    SELECT b.* FROM budgets b JOIN budget_members bm ON bm.budget_id = b.id
    WHERE bm.user_id = ? ORDER BY b.id = ? DESC, bm.joined_at DESC LIMIT 1
  `).get(user.id, user.active_budget_id || '');
  return { user, budget };
}

function quickAddReply(kind, rec, budget, categoryLabel) {
  const title = rec.description ? `${rec.description} — ` : '';
  const text = `✅ Записано: ${title}${kind === 'income' ? '+' : ''}${money(Number(rec.amount), budget.currency)}\n` +
    `${kind === 'income' ? 'Доход' : 'Категория'}: ${categoryLabel}` +
    (rec.date !== new Date().toISOString().slice(0, 10) ? `\nДата: ${Number(rec.date.slice(8, 10))}.${rec.date.slice(5, 7)}` : '');
  const t = kind === 'income' ? 'i' : 'e';
  const row = [{ text: 'Отменить', callback_data: `qa:undo:${t}:${rec.id}` }];
  if (kind === 'expense') row.unshift({ text: 'Другая категория', callback_data: `qa:cats:${rec.id}` });
  return { text, extra: { reply_markup: { inline_keyboard: [row] } } };
}

async function handleQuickAdd(msg) {
  const { user, budget } = await quickAddContext(msg.from.id);
  if (!user || !budget) {
    await bot.sendMessage(msg.chat.id, 'Сначала откройте приложение и создайте бюджет — тогда траты можно будет записывать прямо здесь.', openButton());
    return;
  }
  const prefs = await db.prepare('SELECT tz_offset FROM notify_prefs WHERE user_id = ?').get(user.id);
  const categories = await db.prepare('SELECT * FROM categories WHERE budget_id = ? ORDER BY sort_order').all(budget.id);
  const parsed = parseMessage(msg.text, categories, Number(prefs?.tz_offset || 0));
  if (!parsed) {
    await bot.sendMessage(msg.chat.id, 'Чтобы записать трату, напишите сумму и на что, например:\n«кофе 250», «такси 300 вчера»\n\nДоход — с плюсом: «+5000 подработка»');
    return;
  }

  if (parsed.kind === 'income') {
    const rec = await db.prepare('INSERT INTO incomes (budget_id, user_id, amount, source, description, date) VALUES (?, ?, ?, ?, ?, ?) RETURNING *')
      .get(budget.id, user.id, parsed.amount, parsed.source, parsed.description, parsed.date);
    const r = quickAddReply('income', rec, budget, SOURCE_NAMES[parsed.source]);
    await bot.sendMessage(msg.chat.id, r.text, r.extra);
    return;
  }

  const rec = await db.prepare('INSERT INTO expenses (budget_id, category_id, user_id, amount, description, date) VALUES (?, ?, ?, ?, ?, ?) RETURNING *')
    .get(budget.id, parsed.category.id, user.id, parsed.amount, parsed.description, parsed.date);
  const r = quickAddReply('expense', rec, budget, `${parsed.category.icon} ${parsed.category.name}`);
  await bot.sendMessage(msg.chat.id, r.text, r.extra);
  await onExpenseAdded(rec, user);
}

async function handleQuickAddCallback(q) {
  const [, action, a, b] = q.data.split(':');
  const chat = { chat_id: q.message.chat.id, message_id: q.message.message_id };
  const { user, budget } = await quickAddContext(q.from.id);
  await bot.answerCallbackQuery(q.id).catch(() => {});
  if (!user || !budget) return;

  if (action === 'undo') {
    const table = a === 'i' ? 'incomes' : 'expenses';
    const rec = await db.prepare(`SELECT * FROM ${table} WHERE id = ? AND user_id = ?`).get(b, user.id);
    if (!rec) return;
    if (table === 'expenses') {
      await db.prepare('DELETE FROM reactions WHERE expense_id = ?').run(rec.id);
      await db.prepare('DELETE FROM comments WHERE expense_id = ?').run(rec.id);
    }
    await db.prepare(`DELETE FROM ${table} WHERE id = ?`).run(rec.id);
    await bot.editMessageText(`❌ Отменено: ${rec.description ? `${rec.description} — ` : ''}${money(Number(rec.amount), budget.currency)}`, chat);
    return;
  }

  const rec = await db.prepare('SELECT * FROM expenses WHERE id = ? AND user_id = ?').get(a, user.id);
  if (!rec) return;
  const categories = await db.prepare('SELECT * FROM categories WHERE budget_id = ? ORDER BY sort_order').all(rec.budget_id);

  if (action === 'cats') {
    const rows = [];
    for (let i = 0; i < categories.length; i += 2) {
      rows.push(categories.slice(i, i + 2).map(c => ({ text: `${c.icon} ${c.name}`, callback_data: `qa:cat:${rec.id}:${c.id}` })));
    }
    await bot.editMessageReplyMarkup({ inline_keyboard: rows }, chat);
    return;
  }

  if (action === 'cat') {
    const cat = categories.find(c => String(c.id) === b);
    if (!cat) return;
    await db.prepare('UPDATE expenses SET category_id = ? WHERE id = ?').run(cat.id, rec.id);
    if (rec.description) await learnMerchant(rec.budget_id, rec.description, cat.id);
    const r = quickAddReply('expense', rec, budget, `${cat.icon} ${cat.name}`);
    await bot.editMessageText(r.text, { ...chat, ...r.extra });
  }
}

// ---------- bank notifications and statements ----------

// How to record spending without typing: forwarding, iPhone Shortcuts with the personal link, Android, statements.
async function sendAutoGuide(chatId, telegramId) {
  const user = await db.prepare('SELECT id FROM users WHERE telegram_id = ?').get(telegramId);
  if (!user) {
    await bot.sendMessage(chatId, 'Сначала откройте приложение и создайте бюджет.', openButton());
    return;
  }
  const link = `${WEB_APP_URL}/hook/${await hookToken(user.id)}`;
  await bot.sendMessage(chatId,
    '🐧 Как записывать траты и доходы без ручного ввода\n\n' +
    '1️⃣ Перешлите сюда SMS или уведомление банка — о покупке или о зачислении. Сама найду сумму и магазин и запишу трату в нужную категорию, а зарплату или перевод — в доходы. ' +
    'Поменяете категорию — запомню для этого магазина.\n\n' +
    '2️⃣ Автоматически на iPhone (для SMS от банка):\n' +
    '• приложение «Команды» → «Автоматизация» → «+»\n' +
    '• «Сообщение» → в «Отправитель» укажите банк (например, 900) → «Запускать сразу»\n' +
    '• «Новая пустая команда» → действие «Получить содержимое URL» → вставьте ссылку ниже\n' +
    '• «Показать больше»: метод POST, тело запроса JSON, поле text, значение «Ввод команды»\n\n' +
    `Ваша личная ссылка (никому не отправляйте):\n${link}\n\n` +
    '3️⃣ На Android то же настраивается в приложении MacroDroid — оно умеет ловить и SMS, и пуш-уведомления банка.\n\n' +
    '4️⃣ Выписка: скачайте в банке выписку в PDF, Excel или CSV и пришлите файлом сюда — запишу все операции разом, повторы пропущу.',
    { disable_web_page_preview: true, ...openButton('Открыть приложение') });
}


// Records a bank SMS / push text for a Telegram user and tells them in the chat. Used by the bot and the iPhone shortcut.
export async function recordBankText(telegramId, text) {
  const { user, budget } = await quickAddContext(telegramId);
  if (!user || !budget) return { ok: false, reason: 'no budget' };
  const prefs = await db.prepare('SELECT tz_offset FROM notify_prefs WHERE user_id = ?').get(user.id);
  const parsed = parseBankNotice(text, Number(prefs?.tz_offset || 0));
  if (!parsed) return { ok: false, reason: 'not a bank notice' };
  const result = await recordNotice(user, budget, parsed, text);
  if (result.duplicate) return { ok: true, duplicate: true };
  if (bot) {
    const r = result.kind === 'income'
      ? quickAddReply('income', result.rec, budget, SOURCE_NAMES[result.rec.source] || SOURCE_NAMES.other)
      : quickAddReply('expense', result.rec, budget, `${result.category.icon} ${result.category.name}`);
    await bot.sendMessage(telegramId, `🏦 Из уведомления банка\n${r.text}`, r.extra);
  }
  if (result.kind === 'expense') await onExpenseAdded(result.rec, user);
  return { ok: true, kind: result.kind, amount: result.rec.amount };
}

async function handleBankText(msg) {
  const res = await recordBankText(msg.from.id, msg.text);
  if (res.duplicate) await bot.sendMessage(msg.chat.id, 'Эта операция уже записана 👌');
  else if (!res.ok) await handleQuickAdd(msg);
}

async function handleStatement(msg) {
  const { user, budget } = await quickAddContext(msg.from.id);
  if (!user || !budget) {
    await bot.sendMessage(msg.chat.id, 'Сначала откройте приложение и создайте бюджет.', openButton());
    return;
  }
  const doc = msg.document;
  if (doc.file_size > 10 * 1024 * 1024) {
    await bot.sendMessage(msg.chat.id, 'Файл слишком большой. Выгрузите выписку за месяц-два.');
    return;
  }
  try {
    const url = await bot.getFileLink(doc.file_id);
    const buf = Buffer.from(await (await fetch(url)).arrayBuffer());
    const ops = await parseStatement(buf, doc.file_name || (doc.mime_type === 'application/pdf' ? 'statement.pdf' : 'statement.csv'));
    const s = await prepareImport(user, budget, ops);
    await bot.sendMessage(msg.chat.id, importSummary(s), {
      reply_markup: { inline_keyboard: [[{ text: `Записать ${s.count}`, callback_data: `imp:ok:${s.id}` }, { text: 'Отмена', callback_data: `imp:no:${s.id}` }]] },
    });
  } catch (e) {
    await bot.sendMessage(msg.chat.id, `Не получилось прочитать выписку: ${e.message}`);
  }
}

const shortDate = (d) => `${d.slice(8, 10)}.${d.slice(5, 7)}`;
export function importSummary(s) {
  return `📄 Нашла ${s.count} операций с ${shortDate(s.from)} по ${shortDate(s.to)}\n` +
    `Расходы: ${s.expenses} на ${money(s.spent, s.currency)}\nДоходы: ${s.incomes} на ${money(s.earned, s.currency)}\n\n` +
    `Запишу в бюджет «${s.budgetName}». То, что уже есть в бюджете (тот же день и сумма), пропущу.`;
}

async function handleImportCallback(q) {
  const [, action, id] = q.data.split(':');
  const chat = { chat_id: q.message.chat.id, message_id: q.message.message_id };
  await bot.answerCallbackQuery(q.id).catch(() => {});
  const user = await db.prepare('SELECT * FROM users WHERE telegram_id = ?').get(q.from.id);
  if (!user) return;
  if (action === 'no') {
    await db.prepare('DELETE FROM imports WHERE id = ? AND user_id = ? AND done = 0').run(id, user.id);
    await bot.editMessageText('Загрузка отменена.', chat);
    return;
  }
  await bot.editMessageText('⏳ Записываю…', chat);
  try {
    const r = await commitImport(id, user.id);
    await bot.editMessageText(r.already ? 'Эта выписка уже записана.' :
      `✅ Записала ${r.added} операций${r.skipped ? `, пропустила ${r.skipped} — они уже были в бюджете` : ''}.`, { ...chat, ...openButton('Открыть бюджет') });
  } catch (e) {
    await bot.editMessageText(`Не получилось: ${e.message}`, chat);
  }
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
    const text = `Итоги ${label} готовы!\n\nСколько потратили, на что ушло больше всего и что ждёт в новом месяце.`;
    const button = openButton('Смотреть итоги', `${WEB_APP_URL}?recap=${month}`);
    for (const m of members) {
      try {
        try {
          await bot.sendAnimation(m.telegram_id, `${WEB_APP_URL}/bot/recap.mp4?v=${RECAP_VERSION}`, { caption: text, ...button });
        } catch (e) {
          console.error(`Recap clip to ${m.telegram_id} failed, sending text:`, e.message);
          await bot.sendMessage(m.telegram_id, `🐧 ${text}`, button);
        }
      } catch (e) {
        console.error(`Recap message to ${m.telegram_id} failed:`, e.message);
      }
    }
  }
}
