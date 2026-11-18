// Observatory opening: dusk into night. Run: node --test tests/observatory-opening.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  makeOpening, driveClock, sunsetAz,
  OPENING_S, SKIP_S, BEAM_S, SUN_START, SUN_END, MAG_START, MAG_END,
} from '../observatory/src/core/opening.ts';
import { makeClock, TRAIL_SPEED } from '../observatory/src/core/clock.ts';

// A fake real clock the test moves by hand.
const fake = (t0 = 1.7e12) => { let t = t0; return { now: () => t, add: (ms) => { t += ms; } }; };
const FRAME = 1 / 60;
// Steps an opening by frames for s seconds.
const run = (op, s) => { for (let k = 0; k < Math.round(s / FRAME); k++) op.step(FRAME); };

test('the opening lasts 45 s and skips in about 1.5 s', () => {
  assert.equal(OPENING_S, 45);
  assert.ok(SKIP_S >= 1.2 && SKIP_S <= 1.8);
});

test('the sun sinks from 4 to 18 degrees below the horizon', () => {
  const op = makeOpening(false);
  assert.equal(SUN_START, -4);
  assert.equal(SUN_END, -18);
  assert.equal(op.sunAlt(), -4);
  let last = op.sunAlt();
  for (let s = 0; s < 45; s++) {
    run(op, 1);
    assert.ok(op.sunAlt() <= last, `the sun rises at ${s} s`);
    last = op.sunAlt();
  }
  assert.equal(op.sunAlt(), -18);
});

test('dusk() falls from 1 to exactly 0 at full night', () => {
  const op = makeOpening(false);
  assert.equal(op.dusk(), 1);
  run(op, 22.5);
  assert.ok(op.dusk() > 0.2 && op.dusk() < 0.8, `mid ${op.dusk()}`);
  run(op, 22.5);
  assert.equal(op.dusk(), 0);
});

test('the star limit rises from about magnitude 0 to 6.5, brightest first', () => {
  const op = makeOpening(false);
  assert.ok(Math.abs(MAG_START) <= 0.5);
  assert.equal(MAG_END, 6.5);
  assert.equal(op.magLimit(), MAG_START);
  let last = op.magLimit();
  for (let s = 0; s < 45; s++) {
    run(op, 1);
    assert.ok(op.magLimit() >= last);
    last = op.magLimit();
  }
  assert.equal(op.magLimit(), 6.5);
});

test('play stays locked until full night; then the beam comes on', () => {
  const op = makeOpening(false);
  assert.equal(op.locked, true);
  assert.equal(op.beam(), 0);
  run(op, 44.9);
  assert.equal(op.locked, true);
  assert.equal(op.beam(), 0);
  run(op, 0.2);
  assert.equal(op.locked, false);
  assert.equal(op.done, false);
  run(op, BEAM_S);
  assert.equal(op.beam(), 1);
  assert.equal(op.done, true);
});

test('the sky clock runs fast, stays under the trail speed and ends on real now at speed 1', () => {
  const r = fake(), c = makeClock(r.now), op = makeOpening(false);
  driveClock(op, c);
  // The sky starts behind real time by what the fast clock gains.
  assert.ok(r.now() - c.skyMs() > 10 * 60 * 1000, `lag ${(r.now() - c.skyMs()) / 1000} s`);
  let peak = 0, prevSky = c.skyMs();
  while (!op.done) {
    r.add(FRAME * 1000);
    op.step(FRAME);
    driveClock(op, c);
    c.step(FRAME);
    assert.ok(c.speed < TRAIL_SPEED, `speed ${c.speed}`);
    assert.equal(c.trails(), false);
    // The sky moves at the speed the clock reports.
    const moved = (c.skyMs() - prevSky) / (FRAME * 1000);
    assert.ok(Math.abs(moved - c.speed) < 2, `moved ${moved}, speed ${c.speed}`);
    prevSky = c.skyMs();
    peak = Math.max(peak, c.speed);
  }
  assert.ok(peak > 10, `peak ${peak}`);
  assert.equal(c.speed, 1);
  assert.ok(Math.abs(c.skyMs() - r.now()) < 1, `off by ${c.skyMs() - r.now()} ms`);
  // After the opening the clock keeps real time.
  r.add(5000); c.step(5);
  assert.ok(Math.abs(c.skyMs() - r.now()) < 1);
});

test('the speed eases to 1: it changes little in the last second', () => {
  const op = makeOpening(false);
  run(op, OPENING_S - 1);
  assert.ok(op.speed() < 2, `speed ${op.speed()} a second before night`);
});

test('a skip mid-way reaches night in about 1.5 s', () => {
  const r = fake(), c = makeClock(r.now), op = makeOpening(false);
  run(op, 10);
  assert.equal(op.skip(), true);
  // A second skip during the skip does nothing.
  assert.equal(op.skip(), false);
  let s = 0, lastDusk = op.dusk();
  while (op.locked) {
    r.add(FRAME * 1000); op.step(FRAME); driveClock(op, c); c.step(FRAME); s += FRAME;
    assert.ok(op.dusk() <= lastDusk, 'the skip never goes back toward dusk');
    lastDusk = op.dusk();
    assert.ok(s < 3, 'the skip takes too long');
  }
  assert.ok(Math.abs(s - SKIP_S) < 0.05, `skip took ${s} s`);
  assert.equal(op.dusk(), 0);
  assert.equal(op.magLimit(), 6.5);
  run(op, BEAM_S + FRAME);
  driveClock(op, c);
  assert.equal(op.done, true);
  assert.equal(c.speed, 1);
  assert.ok(Math.abs(c.skyMs() - r.now()) < 1);
});

test('a skip after night does nothing', () => {
  const op = makeOpening(false);
  run(op, OPENING_S + 0.1);
  assert.equal(op.skip(), false);
});

test('reduced motion opens at night with play unlocked', () => {
  const op = makeOpening(true);
  assert.equal(op.done, true);
  assert.equal(op.locked, false);
  assert.equal(op.dusk(), 0);
  assert.equal(op.magLimit(), 6.5);
  assert.equal(op.beam(), 1);
  assert.equal(op.speed(), 1);
  assert.equal(op.lagMs(), 0);
});

test('the opening moves only when stepped, so a hidden tab pauses it', () => {
  const op = makeOpening(false);
  run(op, 5);
  const t = op.t;
  op.step(0);
  assert.equal(op.t, t);
});

test('the lamps come on one by one as it gets dark, all on at night', () => {
  const op = makeOpening(false), n = 12;
  for (let i = 0; i < n; i++) assert.equal(op.lamp(i, n), 0);
  const firstOn = new Array(n).fill(-1);
  for (let k = 0; k <= 45 * 60; k++) {
    for (let i = 0; i < n; i++) if (firstOn[i] < 0 && op.lamp(i, n) > 0) firstOn[i] = op.t;
    op.step(FRAME);
  }
  for (let i = 0; i < n; i++) assert.equal(op.lamp(i, n), 1, `lamp ${i} is not full at night`);
  // Lamp i starts after lamp i - 1, at least a second later.
  for (let i = 1; i < n; i++) assert.ok(firstOn[i] - firstOn[i - 1] >= 1, `lamps ${i - 1} and ${i}`);
  // No lamp starts in the first fifth: it is still light.
  assert.ok(firstOn[0] > OPENING_S / 5);
});

test('seek moves the opening to a time and cancels a skip', () => {
  const op = makeOpening(false);
  op.skip();
  op.seek(30);
  assert.equal(op.t, 30);
  assert.equal(op.skipping, false);
  assert.equal(op.locked, true);
});

test('sunset azimuth at 51 N follows the season', () => {
  // Near the equinox the sun sets near due west.
  assert.ok(Math.abs(sunsetAz(new Date(Date.UTC(2026, 2, 20, 18)), 51) - 270) < 3);
  // At midsummer it sets in the north-west, about 309 degrees.
  assert.ok(Math.abs(sunsetAz(new Date(Date.UTC(2026, 5, 21, 20)), 51) - 309) < 3);
  // At midwinter it sets in the south-west, about 232 degrees.
  assert.ok(Math.abs(sunsetAz(new Date(Date.UTC(2026, 11, 21, 16)), 51) - 232) < 3);
  // Mid-November: west-south-west.
  const nov = sunsetAz(new Date(Date.UTC(2026, 10, 17, 16)), 51);
  assert.ok(nov > 234 && nov < 245, `nov ${nov}`);
});
