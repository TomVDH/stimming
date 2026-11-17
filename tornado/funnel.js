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
// The scene's knobs, each a Dev row: group, id, label, range, step and default.
// The defaults start from the lab's approved set (Tom, 2026-11-16).
// The scene is denser, brighter and less dark (Tom: "poppier and more reflective", "a lot more opaque").
export const KNOBS = [
  ['Funnel', 'dens', 'Opacity', 0.1, 6, 0.05, 2.4],
  ['Funnel', 'sheath', 'Sheaths', 0, 2, 0.01, 0.35],
  ['Funnel', 'edge', 'Core edge', 0, 1.6, 0.01, 0.8],
  ['Funnel', 'rim', 'Rim blend', 0, 1, 0.01, 0.6],
  ['Funnel', 'trans', 'Light through', 0, 1, 0.01, 0.4],
  ['Funnel', 'amp', 'Turbulence', 0, 1.5, 0.01, 0.63],
  ['Funnel', 'spin', 'Spin', 0, 3, 0.01, 1],
  ['Colour', 'alb', 'Reflectivity', 0.2, 1.5, 0.01, 0.9],
  ['Colour', 'sunK', 'Sunlit weight', 0, 2, 0.01, 0.85],
  ['Colour', 'ambK', 'Ambient', 0, 3, 0.01, 1.1],
  ['Colour', 'darkK', 'Darkness', 0, 1.5, 0.01, 0.55],
  ['Colour', 'hazeK', 'Haze on funnel', 0, 2, 0.01, 1],
  ['Colour', 'topK', 'Top darkening', 0, 2, 0.01, 0.6],
  ['Colour', 'dustK', 'Dust tint', 0, 2, 0.01, 1],
  ['Shape', 'width', 'Width', 0.5, 3, 0.01, 1],
  ['Shape', 'flare', 'Flare', 0, 2, 0.01, 1],
  ['Shape', 'lean', 'Lean', 0, 2, 0.01, 1],
  ['Shape', 'sway', 'Sway', 0, 2, 0.01, 1],
  ['Shape', 'reach', 'Reach', -0.5, 0.5, 0.01, 0],
  ['Dust', 'debris', 'Debris', 0, 2, 0.01, 0.58],
  ['Dust', 'dustH', 'Dust height', 0.3, 2.5, 0.01, 1],
  ['Deck whirl', 'spTurn', 'Turn', 0, 3, 0.01, 1],
  ['Deck whirl', 'spIn', 'Inflow', 0, 0.1, 0.001, 0.025],
  ['Deck whirl', 'spTwist', 'Twist', -3, 3, 0.05, 1.4],
  ['Deck whirl', 'spR', 'Reach', 0.3, 2.5, 0.01, 1],
  // The Cloud tube only: its bands' strength and count, and its noise's stretch up the tube.
  ['Tube', 'tbBands', 'Bands', 0, 3, 0.01, 1],
  ['Tube', 'tbCount', 'Band count', 0, 5, 1, 5],
  ['Tube', 'tbStretch', 'Stretch', 0.2, 1.5, 0.01, 0.6],
];
// The live values, by id. main.js sets them from Dev, the address or the defaults.
export const KNOB = Object.fromEntries(KNOBS.map(k => [k[1], k[6]]));
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
// Green: tiling Worley cells, for the lumps under the deck. It matches noiseVolume() in tornado/lab.js.
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
  // Worley cells eight voxels wide, one seed each: 1 at a seed, 0 far from all.
  const G = 8, C = S / G, seeds = new Float32Array(C * C * C * 3);
  for (let i = 0; i < C * C * C * 3; i++) { seed = (seed * 1664525 + 1013904223) >>> 0; seeds[i] = seed / 4294967296; }
  const wrap = v => ((v % C) + C) % C;
  const bytes = new Uint8Array(n * 2);
  for (let z = 0; z < S; z++) for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const cx = Math.floor(x / G), cy = Math.floor(y / G), cz = Math.floor(z / G);
    let best = 1e9;
    for (let dz = -1; dz <= 1; dz++) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const nx = cx + dx, ny = cy + dy, nz = cz + dz, k = (wrap(nz) * C + wrap(ny)) * C + wrap(nx);
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
 * @param {boolean} [tube]  True builds the Cloud tube in place of the shells.
 */
export const funnelFS = (sky, storm, tube = false) => /* glsl */`#version 300 es
${tube ? '#define TUBE' : ''}
precision highp float;
out vec4 outC;
// The storm GLSL below declares tNoise, the noise volume.
uniform sampler2D tPrev;
uniform vec2 uRes, uJit;
uniform float uBlend;
// QA: 1 writes the work per pixel instead of the picture.
uniform int uCount;
// The far field: 1 bakes the deck past uFarD km into its own picture; 0 marches the near field live
// and lays the baked far field (tFar) behind it. The two cross over a 2 km band, so no seam shows.
uniform int uMode;
uniform float uFarD;
uniform sampler2D tFar;
// Light through: how much sun passes through the funnel's own body, 0 to 1.
uniform float uTrans;
// Dev's knobs, live: the funnel's shape terms and its colour terms. KNOBS in funnel.js lists them.
uniform float uWid, uSheathK, uEdgeW, uAmp, uAlb, uSunK, uAmbK, uHazeK, uTopDark, uDustK;
// Rim blend: a grazing ray sees thinner core, so the lit rim blends, 0 to 1.
uniform float uRim;
#ifdef TUBE
// The tube's own knobs: band strength, band count, and the stretch up the tube.
uniform float uTbBands, uTbCount, uTbStretch;
// Dev's God rays: the strength of the sun's shafts in the haze, 0 to 1.
uniform float uGod;
#endif
// The scene's own uniforms, the same values as the scene pass.
uniform vec3 uSun, uSunCol, uAmb, uZen, uMid, uBand, uAnti;
uniform float uFoc, uHz, uYaw, uStorm, uT;
// The tornadoes, nearest first. main.js packs each one; see pick().
uniform int uN;
// The wind's direction in camera space: the funnels lean and bow along it.
uniform vec2 uWindC;
uniform vec4 uTA[${MAX_FUNNELS}], uTB[${MAX_FUNNELS}], uTC[${MAX_FUNNELS}], uTD[${MAX_FUNNELS}], uTE[${MAX_FUNNELS}], uTF[${MAX_FUNNELS}];
// Spin angle and climb, seven layers per tornado: the core, five sheaths, the dust.
uniform vec2 uPhs[${MAX_FUNNELS * 7}];
${sky}
${storm}

// The lab's approved knob values.
// A step through the onion is this share of its radius: the lab's 60 steps.
// The tube samples its volume, so it takes steps half as long.
#ifdef TUBE
const float K_ON = 0.15;
#else
const float K_ON = 0.3;
#endif

// One tornado's values, set by pick(). The names are the lab's uniforms.
float uH, uDeckY, uR0, uFlare, uProf, uVmax, uCond, uDebris, uDustH, uRain, uDark, uLean, uSway, uFk, uDs, uZs, uRope, uSeed, uTime, uLabM, uFade, uDens, uBow;
// The foot in camera space, in metres.
vec3 gFoot;
int gI;
// The haze colour on this ray, and its share at the funnel's distance.
vec3 gHzC;
// The gloom under the base: its colour, this ray's stretch inside it in km, and its share at the march's place.
// Each sample takes only the gloom in front of it, so a funnel is not dimmed by the air behind it.
vec3 gGloom;
vec2 gGl;
float gGk = 0.0;
vec3 hazed(vec3 c, float hz) { return mix(mix(c, gHzC, hz), gGloom, gGk); }
void pick(int i) {
  vec4 a = uTA[i], b = uTB[i], c = uTC[i], d = uTD[i], e = uTE[i], f = uTF[i];
  gFoot = vec3(a.x, 0.0, a.y); uH = a.z; uDeckY = a.w;
  uR0 = b.x; uFlare = b.y; uProf = b.z; uVmax = b.w;
  uCond = c.x; uDebris = c.y; uDustH = c.z; uRain = c.w;
  uDark = d.x; uLean = d.y; uSway = d.z; uFk = d.w;
  uDs = e.x; uZs = e.y; uRope = e.z; uSeed = e.w;
  uLabM = f.x; uFade = f.y; uDens = f.z; uBow = f.w;
  // Each tornado sways on its own clock.
  uTime = uT + uSeed * 40.0;
  gI = i * 7;
}
vec2 phOf(int k) { return uPhs[gI + k]; }

// N, the noise volume's lookup, comes with the storm GLSL.
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
  vec2 o = uWindC * uLean * u * u;
  // The wind bows the lower and middle trunk downwind; the top stays under its whirl.
  o += uWindC * uBow * sin(u * 3.1416) * (1.0 - 0.35 * u);
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
// gPxM: one pixel's size in metres where the ray is.
float gPxM = 1.0;
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
// The horn's strength: none until the funnel forms.
float hornOn() { return smoothstep(0.0, 0.35, uCond); }
// Where the flare starts: a shallow sag under the deck, down to the bell's foot as it forms.
// The bell spans the top fifth of the funnel's height, and reaches at least the funnel's top.
float hornBot() { return mix(uDeckY - 0.6 * (uDeckY - uH), min(uDeckY * 0.8, uH - 40.0), smoothstep(0.0, 0.5, uCond)); }
// The horn's values for this tornado, set once per tornado.
// gOn: the horn's strength. gRtopKm: its top radius in km. gNearR: the near deck's reach in km.
float gA, gY0, gDeck, gOn, gRtopKm, gNearR;
float nearR();
void hornInit() {
  gA = hornA(); gY0 = hornBot(); gDeck = uDeckY; gOn = hornOn();
  gRtopKm = (radiusAt(uH) + gA) * 0.001;
  gNearR = nearR();
}
// The horn's radius at a height. s returns how far up the horn it is, 0 to 1.
// A superellipse of 1.6: upright at the funnel, level at the deck.
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
// The horn as a distance in metres: negative inside.
// Up most of its height it lies inside the funnel's body; it surfaces near the deck.
float hornDist(float y, float r) {
  float s, R = hornR(y, s), k = hornSlope(s);
  R -= radiusAt(min(y, uH)) * mix(0.7, 0.0, smoothstep(0.4, 0.8, s));
  return max((r - R) / sqrt(1.0 + k * k), gY0 - y);
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
    // Octaves finer than about a pixel are left out: they only stipple.
    float px = uDs * 0.25 / max(gPxM, 1e-3);
    int o = min(oct, 1 + int(max(log2(px / 1.5), 0.0)));
    float nd = fbm(cd + 7.3, o);
    if (o > 3) nd -= (1.0 - nd) * N(cd * 4.5 + 5.0) * 0.35;
    // A wide threshold: a narrow one flips per sample.
    float puff = smoothstep(0.32, 0.68, nd);
    d = uDebris * smoothstep(Rd, Rd * 0.3, r * (0.7 + 0.6 * nd)) * (1.0 - smoothstep(uDustH * 0.25, uDustH * 1.4, h + (nd - 0.5) * uDustH * 1.2)) * puff * 2.0;
  }
  // Rain wrapped round a big tornado, in falling streaks.
  if (uRain > 0.01) {
    float Rr = R * 1.15 + uR0 * 0.35;
    // A wide soft ring: a thin one is hit or missed by chance and stipples.
    float ring = smoothstep(Rr * 0.5, 0.0, abs(r - Rr)) * 0.6;
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
  // Once the funnel reaches the ground it thins only in its last short stretch, inside the dust.
  float taperL = max(g.R * 4.0 / uWid, 80.0) * mix(1.0, 0.35, smoothstep(0.9, 1.0, uCond));
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
  // The deck's shadow falls on the upper funnel: it darkens and cools there, and grows out of the cloud.
  float top = smoothstep(0.45, 1.0, u) * uTopDark;
  float od = sunOD(q, h, R) + cs + top * 1.5;
  // The lit side falls off into the body: little light scatters round to the shade side.
  vec3 sunL = uSunCol * (exp(-od) * ph0 + 0.3 * exp(-od * 0.4) * ph1 + 0.05 * exp(-od * 0.16)) * (1.0 - 0.6 * uDark);
  // Sky light falls off with depth into the funnel.
  float depth = max(0.0, 1.6 - xr);
  // The shade side fills with the light round it: the cool sky low down, the deck's dim tone up high.
  // The shade side is a cool slate blue.
  vec3 ambC = mix(uAmb * vec3(0.7, 0.85, 1.2), skyH * 0.9, 0.2 + 0.4 * topK);
  vec3 ambL = ambC * (0.3 + 0.55 * u) * mix(1.0, 0.4, max(topK, top * 0.6)) * exp(-depth * 1.6);
  // Under a young storm's thin deck more sky light reaches the funnel; under a heavy one, less.
  ambL *= clamp(1.0 - 0.9 * (uStorm - 0.85), 0.85, 1.6);
  // Bounce from the sunlit wheat warms the lower funnel from below.
  ambL += uSunCol * vec3(0.55, 0.42, 0.22) * 0.07 * (1.0 - u) * exp(-depth * 1.2);
  vec3 alb = uAlb * vec3(1.0, 1.01, 1.03) * mix(1.0, 0.1, uDark);
  // The storm's level: a young storm's funnel reads paler and cleaner, a heavy one's darker and dirtier.
  // Both hinge on the default storm, so its look holds.
  float se = uStorm - 0.85;
  alb *= 1.0 - 0.35 * se;
  alb = mix(alb, alb * vec3(0.8, 0.75, 0.7), clamp(se * 5.0, 0.0, 1.0));
  // The lower funnel takes the dust's brown.
  alb = mix(alb, vec3(0.45, 0.36, 0.27) * mix(1.0, 0.45, uDark), clamp((1.0 - smoothstep(0.0, 0.35, u)) * uDebris * uDustK, 0.0, 1.0));
  return mix(alb * (sunL * uSunK + ambL * 0.8 * uAmbK), stC, topK);
}
// The air in front of a funnel sample, by its height: as thick as the plain's near the ground,
// as thin as the deck's up at the base, so a funnel sits in the same air as both.
float gTm = 0.0;
float funnelHaze(float h) {
  return mix(1.0 - exp(-gTm / 22000.0), 0.8 * (1.0 - exp(-gTm / 70000.0)), smoothstep(0.0, 1200.0, h)) * uHazeK * clamp(1.0 + 1.5 * (uStorm - 0.85), 0.4, 1.3);
}

/* ---------- the deck round a tornado: the horn ---------- */
// The funnel's top, without its sway; a rope's bend carries it.
vec2 topXZ() { return uWindC * uLean + vec2(1.0, -0.25) * 500.0 * clamp(uRope, 0.0, 1.0); }
// The horn's reach past its top radius, in km.
float nearR() { return gRtopKm * 1.6 + 0.3; }
// Metres round the foot to the scene's camera km.
vec3 toKm(vec3 p) { return (p + gFoot) * 0.001; }
// The deck's distance at a point pk in km. In a tornado's column (horn true) the horn joins it.
// pl is the same point round that tornado's foot, in metres.
// A smooth minimum joins the horn, so the deck's lumps and light run on down it.
float deckD(vec3 pk, bool horn, vec3 pl, float soft) {
  float d = stormShape(pk);
  if (horn && gOn > 0.0) {
    vec2 qt = pl.xz - topXZ();
    float hr = gNearR * 1000.0;
    if (dot(qt, qt) < hr * hr) d = smin(d, mix(4.0, hornDist(pl.y, length(pl.xz - axisAt(pl.y))) * 0.001, gOn), 0.25);
  }
  // Far from the cloud the noise cannot reach: a safe distance needs no noise.
  // It stays past the soft edge, so the march never takes it for cloud.
  if (d > 1.2 + soft) return d - 1.1;
  return stormNoise(pk, d);
}
// The storm's shade on a funnel point: its shape along the sun ray.
// A high sun is cut off by the storm overhead; a low one slips under the base.
float cloudShade(vec3 p) {
  float od = 0.0;
  od += smoothstep(0.06, -0.06, stormShapeSun(toKm(p + gSunC * 80.0))) * 80.0;
  od += smoothstep(0.06, -0.06, stormShapeSun(toKm(p + gSunC * 260.0))) * 180.0;
  float L = (max(gDeck - p.y, 0.0) + 60.0) / max(gSunC.y, 0.03);
  // Far under the base the sun slips past the deck: its shade fades out, with no step.
  float far = 1.0 - smoothstep(12000.0, 20000.0, L);
  if (far > 0.0) {
    od += far * smoothstep(0.06, -0.06, stormShapeSun(toKm(p + gSunC * L))) * 300.0;
    od += far * smoothstep(0.06, -0.06, stormShapeSun(toKm(p + gSunC * (L + 400.0)))) * 300.0;
  }
  return od * 0.006;
}
// How far up the join a height is: 0 on the body, 1 where the bell meets the deck.
// The deck's tone starts down the upper funnel, a bell's height under the bell, and grows up it.
// A heavier storm takes the deck's tone further down the funnel; a young one keeps it to the bell.
float topKAt(float h) { return smoothstep(gY0 - (gDeck - gY0) * clamp(1.0 + 4.0 * (uStorm - 0.85), 0.2, 1.6), gDeck, h); }

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
  // A layer thinner than a pixel fades into the core's edge, not into a lone hoop.
  float swV = smoothstep(0.6, 1.6, sw * 0.5 * (Ra + Rb) / gPxM);
  float coreMax = 1.0 + uAmp * 0.225 + 0.02;
  // 0 is the core, 1 to 5 the sheaths; an inward stretch meets the outer ones first.
  for (int j = 0; j <= SHEATHS; j++) {
    int k = inward ? SHEATHS - j : j;
    // dk: the share of the deck's tone in this layer's colour.
    float od = 0.0, uk = 0.5, xr, shade = 1.0, dk = 0.0;
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
      float I = min(layerInt(xa, xb, len, rk, sw), 3.5 * sw * R) * (1.0 - fl) * fade * swV;
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
      // A sheath's own noise shows as tone: its dense puffs read lighter, its thin parts darker.
      shade = mix(0.72, 1.12, den);
      // Torn sheath edges take the deck's tone, the outer ones most: no bright flecks on dark cloud.
      dk = (0.35 + 0.45 * fk) * (1.0 - 0.5 * den);
      xr = rk * mix(Rea, Reb, uk) / R;
    }
    od *= live(ph.y);
    if (od < 1e-4) continue;
    vec3 c = hazed(mix(shellCol(q, ph.y, R, xr, cs, ph0, ph1, skyH, topK, stC) * shade, stC, dk), funnelHaze(ph.y));
    float a = 1.0 - exp(-od);
    fAcc += fT * a * c;
    fT *= 1.0 - a;
  }
}
#ifdef TUBE
/* ---------- the Cloud tube: the deck's own cloud, pulled down round the axis ---------- */
// The deck's material in one layer's spinning frame: idx picks the layer's spin and climb.
// The same noise volume and recipe as deckN(): three octaves, a fine one, and Worley lumps.
float tubeN(float ang, float h, float x, float R, int idx) {
  vec2 ph = phOf(idx);
  float zz = h / uZs - ph.y;
  float rb = clamp(0.73 * R / uZs, 0.6, 3.5);
  // The helix leans by arc, as in sheathN().
  float a = ang - ph.x - zz * 0.99 / (rb * gAng);
  // A thin funnel keeps several features round it: no ring-shaped flakes.
  float rr = x * max(rb, 1.0) * 1.4 * gAng;
  // No offset per layer: the bands cut one body of cloud.
  vec3 c = vec3(cos(a) * rr, zz * uTbStretch, sin(a) * rr) + uSeed * 23.0;
  // An octave finer than a pixel gives way to its mean: it would only speckle.
  // One unit of c holds four noise cells; s is pixels per cell of the first octave.
  float s = uZs * 0.25 / max(gPxM, 1e-3);
  float k1 = smoothstep(0.7, 2.0, s * 0.5), k2 = smoothstep(0.7, 2.0, s * 0.25), k3 = smoothstep(0.7, 2.0, s * 0.12);
  float n = (0.5 * N(c) + 0.25 * mix(0.5, N(c * 2.03 + 7.1), k1) + 0.125 * mix(0.5, N(c * 4.1 + 3.7), k2) + 0.0625 * mix(0.5, N(c * 8.3), k3)) / 0.9375;
  // The deck's rounded lumps, in two sizes, are not stretched: they stay round.
  vec3 cl = vec3(c.x, zz + uSeed * 23.0, c.z);
  n += (W(cl * 0.65 + 1.7) - 0.4) * 0.32 + (mix(0.45, W(cl * 2.0), k1) - 0.4) * 0.16;
  // Erosion: fine detail eats into the edges, as in sheathN().
  return n - (1.0 - n) * mix(0.5, N(cl * 3.7 + 7.0), k2) * 0.45;
}
// One step through the tube, as a volume: extinction per metre into sig, colour times it into sum.
// The core is a soft solid of deck cloud; the bands are thin radial layers with clear air between.
// Each band's share of the step is exact, so thin bands do not alias.
void tubeSeg(vec3 pa, vec3 rd, float len, Geo ga, Geo gb, float xm, bool split, float sHm, float cs, float topK, vec3 stC, float ph0, float ph1, vec3 skyH, float jt, inout vec3 sum, inout float sig) {
  float fl = smoothstep(0.15, 0.6, sHm);
  // Up the bell the tube thins while the deck's horn takes over: no lip where one ends.
  float fade = 1.0 - smoothstep(0.35, 1.0, sHm);
  if (fade <= 0.0) return;
  vec3 ps = pa + rd * (len * jt);
  vec2 q = ps.xz - axisAt(ps.y);
  float R = mix(ga.R, gb.R, jt), Re = mix(ga.Re, gb.Re, jt), tap = mix(ga.tap, gb.tap, jt);
  float x = length(q) / Re, ang = atan(q.y, q.x);
  float nc = tubeN(ang, ps.y, x, R, 0);
  // The core: the deck's cloud inside a ragged edge.
  float edge = mix(0.9, 1.0, fl) + uAmp * 0.45 * (nc - 0.5) * mix(1.0, 0.6, fl);
  float wC = 0.1 + uEdgeW * uAmp;
  // The noise rags the lower edge a little: more drew a comb of hairs.
  float tp = clamp(tap - (nc - 0.5) * 0.35, 0.0, 1.0);
  // Point samples read thinner than the shells' exact ramp: the core takes more.
  // It reads as dense condensation, not thin smoke.
  float dC = 3.2 * smoothstep(0.0, 0.45, tp) * clamp((edge - x) / wC, 0.0, 1.0);
  // Near the tip only the dense parts hold.
  if (tp < 1.0) dC *= mix(smoothstep(0.45, 0.7, nc), 1.0, smoothstep(0.35, 1.0, tp));
  // The rim thins where the ray grazes the core's edge.
  dC *= 1.0 - uRim * 0.75 * smoothstep(edge - wC, edge, x);
  float s = funnelSig(dC, R), sB = 0.0;
  // The bands: thin and spaced as the shells, but cut from the deck's cloud.
  float sw = 0.3 * gSp;
  // A band thinner than a pixel fades into the core's edge, not into a lone hoop.
  float swV = smoothstep(0.6, 1.6, sw * R / gPxM);
  for (int j = 0; j < SHEATHS; j++) {
    if (float(j) >= uTbCount) break;
    float fk = float(j) / float(SHEATHS - 1);
    float rk = 1.0 + gSp * float(j) * (1.0 - fl);
    float I = split ? layerInt(ga.x, xm, len * 0.5, rk, sw) + layerInt(xm, gb.x, len * 0.5, rk, sw) : layerInt(ga.x, gb.x, len, rk, sw);
    I = min(I, 3.5 * sw * R);
    if (I < 1e-3 * len) continue;
    // Each band turns at its own rate; the switch falls in clear air.
    float nb = j == 0 ? nc : tubeN(ang, ps.y, x, R, j + 1);
    // The lumps widen the noise's spread, so the cut sits higher than the shells'.
    float cov = mix(0.5, 0.72, fk);
    // A wide threshold: a narrow one flips per sample and speckles.
    sB += funnelSig(mix(0.9, 0.35, fk), R) * I / len * smoothstep(cov - 0.04, cov + 0.22, nb) * (0.6 + 0.4 * nb) * uSheathK * uTbBands * (1.0 - fl);
  }
  // The bands' share of the step: their torn edges take the deck's tone.
  sB *= swV;
  float bk = sB / max(s + sB, 1e-6);
  s = (s + sB) * uDens * fade * live(ps.y);
  if (s < 1e-7) return;
  // The deck's light: a step toward the sun finds thinner cloud on the lit side of a lump.
  vec3 pl = ps + gSunC * (0.3 * R);
  vec2 ql = pl.xz - axisAt(pl.y);
  // A gentle gain: a steep one turned per-sample noise into light and dark specks.
  float lit = clamp((nc - tubeN(atan(ql.y, ql.x), pl.y, length(ql) / Re, R, 0)) * 1.5 + 0.5, 0.0, 1.0);
  vec3 c = shellCol(q, ps.y, R, x * Re / R, cs + (1.0 - lit) * 0.6, ph0, ph1, skyH, topK, stC);
  c = mix(c, stC, 0.45 * bk);
  sum += hazed(c, funnelHaze(ps.y)) * s;
  sig += s;
}
#endif
void main() {
  vec2 fc = gl_FragCoord.xy + uJit;
  float asp = uRes.x / uRes.y;
  vec2 s = vec2((fc.x / uRes.x - 0.5) * asp, fc.y / uRes.y - uHz);
  vec3 rc = normalize(vec3(s, -uFoc));
  vec3 rd = toWorld(rc);
  gSunC = toCam(uSun);
  float jit = hash(fc + fract(uT * 7.31) * 113.0);
  // The dust's own jitter, apart from the march's.
  float jit2 = hash(fc.yx * 1.37 + fract(uT * 3.17) * 71.0);
  vec3 skyH = skyCol(normalize(vec3(rd.x, 0.0, rd.z)));
  gHzC = hazeCol(rd);
  gGloom = uAmb * vec3(0.06, 0.066, 0.078);
  gGl = cylinder(vec3(0.0, CAMH * 0.001, 0.0), rc, SHELF, SHELF_R.y * mix(0.4, 0.95, uStorm), 0.0, BASE + 0.2);
  // One march, in metres from the eye, through the whole storm: the deck and every funnel's column.
  vec3 eye = vec3(0.0, CAMH, 0.0);
  // Only a ray that climbs can reach the deck; one that falls meets only the funnels' feet.
  bool sky = rc.y > 0.0;
  float tMax = sky ? 110000.0 : CAMH / -rc.y;
  // Each column, A: the funnel, its flare, its lean, its sway and a rope's bend.
  float a0[${MAX_FUNNELS}], a1[${MAX_FUNNELS}];
  float aEnd = -1.0, aStart = 1e9;
  for (int i = 0; i < ${MAX_FUNNELS}; i++) {
    a0[i] = 1e9; a1[i] = -1.0;
    if (i >= uN) continue;
    pick(i);
    hornInit();
    float Rb = max(uR0 * max(uFlare * 2.0, 2.6), (radiusAt(uH) + gA) * 1.3) + uLean + uBow + uSway * 2.0 + 140.0 + 1300.0 * clamp(uRope, 0.0, 1.0);
    vec2 cy = cylinder(eye - gFoot, rc, Rb, 0.0, gDeck + 60.0);
    if (cy.y > 0.0) { a0[i] = cy.x; a1[i] = min(cy.x + cy.y, tMax); aStart = min(aStart, a0[i]); aEnd = max(aEnd, a1[i]); }
  }
  bool bake = uMode == 1;
  // The crossover band scales with the bake's distance: 2 km at 16 km.
  float farD = uFarD * 1000.0, band = max(750.0, 0.125 * farD);
  float tEnd = sky ? (bake ? tMax : min(tMax, farD)) : min(tMax, aEnd);
  float t = sky ? (bake ? farD - band : min(1000.0, aStart)) : aStart;
  float cosT = dot(rc, gSunC);
  // Two lobes: some light bounces back toward the eye, most runs on.
  float ph0 = mix(hg(cosT, 0.6), hg(cosT, -0.25), 0.55);
  float ph1 = mix(hg(cosT, 0.3), hg(cosT, -0.1), 0.55);
  // The column the march is in, and that funnel's state on this ray.
  int cur = -1;
  Geo g0;
  bool have = false, outside = true;
  float csLow = -1.0, csF = -1.0;
  vec3 stC = vec3(-1.0);
  // The deck's last sample: where the next is due, its extinction per metre and colour.
  float tDn = -1.0, cSig = 0.0;
  vec3 cCol = vec3(0.0), cLit = vec3(-1.0);
  vec3 acc = vec3(0.0);
  float T = 1.0;
  int steps = 0;
  // Where the ray turns half opaque: the sun's shafts stop there, in front of a funnel or the deck.
  float tOpq = 1e9;
  // The tube's shorter steps need a longer march.
#ifdef TUBE
  for (int i = 0; i < 480; i++) {
#else
  for (int i = 0; i < 320; i++) {
#endif
    steps++;
    if (t > tEnd || T < 0.01) break;
    int k = -1;
    for (int j = 0; j < ${MAX_FUNNELS}; j++) { if (k < 0 && t >= a0[j] && t <= a1[j]) k = j; }
    if (k != cur) {
      if (k >= 0) { pick(k); hornInit(); }
      cur = k; have = false; csLow = -1.0; csF = -1.0; stC = vec3(-1.0);
      // The deck is sampled again at the column's edge: inside, it has the horn.
      tDn = min(tDn, t);
    }
    if (k < 0 && !sky) {
      // A falling ray between columns: jump to the next one.
      float nx = 1e9;
      for (int j = 0; j < ${MAX_FUNNELS}; j++) if (a0[j] > t) nx = min(nx, a0[j]);
      if (nx > 1e8) break;
      t = nx + 0.01;
      continue;
    }
    bool inA = k >= 0;
    vec3 pk = (eye + rc * t) * 0.001;
    if (sky && pk.y > 16.0 && t > aEnd) break;
    vec3 p = inA ? eye + rc * t - gFoot : vec3(0.0);
    float st = 1e9, xOut = 0.0;
    bool inDust = false;
    float hzF = 0.8 * (1.0 - exp(-t / 70000.0));
    gTm = t;
    float gLen = clamp(t * 0.001 - gGl.x, 0.0, gGl.y);
    gGk = 1.0 - exp(-gLen * gLen * 0.003 * uStorm);
    if (inA) {
      // The pixel's size in metres where the ray is now.
      float foot = t / (uRes.y * uFoc), sH0;
      gPxM = foot;
      float R0 = hornR(p.y, sH0);
      // The layers hug the core closer the farther the funnel is: tight at 8 to 14 km.
      gSp = 0.2 * mix(1.0, 0.4, smoothstep(4000.0, 12000.0, t));
      gAng = clamp(R0 * 0.06 / foot, 0.3, 1.0);
      xOut = 1.25 + 4.0 * gSp;
      if (!have) g0 = geo(p, xOut + 0.6);
      float r = g0.x * g0.Re, on = g0.Re * K_ON;
      // Coarse steps through the onion, long ones outside it.
      st = g0.x < xOut ? on : max((r - xOut * g0.Re) * 0.8, on);
      // The dust takes a few coarse steps across its width; the step grows toward its bounds.
      float Rd = debrisR(p.y), ra = length(g0.q);
      inDust = uDebris > 0.0 && p.y < uDustH * 1.8 && ra < Rd * 1.3;
      float eD = max(smoothstep(0.7, 1.0, p.y / (uDustH * 1.8)), smoothstep(0.8, 1.0, ra / (Rd * 1.3)));
      if (inDust) st = min(st, Rd * 2.6 / 8.0 / max(1.0 - eD, 0.05));
      // The rain ring is a soft veil: its own steps are as long as the onion's.
      float Rr = radiusAt(p.y) * 1.15 + uR0 * 0.35;
      if (uRain > 0.01 && abs(ra - Rr) < Rr * 0.5) st = min(st, Rr * 0.2);
    }
    vec3 sum = vec3(0.0);
    float sig = 0.0;
    // The deck keeps its own sample spacing: the funnel's short steps reuse its last sample.
    if (sky) {
      if (t >= tDn) {
        // The finest noise fades out far off, where it is under a pixel.
        gFine = 1.0 - smoothstep(25000.0, 45000.0, t);
        // The soft edge and the inner step grow with distance: crisp near, smooth far.
        // A soft edge of two steps: a thinner one is met by chance and stipples the lumps' rims.
        float inStep = 30.0 + 0.006 * t, soft = 2.0 * inStep * 0.001;
        float d = deckD(pk, inA, p, soft);
        // The first step into the cloud is a random part of a step: no contour bands.
        if (d < soft && outside && !inA) { outside = false; t += inStep * jit; continue; }
        if (d < soft) outside = false;
        // Outside the cloud, step by its distance; a step scale per pixel keeps rays off one lattice.
        tDn = t + (d < soft ? inStep : (d * 750.0 + 0.01 * t) * (0.85 + 0.3 * jit));
        cSig = 0.0;
        if (d < soft) {
          // A full step through dense cloud covers 0.8 of what lies behind it.
          cSig = clamp(0.5 - d / soft, 0.0, 1.0) * 1.609 / inStep;
          // Over the band the live march gives way to the baked far field, and the bake takes over.
          float wFar = smoothstep(farD - band, farD, t);
          cSig *= bake ? wFar : 1.0 - wFar;
          cLit = stormLit(pk, d);
          cCol = hazed(cLit, hzF);
        }
      }
      // Inside the onion the funnel's step wins; up the flare the deck's step wins.
      if (!(inA && g0.x < xOut) || (inA && p.y > gY0)) st = min(st, max(tDn - t, 0.5));
      sum += cCol * cSig;
      sig += cSig;
    }
    // The funnel's layers on this segment, front to back among themselves.
    // A split segment keeps its second half apart, so the volume goes between.
    vec3 fAcc = vec3(0.0), fAcc2 = vec3(0.0);
    float fT = 1.0, fT2 = 1.0;
    bool inward = false, split = false;
    if (inA) {
      Geo g1 = geo(p + rc * st, xOut + 0.6);
      inward = g1.x < g0.x;
      float sHm = 0.5 * (g0.sH + g1.sH);
      if (min(g0.x, g1.x) < xOut + 0.3 && sHm < 1.0) {
        vec3 pm = p + rc * (st * 0.5);
        if (csF < 0.0) csF = cloudShade(pm);
        // Below F1 the horn is a lowering of the base: it takes the storm's tone all the way down.
        float topK = max(topKAt(pm.y), 1.0 - smoothstep(0.0, 0.5, uCond));
        // The deck's light just over the horn, for the join.
        // The sheaths' torn edges take this tone too, so every column reads it once.
        // It is read beside the bell, on the eye's side, where the deck shows its own tone.
        // Inside the bell the horn's underside read darker than the deck round it.
        if (stC.x < 0.0) {
          vec2 tc = topXZ(), toEye = normalize(-gFoot.xz - tc + 1e-3);
          vec3 pb = vec3(tc.x + toEye.x * gRtopKm * 1300.0, max(pm.y, gDeck - 120.0), tc.y + toEye.y * gRtopKm * 1300.0);
          vec3 pt = toKm(pb);
          stC = stormLit(pt, deckD(pt, true, pb, 1e3));
        }
        // The tone it turns to is the deck's own light right here, where the deck has cloud.
        // Above the horn's surface the ray's one deck point stands in.
        vec3 tone = cSig > 0.0 && cLit.x >= 0.0 ? cLit : stC;
        // x at the middle: a ray that turns back out inside the segment takes two straight pieces.
        vec2 qm = pm.xz - axisAt(pm.y);
        float Rem = 0.5 * (g0.Re + g1.Re), Rm = 0.5 * (g0.R + g1.R), tm = 0.5 * (g0.tap + g1.tap);
        float xm = length(qm) / Rem;
        split = xm < min(g0.x, g1.x) - 0.01;
#ifdef TUBE
        // The tube is part of the volume: no layers to order.
        tubeSeg(p, rc, st, g0, g1, xm, split, sHm, csF, topK, tone, ph0, ph1, skyH, fract(jit + float(i) * 0.618034), sum, sig);
        split = false;
#else
        if (split) {
          shellSeg(p, rc, st * 0.5, g0.x, xm, g0.Re, Rem, g0.R, Rm, g0.tap, tm, sHm, csF, topK, tone, hzF, ph0, ph1, skyH, fAcc, fT);
          shellSeg(pm, rc, st * 0.5, xm, g1.x, Rem, g1.Re, Rm, g1.R, tm, g1.tap, sHm, csF, topK, tone, hzF, ph0, ph1, skyH, fAcc2, fT2);
        } else shellSeg(p, rc, st, g0.x, g1.x, g0.Re, g1.Re, g0.R, g1.R, g0.tap, g1.tap, sHm, csF, topK, tone, hzF, ph0, ph1, skyH, fAcc, fT);
#endif
      }
      Geo gs = g0;
      g0 = g1;
      have = true;
      // Dust and rain: two random points in the segment, one in each half, so coarse steps leave no rings.
      if (inDust || uRain > 0.01) {
        float d, w, d2, w2;
        vol(p + rc * (st * 0.5 * jit2), d, w, 4);
        vol(p + rc * (st * 0.5 * (1.0 + fract(jit2 + 0.5))), d2, w2, 4);
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
          float hzD = funnelHaze(p.y);
          sum += hazed(dcol, hzD) * sd + hazed(wcol, hzD) * sw2;
          sig += sd + sw2;
        }
      }
    } else have = false;
    // A step never leaves a column it has not crossed: the next column's march starts at its edge.
    for (int j = 0; j < ${MAX_FUNNELS}; j++) if (a0[j] > t) st = min(st, max(a0[j] - t, 0.5));
    if (st > 1e8) break;
    // The volume and the layers, in their order along the ray.
    float aV = sig > 1e-6 ? 1.0 - exp(-sig * st) : 0.0;
    vec3 cV = sig > 1e-6 ? sum / sig : vec3(0.0);
    if (split) { acc += T * fAcc; T *= fT; acc += T * aV * cV; T *= 1.0 - aV; acc += T * fAcc2; T *= fT2; }
    else if (inward) { acc += T * aV * cV; T *= 1.0 - aV; acc += T * fAcc; T *= fT; }
    else { acc += T * fAcc; T *= fT; acc += T * aV * cV; T *= 1.0 - aV; }
    if (T < 0.5 && tOpq > 1e8) tOpq = t;
    t += st;
  }
  vec4 now = vec4(acc, 1.0 - T);
  if (bake) { outC = now; return; }
  // The baked far field lies behind the near field.
  vec4 far = texture(tFar, gl_FragCoord.xy / uRes);
  now = vec4(acc + T * far.rgb, 1.0 - T * (1.0 - far.a));
  // Sun shafts: the haze under the deck scatters sunlight to the eye below the deck's far breaks.
  // Twelve jittered steps to the base or the ground, 45 km at most; the history smooths them.
  // The breaks drift with the deck, so the shafts sweep slowly over the plain.
  if (uGod > 0.0 && uSun.y > 0.0) {
    float tG = min(min(rc.y > 0.0 ? (BASE * 1000.0 - CAMH) / rc.y : CAMH / -rc.y, 45000.0), tOpq), sh = 0.0;
    for (int i = 0; i < 12; i++) {
      vec3 w = (rd * ((float(i) + jit2) * tG / 12.0) + vec3(0.0, CAMH, 0.0)) * 0.001;
      // The sun's ray from this point crosses the base here: open sky there lights the point.
      vec3 q = w + uSun * (max(BASE - w.y, 0.0) / max(uSun.y, 0.02));
      sh += deckOpen(toCam(q)) * exp(-w.y / 1.2);
    }
    // Light only: the shafts glow most toward the sun.
    float cg = dot(rd, uSun);
    now.rgb += uSunCol * vec3(1.0, 0.86, 0.68) * (sh / 12.0) * (tG / 45000.0) * mix(hg(cg, 0.6), 1.0, 0.2) * 0.25 * uGod;
  }
  // A short history blend: steady frames lose their march noise.
  outC = mix(texture(tPrev, gl_FragCoord.xy / uRes), now, uBlend);
  if (uCount == 1) outC = vec4(float(gWork), float(steps), 0.0, 1.0);
}`;
