import { useState } from 'react';
import { api } from '../api/client';
import Sheet from './Sheet';
import { money, confirmAction, INCOME_SOURCES } from '../format';
import { t } from '../i18n';

// Editing your own income: amount, source, note, date — and delete. (Expenses, personal ones included, use ExpenseSheet.)
export default function OperationSheet({ budget, item, onClose, onChanged }) {
  const [amount, setAmount] = useState(String(item.amount));
  const [source, setSource] = useState(item.source || 'other');
  const [description, setDescription] = useState(item.description || '');
  const [date, setDate] = useState(item.date);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      await api.updateIncome(item.id, { amount: Number(amount), description, date, source });
      onChanged();
      onClose();
    } catch (e) {
      setError(e.message);
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!(await confirmAction(t('Удалить «{name}» на {sum}?', { name: item.description || t(item.category_name), sum: money(item.amount, budget.currency) })))) return;
    await api.deleteIncome(item.id);
    onChanged();
    onClose();
  };

  return (
    <Sheet title={t('Доход')} onClose={onClose}>
      <div className="card-pad" style={{ marginBottom: 10 }}>
        <input className="amount-input" style={{ color: 'var(--ok)' }} type="number" inputMode="decimal"
          value={amount} onChange={e => setAmount(e.target.value)} />
      </div>
      <div className="cat-grid" style={{ marginBottom: 10 }}>
        {INCOME_SOURCES.map(s => (
          <button key={s.id} className={`cat-btn ${source === s.id ? 'on' : ''}`} onClick={() => setSource(s.id)}>
            <span className="e">{s.icon}</span><span>{s.name}</span>
          </button>
        ))}
      </div>
      <div className="input-group">
        <input className="input" placeholder={t('Комментарий')} value={description} onChange={e => setDescription(e.target.value)} />
      </div>
      <div className="input-group">
        <input className="input" type="date" value={date} onChange={e => setDate(e.target.value)} />
      </div>
      {error && <div className="warn" style={{ fontSize: 13, margin: '0 4px' }}>{error}</div>}
      <div className="sheet-actions">
        <button className="btn btn-secondary" onClick={onClose}>{t('Отмена')}</button>
        <button className="btn" onClick={save} disabled={saving || !(Number(amount) > 0)}>{saving ? t('Сохраняем…') : t('Сохранить')}</button>
      </div>
      <button className="btn btn-danger" style={{ marginTop: 6 }} onClick={remove}>{t('Удалить')}</button>
    </Sheet>
  );
}
