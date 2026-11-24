// Solar loop: the star chart, a Hertzsprung-Russell sheet that picks the star.
// Temperature runs across, hot on the left; brightness runs up.
// Each star is a swatch in its own colour, sized by its radius on a log scale.
// The toy owns this sheet; it copies the Bar v3 sheet look.

// Chart data: spectral class as a number (O0 is 0, Y0 is 9), temperature (K),
// and log10 of brightness in suns. Class runs across, as on a classic chart.
// pos nudges a crowded swatch, in chart percent.
// side puts the label right, left, above or below the swatch.
export const CHART = {
  zetaoph: { k: 0.95, t: 34000, l: 4.9, cls: 'O9.5 V', side: 'b' },
  regulus: { k: 1.8, t: 12000, l: 2.5, cls: 'B8 IV', side: 'l' },
  vega: { k: 2.0, t: 9600, l: 1.6, cls: 'A0 V', side: 'r', pos: [0, -1.5] },
  sirius: { k: 2.1, t: 9900, l: 1.4, cls: 'A1 V', side: 'l', pos: [0, 2.5] },
  procyon: { k: 3.5, t: 6500, l: 0.85, cls: 'F5 IV', side: 't' },
  sun: { k: 4.2, t: 5772, l: 0, cls: 'G2 V', side: 'b' },
  epseri: { k: 5.2, t: 5080, l: -0.47, cls: 'K2 V', side: 'r' },
  proxima: { k: 6.55, t: 3040, l: -2.8, cls: 'M5.5 V', side: 'l' },
  luhman: { k: 7.9, t: 1300, l: -4.7, cls: 'L7.5 + T0.5', side: 'l' },
  wise: { k: 9.4, t: 285, l: -7.2, cls: 'Y4', side: 'l' },
  ttauri: { k: 5.0, t: 4000, l: 0.85, cls: 'K0 protostar', side: 'r' },
  arcturus: { k: 5.15, t: 4290, l: 2.2, cls: 'K1.5 III red giant', side: 'r' },
  rigel: { k: 1.8, t: 12100, l: 5.1, cls: 'B8 Ia supergiant', side: 'r' },
  betelgeuse: { k: 6.1, t: 3600, l: 5.1, cls: 'M1 Ia supergiant', side: 'l', pos: [0, 1.5] },
  vycma: { k: 6.5, t: 3490, l: 5.4, cls: 'M5 Ia hypergiant', side: 'r', pos: [1.5, -2.5] },
  siriusb: { k: 1.1, t: 25000, l: -1.25, cls: 'DA2 white dwarf', side: 'r' },
  neutron: { k: -1, t: 700000, l: -1.6, cls: 'neutron star', side: 'r' },
};

// The chart's frame: class across, brightness in log suns up.
const L_TOP = 5.9, L_FOOT = -7.8;
// The pulsar has no class; it stands in a gutter past a break.
const GUTTER = 9;
const xOf = k => k < 0 ? GUTTER * 0.45 : GUTTER + 2 + (k / 10) * (96 - GUTTER);
const yOf = l => 7 + (1 - (l - L_FOOT) / (L_TOP - L_FOOT)) * 82;
// A swatch from 5 px (the pulsar) to 26 px (VY CMa).
const sizeOf = rsun => Math.round(5 + Math.max(0, Math.log10(rsun) + 4.8) / 8 * 21);
const TICKS = [[-1, 'Class'], ...[...'OBAFGKMLTY'].map((c, i) => [i + 0.5, c])];

const fmtR = (rsun, value) => {
  if (value === 'neutron') return '24 km wide';
  if (rsun >= 10) return `${Math.round(rsun).toLocaleString('en').replace(/,/g, ' ')} suns wide`;
  if (rsun > 1) return `${+rsun.toFixed(1)} suns wide`;
  if (rsun === 1) return '1 sun wide';
  return `${rsun < 0.01 ? rsun.toFixed(4) : rsun} of the sun wide`;
};
const fmtT = t => `${t.toLocaleString('en').replace(/,/g, ' ')} K`;

const h = (tag, cls, html) => {
  const el = document.createElement(tag);
  if (cls) el.className = cls;
  if (html != null) el.innerHTML = html;
  return el;
};
const RM = matchMedia('(prefers-reduced-motion: reduce)');
const fr = n => new Promise(r => setTimeout(r, n * 1000 / 30));

/**
 * Builds the star chart sheet on the stage's frame.
 * @param {{ frame: HTMLElement, focusBack: HTMLElement, stars: { value: string, name: string, colour: string, rsun: number }[],
 *   get: () => string, onPick: (v: string) => void, cover: () => { top: number, bottom: number }, onOpen?: (on: boolean) => void }} o
 */
export function makeChart(o) {
  const link = h('link');
  link.rel = 'stylesheet';
  link.href = new URL('chart.css', import.meta.url).href;
  document.head.append(link);

  const glass = h('div', 'sl-glass');
  const el = h('div', 'sl-chart');
  el.hidden = true;
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-label', 'Star chart');
  el.append(h('div', 'sl-hd', '<span>Star</span><em class="sl-hint"></em>'));
  const plot = h('div', 'sl-plot');
  // The quiet frame: the main sequence band, the break, the axes.
  plot.append(h('div', 'sl-axes', `<svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
    <path class="sl-ms" d="M ${xOf(0.3)} ${yOf(5.6)} C ${xOf(1.6)} ${yOf(3.2)}, ${xOf(3.2)} ${yOf(1.4)}, ${xOf(4.6)} ${yOf(-0.4)} S ${xOf(7.2)} ${yOf(-4)}, ${xOf(9.6)} ${yOf(-7.4)}"/>
    <line class="sl-break" x1="${GUTTER}" y1="4" x2="${GUTTER}" y2="92"/>
  </svg>`));
  for (const [at, label] of TICKS) {
    const k = h('span', 'sl-tick', label);
    k.style.left = `${xOf(at)}%`;
    plot.append(k);
  }
  const zone = (cls, label, x, y) => { const z = h('span', `sl-zone ${cls}`, label); z.style.left = `${x}%`; z.style.top = `${y}%`; plot.append(z); };
  zone('', 'Main sequence', xOf(3.3), yOf(-2.2));
  zone('', 'Giants', xOf(8.2), yOf(3.4));
  zone('', 'White dwarfs', xOf(1.6), yOf(-3.4));
  zone('sl-zone--r', 'Brown dwarfs', xOf(9.9), yOf(-3.6));
  zone('sl-zone--up', '↑ Brighter', GUTTER + 2, 3);

  const info = h('div', 'sl-info');
  info.setAttribute('aria-live', 'polite');
  const btns = o.stars.map(s => {
    const c = CHART[s.value];
    const b = h('button', `sl-star sl-star--${c.side}`);
    b.type = 'button';
    b.dataset.value = s.value;
    const size = sizeOf(s.rsun);
    b.style.left = `${xOf(c.k) + (c.pos?.[0] ?? 0)}%`;
    b.style.top = `${yOf(c.l) + (c.pos?.[1] ?? 0)}%`;
    b.style.setProperty('--c', s.colour);
    b.style.setProperty('--d', `${size}px`);
    b.innerHTML = `<i class="sl-sw" aria-hidden="true"></i><span class="sl-name">${s.name}</span>`;
    b.setAttribute('aria-label', `${s.name}, ${c.cls}, ${fmtT(c.t)}, ${fmtR(s.rsun, s.value)}`);
    b.addEventListener('click', async () => {
      o.onPick(s.value);
      sync();
      if (!RM.matches) await fr(2);
      open(false);
    });
    b.addEventListener('pointerenter', () => tell(s));
    b.addEventListener('focus', () => tell(s));
    b.addEventListener('pointerleave', () => tell());
    plot.append(b);
    return { b, s, c };
  });
  el.append(plot, info);
  o.frame.append(glass, el);

  // The foot line names the star in hand: pointed, focused, or the current one.
  function tell(s) {
    const cur = s || o.stars.find(x => x.value === o.get());
    const c = CHART[cur.value];
    info.innerHTML = `<b>${cur.name}</b><span>${c.cls}</span><span>${fmtT(c.t)}</span><span>${fmtR(cur.rsun, cur.value)}</span>`;
  }
  function sync() {
    for (const { b, s } of btns) b.setAttribute('aria-pressed', String(s.value === o.get()));
    if (!el.contains(document.activeElement)) tell();
  }
  const touch = () => matchMedia('(pointer: coarse)').matches;

  let closedAt = 0, run = 0;
  async function open(on) {
    if (on === !el.hidden) return;
    const me = ++run;
    if (on) {
      const c = o.cover();
      el.style.setProperty('--foot', `${c.bottom}px`);
      el.style.setProperty('--head', `${c.top}px`);
      el.querySelector('.sl-hint').textContent = touch() ? 'tap a star' : '← → ↑ ↓ · [ ] · esc';
      sync();
      el.hidden = false;
      glass.dataset.on = '';
      el.classList.remove('is-closing');
      el.classList.toggle('is-landing', !RM.matches);
      btns.find(x => x.s.value === o.get())?.b.focus({ preventScroll: true });
      o.onOpen?.(true);
      if (!RM.matches) { await fr(5); if (me === run) el.classList.remove('is-landing'); }
    } else {
      closedAt = performance.now();
      const inside = el.contains(document.activeElement);
      delete glass.dataset.on;
      if (!RM.matches) { el.classList.add('is-closing'); await fr(2); if (me !== run) return; el.classList.remove('is-closing'); }
      el.hidden = true;
      if (inside) o.focusBack.focus({ preventScroll: true });
      o.onOpen?.(false);
    }
  }
  // A press outside closes the sheet; the press on its own button must not reopen it.
  addEventListener('pointerdown', e => { if (!el.hidden && !el.contains(e.target)) open(false); }, true);

  // Arrows move to the nearest star that way; Enter picks; Escape closes.
  // While the sheet is open, the toy's own keys wait.
  const near = (from, dx, dy) => {
    const a = from.getBoundingClientRect();
    let best = null, bs = Infinity;
    for (const { b } of btns) {
      if (b === from) continue;
      const r = b.getBoundingClientRect();
      const vx = r.left - a.left, vy = r.top - a.top;
      const along = vx * dx + vy * dy;
      if (along <= 1) continue;
      const score = along + 2.5 * Math.abs(vx * dy - vy * dx);
      if (score < bs) { bs = score; best = b; }
    }
    return best;
  };
  addEventListener('keydown', e => {
    if (el.hidden) return;
    const at = btns.find(x => x.b === document.activeElement)?.b || btns.find(x => x.s.value === o.get()).b;
    const dir = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
    if (e.key === 'Escape') { e.preventDefault(); open(false); }
    else if (dir) { e.preventDefault(); near(at, ...dir)?.focus(); }
    else if (e.key === '[' || e.key === ']') {
      e.preventDefault();
      const i = btns.findIndex(x => x.b === at);
      btns[(i + (e.key === ']' ? 1 : -1) + btns.length) % btns.length].b.focus();
    } else if (e.key === 'Tab') {
      // Tab stays inside the sheet.
      const i = btns.findIndex(x => x.b === document.activeElement);
      e.preventDefault();
      btns[(i + (e.shiftKey ? -1 : 1) + btns.length) % btns.length].b.focus();
    }
    // Enter and Space still press the focused star.
    e.stopPropagation();
  }, true);

  return {
    open,
    // A press on the Star button right after an outside close keeps it shut.
    toggle() { if (el.hidden && performance.now() - closedAt < 250) return; open(el.hidden); },
    get isOpen() { return !el.hidden; },
    sync,
  };
}
