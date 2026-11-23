// Milk crown: a drop into milk in slow motion; the crown, the beads, the jet.
// Tap to drop; drag to scrub the moment; release and it plays on to rest.
// Plan: docs/plans/milkcrown.md. Toy doc: docs/toys/milkcrown.md.
import { initPage, whenVisible, pageReady, stage as mark, reduced, onReducedChange, audioKit, sound } from '../shared/stim.js';
import { intro as playIntro } from '../shared/intro.js';
import { onContextLoss } from '../shared/gl.js';
import { detail } from '../shared/detail.js';
import { makeEvent, frameAt, makeUniforms, cuesBetween, T_PINCH } from './event.js';
import { makeScene } from './scene.js';
import { makeSound } from './sound.js';
mark('libs');

const ID = 'milkcrown';
const stage = document.getElementById('stage');
const fail = stage.querySelector('.fail');
const store = {
  get(k) { try { return localStorage.getItem(`stimming.${ID}.${k}`); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(`stimming.${ID}.${k}`, String(v)); } catch { /* private mode */ } },
};
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };

/* ---------- state ---------- */
// One film frame of the high-speed camera: 4000 frames a second.
const FRAME = 0.25;
// Backdrop colours, linear: the sweep and the lit spot behind the set.
const BACKS = {
  blue: { back: [0.006, 0.02, 0.065], spot: [0.03, 0.1, 0.3] },
  red: { back: [0.055, 0.005, 0.007], spot: [0.32, 0.035, 0.03] },
  black: { back: [0.005, 0.005, 0.006], spot: [0.035, 0.036, 0.04] },
};
const savedBack = store.get('backdrop');
const savedH = Number(store.get('height'));
const st = {
  back: BACKS[savedBack] ? savedBack : 'blue',
  height: savedH >= 10 && savedH <= 60 ? savedH : 35,
  seed: 7,
  // Event time in ms, and how the playhead moves: still, play, scrub.
  t: 8.6, mode: 'still', holdUntil: 0,
};
let ev = makeEvent(st.height, st.seed);
const U = makeUniforms();

let gl = null, scene = null, raf = 0, visible = true, last = 0, frameNo = 0, calm = reduced();
let cssW = 1, cssH = 1, started = false;

/* ---------- camera: a macro lens low over the milk ---------- */
const norm = v => { const l = Math.hypot(...v); return v.map(x => x / l); };
const sub = (a, b) => a.map((x, i) => x - b[i]);
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const cam = { pos: [0, 0, 0], rot: new Float32Array(9), lens: [0.2, 0.15, 0], right: [1, 0, 0], up: [0, 1, 0], back: [0, 0, 1], w: 1, h: 1 };
cam.fit = (w, h, top = 0, bottom = 0) => {
  cam.w = w; cam.h = h;
  const asp = w / h;
  const free = Math.max(0.4, (h - top - bottom) / h);
  const el = 13 * Math.PI / 180, d = 165;
  // The set: 45 mm wide, 28 mm tall round the aim.
  const narrow = asp < 0.8;
  const aim = [0, narrow ? 6 : 4.5, 0];
  const tanY = Math.max(28 / (2 * d * free), (narrow ? 32 : 45) / (2 * d * asp));
  cam.lens = [tanY * asp, tanY, (bottom - top) / h];
  cam.pos = [aim[0], aim[1] + Math.sin(el) * d, aim[2] + Math.cos(el) * d];
  const back = norm(sub(cam.pos, aim));
  const right = norm(cross([0, 1, 0], back));
  const up = cross(back, right);
  cam.right = right; cam.up = up; cam.back = back;
  cam.rot.set([...right, ...up, ...back]);
};
// A world point to stage CSS pixels.
cam.project = p => {
  const v = sub(p, cam.pos);
  const z = -dot(v, cam.back);
  if (z <= 1e-4) return null;
  const sx = dot(v, cam.right) / z / cam.lens[0];
  const sy = dot(v, cam.up) / z / cam.lens[1] + cam.lens[2];
  return [(sx + 1) / 2 * cam.w, (1 - sy) / 2 * cam.h];
};

if (new URLSearchParams(location.search).has('qa')) globalThis.__milk = { st, cam, get ev() { return ev; }, drop: () => drop(), seek: t => { st.t = t; st.mode = 'scrub'; draw(); }, get loop() { return { raf, busy: busy() }; } };

/* ---------- bar ---------- */
const ui = initPage({ id: ID, bar: {
  choice: {
    label: 'Backdrop',
    value: st.back,
    options: [
      { value: 'blue', label: 'Blue', dot: 'oklch(0.42 0.14 255)', key: '1' },
      { value: 'red', label: 'Red', dot: 'oklch(0.48 0.18 25)', key: '2' },
      { value: 'black', label: 'Black', dot: 'oklch(0.22 0.005 255)', key: '3' },
    ],
    onPick: v => { if (!BACKS[v]) return; st.back = v; store.set('backdrop', v); draw(); },
  },
  actions: [
    { verb: 'drop', key: 'Space', onPress: () => drop() },
  ],
  slider: { label: 'Height', min: 10, max: 60, step: 1, value: st.height, onInput: v => { st.height = v; store.set('height', v); } },
  quality: true,
  keys: [['click', 'drop'], ['drag', 'scrub'], ['arrows', 'step']],
  help: [
    ['click', 'Tap the stage to release a drop'],
    ['drag', 'Drag left or right to scrub the moment'],
    ['hold', 'Hold still to freeze a frame; let go to play on'],
    ['arrows', 'Press the arrows to step one frame'],
  ],
} });
const introDone = playIntro({ ready: pageReady() });
const kit = audioKit({ keys: new Set([' ', 'ArrowLeft', 'ArrowRight']), sleepMs: 1500 });
const snd = makeSound(kit);

/* ---------- GL ---------- */
const canvas = document.createElement('canvas');
canvas.setAttribute('aria-hidden', 'true');
stage.prepend(canvas);
const D = detail({ maxDpr: 2, budget: 2.4e6, steps: 2, settle: 2, onChange: () => resize(true) });

let sizeKey = '';
function resize(force = false) {
  if (!gl || !scene) return;
  const r = stage.getBoundingClientRect();
  cssW = Math.max(1, r.width); cssH = Math.max(1, r.height);
  const dpr = D.dpr(cssW, cssH);
  const c = ui.cover?.() || { top: 0, bottom: 0 };
  const key = [cssW, cssH, dpr, c.top || 0, c.bottom || 0, D.rung].map(v => Math.round(v * 100)).join();
  if (!force && key === sizeKey) return;
  sizeKey = key;
  const ow = Math.round(cssW * dpr), oh = Math.round(cssH * dpr);
  // The march runs larger than the canvas while the budget allows: thin edges stay clean.
  const ss = D.rung >= 1 ? 1 : clamp(Math.sqrt(2.4e6 / (ow * oh)), 1, 1.5);
  scene.resize(ow, oh, Math.round(ow * ss), Math.round(oh * ss));
  cam.fit(cssW, cssH, c.top || 0, c.bottom || 0);
  draw();
}

/* ---------- acts ---------- */
// A new drop from the slider's height. Each drop has its own jitter.
function drop() {
  st.seed = (st.seed * 48271 + 11) % 2147483647;
  ev = makeEvent(st.height, st.seed);
  st.t = ev.t0;
  st.mode = 'play';
  snd.release();
  poke();
}

// Event ms per second of play: slow motion, then a speed ramp while the droplet flies.
function rate(t) {
  let r = 9;
  r += 30 * sstep(T_PINCH + 4, T_PINCH + 18, t);
  // The droplet's return slows down again, so its splash reads.
  r -= 20 * sstep(ev.tLand - 14, ev.tLand - 2, t) * (1 - sstep(ev.tLand + 8, ev.tLand + 26, t));
  return r * (calm ? 0.75 : 1);
}
// Moves the playhead to t and plays the sound cues on the way.
function seek(t, cues) {
  const a = st.t;
  st.t = clamp(t, ev.t0, ev.tEnd);
  if (cues && st.t > a) for (const [, kind, v] of cuesBetween(ev, a, st.t)) snd.cue(kind, v, cuePan(kind, v));
}
function cuePan(kind, v) {
  if (kind !== 'bead' && kind !== 'beadland') return 0;
  const a = v * Math.PI * 2;
  return clamp(Math.cos(a) * 0.7, -1, 1);
}

/* ---------- step ---------- */
function step(dt) {
  if (st.mode === 'play') {
    seek(st.t + rate(st.t) * dt, true);
    if (st.t >= ev.tEnd) st.mode = 'rest';
  } else if (st.mode === 'scrub' && !pointer.down && performance.now() > st.holdUntil) {
    st.mode = 'play';
  }
}
function busy() {
  return st.mode === 'play' || (st.mode === 'scrub' && (pointer.down || performance.now() <= st.holdUntil));
}

/* ---------- view ---------- */
const view = { cam, u: U, fing: null, bead: null, back: null, spot: null, bound: new Float32Array(2) };
function makeView() {
  frameAt(ev, st.t, U);
  view.fing = ev.fing; view.bead = ev.bead;
  const b = BACKS[st.back];
  view.back = b.back; view.spot = b.spot;
  // The march bound: the set's radius and its highest part.
  const top = Math.max(U.crown[1] + 14, U.jet[0] + 2, U.drop[3] > 0 ? U.drop[1] + 3 : 0, U.jdrop[1] > 0 ? U.jdrop[0] + 2 : 0, 6);
  view.bound[0] = 42; view.bound[1] = top + 2;
  return view;
}
function draw() {
  if (!scene) return;
  scene.frame(makeView(), { frameNo: calm ? 0 : frameNo, bloomLevels: D.rung >= 2 ? 3 : 5 });
}

/* ---------- frame loop ---------- */
// Lively while the moment plays or the pointer scrubs; asleep otherwise.
function frame() {
  raf = 0;
  if (!visible || !gl || !started) return;
  const t0 = performance.now();
  const dt = Math.max(0, Math.min(1 / 20, (t0 - last) / 1000));
  last = t0;
  let again = false;
  try {
    step(dt);
    draw();
    D.frame(dt);
    frameNo++;
    again = busy();
  } finally {
    // A thrown error still leaves the loop able to wake.
    if (again) schedule(); else rest();
  }
}
function rest() { kit.rest(() => !raf && !snd.busy); }
function schedule() {
  if (raf || !visible || !gl || !started) return;
  raf = requestAnimationFrame(frame);
}
function poke() {
  if (!raf) last = performance.now();
  schedule();
}
function halt() { cancelAnimationFrame(raf); raf = 0; }

/* ---------- pointer: tap drops, drag scrubs, hold freezes ---------- */
const pointer = { id: null, down: false, x0: 0, y0: 0, t0: 0, moved: false, held: false, timer: 0, lastFrame: 0 };
const local = e => { const r = stage.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
// The whole stage width scrubs 64 ms of the moment.
const SPAN = 64;
stage.addEventListener('pointerdown', e => {
  if (e.button !== 0 || !scene || pointer.id !== null || (e.target !== canvas && e.target !== stage)) return;
  try { stage.setPointerCapture(e.pointerId); } catch { /* capture is optional */ }
  const [x, y] = local(e);
  Object.assign(pointer, { id: e.pointerId, down: true, x0: x, y0: y, t0: st.t, moved: false, held: false, lastFrame: Math.round(st.t / FRAME) });
  clearTimeout(pointer.timer);
  // A hold freezes the frame under the finger.
  pointer.timer = setTimeout(() => {
    if (pointer.id === null || pointer.moved) return;
    pointer.held = true;
    if (st.mode === 'play' || st.mode === 'still') { st.mode = 'scrub'; snd.freeze(); poke(); }
  }, 260);
});
stage.addEventListener('pointermove', e => {
  if (e.pointerId !== pointer.id) return;
  const [x, y] = local(e);
  if (!pointer.moved && Math.hypot(x - pointer.x0, y - pointer.y0) > 8) {
    pointer.moved = true;
    // A drag from the resting pool scrubs the last drop from its start.
    if (st.mode === 'rest') pointer.t0 = Math.min(pointer.t0, 40);
    st.mode = 'scrub';
    poke();
  }
  if (!pointer.moved) return;
  const want = pointer.t0 + ((x - pointer.x0) / Math.max(320, cssW)) * SPAN;
  const f = Math.round(clamp(want, ev.t0, ev.tEnd) / FRAME);
  if (f !== pointer.lastFrame) {
    snd.tick(f > pointer.lastFrame ? 1 : -1, panAt(x));
    pointer.lastFrame = f;
    seek(f * FRAME, false);
  }
});
const panAt = x => clamp((x / cssW) * 2 - 1, -1, 1);
function endPointer(e) {
  if (e.pointerId !== pointer.id) return;
  clearTimeout(pointer.timer);
  const tap = e.type === 'pointerup' && !pointer.moved && !pointer.held;
  pointer.id = null; pointer.down = false;
  if (tap) drop();
  else if (st.mode === 'scrub') { st.holdUntil = 0; st.mode = st.t >= ev.tEnd ? 'rest' : 'play'; }
  poke();
}
['pointerup', 'pointercancel', 'lostpointercapture'].forEach(t => stage.addEventListener(t, endPointer));
stage.addEventListener('keydown', e => {
  if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
  e.preventDefault();
  const dir = e.key === 'ArrowRight' ? 1 : -1;
  st.mode = 'scrub';
  // The moment holds two seconds after the last step, then plays on.
  st.holdUntil = performance.now() + 2000;
  seek((Math.round(st.t / FRAME) + dir) * FRAME, false);
  snd.tick(dir, 0);
  poke();
});

/* ---------- life cycle ---------- */
whenVisible(stage, on => {
  visible = on;
  if (on) { last = performance.now(); schedule(); }
  else { halt(); pointer.id = null; pointer.down = false; snd.quiet(); }
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

mark('build');
try {
  await setup();
  // The first frame is the photograph: the crown at its height, a bead on every point.
  resize(true);
  draw();
  gl.finish();
  canvas.classList.add('on');
  mark('first-frame');
  await introDone;
  started = true;
} catch (err) {
  console.error(err);
  fail.removeAttribute('hidden');
  ui.hideControls?.();
}
