import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';

function formatMoney(amount, currency = '₽') {
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(amount) + ' ' + currency;
}

export default function Savings({ budget, user }) {
  const [goals, setGoals] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [showContribute, setShowContribute] = useState(null);
  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [icon, setIcon] = useState('🎯');
  const [deadline, setDeadline] = useState('');
  const [contributeAmount, setContributeAmount] = useState('');
  const [loading, setLoading] = useState(false);

  const ICONS = ['🎯', '🏠', '✈️', '🚗', '💍', '📱', '🎓', '🏖️', '👶', '💎'];

  const load = useCallback(() => {
    api.getSavings(budget.id).then(setGoals);
  }, [budget.id]);

  useEffect(() => { load(); }, [load]);

  const handleAddGoal = async () => {
    if (!name || !target) return;
    setLoading(true);
    await api.addSavingsGoal(budget.id, {
      name,
      target_amount: Number(target),
      icon,
      deadline: deadline || null,
    });
    setName('');
    setTarget('');
    setIcon('🎯');
    setDeadline('');
    setShowAdd(false);
    setLoading(false);
    load();
  };

  const handleContribute = async (goalId) => {
    if (!contributeAmount || Number(contributeAmount) <= 0) return;
    setLoading(true);
    await api.contributeSavings(goalId, Number(contributeAmount));
    setContributeAmount('');
    setShowContribute(null);
    setLoading(false);
    load();
  };

  const handleDelete = async (id) => {
    if (!confirm('Удалить цель?')) return;
    await api.deleteSavingsGoal(id);
    load();
  };

  return (
    <div className="page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1 className="page-title" style={{ marginBottom: 0 }}>Накопления</h1>
        <button className="btn" style={{ width: 'auto', padding: '10px 20px' }} onClick={() => setShowAdd(true)}>
          + Цель
        </button>
      </div>

      {goals.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🎯</div>
          <div className="empty-text">Целей пока нет</div>
          <button className="btn" style={{ maxWidth: 200, margin: '0 auto' }} onClick={() => setShowAdd(true)}>
            Создать первую
          </button>
        </div>
      ) : (
        goals.map(goal => {
          const percent = goal.target_amount > 0 ? (goal.current_amount / goal.target_amount) * 100 : 0;
          return (
            <div key={goal.id} className="savings-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div className="savings-icon">{goal.icon}</div>
                  <div className="savings-name">{goal.name}</div>
                </div>
                <button
                  style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: 'var(--tg-theme-hint-color)' }}
                  onClick={() => handleDelete(goal.id)}
                >
                  ✕
                </button>
              </div>
              <div className="savings-amounts">
                <span className="savings-current">{formatMoney(goal.current_amount, budget.currency)}</span>
                <span>из {formatMoney(goal.target_amount, budget.currency)}</span>
              </div>
              <div className="progress-bar" style={{ marginTop: 8 }}>
                <div
                  className="progress-fill"
                  style={{
                    width: `${Math.min(100, percent)}%`,
                    background: percent >= 100 ? '#22c55e' : 'var(--tg-theme-button-color)',
                  }}
                />
              </div>
              <div style={{ fontSize: 13, color: 'var(--tg-theme-hint-color)', marginTop: 4 }}>
                {Math.round(percent)}%
                {goal.deadline && ` · до ${new Date(goal.deadline).toLocaleDateString('ru-RU')}`}
              </div>
              <button
                className="btn"
                style={{ marginTop: 12 }}
                onClick={() => {
                  setShowContribute(goal.id);
                  setContributeAmount('');
                }}
              >
                Пополнить
              </button>
            </div>
          );
        })
      )}

      {showAdd && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowAdd(false)}>
          <div className="modal">
            <div className="modal-title">Новая цель</div>

            <div className="input-group">
              <label className="input-label">Иконка</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {ICONS.map(i => (
                  <button
                    key={i}
                    style={{
                      fontSize: 24, padding: 8, border: '2px solid',
                      borderColor: icon === i ? 'var(--tg-theme-button-color)' : 'transparent',
                      borderRadius: 8, background: icon === i ? 'var(--tg-theme-button-color)20' : 'var(--tg-theme-secondary-bg-color)',
                      cursor: 'pointer',
                    }}
                    onClick={() => setIcon(i)}
                  >
                    {i}
                  </button>
                ))}
              </div>
            </div>

            <div className="input-group">
              <label className="input-label">Название</label>
              <input className="input" placeholder="На что копим?" value={name} onChange={e => setName(e.target.value)} />
            </div>

            <div className="input-group">
              <label className="input-label">Сумма цели</label>
              <input className="input" type="number" inputMode="numeric" placeholder="0" value={target} onChange={e => setTarget(e.target.value)} />
            </div>

            <div className="input-group">
              <label className="input-label">Дедлайн (необязательно)</label>
              <input className="input" type="date" value={deadline} onChange={e => setDeadline(e.target.value)} />
            </div>

            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowAdd(false)}>Отмена</button>
              <button className="btn" onClick={handleAddGoal} disabled={loading || !name || !target}>
                {loading ? 'Создаём...' : 'Создать'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showContribute && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowContribute(null)}>
          <div className="modal">
            <div className="modal-title">Пополнение</div>
            <div className="input-group">
              <label className="input-label">Сумма</label>
              <input
                className="input"
                type="number"
                inputMode="decimal"
                placeholder="0"
                value={contributeAmount}
                onChange={e => setContributeAmount(e.target.value)}
                autoFocus
                style={{ fontSize: 24, fontWeight: 700, textAlign: 'center' }}
              />
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowContribute(null)}>Отмена</button>
              <button className="btn" onClick={() => handleContribute(showContribute)} disabled={loading || !contributeAmount}>
                {loading ? 'Сохраняем...' : 'Пополнить'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
