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
// A smooth curve through the table (Catmull-Rom), held inside each step's two values so it never overshoots.
const at = (k, f) => {
  const t = TABLE[k], i = Math.min(4, Math.floor(f)), u = clamp(f - i);
  const p0 = t[Math.max(0, i - 1)], p1 = t[i], p2 = t[i + 1], p3 = t[Math.min(5, i + 2)];
  const v = 0.5 * (2 * p1 + (p2 - p0) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u * u + (3 * p1 - p0 - 3 * p2 + p3) * u * u * u);
  return Math.min(Math.max(p1, p2), Math.max(Math.min(p1, p2), v));
};
// The bands' height scale: it grows gently with the funnel, so a change of F barely stretches them.
const zScale = rRef => 28 * Math.sqrt(Math.max(rRef, 8) / 20);
let zsNow = 28;
// Each layer's spin angle and climb, summed frame by frame: 0 is the core, 1 to 5 the sheaths.
const phase = new Float32Array(12);
function spinLayers(dt, f, spin) {
  const r0 = at('r0', f), vmax = at('vmax', f);
  // The radius at mid height sets every layer's rate.
  const rRef = Math.max(4, r0 * (1 + (at('flare', f) - 1) * Math.pow(0.5, at('prof', f))));
  zsNow = zScale(rRef);
  for (let i = 0; i < 6; i++) {
    const rk = i === 0 ? 0.8 : 1 + 0.2 * (i - 1), fk = i === 0 ? 0 : (i - 1) / 4;
    const om = vmax / rRef * (rk < 1 ? 1 : 1 / (rk * rk)) * spin * (1 + 0.1 * i);
    const up = vmax * 0.35 * spin * (1 - 0.6 * fk) / zScale(rRef);
    phase[i * 2] = (phase[i * 2] + om * dt) % (Math.PI * 2);
    phase[i * 2 + 1] += up * dt;
  }
}

/* ---------- shaders ---------- */
const SCENE_FS = /* glsl */`#version 300 es
precision highp float;
precision highp sampler3D;
in vec2 vUv;
out vec4 outC;
uniform sampler3D tNoise;
uniform sampler2D tPrev;
uniform vec2 uRes, uJit;
uniform float uTime, uFoc, uHz, uDist, uBlend, uSpin, uAmp, uFk, uDbg;
uniform int uSteps;
uniform vec3 uSun, uSunCol, uAmb;
// The tornado: see the table in lab.js.
uniform float uH, uR0, uFlare, uProf, uVmax, uCond, uDebris, uDustH, uMulti, uRain, uDark, uLean, uSway;
// Spin angle and climb, per layer: 0 is the core, 1 to 5 the sheaths. lab.js integrates them each frame.
uniform vec2 uPh[6];
// The bands' height scale in metres: one value for the whole funnel, never the local radius.
uniform float uZs;
const float CAMH = 1.7;

// The volume holds 64 cells per unit: a sixteenth makes one unit four cells wide.
float N(vec3 p) { return texture(tNoise, p * 0.0625).r; }
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

/* ---------- the funnel: an onion of spinning sheaths ---------- */
// Five sheaths of noise round the axis, and a dense core inside them.
// Each sheath spins as one body at its own Rankine rate, so no texture winds up.
// Inner sheaths turn and climb fastest; outer ones lag, so the layers shear past each other.
const int SHEATHS = 5;
// A sheath's radius, over the funnel radius R: 1.0 to 1.8, with gaps between.
float sheathR(int k) { return 1.0 + 0.2 * float(k); }
// One sheath's noise, spun as one body. fk: 0 for the inner sheath, 1 for the outer.
// x is the radius over R: the noise varies through the sheath too, so no streak runs along a ray.
// The spin and the climb come in as integrated phases, so a new F or spin only changes speed.
float sheathN(float ang, float h, float x, float R, float rk, int idx, int oct) {
  vec2 ph = uPh[idx];
  // Height over the local radius stalls in the flare and smears the bands; uZs does not.
  float zz = h / uZs - ph.y;
  // The helix: the bands lean as they climb.
  float a = ang - ph.x - zz * 0.9;
  float rc = 1.4 + (x - rk) * 2.5;
  vec3 c = vec3(cos(a) * rc, zz * 1.1, sin(a) * rc) + float(idx) * 3.17;
  float n = fbm(c, oct);
  // Erosion: fine detail eats into the edges of each billow.
  return oct > 2 ? n - (1.0 - n) * N(c * 3.7 + 7.0) * 0.45 : n;
}
// Condensation density at p, 0 to about 2. u returns the height over the base.
// oct sets the noise detail: 4 for the view, 2 for the shadow rays.
float funnelD(vec3 p, out float u, int oct) {
  float h = p.y;
  u = h / uH;
  vec2 q = p.xz - axisAt(h);
  float r = length(q), R = radiusAt(h), x = r / R;
  if (x > 2.0) return 0.0;
  float ang = atan(q.y, q.x);
  // The core: the funnel body, its edge ragged by the inner sheath's noise.
  float nc = sheathN(ang, h, 0.8, R, 0.8, 0, oct);
  float edge = 0.9 + uAmp * 0.45 * (nc - 0.5);
  float d = smoothstep(edge, edge - 0.1, x) * 1.6;
  // The sheaths: thin layers of tattered cloud, each spinning at its own rate.
  for (int k = 0; k < SHEATHS; k++) {
    float rk = sheathR(k), fk = float(k) / float(SHEATHS - 1);
    // Thin sheaths with clear air between them: the onion's layers.
    float wk = exp(-pow((x - rk) / 0.085, 2.0));
    if (wk < 0.03) continue;
    float n = sheathN(ang, h, x, R, rk, k + 1, oct);
    // Outer sheaths show only their densest noise, so the edge stays wispy.
    float cov = mix(0.42, 0.6, fk);
    d += wk * smoothstep(cov, cov + 0.07, n) * mix(0.9, 0.35, fk);
  }
  // The ragged lower edge, which climbs and falls round the funnel; the top runs into the base.
  float hc = uH * (1.0 - uCond);
  float edgeH = hc + (fbm(vec3(cos(ang) * 0.6, h * 0.002 - uTime * 0.05, sin(ang) * 0.6) + 11.0, 2) - 0.5) * 0.4 * uH;
  d *= smoothstep(edgeH - 25.0, edgeH + 70.0, h) * (1.0 - smoothstep(uH * 0.96, uH + 170.0, h));
  return d;
}
// Extinction per metre for a density: thin funnels get denser, so a rope still reads.
float funnelSig(float d, float R) { return d * 7.0 / max(R, 5.0); }
// Henyey-Greenstein phase, scaled so that isotropic is 1.
float hg(float c, float g) { float g2 = g * g; return (1.0 - g2) / pow(1.0 + g2 - 2.0 * g * c, 1.5); }

// Debris and dust, and rain, as volumes.
void vol(vec3 p, out float d, out float w) {
  float h = p.y, u = h / uH;
  d = 0.0; w = 0.0;
  vec2 q = p.xz - axisAt(h);
  float r = length(q), R = radiusAt(h);
  // Debris and dust: wider, faster, billowing, low.
  float Rd = debrisR(h);
  if (h < uDustH * 1.8 && r < Rd * 1.3) {
    float nd = spinNoise(q, h, r, R, max(Rd * 0.22, 5.0), 5, 1.4, 7.3);
    // Erosion and a tight threshold give the dust billows with edges.
    nd -= (1.0 - nd) * N(vec3(q.x, h * 1.5, q.y) / max(Rd * 0.05, 2.0) + 5.0) * 0.35;
    float puff = smoothstep(0.42, 0.55, nd);
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
// Optical depth toward the sun: the funnel's mean shape and the dust, no noise.
float sunDepth(vec3 p, float R) {
  float Ls = max(R * 0.45, 4.0), od = 0.0;
  for (int k = 0; k < 4; k++) {
    vec3 s = p + uSun * Ls * (float(k) + 0.5);
    vec2 qs = s.xz - axisAt(s.y);
    float Rs = radiusAt(s.y), rs = length(qs);
    // The layers' mean shape, no noise: the core, then each sheath as a ring at its mean cover.
    float xs = rs / Rs, m = smoothstep(0.95, 0.75, xs) * 1.6;
    for (int j = 0; j < SHEATHS; j++) m += exp(-pow((xs - sheathR(j)) / 0.085, 2.0)) * mix(0.45, 0.12, float(j) / float(SHEATHS - 1));
    m *= step(uH * (1.0 - uCond), s.y) * step(s.y, uH + 100.0);
    float Rd = debrisR(s.y);
    float dd = uDebris * smoothstep(Rd, Rd * 0.3, rs) * 0.6 * (1.0 - smoothstep(uDustH * 0.4, uDustH * 1.3, s.y));
    od += (funnelSig(m, Rs) + dd * 0.012) * Ls;
  }
  return od;
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
  float n = fbm(vec3(qr.x, P.y * 2.0, qr.y) * 0.0006 + 3.0, 5);
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
  // The tornado: one volume march through the sheaths, the core, the dust and the rain.
  float Rb = uR0 * max(uFlare * 2.0, 2.6) + uLean + uSway * 2.0 + 140.0;
  vec2 cy = cylinder(ro, rd, Rb, 0.0, uH + 240.0);
  vec3 acc = vec3(0.0);
  float T = 1.0;
  if (cy.y > 0.0) {
    float t0 = cy.x, t1 = min(cy.x + cy.y, tMax);
    float dtv = (t1 - t0) / float(uSteps);
    float jit = hash(fc + fract(uTime * 7.31) * 113.0);
    float t = t0 + dtv * jit;
    float cosT = dot(rd, uSun);
    // Two lobes: some light bounces back toward the eye, most runs on.
    float ph0 = mix(hg(cosT, 0.6), hg(cosT, -0.25), 0.55);
    float ph1 = mix(hg(cosT, 0.3), hg(cosT, -0.1), 0.55);
    for (int i = 0; i < 240; i++) {
      if (t > t1 || T < 0.01) break;
      vec3 p = ro + rd * t;
      vec2 q = p.xz - axisAt(p.y);
      float r = length(q), R = radiusAt(p.y), Rout = R * 2.0 + 2.0;
      // Fine steps inside the funnel, long ones outside it.
      float fine = clamp(R * 0.045, 0.3, dtv);
      float st = r < Rout ? fine : min(dtv, max((r - Rout) * 0.8, fine));
      float u;
      float dc = r < Rout ? funnelD(p, u, 4) : 0.0;
      u = clamp(p.y / uH, 0.0, 1.0);
      float d, w;
      vol(p, d, w);
      float sc = funnelSig(dc, R), sd = d * 0.014, sw = w * 0.0012;
      float sig = sc + sd + sw;
      if (sig > 1e-6) {
        // Sunlight through the funnel and the dust, in three scattering octaves, each less shadowed.
        float od = sunDepth(p, R);
        vec3 sunL = uSunCol * (exp(-od) * ph0 + 0.5 * exp(-od * 0.4) * ph1 + 0.25 * exp(-od * 0.16)) * (1.0 - 0.6 * uDark);
        // Sky light falls off with depth into the funnel.
        float depth = max(0.0, 1.6 - r / R);
        vec3 ambL = uAmb * vec3(0.85, 0.95, 1.15) * (0.3 + 0.55 * u) * exp(-depth * 1.6);
        // Bounce from the sunlit wheat warms the lower funnel from below.
        ambL += uSunCol * vec3(0.55, 0.42, 0.22) * 0.07 * (1.0 - u) * exp(-depth * 1.2);
        vec3 alb = vec3(0.9, 0.91, 0.93) * mix(1.0, 0.1, uDark);
        alb = mix(alb, vec3(0.45, 0.36, 0.27) * mix(1.0, 0.45, uDark), (1.0 - smoothstep(0.0, 0.35, u)) * uDebris);
        vec3 cc = alb * (sunL * 0.7 + ambL * 0.85);
        vec3 dcol = vec3(0.42, 0.32, 0.22) * mix(1.0, 0.35, uDark) * (uSunCol * exp(-od) * 0.5 * (1.0 - 0.6 * uDark) + uAmb * (0.3 + 0.35 * u) * 0.8);
        vec3 wcol = vec3(0.2, 0.22, 0.25) * (uAmb * 0.7 + uSunCol * exp(-od) * 0.05);
        vec3 col = (cc * sc + dcol * sd + wcol * sw) / sig;
        float a = 1.0 - exp(-sig * st);
        acc += T * a * col;
        T *= 1.0 - a;
      }
      t += st;
    }
    // Under the storm the air is dim: its haze darkens as much as it lifts.
    acc = mix(acc, skyCol(vec3(rd.x, 0.0, rd.z)) * 0.45 * (1.0 - T), 1.0 - exp(-uDist / 30000.0));
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

// The knobs. Each slider writes its value beside it; ?lens=85 and the like set one from the address.
const knob = id => {
  const el = $(id), out = el.parentElement.querySelector('output');
  const pre = new URLSearchParams(location.search).get(id);
  if (pre !== null && pre !== '') el.value = pre;
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
  const moving = !paused && !matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (moving) simT += dt;
  // Morph runs F0 to F5 and back over 40 s.
  if (morph && !paused) { f = 2.5 - 2.5 * Math.cos(simT * Math.PI / 20); fEl.value = String(f); }
  // A slider jump eases over about three seconds, so it reads as a morph.
  fShown += (f - fShown) * (1 - Math.exp(-dt / 1.0));
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
  set(sc, 'uDbg', qs.has('dbg') ? +qs.get('dbg') || 1 : 0);
  set(sc, 'uSpin', K.spin());
  spinLayers(moving ? dt : 0, fShown, K.spin());
  gl.uniform2fv(sc.u.uPh, phase);
  set(sc, 'uZs', zsNow);
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
