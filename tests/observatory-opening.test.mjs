// Observatory opening: golden hour into night. Run: node --test tests/observatory-opening.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  makeOpening, driveClock, sunsetAz, streakForDusk,
  OPENING_S, SKIP_S, SUN_START, SUN_END, MAG_START, MAG_END, PEAK_SPEED, EXPOSURE_S,
} from '../observatory/src/core/opening.ts';
import { makeClock, TRAIL_SPEED } from '../observatory/src/core/clock.ts';

// A fake real clock the test moves by hand.
const fake = (t0 = 1.7e12) => { let t = t0; return { now: () => t, add: (ms) => { t += ms; } }; };
const FRAME = 1 / 60;
// Steps an opening by frames for s seconds.
const run = (op, s) => { for (let k = 0; k < Math.round(s / FRAME); k++) op.step(FRAME); };
// The sky turns this many degrees per real second at speed 1.
const SIDEREAL = 360 / 86164.0905;
// The brightest catalog star, Sirius.
const BRIGHTEST = -1.46;
// A star shows until the limit is this many magnitudes past it: FADE_MAG in sky/stars.ts.
const FADE = 0.75;
// Each check steps the opening by this much.
const STEP = 0.1;

test('the opening lasts 10 s and skips in about 0.8 s', () => {
  assert.equal(OPENING_S, 10);
  assert.ok(SKIP_S >= 0.6 && SKIP_S <= 1.0);
});

test('the sun sinks from 3 degrees above the horizon to 18 below', () => {
  const op = makeOpening(false);
  assert.equal(SUN_START, 3);
  assert.equal(SUN_END, -18);
  assert.equal(op.sunAlt(), 3);
  let last = op.sunAlt();
  while (op.t < OPENING_S) {
    op.step(STEP);
    assert.ok(op.sunAlt() <= last, `the sun rises at ${op.t} s`);
    last = op.sunAlt();
  }
  assert.equal(op.sunAlt(), -18);
  // At 3.6 s the dusk stands where the old opening started, 4 degrees down.
  op.seek(3.6);
  assert.ok(Math.abs(op.sunAlt() + 4) < 1, `sun ${op.sunAlt()} at 3.6 s`);
});

test('the golden hour lasts about 2.5 s: the sun stays above the horizon to 2.3 s', () => {
  const op = makeOpening(false);
  op.seek(2.3);
  assert.ok(op.sunAlt() > 0, `sun ${op.sunAlt()} at 2.3 s`);
  op.seek(2.8);
  assert.ok(op.sunAlt() < 0, `sun ${op.sunAlt()} at 2.8 s`);
});

test('dusk() falls from 1 to exactly 0 at full night, linear in the sun', () => {
  const op = makeOpening(false);
  assert.equal(op.dusk(), 1);
  while (op.t < OPENING_S) {
    op.step(STEP);
    const alt = SUN_END + (SUN_START - SUN_END) * op.dusk();
    assert.ok(Math.abs(alt - op.sunAlt()) < 1e-9);
  }
  assert.equal(op.dusk(), 0);
});

test('no star shows in the golden hour; the brightest show by 3 s; the sky is rich by 6 s', () => {
  const op = makeOpening(false);
  assert.equal(MAG_END, 6.5);
  assert.equal(op.magLimit(), MAG_START);
  assert.ok(MAG_START + FADE < BRIGHTEST, `limit ${MAG_START} shows Sirius`);
  let last = op.magLimit();
  while (op.t < OPENING_S) {
    op.step(STEP);
    assert.ok(op.magLimit() >= last, 'the limit never falls');
    last = op.magLimit();
  }
  assert.equal(op.magLimit(), 6.5);
  op.seek(1.7);
  assert.ok(op.magLimit() + FADE < BRIGHTEST, `a star shows at 1.7 s: ${op.magLimit()}`);
  // First-magnitude stars show in full.
  op.seek(3);
  assert.ok(op.magLimit() >= 1, `limit ${op.magLimit()} at 3 s`);
  op.seek(6);
  assert.ok(op.magLimit() >= 5, `limit ${op.magLimit()} at 6 s`);
});

test('play stays locked until full night; then the opening is done', () => {
  const op = makeOpening(false);
  assert.equal(op.locked, true);
  assert.equal(op.done, false);
  run(op, OPENING_S - 0.1);
  assert.equal(op.locked, true);
  assert.equal(op.done, false);
  run(op, 0.2);
  assert.equal(op.locked, false);
  assert.equal(op.done, true);
  assert.equal('beam' in op, false);
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
    // The ease is short, so the speed changes fast in one frame.
    const moved = (c.skyMs() - prevSky) / (FRAME * 1000);
    assert.ok(Math.abs(moved - c.speed) < 3, `moved ${moved}, speed ${c.speed}`);
    prevSky = c.skyMs();
    peak = Math.max(peak, c.speed);
  }
  assert.ok(peak > 100 && peak < TRAIL_SPEED, `peak ${peak}`);
  assert.equal(PEAK_SPEED, peak);
  assert.equal(c.speed, 1);
  assert.ok(Math.abs(c.skyMs() - r.now()) < 1, `off by ${c.skyMs() - r.now()} ms`);
  // After the opening the clock keeps real time.
  r.add(5000); c.step(5);
  assert.ok(Math.abs(c.skyMs() - r.now()) < 1);
});

test('the speed holds at its peak through the star rise, then eases to 1', () => {
  const op = makeOpening(false);
  op.seek(6);
  assert.equal(op.speed(), PEAK_SPEED);
  op.seek(OPENING_S - 0.1);
  assert.ok(op.speed() < 2, `speed ${op.speed()} 0.1 s before night`);
});

test('a streak is the sky\'s turn in the exposure, past real time: zero at speed 1', () => {
  const op = makeOpening(false);
  for (let s = 0; s <= OPENING_S; s += 0.05) {
    op.seek(s);
    const want = (op.speed() - 1) * EXPOSURE_S * SIDEREAL;
    assert.ok(Math.abs(op.streak() - want) < 1e-9, `streak ${op.streak()} at ${s} s`);
  }
  op.seek(OPENING_S);
  assert.equal(op.streak(), 0);
});

test('the streaks keep their length from the stars\' rise, then settle to points in the last 1.5 s', () => {
  const op = makeOpening(false);
  let longest = 0;
  while (op.t < OPENING_S) {
    op.step(STEP);
    longest = Math.max(longest, op.streak());
    if (op.t >= 3 && op.t <= OPENING_S - 1.5) assert.ok(op.streak() >= 3, `streak ${op.streak()} at ${op.t} s`);
  }
  assert.ok(longest >= 3 && longest <= 5, `longest ${longest}`);
  // The streak shrinks in the last 1.5 s and never grows back.
  op.seek(OPENING_S - 1.5);
  let last = op.streak();
  while (op.t < OPENING_S) {
    op.step(FRAME);
    assert.ok(op.streak() <= last + 1e-12);
    last = op.streak();
  }
  assert.equal(op.streak(), 0);
  // 0.2 s before night the streak is under a tenth of a degree.
  op.seek(OPENING_S - 0.2);
  assert.ok(op.streak() < 0.1, `streak ${op.streak()}`);
});

test('the renderer reads the streak back from dusk() alone', () => {
  const op = makeOpening(false);
  for (let s = 0; s <= OPENING_S + 1; s += 0.05) {
    op.seek(s);
    assert.ok(Math.abs(streakForDusk(op.dusk()) - op.streak()) < 1e-3, `at ${s} s: ${streakForDusk(op.dusk())} vs ${op.streak()}`);
  }
  assert.equal(streakForDusk(0), 0);
});

test('a skip mid-way reaches night in about 0.8 s; the streaks collapse with it', () => {
  const r = fake(), c = makeClock(r.now), op = makeOpening(false);
  run(op, 5);
  assert.ok(op.streak() > 3);
  assert.equal(op.skip(), true);
  // A second skip during the skip does nothing.
  assert.equal(op.skip(), false);
  let s = 0, lastDusk = op.dusk(), lastStreak = op.streak();
  while (op.locked) {
    r.add(FRAME * 1000); op.step(FRAME); driveClock(op, c); c.step(FRAME); s += FRAME;
    assert.ok(op.dusk() <= lastDusk, 'the skip never goes back toward dusk');
    assert.ok(op.streak() <= lastStreak + 1e-12, 'a streak grows in the skip');
    assert.ok(c.speed < TRAIL_SPEED);
    lastDusk = op.dusk(); lastStreak = op.streak();
    assert.ok(s < 2, 'the skip takes too long');
  }
  assert.ok(Math.abs(s - SKIP_S) < 0.05, `skip took ${s} s`);
  assert.equal(op.dusk(), 0);
  assert.equal(op.streak(), 0);
  assert.equal(streakForDusk(op.dusk()), 0);
  assert.equal(op.magLimit(), 6.5);
  run(op, FRAME);
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

test('reduced motion opens at night with play unlocked and no streaks', () => {
  const op = makeOpening(true);
  assert.equal(op.done, true);
  assert.equal(op.locked, false);
  assert.equal(op.dusk(), 0);
  assert.equal(op.magLimit(), 6.5);
  assert.equal(op.speed(), 1);
  assert.equal(op.lagMs(), 0);
  assert.equal(op.streak(), 0);
});

test('the opening moves only when stepped, so a hidden tab pauses it', () => {
  const op = makeOpening(false);
  run(op, 2);
  const t = op.t;
  op.step(0);
  assert.equal(op.t, t);
});

test('the lamps come on one by one between about 5 and 8.5 s, all on at night', () => {
  const op = makeOpening(false), n = 12;
  for (let i = 0; i < n; i++) assert.equal(op.lamp(i, n), 0);
  const firstOn = new Array(n).fill(-1);
  for (let k = 0; k <= (OPENING_S + 0.1) * 60; k++) {
    for (let i = 0; i < n; i++) if (firstOn[i] < 0 && op.lamp(i, n) > 0) firstOn[i] = op.t;
    op.step(FRAME);
  }
  for (let i = 0; i < n; i++) assert.equal(op.lamp(i, n), 1, `lamp ${i} is not full at night`);
  // Lamp i starts after lamp i - 1, a beat later.
  for (let i = 1; i < n; i++) assert.ok(firstOn[i] - firstOn[i - 1] >= 0.25, `lamps ${i - 1} and ${i}`);
  assert.ok(Math.abs(firstOn[0] - 5) < 0.3, `first lamp at ${firstOn[0]} s`);
  assert.ok(Math.abs(firstOn[n - 1] - 8.5) < 0.3, `last lamp at ${firstOn[n - 1]} s`);
  // No lamp starts before the sun is 6 degrees down.
  op.seek(firstOn[0]);
  assert.ok(op.sunAlt() < -6, `first lamp at sun ${op.sunAlt()}`);
});

test('seek moves the opening to a time and cancels a skip', () => {
  const op = makeOpening(false);
  op.skip();
  op.seek(4);
  assert.equal(op.t, 4);
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
