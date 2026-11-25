// Star catalog: the time clock (Tom, 2026-11-24).
// It reads like an instrument: the star's own period, the speed-up, the time passed.
// Plain numbers and words, no powers of ten (Tom, 2026-11-24).
// A dial shows the turn's phase; an arc sweeps the part turned since the clock showed.
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
  if (s < MIN) return `${sig(s)} s`;
  if (s < HOUR) return `${sig(s / MIN)} min`;
  if (s < 2 * DAY) return unit(s / HOUR, 'hour');
  if (s < 2 * YEAR) return unit(s / DAY, 'day');
  return unit(s / YEAR, 'year');
}

/**
 * Elapsed time, two units, in the instrument's short form.
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

// Two significant figures, with thousands separators.
const two = v => (+v.toPrecision(2)).toLocaleString('en-US');
/**
 * The speed-up in plain numbers: ×26,000, ×9.9 million; a slowed clock reads 18× slower.
 * @param {number} r Star seconds per screen second.
 */
export function factor(r) {
  if (r < 0.95) return `${Math.round(1 / r)}× slower`;
  if (r < 1e6) return `×${two(r)}`;
  if (r < 1e9) return `×${two(r / 1e6)} million`;
  return `×${two(r / 1e9)} billion`;
}

// Each kind's period label.
const KIND = { rot: 'turns in', orb: 'orbits in', s2: 'S2 orbit', spin: 'spins in' };

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
  // The dial: a ring, the swept arc, the hand, and the factor under it.
  const dialBox = h('div', 'sl-clock-d');
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '-20 -20 40 40');
  const ring = document.createElementNS(NS, 'circle');
  ring.setAttribute('r', '16');
  ring.setAttribute('class', 'ring');
  const arc = document.createElementNS(NS, 'path');
  arc.setAttribute('class', 'arc');
  const hand = document.createElementNS(NS, 'line');
  hand.setAttribute('class', 'hand');
  hand.setAttribute('x1', '0'); hand.setAttribute('y1', '0');
  svg.append(ring, arc, hand);
  const fac = h('p', 'sl-clock-f');
  dialBox.append(svg, fac);
  // The readout: three rows of label and value.
  const grid = h('dl', 'sl-clock-g');
  const row = () => { const dt = h('dt'), dd = h('dd'); grid.append(dt, dd); return [dt, dd]; };
  const rP = row(), rS = row(), rT = row();
  rS[0].textContent = '1 s here';
  rT[0].textContent = 'passed';
  el.append(dialBox, grid);
  o.frame.append(el);

  let key = '', t0 = 0, ph0 = 0, until = 0, timer = 0;
  const text = (node, s) => { if (node.textContent !== s) node.textContent = s; };
  function hide() {
    if (el.hidden) return;
    el.classList.add('is-leaving');
    clearTimeout(timer);
    timer = setTimeout(() => { el.hidden = true; el.classList.remove('is-leaving'); }, RM.matches ? 0 : 1200);
  }
  // The hand and the arc from the start phase, both clockwise from the top.
  function dial(ph, turned) {
    const a = ph * 2 * Math.PI;
    hand.setAttribute('x2', (16 * Math.sin(a)).toFixed(2));
    hand.setAttribute('y2', (-16 * Math.cos(a)).toFixed(2));
    // One full turn or more closes the ring.
    if (turned >= 1) { arc.setAttribute('d', 'M0,-16A16,16 0 1 1 0,16A16,16 0 1 1 0,-16'); return; }
    const a0 = ph0 * 2 * Math.PI, a1 = a0 + turned * 2 * Math.PI;
    const p = b => `${(16 * Math.sin(b)).toFixed(2)},${(-16 * Math.cos(b)).toFixed(2)}`;
    arc.setAttribute('d', turned > 1e-4 ? `M${p(a0)}A16,16 0 ${turned > 0.5 ? 1 : 0} 1 ${p(a1)}` : '');
  }
  const api = {
    /**
     * Starts the count from the star's time now; a star with no clock hides it.
     * @param {string} k The star's key.
     * @param {{ kind: string, days: number, rate: number, t: number, phase: number } | null} c
     */
    show(k, c) {
      if (!c) { hide(); return; }
      key = k; t0 = c.t; ph0 = c.phase;
      until = performance.now() + SHOW;
      clearTimeout(timer);
      el.style.setProperty('--foot', `${o.cover().bottom}px`);
      el.classList.remove('is-leaving');
      el.hidden = false;
      api.tick(k, c);
    },
    /** Updates the readout; true while the clock stands. */
    tick(k, c) {
      if (el.hidden || el.classList.contains('is-leaving')) return false;
      if (!c) { hide(); return false; }
      // A new star restarts the count.
      if (k !== key) { key = k; t0 = c.t; ph0 = c.phase; }
      if (performance.now() > until) { hide(); return false; }
      const P = c.days * DAY, d = Math.max(0, c.t - t0);
      text(rP[0], KIND[c.kind] || 'period');
      text(rP[1], span(P));
      text(rS[1], span(c.rate));
      text(rT[1], `+${elapsed(d)}`);
      text(fac, factor(c.rate));
      dial(c.phase, d / P);
      return true;
    },
    hide,
  };
  return api;
}
