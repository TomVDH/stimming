// Solar loop: the star tray, a size ladder that picks the star.
// Every star and black hole stands on one line, smallest to largest (Tom, 2026-11-24).
// Each star is a swatch in its own colour, sized by its radius on a log scale.
// The toy owns this sheet; it copies the Bar v3 sheet look.

// Star data: the class or stage, and the surface temperature (K).
// A black hole has no surface temperature: t is null.
export const CHART = {
  zetaoph: { t: 34000, cls: 'O9.5 V' },
  regulus: { t: 12000, cls: 'B8 IV' },
  vega: { t: 9600, cls: 'A0 V' },
  sirius: { t: 9900, cls: 'A1 V' },
  procyon: { t: 6500, cls: 'F5 IV' },
  sun: { t: 5772, cls: 'G2 V' },
  epseri: { t: 5080, cls: 'K2 V' },
  proxima: { t: 3040, cls: 'M5.5 V' },
  luhman: { t: 1300, cls: 'L7.5 + T0.5' },
  wise: { t: 285, cls: 'Y4' },
  ttauri: { t: 4000, cls: 'K0 protostar' },
  arcturus: { t: 4290, cls: 'K1.5 III red giant' },
  rigel: { t: 12100, cls: 'B8 Ia supergiant' },
  betelgeuse: { t: 3600, cls: 'M1 Ia supergiant' },
  vycma: { t: 3490, cls: 'M5 Ia hypergiant' },
  siriusb: { t: 25000, cls: 'DA2 white dwarf' },
  neutron: { t: 700000, cls: 'neutron star' },
  cygx1: { t: null, cls: 'stellar black hole' },
  sgra: { t: null, cls: 'supermassive black hole' },
  qso: { t: null, cls: 'quasar' },
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
  el.append(h('div', 'sl-hd', '<span>Star</span><em class="sl-hint"></em>'));
  const ladder = h('div', 'sl-ladder');
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
    b.innerHTML = `<span class="sl-well"><i class="sl-sw" aria-hidden="true"></i></span><span class="sl-name">${s.name}</span>`;
    b.setAttribute('aria-label', [s.name, c.cls, fmtT(c.t), fmtR(s.rsun, s.value)].filter(Boolean).join(', '));
    b.addEventListener('click', async () => {
      o.onPick(s.value);
      sync();
      if (!RM.matches) await fr(2);
      open(false);
    });
    b.addEventListener('pointerenter', () => tell(s));
    b.addEventListener('focus', () => tell(s));
    b.addEventListener('pointerleave', () => tell());
    ladder.append(b);
    return { b, s, c };
  });
  el.append(ladder, info);
  o.frame.append(glass, el);

  // The foot line names the star in hand: pointed, focused, or the current one.
  function tell(s) {
    const cur = s || o.stars.find(x => x.value === o.get());
    const c = CHART[cur.value];
    info.innerHTML = `<b>${cur.name}</b><span>${c.cls}</span>${c.t == null ? '' : `<span>${fmtT(c.t)}</span>`}<span>${fmtR(cur.rsun, cur.value)}</span>`;
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
      el.querySelector('.sl-hint').textContent = touch() ? 'tap a star' : '← → · [ ] · s';
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
