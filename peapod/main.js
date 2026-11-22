// Pea pod: squeeze a pod; it splits along its seam and the peas pop out.
// Plan: docs/plans/peapod.md. Toy doc: docs/toys/peapod.md.
import { initPage, whenVisible, reduced, onReducedChange, onQuality, pixelRatio, audioKit, sound, stage as mark, pageReady } from '../shared/stim.js';
import { intro as playIntro } from '../shared/intro.js';
import { makeWorld, step, squeeze, uAt, busy, settled, startPan, strew, podX } from './pod.js';
import { createScene } from './scene.js';
import { podSound } from './sound.js';
mark('libs');
const introDone = playIntro({ ready: pageReady() });

const ID = 'peapod';
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
let reduce = reduced();

/* ---------- settings ---------- */
// Settings persist per browser; storage is optional.
const saved = k => { try { return localStorage.getItem(`stimming.${ID}.${k}`); } catch { return null; } };
const save = (k, v) => { try { localStorage.setItem(`stimming.${ID}.${k}`, String(v)); } catch { /* storage is optional */ } };
const sv = Number(saved('spring'));
let spring = saved('spring') != null && sv >= 0 && sv <= 1 ? sv : 0.45;

/* ---------- bar ---------- */
const ui = initPage({ id: ID, bar: {
  actions: [{ verb: 'squeeze', label: 'Squeeze', key: 'Space', hold: true, onDown: () => keySqueeze(true), onUp: () => keySqueeze(false) }],
  slider: { label: 'Spring', min: 0, max: 1, step: 0.01, value: spring, onInput: v => { spring = v; world.spring = v; save('spring', v); } },
  quality: true,
  keys: [['hold', 'squeeze'], ['drag', 'move the dent'], ['space', 'squeeze']],
  // Bar v3 lists every input in How to play: one instruction per row.
  help: [
    ['hold', 'Hold to squeeze the pod until the seam snaps'],
    ['drag', 'Drag to move the dent along the pod'],
    ['click', 'Click to pinch; quick pinches add up'],
    ['space', 'Hold Space to squeeze the middle'],
  ],
} });

/* ---------- world ---------- */
const world = makeWorld({ seed: 11 });
world.spring = spring;
world.calm = reduce;
// A few loose peas from an earlier pod lie in the light.
strew(world, [[-3.4, 4.3, 0.41], [-2.55, 4.7, 0.39], [3.6, -3.9, 0.4]]);
const kit = audioKit({ keys: new Set([' ']), sleepMs: 1500 });
const snd = podSound(kit);

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

/* ---------- events to sound ---------- */
// Sound pans with its source across the view.
const pan = x => clamp((x - world.view) / 12, -1, 1) * 0.8;
function handle(ev) {
  switch (ev.type) {
    case 'press': snd.press(pan(ev.x), ev.p); break;
    case 'snap': snd.snap(pan(ev.x), ev.sp); break;
    case 'valve': snd.valve(pan(ev.x) + ev.side * 0.15, ev.v); break;
    case 'launch': snd.launch(pan(ev.x), ev.v); break;
    case 'bounce': snd.bounce(pan(ev.x), ev.v, ev.r); break;
    case 'click': snd.click(pan(ev.x), ev.v); break;
    case 'pan': snd.pan(ev.cut); break;
    case 'land': snd.land(pan(ev.x), ev.v); break;
  }
}

/* ---------- input ---------- */
// A press anywhere squeezes the pod where it is nearest the pointer.
const pointer = { id: null, x0: 0, y0: 0, moved: false };
const local = e => { const r = stage.getBoundingClientRect(); return [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height]; };
function uFrom(e) {
  const [nx, ny] = local(e);
  const h = S.pick(nx, ny);
  return h ? uAt(world.pod, h.x) : 0.5;
}
// After the split, a press brings the next pod at once.
function next() {
  if (world.pan || !world.pod.split) return false;
  startPan(world, { cut: reduce });
  restT = 0;
  return true;
}
stage.addEventListener('pointerdown', e => {
  if (e.button !== 0 || !ready || failed || (e.target !== canvas && e.target !== stage)) return;
  try { stage.setPointerCapture(e.pointerId); } catch { /* capture is optional */ }
  Object.assign(pointer, { id: e.pointerId, x0: e.clientX, y0: e.clientY, moved: false });
  if (world.pan) return;
  if (next()) { poke(); return; }
  squeeze(world, true, uFrom(e));
  poke();
});
stage.addEventListener('pointermove', e => {
  if (e.pointerId !== pointer.id) return;
  if (!pointer.moved && Math.hypot(e.clientX - pointer.x0, e.clientY - pointer.y0) < 8) return;
  pointer.moved = true;
  if (world.pod.held) { world.pod.du = uFrom(e); poke(); }
});
function release(e) {
  if (e.pointerId !== pointer.id) return;
  pointer.id = null;
  if (world.pod.held) { squeeze(world, false); poke(); }
}
['pointerup', 'pointercancel', 'lostpointercapture'].forEach(t => stage.addEventListener(t, release));

let keyOn = false;
function keySqueeze(on) {
  if (!ready || failed || on === keyOn) return;
  keyOn = on;
  if (on) {
    if (world.pan) return;
    if (next()) { poke(); return; }
    squeeze(world, true, 0.5);
  } else if (world.pod.held && pointer.id == null) squeeze(world, false);
  poke();
}

/* ---------- view ---------- */
let css = { w: 1, h: 1 }, rung = 0;
function cover() {
  const c = ui.cover?.();
  return c ? clamp(c.bottom / Math.max(1, css.h), 0, 0.4) : 0.08;
}
function fit(force = false) {
  if (!S) return;
  const r = stage.getBoundingClientRect();
  const w = Math.max(1, r.width), h = Math.max(1, r.height);
  const changed = w !== css.w || h !== css.h;
  css = { w, h };
  if (changed || force) {
    // On High the first rung falls back to Standard, not to 1x.
    const dpr = rung === 0 ? pixelRatio(w, h, { budget: 2.4e6 }) : rung === 1 ? pixelRatio(w, h, { budget: 1.4e6, maxDpr: 1, quality: 'standard' }) : 1;
    S.resize(w, h, dpr, { bloomScale: rung >= 2 ? 0.33 : 0.5, samples: rung >= 2 ? 0 : 4, shadow: rung >= 2 ? 1024 : 2048 });
  }
  S.frame(w, h, cover());
}

/* ---------- loop ---------- */
// Lively while anything moves. Nothing drifts, so the loop then stops.
let raf = 0, last = 0, visible = true, restT = 0, clock = 0;
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
  world.calm = reduce;
  step(world, dt);
  for (const ev of world.events) handle(ev);
  world.events.length = 0;
  // Once all lies still, the view moves on to the next pod.
  if (settled(world)) {
    restT += dt;
    if (restT > 1.8) { startPan(world, { cut: reduce }); restT = 0; }
  } else restT = 0;
  snd.tick(dt, world, pan);
  if (busy(world)) watchdog(dt);
  return busy(world);
}
function render() {
  S.update(world);
  // A cut under reduced motion fades through black.
  let fade = 1;
  if (world.pan?.cut) { const k = clamp(world.pan.t / world.pan.dur); fade = Math.abs(Math.cos(k * Math.PI)); }
  S.render(reduce ? 0 : clock % 100, fade);
}

/* ---------- performance ---------- */
// Slow frames step quality down one rung; it never steps back up.
// Rungs: pixel ratio 1, then smaller bloom, no multisampling, a smaller shadow map.
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
onReducedChange(v => { reduce = v; wake(); });
sound.onChange(on => { if (on) wake(); });
async function start() {
  const probe = document.createElement('canvas').getContext('webgl2');
  if (!probe) return fail();
  mark('build');
  try {
    S = createScene(canvas, { onLost: () => { failed = true; if (raf) cancelAnimationFrame(raf); raf = 0; stage.querySelector('.fail').hidden = false; } });
    fit(true);
    S.update(world);
    await S.warm();
    render();
  } catch (err) { return fail(err); }
  // ?qa hands the world and the scene to a test script.
  // A test may stop the loop and step frames by hand.
  if (new URLSearchParams(location.search).has('qa')) {
    Object.assign(globalThis, { __pp: {
      world, S, podX,
      hold: (on, u) => { squeeze(world, on, u); },
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
