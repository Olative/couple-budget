// Parses free-form chat messages like "кофе 250", "такси 300 вчера", "+5000 подработка", "зарплата 90к",
// and the English "coffee 250", "taxi 300 yesterday", "+5000 salary".

export const CATEGORY_HINTS = {
  'Продукты': ['продукт', 'магазин', 'супермаркет', 'seven', '7-eleven', '711', 'makro', 'lotus', 'tops', 'big c', 'перекр', 'пятёр', 'пятер', 'магнит', 'вкусвилл', 'овощ', 'фрукт', 'молок', 'хлеб', 'еда домой', 'рынок'],
  'Кафе и рестораны': ['кофе', 'кафе', 'ресторан', 'обед', 'ужин', 'завтрак', 'пицц', 'суши', 'роллы', 'бар', 'пиво', 'вино', 'коктейл', 'бургер', 'кофейн', 'starbucks', 'доставк', 'pad thai', 'пад тай', 'фо бо', 'шаурм'],
  'Транспорт': ['такси', 'grab', 'bolt', 'uber', 'метро', 'автобус', 'бензин', 'топлив', 'транспорт', 'проезд', 'парковк', 'байк', 'мотобайк', 'аренда байка', 'поезд', 'электричк'],
  'Жильё': ['аренда', 'квартир', 'жильё', 'жилье', 'ипотек', 'кондо'],
  'Коммунальные': ['свет', 'вода', 'электр', 'коммунал', 'интернет', 'газ', 'жкх'],
  'Здоровье': ['аптек', 'врач', 'лекарств', 'стоматолог', 'анализ', 'здоров', 'клиник', 'массаж'],
  'Одежда': ['одежд', 'обувь', 'кроссовк', 'футболк', 'джинс', 'платье', 'zara', 'uniqlo', 'h&m'],
  'Развлечения': ['кино', 'концерт', 'театр', 'игр', 'развлеч', 'музей', 'парк', 'боулинг', 'караоке', 'билет'],
  'Подписки': ['подписк', 'netflix', 'spotify', 'youtube', 'icloud', 'яндекс плюс', 'premium', 'chatgpt', 'claude'],
};

// Default category names in English budgets, keyed by the Russian ones above.
export const EN_CATEGORY_NAMES = {
  'Продукты': 'Groceries', 'Кафе и рестораны': 'Cafes & restaurants', 'Транспорт': 'Transport', 'Жильё': 'Housing',
  'Коммунальные': 'Utilities', 'Здоровье': 'Health', 'Одежда': 'Clothes', 'Развлечения': 'Entertainment',
  'Подписки': 'Subscriptions', 'Прочее': 'Other',
};

// English words, matched at the start of a word ("rent" must not match "parent").
const EN_HINTS = {
  'Продукты': ['grocer', 'supermarket', 'food shop', 'market', 'vegetables', 'fruit', 'milk', 'bread'],
  'Кафе и рестораны': ['coffee', 'cafe', 'café', 'restaurant', 'lunch', 'dinner', 'breakfast', 'brunch', 'pizza', 'sushi', 'beer', 'wine', 'cocktail', 'burger', 'takeaway', 'takeout', 'food delivery', 'snack'],
  'Транспорт': ['taxi', 'cab', 'subway', 'metro', 'bus', 'train', 'fuel', 'petrol', 'gas station', 'parking', 'ticket to', 'scooter', 'transport'],
  'Жильё': ['rent', 'mortgage', 'apartment', 'flat', 'housing'],
  'Коммунальные': ['electricity', 'water bill', 'internet', 'utilities', 'utility', 'phone bill', 'mobile'],
  'Здоровье': ['pharmacy', 'drugstore', 'doctor', 'medicine', 'dentist', 'clinic', 'health', 'massage', 'vitamins'],
  'Одежда': ['clothes', 'shoes', 'sneakers', 't-shirt', 'jeans', 'dress', 'jacket'],
  'Развлечения': ['cinema', 'movie', 'concert', 'theatre', 'theater', 'game', 'museum', 'bowling', 'karaoke', 'party'],
  'Подписки': ['subscription'],
};
const EN_INCOME_HINTS = {
  salary: ['salary', 'paycheck', 'wage', 'payday'],
  side: ['freelance', 'side job', 'side gig', 'gig', 'commission', 'fee'],
  refund: ['refund', 'cashback', 'reimburs'],
};
const atWordStart = (words, h) => (` ${words}`).includes(` ${h}`);

const INCOME_HINTS = {
  salary: ['зарплат', 'зп', 'аванс', 'оклад'],
  side: ['подработк', 'фриланс', 'заказ', 'гонорар'],
  gift: ['подарили'],
  refund: ['кешбэк', 'кэшбэк', 'кешбек', 'cashback', 'возврат', 'вернули'],
};

function localDate(offsetDays = 0, tzOffsetMin = 0) {
  return new Date(Date.now() + tzOffsetMin * 60000 + offsetDays * 86400000).toISOString().slice(0, 10);
}

export function parseMessage(text, categories, tzOffsetMin = 0) {
  let rest = ` ${text.toLowerCase().replace(/ё/g, 'е')} `;
  const amountMatch = rest.match(/(^|\s)(\+)?\s*(\d{1,3}(?:[  ]\d{3})+|\d+)(?:[.,](\d{1,2}))?\s*(к|k|тыс\.?)?(?=\s|$)/i);
  if (!amountMatch) return null;

  let amount = Number(amountMatch[3].replace(/[  ]/g, '')) + (amountMatch[4] ? Number(`0.${amountMatch[4]}`) : 0);
  if (amountMatch[5]) amount *= 1000;
  if (!(amount > 0)) return null;
  rest = rest.replace(amountMatch[0], ' ');

  let date = localDate(0, tzOffsetMin);
  if (/\s(позавчера|the day before yesterday|day before yesterday)\s/.test(rest)) { date = localDate(-2, tzOffsetMin); rest = rest.replace(/\s(позавчера|the day before yesterday|day before yesterday)\s/, ' '); }
  else if (/\s(вчера|yesterday)\s/.test(rest)) { date = localDate(-1, tzOffsetMin); rest = rest.replace(/\s(вчера|yesterday)\s/, ' '); }
  else if (/\s(сегодня|today)\s/.test(rest)) rest = rest.replace(/\s(сегодня|today)\s/, ' ');

  const original = text.replace(amountMatch[0].trim(), ' ')
    .replace(/(^|\s)(позавчера|вчера|сегодня|the day before yesterday|day before yesterday|yesterday|today)(?=\s|$)/i, ' ').replace(/\s+/g, ' ').trim();
  const description = original ? original[0].toUpperCase() + original.slice(1) : null;
  const words = rest.trim();

  const incomeSource = Object.entries(INCOME_HINTS).find(([, hints]) => hints.some(h => words.includes(h)))?.[0]
    || Object.entries(EN_INCOME_HINTS).find(([, hints]) => hints.some(h => atWordStart(words, h)))?.[0];
  if (amountMatch[2] === '+' || incomeSource) {
    const source = incomeSource || (words.includes('подар') || atWordStart(words, 'gift') ? 'gift' : 'other');
    return { kind: 'income', amount, date, description, source };
  }

  const norm = (s) => s.toLowerCase().replace(/ё/g, 'е');
  let category = categories.find(c => words && norm(c.name).split(/\s+/).some(w => w.length >= 4 && words.includes(w.slice(0, Math.max(4, w.length - 2)))));
  if (!category) {
    const hinted = Object.entries(CATEGORY_HINTS).find(([, hints]) => hints.some(h => words.includes(h)))?.[0]
      || Object.entries(EN_HINTS).find(([, hints]) => hints.some(h => atWordStart(words, h)))?.[0];
    if (hinted) category = categories.find(c => [hinted, EN_CATEGORY_NAMES[hinted]].some(n => norm(c.name) === norm(n)));
  }
  category ||= categories.find(c => c.name === 'Прочее' || c.name === 'Other') || categories[categories.length - 1];
  return { kind: 'expense', amount, date, description, category };
}
