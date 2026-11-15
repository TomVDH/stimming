// Shared GLSL: the Earth's air as single scatter, at any height.
// Rayleigh, Mie and ozone; the Earth casts its shadow into the air.
// Units are kilometres; the Earth's centre is the origin.
// Paste AIR into a fragment shader. It declares no uniforms.
// It compiles in raw WebGL2 and in a three.js ShaderMaterial.
//
// One call, for a view ray from o along d, stopped at tMax:
//   vec3 L, T;
//   arScatter(o, d, tMax, sun, sunE, L, T);
//   c = c * T + L;
// sun is a unit vector. sunE scales the light; Ascent uses 20.
// Pass the ground hit as tMax, or a large number for open sky.
//
// The parts:
//   arSphere(o, d, r)        near and far hits on a sphere at the origin
//   arDensity(h)             Rayleigh, Mie and ozone density at height h
//   arSunT(p, sun)           sunlight that reaches p, zero in the shadow
// sunLight() is arSunT on the CPU, for lights and exposure.
// Ascent uses this module.

export const R_EARTH = 6371;
export const R_AIR = 6471;

export const AIR = /* glsl */`
const float AR_R = 6371.0, AR_RA = 6471.0, AR_PI = 3.14159265;
const vec3 AR_BR = vec3(5.802e-3, 13.558e-3, 33.1e-3);
const float AR_BMS = 3.996e-3, AR_BME = 4.44e-3, AR_G = 0.76;
const vec3 AR_BO = vec3(0.65e-3, 1.881e-3, 0.085e-3);
// Near and far hits; x > y when the ray misses.
vec2 arSphere(vec3 o, vec3 d, float r) {
  float b = dot(o, d), c = dot(o, o) - r * r, h = b * b - c;
  if (h < 0.0) return vec2(-1.0, -2.0);
  h = sqrt(h);
  return vec2(-b - h, -b + h);
}
vec3 arDensity(float h) { return vec3(exp(-h / 8.0), exp(-h / 1.2), max(0.0, 1.0 - abs(h - 25.0) / 15.0)); }
vec3 arExtinction(vec3 od) { return AR_BR * od.x + AR_BME * od.y + AR_BO * od.z; }
// Sunlight that reaches p; the Earth's shadow has a soft 4 km edge.
vec3 arSunT(vec3 p, vec3 sun) {
  float r = length(p), b = dot(p, sun);
  float rmin = b < 0.0 ? sqrt(max(0.0, r * r - b * b)) : r;
  float vis = smoothstep(-2.0, 2.0, rmin - AR_R);
  if (vis <= 0.0) return vec3(0.0);
  float tt = max(arSphere(p, sun, AR_RA).y, 0.0), ds = tt / 6.0;
  vec3 od = vec3(0.0);
  for (int i = 0; i < 6; i++) { vec3 q = p + sun * (float(i) + 0.5) * ds; od += arDensity(max(length(q) - AR_R, 0.0)) * ds; }
  return vis * exp(-arExtinction(od));
}
// Light scattered toward the eye (L) and what passes (T) along o + d t.
void arScatter(vec3 o, vec3 d, float tMax, vec3 sun, float sunE, out vec3 L, out vec3 T) {
  L = vec3(0.0); T = vec3(1.0);
  vec2 ta = arSphere(o, d, AR_RA);
  if (ta.y < 0.0) return;
  float t0 = max(ta.x, 0.0), t1 = min(ta.y, tMax);
  if (t1 <= t0) return;
  float mu = dot(d, sun);
  float pR = 3.0 / (16.0 * AR_PI) * (1.0 + mu * mu);
  float pM = 3.0 / (8.0 * AR_PI) * ((1.0 - AR_G * AR_G) * (1.0 + mu * mu)) / ((2.0 + AR_G * AR_G) * pow(1.0 + AR_G * AR_G - 2.0 * AR_G * mu, 1.5));
  // Inside the air, samples crowd near the eye, where the air changes fastest.
  bool inside = length(o) < AR_RA;
  float span = t1 - t0;
  vec3 od = vec3(0.0);
  const int N = 18;
  for (int i = 0; i < N; i++) {
    float s0 = float(i) / float(N), s1 = float(i + 1) / float(N);
    float a = inside ? s0 * s0 : s0, b = inside ? s1 * s1 : s1;
    float ds = (b - a) * span;
    vec3 p = o + d * (t0 + 0.5 * (a + b) * span);
    vec3 dn = arDensity(max(length(p) - AR_R, 0.0));
    vec3 tv = exp(-arExtinction(od) - arExtinction(dn) * ds * 0.5);
    L += tv * arSunT(p, sun) * (AR_BR * dn.x * pR + AR_BMS * dn.y * pM) * ds;
    od += dn * ds;
  }
  T = exp(-arExtinction(od));
  L *= sunE;
}
`;

const BR = [5.802e-3, 13.558e-3, 33.1e-3], BME = 4.44e-3, BO = [0.65e-3, 1.881e-3, 0.085e-3];
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// Sunlight that reaches point p (km), per channel, written to out.
export function sunLight(p, sun, out = [0, 0, 0]) {
  const r = Math.hypot(p[0], p[1], p[2]);
  const b = p[0] * sun[0] + p[1] * sun[1] + p[2] * sun[2];
  const rmin = b < 0 ? Math.sqrt(Math.max(0, r * r - b * b)) : r;
  const vis = smooth(-2, 2, rmin - R_EARTH);
  const tTop = r < R_AIR ? -b + Math.sqrt(Math.max(0, b * b - (r * r - R_AIR * R_AIR))) : 0;
  let dR = 0, dM = 0, dO = 0;
  const n = 48, ds = tTop / n;
  for (let i = 0; i < n && tTop > 0; i++) {
    const s = (i + 0.5) * ds;
    const hh = Math.max(0, Math.hypot(p[0] + sun[0] * s, p[1] + sun[1] * s, p[2] + sun[2] * s) - R_EARTH);
    dR += Math.exp(-hh / 8) * ds; dM += Math.exp(-hh / 1.2) * ds; dO += Math.max(0, 1 - Math.abs(hh - 25) / 15) * ds;
  }
  for (let c = 0; c < 3; c++) out[c] = vis * Math.exp(-(BR[c] * dR + BME * dM + BO[c] * dO));
  return out;
}

// The height (km) of the Earth's shadow line over a point whose sun is deg below the horizon.
export const shadowHeight = deg => R_EARTH * (1 / Math.cos(deg * Math.PI / 180) - 1);
