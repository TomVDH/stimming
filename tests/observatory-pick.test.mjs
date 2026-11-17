// Observatory star pick. Run: node --test tests/observatory-pick.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { pickStar } from '../observatory/src/core/pick.ts';
import { toAltAz, toRaDec } from '../observatory/src/core/sky.ts';

const LAT = 51, LST = 100;
const star = (hip, ra, dec, mag) => ({ hip, ra, dec, mag, ci: 0.5, dist: 10, spect: 'G2', name: '', bayer: '' });
// A star that stands at an altitude and azimuth now.
const at = (hip, alt, az, mag) => { const p = toRaDec({ alt, az }, LST, LAT); return star(hip, p.ra, p.dec, mag); };

test('of two stars at the same distance, the brighter wins', () => {
  // Dec 39 and Dec 41 stand 1 degree from Dec 40 on one hour circle.
  const aim = toAltAz(100, 40, LST, LAT);
  const faint = star(1, 100, 41, 3), bright = star(2, 100, 39, 1);
  assert.equal(pickStar([faint, bright], aim, LST, LAT).hip, 2);
  assert.equal(pickStar([bright, faint], aim, LST, LAT).hip, 2);
});

test('of two equal stars at the same distance, the first in the list wins', () => {
  const aim = toAltAz(100, 40, LST, LAT);
  const a = star(1, 100, 41, 2), b = star(2, 100, 39, 2);
  assert.equal(pickStar([a, b], aim, LST, LAT).hip, 1);
  assert.equal(pickStar([b, a], aim, LST, LAT).hip, 2);
});

test('a star under 5 degrees is never picked', () => {
  for (const alt of [0.5, 2, 4, 4.9]) {
    // The tap lands on the star itself.
    assert.equal(pickStar([at(1, alt, 200, -1)], { alt, az: 200 }, LST, LAT), null, `alt ${alt}`);
  }
  // A brighter low star does not hide a fainter star above 5 degrees.
  const low = at(1, 4, 200, -1), high = at(2, 6.5, 200, 3);
  assert.equal(pickStar([low, high], { alt: 5.2, az: 200 }, LST, LAT).hip, 2);
});
