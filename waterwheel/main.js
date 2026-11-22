// Water wheel: pour water; it runs down the flumes and turns three wheels.
// A flat side elevation in raw WebGL2. Water is particles; buckets hold a fill.
import { initPage, whenVisible, pageReady, stage as mark, reduced, onReducedChange, audioKit, sound } from '../shared/stim.js';
import { intro as playIntro } from '../shared/intro.js';
import { onContextLoss } from '../shared/gl.js';
import { detail } from '../shared/detail.js';
import { layout, makeSim } from './sim.js';
import { makeRender } from './render.js';
import { wheelSound } from './sound.js';
mark('libs');

const ID = 'waterwheel';
const stage = document.getElementById('stage');
const fail = stage.querySelector('.fail');
const store = {
  get(k) { try { return localStorage.getItem(`stimming.${ID}.${k}`); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(`stimming.${ID}.${k}`, String(v)); } catch { /* private mode */ } },
};
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const saved = Number(store.get('flow'));
let flow = clamp(Number.isFinite(saved) && saved > 0 ? saved : 0.7, 0.15, 1);

/* ---------- state ---------- */
const sim = makeSim();
// ?qa hands the sim to a test script.
if (new URLSearchParams(location.search).has('qa')) globalThis.__wwSim = sim;
const setRate = () => { sim.pour.rate = 50 + 170 * flow; };
setRate();
let gl = null, R = null, raf = 0, visible = true, last = 0, frameNo = 0, frozen = reduced();
let cssW = 1, cssH = 1, started = false;

/* ---------- bar ---------- */
const ui = initPage({ id: ID, bar: {
  actions: [{ verb: 'pour', label: 'Pour', key: 'Space', hold: true, onDown: () => keyPour(true), onUp: () => keyPour(false) }],
  slider: { label: 'Flow', min: 0.15, max: 1, step: 0.05, value: flow, onInput: v => { flow = v; setRate(); store.set('flow', v); touch(); } },
  quality: true,
  reset: () => { sim.clear(); touch(); },
  keys: [['hold', 'pour'], ['drag', 'move the stream'], ['space', 'pour into the flume']],
  help: [
    ['hold', 'Hold to pour water from above'],
    ['drag', 'Drag to move the stream'],
    ['click', 'Click to pour a splash'],
    ['space', 'Hold Space to pour into the head flume'],
  ],
} });
const introDone = playIntro({ ready: pageReady() });
const kit = audioKit({ keys: new Set([' ']), sleepMs: 1500 });
const snd = wheelSound(kit);

/* ---------- GL ---------- */
const canvas = document.createElement('canvas');
canvas.setAttribute('aria-hidden', 'true');
stage.prepend(canvas);
const D = detail({ maxDpr: 2, budget: 2.2e6, steps: 3, settle: 2, onChange: () => resize(true) });

// The free stage: everything between the bar strips.
function room() {
  const r = stage.getBoundingClientRect();
  const c = ui.cover?.() || { top: 0, bottom: 0 };
  const top = c.top || 0;
  return { w: r.width, h: Math.max(160, r.height - top - (c.bottom || 0)), top, H: r.height };
}
let sizeKey = '';
function resize(force = false) {
  if (!gl || !R) return;
  const r = stage.getBoundingClientRect(), rm = room();
  cssW = Math.max(1, r.width); cssH = Math.max(1, r.height);
  const ratio = D.dpr(cssW, cssH);
  const key = [cssW, cssH, ratio, rm.top, rm.h].map(Math.round).join();
  if (!force && key === sizeKey) return;
  sizeKey = key;
  const L = layout(rm);
  sim.setLayout(L);
  sim.maxP = D.rung >= 3 ? 1600 : 3200;
  sim.pour.x = L.headX;
  R.resize(cssW, cssH, ratio, L, { lowDens: D.rung >= 2 });
  // Before the loop starts, a new size still gets a picture.
  if (!started) R.frame(sim, { frameNo, frozen });
  wake();
}

/* ---------- frame loop ---------- */
// Lively while water moves or a wheel turns. Nothing drifts, so the loop then stops.
let timer = 0;
function frame(now) {
  raf = 0;
  if (!visible || !gl || !started) return;
  // A frame stamp can predate the wake, so dt never goes below zero.
  const dt = Math.max(0, Math.min(1 / 30, (now - last) / 1000));
  last = Math.max(last, now);
  let again = true;
  try {
    sim.step(dt, { calm: frozen });
    snd.update(sim, dt);
    R.frame(sim, { frameNo, frozen, bloomLevels: D.rung >= 2 ? 3 : 5 });
    D.frame(dt);
    frameNo++;
    again = pointer.down || sim.busy();
  } finally {
    // A thrown error still leaves the loop able to wake.
    if (again) schedule(); else snd.rest();
  }
}
// One frame at most is ever pending, so loops never stack.
function schedule() {
  if (raf || !visible || !gl || !started) return;
  raf = requestAnimationFrame(frame);
}
function wake() {
  if (timer) { clearTimeout(timer); timer = 0; }
  if (!raf) last = performance.now();
  schedule();
}
function halt() { cancelAnimationFrame(raf); raf = 0; }
function touch() { wake(); }

/* ---------- pointer: hold to pour, drag to move the stream ---------- */
const pointer = { down: false, id: null, x0: 0, y0: 0, moved: false, held: false, holdT: 0, tapT: 0 };
const local = e => { const r = stage.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
function aim(px) { sim.pour.x = R.toWorld(px, 0)[0]; }
stage.addEventListener('pointerdown', e => {
  if (e.button !== 0 || !R || (e.target !== canvas && e.target !== stage)) return;
  try { stage.setPointerCapture(e.pointerId); } catch { /* capture is optional */ }
  const [x, y] = local(e);
  Object.assign(pointer, { down: true, id: e.pointerId, x0: x, y0: y, moved: false, held: false });
  clearTimeout(pointer.holdT); clearTimeout(pointer.tapT);
  pointer.holdT = setTimeout(() => { pointer.held = true; }, 260);
  aim(x);
  // The gate opens at once: the gesture answers in the same frame.
  sim.pour.on = true;
  snd.gate(sim.pour.x, true);
  touch();
});
stage.addEventListener('pointermove', e => {
  if (!pointer.down || e.pointerId !== pointer.id) return;
  const [x, y] = local(e);
  if (!pointer.moved && Math.hypot(x - pointer.x0, y - pointer.y0) < 8) return;
  pointer.moved = true;
  aim(x);
  touch();
});
function endPointer(e) {
  if (!pointer.down || (e && e.pointerId !== pointer.id)) return;
  clearTimeout(pointer.holdT);
  pointer.down = false; pointer.id = null;
  // A tap pours a short splash; a hold or a drag stops at release.
  if (!pointer.moved && !pointer.held) pointer.tapT = setTimeout(() => { if (!pointer.down && !keyOn) sim.pour.on = false; }, 380);
  else if (!keyOn) sim.pour.on = false;
  touch();
}
['pointerup', 'pointercancel', 'lostpointercapture'].forEach(t => stage.addEventListener(t, endPointer));

// Space pours into the head flume.
let keyOn = false;
function keyPour(on) {
  if (!R || on === keyOn) return;
  keyOn = on;
  if (on) { sim.pour.x = sim.L.headX; sim.pour.on = true; snd.gate(sim.pour.x, true); }
  else if (!pointer.down) sim.pour.on = false;
  touch();
}

/* ---------- life cycle ---------- */
whenVisible(stage, on => {
  visible = on;
  if (on) wake();
  else { halt(); snd.hide(); }
});
onReducedChange(on => { frozen = on; wake(); });
sound.onChange(on => { if (on) touch(); });
new ResizeObserver(() => resize()).observe(stage);
ui.onCover?.(() => resize());

async function setup() {
  gl = canvas.getContext('webgl2', { antialias: false, alpha: false, depth: false, powerPreference: 'high-performance' });
  if (!gl) throw new Error('no webgl2');
  R = await makeRender(gl);
  sizeKey = '';
}
onContextLoss(canvas, {
  lost: () => { halt(); gl = null; R = null; },
  restored: async () => { await setup(); resize(true); wake(); },
  failed: () => fail.removeAttribute('hidden'),
});

// The first frame is a picture: water already runs and the buckets hold some.
function prewarm() {
  sim.pour.x = sim.L.headX;
  sim.pour.on = true;
  for (let t = 0; t < 5; t += 1 / 60) sim.step(1 / 60);
  sim.pour.on = false;
  for (let t = 0; t < 0.6; t += 1 / 60) sim.step(1 / 60);
  sim.ev.splash = []; sim.ev.spill = []; sim.ev.knock = [];
}

mark('build');
try {
  await setup();
  resize(true);
  prewarm();
  R.frame(sim, { frameNo, frozen });
  gl.finish();
  canvas.classList.add('on');
  mark('first-frame');
  // The run-down plays once the intro has gone.
  await introDone;
  started = true;
  wake();
} catch (err) {
  console.error(err);
  fail.removeAttribute('hidden');
  ui.hideControls?.();
}
