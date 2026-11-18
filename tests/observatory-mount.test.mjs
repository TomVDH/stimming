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
      if (prev !== null && az > 0 && !nearPole) assert.ok(Math.abs(o - prev) < 3, `${alt}/${az}: jump ${o - prev}`);
      prev = o;
    }
  }
});
test('on the southern meridian the tube rides east, so the slit turns east', () => {
  const o = slitOffset(40, 180);
  assert.ok(o < -2 && o > -10, `offset ${o}`);
  assert.ok(slitAzFor(40, 180) < 180);
});
