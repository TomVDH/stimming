// Chemical garden: a tank of water glass. Drop a metal-salt crystal in,
// and a hollow tower grows up through the liquid in the metal's colour.
// Plan: docs/plans/chemgarden.md. Toy doc: docs/toys/chemgarden.md.
import { initPage, whenVisible, reduced, onReducedChange, linFit, onQuality, pixelRatio, audioKit, stage as mark, pageReady } from '../shared/stim.js';
import { intro as playIntro } from '../shared/intro.js';
import { Garden, TANK, SALTS, mulberry } from './garden.js';
import { createScene, PALETTE } from './scene.js';
import { gardenSound } from './sound.js';
mark('libs');
playIntro({ ready: pageReady() });

const ID = 'chemgarden';
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a, b) => a + Math.random() * (b - a);
let reduce = reduced();

/* ---------- settings ---------- */
// Settings persist per browser; storage is optional.
const saved = k => { try { return localStorage.getItem(`stimming.${ID}.${k}`); } catch { return null; } };
const save = (k, v) => { try { localStorage.setItem(`stimming.${ID}.${k}`, String(v)); } catch { /* storage is optional */ } };
const opts = {
  salt: Math.max(0, SALTS.indexOf(saved('salt'))),
  strength: (() => { const v = Number(saved('strength')); return saved('strength') != null && v >= 0 && v <= 1 ? v : 0.5; })(),
};

/* ---------- bar ---------- */
const dot = i => { const [L, C, h] = PALETTE[i].tint; return `oklch(${L} ${C} ${h})`; };
const ui = initPage({ id: ID, bar: {
  choice: {
    label: 'Salt', value: SALTS[opts.salt],
    options: [
      { value: 'copper', label: 'Copper', dot: dot(0), key: '1' },
      { value: 'cobalt', label: 'Cobalt', dot: dot(1), key: '2' },
      { value: 'nickel', label: 'Nickel', dot: dot(2), key: '3' },
      { value: 'iron', label: 'Iron', dot: dot(3), key: '4' },
    ],
    onPick: v => { opts.salt = Math.max(0, SALTS.indexOf(v)); save('salt', v); },
  },
  actions: [
    { verb: 'scatter', key: 'Space', onPress: () => scatter() },
    { verb: 'clear', key: 'C', onPress: () => clearTank() },
  ],
  slider: { label: 'Strength', min: 0, max: 1, step: 0.01, value: opts.strength, onInput: v => { opts.strength = v; save('strength', v); } },
  quality: true,
  keys: [['click', 'drop a crystal'], ['drag', 'sprinkle'], ['space', 'scatter'], ['C', 'clear']],
  // Bar v3 lists every input in How to play: one instruction per row.
  help: [
    ['click', 'Drop a crystal of the salt into the tank'],
    ['drag', 'Sprinkle a line of crystals'],
    ['space', 'Scatter a handful across the tank'],
    ['C', 'Clear the tank'],
  ],
} });

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
  if (ui.choice) ui.choice.disabled = true;
  if (ui.slider) ui.slider.disabled = true;
  for (const v of ['scatter', 'clear']) { const a = ui.action?.(v); if (a) a.disabled = true; }
  mark('first-frame');
}

/* ---------- garden ---------- */
const garden = new Garden({ budget: 6200 });
// The first garden: seven towers in mixed salts, always the same.
function firstGarden() {
  garden.towers.length = 0;
  garden.rand = mulberry(124);
  garden.strength = 0.5;
  const plan = [[-0.58, -0.08, 2], [-0.4, 0.1, 0], [-0.2, -0.12, 1], [0.02, 0.06, 0], [0.22, -0.04, 3], [0.4, 0.12, 1], [0.6, -0.1, 2], [-0.05, -0.15, 3]];
  for (const [x, z, s] of plan) garden.drop(s, x, z, { now: true });
  garden.settle();
  garden.rand = Math.random;
  garden.strength = opts.strength;
  // The garden grew long ago: no tip is fresh.
  garden.time += 30;
}

/* ---------- particles ---------- */
// Puffs of salt solution, landing dust, bubbles, the crystal's trail, crumbs.
const parts = [];
const puffCol = PALETTE.map(p => linFit(...p.puff));
const deepCol = PALETTE.map(p => linFit(...p.deep));
function emit(p) { if (parts.length < 1300) parts.push(p); }
function puff(x, y, z, salt, r, big) {
  const n = big ? 14 : 7;
  for (let i = 0; i < n; i++) {
    const a = rand(0, Math.PI * 2), sp = rand(0.01, 0.05) * (big ? 1.3 : 1);
    emit({ x, y, z, vx: Math.cos(a) * sp, vy: rand(0.04, 0.14), vz: Math.sin(a) * sp, c: puffCol[salt], a0: rand(0.18, 0.32), s0: Math.min(r * 1.6, 0.02), s1: Math.min(r * rand(4, 7), big ? 0.07 : 0.045), life: rand(1.4, 2.8), age: 0, drag: 2.2, rise: 0.02 });
  }
  // Specks of fresh solid sink back from the burst.
  for (let i = 0; i < (big ? 6 : 3); i++) {
    emit({ x, y, z, vx: rand(-0.06, 0.06), vy: rand(0.02, 0.1), vz: rand(-0.06, 0.06), c: deepCol[salt], a0: 0.9, s0: rand(0.003, 0.006), s1: 0.003, life: rand(1.5, 3), age: 0, drag: 3, rise: -0.05 });
  }
}
function dust(x, y, z) {
  for (let i = 0; i < 10; i++) {
    const a = rand(0, Math.PI * 2), sp = rand(0.03, 0.12);
    emit({ x, y: y + 0.005, z, vx: Math.cos(a) * sp, vy: rand(0.005, 0.03), vz: Math.sin(a) * sp, c: [0.5, 0.5, 0.47], a0: 0.3, s0: 0.008, s1: 0.03, life: rand(0.8, 1.5), age: 0, drag: 4, rise: -0.02 });
  }
}
function bubbles(x, z) {
  for (let i = 0; i < 5; i++) {
    emit({ x: x + rand(-0.01, 0.01), y: TANK.surface - rand(0.01, 0.05), z: z + rand(-0.01, 0.01), vx: rand(-0.01, 0.01), vy: rand(-0.12, -0.02), vz: 0, c: [1, 1, 0.96], a0: -0.9, s0: rand(0.004, 0.009), s1: 0, life: 1.6, age: 0, drag: 3, rise: 0.5, bubble: true });
  }
}
function crumbs(t) {
  for (const tb of t.tubes) {
    for (let i = 0; i < tb.pts.length; i += 4) {
      const p = tb.pts[i];
      emit({ x: p.x, y: p.y, z: p.z, vx: rand(-0.02, 0.02), vy: rand(-0.02, 0.02), vz: rand(-0.02, 0.02), c: deepCol[t.salt], a0: 0.85, s0: p.r * 2.4, s1: p.r * 1.6, life: rand(1.6, 2.6), age: -(t.delay || 0) - 0.6 * (1 - p.y / TANK.surface), drag: 1, rise: -0.35, floor: true });
    }
  }
}
// Each frame: drift, fade and grow. Under reduced motion they fade in place.
function stepParts(dt) {
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i];
    p.age += dt;
    if (p.age < 0) continue;
    if (!reduce) {
      const k = Math.exp(-p.drag * dt);
      p.vx *= k; p.vz *= k; p.vy = p.vy * k + p.rise * dt;
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      if (p.floor && p.y < TANK.bed + 0.004) { p.y = TANK.bed + 0.004; p.vy = 0; p.rise = 0; }
      if (p.bubble && p.y > TANK.surface - 0.004) p.age = p.life;
    }
    if (p.age >= p.life) parts.splice(i, 1);
  }
}
const live = [];
function drawParts() {
  live.length = 0;
  for (const p of parts) {
    if (p.age < 0) continue;
    const k = p.age / p.life, fade = (1 - k) * Math.min(1, p.age * 12);
    live.push({ x: p.x, y: p.y, z: p.z, c: p.c, a: p.a0 * fade * (p.bubble ? 1 : 1), s: lerp(p.s0, p.s1, Math.sqrt(k)) });
  }
  S.writeParticles(live);
}

/* ---------- events ---------- */
const kit = audioKit({ keys: new Set([' ', 'c', 'C', '1', '2', '3', '4']) });
const snd = gardenSound(kit);
const pan = x => clamp(x / (TANK.w / 2), -1, 1) * 0.8;
function handle(ev) {
  switch (ev.type) {
    case 'enter':
      bubbles(ev.x, ev.z);
      S.ripple(ev.x, ev.z, 0.6);
      snd.drop(pan(ev.x));
      break;
    case 'land':
      dust(ev.x, ev.y, ev.z);
      snd.land(pan(ev.x), ev.r);
      break;
    case 'pop':
      puff(ev.x, ev.y, ev.z, ev.salt, ev.r, ev.big);
      snd.pop(pan(ev.x), ev.r, ev.big);
      break;
    case 'surface':
      S.ripple(ev.x, ev.z, 0.3);
      snd.surface(pan(ev.x));
      break;
    case 'crumble': {
      const t = garden.towers.find(t => t.x === ev.x && t.z === ev.z);
      if (t) crumbs(t);
      snd.crumble(pan(ev.x), ev.delay || 0);
      break;
    }
  }
}

/* ---------- actions ---------- */
let trailT = 0;
function dropAt(x) {
  if (!ready || failed) return;
  const half = TANK.d / 2 - 0.06;
  garden.strength = opts.strength;
  garden.drop(opts.salt, x, rand(-half, half));
  poke();
}
// A handful of crystals across the part of the tank in view.
function scatter() {
  if (!ready || failed) return;
  const [a, b] = S.visibleX(), n = 5;
  for (let i = 0; i < n; i++) {
    const x = lerp(a, b, (i + rand(0.2, 0.8)) / n);
    setTimeout(() => dropAt(x), i * rand(70, 130));
  }
}
function clearTank() {
  if (!ready || failed) return;
  garden.clear();
  poke();
}

/* ---------- pointer ---------- */
// A press drops at once; a drag sprinkles a crystal per step of travel.
let pid = null, downAt = null, lastX = 0, moved = false;
const local = e => { const r = stage.getBoundingClientRect(); return [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height, r]; };
stage.addEventListener('pointerdown', e => {
  if (e.button !== 0 || !ready || (e.target !== canvas && e.target !== stage)) return;
  try { stage.setPointerCapture(e.pointerId); } catch { /* capture is optional */ }
  pid = e.pointerId;
  const [nx, ny] = local(e), h = S.pick(nx, ny);
  downAt = [e.clientX, e.clientY];
  moved = false;
  if (h) { lastX = h.x; dropAt(h.x); }
});
stage.addEventListener('pointermove', e => {
  const [nx, ny] = local(e);
  // The mouse tilts the view a little: the tank shows its depth.
  if (e.pointerType === 'mouse' && !reduce) { par.to = [nx - 0.5, ny - 0.5]; poke(); }
  if (e.pointerId !== pid) return;
  if (!moved && Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) < 8) return;
  moved = true;
  const h = S.pick(nx, ny);
  if (h && Math.abs(h.x - lastX) > 0.09) { lastX = h.x; dropAt(h.x); }
});
function release(e) {
  if (e.pointerId !== pid) return;
  pid = null;
}
['pointerup', 'pointercancel', 'lostpointercapture'].forEach(t => stage.addEventListener(t, release));
stage.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') { par.to = [0, 0]; poke(); } });

/* ---------- view ---------- */
// Pointer parallax eases toward its goal.
const par = { at: [0, 0], to: [0, 0] };
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
    const dpr = rung === 0 ? pixelRatio(w, h, { budget: 2.2e6 }) : rung === 1 ? pixelRatio(w, h, { budget: 1.4e6, maxDpr: 1, quality: 'standard' }) : 1;
    S.resize(w, h, dpr, { bloomScale: rung >= 2 ? 0.33 : 0.5, samples: rung >= 2 ? 0 : 4 });
  }
  S.frame(w, h, cover(), par.at);
}

/* ---------- loop ---------- */
let raf = 0, last = 0, visible = true, lastInput = performance.now(), rate = 1, clock = 0;
const lively = () => garden.busy || parts.length > 0 || Math.abs(par.at[0] - par.to[0]) + Math.abs(par.at[1] - par.to[1]) > 1e-3;
function frame(now) {
  raf = 0;
  const dt = last ? clamp((now - last) / 1000, 0, 1 / 20) : 1 / 60;
  last = now;
  let more = false;
  try { more = step(dt, now); render(); }
  finally {
    if (visible && more && !failed) raf = requestAnimationFrame(frame);
    else { snd.hush(); kit.rest(() => !raf); }
  }
}
function wake() { if (visible && ready && !raf && !failed) { last = 0; raf = requestAnimationFrame(frame); } }
// Any input wakes the loop and resets the sleep clock.
function poke() { lastInput = performance.now(); rate = 1; wake(); }
function step(dt, now) {
  // A minute after the last input, all motion eases to a stop over 2 s.
  const idle = (now - lastInput) / 1000;
  rate = clamp(1 - (idle - 60) / 2);
  dt *= rate;
  clock += dt;
  garden.calm = reduce;
  garden.strength = opts.strength;
  garden.step(dt);
  for (const ev of garden.events) handle(ev);
  garden.events.length = 0;
  // A falling crystal leaves a faint streak of dissolved salt.
  trailT += dt;
  if (trailT > 0.035) {
    trailT = 0;
    for (const t of garden.towers) if (t.phase === 'fall') emit({ x: t.x, y: t.y + t.seedR, z: t.z, vx: 0, vy: 0.004, vz: 0, c: puffCol[t.salt], a0: 0.12, s0: t.seedR * 1.2, s1: t.seedR * 2.6, life: rand(1.6, 2.4), age: 0, drag: 1, rise: 0 });
  }
  stepParts(dt);
  // The view eases toward the pointer.
  const k = 1 - Math.exp(-dt * 4);
  par.at[0] = lerp(par.at[0], par.to[0], k);
  par.at[1] = lerp(par.at[1], par.to[1], k);
  S.frame(css.w, css.h, cover(), par.at);
  let sx = 0, sn = 0;
  for (const t of garden.towers) if (t.phase !== 'done') { sx += t.x; sn++; }
  snd.tick(dt, garden.rate || 0, sn ? pan(sx / sn) : 0);
  if (lively()) watchdog(dt / Math.max(rate, 1e-3));
  return rate > 0 && lively();
}
function render() {
  S.writeTowers(garden);
  drawParts();
  S.render(garden.time, reduce ? 0 : clock % 100);
}

/* ---------- performance ---------- */
// Slow frames step quality down one rung; it never steps back up.
// Rungs: pixel ratio 1, then smaller bloom and no multisampling.
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
onReducedChange(v => { reduce = v; if (v) par.to = [0, 0]; wake(); });
async function start() {
  const probe = document.createElement('canvas').getContext('webgl2');
  if (!probe) return fail();
  mark('build');
  try {
    S = createScene(canvas, { onLost: () => { failed = true; if (raf) cancelAnimationFrame(raf); raf = 0; } });
    firstGarden();
    fit(true);
    S.writeTowers(garden);
    drawParts();
    await S.warm();
    render();
  } catch (err) { return fail(err); }
  ready = true;
  // ?qa hands the scene and the garden to a test script.
  if (new URLSearchParams(location.search).has('qa')) Object.assign(globalThis, { __cg: { S, garden } });
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
}
start();
