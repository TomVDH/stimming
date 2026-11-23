// Observatory sky controls. Run: node --test tests/observatory-skyctl.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { bortleGlow, bortleMag, nightShiftMs, NIGHTS, SITES } from '../observatory/src/core/skyctl.ts';
import { lst } from '../observatory/src/core/sky.ts';

const SIDEREAL_DAY_MS = 86164091;

test('nights: tonight first, then the four seasons', () => {
  assert.deepEqual(NIGHTS.map(n => n.id), ['tonight', 'winter', 'spring', 'summer', 'autumn']);
  assert.deepEqual(NIGHTS.map(n => n.lstH), [null, 5.5, 10.5, 19.5, 23.0]);
});

test('sites: home first, with their latitudes and labels', () => {
  assert.deepEqual(SITES.map(s => [s.id, s.lat]), [['home', 51], ['tropics', 20], ['equator', 0], ['andes', -24]]);
  assert.deepEqual(SITES.map(s => s.label), ['Home 51° N', 'Tropics 20° N', 'Equator 0°', 'Andes 24° S']);
});

test('nightShiftMs puts the LST at the night', () => {
  for (const real of [1.7e12, 1.73e12, 1.79e12]) {
    for (const h of [5.5, 10.5, 19.5, 23.0]) {
      const ms = nightShiftMs(real, h, 0);
      const d = ((lst(real + ms, 0) - h * 15) % 360 + 540) % 360 - 180;
      assert.ok(Math.abs(d) < 0.01, `real ${real} h ${h} off by ${d}`);
      assert.ok(Math.abs(ms) <= SIDEREAL_DAY_MS / 2, `shift ${ms}`);
    }
  }
});

test('bortleMag gives the faintest star for classes 1 to 9', () => {
  assert.deepEqual([1, 2, 3, 4, 5, 6, 7, 8, 9].map(bortleMag), [7.6, 7.1, 6.6, 6.1, 5.6, 5.1, 4.6, 4.2, 4.0]);
});

test('bortleMag rounds and clamps its class', () => {
  assert.equal(bortleMag(0), 7.6); assert.equal(bortleMag(12), 4.0); assert.equal(bortleMag(2.4), 7.1);
});

test('bortleGlow: class 1 has no lift and no towns', () => {
  assert.deepEqual(bortleGlow(1), { lift: 0, towns: [0, 0, 0, 0] });
});

test('bortleGlow: class 2 has one faint town and no lift', () => {
  const g = bortleGlow(2);
  assert.equal(g.lift, 0);
  assert.ok(g.towns[0] > 0 && g.towns.slice(1).every(t => t === 0));
});

test('bortleGlow: the lift and every town grow with the class', () => {
  for (let b = 2; b <= 9; b++) {
    const a = bortleGlow(b - 1), c = bortleGlow(b);
    assert.ok(c.lift >= a.lift, `lift ${b}`);
    c.towns.forEach((t, i) => assert.ok(t >= a.towns[i], `town ${i} at ${b}`));
  }
  assert.ok(bortleGlow(9).towns.every(t => t > 0));
});
