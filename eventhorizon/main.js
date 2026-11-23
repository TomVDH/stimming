// Event horizon: a black hole, its lensed disc, a star torn into a stream.
// Drag to orbit the hole; tap to drop a star in.
// Plan: docs/plans/eventhorizon.md. Toy doc: docs/toys/eventhorizon.md.
import { initPage, whenVisible, pageReady, stage as mark, reduced, onReducedChange, audioKit, sound } from '../shared/stim.js';
import { intro as playIntro } from '../shared/intro.js';
import { onContextLoss } from '../shared/gl.js';
import { detail } from '../shared/detail.js';
import { makeCamera, makeStream, launch, stepStream, packStream, SIM, DISC_RATE, STAR_R, CAP, clamp } from './rig.js';
import { makeScene } from './scene.js';
import { makeSound } from './sound.js';
mark('libs');

const ID = 'eventhorizon';
const stage = document.getElementById('stage');
const fail = stage.querySelector('.fail');
const store = {
  get(k) { try { return localStorage.getItem(`stimming.${ID}.${k}`); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(`stimming.${ID}.${k}`, String(v)); } catch { /* private mode */ } },
};

/* ---------- state ---------- */
// The home view: a little above the disc, the near side turning left to right.
const HOME = { yaw: 0.35, pitch: 0.2, dist: 30 };
const DMIN = 17, DMAX = 44;
const savedDist = Number(store.get('dist'));
const cam = makeCamera();
// The view the camera eases toward; a drag moves both at once.
const aim = { yaw: HOME.yaw, pitch: HOME.pitch, dist: savedDist >= DMIN && savedDist <= DMAX ? savedDist : HOME.dist };
Object.assign(cam, aim);
// Glide after a drag: yaw and pitch speeds in rad/s.
const glide = { yaw: 0, pitch: 0 };
const S = makeStream();
const st = { discT: 260, booming: false };

let gl = null, scene = null, raf = 0, timer = 0, visible = true, last = 0, frameNo = 0, calm = reduced();
let cssW = 1, cssH = 1, dpr = 1, started = false, pace = 1, lastInput = 0, wasOn = false;
if (new URLSearchParams(location.search).has('qa')) globalThis.__eh = { S, cam, aim, glide, drop: phi => drop(phi), home: () => home(), get loop() { return { raf, timer, busy: busy(), pace, snd: snd.busy }; } };

/* ---------- bar ---------- */
const ui = initPage({ id: ID, bar: {
  actions: [
    { verb: 'drop', key: 'Space', onPress: () => drop() },
    { verb: 'reset', key: 'R', onPress: () => home() },
  ],
  slider: { label: 'Zoom', min: 0, max: 100, step: 1, value: distToSlider(aim.dist), onInput: v => setDist(sliderToDist(v), false) },
  quality: true,
  keys: [['drag', 'orbit'], ['click', 'drop'], ['scroll', 'zoom']],
  help: [
    ['drag', 'Drag to orbit the black hole and watch the light bend'],
    ['click', 'Click to drop a star in from that side'],
    ['scroll', 'Scroll to move closer or farther'],
    ['arrows', 'Press the arrows to orbit; R brings the view home'],
  ],
} });
const introDone = playIntro({ ready: pageReady() });
const kit = audioKit({ keys: new Set([' ', 'r', 'R', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']), sleepMs: 1500 });
const snd = makeSound(kit);

function distToSlider(d) { return Math.round((1 - (d - DMIN) / (DMAX - DMIN)) * 100); }
function sliderToDist(v) { return DMAX - (v / 100) * (DMAX - DMIN); }
function setDist(d, sync) {
  aim.dist = clamp(d, DMIN, DMAX);
  if (sync) ui.slider?.set?.(distToSlider(aim.dist));
  store.set('dist', aim.dist.toFixed(2));
  lastInput = performance.now();
  poke();
}

/* ---------- GL ---------- */
const canvas = document.createElement('canvas');
canvas.setAttribute('aria-hidden', 'true');
stage.prepend(canvas);
// The trace costs per pixel: a tight pixel budget, two slow-frame rungs.
const D = detail({ maxDpr: 1.5, budget: 1.5e6, steps: 2, settle: 2, onChange: () => resize(true) });

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
  // The second rung traces at three quarters and scales up.
  scene.resize(Math.round(cssW * dpr), Math.round(cssH * dpr), D.rung >= 2 ? 0.75 : 1);
  cam.fit(cssW, cssH, c.top || 0, c.bottom || 0);
  draw();
}

/* ---------- acts ---------- */
const panX = x => clamp((x / cssW) * 2 - 1, -1, 1);
const panOf = p => { const s = cam.project(p); return s ? panX(s[0]) : 0; };

// A star from angle phi, or from the far side of the view when none is given.
function drop(phi) {
  lastInput = performance.now();
  if (phi === undefined) phi = cam.yaw + Math.PI * 0.5 + (Math.random() - 0.5) * 0.9;
  const s = launch(S, phi);
  if (!s) return;
  s.seen = 0;
  snd.arrive(panOf([s.x, 0, s.z]));
  poke();
}
// The tapped spot on the disc plane, as an angle round the hole.
function tapAngle(x, y) {
  const d = cam.ray(x, y), o = cam.pos;
  if (Math.abs(d[1]) > 1e-3) {
    const t = -o[1] / d[1];
    if (t > 0) {
      const px = o[0] + d[0] * t, pz = o[2] + d[2] * t;
      if (Math.hypot(px, pz) < 60) return Math.atan2(pz, px);
    }
  }
  const px = o[0] + d[0] * cam.dist, pz = o[2] + d[2] * cam.dist;
  return Math.atan2(pz, px);
}
function home() {
  lastInput = performance.now();
  aim.yaw = cam.yaw + wrapPi(HOME.yaw - cam.yaw);
  aim.pitch = HOME.pitch;
  glide.yaw = glide.pitch = 0;
  setDist(HOME.dist, true);
}
const wrapPi = a => a - Math.round(a / (Math.PI * 2)) * Math.PI * 2;

/* ---------- step ---------- */
function step(dt, sdt) {
  // The glide decays; reduced motion has none.
  if (pointer.id === null && (glide.yaw || glide.pitch)) {
    aim.yaw += glide.yaw * dt; aim.pitch = clamp(aim.pitch + glide.pitch * dt, -1.35, 1.35);
    const k = Math.exp(-dt / 0.55);
    glide.yaw *= k; glide.pitch *= k;
    if (Math.abs(glide.yaw) + Math.abs(glide.pitch) < 0.004) glide.yaw = glide.pitch = 0;
  }
  const e = 1 - Math.exp(-dt / (calm ? 0.25 : 0.12));
  const y0 = cam.yaw;
  cam.yaw += (aim.yaw - cam.yaw) * e;
  cam.pitch += (aim.pitch - cam.pitch) * e;
  cam.dist += (aim.dist - cam.dist) * (1 - Math.exp(-dt / 0.2));
  swing.v = dt > 0 ? (cam.yaw - y0) / dt : 0;
  swing.dir = Math.sign(swing.v);
  cam.place();
  st.discT += sdt * DISC_RATE;
  stepStream(S, sdt * SIM, calm);
  for (const ev of S.events) if (ev.kind === 'tear') snd.tear(panOf([ev.x, 0, ev.z]));
  S.events.length = 0;
  // A boom when the flare first takes hold.
  if (S.flare > 0.7 && !st.booming) { st.booming = true; snd.boom(0, Math.min(1, S.flare / 1.5)); }
  if (S.flare < 0.2) st.booming = false;
}
const swing = { v: 0, dir: 0 };
// True while something moves fast enough to need every frame.
function busy() {
  return pointer.id !== null || glide.yaw !== 0 || glide.pitch !== 0 || S.stars.length > 0 || S.flare > 0.01
    || Math.abs(aim.yaw - cam.yaw) + Math.abs(aim.pitch - cam.pitch) > 1e-4 || Math.abs(aim.dist - cam.dist) > 1e-3;
}

/* ---------- view ---------- */
const view = {
  cam, time: 0, flare: 0, discK: 0.75, exposure: 0.9, bloomK: 0.38,
  star: new Float32Array(4), starD: new Float32Array(4), starC: new Float32Array(3),
  stream: { buf: S.buf, n: 0, wasOn: false },
};
// The star's surface light: about 6000 K, bright enough to bloom.
const STAR_RGB = [1.0, 0.86, 0.68];
function makeView() {
  const v = view;
  v.time = st.discT;
  v.flare = S.flare;
  // The flare lights the whole frame: more glow, a lift in exposure.
  const fl = Math.min(1.5, S.flare);
  v.bloomK = 0.38 + 0.24 * fl;
  v.exposure = 0.9 * (1 + 0.16 * fl);
  const s = S.stars.find(o => !o.torn);
  if (s) {
    const grow = clamp(s.age / (0.3 * SIM), 0, 1);
    v.star.set([s.x, 0, s.z, STAR_R * (0.3 + 0.7 * grow)]);
    v.starD.set([s.dirx, 0, s.dirz, s.stretch]);
    const k = 3.2 * (0.6 + 0.4 * grow) * (1 + 0.5 * Math.max(0, s.stretch - 1.5));
    v.starC.set(STAR_RGB.map(c => c * k));
  } else v.star[3] = 0;
  v.stream.n = packStream(S, calm ? 0.8 : 1);
  v.stream.wasOn = wasOn;
  wasOn = v.stream.n > 0;
  return v;
}
function draw() {
  if (!scene) return;
  scene.frame(makeView(), { frameNo: calm ? 0 : frameNo, bloomLevels: D.rung >= 2 ? 4 : 5 });
}
// The star's song: its orbit frequency as a tone, panned with it.
function chirp() {
  const s = S.stars.find(o => !o.torn);
  if (!s) return null;
  const r = Math.hypot(s.x, s.z);
  const om = Math.sqrt(0.5 / (r * r * r));
  return { f: clamp(70 + om * 4200, 60, 1400), k: clamp((15.5 - r) / 9, 0, 1) * clamp(s.age / 6, 0, 1), pan: panOf([s.x, 0, s.z]) };
}

/* ---------- frame loop ---------- */
// Lively during input and a star; drifting at 30 fps while the disc turns; asleep after 60 s.
function frame() {
  raf = 0;
  if (!visible || !gl || !started) return;
  const t0 = performance.now();
  const dt = Math.max(0, Math.min(1 / 20, (t0 - last) / 1000));
  last = t0;
  let again = true, lively = true;
  try {
    const idleFor = (t0 - lastInput) / 1000;
    // Past 60 s idle the disc slows to a stop over 2 s.
    const want = idleFor > 60 ? Math.max(0, 1 - (idleFor - 60) / 2) : 1;
    pace = want < pace ? want : pace + (want - pace) * (1 - Math.exp(-dt / 0.4));
    if (pace < 0.002) pace = 0;
    const fast = busy();
    // Reduced motion: the disc holds still; a star still falls, slower.
    const sdt = calm ? (fast ? dt * 0.6 : 0) : (fast ? dt : dt * pace);
    step(dt, sdt);
    draw();
    snd.update(fast ? 1 : pace, S.flare, chirp(), swing);
    D.frame(dt);
    frameNo++;
    lively = busy();
    const drifting = !calm && pace > 0;
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

/* ---------- pointer: drag orbits, tap drops a star ---------- */
const pointer = { id: null, x0: 0, y0: 0, x: 0, y: 0, t: 0, moved: false, vy: 0, vp: 0 };
const local = e => { const r = stage.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
// Radians per CSS pixel: a full stage width turns the view about 200 degrees.
const turnK = () => 3.5 / Math.max(320, cssW);
stage.addEventListener('pointerdown', e => {
  if (e.button !== 0 || !scene || pointer.id !== null || (e.target !== canvas && e.target !== stage)) return;
  try { stage.setPointerCapture(e.pointerId); } catch { /* capture is optional */ }
  const [x, y] = local(e);
  Object.assign(pointer, { id: e.pointerId, x0: x, y0: y, x, y, t: performance.now(), moved: false, vy: 0, vp: 0 });
  glide.yaw = glide.pitch = 0;
  lastInput = performance.now();
  poke();
});
stage.addEventListener('pointermove', e => {
  if (e.pointerId !== pointer.id) return;
  const [x, y] = local(e);
  if (!pointer.moved && Math.hypot(x - pointer.x0, y - pointer.y0) > 8) { pointer.moved = true; stage.classList.add('is-drag'); }
  if (pointer.moved) {
    const now = performance.now(), ddt = Math.max(1, now - pointer.t) / 1000;
    const k = turnK();
    const dy = -(x - pointer.x) * k, dp = (y - pointer.y) * k * 0.8;
    aim.yaw += dy; aim.pitch = clamp(aim.pitch + dp, -1.35, 1.35);
    cam.yaw = aim.yaw; cam.pitch = aim.pitch;
    // A smoothed speed for the glide on release.
    pointer.vy += (dy / ddt - pointer.vy) * 0.35;
    pointer.vp += (dp / ddt - pointer.vp) * 0.35;
    pointer.t = now;
    lastInput = now;
    poke();
  }
  pointer.x = x; pointer.y = y;
});
function endPointer(e) {
  if (e.pointerId !== pointer.id) return;
  if (e.type === 'pointerup' && !pointer.moved) drop(tapAngle(pointer.x0, pointer.y0));
  else if (pointer.moved && !calm && performance.now() - pointer.t < 90) {
    glide.yaw = clamp(pointer.vy, -4, 4);
    glide.pitch = clamp(pointer.vp, -3, 3);
  }
  pointer.id = null;
  stage.classList.remove('is-drag');
  poke();
}
['pointerup', 'pointercancel', 'lostpointercapture'].forEach(t => stage.addEventListener(t, endPointer));
stage.addEventListener('wheel', e => {
  if (!scene) return;
  e.preventDefault();
  setDist(aim.dist * Math.exp(Math.sign(e.deltaY) * 0.06), true);
}, { passive: false });
stage.addEventListener('keydown', e => {
  const k = { ArrowLeft: [0.22, 0], ArrowRight: [-0.22, 0], ArrowUp: [0, 0.12], ArrowDown: [0, -0.12] }[e.key];
  if (!k) return;
  e.preventDefault();
  aim.yaw += k[0];
  aim.pitch = clamp(aim.pitch + k[1], -1.35, 1.35);
  lastInput = performance.now();
  poke();
});

/* ---------- life cycle ---------- */
whenVisible(stage, on => {
  visible = on;
  if (on) { last = performance.now(); schedule(); }
  else { halt(); pointer.id = null; stage.classList.remove('is-drag'); snd.quiet(); }
});
onReducedChange(on => { calm = on; if (on) glide.yaw = glide.pitch = 0; poke(); });
sound.onChange(on => { if (on) poke(); });
new ResizeObserver(() => resize()).observe(stage);
ui.onCover?.(() => resize());

async function setup() {
  gl = canvas.getContext('webgl2', { antialias: false, alpha: false, depth: false, powerPreference: 'high-performance' });
  if (!gl) throw new Error('no webgl2');
  scene = await makeScene(gl, { particles: CAP });
  sizeKey = '';
}
onContextLoss(canvas, {
  lost: () => { halt(); gl = null; scene = null; },
  restored: async () => { await setup(); resize(true); poke(); },
  failed: () => fail.removeAttribute('hidden'),
});

mark('build');
try {
  await setup();
  cam.place();
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

