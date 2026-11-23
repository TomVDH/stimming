// Wave machine: flick a rod; the twist wave runs out, reflects and runs back.
// Plan: docs/plans/wavemachine.md. Toy doc: docs/toys/wavemachine.md.
import { initPage, whenVisible, reduced, onReducedChange, onQuality, pixelRatio, audioKit, sound, stage as mark, pageReady } from '../shared/stim.js';
import { intro as playIntro } from '../shared/intro.js';
import { M, makeLine, step, grab, moveHand, letGo, flick, still, setWeights, busy, energy, centre } from './sim.js';
import { createScene } from './scene.js';
import { machineSound } from './sound.js';
mark('libs');
const introDone = playIntro({ ready: pageReady() });

const ID = 'wavemachine';
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
let reduce = reduced();

/* ---------- settings ---------- */
// Settings persist per browser; storage is optional.
const saved = k => { try { return localStorage.getItem(`stimming.${ID}.${k}`); } catch { return null; } };
const save = (k, v) => { try { localStorage.setItem(`stimming.${ID}.${k}`, String(v)); } catch { /* storage is optional */ } };
const wv = Number(saved('weights'));
let weights = saved('weights') != null && wv >= 0 && wv <= 1 ? wv : 0.5;

/* ---------- bar ---------- */
const ui = initPage({ id: ID, bar: {
  actions: [
    { verb: 'flick', label: 'Flick', key: 'Space', onPress: () => doFlick() },
    { verb: 'still', label: 'Still', key: 'R', onPress: () => doStill() },
  ],
  slider: { label: 'Weights', min: 0, max: 1, step: 0.01, value: weights, onInput: v => { weights = v; applyWeights(); save('weights', v); } },
  quality: true,
  keys: [['drag', 'turn a rod'], ['click', 'flick'], ['space', 'flick'], ['r', 'still']],
  // Bar v3 lists every input in How to play: one instruction per row.
  help: [
    ['drag', 'Drag a rod end up or down to turn it on the wire'],
    ['click', 'Click a rod, or flick it, to send a pulse down the line'],
    ['space', 'Press Space to flick the first rod'],
    ['r', 'Press R to bring the line to rest'],
  ],
} });

/* ---------- line ---------- */
const L = makeLine();
L.calm = reduce;
setWeights(L, weights);
const kit = audioKit({ keys: new Set([' ', 'r', 'R']), sleepMs: 1500 });
const snd = machineSound(kit);

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
function applyWeights() {
  setWeights(L, weights);
  if (S) { S.setWeights(weights); if (!raf) { S.update(L, heldRod()); S.render(clock % 100); } }
}
// Sound pans with the point's place on screen.
const panOf = u => S ? clamp((S.screenX(u) - 0.5) * 1.6, -0.85, 0.85) : 0;
// The flick angle: a firm turn, softer under reduced motion.
const flickA = () => (reduce ? 0.32 : 0.52);

/* ---------- input ---------- */
// A press on a rod: a drag turns it, a hold grips it, a tap flicks it.
const pointer = { id: null, mode: null, x0: 0, y0: 0, i: -1, ang0: 0, hold: 0 };
const local = e => { const r = stage.getBoundingClientRect(); return [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height, r]; };
const heldRod = () => (L.hand ? L.hand.i : pointer.mode === 'press' ? pointer.i : -1);
function startTurn(nx, ny) {
  const a = S.angleAt(pointer.i, nx, ny);
  if (a == null) return;
  grab(L, pointer.i, a);
  pointer.mode = 'turn';
}
stage.addEventListener('pointerdown', e => {
  if (e.button !== 0 || !ready || failed || (e.target !== canvas && e.target !== stage)) return;
  if (pointer.id != null) return;
  const [nx, ny, r] = local(e);
  const touch = e.pointerType !== 'mouse';
  const hit = S.pickRod(L, nx, ny, r.width, r.height);
  if (hit.i < 0 || hit.d > (touch ? 34 : 22)) return;
  try { stage.setPointerCapture(e.pointerId); } catch { /* capture is optional */ }
  pointer.id = e.pointerId;
  pointer.x0 = e.clientX; pointer.y0 = e.clientY;
  pointer.i = hit.i;
  pointer.mode = 'press';
  // Flick direction: the side of the wire the press is on.
  const a = S.angleAt(hit.i, nx, ny);
  pointer.side = a != null && Math.cos(a - L.th[hit.i]) < 0 ? -1 : 1;
  clearTimeout(pointer.hold);
  // A still press becomes a grip: the rod waits in the hand.
  pointer.hold = setTimeout(() => { if (pointer.mode === 'press') { startTurn(nx, ny); poke(); } }, 260);
  L.events.push({ type: 'touch', i: hit.i });
  poke();
});
stage.addEventListener('pointermove', e => {
  if (e.pointerId !== pointer.id) return;
  const [nx, ny] = local(e);
  if (pointer.mode === 'press' && Math.hypot(e.clientX - pointer.x0, e.clientY - pointer.y0) > 8) { clearTimeout(pointer.hold); startTurn(nx, ny); }
  if (pointer.mode === 'turn') {
    const a = S.angleAt(pointer.i, nx, ny);
    if (a != null) moveHand(L, a);
  }
  poke();
});
function release(e) {
  if (e.pointerId !== pointer.id) return;
  pointer.id = null;
  clearTimeout(pointer.hold);
  if (pointer.mode === 'turn') letGo(L);
  // A tap flicks the rod down on the side it was pressed.
  else if (pointer.mode === 'press' && e.type === 'pointerup') flick(L, pointer.i, -pointer.side * flickA());
  pointer.mode = null;
  pointer.i = -1;
  poke();
}
['pointerup', 'pointercancel', 'lostpointercapture'].forEach(t => stage.addEventListener(t, release));

/* ---------- actions ---------- */
function doFlick() { if (!ready || failed) return; flick(L, 0, flickA()); poke(); }
function doStill() { if (!ready || failed) return; if (L.hand) letGo(L); still(L); poke(); }

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
// Lively while the line moves. Nothing drifts, so the loop then stops.
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
  L.calm = reduce;
  const more = step(L, dt);
  snd.tick(dt, L, L.events, panOf, { energy: energy(L), centre: centre(L) });
  L.events.length = 0;
  if (more) watchdog(dt);
  return more || pointer.mode != null;
}
function render() {
  S.update(L, heldRod());
  S.render(reduce ? 0 : clock % 100);
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
    S.setWeights(weights);
    fit(true);
    // The first frame is a picture: a pulse already in flight.
    flick(L, 0, flickA());
    for (let t = 0; t < 1.05; t += 1 / 120) step(L, 1 / 120);
    L.events.length = 0;
    await S.warm(L);
    render();
  } catch (err) { return fail(err); }
  // ?qa hands the line and the scene to a test script.
  if (new URLSearchParams(location.search).has('qa')) {
    Object.assign(globalThis, { __wm: {
      L, S, M, grab, moveHand, letGo, flick, still, doFlick, doStill, poke, busy,
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
  // The pulse of the first frame runs on.
  wake();
}
start();
