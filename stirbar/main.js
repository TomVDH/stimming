// Stir vortex: a beaker on a magnetic stirrer, a funnel, dye in threads.
// Turn the knob to spin the bar; tap to drop dye from a pipette.
// Plan: docs/plans/stirbar.md. Toy doc: docs/toys/stirbar.md.
import { initPage, whenVisible, pageReady, stage as mark, reduced, onReducedChange, audioKit, sound } from '../shared/stim.js';
import { intro as playIntro } from '../shared/intro.js';
import { onContextLoss } from '../shared/gl.js';
import { detail } from '../shared/detail.js';
import { RIG, makeCamera, surfaceY, dipOf, OMEGA0, makeDye, addDrop, clearDye, stepDye, packDye, MIX_TINT } from './rig.js';
import { makeScene, DYES } from './scene.js';
import { makeSound } from './sound.js';
mark('libs');

const ID = 'stirbar';
const stage = document.getElementById('stage');
const fail = stage.querySelector('.fail');
const store = {
  get(k) { try { return localStorage.getItem(`stimming.${ID}.${k}`); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(`stimming.${ID}.${k}`, String(v)); } catch { /* private mode */ } },
};
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const rand = (a, b) => a + Math.random() * (b - a);
const ease = t => 1 - (1 - t) * (1 - t) * (1 - t);

/* ---------- state ---------- */
// Bar turns per second at full speed: about 1200 rpm.
const BAR_REV = 20;
const DYE_KEYS = ['blue', 'violet', 'green'];
const savedDye = DYE_KEYS.indexOf(store.get('dye'));
const st = {
  // Knob setting, bar speed and water spin, each 0 to 1.
  set: 0.6, bar: 0.6, spin: 0.6,
  barAng: 0, wobAng: 0, t: 0, core: 0, drift: 0,
  dye: savedDye >= 0 ? savedDye : 0,
  // The last drop's ripple: x, z, age, strength.
  rip: [0, 0, 9, 0],
  // Rinse: from 1 down to 0 while the water runs clear.
  rinse: 0,
  tick: 0,
};
// The pipette: a queue of targets and one drop in the air.
const pip = { on: false, x: 0, z: 0, y: 0, sq: 0, phase: 'gone', t: 0, queue: [], fromY: 0, dropDye: 0, released: false };
const drop = { on: false, x: 0, y: 0, z: 0, vy: 0, dye: 0 };
const dye = makeDye();

let gl = null, scene = null, raf = 0, timer = 0, visible = true, last = 0, frameNo = 0, calm = reduced();
let cssW = 1, cssH = 1, dpr = 1, started = false, pace = 1, lastInput = 0, lastDt = 1 / 60;
const cam = makeCamera();
if (new URLSearchParams(location.search).has('qa')) globalThis.__stir = { st, pip, dye, cam, drip: (x, z) => drip(x, z), setSpeed: v => setSpeed(v, true), rinse: () => rinse(), get loop() { return { raf, timer, busy: busy(), pace, snd: snd.busy }; } };

/* ---------- bar ---------- */
const ui = initPage({ id: ID, bar: {
  choice: {
    label: 'Dye',
    value: DYE_KEYS[st.dye],
    options: [
      { value: 'blue', label: 'Blue', dot: 'oklch(0.55 0.2 255)', key: '1' },
      { value: 'violet', label: 'Violet', dot: 'oklch(0.5 0.22 320)', key: '2' },
      { value: 'green', label: 'Green', dot: 'oklch(0.85 0.2 135)', key: '3' },
    ],
    onPick: v => { st.dye = Math.max(0, DYE_KEYS.indexOf(v)); store.set('dye', v); lastInput = performance.now(); poke(); },
  },
  actions: [
    { verb: 'drop', key: 'Space', onPress: () => drip() },
    { verb: 'rinse', key: 'R', onPress: () => rinse() },
  ],
  slider: { label: 'Speed', min: 0, max: 100, step: 1, value: Math.round(st.set * 100), onInput: v => setSpeed(v / 100, false) },
  quality: true,
  keys: [['click', 'drop'], ['drag', 'turn'], ['arrows', 'speed']],
  help: [
    ['click', 'Tap the water to drop dye from the pipette'],
    ['drag', 'Drag the knob up or down to set the speed'],
    ['arrows', 'Press the arrows to turn the knob'],
    ['R', 'Press R to rinse the beaker clean'],
  ],
} });
const introDone = playIntro({ ready: pageReady() });
const kit = audioKit({ keys: new Set([' ', 'r', 'R', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']), sleepMs: 1500 });
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
  const key = [cssW, cssH, dpr, c.top || 0, c.bottom || 0, D.rung].map(v => Math.round(v * 100)).join();
  if (!force && key === sizeKey) return;
  sizeKey = key;
  const k = D.rung >= 2 ? 0.75 : 1;
  scene.resize(Math.round(cssW * dpr * k), Math.round(cssH * dpr * k));
  cam.fit(cssW, cssH, c.top || 0, c.bottom || 0);
  draw();
}

/* ---------- acts ---------- */
const panX = x => clamp((x / cssW) * 2 - 1, -1, 1);
const beakerPan = () => { const s = cam.project([0, RIG.WL, 0]); return s ? panX(s[0]) : 0; };
const knobPan = () => { const s = cam.project([RIG.KX, RIG.KY, RIG.BZ]); return s ? panX(s[0]) : 0.3; };

// The knob: 0 to 1. Ticks sound at each tenth.
function setSpeed(v, sync) {
  const before = st.set;
  st.set = clamp(v);
  if (sync) ui.slider?.set?.(Math.round(st.set * 100));
  const a = Math.floor(before * 20), b = Math.floor(st.set * 20);
  if (a !== b) snd.tick(knobPan(), st.set);
  if (before === 0 && st.set > 0) snd.click(knobPan(), true);
  if (before > 0 && st.set === 0) snd.click(knobPan(), false);
  lastInput = performance.now();
  poke();
}

// A drop of dye at (x, z) on the surface; random when not given.
function drip(x, z) {
  lastInput = performance.now();
  if (x === undefined) {
    const a = rand(0, Math.PI * 2), r = rand(0.35, 0.75) * RIG.RI;
    x = Math.cos(a) * r; z = Math.sin(a) * r;
  }
  // Two drops at most wait their turn.
  if (pip.queue.length < 2) pip.queue.push([x, z, st.dye]);
  if (pip.phase === 'gone' || pip.phase === 'out') nextPip();
  poke();
}
function nextPip() {
  const n = pip.queue.shift();
  if (!n) return;
  const [x, z, d] = n;
  pip.fromY = pip.phase === 'gone' ? RIG.TOP + 0.17 : pip.y;
  pip.fromX = pip.phase === 'gone' ? x : pip.x;
  pip.fromZ = pip.phase === 'gone' ? z : pip.z;
  pip.tx = x; pip.tz = z; pip.dropDye = d;
  pip.phase = 'in'; pip.t = 0; pip.on = true; pip.released = false;
  snd.whoosh(panX(cam.project([x, RIG.WL, z])?.[0] ?? cssW / 2), 0.4);
}

// Rinse: the water runs clear in a second and a half.
function rinse() {
  lastInput = performance.now();
  if (st.rinse > 0) return;
  st.rinse = 1;
  snd.pour(beakerPan());
  poke();
}

/* ---------- step ---------- */
function step(dt) {
  st.t += dt;
  // The motor follows the knob in about half a second.
  st.bar += (st.set - st.bar) * (1 - Math.exp(-dt / (calm ? 0.9 : 0.45)));
  if (Math.abs(st.set - st.bar) < 0.0005) st.bar = st.set;
  // The water spins up in two seconds and down over ten.
  const tau = st.bar > st.spin ? (calm ? 3.2 : 1.9) : 9;
  st.spin += (st.bar - st.spin) * (1 - Math.exp(-dt / tau));
  if (st.spin < 0.002 && st.bar === 0) st.spin = 0;
  st.barAng = (st.barAng + st.bar * BAR_REV * 2 * Math.PI * dt) % (Math.PI * 2);
  // The funnel tip wanders round slowly.
  st.wobAng += dt * (1.1 + 2.5 * st.spin);
  // The thread pattern turns with the core and slides down it.
  st.core = (st.core + OMEGA0 * 0.55 * st.spin * dt) % (Math.PI * 2);
  st.drift = (st.drift + 2.4 * st.spin * dt) % (Math.PI * 2);
  const dip = dipOf(st.spin);
  // The pipette.
  if (pip.phase !== 'gone') {
    pip.t += dt;
    const hover = RIG.WL + 0.024;
    if (pip.phase === 'in') {
      const k = ease(clamp(pip.t / 0.32));
      pip.x = pip.fromX + (pip.tx - pip.fromX) * k;
      pip.z = pip.fromZ + (pip.tz - pip.fromZ) * k;
      pip.y = pip.fromY + (hover - pip.fromY) * k;
      pip.sq = Math.max(0, pip.sq - dt * 6);
      if (pip.t >= 0.32) { pip.phase = 'squeeze'; pip.t = 0; snd.squeeze(panX(cam.project([pip.x, pip.y, pip.z])?.[0] ?? 0)); }
    } else if (pip.phase === 'squeeze') {
      pip.sq = Math.sin(clamp(pip.t / 0.26) * Math.PI);
      if (!pip.released && pip.t > 0.11) {
        pip.released = true;
        Object.assign(drop, { on: true, x: pip.x, y: pip.y - 0.002, z: pip.z, vy: -0.05, dye: pip.dropDye });
      }
      if (pip.t >= 0.3) { pip.phase = pip.queue.length ? 'next' : 'out'; pip.t = 0; pip.fromY = pip.y; }
    } else if (pip.phase === 'next') {
      if (pip.t > 0.05) nextPip();
    } else if (pip.phase === 'out') {
      const k = ease(clamp(pip.t / 0.45));
      pip.y = pip.fromY + (RIG.TOP + 0.19 - pip.fromY) * k;
      if (pip.t >= 0.45) { pip.phase = 'gone'; pip.on = false; }
    }
  }
  // The drop falls and lands in the water.
  if (drop.on) {
    drop.vy -= 9.81 * dt;
    drop.y += drop.vy * dt;
    const r = Math.hypot(drop.x, drop.z);
    const ys = surfaceY(r, dip);
    if (drop.y <= ys) {
      drop.on = false;
      const v = -drop.vy;
      addDrop(dye, drop.x, drop.z, drop.dye, dip, clamp(v / 0.7, 0.4, 1.3));
      st.rip = [drop.x, drop.z, 0, calm ? 0.4 : 1];
      snd.plip(panX(cam.project([drop.x, ys, drop.z])?.[0] ?? 0), clamp(v / 0.8, 0.3, 1));
    }
  }
  st.rip[2] += dt;
  // Rinse: the dye fades out as clean water runs through.
  if (st.rinse > 0) {
    st.rinse = Math.max(0, st.rinse - dt / 1.5);
    if (st.rinse === 0) clearDye(dye);
  }
  stepDye(dye, dt, st.spin, dip, calm);
}
// True while something moves fast enough to need every frame.
function busy() {
  // The water settling after a knob turn is drift: it runs at 30 fps.
  return pip.phase !== 'gone' || drop.on || st.rinse > 0 || Math.abs(st.set - st.bar) > 0.001
    || dye.drops.some(d => d.age < 6) || st.rip[2] < 1.5;
}
// True while there is any motion left to show.
function moving() {
  return st.spin > 0.002 || st.bar > 0 || dye.drops.some(d => d.age < 40);
}

/* ---------- view ---------- */
// The key light: a cool spot at the back left, well above.
const KEY = (() => { const v = [-0.5, 0.78, -0.5]; const l = Math.hypot(...v); return v.map(x => x / l); })();
const view = {
  cam, key: KEY, knob: 0, lamp: 0, bar: new Float32Array(4), dip: 0,
  wob: new Float32Array(4), rip: new Float32Array(4), pip: new Float32Array(4), drop: new Float32Array(4),
  dropC: new Float32Array(3), tint: new Float32Array(3), swirl: new Float32Array(3), dye: { buf: dye.buf, n: 0 },
};
function makeView() {
  const v = view;
  v.knob = (-0.75 + 1.5 * st.set) * Math.PI;
  v.lamp = st.bar > 0 ? 0.25 + 0.75 * st.bar : 0;
  // The blur arc: how far the bar turns while the eye takes one frame in.
  const arc = st.bar * BAR_REV * 2 * Math.PI * clamp(lastDt, 1 / 120, 1 / 30) * 1.2;
  v.bar[0] = st.barAng; v.bar[1] = Math.max(arc, 0.0001); v.bar[2] = 1; v.bar[3] = 0;
  v.dip = dipOf(st.spin);
  const w = 0.0011 * st.spin * st.spin;
  v.wob[0] = Math.cos(st.wobAng) * w; v.wob[1] = Math.sin(st.wobAng) * w;
  v.rip.set(st.rip);
  v.swirl[0] = st.core; v.swirl[1] = st.drift; v.swirl[2] = 0.85 * Math.min(1, st.spin * 1.6);
  if (pip.on) v.pip.set([pip.x, pip.y, pip.z, pip.sq]); else v.pip[3] = -1;
  if (drop.on) v.drop.set([drop.x, drop.y, drop.z, 1]); else v.drop[3] = 0;
  v.dropC.set(DYES[pip.on ? pip.dropDye : drop.dye]);
  const fade = st.rinse > 0 ? st.rinse : 1;
  for (let k = 0; k < 3; k++) v.tint[k] = 0;
  for (let d = 0; d < 3; d++) for (let k = 0; k < 3; k++) v.tint[k] += DYES[d][k] * dye.tint[d] * MIX_TINT * fade;
  v.dye.n = packDye(dye, fade);
  return v;
}

function draw() {
  if (!scene) return;
  scene.frame(makeView(), { frameNo: calm ? 0 : frameNo, bloomLevels: D.rung >= 2 ? 3 : 5 });
}

/* ---------- frame loop ---------- */
// Lively while things change; drifting at 30 fps while the water turns; asleep after 60 s idle.
function frame() {
  raf = 0;
  if (!visible || !gl || !started) return;
  const t0 = performance.now();
  const dt = Math.max(0, Math.min(1 / 20, (t0 - last) / 1000));
  last = t0;
  let again = true, lively = true;
  try {
    const idleFor = (t0 - lastInput) / 1000;
    // Past 60 s idle the whole scene slows to a stop over 2 s.
    const want = idleFor > 60 ? Math.max(0, 1 - (idleFor - 60) / 2) : 1;
    pace = want < pace ? want : pace + (want - pace) * (1 - Math.exp(-dt / 0.4));
    if (pace < 0.002) pace = 0;
    const fast = busy();
    const sdt = (fast ? dt : dt * pace) * (calm ? 0.6 : 1);
    lastDt = Math.max(1 / 120, dt * (fast ? 1 : pace));
    step(sdt);
    if (pointer.id !== null && pointer.hold && !pointer.onKnob && t0 - pointer.lastDrip > 650) { pointer.lastDrip = t0; drip(...pointer.target); }
    draw();
    snd.update(sdt > 0 ? st.bar * (fast ? 1 : pace) : 0, st.spin * (fast ? 1 : pace), beakerPan());
    D.frame(dt);
    frameNo++;
    lively = busy() || pointer.id !== null;
    const drifting = moving() && pace > 0;
    again = lively || drifting;
  } finally {
    // A thrown error still leaves the loop able to wake.
    if (again) schedule(lively ? 0 : t0 + 34 - performance.now()); else rest();
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
  if (!raf && !timer) last = performance.now();
  if (timer) { clearTimeout(timer); timer = 0; }
  schedule();
}
function halt() { cancelAnimationFrame(raf); raf = 0; clearTimeout(timer); timer = 0; }

/* ---------- pointer: tap drops dye, hold drips, drag the knob ---------- */
const pointer = { id: null, x0: 0, y0: 0, set0: 0, moved: false, hold: false, onKnob: false, lastDrip: 0, holdTimer: 0, target: [0, 0] };
const local = e => { const r = stage.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
function nearKnob(x, y) {
  const s = cam.project([RIG.KX, RIG.KY, RIG.BZ + RIG.KD]);
  if (!s) return false;
  const r = Math.max(26, (RIG.KR * 1.7) / cam.scale([RIG.KX, RIG.KY, RIG.BZ]));
  return Math.hypot(x - s[0], y - s[1]) < r;
}
// A stage point to a spot on the water: the ray meets the rest level, kept inside the glass.
function waterSpot(x, y) {
  const d = cam.ray(x, y), o = cam.pos;
  let px, pz;
  if (d[1] < -1e-3) { const t = (RIG.WL - o[1]) / d[1]; px = o[0] + d[0] * t; pz = o[2] + d[2] * t; }
  else { px = (x / cssW - 0.5) * 0.2; pz = 0; }
  const r = Math.hypot(px, pz), lim = RIG.RI * 0.8;
  if (r > lim) { px *= lim / r; pz *= lim / r; }
  return [px, pz];
}
stage.addEventListener('pointerdown', e => {
  if (e.button !== 0 || !scene || pointer.id !== null || (e.target !== canvas && e.target !== stage)) return;
  try { stage.setPointerCapture(e.pointerId); } catch { /* capture is optional */ }
  const [x, y] = local(e);
  Object.assign(pointer, { id: e.pointerId, x0: x, y0: y, set0: st.set, moved: false, hold: false, onKnob: nearKnob(x, y), lastDrip: performance.now() });
  lastInput = performance.now();
  if (pointer.onKnob) snd.grip(knobPan());
  else { pointer.target = waterSpot(x, y); drip(...pointer.target); }
  clearTimeout(pointer.holdTimer);
  pointer.holdTimer = setTimeout(() => { if (pointer.id !== null && !pointer.moved) { pointer.hold = true; poke(); } }, 260);
  poke();
});
stage.addEventListener('pointermove', e => {
  if (e.pointerId !== pointer.id) return;
  const [x, y] = local(e);
  if (!pointer.moved && Math.hypot(x - pointer.x0, y - pointer.y0) > 8) pointer.moved = true;
  if (pointer.onKnob) setSpeed(pointer.set0 + ((x - pointer.x0) - (y - pointer.y0)) / 220, true);
  else if (pointer.moved) pointer.target = waterSpot(x, y);
});
function endPointer(e) {
  if (e.pointerId !== pointer.id) return;
  // A tap on the knob steps it a little.
  if (e.type === 'pointerup' && pointer.onKnob && !pointer.moved) setSpeed(st.set > 0.95 ? 0 : Math.min(1, Math.round(st.set * 10 + 1) / 10), true);
  pointer.id = null; pointer.hold = false;
  clearTimeout(pointer.holdTimer);
  poke();
}
['pointerup', 'pointercancel', 'lostpointercapture'].forEach(t => stage.addEventListener(t, endPointer));
stage.addEventListener('wheel', e => {
  if (!scene) return;
  e.preventDefault();
  setSpeed(st.set - Math.sign(e.deltaY) * 0.04, true);
}, { passive: false });
stage.addEventListener('keydown', e => {
  if (e.key === 'ArrowUp' || e.key === 'ArrowRight') { setSpeed(st.set + 0.05, true); e.preventDefault(); }
  else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') { setSpeed(st.set - 0.05, true); e.preventDefault(); }
});

/* ---------- life cycle ---------- */
whenVisible(stage, on => {
  visible = on;
  if (on) { last = performance.now(); schedule(); }
  else { halt(); pointer.id = null; pointer.hold = false; snd.quiet(); }
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

// The first frame is a picture: the stirrer at work, two drops already wound into threads.
function prewarm() {
  st.set = st.bar = st.spin = 0.6;
  const dip = dipOf(st.spin);
  addDrop(dye, 0.022, 0.012, st.dye, dip, 1);
  runFor(4, dip);
  addDrop(dye, -0.018, -0.02, st.dye, dip, 1);
  runFor(2.6, dip);
}
function runFor(secs, dip) {
  const n = Math.round(secs * 40);
  for (let i = 0; i < n; i++) { stepDye(dye, 1 / 40, st.spin, dip, calm); st.barAng += 0.3; st.wobAng += 0.07; }
  for (const d of dye.drops) d.age = 30;
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
  lastInput = performance.now() - 1500;
  poke();
} catch (err) {
  console.error(err);
  fail.removeAttribute('hidden');
  ui.hideControls?.();
}
