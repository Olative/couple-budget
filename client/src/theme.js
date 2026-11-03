// Light or dark: follows Telegram's theme unless the user picked one in settings.
const KEY = 'theme';

export function getThemePref() {
  try {
    return localStorage.getItem(KEY) || 'auto';
  } catch {
    return 'auto';
  }
}

function isDark(pref) {
  if (pref !== 'auto') return pref === 'dark';
  const tg = window.Telegram?.WebApp;
  if (tg?.colorScheme) return tg.colorScheme === 'dark';
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches;
}

export function themeBg() {
  return document.documentElement.dataset.theme === 'dark' ? '#0e0e0e' : '#ececec';
}

// Telegram's own header and background around the app.
export function paintTelegram() {
  const tg = window.Telegram?.WebApp;
  tg?.setHeaderColor?.(themeBg());
  tg?.setBackgroundColor?.(themeBg());
}

export function applyTheme(pref = getThemePref()) {
  document.documentElement.dataset.theme = isDark(pref) ? 'dark' : 'light';
  if (!document.getElementById('splash')) paintTelegram();
}

export function setThemePref(pref) {
  try {
    localStorage.setItem(KEY, pref);
  } catch { /* private mode: the choice lasts until reload */ }
  applyTheme(pref);
}

export function watchTheme() {
  applyTheme();
  window.Telegram?.WebApp?.onEvent?.('themeChanged', () => applyTheme());
  window.matchMedia?.('(prefers-color-scheme: dark)').addEventListener?.('change', () => applyTheme());
}
