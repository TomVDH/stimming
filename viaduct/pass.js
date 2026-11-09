// Pass: a long freight crosses a tall curved viaduct in a mountain storm.
// The moon breaks through drifting gaps in the cloud.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export function build() {
// Seeded random keeps the scene the same on every load.
let seed = 4242;
const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const range = (a, b) => a + (b - a) * rnd();

const scene = new THREE.Scene();
// Orbs: soft glows the post chain draws round the brightest lamps.
const orbs = [];
const camera = new THREE.PerspectiveCamera(40, 1, 2, 40000);

const CLOUD_Y = 1100;

/* ---------- K2: storm ---------- */
// Shared GLSL: noise, cloud gaps, the storm sky and the snowy air.
const K2_NOISE = /* glsl */`
float k2hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float k2noise(vec2 p) {
  vec2 i = floor(p), f = fract(p), u = f * f * (3.0 - 2.0 * f);
  return mix(mix(k2hash(i), k2hash(i + vec2(1, 0)), u.x), mix(k2hash(i + vec2(0, 1)), k2hash(i + vec2(1, 1)), u.x), u.y);
}
float k2fbm(vec2 p) {
  float s = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) { s += a * k2noise(p); p = p * 2.03 + vec2(17.1, 9.2); a *= 0.5; }
  return s;
}`;
const K2_STORM = /* glsl */`
uniform vec3 uMoon, uMoonSky, uMoonC, uAir, uZen, uAmb, uSnowC;
uniform float uTime, uCloudY, uHaze, uHazeH, uMoonK, uMoonAir, uGapLo, uGapHi, uGapScale;
uniform float uBaseOn, uMoonOn, uGapIn, uStarK, uLightK, uFlareK;
uniform vec2 uWind;
// Gap mask at a point on the cloud plane: 1 in a gap, 0 under cloud.
float k2gapAt(vec2 q) {
  vec2 p = (q - uWind * uTime) * uGapScale;
  vec2 w = vec2(k2noise(p * 0.7 + 3.1 + uTime * 0.01), k2noise(p * 0.7 + 8.3 - uTime * 0.012));
  return smoothstep(uGapLo, uGapHi, k2fbm(p + w * 1.3));
}
// Moonlight on a point passes the cloud plane toward the moon.
float k2gap(vec3 P) {
  float t = (uCloudY - P.y) / max(uMoon.y, 0.05);
  return k2gapAt(P.xz + uMoon.xz * t);
}
// Height haze: snowy air, thick low in the gorge.
float k2hazeAmount(vec3 P) {
  vec3 v = P - cameraPosition;
  float dist = length(v), k = 1.0 / uHazeH;
  float h0 = max(cameraPosition.y, 0.0), h1 = max(P.y, 0.0), dh = h1 - h0;
  float avg = abs(dh) < 0.01 ? exp(-h0 * k) : (exp(-h0 * k) - exp(-h1 * k)) / (dh * k);
  return 1.0 - exp(-dist * uHaze * max(avg, 0.0));
}
vec3 k2air(vec3 dir) {
  // The air is a little brighter toward the moon.
  float m = max(dot(dir, uMoonSky), 0.0);
  return uAir * (1.0 + 1.5 * pow(m, 4.0));
}
vec3 k2sky(vec3 dir) {
  float up = max(dir.y, 0.0);
  vec3 col = mix(k2air(dir) * 1.15, uZen, smoothstep(0.0, 0.3, up));
  float m = max(dot(dir, uMoonSky), 0.0);
  if (dir.y > 0.004) {
    float t = (uCloudY - cameraPosition.y) / dir.y;
    vec3 p = cameraPosition + dir * t;
    float g = k2gapAt(p.xz);
    // Through a gap: a clear dark sky, stars and the moon.
    vec3 cell = floor(dir * 700.0);
    float s = k2hash(cell.xy + cell.z * 7.13);
    vec3 clear = uZen * 0.7 + vec3(0.75, 0.8, 1.0) * step(0.997, s) * (s - 0.997) * 300.0 * uStarK;
    float th = 1.0 - dot(dir, uMoonSky);
    clear += uMoonC * (smoothstep(0.00006, 0.00003, th) * 3.0 + exp(-th * 900.0) * 0.08);
    // The cloud base: dark grey, bright on gap rims and toward the moon.
    float rim = g * (1.0 - g) * 4.0;
    vec3 cloud = uAir * 0.9 + uMoonC * uMoonK * (0.004 + 0.03 * rim + 0.05 * pow(m, 10.0));
    float far = 1.0 - exp(-t / 12000.0);
    vec3 sk = mix(cloud, clear, g * (1.0 - far));
    col = mix(col, mix(sk, col, far * 0.6), smoothstep(0.0, 0.1, dir.y));
  }
  // The moon glows through thin cloud.
  return col + uMoonC * uMoonK * (pow(m, 60.0) * 0.05 + pow(m, 8.0) * 0.01);
}`;
/* ---------- end K2 ---------- */

// The moon lights from the front left, as in the Pass reference.
const MOON = new THREE.Vector3(-0.62, 0.5, 0.6).normalize();
const k2 = {
  uMoon: { value: MOON },
  uMoonSky: { value: new THREE.Vector3(-0.5, 0.2, -0.84).normalize() },
  uMoonC: { value: new THREE.Vector3(0.62, 0.72, 1.0) },
  uAir: { value: new THREE.Vector3(0.014, 0.018, 0.03) },
  uZen: { value: new THREE.Vector3(0.002, 0.0028, 0.006) },
  uAmb: { value: new THREE.Vector3(0.016, 0.02, 0.032) },
  uSnowC: { value: new THREE.Vector3(0.82, 0.86, 0.94) },
  uTime: { value: 0 }, uCloudY: { value: CLOUD_Y },
  uHaze: { value: 0.0016 }, uHazeH: { value: 160 },
  uMoonK: { value: 1.0 }, uMoonAir: { value: 0.05 },
  uGapLo: { value: 0.5 }, uGapHi: { value: 0.66 }, uGapScale: { value: 0.0011 },
  uBaseOn: { value: 1 }, uMoonOn: { value: 1 }, uGapIn: { value: 1 }, uStarK: { value: 1 },
  uWind: { value: new THREE.Vector2(26, 9) },
  uFlareK: { value: 1 }, uLightK: { value: 1 },
};

// Light list: position + power, colour + range, spot axis + cone.
const NL = 12;
const lights = [];
function addLight(pos, col, power, range, dir = null, cos = -2) {
  lights.push({ pos, col, power, range, dir: dir || new THREE.Vector3(0, -1, 0), cos });
  if (lights.length === NL + 1) console.warn(`pass: more than ${NL} lights; the extra lights drop`);
}
const LIGHTS_GLSL = /* glsl */`
uniform vec4 uLP[${NL}];
uniform vec4 uLC[${NL}];
uniform vec4 uLD[${NL}];
uniform int uLN;
vec3 k2lights(vec3 P, vec3 N) {
  vec3 sum = vec3(0.0);
  for (int i = 0; i < ${NL}; i++) {
    if (i >= uLN) break;
    vec3 L = uLP[i].xyz - P;
    float d = length(L);
    L /= d;
    float att = uLP[i].w * uLightK / (1.0 + pow(d / uLC[i].w, 2.0));
    float spot = 1.0;
    if (uLD[i].w > -1.5) spot = smoothstep(uLD[i].w, uLD[i].w + 0.12, dot(-L, uLD[i].xyz));
    sum += uLC[i].rgb * att * spot * max(dot(N, L) * 0.85 + 0.15, 0.0);
  }
  return sum;
}
// Storm light on a surface: ambient and lamps, plus moon through the gaps.
// The bake writes base and moon as two layers; the comp adds the gaps.
vec3 k2lit(vec3 albedo, vec3 P, vec3 N) {
  vec3 base = albedo * (uAmb * (0.5 + 0.5 * max(N.y, 0.0)) + k2lights(P, N));
  float g = uGapIn > 0.5 ? k2gap(P) : 1.0;
  vec3 moon = albedo * uMoonC * uMoonK * max(dot(N, uMoon), 0.0);
  float f = k2hazeAmount(P);
  vec3 air = k2air(normalize(P - cameraPosition));
  return (base * (1.0 - f) + air * f) * uBaseOn + (moon * (1.0 - f) + uMoonC * uMoonAir * f) * g * uMoonOn;
}`;
const lightU = {
  uLP: { value: Array.from({ length: NL }, () => new THREE.Vector4()) },
  uLC: { value: Array.from({ length: NL }, () => new THREE.Vector4()) },
  uLD: { value: Array.from({ length: NL }, () => new THREE.Vector4()) },
  uLN: { value: 0 },
};
function uploadLights() {
  const n = Math.min(lights.length, NL);
  for (let i = 0; i < n; i++) {
    const l = lights[i];
    lightU.uLP.value[i].set(l.pos.x, l.pos.y, l.pos.z, l.power);
    lightU.uLC.value[i].set(l.col.x, l.col.y, l.col.z, l.range);
    lightU.uLD.value[i].set(l.dir.x, l.dir.y, l.dir.z, l.cos);
  }
  lightU.uLN.value = n;
}
const projU = { uScale: { value: 1 } };
const HEAD = `${K2_NOISE}\n${K2_STORM}`;

// Precast concrete: segment tone, joints, snow on top and on the windward side.
// aSU: arc length and across offset; across 99 marks a part with no joints.
const precast = new THREE.ShaderMaterial({
  uniforms: { ...k2, ...lightU },
  vertexShader: /* glsl */`
  attribute vec2 aSU;
  varying vec3 vP;
  varying vec3 vN;
  varying vec2 vSU;
  void main() {
    vec4 w = modelMatrix * vec4(position, 1.0);
    vP = w.xyz; vSU = aSU;
    vN = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * w;
  }`,
  fragmentShader: /* glsl */`
  varying vec3 vP;
  varying vec3 vN;
  varying vec2 vSU;
  ${HEAD}
  ${LIGHTS_GLSL}
  void main() {
    vec3 N = normalize(vN);
    float pier = step(50.0, vSU.y);
    // Each 4 m segment has its own tone.
    float tone = 0.8 + 0.32 * k2hash(vec2(floor(vSU.x / 4.0), 3.0 + pier * 4.0));
    // Joints: a dark groove each 4 m, faded out where it would alias.
    float dj = abs(fract(vSU.x / 4.0 + 0.5) - 0.5) * 4.0, aa = fwidth(vSU.x);
    float joint = mix(mix(0.3, 1.0, smoothstep(0.05, 0.05 + 1.5 * aa, dj)), 1.0, max(pier, smoothstep(0.2, 0.8, aa)));
    vec3 albedo = vec3(0.2, 0.198, 0.195) * tone * joint;
    // Snow lies on faces that look up.
    float n1 = k2noise(vP.xz * 0.35 + vP.y * 0.2);
    float up = smoothstep(0.55, 0.85, N.y) * (0.7 + 0.3 * n1);
    // Wind plasters snow on the faces it hits.
    float face = smoothstep(0.1, 0.7, dot(N.xz, -normalize(uWind))) * (1.0 - abs(N.y));
    float wind = face * smoothstep(0.3, 0.7, k2noise(vec2((vP.x + vP.z) * 0.09, vP.y * 0.22)));
    albedo = mix(albedo, uSnowC, clamp(up + wind * 0.8, 0.0, 1.0));
    gl_FragColor = vec4(k2lit(albedo, vP, N), 1.0);
  }`,
});

// Rock and snow: flat facets; snow holds where the slope is gentle.
const rock = new THREE.ShaderMaterial({
  uniforms: { ...k2, ...lightU },
  vertexShader: /* glsl */`
  varying vec3 vP;
  varying vec3 vN;
  void main() { vec4 w = modelMatrix * vec4(position, 1.0); vP = w.xyz; vN = normal; gl_Position = projectionMatrix * viewMatrix * w; }`,
  fragmentShader: /* glsl */`
  varying vec3 vP;
  varying vec3 vN;
  ${HEAD}
  ${LIGHTS_GLSL}
  void main() {
    vec3 F = normalize(cross(dFdx(vP), dFdy(vP)));
    if (F.y < 0.0) F = -F;
    // Snow drifts read smooth; bare rock keeps its facets.
    vec3 S = normalize(vN);
    vec3 N = normalize(mix(F, S, smoothstep(0.55, 0.8, S.y)));
    // Strata: bands of darker and lighter rock.
    float band = k2noise(vec2(vP.y * 0.08 + k2noise(vP.xz * 0.004) * 3.0, 0.5));
    vec3 stone = vec3(0.034, 0.034, 0.038) * (0.6 + 0.8 * band);
    float n = k2noise(vP.xz * 0.05) * 0.6 + k2noise(vP.xz * 0.21) * 0.4;
    float snow = smoothstep(0.5, 0.72, N.y + (n - 0.5) * 0.35);
    gl_FragColor = vec4(k2lit(mix(stone, uSnowC * 0.92, snow), vP, N), 1.0);
  }`,
});

// Dark steel for rails and shed posts.
const steel = new THREE.ShaderMaterial({
  uniforms: { ...k2, ...lightU },
  vertexShader: /* glsl */`
  varying vec3 vP;
  varying vec3 vN;
  void main() { vec4 w = modelMatrix * vec4(position, 1.0); vP = w.xyz; vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * viewMatrix * w; }`,
  fragmentShader: /* glsl */`
  varying vec3 vP;
  varying vec3 vN;
  ${HEAD}
  ${LIGHTS_GLSL}
  void main() {
    vec3 N = normalize(vN);
    vec3 albedo = mix(vec3(0.05, 0.05, 0.055), uSnowC, smoothstep(0.7, 0.9, N.y) * 0.8);
    gl_FragColor = vec4(k2lit(albedo, vP, N), 1.0);
  }`,
});

// Point flares for small lamps; a pin is a bare core with no halo.
const flareMat = new THREE.ShaderMaterial({
  uniforms: { ...k2, ...projU },
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  vertexShader: /* glsl */`
  attribute vec3 color;
  attribute float size;
  attribute float aPin;
  uniform float uScale;
  varying vec3 vC;
  varying vec3 vP;
  varying float vPin;
  void main() {
    vPin = aPin;
    vec4 w = modelMatrix * vec4(position, 1.0);
    vP = w.xyz; vC = color;
    vec4 mv = viewMatrix * w;
    float lum = dot(vC, vec3(0.2126, 0.7152, 0.0722));
    vC *= mix(1.0, min(1.0, 0.69 / max(lum, 1e-4)), aPin);
    gl_PointSize = mix(clamp(size * uScale / -mv.z, 2.0, 48.0), clamp(size * uScale / -mv.z, 1.0, 3.0), aPin);
    gl_Position = projectionMatrix * mv;
  }`,
  fragmentShader: /* glsl */`
  varying vec3 vC;
  varying vec3 vP;
  varying float vPin;
  ${HEAD}
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float a = max(exp(-dot(c, c) * 22.0) - 0.0041, 0.0);
    a = mix(a, exp(-dot(c, c) * 60.0), vPin);
    // Lamps live in the base layer only.
    gl_FragColor = vec4(vC * a * (1.0 - k2hazeAmount(vP) * 0.7) * uFlareK * uBaseOn, 1.0);
  }`,
});
const flares = { pos: [], col: [], size: [], pin: [] };
function flare(p, c, size) { flares.pos.push(p.x, p.y, p.z); flares.col.push(...c); flares.size.push(size); flares.pin.push(0); }
function pin(p, c) { flares.pos.push(p.x, p.y, p.z); flares.col.push(...c); flares.size.push(14); flares.pin.push(1); }
const WARM = [1.0, 0.72, 0.42], WHITE = [0.86, 0.93, 1.0];
const scale = (c, k) => c.map(v => v * k);

/* ---------- span: a tall curve across the gorge ---------- */
// Quadratic Bezier in plan; an arc-length table gives even spacing.
const B0 = new THREE.Vector2(0, 0), B1 = new THREE.Vector2(-40, -380), B2 = new THREE.Vector2(-300, -640);
const bez = t => new THREE.Vector2().addScaledVector(B0, (1 - t) ** 2).addScaledVector(B1, 2 * t * (1 - t)).addScaledVector(B2, t * t);
const LUT = [{ t: 0, s: 0 }];
for (let i = 1, prev = bez(0); i <= 1000; i++) { const p = bez(i / 1000); LUT.push({ t: i / 1000, s: LUT[i - 1].s + p.distanceTo(prev) }); prev = p; }
const LEN = LUT[LUT.length - 1].s;
function tAt(s) {
  s = Math.max(0, Math.min(LEN, s));
  let lo = 0, hi = LUT.length - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (LUT[m].s < s) lo = m; else hi = m; }
  const a = LUT[lo], b = LUT[hi];
  return a.t + (b.t - a.t) * ((s - a.s) / Math.max(1e-6, b.s - a.s));
}
// Plan point, tangent, yaw, and a sideways offset in metres.
function at(s, side = 0) {
  const t = tAt(s), p = bez(t), q = bez(Math.min(1, t + 0.001)), r = bez(Math.max(0, t - 0.001));
  const tan = q.sub(r).normalize();
  const n = new THREE.Vector2(-tan.y, tan.x);
  return { x: p.x + n.x * side, z: p.y + n.y * side, yaw: Math.atan2(tan.x, tan.y), tan };
}
// Past either end of the curve, the track runs on along its tangent.
function atX(s, side = 0) {
  if (s >= 0 && s <= LEN) return at(s, side);
  const e = s < 0 ? 0 : LEN, c = at(e, side), d = s - e;
  return { x: c.x + c.tan.x * d, z: c.z + c.tan.y * d, yaw: c.yaw, tan: c.tan };
}
// The deck top stands 110 m over the deepest part of the gorge.
const DECK = 110, HW = 4.2, TRACK = 0;
// Shed mouths on the track; each gallery runs 60 m into the hill.
const SHED_A = -20, SHED_B = LEN + 20, SHED_L = 60;
// The cut through the hill ends at the back of each shed.
const CUT_A = SHED_A - SHED_L, CUT_B = SHED_B + SHED_L;

/* Ground: a V gorge across the span, rising to hills at both ends. */
// The gorge floor lies 160 m under the deck at its deepest.
const Z_MID = -320, W_G = 330, FLOOR = -50;
const zAxis = x => Z_MID + 40 * Math.sin(x * 0.0021 + 1.0);
const hash2 = (x, z) => { const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453; return s - Math.floor(s); };
function vnoise(x, z) {
  const ix = Math.floor(x), iz = Math.floor(z), fx = x - ix, fz = z - iz;
  const u = fx * fx * (3 - 2 * fx), v = fz * fz * (3 - 2 * fz);
  const a = hash2(ix, iz), b = hash2(ix + 1, iz), c = hash2(ix, iz + 1), d = hash2(ix + 1, iz + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
const fbm = (x, z) => vnoise(x, z) * 0.5 + vnoise(x * 2.03 + 7, z * 2.03 + 3) * 0.3 + vnoise(x * 4.1 + 1, z * 4.1 + 9) * 0.2;
function ground0(x, z) {
  const u = z - zAxis(x), a = Math.abs(u);
  let y;
  // A flat floor and steep walls that steepen toward the rim.
  if (a < W_G) y = FLOOR + (DECK - 6 - FLOOR) * Math.pow(a / W_G, 2.1);
  else {
    // The far side levels out under the peaks; the near side climbs.
    const d = a - W_G;
    y = DECK - 6 + (u < 0 ? 45 * (1 - Math.exp(-d / 80)) + 0.012 * d : 80 * (1 - Math.exp(-d / 90)) + 0.05 * d);
  }
  // Rough rock everywhere but the deepest floor.
  const rough = (fbm(x * 0.006, z * 0.006) - 0.5) * 46 + (fbm(x * 0.02 + 5, z * 0.02) - 0.5) * 18;
  return y + rough * Math.min(1, a / 120);
}
// Track samples, for the cut through each hill.
const TS = [];
for (let s = CUT_A - 40; s <= CUT_B + 40; s += 4) { const c = atX(s); TS.push([s, c.x, c.z]); }
function ground(x, z) {
  const y = ground0(x, z);
  let best = 1e9, bs = 0;
  for (const [s, tx, tz] of TS) { const d = (x - tx) ** 2 + (z - tz) ** 2; if (d < best) { best = d; bs = s; } }
  // The cut stays open from shed back to shed back.
  if (bs < CUT_A || bs > CUT_B) return y;
  return Math.min(y, DECK - 0.4 + Math.max(0, Math.sqrt(best) - 7) * 0.9);
}
{
  // Grid lines close together near the span and wide apart far out.
  const axis = (a, b, c) => { const v = []; for (let x = a; x < b;) { v.push(x); x += 14 + Math.abs(x - c) * 0.045; } v.push(b); return v; };
  const xs = axis(-5200, 4200, -120), zs = axis(-4200, 1600, -320);
  const nx = xs.length, nz = zs.length, pos = new Float32Array(nx * nz * 3), idx = [];
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    const k = (j * nx + i) * 3;
    pos[k] = xs[i]; pos[k + 1] = ground(xs[i], zs[j]); pos[k + 2] = zs[j];
  }
  for (let j = 0; j < nz - 1; j++) for (let i = 0; i < nx - 1; i++) {
    const a = j * nx + i, b = a + 1, c = a + nx, d = c + 1;
    idx.push(a, c, b, b, c, d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  scene.add(new THREE.Mesh(g, rock));
}

const castParts = [], steelParts = [];
// Sweep a convex profile [across, up] along the track; faces stay flat.
// aSU holds arc length and across offset for the precast shader.
function sweep(prof, s0, s1, step) {
  const n = Math.max(1, Math.ceil((s1 - s0) / step)), fr = [];
  for (let i = 0; i <= n; i++) { const s = s0 + (s1 - s0) * i / n, c = atX(s); fr.push({ s, x: c.x, z: c.z, nx: -c.tan.y, nz: c.tan.x }); }
  const cu = prof.reduce((a, p) => a + p[0], 0) / prof.length, cv = prof.reduce((a, p) => a + p[1], 0) / prof.length;
  const pos = [], nor = [], su = [];
  const P = (f, p) => [f.x + f.nx * p[0], DECK + p[1], f.z + f.nz * p[0]];
  for (let e = 0; e < prof.length; e++) {
    const a = prof[e], b = prof[(e + 1) % prof.length];
    // The outward normal points away from the profile centre.
    let nu = b[1] - a[1], nv = a[0] - b[0];
    if (nu * ((a[0] + b[0]) / 2 - cu) + nv * ((a[1] + b[1]) / 2 - cv) < 0) { nu = -nu; nv = -nv; }
    const nl = Math.hypot(nu, nv); nu /= nl; nv /= nl;
    for (let i = 0; i < n; i++) {
      const f0 = fr[i], f1 = fr[i + 1];
      const q = [[f0, a], [f0, b], [f1, b], [f1, a]];
      const N0 = new THREE.Vector3(f0.nx * nu, nv, f0.nz * nu);
      const v = q.map(([f, p]) => new THREE.Vector3(...P(f, p)));
      // Wind each quad so its face points along the normal.
      const flip = new THREE.Vector3().subVectors(v[1], v[0]).cross(new THREE.Vector3().subVectors(v[2], v[0])).dot(N0) < 0;
      for (const k of flip ? [0, 2, 1, 0, 3, 2] : [0, 1, 2, 0, 2, 3]) {
        const [f, p] = q[k];
        pos.push(...P(f, p)); nor.push(f.nx * nu, nv, f.nz * nu); su.push(f.s, p[0]);
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('aSU', new THREE.Float32BufferAttribute(su, 2));
  castParts.push(g);
}
// A vertical prism between two convex outlines [across, along], with caps.
// at gives the frame; across 99 marks it as a pier.
function prism(c, lo, hi, y0, y1, s) {
  const ax = -c.tan.y, az = c.tan.x;
  const W = (p, y) => new THREE.Vector3(c.x + ax * p[0] + c.tan.x * p[1], y, c.z + az * p[0] + c.tan.y * p[1]);
  const pos = [], push = (...vs) => { for (const v of vs) pos.push(v.x, v.y, v.z); };
  const n = lo.length, mid = W([0, 0], 0);
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n, a = W(lo[i], y0), b = W(lo[j], y0), d = W(hi[i], y1), e = W(hi[j], y1);
    const out = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5).sub(mid).setY(0);
    const fn = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(e, a));
    if (fn.dot(out) < 0) push(a, e, b, a, d, e); else push(a, b, e, a, e, d);
  }
  for (let i = 1; i < n - 1; i++) {
    const a = W(hi[0], y1), b = W(hi[i], y1), d = W(hi[i + 1], y1);
    if (new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(d, a)).y > 0) push(a, b, d); else push(a, d, b);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  g.setAttribute('aSU', new THREE.Float32BufferAttribute(new Float32Array(pos.length / 3 * 2).map((_, i) => (i % 2 ? 99 : s)), 2));
  castParts.push(g);
}
// A chamfered rectangle outline, w across and t along.
const chamfer = (w, t, k) => [[-w / 2 + k, -t / 2], [w / 2 - k, -t / 2], [w / 2, -t / 2 + k], [w / 2, t / 2 - k], [w / 2 - k, t / 2], [-w / 2 + k, t / 2], [-w / 2, t / 2 - k], [-w / 2, -t / 2 + k]];
// A box on the track frame at s: u across, y up, along the track.
function slab(s0, s1, u0, u1, y0, y1, list = castParts) {
  const sm = (s0 + s1) / 2, c = atX(sm, (u0 + u1) / 2);
  const g = new THREE.BoxGeometry(u1 - u0, y1 - y0, s1 - s0);
  g.rotateY(c.yaw);
  g.translate(c.x, (y0 + y1) / 2, c.z);
  const h = g.toNonIndexed();
  h.deleteAttribute('uv'); h.clearGroups();
  if (list === castParts) h.setAttribute('aSU', new THREE.Float32BufferAttribute(new Float32Array(h.attributes.position.count * 2).map((_, i) => (i % 2 ? 99 : sm)), 2));
  list.push(h);
}
{
  // Single-track box girder: a slab over a deep, narrow spine.
  sweep([[-HW, 0], [HW, 0], [HW, -0.6], [2.8, -0.9], [2.0, -3.4], [-2.0, -3.4], [-2.8, -0.9], [-HW, -0.6]], CUT_A - 20, CUT_B + 20, 3);
  // Low parapets.
  for (const k of [-1, 1]) sweep([[k * 3.9, 0], [k * HW, 0], [k * HW, 1.0], [k * 3.95, 1.0]], CUT_A - 20, CUT_B + 20, 3);
  // Rails: two thin steel bars on the track line.
  for (let s = CUT_A - 20; s < CUT_B + 20; s += 6) for (const u of [-0.75, 0.75]) slab(s, s + 6.05, u - 0.07, u + 0.07, DECK, DECK + 0.22, steelParts);
  // Paired piers, tapered, every 40 m.
  for (let s = 30; s <= LEN - 25; s += 40) {
    for (const u of [-2.2, 2.2]) {
      const c = atX(s, u), foot = ground0(c.x, c.z) - 4, top = DECK - 3.4;
      if (top - foot < 8) continue;
      // The shaft tapers 30 % toward the top.
      prism(c, chamfer(4.4, 6.4, 0.6), chamfer(3.1, 4.5, 0.5), foot, top - 3, s);
      prism(c, chamfer(3.1, 4.5, 0.5), chamfer(3.6, 5.6, 0.5), top - 3, top, s);
    }
    // A tie beam joins each pair under the girder.
    const c = atX(s);
    prism(c, chamfer(6, 1.6, 0.3), chamfer(6, 1.6, 0.3), DECK - 8.4, DECK - 6.4, s);
  }
}

/* Snow sheds: a concrete gallery at each end, open on the valley side. */
for (const [s0, s1, mouth] of [[CUT_A, SHED_A, SHED_A], [SHED_B, CUT_B, SHED_B]]) {
  // Roof slab, 12 m wide, with a snow-laden top.
  slab(s0, s1, -6, 6, DECK + 7.2, DECK + 8.6);
  // The hill-side wall is solid.
  slab(s0, s1, -6, -5, DECK, DECK + 7.2);
  // The valley side stands on posts.
  for (let s = s0 + 2; s <= s1 - 1; s += 6) slab(s - 0.4, s + 0.4, 4.9, 5.7, DECK, DECK + 7.2);
  slab(s0, s1, 4.9, 5.9, DECK + 6.2, DECK + 7.2);
  // A dim warm lamp hangs under the roof every 12 m.
  for (let s = s0 + 6; s < s1; s += 12) { const c = atX(s, 0); pin(new THREE.Vector3(c.x, DECK + 6.8, c.z), scale(WARM, 2.2)); }
  const c = atX((s0 + s1) / 2);
  addLight(new THREE.Vector3(c.x, DECK + 6.5, c.z), new THREE.Vector3(...WARM), 0.9, 14);
}
// Tunnel portals close each cut; the track runs on into the hill.
for (const [s, k] of [[CUT_A, -1], [CUT_B, 1]]) {
  const s0 = k > 0 ? s : s - 4, s1 = k > 0 ? s + 4 : s;
  slab(s0, s1, -14, -3.2, DECK - 2, DECK + 18);
  slab(s0, s1, 3.2, 14, DECK - 2, DECK + 18);
  slab(s0, s1, -3.2, 3.2, DECK + 7.5, DECK + 18);
}

if (castParts.length) scene.add(new THREE.Mesh(mergeGeometries(castParts), precast));
if (steelParts.length) scene.add(new THREE.Mesh(mergeGeometries(steelParts), steel));
{
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(flares.pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(flares.col, 3));
  g.setAttribute('size', new THREE.Float32BufferAttribute(flares.size, 1));
  g.setAttribute('aPin', new THREE.Float32BufferAttribute(flares.pin, 1));
  const p = new THREE.Points(g, flareMat);
  p.renderOrder = 3; p.frustumCulled = false;
  scene.add(p);
}
/* ---------- end span ---------- */

/* Peaks: two sawtooth rows of wedges behind the far shed. */
{
  // A wedge: a long ramp up to a crest, then a steep cliff down.
  // dir 1 rises to the right; both planes lean back from the foot.
  const tri = [];
  function wedge(x0, z, ramp, cliff, yLow, yCrest, yNext, dir, foot) {
    const dz = 420, X = x => x0 + dir * x;
    const L = [X(0), yLow, z], C = [X(ramp), yCrest, z], N = [X(ramp + cliff), yNext, z];
    const fL = [X(-80), foot, z + dz], fC = [X(ramp + 60), foot, z + dz], fN = [X(ramp + cliff + 160), foot, z + dz];
    tri.push(L, C, fC, L, fC, fL, C, N, fN, C, fN, fC);
  }
  function row(x0, x1, z, crest, width, dirs) {
    let x = x0, i = 0, yLow = crest * 0.62;
    while (x < x1) {
      // Wedges near the line of view are narrower, so the rhythm reads.
      const dir = dirs[i % dirs.length], ramp = width * (0.55 + rnd() * 0.9), cliff = width * (0.12 + rnd() * 0.12);
      const yC = crest * (0.8 + rnd() * 0.35), yN = crest * (0.55 + rnd() * 0.15), zz = z - (i % 3) * 60;
      if (dir > 0) wedge(x, zz, ramp, cliff, yLow, yC, yN, 1, 60);
      else wedge(x + ramp + cliff, zz, ramp, cliff, yN, yC, yLow, -1, 60);
      x += ramp + cliff - width * 0.15; yLow = yN; i++;
    }
  }
  // Three rows: low and close, then higher and further back.
  row(-3600, 1800, -2300, 470, 210, [1, 1, -1, 1, -1, 1, 1, -1]);
  row(-4600, 2600, -3000, 720, 300, [1, -1, 1, 1, -1, 1]);
  row(-5600, 3400, -3900, 1020, 420, [1, 1, -1, 1, 1, -1]);
  // The wedges wind both ways; the shader picks the face that looks out.
  const pos = new Float32Array(tri.length * 3);
  tri.forEach((v, i) => pos.set(v, i * 3));
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.computeVertexNormals();
  const n = g.attributes.normal;
  for (let i = 0; i < n.count; i++) if (n.getY(i) < 0) n.setXYZ(i, -n.getX(i), -n.getY(i), -n.getZ(i));
  const m = new THREE.Mesh(g, rock);
  scene.add(m);
}

/* Sky: the storm ceiling, drawn on a far sphere. */
const sky = new THREE.Mesh(new THREE.SphereGeometry(30000, 48, 24), new THREE.ShaderMaterial({
  uniforms: { ...k2 },
  side: THREE.BackSide, depthWrite: false,
  vertexShader: /* glsl */`varying vec3 vD; void main() { vD = position; vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = p.xyww; }`,
  fragmentShader: /* glsl */`
  varying vec3 vD;
  ${HEAD}
  void main() { gl_FragColor = vec4(k2sky(normalize(vD)), 1.0); }`,
}));
sky.renderOrder = -1;
sky.userData.sky = true;
scene.add(sky);

/* Framing: high at the near end, down the span; portrait backs off. */
const CAM = {
  w: { fov: 46, px: 70, py: 150, pz: 30, tx: -260, ty: 60, tz: -700 },
  p: { fov: 70, px: 80, py: 170, pz: 90, tx: -230, ty: 40, tz: -700 },
};
let view = { w: 1, h: 1, pr: 1 };
function frame(w, h, pr) {
  camera.aspect = w / h;
  const c = w >= h ? CAM.w : CAM.p;
  camera.fov = c.fov;
  camera.position.set(c.px, c.py, c.pz);
  camera.lookAt(c.tx, c.ty, c.tz);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld();
  view = { w, h, pr };
  projU.uScale.value = (h * pr) / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2)) / 400;
  // The moon disc sits upper left in every frame.
  k2.uMoonSky.value.copy(new THREE.Vector3(-0.62, 0.8, 0.5).unproject(camera).sub(camera.position).normalize());
  uploadLights();
}
uploadLights();

/* ---------- bake: a matte painting of everything that holds still ---------- */
// The still layer bakes twice: base light, then moonlight alone.
// The comp pass adds the moon layer through the drifting gaps.
const statics = new THREE.Group(), live = new THREE.Group(), skyG = new THREE.Group();
for (const o of [...scene.children]) (o.userData.live ? live : o.userData.sky ? skyG : statics).add(o);
scene.add(statics, live, skyG);
// Additive light adds colour but keeps the bake's coverage alpha.
statics.traverse(o => {
  for (const m of [].concat(o.material || [])) {
    if (m.blending !== THREE.AdditiveBlending) continue;
    m.blending = THREE.CustomBlending;
    m.blendEquation = THREE.AddEquation;
    m.blendSrc = THREE.OneFactor; m.blendDst = THREE.OneFactor;
    m.blendSrcAlpha = THREE.ZeroFactor; m.blendDstAlpha = THREE.OneFactor;
  }
});
const rtOpt = { type: THREE.HalfFloatType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter };
const baseRT = new THREE.WebGLRenderTarget(1, 1, { ...rtOpt, depthTexture: new THREE.DepthTexture(1, 1) });
const moonRT = new THREE.WebGLRenderTarget(1, 1, rtOpt);
const invVP = new THREE.Matrix4();
const comp = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
  uniforms: { ...k2, tBase: { value: baseRT.texture }, tMoon: { value: moonRT.texture }, tDepth: { value: baseRT.depthTexture }, uInvVP: { value: invVP } },
  depthTest: true, depthWrite: true, depthFunc: THREE.AlwaysDepth,
  vertexShader: /* glsl */`varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
  fragmentShader: /* glsl */`
  uniform sampler2D tBase, tMoon, tDepth;
  uniform mat4 uInvVP;
  varying vec2 vUv;
  ${HEAD}
  void main() {
    vec4 base = texture2D(tBase, vUv);
    float z = texture2D(tDepth, vUv).r;
    vec4 wp = uInvVP * vec4(vUv * 2.0 - 1.0, z * 2.0 - 1.0, 1.0);
    vec3 P = wp.xyz / wp.w;
    vec3 col = base.rgb;
    // The moon reaches the still layer only through the gaps.
    if (base.a > 0.001) col += texture2D(tMoon, vUv).rgb * k2gap(P);
    if (base.a < 0.999) {
      vec4 fp = uInvVP * vec4(vUv * 2.0 - 1.0, 1.0, 1.0);
      col += k2sky(normalize(fp.xyz / fp.w - cameraPosition)) * (1.0 - base.a);
    }
    gl_FragColor = vec4(col, 1.0);
    gl_FragDepthEXT = z;
  }`,
}));
comp.frustumCulled = false;
comp.renderOrder = -100;
scene.add(comp);
const clearC = new THREE.Color();
let bakes = 0;
function bake(renderer) {
  const { w, h, pr } = view;
  // The still layer bakes at up to twice the pixels, for smooth edges.
  const ss = Math.min(2, 4096 / (w * pr), 4096 / (h * pr));
  const bw = Math.round(w * pr * ss), bh = Math.round(h * pr * ss);
  baseRT.setSize(bw, bh); moonRT.setSize(bw, bh);
  const prevT = renderer.getRenderTarget(), prevA = renderer.getClearAlpha();
  renderer.getClearColor(clearC);
  camera.updateMatrixWorld();
  statics.visible = true; live.visible = false; skyG.visible = false; comp.visible = false;
  renderer.setClearColor(0x000000, 0);
  k2.uGapIn.value = 0;
  k2.uBaseOn.value = 1; k2.uMoonOn.value = 0;
  renderer.setRenderTarget(baseRT); renderer.clear(); renderer.render(scene, camera);
  k2.uBaseOn.value = 0; k2.uMoonOn.value = 1;
  renderer.setRenderTarget(moonRT); renderer.clear(); renderer.render(scene, camera);
  // Live parts take moon through the gaps themselves.
  k2.uGapIn.value = 1; k2.uBaseOn.value = 1;
  renderer.setRenderTarget(prevT);
  renderer.setClearColor(clearC, prevA);
  statics.visible = false; live.visible = true; comp.visible = true;
  invVP.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse).invert();
  bakes++;
}
/* ---------- end bake ---------- */

/* Motion: one clock drives the wind and the cloud gaps. */
let time = 0;
function update(dt, pace) {
  time += dt * pace;
  k2.uTime.value = time;
}
const lively = () => false;
function lower() {}

// Dispose frees every geometry, material and texture this scene made.
function dispose() {
  baseRT.dispose(); moonRT.dispose();
  statics.visible = skyG.visible = true;
  scene.traverse(o => {
    o.geometry?.dispose();
    for (const m of [].concat(o.material || [])) m.dispose();
  });
}

return { scene, camera, frame, bake, dispose, orbs, update, lively, lower, get bakes() { return bakes; }, post: { expo: 1.0, bloom: [0.7, 0.5, 1.4], orbK: 1, orbSize: 1, tint: '#0a0d14', vig: 0.35, vigIn: 0.45, grain: 0.05 } };
}
