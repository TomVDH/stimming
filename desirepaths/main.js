// Desire paths: the pointer walks a park lawn and wears it, pass by pass.
// Blades bend and spring back; many passes flatten, yellow, then bare the turf.
// The lawn heals slowly where it is left alone.
import { initPage, whenVisible, pageReady, stage as mark, reduced, onReducedChange, audioKit, sound } from '../shared/stim.js';
import { intro as playIntro } from '../shared/intro.js';
import { onContextLoss } from '../shared/gl.js';
import { detail } from '../shared/detail.js';
import { makeRenderer } from './render.js';
import { makeWalker, makeCoarse, oldLine, pavedAt } from './lawn.js';
import { makeSound } from './sound.js';
mark('libs');

const ID = 'desirepaths';
const stage = document.getElementById('stage');
const fail = stage.querySelector('.fail');
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
// A bend springs back within this many seconds of the last print.
const SPRING_S = 22;
// A fresh lawn regrows over this many seconds.
const REGROW_S = 2.2;

/* ---------- state ---------- */
const saved = k => { try { return localStorage.getItem(`stimming.${ID}.${k}`); } catch { return null; } };
const save = (k, v) => { try { localStorage.setItem(`stimming.${ID}.${k}`, String(v)); } catch { /* private mode */ } };
let footfall = clamp(parseFloat(saved('footfall') ?? '1'), 0.25, 4);
if (!Number.isFinite(footfall)) footfall = 1;
let gl = null, R = null, raf = 0, timer = 0, visible = true, last = 0, frameNo = 0, calm = reduced();
let cssW = 1, cssH = 1, dpr = 1, started = false, lastInput = 0, lastPrint = -1e9, frozen = false;
let view = { x: -6, y: -3.75, w: 12, h: 7.5 };
// Ambient clocks: the wind in the blades and the cloud shadows.
let wind = 0, cloud = 9.6, drifting = 1, healDebt = 0, regrowT = 0;
let qaOver = {};
const prints = [];
const walker = makeWalker();
const coarse = makeCoarse();

/* ---------- bar ---------- */
const ui = initPage({ id: ID, bar: {
  actions: [
    { verb: 'mow', key: 'M', onPress: () => mow() },
  ],
  slider: { label: 'Footfall', min: 0.25, max: 4, step: 0.05, value: footfall, onInput: v => { footfall = v; save('footfall', v); poke(); } },
  quality: true,
  keys: [['move', 'walk the lawn'], ['drag', 'a crowd walks'], ['M', 'mow']],
  help: [
    ['move', 'Move over the lawn to walk it; each pass wears it a little'],
    ['drag', 'Drag to send a crowd along your line'],
    ['click', 'Tap to stop and stand'],
    ['M', 'Press M to mow a fresh lawn'],
  ],
} });
const introDone = playIntro({ ready: pageReady() });
const kit = audioKit({ keys: new Set(['m', 'M']), sleepMs: 1500 });
const snd = makeSound(kit);

/* ---------- GL ---------- */
const canvas = document.createElement('canvas');
canvas.setAttribute('aria-hidden', 'true');
stage.prepend(canvas);
// Rungs: the pixel ratio, then a smaller bloom.
const D = detail({ maxDpr: 2, budget: 2.4e6, steps: 2, settle: 2, onChange: () => resize(true) });

// The view: 7.5 m of lawn tall on a wide stage, 5.4 m wide on a narrow one.
function fitView() {
  const mpp = Math.max(7.5 / cssH, 5.4 / cssW);
  const w = cssW * mpp, h = cssH * mpp;
  // A tall stage slides right, onto the crossing.
  const cx = 0.3 + clamp((1 - cssW / cssH) * 1.6, 0, 1.1);
  view = { x: cx - w / 2, y: 0.2 - h / 2, w, h };
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

/* ---------- the lawn ---------- */
// A fresh lawn: the turf regrows over about two seconds.
function mow() {
  regrowT = REGROW_S;
  coarse.clear();
  snd.mow();
  poke();
}

// Late morning: warm sun, a cool sky fill.
const SUN_C = [2.3, 2.1, 1.8], SKY_C = [0.3, 0.38, 0.52];
function state() {
  return {
    t: performance.now() / 1000, wind, cloud, frameNo,
    sunC: SUN_C, skyC: SKY_C, expo: 0.62, bloomK: 0.12, bloomLevels: D.rung >= 2 ? 3 : 5,
    ...qaOver,
  };
}
function draw() { if (R) R.frame(state()); }

/* ---------- frame loop ---------- */
// Lively while the walker moves or a bend springs back; drifting at 30 fps; asleep after 60 s.
function frame(now) {
  raf = 0;
  if (!visible || !gl || !started) return;
  const t0 = performance.now();
  const dt = frozen ? 0 : Math.max(0, Math.min(1 / 15, (now - last) / 1000));
  last = Math.max(last, now);
  let again = true, lively = true;
  try {
    const idleFor = (t0 - lastInput) / 1000;
    // The wind and the clouds ease out over 2 s once the toy sleeps.
    drifting = idleFor > 60 ? Math.max(0, 1 - (idleFor - 60) / 2) : 1;
    const amb = calm ? 0 : drifting;
    wind += dt * 0.55 * amb;
    cloud += dt * 0.035 * amb;
    // The slow heal runs in whole seconds, so half floats keep each step.
    healDebt += dt * (drifting > 0 ? 1 : 0);
    let heal = 0;
    if (healDebt >= 1) { heal = Math.floor(healDebt); healDebt -= heal; coarse.heal(heal); }
    let regrow = 0;
    if (regrowT > 0) { regrowT = Math.max(0, regrowT - dt); regrow = 1; heal += dt * 420; }
    const springing = t0 - lastPrint < SPRING_S * 1000;
    if (prints.length || springing || heal > 0 || regrow) {
      R.step({ prints, dt, heal, gain: footfall, regrow });
      prints.length = 0;
    }
    snd.frame({ dt, amb });
    draw();
    D.frame(dt);
    frameNo++;
    // The spring back is slow: it runs at the drift rate once the walker stops.
    lively = t0 - lastPrint < 500 || regrow > 0;
    again = amb > 0 || lively || springing || snd.busy;
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

/* ---------- the walker ---------- */
const toWorld = (x, y) => [view.x + x / cssW * view.w, view.y + (1 - y / cssH) * view.h];
// Each new print also wears the coarse copy and tells the sound.
function walk(x, y, crowd) {
  const n0 = prints.length;
  const k = crowd ? 2.6 : 1;
  const n = walker.to(x, y, k, crowd ? 2.2 : 1, prints);
  for (let i = n0; i < prints.length; i += 8) {
    const px = prints[i], py = prints[i + 1];
    coarse.print(px, py, k * footfall);
    snd.step({ paved: pavedAt(px, py), wear: coarse.wear(px, py), pan: clamp((px - view.x) / view.w * 2 - 1, -1, 1), crowd });
  }
  if (n) lastPrint = performance.now();
  return n;
}

/* ---------- pointer ---------- */
// A press turns into a drag after 8 px, or a hold after 260 ms; otherwise a tap.
// A mouse walks on hover; a touch walks while the finger is down.
const pointer = { id: null, x0: 0, y0: 0, drag: false, at: 0, touch: false };
const local = e => { const r = stage.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
const onLawn = e => e.target === canvas || e.target === stage;
function move(e) {
  const evs = e.getCoalescedEvents?.() ?? [];
  for (const ev of evs.length ? evs : [e]) {
    const [x, y] = local(ev);
    const [wx, wy] = toWorld(x, y);
    walk(wx, wy, pointer.id !== null && pointer.drag);
  }
}
stage.addEventListener('pointermove', e => {
  if (e.pointerId === pointer.id) {
    const [x, y] = local(e);
    if (!pointer.drag && Math.hypot(x - pointer.x0, y - pointer.y0) > 8) pointer.drag = true;
    move(e);
    poke();
    return;
  }
  if (e.pointerType !== 'mouse' || pointer.id !== null) return;
  if (onLawn(e)) move(e); else walker.lift();
  poke();
});
stage.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse' && pointer.id === null) walker.lift(); });
stage.addEventListener('pointerdown', e => {
  if (e.button !== 0 || !R || pointer.id !== null || !onLawn(e)) return;
  try { stage.setPointerCapture(e.pointerId); } catch { /* capture is optional */ }
  const [x, y] = local(e);
  Object.assign(pointer, { id: e.pointerId, x0: x, y0: y, drag: false, at: performance.now(), touch: e.pointerType !== 'mouse' });
  if (pointer.touch) { walker.lift(); const [wx, wy] = toWorld(x, y); walk(wx, wy, false); }
  poke();
});
function endPointer(e) {
  if (e.pointerId !== pointer.id) return;
  const tap = !pointer.drag && e.type === 'pointerup' && performance.now() - pointer.at < 260;
  pointer.id = null;
  if (tap) {
    const [wx, wy] = toWorld(pointer.x0, pointer.y0);
    const n0 = prints.length;
    walker.stand(wx, wy, 1, prints);
    for (let i = n0; i < prints.length; i += 8) coarse.print(prints[i], prints[i + 1], footfall);
    snd.step({ paved: pavedAt(wx, wy), wear: coarse.wear(wx, wy), pan: clamp((wx - view.x) / view.w * 2 - 1, -1, 1), stand: true });
    lastPrint = performance.now();
  }
  if (pointer.touch) walker.lift();
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
if (new URLSearchParams(location.search).has('qa')) globalThis.__desire = {
  get busy() { return !!(raf || timer); }, get view() { return { ...view, cssW, cssH }; },
  // Walks n passes between two points in metres, back and forth, then draws.
  passes(n, a, b, crowd = false) {
    for (let k = 0; k < n; k++) {
      walker.lift();
      const [p, q] = k % 2 ? [b, a] : [a, b];
      for (let i = 0; i <= 80; i++) walk(p[0] + (q[0] - p[0]) * i / 80, p[1] + (q[1] - p[1]) * i / 80, crowd);
      R.step({ prints, dt: 0, heal: 0, gain: footfall });
      prints.length = 0;
    }
    walker.lift();
    draw();
  },
  spring(sec) { R.step({ dt: sec }); draw(); },
  heal(sec) { R.step({ heal: sec }); coarse.heal(sec); draw(); },
  over(o) { qaOver = o; draw(); }, freeze(on) { frozen = on; if (!on) poke(); }, get rung() { return D.rung; },
  get wearMax() { return coarse.max(); },
};

async function setup() {
  gl = canvas.getContext('webgl2', { antialias: false, alpha: false, depth: false, powerPreference: 'high-performance' });
  if (!gl) throw new Error('no webgl2');
  R = await makeRenderer(gl);
  // The first frame shows an old line already worn across the main corner.
  for (const batch of oldLine(220)) {
    R.step({ prints: batch, gain: 0.8 });
    for (let i = 0; i < batch.length; i += 8) coarse.print(batch[i], batch[i + 1], 0.8);
  }
  R.step({ dt: 60 });
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
