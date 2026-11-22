// Sorting sounds: pick an algorithm; a row of rods sorts itself.
// Each compare and each move lights up and sounds as the rod's note.
import { initPage, whenVisible, pageReady, stage as mark, reduced, onReducedChange, audioKit, sound, linFit } from '../shared/stim.js';
import { intro as playIntro } from '../shared/intro.js';
import { onContextLoss } from '../shared/gl.js';
import { detail } from '../shared/detail.js';
import { ALGOS, NAMES, shuffled, isSorted } from './algos.js';
import { makeRenderer, ROD_FLOATS } from './render.js';
import { makeSound, noteOf } from './sound.js';
mark('libs');

const ID = 'sorting';
const stage = document.getElementById('stage');
const fail = stage.querySelector('.fail');
const store = {
  get(k) { try { return localStorage.getItem(`stimming.${ID}.${k}`); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(`stimming.${ID}.${k}`, String(v)); } catch { /* private mode */ } },
};
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

/* ---------- state ---------- */
// The slider runs 0 to 1; the rate is 3 to 1200 steps a second.
const toRate = v => 3 * 400 ** clamp(v, 0, 1);
const savedV = Number(store.get('speed'));
let speedV = store.get('speed') != null && Number.isFinite(savedV) ? clamp(savedV, 0, 1) : 0.5;
let algo = ALGOS[store.get('algo')] ? store.get('algo') : 'quick';
// The sweep runs the row in this many seconds.
const SWEEP = 1.7;

let N = 48, a = [], gen = null, running = false, due = 0, markV = -1;
// Per rod, by value: shown slot, goal slot, heat, tip glint, sheen, shuffle wait.
let pos, goal, heat, tip, sheen, wait;
let sheenTo = 0, sweepT = -1, sweepNote = -1, sweepIdx = 0, startAfterShuffle = false, dealing = false;
let colors = [];
let gl = null, R = null, raf = 0, visible = true, last = 0, frameNo = 0, calm = reduced();
let cssW = 1, cssH = 1, dpr = 1, started = false, heard = false;
let view = { x0: 0, pitch: 1, floor: 0, maxH: 1, drop: 1, hw: 1 };
const events = [];
// ?qa hands the state to a test script.
if (new URLSearchParams(location.search).has('qa')) globalThis.__sort = { get a() { return a; }, get running() { return running; }, get sweep() { return sweepT; }, get algo() { return algo; }, get N() { return N; } };

/* ---------- bar ---------- */
const ui = initPage({ id: ID, bar: {
  choice: {
    label: 'Algorithm',
    value: algo,
    options: Object.keys(ALGOS).map((k, i) => ({ value: k, label: NAMES[k], key: String(i + 1) })),
    onPick: v => pick(v),
  },
  actions: [
    { verb: 'sort', key: 'Space', onPress: () => sortPress() },
    { verb: 'shuffle', key: 'S', onPress: () => shuffle(false) },
  ],
  slider: { label: 'Speed', min: 0, max: 1, step: 0.001, value: speedV, onInput: v => { speedV = v; store.set('speed', v); } },
  quality: true,
  keys: [['click', 'sort'], ['drag', 'play']],
  help: [
    ['click', 'Tap to sort the row; tap again to pause'],
    ['drag', 'Drag across the rods to play their notes'],
    ['Space', 'Press Space to sort, pause or go on'],
    ['S', 'Press S to shuffle the row'],
  ],
} });
const introDone = playIntro({ ready: pageReady() });
const kit = audioKit({ keys: new Set([' ', 's', 'S', '1', '2', '3', '4', '5', '6']), sleepMs: 1500 });
const snd = makeSound(kit);
const sortBtn = () => document.querySelectorAll('.stim-ui [aria-keyshortcuts="Space"]');
function syncBar() { sortBtn().forEach(b => b.setAttribute('aria-pressed', String(running))); }

/* ---------- GL ---------- */
const canvas = document.createElement('canvas');
canvas.setAttribute('aria-hidden', 'true');
stage.prepend(canvas);
const D = detail({ maxDpr: 2, budget: 2.6e6, steps: 2, settle: 2, onChange: () => resize(true) });

// Low rods are deep indigo, then violet and rose; high rods are warm gold.
function ramp(n) {
  colors = Array.from({ length: n }, (_, v) => {
    const t = v / Math.max(1, n - 1);
    return linFit(0.44 + 0.42 * t, 0.15 + 0.04 * Math.sin(Math.PI * t), 278 + 162 * t);
  });
}

// The row fills the free stage between the bar parts.
function fit() {
  const c = ui.cover?.() || { top: 0, bottom: 0 };
  const top = c.top || 0, bot = c.bottom || 0;
  const freeH = Math.max(160, cssH - top - bot);
  const narrow = cssW < 640;
  const rowW = Math.min(cssW * 0.8, freeH * 2.4);
  const pitch = rowW / N;
  const floor = top + freeH * (narrow ? 0.7 : 0.73);
  view = {
    x0: (cssW - rowW) / 2, pitch, floor,
    maxH: freeH * (narrow ? 0.56 : 0.6), drop: freeH * 0.3, hw: pitch * 0.29,
  };
}
let sizeKey = '';
function resize(force = false) {
  if (!gl || !R) return;
  const r = stage.getBoundingClientRect();
  cssW = Math.max(1, r.width); cssH = Math.max(1, r.height);
  // A narrow stage holds fewer rods.
  const want = cssW < 640 ? 32 : 48;
  if (want !== N) build(want);
  dpr = D.dpr(cssW, cssH);
  const c = ui.cover?.() || { top: 0, bottom: 0 };
  const key = [cssW, cssH, dpr, c.top || 0, c.bottom || 0].map(v => Math.round(v * 100)).join();
  if (!force && key === sizeKey) return;
  sizeKey = key;
  R.resize(Math.round(cssW * dpr), Math.round(cssH * dpr));
  fit();
  draw();
}

/* ---------- the row ---------- */
function build(n) {
  N = n;
  a = shuffled(N);
  pos = new Float32Array(N); goal = new Float32Array(N);
  heat = new Float32Array(N); tip = new Float32Array(N); sheen = new Float32Array(N); wait = new Float32Array(N);
  a.forEach((v, i) => { pos[v] = goal[v] = i; });
  ramp(N);
  gen = null; running = false; markV = -1; sweepT = -1; sheenTo = 0;
  syncBar();
}
const xOf = s => (view.x0 + (s + 0.5) * view.pitch) / cssW * 2 - 1;
const slotAt = x => Math.floor((x - view.x0) / view.pitch);

// Runs one step on the rods: light, sound, new goal slots.
// at: the step's time within this frame, in seconds.
function apply(s, at) {
  const ev = (v, slot, bright) => events.push({ n: noteOf(v, N), x: xOf(slot), bright, at });
  if (s.k === 'cmp') {
    const p = a[s.i], q = a[s.j];
    tip[p] = 1; tip[q] = 1;
    heat[p] = Math.max(heat[p], 0.1); heat[q] = Math.max(heat[q], 0.1);
    ev(p, s.i, false); ev(q, s.j, false);
  } else if (s.k === 'swap') {
    const p = a[s.i], q = a[s.j];
    goal[p] = s.i; goal[q] = s.j;
    heat[p] = 1; heat[q] = 1;
    ev(q, s.j, true); ev(p, s.i, true);
  } else if (s.k === 'move') {
    for (let k = s.to; k <= s.from; k++) {
      const v = a[k];
      goal[v] = k;
      // The rods that step aside warm a little.
      heat[v] = Math.max(heat[v], k === s.to ? 1 : 0.22);
    }
    ev(a[s.to], s.to, true);
  } else if (s.k === 'read') {
    const v = a[s.i];
    tip[v] = Math.max(tip[v], 0.45);
    heat[v] = Math.max(heat[v], 0.14);
    ev(v, s.i, false);
  }
}

// Runs steps until a timed one: marks take no time.
function next() {
  for (;;) {
    const r = gen.next();
    if (r.done) return null;
    if (r.value.k === 'mark') { markV = r.value.v; continue; }
    return r.value;
  }
}

function start() {
  if (isSorted(a)) { shuffle(true); return; }
  gen = ALGOS[algo](a);
  running = true; due = 1; markV = -1; sweepT = -1; sheenTo = 0;
  syncBar();
  poke();
}
function sortPress() {
  if (sweepT >= 0) return;
  if (gen && running) { running = false; syncBar(); }
  else if (gen) { running = true; due = 1; syncBar(); }
  else start();
  poke();
}
function pick(v) {
  if (!ALGOS[v]) return;
  algo = v;
  store.set('algo', v);
  gen = null; running = false;
  start();
}
// Deals the rods into a new order; then starts when asked.
function shuffle(thenStart) {
  gen = null; running = false; markV = -1; sweepT = -1; sheenTo = 0;
  const b = shuffled(N);
  b.forEach((v, i) => {
    goal[v] = i;
    wait[v] = calm ? 0 : Math.random() * 0.32;
    if (calm) pos[v] = i;
  });
  a = b;
  dealing = true;
  startAfterShuffle = thenStart;
  snd.riffle();
  syncBar();
  poke();
}
function finish() {
  gen = null; running = false; markV = -1;
  sweepT = 0; sweepNote = -1; sweepIdx = 0;
  syncBar();
}

/* ---------- drawing ---------- */
const rodBuf = new Float32Array(256 * ROD_FLOATS);
function draw() {
  if (!R) return;
  const H = cssH * dpr;
  const hw = view.hw * dpr, floor = H - view.floor * dpr;
  for (let v = 0; v < N; v++) {
    const o = v * ROD_FLOATS, c = colors[v];
    const h = (0.07 + 0.93 * (v + 1) / N) * view.maxH * dpr;
    rodBuf[o] = (view.x0 + (pos[v] + 0.5) * view.pitch) * dpr;
    rodBuf[o + 1] = floor; rodBuf[o + 2] = hw; rodBuf[o + 3] = h;
    rodBuf[o + 4] = c[0]; rodBuf[o + 5] = c[1]; rodBuf[o + 6] = c[2]; rodBuf[o + 7] = Math.min(1, heat[v]);
    rodBuf[o + 8] = tip[v]; rodBuf[o + 9] = sheen[v]; rodBuf[o + 10] = v === markV ? 1 : 0; rodBuf[o + 11] = 0;
  }
  const sx = sweepT >= 0 ? (view.x0 + (sweepIdx + 0.5) * view.pitch) * dpr : -1e4;
  const sl = sweepT >= 0 ? Math.min(1, sweepT * 4) * (1 - clamp((sweepT - SWEEP) / 0.6, 0, 1)) : 0;
  R.render(rodBuf, N, {
    floor, rowH: view.maxH * dpr, x0: view.x0 * dpr, x1: (view.x0 + N * view.pitch) * dpr, drop: view.drop * dpr,
  }, [sx, view.pitch * dpr * 1.6, sl], { frameNo: calm ? 0 : frameNo, bloomLevels: D.rung >= 2 || cssW < 640 ? 4 : 6 });
}

/* ---------- frame loop ---------- */
// Lively while a sort, a glide, a glow or the sweep runs; then it stops.
function frame(now) {
  raf = 0;
  if (!visible || !gl || !started) return;
  const dt = Math.max(0, Math.min(1 / 20, (now - last) / 1000));
  last = Math.max(last, now);
  let again = false;
  try {
    const rate = toRate(speedV);
    // The sort: whole steps as the rate allows, spread over the frame.
    if (running && gen) {
      due = Math.min(due + rate * dt, rate * 0.1 + 2);
      const n = Math.floor(due);
      for (let k = 0; k < n; k++) {
        const s = next();
        if (!s) { finish(); break; }
        apply(s, (k / Math.max(1, n)) * dt);
        due -= 1;
      }
    }
    // The sweep: a light runs the row; a new note sounds at each step up.
    if (sweepT >= 0) {
      sweepT += dt;
      const reach = calm ? N : Math.min(N, Math.floor((sweepT / SWEEP) * N));
      for (; sweepIdx < reach; sweepIdx++) {
        const v = a[sweepIdx], nn = noteOf(v, N);
        heat[v] = calm ? 0 : 1;
        sheen[v] = 1;
        if (nn !== sweepNote) { sweepNote = nn; snd.ring(nn, xOf(sweepIdx), 0.42, 0.7); }
      }
      if (sweepIdx >= N && sweepNote !== -2) { sweepNote = -2; sheenTo = 1; snd.chord(); }
      if (sweepT > SWEEP + 0.7 || calm) sweepT = -1;
    }
    // Glide, cool and ease, by value.
    const tau = dealing ? 0.09 : clamp(0.35 / rate, 0.014, 0.07);
    const kg = calm ? 1 : 1 - Math.exp(-dt / tau);
    // Reduced motion: glows still answer, but fade fast.
    const ease = t => 1 - Math.exp(-dt / (calm ? Math.min(t, 0.06) : t));
    const kh = ease(0.22), kt = ease(0.16), ks = calm ? 1 : ease(0.6);
    let moving = false, warm = false;
    for (let v = 0; v < N; v++) {
      if (wait[v] > 0) { wait[v] -= dt; moving = true; continue; }
      const d = goal[v] - pos[v];
      if (Math.abs(d) > 0.002) { pos[v] += d * kg; moving = true; } else pos[v] = goal[v];
      heat[v] -= heat[v] * kh; tip[v] -= tip[v] * kt;
      if (heat[v] < 0.002) heat[v] = 0;
      if (tip[v] < 0.002) tip[v] = 0;
      sheen[v] += ((sweepIdx > 0 && sweepT >= 0 ? sheen[v] : sheenTo) - sheen[v]) * ks;
      if (heat[v] || tip[v] || Math.abs(sheen[v] - sheenTo) > 0.003 && sweepT < 0) warm = true;
    }
    if (!moving) dealing = false;
    if (startAfterShuffle && !moving) { startAfterShuffle = false; start(); }
    if (events.length) { snd.steps(events, rate); events.length = 0; }
    draw();
    // The audio context sleeps once the last tone ends.
    if (heard && !snd.busy) kit.rest(() => !snd.busy);
    heard = snd.busy;
    D.frame(dt);
    frameNo++;
    again = (running && !!gen) || sweepT >= 0 || moving || warm || startAfterShuffle;
  } finally {
    // A thrown error still leaves the loop able to wake.
    if (again) schedule(); else rest();
  }
}
function rest() { kit.rest(() => !raf && !snd.busy); }
function schedule() {
  if (raf || !visible || !gl || !started) return;
  raf = requestAnimationFrame(frame);
}
function poke() {
  if (!raf) last = performance.now();
  schedule();
}
function halt() { cancelAnimationFrame(raf); raf = 0; }

/* ---------- pointer: tap sorts, drag strums ---------- */
const pointer = { id: null, x0: 0, y0: 0, t0: 0, moved: false, lx: 0, lt: 0 };
const local = e => { const r = stage.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
// One rod flashes, as a struck bar; its note joins the strum.
const strum = [];
function strike(slot) {
  if (slot < 0 || slot >= N) return;
  const v = a[slot];
  heat[v] = 1; tip[v] = 1;
  strum.push({ n: noteOf(v, N), x: xOf(slot) });
}
stage.addEventListener('pointerdown', e => {
  if (e.button !== 0 || !R || pointer.id !== null || (e.target !== canvas && e.target !== stage)) return;
  try { stage.setPointerCapture(e.pointerId); } catch { /* capture is optional */ }
  const [x, y] = local(e);
  Object.assign(pointer, { id: e.pointerId, x0: x, y0: y, t0: performance.now(), moved: false, lx: x, lt: 0 });
  poke();
});
stage.addEventListener('pointermove', e => {
  if (e.pointerId !== pointer.id) return;
  const [x, y] = local(e);
  if (!pointer.moved) {
    if (Math.hypot(x - pointer.x0, y - pointer.y0) < 8) return;
    // The press becomes a strum: the first rod rings at once.
    pointer.moved = true;
    pointer.lx = pointer.x0;
    strike(slotAt(pointer.x0));
  }
  const span = Math.min(0.05, (e.timeStamp - (pointer.lt || e.timeStamp)) / 1000);
  pointer.lt = e.timeStamp;
  // Each rod line the pointer crosses rings its rod.
  const s0 = slotAt(pointer.lx), s1 = slotAt(x);
  if (s1 !== s0) {
    const dir = Math.sign(s1 - s0);
    for (let s = s0 + dir; s !== s1 + dir; s += dir) strike(s);
  }
  pointer.lx = x;
  if (strum.length) { snd.strum(strum, span); strum.length = 0; }
  poke();
});
function endPointer(e) {
  if (e.pointerId !== pointer.id) return;
  const tap = !pointer.moved && e.type === 'pointerup';
  pointer.id = null;
  if (tap) sortPress();
  poke();
}
['pointerup', 'pointercancel', 'lostpointercapture'].forEach(t => stage.addEventListener(t, endPointer));

/* ---------- life cycle ---------- */
whenVisible(stage, on => {
  visible = on;
  if (on) { last = performance.now(); schedule(); }
  else { halt(); snd.quiet(); }
});
onReducedChange(on => { calm = on; poke(); });
sound.onChange(on => { if (on) poke(); });
new ResizeObserver(() => resize()).observe(stage);
ui.onCover?.(() => resize());

async function setup() {
  gl = canvas.getContext('webgl2', { antialias: false, alpha: false, depth: false, powerPreference: 'high-performance' });
  if (!gl) throw new Error('no webgl2');
  if (!gl.getExtension('EXT_color_buffer_float') && !gl.getExtension('EXT_color_buffer_half_float')) throw new Error('no float targets');
  R = await makeRenderer(gl);
  sizeKey = '';
}
onContextLoss(canvas, {
  lost: () => { halt(); gl = null; R = null; },
  restored: async () => { await setup(); resize(true); poke(); },
  failed: () => fail.removeAttribute('hidden'),
});

// The first frame is a picture: the sort a third of the way in, its wake still warm.
function prewarm() {
  build(cssW < 640 ? 32 : 48);
  gen = ALGOS[algo](a);
  const steps = [];
  for (let k = 0; k < 120; k++) { const s = next(); if (!s) break; steps.push(s); }
  // Only the last steps keep their glow.
  steps.forEach((s, k) => {
    apply(s, 0);
    const age = steps.length - 1 - k;
    if (age > 0) for (let v = 0; v < N; v++) { heat[v] *= 0.86; tip[v] *= 0.7; }
  });
  events.length = 0;
  for (let v = 0; v < N; v++) pos[v] = goal[v];
}

mark('build');
try {
  const r = stage.getBoundingClientRect();
  cssW = Math.max(1, r.width);
  await setup();
  prewarm();
  resize(true);
  draw();
  gl.finish();
  canvas.classList.add('on');
  mark('first-frame');
  await introDone;
  started = true;
  // The sort goes on by itself after the intro; reduced motion waits for a tap.
  if (!calm) { running = true; due = 1; syncBar(); }
  poke();
} catch (err) {
  console.error(err);
  fail.removeAttribute('hidden');
  ui.hideControls?.();
}
