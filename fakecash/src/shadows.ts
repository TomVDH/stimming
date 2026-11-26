import * as THREE from 'three';
import type { BillBody } from './physics.ts';

// Directional depth shadow map for falling banknotes; clear polymer windows punch light holes.

const SHADOW_SIZE = 1024;
const _biasMat = new THREE.Matrix4().set(
  0.5, 0.0, 0.0, 0.5,
  0.0, 0.5, 0.0, 0.5,
  0.0, 0.0, 0.5, 0.5,
  0.0, 0.0, 0.0, 1.0,
);

export class BillShadowMap {
  readonly target: THREE.WebGLRenderTarget;
  readonly depthTexture: THREE.DepthTexture;
  readonly matrix = new THREE.Matrix4();
  private lightCam: THREE.OrthographicCamera;
  private shadowScene = new THREE.Scene();

  constructor() {
    this.depthTexture = new THREE.DepthTexture(SHADOW_SIZE, SHADOW_SIZE);
    this.depthTexture.format = THREE.DepthFormat;
    this.depthTexture.type = THREE.UnsignedIntType;
    this.depthTexture.minFilter = THREE.NearestFilter;
    this.depthTexture.magFilter = THREE.NearestFilter;

    this.target = new THREE.WebGLRenderTarget(SHADOW_SIZE, SHADOW_SIZE, {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      depthTexture: this.depthTexture,
      depthBuffer: true,
      stencilBuffer: false,
    });

    this.lightCam = new THREE.OrthographicCamera(-7.8, 7.8, 5.6, -5.6, 0.5, 22);
    // Align shadow caster with the primary upper-right-front directional key light.
    this.lightCam.position.set(4.8, 6.4, 6.2);
    this.lightCam.lookAt(0, 0, -1.6);
    this.lightCam.updateMatrixWorld();
    this.lightCam.updateProjectionMatrix();

    this.matrix
      .copy(_biasMat)
      .multiply(this.lightCam.projectionMatrix)
      .multiply(this.lightCam.matrixWorldInverse);
  }

  render(renderer: THREE.WebGLRenderer, group: THREE.Group, bodies: readonly BillBody[]) {
    const swapped: { mesh: THREE.Mesh; mat: THREE.Material }[] = [];
    for (const b of bodies) {
      if (!b.active || !b.mesh.visible) continue;
      swapped.push({ mesh: b.mesh, mat: b.mesh.material as THREE.Material });
      b.mesh.material = b.depthMat;
    }

    const prevParent = group.parent;
    this.shadowScene.add(group);

    const prevTarget = renderer.getRenderTarget();
    const prevAutoClear = renderer.autoClear;
    renderer.autoClear = true;
    renderer.setRenderTarget(this.target);
    renderer.clear(false, true, false);
    renderer.render(this.shadowScene, this.lightCam);
    renderer.setRenderTarget(prevTarget);
    renderer.autoClear = prevAutoClear;

    if (prevParent) prevParent.add(group);
    for (const s of swapped) s.mesh.material = s.mat;
  }

  dispose() {
    this.depthTexture.dispose();
    this.target.dispose();
  }
}
