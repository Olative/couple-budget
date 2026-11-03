import { useEffect, useRef } from 'react';
import bump from '../assets/anim/bump.png';
import highfive from '../assets/anim/highfive.png';
import idle from '../assets/anim/idle.png';
import celebrate from '../assets/anim/celebrate.png';

// Sprite sheets of the penguin dances: frames tiled left-to-right, top-to-bottom.
// Drawn on a canvas by a timer so they play everywhere, including iOS Low Power Mode.
// Backgrounds are transparent; in the dark theme the ink turns white unless fixedInk (e.g. on a blue card).
export const ANIMS = {
  bump: { src: bump, frames: 28, cols: 7, size: 640, fps: 24 },
  highfive: { src: highfive, frames: 25, cols: 7, size: 560, fps: 24 },
  idle: { src: idle, frames: 30, cols: 6, size: 480, fps: 12 },
  celebrate: { src: celebrate, frames: 30, cols: 6, size: 520, fps: 12 },
};

export default function SpriteAnim({ name, width = 160, loops = Infinity, onDone, fixedInk = false }) {
  const canvas = useRef(null);
  const done = useRef(onDone);
  done.current = onDone;
  const a = ANIMS[name];

  useEffect(() => {
    const ctx = canvas.current.getContext('2d');
    const img = new Image();
    let timer;
    let stopped = false;
    img.onload = () => {
      const start = performance.now();
      let last = -1;
      const tick = () => {
        if (stopped) return;
        const total = Math.floor(((performance.now() - start) / 1000) * a.fps);
        if (total >= a.frames * loops) {
          done.current?.();
          return;
        }
        if (total !== last) {
          last = total;
          const f = total % a.frames;
          ctx.clearRect(0, 0, a.size, a.size);
          ctx.drawImage(img, (f % a.cols) * a.size, Math.floor(f / a.cols) * a.size, a.size, a.size, 0, 0, a.size, a.size);
        }
        timer = setTimeout(tick, 1000 / a.fps / 2);
      };
      tick();
    };
    img.src = a.src;
    return () => { stopped = true; clearTimeout(timer); };
  }, [name, loops, a]);

  return <canvas ref={canvas} width={a.size} height={a.size} className={fixedInk ? undefined : 'sprite'} style={{ width, height: width, display: 'block' }} aria-hidden="true" />;
}
