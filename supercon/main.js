// Superconductor track: a frosty puck locks over a magnet ring; push it.
// Plan: docs/plans/supercon.md. Toy doc: docs/toys/supercon.md.
import { initPage, whenVisible, reduced, onReducedChange, onQuality, pixelRatio, audioKit, sound, stage as mark, pageReady } from '../shared/stim.js';
import { intro as playIntro } from '../shared/intro.js';
import { TRACK, PUCK, HMIN, HMAX, makeSim, step, grab, aim, hold, shape, letGo, push, cool, setHeight, busy, pose, boil } from './sim.js';
import { createScene } from './scene.js';
import { puckSound } from './sound.js';
mark('libs');
const introDone = playIntro({ ready: pageReady() });

const ID = 'supercon';
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
let reduce = reduced();

/* ---------- settings ---------- */
// Settings persist per browser; storage is optional.
const saved = k => { try { return localStorage.getItem(`stimming.${ID}.${k}`); } catch { return null; } };
const save = (k, v) => { try { localStorage.setItem(`stimming.${ID}.${k}`, String(v)); } catch { /* storage is optional */ } };
const hv = Number(saved('height'));
const height0 = saved('height') != null && hv >= HMIN * 1000 && hv <= HMAX * 1000 ? hv : 12;

/* ---------- sim ---------- */
const sim = makeSim();
sim.calm = reduce;
setHeight(sim, height0 / 1000);
sim.h = sim.pin.h;

/* ---------- bar ---------- */
const ui = initPage({ id: ID, bar: {
  actions: [
    { verb: 'push', label: 'Push', key: 'Space', onPress: () => doPush() },
    { verb: 'cool', label: 'Cool', key: 'C', onPress: () => doCool() },
  ],
  slider: { label: 'Height', min: HMIN * 1000, max: HMAX * 1000, step: 0.5, value: height0, onInput: v => { setHeight(sim, v / 1000); save('height', v); poke(); } },
  quality: true,
  keys: [['drag', 'push'], ['hold + drag', 'lift or tip'], ['click', 'cool'], ['space', 'push']],
  // Bar v3 lists every input in How to play: one instruction per row.
  help: [
    ['drag', 'Drag the puck along the track, then let go: it glides round'],
    ['hold + drag', 'Hold the puck, then drag up or down to lift it, or sideways to tip it'],
    ['click', 'Click to pour liquid nitrogen on the puck and cool it'],
    ['space', 'Press Space to push the puck round the track'],
    ['c', 'Press C to cool the puck'],
  ],
} });

const kit = audioKit({ keys: new Set([' ', 'c', 'C']), sleepMs: 1500 });
const snd = puckSound(kit);

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
// A press on the puck: a drag pushes it, a hold re-pins it, a tap cools it.
const pointer = { id: null, mode: null, x0: 0, y0: 0, on: false, t: 0, h0: 0, rx0: 0, rz0: 0 };
let holdT = 0;
const local = e => { const r = stage.getBoundingClientRect(); return [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height, r]; };
function onPuck(nx, ny, r, touch) {
  const p = pose(sim), [sx, sy] = S.toScreen(p.x, p.y, p.z);
  const rad = PUCK.r / S.mPerPx(p.x, p.y, p.z, r.height) + (touch ? 26 : 12);
  return Math.hypot((sx - nx) * r.width, (sy - ny) * r.height) < rad;
}
// The pointer's angle round the ring, at the puck's height.
function angleAt(nx, ny) {
  const q = S.pick(nx, ny, pose(sim).y);
  return q ? Math.atan2(q.z, q.x) : sim.th;
}
stage.addEventListener('pointerdown', e => {
  if (e.button !== 0 || !ready || failed || (e.target !== canvas && e.target !== stage)) return;
  if (pointer.id != null) return;
  const [nx, ny, r] = local(e);
  try { stage.setPointerCapture(e.pointerId); } catch { /* capture is optional */ }
  Object.assign(pointer, { id: e.pointerId, mode: 'press', x0: e.clientX, y0: e.clientY, on: onPuck(nx, ny, r, e.pointerType !== 'mouse') });
  clearTimeout(holdT);
  // A still press on the puck becomes a hold after 260 ms.
  if (pointer.on) holdT = setTimeout(startHold, 260);
  stage.classList.add('press');
  poke();
});
function startHold() {
  if (pointer.mode !== 'press' || !pointer.on || sim.landed) return;
  pointer.mode = 'pin';
  hold(sim);
  pointer.h0 = sim.pin.h; pointer.rx0 = sim.pin.rx; pointer.rz0 = sim.pin.rz;
  stage.classList.add('held');
  poke();
}
stage.addEventListener('pointermove', e => {
  if (e.pointerId !== pointer.id) return;
  const [nx, ny, r] = local(e);
  const dx = e.clientX - pointer.x0, dy = e.clientY - pointer.y0;
  if (pointer.mode === 'press' && Math.hypot(dx, dy) > 8) {
    clearTimeout(holdT);
    if (pointer.on) { pointer.mode = 'push'; grab(sim, angleAt(nx, ny)); stage.classList.add('held'); }
    else pointer.mode = 'none';
  }
  if (pointer.mode === 'push') aim(sim, angleAt(nx, ny));
  else if (pointer.mode === 'pin') {
    // Up lifts, down lowers; sideways tips the puck about the view line.
    const p = pose(sim);
    const mpp = S.mPerPx(p.x, p.y, p.z, r.height);
    const h = pointer.h0 - dy * mpp * 0.5;
    const a = dx * 0.006;
    const v = S.viewDir();
    const tx = -p.n, tz = p.c;
    shape(sim, h, pointer.rx0 + a * (v.x * tx + v.z * tz), pointer.rz0 - a * (v.x * -p.c + v.z * -p.n));
  }
  poke();
});
function release(e) {
  if (e.pointerId !== pointer.id) return;
  clearTimeout(holdT);
  const mode = pointer.mode;
  pointer.id = null; pointer.mode = null;
  stage.classList.remove('press', 'held');
  if (mode === 'push' || mode === 'pin') letGo(sim);
  if (mode === 'pin') ui.slider?.set(Math.round(sim.pin.h * 2000) / 2, false), save('height', sim.pin.h * 1000);
  // A release that was neither a drag nor a hold is a tap.
  if (mode === 'press' && e.type === 'pointerup') doCool();
  poke();
}
['pointerup', 'pointercancel', 'lostpointercapture'].forEach(t => stage.addEventListener(t, release));

/* ---------- actions ---------- */
function doPush() {
  if (!ready || failed || sim.held) return;
  push(sim);
  poke();
}
function doCool() {
  if (!ready || failed) return;
  if (cool(sim)) poke();
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
    S.resize(w, h, dpr, { bloomScale: rung >= 2 ? 0.33 : 0.5, samples: rung >= 2 ? 0 : 4, shadow: rung >= 2 ? 1024 : 2048, fogScale: rung >= 2 ? 0.33 : 0.5 });
  }
  S.frame(w, h, cover());
}

/* ---------- loop ---------- */
// Lively while the puck moves, a pour runs or the hand holds it.
// Drifting at 30 fps while the cold puck boils off fog.
// Asleep 60 s after the last input, or once the puck has dropped and the fog is gone.
let raf = 0, tmo = 0, last = 0, visible = true, clock = 0, lastInput = 0, fade = 1;
function frame(now) {
  raf = 0;
  const t0 = performance.now();
  let more = false, lively = false;
  try {
    lively = busy(sim) || pointer.id != null;
    // A frame stamp can predate the wake, so dt never goes below zero.
    const dt = last ? clamp((now - last) / 1000, 0, 1 / 20) : 1 / 60;
    last = now;
    more = tick(dt, now);
    render();
  } finally {
    if (visible && more && !failed) {
      // Drifting frames come at 30 fps: a timer waits out most of the gap.
      if (lively) raf = requestAnimationFrame(frame);
      else tmo = setTimeout(() => { tmo = 0; if (visible && !raf) raf = requestAnimationFrame(frame); }, Math.max(0, t0 + 31 - performance.now()));
    } else { last = 0; snd.hush(); kit.rest(() => !raf && !tmo); }
  }
}
function halt() { if (raf) cancelAnimationFrame(raf); raf = 0; clearTimeout(tmo); tmo = 0; }
function wake() {
  if (!visible || !ready || failed) return;
  // Input during a drifting gap starts the next frame now.
  if (tmo) { clearTimeout(tmo); tmo = 0; }
  if (!raf) raf = requestAnimationFrame(frame);
}
function poke() { lastInput = performance.now(); fade = 1; wake(); }
function tick(dt, now) {
  sim.calm = reduce;
  // Asleep: after 60 s with no input, the drift eases to a stop over 2 s.
  const idle = (now - lastInput) / 1000;
  const lively = busy(sim) || pointer.id != null;
  if (!lively && idle > 60) fade = Math.max(0, fade - dt / 2);
  const k = lively ? 1 : fade;
  clock += dt * k;
  step(sim, dt * k);
  S.update(sim, dt * k);
  snd.tick(dt, sim, sim.events, panOf);
  sim.events.length = 0;
  const fog = S.vapour.alive() && !reduce;
  const drifting = !sim.landed && boil(sim) > 0.02 && !reduce;
  const more = lively || ((fog || drifting) && fade > 0);
  if (lively) watchdog(dt);
  return more;
}
function render() { S.render(clock); }

/* ---------- performance ---------- */
// Slow frames step quality down one rung; it never steps back up.
// Rungs: pixel ratio 1, then smaller bloom and fog, no multisampling, smaller shadows.
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
onReducedChange(v => { reduce = v; sim.calm = v; poke(); });
sound.onChange(on => { if (on) wake(); });
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
    // The first frame opens with the fog already pouring.
    if (!reduce) S.vapour.prime(sim, pose(sim), 3.5);
    S.update(sim, 0);
    render();
  } catch (err) { return fail(err); }
  // ?qa hands the sim and the scene to a test script.
  if (new URLSearchParams(location.search).has('qa')) {
    Object.assign(globalThis, { __sc: {
      sim, S, TRACK, grab, aim, letGo, hold, shape, doPush, doCool, poke,
      get raf() { return raf || tmo; },
      halt: () => { visible = false; halt(); },
      frame: dt => { tick(dt, performance.now()); render(); },
    } });
  }
  mark('first-frame');
  requestAnimationFrame(() => canvas.classList.add('on'));
  new ResizeObserver(() => { fit(); if (!raf) render(); }).observe(stage);
  ui.onCover?.(() => { fit(); if (!raf && !tmo) render(); });
  onQuality(() => { rung = 0; fit(true); if (!raf) render(); });
  whenVisible(stage, v => {
    visible = v;
    if (v) wake();
    else { halt(); last = 0; snd.hush(); }
  });
  addEventListener('pagehide', () => S.dispose(), { once: true });
  await introDone;
  ready = true;
  poke();
}
start();
