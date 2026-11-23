// The celestial selector's overlay on the wide shot.
// Hover: a glow, a ring, one hairline to a dome, two quiet lines.
// Locked: corner brackets and two chips, each with a hairline to its dome.
import type { Star } from '../core/catalog.ts';
import type { Scope, SelState } from '../core/selector.ts';
import { stageEl } from '../setup.ts';

type Pt = { x: number; y: number };

const NS = 'http://www.w3.org/2000/svg';
const SCOPES: Scope[] = ['refractor', 'reflector'];
const INSTRUMENT: Record<Scope, string> = { refractor: 'Great refractor', reflector: '1 m reflector' };
const CHIP_TEXT: Record<Scope, string> = { refractor: 'Great refractor · eyepiece', reflector: '1 m reflector · camera' };
// The text and the chips start this far right of the star, in CSS px.
const GAP = 22;
// The text and the chips keep this far from the stage's sides.
const EDGE = 12;
// The chips' first row stands this far under the star.
const CHIP_DROP = 45;
// The bar's height at the stage's foot: the chips stay above it.
const FOOT = 84;

const root = document.createElement('div');
root.className = 'sel';
root.hidden = true;
const svg = document.createElementNS(NS, 'svg');
svg.setAttribute('class', 'sel-lines');
svg.setAttribute('aria-hidden', 'true');
svg.innerHTML = `<defs><radialGradient id="sel-glow">
  <stop offset="0" stop-color="rgb(220,230,255)" stop-opacity="0.32"/>
  <stop offset="0.35" stop-color="rgb(200,215,255)" stop-opacity="0.12"/>
  <stop offset="1" stop-color="rgb(200,215,255)" stop-opacity="0"/></radialGradient></defs>`;
const el = <K extends keyof SVGElementTagNameMap>(tag: K, cls: string): SVGElementTagNameMap[K] => {
  const e = document.createElementNS(NS, tag);
  e.setAttribute('class', cls);
  svg.append(e);
  return e;
};
const glow = el('circle', 'sel-glow');
glow.setAttribute('r', '34');
glow.setAttribute('fill', 'url(#sel-glow)');
const ring = el('circle', 'sel-ring');
ring.setAttribute('r', '9');
const brackets = el('path', 'sel-brackets');
const lines: Record<Scope, SVGLineElement> = { refractor: el('line', 'sel-line'), reflector: el('line', 'sel-line') };
const ticks: Record<Scope, SVGLineElement> = { refractor: el('line', 'sel-line'), reflector: el('line', 'sel-line') };

const text = document.createElement('div');
text.className = 'sel-text';
const nameLine = document.createElement('span');
const subLine = document.createElement('span');
subLine.className = 'sel-sub';
text.append(nameLine, subLine);

const chipBox = document.createElement('div');
chipBox.className = 'sel-chips';
chipBox.setAttribute('role', 'group');
chipBox.setAttribute('aria-label', 'Choose a telescope');
const chooseFns: ((s: Scope) => void)[] = [];
const chips = {} as Record<Scope, HTMLButtonElement>;
// The chip under the pointer or the focus.
let hot: Scope | null = null;
SCOPES.forEach(scope => {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'sel-chip';
  b.textContent = CHIP_TEXT[scope];
  // The stage takes a press as a tap on the sky.
  b.addEventListener('pointerdown', e => e.stopPropagation());
  b.addEventListener('pointerup', e => e.stopPropagation());
  b.addEventListener('click', () => pick(scope));
  const heat = (on: boolean) => () => { hot = on ? scope : (hot === scope ? null : hot); layout(); };
  b.addEventListener('pointerenter', heat(true));
  b.addEventListener('pointerleave', heat(false));
  b.addEventListener('focus', heat(true));
  b.addEventListener('blur', heat(false));
  chips[scope] = b;
  chipBox.append(b);
});
root.append(svg, text, chipBox);
stageEl.append(root);

// The chips top to bottom; the farther dome's chip goes on top.
// So the two hairlines fan out and never cross.
let order: Scope[] = [...SCOPES];
// Keys 1 and 2 choose the top and the lower chip.
document.addEventListener('keydown', e => {
  if (root.hidden || !last || last.state.mode !== 'locked') return;
  const i = ['1', '2'].indexOf(e.key);
  if (i >= 0) pick(order[i]);
});

function pick(scope: Scope): void {
  for (const fn of chooseFns) fn(scope);
}

// The last drawn state, so a chip's hover can lay out again alone.
let last: { state: SelState; star: Pt; feet: Record<Scope, Pt> } | null = null;

// The star's short name: proper name, Bayer letter, or HIP number.
function label(s: Star): string {
  const id = s.name || s.bayer || `HIP ${s.hip}`;
  const sub = s.name && s.bayer ? ` · ${s.bayer}` : '';
  return `${id}${sub} · ${s.mag.toFixed(1)}`;
}

const set = (e: Element, a: Record<string, number | string>): void => {
  for (const k in a) e.setAttribute(k, String(a[k]));
};

// True when segment p1-p2 crosses segment q1-q2.
function crosses(p1: Pt, p2: Pt, q1: Pt, q2: Pt): boolean {
  const side = (a: Pt, b: Pt, c: Pt) => Math.sign((b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x));
  return side(p1, p2, q1) !== side(p1, p2, q2) && side(q1, q2, p1) !== side(q1, q2, p2);
}

function layout(): void {
  if (!last) return;
  const { state, star, feet } = last;
  const locked = state.mode === 'locked';
  const w = stageEl.clientWidth, h = stageEl.clientHeight;
  set(glow, { cx: star.x, cy: star.y });
  set(ring, { cx: star.x, cy: star.y });
  ring.classList.toggle('is-locked', locked);
  // Four corner brackets round the locked star.
  const b = 13, k = 6;
  brackets.setAttribute('d', locked ? [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sy]) =>
    `M${star.x + sx * b} ${star.y + sy * k}V${star.y + sy * b}H${star.x + sx * k}`).join('') : '');
  nameLine.textContent = state.star ? label(state.star) : '';
  subLine.textContent = locked ? 'Choose a telescope' : INSTRUMENT[state.last];
  chipBox.hidden = !locked;
  // The text and the chips go to the side away from the domes.
  // So the hairlines never cross the text.
  // They take the other side when that side has no room.
  const need = Math.max(text.offsetWidth, locked ? chipBox.offsetWidth : 0) + EDGE;
  const domesRight = (feet.refractor.x + feet.reflector.x) / 2 > star.x;
  const roomLeft = star.x - GAP >= need, roomRight = w - star.x - GAP >= need;
  const left = domesRight ? roomLeft || !roomRight : !roomRight && roomLeft;
  // With no room on either side, the block slides in from the edge.
  // cx: the block's edge next to the star.
  const cx = left ? Math.max(star.x - GAP, need) : Math.min(star.x + GAP, w - need);
  root.classList.toggle('is-left', left);
  text.style.left = `${cx}px`;
  text.style.top = `${star.y}px`;
  const box = root.getBoundingClientRect();
  // A chip's hairline starts at its edge that faces the dome.
  const chipStart = (scope: Scope): Pt => {
    const r = chips[scope].getBoundingClientRect(), foot = feet[scope];
    const x = foot.x < r.left - box.left ? r.left - box.left : r.right - box.left;
    return { x, y: r.top - box.top + r.height / 2 };
  };
  if (locked) {
    chipBox.style.left = text.style.left;
    const ch = chipBox.offsetHeight;
    // Under the star when there is room over the bar; over it when not.
    const down = star.y + CHIP_DROP + ch < h - FOOT;
    chipBox.style.top = `${down ? star.y + CHIP_DROP - 13 : star.y - CHIP_DROP + 13 - ch}px`;
    // The first order whose two hairlines do not cross wins.
    for (const cand of [SCOPES, [...SCOPES].reverse()]) {
      order = cand;
      order.forEach((scope, i) => {
        chips[scope].style.order = String(i);
        chips[scope].setAttribute('aria-keyshortcuts', String(i + 1));
      });
      const [a, b] = SCOPES;
      if (!crosses(chipStart(a), feet[a], chipStart(b), feet[b])) break;
    }
  }
  for (const scope of SCOPES) {
    const show = locked || scope === state.last;
    const line = lines[scope], tick = ticks[scope], foot = feet[scope];
    line.style.display = tick.style.display = show ? '' : 'none';
    if (!show) continue;
    let from: Pt;
    if (locked) {
      from = chipStart(scope);
    } else {
      // From the glow's rim, along the line to the dome.
      // With the text on the dome's side, from under the ring.
      const a = Math.atan2(foot.y - star.y, foot.x - star.x);
      from = left === domesRight ? { x: star.x + Math.cos(a) * 15, y: star.y + Math.sin(a) * 15 } : { x: star.x, y: star.y + 15 };
    }
    set(line, { x1: from.x, y1: from.y, x2: foot.x, y2: foot.y - 6 });
    set(tick, { x1: foot.x - 5, y1: foot.y - 6, x2: foot.x + 5, y2: foot.y - 6 });
    const lit = !locked || hot === scope;
    line.classList.toggle('is-hot', lit);
    tick.classList.toggle('is-hot', lit);
    chips[scope].classList.toggle('is-hot', hot === scope);
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
