// The slit offset for the hero's German mount.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { slitAzFor, slitOffset } from '../observatory/src/core/mount.ts';

test('the slit offset stays small, finite and smooth across the sky', () => {
  let prev = null;
  for (let alt = 5; alt <= 85; alt += 5) {
    for (let az = 0; az < 360; az += 2) {
      const o = slitOffset(alt, az);
      assert.ok(Number.isFinite(o) && Math.abs(o) <= 12, `${alt}/${az}: ${o}`);
      // Near the pole the mount swings fast, as a real one does.
      const nearPole = Math.abs(alt - 51) < 15 && (az < 25 || az > 335);
      // At the meridian the mount flips sides, so the offset jumps there.
      const meridian = Math.abs(az - 180) <= 2 || az <= 2 || az >= 358;
      if (prev !== null && az > 0 && !nearPole && !meridian) assert.ok(Math.abs(o - prev) < 3, `${alt}/${az}: jump ${o - prev}`);
      prev = o;
    }
  }
});
test('the counterweight stays down: east targets put the tube west, so the slit turns west', () => {
  const east = slitOffset(40, 150), west = slitOffset(40, 210);
  assert.ok(east > 2 && east <= 12, `east target, offset ${east}`);
  assert.ok(west < -2 && west >= -12, `west target, offset ${west}`);
  assert.ok(slitAzFor(40, 150) > 150 && slitAzFor(40, 210) < 210);
});
