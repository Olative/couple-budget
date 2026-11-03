// Scalloped and perforated cards. iOS draws repeated mask circles unevenly (the last row came out cut),
// so each card gets its own SVG outline built for its exact size: whole circles on every side.
const STEP = { scallop: 20, stamp: 12 };

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
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">`
    + `<rect x="${r}" y="${r}" width="${w - 2 * r}" height="${h - 2 * r}"/>`
    + dots.map(([x, y]) => `<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="${r}"/>`).join('')
    + '</svg>';
}

// Full card with half-holes punched along every edge.
function stampSvg(w, h) {
  const r = 4;
  const holes = [
    ...centres(w, STEP.stamp).flatMap(x => [[x, 0], [x, h]]),
    ...centres(h, STEP.stamp).flatMap(y => [[0, y], [w, y]]),
  ];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">`
    + '<defs><mask id="m"><rect width="100%" height="100%" fill="white"/>'
    + holes.map(([x, y]) => `<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="${r}" fill="black"/>`).join('')
    + `</mask></defs><rect width="100%" height="100%" mask="url(#m)"/></svg>`;
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
