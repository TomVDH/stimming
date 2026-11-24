// Solar loop: a star's edge at a vast scale, graded like film.
// Loops rise and drain; giant prominences stand over the limb.
// A tap flares a region or lifts a prominence off; a drag turns the sun.
// Plan: docs/plans/solarloop.md. Toy doc: docs/toys/solarloop.md.
import { initPage, whenVisible, pageReady, stage as mark, reduced, onReducedChange, audioKit, sound } from '../shared/stim.js';
import { intro as playIntro } from '../shared/intro.js';
import { onContextLoss } from '../shared/gl.js';
import { detail } from '../shared/detail.js';
import { R, SPIN_UP, STARS, NR, promPhase, bodySize, BODIES, magAxis, SPIN, SPIN_PERIOD, makeSun, strands, startFlare, stepFlares, flareView, flareCurve, ARCADE, startEruption, stepProms, promApex } from './sun.js';
import { makeRender } from './render.js';
import { makeSound } from './sound.js';
import { HOLD, CUE, RARE, EGGS, makeCarrington, carrington, CARR_STORM, CARR_END, makeDimming, dimming, DIM_END, SOUTH, makeVoice, stepVoice } from './eggs.js';
mark('libs');

const ID = 'solarloop';
const stage = document.getElementById('stage');
const fail = stage.querySelector('.fail');
const store = {
  get(k) { try { return localStorage.getItem(`stimming.${ID}.${k}`); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(`stimming.${ID}.${k}`, String(v)); } catch { /* private mode */ } },
};
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

/* ---------- state ---------- */
const savedStar = store.get('star');
const savedAct = Number(store.get('activity'));
const st = {
  star: STARS[savedStar] ? savedStar : 'sun',
  activity: savedAct >= 0 && savedAct <= 100 && store.get('activity') !== null ? savedAct : 60,
  // The ambient clock: it runs while the toy drifts and stops asleep.
  time: 34,
  pitch: 0, yaw: 0,
  // The pulsar's own clock: a voice egg runs it faster.
  spin: 34,
  next: 0,
};
const sun = makeSun();
// The fluid probe (spike stimming-8gez): Fire's fluid as the haze round a prominence, only with ?fluid.
const FLUID = new URLSearchParams(location.search).has('fluid');
// The fluid's run: its clock and the prominence it lives on, or null.
let fluidRun = null;
function startFluid(p) {
  fluidRun = { t: 0, dt: 0, owner: p, first: true, mode: cam.mode };
}
// The prominence nearest the middle of the stage that stands in view.
function promInView() {
  let best = null, bd = Infinity;
  for (const p of sun.proms) {
    const v = toView(p.c.map(x => x * (R + p.h * 0.5)));
    const [x, y] = toCss(v);
    if (x < 0 || x > cssW || y < 0 || y > cssH) continue;
    const d = Math.hypot(x - cssW / 2, y - cssH / 2);
    if (d < bd) { bd = d; best = p; }
  }
  return best;
}

let gl = null, ren = null, raf = 0, timer = 0, visible = true, last = 0, frameNo = 0, calm = reduced();
let cssW = 1, cssH = 1, started = false, lastInput = 0, drifting = 1;

/* ---------- the view: a telescope, so an orthographic projection ---------- */
const view = { cx: 0, cy: R, hw: 280, hh: 175, W: 1, H: 1, asp: 1.6 };
// Three framings: the long lens on the bottom left limb, the wide dome, the full star.
const VIEWS = ['long', 'wide', 'full'];
const fit = { long: { cx: 0, cy: 0, hw: 280, psi: 0 }, wide: { cx: 0, cy: R, hw: 520 }, full: { cx: 0, cy: 0, hw: 1100 } };
// The long lens is the default (Tom, 2026-11-23).
const saved = store.get('lens');
// cam eases from one framing to the next; t runs from 0 to 1.
const cam = { mode: VIEWS.includes(saved) ? saved : 'long', from: '', t: 1 };
cam.from = cam.mode;
const ease = t => t * t * (3 - 2 * t);
// How much of a framing is in the current view, from 0 to 1.
const weight = name => { const k = ease(cam.t); return (cam.from === name ? 1 - k : 0) + (cam.mode === name ? k : 0); };
function fitView(w, h, top = 0, bottom = 0) {
  const asp = w / h;
  const narrow = asp < 0.8;
  view.asp = asp;
  // Wide enough that the limb reads as a dome and the prominences tower.
  const hw = narrow ? 260 : asp < 1.2 ? 380 : 520;
  const hh = hw / asp;
  const free = Math.max(0.4 * h, h - top - bottom);
  // The limb stands about a quarter of the way up the free part of the stage.
  const yb = bottom + (narrow ? 0.3 : 0.26) * free;
  fit.wide = { cx: 0, cy: R + hh - yb * 2 * hh / h, hw };
  // The long lens: the star fills the frame; its bottom left limb cuts off the corner.
  // The arc runs from the foot's middle to the left side's middle; space fills the corner.
  const hwL = narrow ? 150 : asp < 1.2 ? 210 : 280;
  const hhL = hwL / asp;
  // On a tall phone the corner cut is too steep; a fixed angle keeps the arc low.
  const psi = -Math.PI + (narrow ? 0.6 : Math.atan2(hhL, hwL));
  const nx = Math.sin(psi), ny = Math.cos(psi);
  const d = 0.5 * (hwL * -nx + hhL * -ny);
  fit.long = { cx: (R - d) * nx, cy: (R - d) * ny - (bottom - top) * hhL / h, hw: hwL, psi };
  // The full star: the whole disk, its prominences and some sky round it.
  const free2 = Math.max(0.4 * h, h - top - bottom);
  // Pulled back, so the corona has room to stretch out.
  const hhF = narrow ? 1.45 * R / asp : 1.6 * R * h / free2;
  const hwF = hhF * asp;
  fullBase = { cx: 0, cy: -(bottom - top) * hhF / h, hw: hwF };
  fitFull();
}
// The full view zooms out up to 16 times farther: wheel, pinch, or the - and = keys.
const ZOOM_MAX = 16;
let fullBase = { cx: 0, cy: 0, hw: 1100 }, zoom = 1;
function fitFull() {
  fit.full = { cx: fullBase.cx * zoom, cy: fullBase.cy * zoom, hw: fullBase.hw * zoom };
  applyView();
}
function zoomBy(k) {
  if (cam.mode !== 'full') return;
  const z = clamp(zoom * k, 1, ZOOM_MAX);
  if (z === zoom) return;
  zoom = z;
  fitFull();
  poke();
}
// Eases between the framings; the width moves on a log scale, as a zoom does.
function applyView() {
  const k = ease(cam.t);
  const a = fit[cam.from], b = fit[cam.mode];
  view.cx = a.cx + (b.cx - a.cx) * k;
  view.cy = a.cy + (b.cy - a.cy) * k;
  view.hw = Math.exp(Math.log(a.hw) + (Math.log(b.hw) - Math.log(a.hw)) * k);
  view.hh = view.hw / view.asp;
  // An oblate star: the view stretches its equator across the screen.
  const ob = 1 + STARS[st.star].oblate;
  view.cx /= ob; view.hw /= ob;
  setRot();
}
// L steps through the framings: long lens, wide dome, full star.
function toggleLens() {
  // A step during a zoom starts from wherever the view now stands.
  if (cam.t < 1) { cam.from = cam.t < 0.5 ? cam.from : cam.mode; }
  else cam.from = cam.mode;
  cam.mode = VIEWS[(VIEWS.indexOf(cam.mode) + 1) % VIEWS.length];
  cam.t = !started || calm ? 1 : 0;
  store.set('lens', cam.mode);
  applyView();
  poke();
}
// Rotation, star frame to view frame: a pitch about x after a yaw about y.
let M = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
function setRot() {
  const cp = Math.cos(st.pitch), sp = Math.sin(st.pitch), cy = Math.cos(st.yaw), sy = Math.sin(st.yaw);
  const rx = [[1, 0, 0], [0, cp, -sp], [0, sp, cp]];
  const ry = [[cy, 0, sy], [0, 1, 0], [-sy, 0, cy]];
  const T = rx.map(row => [0, 1, 2].map(c => row[0] * ry[0][c] + row[1] * ry[1][c] + row[2] * ry[2][c]));
  // The star turns on its own axis at its true rate, sped up.
  const B = STARS[st.star];
  const S = B.day ? axisTurn(B.grav, 2 * Math.PI * ((st.time * SPIN_UP / (B.day * 86400)) % 1)) : null;
  M = S ? T.map(row => [0, 1, 2].map(c => row[0] * S[0][c] + row[1] * S[1][c] + row[2] * S[2][c])) : T;
}
// A turn by angle a about the axis u (Rodrigues).
function axisTurn(u, a) {
  const l = Math.hypot(u[0], u[1], u[2]), x = u[0] / l, y = u[1] / l, z = u[2] / l;
  const c = Math.cos(a), s = Math.sin(a), t = 1 - c;
  return [[t * x * x + c, t * x * y - s * z, t * x * z + s * y],
    [t * x * y + s * z, t * y * y + c, t * y * z - s * x],
    [t * x * z - s * y, t * y * z + s * x, t * z * z + c]];
}
const toView = p => [0, 1, 2].map(r => M[r][0] * p[0] + M[r][1] * p[1] + M[r][2] * p[2]);
// A view point to stage CSS pixels, y down.
const toCss = v => [((v[0] - view.cx) / view.hw * 0.5 + 0.5) * cssW, (0.5 - (v[1] - view.cy) / view.hh * 0.5) * cssH];
// The sun hides a point behind it.
const hidden = v => Math.hypot(v[0], v[1]) < R && v[2] < 0;
// The point a region shows: its centre on the near side, its loop tops behind the limb.
function regionPoint(rg) {
  const c = toView(rg.c.map(x => x * R));
  if (!hidden(c)) return { v: c, front: true };
  return { v: toView(rg.c.map(x => x * (R + rg.span[1] * 0.9))), front: false };
}

if (new URLSearchParams(location.search).has('qa')) globalThis.__solar = { st, sun, view, cam, toggleLens, flare: i => flareAt(sun.regions[i ?? 0]), erupt: i => eruptAt(sun.proms[i ?? 0]), get loop() { return { raf, timer, drifting } }, get egg() { return egg; } };

/* ---------- dev: post effect knobs, 1 is the house default ---------- */
// id, group, label, min, max, default.
const FX = [
  ['fxExpo', 'Post', 'Exposure', 0.3, 2, 1],
  ['fxBloom', 'Post', 'Bloom', 0, 3, 1],
  ['fxRays', 'Post', 'Light rays', 0, 3, 1],
  ['fxHal', 'Post', 'Halation', 0, 3, 1],
  ['fxSplit', 'Post', 'Colour split', 0, 4, 1],
  ['fxShimmer', 'Post', 'Heat shimmer', 0, 4, 1],
  ['fxStreak', 'Post', 'Flare streak and ghosts', 0, 3, 1],
  ['fxDirt', 'Post', 'Lens dirt', 0, 4, 1],
  ['fxRoll', 'Post', 'Highlight roll-off', 0, 2, 1],
  ['fxVig', 'Post', 'Vignette', 0, 2, 1],
  ['fxGrain', 'Post', 'Grain', 0, 5, 1],
  ['fxVol', 'Volume', 'Haze density', 0, 4, 1],
  ['fxVolLight', 'Volume', 'Haze light', 0, 4, 1],
  ['fxCorona', 'Volume', 'Corona (full view)', 0, 4, 1],
  ['fxBend', 'Volume', 'Corona bend', 0, 3, 1],
];
// A knob's value: its Dev row, else the default.
const fxv = id => { const d = FX.find(f => f[0] === id)[5]; return ui?.setting?.(id)?.value ?? d; };

/* ---------- bar ---------- */
const ui = initPage({ id: ID, bar: {
  choice: {
    label: 'Star',
    value: st.star,
    // The pick sheet groups them: main sequence by class, brown dwarfs, life stages.
    options: [
      { value: 'zetaoph', label: 'Zeta Ophiuchi · O', dot: 'oklch(0.7 0.16 275)', key: '1', group: 'Main sequence' },
      { value: 'regulus', label: 'Regulus · B', dot: 'oklch(0.82 0.09 245)', key: '2', group: 'Main sequence' },
      { value: 'vega', label: 'Vega · A', dot: 'oklch(0.94 0.02 250)', key: '3', group: 'Main sequence' },
      { value: 'sirius', label: 'Sirius · A', dot: 'oklch(0.9 0.04 250)', key: '4', group: 'Main sequence' },
      { value: 'procyon', label: 'Procyon · F', dot: 'oklch(0.9 0.07 90)', key: '5', group: 'Main sequence' },
      { value: 'sun', label: 'Sun · G', dot: 'oklch(0.82 0.15 80)', key: '6', group: 'Main sequence' },
      { value: 'epseri', label: 'Epsilon Eridani · K', dot: 'oklch(0.7 0.17 50)', key: '7', group: 'Main sequence' },
      { value: 'proxima', label: 'Proxima · M', dot: 'oklch(0.62 0.19 35)', key: '8', group: 'Main sequence' },
      { value: 'luhman', label: 'Luhman 16 · L/T', dot: 'oklch(0.5 0.12 10)', key: '9', group: 'Brown dwarfs' },
      { value: 'wise', label: 'WISE 0855 · Y', dot: 'oklch(0.4 0.04 10)', key: '0', group: 'Brown dwarfs' },
      { value: 'ttauri', label: 'T Tauri · protostar', dot: 'oklch(0.72 0.15 60)', group: 'Life stages' },
      { value: 'arcturus', label: 'Arcturus · red giant', dot: 'oklch(0.7 0.15 50)', group: 'Life stages' },
      { value: 'rigel', label: 'Rigel · supergiant', dot: 'oklch(0.8 0.1 240)', group: 'Life stages' },
      { value: 'betelgeuse', label: 'Betelgeuse · supergiant', dot: 'oklch(0.68 0.18 45)', group: 'Life stages' },
      { value: 'vycma', label: 'VY CMa · hypergiant', dot: 'oklch(0.5 0.17 28)', group: 'Life stages' },
      { value: 'siriusb', label: 'Sirius B · white dwarf', dot: 'oklch(0.88 0.06 210)', group: 'Life stages' },
      { value: 'neutron', label: 'Pulsar · neutron star', dot: 'oklch(0.72 0.15 270)', group: 'Life stages' },
    ],
    onPick: v => { if (!STARS[v]) return; st.star = v; egg = null; store.set('star', v); applyView(); poke(); },
  },
  actions: [
    { verb: 'flare', key: 'Space', onPress: () => flareNext() },
    { verb: 'lens', label: 'Lens', key: 'L', onPress: () => toggleLens() },
  ],
  slider: { label: 'Activity', min: 0, max: 100, step: 1, value: st.activity, onInput: v => { st.activity = v; store.set('activity', v); poke(); } },
  quality: true,
  // Tuning for the people who build the toy; the Dev button shows with ?dev.
  dev: [
    ...FX.map(([id, group, label, min, max, value]) => ({ type: 'slider', id, group, label, min, max, step: 0.05, value, persist: true, onInput: () => poke() })),
    { type: 'button', id: 'fxReset', group: 'Post', label: 'Defaults', text: 'Reset', onClick: () => { for (const [id, , , , , d] of FX) ui.setting?.(id)?.set(d, true); poke(); } },
  ],
  keys: [['click', 'flare'], ['drag', 'turn'], ['L', 'long, wide or full view']],
  help: [
    ['click', 'Tap a region to flare it, or a prominence to lift it off'],
    ['drag', 'Drag to turn the star (the long lens holds still)'],
    ['L', 'Step through the long lens, the wide view and the full star'],
  ],
} });
const introDone = playIntro({ ready: pageReady() });
const kit = audioKit({ keys: new Set([' ']), sleepMs: 3000 });
const snd = makeSound(kit);

/* ---------- GL ---------- */
const canvas = document.createElement('canvas');
canvas.setAttribute('aria-hidden', 'true');
stage.prepend(canvas);
const D = detail({ maxDpr: 2, budget: 2.6e6, steps: 2, settle: 2, onChange: () => resize(true) });

let sizeKey = '';
function resize(force = false) {
  if (!gl || !ren) return;
  const r = stage.getBoundingClientRect();
  cssW = Math.max(1, r.width); cssH = Math.max(1, r.height);
  const dpr = D.dpr(cssW, cssH);
  const c = ui.cover?.() || { top: 0, bottom: 0 };
  const key = [cssW, cssH, dpr, c.top || 0, c.bottom || 0, D.rung].map(v => Math.round(v * 100)).join();
  if (!force && key === sizeKey) return;
  sizeKey = key;
  view.W = Math.round(cssW * dpr); view.H = Math.round(cssH * dpr);
  ren.resize(view.W, view.H, D.rung >= 1 ? 2 : 1);
  fitView(cssW, cssH, c.top || 0, c.bottom || 0);
  draw();
}

/* ---------- acts ---------- */
function flareAt(rg) {
  if (!rg) return;
  const fl = startFlare(sun, rg, st.time, calm ? 0.7 : 1);
  const p = regionPoint(rg);
  snd.flare(clamp(toCss(p.v)[0] / cssW * 2 - 1, -1, 1), st.star, fl.k);
  fl.snapped = 0;
  poke();
}
// Space flares each region in view in turn.
function flareNext() {
  const seen = sun.regions.filter(rg => {
    const [x, y] = toCss(regionPoint(rg).v);
    return x > 0 && x < cssW && y > 0 && y < cssH;
  });
  const list = seen.length ? seen : sun.regions;
  for (let i = 0; i < list.length; i++) {
    const rg = list[(st.next + i) % list.length];
    if (sun.flares.some(f => f.rg === rg && f.t < 12)) continue;
    st.next = (st.next + i + 1) % list.length;
    flareAt(rg);
    return;
  }
}
// A tap on a giant prominence lifts it off into space.
function eruptAt(p) {
  if (!p || p.erupt >= 0) return;
  startEruption(p);
  if (FLUID && fluidRun?.owner !== p) startFluid(p);
  snd.rise(clamp(toCss(toView(promApex(p)))[0] / cssW * 2 - 1, -1, 1), st.star, calm ? 0.7 : 1);
  poke();
}
function flareNear(x, y) {
  let best = null, bd = Infinity, prom = false;
  for (const rg of sun.regions) {
    const [px, py] = toCss(regionPoint(rg).v);
    const d = Math.hypot(px - x, py - y);
    if (d < bd) { bd = d; best = rg; prom = false; }
  }
  for (const p of sun.proms) {
    const v = toView(promApex(p));
    if (hidden(v) || p.erupt >= 0) continue;
    const [px, py] = toCss(v);
    // A prominence is large: it wins a tap anywhere near its body.
    const d = Math.hypot(px - x, py - y) * 0.6;
    if (d < bd) { bd = d; best = p; prom = true; }
  }
  if (prom) eruptAt(best); else flareAt(best);
}

/* ---------- eggs: a long hold on a star plays its real famous event ---------- */
// The egg in play, or null. Its clock t reaches 0 at the end of the hold.
let egg = null;
// A view point under the stage point x, y, as a unit vector in the star's frame.
function surfaceAt(x, y) {
  let vx = view.cx + (x / cssW * 2 - 1) * view.hw, vy = view.cy + (1 - y / cssH * 2) * view.hh;
  // A point off the disk moves in onto it.
  const r = Math.hypot(vx, vy), lim = 0.9 * R;
  if (r > lim) { vx *= lim / r; vy *= lim / r; }
  const v = [vx, vy, Math.sqrt(Math.max(0, R * R - vx * vx - vy * vy))];
  return [0, 1, 2].map(c => (M[0][c] * v[0] + M[1][c] * v[1] + M[2][c] * v[2]) / R);
}
function startEgg(x, y) {
  const kind = EGGS[st.star];
  // The star turns during the hold: the flash lands under the finger.
  const now = st.time;
  st.time += HOLD - CUE;
  setRot();
  const c = surfaceAt(x, y);
  st.time = now;
  setRot();
  if (kind === 'carrington') egg = makeCarrington(c);
  else if (kind === 'dimming') egg = makeDimming();
  else if (kind === 'voice') egg = makeVoice();
  return !!egg;
}
// One step of the egg's clock; a hold let go early runs it back out.
function stepEgg(dt, holding) {
  if (!egg) return;
  if (egg.kind === 'voice') {
    egg.t += dt;
    // Reduced motion: the spin rises only four times.
    stepVoice(egg, dt, holding, SPIN_PERIOD, calm ? 4 : Infinity);
    if (egg.done) egg = null;
    return;
  }
  if (egg.t < 0 && !holding && !egg.rare) {
    egg.t -= dt * 2;
    if (egg.t <= CUE - HOLD) egg = null;
    return;
  }
  egg.t += dt;
  if (egg.kind === 'carrington') {
    if (egg.t >= 0 && !egg.fired) {
      egg.fired = true;
      const fl = startFlare(sun, egg.rg, st.time, calm ? 1.1 : 1.6);
      fl.snapped = 0;
      snd.flare(clamp(toCss(toView(egg.rg.c.map(x => x * R)))[0] / cssW * 2 - 1, -1, 1), st.star, 1);
    }
    // The storm reaches the earth: its telegraph lines spark.
    if (egg.t >= CARR_STORM && !egg.storm) { egg.storm = true; snd.telegraph(); }
    if (egg.t >= CARR_END) egg = null;
  } else if (egg.kind === 'dimming') {
    if (egg.t >= 0 && !egg.fired) { egg.fired = true; snd.dim(st.star); }
    if (egg.t >= DIM_END) egg = null;
  }
}
// The egg's uniforms. Carrington: two spots, two kernels, each a view point and a weight.
// The dimming: south in the view frame and the veil, then the cool patch.
function eggFrame(out, dim) {
  out.fill(0); dim.fill(0);
  if (egg?.kind === 'carrington') {
    const c = carrington(egg);
    [...c.spots, ...c.kernels].forEach(([p, w], k) => out.set([...toView(p), calm ? w * 0.7 : w], k * 4));
  } else if (egg?.kind === 'dimming') {
    const d = dimming(egg);
    dim.set([...toView(SOUTH), d.veil, d.cool, 0, 0, 0]);
  }
}

/* ---------- frame state for the renderer ---------- */
const frameState = {
  view: new Float32Array(4), rot: new Float32Array(9), toSun: new Float32Array(9),
  regs: new Float32Array(4 * NR), fl: new Float32Array(8), flW: new Float32Array(8), flB: new Float32Array(8),
  sat: new Float32Array(8), time: 0, band: null, count: 0, data: null, bloomLevels: 5, frameNo: 0, sc: 1,
  centre: new Float32Array(2), bodyA: new Float32Array(4), bodyB: new Float32Array(4), bodyK: new Float32Array(2), shimmer: 0, lens: 0,
  beam: new Float32Array(4), spin: new Float32Array(4), yso: new Float32Array(4), cam: new Float32Array(4), film: new Float32Array(4), volDens: 1, volLight: 0.4, full: 0, corona: 0, bend: 1,
  fx1: new Float32Array(4), fx2: new Float32Array(4), fx3: new Float32Array(4),
  egg: new Float32Array(16), dim: new Float32Array(8),
};
function makeFrame() {
  const f = frameState;
  f.view.set([view.cx, view.cy, view.hw, view.hh]);
  setRot();
  // Column-major: the rot columns are M's columns; toSun is M transposed.
  f.rot.set([M[0][0], M[1][0], M[2][0], M[0][1], M[1][1], M[2][1], M[0][2], M[1][2], M[2][2]]);
  f.toSun.set([M[0][0], M[0][1], M[0][2], M[1][0], M[1][1], M[1][2], M[2][0], M[2][1], M[2][2]]);
  const act = st.activity / 100;
  sun.regions.forEach((rg, k) => {
    const fl = sun.flares.find(q => q.rg === rg);
    const boost = fl ? 1 + 1.2 * Math.exp(-fl.t / 6) : 1;
    f.regs.set([...toView(rg.c), (0.45 + 0.75 * act) * boost], k * 4);
  });
  f.fl.fill(0); f.flW.fill(0); f.flB.fill(0); f.sat.fill(0);
  sun.flares.forEach((fl, k) => {
    const fv = flareView(fl, st.star);
    f.fl.set([...toView(fv.c), 0], k * 4);
    f.flW.set([fv.wave[0], fv.wave[1], 0, 0], k * 4);
    f.flB.set([fv.bubble[0], fv.bubble[1], fv.bubble[2], 0], k * 4);
    // The saturated core shows where the kernel is in view; behind the limb, the arcade top shines.
    let v = toView(fv.c.map(x => x * (R + fv.kernel[0])));
    let S = fv.kernel[1];
    if (hidden(v)) { v = toView(fv.c.map(x => x * (R + fl.rg.span[1] * 0.8))); S *= hidden(v) ? 0 : 0.45; }
    const sx = ((v[0] - view.cx) / view.hw * 0.5 + 0.5) * view.W;
    const sy = ((v[1] - view.cy) / view.hh * 0.5 + 0.5) * view.H;
    f.sat.set([sx, sy, calm ? S * 0.6 : S, 0], k * 4);
  });
  f.time = st.time;
  const star = STARS[st.star];
  f.band = star;
  f.count = strands(sun, st.time, { star: st.star, activity: act, spin: st.spin }, ren.data);
  f.data = ren.data;
  f.bloomLevels = D.rung >= 2 ? 3 : 5;
  f.frameNo = calm ? 0 : frameNo;
  f.sc = Math.max(1, view.H / 900);
  // The sun's centre on the screen, in 0 to 1: the light rays aim at it.
  f.centre.set([0.5 - view.cx / view.hw * 0.5, 0.5 - view.cy / view.hh * 0.5]);
  // Mercury at true size, in transit on the long lens; nothing beside the limb.
  const ppm = view.H / (2 * view.hh);
  const px = (x, y) => [((x - view.cx) / view.hw * 0.5 + 0.5) * view.W, ((y - view.cy) / view.hh * 0.5 + 0.5) * view.H];
  const w = fit.wide, wh = w.hw / view.asp;
  const rA = bodySize(star, star.wide) * 0.5;
  let ex = w.cx + w.hw * 0.42, ey = R + (w.cy + wh - R) * 0.24;
  // A body too big for the sky hangs in the top right corner, cut by the frame.
  if (rA > 0.12 * wh) { ex = w.cx + w.hw * 0.72 + rA * 0.45; ey = w.cy + wh * 0.5 + rA * 0.35; }
  const [ax, ay] = px(ex, ey);
  f.bodyA.set([ax, ay, rA * ppm, star.wide === 'none' ? 0 : 1 - weight('long')]);
  const L = fit.long, lh = L.hw / view.asp;
  const tx = Math.cos(L.psi), ty = -Math.sin(L.psi);
  // The transit runs along a chord across the disk, over about five minutes.
  const span = 2.4 * Math.hypot(L.hw, lh);
  const s0 = ((st.time * 1.5 + span * 0.5) % span) - span / 2;
  const depth = R - 0.5 * (L.hw * -Math.sin(L.psi) + lh * -Math.cos(L.psi)) - 0.45 * lh;
  // It climbs away from the foot of the frame.
  const bx = depth * Math.sin(L.psi) - tx * s0, by = depth * Math.cos(L.psi) - ty * s0;
  const [qx, qy] = px(bx, by);
  const on = star.long === 'none' ? 0 : Math.min(1, Math.max(0, (R - Math.hypot(bx, by)) / 6));
  // The transit shows on the long lens and on the full star.
  f.bodyB.set([qx, qy, bodySize(star, star.long) * 0.5 * ppm, (1 - weight('wide')) * on]);
  f.bodyK.set([BODIES[star.wide].kind, BODIES[star.long].kind]);
  // The pulsar's magnetic axis, in the view frame.
  if (star.beam) f.beam.set([...toView(magAxis(st.spin)), star.beam]); else f.beam.fill(0);
  // The spin axis carries the wind nebula's torus and jets.
  if (star.beam) f.spin.set([...toView(SPIN), star.beam]); else f.spin.fill(0);
  // A young star's disk and jets turn with the star.
  const ya = Math.hypot(star.yso[0], star.yso[1], star.yso[2]);
  f.yso.set([...toView(star.yso.slice(0, 3).map(x => x / ya)), star.yso[3]]);
  // The haze layers slide with the pan; gravity bends light round a neutron star.
  f.cam.set([st.yaw, st.pitch, star.lensing, 0]);
  // Film: fine grain, no weave, faint lens dirt, no flicker: a vista, not a feed.
  // w: the star's dust, which keeps the haze over its disk.
  f.film.set([0.018, 0, 0.35, star.dust]);
  // The volume: denser on the long lens and round the dusty giants; lit by the star.
  f.volDens = (1.3 + 0.6 * weight('long')) * (1 + 0.3 * star.dust) * fxv('fxVol');
  f.volLight = 1.3 * star.disk[0] / (1 + star.dust) * fxv('fxVolLight');
  // The 3D corona shows in the full view; its light follows the star's own corona.
  f.corona = weight('full') * fxv('fxCorona') * star.disk[3] * 6;
  f.bend = fxv('fxBend');
  f.fx1.set([fxv('fxBloom'), fxv('fxRays'), fxv('fxSplit'), fxv('fxHal')]);
  f.fx2.set([fxv('fxStreak'), fxv('fxDirt'), fxv('fxRoll'), fxv('fxVig')]);
  f.fx3.set([fxv('fxGrain'), fxv('fxExpo'), fxv('fxShimmer'), 0]);
  eggFrame(f.egg, f.dim);
  f.fluid = fluidRun ? fluidFrame(fluidRun) : null;
  f.lens = weight('long');
  f.full = weight('full');
  f.shimmer = calm ? 0 : 2.2 * view.W / cssW;
  return f;
}
function draw() {
  if (!ren) return;
  ren.frame(makeFrame());
}

// The fluid's step and draw for this frame: the box stands under the prominence, radial up.
// Its guide follows the prominence's own size, growing as the threads do in an eruption.
function fluidFrame(r) {
  const p = r.owner;
  const { c, e, f: g } = p;
  const t = r.t;
  const ph = promPhase(p);
  const lifting = p.erupt >= 0 && p.erupt < 17;
  const guide = new Float32Array([p.type === 'arch' ? 1 : 2, p.len / 2, p.h * (1 + ph.grow), 28]);
  const out = {
    step: { dt: r.dt, t, reset: r.first, warm: r.first ? 150 : 0, emit: ph.fade, lift: lifting ? 6 + 10 * p.erupt : 0, guide },
    view: frameState.view, toSun: frameState.toSun,
    box: new Float32Array([...e, ...c, ...g]),
    boxT: new Float32Array([e[0], c[0], g[0], e[1], c[1], g[1], e[2], c[2], g[2]]),
    origin: new Float32Array(c.map(x => x * R)),
    gain: 0.024 * STARS[st.star].prom,
  };
  r.first = false;
  r.dt = 0;
  return out;
}

/* ---------- frame loop ---------- */
// Lively while a flare runs or a drag turns the sun; drifting at 30 fps; asleep after 60 s.
function frame(now) {
  raf = 0;
  if (!visible || !gl || !started) return;
  const t0 = performance.now();
  const dt = Math.max(0, Math.min(1 / 15, (now - last) / 1000));
  last = Math.max(last, now);
  let again = true, lively = true;
  try {
    const idleFor = (t0 - lastInput) / 1000;
    drifting = calm ? 0 : idleFor > 60 ? Math.max(0, 1 - (idleFor - 60) / 2) : 1;
    st.time += dt * drifting;
    st.spin += dt * (egg?.kind === 'voice' ? egg.rate : drifting);
    // The lens zooms over about two seconds.
    const zooming = cam.t < 1;
    if (zooming) {
      cam.t = Math.min(1, cam.t + dt / 2);
      if (cam.t >= 1) cam.from = cam.mode;
      applyView();
    }
    stepFlares(sun, dt * (calm ? 0.8 : 1));
    stepProms(sun, dt * (calm ? 0.8 : 1));
    if (FLUID) {
      // A new framing may show another prominence: the fluid moves to it.
      if (!fluidRun || fluidRun.mode !== cam.mode) { const p = promInView(); if (p) startFluid(p); }
      if (fluidRun) {
        fluidRun.dt = Math.min(dt, 1 / 30) * (calm ? 0.8 : 1) * Math.max(drifting, fluidRun.owner.erupt >= 0 ? 1 : 0);
        fluidRun.t += fluidRun.dt;
      }
    }
    for (const fl of sun.flares) cueArcade(fl);
    // A still press past the cue starts the star's egg under it.
    const holding = pointer.id !== null && !pointer.drag;
    if (holding && !egg && !pointer.egg && (t0 - pointer.t0) / 1000 >= CUE && startEgg(pointer.x0, pointer.y0)) pointer.egg = true;
    // Now and then an egg comes on its own, near the middle of the view.
    if (!egg && !calm && drifting > 0 && EGGS[st.star] && Math.random() < dt / RARE) {
      if (startEgg(cssW * (0.3 + 0.4 * Math.random()), cssH * (0.3 + 0.4 * Math.random()))) egg.rare = true;
    }
    stepEgg(dt, holding && pointer.egg);
    draw();
    D.frame(dt);
    frameNo++;
    lively = zooming || !!egg || holding || sun.flares.length > 0 || sun.proms.some(p => p.erupt >= 0) || pointer.drag;
    if (drifting > 0) snd.hum(st.star);
    if (STARS[st.star].beam && (drifting > 0 || egg?.kind === 'voice')) pulse();
    again = lively || drifting > 0;
  } finally {
    // A thrown error still leaves the loop able to wake.
    if (again) schedule(lively ? 0 : t0 + 33 - performance.now()); else rest();
  }
}
// A pulsar ticks as each beam sweeps past the eye.
let lastFace = 0, lastTurn = 0;
// The point in a turn where the beam faces the eye.
const FACE = (() => { let b = 0, bz = -2; for (let i = 0; i < 360; i++) { const z = magAxis(i / 360 * SPIN_PERIOD)[2]; if (z > bz) { bz = z; b = i / 360; } } return b; })();
function pulse() {
  const turn = st.spin / SPIN_PERIOD - FACE;
  // Fast turns pass the eye between frames: count turns, one tick each.
  if (egg?.kind === 'voice' && egg.rate > 1.5) {
    const n = Math.min(2, Math.floor(turn) - Math.floor(lastTurn));
    for (let i = 0; i < n; i++) snd.tick();
  } else {
    const face = toView(magAxis(st.spin))[2];
    if (face > 0.95 && lastFace <= 0.95) snd.tick();
    lastFace = face;
  }
  lastTurn = turn;
}
// Each arcade loop that snaps in plays its note once.
function cueArcade(fl) {
  while (fl.snapped < ARCADE && fl.t >= flareCurve.born(fl.snapped)) {
    const p = regionPoint(fl.rg);
    snd.snap(fl.snapped, clamp(toCss(p.v)[0] / cssW * 2 - 1, -1, 1), st.star);
    fl.snapped++;
  }
}
function rest() {
  snd.quiet();
  kit.rest(() => !raf && !timer && !snd.busy);
}
// One frame at most is ever pending, so loops never stack.
function schedule(delay = 0) {
  if (raf || timer || !visible || !gl || !started) return;
  if (delay > 4) timer = setTimeout(() => { timer = 0; schedule(); }, delay - 2);
  else raf = requestAnimationFrame(frame);
}
function poke() {
  lastInput = performance.now();
  if (!raf && !timer) last = performance.now();
  if (timer) { clearTimeout(timer); timer = 0; }
  if (!started) { draw(); return; }
  schedule();
}
function halt() { cancelAnimationFrame(raf); raf = 0; clearTimeout(timer); timer = 0; }

/* ---------- pointer: tap flares, drag turns ---------- */
// A press becomes a drag after 8 px; otherwise a tap.
const pointer = { id: null, x0: 0, y0: 0, x: 0, y: 0, at: 0, t0: 0, drag: false, egg: false, p0: 0, w0: 0 };
const local = e => { const r = stage.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
stage.addEventListener('pointerdown', e => {
  if (e.button !== 0 || !ren || pointer.id !== null || (e.target !== canvas && e.target !== stage)) return;
  try { stage.setPointerCapture(e.pointerId); } catch { /* capture is optional */ }
  const [x, y] = local(e);
  const now = performance.now();
  Object.assign(pointer, { id: e.pointerId, x0: x, y0: y, x, y, at: now, t0: now, drag: false, egg: false, p0: st.pitch, w0: st.yaw });
  poke();
});
stage.addEventListener('pointermove', e => {
  if (e.pointerId !== pointer.id) return;
  const [x, y] = local(e);
  const now = performance.now();
  const speed = Math.hypot(x - pointer.x, y - pointer.y) / Math.max(1, now - pointer.at) * 1000;
  pointer.x = x; pointer.y = y; pointer.at = now;
  if (!pointer.drag && Math.hypot(x - pointer.x0, y - pointer.y0) > 8) pointer.drag = true;
  if (!pointer.drag) return;
  snd.turn(speed);
  // The surface follows the hand, like a ball rolled under it.
  const k = 0.75 / Math.max(320, cssH);
  // The long lens holds still: the camera never moves there.
  if (cam.mode === 'long') return;
  st.pitch = clamp(pointer.p0 + (y - pointer.y0) * k, -0.32, 0.32);
  st.yaw = clamp(pointer.w0 + (x - pointer.x0) * k, -0.32, 0.32);
  setRot();
  poke();
});
function endPointer(e) {
  if (e.pointerId !== pointer.id) return;
  // A press that started an egg is not a tap.
  const tap = e.type === 'pointerup' && !pointer.drag && !pointer.egg;
  if (pointer.drag) snd.endTurn();
  pointer.id = null; pointer.drag = false;
  if (tap) flareNear(pointer.x, pointer.y);
  poke();
}
['pointerup', 'pointercancel', 'lostpointercapture'].forEach(t => stage.addEventListener(t, endPointer));
// Zoom in the full view: the wheel, a two-finger pinch, the - and = keys.
stage.addEventListener('wheel', e => {
  if (cam.mode !== 'full') return;
  e.preventDefault();
  zoomBy(Math.exp(clamp(e.deltaY, -120, 120) * 0.004));
}, { passive: false });
const touches = new Map();
let pinch0 = 0;
const spread = () => { const [a, b] = [...touches.values()]; return Math.hypot(a[0] - b[0], a[1] - b[1]); };
stage.addEventListener('pointerdown', e => {
  if (e.pointerType !== 'touch') return;
  touches.set(e.pointerId, local(e));
  // A second finger ends the tap and the turn.
  if (touches.size === 2) { pinch0 = spread(); pointer.drag = true; }
});
stage.addEventListener('pointermove', e => {
  if (!touches.has(e.pointerId)) return;
  touches.set(e.pointerId, local(e));
  if (touches.size !== 2 || !pinch0) return;
  const d = spread();
  zoomBy(pinch0 / Math.max(d, 1));
  pinch0 = d;
});
['pointerup', 'pointercancel'].forEach(t => stage.addEventListener(t, e => { touches.delete(e.pointerId); if (touches.size < 2) pinch0 = 0; }));
addEventListener('keydown', e => {
  if (e.metaKey || e.ctrlKey || e.altKey || e.target.closest?.('input, textarea')) return;
  if (e.key === '-' || e.key === '_') zoomBy(1.25);
  else if (e.key === '=' || e.key === '+') zoomBy(0.8);
});

/* ---------- life cycle ---------- */
whenVisible(stage, on => {
  visible = on;
  if (on) { last = performance.now(); schedule(); }
  else { halt(); pointer.id = null; pointer.drag = false; snd.quiet(); }
});
onReducedChange(on => { calm = on; poke(); });
sound.onChange(on => { if (on) poke(); else snd.quiet(); });
new ResizeObserver(() => resize()).observe(stage);
ui.onCover?.(() => resize());

async function setup() {
  gl = canvas.getContext('webgl2', { antialias: false, alpha: false, depth: false, powerPreference: 'high-performance' });
  if (!gl) throw new Error('no webgl2');
  ren = await makeRender(gl, { fluid: FLUID });
  sizeKey = '';
}
onContextLoss(canvas, {
  lost: () => { halt(); gl = null; ren = null; },
  restored: async () => { await setup(); resize(true); poke(); },
  failed: () => fail.removeAttribute('hidden'),
});

mark('build');
try {
  await setup();
  // The first frame is a picture: loops at every stage of their lives.
  resize(true);
  draw();
  gl.finish();
  canvas.classList.add('on');
  mark('first-frame');
  await introDone;
  started = true;
  poke();
} catch (err) {
  console.error(err);
  fail.removeAttribute('hidden');
  ui.hideControls?.();
}
