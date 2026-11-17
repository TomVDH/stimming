// @ts-nocheck
// Load order: gun/vents runs first.
import './vents.ts';
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { linFit, reduced } from '../../../shared/stim.js';
import { state } from '../state.ts';
import { rad, scene } from '../setup.ts';
import { barrelPt } from '../world/axis.ts';
import { U } from '../world/uniforms.ts';
import { HEAD } from '../sky/atmosphere.ts';
import { DARK_C } from './gun.ts';
import { arcFrame, arcO, arcSide, arcUp } from './arcs.ts';
import { charge } from '../play/charge.ts';

/* ---------- the ejector flap: it swings open as the case leaves ---------- */
// The flap hangs from its top edge over a hot port in the housing's flank.
export const FLAP = { a: -195, x: 64.5, u: 56, len: 96, h: 44 };
const flapMat = new THREE.ShaderMaterial({
  uniforms: { ...U, uAlb: { value: new THREE.Vector3(...DARK_C) }, uGlow: { value: 0 } },
  vertexShader: /* glsl */`varying vec3 vP, vN;
  void main() { vec4 w = modelMatrix * vec4(position, 1.0); vP = w.xyz; vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * viewMatrix * w; }`,
  fragmentShader: /* glsl */`varying vec3 vP, vN;
  uniform vec3 uAlb; uniform float uGlow;
  ${HEAD}
  void main() {
    vec3 N = normalize(vN);
    float nl = max(dot(N, uSun), 0.0);
    vec3 amb = mix(uHorC * 0.25, mix(uHorC, uZenC, 0.75) * 0.6, N.y * 0.5 + 0.5);
    vec3 col = uAlb * (amb + uSunC * 2.8 * nl * sunVis(vP) + keyLight(N) + blastLight(vP) * 0.3) + vec3(1.0, 0.33, 0.07) * uGlow;
    gl_FragColor = vec4(k2haze(col, vP), 1.0);
  }`,
});
const portMat = flapMat.clone();
portMat.uniforms = { ...flapMat.uniforms, uAlb: { value: new THREE.Vector3(0.008, 0.008, 0.009) }, uGlow: { value: 0 } };
export const flapMesh = new THREE.Mesh(new THREE.BoxGeometry(FLAP.len, FLAP.h, 3).translate(0, -FLAP.h / 2, 1.5), flapMat);
// The port is a dark recess 3 m deep behind a thin frame.
export const portMesh = new THREE.Mesh(new THREE.BoxGeometry(FLAP.len - 6, FLAP.h - 4, 1).translate(0, -FLAP.h / 2, -3), portMat);
export const frameMesh = new THREE.Mesh(mergeGeometries([
  new THREE.BoxGeometry(FLAP.len, 3, 3).translate(0, -1.5, -0.5), new THREE.BoxGeometry(FLAP.len, 3, 3).translate(0, -FLAP.h + 1.5, -0.5),
  new THREE.BoxGeometry(3, FLAP.h, 3).translate(-FLAP.len / 2 + 1.5, -FLAP.h / 2, -0.5), new THREE.BoxGeometry(3, FLAP.h, 3).translate(FLAP.len / 2 - 1.5, -FLAP.h / 2, -0.5),
]), flapMat);
for (const m of [flapMesh, portMesh, frameMesh]) { m.matrixAutoUpdate = false; m.frustumCulled = false; scene.add(m); }
const flapM = new THREE.Matrix4(), flapR = new THREE.Matrix4(), flapH = new THREE.Vector3(), flapA = new THREE.Vector3();
let flapAng = 0;
// Open: a fast swing with a small overshoot. Close: a slow fall back.
function flapAt(t, open, shut) {
  if (t < open) return 0;
  if (t < shut) { const s = t - open; return rad(105) * (1 - Math.exp(-s / 0.07) * Math.cos(s * 9)); }
  return rad(105) * Math.max(0, 1 - THREE.MathUtils.smoothstep(t - shut, 0, 0.7));
}
// The charge gauge: ten small lamps on the near flank, under the flap.
// They fill a dim amber with the charge, hold steady at full,
// and blink a dull rose through the over-hold. Too faint to bloom.
const GAUGE_N = 10;
const gaugeGeo = (() => {
  const parts = [];
  for (let i = 0; i < GAUGE_N; i++) {
    const g = new THREE.BoxGeometry(5.5, 3, 1.2).translate(-40 + i * 8.4, -FLAP.h - 9, 0.6);
    g.setAttribute('aI', new THREE.Float32BufferAttribute(new Array(g.attributes.position.count).fill(i), 1));
    parts.push(g);
  }
  return mergeGeometries(parts);
})();
const gaugeMat = new THREE.ShaderMaterial({
  uniforms: { ...U, uLevel: { value: 0 }, uAmber: { value: new THREE.Vector3(...linFit(0.78, 0.14, 70)) }, uRose: { value: new THREE.Vector3(...linFit(0.65, 0.14, 15)) } },
  vertexShader: /* glsl */`attribute float aI; varying vec3 vP, vN; varying float vI;
  void main() { vI = aI; vec4 w = modelMatrix * vec4(position, 1.0); vP = w.xyz; vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * viewMatrix * w; }`,
  fragmentShader: /* glsl */`varying vec3 vP, vN; varying float vI;
  uniform float uLevel, uOver, uTime; uniform vec3 uAmber, uRose;
  ${HEAD}
  void main() {
    vec3 N = normalize(vN);
    // Dark glass when off.
    vec3 col = vec3(0.02) * (mix(uHorC * 0.25, mix(uHorC, uZenC, 0.75) * 0.6, N.y * 0.5 + 0.5) + uSunC * 2.8 * max(dot(N, uSun), 0.0));
    float lit = smoothstep(vI / 10.0, vI / 10.0 + 0.04, uLevel);
    float blink = uOver > 0.01 ? 0.45 + 0.55 * step(0.5, fract(uTime * 3.0)) : 1.0;
    col += mix(uAmber, uRose, smoothstep(0.0, 0.3, uOver)) * 1.1 * lit * blink;
    gl_FragColor = vec4(k2haze(col, vP), 1.0);
  }`,
});
const gaugeMesh = new THREE.Mesh(gaugeGeo, gaugeMat);
gaugeMesh.matrixAutoUpdate = false; gaugeMesh.frustumCulled = false;
scene.add(gaugeMesh);
export function updateFlap() {
  flapAng = 0;
  if (state.shot) {
    const t = state.simT - state.shot.t0, open = state.shot.vented ? state.shot.ventT + 0.7 : 1e9, shut = open + 2.1;
    flapAng = reduced() ? (t > open && t < shut ? rad(105) : 0) : flapAt(t, open, shut);
  }
  arcFrame(FLAP.a);
  barrelPt(FLAP.a, FLAP.x, FLAP.u, flapH);
  barrelPt(FLAP.a + 1, 0, 0, flapA).sub(arcO).normalize();
  flapM.makeBasis(flapA, arcUp, arcSide).setPosition(flapH);
  for (const m of [portMesh, frameMesh, gaugeMesh]) { m.matrix.copy(flapM); m.matrixWorld.copy(flapM); }
  gaugeMat.uniforms.uLevel.value = reduced() ? 0 : charge ? Math.min(1, charge.c) : 0;
  // The bottom edge swings out, away from the housing.
  flapR.makeRotationX(-flapAng);
  flapMesh.matrix.multiplyMatrices(flapM, flapR); flapMesh.matrixWorld.copy(flapMesh.matrix);
}
