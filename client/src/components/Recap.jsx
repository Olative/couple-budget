import { useState, useEffect, useRef } from 'react';
import { IconArrowLeft, IconArrowRight, IconX, IconAlertCircle } from '@tabler/icons-react';
import { api } from '../api/client';
import { GridLines, Penguin, PenguinPair, Ring } from './Art';
import { money, num, monthIndex, shiftMonth, byMonth, MONTHS, MONTHS_GEN, MONTHS_PREP } from '../format';

const BLUE = { bg: 'var(--blue-grad)', fg: '#fff', mut: 'rgba(255,255,255,.75)', back: '#7fb7ee' };
const BLACK = { bg: '#111', fg: '#fff', mut: 'rgba(255,255,255,.45)', back: '#3a3a3a', cls: 'scallop' };
const WHITE = { bg: '#fafafa', fg: '#111', mut: '#9a9a9a', back: '#d6d6d6', cls: 'stamp' };
const SAGE = { bg: 'var(--sage)', fg: '#fff', mut: 'rgba(255,255,255,.65)', back: '#6f7f6d' };
const SAND = { bg: 'var(--sand)', fg: '#2b2418', mut: 'rgba(43,36,24,.55)', back: '#b7a88f' };

function buildCards(r, cur) {
  const mi = monthIndex(r.month);
  if (!r.hasData) {
    return [{ ...BLUE, body: <PenguinPair height={130} />, title: `Итоги ${MONTHS_GEN[mi]}`, sub: `В ${MONTHS_PREP[mi]} трат не было. Пингвины отдыхали` }];
  }

  const cards = [{
    ...BLUE,
    grid: true,
    body: <PenguinPair height={140} />,
    title: `Итоги ${MONTHS_GEN[mi]}`,
    sub: 'Листайте, чтобы узнать, как прошёл месяц',
  }];

  const diff = r.totalPlanned - r.totalSpent;
  cards.push({
    ...BLACK,
    grid: true,
    body: (
      <div style={{ width: '100%' }}>
        <div className="big">{money(r.totalSpent, cur)}</div>
        {r.totalPlanned > 0 && (
          <>
            <div style={{ fontSize: 12, opacity: 0.5, marginTop: 6, fontWeight: 300 }}>из {money(r.totalPlanned, cur)}</div>
            <div className="progress" style={{ background: 'rgba(255,255,255,.12)', margin: '14px 8px 0' }}>
              <div className="progress-fill" style={{ width: `${Math.min(100, (r.totalSpent / r.totalPlanned) * 100)}%`, background: diff < 0 ? '#ff8c7e' : '#fff' }} />
            </div>
          </>
        )}
      </div>
    ),
    title: 'Потратили вместе',
    sub: r.totalPlanned === 0
      ? 'Задайте лимиты, и в следующий раз сравним с планом'
      : diff >= 0 ? `Уложились в план и сэкономили ${money(diff, cur)}` : `Вышли за план на ${money(-diff, cur)}`,
  });

  const t = r.top;
  let topSub = '';
  if (t.prevSpent > 0) {
    const pct = Math.round(((t.spent - t.prevSpent) / t.prevSpent) * 100);
    const prevName = MONTHS_PREP[monthIndex(shiftMonth(r.month, -1))];
    topSub = pct === 0 ? `Столько же, сколько в ${prevName}` : `На ${Math.abs(pct)}% ${pct > 0 ? 'больше' : 'меньше'}, чем в ${prevName}`;
  } else {
    topSub = `${Math.round((t.spent / r.totalSpent) * 100)}% всех трат месяца`;
  }
  if (t.limitRunOutDay) topSub += `. Лимит закончился ${t.limitRunOutDay}-го`;
  cards.push({
    ...SAGE,
    body: (
      <>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 66, height: 66, borderRadius: '50%', border: '1.2px solid rgba(255,255,255,.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30 }}>{t.icon}</div>
          <Penguin height={90} mirror />
        </div>
        <div className="big" style={{ marginTop: 6 }}>{money(t.spent, cur)}</div>
      </>
    ),
    title: `Больше всего ушло на «${t.name}»`,
    sub: topSub,
  });

  if (r.byMember.length >= 2) {
    const [a, b] = r.byMember;
    const total = a.spent + b.spent || 1;
    const pa = Math.round((a.spent / total) * 100);
    const max = Math.max(a.spent, b.spent) || 1;
    const bar = (m, i) => (
      <div key={m.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
        <Penguin height={46} mirror={i === 1} />
        <div style={{ width: 48, height: Math.max(8, (m.spent / max) * 100), borderRadius: '10px 10px 4px 4px', background: i ? '#111' : 'var(--blue-grad-soft)' }} />
        <div style={{ fontSize: 11, fontWeight: 300 }}>{m.first_name}</div>
        <div className="num" style={{ fontSize: 11 }}>{num(m.spent)}</div>
      </div>
    );
    cards.push({
      ...WHITE,
      grid: true,
      body: <div style={{ display: 'flex', alignItems: 'flex-end', gap: 30 }}>{[a, b].map(bar)}</div>,
      title: 'Кто сколько потратил',
      sub: `${a.first_name} — ${pa}%, ${b.first_name} — ${100 - pa}%.${Math.abs(pa - 50) <= 5 ? ' Почти поровну' : ''}`,
    });
  }

  if (r.biggest) {
    const d = r.biggest.date;
    cards.push({
      ...SAND,
      body: (
        <>
          <div style={{ fontSize: 40 }}>{r.biggest.category_icon}</div>
          <div className="big">{money(r.biggest.amount, cur)}</div>
          <div style={{ fontSize: 12, opacity: 0.6, fontWeight: 300 }}>
            {Number(d.slice(8, 10))} {MONTHS_GEN[monthIndex(d)]} · {r.biggest.category_name} · {r.biggest.user_name}
          </div>
        </>
      ),
      title: 'Самая большая трата',
      sub: r.biggest.description || r.biggest.category_name,
    });
  }

  if (r.goal) {
    const g = r.goal;
    const pct = g.target > 0 ? (g.current / g.target) * 100 : 0;
    let sub = `${g.name}: ${num(g.current)} из ${num(g.target)}.`;
    if (g.current >= g.target) sub += ' Цель достигнута!';
    else if (g.etaMonth) sub += ` При таком темпе накопите к ${byMonth(g.etaMonth)}`;
    cards.push({
      ...BLUE,
      grid: true,
      body: (
        <>
          <Ring size={140} percent={pct} color="#fff" track="rgba(255,255,255,.35)"><PenguinPair height={66} /></Ring>
          <div className="big" style={{ fontSize: 22 }}>{r.saved > 0 ? `+ ${money(r.saved, cur)}` : money(g.current, cur)}</div>
        </>
      ),
      title: r.saved > 0 ? 'Отложили в копилку' : 'Копилка',
      sub,
    });
  }

  const n = r.next;
  if (n.months > 0) {
    const nextName = MONTHS_PREP[monthIndex(shiftMonth(r.month, 1))];
    const line = (label, value, key) => (
      <div key={key} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, padding: '9px 0', borderBottom: '1px solid rgba(255,255,255,.08)' }}>
        <span style={{ opacity: 0.6, textAlign: 'left' }}>{label}</span>
        <span className="num" style={{ whiteSpace: 'nowrap' }}>{value}</span>
      </div>
    );
    cards.push({
      ...BLACK,
      body: (
        <div style={{ width: '100%', fontSize: 12, fontWeight: 300 }}>
          {line('Обычно за месяц', `~ ${num(n.total)}`, 'total')}
          {n.top.map((c, i) => line(c.name, `~ ${num(c.avg)}`, i))}
          {n.warnings.map((w, i) => (
            <div key={`w${i}`} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', paddingTop: 10, color: '#ffb4a8', textAlign: 'left' }}>
              <IconAlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>{w.name}: обычно ~{num(w.avg)} при лимите {num(w.planned)}</span>
            </div>
          ))}
        </div>
      ),
      title: `Что ждёт в ${nextName}`,
      sub: n.months > 1 ? 'Прогноз по вашим тратам за последние месяцы' : 'Прогноз по тратам этого месяца',
    });
  }

  return cards;
}

export default function Recap({ budget, month, onClose }) {
  const [recap, setRecap] = useState(null);
  const [i, setI] = useState(0);
  const [anim, setAnim] = useState(null);
  const startX = useRef(null);

  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => { api.getRecap(budget.id, month).then(setRecap).catch(() => closeRef.current()); }, [budget.id, month]);

  if (!recap) {
    return <div className="recap"><div className="loading" style={{ minHeight: 0, flex: 1 }}><div><PenguinPair height={70} /></div></div></div>;
  }

  const cards = buildCards(recap, budget.currency);
  const n = cards.length;
  const c = cards[i];

  const go = (d) => {
    const j = i + d;
    if (j < 0 || j >= n || anim) return;
    setAnim(d > 0 ? 'out-left' : 'out-right');
    setTimeout(() => { setI(j); setAnim(d > 0 ? 'in-right' : 'in-left'); requestAnimationFrame(() => requestAnimationFrame(() => setAnim(null))); }, 200);
  };

  const frontStyle = {
    'out-left': { transform: 'translateX(-40px) rotate(-4deg)', opacity: 0 },
    'out-right': { transform: 'translateX(40px) rotate(4deg)', opacity: 0 },
    'in-right': { transform: 'translateX(30px)', opacity: 0, transition: 'none' },
    'in-left': { transform: 'translateX(-30px)', opacity: 0, transition: 'none' },
  }[anim] || {};

  const back1 = cards[i + 1];
  const back2 = cards[i + 2];

  return (
    <div className="recap">
      <div className="recap-top">
        <div className="h-title">{MONTHS[monthIndex(month)]} {month.slice(0, 4)}</div>
        <button className="icon-btn" onClick={onClose} aria-label="Закрыть"><IconX size={18} /></button>
      </div>

      <div
        className="recap-stage"
        onPointerDown={e => { startX.current = e.clientX; }}
        onPointerUp={e => {
          if (startX.current === null) return;
          const dx = e.clientX - startX.current;
          startX.current = null;
          if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
        }}
      >
        {i > 0 && <button className="recap-arrow prev" onClick={() => go(-1)} aria-label="Назад"><IconArrowLeft size={18} /></button>}
        <div className="deck">
          {back2 && <div className="deck-back" style={{ background: back2.back, transform: 'rotate(-3deg) translate(-6px, 8px)' }} />}
          {back1 && <div className="deck-back" style={{ background: back1.back, transform: 'rotate(4deg) translate(8px, 4px)' }} />}
          <div className="deck-front" style={frontStyle}>
            <div className={`rcard ${c.cls || ''}`} style={{ background: c.bg, color: c.fg }}>
              {c.grid && <GridLines color={c.fg} opacity={c.fg === '#111' ? 0.06 : c.cls ? 0.08 : 0.3} />}
              <div className="rcard-top"><span>{i + 1} из {n}</span><span className="label" style={{ fontSize: 7 }}>lolo &amp; pepe</span></div>
              <div className="rcard-body">{c.body}</div>
              <div className="rcard-title">{c.title}</div>
              <div className="rcard-sub" style={{ color: c.mut }}>{c.sub}</div>
            </div>
          </div>
        </div>
        {i < n - 1 && <button className="recap-arrow next" onClick={() => go(1)} aria-label="Дальше"><IconArrowRight size={18} /></button>}
      </div>

      <div className="dots">{cards.map((_, k) => <span key={k} className={k === i ? 'on' : ''} />)}</div>
      {i === n - 1 && <button className="btn" style={{ maxWidth: 320, marginTop: 16 }} onClick={onClose}>Готово</button>}
    </div>
  );
}
