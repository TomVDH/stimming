// @ts-nocheck
// Load order: gun/case runs first.
import '../gun/case.ts';
import * as THREE from 'three';
import { state } from '../state.ts';
import { camera, renderer, v3 } from '../setup.ts';
import { U } from './uniforms.ts';
import { AIM, gun } from '../gun/gun.ts';

/* ---------- sun shadows: one depth map along the sun ---------- */
const shadowRT = new THREE.WebGLRenderTarget(2048, 1024, { depthTexture: new THREE.DepthTexture(2048, 1024, THREE.UnsignedIntType) });
shadowRT.depthTexture.minFilter = shadowRT.depthTexture.magFilter = THREE.NearestFilter;
U.uShadowT.value = shadowRT.depthTexture;
const shadowCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 10);
const shadowScene = new THREE.Scene();
// Back faces go in the map, so lit faces need little bias.
const shadowMesh = new THREE.Mesh(gun.geometry, new THREE.ShaderMaterial({
  uniforms: { uAxis0: U.uAxis0, uRecoil: U.uRecoil, uDrop: U.uDrop, uYaw: U.uYaw },
  vertexShader: /* glsl */`
  attribute vec4 aPart;
  ${AIM}
  void main() { gl_Position = projectionMatrix * viewMatrix * vec4(aim(position, aPart.y, 1.0 - step(1.5, aPart.z)), 1.0); }`,
  fragmentShader: 'void main() { gl_FragColor = vec4(1.0); }',
  colorWrite: false, side: THREE.BackSide,
}));
shadowMesh.frustumCulled = false;
shadowScene.add(shadowMesh);
state.shadowDirty = true;
const TO_UV = new THREE.Matrix4().set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1);
// The map covers the plinth and every aim of the barrel.
const SHADOW_BOX = new THREE.Box3(v3(-470, 0, -930), v3(470, 600, 470));
export function fitShadow() {
  const bb = SHADOW_BOX, c = bb.getCenter(v3()), lo = v3(1e9, 1e9, 1e9), hi = v3(-1e9, -1e9, -1e9), p = v3();
  shadowCam.position.copy(c).addScaledVector(U.uSun.value, 3000);
  shadowCam.lookAt(c);
  shadowCam.updateMatrixWorld();
  // The box's eight corners bound the map in the sun's frame.
  for (let i = 0; i < 8; i++) {
    p.set(i & 1 ? bb.max.x : bb.min.x, i & 2 ? bb.max.y : bb.min.y, i & 4 ? bb.max.z : bb.min.z).applyMatrix4(shadowCam.matrixWorldInverse);
    lo.min(p); hi.max(p);
  }
  // The margin holds the recoil.
  const m = 60;
  shadowCam.left = lo.x - m; shadowCam.right = hi.x + m; shadowCam.bottom = lo.y - m; shadowCam.top = hi.y + m;
  shadowCam.near = -hi.z - m; shadowCam.far = -lo.z + m;
  shadowCam.updateProjectionMatrix();
  U.uShadowM.value.copy(TO_UV).multiply(shadowCam.projectionMatrix).multiply(shadowCam.matrixWorldInverse);
  // 0.6 m of bias in the map's depth units.
  U.uShadowB.value = 0.6 / (shadowCam.far - shadowCam.near);
  state.shadowDirty = true;
}
export function drawShadow() {
  if (!state.shadowDirty) return;
  state.shadowDirty = false;
  renderer.setRenderTarget(shadowRT);
  renderer.clear();
  renderer.render(shadowScene, shadowCam);
  renderer.setRenderTarget(null);
}


// The gun's depth from the eye, each drawn frame: one cheap pass, no colour.
const gunDepthRT = new THREE.WebGLRenderTarget(2, 2, { depthTexture: new THREE.DepthTexture(2, 2) });
gunDepthRT.depthTexture.minFilter = gunDepthRT.depthTexture.magFilter = THREE.NearestFilter;
U.uGunD.value = gunDepthRT.depthTexture;
export const gunDepthScene = new THREE.Scene();
export const gunDepthMesh = new THREE.Mesh(gun.geometry, shadowMesh.material.clone());
gunDepthMesh.material.uniforms = shadowMesh.material.uniforms;
gunDepthMesh.material.side = THREE.FrontSide;
gunDepthMesh.frustumCulled = false;
gunDepthScene.add(gunDepthMesh);
export function drawGunDepth() {
  const w = renderer.domElement.width, h = renderer.domElement.height;
  if (gunDepthRT.width !== w || gunDepthRT.height !== h) gunDepthRT.setSize(w, h);
  U.uNF.value.set(camera.near, camera.far);
  camera.getWorldDirection(U.uCamFwd.value);
  renderer.setRenderTarget(gunDepthRT);
  renderer.clear();
  renderer.render(gunDepthScene, camera);
  renderer.setRenderTarget(null);
}
