// Calm jar: the stage is the inside of a jar of clear liquid full of glitter.
// Drag swirls the liquid; flakes lift, tumble and flash, then settle by size.
// Plan: docs/plans/calmjar.md. Toy doc: docs/toys/calmjar.md.
import { initPage, whenVisible, fitCanvas, reduced, onReducedChange, linFit, quality, onQuality, audioKit, stage as mark, pageReady } from '../shared/stim.js';
import { intro as playIntro } from '../shared/intro.js';
import { TRI_VS, program, linked, target, free, bind, to, tri, onContextLoss } from '../shared/gl.js';
import { bloomChain } from '../shared/glow.js';
import { GRADE } from '../shared/grade.js';
mark('libs');
playIntro({ ready: pageReady() });

const ID = 'calmjar';
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a, b) => a + Math.random() * (b - a);
const ease = t => t * t * (3 - 2 * t);
let reduce = reduced();

/* ---------- settings ---------- */
// Settings persist per browser; storage is optional.
const saved = k => { try { return localStorage.getItem(`stimming.${ID}.${k}`); } catch { return null; } };
const save = (k, v) => { try { localStorage.setItem(`stimming.${ID}.${k}`, String(v)); } catch { /* storage is optional */ } };
const num = (k, d, a, b) => { const v = Number(saved(k)); return saved(k) != null && Number.isFinite(v) && v >= a && v <= b ? v : d; };
const coarse = matchMedia('(pointer: coarse)').matches;
const opts = {
  glitter: ['holo', 'gold', 'ocean', 'ember'].includes(saved('glitter')) ? saved('glitter') : 'holo',
  thick: num('thick', 0.45, 0, 1),
  flakes: num('flakes', 1, 0.3, 1.6),
  light: saved('light') === 'side' ? 'side' : 'back',
};

/* ---------- glitter ---------- */
// Four size classes: big hexes, mid hexes, small hexes or slivers, fine dust.
// share: the part of the flakes; r: radius in px on an 800 px stage.
// fall: settling speed in jar heights per second, in thin liquid.
// bed: the part of the settled bed that the class fills.
const CLASS = [
  { share: 0.06, r: 7.2, fall: 0.2, bed: 0.36, drift: 0.012 },
  { share: 0.14, r: 4.6, fall: 0.11, bed: 0.27, drift: 0.03 },
  { share: 0.28, r: 2.9, fall: 0.065, bed: 0.21, drift: 0.1 },
  { share: 0.52, r: 1.35, fall: 0.038, bed: 0.16, drift: 0.5 },
];
// The settled bed fills this part of the jar height.
const BED_TOP = 0.16;
// Each palette: liquid colour, then per class an OKLCH base and a holo part.
// shape 1 draws long slivers in place of small hexes.
const PALETTES = {
  holo: { liquid: [0.36, 0.13, 298], glow: [0.62, 0.15, 305], shape: 0,
    cls: [[0.86, 0.012, 250, 1], [0.74, 0.1, 318, 1], [0.8, 0.08, 225, 1], [0.86, 0.1, 350, 0.8]] },
  gold: { liquid: [0.3, 0.09, 350], glow: [0.58, 0.12, 20], shape: 0,
    cls: [[0.84, 0.14, 86, 0.25], [0.74, 0.11, 38, 0.3], [0.9, 0.09, 96, 0.2], [0.9, 0.05, 75, 0.15]] },
  ocean: { liquid: [0.32, 0.08, 225], glow: [0.6, 0.1, 205], shape: 1,
    cls: [[0.78, 0.12, 190, 0.5], [0.64, 0.16, 292, 0.6], [0.74, 0.13, 248, 0.5], [0.86, 0.09, 182, 0.4]] },
  ember: { liquid: [0.27, 0.1, 22], glow: [0.55, 0.15, 40], shape: 0,
    cls: [[0.7, 0.13, 52, 0.35], [0.6, 0.19, 26, 0.35], [0.78, 0.15, 64, 0.3], [0.84, 0.1, 78, 0.2]] },
};
// Each light: the key direction toward the light, its lobe and its strength.
const LIGHTS = {
  back: { dir: [0.22, 0.5, 0.84], sharp: 90, halo: 7, key: 7, side: 0 },
  side: { dir: [-0.86, 0.3, 0.41], sharp: 260, halo: 18, key: 14, side: 1 },
};

/* ---------- bar ---------- */
const ui = initPage({ id: ID, bar: {
  choice: {
    label: 'Glitter', value: opts.glitter,
    options: [
      { value: 'holo', label: 'Holo', dot: 'oklch(0.78 0.1 318)', key: '1' },
      { value: 'gold', label: 'Gold', dot: 'oklch(0.84 0.14 86)', key: '2' },
      { value: 'ocean', label: 'Ocean', dot: 'oklch(0.74 0.13 200)', key: '3' },
      { value: 'ember', label: 'Ember', dot: 'oklch(0.66 0.18 35)', key: '4' },
    ],
    onPick: v => { opts.glitter = v; save('glitter', v); redraw(); },
  },
  actions: [
    { verb: 'shake', key: 'S', hold: true, onDown: () => shakeOn(true), onUp: () => shakeOn(false) },
    { verb: 'flip', key: 'F', onPress: () => flip() },
  ],
  slider: { label: 'Thickness', min: 0, max: 1, step: 0.01, value: opts.thick, onInput: v => { opts.thick = v; save('thick', v); } },
  settings: [
    { id: 'flakes', type: 'slider', label: 'Flakes', min: 0.3, max: 1.6, step: 0.05, value: 1, persist: true, onInput: v => { opts.flakes = v; redraw(); } },
    { id: 'light', type: 'choice', label: 'Light', value: 'back', persist: true,
      options: [{ value: 'back', label: 'Back' }, { value: 'side', label: 'Side' }],
      onPick: v => { opts.light = v; redraw(); } },
  ],
  quality: true,
  reset: () => resetJar(),
  keys: [['drag', 'swirl'], ['click', 'lift'], ['S', 'shake'], ['F', 'flip']],
  // Bar v3 lists every input in How to play: one instruction per row.
  help: [['drag', 'Swirl the liquid'], ['click', 'Lift a puff of glitter from the bed'], ['S', 'Shake the jar while you hold it'], ['F', 'Turn the jar over']],
} });

/* ---------- WebGL2 ---------- */
const stage = document.getElementById('stage');
const canvas = document.createElement('canvas');
canvas.setAttribute('aria-hidden', 'true');
stage.prepend(canvas);
const gl = canvas.getContext('webgl2', { antialias: false, alpha: false, depth: false, stencil: false, premultipliedAlpha: false, powerPreference: 'high-performance' });
let failed = false;
// Without WebGL 2 and float targets the bar stays, but its controls take no input.
function fail(err) {
  if (err) console.error(err);
  failed = true;
  stage.querySelector('.fail').hidden = false;
  ui.choice.disabled = ui.slider.disabled = true;
  for (const v of ['shake', 'flip']) ui.action(v).disabled = true;
  mark('first-frame');
}

// Flake state lives in two float textures, one texel per flake.
const TEX = 256, SLOTS = TEX * TEX;
// The bed map: one column per texel; sixteen rows sum to its height.
// Spread over rows, each sum stays small enough for half floats.
const BEDW = 256, BEDR = 16;
const JACOBI = 22;
const MAXS = 6, MAXP = 4;

const HEAD = `#version 300 es
precision highp float;
precision highp int;
precision highp sampler2D;
`;
// Per-flake constants come from a hash of the flake's slot.
const FLAKE = `
uint fh(uint x) { x ^= x >> 16; x *= 0x7feb352du; x ^= x >> 15; x *= 0x846ca68bu; x ^= x >> 16; return x; }
float fr(uint i, uint k) { return float(fh(i * 16u + k) >> 8) / 16777216.0; }
int fClass(uint i, vec3 cum) { float h = fr(i, 0u); return h < cum.x ? 0 : h < cum.y ? 1 : h < cum.z ? 2 : 3; }
// The tilt is two angles; the normal always faces the viewer.
vec3 fNormal(vec2 t) { float cb = cos(t.y); vec3 n = vec3(sin(t.x) * cb, sin(t.y), cos(t.x) * cb); return n.z < 0.0 ? -n : n; }
`;

/* ---------- K5: 2D fluid ---------- */
// Lifted from Oil slick: advect, divergence, Jacobi and gradient passes.
// Changes: no-slip walls on all four sides, viscosity from Thickness, body forces.
const ADV_FS = HEAD + `
in vec2 vUv;
out vec4 o;
uniform sampler2D uVel;
uniform vec2 uTex;
uniform float uA, uDt, uDamp, uVisc;
void main() {
  ivec2 c = ivec2(gl_FragCoord.xy), s = textureSize(uVel, 0);
  // The jar walls hold the liquid still: no slip on all four sides.
  if (c.x == 0 || c.y == 0 || c.x == s.x - 1 || c.y == s.y - 1) { o = vec4(0.0); return; }
  vec2 v = texture(uVel, vUv).xy, b = vUv - uDt * v / vec2(uA, 1.0);
  vec2 n = texture(uVel, b).xy;
  vec2 avg = 0.25 * (texture(uVel, b + vec2(uTex.x, 0.0)).xy + texture(uVel, b - vec2(uTex.x, 0.0)).xy
    + texture(uVel, b + vec2(0.0, uTex.y)).xy + texture(uVel, b - vec2(0.0, uTex.y)).xy);
  o = vec4(mix(n, avg, uVisc) * uDamp, 0.0, 1.0);
}`;
const DIV_FS = HEAD + `
out vec4 o;
uniform sampler2D uVel;
uniform vec2 uH;
void main() {
  ivec2 c = ivec2(gl_FragCoord.xy), s = textureSize(uVel, 0) - 1;
  float L = texelFetch(uVel, clamp(c - ivec2(1, 0), ivec2(0), s), 0).x;
  float R = texelFetch(uVel, clamp(c + ivec2(1, 0), ivec2(0), s), 0).x;
  float B = texelFetch(uVel, clamp(c - ivec2(0, 1), ivec2(0), s), 0).y;
  float T = texelFetch(uVel, clamp(c + ivec2(0, 1), ivec2(0), s), 0).y;
  o = vec4(0.5 * ((R - L) / uH.x + (T - B) / uH.y), 0.0, 0.0, 1.0);
}`;
// One Jacobi sweep; clamped reads keep the walls closed.
const JAC_FS = HEAD + `
out vec4 o;
uniform sampler2D uP, uDiv;
uniform vec2 uH;
uniform float uKeep;
void main() {
  ivec2 c = ivec2(gl_FragCoord.xy), s = textureSize(uP, 0) - 1;
  float L = texelFetch(uP, clamp(c - ivec2(1, 0), ivec2(0), s), 0).x;
  float R = texelFetch(uP, clamp(c + ivec2(1, 0), ivec2(0), s), 0).x;
  float B = texelFetch(uP, clamp(c - ivec2(0, 1), ivec2(0), s), 0).x;
  float T = texelFetch(uP, clamp(c + ivec2(0, 1), ivec2(0), s), 0).x;
  vec2 k = 1.0 / (uH * uH);
  float p = (((L + R) * k.x + (B + T) * k.y) * uKeep - texelFetch(uDiv, c, 0).x) / (2.0 * (k.x + k.y));
  o = vec4(p, 0.0, 0.0, 1.0);
}`;
const GRAD_FS = HEAD + `
out vec4 o;
uniform sampler2D uP, uVel;
uniform vec2 uH;
void main() {
  ivec2 c = ivec2(gl_FragCoord.xy), s = textureSize(uP, 0) - 1;
  if (c.x == 0 || c.y == 0 || c.x == s.x || c.y == s.y) { o = vec4(0.0); return; }
  float L = texelFetch(uP, c - ivec2(1, 0), 0).x, R = texelFetch(uP, c + ivec2(1, 0), 0).x;
  float B = texelFetch(uP, c - ivec2(0, 1), 0).x, T = texelFetch(uP, c + ivec2(0, 1), 0).x;
  o = vec4(texelFetch(uVel, c, 0).xy - 0.5 * vec2((R - L) / uH.x, (T - B) / uH.y), 0.0, 1.0);
}`;
/* ---------- end K5 ---------- */

// Forces: the finger drags the liquid, a tap blows a jet up from the bed,
// a shake rolls the liquid as one big eddy, and a flip turns it against the jar.
const FORCE_FS = HEAD + `
in vec2 vUv;
out vec4 o;
uniform sampler2D uVel, uBed;
uniform float uA, uK, uDt, uShake, uSpin, uFloor;
uniform int uN, uNP;
uniform vec4 uSeg[${MAXS}];
uniform vec4 uSegV[${MAXS}];
uniform vec4 uPuff[${MAXP}];
float seg(vec2 p, vec2 a, vec2 b) {
  vec2 pa = p - a, ba = b - a;
  return length(pa - ba * clamp(dot(pa, ba) / max(dot(ba, ba), 1e-10), 0.0, 1.0));
}
void main() {
  vec2 v = texture(uVel, vUv).xy, p = vUv * vec2(uA, 1.0);
  for (int i = 0; i < ${MAXS}; i++) {
    if (i >= uN) break;
    float d = seg(p, uSeg[i].xy, uSeg[i].zw) / uSegV[i].z;
    v = mix(v, uSegV[i].xy, uK * uSegV[i].w * exp(-d * d));
  }
  // A puff: an upward jet from the bed's surface that spreads at its foot.
  for (int i = 0; i < ${MAXP}; i++) {
    if (i >= uNP) break;
    vec2 at = vec2(uPuff[i].x, uFloor + texture(uBed, vec2(uPuff[i].x / uA, 0.5)).r - 0.01);
    vec2 d = (p - at) / uPuff[i].z;
    v += uDt * uPuff[i].w * exp(-dot(d, d)) * vec2(d.x * 0.6, 1.0);
  }
  // The shake drives the first slosh mode: one eddy that fills the jar.
  vec2 q = vec2(p.x / uA, p.y) * 3.14159;
  v += uDt * uShake * vec2(sin(q.x) * cos(q.y) * 1.2, -cos(q.x) * sin(q.y) / uA);
  // A flip spins the liquid against the jar, as a solid body.
  v += uDt * uSpin * vec2(-(p.y - 0.5), p.x - 0.5 * uA);
  // The pile is porous: flow dies inside it, so a swirl wears it from the top.
  float hb = uFloor + texture(uBed, vec2(vUv.x, 0.5)).r;
  v *= 1.0 - smoothstep(hb - 0.008, hb - 0.035, p.y) * (1.0 - exp(-uDt * 30.0));
  o = vec4(v, 0.0, 1.0);
}`;

/* ---------- flakes ---------- */
// The first frame: a settled bed in layers, with dust still in the water.
const INIT_FS = HEAD + FLAKE + `
layout(location = 0) out vec4 oP;
layout(location = 1) out vec4 oQ;
uniform float uA;
uniform vec3 uCum;
uniform vec2 uBand[4];
uniform float uDrift[4];
void main() {
  ivec2 c = ivec2(gl_FragCoord.xy);
  uint i = uint(c.y * ${TEX} + c.x);
  int k = fClass(i, uCum);
  float x = (0.006 + 0.988 * fr(i, 5u)) * uA, y, rest;
  vec2 tilt = vec2(fr(i, 6u) * 6.2832, (fr(i, 7u) - 0.5) * 2.6);
  if (fr(i, 8u) < uDrift[k]) {
    // Dust hangs as a slow cloud through the middle of the jar.
    float m = k == 3 ? (fr(i, 3u) + fr(i, 10u) + fr(i, 11u)) / 3.0 : fr(i, 3u);
    y = mix(uBand[3].y + 0.04, 0.95, m);
    rest = 0.0;
  } else {
    y = mix(uBand[k].x, uBand[k].y, fr(i, 3u));
    rest = 1.0;
  }
  oP = vec4(x, y, tilt);
  oQ = vec4(0.0, 0.0, rest, 0.0);
}`;
// One step: each flake rides the liquid, sinks at its own speed and tumbles.
// A resting flake skips the step until the flow at its place lifts it.
const STEP_FS = HEAD + FLAKE + `
layout(location = 0) out vec4 oP;
layout(location = 1) out vec4 oQ;
uniform sampler2D uP, uQ, uVel, uBed;
uniform float uA, uDt, uT, uSlow, uLift, uTumble, uFloor;
uniform vec2 uG, uKick;
uniform vec3 uCum;
uniform float uFall[4];
uniform int uN;
void main() {
  ivec2 c = ivec2(gl_FragCoord.xy);
  int idx = c.y * ${TEX} + c.x;
  vec4 P = texelFetch(uP, c, 0), Q = texelFetch(uQ, c, 0);
  if (idx >= uN) { oP = P; oQ = Q; return; }
  uint i = uint(idx);
  int k = fClass(i, uCum);
  float fall = uFall[k] * (0.85 + 0.3 * fr(i, 1u)) / uSlow;
  vec2 uv = vec2(P.x / uA, P.y);
  vec2 v = texture(uVel, uv).xy;
  float bed = uFloor + texture(uBed, vec2(uv.x, 0.5)).r;
  // Big flakes need more flow to lift than dust.
  float need = uLift * (0.07 + 0.7 * fall);
  bool down = uG.y < -0.7;
  if (Q.z > 0.5 && length(v) < need && P.y < bed + 0.01 && down) { oP = P; oQ = vec4(0.0, 0.0, 1.0, 0.0); return; }
  vec2 x = P.xy + (v + (uG + uKick) * fall) * uDt;
  x = clamp(x, vec2(0.004, uFloor + 0.003), vec2(uA - 0.004, 0.996));
  // Vorticity turns the flake; a falling flake flutters like a leaf.
  vec2 e = 1.0 / vec2(textureSize(uVel, 0));
  float w = (texture(uVel, uv + vec2(e.x, 0.0)).y - texture(uVel, uv - vec2(e.x, 0.0)).y) / (2.0 * e.x * uA)
    - (texture(uVel, uv + vec2(0.0, e.y)).x - texture(uVel, uv - vec2(0.0, e.y)).x) / (2.0 * e.y);
  float s1 = fr(i, 2u), s2 = fr(i, 4u);
  float flut = sin(uT * (1.2 + 2.6 * s1) + s2 * 6.2832) * fall * 26.0;
  vec2 aim = vec2(w * (0.18 + 0.2 * s1) + flut, w * (0.12 + 0.2 * s2) * (s1 > 0.5 ? 1.0 : -1.0) + flut * 0.4);
  vec2 rate = mix(Q.xy, aim, 1.0 - exp(-uDt * 3.0)) * uTumble;
  vec2 tilt = P.zw + rate * uDt;
  float rest = down && x.y <= bed && length(v) < need ? 1.0 : 0.0;
  // A flake near the surface lies on it; a deep one stays where it stops.
  if (rest > 0.5 && x.y > bed - 0.03) x.y = bed - 0.004;
  oP = vec4(x, tilt);
  oQ = vec4(rate, rest, 0.0);
}`;
// A flip ends: the state turns 180 degrees, so gravity points down again.
const TURN_FS = HEAD + `
layout(location = 0) out vec4 oP;
layout(location = 1) out vec4 oQ;
uniform sampler2D uP, uQ;
uniform float uA;
void main() {
  ivec2 c = ivec2(gl_FragCoord.xy);
  vec4 P = texelFetch(uP, c, 0), Q = texelFetch(uQ, c, 0);
  oP = vec4(uA - P.x, 1.0 - P.y, -P.zw);
  oQ = vec4(Q.xy, 0.0, 0.0);
}`;
// The stage changes shape: flakes keep their place across the width.
const SCALE_FS = HEAD + `
layout(location = 0) out vec4 oP;
layout(location = 1) out vec4 oQ;
uniform sampler2D uP, uQ;
uniform float uK, uF0, uF1;
void main() {
  ivec2 c = ivec2(gl_FragCoord.xy);
  vec4 P = texelFetch(uP, c, 0);
  oP = vec4(P.x * uK, uF1 + (P.y - uF0) * (1.0 - uF1) / (1.0 - uF0), P.zw);
  oQ = texelFetch(uQ, c, 0);
}`;
const TURNV_FS = HEAD + `
in vec2 vUv;
out vec4 o;
uniform sampler2D uVel;
void main() { o = vec4(-texture(uVel, 1.0 - vUv).xy, 0.0, 1.0); }`;

// The bed: each resting flake adds its volume to one cell of its column.
const BED_VS = HEAD + FLAKE + `
uniform sampler2D uP, uQ;
uniform float uA, uFloor;
uniform vec3 uCum;
uniform float uVol[4];
uniform int uTop;
out float vV;
void main() {
  ivec2 c = ivec2(gl_VertexID & ${TEX - 1}, gl_VertexID >> 8);
  vec4 P = texelFetch(uP, c, 0), Q = texelFetch(uQ, c, 0);
  gl_PointSize = 1.0;
  // Mode two marks the highest resting flake of each column instead.
  vV = uTop == 1 ? P.y - uFloor + 0.004 : uVol[fClass(uint(gl_VertexID), uCum)];
  float row = uTop == 1 ? 0.0 : (float(gl_VertexID & ${BEDR - 1}) + 0.5) / ${BEDR}.0 * 2.0 - 1.0;
  gl_Position = Q.z > 0.5 ? vec4(P.x / uA * 2.0 - 1.0, row, 0.0, 1.0) : vec4(2.0, 2.0, 0.0, 1.0);
}`;
const BED_FS = HEAD + `
in float vV;
out vec4 o;
void main() { o = vec4(vV, 0.0, 0.0, 0.0); }`;
// The rows sum to a height; a tent over a fixed width of the jar smooths it.
// The walls mirror the columns, so the bed stays level at its ends.
// The height never passes the top flakes, so no pile stands without glitter.
const BEDSUM_FS = HEAD + `
out vec4 o;
uniform sampler2D uCells, uTops;
uniform int uR;
int wall(int x) { return x < 0 ? -x - 1 : x > ${BEDW - 1} ? ${2 * BEDW - 1} - x : x; }
float col(int x) {
  float s = 0.0;
  for (int r = 0; r < ${BEDR}; r++) s += texelFetch(uCells, ivec2(x, r), 0).r;
  return s;
}
float top(int x) {
  float m = 0.0;
  for (int d = -2; d <= 2; d++) m = max(m, texelFetch(uTops, ivec2(wall(x + d), 0), 0).r);
  return m;
}
void main() {
  int x = int(gl_FragCoord.x);
  float h = 0.0, t = 0.0, ws = 0.0;
  for (int d = -24; d <= 24; d++) {
    if (abs(d) > uR) continue;
    float w = float(uR + 1 - abs(d));
    h += w * col(wall(x + d));
    t += w * top(x + d);
    ws += w;
  }
  o = vec4(min(h, t + 0.012 * ws) / ws, 0.0, 0.0, 1.0);
}`;

// The liquid behind the flakes, lit from behind; the bed's mass at its foot.
const BACK_FS = HEAD + `
in vec2 vUv;
out vec4 o;
uniform sampler2D uBed;
uniform float uA, uSide, uFloor;
uniform vec3 uLiq, uGlow, uBedC;
void main() {
  vec2 q = vec2((vUv.x - 0.5) * uA, vUv.y - 0.5);
  // Back light: one broad soft glow behind the liquid, high of centre.
  vec2 b = q - vec2(0.0, 0.14);
  float back = exp(-dot(b, b) * 2.2);
  // Side light: the glow comes from the left; the far side falls dark.
  float side = exp(-pow(vUv.x * 1.8, 2.0)) * 1.5 + 0.1 * (1.0 - vUv.x);
  float lit = mix(0.22 + back, 0.05 + side, uSide);
  vec3 c = uLiq * 0.12 + uGlow * lit * 0.24;
  // The liquid deepens toward the floor.
  c *= mix(0.45, 1.0, smoothstep(uFloor, 0.75, vUv.y));
  // The bed reads as a mass under its loose top.
  float y = vUv.y - uFloor;
  float h = texture(uBed, vec2(vUv.x, 0.5)).r;
  float under = smoothstep(h * 0.85 + 0.002, h * 0.85 - 0.014, y);
  // Inside, the pile is a dim fleck of glitter in the shade of the flakes above.
  uvec2 fq = uvec2(gl_FragCoord.xy / 3.0);
  uint n = (fq.x * 1597334677u) ^ (fq.y * 3812015801u);
  n *= 1597334677u; n ^= n >> 16;
  float fleck = float(n & 1023u) / 1023.0;
  vec3 fill = (uBedC * 0.3 + uLiq * 0.05) * (0.5 + 1.1 * fleck * fleck) * (0.3 + 0.7 * clamp(y / max(h, 0.02), 0.0, 1.0));
  c = mix(c, fill, under);
  // Under the bed: the jar's thick glass foot, dark, with a lit inner face.
  if (y < 0.0) {
    float d = -y / max(uFloor, 1e-3);
    c = uBedC * 0.18 * (1.0 - d * 0.7) + uGlow * 0.05 * (1.0 - d);
    c += uGlow * 0.6 * exp(-pow(y / 0.0025, 2.0));
    c += uGlow * 0.12 * exp(-pow((d - 0.55) / 0.08, 2.0)) * smoothstep(0.0, 0.3, min(vUv.x, 1.0 - vUv.x));
  }
  o = vec4(c, 1.0);
}`;

// Each flake is one point sprite: a small mirror with a holo film.
const DRAW_VS = HEAD + FLAKE + `
uniform sampler2D uP;
uniform float uA, uPx;
uniform vec3 uCum;
uniform float uR[4];
uniform int uSliver;
out vec3 vN;
out vec2 vAxis;
flat out int vK;
out float vR, vSeed, vScale, vSq, vDim;
void main() {
  ivec2 c = ivec2(gl_VertexID & ${TEX - 1}, gl_VertexID >> 8);
  vec4 P = texelFetch(uP, c, 0);
  uint i = uint(gl_VertexID);
  int k = fClass(i, uCum);
  // Near flakes draw larger and brighter; far ones fade into the liquid.
  float depth = fr(i, 3u);
  float r = uR[k] * mix(0.7, 1.2, depth) * uPx;
  vec3 n = fNormal(P.zw);
  vN = n;
  vK = k;
  vSeed = fr(i, 2u);
  vDim = mix(0.55, 1.0, depth);
  // The in-plane axis and the squash come from the tilt.
  vec2 ax = length(n.xy) > 1e-4 ? normalize(n.xy) : vec2(1.0, 0.0);
  vAxis = ax;
  vSq = max(abs(n.z), k == 2 && uSliver == 1 ? 0.12 : 0.2);
  float ext = k == 2 && uSliver == 1 ? 2.4 : 1.0;
  vR = r;
  float size = 2.0 * r * ext + 3.0;
  vScale = size * 0.5;
  gl_PointSize = size;
  gl_Position = vec4(P.x / uA * 2.0 - 1.0, P.y * 2.0 - 1.0, 0.0, 1.0);
}`;
const DRAW_FS = HEAD + `
in vec3 vN;
in vec2 vAxis;
flat in int vK;
in float vR, vSeed, vScale, vSq, vDim;
out vec4 o;
uniform vec3 uBase[4];
uniform float uHolo[4];
uniform vec3 uL, uFill;
uniform float uSharp, uHalo, uKey, uSteady;
uniform int uSliver;
// A smooth spectrum for the diffraction film.
vec3 spectrum(float h) { return clamp(0.55 + 0.6 * cos(6.2832 * (h + vec3(0.0, 0.33, 0.67))), 0.0, 1.0); }
void main() {
  // Sprite pixels, in units of the flake radius.
  vec2 p = (gl_PointCoord * 2.0 - 1.0) * vec2(1.0, -1.0) * vScale / vR;
  vec2 q = vec2(dot(p, vAxis), dot(p, vec2(-vAxis.y, vAxis.x)));
  float d, aa = 1.0 / vR;
  if (vK == 3) {
    // Dust: a soft round grain.
    d = length(p);
    aa = max(aa, 0.6);
  } else if (vK == 2 && uSliver == 1) {
    // A sliver: a long thin strip, foreshortened by its tilt.
    q.x /= vSq;
    q.y *= 0.42;
    d = max(abs(q.x) * 2.6, abs(q.y));
  } else {
    // A hex, foreshortened along the tilt axis.
    q.x /= vSq;
    q = abs(q);
    d = max(q.x * 0.866 + q.y * 0.5, q.y);
  }
  float cov = clamp((1.0 - d) / aa + 0.5, 0.0, 1.0);
  if (cov <= 0.0) discard;
  vec3 n = vN;
  vec3 R = reflect(vec3(0.0, 0.0, -1.0), n);
  float g = max(dot(R, uL), 0.0);
  vec3 base = uBase[vK];
  float holo = uHolo[vK];
  // Near the mirror angle the film splits the light into a spectrum.
  vec3 film = mix(base * 1.2, spectrum(vSeed * 0.3 + acos(g) * 2.6), holo);
  float halo = pow(g, uHalo);
  float glint = pow(g, uSharp);
  // Reduced motion: the flakes glow steadily and never flash.
  halo = mix(halo, 0.1, uSteady);
  glint = mix(glint, 0.0, uSteady);
  // Off the light, a flake mirrors the dim glow of the liquid round it.
  vec3 env = uFill * (0.35 + 0.65 * max(R.y, 0.0)) * (0.5 + 0.5 * vSeed);
  vec3 col = base * env + film * halo * uKey * 0.16 + glint * uKey * mix(vec3(1.0), film, 0.3);
  col *= vDim;
  float a = cov * (vK == 3 ? 0.45 : 1.0);
  o = vec4(col * a, a);
}`;

// The last pass: the jar turns, the glass bends the edges, bloom, grade.
const FINAL_FS = HEAD + GRADE + `
in vec2 vUv;
out vec4 o;
uniform sampler2D uScene, uBloom;
uniform vec2 uRes;
uniform float uA, uRot, uCover, uBloomK, uFade, uSeed;
uniform vec2 uOff;
uniform vec3 uLine;
vec3 aces(vec3 x) { return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0); }
vec2 jar(vec2 uv) {
  vec2 p = (uv - 0.5) * vec2(uA, 1.0);
  float c = cos(uRot), s = sin(uRot);
  p = mat2(c, s, -s, c) * p / uCover;
  return p / vec2(uA, 1.0) + 0.5 + uOff;
}
void main() {
  // Distance to the nearest side wall, in jar heights.
  float ex = min(vUv.x, 1.0 - vUv.x) * uA;
  float k = 1.0 - smoothstep(0.0, 0.1, ex);
  // The curved wall magnifies what lies next to it and splits its colour.
  float pull = sign(0.5 - vUv.x) * k * k * 0.022 / uA;
  vec2 su = vUv + vec2(pull, 0.0);
  vec2 ca = vec2(sign(0.5 - vUv.x) * k * k * 0.0015 / uA, 0.0);
  vec3 c;
  c.r = texture(uScene, jar(su + ca)).r;
  c.g = texture(uScene, jar(su)).g;
  c.b = texture(uScene, jar(su - ca)).b;
  c += texture(uBloom, jar(su)).rgb * uBloomK;
  // One bright refracted line runs down each wall, curved like the glass.
  float yy = vUv.y - 0.55;
  float lx = 0.03 + 0.03 * yy * yy;
  float line = exp(-pow((ex - lx) / 0.0026, 2.0)) * smoothstep(0.98, 0.5, abs(yy) * 1.6);
  c += uLine * line;
  // The glass wall itself dims the last sliver of the view.
  c *= 0.55 + 0.45 * smoothstep(0.0, 0.025, ex);
  c = aces(c * 1.05);
  c = gdGrade(c, vUv, uRes.x / uRes.y, gl_FragCoord.xy + uSeed, vec3(0.0), 0.32, 0.45, 0.035);
  o = vec4(pow(c, vec3(1.0 / 2.2)) * uFade, 1.0);
}`;

/* ---------- GL objects ---------- */
let P = null, bloom = null, vao = null;
let flakeP = null, flakeQ = null, bedCells = null, bedH = null, bedTop = null, scene = null;
let vel = null, pres = null, div = null;
let W = 1, H = 1, A = 1, SW = 0, SH = 0, rung = 0;
const mrt = (w, h) => {
  const t = [target(gl, w, h, { format: gl.RGBA32F, filter: gl.NEAREST }), target(gl, w, h, { format: gl.RGBA32F, filter: gl.NEAREST })];
  const fb = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t[0].tex, 0);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT1, gl.TEXTURE_2D, t[1].tex, 0);
  gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1]);
  return { p: t[0], q: t[1], fb, w, h };
};
const pair = (w, h, format) => ({ r: target(gl, w, h, { format, clear: true }), w: target(gl, w, h, { format, clear: true }), swap() { [this.r, this.w] = [this.w, this.r]; } });

async function build() {
  vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  P = await linked(gl, {
    adv: program(gl, TRI_VS, ADV_FS), div: program(gl, TRI_VS, DIV_FS), jac: program(gl, TRI_VS, JAC_FS), grad: program(gl, TRI_VS, GRAD_FS),
    force: program(gl, TRI_VS, FORCE_FS), init: program(gl, TRI_VS, INIT_FS), step: program(gl, TRI_VS, STEP_FS),
    turn: program(gl, TRI_VS, TURN_FS), scale: program(gl, TRI_VS, SCALE_FS), turnv: program(gl, TRI_VS, TURNV_FS),
    bed: program(gl, BED_VS, BED_FS), bedsum: program(gl, TRI_VS, BEDSUM_FS),
    back: program(gl, TRI_VS, BACK_FS), draw: program(gl, DRAW_VS, DRAW_FS), final: program(gl, TRI_VS, FINAL_FS),
  });
  bloom = bloomChain(gl);
  flakeP = { a: mrt(TEX, TEX), b: mrt(TEX, TEX) };
  bedCells = target(gl, BEDW, BEDR, { format: gl.RGBA16F, filter: gl.NEAREST, clear: true });
  bedH = target(gl, BEDW, 1, { format: gl.RGBA16F, clear: true });
  bedTop = target(gl, BEDW, 1, { format: gl.RGBA16F, filter: gl.NEAREST, clear: true });
  flakeQ = null;
  seedFlakes();
}

/* ---------- counts and sizes ---------- */
const CUM = [CLASS[0].share, CLASS[0].share + CLASS[1].share, CLASS[0].share + CLASS[1].share + CLASS[2].share];
// The drawn count: Flakes, the stage area and the slow-frame rung.
const css = { w: 1280, h: 800 };
function count() {
  const area = clamp((css.w * css.h) / (1280 * 800), 0.35, 1.4);
  const narrow = A < 1 ? 0.6 : 1;
  return Math.min(SLOTS, Math.round(26000 * opts.flakes * Math.sqrt(area) * narrow * (rung >= 3 ? 0.6 : 1)));
}
// The height one resting flake adds to its column, per class, for n flakes.
function volumes(n) {
  return CLASS.map(c => (BED_TOP * c.bed * BEDW) / (n * c.share));
}
// The jar's floor stands just above the bar, so the bed stays in view.
let floor = 0;
function floorAt() {
  const c = ui.cover?.();
  return c ? clamp((c.bottom + 8) / Math.max(1, css.h), 0, 0.22) : 0;
}
// Bands of the first-frame bed, big flakes at the foot.
function bands() {
  let y = floor + 0.003;
  return CLASS.map(c => { const h = BED_TOP * c.bed * (1 - c.drift); const b = [y, y + h]; y += h; return b; });
}

function seedFlakes() {
  const u = P.init.u, b = bands();
  gl.useProgram(P.init.p);
  gl.uniform1f(u.uA, A);
  gl.uniform3fv(u.uCum, CUM);
  gl.uniform2fv(u.uBand, b.flat());
  // Reduced motion opens settled: nothing drifts.
  gl.uniform1fv(u.uDrift, CLASS.map(c => (reduce ? 0 : c.drift)));
  gl.disable(gl.BLEND);
  for (const t of [flakeP.a, flakeP.b]) { gl.bindFramebuffer(gl.FRAMEBUFFER, t.fb); gl.viewport(0, 0, TEX, TEX); gl.drawArrays(gl.TRIANGLES, 0, 3); }
  if (vel) [vel.r, vel.w, pres.r, pres.w].forEach(t => { to(gl, t); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); });
  bedPass();
}

function alloc() {
  A = W / H;
  const sh = rung >= 4 ? 96 : 128, sw = Math.max(16, Math.min(320, Math.round(sh * A)));
  if (sw !== SW || sh !== SH) {
    free(gl, vel); free(gl, pres); free(gl, div);
    vel = pair(sw, sh, gl.RG16F); pres = pair(sw, sh, gl.R16F); div = target(gl, sw, sh, { format: gl.R16F });
    SW = sw; SH = sh;
  }
  if (!scene || scene.w !== W || scene.h !== H) { free(gl, scene); scene = target(gl, W, H); }
}

/* ---------- one frame of fluid ---------- */
const segA = new Float32Array(MAXS * 4), segV = new Float32Array(MAXS * 4), puffA = new Float32Array(MAXP * 4);
let nSeg = 0, nPuff = 0, simT = 0;
function fluid(dt) {
  const hx = A / SW, hy = 1 / SH, th = opts.thick;
  const f = P.force;
  gl.useProgram(f.p);
  bind(gl, f, 'uVel', 0, vel.r);
  bind(gl, f, 'uBed', 1, bedH);
  gl.uniform1f(f.u.uFloor, floor);
  gl.uniform1f(f.u.uA, A);
  // Thick liquid takes the finger's speed more slowly.
  gl.uniform1f(f.u.uK, 1 - Math.exp(-dt * lerp(34, 12, th)));
  gl.uniform1f(f.u.uDt, dt);
  gl.uniform1f(f.u.uShake, shake.drive);
  gl.uniform1f(f.u.uSpin, turn.spin);
  gl.uniform1i(f.u.uN, nSeg);
  gl.uniform1i(f.u.uNP, nPuff);
  gl.uniform4fv(f.u.uSeg, segA);
  gl.uniform4fv(f.u.uSegV, segV);
  gl.uniform4fv(f.u.uPuff, puffA);
  tri(gl, vel.w); vel.swap();
  const a = P.adv;
  gl.useProgram(a.p);
  bind(gl, a, 'uVel', 0, vel.r);
  gl.uniform2f(a.u.uTex, 1 / SW, 1 / SH);
  gl.uniform1f(a.u.uA, A);
  gl.uniform1f(a.u.uDt, dt);
  // Thin liquid swirls on for seconds; thick liquid stops soon.
  gl.uniform1f(a.u.uDamp, Math.exp(-dt / lerp(5, 1.6, th)));
  gl.uniform1f(a.u.uVisc, 1 - Math.exp(-dt * lerp(0.6, 7, th)));
  tri(gl, vel.w); vel.swap();
  gl.useProgram(P.div.p);
  bind(gl, P.div, 'uVel', 0, vel.r);
  gl.uniform2f(P.div.u.uH, hx, hy);
  tri(gl, div);
  const j = P.jac;
  gl.useProgram(j.p);
  bind(gl, j, 'uDiv', 1, div);
  gl.uniform2f(j.u.uH, hx, hy);
  for (let i = 0; i < JACOBI; i++) {
    bind(gl, j, 'uP', 0, pres.r);
    gl.uniform1f(j.u.uKeep, i ? 1 : 0.8);
    tri(gl, pres.w); pres.swap();
  }
  const gr = P.grad;
  gl.useProgram(gr.p);
  bind(gl, gr, 'uP', 0, pres.r);
  bind(gl, gr, 'uVel', 1, vel.r);
  gl.uniform2f(gr.u.uH, hx, hy);
  tri(gl, vel.w); vel.swap();
}

/* ---------- flake passes ---------- */
let N = 0;
const rows = () => Math.ceil(N / TEX);
function bedPass() {
  const b = P.bed, u = b.u;
  to(gl, bedCells);
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.useProgram(b.p);
  bind(gl, b, 'uP', 0, flakeP.a.p);
  bind(gl, b, 'uQ', 1, flakeP.a.q);
  gl.uniform1f(u.uA, A);
  gl.uniform1f(u.uFloor, floor);
  gl.uniform3fv(u.uCum, CUM);
  gl.uniform1fv(u.uVol, volumes(N || count()));
  gl.uniform1i(u.uTop, 0);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE);
  gl.drawArrays(gl.POINTS, 0, N || count());
  // The second draw keeps the highest flake per column.
  to(gl, bedTop);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.uniform1i(u.uTop, 1);
  gl.blendEquation(gl.MAX);
  gl.drawArrays(gl.POINTS, 0, N || count());
  gl.blendEquation(gl.FUNC_ADD);
  gl.disable(gl.BLEND);
  gl.useProgram(P.bedsum.p);
  bind(gl, P.bedsum, 'uCells', 0, bedCells);
  bind(gl, P.bedsum, 'uTops', 1, bedTop);
  // The tent spans about 0.04 of the jar height on each side.
  gl.uniform1i(P.bedsum.u.uR, Math.max(2, Math.min(24, Math.round(0.04 / (A / BEDW)))));
  tri(gl, bedH);
}
function stepFlakes(dt) {
  const s = P.step, u = s.u, th = opts.thick;
  gl.useProgram(s.p);
  bind(gl, s, 'uP', 0, flakeP.a.p);
  bind(gl, s, 'uQ', 1, flakeP.a.q);
  bind(gl, s, 'uVel', 2, vel.r);
  bind(gl, s, 'uBed', 3, bedH);
  gl.uniform1f(u.uA, A);
  gl.uniform1f(u.uDt, dt);
  gl.uniform1f(u.uT, simT);
  // Thick liquid settles slowly; reduced motion settles at triple speed.
  gl.uniform1f(u.uSlow, lerp(1, 1.75, th) / (reduce ? 3 : 1));
  gl.uniform1f(u.uLift, lerp(1, 1.5, th) * (turn.on ? 0.5 : 1));
  gl.uniform1f(u.uTumble, reduce ? 0 : 1);
  gl.uniform1f(u.uFloor, floor);
  gl.uniform2fv(u.uG, turn.g);
  gl.uniform2f(u.uKick, shake.kick, 0);
  gl.uniform3fv(u.uCum, CUM);
  gl.uniform1fv(u.uFall, CLASS.map(c => c.fall));
  gl.uniform1i(u.uN, N);
  gl.bindFramebuffer(gl.FRAMEBUFFER, flakeP.b.fb);
  gl.viewport(0, 0, TEX, rows());
  gl.drawArrays(gl.TRIANGLES, 0, 3);
  [flakeP.a, flakeP.b] = [flakeP.b, flakeP.a];
}
// The turn ends: flakes and liquid swap ends in one pass.
// One pass over every flake slot, from a into b; then they swap.
function flakePass(prog, set) {
  gl.useProgram(prog.p);
  bind(gl, prog, 'uP', 0, flakeP.a.p);
  bind(gl, prog, 'uQ', 1, flakeP.a.q);
  set(prog.u);
  gl.bindFramebuffer(gl.FRAMEBUFFER, flakeP.b.fb);
  gl.viewport(0, 0, TEX, TEX);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
  [flakeP.a, flakeP.b] = [flakeP.b, flakeP.a];
}
function turnOver() {
  flakePass(P.turn, u => gl.uniform1f(u.uA, A));
  gl.useProgram(P.turnv.p);
  bind(gl, P.turnv, 'uVel', 0, vel.r);
  tri(gl, vel.w); vel.swap();
}

/* ---------- render ---------- */
const lin = c => linFit(c[0], c[1], c[2]);
function render() {
  const pal = PALETTES[opts.glitter], L = LIGHTS[opts.light];
  // The liquid, then the bed's mass.
  const b = P.back;
  gl.useProgram(b.p);
  bind(gl, b, 'uBed', 0, bedH);
  gl.uniform1f(b.u.uA, A);
  gl.uniform1f(b.u.uSide, L.side);
  gl.uniform1f(b.u.uFloor, floor);
  gl.uniform3fv(b.u.uLiq, lin(pal.liquid));
  gl.uniform3fv(b.u.uGlow, lin(pal.glow));
  const bed = pal.cls.map(lin).reduce((s, c, i) => s.map((x, j) => x + c[j] * CLASS[i].bed * 0.16), [0, 0, 0]);
  gl.uniform3fv(b.u.uBedC, bed);
  tri(gl, scene);
  // The flakes, as premultiplied sprites over the liquid.
  const d = P.draw, u = d.u;
  gl.useProgram(d.p);
  bind(gl, d, 'uP', 0, flakeP.a.p);
  gl.uniform1f(u.uA, A);
  gl.uniform1f(u.uPx, H / 800);
  gl.uniform3fv(u.uCum, CUM);
  gl.uniform1fv(u.uR, CLASS.map(c => c.r));
  gl.uniform1i(u.uSliver, pal.shape);
  gl.uniform3fv(u.uBase, pal.cls.flatMap(c => lin(c)));
  gl.uniform1fv(u.uHolo, pal.cls.map(c => c[3]));
  const dir = L.dir, m = Math.hypot(...dir);
  gl.uniform3f(u.uL, dir[0] / m, dir[1] / m, dir[2] / m);
  gl.uniform3fv(u.uFill, lin(pal.glow).map(x => x * 1.1 + 0.06));
  gl.uniform1f(u.uSharp, L.sharp);
  gl.uniform1f(u.uHalo, L.halo);
  gl.uniform1f(u.uKey, L.key);
  gl.uniform1f(u.uSteady, reduce ? 1 : 0);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  to(gl, scene);
  gl.drawArrays(gl.POINTS, 0, N);
  gl.disable(gl.BLEND);
  // Bloom on the glints only.
  const glow = bloom.render(scene.tex, W, H, { threshold: 1.1, cap: 8, levels: rung >= 2 ? 3 : 5 });
  gl.bindVertexArray(vao);
  const f = P.final, fu = f.u;
  gl.useProgram(f.p);
  bind(gl, f, 'uScene', 0, scene);
  bind(gl, f, 'uBloom', 1, glow);
  gl.uniform2f(fu.uRes, W, H);
  gl.uniform1f(fu.uA, A);
  gl.uniform1f(fu.uRot, turn.rot);
  gl.uniform1f(fu.uCover, turn.cover);
  gl.uniform1f(fu.uBloomK, 0.9);
  gl.uniform1f(fu.uFade, turn.fade);
  gl.uniform1f(fu.uSeed, (simT * 60) % 997);
  gl.uniform2f(fu.uOff, shake.off / A, 0);
  gl.uniform3fv(fu.uLine, lin(pal.glow).map(x => x * 0.4 + 0.12));
  tri(gl, null);
}

/* ---------- shake and flip ---------- */
// The jar swings side to side while Shake is held.
const SHAKE_HZ = 2.4;
const shake = { held: false, amp: 0, phase: 0, drive: 0, kick: 0, off: 0, lastSign: 0 };
function shakeOn(on) {
  if (failed) return;
  shake.held = on;
  if (on) { stir(); poke(); }
}
function stepShake(dt) {
  shake.amp = clamp(shake.amp + (shake.held ? dt / 0.25 : -dt / 0.4));
  if (shake.amp <= 0) { shake.drive = shake.kick = shake.off = 0; return false; }
  shake.phase += dt * SHAKE_HZ * Math.PI * 2;
  const s = Math.sin(shake.phase), a = shake.amp * (reduce ? 0.5 : 1);
  // The jar's acceleration rolls the liquid and makes heavy flakes lag.
  shake.drive = s * a * 9;
  shake.kick = -s * a * 7;
  shake.off = reduce ? 0 : -s * a * 0.012;
  const sign = Math.sign(s);
  if (sign && sign !== shake.lastSign) { shake.lastSign = sign; slosh(sign, a); }
  stir();
  return true;
}
// The flip turns the jar over in 0.6 s.
const FLIP_S = 0.6;
const turn = { on: false, t: 0, rot: 0, cover: 1, spin: 0, fade: 1, g: [0, -1], done: false };
function flip() {
  if (failed || turn.on) return;
  turn.on = true; turn.t = 0; turn.done = false;
  glug();
  stir();
  poke();
}
function stepTurn(dt) {
  if (!turn.on) return false;
  turn.t += dt;
  const k = clamp(turn.t / FLIP_S);
  if (reduce) {
    // Reduced motion: the jar fades to its turned state.
    turn.fade = k < 0.5 ? 1 - k * 2 : (k - 0.5) * 2;
    if (k >= 0.5 && !turn.done) { turn.done = true; turnOver(); }
  } else {
    const th = Math.PI * ease(k), w = Math.PI * 6 * k * (1 - k) / FLIP_S;
    turn.rot = -th;
    turn.g = [-Math.sin(th), -Math.cos(th)];
    // The view zooms so the turned frame still covers the stage.
    const c = Math.abs(Math.cos(th)), s = Math.abs(Math.sin(th));
    turn.cover = Math.max(c + s / A, A * s + c);
    turn.spin = -w * 0.35;
  }
  if (k >= 1) {
    if (!reduce && !turn.done) turnOver();
    Object.assign(turn, { on: false, rot: 0, cover: 1, spin: 0, fade: 1, g: [0, -1] });
  }
  return true;
}

/* ---------- pointer ---------- */
// A press becomes a drag after 8 px or a hold after 260 ms; else a tap.
const ptr = new Map();
const toJar = e => { const r = canvas.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * A, 1 - (e.clientY - r.top) / r.height]; };
canvas.addEventListener('pointerdown', e => {
  if (failed) return;
  try { canvas.setPointerCapture(e.pointerId); } catch { /* synthetic pointers have no capture */ }
  const p = toJar(e);
  ptr.set(e.pointerId, { p, prev: p, v: [0, 0], x0: e.clientX, y0: e.clientY, t0: performance.now(), drag: false });
  stage.focus({ preventScroll: true });
  poke();
});
canvas.addEventListener('pointermove', e => {
  const s = ptr.get(e.pointerId);
  if (!s) return;
  s.p = toJar(e);
  if (!s.drag && Math.hypot(e.clientX - s.x0, e.clientY - s.y0) > 8) s.drag = true;
  poke();
});
function release(e, cancel) {
  const s = ptr.get(e.pointerId);
  if (!s) return;
  ptr.delete(e.pointerId);
  if (!cancel && !s.drag && performance.now() - s.t0 < 260) puff(s.p[0]);
  poke();
}
canvas.addEventListener('pointerup', e => release(e, false));
canvas.addEventListener('pointercancel', e => release(e, true));
canvas.addEventListener('lostpointercapture', e => release(e, true));

// A tap blows a jet up through the bed under the finger.
const puffs = [];
function puff(x) {
  puffs.push({ x, age: 0, k: rand(0.9, 1.1) });
  if (puffs.length > MAXP) puffs.shift();
  stir();
  thump(x / A);
}
// Pointer state turns into strokes and puffs once per frame.
const swirl = { e: 0, x: 0.5 };
function gather(dt) {
  nSeg = 0; nPuff = 0;
  segA.fill(0); segV.fill(0); puffA.fill(0);
  let drive = 0;
  for (const s of ptr.values()) {
    const dx = s.p[0] - s.prev[0], dy = s.p[1] - s.prev[1], k = dt > 0 ? 1 / dt : 0;
    s.v = [lerp(s.v[0], dx * k, 0.5), lerp(s.v[1], dy * k, 0.5)];
    const vm = Math.hypot(...s.v), cap = vm > 2.4 ? 2.4 / vm : 1;
    if (s.drag && nSeg < MAXS && Math.hypot(dx, dy) > 1e-4) {
      segA.set([s.prev[0], s.prev[1], s.p[0], s.p[1]], nSeg * 4);
      segV.set([s.v[0] * cap, s.v[1] * cap, 0.08, 1], nSeg * 4);
      nSeg++;
      stir();
    }
    if (vm > drive) { drive = vm; swirl.x = s.p[0] / A; }
    s.prev = s.p;
  }
  // The swirl's energy rises with the drag and fades as the liquid slows.
  const tau = lerp(2.6, 0.9, opts.thick);
  swirl.e = Math.max(swirl.e * Math.exp(-dt / tau), clamp(drive / 2) * (1 - opts.thick * 0.4), shake.amp * 0.8, turn.on ? 0.7 : 0);
  for (let i = puffs.length - 1; i >= 0; i--) {
    const p = puffs[i];
    p.age += dt;
    if (p.age > 0.45) { puffs.splice(i, 1); continue; }
    puffA.set([p.x, 0, 0.06, 15 * p.k * Math.exp(-p.age / 0.18) * lerp(1, 1.6, opts.thick)], nPuff * 4);
    nPuff++;
  }
}

/* ---------- sound ---------- */
// S and F act on the jar, so they count as gestures.
const kit = audioKit({ keys: new Set(['s', 'S', 'f', 'F']) });
let V = null;
const jit = x => 1 + (Math.random() * 2 - 1) * x;
function voices() {
  const ac = kit.live();
  if (!ac || !kit.out || !kit.noise) return null;
  if (V) return V;
  // The wash: looped noise through a low-pass; the swirl opens it.
  const pan = ac.createStereoPanner();
  pan.connect(kit.out);
  const washG = ac.createGain();
  washG.gain.value = 0;
  const lp = ac.createBiquadFilter();
  lp.type = 'lowpass'; lp.frequency.value = 300; lp.Q.value = 0.4;
  const src = ac.createBufferSource();
  src.buffer = kit.noise; src.loop = true;
  src.connect(lp).connect(washG).connect(pan);
  src.start();
  V = { ac, pan, washG, lp, tickT: 0 };
  return V;
}
// The wash level and colour follow the swirl; the shimmer follows the flakes in motion.
function soundTick(dt) {
  const v = voices();
  if (!v) return;
  const t = v.ac.currentTime, e = swirl.e, act = activity();
  v.washG.gain.setTargetAtTime(Math.min(0.5, e * 0.42), t, 0.08);
  v.lp.frequency.setTargetAtTime(220 + e * 900 * (1 - opts.thick * 0.5), t, 0.1);
  v.pan.pan.setTargetAtTime((swirl.x * 2 - 1) * 0.55, t, 0.1);
  // Tiny high ticks: a flake turns its face to the light somewhere.
  v.tickT += dt * act * 70 * Math.sqrt(opts.flakes);
  while (v.tickT > 1) { v.tickT -= 1; tick(v, t + Math.random() * dt, act); }
}
function tick(v, t, act) {
  const ac = v.ac, o = ac.createOscillator(), g = ac.createGain(), p = ac.createStereoPanner();
  o.type = 'sine';
  o.frequency.value = rand(4200, 10500);
  const peak = 0.018 * (0.4 + act) * jit(0.4);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(peak, t + 0.002);
  g.gain.exponentialRampToValueAtTime(1e-4, t + rand(0.025, 0.06));
  p.pan.value = clamp((swirl.x * 2 - 1) * 0.4 + rand(-0.5, 0.5), -1, 1);
  o.connect(g).connect(p).connect(kit.out);
  o.start(t); o.stop(t + 0.08);
}
// A burst of band-passed noise: one slosh of liquid on the wall.
function noiseHit(t, { f0, f1, q = 1.2, dur = 0.35, gain = 0.3, pan = 0 }) {
  const ac = kit.ac, s = ac.createBufferSource(), bp = ac.createBiquadFilter(), g = ac.createGain(), p = ac.createStereoPanner();
  s.buffer = kit.noise;
  bp.type = 'bandpass'; bp.Q.value = q;
  bp.frequency.setValueAtTime(f0, t);
  bp.frequency.exponentialRampToValueAtTime(f1, t + dur);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(gain, t + 0.03);
  g.gain.exponentialRampToValueAtTime(1e-4, t + dur);
  p.pan.value = pan;
  s.connect(bp).connect(g).connect(p).connect(kit.out);
  s.start(t, Math.random() * 0.5, dur + 0.05);
}
// A low bubble: a sine that falls in pitch.
function bloop(t, f, gain, pan = 0) {
  const ac = kit.ac, o = ac.createOscillator(), g = ac.createGain(), p = ac.createStereoPanner();
  o.type = 'sine';
  o.frequency.setValueAtTime(f, t);
  o.frequency.exponentialRampToValueAtTime(f * 0.55, t + 0.13);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(gain, t + 0.012);
  g.gain.exponentialRampToValueAtTime(1e-4, t + 0.16);
  p.pan.value = pan;
  o.connect(g).connect(p).connect(kit.out);
  o.start(t); o.stop(t + 0.2);
}
function slosh(sign, a) {
  if (!voices()) return;
  const t = kit.ac.currentTime + 0.01;
  noiseHit(t, { f0: 750 * jit(0.15), f1: 260 * jit(0.15), q: 1.1, dur: 0.32 * jit(0.1), gain: 0.32 * a * jit(0.2), pan: sign * 0.5 });
}
function glug() {
  if (!voices()) return;
  const t = kit.ac.currentTime + 0.02;
  noiseHit(t, { f0: 420, f1: 160, q: 0.8, dur: 0.7, gain: 0.22 });
  [0, 0.17, 0.36].forEach((d, i) => bloop(t + d * jit(0.15), 150 * jit(0.1) - i * 14, 0.34 * jit(0.15), rand(-0.3, 0.3)));
}
function thump(x) {
  if (!voices()) return;
  const t = kit.ac.currentTime + 0.005;
  bloop(t, 120 * jit(0.12), 0.26 * jit(0.2), (x * 2 - 1) * 0.5);
  noiseHit(t, { f0: 900, f1: 300, q: 1.4, dur: 0.22, gain: 0.12 * jit(0.2), pan: (x * 2 - 1) * 0.5 });
}
function hush() { if (V) V.washG.gain.setTargetAtTime(0, V.ac.currentTime, 0.05); }

/* ---------- loop ---------- */
let raf = 0, last = 0, visible = true, ready = false, lastInput = performance.now(), lastStir = performance.now(), rate = 1;
// A stir starts the settle clock again.
function stir() { lastStir = performance.now(); }
// The settle runs out once the liquid is calm and the dust has fallen the full jar.
const settleS = () => 3 * lerp(2.6, 0.9, opts.thick) + 1 / (CLASS[3].fall * 0.85 / lerp(1, 1.75, opts.thick) * (reduce ? 3 : 1));
// The fraction of the settle still to run: the shimmer follows it.
const activity = () => clamp(Math.max(swirl.e, 1 - (performance.now() - lastStir) / 1000 / settleS()) ** 2);
const lively = () => ptr.size > 0 || shake.held || shake.amp > 0 || turn.on || puffs.length > 0 || performance.now() - lastInput < 2500;
// Drifting frames wait on a timer, so the page asks for 30 frames a second.
let timer = 0;
function schedule(live) {
  if (live) { raf = requestAnimationFrame(frame); return; }
  raf = -1;
  timer = setTimeout(() => { timer = 0; raf = requestAnimationFrame(frame); }, 28);
}
function halt() { if (raf > 0) cancelAnimationFrame(raf); clearTimeout(timer); raf = timer = 0; }
function frame(now) {
  raf = 0;
  const live = lively();
  const dt = last ? Math.min(1 / 30, (now - last) / 1000) : 1 / 60;
  last = now;
  let more = false;
  try { more = step(dt * rate, now); render(); }
  finally {
    if (visible && (live || more)) schedule(live);
    else { hush(); kit.rest(() => !raf); }
  }
}
function wake() { if (visible && ready && !raf && !failed) { last = 0; raf = requestAnimationFrame(frame); } }
// Any input wakes the loop and resets the sleep clock.
function poke() { lastInput = performance.now(); rate = 1; wake(); }
function redraw() { if (ready && !raf && !failed) { N = count(); render(); } }
function step(dt, now) {
  simT += dt;
  N = count();
  // After a minute without input, or once the settle runs out, the motion eases to a stop over 2 s.
  const idle = (now - lastInput) / 1000, calm = (now - lastStir) / 1000 - settleS();
  rate = clamp(1 - Math.max(idle - 60, calm) / 2);
  if (dt <= 0) return rate > 0;
  stepShake(dt);
  stepTurn(dt);
  gather(dt);
  fluid(dt);
  bedPass();
  stepFlakes(dt);
  soundTick(dt);
  if (lively()) watchdog(dt / Math.max(rate, 1e-3));
  return rate > 0;
}

/* ---------- performance ---------- */
// Slow frames step quality down one rung; it never steps back up.
// Rungs: pixel ratio 1, bloom levels, flake count, fluid grid.
let runT = 0, avg = 1 / 60, slowT = 0;
function watchdog(dt) {
  if (!dt || rung >= 4) return;
  runT += dt;
  avg = lerp(avg, dt, 0.1);
  if (runT < 4) return;
  slowT = avg > 1 / 38 ? slowT + dt : 0;
  if (slowT > 2) { rung++; slowT = 0; resize(true); }
}

/* ---------- size ---------- */
function fit() {
  if (!rung) return fitCanvas(canvas, { budget: 2.4e6 });
  // On High the first rung falls back to Standard, not to 1x.
  return quality() === 'high' && rung < 2 ? fitCanvas(canvas, { budget: 2.4e6, quality: 'standard' }) : fitCanvas(canvas, { budget: 1.4e6, maxDpr: 1 });
}
function resize(force = false) {
  if (failed || !P) return;
  const f = fit();
  if (f.W === W && f.H === H && scene && !force) return;
  const oldA = A;
  W = f.W; H = f.H; css.w = f.w; css.h = f.h;
  alloc();
  moveFloor(A / oldA);
  N = count();
  render();
}

// A new shape or a new bar height moves the flakes with the jar.
function moveFloor(k = 1) {
  const f0 = floor, f1 = floorAt();
  if (Math.abs(k - 1) < 1e-4 && Math.abs(f1 - f0) < 1e-4) return;
  floor = f1;
  if (!ready) return;
  flakePass(P.scale, u => { gl.uniform1f(u.uK, k); gl.uniform1f(u.uF0, f0); gl.uniform1f(u.uF1, f1); });
  bedPass();
  if (!raf) render();
}

/* ---------- reset ---------- */
// Reset settles the jar at once into its first-frame state.
function resetJar() {
  if (failed || !ready) return;
  Object.assign(turn, { on: false, rot: 0, cover: 1, spin: 0, fade: 1, g: [0, -1] });
  shake.held = false; shake.amp = 0; puffs.length = 0; ptr.clear(); swirl.e = 0;
  seedFlakes();
  stir();
  poke();
}

/* ---------- start ---------- */
onReducedChange(v => { reduce = v; redraw(); });
async function start() {
  if (!gl) return fail();
  if (!gl.getExtension('EXT_color_buffer_float')) return fail();
  gl.getExtension('OES_texture_float_linear');
  mark('build');
  try { await build(); } catch (err) { return fail(err); }
  const f = fit();
  W = f.W; H = f.H; css.w = f.w; css.h = f.h;
  alloc();
  floor = floorAt();
  N = count();
  seedFlakes();
  render();
  gl.finish();
  ready = true;
  mark('first-frame');
  requestAnimationFrame(() => canvas.classList.add('on'));
  new ResizeObserver(() => resize()).observe(stage);
  ui.onCover?.(() => moveFloor());
  onQuality(() => { rung = 0; resize(true); });
  whenVisible(stage, v => {
    visible = v;
    if (v) wake();
    else { halt(); hush(); }
  });
  onContextLoss(canvas, {
    lost: () => { failed = true; halt(); },
    restored: async () => { failed = false; P = null; scene = vel = pres = div = null; SW = SH = 0; await build(); alloc(); N = count(); seedFlakes(); render(); wake(); },
  });
  // The first frame drifts: fine dust still falls through the middle.
  stir();
  wake();
}
start();
