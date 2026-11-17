// @ts-nocheck
// Load order: fx/flares runs first.
import './flares.ts';
import * as THREE from 'three';
import { linFit, reduced } from '../../../shared/stim.js';
import { state } from '../state.ts';
import { camera, clamp, scene } from '../setup.ts';
import { U } from '../world/uniforms.ts';
import { BAND } from '../clouds/bands.ts';
import { ast, astMat, astMesh } from '../rock/asteroid.ts';
import { frags } from '../rock/fragments.ts';
import { makeFlare } from './flares.ts';
import { strikeU } from '../rock/strike.ts';

/* ---------- the bow shock: a glowing arc of air in front of the rock ---------- */
// A camera-facing card; the arc opens toward the rock's travel on screen.
const bowMat = new THREE.ShaderMaterial({
  // uAp: the rock's nearness, 0 far out to 1 at the end of its fall.
  uniforms: { uF: { value: new THREE.Vector4() }, uDir: { value: new THREE.Vector2(1, 0) }, uGain: { value: 0 }, uTime: U.uTime, uGrand: { value: 0 }, uAp: { value: 0 },
    uCos: { value: new THREE.Vector3(...linFit(0.8, 0.13, 290)) },
    uHot: { value: new THREE.Vector3(...linFit(0.97, 0.05, 85)) }, uRim: { value: new THREE.Vector3(...linFit(0.78, 0.17, 50)) } },
  transparent: true, depthWrite: false,
  blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor,
  blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor,
  vertexShader: /* glsl */`uniform vec4 uF; varying vec2 vUv;
  void main() {
    vec3 right = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
    vec3 up = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
    vUv = position.xy;
    // The card spans six rock radii each way.
    gl_Position = projectionMatrix * viewMatrix * vec4(uF.xyz + (right * position.x + up * position.y) * uF.w * 6.0, 1.0);
  }`,
  fragmentShader: /* glsl */`uniform vec2 uDir; uniform float uGain, uTime, uGrand, uAp; uniform vec3 uHot, uRim, uCos; varying vec2 vUv;
  // One shock shell: a hyperbola round the nose.
  // n: nose standoff, c: nose roundness, m: cone slope; all in rock radii.
  float shellD(float along, float across, float n, float c, float m) {
    float r = sqrt(c * c + m * m * across * across);
    float slope = m * m * across / r;
    return (along - (n + c - r)) / sqrt(1.0 + slope * slope);
  }
  void main() {
    // Rock radii from the rock's centre.
    vec2 q = vUv * 6.0;
    float along = dot(q, uDir), across = abs(dot(q, vec2(-uDir.y, uDir.x)));
    float px = length(fwidth(q));
    // A crescent hugs the nose and wraps down the flanks.
    // Nearer the ground the air is thicker: the shock presses in, thickens and wraps farther.
    // It never thins below about a pixel, so it does not shimmer.
    float d = shellD(along, across, 1.3 - 0.18 * uAp, 0.5, 1.0 - 0.15 * uAp);
    float w = max(0.035 + 0.06 * uAp, 0.7 * px);
    // Plasma breaks the shell into racing filaments.
    float fil = 0.72 + 0.28 * sin(across * 9.0 - uTime * 31.0 + 2.0 * sin(along * 5.0 + uTime * 7.0));
    float wrap = exp(-across * across / (2.2 + 5.0 * uAp));
    float g = (exp(-d * d / (w * w)) * fil + (0.15 + 0.4 * uAp) * exp(-abs(d) / (0.2 + 0.3 * uAp))) * wrap * smoothstep(-1.2 - 1.8 * uAp, 0.6, along);
    // White-hot at the nose, bluer as it nears; orange where it wraps.
    float k = smoothstep(0.0, 1.6, across);
    vec3 c = mix(mix(uHot * 3.0, vec3(3.2, 3.4, 4.2), 0.5 * uAp), uRim * 1.2, k);
    vec3 col = c * g;
    // The strike: a second thin crescent, violet, a little farther out.
    if (uGrand > 0.01) {
      float d3 = shellD(along, across, 1.8 + 0.25 * uGrand, 0.65, 0.9);
      float w3 = max(0.03, 0.6 * px);
      float v = (exp(-d3 * d3 / (w3 * w3)) + 0.1 * exp(-abs(d3) / 0.25)) * exp(-across * across / 3.2) * smoothstep(-1.4, 0.8, along);
      v *= 0.8 + 0.2 * sin(across * 5.0 - uTime * 2.5);
      col += uCos * 1.6 * v * uGrand;
    }
    gl_FragColor = vec4(col * uGain, 0.0);
  }`,
});
export const bow = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), bowMat);
// The rock's glows draw after its smoke and before the cloud heaps.
// The heaps stand 8 to 38 km out, in front of the rock at 42 to 48 km.
// Clouds write no depth, so draw order is what hides a glow behind them.
const ROCK_GLOW_ORDER = BAND.glows;
bow.frustumCulled = false; bow.renderOrder = ROCK_GLOW_ORDER; bow.visible = false;
scene.add(bow);
// A fiery haze hangs round the burning rock; night shows it most.
// It shares the bow's card and draws over the smoke near the rock.
const haloMat = new THREE.ShaderMaterial({
  uniforms: { uF: bowMat.uniforms.uF, uGain: { value: 0 }, uTime: U.uTime, uC: U.uAstC, uHot: bowMat.uniforms.uHot },
  transparent: true, depthWrite: false,
  blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor,
  blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor,
  vertexShader: bowMat.vertexShader,
  fragmentShader: /* glsl */`uniform float uGain, uTime; uniform vec3 uC, uHot; varying vec2 vUv;
  void main() {
    // r is in rock radii from the centre.
    float r = length(vUv) * 6.0, e = max(r - 0.9, 0.0);
    // A bright skin on the rock and a wide faint globe beyond.
    float g = 0.5 * exp(-e / 0.45) + 0.16 * exp(-e / 1.7);
    g *= 1.0 - smoothstep(4.0, 6.0, r);
    // The rim licks unevenly and breathes.
    float a = atan(vUv.y, vUv.x);
    g *= 0.85 + 0.15 * sin(a * 5.0 + uTime * 2.3) * sin(a * 3.0 - uTime * 1.7);
    // White hot at the skin, amber farther out.
    vec3 c = mix(uHot * 1.4, uC, smoothstep(1.0, 2.6, r));
    gl_FragColor = vec4(c * g * uGain, 0.0);
  }`,
});
export const halo = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), haloMat);
halo.frustumCulled = false; halo.renderOrder = ROCK_GLOW_ORDER; halo.visible = false;
scene.add(halo);
const bowR = new THREE.Vector3(), bowU = new THREE.Vector3();
export function updateBow() {
  // The strike's nearness grows the haze, the crescent and a violet crescent.
  const g = state.strike && !state.strike.hit ? THREE.MathUtils.smoothstep(strikeU(), 0, 1) : 0;
  // The haze is faint by day and strong at night.
  halo.visible = astMesh.visible;
  haloMat.uniforms.uGain.value = astMat.uniforms.uBurn.value * (0.12 + 0.5 * U.uStars.value) * (1 + g);
  bowMat.uniforms.uF.value.set(ast.pos.x, ast.pos.y, ast.pos.z, ast.R);
  bow.visible = astMesh.visible && !reduced();
  if (!bow.visible) return;
  // The rock travels against ast.away; that heading, laid on the screen.
  bowR.setFromMatrixColumn(camera.matrixWorld, 0); bowU.setFromMatrixColumn(camera.matrixWorld, 1);
  const tx = -ast.away.dot(bowR), ty = -ast.away.dot(bowU), tl = Math.hypot(tx, ty) || 1;
  bowMat.uniforms.uDir.value.set(tx / tl, ty / tl);
  bowMat.uniforms.uGrand.value = g;
  // The shock brightens and grows as the rock comes down the last stretch.
  const ap = Math.max(clamp((Math.min(ast.s, 1) - 0.25) / 0.75, 0, 1), g);
  bowMat.uniforms.uAp.value = ap;
  // The shock comes in slowly, only as the rock nears the ground (Tom).
  const bk = THREE.MathUtils.smoothstep(ap, 0.35, 1);
  bowMat.uniforms.uGain.value = 0.9 * astMat.uniforms.uBurn.value * 3 * bk * bk * (1 + 1.5 * g);
}
export const headFlare = makeFlare(linFit(0.97, 0.03, 220));
export const hitFlare = makeFlare(linFit(0.97, 0.06, 70));
export const muzzleGlow = makeFlare(linFit(0.9, 0.07, 235));
export const hitGlow = makeFlare(linFit(0.85, 0.1, 62));
// The game over's glow round the falling rock.
export const rockGlobe = makeFlare(linFit(0.88, 0.12, 55));
// The hit's and the strike's glows sit in the world.
// The gun, the plain and nearer clouds stand in front of them.
for (const m of [hitFlare, hitGlow, rockGlobe]) m.material.depthTest = true;
rockGlobe.renderOrder = ROCK_GLOW_ORDER;
// Split pieces' halos: hills hide them, and so do clouds in front.
for (const f of frags) { f.glow.material.depthTest = true; f.glow.renderOrder = ROCK_GLOW_ORDER; }
// Late bursts inside the cloud, as big pieces break.
export const burstFlares = [0, 1, 2].map(() => makeFlare(linFit(0.88, 0.13, 58)));
export function flare(m, pos, size, gain) {
  // Reduced motion halves every flash.
  if (reduced()) gain *= 0.5;
  m.visible = gain > 0.002;
  m.material.uniforms.uF.value.set(pos.x, pos.y, pos.z, size);
  m.material.uniforms.uGain.value = gain;
}
