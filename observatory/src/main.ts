// Load order: loop runs first.
import './loop.ts';
import { stage } from '../../shared/stim.js';
import { renderer, stageEl } from './setup.ts';
import { applyCamera } from './view/camera.ts';
import { draw } from './loop.ts';

// Keep the canvas the size of the stage.
function resize(): void {
  const w = stageEl.clientWidth || 1;
  const h = stageEl.clientHeight || 1;
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(w, h, false);
  applyCamera(w / h);
  draw();
}
new ResizeObserver(resize).observe(stageEl);
resize();
stage('first-frame');
