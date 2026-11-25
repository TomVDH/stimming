// Gas giant dive: the plunge. Hold to fall from over the cloud tops into the dark.
// Raw WebGL2 in five passes, one output each: map, march, composite, bloom, final.
import { initPage, whenVisible, pageReady, stage as mark, reduced, onReducedChange, audioKit, sound, idle } from '../shared/stim.js';
import { intro as playIntro } from '../shared/intro.js';
import { detail } from '../shared/detail.js';
import { TRI_VS, program, linked, target, bind, tri, free, onContextLoss } from '../shared/gl.js';
import { bloomChain } from '../shared/glow.js';
import { loadWatch } from '../shared/loadwatch.js';
import { pruneGLSL } from '../shared/glsl-prune.js';
import { R, SUN_AZ, SUN_EL, sunDir, ALT_TOP, ALT_DEEP, LAYERS, lightAt, lightTable, luma, LUT_N } from './world.js';
import { MAP_FS } from './map.js';
import { BAKE_FS, SWIRL_FS, marchFS, zoneFor } from './clouds.js';
import { WALL_FS, WALL_W, WALL_H, WALL_N, TW_MAX, twisterUniforms } from './twisters.js';
import { COMPOSITE_FS, FINAL_FS, BOKEH_FS } from './post.js';
import { wetGlassMotion } from '../shared/wetglass.js';
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
  wispY: 0, crush: -1, crackLvl: 0,
  // Dev previews: a crush with no return to the top, and an entry burn.
  crushDev: -1, entryDev: 0,
  // The head, after Window seat: hover sway (hx, hy to targets thx, thy) and the lean to the glass (lean to leanT).
  hx: 0, hy: 0, thx: 0, thy: 0, lean: 0, leanT: 0,
};
const B = makeBolts();
// The wet pane's runs: they flow, and the air slants them.
const wgm = wetGlassMotion();
if (QS.has('qa')) globalThis.__gg = { S, B };
// ?alt=-70 starts at that height, for checks.
if (QS.has('alt')) S.alt = clamp(Number(QS.get('alt')) || ALT_TOP, ALT_DEEP, ALT_TOP);

/* ---------- resume ---------- */
// A reload or a lost GPU context puts the eye back where it was, within 30 minutes.
// The spot lives in this tab only: a new visit starts at the top.
const RESUME = 'stimming.gasgiant.resume';
function saveSpot() {
  try { sessionStorage.setItem(RESUME, JSON.stringify({ alt: S.alt, yaw: S.yaw, pitch: S.pitch, lean: S.leanT, at: Date.now() })); } catch { /* storage blocked */ }
}
function loadSpot() {
  try {
    const r = JSON.parse(sessionStorage.getItem(RESUME) || 'null');
    if (r && Date.now() - r.at < 1.8e6 && Number.isFinite(r.alt)) return r;
  } catch { /* storage blocked */ }
  return null;
}
if (!QS.has('alt')) {
  const r = loadSpot();
  if (r) { S.alt = clamp(r.alt, ALT_DEEP, ALT_TOP); S.yaw = clamp(+r.yaw || 0, -25, 25); S.pitch = clamp(+r.pitch || 0, -15, 15); S.lean = S.leanT = clamp(+r.lean || 0, 0, 1); }
}
addEventListener('pagehide', saveSpot);
document.addEventListener('visibilitychange', () => { if (document.hidden) saveSpot(); });
S.lum = luma(lightAt(S.alt));

const depthOf = alt => (ALT_TOP - alt) / (ALT_TOP - ALT_DEEP);
const altOf = d => ALT_TOP - d * (ALT_TOP - ALT_DEEP);

/* ---------- dev tuning ---------- */
// The far view's bake state (see bakeStrips); Dev changes start a new bake.
const BK = { N: 1280, tex: null, texD: null, dummy: null, fb: null, ok: false, alt: 0, near: 0, gen: 0, done: -1, at: -1e9, job: null };
// ?dev shows the Dev sheet: jump to a layer, render sharper, tune the light and the window.
const TUNE_DEF = {
  cabin: 'on', devPitch: 0, devYaw: 0,
  pix: 'auto', march: 'half', steps: '1',
  sunAz: SUN_AZ, sunEl: SUN_EL,
  expo: 1, gainMax: 8,
  ms: 0.38, amb: 1, bounce: 0.3, haze: 1, rays: 1,
  flash: 1,
  near: 1, wet: 1, fogK: 1, cracks: 'depth',
  // Each window effect: by depth, off, or full.
  fxFrost: 'auto', fxEntry: 'auto', fxWipe: 'auto', fxIce: 'auto', fxWet: 'auto', fxFog: 'auto', fxHeat: 'auto', fxNear: 'auto',
  // Window timings, in seconds or as rates.
  // The far view bakes from this many km out; 0 marches every ray in full.
  bake: 25,
  tCrush: 2.5, tWipe: 0.6, wipeSpeed: 1, melt: 0.8, frostBack: 0.2, jolt: 0.8, rushK: 1,
};
// An effect's level: its depth value, none, or full.
const fx = (id, v) => (TUNE[id] === 'off' ? 0 : TUNE[id] === 'on' ? 1 : v);
const TUNE = { ...TUNE_DEF };
let sunV = sunDir(TUNE.sunAz, TUNE.sunEl);
// Render rows change the targets, so they resize.
const RESIZE = new Set(['pix', 'march', 'cabin']);
const tune = (id, v) => {
  TUNE[id] = v;
  if (id === 'sunAz' || id === 'sunEl') sunV = sunDir(TUNE.sunAz, TUNE.sunEl);
  if (RESIZE.has(id) && P) resize(true);
  BK.gen++;
  touch();
};
const cabinOff = () => QS.has('out') || TUNE.cabin === 'off';
// Each layer's middle; a void's view sits a third of the way down.
const GOTO = [{ value: 'top', label: 'Top, 260 km' }, ...LAYERS.map(l => ({ value: l.id, label: `${l.id[0].toUpperCase()}${l.id.slice(1)}, ${l.top} to ${l.bot} km` }))];
function goTo(id) {
  const l = LAYERS.find(x => x.id === id);
  S.alt = l ? (l.kind === 'void' ? l.top - (l.top - l.bot) * 0.35 : (l.top + l.bot) / 2) : ALT_TOP;
  S.v = 0; S.slideTo = null; S.diving = false; B.strokes.length = 0; snd.cancel();
  S.lum = luma(lightAt(S.alt));
  ui.slider?.set(depthOf(S.alt));
  touch();
}
const slider = (group, id, label, min, max, step) => ({ type: 'slider', group, id: 'gg_' + id, label, min, max, step, value: TUNE_DEF[id], persist: true, onInput: v => tune(id, v) });
const choice = (group, id, label, options) => ({ type: 'choice', group, id: 'gg_' + id, label, value: TUNE_DEF[id], persist: true, options: options.map(([value, l]) => ({ value, label: l })), onPick: v => tune(id, v) });
const DEV = [
  { type: 'choice', group: 'Go to', id: 'gg_goto', label: 'Layer', value: 'top', options: GOTO, onPick: goTo },
  // Off takes away the whole window: wall, bezel, liner, panes and the pane's weather.
  choice('View', 'cabin', 'Window frame', [['on', 'On'], ['off', 'Off']]),
  slider('View', 'devPitch', 'Pitch', -60, 60, 1),
  slider('View', 'devYaw', 'Yaw', -180, 180, 1),
  choice('Render', 'pix', 'Pixels', [['auto', 'Auto'], ['native', 'Native']]),
  choice('Render', 'march', 'Clouds', [['half', 'Half size'], ['full', 'Full size']]),
  choice('Render', 'steps', 'Steps', [['1', '1x'], ['1.5', '1.5x'], ['2', '2x']]),
  slider('Render', 'bake', 'Bake past, km (0 off)', 0, 200, 5),
  slider('Sun', 'sunAz', 'Azimuth', -180, 180, 1),
  slider('Sun', 'sunEl', 'Elevation', 2, 60, 1),
  slider('Exposure', 'expo', 'Exposure', 0.25, 4, 0.01),
  slider('Exposure', 'gainMax', 'Eye gain cap', 1, 30, 0.5),
  slider('Clouds', 'ms', 'Light into cloud', 0, 1.2, 0.01),
  slider('Clouds', 'amb', 'Ambient from above', 0, 3, 0.01),
  slider('Clouds', 'bounce', 'Floor bounce', 0, 1.5, 0.01),
  slider('Clouds', 'haze', 'Haze reach', 0.2, 4, 0.01),
  slider('Clouds', 'rays', 'God rays', 0, 4, 0.01),
  slider('Storm', 'flash', 'Flash strength', 0, 3, 0.01),
  slider('Window', 'near', 'Near fog', 0, 2, 0.01),
  slider('Window', 'wet', 'Drops', 0, 2, 0.01),
  slider('Window', 'fogK', 'Pane fog', 0, 2, 0.01),
  choice('Window', 'cracks', 'Cracks', [['depth', 'By depth'], ['off', 'Off'], ['full', 'Full']]),
  ...[['fxFrost', 'Frost'], ['fxEntry', 'Entry glow'], ['fxWipe', 'Wipes'], ['fxIce', 'Rime'], ['fxWet', 'Rain and drops'], ['fxFog', 'Pane fog'], ['fxHeat', 'Heat shimmer'], ['fxNear', 'Near fog']]
    .map(([id, l]) => choice('Window effects', id, l, [['auto', 'By depth'], ['off', 'Off'], ['on', 'Full']])),
  slider('Window timing', 'tCrush', 'Crush, s', 0.5, 8, 0.1),
  slider('Window timing', 'tWipe', 'Wipe rise, s', 0.1, 3, 0.05),
  slider('Window timing', 'wipeSpeed', 'Wipe speed', 0.2, 3, 0.05),
  slider('Window timing', 'melt', 'Frost melt, per s', 0.1, 3, 0.05),
  slider('Window timing', 'frostBack', 'Frost back, per s', 0.05, 1, 0.01),
  slider('Window timing', 'jolt', 'Crack jolt', 0, 3, 0.05),
  slider('Window timing', 'rushK', 'Near fog rush', 0.2, 3, 0.05),
  { type: 'button', group: 'Window play', label: 'Crush', text: 'Play', onClick: () => { S.crushDev = 0; touch(); } },
  { type: 'button', group: 'Window play', label: 'Entry burn', text: 'Play', onClick: () => { S.entryDev = 1; touch(); } },
  { type: 'button', group: 'Window play', label: 'Crack jolt', text: 'Play', onClick: () => { S.shake += TUNE.jolt; touch(); } },
  { type: 'button', group: 'Reset', label: 'All dev values', text: 'Defaults', onClick: () => { for (const [id, v] of Object.entries(TUNE_DEF)) ui.setting('gg_' + id)?.set(v, true); } },
];

/* ---------- bar ---------- */
let keyDown = false, slideAt = -1e9;
const ui = initPage({ id: ID, bar: {
  actions: [{ verb: 'dive', label: 'Dive', key: 'Space', hold: true, onDown: () => press('key'), onUp: () => release('key') }],
  slider: { label: 'Depth', min: 0, max: 1, step: 0.001, value: depthOf(S.alt), onInput: v => { S.slideTo = altOf(v); slideAt = performance.now(); touch(); } },
  quality: true,
  dev: DEV,
  reset: () => { S.alt = ALT_TOP; S.v = 0; S.slideTo = null; S.yaw = 0; S.pitch = 0; B.strokes.length = 0; snd.cancel(); ui.slider?.set(0); saveSpot(); touch(); },
  keys: [['hold', 'dive'], ['drag', 'look'], ['scroll', 'lean'], ['space', 'dive']],
  help: [
    ['hold', 'Hold to dive into the clouds'],
    ['release', 'Let go to hang where you are'],
    ['drag', 'Drag to look round'],
    ['scroll', 'Scroll to lean to the glass, or back into the seat'],
    ['space', 'Hold Space to dive; Depth takes you back up'],
  ],
} });
// Saved dev values hold from the last visit.
for (const id of Object.keys(TUNE_DEF)) { const v = ui.setting?.('gg_' + id)?.value; if (v != null && typeof v === typeof TUNE_DEF[id]) TUNE[id] = v; }
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
let P = null, vao = null, T = {}, bloom = null, vol = null, lut = null, swirl = null, wall = null;
// The march settles over frames: each frame blends into the last one.
// Thin and far things then read whole instead of boiling into grain.
// The history is full size; the march shifts its rays a sub-pixel each frame, so detail builds up.
const HIST_FS = /* glsl */`#version 300 es
precision highp float;
in vec2 vUv;
out vec4 o;
uniform sampler2D uCur, uPrev;
uniform float uK;
uniform vec2 uJit;
void main() { o = mix(texture(uPrev, vUv), texture(uCur, vUv - uJit), uK); }`;
// Eight sub-pixel shifts in the march's own pixels, Halton 2 and 3.
const halton = (i, b) => { let f = 1, r = 0; for (; i > 0; i = Math.floor(i / b)) { f /= b; r += f * (i % b); } return r; };
const JIT = Array.from({ length: 8 }, (_, i) => [halton(i + 1, 2) - 0.5, halton(i + 1, 3) - 0.5]);
// The far view's bake: a cube map round the eye, marched from the near reach out.
// It builds in strips over a few frames once the eye hangs still, and again when the eye moves.
// Each strip averages a few jittered passes, so the bake holds no grain.
const BK_STRIP = 160, BK_PASS = 3, BK_DRAWS = 6;
// Cube faces as GL samples them: the major axis, then the s and t axes.
const FACES = [
  [[1, 0, 0], [0, 0, -1], [0, -1, 0]], [[-1, 0, 0], [0, 0, 1], [0, -1, 0]],
  [[0, 1, 0], [1, 0, 0], [0, 0, 1]], [[0, -1, 0], [1, 0, 0], [0, 0, -1]],
  [[0, 0, 1], [1, 0, 0], [0, -1, 0]], [[0, 0, -1], [-1, 0, 0], [0, -1, 0]],
];
function cubeTex(n, fmt) {
  const t = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_CUBE_MAP, t);
  gl.texStorage2D(gl.TEXTURE_CUBE_MAP, 1, fmt, n, n);
  for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_CUBE_MAP, k, v);
  return t;
}
// Runs a few strips of the bake with the march program M, its uniforms already set for this frame.
function bakeStrips(M) {
  const u = M.u, j = BK.job, N = BK.N, strips = Math.ceil(N / BK_STRIP);
  gl.bindFramebuffer(gl.FRAMEBUFFER, BK.fb);
  gl.viewport(0, 0, N, N);
  gl.enable(gl.SCISSOR_TEST);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.CONSTANT_ALPHA, gl.ONE);
  gl.blendColor(0, 0, 0, 1 / BK_PASS);
  // The bake must not read itself.
  for (const unit of [6, 7]) { gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_CUBE_MAP, BK.dummy); }
  gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1]);
  gl.uniform1f(u.uMode, 2);
  gl.uniform1f(u.uNear, BK.near);
  // The twisters stay live; the bake holds none.
  gl.uniform1f(u.uTwLo, 0);
  gl.uniform1f(u.uTwHi, 0);
  gl.uniform4fv(u.uFlash, new Float32Array(16));
  gl.uniform1f(u.uSteps, Math.min(400, Math.round(Number(u._steps || 200) * 1.5)));
  for (let d = 0; d < BK_DRAWS && j.f < 6; d++) {
    const [ma, sa, ta] = FACES[j.f];
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_CUBE_MAP_POSITIVE_X + j.f, BK.tex, 0);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT1, gl.TEXTURE_CUBE_MAP_POSITIVE_X + j.f, BK.texD, 0);
    gl.scissor(0, j.k * BK_STRIP, N, BK_STRIP);
    if (j.p === 0) { gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); }
    gl.uniform3fv(u.uFwd, ma); gl.uniform3fv(u.uRight, sa); gl.uniform3fv(u.uUp, ta);
    const js = JIT[(j.p * 3 + 1) % 8];
    gl.uniform2f(u.uJit, js[0] / N, js[1] / N);
    gl.uniform1f(u.uSeed, j.p * 23 + j.k * 7 + j.f * 3);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    if (++j.p >= BK_PASS) { j.p = 0; if (++j.k >= strips) { j.k = 0; j.f++; } }
  }
  gl.disable(gl.BLEND);
  gl.disable(gl.SCISSOR_TEST);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  if (j.f >= 6) { BK.job = null; BK.ok = true; BK.done = BK.gen; }
}
// The last frame's view, for how much new march to take.
const lastView = { fwd: [0, 0, -1], alt: 0, fresh: true };
const twA = new Float32Array(TW_MAX * 4), twB = new Float32Array(TW_MAX * 4), twC = new Float32Array(TW_MAX * 4);
let W = 1, H = 1, cssW = 1, cssH = 1;
const D = detail({ maxDpr: 1.5, budget: 2.4e6, steps: 3, settle: 2, onChange: () => resize(true) });
const flash = new Float32Array(16);
const link = {};

// The march's size and steps by quality and the slow-frame rung.
function marchCut() {
  const r = D.rung;
  // The dev sheet can pin the clouds at full size and scale the steps.
  const scale = TUNE.march === 'full' ? 1 : r >= 2 ? 0.34 : 0.5;
  const steps = (r >= 3 ? 96 : D.level >= 2 ? 190 : 150) * Number(TUNE.steps);
  return { scale, steps, fine: r >= 3 && TUNE.march !== 'full' ? 0 : 1 };
}

// The march programs by zone; the deeper ones link after the first frame.
const MZ = { tops: null, top: null, mid: null, deep: null };
// Links the other zones in the background, nearest first, one at a time.
async function linkRest() {
  const order = { tops: ['top', 'mid', 'deep'], top: ['tops', 'mid', 'deep'], mid: ['top', 'tops', 'deep'], deep: ['mid', 'top', 'tops'] }[zoneFor(S.alt)];
  for (const z of order) {
    if (MZ[z]) continue;
    await idle(2000);
    if (gl.isContextLost()) return;
    const a = performance.now();
    MZ[z] = (await linked(gl, { m: program(gl, TRI_VS, pruneGLSL(marchFS(z))) })).m;
    link['march_' + z] = Math.round(performance.now() - a);
  }
  watch.step('zones');
}

async function setup() {
  if (!gl || !gl.getExtension('EXT_color_buffer_float')) throw new Error('no float targets');
  gl.getExtension('OES_texture_float_linear');
  vao = gl.createVertexArray();
  watch.step('link');
  const t0 = performance.now();
  // Only the march zone the eye starts in links before the first frame.
  const zone = zoneFor(S.alt);
  const src = {
    bake: BAKE_FS, swirl: SWIRL_FS, wall: WALL_FS, hist: HIST_FS, map: MAP_FS, march: marchFS(zone), comp: COMPOSITE_FS, bok: BOKEH_FS, cabin: CABIN_FS, fin: FINAL_FS,
  };
  const set = {};
  for (const [k, fs] of Object.entries(src)) set[k] = program(gl, TRI_VS, pruneGLSL(fs));
  // ?qa links one at a time, to time each pass.
  if (QS.has('qa')) {
    for (const [k, p] of Object.entries(set)) { const a = performance.now(); await linked(gl, { [k]: p }); link[k] = Math.round(performance.now() - a); }
    P = set;
  } else P = await linked(gl, set);
  link.all = Math.round(performance.now() - t0);
  // ?qa: the GL context and the swirl tile, for checks.
  if (QS.has('qa')) Object.assign(globalThis.__gg, { gl, tune, swirlTex: () => swirl });
  MZ[zone] = P.march;
  if (QS.has('qa')) globalThis.__gg.link = link;
  watch.step('bake');
  bakeVolume(64);
  bakeSwirl(1024);
  bakeWall();
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

// The top deck's swirls: one draw into a 1024 square tile that repeats, with mips.
function bakeSwirl(n) {
  swirl = target(gl, n, n, { format: gl.RGBA8, mips: true });
  gl.useProgram(P.swirl.p);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_3D, vol);
  gl.uniform1i(P.swirl.u.uVol, 0);
  tri(gl, swirl, vao);
  gl.bindTexture(gl.TEXTURE_2D, swirl.tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
  gl.generateMipmap(gl.TEXTURE_2D);
}

// The twisters' unrolled walls: one layer per variety, angle across, height up.
function bakeWall() {
  wall = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D_ARRAY, wall);
  gl.texStorage3D(gl.TEXTURE_2D_ARRAY, 1, gl.RGBA8, WALL_W, WALL_H, WALL_N);
  for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.REPEAT], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D_ARRAY, k, v);
  const fb = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
  gl.viewport(0, 0, WALL_W, WALL_H);
  gl.useProgram(P.wall.p);
  gl.bindVertexArray(vao);
  for (let v = 0; v < WALL_N; v++) {
    gl.framebufferTextureLayer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, wall, 0, v);
    gl.uniform1i(P.wall.u.uV, v);
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
  // Native pixels skip the budget, for dev work.
  const dpr = TUNE.pix === 'native' ? (window.devicePixelRatio || 1) : D.dpr(w, h);
  W = Math.max(1, Math.round(w * dpr)); H = Math.max(1, Math.round(h * dpr));
  canvas.width = W; canvas.height = H;
  const m = marchCut();
  free(gl, T.march); free(gl, T.scene); free(gl, T.cabin); free(gl, T.bok);
  for (const h of T.hist || []) free(gl, h);
  const mw = Math.max(1, Math.round(W * m.scale)), mh = Math.max(1, Math.round(H * m.scale));
  T.march = target(gl, mw, mh);
  T.hist = [target(gl, W, H), target(gl, W, H)];
  lastView.fresh = true;
  T.scene = target(gl, W, H);
  T.cabin = target(gl, W, H);
  // The view through fog on the pane: the scene in discs, at half size.
  T.bok = target(gl, Math.max(1, W >> 1), Math.max(1, H >> 1));
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
  const wide = cabinOff() ? 0 : smooth(0.6, 1.4, W / H);
  // Leaning in turns the angled view straight out through the port; the aim follows the sway a third of the way.
  const near = S.lean * S.lean * (3 - 2 * S.lean);
  const ly = (S.yaw + 21 * wide * (1 - near) + TUNE.devYaw + S.hx * 1.5) * DEG, lp = (S.pitch - 3 - TUNE.devPitch + S.hy * 1.0) * DEG;
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
  // The head sways 2 cm with the mouse; leaning in moves it to the port's centre, 2 cm off the wall.
  const rest = [-0.2 * wide - 0.0025 * S.yaw, 0.01 + 0.002 * S.pitch, 0.4 + 0.3 * (1 - wide)];
  const eye = [rest[0] * (1 - near) + S.hx * 0.02, rest[1] * (1 - near) + S.hy * 0.015, rest[2] + (0.02 - rest[2]) * near];
  // GLSL takes a mat3 by columns: the look's columns are its axes in capsule space.
  const lookM = new Float32Array([r[0], r[1], r[2], u[0], u[1], u[2], z[0], z[1], z[2]]);
  return { fwd, right: world(r).map(v => v * tx), up: world(u).map(v => v * ty), tan: [tx, ty], eye, lookM, X, Y, Z };
}
// Where the view's aim meets the deck, for the lightning.
function aimOnDeck(b) {
  const down = Math.max(0.08, -b.fwd[1]);
  const d = Math.min(3000, Math.max(30, (S.alt + 75) / down));
  return [b.fwd[0] * d, b.fwd[2] * d];
}

/* ---------- step ---------- */
let timeK = 1, lastInput = performance.now(), saveT = 0;
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
  const next = clamp(S.alt - S.v * dt, ALT_DEEP, ALT_TOP);
  // A zone whose program has not linked yet holds the capsule at its edge.
  if (MZ[zoneFor(next)] || !P) S.alt = next;
  else S.v = 0;
  if (S.alt <= ALT_DEEP && S.v > 0) S.v = 0;
  if (performance.now() - slideAt > 300) ui.slider?.set(depthOf(S.alt));
  saveT += dt;
  if (saveT > 2 && S.v !== 0) { saveT = 0; saveSpot(); }
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
  S.wipe += (wp - S.wipe) * (1 - Math.exp(-dt / TUNE.tWipe));
  S.tWipe += sdt * (frozen ? 0 : 0.08 + 0.45 * clamp(S.v / 5, 0, 1)) * TUNE.wipeSpeed;
  S.tGlass += sdt * (frozen ? 0 : 1);
  const heat = smooth(110, 200, S.alt) * clamp((S.v - 2) / 6, 0, 1);
  S.melt = S.alt > 245 && !S.diving ? Math.max(0, S.melt - dt * TUNE.frostBack) : Math.min(1, S.melt + heat * dt * TUNE.melt);
  // The head eases toward its targets, so moves feel bodily.
  const kh = 1 - Math.exp(-dt / 0.25);
  S.hx += (S.thx - S.hx) * kh; S.hy += (S.thy - S.hy) * kh;
  S.lean += (S.leanT - S.lean) * (1 - Math.exp(-dt / 0.35));
  if (Math.abs(S.leanT - S.lean) < 1e-4) S.lean = S.leanT;
  // The near fog streams up past the glass, faster with the fall.
  S.wispY += sdt * (3 + 50 * clamp(S.v / 5, 0, 1)) * TUNE.rushK;
  wgm.step(sdt, Math.min(60, Math.abs(S.v) * 10));
  // Each new crack jolts the capsule.
  const lvl = Math.floor(stressAt(S.alt) * 12);
  if (lvl > S.crackLvl && !frozen) S.shake += TUNE.jolt;
  S.crackLvl = lvl;
  // The crush: at the floor of the dive the hull fails; 2.5 s later the toy wakes at the top.
  if (S.crush < 0 && S.alt <= ALT_DEEP + 0.01) S.crush = 0;
  if (S.crush >= 0) {
    S.crush += dt / TUNE.tCrush;
    if (S.crush >= 1) {
      S.crush = -1; S.alt = ALT_TOP; S.v = 0; S.slideTo = null; S.diving = false; S.lum = luma(lightAt(S.alt)); S.melt = 0;
      B.strokes.length = 0; snd.cancel(); ui.slider?.set(0); saveSpot();
    }
  }
  // Dev previews run on their own clocks and leave the dive alone.
  if (S.crushDev >= 0) { S.crushDev += dt / TUNE.tCrush; if (S.crushDev >= 1) S.crushDev = -1; }
  S.entryDev = Math.max(0, S.entryDev - dt / 4);
  const b = basis();
  stepBolts(B, dt, { alt: S.alt, aim: aimOnDeck(b), soft: frozen, live: timeK > 0, deck: deckAt(S.alt) });
  for (const hd of B.heard.splice(0)) {
    const d = Math.hypot(hd.pos[0], hd.pos[1] - S.alt, hd.pos[2]);
    snd.thunder(d, hd.level, clamp(hd.pos[0] / Math.max(d, 1), -1, 1));
  }
  snd.update(dt, Math.abs(S.v), depthOf(S.alt), S.diving);
  return S.diving || S.v !== 0 || S.slideTo != null || busyBolts(B) || S.shake > 0.01 || S.crush >= 0 || S.crushDev >= 0 || S.entryDev > 0 || !!BK.job
    || Math.abs(S.thx - S.hx) + Math.abs(S.thy - S.hy) > 0.002 || S.lean !== S.leanT;
}

// How far into a void the eye is: 0 in the decks, the sky and the dark.
const voidAt = h => (1 - deckAt(h)) * (1 - smooth(-6, 0, h)) * smooth(-505, -495, h);
// The stress on the pane: none above 120 km down, full at the crush.
const stressAt = h => Math.pow(clamp((-120 - h) / (-120 - ALT_DEEP), 0, 1), 1.2);
// The eye's gain: it opens as the light fails, up to 8 times.
const gainAt = lum => clamp(Math.pow(Math.max(lum, 1e-7), -0.5), 1, TUNE.gainMax);
// How deep in a deck the eye is: 0 in the air and the voids, 1 inside cloud.
const bump = (a, b, x) => smooth(a - 1, a + 2, x) * (1 - smooth(b - 2, b + 1, x));
// Decks and the veil count whole; sheets count in part.
const DECK_K = { deck: 1, haze: 1, sheets: 0.4 };
const deckAt = h => Math.min(1, LAYERS.reduce((a, l) => a + (DECK_K[l.kind] || 0) * bump(l.bot + (l.id === 'ammonia' ? 2 : 0), l.top, h), 0));

/* ---------- render ---------- */
// ?qa: __gg.bench(n) renders n frames and waits for the GPU each time; it returns ms a frame.
if (QS.has('qa')) globalThis.__gg.bench = n => { const t0 = performance.now(); const px = new Uint8Array(4); for (let i = 0; i < n; i++) { render(1 / 60); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); } return (performance.now() - t0) / n; };
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
  // The march for the eye's zone; until it links, the start zone's.
  const M = MZ[zoneFor(S.alt)] || P.march;
  gl.useProgram(M.p);
  sunTo(M);
  gl.uniform4f(M.u.uTune, TUNE.ms, TUNE.amb, TUNE.bounce, TUNE.haze);
  gl.uniform1f(M.u.uRays, TUNE.rays);
  gl.uniform1f(M.u.uDbg, globalThis.__gg?.dbg || 0);
  const u = M.u;
  bind(gl, M, 'uMap', 0, T.map);
  bind(gl, M, 'uLut', 1, { tex: lut });
  gl.activeTexture(gl.TEXTURE2);
  gl.bindTexture(gl.TEXTURE_3D, vol);
  gl.uniform1i(u.uVol, 2);
  if (u.uSwirl) bind(gl, M, 'uSwirl', 4, swirl);
  if (u.uWall) {
    gl.activeTexture(gl.TEXTURE5);
    gl.bindTexture(gl.TEXTURE_2D_ARRAY, wall);
    gl.uniform1i(u.uWall, 5);
    twisterUniforms(S.tC, twA, twB, twC);
    // ?qa: __gg.noTw = true hides them, to time the march without them.
    if (globalThis.__gg?.noTw) { twB.fill(0); twC.fill(0); }
    // ?qa: __gg.twOnly = i shows only twister i.
    const only = globalThis.__gg?.twOnly;
    if (only != null) for (let i = 0; i < TW_MAX; i++) if (i !== only) { twB[i * 4 + 1] = 0; twC.fill(0, i * 4, i * 4 + 4); }
    gl.uniform4fv(u.uTwA, twA);
    gl.uniform4fv(u.uTwB, twB);
    gl.uniform4fv(u.uTwC, twC);
    gl.uniform1f(u.uTwLo, 0);
    gl.uniform1f(u.uTwHi, TW_MAX);
  }
  gl.uniform3fv(u.uCam, cam);
  gl.uniform3fv(u.uFwd, b.fwd); gl.uniform3fv(u.uRight, b.right); gl.uniform3fv(u.uUp, b.up);
  gl.uniform1f(u.uT, S.tC);
  gl.uniform1f(u.uTMap, S.tMap);
  gl.uniform1f(u.uSteps, Math.min(400, Math.round(m.steps * (1 + 0.3 * voidAt(S.alt)))));
  gl.uniform1f(u.uFine, m.fine);
  // In a void the eye sees to the horizon, 1,600 km; in a deck, 220 km.
  const vk = voidAt(S.alt);
  // Over the tops the window opens as wide as in a void.
  gl.uniform1f(u.uWin, 220 + 1380 * Math.max(vk, smooth(14, 30, S.alt)));
  gl.uniform1f(u.uSeed, frameNo % 64);
  // The sub-pixel shift; none when the march runs at full size.
  const js = T.march.w < W ? JIT[frameNo % 8] : [0, 0];
  const jit = [js[0] / T.march.w, js[1] / T.march.h];
  gl.uniform2fv(u.uJit, jit);
  flashUniform(B, flash);
  // Deep down the eye opens wider; the flashes dim to match, as they show at the water deck.
  const fk = Math.min(1, 2.2 / gainAt(S.lum)) * TUNE.flash;
  for (let i = 3; i < 16; i += 4) flash[i] *= fk;
  gl.uniform4fv(u.uFlash, flash);
  // The bake: start one when the eye hangs still and the old one no longer fits; stop it when the eye moves.
  const settled = !S.diving && Math.abs(S.v) < 0.05 && S.slideTo == null;
  if (TUNE.bake > 0 && !BK.tex) { BK.tex = cubeTex(BK.N, gl.RGBA16F); BK.texD = cubeTex(BK.N, gl.R16F); BK.dummy = cubeTex(1, gl.RGBA16F); BK.fb = gl.createFramebuffer(); }
  if (BK.job && (!settled || TUNE.bake <= 0)) { BK.job = null; BK.ok = false; }
  if (TUNE.bake > 0 && settled && !BK.job && (!BK.ok || Math.abs(S.alt - BK.alt) > 0.1 || BK.done !== BK.gen || BK.near !== TUNE.bake)) {
    BK.job = { f: 0, k: 0, p: 0 }; BK.ok = false; BK.alt = S.alt; BK.near = TUNE.bake;
  }
  const baked = TUNE.bake > 0 && BK.ok && !BK.job && Math.abs(S.alt - BK.alt) < 0.4;
  gl.uniform1f(u.uMode, baked ? 1 : 0);
  gl.uniform1f(u.uNear, BK.near);
  gl.activeTexture(gl.TEXTURE6);
  gl.bindTexture(gl.TEXTURE_CUBE_MAP, baked ? BK.tex : BK.dummy || null);
  gl.uniform1i(u.uFar, 6);
  gl.activeTexture(gl.TEXTURE7);
  gl.bindTexture(gl.TEXTURE_CUBE_MAP, baked ? BK.texD : BK.dummy || null);
  gl.uniform1i(u.uFarD, 7);
  M.u._steps = Math.min(400, Math.round(m.steps * (1 + 0.3 * voidAt(S.alt))));
  tri(gl, T.march, vao);
  if (BK.job) bakeStrips(M);
  // Pass 3b: blend into the last frame. A turn, a fast fall or a flash takes more of the new frame.
  const fwl = Math.hypot(...b.fwd), fw = b.fwd.map(x => x / fwl);
  const dA = Math.acos(Math.min(1, fw[0] * lastView.fwd[0] + fw[1] * lastView.fwd[1] + fw[2] * lastView.fwd[2]));
  const flashing = Math.max(flash[3], flash[7], flash[11], flash[15]) > 0.02;
  const hk = lastView.fresh ? 1 : Math.min(1, Math.max(0.15 + dA * 40 + Math.abs(S.alt - lastView.alt) * 0.8, flashing ? 0.6 : 0));
  lastView.fwd = fw; lastView.alt = S.alt; lastView.fresh = false;
  gl.useProgram(P.hist.p);
  bind(gl, P.hist, 'uCur', 0, T.march);
  bind(gl, P.hist, 'uPrev', 1, T.hist[1]);
  gl.uniform1f(P.hist.u.uK, hk);
  gl.uniform2fv(P.hist.u.uJit, jit);
  tri(gl, T.hist[0], vao);
  T.hist.reverse();
  // Pass 4: the composite.
  gl.useProgram(P.comp.p);
  sunTo(P.comp);
  bind(gl, P.comp, 'uClouds', 0, T.hist[1]);
  gl.uniform3fv(P.comp.u.uCam, cam);
  gl.uniform3fv(P.comp.u.uFwd, b.fwd); gl.uniform3fv(P.comp.u.uRight, b.right); gl.uniform3fv(P.comp.u.uUp, b.up);
  tri(gl, T.scene, vao);
  // The scene in discs at half size, for the view through fog on the pane.
  gl.useProgram(P.bok.p);
  bind(gl, P.bok, 'uScene', 0, T.scene);
  gl.uniform2f(P.bok.u.uRad, 0.012 * H / W, 0.012);
  tri(gl, T.bok, vao);
  // Pass 5: bloom on the outside, then the cabin, then the grade to the screen.
  const bl = bloom.render(T.scene.tex, W, H, { threshold: 1.1, cap: 8, levels: D.level > 0 ? 5 : 3 });
  gl.bindVertexArray(vao);
  gl.useProgram(P.cabin.p);
  sunTo(P.cabin);
  const c = P.cabin.u;
  bind(gl, P.cabin, 'uScene', 0, T.scene);
  bind(gl, P.cabin, 'uBloom', 1, { tex: bl });
  bind(gl, P.cabin, 'uBok', 2, T.bok);
  gl.activeTexture(gl.TEXTURE3);
  gl.bindTexture(gl.TEXTURE_3D, vol);
  gl.uniform1i(c.uVol, 3);
  // Against the window: the near fog's place, its density, and the brightest flash in capsule metres.
  gl.uniform3f(c.uWispP, 0, -S.wispY, 0);
  const inDeck = deckAt(S.alt);
  gl.uniform1f(c.uNear, fx('fxNear', Math.min(1, (S.alt < 24 ? 0.25 + 0.75 * inDeck : 0.25 * smooth(40, 24, S.alt)) * (S.alt > -505 ? 1 : 0) * (frozen ? 0.6 : 1))) * TUNE.near);
  const fd = [flash[0], flash[1] - S.alt, flash[2]], fl = Math.hypot(...fd) || 1;
  const fc = k => (fd[0] * b[k][0] + fd[1] * b[k][1] + fd[2] * b[k][2]) / fl * 25;
  gl.uniform3f(c.uFlashP, fc('X'), fc('Y'), fc('Z'));
  // On the window: runs, beads and fog; rime in the white deck; mist on the glass deep down.
  gl.uniform2fv(c.uM, wgm.m);
  gl.uniform1f(c.uFlow, wgm.flow);
  gl.uniform1f(c.uAir, wgm.speed);
  // No base fog: clear glass stays sharp.
  gl.uniform1f(c.uFog, fx('fxFog', 0.25 * inDeck * smooth(22, 18, S.alt) + 0.35 * smooth(-150, -500, S.alt)) * TUNE.fogK);
  gl.uniform1f(c.uIce, fx('fxIce', smooth(-1, 2, S.alt) * (1 - smooth(20, 23, S.alt))));
  // Stress bows and cracks the pane; the crush shatters it, with no white burst under reduced motion.
  gl.uniform1f(c.uStress, TUNE.cracks === 'off' ? 0 : TUNE.cracks === 'full' ? 1 : stressAt(S.alt));
  const cr = Math.max(S.crush, S.crushDev);
  gl.uniform1f(c.uCrush, cr < 0 ? 0 : frozen ? 0.3 + 0.7 * cr : cr);
  gl.uniform3fv(c.uEye, b.eye);
  gl.uniformMatrix3fv(c.uLook, false, b.lookM);
  gl.uniform2fv(c.uTan, b.tan);
  gl.uniform1f(c.uBloomK, 0.55);
  // With no frame the clouds fill the screen; bloom and shake stay.
  gl.uniform1f(c.uFrame, cabinOff() ? 0 : 1);
  gl.uniform1f(c.uTime, S.tGlass);
  gl.uniform1f(c.uWipe, fx('fxWipe', S.wipe));
  // Entry heat melts the frost; it forms again only near the top.
  gl.uniform1f(c.uFrost, fx('fxFrost', smooth(40, 120, S.alt) * (1 - S.melt)));
  // Rain and drops below the white deck, heaviest in the decks, gone under the last deck.
  gl.uniform1f(c.uWet, fx('fxWet', Math.min(1, smooth(2, -6, S.alt) * (1 - smooth(-480, -520, S.alt)) * (0.35 + 0.65 * deckAt(S.alt)))) * TUNE.wet);
  gl.uniform1f(c.uRush, clamp(S.v / 5, 0, 1));
  gl.uniform1f(c.uHeat, frozen ? 0 : fx('fxHeat', smooth(-80, -130, S.alt)));
  gl.uniform1f(c.uAsp, W / H);
  // Entry: the plasma glows while the capsule falls fast, high up.
  const entry = fx('fxEntry', Math.max(S.entryDev, smooth(110, 200, S.alt) * clamp((S.v - 2) / 6, 0, 1)));
  gl.uniform1f(c.uEntry, entry);
  gl.uniform1f(c.uDeck, deckAt(S.alt) * (frozen ? 0.5 : 1));
  gl.uniform1f(c.uFlash, Math.min(2.5, (flash[3] + flash[7] * 0.5) / (S.alt > 0 ? 400 : 1.2)));
  const a = S.shake * 0.0035, ph = performance.now() / 1000;
  gl.uniform2f(c.uShake, a * (Math.sin(ph * 37) + 0.5 * Math.sin(ph * 61)), a * (Math.sin(ph * 41 + 1) + 0.5 * Math.sin(ph * 73)));
  tri(gl, T.cabin, vao);
  gl.useProgram(P.fin.p);
  bind(gl, P.fin, 'uScene', 0, T.cabin);
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
// Two fingers pinch to lean, as the wheel does; a pinch never dives.
const touches = new Map();
let pinch0 = 0, lean0 = 0;
const spread = () => { const [a, b] = [...touches.values()]; return Math.hypot(a[0] - b[0], a[1] - b[1]); };
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
  if (e.pointerType === 'touch') touches.set(e.pointerId, [e.clientX, e.clientY]);
  if (touches.size === 2) {
    clearTimeout(holdT);
    if (mode === 'hold') release('pointer');
    mode = 'pinch'; pinch0 = spread(); lean0 = S.leanT;
    try { stage.setPointerCapture(e.pointerId); } catch { /* capture is optional */ }
    return;
  }
  try { stage.setPointerCapture(e.pointerId); } catch { /* capture is optional */ }
  pid = e.pointerId; down = true; mode = 'press'; px = e.clientX; py = e.clientY;
  // The first frame answers: the eye tips a little toward the fall.
  S.v = Math.max(S.v, 0.4);
  clearTimeout(holdT);
  holdT = setTimeout(() => { if (down && mode === 'press') { mode = 'hold'; press('pointer'); } }, 260);
  touch();
});
stage.addEventListener('pointermove', e => {
  // Hover sways the head on mouse devices, as in Window seat; reduced motion keeps it still.
  if (e.pointerType === 'mouse' && !frozen) {
    const r = stage.getBoundingClientRect();
    S.thx = clamp((e.clientX - r.left) / r.width * 2 - 1, -1, 1);
    S.thy = -clamp((e.clientY - r.top) / r.height * 2 - 1, -1, 1);
    wake();
  }
  if (mode === 'pinch' && touches.has(e.pointerId)) {
    touches.set(e.pointerId, [e.clientX, e.clientY]);
    if (touches.size === 2) { S.leanT = clamp(lean0 + (spread() - pinch0) / Math.max(1, Math.min(cssW, cssH)) * 1.5, 0, 1); touch(); }
    return;
  }
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
  if (e && e.pointerType === 'touch') touches.delete(e.pointerId);
  if (mode === 'pinch') { if (touches.size < 2) { mode = ''; down = false; pid = null; } return; }
  if (!down || (e && e.pointerId !== pid)) return;
  down = false; pid = null; clearTimeout(holdT);
  // A tap sinks the eye a little.
  if (mode === 'press' && e.type === 'pointerup') S.v = Math.max(S.v, 2.5);
  if (mode === 'hold') release('pointer');
  mode = '';
  touch();
}
['pointerup', 'pointercancel', 'lostpointercapture'].forEach(t => stage.addEventListener(t, end));
stage.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') { S.thx = 0; S.thy = 0; wake(); } });
// The wheel leans toward the glass or back into the seat.
stage.addEventListener('wheel', e => { e.preventDefault(); S.leanT = clamp(S.leanT - e.deltaY * 0.0012, 0, 1); touch(); }, { passive: false });

/* ---------- life cycle ---------- */
whenVisible(stage, on => {
  visible = on;
  if (on) wake();
  else { halt(); snd.hide(); }
});
onReducedChange(on => { frozen = on; wake(); });
sound.onChange(on => { if (on) touch(); else snd.cancel(); });
new ResizeObserver(() => resize()).observe(stage);
// A lost context saves the spot; the reload resumes there.
onContextLoss(canvas, { lost: () => { saveSpot(); halt(); }, restored: () => location.reload(), failed: () => { fail.hidden = false; } });

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
  linkRest().catch(err => console.error(err));
} catch (err) {
  console.error(err);
  watch.fail(err);
  fail.hidden = false;
  mark('first-frame');
}
await introDone;
