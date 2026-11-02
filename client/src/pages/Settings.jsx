import { useState, useEffect } from 'react';
import { IconChevronLeft } from '@tabler/icons-react';
import { api } from '../api/client';
import CurrencyPicker from '../components/CurrencyPicker';

export default function Settings({ budget, user, onBack, onBudgetUpdate }) {
  const [budgetData, setBudgetData] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    api.getBudget(budget.id).then(setBudgetData);
  }, [budget.id]);

  const changeCurrency = async (c) => {
    const updated = await api.updateBudget(budget.id, { currency: c });
    onBudgetUpdate(updated);
  };

  const copyInviteCode = async () => {
    try {
      await navigator.clipboard.writeText(budget.invite_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      window.Telegram?.WebApp?.showAlert?.(`Код: ${budget.invite_code}`);
    }
  };

  const shareInvite = () => {
    const text = `Присоединяйся к нашему бюджету в Lolo & Pepe! Код: ${budget.invite_code}`;
    window.Telegram?.WebApp?.openTelegramLink?.(`https://t.me/share/url?url=${encodeURIComponent(text)}`);
  };

  return (
    <div className="page">
      <div className="page-head" style={{ justifyContent: 'flex-start' }}>
        <button className="icon-btn" onClick={onBack} aria-label="Назад"><IconChevronLeft size={18} /></button>
        <div className="h-title">Настройки</div>
      </div>

      <div className="section-label">Бюджет</div>
      <div className="card">
        <div className="row">
          <div className="row-main"><div className="row-name">Название</div></div>
          <span style={{ fontSize: 14 }}>{budget.name}</span>
        </div>
      </div>
      <CurrencyPicker value={budget.currency} onChange={changeCurrency} label="Валюта" />

      <div className="section-label">Участники</div>
      <div className="card">
        {budgetData?.members?.map(m => (
          <div key={m.id} className="row">
            <span className="row-ic" style={{ fontSize: 14 }}>{m.first_name[0]}</span>
            <div className="row-main">
              <div className="row-name">{m.first_name}{m.last_name ? ` ${m.last_name}` : ''}{m.id === user.id ? ' (вы)' : ''}</div>
            </div>
            <span className="row-sub">{m.role === 'owner' ? 'создатель' : 'участник'}</span>
          </div>
        ))}
      </div>

      {budgetData?.members?.length < 2 && (
        <div className="card-pad">
          <div style={{ fontSize: 13, color: 'var(--muted)' }}>Пригласите партнёра по коду:</div>
          <div className="invite-code">{budget.invite_code}</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-secondary" style={{ background: 'var(--surface-2)' }} onClick={copyInviteCode}>{copied ? 'Скопировано' : 'Скопировать'}</button>
            <button className="btn" onClick={shareInvite}>Отправить</button>
          </div>
        </div>
      )}
    </div>
  );
}
