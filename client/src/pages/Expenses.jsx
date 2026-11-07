import { useState, useEffect, useCallback } from 'react';
import { IconPlus, IconRepeat, IconMessageCircle, IconPaperclip, IconPencil } from '@tabler/icons-react';
import ExpenseSheet from '../components/ExpenseSheet';
import OperationSheet from '../components/OperationSheet';
import { api } from '../api/client';
import { PenguinPair } from '../components/Art';
import { money, incomeSource, thisMonth } from '../format';
import { t, locale } from '../i18n';

function dayLabel(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((today - d) / 86400000);
  if (diff === 0) return t('Сегодня');
  if (diff === 1) return t('Вчера');
  return d.toLocaleDateString(locale(), { day: 'numeric', month: 'long' });
}

export default function Expenses({ budget, user, refreshKey, onAdd }) {
  const [expenses, setExpenses] = useState(null);
  const [members, setMembers] = useState([]);
  const [who, setWho] = useState(null);

  const load = useCallback(() => {
    const month = thisMonth();
    Promise.all([api.getExpenses(budget.id), api.getIncomes(budget.id), api.getSummary(budget.id, month)]).then(([ex, inc, sum]) => {
      const incomes = inc.map(i => {
        const s = incomeSource(i.source);
        return { ...i, kind: 'income', category_icon: s.icon, category_name: s.name };
      });
      // What was left at the end of last month opens this month, on the 1st.
      const carry = Number(sum.carryOver || 0);
      const carried = carry ? [{
        id: 'carry', kind: 'carry', amount: carry, date: `${month}-01`, created_at: '',
        category_icon: carry > 0 ? '📥' : '📤', description: carry > 0 ? t('Осталось с прошлого месяца') : t('Не хватило в прошлом месяце'),
        category_name: t('перенос остатка'),
      }] : [];
      setExpenses([...ex.map(e => ({ ...e, kind: 'expense' })), ...incomes, ...carried]
        .sort((a, b) => b.date.localeCompare(a.date) || b.created_at.localeCompare(a.created_at)));
    });
  }, [budget.id]);

  useEffect(() => { load(); }, [load, refreshKey]);
  useEffect(() => { api.getBudget(budget.id).then(b => setMembers(b.members)); }, [budget.id]);

  const [openId, setOpenId] = useState(null);
  const [openOp, setOpenOp] = useState(null);

  const open = async (e) => {
    if (e.kind === 'carry') return;
    if (e.kind === 'expense') { setOpenId(e.id); return; }
    // Incomes can be changed only by whoever added them.
    if (e.kind === 'income' && e.user_id !== user.id) return;
    setOpenOp(e);
  };

  const visible = (expenses || []).filter(e => !who || e.user_id === who);
  const groups = Object.entries(
    visible.reduce((acc, e) => { (acc[e.date] ||= []).push(e); return acc; }, {})
  ).sort(([a], [b]) => b.localeCompare(a));

  return (
    <div className="page">
      <div className="page-head">
        <div className="h-title">{t('Операции')}</div>
        <button className="icon-btn dark" onClick={onAdd} aria-label={t('Добавить расход')}><IconPlus size={18} /></button>
      </div>

      {members.length > 1 && (
        <div className="pills">
          <button className={`pill ${!who ? 'on' : ''}`} onClick={() => setWho(null)}>{t('Все')}</button>
          {members.map(m => (
            <button key={m.id} className={`pill ${who === m.id ? 'on' : ''}`} onClick={() => setWho(m.id)}>{m.first_name}</button>
          ))}
        </div>
      )}

      {expenses && groups.length === 0 && (
        <div className="empty">
          <PenguinPair height={70} />
          <div className="empty-text">{t('Операций пока нет')}</div>
          <button className="btn" style={{ maxWidth: 220 }} onClick={onAdd}>{t('Добавить')}</button>
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
                    {e.description || t(e.category_name)}
                    {e.recurring_id && <IconRepeat size={13} stroke={1.8} color="#9a9a9a" style={{ marginLeft: 5, verticalAlign: -1 }} aria-label={t('повторяется каждый месяц')} />}
                    {!!e.has_receipt && <IconPaperclip size={13} stroke={1.8} color="#9a9a9a" style={{ marginLeft: 5, verticalAlign: -1 }} aria-label={t('есть фото чека')} />}
                    {!!e.edited_by_other && <IconPencil size={13} stroke={1.8} color="#9a9a9a" style={{ marginLeft: 5, verticalAlign: -1 }} aria-label={t('поправил второй участник')} />}
                  </div>
                  <div className="row-sub">
                    {e.kind === 'carry' ? t('перенос остатка') : <>{e.personal ? `${t('личная')} · ` : ''}{e.description ? `${t(e.category_name)} · ` : ''}{e.user_name}</>}
                    {e.reactions && <span style={{ marginLeft: 6 }}>{e.reactions}</span>}
                    {e.comment_count > 0 && <span style={{ marginLeft: 6 }}><IconMessageCircle size={11} style={{ verticalAlign: -1 }} /> {e.comment_count}</span>}
                  </div>
                </div>
                {e.kind === 'income' || (e.kind === 'carry' && e.amount > 0)
                  ? <span className="row-amt good">+{money(Math.abs(e.amount), budget.currency)}</span>
                  : e.kind === 'carry' ? <span className="row-amt warn">−{money(Math.abs(e.amount), budget.currency)}</span>
                  : <span className="row-amt">−{money(e.amount, budget.currency)}</span>}
              </div>
            ))}
          </div>
        </div>
      ))}

      {expenses && groups.length > 0 && (
        <div className="row-sub" style={{ textAlign: 'center', marginTop: 4 }}>{t('Нажмите на трату, чтобы отреагировать или прокомментировать')}</div>
      )}

      {openOp && (
        <OperationSheet budget={budget} user={user} item={openOp} onClose={() => setOpenOp(null)} onChanged={load} />
      )}

      {openId && (
        <ExpenseSheet budget={budget} user={user} expenseId={openId} onClose={() => setOpenId(null)} onChanged={load} />
      )}
    </div>
  );
}
