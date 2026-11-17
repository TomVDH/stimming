// Load order: fx/bowshock runs first.
import './bowshock.ts';
import * as THREE from 'three';
import { reduced } from '../../../shared/stim.js';
import { scene } from '../setup.ts';
import { BAND } from '../clouds/bands.ts';

/* ---------- shock rings: thin discs of compressed air ---------- */
function makeRing(color: number[]) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
    uniforms: {
      uC: { value: new THREE.Vector3() }, uA: { value: new THREE.Vector3(1, 0, 0) }, uB: { value: new THREE.Vector3(0, 1, 0) },
      uRW: { value: new THREE.Vector2(1, 0.1) }, uCol: { value: new THREE.Vector3(...color) }, uGain: { value: 0 }, uSeed: { value: 0 },
    },
    transparent: true, depthWrite: false,
    blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor,
    blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor,
    vertexShader: /* glsl */`uniform vec3 uC, uA, uB; uniform vec2 uRW; varying vec2 vUv;
    void main() {
      vUv = position.xy * 1.3;
      gl_Position = projectionMatrix * viewMatrix * vec4(uC + (uA * vUv.x + uB * vUv.y) * uRW.x, 1.0);
    }`,
    fragmentShader: /* glsl */`uniform vec3 uCol; uniform vec2 uRW; uniform float uGain, uSeed; varying vec2 vUv;
    void main() {
      float d = length(vUv), a = atan(vUv.y, vUv.x);
      // The front is ragged round its rim.
      float rag = 0.65 + 0.35 * sin(a * 7.0 + uSeed) * sin(a * 13.0 - uSeed * 1.7);
      float x = (d - 1.0) / uRW.y;
      // Thin vapour fills the disc behind the front.
      float fill = 0.1 * smoothstep(1.0, 0.2, d) * step(d, 1.0);
      gl_FragColor = vec4(uCol * uGain * (exp(-x * x) * rag + fill), 0.0);
    }`,
  }));
  m.frustumCulled = false; m.renderOrder = BAND.lights; m.visible = false;
  scene.add(m);
  return m;
}
// Centre c, plane axes a and b, radius r, front width w.
function ring(m: ReturnType<typeof makeRing>, c: THREE.Vector3Like, a: THREE.Vector3Like, b: THREE.Vector3Like, r: number, w: number, gain: number) {
  if (reduced()) gain *= 0.5;
  m.visible = gain > 0.002;
  const u = m.material.uniforms;
  u.uC.value.copy(c); u.uA.value.copy(a); u.uB.value.copy(b);
  u.uRW.value.set(r, w); u.uGain.value = gain;
}
