// Lava coast shaders. Small programs, so D3D11 links each fast.
// World: metres; x right, y up, z ahead. The eye floats at (0, CAMH, 0).
// The camera does not turn: a screen point maps to the ray (X, Y, 1).
// So the view depth of a point is its world z.
import { OUTPUT } from '../shared/output.js';

const HEAD = `#version 300 es
precision highp float;
precision highp sampler3D;
`;

// The lens, the eye and the depth range, shared by every pass.
const VIEW = `
uniform float uTanW, uVy, uHz;
const float CAMH = 35.0;
const float NEAR = 2.0, FAR = 30000.0;
vec3 rayOf(vec2 uv) { return vec3((uv.x * 2.0 - 1.0) * uTanW, (uv.y - uHz) * uVy, 1.0); }
vec4 clipOf(vec3 p) {
  vec3 r = p - vec3(0.0, CAMH, 0.0);
  float a = (FAR + NEAR) / (FAR - NEAR), b = -2.0 * FAR * NEAR / (FAR - NEAR);
  return vec4(r.x / uTanW, 2.0 * r.y / uVy + (2.0 * uHz - 1.0) * r.z, a * r.z + b, r.z);
}
vec2 uvOf(vec3 p) {
  vec3 r = p - vec3(0.0, CAMH, 0.0);
  return vec2(r.x / r.z / uTanW * 0.5 + 0.5, r.y / r.z / uVy + uHz);
}
`;

const NOISE = `
float h2(vec2 p) { vec3 q = fract(p.xyx * 0.1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
vec2 h22(vec2 p) { vec3 q = fract(p.xyx * vec3(0.1031, 0.103, 0.0973)); q += dot(q, q.yzx + 33.33); return fract((q.xx + q.yz) * q.zy); }
float vn2(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h2(i), h2(i + vec2(1, 0)), f.x), mix(h2(i + vec2(0, 1)), h2(i + vec2(1, 1)), f.x), f.y);
}
`;

// Lava light: dull red when cool, white-yellow at the vent's heat.
// The light rises steeply with heat, as a hot body's does.
const INCAND = `
vec3 incand(float T) {
  float t = clamp((T - 0.2) / 0.8, 0.0, 1.0);
  vec3 c = mix(vec3(0.6, 0.035, 0.004), vec3(1.0, 0.2, 0.018), smoothstep(0.0, 0.45, t));
  c = mix(c, vec3(1.0, 0.5, 0.12), smoothstep(0.45, 0.85, t));
  c = mix(c, vec3(1.0, 0.8, 0.52), smoothstep(0.85, 1.0, t));
  return c * (0.04 * t + 1.2 * t * t + 2.2 * t * t * t * t);
}
`;

// The lights the lava casts on what stands near it.
// uVentL: the fountain's light over the vent; uSlot: the sea entries' glow.
const LIGHTS = `
uniform vec4 uVentL;
uniform vec4 uSlot[5];
const vec3 FOUNTC = vec3(1.0, 0.36, 0.08);
const vec3 ENTRYC = vec3(1.0, 0.3, 0.06);
`;

/* ---------- pass 1: the night sky ---------- */
export const SKY_FS = `${HEAD}
in vec2 vUv;
out vec4 o;
${VIEW}
${NOISE}
void main() {
  vec3 d = normalize(rayOf(vUv));
  float e = d.y;
  vec3 c = mix(vec3(0.010, 0.014, 0.032), vec3(0.002, 0.004, 0.012), smoothstep(0.0, 0.4, e));
  // A faint warm airglow over the sea's rim.
  c += vec3(0.012, 0.007, 0.004) * exp(-max(e, 0.0) * 22.0);
  // Stars on a grid of angles: one maybe per cell, jittered.
  vec2 g = vec2(atan(d.x, d.z), asin(clamp(e, -1.0, 1.0))) * 420.0;
  vec2 cell = floor(g), f = fract(g);
  float pick = h2(cell + 3.1);
  if (pick > 0.93 && e > 0.0) {
    vec2 at = 0.25 + 0.5 * h22(cell + 7.7);
    float r = length(f - at);
    float mag = pow(h2(cell + 11.3), 6.0);
    // Hot stars are blue-white; cool ones are orange.
    vec3 tint = mix(vec3(1.0, 0.75, 0.55), vec3(0.75, 0.85, 1.0), h2(cell + 19.1));
    c += tint * (0.02 + 1.6 * mag) * exp(-r * r * 90.0) * smoothstep(0.0, 0.03, e);
  }
  // A faint band of the galaxy, low and tilted.
  float band = exp(-pow((d.y - 0.35 * d.x - 0.22) * 5.0, 2.0));
  c += vec3(0.006, 0.007, 0.01) * band * (0.5 + vn2(g * 0.02)) * smoothstep(0.0, 0.1, e);
  o = vec4(c, FAR);
}`;

/* ---------- pass 2: the land and the lava on it ---------- */
// One grid mesh. Mode 0: the slope, with the lava sim on it. Mode 1: the island round it.
export const LAND_VS = `#version 300 es
precision highp float;
precision highp sampler2D;
in vec2 aG;
uniform sampler2D uB;
uniform highp sampler2D uL;
uniform vec3 uGrid;
uniform vec3 uSim;
uniform vec4 uHole;
uniform float uMode;
${VIEW}
out vec3 vW;
out vec3 vN;
out vec4 vL;
// Manual bilinear: float textures need not filter.
float bil(sampler2D s, vec2 tc) {
  ivec2 n = textureSize(s, 0);
  vec2 p = clamp(tc - 0.5, vec2(0.0), vec2(n) - 1.001);
  ivec2 i = ivec2(floor(p));
  vec2 f = p - vec2(i);
  float a = texelFetch(s, i, 0).r, b = texelFetch(s, min(i + ivec2(1, 0), n - 1), 0).r;
  float c = texelFetch(s, min(i + ivec2(0, 1), n - 1), 0).r, d = texelFetch(s, min(i + 1, n - 1), 0).r;
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}
vec4 bil4(highp sampler2D s, vec2 tc) {
  ivec2 n = textureSize(s, 0);
  vec2 p = clamp(tc - 0.5, vec2(0.0), vec2(n) - 1.001);
  ivec2 i = ivec2(floor(p));
  vec2 f = p - vec2(i);
  vec4 a = texelFetch(s, i, 0), b = texelFetch(s, i + ivec2(1, 0), 0);
  vec4 c = texelFetch(s, i + ivec2(0, 1), 0), d = texelFetch(s, i + 1, 0);
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}
float ground(vec2 xz) { return bil(uB, (xz - uGrid.xy) / uGrid.z * vec2(textureSize(uB, 0))); }
vec4 lava(vec2 xz) { return bil4(uL, (xz - uSim.xy) / uSim.z * vec2(textureSize(uL, 0))); }
float surf(vec2 xz) { return ground(xz) + (uMode < 0.5 ? lava(xz).x : 0.0); }
void main() {
  vec2 xz = uGrid.xy + aG * uGrid.z;
  float cs = uGrid.z / float(textureSize(uB, 0).x);
  vec4 L = uMode < 0.5 ? lava(xz) : vec4(0.0);
  float y = ground(xz) + L.x;
  // The slope's rim drops into a skirt; the island under the slope sinks away.
  if (uMode < 0.5 && (aG.x < 0.001 || aG.y < 0.001 || aG.x > 0.999 || aG.y > 0.999)) y -= 20.0;
  if (uMode > 0.5 && xz.x > uHole.x && xz.x < uHole.z && xz.y > uHole.y && xz.y < uHole.w) y -= 8.0;
  float hx = surf(xz + vec2(cs, 0.0)) - surf(xz - vec2(cs, 0.0));
  float hz = surf(xz + vec2(0.0, cs)) - surf(xz - vec2(0.0, cs));
  vN = normalize(vec3(-hx, 2.0 * cs, -hz));
  vW = vec3(xz.x, y, xz.y);
  vL = L;
  gl_Position = clipOf(vW);
}`;

export const LAND_FS = `${HEAD}
in vec3 vW;
in vec3 vN;
in vec4 vL;
out vec4 o;
uniform sampler2D uGlow;
uniform vec3 uSim;
uniform float uT, uCs, uVentHeat;
uniform vec2 uVent;
${VIEW}
${NOISE}
${INCAND}
${LIGHTS}
// Crust plates: the distance to the nearest crack, in plate units.
float crack(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  float d1 = 9.0, d2 = 9.0;
  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
    vec2 g = vec2(x, y), q = g + h22(i + g) * 0.85 + 0.075 - f;
    float d = dot(q, q);
    if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) d2 = d;
  }
  return sqrt(d2) - sqrt(d1);
}
void main() {
  vec3 p = vW;
  vec3 V = normalize(vec3(0.0, CAMH, 0.0) - p);
  float far = p.z;
  // Rough basalt: a fine bump, faded with distance.
  float fine = 1.0 - smoothstep(600.0, 2400.0, far);
  vec2 bq = p.xz * 0.55;
  vec3 N = normalize(vN + fine * 0.35 * vec3(vn2(bq) - 0.5, 0.0, vn2(bq + 9.1) - 0.5));
  float h = vL.x, T = vL.y;
  float isLava = smoothstep(0.08, 0.5, h);
  // Old flows streak the slope: glassy dark ribbons on grey cinders.
  float old = smoothstep(0.45, 0.7, vn2(vec2(p.x / 38.0, p.z / 160.0)) * 0.7 + vn2(p.xz / 14.0) * 0.3);
  vec3 alb = mix(vec3(0.05, 0.047, 0.046), vec3(0.028, 0.028, 0.032), old) * (0.75 + 0.5 * vn2(p.xz / 3.0));
  alb = mix(alb, vec3(0.022, 0.022, 0.026), isLava);
  float gloss = mix(0.15, 0.6, max(old, isLava));
  // Starlight from above.
  vec3 col = alb * vec3(0.06, 0.075, 0.13) * (0.55 + 0.45 * N.y);
  // The glow of the lava field on the ground round it.
  vec2 gu = (p.xz - uSim.xy) / uSim.z;
  float glw = all(greaterThan(gu, vec2(0.0))) && all(lessThan(gu, vec2(1.0))) ? texture(uGlow, gu).r : 0.0;
  col += alb * vec3(1.0, 0.32, 0.08) * glw * 6.0 * (0.4 + 0.6 * N.y);
  // The fountain lights the flank round the vent.
  vec3 dl = uVentL.xyz - p;
  float rl = length(dl);
  col += alb * FOUNTC * uVentL.w * max(dot(N, dl / rl), 0.0) * 1.0e4 / (rl * rl + 900.0);
  // The sea entries light the cliff and the shore.
  for (int k = 0; k < 4; k++) {
    vec3 de = uSlot[k].xyz + vec3(0.0, 4.0, 0.0) - p;
    float re = length(de);
    col += alb * ENTRYC * uSlot[k].w * max(dot(N, de / re) * 0.7 + 0.3, 0.0) * 600.0 / (re * re + 400.0);
  }
  // A glassy sheen: the sky and the glow in fresh rock.
  vec3 R = reflect(-V, N);
  float fres = 0.04 + 0.96 * pow(1.0 - max(dot(N, V), 0.0), 5.0);
  col += gloss * fres * (vec3(0.01, 0.013, 0.026) * smoothstep(-0.1, 0.4, R.y) + vec3(1.0, 0.3, 0.07) * glw * 0.9);
  // The lava's own light.
  if (h > 0.03 && T > 0.2) {
    vec2 v = vL.zw * uCs;
    float spd = length(v);
    // Two layers of plates slide with the flow, in turn: no smear.
    float ph = fract(uT * 0.25), w = abs(ph * 2.0 - 1.0);
    vec2 adv = v * 0.18;
    float plate = 9.0 - 3.0 * smoothstep(0.5, 1.0, T);
    // Plates stretch along the slope, as the flow drags them.
    vec2 ps = vec2(plate, plate * 1.8);
    vec2 q0 = (p.xz - adv * ph * 4.0) / ps, q1 = (p.xz - adv * fract(ph + 0.5) * 4.0) / ps + 13.7;
    // Hot crust breaks wide; cool crust leaves thin, dim cracks.
    float wide = mix(0.035, 0.16, smoothstep(0.3, 0.95, T));
    float c0 = crack(q0), c1 = crack(q1);
    // Past a pixel a crack blurs into its average, not into shimmer.
    float f0 = fwidth(c0), f1 = fwidth(c1);
    float k0 = (1.0 - smoothstep(0.0, wide + f0, c0)) * mix(1.0, wide / (wide + f0), 0.6);
    float k1 = (1.0 - smoothstep(0.0, wide + f1, c1)) * mix(1.0, wide / (wide + f1), 0.6);
    float cr = mix(k0, k1, w);
    // A fast channel is open: its surface streams bright along the flow.
    vec2 dir = spd > 0.01 ? v / spd : vec2(0.0, 1.0);
    vec2 sq = vec2(dot(p.xz, vec2(dir.y, -dir.x)) / 1.6, dot(p.xz, dir) / 9.0 - uT * spd * 0.11);
    float streak = 0.75 + 0.25 * vn2(sq * vec2(0.3, 1.0));
    float open = 0.0;
    // Braids: hot threads run with the flow, parted by crust.
    vec2 bq = vec2(dot(p.xz, vec2(dir.y, -dir.x)) / 13.0, dot(p.xz, dir) / 90.0);
    float thr = vn2(bq) * 0.7 + vn2(bq * 2.7 + 5.0) * 0.3;
    open = smoothstep(0.54, 0.64, thr) * smoothstep(0.55, 0.85, T) * (0.55 + 0.45 * smoothstep(4.0, 30.0, spd));
    // Lava pouring down a steep face runs open, a bright stream.
    open = max(open, smoothstep(0.8, 0.5, vN.y / length(vN)) * smoothstep(0.4, 0.7, T));
    float edge = smoothstep(0.02, 0.2, h);
    vec3 e = incand(T) * mix(cr * 1.0 + 0.006, streak * 1.4, open) * edge;
    // The skin of a plate glows faintly while very hot.
    e += incand(T * 0.9) * 0.06 * smoothstep(0.75, 1.0, T) * (1.0 - cr);
    col += e;
  }
  // The crater's pond glows; it brightens with the vent.
  float dv = length(p.xz - uVent);
  col += incand(0.6 + 0.4 * uVentHeat) * smoothstep(16.0, 5.0, dv) * (0.15 + 0.85 * uVentHeat) * 0.6;
  // Far land fades into the dark air.
  col = mix(col, vec3(0.004, 0.005, 0.01), 1.0 - exp(-far / 9000.0));
  o = vec4(col, far);
}`;

/* ---------- pass 3: the fountain's clots and the shore's spatter ---------- */
// Each clot is a streak in screen space, from where it is to where it was.
export const SPARK_VS = `#version 300 es
precision highp float;
uniform vec3 uVentP;
uniform float uFount[48];
uniform float uFountH, uT, uExpo, uWindX;
uniform vec4 uBurst[6];
uniform vec2 uView;
uniform int uNF;
${VIEW}
out float vU;
out vec3 vC;
float hs(float n) { return fract(sin(n * 12.9898 + 4.1) * 43758.5453); }
const float G = 40.0;
void main() {
  int id = gl_InstanceID, vid = gl_VertexID;
  float fid = float(id);
  float s1 = hs(fid), s2 = hs(fid + 0.37), s3 = hs(fid + 0.71), s4 = hs(fid + 0.13), s5 = hs(fid + 0.59);
  vec3 pa, pb;
  float heat, size;
  bool on = true;
  if (id < uNF) {
    // The fountain: a clot leaves the vent at its launch time with that moment's strength.
    float P = 6.0, a = mod(uT + s1 * P, P);
    int fi = int(a / 0.125);
    float S = fi < 48 ? mix(uFount[fi], uFount[min(fi + 1, 47)], fract(a / 0.125)) : 0.0;
    float v0 = sqrt(2.0 * G * uFountH * S) * (0.5 + 0.5 * sqrt(s2));
    // A narrow jet; a few clots fly wide.
    float spread = 0.1 + 0.4 * s5 * s5;
    vec3 dir = normalize(vec3((s3 - 0.5) * spread, 1.0, (s4 - 0.5) * spread * 0.8));
    vec3 v = dir * v0 + vec3(uWindX * 0.08 * v0 / 40.0, 0.0, 0.0);
    pa = uVentP + v * a + vec3(0.0, -0.5 * G * a * a, 0.0);
    float b = max(a - uExpo, 0.0);
    pb = uVentP + v * b + vec3(0.0, -0.5 * G * b * b, 0.0);
    // Clots land on the cone and stop.
    on = S > 0.02 && pa.y > uVentP.y - 6.0 - 0.15 * length(pa.xz - uVentP.xz);
    heat = 1.0 - 0.09 * a - 0.15 * s2;
    size = 1.0 + 1.2 * s4;
  } else {
    // A burst where the surf hits the lava: spatter thrown in a fan.
    int k = (id - uNF) / 64;
    vec4 B = uBurst[k];
    float a = uT - B.w;
    vec3 v = vec3((s1 - 0.5) * 1.4, 0.5 + 0.9 * s2, (s3 - 0.65) * 0.9) * (10.0 + 26.0 * s4 * s4);
    pa = B.xyz + v * a + vec3(0.0, -0.5 * G * a * a, 0.0);
    float b = max(a - uExpo, 0.0);
    pb = B.xyz + v * b + vec3(0.0, -0.5 * G * b * b, 0.0);
    on = a > 0.0 && a < 2.4 && pa.y > -0.5;
    heat = 0.95 - 0.35 * a - 0.2 * s5;
    size = 0.8 + 0.8 * s4;
  }
  vec4 ca = clipOf(pa), cb = clipOf(pb);
  vec2 sa = ca.xy / ca.w * 0.5 * uView, sb = cb.xy / cb.w * 0.5 * uView;
  vec2 d = sa - sb;
  float l = max(length(d), 1e-3);
  vec2 n = vec2(-d.y, d.x) / l;
  float w = size * uView.x / 1280.0 + 0.4;
  int c = vid % 6;
  float side = (c == 1 || c == 4 || c == 5) ? 1.0 : -1.0;
  bool head = c == 2 || c == 3 || c == 5;
  vec4 cc = head ? ca : cb;
  vec2 sp = (head ? sa : sb) + n * w * side + d / l * w * (head ? 1.0 : -1.0);
  gl_Position = on ? vec4(sp / (0.5 * uView) * cc.w, cc.z, cc.w) : vec4(2.0, 2.0, 2.0, 1.0);
  vU = side;
  // A long streak spreads its light over its length.
  float t = clamp((heat - 0.26) / 0.74, 0.0, 1.0);
  vec3 col = mix(vec3(0.7, 0.05, 0.005), vec3(1.0, 0.3, 0.04), smoothstep(0.0, 0.5, t));
  col = mix(col, vec3(1.0, 0.7, 0.35), smoothstep(0.6, 1.0, t));
  vC = col * (0.04 + 1.3 * t * t * t) * min(1.0, 3.0 * w / (l + w));
}`;

export const SPARK_FS = `${HEAD}
in float vU;
in vec3 vC;
out vec4 o;
void main() {
  o = vec4(vC * exp(-vU * vU * 2.2), 0.0);
}`;

/* ---------- pass 4: the steam towers, at half size ---------- */
export const STEAM_FS = `${HEAD}
in vec2 vUv;
out vec4 o;
uniform sampler2D uScene;
uniform sampler2D uHist;
uniform sampler3D uNoise;
uniform sampler2D uGlow;
uniform vec3 uSim;
uniform float uT, uFrame, uHead, uSteps;
uniform vec2 uWindV;
${VIEW}
${LIGHTS}
// A parcel at height y left its source this long ago: y = RISE * sqrt(age).
const float RISE = 62.0, AGE = 63.0;
const float SIG = 0.17;
// The history: column uHead is now; older columns lie to the left, 0.5 s apart.
float hist(int k, float age) {
  float u = (uHead + 0.5 - age * 2.0) / 128.0;
  return texture(uHist, vec2(u, (float(k) + 0.5) / 5.0)).r;
}
// Steam of one tower at p. lite: no fine noise, for the light taps.
float tower(vec3 p, int k, bool lite) {
  vec4 s = uSlot[k];
  float y = p.y - s.y;
  if (y < -6.0) return 0.0;
  float yy = max(y, 0.0);
  float a = (yy / RISE) * (yy / RISE);
  if (a > AGE) return 0.0;
  // The column leans downwind and wanders as it climbs.
  float te = uT - a;
  vec2 axis = s.xz + uWindV * a * (0.25 + 0.75 * min(a / 6.0, 1.0));
  axis += vec2(sin(te * 0.31 + float(k) * 2.1), cos(te * 0.23 + float(k))) * 14.0 * min(yy / 120.0, 1.0);
  // The vent's gas column is narrower.
  float e = hist(k, a);
  if (e < 0.004) return 0.0;
  // A small source makes a thin column; the vent's gas column is narrower.
  float r = (k == 4 ? 14.0 : 16.0 + 16.0 * min(e, 1.0)) + 0.28 * yy;
  vec2 d = p.xz - axis;
  float q = dot(d, d) / (r * r);
  if (q > 2.0) return 0.0;
  // Each parcel keeps its own billows as it rises and swells.
  vec3 nc = vec3(d / r * 0.42, te * 0.06 + yy / r * 0.42 + uT * 0.01) + float(k) * 0.37;
  vec2 wp = texture(uNoise, nc * 0.6 + 0.21).rg - 0.5;
  nc.xy += wp * 0.3;
  float bill = texture(uNoise, nc).g;
  // The light taps see only the column's shape: no streaks of shadow.
  if (lite) bill = 0.5;
  else bill = bill * 0.68 + texture(uNoise, nc * 2.7 + 0.5).g * 0.32;
  float shape = exp(-q * 1.4);
  // Billows: lumps of steam with gaps between, cut sharp at the edge.
  float dn = smoothstep(0.42, 0.62, bill * 0.95 + shape * 0.5 - 0.22) * (0.35 + 0.65 * shape);
  // The steam spreads, so it thins as it climbs; it boils thick at the water.
  dn *= e * (1.0 + 0.6 * exp(-yy / 20.0)) / (1.0 + yy / 240.0);
  return dn * smoothstep(-6.0, 2.0, y) * (1.0 - smoothstep(AGE * 0.7, AGE, a));
}
float steam(vec3 p, bool lite) {
  float d = 0.0;
  for (int k = 0; k < 5; k++) d += tower(p, k, lite);
  return d;
}
/* ---------- K3 lighting: Fire's smoke shading (shared/fire.js, volume()) ---------- */
// A short self-shadow march toward the key, Beer plus a multiple-scatter lobe,
// the powder term, an ambient floor, and a Henyey-Greenstein phase times 4 pi.
const float ABSORB = 2.0, AMBIENT = 0.5, POWDER = 0.59, MULTI = 1.0, G_HG = 0.55;
float hg(float c, float g) { float g2 = g * g; return (1.0 - g2) / pow(max(1.0 + g2 - 2.0 * g * c, 1e-4), 1.5) * 0.079577; }
float lightT(vec3 p, vec3 L) {
  // Three taps toward the key; the far tap stands for the rest of the way.
  vec3 dir = L - p;
  float dist = length(dir);
  dir /= dist;
  float a = min(dist * 0.15, 14.0), b = min(dist * 0.4, 40.0), c = min(dist * 0.8, 110.0);
  float sum = steam(p + dir * a, true) * a + steam(p + dir * b, true) * (b - a) + steam(p + dir * c, true) * (c - b);
  float tau = sum * SIG * ABSORB * 0.5;
  float beer = exp(-tau);
  float ms = exp(-tau * 0.25) * 0.5;
  float base = mix(beer, beer + ms, MULTI);
  float powder = 1.0 - exp(-tau * 2.0);
  float fin = mix(base, base * powder, POWDER);
  return clamp(fin + AMBIENT * 0.35, 0.0, 1.0);
}
/* ---------- end K3 lighting ---------- */
// The strongest glow near p: the key for the self-shadow.
vec4 keyAt(vec3 p) {
  vec4 best = vec4(0.0);
  float bi = 0.0;
  for (int k = 0; k < 5; k++) {
    vec4 s = uSlot[k];
    if (s.w <= 0.0) continue;
    vec3 L = k == 4 ? uVentL.xyz : s.xyz + vec3(0.0, 3.0, 0.0);
    float I = (k == 4 ? uVentL.w : s.w) / (1.0 + dot(p - L, p - L) / (130.0 * 130.0));
    if (I > bi) { bi = I; best = vec4(L, k == 4 ? uVentL.w : s.w); }
  }
  return best;
}
vec3 light(vec3 p, vec3 rd, float dens) {
  // Sky light from above, faint: the tops read grey against the stars.
  vec3 Li = vec3(0.026, 0.026, 0.03) * (0.6 + 0.4 * smoothstep(0.0, 300.0, p.y));
  // The lava field glows on the towers from below and behind.
  vec2 gu = (p.xz - uSim.xy) / uSim.z;
  if (all(greaterThan(gu, vec2(0.0))) && all(lessThan(gu, vec2(1.0)))) Li += vec3(1.0, 0.32, 0.08) * texture(uGlow, gu).r * 3.5 * exp(-max(p.y, 0.0) / 220.0);
  vec4 key = keyAt(p);
  if (key.w > 0.0) {
    vec3 dl = key.xyz - p;
    float r = length(dl);
    float ph = hg(dot(rd, dl / r), G_HG) * 12.56637;
    vec3 c = key.xyz == uVentL.xyz ? FOUNTC : ENTRYC;
    Li += c * key.w * lightT(p, key.xyz) * ph * 1500.0 / (r * r + 2500.0);
  }
  // The other glows, without a shadow.
  for (int k = 0; k < 4; k++) {
    vec4 s = uSlot[k];
    if (s.w <= 0.0) continue;
    vec3 dl = s.xyz - p;
    Li += ENTRYC * s.w * 900.0 / (dot(dl, dl) + 3600.0) * 0.35;
  }
  return Li;
}
// Marches the ray from view depth z0 to z1 in n steps.
// Steps sit at fixed depths, so neighbour pixels sample alike; the land ends the march.
void march(vec3 rd, float z0, float z1, float zEnd, int n, float j, inout vec3 S, inout float T) {
  if (zEnd <= z0) return;
  float dz = (z1 - z0) / float(n), len = length(rd) * dz;
  float z = z0 + dz * j;
  vec3 nrd = normalize(rd);
  for (int i = 0; i < 64; i++) {
    if (i >= n || T < 0.02 || z > zEnd) break;
    vec3 p = vec3(0.0, CAMH, 0.0) + rd * z;
    z += dz;
    if (p.y > 640.0) continue;
    // Steam fades just before the land: no hard cut along the gullies.
    float d = steam(p, false) * smoothstep(zEnd, zEnd - 45.0, z);
    if (d < 0.002) continue;
    float al = 1.0 - exp(-d * SIG * len);
    S += T * al * light(p, nrd, d);
    T *= 1.0 - al;
  }
}
void main() {
  vec3 rd = rayOf(vUv);
  float zs = texture(uScene, vUv).a;
  if (rd.y < 0.0) zs = min(zs, CAMH / -rd.y);
  float j = fract(fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) + uFrame * 0.618034);
  vec3 S = vec3(0.0);
  float T = 1.0;
  int n1 = int(uSteps), n2 = int(uSteps * 0.4);
  march(rd, 300.0, 780.0, zs, n1, j, S, T);
  march(rd, 1120.0, 1520.0, zs, n2, j, S, T);
  o = vec4(S, T);
}`;

// A three-tap blur along one axis: it hides the march dither, as in Fire.
export const BLUR_FS = `${HEAD}
uniform sampler2D uSrc;
uniform vec2 uStep;
in vec2 vUv;
out vec4 o;
void main() {
  vec2 s = uStep / vec2(textureSize(uSrc, 0));
  o = texture(uSrc, vUv) * 0.5 + (texture(uSrc, vUv + s) + texture(uSrc, vUv - s)) * 0.25;
}`;

/* ---------- pass 5: the sea, and the steam over all ---------- */
export const SEA_FS = `${HEAD}
in vec2 vUv;
out vec4 o;
uniform sampler2D uScene, uSteam, uGlow;
uniform sampler2D uB;
uniform vec3 uGrid, uSim;
uniform float uT, uSwell;
${VIEW}
${NOISE}
${LIGHTS}
// The waves' height field: a swell from the sea, and chop over it.
float waves(vec2 p) {
  float sw = sin(p.y * 0.075 + uT * 0.9 + vn2(p * 0.006) * 5.0) * 0.6 + sin(p.y * 0.13 - p.x * 0.04 + uT * 1.3) * 0.3;
  float ch = vn2(p * 0.12 + vec2(uT * 0.25, uT * 0.4)) + 0.5 * vn2(p * 0.31 - vec2(uT * 0.4, -uT * 0.6));
  return sw * uSwell + ch * 0.35;
}
vec3 seen(vec2 uv) {
  if (uv.y > 1.0 || uv.x < 0.0 || uv.x > 1.0) return vec3(0.004, 0.006, 0.014);
  vec4 a = texture(uScene, uv);
  vec4 s = texture(uSteam, uv);
  return a.rgb * s.a + s.rgb;
}
void main() {
  vec4 A = texture(uScene, vUv);
  vec4 St = texture(uSteam, vUv);
  vec3 rd = rayOf(vUv);
  vec3 col = A.rgb;
  float zw = rd.y < 0.0 ? CAMH / -rd.y : 1e9;
  if (zw < A.a) {
    vec3 p = vec3(0.0, CAMH, 0.0) + rd * zw;
    vec3 dir = normalize(rd);
    // Normals from the waves; detail fades with distance.
    float e = 0.6 + zw * 0.004, k = 1.0 / (1.0 + zw / 900.0);
    float w0 = waves(p.xz);
    vec3 N = normalize(vec3(-(waves(p.xz + vec2(e, 0.0)) - w0) / e * k, 1.0, -(waves(p.xz + vec2(0.0, e)) - w0) / e * k));
    float cosv = max(dot(-dir, N), 0.0);
    float F = 0.02 + 0.98 * pow(1.0 - cosv, 5.0);
    vec3 r = reflect(dir, N);
    r.y = max(r.y, 0.002);
    // The mirror image: what stands at the shore, about 500 m out.
    float zq = max(p.z + 40.0, 520.0);
    vec3 q = p + r * ((zq - p.z) / max(r.z, 0.05));
    vec2 uq = uvOf(q);
    vec2 sp = vec2(0.0, 0.004 + 0.02 * (1.0 - cosv));
    vec3 refl = (seen(uq) * 0.4 + seen(uq + sp) * 0.3 + seen(uq - sp) * 0.3);
    // Depth under the water, from the land's heights.
    vec2 gu = (p.xz - uGrid.xy) / uGrid.z;
    float depth = all(greaterThan(gu, vec2(0.0))) && all(lessThan(gu, vec2(1.0))) ? -texture(uB, gu).r : 40.0;
    vec3 wc = vec3(0.001, 0.002, 0.004);
    // Lava under the water still glows through the shallows.
    wc += A.rgb * exp(-max(depth, 0.0) * 0.45) * 0.55;
    // The glow of the entries spreads in the water round them.
    vec3 glo = vec3(0.0);
    for (int i = 0; i < 4; i++) {
      vec4 s = uSlot[i];
      if (s.w <= 0.0) continue;
      float dd = length(p.xz - s.xz);
      glo += ENTRYC * s.w * (40.0 / (dd + 40.0)) * exp(-dd / 160.0);
    }
    vec2 su = (p.xz - uSim.xy) / uSim.z;
    float glw = all(greaterThan(su, vec2(0.0))) && all(lessThan(su, vec2(1.0))) ? texture(uGlow, su).r : 0.0;
    wc += glo * 0.12 + vec3(1.0, 0.3, 0.07) * glw * 0.25;
    // Surf: bands of foam break toward the shore.
    float sh = 1.0 - smoothstep(0.2, 3.5, depth);
    float band = smoothstep(0.55, 0.95, sin(depth * 2.2 - uT * 1.6 + vn2(p.xz * 0.05) * 4.0) * 0.5 + 0.5);
    float foam = sh * (0.35 + 0.65 * band) * smoothstep(0.3, 0.7, vn2(p.xz * 0.35 + uT * 0.3));
    vec3 lit = vec3(0.012, 0.016, 0.03) + glo * 0.8 + vec3(1.0, 0.32, 0.07) * glw * 2.0;
    col = mix(wc * (1.0 - F) + refl * F, lit * 0.6, foam * 0.8);
  }
  o = vec4(col * St.a + St.rgb, 1.0);
}`;

/* ---------- pass 6: grade and out ---------- */
export const FINAL_FS = `${HEAD}
in vec2 vUv;
out vec4 o;
uniform sampler2D uHdr, uBloom;
uniform float uBloomK, uExpo, uAsp, uFrame;
${OUTPUT}
void main() {
  vec3 c = texture(uHdr, vUv).rgb + texture(uBloom, vUv).rgb * uBloomK;
  // A soft vignette, a little wider than tall.
  vec2 v = (vUv - 0.5) * vec2(uAsp, 1.0) / max(uAsp, 1.0);
  c *= 1.0 - 0.5 * smoothstep(0.25, 0.95, dot(v, v) * 1.6);
  // Night light: the shadows lean blue, the lava stays warm.
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  c = mix(c * vec3(0.85, 0.95, 1.2), c, smoothstep(0.01, 0.3, l));
  o = vec4(ouFilmAces(c, uExpo, gl_FragCoord.xy + uFrame * 7.0), 1.0);
}`;
