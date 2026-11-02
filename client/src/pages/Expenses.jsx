import { useState, useEffect, useCallback } from 'react';
import { IconPlus } from '@tabler/icons-react';
import { api } from '../api/client';
import { PenguinPair } from '../components/Art';
import { money, confirmAction } from '../format';

function dayLabel(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((today - d) / 86400000);
  if (diff === 0) return 'Сегодня';
  if (diff === 1) return 'Вчера';
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
}

export default function Expenses({ budget, user, refreshKey, onAdd }) {
  const [expenses, setExpenses] = useState(null);
  const [members, setMembers] = useState([]);
  const [who, setWho] = useState(null);

  const load = useCallback(() => {
    api.getExpenses(budget.id).then(setExpenses);
  }, [budget.id]);

  useEffect(() => { load(); }, [load, refreshKey]);
  useEffect(() => { api.getBudget(budget.id).then(b => setMembers(b.members)); }, [budget.id]);

  const remove = async (e) => {
    if (e.user_id !== user.id) return;
    if (!(await confirmAction(`Удалить «${e.description || e.category_name}» на ${money(e.amount, budget.currency)}?`))) return;
    await api.deleteExpense(e.id);
    load();
  };

  const visible = (expenses || []).filter(e => !who || e.user_id === who);
  const groups = Object.entries(
    visible.reduce((acc, e) => { (acc[e.date] ||= []).push(e); return acc; }, {})
  ).sort(([a], [b]) => b.localeCompare(a));

  return (
    <div className="page">
      <div className="page-head">
        <div className="h-title">Расходы</div>
        <button className="icon-btn dark" onClick={onAdd} aria-label="Добавить расход"><IconPlus size={18} /></button>
      </div>

      {members.length > 1 && (
        <div className="pills">
          <button className={`pill ${!who ? 'on' : ''}`} onClick={() => setWho(null)}>Все</button>
          {members.map(m => (
            <button key={m.id} className={`pill ${who === m.id ? 'on' : ''}`} onClick={() => setWho(m.id)}>{m.first_name}</button>
          ))}
        </div>
      )}

      {expenses && groups.length === 0 && (
        <div className="empty">
          <PenguinPair height={70} />
          <div className="empty-text">Расходов пока нет</div>
          <button className="btn" style={{ maxWidth: 220 }} onClick={onAdd}>Добавить первый</button>
        </div>
      )}

      {groups.map(([date, items]) => (
        <div key={date}>
          <div className="section-label" style={{ marginBottom: 6 }}>{dayLabel(date)}</div>
          <div className="card">
            {items.map(e => (
              <div key={e.id} className="row" onClick={() => remove(e)} style={{ cursor: e.user_id === user.id ? 'pointer' : 'default' }}>
                <span className="row-ic">{e.category_icon}</span>
                <div className="row-main">
                  <div className="row-name">{e.description || e.category_name}</div>
                  <div className="row-sub">{e.description ? `${e.category_name} · ` : ''}{e.user_name}</div>
                </div>
                <span className="row-amt">−{money(e.amount, budget.currency)}</span>
              </div>
            ))}
          </div>
        </div>
      ))}

      {expenses && groups.length > 0 && (
        <div className="row-sub" style={{ textAlign: 'center', marginTop: 4 }}>Нажмите на свой расход, чтобы удалить его</div>
      )}
    </div>
  );
}
