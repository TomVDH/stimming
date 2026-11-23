// Gas giant dive, pass 1: the map. Bands, the great storm and its wake, seen from above.
// One 1024 x 1024 RGBA16F target over the square the eye can see.
// R: cloud-top height, 0 to 1. G: hue, 0 to 1.2 on the palette. B: colour strength. A: storm activity.
import { COMMON } from './world.js';

export const MAP_FS = /* glsl */`#version 300 es
precision highp float;
in vec2 vUv;
out vec4 o;
uniform float uT;
${COMMON}
vec2 h22(vec2 p) {
  p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
  return fract(sin(p) * 43758.5453) * 2.0 - 1.0;
}
// Gradient noise, -1 to 1.
float gn(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  return mix(mix(dot(h22(i), f), dot(h22(i + vec2(1, 0)), f - vec2(1, 0)), u.x),
             mix(dot(h22(i + vec2(0, 1)), f - vec2(0, 1)), dot(h22(i + vec2(1, 1)), f - vec2(1, 1)), u.x), u.y) * 1.4;
}
float fbm(vec2 p) {
  float s = 0.0, a = 0.5;
  mat2 m = mat2(0.8, -0.6, 0.6, 0.8) * 2.03;
  for (int i = 0; i < 5; i++) { s += a * gn(p); p = m * p; a *= 0.5; }
  return s;
}
// The east wind by latitude, km per map second: jets that change sign.
float jet(float z) { return 0.9 * sin(z / 900.0 + 0.6) + 0.5 * sin(z / 410.0 + 2.1); }
// The bands at a point that the flow has moved: zones white and high, belts brown and low.
// Filaments run east and west, five to one, and fold where a warp bends them.
vec4 bands(vec2 q) {
  vec2 w = vec2(fbm(q * vec2(0.0012, 0.005)), fbm(q * vec2(0.0012, 0.005) + 7.3));
  vec2 s = q * vec2(0.0032, 0.016) + w * vec2(1.6, 0.9);
  float fil = fbm(s);
  float fil2 = fbm(s * 2.7 + 3.1);
  float zw = q.y + 160.0 * w.x + 60.0 * fil;
  float belt = smoothstep(-0.25, 0.45, sin(zw / 260.0 + 1.0) + 0.45 * sin(zw / 97.0));
  float top = mix(0.62, 0.28, belt) + 0.2 * fil + 0.08 * fil2;
  // Belts take jade or teal by turns; filaments shift the hue along them.
  float kind = smoothstep(-0.3, 0.3, sin(zw / 520.0 + 0.3));
  float hue = mix(0.06, mix(0.36, 0.7, kind), belt) + 0.14 * fil + 0.06 * fil2;
  float sat = clamp(mix(0.22, 0.85, belt) * (0.75 + 0.35 * fil), 0.0, 1.0);
  // White ovals ride one latitude of the belt edge.
  vec2 oc = vec2(mod(q.x, 1300.0) - 650.0, q.y + 1650.0 + 120.0 * gn(vec2(floor(q.x / 1300.0), 1.7)));
  float oval = smoothstep(1.0, 0.55, length(oc / vec2(160.0, 100.0)));
  top = mix(top, 0.8, oval);
  sat *= 1.0 - 0.85 * oval;
  return vec4(clamp(top, 0.0, 1.0), hue, sat, 0.08 * smoothstep(0.3, 0.8, fil2));
}
void main() {
  vec2 xz = MAP_C + (vUv - 0.5) * MAP_S;
  // Bands by flow map: two phases, cross-faded, so the shear never winds up.
  const float PH = 900.0;
  float jit = 0.25 * gn(xz * 0.0003);
  float f1 = fract(uT / PH + jit), f2 = fract(uT / PH + jit + 0.5);
  float u = jet(xz.y);
  vec4 b1 = bands(xz - vec2(u * f1 * PH, 0.0));
  vec4 b2 = bands(xz - vec2(u * f2 * PH, 0.0) + vec2(5100.0, 0.0));
  vec4 m = mix(b1, b2, abs(2.0 * f1 - 1.0));
  // The storm: concentric streaks that turn at their own rate.
  vec2 e = (xz - ST_C) / ST_AX;
  float q = length(e), a = atan(e.y, e.x);
  // Slow at the eye, fastest in the collar, still outside.
  float om = 0.0014 * smoothstep(0.0, 0.75, q) * (1.0 - smoothstep(0.85, 1.25, q)) + 0.0002;
  float ar = a + om * uT + 2.4 * q;
  vec2 sp = vec2(q * 34.0, 0.0) + vec2(cos(ar), sin(ar)) * 1.6;
  float st = fbm(sp) + 0.45 * fbm(sp * 2.3 + vec2(cos(ar), sin(ar)) * 2.0);
  float core = 1.0 - smoothstep(0.55, 0.92, q);
  float collar = smoothstep(0.7, 0.9, q) * (1.0 - smoothstep(0.98, 1.18, q));
  float inS = 1.0 - smoothstep(0.95, 1.25, q);
  vec4 sm = vec4(0.0);
  sm.r = clamp(0.78 + 0.18 * st - 0.25 * collar + 0.12 * core, 0.0, 1.0);
  // A purple core, magenta at its heart, teal filaments, a pale mint collar.
  float hs = mix(0.84, 1.06, core * smoothstep(-0.2, 0.5, st));
  hs = mix(hs, 0.66, clamp(-st, 0.0, 1.0) * 0.7);
  sm.g = mix(hs, 0.08, collar);
  sm.b = clamp(mix(0.4, 0.78, core) * (1.0 - 0.8 * collar), 0.0, 1.0);
  sm.a = 0.05;
  m = mix(m, sm, inS);
  // The wake: a turbulent band west of the storm, full of towers and lightning.
  vec2 wk = (xz - ST_C - vec2(-2300.0, 350.0)) / vec2(1700.0, 600.0);
  float wake = (1.0 - smoothstep(0.6, 1.1, length(wk))) * (1.0 - inS);
  float tb = fbm(xz * 0.006 + vec2(uT * 0.0009, 0.0));
  m.r = mix(m.r, clamp(0.55 + 0.45 * tb, 0.0, 1.0), wake * 0.8);
  m.a = max(m.a, wake * smoothstep(-0.1, 0.5, tb));
  o = m;
}`;
