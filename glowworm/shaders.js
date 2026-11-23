// Glowworm cave shaders. Five small programs, so D3D11 links each fast.
// The camera: eye uEye, axes uF (forward), uR (right), uU (up).
// A screen point at ndc (x, y) maps to the ray uF + uR x tanX + uU y tanY.
import { OUTPUT } from '../shared/output.js';
import { CAVE_GLSL, BAND_GLSL } from './cave.js';

const HEAD = `#version 300 es
precision highp float;
precision highp int;
`;
const CAM = `
uniform vec3 uEye, uF, uR, uU;
uniform vec2 uTan;
`;
// The glow of Arachnocampa peaks near 487 nm: a cyan blue.
const GLOW = `
const vec3 GLOW_A = vec3(0.04, 0.55, 1.0);
const vec3 GLOW_B = vec3(0.08, 0.95, 0.80);
`;

/* ---------- dims: shared by the rock and the sprites ---------- */
const DIM = `
uniform float uT;
uniform vec4 uEv[6];
uniform vec4 uEvK[6];
// A sound dims the worms near it; each comes back at its own pace.
// uEv: x, y, z, start. uEvK: strength, radius, wave speed, unused.
float dimAt(vec3 p, float seed) {
  float keep = 1.0;
  for (int i = 0; i < 6; i++) {
    vec4 e = uEv[i], k = uEvK[i];
    if (k.x <= 0.0) continue;
    float r = distance(p, e.xyz);
    float fall = k.x * exp(-(r * r) / (k.y * k.y));
    float age = uT - e.w - r / k.z - 0.5 * fract(seed * 7.13);
    float rise = smoothstep(0.0, 0.5 + 0.7 * fract(seed * 3.71), age);
    float back = exp(-max(0.0, age - 1.6) / (3.5 + 5.5 * fract(seed * 13.7)));
    keep *= 1.0 - fall * rise * back;
  }
  return max(keep, 0.04);
}
`;

/* ---------- pass 1: the rock ---------- */
// A march of the cave at half size. Water bends the ray once, as a mirror.
// Alpha holds the path length; a negative path marks a water pixel.
export const ROCK_FS = `${HEAD}
in vec2 vUv;
out vec4 o;
${CAM}
uniform float uSteps, uZero, uLight;
${CAVE_GLSL}
${DIM}
${BAND_GLSL}
${GLOW}
vec3 nrm(vec3 p) {
  const vec2 k = vec2(1.0, -1.0);
  float e = 0.02;
  return normalize(k.xyy * cave(p + k.xyy * e) + k.yyx * cave(p + k.yyx * e) + k.yxy * cave(p + k.yxy * e) + k.xxx * cave(p + k.xxx * e));
}
// Light on the rock comes only from the worms.
vec3 shade(vec3 p, vec3 rd) {
  vec3 n = nrm(p);
  // Fine relief bends the normal only; the shape stays as the worms know it.
  vec3 b = vec3(vn3(p * 4.0), vn3(p * 4.0 + 5.1), vn3(p * 4.0 + 9.7)) - 0.5;
  n = normalize(n + b * 0.6);
  float wide = bandAt(p.xz, 2.4), near = bandAt(p.xz, 1.0);
  float hi = smoothstep(1.2, 3.6, p.y);
  float e = 0.012 * (0.3 + 0.7 * max(n.y, 0.0)) * (0.2 + wide)
          + 0.07 * near * hi * (0.45 + 0.55 * max(-n.y, 0.0))
          + 0.04 * max(-n.y, 0.0) * wide * exp(-p.y / 1.6);
  // Three taps of occlusion give the rock its folds.
  float ao = clamp(cave(p + n * 0.12) / 0.12, 0.0, 1.0) * 0.3 + clamp(cave(p + n * 0.45) / 0.45, 0.0, 1.0) * 0.4 + clamp(cave(p + n * 1.1) / 1.1, 0.0, 1.0) * 0.3;
  // Limestone: pale flowstone in runs, dark in the cracks.
  float m = vn3(p * vec3(2.2, 0.7, 2.2));
  vec3 alb = vec3(0.62, 0.58, 0.52) * (0.25 + 1.3 * m * m) * (0.7 + 0.6 * vn3(p * 7.0));
  vec3 c = alb * mix(GLOW_A, GLOW_B, 0.3) * e * ao * ao;
  // Wet flowstone shows the roof glow as a sheen.
  vec3 r = reflect(rd, n);
  c += GLOW_A * 0.03 * wide * pow(max(r.y, 0.0), 6.0) * m * ao;
  // The rock glows only as much as its worms do.
  return c * uLight * mix(1.0, dimAt(p, 0.5), hi);
}
void main() {
  vec2 ndc = vUv * 2.0 - 1.0;
  vec3 ro = uEye, rd = normalize(uF + uR * ndc.x * uTan.x + uU * ndc.y * uTan.y);
  float path = 0.0, sgn = 1.0, t = -1.0;
  // Two legs: the eye to the rock, or the eye to the water and up again.
  for (int leg = 0; leg < 2; leg++) {
    float tw = rd.y < -1e-4 ? ro.y / -rd.y : 1e5;
    float tmax = min(tw, 70.0);
    // One march call site keeps the D3D11 link short.
    t = 0.02 + uZero;
    bool hit = false;
    for (int i = 0; i < 112; i++) {
      if (float(i) >= uSteps) break;
      float d = cave(ro + rd * t);
      if (d < 0.0015 * t + 0.002) { hit = true; break; }
      t += d * 0.7;
      if (t > tmax) break;
    }
    if (hit || t <= tmax) { if (t > tmax) t = -1.0; break; }
    if (leg == 0 && tw < 70.0) { ro += rd * tw; path += tw; rd.y = -rd.y; sgn = -1.0; t = -1.0; continue; }
    t = -1.0;
    break;
  }
  if (t < 0.0) { o = vec4(0.0, 0.0, 0.0, sgn * (path + 80.0)); return; }
  o = vec4(shade(ro + rd * t, rd), sgn * (path + t));
}`;

/* ---------- shared by the sprites: projection, the rock test, the dims ---------- */
const SPRITE = `
${CAM}
uniform vec2 uRes;
uniform float uFlip, uTa, uFocal;
uniform sampler2D uRock;
// The view of a world point: ndc in xy, depth along the view in z.
vec3 view(vec3 p) {
  vec3 v = p - uEye;
  float z = dot(v, uF);
  return vec3(dot(v, uR) / (max(z, 1e-3) * uTan.x), dot(v, uU) / (max(z, 1e-3) * uTan.y), z);
}
// True when rock hides a point at this ndc and distance.
bool hidden(vec2 ndc, float d) {
  ivec2 rs = textureSize(uRock, 0);
  ivec2 c = ivec2((ndc * 0.5 + 0.5) * vec2(rs));
  float r = 0.0;
  // The farthest of five texels: the half-size rock must not eat a worm on its edge.
  for (int k = 0; k < 5; k++) {
    ivec2 o = k == 0 ? ivec2(0) : k == 1 ? ivec2(1, 0) : k == 2 ? ivec2(-1, 0) : k == 3 ? ivec2(0, 1) : ivec2(0, -1);
    r = max(r, abs(texelFetch(uRock, clamp(c + o, ivec2(0), rs - 1), 0).a));
  }
  return d > r * 1.04 + 0.15;
}
${DIM}
// Each worm breathes slowly, on its own period.
float breath(float seed) { return 1.0 + 0.16 * sin(uTa * (0.12 + 0.45 * fract(seed * 31.7)) + seed * 40.0); }
// Near worms read brighter; far ones never vanish, as in a long exposure.
float falloff(float d) { return pow(1.0 + d * d / 16.0, -0.6); }
`;

/* ---------- pass 2: the worms, as sprites ---------- */
export const PTS_VS = `${HEAD}
layout(location = 0) in vec4 aA;
layout(location = 1) in vec4 aB;
${SPRITE}
${GLOW}
uniform float uGain;
out vec2 vQ;
out vec3 vCol;
void main() {
  gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
  vec3 w = aA.xyz;
  vec3 p = vec3(w.x, w.y * uFlip, w.z);
  vec3 s = view(p);
  if (s.z < 0.15 || abs(s.x) > 1.05 || abs(s.y) > 1.05) return;
  float d = distance(p, uEye);
  if (hidden(s.xy, d)) return;
  float seed = aB.x;
  float I = aA.w * breath(seed) * dimAt(w, seed) * falloff(d) * uGain;
  // A worm's light is a few millimetres wide; far away it is one pixel.
  float sig = max(0.75, 0.005 * uFocal / s.z);
  float half_ = 3.2 * sig + 1.0;
  vec2 corner = vec2(gl_VertexID & 1, gl_VertexID >> 1) * 2.0 - 1.0;
  vQ = corner * half_ / sig;
  vCol = mix(GLOW_A, GLOW_B, 0.15 + 0.45 * fract(seed * 7.3) * aB.y) * I / (sig * sig);
  gl_Position = vec4(s.xy + corner * half_ * 2.0 / uRes, 0.0, 1.0);
}`;
export const PTS_FS = `${HEAD}
in vec2 vQ;
in vec3 vCol;
out vec4 o;
void main() { o = vec4(vCol * exp(-0.5 * dot(vQ, vQ)), 1.0); }`;

/* ---------- pass 3: the threads, and falling drops ---------- */
// Each thread is a ribbon one or two pixels wide, from the silk tube down.
// Its brightness is its cover of the pixel, so far threads fade out.
export const THR_VS = `${HEAD}
layout(location = 0) in vec4 aA;
layout(location = 1) in vec4 aB;
${SPRITE}
uniform float uSway, uThrGain, uDropGain;
out float vS, vSide, vL, vMpp, vI, vSeed, vKind, vCov;
void main() {
  gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
  float kind = aB.z, seed = aB.y, L = aA.w;
  vec3 top = aA.xyz;
  // Air in the cave moves the long threads a little.
  vec2 sway = uSway * L * vec2(sin(uTa * 0.5 + seed * 20.0), cos(uTa * 0.37 + seed * 13.0)) * 0.05;
  vec3 bot = top + vec3(sway.x, -L, sway.y);
  vec3 wt = top;
  top.y *= uFlip; bot.y *= uFlip;
  vec3 a = view(top), b = view(bot);
  if (a.z < 0.15 || b.z < 0.15) return;
  if (max(abs(a.x), abs(a.y)) > 1.1 && max(abs(b.x), abs(b.y)) > 1.1) return;
  float d = distance(top, uEye);
  if (hidden(kind > 0.5 ? b.xy : a.xy, d)) return;
  // Silk is 0.4 mm wide; at this range that covers part of a pixel.
  float px = uFocal / (0.5 * (a.z + b.z));
  vCov = min(1.0, 0.0004 * px);
  float I = kind > 0.5 ? uDropGain : aB.x * breath(aB.w) * dimAt(wt, aB.w) * falloff(d) * uThrGain;
  // A thread with no cover left draws nothing.
  if (I * min(1.0, 0.0015 * px) < 0.0004) return;
  vec2 A = a.xy * uRes * 0.5, B = b.xy * uRes * 0.5;
  vec2 dir = B - A;
  float lenPx = length(dir);
  dir = lenPx > 0.01 ? dir / lenPx : vec2(0.0, -1.0);
  vec2 perp = vec2(-dir.y, dir.x);
  float s = float(gl_VertexID >> 1), side = float(gl_VertexID & 1) * 2.0 - 1.0;
  vec2 P = mix(A, B, s) + perp * side * 1.2 + dir * (s * 2.0 - 1.0) * 1.0;
  vS = s; vSide = side; vL = L; vMpp = L / max(lenPx, 0.5); vI = I; vSeed = seed; vKind = kind;
  gl_Position = vec4(P / (uRes * 0.5), 0.0, 1.0);
}`;
export const THR_FS = `${HEAD}
in float vS, vSide, vL, vMpp, vI, vSeed, vKind, vCov;
uniform float uGl;
${GLOW}
out vec4 o;
float hh(float n) { uint h = uint(int(n)) * 2654435761u; h ^= h >> 15u; h *= 2246822519u; h ^= h >> 13u; return float(h) / 4294967295.0; }
void main() {
  // A tent across the ribbon: one pixel of width in all.
  float across = max(0.0, 1.0 - abs(vSide) * 1.2);
  if (vKind > 0.5) {
    // A falling drop: a short bright streak, brightest at its head.
    o = vec4(mix(GLOW_A, vec3(0.7, 0.95, 1.0), 0.5) * vI * across * (0.3 + 0.7 * vS), 1.0);
    return;
  }
  float u = vS * vL;
  // The worm's own light falls off down its threads.
  float lit = vI * (0.02 / (0.02 + u) + 0.01);
  // Mucus beads every 5 to 9 mm. Each one glints as the view moves.
  float sp = 0.005 + 0.004 * fract(vSeed * 17.0);
  float x = u / sp + vSeed * 50.0;
  float f = fract(x) - 0.5;
  float h = hh(floor(x) + vSeed * 9973.0);
  float bead = exp(-f * f / 0.02) * (0.4 + 0.9 * h);
  float glint = 0.35 + 3.0 * pow(0.5 + 0.5 * sin(uGl * (2.0 + 5.0 * h) + h * 40.0), 14.0);
  // Beads smaller than a pixel apart merge into an even line.
  float merge = clamp(vMpp / sp - 0.4, 0.0, 1.0);
  float beads = mix(bead * glint, 0.35, merge);
  float I = lit * vCov * (1.0 + 2.5 * beads);
  o = vec4(mix(GLOW_A, vec3(0.6, 0.92, 1.0), 0.35 * beads) * I * across, 1.0);
}`;

/* ---------- pass 4: the water ---------- */
// The water is a mirror. Ripples tilt it, so the doubles shiver.
export const COMP_FS = `${HEAD}
in vec2 vUv;
out vec4 o;
${CAM}
uniform sampler2D uRock, uPts;
uniform float uT, uTa, uPx, uStill, uRefl;
uniform vec4 uRip[8];
float vnA(vec2 p) {
  vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  vec2 k = vec2(127.1, 311.7);
  float a = fract(sin(dot(i, k)) * 43758.5), b = fract(sin(dot(i + vec2(1, 0), k)) * 43758.5);
  float c = fract(sin(dot(i + vec2(0, 1), k)) * 43758.5), d = fract(sin(dot(i + vec2(1, 1), k)) * 43758.5);
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}
// The slope of the water at p. foot is the metres under one pixel.
vec2 slope(vec2 p, float foot) {
  vec2 s = vec2(0.0);
  // Two wave trains per ring: long waves run ahead of short ones.
  for (int i = 0; i < 8; i++) {
    vec4 r = uRip[i];
    float age = uT - r.z;
    if (r.w <= 0.0 || age < 0.0 || age > 10.0) continue;
    vec2 dv = p - r.xy;
    float d = length(dv) + 1e-4;
    vec2 dirv = dv / d;
    for (int j = 0; j < 2; j++) {
      float K = j == 0 ? 30.0 : 66.0, c = j == 0 ? 0.42 : 0.29;
      float x = d - c * age, w = 0.07 + 0.09 * age;
      float env = exp(-x * x / (w * w)) * exp(-age * 0.32) / sqrt(1.0 + d * 4.0);
      // A wave a pixel cannot hold leaves the slope.
      float keep = exp(-foot * foot * K * K * 0.12);
      s += dirv * (r.w * (j == 0 ? 1.0 : 0.45)) * env * K * cos(K * x) * keep;
    }
  }
  // The river moves under the still surface: a slow, faint swell.
  vec2 q = p * 1.3 + vec2(uTa * 0.05, uTa * 0.03);
  float e = 0.05;
  float n0 = vnA(q), nx = vnA(q + vec2(e, 0.0)), nz = vnA(q + vec2(0.0, e));
  s += uStill * vec2(nx - n0, nz - n0) / e * exp(-foot * 6.0);
  return s;
}
void main() {
  vec2 ndc = vUv * 2.0 - 1.0;
  vec3 d = normalize(uF + uR * ndc.x * uTan.x + uU * ndc.y * uTan.y);
  ivec2 rs = textureSize(uRock, 0);
  float a = texelFetch(uRock, clamp(ivec2(vUv * vec2(rs)), ivec2(0), rs - 1), 0).a;
  if (a >= 0.0 || d.y > -1e-4) {
    o = vec4(texture(uRock, vUv).rgb + texture(uPts, vUv).rgb, 1.0);
    return;
  }
  float tw = uEye.y / -d.y;
  vec2 p = uEye.xz + d.xz * tw;
  float foot = tw * uPx / max(-d.y, 0.06);
  vec2 s = slope(p, foot);
  vec3 n = normalize(vec3(-s.x, 1.0, -s.y));
  vec3 r = reflect(d, n);
  // The mirror ray from the eye: where the double of that light sits on screen.
  vec3 m = vec3(r.x, -r.y, r.z);
  float mz = max(dot(m, uF), 1e-3);
  vec2 uv = vec2(dot(m, uR) / (mz * uTan.x), dot(m, uU) / (mz * uTan.y)) * 0.5 + 0.5;
  vec3 refl = texture(uRock, uv).rgb + texture(uPts, uv).rgb;
  float F = 0.04 + 0.96 * pow(1.0 - clamp(dot(-d, n), 0.0, 1.0), 5.0);
  o = vec4(refl * F * uRefl, 1.0);
}`;

/* ---------- pass 5: bloom in, grade, film ---------- */
export const FINAL_FS = `${HEAD}
in vec2 vUv;
out vec4 o;
uniform sampler2D uHdr, uBloom;
uniform float uFrame, uBloomK, uExpo, uAsp;
${OUTPUT}
float gh(vec2 p) { uvec2 q = uvec2(p); uint n = (q.x * 1597334677u) ^ (q.y * 3812015801u); n *= 1597334677u; n ^= n >> 16; return float(n) / 4294967295.0; }
void main() {
  vec3 c = texture(uHdr, vUv).rgb + texture(uBloom, vUv).rgb * uBloomK;
  vec2 q = (vUv - 0.5) * vec2(uAsp, 1.0);
  c *= 1.0 - 0.5 * smoothstep(0.35, 1.15, length(q));
  c *= 1.0 + (gh(gl_FragCoord.xy + vec2(uFrame * 37.0, uFrame * 91.0)) - 0.5) * 0.07;
  o = vec4(ouFilm(c, uExpo, gl_FragCoord.xy), 1.0);
}`;
