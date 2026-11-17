// Observatory sky clock. Run: node --test tests/observatory-clock.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeClock, TRAIL_SPEED } from '../observatory/src/core/clock.ts';

// A fake real clock the test moves by hand.
const fake = (t0 = 1.7e12) => { let t = t0; return { now: () => t, add: (ms) => { t += ms; } }; };

test('at speed 1 the sky follows the real clock', () => {
  const r = fake(), c = makeClock(r.now);
  assert.ok(Math.abs(c.skyMs() - r.now()) <= 1);
  r.add(5000); c.step(5);
  assert.ok(Math.abs(c.skyMs() - r.now()) <= 1);
});

test('at speed 600, 1 s real gives 600 s sky', () => {
  const r = fake(), c = makeClock(r.now);
  c.setSpeed(600);
  const a = c.skyMs();
  r.add(1000); c.step(1);
  assert.ok(Math.abs(c.skyMs() - a - 600000) <= 1);
});

test('trails() is false at 119 and true at 120', () => {
  const c = makeClock(fake().now);
  assert.equal(TRAIL_SPEED, 120);
  c.setSpeed(119); assert.equal(c.trails(), false);
  c.setSpeed(120); assert.equal(c.trails(), true);
});

test('setSpeed keeps the sky time continuous', () => {
  const r = fake(), c = makeClock(r.now);
  r.add(1000); c.step(1);
  const a = c.skyMs();
  c.setSpeed(300);
  assert.ok(Math.abs(c.skyMs() - a) <= 1);
});

test('wake after 3 h eases the sky to real time over 1 s', () => {
  const r = fake(), c = makeClock(r.now);
  c.step(0.016);
  const shown = c.skyMs();
  r.add(3 * 3600 * 1000);
  c.wake();
  const gap = r.now() - shown;
  // Still the old sky at the start.
  assert.ok(Math.abs(c.skyMs() - shown) < gap * 0.02);
  c.step(0.5); r.add(500);
  const left = r.now() - c.skyMs();
  assert.ok(Math.abs(left / gap - 0.5) < 0.1, `left ${left / gap}`);
  assert.equal(c.easing(), true);
  c.step(0.6); r.add(600);
  assert.ok(Math.abs(c.skyMs() - r.now()) <= 1);
  assert.equal(c.easing(), false);
});

test('a wake while the loop runs does nothing', () => {
  const r = fake(), c = makeClock(r.now);
  r.add(16); c.step(0.016);
  c.wake();
  assert.equal(c.easing(), false);
  assert.ok(Math.abs(c.skyMs() - r.now()) <= 1);
});
