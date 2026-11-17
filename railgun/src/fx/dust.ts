// Load order: rock/fragments runs first.
import '../rock/fragments.ts';
import * as THREE from 'three';
import { linFit } from '../../../shared/stim.js';
import { state } from '../state.ts';
import { rnd, scene } from '../setup.ts';
import { U } from '../world/uniforms.ts';
import { HEAD } from '../sky/atmosphere.ts';
import { BAND } from '../clouds/bands.ts';

/* ---------- dust: puffs that lift off the plain ---------- */
// Alpha-blended billboards lit by the sun and the sky.
// A ring buffer holds the puffs.
const DUST_N = 1600;
// three types copy() for an instanced source; any geometry works.
export const dustGeo = new THREE.InstancedBufferGeometry().copy(new THREE.PlaneGeometry(2, 2) as THREE.BufferGeometry as THREE.InstancedBufferGeometry);
const dustSlot = (name: string, n: number) => {
  const a = new THREE.InstancedBufferAttribute(new Float32Array(DUST_N * n), n);
  a.setUsage(THREE.DynamicDrawUsage);
  dustGeo.setAttribute(name, a);
  return a;
};
// aD0: start, birth. aD1: velocity, life. aD2: size, seed.
const d0 = dustSlot('aD0', 4), d1 = dustSlot('aD1', 4), d2 = dustSlot('aD2', 2);
dustGeo.instanceCount = 0;
const DUST_C = linFit(0.68, 0.04, 65);
const dust = new THREE.Mesh(dustGeo, new THREE.ShaderMaterial({
  uniforms: { ...U, uDustC: { value: new THREE.Vector3(...DUST_C) } },
  transparent: true, depthWrite: false,
  blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
  blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor,
  vertexShader: /* glsl */`attribute vec4 aD0, aD1; attribute vec2 aD2; uniform float uTime;
  varying vec2 vUv; varying vec3 vC, vN; varying float vF, vSeed;
  void main() {
    float age = uTime - aD0.w, life = aD1.w;
    if (age < 0.0 || age > life) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
    float f = age / life;
    // The puff slows as it rises.
    // It swells to three times its size.
    vec3 C = aD0.xyz + aD1.xyz * age * (1.0 - 0.45 * f) + vec3(0.0, 0.6 * age, 0.0);
    float size = aD2.x * (0.4 + 2.0 * f);
    vec3 right = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
    vec3 up = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
    vec3 P = C + (right * position.x + up * position.y) * size;
    vUv = position.xy; vC = C; vF = f; vSeed = aD2.y;
    // A round puff: each pixel has a normal on a sphere facing the eye.
    vec3 back = normalize(cameraPosition - C);
    vN = normalize(right * position.x + up * position.y + back * 0.7);
    gl_Position = projectionMatrix * viewMatrix * vec4(P, 1.0);
  }`,
  fragmentShader: /* glsl */`uniform vec3 uDustC; uniform float uTime;
  varying vec2 vUv; varying vec3 vC, vN; varying float vF, vSeed; ${HEAD}
  void main() {
    float d = length(vUv);
    float n = k2fbm(vUv * 1.8 + vSeed + vec2(uTime * 0.05, -uTime * 0.03));
    float a = smoothstep(1.0, 0.25, d + (n - 0.5) * 0.9) * smoothstep(1.0, 0.7, d) * 0.5 * pow(max(sin(3.14159 * vF), 0.0), 0.7);
    if (a < 0.003) discard;
    float steam = step(1000.0, vSeed);
    // The sun side of the puff is lit; the far side takes the sky.
    vec3 col = mix(uDustC, vec3(0.92, 0.93, 0.95), steam) * (0.7 + 0.6 * n) * (ambient(vN) + sunLight(normalize(vN + vec3(0.0, 0.3, 0.0))) * 0.9 + blastLight(vC));
    // Steam scatters the low sun; it glows against the haze.
    col += steam * vec3(0.92) * uSunC * 0.9;
    a *= 1.0 - 0.45 * steam;
    col = mix(col, k2hazeColor(normalize(vC - cameraPosition)), k2hazeAmount(vC));
    gl_FragColor = vec4(col * a, a);
  }`,
}));
dust.frustumCulled = false;
dust.renderOrder = BAND.dust;
scene.add(dust);
let dustDirty = false; state.dustHead = 0; state.dustEnd = 0;
// Steam puffs carry a seed past 1000; they draw white and thin.
export function puff(p: THREE.Vector3Like, v: THREE.Vector3Like, life: number, size: number, steam = false) {
  const i = state.dustHead;
  state.dustHead = (state.dustHead + 1) % DUST_N;
  d0.setXYZW(i, p.x, p.y, p.z, state.simT);
  d1.setXYZW(i, v.x, v.y, v.z, life);
  d2.setXY(i, size, rnd() * 100 + (steam ? 1000 : 0));
  dustGeo.instanceCount = Math.max(dustGeo.instanceCount, i + 1);
  state.dustEnd = Math.max(state.dustEnd, state.simT + life);
  dustDirty = true;
}
export function updateDust() {
  if (!dustDirty) return;
  d0.needsUpdate = d1.needsUpdate = d2.needsUpdate = true;
  dustDirty = false;
}
/* ---------- end dust ---------- */
