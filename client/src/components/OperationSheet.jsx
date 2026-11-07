import { useState, useEffect } from 'react';
import { api } from '../api/client';
import Sheet from './Sheet';
import { money, confirmAction, INCOME_SOURCES } from '../format';

// Editing your own income or personal expense: amount, source/category, note, date — and delete.
export default function OperationSheet({ budget, item, onClose, onChanged }) {
  const income = item.kind === 'income';
  const [amount, setAmount] = useState(String(item.amount));
  const [source, setSource] = useState(item.source || 'other');
  const [categoryId, setCategoryId] = useState(item.category_id || null);
  const [categories, setCategories] = useState([]);
  const [description, setDescription] = useState(item.description || '');
  const [date, setDate] = useState(item.date);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!income) api.getBudget(budget.id).then(b => setCategories(b.categories));
  }, [budget.id, income]);

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      const data = { amount: Number(amount), description, date };
      if (income) await api.updateIncome(item.id, { ...data, source });
      else await api.updatePersonal(item.id, { ...data, category_id: categoryId });
      onChanged();
      onClose();
    } catch (e) {
      setError(e.message);
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!(await confirmAction(`Удалить «${item.description || item.category_name}» на ${money(item.amount, budget.currency)}?`))) return;
    if (income) await api.deleteIncome(item.id);
    else await api.deletePersonal(item.id);
    onChanged();
    onClose();
  };

  return (
    <Sheet title={income ? 'Доход' : 'Личная трата'} onClose={onClose}>
      <div className="card-pad" style={{ marginBottom: 10 }}>
        <input className="amount-input" style={income ? { color: 'var(--ok)' } : undefined} type="number" inputMode="decimal"
          value={amount} onChange={e => setAmount(e.target.value)} />
      </div>
      <div className="cat-grid" style={{ marginBottom: 10 }}>
        {income
          ? INCOME_SOURCES.map(s => (
            <button key={s.id} className={`cat-btn ${source === s.id ? 'on' : ''}`} onClick={() => setSource(s.id)}>
              <span className="e">{s.icon}</span><span>{s.name}</span>
            </button>
          ))
          : categories.map(c => (
            <button key={c.id} className={`cat-btn ${categoryId === c.id ? 'on' : ''}`} onClick={() => setCategoryId(c.id)}>
              <span className="e">{c.icon}</span><span>{c.name}</span>
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
        <button className="btn" onClick={save} disabled={saving || !(Number(amount) > 0)}>{saving ? 'Сохраняем…' : 'Сохранить'}</button>
      </div>
      <button className="btn btn-danger" style={{ marginTop: 6 }} onClick={remove}>Удалить</button>
    </Sheet>
  );
}
