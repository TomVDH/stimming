// Opal turn: a black opal on dark velvet under one soft light.
// Drag tilts the tray; domains of silica spheres flash their colours.
import { initPage, whenVisible, pageReady, stage as mark, reduced, onReducedChange, audioKit, sound } from '../shared/stim.js';
import { intro as playIntro } from '../shared/intro.js';
import { onContextLoss } from '../shared/gl.js';
import { detail } from '../shared/detail.js';
import { makeRenderer } from './render.js';
import { makeDomains, flares } from './domains.js';
import { makeSound } from './sound.js';
mark('libs');

const ID = 'opal';
const stage = document.getElementById('stage');
const fail = stage.querySelector('.fail');
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
// The tray tilts 26 degrees at most.
const MAX_TILT = 0.45;
// Radians of tilt for each pixel of drag.
const DRAG_K = 0.0017;
// A Turn rocks the stone for this many seconds.
const TURN_T = 7;

/* ---------- state ---------- */
const saved = k => { try { return localStorage.getItem(`stimming.${ID}.${k}`); } catch { return null; } };
const save = (k, v) => { try { localStorage.setItem(`stimming.${ID}.${k}`, String(v)); } catch { /* private mode */ } };
let lamp = clamp(parseFloat(saved('lamp') ?? '0.4'), 0, 1);
if (!Number.isFinite(lamp)) lamp = 0.4;
let lampNow = lamp;
let gl = null, R = null, raf = 0, timer = 0, visible = true, last = 0, frameNo = 0, calm = reduced();
let cssW = 1, cssH = 1, dpr = 1, started = false, lastInput = 0, clock = 0, drifting = 1, frozen = false;
let qaOver = {}, yaw = 0;
// The tilt: x turns about the screen's horizontal, y about its vertical.
const tilt = { x: 0.1, y: -0.15, vx: 0, vy: 0, tx: 0.1, ty: -0.15 };
let turn = null, speed = 0, livelyAt = 0, hushed = true;

const domains = makeDomains();

/* ---------- bar ---------- */
const ui = initPage({ id: ID, bar: {
  actions: [
    { verb: 'turn', key: 'Space', onPress: () => startTurn() },
  ],
  slider: { label: 'Lamp', min: 0, max: 1, step: 0.01, value: lamp, onInput: v => { lamp = v; save('lamp', v); poke(); } },
  quality: true,
  keys: [['drag', 'tilt the stone'], ['arrows', 'tilt'], ['Space', 'turn']],
  help: [
    ['drag', 'Drag slowly to tilt the stone'],
    ['click', 'Tap the stone to rock it'],
    ['arrows', 'Press the arrows to tilt it a step'],
    ['Space', 'Press Space to turn it once, slowly'],
  ],
} });
const introDone = playIntro({ ready: pageReady() });
const kit = audioKit({ keys: new Set([' ', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']), sleepMs: 2600 });
const snd = makeSound(kit);

/* ---------- GL ---------- */
const canvas = document.createElement('canvas');
canvas.setAttribute('aria-hidden', 'true');
stage.prepend(canvas);
// Rungs: the pixel ratio, then a smaller bloom.
const D = detail({ maxDpr: 2, budget: 2.6e6, steps: 2, settle: 2, onChange: () => resize(true) });

/* ---------- camera and light ---------- */
// The eye looks down at the tray, 26 degrees from straight above.
const CAM_D = 7, PITCH = 26 * Math.PI / 180;
const cam = { pos: [0, 0, 0], r: [1, 0, 0], u: [0, 1, 0], f: [0, 0, -1], tanH: 0.2 };
function fitCam() {
  const asp = cssW / cssH;
  // The stone fills about two thirds of the short side.
  // A tall stage turns the stone lengthwise, so it fills the frame.
  yaw = asp < 0.8 ? Math.PI / 2 : 0;
  cam.tanH = (yaw ? Math.max(1.3, 0.98 / asp) : Math.max(1.12, 1.55 / asp)) / CAM_D;
  const tgt = [0, 0.04, 0.1];
  const s = Math.sin(PITCH), c = Math.cos(PITCH);
  cam.pos = [tgt[0], tgt[1] - CAM_D * s, tgt[2] + CAM_D * c];
  cam.f = [0, s, -c];
  cam.u = [0, c, s];
  cam.r = [1, 0, 0];
}
// The soft box: behind the stone, 50 degrees up; the Lamp moves it left to right.
function lightDir() {
  const az = (-62 + 124 * lampNow) * Math.PI / 180, el = 50 * Math.PI / 180;
  const d = [Math.sin(az) * Math.cos(el), Math.cos(az) * Math.cos(el), Math.sin(el)];
  const x = [Math.cos(az), -Math.sin(az), 0];
  const y = [d[1] * x[2] - d[2] * x[1], d[2] * x[0] - d[0] * x[2], d[0] * x[1] - d[1] * x[0]];
  return { d, x, y };
}

// The tilt as a rotation, tray to world, in row-major order.
// Passed as is, GLSL reads it as its transpose: world to tray.
function rotation(ax, ay) {
  const th = Math.hypot(ax, ay);
  if (th < 1e-6) return new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1]);
  const kx = ax / th, ky = ay / th, c = Math.cos(th), s = Math.sin(th), C = 1 - c;
  return new Float32Array([
    c + C * kx * kx, C * kx * ky, s * ky,
    C * kx * ky, c + C * ky * ky, -s * kx,
    -s * ky, s * kx, c,
  ]);
}
// The product of two row-major 3 x 3 matrices.
function mul(A, B) {
  const o = new Float32Array(9);
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) o[r * 3 + c] = A[r * 3] * B[c] + A[r * 3 + 1] * B[3 + c] + A[r * 3 + 2] * B[6 + c];
  return o;
}
const spin = a => new Float32Array([Math.cos(a), -Math.sin(a), 0, Math.sin(a), Math.cos(a), 0, 0, 0, 1]);
// World to tray: the transpose times v.
const toTray = (M, v) => [
  M[0] * v[0] + M[3] * v[1] + M[6] * v[2],
  M[1] * v[0] + M[4] * v[1] + M[7] * v[2],
  M[2] * v[0] + M[5] * v[1] + M[8] * v[2],
];

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

/* ---------- the tilt ---------- */
function startTurn() {
  turn = { t: 0 };
  poke();
}
// The Turn's offset: a slow circle that swells and fades.
function turnOffset() {
  if (!turn) return [0, 0];
  const u = turn.t / TURN_T;
  const r = (calm ? 0.13 : 0.27) * Math.pow(Math.sin(Math.PI * u), 2);
  const a = 2 * Math.PI * 1.25 * u;
  return [r * Math.sin(a), r * (Math.cos(a) - 1) * 0.8 + r * 0.4];
}
// A soft spring with a little overshoot: the stone has weight.
function stepTilt(dt) {
  const [ox, oy] = turnOffset();
  const gx = tilt.tx + ox, gy = tilt.ty + oy;
  const w = 9, z = 0.72;
  const steps = Math.ceil(dt / (1 / 120)), h = dt / Math.max(1, steps);
  const x0 = tilt.x, y0 = tilt.y;
  for (let i = 0; i < steps; i++) {
    tilt.vx += (w * w * (gx - tilt.x) - 2 * z * w * tilt.vx) * h;
    tilt.vy += (w * w * (gy - tilt.y) - 2 * z * w * tilt.vy) * h;
    tilt.x += tilt.vx * h;
    tilt.y += tilt.vy * h;
  }
  speed = dt > 0 ? Math.hypot(tilt.x - x0, tilt.y - y0) / dt : 0;
  return Math.hypot(tilt.vx, tilt.vy) > 1e-3 || Math.hypot(gx - tilt.x, gy - tilt.y) > 1e-4;
}
function aimTilt(x, y) {
  const m = Math.hypot(x, y), k = m > MAX_TILT ? MAX_TILT / m : 1;
  tilt.tx = x * k; tilt.ty = y * k;
}
// A hand's tremor: about one degree, slow.
function tremor() {
  if (calm) return [0, 0];
  const a = 0.017 * drifting, t = clock;
  return [a * (Math.sin(0.41 * t) + 0.5 * Math.sin(0.97 * t + 2)), a * (Math.sin(0.33 * t + 1) + 0.5 * Math.sin(0.83 * t))];
}

/* ---------- frame state ---------- */
let M = rotation(0, 0), L = lightDir();
function state() {
  const [qx, qy] = tremor();
  M = mul(rotation(tilt.x + qx, tilt.y + qy), spin(yaw));
  L = lightDir();
  return {
    R: M, cam, light: L, key: 3.2, frameNo,
    expo: 1.0, bloomK: 0.32, bloomLevels: D.rung >= 2 ? 3 : 5,
    ...qaOver,
  };
}
function draw() { if (R) R.frame(state()); }

// Patches that flare ring a tone, placed by their x on the stone.
function listen() {
  if (speed < 0.05 || !sound.on) return;
  const hits = flares(domains.cells, toTray(M, cam.pos), toTray(M, L.d));
  let top = null;
  for (const f of hits) if (!top || f.lobe * f.c.area > top.lobe * top.c.area) top = f;
  if (top) snd.chime({ lam: top.lam, level: Math.min(1, top.lobe * top.c.area / 0.03) * (0.5 + 0.5 * Math.min(1, speed / 0.6)), pan: top.c.x * 0.8 });
}

/* ---------- frame loop ---------- */
// Lively while the stone moves; drifting at 30 fps; asleep after 60 s.
function frame(now) {
  raf = 0;
  if (!visible || !gl || !started) return;
  const t0 = performance.now();
  const dt = frozen ? 0 : Math.max(0, Math.min(1 / 15, (now - last) / 1000));
  last = Math.max(last, now);
  let again = true, lively = true;
  try {
    const idleFor = (t0 - lastInput) / 1000;
    // The tremor eases out over 2 s once the toy sleeps.
    drifting = idleFor > 60 ? Math.max(0, 1 - (idleFor - 60) / 2) : 1;
    clock += dt;
    if (turn) { turn.t += dt; if (turn.t >= TURN_T) turn = null; }
    lampNow += (lamp - lampNow) * (1 - Math.exp(-dt / 0.12));
    const moving = stepTilt(dt);
    const lampMoving = Math.abs(lamp - lampNow) > 1e-4;
    draw();
    listen();
    D.frame(dt);
    frameNo++;
    lively = moving || lampMoving || !!turn || pointer.drag;
    if (lively) { livelyAt = t0; hushed = false; snd.frame({ speed }); }
    // Drift alone makes no sound: the audio sleeps.
    else if (!hushed && t0 - livelyAt > 1200) { hushed = true; rest(); }
    again = lively || (!calm && drifting > 0);
  } finally {
    // A thrown error still leaves the loop able to wake.
    if (again) schedule(lively ? 0 : t0 + 34 - performance.now()); else rest();
  }
}
function rest() { snd.quiet(); kit.rest(() => performance.now() - livelyAt > 1000 && !snd.busy); }
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
const pointer = { id: null, x0: 0, y0: 0, x: 0, y: 0, tx0: 0, ty0: 0, drag: false, at: 0 };
const local = e => { const r = stage.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
const onStage = e => e.target === canvas || e.target === stage;
// The point on the tray under a screen point, at the stone's mid height.
function trayPoint(x, y) {
  const sx = (x / cssW) * 2 - 1, sy = 1 - (y / cssH) * 2, asp = cssW / cssH;
  const d = [0, 1, 2].map(i => cam.f[i] + sx * cam.tanH * asp * cam.r[i] + sy * cam.tanH * cam.u[i]);
  const t = (0.2 - cam.pos[2]) / d[2];
  return [cam.pos[0] + d[0] * t, cam.pos[1] + d[1] * t];
}
stage.addEventListener('pointerdown', e => {
  if (e.button !== 0 || !R || pointer.id !== null || !onStage(e)) return;
  try { stage.setPointerCapture(e.pointerId); } catch { /* capture is optional */ }
  const [x, y] = local(e);
  Object.assign(pointer, { id: e.pointerId, x0: x, y0: y, x, y, tx0: tilt.tx, ty0: tilt.ty, drag: false, at: performance.now() });
  // The press answers at once: the tray gives a little under the finger.
  const [px, py] = trayPoint(x, y);
  tilt.vy += clamp(px, -1.2, 1.2) * 0.12;
  tilt.vx += clamp(-py, -1, 1) * 0.12;
  poke();
});
stage.addEventListener('pointermove', e => {
  if (e.pointerId !== pointer.id) return;
  const [x, y] = local(e);
  if (!pointer.drag && Math.hypot(x - pointer.x0, y - pointer.y0) > 8) {
    pointer.drag = true;
    // The drag starts from here, so the stone does not jump.
    pointer.x0 = x; pointer.y0 = y;
  }
  if (pointer.drag) aimTilt(pointer.tx0 + (y - pointer.y0) * DRAG_K, pointer.ty0 + (x - pointer.x0) * DRAG_K);
  poke();
});
function endPointer(e) {
  if (e.pointerId !== pointer.id) return;
  const tap = !pointer.drag && e.type === 'pointerup' && performance.now() - pointer.at < 260;
  pointer.id = null;
  pointer.drag = false;
  // A tap rocks the stone: the tapped side dips, then the spring lifts it.
  if (tap) {
    const [px, py] = local(e).length ? trayPoint(...local(e)) : [0, 0];
    tilt.vy += clamp(px, -1.2, 1.2) * (calm ? 0.5 : 1.1);
    tilt.vx += clamp(-py, -1, 1) * (calm ? 0.5 : 1.1);
  }
  poke();
}
['pointerup', 'pointercancel', 'lostpointercapture'].forEach(t => stage.addEventListener(t, endPointer));

/* ---------- keys ---------- */
const STEP = 0.07;
const ARROWS = { ArrowLeft: [0, -STEP], ArrowRight: [0, STEP], ArrowUp: [-STEP, 0], ArrowDown: [STEP, 0] };
stage.addEventListener('keydown', e => {
  const a = ARROWS[e.key];
  if (!a || e.altKey || e.ctrlKey || e.metaKey) return;
  e.preventDefault();
  aimTilt(tilt.tx + a[0], tilt.ty + a[1]);
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
if (new URLSearchParams(location.search).has('qa')) globalThis.__opal = {
  get busy() { return !!(raf || timer); }, get tilt() { return { ...tilt }; }, get turning() { return !!turn; },
  setTilt(x, y) { aimTilt(x, y); tilt.x = tilt.tx; tilt.y = tilt.ty; tilt.vx = tilt.vy = 0; draw(); },
  setLamp(v) { lamp = lampNow = v; draw(); },
  turn: () => startTurn(), over(o) { qaOver = o; draw(); }, freeze(on) { frozen = on; if (!on) poke(); },
  get rung() { return D.rung; }, get cells() { return domains.cells.length; },
};

async function setup() {
  gl = canvas.getContext('webgl2', { antialias: false, alpha: false, depth: false, powerPreference: 'high-performance' });
  if (!gl) throw new Error('no webgl2');
  R = await makeRenderer(gl, { domains });
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
