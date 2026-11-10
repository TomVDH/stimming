// Shared GLSL: a water surface that never aliases.
// Long swell, fine chop, wave sets, Fresnel, and a glitter lobe for a light.
// Paste WATER into a fragment shader. It declares no uniforms.
// It compiles in raw WebGL2 and in a three.js ShaderMaterial.
//
// Use, at a point p on the water (metres), seen along the ray d:
//   float foot = wtFoot(dist, -d.y, focalPx);     // metres under one pixel
//   float sig2;
//   vec2 slope = wtWaves(p, time, foot, swell, chop, sets, sig2);
//   vec3 n = wtNormal(slope);
//   vec3 r = reflect(d, n); r.y = abs(r.y);
//   float F = wtFresnel(d, n);
//   vec3 col = mix(deep, sky(r), F) + lightCol * wtGlint(r, toLight, sig2, 0.03) * F;
// A wave that a pixel cannot resolve fades out of the slope.
// Its energy moves into sig2, the roughness, so far water shows a smooth glitter path.
// swell and chop are slope gains: 0.012 and 0.16 make a breezy lake.
// sets 0 gives even waves; 1 gives wave groups with calm water between.
// Rain on the water, before wtNormal:
//   slope += wtRings(p, time, foot, rain, 0.6, sig2);
// rain 0 to 1 is how hard it falls. size 1 makes rings up to 1.4 m wide, to read from afar.
// Detail: waterDetail(level) gives the budget for shared/detail.js's level.
//   wtWavesN(..., q.octaves, sig2) and wtRingsN(..., q.ringLayers, sig2) take it.
// A cut octave moves into sig2, so the water keeps its brightness.
// Sources: Wind farm (swell), Beach walker (chop, glitter), Buoy Business (sets, rain rings).

export const WATER = /* glsl */`
float wtH(vec2 p) { vec3 q = fract(vec3(p.xyx) * 0.1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
// Value noise with its gradient: x is the value, yz the slope.
vec3 wtNoised(vec2 x) {
  vec2 i = floor(x), f = fract(x);
  vec2 u = f * f * (3.0 - 2.0 * f), du = 6.0 * f * (1.0 - f);
  float a = wtH(i), b = wtH(i + vec2(1.0, 0.0)), c = wtH(i + vec2(0.0, 1.0)), d = wtH(i + vec2(1.0, 1.0));
  return vec3(a + (b - a) * u.x + (c - a) * u.y + (a - b - c + d) * u.x * u.y, du * (vec2(b - a, c - a) + (a - b - c + d) * u.yx));
}
// Metres under one pixel: distance over the focal length, stretched at a grazing view.
// down is the cosine between the view ray and straight down.
float wtFoot(float dist, float down, float focalPx) { return dist / max(down, 0.02) / focalPx; }
// Swell: five long waves; deep-water speed follows each wavelength.
// Each wave fades once a pixel spans its length. Returns slope in xy, height in z.
vec3 wtSwell(vec2 p, float t, float foot, float amp) {
  const vec3 W[5] = vec3[5](vec3(0.9, 0.42, 0.05), vec3(-0.5, 0.86, 0.08), vec3(0.2, 0.98, 0.13), vec3(0.95, -0.3, 0.21), vec3(-0.75, 0.66, 0.34));
  vec3 g = vec3(0.0);
  for (int i = 0; i < 5; i++) {
    vec2 dd = normalize(W[i].xy);
    float k = W[i].z;
    float ph = dot(p, dd) * k - sqrt(9.81 * k) * t + float(i) * 1.7;
    float a = amp / (1.0 + float(i) * 0.3) * clamp(1.0 - foot * k / 2.1, 0.0, 1.0);
    g.xy += dd * cos(ph) * a;
    g.z += sin(ph) * a / k;
  }
  return g;
}
// Chop: up to seven octaves of noise from 4 m down, stretched along x.
// An octave past the budget, or too fine for a pixel, only adds to sig2.
vec2 wtChopN(vec2 p, float t, float foot, float amp, int octaves, inout float sig2) {
  vec2 g = vec2(0.0);
  float fr = 0.25;
  for (int i = 0; i < 7; i++) {
    float wgt = i < octaves ? 1.0 - smoothstep(0.15, 0.5, foot * fr) : 0.0;
    if (wgt > 0.0) {
      float fi = float(i), an = 0.45 * sin(fi * 2.4), ca = cos(an), sa = sin(an);
      vec2 rp = vec2(ca * p.x - sa * p.y, sa * p.x + ca * p.y);
      vec2 q = fr * vec2(rp.x * 0.3, rp.y) + vec2(fi * 7.1, fi * 3.3 + t * (0.2 + 0.5 / (fi + 1.0)));
      vec2 gq = wtNoised(q).yz * vec2(0.3, 1.0);
      g += vec2(ca * gq.x + sa * gq.y, -sa * gq.x + ca * gq.y) * amp * wgt;
    }
    sig2 += (1.0 - wgt) * amp * amp * 0.35;
    fr *= 1.9;
    amp *= 0.7;
  }
  return g;
}
vec2 wtChop(vec2 p, float t, float foot, float amp, inout float sig2) { return wtChopN(p, t, foot, amp, 7, sig2); }
// Wave groups: slow envelopes scale the waves, so no two crests repeat.
// scatter brings sets of high waves with near-calm water between them.
float wtSets(vec2 p, float t, float scatter) {
  float e = 1.0 + 0.3 * sin(0.0151 * p.x + 0.0087 * p.y - 0.05 * t + 0.6)
    + 0.25 * sin(-0.0112 * p.x + 0.0198 * p.y - 0.035 * t + 2.3)
    + 0.15 * sin(0.0047 * p.x - 0.0143 * p.y - 0.02 * t + 4.9);
  float s = 0.5 * sin(0.0123 * p.x + 0.0171 * p.y - 0.06 * t + 1.1)
    + 0.3 * sin(-0.0189 * p.x + 0.0067 * p.y - 0.045 * t + 3.7)
    + 0.2 * sin(0.0071 * p.x - 0.0229 * p.y - 0.03 * t + 5.2);
  return mix(e, 0.06 + 1.54 * smoothstep(-0.15, 0.6, s), scatter);
}
// The whole surface. Returns the slope; sig2 gets the roughness no pixel resolves.
vec2 wtWavesN(vec2 p, float t, float foot, float swell, float chop, float scatter, int octaves, out float sig2) {
  sig2 = 0.0008;
  float e = wtSets(p, t, scatter);
  vec2 g = wtSwell(p, t, foot, swell * e).xy;
  return g + wtChopN(p, t, foot, chop * (0.4 + 0.6 * e), octaves, sig2);
}
vec2 wtWaves(vec2 p, float t, float foot, float swell, float chop, float scatter, out float sig2) {
  return wtWavesN(p, t, foot, swell, chop, scatter, 7, sig2);
}
// One layer of rain rings. A share of the cells holds a drop; each drop falls once a cycle.
vec2 wtRingLayer(vec2 p, float t, float amount, float size, float rate) {
  vec2 q = p / (3.0 * size), id = floor(q);
  float h1 = wtH(id), h2 = wtH(id + 17.3), h3 = wtH(id + 41.7);
  vec2 f = fract(q) - (0.25 + 0.5 * vec2(h1, h2));
  float age = fract(t * rate + h1 * 7.3);
  // A lead ring and a fainter one behind it, as a real drop makes.
  float r = length(f) * 3.0, x = r - age * 1.4, x2 = r - age * 0.8;
  float w = (sin(x * 16.0) * exp(-x * x * 70.0) + 0.5 * sin(x2 * 16.0) * exp(-x2 * x2 * 70.0)) * pow(1.0 - age, 1.5) * step(h3, amount);
  return f / max(length(f), 1e-3) * w;
}
// Rain rings: each drop lays a ring that spreads and fades. Add the result to the slope.
// Rings too small for a pixel fade out and roughen the water through sig2.
vec2 wtRingsN(vec2 p, float t, float foot, float amount, float size, int layers, inout float sig2) {
  if (amount <= 0.0) return vec2(0.0);
  float seen = 1.0 - smoothstep(0.15, 0.5, foot / (0.39 * size));
  sig2 += (1.0 - seen) * amount * 0.004;
  if (seen <= 0.0) return vec2(0.0);
  // Two offset layers, so drops never fall on a grid. Low detail keeps one.
  vec2 g = wtRingLayer(p, t, amount, size, 0.55);
  if (layers > 1) g += wtRingLayer(p + vec2(1.4, 0.9) * size, t, amount, size, 0.45);
  return g * 0.5 * seen;
}
vec2 wtRings(vec2 p, float t, float foot, float amount, float size, inout float sig2) { return wtRingsN(p, t, foot, amount, size, 2, sig2); }
vec3 wtNormal(vec2 slope) { return normalize(vec3(-slope.x, 1.0, -slope.y)); }
// Schlick: water mirrors little from above and almost all at a grazing view.
float wtFresnel(vec3 d, vec3 n) { return 0.02 + 0.98 * pow(1.0 - clamp(dot(-d, n), 0.0, 1.0), 5.0); }
// A light in the mirror: a lobe that widens with the roughness and keeps its energy.
// r is the mirrored ray, l the unit direction to the light, size its radius in radians.
float wtGlint(vec3 r, vec3 l, float sig2, float size) {
  vec3 q = r - l;
  float s2 = 4.0 * sig2 + size * size;
  return exp(-dot(q, q) / (2.0 * s2)) * (size * size / s2);
}
`;

// The water's budget at a detail level (shared/detail.js): 0 low, 1 standard, 2 high.
export const waterDetail = level => ({ octaves: level > 0 ? 7 : 4, ringLayers: level > 0 ? 2 : 1 });

// The swell's height at a point, on the CPU: for a boat or a buoy.
// It mirrors wtSwell with no pixel fade. amp is the same slope gain.
const WAVES = [[0.9, 0.42, 0.05], [-0.5, 0.86, 0.08], [0.2, 0.98, 0.13], [0.95, -0.3, 0.21], [-0.75, 0.66, 0.34]];
export function swellHeight(x, z, t, amp) {
  let h = 0;
  WAVES.forEach(([dx, dz, k], i) => {
    const l = Math.hypot(dx, dz);
    const ph = (x * dx + z * dz) / l * k - Math.sqrt(9.81 * k) * t + i * 1.7;
    h += Math.sin(ph) * amp / (1 + i * 0.3) / k;
  });
  return h;
}
