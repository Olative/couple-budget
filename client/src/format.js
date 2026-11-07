export const MONTHS = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
export const MONTHS_GEN = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
export const MONTHS_PREP = ['январе', 'феврале', 'марте', 'апреле', 'мае', 'июне', 'июле', 'августе', 'сентябре', 'октябре', 'ноябре', 'декабре'];
export const MONTHS_DAT = ['январю', 'февралю', 'марту', 'апрелю', 'маю', 'июню', 'июлю', 'августу', 'сентябрю', 'октябрю', 'ноябрю', 'декабрю'];

export function byMonth(month) {
  const label = MONTHS_DAT[monthIndex(month)];
  return month.slice(0, 4) === thisMonth().slice(0, 4) ? label : `${label} ${month.slice(0, 4)}`;
}

export function money(amount, currency = '₽') {
  return new Intl.NumberFormat(document.documentElement.lang === 'en' ? 'en-US' : 'ru-RU', { maximumFractionDigits: 0 }).format(Math.round(amount || 0)) + ' ' + currency;
}

export function num(amount) {
  return new Intl.NumberFormat(document.documentElement.lang === 'en' ? 'en-US' : 'ru-RU', { maximumFractionDigits: 0 }).format(Math.round(amount || 0));
}

export function monthIndex(month) {
  return Number(month.slice(5, 7)) - 1;
}

export function shiftMonth(month, delta) {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function thisMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export const INCOME_SOURCES = [
  { id: 'salary', name: 'Зарплата', icon: '💼' },
  { id: 'side', name: 'Подработка', icon: '💻' },
  { id: 'gift', name: 'Подарок', icon: '🎁' },
  { id: 'refund', name: 'Возврат, кешбэк', icon: '↩️' },
  { id: 'other', name: 'Другое', icon: '💰' },
];
export const incomeSource = (id) => INCOME_SOURCES.find(s => s.id === id) || INCOME_SOURCES[INCOME_SOURCES.length - 1];

// Shrinks a photo to at most 1280px on the long side as JPEG, so receipts stay ~150–300 KB.
export async function compressImage(file, maxSide = 1280, quality = 0.75) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = url;
    });
    const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', quality);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function plural(n, one, few, many) {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
}

export function confirmAction(text) {
  const tg = window.Telegram?.WebApp;
  if (tg?.showConfirm && tg.platform !== 'unknown') {
    return new Promise(resolve => tg.showConfirm(text, resolve));
  }
  return Promise.resolve(window.confirm(text));
}
