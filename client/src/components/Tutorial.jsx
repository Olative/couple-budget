import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import SpriteAnim, { ANIMS } from './SpriteAnim';

// First-run walkthrough: a few slides with dancing penguins, shown once per user.
function slides(joined) {
  return [
    {
      anim: 'bump',
      label: 'привет',
      title: 'Мы Lolo и Pepe',
      text: 'Поможем вести общий бюджет: видно, кто сколько потратил и сколько осталось до конца месяца',
    },
    {
      anim: 'wave',
      label: 'шаг 1',
      title: 'Записывайте траты',
      text: 'Синяя кнопка «+» внизу экрана. Или просто напишите боту в чат «кофе 300» — он сам разберётся с категорией',
    },
    {
      anim: 'sway',
      label: 'шаг 2',
      title: 'Поставьте лимиты',
      text: 'Во вкладке «План» решите, сколько тратить на продукты, кафе и всё остальное. Предупредим, если лимит подходит к концу',
    },
    {
      anim: 'highfive',
      label: 'шаг 3',
      title: 'Копите вместе',
      text: 'В «Копилке» заведите цель и сумму на месяц. Покажем, когда накопите, и напомним, если отстаёте',
    },
    joined
      ? {
        anim: 'dance',
        label: 'шаг 4',
        title: 'Вы уже вдвоём',
        text: 'Траты общие, а кто кому должен, посчитаем сами. В начале месяца пришлём итоги',
      }
      : {
        anim: 'dance',
        label: 'шаг 4',
        title: 'Позовите второго пингвина',
        text: 'Отправьте ссылку-приглашение с главного экрана. Посчитаем, кто кому должен, а в начале месяца пришлём итоги',
      },
  ];
}

export default function Tutorial({ joined, onDone }) {
  const list = slides(joined);
  const [i, setI] = useState(0);
  const s = list[i];
  const last = i === list.length - 1;
  const touchX = useRef(null);

  // Fetch every slide's dance up front so swiping never waits for a picture.
  useEffect(() => {
    for (const slide of list) new Image().src = ANIMS[slide.anim].src;
  }, []);

  // Swipe left or right to change slides, like a story.
  const onTouchStart = (e) => { touchX.current = e.touches[0].clientX; };
  const onTouchEnd = (e) => {
    if (touchX.current == null) return;
    const dx = e.changedTouches[0].clientX - touchX.current;
    touchX.current = null;
    if (dx < -40 && !last) setI(i + 1);
    if (dx > 40 && i > 0) setI(i - 1);
  };

  return createPortal(
    <div className="tutorial" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <button className="tutorial-skip" onClick={onDone}>{last ? '' : 'Пропустить'}</button>
      <div className="tutorial-body" key={i}>
        <SpriteAnim name={s.anim} width="min(64vw, 260px)" />
        <div className="celebration-label">· {s.label} ·</div>
        <div className="celebration-title">{s.title}</div>
        <div className="tutorial-text">{s.text}</div>
      </div>
      <div className="dots">
        {list.map((_, n) => <span key={n} className={n === i ? 'on' : ''} onClick={() => setI(n)} />)}
      </div>
      <button className="btn" style={{ maxWidth: 360 }} onClick={() => (last ? onDone() : setI(i + 1))}>
        {last ? 'Начать' : 'Дальше'}
      </button>
    </div>,
    document.body
  );
}
