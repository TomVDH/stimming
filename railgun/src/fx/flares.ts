// @ts-nocheck
// Load order: play/charge runs first.
import '../play/charge.ts';
import * as THREE from 'three';
import { linFit } from '../../../shared/stim.js';
import { scene } from '../setup.ts';
import { BAND } from '../clouds/bands.ts';

/* ---------- flares: soft discs of light at the muzzle, the head and the hit ---------- */
// shape: GLSL that sets float a from vUv; the default is a soft disc.
export function makeFlare(color, shape = '') {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
    uniforms: { uF: { value: new THREE.Vector4(0, 0, 0, 1) }, uC: { value: new THREE.Vector3(...color) }, uGain: { value: 0 } },
    transparent: true, depthWrite: false, depthTest: false,
    blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor,
    blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor,
    vertexShader: /* glsl */`uniform vec4 uF; varying vec2 vUv;
    void main() {
      vec3 right = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
      vec3 up = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
      vec3 P = uF.xyz + (right * position.x + up * position.y) * uF.w;
      vUv = position.xy;
      gl_Position = projectionMatrix * viewMatrix * vec4(P, 1.0);
    }`,
    fragmentShader: /* glsl */`uniform vec3 uC; uniform float uGain; varying vec2 vUv;
    void main() {
      ${shape || 'float d = length(vUv); float a = exp(-d * d * 4.0) * (1.0 - smoothstep(0.6, 1.0, d)) + 0.4 * exp(-d * d * 24.0);'}
      gl_FragColor = vec4(uC * uGain * a, 0.0);
    }`,
  }));
  m.frustumCulled = false; m.renderOrder = BAND.lights; m.visible = false;
  scene.add(m);
  return m;
}
export const muzzleFlare = makeFlare(linFit(0.95, 0.05, 230));
