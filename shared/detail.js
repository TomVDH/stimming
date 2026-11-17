// The detail driver: one level for a toy's shaders and its canvas.
// It joins the site quality setting with a slow-frame watch.
//   level 2  High: the screen's own pixel ratio.
//   level 1  Standard: the toy's caps. Also High after slow frames.
//   level 0  Low: Standard after slow frames; ratio 1 and trimmed shaders.
//
// Use:
//   const D = detail({ maxDpr: 2, budget: 2.6e6, onChange: resize });
//   const dpr = D.dpr(w, h);                 // on resize
//   D.frame(dt);                             // once per frame, dt in seconds
//   const q = waterDetail(D.level);          // each bundle maps the level to its budget
// A new quality choice clears the slow-frame steps.
//
// A ladder: slow frames step down more than once.
//   const D = detail({ steps: 3, settle: 2, onChange: layout });
//   if (D.rung >= 2) ...                     // the toy maps each rung to its cuts
// The first rung lowers the pixel ratio. The toy owns the later rungs.

import { quality, onQuality, pixelRatio } from './stim.js';

export const LEVELS = ['Low', 'Standard', 'High'];

/**
 * @param {object} [options]
 * @param {number} [options.maxDpr] The Standard cap on the pixel ratio.
 * @param {number} [options.budget] The Standard cap on the pixel count.
 * @param {number} [options.steps] How many rungs slow frames may step down. 1 by default.
 * @param {number} [options.fps] Frames under this rate count as slow. 38 by default.
 * @param {number} [options.settle] Seconds the watch waits after a step, on a fresh average. 0 by default: it watches on at once.
 * @param {((level: number, rung: number) => void) | null} [options.onChange] Hears each new level (0, 1 or 2) and rung.
 */
export function detail({ maxDpr = 2, budget = 1.4e6, steps = 1, fps = 38, settle = 0, onChange = null } = {}) {
  const GRACE = 4, HOLD = 2;
  let rung = 0, runT = 0, avg = 1 / 60, slowT = 0;
  const clear = () => { rung = 0; runT = 0; avg = 1 / 60; slowT = 0; };
  const d = {
    get level() { return Math.max(0, (quality() === 'high' ? 2 : 1) - rung); },
    // The rungs stepped down so far: 0 to steps.
    get rung() { return rung; },
    // The smoothed frame time in seconds.
    get frameTime() { return avg; },
    // The pixel ratio for a w x h surface, by the site's rules.
    dpr(w, h) { return pixelRatio(w, h, { maxDpr, budget, low: rung > 0 }); },
    // Watches the frame time. The first four seconds do not count: shaders compile then.
    // Two seconds under the fps mark step down one rung.
    frame(dt) {
      if (!dt || dt > 0.5) return;
      avg += (dt - avg) * 0.1;
      if (rung >= steps) return;
      runT += dt;
      if (runT < GRACE) return;
      slowT = avg > 1 / fps ? slowT + dt : 0;
      if (slowT > HOLD) d.drop();
    },
    // Steps down one rung at once, as slow frames do.
    drop() {
      if (rung >= steps) return;
      rung++;
      slowT = 0;
      // Settle restarts the average and waits before the next rung.
      if (settle > 0) { runT = GRACE - settle; avg = 1 / 60; }
      onChange?.(d.level, rung);
    },
    // Returns to the level the quality setting gives.
    reset() { clear(); onChange?.(d.level, rung); },
  };
  onQuality(() => d.reset());
  return d;
}
