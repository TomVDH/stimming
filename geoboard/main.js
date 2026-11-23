// Geoboard: stretch rubber bands over nails; pluck a run to twang it.
// Plan: docs/plans/geoboard.md. Toy doc: docs/toys/geoboard.md.
import { initPage, whenVisible, reduced, onReducedChange, onQuality, pixelRatio, audioKit, sound, stage as mark, pageReady } from '../shared/stim.js';
import { intro as playIntro } from '../shared/intro.js';
import { B, makeBoard, step, grab, moveHand, letGo, pluck, strum, reset, setTension, busy, nearestRun, strumAcross } from './board.js';
import { createScene } from './scene.js';
import { bandSound } from './sound.js';
mark('libs');
const introDone = playIntro({ ready: pageReady() });

const ID = 'geoboard';
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
let reduce = reduced();

/* ---------- settings ---------- */
// Settings persist per browser; storage is optional.
const saved = k => { try { return localStorage.getItem(`stimming.${ID}.${k}`); } catch { return null; } };
const save = (k, v) => { try { localStorage.setItem(`stimming.${ID}.${k}`, String(v)); } catch { /* storage is optional */ } };
const tv = Number(saved('tension'));
let tension = saved('tension') != null && tv >= 0 && tv <= 1 ? tv : 0.5;

/* ---------- bar ---------- */
const ui = initPage({ id: ID, bar: {
  actions: [
    { verb: 'strum', label: 'Strum', key: 'Space', onPress: () => doStrum() },
    { verb: 'reset', label: 'Reset', key: 'R', onPress: () => doReset() },
  ],
  slider: { label: 'Tension', min: 0, max: 1, step: 0.01, value: tension, onInput: v => { tension = v; setTension(bd, v); save('tension', v); poke(); } },
  quality: true,
  keys: [['drag', 'stretch'], ['click', 'pluck'], ['space', 'strum'], ['r', 'reset']],
  // Bar v3 lists every input in How to play: one instruction per row.
  help: [
    ['drag', 'Drag a band to stretch it over the nails'],
    ['release', 'Release it on a nail to hook it there, or in the open to snap it back'],
    ['click', 'Click a band to pluck it; drag across bands to strum them'],
    ['space', 'Press Space to strum every band'],
    ['r', 'Press R to put the bands back'],
  ],
} });

/* ---------- board ---------- */
const bd = makeBoard();
bd.calm = reduce;
setTension(bd, tension);
const kit = audioKit({ keys: new Set([' ', 'r', 'R']), sleepMs: 1500 });
const snd = bandSound(kit);

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
// Sound pans across the board, left to right.
const panOf = x => clamp(x / (B.size / 2), -1, 1) * 0.75;

/* ---------- input ---------- */
// A press on a band: a drag stretches it, a hold lifts it, a tap plucks it.
// A press off the bands: a drag strums the runs it crosses.
const pointer = { id: null, mode: null, x0: 0, y0: 0, t0: 0, band: null, hit: null, ox: 0, oy: 0, last: null, trail: [], hold: 0, touch: false };
const local = e => { const r = stage.getBoundingClientRect(); return [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height, r]; };
const SP = { x: new Float32Array(1400), y: new Float32Array(1400), z: new Float32Array(1400), run: new Int16Array(1400) };

// The band under the pointer, in screen pixels. Upper bands win a near tie.
function bandAt(nx, ny, r, reach) {
  let best = null, bd2 = reach;
  for (let bi = bd.bands.length - 1; bi >= 0; bi--) {
    const b = bd.bands[bi], n = S.sampleBand(bd, b, SP);
    for (let j = 0; j < n; j++) {
      const [sx, sy] = S.toScreen(SP.x[j], SP.y[j], SP.z[j]);
      const d = Math.hypot((sx - nx) * r.width, (sy - ny) * r.height) + (bd.bands.length - 1 - bi) * 1.5;
      if (d < bd2) { bd2 = d; best = { b, x: SP.x[j], y: SP.y[j], z: SP.z[j], seg: SP.run[j] }; }
    }
  }
  return best;
}
function boardAt(nx, ny, z) { return S.pick(nx, ny, z); }
function startGrab(nx, ny) {
  const { b, hit } = pointer;
  // An arc sample names its contact; a nail there lifts off.
  const c = hit.seg < 0 ? b.cs[-hit.seg - 1] : null;
  grab(bd, b, { x: hit.x, y: hit.y, z: hit.z, c });
  const p = boardAt(nx, ny, B.handZ);
  pointer.ox = p ? hit.x - p.x : 0; pointer.oy = p ? hit.y - p.y : 0;
  pointer.mode = 'stretch';
  pointer.trail = [];
}
stage.addEventListener('pointerdown', e => {
  if (e.button !== 0 || !ready || failed || (e.target !== canvas && e.target !== stage)) return;
  if (pointer.id != null) return;
  try { stage.setPointerCapture(e.pointerId); } catch { /* capture is optional */ }
  const [nx, ny, r] = local(e);
  pointer.id = e.pointerId;
  pointer.touch = e.pointerType !== 'mouse';
  pointer.x0 = e.clientX; pointer.y0 = e.clientY; pointer.t0 = performance.now();
  const hit = bandAt(nx, ny, r, pointer.touch ? 30 : 18);
  pointer.b = hit ? hit.b : null;
  pointer.hit = hit;
  pointer.mode = hit ? 'press' : 'sweep';
  pointer.last = boardAt(nx, ny, B.layer0 + 4);
  pointer.lastT = performance.now();
  clearTimeout(pointer.hold);
  // A still press on a band becomes a hold: the finger lifts it in place.
  if (hit) pointer.hold = setTimeout(() => { if (pointer.mode === 'press') { startGrab(nx, ny); poke(); } }, 260);
  poke();
});
stage.addEventListener('pointermove', e => {
  if (e.pointerId !== pointer.id) return;
  const [nx, ny] = local(e);
  const far = Math.hypot(e.clientX - pointer.x0, e.clientY - pointer.y0) > 8;
  if (pointer.mode === 'press' && far) { clearTimeout(pointer.hold); startGrab(nx, ny); }
  if (pointer.mode === 'stretch' && pointer.b.hand) {
    const p = boardAt(nx, ny, B.handZ);
    if (p) {
      moveHand(bd, pointer.b, p.x + pointer.ox, p.y + pointer.oy);
      const now = performance.now();
      pointer.trail.push({ x: p.x, y: p.y, t: now });
      while (pointer.trail.length > 2 && now - pointer.trail[0].t > 90) pointer.trail.shift();
    }
  } else if (pointer.mode === 'sweep' && far) {
    const p = boardAt(nx, ny, B.layer0 + 4), now = performance.now();
    if (p && pointer.last) {
      const dt = Math.max(1, now - pointer.lastT) / 1000;
      strumAcross(bd, pointer.last.x, pointer.last.y, p.x, p.y, Math.hypot(p.x - pointer.last.x, p.y - pointer.last.y) / dt);
    }
    pointer.last = p; pointer.lastT = now;
  }
  poke();
});
function release(e) {
  if (e.pointerId !== pointer.id) return;
  pointer.id = null;
  clearTimeout(pointer.hold);
  const b = pointer.b;
  if (pointer.mode === 'stretch' && b && b.hand) {
    // The finger's last motion becomes the free point's speed.
    const t = pointer.trail, a = t[0], z = t[t.length - 1];
    const dt = a && z && z.t > a.t ? (z.t - a.t) / 1000 : 1;
    const k = reduce ? 0 : 1;
    let vx = a && z ? (z.x - a.x) / dt * k : 0, vy = a && z ? (z.y - a.y) / dt * k : 0;
    const v = Math.hypot(vx, vy);
    if (v > 2500) { vx *= 2500 / v; vy *= 2500 / v; }
    letGo(bd, b, vx, vy);
  } else if (pointer.mode === 'press' && b && e.type === 'pointerup') {
    // A tap plucks the run under the pointer.
    const r = nearestRun(b, pointer.hit.x, pointer.hit.y);
    if (r) pluck(bd, b, b.runs[r.i], r.s, (Math.random() < 0.5 ? -1 : 1) * 3.4);
  }
  pointer.mode = null;
  pointer.b = null;
  poke();
}
['pointerup', 'pointercancel', 'lostpointercapture'].forEach(t => stage.addEventListener(t, release));

/* ---------- actions ---------- */
function letAllGo() {
  for (const b of bd.bands) if (b.hand) letGo(bd, b);
  pointer.mode = null; pointer.b = null;
}
function doStrum() { if (!ready || failed) return; strum(bd, reduce ? 2.2 : 3.2); poke(); }
function doReset() { if (!ready || failed) return; letAllGo(); reset(bd); poke(); }

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
// Lively while a band moves or rings. Nothing drifts, so the loop then stops.
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
  bd.calm = reduce;
  step(bd, dt);
  snd.tick(dt, bd, bd.events, panOf);
  bd.events.length = 0;
  const more = busy(bd) || pointer.mode === 'stretch';
  if (more) watchdog(dt);
  return more;
}
function render() {
  S.update(bd, reduce ? 0.6 : 1.8);
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
    fit(true);
    await S.warm(bd);
    render();
  } catch (err) { return fail(err); }
  // ?qa hands the board and the scene to a test script.
  if (new URLSearchParams(location.search).has('qa')) {
    Object.assign(globalThis, { __gb: {
      bd, S, B, grab, moveHand, letGo, pluck, doStrum, doReset, poke,
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
