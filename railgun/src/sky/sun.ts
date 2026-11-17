// Load order: world/uniforms runs first.
import '../world/uniforms.ts';
import * as THREE from 'three';
import { reduced } from '../../../shared/stim.js';
import { state } from '../state.ts';
import { clamp, opts, rad, renderer } from '../setup.ts';
import { yUp } from '../world/axis.ts';
import { U } from '../world/uniforms.ts';
import { fitShadow } from '../world/shadows.ts';
import { draw } from '../view/render.ts';

/* ---------- sun: late light over a dusty plain ---------- */
// The low sun sits at the frame's right edge, ahead of the eye.
// It backlights the gun; shadows rake toward the eye.
// VIEW_AZ is the rest look's bearing.
// sunSwing turns the low sun right of it, in degrees.
const VIEW_AZ = rad(-155.6);
state.sunSwing = 36;
type RGB = THREE.Vector3Tuple;
const lerp3 = (a: readonly number[], b: readonly number[], t: number) => a.map((x, i) => x + (b[i] - x) * t) as RGB;
export const sstep = THREE.MathUtils.smoothstep;
export const lerp = THREE.MathUtils.lerp;
// The moon: cool and dim, high on the left.
const MOON_C = [0.09, 0.11, 0.16];

/* ---------- sky: one turn a day about a tilted pole ---------- */
// Latitude thirty degrees: the equinox sun stands sixty degrees up at noon.
// The sun rises ahead and right, crosses the sky ahead and left, sets behind.
const PHI = rad(30);
export const SKY = { E: new THREE.Vector3(), S: new THREE.Vector3(), P: new THREE.Vector3() };
const skyFrame = () => {
  SKY.S.crossVectors(yUp, SKY.E);
  SKY.P.copy(yUp).multiplyScalar(Math.sin(PHI)).addScaledVector(SKY.S, -Math.cos(PHI));
};
// A direction on the sky at hour angle H and declination d.
function skyDir(H: number, d: number, out: THREE.Vector3) {
  const cd = Math.cos(d), sd = Math.sin(d), cP = Math.cos(PHI), sP = Math.sin(PHI);
  out.copy(SKY.E).multiplyScalar(-Math.sin(H) * cd);
  out.addScaledVector(yUp, Math.cos(H) * cd * cP + sd * sP);
  return out.addScaledVector(SKY.S, Math.cos(H) * cd * sP - sd * cP);
}
// The morning hour angle where the sun stands deg degrees up.
const hourOf = (deg: number) => -Math.acos(clamp(Math.sin(rad(deg)) / Math.cos(PHI), -1, 1));
// Turn the frame so the dusk sun lands sw degrees right of the look.
export function aimSky(sw = state.sunSwing) {
  const az = VIEW_AZ - rad(sw);
  SKY.E.set(Math.sin(az), 0, Math.cos(az));
  skyFrame();
  const d = skyDir(hourOf(5.6), 0, new THREE.Vector3());
  SKY.E.applyAxisAngle(yUp, az - Math.atan2(d.x, d.z));
  skyFrame();
}
aimSky();
// The moon runs six hours behind the sun, low in the south.
// At night on the slider it stands high on the left.
const MOON_H = rad(93.5), MOON_DEC = rad(-33.7);
const skyRot = new THREE.Matrix4();
U.uSkyRot = { value: new THREE.Matrix3() };
// A fast Time drag smears the stars into short arcs.
// uSkyRot0 is the sky a moment ago; uTrailK is the arc's share.
U.uSkyRot0 = { value: new THREE.Matrix3() };
U.uTrailK = { value: 0 };
// span: the sky angle swept lately, in radians; it decays fast.
export const TRAIL_MAX = 0.04;
export const skyTrail = { H: null as number | null, span: 0 };
export const skyRot0 = new THREE.Matrix4();
export let skyH = 0;
// The sky frame stays put: no swing toward a high sun.
// The sky frame stays fixed: the sun and the moon run true arcs.
// Sun bearing alone turns the frame.
export function sun(deg: number) { aimSky(state.sunSwing); skyAt(hourOf(deg)); }
export function skyAt(H: number) {
  if (skyTrail.H !== null && !reduced()) skyTrail.span = clamp(skyTrail.span + H - skyTrail.H, -TRAIL_MAX, TRAIL_MAX);
  skyTrail.H = H;
  skyH = H;
  skyDir(H, 0, U.uSunD.value);
  const deg = THREE.MathUtils.radToDeg(Math.asin(clamp(U.uSunD.value.y, -1, 1)));
  const r = rad(deg);
  U.uSunE.value = r;
  skyDir(H + MOON_H, MOON_DEC, U.uMoonD.value);
  const moonUp = sstep(U.uMoonD.value.y, -0.02, 0.1);
  // The stars turn with the sky.
  U.uSkyRot.value.setFromMatrix4(skyRot.makeRotationAxis(SKY.P, -H));
  // Dusk: the first look, 0 to 15 degrees.
  // low: 0 at the horizon, 1 at fifteen degrees up.
  const low = clamp(deg / 15, 0, 1);
  let sunC = lerp3([1.6, 0.62, 0.22], [1.9, 1.75, 1.55], low).map(x => x * (0.55 + 0.45 * low));
  let zen = lerp3([0.10, 0.15, 0.30], [0.16, 0.30, 0.62], low);
  let hor = lerp3([0.78, 0.38, 0.17], [0.72, 0.68, 0.62], low);
  // Day: 15 to 60 degrees, toward a white noon.
  const day = sstep(deg, 15, 60);
  sunC = lerp3(sunC, [2.05, 2.0, 1.9], day);
  zen = lerp3(zen, [0.05, 0.16, 0.56], day);
  hor = lerp3(hor, [0.56, 0.65, 0.78], day);
  // Under the horizon: blue hour to -6, night to -14.
  const tw = sstep(deg, -6, 0), nt = sstep(deg, -14, -6);
  zen = lerp3(lerp3([0.004, 0.006, 0.016], [0.035, 0.06, 0.15], nt), zen, tw);
  hor = lerp3(lerp3([0.012, 0.015, 0.028], [0.2, 0.15, 0.2], nt), hor, tw);
  // The disc's light goes as it sets; the glow lasts to -10.
  const kS = sstep(deg, -1.5, 1.5);
  U.uGlowC.value.set(...sunC.map(x => x * sstep(deg, -10, 0)) as RGB);
  // The moon takes the key light below -3 degrees.
  const mK = (1 - sstep(deg, -10, -3)) * moonUp;
  U.uMoonK.value = mK;
  U.uStars.value = 1 - sstep(deg, -10, -2);
  U.uSun.value.copy(deg > -3 ? U.uSunD.value : U.uMoonD.value);
  U.uSun.value.setY(Math.max(U.uSun.value.y, 0.02)).normalize();
  U.uSunC.value.set(...sunC.map((x, i) => x * kS + MOON_C[i] * mK) as RGB);
  U.uZenC.value.set(...zen);
  U.uHorC.value.set(...hor);
  // Cloud nine kilometres up sees the sun to -6 degrees.
  U.uCloudSun.value.set(...sunC.map((x, i) => x * sstep(deg, -6, 1) + MOON_C[i] * mK * 0.3) as RGB);
  U.uCloudAmb.value.setScalar(lerp(lerp(0.012, 0.05, nt), 0.22, tw));
  // A high sun needs no lift on the plain.
  U.uGLift.value.set(lerp(2.6, 1.1, day), lerp(0.08, 0.05, day));
  state.baseExp = lerp(lerp(2.2, 1.35, nt), 0.9, tw);
  state.keyDay = sstep(deg, -8, 4);
  renderer.toneMappingExposure = state.baseExp;
  fitShadow();
}
// The slider runs from night to noon.
// The knots keep dusk mid-slider, where the first look sat.
const TIME_K = [[0, -14], [0.18, -6], [0.32, 0], [0.5, 5.6], [0.72, 18], [1, 60]];
export function sunDeg(v: number) {
  for (let i = 1; i < TIME_K.length; i++) {
    const [v0, d0] = TIME_K[i - 1], [v1, d1] = TIME_K[i];
    if (v <= v1) return lerp(d0, d1, (v - v0) / (v1 - v0));
  }
  return 60;
}
export const setSun = () => { sun(sunDeg(opts.sun)); draw(); };
