// Desert eclipse: drag the moon over the sun above a salt pan.
// The light, colour and heat of the scene follow the sunlight that passes.
import { initPage, whenVisible, pageReady, stage as mark, reduced, onReducedChange, audioKit, sound } from '../shared/stim.js';
import { intro as playIntro } from '../shared/intro.js';
import { onContextLoss } from '../shared/gl.js';
import { detail } from '../shared/detail.js';
import { makeRenderer } from './render.js';
import { makeSound } from './sound.js';
import { K, flux } from './disc.js';
mark('libs');

const ID = 'eclipse';
const stage = document.getElementById('stage');
const fail = stage.querySelector('.fail');
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

/* ---------- the moon's path ---------- */
// The moon runs from lower right to upper left, a little off centre.
const PATH = (() => { const l = Math.hypot(1, -0.32); return [1 / l, -0.32 / l]; })();
const ACROSS = [-PATH[1], PATH[0]];
const SPAN = 3.2;
// The umbra's radius on the ground, in km.
const RU = 55;
const toPath = (x, y) => [x * PATH[0] + y * PATH[1], x * ACROSS[0] + y * ACROSS[1]];
const fromPath = (a, c) => [a * PATH[0] + c * ACROSS[0], a * PATH[1] + c * ACROSS[1]];
const sliderOf = a => clamp(0.5 - a / (2 * SPAN), 0, 1);

/* ---------- state ---------- */
// d: the moon's offset from the sun, in sun radii; y points up.
let d = fromPath(1.45, 0.12);
let fx = flux(d[0], d[1]), fKey = '';
let adapt = Math.max(0.04, fx.F), heat = fx.F, tot = 0, ringK = 0, wasRing = false, lastSide = 1;
let lastU = [1, 0], glide = null, t = 10, speed = 1;
let gl = null, R = null, raf = 0, timer = 0, visible = true, last = 0, frameNo = 0, calm = reduced();
let cssW = 1, cssH = 1, dpr = 1, started = false, lastInput = 0;
let lens = { tanW: 0.49, hz: 0.3, asp: 1.6, sun: [0.06, 0.2], rs: 0.03, rsPx: 40 };

/* ---------- bar ---------- */
const ui = initPage({ id: ID, bar: {
  actions: [
    { verb: 'totality', key: 'Space', onPress: () => glideOn() },
  ],
  slider: { label: 'Moon', min: 0, max: 1, step: 0.002, value: sliderOf(toPath(...d)[0]), onInput: v => setAlong(v) },
  quality: true,
  keys: [['drag', 'move the moon'], ['click', 'totality']],
  help: [
    ['drag', 'Drag to move the moon over the sun'],
    ['click', 'Tap to glide into totality, or on out'],
    ['Space', 'Press Space to glide'],
  ],
} });
const introDone = playIntro({ ready: pageReady() });
const kit = audioKit({ keys: new Set([' ']), sleepMs: 1500 });
const snd = makeSound(kit);

/* ---------- GL ---------- */
const canvas = document.createElement('canvas');
canvas.setAttribute('aria-hidden', 'true');
stage.prepend(canvas);
const D = detail({ maxDpr: 2, budget: 2.4e6, steps: 2, settle: 2, onChange: () => resize(true) });

// The lens: about 52 degrees across; a portrait stage keeps the sun big.
function fitLens() {
  const asp = cssW / cssH;
  const tanW = asp >= 1 ? 0.49 : clamp(0.49 * asp * 1.3, 0.24, 0.49), hz = asp >= 1 ? 0.3 : 0.32;
  const rsPx = 0.05 * Math.min(cssH, cssW * 1.6);
  const vy = 2 * tanW / asp;
  lens = { tanW, hz, asp, sun: [0.12 * tanW, (0.64 - hz) * vy], rs: rsPx * 2 * tanW / cssW, rsPx };
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
  fitLens();
  R.resize(Math.round(cssW * dpr), Math.round(cssH * dpr));
  draw();
}

/* ---------- the moon ---------- */
function setD(x, y) {
  let [a, c] = toPath(x, y);
  a = clamp(a, -SPAN, SPAN); c = clamp(c, -2, 2);
  d = fromPath(a, c);
  if (Math.abs(a) > 0.3) lastSide = Math.sign(a);
  ui.slider?.set(sliderOf(a), false);
}
function setAlong(v) {
  glide = null;
  const [, c] = toPath(...d);
  setD(...fromPath((0.5 - v) * 2 * SPAN, c));
  poke();
}
// The glide: into totality, or out the far side.
function glideOn() {
  const inTot = Math.hypot(...d) < 0.03;
  const to = inTot ? fromPath(-lastSide * 1.5, 0) : [0, 0];
  glide = { to, age: 0 };
  poke();
}
// Glide speed in sun radii a second: slow through the contacts, as in life.
const glideV = r => 0.022 + 0.05 * (1 - smooth(0.05, 0.085, r)) + 1.6 * smooth(0.09, 0.7, r);
function glideStep(dt) {
  glide.age += dt;
  const gx = glide.to[0] - d[0], gy = glide.to[1] - d[1], gd = Math.hypot(gx, gy);
  const v = glideV(Math.hypot(...d)) * (0.05 + smooth(0, 0.5, glide.age)) * (calm ? 2.5 : 1);
  if (gd <= v * dt) { setD(...glide.to); glide = null; return; }
  setD(d[0] + gx / gd * v * dt, d[1] + gy / gd * v * dt);
}

/* ---------- the light ---------- */
// Seats of the stars and planets, in view tangents from the sun.
const STARS = (() => {
  let s = 7;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  // Venus, Jupiter and Mercury first: x, y, brightness, size in px.
  const list = [[-0.27, -0.1, 0.9, 1.5], [0.29, 0.13, 0.35, 1.3], [0.1, -0.07, 0.08, 1.25]];
  while (list.length < 24) list.push([rnd() * 1.1 - 0.6, rnd() * 0.45 - 0.12, 0.03 + 0.12 * rnd() ** 3, 0.85]);
  return list;
})();

function state() {
  const F = fx.F, S = lens.sun;
  const M = adapt ** -0.75;
  const g = 1 - smooth(0, 0.003, F);
  const dl = Math.hypot(...d);
  // The afternoon sun stands in the west, where the shadow comes from.
  // Before mid-eclipse the umbra lies ahead; after it, behind.
  const [pa, pc] = toPath(d[0], d[1]);
  const ux = 0.35 * pa + 0.6 * pc, ul = Math.hypot(ux, pa);
  // At the centre the shadow keeps its last heading.
  if (ul > 1e-4) lastU = [ux / ul, pa / ul];
  const u = lastU, Dk = dl / (K - 1) * RU;
  const sl = Math.hypot(S[0], S[1], 1);
  // The light source on screen: the bright crescent, or the last bead.
  const beadW = 1 - smooth(0.004, 0.03, F);
  const lx = S[0] + lens.rs * (fx.cx + (fx.bx - fx.cx) * beadW), ly = S[1] + lens.rs * (fx.cy + (fx.by - fx.cy) * beadW);
  const vy = 2 * lens.tanW / lens.asp;
  return {
    ...lens, t, calm, frameNo, k: K, F,
    d,
    umb: [u[0] * Dk, u[1] * Dk, RU],
    sunDir: [S[0] / sl, S[1] / sl, 1 / sl],
    lightDir: [lx / Math.hypot(lx, ly, 1), ly / Math.hypot(lx, ly, 1), 1 / Math.hypot(lx, ly, 1)],
    lean: [S[0] / Math.hypot(S[0], 1) / S[1], 1 / Math.hypot(S[0], 1) / S[1]],
    amb: 0.011,
    glow: 9 * (1 - smooth(0, 0.002, F)),
    stars: (1 - smooth(0, 0.004, F)) * 0.1,
    starList: STARS.flatMap(([x, y, b, w]) => [S[0] + x, S[1] + y, b, w]),
    heat,
    bands: 0.42 * smooth(0, 0.0012, F) * (1 - smooth(0.004, 0.03, F)),
    bandDir: u,
    // The eye never takes the crescent at full strength.
    sunI: Math.min(9, 22 / (0.8 * M)),
    // The bead outshines the inner corona while it lasts.
    cor: 0.26 * g * (1 - 0.55 * ringK),
    chr: 1 - smooth(0, 0.0008, F),
    hint: Math.max(0.05 + 0.05 * (pointer.id !== null ? 1 : 0), 0.9 * g),
    expo: 0.8 * M,
    cool: clamp((1 - F ** 0.35) * 0.7 + (1 - heat) * 0.3, 0, 1) * 0.85,
    flare: Math.min(F, 1) * 0.5,
    ring: ringK * 0.22,
    src: [lx / lens.tanW * 0.5 + 0.5, ly / vy + lens.hz],
    moon: [(S[0] + d[0] * lens.rs) / lens.tanW * 0.5 + 0.5, (S[1] + d[1] * lens.rs) / vy + lens.hz, K * lens.rs / vy, g],
    bloomK: 0.22 + 0.3 * (1 - smooth(0, 0.05, F)),
    bloomLevels: D.rung >= 2 ? 4 : 6,
  };
}
function draw() { if (R) R.frame(state()); }

/* ---------- frame loop ---------- */
// Lively while the moon moves or the light settles; drifting at 30 fps; asleep after 60 s.
function frame(now) {
  raf = 0;
  if (!visible || !gl || !started) return;
  const t0 = performance.now();
  const dt = Math.max(0, Math.min(1 / 15, (now - last) / 1000));
  last = Math.max(last, now);
  let again = true, lively = true;
  try {
    const idleFor = (t0 - lastInput) / 1000;
    if (glide) glideStep(dt);
    const key = d.map(v => v.toFixed(5)).join();
    if (key !== fKey) { fKey = key; fx = flux(d[0], d[1]); }
    const F = fx.F;
    // The eye adapts in about a second; the pan cools faster than it warms.
    const aT = Math.max(0.04, F);
    // Reduced motion settles the light three times faster.
    const sk = calm ? 0.33 : 1;
    adapt = Math.exp(Math.log(adapt) + (Math.log(aT) - Math.log(adapt)) * (1 - Math.exp(-dt / (1.1 * sk))));
    heat += (F - heat) * (1 - Math.exp(-dt / ((F < heat ? 4 : 9) * sk)));
    tot += ((F <= 0 ? 1 : 0) - tot) * (1 - Math.exp(-dt / (1.5 * sk)));
    // The diamond ring: one bead holds most of the light.
    const ring = F > 0 && F < 0.004 ? (1 - smooth(0.0006, 0.004, F)) * smooth(0, 0.00004, F) * smooth(0.18, 0.5, fx.bead) : 0;
    ringK += (ring - ringK) * (1 - Math.exp(-dt / 0.05));
    if (ring > 0.3 && !wasRing) snd.ring(clamp((lens.sun[0] + fx.bx * lens.rs) / lens.tanW, -1, 1));
    wasRing = ring > 0.15;
    const drift = calm ? 0 : idleFor > 60 ? Math.max(0, 1 - (idleFor - 60) / 2) : 1;
    const settling = Math.abs(Math.log(aT / adapt)) > 0.01 || Math.abs(F - heat) > 0.004 || Math.abs((F <= 0 ? 1 : 0) - tot) > 0.01;
    speed = Math.max(drift, glide || pointer.id !== null || settling ? (calm ? 0.35 : 1) : 0);
    t += dt * speed;
    snd.frame({ F, heat, tot, dt });
    draw();
    D.frame(dt);
    frameNo++;
    // A settling light only drifts; the hand and the glide run at full rate.
    lively = !!glide || pointer.id !== null || ringK > 0.01 || t0 - lastInput < 1500;
    again = speed > 0 || settling;
  } finally {
    // A thrown error still leaves the loop able to wake.
    if (again) schedule(lively ? 0 : t0 + 33 - performance.now()); else rest();
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

/* ---------- pointer: a drag moves the moon, a tap glides ---------- */
// Near the sun the moon moves slower than the hand, so totality is easy to hold.
const gain = r => 0.1 + 0.9 * smooth(0.05, 1.3, r);
const pointer = { id: null, x0: 0, y0: 0, x: 0, y: 0, drag: false, at: 0 };
const local = e => { const r = stage.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
stage.addEventListener('pointerdown', e => {
  if (e.button !== 0 || !R || pointer.id !== null || (e.target !== canvas && e.target !== stage)) return;
  try { stage.setPointerCapture(e.pointerId); } catch { /* capture is optional */ }
  const [x, y] = local(e);
  Object.assign(pointer, { id: e.pointerId, x0: x, y0: y, x, y, drag: false, at: performance.now() });
  glide = null;
  poke();
});
stage.addEventListener('pointermove', e => {
  if (e.pointerId !== pointer.id) return;
  const [x, y] = local(e);
  if (!pointer.drag && Math.hypot(x - pointer.x0, y - pointer.y0) > 8) pointer.drag = true;
  const dx = x - pointer.x, dy = y - pointer.y;
  pointer.x = x; pointer.y = y;
  if (!pointer.drag) return;
  // Small steps keep the slow zone exact on a fast drag.
  const n = Math.ceil(Math.hypot(dx, dy) / 4) || 1;
  for (let i = 0; i < n; i++) {
    const k = gain(Math.hypot(...d)) / lens.rsPx / n;
    setD(d[0] + dx * k, d[1] - dy * k);
  }
  poke();
});
function endPointer(e) {
  if (e.pointerId !== pointer.id) return;
  const tap = !pointer.drag && e.type === 'pointerup' && performance.now() - pointer.at < 260;
  pointer.id = null;
  if (tap) glideOn();
  // A release near the centre settles into totality.
  else if (Math.hypot(...d) < 0.14) glide = { to: [0, 0], age: 0.5 };
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

// ?qa hands the state to a test script.
if (new URLSearchParams(location.search).has('qa')) globalThis.__ecl = {
  get F() { return fx.F; }, get d() { return d.slice(); }, get ring() { return [ringK, fx.bead]; }, get busy() { return !!(raf || timer); },
  set(x, y) { glide = null; setD(x, y); poke(); }, glide: glideOn, get gliding() { return !!glide; },
  // Jumps the eye and the heat to the light now, for a capture.
  settle() { fx = flux(d[0], d[1]); adapt = Math.max(0.04, fx.F); heat = fx.F; tot = fx.F <= 0 ? 1 : 0; draw(); },
};

async function setup() {
  gl = canvas.getContext('webgl2', { antialias: false, alpha: false, depth: false, powerPreference: 'high-performance' });
  if (!gl) throw new Error('no webgl2');
  R = await makeRenderer(gl);
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
