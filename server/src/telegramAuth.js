import crypto from 'crypto';

// Telegram signs the Mini App launch data (initData) with the bot token. Checking that signature on every
// request proves the request comes from this Telegram user; a bare user id in a header could be forged.
const MAX_AGE_SEC = 24 * 3600;
const verified = new Map();

export function telegramUserFromInitData(initData, botToken) {
  if (!initData || !botToken) return null;
  const key = `${botToken.slice(0, 12)}|${initData}`;
  const hit = verified.get(key);
  if (hit && hit.until > Date.now()) return hit.user;
  try {
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    if (!hash) return null;
    params.delete('hash');
    const check = [...params.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}=${v}`).join('\n');
    const secret = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
    const computed = crypto.createHmac('sha256', secret).update(check).digest('hex');
    if (computed.length !== hash.length || !crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(hash))) return null;
    if (Date.now() / 1000 - Number(params.get('auth_date') || 0) > MAX_AGE_SEC) return null;
    const user = JSON.parse(params.get('user') || 'null');
    if (!user?.id) return null;
    if (verified.size > 5000) verified.clear();
    verified.set(key, { user, until: (Number(params.get('auth_date')) + MAX_AGE_SEC) * 1000 });
    return user;
  } catch {
    return null;
  }
}

// Local development only, switched on explicitly: the plain user id header is trusted.
// A missing BOT_TOKEN in production must not quietly open the API, so it never enables this by itself.
export const devMode = () => process.env.DEV_AUTH === '1' && !process.env.BOT_TOKEN && process.env.NODE_ENV !== 'production';
