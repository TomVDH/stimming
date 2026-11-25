// Star catalog: the star tray, one ribbon through the groups of bodies (Tom, 2026-11-24).
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
 * Builds the star tray on the stage's frame: one ribbon through every group.
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
  // One line over the ribbon names the body in hand and its type; the card carries the facts.
  const hd = h('div', 'sl-hd');
  const info = h('div', 'sl-info');
  info.setAttribute('aria-live', 'polite');
  hd.append(info);
  const ribbon = h('div', 'sl-ribbon');
  const ladder = h('div', 'sl-ladder');
  // Page arrows at the ends; each shows only where more lies.
  const prev = h('button', 'sl-page sl-page--prev', '‹'), next = h('button', 'sl-page sl-page--next', '›');
  for (const [b, dir, label] of [[prev, -1, 'Earlier'], [next, 1, 'Later']]) {
    b.type = 'button';
    b.setAttribute('aria-label', label);
    b.tabIndex = -1;
    b.addEventListener('click', () => glide(ladder.scrollLeft + dir * ladder.clientWidth * 0.75));
  }
  ribbon.append(prev, ladder, next);
  el.append(hd, ribbon);

  const byId = new Map(o.stars.map(s => [s.value, s]));
  const placed = new Set(GROUPS.flatMap(g => g[1]));
  const groups = [...GROUPS.map(([name, ids]) => [name, ids.filter(id => byId.has(id))]),
    ['More', o.stars.filter(s => !placed.has(s.value)).map(s => s.value)]]
    .filter(g => g[1].length);
  /** @type {{ b: HTMLButtonElement, s: any, g: number }[]} */
  const btns = [];
  groups.forEach(([name, ids], gi) => {
    // A group is a stretch of the ribbon, its name over its first body.
    const seg = h('div', 'sl-seg');
    seg.append(h('div', 'sl-seg-name', name));
    const row = h('div', 'sl-seg-row');
    for (const id of [...ids].sort((a, b) => byId.get(a).rsun - byId.get(b).rsun)) {
      const s = byId.get(id), c = CHART[id] || {};
      const b = h('button', 'sl-tile');
      b.type = 'button';
      b.dataset.value = id;
      b.style.setProperty('--c', s.colour);
      // Each body stands at its own size, smallest to largest (Tom, 2026-11-24).
      b.style.setProperty('--f', sizeOf(s.rsun).toFixed(3));
      // The flipbook loads on the first open; until then, or without one, a dot in the star's colour.
      // A non-breaking hyphen keeps a name such as Cygnus X-1 whole.
      b.innerHTML = `<span class="sl-well"><span class="sl-still"></span></span><span class="sl-name">${s.name.replace(/-/g, '\u2011')}</span>`;
      b.setAttribute('aria-label', [s.name, c.cls, fmtT(c.t), fmtR(s.rsun, id)].filter(Boolean).join(', '));
      b.addEventListener('click', async e => {
        // A drag that ends on a body is not a pick.
        if (dragged) { e.preventDefault(); return; }
        o.onPick(id);
        sync();
        if (!RM.matches) await fr(2);
        open(false);
      });
      b.addEventListener('pointerenter', () => tell(s));
      b.addEventListener('focus', () => { tell(s); centre(b); });
      b.addEventListener('pointerleave', () => tell());
      row.append(b);
      btns.push({ b, s, g: gi });
    }
    seg.append(row);
    ladder.append(seg);
  });
  o.frame.append(glass, el);

  // The heading line: the pointed, focused or current object, and its type.
  function tell(s) {
    const cur = s || byId.get(o.get());
    if (cur) info.innerHTML = `<b>${cur.name}</b><span>${FACTS[cur.value]?.type ?? CHART[cur.value]?.cls ?? ''}</span>`;
  }
  function sync() {
    for (const { b, s } of btns) b.setAttribute('aria-pressed', String(s.value === o.get()));
    if (!el.contains(document.activeElement)) tell();
  }

  /* ---------- the ribbon's motion ---------- */
  let anim = 0;
  const stop = () => { cancelAnimationFrame(anim); anim = 0; };
  // A glide eases to a scroll position; reduced motion jumps.
  function glide(to) {
    stop();
    const max = ladder.scrollWidth - ladder.clientWidth;
    to = Math.max(0, Math.min(max, to));
    if (RM.matches) { ladder.scrollLeft = to; return; }
    const from = ladder.scrollLeft, t0 = performance.now(), T = 260;
    const step = now => {
      const k = Math.min(1, (now - t0) / T), e = 1 - (1 - k) ** 3;
      ladder.scrollLeft = from + (to - from) * e;
      anim = k < 1 ? requestAnimationFrame(step) : 0;
    };
    anim = requestAnimationFrame(step);
  }
  // The body glides to the ribbon's middle.
  function centre(b, smooth = true) {
    // Measured on screen: the tile's offset parent is the sheet, not the ribbon.
    const r = b.getBoundingClientRect(), l = ladder.getBoundingClientRect();
    const to = ladder.scrollLeft + r.left + r.width / 2 - l.left - l.width / 2;
    if (smooth) glide(to); else { stop(); ladder.scrollLeft = to; }
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
  new ResizeObserver(edges).observe(ladder);
  // A wheel, either axis, scrolls the ribbon sideways at once.
  ladder.addEventListener('wheel', e => {
    e.preventDefault();
    stop();
    ladder.scrollLeft += Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
  }, { passive: false });
  // A mouse drag throws the ribbon; it coasts and slows. Touch scrolls natively.
  let drag = null, dragged = false;
  ladder.addEventListener('pointerdown', e => {
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    stop();
    drag = { x: e.clientX, left: ladder.scrollLeft, id: e.pointerId, v: 0, t: e.timeStamp, lx: e.clientX };
    dragged = false;
  });
  ladder.addEventListener('pointermove', e => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x;
    // A press becomes a drag after 8 px.
    if (!dragged && Math.abs(dx) < 8) return;
    if (!dragged) { dragged = true; ladder.setPointerCapture(e.pointerId); ladder.classList.add('is-dragging'); }
    ladder.scrollLeft = drag.left - dx;
    const dt = Math.max(1, e.timeStamp - drag.t);
    drag.v = 0.8 * drag.v + 0.2 * (-(e.clientX - drag.lx) / dt);
    drag.t = e.timeStamp; drag.lx = e.clientX;
  });
  const endDrag = e => {
    if (!drag || e.pointerId !== drag.id) return;
    const v = drag.v;
    drag = null;
    ladder.classList.remove('is-dragging');
    if (!dragged) return;
    // The click that ends a drag clears after it fires.
    setTimeout(() => { dragged = false; }, 0);
    if (RM.matches || Math.abs(v) < 0.05) return;
    // The throw coasts on, losing speed with a time constant of about 0.3 s.
    let vel = v * 16, last = performance.now();
    const coast = now => {
      const dt = now - last; last = now;
      ladder.scrollLeft += vel * dt / 16;
      vel *= Math.exp(-dt / 300);
      anim = Math.abs(vel) > 0.2 ? requestAnimationFrame(coast) : 0;
    };
    anim = requestAnimationFrame(coast);
  };
  ladder.addEventListener('pointerup', endDrag);
  ladder.addEventListener('pointercancel', endDrag);
  ladder.addEventListener('lostpointercapture', endDrag);

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
      // The glass reaches only a band above the ribbon, so the star stays in view (Tom, 2026-11-24).
      const top = el.getBoundingClientRect().top, foot = glass.parentElement.getBoundingClientRect().bottom;
      glass.style.height = `${Math.round(foot - top + 70)}px`;
      glass.dataset.on = '';
      el.classList.remove('is-closing');
      el.classList.toggle('is-landing', !RM.matches);
      // The ribbon opens with the object in hand at its middle.
      const cur = btns.find(x => x.s.value === o.get())?.b;
      if (cur) { centre(cur, false); cur.focus({ preventScroll: true }); }
      edges();
      o.onOpen?.(true);
      if (!RM.matches) { await fr(5); if (me === run) el.classList.remove('is-landing'); }
    } else {
      stop();
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

  // Left and right step; up and down jump a group; Home and End go to the ends.
  // A letter jumps to the next name that starts with it. Enter picks; Escape or S closes.
  // While the sheet is open, the toy's own keys wait.
  addEventListener('keydown', e => {
    if (el.hidden) return;
    const f = btns.findIndex(x => x.b === document.activeElement);
    const at = f >= 0 ? f : Math.max(0, btns.findIndex(x => x.s.value === o.get()));
    // The key moves focus and glides the body to the middle; it does not wait on a focus event.
    const to = x => { x.b.focus({ preventScroll: true }); tell(x.s); centre(x.b); };
    const go = i => to(btns[Math.max(0, Math.min(btns.length - 1, i))]);
    const step = { ArrowLeft: -1, ArrowRight: 1, '[': -1, ']': 1 }[e.key];
    const g = btns[at].g, first = gi => btns.findIndex(x => x.g === gi);
    if (e.key === 'Escape' || e.key === 's' || e.key === 'S') { e.preventDefault(); open(false); }
    else if (step) { e.preventDefault(); go(at + step); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); go(at === first(g) ? first(Math.max(0, g - 1)) : first(g)); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); const i = btns.findIndex(x => x.g > g); if (i >= 0) go(i); }
    else if (e.key === 'Home' || e.key === 'End') { e.preventDefault(); go(e.key === 'Home' ? 0 : btns.length - 1); }
    else if (e.key === 'Tab') { e.preventDefault(); go(at + (e.shiftKey ? -1 : 1)); }
    else if (/^[a-z0-9]$/i.test(e.key) && !e.metaKey && !e.ctrlKey && !e.altKey) {
      e.preventDefault();
      const k = e.key.toLowerCase();
      for (let n = 1; n <= btns.length; n++) {
        const x = btns[(at + n) % btns.length];
        if (x.s.name.toLowerCase().startsWith(k)) { to(x); break; }
      }
    }
    // Enter and Space still press the focused body.
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
