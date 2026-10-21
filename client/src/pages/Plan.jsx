import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';

function formatMoney(amount, currency = '₽') {
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(amount) + ' ' + currency;
}

export default function Plan({ budget }) {
  const [categories, setCategories] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editAmount, setEditAmount] = useState('');

  const load = useCallback(() => {
    api.getBudget(budget.id).then(b => setCategories(b.categories));
  }, [budget.id]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (catId) => {
    await api.updateCategory(catId, { planned_amount: Number(editAmount) || 0 });
    setEditingId(null);
    setEditAmount('');
    load();
  };

  const totalPlanned = categories.reduce((s, c) => s + (c.planned_amount || 0), 0);

  return (
    <div className="page">
      <h1 className="page-title">Планирование</h1>

      <div className="card" style={{ textAlign: 'center' }}>
        <div className="stat-label">Общий план на месяц</div>
        <div className="stat-big">{formatMoney(totalPlanned, budget.currency)}</div>
      </div>

      <div className="card">
        <div className="card-title">Лимиты по категориям</div>
        <div style={{ fontSize: 13, color: 'var(--tg-theme-hint-color)', marginBottom: 12 }}>
          Нажмите на категорию, чтобы задать лимит
        </div>

        {categories.map(cat => (
          <div key={cat.id} className="category-item" style={{ cursor: 'pointer' }}
            onClick={() => {
              if (editingId !== cat.id) {
                setEditingId(cat.id);
                setEditAmount(String(cat.planned_amount || ''));
              }
            }}
          >
            <div className="category-icon" style={{ background: cat.color + '20' }}>
              {cat.icon}
            </div>
            <div className="category-info" style={{ flex: 1 }}>
              <div className="category-name">{cat.name}</div>
              {editingId === cat.id ? (
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }} onClick={e => e.stopPropagation()}>
                  <input
                    className="input"
                    type="number"
                    inputMode="numeric"
                    placeholder="0"
                    value={editAmount}
                    onChange={e => setEditAmount(e.target.value)}
                    autoFocus
                    style={{ flex: 1 }}
                    onKeyDown={e => e.key === 'Enter' && handleSave(cat.id)}
                  />
                  <button className="btn" style={{ width: 'auto', padding: '8px 16px' }} onClick={() => handleSave(cat.id)}>
                    ✓
                  </button>
                </div>
              ) : (
                <div style={{ fontSize: 14, color: cat.planned_amount > 0 ? 'var(--tg-theme-text-color)' : 'var(--tg-theme-hint-color)', marginTop: 2 }}>
                  {cat.planned_amount > 0 ? formatMoney(cat.planned_amount, budget.currency) : 'Не задан'}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
