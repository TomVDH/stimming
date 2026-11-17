// @ts-nocheck
// Load order: ship/battleship runs first.
import '../ship/battleship.ts';
import * as THREE from 'three';
import { VOL_NOISE } from '../../storms.js';
import { renderer } from '../setup.ts';
import { CLOUD_U } from '../clouds/clouds.ts';

/* ---------- vol: a tiled 3D billow noise, baked on the GPU ---------- */
// R holds Perlin-Worley billows; G holds fine Worley for erosion.
// One quad draws each slice of the volume, once, at load.
const VOL_N = 96;
export const volRT = new THREE.WebGL3DRenderTarget(VOL_N, VOL_N, VOL_N, { depthBuffer: false });
volRT.texture.minFilter = volRT.texture.magFilter = THREE.LinearFilter;
volRT.texture.wrapS = volRT.texture.wrapT = volRT.texture.wrapR = THREE.RepeatWrapping;
CLOUD_U.uVol.value = volRT.texture;
{
  const bake = new THREE.ShaderMaterial({
    uniforms: { uZ: { value: 0 } }, depthTest: false, depthWrite: false,
    vertexShader: /* glsl */`varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
    fragmentShader: /* glsl */`varying vec2 vUv; uniform float uZ;
    ${VOL_NOISE}
    void main() { gl_FragColor = volAt(vec3(vUv, uZ)); }`,
  });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), bake);
  const flat = new THREE.Camera();
  for (let z = 0; z < VOL_N; z++) {
    bake.uniforms.uZ.value = (z + 0.5) / VOL_N;
    renderer.setRenderTarget(volRT, z);
    renderer.render(quad, flat);
  }
  renderer.setRenderTarget(null);
  bake.dispose(); quad.geometry.dispose();
}
