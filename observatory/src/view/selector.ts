// The celestial selector's overlay on the wide shot, in the bar v3 look.
// Hover: four small corner ticks and the star's name.
// Locked: the ticks close in, and two words choose an observatory.
// Pointing at a word draws one faint hairline to its dome.
import type { Star } from '../core/catalog.ts';
import type { Scope, SelState } from '../core/selector.ts';
import { stageEl } from '../setup.ts';

type Pt = { x: number; y: number };

const NS = 'http://www.w3.org/2000/svg';
const SCOPES: Scope[] = ['refractor', 'reflector'];
// Plain names: the telescope terms wait until the viewer is inside.
const NAME: Record<Scope, string> = { refractor: 'Little Observatory', reflector: 'Big Observatory' };
// The text starts this far from the star, in CSS px.
const GAP = 16;
// The text and the words keep this far from the stage's sides.
const EDGE = 12;
// The words' first row stands this far under the star.
const WORD_DROP = 14;
// The bar's height at the stage's foot: the words stay above it.
const FOOT = 84;
// Corner ticks: their distance from the star, and their leg length.
const TICK_HOVER = 7, TICK_LOCK = 5, LEG = 3;

const root = document.createElement('div');
root.className = 'sel';
root.hidden = true;
const svg = document.createElementNS(NS, 'svg');
svg.setAttribute('class', 'sel-lines');
svg.setAttribute('aria-hidden', 'true');
const el = <K extends keyof SVGElementTagNameMap>(tag: K, cls: string): SVGElementTagNameMap[K] => {
  const e = document.createElementNS(NS, tag);
  e.setAttribute('class', cls);
  svg.append(e);
  return e;
};
const ticks = el('path', 'sel-ticks');
const line = el('line', 'sel-line');

const nameEl = document.createElement('div');
nameEl.className = 'sel-name';

const words = document.createElement('div');
words.className = 'sel-words';
words.setAttribute('role', 'group');
words.setAttribute('aria-label', 'Choose an observatory');
const chooseFns: ((s: Scope) => void)[] = [];
const btns = {} as Record<Scope, HTMLButtonElement>;
// The word under the pointer or the focus.
let hot: Scope | null = null;
SCOPES.forEach((scope, i) => {
  const b = document.createElement('button');
  b.type = 'button';
  // The bar's own button: no box, the white flash closes in on hover.
  b.className = 'sg-btn sel-word';
  b.setAttribute('aria-keyshortcuts', String(i + 1));
  const span = document.createElement('span');
  span.textContent = NAME[scope];
  b.append(span);
  // The stage takes a press as a tap on the sky.
  b.addEventListener('pointerdown', e => e.stopPropagation());
  b.addEventListener('pointerup', e => e.stopPropagation());
  b.addEventListener('click', () => pick(scope));
  const heat = (on: boolean) => () => { hot = on ? scope : (hot === scope ? null : hot); layout(); };
  b.addEventListener('pointerenter', heat(true));
  b.addEventListener('pointerleave', heat(false));
  b.addEventListener('focus', heat(true));
  b.addEventListener('blur', heat(false));
  btns[scope] = b;
  words.append(b);
});
root.append(svg, nameEl, words);
stageEl.append(root);

// Keys 1 and 2 choose Little and Big.
document.addEventListener('keydown', e => {
  if (root.hidden || !last || last.state.mode !== 'locked') return;
  const i = ['1', '2'].indexOf(e.key);
  if (i >= 0) pick(SCOPES[i]);
});

function pick(scope: Scope): void {
  for (const fn of chooseFns) fn(scope);
}

// The last drawn state, so a word's hover can lay out again alone.
let last: { state: SelState; star: Pt; feet: Record<Scope, Pt> } | null = null;

// The star's short name: proper name, Bayer letter, or HIP number.
function label(s: Star): string {
  return s.name || s.bayer || `HIP ${s.hip}`;
}

const set = (e: Element, a: Record<string, number | string>): void => {
  for (const k in a) e.setAttribute(k, String(a[k]));
};

function layout(): void {
  if (!last) return;
  const { state, star, feet } = last;
  const locked = state.mode === 'locked';
  const w = stageEl.clientWidth, h = stageEl.clientHeight;
  root.classList.toggle('is-locked', locked);
  // Four corner ticks round the star; a lock draws them in closer.
  const d = locked ? TICK_LOCK : TICK_HOVER;
  ticks.setAttribute('d', [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sy]) =>
    `M${star.x + sx * d} ${star.y + sy * (d - LEG)}V${star.y + sy * d}H${star.x + sx * (d - LEG)}`).join(''));
  nameEl.textContent = state.star ? label(state.star) : '';
  words.hidden = !locked;
  // The text goes to the right of the star; it takes the left near the edge.
  const need = Math.max(nameEl.offsetWidth, locked ? words.offsetWidth : 0) + EDGE;
  const left = w - star.x - GAP < need && star.x - GAP >= need;
  // With no room on either side, the block slides in from the edge.
  const cx = left ? Math.max(star.x - GAP, need) : Math.min(star.x + GAP, w - need);
  root.classList.toggle('is-left', left);
  nameEl.style.left = `${cx}px`;
  // The name stays clear of the stage's top edge.
  nameEl.style.top = `${Math.max(star.y, 16)}px`;
  if (locked) {
    words.style.left = `${cx}px`;
    const wh = words.offsetHeight;
    // Under the star when there is room over the bar; over it when not.
    const down = star.y + WORD_DROP + wh < h - FOOT;
    words.style.top = `${down ? star.y + WORD_DROP - 8 : star.y - WORD_DROP + 8 - wh}px`;
  }
  // One faint hairline: from the word in hand to its dome.
  const show = locked && hot !== null;
  line.style.display = show ? '' : 'none';
  if (show && hot) {
    const box = root.getBoundingClientRect(), r = btns[hot].getBoundingClientRect(), foot = feet[hot];
    const x = foot.x < r.left - box.left ? r.left - box.left + 4 : r.right - box.left - 4;
    set(line, { x1: x, y1: r.top - box.top + r.height / 2, x2: foot.x, y2: foot.y - 6 });
  }
}

export const selectorView = {
  // Draws the state.
  // star and feet are in CSS px from the stage's corner.
  draw(state: SelState, star: Pt | null, feet: Record<Scope, Pt>): void {
    if (state.mode === 'idle' || !star) { this.hide(); return; }
    if (state.mode !== 'locked') hot = null;
    last = { state, star, feet };
    root.hidden = false;
    layout();
  },
  onChoose(fn: (s: Scope) => void): void { chooseFns.push(fn); },
  hide(): void {
    root.hidden = true;
    last = null;
    hot = null;
  },
  get shown(): boolean { return !root.hidden; },
};
