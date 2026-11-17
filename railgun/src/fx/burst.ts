// Load order: fx/dust runs first.
import './dust.ts';
import * as THREE from 'three';
import { linFit, reduced } from '../../../shared/stim.js';
import { state } from '../state.ts';
import { rnd, scene } from '../setup.ts';
import { BLUE, U } from '../world/uniforms.ts';
import { HZFADE } from '../sky/atmosphere.ts';
import { BAND } from '../clouds/bands.ts';
import { EMBER } from '../rock/asteroid.ts';

/* ---------- K6: burst particles ---------- */
// Lifted from Marsh launch, which lifted it from Fireworks.
// Changes here: a low gravity, a charge-blue ramp, no mirror layer.
const CAP = 4000;
// Embers fall in arcs at the blast's kilometre scale.
const G = new THREE.Vector3(0, -40, 0);
const RAMPS = [
  linFit(0.82, 0.16, 80), // sodium gold
  linFit(0.97, 0.02, 90), // magnesium white
  linFit(0.74, 0.18, 55), // calcium orange
  BLUE, // charge blue
];
export const starGeo = new THREE.InstancedBufferGeometry();
// Three columns: tail (0), middle (1), head (2).
// A trail can bend.
starGeo.setAttribute('position', new THREE.Float32BufferAttribute([0, -1, 0, 0, 1, 0, 1, -1, 0, 1, 1, 0, 2, -1, 0, 2, 1, 0], 3));
starGeo.setIndex([0, 2, 3, 0, 3, 1, 2, 4, 5, 2, 5, 3]);
const slot = (name: string) => {
  const a = new THREE.InstancedBufferAttribute(new Float32Array(CAP * 4), 4);
  a.setUsage(THREE.DynamicDrawUsage);
  starGeo.setAttribute(name, a);
  return a;
};
const aA = slot('aA'), aBs = slot('aB'), aC = slot('aC'), aD = slot('aD');
starGeo.instanceCount = 0;
export const starMat = new THREE.ShaderMaterial({
  uniforms: {
    uTime: U.uTime, uRes: { value: new THREE.Vector2(1, 1) }, uDpr: { value: 1 }, uSteady: { value: reduced() ? 1 : 0 },
    uSootS: U.uSootS, uSootK: U.uSootK, uG: { value: G }, uShedCut: { value: 1e9 }, uRamp: { value: RAMPS.map(c => new THREE.Vector3(...c)) }, uEmber: { value: new THREE.Vector3(...EMBER) },
  },
  transparent: true, depthWrite: false,
  blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor,
  blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor,
  vertexShader: /* glsl */`
  attribute vec4 aA, aB, aC, aD;
  uniform float uTime, uDpr, uSteady;
  uniform vec2 uRes;
  uniform vec3 uG, uRamp[${RAMPS.length}], uEmber;
  // The trail's shed embers burn out within two seconds of the hit.
  uniform float uShedCut;
  uniform vec4 uSootS;
  uniform float uSootK;
  ${HZFADE}
  // The light from P to the eye through the soot ball.
  float sootT(vec3 P) {
    if (uSootK < 0.001) return 1.0;
    vec3 rd = P - cameraPosition;
    float L = length(rd);
    rd /= L;
    vec3 oc = cameraPosition - uSootS.xyz;
    float b = dot(oc, rd), h = b * b - dot(oc, oc) + uSootS.w * uSootS.w;
    if (h <= 0.0) return 1.0;
    h = sqrt(h);
    return exp(-uSootK * max(min(-b + h, L) - max(-b - h, 0.0), 0.0) / uSootS.w);
  }
  varying vec3 vCol, vColT, vLWH;
  varying float vS, vY, vSpark, vSeed, vHalo;
  // A negative k marks a weightless star: drag only, no fall.
  vec3 starPos(vec3 p0, vec3 v0, float k, float t) {
    vec3 vt = k < 0.0 ? vec3(0.0) : uG / k;
    k = abs(k);
    return p0 + vt * t + (v0 - vt) * (1.0 - exp(-k * t)) / k;
  }
  float hash11(float x) { return fract(sin(x * 12.9898) * 43758.5453); }
  vec3 path(float t) { return starPos(aA.xyz, aB.xyz, aB.w, t); }
  vec2 scr(vec3 p, out vec4 clip) { clip = projectionMatrix * viewMatrix * vec4(p, 1.0); return clip.xy / clip.w * 0.5 * uRes; }
  void main() {
    float age = uTime - aA.w, life = aC.y;
    if (age < 0.0 || age > life) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
    float f = age / life, tr = min(aC.z, age);
    vec4 c0, c1, c2;
    vec3 ph = path(age);
    vec2 s0 = scr(path(age - tr), c0), s1 = scr(path(age - tr * 0.5), c1), s2 = scr(ph, c2);
    float L01 = length(s1 - s0), len = L01 + length(s2 - s1);
    // Kind 3, a burning piece, has no halo: a tight core and its trail.
    float w = aC.w * uDpr * (1.0 - 0.5 * f), W = w * (aD.x > 2.5 ? 1.2 : 2.4);
    vHalo = aD.x > 2.5 ? 0.0 : 1.0;
    int col = int(position.x + 0.5);
    vec4 c = col == 0 ? c0 : col == 1 ? c1 : c2;
    vec2 dir = col == 0 ? s1 - s0 : col == 1 ? s2 - s0 : s2 - s1;
    dir = length(dir) > 1e-3 ? normalize(dir) : vec2(0.0, 1.0);
    float s = col == 0 ? -W : col == 1 ? L01 : len + W;
    vec2 off = vec2(-dir.y, dir.x) * position.y * W + dir * (col == 0 ? -W : col == 2 ? W : 0.0);
    c.xy += off / (0.5 * uRes) * c.w;
    gl_Position = c;
    vS = s; vY = position.y * W; vLWH = vec3(len, w, W); vSeed = aD.y;
    vec3 chem = uRamp[int(aC.x + 0.5)];
    if (aD.z > 0.5) chem = mix(chem, uRamp[int(aD.z - 0.5)], smoothstep(0.4, 0.55, f));
    float b = 1.0 - smoothstep(0.75, 1.0, f);
    // Only stars born before the cut burn out; later sand motes stay.
    if (aB.w < 0.0 && aA.w < uShedCut) b *= 1.0 - smoothstep(0.0, 2.0, uTime - uShedCut);
    // Burning pieces start orange; only sparks flash white first.
    vec3 col3 = aD.x > 2.5 ? chem : mix(vec3(1.0, 0.95, 0.85) * 1.6, chem, smoothstep(0.02, 0.12, f));
    col3 = mix(col3, uEmber * 0.5, smoothstep(0.6, 1.0, f));
    if (abs(aD.x - 1.0) < 0.5) b *= mix(step(0.45, hash11(aD.y + floor(age * 12.0))), 0.7, uSteady);
    if (abs(aD.x - 2.0) < 0.5) b *= 0.85 + 0.15 * hash11(aD.y + floor(age * 30.0));
    vCol = col3 * 4.0 * aD.w * b;
    vColT = mix(vCol, uEmber * 4.0 * aD.w * b * 0.5, 0.55);
    float sT = sootT(ph) * hzFade(ph);
    vCol *= sT; vColT *= sT;
    vSpark = abs(aD.x - 2.0) < 0.5 ? 0.8 : 0.25;
  }`,
  fragmentShader: /* glsl */`
  varying vec3 vCol, vColT, vLWH;
  varying float vS, vY, vSpark, vSeed, vHalo;
  void main() {
    float len = vLWH.x, W = vLWH.z;
    float w = max(vLWH.y, 0.8), dim = min(vLWH.y / 0.8, 1.0);
    float out_ = vS < 0.0 ? -vS : max(vS - len, 0.0);
    float d2 = (out_ * out_ + vY * vY) / (w * w);
    float core = max(exp(-d2 * 1.8) - 0.01, 0.0);
    float u = clamp(vS / max(len, 1.0), 0.0, 1.0);
    float trail = 0.05 + 0.95 * exp(-3.0 * (1.0 - u));
    float g = step(0.55, fract(sin(floor(vS / 3.0) * 12.9898 + vSeed) * 43758.5453));
    float sp = mix(1.0, 0.4 + 1.4 * g, vSpark * (1.0 - u));
    float dh2 = ((vS - len) * (vS - len) + vY * vY) / (W * W);
    float halo = 0.22 * exp(-dh2 * 3.0) * vHalo;
    vec3 c = mix(vColT, vCol, u) * core * trail * sp + vCol * halo;
    gl_FragColor = vec4(c * dim, 0.0);
  }`,
});
export const stars = new THREE.Mesh(starGeo, starMat);
stars.frustumCulled = false;
stars.renderOrder = BAND.sparks;
scene.add(stars);
let dirtyFrom = -1, dirtyN = 0; state.head = 0; state.lastDeath = 0;
// Write one star into the next slot; the oldest slot gives way.
export function writeStar(p0: THREE.Vector3Like, t0: number, v0: THREE.Vector3Like, k: number, ramp: number, life: number, trail: number, size: number, kind = 0, gain = 1, ramp2 = -1) {
  const i = state.head;
  state.head = (state.head + 1) % CAP;
  if (dirtyFrom < 0) dirtyFrom = i;
  dirtyN = Math.min(CAP, dirtyN + 1);
  aA.setXYZW(i, p0.x, p0.y, p0.z, t0);
  aBs.setXYZW(i, v0.x, v0.y, v0.z, k);
  aC.setXYZW(i, ramp, life, trail, size);
  aD.setXYZW(i, kind, rnd() * 100, ramp2 + 1, gain);
  starGeo.instanceCount = Math.max(starGeo.instanceCount, i + 1);
  state.lastDeath = Math.max(state.lastDeath, t0 + life);
}
// Upload only the slots written since the last draw.
// A wrap gives two ranges.
export function commitStars() {
  if (dirtyFrom < 0) return;
  const a = dirtyFrom, n = dirtyN, run = Math.min(n, CAP - a);
  for (const at of [aA, aBs, aC, aD]) {
    at.addUpdateRange(a * 4, run * 4);
    if (n > run) at.addUpdateRange(0, (n - run) * 4);
    at.needsUpdate = true;
  }
  dirtyFrom = -1; dirtyN = 0;
}
/* ---------- end K6 ---------- */
