// @ts-check
// Shared GLSL: rain and snow as particles in the world, lit by lamps.
// precip.js draws rain on the frame.
// This module draws drops that cross a lamp's beam.
// Each drop is one instance.
// A drop draws as a screen-space streak over one exposure.
// Paste PRECIPFIELD into a vertex and a fragment shader.
// It declares no uniforms.
// It compiles in raw WebGL2 and in a three.js ShaderMaterial.
// Whiteout is the reference: snow and one lamp.
// Plan: docs/plans/precipfield.md.
//
// Vertex shader, per instance:
//   vec3 r = pfHash3(id * 1.37 + 0.5);                  // or a seed attribute
//   vec3 p = pfPlace(r, lo, size, drift, fall, pfFlutter(t, rate, phase, amp));
//   vec4 c1 = <the toy's projection>(p), c0 = <projection>(p - vel * expo);
//   if (c1.w < near || c0.w < near) { gl_Position = pfOff; return; }
//   float w = pfWidth(radiusM * pxPerM, pfCoc(dist, focus, aper, res.y), 26.0);
//   PfStreak s = pfStreak(pfPx(c0, res), pfPx(c1, res), w, corner, res, z);
//   vec3 lit = lampC * pfPoint(beam, d2, soft, sigma) * pfPhase(dot(l, v), lobe) + sky;
//   vCol = lit * haze * pfSpread(radiusPx, s.len, s.w);
//   gl_Position = s.pos;
// Fragment shader:
//   o = vec4(vCol * pfCover(vQ, vLen, vW), 1.0);       // additive blend
// corner: pfCorner(gl_VertexID), or pfPlaneCorner(position.xy) on a plane.
// z: 0.0 with no depth test, or the head's clip z / w.
// The toy keeps its crowds, lights, masks and depth test.

export const PRECIPFIELD = /* glsl */`
float pfH1(float n) { return fract(sin(n * 12.9898) * 43758.5453); }
// Three random numbers, 0 to 1, from one seed.
vec3 pfHash3(float n) { return vec3(pfH1(n), pfH1(n + 17.31), pfH1(n + 41.77)); }
// A drop wanders on its own small loop: amp in m, w in rad/s.
vec3 pfFlutter(float t, float w, float ph, float amp) {
  return vec3(sin(t * w + ph), sin(t * w * 1.3 + ph * 2.0) * 0.7, cos(t * w * 0.8 + ph)) * amp;
}
// The speed of that loop, in m/s, for the streak.
vec3 pfFlutterVel(float t, float w, float ph, float amp) {
  return vec3(cos(t * w + ph), cos(t * w * 1.3 + ph * 2.0) * 0.91, -sin(t * w * 0.8 + ph) * 0.8) * amp * w;
}
// A drop's place in a box that wraps.
// drift and fall are the travel so far, in m.
vec3 pfPlace(vec3 r, vec3 lo, vec3 size, vec2 drift, float fall, vec3 flutter) {
  vec3 p = lo + r * size;
  p.xz += drift;
  p.y -= fall;
  p += flutter;
  return lo + mod(p - lo, size);
}
// Clip space to pixels.
vec2 pfPx(vec4 clip, vec2 res) { return (clip.xy / clip.w * 0.5 + 0.5) * res; }
// The blur disc off the focus plane, in pixels.
// aper is the lens blur per unit of resY.
float pfCoc(float dist, float focus, float aper, float resY) { return aper * abs(1.0 - focus / max(dist, 1e-3)) * resY; }
// The streak's half width in pixels: the drop plus its blur.
// It never falls under 0.7 pixels.
float pfWidth(float radPx, float coc, float cocMax) { return max(0.7, radPx + min(coc, cocMax)); }
// Two triangles: x runs tail (0) to head (1), y runs across (-1 to 1).
vec2 pfCorner(int k) {
  const float pfU[6] = float[6](0.0, 1.0, 0.0, 0.0, 1.0, 1.0);
  const float pfS[6] = float[6](-1.0, -1.0, 1.0, 1.0, -1.0, 1.0);
  return vec2(pfU[k], pfS[k]);
}
// The same corners from a 1 x 1 plane's position, as in three.js.
// The minus keeps the winding counter-clockwise, so face culling keeps it.
vec2 pfPlaneCorner(vec2 xy) { return vec2(xy.y + 0.5, -xy.x * 2.0); }
// A vertex that the rasteriser drops.
const vec4 pfOff = vec4(2.0, 2.0, 2.0, 1.0);
// pos is the clip position.
// q is the place in the capsule, in pixels.
// len and w are its length and half width.
struct PfStreak { vec4 pos; vec2 q; float len; float w; };
// A capsule from tail s0 to head s1, in pixels.
PfStreak pfStreak(vec2 s0, vec2 s1, float w, vec2 corner, vec2 res, float z) {
  vec2 ax = s1 - s0;
  float L = length(ax);
  vec2 dir = L > 1e-3 ? ax / L : vec2(1.0, 0.0);
  vec2 nrm = vec2(-dir.y, dir.x);
  float u = corner.x, s = corner.y;
  vec2 at = mix(s0 - dir * w, s1 + dir * w, u) + nrm * s * w;
  PfStreak o;
  o.pos = vec4(at / res * 2.0 - 1.0, z, 1.0);
  o.q = vec2(mix(-w, L + w, u), s * w);
  o.len = L;
  o.w = w;
  return o;
}
// The light spreads over the streak and the blur disc.
// Long streaks stay dim.
float pfSpread(float radPx, float len, float w) {
  float area = (len + 2.0 * w) * 2.0 * w;
  float energy = max(radPx * radPx, 0.04) * 3.1416;
  return min(energy / area, 1.0);
}
// Henyey-Greenstein: the forward lobe, per steradian.
// c is dot(light to drop, drop to eye).
float pfPhase(float c, float g) {
  float g2 = g * g;
  return (1.0 - g2) / pow(max(1.0 + g2 - 2.0 * g * c, 1e-4), 1.5) * 0.079577;
}
// A point lamp at the drop.
// k is the toy's beam or mask; d2 is distance squared.
// sig is the haze per metre.
float pfPoint(float k, float d2, float soft, float sig) { return k / (d2 + soft) * exp(-sig * sqrt(d2)); }
// The fragment: a capsule with a soft edge.
// Wide blur discs fade over most of their radius.
float pfCover(vec2 q, float len, float w) {
  float x = clamp(q.x, 0.0, len);
  float d = length(vec2(q.x - x, q.y));
  return 1.0 - smoothstep(w - max(0.9, w * 0.7), w, d);
}
`;

/**
 * A precipitation preset. The toy writes these into its shader with pfFloat().
 * @typedef {Readonly<{ fall: number, radius: number, radiusVar: number, flutter: number, rate: number, rateVar: number, lobe: number, expo: number }>} PfPreset
 * fall: m/s. radius, radiusVar: drop radius and its spread, m. flutter: loop size, m.
 * rate, rateVar: loop speed and its spread, rad/s. lobe: pfPhase g. expo: streak exposure, s.
 */

/** Snow: Whiteout's flakes. @type {PfPreset} */
export const PF_SNOW = Object.freeze({ fall: 1.1, radius: 0.0018, radiusVar: 0.0016, flutter: 0.35, rate: 1.3, rateVar: 2.1, lobe: 0.55, expo: 1 / 60 });

/** Rain: thin, fast and sharp forward. Start values; Frietkot sets them on its move. @type {PfPreset} */
export const PF_RAIN = Object.freeze({ fall: 8.5, radius: 0.001, radiusVar: 0.001, flutter: 0, rate: 0, rateVar: 0, lobe: 0.8, expo: 1.6 / 30 });

/**
 * A number as a GLSL float literal.
 * @param {number} x A finite number.
 * @returns {string} For example "1.0" or "0.0018".
 */
export function pfFloat(x) {
  if (!Number.isFinite(x)) throw new RangeError(`pfFloat: ${x} is not finite`);
  return Number.isInteger(x) ? x.toFixed(1) : String(x);
}
