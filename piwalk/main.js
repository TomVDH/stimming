// Pi walk: each digit of pi takes one step in one of ten directions.
// The walk draws itself from the centre; the view zooms out as it grows.
import { initPage, whenVisible, pageReady, stage as mark, reduced, onReducedChange, audioKit, sound, linFit } from '../shared/stim.js';
import { intro as playIntro } from '../shared/intro.js';
import { onContextLoss } from '../shared/gl.js';
import { detail } from '../shared/detail.js';
import { piDigits } from './digits.js';
import { makeRenderer } from './render.js';
import { makeSound } from './sound.js';
mark('libs');

const ID = 'piwalk';
const stage = document.getElementById('stage');
const fail = stage.querySelector('.fail');
const store = {
  get(k) { try { return localStorage.getItem(`stimming.${ID}.${k}`); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(`stimming.${ID}.${k}`, String(v)); } catch { /* private mode */ } },
};
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

/* ---------- the walk ---------- */
// The first digits come at once; the long run follows.
const FIRST = 5000, TOTAL = 250000;
// The pace: dn/dt = (A + B n) times the pace and the rush.
const A = 5, B = 0.12;
// The view never fits less than this many steps across.
const MIN_SPAN = 22;
let digits = null, total = 0, pts = null;
// n: steps drawn, a real number; the head step is part drawn.
let n = 0, playing = true, done = false, rush = 0, held = false;
const savedPace = Number(store.get('pace'));
let paceV = store.get('pace') != null && Number.isFinite(savedPace) ? clamp(savedPace, 0, 1) : 0.5;
const paceOf = v => 4 ** (2 * v - 1);
// The walk's box over the points drawn so far.
const box = { x0: 0, x1: 0, y0: 0, y1: 0, upTo: 0 };
// The view: centre in walk units, CSS pixels per step, and its targets.
const view = { x: 0, y: 0, s: 30, tx: 0, ty: 0, ts: 30 };
// The end: a band of light runs down the walk, and the head goes out.
let sweepT = -1, headL = 1;
let gl = null, R = null, raf = 0, visible = true, last = 0, frameNo = 0, calm = reduced();
let cssW = 1, cssH = 1, dpr = 1, started = false, lastInput = 0, heard = false;
let free = { cx: 0, cy: 0, w: 1, h: 1 };
// ?qa hands the state to a test script.
if (new URLSearchParams(location.search).has('qa')) globalThis.__pw = { get n() { return n; }, get total() { return total; }, get playing() { return playing; }, get done() { return done; }, get view() { return { ...view }; }, jump: k => { n = clamp(k, 0, total); growBox(); poke(); } };

/* ---------- bar ---------- */
const ui = initPage({ id: ID, bar: {
  actions: [
    { verb: 'pause', key: 'Space', onPress: () => toggle() },
    { verb: 'restart', key: 'R', onPress: () => restart() },
  ],
  slider: { label: 'Pace', min: 0, max: 1, step: 0.001, value: paceV, onInput: v => { paceV = v; store.set('pace', v); poke(); } },
  quality: true,
  keys: [['click', 'pause'], ['hold', 'rush']],
  help: [
    ['click', 'Tap to pause the walk or go on'],
    ['hold', 'Hold to rush the walk ahead'],
    ['Space', 'Press Space to pause or go on'],
    ['R', 'Press R to start again from the centre'],
  ],
} });
const introDone = playIntro({ ready: pageReady() });
const kit = audioKit({ keys: new Set([' ', 'r', 'R']), sleepMs: 1500 });
const snd = makeSound(kit);
const pauseBtn = () => document.querySelectorAll('.stim-ui [aria-keyshortcuts="Space"]');
function syncBar() { pauseBtn().forEach(b => b.setAttribute('aria-pressed', String(!playing && !done))); }

/* ---------- the readout ---------- */
// The last digits and the count, small, in the top right corner.
const read = document.createElement('div');
read.className = 'pw-read';
read.setAttribute('aria-hidden', 'true');
read.innerHTML = '<span class="pw-digits"></span><span class="pw-count"></span>';
stage.append(read);
const readDigits = read.firstChild, readCount = read.lastChild;
let readAt = -1;
const SHOW = 11;
function readout() {
  if (!digits) return;
  const k = Math.min(total - 1, Math.floor(n));
  if (k === readAt) return;
  readAt = k;
  // The digits up to the head, with the point after the 3.
  let s = '';
  for (let i = Math.max(0, k - SHOW + 1); i < k; i++) s += (i === 1 ? '.' : '') + digits[i];
  readDigits.innerHTML = `${k >= SHOW ? '<i>…</i>' : ''}${s}${k === 1 ? '.' : ''}<b>${digits[k]}</b>`;
  readCount.textContent = (k + 1).toLocaleString('en');
}

/* ---------- GL ---------- */
const canvas = document.createElement('canvas');
canvas.setAttribute('aria-hidden', 'true');
stage.prepend(canvas);
const D = detail({ maxDpr: 2, budget: 2.6e6, steps: 2, settle: 2, onChange: () => resize(true) });

// The ramp runs from deep indigo through blue and sea teal to pale gold and coral.
const STOPS = [[0.42, 0.17, 285], [0.56, 0.16, 258], [0.7, 0.12, 200], [0.84, 0.12, 100], [0.76, 0.15, 42]];
const RAMP = Array.from({ length: 64 }, (_, i) => {
  const t = (i / 63) * (STOPS.length - 1), j = Math.min(STOPS.length - 2, Math.floor(t)), f = t - j;
  const a = STOPS[j], b = STOPS[j + 1];
  return linFit(a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f);
});

// The walk fits the free stage between the bar parts.
function fit() {
  const c = ui.cover?.() || { top: 0, bottom: 0 };
  const top = c.top || 0, bot = c.bottom || 0;
  const h = Math.max(160, cssH - top - bot);
  free = { cx: cssW / 2, cy: top + h / 2, w: cssW, h };
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
  fit();
  aim(true);
  draw();
}

// Digit d points 36 d degrees clockwise from up.
const DIR = Array.from({ length: 10 }, (_, d) => [Math.sin(d * Math.PI / 5), Math.cos(d * Math.PI / 5)]);
function setDigits(ds) {
  digits = ds;
  total = ds.length;
  pts = new Float32Array(2 * (total + 1));
  let x = 0, y = 0;
  for (let i = 0; i < total; i++) {
    x += DIR[ds[i]][0]; y += DIR[ds[i]][1];
    pts[2 * i + 2] = x; pts[2 * i + 3] = y;
  }
  R?.setWalk(pts);
  readAt = -1;
}

// The box grows over each point the head has passed.
function growBox() {
  const k = Math.min(total, Math.floor(n) + 1);
  if (k < box.upTo) Object.assign(box, { x0: 0, x1: 0, y0: 0, y1: 0, upTo: 0 });
  for (let i = box.upTo + 1; i <= k; i++) {
    const x = pts[2 * i], y = pts[2 * i + 1];
    if (x < box.x0) box.x0 = x; else if (x > box.x1) box.x1 = x;
    if (y < box.y0) box.y0 = y; else if (y > box.y1) box.y1 = y;
  }
  box.upTo = Math.max(box.upTo, k);
}
// The view's targets: the box, with room round it, in the free stage.
function aim(snap = false) {
  const bw = Math.max(MIN_SPAN, box.x1 - box.x0), bh = Math.max(MIN_SPAN, box.y1 - box.y0);
  view.ts = Math.min(free.w * 0.86 / bw, free.h * 0.84 / bh);
  view.tx = (box.x0 + box.x1) / 2; view.ty = (box.y0 + box.y1) / 2;
  if (snap) { view.s = view.ts; view.x = view.tx; view.y = view.ty; }
}
function head() {
  const k = Math.min(total, Math.floor(n)), f = Math.min(1, n - k);
  if (k >= total) return [pts[2 * total], pts[2 * total + 1]];
  return [pts[2 * k] + (pts[2 * k + 2] - pts[2 * k]) * f, pts[2 * k + 1] + (pts[2 * k + 3] - pts[2 * k + 1]) * f];
}
// Walk units to CSS pixels on the stage.
const SX = x => free.cx + (x - view.x) * view.s;
const SY = y => free.cy - (y - view.y) * view.s;

function draw() {
  if (!R || !pts) return;
  const s = view.s;
  // A finer step gets less light, so the dense walk stays clear.
  const e = 0.9 * clamp(s / 7, 0.04, 1) ** 0.8;
  const w = dpr * clamp(0.5 + s * 0.028, 0.5, 1.25);
  const rate = rateNow();
  const [hx, hy] = head();
  const sweep = sweepT < 0 ? -1 : sweepT / SWEEP * 1.08 - 0.04;
  const sweepE = sweepT < 0 || calm ? 0 : 1.1 * Math.sin(Math.PI * clamp(sweepT / SWEEP, 0, 1)) ** 0.5;
  R.draw({
    n, total, cx: free.cx * dpr, cy: (cssH - free.cy) * dpr, vx: view.x, vy: view.y, scale: s * dpr,
    w, e, heat: (calm ? 0.5 : 1.2) * headL, heatLen: clamp(rate * 0.18, 2.5, 240 + n * 0.002), sweep, sweepE,
    hx: SX(hx) * dpr, hy: (cssH - SY(hy)) * dpr, hr: 5 * dpr, hl: headL * (done ? 1 : 0.9), hc: RAMP[RAMP.length - 1],
    frameNo: calm ? 0 : frameNo, bloomLevels: D.rung >= 2 ? 4 : 6,
  });
}

/* ---------- pace and play ---------- */
const rateNow = () => (playing && !done ? (A + B * n) * paceOf(paceV) * (1 + 11 * rush) : 0);
const SWEEP = 3.2;

// Moves the walk on by dt seconds; returns the steps that began.
function advance(dt) {
  const m = paceOf(paceV) * (1 + 11 * rush);
  const n0 = n;
  // dn/dt = a + b n has an exact step: no drift at any frame rate.
  const a = A * m, b = B * m;
  n = Math.min(total, (n + a / b) * Math.exp(b * dt) - a / b);
  const k0 = Math.floor(n0), k1 = Math.min(total - 1, Math.floor(n));
  const events = [];
  const count = k1 - k0;
  if (count > 0) {
    // Many steps in one frame: a few spread through it are enough for sound.
    const take = Math.min(count, 6);
    for (let j = 1; j <= take; j++) {
      const i = k0 + Math.round((j * count) / take);
      events.push({ d: digits[i], at: ((i - n0) / Math.max(1e-6, n - n0)) * dt });
    }
  }
  if (n >= total) finish();
  return events;
}
function finish() {
  if (done) return;
  done = true; playing = false;
  sweepT = 0;
  snd.chord(panNow());
  syncBar();
}
function panNow() { const [hx] = head(); return clamp(SX(hx) / cssW * 2 - 1, -1, 1); }
function toggle() {
  if (!digits) return;
  if (done) { restart(); return; }
  playing = !playing;
  snd.tap(digits[Math.min(total - 1, Math.floor(n))], panNow());
  syncBar();
  poke();
}
function restart() {
  if (!digits) return;
  n = 0; done = false; playing = true; sweepT = -1; headL = 1;
  Object.assign(box, { x0: 0, x1: 0, y0: 0, y1: 0, upTo: 0 });
  growBox();
  snd.quiet();
  snd.tap(digits[0], 0);
  // The view eases back in from where it stood.
  aim(calm);
  syncBar();
  poke();
}

/* ---------- frame loop ---------- */
// Lively while the walk draws, the view eases or the end sweep runs.
// Paused or done, the loop sleeps; there is no ambient drift.
function frame(now) {
  raf = 0;
  if (!visible || !gl || !started) return;
  const t0 = performance.now();
  const dt = Math.max(0, Math.min(1 / 20, (now - last) / 1000));
  last = Math.max(last, now);
  let again = false;
  try {
    rush += ((held && playing ? 1 : 0) - rush) * (calm ? 1 : 1 - Math.exp(-dt / 0.5));
    if (rush < 0.002) rush = 0;
    const events = playing && !done && digits ? advance(dt) : [];
    growBox();
    aim();
    // The view eases in log space, so the zoom reads as steady.
    // A walk past the frame's edge makes the view catch up faster.
    const hw = free.w / 2 / view.s, hh = free.h / 2 / view.s;
    const out = box.x0 < view.x - hw || box.x1 > view.x + hw || box.y0 < view.y - hh || box.y1 > view.y + hh;
    const k = calm ? 1 : 1 - Math.exp(-dt / (out ? 0.25 : 0.8));
    view.s = Math.exp(Math.log(view.s) + (Math.log(view.ts) - Math.log(view.s)) * k);
    view.x += (view.tx - view.x) * k; view.y += (view.ty - view.y) * k;
    const easing = Math.abs(Math.log(view.ts / view.s)) > 0.002 || Math.hypot(view.tx - view.x, view.ty - view.y) * view.s > 0.3;
    if (sweepT >= 0) { sweepT += dt; if (sweepT > SWEEP) sweepT = -1; }
    // At the end the head flares once, then goes out.
    const hTo = done ? 0 : playing ? 1 : 0.55;
    headL += (hTo - headL) * (calm ? 1 : 1 - Math.exp(-dt / (done ? 0.5 : 0.25)));
    if (Math.abs(headL - hTo) < 0.004) headL = hTo;
    const fading = headL !== hTo;
    const rate = rateNow();
    snd.steps(events, rate, panNow());
    snd.air(rate, playing && !done);
    draw();
    readout();
    // The context sleeps once the last sound ends.
    if (heard && !snd.busy) kit.rest(() => !snd.busy);
    heard = snd.busy;
    D.frame(dt);
    frameNo++;
    again = (playing && !done) || easing || sweepT >= 0 || fading || rush > 0;
  } finally {
    // A thrown error still leaves the loop able to wake.
    if (again) schedule(); else rest();
  }
}
function rest() { kit.rest(() => !raf && !snd.busy); }
// One frame at most is ever pending, so loops never stack.
function schedule() {
  if (raf || !visible || !gl || !started) return;
  raf = requestAnimationFrame(frame);
}
function poke() {
  lastInput = performance.now();
  if (!raf) last = performance.now();
  schedule();
}
function halt() { cancelAnimationFrame(raf); raf = 0; }

/* ---------- pointer: tap pauses, hold rushes ---------- */
const pointer = { id: null, x0: 0, y0: 0, t0: 0, moved: false, timer: 0 };
const local = e => { const r = stage.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
stage.addEventListener('pointerdown', e => {
  if (e.button !== 0 || !R || pointer.id !== null || (e.target !== canvas && e.target !== stage)) return;
  try { stage.setPointerCapture(e.pointerId); } catch { /* capture is optional */ }
  const [x, y] = local(e);
  Object.assign(pointer, { id: e.pointerId, x0: x, y0: y, t0: performance.now(), moved: false });
  // A press held 260 ms becomes a rush.
  pointer.timer = setTimeout(() => { pointer.timer = 0; if (pointer.id !== null && playing) { held = true; poke(); } }, 260);
  poke();
});
stage.addEventListener('pointermove', e => {
  if (e.pointerId !== pointer.id || pointer.moved) return;
  const [x, y] = local(e);
  // A drag also rushes: the hand is on the walk.
  if (Math.hypot(x - pointer.x0, y - pointer.y0) >= 8) { pointer.moved = true; if (playing) held = true; poke(); }
});
function endPointer(e) {
  if (e.pointerId !== pointer.id) return;
  clearTimeout(pointer.timer);
  const tap = !held && !pointer.moved && performance.now() - pointer.t0 < 260;
  pointer.id = null; held = false;
  if (tap && e.type === 'pointerup') toggle();
  poke();
}
['pointerup', 'pointercancel', 'lostpointercapture'].forEach(t => stage.addEventListener(t, endPointer));

/* ---------- life cycle ---------- */
whenVisible(stage, on => {
  visible = on;
  if (on) { last = performance.now(); schedule(); }
  else { halt(); snd.quiet(); }
});
onReducedChange(on => { calm = on; draw(); poke(); });
sound.onChange(on => { if (on) poke(); });
new ResizeObserver(() => resize()).observe(stage);
ui.onCover?.(() => resize());

async function setup() {
  gl = canvas.getContext('webgl2', { antialias: false, alpha: false, depth: false, powerPreference: 'high-performance' });
  if (!gl) throw new Error('no webgl2');
  if (!gl.getExtension('EXT_color_buffer_float') && !gl.getExtension('EXT_color_buffer_half_float')) throw new Error('no float targets');
  R = await makeRenderer(gl);
  R.setRamp(RAMP);
  if (pts) R.setWalk(pts);
  sizeKey = '';
}
onContextLoss(canvas, {
  lost: () => { halt(); gl = null; R = null; },
  restored: async () => { await setup(); resize(true); poke(); },
  failed: () => fail.removeAttribute('hidden'),
});

// The digits come from a worker, the first few thousand at once.
// Without a worker the page computes them itself.
function loadDigits(onDigits) {
  let first = true;
  return new Promise(resolve => {
    const take = ds => { onDigits(ds); if (first) { first = false; resolve(); } };
    try {
      const w = new Worker(new URL('./digits.js', import.meta.url), { type: 'module' });
      w.onmessage = e => { take(e.data.digits); if (e.data.digits.length >= TOTAL) w.terminate(); };
      w.onerror = e => { e.preventDefault?.(); w.terminate(); fallback(); };
      w.postMessage({ sizes: [FIRST, TOTAL] });
    } catch { fallback(); }
    function fallback() {
      if (first) take(piDigits(FIRST));
      setTimeout(() => take(piDigits(TOTAL)), 400);
    }
  });
}

// The first frame is a picture: the walk has just begun.
function prewarm() {
  n = 40;
  growBox();
  aim(true);
}

mark('build');
try {
  await setup();
  await loadDigits(ds => {
    const k = n;
    setDigits(ds);
    // The long run keeps the steps drawn so far.
    n = Math.min(k, total);
    if (started) poke();
  });
  prewarm();
  resize(true);
  readout();
  draw();
  gl.finish();
  canvas.classList.add('on');
  mark('first-frame');
  await introDone;
  started = true;
  syncBar();
  poke();
} catch (err) {
  console.error(err);
  fail.removeAttribute('hidden');
  ui.hideControls?.();
}
