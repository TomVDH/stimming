// Load order: clouds/clouds runs first.
import './clouds.ts';
import * as THREE from 'three';
import { STORM_GLSL, STORM_MARCH } from '../../storms.js';
import { HEAD } from '../sky/atmosphere.ts';
import { AIR } from '../sky/air.ts';
import { PLANET_R } from '../world/ground.ts';
import { CLOUD_VS, giants, tower } from './clouds.ts';
import { stormFl } from './lightning.ts';

/* ---------- storm probe: Window seat's towers, marched inside the cards ---------- */
// A probe for Tom: each storm card becomes a window onto a 3D tower.
// The shape, billows and light follow Window seat's storm cells.
// Units inside: one "km" is a fourteenth of the storm's height.
const STORM_VS = CLOUD_VS
  .replace('flat varying vec4 vS;', 'flat varying vec4 vS;\nflat varying vec3 vC;')
  // The card reaches below the base, so the rain shafts under it draw.
  .replace('vec2 uv = position.xy * vec2(1.2, 1.5);', 'vec2 uv = position.xy * vec2(3.0, 1.5) - vec2(0.0, 0.2);')
  .replace('vUv = uv; vP = P;', 'vC = C; vUv = uv; vP = P;');
// The storm's lights, shared by the probe and the cloud pass.
// The host declares uFl, uFlR, uStormK, uStormSoft and the storm chunk first.
export const STORM_HOST = /* glsl */`
// Lightning's colour inside cloud, as Window seat's.
#define FLASH_C vec3(0.64, 0.72, 1.0)
vec3 stormFlash(vec3 P) {
  vec3 L = vec3(0.0);
  for (int i = 0; i < 4; i++) {
    if (uFl[i].w < 0.001) continue;
    float fd = length(P - uFl[i].xyz), r = uFlR[i];
    L += FLASH_C * uFl[i].w * (1.8 * exp(-fd * fd / (r * r)) + 0.5 * exp(-fd / (2.2 * r)));
  }
  return L * mix(3.0, 1.0, uStars);
}
// The key light: the sun until it is well down, then the moon.
vec3 Ls;
// The sunlight at P: high tops keep the sun after the ground has lost it.
// Their horizon dips by the planet's curve: about ten degrees at ninety kilometres.
// The sun's height at P itself: points toward the sun see it higher.
vec3 stormSun(vec3 P) {
  float el = asin(clamp(uSunD.y + dot(uSunD.xz, P.xz - cameraPosition.xz) / ${PLANET_R.toFixed(1)}, -1.0, 1.0)), dip = sqrt(2.0 * max(P.y, 0.0) / ${PLANET_R.toFixed(1)});
  float litTop = smoothstep(-dip - 0.006, -dip + 0.006, el) * (1.0 - smoothstep(-0.026, 0.026, el));
  // Light that grazes the planet arrives deep red.
  return mix(uSunC, uCloudSun, smoothstep(1500.0, 11000.0, P.y)) + uGlowC * vec3(1.0, 0.5, 0.28) * 1.6 * litTop;
}
// Sky light comes mostly from the bright horizon, warm at dusk.
// Window seat's dome: the zenith, the sun-side glow and the far side, mixed.
vec3 stormSky(float h) { return uZenC * 0.5 + uHorC * 0.5 + uCloudAmb * 0.5; }
// The sky's glow low on the sun's side.
vec3 stormTwi() { return k2skyB(normalize(vec3(uSunD.x, 0.06, uSunD.z)), 0.0); }
// The other lights on a storm: the blast, the bolt and the rock.
// Each light takes one shade tap toward it, so the far side stays dark.
// The tap runs once per ray, at the first cloud: a tap per step costs too much.
float gHitSh = -1.0, gRockSh = -1.0;
// p is P in storm units; powder is low at thin edges.
vec3 stormExtra(vec3 P, vec3 p, float powder, float Tl2) {
  vec3 L = vec3(0.0), V = normalize(P - cameraPosition);
  float thin = 1.0 - powder;
  // The blast: its flash, its afterglow and the shock rim, as on the cards.
  if (uBk > 0.0) {
    float rim; vec3 push;
    vec3 hl = cloudHit(P, thin, rim, push);
    if (dot(hl, hl) + rim > 1e-7) {
      if (gHitSh < 0.0) gHitSh = exp(-1.8 * shapeTap(p + normalize(uHitP.xyz - P) * 2.2));
      L += 1.76 * hl * (0.2 + 0.8 * gHitSh) + rim * (hl * 0.6 + 0.01);
    }
  }
  // The passing bolt lights the cloud near its path.
  if (uBolt.w > 0.001) { vec3 bd = P - uBolt.xyz; L += cloudBoltC() * uBolt.w * 0.35 / (1.0 + dot(bd, bd) / 4.0e7); }
  if (uFill + uRockL.w < 0.001) return L;
  // The rock reaches a storm four times further than a heap.
  // A storm stands 50 to 150 km from the rock.
  vec3 rb = uRockL.xyz - P, Lr = normalize(rb);
  float R4 = 4.0 * uRockR, rf = R4 * R4 / (dot(rb, rb) + R4 * R4);
  float back = pow(max(dot(V, Lr), 0.0), 4.0);
  // The rock's fire fills the storm warm; the side toward the rock glows.
  L += uAstC * uFill * (0.14 + 0.6 * back) * (0.2 + 0.8 * powder) * (0.3 + 0.7 * Tl2);
  // The rock's direct light: the faces toward it take it, its own body shades it.
  if (uRockL.w * rf > 0.004) {
    if (gRockSh < 0.0) gRockSh = exp(-1.8 * shapeTap(p + Lr * 2.2));
    L += uAstC * uRockL.w * rf * ((0.08 + 0.92 * gRockSh) * (0.3 + 0.7 * powder) + 0.6 * thin * back) * 1.6 * mix(1.0, 0.6, uStars);
  }
  return L;
}
`;
const STORM_FS = /* glsl */`precision highp sampler3D;
// three.js sets it on every program; only the vertex stage declares it.
uniform mat4 projectionMatrix;
uniform sampler3D uVol;
varying vec2 vUv;
varying vec3 vP, vR, vF;
flat varying vec4 vS;
flat varying vec3 vC;
${HEAD}
${AIR}
uniform float uCloudC;
uniform vec4 uFl[4];
uniform vec4 uFlR;
uniform vec4 uStormK;
uniform float uStormSoft;
${STORM_GLSL}
${STORM_HOST}
${STORM_MARCH}
void main() {
  float H = vS.y;
  setStorm(vS.w, vS.z);
  setGround(vC.y, H);
  vec3 ro = cameraPosition, rd = normalize(vP - cameraPosition);
  vec2 sp = stormSpan(ro, rd, vC, H);
  if (sp.y <= sp.x) discard;
  Ls = uSunD.y > -0.12 ? uSunD : uSun;
  float jit = fract(52.98 * fract(dot(gl_FragCoord.xy, vec2(0.0671, 0.00584))));
  vec3 Phit, Flash;
  vec4 m = marchStorm(ro, rd, vC, H, sp.x, sp.y, jit, Phit, Flash);
  float a = m.a;
  if (a < 0.004) discard;
  vec3 col = m.rgb;
  // The same air as the ranges and the cards.
  col = aerial(col, Phit);
  // Far flashes punch through the haze, so distant storms still flicker blue-white.
  // The blast, the bolt and the rock land here too, as on the cards.
  col += Flash / a * 0.85;
  gl_FragColor = vec4(col, a);
  // The depth of the first cloud on the ray, on the planet's curve.
  // Then a range in front cuts the storm where the two really cross.
  vec2 dc = Phit.xz - cameraPosition.xz;
  vec4 cp = projectionMatrix * viewMatrix * vec4(Phit.x, Phit.y - dot(dc, dc) / ${(2 * PLANET_R).toFixed(1)}, Phit.z, 1.0);
  gl_FragDepth = clamp(cp.z / cp.w * 0.5 + 0.5, 0.0, 1.0);
}`;
const stormCards = [tower, giants], cardMats = stormCards.map(m => m.material);
let stormMats: THREE.ShaderMaterial[] | null = null;
// Storm probe on: the towers and the giant march Window seat's volume.
export function setStormProbe(on: boolean) {
  stormMats ??= stormCards.map(m => new THREE.ShaderMaterial({ uniforms: m.material.uniforms, vertexShader: STORM_VS, fragmentShader: STORM_FS, transparent: true, depthWrite: false }));
  stormCards.forEach((m, i) => { m.material = on ? stormMats![i] : cardMats[i]; });
  stormFl.vol = on;
}
