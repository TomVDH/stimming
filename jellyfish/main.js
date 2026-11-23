// Jellyfish tank: coloured jellies and a starfield of small ones on a round flow; tap the glass.
// Plan: docs/plans/jellyfish.md. Toy doc: docs/toys/jellyfish.md.
import { initPage, whenVisible, reduced, onReducedChange, onQuality, pixelRatio, audioKit, sound, stage as mark, pageReady } from '../shared/stim.js';
import { intro as playIntro } from '../shared/intro.js';
import { T, makeTank, step, tap, setFlow, busy } from './sim.js';
import { createScene } from './scene.js';
import { makeSound } from './sound.js';
mark('libs');
const introDone = playIntro({ ready: pageReady() });

const ID = 'jellyfish';
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
let calm = reduced();

/* ---------- settings ---------- */
// Settings persist per browser; storage is optional.
const saved = k => { try { return localStorage.getItem(`stimming.${ID}.${k}`); } catch { return null; } };
const save = (k, v) => { try { localStorage.setItem(`stimming.${ID}.${k}`, String(v)); } catch { /* storage is optional */ } };
const fv = Number(saved('flow'));
let flow = saved('flow') != null && fv >= 0 && fv <= 1 ? fv : 0.5;

/* ---------- bar ---------- */
const ui = initPage({ id: ID, bar: {
  actions: [
    { verb: 'tap', label: 'Tap', key: 'Space', onPress: () => keyTap() },
  ],
  slider: { label: 'Flow', min: 0, max: 1, step: 0.01, value: flow, onInput: v => { flow = v; setFlow(tank, v); save('flow', v); poke(); } },
  quality: true,
  keys: [['click', 'tap the glass'], ['space', 'tap']],
  // Bar v3 lists every input in How to play: one instruction per row.
  help: [
    ['click', 'Click the glass to tap it: the near jellies swim away'],
    ['space', 'Press Space to tap the glass near a jelly'],
  ],
} });

/* ---------- tank ---------- */
const stage = document.getElementById('stage');
const narrow = () => stage.clientWidth < 640;
const tank = makeTank(narrow() ? 5 : 6, narrow() ? 420 : 700);
tank.calm = calm;
setFlow(tank, flow);
// Reduced motion opens on still bells: they finish their stroke first.
if (calm) step(tank, 6, 1);
const kit = audioKit({ keys: new Set([' ']), sleepMs: 1500 });
const snd = makeSound(kit);

/* ---------- scene ---------- */
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
// Sound pans across the window, left to right.
const panOf = x => clamp(x / T.R, -1, 1);

/* ---------- tap ---------- */
// A press is a knuckle on the glass. Taps closer than 120 ms merge.
let lastKnock = -1e9;
function knock(px, py, k = 1) {
  if (!ready || failed) return;
  const now = performance.now();
  if (now - lastKnock < 120) return;
  lastKnock = now;
  const g = S.toGlass(px, py);
  // A press on the wall lands on the nearest edge of the glass, softer.
  const out = g.r > 0.97 ? 0.97 / g.r : 1;
  tap(tank, g.x * out, g.y * out, k * (out < 1 ? 0.6 : 1));
  snd.knock(panOf(g.x), k * (out < 1 ? 0.6 : 1));
  poke();
}
// Space taps the glass beside a jelly in the front half.
function keyTap() {
  if (!ready || failed) return;
  const js = tank.jellies.filter(j => j.p[2] > -0.6);
  const j = (js.length ? js : tank.jellies)[Math.floor(Math.random() * (js.length || tank.jellies.length))];
  const a = Math.random() * Math.PI * 2, d = 1.2 + j.size;
  const [px, py] = S.toStage(j.p[0] + Math.cos(a) * d, j.p[1] + Math.sin(a) * d, T.zFront);
  knock(px, py, calm ? 0.8 : 1);
}

/* ---------- input ---------- */
// The press knocks at once; a drag or a hold adds nothing.
const pointer = { id: null };
const local = e => { const r = stage.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
stage.addEventListener('pointerdown', e => {
  if (e.button !== 0 || !ready || failed || (e.target !== canvas && e.target !== stage)) return;
  if (pointer.id != null) return;
  try { stage.setPointerCapture(e.pointerId); } catch { /* capture is optional */ }
  pointer.id = e.pointerId;
  const [x, y] = local(e);
  knock(x, y, calm ? 0.8 : 1);
});
function release(e) { if (e.pointerId === pointer.id) pointer.id = null; }
['pointerup', 'pointercancel', 'lostpointercapture'].forEach(t => stage.addEventListener(t, release));
// A pointer moving over the stage wakes a sleeping tank.
stage.addEventListener('pointermove', () => { if (ready && performance.now() - lastInput > 20000) poke(); });

/* ---------- view ---------- */
let css = { w: 1, h: 1 }, rung = 0;
function fit(force = false) {
  if (!S) return;
  const r = stage.getBoundingClientRect();
  const w = Math.max(1, r.width), h = Math.max(1, r.height);
  const changed = w !== css.w || h !== css.h;
  css = { w, h };
  if (changed || force) {
    // On High the first rung falls back to Standard, not to 1x.
    const dpr = rung === 0 ? pixelRatio(w, h, { budget: 2.4e6 }) : rung === 1 ? pixelRatio(w, h, { budget: 1.3e6, maxDpr: 1, quality: 'standard' }) : 1;
    S.resize(w, h, dpr, { bloomScale: rung >= 2 ? 0.33 : 0.5 });
  }
  const c = ui.cover?.();
  S.frame(w, h, c ? clamp(c.bottom, 0, h * 0.3) : 0);
}

/* ---------- loop ---------- */
// Lively after input and in a flinch; drifting at 30 fps; asleep after 60 s.
let raf = 0, timer = 0, last = 0, visible = true, clock = 0, lastInput = performance.now(), amb = 1, frameNo = 0;
function frame(now) {
  raf = 0;
  if (!visible || failed || !S) return;
  const t0 = performance.now();
  const dt = last ? clamp((now - last) / 1000, 0, 1 / 15) : 1 / 60;
  last = Math.max(last, now);
  let again = false, lively = false;
  try {
    const idle = (t0 - lastInput) / 1000;
    // Ambient motion eases to a stop over 2 s once the tank sleeps.
    amb = calm ? 0 : clamp(1 - (idle - 60) / 2);
    tank.calm = calm;
    const live = amb > 0 || busy(tank);
    if (live) {
      step(tank, dt, calm ? 1 : amb);
      clock += dt * (calm ? 0 : amb);
    }
    for (const ev of tank.events) if (ev.type === 'flinch') snd.swoosh(panOf(ev.x), ev.k);
    tank.events.length = 0;
    snd.frame({ flow, amb: calm ? 0.6 : amb, dt });
    render();
    frameNo++;
    lively = pointer.id !== null || t0 - lastInput < 1500 || tank.jellies.some(j => j.flinch > 0.05);
    again = live;
    if (lively) watchdog(dt);
  } finally {
    // A thrown error still leaves the loop able to wake.
    if (again) schedule(lively ? 0 : t0 + 33 - performance.now()); else rest();
  }
}
function render() {
  S.update(tank);
  S.render(clock, calm ? 0 : frameNo % 97);
}
function rest() { snd.quiet(); kit.rest(() => !raf && !timer && !snd.busy); }
// One frame at most is ever pending, so loops never stack.
function schedule(delay = 0) {
  if (raf || timer || !visible || failed || !ready) return;
  if (delay > 4) timer = setTimeout(() => { timer = 0; schedule(); }, delay - 2);
  else raf = requestAnimationFrame(frame);
}
function poke() {
  lastInput = performance.now();
  if (!raf && !timer) last = performance.now();
  if (timer) { clearTimeout(timer); timer = 0; }
  schedule();
}
function halt() { cancelAnimationFrame(raf); raf = 0; clearTimeout(timer); timer = 0; }

/* ---------- performance ---------- */
// Slow frames step quality down one rung; it never steps back up.
// Rungs: pixel ratio 1, then a smaller bloom buffer.
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
onReducedChange(v => { calm = v; poke(); });
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
    await S.warm(tank);
    render();
  } catch (err) { return fail(err); }
  // ?qa hands the tank and the scene to a test script.
  if (new URLSearchParams(location.search).has('qa')) {
    Object.assign(globalThis, { __jf: {
      tank, S, T, knock, keyTap, poke,
      get busy() { return !!(raf || timer); },
      idle(s) { lastInput = performance.now() - s * 1000; },
      run(n, dt = 1 / 30) { for (let i = 0; i < n; i++) { step(tank, dt, 1); clock += dt; } render(); },
    } });
  }
  mark('first-frame');
  requestAnimationFrame(() => canvas.classList.add('on'));
  new ResizeObserver(() => { fit(); if (!raf) render(); }).observe(stage);
  ui.onCover?.(() => { fit(); if (!raf) render(); });
  onQuality(() => { rung = 0; fit(true); if (!raf) render(); });
  whenVisible(stage, v => {
    visible = v;
    if (v) { last = performance.now(); schedule(); }
    else { halt(); snd.quiet(); }
  });
  addEventListener('pagehide', () => S.dispose(), { once: true });
  await introDone;
  ready = true;
  poke();
}
start();
