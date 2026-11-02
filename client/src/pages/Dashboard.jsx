import { useState, useEffect } from 'react';
import { IconChevronLeft, IconChevronRight, IconSettings, IconArrowRight } from '@tabler/icons-react';
import { api } from '../api/client';
import { GridLines, Penguin, PenguinPair } from '../components/Art';
import { money, MONTHS, MONTHS_GEN, shiftMonth, thisMonth } from '../format';

function monthLabel(month) {
  const name = MONTHS[Number(month.slice(5, 7)) - 1].toLowerCase();
  return month.slice(0, 4) === thisMonth().slice(0, 4) ? name : `${name} ${month.slice(2, 4)}`;
}

function ForecastLine({ forecast, currency }) {
  if (!forecast.isCurrent || forecast.spent === 0) return null;
  const { projected, planned } = forecast;
  let status = null;
  if (planned > 0) {
    const diff = projected - planned;
    status = diff > 0
      ? <span style={{ color: '#ffb4a8' }}>+{money(diff, currency)} сверх плана</span>
      : <span style={{ color: '#9ee0bd' }}>уложитесь</span>;
  }
  return (
    <div style={{ fontSize: 12, marginTop: 12, fontWeight: 300, opacity: 0.85 }}>
      Прогноз на конец месяца: {money(projected, currency)}{status && <> · {status}</>}
    </div>
  );
}

export default function Dashboard({ budget, refreshKey, onAdd, onOpenRecap, onOpenSettings }) {
  const [month, setMonth] = useState(thisMonth);
  const [summary, setSummary] = useState(null);
  const [forecast, setForecast] = useState(null);

  useEffect(() => {
    Promise.all([api.getSummary(budget.id, month), api.getForecast(budget.id, month)]).then(([s, f]) => {
      setSummary(s);
      setForecast(f);
    });
  }, [budget.id, month, refreshKey]);

  const cur = budget.currency;
  const header = (
    <div className="page-head">
      <div className="h-title">Lolo &amp; Pepe</div>
      <div className="head-actions">
        <div className="chip">
          <button onClick={() => setMonth(m => shiftMonth(m, -1))} aria-label="Предыдущий месяц"><IconChevronLeft size={16} /></button>
          <span>{monthLabel(month)}</span>
          <button onClick={() => setMonth(m => shiftMonth(m, 1))} aria-label="Следующий месяц"><IconChevronRight size={16} /></button>
        </div>
        <button className="icon-btn" onClick={onOpenSettings} aria-label="Настройки"><IconSettings size={18} stroke={1.6} /></button>
      </div>
    </div>
  );

  if (!summary || !forecast) return <div className="page">{header}</div>;

  const spent = Number(summary.totalSpent);
  const planned = Number(summary.totalPlanned);
  const remaining = planned - spent;
  const forecastById = Object.fromEntries(forecast.categories.map(c => [c.id, c]));
  const activeCats = summary.byCategory.filter(c => c.spent > 0);
  const members = summary.byMember;

  return (
    <div className="page">
      {header}

      {forecast.recapMonth && month === thisMonth() && (
        <button
          onClick={() => onOpenRecap(forecast.recapMonth)}
          style={{ border: 'none', borderRadius: 18, padding: '12px 16px', background: 'var(--blue-grad-soft)', color: '#fff', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', textAlign: 'left' }}
        >
          <PenguinPair height={34} />
          <div style={{ flex: 1 }}>
            <div className="label" style={{ fontSize: 7 }}>готово</div>
            <div style={{ fontSize: 15, marginTop: 2 }}>Итоги {MONTHS_GEN[Number(forecast.recapMonth.slice(5, 7)) - 1]}</div>
          </div>
          <IconArrowRight size={18} />
        </button>
      )}

      <div className="scallop">
        <div className="scallop-in">
          <GridLines color="#fff" opacity={0.07} />
          <div className="rel">
            <div className="label" style={{ opacity: 0.5 }}>· потрачено ·</div>
            <div className="num" style={{ fontSize: 30, margin: '10px 0 4px' }}>{money(spent, cur)}</div>
            {planned > 0 ? (
              <>
                <div style={{ fontSize: 12, fontWeight: 300, opacity: 0.5 }}>
                  из {money(planned, cur)} · {remaining >= 0 ? `осталось ${money(remaining, cur)}` : `перерасход ${money(-remaining, cur)}`}
                </div>
                <div className="progress" style={{ background: 'rgba(255,255,255,.12)', marginTop: 14 }}>
                  <div className="progress-fill" style={{ width: `${Math.min(100, (spent / planned) * 100)}%`, background: remaining < 0 ? '#ff8c7e' : '#fff' }} />
                </div>
              </>
            ) : (
              <div style={{ fontSize: 12, fontWeight: 300, opacity: 0.5 }}>лимиты на месяц не заданы</div>
            )}
            <ForecastLine forecast={forecast} currency={cur} />
          </div>
        </div>
      </div>

      {members.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: members.length > 1 ? '1fr 1fr' : '1fr', gap: 8 }}>
          {members.slice(0, 2).map((m, i) => {
            const inner = (
              <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 6 }}>
                <div style={{ minWidth: 0 }}>
                  <div className="label" style={{ fontSize: 7, color: i ? 'var(--muted)' : '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.first_name}</div>
                  <div className="num" style={{ fontSize: 14, marginTop: 6 }}>{money(m.spent, cur)}</div>
                </div>
                <Penguin height={i ? 34 : 38} mirror={i === 1} />
              </div>
            );
            return i === 0 ? (
              <div key={m.id} style={{ borderRadius: 18, padding: 14, background: 'var(--blue-grad-soft)', color: '#fff' }}>{inner}</div>
            ) : (
              <div key={m.id} className="stamp-wrap"><div className="stamp" style={{ padding: 14 }}>{inner}</div></div>
            );
          })}
        </div>
      )}

      {activeCats.length > 0 ? (
        <div className="card">
          {activeCats.map(cat => {
            const f = forecastById[cat.id];
            const over = cat.planned_amount > 0 && cat.spent > cat.planned_amount;
            let note = cat.planned_amount > 0 ? `из ${money(cat.planned_amount, cur)}` : 'без лимита';
            let warn = false;
            if (f?.exhausted) { note = over ? `перерасход ${money(cat.spent - cat.planned_amount, cur)}` : 'лимит исчерпан'; warn = true; }
            else if (f?.runsOutDay) { note = `лимит закончится к ${f.runsOutDay}-му`; warn = true; }
            return (
              <div key={cat.id} className="row">
                <span className="row-ic">{cat.icon}</span>
                <div className="row-main">
                  <div className="row-name">{cat.name}</div>
                  <div className={`row-sub ${warn ? 'warn' : ''}`}>{note}</div>
                  {cat.planned_amount > 0 && (
                    <div className="progress">
                      <div className="progress-fill" style={{ width: `${Math.min(100, (cat.spent / cat.planned_amount) * 100)}%`, background: over ? 'var(--danger)' : 'var(--ink)' }} />
                    </div>
                  )}
                </div>
                <span className={`row-amt ${over ? 'warn' : ''}`}>{money(cat.spent, cur)}</span>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="empty">
          <PenguinPair height={70} />
          <div className="empty-text">В этом месяце трат пока нет</div>
          <button className="btn" style={{ maxWidth: 220 }} onClick={onAdd}>Добавить расход</button>
        </div>
      )}
    </div>
  );
}
