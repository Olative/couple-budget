import { money, thisMonth, shiftMonth, incomeSource, plural } from '../format';

const SHORT = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
const IN_MONTH = ['январе', 'феврале', 'марте', 'апреле', 'мае', 'июне', 'июле', 'августе', 'сентябре', 'октябре', 'ноябре', 'декабре'];
const daysIn = (month) => new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0).getDate();

// Next date each recurring rule will be recorded: later this month if it hasn't happened yet, otherwise next month.
// Shorter months use their last day, like the server does.
function nextRuns(rules) {
  const month = thisMonth();
  const today = new Date().getDate();
  return rules
    .filter(r => r.start_month <= shiftMonth(month, 1))
    .map(r => {
      const doneThisMonth = r.last_month && r.last_month >= month;
      const startsLater = r.start_month > month;
      const m = doneThisMonth || startsLater ? shiftMonth(month, 1) : month;
      const day = Math.min(Number(r.day_of_month), daysIn(m));
      if (m === month && day < today) return null;
      return { ...r, month: m, day };
    })
    .filter(Boolean)
    .sort((a, b) => a.month.localeCompare(b.month) || a.day - b.day);
}

function when(run) {
  const month = thisMonth();
  if (run.month !== month) return `в ${IN_MONTH[Number(run.month.slice(5, 7)) - 1]}`;
  const d = run.day - new Date().getDate();
  if (d === 0) return 'сегодня';
  if (d === 1) return 'завтра';
  return `через ${d} ${plural(d, 'день', 'дня', 'дней')}`;
}

// Planned money that hasn't arrived or left yet — drawn as an outline, unlike real operations.
export default function Upcoming({ rules, currency }) {
  const runs = nextRuns(rules).slice(0, 5);
  if (!runs.length) return null;
  const month = thisMonth();
  const thisMonthRuns = nextRuns(rules).filter(r => r.month === month);
  const out = thisMonthRuns.filter(r => r.kind !== 'income').reduce((s, r) => s + Number(r.amount), 0);
  const inc = thisMonthRuns.filter(r => r.kind === 'income').reduce((s, r) => s + Number(r.amount), 0);

  return (
    <div className="upcoming">
      <div className="upcoming-head">
        <span className="label muted">скоро</span>
        {(out > 0 || inc > 0) && (
          <span className="row-sub" style={{ marginTop: 0 }}>
            до конца месяца{out > 0 && <> спишется <b className="num">{money(out, currency)}</b></>}
            {out > 0 && inc > 0 && ' ·'}{inc > 0 && <> придёт <b className="num good">{money(inc, currency)}</b></>}
          </span>
        )}
      </div>
      {runs.map(r => {
        const income = r.kind === 'income';
        const src = income ? incomeSource(r.source) : null;
        return (
          <div key={r.id} className="upcoming-row">
            <div className="upcoming-date">
              <span className="num">{r.day}</span>
              <span>{SHORT[Number(r.month.slice(5, 7)) - 1]}</span>
            </div>
            <span className="row-ic" style={{ background: 'transparent', border: '1px dashed var(--dash)' }}>{income ? src.icon : r.category_icon}</span>
            <div className="row-main">
              <div className="row-name">{r.description || (income ? src.name : r.category_name)}</div>
              <div className="row-sub">{when(r)}</div>
            </div>
            <span className={`row-amt ${income ? 'good' : 'muted'}`}>{income ? '+' : '−'}{money(r.amount, currency)}</span>
          </div>
        );
      })}
    </div>
  );
}
