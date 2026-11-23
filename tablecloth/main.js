// Tablecloth yank: whip the cloth from under a set table, or drag the setting off it.
// Plan: docs/plans/tablecloth.md. Toy doc: docs/toys/tablecloth.md.
import { initPage, whenVisible, reduced, onReducedChange, onQuality, pixelRatio, audioKit, sound, stage as mark, pageReady } from '../shared/stim.js';
import { intro as playIntro } from '../shared/intro.js';
import { makeSim, step, grab, moveHand, letGo, autoYank, startReset, autoReset, busy } from './sim.js';
import { createScene } from './scene.js';
import { tableSound } from './sound.js';
mark('libs');
const introDone = playIntro({ ready: pageReady() });

const ID = 'tablecloth';
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
let reduce = reduced();

/* ---------- settings ---------- */
// Settings persist per browser; storage is optional.
const saved = k => { try { return localStorage.getItem(`stimming.${ID}.${k}`); } catch { return null; } };
const save = (k, v) => { try { localStorage.setItem(`stimming.${ID}.${k}`, String(v)); } catch { /* storage is optional */ } };
const sv = Number(saved('speed'));
let speed = saved('speed') != null && sv >= 0 && sv <= 1 ? sv : 0.9;
// Speed maps to the hand's pull for Space: 0.6 to 8 m/s, on a log scale.
const yankSpeed = () => 0.6 * Math.pow(8 / 0.6, speed);

/* ---------- bar ---------- */
const ui = initPage({ id: ID, bar: {
  actions: [
    { verb: 'yank', label: 'Yank', key: 'Space', onPress: () => doYank() },
    { verb: 'reset', label: 'Reset', key: 'R', onPress: () => doReset() },
  ],
  slider: { label: 'Speed', min: 0, max: 1, step: 0.01, value: speed, onInput: v => { speed = v; save('speed', v); } },
  quality: true,
  keys: [['drag', 'pull the cloth'], ['release', 'yank'], ['space', 'yank'], ['r', 'reset']],
  // Bar v3 lists every input in How to play: one instruction per row.
  help: [
    ['drag', 'Drag the hanging hem down and toward you'],
    ['release', 'Flick and let go: a fast yank leaves the table set'],
    ['space', 'Press Space to yank at the Speed set'],
    ['r', 'Press R to set the table again'],
  ],
} });

/* ---------- sim ---------- */
const sim = makeSim();
sim.calm = reduce;
const kit = audioKit({ keys: new Set([' ', 'r', 'R']), sleepMs: 1500 });
const snd = tableSound(kit);

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
// Sound pans by screen position.
const panOf = (x, y, z) => S ? clamp((S.toScreen(x, y, z)[0] - 0.5) * 1.6, -0.85, 0.85) : 0;

/* ---------- input ---------- */
// A press near the hanging hem takes it; a drag pulls; the release yanks or lets go.
const pointer = { id: null, trail: [] };
const local = e => { const r = stage.getBoundingClientRect(); return [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height, r]; };
function nearHem(nx, ny, r, touch) {
  return S.nearHem(sim, nx, ny, r.width, r.height) < (touch ? 48 : 30);
}
stage.addEventListener('pointerdown', e => {
  if (e.button !== 0 || !ready || failed || (e.target !== canvas && e.target !== stage)) return;
  if (pointer.id != null || sim.reset || sim.hand.pins) return;
  const [nx, ny, r] = local(e);
  if (!nearHem(nx, ny, r, e.pointerType !== 'mouse')) return;
  const p = S.pick(nx, ny);
  if (!p || !grab(sim, p.x, p.y)) return;
  try { stage.setPointerCapture(e.pointerId); } catch { /* capture is optional */ }
  pointer.id = e.pointerId;
  pointer.trail = [{ t: performance.now(), x: p.x, y: p.y }];
  stage.classList.add('held');
  poke();
});
stage.addEventListener('pointermove', e => {
  if (!ready || failed) return;
  const [nx, ny, r] = local(e);
  if (e.pointerId !== pointer.id) {
    // The hand cursor shows over the hem.
    if (e.pointerType === 'mouse' && !sim.hand.pins) stage.classList.toggle('hem', nearHem(nx, ny, r, false));
    return;
  }
  const p = S.pick(nx, ny);
  if (!p) return;
  const now = performance.now();
  pointer.trail.push({ t: now, x: p.x, y: p.y });
  while (pointer.trail.length > 2 && now - pointer.trail[0].t > 90) pointer.trail.shift();
  moveHand(sim, p.x, p.y);
  poke();
});
function release(e) {
  if (e.pointerId !== pointer.id) return;
  pointer.id = null;
  stage.classList.remove('held');
  // The release speed comes from the last 90 ms of the drag.
  const T = pointer.trail, now = performance.now();
  let vx = 0, vy = 0;
  if (T.length > 1 && now - T[T.length - 1].t < 70) {
    const a = T[0], b = T[T.length - 1], dt = Math.max(0.016, (b.t - a.t) / 1000);
    vx = (b.x - a.x) / dt; vy = (b.y - a.y) / dt;
  }
  // An arm follows through faster than a mouse flick: the release gains half again.
  letGo(sim, vx * 1.5, vy * 1.5);
  poke();
}
['pointerup', 'pointercancel', 'lostpointercapture'].forEach(t => stage.addEventListener(t, release));

/* ---------- actions ---------- */
function doYank() {
  if (!ready || failed || pointer.id != null) return;
  if (sim.reset) return;
  // A table already pulled resets first; the next Space yanks.
  if (sim.dirty && !sim.hand.pins) { startReset(sim); poke(); return; }
  if (autoYank(sim, yankSpeed())) poke();
}
function doReset() {
  if (!ready || failed || pointer.id != null) return;
  if (startReset(sim)) poke();
}

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
    S.resize(w, h, dpr, { bloomScale: rung >= 2 ? 0.33 : 0.5, samples: rung >= 2 ? 0 : 4, shadow: rung >= 2 ? 1024 : 2048 });
  }
  S.frame(w, h, cover());
}

/* ---------- loop ---------- */
// Lively while anything moves or a reset waits; drifting at 30 fps for the candle.
// The candle sleeps 60 s after the last input; reduced motion has no drift.
let raf = 0, timer = 0, last = 0, visible = true, clock = 0, lastInput = performance.now(), wasLive = false;
function lively() { return busy(sim) || pointer.id != null; }
function frame(now) {
  raf = 0;
  const idle = (now - lastInput) / 1000;
  // A frame stamp can predate the wake, so dt never goes below zero.
  const dt = last ? clamp((now - last) / 1000, 0, 1 / 20) : 1 / 60;
  last = now;
  try { tick(dt, idle); render(); }
  finally {
    const more = lively();
    // The candle drifts; a pulled table waits for its reset at the same rate.
    const drift = (!reduce && idle < 62) || (sim.dirty && !sim.reset);
    // Sound rests once nothing moves, though the candle still drifts.
    if (wasLive && !more) { snd.hush(); kit.rest(() => !lively()); }
    wasLive = more;
    if (!visible || failed) { /* the loop stops */ }
    else if (more) raf = requestAnimationFrame(frame);
    // Drifting asks for a frame every 33 ms, not every display frame.
    else if (drift) timer = setTimeout(() => { timer = 0; raf = requestAnimationFrame(frame); }, 30);
    if (!raf && !timer) { snd.hush(); kit.rest(() => !raf && !timer); }
  }
}
function halt() { if (raf) cancelAnimationFrame(raf); clearTimeout(timer); raf = 0; timer = 0; }
function wake() { if (visible && ready && !raf && !failed) { clearTimeout(timer); timer = 0; last = 0; wasLive = true; raf = requestAnimationFrame(frame); } }
function poke() { lastInput = performance.now(); wake(); }
function tick(dt, idle = 0) {
  clock += dt;
  sim.calm = reduce;
  // The flame's flicker eases to rest over 2 s once the page sleeps.
  sim.flick = reduce ? 0 : clamp((62 - idle) / 2);
  step(sim, dt);
  autoReset(sim, dt, busy(sim) || pointer.id != null);
  // A reset sets the table with sound: the context wakes if it slept.
  if (kit.ac && sound.on && sim.events.some(e => e.type === 'reset')) kit.wake();
  snd.tick(dt, sim, sim.events, panOf);
  sim.events.length = 0;
  if (busy(sim) || pointer.id != null) watchdog(dt);
}
function render() {
  S.update(sim, clock);
  S.render(clock);
}

/* ---------- performance ---------- */
// Slow frames step quality down one rung; it never steps back up.
// Rungs: pixel ratio 1, then smaller bloom, no multisampling, smaller shadows.
let runT = 0, avg = 1 / 60, slowT = 0;
function watchdog(dt) {
  if (!dt || rung >= 2) return;
  runT += dt;
  avg = lerp(avg, dt, 0.1);
  if (runT < 4) return;
  slowT = avg > 1 / 38 ? slowT + dt : 0;
  if (slowT > 2) { rung++; slowT = 0; fit(true); }
}

/* ---------- start ---------- */
onReducedChange(v => { reduce = v; poke(); if (!raf && S) render(); });
sound.onChange(on => { if (on) poke(); });
async function start() {
  const probe = document.createElement('canvas').getContext('webgl2');
  if (!probe) return fail();
  // One WebGL context per toy: the probe lets its context go.
  probe.getExtension('WEBGL_lose_context')?.loseContext();
  mark('build');
  try {
    S = createScene(canvas, { onLost: () => { failed = true; halt(); stage.querySelector('.fail').hidden = false; } });
    fit(true);
    await S.warm(sim);
    render();
  } catch (err) { return fail(err); }
  // ?qa hands the sim and the scene to a test script.
  if (new URLSearchParams(location.search).has('qa')) {
    Object.assign(globalThis, { __tc: {
      sim, S, grab, moveHand, letGo, doYank, doReset, poke, setSpeed: v => { speed = v; },
      halt: () => { visible = false; halt(); },
      frame: dt => { tick(dt); render(); },
    } });
  }
  mark('first-frame');
  requestAnimationFrame(() => canvas.classList.add('on'));
  new ResizeObserver(() => { fit(); if (!raf) render(); }).observe(stage);
  ui.onCover?.(() => { fit(); if (!raf) render(); });
  onQuality(() => { rung = 0; fit(true); if (!raf) render(); });
  whenVisible(stage, v => {
    visible = v;
    if (v) wake();
    else { halt(); snd.hush(); }
  });
  addEventListener('pagehide', () => S.dispose(), { once: true });
  await introDone;
  ready = true;
  poke();
}
start();
