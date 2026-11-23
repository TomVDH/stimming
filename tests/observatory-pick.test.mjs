// Observatory star pick. Run: node --test tests/observatory-pick.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { nearStar, pickStar } from '../observatory/src/core/pick.ts';
import { toAltAz, toRaDec } from '../observatory/src/core/sky.ts';

const LAT = 51, LST = 100;
const star = (hip, ra, dec, mag) => ({ hip, ra, dec, mag, ci: 0.5, dist: 10, spect: 'G2', name: '', bayer: '' });
// A star that stands at an altitude and azimuth now.
const at = (hip, alt, az, mag) => { const p = toRaDec({ alt, az }, LST, LAT); return star(hip, p.ra, p.dec, mag); };

test('of two stars at the same distance, the brighter wins', () => {
  // Dec 39 and 41 lie 1 degree from Dec 40.
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
  // A brighter low star does not hide a fainter high star.
  const low = at(1, 4, 200, -1), high = at(2, 6.5, 200, 3);
  assert.equal(pickStar([low, high], { alt: 5.2, az: 200 }, LST, LAT).hip, 2);
});

/* ---------- nearStar: the star a hover shows, and a tap locks ---------- */
test('nearStar: a faint star close to the aim beats a bright star near the edge', () => {
  const faint = at(1, 40.2, 180, 5), bright = at(2, 41.4, 180, 1);
  assert.equal(nearStar([bright, faint], { alt: 40, az: 180 }, LST, LAT).hip, 1);
});

test('nearStar: of two stars at the same place, the brighter wins', () => {
  const a = at(1, 40.3, 180, 3), b = at(2, 40.3, 180, 2);
  assert.equal(nearStar([a, b], { alt: 40, az: 180 }, LST, LAT).hip, 2);
});

test('nearStar: nothing inside 1.5 degrees gives null', () => {
  assert.equal(nearStar([at(1, 41.6, 180, -1)], { alt: 40, az: 180 }, LST, LAT), null);
});

test('nearStar: a star under 5 degrees gives null', () => {
  assert.equal(nearStar([at(1, 4, 180, -1)], { alt: 4, az: 180 }, LST, LAT), null);
});

test('nearStar: a star fainter than the sky limit is skipped', () => {
  const hidden = at(1, 40.1, 180, 5.5), shown = at(2, 40.8, 180, 3);
  assert.equal(nearStar([hidden, shown], { alt: 40, az: 180 }, LST, LAT, 1.5, 5).hip, 2);
});
