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
// A new quality choice clears the slow-frame step.

import { quality, onQuality, pixelRatio } from './stim.js';

export const LEVELS = ['Low', 'Standard', 'High'];

export function detail({ maxDpr = 2, budget = 1.4e6, onChange = null } = {}) {
  let rung = 0, runT = 0, avg = 1 / 60, slowT = 0;
  const clear = () => { rung = 0; runT = 0; avg = 1 / 60; slowT = 0; };
  const d = {
    get level() { return Math.max(0, (quality() === 'high' ? 2 : 1) - rung); },
    // The smoothed frame time in seconds.
    get frameTime() { return avg; },
    // The pixel ratio for a w x h surface, by the site's rules.
    dpr(w, h) { return pixelRatio(w, h, { maxDpr, budget, low: rung > 0 }); },
    // Watches the frame time. The first four seconds do not count: shaders compile then.
    // Two seconds under 38 fps step the level down once.
    frame(dt) {
      if (!dt || dt > 0.5) return;
      avg += (dt - avg) * 0.1;
      if (rung) return;
      runT += dt;
      if (runT < 4) return;
      slowT = avg > 1 / 38 ? slowT + dt : 0;
      if (slowT > 2) d.drop();
    },
    // Steps down at once, as slow frames do.
    drop() { if (!rung) { rung = 1; onChange?.(d.level); } },
    // Returns to the level the quality setting gives.
    reset() { clear(); onChange?.(d.level); },
  };
  onQuality(() => d.reset());
  return d;
}
