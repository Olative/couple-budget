import { useState } from 'react';
import { api } from '../api/client';
import Sheet from './Sheet';

const ICONS = ['🛒', '🍕', '☕', '🍷', '🚌', '🚕', '🚗', '⛽', '✈️', '🏠', '💡', '🧾', '💊', '💪', '💄', '👕', '🎬', '🎮', '📚', '🎁', '🐶', '👶', '🌿', '🔧', '🏖️', '📱', '💳', '📦'];

export default function CategorySheet({ budget, onClose, onCreated }) {
  const [icon, setIcon] = useState(ICONS[0]);
  const [name, setName] = useState('');
  const [limit, setLimit] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const save = async () => {
    if (!name.trim()) return;
    setSaving(true);
    setError('');
    try {
      const cat = await api.addCategory(budget.id, { name: name.trim(), icon, planned_amount: Number(limit) || 0 });
      onCreated(cat);
    } catch (e) {
      setError(e.message);
      setSaving(false);
    }
  };

  return (
    <Sheet title="Новая категория" onClose={onClose}>
      <div className="card-pad" style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
        <span className="row-ic" style={{ width: 44, height: 44, fontSize: 22 }}>{icon}</span>
        <input
          className="input"
          style={{ background: 'var(--surface-2)' }}
          placeholder="Например, Подарки"
          value={name}
          maxLength={40}
          onChange={e => setName(e.target.value)}
          autoFocus
        />
      </div>

      <div className="input-label">Значок</div>
      <div className="card-pad" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 4, marginBottom: 10, padding: 10 }}>
        {ICONS.map(i => (
          <button
            key={i}
            onClick={() => setIcon(i)}
            aria-label={`Значок ${i}`}
            style={{
              border: 'none', borderRadius: 12, aspectRatio: '1', fontSize: 20, cursor: 'pointer',
              background: icon === i ? 'var(--ink)' : 'transparent',
            }}
          >
            {i}
          </button>
        ))}
      </div>

      <div className="input-group">
        <label className="input-label">Лимит на месяц (необязательно)</label>
        <input className="input" type="number" inputMode="numeric" placeholder={`0 ${budget.currency}`} value={limit} onChange={e => setLimit(e.target.value)} />
      </div>

      {error && <div className="warn" style={{ fontSize: 13, margin: '0 4px' }}>{error}</div>}

      <div className="sheet-actions">
        <button className="btn btn-secondary" onClick={onClose}>Отмена</button>
        <button className="btn" onClick={save} disabled={saving || !name.trim()}>{saving ? 'Создаём…' : 'Создать'}</button>
      </div>
    </Sheet>
  );
}
