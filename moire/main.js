// Moire veils: two sheer veils hang one behind the other against low evening light.
// Drag slides the front veil; the moire bands race, bend and bloom far faster than the cloth.
// Plan: docs/plans/moire.md. Toy doc: docs/toys/moire.md.
import { initPage, whenVisible, fitCanvas, reduced, onReducedChange, quality, onQuality, audioKit, stage as mark, pageReady } from '../shared/stim.js';
import { intro as playIntro } from '../shared/intro.js';
import { TRI_VS, program, linked, target, free, bind, tri, onContextLoss } from '../shared/gl.js';
import { bloomChain } from '../shared/glow.js';
import { VEIL_FS, FINAL_FS, STATE } from './veil.js';
mark('libs');
playIntro({ ready: pageReady() });

const ID = 'moire';
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a, b) => a + Math.random() * (b - a);
let reduce = reduced();

/* ---------- settings ---------- */
// Settings persist per browser; storage is optional.
const saved = k => { try { return localStorage.getItem(`stimming.${ID}.${k}`); } catch { return null; } };
const save = (k, v) => { try { localStorage.setItem(`stimming.${ID}.${k}`, String(v)); } catch { /* storage is optional */ } };
const num = (k, d, a, b) => { const v = Number(saved(k)); return saved(k) != null && Number.isFinite(v) && v >= a && v <= b ? v : d; };
const opts = {
  cloth: ['voile', 'silk', 'mesh'].includes(saved('cloth')) ? saved('cloth') : 'voile',
  twist: num('twist', 1.2, 0, 8),
  weave: num('weave', 1, 0.7, 1.4),
};

/* ---------- cloths ---------- */
// fill: the part of each pitch a thread covers. clear: light through a thread.
// soft: how round and hairy a thread is. weft: weft pitch over warp pitch.
// albF, albR: thread glow, front and rear. sheen: colour and sharpness.
// fold: pleat depth. dif: diffraction gain. room: front light. tone: beat pitch in Hz.
const CLOTHS = {
  voile: { fill: 0.46, clear: 0.08, soft: 0.92, weft: 1.05, albF: [0.13, 0.11, 0.09], albR: [0.12, 0.1, 0.085],
    sheen: [0.07, 0.075, 0.09, 22], fold: 1, dif: 0.05, room: 1, glow: 1, tone: 196 },
  silk: { fill: 0.5, clear: 0.12, soft: 0.9, weft: 1, albF: [0.22, 0.12, 0.04], albR: [0.04, 0.13, 0.16],
    sheen: [0.17, 0.1, 0.055, 30], fold: 0.85, dif: 0.05, room: 1.3, glow: 1.15, tone: 233 },
  mesh: { fill: 0.4, clear: 0, soft: 0.97, weft: 1, albF: [0.03, 0.022, 0.014], albR: [0.026, 0.02, 0.013],
    sheen: [0.4, 0.27, 0.14, 40], fold: 0.32, dif: 0.11, room: 1.6, glow: 1, tone: 294 },
};
// The openness of one thread direction as a series: mean, first, second harmonic.
function series(fill, clear, soft) {
  const open = 1 - fill;
  const c1 = (2 / Math.PI) * Math.sin(Math.PI * open) * soft;
  const c2 = (1 / Math.PI) * Math.sin(2 * Math.PI * open) * soft ** 4;
  return [clear + (1 - clear) * open, (1 - clear) * c1, (1 - clear) * c2];
}

/* ---------- bar ---------- */
const ui = initPage({ id: ID, bar: {
  choice: {
    label: 'Cloth', value: opts.cloth,
    options: [
      { value: 'voile', label: 'Voile', dot: 'oklch(0.9 0.03 75)', key: '1' },
      { value: 'silk', label: 'Silk', dot: 'oklch(0.75 0.13 55)', key: '2' },
      { value: 'mesh', label: 'Mesh', dot: 'oklch(0.66 0.09 65)', key: '3' },
    ],
    onPick: v => { opts.cloth = v; save('cloth', v); poke(); },
  },
  actions: [
    { verb: 'gust', key: 'G', hold: true, onDown: () => gustOn(true), onUp: () => gustOn(false) },
  ],
  slider: { label: 'Twist', min: 0, max: 8, step: 0.05, value: opts.twist, onInput: v => { opts.twist = v; save('twist', v); poke(); } },
  settings: [
    { id: 'weave', type: 'slider', label: 'Weave', min: 0.7, max: 1.4, step: 0.02, value: 1, persist: true, onInput: v => { opts.weave = v; poke(); } },
  ],
  quality: true,
  reset: () => resetVeils(),
  keys: [['drag', 'slide'], ['click', 'push'], ['arrows', 'nudge'], ['G', 'gust']],
  // Bar v3 lists every input in How to play: one instruction per row.
  help: [['drag', 'Slide the front veil'], ['click', 'Push the cloth'], ['arrows', 'Nudge the veil; up and down twist it'], ['G', 'Gust while you hold it']],
} });

/* ---------- WebGL2 ---------- */
const stage = document.getElementById('stage');
const canvas = document.createElement('canvas');
canvas.setAttribute('aria-hidden', 'true');
stage.prepend(canvas);
const gl = canvas.getContext('webgl2', { antialias: false, alpha: false, depth: false, stencil: false, premultipliedAlpha: false, powerPreference: 'high-performance' });
let failed = false;
// Without WebGL 2 and float targets the bar stays, but its controls take no input.
function fail(err) {
  if (err) console.error(err);
  failed = true;
  stage.querySelector('.fail').hidden = false;
  ui.choice.disabled = ui.slider.disabled = true;
  ui.action('gust').disabled = true;
  mark('first-frame');
}

let P = null, scene = null, bloom = null, vao = null;
let W = 1, H = 1, rung = 0;
const view = { w: 1, h: 1 };
async function build() {
  P = await linked(gl, { veil: program(gl, TRI_VS, VEIL_FS), final: program(gl, TRI_VS, FINAL_FS) });
  bloom = bloomChain(gl, { max: 5 });
  vao = gl.createVertexArray();
}
// The veils render at the canvas size, or at three quarters on the last rung.
function alloc() {
  free(gl, scene);
  const k = rung >= 3 ? 0.75 : 1;
  scene = target(gl, Math.max(1, Math.round(W * k)), Math.max(1, Math.round(H * k)), { format: gl.RGBA16F, clear: true });
}

/* ---------- the stage in cloth units ---------- */
// The stage is 100 units tall; x runs from -50 asp to 50 asp.
const asp = () => view.w / view.h;
const toWorld = (cx, cy) => {
  const r = canvas.getBoundingClientRect();
  return [((cx - r.left) / r.width - 0.5) * asp() * 100, (0.5 - (cy - r.top) / r.height) * 100];
};
// The front veil's edge rests left of centre; the sun sits right of centre.
const edge0 = () => -asp() * 50 * 0.3;
const PITCH = 0.3;

/* ---------- cloth state ---------- */
// slide: the front veil on its rail. Blobs: the hand's pull. Rings: taps.
const slide = { x: 0, v: 0, to: 0 };
const blobs = Array.from({ length: 3 }, () => ({ c: [0, 0], a: [0, 0], v: [0, 0], to: [0, 0], held: false }));
let nextBlob = 0;
const rings = [];
const gust = { held: false, g: 0 };
let twist = opts.twist, breezeT = 0, rate = 1;
const now = new Float32Array(STATE * 4), prev = new Float32Array(STATE * 4);

// A damped spring, one axis. w is the angular rate, z the damping ratio.
function spring(x, v, to, w, z, dt) {
  const a = w * w * (to - x) - 2 * z * w * v;
  v += a * dt;
  return [x + v * dt, v];
}
// The slide stays inside the rail: the edge never leaves the stage for long.
function slideBounds() {
  const half = asp() * 50, e = edge0();
  return [-half - 8 - e, half * 0.62 - e];
}
function writeState(dst) {
  const sway = reduce ? 0 : 0.38 * rate;
  dst.set([slide.x, twist * Math.PI / 180, breezeT, gust.g, 1 + 0.55 * gust.g, sway + 0.9 * gust.g, 0.8 * gust.g, 0], 0);
  blobs.forEach((b, i) => dst.set([b.c[0], b.c[1], b.a[0], b.a[1]], 8 + i * 4));
  for (let i = 0; i < 3; i++) {
    const r = rings[i];
    dst.set(r ? [r.c[0], r.c[1], r.r, r.k] : [0, 0, 0, 0], 20 + i * 4);
  }
}

/* ---------- render ---------- */
let seed = 0;
function render() {
  const c = CLOTHS[opts.cloth];
  const cw = series(c.fill, c.clear, c.soft), cf = series(c.fill * (c.weft > 1 ? 0.92 : 1), c.clear, c.soft);
  gl.bindVertexArray(vao);
  gl.disable(gl.BLEND);
  gl.useProgram(P.veil.p);
  const u = P.veil.u;
  gl.uniform2f(u.uRes, scene.w, scene.h);
  const st = new Float32Array(STATE * 8);
  st.set(now, 0); st.set(prev, STATE * 4);
  gl.uniform4fv(u.uSt, st);
  gl.uniform4f(u.uSun, asp() * 50 * 0.26, 9, 2.4, 1);
  gl.uniform4f(u.uWeave, PITCH * opts.weave, c.weft, edge0(), 2.4);
  gl.uniform3fv(u.uCw, cw);
  gl.uniform3fv(u.uCf, cf);
  gl.uniform3fv(u.uAlbF, c.albF);
  gl.uniform3fv(u.uAlbR, c.albR);
  gl.uniform4fv(u.uSheen, c.sheen);
  gl.uniform4f(u.uLook, c.room, c.dif, c.glow, c.fold);
  tri(gl, scene);
  const levels = rung >= 2 ? 3 : 5;
  const bt = bloom.render(scene.tex, scene.w, scene.h, { threshold: 1.0, cap: 8, levels });
  gl.bindVertexArray(vao);
  gl.useProgram(P.final.p);
  const f = P.final.u;
  bind(gl, P.final, 'uScene', 0, scene);
  bind(gl, P.final, 'uBloom', 1, bt);
  gl.uniform2f(f.uRes, W, H);
  gl.uniform1f(f.uBloomK, 0.55);
  gl.uniform1f(f.uExp, 1.05);
  gl.uniform1f(f.uSeed, (seed = (seed + 1) % 97));
  tri(gl, null);
}

/* ---------- step ---------- */
function step(dt) {
  prev.set(now);
  const soft = reduce ? 1 : 0;
  // The slide lags the hand like a heavy curtain on rings.
  const [lo, hi] = slideBounds();
  slide.to = clamp(slide.to, lo - 6, hi + 6);
  if (!ptr.size) slide.to = clamp(slide.to, lo, hi);
  [slide.x, slide.v] = spring(slide.x, slide.v, slide.to, 6.5, reduce ? 1 : 0.72, dt);
  // The pull rings after release; reduced motion damps it flat.
  for (const b of blobs) {
    for (let k = 0; k < 2; k++) [b.a[k], b.v[k]] = spring(b.a[k], b.v[k], b.to[k], 12, soft || 0.26, dt);
  }
  for (let i = rings.length - 1; i >= 0; i--) {
    const r = rings[i];
    r.age += dt;
    r.r += dt * (reduce ? 18 : 30);
    r.k = r.k0 * Math.exp(-r.age / 1.1) * Math.min(1, r.age * 12);
    if (r.age > 3.2) rings.splice(i, 1);
  }
  gust.g = lerp(gust.g, gust.held ? 1 : 0, 1 - Math.exp(-dt / (gust.held ? 0.7 : 1.3)));
  if (gust.g < 1e-3 && !gust.held) gust.g = 0;
  twist = lerp(twist, opts.twist, 1 - Math.exp(-dt / 0.2));
  // The breeze clock runs slower as the page falls asleep.
  breezeT += dt * ((reduce ? 0 : rate) + 2.6 * gust.g);
  writeState(now);
  soundTick(dt);
}
// True while a spring, a ring or the hand still moves anything.
function moving() {
  if (ptr.size || rings.length || gust.held || gust.g > 0) return true;
  if (Math.abs(slide.v) > 0.01 || Math.abs(slide.to - slide.x) > 0.005) return true;
  if (Math.abs(twist - opts.twist) > 1e-3) return true;
  return blobs.some(b => Math.hypot(b.v[0], b.v[1]) > 0.004 || Math.hypot(b.a[0] - b.to[0], b.a[1] - b.to[1]) > 0.002);
}

/* ---------- pointer ---------- */
// A press becomes a drag after 8 px or a hold after 260 ms; else a tap.
const ptr = new Map();
// The pull saturates: cloth gives a little, then the whole veil follows.
const sat = (v, m) => v * m / (m + Math.abs(v));
canvas.addEventListener('pointerdown', e => {
  if (failed) return;
  try { canvas.setPointerCapture(e.pointerId); } catch { /* synthetic pointers have no capture */ }
  const p = toWorld(e.clientX, e.clientY);
  const b = blobs[nextBlob];
  nextBlob = (nextBlob + 1) % blobs.length;
  // A fresh grab takes the oldest blob; its old pull hands over smoothly.
  b.c = [...p]; b.a = [0, 0]; b.v = [0, 0]; b.to = [0, 0]; b.held = true;
  ptr.set(e.pointerId, { p0: p, p, s0: slide.to, b, x0: e.clientX, y0: e.clientY, t0: performance.now(), drag: false });
  stage.focus({ preventScroll: true });
  poke();
});
canvas.addEventListener('pointermove', e => {
  const s = ptr.get(e.pointerId);
  if (!s) return;
  s.p = toWorld(e.clientX, e.clientY);
  if (!s.drag && Math.hypot(e.clientX - s.x0, e.clientY - s.y0) > 8) s.drag = true;
  if (s.drag) {
    const dx = s.p[0] - s.p0[0], dy = s.p[1] - s.p0[1];
    slide.to = s.s0 + dx;
    // The cloth under the hand leads the slide; the rest catches up.
    s.b.to = [sat(dx - (slide.x - s.s0), 3.2), sat(dy * 0.55, 3.2)];
    lastHand = s.p[0];
  }
  poke();
});
function release(e, cancel) {
  const s = ptr.get(e.pointerId);
  if (!s) return;
  ptr.delete(e.pointerId);
  s.b.held = false;
  s.b.to = [0, 0];
  if (!cancel && !s.drag && performance.now() - s.t0 < 260) push(s.p);
  poke();
}
canvas.addEventListener('pointerup', e => release(e, false));
canvas.addEventListener('pointercancel', e => release(e, true));
canvas.addEventListener('lostpointercapture', e => release(e, true));

// A tap pushes the cloth from the front: a ring of push runs outward.
function push(p) {
  if (rings.length >= 3) rings.shift();
  rings.push({ c: [...p], r: 0, age: 0, k: 0, k0: reduce ? 0.35 : rand(0.6, 0.75) });
  lastHand = p[0];
  puff(p[0]);
}
function gustOn(on) {
  gust.held = on;
  poke();
}
// Arrows nudge the slide; up and down change the twist.
stage.addEventListener('keydown', e => {
  if (failed || e.altKey || e.ctrlKey || e.metaKey) return;
  const k = e.key;
  if (k === 'ArrowLeft' || k === 'ArrowRight') {
    slide.to += (k === 'ArrowLeft' ? -1 : 1) * (e.shiftKey ? 6 : 2);
    lastHand = 0;
  } else if (k === 'ArrowUp' || k === 'ArrowDown') {
    const v = clamp(opts.twist + (k === 'ArrowUp' ? 0.25 : -0.25), 0, 8);
    opts.twist = v; save('twist', v); ui.slider.set?.(v);
  } else return;
  e.preventDefault();
  poke();
});

/* ---------- sound ---------- */
// Arrows and G act on the veils, so they count as gestures.
const kit = audioKit({ keys: new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'g', 'G']) });
let V = null, lastHand = 0, ringAt = 0, motion = 0;
const jit = x => 1 + (Math.random() * 2 - 1) * x;
function voices() {
  const ac = kit.live();
  if (!ac || !kit.out || !kit.noise) return null;
  if (V) return V;
  const pan = ac.createStereoPanner();
  pan.connect(kit.out);
  // Rustle: looped noise through a band-pass; cloth speed opens it.
  const rusG = ac.createGain(); rusG.gain.value = 0;
  const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 3200; bp.Q.value = 0.6;
  const src = ac.createBufferSource(); src.buffer = kit.noise; src.loop = true;
  src.connect(bp).connect(rusG).connect(pan);
  // Wind for the gust: low noise, swept.
  const windG = ac.createGain(); windG.gain.value = 0;
  const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 300; lp.Q.value = 0.7;
  const src2 = ac.createBufferSource(); src2.buffer = kit.noise; src2.loop = true; src2.playbackRate.value = 0.5;
  src2.connect(lp).connect(windG).connect(kit.out);
  // Beats: two close tones and their octave; the beat follows the bands.
  const beatG = ac.createGain(); beatG.gain.value = 0;
  const tl = ac.createBiquadFilter(); tl.type = 'lowpass'; tl.frequency.value = 1400; tl.Q.value = 0.3;
  beatG.connect(tl).connect(pan);
  const osc = [0, 1, 2, 3].map(i => {
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = i < 2 ? 'sine' : 'triangle';
    g.gain.value = i < 2 ? 0.5 : 0.12;
    o.connect(g).connect(beatG);
    o.start();
    return o;
  });
  src.start(); src2.start();
  V = { ac, pan, rusG, bp, windG, lp, beatG, osc, grainT: 0 };
  return V;
}
function soundTick(dt) {
  // Motion: how fast the cloth moves, in units per second.
  let speed = Math.abs(slide.v);
  for (const b of blobs) speed += Math.hypot(b.v[0], b.v[1]) * 0.8;
  motion = lerp(motion, clamp(speed / 40), 1 - Math.exp(-dt / 0.06));
  const v = voices();
  if (!v) return;
  const c = CLOTHS[opts.cloth], t = v.ac.currentTime, mesh = opts.cloth === 'mesh';
  v.pan.pan.setTargetAtTime(clamp(lastHand / (asp() * 50), -1, 1) * 0.6, t, 0.08);
  v.rusG.gain.setTargetAtTime(motion * (mesh ? 0.16 : 0.3), t, 0.05);
  v.bp.frequency.setTargetAtTime((mesh ? 5200 : 2400) + motion * 2600, t, 0.08);
  v.windG.gain.setTargetAtTime(gust.g * 0.32, t, 0.15);
  v.lp.frequency.setTargetAtTime(260 + gust.g * 520 + Math.sin(breezeT * 1.7) * 90 * gust.g, t, 0.12);
  // Bands pass the hand at slide speed over the pitch: that sets the beat.
  const bands = Math.abs(slide.v) / (PITCH * opts.weave);
  const beat = Math.min(13, 0.35 * bands + 0.4);
  const f0 = c.tone;
  v.osc[0].frequency.setTargetAtTime(f0, t, 0.05);
  v.osc[1].frequency.setTargetAtTime(f0 + beat, t, 0.05);
  v.osc[2].frequency.setTargetAtTime(f0 * 2, t, 0.05);
  v.osc[3].frequency.setTargetAtTime(f0 * 2 + beat * 2, t, 0.05);
  v.beatG.gain.setTargetAtTime(Math.min(0.11, motion * 0.2), t, 0.1);
  // Fabric grains: short noise ticks at a rate that follows the speed.
  v.grainT += dt * motion * (mesh ? 40 : 26);
  while (v.grainT > 1) { v.grainT -= 1; grain(v, t + Math.random() * dt, mesh); }
  // A ring on the rail ticks each time the slide passes one ring spacing.
  const ring = Math.floor(slide.x / 7);
  if (ring !== ringAt) { ringAt = ring; ringTick(v, t); }
}
function grain(v, t, mesh) {
  const ac = v.ac, s = ac.createBufferSource(), bp = ac.createBiquadFilter(), g = ac.createGain();
  s.buffer = kit.noise;
  bp.type = 'bandpass'; bp.frequency.value = rand(mesh ? 4000 : 1800, mesh ? 9000 : 5200); bp.Q.value = mesh ? 6 : 1.6;
  const peak = 0.05 * jit(0.5), dur = rand(0.012, 0.03);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(peak, t + 0.002);
  g.gain.exponentialRampToValueAtTime(1e-4, t + dur);
  s.connect(bp).connect(g).connect(v.pan);
  s.start(t, Math.random() * 0.8, dur + 0.02);
}
// Brass rings on a rod: a short ring with two partials.
function ringTick(v, t) {
  const ac = v.ac, g = ac.createGain();
  const f = rand(2300, 2700);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.03 * jit(0.4) * clamp(Math.abs(slide.v) / 15, 0.3, 1), t + 0.002);
  g.gain.exponentialRampToValueAtTime(1e-4, t + rand(0.08, 0.14));
  for (const k of [1, 2.76]) {
    const o = ac.createOscillator();
    o.frequency.value = f * k;
    o.connect(g);
    o.start(t); o.stop(t + 0.16);
  }
  g.connect(v.pan);
}
// A tap: the soft thump of a palm on cloth.
function puff(x) {
  const v = voices();
  if (!v) return;
  const ac = v.ac, t = ac.currentTime + 0.005, s = ac.createBufferSource(), lp = ac.createBiquadFilter(), g = ac.createGain(), p = ac.createStereoPanner();
  s.buffer = kit.noise;
  lp.type = 'lowpass'; lp.frequency.setValueAtTime(900 * jit(0.2), t); lp.frequency.exponentialRampToValueAtTime(180, t + 0.25);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.22 * jit(0.2), t + 0.006);
  g.gain.exponentialRampToValueAtTime(1e-4, t + 0.32);
  p.pan.value = clamp(x / (asp() * 50), -1, 1) * 0.6;
  s.connect(lp).connect(g).connect(p).connect(kit.out);
  s.start(t, Math.random() * 0.5, 0.4);
}
function hush() {
  if (!V) return;
  const t = V.ac.currentTime;
  for (const g of [V.rusG, V.windG, V.beatG]) g.gain.setTargetAtTime(0, t, 0.05);
}

/* ---------- loop ---------- */
let raf = 0, last = 0, visible = true, ready = false, lastInput = performance.now();
const lively = () => moving() || performance.now() - lastInput < 2500;
// Drifting frames wait on a timer, so the page asks for 30 frames a second.
let timer = 0;
function schedule(live) {
  if (live) { raf = requestAnimationFrame(frame); return; }
  raf = -1;
  timer = setTimeout(() => { timer = 0; raf = requestAnimationFrame(frame); }, 28);
}
function halt() { if (raf > 0) cancelAnimationFrame(raf); clearTimeout(timer); raf = timer = 0; }
function frame(t) {
  raf = 0;
  const live = lively();
  const dt = last ? Math.min(1 / 20, (t - last) / 1000) : 1 / 60;
  last = t;
  let more = false;
  try {
    // After a minute without input the breeze eases to a stop over 2 s.
    rate = reduce ? 0 : clamp(1 - ((t - lastInput) / 1000 - 60) / 2);
    step(dt);
    render();
    if (live) watchdog(dt);
    more = live || rate > 0;
  } finally {
    // The breeze makes no sound, so the context sleeps once the cloth is still.
    if (wasLive && !live) { hush(); kit.rest(() => !lively()); }
    wasLive = live;
    if (visible && more) schedule(live);
    else { hush(); kit.rest(() => !raf); }
  }
}
let wasLive = false;
function wake() { if (visible && ready && !raf && !failed) { last = 0; raf = requestAnimationFrame(frame); } }
// Any input wakes the loop and resets the sleep clock.
function poke() { lastInput = performance.now(); wake(); }

/* ---------- performance ---------- */
// Slow frames step quality down one rung; it never steps back up.
// Rungs: pixel ratio 1, bloom levels, veil resolution.
let runT = 0, avg = 1 / 60, slowT = 0;
function watchdog(dt) {
  if (!dt || rung >= 3) return;
  runT += dt;
  avg = lerp(avg, dt, 0.1);
  if (runT < 4) return;
  slowT = avg > 1 / 38 ? slowT + dt : 0;
  if (slowT > 2) { rung++; slowT = 0; resize(true); }
}

/* ---------- size ---------- */
function fit() {
  if (!rung) return fitCanvas(canvas, { budget: 2.4e6 });
  return quality() === 'high' && rung < 2 ? fitCanvas(canvas, { budget: 2.4e6, quality: 'standard' }) : fitCanvas(canvas, { budget: 1.4e6, maxDpr: 1 });
}
function resize(force = false) {
  if (failed || !P) return;
  const f = fit();
  if (f.W === W && f.H === H && scene && !force) return;
  W = f.W; H = f.H; view.w = f.w; view.h = f.h;
  alloc();
  writeState(now); prev.set(now);
  if (!raf) render();
}

/* ---------- reset ---------- */
function resetVeils() {
  if (failed || !ready) return;
  slide.x = slide.v = slide.to = 0;
  for (const b of blobs) { b.a = [0, 0]; b.v = [0, 0]; b.to = [0, 0]; b.held = false; }
  rings.length = 0; ptr.clear(); gust.held = false; gust.g = 0;
  writeState(now); prev.set(now);
  poke();
}

/* ---------- start ---------- */
onReducedChange(v => { reduce = v; poke(); });
async function start() {
  if (!gl) return fail();
  if (!gl.getExtension('EXT_color_buffer_float')) return fail();
  gl.getExtension('OES_texture_float_linear');
  mark('build');
  try { await build(); } catch (err) { return fail(err); }
  const f = fit();
  W = f.W; H = f.H; view.w = f.w; view.h = f.h;
  alloc();
  // The first frame opens mid-breeze, so the bands already lie bent.
  breezeT = 7.3;
  writeState(now); prev.set(now);
  render();
  gl.finish();
  ready = true;
  mark('first-frame');
  requestAnimationFrame(() => canvas.classList.add('on'));
  new ResizeObserver(() => resize()).observe(stage);
  onQuality(() => { rung = 0; resize(true); });
  whenVisible(stage, v => {
    visible = v;
    if (v) wake();
    else { halt(); hush(); }
  });
  onContextLoss(canvas, {
    lost: () => { failed = true; halt(); },
    restored: async () => { failed = false; P = null; scene = null; await build(); alloc(); render(); wake(); },
  });
  wake();
}
start();
