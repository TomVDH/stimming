// Port: a railway causeway sweeps out over the sea to a far, fogged industrial port.

// The railway causeway is the hero; the port is a far, fogged backdrop.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Reflector } from 'three/addons/objects/Reflector.js';

export function build() {
// Seeded random keeps the scene the same on every load.
let seed = 1337;
const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const range = (a, b) => a + (b - a) * rnd();


const scene = new THREE.Scene();
// Orbs: soft glows the post chain draws round the brightest lamps.
const orbs = [];
const camera = new THREE.PerspectiveCamera(46, 1, 1, 30000);

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
  col += uAmber * 0.036 * pow(face, 5.0) * exp(-up * 7.0);
  // The fog bank glows above the horizon in the haze colour itself.
  // Sky, fog and far water then meet with no seam.
  col += uAmber * 0.1 * pow(face, 2.0) * exp(-up * 18.0);
  if (dir.y > 0.002) {
    float t = (uCloudY - cameraPosition.y) / dir.y;
    vec3 p = cameraPosition + dir * t;
    // A slow warp bends the cloud into soft, natural shapes.
    vec2 w = vec2(k2fbm(p.xz * 0.0012 + 11.0), k2fbm(p.xz * 0.0012 + 23.0));
    float d = k2fbm(p.xz * 0.0028 + vec2(3.0, 7.0) + w * 1.6);
    float cover = smoothstep(0.26, 0.6, d);
    float thick = smoothstep(0.45, 0.85, d);
    // The underside takes amber from the port, and a little everywhere.
    float g = exp(-length(p.xz - uGlow.xz) / uGlowR);
    vec3 cc = uAmber * (0.016 + 0.16 * g) * (0.6 + 0.6 * thick) + uCool * 0.003;
    // The searchlight leaves a pale patch on the cloud.
    cc += vec3(0.75, 0.82, 1.0) * 0.6 * exp(-length(p.xz - uSearchHit.xz) / 45.0) * (0.5 + thick);
    // Gaps show the dim sky above, still lit faintly by the port.
    vec3 gap = col + uAmber * 0.008 * (0.3 + g);
    cc = mix(gap, cc, cover);
    float far = 1.0 - exp(-t / 4200.0);
    // Near the horizon the cloud thins away, so no grazing stripes show.
    float graze = smoothstep(0.015, 0.11, dir.y);
    col = mix(col, mix(cc, col, far * 0.7), graze);
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
uniform vec3 uFogLo, uFogHi;
uniform float uTime;
// Fog density in the port volume: soft at every side, thin with height.
float k2fogDensity(vec3 p) {
  float sx = smoothstep(0.0, 320.0, p.x - uFogLo.x) * smoothstep(0.0, 320.0, uFogHi.x - p.x);
  float sz = smoothstep(0.0, 360.0, p.z - uFogLo.z) * smoothstep(0.0, 360.0, uFogHi.z - p.z);
  float h = exp(-max(p.y, 0.0) / 220.0);
  // Slow wisps vary the fog, so it never reads as one flat sheet.
  float w = 0.6 + 0.8 * k2noise(p.xz * 0.004 + vec2(uTime * 0.012, uTime * 0.004));
  return sx * sz * h * w;
}
// A short march sums the fog along the view ray inside the volume.
float k2portFog(vec3 P) {
  vec3 ro = cameraPosition, rd = P - ro;
  float L = length(rd);
  vec3 dir = rd / max(L, 1e-3);
  vec3 inv = 1.0 / (dir + vec3(1e-6));
  vec3 ta = (uFogLo - ro) * inv, tb = (uFogHi - ro) * inv;
  float tn = clamp(max(max(min(ta.x, tb.x), min(ta.y, tb.y)), min(ta.z, tb.z)), 0.0, L);
  float tf = clamp(min(min(max(ta.x, tb.x), max(ta.y, tb.y)), max(ta.z, tb.z)), 0.0, L);
  float seg = max(tf - tn, 0.0);
  if (seg <= 0.0) return 0.0;
  // Per-pixel jitter turns step bands into fine grain.
  float j = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));
  float ds = seg / 10.0, sum = 0.0;
  for (int i = 0; i < 10; i++) sum += k2fogDensity(ro + dir * (tn + (float(i) + j) * ds));
  return sum * ds;
}
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
  // The port fog volume adds its own soft-edged share.
  tau += k2portFog(P) * uPortFog;
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
  uFogLo: { value: new THREE.Vector3(CX - 1300, -10, QUAY - 900) },
  uFogHi: { value: new THREE.Vector3(CX + 1300, 700, QUAY + 380) },
  uTime: { value: 0 },
};

// Light list for lit surfaces: position + power, colour + range, spot axis + cone.
const NL = 24;
const lights = [];
function addLight(pos, col, power, range, dir = null, cos = -2) {
  lights.push({ pos, col, power, range, dir: dir || new THREE.Vector3(0, -1, 0), cos });
}

// Glint list: the strongest sources throw a column of dashes on the sea.
// Reach sets how far down the column runs, in reflected-angle units.
const NG = 48;
const glints = [];
const addGlint = (pos, col, k, reach) => { if (glints.length < NG) glints.push({ pos: pos.clone(), col, k, reach }); };

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

// Window atlas: 32 x 32 cells of glass, some lit warm, some fluorescent.
const atlas = (() => {
  const N = 32, C = 16, cv = document.createElement('canvas');
  cv.width = cv.height = N * C;
  const g = cv.getContext('2d');
  g.fillStyle = '#000'; g.fillRect(0, 0, N * C, N * C);
  for (let r = 0; r < N; r++) {
    // Each floor has a mood: fully lit, a fluorescent band, or sparse.
    const mood = rnd(), warmFloor = mood < 0.14, fluoFloor = mood > 0.9;
    for (let c = 0; c < N; c++) {
      const lit = warmFloor ? rnd() < 0.85 : fluoFloor ? rnd() < 0.8 : rnd() < 0.16;
      const fluo = fluoFloor || (!warmFloor && rnd() < 0.3);
      const k = 0.55 + rnd() * 0.45;
      g.fillStyle = lit ? (fluo ? `rgb(${190 * k | 0},${225 * k | 0},${255 * k | 0})` : `rgb(${255 * k | 0},${180 * k | 0},${95 * k | 0})`) : 'rgb(10,11,14)';
      g.fillRect(c * C + 3, r * C + 4, C - 6, C - 7);
    }
  }
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
})();

// Facades: concrete lighting plus windows from the atlas, set by floor.
const facade = new THREE.ShaderMaterial({
  uniforms: { ...k2, ...lightU, uWin: { value: atlas } },
  vertexShader: /* glsl */`
  attribute float aWin;
  varying vec3 vP;
  varying vec3 vN;
  varying float vWin;
  void main() {
    vec4 w = modelMatrix * vec4(position, 1.0);
    vP = w.xyz; vWin = aWin;
    vN = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * w;
  }`,
  fragmentShader: /* glsl */`
  uniform sampler2D uWin;
  varying vec3 vP;
  varying vec3 vN;
  varying float vWin;
  ${HEAD}
  ${LIGHTS_GLSL}
  void main() {
    vec3 N = normalize(vN);
    float panel = k2noise(vP.xz * 0.11 + vP.y * 0.07);
    vec3 albedo = vec3(0.27, 0.26, 0.25) * (0.8 + 0.35 * panel);
    float under = exp(-length(vP.xz - uGlow.xz) / uGlowR);
    vec3 amb = uCool * 0.006 + uAmber * 0.04 * under * max(N.y, 0.0) + uAmber * 0.008 * under;
    vec3 c = albedo * (amb + k2lights(vP, N));
    // Walls take windows; one cell is 4.5 m wide and one floor high.
    vec3 em = vec3(0.0);
    if (abs(N.y) < 0.5 && vP.y > 5.0) {
      float a = abs(N.x) > abs(N.z) ? vP.z : vP.x;
      vec2 cell = floor(vP.xz / 60.0);
      vec2 uv = vec2(a / 4.5, vP.y / 4.2) / 32.0 + vec2(k2hash(cell), k2hash(cell + 7.0));
      em = texture2D(uWin, uv).rgb * 2.4 * vWin;
    }
    float f = k2hazeAmount(vP);
    vec3 col = mix(c, k2hazeColor(normalize(vP - cameraPosition), vP), f);
    gl_FragColor = vec4(col + em * (1.0 - 0.72 * f), 1.0);
  }`,
});

// Flame: a soft tongue, white at the root, orange at the tip.
const flameMat = new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
  vertexShader: /* glsl */`
  varying vec2 vUv;
  varying vec3 vN;
  varying vec3 vP;
  void main() {
    vUv = uv;
    vec4 w = modelMatrix * vec4(position, 1.0);
    vP = w.xyz;
    vN = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * w;
  }`,
  fragmentShader: /* glsl */`
  varying vec2 vUv;
  varying vec3 vN;
  varying vec3 vP;
  void main() {
    float rim = pow(abs(dot(normalize(vN), normalize(cameraPosition - vP))), 1.5);
    float t = vUv.y;
    vec3 c = mix(vec3(6.0, 4.6, 2.2), vec3(3.2, 0.7, 0.12), smoothstep(0.0, 0.8, t));
    gl_FragColor = vec4(c * rim * (1.0 - t) * 0.9, 1.0);
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
const parts = [], glowParts = [], railParts = [], facadeParts = [];
function box(x, y, z, w, h, d, ry = 0, list = parts, col = null) {
  const g = new THREE.BoxGeometry(w, h, d);
  if (ry) g.rotateY(ry);
  g.translate(x, y + h / 2, z);
  if (col) paint(g, col);
  list.push(g.toNonIndexed());
}
// A facade box carries its window strength as a vertex attribute.
function fbox(x, y, z, w, h, d, win) {
  const g = new THREE.BoxGeometry(w, h, d).toNonIndexed();
  g.translate(x, y + h / 2, z);
  g.setAttribute('aWin', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count).fill(win), 1));
  facadeParts.push(g);
}
// A beam between two points, for conveyors.
function beam(a, b, w, h) {
  const g = new THREE.BoxGeometry(w, h, a.distanceTo(b));
  g.applyMatrix4(new THREE.Matrix4().lookAt(a, b, new THREE.Vector3(0, 1, 0)));
  g.translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
  parts.push(g.toNonIndexed());
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

const SODIUM = [1.0, 0.52, 0.18], WHITE = [0.86, 0.93, 1.0], RED = [1.0, 0.03, 0.02], FLUO = [0.7, 0.88, 1.0], WARM = [1.0, 0.72, 0.42];
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
    addGlint(new THREE.Vector3(mid.x, DECK + 2.4, mid.z), WARM, 1.4, 0.16);
  }
  // Red tail at the near end, headlight at the far end.
  for (const side of [-0.9, 0.9]) {
    const t = at(s0 - 0.1, -1.6 + side); flare(new THREE.Vector3(t.x, DECK + 1.6, t.z), scale(RED, 6), 70);
  }
  const fs = s0 + N * (CAR + GAP) - GAP + 0.2, f = at(fs, -1.6);
  const head = new THREE.Vector3(f.x, DECK + 2.0, f.z);
  flare(head, scale(WHITE, 12), 160);
  orbs.push({ pos: head, color: [1, 0.95, 0.85], k: 0.5, size: 1.2 });
  const ahead = at(fs + 80, -1.6), dir = new THREE.Vector3(ahead.x - f.x, -2.5, ahead.z - f.z).normalize();
  addLight(head, new THREE.Vector3(1, 0.95, 0.85), 4, 45, dir, Math.cos(0.3));
  addGlint(head, WHITE, 3.0, 0.5);
  cone(head, dir, 110, 0.2, new THREE.Vector3(1, 0.95, 0.85), 0.7);
}
/* ---------- end train ---------- */

/* ---------- port: a dense complex strung along the horizon ---------- */
const tops = [];
const buildings = [];
{
  // Blocks with setbacks; front rows lower, back rows taller.
  for (let i = 0; i < 110; i++) {
    const zr = rnd(), z = QUAY - 70 - zr * 620, x = CX + range(-1080, 1080);
    let w = range(24, 80), d = range(20, 60), h = range(10, 34) + zr * range(8, 50);
    const win = rnd() < 0.72 ? range(0.5, 1.3) : 0;
    let y = 0;
    for (let tier = 0; tier < 3 && h > 6; tier++) {
      fbox(x, y, z, w, h, d, win);
      y += h; w *= range(0.55, 0.8); d *= range(0.6, 0.85); h *= range(0.35, 0.6);
      if (rnd() < 0.45) break;
    }
    buildings.push({ x, z, top: y, w, d });
    // Roof plant: small boxes and a vent or two.
    for (let k = 0; k < 2 + (rnd() * 3 | 0); k++) box(x + range(-0.4, 0.4) * w, y, z + range(-0.4, 0.4) * d, range(3, 8), range(2, 5), range(3, 8));
    if (rnd() < 0.6) flare(new THREE.Vector3(x + range(-0.5, 0.5) * w, y + 1, z + d / 2), scale(rnd() < 0.8 ? SODIUM : WHITE, 3.2), 60);
  }
  // Slim towers break the skyline.
  for (let i = 0; i < 10; i++) {
    const x = CX + range(-900, 900), z = QUAY - range(250, 650), h = range(90, 170), w = range(12, 20);
    fbox(x, 0, z, w, h, w, range(0.6, 1.2));
    box(x, h, z, w * 0.5, 6, w * 0.5);
    tops.push(new THREE.Vector3(x, h + 8, z));
  }
  // Pipe racks run between blocks, with lights along them.
  for (let i = 0; i < 16; i++) {
    const x0 = CX + range(-1000, 800), L = range(70, 240), z = QUAY - range(60, 420), y = range(8, 14);
    box(x0 + L / 2, y, z, L, 1.0, 7);
    for (const dy of [1.4, 2.6]) box(x0 + L / 2, y + dy, z + range(-2, 2), L, 0.9, 0.9);
    for (let px = x0; px <= x0 + L; px += 12) { box(px, 0, z - 3, 0.8, y, 0.8); box(px, 0, z + 3, 0.8, y, 0.8); }
    for (let px = x0 + 10; px < x0 + L; px += 30) flare(new THREE.Vector3(px, y + 4, z + 4), scale(SODIUM, 2.6), 40);
  }
  // Conveyor gantries climb from the quay onto block roofs.
  for (let i = 0; i < 7; i++) {
    const t = buildings[(rnd() * buildings.length) | 0];
    const a = new THREE.Vector3(t.x + range(-120, 120), 2, QUAY - range(10, 40)), b = new THREE.Vector3(t.x, t.top, t.z);
    beam(a, b, 4, 3.2);
    for (let k = 1; k < 4; k++) flare(a.clone().lerp(b, k / 4).add(new THREE.Vector3(0, 2.4, 0)), scale(WHITE, 2.2), 36);
  }
  // Distillation columns with lit platforms and ladder lights.
  for (let i = 0; i < 9; i++) {
    const x = CX + range(-850, 850), z = QUAY - range(150, 450), r = range(2.5, 5), h = range(55, 115);
    cyl(x, 0, z, r, h, 16);
    for (let y = 14; y < h - 4; y += 14) {
      cyl(x, y, z, r + 1.8, 0.5, 16);
      for (const ang of [-0.9, 0, 0.9]) flare(new THREE.Vector3(x + Math.sin(ang) * (r + 1.8), y + 1.2, z + Math.cos(ang) * (r + 1.8)), scale(WHITE, 2.4), 34);
    }
    for (let y = 6; y < h; y += 5) flare(new THREE.Vector3(x + r * 0.7, y, z + r + 0.6), scale(SODIUM, 1.6), 22);
    tops.push(new THREE.Vector3(x, h + 2, z));
  }
  // Tank farm with ring lights round each roof.
  for (let i = 0; i < 16; i++) {
    const r = range(12, 22), h = range(14, 26), x = CX + range(-1000, 1000), z = QUAY - range(80, 300);
    cyl(x, 0, z, r, h); dome(x, h, z, r);
    for (let k = 0; k < 10; k++) { const ang = k / 10 * Math.PI * 2; flare(new THREE.Vector3(x + Math.cos(ang) * r, h + 0.8, z + Math.sin(ang) * r), scale(SODIUM, 2.2), 34); }
  }
  // Two cooling towers with lit plumes.
  for (const [x, z] of [[CX - 700, QUAY - 150], [CX - 590, QUAY - 230]]) {
    const pts = [];
    for (let k = 0; k <= 12; k++) { const y = k / 12 * 120, wy = (y - 88) / 88; pts.push(new THREE.Vector2(30 + 18 * wy * wy * (y < 88 ? 1 : 0.35), y)); }
    const g = new THREE.LatheGeometry(pts, 48);
    g.translate(x, 0, z);
    parts.push(g.toNonIndexed());
    for (let k = 0; k < 4; k++) flare(new THREE.Vector3(x + (k - 1.5) * 14, 121, z + 25), scale(RED, 5), 120);
    // A low spot washes the shell so it reads through the fog.
    addLight(new THREE.Vector3(x + 30, 15, z + 90), new THREE.Vector3(1, 0.6, 0.3), 3.5, 90, new THREE.Vector3(-0.3, 0.45, -1).normalize(), Math.cos(0.5));
    for (let k = 0; k < 8; k++) {
      plumes.pos.push(x + k * k * 3 + range(-6, 6), 135 + k * 18, z + range(-6, 6));
      plumes.size.push((70 + k * 22) * 400);
      plumes.lit.push(2.4 - k / 5);
    }
  }
  // Stacks with lit vapour drifting off downwind.
  for (let i = 0; i < 8; i++) {
    const h = range(140, 260), x = CX + range(-950, 950), z = QUAY - range(250, 600), r = range(3.5, 6);
    cyl(x, 0, z, r, h, 16);
    tops.push(new THREE.Vector3(x, h + 2, z));
    for (let k = 0; k < 7; k++) {
      plumes.pos.push(x + k * k * 2.2 + range(-4, 4), h + 6 + k * 9, z + range(-4, 4));
      plumes.size.push((26 + k * 12) * 400);
      plumes.lit.push(1 - k / 7);
    }
  }
  // One flare stack: a small live flame lights its own smoke.
  {
    const x = CX + 430, z = QUAY - 380, h = 150;
    cyl(x, 0, z, 1.8, h, 12);
    box(x, h - 2, z, 6, 0.6, 6);
    const g = new THREE.ConeGeometry(2.6, 15, 16, 1, true);
    g.translate(0, 7.5, 0);
    const m = new THREE.Mesh(g, flameMat);
    m.position.set(x, h, z); m.rotation.z = -0.12; m.renderOrder = 3;
    scene.add(m);
    flare(new THREE.Vector3(x, h + 6, z), [9, 4.6, 1.2], 900);
    orbs.push({ pos: new THREE.Vector3(x, h + 6, z), color: [1, 0.5, 0.15], k: 0.45, size: 1.4 });
    addGlint(new THREE.Vector3(x, h + 6, z), [1, 0.5, 0.12], 3.2, 0.5);
    for (let k = 0; k < 6; k++) {
      plumes.pos.push(x + 8 + k * 9, h + 20 + k * 10, z);
      plumes.size.push((30 + k * 14) * 400);
      plumes.lit.push(3.2 - k * 0.45);
    }
  }
  // Gantry cranes along the quay, booms over the water, lights along the booms.
  for (let i = 0; i < 7; i++) {
    const x = CX + (i / 6 - 0.5) * 1500 + range(-40, 40), z = QUAY - 20, h = range(60, 85);
    for (const dx of [-20, 20]) for (const dz of [0, -22]) box(x + dx, 0, z + dz, 2.6, h, 2.6);
    box(x, h, z - 11, 46, 5, 28);
    box(x, h + 2, z + 34, 5, 3.5, 92);
    for (let k = 0; k < 6; k++) flare(new THREE.Vector3(x, h + 1, z + 70 - k * 18), scale(WHITE, 3), 60);
    addGlint(new THREE.Vector3(x, h + 1, z + 60), WHITE, 1.5, 0.18);
    tops.push(new THREE.Vector3(x, h + 8, z - 11));
  }
  // Floodlight masts on the quay, heads aimed down and inland.
  for (let i = 0; i < 12; i++) {
    const x = CX + (i / 11 - 0.5) * 1800 + range(-40, 40), z = QUAY - range(10, 70), h = range(45, 65);
    box(x, 0, z, 1.6, h, 1.6);
    const head = new THREE.Vector3(x, h + 1, z);
    const dir = new THREE.Vector3(range(-0.3, 0.3), -1, range(-0.5, -0.1)).normalize();
    flare(head, scale(WHITE, 8), 240);
    orbs.push({ pos: head, color: [1, 0.72, 0.42], k: 0.15, size: 0.8 });
    addGlint(head, WHITE, 2.6, 0.45);
    cone(head, dir, h * 1.5, 0.55, new THREE.Vector3(1, 0.72, 0.42), 0.22);
    if (i % 2 === 0) addLight(head, new THREE.Vector3(1, 0.72, 0.42), 2.5, 50, dir, Math.cos(0.6));
  }
  // Red blinkers on every tall top.
  tops.forEach((t, i) => { flare(t, scale(RED, 7), 200); if (i % 2 === 0) addGlint(t, RED, 1.5, 0.15); });
  // Window fields: a few warm and cool sources stand in for lit facades.
  for (let i = 0; i < 14; i++) addGlint(new THREE.Vector3(CX + range(-950, 950), range(12, 40), QUAY - range(80, 260)), i % 3 ? SODIUM : FLUO, 1.0, 0.12);
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
  orbs.push({ pos: src, color: [0.75, 0.85, 1], k: 0.3, size: 0.9 });
}

// Bake static geometry into a few draw calls.
scene.add(new THREE.Mesh(mergeGeometries(parts), concrete));
scene.add(new THREE.Mesh(mergeGeometries(railParts), steel));
scene.add(new THREE.Mesh(mergeGeometries(facadeParts), facade));
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

// Upload the light list.
lights.slice(0, NL).forEach((l, i) => {
  lightU.uLP.value[i].set(l.pos.x, l.pos.y, l.pos.z, l.power);
  lightU.uLC.value[i].set(l.col.x, l.col.y, l.col.z, l.range);
  lightU.uLD.value[i].set(l.dir.x, l.dir.y, l.dir.z, l.cos);
});
lightU.uLN.value = Math.min(NL, lights.length);

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

/* Sea: a calm, heavy swell over a half-resolution planar reflection. */
const sea = new Reflector(new THREE.PlaneGeometry(60000, 60000, 1, 1), {
  textureWidth: 512, textureHeight: 512, clipBias: 0.002,
  shader: {
    name: 'PortSea',
    uniforms: { ...k2, color: { value: new THREE.Color() }, tDiffuse: { value: null }, textureMatrix: { value: null }, uFov: { value: new THREE.Vector2(1, 1) }, uGP: { value: glints.map(g => new THREE.Vector4(g.pos.x, g.pos.y, g.pos.z, g.k)) }, uGC: { value: glints.map(g => new THREE.Vector4(...g.col, g.reach)) } },
    vertexShader: /* glsl */`
    uniform mat4 textureMatrix;
    varying vec4 vR;
    varying vec3 vP;
    void main() {
      vR = textureMatrix * vec4(position, 1.0);
      vec4 w = modelMatrix * vec4(position, 1.0);
      vP = w.xyz;
      gl_Position = projectionMatrix * viewMatrix * w;
    }`,
    fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse;
    uniform vec2 uFov;
    uniform vec4 uGP[${NG}];
    uniform vec4 uGC[${NG}];
    varying vec4 vR;
    varying vec3 vP;
    ${HEAD}
    // One long swell train: slope of a sine, faded out with distance.
    vec2 swell(vec2 p, vec2 dir, float len, float amp, float ph, float dist) {
      float k = 6.2832 / len;
      float fade = 1.0 - smoothstep(len * 9.0, len * 24.0, dist);
      return dir * amp * cos(dot(p, dir) * k + ph) * fade;
    }
    void main() {
      vec3 V = normalize(cameraPosition - vP);
      float dist = length(cameraPosition - vP);
      vec2 p = vP.xz;
      // Broad swell at a few scales, crests mostly facing the camera.
      vec2 sl = swell(p, normalize(vec2(0.25, 1.0)), 95.0, 0.05, 0.0, dist)
              + swell(p, normalize(vec2(-0.4, 1.0)), 52.0, 0.04, 1.7, dist)
              + swell(p, normalize(vec2(0.55, 1.0)), 27.0, 0.032, 4.1, dist)
              + swell(p, normalize(vec2(-0.15, 1.0)), 14.0, 0.022, 2.3, dist);
      // A slow irregular heave breaks the regular trains.
      float e = 4.0, h0 = k2fbm(p * 0.006);
      sl += vec2(k2fbm((p + vec2(e, 0.0)) * 0.006) - h0, k2fbm((p + vec2(0.0, e)) * 0.006) - h0) / e * 1.5;
      // Fine ripple only close to the camera.
      float nearK = 1.0 - smoothstep(50.0, 180.0, dist);
      if (nearK > 0.0) {
        float r0 = k2noise(p * 0.45);
        sl += vec2(k2noise(p * 0.45 + vec2(0.3, 0.0)) - r0, k2noise(p * 0.45 + vec2(0.0, 0.3)) - r0) * 0.12 * nearK;
      }
      vec3 N = normalize(vec3(-sl.x, 1.0, -sl.y));
      // Grazing views stretch the reflection along the view, not across it.
      float graze = max(V.y, 0.04);
      vec2 off = vec2(N.x * 0.7 * graze * uFov.x, -N.z * 0.7 * uFov.y);
      vec2 uv = vR.xy / vR.w;
      // Sub-pixel ripple smears each light into a long, smooth vertical streak.
      float stretch = 0.06 + 0.1 * (1.0 - smoothstep(0.04, 0.4, graze));
      vec3 refl = vec3(0.0);
      float wsum = 0.0;
      for (int i = -6; i <= 6; i++) {
        float t = float(i) / 6.0;
        float wgt = exp(-t * t * 2.2);
        vec2 o = off + vec2(sl.x * 0.03 * t, t * stretch);
        refl += texture2D(tDiffuse, clamp(uv + o, 0.001, 0.999)).rgb * wgt;
        wsum += wgt;
      }
      refl /= wsum;
      // Swell crests break the streaks gently.
      refl *= 0.7 + 0.6 * smoothstep(-0.025, 0.035, -sl.y);
      float cosT = max(dot(N, V), 0.0);
      float F = 0.02 + 0.98 * pow(1.0 - cosT, 5.0);
      vec3 deep = vec3(0.0006, 0.0011, 0.002);
      // The far water mirrors the glowing fog bank, softened by the swell.
      refl *= 1.0 - 0.3 * smoothstep(1300.0, 2800.0, dist);
      vec3 col = deep * (1.0 - F) + refl * F * vec3(0.74, 0.9, 1.1);
      // Streaks: wave facets that tilt just right flash as soft dashes.
      // Facets are wide across and short in depth, so perspective sizes them.
      float dn = k2noise(vec2(vP.x * 0.05, vP.z * 0.42));
      float dn2 = k2noise(vec2(vP.x * 0.11 + 7.0, vP.z * 0.9));
      float tilt = (dn * 0.7 + dn2 * 0.3 - 0.5) * 0.5;
      // Far facets shrink below a pixel; use their mean response there.
      float farK = smoothstep(900.0, 2600.0, dist);
      vec3 R0 = reflect(-V, vec3(0.0, 1.0, 0.0));
      vec3 right = normalize(cross(V, vec3(0.0, 1.0, 0.0)));
      vec3 st = vec3(0.0);
      for (int i = 0; i < ${NG}; i++) {
        vec3 L = uGP[i].xyz - vP;
        float dl = length(L);
        vec3 err = R0 - L / dl;
        float ex = dot(err, right) + (dn2 - 0.5) * 0.004;
        float ey = err.y;
        // The facet must tilt by half the angle error to reflect the light.
        float need = ey * 0.5;
        float m = mix(exp(-pow((tilt - need) / 0.018, 2.0)), 0.35 * exp(-pow(need / 0.09, 2.0)), farK);
        float fall = ey > 0.0 ? exp(-ey / uGC[i].w) : exp(-pow(ey / 0.02, 2.0));
        float sx = max(0.0035, 3.0 / dl);
        // Only water between the camera and the light can mirror it.
        float ahead = smoothstep(0.96, 0.995, dot(normalize(R0.xz), normalize(L.xz)));
        st += uGC[i].rgb * uGP[i].w * m * fall * ahead * exp(-ex * ex / (sx * sx));
      }
      // The glowing fog bank lays a broad, soft golden sheen on the water.
      float bank = exp(-length(vP.xz - uGlow.xz) / (uGlowR * 1.3));
      col += uAmber * 0.05 * bank * (0.4 + 0.6 * F) * (0.75 + 0.5 * smoothstep(-0.03, 0.03, -sl.y));
      st *= mix(0.45, 1.0, F);
      col += st * 0.9;
      // Far water hands over to the horizon sky, so no seam shows.
      vec3 hor = k2sky(normalize(vec3(-V.x, 0.0005, -V.z)));
      // The same golden fog lies on the water toward the port.
      float hf = k2hazeAmount(vP) * 0.85;
      col = mix(col, k2hazeColor(normalize(vP - cameraPosition), vP), hf);
      col = mix(col, hor, smoothstep(2200.0, 6000.0, dist));
      gl_FragColor = vec4(col, 1.0);
    }`,
  },
});
sea.rotation.x = -Math.PI / 2;
sea.position.set(0, 0, -2000);
scene.add(sea);

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
  // The reflection renders at half resolution.
  sea.getRenderTarget().setSize(Math.max(1, Math.round(w * pr / 2)), Math.max(1, Math.round(h * pr / 2)));
  const vf = THREE.MathUtils.degToRad(camera.fov);
  sea.material.uniforms.uFov.value.set(1 / (2 * Math.atan(Math.tan(vf / 2) * camera.aspect)), 1 / vf);
  // Point sizes follow the projected pixel scale.
  projU.uScale.value = (h * pr) / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2)) / 400;
}

  // Dispose frees every geometry, material and texture this scene made.
  function dispose() {
    sea.dispose();
    scene.traverse(o => {
      o.geometry?.dispose();
      for (const m of [].concat(o.material || [])) { for (const v of Object.values(m.uniforms || {})) v.value?.isTexture && v.value.dispose(); m.map?.dispose(); m.dispose(); }
    });
  }

return { scene, camera, frame, dispose, orbs, post: { haze: 0.035, bloom: [0.6, 0.45, 0.95], tint: [0.0015, 0.0012, 0.001], vig: 0.55, vigIn: 0.35, grain: 0.035 } };
}
