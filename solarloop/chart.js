// Star catalog: the star tray, grouped by kind of body (Tom, 2026-11-24).
// It is a Bar v3 sheet: it mounts in the bar's layer and takes its look.
// Each object shows a still of the toy itself, baked once by bake.js.
// Inside a group, the objects run smallest to largest.

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
};

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

// A body's size in the tray, 0 (the pulsar) to 1 (the quasi-star), on a log scale of radius.
const sizeOf = rsun => Math.min(1, Math.max(0, (Math.log10(rsun) + 4.8) / 9.3));

// The groups, by kind of body; an object in none of them joins "More".
const GROUPS = [
  ['Stars', ['proxima', 'epseri', 'sun', 'xxtri', 'procyon', 'sirius', 'fomalhaut', 's5hvs1', 'vega', 'regulus', 'zetaoph']],
  ['Giants', ['arcturus', 'rigel', 'betelgeuse', 'tzo', 'vycma', 'wohg64', 'st218']],
  ['Newborn and failed', ['wise', 'luhman', 'ttauri']],
  ['Pairs and winds', ['betalyr', 'vfts352', 'wr124', 'wr140', 'epsaur']],
  ['Dead stars', ['neutron', 'siriusb']],
  ['Black holes', ['cygx1', 'sgra', 'qso', 'powehi']],
  ['Far and strange', ['quasi', 'earendel', 'mothra']],
];

/**
 * Builds the star tray on the stage's frame.
 * @param {{ frame: HTMLElement, focusBack: HTMLElement, stars: { value: string, name: string, colour: string, rsun: number }[],
 *   get: () => string, onPick: (v: string) => void, cover: () => { top: number, bottom: number }, onOpen?: (on: boolean) => void }} o
 */
export function makeChart(o) {
  const link = h('link');
  link.rel = 'stylesheet';
  link.href = new URL('chart.css', import.meta.url).href;
  document.head.append(link);

  const glass = h('div', 'sl-glass');
  const el = h('div', 'sg-sheet sl-tray');
  el.hidden = true;
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-label', 'Star');
  // The heading names the object in hand; the star card carries the facts.
  const hd = h('div', 'sg-sheet-hd', '<span>Star</span>');
  const info = h('em', 'sl-info');
  info.setAttribute('aria-live', 'polite');
  hd.append(info);
  el.append(hd);
  const byId = new Map(o.stars.map(s => [s.value, s]));
  const placed = new Set(GROUPS.flatMap(g => g[1]));
  const groups = [...GROUPS.map(([name, ids]) => [name, ids.filter(id => byId.has(id))]),
    ['More', o.stars.filter(s => !placed.has(s.value)).map(s => s.value)]]
    .filter(g => g[1].length);
  const btns = [];
  for (const [name, ids] of groups) {
    el.append(h('div', 'sg-group', name));
    const row = h('div', 'sl-row');
    for (const id of [...ids].sort((a, b) => byId.get(a).rsun - byId.get(b).rsun)) {
      const s = byId.get(id), c = CHART[id] || {};
      const b = h('button', 'sl-tile');
      b.type = 'button';
      b.dataset.value = id;
      b.style.setProperty('--c', s.colour);
      // Each body stands at its own size, smallest to largest (Tom, 2026-11-24).
      b.style.setProperty('--f', sizeOf(s.rsun).toFixed(3));
      // The flipbook loads on the first open; until then, or without one, a dot in the star's colour.
      b.innerHTML = `<span class="sl-well"><span class="sl-still"></span></span><span class="sl-name">${s.name}</span>`;
      b.setAttribute('aria-label', [s.name, c.cls, fmtT(c.t), fmtR(s.rsun, id)].filter(Boolean).join(', '));
      b.addEventListener('click', async () => {
        o.onPick(id);
        sync();
        if (!RM.matches) await fr(2);
        open(false);
      });
      b.addEventListener('pointerenter', () => tell(s));
      b.addEventListener('focus', () => tell(s));
      b.addEventListener('pointerleave', () => tell());
      row.append(b);
      btns.push({ b, s });
    }
    el.append(row);
  }
  o.frame.append(glass, el);

  // The heading line: the pointed, focused or current object, and its type.
  function tell(s) {
    const cur = s || byId.get(o.get());
    if (cur) info.innerHTML = `<b>${cur.name}</b> ${FACTS[cur.value]?.type ?? CHART[cur.value]?.cls ?? ''}`;
  }
  function sync() {
    for (const { b, s } of btns) b.setAttribute('aria-pressed', String(s.value === o.get()));
    if (!el.contains(document.activeElement)) tell();
  }
  // The tray joins the bar's layer, so it takes the bar's ink.
  // The flipbooks load once, on the first open.
  let loaded = false;
  function mount() {
    const layer = o.frame.querySelector('.sg-ui');
    if (layer && el.parentElement !== layer) layer.append(glass, el);
    if (loaded) return;
    loaded = true;
    for (const { b, s } of btns) {
      const src = new URL(`tray/${s.value}.webp`, import.meta.url).href, img = new Image();
      img.onload = () => { b.querySelector('.sl-still').style.setProperty('--strip', `url("${src}")`); b.classList.add('is-baked'); };
      img.src = src;
    }
  }

  let closedAt = 0, run = 0;
  async function open(on) {
    if (on === !el.hidden) return;
    const me = ++run;
    if (on) {
      mount();
      sync();
      el.hidden = false;
      glass.dataset.on = '';
      el.classList.remove('is-closing');
      el.classList.toggle('is-landing', !RM.matches);
      const cur = btns.find(x => x.s.value === o.get())?.b;
      cur?.focus({ preventScroll: true });
      cur?.scrollIntoView({ block: 'nearest' });
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

  // The nearest tile in the next visual row up or down, by its centre.
  function vertical(from, dir) {
    const r = from.getBoundingClientRect(), x = r.left + r.width / 2;
    let best = null, bd = Infinity;
    for (const { b } of btns) {
      const q = b.getBoundingClientRect();
      const dy = (q.top - r.top) * dir;
      if (dy < 4) continue;
      const d = dy * 4 + Math.abs(q.left + q.width / 2 - x);
      if (d < bd) { bd = d; best = b; }
    }
    return best;
  }
  // Arrows move through the grid; Home and End go to its ends; Enter picks; Escape or S closes.
  // While the sheet is open, the toy's own keys wait.
  addEventListener('keydown', e => {
    if (el.hidden) return;
    const f = btns.findIndex(x => x.b === document.activeElement);
    const at = f >= 0 ? f : Math.max(0, btns.findIndex(x => x.s.value === o.get()));
    const go = i => { const b = btns[(i + btns.length) % btns.length].b; b.focus({ preventScroll: true }); b.scrollIntoView({ block: 'nearest' }); };
    const step = { ArrowLeft: -1, ArrowRight: 1, '[': -1, ']': 1 }[e.key];
    if (e.key === 'Escape' || e.key === 's' || e.key === 'S') { e.preventDefault(); open(false); }
    else if (step) { e.preventDefault(); go(at + step); }
    else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      const b = vertical(btns[at].b, e.key === 'ArrowUp' ? -1 : 1);
      if (b) go(btns.findIndex(x => x.b === b));
    }
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
