import { useState, useEffect } from 'react';
import { api } from '../api/client';
import Sheet from './Sheet';

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function AddExpenseSheet({ budget, onClose, onSaved }) {
  const [categories, setCategories] = useState([]);
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState(null);
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(today);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getBudget(budget.id).then(b => {
      setCategories(b.categories);
      if (b.categories.length) setCategoryId(b.categories[0].id);
    });
  }, [budget.id]);

  const save = async () => {
    if (!amount || Number(amount) <= 0 || !categoryId) return;
    setSaving(true);
    setError('');
    try {
      await api.addExpense(budget.id, { category_id: categoryId, amount: Number(amount), description: description || null, date });
      onSaved();
    } catch (e) {
      setError(e.message);
      setSaving(false);
    }
  };

  return (
    <Sheet title="Новый расход" onClose={onClose}>
      <div className="card-pad" style={{ marginBottom: 10 }}>
        <input
          className="amount-input"
          type="number"
          inputMode="decimal"
          placeholder={`0 ${budget.currency}`}
          value={amount}
          onChange={e => setAmount(e.target.value)}
          autoFocus
        />
      </div>

      <div className="cat-grid" style={{ marginBottom: 10 }}>
        {categories.map(c => (
          <button key={c.id} className={`cat-btn ${categoryId === c.id ? 'on' : ''}`} onClick={() => setCategoryId(c.id)}>
            <span className="e">{c.icon}</span>
            <span>{c.name}</span>
          </button>
        ))}
      </div>

      <div className="input-group">
        <input className="input" placeholder="Комментарий" value={description} onChange={e => setDescription(e.target.value)} />
      </div>
      <div className="input-group">
        <input className="input" type="date" value={date} onChange={e => setDate(e.target.value)} />
      </div>

      {error && <div className="warn" style={{ fontSize: 13, margin: '0 4px' }}>{error}</div>}

      <div className="sheet-actions">
        <button className="btn btn-secondary" onClick={onClose}>Отмена</button>
        <button className="btn" onClick={save} disabled={saving || !amount || Number(amount) <= 0}>
          {saving ? 'Сохраняем…' : 'Сохранить'}
        </button>
      </div>
    </Sheet>
  );
}
