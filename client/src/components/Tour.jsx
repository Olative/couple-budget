import { useState, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { t } from '../i18n';

// Guided tour over the real screen: dims everything but one element and explains it.
// Elements are found by their data-tour attribute; a step whose element isn't on screen is skipped.
const STEPS = [
  { target: 'budget', title: 'Ваш бюджет', text: 'Нажмите, чтобы переключиться на другой бюджет или завести новый — например, на поездку.' },
  { target: 'month', title: 'Месяц', text: 'Стрелками листайте месяцы и смотрите, как было раньше.' },
  { target: 'settings', title: 'Настройки', text: 'Пригласить второго, валюта, доли в общих тратах, тёмная тема и уведомления.' },
  { target: 'spent', title: 'Сколько потрачено', text: 'Все траты за месяц и сколько осталось до лимита. Ниже — сколько уйдёт к концу месяца, если тратить в том же темпе.' },
  { target: 'members', title: 'Кто сколько потратил', text: 'Покупки каждого для себя за месяц. Они тоже входят в «Потрачено» — все траты идут из общего бюджета.' },
  { target: 'add', title: 'Добавить трату', text: 'Главная кнопка: расход или доход, можно с фото чека и повтором каждый месяц.' },
  { target: 'expenses', title: 'Операции', text: 'Все траты и доходы по дням. Нажмите на трату, чтобы поставить реакцию или написать комментарий.' },
  { target: 'plan', title: 'План на месяц', text: 'Лимиты по категориям и регулярные платежи вроде аренды и подписок.' },
  { target: 'savings', title: 'Копилка', text: 'Общие цели: сколько нужно, сколько отложено и когда накопите.' },
];

const PAD = 6;

function findTarget(name) {
  const el = document.querySelector(`[data-tour="${name}"]`);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return r.width && r.height ? el : null;
}

export default function Tour({ onDone }) {
  const steps = STEPS.filter(s => findTarget(s.target));
  const [i, setI] = useState(0);
  const [rect, setRect] = useState(null);
  const step = steps[i];

  useLayoutEffect(() => {
    if (!step) return;
    const el = findTarget(step.target);
    if (!el) return;
    el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    const measure = () => setRect(el.getBoundingClientRect());
    measure();
    // Smooth scrolling keeps moving the element, so follow every scroll frame.
    window.addEventListener('scroll', measure, true);
    window.addEventListener('resize', measure);
    const timer = setTimeout(measure, 700);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('scroll', measure, true);
      window.removeEventListener('resize', measure);
    };
  }, [step]);

  useEffect(() => { if (!steps.length) onDone(); }, [steps.length, onDone]);

  if (!step || !rect) return null;
  const last = i === steps.length - 1;
  const below = rect.top + rect.height / 2 < window.innerHeight / 2;
  const radius = Math.min(24, (rect.height + PAD * 2) / 2);

  return createPortal(
    <div className="tour">
      <div
        className="tour-hole"
        style={{ left: rect.left - PAD, top: rect.top - PAD, width: rect.width + PAD * 2, height: rect.height + PAD * 2, borderRadius: radius }}
      />
      <div
        className="tour-card"
        style={below ? { top: rect.bottom + PAD + 12 } : { bottom: window.innerHeight - rect.top + PAD + 12 }}
      >
        <div className="tour-count">{t('{i} из {n}', { i: i + 1, n: steps.length })}</div>
        <div className="tour-title">{t(step.title)}</div>
        <div className="tour-text">{t(step.text)}</div>
        <div className="tour-actions">
          <button className="tour-skip" onClick={onDone}>{last ? '' : t('Пропустить')}</button>
          {i > 0 && <button className="btn btn-secondary tour-btn" onClick={() => setI(i - 1)}>{t('Назад')}</button>}
          <button className="btn tour-btn" onClick={() => (last ? onDone() : setI(i + 1))}>{last ? t('Понятно') : t('Дальше')}</button>
        </div>
      </div>
    </div>,
    document.body
  );
}
