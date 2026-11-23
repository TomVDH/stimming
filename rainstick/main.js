// Rain stick: turn the tube; the beads trickle down through the pins.
// Each pin a bead strikes clicks and lights.
import { initPage, whenVisible, fitCanvas, pageReady, stage as mark, reduced, onReducedChange, audioKit, onQuality } from '../shared/stim.js';
import { intro as playIntro } from '../shared/intro.js';
import { onContextLoss } from '../shared/gl.js';
import { makeSim, TUBE } from './sim.js';
import { makeView, WALL, CAP_LEN } from './draw.js';
import { makeVoice } from './voice.js';
mark('libs');

const ID = 'rainstick';
const stage = document.getElementById('stage');
const fail = stage.querySelector('.fail');

// Gravity in bead units per second squared: slow glass, under a tenth of real.
const G = 180;
// The turning frame's forces, scaled to the same slow time.
const SPIN_W = 0.4, SPIN_A = 0.16;
// A pin's light halves in this time; reduced motion shortens it.
const HALF_LIFE = 0.4, HALF_LIFE_RM = 0.15;
const FLIP_S = 0.8;
const EXT_X = TUBE.half + CAP_LEN, EXT_Y = TUBE.R + WALL + 0.6;

const store = {
  get(k) { try { return localStorage.getItem(`stimming.${ID}.${k}`); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(`stimming.${ID}.${k}`, String(v)); } catch { /* private mode */ } },
};
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const savedBeads = clamp(Number(store.get('beads')) || 180, 80, 280);

/* ---------- state ---------- */
const sim = makeSim(savedBeads);
const glow = new Float32Array(sim.pins.n);
// Tube angle: target, actual, spin speed and spin acceleration.
const turn = { to: 0, at: 0, w: 0, a: 0, flip: null };
let start = 0.73;
const view = { cx: 0, cy: 0, s: 1, sTo: 1, angle: 0, lx: 0, ly: 0, lr: 1, glowK: 1, bloomK: 0.9, jolt: 0, seed: 0, sim, glow };
let rm = reduced();
let gl = null, draw = null, raf = 0, visible = true, last = 0, ptr = null, holdT = 0, rung = 0;
const perf = { run: 0, win: [] };

const kit = audioKit({ keys: new Set([' ', 'Enter', 'f', 'F', 'ArrowLeft', 'ArrowRight']) });
const voice = makeVoice(kit);

const ui = initPage({ id: ID, bar: {
  actions: [{ verb: 'flip', key: 'F', onPress: () => flip() }],
  slider: { label: 'Beads', min: 80, max: 280, step: 10, value: savedBeads, onInput: v => { sim.want = Math.round(v); store.set('beads', sim.want); sim.still = 0; wake(); } },
  quality: true,
  reset: () => reset(),
  keys: [['drag', 'turn the tube'], ['click', 'shake'], ['F', 'flip']],
  help: [['drag', 'Turn the rain stick'], ['click', 'Shake the rain stick'], ['F', 'Turn the rain stick over'],
    ['space', 'Shake the rain stick'], ['← →', 'Tilt the rain stick'], ['Beads', 'Change the number of beads']],
} });

const introDone = playIntro({ ready: pageReady() });

const canvas = document.createElement('canvas');
canvas.setAttribute('aria-hidden', 'true');
stage.prepend(canvas);

/* ---------- framing ---------- */
// The free stage: everything between the bar strips.
function room() {
  const r = stage.getBoundingClientRect();
  const c = ui.cover?.() || { top: 0, bottom: 0 };
  const top = c.top || 0, h = Math.max(120, r.height - top - (c.bottom || 0));
  return { w: r.width, h, top };
}

// The scale that fits the whole tube at this angle.
function fitScale(angle, w, h) {
  const c = Math.abs(Math.cos(angle)), s = Math.abs(Math.sin(angle));
  const pad = Math.max(16, Math.min(w, h) * 0.05);
  return Math.min((w / 2 - pad) / (EXT_X * c + EXT_Y * s), (h / 2 - pad) / (EXT_X * s + EXT_Y * c));
}

// The start angle follows the free stage's diagonal, never flatter than 42°.
function startAngle() {
  const { w, h } = room();
  return clamp(Math.atan2(h, w) * 1.15, 0.73, 1.2);
}

/* ---------- gestures ---------- */
const gravity = () => ({ gx: G * Math.sin(turn.at), gy: G * Math.cos(turn.at) });

function flip() {
  // Turn so the end that holds the beads rises first.
  const gx = gravity().gx;
  const dir = turn.flip ? turn.flip.dir : (gx >= 0 ? -1 : 1);
  const to = (turn.flip ? turn.flip.to : turn.to) + dir * Math.PI;
  if (rm) {
    turn.to = turn.at = to; turn.w = turn.a = 0; turn.flip = null;
  } else {
    turn.flip = { from: turn.to, to, dir, t0: performance.now() };
  }
  sim.still = 0;
  voice.whoosh(dir);
  wake();
}

function shake() {
  const { gx, gy } = gravity();
  sim.shake(gx, gy, rm ? 0.6 : 1);
  view.jolt = (gx >= 0 ? -1 : 1) * (rm ? 0.4 : 1.1);
  wake();
}

function tilt(by) {
  turn.flip = null;
  turn.to += by;
  sim.still = 0;
  wake();
}

function reset() {
  turn.flip = null;
  start = startAngle();
  turn.to = turn.at = start; turn.w = turn.a = 0;
  sim.fill(sim.want, 1);
  glow.fill(0);
  sim.still = 0;
  wake();
}

// The pointer angle about the tube's centre, in canvas CSS pixels.
const pointerAngle = e => {
  const r = canvas.getBoundingClientRect();
  const x = e.clientX - r.left - view.cx / view.dpr, y = e.clientY - r.top - view.cy / view.dpr;
  return { a: Math.atan2(y, x), d: Math.hypot(x, y) };
};
const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));

stage.addEventListener('pointerdown', e => {
  if (e.button > 0 || ptr) return;
  stage.setPointerCapture?.(e.pointerId);
  const p = pointerAngle(e);
  ptr = { id: e.pointerId, x: e.clientX, y: e.clientY, mode: 'press', a: p.a };
  clearTimeout(holdT);
  holdT = setTimeout(() => { if (ptr?.mode === 'press') ptr.mode = 'hold'; }, 260);
});
stage.addEventListener('pointermove', e => {
  if (!ptr || e.pointerId !== ptr.id) return;
  if (ptr.mode !== 'drag' && Math.hypot(e.clientX - ptr.x, e.clientY - ptr.y) > 8) {
    ptr.mode = 'drag';
    turn.flip = null;
    stage.classList.add('is-turning');
  }
  if (ptr.mode !== 'drag') return;
  const p = pointerAngle(e);
  // Near the centre the angle is unsteady, so it does not turn the tube.
  if (p.d > 22) turn.to += wrap(p.a - ptr.a);
  ptr.a = p.a;
  sim.still = 0;
  wake();
});
const end = e => {
  if (!ptr || (e && e.pointerId !== ptr.id)) return;
  if (e?.type === 'pointerup' && ptr.mode === 'press') shake();
  clearTimeout(holdT);
  ptr = null;
  stage.classList.remove('is-turning');
  wake();
};
stage.addEventListener('pointerup', end);
stage.addEventListener('pointercancel', end);
stage.addEventListener('lostpointercapture', end);

stage.addEventListener('keydown', e => {
  if (e.target !== stage || e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); shake(); }
  else if (e.key === 'ArrowLeft') { e.preventDefault(); tilt(-0.21); }
  else if (e.key === 'ArrowRight') { e.preventDefault(); tilt(0.21); }
});

/* ---------- one frame ---------- */
const ease = t => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

function spin(dt, now) {
  const f = turn.flip;
  if (f) {
    const t = Math.min(1, (now - f.t0) / (FLIP_S * 1000));
    turn.to = f.from + (f.to - f.from) * ease(t);
    if (t >= 1) turn.flip = null;
  }
  // A stiff spring follows the target, so the beads never see a jump.
  const k = 260, c = 2 * Math.sqrt(k);
  turn.a = k * (turn.to - turn.at) - c * turn.w;
  turn.w += turn.a * dt;
  turn.at += turn.w * dt;
  if (!f && Math.abs(turn.to - turn.at) < 1e-4 && Math.abs(turn.w) < 1e-3) { turn.at = turn.to; turn.w = turn.a = 0; }
}

function frame(now) {
  raf = 0;
  const dt = Math.min(1 / 20, (now - last) / 1000 || 0);
  last = now;
  let busy = false;
  try {
    spin(dt, now);
    const spinning = turn.flip || turn.w !== 0;
    const asleep = sim.still > 0.5 && !ptr && !spinning;
    if (!asleep) {
      const { gx, gy } = gravity();
      sim.advance(dt, { gx, gy, w: turn.w * SPIN_W, a: turn.a * SPIN_A });
    }
    hits();
    voice.tick(dt);
    const fade = Math.exp((-dt * Math.LN2) / (rm ? HALF_LIFE_RM : HALF_LIFE));
    let lit = 0;
    for (let i = 0; i < glow.length; i++) { glow[i] *= fade; if (glow[i] < 0.004) glow[i] = 0; lit = Math.max(lit, glow[i]); }
    view.jolt *= Math.exp(-dt / 0.06);
    if (Math.abs(view.jolt) < 0.005) view.jolt = 0;
    const easing = place(dt);
    render(now);
    busy = !!(ptr || spinning || !asleep || lit > 0 || view.jolt || easing);
    watch(dt, busy);
  } finally {
    if (busy && visible) raf = requestAnimationFrame(frame);
    else kit.rest(() => !raf && !voice.busy());
  }
}

// Hits light their pins and play; knocks only play.
function hits() {
  const h = sim.hits, k = sim.knocks;
  const c = Math.cos(turn.at), s = Math.sin(turn.at), w = view.w || 1;
  const pan = (x, y) => clamp(((view.cx / view.dpr + view.s / view.dpr * (x * c - y * s)) / w) * 2 - 1, -1, 1);
  const gain = rm ? 0.5 : 1;
  for (let i = 0; i < h.length; i += 3) {
    const p = h[i], v = h[i + 1];
    glow[p] = Math.min(1.8, glow[p] + (v / 70) * gain);
    voice.hit(p, v, pan(h[i + 2], sim.pins.y[p]));
  }
  for (let i = 0; i < k.length; i += 2) voice.knock(k[i], pan(k[i + 1], 0));
  h.length = 0; k.length = 0;
}

// Fits the canvas and eases the tube's scale; true while the scale moves.
function place(dt) {
  const { w, h, top } = room();
  const fit = fitCanvas(canvas, { maxDpr: rung >= 1 ? 1 : 2 });
  view.dpr = fit.dpr;
  view.w = w;
  const sTo = fitScale(turn.at, w, h) * fit.dpr;
  // The tube shrinks fast, so it never leaves the stage, and grows slowly.
  const tau = sTo < view.s ? 0.06 : 0.35;
  view.s = view.s > 0 && dt > 0 ? view.s + (sTo - view.s) * (1 - Math.exp(-dt / tau)) : sTo;
  const moving = Math.abs(view.s - sTo) > sTo * 0.002;
  if (!moving) view.s = sTo;
  view.cx = (w / 2) * fit.dpr;
  view.cy = (top + h / 2) * fit.dpr;
  view.angle = turn.at;
  // The backlight sits low and to the right, behind the tube.
  view.lx = w * 0.66 * fit.dpr;
  view.ly = (top + h * 0.8) * fit.dpr;
  view.lr = Math.max(w, h) * 0.42 * fit.dpr;
  view.glowK = rm ? 0.55 : 1;
  draw.resize(fit.W, fit.H, rung >= 2 ? 3 : 4);
  return moving;
}

function render(now) {
  view.seed = now;
  draw.render(view);
}

// The slow-frame step: after 4 s, a 2 s average above 1/38 s drops one rung.
function watch(dt, busy) {
  if (!busy || rung >= 3) return;
  perf.run += dt;
  perf.win.push(dt);
  if (perf.win.length > 60) perf.win.shift();
  if (perf.run < 4 || perf.win.length < 60) return;
  const avg = perf.win.reduce((a, b) => a + b, 0) / perf.win.length;
  if (avg > 1 / 38) {
    rung++;
    perf.win.length = 0;
    perf.run = 2;
    if (rung === 3) sim.want = Math.round(sim.want * 0.67);
  }
}

function wake() {
  if (!raf && visible && draw) { last = performance.now(); raf = requestAnimationFrame(frame); }
}

/* ---------- boot ---------- */
async function setup() {
  gl = canvas.getContext('webgl2', { antialias: false, alpha: false, premultipliedAlpha: false, powerPreference: 'high-performance' });
  if (!gl) throw new Error('no webgl2');
  draw = await makeView(gl, sim.pins);
}

// The first frame is mid trickle: the sim runs ahead before it shows.
function prime() {
  start = startAngle();
  turn.to = turn.at = start;
  sim.fill(sim.want, -1);
  const { gx, gy } = gravity();
  const fade = Math.exp((-Math.LN2 / HALF_LIFE) / 60);
  for (let t = 0; t < 150; t++) {
    sim.advance(1 / 60, { gx, gy, w: 0, a: 0 });
    for (let i = 0; i < glow.length; i++) glow[i] *= fade;
    for (let i = 0; i < sim.hits.length; i += 3) glow[sim.hits[i]] = Math.min(1.8, glow[sim.hits[i]] + sim.hits[i + 1] / 70);
    sim.hits.length = 0; sim.knocks.length = 0;
  }
  view.s = 0;
}

whenVisible(stage, on => { visible = on; if (on) wake(); });
onReducedChange?.(on => { rm = on; wake(); });
onQuality?.(() => wake());
ui.onCover?.(() => wake());
new ResizeObserver(() => wake()).observe(stage);

onContextLoss(canvas, {
  lost: () => { cancelAnimationFrame(raf); raf = 0; draw = null; },
  restored: async () => { await setup(); wake(); },
  failed: () => fail.removeAttribute('hidden'),
});

mark('build');
try {
  await setup();
  prime();
  place(0);
  render(performance.now());
  gl.finish();
  canvas.classList.add('on');
  mark('first-frame');
  // The trickle starts once the intro clears.
  await introDone;
  sim.still = 0;
  wake();
} catch (err) {
  console.error(err);
  fail.removeAttribute('hidden');
  ui.hideControls?.();
}

// A test hook: ?qa exposes the state.
if (new URLSearchParams(location.search).has('qa')) globalThis.__rain = { sim, turn, view, glow, flip, shake, tilt, reset };
