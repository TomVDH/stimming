// Double slit: single photons land one by one on a detector plate.
// Each landing is random; only the crowd of dots shows the fringes.
import { initPage, whenVisible, pageReady, stage as mark, reduced, onReducedChange, audioKit, sound } from '../shared/stim.js';
import { intro as playIntro } from '../shared/intro.js';
import { onContextLoss } from '../shared/gl.js';
import { detail } from '../shared/detail.js';
import { makeSampler, beamY, spectralRGB, luma, NM_MIN, NM_MAX } from './optics.js';
import { makePlate, DOT_FLOATS } from './plate.js';
import { makeSound } from './sound.js';
mark('libs');

const ID = 'doubleslit';
const stage = document.getElementById('stage');
const fail = stage.querySelector('.fail');
const store = {
  get(k) { try { return localStorage.getItem(`stimming.${ID}.${k}`); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(`stimming.${ID}.${k}`, String(v)); } catch { /* private mode */ } },
};
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const savedNm = Number(store.get('nm'));
let nm = clamp(Number.isFinite(savedNm) && savedNm > 0 ? savedNm : 470, NM_MIN, NM_MAX);
let slits = store.get('slits') === '1' ? 1 : 2;

/* ---------- state ---------- */
// Photons per second: a held stream, and the dim drip of an idle source.
const STREAM = 60, DRIP = 3;
// The beam's height on the plate, as a share of the half height.
const BEAM_SIGMA = 0.42;
// Flash fade time in seconds: a fast phosphor.
const FLASH_TAU = 0.09;
const sampler = makeSampler();
// Every landing: u (angle), y (plate units), wavelength.
let log = new Float32Array(3 * 65536), count = 0;
let gl = null, plate = null, raf = 0, timer = 0, visible = true, last = 0, frameNo = 0, calm = reduced();
let cssW = 1, cssH = 1, dpr = 1, started = false;
let view = { cx: 1, cy: 1, hw: 1, hh: 1, corner: 1, px: 1, hex: 30, gx: -0.62, gy: 0.78 };
let span = 1.8;
let holding = false, keyHold = false, rate = 0, lastInput = 0, lastLand = -1e9, ease = 1;
// ?qa hands the state to a test script.
if (new URLSearchParams(location.search).has('qa')) globalThis.__ds = { get count() { return count; }, get rate() { return rate; }, fire: n => { fire(n); poke(); }, get slits() { return slits; } };

/* ---------- bar ---------- */
const ui = initPage({ id: ID, bar: {
  choice: {
    label: 'Slits',
    value: String(slits),
    options: [
      { value: '2', label: 'Two slits', key: '2' },
      { value: '1', label: 'One slit', key: '1' },
    ],
    onPick: v => setSlits(v === '1' ? 1 : 2),
  },
  actions: [
    { verb: 'fire', key: 'Space', hold: true, onDown: () => { keyHold = true; fire(1); poke(); }, onUp: () => { keyHold = false; poke(); } },
    { verb: 'clear', key: 'C', onPress: () => { clearPlate(); poke(); } },
  ],
  slider: { label: 'Colour', min: NM_MIN, max: NM_MAX, step: 1, value: nm, onInput: v => { nm = v; store.set('nm', v); poke(); } },
  quality: true,
  keys: [['click', 'fire'], ['hold', 'stream']],
  help: [
    ['click', 'Tap the plate to fire one photon'],
    ['hold', 'Hold to stream photons; Space does the same'],
    ['1', 'Press 1 to cover a slit and 2 to open both'],
    ['C', 'Press C to clear the plate'],
  ],
} });
const introDone = playIntro({ ready: pageReady() });
const kit = audioKit({ keys: new Set([' ', '1', '2', 'c', 'C']), sleepMs: 1500 });
const snd = makeSound(kit);

/* ---------- GL ---------- */
const canvas = document.createElement('canvas');
canvas.setAttribute('aria-hidden', 'true');
stage.prepend(canvas);
const D = detail({ maxDpr: 2, budget: 2.6e6, steps: 2, settle: 2, onChange: () => resize(true) });

// The plate fills the free stage between the bar parts.
function fit() {
  const c = ui.cover?.() || { top: 0, bottom: 0, rects: [] };
  const top = c.top || 0, bot = c.bottom || 0;
  const m = clamp(Math.min(cssW, cssH) * 0.045, 12, 36);
  const freeH = Math.max(120, cssH - top - bot);
  const w = cssW - 2 * m, h = freeH - 2 * m;
  const cx = cssW / 2, cy = top + freeH / 2;
  view = {
    ...view,
    cx: cx * dpr, cy: (cssH - cy) * dpr, hw: w / 2 * dpr, hh: h / 2 * dpr,
    corner: 10 * dpr, px: dpr, hex: 34 * dpr,
  };
  // A narrow plate shows fewer fringes, each wider.
  span = w / h < 0.9 ? 1.1 : 1.8;
}
let sizeKey = '';
function resize(force = false) {
  if (!gl || !plate) return;
  const r = stage.getBoundingClientRect();
  cssW = Math.max(1, r.width); cssH = Math.max(1, r.height);
  dpr = D.dpr(cssW, cssH);
  const c = ui.cover?.() || { top: 0, bottom: 0 };
  const key = [cssW, cssH, dpr, c.top || 0, c.bottom || 0].map(v => Math.round(v * 100)).join();
  if (!force && key === sizeKey) return;
  sizeKey = key;
  plate.resize(Math.round(cssW * dpr), Math.round(cssH * dpr));
  fit();
  redraw();
  draw();
}

/* ---------- colour ---------- */
const tints = new Map();
// A dim colour gets a lift, so violet dots still read on dark glass.
function tint(w) {
  const k = Math.round(w);
  if (!tints.has(k)) {
    const c = spectralRGB(k);
    const lift = clamp(Math.sqrt(0.5 / Math.max(0.05, luma(c))), 1, 2.4);
    tints.set(k, c.map(v => (v * 0.95 + 0.05) * lift));
  }
  return tints.get(k);
}

/* ---------- landings ---------- */
const inst = new Float32Array(4096 * DOT_FLOATS);
const flashInst = new Float32Array(4096 * DOT_FLOATS * 2);
function put(buf, i, x, y, sigma, e, c) {
  const o = i * DOT_FLOATS;
  buf[o] = x; buf[o + 1] = y; buf[o + 2] = sigma; buf[o + 3] = e;
  buf[o + 4] = c[0]; buf[o + 5] = c[1]; buf[o + 6] = c[2]; buf[o + 7] = 0;
}
const toPx = (u, y) => [view.cx + (u / span) * view.hw, view.cy + y * view.hh];
const DOT_E = 1.15;

// n photons land now: each is a dot on the plate and a flash.
function fire(n = 1, dt = 0) {
  if (!plate || n <= 0) return;
  n = Math.min(n, 4096);
  sampler.build(nm, slits, span);
  const c = tint(nm);
  const hot = c.map(v => v * 0.5 + 0.5);
  const soft = calm ? 0.45 : 1;
  let f = 0;
  for (let i = 0; i < n; i++) {
    const x = sampler.x(), y = beamY(BEAM_SIGMA);
    const u = x * span;
    if (count * 3 + 3 > log.length) {
      const next = new Float32Array(log.length * 2);
      next.set(log);
      log = next;
    }
    log[count * 3] = u; log[count * 3 + 1] = y; log[count * 3 + 2] = nm;
    count++;
    const [px, py] = toPx(u, y);
    put(inst, i, px, py, 0.8 * dpr, DOT_E, c);
    // The flash: a white-hot core and a wide coloured halo.
    put(flashInst, f++, px, py, 1.5 * dpr, 7 * soft, hot);
    if (!calm) put(flashInst, f++, px, py, 5 * dpr, 0.22, c);
    snd.click(x, Math.random() * dt, Math.max(rate, dt > 0 ? n / dt : 0));
  }
  plate.splat('plate', inst, n);
  plate.splat('flash', flashInst, f);
  lastLand = performance.now();
}

// Draws the whole log again after the plate was rebuilt.
function redraw() {
  plate.clear();
  const big = new Float32Array(Math.min(count, 65536) * DOT_FLOATS);
  for (let s = 0; s < count; s += 65536) {
    const n = Math.min(65536, count - s);
    for (let i = 0; i < n; i++) {
      const j = (s + i) * 3;
      const [px, py] = toPx(log[j], log[j + 1]);
      put(big, i, px, py, 0.8 * dpr, DOT_E, tint(log[j + 2]));
    }
    plate.splat('plate', big, n);
  }
}

// A Poisson count with mean m.
function poisson(m) {
  if (m > 30) return Math.max(0, Math.round(m + Math.sqrt(m) * Math.sqrt(-2 * Math.log(1 - Math.random())) * Math.cos(2 * Math.PI * Math.random())));
  const L = Math.exp(-m);
  let k = 0, p = 1;
  do { k++; p *= Math.random(); } while (p > L);
  return k - 1;
}

function draw() {
  if (!plate) return;
  plate.frame(view, { frameNo: calm ? 0 : frameNo, bloomLevels: D.rung >= 2 ? 3 : 5 });
}

/* ---------- frame loop ---------- */
// Lively while a stream runs or a flash glows; drifting at 30 fps; asleep after 60 s idle.
function frame(now) {
  raf = 0;
  if (!visible || !gl || !started) return;
  // The rAF stamp can run well behind the clock, so the pace reads the clock.
  const t0 = performance.now();
  const held = holding || keyHold;
  const dt = Math.max(0, Math.min(1 / 20, (now - last) / 1000));
  last = Math.max(last, now);
  let again = true, lively = true;
  try {
    const idleFor = (now - lastInput) / 1000;
    // Past 60 s idle the drip slows to a stop over 2 s.
    ease = held ? 1 : idleFor > 60 ? Math.max(0, 1 - (idleFor - 60) / 2) : 1;
    const want = held ? STREAM : calm ? 0 : DRIP * ease;
    // The stream rises over about 3 s and falls faster.
    const tau = want > rate ? 1.1 : 0.35;
    rate += (want - rate) * (1 - Math.exp(-dt / tau));
    if (rate < 0.05 && want === 0) rate = 0;
    fire(poisson(rate * dt), dt);
    snd.stream(rate);
    plate.decay(dt, FLASH_TAU);
    draw();
    D.frame(dt);
    frameNo++;
    const glowing = t0 - lastLand < 700;
    lively = held || rate > DRIP + 1 || t0 - lastInput < 2500 || glowing && rate > DRIP;
    again = rate > 0 || want > 0 || glowing || held;
  } finally {
    // A thrown error still leaves the loop able to wake.
    // Drifting frames hold to about 30 fps.
    if (again) schedule(lively ? 0 : t0 + 33 - performance.now()); else rest();
  }
}
function rest() { snd.quiet(); kit.rest(() => !raf && !timer && !snd.busy); }
// One frame at most is ever pending, so loops never stack.
// A delay waits on a timer first, so drifting asks for fewer frames.
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

/* ---------- actions ---------- */
function setSlits(n) {
  if (n === slits) return;
  slits = n;
  store.set('slits', n);
  snd.shutter(n === 2);
  poke();
}
function clearPlate() {
  count = 0;
  plate?.clear();
  snd.wipe();
}

/* ---------- pointer: press fires one, hold streams ---------- */
const pointer = { id: null, x0: 0, y0: 0, t: 0 };
const local = e => { const r = stage.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
stage.addEventListener('pointerdown', e => {
  if (e.button !== 0 || !plate || pointer.id !== null || (e.target !== canvas && e.target !== stage)) return;
  try { stage.setPointerCapture(e.pointerId); } catch { /* capture is optional */ }
  const [x, y] = local(e);
  pointer.id = e.pointerId; pointer.x0 = x; pointer.y0 = y;
  // A hold starts the stream after 260 ms.
  pointer.t = setTimeout(() => { if (pointer.id !== null) { holding = true; poke(); } }, 260);
  fire(1);
  poke();
});
stage.addEventListener('pointermove', e => {
  if (e.pointerId === pointer.id) {
    const [x, y] = local(e);
    // A drag streams as a hold does.
    if (!holding && Math.hypot(x - pointer.x0, y - pointer.y0) > 8) { holding = true; poke(); }
    return;
  }
  if (pointer.id !== null || e.pointerType !== 'mouse') return;
  // The room light leans toward a hovering mouse.
  const [x, y] = local(e);
  const a = Math.atan2(-(y - cssH / 2), x - cssW / 2), b = Math.atan2(0.78, -0.62);
  const t = Math.atan2(Math.sin(a - b), Math.cos(a - b)) * 0.16;
  view.gx = Math.cos(b + t); view.gy = Math.sin(b + t);
  if (!raf && !timer && started) draw();
});
function endPointer(e) {
  if (e.pointerId !== pointer.id) return;
  clearTimeout(pointer.t);
  pointer.id = null;
  holding = false;
  poke();
}
['pointerup', 'pointercancel', 'lostpointercapture'].forEach(t => stage.addEventListener(t, endPointer));

/* ---------- life cycle ---------- */
whenVisible(stage, on => {
  visible = on;
  if (on) { last = performance.now(); schedule(); }
  else { halt(); holding = false; keyHold = false; rate = 0; snd.quiet(); }
});
onReducedChange(on => { calm = on; draw(); poke(); });
sound.onChange(on => { if (on) poke(); });
new ResizeObserver(() => resize()).observe(stage);
ui.onCover?.(() => resize());

async function setup() {
  gl = canvas.getContext('webgl2', { antialias: false, alpha: false, depth: false, powerPreference: 'high-performance' });
  if (!gl) throw new Error('no webgl2');
  plate = await makePlate(gl);
  sizeKey = '';
}
onContextLoss(canvas, {
  lost: () => { halt(); gl = null; plate = null; },
  restored: async () => { await setup(); resize(true); poke(); },
  failed: () => fail.removeAttribute('hidden'),
});

// The first frame is a picture: a few hundred dots, too few for fringes yet.
function prewarm() {
  fire(160);
  // Older flashes fade; the last few still glow.
  plate.decay(0.5, FLASH_TAU);
  fire(3);
  plate.decay(0.05, FLASH_TAU);
  lastLand = -1e9;
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
