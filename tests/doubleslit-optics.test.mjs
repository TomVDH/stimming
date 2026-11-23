// Double slit optics: the sampler follows the two-slit intensity.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { intensity, makeSampler, spectralRGB, GAP_TO_WIDTH, DARK } from '../doubleslit/optics.js';

// A seeded generator keeps the test stable.
function lcg(seed = 1) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
}

test('two slits: dark fringes fall at odd half periods', () => {
  // A dark fringe sits where cos(pi * 5 * u) is zero.
  const u = 1 / (2 * GAP_TO_WIDTH);
  assert.ok(intensity(u, 532, 2) < 1e-9);
  assert.ok(intensity(0, 532, 2) > 0.999);
  // One slit has no zero there.
  assert.ok(intensity(u, 532, 1) > 0.9);
});

test('a longer wavelength spreads the fringes', () => {
  const u = 1 / (2 * GAP_TO_WIDTH);
  assert.ok(intensity(u * 660 / 532, 660, 2) < 1e-9);
});

test('the sampler fills bright fringes and leaves dark ones', () => {
  const rnd = lcg(7);
  const s = makeSampler(rnd);
  const span = 1.8;
  s.build(532, 2, span);
  const n = 200000;
  // Plate x of the centre fringe and of the first dark fringe.
  const dark = 1 / (2 * GAP_TO_WIDTH) / span;
  let bright = 0, dim = 0;
  const w = 0.004;
  for (let i = 0; i < n; i++) {
    const x = s.x();
    assert.ok(x >= -1 && x <= 1);
    if (Math.abs(x) < w) bright++;
    if (Math.abs(x - dark) < w) dim++;
  }
  // Only dark counts and the bin edge land on a dark fringe.
  assert.ok(bright > 20 * Math.max(1, dim), `bright ${bright}, dim ${dim}`);
  assert.ok(dim > 0 || DARK === 0);
});

test('one slit: no fringe at the first dark fringe of two slits', () => {
  const rnd = lcg(3);
  const s = makeSampler(rnd);
  s.build(532, 1, 1.8);
  const dark = 1 / (2 * GAP_TO_WIDTH) / 1.8;
  let a = 0, b = 0;
  for (let i = 0; i < 200000; i++) {
    const x = s.x();
    if (Math.abs(x) < 0.004) a++;
    if (Math.abs(x - dark) < 0.004) b++;
  }
  assert.ok(b > a * 0.8, `centre ${a}, off ${b}`);
});

test('spectral colours: red, green and violet lead their channels', () => {
  const [r1] = spectralRGB(650);
  const [, g2] = spectralRGB(532);
  const [, , b3] = spectralRGB(440);
  assert.equal(r1, 1);
  assert.equal(g2, 1);
  assert.equal(b3, 1);
});
