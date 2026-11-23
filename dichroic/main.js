// Dichroic glass: a folded screen of three coated panes on a white table.
// Move the lamp: each leaf flips between reflected and passed colour.
import { initPage, whenVisible, pageReady, stage as mark, reduced, onReducedChange, audioKit, sound } from '../shared/stim.js';
import { intro as playIntro } from '../shared/intro.js';
import { onContextLoss } from '../shared/gl.js';
import { detail } from '../shared/detail.js';
import { makeRenderer } from './render.js';
import { PANES, COATS, COAT_KEYS, TARGET, PITCH, AIM, MAP, bandAt } from './glass.js';
import { makeSound } from './sound.js';
mark('libs');

const ID = 'dichroic';
const stage = document.getElementById('stage');
const fail = stage.querySelector('.fail');
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const saved = k => { try { return localStorage.getItem(`stimming.${ID}.${k}`); } catch { return null; } };
const save = (k, v) => { try { localStorage.setItem(`stimming.${ID}.${k}`, String(v)); } catch { /* private mode */ } };
// The lamp stays inside this radius from the glass.
const MAX_R = 5.5;
// An Orbit takes this many seconds.
const ORBIT_T = 10;

/* ---------- state ---------- */
let coatKey = COAT_KEYS.includes(saved('coat')) ? saved('coat') : 'gold';
let height = clamp(parseFloat(saved('height') ?? '2.6'), 1.7, 4.2);
if (!Number.isFinite(height)) height = 2.6;
// The lamp: behind the glass and to the left, so it opens backlit.
const lamp = { x: -1.7, y: 2.1, vx: 0, vy: 0, tx: -1.7, ty: 2.1, h: height, speed: 0 };
const coatVec = c => [c.lo, c.hi, c.inv, c.peak];
let coatNow = coatVec(COATS[coatKey]);
let gl = null, R = null, raf = 0, timer = 0, visible = true, last = 0, frameNo = 0, calm = reduced();
let cssW = 1, cssH = 1, dpr = 1, started = false, lastInput = 0, frozen = false, relight = true;
let orbit = null, livelyAt = 0, hushed = true, qaOver = {};

/* ---------- bar ---------- */
const DOTS = { gold: 'oklch(0.82 0.15 80)', magenta: 'oklch(0.62 0.24 340)', cyan: 'oklch(0.8 0.13 200)' };
const ui = initPage({ id: ID, bar: {
  choice: {
    label: 'Coating',
    value: coatKey,
    options: COAT_KEYS.map((k, i) => ({ value: k, label: k[0].toUpperCase() + k.slice(1), dot: DOTS[k], key: String(i + 1) })),
    onPick: v => setCoat(v),
  },
  actions: [
    { verb: 'orbit', key: 'Space', onPress: () => startOrbit() },
  ],
  slider: { label: 'Height', min: 1.7, max: 4.2, step: 0.05, value: height, onInput: v => { height = v; save('height', v); poke(); } },
  quality: true,
  keys: [['drag', 'move the lamp'], ['arrows', 'move the lamp'], ['Space', 'orbit']],
  help: [
    ['drag', 'Drag to carry the lamp round the glass'],
    ['click', 'Tap the table to hang the lamp over that spot'],
    ['arrows', 'Press the arrows to move the lamp a step'],
    ['Space', 'Press Space to send the lamp once round'],
  ],
} });
const introDone = playIntro({ ready: pageReady() });
const kit = audioKit({ keys: new Set([' ', '1', '2', '3', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']), sleepMs: 2600, noiseSeconds: 0 });
const snd = makeSound(kit);

/* ---------- GL ---------- */
const canvas = document.createElement('canvas');
canvas.setAttribute('aria-hidden', 'true');
stage.prepend(canvas);
// Rungs: the pixel ratio, then a smaller light map and bloom.
const D = detail({ maxDpr: 2, budget: 2.6e6, steps: 2, settle: 2, onChange: () => { relight = true; resize(true); } });

/* ---------- camera ---------- */
const CAM_D = 8;
const cam = { pos: [0, 0, 0], r: [1, 0, 0], u: [0, 0, 1], f: [0, 1, 0], tanH: 0.3 };
function fitCam() {
  const asp = cssW / cssH;
  // The glass fills about half the width; a tall stage widens the lens.
  cam.tanH = Math.max(0.28, 1.7 / (asp * CAM_D));
  const s = Math.sin(PITCH), c = Math.cos(PITCH);
  cam.f = [0, c, -s];
  cam.u = [0, s, c];
  cam.r = [1, 0, 0];
  cam.pos = [TARGET[0], TARGET[1] - CAM_D * c, TARGET[2] + CAM_D * s];
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
  fitCam();
  R.resize(Math.round(cssW * dpr), Math.round(cssH * dpr));
  draw();
}

/* ---------- the lamp ---------- */
function aimLamp(x, y) {
  const r = Math.hypot(x, y), k = r > MAX_R ? MAX_R / r : 1;
  lamp.tx = x * k; lamp.ty = y * k;
}
function startOrbit() {
  const r = Math.max(2.2, Math.hypot(lamp.tx, lamp.ty));
  orbit = { t: 0, r, a0: Math.atan2(lamp.ty, lamp.tx), dur: calm ? ORBIT_T * 1.6 : ORBIT_T };
  poke();
}
// A full circle that eases in and out.
function stepOrbit(dt) {
  if (!orbit) return;
  orbit.t += dt;
  const u = Math.min(1, orbit.t / orbit.dur);
  const e = u * u * (3 - 2 * u);
  const a = orbit.a0 + 2 * Math.PI * e;
  aimLamp(orbit.r * Math.cos(a), orbit.r * Math.sin(a));
  if (u >= 1) orbit = null;
}
// The hand carries the lamp: a soft spring, a little sway when calm is off.
function stepLamp(dt) {
  const w = calm ? 14 : 11, z = calm ? 1 : 0.8;
  const steps = Math.ceil(dt / (1 / 120)), h = dt / Math.max(1, steps);
  const x0 = lamp.x, y0 = lamp.y, h0 = lamp.h;
  for (let i = 0; i < steps; i++) {
    lamp.vx += (w * w * (lamp.tx - lamp.x) - 2 * z * w * lamp.vx) * h;
    lamp.vy += (w * w * (lamp.ty - lamp.y) - 2 * z * w * lamp.vy) * h;
    lamp.x += lamp.vx * h;
    lamp.y += lamp.vy * h;
  }
  lamp.h += (height - lamp.h) * (1 - Math.exp(-dt / 0.12));
  lamp.speed = dt > 0 ? Math.hypot(lamp.x - x0, lamp.y - y0, lamp.h - h0) / dt : 0;
  return Math.hypot(lamp.vx, lamp.vy) > 1e-3 || Math.hypot(lamp.tx - lamp.x, lamp.ty - lamp.y) > 1e-4 || Math.abs(height - lamp.h) > 1e-4;
}
const lampPos = () => [lamp.x, lamp.y, lamp.h];

/* ---------- coating ---------- */
let coatFrom = coatNow, coatT = 1;
function setCoat(v) {
  if (!COATS[v] || v === coatKey) return;
  coatKey = v;
  save('coat', v);
  coatFrom = coatNow.slice();
  coatT = 0;
  snd.clink(COATS[v].note);
  poke();
}
// The band slides from the old coating to the new over 0.6 s.
function stepCoat(dt) {
  if (coatT >= 1) return false;
  coatT = Math.min(1, coatT + dt / (calm ? 0.3 : 0.6));
  const e = coatT * coatT * (3 - 2 * coatT);
  const to = coatVec(COATS[coatKey]);
  coatNow = coatFrom.map((a, i) => a + (to[i] - a) * e);
  return true;
}

/* ---------- frame state ---------- */
function state() {
  const L = lampPos();
  const d2 = (L[0] - AIM[0]) ** 2 + (L[1] - AIM[1]) ** 2 + (L[2] - AIM[2]) ** 2;
  const s = {
    cam, lamp: L, coat: coatNow, relight,
    // The lamp keeps the glass equally lit at any distance.
    power: 1.05 * d2, fill: 0.018, frameNo,
    expo: 0.95, bloomK: 0.3, bloomLevels: D.rung >= 2 ? 3 : 5, mapRes: D.rung >= 2 ? 896 : MAP.res,
    ...qaOver,
  };
  relight = false;
  return s;
}
function draw() { if (R) R.frame(state()); }

/* ---------- sound ---------- */
// Each leaf's lit face: +1 when the lamp is on the eye's side.
const faceOf = (k, L) => {
  const p = PANES[k];
  const sl = (L[0] - p.c[0]) * p.n[0] + (L[1] - p.c[1]) * p.n[1];
  const se = (cam.pos[0] - p.c[0]) * p.n[0] + (cam.pos[1] - p.c[1]) * p.n[1];
  return Math.sign(sl) * Math.sign(se);
};
let faces = null;
const ringAt = [0, 0, 0];
function listen(now) {
  const L = lampPos();
  const next = PANES.map((_, k) => faceOf(k, L));
  if (faces) next.forEach((f, k) => {
    if (f === faces[k] || now - ringAt[k] < 150) return;
    ringAt[k] = now;
    snd.ring(k, COATS[coatKey].note, PANES[k].c[0] * 0.7, 0.6 + 0.4 * Math.min(1, lamp.speed / 4));
  });
  faces = next;
  // The hum sings the middle leaf's reflected colour.
  const p = PANES[1];
  const v = [L[0] - p.c[0], L[1] - p.c[1], L[2] - p.c[2]];
  const c = Math.abs(v[0] * p.n[0] + v[1] * p.n[1]) / Math.hypot(...v);
  snd.frame({ speed: lamp.speed, lam: bandAt(COATS[coatKey], c), pan: L[0] / 4 });
}

/* ---------- frame loop ---------- */
// Lively while the lamp moves or the coating turns; then it sleeps.
function frame(now) {
  raf = 0;
  if (!visible || !gl || !started) return;
  const t0 = performance.now();
  const dt = frozen ? 0 : Math.max(0, Math.min(1 / 15, (now - last) / 1000));
  last = Math.max(last, now);
  let again = true;
  try {
    stepOrbit(dt);
    const moving = stepLamp(dt);
    const morphing = stepCoat(dt);
    if (moving || morphing || frameNo === 0) relight = true;
    draw();
    D.frame(dt);
    frameNo++;
    const lively = moving || morphing || !!orbit || pointer.id !== null;
    if (lively) { livelyAt = t0; hushed = false; listen(t0); }
    else if (!hushed && t0 - livelyAt > 400) { hushed = true; rest(); }
    again = lively || !hushed;
  } finally {
    // A thrown error still leaves the loop able to wake.
    if (again) schedule(); else rest();
  }
}
function rest() { snd.quiet(); kit.rest(() => performance.now() - livelyAt > 800 && !snd.busy); }
// One frame at most is ever pending, so loops never stack.
function schedule(delay = 0) {
  if (raf || timer || !visible || !gl || !started) return;
  if (delay > 4) timer = setTimeout(() => { timer = 0; schedule(); }, delay - 2);
  else raf = requestAnimationFrame(frame);
}
function poke() {
  lastInput = performance.now();
  if (!raf && !timer) last = performance.now();
  schedule();
}
function halt() { cancelAnimationFrame(raf); raf = 0; clearTimeout(timer); timer = 0; }

/* ---------- pointer ---------- */
// A press turns into a drag after 8 px, or a hold after 260 ms; otherwise a tap.
// Either way the lamp heads for the table point under the finger at once.
const pointer = { id: null, x0: 0, y0: 0, drag: false, at: 0 };
const local = e => { const r = stage.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
const onStage = e => e.target === canvas || e.target === stage;
// The table point under a screen point.
function tablePoint(x, y) {
  const sx = (x / cssW) * 2 - 1, sy = 1 - (y / cssH) * 2, asp = cssW / cssH;
  const d = [0, 1, 2].map(i => cam.f[i] + sx * cam.tanH * asp * cam.r[i] + sy * cam.tanH * cam.u[i]);
  // Rays at the horizon reach the lamp's far limit.
  const t = d[2] < -0.02 ? -cam.pos[2] / d[2] : 1e3;
  return [cam.pos[0] + d[0] * t, cam.pos[1] + d[1] * t];
}
// The lamp hangs over the point, a little further out, so the edges reach far.
const follow = (x, y) => { const [px, py] = tablePoint(x, y); aimLamp(px * 1.15, py * 1.15); };
stage.addEventListener('pointerdown', e => {
  if (e.button !== 0 || !R || pointer.id !== null || !onStage(e)) return;
  try { stage.setPointerCapture(e.pointerId); } catch { /* capture is optional */ }
  const [x, y] = local(e);
  Object.assign(pointer, { id: e.pointerId, x0: x, y0: y, drag: false, at: performance.now() });
  orbit = null;
  follow(x, y);
  poke();
});
stage.addEventListener('pointermove', e => {
  if (e.pointerId !== pointer.id) return;
  const [x, y] = local(e);
  if (!pointer.drag && Math.hypot(x - pointer.x0, y - pointer.y0) > 8) pointer.drag = true;
  follow(x, y);
  poke();
});
function endPointer(e) {
  if (e.pointerId !== pointer.id) return;
  pointer.id = null;
  pointer.drag = false;
  poke();
}
['pointerup', 'pointercancel', 'lostpointercapture'].forEach(t => stage.addEventListener(t, endPointer));

/* ---------- keys ---------- */
const STEP = 0.4;
const ARROWS = { ArrowLeft: [-STEP, 0], ArrowRight: [STEP, 0], ArrowUp: [0, STEP], ArrowDown: [0, -STEP] };
stage.addEventListener('keydown', e => {
  const a = ARROWS[e.key];
  if (!a || e.altKey || e.ctrlKey || e.metaKey) return;
  e.preventDefault();
  orbit = null;
  aimLamp(lamp.tx + a[0], lamp.ty + a[1]);
  poke();
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

// ?qa hands the state to a test script.
if (new URLSearchParams(location.search).has('qa')) globalThis.__dichroic = {
  get busy() { return !!(raf || timer); }, get lamp() { return { ...lamp }; }, get orbiting() { return !!orbit; },
  setLamp(x, y, h) {
    aimLamp(x, y); lamp.x = lamp.tx; lamp.y = lamp.ty; lamp.vx = lamp.vy = 0;
    if (h) { height = lamp.h = h; }
    relight = true; draw();
  },
  coat(v) { setCoat(v); coatT = 1; coatNow = coatVec(COATS[coatKey]); relight = true; draw(); },
  over(o) { qaOver = o; relight = true; draw(); }, freeze(on) { frozen = on; if (!on) poke(); },
  get rung() { return D.rung; },
};

async function setup() {
  gl = canvas.getContext('webgl2', { antialias: false, alpha: false, depth: false, powerPreference: 'high-performance' });
  if (!gl) throw new Error('no webgl2');
  R = await makeRenderer(gl);
  sizeKey = '';
  relight = true;
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
  faces = PANES.map((_, k) => faceOf(k, lampPos()));
  poke();
} catch (err) {
  console.error(err);
  fail.removeAttribute('hidden');
  ui.hideControls?.();
}
