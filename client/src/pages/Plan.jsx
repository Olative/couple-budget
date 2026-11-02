import { useState, useEffect, useCallback } from 'react';
import { IconPlus, IconChevronRight } from '@tabler/icons-react';
import { api } from '../api/client';
import { GridLines } from '../components/Art';
import CategorySheet from '../components/CategorySheet';
import { money, confirmAction } from '../format';

const roundUp = (v) => Math.ceil(v / 100) * 100;

export default function Plan({ budget, refreshKey }) {
  const [categories, setCategories] = useState([]);
  const [typical, setTypical] = useState(null);
  const [filling, setFilling] = useState(false);
  const [sheet, setSheet] = useState(null);

  const load = useCallback(() => {
    api.getBudget(budget.id).then(b => setCategories(b.categories));
    api.getForecast(budget.id).then(f => setTypical(f.typical));
  }, [budget.id]);

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
                обычно вы тратите ~{money(typical.total, cur)} в месяц
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
                {avg > 0 && <div className="row-sub">обычно ~{money(avg, cur)}</div>}
              </div>
              <span className={`row-amt ${cat.planned_amount > 0 ? '' : 'muted'}`}>
                {cat.planned_amount > 0 ? money(cat.planned_amount, cur) : '—'}
              </span>
              <IconChevronRight size={16} color="#c4c4c4" />
            </div>
          );
        })}
      </div>

      <button className="btn btn-secondary" onClick={() => setSheet('new')}>
        <IconPlus size={18} stroke={1.6} /> Новая категория
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
