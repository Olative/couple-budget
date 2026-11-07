import { useState, useEffect, useCallback } from 'react';
import { IconRepeat, IconMessageCircle, IconPaperclip } from '@tabler/icons-react';
import Sheet from './Sheet';
import ExpenseSheet from './ExpenseSheet';
import { api } from '../api/client';
import { money, MONTHS_PREP, MONTHS_GEN } from '../format';
import { t, pl } from '../i18n';

const shortDay = (d) => t('{day} {month}', { day: Number(d.slice(8, 10)), month: MONTHS_GEN[Number(d.slice(5, 7)) - 1] });

// Every expense of one category in a month, shared and personal, opened from the dashboard.
export default function CategoryOps({ budget, user, category, month, onClose, onChanged }) {
  const [items, setItems] = useState(null);
  const [openId, setOpenId] = useState(null);
  const cur = budget.currency;

  const load = useCallback(() => {
    api.getExpenses(budget.id, { month, category_id: category.id, limit: 500 }).then(setItems);
  }, [budget.id, category.id, month]);
  useEffect(() => { load(); }, [load]);

  const changed = () => { load(); onChanged(); };
  const total = (items || []).reduce((s, e) => s + Number(e.amount), 0);
  const planned = Number(category.planned_amount || 0);
  const monthName = MONTHS_PREP[Number(month.slice(5, 7)) - 1];

  return (
    <Sheet title={`${category.icon} ${t(category.name)}`} onClose={onClose}>
      <div className="row-sub" style={{ margin: '-4px 4px 12px' }}>
        {t('{sum} в {month}', { sum: money(total, cur), month: monthName })}{planned > 0 ? ` · ${t('лимит {sum}', { sum: money(planned, cur) })}` : ''}
        {items && ` · ${items.length} ${pl(items.length, 'трата', 'траты', 'трат', 'expense', 'expenses')}`}
      </div>
      {!items && <div className="empty" style={{ padding: 24 }}>…</div>}
      {items && items.length === 0 && <div className="empty" style={{ padding: 24 }}>{t('В этом месяце трат нет')}</div>}
      {items && items.length > 0 && (
        <div className="card">
          {items.map(e => (
            <div key={e.id} className="row" style={{ cursor: 'pointer' }}
              onClick={() => setOpenId(e.id)}>
              <div className="row-main">
                <div className="row-name">
                  {e.description || t(category.name)}
                  {e.recurring_id && <IconRepeat size={13} stroke={1.8} color="#9a9a9a" style={{ marginLeft: 5, verticalAlign: -1 }} aria-label={t('повторяется каждый месяц')} />}
                  {!!e.has_receipt && <IconPaperclip size={13} stroke={1.8} color="#9a9a9a" style={{ marginLeft: 5, verticalAlign: -1 }} aria-label={t('есть фото чека')} />}
                </div>
                <div className="row-sub">
                  {shortDay(e.date)} · {e.personal ? `${t('личная')} · ` : ''}{e.user_name}
                  {e.reactions && <span style={{ marginLeft: 6 }}>{e.reactions}</span>}
                  {e.comment_count > 0 && <span style={{ marginLeft: 6 }}><IconMessageCircle size={11} style={{ verticalAlign: -1 }} /> {e.comment_count}</span>}
                </div>
              </div>
              <span className="row-amt">−{money(e.amount, cur)}</span>
            </div>
          ))}
        </div>
      )}
      {openId && <ExpenseSheet budget={budget} user={user} expenseId={openId} onClose={() => setOpenId(null)} onChanged={changed} />}
    </Sheet>
  );
}
