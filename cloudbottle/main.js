// Cloud in a bottle: a glass jug, a stopper, a hose and a squeeze bulb.
// Squeeze to pump the jug up; pull the stopper and a cloud snaps in.
// Plan: docs/plans/cloudbottle.md. Toy doc: docs/toys/cloudbottle.md.
import { initPage, whenVisible, pageReady, stage as mark, reduced, onReducedChange, audioKit, sound } from '../shared/stim.js';
import { intro as playIntro } from '../shared/intro.js';
import { onContextLoss } from '../shared/gl.js';
import { detail } from '../shared/detail.js';
import { JUG, makeCamera, stopperTop, hosePoints } from './jug.js';
import { makeScene } from './scene.js';
import { makeSound } from './sound.js';
mark('libs');

const ID = 'cloudbottle';
const stage = document.getElementById('stage');
const fail = stage.querySelector('.fail');
const store = {
  get(k) { try { return localStorage.getItem(`stimming.${ID}.${k}`); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(`stimming.${ID}.${k}`, String(v)); } catch { /* private mode */ } },
};
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const rand = (a, b) => a + Math.random() * (b - a);
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };

/* ---------- physics ---------- */
// Gauge pressure in bar. One squeeze adds about 0.045 bar, less as it climbs.
const SQUEEZE_DP = 0.05;
// The fog thins as the walls warm the air.
const FOG_TAU = 40;
const G = 9.81;
// The highest the hose lets the stopper fly, in metres.
const TETHER = 0.085;
const savedSmoke = Number(store.get('smoke'));
const jar = {
  p: 0,
  popAt: rand(0.55, 0.65),
  smoke: clamp(store.get('smoke') !== null && Number.isFinite(savedSmoke) ? savedSmoke : 0.7),
  // The stopper: lift in metres, its speed, two tilts, seated or loose.
  seated: true, lift: 0, vy: 0, tx: 0, tz: 0, ttx: 0, ttz: 0, flying: false, home: 0,
  // The bulb: squash from 0 to 1 and its speed.
  sq: 0, sqv: 0, sqHold: 0,
  // The fog: level, its target, how formed, stir, turbulence, the wisp.
  fog: 0, fogTo: 0, form: 1, spinV: 0, roll: 0, plume: 0, plumeT: 9, t: 0,
  // The gas: the glass's warmth against it, the squeeze jet, the pop's expansion, a fill.
  chill: 0, jet: 0, expand: 0, fill: 0,
  popTimer: -1,
};

let gl = null, scene = null, raf = 0, timer = 0, visible = true, last = 0, frameNo = 0, calm = reduced();
let cssW = 1, cssH = 1, dpr = 1, started = false, pace = 1, lastInput = 0;
const cam = makeCamera();
const hose = new Float32Array(39);
if (new URLSearchParams(location.search).has('qa')) globalThis.__cloud = { jar, cam, squeeze: () => squeeze(), release: () => release(), get loop() { return { raf, timer, busy: busy(), snd: snd.busy, pace }; } };

/* ---------- bar ---------- */
const ui = initPage({ id: ID, bar: {
  actions: [
    { verb: 'pump', key: 'Space', onPress: () => squeeze() },
    { verb: 'release', key: 'Enter', onPress: () => release() },
  ],
  slider: { label: 'Smoke', min: 0, max: 100, step: 1, value: Math.round(jar.smoke * 100), onInput: v => { jar.smoke = v / 100; store.set('smoke', v / 100); poke(); } },
  quality: true,
  keys: [['click', 'pump'], ['drag', 'pull']],
  help: [
    ['click', 'Click to squeeze the bulb and pump the jug up'],
    ['drag', 'Drag the stopper up to pull it and make the cloud'],
    ['Space', 'Press Space to pump'],
    ['Enter', 'Press Enter to pull the stopper'],
  ],
} });
const introDone = playIntro({ ready: pageReady() });
const kit = audioKit({ keys: new Set([' ', 'Enter']), sleepMs: 1500 });
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
  scene.resize(Math.round(cssW * dpr), Math.round(cssH * dpr), D.rung >= 2 ? 3 : 2);
  cam.fit(cssW, cssH, c.top || 0, c.bottom || 0);
  draw();
}

/* ---------- acts ---------- */
const panX = x => clamp((x / cssW) * 2 - 1, -1, 1);
const bulbPan = () => { const s = cam.project(JUG.BULB); return s ? panX(s[0]) : -0.5; };
const jugPan = () => { const s = cam.project([0, JUG.TOP, 0]); return s ? panX(s[0]) : 0; };

// One squeeze of the bulb. A loose stopper goes home first.
function squeeze() {
  lastInput = performance.now();
  jar.sqv = 9;
  const pan = bulbPan();
  if (!jar.seated) {
    // The squeeze pushes the stopper home; the air still goes in.
    jar.seated = true; jar.flying = false; jar.home = 1;
    jar.popAt = rand(0.55, 0.65);
    snd.seat(jugPan());
  }
  const dp = SQUEEZE_DP * (1 - jar.p / 0.95) * rand(0.85, 1.1);
  jar.p = clamp(jar.p + dp, 0, 0.9);
  snd.squeeze(pan, jar.p);
  // Pressure warms the air: droplets evaporate.
  if (jar.fog > 0.002) { jar.fogTo *= 0.45; jar.spinV += calm ? 0 : 0.6; jar.roll = Math.min(1.2, jar.roll + (calm ? 0 : 0.35)); }
  // The air goes in down the stopper; compression warms the gas past the glass.
  jar.jet = calm ? 0 : 1;
  jar.chill = Math.max(-0.5, jar.chill - 0.3);
  // The stopper creeps and creaks near the limit.
  const k = jar.p / jar.popAt;
  if (k > 0.5 && Math.random() < k) snd.creak(jugPan(), k);
  if (jar.p >= jar.popAt && jar.popTimer < 0) jar.popTimer = rand(0.15, 0.4);
  poke();
}

// Pull the stopper. With pressure behind it, it pops.
function release() {
  lastInput = performance.now();
  if (!jar.seated) { poke(); return; }
  pop(jar.p);
  poke();
}

function pop(dp) {
  jar.seated = false; jar.flying = true; jar.popTimer = -1; jar.home = 0;
  const k = clamp(dp / 0.6);
  // The stopper leaves at a speed set by the pressure; the hose holds it.
  jar.vy = calm ? 0.6 : 0.5 + 2.1 * k;
  jar.ttx = rand(0.12, 0.3) * (Math.random() < 0.5 ? -1 : 1);
  jar.ttz = rand(0.2, 0.38);
  // The air expands and cools: fog by the size of the drop and the smoke.
  const frac = sstep(0.03, 0.5, dp);
  const add = frac * (0.15 + 0.85 * jar.smoke);
  if (add > 0.01) {
    const before = jar.fog;
    jar.fogTo = Math.max(jar.fogTo, add);
    jar.fog = Math.max(jar.fog, before);
    jar.form = before > 0.05 ? Math.min(jar.form, 0.6) : 0;
    jar.fill = before > 0.05 ? 0.6 : 0.95;
    jar.plume = calm ? 0 : 0.6 * frac * (0.3 + 0.7 * jar.smoke);
    jar.plumeT = 0;
    jar.spinV = calm ? 0 : 0.5 + 0.8 * k;
    jar.roll = calm ? 0 : 1.2;
    // The cold gas meets warmer glass.
    jar.chill = Math.max(jar.chill, 0.4 + 0.6 * frac);
  }
  // The gas swells and rushes out of the mouth.
  jar.expand = calm ? 0 : k;
  snd.pop(jugPan(), k, add);
  jar.p = 0;
}

/* ---------- step ---------- */
function step(dt) {
  const j = jar;
  j.t += dt;
  // The bulb: a spring toward squashed while held, then back to round.
  if (j.sqv > 0) { j.sq = Math.min(1, j.sq + dt * j.sqv); if (j.sq >= 1) j.sqv = -1; }
  else if (j.sq > 0) { j.sq = Math.max(0, j.sq - dt * 5.5); }
  // An overfull jug pops by itself.
  if (j.popTimer >= 0) { j.popTimer -= dt; if (j.popTimer < 0) pop(j.p); }
  // The stopper.
  if (j.flying) {
    j.vy -= G * dt;
    j.lift += j.vy * dt;
    // The hose is a tether: it snubs the stopper and throws it back.
    if (j.lift > TETHER && j.vy > 0) { j.lift = TETHER; j.vy *= -0.25; snd.land(jugPan(), 0.15); }
    j.tx += (j.ttx - j.tx) * (1 - Math.exp(-dt * 9));
    j.tz += (j.ttz - j.tz) * (1 - Math.exp(-dt * 9));
    // It comes to rest loose on the mouth, bounced by the lip.
    const rest = 0.007;
    if (j.lift < rest && j.vy < 0) {
      j.lift = rest;
      if (j.vy < -0.35) { snd.land(jugPan(), Math.min(1, -j.vy / 2)); j.vy *= -0.28; j.ttx *= 0.7; }
      else { j.vy = 0; j.flying = false; }
    }
  } else if (j.seated) {
    // Seated: it creeps up as the pressure nears the limit.
    const creep = 0.0035 * Math.pow(clamp(j.p / j.popAt), 2.2);
    j.lift += (creep - j.lift) * (1 - Math.exp(-dt * 14));
    j.tx += -j.tx * (1 - Math.exp(-dt * 14));
    j.tz += -j.tz * (1 - Math.exp(-dt * 14));
    j.home = Math.max(0, j.home - dt * 4);
  }
  // The fog forms in a fraction of a second, then thins slowly.
  j.form = Math.min(1, j.form + dt / 0.22);
  j.fogTo *= Math.exp(-dt / FOG_TAU);
  j.fog += (j.fogTo - j.fog) * (1 - Math.exp(-dt / (j.fogTo > j.fog ? 0.05 : 0.35)));
  if (j.fog < 0.004 && j.fogTo < 0.004) { j.fog = 0; j.fogTo = 0; }
  // Stir: a kick dies away to a slow drift while fog remains.
  const drift = calm || j.fog <= 0 ? 0 : 0.07;
  j.spinV = drift + (j.spinV - drift) * Math.exp(-dt / 1.6);
  j.chill *= Math.exp(-dt / 20);
  j.jet *= Math.exp(-dt / 0.2);
  if (j.jet < 0.01) j.jet = 0;
  j.expand *= Math.exp(-dt / 0.1);
  if (j.expand < 0.01) j.expand = 0;
  j.roll = Math.max(calm || j.fog <= 0 ? 0 : 0.25, j.roll * Math.exp(-dt / 3));
  j.plumeT += dt;
  j.plume *= Math.exp(-dt / 0.9);
  if (j.plume < 0.003) j.plume = 0;
}
// True while something moves fast enough to need every frame.
function busy() {
  const j = jar;
  return j.sq > 0 || j.sqv > 0 || j.flying || j.form < 1 || j.plume > 0 || j.popTimer >= 0 || j.home > 0
    || Math.abs(j.fog - j.fogTo) > 0.03 || j.spinV > 0.3;
}

function view() {
  const j = jar;
  const s = j.sq * (calm ? 0.6 : 1);
  const [bx, by, bz] = JUG.BULB_R;
  const bulb = [bx * (1 + 0.12 * s), by * (1 - 0.42 * s), bz * (1 + 0.22 * s), 0];
  const top = stopperTop(j.lift, j.tx, j.tz);
  const nozzle = [JUG.BULB[0] + bulb[0] + 0.02, bulb[1] + 0.002, JUG.BULB[2]];
  const up = [Math.sin(-j.tz) * 0.6, 1, Math.sin(j.tx) * 0.6];
  hosePoints(hose, top, nozzle, up, j.flying ? clamp(j.vy) : 0);
  return {
    cam,
    stop: [j.lift, j.tx, j.tz, j.seated ? 1 : 0],
    bulb,
    hose,
    key: KEY,
    fog: { dens: j.fog, form: j.form, t: j.t, plume: j.plume, plumeT: j.plumeT },
  };
}
// The key light: a cool spot at the back left, a little above.
const KEY = (() => { const v = [-0.68, 0.7, -0.42]; const l = Math.hypot(...v); return v.map(x => x / l); })();

// One fluid step. Reduced motion only fills the cloud in place.
function sim(dt) {
  const j = jar;
  scene.sim({
    dt: calm ? 0 : dt, t: j.t, open: !j.seated, fill: j.fill, wall: j.chill,
    turb: 0.05 * (0.4 + 1.6 * j.roll), jet: j.jet, expand: 0.0012 * j.expand,
  });
  j.fill = 0;
}

function draw() {
  if (!scene) return;
  scene.frame(view(), { frameNo: calm ? 0 : frameNo, bloomLevels: D.rung >= 2 ? 3 : 5 });
}

/* ---------- frame loop ---------- */
// Lively while parts move; drifting at 30 fps while fog swirls; asleep after 60 s idle.
function frame() {
  raf = 0;
  if (!visible || !gl || !started) return;
  const t0 = performance.now();
  const dt = Math.max(0, Math.min(1 / 20, (t0 - last) / 1000));
  last = t0;
  let again = true, lively = true;
  try {
    const idleFor = (t0 - lastInput) / 1000;
    // Past 60 s idle the swirl slows to a stop over 2 s.
    const want = idleFor > 60 ? Math.max(0, 1 - (idleFor - 60) / 2) : 1;
    pace = want < pace ? want : pace + (want - pace) * (1 - Math.exp(-dt / 0.4));
    if (pace < 0.002) pace = 0;
    const fast = busy();
    // Hands-on events run at full pace, even past the idle mark.
    const sdt = fast ? dt : dt * pace;
    step(sdt);
    sim(sdt);
    if (pointer.id !== null && pointer.hold && performance.now() - pointer.lastPump > 420) { pointer.lastPump = performance.now(); squeeze(); }
    draw();
    D.frame(dt);
    frameNo++;
    lively = busy() || pointer.id !== null;
    const drifting = (jar.fog > 0 && !calm) && pace > 0;
    again = lively || drifting;
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
  if (!raf && !timer) last = performance.now();
  if (timer) { clearTimeout(timer); timer = 0; }
  schedule();
}
function halt() { cancelAnimationFrame(raf); raf = 0; clearTimeout(timer); timer = 0; }

/* ---------- pointer: tap squeezes, hold keeps pumping, drag up pulls the stopper ---------- */
const pointer = { id: null, x0: 0, y0: 0, t: 0, moved: false, hold: false, onStop: false, lastPump: 0, holdTimer: 0 };
const local = e => { const r = stage.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
function nearStopper(x, y) {
  const s = cam.project(stopperTop(jar.lift, jar.tx, jar.tz));
  if (!s) return false;
  const r = Math.max(30, 0.05 / cam.scale([0, JUG.TOP, 0]));
  return Math.hypot(x - s[0], y - s[1]) < r;
}
stage.addEventListener('pointerdown', e => {
  if (e.button !== 0 || !scene || pointer.id !== null || (e.target !== canvas && e.target !== stage)) return;
  try { stage.setPointerCapture(e.pointerId); } catch { /* capture is optional */ }
  const [x, y] = local(e);
  Object.assign(pointer, { id: e.pointerId, x0: x, y0: y, t: performance.now(), moved: false, hold: false, onStop: jar.seated && nearStopper(x, y) });
  lastInput = performance.now();
  // A press away from the stopper squeezes at once.
  if (!pointer.onStop) { squeeze(); pointer.lastPump = performance.now(); }
  else snd.grip(jugPan());
  clearTimeout(pointer.holdTimer);
  pointer.holdTimer = setTimeout(() => { if (pointer.id !== null && !pointer.moved && !pointer.onStop) { pointer.hold = true; poke(); } }, 260);
  poke();
});
stage.addEventListener('pointermove', e => {
  if (e.pointerId !== pointer.id) return;
  const [x, y] = local(e);
  if (!pointer.moved && Math.hypot(x - pointer.x0, y - pointer.y0) > 8) pointer.moved = true;
  // A pull up on the stopper pops it.
  if (pointer.onStop && jar.seated && pointer.y0 - y > 18) { release(); pointer.onStop = false; }
  else if (pointer.onStop && jar.seated) { jar.lift = Math.max(jar.lift, clamp((pointer.y0 - y) * cam.scale([0, JUG.TOP, 0]) * 0.2, 0, 0.003)); poke(); }
});
function endPointer(e) {
  if (e.pointerId !== pointer.id) return;
  // A tap on the stopper squeezes too.
  if (e.type === 'pointerup' && pointer.onStop && !pointer.moved && jar.seated) squeeze();
  pointer.id = null; pointer.hold = false;
  clearTimeout(pointer.holdTimer);
  poke();
}
['pointerup', 'pointercancel', 'lostpointercapture'].forEach(t => stage.addEventListener(t, endPointer));

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
  restored: async () => { await setup(); prewarmGas(); resize(true); poke(); },
  failed: () => fail.removeAttribute('hidden'),
});

// The first frame is a picture: a cloud a few seconds old, the stopper loose on the mouth.
function prewarm() {
  Object.assign(jar, { seated: false, lift: 0.007, tx: 0.16, tz: 0.26, ttx: 0.16, ttz: 0.26, p: 0 });
  jar.fog = jar.fogTo = 0.15 + 0.85 * jar.smoke;
  jar.form = 1; jar.roll = 0.4; jar.spinV = 0.15; jar.t = 0;
  jar.plume = 0; jar.plumeT = 9; jar.chill = 0.8; jar.fill = 1;
  prewarmGas();
}
// Three seconds of gas: the warm glass sets up its slow roll.
// A restored context runs it again, since the grid died with the old one.
function prewarmGas() {
  if (jar.fog > 0) jar.fill = 1;
  for (let i = 0; i < 90; i++) { jar.t += 1 / 30; sim(1 / 30); }
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
  // The intro's end is no input: the cloud starts out drifting.
  lastInput = performance.now() - 1500;
  poke();
} catch (err) {
  console.error(err);
  fail.removeAttribute('hidden');
  ui.hideControls?.();
}
