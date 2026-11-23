// Contour map: a survey sheet. Press to raise the land; drag for a ridge.
// The right button, Alt or the Dig pick digs; the sea floods in below zero.
import { initPage, whenVisible, pageReady, stage as markStage, reduced, onReducedChange, audioKit, sound, oklchRgb } from '../shared/stim.js';
import { intro as playIntro } from '../shared/intro.js';
import { onContextLoss } from '../shared/gl.js';
import { detail } from '../shared/detail.js';
import { makeTerrain, N, H_MIN, H_MAX, STEP, INDEX } from './terrain.js';
import { makeLabels, FONT_PX } from './labels.js';
import { makeRenderer, MAX_LABELS } from './render.js';
import { makeSound } from './sound.js';
markStage('libs');

const ID = 'contour';
const stage = document.getElementById('stage');
const fail = stage.querySelector('.fail');
const store = {
  get(k) { try { return localStorage.getItem(`stimming.${ID}.${k}`); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(`stimming.${ID}.${k}`, String(v)); } catch { /* private mode */ } },
};
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const qa = new URLSearchParams(location.search).has('qa');

/* ---------- state ---------- */
const T = makeTerrain();
let tool = store.get('tool') === 'dig' ? 'dig' : 'raise';
const savedBrush = Number(store.get('brush'));
let brushV = store.get('brush') != null && Number.isFinite(savedBrush) ? clamp(savedBrush, 0, 1) : 0.45;
// The brush's sigma in cells: a narrow knoll to a broad massif.
const sigmaOf = v => 6 + 26 * v ** 1.3;
// Metres a second at the brush's centre, at full press.
const RATE = 300;
let gl = null, R = null, raf = 0, visible = true, last = 0, frameNo = 0, calm = reduced();
let cssW = 1, cssH = 1, dpr = 1, started = false;
// CSS pixels per cell, and the cell at the stage's top-left corner.
let s = 1, org = [0, 0];
// The press: where it is, whether it digs, and its eased strength.
const press = { down: false, id: null, x: 0, y: 0, px: 0, py: 0, dig: false, k: 0, hover: false, hx: 0, hy: 0, kind: 'mouse' };
let altDown = false;
// A new land morphs in from the old one.
let morph = null;
// The height under the brush last frame, for the sound.
let underH = null;

/* ---------- bar ---------- */
const ui = initPage({ id: ID, bar: {
  choice: {
    label: 'Tool', value: tool,
    options: [
      { value: 'raise', label: 'Raise', key: 'R' },
      { value: 'dig', label: 'Dig', key: 'D' },
    ],
    onPick: v => { tool = v; store.set('tool', v); drawInk(); },
  },
  actions: [
    { verb: 'new', key: 'N', onPress: () => newLand() },
  ],
  slider: { label: 'Brush', min: 0, max: 1, step: 0.01, value: brushV, onInput: v => { brushV = v; store.set('brush', v); drawInk(); } },
  quality: true,
  keys: [['hold', 'raise'], ['drag', 'ridge'], ['right-drag', 'dig'], ['N', 'new land']],
  help: [
    ['hold', 'Hold to raise a hill under the pointer'],
    ['drag', 'Drag to raise a ridge'],
    ['right-drag', 'Dig a valley with the right button or with Alt held'],
    ['N', 'Press N for a new land'],
  ],
} });
const introDone = playIntro({ ready: pageReady() });
const kit = audioKit({ keys: new Set(['n', 'N']), sleepMs: 1500 });
const snd = makeSound(kit);

/* ---------- canvases ---------- */
const canvas = document.createElement('canvas');
canvas.className = 'ct-sheet';
canvas.setAttribute('aria-hidden', 'true');
// The ink layer: height labels and the brush ring, drawn in 2D.
const ink = document.createElement('canvas');
ink.className = 'ct-ink';
ink.setAttribute('aria-hidden', 'true');
stage.prepend(canvas, ink);
const ictx = ink.getContext('2d');
const D = detail({ maxDpr: 2, budget: 2.6e6, steps: 1, settle: 2, onChange: () => resize(true) });

/* ---------- tints ---------- */
// Hypsometric tints, OKLCH stops by height in metres.
const TINTS = [
  [-420, [0.4, 0.09, 252]], [-260, [0.47, 0.095, 246]], [-120, [0.56, 0.095, 238]], [-40, [0.66, 0.085, 228]], [-8, [0.75, 0.065, 218]], [-0.01, [0.8, 0.055, 210]],
  [0, [0.74, 0.08, 138]], [60, [0.76, 0.085, 128]], [160, [0.79, 0.085, 112]], [300, [0.8, 0.08, 95]],
  [480, [0.78, 0.075, 78]], [700, [0.72, 0.07, 62]], [950, [0.7, 0.05, 55]], [1200, [0.8, 0.03, 70]], [1500, [0.9, 0.015, 85]], [1900, [0.96, 0.008, 90]],
];
function lut() {
  const at = h => {
    let j = 0;
    while (j < TINTS.length - 2 && TINTS[j + 1][0] < h) j++;
    const [h0, a] = TINTS[j], [h1, b] = TINTS[j + 1];
    const f = clamp((h - h0) / Math.max(1e-3, h1 - h0), 0, 1);
    return oklchRgb(a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f);
  };
  // Row 0: the land from 0 up. Row 1: the sea from 0 down.
  const land = Array.from({ length: 256 }, (_, i) => at((i / 255) * H_MAX));
  const sea = Array.from({ length: 256 }, (_, i) => at(Math.min(-0.02, (i / 255) * H_MIN)));
  return [...land, ...sea];
}

/* ---------- view ---------- */
// The square sheet covers the stage; its centre sits at the stage's centre.
function layout() {
  s = Math.max(cssW, cssH) / N * 1.0;
  org = [N / 2 - cssW / 2 / s - 0.5, N / 2 - cssH / 2 / s - 0.5];
}
const toCell = (x, y) => [org[0] + x / s, org[1] + y / s];
const toCss = (cx, cy) => [(cx - org[0]) * s, (cy - org[1]) * s];
// Labels keep clear of the stage's edges and of the bar.
function labelView() {
  const c = ui.cover?.() || { top: 0, bottom: 0, rects: [] };
  const m = 18;
  const [x0, y0] = toCell(m, m + (c.top || 0) * 0.5), [x1, y1] = toCell(cssW - m, cssH - m - (c.bottom || 0) * 0.6);
  const rects = c.rects || [];
  return {
    s, box: [x0, y0, x1, y1],
    ok(x, y, w) {
      const [px, py] = toCss(x, y);
      const hw = w / 2 + 6;
      if (px - hw < m || px + hw > cssW - m || py < m + 6 || py > cssH - m - 6) return false;
      for (const r of rects) if (px + hw > r.x0 - 8 && px - hw < r.x1 + 8 && py > r.y0 - 14 && py < r.y1 + 14) return false;
      return true;
    },
  };
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
  ink.width = Math.round(cssW * dpr); ink.height = Math.round(cssH * dpr);
  layout();
  labels.update(0, labelView(), true, true);
  labels.scan(labelView());
  draw();
  drawInk();
}

/* ---------- labels ---------- */
const LABEL_FONT = `600 ${FONT_PX}px Gabarito, "Avenir Next", system-ui, sans-serif`;
const labels = makeLabels(T, {
  max: MAX_LABELS,
  measure: t => { ictx.font = LABEL_FONT; return ictx.measureText(t).width + 2; },
});
const labA = new Float32Array(MAX_LABELS * 4), labB = new Float32Array(MAX_LABELS * 4);

/* ---------- drawing ---------- */
function draw() {
  if (!R) return;
  let n = 0;
  for (const l of labels.list) {
    if (n >= MAX_LABELS || l.a <= 0) continue;
    const [x, y] = toCss(l.x, l.y);
    labA.set([x * dpr, y * dpr, Math.cos(l.ang), Math.sin(l.ang)], n * 4);
    labB.set([(l.w / 2 + 2.5) * dpr, 5.2 * dpr, l.a, 0], n * 4);
    n++;
  }
  R.draw({ org: [org[0] + 0.5 / (s * dpr), org[1] + 0.5 / (s * dpr)], px: 1 / (s * dpr), dpr, frame: calm ? 0 : frameNo, relief: 5.5, labA, labB, labN: n });
}
// The ink layer: labels in the contour brown, and the brush ring.
function drawInk() {
  if (!ictx) return;
  ictx.setTransform(1, 0, 0, 1, 0, 0);
  ictx.clearRect(0, 0, ink.width, ink.height);
  ictx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ictx.font = LABEL_FONT;
  ictx.textAlign = 'center';
  ictx.textBaseline = 'middle';
  for (const l of labels.list) {
    if (l.a <= 0) continue;
    const [x, y] = toCss(l.x, l.y);
    ictx.save();
    ictx.translate(x, y);
    ictx.rotate(l.ang);
    ictx.globalAlpha = l.a;
    ictx.fillStyle = 'rgb(96 52 24)';
    ictx.fillText(l.text, 0, 0.5);
    ictx.restore();
  }
  // The brush ring shows the hill's reach under a mouse.
  const show = press.down || (press.hover && press.kind === 'mouse');
  if (show && started) {
    const [x, y] = press.down ? [press.x, press.y] : [press.hx, press.hy];
    const r = sigmaOf(brushV) * 2 * s;
    const dig = press.down ? press.dig : (tool === 'dig') !== altDown;
    ictx.globalAlpha = 1;
    ictx.lineWidth = 1.25;
    ictx.strokeStyle = dig ? 'rgb(20 50 92 / 0.55)' : 'rgb(70 36 14 / 0.5)';
    ictx.setLineDash(dig ? [3, 4] : []);
    ictx.beginPath();
    ictx.arc(x, y, r * (press.down ? 1 - 0.08 * press.k : 1), 0, Math.PI * 2);
    ictx.stroke();
    ictx.setLineDash([]);
    // A small survey mark at the centre: a cross, or a bar for digging.
    ictx.lineWidth = 1.5;
    ictx.beginPath();
    ictx.moveTo(x - 5, y); ictx.lineTo(x + 5, y);
    if (!dig) { ictx.moveTo(x, y - 5); ictx.lineTo(x, y + 5); }
    ictx.stroke();
  }
}

/* ---------- the brush at work ---------- */
// The press eases in and out, so the land swells and settles smoothly.
function work(dt) {
  const want = press.down ? 1 : 0;
  const tau = press.down ? 0.16 : 0.12;
  press.k += (want - press.k) * (calm ? 1 : 1 - Math.exp(-dt / tau));
  if (!press.down && press.k < 0.01) press.k = 0;
  if (press.k <= 0) { press.px = press.x; press.py = press.y; return 0; }
  const sig = sigmaOf(brushV);
  const sign = press.dig ? -1 : 1;
  // Digging is a little slower, so valleys read as cut.
  const amount = sign * RATE * (press.dig ? 0.8 : 1) * press.k * dt * (calm ? 0.6 : 1);
  // A fast drag lays the land along its path, not in dots.
  const [ax, ay] = toCell(press.px, press.py), [bx, by] = toCell(press.x, press.y);
  const dist = Math.hypot(bx - ax, by - ay);
  const n = Math.max(1, Math.ceil(dist / (sig * 0.3)));
  // A drag also lays land by the distance it covers, so a swept ridge rises.
  // Six metres per cell of travel gives a ridge about 2.5 sigma times six high.
  const each = (amount + sign * 6 * dist * press.k * (calm ? 0.6 : 1)) / n;
  let crossed = 0;
  for (let i = 1; i <= n; i++) {
    const f = i / n;
    crossed += T.brush(ax + (bx - ax) * f, ay + (by - ay) * f, sig, each);
  }
  press.px = press.x; press.py = press.y;
  return crossed + 1;
}

/* ---------- a new land ---------- */
function newLand() {
  if (!R) return;
  const from = T.h.slice();
  T.generate();
  const to = T.h.slice();
  labels.fadeAll();
  snd.newLand();
  if (calm) { morph = null; labels.clear(); labels.scan(labelView()); poke(); return; }
  // The old land flows into the new over a second and a half.
  morph = { t: 0, from, to };
  T.h.set(from);
  poke();
}
function stepMorph(dt) {
  morph.t = Math.min(1, morph.t + dt / 1.5);
  const f = morph.t * morph.t * (3 - 2 * morph.t);
  const { from, to } = morph, h = T.h;
  for (let i = 0; i < h.length; i++) h[i] = from[i] + (to[i] - from[i]) * f;
  // The sea follows the morph every fourth frame; a full flood costs a few ms.
  T.refresh(frameNo % 4 === 0);
  // The new land gets its full set of labels once it stands still.
  if (morph.t >= 1) { morph = null; T.refresh(true); labels.scan(labelView()); }
}

/* ---------- frame loop ---------- */
// Lively while the land moves, the sea floods, or labels ease.
// There is no ambient motion: the loop sleeps when all of them stop.
function frame(now) {
  raf = 0;
  if (!visible || !gl || !started) return;
  const dt = Math.max(0, Math.min(1 / 20, (now - last) / 1000));
  last = Math.max(last, now);
  let again = false;
  try {
    let changed = false;
    if (morph) { stepMorph(dt); changed = true; }
    const crossed = work(dt);
    if (crossed) changed = true;
    // The flood advances about seventy cells a second.
    let reached = 0;
    if (calm) { while (T.frontSize) reached += T.floodStep(); }
    else {
      floodAcc += dt * 70;
      while (floodAcc >= 1 && T.frontSize) { reached += T.floodStep(); floodAcc -= 1; }
      if (!T.frontSize) floodAcc = 0;
    }
    T.age(calm ? 1 : dt);
    R.upHeights(T.h, T.takeDirtyH());
    R.upWet(T.wet, T.takeDirtyW());
    const lbusy = labels.update(dt, labelView(), changed, calm);
    listen(dt, reached);
    draw();
    drawInk();
    D.frame(dt);
    frameNo++;
    again = press.down || press.k > 0 || !!morph || T.flooding || lbusy || snd.tail;
  } finally {
    // A thrown error still leaves the loop able to wake.
    if (again) schedule(); else rest();
  }
}
let floodAcc = 0;
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

/* ---------- sound cues ---------- */
// A tick for each contour that passes under the brush; a rumble with the rate.
function listen(dt, reached) {
  const pan = clamp(press.x / Math.max(1, cssW) * 2 - 1, -1, 1);
  if (press.k > 0) {
    const [cx, cy] = toCell(press.x, press.y);
    const h = T.at(cx, cy);
    if (underH !== null) {
      const a = Math.floor(underH / STEP), b = Math.floor(h / STEP);
      if (a !== b) {
        const lv = Math.max(a, b) * STEP;
        snd.tick(lv, lv % INDEX === 0, pan);
      }
      // The land breaks the surface, or the sea pours into a cut.
      if (underH < 0 && h >= 0 && T.wetAt(cx, cy)) snd.splash(pan, 0.8);
      if (underH >= 0 && h < 0 && T.wetAt(cx, cy)) snd.splash(pan, 0.5);
      snd.earth(Math.abs(h - underH) / Math.max(dt, 1e-3), press.dig, pan);
    }
    underH = h;
  } else {
    underH = null;
    snd.earth(0, false, pan);
  }
  snd.wash(reached, pan);
}

/* ---------- pointer ---------- */
const local = e => { const r = stage.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
stage.addEventListener('contextmenu', e => { if (e.target === canvas || e.target === stage) e.preventDefault(); });
stage.addEventListener('pointerdown', e => {
  if (!R || !started || press.id !== null || (e.target !== canvas && e.target !== stage)) return;
  if (e.button !== 0 && e.button !== 2) return;
  try { stage.setPointerCapture(e.pointerId); } catch { /* capture is optional */ }
  const [x, y] = local(e);
  Object.assign(press, { down: true, id: e.pointerId, x, y, px: x, py: y, kind: e.pointerType || 'mouse' });
  press.dig = e.button === 2 || e.altKey || tool === 'dig';
  underH = null;
  snd.press(press.dig, clamp(x / cssW * 2 - 1, -1, 1));
  poke();
});
stage.addEventListener('pointermove', e => {
  const [x, y] = local(e);
  press.kind = e.pointerType || 'mouse';
  press.hx = x; press.hy = y; press.hover = true;
  altDown = e.altKey;
  if (e.pointerId === press.id) { press.x = x; press.y = y; poke(); }
  else drawInk();
});
stage.addEventListener('pointerleave', () => { press.hover = false; if (!press.down) drawInk(); });
function endPress(e) {
  if (e.pointerId !== press.id) return;
  press.down = false; press.id = null;
  poke();
}
['pointerup', 'pointercancel', 'lostpointercapture'].forEach(t => stage.addEventListener(t, endPress));
// Alt held turns the brush to dig; the ring shows the change.
addEventListener('keydown', e => { if (e.key === 'Alt') { altDown = true; e.preventDefault(); drawInk(); } });
addEventListener('keyup', e => { if (e.key === 'Alt') { altDown = false; drawInk(); } });
addEventListener('blur', () => { altDown = false; });

/* ---------- life cycle ---------- */
whenVisible(stage, on => {
  visible = on;
  if (on) { last = performance.now(); schedule(); }
  else { halt(); snd.quiet(); }
});
onReducedChange(on => { calm = on; poke(); });
sound.onChange(on => { if (on) poke(); });
new ResizeObserver(() => resize()).observe(stage);
ui.onCover?.(() => resize(true));

async function setup() {
  gl = canvas.getContext('webgl2', { antialias: false, alpha: false, depth: false, powerPreference: 'high-performance' });
  if (!gl) throw new Error('no webgl2');
  R = await makeRenderer(gl);
  R.setLut(lut());
  R.upHeights(T.h, [0, 0, N - 1, N - 1]);
  R.upWet(T.wet, [0, 0, N - 1, N - 1]);
  sizeKey = '';
}
onContextLoss(canvas, {
  lost: () => { halt(); gl = null; R = null; },
  restored: async () => { await setup(); resize(true); poke(); },
  failed: () => fail.removeAttribute('hidden'),
});

if (qa) globalThis.__ct = {
  T, labels, get press() { return { ...press }; }, get s() { return s; },
  get busy() { return !!raf; }, newLand,
  seed: k => { T.generate(k); labels.clear(); R?.upHeights(T.h, T.takeDirtyH()); R?.upWet(T.wet, T.takeDirtyW()); labels.scan(labelView()); draw(); drawInk(); },
};

markStage('build');
try {
  const seed = Number(new URLSearchParams(location.search).get('seed')) || 77;
  T.generate(seed);
  T.takeDirtyH(); T.takeDirtyW();
  await setup();
  await document.fonts?.load?.(LABEL_FONT).catch(() => {});
  resize(true);
  gl.finish();
  canvas.classList.add('on');
  markStage('first-frame');
  await introDone;
  started = true;
  poke();
} catch (err) {
  console.error(err);
  fail.removeAttribute('hidden');
  ui.hideControls?.();
}
