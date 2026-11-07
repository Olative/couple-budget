import { MONTHS, MONTHS_GEN, MONTHS_PREP, MONTHS_DAT, INCOME_SOURCES } from './format';
import pages from './locales/en-pages';
import components from './locales/en-components';
import errors from './locales/en-errors';

// Two languages. Russian text in the code is the key; English comes from the dictionaries in ./locales.
// Text without a translation falls back to Russian, so nothing ever shows up empty.
const EN = { ...errors, ...components, ...pages };

const RU_LANGS = ['ru', 'uk', 'be', 'kk', 'ky', 'uz', 'tg', 'hy', 'az', 'ka', 'tk', 'mo'];
export const langFromCode = (code) => (RU_LANGS.includes(String(code || '').slice(0, 2).toLowerCase()) ? 'ru' : 'en');

// English stays off until the screens are translated; then this switch goes away.
const ENGLISH_READY = true;

function initialLang() {
  if (!ENGLISH_READY) return 'ru';
  try {
    const saved = localStorage.getItem('lang');
    if (saved === 'ru' || saved === 'en') return saved;
  } catch { /* storage unavailable */ }
  const tgCode = window.Telegram?.WebApp?.initDataUnsafe?.user?.language_code;
  return langFromCode(tgCode || navigator.language);
}

let lang = initialLang();
const listeners = new Set();
export const getLang = () => lang;
export const onLangChange = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };

export function setLang(next, { remember = true } = {}) {
  if (next !== 'ru' && next !== 'en') return;
  if (remember) { try { localStorage.setItem('lang', next); } catch { /* ignore */ } }
  if (next === lang) return;
  lang = next;
  applyFormats();
  listeners.forEach(fn => fn(lang));
}

// t('Сохранить') → 'Save' in English. Variables: t('Осталось {sum}', { sum }) with the same {name} in the English text.
export function t(ru, vars) {
  let s = lang === 'en' && EN[ru] != null ? EN[ru] : ru;
  if (vars) s = s.replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? vars[k] : m));
  return s;
}

// Plural forms: pl(n, 'трата', 'траты', 'трат', 'expense', 'expenses').
export function pl(n, one, few, many, enOne, enMany) {
  const a = Math.abs(n);
  if (lang === 'en') return a === 1 ? enOne : enMany;
  const m10 = a % 10, m100 = a % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
}

export const locale = () => (lang === 'en' ? 'en-US' : 'ru-RU');

// Month names and income sources are shared arrays; they are refilled in place for the current language.
const RU_FORMS = { MONTHS: [...MONTHS], MONTHS_GEN: [...MONTHS_GEN], MONTHS_PREP: [...MONTHS_PREP], MONTHS_DAT: [...MONTHS_DAT] };
const RU_SOURCES = INCOME_SOURCES.map(s => s.name);
const EN_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const EN_SOURCES = { salary: 'Salary', side: 'Side income', gift: 'Gift', refund: 'Refund, cashback', other: 'Other' };
function applyFormats() {
  const en = lang === 'en';
  // English has one form of a month name for every case.
  const fill = (arr, ru) => ru.forEach((v, i) => { arr[i] = en ? EN_MONTHS[i] : v; });
  fill(MONTHS, RU_FORMS.MONTHS);
  fill(MONTHS_GEN, RU_FORMS.MONTHS_GEN);
  fill(MONTHS_PREP, RU_FORMS.MONTHS_PREP);
  fill(MONTHS_DAT, RU_FORMS.MONTHS_DAT);
  INCOME_SOURCES.forEach((s, i) => { s.name = en ? EN_SOURCES[s.id] : RU_SOURCES[i]; });
  document.documentElement.lang = lang;
}
applyFormats();
