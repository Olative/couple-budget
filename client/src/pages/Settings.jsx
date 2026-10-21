import { useState, useEffect } from 'react';
import { api } from '../api/client';

export default function Settings({ budget, user }) {
  const [budgetData, setBudgetData] = useState(null);

  useEffect(() => {
    api.getBudget(budget.id).then(setBudgetData);
  }, [budget.id]);

  const copyInviteCode = () => {
    const code = budget.invite_code;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(code);
    }
    const tg = window.Telegram?.WebApp;
    if (tg) {
      tg.showAlert(`Код скопирован: ${code}`);
    } else {
      alert(`Код скопирован: ${code}`);
    }
  };

  const shareInvite = () => {
    const tg = window.Telegram?.WebApp;
    if (tg?.openTelegramLink) {
      const text = `Присоединяйся к нашему парному бюджету! Код: ${budget.invite_code}`;
      tg.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(text)}`);
    }
  };

  return (
    <div className="page">
      <h1 className="page-title">Настройки</h1>

      <div className="card">
        <div className="card-title">Бюджет</div>
        <div className="stat-row">
          <span className="stat-label">Название</span>
          <span>{budget.name}</span>
        </div>
        <div className="stat-row">
          <span className="stat-label">Валюта</span>
          <span>{budget.currency}</span>
        </div>
      </div>

      <div className="card">
        <div className="card-title">Участники</div>
        {budgetData?.members?.map(m => (
          <div key={m.id} className="stat-row">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div className="member-avatar">
                {m.first_name[0]}
              </div>
              <span>{m.first_name}{m.last_name ? ` ${m.last_name}` : ''}</span>
            </div>
            <span className="stat-label">{m.role === 'owner' ? 'создатель' : 'участник'}</span>
          </div>
        ))}

        {budgetData?.members?.length < 2 && (
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 13, color: 'var(--tg-theme-hint-color)', marginBottom: 8 }}>
              Пригласите партнёра по коду:
            </div>
            <div className="invite-code">{budget.invite_code}</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-secondary" onClick={copyInviteCode} style={{ flex: 1 }}>
                Скопировать
              </button>
              <button className="btn" onClick={shareInvite} style={{ flex: 1 }}>
                Отправить
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="card">
        <div className="card-title">О вас</div>
        <div className="stat-row">
          <span className="stat-label">Имя</span>
          <span>{user.first_name}</span>
        </div>
        {user.username && (
          <div className="stat-row">
            <span className="stat-label">Username</span>
            <span>@{user.username}</span>
          </div>
        )}
      </div>
    </div>
  );
}
