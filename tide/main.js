// Glowing tide: bioluminescent surf on a dark beach at night.
// Waves break with a blue lip; a touch stirs water and wet sand into blue sparks.
import { initPage, whenVisible, pageReady, stage as mark, reduced, onReducedChange, audioKit, sound } from '../shared/stim.js';
import { intro as playIntro } from '../shared/intro.js';
import { onContextLoss } from '../shared/gl.js';
import { detail } from '../shared/detail.js';
import { makeCamera, makeSurf, SHORE, CAM_H } from './waves.js';
import { makeScene } from './scene.js';
import { makeSound } from './sound.js';
mark('libs');

const ID = 'tide';
const stage = document.getElementById('stage');
const fail = stage.querySelector('.fail');
const store = {
  get(k) { try { return localStorage.getItem(`stimming.${ID}.${k}`); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(`stimming.${ID}.${k}`, String(v)); } catch { /* private mode */ } },
};
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

/* ---------- state ---------- */
// The stir fades over seconds, as the plankton's flashes die out.
const STIR_TAU = 2.4;
// Stir radius in metres: wide in the water, a foot on the sand.
const R_SEA = 0.45, R_SAND = 0.3;
const savedSwell = Number(store.get('swell'));
const surf = makeSurf();
surf.swell = clamp(Number.isFinite(savedSwell) && store.get('swell') !== null ? savedSwell : 0.5, 0, 1);
const cam = makeCamera();
let gl = null, scene = null, raf = 0, timer = 0, visible = true, last = 0, frameNo = 0, calm = reduced();
let cssW = 1, cssH = 1, dpr = 1, started = false;
let simT = 0, pace = 1, lastInput = 0, stirE = 0;
let splats = [];
// ?qa hands the state to a test script.
if (new URLSearchParams(location.search).has('qa')) globalThis.__tide = { get waves() { return surf.waves; }, get stir() { return stirE; }, get pace() { return pace; }, cam, stirAt: (x, y, e) => { splatAt(x, y, e); poke(); } };

/* ---------- bar ---------- */
const ui = initPage({ id: ID, bar: {
  actions: [
    { verb: 'wave', key: 'Space', onPress: () => { sendWave(); poke(); } },
  ],
  slider: { label: 'Swell', min: 0, max: 100, step: 1, value: Math.round(surf.swell * 100), onInput: v => { surf.swell = v / 100; store.set('swell', v / 100); poke(); } },
  quality: true,
  keys: [['drag', 'stir']],
  help: [
    ['drag', 'Drag through the water or the sand to stir up the glow'],
    ['click', 'Tap to light one splash'],
    ['Space', 'Press Space to send a big wave in'],
  ],
} });
const introDone = playIntro({ ready: pageReady() });
const kit = audioKit({ keys: new Set([' ']), sleepMs: 1500 });
const snd = makeSound(kit);

/* ---------- GL ---------- */
const canvas = document.createElement('canvas');
canvas.setAttribute('aria-hidden', 'true');
stage.prepend(canvas);
const D = detail({ maxDpr: 2, budget: 2.2e6, steps: 2, settle: 2, onChange: () => resize(true) });

let sizeKey = '';
function resize(force = false) {
  if (!gl || !scene) return;
  const r = stage.getBoundingClientRect();
  cssW = Math.max(1, r.width); cssH = Math.max(1, r.height);
  dpr = D.dpr(cssW, cssH);
  const c = ui.cover?.() || { top: 0, bottom: 0 };
  const key = [cssW, cssH, dpr, c.top || 0, c.bottom || 0].map(v => Math.round(v * 100)).join();
  if (!force && key === sizeKey) return;
  sizeKey = key;
  scene.resize(Math.round(cssW * dpr), Math.round(cssH * dpr));
  cam.fit(cssW, cssH, c.top || 0, c.bottom || 0);
  draw();
}

/* ---------- stir ---------- */
// A splat at a stage point, in CSS pixels. Returns the ground hit or null.
function splatAt(x, y, e) {
  const g = cam.ground(x, y);
  if (!g) return null;
  const sea = g.z > SHORE + 0.3;
  const rx = (sea ? R_SEA : R_SAND) * cam.scale(g.t) * dpr;
  // The ground squashes a splat; the sea's churn keeps some height.
  const ry = rx * Math.max(sea ? 0.35 : 0.2, g.fall * 1.8);
  const k = calm ? 0.6 : 1;
  splats.push({ x: x * dpr, y: (cssH - y) * dpr, rx, ry, e: e * k });
  // The estimate tracks the brightest spot; the map caps at 4.
  stirE = Math.min(4, stirE + e * k);
  return { ...g, sea };
}
const panOf = x => clamp((x / cssW) * 2 - 1, -1, 1);

/* ---------- waves ---------- */
const events = {
  crash: w => { if (started) snd.crash(clamp(w.x0 / 7, -1, 1), w.A); },
  swash: w => { if (started) snd.swash(clamp(w.x0 / 7, -1, 1), w.A); },
};
function sendWave() {
  surf.send();
  // The answer within a frame: the surf bed swells.
  snd.surf(1);
}
function surfLevel() {
  let l = 0;
  for (const w of surf.waves) if (w.tb >= 0) l += Math.exp(-w.tb / 3) * w.A;
  return clamp(l / 1.6, 0, 1);
}

function view() {
  const n = surf.pack();
  return { pitch: cam.pitch, tanX: cam.tanX, tanY: cam.tanY, time: simT, shore: SHORE, UA: surf.UA, UB: surf.UB, n, wet: 4.2 };
}
function draw() {
  if (!scene) return;
  scene.frame(view(), { frameNo: calm ? 0 : frameNo, bloomLevels: D.rung >= 2 ? 3 : 5 });
}

/* ---------- frame loop ---------- */
// Lively while a hand stirs or a stir glows; drifting at 30 fps with the surf; asleep after 60 s idle.
function frame(now) {
  raf = 0;
  if (!visible || !gl || !started) return;
  // The rAF stamp can run well behind the clock, so the pace reads the clock.
  const t0 = performance.now();
  const dt = Math.max(0, Math.min(1 / 15, (t0 - last) / 1000));
  last = t0;
  let again = true, lively = true;
  try {
    const idleFor = (t0 - lastInput) / 1000;
    // Past 60 s idle the surf slows to a stop over 2 s.
    const want = calm ? 0 : idleFor > 60 ? Math.max(0, 1 - (idleFor - 60) / 2) : 1;
    pace = want < pace ? want : pace + (want - pace) * (1 - Math.exp(-dt / 0.4));
    if (pace < 0.002) pace = 0;
    const sdt = dt * pace;
    simT += sdt;
    if (sdt > 0) surf.step(sdt, events);
    if (pointer.id !== null && !pointer.moved) {
      // A resting hand keeps the water around it stirred.
      splatAt(pointer.x, pointer.y, 2.2 * dt);
    }
    scene.stir(dt, STIR_TAU, splats);
    splats = splats.length > 16 ? splats.slice(16) : [];
    stirE *= Math.exp(-dt / STIR_TAU);
    if (stirE < 0.04) stirE = 0;
    snd.surf(surfLevel() * pace);
    draw();
    D.frame(dt);
    frameNo++;
    const held = pointer.id !== null;
    // A fading stir only drifts; the hand or fresh input runs at full rate.
    lively = held || t0 - lastInput < 1500 || splats.length > 0;
    again = pace > 0 || stirE > 0 || held || splats.length > 0;
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

/* ---------- pointer: a press splashes, a drag stirs, a hold keeps stirring ---------- */
const pointer = { id: null, x: 0, y: 0, x0: 0, y0: 0, t: 0, moved: false, lastT: 0 };
const local = e => { const r = stage.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
stage.addEventListener('pointerdown', e => {
  if (e.button !== 0 || !scene || pointer.id !== null || (e.target !== canvas && e.target !== stage)) return;
  try { stage.setPointerCapture(e.pointerId); } catch { /* capture is optional */ }
  const [x, y] = local(e);
  Object.assign(pointer, { id: e.pointerId, x, y, x0: x, y0: y, t: performance.now(), moved: false, lastT: performance.now() });
  const g = splatAt(x, y, 1.6);
  if (g) {
    snd.stir(0.5, panOf(x), g.sea);
    for (let i = 0; i < 3; i++) snd.glint(panOf(x), g.sea ? 0.7 : 1);
  }
  poke();
});
stage.addEventListener('pointermove', e => {
  if (e.pointerId !== pointer.id) return;
  const [x, y] = local(e);
  const now = performance.now();
  const d = Math.hypot(x - pointer.x, y - pointer.y);
  if (!pointer.moved && Math.hypot(x - pointer.x0, y - pointer.y0) > 8) pointer.moved = true;
  const v = d / Math.max(0.008, (now - pointer.lastT) / 1000);
  // Splats along the path, so a fast stroke leaves no gaps.
  const g0 = cam.ground(x, y);
  const step = g0 ? Math.max(4, (g0.z > SHORE ? R_SEA : R_SAND) * cam.scale(g0.t) * 0.6) : 12;
  const n = Math.min(8, Math.ceil(d / step));
  const e1 = 0.25 + 0.8 * Math.min(1, v / 900);
  let g = null;
  for (let i = 1; i <= n; i++) {
    const k = i / n;
    g = splatAt(pointer.x + (x - pointer.x) * k, pointer.y + (y - pointer.y) * k, e1 / Math.sqrt(n)) || g;
  }
  if (g) {
    snd.stir(Math.min(1, v / 1200), panOf(x), g.sea);
    if (Math.random() < Math.min(0.6, v / 2500)) snd.glint(panOf(x), g.sea ? 0.6 : 1);
  }
  pointer.x = x; pointer.y = y; pointer.lastT = now;
  poke();
});
function endPointer(e) {
  if (e.pointerId !== pointer.id) return;
  pointer.id = null;
  snd.lift();
  poke();
}
['pointerup', 'pointercancel', 'lostpointercapture'].forEach(t => stage.addEventListener(t, endPointer));

/* ---------- life cycle ---------- */
whenVisible(stage, on => {
  visible = on;
  if (on) { last = performance.now(); schedule(); }
  else { halt(); pointer.id = null; snd.quiet(); }
});
onReducedChange(on => { calm = on; poke(); });
sound.onChange(on => { if (on) poke(); });
new ResizeObserver(() => resize()).observe(stage);
ui.onCover?.(() => resize());

async function setup() {
  gl = canvas.getContext('webgl2', { antialias: false, alpha: false, depth: false, powerPreference: 'high-performance' });
  if (!gl) throw new Error('no webgl2');
  scene = await makeScene(gl);
  sizeKey = '';
}
onContextLoss(canvas, {
  lost: () => { halt(); gl = null; scene = null; },
  restored: async () => { await setup(); resize(true); poke(); },
  failed: () => fail.removeAttribute('hidden'),
});

// The first frame is a picture: a wave mid-break, footprints still glinting.
function prewarm() {
  const dt = 1 / 30;
  for (let i = 0; i < 30 * 40; i++) { simT += dt; surf.step(dt); }
  // Runs on to a fresh break in the middle of the view.
  for (let i = 0; i < 30 * 40; i++) {
    if (surf.waves.some(w => w.tb > 0.7 && w.tb < 1.1 && Math.abs(w.x0) < 3)) break;
    simT += dt; surf.step(dt);
  }
  // A line of footprints walks down to the water; the newest glow most.
  for (let i = 0; i < 7; i++) {
    const z = 4.9 + i * 0.5, x = -1.6 + i * 0.32 + (i % 2 ? 0.14 : -0.14);
    const p = project(x, z);
    if (p) splatAt(p[0], p[1], 0.25 + 0.16 * i);
  }
  scene.stir(0, STIR_TAU, splats);
  splats = [];
}
// A beach point to stage CSS pixels.
function project(x, z) {
  const p = cam.pitch, c = Math.cos(p), s = Math.sin(p);
  const d = [x, -CAM_H, z];
  const f = d[1] * -s + d[2] * c, u = d[1] * c + d[2] * s;
  if (f <= 0) return null;
  const sx = d[0] / f / cam.tanX, sy = u / f / cam.tanY;
  return [(sx + 1) / 2 * cssW, (1 - sy) / 2 * cssH];
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
  // The intro's end is no input: the surf starts out drifting.
  lastInput = performance.now() - 1500;
} catch (err) {
  console.error(err);
  fail.removeAttribute('hidden');
  ui.hideControls?.();
}
