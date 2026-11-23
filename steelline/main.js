// Steel line: a whole steelworks cut open in one slice, ore at the left, coils at the right.
// Each step waits on the one before; tap a building to rush it, hold the yard for a train.
// The line is wider than the screen: drag to pan, or let the view drift.
import { initPage, whenVisible, pageReady, stage as mark, reduced, onReducedChange, audioKit, sound } from '../shared/stim.js';
import { intro as playIntro } from '../shared/intro.js';
import { onContextLoss } from '../shared/gl.js';
import { detail } from '../shared/detail.js';
import { makeRenderer } from './render.js';
import { buildWorks, LINE_W } from './works.js';
import { makeLine, STEPS } from './line.js';
import { makeShow } from './show.js';
import { makeCrew } from './crew.js';
import { makeSound } from './sound.js';
mark('libs');

const ID = 'steelline';
const stage = document.getElementById('stage');
const fail = stage.querySelector('.fail');
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const qa = new URLSearchParams(location.search).has('qa');

/* ---------- state ---------- */
const saved = k => { try { return localStorage.getItem(`stimming.${ID}.${k}`); } catch { return null; } };
const save = (k, v) => { try { localStorage.setItem(`stimming.${ID}.${k}`, String(v)); } catch { /* private mode */ } };
let pace = clamp(parseFloat(saved('pace') ?? '1'), 0.25, 3);
if (!Number.isFinite(pace)) pace = 1;
let gl = null, R = null, raf = 0, timer = 0, visible = true, last = 0, frameNo = 0, calm = reduced();
let cssW = 1, cssH = 1, dpr = 1, started = false, lastInput = 0, frozen = false, qaOver = {};
// The view: a centre on the line, and its size in metres.
let cx = 262, vel = 0, drift = 1, driftDir = 1, held = 0;
let view = { x: 0, y: 0, w: 160, h: 100 };
let line = makeLine();
let crew = makeCrew();
const show = makeShow();
const works = buildWorks();
// The steps, by their span on the line.
const SPANS = [['yard', -40, 190], ['furnace', 190, 345], ['converter', 345, 452], ['caster', 452, 540], ['mill', 540, LINE_W + 40]];
const stepAt = x => SPANS.find(([, a, b]) => x >= a && x < b)?.[0] ?? null;

/* ---------- bar ---------- */
const ui = initPage({ id: ID, bar: {
  actions: [
    { verb: 'train', label: 'Ore train', key: ' ', onPress: () => { line.callTrain(); poke(); } },
  ],
  slider: { label: 'Shift speed', min: 0.25, max: 3, step: 0.05, value: pace, onInput: v => { pace = v; save('pace', v); poke(); } },
  quality: true,
  reset: () => resetWorks(),
  keys: [['drag', 'pan'], ['click', 'rush a step'], ['Space', 'ore train']],
  help: [
    ['drag', 'Drag to pan along the line'],
    ['click', 'Tap a building to rush it for a while'],
    ['hold', 'Hold on the ore yard to bring a train'],
    ['Space', 'Press Space to bring an ore train'],
  ],
} });
const introDone = playIntro({ ready: pageReady() });
const kit = audioKit({ keys: new Set([' ']), sleepMs: 1500 });
const snd = makeSound(kit);

function resetWorks() { line = makeLine(); crew = makeCrew(); warm(); poke(); }
// The first frame shows a works in full swing.
function warm() { for (let i = 0; i < 1200; i++) line.step(0.1); line.takeEvents(); }
warm();

/* ---------- GL ---------- */
const canvas = document.createElement('canvas');
canvas.setAttribute('aria-hidden', 'true');
stage.prepend(canvas);
// Rungs: the pixel ratio, then the bloom.
const D = detail({ maxDpr: 2, budget: 2.6e6, steps: 2, settle: 2, onChange: () => resize(true) });

// The view holds the works from the tunnel to the furnace top.
// The bar's strip at the foot shows soil, not works.
function fitView() {
  const foot = Math.min(ui.cover?.().bottom ?? 0, cssH * 0.3);
  const mpp = Math.max(112 / (cssH - foot), 64 / cssW);
  const w = cssW * mpp, h = cssH * mpp;
  cx = clamp(cx, w / 2 - 12, LINE_W - w / 2 + 12);
  // Grade sits low; the tunnels and pits show under it.
  const y0 = -19 - foot * mpp;
  view = { x: cx - w / 2, y: Math.min(y0, 34 - h / 2), w, h };
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
  R.resize(Math.round(cssW * dpr), Math.round(cssH * dpr), D.rung >= 1 ? 0.35 : 0.5);
  draw();
}

/* ---------- picture ---------- */
function state() {
  const st = line.st;
  const pic = show.build(st, view, crew.crew);
  return {
    view, t: st.t, day: st.day, amb: [0.07 + 0.5 * st.day, 0.08 + 0.52 * st.day, 0.11 + 0.56 * st.day], belt: st.beltPos, frameNo,
    expo: 1.1 - 0.25 * st.day, bloomK: 0.22, bloomLevels: D.rung >= 2 ? 3 : 5,
    ...pic, ...qaOver,
  };
}
function draw() { if (R) R.frame(state()); }

/* ---------- frame loop ---------- */
// Lively while the hand acts or the view moves; drifting at 30 fps; asleep after 60 s.
function frame(now) {
  raf = 0;
  if (!visible || !gl || !started) return;
  const t0 = performance.now();
  const dt = frozen ? 0 : Math.max(0, Math.min(1 / 15, (now - last) / 1000));
  last = Math.max(last, now);
  let again = true, lively = true;
  try {
    const idleFor = (t0 - lastInput) / 1000;
    // The works eases to a stop over 2 s once the toy sleeps.
    drift = idleFor > 60 ? Math.max(0, 1 - (idleFor - 60) / 2) : 1;
    const sdt = dt * pace * drift;
    line.step(sdt);
    crew.step(sdt, line.st.busy, line.st.rush);
    show.step(sdt, line.st, calm);
    for (const e of line.takeEvents()) snd.event(e, view);
    // The view: inertia after a drag, then a slow drift along the line.
    if (pointer.id === null) {
      if (Math.abs(vel) > 0.05 && !calm) { cx += vel * dt; vel *= Math.exp(-dt * 3); }
      else vel = 0;
      if (!calm && t0 - pointer.upAt > 6000) {
        cx += driftDir * dt * 2.2 * drift;
        const lo = view.w / 2 - 12, hi = LINE_W - view.w / 2 + 12;
        if (cx > hi) driftDir = -1;
        if (cx < lo) driftDir = 1;
      }
    }
    fitView();
    snd.frame({ dt, view, st: line.st, amb: drift });
    draw();
    D.frame(dt);
    frameNo++;
    lively = pointer.id !== null || Math.abs(vel) > 0.05 || t0 - lastInput < 1500;
    again = drift > 0 || lively || snd.busy;
  } finally {
    // A thrown error still leaves the loop able to wake.
    if (again) schedule(lively ? 0 : t0 + 33 - performance.now()); else rest();
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
// A press becomes a drag after 8 px or a hold after 260 ms; otherwise a tap.
const pointer = { id: null, x0: 0, y0: 0, x: 0, drag: false, at: 0, upAt: -1e9, hold: false, lastX: 0, lastT: 0 };
const local = e => { const r = stage.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
const toWorld = (x, y) => [view.x + x / cssW * view.w, view.y + (1 - y / cssH) * view.h];
let holdT = 0;
stage.addEventListener('pointerdown', e => {
  if (e.button !== 0 || !R || pointer.id !== null || (e.target !== canvas && e.target !== stage)) return;
  try { stage.setPointerCapture(e.pointerId); } catch { /* capture is optional */ }
  const [x, y] = local(e);
  Object.assign(pointer, { id: e.pointerId, x0: x, y0: y, x, drag: false, at: performance.now(), hold: false, lastX: x, lastT: performance.now() });
  vel = 0;
  clearTimeout(holdT);
  // A hold on the ore yard calls a train.
  holdT = setTimeout(() => {
    if (pointer.id === null || pointer.drag) return;
    pointer.hold = true;
    const [wx] = toWorld(pointer.x0, pointer.y0);
    if (stepAt(wx) === 'yard') { line.callTrain(); poke(); }
  }, 260);
  poke();
});
stage.addEventListener('pointermove', e => {
  if (e.pointerId !== pointer.id) return;
  const [x, y] = local(e);
  if (!pointer.drag && Math.hypot(x - pointer.x0, y - pointer.y0) > 8) { pointer.drag = true; stage.classList.add('is-dragging'); clearTimeout(holdT); }
  if (pointer.drag) {
    const now = performance.now(), dx = x - pointer.x;
    cx -= dx / cssW * view.w;
    const dtp = Math.max(1, now - pointer.lastT);
    // A fling keeps at most 120 m/s.
    vel = clamp(-(dx / cssW * view.w) / (dtp / 1000) * 0.5 + vel * 0.5, -120, 120);
    pointer.lastT = now;
    fitView();
  }
  pointer.x = x;
  poke();
});
function endPointer(e) {
  if (e.pointerId !== pointer.id) return;
  clearTimeout(holdT);
  const tap = !pointer.drag && !pointer.hold && e.type === 'pointerup';
  if (tap) {
    const [wx] = toWorld(pointer.x0, pointer.y0);
    const s = stepAt(wx);
    if (s) { line.st.rush[s] = 20; snd.rush(s, view); }
  }
  if (!pointer.drag || calm) vel = 0;
  if (performance.now() - pointer.lastT > 80) vel = 0;
  pointer.id = null; pointer.upAt = performance.now();
  stage.classList.remove('is-dragging');
  poke();
}
['pointerup', 'pointercancel', 'lostpointercapture'].forEach(t => stage.addEventListener(t, endPointer));
// Arrow keys pan too.
stage.addEventListener('keydown', e => {
  if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { cx += (e.key === 'ArrowLeft' ? -1 : 1) * view.w * 0.25; pointer.upAt = performance.now(); fitView(); poke(); e.preventDefault(); }
});

/* ---------- life cycle ---------- */
whenVisible(stage, on => {
  visible = on;
  if (on) { last = performance.now(); schedule(); }
  else { halt(); snd.quiet(true); }
});
onReducedChange(on => { calm = on; poke(); });
sound.onChange(on => { if (on) poke(); else snd.quiet(true); });
new ResizeObserver(() => resize()).observe(stage);
ui.onCover?.(() => { fitView(); draw(); });

// ?qa hands the state to a test script.
if (qa) globalThis.__steel = {
  get busy() { return !!(raf || timer); }, get view() { return { ...view, cssW, cssH }; }, get line() { return line; },
  at(x) { cx = x; pointer.upAt = performance.now() + 1e9; fitView(); draw(); },
  run(sec, step = 0.05) { for (let t = 0; t < sec; t += step) { line.step(step); crew.step(step, line.st.busy, line.st.rush); show.step(step, line.st, false); } line.takeEvents(); draw(); },
  // Runs the works until pred(state) holds, at most max seconds.
  until(pred, max = 400, step = 0.05) { for (let t = 0; t < max && !pred(line.st); t += step) { line.step(step); crew.step(step, line.st.busy, line.st.rush); show.step(step, line.st, false); } line.takeEvents(); draw(); return line.st.t; },
  over(o) { qaOver = o; draw(); }, freeze(on) { frozen = on; if (!on) poke(); }, get rung() { return D.rung; }, steps: STEPS,
};

async function setup() {
  gl = canvas.getContext('webgl2', { antialias: false, alpha: false, depth: false, powerPreference: 'high-performance' });
  if (!gl) throw new Error('no webgl2');
  R = await makeRenderer(gl, works);
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
