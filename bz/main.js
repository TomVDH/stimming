// BZ reaction: a dish of the Belousov-Zhabotinsky reaction on a lightbox.
// Tap to seed target rings; drag across a front to break it into spirals.
import { initPage, whenVisible, pageReady, stage as mark, reduced, onReducedChange, audioKit, sound } from '../shared/stim.js';
import { intro as playIntro } from '../shared/intro.js';
import { onContextLoss } from '../shared/gl.js';
import { detail } from '../shared/detail.js';
import { makeSim, N, MODEL, MAX_PACE } from './sim.js';
import { makeSound } from './sound.js';
mark('libs');

const ID = 'bz';
const stage = document.getElementById('stage');
const fail = stage.querySelector('.fail');
const store = {
  get(k) { try { return localStorage.getItem(`stimming.${ID}.${k}`); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(`stimming.${ID}.${k}`, String(v)); } catch { /* private mode */ } },
};
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const savedSpeed = Number(store.get('speed'));
let speed = clamp(Number.isFinite(savedSpeed) && savedSpeed > 0 ? savedSpeed : 1, 0.25, 2);

/* ---------- state ---------- */
// Sim time units per second at speed 1.
const TU_PER_S = 3.8;
const STEPS_PER_TU = 1 / MODEL.dt;
// Pacemakers: x and y in dish units, period and phase in sim time units.
const pace = [];
const cuts = [];
const bubbles = makeBubbles(34);
let gl = null, sim = null, raf = 0, visible = true, last = 0, frameNo = 0, calm = reduced();
let cssW = 1, cssH = 1, dpr = 1, started = false;
let view = { cx: 1, cy: 1, r: 1, gx: -0.7, gy: 0.7 };
let dish = { cx: 0, cy: 0, r: 1 };
let carry = 0, lastInput = 0, wiping = 0, ease = 1;
let fronts = 0, readT = 0;
let noteNo = 0;
// ?qa hands the state to a test script.
if (new URLSearchParams(location.search).has('qa')) globalThis.__bz = { pace, cuts, get fronts() { return fronts; }, frame: n => qaFrames(n) };

/* ---------- bar ---------- */
const ui = initPage({ id: ID, bar: {
  actions: [
    { verb: 'shuffle', key: 'S', onPress: () => { shuffle(); poke(); } },
    { verb: 'clear', key: 'C', onPress: () => { clearDish(); poke(); } },
  ],
  slider: { label: 'Speed', min: 0.25, max: 2, step: 0.05, value: speed, onInput: v => { speed = v; store.set('speed', v); poke(); } },
  quality: true,
  keys: [['click', 'seed'], ['drag', 'cut']],
  help: [
    ['click', 'Tap the dish to seed a pacemaker; rings pulse out from it'],
    ['drag', 'Drag across a front to break it; the ends curl into spirals'],
    ['S', 'Press S for a fresh dish with new seeds'],
    ['C', 'Press C to clear the dish'],
  ],
} });
const introDone = playIntro({ ready: pageReady() });
const kit = audioKit({ keys: new Set(['s', 'S', 'c', 'C']), sleepMs: 1500 });
const snd = makeSound(kit);

/* ---------- GL ---------- */
const canvas = document.createElement('canvas');
canvas.setAttribute('aria-hidden', 'true');
stage.prepend(canvas);
const D = detail({ maxDpr: 2, budget: 2.6e6, steps: 2, settle: 2, onChange: () => resize(true) });

// The dish fills the free stage between the bar parts.
function fit() {
  const c = ui.cover?.() || { top: 0, bottom: 0, rects: [] };
  const bot = c.bottom || 0;
  const place = top => {
    const freeH = Math.max(120, cssH - top - bot);
    const r = Math.max(40, Math.min(cssW * 0.5 - 18, freeH * 0.5 - 24) * 0.9);
    return { cx: cssW / 2, cy: top + freeH / 2, r };
  };
  // The top strip counts only where a bar part would touch the dish.
  dish = place(0);
  const hits = (c.rects || []).some(q => q.y1 <= (c.top || 0) + 1 && q.x1 > dish.cx - dish.r * 1.08 && q.x0 < dish.cx + dish.r * 1.08 && q.y1 > dish.cy - dish.r * 1.08);
  if (hits) dish = place(c.top || 0);
  const r = dish.r;
  view = { cx: dish.cx * dpr, cy: (cssH - dish.cy) * dpr, r: r * dpr, gx: -0.62, gy: 0.78 };
}
let sizeKey = '';
function resize(force = false) {
  if (!gl || !sim) return;
  const r = stage.getBoundingClientRect();
  cssW = Math.max(1, r.width); cssH = Math.max(1, r.height);
  dpr = D.dpr(cssW, cssH);
  const c = ui.cover?.() || { top: 0, bottom: 0 };
  const key = [cssW, cssH, dpr, c.top || 0, c.bottom || 0].map(v => Math.round(v * 100)).join();
  if (!force && key === sizeKey) return;
  sizeKey = key;
  sim.resize(Math.round(cssW * dpr), Math.round(cssH * dpr));
  fit();
  draw();
}

// Stage pixels to dish units, y up.
const toDish = (x, y) => [(x - dish.cx) / dish.r, (dish.cy - y) / dish.r];
const toCell = ([x, y]) => [(x * 0.5 + 0.5) * N, (y * 0.5 + 0.5) * N];

function makeBubbles(n) {
  // A fixed seed keeps the same bubbles at each load.
  let s = 7;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const out = [];
  for (let i = 0; i < n; i++) {
    const a = rnd() * Math.PI * 2, d = Math.sqrt(rnd()) * 0.95;
    const big = rnd() < 0.15;
    out.push([Math.cos(a) * d, Math.sin(a) * d, big ? 0.02 + rnd() * 0.008 : 0.008 + rnd() * 0.007, 0]);
  }
  return out;
}

/* ---------- pacemakers ---------- */
function addPace(x, y, { period = 4.2 + Math.random() * 1.4, phase = null, quiet = false } = {}) {
  if (x * x + y * y > 0.9 * 0.9) {
    const k = 0.9 / Math.hypot(x, y);
    x *= k; y *= k;
  }
  // The oldest seed gives way when the dish is full.
  if (pace.length >= MAX_PACE) pace.shift();
  const p = { x, y, period, phase: phase ?? period, age: 0, note: noteNo++ };
  pace.push(p);
  if (!quiet) snd.seed(p, x);
  return p;
}

/* ---------- sim clock ---------- */
// Runs n sim steps; pacemakers fire on their own clock.
function run(n) {
  for (let i = 0; i < n; i++) {
    const fires = [];
    for (const p of pace) {
      p.phase += MODEL.dt;
      p.age += MODEL.dt;
      const fire = p.phase >= p.period;
      if (fire) { p.phase -= p.period; if (started) snd.ring(p); }
      const [cx, cy] = toCell([p.x, p.y]);
      fires.push([cx, cy, 4, fire ? 1 : 0]);
    }
    const segs = i === 0 ? cuts.splice(0, cuts.length) : [];
    sim.step(fires, segs, { wipe: wiping > 0 ? 0.05 : 0 });
  }
}

function dotList() {
  return pace.map(p => [p.x, p.y, 0.02, Math.min(1, p.age / 0.6)]);
}
function draw() {
  if (!sim) return;
  sim.frame(view, dotList(), bubbles, { frameNo: calm ? 0 : frameNo, bloomLevels: D.rung >= 2 ? 3 : 5 });
}

/* ---------- frame loop ---------- */
// Lively after input; drifting at 30 fps; asleep after 60 s idle.
function frame(now) {
  raf = 0;
  if (!visible || !gl || !started) return;
  // The rAF stamp can run well behind the clock, so the pace reads the clock.
  const t0 = performance.now();
  const lively = pointer.id !== null || now - lastInput < 2500 || wiping > 0;
  const dt = Math.max(0, Math.min(1 / 20, (now - last) / 1000));
  last = Math.max(last, now);
  let again = true;
  try {
    const idleFor = (now - lastInput) / 1000;
    const nap = calm ? 8 : 60;
    // Past the nap time the reaction slows to a stop over 2 s.
    ease = idleFor > nap ? Math.max(0, 1 - (idleFor - nap) / 2) : 1;
    const rate = speed * (calm ? 0.25 : 1) * ease;
    carry += dt * TU_PER_S * STEPS_PER_TU * rate;
    const n = Math.min(14, Math.floor(carry));
    carry -= n;
    if (carry > 4) carry = 0;
    run(n);
    // Clear fades the dye for a moment, then empties the dish.
    if (wiping > 0 && (wiping -= dt) <= 0) { wiping = 0; sim.clear(); fronts = 0; }
    readT += dt;
    if (readT > 0.4) { readT = 0; fronts = sim.density(); }
    snd.update(fronts, ease);
    draw();
    D.frame(dt);
    frameNo++;
    const empty = !pace.length && fronts < 0.0004 && wiping <= 0 && now - lastInput > 2000;
    again = ease > 0 && !empty;
  } finally {
    // A thrown error still leaves the loop able to wake.
    // Drifting frames hold to about 30 fps.
    if (again) schedule(lively ? 0 : t0 + 33 - performance.now()); else rest();
  }
}
function rest() { snd.quiet(); kit.rest(() => !raf && !timer); }
// One frame at most is ever pending, so loops never stack.
// A delay waits on a timer first, so drifting asks for fewer frames.
let timer = 0;
function schedule(delay = 0) {
  if (raf || timer || !visible || !gl || !started) return;
  if (delay > 4) timer = setTimeout(() => { timer = 0; schedule(); }, delay - 2);
  else raf = requestAnimationFrame(frame);
}
function poke() {
  lastInput = performance.now();
  if (!raf && !timer) last = performance.now();
  // Input cuts a drifting wait short.
  if (timer) { clearTimeout(timer); timer = 0; }
  schedule();
}
function halt() { cancelAnimationFrame(raf); raf = 0; clearTimeout(timer); timer = 0; }

// Fixed frames for a test script; the loop stays halted.
function qaFrames(n = 1) {
  halt();
  for (let i = 0; i < n; i++) { run(Math.round(TU_PER_S * STEPS_PER_TU / 60)); }
  fronts = sim.density();
  draw();
}

/* ---------- actions ---------- */
function clearDish() {
  pace.length = 0;
  cuts.length = 0;
  wiping = 0.7;
  snd.swirl();
}
function shuffle() {
  sim.clear();
  pace.length = 0;
  cuts.length = 0;
  const n = 3 + Math.floor(Math.random() * 2);
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, d = 0.2 + Math.random() * 0.6;
    addPace(Math.cos(a) * d, Math.sin(a) * d, { phase: Math.random() * 3 + 2, quiet: i > 0 });
  }
  snd.swirl();
}

/* ---------- pointer: tap seeds, drag cuts ---------- */
const pointer = { id: null, x0: 0, y0: 0, x: 0, y: 0, t0: 0, drag: false };
const local = e => { const r = stage.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
stage.addEventListener('pointerdown', e => {
  if (e.button !== 0 || !sim || pointer.id !== null || (e.target !== canvas && e.target !== stage)) return;
  try { stage.setPointerCapture(e.pointerId); } catch { /* capture is optional */ }
  const [x, y] = local(e);
  Object.assign(pointer, { id: e.pointerId, x0: x, y0: y, x, y, t0: performance.now(), drag: false });
  poke();
});
stage.addEventListener('pointermove', e => {
  if (e.pointerId !== pointer.id) return;
  const [x, y] = local(e);
  if (!pointer.drag && Math.hypot(x - pointer.x0, y - pointer.y0) > 8) {
    pointer.drag = true;
    cut(pointer.x0, pointer.y0, x, y);
  } else if (pointer.drag) cut(pointer.x, pointer.y, x, y);
  pointer.x = x; pointer.y = y;
  poke();
});
function cut(x0, y0, x1, y1) {
  const a = toCell(toDish(x0, y0)), b = toCell(toDish(x1, y1));
  cuts.push([a[0], a[1], b[0], b[1]]);
  if (cuts.length > 8) cuts.splice(0, cuts.length - 8);
  const len = Math.hypot(x1 - x0, y1 - y0);
  snd.stir(len, toDish(x1, y1)[0]);
}
function endPointer(e) {
  if (e.pointerId !== pointer.id) return;
  if (!pointer.drag && e.type === 'pointerup') {
    const [x, y] = toDish(pointer.x0, pointer.y0);
    if (x * x + y * y < 1) {
      const p = addPace(x, y, { phase: 0 });
      // The first ring fires at once.
      p.phase = p.period;
    }
  }
  pointer.id = null;
  pointer.drag = false;
  snd.stir(0, 0);
  poke();
}
['pointerup', 'pointercancel', 'lostpointercapture'].forEach(t => stage.addEventListener(t, endPointer));
stage.addEventListener('pointermove', e => {
  if (pointer.id !== null || e.pointerType !== 'mouse') return;
  // The rim glint leans toward a hovering mouse.
  const [x, y] = toDish(...local(e));
  const a = Math.atan2(y, x), b = Math.atan2(0.78, -0.62);
  const t = Math.atan2(Math.sin(a - b), Math.cos(a - b)) * 0.18;
  view.gx = Math.cos(b + t); view.gy = Math.sin(b + t);
  if (!raf) draw();
});

/* ---------- life cycle ---------- */
whenVisible(stage, on => {
  visible = on;
  if (on) { last = performance.now(); schedule(); }
  else { halt(); pointer.id = null; snd.quiet(); }
});
onReducedChange(on => { calm = on; draw(); poke(); });
sound.onChange(on => { if (on) poke(); });
new ResizeObserver(() => resize()).observe(stage);
ui.onCover?.(() => resize());

async function setup() {
  gl = canvas.getContext('webgl2', { antialias: false, alpha: false, depth: false, powerPreference: 'high-performance' });
  if (!gl) throw new Error('no webgl2');
  sim = await makeSim(gl);
  sizeKey = '';
}
onContextLoss(canvas, {
  lost: () => { halt(); gl = null; sim = null; },
  restored: async () => { await setup(); resize(true); prewarm(); poke(); },
  failed: () => fail.removeAttribute('hidden'),
});

// The first frame is a picture: three targets already pulse.
function prewarm() {
  sim.clear();
  pace.length = 0;
  addPace(-0.4, 0.28, { period: 4.6, phase: 3.2, quiet: true });
  addPace(0.36, -0.3, { period: 5.2, phase: 1.0, quiet: true });
  addPace(0.22, 0.52, { period: 5.8, phase: 2.5, quiet: true });
  const t0 = performance.now();
  run(Math.round(40 * STEPS_PER_TU));
  pace.forEach(p => { p.age = 9; });
  fronts = sim.density();
  if (globalThis.__bz) globalThis.__bz.prewarmMs = Math.round(performance.now() - t0);
}

mark('build');
try {
  await setup();
  resize(true);
  prewarm();
  draw();
  gl.finish();
  canvas.classList.add('on');
  mark('first-frame');
  await introDone;
  started = true;
  poke();
} catch (err) {
  console.error(err);
  fail.removeAttribute('hidden');
  ui.hideControls?.();
}
