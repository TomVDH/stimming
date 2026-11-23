// Whiteout GLSL: the static surface march, the haze, the light pass, the snow, the final grade.
// Constants from world.js go into the source as literals.
import { HUT, HUT_ANG, DOOR, WIN, LAMP_LOCAL, LAMP, LAMP_DIR, WALL_N, WALL_D, MAST, GUYS, WIND, MOON } from './world.js';
import { GRADE } from '../shared/grade.js';
import { FLARE } from '../shared/flare.js';

const f = x => (Number.isInteger(x) ? x.toFixed(1) : String(+x.toFixed(6)));
const v3 = a => `vec3(${a.map(f).join(', ')})`;

export const HEAD = `#version 300 es
precision highp float;
precision highp sampler3D;
`;

// The set, shared by every pass.
const SET = `
const float PI = 3.14159265;
const float HC = ${f(Math.cos(HUT_ANG))}, HS = ${f(Math.sin(HUT_ANG))};
const float HW = ${f(HUT.w)}, HD = ${f(HUT.d)}, FLOOR = ${f(HUT.floor)}, EAVE = ${f(HUT.eave)}, RIDGE = ${f(HUT.ridge)};
const float DX = ${f(DOOR.x)}, DHW = ${f(DOOR.hw)}, DTOP = ${f(DOOR.top)};
const float WX = ${f(WIN.x)}, WHW = ${f(WIN.hw)}, WY0 = ${f(WIN.y0)}, WY1 = ${f(WIN.y1)};
const vec3 LAMPL = ${v3(LAMP_LOCAL)};
const vec3 LAMP = ${v3(LAMP)};
const vec3 LAMP_DIR = ${v3(LAMP_DIR)};
const vec3 WALL_N = ${v3(WALL_N)};
const float WALL_D = ${f(WALL_D)};
const vec3 MAST = vec3(${f(MAST.x)}, ${f(MAST.h)}, ${f(MAST.z)});
const float MAST_R = ${f(MAST.r)}, GUY_Y = ${f(MAST.guy)};
const vec3 GUY0 = ${v3(GUYS[0])}, GUY1 = ${v3(GUYS[1])}, GUY2 = ${v3(GUYS[2])};
const vec3 WIND = ${v3(WIND)};
const vec3 MOON = ${v3(MOON)};
uniform vec3 uCamPos;
uniform mat3 uCamRot;
uniform vec3 uLens;
vec3 camRay(vec2 uv) {
  vec2 s = uv * 2.0 - 1.0;
  s.y -= uLens.z;
  return normalize(uCamRot * vec3(s.x * uLens.x, s.y * uLens.y, -1.0));
}
// World to hut local, on the ground plane.
vec2 hutLocal(vec2 xz) { return vec2(HC * xz.x - HS * xz.y, HS * xz.x + HC * xz.y); }
// The hooded bulkhead: a cone of about 60 degrees, a dim spill, nothing up.
float lampBeam(vec3 l) {
  float c = dot(l, LAMP_DIR);
  return (smoothstep(0.55, 0.9, c) + 0.02 * smoothstep(-0.2, 0.5, c)) * smoothstep(0.2, -0.1, l.y);
}
// The lamp lights only the side in front of the door wall.
float lampFront(vec3 p) { return smoothstep(0.0, 0.1, dot(p, WALL_N) + WALL_D); }
// Henyey-Greenstein, normalised over the sphere.
float hg(float c, float g) { float g2 = g * g; return (1.0 - g2) / pow(max(1.0 + g2 - 2.0 * g * c, 1e-4), 1.5) * 0.079577; }
`;

/* ---------- the surfaces: one march, once per size ---------- */
export const GBUF = `${HEAD}
${SET}
uniform int uZero;
uniform float uPx;
in vec2 vUv;
layout(location = 0) out vec4 oA;
layout(location = 1) out vec4 oB;

float hash3(vec3 p) { p = fract(p * 0.1031); p += dot(p, p.zyx + 31.32); return fract((p.x + p.y) * p.z); }
float vnoise(vec3 p) {
  vec3 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hash3(i), hash3(i + vec3(1, 0, 0)), f.x), mix(hash3(i + vec3(0, 1, 0)), hash3(i + vec3(1, 1, 0)), f.x), f.y),
             mix(mix(hash3(i + vec3(0, 0, 1)), hash3(i + vec3(1, 0, 1)), f.x), mix(hash3(i + vec3(0, 1, 1)), hash3(i + vec3(1, 1, 1)), f.x), f.y), f.z);
}
float sdBox(vec3 p, vec3 b) { vec3 q = abs(p) - b; return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0); }
float sdRBox(vec3 p, vec3 b, float r) { return sdBox(p, b - r) - r; }
float capsule(vec3 p, vec3 a, vec3 b, float r) {
  vec3 pa = p - a, ba = b - a;
  return length(pa - ba * clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0)) - r;
}

// The ice field: far swells, sastrugi along the wind, a skirt and a lee drift at the hut.
float groundH(vec2 xz) {
  vec2 w = WIND.xz, c2 = vec2(-w.y, w.x);
  float a = dot(xz, w), c = dot(xz, c2);
  float h = 0.2 * sin(xz.x * 0.045 + 1.3) * sin(xz.y * 0.06 + 0.4) + 0.1 * sin(a * 0.09 + c * 0.03);
  // Sastrugi: low ridges that run with the wind.
  h += 0.03 * sin(c * 1.9 + 2.0 * sin(a * 0.31)) * (0.5 + 0.5 * sin(a * 0.23 + c * 0.41));
  h += 0.02 * sin(c * 4.3 + a * 0.4 + 1.7 * sin(a * 0.8));
  vec2 q = hutLocal(xz);
  vec2 e = abs(q) - vec2(HW, HD);
  float fd = length(max(e, 0.0)) + min(max(e.x, e.y), 0.0);
  h += 0.44 * exp(-max(fd, 0.0) / 0.7);
  // The lee drift trails downwind of the hut; the windward side is scoured.
  h += 0.55 * exp(-c * c / 5.0) * smoothstep(0.8, 2.8, a) * exp(-max(a - 2.8, 0.0) / 7.0);
  h -= 0.14 * exp(-c * c / 6.0) * exp(-pow(-a - HW - 0.9, 2.0) / 0.6);
  return h;
}

// Distance and material: 0 snow, 1 wall, 2 roof, 3 door, 4 window, 5 hood, 6 glass, 7 skid, 8 mast.
vec2 map(vec3 p) {
  vec2 r = vec2((p.y - groundH(p.xz)) * 0.75, 0.0);
  vec2 lq = hutLocal(p.xz);
  vec3 q = vec3(lq.x, p.y, lq.y);
  // A bound skips the hut parts from afar.
  float hb = sdBox(q - vec3(0.0, 1.6, 0.0), vec3(HW + 0.5, 1.7, HD + 0.5));
  if (hb < r.x) {
    float body = sdRBox(q - vec3(0.0, (FLOOR + EAVE) * 0.5, 0.0), vec3(HW, (EAVE - FLOOR) * 0.5, HD), 0.05);
    float door = sdBox(q - vec3(DX, (FLOOR + 0.1 + DTOP) * 0.5, HD), vec3(DHW, (DTOP - FLOOR - 0.1) * 0.5, 0.03));
    float win = sdBox(q - vec3(WX, (WY0 + WY1) * 0.5, HD), vec3(WHW, (WY1 - WY0) * 0.5, 0.07));
    float wall = max(body, max(-door, -win));
    if (wall < r.x) r = vec2(wall, door < 0.012 ? 3.0 : (win < 0.012 ? 4.0 : 1.0));
    float k = (RIDGE - EAVE + 0.06) / (HD + 0.22);
    float slope = (q.y - RIDGE + k * abs(q.z)) / sqrt(1.0 + k * k);
    float roof = max(max(abs(q.x) - (HW + 0.2), abs(q.z) - (HD + 0.22)), max(slope, EAVE - 0.18 - q.y));
    if (roof < r.x) r = vec2(roof, 2.0);
    float sk = min(sdBox(q - vec3(0.0, 0.2, 0.8), vec3(HW + 0.12, 0.2, 0.07)), sdBox(q - vec3(0.0, 0.2, -0.8), vec3(HW + 0.12, 0.2, 0.07)));
    if (sk < r.x) r = vec2(sk, 7.0);
    vec3 l = q - LAMPL;
    float hood = sdRBox(l - vec3(0.0, 0.045, -0.03), vec3(0.12, 0.055, 0.12), 0.03);
    if (hood < r.x) r = vec2(hood, 5.0);
    float gl = length((l - vec3(0.0, -0.01, 0.015)) * vec3(1.0, 1.45, 1.0)) / 1.45 - 0.062;
    if (gl < r.x) r = vec2(gl, 6.0);
  }
  vec3 mb = vec3(MAST.x, 0.0, MAST.z);
  float mast = capsule(p, mb, mb + vec3(0.0, MAST.y, 0.0), MAST_R);
  mast = min(mast, capsule(p, mb + vec3(-0.5, MAST.y - 0.45, 0.0), mb + vec3(0.5, MAST.y - 0.45, 0.0), 0.024));
  mast = min(mast, capsule(p, mb + vec3(0.42, MAST.y - 0.45, 0.0), mb + vec3(0.42, MAST.y + 0.35, 0.0), 0.012));
  if (mast < r.x) r = vec2(mast, 8.0);
  return r;
}

void main() {
  vec3 ro = uCamPos, rd = camRay(vUv);
  float t = 0.5, m = -1.0;
  for (int i = uZero; i < 220; i++) {
    vec2 h = map(ro + rd * t);
    if (h.x < 0.0004 * t) { m = h.y; break; }
    t += h.x;
    if (t > 600.0) break;
  }
  // Far rays that graze the ice can slip past it: they meet a flat plane instead.
  // Its shade is flat and open: probes from under the swells would read black.
  if (m < 0.0 && rd.y < -1e-4) { oA = vec4(0.0, 1.0, 0.0, min((ro.y - 0.05) / -rd.y, 6e4)); oB = vec4(0.0, 0.0, 1.0, 1.0); return; }
  if (m < 0.0) { oA = vec4(0.0, 1.0, 0.0, 6e4); oB = vec4(-1.0, 0.0, 1.0, 1.0); return; }
  vec3 p = ro + rd * t;
  // The normal from four taps in one loop, so the field compiles once more only.
  vec3 n = vec3(0.0);
  float e = max(0.0015, t * uPx * 0.5);
  for (int i = uZero; i < 4; i++) {
    vec3 k = 0.5773 * (2.0 * vec3(float(((i + 3) >> 1) & 1), float((i >> 1) & 1), float(i & 1)) - 1.0);
    n += k * map(p + k * e).x;
  }
  n = normalize(n);
  // Far off, the ridges are smaller than a pixel: the ice reads flat.
  if (m == 0.0) n = normalize(mix(n, vec3(0.0, 1.0, 0.0), smoothstep(50.0, 160.0, t)));
  // Ambient occlusion, five steps out along the normal.
  float ao = 0.0, sc = 1.0;
  for (int i = uZero; i < 5; i++) {
    float hr = 0.03 + 0.12 * float(i);
    ao += (hr - map(p + n * hr).x) * sc;
    sc *= 0.7;
  }
  ao = mix(clamp(1.0 - 2.2 * ao, 0.0, 1.0), 1.0, smoothstep(60.0, 160.0, t));
  // A soft shadow from the moon behind cloud: wide and faint.
  float sh = 1.0, st = 0.05;
  for (int i = uZero; i < 28; i++) {
    float h = map(p + n * 0.02 + MOON * st).x;
    sh = min(sh, 3.0 * h / st);
    st += clamp(h, 0.08, 1.2);
    if (sh < 0.01 || st > 14.0) break;
  }
  sh = mix(clamp(sh, 0.0, 1.0), 1.0, smoothstep(60.0, 160.0, t));
  // Rime: white feathers on faces that meet the wind. Snow lies on faces that look up.
  float cover = 0.0;
  if (m > 0.5) {
    float fe = vnoise(p * vec3(9.0, 3.0, 9.0)) * 0.6 + vnoise(p * 31.0) * 0.4;
    float face = dot(n, -WIND);
    cover = smoothstep(0.1, 0.75, face + (fe - 0.5) * 0.7);
    if (m == 8.0) cover = max(cover, 0.35 + 0.3 * fe);
    if (m == 6.0) cover *= 0.25;
    cover = max(cover, smoothstep(0.45, 0.75, n.y + (fe - 0.5) * 0.3));
    // Snow piles a little up the foot of every wall.
    cover = max(cover, smoothstep(0.62 + fe * 0.25, 0.35, p.y - groundH(p.xz) + 0.25));
  }
  oA = vec4(n, t);
  oB = vec4(m, cover, ao, sh);
}`;

/* ---------- the haze: a half-size march to the surface ---------- */
// Density: wind-carried puffs, a low layer of streaming drift, and gust fronts.
const DENS = `
uniform sampler3D uNoise;
uniform sampler2D uGust;
uniform float uSig, uGustK, uDrift, uWindS, uGustAll, uGustSpan;
// A gust front crosses the set downwind; the texture holds the last seconds.
float gustAt(vec3 p) {
  float u = dot(p.xz, WIND.xz) + 18.0;
  float g = texture(uGust, vec2(clamp(u / uGustSpan, 0.002, 0.998), 0.5)).r;
  return g + uGustAll;
}
float dens(vec3 p, float g) {
  vec3 q = p - WIND * uWindS;
  float a = dot(q.xz, WIND.xz), c = dot(q.xz, vec2(-WIND.z, WIND.x));
  vec3 s = vec3(a * 0.02, q.y * 0.06, c * 0.045);
  float n1 = texture(uNoise, s).r;
  float n2 = texture(uNoise, s * 3.3 + vec3(0.37, 0.11, 0.73)).g;
  float puff = n1 * 0.65 + n2 * 0.35;
  float air = uSig * (1.0 + uGustK * g) * (0.2 + 1.6 * puff * puff);
  // The ground drift runs faster and lower, in streaks along the wind.
  float gn = texture(uNoise, vec3((a - uWindS * 0.6) * 0.05, p.y * 0.4, c * 0.3)).g;
  float low = uDrift * (1.0 + 1.6 * g) * exp(-max(p.y, 0.0) / 0.5) * (0.25 + 1.5 * gn * gn);
  return air + low;
}
`;

export const VOL = `${HEAD}
${SET}
${DENS}
uniform sampler2D uA;
uniform vec3 uAmb, uMoonCol, uLampCol;
uniform float uFrame;
uniform int uZero;
in vec2 vUv;
out vec4 o;
/* ---------- K3 lighting: Fire's smoke shading (shared/fire.js, volume()) ---------- */
// A short self-shadow march toward the light, Beer plus a multiple-scatter lobe,
// the powder term, and an ambient floor. The phase multiplies outside.
const float ABSORB = 1.6, AMBIENT = 0.12, POWDER = 0.5, MULTI = 1.0;
float lightT(vec3 p, vec3 toL, float g) {
  float sum = 0.0;
  for (int i = uZero; i < 3; i++) {
    float s = 0.35 * exp2(float(i) * 1.4);
    sum += dens(p + toL * s, g) * s * 0.7;
  }
  float tau = sum * ABSORB;
  float beer = exp(-tau);
  float ms = exp(-tau * 0.25) * 0.5;
  float base = mix(beer, beer + ms, MULTI);
  float powder = 1.0 - exp(-tau * 2.0);
  float fin = mix(base, base * powder, POWDER);
  return clamp(fin + AMBIENT, 0.0, 1.0);
}
/* ---------- end K3 lighting ---------- */
void main() {
  vec3 ro = uCamPos, rd = camRay(vUv);
  float tS = texture(uA, vUv).w;
  // Two spans in one loop: fine steps to 42 m, long steps to 170 m.
  float tA = min(tS, 42.0), tB = min(tS, 170.0);
  const int NA = 34, NB = 10;
  float j = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))) + uFrame * 0.618034);
  float T = 1.0;
  vec3 S = vec3(0.0);
  float lampOn = dot(uLampCol, vec3(1.0)) > 1e-4 ? 1.0 : 0.0;
  float gSum = 0.0;
  for (int i = uZero; i < NA + NB; i++) {
    float t0, dt;
    if (i < NA) { dt = (tA - 0.3) / float(NA); t0 = 0.3 + dt * float(i); }
    else { dt = (tB - tA) / float(NB); t0 = tA + dt * float(i - NA); }
    if (dt <= 0.0) continue;
    vec3 p = ro + rd * (t0 + dt * j);
    float g = gustAt(p);
    gSum += g;
    float d = dens(p, g);
    // The haze takes the sky's colour; the moon lobe narrows in thin air.
    float sig = uSig * (1.0 + uGustK * g);
    vec3 Li = uAmb;
    Li += uMoonCol * hg(dot(MOON, rd), mix(0.72, 0.4, clamp(g * 0.7, 0.0, 1.0))) * 12.566 * exp(-sig * 22.0);
    if (lampOn > 0.0 && i < NA) {
      vec3 dl = p - LAMP;
      float d2 = dot(dl, dl);
      vec3 l = dl * inversesqrt(d2);
      float E = lampBeam(l) * lampFront(p) / (d2 + 0.06);
      if (E > 2e-4) Li += uLampCol * E * lightT(p, -l, g) * hg(dot(l, -rd), 0.62) * 12.566;
    }
    float al = 1.0 - exp(-d * dt);
    S += T * al * Li;
    T *= 1.0 - al;
  }
  // The rest of the way: an even haze to the surface, or to the end of sight.
  if (tS > tB) {
    float g = gSum / float(NA + NB);
    float sig = uSig * (1.0 + uGustK * g) * 0.85;
    float Tt = exp(-sig * (min(tS, 3000.0) - tB));
    vec3 Li = uAmb + uMoonCol * hg(dot(MOON, rd), mix(0.72, 0.4, clamp(g * 0.7, 0.0, 1.0))) * 12.566 * exp(-sig * 22.0);
    S += T * (1.0 - Tt) * Li;
    T *= Tt;
  }
  o = vec4(S, T);
}`;

// A five-tap blur along one axis: it hides the march dither.
export const BLUR = `${HEAD}
uniform sampler2D uSrc;
uniform vec2 uStep;
in vec2 vUv;
out vec4 o;
void main() {
  vec2 s = uStep / vec2(textureSize(uSrc, 0));
  o = texture(uSrc, vUv) * 0.4 + (texture(uSrc, vUv + s) + texture(uSrc, vUv - s)) * 0.24 + (texture(uSrc, vUv + 2.0 * s) + texture(uSrc, vUv - 2.0 * s)) * 0.06;
}`;

/* ---------- the light pass: surfaces, wires, the haze over them ---------- */
export const LIGHT = `${HEAD}
${SET}
uniform sampler2D uA, uB, uVol;
uniform sampler3D uNoise;
uniform vec3 uAmb, uMoonCol, uLampCol;
uniform float uWindS, uDrift, uSigNow, uPx, uT, uWinGlow;
in vec2 vUv;
out vec4 o;
float hash2(vec2 p) { vec3 q = fract(vec3(p.xyx) * 0.1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
// The guy wire nearest the ray: its distance, and the ray length there.
vec2 wire(vec3 ro, vec3 rd, vec3 a, vec3 b) {
  vec3 ba = b - a, w0 = ro - a;
  float bb = dot(rd, ba), c = dot(ba, ba), d = dot(rd, w0), e = dot(ba, w0);
  float den = max(c - bb * bb, 1e-6);
  float s = clamp((e - bb * d) / den, 0.0, 1.0);
  vec3 q = a + ba * s;
  float t = dot(q - ro, rd);
  return vec2(length(ro + rd * t - q), t);
}
vec3 lampAt(vec3 p, vec3 n) {
  vec3 dl = p - LAMP;
  float d2 = dot(dl, dl);
  vec3 l = dl * inversesqrt(d2);
  float E = lampBeam(l) * lampFront(p) / (d2 + 0.015);
  return uLampCol * E * max(dot(n, -l), 0.0) * exp(-uSigNow * sqrt(d2));
}
void main() {
  vec3 ro = uCamPos, rd = camRay(vUv);
  vec4 A = texture(uA, vUv), B = texture(uB, vUv);
  vec4 V = texture(uVol, vUv);
  float t = A.w, m = B.x;
  vec3 c = vec3(0.0);
  if (m >= 0.0) {
    vec3 n = A.xyz, p = ro + rd * t;
    float cover = B.y, ao = B.z, sh = B.w;
    vec3 alb = vec3(0.8, 0.84, 0.88);
    vec3 emit = vec3(0.0);
    if (m == 1.0) alb = vec3(0.42, 0.075, 0.025);
    else if (m == 2.0) alb = vec3(0.36, 0.06, 0.02);
    else if (m == 3.0) alb = vec3(0.2, 0.04, 0.018);
    else if (m == 4.0) {
      vec2 wq = hutLocal(p.xz);
      vec2 f = vec2(wq.x - WX, p.y - (WY0 + WY1) * 0.5);
      float bar = step(abs(f.x), 0.022) + step(abs(f.y), 0.022);
      float edge = smoothstep(0.0, 0.07, min(WHW - abs(f.x), (WY1 - WY0) * 0.5 - abs(f.y)));
      // Frost on the glass: brighter low down, where the warmth is.
      float frost = 0.55 + 0.45 * hash2(floor(p.xy * 90.0)) * smoothstep(0.3, -0.3, f.y);
      alb = vec3(0.03);
      emit = bar > 0.0 ? vec3(0.0) : vec3(1.0, 0.5, 0.2) * uWinGlow * frost * edge;
    }
    else if (m == 5.0) alb = vec3(0.05, 0.05, 0.055);
    else if (m == 6.0) { alb = vec3(0.3, 0.28, 0.25); emit = uLampCol * 9.0; }
    else if (m == 7.0) alb = vec3(0.08, 0.07, 0.06);
    else if (m == 8.0) alb = vec3(0.12, 0.12, 0.13);
    alb = mix(alb, vec3(0.78, 0.82, 0.88), cover);
    // Ground drift: snakes of snow stream over the surface.
    if (m == 0.0) {
      float a = dot(p.xz, WIND.xz), cc = dot(p.xz, vec2(-WIND.z, WIND.x));
      float s1 = texture(uNoise, vec3((a - uWindS * 1.5) * 0.07, cc * 0.42, uT * 0.02)).g;
      float s2 = texture(uNoise, vec3((a - uWindS * 1.9) * 0.16, cc * 1.1, 0.5 + uT * 0.03)).r;
      float snake = smoothstep(0.5, 0.85, s1 * 0.6 + s2 * 0.5) * clamp(uDrift * 1.4, 0.0, 1.0);
      alb = mix(alb, vec3(0.95, 0.97, 1.0), snake * 0.6);
      emit += uAmb * snake * 0.5;
    }
    vec3 amb = uAmb * (0.62 + 0.38 * n.y) * ao * 2.4;
    vec3 moon = uMoonCol * max(dot(n, MOON), 0.0) * sh * 1.4;
    vec3 lamp = lampAt(p, n);
    // The snow glitters where the lamp falls on it.
    if (m == 0.0 && dot(lamp, vec3(1.0)) > 1e-3) {
      vec2 cell = floor(p.xz * 70.0);
      float gl = step(0.985, hash2(cell)) * hash2(cell + 7.1);
      lamp *= 1.0 + gl * 6.0;
    }
    c = alb * (amb + moon + lamp) + emit;
  }
  c = c * V.a + V.rgb;
  // The guy wires: thin rimed lines, drawn with pixel coverage.
  vec3 top = vec3(MAST.x, GUY_Y, MAST.z);
  vec3 hazeMean = V.rgb / max(1.0 - V.a, 0.02);
  for (int k = 0; k < 3; k++) {
    vec3 an = k == 0 ? GUY0 : (k == 1 ? GUY1 : GUY2);
    vec2 w = wire(ro, rd, top, an);
    if (w.y <= 0.0 || w.y > t) continue;
    float px = w.y * uPx, r = 0.009;
    float hw = max(r, px * 0.5);
    float cov = min(r / hw, 1.0) * smoothstep(hw + px * 0.5, max(hw - px * 0.5, 0.0), w.x);
    float Tw = exp(-uSigNow * w.y);
    vec3 wc = vec3(0.7, 0.74, 0.8) * uAmb * 2.2 * Tw + hazeMean * (1.0 - Tw);
    c = mix(c, wc, cov);
  }
  o = vec4(c, 1.0);
}`;

/* ---------- the snow: instanced streaks ---------- */
export const FLAKE_VS = `${HEAD}
${SET}
uniform float uWindS, uFallS, uT, uVel, uExpo, uSigNow, uFocus, uAper, uCount;
uniform vec2 uRes;
uniform vec3 uAmb, uLampCol;
out vec2 vQ;
out vec3 vCol;
out float vLen, vW, vDist;
float h1(float n) { return fract(sin(n * 12.9898) * 43758.5453); }
vec3 h3(float n) { return vec3(h1(n), h1(n + 17.31), h1(n + 41.77)); }
// Clip space to pixels.
vec2 toPx(vec4 c) { return (c.xy / c.w * 0.5 + 0.5) * uRes; }
vec4 project(vec3 p) {
  vec3 v = transpose(uCamRot) * (p - uCamPos);
  return vec4(v.x / uLens.x, v.y / uLens.y + uLens.z * -v.z, 0.0, -v.z);
}
void main() {
  float id = float(gl_InstanceID);
  vec3 r = h3(id * 1.37 + 0.5);
  vec3 r2 = h3(id * 2.91 + 7.0);
  // Two crowds: one fills the view, one gathers round the lamp's cone.
  bool near = id < uCount * 0.5;
  vec3 lo, size;
  if (near) { lo = vec3(-15.0, 0.0, -18.0); size = vec3(34.0, 10.0, 42.0); }
  else { lo = LAMP + vec3(-7.5, -2.55, -2.0); size = vec3(12.0, 3.4, 7.0); }
  float spd = 0.75 + 0.5 * r2.x;
  vec3 p = lo + r * size;
  p.xz += WIND.xz * uWindS * spd;
  p.y -= uFallS * (0.6 + 0.8 * r2.y);
  // Flutter: each flake wanders on its own small loop.
  float w1 = 1.3 + 2.1 * r2.z, ph = r2.x * 6.283;
  vec3 fl = vec3(sin(uT * w1 + ph), sin(uT * w1 * 1.3 + ph * 2.0) * 0.7, cos(uT * w1 * 0.8 + ph)) * 0.35;
  p += fl;
  p = lo + mod(p - lo, size);
  vec3 vel = WIND * uVel * spd + vec3(0.0, -1.1 * (0.6 + 0.8 * r2.y), 0.0)
           + vec3(cos(uT * w1 + ph), cos(uT * w1 * 1.3 + ph * 2.0) * 0.91, -sin(uT * w1 * 0.8 + ph) * 0.8) * 0.35 * w1;
  vec3 pp = p - vel * uExpo;
  vec4 c1 = project(p), c0 = project(pp);
  float dist = length(p - uCamPos);
  vDist = dist;
  // Light: the sky everywhere, the lamp inside its cone.
  vec3 dl = p - LAMP;
  float d2 = dot(dl, dl);
  vec3 l = dl * inversesqrt(d2);
  vec3 v = normalize(uCamPos - p);
  float E = lampBeam(l) * lampFront(p) / (d2 + 0.015) * exp(-uSigNow * sqrt(d2));
  vec3 rad = (near ? uAmb * 9.0 : vec3(0.0)) + uLampCol * E * hg(dot(l, v), 0.55) * 12.566 * 2.0;
  float Tc = exp(-uSigNow * dist) * smoothstep(2.0, 5.0, dist);
  // The lamp crowd thins out away from the cone, so its box never shows.
  float wgt = near ? 1.0 : exp(-pow((dot(dl.xz, WIND.xz) - 1.2) / 3.6, 2.0)) * smoothstep(0.0, 0.5, p.y - lo.y) * smoothstep(0.0, 0.5, lo.y + size.y - p.y);
  if (c1.w < 0.3 || c0.w < 0.3) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
  vec2 s1 = toPx(c1), s0 = toPx(c0);
  // Size in pixels: the flake, then its blur off the focus plane.
  float pxPerM = uRes.y / (2.0 * uLens.y * c1.w);
  float rad0 = (0.0018 + 0.0016 * r.x) * pxPerM;
  float coc = uAper * abs(1.0 - uFocus / dist) * uRes.y;
  float w = max(0.7, rad0 + min(coc, 26.0));
  vec2 ax = s1 - s0;
  float L = length(ax);
  vec2 dir = L > 1e-3 ? ax / L : vec2(1.0, 0.0);
  vec2 nrm = vec2(-dir.y, dir.x);
  int k = gl_VertexID;
  // Two triangles: corners along the streak and across it.
  const float US[6] = float[6](0.0, 1.0, 0.0, 0.0, 1.0, 1.0);
  const float SS[6] = float[6](-1.0, -1.0, 1.0, 1.0, -1.0, 1.0);
  float u = US[k], s = SS[k];
  vec2 at = mix(s0 - dir * w, s1 + dir * w, u) + nrm * s * w;
  vQ = vec2(mix(-w, L + w, u), s * w);
  vLen = L; vW = w;
  // The light spreads over the streak and the blur disc.
  float area = (L + 2.0 * w) * 2.0 * w;
  float energy = max(rad0 * rad0, 0.04) * 3.1416;
  vCol = rad * Tc * wgt * min(energy / area, 1.0) * 9.0;
  gl_Position = vec4(at / uRes * 2.0 - 1.0, 0.0, 1.0);
}`;

export const FLAKE_FS = `${HEAD}
uniform sampler2D uA;
in vec2 vQ;
in vec3 vCol;
in float vLen, vW, vDist;
out vec4 o;
void main() {
  float t = texelFetch(uA, ivec2(gl_FragCoord.xy), 0).w;
  if (vDist > t) discard;
  float x = clamp(vQ.x, 0.0, vLen);
  float d = length(vec2(vQ.x - x, vQ.y));
  // Blur discs fade softly to their edge; sharp flakes keep a one-pixel edge.
  float a = 1.0 - smoothstep(vW - max(0.9, vW * 0.7), vW, d);
  if (a <= 0.0) discard;
  o = vec4(vCol * a, 1.0);
}`;

/* ---------- final: downsample, bloom, flare, tone, vignette, grain ---------- */
export const FINAL = `${HEAD}
uniform sampler2D uHdr, uBloom;
uniform float uFrame, uBloomK, uExpo;
uniform vec2 uRes;
uniform vec3 uFlare;
uniform vec3 uFlareCol;
uniform vec2 uLampUv;
in vec2 vUv;
out vec4 o;
${GRADE}
${FLARE}
vec3 film(vec3 x) { return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0); }
void main() {
  vec2 e = 0.25 / uRes;
  vec3 c = (texture(uHdr, vUv + vec2(-e.x, -e.y)).rgb + texture(uHdr, vUv + vec2(e.x, -e.y)).rgb
    + texture(uHdr, vUv + vec2(-e.x, e.y)).rgb + texture(uHdr, vUv + vec2(e.x, e.y)).rgb) * 0.25;
  c += texture(uBloom, vUv).rgb * uBloomK;
  c = film(c * uExpo);
  float asp = uRes.x / uRes.y;
  if (uFlare.x + uFlare.y > 0.0) c = flScreen(c, flFlare(vUv, uLampUv, asp, uFlareCol, 0.32, uFlare));
  c *= gdVignette(vUv, asp, 0.42, 0.35);
  c = pow(max(c, 0.0), vec3(1.0 / 2.2));
  c += (gdIgn(gl_FragCoord.xy + vec2(uFrame * 5.0, uFrame * 3.0)) - 0.5) * 0.018;
  o = vec4(c, 1.0);
}`;
