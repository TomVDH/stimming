// Solar loop: the zoom rail. One line holds every lens stop and the zoom past them.
// It shows while the zoom moves and leaves 1.4 s after it stops.
// A tap on a stop glides the zoom there.

const RM = matchMedia('(prefers-reduced-motion: reduce)');
const h = (tag, cls, html) => {
  const el = document.createElement(tag);
  if (cls) el.className = cls;
  if (html != null) el.innerHTML = html;
  return el;
};

/**
 * Builds the zoom rail on the stage's frame.
 * @param {{ frame: HTMLElement, stops: [number, string][], max: number, text: (z: number) => string,
 *   cover: () => { top: number, bottom: number }, onPick: (z: number) => void }} o
 */
export function makeRail(o) {
  const link = h('link');
  link.rel = 'stylesheet';
  link.href = new URL('rail.css', import.meta.url).href;
  document.head.append(link);

  const el = h('div', 'sl-rail');
  el.hidden = true;
  el.setAttribute('role', 'group');
  el.setAttribute('aria-label', 'Zoom');
  const now = h('div', 'sl-rail-now');
  now.setAttribute('aria-live', 'polite');
  const track = h('div', 'sl-rail-track');
  // The stretch past the full view is the zoom out, drawn fainter.
  const out = h('i', 'sl-rail-out');
  out.style.left = `${(2 / o.max) * 100}%`;
  const mark = h('i', 'sl-rail-mark');
  track.append(out, mark);
  for (const [z, label] of o.stops) {
    const b = h('button', `sl-rail-stop${z > 2 ? ' sl-rail-stop--out' : ''}`, `<i></i><span>${label}</span>`);
    b.type = 'button';
    b.style.left = `${(z / o.max) * 100}%`;
    b.setAttribute('aria-label', `Zoom to ${label}`);
    b.addEventListener('click', () => o.onPick(z));
    track.append(b);
  }
  el.append(now, track);
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
    // The mark stands at z; the words name where the zoom is going.
    show(z, to) {
      el.style.setProperty('--foot', `${o.cover().bottom}px`);
      mark.style.left = `${(z / o.max) * 100}%`;
      const t = o.text(to);
      if (now.textContent !== t) now.textContent = t;
      for (const b of track.querySelectorAll('.sl-rail-stop')) {
        const at = Number.parseFloat(b.style.left) / 100 * o.max;
        b.toggleAttribute('data-on', Math.abs(at - to) < 0.02);
      }
      el.classList.remove('is-leaving');
      el.hidden = false;
      later();
    },
    hide,
  };
}
