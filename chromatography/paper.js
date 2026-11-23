// Chromatography paper: one fibre map, drawn once per sheet in Canvas 2D.
// R: formation, the cloudy density of the sheet. G: fibre height. B: edge fuzz.
// The same map sets the sim's permeability, so the water follows the fibres.
import { N, R_CELLS } from './sim.js';

export const FIBRE = 1024;

// A seeded random source; each sheet gets its own fibres.
function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}
// Value noise on a wrapped lattice of n cells.
function lattice(n, rnd) {
  const g = new Float32Array(n * n);
  for (let i = 0; i < g.length; i++) g[i] = rnd();
  return (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi;
    const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
    const at = (i, j) => g[(((j % n) + n) % n) * n + (((i % n) + n) % n)];
    const a = at(xi, yi), b = at(xi + 1, yi), c = at(xi, yi + 1), d = at(xi + 1, yi + 1);
    return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
  };
}

export function makePaper(seed = 1) {
  const rnd = rng(seed * 7919 + 13);
  const S = FIBRE;
  // Formation: flocs of fibre at 2 to 8 mm, the cloudiness seen against light.
  const n1 = lattice(32, rnd), n2 = lattice(64, rnd), n3 = lattice(128, rnd);
  const form = new Float32Array(256 * 256);
  for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
    const u = x / 256, v = y / 256;
    form[y * 256 + x] = 0.45 * n1(u * 32, v * 32) + 0.35 * n2(u * 64, v * 64) + 0.2 * n3(u * 128, v * 128);
  }
  // Fibres: short curved strokes, light and dark, at every angle.
  const cv = document.createElement('canvas');
  cv.width = S; cv.height = S;
  const c = cv.getContext('2d', { willReadFrequently: true });
  c.fillStyle = 'rgb(128 128 128)';
  c.fillRect(0, 0, S, S);
  c.lineCap = 'round';
  const strokes = 26000;
  for (let i = 0; i < strokes; i++) {
    const x = rnd() * S, y = rnd() * S, a = rnd() * Math.PI * 2;
    const len = 6 + rnd() * rnd() * 34, bend = (rnd() - 0.5) * 0.9;
    const up = rnd() < 0.55;
    c.strokeStyle = up ? `rgb(255 255 255 / ${0.05 + rnd() * 0.12})` : `rgb(0 0 0 / ${0.04 + rnd() * 0.09})`;
    c.lineWidth = 0.6 + rnd() * 0.9;
    c.beginPath();
    c.moveTo(x, y);
    const mx = x + Math.cos(a) * len * 0.5 + Math.cos(a + 1.57) * bend * len * 0.3;
    const my = y + Math.sin(a) * len * 0.5 + Math.sin(a + 1.57) * bend * len * 0.3;
    c.quadraticCurveTo(mx, my, x + Math.cos(a + bend) * len, y + Math.sin(a + bend) * len);
    c.stroke();
  }
  const fib = c.getImageData(0, 0, S, S).data;
  // The packed map: formation upsampled, fibre height, and edge fuzz.
  const map = new Uint8Array(S * S * 4);
  const nE = lattice(512, rnd);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const i = y * S + x;
    const fx = x / S * 256, fy = y / S * 256;
    const x0 = Math.min(255, Math.floor(fx)), y0 = Math.min(255, Math.floor(fy));
    const x1 = Math.min(255, x0 + 1), y1 = Math.min(255, y0 + 1), tx = fx - x0, ty = fy - y0;
    const f = (form[y0 * 256 + x0] * (1 - tx) + form[y0 * 256 + x1] * tx) * (1 - ty) + (form[y1 * 256 + x0] * (1 - tx) + form[y1 * 256 + x1] * tx) * ty;
    map[i * 4] = Math.round(Math.min(1, Math.max(0, f)) * 255);
    map[i * 4 + 1] = fib[i * 4];
    map[i * 4 + 2] = Math.round(nE(x / S * 512, y / S * 512) * 255);
    map[i * 4 + 3] = 255;
  }
  // Permeability per sim cell: denser flocs and fibre clumps slow the water.
  const K = new Float32Array(N * N);
  const c0 = N / 2, step = S / N;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const r = Math.hypot(x + 0.5 - c0, y + 0.5 - c0);
    if (r > R_CELLS) continue;
    let fsum = 0;
    for (let j = 0; j < step; j += 2) for (let i = 0; i < step; i += 2) fsum += fib[((y * step + j) * S + x * step + i) * 4];
    const fb = fsum / ((step / 2) * (step / 2)) / 255;
    const f = form[Math.min(255, Math.floor(y / N * 256)) * 256 + Math.min(255, Math.floor(x / N * 256))];
    K[y * N + x] = Math.min(1, Math.max(0.22, 0.7 + 1.1 * (f - 0.5) + 1.6 * (fb - 0.5) + 0.2 * (rnd() - 0.5)));
  }
  return { map, K };
}
