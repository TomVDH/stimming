// Lava coast: a volcanic island at night. A tap wakes the flank vent.
// The fountain's lava runs down the slope and meets the sea in towers of steam.
import { initPage, whenVisible, pageReady, stage as mark, reduced, onReducedChange, audioKit, sound } from '../shared/stim.js';
import { intro as playIntro } from '../shared/intro.js';
import { onContextLoss } from '../shared/gl.js';
import { detail } from '../shared/detail.js';
import { makeRenderer, NF } from './render.js';
import { makeSim } from './sim.js';
import { makeSound } from './sound.js';
import { VENT, TUBE_X, CAMH, coastZ, height } from './land.js';
mark('libs');

const ID = 'lavacoast';
const stage = document.getElementById('stage');
const fail = stage.querySelector('.fail');
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const SOUND_V = 343, SIM_DT = 1 / 90, HOLD_MAX = 30;
// A tap keeps the vent going this long; then it calms.
const TAP_S = 7;
const VENT_Y = height(VENT[0], VENT[1]);
const VENT_P = [VENT[0], VENT_Y - 2, VENT[1]];
const TUBE = [TUBE_X, 0, coastZ(TUBE_X)];
const WIND_X = -7;

/* ---------- state ---------- */
const saved = k => { try { return localStorage.getItem(`stimming.${ID}.${k}`); } catch { return null; } };
const save = (k, v) => { try { localStorage.setItem(`stimming.${ID}.${k}`, String(v)); } catch { /* private mode */ } };
let flow = clamp(parseFloat(saved('flow') ?? '0.6') || 0.6, 0, 1);
let t = 0, waveT = 0, simAcc = 0;
let gl = null, R = null, raf = 0, timer = 0, visible = true, last = 0, frameNo = 0, calm = reduced();
let cssW = 1, cssH = 1, started = false, lastInput = 0, frozen = false;
let lens = { tanW: 0.42, vy: 0.525, hz: 0.36, asp: 1.6 };
const sim = makeSim();
// The fountain: its strength now, and when it calms.
const fount = { S: 0, until: -1, held: false, pulse: 0, pulseV: 0 };
// The fountain's strength over the last 6 s, 0.125 s apart, for the clots.
const fountOut = new Float32Array(48);
const fountLog = [];
// Tower slots: four sea entries, then the vent's gas.
const slots = Array.from({ length: 4 }, () => ({ x: 0, z: 0, e: 0, want: 0, live: -1e9, flash: 0 }));
const slotOut = new Float32Array(20), histVals = new Float32Array(5);
let head = 0, headT = 0;
const bursts = new Float32Array(24).fill(-1e3);
let burstNext = 0, hotBase = 0, stats = { hot: 0, moving: 0, area: 0 }, statT = 0;
let rngSeed = 1 + Date.now() % 2147483646;
const rnd = () => ((rngSeed = (rngSeed * 16807) % 2147483647) / 2147483647);

/* ---------- bar ---------- */
const ui = initPage({ id: ID, bar: {
  actions: [
    { verb: 'erupt', key: 'Space', onPress: () => { erupt(); } },
  ],
  slider: { label: 'Flow', min: 0, max: 1, step: 0.01, value: flow, onInput: v => { flow = v; save('flow', v); poke(); } },
  quality: true,
  keys: [['click', 'erupt'], ['hold', 'keep it going'], ['Space', 'erupt']],
  help: [
    ['click', 'Tap to wake the vent'],
    ['hold', 'Hold to keep the fountain going'],
    ['Space', 'Press Space to erupt'],
  ],
} });
const introDone = playIntro({ ready: pageReady() });
const kit = audioKit({ keys: new Set([' ']), sleepMs: 1500 });
const snd = makeSound(kit, { onIdle: () => { if (!raf && !timer) rest(); } });

/* ---------- GL ---------- */
const canvas = document.createElement('canvas');
canvas.setAttribute('aria-hidden', 'true');
stage.prepend(canvas);
// Rungs: the pixel ratio, then the steam's size and the bloom, then fewer steam steps.
const D = detail({ maxDpr: 2, budget: 2.4e6, steps: 3, settle: 2, onChange: () => resize(true) });

// The lens: about 46 degrees across; a portrait stage narrows it.
function fitLens() {
  const asp = cssW / cssH;
  const tanW = asp >= 1 ? 0.42 : clamp(0.42 * asp * 1.35, 0.24, 0.42);
  const vy = 2 * tanW / asp;
  // Keep the shore low and the vent in frame; a tall stage shows more tower.
  const hz = asp >= 1 ? 0.36 : clamp(0.3 / vy + 0.1, 0.2, 0.36);
  lens = { tanW, vy, hz, asp };
}
let sizeKey = '';
function resize(force = false) {
  if (!gl || !R) return;
  const r = stage.getBoundingClientRect();
  cssW = Math.max(1, r.width); cssH = Math.max(1, r.height);
  const dpr = D.dpr(cssW, cssH);
  const key = [cssW, cssH, dpr, D.rung].map(v => Math.round(v * 100)).join();
  if (!force && key === sizeKey) return;
  sizeKey = key;
  fitLens();
  R.resize(Math.round(cssW * dpr), Math.round(cssH * dpr), { steam: D.rung >= 2 ? 0.36 : 0.5 });
  draw();
}

/* ---------- the vent ---------- */
function erupt(hold = false) {
  fount.until = Math.max(fount.until, t + (hold ? HOLD_MAX : TAP_S));
  fount.held = hold;
  poke();
}
function release() {
  if (!fount.held) return;
  fount.held = false;
  // A hold ends a little after the release, as the gas runs out.
  fount.until = Math.min(fount.until, t + 1.2);
}
// The fountain's level over time: quick to rise, slow to sink, with gas pulses.
function stepFount(dt) {
  const want = t < fount.until ? 1 : 0;
  const k = want > fount.S ? 1 - Math.exp(-dt / 0.35) : 1 - Math.exp(-dt / 2.4);
  fount.S += (want - fount.S) * k;
  if (fount.S < 1e-3 && want === 0) fount.S = 0;
  // Gas pulses: a damped spring kicked at random, about twice a second.
  if (fount.S > 0.05 && rnd() < dt * 2.2) fount.pulseV += (0.6 + rnd()) * 6;
  fount.pulseV += (-fount.pulse * 40 - fount.pulseV * 5) * dt;
  fount.pulse += fount.pulseV * dt;
  fountLog.push([t, level()]);
  while (fountLog.length > 2 && fountLog[1][0] < t - 6.5) fountLog.shift();
}
const level = () => fount.S * clamp(0.8 + 0.25 * fount.pulse, 0.4, 1.3) * (calm ? 0.6 : 1);
// The level at time tt, from the log.
function levelAt(tt) {
  for (let i = fountLog.length - 1; i > 0; i--) {
    const [ta, a] = fountLog[i - 1], [tb, b] = fountLog[i];
    if (ta <= tt) return tb > ta ? a + (b - a) * clamp((tt - ta) / (tb - ta), 0, 1) : b;
  }
  return 0;
}

/* ---------- the towers ---------- */
// Steam sources along the shore, grouped into towers, at most four.
function stepTowers(dt) {
  const cols = sim.sources(dt);
  const peaks = [];
  // Neighbouring columns of steam make one tower.
  let cur = null;
  for (const c of cols) {
    if (cur && c.x - cur.x1 < 22) { cur.e += c.e; cur.x += c.x * c.e; cur.z += c.z * c.e; cur.x1 = c.x; }
    else { if (cur) peaks.push(cur); cur = { e: c.e, x: c.x * c.e, z: c.z * c.e, x1: c.x }; }
  }
  if (cur) peaks.push(cur);
  for (const p of peaks) { p.x /= p.e || 1; p.z /= p.e || 1; }
  peaks.sort((a, b) => b.e - a.e);
  for (const s of slots) s.want = 0;
  for (const p of peaks.slice(0, 4)) {
    let best = null, bd = 60;
    for (const s of slots) { const d = Math.abs(s.x - p.x); if (s.live > t - 1 && d < bd) { bd = d; best = s; } }
    // A new tower takes a slot whose old steam has gone.
    if (!best) best = slots.find(s => s.live < t - 64) || null;
    if (!best) continue;
    if (best.live < t - 1) { best.x = p.x; best.z = p.z; }
    best.x += (p.x - best.x) * 0.05; best.z += (p.z - best.z) * 0.05;
    best.want = Math.min(1.3, Math.sqrt(p.e / 30));
  }
  for (const s of slots) {
    s.e += (s.want - s.e) * (1 - Math.exp(-dt / 0.6));
    if (s.e > 0.004) s.live = t;
    s.flash *= Math.exp(-dt / 0.12);
  }
  // Waves burst on the hot rock: spatter and a flash, more with more steam.
  if (!calm) for (let i = 0; i < 4; i++) {
    const s = slots[i];
    if (s.e < 0.25 || rnd() > dt * 0.9 * s.e) continue;
    const k = burstNext++ % 6;
    bursts.set([s.x + (rnd() - 0.5) * 24, 1, s.z + (rnd() - 0.5) * 10, t], k * 4);
    s.flash = 0.6 + rnd() * 0.6;
    const d = Math.hypot(s.x, s.z, CAMH);
    snd.pop({ pan: clamp(Math.atan2(s.x, s.z) / 0.5, -1, 1), delay: d / SOUND_V, size: s.e });
  }
  // The history moves on every 0.5 s.
  headT += dt;
  while (headT >= 0.5) { headT -= 0.5; head = (head + 1) % 128; }
  for (let i = 0; i < 4; i++) histVals[i] = slots[i].e;
  histVals[4] = 0.1 + 0.9 * level();
  R?.setHist(head, histVals);
}

/* ---------- frame state ---------- */
// Test overrides for the frame state, set through ?qa.
const over = {};
function state() {
  for (let i = 0; i < 4; i++) {
    const s = slots[i];
    slotOut.set([s.x, 0, s.z, s.e * (1 + s.flash)], i * 4);
  }
  const L = level();
  slotOut.set([VENT_P[0], VENT_Y + 6, VENT_P[2], 0.1 + L], 16);
  for (let i = 0; i < 48; i++) fountOut[i] = levelAt(t - i * 0.125);
  const fountH = 70 + 110 * flow;
  return {
    ...lens, t, waveT, frameNo,
    vent: VENT_P, ventHeat: Math.max(0.2, L),
    ventL: [VENT_P[0], VENT_Y + 20 + 0.35 * fountH * L, VENT_P[2], 0.06 + 1.6 * L],
    slots: slotOut, head: head + headT / 0.5,
    fount: fountOut, fountH, windX: WIND_X, bursts,
    sparks: fountLog.some(f => f[1] > 0.02) || bursts.some((b, i) => i % 4 === 3 && t - b < 2.5),
    steps: D.rung >= 3 ? 28 : 40,
    swell: calm ? 0.4 : 1,
    expo: 1.5, bloomK: 0.3, bloomLevels: D.rung >= 2 ? 4 : 6,
    ...over,
  };
}
function draw() { if (R) R.frame(state()); }

/* ---------- the sim ---------- */
// Runs the sim to time; uploads the lava and its glow.
function stepSim(dt, drifting) {
  simAcc += dt;
  let n = 0;
  const L = level();
  while (simAcc >= SIM_DT && n < 5) {
    simAcc -= SIM_DT; n++;
    sim.step(SIM_DT, { vent: L * (6 + 16 * flow), tube: drifting > 0 ? 1.6 : 0 });
  }
  if (n === 5) simAcc = 0;
  if (!n || !R) return;
  R.setLava(sim.pack());
  if (frameNo % 3 === 0) R.setGlow(sim.glow());
  statT += dt;
  if (statT > 0.4) { statT = 0; stats = sim.stats(); }
}

/* ---------- frame loop ---------- */
// Lively while the vent runs or hot lava moves; drifting at 30 fps; asleep after 60 s.
function frame(now) {
  raf = 0;
  if (!visible || !gl || !started) return;
  const t0 = performance.now();
  const dt = frozen ? 0 : Math.max(0, Math.min(1 / 15, (now - last) / 1000));
  last = Math.max(last, now);
  let again = true, lively = true;
  try {
    const idleFor = (t0 - lastInput) / 1000;
    // The surf and the trickle ease to a stop over 2 s once the toy sleeps.
    const drifting = calm ? 0 : idleFor > 60 ? Math.max(0, 1 - (idleFor - 60) / 2) : 1;
    const busy = fount.S > 0 || t < fount.until || stats.hot > hotBase + 25;
    const speed = Math.max(drifting, busy ? 1 : 0);
    const d = dt * speed;
    t += d;
    waveT += dt * drifting;
    stepFount(d);
    stepSim(d, drifting);
    stepTowers(d);
    const delayV = Math.hypot(VENT_P[0], VENT_P[1] - CAMH, VENT_P[2]) / SOUND_V;
    const near = slots.reduce((a, s) => (s.e > a.e ? s : a), slots[0]);
    snd.frame({
      surf: drifting * 0.7 + (busy ? 0.3 : 0),
      fount: levelAt(t - delayV), fountPan: clamp(VENT_P[0] / VENT_P[2] / 0.5, -1, 1),
      hiss: slots.reduce((a, s) => a + s.e, 0), hissPan: clamp(near.x / near.z / 0.5, -1, 1),
      crackle: clamp(stats.area / 60000, 0, 1),
    });
    draw();
    D.frame(dt);
    frameNo++;
    lively = busy;
    again = speed > 0 || slots.some(s => s.e > 0.01 && busy);
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

/* ---------- pointer: a tap wakes the vent, a hold keeps it going ---------- */
// The vent answers on the press; a hold after 260 ms keeps it going.
const pointer = { id: null, x0: 0, y0: 0, drag: false, at: 0, holdT: 0 };
const local = e => { const r = stage.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
stage.addEventListener('pointerdown', e => {
  if (e.button !== 0 || !R || pointer.id !== null || (e.target !== canvas && e.target !== stage)) return;
  try { stage.setPointerCapture(e.pointerId); } catch { /* capture is optional */ }
  const [x, y] = local(e);
  Object.assign(pointer, { id: e.pointerId, x0: x, y0: y, drag: false, at: performance.now() });
  erupt();
  pointer.holdT = setTimeout(() => { if (pointer.id !== null) erupt(true); }, 260);
});
stage.addEventListener('pointermove', e => {
  if (e.pointerId !== pointer.id) return;
  const [x, y] = local(e);
  if (!pointer.drag && Math.hypot(x - pointer.x0, y - pointer.y0) > 8) { pointer.drag = true; erupt(true); }
});
function endPointer(e) {
  if (e.pointerId !== pointer.id) return;
  pointer.id = null;
  clearTimeout(pointer.holdT);
  release();
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
if (new URLSearchParams(location.search).has('qa')) globalThis.__lava = {
  get busy() { return !!(raf || timer); }, get S() { return fount.S; }, get stats() { return { ...stats, hotBase }; },
  get slots() { return slots.map(s => ({ ...s })); }, get t() { return t; }, get rung() { return D.rung; },
  erupt: hold => erupt(hold), release,
  // Runs the world forward by sec without drawing, for a capture.
  run(sec) { const n = Math.round(sec * 60); for (let i = 0; i < n; i++) { const d = 1 / 60; t += d; waveT += d; stepFount(d); stepSim(d, 1); stepTowers(d); } draw(); },
  freeze(on) { frozen = on; if (!on) poke(); },
  set(k, v) { if (v === undefined) delete over[k]; else over[k] = v; draw(); },
};

async function setup() {
  gl = canvas.getContext('webgl2', { antialias: true, alpha: false, depth: false, powerPreference: 'high-performance' });
  if (!gl) throw new Error('no webgl2');
  const r = stage.getBoundingClientRect();
  cssW = Math.max(1, r.width); cssH = Math.max(1, r.height);
  fitLens();
  R = await makeRenderer(gl, { simN: sim.N, glowN: sim.GN });
  sizeKey = '';
}
onContextLoss(canvas, {
  lost: () => { halt(); gl = null; R = null; },
  restored: async () => { await setup(); resize(true); poke(); },
  failed: () => fail.removeAttribute('hidden'),
});

// The first frame is a picture: the trickle already reaches the sea, its tower stands.
function preroll() {
  for (let i = 0; i < 20 * 30; i++) { const d = 1 / 30; t += d; waveT += d; stepFount(d); stepSim(d, 1); stepTowers(d); }
  stats = sim.stats();
  hotBase = stats.hot;
}

mark('build');
try {
  await setup();
  preroll();
  resize(true);
  R.setLava(sim.pack());
  R.setGlow(sim.glow());
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
