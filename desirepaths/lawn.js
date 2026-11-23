// Desire paths: the park's plan, the walker and its footprints.
// The walker follows the pointer and sets one print each stride.
// A coarse copy of the wear tells the sound what lies underfoot.

// The field: 16 x 13 m at 2.5 cm a cell.
export const FIELD = { x: -8, y: -6.5, w: 16, h: 13, cell: 0.025 };
// The planner's paths. The numbers match PAVED in shaders.js.
export const PATHS = { hy: -1.7, vx: 2.4, half: 0.9 };
// Morning sun from the upper left, 24 degrees up.
const EL = 24 * Math.PI / 180, AZ = 135 * Math.PI / 180;
export const SUN = [Math.cos(EL) * Math.cos(AZ), Math.cos(EL) * Math.sin(AZ), Math.sin(EL)];

const gauss = () => { let u = 0; for (let i = 0; i < 4; i++) u += Math.random(); return (u - 2) / 0.577; };

export const pavedAt = (x, y) => Math.max(PATHS.half - Math.abs(y - PATHS.hy), PATHS.half - Math.abs(x - PATHS.vx)) > 0;

// One walker. Each print: x, y, heading, weight; then size, halo, 0, 0.
export function makeWalker() {
  const w = { x: 0, y: 0, hx: 1, hy: 0, gone: 0, side: 1, on: false, stride: 0.37 };
  // Feeds the walker a new point. Returns the prints it sets on the way.
  function to(x, y, weight, scatter, out) {
    // A new walk starts its stride at a random phase.
    if (!w.on) { w.x = x; w.y = y; w.on = true; w.gone = Math.random() * w.stride; w.side = Math.random() < 0.5 ? 1 : -1; return 0; }
    const dx = x - w.x, dy = y - w.y, d = Math.hypot(dx, dy);
    if (d < 1e-5) return 0;
    let n = 0;
    // Prints fall at each stride along the segment.
    let at = 0;
    while (w.gone + (d - at) >= w.stride) {
      const step = w.stride - w.gone;
      at += step;
      const px = w.x + dx * at / d, py = w.y + dy * at / d;
      w.hx += (dx / d - w.hx) * 0.6; w.hy += (dy / d - w.hy) * 0.6;
      const hl = Math.hypot(w.hx, w.hy) || 1;
      const hx = w.hx / hl, hy = w.hy / hl;
      // Left and right of the line, with a little scatter across it.
      const off = w.side * 0.09 + gauss() * 0.045 * scatter;
      const ang = Math.atan2(hy, hx) + w.side * -0.1 + gauss() * 0.06;
      out.push(px - hy * off + hx * gauss() * 0.03, py + hx * off + hy * gauss() * 0.03, ang, weight * (0.85 + 0.3 * Math.random()),
        1, 0.4, 0, 0);
      w.side = -w.side;
      w.gone = 0;
      w.stride = 0.37 * (0.93 + 0.14 * Math.random());
      n++;
    }
    w.gone += d - at;
    w.x = x; w.y = y;
    return n;
  }
  // Two prints side by side: someone stops there.
  function stand(x, y, weight, out) {
    const a = Math.atan2(w.hy, w.hx) || Math.PI / 2;
    for (const s of [-1, 1]) out.push(x - Math.sin(a) * s * 0.1, y + Math.cos(a) * s * 0.1, a + s * -0.12, weight, 1, 0.8, 0, 0);
  }
  return { w, to, stand, lift() { w.on = false; } };
}

// The old line across the main corner, walked both ways.
// Returns batches of prints, one batch for ten passes.
export function oldLine(passes = 150) {
  const A = [-2.6, -0.8], B = [1.5, 2.15], C = [0.15, 0.25];
  const batches = [];
  let batch = [];
  for (let k = 0; k < passes; k++) {
    const wk = makeWalker();
    // Each walker takes a line a little to one side of the last.
    const lat = gauss() * 0.11;
    const fwd = k % 2 === 0;
    for (let i = 0; i <= 60; i++) {
      const s = fwd ? i / 60 : 1 - i / 60;
      const x = (1 - s) * (1 - s) * A[0] + 2 * s * (1 - s) * C[0] + s * s * B[0];
      const y = (1 - s) * (1 - s) * A[1] + 2 * s * (1 - s) * C[1] + s * s * B[1];
      wk.to(x + lat * 0.7, y - lat * 0.7, 1, 1.4, batch);
    }
    if (k % 10 === 9) { batches.push(batch); batch = []; }
  }
  if (batch.length) batches.push(batch);
  return batches;
}

// A coarse copy of the wear, 20 cm a cell, for the sound only.
export function makeCoarse() {
  const C = 0.2, nx = Math.ceil(FIELD.w / C), ny = Math.ceil(FIELD.h / C);
  const W = new Float32Array(nx * ny), F = new Float32Array(nx * ny);
  const at = (x, y) => {
    const i = Math.floor((x - FIELD.x) / C), j = Math.floor((y - FIELD.y) / C);
    return i < 0 || j < 0 || i >= nx || j >= ny ? -1 : j * nx + i;
  };
  return {
    print(x, y, k) {
      const i = at(x, y);
      if (i < 0 || pavedAt(x, y)) return;
      // A print covers about a third of a coarse cell.
      const c = 0.45 * k;
      F[i] += c * 0.35 * (1 - F[i]);
      const s = Math.min(1, Math.max(0, (F[i] - 0.2) / 0.55));
      W[i] += c * 0.05 * s * s * (3 - 2 * s) * Math.max(0, (1.3 - W[i]) / 1.3);
    },
    heal(sec) {
      for (let i = 0; i < W.length; i++) {
        W[i] = Math.max(0, W[i] - sec / 600 * (W[i] > 0.6 ? 0.6 : 1));
        if (W[i] < 0.3) F[i] = Math.max(0, F[i] - sec / 240);
      }
    },
    wear(x, y) { const i = at(x, y); return i < 0 ? 0 : W[i]; },
    clear() { W.fill(0); F.fill(0); },
    max() { let m = 0; for (const v of W) m = Math.max(m, v); return m; },
  };
}
