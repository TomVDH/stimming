// Hook and loop: peel a strap open; the crackle follows your speed. Press it shut again.
// Plan: docs/plans/hookloop.md. Toy doc: docs/toys/hookloop.md.
import { initPage, whenVisible, reduced, onReducedChange, onQuality, pixelRatio, audioKit, sound, stage as mark, pageReady } from '../shared/stim.js';
import { intro as playIntro } from '../shared/intro.js';
import { STRAP, makeStrap, step, grab, letGo, press, busy, freeze } from './strap.js';
import { createScene } from './scene.js';
import { strapSound } from './sound.js';
mark('libs');
const introDone = playIntro({ ready: pageReady() });

const ID = 'hookloop';
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const ease = t => t * t * (3 - 2 * t);
let reduce = reduced();

/* ---------- settings ---------- */
// Settings persist per browser; storage is optional.
const saved = k => { try { return localStorage.getItem(`stimming.${ID}.${k}`); } catch { return null; } };
const save = (k, v) => { try { localStorage.setItem(`stimming.${ID}.${k}`, String(v)); } catch { /* storage is optional */ } };
const gv = Number(saved('grip'));
let grip = saved('grip') != null && gv >= 0 && gv <= 1 ? gv : 0.6;

/* ---------- bar ---------- */
const ui = initPage({ id: ID, bar: {
  actions: [
    { verb: 'rip', label: 'Rip', key: 'Space', onPress: () => startRip() },
    { verb: 'seal', label: 'Seal', key: 'Enter', onPress: () => startSeal() },
  ],
  slider: { label: 'Grip', min: 0, max: 1, step: 0.01, value: grip, onInput: v => { grip = v; st.grip = v; save('grip', v); } },
  quality: true,
  keys: [['drag', 'peel'], ['click', 'seal'], ['space', 'rip'], ['enter', 'seal']],
  // Bar v3 lists every input in How to play: one instruction per row.
  help: [
    ['drag', 'Drag the tab up and back to peel the strap open'],
    ['click', 'Press or drag along the strap to seal it shut'],
    ['space', 'Press Space to rip it open in one pull'],
    ['enter', 'Press Enter to seal the whole strap'],
  ],
} });

/* ---------- strap ---------- */
const st = makeStrap({ seed: 7, grip });
st.calm = reduce;
const kit = audioKit({ keys: new Set([' ', 'Enter']), sleepMs: 1500 });
const snd = strapSound(kit);

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
// Sound pans with the strap: the stitched end is left, the tab right.
const panOf = x => clamp(x / (STRAP.L / 2), -1, 1) * 0.7;

/* ---------- input ---------- */
// The tab peels; a press anywhere else is a thumb that seals.
const pointer = { id: null, mode: null, ox: 0, oy: 0 };
const local = e => { const r = stage.getBoundingClientRect(); return [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height, r]; };
const tabFrom = STRAP.L - STRAP.tab;
// Distance in pixels from the pointer to the tab, sampled over its face.
function nearTab(nx, ny, r) {
  let best = 1e9;
  for (let a = 0; a <= 5; a++) {
    const s = tabFrom - 4 + a * (STRAP.tab + 6) / 5;
    const i = st.nodeOf(Math.min(s, STRAP.L));
    const over = Math.max(0, s - STRAP.L);
    for (let b = 0; b <= 4; b++) {
      const z = (b / 4 - 0.5) * (STRAP.W + 4);
      const [sx, sy] = S.toScreen(st.x[i] + over, st.y[i], z);
      best = Math.min(best, Math.hypot((sx - nx) * r.width, (sy - ny) * r.height));
    }
  }
  return best;
}
function handFrom(nx, ny) {
  const h = S.pickUpright(nx, ny);
  return h ? { x: h.x + pointer.ox, y: h.y + pointer.oy } : null;
}
function thumbFrom(nx, ny) {
  const h = S.pickTop(nx, ny);
  if (!h || Math.abs(h.z) > STRAP.W / 2 + 10) return null;
  return { x: clamp(h.x, STRAP.x0, STRAP.x0 + STRAP.L), z: clamp(h.z, -STRAP.W / 2, STRAP.W / 2) };
}
stage.addEventListener('pointerdown', e => {
  if (e.button !== 0 || !ready || failed || (e.target !== canvas && e.target !== stage)) return;
  try { stage.setPointerCapture(e.pointerId); } catch { /* capture is optional */ }
  stopAuto();
  const [nx, ny, r] = local(e);
  pointer.id = e.pointerId;
  const reach = Math.max(26, Math.min(r.width, r.height) * 0.05);
  if (nearTab(nx, ny, r) < reach) {
    const end = st.n - 1, h = S.pickUpright(nx, ny);
    pointer.mode = 'peel';
    pointer.ox = h ? st.x[end] - h.x : 0;
    pointer.oy = h ? st.y[end] - h.y : 0;
    grab(st, end, st.x[end], st.y[end]);
  } else {
    const t = thumbFrom(nx, ny);
    pointer.mode = 'seal';
    if (t) press(st, true, t.x, t.z);
  }
  poke();
});
stage.addEventListener('pointermove', e => {
  if (e.pointerId !== pointer.id) return;
  const [nx, ny] = local(e);
  if (pointer.mode === 'peel' && st.hand) {
    const h = handFrom(nx, ny);
    if (h) { st.hand.tx = h.x; st.hand.ty = clamp(h.y, STRAP.home, 140); }
  } else if (pointer.mode === 'seal') {
    const t = thumbFrom(nx, ny);
    if (t) press(st, true, t.x, t.z); else press(st, false);
  }
  poke();
});
function release(e) {
  if (e.pointerId !== pointer.id) return;
  pointer.id = null;
  if (pointer.mode === 'peel') letGo(st); else press(st, false);
  pointer.mode = null;
  poke();
}
['pointerup', 'pointercancel', 'lostpointercapture'].forEach(t => stage.addEventListener(t, release));

/* ---------- actions ---------- */
// Rip: a hand swings the tab up round the stitch, so the whole strap peels.
// Seal: a thumb runs from the stitch to the tab.
let auto = null;
function startRip() {
  if (!ready || failed || pointer.id != null) return;
  stopAuto();
  const end = st.n - 1;
  auto = { kind: 'rip', t: 0, dur: reduce ? 1.1 : 0.55 };
  grab(st, end, st.x[end], st.y[end]);
  poke();
}
function startSeal() {
  if (!ready || failed || pointer.id != null) return;
  stopAuto();
  auto = { kind: 'seal', t: 0, dur: reduce ? 2.2 : 1.2 };
  poke();
}
function stopAuto() {
  if (!auto) return;
  if (auto.kind === 'rip') letGo(st); else press(st, false);
  auto = null;
}
function runAuto(dt) {
  if (!auto) return;
  auto.t += dt;
  const k = clamp(auto.t / auto.dur);
  if (auto.kind === 'rip') {
    const x0 = STRAP.x0 + STRAP.stitch, R = STRAP.L - STRAP.stitch - 1.5;
    const a = lerp(0.03, 1.3, ease(k));
    if (st.hand) { st.hand.tx = x0 + R * Math.cos(a); st.hand.ty = STRAP.home + R * Math.sin(a); }
    if (k >= 1) stopAuto();
  } else {
    const x = lerp(STRAP.x0 + STRAP.stitch, STRAP.x0 + STRAP.L - 2, ease(k));
    press(st, true, x, Math.sin(auto.t * 9) * 3);
    if (k >= 1) stopAuto();
  }
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
    S.resize(w, h, dpr, { bloomScale: rung >= 2 ? 0.33 : 0.5, samples: rung >= 2 ? 0 : 4, shadow: rung >= 2 ? 1024 : 2048, blur: rung >= 2 ? 0 : 1 });
  }
  S.frame(w, h, cover());
}

/* ---------- loop ---------- */
// Lively while the strap moves. Nothing drifts, so the loop then stops.
let raf = 0, last = 0, visible = true, clock = 0;
function frame(now) {
  raf = 0;
  // A frame stamp can predate the wake, so dt never goes below zero.
  const dt = last ? clamp((now - last) / 1000, 0, 1 / 20) : 1 / 60;
  last = now;
  let more = false;
  try { more = tick(dt); render(dt); }
  finally {
    if (visible && more && !failed) raf = requestAnimationFrame(frame);
    else { snd.hush(); kit.rest(() => !raf); }
  }
}
function wake() { if (visible && ready && !raf && !failed) { last = 0; raf = requestAnimationFrame(frame); } }
function poke() { wake(); }
function tick(dt) {
  clock += dt;
  st.calm = reduce;
  runAuto(dt);
  step(st, dt);
  snd.tick(dt, st, st.events, panOf, st.grip);
  st.events.length = 0;
  const more = busy(st) || !!auto;
  if (more) watchdog(dt); else freeze(st);
  return more;
}
function render(dt = 0) {
  S.update(st, dt);
  S.render(reduce ? 0 : clock % 100);
}

/* ---------- performance ---------- */
// Slow frames step quality down one rung; it never steps back up.
// Rungs: pixel ratio 1, then smaller bloom, no multisampling, no focus blur.
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
  // One WebGL context per toy: the probe lets its context go.
  probe.getExtension('WEBGL_lose_context')?.loseContext();
  mark('build');
  try {
    S = createScene(canvas, { onLost: () => { failed = true; if (raf) cancelAnimationFrame(raf); raf = 0; stage.querySelector('.fail').hidden = false; } });
    fit(true);
    S.update(st);
    await S.warm();
    render();
  } catch (err) { return fail(err); }
  // ?qa hands the strap and the scene to a test script.
  // A test may stop the loop and step frames by hand.
  if (new URLSearchParams(location.search).has('qa')) {
    Object.assign(globalThis, { __hl: {
      st, S, STRAP, grab, letGo, press, startRip, startSeal,
      halt: () => { visible = false; if (raf) cancelAnimationFrame(raf); raf = 0; },
      frame: dt => { tick(dt); render(dt); },
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
