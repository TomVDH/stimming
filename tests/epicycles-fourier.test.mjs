// Epicycles maths: the circles redraw the shape they came from.
// Run: node --test tests/epicycles-fourier.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { N, M, resample, spectrum, path, chain, harmonics } from '../epicycles/fourier.js';

// A square, as four corners: the resample closes it.
const square = [[-1, -1], [1, -1], [1, 1], [-1, 1]];

test('resample spaces points evenly along the closed stroke', () => {
  const z = resample(square);
  assert.equal(z.length, 2 * N);
  // The perimeter is 8, so each step is 8 / N.
  for (let i = 1; i < N; i++) {
    const d = Math.abs(z[2 * i] - z[2 * i - 2]) + Math.abs(z[2 * i + 1] - z[2 * i - 1]);
    assert.ok(Math.abs(d - 8 / N) < 1e-9);
  }
});

test('the centroid is the fixed anchor; circles sort by radius', () => {
  const spec = spectrum(resample(square.map(([x, y]) => [x + 0.5, y - 0.25])));
  assert.ok(Math.abs(spec.c0[0] - 0.5) < 1e-9 && Math.abs(spec.c0[1] + 0.25) < 1e-9);
  for (let j = 1; j < spec.terms.length; j++) assert.ok(spec.terms[j - 1].r >= spec.terms[j].r);
});

test('every circle together walks the pen through each sample', () => {
  const z = resample(square), spec = spectrum(z);
  for (const i of [0, 37, 128, 301]) {
    const p = chain(spec, spec.terms.length, (2 * Math.PI * i) / N);
    assert.ok(Math.hypot(p[0] - z[2 * i], p[1] - z[2 * i + 1]) < 1e-9);
  }
});

test('the FFT path matches the chain for a part count', () => {
  const spec = spectrum(resample(square));
  const count = 7.4, buf = path(spec, count);
  for (const m of [0, 333, 1024, 2000]) {
    const p = chain(spec, count, (2 * Math.PI * m) / M);
    assert.ok(Math.hypot(p[0] - buf[2 * m], p[1] - buf[2 * m + 1]) < 1e-9);
  }
});

test('the harmonics sum to the path x and y', () => {
  const spec = spectrum(resample(square)), count = 12, h = harmonics(spec, count, 256);
  const t = 0.83;
  let x = spec.c0[0], y = spec.c0[1];
  for (let k = 1; k <= 256; k++) {
    x += h.xr[k] * Math.cos(k * t) + h.xi[k] * Math.sin(k * t);
    y += h.yr[k] * Math.cos(k * t) + h.yi[k] * Math.sin(k * t);
  }
  const p = chain(spec, count, t);
  // The harmonics are Float32, as Web Audio takes them.
  assert.ok(Math.hypot(p[0] - x, p[1] - y) < 1e-5);
});
