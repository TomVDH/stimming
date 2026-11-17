// Load order: fx/ion runs first.
import './ion.ts';
import * as THREE from 'three';
import { reduced, linFit } from '../../../shared/stim.js';
import { scene } from '../setup.ts';
import { BAND } from '../clouds/bands.ts';
import { starMat } from './burst.ts';

/* ---------- glints: streaks of light with a length and a width in metres ---------- */
// The length lies along one world direction.
// It foreshortens as that direction turns away from the eye.
export function makeGlint(color: number[]) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
    uniforms: {
      uP: { value: new THREE.Vector3() }, uD: { value: new THREE.Vector3(0, 0, -1) }, uLW: { value: new THREE.Vector2(1, 1) },
      uC: { value: new THREE.Vector3(...color) }, uGain: { value: 0 }, uRes: starMat.uniforms.uRes, uDpr: starMat.uniforms.uDpr,
    },
    transparent: true, depthWrite: false, depthTest: false,
    blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor,
    blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor,
    vertexShader: /* glsl */`uniform vec3 uP, uD; uniform vec2 uLW, uRes; uniform float uDpr; varying vec2 vUv;
    void main() {
      vec4 c0 = projectionMatrix * viewMatrix * vec4(uP, 1.0);
      vec4 c1 = projectionMatrix * viewMatrix * vec4(uP + uD * uLW.x, 1.0);
      vec2 d = (c1.xy / c1.w - c0.xy / c0.w) * 0.5 * uRes;
      float len = length(d);
      d = len > 1e-3 ? d / len : vec2(1.0, 0.0);
      float ppm = 0.5 * uRes.y * projectionMatrix[1][1] / max(c0.w, 1.0);
      // A floor in pixels keeps the far spark alive.
      float wid = max(uLW.y * ppm, 2.5 * uDpr);
      len = max(len, wid);
      vUv = position.xy;
      c0.xy += (d * position.x * len + vec2(-d.y, d.x) * position.y * wid) / (0.5 * uRes) * c0.w;
      gl_Position = c0;
    }`,
    fragmentShader: /* glsl */`uniform vec3 uC; uniform float uGain; varying vec2 vUv;
    void main() {
      float x = vUv.x, y = vUv.y;
      float body = exp(-x * x * 3.5 - y * y * 5.0);
      float spine = exp(-abs(y) * 9.0) * exp(-x * x * 2.5);
      float a = (0.6 * body + 0.8 * spine) * (1.0 - smoothstep(0.7, 1.0, max(abs(x), abs(y))));
      gl_FragColor = vec4(mix(uC, vec3(1.0), 0.6 * spine) * uGain * a, 0.0);
    }`,
  }));
  m.frustumCulled = false; m.renderOrder = BAND.lights; m.visible = false;
  scene.add(m);
  return m;
}
export type Glint = ReturnType<typeof makeGlint>;
export function glint(m: Glint, pos: THREE.Vector3Like, dir: THREE.Vector3Like, len: number, wid: number, gain: number) {
  const g = reduced() ? gain * 0.5 : gain;
  m.visible = g > 0.002;
  m.material.uniforms.uP.value.copy(pos);
  m.material.uniforms.uD.value.copy(dir);
  m.material.uniforms.uLW.value.set(len, wid);
  m.material.uniforms.uGain.value = g;
}
export const headGlint = makeGlint(linFit(0.9, 0.07, 228));
export const headStreak = makeGlint(linFit(0.82, 0.1, 235));
