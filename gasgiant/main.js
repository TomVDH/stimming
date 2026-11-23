// Gas giant dive: the plunge. Hold to fall from over the cloud tops into the dark.
// Raw WebGL2 in five passes, one output each: map, march, composite, bloom, final.
import { initPage, whenVisible, pageReady, stage as mark, reduced, onReducedChange, audioKit, sound } from '../shared/stim.js';
import { intro as playIntro } from '../shared/intro.js';
import { detail } from '../shared/detail.js';
import { TRI_VS, program, linked, target, bind, tri, free, onContextLoss } from '../shared/gl.js';
import { bloomChain } from '../shared/glow.js';
import { loadWatch } from '../shared/loadwatch.js';
import { pruneGLSL } from '../shared/glsl-prune.js';
import { R, SUN_AZ, SUN_EL, sunDir, ALT_TOP, ALT_DEEP, LAYERS, lightAt, lightTable, luma, LUT_N } from './world.js';
import { MAP_FS } from './map.js';
import { BAKE_FS, MARCH_FS } from './clouds.js';
import { COMPOSITE_FS, FINAL_FS } from './post.js';
import { CABIN_FS } from './cabin.js';
import { makeBolts, stepBolts, flashUniform, busyBolts } from './bolts.js';
import { diveSound, C_SOUND } from './sound.js';
mark('libs');

const ID = 'gasgiant';
const stage = document.getElementById('stage');
const fail = stage.querySelector('.fail');
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const QS = new URLSearchParams(location.search);
let frozen = reduced();

/* ---------- state ---------- */
const S = {
  alt: ALT_TOP, v: 0, diving: false, slideTo: null,
  yaw: 0, pitch: 0, tMap: 2600, tC: 0, lum: 1, shake: 0, wipe: 0, tWipe: 0, tGlass: 0, melt: 0,
};
const B = makeBolts();
if (QS.has('qa')) globalThis.__gg = { S, B };
// ?alt=-70 starts at that height, for checks.
if (QS.has('alt')) S.alt = clamp(Number(QS.get('alt')) || ALT_TOP, ALT_DEEP, ALT_TOP);
S.lum = luma(lightAt(S.alt));

const depthOf = alt => (ALT_TOP - alt) / (ALT_TOP - ALT_DEEP);
const altOf = d => ALT_TOP - d * (ALT_TOP - ALT_DEEP);

/* ---------- dev tuning ---------- */
// ?dev shows the Dev sheet: jump to a layer, look freely, tune the light.
const TUNE_DEF = { expo: 1, gainMax: 8, ms: 0.38, amb: 1, bounce: 0.3, haze: 1, flash: 1, sunAz: SUN_AZ, sunEl: SUN_EL, devPitch: 0, devYaw: 0 };
const TUNE = { ...TUNE_DEF };
let sunV = sunDir(TUNE.sunAz, TUNE.sunEl);
const tune = (id, v) => { TUNE[id] = v; if (id === 'sunAz' || id === 'sunEl') sunV = sunDir(TUNE.sunAz, TUNE.sunEl); touch(); };
// Each layer's middle; a void's view sits a third of the way down.
const GOTO = [{ value: 'top', label: 'Top, 260 km' }, ...LAYERS.map(l => ({ value: l.id, label: `${l.id[0].toUpperCase()}${l.id.slice(1)}, ${-l.top} to ${-l.bot} km` }))];
function goTo(id) {
  const l = LAYERS.find(x => x.id === id);
  S.alt = l ? (l.kind === 'void' ? l.top - (l.top - l.bot) * 0.35 : (l.top + l.bot) / 2) : ALT_TOP;
  S.v = 0; S.slideTo = null; S.diving = false; B.strokes.length = 0; snd.cancel();
  S.lum = luma(lightAt(S.alt));
  ui.slider?.set(depthOf(S.alt));
  touch();
}
const slider = (group, id, label, min, max, step) => ({ type: 'slider', group, id: 'gg_' + id, label, min, max, step, value: TUNE_DEF[id], persist: true, onInput: v => tune(id, v) });
const DEV = [
  { type: 'choice', group: 'Go to', id: 'gg_goto', label: 'Layer', value: 'top', options: GOTO, onPick: goTo },
  slider('Camera', 'devPitch', 'Pitch', -60, 60, 1),
  slider('Camera', 'devYaw', 'Yaw', -180, 180, 1),
  slider('Light', 'sunAz', 'Sun azimuth', -180, 180, 1),
  slider('Light', 'sunEl', 'Sun elevation', 2, 60, 1),
  slider('Light', 'expo', 'Exposure', 0.25, 4, 0.01),
  slider('Light', 'gainMax', 'Eye gain cap', 1, 30, 0.5),
  slider('Light', 'ms', 'Light into cloud', 0, 1.2, 0.01),
  slider('Light', 'amb', 'Ambient from above', 0, 3, 0.01),
  slider('Light', 'bounce', 'Floor bounce', 0, 1.5, 0.01),
  slider('Light', 'haze', 'Haze reach', 0.2, 4, 0.01),
  slider('Light', 'flash', 'Flash strength', 0, 3, 0.01),
  { type: 'button', group: 'Light', label: 'Defaults', text: 'Reset', onClick: () => { for (const [id, v] of Object.entries(TUNE_DEF)) ui.setting('gg_' + id)?.set(v, true); } },
];

/* ---------- bar ---------- */
let keyDown = false, slideAt = -1e9;
const ui = initPage({ id: ID, bar: {
  actions: [{ verb: 'dive', label: 'Dive', key: 'Space', hold: true, onDown: () => press('key'), onUp: () => release('key') }],
  slider: { label: 'Depth', min: 0, max: 1, step: 0.001, value: depthOf(S.alt), onInput: v => { S.slideTo = altOf(v); slideAt = performance.now(); touch(); } },
  quality: true,
  dev: DEV,
  reset: () => { S.alt = ALT_TOP; S.v = 0; S.slideTo = null; S.yaw = 0; S.pitch = 0; B.strokes.length = 0; snd.cancel(); ui.slider?.set(0); touch(); },
  keys: [['hold', 'dive'], ['drag', 'look'], ['space', 'dive']],
  help: [
    ['hold', 'Hold to dive into the clouds'],
    ['release', 'Let go to hang where you are'],
    ['drag', 'Drag to look round'],
    ['space', 'Hold Space to dive; Depth takes you back up'],
  ],
} });
// Saved dev values hold from the last visit.
for (const id of Object.keys(TUNE_DEF)) { const v = ui.setting?.('gg_' + id)?.value; if (typeof v === 'number') TUNE[id] = v; }
sunV = sunDir(TUNE.sunAz, TUNE.sunEl);
const introDone = playIntro({ ready: pageReady() });
const kit = audioKit({ sleepMs: 1500, keys: new Set([' ']) });
const snd = diveSound(kit);

/* ---------- GL ---------- */
const canvas = document.createElement('canvas');
canvas.setAttribute('aria-hidden', 'true');
stage.prepend(canvas);
const watch = loadWatch(ID, canvas);
const gl = canvas.getContext('webgl2', { antialias: false, alpha: false, premultipliedAlpha: false, powerPreference: 'high-performance' });
let P = null, vao = null, T = {}, bloom = null, vol = null, lut = null;
let W = 1, H = 1, cssW = 1, cssH = 1;
const D = detail({ maxDpr: 1.5, budget: 2.4e6, steps: 3, settle: 2, onChange: () => resize(true) });
const flash = new Float32Array(16);
const link = {};

// The march's size and steps by quality and the slow-frame rung.
function marchCut() {
  const r = D.rung;
  return { scale: r >= 2 ? 0.34 : 0.5, steps: r >= 3 ? 96 : D.level >= 2 ? 190 : 150, fine: r >= 3 ? 0 : 1 };
}

async function setup() {
  if (!gl || !gl.getExtension('EXT_color_buffer_float')) throw new Error('no float targets');
  gl.getExtension('OES_texture_float_linear');
  vao = gl.createVertexArray();
  watch.step('link');
  const t0 = performance.now();
  const src = {
    bake: BAKE_FS, map: MAP_FS, march: MARCH_FS, comp: COMPOSITE_FS, cabin: CABIN_FS, fin: FINAL_FS,
  };
  const set = {};
  for (const [k, fs] of Object.entries(src)) set[k] = program(gl, TRI_VS, pruneGLSL(fs));
  // ?qa links one at a time, to time each pass.
  if (QS.has('qa')) {
    for (const [k, p] of Object.entries(set)) { const a = performance.now(); await linked(gl, { [k]: p }); link[k] = Math.round(performance.now() - a); }
    P = set;
  } else P = await linked(gl, set);
  link.all = Math.round(performance.now() - t0);
  if (QS.has('qa')) globalThis.__gg.link = link;
  watch.step('bake');
  bakeVolume(64);
  lut = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, lut);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, LUT_N, 1, 0, gl.RGBA, gl.FLOAT, lightTable());
  for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
  T.map = target(gl, 1024, 1024);
  bloom = bloomChain(gl);
}

// The 64 cubed noise volume: one draw per layer into a 3D texture.
function bakeVolume(n) {
  vol = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_3D, vol);
  gl.texImage3D(gl.TEXTURE_3D, 0, gl.RGBA8, n, n, n, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.REPEAT], [gl.TEXTURE_WRAP_T, gl.REPEAT], [gl.TEXTURE_WRAP_R, gl.REPEAT]]) gl.texParameteri(gl.TEXTURE_3D, k, v);
  const fb = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
  gl.viewport(0, 0, n, n);
  gl.useProgram(P.bake.p);
  gl.bindVertexArray(vao);
  for (let z = 0; z < n; z++) {
    gl.framebufferTextureLayer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, vol, 0, z);
    gl.uniform1f(P.bake.u.uZ, (z + 0.5) / n);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.deleteFramebuffer(fb);
}

function resize(force = false) {
  if (!P) return;
  const r = stage.getBoundingClientRect();
  const w = Math.max(1, Math.round(r.width)), h = Math.max(1, Math.round(r.height));
  if (!force && w === cssW && h === cssH) return;
  cssW = w; cssH = h;
  const dpr = D.dpr(w, h);
  W = Math.max(1, Math.round(w * dpr)); H = Math.max(1, Math.round(h * dpr));
  canvas.width = W; canvas.height = H;
  const m = marchCut();
  free(gl, T.march); free(gl, T.scene); free(gl, T.cabin);
  T.march = target(gl, Math.max(1, Math.round(W * m.scale)), Math.max(1, Math.round(H * m.scale)));
  T.scene = target(gl, W, H);
  T.cabin = target(gl, W, H);
  wake();
}

/* ---------- camera ---------- */
// The capsule holds its own frame; the drag turns the eye in it and moves the head a little.
const DEG = Math.PI / 180;
function basis() {
  // The capsule tips a little lower as it sinks; floor and ceiling stay in view.
  const pitchC = (-3 + -10 * (1 - smooth(-60, 160, S.alt))) * DEG;
  // Capsule axes in the world: X right, Y up, Z back toward the eye.
  const X = [1, 0, 0];
  const Y = [0, Math.cos(pitchC), Math.sin(pitchC)];
  const Z = [0, -Math.sin(pitchC), Math.cos(pitchC)];
  // The look: yaw about Y, then pitch about X, in capsule axes.
  // The eye sits left of the window and looks across it, as in Window seat.
  // A narrow stage eases the angle and moves the eye back, so the whole window shows.
  const wide = QS.has('out') ? 0 : smooth(0.6, 1.4, W / H);
  const ly = (S.yaw + 21 * wide + TUNE.devYaw) * DEG, lp = (S.pitch - 3 - TUNE.devPitch) * DEG;
  const cy = Math.cos(ly), sy = Math.sin(ly), cp = Math.cos(lp), sp = Math.sin(lp);
  const look = [cy, 0, -sy, sy * sp, cp, cy * sp, sy * cp, -sp, cy * cp];
  const col = i => [look[i], look[3 + i], look[6 + i]];
  const world = v => [0, 1, 2].map(k => X[k] * v[0] + Y[k] * v[1] + Z[k] * v[2]);
  const asp = W / H;
  // A narrow stage keeps 50 degrees across.
  let ty = Math.tan(29 * DEG), tx = ty * asp;
  if (tx < Math.tan(25 * DEG)) { tx = Math.tan(25 * DEG); ty = tx / asp; }
  const r = col(0), u = col(1), z = col(2);
  const fwd = world([-z[0], -z[1], -z[2]]);
  const eye = [-0.2 * wide - 0.0025 * S.yaw, 0.01 + 0.002 * S.pitch, 0.4 + 0.3 * (1 - wide)];
  // GLSL takes a mat3 by columns: the look's columns are its axes in capsule space.
  const lookM = new Float32Array([r[0], r[1], r[2], u[0], u[1], u[2], z[0], z[1], z[2]]);
  return { fwd, right: world(r).map(v => v * tx), up: world(u).map(v => v * ty), tan: [tx, ty], eye, lookM };
}
// Where the view's aim meets the deck, for the lightning.
function aimOnDeck(b) {
  const down = Math.max(0.08, -b.fwd[1]);
  const d = Math.min(3000, Math.max(30, (S.alt + 75) / down));
  return [b.fwd[0] * d, b.fwd[2] * d];
}

/* ---------- step ---------- */
let timeK = 1, lastInput = performance.now();
function step(dt) {
  const sdt = dt * timeK;
  // The fall: fast through the empty sky, slow in the decks, a glide through the voids.
  const vMax = 2.4 + 7.5 * smooth(10, 90, S.alt) + 2.6 * (1 - deckAt(S.alt)) * (1 - smooth(-10, 10, S.alt));
  if (S.slideTo != null) {
    const gap = S.slideTo - S.alt;
    const want = clamp(gap * 1.6, -22, 22);
    S.v += (-want - S.v) * (1 - Math.exp(-dt / 0.25));
    if (Math.abs(gap) < 0.05 && performance.now() - slideAt > 400) { S.alt = S.slideTo; S.slideTo = null; S.v = 0; }
  } else {
    const want = S.diving ? vMax : 0;
    S.v += (want - S.v) * (1 - Math.exp(-dt / (S.diving ? 1.1 : 1.0)));
    if (Math.abs(S.v) < 0.002) S.v = 0;
  }
  S.alt = clamp(S.alt - S.v * dt, ALT_DEEP, ALT_TOP);
  if (S.alt <= ALT_DEEP && S.v > 0) S.v = 0;
  if (performance.now() - slideAt > 300) ui.slider?.set(depthOf(S.alt));
  // Time runs fast high up, so the storm turns; slow in the decks, so near clouds do not blur.
  const k = 4 + 26 * smooth(-20, 120, S.alt);
  S.tMap += sdt * k * (frozen && !S.diving && !S.v ? 0 : 1);
  S.tC += sdt * (frozen && !S.diving ? 0 : 1);
  // The eye adapts slowly, and never fully.
  const lum = luma(lightAt(S.alt));
  S.lum += (lum - S.lum) * (1 - Math.exp(-dt / 2.0));
  // Shake: buffets that grow with the speed and the thick air.
  const sh = frozen ? 0 : clamp(S.v / 9, 0, 1) * (0.4 + 0.6 * smooth(30, -40, S.alt)) * (S.diving ? 1 : 0.4);
  S.shake += (sh - S.shake) * (1 - Math.exp(-dt / 0.3));
  // The wipes: veils rush up the glass in the air, faster with the fall.
  const inAir = smooth(40, 10, S.alt) * (1 - smooth(-100, -130, S.alt));
  const wp = inAir * (0.3 + 0.6 * clamp(S.v / 6, 0, 1)) * (frozen ? 0.4 : 1);
  S.wipe += (wp - S.wipe) * (1 - Math.exp(-dt / 0.6));
  S.tWipe += sdt * (frozen ? 0 : 0.08 + 0.45 * clamp(S.v / 5, 0, 1));
  S.tGlass += sdt * (frozen ? 0 : 1);
  const heat = smooth(110, 200, S.alt) * clamp((S.v - 2) / 6, 0, 1);
  S.melt = S.alt > 245 && !S.diving ? Math.max(0, S.melt - dt * 0.2) : Math.min(1, S.melt + heat * dt * 0.8);
  const b = basis();
  stepBolts(B, dt, { alt: S.alt, aim: aimOnDeck(b), soft: frozen, live: timeK > 0, deck: deckAt(S.alt) });
  for (const hd of B.heard.splice(0)) {
    const d = Math.hypot(hd.pos[0], hd.pos[1] - S.alt, hd.pos[2]);
    snd.thunder(d, hd.level, clamp(hd.pos[0] / Math.max(d, 1), -1, 1));
  }
  snd.update(dt, Math.abs(S.v), depthOf(S.alt), S.diving);
  return S.diving || S.v !== 0 || S.slideTo != null || busyBolts(B) || S.shake > 0.01;
}

// How far into a void the eye is: 0 in the decks, the sky and the dark.
const voidAt = h => (1 - deckAt(h)) * (1 - smooth(-6, 0, h)) * smooth(-505, -495, h);
// The eye's gain: it opens as the light fails, up to 8 times.
const gainAt = lum => clamp(Math.pow(Math.max(lum, 1e-7), -0.5), 1, TUNE.gainMax);
// How deep in a deck the eye is: 0 in the air and the voids, 1 inside cloud.
const bump = (a, b, x) => smooth(a - 1, a + 2, x) * (1 - smooth(b - 2, b + 1, x));
// Decks and the veil count whole; sheets count in part.
const DECK_K = { deck: 1, haze: 1, sheets: 0.4 };
const deckAt = h => Math.min(1, LAYERS.reduce((a, l) => a + (DECK_K[l.kind] || 0) * bump(l.bot + (l.id === 'ammonia' ? 2 : 0), l.top, h), 0));

/* ---------- render ---------- */
// Sets the sun on a program that reads it.
const sunTo = pr => { if (pr.u.uSun) gl.uniform3fv(pr.u.uSun, sunV); };
let frameNo = 0, mapAge = 1e9;
function render(dt) {
  const b = basis();
  const cam = [0, S.alt, 0];
  gl.bindVertexArray(vao);
  gl.disable(gl.BLEND);
  // Pass 1: the map, at 30 fps or less.
  mapAge += dt;
  if (mapAge > 1 / 30 || frameNo === 0) {
    mapAge = 0;
    gl.useProgram(P.map.p);
    sunTo(P.map);
    gl.uniform1f(P.map.u.uT, S.tMap);
    tri(gl, T.map, vao);
  }
  // Pass 3: the march.
  const m = marchCut();
  gl.useProgram(P.march.p);
  sunTo(P.march);
  gl.uniform4f(P.march.u.uTune, TUNE.ms, TUNE.amb, TUNE.bounce, TUNE.haze);
  const u = P.march.u;
  bind(gl, P.march, 'uMap', 0, T.map);
  bind(gl, P.march, 'uLut', 1, { tex: lut });
  gl.activeTexture(gl.TEXTURE2);
  gl.bindTexture(gl.TEXTURE_3D, vol);
  gl.uniform1i(u.uVol, 2);
  gl.uniform3fv(u.uCam, cam);
  gl.uniform3fv(u.uFwd, b.fwd); gl.uniform3fv(u.uRight, b.right); gl.uniform3fv(u.uUp, b.up);
  gl.uniform1f(u.uT, S.tC);
  gl.uniform1f(u.uTMap, S.tMap);
  gl.uniform1f(u.uSteps, Math.min(256, Math.round(m.steps * (1 + 0.3 * voidAt(S.alt)))));
  gl.uniform1f(u.uFine, m.fine);
  // In a void the eye sees to the horizon, 1,600 km; in a deck, 220 km.
  const vk = voidAt(S.alt);
  gl.uniform1f(u.uWin, 220 + 1380 * vk);
  gl.uniform1f(u.uSeed, frameNo % 64);
  flashUniform(B, flash);
  // Deep down the eye opens wider; the flashes dim to match, as they show at the water deck.
  const fk = Math.min(1, 2.2 / gainAt(S.lum)) * TUNE.flash;
  for (let i = 3; i < 16; i += 4) flash[i] *= fk;
  gl.uniform4fv(u.uFlash, flash);
  tri(gl, T.march, vao);
  // Pass 4: the composite.
  gl.useProgram(P.comp.p);
  sunTo(P.comp);
  bind(gl, P.comp, 'uClouds', 0, T.march);
  gl.uniform3fv(P.comp.u.uCam, cam);
  gl.uniform3fv(P.comp.u.uFwd, b.fwd); gl.uniform3fv(P.comp.u.uRight, b.right); gl.uniform3fv(P.comp.u.uUp, b.up);
  tri(gl, T.scene, vao);
  // Pass 5: bloom on the outside, then the cabin, then the grade to the screen.
  const bl = bloom.render(T.scene.tex, W, H, { threshold: 1.1, cap: 8, levels: D.level > 0 ? 5 : 3 });
  gl.bindVertexArray(vao);
  gl.useProgram(P.cabin.p);
  sunTo(P.cabin);
  const c = P.cabin.u;
  bind(gl, P.cabin, 'uScene', 0, T.scene);
  bind(gl, P.cabin, 'uBloom', 1, { tex: bl });
  gl.uniform3fv(c.uEye, b.eye);
  gl.uniformMatrix3fv(c.uLook, false, b.lookM);
  gl.uniform2fv(c.uTan, b.tan);
  gl.uniform1f(c.uBloomK, 0.55);
  gl.uniform1f(c.uTime, S.tGlass);
  gl.uniform1f(c.uWipe, S.wipe);
  // Entry heat melts the frost; it forms again only near the top.
  gl.uniform1f(c.uFrost, smooth(40, 120, S.alt) * (1 - S.melt));
  gl.uniform1f(c.uWet, smooth(25, 5, S.alt) * (1 - smooth(-95, -115, S.alt)));
  gl.uniform1f(c.uRush, clamp(S.v / 5, 0, 1));
  gl.uniform1f(c.uHeat, frozen ? 0 : smooth(-80, -130, S.alt));
  gl.uniform1f(c.uAsp, W / H);
  // Entry: the plasma glows while the capsule falls fast, high up.
  const entry = smooth(110, 200, S.alt) * clamp((S.v - 2) / 6, 0, 1);
  gl.uniform1f(c.uEntry, entry);
  gl.uniform1f(c.uDeck, deckAt(S.alt) * (frozen ? 0.5 : 1));
  gl.uniform1f(c.uFlash, Math.min(2.5, (flash[3] + flash[7] * 0.5) / (S.alt > 0 ? 400 : 1.2)));
  const a = S.shake * 0.0035, ph = performance.now() / 1000;
  gl.uniform2f(c.uShake, a * (Math.sin(ph * 37) + 0.5 * Math.sin(ph * 61)), a * (Math.sin(ph * 41 + 1) + 0.5 * Math.sin(ph * 73)));
  tri(gl, T.cabin, vao);
  gl.useProgram(P.fin.p);
  // ?out shows the outside alone, for look work.
  bind(gl, P.fin, 'uScene', 0, QS.has('out') ? T.scene : T.cabin);
  gl.uniform1f(P.fin.u.uExp, 0.3 * gainAt(S.lum) * TUNE.expo);
  gl.uniform1f(P.fin.u.uSeed, frameNo % 97);
  gl.uniform1f(P.fin.u.uAsp, W / H);
  tri(gl, null, vao);
  frameNo++;
}

/* ---------- frame loop ---------- */
let visible = true, raf = 0, timer = 0, last = 0;
function frame(now) {
  raf = 0;
  if (!visible || !P) return;
  const dt = Math.max(0, Math.min(0.05, (now - last) / 1000));
  last = Math.max(last, now);
  let again = true, lively = true;
  try {
    const idle = (now - lastInput) / 1000;
    timeK = idle < 60 ? 1 : Math.max(0, 1 - (idle - 60) / 2);
    const live = step(dt);
    render(dt);
    D.frame(dt);
    lively = live || down || keyDown;
    // The bands flow and the storm turns at 30 fps until the toy sleeps.
    const drifting = !frozen && timeK > 0;
    again = lively || drifting || (frozen && timeK > 0 && busyBolts(B));
  } finally {
    // A thrown error still leaves the loop able to wake.
    if (!again) snd.rest();
    else schedule(lively ? 0 : Math.max(0, 31 - (performance.now() - now)));
  }
}
function schedule(delay) {
  if (raf || timer || !visible || !P) return;
  if (delay > 0) timer = setTimeout(() => { timer = 0; raf = requestAnimationFrame(frame); }, delay);
  else raf = requestAnimationFrame(frame);
}
function wake() {
  if (timer) { clearTimeout(timer); timer = 0; }
  if (!raf) last = performance.now();
  schedule(0);
}
function halt() { cancelAnimationFrame(raf); raf = 0; clearTimeout(timer); timer = 0; }
function touch() { lastInput = performance.now(); timeK = 1; wake(); }

/* ---------- gestures ---------- */
// A press turns into a drag after 8 px, a hold after 260 ms; a release that is neither is a tap.
// A hold dives; a drag looks; a hold that moves does both.
let down = false, pid = null, mode = '', px = 0, py = 0, holdT = 0;
const holders = new Set();
function press(who) {
  if (who === 'key') keyDown = true;
  holders.add(who);
  S.diving = true; S.slideTo = null;
  touch();
}
function release(who) {
  if (who === 'key') keyDown = false;
  if (!holders.delete(who) || holders.size) return;
  S.diving = false;
  touch();
}
stage.addEventListener('pointerdown', e => {
  if (e.button !== 0 || !P || (e.target !== canvas && e.target !== stage)) return;
  try { stage.setPointerCapture(e.pointerId); } catch { /* capture is optional */ }
  pid = e.pointerId; down = true; mode = 'press'; px = e.clientX; py = e.clientY;
  // The first frame answers: the eye tips a little toward the fall.
  S.v = Math.max(S.v, 0.4);
  clearTimeout(holdT);
  holdT = setTimeout(() => { if (down && mode === 'press') { mode = 'hold'; press('pointer'); } }, 260);
  touch();
});
stage.addEventListener('pointermove', e => {
  if (!down || e.pointerId !== pid) return;
  const dx = e.clientX - px, dy = e.clientY - py;
  if (mode === 'press' && Math.hypot(dx, dy) > 8) { mode = 'drag'; clearTimeout(holdT); }
  if (mode === 'drag' || mode === 'hold') {
    px = e.clientX; py = e.clientY;
    const k = 70 / Math.max(cssH, 1);
    S.yaw = clamp(S.yaw - dx * k, -25, 25);
    S.pitch = clamp(S.pitch + dy * k, -15, 15);
    touch();
  }
});
function end(e) {
  if (!down || (e && e.pointerId !== pid)) return;
  down = false; pid = null; clearTimeout(holdT);
  // A tap sinks the eye a little.
  if (mode === 'press' && e.type === 'pointerup') S.v = Math.max(S.v, 2.5);
  if (mode === 'hold') release('pointer');
  mode = '';
  touch();
}
['pointerup', 'pointercancel', 'lostpointercapture'].forEach(t => stage.addEventListener(t, end));

/* ---------- life cycle ---------- */
whenVisible(stage, on => {
  visible = on;
  if (on) wake();
  else { halt(); snd.hide(); }
});
onReducedChange(on => { frozen = on; wake(); });
sound.onChange(on => { if (on) touch(); else snd.cancel(); });
new ResizeObserver(() => resize()).observe(stage);
onContextLoss(canvas, { lost: halt, restored: () => location.reload(), failed: () => { fail.hidden = false; } });

mark('build');
try {
  await setup();
  resize(true);
  watch.step('first-frame');
  step(0);
  render(1);
  gl.finish();
  canvas.classList.add('on');
  mark('first-frame');
  watch.done();
  wake();
} catch (err) {
  console.error(err);
  watch.fail(err);
  fail.hidden = false;
  mark('first-frame');
}
await introDone;
