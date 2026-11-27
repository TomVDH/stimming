import { makeRender } from './render.js';
import { STARS, R, BCRIT } from './sun.js';
import { portraitFrame, portraitNeedsRoom, portraitBounds, portraitLoopState, turnPortraitFrame } from './portrait-frame.js';

const visible = async () => {
  if (!document.hidden) return;
  await new Promise(resolve => {
    const resume = () => { if (!document.hidden) { document.removeEventListener('visibilitychange', resume); resolve(); } };
    document.addEventListener('visibilitychange', resume);
  });
};

export async function renderScenePortraits(ids, onPortrait) {
  if (!ids.length) return null;
  const source = document.createElement('canvas'); source.width = source.height = 288;
  const gl = source.getContext('webgl2', { alpha: true, premultipliedAlpha: false, antialias: false, depth: false, preserveDrawingBuffer: true });
  if (!gl) throw new Error('WebGL 2 is unavailable');
  const dispose = () => gl.getExtension('WEBGL_lose_context')?.loseContext();
  try {
    const renderer = await makeRender(gl, { star: ids[0], portrait: true });
    renderer.resize(288, 288, 1, 1);
    const sample = document.createElement('canvas'); sample.width = sample.height = 144;
    const sampleCtx = sample.getContext('2d');
    const metadata = new Map();
    const readyFrame = async frame => {
      for (let attempt = 0; attempt < 1200; attempt++) {
        await visible();
        if (gl.isContextLost()) throw new Error('Portrait context was lost');
        if (renderer.frame(frame) === true) return;
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      throw new Error('Portrait shader did not finish');
    };
    for (const id of ids) {
      const frame = portraitFrame(id, renderer.data);
      let bounds;
      for (let fit = 0; fit < 6; fit++) {
        let edge = false;
        bounds = null;
        // Cardinal phases reserve one stable envelope for the entire loop.
        for (let phase = 0; phase < (STARS[id].hole ? 1 : 4); phase++) {
          turnPortraitFrame(frame, portraitLoopState(phase * 30000));
          await readyFrame(frame);
          sampleCtx.clearRect(0, 0, 144, 144); sampleCtx.drawImage(source, 0, 0, 144, 144);
          const pixels = sampleCtx.getImageData(0, 0, 144, 144).data;
          edge ||= portraitNeedsRoom(pixels, 144, 144);
          const b = portraitBounds(pixels, 144, 144, 6);
          if (b && !bounds) bounds = b;
          else if (b) {
            const right = Math.max(bounds.x + bounds.width, b.x + b.width), bottom = Math.max(bounds.y + bounds.height, b.y + b.height);
            bounds.x = Math.min(bounds.x, b.x); bounds.y = Math.min(bounds.y, b.y);
            bounds.width = right - bounds.x; bounds.height = bottom - bounds.y;
          }
        }
        if (!edge || fit === 5) break;
        frame.view[2] *= 1.35; frame.view[3] *= 1.35;
        frame.centre.set([.5 - frame.view[0] / frame.view[2] * .5, .5 - frame.view[1] / frame.view[3] * .5]);
        if (frame.hole[0]) frame.holeSky[0] = 2 * frame.view[3] / 288 * BCRIT / R;
      }
      if (!bounds) throw new Error(`Empty portrait for ${id}`);
      turnPortraitFrame(frame, portraitLoopState(0)); await readyFrame(frame);
      const crop = document.createElement('canvas'), scale = 144 / Math.max(bounds.width, bounds.height);
      crop.width = Math.max(1, Math.round(bounds.width * scale)); crop.height = Math.max(1, Math.round(bounds.height * scale));
      crop.getContext('2d').drawImage(source, bounds.x * 2, bounds.y * 2, bounds.width * 2, bounds.height * 2, 0, 0, crop.width, crop.height);
      const blob = await new Promise(resolve => crop.toBlob(resolve, 'image/webp', .92));
      if (!blob) throw new Error(`Could not encode ${id}`);
      metadata.set(id, { frame, bounds, width: crop.width, height: crop.height });
      onPortrait(id, blob);
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    let hoverSize = false;
    const draw = (id, elapsed) => {
      if (gl.isContextLost()) throw new Error('Portrait context was lost');
      const m = metadata.get(id);
      if (!m || STARS[id].hole) return false;
      if (!hoverSize) { renderer.resize(192, 192, 1, 1); hoverSize = true; }
      if (canvas.width !== m.width || canvas.height !== m.height) { canvas.width = m.width; canvas.height = m.height; }
      const loop = portraitLoopState(elapsed);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.globalCompositeOperation = 'lighter';
      for (const [second, weight] of [[false, 1 - loop.blend], [true, loop.blend]]) {
        if (weight < .000001) continue;
        turnPortraitFrame(m.frame, loop, second);
        if (renderer.frame(m.frame) !== true) return false;
        ctx.globalAlpha = weight;
        const b = m.bounds, scale = source.width / 144;
        ctx.drawImage(source, b.x * scale, b.y * scale, b.width * scale, b.height * scale, 0, 0, canvas.width, canvas.height);
      }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      return true;
    };
    return { canvas, draw, dispose };
  } catch (error) { dispose(); throw error; }
}
