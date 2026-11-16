// Tornado lab: one hero tornado up close, on a continuous F-scale slider.
// Raw WebGL2 on shared/gl.js. The tornado here replaces the shot's stand-in once Tom signs it off.
import { program, linked, target, free, tri, TRI_VS } from '../shared/gl.js';
import { GRADE } from '../shared/grade.js';
import { OUTPUT } from '../shared/output.js';

const canvas = /** @type {HTMLCanvasElement} */ (document.getElementById('c'));
const $ = id => /** @type {HTMLInputElement} */ (document.getElementById(id));
const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);

/* ---------- the F-scale table ---------- */
// Each look value per F level, F0 to F5; the slider reads between levels.
const TABLE = {
  r0: [10, 30, 75, 150, 290, 540],        // ground radius of the funnel, m
  flare: [6.0, 4.4, 3.0, 1.85, 1.3, 1.1],  // radius at the base over radius at the ground
  prof: [3.0, 2.3, 1.5, 1.15, 1.0, 0.9],  // where the flare starts: high is late, low is early
  vmax: [32, 45, 62, 82, 105, 130],       // peak wind, m/s
  cond: [0.55, 0.8, 1, 1, 1, 1],           // how far the condensation reaches down
  debris: [0.15, 0.35, 0.6, 0.85, 1, 1],
  dustH: [40, 90, 160, 260, 380, 480],     // debris cloud height, m
  multi: [0, 0, 0, 0.5, 1, 1],             // satellite vortices
  rain: [0, 0, 0, 0.15, 0.55, 0.8],        // rain wrapped round the funnel
  dark: [0, 0.1, 0.3, 0.55, 0.75, 0.88],
  lean: [430, 260, 120, 60, 25, 10],       // top offset, m
  sway: [90, 60, 35, 20, 10, 5],
};
const NAMES = ['rope', 'narrow', 'cone', 'wide cone', 'stovepipe', 'wedge'];
const at = (k, f) => { const t = TABLE[k], i = Math.min(4, Math.floor(f)), u = clamp(f - i); return t[i] + (t[i + 1] - t[i]) * u; };

/* ---------- shaders ---------- */
const SCENE_FS = /* glsl */`#version 300 es
precision highp float;
precision highp sampler3D;
in vec2 vUv;
out vec4 outC;
uniform sampler3D tNoise;
uniform sampler2D tPrev;
uniform vec2 uRes, uJit;
uniform float uTime, uFoc, uHz, uDist, uBlend, uSpin, uAmp, uFk;
uniform int uSteps;
uniform vec3 uSun, uSunCol, uAmb;
// The tornado: see the table in lab.js.
uniform float uH, uR0, uFlare, uProf, uVmax, uCond, uDebris, uDustH, uMulti, uRain, uDark, uLean, uSway;
const float CAMH = 1.7;

float N(vec3 p) { return texture(tNoise, p).r; }
const mat3 ROT = mat3(0.00, 0.80, 0.60, -0.80, 0.36, -0.48, -0.60, -0.48, 0.64);
float fbm(vec3 p, int o) {
  float s = 0.0, a = 0.5, n = 0.0;
  for (int i = 0; i < 5; i++) {
    if (i >= o) break;
    s += a * N(p); n += a;
    p = ROT * p * 2.03; a *= 0.5;
  }
  return s / n;
}
float hash(vec2 p) { vec3 q = fract(p.xyx * 0.1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }

/* ---------- the vortex ---------- */
// The axis: a lean toward the right and a slow sway, both strongest for ropes.
vec2 axisAt(float h) {
  float u = clamp(h / uH, 0.0, 1.0);
  vec2 o = vec2(uLean, -0.3 * uLean) * u * u;
  o += vec2(sin(u * 3.0 + uTime * 0.23), cos(u * 2.3 + uTime * 0.19)) * uSway * u * (0.4 + u);
  return o;
}
// The funnel's radius at a height; the last stretch spreads into the wall cloud.
float radiusAt(float h) {
  float u = clamp(h / uH, 0.0, 1.0);
  return uR0 * mix(1.0, uFlare, pow(u, uProf)) * (1.0 + 0.15 * smoothstep(0.85, 1.0, u));
}
// Spinning noise without wind-up: two layers on a 3 s cycle, each reset while the other shows.
// The spin follows a Rankine vortex: solid inside R, falling off as R over r outside.
float spinNoise(vec2 q, float h, float r, float R, float sc, int oct, float vmul, float seed) {
  float v = uVmax * vmul * (r < R ? r / R : R / r);
  float om = v / max(r, 1.0) * uSpin;
  float up = v * 0.3 * uSpin;
  const float P = 3.0;
  float ph = uTime / P;
  float f1 = fract(ph), f2 = fract(ph + 0.5);
  float w = abs(1.0 - 2.0 * f1);
  float a1 = -om * f1 * P, a2 = -om * f2 * P;
  vec2 q1 = mat2(cos(a1), sin(a1), -sin(a1), cos(a1)) * q;
  vec2 q2 = mat2(cos(a2), sin(a2), -sin(a2), cos(a2)) * q;
  vec3 s = vec3(1.0 / sc, 1.0 / (sc * 1.8), 1.0 / sc);
  float n1 = fbm(vec3(q1.x, h - up * f1 * P, q1.y) * s + seed, oct);
  float n2 = fbm(vec3(q2.x, h - up * f2 * P, q2.y) * s + seed + 0.5, oct);
  return mix(n1, n2, w);
}
// The wall's noise: bands that wind round the funnel, long around and short in height.
// Two spin layers on the same 3 s cycle as spinNoise, sampled on a circle so they tile round.
float wallNoise(vec2 q, float h, float r, float R) {
  float om = uVmax / max(R, 4.0) * uSpin;
  float up = uVmax * 0.3 * uSpin;
  const float P = 3.0;
  float ph = uTime / P, f1 = fract(ph), f2 = fract(ph + 0.5), w = abs(1.0 - 2.0 * f1);
  float ang = atan(q.y, q.x);
  // A helix: the bands climb as they wind.
  float hz = h / max(R * 0.55, 6.0);
  float a1 = ang - om * f1 * P + hz * 0.35, a2 = ang - om * f2 * P + hz * 0.35;
  float rr = 1.3;
  vec3 c1 = vec3(cos(a1) * rr, (h - up * f1 * P) / max(R * 0.55, 6.0), sin(a1) * rr);
  vec3 c2 = vec3(cos(a2) * rr, (h - up * f2 * P) / max(R * 0.55, 6.0), sin(a2) * rr);
  // Ten bands per funnel radius of height, three octaves, plus soft lumps across them.
  vec3 s = vec3(1.0, 0.9, 1.0) * 0.16;
  float n1 = fbm(c1 * s, 2) * 0.7 + N(c1 * vec3(0.5, 0.06, 0.5) + 4.0) * 0.3;
  float n2 = fbm(c2 * s + vec3(0.37, 0.0, 0.21), 2) * 0.7 + N(c2 * vec3(0.5, 0.06, 0.5) + 4.7) * 0.3;
  return mix(n1, n2, w);
}
// The length a ray runs inside an upright cylinder round the origin; x is where it enters.
vec2 cylinder(vec3 ro, vec3 rd, float r, float y0, float y1) {
  float A = dot(rd.xz, rd.xz), B = dot(ro.xz, rd.xz), C = dot(ro.xz, ro.xz) - r * r, D = B * B - A * C;
  if (D < 0.0 || A < 1e-8) return vec2(0.0);
  float s = sqrt(D), t0 = (-B - s) / A, t1 = (-B + s) / A;
  float a0 = (y0 - ro.y) / rd.y, a1 = (y1 - ro.y) / rd.y;
  if (rd.y < 0.0) { float k = a0; a0 = a1; a1 = k; }
  t0 = max(max(t0, a0), 0.0); t1 = min(t1, a1);
  return t1 > t0 ? vec2(t0, t1 - t0) : vec2(0.0);
}
// Debris cloud radius at a height.
float debrisR(float h) { return uR0 * mix(2.2, 1.18, uFk) * (1.0 + 0.6 * h / uDustH) + 20.0; }

// The condensation funnel as a signed distance in metres: negative inside.
// A turbulent wall, a ragged lower edge, a top lost in the base, and satellite tubes.
// n returns the wall's noise, for shading.
float condS(vec3 p, out float n) {
  float h = p.y, u = h / uH;
  vec2 q = p.xz - axisAt(h);
  float r = length(q), R = radiusAt(h);
  n = 0.5;
  // Far from the wall, a cheap bound does.
  if (r > R * 1.6 + 4.0) return r - R * 1.4;
  n = wallNoise(q, h, r, R);
  float S = r - R * (1.0 + uAmp * 0.8 * (n - 0.5));
  float hc = uH * (1.0 - uCond);
  S = max(S, hc - (h + (n - 0.5) * 0.35 * uH));
  // The top runs up into the base.
  S = max(S, (h + (n - 0.5) * 90.0) - (uH + 180.0));
  // Satellite vortices: thin tubes that orbit inside the debris of a violent tornado.
  if (uMulti > 0.01 && u < 0.55) {
    float om = uVmax / max(R, 1.0) * 0.55 * uSpin;
    for (int k = 0; k < 4; k++) {
      float a = float(k) * 1.5708 + uTime * om + float(k) * 0.7;
      vec2 cc = R * 0.62 * vec2(cos(a), sin(a));
      float rt = R * 0.12 * (1.0 + 0.6 * u) * uMulti * (1.0 - smoothstep(0.3, 0.55, u));
      float nk = N(vec3(q * 0.02, h * 0.01 - uTime * 0.6) + float(k));
      S = min(S, length(q - cc) * (0.8 + 0.4 * nk) - rt);
    }
  }
  return S;
}
// Debris and dust, and rain, as volumes.
void vol(vec3 p, out float d, out float w) {
  float h = p.y, u = h / uH;
  d = 0.0; w = 0.0;
  vec2 q = p.xz - axisAt(h);
  float r = length(q), R = radiusAt(h);
  // Debris and dust: wider, faster, billowing, low.
  float Rd = debrisR(h);
  if (h < uDustH * 1.8 && r < Rd * 1.3) {
    float nd = spinNoise(q, h, r, R, max(Rd * 0.3, 6.0), 4, 1.4, 7.3);
    float puff = smoothstep(0.42, 0.62, nd);
    d = uDebris * smoothstep(Rd, Rd * 0.3, r * (0.7 + 0.6 * nd)) * (1.0 - smoothstep(uDustH * 0.25, uDustH * 1.4, h + (nd - 0.5) * uDustH * 1.2)) * puff * 2.0;
  }
  // Rain wrapped round a big tornado, in falling streaks.
  if (uRain > 0.01) {
    float Rr = R * 1.15 + uR0 * 0.35;
    float ring = smoothstep(Rr * 0.22, 0.0, abs(r - Rr));
    if (ring > 0.0) {
      float ang = atan(q.y, q.x);
      float streak = N(vec3(cos(ang) * 3.0, sin(ang) * 3.0, h * 0.0015 + uTime * 0.5) + 3.0);
      w = uRain * ring * smoothstep(0.3, 0.8, streak) * (1.0 - smoothstep(0.75, 1.0, u));
    }
  }
}
// Condensation only, cheap: for the shadow rays.
float shadowDens(vec3 p) {
  vec2 q = p.xz - axisAt(p.y);
  float r = length(q), R = radiusAt(p.y);
  float c = smoothstep(R * 1.05, R * 0.9, r) * step(uH * (1.0 - uCond), p.y) * step(p.y, uH);
  float Rd = debrisR(p.y);
  // The dust's shade fades out with height, so no line shows on the wall.
  float d = uDebris * smoothstep(Rd, Rd * 0.3, r) * 0.6 * (1.0 - smoothstep(uDustH * 0.4, uDustH * 1.3, p.y));
  return c * 0.09 + d * 0.012;
}

/* ---------- the world round it ---------- */
// The base: a dark ceiling, lowered into a wall cloud round the tornado.
float baseAt(vec2 xz) {
  float r = length(xz - axisAt(uH));
  float wallR = max(900.0, uR0 * 3.2);
  float hb = uH + 220.0 - 220.0 * (1.0 - smoothstep(wallR * 0.6, wallR * 1.5, r));
  float ang = atan(xz.y, xz.x) + uTime * 0.04 * (1.0 - smoothstep(wallR, wallR * 3.0, r));
  hb += (fbm(vec3(cos(ang) * r, 0.0, sin(ang) * r) * 0.0012 + 2.0, 3) - 0.5) * 120.0;
  return hb;
}
vec3 skyCol(vec3 rd) {
  // Under the base: a bright strip of far clear air at the horizon, dark above.
  float up = max(rd.y, 0.0);
  vec3 hor = uSunCol * vec3(0.16, 0.13, 0.11) + uAmb * 0.25;
  vec3 high = uAmb * vec3(0.12, 0.13, 0.15);
  return mix(hor, high, smoothstep(0.0, 0.08, up));
}
vec3 baseCol(vec3 P, vec3 rd) {
  vec2 q = P.xz - axisAt(uH);
  float r = length(q);
  // The base turns round the tornado: slowly far out, faster in the wall cloud.
  float ang = atan(q.y, q.x) + uTime * 0.05 * uSpin * (1.0 - smoothstep(600.0, 3000.0, r));
  vec2 qr = r * vec2(cos(ang), sin(ang));
  // Broad soft lumps; the fine octaves alias at this distance.
  float n = fbm(vec3(qr.x, P.y * 2.0, qr.y) * 0.0006 + 3.0, 3);
  float m = fbm(vec3(qr.x, 0.0, qr.y) * 0.0002 + 9.0, 2);
  vec3 c = uAmb * vec3(0.16, 0.165, 0.17) * (0.35 + 1.3 * n * (0.6 + 0.8 * m));
  // The low sun skims under the base and lights the lumps that face it.
  c += uSunCol * vec3(0.06, 0.045, 0.032) * smoothstep(0.45, 0.75, n);
  // The wall cloud hangs darker round the funnel.
  float wallR = max(900.0, uR0 * 3.2);
  c *= mix(0.55, 1.0, smoothstep(wallR * 0.5, wallR * 1.5, r));
  return c;
}
vec3 groundCol(vec3 P, float t) {
  float n = fbm(vec3(P.x * 0.01, 0.0, P.z * 0.03), 3);
  vec3 alb = mix(vec3(0.3, 0.2, 0.08), vec3(0.5, 0.37, 0.15), n);
  // Wind sheen over the wheat.
  float g = smoothstep(0.5, 0.8, N(vec3(P.x * 0.004 - uTime * 0.03, 0.3, P.z * 0.008)));
  alb = mix(alb, vec3(0.55, 0.47, 0.3), g * 0.4);
  return alb * (uSunCol * 0.5 + uAmb * 0.5);
}

void main() {
  vec2 fc = gl_FragCoord.xy + uJit;
  float asp = uRes.x / uRes.y;
  vec2 s = vec2((fc.x / uRes.x - 0.5) * asp, fc.y / uRes.y - uHz);
  vec3 rd = normalize(vec3(s, -uFoc));
  vec3 ro = vec3(0.0, CAMH, uDist);
  // The background, and how far the volume may reach.
  vec3 bg;
  float tMax;
  if (rd.y < 0.0) {
    tMax = CAMH / -rd.y;
    vec3 P = ro + rd * tMax;
    bg = groundCol(P, tMax);
    bg = mix(bg, skyCol(vec3(rd.x, 0.0, rd.z)), 1.0 - exp(-tMax / 14000.0));
  } else {
    // The ceiling: refine the plane hit on the base height field.
    float t = (uH + 160.0 - ro.y) / max(rd.y, 1e-4);
    for (int i = 0; i < 4; i++) t = (baseAt((ro + rd * t).xz) - ro.y) / max(rd.y, 1e-4);
    tMax = t;
    vec3 P = ro + rd * t;
    bg = mix(baseCol(P, rd), skyCol(rd), 1.0 - exp(-t / 16000.0));
  }
  // The tornado: march through dust and rain, step by the funnel's distance, stop on its wall.
  float Rb = uR0 * max(uFlare * 1.6, 2.6) + uLean + uSway * 2.0 + 120.0;
  vec2 cy = cylinder(ro, rd, Rb, 0.0, uH + 240.0);
  vec3 acc = vec3(0.0);
  float T = 1.0;
  if (cy.y > 0.0) {
    float t0 = cy.x, t1 = min(cy.x + cy.y, tMax);
    float dtv = (t1 - t0) / float(uSteps);
    float t = t0 + dtv * hash(fc + fract(uTime * 7.31) * 113.0);
    float tPrev = t;
    vec3 amb0 = uAmb;
    for (int i = 0; i < 260; i++) {
      if (t > t1 || T < 0.015) break;
      vec3 p = ro + rd * t;
      float n;
      float S = condS(p, n);
      if (S < 0.0) {
        // Refine the wall between the last two steps.
        float ta = tPrev, tb = t, nn;
        for (int k = 0; k < 4; k++) { float tm = 0.5 * (ta + tb); if (condS(ro + rd * tm, nn) < 0.0) tb = tm; else ta = tm; }
        p = ro + rd * tb;
        float S0 = condS(p, n);
        // The normal from the field's slope.
        float e = max(radiusAt(p.y) * 0.04, 0.6);
        // Four taps on a tetrahedron give the slope.
        const vec2 kk = vec2(1.0, -1.0);
        vec3 nrm = normalize(kk.xyy * condS(p + kk.xyy * e, nn) + kk.yyx * condS(p + kk.yyx * e, nn) + kk.yxy * condS(p + kk.yxy * e, nn) + kk.xxx * condS(p + kk.xxx * e, nn));
        float u = clamp(p.y / uH, 0.0, 1.0);
        // Light from the low sun, through the funnel and its dust.
        float R = radiusAt(p.y), Ls = max(R * 0.5, 6.0), od = 0.0;
        for (int k = 0; k < 4; k++) od += shadowDens(p + nrm * e * 2.0 + uSun * Ls * (float(k) + 0.5)) * Ls;
        float sunT = exp(-od);
        float diff = clamp(dot(nrm, uSun) * 0.8 + 0.2, 0.0, 1.0) * sunT;
        // Crevices between the bands stay dark.
        float ao = 0.35 + 0.65 * smoothstep(0.25, 0.75, n);
        vec3 alb = vec3(0.6, 0.62, 0.66) * mix(1.0, 0.07, uDark);
        alb = mix(alb, vec3(0.4, 0.32, 0.24) * mix(1.0, 0.5, uDark), (1.0 - smoothstep(0.0, 0.35, u)) * uDebris);
        alb *= 0.85 + 0.3 * n;
        // A violent tornado stands in its own rain and dirt: less sun reaches its wall.
        vec3 col = alb * (uSunCol * diff * 0.75 * (1.0 - 0.75 * uDark) + amb0 * (0.25 + 0.35 * u) * (0.6 + 0.4 * nrm.y) * ao);
        acc += T * col;
        T = 0.0;
        break;
      }
      // The fringe: thin mist just outside the wall, so its edge is soft.
      float fr = max(radiusAt(p.y) * 0.18, 2.0);
      if (S < fr) {
        // Thinner on a wide funnel, so the fringe stays a soft edge, not a shell.
        float m = smoothstep(fr, 0.0, S) * 0.012 * min(1.0, 40.0 / max(radiusAt(p.y), 1.0));
        float u = clamp(p.y / uH, 0.0, 1.0);
        vec3 mc = vec3(0.6, 0.62, 0.66) * mix(1.0, 0.07, uDark) * (uSunCol * 0.35 + amb0 * (0.3 + 0.35 * u));
        float am = 1.0 - exp(-m * min(dtv, max(S * 0.6, 0.3)));
        acc += T * am * mc;
        T *= 1.0 - am;
      }
      // Dust and rain at this step.
      float d, w;
      vol(p, d, w);
      float sig = d * 0.014 + w * 0.0012;
      // Near the wall, step by its distance; elsewhere by the volume step.
      float st = min(dtv, max(S * 0.6, 0.3 + t * 0.0002));
      if (sig > 1e-5) {
        float u = clamp(p.y / uH, 0.0, 1.0);
        float R = radiusAt(p.y), Ls = max(R * 0.6, 8.0), od = 0.0;
        for (int k = 0; k < 3; k++) od += shadowDens(p + uSun * Ls * (float(k) + 0.5)) * Ls;
        vec3 lit = uSunCol * exp(-od);
        vec3 amb = amb0 * (0.25 + 0.35 * u);
        // Dirt from a violent tornado is dark: soil, wood, rain.
        vec3 dc = vec3(0.42, 0.32, 0.22) * mix(1.0, 0.35, uDark) * (lit * 0.5 * (1.0 - 0.6 * uDark) + amb * 0.8);
        vec3 wc = vec3(0.2, 0.22, 0.25) * (amb * 0.7 + lit * 0.05);
        vec3 col = (dc * d * 0.014 + wc * w * 0.0012) / sig;
        float a = 1.0 - exp(-sig * st);
        acc += T * a * col;
        T *= 1.0 - a;
      }
      tPrev = t;
      t += st;
    }
    // Air between the eye and the tornado.
    acc = mix(acc, skyCol(vec3(rd.x, 0.0, rd.z)) * (1.0 - T), 1.0 - exp(-uDist / 20000.0));
  }
  vec3 col = bg * T + acc;
  // A short history blend: steady frames lose their march noise.
  vec3 prev = texture(tPrev, gl_FragCoord.xy / uRes).rgb;
  outC = vec4(mix(prev, col, uBlend), 1.0);
}`;

const FINAL_FS = /* glsl */`#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outC;
uniform sampler2D tSrc;
uniform vec2 uRes;
uniform float uSeed;
${GRADE}
${OUTPUT}
void main() {
  vec3 c = texture(tSrc, vUv).rgb;
  c = gdGrade(c, vUv, uRes.x / uRes.y, gl_FragCoord.xy + vec2(uSeed * 37.0, uSeed * 91.0), vec3(0.0), 0.35, 0.4, 0.035);
  outC = vec4(ouFilm(c, 1.0, gl_FragCoord.xy), 1.0);
}`;

/* ---------- the noise volume ---------- */
// A 64 cube of value noise that tiles, smoothed twice, so trilinear lookups read as soft noise.
function noiseVolume(gl) {
  const S = 64, n = S * S * S;
  let a = new Float32Array(n), b = new Float32Array(n);
  let seed = 1234567;
  for (let i = 0; i < n; i++) { seed = (seed * 1664525 + 1013904223) >>> 0; a[i] = seed / 4294967296; }
  const idx = (x, y, z) => ((z & 63) * S + (y & 63)) * S + (x & 63);
  for (let pass = 0; pass < 2; pass++) for (const axis of [0, 1, 2]) {
    for (let z = 0; z < S; z++) for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const d = axis === 0 ? [1, 0, 0] : axis === 1 ? [0, 1, 0] : [0, 0, 1];
      b[idx(x, y, z)] = 0.25 * a[idx(x - d[0], y - d[1], z - d[2])] + 0.5 * a[idx(x, y, z)] + 0.25 * a[idx(x + d[0], y + d[1], z + d[2])];
    }
    [a, b] = [b, a];
  }
  // Stretch the smoothed values back to the full range.
  let lo = 1, hi = 0;
  for (let i = 0; i < n; i++) { lo = Math.min(lo, a[i]); hi = Math.max(hi, a[i]); }
  const bytes = new Uint8Array(n);
  for (let i = 0; i < n; i++) bytes[i] = Math.round(255 * (a[i] - lo) / (hi - lo));
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_3D, tex);
  gl.texImage3D(gl.TEXTURE_3D, 0, gl.R8, S, S, S, 0, gl.RED, gl.UNSIGNED_BYTE, bytes);
  for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.REPEAT], [gl.TEXTURE_WRAP_T, gl.REPEAT], [gl.TEXTURE_WRAP_R, gl.REPEAT]]) gl.texParameteri(gl.TEXTURE_3D, k, v);
  return tex;
}

/* ---------- start ---------- */
const gl = canvas.getContext('webgl2', { antialias: false, alpha: false });
if (!gl || !gl.getExtension('EXT_color_buffer_float')) {
  /** @type {HTMLElement} */ (document.querySelector('.fail')).hidden = false;
  throw new Error('WebGL2 with float targets is needed');
}
const P = await linked(gl, { scene: program(gl, TRI_VS, SCENE_FS), final: program(gl, TRI_VS, FINAL_FS) });
const vao = gl.createVertexArray();
const noise = noiseVolume(gl);

// The knobs. Each slider writes its value beside it.
const knob = id => {
  const el = $(id), out = el.parentElement.querySelector('output');
  const show = () => { if (out) out.textContent = (+el.value).toFixed(el.step < 1 ? 2 : 0); };
  el.addEventListener('input', show);
  show();
  return () => +el.value;
};
const K = { spin: knob('spin'), amp: knob('amp'), deb: knob('deb'), dist: knob('dist'), lens: knob('lens'), hour: knob('hour'), steps: knob('steps'), res: knob('res') };
const fEl = $('f');
let f = +fEl.value, fShown = f, morph = false, paused = false, simT = 0;
const showF = () => {
  $('fOut').value = `F${fShown.toFixed(1)}`;
  document.getElementById('fName').textContent = NAMES[Math.min(5, Math.round(fShown))];
};
fEl.addEventListener('input', () => { f = +fEl.value; morph = false; $('morph').setAttribute('aria-pressed', 'false'); });
const toggle = (id, set) => $(id).addEventListener('click', () => { const on = $(id).getAttribute('aria-pressed') !== 'true'; $(id).setAttribute('aria-pressed', String(on)); set(on); });
toggle('morph', on => { morph = on; });
toggle('pause', on => { paused = on; });
toggle('knobsBtn', on => document.getElementById('panel').classList.toggle('min', !on));
// QA and links: ?f=4.5, ?morph, ?t=12 (start time), ?still (no history blend).
const qs = new URLSearchParams(location.search);
if (qs.has('f')) { f = fShown = clamp(+qs.get('f'), 0, 5); fEl.value = String(f); }
if (qs.has('morph')) { morph = true; $('morph').setAttribute('aria-pressed', 'true'); }
if (qs.has('t')) simT = +qs.get('t');

// The sun: low behind the camera, a little to the left. Sun 0 is late afternoon, 1 is dusk.
function light(k) {
  // The sun swings well to the left, so the funnel shows a lit side and a shade side.
  const el = (14 - 12 * k) * Math.PI / 180, az = 1.05;
  const sun = [-Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)];
  const warm = 1 - 0.6 * k;
  const sunCol = [2.4, 2.4 * (0.62 + 0.25 * warm), 2.4 * (0.3 + 0.45 * warm * warm)].map(v => v * (1 - 0.55 * k));
  const amb = [0.2 + 0.1 * warm, 0.23 + 0.12 * warm, 0.3 + 0.12 * warm].map(v => v * (1 - 0.5 * k));
  return { sun, sunCol, amb };
}

let A = null, B = null, w = 0, h = 0, frame = 0, last = 0, fpsT = 0, fpsN = 0;
function size() {
  const dpr = Math.min(devicePixelRatio || 1, 2);
  const cw = Math.round(canvas.clientWidth * dpr), ch = Math.round(canvas.clientHeight * dpr);
  if (canvas.width !== cw || canvas.height !== ch) { canvas.width = cw; canvas.height = ch; }
  const rw = Math.max(64, Math.round(cw * K.res())), rh = Math.max(64, Math.round(ch * K.res()));
  if (rw !== w || rh !== h) {
    free(gl, A); free(gl, B);
    w = rw; h = rh;
    A = target(gl, w, h, { clear: true }); B = target(gl, w, h, { clear: true });
    frame = 0;
  }
}
const set = (prog, name, v) => {
  const u = prog.u[name];
  if (u == null) return;
  if (typeof v === 'number') gl.uniform1f(u, v);
  else if (v.length === 2) gl.uniform2fv(u, v);
  else gl.uniform3fv(u, v);
};
function draw(now) {
  const dt = last ? Math.min(0.05, (now - last) / 1000) : 0.016;
  last = now;
  if (!paused && !matchMedia('(prefers-reduced-motion: reduce)').matches) simT += dt;
  // Morph runs F0 to F5 and back over 40 s.
  if (morph && !paused) { f = 2.5 - 2.5 * Math.cos(simT * Math.PI / 20); fEl.value = String(f); }
  fShown += (f - fShown) * (1 - Math.exp(-dt / 0.35));
  showF();
  size();
  const fk = fShown;
  const L = light(K.hour());
  const sc = P.scene;
  gl.useProgram(sc.p);
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_3D, noise); gl.uniform1i(sc.u.tNoise, 0);
  gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, A.tex); gl.uniform1i(sc.u.tPrev, 1);
  set(sc, 'uRes', [w, h]);
  // Sub-pixel jitter each frame, for the history blend.
  set(sc, 'uJit', [((frame * 0.618) % 1) - 0.5, ((frame * 0.382) % 1) - 0.5]);
  set(sc, 'uTime', simT);
  const foc = K.lens() / 24 * Math.min(1, Math.sqrt((w / h) / 1.3));
  set(sc, 'uFoc', foc);
  set(sc, 'uHz', 0.381966);
  // The distance follows the lens: the base's edge sits near the top of the frame.
  set(sc, 'uDist', (850 + 160) * foc / 0.47 * K.dist());
  set(sc, 'uBlend', frame === 0 || qs.has('still') ? 1 : paused ? 0.12 : 0.22);
  set(sc, 'uSpin', K.spin());
  set(sc, 'uAmp', K.amp());
  set(sc, 'uFk', fk / 5);
  gl.uniform1i(sc.u.uSteps, K.steps());
  set(sc, 'uSun', L.sun); set(sc, 'uSunCol', L.sunCol); set(sc, 'uAmb', L.amb);
  set(sc, 'uH', 850);
  for (const [u, k] of [['uR0', 'r0'], ['uFlare', 'flare'], ['uProf', 'prof'], ['uVmax', 'vmax'], ['uCond', 'cond'], ['uDustH', 'dustH'], ['uMulti', 'multi'], ['uRain', 'rain'], ['uDark', 'dark'], ['uLean', 'lean'], ['uSway', 'sway']]) set(sc, u, at(k, fk));
  set(sc, 'uDebris', at('debris', fk) * K.deb());
  tri(gl, B, vao);
  const fn = P.final;
  gl.useProgram(fn.p);
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, B.tex); gl.uniform1i(fn.u.tSrc, 0);
  set(fn, 'uRes', [canvas.width, canvas.height]);
  set(fn, 'uSeed', frame % 997);
  tri(gl, null, vao);
  [A, B] = [B, A];
  frame++;
  fpsN++;
  if (now - fpsT > 1000) { document.getElementById('fps').textContent = `${Math.round(fpsN * 1000 / (now - fpsT))} fps · ${w}×${h}`; fpsT = now; fpsN = 0; }
  if (!document.hidden) requestAnimationFrame(draw);
}
document.addEventListener('visibilitychange', () => { if (!document.hidden) { last = 0; requestAnimationFrame(draw); } });
for (const id of ['res']) $(id).addEventListener('input', () => size());
requestAnimationFrame(draw);
window.__lab = { get f() { return fShown; }, set f(v) { f = fShown = v; } };
