// Gas giant dive, pass 3: the cloud march at half size.
// Fourteen layers to 640 km down: decks, voids with towers, sheets, a veil. LAYERS in world.js lists them.
// Light follows Fire's smoke: HG phase, Beer with multiple scatter and powder, a shadow ambient.
// Output: one RGBA16F target. rgb is the light in front of the sky, a is the cover.
import { COMMON } from './world.js';
import { CLOUDS } from '../shared/clouds.js';
import { TW_DECL, TW_MARCH } from './twisters.js';

/* ---------- K: Railgun's tiled 3D billow noise (copied from volcano/clouds.js) ---------- */
const VOL_NOISE = /* glsl */`
vec3 vh3(vec3 p) {
  p = vec3(dot(p, vec3(127.1, 311.7, 74.7)), dot(p, vec3(269.5, 183.3, 246.1)), dot(p, vec3(113.5, 271.9, 124.6)));
  return fract(sin(p) * 43758.5453123);
}
float vworley(vec3 uv, float f) {
  vec3 id = floor(uv * f), p = fract(uv * f);
  float md = 9.0;
  for (int x = -1; x <= 1; x++) for (int y = -1; y <= 1; y++) for (int z = -1; z <= 1; z++) {
    vec3 o = vec3(float(x), float(y), float(z));
    vec3 d = o + vh3(mod(id + o, f)) * 0.8 + 0.1 - p;
    md = min(md, dot(d, d));
  }
  return clamp(1.0 - sqrt(md), 0.0, 1.0);
}
float vgrad(vec3 i, vec3 w, vec3 o, float f) { return dot(vh3(mod(i + o, f)) * 2.0 - 1.0, w - o); }
float vperlin(vec3 uv, float f) {
  vec3 p = uv * f, i = floor(p), w = fract(p);
  vec3 u = w * w * w * (w * (w * 6.0 - 15.0) + 10.0);
  return mix(mix(mix(vgrad(i, w, vec3(0, 0, 0), f), vgrad(i, w, vec3(1, 0, 0), f), u.x), mix(vgrad(i, w, vec3(0, 1, 0), f), vgrad(i, w, vec3(1, 1, 0), f), u.x), u.y),
             mix(mix(vgrad(i, w, vec3(0, 0, 1), f), vgrad(i, w, vec3(1, 0, 1), f), u.x), mix(vgrad(i, w, vec3(0, 1, 1), f), vgrad(i, w, vec3(1, 1, 1), f), u.x), u.y), u.z);
}
vec4 volAt(vec3 p) {
  float pf = clamp(0.5 + 0.8 * (vperlin(p, 4.0) + 0.5 * vperlin(p, 8.0) + 0.25 * vperlin(p, 16.0)), 0.0, 1.0);
  float wf = vworley(p, 4.0) * 0.625 + vworley(p, 8.0) * 0.25 + vworley(p, 16.0) * 0.125;
  float fine = vworley(p, 6.0) * 0.625 + vworley(p, 12.0) * 0.25 + vworley(p, 24.0) * 0.125;
  return vec4(wf + pf * (1.0 - wf), fine, wf, pf);
}`;
/* ---------- end K ---------- */

// Bakes one z layer of the 64 cubed noise volume per draw.
export const BAKE_FS = /* glsl */`#version 300 es
precision highp float;
in vec2 vUv;
out vec4 o;
uniform float uZ;
${VOL_NOISE}
void main() { o = volAt(vec3(vUv, uZ)); }`;

// The top deck's bands and swirls, baked once into a 2D tile 4,096 km square.
// A few whirls sit in east-west bands (Tom, 2026-11-24); each drags the band lines round it.
// The drag runs on log radius inside the whirl, after Tornado alley's deck, so arms never wind up.
// r: the billow height. g: fine streaks along the bands. b: the whirl weight. a: folded ridges.
export const SW_TILE = 4096;
export const SWIRL_FS = /* glsl */`#version 300 es
precision highp float;
precision highp sampler3D;
in vec2 vUv;
out vec4 o;
uniform sampler3D uVol;
const float TILE = ${SW_TILE.toFixed(1)};
// The whirls: centre in tile units, radius in km, spin. The first stands ahead of the start view.
const vec4 WH[5] = vec4[5](vec4(0.34, 0.525, 300.0, 1.0), vec4(0.58, 0.47, 180.0, -1.0), vec4(0.12, 0.3, 420.0, 1.0), vec4(0.8, 0.82, 240.0, -1.0), vec4(0.55, 0.05, 150.0, 1.0));
// The noise at a point in volume units; the volume repeats every unit.
vec4 nz(vec3 p) { return textureLod(uVol, p, 0.0); }
// The billow, streak and ridge values at one noise point.
vec3 layer(vec3 p, vec3 ps) {
  vec4 a = nz(p), b = nz(p * vec3(2.0, 2.0, 1.0) + 0.37), s = nz(ps);
  float bill = a.a * 0.7 + b.a * 0.3;
  float rg = 1.0 - abs(2.0 * (a.r * 0.6 + b.r * 0.4) - 1.0);
  return vec3(bill, s.g, rg * rg);
}
void main() {
  vec2 v = vUv * TILE;
  float wt = 0.0, core = 0.0;
  for (int i = 0; i < 5; i++) {
    vec2 c = WH[i].xy * TILE;
    vec2 q = v - c;
    q -= TILE * floor(q / TILE + 0.5);
    float R = WH[i].z, r = max(length(q), 0.5), k = r / R;
    // The bands bend round the whirl and wind into it; inside 0.3 R the core is calm.
    float turn = WH[i].w * (1.6 * exp(-k * k * 1.2) + 0.8 * max(0.0, log(R / max(r, 0.3 * R))));
    float cs = cos(turn), sn = sin(turn);
    v = c + vec2(cs * q.x - sn * q.y, sn * q.x + cs * q.y);
    wt = max(wt, 1.0 - smoothstep(0.5, 1.3, k));
    core = max(core, 1.0 - smoothstep(0.0, 0.3, k));
  }
  // A slow warp keeps the bands from running ruler-straight. All scales repeat with the tile.
  // Turbulence on two scales breaks the lines into lumps, as in Tornado alley's deck.
  vec2 u = v / TILE;
  vec4 wa = nz(vec3(u * vec2(4.0, 8.0), 0.71)), wb = nz(vec3(u * vec2(12.0, 24.0), 0.29));
  u += (wa.rg - 0.5) * vec2(0.05, 0.02) + (wb.rg - 0.5) * vec2(0.012, 0.006);
  vec3 n = layer(vec3(u.x * 4.0, u.y * 16.0, 0.13), vec3(u.x * 12.0, u.y * 64.0, 0.57));
  // A whirl's core is a calm dome.
  n.x = mix(n.x, 0.62, core * 0.7);
  n.z *= 1.0 - 0.8 * core;
  o = vec4(n.x, n.y, wt, n.z);
}`;

const MARCH_SRC = /* glsl */`#version 300 es
precision highp float;
precision highp sampler3D;
in vec2 vUv;
layout(location = 0) out vec4 o;
// The far view's first cloud depth, for the bake.
layout(location = 1) out vec4 oD;
uniform sampler2D uMap, uLut;
uniform sampler3D uVol;
// The top deck's baked swirls: SWIRL_FS.
uniform sampler2D uSwirl;
uniform vec3 uCam, uFwd, uRight, uUp;
uniform float uT, uTMap, uSteps, uFine, uWin, uSeed;
// A sub-pixel shift each frame; the history pass builds full detail from it.
uniform vec2 uJit;
// The twisters this pass draws, by index: from uTwLo up to uTwHi.
uniform float uTwLo, uTwHi;
// uMode 0 marches the whole ray. 1 marches to uNear and reads the baked far view past it.
// 2 bakes the far view: it marches from uNear on.
uniform float uMode, uNear;
uniform samplerCube uFar, uFarD;
uniform vec4 uFlash[4];
// Dev tuning: multiple scatter, ambient, bounce, haze reach.
uniform vec4 uTune;
// Dev tuning: the strength of the god rays.
uniform float uRays;
// ?qa: 1 slope, 2 fold, 3 sun, 4 inner, 5 sky and diffuse, 9 many twisters.
uniform float uDbg;
${COMMON}
${CLOUDS}
const float SIG = 1.1;
const float SW_TILE = ${SW_TILE.toFixed(1)};
const float TOP = 42.0, BOT = -505.0;
// This program's zone: it holds only the layers in it.
const float ZLO = 0.0, ZHI = 0.0;
const vec3 FLASH_C = vec3(0.64, 0.74, 1.0);
const vec3 SKY_C = vec3(0.07, 0.14, 0.17);
vec4 lut(float h) { return textureLod(uLut, vec2(clamp((h - LUT_LO) / (LUT_HI - LUT_LO), 0.0, 1.0), 0.5), 0.0); }
vec4 mapAt(vec2 xz) {
  vec2 uv = (xz - MAP_C) / MAP_S + 0.5;
  vec4 m = textureLod(uMap, uv, 0.0);
  float edge = max(abs(uv.x - 0.5), abs(uv.y - 0.5));
  return mix(m, vec4(0.45, 0.45, 0.0, 0.05), smoothstep(0.44, 0.5, edge));
}
vec3 gAlb = vec3(1.0);
float gOpen = 0.0;
// gUnder: 1 on a void's ceiling, where the floor's light bounces up.
float gUnder = 0.0;
// gFold: 1 in the top deck's folds and valleys, 0 on its crests.
float gFold = 0.0;
// gTw: a twister's side to the light (-1 to 1), its depth 0 core to 1 rim, its height 0 to 1.
// gTw.w is 1 where a twister sets the density.
vec4 gTw = vec4(0.0);
// gFace: the sun on the top deck's slope over the sun on flat cloud; 1 off the deck.
float gFace = 1.0;
// The swirl tile's height, in km: rolls, arms and folded ridges.
float swH(vec4 sw) { return 13.0 * (sw.r - 0.5) + 1.0 * sw.a - 0.35; }
// gDeep: km under a deck's top, for the light that diffuses down into it; -1 outside.
float gDeep = -1.0;
// The floor's colour, for the light it bounces up.
vec3 gBounceC = vec3(1.0);
vec3 th3(vec2 c) { vec3 p = vec3(dot(c, vec2(127.1, 311.7)), dot(c, vec2(269.5, 183.3)), dot(c, vec2(419.2, 371.9))); return fract(sin(p) * 43758.5453); }
// A tower in a void: one per cs km cell at most.
// Towers gather in clusters and lines, as convection does; open plains lie between.
// A third join floor and ceiling, a third rise as plumes, a third hang from the ceiling.
// fill is the share of cells with a tower in a cluster.
float tower(vec3 p, float h, float flo, float cei, float seed, float nb, float cs, float fill, out float f) {
  vec2 cell = floor(p.xz / cs);
  vec3 r = th3(cell + seed);
  vec3 r2 = th3(cell + seed + 41.0);
  float cl = textureLod(uVol, vec3((cell + 0.5) * 0.09, fract(seed * 0.13) + 0.31), 0.0).a;
  float on = step(1.0 - fill * 1.8 * smoothstep(0.4, 0.66, cl), r.z);
  float k = cs / 48.0 * (0.5 + 0.9 * r2.x);
  f = clamp((h - flo) / (cei - flo), 0.0, 1.0);
  float len = r2.y < 0.34 ? 1.0 : 0.3 + 0.6 * r2.z;
  float g = r2.y < 0.67 ? f / len : (f - 1.0 + len) / len;
  float inside = step(0.0, g) * step(g, 1.0);
  g = clamp(g, 0.0, 1.0);
  float lean = (g - 0.5) * (r.z - 0.5) * 9.0 * k;
  vec2 c = (cell + 0.25 + 0.5 * r.xy) * cs + vec2(lean, lean * 0.6) + 2.0 * k * vec2(sin(g * 7.0 + r.x * 6.0), cos(g * 5.0 + r.y * 6.0));
  // Joined towers flare at both ends; plumes spread an anvil; pendants taper to a tip.
  float e = r2.y < 0.34 ? abs(2.0 * g - 1.0) : g;
  float rad = k * (1.6 + 2.4 * r.y) * (0.45 + 1.5 * e * e * e) * (0.75 + 0.5 * nb);
  rad *= r2.y < 0.34 ? 1.0 : r2.y < 0.67 ? 1.0 - smoothstep(0.88, 1.0, g) * 0.8 : smoothstep(0.0, 0.15, g);
  return on * inside * smoothstep(0.0, 1.6 * k, rad - length(p.xz - c));
}
// Thin sheets stacked from bot up, one in each gap km.
// Each sheet has its own height, thickness and cover; id names it.
float sheets(float h, float bot, float gap, float thick, float nb, float hole, float lod, out vec3 id) {
  float s = (h - bot) / gap;
  id = th3(vec2(floor(s), bot));
  float y = (fract(s) - 0.35 - 0.3 * id.x) * gap + 0.12 * gap * (nb - 0.5);
  float th = thick * (0.5 + id.y);
  float cov = smoothstep(0.0, 0.12, hole - 0.25 - 0.45 * id.z);
  return (1.0 - smoothstep(th * 0.3, th + 0.4 + lod, abs(y))) * cov;
}
float band(float h, float lo, float hi, float w) { return smoothstep(lo - w, lo + w, h) * (1.0 - smoothstep(hi - w, hi + w, h)); }
// The gyre: a vast vortex in the abyss, its eyewall 280 km across, far ahead.
const vec2 GY_C = vec2(-120.0, -420.0);
float gyreEye(vec2 xz) { return 1.0 - smoothstep(110.0, 135.0, length(xz - GY_C)); }
// A break in a void's ceiling: ragged gaps 20 to 40 km across that drift slowly.
// The same gap runs through the deck above, so light falls through it.
// soft widens the edge: light through a thick deck spreads into a penumbra.
float breakAt(vec2 xz, float seed, float soft) {
  vec4 v = textureLod(uVol, vec3(xz / 260.0 + vec2(uT * 0.00004, fract(seed * 0.71)), fract(seed * 0.37)), 0.0);
  // The brown deck under the upper void stays mostly closed (Tom, 2026-11-24).
  float th = seed == 7.7 ? 0.08 : 0.0;
  float b = smoothstep(0.64 + th - soft, 0.72 + th + 0.3 * soft, v.a + 0.1 * (v.r - 0.5));
  // Under the top deck, narrow rifts 2 to 8 km across let shafts in close by.
  // Two crossed scales hide the noise tile's repeat.
  if (seed == 3.1) {
    vec2 xr = vec2(0.8 * xz.x - 0.6 * xz.y, 0.6 * xz.x + 0.8 * xz.y);
    float w1 = textureLod(uVol, vec3(xz / 37.0 + vec2(uT * 0.0001, 0.29), 0.83), 0.0).a;
    float w2 = textureLod(uVol, vec3(xr / 53.0 + vec2(0.61, uT * 0.00007), 0.17), 0.0).g;
    b = max(b, smoothstep(0.74 - soft, 0.8 + 0.3 * soft, w1 * 0.65 + w2 * 0.45));
  }
  return b;
}
// The void round a height, floor included: its ceiling and its seed. x under -1000 means none.
vec2 voidOver(float h) {
  return h > -46.0 && h < 0.0 ? vec2(2.0, 3.1) : h > -70.0 && h < -50.0 ? vec2(-50.0, 7.7)
    : h > -236.0 && h < -158.0 ? vec2(-158.0, 11.3) : h > -366.0 && h < -262.0 ? vec2(-262.0, 5.9)
    : h > -431.0 && h < -385.0 ? vec2(-385.0, 9.4) : vec2(-1e4, 0.0);
}
// The share of the light from above that reaches p through a break.
float shaftAt(vec3 p, float h, vec3 ld, vec3 upv, vec2 vo) {
  vec3 q = p + ld * ((vo.x - h) / max(dot(ld, upv), 0.2));
  // The gyre's eye is open to the deck above.
  return max(breakAt(q.xz, vo.y, 0.12), vo.y == 5.9 ? gyreEye(q.xz) : 0.0);
}
// The light's way down in the decks: slanted to the sun's side.
// f is the height in the void, 0 at the floor, 1 at the ceiling.
float gyre(vec3 p, float f) {
  vec2 q = p.xz - GY_C;
  float r = length(q);
  // The wall flares outward as it rises.
  float Rw = mix(140.0, 200.0, f * f);
  float res = 0.0;
  if (r < Rw + 260.0) {
    // The wall and the bands swirl on angle and log radius, as the storm does.
    float a = atan(q.y, q.x) + uT * 0.004 - 1.6 * log(r / Rw + 0.05);
    float sw = textureLod(uVol, vec3(cos(a) * 0.45, f * 0.8 + uT * 0.001, sin(a) * 0.45) + vec3(0.21, 0.0, 0.63), 0.0).r;
    float wall = smoothstep(Rw + 30.0, Rw + 6.0, r) * smoothstep(Rw - 18.0, Rw - 4.0, r);
    // Feeder bands: thin spirals that hug the floor.
    float arm = smoothstep(0.75, 0.92, 0.5 + 0.5 * sin(3.0 * a + 4.0 * sw)) * smoothstep(Rw + 220.0, Rw + 60.0, r)
      * smoothstep(Rw + 10.0, Rw + 40.0, r) * (1.0 - smoothstep(0.04, 0.14, f));
    res = max(wall * (0.5 + 0.6 * sw), arm * 0.7 * sw);
  }
  return res;
}
vec3 deepLight(vec3 upv) { return normalize(upv * 0.75 + normalize(SUN - upv * dot(SUN, upv)) * 0.66); }
// @seg upper
${TW_DECL}
// @end
// Storm curtains and rare twisters in a void from flo to cei.
// cu is the share of storm cells with a curtain; tw the share of curtains with a twister.
// Storms gather where convection does, as the towers do.
float stormsIn(vec3 p, float h, float flo, float cei, float seed, float cs, float tw, float cu) {
  float H = cei - flo;
  float f = clamp((h - flo) / H, 0.0, 1.0);
  float res = 0.0;
  vec2 cell = floor(p.xz / cs);
  vec3 r = th3(cell + seed + 29.0);
  vec3 r2 = th3(cell + seed + 53.0);
  float cl = textureLod(uVol, vec3((cell + 0.5) * 0.11, fract(seed * 0.13) + 0.62), 0.0).a;
  if (r.z > 1.0 - cu * 1.8 * smoothstep(0.42, 0.66, cl)) {
    vec2 c = (cell + 0.5) * cs + (r.xy - 0.5) * cs * 0.3;
    float rc = cs * (0.14 + 0.14 * r.y);
    // A curtain: rain that hangs from the ceiling in streaks and dries before the floor.
    float e = length((p.xz - c) * vec2(1.0, 1.7));
    if (e < rc) {
      float st = textureLod(uVol, vec3(p.x / 4.0, h / 60.0 - uT * 0.004, p.z / 4.0) + r, 0.0).g;
      float reach = 0.3 + 0.6 * r.x;
      float hang = smoothstep(1.0 - reach, 1.0 - reach + 0.35, f);
      res = 0.3 * smoothstep(rc, rc * 0.4, e) * smoothstep(0.45, 0.8, st) * hang;
    }
    // A twister drops from the rain-free base at the curtain's edge.
    // ?qa view 9 drops a twister at every curtain.
    if (r2.z > 1.0 - (uDbg > 8.5 && tw > 0.0 ? 1.0 : tw)) {
      float an = r2.x * 6.2832;
      vec2 tc = c + vec2(cos(an), sin(an) / 1.7) * rc * 1.05;
      // It wanders slowly; the foot trails the top; the rope sways.
      tc += rc * 0.15 * vec2(sin(uT * 0.013 + r2.y * 6.3), cos(uT * 0.011 + r2.x * 6.3));
      tc += vec2(cos(an), sin(an)) * (1.0 - f) * H * 0.35 * (r2.y - 0.3);
      tc += H * 0.04 * vec2(sin(f * 6.0 + uT * 0.07 + r2.y * 9.0), cos(f * 5.0 + uT * 0.06 + r2.x * 9.0));
      vec2 q = p.xz - tc;
      float rr = length(q);
      float f3 = f * f * f;
      float rad = H * (0.008 + 0.01 * r2.y) * (1.0 + 9.0 * f3 * f3) + H * 0.05 * exp(-f * 20.0);
      if (rr < rad * 1.6 + 0.4) {
        // The wall swirls on angle and log radius, as in Tornado alley, so it never winds up.
        float a = atan(q.y, q.x) - uT * (0.4 + 0.5 * r2.x) - 2.0 * log(max(rr, 0.05));
        float sw = textureLod(uVol, vec3(cos(a) * 0.4 + r2.x, h / (H * 0.6) - uT * 0.01, sin(a) * 0.4 + r2.y), 0.0).r;
        float twd = smoothstep(rad * 1.25 + 0.3, rad * 0.5, rr) * (0.35 + 0.9 * sw) * mix(0.45, 1.0, smoothstep(0.0, 0.15, f));
        if (twd > res) {
          res = twd;
          // Its side to the light comes from above, slanted to the sun, as deepLight() sets it.
          vec3 lt = deepLight(normalize(p - PC));
          gTw = vec4(dot(q / max(rr, 1e-3), normalize(lt.xz + 1e-5)), clamp(rr / (rad * 1.25 + 0.3), 0.0, 1.0), f, 1.0);
        }
      }
    }
  }
  return res;
}
// Density at p, 0 to 1. It sets gAlb, the albedo, and gOpen, how near a top it lies.
// The branches follow LAYERS in world.js, top down. No cloud lies under -500 km.
// fine scales the small billows; lod grows with distance.
// full is 0 for the light taps: they skip the details that cast no shade, so the compiler drops them.
float dens(vec3 p, float lod, float fine, float full) {
  float h = altOf(p);
  float d = 0.0;
  gAlb = vec3(0.9);
  gOpen = 0.0;
  gUnder = 0.0;
  gDeep = -1.0;
  gFold = 0.0;
  gFace = 1.0;
  gTw = vec4(0.0);
  if (h < min(TOP, ZHI) && h > max(BOT, ZLO)) {
    vec4 m = mapAt(p.xz);
    // A slow, wide warp breaks the noise lattice; the fine octave turns off its axes.
    vec4 nw = textureLod(uVol, vec3(p.x, h, p.z) / 1300.0 + vec3(0.3, 0.1, 0.7), 0.0);
    vec3 q = vec3(p.x, h * 2.5, p.z) + (nw.xyz - 0.5) * 110.0;
    vec4 n1 = textureLod(uVol, q / 70.0 + vec3(0.0, uT * 0.0006, 0.0), 0.0);
    vec3 qr = vec3(0.8 * q.x - 0.6 * q.z, q.y, 0.6 * q.x + 0.8 * q.z);
    vec4 n2 = textureLod(uVol, qr / 17.3 + vec3(0.37, uT * 0.0015, 0.71), 0.0);
    // In the storm the billows swirl: the noise lies on angle and log radius, as in Tornado alley.
    // On those axes the turn and the outflow are one slide, so nothing winds up.
    vec2 se = (p.xz - ST_C) / ST_AX;
    float sr = length(se);
    float wS = (1.0 - smoothstep(0.9, 1.2, sr)) * step(-8.0, h);
    if (wS > 0.0) {
      float lr = log(max(sr, 0.03)) - 0.00012 * uTMap;
      float ang = atan(se.y, se.x) + 0.0014 * uTMap - 2.6 * lr;
      // Tornado alley's ratio of log radius to angle: arms, not rings.
      vec3 sp = vec3(cos(ang) * 1.6 + lr * 2.0, h * 0.04, sin(ang) * 1.6);
      vec4 s1 = textureLod(uVol, sp + vec3(0.0, uT * 0.0006, 0.0), 0.0);
      vec4 s2 = textureLod(uVol, sp * vec3(3.1, 2.0, 3.1) + vec3(0.37, uT * 0.0015, 0.71), 0.0);
      n1 = mix(n1, s1, wS);
      n2 = mix(n2, s2, wS);
    }
    float nb = n1.r + fine * 0.3 * (n2.r - 0.5);
    // Wide cells break each deck here and there.
    vec4 nc = textureLod(uVol, vec3(0.6 * q.x + 0.8 * q.z, h * 4.0, 0.8 * q.x - 0.6 * q.z) / 157.0 + vec3(0.11, 0.0, 0.53), 0.0);
    float f = 0.0;
    // A void sets vd (floor, ceiling, seed, hue) and vk (storm cell km, twister share, curtain share, ceiling hue).
    vec4 vd = vec4(0.0);
    vec4 vk = vec4(0.0);
    // @seg ammonia
    if (h > 0.0) {
      // The ammonia deck: tops follow the map; billows stand on them; a lumpy ceiling below.
      // Billows stand taller in the zones and the storm, where the cloud is thick.
      // The swirls set the big forms: arms, rolls and folds, after Tornado alley's deck.
      // The mip level follows the pixel's footprint: 2 km a texel.
      float tk = 120.0 * (exp2(lod) - 1.0);
      float mip = max(0.0, log2(max(tk, 1.0) * 0.00075));
      vec4 sw = textureLod(uSwirl, p.xz / SW_TILE + vec2(0.37, 0.61), mip);
      float big = swH(sw) + 2.0 * fine * (sw.g - 0.5);
      // After Tornado alley's storm base: a step toward the sun finds the lit side of each roll.
      // gFace is the sun on the slope over the sun on flat cloud.
      if (full > 0.5) {
        vec2 sxz = normalize(SUN.xz + 1e-5);
        float s = (swH(textureLod(uSwirl, (p.xz + sxz * 5.0) / SW_TILE + vec2(0.37, 0.61), mip)) - swH(sw)) / 5.0;
        gFace = clamp((SUN.y - s * length(SUN.xz)) / max(SUN.y, 0.05), 0.0, 2.5);
      }
      float top = 6.0 + 14.0 * m.r + big + 2.5 * (nb - 0.5);
      // Relief at Juno's scale: cells, popcorn heads and folded ridges, in km.
      // Convective cells 4 km across heap the tops.
      float rel = 5.0 * (n2.b - 0.45);
      // Popcorn heads stand up to 6 km over the deck.
      float pop = max(n2.b - 0.42, 0.0) / 0.58;
      rel += 6.0 * pop * pop;
      // Folded ridges run along the bands, with sharp crests.
      vec4 n3 = textureLod(uVol, vec3(qr.x / 150.0, h * 0.03, qr.z / 34.0) + vec3(0.21, 0.4, 0.47), 0.0);
      float rg = 1.0 - abs(2.0 * n3.a - 1.0);
      rel += 4.0 * rg * rg * rg - 1.4;
      rel *= fine * (0.25 + 0.4 * m.r);
      top += rel;
      // The underside belongs to the void below: the deck runs down to 0.
      float base = -1.0 + 2.0 * (nb - 0.5);
      float sh = min(top - h, (h - base) * 0.7);
      // The cover is whole: no holes, no breaks (Tom, 2026-11-24). The void's rays keep their own breaks.
      // A crisp top near the eye lets the heads cast shadows.
      d = smoothstep(0.0, 0.35 + 0.85 * lod, sh) * (0.55 + 0.45 * n1.b);
      // Inside, the deck churns: dense billows round thin pockets the eye sees through.
      // The top keeps its skin; the pockets open from 2 km down.
      // Pockets are 4 km across; the interior is thin enough to see billows 3 to 5 km off.
      float pocket = mix(0.06, 1.0, smoothstep(0.35, 0.7, n2.r + 0.4 * (n1.r - 0.5)));
      d *= mix(1.0, 0.45 * pocket, smoothstep(1.5, 4.0, top - h));
      // Near the eye the cloud shows fine wisps a kilometre across, rising slowly.
      if (full > 0.5 && lod < 0.4 && top - h > 1.0) d *= 0.35 + 1.3 * textureLod(uVol, q / 5.0 + vec3(0.0, uT * 0.004, 0.0), 0.0).g;
      gDeep = max(top - h, 0.0);
      // Hue drifts a little with the billows, so the colours blend in the cloud.
      // Valleys between heads see less sky; their colour runs deeper.
      float ao = clamp(0.5 + 0.2 * rel, 0.2, 1.15);
      float sat = clamp(m.b + 0.35 * (1.0 - ao), 0.0, 1.0);
      gAlb = mix(vec3(0.86, 0.9, 0.88), pal(m.g + 0.22 * (n1.a - 0.5) + 0.12 * (n2.a - 0.5)), sat);
      gOpen = clamp(1.0 - (top - h) / 6.0, 0.0, 1.0) * ao;
      // Folds and troughs between the arms go dark; the crests keep the light.
      gFold = clamp(smoothstep(1.5, -6.0, big + 0.6 * rel) * 0.6 + 0.6 * (1.0 - smoothstep(0.2, 0.9, gFace)), 0.0, 1.0);
      // Thunderheads: one 90 km cell in fifteen in the zones punches up to 32 to 40 km.
      // A lumpy tower with a domed top; a thin anvil spreads downwind in the top fifth.
      vec2 tc = floor(p.xz / 90.0);
      vec3 tr = th3(tc + 71.0);
      if (tr.z > 0.965 - 0.05 * m.r) {
        float H = 32.0 + 8.0 * tr.x;
        float g = clamp(h / H, 0.0, 1.0);
        vec2 tq = p.xz - (tc + 0.2 + 0.6 * tr.xy) * 90.0;
        float rc = (5.0 + 5.0 * tr.y) * (0.6 + 0.5 * g);
        float dist = length(tq);
        // Cauliflower sides: two sizes of lumps bite the tower's edge.
        float edge = rc * (0.6 + 0.7 * n2.b) + rc * 0.5 * (n1.r - 0.5) - dist;
        // The overshooting dome: the top falls away from the axis.
        float kd = dist / (rc * 1.4);
        float cap = H - 5.0 * kd * kd + 3.0 * (n2.b - 0.5) - h;
        float th = smoothstep(0.0, 0.8 + lod, min(edge, cap * 2.0)) * (0.7 + 0.3 * n1.b);
        // The anvil: a thin sheet three to five times the tower's width, pushed downwind, ragged at its rim.
        float ra = rc * (3.0 + 2.0 * tr.x);
        float ae = ra * (0.55 + 0.7 * n2.r) - length(tq - vec2(0.6, 0.2) * ra * 0.7);
        float at = min(h - (H * 0.84 - 1.0 * n1.r), H + 1.5 * (n2.b - 0.5) - h);
        // The anvil's rim frays over several km, so it never reads as a hard disc.
        th = max(th, smoothstep(0.0, 4.0 + lod, min(ae * 0.5, at * 2.0)) * 0.4 * smoothstep(0.35, 0.75, n2.r + 0.3 * (n1.b - 0.5)));
        if (th > d) {
          d = th;
          gAlb = mix(vec3(0.9, 0.94, 0.92), pal(m.g + 0.1 * (n1.a - 0.5)), 0.45);
          gOpen = clamp(1.0 - cap / 6.0, 0.3, 1.0);
          gDeep = max(min(edge, cap), 0.0);
        }
      }
      // The haze lid: thin teal sheets over the tops.
      if (full > 0.5 && h > 20.0) {
        vec3 hid;
        // Near the eye the sheets read as veils; far off they stay faint, so the horizon stays clear.
        float hz = sheets(h, 22.0, 5.5, 0.6, nb, nc.a - 0.05, lod, hid) * mix(0.07, 0.0, smoothstep(0.1, 2.0, lod)) * band(h, 22.0, 40.0, 2.0);
        // The wind combs each sheet into thin streaks, 60 km long and 3 km wide.
        hz *= smoothstep(0.45, 0.8, textureLod(uVol, vec3(qr.x / 60.0, h / 9.0, qr.z / 3.0) + vec3(0.13, 0.0, 0.41), 0.0).a);
        if (hz > d) { d = hz; gAlb = mix(pal(0.45), vec3(0.9), 0.5); gOpen = 1.0; }
      }
    } else
    // @end
    // @seg upper
    if (h > -40.0) {
      // The upper void: towers stand between the brown floor and the white ceiling.
      // It is 42 km tall, the tallest void under the tops (Tom, 2026-11-24).
      d = tower(p, h, -40.0, 2.0, 3.1, nb, 48.0, 0.5, f) * (0.6 + 0.4 * n1.b);
      gAlb = mix(pal(0.5 + 0.3 * n1.a), pal(0.1), f);
      gOpen = f;
      // Dust heaps round the twisters' feet, ragged and torn by the noise.
      if (full > 0.5 && h < -34.0) {
        // Over a hole in the deck no dust rises.
        float dh = twDust(p.xz);
        if (dh > 0.05) dh *= twGround(p.xz);
        float du = smoothstep(0.0, 1.2, -40.0 + dh * (0.5 + 0.7 * n1.b) - h) * smoothstep(0.3, 0.6, n2.r + 0.25) * 0.8;
        if (du > d) { d = du; gAlb = mix(pal(0.34), pal(0.6), n1.a); gOpen = 0.4; }
      }
      vd = vec4(-40.0, 2.0, 3.1, 0.5);
      vk = vec4(70.0, 0.0, 0.35, 0.05);
    } else
    // @end
    // @seg brown
    if (h > -50.0) {
      // The brown deck: a floor above, a ceiling below, a few breaks.
      float cov = smoothstep(0.18, 0.36, 1.0 - nc.a + 0.08 * (nb - 0.5));
      float sh = min(-40.0 + 3.0 * (nb - 0.5) - h, (h + 52.0) * 0.8);
      d = smoothstep(0.0, 1.6 + lod, sh) * cov * 0.85 * (1.0 - breakAt(p.xz, 7.7, 0.0));
      gAlb = mix(pal(0.34), pal(0.6), n1.a);
      gOpen = clamp(1.0 - (-40.0 - h) / 5.0, 0.0, 1.0);
    } else
    // @end
    // @seg mushball
    if (h > -64.0) {
      // The mushball fall: darker towers, and slush hail falling in streaks.
      d = tower(p, h, -64.0, -50.0, 7.7, nb, 48.0, 0.5, f) * (0.6 + 0.4 * n1.b);
      gAlb = mix(pal(0.95 + 0.15 * n1.a), pal(0.45), f);
      gOpen = f;
      // The hail falls in patches 50 to 100 km across, at 0.6 km/s.
      float mp = full > 0.5 ? smoothstep(0.5, 0.75, textureLod(uVol, vec3(p.xz / 220.0, 0.83), 0.0).a) : 0.0;
      if (mp > 0.0) {
        float st = textureLod(uVol, vec3(p.x / 2.2, h / 24.0 + uT * 0.025, p.z / 2.2), 0.0).g;
        float mb = 0.18 * mp * smoothstep(0.62, 0.85, st);
        if (mb > d) { d = mb; gAlb = vec3(0.85, 0.9, 0.95); gOpen = 0.6; }
      }
      vd = vec4(-64.0, -50.0, 7.7, 0.95);
      vk = vec4(60.0, 0.15, 0.4, 0.45);
    } else
    // @end
    // @seg water
    if (h > -92.0) {
      // The water deck, heaped where the storm's wake churns.
      float top = -64.0 + 22.0 * m.a * n1.a + 5.0 * (nb - 0.5);
      float sh = min(top - h, (h + 92.0) * 0.8);
      float cov = smoothstep(0.3, 0.5, nc.a + 0.4 * m.a + 0.08 * (nb - 0.5));
      d = smoothstep(0.0, 1.6 + lod, sh) * (0.5 + 0.5 * n1.b) * cov;
      gAlb = mix(vec3(0.72, 0.66, 0.84), pal(0.9), 0.4 * n1.a);
      gOpen = clamp(1.0 - (top - h) / 8.0, 0.0, 1.0);
    } else
    // @end
    // @seg shelves
    if (h > -140.0) {
      // The shelves: violet sheets 16 km apart, some whole, some lace.
      vec3 id;
      d = sheets(h, -140.0, 16.0, 1.6, nb, nc.a, lod, id) * (0.5 + 0.5 * n1.b);
      gAlb = pal(0.9 + 0.3 * id.x + 0.1 * n1.a);
      gOpen = 0.6 + 0.4 * id.y;
    } else
    // @end
    // @seg veil
    if (h > -158.0) {
      // The veil: a thin purple gauze, combed into streaks.
      d = 0.14 * smoothstep(0.35, 0.75, nb) * band(h, -158.0, -140.0, 3.0);
      gAlb = mix(pal(1.0), pal(1.15), n1.a);
      gOpen = 0.5;
    } else
    // @end
    // @seg nave
    if (h > -230.0) {
      // The nave: a forest of columns 72 km tall, close set.
      d = tower(p, h, -230.0, -158.0, 11.3, nb, 64.0, 0.75, f) * (0.55 + 0.45 * n1.b);
      gAlb = mix(pal(0.55 + 0.1 * n1.a), pal(0.95), f);
      gOpen = 0.3 + 0.7 * f;
      vd = vec4(-230.0, -158.0, 11.3, 0.55);
      vk = vec4(110.0, 0.1, 0.3, 1.05);
    } else
    // @end
    // @seg indigo
    if (h > -262.0) {
      // The indigo deck: heaped on top, pouches hang from its base.
      float pop = max(n2.b - 0.4, 0.0) / 0.6;
      float top = -230.0 + 6.0 * (nb - 0.5) + 5.0 * pop * pop;
      float base = -265.0;
      float sh = min(top - h, (h - base) * 0.8);
      float cov = smoothstep(0.22, 0.42, nc.a + 0.12);
      d = smoothstep(0.0, 1.2 + lod, sh) * (0.5 + 0.5 * n1.b) * cov * (1.0 - breakAt(p.xz, 5.9, 0.0)) * (1.0 - gyreEye(p.xz));
      gAlb = mix(vec3(0.36, 0.34, 0.74), pal(0.5), 0.35 * n1.a);
      gOpen = clamp(1.0 - (top - h) / 8.0, 0.0, 1.0);
    } else
    // @end
    // @seg gyre
    if (h > -360.0) {
      // The gyre: colossal towers, floating shelves, and a vast eyewall far ahead.
      d = tower(p, h, -360.0, -262.0, 5.9, nb, 150.0, 0.45, f) * (0.55 + 0.45 * n1.b);
      vec3 id;
      float sv = sheets(h, -360.0, 33.0, 1.0, nb, nc.a - 0.25, lod, id);
      gAlb = mix(mix(pal(0.45), pal(0.15), f), pal(1.05 + 0.15 * id.x), step(d, sv));
      d = max(d, sv * 0.8);
      float gy = full > 0.5 ? gyre(p, f) : 0.0;
      if (gy > d) { d = gy; gAlb = mix(pal(0.2 + 0.1 * n1.a), vec3(0.95), 0.5); gOpen = 0.8; }
      gOpen = 0.3 + 0.7 * f;
      vd = vec4(-360.0, -262.0, 5.9, 0.15);
      vk = vec4(150.0, 0.18, 0.35, 0.8);
    } else
    // @end
    // @seg salt
    if (h > -385.0) {
      // The salt deck: pale jade, flat, its top in long wave rows.
      float top = -360.0 + 3.0 * sin(qr.x / 9.0 + 4.0 * n1.r) * (0.6 + 0.4 * nb);
      float base = -388.0;
      float sh = min(top - h, (h - base) * 0.8);
      d = smoothstep(0.0, 1.0 + lod, sh) * (0.6 + 0.4 * n1.b) * smoothstep(0.12, 0.3, nc.a + 0.1);
      gAlb = mix(pal(0.08), pal(0.25), n1.a);
      gOpen = clamp(1.0 - (top - h) / 5.0, 0.0, 1.0);
    } else
    // @end
    // @seg nest
    if (h > -425.0) {
      // The lightning nest: thin towers lit from inside by discharge.
      d = tower(p, h, -425.0, -385.0, 9.4, nb, 40.0, 0.6, f) * (0.55 + 0.45 * n1.b);
      gAlb = mix(pal(0.6), pal(1.0), f);
      gOpen = 0.3 + 0.7 * f;
      vd = vec4(-425.0, -385.0, 9.4, 0.6);
      vk = vec4(60.0, 0.0, 0.25, 0.1);
    } else
    // @end
    // @seg stairs
    if (h > -470.0) {
      // The stairs: thin laminae 9 km apart, teal and violet by turns.
      vec3 id;
      d = sheets(h, -470.0, 9.0, 0.9, nb, nc.a + 0.15, lod, id) * (0.55 + 0.45 * n1.b);
      gAlb = pal(mod(floor((h + 470.0) / 9.0), 2.0) < 0.5 ? 0.5 + 0.15 * id.x : 0.95 + 0.15 * id.x);
      gOpen = 0.6 + 0.4 * id.y;
    } else
    // @end
    // @seg last
    {
      // The last deck: dark magenta, churned, with tall heads.
      float pop = max(n2.b - 0.4, 0.0) / 0.6;
      float top = -470.0 + 10.0 * (nb - 0.5) + 8.0 * pop;
      float sh = min(top - h, (h + 500.0) * 0.8);
      d = smoothstep(0.0, 1.4 + lod, sh) * (0.5 + 0.5 * n1.b) * smoothstep(0.2, 0.4, nc.a + 0.1);
      gAlb = mix(pal(1.12), pal(0.95), n1.a) * 0.8;
      gOpen = clamp(1.0 - (top - h) / 10.0, 0.0, 1.0);
    }
    // @end
    {}
    // One call for every void: the storms in it.
    if (full > 0.5 && vk.x > 0.0) {
      // The ceiling is a storm base, after Tornado alley's: deep folded lumps on a warped field,
      // broad rolls, billows on the skin, ragged scud under it.
      // The lumps come from flat maps, so each keeps its shape through its depth.
      float cb = vd.y - 1.0;
      // @seg upper
      // The base sags into a wall cloud round each twister's top, so the flare grows out of it.
      if (vd.z == 3.1) cb -= twSag(p.xz);
      // @end
      float sc = 0.0, ex = 0.0;
      if (h > cb - 9.0) {
        vec3 lq = vec3(p.x, 0.0, p.z);
        vec4 wq = textureLod(uVol, lq / 90.0 + vec3(0.0, vd.z * 0.1 + uT * 0.0002, 0.0), 0.0);
        // A strong warp folds the lumps into each other.
        lq += (wq.xyz - 0.5) * 34.0;
        float roll = textureLod(uVol, vec3(lq.x / 160.0, vd.z * 0.1 + 0.5, lq.z / 60.0), 0.0).a;
        float l1 = textureLod(uVol, lq / 48.0 + vec3(0.0, vd.z * 0.1 + 0.25, 0.0), 0.0).b;
        float l2 = textureLod(uVol, lq / 16.0 + vec3(0.5, vd.z * 0.1 + 0.75, 0.2), 0.0).b;
        float k1 = smoothstep(0.3, 0.95, l1), k2 = smoothstep(0.4, 0.95, l2);
        float drop = 3.0 * (roll - 0.5) + 4.5 * k1 * k1 + 1.5 * k2 * fine + 0.6 * (n2.r - 0.5) * fine;
        cb -= drop;
        // How far the skin hangs: crests catch the floor's light, folds go black.
        ex = clamp((drop + 1.0) / 7.0, 0.0, 1.0);
        sc = smoothstep(0.6, 0.8, n2.r + 0.2 * (n1.b - 0.5)) * band(h, cb - 3.0, cb - 0.3, 0.6) * 0.45;
      }
      float dc = smoothstep(0.0, 0.25 + 0.5 * lod, h - cb) * (0.7 + 0.3 * n1.b);
      float br = max(breakAt(p.xz, vd.z, 0.0), vd.z == 5.9 ? gyreEye(p.xz) : 0.0);
      float dd = max(dc * (1.0 - br), sc * (1.0 - 0.5 * br));
      if (dd > d) {
        d = dd;
        gAlb = mix(pal(vk.w + 0.08 * n1.a), vec3(0.8), 0.25);
        gOpen = 0.1;
        gUnder = (1.0 - smoothstep(cb + 0.3, cb + 1.6, h)) * (0.06 + 1.4 * ex * ex);
        gBounceC = pal(vd.w);
      }
      float sd = stormsIn(p, h, vd.x, vd.y, vd.z, vk.x, vk.y, vk.z);
      if (sd <= d) gTw = vec4(0.0);
      if (sd > d) {
        d = sd;
        gAlb = mix(pal(vd.w + 0.1 * n1.a), vec3(0.85), 0.35);
        gOpen = 0.5;
      }
    }
  }
  return d;
}
// The top deck's density from its bands, swirls and thunderheads alone: two reads, not eight.
// Far taps use it; near ones read the full density, so popcorn heads keep their shadows.
float topDens(vec3 q) {
  float h = altOf(q);
  if (h > 40.0 || h < 0.0) return 0.0;
  vec4 m = mapAt(q.xz);
  float top = 6.0 + 14.0 * m.r + swH(textureLod(uSwirl, q.xz / SW_TILE + vec2(0.37, 0.61), 2.0));
  float d = smoothstep(0.0, 1.5, top - h) * 0.8;
  vec2 tc = floor(q.xz / 90.0);
  vec3 tr = th3(tc + 71.0);
  if (tr.z > 0.965 - 0.05 * m.r) {
    float H = 32.0 + 8.0 * tr.x, g = clamp(h / H, 0.0, 1.0);
    vec2 tq = q.xz - (tc + 0.2 + 0.6 * tr.xy) * 90.0;
    float rc = (5.0 + 5.0 * tr.y) * (0.6 + 0.5 * g) * 0.95, ra = rc * (3.0 + 2.0 * tr.x);
    d = max(d, smoothstep(0.0, 1.5, min(rc - length(tq), (H - h) * 2.0)) * 0.8);
    d = max(d, smoothstep(0.0, 1.5, min(ra * 0.9 - length(tq - vec2(0.6, 0.2) * ra * 0.7), min(h - H * 0.84, H - h) * 2.0)) * 0.45);
  }
  return d;
}
// Optical depth toward the light over four growing taps, to 33 km.
// A low sun needs the reach: a 6 km head throws a 34 km shadow.
float lightOD(vec3 p, vec3 ld, float lod) {
  float od = 0.0, st = 1.2;
  bool cheap = lod > 0.8 && altOf(p) > 0.0;
  for (int j = 0; j < 4; j++) {
    p += ld * st;
    od += (cheap ? topDens(p) : dens(p, lod + 1.0, 0.0, 0.0)) * st;
    st *= 2.6;
  }
  return od;
}
// @seg upper
// The upper void's twisters: baked walls, lit live (twisters.js).
${TW_MARCH}
// A twister layer over the baked far view: the haze in front fades it, and behind the bake's
// first cloud only what shows through counts. fd is that cloud's depth.
vec4 twFar(vec4 f, float fd, vec4 L, float tL) {
  if (tL <= 0.0 || L.a < 1e-3) return f;
  // The glow of the lit haze in front counts as haze too, so the fade runs faster than the gas alone.
  float th = exp(-max(tL - uNear, 0.0) * 2.5 / (690.0 * uTune.w));
  // A twister that enters a cloud fades into it over a few km.
  float k = th * L.a * mix(1.0, 1.0 - f.a, smoothstep(fd - 4.0, fd + 4.0, tL));
  return vec4(mix(f.rgb, L.rgb / L.a, k), mix(f.a, 1.0, k));
}
// @end
void main() {
  vec3 ro = uCam;
  vec2 c = (vUv + uJit) * 2.0 - 1.0;
  vec3 rd = normalize(uFwd + c.x * uRight + c.y * uUp);
  float camH = altOf(ro);
  // The slab of cloud between the top shell and the bottom shell.
  // Rays stop at the zone's floor: nothing under it shows from this zone.
  vec2 hT = sphereHit(ro, rd, R + TOP), hB = sphereHit(ro, rd, R + max(BOT, ZLO));
  float t0 = camH > TOP ? hT.x : 0.0;
  float t1 = hB.x > 0.0 && hB.x < 1e8 ? hB.x : hT.y;
  if (camH > TOP && hT.x > hT.y) t1 = -1.0;
  bool inWin = camH < 38.0;
  // In a void the window opens to 1,600 km and the steps grow faster.
  float vw = clamp((uWin - 220.0) / 1380.0, 0.0, 1.0);
  float grow = mix(0.012, 0.024, vw), cap = mix(9.0, 30.0, vw);
  // A ray that the window cuts ends in fog; one that leaves through the top sees the sky.
  bool winEnd = inWin && uWin < t1;
  if (inWin) t1 = min(t1, uWin);
  float t0a = t0;
  bool nearOnly = uMode > 0.5 && uMode < 1.5;
  // @seg upper
  // The twisters stay live in every mode but the bake, to the ray's full length.
  float twT = -1.0, twT2 = -1.0;
  vec4 twC = vec4(0.0), twC2 = vec4(0.0);
  if (t1 > t0) twC = twisters(ro, rd, t0, t1, twT, twC2, twT2);
  // @end
  if (uMode > 1.5) t0 = max(t0, uNear);
  if (nearOnly && t1 > uNear) { t1 = uNear; winEnd = false; }
  // The window fog, the deck's far haze and the aerial perspective belong to the far view.
  bool tail = !nearOnly;
  vec4 res = vec4(0.0);
  float hitD = 1e4;
  if (t1 > t0) {
    float mu = dot(rd, SUN);
    float ph = clPhase(mu);
    // Interleaved gradient noise: an even spread that the history pass settles fast.
    float t = t0 + (0.3 + 0.006 * t0) * fract(52.9829189 * fract(dot(gl_FragCoord.xy + uSeed * 5.588, vec2(0.06711056, 0.00583715))));
    vec3 col = vec3(0.0);
    float T = 1.0, tHit = -1.0;
    // @seg upper
    // @end
    // sk shrinks the steps after the first hit, so a crisp skin is not stepped over.
    float sk = 1.0;
    bool refined = false;
    int n = int(uSteps);
    for (int i = 0; i < 400; i++) {
      if (i >= n || t > t1 || T < 0.02) break;
      // @seg upper
      // The march reaches a twister: it covers what lies behind it.
      if (twT > 0.0 && t >= twT) { col += T * twC.rgb; T *= 1.0 - twC.a; twT = -1.0; }
      if (twT2 > 0.0 && t >= twT2) { col += T * twC2.rgb; T *= 1.0 - twC2.a; twT2 = -1.0; }
      // @end
      vec3 p = ro + rd * t;
      float ds = min(inWin ? 0.3 + grow * t : 0.3 + 0.0075 * t, cap + (0.004 + 0.006 * vw) * t) * sk;
      sk = min(1.0, sk * 1.3);
      float lod = clamp(log2(1.0 + t / 120.0), 0.0, 4.0);
      float dn = dens(p, lod, uFine * (1.0 - smoothstep(1.5, 3.0, lod)), 1.0);
      // At the first hit, step back and come in again at a fifth of the step.
      if (dn > 0.003 && !refined && ds > 0.5) {
        refined = true;
        // The loop's end adds this step back, so step back two.
        t -= ds * 3.2;
        sk = 0.2;
        dn = 0.0;
      }
      if (dn > 0.003) {
        vec3 alb = gAlb;
        float open = gOpen;
        float under = gUnder;
        float deep = gDeep;
        vec3 bc = gBounceC;
        float fold = gFold;
        float face = gFace;
        vec4 tw = gTw;
        if (tHit < 0.0) tHit = t;
        float h = altOf(p);
        vec4 L = lut(h);
        // Under the deck tops the light comes down through the ceiling, slanted to the sun's side.
        vec3 upv = normalize(p - PC);
        vec3 ld = normalize(mix(deepLight(upv), SUN, L.a));
        // Inside a deck the light comes down from the bright cloud above, so the taps look up.
        if (deep > 0.0) ld = normalize(mix(ld, upv, smoothstep(1.5, 4.0, deep)));
        // Fire's smoke: Beer, multiple scatter, powder, a shadow ambient.
        // Far clouds in the decks take a mean depth; far ones seen from above take none.
        float tau = SIG * (lod < 2.5 ? lightOD(p, ld, lod) : inWin ? 3.0 : 0.0);
        float beer = exp(-tau);
        // The multiple-scatter term carries the light into the cloud, so thin parts glow.
        float lit = beer + uTune.x * exp(-0.22 * tau);
        float powder = 1.0 - exp(-2.0 * tau - 0.6);
        lit = mix(lit, lit * powder, 0.35) + 0.025;
        float ring = ringShadow(p);
        // The skin takes the slope's light; deeper in, the cloud does not.
        vec3 sun = L.rgb * L.a * lit * ph * ring * 0.85 * mix(1.0, face, open);
        // The light from above lights what it reaches; it glows forward when the eye looks toward it.
        float phD = mix(1.0, clPhase(dot(rd, ld)), 0.4);
        vec3 diffuse = L.rgb * (1.0 - L.a) * (0.07 + 0.45 * open * open + 1.0 * lit * phD) * uTune.y;
        // In a void the light comes mostly through the breaks: pools of light, wide shade.
        vec2 vo = voidOver(h);
        if (vo.x > -1e3) diffuse *= mix(0.5, 1.0 + 0.9 * uRays, shaftAt(p, h, ld, upv, vo));
        vec3 sky = SKY_C * L.a * (0.25 + 0.75 * open) * (0.6 + 0.4 * ring);
        // The lit floor bounces its light up onto the ceiling's underside.
        vec3 bounce = L.rgb * mix(vec3(1.0), bc * 1.3, 0.5) * (1.0 - L.a) * uTune.z * 2.0 * under;
        // Sunlight diffuses down into a deck: none at the skin, most 3 to 6 km in, then it fades.
        vec3 inner = deep >= 0.0 ? L.rgb * 1.2 * (1.0 - exp(-deep / 1.5)) * exp(-deep / 14.0) * (0.25 + 0.75 * lit) : vec3(0.0);
        // A roll turned from the sun glows little inside; its folds stay dark.
        inner *= (0.15 + 0.85 * clamp(face, 0.0, 1.0)) * (1.0 - 0.8 * fold);
        // After Tornado alley's storm base: folds lose the light from above and the sky.
        diffuse *= mix(1.0, 0.22, fold);
        sky *= mix(1.0, 0.35, fold);
        // On the top deck the sun leads; shade keeps little fill, as under Tornado alley's deck.
        float topK = h > 0.0 && deep >= 0.0 ? 1.0 : 0.0;
        float shK = mix(1.0, mix(0.25, 1.0, clamp(lit, 0.0, 1.0)), topK);
        sky *= shK;
        diffuse *= shK;
        sun *= 1.0 + 0.6 * topK;
        vec3 Lc = alb * (sun + diffuse + sky + bounce + inner);
        // A twister takes Tornado alley's funnel light (shellCol in tornado/funnel.js).
        // The lit side falls off into the body; the shade side fills cool slate, less with depth.
        if (tw.w > 0.5) {
          float tod = (1.0 - tw.x) * 1.1 + (1.0 - tw.y) * 0.9 * (0.5 - 0.5 * tw.x) + smoothstep(0.45, 1.0, tw.z) * 0.9;
          float tl = (exp(-tod) + 0.3 * exp(-tod * 0.4) + 0.05 * exp(-tod * 0.16)) / 1.35;
          vec3 amb = (sky + bounce + diffuse * 0.3) * vec3(0.7, 0.85, 1.2) * (0.3 + 0.55 * tw.z) * exp(-max(0.0, 1.0 - tw.y) * 1.6);
          Lc = alb * ((sun + diffuse) * tl * 1.8 + amb * 1.5);
        }
        // Shade in the folds takes a bruised violet, never a grey wash.
        Lc *= mix(vec3(1.0), vec3(0.88, 0.8, 1.1), fold * (1.0 - clamp(lit, 0.0, 1.0)) * 0.8);
        // Deep in a deck, dense cores shade themselves and thin wisps catch the light between them.
        if (deep > 1.5) Lc *= mix(1.0, mix(1.35, 0.45, smoothstep(0.08, 0.5, dn)), smoothstep(1.5, 4.0, deep));
        if (uDbg > 0.5 && uDbg < 8.5) Lc = uDbg < 1.5 ? vec3(face * 0.25) : uDbg < 2.5 ? vec3(fold * 0.5) : uDbg < 3.5 ? alb * sun : uDbg < 4.5 ? alb * inner : alb * (sky + diffuse);
        // Flashes light the cloud round them, with no shadow.
        for (int k = 0; k < 4; k++) {
          vec4 f = uFlash[k];
          if (f.w <= 0.0) continue;
          vec3 fq = f.xyz - p;
          float d2 = dot(fq, fq);
          Lc += FLASH_C * f.w * (1.8 * exp(-d2 / 60.0) + 0.5 * exp(-sqrt(d2) / 14.0));
        }
        float di = min(ds, 4.0 + 0.004 * t);
        float a = 1.0 - exp(-SIG * dn * di);
        col += T * Lc * a;
        T *= 1.0 - a;
      }
      // Clear gas between the clouds: a thin haze that thickens with depth.
      if (inWin && dn <= 0.003) {
        float hg = altOf(p);
        // The voids stay clear to the horizon; the gaps between sheets stay fairly clear.
        // Over the tops the air clears, so the deck runs to its far horizon.
        float mfp = mix(45.0, 170.0, smoothstep(-90.0, 0.0, hg)) + 700.0 * smoothstep(16.0, 34.0, hg) + 520.0 * band(hg, -40.0, 0.0, 3.0) + 300.0 * band(hg, -64.0, -50.0, 3.0)
          + 500.0 * band(hg, -230.0, -158.0, 6.0) + 700.0 * band(hg, -360.0, -262.0, 6.0)
          + 60.0 * band(hg, -140.0, -92.0, 6.0) + 60.0 * band(hg, -470.0, -425.0, 6.0) + 300.0 * band(hg, -425.0, -385.0, 3.0) + 40.0 * step(hg, -500.0);
        float sg = 1.0 / (mfp * uTune.w);
        vec3 gs = lut(hg).rgb * vec3(0.38, 0.42, 0.44);
        // Under the top deck: white haze near the eye, the void's green bleeding in far off.
        float nearK = 1.0 - smoothstep(8.0, 110.0, t);
        if (hg > -42.0 && hg < 0.0) {
          float lw = dot(lut(hg).rgb, vec3(0.3, 0.5, 0.2));
          sg += nearK * nearK / (420.0 * uTune.w);
          gs = mix(lut(hg).rgb * vec3(0.36, 0.72, 0.5), vec3(lw * 0.66), nearK * nearK);
        }
        float ag = 1.0 - exp(-sg * ds * 1.6);
        // God rays: in a void the gas glows where light falls through a break.
        // The shafts glow most when the eye looks toward the light.
        vec2 vo = voidOver(hg);
        if (vo.x > -1e3) {
          vec3 upg = normalize(p - PC);
          vec3 lg = deepLight(upg);
          float sh = shaftAt(p, hg, lg, upg, vo);
          float phS = mix(1.0, clPhase(dot(rd, lg)), 0.8);
          if (vo.y != 3.1) gs = gs * 0.55 + lut(vo.x + 6.0).rgb * sh * phS * 4.0 * uRays;
          else {
            // Under the top deck the shafts stand out on their own, near and far.
            // Each tapers as it falls: its soft edge tightens and it fades toward the floor.
            float fall = clamp((vo.x - hg) / 42.0, 0.0, 1.0);
            float shT = pow(sh, 1.0 + 3.0 * fall);
            // Not the void's green: pearl under the ceiling, then rose-violet or ice blue by place.
            float hue = textureLod(uVol, vec3(p.xz / 340.0, 0.47), 0.0).b;
            vec3 rc = mix(vec3(1.0, 0.88, 0.72), mix(vec3(0.86, 0.62, 1.0), vec3(0.55, 0.84, 1.0), smoothstep(0.35, 0.65, hue)), smoothstep(0.05, 0.7, fall));
            float lum = dot(lut(vo.x + 6.0).rgb, vec3(0.3, 0.5, 0.2));
            // Far off, the shafts take the void's green too.
            rc = mix(rc, normalize(lut(hg).rgb * vec3(0.36, 0.72, 0.5)) * 1.5, smoothstep(60.0, 420.0, t) * 0.75);
            col += T * rc * lum * shT * phS * min(ds, 6.0) * 0.02 * uRays * (1.0 - 0.7 * fall);
            // The haze glows in the light: pale near the eye, green far off.
            gs = gs * 0.55 + mix(lut(vo.x + 6.0).rgb, vec3(lum * 1.3), 0.1 + 0.6 * nearK) * sh * phS * 4.0 * uRays;
          }
        }
        col += T * gs * ag;
        // @seg nest
        // In the lightning nest the bolts show: a jagged channel floor to ceiling, and its glow.
        float nk = band(hg, -425.0, -385.0, 2.0);
        if (nk > 0.0) for (int k = 0; k < 4; k++) {
          vec4 fl = uFlash[k];
          if (fl.w <= 0.0) continue;
          vec2 jg = vec2(1.4 * sin(hg * 1.7 + fl.x) + 0.6 * sin(hg * 4.3), 1.4 * cos(hg * 1.3 + fl.z) + 0.6 * sin(hg * 3.7 + 1.0));
          vec2 cq = p.xz - fl.xz - jg;
          vec3 fq = fl.xyz - p;
          col += T * FLASH_C * fl.w * nk * (2.0 * exp(-dot(cq, cq) / 0.8) + 0.15 * exp(-dot(fq, fq) / 400.0)) * ds * 0.5;
        }
        // @end
        T *= 1.0 - ag;
      }
      t += ds * (dn > 0.003 ? 1.0 : 1.6);
    }
    // @seg upper
    // Layers past the march's end go on in depth order; past the near reach they go over the bake.
    if (!nearOnly) {
      if (twT2 > 0.0 && twT2 < twT) { col += T * twC2.rgb; T *= 1.0 - twC2.a; twT2 = -1.0; }
      if (twT > 0.0) { col += T * twC.rgb; T *= 1.0 - twC.a; twT = -1.0; }
      if (twT2 > 0.0) { col += T * twC2.rgb; T *= 1.0 - twC2.a; twT2 = -1.0; }
    }
    // @end
    // Inside the decks, the medium past the window is fog of the same light.
    if (winEnd && t >= t1 - 0.01 && T > 0.02) {
      vec4 L = lut(camH - 0.15 * min(uWin, 220.0));
      vec3 fog = vec3(0.74, 0.8, 0.82) * L.rgb * (0.5 + 0.5 * (1.0 - L.a));
      col += T * fog;
      T = 0.0;
    }
    // A grazing ray that runs out of steps over the deck ends in the deck's haze, not in space.
    vec3 oc = ro - PC;
    float bq = dot(oc, rd);
    float hMin = (bq < 0.0 ? length(oc - rd * bq) : length(oc)) - R;
    if (tail && !inWin && T > 0.02 && hMin < 22.0 && ((hB.x < hB.y && hB.x > 0.0) || t < t1 - 1.0)) {
      if (tHit < 0.0) tHit = t1;
      col += T * vec3(0.34, 0.58, 0.6) * 0.62;
      T = 0.0;
    }
    float al = 1.0 - T;
    // Aerial perspective over the deck: far bands fade into the limb's teal, brightest toward the sun.
    // The colour matches the sky's limb haze in sky.js, so the far deck melts into the horizon.
    if (tail && !inWin && tHit > 0.0) {
      float hz = 1.0 - exp(-(tHit - t0a) / 1100.0);
      vec3 hzC = vec3(0.38, 0.66, 0.68) * 0.5 * (0.7 + 0.5 * min(clPhase(dot(rd, SUN)), 3.0));
      col = mix(col, hzC * al, hz * 0.85);
    }
    res = vec4(col, al);
    if (tHit > 0.0) hitD = tHit;
    // ?qa view 6: red the cover, green a hit, blue what passes.
    if (uDbg > 5.5 && uDbg < 6.5) res = vec4(al * 0.3, tHit > 0.0 ? 0.3 : 0.0, T * 0.3, 1.0);
  }
  // Past the near reach, the baked far view.
  if (nearOnly) {
    vec4 far = texture(uFar, rd);
    // @seg upper
    // Twisters past the near reach go over the bake, the farther first.
    float fd = texture(uFarD, rd).r;
    far = twFar(far, fd, twC2, twT2);
    far = twFar(far, fd, twC, twT);
    // @end
    res = vec4(res.rgb + (1.0 - res.a) * far.rgb, res.a + (1.0 - res.a) * far.a);
  }
  o = res;
  oD = vec4(hitD, 0.0, 0.0, 1.0);
}`;

// The march in four zone programs, so each links fast and the others link in the background.
// Each zone holds its layers and the ones the eye sees from it: the deck above, the deck below.
export const ZONES = {
  // Over the top deck only the deck shows: its cover is whole (Tom, 2026-11-24).
  tops: { lo: -2, hi: 42, segs: ['ammonia'] },
  top: { lo: -92, hi: 42, segs: ['ammonia', 'upper', 'brown', 'mushball', 'water'] },
  mid: { lo: -262, hi: 22, segs: ['ammonia', 'upper', 'brown', 'mushball', 'water', 'shelves', 'veil', 'nave', 'indigo'] },
  deep: { lo: -505, hi: -140, segs: ['veil', 'nave', 'indigo', 'gyre', 'salt', 'nest', 'stairs', 'last'] },
};
/** The zone the eye at altitude h needs. */
export const zoneFor = h => (h > 12 ? 'tops' : h > -20 ? 'top' : h > -245 ? 'mid' : 'deep');
/** The march source for one zone: the segments it holds and its height range. */
export function marchFS(zone) {
  const z = ZONES[zone];
  return MARCH_SRC
    .replace(/[ ]*\/\/ @seg (\w+)\n([\s\S]*?)[ ]*\/\/ @end\n/g, (m, name, body) => (z.segs.includes(name) ? body : ''))
    .replace('const float ZLO = 0.0, ZHI = 0.0;', `const float ZLO = ${z.lo.toFixed(1)}, ZHI = ${z.hi.toFixed(1)};`);
}

