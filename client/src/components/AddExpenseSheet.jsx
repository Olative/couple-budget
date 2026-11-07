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

const daysIn = (iso) => new Date(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)), 0).getDate();

// When the first payment happens this month: the chosen day, or the month's last day if it is shorter.
function firstHint(day, now) {
  const today = Number(now.slice(8, 10));
  const actual = Math.min(day, daysIn(now));
  if (actual > today) return `первый раз ${actual}-го`;
  if (actual === today) return 'первый раз — сегодня';
  return 'за этот месяц запишем сразу';
}

export default function AddExpenseSheet({ budget, initialKind = 'expense', initialRepeat = false, onClose, onSaved }) {
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
  const [repeat, setRepeat] = useState(initialRepeat);
  const now = today();
  const [repeatDay, setRepeatDay] = useState(Number(now.slice(8, 10)));
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
      // A repeating payment starts this month on the chosen day (the server waits if that day is still ahead).
      const repeatDate = `${now.slice(0, 8)}${String(Math.min(repeatDay, daysIn(now))).padStart(2, '0')}`;
      const common = { amount: Number(amount), description: description || null, date: repeat && !(personal && !isIncome) ? repeatDate : date };
      if (!isIncome && personal) await api.addPersonal(budget.id, { ...common, category_id: categoryId });
      else if (repeat) await api.addRecurring(budget.id, { ...common, kind, source, category_id: categoryId, day_of_month: repeatDay });
      else if (isIncome) await api.addIncome(budget.id, { ...common, source });
      else await api.addExpense(budget.id, { ...common, category_id: categoryId });
      onSaved();
    } catch (e) {
      setError(e.message);
      setSaving(false);
    }
  };

  return (
    <Sheet onClose={onClose} title={initialRepeat ? 'Регулярный платёж' : undefined}>
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
        <>
        {repeat && <div className="input-label">В какую категорию записывать каждый месяц</div>}
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
        </>
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
      {!(repeat && (isIncome || !personal)) && (
        <div className="input-group">
          <input className="input" type="date" value={date} onChange={e => setDate(e.target.value)} />
        </div>
      )}

      {!isIncome && !repeat && (
        <label className="switch-row" style={{ marginBottom: 6 }}>
          <span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><IconLock size={16} stroke={1.6} /> Личная трата</span>
            {personal && <span className="row-sub" style={{ display: 'block', marginTop: 2 }}>из ваших личных денег — не попадёт в общий бюджет, второй увидит только сумму за месяц</span>}
          </span>
          <input type="checkbox" className="switch" checked={personal} onChange={e => setPersonal(e.target.checked)} />
        </label>
      )}

      {(isIncome || !personal) && (
        <div className="switch-row" style={{ flexWrap: 'wrap' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, cursor: 'pointer' }}>
            <IconRepeat size={16} stroke={1.6} /> Повторять каждый месяц
            <input type="checkbox" className="switch" style={{ marginLeft: 'auto' }} checked={repeat} onChange={e => setRepeat(e.target.checked)} />
          </label>
          {repeat && (
            <div style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, fontSize: 14 }}>
              <span>каждое</span>
              <select className="day-select" value={repeatDay} onChange={e => setRepeatDay(Number(e.target.value))} aria-label="День месяца">
                {Array.from({ length: 31 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}
              </select>
              <span>число</span>
              <span className="row-sub" style={{ marginLeft: 'auto', marginTop: 0 }}>
                {firstHint(repeatDay, now)}
              </span>
              {repeatDay > 28 && (
                <span className="row-sub" style={{ width: '100%', marginTop: 4 }}>
                  В месяцах, где нет {repeatDay}-го числа, — в последний день месяца
                </span>
              )}
            </div>
          )}
        </div>
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
