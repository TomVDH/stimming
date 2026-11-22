// Spillway GLSL. Four programs share one scene description.
// GBUF raymarches rock, dam, piers, gates and pool into three targets.
// MIST marches the spray at half size. SHADE lights each frame.
// FINAL adds bloom, the grade and the film curve.
import { SKY } from '../shared/sky.js';
import { GRADE } from '../shared/grade.js';
import { OUTPUT } from '../shared/output.js';

// Scene numbers in metres. JS reads the same table for picking.
export const DAM = {
  zc: 20,        // arch axis z: the face curves round this point
  r0: 70,        // face radius at the crest
  crest: 50,     // top of the solid dam
  sill: 45,      // spillway sill between the piers
  pitch: 7.1,    // pier to pier
  bayHalf: 2.8,  // half clear width of one bay
  first: -14.2,  // x of the first bay centre
  bays: 5,
};

// Material ids in the G-buffer alpha.
export const MAT = { sky: 0, rock: 1, concrete: 2, pool: 3, steel: 4, crest: 5 };

const HEAD = /* glsl */`#version 300 es
precision highp float;
precision highp sampler2D;
uniform vec2 uRes;
uniform vec3 uCam, uRight, uUp, uFwd;
uniform vec2 uTan;
uniform sampler2D uNoise;
uniform vec3 uSun, uSunCol, uSkyCol;
#define ZC ${DAM.zc.toFixed(1)}
#define R0 ${DAM.r0.toFixed(1)}
#define CREST ${DAM.crest.toFixed(1)}
#define SILL ${DAM.sill.toFixed(1)}
#define PITCH ${DAM.pitch.toFixed(2)}
#define BAYH ${DAM.bayHalf.toFixed(2)}
#define BAY0 ${DAM.first.toFixed(2)}
#define SPAN 18.6

vec3 rayDir(vec2 fc) {
  vec2 n = fc / uRes * 2.0 - 1.0;
  return normalize(uFwd + uRight * n.x * uTan.x + uUp * n.y * uTan.y);
}
// Value noise from one texture: green holds the next z slice.
float n3(vec3 x) {
  vec3 p = floor(x), f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  vec2 uv = p.xy + vec2(37.0, 17.0) * p.z + f.xy;
  vec2 rg = textureLod(uNoise, (uv + 0.5) / 256.0, 0.0).yx;
  return mix(rg.x, rg.y, f.z);
}
float fbm3(vec3 p, int oct) {
  float s = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) {
    if (i >= oct) break;
    s += a * n3(p);
    p = p * 2.03 + vec3(3.1, 1.7, 5.3);
    a *= 0.5;
  }
  return s;
}
float sq(float x) { return x * x; }
float h21(vec2 p) { vec3 q = fract(p.xyx * 0.1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
// The downstream face: its radius shrinks toward the foot.
float faceR(float y) { return R0 - 0.14 * (CREST - y); }
// The foot of the face at the pool, as a z for each x.
float toeZ(float x) { float r = faceR(0.0); return ZC + sqrt(max(r * r - x * x, 0.0)); }
float bayX(int i) { return BAY0 + float(i) * PITCH; }
`;

/* ---------- G-buffer: the scene, raymarched once ---------- */
export const GBUF = /* glsl */`${HEAD}
layout(location = 0) out vec4 o0;
layout(location = 1) out vec4 o1;
layout(location = 2) out vec4 o2;
uniform float uGate[5];
uniform float uFar;
uniform int uSteps;

// The gorge bends a little as it runs.
float bend(float z) { return 2.5 * sin(z * 0.021 + 0.6) + 1.2 * sin(z * 0.053); }
// Half the gorge width at a point; it flares above the rim and upstream.
float halfW(vec3 p) {
  float w = 27.5 + 0.12 * p.y + 4.0 * smoothstep(70.0, 0.0, p.z);
  float rim = 74.0 + 22.0 * n3(vec3(p.z * 0.015, 3.1, p.x > 0.0 ? 7.0 : 1.0));
  w += max(p.y - rim, 0.0) * 1.8;
  w += max(p.z - 115.0, 0.0) * 0.45;
  return w;
}
float rockD(vec3 p) {
  float c = bend(p.z);
  float hw = halfW(p);
  float d = min((p.x - c) + hw, hw - (p.x - c));
  d = min(d, p.y + 7.0);
  if (d < 14.0) {
    // Big bulges, taller than wide, then vertical fracture columns.
    float n = fbm3(p * vec3(0.025, 0.017, 0.025), 3) * 13.0;
    n += n3(p * vec3(0.11, 0.03, 0.11)) * 3.4;
    n += n3(p * 0.23) * 0.9;
    d += n - 8.5;
  }
  return d;
}
// Arch coordinates: x across, y up, w out from the face (+ is upstream).
float archW(vec3 p) { return length(p.xz - vec2(0.0, ZC)) - faceR(p.y); }
float damD(vec3 p, float w) {
  float t = 7.0 + 0.32 * (CREST - p.y);
  float d = max(-w, w - t);
  d = max(d, p.y - CREST);
  d = max(d, ZC + 30.0 - p.z);
  // The spillway notch between the outer piers.
  float notch = max(abs(p.x) - SPAN, SILL - p.y);
  // A rounded ogee lip where the water leaves the sill.
  float k = 1.6;
  float h = clamp(0.5 - 0.5 * (-notch - d) / k, 0.0, 1.0);
  return mix(-notch, d, h) + k * h * (1.0 - h);
}
float pierD(vec3 p, float w) {
  float j = clamp(floor((p.x - BAY0) / PITCH + 1.0), 0.0, 5.0);
  float xp = BAY0 - PITCH * 0.5 + j * PITCH;
  float nose = 5.0 * smoothstep(37.0, 47.0, p.y);
  float d = max(abs(p.x - xp) - 0.75, max(p.y - 57.5, 37.0 - p.y));
  d = max(d, max(-w - nose, w - 9.0));
  // The deck: a hoist bridge across the pier tops.
  float deck = max(abs(p.x) - SPAN - 0.4, max(abs(p.y - 56.9) - 0.75, max(-w - 6.8, w + 1.6)));
  return min(d, deck);
}
// One radial gate: a skin plate on a circle round its trunnion, plus four arms.
float gateD(vec3 p, float w, out float water) {
  water = 1e5;
  if (abs(p.x) > SPAN + 1.0 || p.y < SILL - 2.0 || p.y > 60.0) return 1e5;
  int i = int(clamp(floor((p.x - BAY0) / PITCH + 0.5), 0.0, 4.0));
  float xc = bayX(i), lx = p.x - xc;
  float open = uGate[i];
  vec2 tr = vec2(-7.0, 50.0);
  vec2 q = vec2(w, p.y) - tr;
  float rg = 9.43, phi0 = -0.559 + open * 0.70, hw2 = 0.345;
  float ph = atan(q.y, q.x);
  float dAng = (abs(ph - (phi0 + hw2)) - hw2) * rg;
  float plate = max(abs(length(q) - rg) - 0.22, dAng);
  plate = max(plate, abs(lx) - BAYH + 0.05);
  // Arms run from the trunnion to the plate, two on each side.
  float arms = 1e5;
  for (int k = 0; k < 2; k++) {
    float a = phi0 + (k == 0 ? 0.12 : 0.57);
    vec2 e = tr + rg * vec2(cos(a), sin(a));
    vec2 pa = vec2(w, p.y) - tr, ba = e - tr;
    float hh = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
    float r2 = length(pa - ba * hh);
    arms = min(arms, length(vec2(r2, abs(abs(lx) - BAYH + 0.45))) - 0.28);
  }
  // Water under a lifted gate: a tongue over the sill, up to the plate.
  float lip = rg * sin(phi0) + tr.y;
  float depth = max(lip - SILL, 0.0) * 0.82;
  water = max(max(abs(lx) - BAYH, p.y - SILL - depth), max(SILL - 0.3 - p.y, max(-w - 0.6, w - 6.0)));
  water = depth > 0.05 ? water : 1e5;
  return min(plate, arms);
}
float map(vec3 p, out float mat) {
  float w = archW(p);
  float r = rockD(p);
  mat = ${MAT.rock}.0;
  float d = r;
  if (p.z > ZC + 25.0 && p.z < ZC + 110.0 && p.y < 62.0) {
    float dm = min(damD(p, w), pierD(p, w));
    if (dm < d) { d = dm; mat = ${MAT.concrete}.0; }
    float wt;
    float g = gateD(p, w, wt);
    if (g < d) { d = g; mat = ${MAT.steel}.0; }
    if (wt < d) { d = wt; mat = ${MAT.crest}.0; }
  }
  return d;
}
float mapD(vec3 p) { float m; return map(p, m); }
vec3 normalAt(vec3 p, float t) {
  float e = 0.004 * t + 0.01;
  vec2 k = vec2(1.0, -1.0);
  return normalize(k.xyy * mapD(p + k.xyy * e) + k.yyx * mapD(p + k.yyx * e) + k.yxy * mapD(p + k.yxy * e) + k.xxx * mapD(p + k.xxx * e));
}
float march(vec3 ro, vec3 rd, float far, out float mat) {
  float t = 0.5;
  mat = -1.0;
  for (int i = 0; i < 400; i++) {
    if (i >= uSteps) break;
    vec3 p = ro + rd * t;
    float m;
    float d = map(p, m);
    if (d < 0.0015 * t) { mat = m; return t; }
    t += d * 0.6;
    if (t > far) break;
  }
  return far;
}
float shadow(vec3 p, vec3 n) {
  float s = 1.0, t = 0.6;
  vec3 ro = p + n * 0.3;
  for (int i = 0; i < 56; i++) {
    float h = mapD(ro + uSun * t);
    s = min(s, 10.0 * h / t);
    if (s < 0.0) break;
    t += clamp(h * 0.8, 0.4, 9.0);
    if (t > 260.0) break;
  }
  return smoothstep(0.0, 1.0, s);
}
float occl(vec3 p, vec3 n) {
  float o = 0.0, sc = 1.0;
  for (int i = 1; i <= 5; i++) {
    float h = 0.6 * float(i);
    o += (h - mapD(p + n * h)) * sc;
    sc *= 0.7;
  }
  return clamp(1.0 - o * 0.22, 0.0, 1.0);
}
// Dry and wet albedo for a hit, plus a sheen weight for the wet look.
void albedo(vec3 p, vec3 n, float mat, out vec3 dry, out vec3 wet) {
  if (mat == ${MAT.concrete}.0) {
    vec3 c = vec3(0.6, 0.58, 0.54);
    // Lift lines every 1.5 m and block joints every 14 m.
    float lift = smoothstep(0.06, 0.0, abs(fract(p.y / 1.5) - 0.5) - 0.44);
    float joint = smoothstep(0.12, 0.0, abs(fract((p.x + 3.55) / 14.2) - 0.5) - 0.49);
    c *= 1.0 - 0.07 * lift - 0.12 * joint;
    c *= 0.86 + 0.22 * n3(p * vec3(0.5, 0.08, 0.5));
    // Dark tide streaks run down the face under each bay.
    float bayish = smoothstep(SPAN + 1.0, SPAN - 1.0, abs(p.x));
    c *= 1.0 - 0.25 * bayish * smoothstep(SILL, 10.0, p.y) * n3(vec3(p.x * 1.7, p.y * 0.05, 2.0));
    dry = c;
    wet = c * vec3(0.42, 0.44, 0.44);
  } else if (mat == ${MAT.steel}.0) {
    dry = vec3(0.2, 0.27, 0.27) * (0.85 + 0.3 * n3(p * vec3(2.0, 0.6, 2.0)));
    wet = dry * 0.6;
  } else if (mat == ${MAT.crest}.0) {
    dry = vec3(0.04, 0.09, 0.08);
    wet = dry;
  } else {
    float v = n3(p * 0.09) * 0.5 + n3(p * 0.6) * 0.3 + n3(p * 2.1) * 0.2;
    vec3 c = mix(vec3(0.36, 0.3, 0.24), vec3(0.52, 0.45, 0.36), v);
    // Dark streaks where rain runs down the walls.
    c = mix(c, vec3(0.2, 0.19, 0.18), 0.7 * smoothstep(0.55, 0.85, n3(p * vec3(0.45, 0.025, 0.45))));
    // Scrub on the ledges that face up.
    float scrub = smoothstep(0.55, 0.85, n.y) * smoothstep(6.0, 14.0, p.y) * smoothstep(0.3, 0.6, n3(p * 0.35));
    c = mix(c, vec3(0.13, 0.17, 0.07), scrub);
    // A dark band where the pool has wetted the foot of the walls.
    c *= 1.0 - 0.45 * smoothstep(2.5, 0.0, p.y);
    dry = c;
    wet = c * vec3(0.4, 0.42, 0.42);
  }
}
${SKY}
vec3 skyAt(vec3 d) {
  return skDusk(d, uSun, uSkyCol, uSkyCol * vec3(1.25, 1.12, 0.95), vec3(1.0, 0.78, 0.55), uSkyCol * vec3(1.05, 1.08, 1.1));
}
vec3 light(vec3 p, vec3 n, vec3 rd, vec3 alb, float sh, float ao, float gloss) {
  float dif = max(dot(n, uSun), 0.0) * sh;
  vec3 col = alb * (uSunCol * dif + uSkyCol * (0.24 + 0.4 * n.y) * ao * 0.62);
  // Warm light thrown back from the sunlit wall.
  col += alb * vec3(0.35, 0.24, 0.14) * 0.28 * ao * max(-n.x * 0.6 + 0.4, 0.0);
  if (gloss > 0.0) {
    vec3 h = normalize(uSun - rd);
    float fr = 0.04 + 0.96 * pow(1.0 - max(dot(n, -rd), 0.0), 5.0);
    col += uSunCol * pow(max(dot(n, h), 0.0), 90.0) * sh * gloss * 0.35;
    col += skyAt(reflect(rd, n)) * fr * gloss * ao;
  }
  return col;
}
void main() {
  vec3 rd = rayDir(gl_FragCoord.xy);
  float mat;
  float t = march(uCam, rd, uFar, mat);
  // The pool is the plane y = 0.
  float tp = rd.y < 0.0 ? -uCam.y / rd.y : 1e9;
  if (tp < t) {
    vec3 p = uCam + rd * tp;
    // Reflection: march the mirrored ray, light it without shadow.
    vec3 rr = reflect(rd, vec3(0.0, 1.0, 0.0));
    float m2;
    float t2 = march(p + rr * 0.1, rr, 400.0, m2);
    vec3 refl;
    if (m2 < 0.0) refl = skyAt(rr);
    else {
      vec3 q = p + rr * t2, nq = normalAt(q, t2), dq, wq;
      albedo(q, nq, m2, dq, wq);
      refl = light(q, nq, rr, mix(dq, wq, 0.5), 0.55 + 0.45 * step(0.0, nq.x), 0.8, 0.0);
      refl = mix(refl, skyAt(rr) * 0.9, 1.0 - exp(-t2 * 0.003));
    }
    // The body: deep green, a little sun scatter under the surface.
    float sh = shadow(p, vec3(0.0, 1.0, 0.0));
    vec3 body = vec3(0.008, 0.04, 0.036) + vec3(0.015, 0.06, 0.05) * sh * uSunCol * 0.4;
    o0 = vec4(body, tp);
    o1 = vec4(refl, ${MAT.pool}.0);
    o2 = vec4(sh, 1.0, 0.0, 0.0);
    return;
  }
  if (mat < 0.0) {
    o0 = vec4(skyAt(rd), 1e4);
    o1 = vec4(0.0);
    o2 = vec4(1.0, 1.0, 0.0, 0.0);
    return;
  }
  vec3 p = uCam + rd * t;
  vec3 n = normalAt(p, t);
  float sh = shadow(p, n), ao = occl(p, n);
  vec3 dry, wet;
  albedo(p, n, mat, dry, wet);
  vec3 cDry = light(p, n, rd, dry, sh, ao, mat == ${MAT.steel}.0 ? 0.15 : 0.0);
  vec3 cWet = light(p, n, rd, wet, sh, ao, 0.7);
  // A NaN here would bloom into a white speck.
  if (any(isnan(cDry)) || any(isnan(cWet))) { cDry = cWet = vec3(0.0); }
  o0 = vec4(cDry, t);
  o1 = vec4(cWet, mat);
  o2 = vec4(sh, ao, n.y, n.x);
}`;

/* ---------- Mist: spray marched at half size ---------- */
export const MIST = /* glsl */`${HEAD}
out vec4 outC;
uniform sampler2D uG0;
uniform vec2 uGRes;
uniform float uAmt, uTop, uReach, uCx, uWide, uRise, uDrift;
uniform int uMSteps;

// Sun past the right wall: the sun ray must clear its rim.
float sunVis(vec3 p) {
  float s = (30.0 - p.x) / max(uSun.x, 0.05);
  float y = p.y + s * uSun.y;
  float z = p.z + s * uSun.z;
  float rim = 66.0 + 18.0 * n3(vec3(z * 0.015, 3.1, 7.0));
  return smoothstep(-5.0, 5.0, y - rim);
}
float density(vec3 p) {
  float dz = toeZ(p.x) - p.z;
  if (dz < -2.0) return 0.0;
  float lat = exp(-sq((p.x - uCx) / (uWide + 6.0 + max(dz, 0.0) * 0.35)));
  float h = smoothstep(uTop + 6.0, uTop - 14.0, p.y);
  // A curtain climbs the face; a thinner veil drifts down the gorge.
  float curtain = exp(-max(dz, 0.0) / 9.0) * h;
  float veil = exp(-max(dz, 0.0) / uReach) * h * 0.3;
  // A dense boil sits low at the foot of the dam.
  float boil = exp(-max(dz, 0.0) / 14.0) * exp(-p.y / 10.0) * 2.2;
  float nn = fbm3(p * 0.06 + vec3(uDrift * 0.3, -uRise, uDrift), 3);
  return uAmt * lat * (curtain + veil + boil) * smoothstep(0.34, 0.7, nn + 0.06);
}
// The rainbow: about 42 degrees from the point opposite the sun.
vec3 bow(vec3 rd) {
  float th = degrees(acos(clamp(dot(rd, -uSun), -1.0, 1.0)));
  vec3 b = vec3(exp(-sq((th - 42.0) / 0.6)), exp(-sq((th - 41.1) / 0.6)), exp(-sq((th - 40.2) / 0.6)));
  b += vec3(0.18) * smoothstep(40.5, 36.0, th) * smoothstep(25.0, 34.0, th);
  b += 0.14 * vec3(exp(-sq((th - 50.6) / 0.8)), exp(-sq((th - 51.8) / 0.8)), exp(-sq((th - 53.0) / 0.8)));
  return b;
}
void main() {
  if (uAmt < 0.002) { outC = vec4(0.0, 0.0, 0.0, 1.0); return; }
  vec3 rd = rayDir(gl_FragCoord.xy);
  vec2 g = gl_FragCoord.xy / uRes;
  float depth = texture(uG0, g).a;
  // March only through the spray box: from the plume's far edge to the dam.
  float zNear = toeZ(0.0) - 3.0 * max(uReach, 14.0);
  float t0 = rd.z > 0.01 ? max(0.0, (zNear - uCam.z) / rd.z) : 0.0;
  float t1 = min(depth, rd.z > 0.01 ? (toeZ(0.0) + 3.0 - uCam.z) / rd.z : 240.0);
  if (rd.y > 0.0) t1 = min(t1, (uTop + 8.0 - uCam.y) / rd.y);
  if (t1 <= t0) { outC = vec4(0.0, 0.0, 0.0, 1.0); return; }
  float n = float(uMSteps);
  float dt = (t1 - t0) / n;
  float jit = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));
  vec3 rb = bow(rd) * 0.7;
  vec3 sum = vec3(0.0);
  float T = 1.0;
  for (int i = 0; i < 32; i++) {
    if (i >= uMSteps) break;
    vec3 p = uCam + rd * (t0 + dt * (float(i) + jit));
    float d = density(p);
    if (d <= 0.001) continue;
    // One step toward the sun shades the far side of each billow.
    float ds = density(p + uSun * 5.0);
    float lit = sunVis(p) * exp(-ds * 0.75);
    vec3 sc = uSunCol * lit * (0.55 + rb) + vec3(0.6, 0.66, 0.75) * (0.85 + 0.25 * exp(-d * 0.6));
    float a = 1.0 - exp(-d * dt * 0.1);
    sum += T * a * sc;
    T *= 1.0 - a;
    if (T < 0.02) break;
  }
  outC = vec4(sum, T);
}`;

/* ---------- Shade: one frame of light, water and drips ---------- */
export const SHADE = /* glsl */`${HEAD}
out vec4 outC;
uniform sampler2D uG0, uG1, uG2, uMist;
uniform float uTime, uFlow[5], uWet[5], uFoam, uFoamRun, uSpray, uCloudT;
uniform vec4 uDrop[24];
uniform int uDrops;
${SKY}
vec3 skyAt(vec3 d) {
  return skDusk(d, uSun, uSkyCol, uSkyCol * vec3(1.25, 1.12, 0.95), vec3(1.0, 0.78, 0.55), uSkyCol * vec3(1.05, 1.08, 1.1));
}
// The sheet on the face: returns colour and cover.
vec4 sheet(vec3 p, vec3 rd, vec3 under, float sh) {
  float s = max(SILL - p.y, 0.0);
  float best = 0.0, white = 0.0, glint = 0.0, str = 0.5;
  for (int i = 0; i < 5; i++) {
    float q = uFlow[i];
    if (q < 0.0005) continue;
    float lx = p.x - bayX(i);
    // Sheets spread as they fall; their outer edges fray.
    float hw = BAYH + s * 0.06 * sqrt(q) + (n3(vec3(p.x * 0.7, s * 0.12 - uTime * 1.5, float(i))) - 0.5) * s * 0.05;
    if (abs(lx) > hw + 0.6) continue;
    float edge = smoothstep(hw + 0.35, hw - 0.35, abs(lx));
    // Fall time from the sill: features ride the water and stretch as it speeds up.
    float v0 = 1.0 + 5.0 * q;
    float v = sqrt(v0 * v0 + 19.62 * s);
    float tau = (v - v0) / 9.81;
    // Small flows split into rivulets that keep their paths.
    float riv = n3(vec3(lx * 1.5 + float(i) * 13.0, s * 0.04, uTime * 0.04));
    float need = 0.78 * (1.0 - clamp(q * 3.5, 0.0, 1.0));
    float cov = edge * smoothstep(need - 0.04, need + 0.03, riv) * smoothstep(0.0, 0.012, q);
    float st = n3(vec3(lx * 2.4, (tau - uTime) * 6.0, float(i) * 3.1)) * 0.6
             + n3(vec3(lx * 6.5, (tau - uTime) * 15.0, 1.7 + float(i))) * 0.4;
    // The inception point: white water starts lower when the flow is large.
    float inc = 2.5 + 9.0 * q;
    float wt = smoothstep(inc * 0.4, inc * 1.6, s) * smoothstep(0.02, 0.18, q);
    // Pier wakes roughen the edges of each sheet.
    wt = max(wt, smoothstep(BAYH - 1.0, BAYH + 0.2, abs(lx)) * smoothstep(0.0, 6.0, s) * smoothstep(0.05, 0.3, q));
    if (cov > best) { best = cov; white = wt; str = st; glint = pow(st, 8.0); }
  }
  if (best <= 0.0) return vec4(0.0);
  vec3 glassy = under * vec3(0.45, 0.6, 0.55) + skyAt(reflect(rd, vec3(0.0, 0.2, -1.0))) * 0.08 + uSunCol * glint * sh * 0.9;
  vec3 foam = vec3(0.92, 0.94, 0.96) * (uSunCol * sh * 0.75 + vec3(0.62, 0.68, 0.78) * 1.25) * (0.72 + 0.45 * str);
  return vec4(mix(glassy, foam, clamp(white * (0.75 + 0.5 * str), 0.0, 1.0)), best);
}
// Falling drips: short bright streaks from the gate lips.
float drips(vec3 p, float px) {
  float s = SILL - p.y, a = 0.0;
  for (int i = 0; i < 24; i++) {
    if (i >= uDrops) break;
    vec4 d = uDrop[i];
    float age = uTime - d.y;
    if (age < 0.0) continue;
    float fall = 4.905 * age * age;
    float len = 9.81 * age * 0.045 + 0.25;
    float w = max(0.05, px * 0.9);
    float on = smoothstep(w, 0.0, abs(p.x - d.x)) * step(fall - len, s) * step(s, fall);
    a += on * d.z;
  }
  return a;
}
// Foam on the pool, pushed out from the foot of the dam.
float poolFoam(vec3 p, out float flow) {
  float dz = toeZ(p.x) - p.z;
  flow = 0.0;
  for (int i = 0; i < 5; i++) {
    float q = uFlow[i];
    float sx = (p.x - bayX(i)) / (4.0 + max(dz, 0.0) * 0.35);
    flow += q * exp(-sx * sx);
  }
  float reach = 6.0 + 26.0 * uFoam;
  float near = exp(-max(dz, 0.0) / reach);
  // Patches drift out from the dam; a finer lace breaks each one up.
  // One drift phase for the whole pool; a speed per pixel would shear the noise.
  vec2 adv = vec2(p.x, dz - uFoamRun);
  float warp = n3(vec3(adv * 0.08, uTime * 0.05)) * 4.0;
  float n = n3(vec3(adv * 0.16 + warp, uTime * 0.07));
  float fine = n3(vec3(adv * 0.9 + warp * 2.0, uTime * 0.2));
  float lace = smoothstep(0.42, 0.8, n) * (0.5 + 0.5 * fine) * (0.3 + 0.7 * near);
  // The boil: where the sheet strikes, the pool is all white water.
  float boil = smoothstep(4.0 + 16.0 * clamp(flow, 0.0, 1.0), 0.0, dz) * clamp(flow * 2.5, 0.0, 1.0);
  return clamp(max(boil * (0.75 + 0.35 * n), lace * near * clamp(flow * 1.8 + uFoam * 0.6, 0.0, 1.0)), 0.0, 1.0);
}
void main() {
  vec2 fc = gl_FragCoord.xy;
  ivec2 ip = ivec2(fc);
  vec3 rd = rayDir(fc);
  vec4 g0 = texelFetch(uG0, ip, 0), g1 = texelFetch(uG1, ip, 0), g2 = texelFetch(uG2, ip, 0);
  float t = g0.a, mat = floor(g1.a + 0.5);
  vec3 col;
  if (t > 9000.0) {
    col = g0.rgb;
    vec4 cl = skClouds(rd, uSun, uCloudT, 0.32, vec3(1.25, 1.12, 1.0) * uSunCol * 0.45, uSkyCol * 0.9);
    col = mix(col, cl.rgb, cl.a * 0.85);
  } else {
    vec3 p = uCam + rd * t;
    float sh = g2.x;
    float px = t * 2.0 * uTan.y / uRes.y;
    if (mat == ${MAT.pool}.0) {
      // Ripples: wind chop, rougher near the falling water.
      float flow;
      float foam = poolFoam(p, flow);
      float dz = toeZ(p.x) - p.z;
      float rough = 0.25 + 1.6 * flow * exp(-max(dz, 0.0) / 30.0);
      vec2 rp = p.xz * vec2(0.2, 0.12);
      float e = 0.6;
      float h0 = n3(vec3(rp, uTime * 0.35));
      vec2 grad = vec2(n3(vec3(rp + vec2(e, 0.0), uTime * 0.35)) - h0, n3(vec3(rp + vec2(0.0, e), uTime * 0.35)) - h0);
      vec2 off = grad * rough * vec2(0.015, 0.03);
      ivec2 jp = ivec2(fc + off * uRes);
      jp = clamp(jp, ivec2(0), ivec2(uRes) - 1);
      vec4 r1 = texelFetch(uG1, jp, 0);
      vec3 refl = floor(r1.a + 0.5) == ${MAT.pool}.0 ? r1.rgb : g1.rgb;
      // Churned water holds no clear mirror near the falls.
      float chaos = clamp(flow * 1.3 * exp(-max(dz, 0.0) / 40.0) + uFoam * 0.25, 0.0, 1.0);
      refl = mix(refl, vec3(0.42, 0.48, 0.56), chaos * 0.85);
      float cosi = clamp(-rd.y, 0.0, 1.0);
      float F = 0.02 + 0.98 * pow(1.0 - cosi, 5.0);
      // Rough water blurs its mirror, so the reflection dims.
      col = mix(g0.rgb, refl * 0.7, clamp(F * 1.1, 0.0, 1.0));
      // Drips landing at the toe: a ring each.
      for (int i = 0; i < 24; i++) {
        if (i >= uDrops) break;
        vec4 d = uDrop[i];
        float age = uTime - d.y - 3.03;
        if (age < 0.0 || age > 1.6) continue;
        vec2 c = vec2(d.x, toeZ(d.x) - 1.5);
        float rr = length((p.xz - c) * vec2(1.0, 0.6));
        col += uSkyCol * 0.25 * smoothstep(0.12, 0.0, abs(rr - age * 1.2)) * (1.0 - age / 1.6) * d.z;
      }
      vec3 foamCol = vec3(0.88, 0.91, 0.92) * (uSunCol * sh * 0.6 + vec3(0.62, 0.68, 0.78) * 1.15);
      // The pool mirrors the white falls as a soft smear.
      col += F * foamCol * 0.5 * clamp(flow, 0.0, 1.0) * exp(-max(dz, 0.0) / 45.0);
      col = mix(col, foamCol, foam * 0.92);
    } else {
      // Wetness: spray wets the walls near the foot; flow wets the face.
      float dz = toeZ(p.x) - p.z;
      float wet = uSpray * exp(-max(dz, 0.0) / 24.0) * smoothstep(42.0, 4.0, p.y);
      if (mat == ${MAT.concrete}.0 || mat == ${MAT.steel}.0) {
        float sp = 0.0;
        for (int i = 0; i < 5; i++) {
          float lx = abs(p.x - bayX(i));
          sp = max(sp, uWet[i] * smoothstep(BAYH + 1.6 + (SILL - p.y) * 0.05, BAYH - 0.4, lx));
        }
        wet = max(wet, sp * step(p.y, SILL + 0.8));
      }
      wet = max(wet, smoothstep(2.0, 0.0, p.y) * 0.6);
      col = mix(g0.rgb, g1.rgb, clamp(wet, 0.0, 1.0));
      if (mat == ${MAT.concrete}.0 && p.y < SILL + 0.6 && abs(p.x) < 24.0) {
        // A drying film still slides down the face in glints.
        float film = pow(n3(vec3(p.x * 3.0, p.y * 0.25 + uTime * 0.9, 4.0)), 10.0) * 3.0;
        col += uSunCol * film * sh * clamp(wet - 0.1, 0.0, 1.0) * 0.05;
        vec4 sw = sheet(p, rd, g1.rgb, sh);
        col = mix(col, sw.rgb, sw.a);
        col += (uSunCol * sh * 0.8 + uSkyCol * 1.2) * clamp(drips(p, px), 0.0, 1.0);
      }
      if (mat == ${MAT.crest}.0) {
        // The tongue under a gate: glassy, fast, dark green.
        float st = n3(vec3(p.x * 2.0, p.y * 0.8 - uTime * 3.0, 0.0));
        col = g1.rgb + skyAt(reflect(rd, vec3(0.0, 0.5, -0.86))) * 0.12 + uSunCol * pow(st, 6.0) * sh * 0.5;
      }
    }
    // Gorge haze: blue in the shade, a touch of sun far off.
    vec3 haze = uSkyCol * 1.1 + uSunCol * 0.05;
    col = mix(col, haze, 1.0 - exp(-t * 0.0026));
  }
  // Five taps hide the march's dither at half size.
  vec2 mt = 1.0 / vec2(textureSize(uMist, 0)), mu = fc / uRes;
  vec4 m = texture(uMist, mu) * 0.4 + (texture(uMist, mu + mt * vec2(0.9, 0.6)) + texture(uMist, mu + mt * vec2(-0.6, 0.9))
         + texture(uMist, mu + mt * vec2(-0.9, -0.6)) + texture(uMist, mu + mt * vec2(0.6, -0.9))) * 0.15;
  col = col * m.a + m.rgb;
  if (any(isnan(col))) col = vec3(0.0);
  outC = vec4(col, 1.0);
}`;

/* ---------- Final: bloom, grade, film ---------- */
export const FINAL = /* glsl */`#version 300 es
precision highp float;
out vec4 outC;
uniform vec2 uRes;
uniform sampler2D uHdr, uBloom;
uniform float uExpo, uBloomK, uFrame;
${GRADE}
${OUTPUT}
void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  vec3 c = texture(uHdr, uv).rgb + texture(uBloom, uv).rgb * uBloomK;
  c = gdGrade(c, uv, uRes.x / uRes.y, gl_FragCoord.xy + uFrame * 7.0, vec3(0.004, 0.006, 0.008), 0.55, 0.4, 0.035);
  outC = vec4(ouFilmAces(c, uExpo, gl_FragCoord.xy + uFrame * 3.0), 1.0);
}`;
