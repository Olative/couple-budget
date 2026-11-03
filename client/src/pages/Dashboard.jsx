import { useState, useEffect } from 'react';
import { IconChevronLeft, IconChevronRight, IconChevronDown, IconSettings, IconArrowRight, IconPlus, IconLock, IconPigMoney } from '@tabler/icons-react';
import { api } from '../api/client';
import { GridLines, Penguin, PenguinPair } from '../components/Art';
import InviteCard from '../components/InviteCard';
import SpriteAnim from '../components/SpriteAnim';
import Celebration from '../components/Celebration';
import { money, MONTHS, MONTHS_GEN, MONTHS_PREP, shiftMonth, thisMonth, confirmAction } from '../format';

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

export default function Dashboard({ budget, user, refreshKey, onAdd, onOpenRecap, onOpenSettings, onOpenSavings, onOpenBudgets, multiBudget }) {
  const [month, setMonth] = useState(thisMonth);
  const [summary, setSummary] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [balance, setBalance] = useState(null);
  const [personal, setPersonal] = useState(null);
  const [reload, setReload] = useState(0);
  const [celebrate, setCelebrate] = useState(null);
  const [goals, setGoals] = useState([]);

  useEffect(() => { api.getSavings(budget.id).then(setGoals); }, [budget.id, refreshKey]);

  useEffect(() => {
    Promise.all([
      api.getSummary(budget.id, month), api.getForecast(budget.id, month),
      api.getBalance(budget.id), api.getPersonal(budget.id, month),
    ]).then(([s, f, b, p]) => {
      setSummary(s);
      setForecast(f);
      setBalance(b);
      setPersonal(p);
    });
  }, [budget.id, month, refreshKey, reload]);

  const settle = async () => {
    const d = balance.debt;
    if (!(await confirmAction(`Отметить долг ${d.from.first_name} → ${d.to.first_name} ${money(d.amount, budget.currency)} как возвращённый?`))) return;
    await api.settle(budget.id);
    setCelebrate({ from: d.from.first_name, to: d.to.first_name, amount: d.amount });
    setReload(r => r + 1);
  };

  const cur = budget.currency;
  const header = (
    <div className="page-head">
      <button className="h-title title-btn" onClick={onOpenBudgets} aria-label="Бюджеты">
        <span>{multiBudget ? budget.name : 'Lolo & Pepe'}</span>
        <IconChevronDown size={14} stroke={1.6} />
      </button>
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
  const income = Number(summary.totalIncome || 0);
  const planned = Number(summary.totalPlanned);
  const remaining = planned - spent;
  const forecastById = Object.fromEntries(forecast.categories.map(c => [c.id, c]));
  const activeCats = summary.byCategory.filter(c => c.spent > 0);
  const members = summary.byMember;

  return (
    <div className="page">
      {header}

      {members.length < 2 && <InviteCard budget={budget} />}

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

      {income > 0 ? (
        <div className="card-pad" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 6, padding: '14px 12px' }}>
          {[
            ['Пришло', `+${money(income, cur)}`, 'var(--ok)'],
            ['Ушло', money(spent, cur), 'var(--ink)'],
            [income - spent >= 0 ? 'Осталось' : 'Минус', money(Math.abs(income - spent), cur), income - spent >= 0 ? 'var(--ink)' : 'var(--danger)'],
          ].map(([label, value, color]) => (
            <div key={label} style={{ textAlign: 'center', minWidth: 0 }}>
              <div className="label muted" style={{ fontSize: 7 }}>{label}</div>
              <div className="num" style={{ fontSize: 13, marginTop: 6, color, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{value}</div>
            </div>
          ))}
        </div>
      ) : month === thisMonth() && (
        <button className="btn btn-secondary" style={{ padding: 12, fontSize: 14 }} onClick={() => onAdd('income')}>
          <IconPlus size={16} stroke={1.6} /> Добавить доход
        </button>
      )}

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

      {balance && balance.members.length === 2 && (
        <div className="card-pad" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span className="row-ic" style={{ width: 40, height: 40, fontSize: 19 }}>🤝</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            {balance.debt ? (
              <>
                <div className="row-sub">{balance.debt.from.first_name} → {balance.debt.to.first_name}, вернуть</div>
                <div className="num" style={{ fontSize: 17, marginTop: 3 }}>{money(balance.debt.amount, cur)}</div>
              </>
            ) : (
              <div style={{ fontSize: 14 }}>Вы в расчёте</div>
            )}
            <div className="row-sub" style={{ marginTop: 2 }}>
              общие траты делим {balance.members.map(m => Math.round(m.share)).join('/')}
            </div>
          </div>
          {balance.debt && (
            <button className="btn btn-secondary" style={{ width: 'auto', padding: '10px 14px', fontSize: 13, background: 'var(--surface-2)' }} onClick={settle}>
              Рассчитались
            </button>
          )}
        </div>
      )}

      {(() => {
        const planned = goals.filter(g => Number(g.monthly_plan) > 0 && Number(g.current_amount) < Number(g.target_amount));
        if (month !== thisMonth() || !planned.length) return null;
        const plan = planned.reduce((s, g) => s + Number(g.monthly_plan), 0);
        const saved = planned.reduce((s, g) => s + Math.min(Number(g.month_saved), Number(g.monthly_plan)), 0);
        return (
          <button className="card-pad" onClick={onOpenSavings} style={{ border: 'none', textAlign: 'left', cursor: 'pointer', font: 'inherit', color: 'inherit' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
              <span style={{ fontSize: 14, display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}><IconPigMoney size={16} stroke={1.6} /> В копилку</span>
              <span className="num" style={{ fontSize: 13, whiteSpace: 'nowrap' }}>{money(saved, cur)}<span className="muted"> из {money(plan, cur)}</span></span>
            </div>
            <div className="progress">
              <div className="progress-fill" style={{ width: `${Math.min(100, (saved / plan) * 100)}%`, background: saved >= plan ? 'var(--ok)' : 'var(--ink)' }} />
            </div>
            <div className="row-sub" style={{ marginTop: 8 }}>
              {saved >= plan ? `План на ${MONTHS[Number(month.slice(5, 7)) - 1].toLowerCase()} выполнен` : `В ${MONTHS_PREP[Number(month.slice(5, 7)) - 1]} осталось отложить ${money(plan - saved, cur)}`}
            </div>
          </button>
        );
      })()}

      {(() => {
        const me = personal?.members.find(m => m.id === user.id);
        if (!me || (me.limit === 0 && me.spent === 0)) return null;
        const other = personal.members.find(m => m.id !== user.id);
        return (
          <div className="card-pad">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}><IconLock size={15} stroke={1.6} /> Мои личные</span>
              <span className="num" style={{ fontSize: 13 }}>{money(me.spent, cur)}{me.limit > 0 && <span className="muted"> из {money(me.limit, cur)}</span>}</span>
            </div>
            {me.limit > 0 && (
              <div className="progress">
                <div className="progress-fill" style={{ width: `${Math.min(100, (me.spent / me.limit) * 100)}%`, background: me.spent > me.limit ? 'var(--danger)' : 'var(--ink)' }} />
              </div>
            )}
            {other && (other.limit > 0 || other.spent > 0) && (
              <div className="row-sub" style={{ marginTop: 8 }}>
                {other.first_name}: {money(other.spent, cur)}{other.limit > 0 ? ` из ${money(other.limit, cur)}` : ''}
              </div>
            )}
          </div>
        );
      })()}

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
          <SpriteAnim name="idle" width={120} />
          <div className="empty-text">В этом месяце трат пока нет</div>
          <button className="btn" style={{ maxWidth: 220 }} onClick={onAdd}>Добавить расход</button>
        </div>
      )}

      {celebrate && (
        <Celebration
          anim="highfive"
          label="в расчёте"
          title={money(celebrate.amount, cur)}
          subtitle={`${celebrate.from} → ${celebrate.to}. Долг закрыт, можно тратить дальше`}
          onClose={() => setCelebrate(null)}
        />
      )}
    </div>
  );
}
