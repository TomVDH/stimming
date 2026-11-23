// Chromatography: marker ink on wet filter paper parts into rings of colour.
// Tap the paper: a dot of ink, then a drop of water on it. Hold to keep the water coming.
import { initPage, whenVisible, pageReady, stage as markStage, reduced, onReducedChange, audioKit, sound } from '../shared/stim.js';
import { intro as playIntro } from '../shared/intro.js';
import { onContextLoss, nextFrame } from '../shared/gl.js';
import { detail } from '../shared/detail.js';
import { makeSim, N, R_CELLS } from './sim.js';
import { makePaper } from './paper.js';
import { makeView } from './render.js';
import { makeSound } from './sound.js';
markStage('libs');

const ID = 'chromatography';
const stage = document.getElementById('stage');
const fail = stage.querySelector('.fail');
const store = {
  get(k) { try { return localStorage.getItem(`stimming.${ID}.${k}`); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(`stimming.${ID}.${k}`, String(v)); } catch { /* private mode */ } },
};
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const qa = new URLSearchParams(location.search).has('qa');

/* ---------- inks ---------- */
// Dye masses in a dot: violet, magenta, cyan, yellow.
const INKS = {
  black: [0.5, 0.62, 1.05, 0.8],
  brown: [0.08, 0.62, 0.16, 1.05],
  green: [0.04, 0.06, 0.85, 0.95],
  violet: [0.75, 0.55, 0.32, 0.04],
  navy: [0.4, 0.22, 1.05, 0.1],
};
// Dye mass per dot; the rings dilute it about a hundredfold.
const INK_MASS = 2.5;
const MIX = ['black', 'brown', 'green', 'violet', 'navy'];
const INK_NAMES = ['mixed', 'black', 'brown', 'green', 'violet'];
let inkPick = INK_NAMES.includes(store.get('ink')) ? store.get('ink') : 'mixed';
let mixAt = 0;
const savedWater = Number(store.get('water'));
let waterV = store.get('water') != null && Number.isFinite(savedWater) ? clamp(savedWater, 0, 1) : 0.5;

/* ---------- sim timing ---------- */
// Sim steps per sim second. The front takes about 8 s to reach its ring.
const SPS = 2000;
// Sim seconds of feed for one drop, by the Water slider.
const feedFor = v => 4 + 12 * v;
// Evaporation per step: slow at rest, fast when the toy goes to sleep.
const EVAP = 1.6e-5, EVAP_SLEEP = 6e-4;
const MAX_FEED = 40;

/* ---------- state ---------- */
let gl = null, sim = null, view = null, raf = 0, visible = true, started = false, last = 0;
let calm = reduced();
let cssW = 1, cssH = 1, dpr = 1;
// The paper in CSS pixels: centre and radius.
let pc = [0, 0], rp = 100;
// A new sheet slides out and in: offset in CSS pixels.
let slideX = 0, sheet = null, paperSeed = 1;
// Each drop: its cell, its ink, its feed left, and its bead's life.
const drops = [];
let stepAcc = 0, lastInput = performance.now(), lastDraw = 0, sampleT = 0, dryCheck = { max: 1 };
let wetUntil = 0;

/* ---------- bar ---------- */
const ui = initPage({ id: ID, bar: {
  choice: {
    label: 'Ink', value: inkPick,
    options: [
      { value: 'mixed', label: 'Mixed' },
      { value: 'black', label: 'Black', dot: 'oklch(0.25 0.02 280)' },
      { value: 'brown', label: 'Brown', dot: 'oklch(0.45 0.09 50)' },
      { value: 'green', label: 'Green', dot: 'oklch(0.55 0.14 160)' },
      { value: 'violet', label: 'Violet', dot: 'oklch(0.45 0.16 305)' },
    ],
    onPick: v => { inkPick = v; store.set('ink', v); },
  },
  actions: [
    { verb: 'drop', label: 'Drop', key: 'Space', onPress: () => dropFree() },
    { verb: 'new', label: 'New', key: 'N', onPress: () => newSheet() },
  ],
  slider: { label: 'Water', min: 0, max: 1, step: 0.01, value: waterV, onInput: v => { waterV = v; store.set('water', v); } },
  quality: true,
  keys: [['click', 'ink and water'], ['hold', 'more water'], ['Space', 'drop'], ['N', 'new sheet']],
  help: [
    ['click', 'Tap the paper for a dot of ink and a drop of water'],
    ['hold', 'Hold to keep the water coming'],
    ['Space', 'Press Space for a drop at a clear place'],
    ['N', 'Press N for a clean sheet'],
  ],
} });
const introDone = playIntro({ ready: pageReady() });
const kit = audioKit({ keys: new Set([' ', 'n', 'N']), sleepMs: 1500 });
const snd = makeSound(kit);

/* ---------- canvas ---------- */
const canvas = document.createElement('canvas');
canvas.className = 'cg-sheet';
canvas.setAttribute('aria-hidden', 'true');
stage.prepend(canvas);
const D = detail({ maxDpr: 2, budget: 2.6e6, steps: 2, settle: 2, onChange: () => resize(true) });

/* ---------- layout ---------- */
// The sheet sits centred in the space the bar leaves.
function layout() {
  const c = ui.cover?.() || { top: 0, bottom: 0 };
  const top = Math.max(14, (c.top || 0) * 0.4), bottom = Math.max(14, (c.bottom || 0) + 6);
  const h = cssH - top - bottom;
  // A tall, narrow stage gets a larger sheet that runs off both sides.
  rp = Math.max(40, Math.min(Math.max(cssW * 0.47, Math.min(h * 0.36, cssW * 0.66)), h * 0.485));
  pc = [cssW / 2, top + h / 2];
}
// CSS pixels to sim cells, and back.
const cellPx = () => rp / R_CELLS;
const toCell = (x, y) => [(x - pc[0] - slideX) / cellPx() + N / 2, (y - pc[1]) / cellPx() + N / 2];
const toCss = (gx, gy) => [(gx - N / 2) * cellPx() + pc[0] + slideX, (gy - N / 2) * cellPx() + pc[1]];
const onPaper = (x, y) => Math.hypot(x - pc[0] - slideX, y - pc[1]) < rp * 0.96;

let sizeKey = '';
function resize(force = false) {
  if (!gl || !view) return;
  const r = stage.getBoundingClientRect();
  cssW = Math.max(1, r.width); cssH = Math.max(1, r.height);
  dpr = D.dpr(cssW, cssH);
  const c = ui.cover?.() || { top: 0, bottom: 0 };
  const key = [cssW, cssH, dpr, c.top || 0, c.bottom || 0].map(v => Math.round(v * 100)).join();
  if (!force && key === sizeKey) return;
  sizeKey = key;
  canvas.width = Math.round(cssW * dpr); canvas.height = Math.round(cssH * dpr);
  view.resize(canvas.width, canvas.height);
  layout();
  draw();
}

/* ---------- drops ---------- */
function nextInk() {
  if (inkPick !== 'mixed') return INKS[inkPick];
  const ink = INKS[MIX[mixAt % MIX.length]];
  mixAt++;
  return ink;
}
// A dot of ink lands now; its drop of water lands a moment later.
function place(x, y, held = false) {
  const [gx, gy] = toCell(x, y);
  const ink = nextInk().map(v => v * INK_MASS * (0.92 + Math.random() * 0.16));
  sim.splat(gx, gy, 3.4, ink, 0.3);
  const d = { gx, gy, t: 0, land: calm ? 0 : 0.3, feed: feedFor(waterV), held, fed: 0, landed: false, life: 1 };
  drops.push(d);
  snd.nib(panOf(x));
  wake();
  return d;
}
const panOf = x => clamp(x / Math.max(1, cssW) * 2 - 1, -1, 1);
// Space: a drop at the clearest place on the sheet.
function dropFree() {
  if (!sim || sheet) return;
  let best = null, bestD = -1;
  for (let i = 0; i < 40; i++) {
    const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * rp * 0.68;
    const x = pc[0] + Math.cos(a) * r, y = pc[1] + Math.sin(a) * r;
    if (x < 40 || x > cssW - 40) continue;
    const [gx, gy] = toCell(x, y);
    let dmin = 1e9;
    for (const d of allDots) dmin = Math.min(dmin, Math.hypot(d[0] - gx, d[1] - gy));
    // Keep away from the edge too.
    dmin = Math.min(dmin, (R_CELLS - Math.hypot(gx - N / 2, gy - N / 2)) * 1.6);
    if (dmin > bestD) { bestD = dmin; best = [x, y]; }
  }
  if (!best) return;
  const [gx, gy] = toCell(best[0], best[1]);
  allDots.push([gx, gy]);
  place(best[0], best[1]);
}
// Every dot on this sheet, so Space can find a clear place.
let allDots = [];

/* ---------- a new sheet ---------- */
function newSheet() {
  if (!sim || sheet) return;
  snd.slide();
  if (calm) { freshPaper(); draw(); return; }
  sheet = { t: 0, swapped: false };
  wake();
}
function freshPaper() {
  paperSeed++;
  const p = makePaper(paperSeed);
  view.setMap(p.map);
  sim.reset(p.K);
  drops.length = 0;
  allDots = [];
  dryCheck = { max: 0 };
  wetUntil = 0;
}
function stepSheet(dt) {
  sheet.t += dt;
  const T = 0.42;
  const off = cssW / 2 + rp + 40;
  if (sheet.t < T) {
    const f = sheet.t / T;
    slideX = off * f * f;
  } else {
    if (!sheet.swapped) { sheet.swapped = true; freshPaper(); }
    const f = Math.min(1, (sheet.t - T) / (T * 1.3));
    const e = 1 - (1 - f) ** 3;
    slideX = -off * (1 - e);
    if (f >= 1) { slideX = 0; sheet = null; }
  }
}

/* ---------- sim ---------- */
// Beads feed the paper under them; the list goes to the sim and the view.
function beadList() {
  const list = [];
  for (const d of drops) if (d.landed && d.feed > 0) list.push([d.gx, d.gy, 2.8, 1]);
  return list;
}
function viewBeads() {
  const list = [];
  const s = cellPx() * dpr;
  for (const d of drops) {
    if (!d.landed || d.life <= 0) continue;
    // The bead lands with a small wobble, then shrinks as the paper drinks it.
    const age = d.t - d.land;
    const wob = calm ? 1 : 1 + 0.12 * Math.exp(-age * 9) * Math.sin(age * 55);
    const land = calm ? 1 : Math.min(1, 0.55 + age * 6);
    const vol = clamp(d.feed / 1.6, 0, 1);
    const rad = 7 * Math.cbrt(Math.max(vol, 0.001)) * land * wob;
    const [x, y] = toCss(d.gx, d.gy);
    list.push([x * dpr, y * dpr, rad * s, d.life]);
  }
  return list;
}
function stepDrops(dt) {
  let feeding = false, rate = 0, px = 0;
  for (const d of drops) {
    d.t += dt;
    if (!d.landed && d.t >= d.land) {
      d.landed = true;
      snd.plip(panOf(toCss(d.gx, d.gy)[0]), 0.8 + waterV * 0.5);
    }
    if (!d.landed) continue;
    if (d.held && d.fed < MAX_FEED) d.feed = Math.max(d.feed, 1.6);
    if (d.feed > 0) {
      d.feed = Math.max(0, d.feed - dt);
      d.fed += dt;
      feeding = true;
      // The front slows as it grows; the fizz follows it.
      const r = 1 / Math.sqrt(1 + d.fed * 0.8);
      rate += r; px += toCss(d.gx, d.gy)[0] * r;
    } else d.life = Math.max(0, d.life - dt * 3);
  }
  for (let i = drops.length - 1; i >= 0; i--) if (drops[i].life <= 0 && drops[i].feed <= 0) drops.splice(i, 1);
  return { feeding, rate, pan: rate > 0 ? panOf(px / rate) : 0 };
}

/* ---------- drawing ---------- */
function draw() {
  if (!view || !sim) return;
  view.draw(sim.A, sim.B, sim.C, {
    c: [(pc[0] + slideX) * dpr, pc[1] * dpr], rp: rp * dpr, dpr,
    list: viewBeads(),
  });
}

/* ---------- frame loop ---------- */
// Lively while a bead feeds or a front runs; drifting at 30 fps while it dries.
// Asleep once the sheet is dry, or 60 s after the last input.
function frame(now) {
  raf = 0;
  if (!visible || !gl || !started) return;
  const dtw = Math.max(0, Math.min(1 / 15, (now - last) / 1000));
  let again = false;
  try {
    const feeding = drops.some(d => !d.landed || d.feed > 0 || d.life > 0);
    const drying = !feeding && !sheet;
    // While only drying, draw at 30 fps.
    if (drying && now - lastDraw < 31 && dryCheck.max > 0.01) { again = true; return; }
    last = Math.max(last, now);
    const dt = Math.max(0, Math.min(1 / 15, (now - lastDraw) / 1000)) || dtw;
    lastDraw = now;
    if (sheet) stepSheet(dt);
    const speed = calm ? 4 : 1;
    const simDt = dt * speed;
    const st = stepDrops(simDt);
    const sleepy = now - lastInput > 60000;
    // Steps for this frame; the slow-frame watch can halve the cap.
    stepAcc += simDt * SPS;
    const cap = (D.rung >= 2 ? 40 : 80) * speed;
    const n = Math.min(cap, Math.floor(stepAcc));
    stepAcc = Math.min(stepAcc - n, 1);
    if (n > 0) {
      sim.step(n, beadList(), { evap: sleepy ? EVAP_SLEEP : EVAP });
      wetUntil = Math.max(wetUntil, st.feeding ? now + 2000 : 0);
    }
    snd.fizz(st.feeding ? Math.min(1, st.rate * 0.7) : 0, st.pan, simDt);
    draw();
    D.frame(dtw);
    // Once a second, ask the sim whether the paper is still wet.
    sampleT += dt;
    if (!st.feeding && now > wetUntil && sampleT > 1) { sampleT = 0; dryCheck = sim.sample(); }
    if (st.feeding) dryCheck.max = 1;
    again = !!sheet || st.feeding || drops.length > 0 || dryCheck.max > 0.01;
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
function wake() {
  lastInput = performance.now();
  dryCheck.max = 1;
  if (!raf) { last = performance.now(); lastDraw = last - 16; }
  schedule();
}
function halt() { cancelAnimationFrame(raf); raf = 0; }

/* ---------- pointer ---------- */
// A press turns into a drag after 8 px or a hold after 260 ms; otherwise a tap.
const local = e => { const r = stage.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
const press = { id: null, x: 0, y: 0, t: 0, mode: 'tap', drop: null, timer: 0 };
stage.addEventListener('pointerdown', e => {
  if (!sim || !started || sheet || press.id !== null || (e.target !== canvas && e.target !== stage)) return;
  if (e.button !== 0) return;
  const [x, y] = local(e);
  if (!onPaper(x, y)) return;
  try { stage.setPointerCapture(e.pointerId); } catch { /* capture is optional */ }
  Object.assign(press, { id: e.pointerId, x, y, t: performance.now(), mode: 'tap' });
  allDots.push(toCell(x, y));
  // The dot answers at once; holding keeps the bead full.
  press.drop = place(x, y, true);
  press.timer = setTimeout(() => { if (press.id !== null && press.mode === 'tap') press.mode = 'hold'; }, 260);
});
stage.addEventListener('pointermove', e => {
  if (e.pointerId !== press.id) return;
  const [x, y] = local(e);
  if (press.mode === 'tap' && Math.hypot(x - press.x, y - press.y) > 8) press.mode = 'drag';
});
function endPress(e) {
  if (e.pointerId !== press.id) return;
  clearTimeout(press.timer);
  const d = press.drop;
  // A tap gives one drop's worth; a hold has fed while it lasted.
  if (d) {
    d.held = false;
    if (press.mode === 'tap') d.feed = Math.max(d.feed, feedFor(waterV));
    else d.feed = Math.max(d.feed, 1.6);
  }
  press.id = null; press.drop = null;
  wake();
}
['pointerup', 'pointercancel', 'lostpointercapture'].forEach(t => stage.addEventListener(t, endPress));

/* ---------- life cycle ---------- */
whenVisible(stage, on => {
  visible = on;
  if (on) { last = performance.now(); lastDraw = last - 16; schedule(); }
  else { halt(); snd.quiet(); }
});
onReducedChange(on => { calm = on; wake(); });
sound.onChange(on => { if (on) wake(); });
new ResizeObserver(() => resize()).observe(stage);
ui.onCover?.(() => resize(true));

// The first sheet holds two dried chromatograms, so the first frame is a picture.
async function develop() {
  const p = makePaper(paperSeed);
  view.setMap(p.map);
  sim.reset(p.K);
  const dots = [[N / 2 - 38, N / 2 - 22, INKS.black], [N / 2 + 46, N / 2 + 34, INKS.brown]];
  for (const [gx, gy, ink] of dots) { sim.splat(gx, gy, 3.4, ink.map(v => v * INK_MASS), 0.3); allDots.push([gx, gy]); }
  const beads = dots.map(([gx, gy]) => [gx, gy, 2.8, 1]);
  const feed = Math.round(7 * SPS), dry = 2600, chunk = 1200;
  for (let i = 0; i < feed; i += chunk) { sim.step(Math.min(chunk, feed - i), beads, { evap: EVAP }); gl.flush(); await nextFrame(); }
  for (let i = 0; i < dry; i += chunk) { sim.step(Math.min(chunk, dry - i), [], { evap: EVAP_SLEEP }); gl.flush(); await nextFrame(); }
  dryCheck = sim.sample();
}

async function setup() {
  gl = canvas.getContext('webgl2', { antialias: false, alpha: false, depth: false, powerPreference: 'high-performance' });
  if (!gl) throw new Error('no webgl2');
  sim = makeSim(gl);
  await sim.link();
  view = await makeView(gl);
  sizeKey = '';
}
onContextLoss(canvas, {
  lost: () => { halt(); gl = null; sim = null; view = null; },
  restored: async () => { await setup(); drops.length = 0; allDots = []; await develop(); resize(true); wake(); },
  failed: () => fail.removeAttribute('hidden'),
});

if (qa) globalThis.__cg = {
  get drops() { return drops; }, get busy() { return !!raf; }, get rp() { return rp; }, get pc() { return pc; },
  place: (x, y) => { const d = place(x, y); d.held = false; return d; },
  step: n => { sim.step(n, beadList(), { evap: EVAP }); draw(); },
  sample: () => sim.sample(), row: y => sim.row(y), dropFree, newSheet, toCss, toCell,
};

markStage('build');
try {
  await setup();
  resize(true);
  await develop();
  resize(true);
  gl.finish();
  canvas.classList.add('on');
  markStage('first-frame');
  await introDone;
  started = true;
  wake();
} catch (err) {
  console.error(err);
  fail.removeAttribute('hidden');
  ui.hideControls?.();
}
