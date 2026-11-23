// Wheat storm: gusts roll over a ripe wheat field under a thunderstorm.
// A tap calls lightning there; thunder follows by distance, then the gust front.
import { initPage, whenVisible, pageReady, stage as mark, reduced, onReducedChange, audioKit, sound } from '../shared/stim.js';
import { intro as playIntro } from '../shared/intro.js';
import { onContextLoss } from '../shared/gl.js';
import { detail } from '../shared/detail.js';
import { makeRenderer, plantField } from './render.js';
import { makeChannel } from './bolt.js';
import { makeSound } from './sound.js';
mark('libs');

const ID = 'wheat';
const stage = document.getElementById('stage');
const fail = stage.querySelector('.fail');
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const CAMH = 4.0, CANOPY = 0.72, SOUND_V = 343;
// The gust front's speed in m/s, and how long a strike's light lasts.
const FRONT_V = 19, LEAD = 0.075, LIGHT_S = 1.4;
// Strikes come one per 0.6 s at most: never three flashes a second.
const GAP = 0.6;
const HEADS = 90000;

/* ---------- state ---------- */
const saved = k => { try { return localStorage.getItem(`stimming.${ID}.${k}`); } catch { return null; } };
const save = (k, v) => { try { localStorage.setItem(`stimming.${ID}.${k}`, String(v)); } catch { /* private mode */ } };
let wind = clamp(parseFloat(saved('wind') ?? '0.6') || 0.6, 0, 1);
let phase = 40, drift = 0, t = 0, speed = 1;
let gl = null, R = null, raf = 0, timer = 0, visible = true, last = 0, frameNo = 0, calm = reduced();
let cssW = 1, cssH = 1, dpr = 1, started = false, lastInput = 0, frozen = false;
let lens = { tanW: 0.45, vy: 0.56, hz: 0.66, asp: 1.6 };
// Live gust fronts and the strike in flight.
const fronts = [];
let lastSegs = null, strike = null, nextStrikeAt = 0, queued = null, rngSeed = 1 + Date.now() % 2147483646;
const rnd = () => ((rngSeed = (rngSeed * 16807) % 2147483647) / 2147483647);

/* ---------- bar ---------- */
const ui = initPage({ id: ID, bar: {
  actions: [
    { verb: 'strike', key: 'Space', onPress: () => strikeSomewhere() },
  ],
  slider: { label: 'Wind', min: 0, max: 1, step: 0.01, value: wind, onInput: v => { wind = v; save('wind', v); poke(); } },
  quality: true,
  keys: [['click', 'call lightning'], ['Space', 'strike']],
  help: [
    ['click', 'Tap the field to call lightning there'],
    ['click', 'Tap the sky to call it far off'],
    ['Space', 'Press Space for a strike'],
  ],
} });
const introDone = playIntro({ ready: pageReady() });
const kit = audioKit({ keys: new Set([' ']), sleepMs: 1500 });
// Thunder may outlast the frame loop; its end lets the context sleep.
const snd = makeSound(kit, { onIdle: () => { if (!raf && !timer) rest(); } });

/* ---------- GL ---------- */
const canvas = document.createElement('canvas');
canvas.setAttribute('aria-hidden', 'true');
stage.prepend(canvas);
// Rungs: the pixel ratio, then the deck's size and the bloom, then the heads.
const D = detail({ maxDpr: 2, budget: 2.4e6, steps: 3, settle: 2, onChange: () => resize(true) });

// The lens: about 48 degrees across, tilted down; a portrait stage narrows it.
function fitLens() {
  const asp = cssW / cssH;
  const tanW = asp >= 1 ? 0.45 : clamp(0.45 * asp * 1.25, 0.28, 0.45);
  const hz = asp >= 1 ? 0.66 : 0.68;
  lens = { tanW, vy: 2 * tanW / asp, hz, asp };
}
let sizeKey = '', planted = 0;
function resize(force = false) {
  if (!gl || !R) return;
  const r = stage.getBoundingClientRect();
  cssW = Math.max(1, r.width); cssH = Math.max(1, r.height);
  dpr = D.dpr(cssW, cssH);
  const key = [cssW, cssH, dpr, D.rung].map(v => Math.round(v * 100)).join();
  if (!force && key === sizeKey) return;
  sizeKey = key;
  const old = lens;
  fitLens();
  R.resize(Math.round(cssW * dpr), Math.round(cssH * dpr), { cloud: D.rung >= 2 ? 0.34 : 0.5 });
  // The heads fill the lens's wedge; a new lens or the last rung plants again.
  const want = D.rung >= 3 ? HEADS / 2 : HEADS;
  if (planted !== want || Math.abs(old.tanW - lens.tanW) > 1e-3 || Math.abs(old.vy - lens.vy) > 1e-3) { R.setHeads(plantField(want, lens)); planted = want; }
  draw();
}

/* ---------- strikes ---------- */
// Screen point to the place a bolt lands: on the field, or far off under the sky.
function landAt(px, py) {
  const X = (px / cssW * 2 - 1) * lens.tanW, Y = ((1 - py / cssH) - lens.hz) * lens.vy;
  if (Y < -0.002) {
    const z = Math.min((CAMH - CANOPY) / -Y, 6000);
    return [X * z, Math.max(z, 6)];
  }
  // A tap on the sky: the bolt leaves the cloud base there.
  const z = clamp(820 / Math.max(Y, 1e-3), 1500, 5000);
  return [X * z, z];
}
function strikeAt(x, z) {
  const now = performance.now() / 1000;
  // A tap inside the gap waits for it, so the gesture still lands.
  if (now < nextStrikeAt) { queued = [x, z]; poke(); return; }
  nextStrikeAt = now + GAP;
  const ch = makeChannel(x, z, rnd);
  lastSegs = ch.segs;
  R?.setBolt(ch.segs);
  const dist = Math.hypot(x, z);
  strike = { x, z, top: ch.top, age: 0, dist, restrike: calm ? 1e9 : 0.085 + rnd() * 0.06 };
  // The gust front: a ring of outflow from the strike point.
  fronts.push({ x, z, age: 0 });
  while (fronts.length > 4) fronts.shift();
  snd.strike({ dist, pan: clamp(Math.atan2(x, z) / 0.6, -1, 1), delay: dist / SOUND_V });
  poke();
}
// Space and the bar's Strike: somewhere in the field, now near, now far.
function strikeSomewhere() {
  const z = Math.exp(Math.log(25) + rnd() * Math.log(2500 / 25));
  strikeAt((rnd() * 2 - 1) * z * lens.tanW * 0.8, z);
}
// The channel's light over a strike's life: the leader, the stroke, a restrike, the glow.
function lightOf(s) {
  const a = s.age;
  if (a < LEAD) return { ch: 0.1, grow: a / LEAD, main: 0 };
  const b = a - LEAD;
  let ch = Math.exp(-b / 0.045) + 0.22 * Math.exp(-b / 0.3);
  if (a > LEAD + s.restrike) ch += 0.75 * Math.exp(-(a - LEAD - s.restrike) / 0.04);
  // Reduced motion: one soft flash, no stroke spike.
  if (calm) ch = 0.45 * Math.min(1, b / 0.08) * Math.exp(-b / 0.35);
  return { ch, grow: 1, main: a > LEAD + s.restrike + 0.02 ? 1 : 0 };
}

/* ---------- frame state ---------- */
const frontOut = new Float32Array(16);
function state() {
  frontOut.fill(0);
  fronts.forEach((f, i) => {
    const Rr = FRONT_V * f.age;
    // Strong at first, weaker as it spreads and dies.
    const amp = 0.5 * Math.min(1, f.age * 3) * Math.exp(-f.age / 10) / Math.sqrt(1 + Rr / 70) * (calm ? 0.6 : 1);
    frontOut.set([f.x, f.z, Rr, amp], i * 4);
  });
  let bolt = [0, 0, 0, 0], boltTop = [0, 0, 0, 0], flash = 0, channel = 0, grow = 1, mainOnly = 0;
  if (strike) {
    const L = lightOf(strike);
    // Far strikes light the field less; the cloud glow carries them.
    const near = 1 / (1 + strike.dist / 900);
    bolt = [strike.x, 0, strike.z, L.ch * 3 * near];
    boltTop = [strike.top[0], strike.top[1], strike.top[2], L.ch * 0.8];
    flash = L.ch * (0.15 + 0.35 * near);
    channel = L.ch; grow = L.grow; mainOnly = L.main;
  }
  return {
    ...lens, t, phase, wind, drift, frameNo,
    fronts: frontOut, bolt, boltTop, boltC: [0.78, 0.8, 1.0], flash, channel, grow, mainOnly,
    expo: 0.82, bloomK: 0.32, bloomLevels: D.rung >= 2 ? 4 : 6,
  };
}
function draw() { if (R) R.frame(state()); }

/* ---------- frame loop ---------- */
// Lively while a strike or a gust front is in flight; drifting at 30 fps; asleep after 60 s.
function frame(now) {
  raf = 0;
  if (!visible || !gl || !started) return;
  const t0 = performance.now();
  const dt = frozen ? 0 : Math.max(0, Math.min(1 / 15, (now - last) / 1000));
  last = Math.max(last, now);
  let again = true, lively = true;
  try {
    const idleFor = (t0 - lastInput) / 1000;
    if (queued && t0 / 1000 >= nextStrikeAt) { const q = queued; queued = null; strikeAt(...q); }
    // The wind eases to a stop over 2 s once the toy sleeps; reduced motion has none.
    const drifting = calm ? 0 : idleFor > 60 ? Math.max(0, 1 - (idleFor - 60) / 2) : 1;
    const busy = !!strike || fronts.length > 0 || !!queued;
    speed = Math.max(drifting, busy ? 1 : 0);
    t += dt * speed;
    phase += dt * drifting * (2.5 + 7 * wind);
    drift += dt * drifting * 9;
    if (strike) { strike.age += dt; if (strike.age > LIGHT_S) strike = null; }
    for (const f of fronts) f.age += dt;
    while (fronts.length && fronts[0].age > 22) fronts.shift();
    snd.frame({ wind: wind * drifting, gust: gustAt(-4, 18), front: nearGust() });
    draw();
    D.frame(dt);
    frameNo++;
    lively = !!strike || fronts.length > 0 || !!queued;
    again = speed > 0;
  } finally {
    // A thrown error still leaves the loop able to wake.
    if (again) schedule(lively ? 0 : t0 + 33 - performance.now()); else rest();
  }
}
// The shaders' gust field, in JS, for the sound at the near wheat.
const fract = x => x - Math.floor(x);
function h2(x, y) {
  let a = fract(x * 0.1031), b = fract(y * 0.1031), c = fract(x * 0.1031);
  const d = a * (b + 33.33) + b * (c + 33.33) + c * (a + 33.33);
  a += d; b += d; c += d;
  return fract((a + b) * c);
}
function vn2(x, y) {
  const ix = Math.floor(x), iy = Math.floor(y);
  let fx = x - ix, fy = y - iy;
  fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy);
  const a = h2(ix, iy) + (h2(ix + 1, iy) - h2(ix, iy)) * fx, b = h2(ix, iy + 1) + (h2(ix + 1, iy + 1) - h2(ix, iy + 1)) * fx;
  return a + (b - a) * fy;
}
const WD = [-0.3871, -0.922], WC = [0.922, -0.3871];
function gustAt(x, z) {
  const a = x * WD[0] + z * WD[1] - phase, c = x * WC[0] + z * WC[1];
  const g = 0.55 * vn2(a * 0.07, c * 0.02) + 0.3 * vn2(a * 0.18 + 17, c * 0.065 + 17) + 0.15 * vn2(a * 0.45 + 41, c * 0.2 + 41);
  const k = clamp((g - 0.36) / 0.34, 0, 1);
  return k * k * (3 - 2 * k);
}
// How hard the gust fronts blow at the eye, 0 to 1.
function nearGust() {
  let g = 0;
  for (const f of fronts) {
    const Rr = FRONT_V * f.age, r = Math.hypot(f.x, f.z), b = Rr - r;
    if (b > -3) g = Math.max(g, Math.exp(-Math.max(b, 0) / 14) * Math.exp(-f.age / 10) / Math.sqrt(1 + Rr / 70) * 2);
  }
  return Math.min(1, g);
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

/* ---------- pointer: a tap calls lightning ---------- */
// A press turns into a drag after 8 px, or a hold after 260 ms; a drag does nothing.
const pointer = { id: null, x0: 0, y0: 0, drag: false, at: 0 };
const local = e => { const r = stage.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
stage.addEventListener('pointerdown', e => {
  if (e.button !== 0 || !R || pointer.id !== null || (e.target !== canvas && e.target !== stage)) return;
  try { stage.setPointerCapture(e.pointerId); } catch { /* capture is optional */ }
  const [x, y] = local(e);
  Object.assign(pointer, { id: e.pointerId, x0: x, y0: y, drag: false, at: performance.now() });
  poke();
});
stage.addEventListener('pointermove', e => {
  if (e.pointerId !== pointer.id) return;
  const [x, y] = local(e);
  if (!pointer.drag && Math.hypot(x - pointer.x0, y - pointer.y0) > 8) pointer.drag = true;
});
function endPointer(e) {
  if (e.pointerId !== pointer.id) return;
  const tap = !pointer.drag && e.type === 'pointerup' && performance.now() - pointer.at < 260;
  pointer.id = null;
  if (tap) strikeAt(...landAt(pointer.x0, pointer.y0));
  poke();
}
['pointerup', 'pointercancel', 'lostpointercapture'].forEach(t => stage.addEventListener(t, endPointer));

/* ---------- life cycle ---------- */
whenVisible(stage, on => {
  visible = on;
  if (on) { last = performance.now(); schedule(); }
  else { halt(); snd.quiet(true); }
});
onReducedChange(on => { calm = on; draw(); poke(); });
sound.onChange(on => { if (on) poke(); else snd.quiet(true); });
new ResizeObserver(() => resize()).observe(stage);

// ?qa hands the state to a test script.
if (new URLSearchParams(location.search).has('qa')) globalThis.__wheat = {
  get busy() { return !!(raf || timer); }, get live() { return strike && { ...strike }; }, get fronts() { return fronts.length; },
  strike: (x, z) => strikeAt(x, z), tap: (px, py) => strikeAt(...landAt(px, py)),
  // Freezes the clock at a strike's age, for a capture.
  hold(age) { frozen = true; if (strike) { strike.age = age; fronts[fronts.length - 1].age = age; } draw(); },
  age(sec) { frozen = true; for (const f of fronts) f.age = sec; strike = null; draw(); },
  go() { frozen = false; poke(); }, setWind(v) { wind = v; poke(); }, run(sec) { phase += sec * (2.5 + 7 * wind); drift += sec * 9; t += sec; draw(); },
  get segs() { return lastSegs && Array.from(lastSegs); }, get lens() { return { ...lens, cssW, cssH }; },
  get msaa() { return R?.msaa; }, get rung() { return D.rung; },
};

async function setup() {
  gl = canvas.getContext('webgl2', { antialias: false, alpha: false, depth: false, powerPreference: 'high-performance' });
  if (!gl) throw new Error('no webgl2');
  // The first plant reads the stage's own shape.
  const r = stage.getBoundingClientRect();
  cssW = Math.max(1, r.width); cssH = Math.max(1, r.height);
  fitLens();
  R = await makeRenderer(gl, { heads: plantField(HEADS, lens) });
  planted = HEADS;
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
