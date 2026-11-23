// Whiteout: a polar hut in a blizzard at night. The storm breathes in gusts.
// Tap the stage to switch the door lamp; hold to call up a gust and keep it.
// Plan: docs/plans/whiteout.md. Toy doc: docs/toys/whiteout.md.
import { initPage, whenVisible, pageReady, stage as mark, reduced, onReducedChange, audioKit, sound } from '../shared/stim.js';
import { intro as playIntro } from '../shared/intro.js';
import { onContextLoss } from '../shared/gl.js';
import { detail } from '../shared/detail.js';
import { PF_SNOW } from '../shared/precipfield.js';
import { makeScene, GUST_N } from './scene.js';
import { makeSound } from './sound.js';
import { EYE, AIM, LAMP, MAST } from './world.js';
mark('libs');

const ID = 'whiteout';
const stage = document.getElementById('stage');
const fail = stage.querySelector('.fail');
const store = {
  get(k) { try { return localStorage.getItem(`stimming.${ID}.${k}`); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(`stimming.${ID}.${k}`, String(v)); } catch { /* private mode */ } },
};
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const mix = (a, b, t) => a + (b - a) * t;

/* ---------- state ---------- */
const savedWind = Number(store.get('wind'));
const st = {
  wind: savedWind >= 0 && savedWind <= 100 && store.get('wind') !== null ? savedWind : 62,
  // Storm clock, wind travel and snow fall, in s and m. They stop when the storm sleeps.
  t: 0, windS: 0, fallS: 0,
  // Storm speed: 1 while it drifts, eased to 0 when it sleeps.
  pace: reduced() ? 0 : 1,
  lastInput: 0,
};
// The lamp: the switch, and the filament's heat from 0 to 1.
const lamp = { on: false, heat: 0, since: 0 };
// The gust: natural events, a called gust, a held gust.
const gust = { env: 0, events: [], next: 6, hold: 0, holding: false, hist: new Float32Array(GUST_N), acc: 0 };

let gl = null, scene = null, raf = 0, tmo = 0, visible = true, last = 0, frameNo = 0, calm = reduced();
let cssW = 1, cssH = 1, started = false;

/* ---------- camera: a long lens at eye height ---------- */
const norm = v => { const l = Math.hypot(...v); return v.map(x => x / l); };
const sub = (a, b) => a.map((x, i) => x - b[i]);
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const cam = { pos: EYE, rot: new Float32Array(9), lens: [0.3, 0.19, 0], right: [1, 0, 0], up: [0, 1, 0], back: [0, 0, 1], w: 1, h: 1 };
cam.fit = (w, h, top = 0, bottom = 0) => {
  cam.w = w; cam.h = h;
  const asp = w / h;
  const free = Math.max(0.45, (h - top - bottom) / h);
  const narrow = asp < 0.9;
  // The set: the hut, the cone and the mast, about 12 m wide and 8 m tall at the hut.
  const d = Math.hypot(...sub(EYE, AIM));
  const tanY = Math.max(7.6 / (2 * d * free), (narrow ? 9.6 : 12.4) / (2 * d * asp));
  cam.lens = [tanY * asp, tanY, (bottom - top) / h];
  const back = norm(sub(EYE, narrow ? [-1.4, 2.3, 0] : AIM));
  const right = norm(cross([0, 1, 0], back));
  const up = cross(back, right);
  cam.right = right; cam.up = up; cam.back = back;
  cam.rot.set([...right, ...up, ...back]);
};
// A world point to stage CSS pixels.
cam.project = p => {
  const v = sub(p, cam.pos);
  const z = -dot(v, cam.back);
  if (z <= 1e-4) return null;
  const sx = dot(v, cam.right) / z / cam.lens[0];
  const sy = dot(v, cam.up) / z / cam.lens[1] + cam.lens[2];
  return [(sx + 1) / 2 * cam.w, (1 - sy) / 2 * cam.h];
};

if (new URLSearchParams(location.search).has('qa')) globalThis.__whiteout = { st, lamp, gust, cam, toggle: () => toggleLamp(), callGust: () => callGust(), draw: () => draw(), get loop() { return { raf, tmo, lively: lively() }; } };

/* ---------- bar ---------- */
const ui = initPage({ id: ID, bar: {
  actions: [
    { verb: 'lamp', label: 'Lamp', key: 'Space', onPress: () => toggleLamp() },
    { verb: 'gust', label: 'Gust', key: 'G', onPress: () => callGust() },
  ],
  slider: { label: 'Wind', min: 0, max: 100, step: 1, value: st.wind, onInput: v => { st.wind = v; store.set('wind', v); touch(); } },
  quality: true,
  keys: [['click', 'lamp'], ['hold', 'gust'], ['Space', 'lamp'], ['G', 'gust']],
  help: [
    ['click', 'Tap the stage to switch the door lamp'],
    ['hold', 'Hold the stage to call up a gust and keep it'],
    ['Space', 'Press Space to switch the lamp'],
    ['G', 'Press G to send a gust across'],
  ],
} });
const introDone = playIntro({ ready: pageReady() });
const kit = audioKit({ keys: new Set([' ', 'g', 'G']), sleepMs: 1500 });
const snd = makeSound(kit);
const lampBtn = () => document.querySelector('.stim-ui [aria-keyshortcuts="Space"]');
const syncBar = () => lampBtn()?.setAttribute('aria-pressed', String(lamp.on));

/* ---------- GL ---------- */
const canvas = document.createElement('canvas');
canvas.setAttribute('aria-hidden', 'true');
stage.prepend(canvas);
const D = detail({ maxDpr: 2, budget: 2.2e6, steps: 3, settle: 2, onChange: () => resize(true) });

let sizeKey = '';
function resize(force = false) {
  if (!gl || !scene) return;
  const r = stage.getBoundingClientRect();
  cssW = Math.max(1, r.width); cssH = Math.max(1, r.height);
  const dpr = D.dpr(cssW, cssH);
  const c = ui.cover?.() || { top: 0, bottom: 0 };
  const key = [cssW, cssH, dpr, c.top || 0, c.bottom || 0, D.rung].map(v => Math.round(v * 100)).join();
  if (!force && key === sizeKey) return;
  sizeKey = key;
  const ow = Math.round(cssW * dpr), oh = Math.round(cssH * dpr);
  // The light pass runs larger than the canvas while the budget allows: wires stay clean.
  const ss = D.rung >= 1 ? 1 : clamp(Math.sqrt(2.2e6 / (ow * oh)), 1, 1.5);
  scene.resize(ow, oh, Math.round(ow * ss), Math.round(oh * ss));
  cam.fit(cssW, cssH, c.top || 0, c.bottom || 0);
  draw();
}

/* ---------- the storm ---------- */
const strength = () => st.wind / 100;
// Wind speed in m/s, before gusts.
const baseVel = () => mix(3, 21, strength());
// A gust: rise, hold, fall. a is its strength.
function gustShape(e, t) {
  const u = t - e.t0;
  if (u < 0) return 0;
  const rise = sstep(0, e.rise, u);
  const fall = 1 - sstep(e.rise + e.hold, e.rise + e.hold + e.fall, u);
  return e.a * rise * fall;
}
// A seeded random for the gust plan.
let seed = 4021;
const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
function planGust(t, a, rise = 1.4 + rnd() * 1.2) {
  gust.events.push({ t0: t, a, rise, hold: 0.8 + rnd() * 2.2, fall: 2.6 + rnd() * 1.8 });
}
function callGust() {
  touch();
  planGust(st.t, 1.05 + rnd() * 0.15, 0.7);
  snd.gust(strength());
  poke();
}
// Gust strength now: the plan, a slow breath and the hand's hold.
function stepGust(dt, storm) {
  const s = strength();
  if (storm && !calm && st.t >= gust.next) {
    planGust(st.t, (0.55 + rnd() * 0.45) * mix(0.6, 1, s));
    gust.next = st.t + mix(15, 6, s) + rnd() * 6;
  }
  gust.events = gust.events.filter(e => st.t - e.t0 < e.rise + e.hold + e.fall + 0.1);
  let g = 0;
  for (const e of gust.events) g = Math.max(g, gustShape(e, st.t));
  const breath = calm ? 0 : 0.1 * (Math.sin(st.t * 0.29) + Math.sin(st.t * 0.17 + 1.3)) * s;
  // The hand's gust rises in about two seconds and falls in three.
  gust.hold += ((gust.holding ? 1.2 : 0) - gust.hold) * (1 - Math.exp(-dt / (gust.holding ? 0.9 : 1.1)));
  if (gust.hold < 0.01 && !gust.holding) gust.hold = 0;
  gust.env = Math.max(0, Math.max(g, gust.hold) + breath);
}
// The gust texture: newest first, one sample per 1/30 s of storm time.
function pushHistory(dt, storm) {
  if (!storm) { gust.hist.fill(gust.env); return; }
  gust.acc += dt;
  while (gust.acc >= 1 / 30) {
    gust.acc -= 1 / 30;
    gust.hist.copyWithin(1, 0, GUST_N - 1);
    gust.hist[0] = gust.env;
  }
  gust.hist[0] = gust.env;
}
// The gust front's reach, m: the texture spans GUST_N / 30 s of travel.
const gustSpan = () => baseVel() * 0.9 * (GUST_N / 30);
// The gust where the hut stands.
function gustAtHut() {
  const u = 18;
  const i = clamp(u / gustSpan(), 0, 1) * (GUST_N - 1);
  const a = Math.floor(i), f = i - a;
  return gust.hist[a] * (1 - f) + gust.hist[Math.min(GUST_N - 1, a + 1)] * f;
}

/* ---------- the lamp: a filament that heats and cools ---------- */
function toggleLamp() {
  touch();
  lamp.on = !lamp.on;
  lamp.since = performance.now();
  syncBar();
  snd.switchLamp(lamp.on, panOf(LAMP));
  poke();
}
// The power: on a cold start the contact flickers twice, then holds.
function power(now) {
  if (!lamp.on) return 0;
  const u = now - lamp.since;
  if (calm || u > 150) return 1;
  return u < 30 ? 1 : u < 62 ? 0 : u < 96 ? 1 : u < 120 ? 0.15 : 1;
}
function stepLamp(dt, now) {
  const p = power(now);
  // The filament heats in about 60 ms and glows on as it cools.
  const tau = p > lamp.heat ? (calm ? 0.35 : 0.06) : (calm ? 0.4 : 0.22);
  lamp.heat += (p - lamp.heat) * (1 - Math.exp(-dt / tau));
  if (Math.abs(p - lamp.heat) < 0.003) lamp.heat = p;
}
// Light from the filament: it climbs steeply with heat and turns from red to warm white.
function lampColour() {
  const h = lamp.heat;
  const k = Math.pow(h, 3.2) * 7;
  const r = 1, g = mix(0.28, 0.64, h), b = mix(0.05, 0.33, h * h);
  return [r * k, g * k, b * k];
}

/* ---------- view ---------- */
const view = { cam, gust: gust.hist, lamp: [0, 0, 0], amb: [0, 0, 0], moon: [0, 0, 0], flare: [0, 0, 0], flareCol: [1, 0.6, 0.3], lampUv: [0.5, 0.5] };
function makeView() {
  const s = strength();
  const gh = gustAtHut();
  view.sig = mix(0.004, 0.026, s);
  view.gustK = mix(2.5, 6.5, s);
  view.drift = mix(0, 0.55, sstep(0.15, 1, s));
  view.windS = st.windS;
  view.fallS = st.fallS;
  view.t = st.t;
  view.gustAll = 0;
  view.gustSpan = gustSpan();
  view.sigNow = view.sig * (1 + view.gustK * gh) * 0.8;
  view.vel = baseVel() * (1 + 0.5 * gh) * st.pace;
  view.expo = PF_SNOW.expo;
  // The storm's own light: a dim blue-grey that whitens a little in the gusts.
  const a = 1 + 0.55 * Math.min(gh, 1.2);
  view.amb[0] = 0.017 * a; view.amb[1] = 0.023 * a; view.amb[2] = 0.034 * a;
  view.moon[0] = 0.02; view.moon[1] = 0.024; view.moon[2] = 0.031;
  const L = lampColour();
  view.lamp[0] = L[0]; view.lamp[1] = L[1]; view.lamp[2] = L[2];
  view.winGlow = 0.16;
  view.expoGrade = 1.7;
  // The flare: the lamp seen through the haze.
  const pr = cam.project(LAMP);
  const vis = Math.exp(-view.sigNow * 25) * Math.pow(lamp.heat, 3);
  if (pr && vis > 0.002) {
    view.lampUv[0] = pr[0] / cssW; view.lampUv[1] = 1 - pr[1] / cssH;
    view.flare[0] = 0.5 * vis; view.flare[1] = 0.05 * vis; view.flare[2] = 0.12 * vis;
  } else { view.flare[0] = view.flare[1] = view.flare[2] = 0; }
  view.flareCol[1] = mix(0.35, 0.62, lamp.heat); view.flareCol[2] = mix(0.08, 0.3, lamp.heat);
  return view;
}
const flakeCount = () => (D.rung >= 3 ? 3000 : D.rung >= 2 ? 6000 : 11000);
function draw() {
  if (!scene) return;
  scene.frame(makeView(), { frameNo: calm ? 0 : frameNo, bloomLevels: D.rung >= 2 ? 3 : 5, flakes: flakeCount() });
}

/* ---------- step ---------- */
const SLEEP_MS = 60000;
function step(dt, now) {
  // After a minute with no input the storm eases to a stop over two seconds.
  const awake = !calm && now - st.lastInput < SLEEP_MS;
  st.pace = awake ? Math.min(1, st.pace + dt / 0.6) : Math.max(0, st.pace - dt / 2);
  const sdt = dt * st.pace;
  const storm = st.pace > 0;
  // Reduced motion: the storm stands still; a called gust still swells.
  const gdt = storm ? sdt : dt;
  st.t += gdt;
  stepGust(gdt, storm);
  pushHistory(sdt, storm);
  const gh = gustAtHut();
  st.windS += baseVel() * (1 + 0.5 * gh) * sdt;
  st.fallS += PF_SNOW.fall * sdt;
  stepLamp(dt, now);
  snd.update({ wind: strength(), gust: gh, pace: st.pace, panLamp: panOf(LAMP), panMast: panOf([MAST.x, MAST.guy, MAST.z]), dt });
}
// Lively: input, a switch in flight, a gust the hand made.
function lively() {
  const p = power(performance.now());
  return pointer.id !== null || Math.abs(p - lamp.heat) > 0 || gust.holding || gust.hold > 0 || (calm && gust.events.length > 0);
}
function drifting() { return st.pace > 0; }

/* ---------- frame loop ---------- */
function frame() {
  raf = 0;
  if (!visible || !gl || !started) return;
  const t0 = performance.now();
  const dt = Math.max(0, Math.min(1 / 20, (t0 - last) / 1000));
  last = t0;
  let again = false;
  try {
    step(dt, t0);
    draw();
    D.frame(dt);
    frameNo++;
    again = lively() || drifting();
  } finally {
    // A thrown error still leaves the loop able to wake.
    if (again) schedule(); else rest();
  }
}
function rest() { kit.rest(() => !raf && !tmo && !snd.busy); snd.idle(); }
// Lively frames run at the display rate; drifting frames at 30 fps.
function schedule() {
  if (raf || tmo || !visible || !gl || !started) return;
  if (lively()) { raf = requestAnimationFrame(frame); return; }
  const wait = Math.max(0, 31.5 - (performance.now() - last));
  tmo = setTimeout(() => { tmo = 0; if (!raf) raf = requestAnimationFrame(frame); }, wait);
}
function poke() {
  if (!raf && !tmo) last = performance.now();
  if (tmo && lively()) { clearTimeout(tmo); tmo = 0; }
  schedule();
}
function touch() { st.lastInput = performance.now(); }
function halt() { cancelAnimationFrame(raf); raf = 0; clearTimeout(tmo); tmo = 0; }
const panOf = p => { const s = cam.project(p); return s ? clamp((s[0] / cssW) * 2 - 1, -1, 1) : 0; };

/* ---------- pointer: tap switches the lamp, hold calls a gust ---------- */
const pointer = { id: null, x0: 0, y0: 0, moved: false, held: false, timer: 0 };
const local = e => { const r = stage.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
function beginHold() {
  if (pointer.held) return;
  pointer.held = true;
  gust.holding = true;
  snd.gust(strength());
  poke();
}
stage.addEventListener('pointerdown', e => {
  if (e.button !== 0 || !scene || pointer.id !== null || (e.target !== canvas && e.target !== stage)) return;
  try { stage.setPointerCapture(e.pointerId); } catch { /* capture is optional */ }
  const [x, y] = local(e);
  Object.assign(pointer, { id: e.pointerId, x0: x, y0: y, moved: false, held: false });
  touch();
  clearTimeout(pointer.timer);
  pointer.timer = setTimeout(() => { if (pointer.id !== null && !pointer.moved) beginHold(); }, 260);
  poke();
});
stage.addEventListener('pointermove', e => {
  if (e.pointerId !== pointer.id) return;
  const [x, y] = local(e);
  // A drag holds the gust too.
  if (!pointer.moved && Math.hypot(x - pointer.x0, y - pointer.y0) > 8) { pointer.moved = true; beginHold(); }
});
function endPointer(e) {
  if (e.pointerId !== pointer.id) return;
  clearTimeout(pointer.timer);
  const tap = e.type === 'pointerup' && !pointer.moved && !pointer.held;
  pointer.id = null;
  gust.holding = false;
  touch();
  if (tap) toggleLamp();
  poke();
}
['pointerup', 'pointercancel', 'lostpointercapture'].forEach(t => stage.addEventListener(t, endPointer));
// Any key or wheel wakes a sleeping storm.
stage.addEventListener('keydown', () => { touch(); poke(); });

/* ---------- life cycle ---------- */
whenVisible(stage, on => {
  visible = on;
  if (on) { last = performance.now(); schedule(); }
  else { halt(); pointer.id = null; gust.holding = false; snd.quiet(); }
});
onReducedChange(on => { calm = on; touch(); poke(); });
sound.onChange(on => { if (on) { touch(); poke(); } else snd.quiet(); });
new ResizeObserver(() => resize()).observe(stage);
ui.onCover?.(() => resize());

async function setup() {
  gl = canvas.getContext('webgl2', { antialias: false, alpha: false, depth: false, powerPreference: 'high-performance' });
  if (!gl) throw new Error('no webgl2');
  scene = await makeScene(gl);
  sizeKey = '';
}
onContextLoss(canvas, {
  lost: () => { halt(); gl = null; scene = null; },
  restored: async () => { await setup(); resize(true); poke(); },
  failed: () => fail.removeAttribute('hidden'),
});

mark('build');
try {
  await setup();
  // The first frame: the storm between gusts, the hut clear, the lamp off.
  st.t = 3.2; st.windS = 40; st.fallS = 4;
  gust.hist.fill(0.04);
  resize(true);
  draw();
  gl.finish();
  canvas.classList.add('on');
  mark('first-frame');
  await introDone;
  started = true;
  touch();
  syncBar();
  poke();
} catch (err) {
  console.error(err);
  fail.removeAttribute('hidden');
  ui.hideControls?.();
}
