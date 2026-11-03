import { useState, useEffect, useCallback } from 'react';
import { IconPlus, IconChevronRight, IconX, IconRepeat } from '@tabler/icons-react';
import { api } from '../api/client';
import { GridLines } from '../components/Art';
import CategorySheet from '../components/CategorySheet';
import { money, confirmAction, incomeSource } from '../format';

const roundUp = (v) => Math.ceil(v / 100) * 100;

// Last loaded plan per budget, so reopening the tab shows it at once while fresh data loads.
const cache = {};

export default function Plan({ budget, refreshKey, onAdd }) {
  const cached = cache[budget.id] || {};
  const [categories, setCategories] = useState(cached.categories || null);
  const [typical, setTypical] = useState(cached.typical || null);
  const [filling, setFilling] = useState(false);
  const [sheet, setSheet] = useState(null);

  const [recurring, setRecurring] = useState(cached.recurring || []);

  const load = useCallback(() => {
    const c = (cache[budget.id] ||= {});
    api.getBudget(budget.id).then(b => { c.categories = b.categories; setCategories(b.categories); });
    api.getForecast(budget.id).then(f => { c.typical = f.typical; setTypical(f.typical); });
    api.getRecurring(budget.id).then(r => { c.recurring = r; setRecurring(r); });
  }, [budget.id]);

  const stopRecurring = async (r) => {
    if (!(await confirmAction('Перестать повторять этот платёж? Уже созданные записи останутся.'))) return;
    await api.deleteRecurring(r.id);
    load();
  };

  useEffect(() => { load(); }, [load, refreshKey]);

  const fillFromTypical = async () => {
    if (!(await confirmAction('Поставить лимиты по вашим средним тратам? Текущие лимиты заменятся.'))) return;
    setFilling(true);
    for (const c of categories) {
      const avg = typical.byCategory[c.id];
      if (avg > 0) await api.updateCategory(c.id, { planned_amount: roundUp(avg) });
    }
    setFilling(false);
    load();
  };

  const closeSheet = () => { setSheet(null); load(); };
  if (!categories) return <div className="page"><div className="page-head"><div className="h-title">План на месяц</div></div></div>;
  const totalPlanned = categories.reduce((s, c) => s + (c.planned_amount || 0), 0);
  const hasHistory = typical && typical.months > 0;
  const cur = budget.currency;

  return (
    <div className="page">
      <div className="page-head"><div className="h-title">План на месяц</div></div>

      <div className="stamp-wrap">
        <div className="stamp" style={{ padding: '22px 18px', textAlign: 'center' }}>
          <GridLines color="#000" opacity={0.06} />
          <div className="rel">
            <div className="label muted">· общий план ·</div>
            <div className="num" style={{ fontSize: 28, margin: '10px 0 4px' }}>{money(totalPlanned, cur)}</div>
            {hasHistory && (
              <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 300 }}>
                обычно вы тратите около {money(typical.total, cur)} в месяц
              </div>
            )}
          </div>
        </div>
      </div>

      {hasHistory && (
        <button className="btn btn-secondary" onClick={fillFromTypical} disabled={filling}>
          {filling ? 'Заполняем…' : 'Заполнить по средним тратам'}
        </button>
      )}

      <div className="section-label">Нажмите на категорию, чтобы задать лимит, переименовать или удалить её</div>
      <div className="card">
        {categories.map(cat => {
          const avg = typical?.byCategory?.[cat.id];
          return (
            <div key={cat.id} className="row" style={{ cursor: 'pointer' }} onClick={() => setSheet(cat)}>
              <span className="row-ic">{cat.icon}</span>
              <div className="row-main">
                <div className="row-name">{cat.name}</div>
                {avg > 0 && <div className="row-sub">в среднем {money(avg, cur)}</div>}
              </div>
              <span className={`row-amt ${cat.planned_amount > 0 ? '' : 'muted'}`}>
                {cat.planned_amount > 0 ? money(cat.planned_amount, cur) : '—'}
              </span>
              <IconChevronRight size={16} color="var(--muted)" />
            </div>
          );
        })}
      </div>

      <button className="btn btn-secondary" onClick={() => setSheet('new')}>
        <IconPlus size={18} stroke={1.6} /> Новая категория
      </button>

      <div className="section-label" style={{ marginTop: 14 }}>Регулярные платежи</div>
      {recurring.length === 0 ? (
        <div className="card-pad row-sub" style={{ fontSize: 13, lineHeight: 1.45 }}>
          Траты и доходы, которые повторяются сами: аренда, подписки, зарплата. Укажите сумму, день и категорию — например, аренда 25 000 каждое 5-е число в «Жильё», — и платёж будет записываться туда каждый месяц.
        </div>
      ) : (
        <div className="card">
          {recurring.map(r => {
            const income = r.kind === 'income';
            const s = income ? incomeSource(r.source) : null;
            return (
              <div key={r.id} className="row">
                <span className="row-ic">{income ? s.icon : r.category_icon}</span>
                <div className="row-main">
                  <div className="row-name">{r.description || (income ? s.name : r.category_name)}</div>
                  <div className="row-sub">каждое {r.day_of_month}-е · {r.user_name}</div>
                </div>
                <span className={`row-amt ${income ? 'good' : ''}`}>{income ? '+' : '−'}{money(r.amount, cur)}</span>
                <button className="icon-btn" style={{ width: 30, height: 30, background: 'var(--surface-2)' }} onClick={() => stopRecurring(r)} aria-label="Отменить повтор">
                  <IconX size={14} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      <button className="btn btn-secondary" onClick={() => onAdd('expense', true)}>
        <IconRepeat size={18} stroke={1.6} /> Добавить регулярный платёж
      </button>

      {sheet && (
        <CategorySheet
          key={sheet === 'new' ? 'new' : sheet.id}
          budget={budget}
          category={sheet === 'new' ? null : sheet}
          categories={categories}
          onClose={() => setSheet(null)}
          onSaved={closeSheet}
          onDeleted={closeSheet}
        />
      )}
    </div>
  );
}
