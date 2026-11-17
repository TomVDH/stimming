// Tornado alley: the lab's tornado, for the scene's funnel pass.
// main.js runs the pass before the runner's passes; envScene composites its target.
// The GLSL is the lab's (tornado/lab.js) with the lab's storm, deck merge and bake left out.
// Each layer of the onion is a thin surface round the axis.
// The march takes coarse segments and integrates each layer in closed form.

const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);

/* ---------- the F-scale table ---------- */
// Each look value per F level, F0 to F5; a level between reads on a curve.
// It matches TABLE in tornado/lab.js.
export const TABLE = {
  r0: [10, 30, 75, 150, 290, 540],        // ground radius of the funnel, m
  flare: [6.0, 4.4, 3.0, 1.85, 1.3, 1.1],  // radius at the base over radius at the ground
  prof: [3.0, 2.3, 1.5, 1.15, 1.0, 0.9],  // where the flare starts: high is late, low is early
  vmax: [32, 45, 62, 82, 105, 130],       // peak wind, m/s
  cond: [0.65, 0.92, 1, 1, 1, 1],          // how far the condensation reaches down
  debris: [0.4, 0.55, 0.65, 0.85, 1, 1],    // a dust whirl at the foot even at F0
  dustH: [120, 150, 190, 260, 380, 480],   // debris cloud height, m
  rain: [0, 0, 0, 0.15, 0.55, 0.8],        // rain wrapped round the funnel
  dark: [0, 0.1, 0.3, 0.55, 0.75, 0.88],
  lean: [430, 260, 120, 60, 25, 10],       // top offset, m
  sway: [90, 60, 35, 20, 10, 5],
};
// The lab's approved knob values (Tom, 2026-11-16).
export const KNOB = { width: 1.6, dens: 0.4, sheath: 0.35, edge: 0.8, amp: 0.63, spin: 1, debris: 0.58, trans: 0.4, rim: 0.6 };
// Opacity grows with the log of F: half at F0, 2.4 times at F2, 3.6 times at F5.
export const densAt = f => KNOB.dens * (0.5 + 1.75 * Math.log(1 + f));
// A smooth curve through the table (Catmull-Rom), held inside each step's two values.
export const at = (k, f) => {
  const t = TABLE[k], i = Math.min(4, Math.floor(f)), u = clamp(f - i);
  const p0 = t[Math.max(0, i - 1)], p1 = t[i], p2 = t[i + 1], p3 = t[Math.min(5, i + 2)];
  const v = 0.5 * (2 * p1 + (p2 - p0) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u * u + (3 * p1 - p0 - 3 * p2 + p3) * u * u * u);
  return Math.min(Math.max(p1, p2), Math.max(Math.min(p1, p2), v));
};
// The lab's metres per storm km at an F level: its deck and rotating zone scale by it.
// The lab frames each F from its own distance; this keeps the horn's proportions.
export const labM = f => 560 * (0.76 + 0.24 * Math.min(1, Math.max(0, f / 3.5)) ** 1.5);

// The bands' height scale: it grows gently with the funnel, so a change of F barely stretches them.
const zScale = rRef => 28 * Math.sqrt(Math.max(rRef, 8) / 20);
/**
 * Sums each layer's spin angle and climb for one tornado: 0 is the core, 1 to 5 the sheaths, 6 the dust.
 * @param {Float32Array} phase  14 values, two per layer.
 * @param {number} dt
 * @param {number} f
 * @returns {{ zs: number, ds: number }}
 */
export function spinLayers(phase, dt, f) {
  const r0 = at('r0', f), vmax = at('vmax', f), spin = KNOB.spin;
  // The radius at mid height sets every layer's rate.
  const rRef = Math.max(4, r0 * (1 + (at('flare', f) - 1) * Math.pow(0.5, at('prof', f))));
  for (let i = 0; i < 6; i++) {
    const rk = i === 0 ? 0.8 : 1 + 0.2 * (i - 1), fk = i === 0 ? 0 : (i - 1) / 4;
    const om = vmax / rRef * (rk < 1 ? 1 : 1 / (rk * rk)) * spin * (1 + 0.1 * i);
    const up = vmax * 0.35 * spin * (1 - 0.6 * fk) / zScale(rRef);
    phase[i * 2] = (phase[i * 2] + om * dt) % (Math.PI * 2);
    phase[i * 2 + 1] += up * dt;
  }
  // The dust: one body at its own radius, faster than the funnel.
  const rD = r0 * (2.2 + (1.18 - 2.2) * f / 5), ds = Math.max(rD * 0.22, 5);
  phase[12] = (phase[12] + vmax * 1.3 / Math.max(rD, 6) * spin * dt) % (Math.PI * 2);
  phase[13] += vmax * 0.3 * spin * 0.55 / ds * dt;
  return { zs: zScale(rRef), ds };
}

/* ---------- the noise volume ---------- */
// A 64 cube that tiles: value noise, smoothed twice, so trilinear lookups read as soft noise.
// It matches noiseVolume() in tornado/lab.js; the funnel reads only its red channel.
export function noiseVolume(gl) {
  const S = 64, n = S * S * S;
  let a = new Float32Array(n), b = new Float32Array(n);
  let seed = 1234567;
  for (let i = 0; i < n; i++) { seed = (seed * 1664525 + 1013904223) >>> 0; a[i] = seed / 4294967296; }
  const idx = (x, y, z) => ((z & 63) * S + (y & 63)) * S + (x & 63);
  for (let pass = 0; pass < 2; pass++) for (const axis of [0, 1, 2]) {
    const dx = axis === 0 ? 1 : 0, dy = axis === 1 ? 1 : 0, dz = axis === 2 ? 1 : 0;
    for (let z = 0; z < S; z++) for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      b[idx(x, y, z)] = 0.25 * a[idx(x - dx, y - dy, z - dz)] + 0.5 * a[idx(x, y, z)] + 0.25 * a[idx(x + dx, y + dy, z + dz)];
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
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
  gl.texImage3D(gl.TEXTURE_3D, 0, gl.R8, S, S, S, 0, gl.RED, gl.UNSIGNED_BYTE, bytes);
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4);
  for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.REPEAT], [gl.TEXTURE_WRAP_T, gl.REPEAT], [gl.TEXTURE_WRAP_R, gl.REPEAT]]) gl.texParameteri(gl.TEXTURE_3D, k, v);
  gl.bindTexture(gl.TEXTURE_3D, null);
  return tex;
}

/* ---------- the pass ---------- */
// The most tornadoes the pass draws.
export const MAX_FUNNELS = 4;
/**
 * The funnel pass's fragment shader.
 * @param {string} sky  shared/sky.js SKY: skyCol() needs skDusk().
 * @param {string} storm  The scene's shared GLSL: camera, sky, haze, the supercell.
 */
export const funnelFS = (sky, storm) => /* glsl */`#version 300 es
precision highp float;
precision highp sampler3D;
out vec4 outC;
uniform sampler3D tNoise;
uniform sampler2D tPrev;
uniform vec2 uRes, uJit;
uniform float uBlend;
// Light through: how much sun passes through the funnel's own body, 0 to 1.
uniform float uTrans;
// Rim blend: a grazing ray sees thinner core, so the lit rim blends, 0 to 1.
uniform float uRim;
// The scene's own uniforms, the same values as the scene pass.
uniform vec3 uSun, uSunCol, uAmb, uZen, uMid, uBand, uAnti;
uniform float uFoc, uHz, uYaw, uStorm, uT;
// The tornadoes, nearest first. main.js packs each one; see pick().
uniform int uN;
uniform vec4 uTA[${MAX_FUNNELS}], uTB[${MAX_FUNNELS}], uTC[${MAX_FUNNELS}], uTD[${MAX_FUNNELS}], uTE[${MAX_FUNNELS}], uTF[${MAX_FUNNELS}];
// Spin angle and climb, seven layers per tornado: the core, five sheaths, the dust.
uniform vec2 uPhs[${MAX_FUNNELS * 7}];
${sky}
${storm}

// The lab's approved knob values.
const float uWid = ${KNOB.width.toFixed(3)}, uSheathK = ${KNOB.sheath.toFixed(3)}, uEdgeW = ${KNOB.edge.toFixed(3)}, uAmp = ${KNOB.amp.toFixed(3)};
// A step through the onion is this share of its radius: the lab's 60 steps.
const float K_ON = 0.3;

// One tornado's values, set by pick(). The names are the lab's uniforms.
float uH, uDeckY, uR0, uFlare, uProf, uVmax, uCond, uDebris, uDustH, uRain, uDark, uLean, uSway, uFk, uDs, uZs, uRope, uSeed, uTime, uLabM, uFade, uDens;
// The foot in camera space, in metres.
vec3 gFoot;
int gI;
// The haze colour on this ray, and its share at the funnel's distance.
vec3 gHzC;
void pick(int i) {
  vec4 a = uTA[i], b = uTB[i], c = uTC[i], d = uTD[i], e = uTE[i], f = uTF[i];
  gFoot = vec3(a.x, 0.0, a.y); uH = a.z; uDeckY = a.w;
  uR0 = b.x; uFlare = b.y; uProf = b.z; uVmax = b.w;
  uCond = c.x; uDebris = c.y; uDustH = c.z; uRain = c.w;
  uDark = d.x; uLean = d.y; uSway = d.z; uFk = d.w;
  uDs = e.x; uZs = e.y; uRope = e.z; uSeed = e.w;
  uLabM = f.x; uFade = f.y; uDens = f.z;
  // Each tornado sways on its own clock.
  uTime = uT + uSeed * 40.0;
  gI = i * 7;
}
vec2 phOf(int k) { return uPhs[gI + k]; }

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
// The axis: a lean to the right and a slow sway, both strongest for ropes.
// Roping out bends it into a long S.
vec2 axisAt(float h) {
  float u = clamp(h / uH, 0.0, 1.0);
  vec2 o = vec2(uLean, -0.3 * uLean) * u * u;
  o += vec2(sin(u * 3.0 + uTime * 0.23), cos(u * 2.3 + uTime * 0.19)) * uSway * u * (0.4 + u);
  float r = clamp(uRope, 0.0, 1.0);
  o += vec2(1.0, -0.25) * r * (sin(u * 3.1416) * 700.0 * (1.0 + 0.3 * sin(uTime * 0.3)) + u * 500.0);
  return o;
}
// The funnel's radius at a height; the last stretch spreads toward the deck.
float radiusAt(float h) {
  float u = clamp(h / uH, 0.0, 1.0);
  return uR0 * mix(1.0, uFlare, pow(u, uProf)) * (1.0 + 0.15 * smoothstep(0.85, 1.0, u));
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
const int SHEATHS = 5;
// Detail follows the screen: set per sample from the pixel's size where the ray is.
// gSp: the gap between sheaths over R, at least about three pixels. gAng: the noise's scale round the funnel.
float gSp = 0.2, gAng = 1.0;
float sheathR(int k) { return 1.0 + gSp * float(k); }
// One sheath's noise, spun as one body, from integrated phases.
// x is the radius over R: the noise varies through the sheath too.
float sheathN(float ang, float h, float x, float R, float rk, int idx, int oct) {
  vec2 ph = phOf(idx);
  // One height scale per funnel: height over the local radius stalls in the flare.
  float zz = h / uZs - ph.y;
  // Features round the funnel keep about the shape of features up it, at any size.
  float rb = clamp(0.73 * R / uZs, 0.6, 3.5);
  // Fewer, larger features round a funnel that is thin on screen.
  float rc = (rb + (x - rk) * 2.5 * 0.2 / gSp) * gAng;
  // The helix leans by arc, not by angle, so a wide funnel does not shear flat.
  float a = ang - ph.x - zz * 0.9 * 1.1 / (rb * gAng);
  vec3 c = vec3(cos(a) * rc, zz * 1.1, sin(a) * rc) + float(idx) * 3.17 + uSeed * 23.0;
  float n = fbm(c, oct);
  // Billows: round noise in the layer's own frame, so the bands read as cloud, not hair.
  float a0 = ang - ph.x, rr = x * R / uZs;
  float nb = fbm(vec3(cos(a0) * rr, zz, sin(a0) * rr) * 1.6 + float(idx) * 5.1 + uSeed * 19.0, 2);
  n = mix(n, nb, 0.4);
  // Erosion: fine detail eats into the edges of each billow.
  return oct > 2 ? n - (1.0 - n) * N(c * 3.7 + 7.0) * 0.45 : n;
}
/* ---------- the horn: where the funnel flares up into the deck ---------- */
// The rotating zone round the tornado, in metres: small over a rope, broad over a wedge.
float wallRadLab() { return max(mix(0.9, 2.4, smoothstep(0.0, 1.0, uFk)) * uLabM, radiusAt(uH) * 1.7); }
// The flare's width past the funnel's top radius: a share of it, so the horn grows with F.
float hornA() {
  float Rt = radiusAt(uH);
  return clamp(Rt * mix(0.9, 0.5, smoothstep(0.0, 1.0, uFk)) + 20.0, Rt * 0.25, max(wallRadLab() * 0.85 - Rt, Rt * 0.25));
}
// How far under the funnel's top the flare starts. A tall flare reads as a dark cone.
float collarLen() { return clamp(hornA() * 0.6, 40.0, uH * 0.15); }
// The horn's strength: none until the funnel forms.
float hornOn() { return smoothstep(0.0, 0.35, uCond); }
// Where the flare starts: a shallow sag under the deck, down to the funnel's top as it forms.
float hornBot() { return mix(uDeckY - 0.6 * (uDeckY - uH), uH - collarLen(), smoothstep(0.0, 0.5, uCond)); }
// The horn's values for this tornado, set once per tornado.
float gA, gY0, gDeck;
void hornInit() { gA = hornA(); gY0 = hornBot(); gDeck = uDeckY; }
// The horn's radius at a height. s returns how far up the horn it is, 0 to 1.
// A superellipse of 1.6: upright at the funnel, level at the deck.
float hornR(float y, out float s) {
  s = (y - gY0) / (gDeck - gY0);
  float sc = clamp(s, 0.0, 1.0);
  return radiusAt(min(y, uH)) + gA * (1.0 - pow(1.0 - pow(sc, 1.6), 0.625));
}
// Extinction per metre for a density: thin funnels get denser, so a rope still reads.
float funnelSig(float d, float R) { return d * 7.0 / max(R, 5.0); }
// Henyey-Greenstein phase, scaled so that isotropic is 1.
float hg(float c, float g) { float g2 = g * g; return (1.0 - g2) / pow(1.0 + g2 - 2.0 * g * c, 1.5); }

// Debris and dust, and rain, as volumes. oct: the dust's noise detail.
void vol(vec3 p, out float d, out float w, int oct) {
  float h = p.y, u = h / uH;
  d = 0.0; w = 0.0;
  vec2 q = p.xz - axisAt(h);
  float r = length(q), R = radiusAt(h);
  float Rd = debrisR(h);
  if (h < uDustH * 1.8 && r < Rd * 1.3) {
    // The dust turns as one body: two crossfaded layers double at this speed.
    vec2 phd = phOf(6);
    vec2 qd = mat2(cos(phd.x), sin(phd.x), -sin(phd.x), cos(phd.x)) * q;
    vec3 cd = vec3(qd.x / uDs, h / uDs * 0.9 - phd.y, qd.y / uDs) + uSeed * 29.0;
    float nd = fbm(cd + 7.3, oct);
    if (oct > 3) nd -= (1.0 - nd) * N(cd * 4.5 + 5.0) * 0.35;
    float puff = smoothstep(0.4, 0.6, nd);
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
/* ---------- the shells ---------- */
// The error function, to about 1e-4 (Winitzki's form).
float erfA(float x) {
  float x2 = x * x;
  return sign(x) * sqrt(1.0 - exp(-x2 * (1.2732395 + 0.147 * x2) / (1.0 + 0.147 * x2)));
}
// A Gaussian layer's path length over one segment; x runs linearly from x0 to x1.
float layerInt(float x0, float x1, float L, float c, float s) {
  float dx = x1 - x0;
  if (abs(dx) < 0.02 * s) { float z = (0.5 * (x0 + x1) - c) / s; return L * exp(-z * z); }
  return L / dx * s * 0.8862269 * (erfA((x1 - c) / s) - erfA((x0 - c) / s));
}
// The core's ramp: 1 inside e - w, 0 outside e. This is its integral in x.
float rampF(float x, float e, float w) {
  float a = e - w;
  if (x <= a) return x;
  if (x >= e) return a + 0.5 * w;
  return a + (w * w - (e - x) * (e - x)) / (2.0 * w);
}
float rampInt(float x0, float x1, float L, float e, float w) {
  float dx = x1 - x0;
  if (abs(dx) < 1e-4) return L * clamp((e - 0.5 * (x0 + x1)) / w, 0.0, 1.0);
  return L * (rampF(x1, e, w) - rampF(x0, e, w)) / dx;
}
// The funnel's shape at one point. R: the horn's radius. Re: the radius after the taper.
struct Geo { vec2 q; float R, Re, sH, x, tap; };
// The lower edge round the funnel, without the core's noise.
float edgeAt(vec2 q, float h) {
  float ang = atan(q.y, q.x);
  return uH * (1.0 - uCond) + (fbm(vec3(cos(ang) * 0.6, h * 0.002 - uTime * 0.05, sin(ang) * 0.6) + 11.0 + uSeed * 7.0, 2) - 0.5) * 0.4 * uH * mix(1.0, 0.3, uCond);
}
// xn: past this distance over R the edge noise is not read.
Geo geo(vec3 p, float xn) {
  Geo g;
  g.q = p.xz - axisAt(p.y);
  g.R = hornR(p.y, g.sH);
  // The tip's taper keeps its length when Width widens the funnel.
  float taperL = max(g.R * 4.0 / uWid, 80.0);
  float top = uH * (1.0 - uCond) + 0.2 * uH * mix(1.0, 0.3, uCond) + taperL * 1.4;
  // The noisy edge eases into the flat one before xn, so x has no step there.
  float xr = length(g.q) / g.R, eh = uH * (1.0 - uCond);
  if (p.y <= top && xr < xn) eh = mix(edgeAt(g.q, p.y), eh, smoothstep(xn - 0.5, xn, xr));
  g.tap = p.y > top ? 1.0 : clamp((p.y - eh) / taperL, 0.0, 1.0);
  // The funnel narrows to a point at its lower edge.
  g.Re = g.R * mix(0.12, 1.0, sqrt(g.tap));
  g.x = length(g.q) / g.Re;
  return g;
}
// The sun ray's length inside a circle of radius rho round the axis, up to L.
float chord(vec2 q, vec2 d, float a, float rho, float L) {
  float b = dot(q, d), c = dot(q, q) - rho * rho;
  if (a < 1e-5) return c < 0.0 ? L : 0.0;
  float D = b * b - a * c;
  if (D <= 0.0) return 0.0;
  float s = sqrt(D);
  return max(min((-b + s) / a, L) - max((-b - s) / a, 0.0), 0.0);
}
// Optical depth toward the sun, in closed form: the core and each sheath as a ring at mean cover.
float sunOD(vec2 q, float h, float R) {
  vec2 d = gSunC.xz;
  float a = dot(d, d), L = max(R * 1.8, 16.0), od = 0.0;
  // The funnel's own shade runs from its foot up through the flare, with soft ends.
  float hb = uH * (1.0 - uCond), wf = smoothstep(hb - 60.0, hb + 60.0, h);
  if (wf > 0.0) {
    // Two circles give the core a soft terminator.
    od = funnelSig(1.6, R) * 0.5 * (chord(q, d, a, 0.75 * R, L) + chord(q, d, a, 0.95 * R, L));
    float w = 0.42 * gSp * 0.886 * R;
    for (int j = 0; j < SHEATHS; j++) {
      float rho = sheathR(j) * R;
      od += funnelSig(mix(0.45, 0.12, float(j) / float(SHEATHS - 1)), R) * (chord(q, d, a, rho + w, L) - chord(q, d, a, max(rho - w, 0.0), L));
    }
    od *= wf * (1.0 - 0.95 * uTrans);
  }
  // The dust's own shade: three nested circles, so its shadow has no hard rim.
  float Rd = debrisR(h), Ld = max(L, Rd * 2.0), dd = 0.0;
  for (int c = 0; c < 3; c++) dd += chord(q, d, a, Rd * (0.35 + 0.3 * float(c)), Ld);
  od += uDebris * 0.6 * 0.012 * dd / 3.0 * (1.0 - smoothstep(uDustH * 0.4, uDustH * 1.3, h));
  return od;
}
// A sheath's density factor at one point: its noise past the cover threshold.
float sheathDen(vec3 ph, float x, float rk, float R, int k, float cov, int oct) {
  vec2 q = ph.xz - axisAt(ph.y);
  float n = sheathN(atan(q.y, q.x), ph.y, x, R, rk, k, oct);
  return smoothstep(cov, cov + 0.14, n) * (0.6 + 0.4 * n);
}
// Roping out tears the funnel into pieces, then fades it.
float live(float h) {
  float n = N(vec3(h * 0.0015 + uTime * 0.0125, uSeed * 2.3, 0.7));
  float tear = mix(1.0, smoothstep(0.0, 0.25, n - (uRope - 0.4) * 0.55), smoothstep(0.2, 0.6, uRope));
  return tear * uFade;
}
// The colour of the funnel's cloud at one layer hit, before haze.
vec3 shellCol(vec2 q, float h, float R, float xr, float cs, float ph0, float ph1, vec3 skyH, float topK, vec3 stC) {
  float u = clamp(h / uH, 0.0, 1.0);
  float od = sunOD(q, h, R) + cs;
  vec3 sunL = uSunCol * (exp(-od) * ph0 + 0.5 * exp(-od * 0.4) * ph1 + 0.12 * exp(-od * 0.16)) * (1.0 - 0.6 * uDark);
  // Sky light falls off with depth into the funnel.
  float depth = max(0.0, 1.6 - xr);
  vec3 ambC = mix(uAmb * vec3(0.85, 0.95, 1.15), skyH * 0.9, 0.3 + 0.4 * topK);
  vec3 ambL = ambC * (0.3 + 0.55 * u) * exp(-depth * 1.6);
  // Bounce from the sunlit wheat warms the lower funnel from below.
  ambL += uSunCol * vec3(0.55, 0.42, 0.22) * 0.07 * (1.0 - u) * exp(-depth * 1.2);
  vec3 alb = vec3(0.9, 0.91, 0.93) * mix(1.0, 0.1, uDark);
  alb = mix(alb, vec3(0.45, 0.36, 0.27) * mix(1.0, 0.45, uDark), (1.0 - smoothstep(0.0, 0.35, u)) * uDebris);
  return mix(alb * (sunL * 0.6 + ambL * 0.8), stC, topK);
}
// The storm's shade on a funnel point: its shape along the sun ray.
// A high sun is cut off by the storm overhead; a low one slips under the base.
vec3 toKm(vec3 p) { return (p + gFoot) * 0.001; }
float cloudShade(vec3 p) {
  float od = 0.0;
  od += smoothstep(0.06, -0.06, stormShape(toKm(p + gSunC * 80.0))) * 80.0;
  od += smoothstep(0.06, -0.06, stormShape(toKm(p + gSunC * 260.0))) * 180.0;
  float L = (max(gDeck - p.y, 0.0) + 60.0) / max(gSunC.y, 0.03);
  // Far under the base the sun slips past the deck: its shade fades out, with no step.
  float far = 1.0 - smoothstep(12000.0, 20000.0, L);
  if (far > 0.0) {
    od += far * smoothstep(0.06, -0.06, stormShape(toKm(p + gSunC * L))) * 300.0;
    od += far * smoothstep(0.06, -0.06, stormShape(toKm(p + gSunC * (L + 400.0)))) * 300.0;
  }
  return od * 0.006;
}
// How far up the join a height is: 0 on the funnel, 1 where the horn meets the deck.
float topKAt(float h) { return smoothstep(gY0, gDeck, h); }

// The layers on one stretch of a ray, front to back among themselves.
void shellSeg(vec3 pa, vec3 rd, float len, float xa, float xb, float Rea, float Reb, float Ra, float Rb, float tapa, float tapb, float sHm, float cs, float topK, vec3 stC, float hzF, float ph0, float ph1, vec3 skyH, inout vec3 fAcc, inout float fT) {
  const int oct = 4;
  float dx = xb - xa, xlo = min(xa, xb), xhi = max(xa, xb);
  bool inward = dx < 0.0;
  // Up the flare the onion closes into one body on the horn's outline.
  float fl = smoothstep(0.15, 0.6, sHm);
  // The top fades near the deck; the tip thins as it narrows.
  float fade = (1.0 - smoothstep(0.75, 1.0, sHm)) * smoothstep(0.0, 0.45, 0.5 * (tapa + tapb));
  if (fade <= 0.0) return;
  float sw = 0.42 * gSp;
  float coreMax = 1.0 + uAmp * 0.225 + 0.02;
  // 0 is the core, 1 to 5 the sheaths; an inward stretch meets the outer ones first.
  for (int j = 0; j <= SHEATHS; j++) {
    int k = inward ? SHEATHS - j : j;
    float od = 0.0, uk = 0.5, xr, shade = 1.0;
    vec3 ph;
    vec2 q;
    float R;
    if (k == 0) {
      if (xlo > coreMax) continue;
      // The core's noise is read where the stretch crosses its mean edge.
      uk = abs(dx) > 1e-4 ? clamp((0.95 - xa) / dx, 0.0, 1.0) : 0.5;
      ph = pa + rd * (len * uk);
      q = ph.xz - axisAt(ph.y);
      R = mix(Ra, Rb, uk);
      float ang = atan(q.y, q.x);
      float nc = sheathN(ang, ph.y, 0.8, R, 0.8, 0, oct);
      float edge = mix(0.9, 1.0, fl) + uAmp * 0.45 * (nc - 0.5) * mix(1.0, 0.6, fl);
      // The core's noise also rags the lower edge.
      float tap = clamp(mix(tapa, tapb, uk) - (nc - 0.5) * 0.7, 0.0, 1.0);
      float d = 1.6 * (1.0 - smoothstep(0.75, 1.0, sHm)) * smoothstep(0.0, 0.45, tap);
      // Near the tip the core tears: only the dense parts of the wall's noise hold.
      if (tap < 1.0) {
        float tear = N(vec3(cos(ang) * 2.2, ph.y / max(R * 0.6, 4.0) - phOf(0).y * 3.0, sin(ang) * 2.2) + 4.4 + uSeed * 11.0);
        d *= mix(smoothstep(0.45, 0.7, 0.6 * nc + 0.4 * tear), 1.0, smoothstep(0.35, 1.0, tap));
      }
      float wC = 0.1 + uEdgeW * uAmp;
      od = funnelSig(d, R) * rampInt(xa, xb, len, edge, wC) * uDens;
      od *= 1.0 - uRim * 0.75 * smoothstep(edge - wC, edge, xlo);
      // Light the core where the ray enters its ragged edge, solved on the circle.
      // A ray that never gets that deep takes its point nearest the axis.
      float xt = max(edge - 0.5 * wC, 0.9);
      float rho = xt * 0.5 * (Rea + Reb);
      vec2 qa = pa.xz - axisAt(pa.y), dz = rd.xz;
      float qA = max(dot(dz, dz), 1e-6), qB = dot(qa, dz), qD = qB * qB - qA * (dot(qa, qa) - rho * rho);
      float sE = qD > 0.0 ? (-qB - sqrt(qD)) / qA : -qB / qA;
      ph = pa + rd * sE;
      uk = clamp(sE / len, 0.0, 1.0);
      q = ph.xz - axisAt(ph.y);
      xr = (edge - 0.5 * wC) * mix(Rea, Reb, uk) / R;
      // A deep pocket in the wall reads darker.
      shade = mix(0.7, 1.2, smoothstep(0.25, 0.75, nc));
    } else {
      float fk = float(k - 1) / float(SHEATHS - 1);
      // Thin sheaths with clear air between them. They close up and fade in the flare.
      float rk = 1.0 + gSp * float(k - 1) * (1.0 - fl);
      if (rk < xlo - 3.0 * sw || rk > xhi + 3.0 * sw) continue;
      R = 0.5 * (Ra + Rb);
      // The path in a layer is capped, so an edge-on layer draws no dark stroke.
      float I = min(layerInt(xa, xb, len, rk, sw), 3.5 * sw * R) * (1.0 - fl) * fade;
      float sMax = funnelSig(mix(0.9, 0.35, fk), R) * I;
      if (sMax < 0.003) continue;
      // Outer sheaths show only their densest noise, so the edge stays wispy.
      float cov = mix(0.42, 0.6, fk);
      // A steep crossing reads the noise once; a grazing one reads at two points.
      float steep = smoothstep(0.5, 1.5, abs(dx) / sw);
      float uc = abs(dx) > 1e-4 ? clamp((rk - xa) / dx, 0.0, 1.0) : 0.5;
      float den = 0.0;
      if (steep > 0.0) den = steep * sheathDen(pa + rd * (len * uc), rk, rk, R, k, cov, oct);
      if (steep < 1.0) {
        float x1 = mix(xa, xb, 0.25), x2 = mix(xa, xb, 0.75);
        float w1 = exp(-pow((x1 - rk) / sw, 2.0)) + 1e-3, w2 = exp(-pow((x2 - rk) / sw, 2.0)) + 1e-3;
        float d1 = sheathDen(pa + rd * (len * 0.25), x1, rk, R, k, cov, oct), d2 = sheathDen(pa + rd * (len * 0.75), x2, rk, R, k, cov, oct);
        den += (1.0 - steep) * (d1 * w1 + d2 * w2) / (w1 + w2);
        uc = mix(0.5, uc, steep);
      }
      uk = uc;
      ph = pa + rd * (len * uk);
      q = ph.xz - axisAt(ph.y);
      od = sMax * den * uSheathK * uDens;
      xr = rk * mix(Rea, Reb, uk) / R;
    }
    od *= live(ph.y);
    if (od < 1e-4) continue;
    vec3 c = mix(shellCol(q, ph.y, R, xr, cs, ph0, ph1, skyH, topK, stC) * shade, gHzC, hzF);
    float a = 1.0 - exp(-od);
    fAcc += fT * a * c;
    fT *= 1.0 - a;
  }
}
// Marches one tornado from ro, relative to its foot, in camera space.
// It returns the colour, premultiplied, in fAcc and what shows through in fT.
void funnel(vec3 ro, vec3 rd, float tMax, float jit, float jit2, vec3 skyH, out vec3 fOut, out float TOut) {
  fOut = vec3(0.0); TOut = 1.0;
  hornInit();
  // The march's column: the funnel, its flare, its lean, its sway and a rope's bend.
  float Rb = max(uR0 * max(uFlare * 2.0, 2.6), (radiusAt(uH) + gA) * 1.3) + uLean + uSway * 2.0 + 140.0 + 1300.0 * clamp(uRope, 0.0, 1.0);
  vec2 cy = cylinder(ro, rd, Rb, 0.0, gDeck + 60.0);
  if (cy.y <= 0.0) return;
  float tA0 = cy.x, tA1 = cy.x + cy.y, tEnd = min(tA1, tMax);
  if (tA0 >= tEnd) return;
  float t = tA0 + (tA1 - tA0) / 60.0 * jit;
  float cosT = dot(rd, gSunC);
  // Two lobes: some light bounces back toward the eye, most runs on.
  float ph0 = mix(hg(cosT, 0.6), hg(cosT, -0.25), 0.55);
  float ph1 = mix(hg(cosT, 0.3), hg(cosT, -0.1), 0.55);
  Geo g0;
  bool have = false;
  // The storm's shade on the dust and rain, and on the funnel: once per ray each.
  float csLow = -1.0, csF = -1.0;
  // The deck's light over the horn: once per ray.
  vec3 stC = vec3(-1.0);
  vec3 acc = vec3(0.0);
  float T = 1.0;
  for (int i = 0; i < 200; i++) {
    if (t > tEnd || T < 0.01) break;
    vec3 p = ro + rd * t;
    // The pixel's size in metres where the ray is now.
    float foot = t / (uRes.y * uFoc), sH0;
    float R0 = hornR(p.y, sH0);
    gSp = max(0.2, 3.5 * foot / R0);
    gAng = clamp(R0 * 0.06 / foot, 0.3, 1.0);
    float xOut = 1.25 + 4.0 * gSp;
    if (!have) g0 = geo(p, xOut + 0.6);
    float r = g0.x * g0.Re, on = g0.Re * K_ON;
    // Coarse steps through the onion, long ones outside it.
    float st = g0.x < xOut ? on : max((r - xOut * g0.Re) * 0.8, on);
    // The dust takes a few coarse steps across its width; the step grows toward its bounds.
    float Rd = debrisR(p.y), ra = length(g0.q);
    bool inDust = uDebris > 0.0 && p.y < uDustH * 1.8 && ra < Rd * 1.3;
    float eD = max(smoothstep(0.7, 1.0, p.y / (uDustH * 1.8)), smoothstep(0.8, 1.0, ra / (Rd * 1.3)));
    if (inDust) st = min(st, Rd * 2.6 / 8.0 / max(1.0 - eD, 0.05));
    // The rain ring is a soft veil: its own steps are as long as the onion's.
    float Rr = radiusAt(p.y) * 1.15 + uR0 * 0.35;
    if (uRain > 0.01 && abs(ra - Rr) < Rr * 0.3) st = min(st, Rr * 0.3);
    vec3 sum = vec3(0.0);
    float sig = 0.0;
    vec3 fAcc = vec3(0.0), fAcc2 = vec3(0.0);
    float fT = 1.0, fT2 = 1.0;
    bool inward, split = false;
    float hzF = 0.8 * (1.0 - exp(-t / 70000.0));
    Geo g1 = geo(p + rd * st, xOut + 0.6);
    inward = g1.x < g0.x;
    float sHm = 0.5 * (g0.sH + g1.sH);
    if (min(g0.x, g1.x) < xOut + 0.3 && sHm < 1.0) {
      vec3 pm = p + rd * (st * 0.5);
      if (csF < 0.0) csF = cloudShade(pm);
      // Below F1 the horn is a lowering of the base: it takes the storm's tone all the way down.
      float topK = max(topKAt(pm.y), 1.0 - smoothstep(0.0, 0.5, uCond));
      // The deck's own light for the join: climb from here to the cloud's surface.
      // The air under the base would light as open sky.
      if (topK > 0.0 && stC.x < 0.0) {
        vec3 pt = toKm(pm);
        pt.y = max(pt.y, gDeck * 0.001 - 0.12);
        float dS = stormD(pt);
        for (int k = 0; k < 8; k++) { if (dS <= 0.02) break; pt.y += max(dS, 0.03); dS = stormD(pt); }
        // A few steps up into it, weighted as the scene's own march weights them.
        float soft = max(0.025, t * 0.000005), Tk = 1.0;
        vec3 sc = vec3(0.0);
        for (int k = 0; k < 5; k++) {
          float a = clamp(0.5 - dS / soft, 0.0, 1.0) * 0.8;
          sc += Tk * a * stormLit(pt, dS);
          Tk *= 1.0 - a;
          pt.y += 0.03 + 0.006 * t * 0.001;
          dS = stormD(pt);
        }
        stC = sc / max(1.0 - Tk, 0.05);
      }
      // x at the middle: a ray that turns back out inside the segment takes two straight pieces.
      vec2 qm = pm.xz - axisAt(pm.y);
      float Rem = 0.5 * (g0.Re + g1.Re), Rm = 0.5 * (g0.R + g1.R), tm = 0.5 * (g0.tap + g1.tap);
      float xm = length(qm) / Rem;
      split = xm < min(g0.x, g1.x) - 0.01;
      if (split) {
        shellSeg(p, rd, st * 0.5, g0.x, xm, g0.Re, Rem, g0.R, Rm, g0.tap, tm, sHm, csF, topK, stC, hzF, ph0, ph1, skyH, fAcc, fT);
        shellSeg(pm, rd, st * 0.5, xm, g1.x, Rem, g1.Re, Rm, g1.R, tm, g1.tap, sHm, csF, topK, stC, hzF, ph0, ph1, skyH, fAcc2, fT2);
      } else shellSeg(p, rd, st, g0.x, g1.x, g0.Re, g1.Re, g0.R, g1.R, g0.tap, g1.tap, sHm, csF, topK, stC, hzF, ph0, ph1, skyH, fAcc, fT);
    }
    Geo gs = g0;
    g0 = g1;
    have = true;
    // Dust and rain: two random points in the segment, one in each half, so coarse steps leave no rings.
    if (inDust || uRain > 0.01) {
      float d, w, d2, w2;
      vol(p + rd * (st * 0.5 * jit2), d, w, 4);
      vol(p + rd * (st * 0.5 * (1.0 + fract(jit2 + 0.5))), d2, w2, 4);
      d = 0.5 * (d + d2);
      w = 0.5 * (w + w2);
      float sd = d * 0.014, sw2 = w * 0.0012;
      if (sd + sw2 > 1e-6) {
        if (csLow < 0.0) csLow = cloudShade(p);
        float u = clamp(p.y / uH, 0.0, 1.0);
        float od = sunOD(gs.q, p.y, gs.R) + csLow;
        float topK = max(topKAt(p.y), 1.0 - smoothstep(0.0, 0.5, uCond));
        vec3 ambC = mix(uAmb * vec3(0.85, 0.95, 1.15), skyH * 0.9, 0.3 + 0.4 * topK);
        vec3 dcol = vec3(0.42, 0.32, 0.22) * mix(1.0, 0.35, uDark) * (uSunCol * exp(-od) * 0.5 * (1.0 - 0.6 * uDark) + uAmb * (0.3 + 0.35 * u) * 0.8);
        vec3 wcol = vec3(0.21) * (ambC * 0.7 + uSunCol * exp(-od) * 0.05);
        sum += mix(dcol, gHzC, hzF) * sd + mix(wcol, gHzC, hzF) * sw2;
        sig += sd + sw2;
      }
    }
    // The volume and the layers, in their order along the ray.
    float aV = sig > 1e-6 ? 1.0 - exp(-sig * st) : 0.0;
    vec3 cV = sig > 1e-6 ? sum / sig : vec3(0.0);
    if (split) { acc += T * fAcc; T *= fT; acc += T * aV * cV; T *= 1.0 - aV; acc += T * fAcc2; T *= fT2; }
    else if (inward) { acc += T * aV * cV; T *= 1.0 - aV; acc += T * fAcc; T *= fT; }
    else { acc += T * fAcc; T *= fT; acc += T * aV * cV; T *= 1.0 - aV; }
    t += st;
  }
  fOut = acc; TOut = T;
}

void main() {
  vec2 fc = gl_FragCoord.xy + uJit;
  float asp = uRes.x / uRes.y;
  vec2 s = vec2((fc.x / uRes.x - 0.5) * asp, fc.y / uRes.y - uHz);
  vec3 rc = normalize(vec3(s, -uFoc));
  vec3 rd = toWorld(rc);
  gSunC = toCam(uSun);
  float tMax = rc.y < 0.0 ? CAMH / -rc.y : 1e9;
  float jit = hash(fc + fract(uT * 7.31) * 113.0);
  // The dust's own jitter, apart from the march's.
  float jit2 = hash(fc.yx * 1.37 + fract(uT * 3.17) * 71.0);
  vec3 skyH = skyCol(normalize(vec3(rd.x, 0.0, rd.z)));
  gHzC = hazeCol(rd);
  // The gloom under the base, as the scene lays it over the storm.
  vec3 eyeK = vec3(0.0, CAMH * 0.001, 0.0);
  vec2 gl = cylinder(eyeK, rc, SHELF, SHELF_R.y * mix(0.4, 0.95, uStorm), 0.0, BASE + 0.2);
  vec3 gloom = uAmb * vec3(0.05, 0.085, 0.075);
  vec3 acc = vec3(0.0);
  float T = 1.0;
  for (int i = 0; i < ${MAX_FUNNELS}; i++) {
    if (i >= uN || T < 0.01) break;
    pick(i);
    vec3 ro = vec3(0.0, CAMH, 0.0) - gFoot;
    vec3 c;
    float Ti;
    funnel(ro, rc, tMax, jit, jit2, skyH, c, Ti);
    if (Ti > 0.999) continue;
    // The gloom on the stretch of air between the eye and this tornado.
    float tc = max(dot(-ro.xz, rc.xz) / max(dot(rc.xz, rc.xz), 1e-6), 0.0) * 0.001;
    float gLen = clamp(tc - gl.x, 0.0, gl.y);
    c = mix(c, gloom * (1.0 - Ti), 1.0 - exp(-gLen * gLen * 0.003 * uStorm));
    acc += T * c;
    T *= Ti;
  }
  vec4 now = vec4(acc, 1.0 - T);
  // A short history blend: steady frames lose their march noise.
  outC = mix(texture(tPrev, gl_FragCoord.xy / uRes), now, uBlend);
}`;
