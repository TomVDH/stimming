// Glowworm cave: blue points on a cave roof, doubled in still water.
// The boat drifts; a drip, a dipped hand or a voice dims the nearest worms.
// Plan: docs/plans/glowworm.md. Toy doc: docs/toys/glowworm.md.
import { initPage, whenVisible, pageReady, stage as mark, reduced, onReducedChange, audioKit, sound } from '../shared/stim.js';
import { intro as playIntro } from '../shared/intro.js';
import { onContextLoss } from '../shared/gl.js';
import { detail } from '../shared/detail.js';
import { makeColony, boatAt, cast } from './cave.js';
import { makeRenderer, MAX_DROPS } from './render.js';
import { makeSound } from './sound.js';
mark('libs');

const ID = 'glowworm';
const stage = document.getElementById('stage');
const fail = stage.querySelector('.fail');
const store = {
  get(k) { try { return localStorage.getItem(`stimming.${ID}.${k}`); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(`stimming.${ID}.${k}`, String(v)); } catch { /* private mode */ } },
};
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const rand = (a, b) => a + Math.random() * (b - a);

/* ---------- state ---------- */
const savedDrift = Number(store.get('drift'));
const st = {
  // Drift: the slider, 0 to 1. pace eases toward it, and to 0 in sleep.
  drift: store.get('drift') !== null && Number.isFinite(savedDrift) ? clamp(savedDrift) : 0.4,
  pace: 0,
  // The path angle of the boat round its loop.
  s: 0.3,
  // Look: the target and the eased value, in radians off the boat's heading.
  yaw: 0.12, pitch: 0.06, yawT: 0.12, pitchT: 0.06,
  // t: the event clock. ta: the ambient clock (breath, sway, swell).
  t: 0, ta: 0, glint: 0,
};
// Dims: six slots. Ripples: eight slots. Drops: four in the air at most.
const dims = Array.from({ length: 6 }, () => ({ p: [0, 0, 0], t0: -99, k: 0, r: 1, v: 1 }));
const rips = Array.from({ length: 8 }, () => ({ x: 0, z: 0, t0: -99, a: 0 }));
const drops = [];
const dropData = new Float32Array(MAX_DROPS * 8);
let lastRip = -99, lastDim = -99;
// The cave drips by itself now and then, while the boat drifts.
let nextDrip = 9;

let gl = null, R = null, colony = null, raf = 0, timer = 0, visible = true, last = 0, frameNo = 0, calm = reduced();
let cssW = 1, cssH = 1, dpr = 1, started = false, lastInput = 0;
const cam = { eye: [0, 0.85, 0], F: [0, 0, 1], R: [1, 0, 0], U: [0, 1, 0], tanX: 0.9, tanY: 0.55 };
if (new URLSearchParams(location.search).has('qa')) globalThis.__gw = { st, cam, dims, rips, drops, drip: () => dripRandom(), voice: () => voice(), tap: (x, y) => tapAt(x, y), draw: () => draw(), get loop() { return { raf, timer, busy: busy(), lively: lively() }; } };

/* ---------- bar ---------- */
const ui = initPage({ id: ID, bar: {
  actions: [
    { verb: 'drip', key: 'Space', onPress: () => dripRandom() },
    { verb: 'voice', key: 'V', onPress: () => voice() },
  ],
  slider: { label: 'Drift', min: 0, max: 100, step: 1, value: Math.round(st.drift * 100), onInput: v => setDrift(v / 100) },
  quality: true,
  keys: [['click', 'dip'], ['drag', 'look'], ['arrows', 'look']],
  help: [
    ['click', 'Tap the water to dip a hand; tap the roof to let a drop fall'],
    ['drag', 'Drag to look round the cave'],
    ['Space', 'Press Space to let a drop fall from the roof'],
    ['V', 'Press V to speak; the nearest worms dim, then glow again'],
  ],
} });
const introDone = playIntro({ ready: pageReady() });
const kit = audioKit({ keys: new Set([' ', 'v', 'V', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']), sleepMs: 1500 });
const snd = makeSound(kit);

/* ---------- GL ---------- */
const canvas = document.createElement('canvas');
canvas.setAttribute('aria-hidden', 'true');
stage.prepend(canvas);
const D = detail({ maxDpr: 2, budget: 2.4e6, steps: 2, settle: 2, onChange: () => resize(true) });

let sizeKey = '';
function resize(force = false) {
  if (!gl || !R) return;
  const r = stage.getBoundingClientRect();
  cssW = Math.max(1, r.width); cssH = Math.max(1, r.height);
  dpr = D.dpr(cssW, cssH);
  const key = [cssW, cssH, dpr, D.rung].map(v => Math.round(v * 100)).join();
  if (!force && key === sizeKey) return;
  sizeKey = key;
  // The lens: wide on a landscape stage; a portrait stage looks further up.
  const asp = cssW / cssH;
  if (asp >= 1) { cam.tanY = 0.56; cam.tanX = cam.tanY * asp; }
  else { cam.tanX = 0.52; cam.tanY = Math.min(1.25, cam.tanX / asp); }
  R.resize(Math.round(cssW * dpr), Math.round(cssH * dpr), D.rung >= 2 ? 0.34 : 0.5);
  draw();
}

/* ---------- the camera ---------- */
function place() {
  const b = boatAt(st.s);
  // The boat bobs a centimetre and pitches a little as it drifts.
  const bob = calm ? 0 : Math.sin(st.ta * 0.9) * 0.006, nod = calm ? 0 : Math.sin(st.ta * 0.7 + 1) * 0.004;
  const yaw = b.heading + st.yaw, pitch = st.pitch + nod;
  const cp = Math.cos(pitch);
  cam.eye = [b.x, 0.85 + bob, b.z];
  cam.F = [Math.sin(yaw) * cp, Math.sin(pitch), Math.cos(yaw) * cp];
  cam.R = [Math.cos(yaw), 0, -Math.sin(yaw)];
  const [f, r] = [cam.F, cam.R];
  cam.U = [f[1] * r[2] - f[2] * r[1], f[2] * r[0] - f[0] * r[2], f[0] * r[1] - f[1] * r[0]];
}
// The ray through a stage point, in CSS pixels.
function rayAt(x, y) {
  const sx = (x / cssW) * 2 - 1, sy = 1 - (y / cssH) * 2;
  const d = [0, 1, 2].map(i => cam.F[i] + cam.R[i] * sx * cam.tanX + cam.U[i] * sy * cam.tanY);
  const l = Math.hypot(...d);
  return d.map(v => v / l);
}
// Where a world point sits left or right, for the sound's pan.
function panOf(p) {
  const v = [p[0] - cam.eye[0], p[1] - cam.eye[1], p[2] - cam.eye[2]];
  const z = v[0] * cam.F[0] + v[1] * cam.F[1] + v[2] * cam.F[2];
  const x = v[0] * cam.R[0] + v[2] * cam.R[2];
  return clamp(x / Math.max(0.6, Math.abs(z)) * 0.7, -0.9, 0.9);
}
const distOf = p => Math.hypot(p[0] - cam.eye[0], p[1] - cam.eye[1], p[2] - cam.eye[2]);

/* ---------- events ---------- */
function oldest(list, key) { return list.reduce((a, b) => (b[key] < a[key] ? b : a)); }
// A sound at p dims the worms within about r metres; the wave runs at v m/s.
function dim(p, k, r, v) {
  const d = oldest(dims, 't0');
  Object.assign(d, { p, t0: st.t, k, r, v });
  lastDim = st.t;
}
function ripple(x, z, a) {
  const q = oldest(rips, 't0');
  Object.assign(q, { x, z, t0: st.t, a: calm ? a * 0.5 : a });
  lastRip = st.t;
}
// A drop leaves the rock at p and falls to the water.
function dropFrom(p, wakeUp = true) {
  if (drops.length >= MAX_DROPS) drops.shift();
  drops.push({ x: p[0], y: p[1] - 0.02, z: p[2], vy: 0, y0: p[1], seed: Math.random() });
  snd.detach(panOf(p));
  if (wakeUp) poke();
}
function dripRandom(wakeUp = true) {
  // A random point of roof in view, within 14 m.
  for (let i = 0; i < 16; i++) {
    const hit = cast(cam.eye, rayAt(rand(0.15, 0.85) * cssW, rand(0.05, 0.4) * cssH), 14);
    if (hit && hit.kind === 'rock' && hit.p[1] > 1.4) { dropFrom(hit.p, wakeUp); return; }
  }
  if (wakeUp) poke();
}
function voice() {
  snd.voice();
  // The voice wave leaves the boat; the nearest worms dim first.
  dim([cam.eye[0], cam.eye[1], cam.eye[2]], 0.97, 16, 6);
  poke();
}
function tapAt(x, y) {
  const hit = cast(cam.eye, rayAt(x, y), 60);
  if (!hit) return;
  if (hit.kind === 'rock') { dropFrom(hit.p); return; }
  const [wx, , wz] = hit.p;
  const near = hit.t < 2.6;
  // Near: a hand dips in. Far: the hand flicks a few drops there.
  if (near) {
    ripple(wx, wz, 0.005);
    setTimeout(() => ripple(wx + rand(-0.06, 0.06), wz + rand(-0.06, 0.06), 0.002), 260);
  } else {
    for (let i = 0; i < 3; i++) ripple(wx + rand(-0.25, 0.25), wz + rand(-0.25, 0.25), rand(0.0018, 0.003));
  }
  snd.dip(panOf(hit.p), near, hit.t);
  dim([wx, 1.6, wz], near ? 0.92 : 0.8, near ? 5.5 : 4.5, 6);
  poke();
}
function setDrift(v) {
  st.drift = clamp(v);
  store.set('drift', st.drift.toFixed(2));
  poke();
}

/* ---------- frame state ---------- */
function state() {
  const ev = new Float32Array(24), evK = new Float32Array(24);
  dims.forEach((d, i) => { ev.set([...d.p, d.t0], i * 4); evK.set([d.k, d.r, d.v, 0], i * 4); });
  const rip = new Float32Array(32);
  rips.forEach((q, i) => rip.set([q.x, q.z, q.t0, q.a], i * 4));
  return {
    ...cam, t: st.t, ta: st.ta, glint: st.glint, ev, evK, rip,
    steps: D.rung >= 2 ? 64 : 96,
    threadCount: D.rung >= 2 ? (colony?.threadCount ?? 0) >> 1 : (colony?.threadCount ?? 0),
    dropCount: drops.length,
    bloomLevels: D.rung >= 2 ? 3 : 5,
    rockLight: 1, gain: 0.7, thrGain: 0.3, dropGain: 4,
    sway: calm ? 0 : 1, still: calm ? 0 : 0.0045 * (0.5 + st.pace), refl: 1.8,
    bloomK: 0.55, expo: 1.4, frameNo,
  };
}
function draw() { if (R) { place(); R.frame(state()); } }

/* ---------- frame loop ---------- */
const lively = () => drops.length > 0 || pointer.id !== null || st.t - lastRip < 6 || Math.abs(st.yawT - st.yaw) + Math.abs(st.pitchT - st.pitch) > 0.002;
// A dim takes about 30 s to clear; the loop runs on until it has.
const busy = () => lively() || st.pace > 0.001 || st.t - lastDim < 30;
function frame(now) {
  raf = 0;
  if (!visible || !gl || !started) return;
  const t0 = performance.now();
  const dt = Math.max(0, Math.min(1 / 15, (now - last) / 1000));
  last = Math.max(last, now);
  let again = false, fast = false;
  try {
    const idleFor = (t0 - lastInput) / 1000;
    // Ambient drift stops 60 s after the last input, over 2 s.
    const wake = calm ? 0 : idleFor > 60 ? Math.max(0, 1 - (idleFor - 60) / 2) : 1;
    const goal = st.drift * wake;
    st.pace += (goal - st.pace) * (1 - Math.exp(-dt / 1.5));
    if (st.pace < 0.002 && goal === 0) st.pace = 0;
    // The boat: 0.3 m/s at full drift.
    const b = boatAt(st.s);
    st.s += st.pace * 0.3 * dt / b.speedPerS;
    st.t += dt;
    st.ta += dt * (calm ? 0 : Math.max(st.pace > 0 ? 1 : 0, wake));
    st.glint += dt * st.pace * 0.6;
    // Look eases to its target.
    const k = 1 - Math.exp(-dt / 0.12);
    st.yaw += (st.yawT - st.yaw) * k;
    st.pitch += (st.pitchT - st.pitch) * k;
    // Auto drips stop 25 s after input, so their dims clear before sleep.
    if (idleFor < 25 && st.pace > 0.01 && st.t > nextDrip) { nextDrip = st.t + rand(14, 30); dripRandom(false); }
    stepDrops(dt);
    snd.frame(dt, st.pace);
    draw();
    D.frame(dt);
    frameNo++;
    fast = lively();
    again = busy() || wake > 0 && st.drift > 0 && !calm;
  } finally {
    // A thrown error still leaves the loop able to wake.
    // Drifting frames hold to about 30 fps.
    if (again) schedule(fast ? 0 : t0 + 33 - performance.now()); else rest();
  }
}
// Drops fall under gravity; each lands with a ripple, a plink and a dim.
function stepDrops(dt) {
  dropData.fill(0);
  for (let i = drops.length - 1; i >= 0; i--) {
    const d = drops[i];
    d.vy -= 9.81 * dt;
    d.y += d.vy * dt;
    if (d.y <= 0) {
      drops.splice(i, 1);
      ripple(d.x, d.z, 0.0026);
      snd.plink(panOf([d.x, 0, d.z]), distOf([d.x, 0, d.z]), d.y0);
      dim([d.x, Math.min(d.y0, 2.4), d.z], 0.8, 4.5, 6);
    }
  }
  drops.forEach((d, i) => {
    // A streak of 25 ms of fall.
    const L = Math.max(0.012, -d.vy * 0.025);
    dropData.set([d.x, d.y + L, d.z, L, 0, d.seed, 1, 0], i * 8);
  });
  if (R) R.setDrops(dropData);
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
  // Input cuts a drifting wait short.
  if (timer) { clearTimeout(timer); timer = 0; }
  schedule();
}
function halt() { cancelAnimationFrame(raf); raf = 0; clearTimeout(timer); timer = 0; }

/* ---------- pointer: tap dips or drips, drag looks round ---------- */
const pointer = { id: null, x0: 0, y0: 0, yaw0: 0, pitch0: 0, drag: false };
const local = e => { const r = stage.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
stage.addEventListener('pointerdown', e => {
  if (e.button !== 0 || !R || pointer.id !== null || (e.target !== canvas && e.target !== stage)) return;
  try { stage.setPointerCapture(e.pointerId); } catch { /* capture is optional */ }
  const [x, y] = local(e);
  Object.assign(pointer, { id: e.pointerId, x0: x, y0: y, yaw0: st.yawT, pitch0: st.pitchT, drag: false });
  poke();
});
stage.addEventListener('pointermove', e => {
  if (e.pointerId !== pointer.id) return;
  const [x, y] = local(e);
  if (!pointer.drag && Math.hypot(x - pointer.x0, y - pointer.y0) > 8) pointer.drag = true;
  if (!pointer.drag) return;
  // The view follows the hand: a full stage width turns by the lens's width.
  const kx = 2 * cam.tanX / cssW, ky = 2 * cam.tanY / cssH;
  st.yawT = clamp(pointer.yaw0 - (x - pointer.x0) * kx, -1.6, 1.6);
  st.pitchT = clamp(pointer.pitch0 + (y - pointer.y0) * ky, -0.12, 0.8);
  poke();
});
function endPointer(e) {
  if (e.pointerId !== pointer.id) return;
  const tap = !pointer.drag && e.type === 'pointerup';
  pointer.id = null;
  if (tap) tapAt(pointer.x0, pointer.y0);
  poke();
}
['pointerup', 'pointercancel', 'lostpointercapture'].forEach(t => stage.addEventListener(t, endPointer));
stage.addEventListener('keydown', e => {
  const step = { ArrowLeft: [0.12, 0], ArrowRight: [-0.12, 0], ArrowUp: [0, 0.08], ArrowDown: [0, -0.08] }[e.key];
  if (!step || e.altKey || e.ctrlKey || e.metaKey) return;
  e.preventDefault();
  st.yawT = clamp(st.yawT + step[0], -1.6, 1.6);
  st.pitchT = clamp(st.pitchT + step[1], -0.12, 0.8);
  poke();
});

/* ---------- life cycle ---------- */
whenVisible(stage, on => {
  visible = on;
  if (on) { last = performance.now(); schedule(); }
  else { halt(); snd.quiet(); }
});
onReducedChange(on => { calm = on; draw(); poke(); });
sound.onChange(on => { if (on) poke(); });
new ResizeObserver(() => resize()).observe(stage);

async function setup() {
  gl = canvas.getContext('webgl2', { antialias: false, alpha: false, depth: false, powerPreference: 'high-performance' });
  if (!gl) throw new Error('no webgl2');
  colony ??= makeColony();
  R = await makeRenderer(gl, colony);
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
