// The part of the screen above the iPhone keyboard. Bottom sheets size themselves to it, so typing
// in a lower field doesn't make iOS scroll the whole page on every key (the caret used to jitter).
export function watchViewport() {
  const vv = window.visualViewport;
  if (!vv) return;
  let frame = 0;
  const apply = () => {
    frame = 0;
    const root = document.documentElement.style;
    root.setProperty('--vv-height', `${vv.height}px`);
    root.setProperty('--vv-top', `${vv.offsetTop}px`);
  };
  const schedule = () => { if (!frame) frame = requestAnimationFrame(apply); };
  vv.addEventListener('resize', schedule);
  vv.addEventListener('scroll', schedule);
  apply();
}
