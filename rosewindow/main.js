// Rose window: sun through a Gothic rose, coloured light on stone and dust.
// Scrub the sun across the day; the shafts swing and the patches crawl.
import { initPage, whenVisible, pageReady, stage as mark, reduced, onReducedChange, audioKit, sound } from '../shared/stim.js';
import { intro as playIntro } from '../shared/intro.js';
import { onContextLoss } from '../shared/gl.js';
import { detail } from '../shared/detail.js';
import { dayAt, localHour } from '../shared/daytime.js';
import { makeRenderer } from './render.js';
import { makeSound } from './sound.js';
mark('libs');

const ID = 'rosewindow';
const stage = document.getElementById('stage');
const fail = stage.querySelector('.fail');
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const QA = new URLSearchParams(location.search).has('qa');

/* ---------- light ---------- */
// The scrub runs from before dawn to the blue hour.
const H_MIN = 5.9, H_MAX = 19.6;
// The sun's strength through the air, and the sky's behind the glass.
const SUN_I = 11.0, SKY_I = 1.7;
// The rose's mean transmission, tracery and leads included.
const AVG_T = [0.15, 0.075, 0.25];
// The fill the rose throws is softer in hue: its pale and gold panes spread widest.
const FILL_T = [0.16, 0.12, 0.19];
const SUN_UP = [6.6, 18.2];
// Window centre and glass plane, as in shaders.js.
const WCY = 11.2, ZG = -0.55;

// daytime.js swings the sun 69 degrees each way; the toy narrows it.
// A narrow swing keeps the light in the nave, as under a winter sun.
const SWING = 0.55;
function sunDir(d) {
  const [x, y, z] = d.sun;
  const h = Math.hypot(x, z), az = Math.atan2(x, -z) * SWING;
  return [Math.sin(az) * h, y, -Math.cos(az) * h];
}
// Every light value at one hour.
function lightAt(hour) {
  const d = dayAt(hour);
  const sun = sunDir(d);
  const k = d.level * d.sunUp * SUN_I;
  const sunC = d.light.map(c => c * k);
  const glow = 0.12 + 0.88 * d.day;
  // The south sky behind the glass: the band, the mid sky, and the zenith's blue at dusk.
  const sky = d.sky.mid.map((m, i) => (m * 0.4 + d.sky.band[i] * 0.45 + d.ambient[i] * 1.2) * SKY_I * glow + [0.004, 0.006, 0.014][i]);
  // Fill from the high windows: cool, weak, gone at night.
  const amb = d.ambient.map((z, i) => (z * 0.01 + [0.02, 0.018, 0.0148][i]) * Math.pow(d.day, 1.3) + 0.0006);
  const cosi = Math.max(0, -sun[2]);
  const win = FILL_T.map((t, i) => t * (sky[i] + sunC[i] * 0.1 * cosi) * 0.14);
  // Where the bright patch lands, for its coloured bounce.
  let bounceP = [0, 0.4, 8], bounceC = [0, 0, 0];
  if (sun[1] > 0.02 && sun[2] < -0.02) {
    const dir = sun.map(v => -v);
    let t = WCY / -dir[1];
    if (Math.abs(dir[0] * t) > 5.8) t = 5.8 / Math.abs(dir[0]);
    t = Math.min(t, 38 / dir[2]);
    bounceP = [dir[0] * t, WCY + dir[1] * t + 0.3, ZG + dir[2] * t];
    bounceC = FILL_T.map((a, i) => a * sunC[i] * cosi * 1.4);
  }
  return { sun, sunC, sky, amb, win, bounceP, bounceC, day: d.day };
}

/* ---------- state ---------- */
// The resting hour: the real time while the sun is up, else mid-afternoon.
const nowH = () => localHour();
const restHour = () => { const h = nowH(); return h > SUN_UP[0] && h < SUN_UP[1] ? h : 15.5; };
const sim = {
  hour: restHour(), target: 0, follow: true, run: false,
  // Drift time for the dust; it stops while asleep.
  time: 0, stir: [0, 0, -1, 99], litHour: -1,
};
sim.target = sim.hour;
sim.follow = nowH() > SUN_UP[0] && nowH() < SUN_UP[1];

let gl = null, R = null, raf = 0, timer = 0, clockT = 0, visible = true, last = 0, frameNo = 0, calm = reduced();
let cssW = 1, cssH = 1, dpr = 1, started = false, lastInput = 0, frozen = false, drifting = 1, cam = null;
let qaOver = {};

/* ---------- bar ---------- */
const fmt = h => { const m = Math.round(h * 60); return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`; };
const ui = initPage({ id: ID, bar: {
  actions: [
    { verb: 'day', key: 'Space', onPress: () => toggleRun() },
    { verb: 'now', key: 'N', onPress: () => toNow() },
  ],
  slider: { label: 'Sun', min: H_MIN, max: H_MAX, step: 0.01, value: sim.hour, onInput: v => aim(v, 'slider') },
  quality: true,
  keys: [['drag', 'move the sun'], ['click', 'stir the dust'], ['arrows', 'quarter hour']],
  help: [
    ['drag', 'Drag across the nave to move the sun through the day'],
    ['click', 'Tap to stir the dust in the light'],
    ['Space', 'Press Space to run the day on to dusk'],
    ['arrows', 'Press the arrows to move the sun a quarter hour'],
  ],
} });
const introDone = playIntro({ ready: pageReady() });
const kit = audioKit({ keys: new Set([' ', 'ArrowLeft', 'ArrowRight', 'n', 'N']), sleepMs: 4000 });
const snd = makeSound(kit);
const dayChip = () => [...document.querySelectorAll('.s2-chip')].find(b => b.querySelector('.s2-label')?.textContent === 'Day');

/* ---------- GL ---------- */
const canvas = document.createElement('canvas');
canvas.setAttribute('aria-hidden', 'true');
stage.prepend(canvas);
// Rungs: the pixel ratio, then fewer haze steps, then fewer motes and a smaller bloom.
const D = detail({ maxDpr: 2, budget: 2.2e6, steps: 3, settle: 2, onChange: () => resize(true) });

// The eye: in the west gallery, 9.5 m up, a little left of the axis.
// From there the floor patches open out, and the rose stands level.
// A tall stage steps back onto the axis and widens the view.
function makeCam(aspect) {
  const tall = clamp((1.25 - aspect) / 0.8, 0, 1);
  const pos = [-1.0 * (1 - tall), 9 - 0.5 * tall, 36 - 6 * tall];
  const at = [0.5 * (1 - tall), 5.0 + 1.2 * tall, 0];
  const F = norm(at.map((v, i) => v - pos[i]));
  const Rt = norm(cross(F, [0, 1, 0]));
  const U = cross(Rt, F);
  const tanY0 = 0.4;
  const tanX = Math.max(tanY0 * aspect, 0.3);
  return { pos, F, R: Rt, U, tanX, tanY: tanX / aspect };
}
function norm(v) { const l = Math.hypot(...v); return v.map(x => x / l); }
function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }

let sizeKey = '';
function resize(force = false) {
  if (!gl || !R) return;
  const r = stage.getBoundingClientRect();
  cssW = Math.max(1, r.width); cssH = Math.max(1, r.height);
  dpr = D.dpr(cssW, cssH);
  const key = [cssW, cssH, dpr].map(v => Math.round(v * 100)).join();
  if (!force && key === sizeKey) return;
  sizeKey = key;
  cam = makeCam(cssW / cssH);
  R.resize(Math.round(cssW * dpr), Math.round(cssH * dpr), cam);
  sim.litHour = -1;
  draw();
}

/* ---------- the sun ---------- */
// Sets the hour the sun eases to. A touch stops the clock and the run.
function aim(h, from = 'drag') {
  sim.target = clamp(h, H_MIN, H_MAX);
  sim.follow = false;
  if (from !== 'run' && sim.run) setRun(false);
  if (from !== 'slider') ui.slider?.set?.(sim.target);
  poke();
}
function toNow() {
  sim.follow = true;
  setRun(false);
  sim.target = clamp(nowH(), H_MIN, H_MAX);
  if (calm) sim.hour = sim.target;
  ui.slider?.set?.(sim.target);
  poke();
}
function setRun(on) {
  sim.run = on;
  dayChip()?.setAttribute('aria-pressed', String(on));
}
function toggleRun() {
  if (sim.run) { setRun(false); poke(); return; }
  // Past dusk the run starts again from dawn.
  if (sim.target > H_MAX - 0.4) { sim.target = H_MIN; sim.hour = H_MIN; }
  sim.follow = false;
  setRun(true);
  poke();
}
// The run crosses the day to dusk in about 30 s; reduced motion steps in quarter hours.
const RUN_RATE = 0.45;
let runStep = 0;
function stepSun(dt) {
  if (sim.run) {
    if (calm) {
      runStep += dt;
      if (runStep > 0.6) { runStep = 0; sim.target = Math.min(H_MAX, Math.floor(sim.target * 4 + 1) / 4); sim.hour = sim.target; }
    } else sim.target = Math.min(H_MAX, sim.target + RUN_RATE * dt);
    ui.slider?.set?.(sim.target);
    if (sim.target >= H_MAX) setRun(false);
  }
  if (sim.follow) sim.target = clamp(nowH(), H_MIN, H_MAX);
  const was = sim.hour;
  // A short ease: the sun follows the hand closely.
  const tau = sim.run ? 0.05 : 0.14;
  sim.hour += (sim.target - sim.hour) * (1 - Math.exp(-dt / tau));
  if (Math.abs(sim.target - sim.hour) < 1e-4) sim.hour = sim.target;
  return sim.hour - was;
}

/* ---------- frame state ---------- */
let L = lightAt(sim.hour);
function state() {
  const lv = D.rung;
  return {
    ...L,
    steps: lv >= 2 ? 22 : 36,
    dens: 0.05,
    drift: [sim.time * 0.011, sim.time * 0.004, -sim.time * 0.007],
    time: sim.time, stir: sim.stir, dpr,
    motes: lv >= 3 ? 3000 : 6000,
    bloomLevels: lv >= 3 ? 4 : 6, bloomK: 0.3,
    expo: 2.2 + 1.6 * (1 - L.day),
    frameNo,
    ...qaOver,
  };
}
function draw() {
  if (!R) return;
  if (Math.abs(sim.hour - sim.litHour) > 1e-4) {
    L = lightAt(sim.hour);
    R.relight(L.sun);
    sim.litHour = sim.hour;
  }
  R.frame(state());
}

/* ---------- frame loop ---------- */
// Lively while the sun moves, the dust swirls or the run plays; drifting at 30 fps; asleep after 60 s.
function frame(now) {
  raf = 0;
  if (!visible || !gl || !started) return;
  const t0 = performance.now();
  const dt = frozen ? 0 : Math.max(0, Math.min(1 / 15, (now - last) / 1000));
  last = Math.max(last, now);
  let again = true, lively = true;
  try {
    const idleFor = (t0 - lastInput) / 1000;
    drifting = calm ? 0 : idleFor > 60 ? Math.max(0, 1 - (idleFor - 60) / 2) : 1;
    const dh = stepSun(dt);
    sim.time += dt * drifting;
    if (sim.stir[3] < 9) sim.stir[3] += dt;
    const moving = Math.abs(dh) > 1e-5 || Math.abs(sim.target - sim.hour) > 1e-4;
    snd.frame({ dh, dt, hour: sim.hour, light: L, moving, drifting });
    draw();
    D.frame(dt);
    frameNo++;
    lively = moving || sim.run || sim.stir[3] < 3.5;
    again = lively || drifting > 0;
  } finally {
    // A thrown error still leaves the loop able to wake.
    if (again) schedule(lively ? 0 : t0 + 33 - performance.now()); else rest();
  }
}
let audioT = 0;
// The context sleeps once the last echo dies; a long bell waits its turn.
function restAudio() {
  clearTimeout(audioT);
  kit.rest(() => !raf && !timer && !snd.busy);
  if (snd.busy) audioT = setTimeout(() => { if (!raf && !timer) restAudio(); }, 2000);
}
function rest() {
  snd.quiet();
  restAudio();
  // Following the clock, the sun keeps time: one frame a minute.
  clearTimeout(clockT);
  if (sim.follow) clockT = setTimeout(() => { clockT = 0; if (!raf && !timer && visible && started) { stepSun(60); draw(); rest(); } }, 60000);
}
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
  clearTimeout(clockT);
  schedule();
}
function halt() { cancelAnimationFrame(raf); raf = 0; clearTimeout(timer); timer = 0; clearTimeout(clockT); }

/* ---------- pointer ---------- */
// A press becomes a drag after 8 px, or a hold after 260 ms; otherwise a tap.
// A drag across the full stage moves the sun ten hours.
const pointer = { id: null, x0: 0, y0: 0, lastX: 0, drag: false, at: 0 };
const local = e => { const r = stage.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
const onNave = e => e.target === canvas || e.target === stage;
function rayAt(x, y) {
  const sx = (x / cssW * 2 - 1) * cam.tanX, sy = (1 - y / cssH * 2) * cam.tanY;
  return norm(cam.F.map((f, i) => f + sx * cam.R[i] + sy * cam.U[i]));
}
function stir(x, y) {
  const d = rayAt(x, y);
  sim.stir = [d[0], d[1], d[2], 0];
  snd.stir({ pan: clamp(x / cssW * 2 - 1, -1, 1) });
  poke();
}
stage.addEventListener('pointerdown', e => {
  if (e.button !== 0 || !R || pointer.id !== null || !onNave(e)) return;
  try { stage.setPointerCapture(e.pointerId); } catch { /* capture is optional */ }
  const [x, y] = local(e);
  Object.assign(pointer, { id: e.pointerId, x0: x, y0: y, lastX: x, drag: false, at: performance.now() });
  poke();
});
stage.addEventListener('pointermove', e => {
  if (e.pointerId !== pointer.id) return;
  const [x, y] = local(e);
  if (!pointer.drag && Math.hypot(x - pointer.x0, y - pointer.y0) > 8) { pointer.drag = true; pointer.lastX = x; }
  if (!pointer.drag) return;
  const dx = x - pointer.lastX;
  pointer.lastX = x;
  aim(sim.target + dx / cssW * 10);
});
function endPointer(e) {
  if (e.pointerId !== pointer.id) return;
  const tap = !pointer.drag && e.type === 'pointerup' && performance.now() - pointer.at < 260;
  pointer.id = null;
  if (tap) stir(pointer.x0, pointer.y0);
  poke();
}
['pointerup', 'pointercancel', 'lostpointercapture'].forEach(t => stage.addEventListener(t, endPointer));
stage.addEventListener('wheel', e => {
  if (!R) return;
  e.preventDefault();
  aim(sim.target + clamp(e.deltaY || e.deltaX, -120, 120) / 120 * 0.2);
}, { passive: false });
stage.addEventListener('keydown', e => {
  if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
  e.preventDefault();
  const q = Math.round(sim.target * 4) / 4;
  aim(e.key === 'ArrowRight' ? q + 0.25 : q - 0.25);
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
if (QA) globalThis.__rose = {
  get busy() { return !!(raf || timer); }, get hour() { return sim.hour; }, get rung() { return D.rung; },
  setHour(h) { sim.follow = false; sim.target = sim.hour = h; draw(); },
  stir: (x, y) => stir(x, y), over(o) { qaOver = o; draw(); }, freeze(on) { frozen = on; if (!on) poke(); },
  run(sec) { for (let s = 0; s < sec; s += 1 / 30) { sim.time += 1 / 30; if (sim.stir[3] < 9) sim.stir[3] += 1 / 30; } draw(); },
  fmt,
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
  sim.time = 40;
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
