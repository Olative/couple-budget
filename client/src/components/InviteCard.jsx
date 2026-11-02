import { useState, useEffect } from 'react';
import { api } from '../api/client';
import { Penguin } from './Art';

const SHARE_TEXT = 'Давай вести общий бюджет в Lolo & Pepe 🐧';

export default function InviteCard({ budget }) {
  const [data, setData] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => { api.getBudget(budget.id).then(setData); }, [budget.id]);

  if (!data || data.members.length >= 2 || !data.invite_link) return null;
  const link = data.invite_link;

  const share = () => {
    const tg = window.Telegram?.WebApp;
    const url = `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(SHARE_TEXT)}`;
    if (tg?.openTelegramLink && tg.platform !== 'unknown') tg.openTelegramLink(url);
    else window.open(url, '_blank');
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      window.Telegram?.WebApp?.showAlert?.(link);
    }
  };

  return (
    <div className="stamp-wrap">
      <div className="stamp" style={{ padding: '18px 18px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <Penguin height={46} />
            <div style={{ width: 30, height: 40, marginLeft: -6, borderRadius: '50% 50% 40% 40%', border: '1.5px dashed #c4c4c4' }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15 }}>Пригласите партнёра</div>
            <div className="row-sub" style={{ fontSize: 12, marginTop: 2 }}>Отправьте ссылку — и бюджет станет общим</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          <button className="btn" onClick={share}>Отправить ссылку</button>
          <button className="btn btn-secondary" style={{ background: 'var(--surface-2)', flex: '0 0 auto', width: 'auto', padding: '15px 18px' }} onClick={copy}>
            {copied ? 'Готово' : 'Копировать'}
          </button>
        </div>
      </div>
    </div>
  );
}
