// Port: a railway causeway sweeps out over the sea to a far, fogged industrial port.

// The railway causeway is the hero; the port is a far, fogged backdrop.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export function build() {
// Seeded random keeps the scene the same on every load.
let seed = 1337;
const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const range = (a, b) => a + (b - a) * rnd();


const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(46, 1, 1, 9000);

// The port lies across the far horizon; its centre drives the amber glow.
const CX = -40, CZ = -1850, QUAY = -1480, CLOUD_Y = 260;

/* ---------- K2: sky ---------- */
// Shared GLSL: noise, the night sky, and the cloud ceiling lit from below.
const K2_NOISE = /* glsl */`
float k2hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float k2noise(vec2 p) {
  vec2 i = floor(p), f = fract(p), u = f * f * (3.0 - 2.0 * f);
  return mix(mix(k2hash(i), k2hash(i + vec2(1, 0)), u.x), mix(k2hash(i + vec2(0, 1)), k2hash(i + vec2(1, 1)), u.x), u.y);
}
float k2fbm(vec2 p) {
  float s = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) { s += a * k2noise(p); p = p * 2.03 + vec2(17.1, 9.2); a *= 0.5; }
  return s;
}`;
const K2_SKY = /* glsl */`
uniform vec3 uAmber;
uniform vec3 uCool;
uniform vec3 uGlow;
uniform float uGlowR;
uniform float uCloudY;
uniform vec3 uSearchHit;
// Horizontal alignment of a view direction with the port.
float k2face(vec3 dir) {
  vec2 toC = normalize(uGlow.xz - cameraPosition.xz);
  return max(dot(normalize(dir.xz + 1e-5), toC), 0.0);
}
vec3 k2sky(vec3 dir) {
  float face = k2face(dir);
  float up = max(dir.y, 0.0);
  // Dark zenith, a cool low band, a wide amber dome over the port.
  vec3 col = vec3(0.0025, 0.003, 0.006) + uCool * 0.02 * exp(-up * 10.0);
  col += uAmber * 0.07 * pow(face, 5.0) * exp(-up * 7.0);
  // The fog bank over the port glows just above the horizon.
  col += uAmber * 0.06 * pow(face, 2.0) * exp(-up * 28.0);
  if (dir.y > 0.002) {
    float t = (uCloudY - cameraPosition.y) / dir.y;
    vec3 p = cameraPosition + dir * t;
    float d = k2fbm(p.xz * 0.0028 + vec2(3.0, 7.0));
    float cloud = smoothstep(0.32, 0.78, d);
    // The underside takes amber from the port below it.
    float g = exp(-length(p.xz - uGlow.xz) / uGlowR);
    vec3 cc = uAmber * (0.003 + 0.16 * g) * (0.35 + 0.9 * cloud) + uCool * 0.002;
    // The searchlight leaves a pale patch on the cloud.
    cc += vec3(0.75, 0.82, 1.0) * 0.6 * exp(-length(p.xz - uSearchHit.xz) / 45.0) * (0.5 + cloud);
    float far = 1.0 - exp(-t / 4200.0);
    col = mix(cc, col, far * 0.7);
  }
  return col;
}`;
/* ---------- end K2 ---------- */

/* ---------- K2: haze ---------- */
// Height haze everywhere, plus a thick fog bank that wraps the port.
const K2_HAZE = /* glsl */`
uniform float uHaze;
uniform float uHazeH;
uniform float uPortZ;
uniform float uPortFog;
vec3 k2hazeColor(vec3 dir, vec3 P) {
  float face = k2face(dir);
  float near = exp(-length(P.xz - uGlow.xz) / uGlowR);
  vec3 cool = uCool * 0.012;
  return mix(cool, uAmber * 0.14, clamp(pow(face, 5.0) * 0.45 + near * 1.1, 0.0, 1.0));
}
float k2hazeAmount(vec3 P) {
  vec3 v = P - cameraPosition;
  float dist = length(v);
  float k = 1.0 / uHazeH;
  float h0 = max(cameraPosition.y, 0.0), h1 = max(P.y, 0.0), dh = h1 - h0;
  // Exponential height fog integrated along the ray.
  float avg = abs(dh) < 0.01 ? exp(-h0 * k) : (exp(-h0 * k) - exp(-h1 * k)) / (dh * k);
  float tau = dist * uHaze * max(avg, 0.0);
  // The part of the ray past the fog front, thinned with height.
  if (P.z < uPortZ) {
    float seg = dist * clamp((uPortZ - P.z) / max(cameraPosition.z - P.z, 1.0), 0.0, 1.0);
    tau += seg * uPortFog * exp(-h1 * 0.4 / 200.0);
  }
  return 1.0 - exp(-tau);
}
vec3 k2haze(vec3 c, vec3 P, float keep) {
  float f = k2hazeAmount(P) * keep;
  return mix(c, k2hazeColor(normalize(P - cameraPosition), P), f);
}`;
/* ---------- end K2 ---------- */

const k2 = {
  uAmber: { value: new THREE.Vector3(1.0, 0.46, 0.16) },
  uCool: { value: new THREE.Vector3(0.35, 0.45, 0.6) },
  uGlow: { value: new THREE.Vector3(CX, 0, CZ) },
  uGlowR: { value: 1100 },
  uCloudY: { value: CLOUD_Y },
  uSearchHit: { value: new THREE.Vector3() },
  uHaze: { value: 0.0011 },
  uHazeH: { value: 70 },
  uPortZ: { value: QUAY + 260 },
  uPortFog: { value: 0.05 },
};

// Light list for lit surfaces: position + power, colour + range, spot axis + cone.
const NL = 24;
const lights = [];
function addLight(pos, col, power, range, dir = null, cos = -2) {
  lights.push({ pos, col, power, range, dir: dir || new THREE.Vector3(0, -1, 0), cos });
}
// Glint list for the sea: the light sources that matter most.
const NG = 80;
const glints = [];
const addGlint = (pos, col, k) => glints.push({ pos, col, k });

const LIGHTS_GLSL = /* glsl */`
uniform vec4 uLP[${NL}];
uniform vec4 uLC[${NL}];
uniform vec4 uLD[${NL}];
uniform int uLN;
vec3 k2lights(vec3 P, vec3 N) {
  vec3 sum = vec3(0.0);
  for (int i = 0; i < ${NL}; i++) {
    if (i >= uLN) break;
    // Short-range lamps light only what is near their own height.
    if (uLC[i].w < 20.0 && P.y < uLP[i].y - 9.0) continue;
    vec3 L = uLP[i].xyz - P;
    float d = length(L);
    L /= d;
    float att = uLP[i].w / (1.0 + pow(d / uLC[i].w, 2.0));
    float spot = 1.0;
    if (uLD[i].w > -1.5) spot = smoothstep(uLD[i].w, uLD[i].w + 0.12, dot(-L, uLD[i].xyz));
    float wrap = max(dot(N, L) * 0.85 + 0.15, 0.0);
    sum += uLC[i].rgb * att * spot * wrap;
  }
  return sum;
}
// Tight highlights for steel: a sharp reflection of each light.
vec3 k2spec(vec3 P, vec3 N, vec3 V, float shin) {
  vec3 sum = vec3(0.0);
  for (int i = 0; i < ${NL}; i++) {
    if (i >= uLN) break;
    vec3 L = uLP[i].xyz - P;
    float d = length(L);
    L /= d;
    float att = uLP[i].w / (1.0 + pow(d / uLC[i].w, 2.0));
    float s = pow(max(dot(N, normalize(L + V)), 0.0), shin);
    sum += uLC[i].rgb * att * s;
  }
  return sum;
}`;

const lightU = {
  uLP: { value: Array.from({ length: NL }, () => new THREE.Vector4()) },
  uLC: { value: Array.from({ length: NL }, () => new THREE.Vector4()) },
  uLD: { value: Array.from({ length: NL }, () => new THREE.Vector4()) },
  uLN: { value: 0 },
};
const glintU = {
  uGP: { value: Array.from({ length: NG }, () => new THREE.Vector4()) },
  uGC: { value: Array.from({ length: NG }, () => new THREE.Vector4()) },
  uGN: { value: 0 },
};
const projU = { uScale: { value: 1 } };

const WORLD_VS = /* glsl */`
varying vec3 vP;
varying vec3 vN;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vP = w.xyz;
  vN = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * w;
}`;
const HEAD = `${K2_NOISE}\n${K2_SKY}\n${K2_HAZE}`;

// Concrete: grey with panel variance, lit by the light list, then hazed.
const concrete = new THREE.ShaderMaterial({
  uniforms: { ...k2, ...lightU },
  vertexShader: WORLD_VS,
  fragmentShader: /* glsl */`
  varying vec3 vP;
  varying vec3 vN;
  ${HEAD}
  ${LIGHTS_GLSL}
  void main() {
    vec3 N = normalize(vN);
    float panel = k2noise(vP.xz * 0.11 + vP.y * 0.07) * 0.5 + k2noise(vec2(vP.y * 0.6, vP.x * 0.05 + vP.z * 0.05)) * 0.5;
    vec3 albedo = vec3(0.30, 0.29, 0.28) * (0.75 + 0.45 * panel);
    float under = exp(-length(vP.xz - uGlow.xz) / uGlowR);
    vec3 amb = uCool * 0.006 + uAmber * 0.04 * under * max(N.y, 0.0) + uAmber * 0.008 * under;
    vec3 c = albedo * (amb + k2lights(vP, N));
    gl_FragColor = vec4(k2haze(c, vP, 1.0), 1.0);
  }`,
});

// Rails: dark steel that throws back each lamp as a sharp glint.
const steel = new THREE.ShaderMaterial({
  uniforms: { ...k2, ...lightU },
  vertexShader: WORLD_VS,
  fragmentShader: /* glsl */`
  varying vec3 vP;
  varying vec3 vN;
  ${HEAD}
  ${LIGHTS_GLSL}
  void main() {
    vec3 N = normalize(vN);
    vec3 V = normalize(cameraPosition - vP);
    vec3 c = vec3(0.02) * k2lights(vP, N) + k2spec(vP, N, V, 9.0) * 8.0 + k2sky(reflect(-V, N)) * 1.4;
    gl_FragColor = vec4(k2haze(c, vP, 1.0), 1.0);
  }`,
});

// Emissive strips: bright, hazed a little less than surfaces.
const glowMat = new THREE.ShaderMaterial({
  uniforms: { ...k2 },
  vertexColors: true,
  vertexShader: /* glsl */`
  varying vec3 vP;
  varying vec3 vC;
  void main() {
    vec4 w = modelMatrix * vec4(position, 1.0);
    vP = w.xyz; vC = color;
    gl_Position = projectionMatrix * viewMatrix * w;
  }`,
  fragmentShader: /* glsl */`
  varying vec3 vP;
  varying vec3 vC;
  ${HEAD}
  void main() { gl_FragColor = vec4(k2haze(vC, vP, 0.7), 1.0); }`,
});

// Point flares for every small light; a minimum size keeps far ones visible.
const flareMat = new THREE.ShaderMaterial({
  uniforms: { ...k2, ...projU },
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  vertexShader: /* glsl */`
  attribute vec3 color;
  attribute float size;
  uniform float uScale;
  varying vec3 vC;
  varying vec3 vP;
  void main() {
    vec4 w = modelMatrix * vec4(position, 1.0);
    vP = w.xyz; vC = color;
    vec4 mv = viewMatrix * w;
    gl_PointSize = clamp(size * uScale / -mv.z, 2.0, 48.0);
    gl_Position = projectionMatrix * mv;
  }`,
  fragmentShader: /* glsl */`
  varying vec3 vC;
  varying vec3 vP;
  ${HEAD}
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float a = exp(-dot(c, c) * 22.0);
    float f = k2hazeAmount(vP) * 0.65;
    gl_FragColor = vec4(vC * a * (1.0 - f), 1.0);
  }`,
});

// Lit vapour: big soft puffs that take amber from below.
const plumeMat = new THREE.ShaderMaterial({
  uniforms: { ...k2, ...projU },
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  vertexShader: /* glsl */`
  attribute float size;
  attribute float lit;
  uniform float uScale;
  varying float vLit;
  varying vec3 vP;
  void main() {
    vec4 w = modelMatrix * vec4(position, 1.0);
    vP = w.xyz; vLit = lit;
    vec4 mv = viewMatrix * w;
    gl_PointSize = size * uScale / -mv.z;
    gl_Position = projectionMatrix * mv;
  }`,
  fragmentShader: /* glsl */`
  varying float vLit;
  varying vec3 vP;
  ${HEAD}
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float r = length(c) * 2.0;
    float n = k2noise(gl_PointCoord * 4.0 + vP.xy * 0.01);
    float a = smoothstep(1.0, 0.0, r) * (0.55 + 0.45 * n);
    // Lit from below: brighter at the bottom of each puff.
    vec3 col = uAmber * (0.03 + 0.06 * vLit) * (1.0 + 0.8 * c.y);
    float f = k2hazeAmount(vP) * 0.5;
    gl_FragColor = vec4(col * a * a * (1.0 - f), 1.0);
  }`,
});

/* Volumetric cones: soft silhouette, bright core, long fade, no hard base. */
function coneMat(color, k, fallK = 3.2) {
  return new THREE.ShaderMaterial({
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
    uniform float uK;
    uniform float uFall;
    varying vec3 vP;
    varying vec3 vN;
    varying float vAlong;
    ${HEAD}
    void main() {
      vec3 V = normalize(cameraPosition - vP);
      // Facing ratio peaks on the axis and falls to zero at the silhouette.
      float rim = pow(abs(dot(normalize(vN), V)), 3.0);
      float fall = exp(-vAlong * uFall) * smoothstep(0.0, 0.12, vAlong) * smoothstep(1.0, 0.7, vAlong);
      float f = k2hazeAmount(vP);
      float a = rim * fall * uK * (0.4 + 0.6 * smoothstep(0.0, 0.5, f)) * (1.0 - 0.6 * f);
      gl_FragColor = vec4(uColor * a, 1.0);
    }`,
  });
}
// A cone with its apex at the origin, opening along -y, unit length.
function cone(pos, dir, len, halfAngle, color, k, fallK) {
  const g = new THREE.ConeGeometry(Math.tan(halfAngle), 1, 48, 6, true);
  g.translate(0, -0.5, 0);
  const m = new THREE.Mesh(g, coneMat(color, k, fallK));
  m.position.copy(pos);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir.clone().normalize());
  m.scale.set(len, len, len);
  m.renderOrder = 2;
  scene.add(m);
  return m;
}

// Geometry helpers: parts bake in place, then merge into one draw each.
const parts = [], glowParts = [], railParts = [];
function box(x, y, z, w, h, d, ry = 0, list = parts, col = null) {
  const g = new THREE.BoxGeometry(w, h, d);
  if (ry) g.rotateY(ry);
  g.translate(x, y + h / 2, z);
  if (col) paint(g, col);
  list.push(g.toNonIndexed());
}
function cyl(x, y, z, r, h, seg = 24) {
  const g = new THREE.CylinderGeometry(r, r, h, seg, 1);
  g.translate(x, y + h / 2, z);
  parts.push(g.toNonIndexed());
}
function dome(x, y, z, r) {
  const g = new THREE.SphereGeometry(r, 24, 6, 0, Math.PI * 2, 0, Math.PI / 2);
  g.scale(1, 0.32, 1);
  g.translate(x, y, z);
  parts.push(g.toNonIndexed());
}
function paint(g, c) {
  const n = g.attributes.position.count, a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { a[i * 3] = c[0]; a[i * 3 + 1] = c[1]; a[i * 3 + 2] = c[2]; }
  g.setAttribute('color', new THREE.BufferAttribute(a, 3));
}
const flares = { pos: [], col: [], size: [] };
function flare(p, c, size) { flares.pos.push(p.x, p.y, p.z); flares.col.push(...c); flares.size.push(size); }
const plumes = { pos: [], size: [], lit: [] };

const SODIUM = [1.0, 0.52, 0.18], WHITE = [1.0, 0.92, 0.8], RED = [1.0, 0.06, 0.03], FLUO = [0.75, 0.9, 1.0], WARM = [1.0, 0.72, 0.42];
const scale = (c, k) => c.map(v => v * k);

/* ---------- causeway: a long, gentle curve out to the port ---------- */
// Quadratic Bezier in plan; an arc-length table gives even spacing.
const B0 = new THREE.Vector2(48, 80), B1 = new THREE.Vector2(-540, -470), B2 = new THREE.Vector2(CX, QUAY + 30);
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
const DECK = 24, HW = 7.5;
{
  const SEG = 10;
  for (let s = 0; s < LEN; s += SEG) {
    const c = at(s + SEG / 2);
    box(c.x, DECK - 3.2, c.z, HW * 2, 3.2, SEG + 0.3, c.yaw);
    for (const side of [-1, 1]) {
      const e = at(s + SEG / 2, side * (HW - 0.3));
      box(e.x, DECK, e.z, 0.6, 1.2, SEG + 0.3, e.yaw);
    }
    // Twin rails on sleepers' line: thin steel bars.
    for (const side of [-0.75, 0.75]) {
      const r = at(s + SEG / 2, side - 1.6);
      box(r.x, DECK, r.z, 0.14, 0.22, SEG + 0.05, r.yaw, railParts);
    }
  }
  // Heavy piers with flared caps, standing in the sea.
  for (let s = 0; s <= LEN; s += 40) {
    const c = at(s);
    box(c.x, -6, c.z, 7, DECK - 3.2 - 2.6 + 6, 5.5, c.yaw);
    box(c.x, DECK - 5.8, c.z, HW * 2 - 1, 2.6, 7, c.yaw);
  }
  // Catenary masts in rhythm, with a small light at each top.
  const wire = [];
  for (let s = 8; s < LEN; s += 48) {
    const m = at(s, HW - 1.6), arm = at(s, -1.6);
    box(m.x, DECK, m.z, 0.45, 8.6, 0.45, m.yaw);
    const mid = at(s, (HW - 1.6 - 1.6) / 2 - 0.8);
    box(mid.x, DECK + 8.0, mid.z, HW - 1.6 + 1.6 + 1.2, 0.3, 0.3, mid.yaw + Math.PI / 2);
    flare(new THREE.Vector3(m.x, DECK + 8.9, m.z), scale(FLUO, 2.6), 60);
  }
  for (let s = 0; s <= LEN; s += 6) { const w = at(s, -1.6); wire.push(new THREE.Vector3(w.x, DECK + 6.9, w.z)); }
  const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(wire), new THREE.LineBasicMaterial({ color: new THREE.Color(0.05, 0.05, 0.055), transparent: true, opacity: 0.8 }));
  scene.add(line);
  // Sodium lamps on the parapets, alternating sides.
  let k = 0;
  for (let s = 20; s < LEN; s += 34, k++) {
    const side = k % 2 ? 1 : -1, p = at(s, side * (HW - 0.3));
    box(p.x, DECK + 1.2, p.z, 0.3, 6.2, 0.3, p.yaw);
    const head = new THREE.Vector3(p.x, DECK + 7.6, p.z);
    flare(head, scale(SODIUM, 4.5), 110);
    if (glints.length < 46) addGlint(head, SODIUM, 2.0);
    if (s < 360) addLight(head, new THREE.Vector3(...SODIUM), 0.45, 9);
  }
}
/* ---------- end causeway ---------- */

/* ---------- train: mid-ground, outbound to the port ---------- */
{
  const s0 = 80, CAR = 23, GAP = 1.2, N = 4;
  for (let i = 0; i < N; i++) {
    const sc = s0 + i * (CAR + GAP) + CAR / 2, c = at(sc, -1.6);
    box(c.x, DECK + 0.7, c.z, 3.1, 3.7, CAR, c.yaw);
    box(c.x, DECK + 4.4, c.z, 2.6, 0.35, CAR - 1, c.yaw);
    // The lit window band runs both sides of each car.
    for (const side of [-1, 1]) for (let k = 0; k < 9; k++) {
      const w = at(sc - CAR / 2 + 1.9 + k * 2.4, -1.6 + side * 1.57);
      box(w.x, DECK + 2.2, w.z, 0.06, 1.0, 1.8, w.yaw, glowParts, scale(WARM, 2.0));
    }
    const mid = at(sc, -1.6);
    addLight(new THREE.Vector3(mid.x, DECK + 2.6, mid.z), new THREE.Vector3(...WARM), 1.3, 9);
    addGlint(new THREE.Vector3(mid.x, DECK + 2.6, mid.z), WARM, 1.4);
  }
  // Red tail at the near end, headlight at the far end.
  for (const side of [-0.9, 0.9]) {
    const t = at(s0 - 0.1, -1.6 + side); flare(new THREE.Vector3(t.x, DECK + 1.6, t.z), scale(RED, 6), 70);
  }
  const fs = s0 + N * (CAR + GAP) - GAP + 0.2, f = at(fs, -1.6);
  const head = new THREE.Vector3(f.x, DECK + 2.0, f.z);
  flare(head, scale(WHITE, 12), 160);
  const ahead = at(fs + 80, -1.6), dir = new THREE.Vector3(ahead.x - f.x, -2.5, ahead.z - f.z).normalize();
  addLight(head, new THREE.Vector3(1, 0.95, 0.85), 4, 45, dir, Math.cos(0.3));
  cone(head, dir, 110, 0.2, new THREE.Vector3(1, 0.95, 0.85), 0.7);
  addGlint(head, WHITE, 2.4);
  const tail = at(s0, -1.6); addGlint(new THREE.Vector3(tail.x, DECK + 1.6, tail.z), RED, 1.0);
}
/* ---------- end train ---------- */

/* ---------- port: a dense complex strung along the horizon ---------- */
const tops = [];
{
  // Quay front: a low dark wall the fog hides at its foot.
  // Layered massing: front rows lower, back rows taller.
  for (let i = 0; i < 150; i++) {
    const zr = rnd(), z = QUAY - 60 - zr * 620, x = CX + range(-1050, 1050);
    const w = range(18, 75), d = range(18, 60), h = range(10, 40) + zr * range(10, 60);
    box(x, 0, z, w, h, d);
    // Window strips on the faces toward the sea.
    if (rnd() < 0.62) {
      const col = rnd() < 0.7 ? SODIUM : FLUO;
      const strips = 1 + (rnd() * 4 | 0);
      for (let k = 0; k < strips; k++) {
        const sw = range(0.25, 0.9) * w, y = range(0.15, 0.9) * h;
        box(x + range(-0.3, 0.3) * (w - sw), y, z + d / 2 + 0.3, sw, 1.4, 0.4, 0, glowParts, scale(col, 3.6));
      }
    }
    // Deck lights on roofs and corners.
    if (rnd() < 0.7) flare(new THREE.Vector3(x + range(-0.5, 0.5) * w, h + 1, z + d / 2), scale(rnd() < 0.8 ? SODIUM : WHITE, 3.5), 70);
  }
  // Slim towers break the skyline.
  for (let i = 0; i < 14; i++) {
    const x = CX + range(-900, 900), z = QUAY - range(200, 650), h = range(90, 170), w = range(10, 18);
    box(x, 0, z, w, h, w);
    tops.push(new THREE.Vector3(x, h + 2, z));
    for (let y = 12; y < h; y += range(9, 16)) if (rnd() < 0.5) box(x, y, z + w / 2 + 0.3, w * 0.8, 1.1, 0.3, 0, glowParts, scale(FLUO, 3));
  }
  // Tank farm.
  for (let i = 0; i < 18; i++) {
    const r = range(12, 22), h = range(14, 26), x = CX + range(-1000, 1000), z = QUAY - range(80, 300);
    cyl(x, 0, z, r, h); dome(x, h, z, r);
    flare(new THREE.Vector3(x, h + r * 0.32 + 1, z), scale(RED, 3), 50);
  }
  // Stacks with lit vapour drifting off downwind.
  for (let i = 0; i < 10; i++) {
    const h = range(140, 260), x = CX + range(-950, 950), z = QUAY - range(250, 600), r = range(3.5, 6);
    cyl(x, 0, z, r, h, 16);
    tops.push(new THREE.Vector3(x, h + 2, z));
    for (let k = 0; k < 7; k++) {
      plumes.pos.push(x + k * k * 2.2 + range(-4, 4), h + 6 + k * 9, z + range(-4, 4));
      plumes.size.push((26 + k * 12) * 400);
      plumes.lit.push(1 - k / 7);
    }
  }
  // Gantry cranes along the quay, booms over the water, lights along the booms.
  for (let i = 0; i < 7; i++) {
    const x = CX + (i / 6 - 0.5) * 1500 + range(-40, 40), z = QUAY - 20, h = range(60, 85);
    for (const dx of [-20, 20]) for (const dz of [0, -22]) box(x + dx, 0, z + dz, 2.6, h, 2.6);
    box(x, h, z - 11, 46, 5, 28);
    box(x, h + 2, z + 34, 5, 3.5, 92);
    for (let k = 0; k < 6; k++) flare(new THREE.Vector3(x, h + 1, z + 70 - k * 18), scale(WHITE, 3), 60);
    tops.push(new THREE.Vector3(x, h + 8, z - 11));
  }
  // Floodlight masts on the quay, heads aimed down and inland.
  for (let i = 0; i < 12; i++) {
    const x = CX + (i / 11 - 0.5) * 1800 + range(-40, 40), z = QUAY - range(10, 70), h = range(45, 65);
    box(x, 0, z, 1.6, h, 1.6);
    const head = new THREE.Vector3(x, h + 1, z);
    const dir = new THREE.Vector3(range(-0.3, 0.3), -1, range(-0.5, -0.1)).normalize();
    flare(head, scale(WHITE, 8), 240);
    cone(head, dir, h * 1.5, 0.55, new THREE.Vector3(1, 0.72, 0.42), 0.22);
    addGlint(head, [1, 0.75, 0.45], 2.4);
    if (i % 2 === 0) addLight(head, new THREE.Vector3(1, 0.72, 0.42), 2.5, 50, dir, Math.cos(0.6));
  }
  // Red blinkers on every tall top.
  for (const t of tops) { flare(t, scale(RED, 7), 200); if (glints.length < NG - 8) addGlint(t, RED, 0.6); }
  // A few broad glints stand in for the window field on the sea.
  for (let i = 0; i < 10 && glints.length < NG - 1; i++) addGlint(new THREE.Vector3(CX + range(-900, 900), range(15, 40), QUAY - range(60, 200)), SODIUM, 1.0);
}
/* ---------- end port ---------- */

/* One searchlight from the tallest stack, up into the cloud deck. */
{
  const t = tops.slice().sort((a, b) => b.y - a.y)[0];
  const src = new THREE.Vector3(t.x, t.y - 4, t.z);
  const dir = new THREE.Vector3(-0.5, 1, 0.55).normalize();
  const len = (CLOUD_Y - src.y) / dir.y;
  k2.uSearchHit.value.copy(src).addScaledVector(dir, len);
  // Start the beam a little above the lamp so its base stays clean.
  cone(src.clone().addScaledVector(dir, 6), dir, len - 6, 0.06, new THREE.Vector3(0.75, 0.85, 1.0), 2.2, 0.5);
  flare(src, [3, 3.5, 4], 90);
}

// Bake static geometry into a few draw calls.
scene.add(new THREE.Mesh(mergeGeometries(parts), concrete));
scene.add(new THREE.Mesh(mergeGeometries(railParts), steel));
scene.add(new THREE.Mesh(mergeGeometries(glowParts), glowMat));
{
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(flares.pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(flares.col, 3));
  g.setAttribute('size', new THREE.Float32BufferAttribute(flares.size, 1));
  const p = new THREE.Points(g, flareMat); p.renderOrder = 3; p.frustumCulled = false; scene.add(p);
  const h = new THREE.BufferGeometry();
  h.setAttribute('position', new THREE.Float32BufferAttribute(plumes.pos, 3));
  h.setAttribute('size', new THREE.Float32BufferAttribute(plumes.size, 1));
  h.setAttribute('lit', new THREE.Float32BufferAttribute(plumes.lit, 1));
  const q = new THREE.Points(h, plumeMat); q.renderOrder = 1; q.frustumCulled = false; scene.add(q);
}

// Upload the light and glint lists.
lights.slice(0, NL).forEach((l, i) => {
  lightU.uLP.value[i].set(l.pos.x, l.pos.y, l.pos.z, l.power);
  lightU.uLC.value[i].set(l.col.x, l.col.y, l.col.z, l.range);
  lightU.uLD.value[i].set(l.dir.x, l.dir.y, l.dir.z, l.cos);
});
lightU.uLN.value = Math.min(NL, lights.length);
glints.slice(0, NG).forEach((g, i) => {
  glintU.uGP.value[i].set(g.pos.x, g.pos.y, g.pos.z, g.k);
  glintU.uGC.value[i].set(g.col[0], g.col[1], g.col[2], 0);
});
glintU.uGN.value = Math.min(NG, glints.length);

/* Sky dome behind everything. */
{
  const m = new THREE.Mesh(new THREE.SphereGeometry(6000, 48, 24), new THREE.ShaderMaterial({
    uniforms: { ...k2 }, side: THREE.BackSide, depthWrite: false,
    vertexShader: /* glsl */`varying vec3 vP; void main() { vec4 w = modelMatrix * vec4(position, 1.0); vP = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */`varying vec3 vP; ${K2_NOISE} ${K2_SKY} void main() { gl_FragColor = vec4(k2sky(normalize(vP - cameraPosition)), 1.0); }`,
  }));
  m.renderOrder = -1;
  scene.add(m);
}

/* Sea: noise normals; every listed light leaves a long broken streak. */
{
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(9000, 9000, 1, 1), new THREE.ShaderMaterial({
    uniforms: { ...k2, ...glintU },
    vertexShader: WORLD_VS,
    fragmentShader: /* glsl */`
    varying vec3 vP;
    varying vec3 vN;
    uniform vec4 uGP[${NG}];
    uniform vec4 uGC[${NG}];
    uniform int uGN;
    ${HEAD}
    float waves(vec2 p) {
      return k2fbm(p * vec2(0.045, 0.16)) + 0.5 * k2fbm(p * vec2(0.13, 0.42) + 9.0);
    }
    void main() {
      vec3 V = normalize(cameraPosition - vP);
      float dist = length(cameraPosition - vP);
      // Slope from finite differences; far water flattens to stay calm.
      float e = 0.6;
      float h = waves(vP.xz);
      vec2 grad = vec2(waves(vP.xz + vec2(e, 0.0)) - h, waves(vP.xz + vec2(0.0, e)) - h) / e;
      float k = 0.55 * mix(1.0, 0.35, smoothstep(60.0, 1400.0, dist));
      vec3 N = normalize(vec3(-grad.x * k, 1.0, -grad.y * k));
      vec3 R = reflect(-V, N);
      R.y = abs(R.y);
      float fres = 0.02 + 0.98 * pow(1.0 - max(dot(N, V), 0.0), 5.0);
      vec3 col = k2sky(R) * min(fres, 0.35) * 0.9 + vec3(0.002, 0.0025, 0.004);
      // Glints: narrow across, long along the view, so streaks run vertical.
      vec3 right = normalize(cross(V, vec3(0.0, 1.0, 0.0)));
      for (int i = 0; i < ${NG}; i++) {
        if (i >= uGN) break;
        vec3 d = normalize(uGP[i].xyz - vP);
        vec3 err = R - d;
        float ex = dot(err, right), ey = err.y;
        float s = exp(-(ex * ex) / (0.0045 * 0.0045) - (ey * ey) / (0.05 * 0.05));
        col += uGC[i].rgb * uGP[i].w * s * 0.45;
      }
      gl_FragColor = vec4(k2haze(col, vP, 0.85), 1.0);
    }`,
  }));
  sea.rotation.x = -Math.PI / 2;
  sea.position.set(0, 0, -2000);
  scene.add(sea);
}

/* ---------- K2: precipitation ---------- */
// Light rain around the camera; drops brighten where light falls on them.
let rain;
{
  const n = 6000, pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    pos[i * 3] = range(-260, 160); pos[i * 3 + 1] = range(0, 200); pos[i * 3 + 2] = range(-420, 190);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  rain = new THREE.Points(g, new THREE.ShaderMaterial({
    uniforms: { ...k2, ...lightU, ...projU },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */`
    uniform float uScale;
    varying vec3 vC;
    varying float vSize;
    ${K2_NOISE}
    ${K2_SKY}
    ${LIGHTS_GLSL}
    void main() {
      vec4 w = modelMatrix * vec4(position, 1.0);
      vC = k2lights(w.xyz, normalize(cameraPosition - w.xyz)) * 1.6 + uCool * 0.11 + uAmber * 0.05;
      vec4 mv = viewMatrix * w;
      vSize = 170.0 * uScale / -mv.z;
      gl_PointSize = clamp(vSize, 2.0, 48.0);
      gl_Position = projectionMatrix * mv;
    }`,
    fragmentShader: /* glsl */`
    varying vec3 vC;
    varying float vSize;
    void main() {
      vec2 c = gl_PointCoord - 0.5;
      // Far drops fade out instead of turning into dots.
      if (vSize < 3.0) discard;
      // A thin slanted streak inside the sprite.
      float x = c.x + c.y * 0.12;
      float a = exp(-x * x * 500.0) * smoothstep(0.5, 0.05, abs(c.y)) * 0.8 * smoothstep(3.0, 9.0, vSize);
      gl_FragColor = vec4(vC * a, 1.0);
    }`,
  }));
  rain.frustumCulled = false;
  rain.renderOrder = 4;
  scene.add(rain);
}
/* ---------- end K2 ---------- */

/* Framing: a low, wide shot beside the causeway; portrait stacks it. */
function frame(w, h, pr) {
  camera.aspect = w / h;
  if (w >= h) {
    camera.fov = 44;
    camera.position.set(0, 55, 110);
    camera.lookAt(-70, -68, -1500);
  } else {
    camera.fov = 66;
    camera.position.set(40, 120, 230);
    camera.lookAt(-60, -100, -1500);
  }
  camera.updateProjectionMatrix();
  // Point sizes follow the projected pixel scale.
  projU.uScale.value = (h * pr) / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2)) / 400;
}

  // Dispose frees every geometry, material and texture this scene made.
  function dispose() {
    scene.traverse(o => {
      o.geometry?.dispose();
      for (const m of [].concat(o.material || [])) { for (const v of Object.values(m.uniforms || {})) v.value?.isTexture && v.value.dispose(); m.map?.dispose(); m.dispose(); }
    });
  }

return { scene, camera, frame, dispose, post: { bloom: [0.6, 0.45, 0.95], tint: [0.0015, 0.0012, 0.001], vig: 0.55, vigIn: 0.35, grain: 0.035 } };
}
