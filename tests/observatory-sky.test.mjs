// Observatory sky maths. Run: node --test tests/observatory-sky.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { dirAltAz, gmst, shellDir, skyRows, toAltAz, toRaDec, turn } from '../observatory/src/core/sky.ts';

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
// By hand, at Dec 0 and hour angle -90°:
// sin alt = cos(lat) cos(-90°) = 0.
// The azimuth is atan2(-sin H, -sin lat cos H) = atan2(1, 0) = 90°.
// At hour angle +90° it is atan2(-1, 0), so 270°.
test('a star on the equator rises due east and sets due west', () => {
  const east = toAltAz(123 + 90, 0, 123, 51), west = toAltAz(123 - 90, 0, 123, 51);
  assert.ok(Math.abs(east.alt) < 1e-9 && Math.abs(east.az - 90) < 1e-9, `east ${JSON.stringify(east)}`);
  assert.ok(Math.abs(west.alt) < 1e-9 && Math.abs(west.az - 270) < 1e-9, `west ${JSON.stringify(west)}`);
});

// The star shell's sky matrix, as sky/stars.ts turns it.
const skyAt = (ra, dec, lstDeg, lat = 51) => dirAltAz(turn(skyRows(lstDeg, lat), shellDir(ra, dec)));
// Azimuth distance to north, either side of 0°.
const offNorth = (az) => Math.min(az, 360 - az);
test('the sky matrix stands a Dec 90° star at altitude 51° due north', () => {
  for (const lstDeg of [0, 77, 200, 333]) {
    const a = skyAt(37.95, 90, lstDeg);
    assert.ok(Math.abs(a.alt - 51) < 1e-9, `alt ${a.alt} at LST ${lstDeg}`);
    assert.ok(offNorth(a.az) < 1e-6, `az ${a.az} at LST ${lstDeg}`);
  }
});
test('the sky matrix stands a Dec 0° star on the meridian at 39° due south', () => {
  for (const lstDeg of [0, 77, 200, 333]) {
    const a = skyAt(lstDeg, 0, lstDeg);
    assert.ok(Math.abs(a.alt - 39) < 1e-9, `alt ${a.alt} at LST ${lstDeg}`);
    assert.ok(Math.abs(a.az - 180) < 1e-9, `az ${a.az} at LST ${lstDeg}`);
  }
});
test('the sky matrix agrees with toAltAz', () => {
  for (const [ra, dec, lstDeg] of [[10, 20, 30], [250, -35, 100], [181, 60, 359], [95, 5, 5]]) {
    const m = skyAt(ra, dec, lstDeg), t = toAltAz(ra, dec, lstDeg, 51);
    assert.ok(Math.abs(m.alt - t.alt) < 1e-9, `alt ${m.alt} vs ${t.alt}`);
    assert.ok(offNorth(Math.abs(m.az - t.az)) < 1e-9, `az ${m.az} vs ${t.az}`);
  }
});
