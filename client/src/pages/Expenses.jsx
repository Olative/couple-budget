import { useState, useEffect, useCallback } from 'react';
import { IconPlus, IconRepeat, IconMessageCircle, IconLock, IconPaperclip } from '@tabler/icons-react';
import ExpenseSheet from '../components/ExpenseSheet';
import { api } from '../api/client';
import SpriteAnim from '../components/SpriteAnim';
import { money, confirmAction, incomeSource } from '../format';

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
    Promise.all([api.getExpenses(budget.id), api.getIncomes(budget.id), api.getPersonal(budget.id)]).then(([ex, inc, pers]) => {
      const incomes = inc.map(i => {
        const s = incomeSource(i.source);
        return { ...i, kind: 'income', category_icon: s.icon, category_name: s.name };
      });
      const personal = pers.items.map(p => ({
        ...p, kind: 'personal', category_icon: p.category_icon || '🔒', category_name: 'Личная', user_name: user.first_name,
      }));
      setExpenses([...ex.map(e => ({ ...e, kind: 'expense' })), ...incomes, ...personal]
        .sort((a, b) => b.date.localeCompare(a.date) || b.created_at.localeCompare(a.created_at)));
    });
  }, [budget.id]);

  useEffect(() => { load(); }, [load, refreshKey]);
  useEffect(() => { api.getBudget(budget.id).then(b => setMembers(b.members)); }, [budget.id]);

  const [openId, setOpenId] = useState(null);

  const open = async (e) => {
    if (e.kind === 'expense') { setOpenId(e.id); return; }
    if (e.user_id !== user.id) return;
    if (!(await confirmAction(`Удалить «${e.description || e.category_name}» на ${money(e.amount, budget.currency)}?`))) return;
    if (e.kind === 'personal') await api.deletePersonal(e.id);
    else await api.deleteIncome(e.id);
    load();
  };

  const visible = (expenses || []).filter(e => !who || e.user_id === who);
  const groups = Object.entries(
    visible.reduce((acc, e) => { (acc[e.date] ||= []).push(e); return acc; }, {})
  ).sort(([a], [b]) => b.localeCompare(a));

  return (
    <div className="page">
      <div className="page-head">
        <div className="h-title">Операции</div>
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
          <SpriteAnim name="idle" width={120} />
          <div className="empty-text">Операций пока нет</div>
          <button className="btn" style={{ maxWidth: 220 }} onClick={onAdd}>Добавить</button>
        </div>
      )}

      {groups.map(([date, items]) => (
        <div key={date}>
          <div className="section-label" style={{ marginBottom: 6 }}>{dayLabel(date)}</div>
          <div className="card">
            {items.map(e => (
              <div key={`${e.kind}${e.id}`} className="row" onClick={() => open(e)} style={{ cursor: e.kind === 'expense' || e.user_id === user.id ? 'pointer' : 'default' }}>
                <span className="row-ic">{e.category_icon}</span>
                <div className="row-main">
                  <div className="row-name">
                    {e.description || e.category_name}
                    {e.recurring_id && <IconRepeat size={13} stroke={1.8} color="#9a9a9a" style={{ marginLeft: 5, verticalAlign: -1 }} aria-label="повторяется каждый месяц" />}
                    {!!e.has_receipt && <IconPaperclip size={13} stroke={1.8} color="#9a9a9a" style={{ marginLeft: 5, verticalAlign: -1 }} aria-label="есть фото чека" />}
                  </div>
                  <div className="row-sub">
                    {e.kind === 'personal' && <IconLock size={11} style={{ verticalAlign: -1, marginRight: 3 }} />}
                    {e.kind === 'personal' ? 'личная · видите только вы' : <>{e.description ? `${e.category_name} · ` : ''}{e.user_name}</>}
                    {e.reactions && <span style={{ marginLeft: 6 }}>{e.reactions}</span>}
                    {e.comment_count > 0 && <span style={{ marginLeft: 6 }}><IconMessageCircle size={11} style={{ verticalAlign: -1 }} /> {e.comment_count}</span>}
                  </div>
                </div>
                {e.kind === 'income'
                  ? <span className="row-amt good">+{money(e.amount, budget.currency)}</span>
                  : <span className="row-amt">−{money(e.amount, budget.currency)}</span>}
              </div>
            ))}
          </div>
        </div>
      ))}

      {expenses && groups.length > 0 && (
        <div className="row-sub" style={{ textAlign: 'center', marginTop: 4 }}>Нажмите на трату, чтобы отреагировать или прокомментировать</div>
      )}

      {openId && (
        <ExpenseSheet budget={budget} user={user} expenseId={openId} onClose={() => setOpenId(null)} onChanged={load} />
      )}
    </div>
  );
}
