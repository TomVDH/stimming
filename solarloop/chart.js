// Star catalog: the star tray, a size ladder that picks the star.
// Every object stands on one ribbon, smallest to largest (Tom, 2026-11-24).
// The ribbon scrolls and pages when it holds more than fit; it never crowds.
// Each star is a swatch in its own colour, sized by its radius on a log scale.
// The toy owns this sheet; it copies the Bar v3 sheet look.

import { FACTS } from './facts.js';

// Star data: the class or stage, and the surface temperature (K).
// A black hole has no surface temperature: t is null.
// kind: how the swatch draws the body; a plain star leaves it out (Tom, 2026-11-24).
// brown, proto, wind, tzo, ringed, binary, dwarf, pulsar, hole, quasar.
export const CHART = {
  zetaoph: { t: 34000, cls: 'O9.5 V' },
  regulus: { t: 12000, cls: 'B8 IV' },
  vega: { t: 9600, cls: 'A0 V' },
  sirius: { t: 9900, cls: 'A1 V' },
  procyon: { t: 6500, cls: 'F5 IV' },
  sun: { t: 5772, cls: 'G2 V' },
  epseri: { t: 5080, cls: 'K2 V' },
  proxima: { t: 3040, cls: 'M5.5 V' },
  luhman: { kind: 'brown', t: 1300, cls: 'L7.5 + T0.5' },
  wise: { kind: 'brown', t: 285, cls: 'Y4' },
  ttauri: { kind: 'proto', t: 4000, cls: 'K0 protostar' },
  arcturus: { t: 4290, cls: 'K1.5 III red giant' },
  rigel: { t: 12100, cls: 'B8 Ia supergiant' },
  betelgeuse: { t: 3600, cls: 'M1 Ia supergiant' },
  vycma: { t: 3490, cls: 'M5 Ia hypergiant' },
  wr124: { kind: 'wind', t: 44700, cls: 'WN8h Wolf-Rayet' },
  tzo: { kind: 'tzo', t: 3500, cls: 'Thorne–Żytkow object, predicted' },
  fomalhaut: { kind: 'ringed', t: 8590, cls: 'A3 V, a dust belt' },
  betalyr: { kind: 'binary', t: 13300, cls: 'B7 II donor, interacting binary' },
  s5hvs1: { t: null, cls: 'A-type hypervelocity star' },
  siriusb: { kind: 'dwarf', t: 25000, cls: 'DA2 white dwarf' },
  neutron: { kind: 'pulsar', t: 700000, cls: 'neutron star' },
  cygx1: { kind: 'hole', t: null, cls: 'stellar black hole' },
  sgra: { kind: 'hole', t: null, cls: 'supermassive black hole' },
  qso: { kind: 'quasar', t: null, cls: 'quasar' },
  st218: { t: 3200, cls: 'red supergiant, the largest known' },
  wohg64: { kind: 'cocoon', t: 3400, cls: 'M7.5 red supergiant in a dust torus' },
  quasi: { kind: 'core', t: 4000, cls: 'quasi-star, a model' },
  wr140: { kind: 'shells', t: 70000, cls: 'Wolf-Rayet and O star, colliding winds' },
  vfts352: { kind: 'binary', t: null, cls: 'two O stars in contact' },
  xxtri: { t: 4620, cls: 'K0 III giant, giant starspots' },
  epsaur: { kind: 'disc', t: 7750, cls: 'F0 supergiant, eclipsed by a dark disc' },
};

// A swatch's size, 0 (the pulsar) to 1 (VY CMa), on a log scale of radius.
const sizeOf = rsun => Math.min(1, Math.max(0, (Math.log10(rsun) + 4.8) / 8));

const fmtR = (rsun, value) => {
  if (value === 'neutron') return '24 km wide';
  // A black hole's width is its event horizon's.
  if (value === 'cygx1') return 'horizon 125 km wide';
  if (value === 'sgra') return 'horizon 18 suns wide';
  if (value === 'qso') return 'horizon 1 100 suns wide';
  if (rsun >= 10) return `${Math.round(rsun).toLocaleString('en').replace(/,/g, ' ')} suns wide`;
  if (rsun > 1) return `${+rsun.toFixed(1)} suns wide`;
  if (rsun === 1) return '1 sun wide';
  return `${rsun < 0.01 ? rsun.toFixed(4) : rsun} of the sun wide`;
};
const fmtT = t => t == null ? null : `${t.toLocaleString('en').replace(/,/g, ' ')} K`;

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
  const ribbon = h('div', 'sl-ribbon');
  const ladder = h('div', 'sl-ladder');
  // Page arrows at the ends; each shows only when more lies that way.
  const prev = h('button', 'sl-page sl-page--prev', '‹'), next = h('button', 'sl-page sl-page--next', '›');
  for (const [b, dir, label] of [[prev, -1, 'Earlier stars'], [next, 1, 'Later stars']]) {
    b.type = 'button';
    b.setAttribute('aria-label', label);
    b.tabIndex = -1;
    b.addEventListener('click', () => ladder.scrollBy({ left: dir * ladder.clientWidth * 0.8, behavior: RM.matches ? 'auto' : 'smooth' }));
  }
  ribbon.append(prev, ladder, next);
  const info = h('div', 'sl-info');
  info.setAttribute('aria-live', 'polite');
  // The ladder runs smallest to largest; a tie keeps the pick order.
  const order = [...o.stars].sort((x, y) => x.rsun - y.rsun);
  const btns = order.map(s => {
    const c = CHART[s.value];
    const b = h('button', 'sl-star');
    b.type = 'button';
    b.dataset.value = s.value;
    b.style.setProperty('--c', s.colour);
    b.style.setProperty('--f', String(sizeOf(s.rsun)));
    // The swatch draws the kind of body, so a black hole never reads as a star.
    b.innerHTML = `<span class="sl-well"><i class="sl-sw" data-kind="${c.kind || 'star'}" aria-hidden="true"></i></span><span class="sl-name">${s.name}</span>`;
    b.setAttribute('aria-label', [s.name, c.cls, fmtT(c.t), fmtR(s.rsun, s.value)].filter(Boolean).join(', '));
    b.addEventListener('click', async () => {
      o.onPick(s.value);
      sync();
      if (!RM.matches) await fr(2);
      open(false);
    });
    b.addEventListener('pointerenter', () => tell(s));
    b.addEventListener('focus', () => { tell(s); centre(b); });
    b.addEventListener('pointerleave', () => tell());
    ladder.append(b);
    return { b, s, c };
  });
  el.append(ribbon, info);
  o.frame.append(glass, el);

  // The focused star glides to the ribbon's middle.
  function centre(b, smooth = !RM.matches) {
    const left = b.offsetLeft + b.offsetWidth / 2 - ladder.clientWidth / 2;
    ladder.scrollTo({ left, behavior: smooth ? 'smooth' : 'auto' });
  }
  // The arrows and the edge fades show only where more lies.
  function edges() {
    const max = ladder.scrollWidth - ladder.clientWidth;
    const atStart = ladder.scrollLeft <= 2, atEnd = ladder.scrollLeft >= max - 2;
    prev.hidden = atStart; next.hidden = atEnd;
    ribbon.classList.toggle('more-left', !atStart);
    ribbon.classList.toggle('more-right', !atEnd);
  }
  ladder.addEventListener('scroll', edges, { passive: true });
  // A vertical wheel or trackpad scrolls the ribbon sideways.
  ladder.addEventListener('wheel', e => {
    if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
    e.preventDefault();
    ladder.scrollLeft += e.deltaY;
  }, { passive: false });
  new ResizeObserver(edges).observe(ladder);

  // The foot line names the object in hand and its type: pointed, focused, or the current one.
  // The star card carries the rest of the facts (Tom, 2026-11-24).
  function tell(s) {
    const cur = s || o.stars.find(x => x.value === o.get());
    info.innerHTML = `<b>${cur.name}</b><span>${FACTS[cur.value]?.type ?? CHART[cur.value].cls}</span>`;
  }
  function sync() {
    for (const { b, s } of btns) b.setAttribute('aria-pressed', String(s.value === o.get()));
    if (!el.contains(document.activeElement)) tell();
  }

  let closedAt = 0, run = 0;
  async function open(on) {
    if (on === !el.hidden) return;
    const me = ++run;
    if (on) {
      const c = o.cover();
      el.style.setProperty('--foot', `${c.bottom}px`);
      el.style.setProperty('--head', `${c.top}px`);
      sync();
      el.hidden = false;
      glass.dataset.on = '';
      el.classList.remove('is-closing');
      el.classList.toggle('is-landing', !RM.matches);
      const cur = btns.find(x => x.s.value === o.get())?.b;
      cur?.focus({ preventScroll: true });
      if (cur) centre(cur, false);
      edges();
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

  // Left and right step along the ladder; Enter picks; Escape or S closes.
  // While the sheet is open, the toy's own keys wait.
  addEventListener('keydown', e => {
    if (el.hidden) return;
    // With no star in focus, the step starts from the current star.
    const f = btns.findIndex(x => x.b === document.activeElement);
    const at = f >= 0 ? f : Math.max(0, btns.findIndex(x => x.s.value === o.get()));
    const go = i => btns[(i + btns.length) % btns.length].b.focus();
    const step = { ArrowLeft: -1, ArrowRight: 1, '[': -1, ']': 1, ArrowUp: 1, ArrowDown: -1 }[e.key];
    if (e.key === 'Escape' || e.key === 's' || e.key === 'S') { e.preventDefault(); open(false); }
    else if (step) { e.preventDefault(); go(at + step); }
    else if (e.key === 'Home' || e.key === 'End') { e.preventDefault(); go(e.key === 'Home' ? 0 : btns.length - 1); }
    else if (e.key === 'Tab') {
      // Tab stays inside the sheet.
      e.preventDefault();
      go(at + (e.shiftKey ? -1 : 1));
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
