// Load order: gun/muzzle runs first.
import './muzzle.ts';
import * as THREE from 'three';
import { linFit } from '../../../shared/stim.js';
import { state } from '../state.ts';
import { rnd, scene } from '../setup.ts';
import { A0, AX, L, barrelPt } from '../world/axis.ts';
import { U } from '../world/uniforms.ts';
import { BAND } from '../clouds/bands.ts';
import { starMat } from '../fx/burst.ts';
import { arcFrame, arcSide, arcUp } from './arcs.ts';
import { HOLD, charge } from '../play/charge.ts';
import { bp } from '../play/shot.ts';

/* ---------- field motes: dust that falls into orbit round the barrel ---------- */
// The charged barrel pulls like a line mass: a 1/r force toward its axis.
// Each mote falls in on a precessing orbit, a little drag spirals it inward,
// and the field's gradient draws it along toward the muzzle.
// The CPU steps them on the sim clock; they draw as Galaxy's soft dots.
const MOTE_N = 2400;
const moteGeo = new THREE.BufferGeometry();
const motePos = new THREE.BufferAttribute(new Float32Array(MOTE_N * 3), 3);
motePos.setUsage(THREE.DynamicDrawUsage);
moteGeo.setAttribute('position', motePos);
// aT: birth, life, seed, spare.
const moteT = new THREE.BufferAttribute(new Float32Array(MOTE_N * 4), 4);
moteT.setUsage(THREE.DynamicDrawUsage);
moteGeo.setAttribute('aT', moteT);
moteGeo.setDrawRange(0, 0);
const moteV = new Float32Array(MOTE_N * 3);
const moteMat = new THREE.ShaderMaterial({
  uniforms: { uTime: U.uTime, uDpr: starMat.uniforms.uDpr, uAx0: { value: new THREE.Vector3() }, uAxD: { value: new THREE.Vector3(0, 0, -1) }, uSunC: U.uSunC, uIce: { value: new THREE.Vector3(...linFit(0.93, 0.06, 230)) }, uDust: { value: new THREE.Vector3(...linFit(0.86, 0.06, 70)) } },
  transparent: true, depthWrite: false,
  blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor,
  blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor,
  vertexShader: /* glsl */`
  attribute vec4 aT;
  uniform float uTime, uDpr;
  uniform vec3 uAx0, uAxD, uDust, uSunC, uIce;
  varying vec3 vCol;
  float h1(float x) { return fract(sin(x * 12.9898) * 43758.5453); }
  void main() {
    float t = uTime - aT.x, life = aT.y;
    if (t < 0.0 || t > life) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); gl_PointSize = 0.0; vCol = vec3(0.0); return; }
    gl_Position = projectionMatrix * viewMatrix * vec4(position, 1.0);
    float seed = aT.z, lum = h1(seed + 7.0);
    // Births pop: one in eight flashes and swells, then settles.
    float pop = step(0.875, h1(seed + 31.0)) * exp(-t * 5.0);
    float vis = smoothstep(0.0, 0.3, t) * (1.0 - smoothstep(life - 1.2, life, t));
    gl_PointSize = uDpr * (2.2 + 2.0 * pow(lum, 6.0)) * (1.0 + 2.0 * pop);
    // Sunlit dust far out; ionised ice-white close to the bore.
    vec3 d = position - uAx0;
    float r = length(d - uAxD * dot(d, uAxD));
    vCol = mix(uDust * uSunC * 0.7, uIce * 2.6, 1.0 - smoothstep(40.0, 220.0, r)) * (0.5 + 2.8 * pow(lum, 5.0)) * (1.0 + 6.0 * pop) * vis;
  }`,
  fragmentShader: /* glsl */`
  varying vec3 vCol;
  void main() {
    float d = length(gl_PointCoord - 0.5) * 2.0, a = max(1.0 - d, 0.0);
    gl_FragColor = vec4(vCol * a * a, 0.0);
  }`,
});
const motes = new THREE.Points(moteGeo, moteMat);
motes.frustumCulled = false; motes.renderOrder = BAND.sparks;
scene.add(motes);
export let moteHead = 0, moteEnd = 0, moteN = 0;
const moteE = new THREE.Vector3(), moteF = new THREE.Vector3();
export function spawnMote(k: number) {
  const i = moteHead, a = 180 + rnd() * (L - 220);
  moteHead = (moteHead + 1) % MOTE_N;
  moteN = Math.max(moteN, i + 1);
  arcFrame(a);
  // Born out on a ring round the barrel, moving mostly sideways: it falls into orbit.
  const th = rnd() * Math.PI * 2, r0 = 120 + 280 * rnd();
  moteE.copy(arcSide).multiplyScalar(Math.cos(th)).addScaledVector(arcUp, Math.sin(th));
  barrelPt(a, 0, 0, bp).addScaledVector(moteE, r0);
  moteF.crossVectors(AX, moteE).multiplyScalar((rnd() < 0.5 ? -1 : 1) * Math.sqrt(moteG(k)) * (0.5 + 0.5 * rnd())).addScaledVector(moteE, -20 * rnd());
  motePos.setXYZ(i, bp.x, bp.y, bp.z);
  moteV.set([moteF.x, moteF.y, moteF.z], i * 3);
  const life = 4 + 4 * rnd();
  moteT.setXYZW(i, state.simT, life, rnd() * 100, 0);
  moteEnd = Math.max(moteEnd, state.simT + life);
  moteGeo.setDrawRange(0, moteN);
  moteT.needsUpdate = true;
}
// The pull grows with the charge: orbits run at about 60 to 160 m/s.
const moteG = (k: number) => 3600 + 22000 * k;
// Semi-implicit Euler in substeps of at most 1/60 s.
export function stepMotes(dt: number) {
  if (state.simT > moteEnd || !moteN || dt <= 0) return;
  const k = Math.min(1, U.uCharge.value), P = motePos.array, T = moteT.array;
  // At full power the field collapses: the pull grows, the orbits lose their spin,
  // and every mote falls into the barrel and goes out.
  const held = charge ? state.simT - charge.t0 : 0, ck = THREE.MathUtils.smoothstep(held, HOLD.full - 0.4, HOLD.full + 0.8);
  const G = moteG(k) * (1 + 9 * ck), pull = (6 + 34 * k) * (1 + 2 * ck);
  const ox = A0.x, oy = A0.y, oz = A0.z, ax = AX.x, ay = AX.y, az = AX.z;
  for (let h = dt; h > 1e-6; h -= 1 / 60) {
    const st = Math.min(h, 1 / 60), drag = Math.exp(-0.12 * st);
    for (let i = 0; i < moteN; i++) {
      if (state.simT - T[i * 4] > T[i * 4 + 1]) continue;
      const j = i * 3;
      let dx = P[j] - ox, dy = P[j + 1] - oy, dz = P[j + 2] - oz;
      const s = dx * ax + dy * ay + dz * az, sc = Math.min(Math.max(s, 150), L + 60);
      dx -= ax * sc; dy -= ay * sc; dz -= az * sc;
      // Softened 1/r: g = G r / (r^2 + 30^2), toward the axis.
      const r2 = dx * dx + dy * dy + dz * dz, f = -G / (r2 + 900);
      let vx = moteV[j] + (dx * f + ax * pull) * st, vy = moteV[j + 1] + (dy * f + ay * pull) * st, vz = moteV[j + 2] + (dz * f + az * pull) * st;
      vx *= drag; vy *= drag; vz *= drag;
      if (ck > 0) {
        // The spin bleeds off, so the mote falls straight in.
        const ir = 1 / Math.sqrt(r2 + 1), rx = dx * ir, ry = dy * ir, rz = dz * ir, vr = vx * rx + vy * ry + vz * rz, va = vx * ax + vy * ay + vz * az;
        const keep = Math.exp(-st * 4 * ck);
        vx = rx * vr + ax * va + (vx - rx * vr - ax * va) * keep;
        vy = ry * vr + ay * va + (vy - ry * vr - ay * va) * keep;
        vz = rz * vr + az * va + (vz - rz * vr - az * va) * keep;
        // Inside the barrel's skin it is gone in a quarter second.
        if (r2 < 900) T[i * 4 + 1] = Math.min(T[i * 4 + 1], state.simT - T[i * 4] + 0.25);
      }
      moteV[j] = vx; moteV[j + 1] = vy; moteV[j + 2] = vz;
      P[j] += vx * st; P[j + 1] += vy * st; P[j + 2] += vz * st;
    }
  }
  motePos.needsUpdate = true;
  moteMat.uniforms.uAx0.value.copy(A0); moteMat.uniforms.uAxD.value.copy(AX);
}
// The shot hurls every live mote out along the bore; they fade in a breath.
export function flingMotes() {
  const T = moteT.array;
  for (let i = 0; i < moteN; i++) {
    const age = state.simT - T[i * 4];
    if (age < 0 || age > T[i * 4 + 1]) continue;
    const j = i * 3, v = 500 + 700 * rnd();
    moteV[j] += AX.x * v; moteV[j + 1] += AX.y * v; moteV[j + 2] += AX.z * v;
    T[i * 4 + 1] = Math.min(T[i * 4 + 1], age + 1.5);
  }
  moteT.needsUpdate = true;
}
