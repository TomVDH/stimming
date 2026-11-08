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
uniform float uTime;
uniform float uZenK, uDomeK, uBankGlowK, uCloudLo, uCloudHi, uCloudK, uGapK, uSearchK;
uniform vec2 uWind;
uniform float uConeK, uFlareK, uPlumeK, uWinK, uRainK, uLightK;
// Horizontal alignment of a view direction with the port.
float k2face(vec3 dir) {
  vec2 toC = normalize(uGlow.xz - cameraPosition.xz);
  return max(dot(normalize(dir.xz + 1e-5), toC), 0.0);
}
vec3 k2sky(vec3 dir) {
  float face = k2face(dir);
  float up = max(dir.y, 0.0);
  // Dark zenith, a cool low band, a wide amber dome over the port.
  vec3 col = (vec3(0.0025, 0.003, 0.006) + uCool * 0.02 * exp(-up * 10.0)) * uZenK;
  col += uAmber * uDomeK * pow(face, 5.0) * exp(-up * 7.0);
  // The fog bank glows above the horizon in the haze colour itself.
  // Sky, fog and far water then meet with no seam.
  col += uAmber * uBankGlowK * pow(face, 2.0) * exp(-up * 18.0);
  if (dir.y > 0.002) {
    float t = (uCloudY - cameraPosition.y) / dir.y;
    vec3 p = cameraPosition + dir * t;
    // A slow warp bends the cloud into soft, natural shapes.
    // Wind carries the cloud slowly across; the warp changes its shape.
    vec2 q = p.xz + uWind * uTime;
    vec2 w = vec2(k2noise(q * 0.0012 + 11.0 + uTime * 0.004), k2noise(q * 0.0012 + 23.0 - uTime * 0.003));
    float d = k2fbm(q * 0.0028 + vec2(3.0, 7.0) + w * 1.6);
    float cover = smoothstep(uCloudLo, uCloudHi, d);
    float thick = smoothstep(0.45, 0.85, d);
    // The underside takes amber from the port, and a little everywhere.
    float g = exp(-length(p.xz - uGlow.xz) / uGlowR);
    vec3 cc = (uAmber * (0.016 + 0.16 * g) * (0.6 + 0.6 * thick) + uCool * 0.003) * uCloudK;
    // The searchlight leaves a pale patch on the cloud.
    cc += vec3(0.75, 0.82, 1.0) * uSearchK * exp(-length(p.xz - uSearchHit.xz) / 45.0) * (0.5 + thick);
    // Gaps show the dim sky above, still lit faintly by the port.
    vec3 gap = col + uAmber * uGapK * (0.3 + g);
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
uniform float uWisp, uFogFall;
// Fog density in the port volume: soft at every side, thin with height.
float k2fogDensity(vec3 p) {
  float sx = smoothstep(0.0, 320.0, p.x - uFogLo.x) * smoothstep(0.0, 320.0, uFogHi.x - p.x);
  float sz = smoothstep(0.0, 360.0, p.z - uFogLo.z) * smoothstep(0.0, 360.0, uFogHi.z - p.z);
  float h = exp(-max(p.y, 0.0) / uFogFall);
  // Slow wisps vary the fog, so it never reads as one flat sheet.
  float w = 1.0 - uWisp * 0.5 + uWisp * k2noise(p.xz * 0.004 + vec2(uTime * 0.012, uTime * 0.004));
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
  float ds = seg / 6.0, sum = 0.0;
  for (int i = 0; i < 6; i++) sum += k2fogDensity(ro + dir * (tn + (float(i) + j) * ds));
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
  // Look knobs: the tuning panel moves these; defaults keep the signed look.
  uZenK: { value: 1 }, uDomeK: { value: 0.036 }, uBankGlowK: { value: 0.1 },
  uCloudLo: { value: 0.26 }, uCloudHi: { value: 0.6 }, uCloudK: { value: 1 }, uGapK: { value: 0.008 },
  uWind: { value: new THREE.Vector2(6, 2.5) }, uSearchK: { value: 0.6 },
  uWisp: { value: 0.8 }, uFogFall: { value: 220 }, uLightK: { value: 1 },
  uConeK: { value: 1 }, uFlareK: { value: 1 }, uPlumeK: { value: 1 }, uWinK: { value: 2.4 }, uRainK: { value: 1 },
  uSwellK: { value: 1 }, uSwellT: { value: 1 }, uGlintK: { value: 0.9 }, uGlintW: { value: 0.018 },
  uBankK: { value: 0.05 }, uRingK: { value: 0.03 }, uRippleK: { value: 1 }, uDeep: { value: new THREE.Vector3(0.0006, 0.0011, 0.002) },
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
    float att = uLP[i].w * uLightK / (1.0 + pow(d / uLC[i].w, 2.0));
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
    float att = uLP[i].w * uLightK / (1.0 + pow(d / uLC[i].w, 2.0));
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

// Precast concrete: segment tone, joints, rain streaks, a wet deck.
// aSU: arc length and across offset; across 99 marks a pier.
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
    vec3 V = normalize(cameraPosition - vP);
    float pier = step(50.0, vSU.y);
    // Each 4 m segment has its own tone.
    float tone = 0.8 + 0.32 * k2hash(vec2(floor(vSU.x / 4.0), 3.0 + pier * 4.0));
    // Joints: a dark groove each 4 m, faded out where it would alias.
    float dj = abs(fract(vSU.x / 4.0 + 0.5) - 0.5) * 4.0, aa = fwidth(vSU.x);
    float joint = mix(mix(0.3, 1.0, smoothstep(0.05, 0.05 + 1.5 * aa, dj)), 1.0, max(pier, smoothstep(0.4, 1.4, aa)));
    // Rain streaks run down every wall.
    float vert = 1.0 - abs(N.y);
    float along = mix(vSU.x, vP.x + vP.z, pier);
    float streak = k2noise(vec2(along * 2.2, vP.y * 0.12)) * k2noise(vec2(along * 0.7 + 3.0, vP.y * 0.05));
    // The tide line darkens and wets each pier foot.
    float tide = 1.0 - smoothstep(1.0, 2.6, vP.y + k2noise(vec2(along * 0.8, 1.0)) * 0.8);
    // The deck top and its darker slab track.
    float deck = smoothstep(0.85, 0.95, N.y) * (1.0 - pier) * step(abs(vSU.y), 6.8);
    float slab = deck * (1.0 - smoothstep(2.0, 2.4, abs(vSU.y + 1.6)));
    // The wet deck top hides its joints; walls show them.
    joint = mix(joint, 1.0, deck * 0.8);
    vec3 albedo = vec3(0.25, 0.245, 0.24) * tone * joint;
    albedo *= (1.0 - 0.45 * streak * vert) * (1.0 - 0.6 * tide) * (1.0 - 0.5 * slab);
    float wet = max(deck * 0.9, max(streak * vert * 0.5, tide * 0.8));
    float under = exp(-length(vP.xz - uGlow.xz) / uGlowR);
    vec3 amb = uCool * 0.006 + uAmber * 0.04 * under * max(N.y, 0.0) + uAmber * 0.008 * under;
    vec3 c = albedo * (amb + k2lights(vP, N));
    // Wet faces mirror each lamp and the lit cloud.
    float F = 0.04 + 0.96 * pow(1.0 - max(dot(N, V), 0.0), 5.0);
    c += wet * (k2spec(vP, N, V, 90.0) * 0.35 + k2sky(reflect(-V, N)) * F * 0.8);
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
      em = texture2D(uWin, uv).rgb * uWinK * vWin;
    }
    float f = k2hazeAmount(vP);
    vec3 col = mix(c, k2hazeColor(normalize(vP - cameraPosition), vP), f);
    gl_FragColor = vec4(col + em * (1.0 - 0.72 * f), 1.0);
  }`,
});

// Flame: a soft tongue, white at the root, orange at the tip.
const flameMat = new THREE.ShaderMaterial({
  uniforms: { uTime: k2.uTime, uFlameK: { value: 1 } },
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
  uniform float uTime, uFlameK;
  void main() {
    float rim = pow(abs(dot(normalize(vN), normalize(cameraPosition - vP))), 1.5);
    // The flame flickers and licks upward.
    float t = clamp(vUv.y + 0.12 * sin(uTime * 11.0 + vUv.x * 6.3) * vUv.y, 0.0, 1.0);
    vec3 c = mix(vec3(6.0, 4.6, 2.2), vec3(3.2, 0.7, 0.12), smoothstep(0.0, 0.8, t));
    float flick = 0.8 + 0.2 * sin(uTime * 17.0) * sin(uTime * 7.3 + 1.7);
    gl_FragColor = vec4(c * rim * (1.0 - t) * 0.9 * flick * uFlameK, 1.0);
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
  uniform float uTime;
  varying vec3 vC;
  varying vec3 vP;
  void main() {
    vec4 w = modelMatrix * vec4(position, 1.0);
    vP = w.xyz; vC = color;
    // Pure red lamps are warning lights: each blinks on its own beat.
    float red = step(vC.g * 6.0 + 0.2, vC.r);
    float ph = fract(sin(dot(position.xz, vec2(12.9898, 78.233))) * 43758.5453);
    float b = fract(uTime * 0.45 + ph);
    float on = smoothstep(0.0, 0.06, b) * (1.0 - smoothstep(0.45, 0.55, b));
    vC *= mix(1.0, 0.12 + 0.88 * on, red);
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
    // The glow reaches zero inside the sprite, so no square edge shows.
    float a = max(exp(-dot(c, c) * 22.0) - 0.0041, 0.0);
    float f = k2hazeAmount(vP) * 0.65;
    gl_FragColor = vec4(vC * a * (1.0 - f) * uFlareK, 1.0);
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
  uniform float uTime;
  varying float vLit;
  varying vec3 vP;
  void main() {
    // Each puff sways a little in the wind.
    vec3 sway = vec3(sin(uTime * 0.21 + position.y * 0.05) * 3.0, sin(uTime * 0.13 + position.x * 0.03) * 1.5, 0.0);
    vec4 w = modelMatrix * vec4(position + sway, 1.0);
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
    float n = k2noise(gl_PointCoord * 4.0 + vP.xy * 0.01 + vec2(uTime * 0.05, -uTime * 0.09));
    float a = smoothstep(1.0, 0.0, r) * (0.55 + 0.45 * n);
    // Lit from below: brighter at the bottom of each puff.
    vec3 col = uAmber * (0.03 + 0.06 * vLit) * (1.0 + 0.8 * c.y);
    gl_FragColor = vec4(col * a * a * 0.85 * uPlumeK, 1.0);
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
      float a = rim * fall * uK * uConeK * (0.4 + 0.6 * smoothstep(0.0, 0.5, f)) * (1.0 - 0.6 * f);
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
const DECK = 24, HW = 7.5, TRACK = -1.6, S0 = -220;
const castParts = [];
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
function prism(s, lo, hi, y0, y1) {
  const c = atX(s), ax = -c.tan.y, az = c.tan.x;
  const W = (p, y) => new THREE.Vector3(c.x + ax * p[0] + c.tan.x * p[1], y, c.z + az * p[0] + c.tan.y * p[1]);
  const pos = [], push = (...vs) => { for (const v of vs) pos.push(v.x, v.y, v.z); };
  const n = lo.length, mid = W([0, 0], 0);
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n, a = W(lo[i], y0), b = W(lo[j], y0), d = W(hi[i], y1), e = W(hi[j], y1);
    const out = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5).sub(mid).setY(0);
    const fn = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(e, a));
    if (fn.dot(out) < 0) push(a, e, b, a, d, e); else push(a, b, e, a, e, d);
  }
  // Top cap: a fan, wound to face up.
  for (let i = 1; i < n - 1; i++) {
    const a = W(hi[0], y1), b = W(hi[i], y1), d = W(hi[i + 1], y1);
    if (new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(d, a)).y > 0) push(a, b, d); else push(a, d, b);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  // Piers mark across as 99, so the shader leaves joints off them.
  g.setAttribute('aSU', new THREE.Float32BufferAttribute(new Float32Array(pos.length / 3 * 2).map((_, i) => (i % 2 ? 99 : s)), 2));
  castParts.push(g);
}
// A chamfered rectangle outline, w across and t along.
const chamfer = (w, t, k) => [[-w / 2 + k, -t / 2], [w / 2 - k, -t / 2], [w / 2, -t / 2 + k], [w / 2, t / 2 - k], [w / 2 - k, t / 2], [-w / 2 + k, t / 2], [-w / 2, t / 2 - k], [-w / 2, -t / 2 + k]];
{
  // Precast box girder: a thin deck slab over a deep trapezoid spine.
  sweep([[-HW, 0], [HW, 0], [HW, -0.7], [5.2, -1.0], [3.6, -3.6], [-3.6, -3.6], [-5.2, -1.0], [-HW, -0.7]], S0, LEN, 2);
  // Solid parapets, flush with the slab edge, sloped on the inside.
  for (const k of [-1, 1]) sweep([[k * 6.85, 0], [k * HW, 0], [k * HW, 1.25], [k * 7.15, 1.25]], S0, LEN, 2);
  // Twin rails: thin steel bars on the track line.
  for (let s = S0; s < LEN; s += 10) {
    for (const side of [-0.75, 0.75]) {
      const r = atX(s + 5, side + TRACK);
      box(r.x, DECK, r.z, 0.14, 0.22, 10.05, r.yaw, railParts);
    }
  }
  // Blade piers: a pile cap at the waterline, a slim shaft, a flared head.
  const yHead = DECK - 3.6 - 2.4;
  for (let s = S0 + 20; s <= LEN; s += 40) {
    prism(s, chamfer(9, 4.6, 0.8), chamfer(9, 4.6, 0.8), -3, 1.4);
    prism(s, chamfer(5.6, 2.4, 0.5), chamfer(5.6, 2.4, 0.5), 1.4, yHead);
    prism(s, chamfer(5.6, 2.4, 0.5), chamfer(7.6, 2.8, 0.5), yHead, DECK - 3.6);
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

/* ---------- train: runs the causeway out to the port and back ---------- */
// Past either end of the curve, the track runs on along its tangent.
function atX(s, side = 0) {
  if (s >= 0 && s <= LEN) return at(s, side);
  const e = s < 0 ? 0 : LEN, c = at(e, side), d = s - e;
  return { x: c.x + c.tan.x * d, z: c.z + c.tan.y * d, yaw: c.yaw, tan: c.tan };
}
const train = (() => {
  // A raked locomotive and three long wagons: one heavy, monolithic machine.
  const LOCO = 20, CAR = 24, GAP = 1.0, N = 4;
  const lens = [LOCO, CAR, CAR, CAR], offs = [];
  for (let i = 0, o = 0; i < N; o += lens[i] + GAP, i++) offs.push(o + lens[i] / 2);
  const SPAN = offs[N - 1] + lens[N - 1] / 2;
  const attrs = (g, col, kind) => {
    g = g.index ? g.toNonIndexed() : g;
    g.deleteAttribute('uv'); g.clearGroups();
    paint(g, col);
    g.setAttribute('aKind', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count).fill(kind), 1));
    return g;
  };
  // Hull section: a chamfered box on the bogies, built along +z.
  function hull(len, loco) {
    const h = loco ? 3.4 : 3.7, ch = loco ? 0.55 : 0.8, x = 1.65, y0 = 1.1, y1 = y0 + h;
    const shape = new THREE.Shape([[-x + 0.2, y0], [x - 0.2, y0], [x, y0 + 0.2], [x, y1 - ch], [x - ch, y1], [-x + ch, y1], [-x, y1 - ch], [-x, y0 + 0.2]].map(([a, b]) => new THREE.Vector2(a, b)));
    let g = new THREE.ExtrudeGeometry(shape, { depth: len, steps: loco ? 24 : 1, bevelEnabled: false });
    g.translate(0, 0, -len / 2);
    if (loco) {
      // The nose rakes down to a wedge over its last 6.5 m.
      const p = g.attributes.position, zN = len / 2 - 6.5;
      for (let i = 0; i < p.count; i++) {
        const z = p.getZ(i);
        if (z <= zN) continue;
        const t = (z - zN) / 6.5, y = p.getY(i);
        if (y > 2.2) p.setY(i, 2.2 + (y - 2.2) * (1 - 0.72 * t));
        p.setX(i, p.getX(i) * (1 - 0.08 * t));
      }
      g.computeVertexNormals();
    }
    const DARK = [0.025, 0.025, 0.027], BODY = [0.15, 0.15, 0.155];
    const bits = [attrs(g, BODY, loco ? 1 : 0)];
    for (const z of [-len / 2 + 3.6, len / 2 - 3.6]) bits.push(attrs(new THREE.BoxGeometry(2.7, 1.0, 3.2).translate(0, 0.55, z), DARK, 0));
    // A low roof block breaks the long top line.
    const rl = len * (loco ? 0.45 : 0.8);
    bits.push(attrs(new THREE.BoxGeometry(2.0, 0.35, rl).translate(0, y1 + 0.17, loco ? -len * 0.18 : 0), DARK, 0));
    return mergeGeometries(bits);
  }
  // Hull: dark wet paint with panel seams, a cab slit and flank markers.
  const hullMat = new THREE.ShaderMaterial({
    uniforms: { ...k2, ...lightU },
    vertexColors: true,
    vertexShader: /* glsl */`
    attribute float aKind;
    varying vec3 vP;
    varying vec3 vN;
    varying vec3 vL;
    varying vec3 vNL;
    varying vec3 vC;
    varying float vKind;
    void main() {
      vec4 w = modelMatrix * vec4(position, 1.0);
      vP = w.xyz; vL = position; vNL = normal; vC = color; vKind = aKind;
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
    ${HEAD}
    ${LIGHTS_GLSL}
    // A thin line at distance d, softened by the pixel footprint.
    float line(float d, float w, float aa) { return 1.0 - smoothstep(w, w + aa * 1.5 + 0.005, abs(d)); }
    void main() {
      vec3 N = normalize(vN), V = normalize(cameraPosition - vP), NL = normalize(vNL);
      float side = step(0.8, abs(NL.x));
      float az = fwidth(vL.z), ay = fwidth(vL.y);
      // Panel seams every 2.6 m and one at the waist, on the flanks only.
      float seam = side * max(line(fract(vL.z / 2.6 + 0.5) * 2.6 - 1.3, 0.02, az), line(vL.y - 2.9, 0.015, ay));
      vec3 albedo = vC * (1.0 - 0.6 * seam);
      // A dark skirt runs along the foot of the body.
      albedo *= mix(0.35, 1.0, smoothstep(1.55, 1.62, vL.y));
      float under = exp(-length(vP.xz - uGlow.xz) / uGlowR);
      vec3 amb = uCool * 0.01 + uAmber * 0.05 * under * (0.5 + 0.5 * N.y);
      vec3 c = albedo * (amb + k2lights(vP, N));
      // Wet paint: sharp lamp highlights and the lit cloud on the shoulders.
      float F = 0.04 + 0.96 * pow(1.0 - max(dot(N, V), 0.0), 5.0);
      c += (k2spec(vP, N, V, 70.0) * 0.25 + k2sky(reflect(-V, N)) * F * 1.4) * (1.0 - seam) * step(0.1, vC.r);
      // The cab slit glows across the raked nose.
      vec3 em = vec3(1.0, 0.62, 0.3) * 2.4 * vKind * step(0.3, NL.z) * step(abs(vL.x), 1.15) * line(vL.y - 3.5, 0.11, ay);
      // A cold marker line runs along each flank.
      em += vec3(0.7, 0.85, 1.0) * 1.8 * side * step(1.5, vL.y) * line(vL.y - 1.7, 0.03, ay);
      float f = k2hazeAmount(vP);
      vec3 col = mix(c, k2hazeColor(normalize(vP - cameraPosition), vP), f);
      gl_FragColor = vec4(col + em * (1.0 - 0.7 * f), 1.0);
    }`,
  });
  const locoG = hull(LOCO, true), carG0 = hull(CAR, false);
  const cars = [];
  for (let i = 0; i < N; i++) {
    const m = new THREE.Mesh(i ? carG0 : locoG, hullMat);
    m.userData.live = true;
    scene.add(m);
    cars.push(m);
  }
  // Lamps: two red tail lights and two head lamps, as a small flare set.
  const lampG = new THREE.BufferGeometry();
  lampG.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(12), 3).setUsage(THREE.DynamicDrawUsage));
  // The tail is orange-red, so the warning-light blink skips it.
  lampG.setAttribute('color', new THREE.Float32BufferAttribute([...scale([1, 0.2, 0.1], 6), ...scale([1, 0.2, 0.1], 6), ...scale(WHITE, 9), ...scale(WHITE, 9)], 3));
  lampG.setAttribute('size', new THREE.Float32BufferAttribute([70, 70, 120, 120], 1));
  const lamps = new THREE.Points(lampG, flareMat);
  lamps.renderOrder = 3; lamps.frustumCulled = false; lamps.userData.live = true; scene.add(lamps);
  const head = new THREE.Vector3();
  orbs.push({ pos: head, color: [1, 0.95, 0.85], k: 0.5, size: 1.2 });
  // Light list slots: one cold flank light per car, then the headlight.
  const COLD = [0.7, 0.85, 1.0];
  const carL = [], carGl = [];
  for (let i = 0; i < N; i++) { carL.push(lights.length); addLight(new THREE.Vector3(), new THREE.Vector3(...COLD), 0.6, 8); carGl.push(glints.length); addGlint(new THREE.Vector3(), COLD, 0.6, 0.12); }
  const headL = lights.length; addLight(new THREE.Vector3(), new THREE.Vector3(1, 0.95, 0.85), 4, 45, new THREE.Vector3(0, 0, -1), Math.cos(0.3));
  const headG = glints.length; addGlint(new THREE.Vector3(), WHITE, 3.0, 0.5);
  const beam = cone(new THREE.Vector3(), new THREE.Vector3(0, 0, -1), 110, 0.2, new THREE.Vector3(1, 0.95, 0.85), 0.7);
  beam.userData.live = true;
  const Y = new THREE.Vector3(0, -1, 0), d = new THREE.Vector3(), p = new THREE.Vector3();
  // Place the train: s is the nose's place on the track, dir its heading.
  function place(s, dir, sea) {
    for (let i = 0; i < N; i++) {
      const c = atX(s - dir * offs[i], TRACK);
      cars[i].position.set(c.x, DECK, c.z);
      // Each car faces the way the train runs.
      cars[i].rotation.y = c.yaw + (dir < 0 ? Math.PI : 0);
      p.set(c.x, DECK + 1.7, c.z);
      lights[carL[i]].pos.copy(p);
      if (sea) sea.material.uniforms.uGP.value[carGl[i]].set(p.x, p.y, p.z, 0.6);
    }
    const h = atX(s + dir * 0.2, TRACK), ahead = atX(s + dir * 80, TRACK);
    head.set(h.x, DECK + 2.0, h.z);
    d.set(ahead.x - h.x, -2.5, ahead.z - h.z).normalize();
    lights[headL].pos.copy(head); lights[headL].dir.copy(d);
    if (sea) sea.material.uniforms.uGP.value[headG].set(head.x, head.y, head.z, 3.0);
    beam.position.copy(head);
    beam.quaternion.setFromUnitVectors(Y, d);
    const pos = lampG.attributes.position;
    for (const [k, side] of [[0, -0.9], [1, 0.9]]) {
      const t = atX(s - dir * (SPAN + 0.1), TRACK + side), f = atX(s + dir * 0.15, TRACK + side);
      pos.setXYZ(k, t.x, DECK + 1.6, t.z);
      pos.setXYZ(k + 2, f.x, DECK + 1.75, f.z);
    }
    pos.needsUpdate = true;
  }
  let on = true;
  function show(v) { on = v; for (const c of cars) c.visible = v; lamps.visible = beam.visible = v; }
  // The bake turns these lamps off, so no train light stays on the deck.
  return { place, show, SPAN, lightIdx: [...carL, headL], get on() { return on; } };
})();
// The first frame shows the train mid-ground, outbound.
train.place(175, 1, null);
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
    m.userData.live = true;
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
const search = (() => {
  const t = tops.slice().sort((a, b) => b.y - a.y)[0];
  const src = new THREE.Vector3(t.x, t.y - 4, t.z);
  const dir = new THREE.Vector3(-0.5, 1, 0.55).normalize();
  // Start the beam a little above the lamp so its base stays clean.
  const m = cone(src.clone().addScaledVector(dir, 6), dir, 100, 0.06, new THREE.Vector3(0.75, 0.85, 1.0), 2.2, 0.5);
  m.userData.live = true;
  flare(src, [3, 3.5, 4], 90);
  orbs.push({ pos: src, color: [0.75, 0.85, 1], k: 0.3, size: 0.9 });
  const Y = new THREE.Vector3(0, -1, 0);
  // Aim the beam; it ends where it meets the cloud deck.
  function aim(x, z) {
    dir.set(x, 1, z).normalize();
    const len = (CLOUD_Y - src.y) / dir.y;
    k2.uSearchHit.value.copy(src).addScaledVector(dir, len);
    m.position.copy(src).addScaledVector(dir, 6);
    m.quaternion.setFromUnitVectors(Y, dir);
    m.scale.setScalar(len - 6);
  }
  aim(-0.5, 0.55);
  return { aim, src };
})();

// Bake static geometry into a few draw calls.
if (parts.length) scene.add(new THREE.Mesh(mergeGeometries(parts), concrete));
if (castParts.length) scene.add(new THREE.Mesh(mergeGeometries(castParts), precast));
if (railParts.length) scene.add(new THREE.Mesh(mergeGeometries(railParts), steel));
if (facadeParts.length) scene.add(new THREE.Mesh(mergeGeometries(facadeParts), facade));
if (glowParts.length) scene.add(new THREE.Mesh(mergeGeometries(glowParts), glowMat));
{
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(flares.pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(flares.col, 3));
  g.setAttribute('size', new THREE.Float32BufferAttribute(flares.size, 1));
  const p = new THREE.Points(g, flareMat); p.renderOrder = 3; p.frustumCulled = false; p.userData.live = true; scene.add(p);
  const h = new THREE.BufferGeometry();
  h.setAttribute('position', new THREE.Float32BufferAttribute(plumes.pos, 3));
  h.setAttribute('size', new THREE.Float32BufferAttribute(plumes.size, 1));
  h.setAttribute('lit', new THREE.Float32BufferAttribute(plumes.lit, 1));
  const q = new THREE.Points(h, plumeMat); q.renderOrder = 1; q.frustumCulled = false; q.userData.live = true; scene.add(q);
}

// Upload the light list; moving lamps upload again each frame.
function uploadLights() {
  lights.slice(0, NL).forEach((l, i) => {
    lightU.uLP.value[i].set(l.pos.x, l.pos.y, l.pos.z, l.power);
    lightU.uLC.value[i].set(l.col.x, l.col.y, l.col.z, l.range);
    lightU.uLD.value[i].set(l.dir.x, l.dir.y, l.dir.z, l.cos);
  });
  lightU.uLN.value = Math.min(NL, lights.length);
}
uploadLights();

/* Sky dome behind everything. */
{
  const m = new THREE.Mesh(new THREE.SphereGeometry(6000, 48, 24), new THREE.ShaderMaterial({
    uniforms: { ...k2 }, side: THREE.BackSide, depthWrite: false,
    vertexShader: /* glsl */`varying vec3 vP; void main() { vec4 w = modelMatrix * vec4(position, 1.0); vP = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */`varying vec3 vP; ${K2_NOISE} ${K2_SKY} void main() { gl_FragColor = vec4(k2sky(normalize(vP - cameraPosition)), 1.0); }`,
  }));
  m.renderOrder = -1;
  m.userData.sky = true;
  scene.add(m);
}

/* Sea: a calm, heavy swell over a half-resolution planar reflection. */
const sea = new Reflector(new THREE.PlaneGeometry(60000, 60000, 1, 1), {
  textureWidth: 256, textureHeight: 256, clipBias: 0.002,
  shader: {
    name: 'PortSea',
    uniforms: { ...k2, uRip: { value: Array.from({ length: 4 }, () => new THREE.Vector4(0, 0, -99, 0)) }, uRT: { value: 0 }, uReflK: { value: 1 }, color: { value: new THREE.Color() }, tDiffuse: { value: null }, textureMatrix: { value: null }, uFov: { value: new THREE.Vector2(1, 1) }, uGP: { value: glints.map(g => new THREE.Vector4(g.pos.x, g.pos.y, g.pos.z, g.k)) }, uGC: { value: glints.map(g => new THREE.Vector4(...g.col, g.reach)) } },
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
    uniform vec4 uRip[4];
    uniform float uRT, uReflK;
    varying vec4 vR;
    varying vec3 vP;
    ${HEAD}
    // One long swell train: slope of a sine, faded out with distance.
    vec2 swell(vec2 p, vec2 dir, float len, float amp, float ph, float dist) {
      float k = 6.2832 / len;
      float fade = 1.0 - smoothstep(len * 9.0, len * 24.0, dist);
      // Deep-water swell: speed follows wavelength.
      return dir * amp * cos(dot(p, dir) * k + ph - uTime * sqrt(9.81 * k)) * fade;
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
      vec2 hp = p * 0.006 + vec2(uTime * 0.01, uTime * 0.006);
      float e = 0.024, h0 = k2noise(hp);
      sl += vec2(k2noise(hp + vec2(e, 0.0)) - h0, k2noise(hp + vec2(0.0, e)) - h0) * 0.9;
      // Tap ripples: a ring of waves runs out from each touch point.
      float ring = 0.0;
      for (int i = 0; i < 4; i++) {
        float age = uRT - uRip[i].z;
        if (age < 0.0 || age > 7.0) continue;
        vec2 dv = p - uRip[i].xy;
        float dd = length(dv) + 1e-3, x = dd - age * 14.0;
        float env = exp(-x * x / 400.0) * exp(-age * 0.45) * uRip[i].w;
        float wv = sin(x * 0.55);
        sl += dv / dd * wv * env * 0.22;
        ring += env * max(wv, 0.0);
      }
      // Fine ripple only close to the camera.
      float nearK = 1.0 - smoothstep(50.0, 180.0, dist);
      if (nearK > 0.0) {
        vec2 rp = p * 0.45 + vec2(uTime * 0.6, -uTime * 0.35);
        float r0 = k2noise(rp);
        sl += vec2(k2noise(rp + vec2(0.3, 0.0)) - r0, k2noise(rp + vec2(0.0, 0.3)) - r0) * 0.12 * nearK;
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
      refl = refl / wsum * uReflK;
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
      // The facets roll toward the camera with the swell, so the dashes twinkle.
      float dn = k2noise(vec2(vP.x * 0.05 + uTime * 0.07, vP.z * 0.42 + uTime * 1.1));
      float dn2 = k2noise(vec2(vP.x * 0.11 + 7.0 - uTime * 0.05, vP.z * 0.9 + uTime * 1.7));
      float tilt = (dn * 0.7 + dn2 * 0.3 - 0.5) * 0.5 + (sl.y + sl.x * 0.3) * 0.5;
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
      // Ripple crests catch the amber sky.
      col += uAmber * 0.03 * ring * (0.3 + bank);
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
sea.updateMatrixWorld();
// The bake calls the mirror once; the sea mesh never draws itself.
const mirror = sea.onBeforeRender;
sea.onBeforeRender = () => {};

/* ---------- K2: precipitation ---------- */
// Light rain around the camera; drops brighten where light falls on them.
let rain;
{
  const n = 2500, pos = new Float32Array(n * 3);
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
      vC = (k2lights(w.xyz, normalize(cameraPosition - w.xyz)) * 1.6 + uCool * 0.11 + uAmber * 0.05) * uRainK;
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
  rain.userData.live = true;
  scene.add(rain);
}
/* ---------- end K2 ---------- */

/* Framing: a low, wide shot beside the causeway; portrait stacks it. */
const CAM = {
  w: { fov: 44, px: 0, py: 55, pz: 110, tx: -70, ty: -68, tz: -1500 },
  p: { fov: 66, px: 40, py: 120, pz: 230, tx: -60, ty: -100, tz: -1500 },
};
function frame(w, h, pr) {
  camera.aspect = w / h;
  const c = w >= h ? CAM.w : CAM.p;
  camera.fov = c.fov;
  camera.position.set(c.px, c.py, c.pz);
  camera.lookAt(c.tx, c.ty, c.tz);
  camera.updateProjectionMatrix();
  // The mirror bakes once at half the frame, at most 1024 px wide.
  const rk = Math.min(0.5 * pr, 1024 / w);
  sea.getRenderTarget().setSize(Math.max(1, Math.round(w * rk)), Math.max(1, Math.round(h * rk)));
  view = { w, h, pr };
  const vf = THREE.MathUtils.degToRad(camera.fov);
  sea.material.uniforms.uFov.value.set(1 / (2 * Math.atan(Math.tan(vf / 2) * camera.aspect)), 1 / vf);
  // Point sizes follow the projected pixel scale.
  projU.uScale.value = (h * pr) / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2)) / 400;
}

/* ---------- bake: a matte painting of everything that holds still ---------- */
// Static parts render once per resize into textures; each frame draws only
// one full-screen pass for sky and sea, plus the few live 3D parts.
let view = { w: 1, h: 1, pr: 1 };
const statics = new THREE.Group(), live = new THREE.Group(), skyG = new THREE.Group();
for (const o of [...scene.children]) {
  if (o === sea) continue;
  (o.userData.live ? live : o.userData.sky ? skyG : statics).add(o);
}
scene.remove(sea);
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
const backRT = new THREE.WebGLRenderTarget(1, 1, { ...rtOpt, depthTexture: new THREE.DepthTexture(1, 1) });
const fogRT = new THREE.WebGLRenderTarget(1, 1, rtOpt);
// World normals of the still layer, so the train can relight it.
const normRT = new THREE.WebGLRenderTarget(1, 1, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter });
const normalMat = new THREE.ShaderMaterial({
  vertexShader: /* glsl */`varying vec3 vN; void main() { vN = mat3(modelMatrix) * normal; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  // Lines have no normals; they count as facing up.
  fragmentShader: /* glsl */`varying vec3 vN; void main() { vec3 N = length(vN) > 0.01 ? normalize(vN) : vec3(0.0, 1.0, 0.0); gl_FragColor = vec4(N * 0.5 + 0.5, 1.0); }`,
});
// Train light slots for the relight: position and power, colour and range, spot.
const NT = 5;
const trainU = {
  uTP: { value: Array.from({ length: NT }, () => new THREE.Vector4()) },
  uTC: { value: Array.from({ length: NT }, () => new THREE.Vector4()) },
  uTD: { value: Array.from({ length: NT }, () => new THREE.Vector4()) },
};
// The sea's fog and horizon never change, so they bake per pixel too.
const fogScene = new THREE.Scene();
fogScene.add(new THREE.Mesh(new THREE.PlaneGeometry(60000, 60000).rotateX(-Math.PI / 2).translate(0, 0, -2000), new THREE.ShaderMaterial({
  uniforms: { ...k2 },
  vertexShader: WORLD_VS,
  fragmentShader: /* glsl */`
  varying vec3 vP;
  varying vec3 vN;
  ${HEAD}
  void main() {
    vec3 V = normalize(cameraPosition - vP);
    float dist = length(cameraPosition - vP);
    float hf = k2hazeAmount(vP) * 0.85;
    vec3 hc = k2hazeColor(normalize(vP - cameraPosition), vP);
    vec3 hor = k2sky(normalize(vec3(-V.x, 0.0005, -V.z)));
    float h2 = smoothstep(2200.0, 6000.0, dist);
    // final = sea * a + rgb.
    gl_FragColor = vec4(hc * hf * (1.0 - h2) + hor * h2, (1.0 - hf) * (1.0 - h2));
  }`,
})));
const mirrorM = new THREE.Matrix4(), invVP = new THREE.Matrix4();
const su = sea.material.uniforms;
const comp = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
  uniforms: {
    ...k2, uGP: su.uGP, uGC: su.uGC, uRip: su.uRip, uRT: su.uRT, uReflK: su.uReflK,
    tBack: { value: backRT.texture }, tDepth: { value: backRT.depthTexture }, tFog: { value: fogRT.texture }, tNorm: { value: normRT.texture }, ...trainU,
    tMirror: { value: sea.getRenderTarget().texture }, uMirrorM: { value: mirrorM }, uInvVP: { value: invVP },
    uGX: { value: new Float32Array(NG) },
    uFarK: { value: 1 },
  },
  depthTest: true, depthWrite: true, depthFunc: THREE.AlwaysDepth,
  vertexShader: /* glsl */`varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
  fragmentShader: /* glsl */`
  uniform sampler2D tBack, tDepth, tFog, tMirror, tNorm;
  uniform vec4 uTP[${NT}];
  uniform vec4 uTC[${NT}];
  uniform vec4 uTD[${NT}];
  uniform mat4 uMirrorM, uInvVP;
  uniform vec4 uGP[${NG}];
  uniform vec4 uGC[${NG}];
  uniform vec4 uRip[4];
  uniform float uGX[${NG}];
  uniform float uRT, uReflK, uFarK;
  uniform float uSwellK, uSwellT, uGlintK, uGlintW, uBankK, uRingK, uRippleK;
  uniform vec3 uDeep;
  varying vec2 vUv;
  ${HEAD}
  vec2 swell(vec2 p, vec2 dir, float len, float amp, float ph, float dist) {
    float k = 6.2832 / len;
    float fade = 1.0 - smoothstep(len * 9.0, len * 24.0, dist);
    // Deep-water swell: speed follows wavelength.
    return dir * amp * uSwellK * cos(dot(p, dir) * k + ph - uTime * uSwellT * sqrt(9.81 * k)) * fade;
  }
  vec3 seaAt(vec3 P, vec3 V, float dist, float sx0) {
    vec2 p = P.xz;
    vec2 sl = swell(p, normalize(vec2(0.25, 1.0)), 95.0, 0.05, 0.0, dist)
            + swell(p, normalize(vec2(-0.4, 1.0)), 52.0, 0.04, 1.7, dist)
            + swell(p, normalize(vec2(0.55, 1.0)), 27.0, 0.032, 4.1, dist)
            + swell(p, normalize(vec2(-0.15, 1.0)), 14.0, 0.022, 2.3, dist);
    vec2 hp = p * 0.006 + vec2(uTime * 0.01, uTime * 0.006);
    float h0 = k2noise(hp);
    sl += vec2(k2noise(hp + vec2(0.024, 0.0)) - h0, k2noise(hp + vec2(0.0, 0.024)) - h0) * 0.9;
    // Tap ripples: a ring of waves runs out from each touch point.
    float ring = 0.0;
    for (int i = 0; i < 4; i++) {
      float age = uRT - uRip[i].z;
      if (age < 0.0 || age > 7.0) continue;
      vec2 dv = p - uRip[i].xy;
      float dd = length(dv) + 1e-3, x = dd - age * 14.0;
      float env = exp(-x * x / 400.0) * exp(-age * 0.45) * uRip[i].w;
      float wv = sin(x * 0.55);
      sl += dv / dd * wv * env * 0.22 * uRippleK;
      ring += env * max(wv, 0.0);
    }
    float nearK = 1.0 - smoothstep(50.0, 180.0, dist);
    if (nearK > 0.0) {
      vec2 rp = p * 0.45 + vec2(uTime * 0.6, -uTime * 0.35);
      float r0 = k2noise(rp);
      sl += vec2(k2noise(rp + vec2(0.3, 0.0)) - r0, k2noise(rp + vec2(0.0, 0.3)) - r0) * 0.12 * nearK;
    }
    vec3 N = normalize(vec3(-sl.x, 1.0, -sl.y));
    // The baked mirror, bent by the swell and smeared into vertical streaks.
    vec4 mr = uMirrorM * vec4(P, 1.0);
    vec2 uv = mr.xy / mr.w;
    float graze = max(V.y, 0.04);
    vec2 off = vec2(N.x * 0.7 * graze * 0.6, -N.z * 0.7 * 0.9);
    float stretch = 0.06 + 0.1 * (1.0 - smoothstep(0.04, 0.4, graze));
    // Far water scatters each reflection into a wider swath.
    float far = uFarK * smoothstep(60.0, 2400.0, dist);
    vec3 refl = vec3(0.0);
    float wsum = 0.0;
    for (int i = -3; i <= 3; i++) {
      float t = float(i) / 3.0, wgt = exp(-t * t * 2.2);
      float sx = (fract(float(i) * 0.618 + 0.3) - 0.5) * 0.05 * far;
      refl += texture2D(tMirror, clamp(uv + off + vec2(sl.x * 0.03 * t + sx, t * stretch), 0.001, 0.999)).rgb * wgt;
      wsum += wgt;
    }
    refl = refl / wsum * uReflK;
    refl *= 0.7 + 0.6 * smoothstep(-0.025, 0.035, -sl.y);
    float F = 0.02 + 0.98 * pow(1.0 - max(dot(N, V), 0.0), 5.0);
    refl *= 1.0 - 0.3 * smoothstep(1300.0, 2800.0, dist);
    vec3 col = uDeep * (1.0 - F) + refl * F * vec3(0.74, 0.9, 1.1);
    // Glint columns: wave facets that tilt just right flash as soft dashes.
    float dn = k2noise(vec2(P.x * 0.05 + uTime * 0.07, P.z * 0.42 + uTime * 1.1));
    float dn2 = k2noise(vec2(P.x * 0.11 + 7.0 - uTime * 0.05, P.z * 0.9 + uTime * 1.7));
    float tilt = (dn * 0.7 + dn2 * 0.3 - 0.5) * 0.5 + (sl.y + sl.x * 0.3) * 0.5;
    float farK = smoothstep(900.0, 2600.0, dist);
    vec3 R0 = reflect(-V, vec3(0.0, 1.0, 0.0));
    vec3 right = normalize(cross(V, vec3(0.0, 1.0, 0.0)));
    vec3 st = vec3(0.0);
    // Columns widen with distance from the camera, and dim to match.
    float widen = 1.0 + 2.5 * far, cmax = 0.16 + 0.12 * uFarK;
    for (int i = 0; i < ${NG}; i++) {
      // Each column runs straight down under its light; skip far columns.
      float cx = abs(uGX[i] - sx0);
      if (cx > cmax) continue;
      vec3 L = uGP[i].xyz - P;
      float dl = length(L);
      vec3 err = R0 - L / dl;
      float ex = dot(err, right) + (dn2 - 0.5) * 0.004, ey = err.y, need = ey * 0.5;
      float m = mix(exp(-pow((tilt - need) / uGlintW, 2.0)), 0.35 * exp(-pow(need / 0.09, 2.0)), farK);
      float fall = ey > 0.0 ? exp(-ey / uGC[i].w) : exp(-pow(ey / 0.02, 2.0));
      float sx = max(0.0035, 3.0 / dl) * widen;
      float ahead = smoothstep(0.96, 0.995, dot(normalize(R0.xz), normalize(L.xz)));
      st += uGC[i].rgb * uGP[i].w * m * fall * ahead * exp(-ex * ex / (sx * sx)) * smoothstep(cmax, cmax * 0.6, cx) * inversesqrt(widen);
    }
    float bank = exp(-length(P.xz - uGlow.xz) / (uGlowR * 1.3));
    col += uAmber * uBankK * bank * (0.4 + 0.6 * F) * (0.75 + 0.5 * smoothstep(-0.03, 0.03, -sl.y));
    col += uAmber * uRingK * ring * (0.3 + bank);
    col += st * mix(0.45, 1.0, F) * uGlintK;
    return col;
  }
  // Train light on a baked pixel: a diffuse pool and a wet highlight.
  vec3 trainLight(vec3 P, vec3 N, vec3 V, float wet) {
    vec3 sum = vec3(0.0);
    for (int i = 0; i < ${NT}; i++) {
      if (uTP[i].w <= 0.0) continue;
      vec3 L = uTP[i].xyz - P;
      float d = length(L);
      if (d > uTC[i].w * 8.0) continue;
      L /= d;
      float att = uTP[i].w * uLightK / (1.0 + pow(d / uTC[i].w, 2.0));
      float spot = uTD[i].w > -1.5 ? smoothstep(uTD[i].w, uTD[i].w + 0.12, dot(-L, uTD[i].xyz)) : 1.0;
      float diff = max(dot(N, L) * 0.85 + 0.15, 0.0);
      float sp = pow(max(dot(N, normalize(L + V)), 0.0), 60.0) * wet * 4.0;
      sum += uTC[i].rgb * att * spot * (0.22 * diff + sp);
    }
    return sum;
  }
  void main() {
    vec4 back = texture2D(tBack, vUv);
    vec3 col = back.rgb;
    // Rebuild each baked pixel's position from depth, then add train light.
    vec4 nz = texture2D(tNorm, vUv);
    if (back.a > 0.5 && nz.a > 0.5) {
      vec3 N = normalize(nz.xyz * 2.0 - 1.0);
      vec4 wp = uInvVP * vec4(vUv * 2.0 - 1.0, texture2D(tDepth, vUv).r * 2.0 - 1.0, 1.0);
      vec3 P = wp.xyz / wp.w;
      vec3 tl = trainLight(P, N, normalize(cameraPosition - P), smoothstep(0.8, 0.97, N.y));
      if (dot(tl, tl) > 1e-10) col += tl * (1.0 - k2hazeAmount(P));
    }
    if (back.a < 0.999) {
      vec4 wp = uInvVP * vec4(vUv * 2.0 - 1.0, 1.0, 1.0);
      vec3 dir = normalize(wp.xyz / wp.w - cameraPosition);
      vec3 under;
      float t = dir.y < -0.0004 ? -cameraPosition.y / dir.y : 1e9;
      // Past the baked fog plane the horizon sky takes over.
      if (t < 20000.0) {
        vec3 P = cameraPosition + dir * t;
        vec4 fog = texture2D(tFog, vUv);
        under = seaAt(P, -dir, t, vUv.x * 2.0 - 1.0) * fog.a + fog.rgb;
      } else under = k2sky(dir);
      col = under * (1.0 - back.a) + back.rgb;
    }
    gl_FragColor = vec4(col, 1.0);
    gl_FragDepthEXT = texture2D(tDepth, vUv).r;
  }`,
}));
comp.frustumCulled = false;
comp.renderOrder = -100;
scene.add(comp);
const clearC = new THREE.Color();
// Bake: mirror, then the still scene with depth, then the sea's fog.
function bake(renderer) {
  bakeWith = renderer;
  scene.remove(sea);
  const { w, h, pr } = view;
  // The still layer bakes at up to twice the pixels, for smooth edges.
  const ss = Math.min(2, 4096 / (w * pr), 4096 / (h * pr));
  const bw = Math.round(w * pr * ss), bh = Math.round(h * pr * ss);
  backRT.setSize(bw, bh);
  fogRT.setSize(Math.round(w * pr), Math.round(h * pr));
  const prevT = renderer.getRenderTarget(), prevA = renderer.getClearAlpha();
  renderer.getClearColor(clearC);
  // No train light may stay baked on the deck.
  for (const i of train.lightIdx) lightU.uLP.value[i].w = 0;
  camera.updateMatrixWorld();
  statics.visible = true; live.visible = false; comp.visible = false;
  skyG.visible = true;
  mirror.call(sea, renderer, scene, camera);
  mirrorM.copy(su.textureMatrix.value).multiply(sea.matrixWorld.clone().invert());
  skyG.visible = false;
  renderer.setClearColor(0x000000, 0);
  renderer.setRenderTarget(backRT); renderer.clear(); renderer.render(scene, camera);
  renderer.setRenderTarget(fogRT); renderer.clear(); renderer.render(fogScene, camera);
  // Normals: see-through parts stay out, so they never take train light.
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
  if (chase.mode) setLive(true);
}
/* ---------- end bake ---------- */

  /* Motion: one clock drives the ambient life; trains run out and back. */
train.place(175, 1, sea);
const run = { s: 175, dir: 1, v: 20, wait: 0, gone: false, user: false };
let runPause = 6;
const END = LEN + 160, START = -160;
let time = 0, rt = 0, paceNow = 1, parked = false;
// A parked train (QA) holds still at any speed setting.
const speed = () => (parked ? 0 : run.v);
// The searchlight: auto sweep, or the pointer's aim while steering.
const aimNow = new THREE.Vector2(-0.5, 0.55), aimTo = new THREE.Vector2();
let steering = false, steerEase = 0;
// Ripples: four slots, reused oldest first.
const rips = sea.material.uniforms.uRip.value;
let ripN = 0;
const ray = new THREE.Raycaster(), hit = new THREE.Vector3();
const seaPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const cloudPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), CLOUD_Y);
// pace eases ambient motion: 1 awake, 0 asleep; user acts keep running.
function update(dt, pace) {
  time += dt * pace;
  rt += dt;
  k2.uTime.value = time;
  sea.material.uniforms.uRT.value = rt;
  // Auto sweep: a slow figure over the cloud.
  const ax = -0.5 + 0.45 * Math.sin(time * 0.05), az = 0.55 + 0.3 * Math.cos(time * 0.037);
  steerEase = steering ? 1 : Math.max(0, steerEase - dt * 0.4);
  const tx = steerEase > 0 ? aimTo.x * steerEase + ax * (1 - steerEase) : ax;
  const tz = steerEase > 0 ? aimTo.y * steerEase + az * (1 - steerEase) : az;
  aimNow.x += (tx - aimNow.x) * Math.min(1, dt * 6);
  aimNow.y += (tz - aimNow.y) * Math.min(1, dt * 6);
  search.aim(aimNow.x, aimNow.y);
  paceNow = pace;
  const k = run.user ? 1 : pace;
  if (run.gone) {
    run.wait -= dt * k;
    if (run.wait <= 0) { run.gone = false; run.dir = -run.dir; run.s = run.dir > 0 ? START : END; train.show(true); }
  } else {
    run.s += run.dir * speed() * dt * k;
    // Past the far end the train is lost in the port fog; then it returns.
    if (run.s > END + train.SPAN || run.s < START - train.SPAN) { train.show(false); run.gone = true; run.wait = runPause; run.user = false; }
  }
  train.place(run.s, run.dir, sea);
  updateChase(dt);
  uploadLights();
  // The relight takes the train's lamps; a hidden train lights nothing.
  train.lightIdx.forEach((li, i) => {
    trainU.uTP.value[i].copy(lightU.uLP.value[li]);
    if (!train.on) trainU.uTP.value[i].w = 0;
    trainU.uTC.value[i].copy(lightU.uLC.value[li]);
    trainU.uTD.value[i].copy(lightU.uLD.value[li]);
  });
  const gx = comp.material.uniforms.uGX.value;
  su.uGP.value.forEach((g, i) => { gv.set(g.x, g.y, g.z).project(camera); gx[i] = gv.z < 1 ? gv.x : 9; });
}
const gv = new THREE.Vector3();
function sendTrain() {
  if (run.gone) run.wait = 0;
  run.user = true;
}
// A tap on the water drops a ripple; a tap on the sky sends a train.
function tap(ndc) {
  if (!ndc) return sendTrain();
  // During a ride, any tap returns to the wide shot.
  if (chase.mode === 1) return endChase();
  if (!chase.mode && train.on && hitTrain(ndc)) return startChase();
  ray.setFromCamera(ndc, camera);
  if (ray.ray.direction.y < -0.002 && ray.ray.intersectPlane(seaPlane, hit) && hit.distanceTo(camera.position) < 2600) {
    rips[ripN % 4].set(hit.x, hit.z, rt, 1);
    ripN++;
  } else sendTrain();
}
// Drag or hold aims the searchlight at the cloud under the pointer.
function steer(ndc) {
  ray.setFromCamera(ndc, camera);
  const d = ray.ray.direction;
  if (d.y > 0.01 && ray.ray.intersectPlane(cloudPlane, hit)) {
    const src = search.src, h = hit.clone().sub(src);
    aimTo.set(h.x / Math.max(h.y, 1), h.z / Math.max(h.y, 1));
  } else aimTo.set(d.x * 3, d.z * 0.5 + 0.2);
  aimTo.x = Math.max(-1.6, Math.min(1.6, aimTo.x));
  aimTo.y = Math.max(-1.2, Math.min(1.6, aimTo.y));
  steering = true;
}
function release() { steering = false; }

/* ---------- chase: a tap on the train rides a low camera beside it ---------- */
// Mode 0 is the wide shot, 1 rides, 2 eases back to the wide shot.
const chase = { mode: 0, t: 0, s: 0 };
// The camera rides this far off the track, on this side, this far ahead.
const SIDE = 1, OFF = 16, LEAD = 45, REL = 16, IN = 1.4, OUT = 1.8, FOV = 30;
let bakeWith = null;
const camP = new THREE.Vector3(), lookT = new THREE.Vector3(), wideP = new THREE.Vector3(), wideT = new THREE.Vector3(), aimT = new THREE.Vector3();
const smooth = t => t * t * (3 - 2 * t);
// A moving camera cannot use the bake, so the still parts draw live.
function setLive(on) {
  statics.visible = skyG.visible = on;
  comp.visible = !on;
  sea.onBeforeRender = on ? mirror : () => {};
  if (on) scene.add(sea); else scene.remove(sea);
}
function lens(fov) {
  camera.fov = fov;
  camera.updateProjectionMatrix();
  const vf = THREE.MathUtils.degToRad(fov);
  su.uFov.value.set(1 / (2 * Math.atan(Math.tan(vf / 2) * camera.aspect)), 1 / vf);
  projU.uScale.value = (view.h * view.pr) / (2 * Math.tan(vf / 2)) / 400;
}
function startChase() {
  chase.mode = 1; chase.t = 0;
  chase.s = run.s + run.dir * LEAD;
  // A ride keeps the train at full speed.
  run.user = true;
  setLive(true);
}
function endChase() { if (chase.mode === 1) { chase.mode = 2; chase.t = 0; } }
function updateChase(dt) {
  if (!chase.mode) return;
  chase.t += dt;
  const dir = run.dir;
  // The camera rolls a little slower than the train, so the train slides past.
  chase.s += dir * Math.max(0, speed() - REL) * dt;
  const c = atX(chase.s, TRACK + SIDE * OFF);
  camP.set(c.x, DECK + 3.2, c.z);
  // Aim at the part of the train just behind the camera, nose to tail.
  const head = run.s, tail = run.s - dir * train.SPAN;
  const ls = THREE.MathUtils.clamp(chase.s - dir * 10, Math.min(head, tail), Math.max(head, tail));
  const l = atX(ls, TRACK);
  lookT.set(l.x, DECK + 2.4, l.z);
  // The ride ends 60 m after the tail passes, or when the train leaves.
  if (chase.mode === 1 && (dir * (tail - chase.s) > 60 || !train.on)) endChase();
  const cw = view.w >= view.h ? CAM.w : CAM.p;
  wideP.set(cw.px, cw.py, cw.pz); wideT.set(cw.tx, cw.ty, cw.tz);
  const k = chase.mode === 1 ? smooth(Math.min(1, chase.t / IN)) : 1 - smooth(Math.min(1, chase.t / OUT));
  camera.position.lerpVectors(wideP, camP, k);
  camera.lookAt(aimT.lerpVectors(wideT, lookT, k));
  lens(cw.fov + (FOV - cw.fov) * k);
  if (chase.mode === 2 && chase.t >= OUT) {
    // Back on the wide shot: the bake takes over again, with a fresh mirror.
    chase.mode = 0;
    frame(view.w, view.h, view.pr);
    setLive(false);
    if (bakeWith) bake(bakeWith);
  }
}
// A tap within 40 px of the train starts a ride.
function hitTrain(ndc) {
  for (let d = 0; d <= train.SPAN; d += 6) {
    const c = atX(run.s - run.dir * d, TRACK);
    gv.set(c.x, DECK + 2.5, c.z).project(camera);
    if (gv.z < 1 && Math.hypot((gv.x - ndc.x) * view.w / 2, (gv.y - ndc.y) * view.h / 2) < 40) return true;
  }
  return false;
}
/* ---------- end chase ---------- */
// A moving train runs at full rate, so it never steps.
const lively = () => run.user || steering || steerEase > 0 || rips.some(r => rt - r.z < 7) || (train.on && paceNow > 0) || chase.mode > 0;
// Lower steps quality down one rung: 1 drops the mirror, 2 the rain.
function lower(rung) {
  if (rung >= 2) rain.visible = false;
}

// Dispose frees every geometry, material and texture this scene made.
  function dispose() {
    sea.dispose(); backRT.dispose(); fogRT.dispose(); normRT.dispose(); normalMat.dispose();
    fogScene.traverse(o => { o.geometry?.dispose(); o.material?.dispose(); });
    statics.visible = skyG.visible = true;
    scene.traverse(o => {
      o.geometry?.dispose();
      for (const m of [].concat(o.material || [])) { for (const v of Object.values(m.uniforms || {})) v.value?.isTexture && v.value.dispose(); m.map?.dispose(); m.dispose(); }
    });
  }

/* ---------- tune: every look knob, for the ?tune panel ---------- */
// Each knob: group, key, label, range, step, default, and what it sets.
// bake: true knobs change the matte painting, so the page re-bakes.
const U = k2;
const col3 = (v3) => ({ get: () => '#' + new THREE.Color(v3.x, v3.y, v3.z).getHexString(), set: hex => { const c = new THREE.Color(hex); v3.set(c.r, c.g, c.b); } });
const uni = (u) => ({ get: () => u.value, set: v => { u.value = v; } });
const TUNE = [];
function knob(group, key, label, min, max, step, io, bake = false) { TUNE.push({ group, key, label, min, max, step, bake, def: io.get(), ...io }); }
function colour(group, key, label, v3, bake = false) { const io = col3(v3); TUNE.push({ group, key, label, type: 'color', bake, def: io.get(), ...io }); }
// Colour.
colour('Colour', 'amber', 'Port amber', U.uAmber.value, true);
colour('Colour', 'cool', 'Cool air', U.uCool.value, true);
colour('Colour', 'deep', 'Deep water', U.uDeep.value);
// Sky and cloud.
knob('Sky', 'zen', 'Sky brightness', 0, 4, 0.01, uni(U.uZenK), true);
knob('Sky', 'dome', 'Amber dome', 0, 0.2, 0.001, uni(U.uDomeK), true);
knob('Sky', 'bankGlow', 'Horizon glow', 0, 0.4, 0.001, uni(U.uBankGlowK), true);
knob('Sky', 'cloudK', 'Cloud light', 0, 4, 0.01, uni(U.uCloudK));
knob('Sky', 'cloudLo', 'Cloud cover from', 0, 1, 0.01, uni(U.uCloudLo));
knob('Sky', 'cloudHi', 'Cloud cover to', 0, 1, 0.01, uni(U.uCloudHi));
knob('Sky', 'gap', 'Cloud gap light', 0, 0.05, 0.0005, uni(U.uGapK));
knob('Sky', 'windX', 'Wind across', -40, 40, 0.5, { get: () => U.uWind.value.x, set: v => { U.uWind.value.x = v; } });
knob('Sky', 'windZ', 'Wind toward', -40, 40, 0.5, { get: () => U.uWind.value.y, set: v => { U.uWind.value.y = v; } });
knob('Sky', 'cloudY', 'Cloud height', 120, 800, 1, uni(U.uCloudY), true);
// Haze and fog.
knob('Haze', 'haze', 'Air haze', 0, 0.006, 0.00005, uni(U.uHaze), true);
knob('Haze', 'hazeH', 'Haze height', 10, 400, 1, uni(U.uHazeH), true);
knob('Haze', 'portFog', 'Port fog', 0, 0.2, 0.001, uni(U.uPortFog), true);
knob('Haze', 'fogFall', 'Fog thins with height', 40, 800, 1, uni(U.uFogFall), true);
knob('Haze', 'wisp', 'Fog wisps', 0, 1.6, 0.01, uni(U.uWisp), true);
knob('Haze', 'glowR', 'Glow reach', 300, 3000, 10, uni(U.uGlowR), true);
// Light.
knob('Light', 'lightK', 'Lamp power', 0, 4, 0.01, uni(U.uLightK), true);
knob('Light', 'winK', 'Window light', 0, 8, 0.05, uni(U.uWinK), true);
knob('Light', 'coneK', 'Light cones', 0, 4, 0.01, uni(U.uConeK), true);
knob('Light', 'flareK', 'Lamp flares', 0, 4, 0.01, uni(U.uFlareK));
knob('Light', 'plumeK', 'Plume glow', 0, 4, 0.01, uni(U.uPlumeK));
knob('Light', 'flameK', 'Flare-stack flame', 0, 4, 0.01, uni(flameMat.uniforms.uFlameK));
knob('Light', 'searchK', 'Searchlight on cloud', 0, 2, 0.01, uni(U.uSearchK));
// Sea.
knob('Sea', 'reflK', 'Reflection', 0, 3, 0.01, uni(su.uReflK));
knob('Sea', 'swellK', 'Swell height', 0, 4, 0.01, uni(U.uSwellK));
knob('Sea', 'swellT', 'Swell speed', 0, 4, 0.01, uni(U.uSwellT));
knob('Sea', 'glintK', 'Glint brightness', 0, 4, 0.01, uni(U.uGlintK));
knob('Sea', 'glintW', 'Glint spread', 0.004, 0.08, 0.001, uni(U.uGlintW));
knob('Sea', 'farK', 'Far spread', 0, 3, 0.01, uni(comp.material.uniforms.uFarK));
knob('Sea', 'bankK', 'Golden sheen', 0, 0.3, 0.001, uni(U.uBankK));
knob('Sea', 'rippleK', 'Tap ripple size', 0, 4, 0.01, uni(U.uRippleK));
knob('Sea', 'ringK', 'Ripple shine', 0, 0.2, 0.001, uni(U.uRingK));
// Motion.
knob('Motion', 'speed', 'Train speed', 2, 80, 0.5, { get: () => run.v, set: v => { run.v = v; } });
knob('Motion', 'pause', 'Pause between trains', 0, 30, 0.5, { get: () => runPause, set: v => { runPause = v; } });
knob('Motion', 'rain', 'Rain', 0, 3, 0.01, uni(U.uRainK));
// Camera, per orientation.
for (const [o, name] of [['w', 'Camera (wide)'], ['p', 'Camera (portrait)']]) {
  const c = CAM[o];
  const io = k => ({ get: () => c[k], set: v => { c[k] = v; frame(view.w, view.h, view.pr); } });
  knob(name, o + 'fov', 'Lens (fov)', 15, 100, 0.5, io('fov'), true);
  knob(name, o + 'px', 'Position x', -800, 800, 1, io('px'), true);
  knob(name, o + 'py', 'Height', 5, 600, 1, io('py'), true);
  knob(name, o + 'pz', 'Position z', -400, 900, 1, io('pz'), true);
  knob(name, o + 'tx', 'Look x', -1500, 1500, 1, io('tx'), true);
  knob(name, o + 'ty', 'Look y', -800, 400, 1, io('ty'), true);
  knob(name, o + 'tz', 'Look z', -4000, -200, 1, io('tz'), true);
}
// Tom's Port look, pasted from the tune panel's Copy JSON.
// Post keys (expo, bloom, orbs, vignette, grain, tint) live in post below.
const LOOK = {
  amber: '#a67117', deep: '#000000',
  zen: 1.77, dome: 0.042, bankGlow: 0.19, cloudK: 1.72, cloudLo: 0.24, cloudHi: 0.69, gap: 0.013,
  windX: -20, windZ: -13.5, cloudY: 300,
  haze: 0.0006, hazeH: 87, portFog: 0, fogFall: 800, wisp: 0, glowR: 3000,
  lightK: 2, coneK: 2.45, flareK: 0.43, plumeK: 0.53, flameK: 1.23, searchK: 0.61,
  reflK: 3, swellK: 1.4, swellT: 0.72, glintK: 0.11, glintW: 0.017, bankK: 0, rippleK: 1.38, ringK: 0.114,
  speed: 80, pause: 0, rain: 0,
  wfov: 40.5, wpx: 45, wpy: 57, wpz: 135, wtx: -13, wtz: -2504,
};
// The look becomes each knob's default, so Reset returns to it.
for (const t of TUNE) if (t.key in LOOK) { t.set(LOOK[t.key]); t.def = t.get(); }
// QA can park the train with ?train=<s>, in metres along the track.
const parkAt = new URLSearchParams(location.search).get('train');
if (parkAt !== null) { parked = true; run.s = +parkAt; train.place(run.s, 1, sea); }
// QA can start a ride at load with ?ride.
if (new URLSearchParams(location.search).has('ride')) startChase();
const tune = {
  list: TUNE,
  // set returns true when the matte painting needs a re-bake.
  set(key, v) { const k = TUNE.find(t => t.key === key); if (!k) return false; k.set(v); return k.bake; },
};
/* ---------- end tune ---------- */

return { scene, camera, frame, bake, tune, dispose, orbs, update, tap, steer, release, lively, lower, post: { expo: 0.61, bloom: [1.68, 1.18, 0.8], orbK: 0.88, orbSize: 1.19, tint: '#150f09', vig: 0.01, vigIn: 0.35, grain: 0.094 } };
}
