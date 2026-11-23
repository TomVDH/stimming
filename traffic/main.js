// Traffic wave: cars circle a ring road, as in the 2008 ring-road experiment.
// Tap a car to brake; the jam it leaves slides backward round the ring.
// The strip beside the ring plots each car's place against time.
import { initPage, whenVisible, pageReady, stage as mark, reduced, onReducedChange, audioKit, sound } from '../shared/stim.js';
import { intro as playIntro } from '../shared/intro.js';
import { onContextLoss } from '../shared/gl.js';
import { detail } from '../shared/detail.js';
import { makeSim, L, RADIUS, MAX_CARS } from './sim.js';
import { makeRenderer, COLS, ROWS } from './render.js';
import { makeSound } from './sound.js';
mark('libs');

const ID = 'traffic';
const stage = document.getElementById('stage');
const fail = stage.querySelector('.fail');
const store = {
  get(k) { try { return localStorage.getItem(`stimming.${ID}.${k}`); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(`stimming.${ID}.${k}`, String(v)); } catch { /* private mode */ } },
};
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const Q = new URLSearchParams(location.search), qa = Q.has('qa');

/* ---------- state ---------- */
const CARS_MIN = 12, CARS_MAX = 30;
const savedCars = Number(store.get('cars'));
let carsV = store.get('cars') != null && Number.isFinite(savedCars) ? clamp(Math.round(savedCars), CARS_MIN, CARS_MAX) : 22;
const sim = makeSim(carsV);
// The strip holds this many seconds; one column per COL_DT.
const WIN = 64, COL_DT = WIN / COLS;
let gl = null, R = null, raf = 0, drift = 0, visible = true, last = 0, lastDraw = 0, frameNo = 0, calm = reduced();
let cssW = 1, cssH = 1, dpr = 1, started = false, lastInput = -1e9, woke = false, heard = false;
// The sim clock's rate: 1 in play, easing to 0 as the toy sleeps.
let rate = 1;
// The view: ring centre in CSS pixels and pixels per metre; the strip's box.
const view = { cx: 0, cy: 0, s: 1 };
let strip = { x: 0, y: 0, w: 1, h: 1, mode: 0 };
// The strip's ring buffer: the head column and the time since it.
let head = 0, colT = 0;
const lastRow = new Map();
// Brake taps on the strip: sim time, place 0 to 1, strength.
const marks = [];
let hoverId = -1;

if (qa) globalThis.__tw = {
  sim, get rate() { return rate; }, get raf() { return raf; },
  get dbg() { return { raf, drift, visible, started, pointer: pointer.id, lastInput, now: performance.now(), jammed: sim.jammed, evening: sim.evening }; },
  brakeAt: k => brakeCar(sim.cars[k % sim.cars.length].id, false),
  run: secs => { for (let t = 0; t < secs; t += 1 / 60) advance(1 / 60); draw(); },
  // Car k's centre in page pixels, for a test pointer.
  screen: k => {
    const c = sim.cars[k % sim.cars.length], th = angleOf(c.pos), r = stage.getBoundingClientRect();
    return [r.left + view.cx + RADIUS * Math.cos(th) * view.s, r.top + view.cy - RADIUS * Math.sin(th) * view.s];
  },
};

/* ---------- bar ---------- */
const ui = initPage({ id: ID, bar: {
  actions: [
    { verb: 'brake', key: 'Space', onPress: () => brakeFront() },
    { verb: 'even out', key: 'E', onPress: () => evenOut() },
  ],
  slider: { label: 'Cars', min: CARS_MIN, max: CARS_MAX, step: 1, value: carsV, onInput: v => setCars(v) },
  quality: true,
  keys: [['click', 'brake'], ['hold', 'stop'], ['Space', 'brake'], ['E', 'even out']],
  help: [
    ['click', 'Tap a car to brake it hard'],
    ['hold', 'Hold a car to keep it stopped'],
    ['Space', 'Press Space to brake the car at the start line'],
    ['E', 'Press E to space the cars out evenly'],
  ],
} });
const introDone = playIntro({ ready: pageReady() });
const kit = audioKit({ keys: new Set([' ', 'e', 'E']), sleepMs: 1500 });
const snd = makeSound(kit);
// A sleeping loop lets the context sleep once the last sound ends.
snd.onQuiet = () => { if (!raf && !drift) kit.rest(() => !raf && !drift && !snd.busy); };

/* ---------- GL ---------- */
const canvas = document.createElement('canvas');
canvas.setAttribute('aria-hidden', 'true');
stage.prepend(canvas);
const D = detail({ maxDpr: 2, budget: 2.6e6, steps: 2, settle: 2, onChange: () => resize(true) });

// The ring sits beside the strip on a wide stage, above it on a tall one.
function layout() {
  const c = ui.cover?.() || { top: 0, bottom: 0 };
  const top = c.top || 0, bot = c.bottom || 0;
  const fw = cssW, fh = Math.max(220, cssH - top - bot);
  const land = fw > fh * 1.15;
  const gap = clamp(Math.min(fw, fh) * 0.04, 14, 34);
  if (land) {
    const box = Math.min(fh - 20, fw * 0.55);
    const sw = Math.max(120, Math.min(fw - box - gap - 2 * clamp(fw * 0.04, 16, 56), box * 1.15));
    const x0 = (fw - box - gap - sw) / 2;
    view.cx = x0 + box / 2; view.cy = top + fh / 2;
    view.s = box / (2 * (RADIUS + 5.5));
    const sh = Math.min(fh - 40, box * 0.66);
    strip = { x: x0 + box + gap, y: view.cy - sh / 2, w: sw, h: sh, mode: 0 };
  } else {
    const box = Math.min(fw - 16, fh * 0.56);
    const sw = Math.min(fw - 32, box * 1.04);
    const sh = Math.max(90, Math.min(fh - box - gap - 16, box * 0.9));
    const y0 = top + (fh - box - gap - sh) / 2;
    view.cx = fw / 2; view.cy = y0 + box / 2;
    view.s = box / (2 * (RADIUS + 5.5));
    strip = { x: (fw - sw) / 2, y: y0 + box + gap, w: sw, h: sh, mode: 1 };
  }
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
  draw();
}

/* ---------- cars on the ring ---------- */
// Place 0 is the start line at six o'clock; cars run anticlockwise.
const angleOf = pos => -Math.PI / 2 + pos / RADIUS;
const A = new Float32Array(MAX_CARS * 4), B = new Float32Array(MAX_CARS * 4), C = new Float32Array(MAX_CARS * 4);
const wrap = x => ((x % L) + L) % L;
// The flood mast, in metres from the ring's centre; render.js keeps the same.
const FLOOD = [-78, 64];
function packCars() {
  const cars = sim.cars, n = cars.length;
  for (let i = 0; i < n; i++) {
    const c = cars[i], th = angleOf(c.pos);
    const cs = Math.cos(th), sn = Math.sin(th);
    A.set([RADIUS * cs, RADIUS * sn, -sn, cs], i * 4);
    B.set([c.len / 2, c.lamp, c.fade, c.paint], i * 4);
    // Light on the boot from the car behind, and red from the car ahead.
    const back = cars[(i - 1 + n) % n], lead = cars[(i + 1) % n];
    const gb = n > 1 ? wrap(c.pos - back.pos) - c.len : 99;
    const ga = n > 1 ? wrap(lead.pos - c.pos) - lead.len : 99;
    const beam = clamp(gb / 2.2, 0, 1) / (1 + (gb / 10) ** 2);
    // The flood mast's light on the roof, as the ground shader has it.
    const fx = FLOOD[0] - RADIUS * cs, fy = FLOOD[1] - RADIUS * sn;
    const flood = 1.25 / (1 + (fx * fx + fy * fy) / 2400);
    C.set([beam * back.fade, lead.lamp * lead.fade * Math.exp(-ga / 3.5), c.id === hoverId ? 1 : 0, flood], i * 4);
  }
  return n;
}

// Screen point to the nearest car, within reach of a finger.
function carAt(x, y) {
  const wx = (x - view.cx) / view.s, wy = -(y - view.cy) / view.s;
  const reach = Math.max(4, 24 / view.s);
  let best = null, bd = reach;
  for (const c of sim.cars) {
    if (c.leaving) continue;
    const th = angleOf(c.pos);
    const d = Math.hypot(wx - RADIUS * Math.cos(th), wy - RADIUS * Math.sin(th));
    if (d < bd) { bd = d; best = c; }
  }
  return best;
}
const panOf = c => clamp(Math.cos(angleOf(c.pos)) * RADIUS * view.s / (cssW / 2) + (view.cx / cssW * 2 - 1), -1, 1);

/* ---------- the strip ---------- */
const colBuf = new Uint8Array(ROWS * 4);
// One column: each car's path since the last column, and the speed field.
function writeColumn() {
  colBuf.fill(0);
  const cars = sim.cars, n = cars.length;
  const VMAX = 11;
  for (const c of cars) {
    const r1 = c.pos / L * ROWS;
    let r0 = lastRow.has(c.id) ? lastRow.get(c.id) : r1;
    if (r0 > r1 + ROWS / 2) r0 -= ROWS;
    lastRow.set(c.id, r1);
    const lo = Math.floor(Math.min(r0, r1) - 1.2), hi = Math.ceil(Math.max(r0, r1) + 1.2);
    const g = Math.round(clamp(c.v / VMAX, 0, 1) * 255), b = Math.round(c.lamp * 255);
    for (let r = lo; r <= hi; r++) {
      const d = r < Math.min(r0, r1) ? Math.min(r0, r1) - r : r > Math.max(r0, r1) ? r - Math.max(r0, r1) : 0;
      const w = clamp(1.15 - d / 1.0, 0, 1) * c.fade;
      if (w <= 0) continue;
      const k = ((r % ROWS) + ROWS) % ROWS * 4;
      const v = Math.round(w * 255);
      if (v > colBuf[k]) { colBuf[k] = v; colBuf[k + 1] = g; colBuf[k + 2] = b; }
    }
  }
  // The speed field: between each car and its leader, the speeds blend.
  if (n > 1) {
    for (let i = 0; i < n; i++) {
      const c = cars[i], lead = cars[(i + 1) % n];
      const r0 = c.pos / L * ROWS;
      let r1 = lead.pos / L * ROWS;
      if (r1 <= r0) r1 += ROWS;
      for (let r = Math.ceil(r0); r < r1; r++) {
        const f = (r - r0) / Math.max(1e-3, r1 - r0);
        const v = c.v + (lead.v - c.v) * f;
        colBuf[(r % ROWS) * 4 + 3] = Math.round(clamp(v / VMAX, 0, 1) * 255);
      }
    }
  } else colBuf.forEach((_, k) => { if (k % 4 === 3) colBuf[k] = 255; });
  head = (head + 1) % COLS;
  R.writeColumn(head, colBuf);
}

// Moves the sim on by dt sim seconds and keeps the strip in step.
function advance(dt) {
  let left = dt;
  while (left > 1e-6) {
    const h = Math.min(left, COL_DT - colT, 1 / 30);
    sim.step(h);
    colT += h; left -= h;
    if (colT >= COL_DT - 1e-6) { colT = 0; if (R) writeColumn(); }
  }
}

/* ---------- draw ---------- */
const markBuf = new Float32Array(24);
function draw() {
  if (!R) return;
  const n = packCars();
  const now = sim.t;
  markBuf.fill(0);
  marks.slice(-6).forEach((m, i) => markBuf.set([m.t, m.pos, 0, m.k], i * 4));
  R.draw({
    A, B, C, n, cx: view.cx * dpr, cy: (cssH - view.cy) * dpr, scale: view.s * dpr,
    strip: {
      x: strip.x * dpr, y: (cssH - strip.y - strip.h) * dpr, w: strip.w * dpr, h: strip.h * dpr,
      mode: strip.mode, head, frac: colT / COL_DT, win: WIN, now, px: dpr, alpha: 1, marks: markBuf,
    },
    exposure: 1, frameNo: calm ? 0 : frameNo, bloomLevels: D.rung >= 2 ? 4 : 6,
  });
}

/* ---------- actions ---------- */
function wake() {
  lastInput = performance.now();
  woke = true;
  // A sleeping loop starts its clock now; a drifting one keeps its clock.
  if (!raf && !drift) last = performance.now();
  // Input answers at once, not after the drift timer.
  clearTimeout(drift); drift = 0;
  schedule();
}
function brakeCar(id, held) {
  const c = sim.brake(id, held);
  if (!c) return null;
  c.lamp = 1; c.braking = true;
  marks.push({ t: sim.t, pos: c.pos / L, k: 1 });
  if (marks.length > 12) marks.shift();
  snd.stop(panOf(c));
  wake();
  draw();
  return c;
}
// Space brakes the car nearest the start line.
function brakeFront() {
  let best = null, bd = 1e9;
  for (const c of sim.cars) {
    if (c.leaving) continue;
    const d = Math.min(c.pos, L - c.pos);
    if (d < bd) { bd = d; best = c; }
  }
  if (best) brakeCar(best.id, false);
}
function evenOut() {
  sim.evenOut(calm ? 0.01 : 1.6);
  snd.swell();
  wake();
}
function setCars(v) {
  carsV = clamp(Math.round(v), CARS_MIN, CARS_MAX);
  store.set('cars', carsV);
  sim.setCount(carsV);
  wake();
}

/* ---------- frame loop ---------- */
// Lively while a press, a brake or a jam runs; drifting at 30 fps in smooth flow.
// 60 s after the last input the sim clock eases to a stop and the loop sleeps.
const SLEEP = () => (qa && Q.get('sleep') ? +Q.get('sleep') * 1000 : calm ? 30000 : 60000);
function frame(now) {
  raf = 0;
  if (!visible || !gl || !started) return;
  let again = false, pace = 0;
  try {
    const dtw = Math.max(0, Math.min(1 / 20, (now - last) / 1000));
    const lively = pointer.id !== null || sim.jammed > 0 || sim.evening || now - lastInput < 3000;
    // Smooth flow alone draws at 30 fps; the page clock paces it.
    const since = performance.now() - lastDraw;
    if (!lively && since < 30) { again = true; pace = 31 - since; return; }
    last = now; lastDraw = performance.now();
    const idle = now - lastInput > SLEEP() || (calm && !woke);
    const want = idle ? 0 : 1;
    // The clock ramps down over 2 s to sleep and wakes over half a second.
    rate = calm ? want : want > rate ? Math.min(want, rate + dtw / 0.5) : Math.max(want, rate - dtw / 2);
    // A smoothstep on the ramp: the cars ease out, not stop dead.
    advance(dtw * rate * rate * (3 - 2 * rate));
    const ev = sim.takeEvents();
    if (ev.length) {
      const byId = new Map(sim.cars.map(c => [c.id, c]));
      snd.brakes(ev.filter(e => byId.has(e.id)).map(e => ({ pan: panOf(byId.get(e.id)), hard: e.hard })));
    }
    for (const m of marks) if (sim.t - m.t > WIN) m.k = 0;
    const live = sim.cars.filter(c => !c.leaving);
    const mean = live.reduce((k, c) => k + c.v, 0) / Math.max(1, live.length);
    snd.drive(mean, live.length, rate);
    draw();
    if (heard && !snd.busy) kit.rest(() => !snd.busy);
    heard = snd.busy;
    D.frame(dtw);
    frameNo++;
    // A clock that is still waking keeps the loop alive.
    again = rate > 0 || want > 0;
    // A timer, not a skipped frame, waits out the gap to the next drift frame.
    pace = lively ? 0 : 31 - (performance.now() - lastDraw);
  } finally {
    // A thrown error still leaves the loop able to wake.
    if (!again) rest();
    else if (pace > 0) drift = setTimeout(() => { drift = 0; schedule(); }, pace);
    else schedule();
  }
}
function rest() { snd.drive(0, 0, 0); kit.rest(() => !raf && !drift && !snd.busy); }
// One frame at most is ever pending, so loops never stack.
function schedule() {
  if (raf || drift || !visible || !gl || !started) return;
  raf = requestAnimationFrame(frame);
}
function halt() { cancelAnimationFrame(raf); raf = 0; clearTimeout(drift); drift = 0; }

/* ---------- pointer: tap brakes a car, hold keeps it stopped ---------- */
const pointer = { id: null, car: -1, t0: 0, held: false, timer: 0 };
const local = e => { const r = stage.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
stage.addEventListener('pointerdown', e => {
  if (e.button !== 0 || !R || pointer.id !== null || (e.target !== canvas && e.target !== stage)) return;
  const [x, y] = local(e);
  const c = carAt(x, y);
  if (!c) return;
  try { stage.setPointerCapture(e.pointerId); } catch { /* capture is optional */ }
  Object.assign(pointer, { id: e.pointerId, car: c.id, t0: performance.now(), held: false });
  // The brake bites at once; a press held 260 ms keeps the car stopped.
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
  if (!raf) draw();
});
stage.addEventListener('pointerleave', () => { if (hoverId !== -1) { hoverId = -1; stage.style.cursor = ''; if (!raf) draw(); } });
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
  head = 0; colT = 0; lastRow.clear();
}
onContextLoss(canvas, {
  lost: () => { halt(); gl = null; R = null; },
  restored: async () => { await setup(); resize(true); wake(); },
  failed: () => fail.removeAttribute('hidden'),
});

mark('build');
try {
  await setup();
  // The first frame is a picture: the strip holds a full window of smooth flow.
  advance(WIN);
  resize(true);
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
