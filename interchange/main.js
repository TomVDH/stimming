// Interchange trails: a motorway interchange at night, from straight above, as a long exposure.
// Headlights and tail lights draw the flow. Swap the design; the trails rebuild.
// A slow car burns brighter, so every jam shows as a knot of light.
import { initPage, whenVisible, pageReady, stage as mark, reduced, onReducedChange, audioKit, sound } from '../shared/stim.js';
import { intro as playIntro } from '../shared/intro.js';
import { onContextLoss } from '../shared/gl.js';
import { detail } from '../shared/detail.js';
import { buildNet, ORDER, DESIGNS } from './designs.js';
import { makeSim, MAX_CARS } from './sim.js';
import { drawMap } from './basemap.js';
import { makeRenderer, SEG_F, CAR_F } from './render.js';
import { makeSound } from './sound.js';
mark('libs');

const ID = 'interchange';
const stage = document.getElementById('stage');
const fail = stage.querySelector('.fail');
const store = {
  get(k) { try { return localStorage.getItem(`stimming.${ID}.${k}`); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(`stimming.${ID}.${k}`, String(v)); } catch { /* private mode */ } },
};
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const Q = new URLSearchParams(location.search), qa = Q.has('qa');

/* ---------- state ---------- */
// The view holds this many metres each side of the crossing on the short side.
const HALF = 205;
// Lanes run this far, so new cars start off screen.
const REACH = 560;
// The plate's memory, in seconds: a stroke keeps 1/e of its light after TAU.
const TAU = 7, TAU_SWAP = 1.8;
let designId = ORDER.includes(store.get('design')) ? store.get('design') : 'cloverleaf';
const savedFlow = Number(store.get('flow'));
let flowV = store.get('flow') != null && Number.isFinite(savedFlow) ? clamp(savedFlow, 0, 1) : 0.35;
let net = buildNet(designId, REACH), sim = makeSim(net, flowV);
let gl = null, R = null, raf = 0, drift = 0, visible = true, last = 0, lastDraw = 0, frameNo = 0, calm = reduced();
let cssW = 1, cssH = 1, dpr = 1, started = false, lastInput = -1e9, woke = false, heard = false;
// The sim clock's rate: 1 in play, easing to 0 as the toy sleeps.
let rate = 1;
// The view: crossing centre in CSS pixels and pixels per metre.
const view = { cx: 0, cy: 0, s: 1 };
// The swap: the new map fades in, the old trails fade fast.
let mixT = 1, swapT = 9;
const segs = new Float32Array(MAX_CARS * 4 * SEG_F), carBuf = new Float32Array(MAX_CARS * CAR_F);
const mapCanvas = document.createElement('canvas');

if (qa) globalThis.__ic = {
  get sim() { return sim; }, get net() { return net; }, get rate() { return rate; }, get raf() { return raf; },
  get dbg() { return { raf, drift, visible, started, design: designId, flow: flowV, cars: sim.cars.length, crawling: sim.crawling, pointer: pointer.id }; },
  run: secs => { for (let t = 0; t < secs; t += 1 / 30) advance(1 / 30); draw(); },
  pick: id => setDesign(id),
  screen: k => { const c = sim.cars[k % sim.cars.length], r = stage.getBoundingClientRect(); return [r.left + view.cx + c.pose[0] * view.s, r.top + view.cy - c.pose[1] * view.s]; },
};

/* ---------- bar ---------- */
const ui = initPage({ id: ID, bar: {
  choice: {
    label: 'Design', value: designId,
    options: ORDER.map(id => ({ value: id, label: DESIGNS[id]().name })),
    onPick: v => setDesign(v),
  },
  actions: [
    { verb: 'clear', label: 'Clear', key: 'C', onPress: () => clearPlate() },
  ],
  slider: { label: 'Traffic', min: 0, max: 1, step: 0.01, value: flowV, onInput: v => setFlow(v) },
  quality: true,
  keys: [['click', 'brake'], ['hold', 'stop'], ['C', 'clear']],
  help: [
    ['click', 'Tap a car to brake it hard'],
    ['hold', 'Hold a car to keep it stopped'],
    ['C', 'Press C to clear the exposure'],
  ],
} });
const introDone = playIntro({ ready: pageReady() });
const kit = audioKit({ keys: new Set(['c', 'C']), sleepMs: 1500 });
const snd = makeSound(kit);
// A sleeping loop lets the context sleep once the last sound ends.
snd.onQuiet = () => { if (!raf && !drift) kit.rest(() => !raf && !drift && !snd.busy); };

/* ---------- GL ---------- */
const canvas = document.createElement('canvas');
canvas.setAttribute('aria-hidden', 'true');
stage.prepend(canvas);
const D = detail({ maxDpr: 2, budget: 2.6e6, steps: 2, settle: 2, onChange: () => resize(true) });

function layout() {
  const c = ui.cover?.() || { top: 0, bottom: 0 };
  const top = c.top || 0, bot = c.bottom || 0;
  const fh = Math.max(220, cssH - top - bot);
  view.cx = cssW / 2; view.cy = top + fh / 2;
  view.s = Math.min(cssW, fh) / (2 * HALF);
}
let sizeKey = '';
function resize(force = false) {
  if (!gl || !R) return;
  const r = stage.getBoundingClientRect();
  cssW = Math.max(1, r.width); cssH = Math.max(1, r.height);
  dpr = D.dpr(cssW, cssH);
  const c = ui.cover?.() || { top: 0, bottom: 0 };
  const key = [cssW, cssH, dpr, c.top || 0, c.bottom || 0].map(v => Math.round(v * 100)).join();
  if (!force && key === sizeKey) return;
  sizeKey = key;
  R.resize(Math.round(cssW * dpr), Math.round(cssH * dpr));
  layout();
  paintMap(false);
  // A new size starts a fresh plate; a short burst fills it again.
  R.clearPlate();
  for (const c2 of sim.cars) c2.fresh = true;
  expose(0);
  draw();
}
function paintMap(keep) {
  mapCanvas.width = Math.round(cssW * dpr); mapCanvas.height = Math.round(cssH * dpr);
  drawMap(mapCanvas, net, { cx: view.cx * dpr, cy: view.cy * dpr, s: view.s * dpr });
  R.setMap(mapCanvas, keep);
}
const glView = () => ({ cx: view.cx * dpr, cy: (cssH - view.cy) * dpr, scale: view.s * dpr, hw: Math.max(1.1, 0.32 * view.s * dpr) });

/* ---------- the plate ---------- */
// Headlights burn warm white; tail lights a dim red that flares under brakes.
const HEAD_I = 18, TAIL_I = 9, BRAKE_I = 20;
// The camera's height over the crossing, in metres.
const CAM_H = 380;
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
// Fades the plate by dt sim seconds and adds each lamp's stroke since the last call.
function expose(dt) {
  let n = 0;
  if (dt > 0) {
    for (const c of sim.cars) {
      const L = c.lamps;
      if (c.fresh) { c.prev = Float32Array.from(L); c.fresh = false; continue; }
      const p = c.prev, f = c.fade * dt, q = c.pose;
      // The camera hangs over the crossing: it sees the heads of cars driving in, the tails of cars driving out.
      const face = -(q[2] * q[0] + q[3] * q[1]) / Math.hypot(q[0], q[1], CAM_H);
      const hw = 0.1 + 0.9 * smooth(-0.04, 0.3, face), tw = 0.3 + 0.7 * smooth(-0.04, 0.3, -face);
      for (let k = 0; k < 4; k++) {
        const head = k < 2, o = n * SEG_F;
        segs[o] = p[k * 2]; segs[o + 1] = p[k * 2 + 1]; segs[o + 2] = L[k * 2]; segs[o + 3] = L[k * 2 + 1];
        if (head) { segs[o + 4] = 1; segs[o + 5] = 0.84; segs[o + 6] = 0.62; segs[o + 7] = HEAD_I * hw * f; }
        else { segs[o + 4] = 1; segs[o + 5] = 0.05; segs[o + 6] = 0.02; segs[o + 7] = (TAIL_I * tw + BRAKE_I * c.lamp) * f; }
        n++;
      }
      p.set(L);
    }
  } else for (const c of sim.cars) c.fresh = true;
  const tau = swapT < 1.5 ? TAU_SWAP : TAU;
  R.expose(segs, n, dt > 0 ? Math.exp(-dt / tau) : 1, glView());
}
function clearPlate() {
  if (!R) return;
  R.clearPlate();
  for (const c of sim.cars) c.fresh = true;
  snd.swell();
  wake();
  draw();
}

// Moves the sim on by dt sim seconds and exposes the plate in step.
function advance(dt) {
  let left = dt;
  while (left > 1e-6) {
    const h = Math.min(left, 1 / 20);
    sim.step(h);
    if (R) expose(h);
    swapT += h;
    left -= h;
  }
}

/* ---------- draw ---------- */
function packCars() {
  const cars = sim.cars;
  let n = 0;
  for (const c of cars) {
    const p = c.pose, o = n * CAR_F;
    carBuf[o] = p[0]; carBuf[o + 1] = p[1]; carBuf[o + 2] = p[2]; carBuf[o + 3] = p[3];
    carBuf[o + 4] = c.len / 2; carBuf[o + 5] = Math.floor(clamp(p[4] * 2, 0, 15)) + Math.min(0.99, c.lamp);
    carBuf[o + 6] = c.fade; carBuf[o + 7] = c.truck ? 9 : c.paint;
    n++;
  }
  return n;
}
let hoverId = -1;
function draw() {
  if (!R) return;
  const n = packCars();
  R.draw({
    view: glView(), cars: carBuf, n, live: 1,
    mix: mixT * mixT * (3 - 2 * mixT), mapK: 0.5, plateK: 0.9,
    exposure: 1, frameNo: calm ? 0 : frameNo, bloomLevels: D.rung >= 2 ? 4 : 6,
  });
}

/* ---------- actions ---------- */
function wake() {
  lastInput = performance.now();
  woke = true;
  if (!raf && !drift) last = performance.now();
  clearTimeout(drift); drift = 0;
  schedule();
}
// A new design: the old trails fade fast while the new map fades in.
function setDesign(id) {
  if (!DESIGNS[id] || id === designId) return;
  designId = id;
  store.set('design', id);
  net = buildNet(id, REACH);
  sim = makeSim(net, flowV);
  warm(70);
  if (R) { paintMap(true); mixT = calm ? 1 : 0; }
  swapT = 0;
  snd.swell();
  wake();
  draw();
}
function setFlow(v) {
  flowV = clamp(v, 0, 1);
  store.set('flow', flowV);
  sim.setFlow(flowV);
  wake();
}
// Runs the sim on with no plate, so a new design starts in steady flow.
function warm(secs) {
  for (let t = 0; t < secs; t += 0.25) sim.step(0.25);
  for (const c of sim.cars) { c.fade = 1; c.fresh = true; }
}

function carAt(x, y) {
  const wx = (x - view.cx) / view.s, wy = -(y - view.cy) / view.s;
  const reach = Math.max(5, 22 / view.s);
  let best = null, bd = reach;
  for (const c of sim.cars) {
    const d = Math.hypot(wx - c.pose[0], wy - c.pose[1]);
    if (d < bd) { bd = d; best = c; }
  }
  return best;
}
const panOf = c => clamp((view.cx + c.pose[0] * view.s) / cssW * 2 - 1, -1, 1);
function brakeCar(id, held) {
  const c = sim.brake(id, held);
  if (!c) return null;
  c.lamp = 1; c.braking = true;
  snd.stop(panOf(c));
  wake();
  return c;
}

/* ---------- frame loop ---------- */
// Lively while a press, a knot or a swap runs; drifting at 30 fps in free flow.
// 60 s after the last input the sim clock eases to a stop: the picture holds.
const SLEEP = () => (qa && Q.get('sleep') ? +Q.get('sleep') * 1000 : calm ? 30000 : 60000);
function frame(now) {
  raf = 0;
  if (!visible || !gl || !started) return;
  let again = false, pace = 0;
  try {
    const dtw = Math.max(0, Math.min(1 / 20, (now - last) / 1000));
    const lively = pointer.id !== null || mixT < 1 || now - lastInput < 3000;
    const since = performance.now() - lastDraw;
    if (!lively && since < 30) { again = true; pace = 31 - since; return; }
    last = now; lastDraw = performance.now();
    const idle = now - lastInput > SLEEP() || (calm && !woke);
    const want = idle ? 0 : 1;
    rate = calm ? want : want > rate ? Math.min(want, rate + dtw / 0.5) : Math.max(want, rate - dtw / 2);
    const k = rate * rate * (3 - 2 * rate);
    advance(dtw * k);
    mixT = Math.min(1, mixT + dtw / 1.2);
    const ev = sim.takeEvents();
    if (ev.length && k > 0) {
      const byId = new Map(sim.cars.map(c => [c.id, c]));
      snd.brakes(ev.filter(e => byId.has(e.id) && e.hard > 0.25).slice(0, 4).map(e => ({ pan: panOf(byId.get(e.id)), hard: e.hard })));
    }
    let mean = 0;
    for (const c of sim.cars) mean += c.v;
    mean /= Math.max(1, sim.cars.length);
    snd.drive(mean * 0.42, sim.cars.length / 9, rate);
    draw();
    if (heard && !snd.busy) kit.rest(() => !snd.busy);
    heard = snd.busy;
    D.frame(dtw);
    frameNo++;
    again = rate > 0 || want > 0 || mixT < 1;
    pace = lively ? 0 : 31 - (performance.now() - lastDraw);
  } finally {
    if (!again) rest();
    else if (pace > 0) drift = setTimeout(() => { drift = 0; schedule(); }, pace);
    else schedule();
  }
}
function rest() { snd.drive(0, 0, 0); kit.rest(() => !raf && !drift && !snd.busy); }
function schedule() {
  if (raf || drift || !visible || !gl || !started) return;
  raf = requestAnimationFrame(frame);
}
function halt() { cancelAnimationFrame(raf); raf = 0; clearTimeout(drift); drift = 0; }

/* ---------- pointer: tap brakes a car, hold keeps it stopped ---------- */
const pointer = { id: null, car: -1, held: false, timer: 0 };
const local = e => { const r = stage.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
stage.addEventListener('pointerdown', e => {
  if (e.button !== 0 || !R || pointer.id !== null || (e.target !== canvas && e.target !== stage)) return;
  const [x, y] = local(e);
  const c = carAt(x, y);
  if (!c) return;
  try { stage.setPointerCapture(e.pointerId); } catch { /* capture is optional */ }
  Object.assign(pointer, { id: e.pointerId, car: c.id, held: false });
  brakeCar(c.id, true);
  pointer.timer = setTimeout(() => { pointer.timer = 0; if (pointer.id !== null) pointer.held = true; }, 260);
});
stage.addEventListener('pointermove', e => {
  if (pointer.id !== null || e.pointerType !== 'mouse') return;
  const [x, y] = local(e);
  const c = carAt(x, y);
  const id = c ? c.id : -1;
  if (id === hoverId) return;
  hoverId = id;
  stage.style.cursor = c ? 'pointer' : '';
});
stage.addEventListener('pointerleave', () => { hoverId = -1; stage.style.cursor = ''; });
function endPointer(e) {
  if (e.pointerId !== pointer.id) return;
  clearTimeout(pointer.timer);
  sim.release(pointer.car, pointer.held);
  pointer.id = null; pointer.car = -1; pointer.held = false;
  wake();
}
['pointerup', 'pointercancel', 'lostpointercapture'].forEach(t => stage.addEventListener(t, endPointer));

/* ---------- life cycle ---------- */
whenVisible(stage, on => {
  visible = on;
  if (on) { last = performance.now(); schedule(); }
  else { halt(); snd.quiet(); }
});
onReducedChange(on => { calm = on; draw(); });
sound.onChange(on => { if (on) wake(); });
new ResizeObserver(() => resize()).observe(stage);
ui.onCover?.(() => resize(true));

async function setup() {
  gl = canvas.getContext('webgl2', { antialias: false, alpha: false, depth: false, powerPreference: 'high-performance' });
  if (!gl) throw new Error('no webgl2');
  if (!gl.getExtension('EXT_color_buffer_float') && !gl.getExtension('EXT_color_buffer_half_float')) throw new Error('no float targets');
  R = await makeRenderer(gl);
  sizeKey = '';
}
onContextLoss(canvas, {
  lost: () => { halt(); gl = null; R = null; },
  restored: async () => { await setup(); resize(true); wake(); },
  failed: () => fail.removeAttribute('hidden'),
});

mark('build');
try {
  await setup();
  warm(60);
  resize(true);
  // The first frame is a picture: the plate holds a full exposure of steady flow.
  advance(TAU * 1.4);
  draw();
  gl.finish();
  canvas.classList.add('on');
  mark('first-frame');
  await introDone;
  started = true;
  if (!calm) wake();
} catch (err) {
  console.error(err);
  fail.removeAttribute('hidden');
  ui.hideControls?.();
}
