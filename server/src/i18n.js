// Bot and notification texts in the user's language. The Russian text is the key; English lives in locales/en.js.
import db from './db.js';
import en from './locales/en.js';

const RU_FAMILY = new Set(['ru', 'uk', 'be', 'kk', 'ky', 'uz', 'tg', 'hy', 'az', 'ka', 'tk', 'mo']);

// Telegram's language_code ("en", "ru", "pt-br") → the app's language.
export function langFromCode(code) {
  const base = String(code || '').toLowerCase().split(/[-_]/)[0];
  return !base || RU_FAMILY.has(base) ? 'ru' : 'en';
}

export const normLang = (lang) => (lang === 'en' ? 'en' : 'ru');

const fill = (s, vars) => (vars ? s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m)) : s);

const missing = new Set();
export function tr(lang, ru, vars) {
  let s = ru;
  if (lang === 'en') {
    if (en[ru] != null) s = en[ru];
    else if (!missing.has(ru)) {
      missing.add(ru);
      console.warn('i18n: no English for', JSON.stringify(ru.slice(0, 80)));
    }
  }
  return fill(s, vars);
}

// Plural form for n; "{n}" in a form is replaced with the number.
export function trPl(lang, n, one, few, many, enOne, enMany) {
  let form;
  if (lang === 'en') form = Math.abs(n) === 1 ? enOne : enMany;
  else {
    const a = Math.abs(n) % 100, b = a % 10;
    form = a > 10 && a < 20 ? many : b === 1 ? one : b >= 2 && b <= 4 ? few : many;
  }
  return form.replace(/\{n\}/g, String(n));
}

// users.lang, remembered for a minute so notifications don't hit the database every time.
const cache = new Map();
const TTL_MS = 60 * 1000;

async function cached(key, load) {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.lang;
  const lang = await load().catch(() => null);
  if (lang) cache.set(key, { lang, at: Date.now() });
  return lang || 'ru';
}

export const langOfUser = (userId) => cached(`u:${userId}`, async () =>
  normLang((await db.prepare('SELECT lang FROM users WHERE id = ?').get(userId))?.lang));

export const langOfTelegram = (telegramId) => cached(`t:${telegramId}`, async () =>
  normLang((await db.prepare('SELECT lang FROM users WHERE telegram_id = ?').get(telegramId))?.lang));

// For a Telegram update: the stored choice, else the language of the user's Telegram app.
export async function langOfFrom(from) {
  if (!from) return 'ru';
  const hit = cache.get(`t:${from.id}`);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.lang;
  const row = await db.prepare('SELECT lang FROM users WHERE telegram_id = ?').get(from.id).catch(() => null);
  if (row?.lang) {
    const lang = normLang(row.lang);
    cache.set(`t:${from.id}`, { lang, at: Date.now() });
    return lang;
  }
  return langFromCode(from.language_code);
}

export function clearLangCache() {
  cache.clear();
}

// Number formatting that matches the language.
export const locale = (lang) => (lang === 'en' ? 'en-US' : 'ru-RU');
