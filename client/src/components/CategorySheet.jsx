import { useState } from 'react';
import { api } from '../api/client';
import Sheet from './Sheet';
import { confirmAction, plural } from '../format';

const ICONS = ['🛒', '🍕', '☕', '🍷', '🚌', '🚕', '🚗', '⛽', '✈️', '🏠', '💡', '🧾', '💊', '💪', '💄', '👕', '🎬', '🎮', '📚', '🎁', '🐶', '👶', '🌿', '🔧', '🏖️', '📱', '💳', '📦'];

// Without `category` it creates a new one; with it, it edits or deletes that category.
export default function CategorySheet({ budget, category, categories = [], onClose, onSaved, onDeleted }) {
  const editing = Boolean(category);
  const icons = editing && !ICONS.includes(category.icon) ? [category.icon, ...ICONS] : ICONS;
  const [icon, setIcon] = useState(category?.icon || ICONS[0]);
  const [name, setName] = useState(category?.name || '');
  const [limit, setLimit] = useState(category?.planned_amount ? String(category.planned_amount) : '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const save = async () => {
    if (!name.trim()) return;
    setSaving(true);
    setError('');
    try {
      const data = { name: name.trim(), icon, planned_amount: Number(limit) || 0 };
      onSaved(editing ? await api.updateCategory(category.id, data) : await api.addCategory(budget.id, data));
    } catch (e) {
      setError(e.message);
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!(await confirmAction(`Удалить категорию «${category.name}»?`))) return;
    setSaving(true);
    setError('');
    try {
      await api.deleteCategory(category.id);
      onDeleted();
    } catch (e) {
      if (e.status !== 409) { setError(e.message); setSaving(false); return; }
      const others = categories.filter(c => c.id !== category.id);
      const target = others.find(c => c.name === 'Прочее') || others[0];
      if (!target) { setError('Это последняя категория — её нельзя удалить'); setSaving(false); return; }
      const n = e.data.expenses;
      if (!(await confirmAction(`В этой категории ${n} ${plural(n, 'трата', 'траты', 'трат')}. Перенести их в «${target.name}» и удалить категорию?`))) {
        setSaving(false);
        return;
      }
      await api.deleteCategory(category.id, target.id);
      onDeleted();
    }
  };

  return (
    <Sheet title={editing ? 'Категория' : 'Новая категория'} onClose={onClose}>
      <div className="card-pad" style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
        <span className="row-ic" style={{ width: 44, height: 44, fontSize: 22 }}>{icon}</span>
        <input
          className="input"
          style={{ background: 'var(--surface-2)' }}
          placeholder="Например, Подарки"
          value={name}
          maxLength={40}
          onChange={e => setName(e.target.value)}
          autoFocus={!editing}
        />
      </div>

      <div className="input-label">Значок</div>
      <div className="card-pad" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 4, marginBottom: 10, padding: 10 }}>
        {icons.map(i => (
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
        <button className="btn" onClick={save} disabled={saving || !name.trim()}>
          {saving ? 'Сохраняем…' : editing ? 'Сохранить' : 'Создать'}
        </button>
      </div>

      {editing && (
        <button className="btn btn-danger" style={{ marginTop: 6 }} onClick={remove} disabled={saving}>Удалить категорию</button>
      )}
    </Sheet>
  );
}
