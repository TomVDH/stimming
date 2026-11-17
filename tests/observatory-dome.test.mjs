// Observatory dome motion maths. Run: node --test tests/observatory-dome.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { azDelta, clampAim, stepAxis } from '../observatory/src/core/dome.ts';

test('azDelta takes the short way', () => {
  assert.equal(azDelta(350, 10), 20);
  assert.equal(azDelta(10, 350), -20);
});
test('clampAim keeps 5° to 85°', () => {
  assert.equal(clampAim({ alt: -20, az: 90 }).alt, 5);
  assert.equal(clampAim({ alt: 89, az: 90 }).alt, 85);
});
test('stepAxis never beats the cap and lands', () => {
  let s = { pos: 350, vel: 0 };
  for (let i = 0; i < 600; i++) {
    s = stepAxis(s.pos, 10, s.vel, 1 / 30, 3, 1.5, true);
    assert.ok(Math.abs(s.vel) <= 3 + 1e-9);
  }
  assert.ok(Math.abs(azDelta(s.pos, 10)) < 0.05);
});
