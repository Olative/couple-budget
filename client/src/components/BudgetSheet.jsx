import { useState, useEffect } from 'react';
import { IconCheck, IconPlus } from '@tabler/icons-react';
import { api } from '../api/client';
import Sheet from './Sheet';
import CurrencyPicker from './CurrencyPicker';
import { t } from '../i18n';

// The list is fetched when the app starts, so the sheet opens already filled.
let cached = null;
export const prefetchBudgets = () => api.getMyBudgets().then(b => { cached = b; return b; }).catch(() => {});

// Switch between budgets (home, a trip, with mom) or start a new one.
export default function BudgetSheet({ current, onPick, onClose }) {
  const [budgets, setBudgets] = useState(cached || [current]);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [currency, setCurrency] = useState(current.currency);
  const [saving, setSaving] = useState(false);

  useEffect(() => { prefetchBudgets().then(b => b && setBudgets(b)); }, []);

  const pick = async (b) => {
    if (b.id !== current.id) {
      await api.setActiveBudget(b.id);
      onPick(b);
    }
    onClose();
  };

  const create = async () => {
    setSaving(true);
    const b = await api.createBudget({ name: name || t('Новый бюджет'), currency });
    cached = null;
    onPick(b);
    onClose();
  };

  if (creating) {
    return (
      <Sheet title={t('Новый бюджет')} onClose={onClose}>
        <div className="input-group">
          <label className="input-label">{t('Название')}</label>
          <input className="input" placeholder={t('Поездка в Грузию')} value={name} onChange={e => setName(e.target.value)} autoFocus />
        </div>
        <CurrencyPicker value={currency} onChange={setCurrency} label={t('Валюта')} />
        <div className="row-sub" style={{ margin: '0 4px' }}>{t('У каждого бюджета свои траты, лимиты, копилка и второй участник')}</div>
        <div className="sheet-actions">
          <button className="btn btn-secondary" onClick={() => setCreating(false)}>{t('Назад')}</button>
          <button className="btn" disabled={saving} onClick={create}>{saving ? t('Создаём…') : t('Создать')}</button>
        </div>
      </Sheet>
    );
  }

  return (
    <Sheet title={t('Бюджеты')} onClose={onClose}>
      <div className="card">
        {budgets?.map(b => (
          <button key={b.id} className="row row-btn" onClick={() => pick(b)}>
            <span className="row-ic" style={{ fontSize: 13 }}>{b.currency}</span>
            <div className="row-main">
              <div className="row-name">{b.name}</div>
              <div className="row-sub">{b.people}</div>
            </div>
            {b.id === current.id && <IconCheck size={18} stroke={1.8} />}
          </button>
        ))}
      </div>
      <button className="btn btn-secondary" style={{ marginTop: 10 }} onClick={() => setCreating(true)}>
        <IconPlus size={16} stroke={1.6} /> {t('Ещё один бюджет')}
      </button>
      <div className="row-sub" style={{ margin: '10px 4px 0', textAlign: 'center' }}>
        {t('Траты из чата с ботом попадают в выбранный бюджет')}
      </div>
    </Sheet>
  );
}
