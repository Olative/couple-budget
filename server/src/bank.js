// Turning bank texts into budget records: SMS / push notifications and exported statements (CSV, Excel).
import ExcelJS from 'exceljs';

// An .xlsx is a zip; a tiny file can unpack into gigabytes. The zip's own table of contents lists the
// unpacked sizes, so add them up before opening it. Unreadable tables count as too big.
function unzippedSize(buf) {
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) {
    if (buf.readUInt32LE(i) !== 0x06054b50) continue;
    const entries = buf.readUInt16LE(i + 10);
    let p = buf.readUInt32LE(i + 16), total = 0;
    for (let n = 0; n < entries; n++) {
      if (p + 46 > buf.length || buf.readUInt32LE(p) !== 0x02014b50) return Infinity;
      const size = buf.readUInt32LE(p + 24);
      if (size === 0xffffffff) return Infinity;
      total += size;
      p += 46 + buf.readUInt16LE(p + 28) + buf.readUInt16LE(p + 30) + buf.readUInt16LE(p + 32);
    }
    return total;
  }
  return Infinity;
}
import { CATEGORY_HINTS, EN_CATEGORY_NAMES } from './quickadd.js';

// Latin merchant names as banks print them, and bank category names, mapped to our default categories.
const MERCHANT_HINTS = {
  'Продукты': ['vkusvill', 'pyaterochka', 'pyaterochk', '5ka', 'magnit', 'perekrestok', 'lenta', 'auchan', 'ashan', 'dixy', 'diksi', 'spar', 'metro c&c', 'samokat', 'lavka', 'azbuka', 'okey', 'globus', 'verny', 'supermarket', 'grocer', 'супермаркет', 'продукты'],
  'Кафе и рестораны': ['cafe', 'coffee', 'kofe', 'restoran', 'restaurant', 'burger', 'kfc', 'rostics', 'vkusno', 'shokoladnica', 'teremok', 'dodo', 'pizza', 'sushi', 'bar ', 'delivery club', 'yandex eda', 'eda.yandex', 'яндекс еда', 'яндекс.еда', 'рестораны', 'фастфуд', 'кафе'],
  'Транспорт': ['яндекс go', 'яндекс такси', 'yandex.taxi', 'yandex go', 'yandex.go', 'taxi', 'uber', 'citymobil', 'metro', 'mosmetro', 'transport', 'troika', 'aeroflot', 'rzd', 'azs', 'lukoil', 'gazprom', 'rosneft', 'shell', 'такси', 'транспорт', 'азс', 'топливо'],
  'Здоровье': ['apteka', 'pharm', 'rigla', 'eapteka', 'zdravcity', 'clinic', 'medsi', 'invitro', 'gemotest', 'аптеки', 'медицина'],
  'Одежда': ['zara', 'uniqlo', 'h&m', 'lamoda', 'wildberries', 'ozon', 'sportmaster', 'одежда и обувь', 'одежда'],
  'Развлечения': ['kino', 'cinema', 'karo', 'theatre', 'teatr', 'museum', 'kassir', 'afisha', 'кино', 'развлечения'],
  'Подписки': ['netflix', 'spotify', 'apple.com', 'itunes', 'google', 'youtube', 'yandex.plus', 'yandex plus', 'kinopoisk', 'ivi', 'okko', 'chatgpt', 'openai', 'anthropic', 'icloud', 'сервис'],
  'Коммунальные': ['zhkh', 'mosenergo', 'mos.ru', 'gosuslugi', 'mts', 'beeline', 'megafon', 'tele2', 'rostelecom', 'жкх', 'связь', 'коммунальные'],
};

const norm = (s) => (s || '').toLowerCase().replace(/ё/g, 'е');

// A default category by its Russian name, or its English name in an English budget.
const findDefault = (categories, name) => categories.find(x => norm(x.name) === norm(name) || norm(x.name) === norm(EN_CATEGORY_NAMES[name]));

// Picks a category for a merchant: what this budget learned before, then name hints, then "Прочее".
export function categorize(text, categories, learned = {}) {
  const t = norm(text);
  const key = merchantKey(text);
  if (key && learned[key]) {
    const c = categories.find(x => x.id === learned[key]);
    if (c) return c;
  }
  for (const [name, hints] of Object.entries(MERCHANT_HINTS)) {
    if (hints.some(h => t.includes(h))) {
      const c = findDefault(categories, name);
      if (c) return c;
    }
  }
  for (const [name, hints] of Object.entries(CATEGORY_HINTS)) {
    if (hints.some(h => t.includes(h))) {
      const c = findDefault(categories, name);
      if (c) return c;
    }
  }
  return findDefault(categories, 'Прочее') || categories[categories.length - 1];
}

// A stable key for "the same shop": letters only, without store numbers and city tails.
export function merchantKey(text) {
  const k = norm(text).replace(/[^a-zа-я]+/g, ' ').trim().split(' ').filter(w => w.length > 1).slice(0, 2).join(' ');
  return k.length >= 3 ? k : null;
}

// ---------- notifications ----------
const MONEY = /(\d{1,3}(?:[   ]\d{3})+|\d+)(?:[.,](\d{1,2}))?\s*(?:р\.?|руб\.?|rub|rur|₽|thb|฿|usd|\$|eur|€)(?=[\s.,;:)!]|$)/i;
const EXPENSE_WORDS = /(покупка|оплата|списание|списано|снятие|выдача наличных|перевод(?!\s+от)|платеж|платёж|purchase|payment)/i;
const INCOME_WORDS = /(зачисление|зачислено|пополнение|поступление|перевод от|входящий перевод|возврат|кешбэк|кэшбэк|cashback|refund|зарплат)/i;
const SKIP_WORDS = /(код|пароль|никому не сообщайте|вход в|отказ|недостаточно|отклонен|не выполнен|заблокирован)/i;

const STOP = new Set(['rub', 'rur', 'руб', 'р', 'по', 'карте', 'картой', 'карта', 'счет', 'счёт', 'в', 'на', 'с', 'от', 'успешно', 'одобрена', 'одобрено', 'сумма', 'зарплаты', 'операция']);

const toAmount = (whole, frac) => Number(String(whole).replace(/[   ]/g, '')) + (frac ? Number(`0.${frac}`) : 0);

export function looksLikeBankNotice(text) {
  if (!text || text.length > 600) return false;
  const head = text.split(/баланс|доступно|остаток/i)[0];
  return MONEY.test(head) && (EXPENSE_WORDS.test(text) || INCOME_WORDS.test(text) || /\*\d{4}|карта|card|счет|счёт/i.test(text));
}

// "ECMC1234 14:05 Покупка 450р VKUSVILL Баланс: 1 234.56р" -> { kind, amount, merchant, date }
export function parseBankNotice(text, tzOffsetMin = 0) {
  if (!looksLikeBankNotice(text) || SKIP_WORDS.test(text)) return null;
  // Everything after the balance is about the account, not the operation.
  const body = text.split(/\s*(?:баланс|доступно|остаток)(?=[\s:.,]|$)/i)[0];
  const m = body.match(MONEY);
  if (!m) return null;
  const amount = toAmount(m[1], m[2]);
  if (!(amount > 0)) return null;

  const income = INCOME_WORDS.test(body) && !/(покупка|оплата|списание)/i.test(body);
  let date = new Date(Date.now() + tzOffsetMin * 60000).toISOString().slice(0, 10);
  const d = body.match(/(?:^|\s)(\d{2})\.(\d{2})(?:\.(\d{2,4}))?(?=\s|$)/);
  if (d) {
    const y = d[3] ? (d[3].length === 2 ? `20${d[3]}` : d[3]) : date.slice(0, 4);
    const candidate = `${y}-${d[2]}-${d[1]}`;
    if (!Number.isNaN(Date.parse(candidate))) date = candidate;
  }

  // The merchant is what's left once the amount, card, time, date and the operation word are removed.
  let merchant = body
    .replace(m[0], ' ')
    .replace(/(?:ecmc|visa|mir|мир|maestro|mc)[-\s]?\*?\d{2,4}/ig, ' ')
    .replace(/(?:карта|карты|card|счет|счёт|сч[её]т)\s*(?:№|\*|\.)?\s*\*?\d{2,6}/ig, ' ')
    .replace(/\*\d{2,6}/g, ' ')
    .replace(/\b\d{1,2}:\d{2}(?::\d{2})?\b/g, ' ')
    .replace(/(?:^|\s)\d{2}\.\d{2}(?:\.\d{2,4})?(?=\s|$)/g, ' ')
    .replace(new RegExp(EXPENSE_WORDS.source, 'ig'), ' ')
    .replace(new RegExp(INCOME_WORDS.source, 'ig'), ' ')
    .replace(/[,.;:]+/g, ' ')
    .split(/\s+/)
    // Service words, bare numbers and word stubs (like the "ы" left from "зарплаты") are not the merchant.
    .filter(w => w && !STOP.has(w.toLowerCase()) && !/^\d+$/.test(w) && !/^[а-яё]$/.test(w))
    .join(' ')
    .trim();
  if (merchant.length > 40) merchant = merchant.slice(0, 40).trim();
  if (!/[a-zа-я]/i.test(merchant)) merchant = '';
  return { kind: income ? 'income' : 'expense', amount, date, merchant: merchant || null };
}

// ---------- statements ----------
const HEADER = {
  date: [/дата операции/, /^дата$/, /дата/, /date/],
  amount: [/сумма операции/, /сумма платежа/, /сумма в валюте счета/, /^сумма/, /amount/],
  debit: [/расход/, /списани/, /дебет/, /withdraw/],
  credit: [/приход/, /поступлени/, /зачислени/, /кредит/, /deposit/],
  desc: [/описание/, /назначение/, /контрагент/, /получатель/, /место/, /merchant/, /description/, /детали/],
  category: [/категория/, /category/],
  status: [/статус/, /status/],
};

const findCol = (headers, patterns) => {
  for (const p of patterns) {
    const i = headers.findIndex(h => p.test(h));
    if (i >= 0) return i;
  }
  return -1;
};

function parseNumber(v) {
  if (typeof v === 'number') return v;
  if (v == null) return NaN;
  const s = String(v).replace(/[  \s]/g, '').replace(/[−–]/g, '-').replace(/[^\d,.\-+]/g, '');
  if (!s) return NaN;
  // "1.234,56" or "1,234.56" or "1234,56"
  const lastComma = s.lastIndexOf(','), lastDot = s.lastIndexOf('.');
  const dec = lastComma > lastDot ? ',' : '.';
  return Number(s.replace(dec === ',' ? /\./g : /,/g, '').replace(',', '.'));
}

function parseDate(v) {
  if (v instanceof Date && !Number.isNaN(v.getTime())) return v.toISOString().slice(0, 10);
  const s = String(v || '').trim();
  let m = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{2,4})/);
  if (m) return `${m[3].length === 2 ? `20${m[3]}` : m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) return `${m[3]}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`;
  return null;
}

function splitCsvLine(line, sep) {
  const out = [];
  let cur = '', q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (q) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; } else if (ch === '"') q = false; else cur += ch;
    } else if (ch === '"') q = true;
    else if (ch === sep) { out.push(cur); cur = ''; } else cur += ch;
  }
  out.push(cur);
  return out.map(x => x.trim());
}

function decodeText(buf) {
  const utf = new TextDecoder('utf-8').decode(buf);
  // Russian banks often export in Windows-1251; replacement characters give it away.
  if ((utf.match(/�/g) || []).length > 3) return new TextDecoder('windows-1251').decode(buf);
  return utf.replace(/^﻿/, '');
}

async function readRows(buf, filename) {
  if (/\.xlsx$/i.test(filename)) {
    if (unzippedSize(buf) > 40 * 1024 * 1024) throw new Error('Файл слишком большой. Выгрузите выписку за месяц-два');
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buf);
    const ws = wb.worksheets[0];
    const rows = [];
    ws.eachRow({ includeEmpty: false }, (row) => {
      rows.push(row.values.slice(1).map(v => (v && typeof v === 'object' && !(v instanceof Date)) ? (v.result ?? v.text ?? v.richText?.map(r => r.text).join('') ?? '') : v));
    });
    return rows;
  }
  if (/\.(csv|txt)$/i.test(filename)) {
    const text = decodeText(buf);
    const lines = text.split(/\r?\n/).filter(l => l.trim());
    const sample = lines.slice(0, 20).join('\n');
    const sep = [';', ',', '\t'].sort((a, b) => sample.split(b).length - sample.split(a).length)[0];
    return lines.map(l => splitCsvLine(l, sep));
  }
  throw new Error('Пришлите выписку в PDF, Excel (.xlsx) или CSV');
}

// Returns operations from a bank statement: [{ kind, amount, date, description, bankCategory }]
// ---------- PDF statements ----------
// A PDF has no table, only text placed on the page. Text pieces at the same height make a line; a line that
// starts with a date and has an amount is an operation. Other lines (wrapped descriptions, merchant details)
// belong to the nearest operation line above or below on the same page, since banks align cells differently.
// The user sees the totals and confirms before anything is saved.
const PDF_INCOME = /зачислен|пополнен|поступлен|возврат|кешб[эе]к|cashback|перевод от|входящ|заработн|зарплат|refund/i;
const PDF_SKIP = /остаток|баланс на|итого|всего|оборот|дата операции|дата списания|сумма операции|^\s*(?:пополнения|расходы|списания|поступления)\s*:/i;
const DATE_RE = /\b\d{2}\.\d{2}\.(?:\d{4}|\d{2})\b/g;
const TIME_RE = /\b\d{1,2}:\d{2}(?::\d{2})?\b/g;
const AMOUNT_RE = /([+\-−–]?)\s?((?:\d{1,3}(?:[ \u00a0\u202f]\d{3})+|\d+)[.,]\d{2})(?!\d)/g;

async function pdfLines(buf) {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const doc = await pdfjs.getDocument({ data: new Uint8Array(buf), isEvalSupported: false, disableFontFace: true, verbosity: 0 }).promise;
  if (doc.numPages > 100) throw new Error('Слишком длинная выписка. Выгрузите её за месяц-два');
  const lines = [];
  for (let n = 1; n <= doc.numPages; n++) {
    const page = await doc.getPage(n);
    const rows = [];
    for (const it of (await page.getTextContent()).items) {
      if (!it.str?.trim()) continue;
      const y = it.transform[5], x = it.transform[4];
      let row = rows.find(r => Math.abs(r.y - y) < 3);
      if (!row) rows.push(row = { y, parts: [] });
      row.parts.push({ x, s: it.str });
    }
    rows.sort((a, b) => b.y - a.y);
    for (const r of rows) lines.push({ page: n, y: r.y, text: r.parts.sort((a, b) => a.x - b.x).map(p => p.s.trim()).join('  ') });
  }
  await doc.destroy();
  return lines;
}

const cleanPdfText = (text) => text
  .replace(DATE_RE, ' ').replace(TIME_RE, ' ').replace(AMOUNT_RE, ' ')
  .replace(/\+?\d[\d ()-]{9,}\d/g, ' ')
  .replace(/[₽$€]|\bRUB\b|\bRUR\b|руб\.?/gi, ' ')
  .replace(/операция по (?:карте|сч[её]ту)|\*{0,4}\d{4,}\b/gi, ' ')
  .replace(/\b(?:RUS|RU|Moskva|Moscow|Москва)\b\.?/gi, ' ')
  .replace(/^\s*(?:оплата в|оплата|покупка в|покупка)\s+/i, '')
  .replace(/\s+/g, ' ').replace(/^[\s.,;:-]+|[\s.,;:-]+$/g, '').slice(0, 80);

async function parsePdfStatement(buf) {
  const lines = await pdfLines(buf);
  if (!lines.length) throw new Error('В PDF нет текста — похоже, это скан. Скачайте выписку в банке заново или в CSV/Excel');
  const ops = [];
  for (const line of lines) {
    if (PDF_SKIP.test(line.text)) { line.skip = true; continue; }
    const date = line.text.match(/^\s*(\d{2}\.\d{2}\.(?:\d{4}|\d{2}))\b/);
    const amounts = date ? [...line.text.replace(DATE_RE, ' ').replace(TIME_RE, ' ').matchAll(AMOUNT_RE)] : [];
    const amount = amounts.length ? Math.abs(parseNumber(amounts[0][2])) : 0;
    if (amount > 0) {
      const sign = amounts[0][1];
      line.op = { date: parseDate(date[1]), amount: Math.round(amount * 100) / 100, sign: sign === '+' ? '+' : sign ? '-' : '', parts: [line] };
      ops.push(line.op);
    }
  }
  if (!ops.length) throw new Error('Не нашла в PDF операций с датой и суммой. Попробуйте выписку в CSV или Excel');

  // Attach every other line to the closest operation line on its page. A line closest to a header or totals
  // line is a wrapped part of it and is dropped.
  const anchors = lines.filter(l => l.op || l.skip);
  // Above a page's first operation there are only the title and the table header, apart from a cell's first
  // line sitting just above its own row.
  const top = {};
  for (const a of anchors) if (a.op && !(top[a.page] > a.y)) top[a.page] = a.y;
  for (const line of lines) {
    if (line.op || line.skip) continue;
    if (top[line.page] != null && line.y > top[line.page] + 10) continue;
    let best = null;
    for (const a of anchors) {
      if (a.page !== line.page) continue;
      const d = Math.abs(a.y - line.y);
      if (d < 28 && (!best || d < best.d)) best = { a, d };
    }
    if (best?.a.op) best.a.op.parts.push(line);
  }

  return ops.flatMap(op => {
    const text = op.parts.sort((a, b) => b.y - a.y).map(l => l.text).join(' ');
    if (/между своими|своих счетов|собственн|перевод себе/i.test(text)) return [];
    const kind = op.sign === '+' ? 'income' : op.sign ? 'expense' : (PDF_INCOME.test(text) ? 'income' : 'expense');
    return [{ kind, amount: op.amount, date: op.date, description: cleanPdfText(text) || null, bankCategory: null }];
  });
}

export async function parseStatement(buf, filename) {
  if (/\.pdf$/i.test(filename)) return parsePdfStatement(buf);
  const rows = await readRows(buf, filename);
  const headerIdx = rows.slice(0, 30).findIndex(r => {
    const h = r.map(c => norm(String(c ?? '')));
    return h.some(c => /дата|date/.test(c)) && h.some(c => /сумма|amount|расход|приход|списани/.test(c));
  });
  if (headerIdx < 0) throw new Error('Не нашла в файле столбцы с датой и суммой. Это точно выписка из банка?');
  const headers = rows[headerIdx].map(c => norm(String(c ?? '')).trim());
  const col = Object.fromEntries(Object.entries(HEADER).map(([k, p]) => [k, findCol(headers, p)]));
  if (col.date < 0 || (col.amount < 0 && col.debit < 0)) throw new Error('Не нашла в файле столбцы с датой и суммой');

  const ops = [];
  for (const r of rows.slice(headerIdx + 1)) {
    const date = parseDate(r[col.date]);
    if (!date) continue;
    if (col.status >= 0 && /fail|отклон|отмен|declin/i.test(String(r[col.status] ?? ''))) continue;
    let amount, kind;
    if (col.debit >= 0 || col.credit >= 0) {
      const out = Math.abs(parseNumber(r[col.debit]) || 0), inc = Math.abs(parseNumber(r[col.credit]) || 0);
      if (out > 0) { amount = out; kind = 'expense'; } else if (inc > 0) { amount = inc; kind = 'income'; } else continue;
    } else {
      const v = parseNumber(r[col.amount]);
      if (!v) continue;
      amount = Math.abs(v); kind = v < 0 ? 'expense' : 'income';
    }
    const description = col.desc >= 0 ? String(r[col.desc] ?? '').trim().slice(0, 80) : '';
    const bankCategory = col.category >= 0 ? String(r[col.category] ?? '').trim() : '';
    // Moving money between one's own accounts is neither spending nor income.
    if (/между своими|своих счетов|собственн|перевод себе/i.test(`${description} ${bankCategory}`)) continue;
    ops.push({ kind, amount: Math.round(amount * 100) / 100, date, description: description || null, bankCategory: bankCategory || null });
  }
  if (!ops.length) throw new Error('В файле не нашлось операций');
  return ops;
}

export function incomeSource(text) {
  const t = norm(text);
  if (/зарплат|аванс|salary/.test(t)) return 'salary';
  if (/кешбэк|кэшбэк|cashback|возврат|refund/.test(t)) return 'refund';
  return 'other';
}
