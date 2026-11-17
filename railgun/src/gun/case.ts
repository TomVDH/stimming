// Load order: gun/gun runs first.
import './gun.ts';
import * as THREE from 'three';
import { reduced } from '../../../shared/stim.js';
import { state } from '../state.ts';
import { rnd, scene } from '../setup.ts';
import { AX, AX_UP, barrelPt, yUp } from '../world/axis.ts';
import { U } from '../world/uniforms.ts';
import { HEAD } from '../sky/atmosphere.ts';
import { GROUND_C } from '../world/ground.ts';
import { PBR } from './gun.ts';
import { FLAP } from './flap.ts';
import { bq } from '../play/shot.ts';

/* ---------- the spent case: thrown from the breech before the gun parks ---------- */
// A brass case, 64 m long; it lies where it lands until Reset.
const CASE_GEO = new THREE.LatheGeometry([[0, 0], [13.5, 0], [13.5, 2.5], [12, 3.6], [12, 52], [10, 57], [10, 64], [8.6, 64], [8.6, 60]].map(([x, y]) => new THREE.Vector2(x, y - 32)), 28);
export const caseMat = new THREE.ShaderMaterial({
  uniforms: { ...U, uCaseHeat: { value: 0 }, uBrass: { value: new THREE.Vector3(0.8, 0.6, 0.3) }, uGroundC: { value: new THREE.Vector3(...GROUND_C) } },
  vertexShader: /* glsl */`varying vec3 vP, vN, vO;
  void main() { vO = position; vP = (modelMatrix * vec4(position, 1.0)).xyz; vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * viewMatrix * vec4(vP, 1.0); }`,
  fragmentShader: /* glsl */`varying vec3 vP, vN, vO;
  uniform vec3 uBrass; uniform float uCaseHeat;
  ${HEAD}
  ${PBR}
  void main() {
    vec3 N = normalize(vN), V = normalize(cameraPosition - vP);
    // Brass is metal at the base; soot turns the mouth to a rough dielectric.
    float tarn = k3fbm(vO * 0.08), soot = smoothstep(14.0, 32.0, vO.y + 6.0 * tarn);
    float metal = 1.0 - soot, rough = mix(0.32 + 0.2 * tarn, 0.85, soot);
    vec3 alb = vec3(0.03, 0.028, 0.025);
    vec3 F0 = mix(vec3(0.04), uBrass * (0.8 + 0.3 * tarn), metal);
    float vis = sunVis(vP);
    vec3 col = pbrLight(alb, metal, rough, F0, N, V, uSun, uSunC * 2.4 * vis) + pbrSky(alb, metal, rough, F0, N, V, 1.0);
    col += (keyLight(N) + blastLight(vP)) * (alb * (1.0 - metal) + F0 * metal * 0.5);
    // A dull red glow at the base fades in a few seconds.
    col += vec3(0.8, 0.12, 0.02) * uCaseHeat * uCaseHeat * 0.6 * (1.0 - soot);
    gl_FragColor = vec4(k2haze(col, vP), 1.0);
  }`,
});
export const caseMesh = new THREE.Mesh(CASE_GEO, caseMat);
caseMesh.visible = false;
scene.add(caseMesh);
// p, v: place and speed. w: spin axis times rate. lt: landing time.
state.spent = null;
// Real gravity: at this size a true fall reads as weight.
// The case is 64 m long: stylised gravity, as the debris has, reads as weight.
const CASE_G = 38;
export function ejectCase() {
  if (reduced()) return;
  // The case leaves the housing's flank, back and up, toward the eye's side.
  // A heavy case leaves slowly and turns slowly: a shove, not a flick.
  // It leaves through the flap's port.
  const p = barrelPt(FLAP.a, FLAP.x + 3, FLAP.u - FLAP.h / 2, new THREE.Vector3());
  const side = new THREE.Vector3(state.CY, 0, -state.SY), back = AX.clone().negate();
  const v = side.multiplyScalar(150 + 25 * rnd()).addScaledVector(back, 70 + 10 * rnd()).addScaledVector(AX_UP, 95);
  const w = new THREE.Vector3(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).normalize().multiplyScalar(1.1 + 0.5 * rnd());
  caseMesh.quaternion.setFromUnitVectors(yUp, AX).multiply(new THREE.Quaternion().setFromAxisAngle(yUp, rnd() * 6));
  state.spent = { t0: state.simT, p, v, w, lt: -1, bounce: 0 };
  caseMesh.position.copy(p); caseMesh.visible = true;
  caseMat.uniforms.uCaseHeat.value = 1;
}
const spinQ = new THREE.Quaternion();
export function stepCase(dt: number) {
  if (!state.spent) return;
  const s = state.spent, u = caseMat.uniforms;
  u.uCaseHeat.value *= Math.exp(-dt / 3);
  if (s.lt >= 0 && s.bounce >= 2) return;
  s.v.y -= CASE_G * dt;
  s.p.addScaledVector(s.v, dt);
  spinQ.setFromAxisAngle(bq.copy(s.w).normalize(), s.w.length() * dt);
  caseMesh.quaternion.premultiply(spinQ);
  // The case hits the plain: a burst of dust, a low, dead hop, no jolt.
  // A heavy case keeps little of its speed and almost no spin.
  if (s.p.y < 13.5) {
    s.p.y = 13.5;
    if (s.lt < 0) { s.lt = state.simT; state.caseDust = { t0: state.simT, P: s.p.clone() }; }
    s.bounce++;
    s.v.multiplyScalar(0.22); s.v.y = s.bounce < 2 ? 14 : 0;
    s.w.multiplyScalar(0.15);
    // At rest it lies on its side.
    if (s.bounce >= 2) {
      const ax = bq.set(0, 1, 0).applyQuaternion(caseMesh.quaternion);
      ax.y = 0; ax.normalize();
      caseMesh.quaternion.setFromUnitVectors(yUp, ax);
    }
  }
  caseMesh.position.copy(s.p);
}
