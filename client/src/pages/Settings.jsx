import { useState, useEffect } from 'react';
import { IconChevronLeft } from '@tabler/icons-react';
import { api } from '../api/client';
import CurrencyPicker from '../components/CurrencyPicker';
import InviteCard from '../components/InviteCard';

export default function Settings({ budget, user, onBack, onBudgetUpdate }) {
  const [budgetData, setBudgetData] = useState(null);

  useEffect(() => {
    api.getBudget(budget.id).then(setBudgetData);
  }, [budget.id]);

  const changeCurrency = async (c) => {
    const updated = await api.updateBudget(budget.id, { currency: c });
    onBudgetUpdate(updated);
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

      <InviteCard budget={budget} />
    </div>
  );
}
