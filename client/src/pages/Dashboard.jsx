import { useState, useEffect } from 'react';
import { IconChevronLeft, IconChevronRight, IconChevronDown, IconSettings, IconArrowRight, IconPlus, IconPigMoney } from '@tabler/icons-react';
import { api } from '../api/client';
import { GridLines, Penguin, PenguinPair } from '../components/Art';
import InviteCard from '../components/InviteCard';
import Upcoming from '../components/Upcoming';
import CategoryOps from '../components/CategoryOps';
import { money, MONTHS, MONTHS_GEN, MONTHS_PREP, shiftMonth, thisMonth } from '../format';
import { t, getLang } from '../i18n';

// Month names are lowercase in Russian, capitalised in English.
const monthName = (i) => (getLang() === 'en' ? MONTHS[i] : MONTHS[i].toLowerCase());

function monthLabel(month) {
  const name = monthName(Number(month.slice(5, 7)) - 1);
  if (month.slice(0, 4) === thisMonth().slice(0, 4)) return name;
  return getLang() === 'en' ? `${name} '${month.slice(2, 4)}` : `${name} ${month.slice(2, 4)}`;
}

// Where the month is heading at the current pace (plus recurring payments still to come). Hidden in the
// first two days, when one purchase would swing it wildly.
function ForecastLine({ forecast, currency }) {
  if (!forecast.isCurrent || forecast.spent === 0 || forecast.day < 3) return null;
  const { planned } = forecast;
  const projected = Math.round(forecast.projected / 100) * 100;
  let status = null;
  if (planned > 0) {
    const diff = projected - planned;
    status = diff > 0
      ? <span style={{ color: '#ffb4a8' }}>{t('+{sum} сверх плана', { sum: money(diff, currency) })}</span>
      : <span style={{ color: '#9ee0bd' }}>{t('уложитесь')}</span>;
  }
  return (
    <div style={{ fontSize: 12, marginTop: 12, fontWeight: 300, opacity: 0.85 }}>
      {t('Если тратить так же, к концу месяца уйдёт ≈ {sum}', { sum: money(projected, currency) })}{status && <> · {status}</>}
    </div>
  );
}

export default function Dashboard({ budget, user, refreshKey, onAdd, onOpenRecap, onOpenSettings, onOpenSavings, onOpenBudgets }) {
  const [month, setMonth] = useState(thisMonth);
  const [summary, setSummary] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [goals, setGoals] = useState([]);

  const [rules, setRules] = useState([]);
  const [openCat, setOpenCat] = useState(null);
  const [tick, setTick] = useState(0);

  useEffect(() => { api.getSavings(budget.id).then(setGoals); }, [budget.id, refreshKey]);
  useEffect(() => { api.getRecurring(budget.id).then(setRules); }, [budget.id, refreshKey]);

  useEffect(() => {
    Promise.all([
      api.getSummary(budget.id, month), api.getForecast(budget.id, month),
    ]).then(([s, f]) => {
      setSummary(s);
      setForecast(f);
    });
  }, [budget.id, month, refreshKey, tick]);

  const cur = budget.currency;
  const header = (
    <div className="page-head">
      <button className="budget-pill" data-tour="budget" onClick={onOpenBudgets} aria-label={t('Сменить бюджет')}>
        <span>{budget.name}</span>
        <IconChevronDown size={15} stroke={1.8} />
      </button>
      <div className="head-actions">
        <div className="chip" data-tour="month">
          <button onClick={() => setMonth(m => shiftMonth(m, -1))} aria-label={t('Предыдущий месяц')}><IconChevronLeft size={16} /></button>
          <span>{monthLabel(month)}</span>
          <button onClick={() => setMonth(m => shiftMonth(m, 1))} aria-label={t('Следующий месяц')}><IconChevronRight size={16} /></button>
        </div>
        <button className="icon-btn" data-tour="settings" onClick={onOpenSettings} aria-label={t('Настройки')}><IconSettings size={18} stroke={1.6} /></button>
      </div>
    </div>
  );

  if (!summary || !forecast) return <div className="page">{header}</div>;

  const spent = Number(summary.totalSpent);
  const carry = Number(summary.carryOver || 0);
  // Money left from previous months counts as this month's income (and a shortfall as a minus).
  const income = Number(summary.totalIncome || 0) + carry;
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
            <div className="label" style={{ fontSize: 7 }}>{t('готово')}</div>
            <div style={{ fontSize: 15, marginTop: 2 }}>{t('Итоги {month}', { month: MONTHS_GEN[Number(forecast.recapMonth.slice(5, 7)) - 1] })}</div>
          </div>
          <IconArrowRight size={18} />
        </button>
      )}

      <div className="scallop" data-tour="spent">
        <div className="scallop-in">
          <GridLines color="#fff" opacity={0.07} />
          <div className="rel">
            <div className="label" style={{ opacity: 0.5 }}>{t('· потрачено ·')}</div>
            <div className="num" style={{ fontSize: 30, margin: '10px 0 4px' }}>{money(spent, cur)}</div>
            {planned > 0 ? (
              <>
                <div style={{ fontSize: 12, fontWeight: 300, opacity: 0.5 }}>
                  {t('из {sum}', { sum: money(planned, cur) })} · {remaining >= 0 ? t('осталось {sum}', { sum: money(remaining, cur) }) : t('перерасход {sum}', { sum: money(-remaining, cur) })}
                </div>
                <div className="progress" style={{ background: 'rgba(255,255,255,.12)', marginTop: 14 }}>
                  <div className="progress-fill" style={{ width: `${Math.min(100, (spent / planned) * 100)}%`, background: remaining < 0 ? '#ff8c7e' : '#fff' }} />
                </div>
              </>
            ) : (
              <div style={{ fontSize: 12, fontWeight: 300, opacity: 0.5 }}>{t('лимиты на месяц не заданы')}</div>
            )}
            <ForecastLine forecast={forecast} currency={cur} />
          </div>
        </div>
      </div>

      {income !== 0 || carry !== 0 ? (
        <div className="card-pad" style={{ padding: '14px 12px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 6 }}>
          {[
            [t('Пришло'), `${income < 0 ? '−' : '+'}${money(Math.abs(income), cur)}`, income < 0 ? 'var(--danger)' : 'var(--ok)'],
            [t('Ушло'), money(spent, cur), 'var(--ink)'],
            [income - spent >= 0 ? t('Осталось') : t('Минус'), money(Math.abs(income - spent), cur), income - spent >= 0 ? 'var(--ink)' : 'var(--danger)'],
          ].map(([label, value, color]) => (
            <div key={label} style={{ textAlign: 'center', minWidth: 0 }}>
              <div className="label muted" style={{ fontSize: 7 }}>{label}</div>
              <div className="num" style={{ fontSize: 13, marginTop: 6, color, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{value}</div>
            </div>
          ))}
        </div>
        {carry !== 0 && (
          <div className="row-sub" style={{ textAlign: 'center', marginTop: 8 }}>
            {carry > 0 ? t('в том числе {sum} осталось с прошлого месяца', { sum: money(carry, cur) }) : t('с учётом {sum}, которых не хватило в прошлом месяце', { sum: money(-carry, cur) })}
          </div>
        )}
        </div>
      ) : month === thisMonth() && (
        <button className="btn btn-secondary" style={{ padding: 12, fontSize: 14 }} onClick={() => onAdd('income')}>
          <IconPlus size={16} stroke={1.6} /> {t('Добавить доход')}
        </button>
      )}

      {month === thisMonth() && <Upcoming rules={rules} currency={cur} />}

      {members.length > 0 && (
        <div data-tour="members" style={{ display: 'grid', gridTemplateColumns: members.length > 1 ? '1fr 1fr' : '1fr', gap: 8 }}>
          {members.slice(0, 2).map((m, i) => {
            const inner = (
              <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 6 }}>
                <div style={{ minWidth: 0 }}>
                  <div className="label" style={{ fontSize: 7, color: i ? 'var(--muted)' : '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.first_name}</div>
                  <div className="num" style={{ fontSize: 14, marginTop: 6 }}>{money(m.spent, cur)}</div>
                  {Number(m.personal_limit) > 0 && (
                    <div style={{ fontSize: 11, marginTop: 2, opacity: 0.7, fontWeight: 300 }}>{t('из {sum}', { sum: money(m.personal_limit, cur) })}</div>
                  )}
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

      {(() => {
        const planned = goals.filter(g => Number(g.monthly_plan) > 0 && Number(g.current_amount) < Number(g.target_amount));
        if (month !== thisMonth() || !planned.length) return null;
        const plan = planned.reduce((s, g) => s + Number(g.monthly_plan), 0);
        const saved = planned.reduce((s, g) => s + Math.min(Number(g.month_saved), Number(g.monthly_plan)), 0);
        return (
          <button className="card-pad" onClick={onOpenSavings} style={{ border: 'none', textAlign: 'left', cursor: 'pointer', font: 'inherit', color: 'inherit' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
              <span style={{ fontSize: 14, display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}><IconPigMoney size={16} stroke={1.6} /> {t('В копилку')}</span>
              <span className="num" style={{ fontSize: 13, whiteSpace: 'nowrap' }}>{money(saved, cur)}<span className="muted"> {t('из {sum}', { sum: money(plan, cur) })}</span></span>
            </div>
            <div className="progress">
              <div className="progress-fill" style={{ width: `${Math.min(100, (saved / plan) * 100)}%`, background: saved >= plan ? 'var(--ok)' : 'var(--ink)' }} />
            </div>
            <div className="row-sub" style={{ marginTop: 8 }}>
              {saved >= plan ? t('План на {month} выполнен', { month: monthName(Number(month.slice(5, 7)) - 1) }) : t('В {month} осталось отложить {sum}', { month: MONTHS_PREP[Number(month.slice(5, 7)) - 1], sum: money(plan - saved, cur) })}
            </div>
          </button>
        );
      })()}

      {activeCats.length > 0 ? (
        <div className="card">
          {activeCats.map(cat => {
            const f = forecastById[cat.id];
            const over = cat.planned_amount > 0 && cat.spent > cat.planned_amount;
            let note = cat.planned_amount > 0 ? t('из {sum}', { sum: money(cat.planned_amount, cur) }) : t('без лимита');
            let warn = false;
            if (f?.exhausted) { note = over ? t('перерасход {sum}', { sum: money(cat.spent - cat.planned_amount, cur) }) : t('лимит исчерпан'); warn = true; }
            else if (f?.runsOutDay) { note = t('лимит закончится к {day}-му', { day: f.runsOutDay }); warn = true; }
            return (
              <div key={cat.id} className="row" style={{ cursor: 'pointer' }} onClick={() => setOpenCat(cat)}>
                <span className="row-ic">{cat.icon}</span>
                <div className="row-main">
                  <div className="row-name">{t(cat.name)}</div>
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
          <div className="empty-text">{t('В этом месяце трат пока нет')}</div>
          <button className="btn" style={{ maxWidth: 220 }} onClick={onAdd}>{t('Добавить расход')}</button>
        </div>
      )}

      {openCat && (
        <CategoryOps budget={budget} user={user} category={openCat} month={month} onClose={() => setOpenCat(null)} onChanged={() => setTick(t => t + 1)} />
      )}
    </div>
  );
}
