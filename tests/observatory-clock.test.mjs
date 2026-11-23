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

test('a wake before the first step does nothing', () => {
  // The boot can take seconds before the loop's first step.
  const r = fake(), c = makeClock(r.now);
  r.add(3000);
  c.wake();
  assert.equal(c.easing(), false);
  assert.ok(Math.abs(c.skyMs() - r.now()) <= 1);
});

test('a wake while the loop runs does nothing', () => {
  const r = fake(), c = makeClock(r.now);
  r.add(16); c.step(0.016);
  c.wake();
  assert.equal(c.easing(), false);
  assert.ok(Math.abs(c.skyMs() - r.now()) <= 1);
});

/* ---------- shiftTo: a named night eases the sky to another sidereal time ---------- */
test('shiftTo eases the sky to the shift over easeS, then runs at speed 1', () => {
  const r = fake(), c = makeClock(r.now);
  c.shiftTo(3600000, 3);
  assert.equal(c.shifting(), true);
  for (let i = 0; i < 30; i++) { r.add(100); c.step(0.1); }
  assert.equal(c.shifting(), false);
  assert.ok(Math.abs(c.skyMs() - (r.now() + 3600000)) <= 1);
  const a = c.skyMs(); r.add(1000); c.step(1);
  assert.ok(Math.abs(c.skyMs() - a - 1000) <= 1);
});

test('shiftTo with easeS 0 jumps', () => {
  const r = fake(), c = makeClock(r.now);
  c.shiftTo(-7200000, 0);
  assert.equal(c.shifting(), false);
  assert.ok(Math.abs(c.skyMs() - (r.now() - 7200000)) <= 1);
});

test('shiftRate is sky seconds per real second during the ease, 0 after', () => {
  const r = fake(), c = makeClock(r.now);
  c.shiftTo(3600000, 2);
  r.add(1000); c.step(1);
  // At the ease's middle the smoothstep's slope is 1.5 times the mean.
  assert.ok(Math.abs(c.shiftRate() - 1.5 * 1800) < 1, `rate ${c.shiftRate()}`);
  r.add(1500); c.step(1.5);
  assert.equal(c.shiftRate(), 0);
});

test('a wake after a shift keeps the sky continuous', () => {
  const r = fake(), c = makeClock(r.now);
  c.shiftTo(3600000, 0);
  c.step(0.016);
  const shown = c.skyMs();
  r.add(5000); c.wake();
  // The wake eases from the shown time; it never adds the shift twice.
  assert.ok(Math.abs(c.skyMs() - shown) <= 1, `jump ${c.skyMs() - shown}`);
});
