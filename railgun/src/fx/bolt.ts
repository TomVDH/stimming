// Load order: fx/rings runs first.
import './rings.ts';
import * as THREE from 'three';
import { linFit } from '../../../shared/stim.js';
import { scene } from '../setup.ts';
import { BAND } from '../clouds/bands.ts';
import { starMat } from './burst.ts';

/* ---------- the bolt: one ribbon from the breech to the rock ---------- */
// Forty-eight segments.
// Each frame they take the head's last quarter second.
export const BOLT_SEG = 48, BOLT_PTS = BOLT_SEG + 1;
// Each round in flight has its own ribbon geometry.
export function makeBoltGeo() {
  const g = new THREE.BufferGeometry();
  const n = BOLT_SEG, pos = new Float32Array(n * 12), idx = [];
  for (let i = 0; i < n; i++) {
    const b = i * 4;
    pos.set([0, -1, 0, 0, 1, 0, 1, -1, 0, 1, 1, 0], i * 12);
    idx.push(b, b + 2, b + 3, b, b + 3, b + 1);
  }
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setIndex(idx);
  for (const name of ['aP0', 'aP1']) {
    const a = new THREE.BufferAttribute(new Float32Array(n * 12), 3);
    a.setUsage(THREE.DynamicDrawUsage);
    g.setAttribute(name, a);
  }
  const k = new THREE.BufferAttribute(new Float32Array(n * 8), 2);
  k.setUsage(THREE.DynamicDrawUsage);
  g.setAttribute('aK', k);
  return g;
}
const boltGeo = makeBoltGeo();
export const boltMat = new THREE.ShaderMaterial({
  uniforms: { uRes: starMat.uniforms.uRes, uDpr: starMat.uniforms.uDpr, uBlue: { value: new THREE.Vector3(...linFit(0.85, 0.08, 230)) }, uCore: { value: 3 }, uGain: { value: 6 }, uWide: { value: 110 } },
  transparent: true, depthWrite: false,
  blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor,
  blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor,
  vertexShader: /* glsl */`
  attribute vec3 aP0, aP1;
  attribute vec2 aK;
  uniform vec2 uRes;
  uniform float uDpr, uWide;
  varying float vN, vA;
  void main() {
    if (aK.x < 0.001) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
    vec4 c0 = projectionMatrix * viewMatrix * vec4(aP0, 1.0);
    vec4 c1 = projectionMatrix * viewMatrix * vec4(aP1, 1.0);
    vec2 d = (c1.xy / c1.w - c0.xy / c0.w) * uRes;
    d = length(d) > 1e-3 ? normalize(d) : vec2(0.0, 1.0);
    vec4 c = position.x < 0.5 ? c0 : c1;
    // The width is in metres, so the streak thins with distance.
    float ppm = 0.5 * uRes.y * projectionMatrix[1][1] / max(c.w, 1.0);
    float W = clamp(uWide * ppm, 2.5 * uDpr, 40.0 * uDpr) * aK.y;
    c.xy += vec2(-d.y, d.x) * position.y * W / (0.5 * uRes) * c.w;
    vN = position.y; vA = aK.x;
    gl_Position = c;
  }`,
  fragmentShader: /* glsl */`
  uniform float uCore, uGain;
  uniform vec3 uBlue;
  varying float vN, vA;
  void main() {
    float n = abs(vN), k = uCore / 14.0;
    float core = exp(-n * n / (k * k) * 0.9);
    float halo = 0.3 * exp(-n * n * 2.5) * (1.0 - smoothstep(0.7, 1.0, n));
    gl_FragColor = vec4(mix(uBlue, vec3(1.0), 0.7 * core) * (core * uGain + halo * 2.0) * vA, 0.0);
  }`,
});
export const bolt = new THREE.Mesh(boltGeo, boltMat);
bolt.frustumCulled = false;
bolt.renderOrder = BAND.sparks;
bolt.visible = false;
scene.add(bolt);
