// Contour map terrain: one square grid of heights in metres, on the CPU.
// The brush raises or digs; the sea floods in from the open edges.

import { drain } from './fill.js';

export const N = 512;
// Metres per cell: the sheet is about 20 km across.
export const CELL = 40;
export const H_MIN = -420, H_MAX = 1900;
// Contour interval and index interval in metres.
export const STEP = 20, INDEX = 100;

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

/* ---------- seeded gradient noise ---------- */
function mulberry(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function makeNoise(rand) {
  const p = new Uint8Array(512), gx = new Float32Array(256), gy = new Float32Array(256);
  const perm = Array.from({ length: 256 }, (_, i) => i);
  for (let i = 255; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [perm[i], perm[j]] = [perm[j], perm[i]]; }
  for (let i = 0; i < 512; i++) p[i] = perm[i & 255];
  for (let i = 0; i < 256; i++) { const a = rand() * Math.PI * 2; gx[i] = Math.cos(a); gy[i] = Math.sin(a); }
  const fade = t => t * t * t * (t * (t * 6 - 15) + 10);
  // Perlin gradient noise, about -0.7 to 0.7.
  return (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const X = xi & 255, Y = yi & 255;
    const g = (i, j, dx, dy) => { const h = p[p[X + i] + Y + j]; return gx[h] * dx + gy[h] * dy; };
    const u = fade(xf), v = fade(yf);
    const a = g(0, 0, xf, yf) + u * (g(1, 0, xf - 1, yf) - g(0, 0, xf, yf));
    const b = g(0, 1, xf, yf - 1) + u * (g(1, 1, xf - 1, yf - 1) - g(0, 1, xf, yf - 1));
    return a + v * (b - a);
  };
}

export function makeTerrain() {
  const h = new Float32Array(N * N);
  // wet: 0 dry; 1 to 255 the water reached here, 255 long ago.
  const wet = new Uint8Array(N * N);
  // The rock: a fixed grain that makes brushed hills uneven.
  const rock = new Float32Array(N * N);
  // Dirty boxes for the upload: [x0, y0, x1, y1], inclusive.
  const dirtyH = [N, N, -1, -1], dirtyW = [N, N, -1, -1];
  let front = [], ramp = new Set(), seed = 1;

  const mark = (d, x0, y0, x1, y1) => {
    d[0] = Math.min(d[0], x0); d[1] = Math.min(d[1], y0);
    d[2] = Math.max(d[2], x1); d[3] = Math.max(d[3], y1);
  };
  const take = d => { const r = d[2] < d[0] ? null : d.slice(); d[0] = d[1] = N; d[2] = d[3] = -1; return r; };

  /* ---------- a new land ---------- */
  // A coast runs across the sheet; hills rise to one side, the sea lies on the other.
  function generate(s = (Math.random() * 1e9) | 0) {
    seed = s;
    const rand = mulberry(s);
    const n1 = makeNoise(rand), n2 = makeNoise(rand), n3 = makeNoise(rand), n4 = makeNoise(rand);
    const fbm = (nz, x, y, oct, lac = 2, gain = 0.5) => {
      let sum = 0, amp = 1, f = 1, norm = 0;
      for (let o = 0; o < oct; o++) { sum += nz(x * f, y * f) * amp; norm += amp; amp *= gain; f *= lac; }
      return sum / norm;
    };
    const ridged = (x, y) => {
      let sum = 0, amp = 0.6, f = 1, w = 1;
      for (let o = 0; o < 5; o++) {
        let r = 1 - Math.abs(n3(x * f, y * f) * 1.5);
        r *= r * w;
        w = clamp(r * 1.6, 0, 1);
        sum += r * amp; amp *= 0.5; f *= 2.03;
      }
      return sum;
    };
    // The coast's direction and the land's side change with each seed.
    const ang = rand() * Math.PI * 2, ca = Math.cos(ang), sa = Math.sin(ang);
    const off = 0.08 + rand() * 0.12;
    for (let j = 0; j < N; j++) {
      for (let i = 0; i < N; i++) {
        const u = i / N * 2 - 1, v = j / N * 2 - 1;
        // A warp bends the coast into bays and capes.
        const wx = fbm(n1, u * 1.6 + 3.1, v * 1.6 + 1.7, 4) * 0.55;
        const wy = fbm(n1, u * 1.6 - 5.2, v * 1.6 + 8.3, 4) * 0.55;
        const a = (u + wx) * ca + (v + wy) * sa;
        // shape > 0 is land; it rises inland.
        let shape = off - a * 0.62 + fbm(n2, u * 2.4 + wx, v * 2.4 + wy, 5) * 0.42;
        const inland = smooth(0.0, 0.7, shape);
        const mount = ridged(u * 1.9 + wx * 0.8, v * 1.9 + wy * 0.8) * inland;
        let m;
        if (shape > 0) {
          // Lowlands stay flat; hills and ridges rise inland.
          m = 520 * Math.pow(shape, 1.45) + 900 * mount * mount + 60 * fbm(n4, u * 9, v * 9, 3) * inland;
        } else {
          // The sea floor falls gently, then steeply past the shelf.
          m = -60 * Math.min(1, -shape * 6) - 380 * Math.pow(Math.max(0, -shape - 0.08), 1.2) + 20 * fbm(n4, u * 6, v * 6, 3);
        }
        h[j * N + i] = clamp(m, H_MIN, H_MAX);
        rock[j * N + i] = 0.62 + 0.8 * (0.5 + fbm(n4, u * 7 + 11, v * 7 - 4, 4, 2.1, 0.55));
      }
    }
    // Noise leaves pits everywhere; a real land drains, bar its large basins.
    drain(h, N);
    floodAll();
    mark(dirtyH, 0, 0, N - 1, N - 1);
    mark(dirtyW, 0, 0, N - 1, N - 1);
  }

  /* ---------- the sea ---------- */
  // The open sea starts at the sheet's edges.
  // Water spreads through cells below zero; it marks the shore cells next to it.
  function floodAll() {
    wet.fill(0);
    front = [];
    ramp.clear();
    const q = [];
    const seedCell = c => { if (!wet[c] && h[c] < 0) { wet[c] = 255; q.push(c); } };
    for (let i = 0; i < N; i++) { seedCell(i); seedCell((N - 1) * N + i); seedCell(i * N); seedCell(i * N + N - 1); }
    for (let k = 0; k < q.length; k++) {
      const c = q[k], x = c % N, y = (c - x) / N;
      const nb = [x > 0 ? c - 1 : -1, x < N - 1 ? c + 1 : -1, y > 0 ? c - N : -1, y < N - 1 ? c + N : -1];
      for (const d of nb) {
        if (d < 0 || wet[d]) continue;
        wet[d] = 255;
        if (h[d] < 0) q.push(d);
      }
    }
  }

  // One layer of the flood: each front cell wets its four neighbours.
  // Returns the count of cells that the water reached.
  function floodStep() {
    if (!front.length) return 0;
    const next = [];
    let reached = 0, x0 = N, y0 = N, x1 = -1, y1 = -1;
    for (const c of front) {
      if (!(h[c] < 0)) continue;
      const x = c % N, y = (c - x) / N;
      const nb = [x > 0 ? c - 1 : -1, x < N - 1 ? c + 1 : -1, y > 0 ? c - N : -1, y < N - 1 ? c + N : -1];
      for (const d of nb) {
        if (d < 0 || wet[d]) continue;
        wet[d] = 1;
        ramp.add(d);
        reached++;
        if (h[d] < 0) next.push(d);
        const dx = d % N, dy = (d - dx) / N;
        if (dx < x0) x0 = dx; if (dx > x1) x1 = dx; if (dy < y0) y0 = dy; if (dy > y1) y1 = dy;
      }
    }
    front = next;
    if (reached) mark(dirtyW, x0, y0, x1, y1);
    return reached;
  }

  // New water ages to full over about half a second.
  function age(dt) {
    if (!ramp.size) return;
    const add = Math.max(1, Math.round(dt * 420));
    let x0 = N, y0 = N, x1 = -1, y1 = -1;
    for (const c of ramp) {
      const v = Math.min(255, wet[c] + add);
      wet[c] = v;
      if (v >= 255) ramp.delete(c);
      const x = c % N, y = (c - x) / N;
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
    mark(dirtyW, x0, y0, x1, y1);
  }

  /* ---------- the brush ---------- */
  // Adds a Gaussian bump at (cx, cy) in cells: amount in metres at the centre.
  // Returns the change at the centre cell.
  function brush(cx, cy, sigma, amount) {
    const r = Math.ceil(sigma * 3);
    const x0 = Math.max(0, Math.floor(cx - r)), x1 = Math.min(N - 1, Math.ceil(cx + r));
    const y0 = Math.max(0, Math.floor(cy - r)), y1 = Math.min(N - 1, Math.ceil(cy + r));
    if (x1 < x0 || y1 < y0) return 0;
    const k = -0.5 / (sigma * sigma);
    let crossed = 0;
    for (let y = y0; y <= y1; y++) {
      const dy = y - cy;
      for (let x = x0; x <= x1; x++) {
        const dx = x - cx, c = y * N + x;
        const g = Math.exp((dx * dx + dy * dy) * k);
        if (g < 0.002) continue;
        const old = h[c];
        // The rock grain shapes raised land; it digs evenly.
        const nv = clamp(old + amount * g * (amount > 0 ? rock[c] : 1), H_MIN, H_MAX);
        h[c] = nv;
        if ((old < 0) !== (nv < 0)) crossed++;
        // A cell that falls below zero next to water joins the flood.
        if (nv < 0 && wet[c] && !(old < 0)) front.push(c);
      }
    }
    mark(dirtyH, x0, y0, x1, y1);
    // Water already in the box spreads into the new low ground.
    if (amount < 0) {
      for (let y = y0; y <= y1; y += 1) for (let x = x0; x <= x1; x++) {
        const c = y * N + x;
        if (h[c] < 0 && wet[c] === 255 && edgeDry(c)) front.push(c);
      }
    }
    return crossed;
  }
  // Softens the land round (cx, cy): each cell moves toward its local mean.
  // k is the share of the way it moves at the centre, 0 to 1.
  const tmp = new Float32Array(N * N), tmp2 = new Float32Array(N * N);
  function soften(cx, cy, sigma, k) {
    const r = Math.ceil(sigma * 2.5), m = 3;
    const x0 = Math.max(0, Math.floor(cx - r)), x1 = Math.min(N - 1, Math.ceil(cx + r));
    const y0 = Math.max(0, Math.floor(cy - r)), y1 = Math.min(N - 1, Math.ceil(cy + r));
    if (x1 < x0 || y1 < y0) return 0;
    const bx0 = Math.max(0, x0 - m), bx1 = Math.min(N - 1, x1 + m), by0 = Math.max(0, y0 - m), by1 = Math.min(N - 1, y1 + m);
    // A box blur of radius m, in two passes.
    for (let y = by0; y <= by1; y++) for (let x = x0; x <= x1; x++) {
      let s = 0, n = 0;
      for (let i = Math.max(0, x - m); i <= Math.min(N - 1, x + m); i++) { s += h[y * N + i]; n++; }
      tmp[y * N + x] = s / n;
    }
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      let s = 0, n = 0;
      for (let j = Math.max(by0, y - m); j <= Math.min(by1, y + m); j++) { s += tmp[j * N + x]; n++; }
      tmp2[y * N + x] = s / n;
    }
    const q = -0.5 / (sigma * sigma);
    let crossed = 0;
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const c = y * N + x, dx = x - cx, dy = y - cy;
      const g = Math.exp((dx * dx + dy * dy) * q);
      if (g < 0.01) continue;
      const old = h[c], nv = old + (tmp2[c] - old) * Math.min(1, k * g);
      h[c] = nv;
      if ((old < 0) !== (nv < 0)) crossed++;
      if (nv < 0 && wet[c] && !(old < 0)) front.push(c);
    }
    mark(dirtyH, x0, y0, x1, y1);
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const c = y * N + x;
      if (h[c] < 0 && wet[c] === 255 && edgeDry(c)) front.push(c);
    }
    return crossed;
  }

  // True when a neighbour is low ground the water has not reached.
  function edgeDry(c) {
    const x = c % N, y = (c - x) / N;
    return (x > 0 && !wet[c - 1] && h[c - 1] < 0) || (x < N - 1 && !wet[c + 1] && h[c + 1] < 0) ||
      (y > 0 && !wet[c - N] && h[c - N] < 0) || (y < N - 1 && !wet[c + N] && h[c + N] < 0);
  }

  // Bilinear height at (x, y) in cells.
  function at(x, y) {
    x = clamp(x, 0, N - 1.001); y = clamp(y, 0, N - 1.001);
    const i = Math.floor(x), j = Math.floor(y), fx = x - i, fy = y - j, c = j * N + i;
    const a = h[c] + (h[c + 1] - h[c]) * fx, b = h[c + N] + (h[c + N + 1] - h[c + N]) * fx;
    return a + (b - a) * fy;
  }
  // The gradient in metres per cell, by central differences on the bilinear field.
  function grad(x, y) {
    const e = 1;
    return [(at(x + e, y) - at(x - e, y)) / (2 * e), (at(x, y + e) - at(x, y - e)) / (2 * e)];
  }
  // True when the water has reached this spot.
  function wetAt(x, y) {
    const i = clamp(Math.round(x), 0, N - 1), j = clamp(Math.round(y), 0, N - 1);
    return wet[j * N + i] > 0;
  }

  // The whole grid changed; flood says the sea must find its place again.
  function refresh(flood = false) {
    mark(dirtyH, 0, 0, N - 1, N - 1);
    if (flood) { floodAll(); mark(dirtyW, 0, 0, N - 1, N - 1); }
  }

  return {
    h, wet, generate, floodStep, age, brush, soften, at, grad, wetAt, refresh,
    takeDirtyH: () => take(dirtyH), takeDirtyW: () => take(dirtyW),
    get flooding() { return front.length > 0 || ramp.size > 0; },
    get frontSize() { return front.length; },
    get seed() { return seed; },
  };
}
