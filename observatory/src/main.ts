import { camera, renderer, scene, stageEl } from './setup.ts';

// Keep the canvas the size of the stage.
function resize(): void {
  const w = stageEl.clientWidth || 1;
  const h = stageEl.clientHeight || 1;
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.render(scene, camera);
}
new ResizeObserver(resize).observe(stageEl);
resize();
