// Spillway: a concrete arch dam in a gorge. Drag a gate up; the water roars.
// The scene raymarches once into a G-buffer. Each frame lights it.
import { initPage, whenVisible, pageReady, stage as mark, reduced, onReducedChange, audioKit, sound } from '../shared/stim.js';
import { intro as playIntro } from '../shared/intro.js';
import { TRI_VS, program, linked, target, free, bind, tri, onContextLoss, nextFrame } from '../shared/gl.js';
import { bloomChain } from '../shared/glow.js';
import { detail } from '../shared/detail.js';
import { GBUF, MIST, SHADE, FINAL, DAM } from './shaders.js';
import { spillwaySound } from './sound.js';
mark('libs');

const stage = document.getElementById('stage');
const fail = stage.querySelector('.fail');
const N = DAM.bays;
const bayX = i => DAM.first + i * DAM.pitch;
const faceR = y => DAM.r0 - 0.14 * (DAM.crest - y);

/* ---------- light and camera ---------- */
// Late afternoon: the sun stands low behind the camera, to the right.
const SUN = (() => { const v = [0.36, 0.52, -0.77], l = Math.hypot(...v); return v.map(c => c / l); })();
const SUN_COL = [3.6, 2.8, 1.95], SKY_COL = [0.33, 0.47, 0.7];
const CAM = [-3.0, 15.0, -6.0];
// Gate travel per second: heavy steel moves slowly.
const GATE_RATE = 0.22;
// Seconds of fall from the sill to the pool.
const FALL = Math.sqrt((2 * DAM.sill) / 9.81);
const MAX_DROPS = 24;

let cam = null;
// The view: wide on a desk screen; a phone keeps all five bays in frame.
function camera(asp) {
  let tanY = 0.5, tanX = tanY * asp;
  if (tanX < 0.31) { tanX = 0.31; tanY = tanX / asp; }
  // The deck top sits a third of the way down the frame.
  const deck = [1, 57.5, 88], v = deck.map((c, i) => c - CAM[i]);
  const alpha = Math.atan2(v[1], Math.hypot(v[0], v[2]));
  const pitch = alpha - Math.atan((asp < 1 ? 0.5 : 0.62) * tanY);
  const yaw = Math.atan2(v[0], v[2]);
  const fwd = [Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch)];
  const right = norm([fwd[2], 0, -fwd[0]]);
  const up = cross(fwd, right);
  return { fwd, right, up, tanX, tanY };
}
const norm = v => { const l = Math.hypot(...v); return v.map(c => c / l); };
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
// World point to stage CSS pixels.
function project(p, w, h) {
  const v = p.map((c, i) => c - CAM[i]), z = dot(v, cam.fwd);
  return [(dot(v, cam.right) / z / cam.tanX + 1) * 0.5 * w, (1 - dot(v, cam.up) / z / cam.tanY) * 0.5 * h];
}

/* ---------- state ---------- */
// One record per bay: gate position and goal, flow, the draining film, wetness.
const bays = Array.from({ length: N }, () => ({ pos: 0, goal: 0, flow: 0, film: 0, wet: 0, drip: 0, spawn: 0, moving: false }));
// The first frame shows a picture: one gate cracked, a trickle and old spray.
bays[2].pos = bays[2].goal = 0.06; bays[2].flow = 0.04; bays[2].wet = 1;
const mist = { amt: 0.12, top: 14, reach: 14, cx: 0, wide: 4, rise: 0, drift: 0 };
let spray = 0.15, foam = 0.1, foamRun = 0;
const drops = [];
let clock = 0, cloudT = 0, frameNo = 0;
let lastInput = performance.now(), visible = true, raf = 0, last = 0, timeK = 1, frozen = reduced();

/* ---------- bar ---------- */
const ui = initPage({ id: 'spillway', bar: {
  actions: [{ verb: 'open', label: 'Open all', key: 'Space', onPress: () => toggleAll() }],
  slider: { label: 'Gates', min: 0, max: 1, step: 0.01, value: 0, onInput: v => setAll(v, false) },
  quality: true,
  reset: () => setAll(0, true),
  keys: [['drag', 'open a gate'], ['space', 'open or close all']],
  help: [
    ['drag', 'Drag up on a gate to open it; drag across to open more'],
    ['click', 'Open or close one gate'],
    ['space', 'Open or close all the gates'],
    ['↑', 'Raise or lower all the gates with the arrows'],
  ],
} });
const introDone = playIntro({ ready: pageReady() });
const kit = audioKit({ sleepMs: 1500 });
const snd = spillwaySound(kit);

const openBtn = () => document.querySelector('.stim-ui [aria-keyshortcuts="Space"]');
function syncBar() {
  const mean = bays.reduce((s, b) => s + b.goal, 0) / N;
  ui.slider?.set(mean);
  openBtn()?.setAttribute('aria-pressed', String(mean > 0.5));
}
function setAll(v, sync = true) {
  bays.forEach(b => { b.goal = Math.max(0, Math.min(1, v)); });
  touch();
  if (sync) syncBar(); else openBtn()?.setAttribute('aria-pressed', String(v > 0.5));
}
function toggleAll() {
  const mean = bays.reduce((s, b) => s + b.goal, 0) / N;
  setAll(mean > 0.5 ? 0 : 1);
}

/* ---------- GL ---------- */
const canvas = document.createElement('canvas');
canvas.setAttribute('aria-hidden', 'true');
stage.append(canvas);
let gl = null, P = null, vao = null, noiseTex = null, bloom = null;
let G = null, mistT = null, hdr = null;
let W = 0, H = 0, cssW = 0, cssH = 0;
// G-buffer rows still to draw; a resize queues them all again.
let gTodo = [];
let crestBox = null, gateDirty = true;
const D = detail({ maxDpr: 1.5, budget: 1.6e6, steps: 3, settle: 2, onChange: () => resize(true) });

// The noise texture: green holds red shifted by (37, 17), for 3D value noise.
function makeNoise() {
  const n = new Uint8Array(256 * 256), px = new Uint8Array(256 * 256 * 4);
  for (let i = 0; i < n.length; i++) n[i] = (Math.random() * 256) | 0;
  for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
    const i = (y * 256 + x) * 4;
    px[i] = n[((y + 17) & 255) * 256 + ((x + 37) & 255)];
    px[i + 1] = n[y * 256 + x];
    px[i + 2] = px[i + 3] = 255;
  }
  const t = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, t);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, 256, 256, 0, gl.RGBA, gl.UNSIGNED_BYTE, px);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
  return t;
}
// Three float targets on one framebuffer.
function gbuffer(w, h) {
  const fb = gl.createFramebuffer(), tex = [];
  gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
  for (let i = 0; i < 3; i++) {
    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA16F, w, h);
    for (const k of [gl.TEXTURE_MIN_FILTER, gl.TEXTURE_MAG_FILTER]) gl.texParameteri(gl.TEXTURE_2D, k, gl.NEAREST);
    for (const k of [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T]) gl.texParameteri(gl.TEXTURE_2D, k, gl.CLAMP_TO_EDGE);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0 + i, gl.TEXTURE_2D, t, 0);
    tex.push(t);
  }
  gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1, gl.COLOR_ATTACHMENT2]);
  if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) throw new Error('g-buffer is not renderable');
  return { fb, tex, w, h };
}
function freeG() {
  if (!G) return;
  G.tex.forEach(t => gl.deleteTexture(t));
  gl.deleteFramebuffer(G.fb);
  G = null;
}

async function setup() {
  gl = canvas.getContext('webgl2', { antialias: false, alpha: false, depth: false, powerPreference: 'high-performance' });
  if (!gl) throw new Error('no webgl2');
  if (!gl.getExtension('EXT_color_buffer_float')) throw new Error('no float targets');
  gl.getExtension('OES_texture_float_linear');
  P = await linked(gl, {
    g: program(gl, TRI_VS, GBUF), mist: program(gl, TRI_VS, MIST),
    shade: program(gl, TRI_VS, SHADE), final: program(gl, TRI_VS, FINAL),
  });
  vao = gl.createVertexArray();
  noiseTex = makeNoise();
  bloom = bloomChain(gl, { max: 5 });
  G = mistT = hdr = null;
  W = H = 0;
}

// Sizes every target; a new size redraws the G-buffer in rows.
function resize(force = false) {
  if (!gl || !P) return;
  const r = stage.getBoundingClientRect();
  cssW = Math.max(1, r.width); cssH = Math.max(1, r.height);
  const dpr = D.dpr(cssW, cssH);
  const w = Math.max(2, Math.round(cssW * dpr)), h = Math.max(2, Math.round(cssH * dpr));
  if (!force && w === W && h === H) return;
  W = w; H = h;
  canvas.width = W; canvas.height = H;
  cam = camera(cssW / cssH);
  freeG(); free(gl, mistT); free(gl, hdr);
  G = gbuffer(W, H);
  const ms = D.rung >= 2 ? 4 : 2;
  mistT = target(gl, Math.ceil(W / ms), Math.ceil(H / ms), { clear: true });
  hdr = target(gl, W, H, { clear: true });
  const rows = 6;
  gTodo = Array.from({ length: rows }, (_, i) => [Math.floor((i * H) / rows), Math.floor(((i + 1) * H) / rows)]);
  crestBox = boxOf();
  gateDirty = false;
  wake();
}
// The crest's box on the canvas, in device pixels, for gate redraws.
function boxOf() {
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const x of [-21, 21]) for (const y of [42, 60]) for (const z of [DAM.zc + 56, DAM.zc + 77]) {
    const [sx, sy] = project([x, y, z], W, H);
    x0 = Math.min(x0, sx); x1 = Math.max(x1, sx); y0 = Math.min(y0, sy); y1 = Math.max(y1, sy);
  }
  const pad = 6;
  const bx = Math.max(0, Math.floor(x0 - pad)), by = Math.max(0, Math.floor(H - y1 - pad));
  return [bx, by, Math.min(W, Math.ceil(x1 + pad)) - bx, Math.min(H, Math.ceil(H - y0 + pad)) - by];
}

function camUniforms(p, w, h) {
  const u = p.u;
  gl.uniform2f(u.uRes, w, h);
  gl.uniform3fv(u.uCam, CAM);
  gl.uniform3fv(u.uRight, cam.right);
  gl.uniform3fv(u.uUp, cam.up);
  gl.uniform3fv(u.uFwd, cam.fwd);
  gl.uniform2f(u.uTan, cam.tanX, cam.tanY);
  gl.uniform3fv(u.uSun, SUN);
  gl.uniform3fv(u.uSunCol, SUN_COL);
  gl.uniform3fv(u.uSkyCol, SKY_COL);
  if (u.uNoise) bind(gl, p, 'uNoise', 3, noiseTex);
}
// Draws part of the G-buffer: rows of the frame, or a scissor box.
function drawG(box) {
  const p = P.g;
  gl.useProgram(p.p);
  gl.bindFramebuffer(gl.FRAMEBUFFER, G.fb);
  gl.viewport(0, 0, W, H);
  camUniforms(p, W, H);
  gl.uniform1fv(p.u.uGate, bays.map(b => b.pos));
  gl.uniform1f(p.u.uFar, 700);
  gl.uniform1i(p.u.uSteps, D.level === 0 ? 150 : 220);
  gl.enable(gl.SCISSOR_TEST);
  gl.scissor(...box);
  gl.bindVertexArray(vao);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
  gl.disable(gl.SCISSOR_TEST);
}

function render() {
  if (!G) return;
  // Rows first: one sixth of the frame per draw keeps each draw short.
  if (gTodo.length) { const [a, b] = gTodo.shift(); drawG([0, a, W, b - a]); }
  else if (gateDirty) { drawG(crestBox); gateDirty = false; }
  if (gTodo.length) return;

  // Mist at half size.
  const m = P.mist;
  gl.useProgram(m.p);
  camUniforms(m, mistT.w, mistT.h);
  bind(gl, m, 'uG0', 0, G.tex[0]);
  gl.uniform2f(m.u.uGRes, W, H);
  gl.uniform1f(m.u.uAmt, mist.amt);
  gl.uniform1f(m.u.uTop, mist.top);
  gl.uniform1f(m.u.uReach, mist.reach);
  gl.uniform1f(m.u.uCx, mist.cx);
  gl.uniform1f(m.u.uWide, mist.wide);
  gl.uniform1f(m.u.uRise, mist.rise);
  gl.uniform1f(m.u.uDrift, mist.drift);
  gl.uniform1i(m.u.uMSteps, D.rung >= 3 ? 9 : 14);
  tri(gl, mistT, vao);

  // Light, water and drips at full size.
  const s = P.shade;
  gl.useProgram(s.p);
  camUniforms(s, W, H);
  bind(gl, s, 'uG0', 0, G.tex[0]);
  bind(gl, s, 'uG1', 1, G.tex[1]);
  bind(gl, s, 'uG2', 2, G.tex[2]);
  bind(gl, s, 'uMist', 4, mistT);
  gl.uniform1f(s.u.uTime, clock);
  gl.uniform1f(s.u.uCloudT, cloudT);
  gl.uniform1fv(s.u.uFlow, bays.map(b => Math.max(b.flow, b.film)));
  gl.uniform1fv(s.u.uWet, bays.map(b => b.wet));
  gl.uniform1f(s.u.uFoam, foam);
  gl.uniform1f(s.u.uFoamRun, foamRun);
  gl.uniform1f(s.u.uSpray, spray);
  const dv = new Float32Array(MAX_DROPS * 4);
  drops.forEach((d, i) => dv.set([d.x, d.t0, d.k, 0], i * 4));
  gl.uniform4fv(s.u.uDrop, dv);
  gl.uniform1i(s.u.uDrops, drops.length);
  tri(gl, hdr, vao);

  // Bloom, then the grade to the screen.
  const bt = bloom.render(hdr.tex, W, H, { threshold: 1.1, cap: 8, levels: D.rung >= 2 ? 3 : 5 });
  const f = P.final;
  gl.useProgram(f.p);
  gl.uniform2f(f.u.uRes, W, H);
  bind(gl, f, 'uHdr', 0, hdr);
  bind(gl, f, 'uBloom', 1, bt);
  gl.uniform1f(f.u.uExpo, 0.42);
  gl.uniform1f(f.u.uBloomK, 0.22);
  gl.uniform1f(f.u.uFrame, frozen ? 0 : frameNo % 64);
  tri(gl, null, vao);
}

/* ---------- simulation ---------- */
const ease = (x, k) => 1 - Math.exp(-x / k);
const hash = n => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
let dropSeed = 1;

function step(dt) {
  // Ambient time eases to a stop when the toy falls asleep.
  const amb = frozen ? 0 : dt * timeK;
  clock += amb;
  cloudT += amb;
  let total = 0, moving = false, cx = 0;
  bays.forEach((b, i) => {
    // Gates move at a fixed rate and ease into place.
    const gap = b.goal - b.pos;
    const was = b.moving;
    b.moving = Math.abs(gap) > 1e-3;
    if (b.moving) {
      const v = Math.min(GATE_RATE * dt, Math.abs(gap)) * Math.min(1, Math.abs(gap) * 12 + 0.25);
      b.pos = Math.max(0, Math.min(1, b.pos + Math.sign(gap) * v));
      gateDirty = true;
      moving = true;
    } else b.pos = b.goal;
    if (b.moving !== was) snd.clank(bayX(i), b.moving);
    // Flow follows the gate: an orifice gives a little more than linear.
    const q = Math.pow(b.pos, 1.25);
    b.flow += (q - b.flow) * ease(dt, 0.7);
    if (b.flow < 1e-4) b.flow = 0;
    // The film on the face holds a trickle for a while after the flow stops.
    b.film = Math.max(b.flow, Math.min(b.film, 0.05) * Math.exp(-dt / 2.8));
    if (b.film < 0.0015) b.film = b.flow;
    // Wet concrete dries slowly once the water leaves it.
    b.wet = b.flow > 0.01 ? 1 : b.wet * Math.exp(-dt / 50);
    // Drips come once the trickle has gone, and fade as the lip dries.
    b.drip = b.wet * (1 - Math.min(1, Math.max(b.flow, b.film) / 0.012));
    total += b.flow;
    cx += b.flow * bayX(i);
  });
  cx = total > 1e-4 ? cx / total : mist.cx;
  const F = total / N;

  // Mist climbs while water falls, then hangs and thins.
  const goal = Math.pow(F, 0.7);
  mist.amt += (goal - mist.amt) * (goal > mist.amt ? ease(dt, 3.5) : ease(amb, 30));
  const topGoal = 10 + 70 * Math.pow(F, 0.6);
  if (topGoal > mist.top) mist.top += Math.min(topGoal - mist.top, dt * (1.5 + 4 * F));
  else mist.top += (topGoal - mist.top) * ease(amb, 60);
  mist.reach += ((10 + 28 * F) - mist.reach) * (F * 28 + 10 > mist.reach ? ease(dt, 6) : ease(amb, 40));
  mist.cx += (cx - mist.cx) * ease(dt, 3);
  mist.wide += ((4 + 14 * Math.min(1, total / 2.5)) - mist.wide) * ease(dt, 4);
  mist.rise += amb * (0.25 + 2.2 * F);
  mist.drift += amb * (0.15 + 0.8 * F);
  foamRun += amb * (1.5 + 7 * F);
  spray += (Math.min(1, F * 1.6) - spray) * (F * 1.6 > spray ? ease(dt, 5) : ease(amb, 45));
  foam += (Math.min(1, F * 1.3) - foam) * (F > foam ? ease(dt, 3) : ease(amb, 20));

  // Drips: each one falls from a gate lip and lands in the pool.
  for (let i = drops.length - 1; i >= 0; i--) {
    const d = drops[i];
    if (clock - d.t0 > FALL + 1.7) drops.splice(i, 1);
    else if (!d.landed && clock - d.t0 >= FALL) { d.landed = true; snd.drip(d.x, d.k); }
  }
  bays.forEach((b, i) => {
    if (b.drip < 0.02 || amb <= 0) return;
    b.spawn -= amb * b.drip * 1.6;
    if (b.spawn <= 0 && drops.length < MAX_DROPS) {
      dropSeed++;
      drops.push({ x: bayX(i) + (hash(dropSeed) - 0.5) * 2 * (DAM.bayHalf - 0.3), t0: clock, k: 0.5 + 0.5 * hash(dropSeed + 0.5), landed: false });
      b.spawn = 0.3 + 1.2 * hash(dropSeed + 0.25);
    }
  });

  snd.update({ F, cx, moving, trickle: bays.reduce((s, b) => s + (b.flow > 0.001 && b.flow < 0.08 ? b.flow : 0), 0), k: timeK });
  return moving;
}

// Quiet: no flow, no drips, no mist worth a frame, no gate in motion.
function quiet() {
  return bays.every(b => !b.moving && b.flow < 1e-4 && b.film < 0.003 && b.drip < 0.02) && drops.length === 0 && mist.amt < 0.004 && foam < 0.01;
}

/* ---------- frame loop ---------- */
let timer = 0;
function frame(now) {
  raf = 0;
  if (!visible || !gl) return;
  // A frame stamp can predate the wake, so dt never goes below zero.
  const dt = Math.max(0, Math.min(0.1, (now - last) / 1000));
  last = Math.max(last, now);
  let again = true, lively = true;
  try {
    // 60 s after the last input, time eases to a stop over 2 s.
    const idle = (now - lastInput) / 1000;
    timeK = idle < 60 ? 1 : Math.max(0, 1 - (idle - 60) / 2);
    step(dt);
    render();
    D.frame(dt);
    frameNo++;
    lively = dragging || gTodo.length > 0 || bays.some(b => b.moving);
    again = lively || (!quiet() && timeK > 0 && !frozen);
  } finally {
    // A thrown error still leaves the loop able to wake.
    if (!again) snd.rest();
    // Drifting waits out the rest of a 30 fps frame first.
    else schedule(lively ? 0 : Math.max(0, 33 - (performance.now() - now)));
  }
}
// One frame at most is ever pending, so loops never stack.
function schedule(delay) {
  if (raf || timer || !visible || !gl) return;
  if (delay > 0) timer = setTimeout(() => { timer = 0; raf = requestAnimationFrame(frame); }, delay);
  else raf = requestAnimationFrame(frame);
}
function wake() {
  if (timer) { clearTimeout(timer); timer = 0; }
  if (!raf) last = performance.now();
  schedule(0);
}
function halt() { cancelAnimationFrame(raf); raf = 0; clearTimeout(timer); timer = 0; }
function touch() { lastInput = performance.now(); timeK = 1; wake(); }

/* ---------- pointer: drag on the dam ---------- */
let dragging = false, pid = null, downAt = null, startGoal = 0, bay = -1, moved = false, held = false, holdT = 0;
// The bay under a stage point: nearest crest centre on the screen.
function bayAt(x) {
  let best = 0, bd = 1e9;
  for (let i = 0; i < N; i++) {
    const [sx] = project([bayX(i), 50, DAM.zc + Math.sqrt(faceR(50) ** 2 - bayX(i) ** 2)], cssW, cssH);
    if (Math.abs(sx - x) < bd) { bd = Math.abs(sx - x); best = i; }
  }
  return best;
}
const local = e => { const r = stage.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
stage.addEventListener('pointerdown', e => {
  if (e.button !== 0 || !cam || e.target !== canvas && e.target !== stage) return;
  try { stage.setPointerCapture(e.pointerId); } catch { /* capture is optional */ }
  pid = e.pointerId;
  downAt = local(e);
  bay = bayAt(downAt[0]);
  startGoal = bays[bay].goal;
  moved = false; held = false;
  clearTimeout(holdT);
  holdT = setTimeout(() => { held = true; }, 260);
  dragging = true;
  touch();
});
stage.addEventListener('pointermove', e => {
  if (!dragging || e.pointerId !== pid) return;
  const [x, y] = local(e);
  if (!moved && Math.hypot(x - downAt[0], y - downAt[1]) < 8) return;
  moved = true;
  // A drag of 40% of the stage height runs a gate end to end.
  const level = Math.max(0, Math.min(1, startGoal + (downAt[1] - y) / (cssH * 0.4)));
  const now = bayAt(x);
  // Sweeping across carries the level to each bay the pointer crosses.
  const a = Math.min(bay, now), b = Math.max(bay, now);
  for (let i = a; i <= b; i++) bays[i].goal = level;
  bay = now;
  syncBar();
  touch();
});
function endDrag(e) {
  if (!dragging || (e && e.pointerId !== pid)) return;
  clearTimeout(holdT);
  // A tap opens a shut gate or shuts an open one.
  if (!moved && !held && bay >= 0) { bays[bay].goal = bays[bay].goal > 0.5 ? 0 : 1; syncBar(); }
  dragging = false; pid = null;
  touch();
}
['pointerup', 'pointercancel', 'lostpointercapture'].forEach(t => stage.addEventListener(t, endDrag));

stage.addEventListener('keydown', e => {
  if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
  e.preventDefault();
  const mean = bays.reduce((s, b) => s + b.goal, 0) / N;
  setAll(mean + (e.key === 'ArrowUp' ? 0.1 : -0.1));
});

/* ---------- life cycle ---------- */
whenVisible(stage, on => {
  visible = on;
  if (on) wake();
  else { halt(); snd.hide(); }
});
onReducedChange(on => { frozen = on; wake(); });
sound.onChange(on => { if (on) touch(); });
new ResizeObserver(() => resize()).observe(stage);

onContextLoss(canvas, {
  lost: () => { halt(); gl = null; },
  restored: async () => { await setup(); resize(true); wake(); },
  failed: () => fail.removeAttribute('hidden'),
});

mark('build');
try {
  await setup();
  resize(true);
  // The whole G-buffer draws behind the intro, one row band per frame.
  while (gTodo.length) { const [a, b] = gTodo.shift(); drawG([0, a, W, b - a]); await nextFrame(); }
  step(0);
  render();
  gl.finish();
  canvas.classList.add('on');
  mark('first-frame');
  syncBar();
  wake();
} catch (err) {
  console.error(err);
  fail.removeAttribute('hidden');
  ui.hideControls?.();
}
void introDone;
