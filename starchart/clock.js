// Star catalog: the time clock (Tom, 2026-11-24).
// One faint line over the zoom rail: a small dial, one second's worth, the time passed.
// Plain numbers and words, no powers of ten.
// It shows on a Turn press and with each star card, and leaves after SHOW ms.

const RM = matchMedia('(prefers-reduced-motion: reduce)');
const SHOW = 12000;
const NS = 'http://www.w3.org/2000/svg';
const h = (tag, cls) => {
  const el = document.createElement(tag);
  if (cls) el.className = cls;
  return el;
};
const MIN = 60, HOUR = 3600, DAY = 86400, YEAR = 365.25 * DAY;
// Three significant figures, no trailing zeros.
const sig = v => String(+v.toPrecision(3));
// A value and its unit in words, plural past one.
const unit = (v, w) => `${sig(v)} ${w}${sig(v) === '1' ? '' : 's'}`;

/**
 * A span of time in one unit, three figures.
 * @param {number} s Seconds.
 */
export function span(s) {
  if (s < 1) return `${sig(s * 1000)} ms`;
  if (s < MIN) return unit(s, 'second');
  if (s < HOUR) return unit(s / MIN, 'minute');
  if (s < 2 * DAY) return unit(s / HOUR, 'hour');
  if (s < 2 * YEAR) return unit(s / DAY, 'day');
  return unit(s / YEAR, 'year');
}

/**
 * Elapsed time, two units, in short form.
 * @param {number} s Seconds.
 */
export function elapsed(s) {
  const two = (u1, w1, u2, w2) => {
    const a = Math.floor(s / u1), b = Math.floor(s % u1 / u2);
    return b ? `${a} ${w1} ${String(b).padStart(2, '0')} ${w2}` : `${a} ${w1}`;
  };
  if (s < MIN) return `${s.toFixed(1)} s`;
  if (s < HOUR) return two(MIN, 'min', 1, 's');
  if (s < DAY) return two(HOUR, 'h', MIN, 'min');
  if (s < YEAR) return two(DAY, 'd', HOUR, 'h');
  return `${(s / YEAR).toFixed(2)} yr`;
}

/**
 * Builds the clock on the stage's frame.
 * @param {{ frame: HTMLElement, cover: () => { top: number, bottom: number } }} o
 */
export function makeClock(o) {
  const link = h('link');
  link.rel = 'stylesheet';
  link.href = new URL('clock.css', import.meta.url).href;
  document.head.append(link);

  const el = h('div', 'sl-clock');
  el.hidden = true;
  el.setAttribute('aria-hidden', 'true');
  // The dial: a ring and a hand at the turn's phase.
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '-8 -8 16 16');
  const ring = document.createElementNS(NS, 'circle');
  ring.setAttribute('r', '6.5');
  const hand = document.createElementNS(NS, 'line');
  hand.setAttribute('x1', '0'); hand.setAttribute('y1', '0');
  svg.append(ring, hand);
  // Two equal halves round the dot, so the dot stands over the rail's middle.
  const left = h('span', 'sl-clock-l'), rate = h('span', 'sl-clock-r'), dot = h('span', 'sl-clock-s'), past = h('span', 'sl-clock-p');
  dot.textContent = '·';
  left.append(svg, rate);
  el.append(left, dot, past);
  o.frame.append(el);

  let key = '', t0 = 0, until = 0, timer = 0;
  const text = (node, s) => { if (node.textContent !== s) node.textContent = s; };
  function hide() {
    if (el.hidden) return;
    el.classList.add('is-leaving');
    clearTimeout(timer);
    timer = setTimeout(() => { el.hidden = true; el.classList.remove('is-leaving'); }, RM.matches ? 0 : 100);
  }
  const api = {
    /**
     * Starts the count from the star's time now; a star with no clock hides it.
     * @param {string} k The star's key.
     * @param {{ kind: string, days: number, rate: number, t: number, phase: number } | null} c
     */
    show(k, c) {
      if (!c) { hide(); return; }
      key = k; t0 = c.t;
      until = performance.now() + SHOW;
      clearTimeout(timer);
      el.style.setProperty('--foot', `${o.cover().bottom}px`);
      el.classList.remove('is-leaving');
      el.hidden = false;
      api.tick(k, c);
    },
    /** Updates the line; true while the clock stands. */
    tick(k, c) {
      if (el.hidden || el.classList.contains('is-leaving')) return false;
      if (!c) { hide(); return false; }
      // A new star restarts the count.
      if (k !== key) { key = k; t0 = c.t; }
      if (performance.now() > until) { hide(); return false; }
      text(rate, c.rate < 1.5 && c.rate > 0.95 ? 'real time' : `1 s = ${span(c.rate)}`);
      text(past, `+${elapsed(Math.max(0, c.t - t0))}`);
      const a = c.phase * 2 * Math.PI;
      hand.setAttribute('x2', (6.5 * Math.sin(a)).toFixed(2));
      hand.setAttribute('y2', (-6.5 * Math.cos(a)).toFixed(2));
      return true;
    },
    hide,
  };
  return api;
}
