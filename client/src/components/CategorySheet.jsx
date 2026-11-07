import { useState } from 'react';
import { api } from '../api/client';
import Sheet from './Sheet';
import { confirmAction } from '../format';
import { t, pl } from '../i18n';

const ICONS = ['🛒', '🍕', '☕', '🍷', '🚌', '🚕', '🚗', '⛽', '✈️', '🏠', '💡', '🧾', '💊', '💪', '💄', '👕', '🎬', '🎮', '📚', '🎁', '🐶', '👶', '🌿', '🔧', '🏖️', '📱', '💳', '📦'];

// Without `category` it creates a new one; with it, it edits or deletes that category.
export default function CategorySheet({ budget, category, categories = [], onClose, onSaved, onDeleted }) {
  const editing = Boolean(category);
  const icons = editing && !ICONS.includes(category.icon) ? [category.icon, ...ICONS] : ICONS;
  const [icon, setIcon] = useState(category?.icon || ICONS[0]);
  const [name, setName] = useState(category ? t(category.name) : '');
  const [limit, setLimit] = useState(category?.planned_amount ? String(category.planned_amount) : '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const save = async () => {
    if (!name.trim()) return;
    setSaving(true);
    setError('');
    try {
      // A default category shown translated keeps its stored name unless it was actually renamed.
      const kept = editing && name.trim() === t(category.name) ? category.name : name.trim();
      const data = { name: kept, icon, planned_amount: Number(limit) || 0 };
      onSaved(editing ? await api.updateCategory(category.id, data) : await api.addCategory(budget.id, data));
    } catch (e) {
      setError(e.message);
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!(await confirmAction(t('Удалить категорию «{name}»?', { name: t(category.name) })))) return;
    setSaving(true);
    setError('');
    try {
      await api.deleteCategory(category.id);
      onDeleted();
    } catch (e) {
      if (e.status !== 409) { setError(e.message); setSaving(false); return; }
      const others = categories.filter(c => c.id !== category.id);
      const target = others.find(c => c.name === 'Прочее' || c.name === 'Other') || others[0];
      if (!target) { setError(t('Это последняя категория — её нельзя удалить')); setSaving(false); return; }
      const n = e.data.expenses;
      if (!(await confirmAction(t('В этой категории {n} {expenses}. Перенести их в «{name}» и удалить категорию?', { n, expenses: pl(n, 'трата', 'траты', 'трат', 'expense', 'expenses'), name: t(target.name) })))) {
        setSaving(false);
        return;
      }
      await api.deleteCategory(category.id, target.id);
      onDeleted();
    }
  };

  return (
    <Sheet title={editing ? t('Категория') : t('Новая категория')} onClose={onClose}>
      <div className="card-pad" style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
        <span className="row-ic" style={{ width: 44, height: 44, fontSize: 22 }}>{icon}</span>
        <input
          className="input"
          style={{ background: 'var(--surface-2)' }}
          placeholder={t('Например, Подарки')}
          value={name}
          maxLength={40}
          onChange={e => setName(e.target.value)}
          autoFocus={!editing}
        />
      </div>

      <div className="input-label">{t('Значок')}</div>
      <div className="card-pad" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 4, marginBottom: 10, padding: 10 }}>
        {icons.map(i => (
          <button
            key={i}
            onClick={() => setIcon(i)}
            aria-label={t('Значок {icon}', { icon: i })}
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
        <label className="input-label">{t('Лимит на месяц (необязательно)')}</label>
        <input className="input" type="number" inputMode="numeric" placeholder={`0 ${budget.currency}`} value={limit} onChange={e => setLimit(e.target.value)} />
      </div>

      {error && <div className="warn" style={{ fontSize: 13, margin: '0 4px' }}>{error}</div>}

      <div className="sheet-actions">
        <button className="btn btn-secondary" onClick={onClose}>{t('Отмена')}</button>
        <button className="btn" onClick={save} disabled={saving || !name.trim()}>
          {saving ? t('Сохраняем…') : editing ? t('Сохранить') : t('Создать')}
        </button>
      </div>

      {editing && (
        <button className="btn btn-danger" style={{ marginTop: 6 }} onClick={remove} disabled={saving}>{t('Удалить категорию')}</button>
      )}
    </Sheet>
  );
}
