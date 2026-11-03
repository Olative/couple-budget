import { useState, useEffect } from 'react';
import { IconCheck, IconPlus } from '@tabler/icons-react';
import { api } from '../api/client';
import Sheet from './Sheet';
import CurrencyPicker from './CurrencyPicker';

// Switch between budgets (home, a trip, with mom) or start a new one.
export default function BudgetSheet({ current, onPick, onClose }) {
  const [budgets, setBudgets] = useState(null);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [currency, setCurrency] = useState(current.currency);
  const [saving, setSaving] = useState(false);

  useEffect(() => { api.getMyBudgets().then(setBudgets); }, []);

  const pick = async (b) => {
    if (b.id !== current.id) {
      await api.setActiveBudget(b.id);
      onPick(b);
    }
    onClose();
  };

  const create = async () => {
    setSaving(true);
    const b = await api.createBudget({ name: name || 'Новый бюджет', currency });
    onPick(b, true);
    onClose();
  };

  if (creating) {
    return (
      <Sheet title="Новый бюджет" onClose={onClose}>
        <div className="input-group">
          <label className="input-label">Название</label>
          <input className="input" placeholder="Поездка в Грузию" value={name} onChange={e => setName(e.target.value)} autoFocus />
        </div>
        <CurrencyPicker value={currency} onChange={setCurrency} label="Валюта" />
        <div className="row-sub" style={{ margin: '0 4px' }}>У каждого бюджета свои траты, лимиты, копилка и второй участник</div>
        <div className="sheet-actions">
          <button className="btn btn-secondary" onClick={() => setCreating(false)}>Назад</button>
          <button className="btn" disabled={saving} onClick={create}>{saving ? 'Создаём…' : 'Создать'}</button>
        </div>
      </Sheet>
    );
  }

  return (
    <Sheet title="Бюджеты" onClose={onClose}>
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
        <IconPlus size={16} stroke={1.6} /> Ещё один бюджет
      </button>
      <div className="row-sub" style={{ margin: '10px 4px 0', textAlign: 'center' }}>
        Траты из чата с ботом попадают в выбранный бюджет
      </div>
    </Sheet>
  );
}
