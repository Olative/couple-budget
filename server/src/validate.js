// Input checks shared by the routes: amounts are real positive numbers, dates are YYYY-MM-DD, texts are short.
export const amountOf = (v) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 && n < 1e12 ? Math.round(n * 100) / 100 : null;
};
export const today = () => new Date().toISOString().slice(0, 10);
export const dateOf = (v, fallback = today()) => (/^\d{4}-\d{2}-\d{2}$/.test(v || '') ? v : fallback);
export const textOf = (v, max = 200) => (v == null ? null : String(v).trim().slice(0, max) || null);
