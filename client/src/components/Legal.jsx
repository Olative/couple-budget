import { t, getLang } from '../i18n';

// Links to the privacy policy and terms; inside Telegram they open in the browser so the app stays put.
export function openDoc(kind) {
  const url = `${window.location.origin}/${kind}${getLang() === 'en' ? '?lang=en' : ''}`;
  const tg = window.Telegram?.WebApp;
  if (tg?.openLink && tg.platform !== 'unknown') tg.openLink(url);
  else window.open(url, '_blank');
}

const link = (kind, text) => (
  <a href={`/${kind}${getLang() === 'en' ? '?lang=en' : ''}`} onClick={(e) => { e.preventDefault(); openDoc(kind); }} style={{ color: 'inherit', textDecoration: 'underline' }}>{text}</a>
);

// Shown before the first use: what we keep, why, and that it can all be deleted.
export function Consent({ style }) {
  return (
    <div className="row-sub" style={{ textAlign: 'center', fontSize: 12, lineHeight: 1.45, padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 6, ...style }}>
      <div>
        {t('Продолжая, вы принимаете')} {link('terms', t('условия использования'))} {t('и')} {link('privacy', t('политику конфиденциальности'))}
      </div>
      <div style={{ fontSize: 11 }}>
        {t('🔒 Мы храним ваше имя из Telegram и записи, которые вы вносите, — чтобы показывать их вам и второму участнику, считать остаток и вовремя напоминать о лимитах. Данные не продаём и рекламу не показываем. Удалить всё и отозвать согласие можно в любой момент в настройках.')}
      </div>
    </div>
  );
}
