// Observatory sky maths. Run: node --test tests/observatory-sky.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { gmst, toAltAz, toRaDec } from '../observatory/src/core/sky.ts';

test('gmst at J2000.0 is 280.46061837°', () => assert.ok(Math.abs(gmst(Date.UTC(2000, 0, 1, 12)) - 280.46061837) < 1e-6));
test('a star at RA = LST and Dec 0 transits south at 90° − lat', () => {
  const a = toAltAz(123, 0, 123, 51);
  assert.ok(Math.abs(a.alt - 39) < 1e-9);
  assert.ok(Math.abs(a.az - 180) < 1e-9);
});
test('Polaris stands near the latitude at any hour', () => {
  for (let h = 0; h < 24; h++) assert.ok(Math.abs(toAltAz(37.95, 89.26, h * 15, 51).alt - 51) < 0.8);
});
test('toRaDec undoes toAltAz', () => {
  const a = toAltAz(80, 20, 200, 51), b = toRaDec(a, 200, 51);
  assert.ok(Math.abs(b.ra - 80) < 1e-9 && Math.abs(b.dec - 20) < 1e-9);
});
