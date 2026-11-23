// Epicycles: draw a closed shape; spinning circles redraw it.
// The circles are the shape's Fourier series, largest first.
import { initPage, whenVisible, pageReady, stage as mark, reduced, onReducedChange, audioKit, sound } from '../shared/stim.js';
import { intro as playIntro } from '../shared/intro.js';
import { onContextLoss } from '../shared/gl.js';
import { detail } from '../shared/detail.js';
import { M, resample, spectrum, path, chain, SAMPLES, samplePoints } from './fourier.js';
import { makeRenderer, SHAPE_FLOATS } from './render.js';
import { makeSound } from './sound.js';
mark('libs');

const ID = 'epicycles';
const stage = document.getElementById('stage');
const fail = stage.querySelector('.fail');
const store = {
  get(k) { try { return localStorage.getItem(`stimming.${ID}.${k}`); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(`stimming.${ID}.${k}`, String(v)); } catch { /* private mode */ } },
};
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const TAU = Math.PI * 2;

/* ---------- state ---------- */
// The slider runs 0 to 1; the count is 300 to that power.
const MAX_CIRCLES = 300;
const toCount = v => Math.max(1, MAX_CIRCLES ** clamp(v, 0, 1));
const savedV = Number(store.get('circles'));
let sliderV = store.get('circles') != null && Number.isFinite(savedV) ? clamp(savedV, 0, 1) : 0.89;
// One loop of the pen, in seconds.
const LOOP = 12;
// The rebuild: the first circle grows, then the rest join on a log scale.
const GROW = 0.35, SWEEP = 4.6;
let spec = null, guide = null, sampleIdx = 0;
let theta = 0, drawn = 0, closed = false, rebuild = -1;
let pathBuf = new Float64Array(2 * M), pathCount = -1;
// Light levels that ease: the chain and trail, the guide line.
const lv = { chain: 1, chainTo: 1, guide: 0.1, guideTo: 0.1 };
let gl = null, R = null, raf = 0, timer = 0, visible = true, last = 0, frameNo = 0, calm = reduced();
let cssW = 1, cssH = 1, dpr = 1, started = false, lastInput = 0, spin = 1, whirl = 1, heard = false, penX = 0;
let view = { cx: 0, cy: 0, s: 1 };
// The stroke the hand draws now, in stage pixels.
let stroke = null;
// ?qa hands the state to a test script.
if (new URLSearchParams(location.search).has('qa')) globalThis.__ep = { get count() { return countNow(); }, get theta() { return theta; }, get spin() { return spin; }, draw: pts => { setShape(pts, true); poke(); } };

/* ---------- bar ---------- */
const ui = initPage({ id: ID, bar: {
  actions: [
    { verb: 'sample', key: 'S', onPress: () => { nextSample(); poke(); } },
    { verb: 'replay', key: 'R', onPress: () => { replay(); poke(); } },
  ],
  slider: { label: 'Circles', min: 0, max: 1, step: 0.001, value: sliderV, onInput: v => setCircles(v) },
  quality: true,
  keys: [['drag', 'draw'], ['click', 'replay']],
  help: [
    ['drag', 'Draw a closed shape; the circles redraw it'],
    ['click', 'Tap to rebuild the shape from one circle'],
    ['S', 'Press S for the next sample shape'],
    ['R', 'Press R to rebuild from one circle'],
  ],
} });
const introDone = playIntro({ ready: pageReady() });
const kit = audioKit({ keys: new Set(['s', 'S', 'r', 'R']), sleepMs: 1500 });
const snd = makeSound(kit);

/* ---------- GL ---------- */
const canvas = document.createElement('canvas');
canvas.setAttribute('aria-hidden', 'true');
stage.prepend(canvas);
const D = detail({ maxDpr: 2, budget: 2.6e6, steps: 2, settle: 2, onChange: () => resize(true) });

// The shape fills the free stage between the bar parts.
function fit() {
  const c = ui.cover?.() || { top: 0, bottom: 0 };
  const top = c.top || 0, bot = c.bottom || 0;
  const freeH = Math.max(160, cssH - top - bot);
  // A narrow stage gives the shape more of its width.
  const k = cssW / freeH < 0.8 ? 0.9 : 0.82;
  view = { cx: cssW / 2, cy: top + freeH / 2, s: Math.min(cssW, freeH) * 0.5 * k };
}
let sizeKey = '';
function resize(force = false) {
  if (!gl || !R) return;
  const r = stage.getBoundingClientRect();
  cssW = Math.max(1, r.width); cssH = Math.max(1, r.height);
  dpr = D.dpr(cssW, cssH);
  const c = ui.cover?.() || { top: 0, bottom: 0 };
  const key = [cssW, cssH, dpr, c.top || 0, c.bottom || 0].map(v => Math.round(v * 100)).join();
  if (!force && key === sizeKey) return;
  sizeKey = key;
  R.resize(Math.round(cssW * dpr), Math.round(cssH * dpr));
  fit();
  draw();
}
// Shape units to device pixels; GL's y points up.
const DX = u => (view.cx + u * view.s) * dpr;
const DY = v => (cssH - (view.cy + v * view.s)) * dpr;

/* ---------- the shape ---------- */
function countNow() {
  const want = toCount(sliderV);
  if (rebuild < 0 || calm) return want;
  if (rebuild < GROW) return Math.max(0.001, rebuild / GROW);
  const s = clamp((rebuild - GROW) / SWEEP, 0, 1);
  // Ease in and out on a log scale: the big circles linger.
  // The few big circles change the shape most, so they get the most time.
  const e = (0.5 - 0.5 * Math.cos(Math.PI * s)) ** 1.5;
  return Math.min(want, want ** e);
}

// pts: [x, y] in shape units.
function setShape(pts, fromHand = false) {
  const z = resample(pts);
  spec = spectrum(z);
  guide = z;
  pathCount = -1;
  // A drawn line dims to the guide; a sample's guide fades in.
  lv.guide = fromHand ? 1.2 : 0;
  lv.guideTo = 0.1;
  lv.chain = 0; lv.chainTo = 1;
  replay();
}
function replay() {
  if (!spec) return;
  // The trail shows the whole loop, so the blob is seen to tighten.
  theta = 0; drawn = TAU; closed = true;
  rebuild = calm ? -1 : 0;
  lv.chain = Math.min(lv.chain, 0.2); lv.chainTo = 1;
  snd.sing(spec, countNow(), 1.5);
}
function nextSample() {
  sampleIdx = (sampleIdx + 1) % SAMPLES.length;
  setShape(samplePoints(SAMPLES[sampleIdx]));
}
function setCircles(v) {
  sliderV = v;
  store.set('circles', v);
  if (rebuild >= 0) rebuild = -1;
  snd.sing(spec, countNow());
  poke();
}

/* ---------- drawing ---------- */
const shapeBuf = new Float32Array(2048 * SHAPE_FLOATS);
let stripBuf = new Float32Array(4 * 4400);
function stripRoom(n) { if (stripBuf.length < n * 8) stripBuf = new Float32Array(n * 8 + 64); }
// Puts one strip in stripBuf from device points and ages; returns the vertex count.
function buildStrip(px, ages, n, hw, loop) {
  stripRoom(n + 2);
  let o = 0;
  const m = loop ? n + 1 : n;
  for (let q = 0; q < m; q++) {
    const i = q % n;
    const ia = loop ? (i - 1 + n) % n : Math.max(0, i - 1);
    const ib = loop ? (i + 1) % n : Math.min(n - 1, i + 1);
    let tx = px[2 * ib] - px[2 * ia], ty = px[2 * ib + 1] - px[2 * ia + 1];
    const l = Math.hypot(tx, ty) || 1;
    tx /= l; ty /= l;
    const x = px[2 * i], y = px[2 * i + 1], a = ages[i];
    stripBuf[o++] = x - ty * hw; stripBuf[o++] = y + tx * hw; stripBuf[o++] = -1; stripBuf[o++] = a;
    stripBuf[o++] = x + ty * hw; stripBuf[o++] = y - tx * hw; stripBuf[o++] = 1; stripBuf[o++] = a;
  }
  return o / 4;
}
let ptsBuf = new Float32Array(2 * (M + 8)), ageBuf = new Float32Array(M + 8);
function room(n) { if (ageBuf.length < n) { ptsBuf = new Float32Array(2 * n + 16); ageBuf = new Float32Array(n + 8); } }

// The trail: the path for this count, from its tail to the pen.
function trail(pen) {
  const full = calm || drawn >= TAU;
  const span = (full ? 0.985 : drawn / TAU) * M;
  const uh = (((theta / TAU) % 1) + 1) % 1 * M;
  let n = 0;
  room(M + 8);
  const put = (x, y, a) => { ptsBuf[2 * n] = DX(x); ptsBuf[2 * n + 1] = DY(y); ageBuf[n] = calm ? 0.3 : a; n++; };
  const at = u => {
    const k = Math.floor(u), f = u - k;
    const i = ((k % M) + M) % M, j = (i + 1) % M;
    return [pathBuf[2 * i] + (pathBuf[2 * j] - pathBuf[2 * i]) * f, pathBuf[2 * i + 1] + (pathBuf[2 * j + 1] - pathBuf[2 * i + 1]) * f];
  };
  if (calm) {
    for (let i = 0; i < M; i += 2) put(pathBuf[2 * i], pathBuf[2 * i + 1], 0.3);
    return buildStrip(ptsBuf, ageBuf, n, 2.6 * dpr, true);
  }
  const ut = uh - span;
  const p0 = at(ut);
  put(p0[0], p0[1], span / M);
  for (let u = Math.floor(ut) + 1; u < uh; u++) {
    const i = ((u % M) + M) % M;
    put(pathBuf[2 * i], pathBuf[2 * i + 1], (uh - u) / M);
  }
  put(pen[0], pen[1], 0);
  return buildStrip(ptsBuf, ageBuf, n, 2.6 * dpr, false);
}

function putShape(i, x0, y0, x1, y1, r, sigma, e, c, glint) {
  const o = i * SHAPE_FLOATS;
  shapeBuf[o] = x0; shapeBuf[o + 1] = y0; shapeBuf[o + 2] = x1; shapeBuf[o + 3] = y1;
  shapeBuf[o + 4] = r; shapeBuf[o + 5] = sigma; shapeBuf[o + 6] = e; shapeBuf[o + 7] = 0;
  shapeBuf[o + 8] = c[0]; shapeBuf[o + 9] = c[1]; shapeBuf[o + 10] = c[2]; shapeBuf[o + 11] = glint;
}
const RING = [0.5, 0.64, 1.0], ARM = [0.7, 0.78, 1.0], HOT = [1.0, 0.9, 0.76], WARM = [1.0, 0.55, 0.2];

function draw() {
  if (!R || !spec) return;
  const count = countNow();
  if (Math.abs(count - pathCount) > 1e-4) { path(spec, count, pathBuf); pathCount = count; }
  R.begin();
  // The guide: the line that was drawn, faint and cool.
  if (lv.guide > 0.004) {
    const n = guide.length / 2;
    room(n + 2);
    for (let i = 0; i < n; i++) { ptsBuf[2 * i] = DX(guide[2 * i]); ptsBuf[2 * i + 1] = DY(guide[2 * i + 1]); ageBuf[i] = 1; }
    const k = buildStrip(ptsBuf, ageBuf, n, 2.4 * dpr, true);
    R.strip(stripBuf, k, { col: [0.42, 0.55, 0.95], e: lv.guide });
  }
  // The chain: rings, arms and joints, largest first.
  let s = 0;
  const ch = lv.chain;
  const pen = chain(spec, count, theta, (cx, cy, r, x1, y1, j, w) => {
    const X0 = DX(cx), Y0 = DY(cy), X1 = DX(x1), Y1 = DY(y1), rp = r * view.s * dpr;
    const fall = 1 / (1 + j * 0.035);
    if (rp > 1.4 * dpr) putShape(s++, X0, Y0, X0, Y0, rp, 0.62 * dpr, 0.17 * fall * w * ch, RING, 2.2);
    putShape(s++, X0, Y0, X1, Y1, 0, 0.55 * dpr, 0.26 * fall * w * ch, ARM, 2.2);
  });
  const PX = DX(pen[0]), PY = DY(pen[1]);
  penX = PX / dpr / cssW * 2 - 1;
  // The anchor of the chain: a small cool point.
  putShape(s++, DX(spec.c0[0]), DY(spec.c0[1]), DX(spec.c0[0]), DY(spec.c0[1]), 0, 1.4 * dpr, 0.5 * ch, ARM, 0);
  const reach = view.s * dpr * 0.2;
  R.shapes(shapeBuf, s, [PX, PY, reach]);
  // The trail, then the pen head on top.
  const k = trail(pen);
  R.strip(stripBuf, k, { heat: 1, e: ch });
  s = 0;
  putShape(s++, PX, PY, PX, PY, 0, 1.6 * dpr, 4.5 * ch, HOT, 0);
  putShape(s++, PX, PY, PX, PY, 0, 9 * dpr, 0.12 * ch, WARM, 0);
  // The stroke the hand draws now: a bright warm line.
  if (stroke && stroke.length > 1) {
    const n = stroke.length;
    room(n + 2);
    for (let i = 0; i < n; i++) { ptsBuf[2 * i] = stroke[i][0] * dpr; ptsBuf[2 * i + 1] = (cssH - stroke[i][1]) * dpr; ageBuf[i] = 1; }
    const kk = buildStrip(ptsBuf, ageBuf, n, 2.8 * dpr, false);
    R.strip(stripBuf, kk, { col: [1.0, 0.82, 0.6], e: 1.5 });
    const t = stroke[n - 1];
    putShape(s++, t[0] * dpr, (cssH - t[1]) * dpr, t[0] * dpr, (cssH - t[1]) * dpr, 0, 1.6 * dpr, 4, HOT, 0);
  }
  R.shapes(shapeBuf, s, [PX, PY, reach]);
  R.end([PX, PY, reach * 1.2, ch], { frameNo: calm ? 0 : frameNo, bloomLevels: D.rung >= 2 ? 4 : 6 });
  return pen;
}

/* ---------- frame loop ---------- */
// Lively during a stroke, a rebuild or a fade; drifting at 30 fps; asleep after 60 s idle.
function frame(now) {
  raf = 0;
  if (!visible || !gl || !started) return;
  const t0 = performance.now();
  const dt = Math.max(0, Math.min(1 / 20, (now - last) / 1000));
  last = Math.max(last, now);
  let again = true, lively = true;
  try {
    const idleFor = (t0 - lastInput) / 1000;
    // Past 60 s idle the circles ease to a stop over 2 s.
    const want = calm || stroke ? 0 : idleFor > 60 ? Math.max(0, 1 - (idleFor - 60) / 2) : 1;
    spin = stroke ? 0 : calm ? 0 : want;
    // The circles whirl while they join, then settle to the drift.
    whirl += ((rebuild >= 0 ? 2.8 : 1) - whirl) * (1 - Math.exp(-dt / 0.6));
    const step = (TAU / LOOP) * spin * whirl * dt;
    theta += step; drawn += step;
    if (rebuild >= 0) {
      rebuild += dt;
      snd.sing(spec, countNow(), 1.4);
      // The last circle joins: the line locks on with a chime.
      if (rebuild > GROW + SWEEP) { rebuild = -1; snd.chime(penX); }
    }
    if (!closed && drawn >= TAU) { closed = true; snd.chime(penX); }
    // Light levels ease toward their marks.
    // Reduced motion: the levels step at once.
    const k = calm ? 1 : 1 - Math.exp(-dt / 0.35), kg = calm ? 1 : 1 - Math.exp(-dt / 0.7);
    lv.chain += (lv.chainTo - lv.chain) * k;
    lv.guide += (lv.guideTo - lv.guide) * kg;
    const fading = Math.abs(lv.chain - lv.chainTo) > 0.004 || Math.abs(lv.guide - lv.guideTo) > 0.002;
    draw();
    // The drift is silent, so the context sleeps once the last sound ends.
    if (heard && !snd.busy) kit.rest(() => !snd.busy);
    heard = snd.busy;
    D.frame(dt);
    frameNo++;
    lively = !!stroke || rebuild >= 0 || fading || whirl > 1.02 || t0 - lastInput < 2500;
    again = spin > 0 || lively;
  } finally {
    // A thrown error still leaves the loop able to wake.
    // Drifting frames hold to about 30 fps.
    if (again) schedule(lively ? 0 : t0 + 33 - performance.now()); else rest();
  }
}
function rest() { kit.rest(() => !raf && !timer && !snd.busy); }
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

/* ---------- pointer: drag draws, tap replays ---------- */
const pointer = { id: null, x0: 0, y0: 0, t0: 0, moved: false, lx: 0, ly: 0, lt: 0 };
const local = e => { const r = stage.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
stage.addEventListener('pointerdown', e => {
  if (e.button !== 0 || !R || pointer.id !== null || (e.target !== canvas && e.target !== stage)) return;
  try { stage.setPointerCapture(e.pointerId); } catch { /* capture is optional */ }
  const [x, y] = local(e);
  Object.assign(pointer, { id: e.pointerId, x0: x, y0: y, t0: performance.now(), moved: false, lx: x, ly: y, lt: performance.now() });
  poke();
});
stage.addEventListener('pointermove', e => {
  if (e.pointerId !== pointer.id) return;
  const evs = e.getCoalescedEvents?.() || [e];
  for (const ev of evs.length ? evs : [e]) {
    const [x, y] = local(ev);
    if (!pointer.moved) {
      if (Math.hypot(x - pointer.x0, y - pointer.y0) < 8) continue;
      // The press becomes a stroke: the chain dims under the new line.
      pointer.moved = true;
      stroke = [[pointer.x0, pointer.y0]];
      lv.chainTo = 0.16; lv.guideTo = 0;
    }
    const l = stroke[stroke.length - 1];
    if (Math.hypot(x - l[0], y - l[1]) >= 1.5) stroke.push([x, y]);
  }
  if (pointer.moved) {
    const [x, y] = local(e), now = performance.now();
    const v = Math.hypot(x - pointer.lx, y - pointer.ly) / Math.max(cssW, 1) / Math.max(0.008, (now - pointer.lt) / 1000);
    snd.stroke(v, x / cssW * 2 - 1);
    pointer.lx = x; pointer.ly = y; pointer.lt = now;
  }
  poke();
});
function endPointer(e) {
  if (e.pointerId !== pointer.id) return;
  const wasStroke = pointer.moved, quick = performance.now() - pointer.t0 < 260;
  pointer.id = null;
  snd.lift();
  if (wasStroke) {
    const pts = stroke;
    stroke = null;
    let len = 0;
    for (let i = 1; i < pts.length; i++) len += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    // A short scribble keeps the old shape.
    if (len >= 60 && pts.length >= 6 && e.type === 'pointerup') setShape(pts.map(([x, y]) => [(x - view.cx) / view.s, (y - view.cy) / view.s]), true);
    else { lv.chainTo = 1; lv.guideTo = 0.1; }
  } else if (quick && e.type === 'pointerup') replay();
  poke();
}
['pointerup', 'pointercancel', 'lostpointercapture'].forEach(t => stage.addEventListener(t, endPointer));

/* ---------- life cycle ---------- */
whenVisible(stage, on => {
  visible = on;
  if (on) { last = performance.now(); schedule(); }
  else { halt(); snd.quiet(); }
});
onReducedChange(on => { calm = on; if (on) rebuild = -1; draw(); poke(); });
sound.onChange(on => { if (on) poke(); });
new ResizeObserver(() => resize()).observe(stage);
ui.onCover?.(() => resize());

async function setup() {
  gl = canvas.getContext('webgl2', { antialias: false, alpha: false, depth: false, powerPreference: 'high-performance' });
  if (!gl) throw new Error('no webgl2');
  if (!gl.getExtension('EXT_color_buffer_float') && !gl.getExtension('EXT_color_buffer_half_float')) throw new Error('no float targets');
  R = await makeRenderer(gl);
  sizeKey = '';
}
onContextLoss(canvas, {
  lost: () => { halt(); gl = null; R = null; },
  restored: async () => { await setup(); resize(true); poke(); },
  failed: () => fail.removeAttribute('hidden'),
});

// The first frame is a picture: the fish, its pen two thirds round.
function prewarm() {
  setShape(samplePoints(SAMPLES[0]));
  rebuild = -1;
  lv.chain = 1; lv.guide = lv.guideTo;
  theta = drawn = 0.64 * TAU;
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
  poke();
} catch (err) {
  console.error(err);
  fail.removeAttribute('hidden');
  ui.hideControls?.();
}
