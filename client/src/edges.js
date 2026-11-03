// Scalloped and perforated cards repeat a circle along their edges. A whole number of circles only fits
// when the side is a multiple of the step, and iOS ignores the mask "round" mode, so the last circle got cut.
// Here each card gets its exact step per side (--ex, --ey) from its real size.
const STEP = { scallop: 20, stamp: 12 };

function fit(el) {
  const step = el.classList.contains('scallop') ? STEP.scallop : STEP.stamp;
  const { width, height } = el.getBoundingClientRect();
  if (!width || !height) return;
  el.style.setProperty('--ex', `${width / Math.max(1, Math.round(width / step))}px`);
  el.style.setProperty('--ey', `${height / Math.max(1, Math.round(height / step))}px`);
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
