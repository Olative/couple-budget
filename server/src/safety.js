import Layer from 'express/lib/router/layer.js';

// Express 4 ignores a rejected promise from an async handler, so the request hangs until it times out.
// Route every such rejection to the error handler instead, which answers with a 500.
export function catchAsyncErrors() {
  Layer.prototype.handle_request = function handle(req, res, next) {
    const fn = this.handle;
    if (fn.length > 3) return next();
    try {
      const result = fn(req, res, next);
      if (result && typeof result.catch === 'function') result.catch(next);
    } catch (err) {
      next(err);
    }
  };
}

// A small in-memory limiter: at most `max` requests per `windowMs` for each key (IP, user or token).
// Enough for one server instance; it resets on restart, which is fine for slowing down abuse.
export function rateLimit({ windowMs = 60_000, max, key = (req) => clientIp(req), message = 'Слишком много запросов, попробуйте через минуту' }) {
  const hits = new Map();
  setInterval(() => {
    const now = Date.now();
    for (const [k, v] of hits) if (v.reset < now) hits.delete(k);
  }, windowMs).unref();
  return (req, res, next) => {
    const k = key(req);
    const now = Date.now();
    let h = hits.get(k);
    if (!h || h.reset < now) hits.set(k, h = { n: 0, reset: now + windowMs });
    if (++h.n > max) {
      res.set('Retry-After', String(Math.ceil((h.reset - now) / 1000)));
      return res.status(429).json({ error: message });
    }
    next();
  };
}

export const clientIp = (req) => String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();

// Headers that cost nothing: no MIME sniffing, HTTPS only, no full URLs leaking to other sites.
// No frame restrictions: Telegram Web shows the Mini App inside a frame.
export function securityHeaders(req, res, next) {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Strict-Transport-Security': 'max-age=31536000',
  });
  next();
}

// Our own errors are written in Russian for the user; anything else is an internal detail and is replaced.
export const userMessage = (e, fallback) => (/[а-яё]/i.test(e?.message || '') ? e.message : fallback);
