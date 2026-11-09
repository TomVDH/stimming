// Pass: a long freight crosses a tall curved viaduct in a mountain storm.
// The moon breaks through drifting gaps in the cloud.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { makeTrain } from './train.js';

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
uniform float uBaseOn, uMoonOn, uGapIn, uStarK, uLightK, uFlareK, uConeK;
uniform vec2 uWind, uCloudOff;
uniform float uCurtK;
// Gap mask at a point on the cloud plane: 1 in a gap, 0 under cloud.
float k2gapAt(vec2 q) {
  // The cloud moves by the wind's sum, so gusts never make it jump.
  vec2 p = (q - uCloudOff) * uGapScale;
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
  uWind: { value: new THREE.Vector2(26, 9) }, uCloudOff: { value: new THREE.Vector2() }, uCurtK: { value: 1 },
  uFlareK: { value: 1 }, uLightK: { value: 1 }, uConeK: { value: 1 },
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

/* Peaks: sawtooth rows of wedges behind the far shed. */
// Crest points feed the spindrift.
const crests = [];
{
  // A wedge: a long ramp up to a crest, then a steep cliff down.
  // dir 1 rises to the right; both planes lean back from the foot.
  const tri = [];
  function wedge(x0, z, ramp, cliff, yLow, yCrest, yNext, dir, foot) {
    const dz = 420, X = x => x0 + dir * x;
    const L = [X(0), yLow, z], C = [X(ramp), yCrest, z], N = [X(ramp + cliff), yNext, z];
    const fL = [X(-80), foot, z + dz], fC = [X(ramp + 60), foot, z + dz], fN = [X(ramp + cliff + 160), foot, z + dz];
    tri.push(L, C, fC, L, fC, fL, C, N, fN, C, fN, fC);
    crests.push(C);
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

/* ---------- train: a long freight with a plough ---------- */
// Volumetric cone: soft silhouette, bright core, long fade, no hard base.
function cone(len, halfAngle, color, k, fallK) {
  const g = new THREE.ConeGeometry(Math.tan(halfAngle), 1, 48, 6, true);
  g.translate(0, -0.5, 0);
  const m = new THREE.Mesh(g, new THREE.ShaderMaterial({
    uniforms: { ...k2, uColor: { value: color }, uK: { value: k }, uFall: { value: fallK } },
    transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */`
    varying vec3 vP;
    varying vec3 vN;
    varying float vAlong;
    void main() {
      vAlong = clamp(-position.y, 0.0, 1.0);
      vec4 w = modelMatrix * vec4(position, 1.0);
      vP = w.xyz;
      vN = normalize(mat3(modelMatrix) * normal);
      gl_Position = projectionMatrix * viewMatrix * w;
    }`,
    fragmentShader: /* glsl */`
    uniform vec3 uColor;
    uniform float uK, uFall;
    varying vec3 vP;
    varying vec3 vN;
    varying float vAlong;
    ${HEAD}
    void main() {
      vec3 V = normalize(cameraPosition - vP);
      float rim = pow(abs(dot(normalize(vN), V)), 3.0);
      float fall = exp(-vAlong * uFall) * smoothstep(0.0, 0.12, vAlong) * smoothstep(1.0, 0.7, vAlong);
      float f = k2hazeAmount(vP);
      // Snowy air makes the beam read more.
      gl_FragColor = vec4(uColor * rim * fall * uK * uConeK * (0.6 + 0.8 * f), 1.0);
    }`,
  }));
  m.scale.set(len, len, len);
  m.renderOrder = 2;
  return m;
}
const CONSIST = ['loco', 'loco-b', 'box', 'hopper', 'box', 'box', 'hopper', 'car', 'box', 'hopper', 'box', 'car', 'hopper', 'box', 'box', 'hopper', 'box', 'car'];
const train = (() => {
  const shape = makeTrain({ consist: CONSIST, plough: true });
  const N = shape.parts.length, SPAN = shape.span;
  const path = (s, side = 0) => atX(s, TRACK + side);
  // Hull: dark paint, panel seams, snow caked on the roof and the windward flank.
  const hullMat = new THREE.ShaderMaterial({
    uniforms: { ...k2, ...lightU },
    vertexColors: true,
    vertexShader: /* glsl */`
    attribute float aKind;
    attribute float aTop;
    varying vec3 vP;
    varying vec3 vN;
    varying vec3 vL;
    varying vec3 vNL;
    varying vec3 vC;
    varying float vKind;
    varying float vTop;
    void main() {
      vec4 w = modelMatrix * vec4(position, 1.0);
      vP = w.xyz; vL = position; vNL = normal; vC = color; vKind = aKind; vTop = aTop;
      vN = normalize(mat3(modelMatrix) * normal);
      gl_Position = projectionMatrix * viewMatrix * w;
    }`,
    fragmentShader: /* glsl */`
    varying vec3 vP;
    varying vec3 vN;
    varying vec3 vL;
    varying vec3 vNL;
    varying vec3 vC;
    varying float vKind;
    varying float vTop;
    ${HEAD}
    ${LIGHTS_GLSL}
    float line(float d, float w, float aa) { return 1.0 - smoothstep(w, w + aa * 1.5 + 0.005, abs(d)); }
    void main() {
      vec3 N = normalize(vN), NL = normalize(vNL);
      float side = step(0.8, abs(NL.x));
      float az = fwidth(vL.z), ay = fwidth(vL.y);
      // Panel seams every 2.6 m and one at the waist, on the flanks only.
      float seam = side * max(line(fract(vL.z / 2.6 + 0.5) * 2.6 - 1.3, 0.02, az), line(vL.y - 2.9, 0.015, ay));
      vec3 albedo = vC * (1.0 - 0.6 * seam);
      albedo *= mix(0.35, 1.0, smoothstep(1.55, 1.62, vL.y));
      // Snow cakes the roof in drifts.
      float n = k2noise(vL.zx * vec2(0.7, 1.9) + vec2(vKind * 5.0, 0.0));
      float roof = vTop * smoothstep(0.2, 0.7, n) * 0.85;
      // Wind packs snow on the low windward flank.
      float face = side * smoothstep(0.1, 0.7, dot(N.xz, -normalize(uWind)));
      float flank = face * smoothstep(0.4, 0.7, k2noise(vL.zy * vec2(0.5, 1.6))) * smoothstep(3.2, 1.6, vL.y);
      albedo = mix(albedo, uSnowC, max(roof, flank * 0.85));
      vec3 c = k2lit(albedo, vP, N);
      // The cab slit glows across the nose.
      vec3 em = vec3(1.0, 0.62, 0.3) * 2.4 * vKind * step(0.3, NL.z) * step(abs(vL.x), 1.15) * line(vL.y - 3.5, 0.11, ay);
      // A cold marker line runs along each flank.
      em += vec3(0.7, 0.85, 1.0) * 0.9 * side * step(1.5, vL.y) * line(vL.y - 1.7, 0.03, ay);
      gl_FragColor = vec4(c + em * (1.0 - 0.7 * k2hazeAmount(vP)), 1.0);
    }`,
  });
  const cars = shape.parts.map(p => {
    const m = new THREE.Mesh(p.geo, hullMat);
    m.userData.live = true;
    scene.add(m);
    return m;
  });
  // Lamps: two tails, two heads, then a marker pin each side per wagon.
  const NP = 4 + (N - 2) * 2;
  const lampG = new THREE.BufferGeometry();
  lampG.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(NP * 3), 3).setUsage(THREE.DynamicDrawUsage));
  const col = [...scale([1, 0.2, 0.1], 6), ...scale([1, 0.2, 0.1], 6), ...scale(WHITE, 9), ...scale(WHITE, 9)], size = [70, 70, 120, 120], pinK = [0, 0, 0, 0];
  for (let i = 4; i < NP; i++) { col.push(...scale([1, 0.45, 0.12], 1.4)); size.push(14); pinK.push(1); }
  lampG.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  lampG.setAttribute('size', new THREE.Float32BufferAttribute(size, 1));
  lampG.setAttribute('aPin', new THREE.Float32BufferAttribute(pinK, 1));
  const lamps = new THREE.Points(lampG, flareMat);
  lamps.renderOrder = 3; lamps.frustumCulled = false; lamps.userData.live = true; scene.add(lamps);
  const head = new THREE.Vector3();
  orbs.push({ pos: head, color: [1, 0.95, 0.85], k: 0.6, size: 1.3, train: true });
  // The headlight is a spot in the light list, aimed down the track.
  const headL = lights.length, HEAD_P = 14;
  addLight(new THREE.Vector3(), new THREE.Vector3(1, 0.95, 0.85), HEAD_P, 60, new THREE.Vector3(0, 0, -1), Math.cos(0.3));
  const beam = cone(160, 0.2, new THREE.Vector3(1, 0.95, 0.85), 2.2, 2.4);
  beam.userData.live = true;
  scene.add(beam);
  const Y = new THREE.Vector3(0, -1, 0), dir3 = new THREE.Vector3();
  // Place the train: s is the nose's place on the track, dir its heading.
  function place(s, dir) {
    shape.lay(s, dir, path, (i, x, z, yaw) => { cars[i].position.set(x, DECK, z); cars[i].rotation.y = yaw; });
    const L = shape.lamps(s, dir, path), h = L.head, ahead = path(s + dir * 80);
    head.set(h.x, DECK + 2.0, h.z);
    // The beam dips to meet the rails about 30 m ahead.
    dir3.set(ahead.x - h.x, -5.5, ahead.z - h.z).normalize();
    lights[headL].pos.copy(head); lights[headL].dir.copy(dir3);
    lights[headL].power = on ? HEAD_P : 0;
    beam.position.copy(head);
    beam.quaternion.setFromUnitVectors(Y, dir3);
    const pos = lampG.attributes.position;
    for (const k of [0, 1]) {
      pos.setXYZ(k, L.tails[k].x, DECK + 1.6, L.tails[k].z);
      pos.setXYZ(k + 2, L.heads[k].x, DECK + 1.75, L.heads[k].z);
    }
    // Marker pins sit at mid flank on every wagon.
    for (let i = 2, k = 4; i < N; i++) {
      for (const u of [-1.7, 1.7]) { const c = path(s - dir * shape.parts[i].off, u); pos.setXYZ(k++, c.x, DECK + 1.9, c.z); }
    }
    pos.needsUpdate = true;
  }
  let on = true;
  function show(v) { on = v; for (const c of cars) c.visible = v; lamps.visible = beam.visible = v; lights[headL].power = v ? HEAD_P : 0; }
  return { place, show, SPAN, headL, head, dir: dir3, get on() { return on; } };
})();
/* ---------- end train ---------- */

/* ---------- K2: precipitation ---------- */
// Snow in three layers, one wind. The headlamp lights flakes in its beam.
// Spray leaves the plough; spindrift streams off the moonlit crests.
const snowU = {
  uDrift: { value: new THREE.Vector3() },
  uCenter: { value: new THREE.Vector3() },
  uHP: { value: new THREE.Vector3() }, uHD: { value: new THREE.Vector3(0, 0, -1) }, uHOn: { value: 1 },
  uFwd: { value: new THREE.Vector3(0, 0, -1) }, uSpeedK: { value: 0 }, uPlough: { value: new THREE.Vector3() },
  uSnowK: { value: 1 }, uSprayK: { value: 1 }, uDriftK: { value: 1 },
};
const SNOW_GLSL = /* glsl */`
uniform vec3 uDrift, uCenter, uHP, uHD, uFwd, uPlough;
uniform float uHOn, uSpeedK, uSnowK, uSprayK, uDriftK, uScale;
// Headlamp light on a flake: a cone down the track, fading with distance.
float k2beam(vec3 p) {
  vec3 L = p - uHP;
  float a = dot(L, uHD);
  if (a <= 0.0) return 0.0;
  float r = length(L - uHD * a);
  return uHOn * smoothstep(a * 0.34, a * 0.12, r) * exp(-a / 70.0) * smoothstep(0.0, 3.0, a);
}
// Moon on a flake through the gaps, plus the storm ambient.
vec3 k2flake(vec3 p) {
  return uAir * 12.0 + uMoonC * uMoonK * 0.6 * k2gap(p) + vec3(1.0, 0.94, 0.82) * 9.0 * k2beam(p);
}`;
function snowLayer({ n, box, center, size, streak, kind, seedK }) {
  const g = new THREE.BufferGeometry();
  const pos = new Float32Array(n * 3), seed = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) {
    pos.set([rnd() * box[0], rnd() * box[1], rnd() * box[2]], i * 3);
    seed.set([rnd(), rnd(), rnd(), rnd()], i * 4);
  }
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 4));
  const m = new THREE.Points(g, new THREE.ShaderMaterial({
    uniforms: { ...k2, ...projU, ...snowU, uBox: { value: new THREE.Vector3(...box) }, uFix: { value: new THREE.Vector3(...(center || [0, 0, 0])) } },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    defines: { KIND: kind },
    vertexShader: /* glsl */`
    attribute vec4 aSeed;
    uniform vec3 uBox, uFix;
    varying vec3 vC;
    varying float vA;
    varying vec2 vDir;
    ${HEAD}
    ${SNOW_GLSL}
    void main() {
      vec3 p;
      float a = 1.0;
#if KIND == 0 || KIND == 1
      // Flakes wrap in a box that rides with the camera, or sits on the span.
      vec3 c = KIND == 0 ? uCenter : uFix;
      vec3 sway = vec3(sin(uTime * 1.3 + aSeed.x * 40.0), 0.0, cos(uTime * 1.1 + aSeed.y * 40.0)) * 0.6;
      p = mod(position + uDrift * (0.8 + 0.4 * aSeed.z) - c + uBox * 0.5, uBox) - uBox * 0.5 + c + sway;
      a = uSnowK;
#elif KIND == 2
      // Spray: each grain flies out of the plough on its own beat.
      float age = fract(uTime * 1.6 + aSeed.x);
      float side = aSeed.y < 0.5 ? -1.0 : 1.0;
      vec3 right = normalize(vec3(-uFwd.z, 0.0, uFwd.x));
      vec3 v = right * side * (5.0 + 9.0 * aSeed.z) + uFwd * (2.0 + 6.0 * aSeed.w) * uSpeedK + vec3(0.0, 4.0 + 6.0 * aSeed.w, 0.0);
      p = uPlough + v * age * (0.6 + uSpeedK) + vec3(uWind.x, -9.0, uWind.y) * 0.06 * age * age * 6.0;
      // More grains fly as the train runs faster; none at rest.
      a = step(aSeed.z, uSpeedK) * (1.0 - age) * smoothstep(0.0, 0.08, age) * uSprayK;
#else
      // Spindrift: thin plumes streaming downwind off each crest.
      float age = fract(uTime * 0.12 + aSeed.x);
      vec3 w = normalize(vec3(uWind.x, 0.0, uWind.y));
      p = position + w * age * (160.0 + 120.0 * aSeed.y) + vec3(0.0, 30.0 * age * aSeed.z - 10.0 * age, 0.0) + vec3(aSeed.z - 0.5, 0.0, aSeed.w - 0.5) * 18.0 * age;
      a = (1.0 - age) * smoothstep(0.0, 0.1, age) * uDriftK * smoothstep(0.2, 0.7, k2gap(position));
#endif
      vec4 mv = viewMatrix * vec4(p, 1.0);
      vC = k2flake(p) * (1.0 - 0.6 * k2hazeAmount(p));
      vA = a;
      // Streaks stretch along the wind on screen.
      vec4 q = projectionMatrix * viewMatrix * vec4(p + vec3(uWind.x, -6.0, uWind.y) * 0.08, 1.0);
      vec4 o = projectionMatrix * mv;
      vDir = normalize(q.xy / q.w - o.xy / o.w + 1e-5);
      gl_PointSize = clamp(${size.toFixed(1)} * uScale / -mv.z, 1.0, ${streak ? '14.0' : '7.0'});
      gl_Position = o;
    }`,
    fragmentShader: /* glsl */`
    varying vec3 vC;
    varying float vA;
    varying vec2 vDir;
    void main() {
      vec2 c = gl_PointCoord - 0.5;
      c.y = -c.y;
      ${streak
        ? 'float along = dot(c, vDir), across = dot(c, vec2(-vDir.y, vDir.x)); float a = exp(-across * across * 400.0) * smoothstep(0.5, 0.1, abs(along));'
        : 'float a = smoothstep(0.5, 0.15, length(c));'}
      gl_FragColor = vec4(vC * a * vA * ${seedK.toFixed(2)}, 1.0);
    }`,
  }));
  m.frustumCulled = false; m.renderOrder = 4; m.userData.live = true;
  scene.add(m);
  return m;
}
const near = snowLayer({ n: 2500, box: [140, 90, 140], kind: 0, size: 80, streak: false, seedK: 1.0 });
const mid = snowLayer({ n: 4000, box: [900, 320, 1000], center: [-150, 70, -380], kind: 1, size: 700, streak: true, seedK: 0.9 });
const spray = snowLayer({ n: 1200, box: [1, 1, 1], kind: 2, size: 70, streak: false, seedK: 0.9 });
let drift = null;
{
  // Thirty grains per crest, all born on the crest point.
  const g = 30, pts = crests.filter(c => c[1] > 520);
  drift = snowLayer({ n: pts.length * g, box: [1, 1, 1], kind: 3, size: 900, streak: false, seedK: 0.18 });
  const a = drift.geometry.attributes.position;
  pts.forEach((c, i) => { for (let k = 0; k < g; k++) a.setXYZ(i * g + k, c[0], c[1], c[2]); });
}
const wind = { x: 26, z: 9, gust: 1 };
let curtK = 1;
/* ---------- end K2 ---------- */

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
// World normals of the still layer, so the headlight can relight it.
const normRT = new THREE.WebGLRenderTarget(1, 1, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter });
const normalMat = new THREE.ShaderMaterial({
  vertexShader: /* glsl */`varying vec3 vN; void main() { vN = mat3(modelMatrix) * normal; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */`varying vec3 vN; void main() { vec3 N = length(vN) > 0.01 ? normalize(vN) : vec3(0.0, 1.0, 0.0); gl_FragColor = vec4(N * 0.5 + 0.5, 1.0); }`,
});
// The headlight slot for the relight: position and power, colour and range, spot.
const headU = { uTP: { value: new THREE.Vector4() }, uTC: { value: new THREE.Vector4() }, uTD: { value: new THREE.Vector4() } };
const invVP = new THREE.Matrix4();
const comp = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
  uniforms: { ...k2, ...headU, tBase: { value: baseRT.texture }, tMoon: { value: moonRT.texture }, tDepth: { value: baseRT.depthTexture }, tNorm: { value: normRT.texture }, uInvVP: { value: invVP } },
  depthTest: true, depthWrite: true, depthFunc: THREE.AlwaysDepth,
  vertexShader: /* glsl */`varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
  fragmentShader: /* glsl */`
  uniform sampler2D tBase, tMoon, tDepth, tNorm;
  uniform mat4 uInvVP;
  uniform vec4 uTP, uTC, uTD;
  varying vec2 vUv;
  ${HEAD}
  // Headlight on a baked pixel: a pool on the snow and a soft highlight.
  vec3 headLight(vec3 P, vec3 N, vec3 V) {
    if (uTP.w <= 0.0) return vec3(0.0);
    vec3 L = uTP.xyz - P;
    float d = length(L);
    if (d > uTC.w * 8.0) return vec3(0.0);
    L /= d;
    float att = uTP.w * uLightK / (1.0 + pow(d / uTC.w, 2.0));
    float spot = smoothstep(uTD.w, uTD.w + 0.12, dot(-L, uTD.xyz));
    float diff = max(dot(N, L) * 0.85 + 0.15, 0.0);
    float sp = pow(max(dot(N, normalize(L + V)), 0.0), 40.0) * 0.6;
    return uTC.rgb * att * spot * (0.35 * diff + sp);
  }
  void main() {
    vec4 base = texture2D(tBase, vUv);
    float z = texture2D(tDepth, vUv).r;
    vec4 wp = uInvVP * vec4(vUv * 2.0 - 1.0, z * 2.0 - 1.0, 1.0);
    vec3 P = wp.xyz / wp.w;
    vec3 col = base.rgb;
    // One gap sample per pixel serves the moon layer and the curtains.
    float g = base.a > 0.001 ? k2gap(P) : 0.5;
    // The moon reaches the still layer only through the gaps.
    if (base.a > 0.001) {
      col += texture2D(tMoon, vUv).rgb * g;
      vec4 nz = texture2D(tNorm, vUv);
      if (nz.a > 0.5) col += headLight(P, normalize(nz.xyz * 2.0 - 1.0), normalize(cameraPosition - P)) * (1.0 - k2hazeAmount(P));
    }
    vec4 fp = uInvVP * vec4(vUv * 2.0 - 1.0, 1.0, 1.0);
    vec3 dir = normalize(fp.xyz / fp.w - cameraPosition);
    if (base.a < 0.999) col += k2sky(dir) * (1.0 - base.a);
    // Far curtains: sheets of snow at three depths, in front of the pixel.
    float dist = base.a > 0.5 ? length(P - cameraPosition) : 1e9;
    for (int i = 0; i < 3; i++) {
      float D = 260.0 * pow(2.2, float(i));
      if (D > dist || uCurtK <= 0.0) break;
      vec3 Q = cameraPosition + dir * D;
      vec2 u = vec2((Q.x + Q.z * 0.5 - uCloudOff.x * 1.6) * 0.005, Q.y * 0.006 + uTime * 0.06);
      float sheet = smoothstep(0.4, 0.85, k2noise(u) * 0.65 + k2noise(u * 2.7 + 4.0) * 0.35);
      col += (uAir * 2.2 + uMoonC * uMoonK * 0.07 * g) * sheet * 0.6 * uCurtK * (1.0 - 0.25 * float(i));
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
  // No headlight may stay baked on the deck.
  lightU.uLP.value[train.headL].w = 0;
  k2.uGapIn.value = 0;
  k2.uBaseOn.value = 1; k2.uMoonOn.value = 0;
  renderer.setRenderTarget(baseRT); renderer.clear(); renderer.render(scene, camera);
  k2.uBaseOn.value = 0; k2.uMoonOn.value = 1;
  renderer.setRenderTarget(moonRT); renderer.clear(); renderer.render(scene, camera);
  // Live parts take moon through the gaps themselves.
  k2.uGapIn.value = 1; k2.uBaseOn.value = 1;
  // Normals: see-through parts stay out, so they never take the headlight.
  normRT.setSize(Math.round(w * pr), Math.round(h * pr));
  const hid = [];
  statics.traverse(o => { if (o.visible && [].concat(o.material || []).some(m => m.transparent)) { o.visible = false; hid.push(o); } });
  scene.overrideMaterial = normalMat;
  renderer.setRenderTarget(normRT); renderer.clear(); renderer.render(scene, camera);
  scene.overrideMaterial = null;
  for (const o of hid) o.visible = true;
  renderer.setRenderTarget(prevT);
  renderer.setClearColor(clearC, prevA);
  statics.visible = false; live.visible = true; comp.visible = true;
  invVP.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse).invert();
  uploadLights();
  bakes++;
}
/* ---------- end bake ---------- */

/* Motion: one clock drives the wind and the gaps; the freight runs end to end. */
// t counts seconds since the train left its end; 99 means at cruise.
const run = { s: 120, dir: 1, v: 13, wait: 0, gone: false, user: false, t: 99 };
let runPause = 8;
// The tail hides 30 m into the hill past each cut.
const END = CUT_B + 30, START = CUT_A - 30;
let time = 0, paceNow = 1, parked = false;
// A parked train (QA) holds still at any speed setting.
const speed = () => (parked ? 0 : run.v);
const smoother = x => { x = Math.min(1, Math.max(0, x)); return x * x * x * (x * (6 * x - 15) + 10); };
// The train eases out over 6 s and brakes over its last 220 m.
function trainSpeed(s, dir, t) {
  const cruise = speed();
  if (cruise <= 0) return 0;
  const d = dir > 0 ? END + train.SPAN - s : s - (START - train.SPAN);
  if (d <= 0) return 0;
  // A quarter-circle brake starts smoothly and arrives in finite time.
  const x = Math.min(1, d / 220), brake = Math.sqrt(1 - (1 - x) ** 2);
  return Math.min(cruise, Math.max(0.05, cruise * Math.min(smoother(t / 6), brake)));
}
function update(dt, pace) {
  time += dt * pace;
  k2.uTime.value = time;
  paceNow = pace;
  const k = run.user ? 1 : pace;
  if (run.gone) {
    run.wait -= dt * k;
    if (run.wait <= 0) { run.gone = false; run.dir = -run.dir; run.s = run.dir > 0 ? START : END; run.t = 0; train.show(true); }
  } else {
    run.t += dt * k;
    run.vNow = trainSpeed(run.s, run.dir, run.t);
    run.s += run.dir * run.vNow * dt * k;
    if (run.s >= END + train.SPAN || run.s <= START - train.SPAN) { train.show(false); run.gone = true; run.wait = Math.max(1, runPause); run.user = false; run.vNow = 0; }
  }
  train.place(run.s, run.dir);
  // Gusts swing the wind between 0.6 and 1.4 of its base.
  wind.gust = 1 + 0.4 * Math.sin(time * 0.31) * Math.sin(time * 0.13 + 1.7);
  k2.uWind.value.set(wind.x * wind.gust, wind.z * wind.gust);
  k2.uCloudOff.value.addScaledVector(k2.uWind.value, dt * pace);
  snowU.uDrift.value.add(new THREE.Vector3(wind.x * wind.gust, -2.2, wind.z * wind.gust).multiplyScalar(dt * pace));
  snowU.uCenter.value.copy(camera.position).addScaledVector(camera.getWorldDirection(fwdV), 55);
  snowU.uHP.value.copy(train.head); snowU.uHD.value.copy(train.dir); snowU.uHOn.value = train.on ? 1 : 0;
  snowU.uPlough.value.copy(train.head).setY(DECK + 0.9);
  snowU.uFwd.value.copy(train.dir).setY(0).normalize();
  snowU.uSpeedK.value = train.on ? Math.min(1, (run.vNow || 0) / Math.max(1, run.v)) : 0;
  uploadLights();
  headU.uTP.value.copy(lightU.uLP.value[train.headL]);
  headU.uTC.value.copy(lightU.uLC.value[train.headL]);
  headU.uTD.value.copy(lightU.uLD.value[train.headL]);
}
const fwdV = new THREE.Vector3();
function sendTrain() {
  if (run.gone) run.wait = 0;
  run.user = true;
}
// Any tap sends a freight.
function tap() { sendTrain(); }
// A moving train runs at full rate, so it never steps.
const lively = () => run.user || (train.on && !run.gone && paceNow > 0);
// Lower applies the quality rung, down or back up.
function lower(rung) {
  mid.geometry.setDrawRange(0, rung >= 1 ? 2000 : Infinity);
  spray.geometry.setDrawRange(0, rung >= 1 ? 600 : Infinity);
  k2.uCurtK.value = rung >= 2 ? 0 : curtK;
  near.visible = rung < 3;
}

// Dispose frees every geometry, material and texture this scene made.
function dispose() {
  baseRT.dispose(); moonRT.dispose(); normRT.dispose(); normalMat.dispose();
  statics.visible = skyG.visible = true;
  scene.traverse(o => {
    o.geometry?.dispose();
    for (const m of [].concat(o.material || [])) m.dispose();
  });
}

/* ---------- tune: every look knob, for the ?tune panel ---------- */
// Each knob: group, key, label, range, step, default, and what it sets.
// bake: true knobs change the matte painting, so the page re-bakes.
const U = k2, S = snowU;
const col3 = (v3) => ({ get: () => '#' + new THREE.Color(v3.x * 4, v3.y * 4, v3.z * 4).getHexString(), set: hex => { const c = new THREE.Color(hex); v3.set(c.r / 4, c.g / 4, c.b / 4); } });
const uni = (u) => ({ get: () => u.value, set: v => { u.value = v; } });
const TUNE = [];
function knob(group, key, label, min, max, step, io, bake = false) { TUNE.push({ group, key, label, min, max, step, bake, def: io.get(), ...io }); }
function colour(group, key, label, v3, bake = false) { const io = col3(v3); TUNE.push({ group, key, label, type: 'color', bake, def: io.get(), ...io }); }
// Sky.
knob('Sky', 'moonK', 'Moonlight', 0, 3, 0.01, uni(U.uMoonK), true);
knob('Sky', 'moonAir', 'Moonlit air', 0, 0.3, 0.001, uni(U.uMoonAir), true);
knob('Sky', 'starK', 'Stars', 0, 3, 0.01, uni(U.uStarK));
colour('Sky', 'air', 'Storm air', U.uAir.value, true);
colour('Sky', 'zen', 'Clear sky', U.uZen.value);
// Cloud.
knob('Cloud', 'gapLo', 'Gaps open from', 0, 1, 0.01, uni(U.uGapLo));
knob('Cloud', 'gapHi', 'Gaps open to', 0, 1, 0.01, uni(U.uGapHi));
knob('Cloud', 'gapScale', 'Gap size', 0.0003, 0.004, 0.0001, uni(U.uGapScale));
knob('Cloud', 'windX', 'Wind across', -60, 60, 0.5, { get: () => wind.x, set: v => { wind.x = v; } });
knob('Cloud', 'windZ', 'Wind toward', -60, 60, 0.5, { get: () => wind.z, set: v => { wind.z = v; } });
knob('Cloud', 'cloudY', 'Cloud height', 400, 3000, 10, uni(U.uCloudY));
// Snow.
knob('Snow', 'snowK', 'Snowfall', 0, 3, 0.01, uni(S.uSnowK));
knob('Snow', 'curtK', 'Far curtains', 0, 3, 0.01, { get: () => curtK, set: v => { curtK = v; U.uCurtK.value = v; } });
knob('Snow', 'sprayK', 'Plough spray', 0, 3, 0.01, uni(S.uSprayK));
knob('Snow', 'driftK', 'Spindrift', 0, 3, 0.01, uni(S.uDriftK));
knob('Snow', 'haze', 'Snowy air', 0, 0.006, 0.00005, uni(U.uHaze), true);
knob('Snow', 'hazeH', 'Air height', 20, 600, 1, uni(U.uHazeH), true);
colour('Snow', 'snowC', 'Snow colour', U.uSnowC.value, true);
// Span.
colour('Span', 'amb', 'Storm light', U.uAmb.value, true);
knob('Span', 'lightK', 'Lamp power', 0, 4, 0.01, uni(U.uLightK), true);
// Train.
knob('Train', 'speed', 'Train speed', 2, 40, 0.5, { get: () => run.v, set: v => { run.v = v; } });
knob('Train', 'pause', 'Pause between trains', 0, 30, 0.5, { get: () => runPause, set: v => { runPause = v; } });
knob('Train', 'coneK', 'Headlight beam', 0, 4, 0.01, uni(U.uConeK));
knob('Train', 'flareK', 'Lamp flares', 0, 4, 0.01, uni(U.uFlareK));
// Lens: the camera, per orientation.
for (const [o, name] of [['w', 'Lens (wide)'], ['p', 'Lens (portrait)']]) {
  const c = CAM[o];
  const io = k => ({ get: () => c[k], set: v => { c[k] = v; frame(view.w, view.h, view.pr); } });
  knob(name, o + 'fov', 'Lens (fov)', 15, 100, 0.5, io('fov'), true);
  knob(name, o + 'px', 'Position x', -800, 800, 1, io('px'), true);
  knob(name, o + 'py', 'Height', 20, 600, 1, io('py'), true);
  knob(name, o + 'pz', 'Position z', -800, 900, 1, io('pz'), true);
  knob(name, o + 'tx', 'Look x', -1500, 1500, 1, io('tx'), true);
  knob(name, o + 'ty', 'Look y', -300, 400, 1, io('ty'), true);
  knob(name, o + 'tz', 'Look z', -3000, 200, 1, io('tz'), true);
}
const tune = {
  list: TUNE,
  // set returns true when the matte painting needs a re-bake.
  set(key, v) { const k = TUNE.find(t => t.key === key); if (!k) return false; k.set(v); return k.bake; },
};
/* ---------- end tune ---------- */

// QA can park the train with ?train=<s>, in metres along the track.
const parkAt = new URLSearchParams(location.search).get('train');
if (parkAt !== null) { parked = true; run.s = +parkAt; }
train.place(run.s, run.dir);

return { scene, camera, frame, bake, tune, dispose, orbs, update, tap, lively, lower, get bakes() { return bakes; }, get run() { return run; }, post: { expo: 1.0, bloom: [0.7, 0.5, 1.4], orbK: 1, orbSize: 1, tint: '#0a0d14', vig: 0.35, vigIn: 0.45, grain: 0.05 } };
}
