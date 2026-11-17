// Load order: world/axis runs first.
import './axis.ts';
import * as THREE from 'three';
import { linFit } from '../../../shared/stim.js';
import { A0, AX, AX_UP, L } from './axis.ts';

/* ---------- uniforms ---------- */
type V<T> = THREE.IUniform<T>;
// The shared uniforms every pass reads.
// It is a type, not an interface: a material's uniform map needs an index signature.
export type Uniforms = {
  uGunD: V<THREE.DepthTexture | null>; uDRes: V<THREE.Vector2>; uNF: V<THREE.Vector2>; uCamFwd: V<THREE.Vector3>;
  uTime: V<number>;
  uSun: V<THREE.Vector3>; uSunC: V<THREE.Vector3>; uZenC: V<THREE.Vector3>; uHorC: V<THREE.Vector3>; uSunE: V<number>;
  uSunD: V<THREE.Vector3>; uGlowC: V<THREE.Vector3>; uMoonD: V<THREE.Vector3>; uMoonK: V<number>; uStars: V<number>;
  // uStarT starts null; the last line points it at uTime.
  uStarT: V<number>;
  uCloudSun: V<THREE.Vector3>; uCloudAmb: V<THREE.Vector3>; uGLift: V<THREE.Vector2>;
  uHitP: V<THREE.Vector4>; uHitR: V<number>;
  uHaze: V<number>; uDustLoad: V<number>; uHazeH: V<number>; uLayer: V<THREE.Vector2>; uDeck: V<number>; uWisp: V<THREE.Vector3>;
  uAst: V<THREE.Vector4>; uAstR: V<number>; uAstC: V<THREE.Vector3>; uFill: V<number>;
  uRockL: V<THREE.Vector4>; uRockR: V<number>;
  uBolt: V<THREE.Vector4>; uBoltC: V<THREE.Vector3>; uHit: V<THREE.Vector4>;
  uVoid: V<THREE.Vector4>; uVoidK: V<number>; uVoidD: V<THREE.Vector2>; uVoidT: V<number>;
  uCharge: V<number>; uRage: V<number>; uChase: V<number>; uChaseW: V<number>; uFire: V<number>;
  uAxisA: V<THREE.Vector3>; uAxisD: V<THREE.Vector3>; uAxisUp: V<THREE.Vector3>; uL: V<number>;
  uRecoil: V<number>; uDrop: V<THREE.Vector2>; uAxis0: V<THREE.Vector3>; uYaw: V<THREE.Vector2>;
  uShadowT: V<THREE.DepthTexture | null>; uShadowM: V<THREE.Matrix4>; uShadowB: V<number>;
  uArcL: V<THREE.Vector4>; uMuzL: V<THREE.Vector4>; uShocks: V<THREE.Vector4[]>;
  uAir: V<number>; uAirK: V<THREE.Vector4>;
  uHeat: V<number>; uHeatT: V<number>; uOver: V<number>;
  uBlast: V<THREE.Vector4>; uBk: V<number>;
  uSootS: V<THREE.Vector4>; uSootK: V<number>; uSootL: V<THREE.Vector3>; uEat: V<THREE.Vector4>;
  uAstG: V<THREE.Vector2>; uDebL: V<THREE.Vector4[]>; uPool: V<THREE.Vector4[]>;
  // sky/sun adds these three after the literal.
  uSkyRot: V<THREE.Matrix3>; uSkyRot0: V<THREE.Matrix3>; uTrailK: V<number>;
};
export const BLUE = linFit(0.82, 0.12, 225), AMBER = linFit(0.78, 0.17, 50);
export const U = {
  // The gun's depth from the eye: volumes stop marching at its skin.
  uGunD: { value: null }, uDRes: { value: new THREE.Vector2(1, 1) }, uNF: { value: new THREE.Vector2(20, 300000) }, uCamFwd: { value: new THREE.Vector3(0, 0, -1) },
  uTime: { value: 0 },
  // The sun: direction toward it, its colour, the zenith and the horizon.
  uSun: { value: new THREE.Vector3(0, 0.1, -1) },
  uSunC: { value: new THREE.Vector3() },
  uZenC: { value: new THREE.Vector3() },
  uHorC: { value: new THREE.Vector3() },
  uSunE: { value: 0.1 },
  // uSun is the key light: the sun by day, the moon by night.
  // uSunD is the true sun; it tints the sky glow.
  uSunD: { value: new THREE.Vector3(0, 0.1, -1) },
  uGlowC: { value: new THREE.Vector3() },
  uMoonD: { value: new THREE.Vector3(-0.58, 0.42, -0.69).normalize() },
  uMoonK: { value: 0 },
  uStars: { value: 0 },
  uStarT: null as unknown as V<number>,
  // High cloud still holds the sun after it sets.
  uCloudSun: { value: new THREE.Vector3() },
  uCloudAmb: { value: new THREE.Vector3(0.22, 0.22, 0.22) },
  // The plain's light: slope gain and lift; a low sun needs both.
  uGLift: { value: new THREE.Vector2(4, 0.25) },
  // The hit: world position and the sim time of the hit.
  uHitP: { value: new THREE.Vector4(0, 0, 0, -1e6) },
  uHitR: { value: 1000 },
  // Haze: dust per metre, and the height where it thins.
  uHaze: { value: 0.00013 },
  uDustLoad: { value: 0 },
  uHazeH: { value: 700 },
  // Layered air: x sinks far clouds into the haze; y pools fog in far valleys.
  uLayer: { value: new THREE.Vector2(1, 0.5) },
  // The cell deck's strength: 0 off.
  uDeck: { value: 0 },
  uWisp: { value: new THREE.Vector3(Math.random() * 200, Math.random() * 200, 0.6 + Math.random() * 0.4) },
  // The asteroid: direction from the eye, light strength; its angular radius.
  uAst: { value: new THREE.Vector4(0, 1, 0, 0) },
  uAstR: { value: 0.05 },
  uAstC: { value: new THREE.Vector3(...AMBER) },
  // The rock's fiery fill of the sky, 0 far out to 1 at the end.
  uFill: { value: 0 },
  // The rock as a light on the clouds: world position, strength; its reach in metres.
  uRockL: { value: new THREE.Vector4(0, 0, 0, 0) },
  uRockR: { value: 10000 },
  // The bolt: world position and strength. The hit: direction and strength.
  uBolt: { value: new THREE.Vector4(0, 0, 0, 0) },
  uBoltC: { value: new THREE.Vector3(...linFit(0.9, 0.08, 225)) },
  uHit: { value: new THREE.Vector4(0, 1, 0, 0) },
  // The void: a sphere the blast clears in the sky. Centre and radius; strength.
  uVoid: { value: new THREE.Vector4(0, 0, 0, 1) }, uVoidK: { value: 0 }, uVoidD: { value: new THREE.Vector2() }, uVoidT: { value: 0 },
  // Charge level, chase station, chase half width, muzzle flash.
  uCharge: { value: 0 },
  uRage: { value: 0 },
  uChase: { value: 0 },
  uChaseW: { value: 0.25 },
  uFire: { value: 0 },
  uAxisA: { value: A0 },
  uAxisD: { value: AX },
  uAxisUp: { value: AX_UP },
  uL: { value: L },
  // The barrel slides back along its axis, in metres.
  uRecoil: { value: 0 },
  // Cosine and sine of the barrel's drop below the firing angle.
  uDrop: { value: new THREE.Vector2(1, 0) },
  // The rest axis, and the cosine and sine of the mount's yaw.
  uAxis0: { value: AX.clone() },
  uYaw: { value: new THREE.Vector2(1, 0) },
  // The sun's depth map, its matrix and its bias.
  uShadowT: { value: null },
  uShadowM: { value: new THREE.Matrix4() },
  uShadowB: { value: 0.002 },
  // The brightest arc: position and strength.
  uArcL: { value: new THREE.Vector4(0, 0, 0, 0) },
  uMuzL: { value: new THREE.Vector4(0, 0, 0, 0) },
  // The Mach ring on the ground: centre x, z, radius, strength.
  uShocks: { value: Array.from({ length: 5 }, () => new THREE.Vector4(0, 0, 0, 0)) },
  // The strength of the Rayleigh air.
  uAir: { value: 0.7 },
  // The shared air's knobs: Rayleigh blue fade, dust amount, dust height in metres, sun glow.
  // Dev rows Air blue fade, Air dust, Air dust height and Air sun glow set them.
  uAirK: { value: new THREE.Vector4(1, 1, 3000, 1) },
  // Barrel heat, 0 cold to 1 white-hot.
  uHeat: { value: 0 },
  // A slow dull-red tail after each shot.
  uHeatT: { value: 0 },
  // The over-hold, 0 to 1: the gun acts out.
  uOver: { value: 0 },
  // The blast light: world position and strength.
  uBlast: { value: new THREE.Vector4(0, 0, 0, 0) },
  // uBk: the live blast's power; 0 when no blast burns.
  uBk: { value: 0 },
  // The soot ball: centre and radius, and its density.
  uSootS: { value: new THREE.Vector4() }, uSootK: { value: 0 },
  // The soot's shadow light: a steered way, so its shadow crosses the seen plain.
  uSootL: { value: new THREE.Vector3(0, 1, 0) },
  // The blast eats the tail's end: centre and radius; it stays after the soot.
  uEat: { value: new THREE.Vector4() },
  // The rock's place over the plain: x, z.
  uAstG: { value: new THREE.Vector2() },
  // The falling pieces' glows: place and strength.
  uDebL: { value: Array.from({ length: 4 }, () => new THREE.Vector4()) },
  // Ember pools where pieces land: x, z, strength, radius.
  uPool: { value: Array.from({ length: 4 }, () => new THREE.Vector4()) },
} as Uniforms;
U.uStarT = U.uTime;
