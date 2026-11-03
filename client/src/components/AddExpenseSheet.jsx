import { useState, useEffect } from 'react';
import { IconPlus, IconRepeat, IconLock } from '@tabler/icons-react';
import { api } from '../api/client';
import Sheet from './Sheet';
import CategorySheet from './CategorySheet';
import { INCOME_SOURCES } from '../format';

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function AddExpenseSheet({ budget, initialKind = 'expense', onClose, onSaved }) {
  const [kind, setKind] = useState(initialKind);
  const [categories, setCategories] = useState([]);
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState(null);
  const [source, setSource] = useState('salary');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(today);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showNewCat, setShowNewCat] = useState(false);
  const [repeat, setRepeat] = useState(false);
  const [personal, setPersonal] = useState(false);
  const isIncome = kind === 'income';

  useEffect(() => {
    api.getBudget(budget.id).then(b => {
      setCategories(b.categories);
      if (b.categories.length) setCategoryId(b.categories[0].id);
    });
  }, [budget.id]);

  const save = async () => {
    if (!amount || Number(amount) <= 0 || (!isIncome && !categoryId)) return;
    setSaving(true);
    setError('');
    try {
      const common = { amount: Number(amount), description: description || null, date };
      if (!isIncome && personal) await api.addPersonal(budget.id, { ...common, category_id: categoryId });
      else if (repeat) await api.addRecurring(budget.id, { ...common, kind, source, category_id: categoryId });
      else if (isIncome) await api.addIncome(budget.id, { ...common, source });
      else await api.addExpense(budget.id, { ...common, category_id: categoryId });
      onSaved();
    } catch (e) {
      setError(e.message);
      setSaving(false);
    }
  };

  return (
    <Sheet onClose={onClose}>
      <div className="segmented" style={{ marginBottom: 12 }}>
        <button className={!isIncome ? 'on' : ''} onClick={() => setKind('expense')}>Расход</button>
        <button className={isIncome ? 'on income' : ''} onClick={() => setKind('income')}>Доход</button>
      </div>

      <div className="card-pad" style={{ marginBottom: 10 }}>
        <input
          className="amount-input"
          style={isIncome ? { color: 'var(--ok)' } : undefined}
          type="number"
          inputMode="decimal"
          placeholder={`${isIncome ? '+ ' : ''}0 ${budget.currency}`}
          value={amount}
          onChange={e => setAmount(e.target.value)}
          autoFocus
        />
      </div>

      {isIncome ? (
        <div className="cat-grid" style={{ marginBottom: 10 }}>
          {INCOME_SOURCES.map(s => (
            <button key={s.id} className={`cat-btn ${source === s.id ? 'on' : ''}`} onClick={() => setSource(s.id)}>
              <span className="e">{s.icon}</span>
              <span>{s.name}</span>
            </button>
          ))}
        </div>
      ) : (
        <div className="cat-grid" style={{ marginBottom: 10 }}>
          {categories.map(c => (
            <button key={c.id} className={`cat-btn ${categoryId === c.id ? 'on' : ''}`} onClick={() => setCategoryId(c.id)}>
              <span className="e">{c.icon}</span>
              <span>{c.name}</span>
            </button>
          ))}
          <button className="cat-btn" style={{ background: 'transparent', border: '1.5px dashed #c8c8c8' }} onClick={() => setShowNewCat(true)}>
            <span className="e"><IconPlus size={20} stroke={1.6} /></span>
            <span>Своя</span>
          </button>
        </div>
      )}

      {showNewCat && (
        <CategorySheet
          budget={budget}
          onClose={() => setShowNewCat(false)}
          onSaved={(cat) => { setCategories(cs => [...cs, cat]); setCategoryId(cat.id); setShowNewCat(false); }}
        />
      )}

      <div className="input-group">
        <input className="input" placeholder="Комментарий" value={description} onChange={e => setDescription(e.target.value)} />
      </div>
      <div className="input-group">
        <input className="input" type="date" value={date} onChange={e => setDate(e.target.value)} />
      </div>

      {!isIncome && (
        <label className="switch-row" style={{ marginBottom: 6 }}>
          <span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><IconLock size={16} stroke={1.6} /> Личная трата</span>
            {personal && <span className="row-sub" style={{ display: 'block', marginTop: 2 }}>из ваших личных денег — не попадёт в общий бюджет, второй увидит только сумму за месяц</span>}
          </span>
          <input type="checkbox" className="switch" checked={personal} onChange={e => setPersonal(e.target.checked)} />
        </label>
      )}

      {(isIncome || !personal) && (
        <label className="switch-row">
          <span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><IconRepeat size={16} stroke={1.6} /> Повторять каждый месяц</span>
            {repeat && <span className="row-sub" style={{ display: 'block', marginTop: 2 }}>каждое {Number(date.slice(8, 10))}-е число, начиная с этой даты</span>}
          </span>
          <input type="checkbox" className="switch" checked={repeat} onChange={e => setRepeat(e.target.checked)} />
        </label>
      )}

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
