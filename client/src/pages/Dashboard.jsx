import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';

const MONTHS_RU = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
];

function formatMoney(amount, currency = '₽') {
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(amount) + ' ' + currency;
}

export default function Dashboard({ budget, user }) {
  const [summary, setSummary] = useState(null);
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));

  const load = useCallback(() => {
    api.getSummary(budget.id, month).then(setSummary);
  }, [budget.id, month]);

  useEffect(() => { load(); }, [load]);

  const changeMonth = (delta) => {
    const [y, m] = month.split('-').map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    setMonth(d.toISOString().slice(0, 7));
  };

  const monthLabel = () => {
    const [y, m] = month.split('-').map(Number);
    return `${MONTHS_RU[m - 1]} ${y}`;
  };

  if (!summary) return <div className="page"><div className="empty-state">Загрузка...</div></div>;

  const remaining = summary.totalPlanned - summary.totalSpent;

  return (
    <div className="page">
      <div className="month-nav">
        <button className="month-btn" onClick={() => changeMonth(-1)}>‹</button>
        <span className="month-label">{monthLabel()}</span>
        <button className="month-btn" onClick={() => changeMonth(1)}>›</button>
      </div>

      <div className="card" style={{ textAlign: 'center' }}>
        <div className="stat-label">Потрачено</div>
        <div className="stat-big">{formatMoney(summary.totalSpent, budget.currency)}</div>
        {summary.totalPlanned > 0 && (
          <>
            <div style={{ fontSize: 13, color: 'var(--tg-theme-hint-color)', marginTop: 4 }}>
              из {formatMoney(summary.totalPlanned, budget.currency)} запланировано
            </div>
            <div className="progress-bar" style={{ marginTop: 12 }}>
              <div
                className="progress-fill"
                style={{
                  width: `${Math.min(100, (summary.totalSpent / summary.totalPlanned) * 100)}%`,
                  background: summary.totalSpent > summary.totalPlanned ? '#ef4444' : 'var(--tg-theme-button-color)',
                }}
              />
            </div>
            <div style={{
              fontSize: 14,
              fontWeight: 600,
              marginTop: 8,
              color: remaining < 0 ? '#ef4444' : '#22c55e',
            }}>
              {remaining >= 0 ? `Осталось ${formatMoney(remaining, budget.currency)}` : `Перерасход ${formatMoney(-remaining, budget.currency)}`}
            </div>
          </>
        )}
      </div>

      {summary.byMember.length > 1 && (
        <div className="card">
          <div className="card-title">Кто сколько потратил</div>
          {summary.byMember.map(m => (
            <div key={m.id} className="stat-row">
              <span>{m.first_name}</span>
              <span className="stat-value">{formatMoney(m.spent, budget.currency)}</span>
            </div>
          ))}
        </div>
      )}

      <div className="card">
        <div className="card-title">По категориям</div>
        {summary.byCategory.filter(c => c.spent > 0).map(cat => (
          <div key={cat.id} className="category-item">
            <div className="category-icon" style={{ background: cat.color + '20', color: cat.color }}>
              {cat.icon}
            </div>
            <div className="category-info">
              <div className="category-name">{cat.name}</div>
              <div className="category-amounts">
                <span className="category-spent">{formatMoney(cat.spent, budget.currency)}</span>
                {cat.planned_amount > 0 && (
                  <span>из {formatMoney(cat.planned_amount, budget.currency)}</span>
                )}
              </div>
              {cat.planned_amount > 0 && (
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{
                      width: `${Math.min(100, (cat.spent / cat.planned_amount) * 100)}%`,
                      background: cat.spent > cat.planned_amount ? '#ef4444' : cat.color,
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        ))}
        {summary.byCategory.every(c => c.spent === 0) && (
          <div className="empty-state" style={{ padding: '20px 0' }}>
            <div className="empty-text">Расходов пока нет</div>
          </div>
        )}
      </div>
    </div>
  );
}
