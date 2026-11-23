// Contour map summit marks: a survey triangle and the height on each peak.
// Peaks are found on a lattice, then climbed to their highest cell.
// A mark follows its peak, and its number counts as the peak rises.
import { N } from './terrain.js';

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
// A peak must stand this high and rise this far above its ring.
const MIN_H = 120, MIN_PROM = 55, RING = 16;
// Marks stand at least this far apart, in CSS pixels.
const GAP = 120;
const MAX = 10;

export function makeSummits(T, water) {
  const list = [];
  let scanT = 0;

  // Climbs to the highest cell near (x, y).
  function climb(x, y) {
    let c = clamp(Math.round(y), 1, N - 2) * N + clamp(Math.round(x), 1, N - 2);
    for (let i = 0; i < 200; i++) {
      let best = c;
      for (const d of [-1, 1, -N, N, -N - 1, -N + 1, N - 1, N + 1]) if (T.h[c + d] > T.h[best]) best = c + d;
      if (best === c) break;
      c = best;
      const cx = c % N, cy = (c - cx) / N;
      if (cx < 1 || cy < 1 || cx > N - 2 || cy > N - 2) return null;
    }
    // A parabola through three cells puts the top between them.
    const cx = c % N, cy = (c - cx) / N, h = T.h;
    const fx = (h[c - 1] - h[c + 1]) / (2 * (h[c - 1] - 2 * h[c] + h[c + 1]) || 1);
    const fy = (h[c - N] - h[c + N]) / (2 * (h[c - N] - 2 * h[c] + h[c + N]) || 1);
    return [cx + clamp(fx, -0.5, 0.5), cy + clamp(fy, -0.5, 0.5)];
  }
  function prominent(x, y, top) {
    let low = Infinity;
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * Math.PI * 2;
      low = Math.min(low, T.at(x + Math.cos(a) * RING, y + Math.sin(a) * RING));
    }
    return top - low >= MIN_PROM;
  }

  // Finds the peaks in view, highest first, kept apart.
  function find(view) {
    const [x0, y0, x1, y1] = view.box, st = 4;
    const found = [];
    for (let y = y0 + st; y < y1 - st; y += st) {
      for (let x = x0 + st; x < x1 - st; x += st) {
        const h = T.at(x, y);
        if (h < MIN_H) continue;
        let top = true;
        for (let j = -3; j <= 3 && top; j++) for (let i = -3; i <= 3; i++) if ((i || j) && T.at(x + i * st, y + j * st) > h) { top = false; break; }
        if (!top) continue;
        const p = climb(x, y);
        if (!p) continue;
        const ph = T.at(p[0], p[1]);
        if (water.levelAt(p[0], p[1]) !== null || !prominent(p[0], p[1], ph)) continue;
        if (found.some(f => Math.hypot(f[0] - p[0], f[1] - p[1]) < 3)) continue;
        found.push([p[0], p[1], ph]);
      }
    }
    found.sort((a, b) => b[2] - a[2]);
    const out = [];
    for (const f of found) {
      if (out.length >= MAX) break;
      if (!view.ok(f[0], f[1], 46)) continue;
      if (out.some(o => Math.hypot(o[0] - f[0], o[1] - f[1]) * view.s < GAP)) continue;
      out.push(f);
    }
    return out;
  }

  /**
   * Keeps each mark on its peak and its height current.
   * Returns true while any mark fades or moves.
   */
  function update(dt, view, changed, calm, now = false) {
    scanT -= dt;
    if ((changed && scanT <= 0) || now) {
      scanT = 0.2;
      const peaks = find(view);
      const used = new Set();
      for (const m of list) {
        let bi = -1, bd = 12;
        peaks.forEach((p, i) => { const d = Math.hypot(p[0] - m.x, p[1] - m.y); if (!used.has(i) && d < bd) { bd = d; bi = i; } });
        if (bi >= 0) { used.add(bi); m.x = peaks[bi][0]; m.y = peaks[bi][1]; m.on = true; }
        else m.on = false;
      }
      peaks.forEach((p, i) => { if (!used.has(i)) list.push({ x: p[0], y: p[1], h: p[2], a: calm || now ? 1 : 0, on: true, born: !now }); });
    }
    let busy = false;
    for (const m of list) {
      if (changed) {
        // The mark rides its peak as it moves.
        const p = climb(m.x, m.y);
        if (p && Math.hypot(p[0] - m.x, p[1] - m.y) < 6) { m.x = p[0]; m.y = p[1]; }
        m.h = T.at(m.x, m.y);
      }
      const to = m.on ? 1 : 0;
      if (m.a !== to) { m.a = calm ? to : clamp(m.a + Math.sign(to - m.a) * dt / 0.3, 0, 1); busy = true; }
    }
    for (let i = list.length - 1; i >= 0; i--) if (!list[i].on && list[i].a <= 0) list.splice(i, 1);
    return busy;
  }

  // New marks that have just landed, for a sound; each is told once.
  function fresh() {
    const out = list.filter(m => m.born && m.a > 0);
    out.forEach(m => { m.born = false; });
    return out;
  }
  function clear() { list.length = 0; }
  return { list, update, fresh, clear };
}
