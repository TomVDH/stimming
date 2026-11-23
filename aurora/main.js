// Fjord aurora: curtains fold over a still fjord and double in the water.
// The Solar wind slider sets the activity; a rise starts a substorm.
import { initPage, whenVisible, pageReady, stage as mark, reduced, onReducedChange, audioKit, sound } from '../shared/stim.js';
import { intro as playIntro } from '../shared/intro.js';
import { onContextLoss } from '../shared/gl.js';
import { detail } from '../shared/detail.js';
import { makeRenderer } from './render.js';
import { makeSound } from './sound.js';
mark('libs');

const ID = 'aurora';
const stage = document.getElementById('stage');
const fail = stage.querySelector('.fail');
const store = {
  get(k) { try { return localStorage.getItem(`stimming.${ID}.${k}`); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(`stimming.${ID}.${k}`, String(v)); } catch { /* private mode */ } },
};
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const mix = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const savedWind = Number(store.get('wind'));
let wind = clamp(Number.isFinite(savedWind) && store.get('wind') !== null ? savedWind : 0.45, 0, 1);

/* ---------- state ---------- */
// level chases the slider; storm is the substorm envelope.
let level = wind, base = wind, storm = 0, stormAge = 1e9, stormK = 0, surgeX = 0;
// Aurora time runs faster in a storm.
let t = 40, water = 0, twinkle = 0, speed = 1;
// Three gust slots: east position in km, age in seconds, strength.
const gusts = [0, 1, 2].map(() => ({ x: 0, age: 1e9, k: 0 }));
let gustCount = 0;
let gl = null, R = null, raf = 0, timer = 0, visible = true, last = 0, frameNo = 0, calm = reduced();
let cssW = 1, cssH = 1, dpr = 1, started = false, lastInput = 0, lastWindMove = -1e9;
let lens = { tanW: 0.92, hz: 0.36, asp: 1.6, mtn: [1, 1], near: 1 };
// ?qa hands the state to a test script.
if (new URLSearchParams(location.search).has('qa')) globalThis.__aur = { get level() { return level; }, get storm() { return storm; }, get wind() { return wind; }, gust: () => gustAt(0), get gusts() { return gustCount; }, get busy() { return !!(raf || timer); }, probe };

/* ---------- bar ---------- */
const ui = initPage({ id: ID, bar: {
  actions: [
    { verb: 'gust', key: 'Space', onPress: () => { gustAt((Math.random() - 0.5) * 0.8); } },
  ],
  slider: { label: 'Solar wind', min: 0, max: 1, step: 0.01, value: wind, onInput: v => setWind(v) },
  quality: true,
  keys: [['click', 'gust'], ['drag', 'wind']],
  help: [
    ['click', 'Tap the sky to send a gust along the curtain'],
    ['drag', 'Drag up or down to raise or drop the solar wind'],
    ['Space', 'Press Space for a gust'],
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

// The lens: wide on a landscape stage; a portrait stage keeps more sky.
function fitLens() {
  const asp = cssW / cssH;
  // A portrait stage gets taller peaks and nearer curtains.
  lens = asp >= 1
    ? { tanW: 0.92, hz: 0.36, asp, mtn: [1, 1], near: 1 }
    : { tanW: clamp(0.92 * asp * 1.3, 0.42, 0.92), hz: 0.34, asp, mtn: [1.15, 1.5], near: 0.6 };
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
  R.resize(Math.round(cssW * dpr), Math.round(cssH * dpr), lens, D.rung >= 2 ? 0.34 : 0.5 / Math.max(1, dpr * 0.75));
  draw();
}

/* ---------- the sky's state ---------- */
// A rise of the wind above its slow baseline starts a substorm.
function setWind(v) {
  wind = clamp(v, 0, 1);
  store.set('wind', wind.toFixed(2));
  lastWindMove = performance.now();
  if (wind - base > 0.14) {
    const k = clamp((wind - base) * 1.5 + 0.35, 0.4, 1);
    if (stormAge > 6 || k > storm + 0.2) startStorm(k);
    base = wind;
  }
  if (wind < base) base = wind;
  snd.wind(wind);
  poke();
}
function startStorm(k) {
  stormAge = 0; stormK = k;
  // The surge head starts east, off frame, and runs west.
  surgeX = 620;
  snd.surge(k);
}
// Each curtain's turn from east-west; the near one sweeps across the view.
const YAW = [0.55, 0.18, -0.16];
const Z0 = a => [mix(470, 170, a), mix(720, 320, a), mix(1000, 540, a)].map(z => z * lens.near);
// A gust where a screen point's ray meets the near curtain.
// sx runs from -1 to 1 across the view.
function gustAt(sx) {
  const X = sx * lens.tanW, hl = Math.hypot(X, 1);
  const hx = X / hl, hz = 1 / hl, c = Math.cos(YAW[0]), s = Math.sin(YAW[0]);
  const r = Z0(clamp(act(), 0, 1))[0] / Math.max(0.04, -s * hx + c * hz);
  const g = gusts.reduce((a, b) => (b.age > a.age ? b : a));
  g.x = (c * hx + s * hz) * r; g.age = 0; g.k = calm ? 1.1 : 2.2;
  gustCount++;
  snd.gust(sx);
  poke();
}
// The substorm envelope: a fast rise, a hold, a slow fade.
function stormEnv(a) { return a < 2 ? smooth(0, 2, a) : a < 9 ? 1 : Math.exp(-(a - 9) / 9); }
const act = () => clamp(level * 0.85 + storm * stormK * 0.75, 0, 1.4);

function state() {
  const A = act(), a1 = clamp(A, 0, 1);
  const s = stormK * storm;
  const g = 0.15 + 0.16 * A + 0.1 * s;
  return {
    ...lens, t, water, twinkle, act: A, calm, frameNo,
    steps: D.rung >= 2 ? 16 : 24,
    bloomLevels: D.rung >= 2 ? 3 : 5,
    hem: smooth(0.35, 1.0, A) * 0.7,
    red: 0.1 + 0.3 * A,
    expo: 1.15,
    z0: Z0(a1),
    yaw: YAW,
    amp: [14 + 24 * A, 10 + 16 * A, 8 + 10 * A],
    gain: [g, g * (0.35 + 0.35 * a1), g * 0.4 * smooth(0.2, 0.75, A)],
    surge: [surgeX, 130, 1.6 * s * (stormAge < 30 ? 1 : 0), 0],
    gusts: gusts.flatMap(q => [q.x, q.age * 160, q.k * Math.exp(-q.age / 1.5), 0]),
  };
}
function draw() { if (R) R.frame(state()); }
// Draws once and reads a few screen pixels, for a test script.
function probe() {
  draw();
  const W = gl.drawingBufferWidth, H = gl.drawingBufferHeight, px = new Uint8Array(4);
  return [[0.5, 0.8], [0.5, 0.55], [0.1, 0.5], [0.5, 0.2]].map(([u, v]) => { gl.readPixels(Math.round(u * W), Math.round(v * H), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); return [...px]; });
}

/* ---------- frame loop ---------- */
// Lively in a storm, a gust or a slider move; drifting at 30 fps; asleep after 60 s idle.
function frame(now) {
  raf = 0;
  if (!visible || !gl || !started) return;
  // The rAF stamp can run behind the clock, so the pace reads the clock.
  const t0 = performance.now();
  const dt = Math.max(0, Math.min(1 / 15, (now - last) / 1000));
  last = Math.max(last, now);
  let again = true, lively = true;
  try {
    const idleFor = (t0 - lastInput) / 1000;
    // Level eases up over about 3 s, and down over 6 s.
    level += (wind - level) * (1 - Math.exp(-dt / (wind > level ? 2.5 : 6)));
    base += (wind - base) * (1 - Math.exp(-dt / 25));
    stormAge += dt;
    storm = stormAge < 40 ? stormEnv(stormAge) : 0;
    surgeX -= dt * (70 + 60 * stormK);
    gusts.forEach(q => { q.age += dt; });
    const gusting = gusts.some(q => q.age < 4);
    const chasing = Math.abs(wind - level) > 0.004;
    const event = storm > 0.01 || gusting || chasing;
    // Ambient drift stops 60 s after the last input, over 2 s.
    const drift = calm ? 0 : idleFor > 60 ? Math.max(0, 1 - (idleFor - 60) / 2) : 1;
    speed = Math.max(drift, event ? (calm ? 0.35 : 1) : 0);
    const A = act();
    t += dt * speed * (0.5 + 2.6 * A + 1.5 * storm * stormK);
    water += dt * speed;
    twinkle += dt * speed;
    snd.frame(A, storm * stormK, dt);
    draw();
    D.frame(dt);
    frameNo++;
    lively = storm > 0.05 || gusting || t0 - lastWindMove < 2500 || t0 - lastInput < 1500;
    again = speed > 0;
  } finally {
    // A thrown error still leaves the loop able to wake.
    // Drifting frames hold to about 30 fps.
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
  // Input cuts a drifting wait short.
  if (timer) { clearTimeout(timer); timer = 0; }
  schedule();
}
function halt() { cancelAnimationFrame(raf); raf = 0; clearTimeout(timer); timer = 0; }

/* ---------- pointer: tap sends a gust, a vertical drag moves the wind ---------- */
const pointer = { id: null, x0: 0, y0: 0, w0: 0, drag: false };
const local = e => { const r = stage.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
stage.addEventListener('pointerdown', e => {
  if (e.button !== 0 || !R || pointer.id !== null || (e.target !== canvas && e.target !== stage)) return;
  try { stage.setPointerCapture(e.pointerId); } catch { /* capture is optional */ }
  const [x, y] = local(e);
  Object.assign(pointer, { id: e.pointerId, x0: x, y0: y, w0: wind, drag: false });
  poke();
});
stage.addEventListener('pointermove', e => {
  if (e.pointerId !== pointer.id) return;
  const [x, y] = local(e);
  if (!pointer.drag && Math.hypot(x - pointer.x0, y - pointer.y0) > 8) pointer.drag = true;
  if (!pointer.drag) return;
  // Half the stage height moves the wind from calm to full.
  const v = clamp(pointer.w0 + (pointer.y0 - y) / (cssH * 0.5), 0, 1);
  ui.slider?.set(Math.round(v * 100) / 100, true);
});
function endPointer(e) {
  if (e.pointerId !== pointer.id) return;
  if (!pointer.drag && e.type === 'pointerup') {
    // A tap on the water sends a gust at its mirror point too.
    gustAt(pointer.x0 / cssW * 2 - 1);
  }
  pointer.id = null;
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
sound.onChange(on => { if (on) { snd.wind(wind); poke(); } });
new ResizeObserver(() => resize()).observe(stage);

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
