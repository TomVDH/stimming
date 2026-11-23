// Leaf shadows: late sun through a tree's leaves, dappled on a plaster wall.
// The breeze sways the branches; a tap sends a gust; the pointer casts a hand.
import { initPage, whenVisible, pageReady, stage as mark, reduced, onReducedChange, audioKit, sound } from '../shared/stim.js';
import { intro as playIntro } from '../shared/intro.js';
import { onContextLoss } from '../shared/gl.js';
import { detail } from '../shared/detail.js';
import { makeRenderer } from './render.js';
import { growTree, windAt } from './tree.js';
import { makeSound } from './sound.js';
mark('libs');

const ID = 'leafshadows';
const stage = document.getElementById('stage');
const fail = stage.querySelector('.fail');
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
// A gust front's speed in metres a second, and its fade time.
const GUST_V = 2.3, GUST_TAU = 3.2;

/* ---------- state ---------- */
const saved = k => { try { return localStorage.getItem(`stimming.${ID}.${k}`); } catch { return null; } };
const save = (k, v) => { try { localStorage.setItem(`stimming.${ID}.${k}`, String(v)); } catch { /* private mode */ } };
let breeze = clamp(parseFloat(saved('breeze') ?? '0.35'), 0, 1);
if (!Number.isFinite(breeze)) breeze = 0.35;
let gl = null, R = null, raf = 0, timer = 0, visible = true, last = 0, frameNo = 0, calm = reduced();
let cssW = 1, cssH = 1, dpr = 1, started = false, lastInput = 0, lastMove = 0, frozen = false;
let view = { x: -1.2, y: -0.75, w: 2.4, h: 1.5 };
// Integrated phases: gusts along x, twig bob, leaf flutter.
let gph = 3, pt = 0, pf = 0, drifting = 1;
const fronts = [];

const tree = growTree(7);
// Each branch's wind is read where its leaves are, not at its pivot.
{
  const sum = tree.branches.map(() => [0, 0]);
  for (const L of tree.layers) for (let i = 0; i < L.count; i++) { const s = sum[L.data[i * 12 + 6]]; s[0] += L.data[i * 12]; s[1]++; }
  tree.branches.forEach((b, i) => { b.cx = sum[i][1] ? sum[i][0] / sum[i][1] : b.px; b.ph = b.seed * 6.28; });
}
const brOut = new Float32Array(24 * 4);
let qaOnly, qaOver = {};

// The hand: where it is, where it goes, how present, its angle and splay.
const hand = { x: 0.3, y: -0.2, tx: 0.3, ty: -0.2, vx: 0, vy: 0, a: 0, ta: 0, ang: 0, splay: 0.5, over: false };

/* ---------- bar ---------- */
const ui = initPage({ id: ID, bar: {
  actions: [
    { verb: 'gust', key: 'Space', onPress: () => gust() },
  ],
  slider: { label: 'Breeze', min: 0, max: 1, step: 0.01, value: breeze, onInput: v => {
    const was = breeze;
    breeze = v; save('breeze', v);
    // Reduced motion: a move of the slider gives one soft sway.
    if (calm && Math.abs(v - was) > 0.02) gust(0.25);
    poke();
  } },
  quality: true,
  keys: [['move', 'cast your hand'], ['click', 'send a gust'], ['Space', 'gust']],
  help: [
    ['move', 'Move over the wall to cast your hand\'s shadow'],
    ['click', 'Tap to send a gust through the leaves'],
    ['Space', 'Press Space for a gust'],
  ],
} });
const introDone = playIntro({ ready: pageReady() });
const kit = audioKit({ keys: new Set([' ']), sleepMs: 1500 });
const snd = makeSound(kit);

/* ---------- GL ---------- */
const canvas = document.createElement('canvas');
canvas.setAttribute('aria-hidden', 'true');
stage.prepend(canvas);
// Rungs: the pixel ratio, then fewer blur taps, then a smaller bloom.
const D = detail({ maxDpr: 2, budget: 2.4e6, steps: 3, settle: 2, onChange: () => resize(true) });

// The view: 1.5 m of wall tall on a wide stage, 1.25 m wide on a narrow one.
function fitView() {
  const mpp = Math.max(1.5 / cssH, 1.25 / cssW);
  const w = cssW * mpp, h = cssH * mpp;
  // A tall stage slides right, so the near sprig stays in the shot.
  const cx = clamp((1 - cssW / cssH) * 0.8, 0, 0.42);
  view = { x: cx - w / 2, y: -h / 2, w, h };
}
let sizeKey = '';
function resize(force = false) {
  if (!gl || !R) return;
  const r = stage.getBoundingClientRect();
  cssW = Math.max(1, r.width); cssH = Math.max(1, r.height);
  dpr = D.dpr(cssW, cssH);
  const key = [cssW, cssH, dpr, D.rung].map(v => Math.round(v * 100)).join();
  if (!force && key === sizeKey) return;
  sizeKey = key;
  fitView();
  R.resize(Math.round(cssW * dpr), Math.round(cssH * dpr), view);
  draw();
}

/* ---------- gusts ---------- */
// A gust front runs in from the left; at a tap it starts just upwind.
function gust(a = 1, x = null) {
  const x0 = x === null ? view.x - 0.6 : x - 0.35;
  fronts.push({ x: x0, a: a * (calm ? 0.45 : 1), age: 0 });
  while (fronts.length > 4) fronts.shift();
  snd.gust({ a, pan: clamp((x0 - (view.x + view.w / 2)) / view.w * 2, -1, 1) });
  poke();
}

/* ---------- the branches ---------- */
// Each branch is a damped spring: the wind leans it and buffets it.
function stepBranches(dt) {
  const amb = calm ? 0 : breeze * drifting;
  let sum = 0, n = 0, maxV = 0;
  for (const b of tree.branches) {
    const W = windAt(b.cx, amb, gph, fronts);
    b.amp += (W - b.amp) * Math.min(1, dt * 2.5);
    b.ph += dt * b.w * (0.85 + 0.3 * b.seed);
    const buffet = 0.6 * Math.sin(b.ph) + 0.4 * Math.sin(b.ph * 2.31 + 1);
    const target = b.lean * W * (1 + 0.9 * buffet);
    // Substeps keep the spring stable at any frame time.
    const steps = Math.ceil(dt / (1 / 120));
    const h = dt / steps;
    // Falling asleep, or reduced motion: more damping, so the branch settles in about 2 s.
    const z = b.z + 0.55 * (1 - drifting) + (calm ? 0.3 : 0);
    for (let k = 0; k < steps; k++) {
      b.v += (b.w * b.w * (target - b.th) - 2 * z * b.w * b.v) * h;
      b.th += b.v * h;
    }
    sum += b.amp * (b.layer < 2 ? 1 : 0.5); n += b.layer < 2 ? 1 : 0.5;
    maxV = Math.max(maxV, Math.abs(b.v), Math.abs(b.th) * b.w * 0.2, b.amp);
  }
  return { mean: sum / n, motion: maxV };
}
function packBranches() {
  tree.branches.forEach((b, i) => brOut.set([b.px, b.py, b.th, b.amp * b.gain], i * 4));
}

/* ---------- the hand ---------- */
// The arm reaches in from a shoulder below the lower right.
function armAngle() {
  const sx = view.x + view.w * 1.15, sy = view.y - view.h * 0.55;
  return Math.atan2(-(hand.x - sx), hand.y - sy) + 0.12;
}
function stepHand(dt) {
  // A soft spring: the shadow trails the pointer a little.
  const k = 1 - Math.exp(-dt / 0.055);
  const ox = hand.x, oy = hand.y;
  hand.x += (hand.tx - hand.x) * k;
  hand.y += (hand.ty - hand.y) * k;
  const sp = dt > 0 ? Math.hypot(hand.x - ox, hand.y - oy) / dt : 0;
  hand.a += (hand.ta - hand.a) * (1 - Math.exp(-dt / 0.12));
  hand.ang += (armAngle() - hand.ang) * (1 - Math.exp(-dt / 0.2));
  // Fingers spread as the hand sweeps.
  hand.splay += (0.45 + 0.7 * Math.min(1, sp / 0.9) - hand.splay) * (1 - Math.exp(-dt / 0.25));
  return Math.abs(hand.ta - hand.a) > 0.002 || sp > 0.004 || Math.abs(hand.tx - hand.x) + Math.abs(hand.ty - hand.y) > 0.0005;
}

/* ---------- frame state ---------- */
// Late sun, warm; the sky fill is cool; the ground throws a warm bounce up.
const SUN_C = [3.1, 1.86, 0.88], SKY_C = [0.15, 0.2, 0.33], BOUNCE = [0.085, 0.055, 0.03];
function state() {
  packBranches();
  return {
    br: brOut, pt, pf, frameNo,
    hand: [hand.x, hand.y, hand.a, hand.ang], splay: hand.splay,
    sunC: SUN_C, skyC: SKY_C, bounce: BOUNCE, bump: 4,
    only: qaOnly, expo: 0.66, bloomK: 0.22, bloomLevels: D.rung >= 3 ? 3 : 5, taps: D.rung >= 2 ? 0.6 : 1,
    ...qaOver,
  };
}
function draw() { if (R) R.frame(state()); }

/* ---------- frame loop ---------- */
// Lively while a gust runs or the hand moves; drifting at 30 fps; asleep after 60 s.
function frame(now) {
  raf = 0;
  if (!visible || !gl || !started) return;
  const t0 = performance.now();
  const dt = frozen ? 0 : Math.max(0, Math.min(1 / 15, (now - last) / 1000));
  last = Math.max(last, now);
  let again = true, lively = true;
  try {
    const idleFor = (t0 - lastInput) / 1000;
    // The breeze eases out over 2 s once the toy sleeps.
    drifting = idleFor > 60 ? Math.max(0, 1 - (idleFor - 60) / 2) : 1;
    const amb = calm ? 0 : breeze * drifting;
    gph += dt * (0.22 + 0.55 * amb);
    for (const f of fronts) { f.x += GUST_V * dt; f.a *= Math.exp(-dt / GUST_TAU); f.age += dt; }
    while (fronts.length && (fronts[0].a < 0.02 || fronts[0].x > view.x + view.w + 6)) fronts.shift();
    const { mean, motion } = stepBranches(dt);
    // Slow motion under reduced motion: the leaves sway, they do not shiver.
    const pace = calm ? 0.45 : 1;
    pt += dt * pace * (1.3 + 2.4 * mean);
    pf += dt * pace * (4.5 + 9 * mean);
    const handMoving = stepHand(dt);
    snd.frame({ breeze: amb, mean, fronts, view, g: gph });
    draw();
    D.frame(dt);
    frameNo++;
    lively = fronts.length > 0 || handMoving || t0 - lastMove < 400;
    again = amb > 0 || lively || motion > 2e-4;
  } finally {
    // A thrown error still leaves the loop able to wake.
    if (again) schedule(lively ? 0 : t0 + 34 - performance.now()); else rest();
  }
}
function rest() { snd.quiet(); kit.rest(() => !raf && !timer && !snd.busy); }
// One frame at most is ever pending, so loops never stack.
function schedule(delay = 0) {
  if (raf || timer || !visible || !gl || !started) return;
  if (delay > 4) timer = setTimeout(() => { timer = 0; schedule(); }, delay - 2);
  else raf = requestAnimationFrame(frame);
}
function poke() {
  lastInput = performance.now();
  if (!raf && !timer) last = performance.now();
  if (timer) { clearTimeout(timer); timer = 0; }
  schedule();
}
function halt() { cancelAnimationFrame(raf); raf = 0; clearTimeout(timer); timer = 0; }

/* ---------- pointer ---------- */
// A press turns into a drag after 8 px, or a hold after 260 ms; otherwise a tap.
// A mouse shows the hand on hover; touch shows it while the finger is down.
const pointer = { id: null, x0: 0, y0: 0, drag: false, at: 0, touch: false };
const local = e => { const r = stage.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
const onWall = e => e.target === canvas || e.target === stage;
function aim(x, y) {
  hand.tx = view.x + x / cssW * view.w;
  hand.ty = view.y + (1 - y / cssH) * view.h;
  // The first sight of the hand starts where the pointer is.
  if (hand.a < 0.02) { hand.x = hand.tx; hand.y = hand.ty; hand.ang = armAngle(); }
  lastMove = performance.now();
  poke();
}
stage.addEventListener('pointermove', e => {
  const [x, y] = local(e);
  if (e.pointerId === pointer.id) {
    if (!pointer.drag && Math.hypot(x - pointer.x0, y - pointer.y0) > 8) pointer.drag = true;
    aim(x, y);
    return;
  }
  if (e.pointerType !== 'mouse' || pointer.id !== null) return;
  hand.ta = onWall(e) ? 1 : 0;
  if (onWall(e)) aim(x, y); else poke();
});
stage.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse' && pointer.id === null) { hand.ta = 0; poke(); } });
stage.addEventListener('pointerdown', e => {
  if (e.button !== 0 || !R || pointer.id !== null || !onWall(e)) return;
  try { stage.setPointerCapture(e.pointerId); } catch { /* capture is optional */ }
  const [x, y] = local(e);
  Object.assign(pointer, { id: e.pointerId, x0: x, y0: y, drag: false, at: performance.now(), touch: e.pointerType !== 'mouse' });
  hand.ta = 1;
  aim(x, y);
});
function endPointer(e) {
  if (e.pointerId !== pointer.id) return;
  const tap = !pointer.drag && e.type === 'pointerup' && performance.now() - pointer.at < 260;
  pointer.id = null;
  if (pointer.touch) hand.ta = 0;
  if (tap) gust(0.85, view.x + pointer.x0 / cssW * view.w);
  poke();
}
['pointerup', 'pointercancel', 'lostpointercapture'].forEach(t => stage.addEventListener(t, endPointer));

/* ---------- life cycle ---------- */
whenVisible(stage, on => {
  visible = on;
  if (on) { last = performance.now(); schedule(); }
  else { halt(); snd.quiet(true); }
});
onReducedChange(on => { calm = on; poke(); });
sound.onChange(on => { if (on) poke(); else snd.quiet(true); });
new ResizeObserver(() => resize()).observe(stage);

// ?qa hands the state to a test script.
if (new URLSearchParams(location.search).has('qa')) globalThis.__leaf = {
  get busy() { return !!(raf || timer); }, get fronts() { return fronts.length; }, get view() { return { ...view, cssW, cssH }; },
  gust: (a, x) => gust(a, x), setBreeze(v) { breeze = v; poke(); },
  showHand(x, y) { hand.ta = hand.a = 1; hand.tx = hand.x = x; hand.ty = hand.y = y; hand.ang = armAngle(); draw(); },
  // Runs the sim ahead by sec seconds in small steps, then draws.
  run(sec) { for (let s = 0; s < sec; s += 1 / 30) { gph += (0.22 + 0.55 * breeze) / 30; const m = stepBranches(1 / 30).mean; pt += (1.3 + 2.4 * m) / 30; pf += (4.5 + 9 * m) / 30; } draw(); },
  only(i) { qaOnly = i; draw(); }, over(o) { qaOver = o; draw(); }, freeze(on) { frozen = on; if (!on) poke(); }, get rung() { return D.rung; },
};

async function setup() {
  gl = canvas.getContext('webgl2', { antialias: false, alpha: false, depth: false, powerPreference: 'high-performance' });
  if (!gl) throw new Error('no webgl2');
  R = await makeRenderer(gl, { tree });
  sizeKey = '';
}
onContextLoss(canvas, {
  lost: () => { halt(); gl = null; R = null; },
  restored: async () => { await setup(); resize(true); poke(); },
  failed: () => fail.removeAttribute('hidden'),
});

mark('build');
try {
  await setup();
  // The first frame shows the breeze already under way.
  for (let i = 0; i < 90; i++) stepBranches(1 / 30);
  resize(true);
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
