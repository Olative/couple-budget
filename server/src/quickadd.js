// Parses free-form chat messages like "кофе 250", "такси 300 вчера", "+5000 подработка", "зарплата 90к".

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
  if (/\sпозавчера\s/.test(rest)) { date = localDate(-2, tzOffsetMin); rest = rest.replace(/\sпозавчера\s/, ' '); }
  else if (/\sвчера\s/.test(rest)) { date = localDate(-1, tzOffsetMin); rest = rest.replace(/\sвчера\s/, ' '); }

  const original = text.replace(amountMatch[0].trim(), ' ').replace(/(^|\s)(позавчера|вчера)(?=\s|$)/i, ' ').replace(/\s+/g, ' ').trim();
  const description = original ? original[0].toUpperCase() + original.slice(1) : null;
  const words = rest.trim();

  const incomeSource = Object.entries(INCOME_HINTS).find(([, hints]) => hints.some(h => words.includes(h)))?.[0];
  if (amountMatch[2] === '+' || incomeSource) {
    const source = incomeSource || (words.includes('подар') ? 'gift' : 'other');
    return { kind: 'income', amount, date, description, source };
  }

  const norm = (s) => s.toLowerCase().replace(/ё/g, 'е');
  let category = categories.find(c => words && norm(c.name).split(/\s+/).some(w => w.length >= 4 && words.includes(w.slice(0, Math.max(4, w.length - 2)))));
  if (!category) {
    const hinted = Object.entries(CATEGORY_HINTS).find(([, hints]) => hints.some(h => words.includes(h)))?.[0];
    category = categories.find(c => norm(c.name) === norm(hinted || ''));
  }
  category ||= categories.find(c => c.name === 'Прочее') || categories[categories.length - 1];
  return { kind: 'expense', amount, date, description, category };
}
