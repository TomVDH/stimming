// Load order: sky/impacts runs first.
import '../sky/impacts.ts';
import * as THREE from 'three';
import { reduced } from '../../../shared/stim.js';
import { state, type ShaftCloud } from '../state.ts';
import { rad } from '../setup.ts';
import { U } from '../world/uniforms.ts';
import { sstep } from '../sky/sun.ts';
import { polar } from '../world/farcountry.ts';
import { CLOUD_U, HEAPS, TOWERS } from './clouds.ts';
import { MIDS } from './lightning.ts';
import { ast, astMesh } from '../rock/asteroid.ts';
import { PU } from '../rock/trail.ts';

/* ---------- sun rays: cloud shadows in the low air ---------- */
// A low sun throws cloud and trail shadows through a dust layer.
// Each shadow is its occluder pushed away from the sun.
// The view ray's length in lit air sets the rays' light.
const SHAFT_N = 72, SHAFT_TR = 7;
export const SHAFT_U = {
  // Strength, the dust layer's top in metres, the ray's reach in metres.
  // The veil stands taller than real air.
  // The trail's high shadow then shows.
  uShaft: { value: new THREE.Vector3(0, 30000, 160000) },
  // Ellipsoids: centre and across radius; uOccV holds each upright radius.
  uOcc: { value: Array.from({ length: SHAFT_N }, () => new THREE.Vector4()) }, uOccV: { value: new Float32Array(SHAFT_N) }, uOccN: { value: 0 },
  // The trail as a chain: each point and its radius.
  uTr: { value: Array.from({ length: SHAFT_TR }, () => new THREE.Vector4()) }, uTrN: { value: 0 },
  // The cloud shade's gain: 0 at night.
  uCShade: { value: 0 },
};
export const SHAFT_GLSL = /* glsl */`
uniform vec3 uShaft;
uniform vec4 uOcc[${SHAFT_N}];
uniform float uOccV[${SHAFT_N}];
uniform int uOccN;
uniform vec4 uTr[${SHAFT_TR}];
uniform int uTrN;
// The ray's length inside the dust layer, from t0 to t1.
// The layer is even from the ground to uShaft.y.
float shM(vec3 ro, vec3 rd, float t0, float t1) {
  if (rd.y > 1e-5) t1 = min(t1, (uShaft.y - ro.y) / rd.y);
  return max(t1 - t0, 0.0);
}
// Clip the span iv to the part where a + b t is below zero.
vec2 shSide(vec2 iv, float a, float b) {
  if (abs(b) < 1e-6) return a < 0.0 ? iv : vec2(1.0, 0.0);
  float tz = -a / b;
  return b > 0.0 ? vec2(iv.x, min(iv.y, tz)) : vec2(max(iv.x, tz), iv.y);
}
// Skylight fills a shadow far behind its caster.
// x is the distance behind the caster, in metres.
float shFade(float x) { return exp(-max(x, 0.0) / 110000.0); }
uniform float uCShade;
// How dark the occluders make a world point: 0 lit, 1 in full shade.
// A point inside an occluder skips it: the cloud shades itself.
float shadeAt(vec3 P) {
  if (uCShade < 0.001) return 0.0;
  vec3 s = uSunD;
  float dark = 0.0;
  for (int i = 0; i < ${SHAFT_N}; i++) {
    if (i >= uOccN) break;
    float q = uOcc[i].w / uOccV[i], r = uOcc[i].w;
    vec3 o = P - uOcc[i].xyz, sq = s;
    o.y *= q; sq.y *= q; sq = normalize(sq);
    float along = dot(o, sq);
    if (along >= 0.0 || length(o) < 1.1 * r) continue;
    dark = max(dark, smoothstep(1.5 * r, 0.4 * r, length(o - sq * along)) * shFade(-along));
  }
  for (int i = 0; i < ${SHAFT_TR - 1}; i++) {
    if (i >= uTrN - 1) break;
    vec3 a0 = uTr[i].xyz, a1 = uTr[i + 1].xyz, r = P - a0;
    vec3 u = (a1 - a0) - s * dot(a1 - a0, s);
    float len = length(u);
    if (len < 1.0) continue;
    u /= len;
    vec3 rp = r - s * dot(r, s);
    float ga = dot(rp, u), along = dot(P - 0.5 * (a0 + a1), s), rad = 0.5 * (uTr[i].w + uTr[i + 1].w);
    if (ga < 0.0 || ga > len || along >= 0.0) continue;
    dark = max(dark, smoothstep(1.5 * rad, 0.4 * rad, length(rp - u * ga)) * shFade(-along));
  }
  return dark * uCShade;
}
// It returns the ray's lit share, 0 to 1, and its layer depth.
vec2 shafts(vec3 ro, vec3 rd, float L) {
  vec3 s = uSunD;
  float all_ = shM(ro, rd, 0.0, L), dark = 0.0;
  for (int i = 0; i < ${SHAFT_N}; i++) {
    if (i >= uOccN) break;
    // Squash y so the ellipsoid turns into a sphere.
    float q = uOcc[i].w / uOccV[i];
    vec3 o = ro - uOcc[i].xyz, d = rd, sq = s;
    o.y *= q; d.y *= q; sq.y *= q; sq = normalize(sq);
    // Seen down the sunlight, the shadow is a disc.
    // A wider disc with a soft edge stands in for the penumbra.
    vec3 op = o - sq * dot(o, sq), dp = d - sq * dot(d, sq);
    float r = uOcc[i].w, rs = 1.5 * r;
    float A = dot(dp, dp), B = dot(op, dp), C = dot(op, op) - rs * rs, D = B * B - A * C;
    if (D <= 0.0 || A < 1e-9) continue;
    float w = smoothstep(rs, 0.4 * r, sqrt(max(dot(op, op) - B * B / A, 0.0)));
    D = sqrt(D);
    vec2 iv = vec2(max((-B - D) / A, 0.0), min((-B + D) / A, L));
    // Only the side away from the sun lies in shadow.
    iv = shSide(iv, dot(o, sq), dot(d, sq));
    dark += shM(ro, rd, iv.x, iv.y) * w * shFade(-dot(o + d * 0.5 * (iv.x + iv.y), sq));
  }
  for (int i = 0; i < ${SHAFT_TR - 1}; i++) {
    if (i >= uTrN - 1) break;
    // One piece of the trail cone, as a slab of its mean radius.
    vec3 a0 = uTr[i].xyz, a1 = uTr[i + 1].xyz, r = ro - a0;
    vec3 u = (a1 - a0) - s * dot(a1 - a0, s);
    float len = length(u);
    if (len < 1.0) continue;
    u /= len;
    vec3 rp = r - s * dot(r, s), dp = rd - s * dot(rd, s);
    vec3 w0 = rp - u * dot(rp, u), w1 = dp - u * dot(dp, u);
    float rad = 0.5 * (uTr[i].w + uTr[i + 1].w), rs = 1.5 * rad;
    float A = dot(w1, w1), B = dot(w0, w1), C = dot(w0, w0) - rs * rs, D = B * B - A * C;
    if (D <= 0.0 || A < 1e-9) continue;
    float w = smoothstep(rs, 0.4 * rad, sqrt(max(dot(w0, w0) - B * B / A, 0.0)));
    D = sqrt(D);
    vec2 iv = vec2(max((-B - D) / A, 0.0), min((-B + D) / A, L));
    // Keep to the piece's own stretch.
    float ga = dot(rp, u), gb = dot(dp, u);
    iv = shSide(iv, ga - len, gb);
    iv = shSide(iv, -ga, -gb);
    iv = shSide(iv, dot(r - 0.5 * (a1 - a0), s), dot(rd, s));
    dark += shM(ro, rd, iv.x, iv.y) * w * shFade(-dot(r - 0.5 * (a1 - a0) + rd * 0.5 * (iv.x + iv.y), s));
  }
  return vec2(1.0 - min(dark / max(all_, 1.0), 1.0), all_);
}
// Shadow bands dim the sky; lit dust adds a sunward glow.
vec3 shaftSky(vec3 c, vec3 rd, float L) {
  if (uShaft.x < 0.001) return c;
  vec2 sh = shafts(cameraPosition, rd, L);
  float cs = dot(rd, uSunD), g = 0.62;
  float ph = (1.0 - g * g) / pow(1.0 + g * g - 2.0 * g * cs, 1.5) * 0.08 + 0.05;
  // The bands stay off the horizon.
  // The heaps' low shadows pile up there.
  float dk = 1.1 * (1.0 - sh.x) * smoothstep(0.015, 0.07, rd.y);
  // A long path through lit dust stops adding light.
  float lit = 1.0 - exp(-sh.y * sh.x / 40000.0);
  // Shade loses the warm sunlight first: it turns cool, then dim.
  float k = min(dk * uShaft.x, 0.85);
  return mix(c, c * vec3(0.5, 0.58, 0.74), k) + uGlowC * ph * lit * 0.4 * uShaft.x;
}`;
// Each cloud's world centre, as the cloud vertex shader drifts it.
export const hs1 = (n: number) => { const x = Math.sin(n * 12.9898) * 43758.5453; return x - Math.floor(x); };
export function shaftList(list: number[][]): ShaftCloud[] {
  return [...list].sort((a, b) => b[1] - a[1]).map((c, i) => ({ p: polar(rad(c[0]), c[1]), base: c[2], W: c[3], H: c[4], kind: c[5], sd: 13.7 * i + c[0] }));
}
state.shaftOcc = null;
const shaftV = new THREE.Vector3();
export function updateShafts() {
  const up = U.uSunD.value.y, u = SHAFT_U;
  // The rays need a low sun: dawn and late day only.
  const k = state.shaftGain * sstep(up, -0.06, 0.0) * (1 - sstep(up, 0.3, 0.55)) * (1 - U.uStars.value);
  u.uShaft.value.x = reduced() ? 0.6 * k : k;
  // The clouds take the shade at any sun height; not by night.
  u.uCShade.value = 1 - U.uStars.value;
  if (k < 0.001 && u.uCShade.value < 0.001) return;
  state.shaftOcc ??= [...shaftList(HEAPS), ...shaftList(TOWERS), ...(U.uDeck.value < 0.01 ? shaftList(MIDS) : [])];
  const t = CLOUD_U.uCloudC.value;
  let n = 0;
  for (const c of state.shaftOcc) {
    if (n >= SHAFT_N) break;
    const heap = c.kind === 0, ph = (((t * (0.6 + 0.8 * hs1(c.sd))) / 360 + hs1(c.sd + 1)) % 1 + 1) % 1;
    const a = (ph - 0.5) * rad(16) * (heap ? 1 : 0.2), life = heap ? sstep(Math.sin(Math.PI * ph), 0, 0.4) : 1;
    if (life < 0.05) continue;
    const ca = Math.cos(a), sa = Math.sin(a);
    // A heap is a squat dome; a tower is a tall column.
    const R = (heap ? 0.75 : 0.4) * c.W * life, V = (heap ? 0.55 : 0.5) * c.H * life;
    u.uOcc.value[n].set(c.p.x * ca - c.p.z * sa, c.base + (heap ? 0.4 : 0.5) * c.H, c.p.x * sa + c.p.z * ca, R);
    u.uOccV.value[n++] = V;
  }
  // The soot ball shades the air behind it.
  if (U.uSootK.value > 0.05 && n < SHAFT_N) { const S = U.uSootS.value; u.uOcc.value[n].set(S.x, S.y, S.z, S.w * 0.8); u.uOccV.value[n++] = S.w * 0.8; }
  u.uOccN.value = n;
  // The trail: a cone from the rock, out along its away line.
  let m = 0;
  if (PU.uTrail.value > 0.2 && astMesh.visible) {
    for (let x = 0; m < SHAFT_TR; m++, x = x * 1.9 + 6000) {
      shaftV.copy(ast.pos).add(PU.uDrift.value).addScaledVector(ast.away, x);
      u.uTr.value[m].set(shaftV.x, shaftV.y, shaftV.z, 0.7 * (1.05 * ast.R + PU.uK.value * x) * Math.min(1, PU.uTrail.value));
    }
  }
  u.uTrN.value = m;
}
