// Star catalog: the zoom rail. A dashed left half for the close views, a pip at the full star,
// and a plain right half for the pull-back (Tom, 2026-11-24). No words.
// It shows while the zoom moves and leaves 1.4 s after it stops.
// A tap on the line glides the zoom there.

const RM = matchMedia('(prefers-reduced-motion: reduce)');
const h = (tag, cls) => {
  const el = document.createElement(tag);
  if (cls) el.className = cls;
  return el;
};

/**
 * Builds the zoom rail on the stage's frame.
 * @param {{ frame: HTMLElement, mid: number, max: number, text: (z: number) => string,
 *   cover: () => { top: number, bottom: number }, onPick: (z: number) => void }} o
 * mid is the zoom at the pip; text names a zoom for screen readers.
 */
export function makeRail(o) {
  const link = h('link');
  link.rel = 'stylesheet';
  link.href = new URL('rail.css', import.meta.url).href;
  document.head.append(link);

  // The pip sits at the middle: each half holds its own stretch of the zoom.
  const at = z => z <= o.mid ? 0.5 * z / o.mid : 0.5 + 0.5 * (z - o.mid) / (o.max - o.mid);
  const zAt = p => p <= 0.5 ? 2 * p * o.mid : o.mid + (2 * p - 1) * (o.max - o.mid);

  const el = h('div', 'sl-rail');
  el.hidden = true;
  el.setAttribute('role', 'slider');
  el.setAttribute('aria-label', 'Zoom');
  el.setAttribute('aria-valuemin', '0');
  el.setAttribute('aria-valuemax', String(o.max));
  const mark = h('i', 'sl-rail-mark');
  el.append(h('i', 'sl-rail-near'), h('i', 'sl-rail-far'), h('i', 'sl-rail-pip'), mark);
  el.addEventListener('click', e => {
    const r = el.getBoundingClientRect();
    o.onPick(zAt(Math.min(1, Math.max(0, (e.clientX - r.left) / r.width))));
  });
  o.frame.append(el);

  let timer = 0, held = false;
  // The pointer on the rail keeps it.
  el.addEventListener('pointerenter', () => { held = true; clearTimeout(timer); });
  el.addEventListener('pointerleave', () => { held = false; later(); });
  const later = () => {
    clearTimeout(timer);
    if (!held) timer = setTimeout(hide, 1400);
  };
  function hide() {
    clearTimeout(timer);
    if (el.hidden) return;
    el.classList.add('is-leaving');
    timer = setTimeout(() => { el.hidden = true; el.classList.remove('is-leaving'); }, RM.matches ? 0 : 100);
  }
  return {
    // The mark stands at z; screen readers hear where the zoom is going.
    show(z, to) {
      el.style.setProperty('--foot', `${o.cover().bottom}px`);
      mark.style.left = `${at(z) * 100}%`;
      el.setAttribute('aria-valuenow', to.toFixed(2));
      el.setAttribute('aria-valuetext', o.text(to));
      el.classList.remove('is-leaving');
      el.hidden = false;
      later();
    },
    hide,
  };
}
