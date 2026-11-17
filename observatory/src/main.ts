// Load order: loop runs first.
import './loop.ts';
import { pixelRatio, stage } from '../../shared/stim.js';
import { renderer, stageEl } from './setup.ts';
import { resizePost } from './post/chain.ts';
import { setStarDpr } from './sky/stars.ts';
import { applyCamera } from './view/camera.ts';
import { draw } from './loop.ts';

// Keep the canvas the size of the stage.
function resize(): void {
  const w = stageEl.clientWidth || 1;
  const h = stageEl.clientHeight || 1;
  // The site's pixel budget keeps the post chain affordable.
  const dpr = pixelRatio(w, h);
  renderer.setPixelRatio(dpr);
  renderer.setSize(w, h, false);
  resizePost(w, h);
  setStarDpr(dpr);
  applyCamera(w / h);
  draw();
}
new ResizeObserver(resize).observe(stageEl);
resize();
stage('first-frame');
