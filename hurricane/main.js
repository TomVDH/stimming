// Hurricane eye: a weather plane punches through the eyewall into the eye.
// The flight runs on its own; drag looks round the cockpit; Space runs it again.
// Plan: docs/plans/hurricane.md. Toy doc: docs/toys/hurricane.md.
import { initPage, whenVisible, pageReady, stage as mark, reduced, onReducedChange, audioKit, sound } from '../shared/stim.js';
import { intro as playIntro } from '../shared/intro.js';
import { onContextLoss } from '../shared/gl.js';
import { detail } from '../shared/detail.js';
import { ALT, T_BREAK, T_START, stormShape, faceExit, runBearing, eyePath, pose, chop, rainAt, BOLTS } from './track.js';
import { bakeNoise } from './noise.js';
import { makeScene } from './scene.js';
import { makeSound } from './sound.js';
mark('libs');

const ID = 'hurricane';
const stage = document.getElementById('stage');
const fail = stage.querySelector('.fail');
const store = {
  get(k) { try { return localStorage.getItem(`stimming.${ID}.${k}`); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(`stimming.${ID}.${k}`, String(v)); } catch { /* private mode */ } },
};
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const DEG = Math.PI / 180;
const q = new URLSearchParams(location.search);

/* ---------- state ---------- */
const savedCat = Number(store.get('cat'));
const fly = {
  // Track time in seconds; the run starts in the wall.
  tau: q.has('t') ? Number(q.get('t')) : T_START,
  cat: clamp(Number.isFinite(savedCat) && savedCat >= 1 ? savedCat : 4, 1, 5),
  catNow: 0,
  // The head in the cockpit: yaw left is positive, pitch up is positive.
  yaw: q.has('yaw') ? Number(q.get('yaw')) * DEG : 0, pitch: (q.has('pitch') ? Number(q.get('pitch')) : 3) * DEG,
  yawTo: null,
  // The glass: water on it, the run of drops, the wiper.
  wet: 0, flow: 0, wipeP: -Math.PI / 2, wipeOn: false, dryT: 30, wipePrev: -0.95,
  // The light the eye adapts to.
  expo: 2.4,
  fade: 0, punching: 0,
  time: 0,
};
fly.catNow = fly.cat;
const A0 = runBearing();
const NOISE = bakeNoise(64);
// The storm and the path round its eye, for the eased category.
function storm(cat) { const s = stormShape(cat); s.Rx = faceExit(s, NOISE, A0); return s; }
let shape = storm(fly.catNow), path = eyePath(shape.Rx);
// The sun: 65 degrees up, on the left of the run in, a little behind.
const SUN = (() => { const e = 65 * DEG, a = A0 + 1.25; return [Math.cos(e) * Math.cos(a), Math.sin(e), Math.cos(e) * Math.sin(a)]; })();
const WIPE_C = -0.55, WIPE_A = 0.9, WIPE_W = 2 * Math.PI / 1.15;

let gl = null, scene = null, raf = 0, timer = 0, visible = true, last = 0, frameNo = 0, calm = reduced();
let cssW = 1, cssH = 1, dpr = 1, started = false, pace = 1, lastInput = 0;
const still = q.has('still');
if (q.has('qa')) globalThis.__hurricane = { fly, get shape() { return shape; }, punch: () => punch(), get loop() { return { raf, timer, pace }; }, get linkMs() { return scene?.linkMs; } };

/* ---------- bar ---------- */
const ui = initPage({ id: ID, bar: {
  actions: [{ verb: 'punch', key: 'Space', onPress: () => punch() }],
  slider: { label: 'Category', min: 1, max: 5, step: 1, value: Math.round(fly.cat), onInput: v => { fly.cat = v; store.set('cat', v); poke(); } },
  quality: true,
  reset: () => { fly.cat = 4; store.set('cat', 4); ui.slider?.set?.(4); punch(); },
  keys: [['drag', 'look'], ['Space', 'punch']],
  help: [
    ['drag', 'Drag to look round the cockpit'],
    ['Space', 'Press Space to fly into the wall again'],
    ['←→', 'Press the arrow keys to look round'],
  ],
} });
const introDone = playIntro({ ready: pageReady() });
const kit = audioKit({ keys: new Set([' ']), sleepMs: 1500 });
const snd = makeSound(kit);

/* ---------- GL ---------- */
const canvas = document.createElement('canvas');
canvas.setAttribute('aria-hidden', 'true');
stage.prepend(canvas);
const D = detail({ maxDpr: 1.5, budget: 1.1e6, steps: 2, settle: 2, onChange: () => resize(true) });

let sizeKey = '';
function resize(force = false) {
  if (!gl || !scene) return;
  const r = stage.getBoundingClientRect();
  cssW = Math.max(1, r.width); cssH = Math.max(1, r.height);
  dpr = D.dpr(cssW, cssH);
  const key = [cssW, cssH, dpr, D.rung].map(v => Math.round(v * 100)).join();
  if (!force && key === sizeKey) return;
  sizeKey = key;
  scene.resize(Math.round(cssW * dpr), Math.round(cssH * dpr), D.rung >= 2 ? 3 : 2);
  draw();
}

/* ---------- acts ---------- */
// Back into the wall: a fade through grey, then the run starts again.
function punch() {
  lastInput = performance.now();
  if (fly.punching > 0) return;
  fly.punching = 1;
  fly.yawTo = 0;
  poke();
}

/* ---------- view ---------- */
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a, b, k = 1) => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];
const scl = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = a => scl(a, 1 / Math.hypot(...a));
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
// Column-major 3x3: m maps local (x right, y up, z back) to world.
const mat = (r, u, b) => [...r, ...u, ...b];
const mul = (m, v) => [m[0] * v[0] + m[3] * v[1] + m[6] * v[2], m[1] * v[0] + m[4] * v[1] + m[7] * v[2], m[2] * v[0] + m[5] * v[1] + m[8] * v[2]];
const tmul = (m, v) => [m[0] * v[0] + m[1] * v[1] + m[2] * v[2], m[3] * v[0] + m[4] * v[1] + m[5] * v[2], m[6] * v[0] + m[7] * v[1] + m[8] * v[2]];
const mm = (a, b) => [...mul(a, b.slice(0, 3)), ...mul(a, b.slice(3, 6)), ...mul(a, b.slice(6, 9))];

// Landscape keeps a 56 degree height; portrait caps the height at about 77 degrees.
function lens() {
  const asp = cssW / cssH;
  const y = Math.max(Math.tan(28 * DEG), Math.min(0.66 / asp, 0.8));
  return [y * asp, y, 0];
}

function view() {
  const P = pose(fly.tau, shape, path, A0);
  const k = calm || still ? 0 : 1;
  const c = chop(fly.tau, shape, k);
  const up0 = [0, 1, 0];
  let f = norm(P.fwd), r = norm(cross(f, up0));
  // Yaw, pitch and roll of the airframe; the nose rides 2 degrees up.
  const cy = Math.cos(c.yaw), sy = Math.sin(c.yaw);
  [f, r] = [norm(add(scl(f, cy), r, -sy)), norm(add(scl(r, cy), f, sy))];
  const p = 2 * DEG + c.pitch;
  let u = add(scl(up0, Math.cos(p)), f, -Math.sin(p));
  f = add(scl(f, Math.cos(p)), up0, Math.sin(p));
  const roll = P.bank + c.roll;
  const u2 = add(scl(u, Math.cos(roll)), r, -Math.sin(roll));
  const r2 = add(scl(r, Math.cos(roll)), u, Math.sin(roll));
  const AC = mat(r2, u2, scl(f, -1));
  // The head inside the cockpit.
  const cY = Math.cos(fly.yaw), sY = Math.sin(fly.yaw), cP = Math.cos(fly.pitch), sP = Math.sin(fly.pitch);
  const hf = [-sY * cP, sP, -cY * cP], hr = [cY, 0, -sY];
  const hb = scl(hf, -1), hu = cross(hb, hr);
  const HEAD = mat(hr, hu, hb);
  const camRot = mm(AC, HEAD);
  const camPos = [P.pos[0], ALT + c.heave, P.pos[2]];
  const L = lens();
  // The flow focus: where the plane flies, on the screen.
  const fc = tmul(camRot, f);
  const foe = fc[2] < -0.05 ? [0.5 + 0.5 * fc[0] / (-fc[2] * L[0]), 0.5 + 0.5 * fc[1] / (-fc[2] * L[1])] : [0.5, 3];
  // Depth into the wall at flight level sets the light round the plane.
  const into = Math.max(0, P.r - shape.Rx);
  const eye = 1 - sstep(-0.05, 0.25, into);
  const grey = 0.16 * Math.exp(-0.6 * into);
  const fl = flashAt(fly.tau);
  const flashPos = fl.at ? add(add(add(camPos, f, fl.at[0]), r2, fl.at[1]), u2, fl.at[2]) : [0, -50, 0];
  const cabin = [grey * 0.9 + eye * 0.85 + fl.k * 0.5, grey + eye * 0.92 + fl.k * 0.55, grey * 1.15 + eye * 1.05 + fl.k * 0.65];
  const sunL = scl([4.3, 4.05, 3.7], eye);
  return {
    camPos, camRot, headRot: HEAD, lens: L, sun: SUN, sunA: tmul(AC, SUN),
    shape: [shape.Rs, shape.lean, shape.top, shape.R0],
    t: fly.tau, time: fly.time,
    rain: rainAt(fly.tau, shape) * (calm ? 0.5 : 1), wind: shape.wind,
    flash: [...flashPos, fl.k * 1.2], flashK: fl.k * (1 - eye) * 0.6,
    foe, shake: c.head,
    wet: fly.wet, flow: fly.flow, dryT: fly.wipeOn ? 0 : fly.dryT,
    wipe: [fly.wipeP, WIPE_W, WIPE_C, WIPE_A],
    wipeNow: [WIPE_C + WIPE_A * Math.sin(fly.wipeP), fly.wipePrev, 0, 0],
    cabin, sunL, exposure: fly.expo, fade: fly.fade,
    eye,
  };
}

// The lightning in the wall: a double pulse that dies in a third of a second.
function flashAt(tau) {
  for (const [t, ah, side, upk] of BOLTS) {
    const x = tau - t;
    if (x < 0 || x > 0.6) continue;
    const k = Math.exp(-x * 16) + 0.7 * Math.exp(-Math.abs(x - 0.13) * 22) * (x > 0.1 ? 1 : 0);
    return { k: k * (calm ? 0.35 : 1), at: [ah, side, upk] };
  }
  return { k: 0, at: null };
}

function draw() {
  if (!scene) return;
  scene.frame(view(), { frameNo: calm ? 0 : frameNo, steps: [70, 96, 120][D.rung >= 2 ? 0 : D.rung >= 1 ? 1 : 2] ?? 96, bloomLevels: D.rung >= 2 ? 3 : 5 });
}

/* ---------- step ---------- */
function step(dt, real) {
  // A held run: reduced motion holds the plane once the eye is open.
  const hold = calm && fly.tau > T_BREAK + 9;
  if (!hold && !still) fly.tau += dt;
  fly.time += dt;
  // The storm eases to a new category over about 3 s.
  if (Math.abs(fly.catNow - fly.cat) > 1e-3) {
    fly.catNow += (fly.cat - fly.catNow) * (1 - Math.exp(-real / 1.0));
    shape = storm(fly.catNow);
    if (Math.abs(shape.Rx - path.R0) > 0.01) path = eyePath(shape.Rx);
  }
  // Rain on the glass, and the wipers that chase it.
  const rain = rainAt(fly.tau, shape);
  fly.wet = rain > fly.wet ? fly.wet + (rain - fly.wet) * (1 - Math.exp(-real / 0.3)) : fly.wet * Math.exp(-real / 2.6);
  fly.flow += real * (0.6 + 4 * fly.wet);
  fly.wipePrev = WIPE_C + WIPE_A * Math.sin(fly.wipeP);
  if (rain > 0.05) { if (!fly.wipeOn) { fly.wipeOn = true; } }
  if (fly.wipeOn) {
    fly.wipeP += real * WIPE_W;
    // Once the rain stops the blade runs on to its rest at the low end.
    if (rain <= 0.05 && Math.sin(fly.wipeP) < -0.995) { fly.wipeOn = false; fly.dryT = 0; }
  } else fly.dryT += real;
  // The eye adapts: slow out of the dark, so the break dazzles.
  const P = pose(fly.tau, shape, path, A0);
  const into = Math.max(0, P.r - shape.Rx);
  const want = 0.8 + 1.6 * sstep(0.0, 0.8, into);
  fly.expo += (want - fly.expo) * (1 - Math.exp(-real / (want < fly.expo ? 2.2 : 0.8)));
  // The head turns back ahead after a punch.
  if (fly.yawTo !== null) {
    fly.yaw += (fly.yawTo - fly.yaw) * (1 - Math.exp(-real / 0.25));
    fly.pitch += (3 * DEG - fly.pitch) * (1 - Math.exp(-real / 0.25));
    if (Math.abs(fly.yaw - fly.yawTo) < 1e-3) fly.yawTo = null;
  }
  // The punch: fade to grey, restart the run, fade back.
  if (fly.punching === 1) {
    fly.fade = Math.min(1, fly.fade + real / 0.45);
    if (fly.fade >= 1) { fly.tau = T_START; fly.expo = 2.4; fly.punching = 2; snd.restart(); }
  } else if (fly.punching === 2) {
    fly.fade = Math.max(0, fly.fade - real / 0.9);
    if (fly.fade <= 0) fly.punching = 0;
  }
  snd.update(fly, shape, rain, calm);
}
// True while the run needs every frame: the wall, the break and the roll in.
const busy = () => fly.tau < T_BREAK + 14 || fly.punching > 0 || fly.yawTo !== null;

/* ---------- frame loop ---------- */
function frame() {
  raf = 0;
  if (!visible || !gl || !started) return;
  const t0 = performance.now();
  const dt = Math.max(0, Math.min(1 / 20, (t0 - last) / 1000));
  last = t0;
  let again = true, lively = true;
  try {
    const idleFor = (t0 - lastInput) / 1000;
    const want = idleFor > 60 ? Math.max(0, 1 - (idleFor - 60) / 2) : 1;
    pace = want < pace ? want : pace + (want - pace) * (1 - Math.exp(-dt / 0.4));
    if (pace < 0.002) pace = 0;
    keysLook(dt);
    step(dt * pace, dt * pace);
    draw();
    D.frame(dt);
    frameNo++;
    lively = (busy() || drag.id !== null || keys.size > 0) && pace > 0;
    again = pace > 0 && !(calm && fly.tau > T_BREAK + 9 && fly.punching === 0 && fly.wet < 0.01 && !fly.wipeOn && drag.id === null && keys.size === 0);
  } finally {
    if (again) schedule(lively ? 0 : t0 + 33 - performance.now()); else rest();
  }
}
function rest() { snd.quiet(); kit.rest(() => !raf && !timer && !snd.busy); }
function schedule(delay = 0) {
  if (raf || timer || !visible || !gl || !started) return;
  if (delay > 4) timer = setTimeout(() => { timer = 0; schedule(); }, delay - 2);
  else raf = requestAnimationFrame(frame);
}
function poke() {
  if (!raf && !timer) last = performance.now();
  if (timer) { clearTimeout(timer); timer = 0; }
  if (pace === 0) pace = 0.01;
  schedule();
}
function halt() { cancelAnimationFrame(raf); raf = 0; clearTimeout(timer); timer = 0; }

/* ---------- looking round: drag, or the arrow keys ---------- */
const drag = { id: null, x: 0, y: 0 };
const YAW_MAX = 70 * DEG, PITCH_MIN = -25 * DEG, PITCH_MAX = 35 * DEG;
function look(dx, dy) {
  fly.yawTo = null;
  fly.yaw = clamp(fly.yaw + dx, -YAW_MAX, YAW_MAX);
  fly.pitch = clamp(fly.pitch + dy, PITCH_MIN, PITCH_MAX);
  lastInput = performance.now();
  if (still || pace === 0) draw();
  poke();
}
stage.addEventListener('pointerdown', e => {
  if (e.button !== 0 || !scene || drag.id !== null || (e.target !== canvas && e.target !== stage)) return;
  try { stage.setPointerCapture(e.pointerId); } catch { /* capture is optional */ }
  Object.assign(drag, { id: e.pointerId, x: e.clientX, y: e.clientY });
  lastInput = performance.now();
  poke();
});
stage.addEventListener('pointermove', e => {
  if (e.pointerId !== drag.id) return;
  // Half a turn across the stage.
  const k = Math.PI / Math.max(cssW, 320) * (calm ? 0.7 : 1);
  look((e.clientX - drag.x) * k, (e.clientY - drag.y) * k);
  drag.x = e.clientX; drag.y = e.clientY;
});
function endDrag(e) { if (e.pointerId !== drag.id) return; drag.id = null; poke(); }
['pointerup', 'pointercancel', 'lostpointercapture'].forEach(t => stage.addEventListener(t, endDrag));
const keys = new Set();
stage.addEventListener('keydown', e => {
  if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return;
  e.preventDefault(); keys.add(e.key); poke();
});
stage.addEventListener('keyup', e => keys.delete(e.key));
window.addEventListener('blur', () => keys.clear());
function keysLook(dt) {
  if (!keys.size) return;
  const s = 1.1 * dt;
  look((keys.has('ArrowLeft') ? s : 0) - (keys.has('ArrowRight') ? s : 0), (keys.has('ArrowUp') ? s : 0) - (keys.has('ArrowDown') ? s : 0));
}

/* ---------- life cycle ---------- */
whenVisible(stage, on => {
  visible = on;
  if (on) { last = performance.now(); schedule(); }
  else { halt(); drag.id = null; keys.clear(); snd.quiet(); }
});
onReducedChange(on => { calm = on; poke(); });
sound.onChange(on => { if (on) poke(); });
new ResizeObserver(() => resize()).observe(stage);
ui.onCover?.(() => resize());

async function setup() {
  gl = canvas.getContext('webgl2', { antialias: false, alpha: false, depth: false, powerPreference: 'high-performance' });
  if (!gl) throw new Error('no webgl2');
  scene = await makeScene(gl, NOISE);
  sizeKey = '';
}
onContextLoss(canvas, {
  lost: () => { halt(); gl = null; scene = null; },
  restored: async () => { await setup(); resize(true); poke(); },
  failed: () => fail.removeAttribute('hidden'),
});

// Warms the glass and the wipers so the first frame is already in rain.
function prewarm() {
  const rain = rainAt(fly.tau, shape);
  fly.wet = rain; fly.wipeOn = rain > 0.05; fly.wipeP = fly.wipeOn ? 0.4 : -Math.PI / 2; fly.flow = 3;
  if (fly.tau > T_BREAK) { fly.expo = 0.8; fly.dryT = 30; }
}

mark('build');
try {
  await setup();
  prewarm();
  resize(true);
  draw();
  gl.finish();
  canvas.classList.add('on');
  mark('first-frame');
  await introDone;
  started = true;
  lastInput = performance.now();
  poke();
} catch (err) {
  console.error(err);
  fail.removeAttribute('hidden');
  ui.hideControls?.();
}
