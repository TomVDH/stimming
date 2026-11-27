import * as THREE from 'three';

// Bake transparent portraits using the toy's existing WebGL context.
export function previewStrip(renderer, scene, root, centre, radius) {
  const size = 96, frames = 49;
  const target = new THREE.WebGLRenderTarget(size, size, { depthBuffer: true });
  target.texture.colorSpace = THREE.SRGBColorSpace;
  const cam = new THREE.PerspectiveCamera(30, 1, 0.1, 30);
  const distance = radius * 5.3;
  const bg = scene.background;
  const hidden = scene.children.filter(o => o !== root);
  const visibility = hidden.map(o => o.visible);
  hidden.forEach(o => { o.visible = false; });
  scene.background = null;
  const clear = renderer.getClearColor(new THREE.Color()), alpha = renderer.getClearAlpha();
  renderer.setClearColor(0x000000, 0);
  const pixels = new Uint8Array(size * size * 4);
  const strip = document.createElement('canvas');
  strip.width = size * frames; strip.height = size;
  const ctx = strip.getContext('2d');
  const tile = document.createElement('canvas'); tile.width = tile.height = size;
  const tc = tile.getContext('2d');
  try {
    for (let i = 0; i < frames; i++) {
      const angle = (i / (frames - 1) - 0.5) * Math.PI / 3;
      cam.position.set(Math.sin(angle) * distance, centre.y + distance * 0.15, Math.cos(angle) * distance);
      cam.lookAt(centre); cam.updateMatrixWorld();
      renderer.setRenderTarget(target); renderer.clear(); renderer.render(scene, cam);
      renderer.readRenderTargetPixels(target, 0, 0, size, size, pixels);
      const data = tc.createImageData(size, size);
      const stride = size * 4;
      for (let y = 0; y < size; y++) data.data.set(pixels.subarray((size-1-y)*stride, (size-y)*stride), y*stride);
      tc.putImageData(data, 0, 0); ctx.drawImage(tile, i*size, 0);
    }
    return strip.toDataURL('image/webp', 0.82);
  } finally {
    renderer.setRenderTarget(null); target.dispose();
    renderer.setClearColor(clear, alpha); scene.background = bg;
    hidden.forEach((o, i) => { o.visible = visibility[i]; });
  }
}
