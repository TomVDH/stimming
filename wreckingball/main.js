// Wrecking ball: swing a ball into a brick wall; the wall lays itself back.
// Plan: docs/plans/wreckingball.md. Toy doc: docs/toys/wreckingball.md.
import { initPage, whenVisible, reduced, onReducedChange, onQuality, pixelRatio, audioKit, sound, stage as mark, pageReady } from '../shared/stim.js';
import { intro as playIntro } from '../shared/intro.js';
import { BALL, makeSim, step, hold, letGo, lift, liftTick, startRebuild, busy, park } from './sim.js';
import { createScene } from './scene.js';
import { wallSound } from './sound.js';
mark('libs');
const introDone = playIntro({ ready: pageReady() });

const ID = 'wreckingball';
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
let reduce = reduced();

/* ---------- settings ---------- */
// Settings persist per browser; storage is optional.
const saved = k => { try { return localStorage.getItem(`stimming.${ID}.${k}`); } catch { return null; } };
const save = (k, v) => { try { localStorage.setItem(`stimming.${ID}.${k}`, String(v)); } catch { /* storage is optional */ } };
const pv = Number(saved('pull'));
let pull = saved('pull') != null && pv >= 0 && pv <= 1 ? pv : 0.6;
// Pull maps to the release angle of a Space swing: 10 to 36 degrees.
const pullAngle = () => (10 + 26 * pull) * Math.PI / 180;

/* ---------- bar ---------- */
const ui = initPage({ id: ID, bar: {
  actions: [
    { verb: 'swing', label: 'Swing', key: 'Space', onPress: () => doSwing() },
    { verb: 'rebuild', label: 'Rebuild', key: 'R', onPress: () => doRebuild() },
  ],
  slider: { label: 'Pull', min: 0, max: 1, step: 0.01, value: pull, onInput: v => { pull = v; save('pull', v); } },
  quality: true,
  keys: [['drag', 'pull back'], ['release', 'swing'], ['space', 'swing'], ['r', 'rebuild']],
  // Bar v3 lists every input in How to play: one instruction per row.
  help: [
    ['drag', 'Drag the ball back from the wall'],
    ['release', 'Let go: the ball swings into the wall'],
    ['space', 'Press Space to swing the ball from the Pull height'],
    ['r', 'Press R to lay the wall back now'],
  ],
} });

/* ---------- sim ---------- */
const sim = makeSim();
sim.calm = reduce;
const kit = audioKit({ keys: new Set([' ', 'r', 'R']), sleepMs: 1500 });
const snd = wallSound(kit);

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
// A press on the ball takes it; a drag pulls it back; the release lets it swing.
const pointer = { id: null, mode: null, x0: 0, y0: 0, ox: 0, oy: 0 };
const local = e => { const r = stage.getBoundingClientRect(); return [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height, r]; };
function onBall(nx, ny, r, touch) {
  const b = sim.ball, [sx, sy] = S.toScreen(b.x, b.y, b.z);
  const rad = S.ballPx(b, r.height) * 1.25 + (touch ? 26 : 12);
  return Math.hypot((sx - nx) * r.width, (sy - ny) * r.height) < rad;
}
stage.addEventListener('pointerdown', e => {
  if (e.button !== 0 || !ready || failed || (e.target !== canvas && e.target !== stage)) return;
  if (pointer.id != null) return;
  const [nx, ny, r] = local(e);
  if (!onBall(nx, ny, r, e.pointerType !== 'mouse')) return;
  try { stage.setPointerCapture(e.pointerId); } catch { /* capture is optional */ }
  pointer.id = e.pointerId;
  pointer.x0 = e.clientX; pointer.y0 = e.clientY;
  const p = S.pick(nx, ny);
  // The grab keeps the offset from the ball's centre.
  pointer.ox = p ? sim.ball.x - p.x : 0; pointer.oy = p ? sim.ball.y - p.y : 0;
  pointer.mode = 'hold';
  stage.classList.add('held');
  hold(sim, sim.ball.x, sim.ball.y);
  sim.events.push({ type: 'grab' });
  poke();
});
stage.addEventListener('pointermove', e => {
  if (e.pointerId !== pointer.id || pointer.mode !== 'hold') return;
  const [nx, ny] = local(e);
  const p = S.pick(nx, ny);
  if (p) hold(sim, p.x + pointer.ox, p.y + pointer.oy);
  poke();
});
function release(e) {
  if (e.pointerId !== pointer.id) return;
  pointer.id = null;
  if (pointer.mode === 'hold') letGo(sim);
  pointer.mode = null;
  stage.classList.remove('held');
  poke();
}
['pointerup', 'pointercancel', 'lostpointercapture'].forEach(t => stage.addEventListener(t, release));

/* ---------- actions ---------- */
function doSwing() {
  if (!ready || failed || sim.ball.held) return;
  lift(sim, pullAngle());
  poke();
}
function doRebuild() {
  if (!ready || failed) return;
  if (startRebuild(sim, true)) poke();
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
    S.resize(w, h, dpr, { bloomScale: rung >= 2 ? 0.33 : 0.5, samples: rung >= 2 ? 0 : 4, shadow: rung >= 2 ? 1024 : 2048, dustScale: rung >= 2 ? 0.33 : 0.5 });
  }
  S.frame(w, h, cover());
}

/* ---------- loop ---------- */
// Lively while the ball moves, bricks fly, dust lives or the wall rebuilds.
// Nothing drifts, so the loop then stops.
let raf = 0, last = 0, visible = true, clock = 0;
function frame(now) {
  raf = 0;
  // A frame stamp can predate the wake, so dt never goes below zero.
  const dt = last ? clamp((now - last) / 1000, 0, 1 / 20) : 1 / 60;
  last = now;
  let more = false;
  try { more = tick(dt); render(); }
  finally {
    if (visible && more && !failed) raf = requestAnimationFrame(frame);
    else { snd.hush(); kit.rest(() => !raf); }
  }
}
function wake() { if (visible && ready && !raf && !failed) { last = 0; raf = requestAnimationFrame(frame); } }
function poke() { wake(); }
function tick(dt) {
  clock += dt;
  sim.calm = reduce;
  liftTick(sim, dt);
  step(sim, dt);
  park(sim);
  for (const e of sim.events) S.dust.add(e, reduce);
  const dusty = S.dust.step(dt);
  snd.tick(dt, sim, sim.events, panOf);
  sim.events.length = 0;
  const more = busy(sim) || dusty || pointer.mode === 'hold';
  if (more) watchdog(dt);
  return more;
}
function render() {
  S.update(sim);
  S.render(clock);
}

/* ---------- performance ---------- */
// Slow frames step quality down one rung; it never steps back up.
// Rungs: pixel ratio 1, then smaller bloom and dust, no multisampling, smaller shadows.
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
onReducedChange(v => { reduce = v; wake(); if (!raf && S) render(); });
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
    await S.warm(sim);
    render();
  } catch (err) { return fail(err); }
  // ?qa hands the sim and the scene to a test script.
  if (new URLSearchParams(location.search).has('qa')) {
    Object.assign(globalThis, { __wb: {
      sim, S, BALL, hold, letGo, doSwing, doRebuild, poke,
      halt: () => { visible = false; if (raf) cancelAnimationFrame(raf); raf = 0; },
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
    else { if (raf) cancelAnimationFrame(raf); raf = 0; snd.hush(); }
  });
  addEventListener('pagehide', () => S.dispose(), { once: true });
  await introDone;
  ready = true;
}
start();
