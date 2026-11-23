// Glowing pickle: a gherkin on the mains hums, steams, spits, then glows sodium yellow.
// Plan: docs/plans/pickle.md. Toy doc: docs/toys/pickle.md.
import { initPage, whenVisible, reduced, onReducedChange, onQuality, pixelRatio, audioKit, sound, stage as mark, pageReady } from '../shared/stim.js';
import { intro as playIntro } from '../shared/intro.js';
import { createScene, HOT, P } from './scene.js';
import { pickleSound } from './sound.js';
mark('libs');
const introDone = playIntro({ ready: pageReady() });

const ID = 'pickle';
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
let calm = reduced();

/* ---------- settings ---------- */
// Settings persist per browser; storage is optional.
const saved = k => { try { return localStorage.getItem(`stimming.${ID}.${k}`); } catch { return null; } };
const save = (k, v) => { try { localStorage.setItem(`stimming.${ID}.${k}`, String(v)); } catch { /* storage is optional */ } };
const vv = Number(saved('variac'));
let variac = saved('variac') != null && vv >= 0 && vv <= 1 ? vv : 1;
// The Variac slider sets 90 to 230 V.
const volts = () => 90 + 140 * variac;

/* ---------- bar ---------- */
const ui = initPage({ id: ID, bar: {
  actions: [
    { verb: 'switch', label: 'Switch', key: 'Space', onPress: () => flip() },
    { verb: 'fresh', label: 'Fresh', key: 'N', onPress: () => fresh() },
  ],
  slider: { label: 'Variac', min: 0, max: 1, step: 0.01, value: variac, onInput: v => { variac = v; save('variac', v); poke(); } },
  quality: true,
  keys: [['click', 'switch'], ['space', 'switch'], ['n', 'fresh pickle']],
  // Bar v3 lists every input in How to play: one instruction per row.
  help: [
    ['click', 'Click the stage to switch the mains on or off'],
    ['space', 'Press Space to switch the mains on or off'],
    ['n', 'Press N for a fresh pickle while the power is off'],
  ],
} });
const switchBtn = () => document.querySelector('.stim-ui [aria-keyshortcuts="Space"]');
const freshBtn = () => document.querySelector('.stim-ui [aria-keyshortcuts="N"]');

/* ---------- state ---------- */
// on: the mains; heat: 1 lights the arc; scorch grows while it glows.
const st = {
  on: false, heat: 0, lit: false, arc: 0, glow: 0, flare: 0, ember: 0, scorch: 0, wet: 1,
  drop: 0, t: 0, seed: 3, steamAcc: 0, spitAcc: 0,
};
const kit = audioKit({ keys: new Set([' ', 'n', 'N']), sleepMs: 1500 });
const snd = pickleSound(kit);

/* ---------- scene ---------- */
const stage = document.getElementById('stage');
const canvas = document.createElement('canvas');
canvas.setAttribute('aria-hidden', 'true');
stage.prepend(canvas);
let S = null, failed = false, ready = false;
function fail(err) {
  if (err) console.error(err);
  failed = true;
  stage.querySelector('.fail').hidden = false;
  ui.hideControls?.();
  mark('first-frame');
}

/* ---------- actions ---------- */
let lastInput = 0;
function flip(on = !st.on) {
  if (!ready || failed) return;
  st.on = on;
  snd.click(on);
  syncBar();
  poke();
}
function fresh() {
  if (!ready || failed || st.on) return;
  st.seed = (st.seed * 7 + 5) % 97;
  Object.assign(st, { heat: 0, lit: false, arc: 0, glow: 0, flare: 0, ember: 0, scorch: 0, wet: 1, drop: 0, steamAcc: 0, spitAcc: 0 });
  S.freshPickle(st.seed);
  snd.plop();
  poke();
}
function syncBar() {
  switchBtn()?.setAttribute('aria-pressed', String(st.on));
  const f = freshBtn();
  if (f) { f.setAttribute('aria-disabled', String(st.on)); }
}

/* ---------- input ---------- */
// A tap on the stage flips the switch; a drag does nothing.
const pointer = { id: null, x0: 0, y0: 0, at: 0, moved: false };
stage.addEventListener('pointerdown', e => {
  if (e.button !== 0 || !ready || failed || (e.target !== canvas && e.target !== stage) || pointer.id != null) return;
  try { stage.setPointerCapture(e.pointerId); } catch { /* capture is optional */ }
  Object.assign(pointer, { id: e.pointerId, x0: e.clientX, y0: e.clientY, at: performance.now(), moved: false });
});
stage.addEventListener('pointermove', e => {
  if (e.pointerId === pointer.id && Math.hypot(e.clientX - pointer.x0, e.clientY - pointer.y0) > 8) pointer.moved = true;
});
function release(e) {
  if (e.pointerId !== pointer.id) return;
  const tap = e.type === 'pointerup' && !pointer.moved && performance.now() - pointer.at < 260;
  pointer.id = null;
  if (tap) flip();
}
['pointerup', 'pointercancel', 'lostpointercapture'].forEach(t => stage.addEventListener(t, release));

/* ---------- view ---------- */
let css = { w: 1, h: 1 }, rung = 0;
function cover() {
  const c = ui.cover?.();
  return c ? clamp(c.bottom / Math.max(1, css.h), 0, 0.35) : 0.08;
}
function fit(force = false) {
  if (!S) return;
  const r = stage.getBoundingClientRect();
  const w = Math.max(1, r.width), h = Math.max(1, r.height);
  const changed = w !== css.w || h !== css.h;
  css = { w, h };
  if (changed || force) {
    // On High the first rung falls back to Standard, not to 1x.
    const dpr = rung === 0 ? pixelRatio(w, h, { budget: 2.6e6 }) : rung === 1 ? pixelRatio(w, h, { budget: 1.4e6, maxDpr: 1, quality: 'standard' }) : 1;
    S.resize(w, h, dpr, { bloomScale: rung >= 2 ? 0.33 : 0.5, samples: rung >= 2 ? 0 : 4, steamScale: rung >= 2 ? 0.33 : 0.5 });
  }
  S.frame(w, h, cover());
}

/* ---------- sim ---------- */
// Smooth noise in one dimension, for the arc's flicker.
const n1 = x => { const i = Math.floor(x), f = x - i, h = k => { const v = Math.sin(k * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); }; const u = f * f * (3 - 2 * f); return h(i) * (1 - u) + h(i + 1) * u; };
// A random point on the pickle's top, weighted toward the hot end.
function onTop(hot) {
  const u = hot ? 1 - Math.random() ** 2 * 0.35 : Math.random();
  const x = (u - 0.5) * P.len * 0.9;
  const e = Math.sin(Math.PI * clamp(u * 0.9 + 0.05));
  return [x, P.y + P.r * (0.55 + 0.35 * e), (Math.random() - 0.5) * P.r * 0.8];
}
function spit(big = 1) {
  const [x, y, z] = onTop(true);
  const n = Math.round((calm ? 2 : 5) * big + Math.random() * 4 * big);
  S.sparks(x, y, z, n, st.lit ? 1 : 0, big);
  st.flare = Math.max(st.flare, calm ? 0 : 0.25 * big * (st.lit ? 1 : 0.3));
  snd.spit(big, panOf(x));
  if (Math.random() < 0.6) S.steam.puff(x, y + 0.004, z, 0.003, 0.012 + Math.random() * 0.006, 0.6, 1.4 + Math.random(), 0.06);
}
const panOf = x => clamp(x / 0.12, -0.6, 0.6);
let sleptAt = 0;
// One step of the pickle. Returns true while anything moves.
function tick(dt) {
  st.t += dt;
  const V = volts(), v = V / 230;
  // Left alone, the timer switch cuts the power after 60 s.
  if (st.on && performance.now() - lastInput > 60000) { st.on = false; snd.click(false); syncBar(); }
  if (st.on) {
    // Joule heat: the warm-up takes about 4 s at 230 V, 16 s at 120 V.
    // Under 100 V the pickle only steams.
    const cap = V < 100 ? 0.92 : 1.2;
    st.heat = Math.min(cap, st.heat + dt * v * v / 4.2);
    if (!st.lit && st.heat >= 1) { st.lit = true; st.flare = calm ? 0.2 : 1; snd.ignite(panOf(HOT.x)); }
  } else {
    st.lit = false;
    st.heat *= Math.exp(-dt / 7);
  }
  // The arc: a bright, restless glow, with short drop-outs as the vapour pockets burst.
  const g0 = st.lit ? 0.22 + 0.78 * clamp((V - 100) / 130) ** 0.8 : 0;
  if (st.lit) {
    if (st.drop > 0) {
      st.drop -= dt;
      if (st.drop <= 0) { st.flare = Math.max(st.flare, calm ? 0.1 : 0.5); snd.strike(panOf(HOT.x)); if (Math.random() < 0.5) spit(0.7); }
    } else if (!calm && Math.random() < dt * 0.45) st.drop = 0.05 + Math.random() * 0.11;
    const f = calm
      ? 0.92 + 0.08 * n1(st.t * 0.7)
      : 0.72 + 0.2 * n1(st.t * 9) + 0.12 * n1(st.t * 23 + 5) - 0.1 * (n1(st.t * 2.1 + 9) > 0.8 ? 1 : 0);
    st.arc = st.drop > 0 ? 0.04 : g0 * f;
    st.scorch = Math.min(1, st.scorch + dt * 0.03 * g0);
    st.wet = Math.max(0.2, st.wet - dt * 0.01);
    // The char under the arc stays white hot.
    st.ember = Math.min(1, st.ember + dt * 0.8);
  } else {
    st.arc = 0;
    st.drop = 0;
    // Hot char fades from dull red to dark in about 4 s.
    st.ember *= Math.exp(-dt / (calm ? 2.2 : 1.5));
    if (st.ember < 0.004) st.ember = 0;
  }
  // The glow follows the arc fast; it dies in a tenth of a second.
  st.glow += (st.arc - st.glow) * (1 - Math.exp(-dt / (calm ? 0.25 : st.arc > st.glow ? 0.015 : 0.035)));
  st.flare *= Math.exp(-dt / 0.12);
  // Steam rises while the skin is hot; most comes off the hot end.
  const steamRate = clamp((st.heat - 0.25) / 0.6) * (st.lit ? 3.6 : 5) * (calm ? 0.6 : 1);
  st.steamAcc += dt * steamRate;
  while (st.steamAcc >= 1) {
    st.steamAcc -= 1;
    const [x, y, z] = onTop(st.lit || Math.random() < 0.4);
    S.steam.puff(x, y, z, 0.005 + Math.random() * 0.003, 0.018 + Math.random() * 0.012, 0.8 + Math.random() * 0.6, 2.4 + Math.random() * 1.6, 0.03 + Math.random() * 0.02);
  }
  // Brine spits as the warm-up boils it; fewer once the arc burns.
  if (st.on) {
    const spitRate = st.lit ? 0.8 : clamp((st.heat - 0.5) / 0.5) * 2.6;
    st.spitAcc += dt * spitRate * (calm ? 0.4 : 1);
    if (st.spitAcc >= 1) { st.spitAcc -= 1 + Math.random() * 0.6; spit(0.5 + Math.random() * 0.6); }
  }
  const steaming = S.steam.step(dt);
  const sparking = S.stepSparks(dt);
  snd.tick(dt, st, v);
  return st.on || st.heat > 0.3 || st.ember > 0.004 || st.glow > 0.002 || steaming || sparking;
}

/* ---------- loop ---------- */
let raf = 0, last = 0, visible = true;
function frame(now) {
  raf = 0;
  // A frame stamp can predate the wake, so dt never goes below zero.
  const dt = last ? clamp((now - last) / 1000, 0, 1 / 20) : 1 / 60;
  last = now;
  let more = false;
  try { more = tick(dt); render(); }
  finally {
    if (visible && more && !failed) raf = requestAnimationFrame(frame);
    else { snd.hush(); kit.rest(() => !raf); if (!more) sleptAt = performance.now(); }
  }
}
function wake() {
  if (!visible || !ready || raf || failed) return;
  // Asleep, the pickle went on cooling.
  if (sleptAt) { st.heat *= Math.exp(-(performance.now() - sleptAt) / 7000); sleptAt = 0; }
  last = 0;
  raf = requestAnimationFrame(frame);
}
function poke() { lastInput = performance.now(); wake(); }
function render() {
  S.update(st);
  S.render(st.t);
}

/* ---------- start ---------- */
onReducedChange(v => { calm = v; wake(); if (!raf && S) render(); });
sound.onChange(on => { if (on) wake(); });
async function start() {
  const probe = document.createElement('canvas').getContext('webgl2');
  if (!probe) return fail();
  // One WebGL context per toy: the probe lets its context go.
  probe.getExtension('WEBGL_lose_context')?.loseContext();
  mark('build');
  try {
    S = createScene(canvas, { onLost: () => { failed = true; if (raf) cancelAnimationFrame(raf); raf = 0; stage.querySelector('.fail').hidden = false; } });
    fit(true);
    await S.warm(st);
    render();
  } catch (err) { return fail(err); }
  // ?qa hands the state and the scene to a test script.
  if (new URLSearchParams(location.search).has('qa')) {
    Object.assign(globalThis, { __pk: { st, S, flip, fresh, poke, render, spit, tick: dt => { tick(dt); render(); }, get busy() { return !!raf; } } });
  }
  mark('first-frame');
  requestAnimationFrame(() => canvas.classList.add('on'));
  new ResizeObserver(() => { fit(); if (!raf) render(); }).observe(stage);
  ui.onCover?.(() => { fit(); if (!raf) render(); });
  onQuality(() => { rung = 0; fit(true); if (!raf) render(); });
  whenVisible(stage, v => {
    visible = v;
    if (v) wake();
    else { if (raf) cancelAnimationFrame(raf); raf = 0; snd.hush(); }
  });
  addEventListener('pagehide', () => S.dispose(), { once: true });
  await introDone;
  ready = true;
  syncBar();
}
start();
