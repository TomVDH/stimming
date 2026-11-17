// @ts-nocheck
// Load order: gun/flap runs first.
import './flap.ts';
import * as THREE from 'three';
import { linFit } from '../../../shared/stim.js';
import { state } from '../state.ts';
import { scene } from '../setup.ts';
import { barrelPt } from '../world/axis.ts';
import { U } from '../world/uniforms.ts';
import { BAND } from '../clouds/bands.ts';
import { VF } from './gun.ts';
import { sight, tgtP } from '../view/camera.ts';
import { laserGain } from '../play/charge.ts';
import { tgtLive, tgtPos, tgtR } from '../play/shot.ts';

/* ---------- the ranging laser: optic to rock ---------- */
// A near-infrared rangefinder: the eye sees only a faint shimmer near the optic.
// The sight's image tube sees the beam and its spot; sightKey draws them.
// The beam is a ribbon a few pixels wide, built in screen space.
// aE: 0 at the emitter, 1 at the rock. aS: the side, -1 or 1.
const laserGeo = new THREE.BufferGeometry()
  .setAttribute('position', new THREE.BufferAttribute(new Float32Array(12), 3))
  .setAttribute('aE', new THREE.BufferAttribute(new Float32Array([0, 0, 1, 1]), 1))
  .setAttribute('aS', new THREE.BufferAttribute(new Float32Array([-1, 1, -1, 1]), 1))
  .setIndex([0, 2, 1, 1, 2, 3]);
const laserMat = new THREE.ShaderMaterial({
  uniforms: { uGain: { value: 0 }, uTime: U.uTime, uA: { value: new THREE.Vector3() }, uB: { value: new THREE.Vector3() }, uW: { value: 2.2 }, uRes: { value: new THREE.Vector2(1, 1) }, uC: { value: new THREE.Vector3(...linFit(0.9, 0.05, 300)) } },
  transparent: true, depthWrite: false, side: THREE.DoubleSide,
  blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor,
  blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor,
  vertexShader: /* glsl */`attribute float aE, aS; uniform vec3 uA, uB; uniform float uW; uniform vec2 uRes;
  varying float vK, vS;
  void main() {
    vec4 a = projectionMatrix * viewMatrix * vec4(uA, 1.0), b = projectionMatrix * viewMatrix * vec4(uB, 1.0);
    vec2 d = normalize((b.xy / b.w - a.xy / a.w) * uRes);
    vec4 p = mix(a, b, aE);
    // The ribbon's width holds in pixels at any range.
    p.xy += vec2(-d.y, d.x) * aS * uW / uRes * p.w;
    vK = 1.0 - aE; vS = aS;
    gl_Position = p;
  }`,
  fragmentShader: /* glsl */`uniform float uGain, uTime; uniform vec3 uC; varying float vK, vS;
  void main() {
    // The air scatters a thin thread all the way out; the hot air by the optic most.
    float near_ = 0.3 + 0.7 * pow(vK, 8.0);
    // The heat haze makes it shimmer in moving knots.
    float sh = 0.7 + 0.3 * sin(uTime * 31.0 + vK * 900.0) * sin(uTime * 17.0 - vK * 340.0);
    float k = near_ * sh * (1.0 - vS * vS);
    gl_FragColor = vec4(uC * uGain * k, 0.0);
  }`,
});
export const laser = new THREE.Mesh(laserGeo, laserMat);
laser.frustumCulled = false; laser.renderOrder = BAND.lights; laser.visible = false;
scene.add(laser);
export const lzA = new THREE.Vector3(), lzB = new THREE.Vector3(), lzD = new THREE.Vector3();
export function updateLaser() {
  const g = laserGain();
  // The sight draws the beam in its own key; the scene's beam stays dark there.
  laser.visible = g > 0 && !sight;
  if (g <= 0) return;
  // The emitter sits on the optic's nose, left of and over the sight's lens.
  // The offset lets the sight see the beam, not a point.
  barrelPt(VF.a + 40, VF.x - 8, VF.u + 6, lzA);
  // A broken ship leaves an empty slot.
  // The beam runs down the bore.
  const live = tgtLive();
  if (live) tgtPos(tgtP);
  else barrelPt(60000, 0, 0, tgtP).sub(barrelPt(0, 0, 0, lzD)).add(lzA);
  if (live) lzB.copy(tgtP).addScaledVector(lzD.subVectors(lzA, tgtP).normalize(), tgtR() * 0.95);
  else lzB.copy(tgtP);
  const u = laserMat.uniforms;
  u.uA.value.copy(lzA); u.uB.value.copy(lzB);
  u.uRes.value.set(state.size.w, state.size.h);
  // The eye sees no spot on the rock: it is too far out.
  u.uGain.value = g * 3.0;
}
