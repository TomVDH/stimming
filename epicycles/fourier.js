// Epicycles maths: resample a closed stroke, take its DFT, rebuild its path.
// Shape units: the shape fits a box of -1 to 1; y points down.

// Points on the resampled stroke.
export const N = 512;
// Bins of the rebuilt path, per loop.
export const M = 2048;

/**
 * Resamples a stroke to n points, evenly spaced by arc length.
 * The stroke closes with a straight line back to its start.
 * @param {number[][]} pts [x, y] pairs
 * @returns {Float64Array} x, y interleaved
 */
export function resample(pts, n = N) {
  const m = pts.length;
  const cum = new Float64Array(m + 1);
  for (let i = 0; i < m; i++) {
    const a = pts[i], b = pts[(i + 1) % m];
    cum[i + 1] = cum[i] + Math.hypot(b[0] - a[0], b[1] - a[1]);
  }
  const total = cum[m] || 1;
  const out = new Float64Array(2 * n);
  let j = 0;
  for (let i = 0; i < n; i++) {
    const s = (i / n) * total;
    while (j < m - 1 && cum[j + 1] < s) j++;
    const a = pts[j], b = pts[(j + 1) % m];
    const seg = cum[j + 1] - cum[j];
    const t = seg > 0 ? (s - cum[j]) / seg : 0;
    out[2 * i] = a[0] + (b[0] - a[0]) * t;
    out[2 * i + 1] = a[1] + (b[1] - a[1]) * t;
  }
  return out;
}

/**
 * The DFT of a closed path, as circles sorted by radius.
 * Each term turns k times per loop; k runs from -n/2 + 1 to n/2.
 * @param {Float64Array} z x, y interleaved, n points
 * @returns {{ c0: number[], terms: { k: number, re: number, im: number, r: number }[] }}
 */
export function spectrum(z) {
  const n = z.length / 2;
  const terms = [];
  let c0 = [0, 0];
  for (let k = -n / 2 + 1; k <= n / 2; k++) {
    let re = 0, im = 0;
    for (let i = 0; i < n; i++) {
      const a = (-2 * Math.PI * k * i) / n;
      const c = Math.cos(a), s = Math.sin(a);
      const x = z[2 * i], y = z[2 * i + 1];
      re += x * c - y * s;
      im += x * s + y * c;
    }
    re /= n; im /= n;
    if (k === 0) c0 = [re, im];
    else terms.push({ k, re, im, r: Math.hypot(re, im) });
  }
  terms.sort((a, b) => b.r - a.r);
  return { c0, terms };
}

// One in-place radix-2 FFT. sign +1 is the inverse, unscaled.
function fft(re, im, sign) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const a = (sign * 2 * Math.PI) / len;
    const wr = Math.cos(a), wi = Math.sin(a);
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let j = 0; j < len / 2; j++) {
        const p = i + j, q = p + len / 2;
        const xr = re[q] * cr - im[q] * ci, xi = re[q] * ci + im[q] * cr;
        re[q] = re[p] - xr; im[q] = im[p] - xi;
        re[p] += xr; im[p] += xi;
        const t = cr * wr - ci * wi;
        ci = cr * wi + ci * wr; cr = t;
      }
    }
  }
}

/**
 * The weight of circle j for a count: whole, growing, or gone.
 * @param {number} j
 * @param {number} count A real number of circles.
 */
export const weight = (j, count) => Math.max(0, Math.min(1, count - j));

/**
 * The pen's path over one loop for a count of circles, in M bins.
 * @returns {Float64Array} x, y interleaved, M points
 */
export function path(spec, count, out = new Float64Array(2 * M)) {
  const re = new Float64Array(M), im = new Float64Array(M);
  re[0] = spec.c0[0]; im[0] = spec.c0[1];
  const n = Math.min(spec.terms.length, Math.ceil(count));
  for (let j = 0; j < n; j++) {
    const t = spec.terms[j], w = weight(j, count);
    const b = ((t.k % M) + M) % M;
    re[b] += t.re * w; im[b] += t.im * w;
  }
  fft(re, im, 1);
  for (let m = 0; m < M; m++) { out[2 * m] = re[m]; out[2 * m + 1] = im[m]; }
  return out;
}

/**
 * Walks the chain at angle theta. Calls fn(cx, cy, r, x1, y1, j, w) per circle.
 * @returns {number[]} The pen's point.
 */
export function chain(spec, count, theta, fn) {
  let x = spec.c0[0], y = spec.c0[1];
  const n = Math.min(spec.terms.length, Math.ceil(count));
  for (let j = 0; j < n; j++) {
    const t = spec.terms[j], w = weight(j, count);
    const a = t.k * theta, c = Math.cos(a), s = Math.sin(a);
    const dx = (t.re * c - t.im * s) * w, dy = (t.re * s + t.im * c) * w;
    fn?.(x, y, t.r * w, x + dx, y + dy, j, w);
    x += dx; y += dy;
  }
  return [x, y];
}

/**
 * The harmonics of the path's x and y, for two PeriodicWaves.
 * Harmonic h joins the terms k = h and k = -h.
 * @returns {{ xr: Float32Array, xi: Float32Array, yr: Float32Array, yi: Float32Array }}
 */
export function harmonics(spec, count, H = 128) {
  const xr = new Float32Array(H + 1), xi = new Float32Array(H + 1);
  const yr = new Float32Array(H + 1), yi = new Float32Array(H + 1);
  const n = Math.min(spec.terms.length, Math.ceil(count));
  for (let j = 0; j < n; j++) {
    const t = spec.terms[j], h = Math.abs(t.k);
    if (h > H) continue;
    const w = weight(j, count), a = t.re * w, b = t.im * w;
    // Re(c e^{ikθ}) and Im(c e^{ikθ}) split into cosine and sine parts.
    const sg = Math.sign(t.k);
    xr[h] += a; xi[h] -= sg * b;
    yr[h] += b; yi[h] += sg * a;
  }
  return { xr, xi, yr, yi };
}

/* ---------- samples ---------- */
// SVG paths in a box of -100 to 100, y down.
export const SAMPLES = [
  { name: 'fish', d: 'M-86 4 C-80 -26 -40 -46 4 -42 C34 -39 52 -22 60 -8 L94 -40 Q78 0 94 40 L60 8 C50 24 30 40 2 42 C-30 44 -66 34 -80 18 L-70 10 L-86 4 Z' },
  { name: 'cat', d: 'M-60 -14 L-64 -82 L-22 -52 C-8 -56 8 -56 22 -52 L64 -82 L60 -14 C76 8 74 44 44 58 C26 66 -26 66 -44 58 C-74 44 -76 8 -60 -14 Z' },
  { name: 'star', star: 5 },
  { name: 'bird', d: 'M-96 -18 C-70 -40 -40 -40 -12 -14 C-6 -40 10 -64 40 -78 C30 -50 26 -26 30 -6 C50 -8 72 -2 96 14 C70 20 40 24 22 22 C10 36 -14 44 -40 40 C-20 30 -10 18 -12 6 C-40 -14 -66 -20 -96 -18 Z' },
  { name: 'heart', heart: true },
];

// Points along one sample, in shape units.
export function samplePoints(s, n = 600) {
  if (s.star) {
    const pts = [];
    for (let i = 0; i < 2 * s.star; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / s.star, r = i % 2 ? 0.4 : 0.96;
      pts.push([Math.cos(a) * r, Math.sin(a) * r + 0.06]);
    }
    return pts;
  }
  if (s.heart) {
    const pts = [];
    for (let i = 0; i < n; i++) {
      const t = (i / n) * 2 * Math.PI;
      const x = 16 * Math.sin(t) ** 3;
      const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
      pts.push([x / 17.5, -y / 17.5 - 0.05]);
    }
    return pts;
  }
  // Path lengths need an element in the document.
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('style', 'position:absolute;width:0;height:0;visibility:hidden');
  const el = document.createElementNS(NS, 'path');
  el.setAttribute('d', s.d);
  svg.append(el);
  document.body.append(svg);
  const len = el.getTotalLength(), pts = [];
  for (let i = 0; i < n; i++) {
    const p = el.getPointAtLength((i / n) * len);
    pts.push([p.x / 100, p.y / 100]);
  }
  svg.remove();
  return pts;
}
