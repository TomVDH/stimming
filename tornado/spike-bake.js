// Tornado lab: one hero tornado up close, on a continuous F-scale slider.
// Raw WebGL2 on shared/gl.js. The tornado here replaces the shot's stand-in once Tom signs it off.
import { program, linked, target, free, tri, to, TRI_VS } from '../shared/gl.js';
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
  cond: [0, 0.55, 0.85, 1, 1, 1],          // how far the condensation reaches down: none at F0
  debris: [0, 0.3, 0.55, 0.85, 1, 1],
  dustH: [40, 90, 160, 260, 380, 480],     // debris cloud height, m
  multi: [0, 0, 0, 0.5, 1, 1],             // satellite vortices
  rain: [0, 0, 0, 0.15, 0.55, 0.8],        // rain wrapped round the funnel
  dark: [0, 0.1, 0.3, 0.55, 0.75, 0.88],
  lean: [430, 260, 120, 60, 25, 10],       // top offset, m
  sway: [90, 60, 35, 20, 10, 5],
};
const NAMES = ['storm cloud', 'funnel cloud', 'cone', 'wide cone', 'stovepipe', 'wedge'];
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
const phase = new Float32Array(14);
let dsNow = 20;
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
  // The dust: one body at its own radius, faster than the funnel.
  const rD = r0 * (2.2 + (1.18 - 2.2) * f / 5);
  dsNow = Math.max(rD * 0.22, 5);
  phase[12] = (phase[12] + vmax * 1.3 / Math.max(rD, 6) * spin * dt) % (Math.PI * 2);
  phase[13] += vmax * 0.3 * spin * 0.55 / dsNow * dt;
}

/* ---------- shaders ---------- */
const SCENE_FS = /* glsl */`#version 300 es
precision highp float;
precision highp sampler3D;
in vec2 vUv;
out vec4 outC;
uniform sampler3D tNoise;
uniform sampler2D tPrev;
// The baked backdrop: colour, and in alpha how far the volume may reach.
uniform sampler2D tBg;
// 0 draws all; 1 bakes the backdrop; 2 reads the baked backdrop.
uniform int uMode;
uniform vec2 uRes, uJit;
uniform float uTime, uFoc, uHz, uDist, uBlend, uSpin, uAmp, uFk, uDbg;
uniform int uSteps;
uniform vec3 uSun, uSunCol, uAmb;
// The tornado: see the table in lab.js.
uniform float uH, uR0, uFlare, uProf, uVmax, uCond, uDebris, uDustH, uMulti, uRain, uDark, uLean, uSway;
// Spin angle and climb, per layer: 0 the core, 1 to 5 the sheaths, 6 the dust. lab.js integrates them each frame.
uniform vec2 uPh[7];
// The dust's noise scale in metres: one value per tornado.
uniform float uDs;
// Storm km per lab km: the storm is seen as the shot sees it, from 8 km, whatever the lab's distance.
uniform float uKs;
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
// The funnel's radius at a height; the last stretch spreads toward the deck.
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
// A sheath's radius, over the funnel radius R: 1.0 to 1.8 when the funnel is large on screen, wider on a thin one.
// Detail follows the screen: set per sample from the pixel's size where the ray is.
// gSp: the gap between sheaths over R, at least about three pixels. gAng: the noise's scale round the funnel.
float gSp = 0.2, gAng = 1.0;
float sheathR(int k) { return 1.0 + gSp * float(k); }
// One sheath's noise, spun as one body. fk: 0 for the inner sheath, 1 for the outer.
// x is the radius over R: the noise varies through the sheath too, so no streak runs along a ray.
// The spin and the climb come in as integrated phases, so a new F or spin only changes speed.
float sheathN(float ang, float h, float x, float R, float rk, int idx, int oct) {
  vec2 ph = uPh[idx];
  // Height over the local radius stalls in the flare and smears the bands; uZs does not.
  float zz = h / uZs - ph.y;
  // Features round the funnel keep about the shape of features up it, at any size.
  float rb = clamp(0.73 * R / uZs, 0.6, 3.5);
  // Fewer, larger features round a funnel that is thin on screen, so they stay a few pixels wide.
  float rc = (rb + (x - rk) * 2.5 * 0.2 / gSp) * gAng;
  // The helix: the bands lean as they climb, by arc, not by angle, so a wide funnel does not shear flat.
  float a = ang - ph.x - zz * 0.9 * 1.1 / (rb * gAng);
  vec3 c = vec3(cos(a) * rc, zz * 1.1, sin(a) * rc) + float(idx) * 3.17;
  float n = fbm(c, oct);
  // Billows: round noise in the layer's own frame, turning with it, so the bands read as cloud, not hair.
  float a0 = ang - ph.x, rr = x * R / uZs;
  float nb = fbm(vec3(cos(a0) * rr, zz, sin(a0) * rr) * 1.6 + float(idx) * 5.1, 2);
  n = mix(n, nb, 0.4);
  // Erosion: fine detail eats into the edges of each billow.
  return oct > 2 ? n - (1.0 - n) * N(c * 3.7 + 7.0) * 0.45 : n;
}
/* ---------- the horn: where the funnel flares up into the deck ---------- */
// The funnel's top, without its sway: the storm hangs from it at every F.
vec2 topXZ() { return vec2(uLean, -0.3 * uLean); }
// The rotating zone round the tornado, in storm km: small over a rope, broad over a wedge.
// It stays wider than the funnel's top on a wide lens. It sizes the horn's cap and the near storm.
float wallR() { return max(mix(0.9, 2.4, smoothstep(0.0, 1.0, uFk)), radiusAt(uH) * 1.7 * 0.001 * uKs); }
// The same radius in lab metres.
float wallRadLab() { return wallR() * 1000.0 / uKs; }
// The deck's underside sits this far over the funnel's top, in storm km. No lowered block: the horn is the taper.
const float DECK = 0.3;
// The deck's underside over the axis, in lab metres.
float deckY() { return uH + DECK * 1000.0 / uKs; }
// The flare's width past the funnel's top radius: a share of it, so the horn grows with F.
// It stays inside the rotating zone.
float hornA() {
  float Rt = radiusAt(uH);
  return clamp(Rt * mix(0.9, 0.5, smoothstep(0.0, 1.0, uFk)) + 20.0, Rt * 0.25, max(wallRadLab() * 0.85 - Rt, Rt * 0.25));
}
// How far under the funnel's top the flare starts. Short: the flare opens just under the base.
// A tall flare hangs in front of the far deck as a dark cone round the funnel.
float collarLen() { return clamp(hornA() * 0.6, 40.0, uH * 0.15); }
// The horn's strength: none at F0, where the deck is storm cloud only; full once the funnel forms.
float hornOn() { return smoothstep(0.0, 0.35, uCond); }
// Where the flare starts. Below F1 it is a shallow sag under the deck; it reaches down as the funnel forms.
float hornBot() { return mix(deckY() - 0.6 * (deckY() - uH), uH - collarLen(), smoothstep(0.0, 0.5, uCond)); }
// The horn's radius at a height, with no noise. s returns how far up the horn it is, 0 to 1.
// One trumpet from the funnel to the deck: upright where it leaves the funnel, level where it meets the deck.
// A superellipse of 1.6 flares sooner than a circle, so the curve spreads up the whole horn.
// The horn's values for this frame, set once at the start of main.
float gA, gY0, gDeck, gOn, gRtopKm;
void hornInit() {
  gA = hornA(); gY0 = hornBot(); gDeck = deckY(); gOn = hornOn();
  gRtopKm = (radiusAt(uH) + gA) * 0.001 * uKs;
}
float hornR(float y, out float s) {
  s = (y - gY0) / (gDeck - gY0);
  float sc = clamp(s, 0.0, 1.0);
  return radiusAt(min(y, uH)) + gA * (1.0 - pow(1.0 - pow(sc, 1.6), 0.625));
}
// The horn's widening per metre of height, for its distance field.
float hornSlope(float s) {
  float sc = clamp(s, 0.001, 0.995);
  return gA * pow(sc, 0.6) * pow(1.0 - pow(sc, 1.6), -0.375) / (gDeck - gY0);
}
// The horn as a distance in lab metres: negative inside.
// Up most of its height it lies inside the funnel's body, which widens along the same outline.
// It comes to the surface only near the deck, where the funnel has already taken the deck's tone.
float hornDist(float y, float r) {
  float s, R = hornR(y, s), k = hornSlope(s);
  R -= radiusAt(min(y, uH)) * mix(0.7, 0.0, smoothstep(0.4, 0.8, s));
  return max((r - R) / sqrt(1.0 + k * k), gY0 - y);
}
// Condensation density at p, 0 to about 2. u returns the height over the base.
// oct sets the noise detail: 4 for the view, 2 for the shadow rays.
float funnelD(vec3 p, out float u, int oct) {
  float h = p.y;
  u = h / uH;
  vec2 q = p.xz - axisAt(h);
  // The layers widen along the horn, so the funnel and the horn share one outline.
  float sH, r = length(q), R = hornR(h, sH), x = r / R;
  if (x > 1.25 + 4.0 * gSp) return 0.0;
  float ang = atan(q.y, q.x);
  float nc = sheathN(ang, h, 0.8, R, 0.8, 0, oct);
  // The lower edge climbs and falls round the funnel, and tears with the wall's noise.
  // Reaching the ground, the funnel's tip hides in its dust, so the edge varies less.
  float hc = uH * (1.0 - uCond);
  float taperL = max(R * 4.0, 80.0);
  float edgeH = hc + (fbm(vec3(cos(ang) * 0.6, h * 0.002 - uTime * 0.05, sin(ang) * 0.6) + 11.0, 2) - 0.5) * 0.4 * uH * mix(1.0, 0.3, uCond);
  edgeH += (nc - 0.5) * taperL * 0.7;
  // The taper: the funnel narrows to a point at its lower edge; no flat cap.
  float tap = clamp((h - edgeH) / taperL, 0.0, 1.0);
  x /= mix(0.12, 1.0, sqrt(tap));
  // Up the flare the onion closes into one body on the horn's outline: no veil round a narrow core.
  float fl = smoothstep(0.15, 0.6, sH);
  // The core: the funnel body, its edge ragged by the inner sheath's noise.
  float edge = mix(0.9, 1.0, fl) + uAmp * 0.45 * (nc - 0.5) * mix(1.0, 0.6, fl);
  float d = smoothstep(edge, edge - 0.1, x) * 1.6;
  // Near the tip the core tears: only the dense parts of the wall's noise hold together.
  float tear = N(vec3(cos(ang) * 2.2, h / max(R * 0.6, 4.0) - uPh[0].y * 3.0, sin(ang) * 2.2) + 4.4);
  d *= mix(smoothstep(0.45, 0.7, 0.6 * nc + 0.4 * tear), 1.0, smoothstep(0.35, 1.0, tap));
  // The sheaths: thin layers of tattered cloud, each spinning at its own rate.
  for (int k = 0; k < SHEATHS; k++) {
    float rk = 1.0 + gSp * float(k) * (1.0 - fl), fk = float(k) / float(SHEATHS - 1);
    // Thin sheaths with clear air between them: the onion's layers. They close up and fade in the flare.
    float wk = exp(-pow((x - rk) / (0.42 * gSp), 2.0)) * (1.0 - fl);
    if (wk < 0.03) continue;
    float n = sheathN(ang, h, x, R, rk, k + 1, oct);
    // Outer sheaths show only their densest noise, so the edge stays wispy.
    float cov = mix(0.42, 0.6, fk);
    d += wk * smoothstep(cov, cov + 0.14, n) * (0.6 + 0.4 * n) * mix(0.9, 0.35, fk);
  }
  // The tip thins as it narrows. The top fades only once the deck's horn is fully out, near the deck.
  d *= smoothstep(0.0, 0.45, tap) * (1.0 - smoothstep(0.75, 1.0, sH));
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
    // The dust turns as one body: two crossfaded layers would double at this speed.
    vec2 phd = uPh[6];
    vec2 qd = mat2(cos(phd.x), sin(phd.x), -sin(phd.x), cos(phd.x)) * q;
    vec3 cd = vec3(qd.x / uDs, h / uDs * 0.9 - phd.y, qd.y / uDs);
    float nd = fbm(cd + 7.3, 5);
    // Erosion turns with the dust, and a tight threshold gives the billows edges.
    nd -= (1.0 - nd) * N(cd * 4.5 + 5.0) * 0.35;
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
// Optical depth toward the sun: the funnel's mean shape and the dust, no noise.
float sunDepth(vec3 p, float R) {
  float Ls = max(R * 0.45, 4.0), od = 0.0;
  for (int k = 0; k < 4; k++) {
    vec3 s = p + uSun * Ls * (float(k) + 0.5);
    vec2 qs = s.xz - axisAt(s.y);
    float sH, Rs = hornR(s.y, sH), rs = length(qs);
    // The layers' mean shape, no noise: the core, then each sheath as a ring at its mean cover.
    float xs = rs / Rs, m = smoothstep(0.95, 0.75, xs) * 1.6;
    for (int j = 0; j < SHEATHS; j++) m += exp(-pow((xs - sheathR(j)) / (0.42 * gSp), 2.0)) * mix(0.45, 0.12, float(j) / float(SHEATHS - 1));
    m *= step(uH * (1.0 - uCond), s.y) * step(s.y, uH + 100.0);
    float Rd = debrisR(s.y);
    float dd = uDebris * smoothstep(Rd, Rd * 0.3, rs) * 0.6 * (1.0 - smoothstep(uDustH * 0.4, uDustH * 1.3, s.y));
    od += (funnelSig(m, Rs) + dd * 0.012) * Ls;
  }
  return od;
}

/* ---------- the world round it ---------- */
vec3 skyCol(vec3 rd) {
  // Under the base: far clear air at the horizon, darkening upward in the same hue.
  // One hue and a long ramp, so no strip of another colour shows.
  float up = max(rd.y, 0.0);
  vec3 hor = uSunCol * vec3(0.16, 0.13, 0.11) + uAmb * 0.25;
  return hor * mix(1.0, 0.4, smoothstep(0.0, 0.2, up));
}
/* ---------- the storm: the shot's blockout supercell ---------- */
// Lifted from tornado/main.js: the same shapes, plates, scud and light, in km.
// Storm space is the shot's camera space; WALL sits over the lab's axis.
const vec2 TOWER = vec2(-4.3, -23.0);
const vec2 WALL = vec2(-0.9, -8.0);
const vec2 CORE = vec2(6.5, -19.0);
// The base, in km: the deck's underside, DECK over the funnel's top.
const float BASE = 1.4;
const vec2 SHELF = vec2(1.0, -13.0);
const vec2 SHELF_R = vec2(15.0, 9.0);
const float STORM = 0.85;
// The near storm's reach round the tornado, in storm km.
const float NEAR_TOP = BASE + 1.3;
// A wide lens sees further round the tornado: the region grows so its edge stays out of frame.
float nearR() { return max(max(2.8, wallR() * 1.33), mix(4.3, 2.8, smoothstep(1.1, 2.0, uFoc))); }
// The shot's noise names, on the lab's volume: one cell per unit.
// N has four cells per unit; a quarter gives the shot's one cell per unit.
float vn3(vec3 p) { return N(p * 0.25); }
float fbm3(vec3 p) { return 0.5 * vn3(p) + 0.25 * vn3(p * 2.03 + 7.1) + 0.125 * vn3(p * 4.1 + 3.7); }
float W(vec3 p) { return texture(tNoise, p * 0.0625).g; }
float smin(float a, float b, float k) { float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0); return mix(b, a, h) - k * h * (1.0 - h); }
float stormShape(vec3 p) {
  float g = STORM;
  float top = mix(8.0, 12.5, g);
  // The updraft tower leans downshear as it climbs.
  vec2 q = p.xz - TOWER - vec2(0.28, -0.12) * (p.y - BASE);
  float rT = mix(3.5, 7.0, g) * (1.0 - 0.25 * smoothstep(BASE, 6.0, p.y) + 0.2 * smoothstep(top - 3.0, top, p.y));
  float tower = max(length(q) - rT, max(BASE + 0.1 - p.y, p.y - top));
  // The base: a broad flat shelf, its underside level.
  vec2 b = (p.xz - SHELF) / (SHELF_R * mix(0.4, 1.0, g));
  float shelf = max((length(b) - 1.0) * SHELF_R.y * mix(0.4, 1.0, g), abs(p.y - (BASE + 0.6)) - 0.6);
  // The anvil: flat on top, thin at its edge, and streaming off to the right.
  vec3 a = p - vec3(TOWER.x + mix(2.0, 14.0, g), top - 0.5, TOWER.y - 2.0);
  float anvil = max((length(a / vec3(mix(6.0, 28.0, g), 1.7, mix(4.0, 9.0, g))) - 1.0) * 1.6, p.y - top - 0.5);
  // The overshooting top domes above the anvil, over the updraft.
  vec3 o = p - vec3(TOWER.x + 0.28 * (top - BASE), top + 0.4, TOWER.y - 0.12 * (top - BASE));
  float dome = length(o * vec3(1.0, 1.6, 1.0)) / 1.6 - mix(1.4, 2.8, g);
  float d = smin(tower, shelf, 1.4);
  d = smin(d, dome, 1.2);
  d = smin(d, anvil, 2.2);
  // The horn: the deck drawn down into the funnel, one solid of turning.
  // A smooth minimum joins it to the base, so the deck's lumps and light run on down it.
  vec2 qw = p.xz - WALL;
  if (gOn > 0.0 && dot(qw, qw) < pow(gRtopKm * 1.6 + 0.3, 2.0)) {
    float y = uH + (p.y - (BASE - DECK)) * 1000.0 / uKs;
    float r = length(qw * 1000.0 / uKs + topXZ() - axisAt(y));
    float dh = hornDist(y, r) * 0.001 * uKs;
    d = smin(d, mix(4.0, dh, gOn), 0.12);
  }
  return d;
}
// Declared here, defined with the merge below.
float nearW(vec3 ps);
float shellOff(vec3 ps);
float stormD(vec3 p) {
  float d = stormShape(p);
  if (d > 2.5) return d;
  // On the horn the base's ragged noise eases, so the trumpet stays a trumpet.
  // Low on the horn, by the funnel, it eases most; up by the deck it keeps the deck's texture.
  float calm = 1.0 - gOn * (1.0 - smoothstep(gRtopKm * 1.3, gRtopKm * 2.4, length(p.xz - WALL))) * mix(0.85, 0.35, smoothstep(BASE - 0.5, BASE - 0.05, p.y)) * (1.0 - smoothstep(BASE - 0.05, BASE + 0.3, p.y));
  // Lumpy towers, a smoother anvil.
  float amp = mix(1.1, 0.45, smoothstep(9.0, 12.0, p.y)) * mix(0.55, 1.0, smoothstep(BASE + 0.5, BASE + 2.5, p.y));
  vec3 n = p * 0.75 + vec3(0.0, -uTime * 0.006, 0.0);
  d += (fbm3(n) + 0.0625 * vn3(n * 8.3) - 0.5) * amp * calm;
  // The base heaves: broad swells drift under it and breathe, so the deck undulates gently.
  float swell = (vn3(p * 0.45 + vec3(uTime * 0.03, 0.0, uTime * 0.02)) - 0.5) * (0.6 + 0.4 * sin(uTime * 0.6 + vn3(p * 0.2) * 6.28));
  swell += (vn3(p * 1.2 - vec3(uTime * 0.05, 0.0, 0.0)) - 0.5) * 0.35;
  d += swell * 0.5 * (1.0 - smoothstep(BASE + 0.3, BASE + 1.5, p.y));
  // The base: stacked plates on its flank, turning round the updraft.
  // Up close they read as contour bands: they stay off the base's underside and away from the tornado.
  float flank = smoothstep(BASE + 0.4, BASE + 0.8, p.y) * (1.0 - smoothstep(BASE + 1.6, BASE + 2.4, p.y)) * smoothstep(nearR(), nearR() * 2.2, length(p.xz - WALL));
  float turn = atan(p.z - TOWER.y, p.x - TOWER.x);
  d += 0.09 * flank * sin(p.y * 15.0 + turn * 2.0 + 1.3 * vn3(p * 1.4));
  // Fine lumps, for the near base.
  d += (vn3(p * 4.3) - 0.5) * 0.14 * (1.0 - smoothstep(BASE + 2.0, BASE + 4.0, p.y)) * calm;
  // Ragged scud hangs under the base, with Worley lumps in it.
  float low = (1.0 - smoothstep(BASE - 0.2, BASE + 0.4, p.y)) * calm;
  d += low * (vn3(p * 3.1 + vec3(uTime * 0.01, 0.0, 0.0)) - 0.45) * 0.55;
  // Rounded lumps hang from the underside, in two sizes.
  float under = (1.0 - smoothstep(BASE - 0.1, BASE + 0.7, p.y)) * mix(1.0, calm, 0.6);
  return d - under * ((W(p * 2.6 + 1.7) - 0.35) * 0.32 + (W(p * 8.0) - 0.35) * 0.16);
}
// The colour of one storm sample.
vec3 stormLit(vec3 p, float d) {
  // A step toward the sun: thinner cloud there means this side is lit.
  float ds = stormD(p + uSun * 0.9);
  float lit = clamp((ds - d) / 0.9 * 0.8 + 0.3, 0.0, 1.0);
  // A step up: deeper cloud above means an underside, out of the sun.
  float under = clamp((d - stormD(p + vec3(0.0, 0.4, 0.0))) / 0.4, 0.0, 1.0);
  // The horn lies under the deck: it takes the underside's shade, not the flank's light.
  under = max(under, gOn * (1.0 - smoothstep(gRtopKm * 1.3, gRtopKm * 2.4, length(p.xz - WALL))) * (1.0 - smoothstep(BASE - 0.1, BASE + 0.3, p.y)));
  lit *= 1.0 - 0.9 * under;
  float up = smoothstep(0.6, 9.0, p.y);
  // The core: between the updraft and the rain, low down.
  vec2 cc = mix(TOWER, CORE, 0.55);
  float core = (1.0 - smoothstep(3.0, 9.0, length(p.xz - cc))) * (1.0 - smoothstep(3.0, 8.0, p.y));
  vec3 amb = uAmb * mix(0.08, 0.85, up) * (1.0 - 0.7 * under);
  // The lower flank stays dark: the storm's own bulk shades it.
  vec3 c = uSunCol * lit * lit * mix(0.14, 0.8, up * up) + amb;
  // The core goes black-green behind its rain.
  return mix(c, c * vec3(0.22, 0.46, 0.38), core * 0.9);
}
// Marches the storm from ro, in km. Returns colour and cover; tHit is the first hit in km.
// jit offsets the first step inside the cloud, so the steps leave no contour bands.
vec4 storm(vec3 ro, vec3 rd, float jit, out float tHit) {
  float t = 0.05, T = 1.0;
  bool outside = true;
  vec3 acc = vec3(0.0);
  tHit = 120.0;
  for (int i = 0; i < 120; i++) {
    vec3 p = ro + rd * t;
    if (p.y > 16.0 || (rd.y < 0.0 && p.y < -0.5) || t > 110.0 || T < 0.03) break;
    float d = stormD(p);
    // The soft edge and the inner step grow with distance: crisp near, smooth far.
    float soft = max(0.025, t * 0.005);
    // Round the tornado the main march draws the storm as volume: the shell fades out there.
    float keep = 1.0 - shellOff(p);
    if (d < soft && outside) { outside = false; t += (0.03 + 0.006 * t) * jit; continue; }
    if (d < soft) {
      if (tHit > 119.0 && keep > 0.5) tHit = t;
      float a = clamp(0.5 - d / soft, 0.0, 1.0) * 0.8 * keep;
      acc += T * a * stormLit(p, d);
      T *= 1.0 - a;
      t += 0.03 + 0.006 * t;
    // A step scale per pixel keeps grazing rays off one shared lattice: no stripes.
    } else t += (d * 0.75 + 0.01 * t) * (0.85 + 0.3 * jit);
  }
  return vec4(acc, 1.0 - T);
}
// A ray's length inside an upright cylinder at c, in storm km; x is where it enters.
vec2 stormCyl(vec3 ro, vec3 rd, vec2 c, float r, float y0, float y1) {
  return cylinder(ro - vec3(c.x, 0.0, c.y), rd, r, y0, y1);
}
/* ---------- the merge: near the tornado the storm is density in the funnel's own volume ---------- */
// Lab metres to storm km: the funnel's top sits DECK under the deck.
vec3 toStorm(vec3 p) {
  vec2 q = (p.xz - topXZ()) * 0.001 * uKs;
  return vec3(WALL.x + q.x, BASE - DECK + (p.y - uH) * 0.001 * uKs, WALL.y + q.y);
}
// 1 where the storm is volume near the tornado; 0 where the shell backdrop draws it.
float nearW(vec3 ps) {
  float r = length(ps.xz - WALL);
  float nr = nearR();
  return (1.0 - smoothstep(nr * 0.8, nr, r)) * (1.0 - smoothstep(NEAR_TOP - 0.3, NEAR_TOP, ps.y));
}
// Where the shell backdrop gives way to the volume. It goes before the volume fades,
// so the two overlap: no ring of thin cloud where both fade at once.
float shellOff(vec3 ps) {
  float r = length(ps.xz - WALL);
  float nr = nearR();
  return (1.0 - smoothstep(nr * 0.55, nr * 0.8, r)) * (1.0 - smoothstep(NEAR_TOP - 0.7, NEAR_TOP - 0.3, ps.y));
}
// The near storm's density at a lab point, 0 to 1. ps and d return its storm point and distance.
// It turns with the funnel's outer sheath round the axis, and holds still toward its edge.
float nearCloud(vec3 p, out vec3 ps, out float d) {
  vec2 q = p.xz - topXZ();
  float k = 1.0 - smoothstep(nearR() * 0.25, nearR() * 0.65, length(q) * 0.001 * uKs);
  float a = uPh[5].x;
  vec2 qr = mix(q, mat2(cos(a), sin(a), -sin(a), cos(a)) * q, k);
  ps = toStorm(vec3(qr.x + topXZ().x, p.y, qr.y + topXZ().y));
  d = stormD(ps);
  // A soft shell turns the distance into density.
  return smoothstep(0.035, -0.035, d) * nearW(ps);
}
// The storm's shade on a lab point: its shape along the sun ray.
// Two steps near the point, then where the ray meets the base's height and a little past it:
// a high sun is cut off by the storm overhead; a low one slips under the base.
float cloudShade(vec3 p) {
  float od = 0.0;
  od += smoothstep(0.06, -0.06, stormShape(toStorm(p + uSun * 80.0))) * 80.0;
  od += smoothstep(0.06, -0.06, stormShape(toStorm(p + uSun * 260.0))) * 180.0;
  float L = (max(gDeck - p.y, 0.0) + 60.0) / max(uSun.y, 0.03);
  if (L < 20000.0) {
    od += smoothstep(0.06, -0.06, stormShape(toStorm(p + uSun * L))) * 300.0;
    od += smoothstep(0.06, -0.06, stormShape(toStorm(p + uSun * (L + 400.0)))) * 300.0;
  }
  return od * 0.006;
}
// How far up the join a height is: 0 on the funnel, 1 where the horn meets the deck.
// The ramp eases at both ends, so the tone has no step at either end.
float topKAt(float h) { return smoothstep(gY0, gDeck, h); }
vec3 groundCol(vec3 P, float t) {
  float n = fbm(vec3(P.x * 0.01, 0.0, P.z * 0.03), 3);
  vec3 alb = mix(vec3(0.3, 0.2, 0.08), vec3(0.5, 0.37, 0.15), n);
  // Wind sheen over the wheat.
  float g = smoothstep(0.5, 0.8, N(vec3(P.x * 0.004 - uTime * 0.03, 0.3, P.z * 0.008)));
  alb = mix(alb, vec3(0.55, 0.47, 0.3), g * 0.4);
  return alb * (uSunCol * 0.5 + uAmb * 0.5);
}

void main() {
  hornInit();
  vec2 fc = gl_FragCoord.xy + uJit;
  float asp = uRes.x / uRes.y;
  vec2 s = vec2((fc.x / uRes.x - 0.5) * asp, fc.y / uRes.y - uHz);
  vec3 rd = normalize(vec3(s, -uFoc));
  vec3 ro = vec3(0.0, CAMH, uDist);
  // The background, and how far the volume may reach.
  vec3 bg;
  float tMax;
  float jit = hash(fc + fract(uTime * 7.31) * 113.0);
  if (uMode == 2) {
    vec4 bk = texelFetch(tBg, ivec2(gl_FragCoord.xy), 0);
    bg = bk.rgb;
    tMax = bk.a;
  } else if (rd.y < 0.0) {
    tMax = CAMH / -rd.y;
    vec3 P = ro + rd * tMax;
    // The wheat lies in the storm's shadow where the sun cannot get under the base.
    bg = groundCol(P, tMax) * mix(0.35, 1.0, exp(-cloudShade(P)));
    bg = mix(bg, skyCol(vec3(rd.x, 0.0, rd.z)), 1.0 - exp(-tMax / 14000.0));
  } else {
    // The far storm: the blockout's shell, faded out round the tornado, where the volume takes over.
    vec3 rk = toStorm(ro);
    bg = skyCol(rd);
    // The sky dims round the storm: its shadow and its outflow haze.
    float near = dot(rd, normalize(vec3(SHELF.x, 4.0, SHELF.y) - rk));
    bg *= mix(1.0, 0.55, smoothstep(0.8, 0.98, near));
    float tHit;
    vec4 st = storm(rk, rd, jit, tHit);
    float hz = 1.0 - exp(-tHit / 70.0);
    bg = bg * (1.0 - st.a) + mix(st.rgb, skyCol(vec3(rd.x, 0.0, rd.z)) * st.a, hz * 0.8);
    // Under the base: the gloom, and the rain curtain hanging out of the core.
    // Both reach down to the lab's ground, so neither floats over the horizon.
    float gnd = rk.y - CAMH * 0.001 * uKs;
    vec2 gl = stormCyl(rk, rd, SHELF, SHELF_R.y * mix(0.4, 0.95, STORM), gnd, BASE + 0.2);
    vec2 rn = stormCyl(rk, rd, CORE, mix(1.3, 4.6, STORM), gnd, BASE + 0.4);
    vec3 gloom = uAmb * vec3(0.05, 0.085, 0.075);
    bg = mix(bg, gloom, 1.0 - exp(-gl.y * gl.y * 0.003 * STORM));
    float streak = 0.75 + 0.25 * N(vec3(atan(rd.x, -rd.z) * 60.0, 0.5, 0.0));
    // The rain shaft: a grey veil of the far air, soft at its sides, densest through its middle.
    float rR = mix(1.3, 4.6, STORM);
    vec3 rainC = mix(skyCol(vec3(rd.x, 0.0, rd.z)) * 0.45, gloom * vec3(0.8, 1.0, 0.95), 0.5);
    bg = mix(bg, rainC, (1.0 - exp(-rn.y * 0.45 * STORM * streak)) * smoothstep(0.0, 0.9, rn.y / (2.0 * rR)) * 0.85);
    tMax = tHit * 1000.0 / uKs;
  }
  // One volume march through two regions: A, the funnel's cylinder; C, the near storm round it.
  vec3 o3 = vec3(topXZ().x, 0.0, topXZ().y);
  float Rb = max(uR0 * max(uFlare * 2.0, 2.6), (radiusAt(uH) + hornA()) * 1.3) + uLean + uSway * 2.0 + 140.0;
  vec2 cy = cylinder(ro, rd, Rb, 0.0, gDeck + 60.0);
  float tA0 = cy.y > 0.0 ? cy.x : 1e9, tA1 = cy.y > 0.0 ? cy.x + cy.y : -1.0;
  // A baked pixel with alpha below zero is whole: its ray misses the funnel's column.
  if (uMode == 2 && tMax < 0.0) {
    vec3 prevW = texture(tPrev, gl_FragCoord.xy / uRes).rgb;
    outC = vec4(mix(prevW, bg, uBlend), 1.0);
    return;
  }
  // The bake keeps only the backdrop where the ray meets the funnel's column.
  if (uMode == 1 && cy.y > 0.0) {
    vec3 old = texelFetch(tBg, ivec2(gl_FragCoord.xy), 0).rgb;
    outC = vec4(mix(old, bg, uBlend), min(tMax, 60000.0));
    return;
  }
  vec2 cc2 = cylinder(ro - o3, rd, nearR() * 1000.0 / uKs, uH - 200.0, uH + (NEAR_TOP - BASE + DECK) * 1000.0 / uKs);
  float tC0 = cc2.y > 0.0 ? cc2.x : 1e9, tC1 = cc2.y > 0.0 ? cc2.x + cc2.y : -1.0;
  float tEnd = min(max(tA1, tC1), tMax);
  vec3 acc = vec3(0.0);
  float T = 1.0;
  float t = min(tA0, tC0);
  bool offDeck = true;
  if (t < tEnd) {
    float dtv = tA1 > tA0 ? (tA1 - tA0) / float(uSteps) : 50.0;
    // A full step of jitter, so the steps leave no wood grain.
    t += dtv * jit;
    float cosT = dot(rd, uSun);
    // Two lobes: some light bounces back toward the eye, most runs on.
    float ph0 = mix(hg(cosT, 0.6), hg(cosT, -0.25), 0.55);
    float ph1 = mix(hg(cosT, 0.3), hg(cosT, -0.1), 0.55);
    vec3 skyH = skyCol(vec3(rd.x, 0.0, rd.z));
    for (int i = 0; i < 360; i++) {
      if (t > tEnd || T < 0.01) break;
      bool inA = t >= tA0 && t <= tA1, inC = t >= tC0 && t <= tC1;
      if (!inA && !inC) {
        // Jump to the next region.
        float nx = 1e9;
        if (tA0 > t) nx = min(nx, tA0);
        if (tC0 > t) nx = min(nx, tC0);
        if (nx > 1e8) break;
        t = nx + 0.01;
        continue;
      }
      vec3 p = ro + rd * t;
      float st = 1e9, sig = 0.0;
      vec3 sum = vec3(0.0);
      if (inA) {
        vec2 q = p.xz - axisAt(p.y);
        float sH, r = length(q), R = hornR(p.y, sH);
        // The pixel's size in metres where the ray is now.
        float foot = t / (uRes.y * uFoc);
        gSp = max(0.2, 3.5 * foot / R);
        gAng = clamp(R * 0.06 / foot, 0.3, 1.0);
        float Rout = R * (1.25 + 4.0 * gSp) + 2.0;
        // Fine steps inside the funnel, long ones outside it.
        float fine = clamp(R * 0.045, 0.3, dtv);
        st = r < Rout ? fine : min(dtv, max((r - Rout) * 0.8, fine));
        float u;
        float dc = r < Rout ? funnelD(p, u, 4) : 0.0;
        u = clamp(p.y / uH, 0.0, 1.0);
        float d, w;
        vol(p, d, w);
        float sc = funnelSig(dc, R), sd = d * 0.014, sw = w * 0.0012;
        if (sc + sd + sw > 1e-6) {
          // Sunlight through the funnel, the dust and, near the top, the storm above.
          // Up the horn the tone turns to the storm's own.
          // Below F1 the horn is a lowering of the base: it takes the storm's tone all the way down.
          float topK = max(topKAt(p.y), 1.0 - smoothstep(0.0, 0.5, uCond));
          float od = sunDepth(p, R) + cloudShade(p);
          vec3 sunL = uSunCol * (exp(-od) * ph0 + 0.5 * exp(-od * 0.4) * ph1 + 0.12 * exp(-od * 0.16)) * (1.0 - 0.6 * uDark);
          // Sky light falls off with depth into the funnel.
          float depth = max(0.0, 1.6 - r / R);
          // Under the base the sky light comes mostly from the warm horizon, the same light as the deck's.
          vec3 ambC = mix(uAmb * vec3(0.85, 0.95, 1.15), skyH * 0.9, 0.3 + 0.4 * topK);
          vec3 ambL = ambC * (0.3 + 0.55 * u) * exp(-depth * 1.6);
          // Bounce from the sunlit wheat warms the lower funnel from below.
          ambL += uSunCol * vec3(0.55, 0.42, 0.22) * 0.07 * (1.0 - u) * exp(-depth * 1.2);
          vec3 alb = vec3(0.9, 0.91, 0.93) * mix(1.0, 0.1, uDark);
          alb = mix(alb, vec3(0.45, 0.36, 0.27) * mix(1.0, 0.45, uDark), (1.0 - smoothstep(0.0, 0.35, u)) * uDebris);
          vec3 fc3 = alb * (sunL * 0.6 + ambL * 0.8);
          // Near the top the funnel takes the storm's own tone: it darkens up into the wall cloud.
          // Up the horn the cloud takes the light of the deck's hanging lumps just above it, so no seam shows.
          if (topK > 0.0) { vec3 pt = toStorm(p); pt.y = max(pt.y, BASE - 0.12); fc3 = mix(fc3, stormLit(pt, stormD(pt)), topK); }
          vec3 dcol = vec3(0.42, 0.32, 0.22) * mix(1.0, 0.35, uDark) * (uSunCol * exp(-od) * 0.5 * (1.0 - 0.6 * uDark) + uAmb * (0.3 + 0.35 * u) * 0.8);
          vec3 wcol = vec3(0.21) * (ambC * 0.7 + uSunCol * exp(-od) * 0.05);
          float hzF = 1.0 - exp(-t / 30000.0);
          // ?dbg=5 paints the funnel red, to tell it from the deck.
          if (uDbg > 4.5) fc3 = vec3(0.6, 0.05, 0.03) * (0.4 + 0.6 * clamp(sunL.r, 0.0, 1.0));
          sum += mix(fc3, skyH * 0.45, hzF) * sc + mix(dcol, skyH * 0.45, hzF) * sd + mix(wcol, skyH * 0.45, hzF) * sw;
          sig += sc + sd + sw;
        }
      }
      if (inC) {
        vec3 ps;
        float dS;
        float dn = uDbg > 3.5 && uDbg < 4.5 ? 0.0 : nearCloud(p, ps, dS);
        // Outside the cloud, step by its distance; inside, short steps.
        // A ray that skims the underside keeps a floor on its step, scaled by distance.
        float sC = dS > 0.035 ? max((dS - 0.035) * 1000.0 / uKs * 0.7, max(6.0, t * 0.003)) : clamp(t * 0.005, 6.0, 30.0);
        // The first step into the deck is a random part of a step: no contour bands.
        if (dS <= 0.035 && offDeck) sC *= max(jit, 0.05);
        offDeck = dS > 0.035;
        st = min(st, sC);
        if (dn > 0.003) {
          vec3 ccl = stormLit(ps, dS);
          // ?dbg=5 paints the deck blue.
          if (uDbg > 4.5) ccl = vec3(0.03, 0.08, 0.5) * (0.5 + 4.0 * dot(ccl, vec3(0.33)));
          float hzS = (1.0 - exp(-t * 0.001 * uKs / 70.0)) * 0.8;
          float scl = dn * 0.01;
          sum += mix(ccl, skyH, hzS) * scl;
          sig += scl;
        }
      }
      if (sig > 1e-6) {
        float a = 1.0 - exp(-sig * st);
        acc += T * a * sum / sig;
        T *= 1.0 - a;
      }
      t += st;
    }
  }
  vec3 col = bg * T + acc;
  // Elsewhere the bake keeps the whole picture: the backdrop and the near deck.
  if (uMode == 1) {
    vec3 old = texelFetch(tBg, ivec2(gl_FragCoord.xy), 0).rgb;
    outC = vec4(mix(old, col, uBlend), -1.0);
    return;
  }
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
// A 64 cube that tiles. Red: value noise, smoothed twice, so trilinear lookups read as soft noise.
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
  // Green: tiling Worley cells, eight voxels wide, one seed each; 1 at a seed, 0 far from all.
  const G = 8, C = S / G, seeds = new Float32Array(C * C * C * 3);
  for (let i = 0; i < C * C * C * 3; i++) { seed = (seed * 1664525 + 1013904223) >>> 0; seeds[i] = seed / 4294967296; }
  const bytes = new Uint8Array(n * 2);
  for (let z = 0; z < S; z++) for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const cx = Math.floor(x / G), cy = Math.floor(y / G), cz = Math.floor(z / G);
    let best = 1e9;
    for (let dz = -1; dz <= 1; dz++) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const nx = cx + dx, ny = cy + dy, nz = cz + dz;
      const k = ((((nz % C) + C) % C) * C + (((ny % C) + C) % C)) * C + (((nx % C) + C) % C);
      const px = (nx + seeds[k * 3]) * G - x, py = (ny + seeds[k * 3 + 1]) * G - y, pz = (nz + seeds[k * 3 + 2]) * G - z;
      best = Math.min(best, px * px + py * py + pz * pz);
    }
    const i = idx(x, y, z);
    bytes[i * 2] = Math.round(255 * (a[i] - lo) / (hi - lo));
    bytes[i * 2 + 1] = Math.round(255 * Math.max(0, 1 - Math.sqrt(best) / (G * 0.95)));
  }
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_3D, tex);
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
  gl.texImage3D(gl.TEXTURE_3D, 0, gl.RG8, S, S, S, 0, gl.RG, gl.UNSIGNED_BYTE, bytes);
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
  // Time shows as a clock; the rest as numbers.
  const clock = v => `${Math.floor(v)}:${String(Math.round((v % 1) * 60) % 60).padStart(2, '0')}`;
  const show = () => { if (out) out.textContent = id === 'tod' ? clock(+el.value) : (+el.value).toFixed(el.step < 1 ? 2 : 0); };
  el.addEventListener('input', show);
  show();
  return () => +el.value;
};
const K = { spin: knob('spin'), amp: knob('amp'), deb: knob('deb'), dist: knob('dist'), lens: knob('lens'), tod: knob('tod'), az: knob('az'), steps: knob('steps'), res: knob('res') };
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
toggle('bake', on => { baking = on; bakeAll = true; });
// A knob change bakes the whole backdrop again.
document.querySelector('.panel').addEventListener('input', () => { bakeAll = true; });
toggle('knobsBtn', on => document.getElementById('panel').classList.toggle('min', !on));
// QA and links: ?f=4.5, ?morph, ?t=12 (start time), ?still (no history blend).
const qs = new URLSearchParams(location.search);
if (qs.has('f')) { f = fShown = clamp(+qs.get('f'), 0, 5); fEl.value = String(f); }
if (qs.has('morph')) { morph = true; $('morph').setAttribute('aria-pressed', 'true'); }
if (qs.has('t')) simT = +qs.get('t');

// The sun by time of day and direction. hour: 12 to 21. azDeg: 0 behind the eye, 90 to its left, 180 ahead.
function light(hour, azDeg) {
  // Height: 62 degrees early in the afternoon, down to the horizon near 20:50, six below by 21:00.
  const x = clamp((hour - 13) / 7.8);
  const el = (62 * Math.cos(x * Math.PI / 2) - 6 * clamp((hour - 20.8) / 0.2)) * Math.PI / 180;
  const az = azDeg * Math.PI / 180, sinEl = Math.sin(el);
  const sun = [-Math.sin(az) * Math.cos(el), sinEl, Math.cos(az) * Math.cos(el)];
  // Colour: light through more air reddens; Kasten's air mass, capped at the horizon.
  const mass = 1 / (Math.max(sinEl, 0) + 0.15 * Math.pow(Math.max(el * 180 / Math.PI, 0) + 3.885, -1.253));
  const up = clamp((sinEl + 0.02) / 0.05);
  const sunCol = [0.08, 0.18, 0.42].map(k => 3 * Math.exp(-k * mass * 0.5) * up);
  // Sky light: bright blue by day, dim and blue after the sun goes.
  const day = sinEl < -0.12 ? 0 : sinEl > 0.6 ? 1 : ((sinEl + 0.12) / 0.72) ** 2 * (3 - 2 * (sinEl + 0.12) / 0.72);
  const amb = [0.3, 0.35, 0.46].map(v => v * (0.55 + 0.7 * day));
  return { sun, sunCol, amb };
}

// G is the baked backdrop on screen; G2 fills strip by strip behind it.
let G = null, G2 = null, bakeRow = 0, bakeAll = true, baking = true;
// The backdrop renews in this many strips, one strip a frame.
const STRIPS = 8;
let A = null, B = null, w = 0, h = 0, frame = 0, last = 0, fpsT = 0, fpsN = 0;
function size() {
  const dpr = Math.min(devicePixelRatio || 1, 2);
  const cw = Math.round(canvas.clientWidth * dpr), ch = Math.round(canvas.clientHeight * dpr);
  if (canvas.width !== cw || canvas.height !== ch) { canvas.width = cw; canvas.height = ch; }
  const rw = Math.max(64, Math.round(cw * K.res())), rh = Math.max(64, Math.round(ch * K.res()));
  if (rw !== w || rh !== h) {
    free(gl, A); free(gl, B); free(gl, G); free(gl, G2);
    w = rw; h = rh;
    A = target(gl, w, h, { clear: true }); B = target(gl, w, h, { clear: true });
    G = target(gl, w, h, { clear: true, filter: gl.NEAREST }); G2 = target(gl, w, h, { clear: true, filter: gl.NEAREST });
    bakeAll = true;
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
  const L = light(K.tod(), K.az());
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
  // The camera moves in on thin funnels, but keeps the horn and the deck in frame.
  // The Distance knob multiplies on top.
  const frameK = 0.76 + 0.24 * Math.min(1, Math.max(0, fk / 3.5)) ** 1.5;
  const dist = (850 + 160) * foc / 0.47 * K.dist() * frameK;
  set(sc, 'uDist', dist);
  set(sc, 'uKs', 8000 / dist);
  // A light history: enough to calm the march's grain, too little to smear the spin.
  set(sc, 'uBlend', frame === 0 || qs.has('still') ? 1 : paused ? 0.15 : 0.55);
  set(sc, 'uDbg', qs.has('dbg') ? +qs.get('dbg') || 1 : 0);
  set(sc, 'uSpin', K.spin());
  spinLayers(moving ? dt : 0, fShown, K.spin());
  gl.uniform2fv(sc.u.uPh, phase);
  set(sc, 'uZs', zsNow);
  set(sc, 'uDs', dsNow);
  set(sc, 'uAmp', K.amp());
  set(sc, 'uFk', fk / 5);
  gl.uniform1i(sc.u.uSteps, K.steps());
  set(sc, 'uSun', L.sun); set(sc, 'uSunCol', L.sunCol); set(sc, 'uAmb', L.amb);
  set(sc, 'uH', 850);
  for (const [u, k] of [['uR0', 'r0'], ['uFlare', 'flare'], ['uProf', 'prof'], ['uVmax', 'vmax'], ['uCond', 'cond'], ['uDustH', 'dustH'], ['uMulti', 'multi'], ['uRain', 'rain'], ['uDark', 'dark'], ['uLean', 'lean'], ['uSway', 'sway']]) set(sc, u, at(k, fk));
  set(sc, 'uDebris', at('debris', fk) * K.deb());
  const blendMain = frame === 0 || qs.has('still') ? 1 : paused ? 0.15 : 0.55;
  gl.uniform1i(sc.u.tBg, 2);
  gl.activeTexture(gl.TEXTURE2);
  gl.bindTexture(gl.TEXTURE_2D, G.tex);
  if (baking) {
    gl.uniform1i(sc.u.uMode, 1);
    if (bakeAll) {
      // A knob or a new size bakes the whole backdrop at once.
      set(sc, 'uBlend', 1);
      tri(gl, G2, vao);
      [G, G2] = [G2, G];
      bakeRow = 0;
      bakeAll = false;
    } else {
      const rows = Math.ceil(h / STRIPS);
      set(sc, 'uBlend', 0.5);
      gl.enable(gl.SCISSOR_TEST);
      to(gl, G2);
      gl.scissor(0, bakeRow * rows, w, rows);
      tri(gl, G2, vao);
      gl.disable(gl.SCISSOR_TEST);
      if (++bakeRow === STRIPS) { [G, G2] = [G2, G]; bakeRow = 0; }
    }
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, G.tex);
  }
  gl.uniform1i(sc.u.uMode, baking ? 2 : 0);
  set(sc, 'uBlend', blendMain);
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
  if (now - fpsT > 1000) { document.getElementById('fps').textContent = `${Math.round(fpsN * 1000 / (now - fpsT))} fps · ${w}×${h} · ${baking ? 'baked' : 'live'} backdrop`; fpsT = now; fpsN = 0; }
}
// The app's own window shares the GPU, so the lab draws 30 frames a second at most.
const FRAME_MS = 1000 / 30;
let raf = 0, lastDraw = -1e9, still = 0;
function loop(now) {
  raf = 0;
  if (document.hidden) return;
  // A hidden pane gives the canvas no size: draw nothing.
  if (canvas.clientWidth && canvas.clientHeight && now - lastDraw >= FRAME_MS - 2) {
    lastDraw = now;
    draw(now);
    still = paused && Math.abs(f - fShown) < 1e-3 ? still + 1 : 0;
  }
  // A paused lab rests once its history settles.
  if (still <= 45) raf = requestAnimationFrame(loop);
}
// Any input wakes a resting lab.
const wake = () => { still = 0; if (!raf && !document.hidden) { last = 0; raf = requestAnimationFrame(loop); } };
for (const ev of ['visibilitychange', 'input', 'click', 'keydown']) document.addEventListener(ev, wake);
addEventListener('resize', wake);
for (const id of ['res']) $(id).addEventListener('input', () => size());
raf = requestAnimationFrame(loop);
// Times n frames with a pixel read, free of the screen's frame clock.
window.__bench = (n = 12, bake = baking) => {
  const was = baking, px = new Uint8Array(4);
  baking = bake;
  bakeAll = true;
  for (let i = 0; i < 3; i++) draw(performance.now());
  gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
  const t0 = performance.now();
  for (let i = 0; i < n; i++) { draw(t0 + i * 33); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); }
  const ms = (performance.now() - t0) / n;
  baking = was;
  bakeAll = true;
  return Math.round(ms * 10) / 10;
};
window.__lab = { get f() { return fShown; }, set f(v) { f = fShown = v; } };
