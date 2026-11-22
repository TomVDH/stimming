// Spectrogram: play a small synth; the sound paints itself as light.
// Height is pitch, left to right is brightness. The paper runs while a note sounds.
import { initPage, whenVisible, pageReady, stage as mark, reduced, onReducedChange, audioKit, sound } from '../shared/stim.js';
import { intro as playIntro } from '../shared/intro.js';
import { onContextLoss } from '../shared/gl.js';
import { detail } from '../shared/detail.js';
import { makeVoices, voiceSound, inkOf, SPAN, KINDS } from './voice.js';
import { makePaper, M, N, P0, P1 } from './paper.js';
import { makeRender } from './render.js';
mark('libs');

const ID = 'spectrogram';
const stage = document.getElementById('stage');
const fail = stage.querySelector('.fail');
const store = {
  get(k) { try { return localStorage.getItem(`stimming.${ID}.${k}`); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(`stimming.${ID}.${k}`, String(v)); } catch { /* private mode */ } },
};
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const savedTrail = Number(store.get('trail'));
let trail = clamp(Number.isFinite(savedTrail) && savedTrail > 0 ? savedTrail : 0.75, 0.3, 1.2);
const savedKind = store.get('voice');

/* ---------- state ---------- */
const S = makeVoices();
S.kind = KINDS[savedKind] ? savedKind : 'bow';
const paper = makePaper();
// ?qa hands the model to a test script.
if (new URLSearchParams(location.search).has('qa')) globalThis.__spec = { S, paper };
let gl = null, R = null, raf = 0, visible = true, last = 0, frameNo = 0, calm = reduced();
let cssW = 1, cssH = 1, dpr = 1, started = false;
let view = { headX: 1, colPx: 1, y0: 0, y1: 1, trail: 1, vis: 1, oct: 1, speed: 120 };
let clearing = 0, quiet = 0, hover = null;

/* ---------- bar ---------- */
const ui = initPage({ id: ID, bar: {
  choice: {
    label: 'Voice',
    value: S.kind,
    options: [{ value: 'glass', label: 'Glass' }, { value: 'reed', label: 'Reed' }, { value: 'bow', label: 'Bow' }],
    onPick: v => { if (KINDS[v]) { S.kind = v; store.set('voice', v); } },
  },
  actions: [{ verb: 'clear', key: 'C', onPress: () => clearPaper() }],
  slider: { label: 'Trail', min: 0.3, max: 1.2, step: 0.05, value: trail, onInput: v => { trail = v; store.set('trail', v); fit(); draw(); } },
  quality: true,
  keys: [['hold', 'play'], ['drag', 'bend'], ['A-K', 'notes']],
  help: [
    ['hold', 'Hold to play a note; its height is the pitch'],
    ['drag', 'Drag up and down to bend it; right to brighten it'],
    ['A-K', 'Hold keys A to K for notes; hold several for a chord'],
    ['C', 'Press C to clear the paper'],
  ],
} });
const introDone = playIntro({ ready: pageReady() });
const KEYS = 'asdfghjk';
const kit = audioKit({ keys: new Set([...KEYS, ...KEYS.toUpperCase(), 'c', 'C']), sleepMs: 1500 });
const snd = voiceSound(kit);

/* ---------- GL ---------- */
const canvas = document.createElement('canvas');
canvas.setAttribute('aria-hidden', 'true');
stage.prepend(canvas);
const D = detail({ maxDpr: 2, budget: 2.4e6, steps: 2, settle: 2, onChange: () => resize(true) });

// The view: pen place, pitch span and trail, from the free stage.
function fit() {
  const c = ui.cover?.() || { top: 0, bottom: 0 };
  const top = c.top || 0, bot = c.bottom || 0;
  const free = Math.max(120, cssH - top - bot);
  const pad = Math.max(10, free * 0.05);
  const headX = Math.round(cssW * (cssW > cssH ? 0.78 : 0.8));
  const vis = Math.min(N - 16, headX + 40);
  view = {
    headX: headX * dpr, colPx: dpr,
    y0: (bot + pad) * dpr, y1: (cssH - top - pad) * dpr,
    vis, trail: trail * headX, oct: (12 * M) / (P1 - P0),
    // A narrow stage runs slower paper, so a phrase still fits.
    speed: clamp(cssW * 0.11, 60, 150),
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
  fit();
  draw();
}

// Pointer height to pitch, in semitones from C2.
function pitchAt(yCss) {
  const yGl = (cssH - yCss) * dpr;
  const row = ((yGl - view.y0) / (view.y1 - view.y0)) * M;
  return clamp(P0 + (row / M) * (P1 - P0), 0, SPAN);
}
const brightAt = xCss => clamp(xCss / cssW, 0, 1);
const panAt = xCss => clamp((xCss / cssW) * 2 - 1, -1, 1) * 0.55;

// The beads at the pen: one per voice, and a dim one under a hovering mouse.
function pens() {
  const out = [];
  for (const v of S.list) if (v.env > 0.01) out.push({ row: paper.row(S.pitch(v)), lvl: 0.55 * v.env, ink: v.ink });
  if (hover && !S.list.some(v => v.gate)) out.push({ row: paper.row(hover.p), lvl: 0.1, ink: inkOf(hover.p) });
  return out;
}
function draw() {
  if (!R) return;
  R.frame(paper, view, pens(), { frameNo, calm, bloomLevels: D.rung >= 2 ? 3 : 5 });
}

/* ---------- frame loop ---------- */
// Lively while a voice sounds or the paper moves. Nothing drifts, so the loop then stops.
function frame(now) {
  raf = 0;
  if (!visible || !gl || !started) return;
  // A frame stamp can predate the wake, so dt never goes below zero.
  const dt = Math.max(0, Math.min(1 / 30, (now - last) / 1000));
  last = Math.max(last, now);
  let again = true;
  try {
    runPaper(dt);
    snd.update(S);
    draw();
    D.frame(dt);
    frameNo++;
    again = S.busy() || paper.v > 0 || clearing > 0 || pointers.size > 0;
  } finally {
    // A thrown error still leaves the loop able to wake.
    if (again) schedule(); else rest();
  }
}
// The paper: full speed under a voice, a short coast after, a dash for Clear.
function runPaper(dt) {
  const sounding = S.busy();
  if (clearing > 0) paper.v = Math.max(2400, view.vis * 2.2);
  else if (sounding) { paper.v = view.speed; quiet = 0; }
  else {
    quiet += dt;
    paper.v = quiet < 0.15 ? view.speed : paper.v * Math.exp(-dt / 0.18);
    if (paper.v < 4) paper.v = 0;
  }
  const h0 = paper.head;
  paper.advance(S, dt, d => S.step(d, calm));
  if (clearing > 0) {
    clearing -= paper.head - h0;
    if (clearing <= 0) { clearing = 0; paper.v = S.busy() ? view.speed : 0; }
  }
}
function rest() { kit.rest(() => !S.busy() && !snd.busy()); }
// One frame at most is ever pending, so loops never stack.
function schedule() {
  if (raf || !visible || !gl || !started) return;
  raf = requestAnimationFrame(frame);
}
function wake() {
  if (!raf) last = performance.now();
  schedule();
}
function halt() { cancelAnimationFrame(raf); raf = 0; }

function clearPaper() {
  if (!R) return;
  clearing = view.vis + 8;
  snd.rush();
  wake();
}

/* ---------- pointer: hold to play, drag to bend and brighten ---------- */
const pointers = new Map();
const local = e => { const r = stage.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
stage.addEventListener('pointerdown', e => {
  if (e.button !== 0 || !R || (e.target !== canvas && e.target !== stage)) return;
  // A mouse plays one voice; each finger plays its own.
  if (e.pointerType === 'mouse' && pointers.size) return;
  try { stage.setPointerCapture(e.pointerId); } catch { /* capture is optional */ }
  const [x, y] = local(e);
  const v = S.on(pitchAt(y), brightAt(x), panAt(x), `p${e.pointerId}`);
  pointers.set(e.pointerId, { v, t0: performance.now() });
  hover = null;
  // The note sounds and the bead lights in this frame.
  snd.update(S);
  wake();
});
stage.addEventListener('pointermove', e => {
  const [x, y] = local(e);
  const ptr = pointers.get(e.pointerId);
  if (ptr) {
    ptr.v.pT = pitchAt(y); ptr.v.bT = brightAt(x); ptr.v.pan = panAt(x);
    wake();
  } else if (e.pointerType === 'mouse' && started) {
    // A hovering mouse shows where its note would land.
    hover = { p: pitchAt(y) };
    if (!raf) draw();
  }
});
stage.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse' && hover) { hover = null; if (!raf) draw(); } });
function endPointer(e) {
  const ptr = pointers.get(e.pointerId);
  if (!ptr) return;
  pointers.delete(e.pointerId);
  // A click still sounds as a short pluck.
  const held = performance.now() - ptr.t0;
  if (held < 110) setTimeout(() => S.off(ptr.v), 110 - held);
  else S.off(ptr.v);
  wake();
}
['pointerup', 'pointercancel', 'lostpointercapture'].forEach(t => stage.addEventListener(t, endPointer));

/* ---------- keys: A to K play A minor pentatonic ---------- */
// Semitones from C2: A2 C3 D3 E3 G3 A3 C4 D4.
const KEY_P = [21, 24, 26, 28, 31, 33, 36, 38];
stage.addEventListener('keydown', e => {
  if (e.altKey || e.ctrlKey || e.metaKey || !R) return;
  const i = KEYS.indexOf(e.key.toLowerCase());
  if (i < 0) return;
  e.preventDefault();
  if (e.repeat || S.find(`k${i}`)) return;
  S.on(KEY_P[i], 0.62, (i / 7 - 0.5) * 0.8, `k${i}`);
  snd.update(S);
  wake();
});
stage.addEventListener('keyup', e => {
  const i = KEYS.indexOf(e.key.toLowerCase());
  if (i < 0) return;
  S.off(S.find(`k${i}`));
  wake();
});
// A lost focus lets every key go.
stage.addEventListener('blur', () => { S.list.forEach(v => { if (v.tag?.[0] === 'k') S.off(v); }); wake(); });

/* ---------- life cycle ---------- */
whenVisible(stage, on => {
  visible = on;
  if (on) wake();
  else {
    halt();
    pointers.clear();
    S.offAll();
    snd.hide(S);
  }
});
onReducedChange(on => { calm = on; draw(); wake(); });
sound.onChange(on => { if (on) wake(); });
new ResizeObserver(() => resize()).observe(stage);
ui.onCover?.(() => resize());

async function setup() {
  gl = canvas.getContext('webgl2', { antialias: false, alpha: false, depth: false, powerPreference: 'high-performance' });
  if (!gl) throw new Error('no webgl2');
  R = await makeRender(gl);
  sizeKey = '';
}
onContextLoss(canvas, {
  lost: () => { halt(); gl = null; R = null; },
  // The ring dies with the context, so the paper starts clean.
  restored: async () => { await setup(); paper.head = Math.ceil(paper.pos); resize(true); wake(); },
  failed: () => fail.removeAttribute('hidden'),
});

// The first frame is a picture: a short phrase already on the paper.
function prewarm() {
  const kind0 = S.kind, dt = 1 / 60;
  const at = [];
  const play = (t0, t1, kind, p, b, bend) => at.push({ t0, t1, kind, p, b, bend, v: null });
  // A bowed note rises an octave, then holds and sings.
  play(0.0, 1.7, 'bow', 14, 0.78, t => 14 + 12 * Math.min(1, Math.max(0, (t - 0.25) / 0.55)) ** 1.6);
  // A reed chord.
  play(2.0, 2.9, 'reed', 9, 0.6);
  play(2.0, 2.9, 'reed', 16, 0.6);
  play(2.05, 2.9, 'reed', 21, 0.6);
  // A glass arpeggio up.
  [33, 36, 40, 45, 48].forEach((p, i) => play(3.15 + i * 0.16, 3.3 + i * 0.16, 'glass', p, 0.5));
  // A bowed fall, bright.
  play(4.3, 5.4, 'bow', 41, 0.95, t => 41 - 19 * Math.min(1, Math.max(0, (t - 4.45) / 0.8)) ** 0.8);
  let t = 0;
  paper.v = view.speed;
  while (t < 6.4 || S.busy()) {
    for (const n of at) {
      if (!n.v && t >= n.t0) { S.kind = n.kind; n.v = S.on(n.p, n.b, 0, 'demo'); }
      if (n.v && n.bend) n.v.pT = n.bend(t);
      if (n.v && t >= n.t1) S.off(n.v);
    }
    paper.advance(S, dt, d => S.step(d, calm));
    t += dt;
    if (t > 12) break;
  }
  S.list.length = 0;
  S.kind = kind0;
  paper.v = 0;
}

mark('build');
try {
  await setup();
  resize(true);
  prewarm();
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
