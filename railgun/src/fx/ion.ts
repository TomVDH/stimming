// Load order: fx/bolt runs first.
import './bolt.ts';
import * as THREE from 'three';
import { linFit } from '../../../shared/stim.js';
import { MAX_ROUNDS } from '../../salvo.js';
import { state } from '../state.ts';
import { rnd, scene } from '../setup.ts';
import { U } from '../world/uniforms.ts';
import { HEAD } from '../sky/atmosphere.ts';
import { AIR } from '../sky/air.ts';
import { BAND } from '../clouds/bands.ts';
import { starMat } from './burst.ts';
import { bolt, boltMat, makeBoltGeo } from './bolt.ts';
import type { Round } from '../play/shot.ts';

/* ---------- the ion line: the bolt's path stays in the sky ---------- */
// It glows blue-white just behind the head, then cools to a contrail.
// The contrail widens, bends in the wind and fades over 25 seconds.
// uI: seconds since the slug left, flight time, power.
const ION_SEG = 64;
export const ionGeo = new THREE.BufferGeometry();
{
  const n = ION_SEG, pos = new Float32Array(n * 12), f = new Float32Array(n * 8), idx = [];
  for (let i = 0; i < n; i++) {
    const b = i * 4, f0 = i / n, f1 = (i + 1) / n;
    pos.set([0, -1, 0, 0, 1, 0, 1, -1, 0, 1, 1, 0], i * 12);
    f.set([f0, f1, f0, f1, f1, f0, f1, f0], i * 8);
    idx.push(b, b + 2, b + 3, b, b + 3, b + 1);
  }
  ionGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  ionGeo.setAttribute('aF', new THREE.BufferAttribute(f, 2));
  ionGeo.setIndex(idx);
}
export const ionMat = new THREE.ShaderMaterial({
  uniforms: {
    ...U, uRes: starMat.uniforms.uRes, uDpr: starMat.uniforms.uDpr,
    uA: { value: new THREE.Vector3() }, uB: { value: new THREE.Vector3() }, uI: { value: new THREE.Vector3() },
    // uK scales the trail's widths and wind in metres; far bolts use more.
    uK: { value: 1 },
    uIonC: { value: new THREE.Vector3(...linFit(0.88, 0.1, 230)) }, uConC: { value: new THREE.Vector3(...linFit(0.93, 0.008, 80)) },
  },
  transparent: true, depthWrite: false,
  blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
  blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor,
  vertexShader: /* glsl */`
  attribute vec2 aF;
  uniform vec3 uA, uB, uI;
  uniform vec2 uRes;
  uniform float uDpr, uK;
  varying float vY, vLa, vF;
  varying vec3 vP, vSide;
  // The slug leaves fast and slows: it reaches fraction f at this time.
  float reach(float f) { return uI.y * (1.0 - pow(max(1.0 - f, 0.0), 1.0 / 2.6)); }
  // The line at fraction f; la is the time since the head passed.
  vec3 at(float f, out float la) {
    f = min(f, 1.0 - pow(max(1.0 - uI.x / uI.y, 0.0), 2.6));
    la = max(uI.x - reach(f), 0.0);
    vec3 p = mix(uA, uB, f);
    // Wind drifts the old line, wavers it and sways it in long slow bends.
    p += uK * (vec3(12.0, 2.0, 3.5) * la + vec3(0.35, 0.05, 0.12) * la * la + vec3(sin(f * 23.0 + la * 0.3), 0.3 * sin(f * 41.0), cos(f * 17.0 - la * 0.2)) * 3.0 * la + vec3(sin(f * 9.0 + la * 0.8), 0.25 * sin(f * 14.0 - la * 0.6), cos(f * 7.0 + la * 0.7)) * 9.0 * la);
    return p;
  }
  void main() {
    float la, lb;
    vec3 p = at(aF.x, la), q = at(aF.y, lb);
    vec4 c0 = projectionMatrix * viewMatrix * vec4(p, 1.0), c1 = projectionMatrix * viewMatrix * vec4(q, 1.0);
    // An end vertex looks back to its start, so its direction flips.
    vec2 d = (c1.xy / c1.w - c0.xy / c0.w) * uRes * (position.x < 0.5 ? 1.0 : -1.0);
    d = length(d) > 1e-3 ? normalize(d) : vec2(0.0, 1.0);
    // The width is in metres, with a floor in pixels.
    float ppm = 0.5 * uRes.y * projectionMatrix[1][1] / max(c0.w, 1.0);
    // The trail swells and thins in puffs along its length.
    float puff = 0.65 + 0.35 * sin(aF.x * 173.0 + la * 0.15) * sin(aF.x * 67.0 - la * 0.09) + 0.25 * sin(aF.x * 431.0);
    float W = clamp(uK * (10.0 + 25.0 * la) * puff * ppm, 1.6 * uDpr, 60.0 * uDpr);
    // A short segment on screen gets a narrow ribbon, so it never fans.
    W = min(W, max(2.5 * length((c1.xy / c1.w - c0.xy / c0.w) * 0.5 * uRes), 1.6 * uDpr));
    c0.xy += vec2(-d.y, d.x) * position.y * W / (0.5 * uRes) * c0.w;
    vY = position.y; vLa = la; vF = aF.x; vP = p;
    // The ribbon's sideways direction in the world, for tube lighting.
    vSide = normalize(cross(q - p, cameraPosition - p) + vec3(1e-6));
    gl_Position = c0;
  }`,
  fragmentShader: /* glsl */`
  uniform vec3 uI, uIonC, uConC;
  varying float vY, vLa, vF;
  varying vec3 vP, vSide;
  ${HEAD}
  ${AIR}
  void main() {
    float n = abs(vY), core = exp(-n * n * 5.0);
    float k = 0.6 + 0.4 * uI.z;
    // Far up toward the rock the line dies out, as the slug does.
    vec3 em = uIonC * exp(-vLa / 0.35) * core * 4.0 * k * (1.0 - smoothstep(0.6, 0.85, vF));
    // A round trail: thick through its middle, with puffy, broken edges.
    float depth = sqrt(max(1.0 - n * n, 0.0));
    float rag = k2fbm(vec2(vF * 220.0, vY * 1.6 + vLa * 0.2));
    float body = smoothstep(0.15, 0.55, depth * 0.75 + rag * 0.5 - 0.1);
    float a = smoothstep(0.1, 1.0, vLa) * exp(-vLa / 20.0) * (1.0 - smoothstep(18.0, 26.0, vLa)) * body * 0.85 * k;
    // Light a tube: its normal turns from the side toward the eye.
    vec3 V = normalize(cameraPosition - vP), N = normalize(vSide * vY + V * depth);
    float sunK = 0.35 + 0.65 * max(dot(N, uSun), 0.0);
    vec3 lit = uConC * (ambient(N) * 0.9 + uSunC * 1.5 * sunK) * (0.75 + 0.35 * rag);
    // The blast lights the line's far end.
    vec3 b = uBlast.xyz - vP;
    lit += uAstC * uBlast.w * 2.0e7 / (dot(b, b) + 4.0e6);
    // The line takes half the air, so it holds against the haze.
    // The puffs below carry the contrail; the ribbon keeps the hot glow.
    gl_FragColor = vec4(em, 0.0);
  }`,
});
const ionLine = new THREE.Mesh(ionGeo, ionMat);
ionLine.frustumCulled = false; ionLine.renderOrder = BAND.ion; ionLine.visible = false;
scene.add(ionLine);
// The contrail: a chain of lit puffs, round from any angle.
// Puffs crowd near the muzzle, where the line is closest.
const ION_PUFFS = 160;
// three types copy() for an instanced source; any geometry works.
export const ionPuffGeo = new THREE.InstancedBufferGeometry().copy(new THREE.PlaneGeometry(2, 2) as THREE.BufferGeometry as THREE.InstancedBufferGeometry);
{
  const a = new Float32Array(ION_PUFFS * 2);
  for (let i = 0; i < ION_PUFFS; i++) a.set([Math.pow((i + 0.5) / ION_PUFFS, 1.6), rnd() * 50], i * 2);
  ionPuffGeo.setAttribute('aF', new THREE.InstancedBufferAttribute(a, 2));
  ionPuffGeo.instanceCount = ION_PUFFS;
}
export const ionPuffs = new THREE.Mesh(ionPuffGeo, new THREE.ShaderMaterial({
  uniforms: { ...U, uA: ionMat.uniforms.uA, uB: ionMat.uniforms.uB, uI: ionMat.uniforms.uI, uK: ionMat.uniforms.uK, uAer: { value: 0 }, uConC: ionMat.uniforms.uConC, uRes: starMat.uniforms.uRes, uDpr: starMat.uniforms.uDpr },
  transparent: true, depthWrite: false,
  blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
  blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor,
  vertexShader: /* glsl */`
  attribute vec2 aF;
  uniform vec3 uA, uB, uI;
  uniform vec2 uRes;
  uniform float uDpr, uK;
  varying vec2 vUv;
  varying float vLa, vSeed, vFr;
  varying vec3 vP, vR, vU;
  void main() {
    // The slug reaches fraction f late on its slowing path.
    float f = aF.x, la = uI.x - uI.y * (1.0 - pow(max(1.0 - f, 0.0), 1.0 / 2.6));
    if (la < 0.15) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
    // The wind takes the trail, gathers pace and sways it.
    vec3 p = mix(uA, uB, f) + uK * (vec3(12.0, 2.0, 3.5) * la + vec3(0.35, 0.05, 0.12) * la * la + vec3(sin(f * 23.0 + la * 0.3), 0.3 * sin(f * 41.0), cos(f * 17.0 - la * 0.2)) * 3.0 * la + vec3(sin(f * 9.0 + la * 0.8), 0.25 * sin(f * 14.0 - la * 0.6), cos(f * 7.0 + la * 0.7)) * 9.0 * la);
    // Each puff swells with age, some more than others.
    float r = uK * (8.0 + 14.0 * la) * (0.7 + 0.6 * fract(aF.y * 7.31));
    // A cap in pixels keeps near puffs from flooding the screen.
    vec4 cc = projectionMatrix * viewMatrix * vec4(p, 1.0);
    float ppm = 0.5 * uRes.y * projectionMatrix[1][1] / max(cc.w, 1.0);
    r = min(r, 48.0 * uDpr / max(ppm, 1e-6));
    vR = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
    vU = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
    vP = p; vUv = position.xy; vLa = la; vSeed = aF.y; vFr = f;
    gl_Position = projectionMatrix * viewMatrix * vec4(p + (vR * position.x + vU * position.y) * r, 1.0);
  }`,
  fragmentShader: /* glsl */`
  uniform float uAer;
  uniform vec3 uI, uConC;
  varying vec2 vUv;
  varying float vLa, vSeed, vFr;
  varying vec3 vP, vR, vU;
  ${HEAD}
  ${AIR}
  void main() {
    float d = length(vUv);
    // Corners outside the disc cost nothing.
    if (d > 1.0) discard;
    float n = k2fbm(vUv * 1.7 + vSeed);
    float a = smoothstep(1.0, 0.35, d + (n - 0.5) * 0.7);
    // The oldest smoke, nearest the gun, thins first and goes by 10 s.
    a *= smoothstep(0.15, 1.2, vLa) * exp(-vLa / 6.0) * (1.0 - smoothstep(4.0, 10.0, vLa)) * 0.55 * (0.6 + 0.4 * uI.z);
    // Far up toward the rock the contrail thins out too.
    a *= 1.0 - smoothstep(0.6, 0.85, vFr);
    if (a < 0.004) discard;
    // Light each puff as a ball: the low sun warms one side.
    vec3 V = normalize(cameraPosition - vP), N = normalize(vR * vUv.x + vU * vUv.y + V * sqrt(max(1.0 - d * d, 0.0)));
    vec3 lit = uConC * (ambient(N) * 0.9 + uSunC * 1.5 * (0.3 + 0.7 * max(dot(N, uSun), 0.0))) * (0.8 + 0.3 * n);
    vec3 b = uBlast.xyz - vP;
    lit += uAstC * uBlast.w * 2.0e7 / (dot(b, b) + 4.0e6);
    // uAer 1 takes the full shared aerial perspective: far rounds use it.
    gl_FragColor = vec4((uAer > 0.5 ? aerial(lit, vP) : mix(lit, aerial(lit, vP), 0.5)) * a, a);
  }`,
}));
ionPuffs.frustumCulled = false; ionPuffs.renderOrder = BAND.ionPuffs; ionPuffs.visible = false;
scene.add(ionPuffs);
// Tracers: one ribbon and one ion trail per round in flight.
// Slot 0 is the first set; the copies share every uniform but their own.
// Every source sets both alpha factors, so neither is null.
export function matCopy(m: THREE.ShaderMaterial, own: Record<string, THREE.IUniform>) {
  return new THREE.ShaderMaterial({
    uniforms: { ...m.uniforms, ...own }, vertexShader: m.vertexShader, fragmentShader: m.fragmentShader, defines: { ...m.defines },
    transparent: m.transparent, depthWrite: m.depthWrite, depthTest: m.depthTest, side: m.side,
    blending: m.blending, blendSrc: m.blendSrc, blendDst: m.blendDst, blendSrcAlpha: m.blendSrcAlpha!, blendDstAlpha: m.blendDstAlpha!,
  });
}
// One slot's meshes and the round that holds it; null when free.
export interface TracerSet {
  bolt: THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial>;
  line: THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial>;
  puffs: THREE.Mesh<THREE.InstancedBufferGeometry, THREE.ShaderMaterial>;
  round: Round | null;
}
export const tracers: TracerSet[] = [{ bolt, line: ionLine, puffs: ionPuffs, round: null }];
for (let i = 1; i < MAX_ROUNDS; i++) {
  const own = { uA: { value: new THREE.Vector3() }, uB: { value: new THREE.Vector3() }, uI: { value: new THREE.Vector3() } };
  const t: TracerSet = {
    bolt: new THREE.Mesh(makeBoltGeo(), matCopy(boltMat, { uCore: { value: 3 }, uGain: { value: 6 } })),
    line: new THREE.Mesh(ionGeo, matCopy(ionMat, own)), puffs: new THREE.Mesh(ionPuffGeo, matCopy(ionPuffs.material, own)), round: null,
  };
  for (const k of ['bolt', 'line', 'puffs'] as const) { t[k].frustumCulled = false; t[k].renderOrder = tracers[0][k].renderOrder; t[k].visible = false; scene.add(t[k]); }
  tracers.push(t);
}
// Each slot's ion trail follows its round: hot behind the head, then a contrail.
export function updateIon() {
  for (const t of tracers) {
    const r = t.round;
    if (!r) { t.line.visible = t.puffs.visible = false; continue; }
    const a = state.simT - r.s0 - 0.3;
    t.line.material.uniforms.uI.value.set(a, r.T, Math.min(r.c, 1.25));
    // The hot ribbon only lives a second behind the head.
    t.line.visible = a > 0 && a < r.T + 1.5;
    t.puffs.visible = a > 0.15;
    // On rungs 2 and 3, later rounds draw no contrail puffs.
    if (r.j > 1 && state.rung >= 2) t.puffs.visible = false;
  }
}
