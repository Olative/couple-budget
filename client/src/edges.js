// Scalloped and perforated cards. iOS draws repeated mask circles unevenly (the last row came out cut),
// so each card gets its own SVG outline built for its exact size: whole circles on every side.
const STEP = { scallop: 20, stamp: 12 };
// iOS rasterises an SVG mask at its own pixel size; drawing it 4x larger keeps the edges sharp on retina screens.
const SHARP = 4;

const centres = (length, step) => {
  const n = Math.max(1, Math.round(length / step));
  return Array.from({ length: n }, (_, i) => (length / n) * (i + 0.5));
};

// Inner rectangle plus a bump on every edge.
function scallopSvg(w, h) {
  const r = 10;
  const dots = [
    ...centres(w, STEP.scallop).flatMap(x => [[x, r], [x, h - r]]),
    ...centres(h, STEP.scallop).flatMap(y => [[r, y], [w - r, y]]),
  ];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w * SHARP}" height="${h * SHARP}" viewBox="0 0 ${w} ${h}">`
    + `<rect x="${r}" y="${r}" width="${w - 2 * r}" height="${h - 2 * r}"/>`
    + dots.map(([x, y]) => `<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="${r}"/>`).join('')
    + '</svg>';
}

// Full card with half-holes along every edge, drawn as one outline (like the scalloped card):
// going round clockwise, each hole is an arc that dips into the card.
function stampSvg(w, h) {
  const r = 4;
  const f = (n) => n.toFixed(2);
  const xs = centres(w, STEP.stamp), ys = centres(h, STEP.stamp);
  let d = 'M0 0';
  for (const x of xs) d += ` L${f(x - r)} 0 A${r} ${r} 0 0 0 ${f(x + r)} 0`;
  d += ` L${w} 0`;
  for (const y of ys) d += ` L${w} ${f(y - r)} A${r} ${r} 0 0 0 ${w} ${f(y + r)}`;
  d += ` L${w} ${h}`;
  for (const x of [...xs].reverse()) d += ` L${f(x + r)} ${h} A${r} ${r} 0 0 0 ${f(x - r)} ${h}`;
  d += ` L0 ${h}`;
  for (const y of [...ys].reverse()) d += ` L0 ${f(y + r)} A${r} ${r} 0 0 0 0 ${f(y - r)}`;
  d += ' Z';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w * SHARP}" height="${h * SHARP}" viewBox="0 0 ${w} ${h}"><path d="${d}"/></svg>`;
}

function fit(el) {
  const w = el.offsetWidth, h = el.offsetHeight;
  if (!w || !h || (el.dataset.edges === `${w}x${h}`)) return;
  el.dataset.edges = `${w}x${h}`;
  const svg = el.classList.contains('scallop') ? scallopSvg(w, h) : stampSvg(w, h);
  const mask = `url("data:image/svg+xml,${encodeURIComponent(svg)}") 0 0 / 100% 100% no-repeat`;
  el.style.webkitMask = mask;
  el.style.mask = mask;
}

export function watchEdges() {
  const sizes = new ResizeObserver(entries => entries.forEach(e => fit(e.target)));
  const seen = new WeakSet();
  const scan = (root) => {
    root.querySelectorAll?.('.scallop, .stamp').forEach(el => {
      if (seen.has(el)) return;
      seen.add(el);
      sizes.observe(el);
      fit(el);
    });
  };
  scan(document);
  new MutationObserver(list => list.forEach(m => m.addedNodes.forEach(n => n.nodeType === 1 && (n.matches?.('.scallop, .stamp') ? scan(n.parentNode) : scan(n)))))
    .observe(document.body, { childList: true, subtree: true });
}
