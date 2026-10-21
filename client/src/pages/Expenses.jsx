import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';

function formatMoney(amount, currency = '₽') {
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(amount) + ' ' + currency;
}

export default function Expenses({ budget, user }) {
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);

  const load = useCallback(() => {
    api.getExpenses(budget.id).then(setExpenses);
    api.getBudget(budget.id).then(b => {
      setCategories(b.categories);
      if (b.categories.length > 0 && !categoryId) {
        setCategoryId(String(b.categories[0].id));
      }
    });
  }, [budget.id]);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async () => {
    if (!amount || !categoryId) return;
    setLoading(true);
    try {
      await api.addExpense(budget.id, {
        category_id: Number(categoryId),
        amount: Number(amount),
        description: description || null,
        date,
      });
      setAmount('');
      setDescription('');
      setDate(new Date().toISOString().slice(0, 10));
      setShowAdd(false);
      load();
    } catch (e) {
      alert(e.message);
    }
    setLoading(false);
  };

  const handleDelete = async (id) => {
    if (!confirm('Удалить расход?')) return;
    await api.deleteExpense(id);
    load();
  };

  const groupByDate = (items) => {
    const groups = {};
    items.forEach(e => {
      if (!groups[e.date]) groups[e.date] = [];
      groups[e.date].push(e);
    });
    return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a));
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diff = (today - d) / 86400000;
    if (diff === 0) return 'Сегодня';
    if (diff === 1) return 'Вчера';
    return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
  };

  return (
    <div className="page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1 className="page-title" style={{ marginBottom: 0 }}>Расходы</h1>
        <button className="btn" style={{ width: 'auto', padding: '10px 20px' }} onClick={() => setShowAdd(true)}>
          + Добавить
        </button>
      </div>

      {expenses.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">💸</div>
          <div className="empty-text">Расходов пока нет</div>
          <button className="btn" style={{ maxWidth: 200, margin: '0 auto' }} onClick={() => setShowAdd(true)}>
            Добавить первый
          </button>
        </div>
      ) : (
        groupByDate(expenses).map(([date, items]) => (
          <div key={date}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--tg-theme-hint-color)', padding: '12px 0 4px' }}>
              {formatDate(date)}
            </div>
            {items.map(e => (
              <div key={e.id} className="expense-item" onClick={() => e.user_id === user.id && handleDelete(e.id)}>
                <div className="category-icon" style={{ background: e.category_color + '20', width: 36, height: 36, fontSize: 18 }}>
                  {e.category_icon}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 500 }}>{e.category_name}</span>
                    <span className="expense-amount">{formatMoney(e.amount, budget.currency)}</span>
                  </div>
                  <div className="expense-desc">
                    {e.description && <span>{e.description} · </span>}
                    <span>{e.user_name}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ))
      )}

      {showAdd && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowAdd(false)}>
          <div className="modal">
            <div className="modal-title">Новый расход</div>

            <div className="input-group">
              <label className="input-label">Сумма</label>
              <input
                className="input"
                type="number"
                inputMode="decimal"
                placeholder="0"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                autoFocus
                style={{ fontSize: 24, fontWeight: 700, textAlign: 'center' }}
              />
            </div>

            <div className="input-group">
              <label className="input-label">Категория</label>
              <select className="select" value={categoryId} onChange={e => setCategoryId(e.target.value)}>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                ))}
              </select>
            </div>

            <div className="input-group">
              <label className="input-label">Описание</label>
              <input
                className="input"
                placeholder="Комментарий (необязательно)"
                value={description}
                onChange={e => setDescription(e.target.value)}
              />
            </div>

            <div className="input-group">
              <label className="input-label">Дата</label>
              <input
                className="input"
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
              />
            </div>

            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowAdd(false)}>
                Отмена
              </button>
              <button
                className="btn"
                onClick={handleAdd}
                disabled={loading || !amount || Number(amount) <= 0}
              >
                {loading ? 'Сохраняем...' : 'Сохранить'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
