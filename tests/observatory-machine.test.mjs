// Observatory machine, pick and gesture. Run: node --test tests/observatory-machine.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeMachine } from '../observatory/src/core/machine.ts';
import { pickStar } from '../observatory/src/core/pick.ts';
import { classify } from '../observatory/src/core/gesture.ts';
import { toAltAz } from '../observatory/src/core/sky.ts';

const star = (hip, ra, dec, mag) => ({ hip, ra, dec, mag, ci: 0.5, dist: 10, spect: 'G2', name: '', bayer: '' });
const LAT = 51, LST = 100;
const dt = 1 / 30;
const run = (m, secs, ctx) => { for (let i = 0; i < Math.round(secs / dt); i++) m.step(dt, ctx); };

test('an empty patch picks nothing', () => {
  const stars = [star(1, 100, 40, 2)];
  const there = toAltAz(100, 40, LST, LAT);
  assert.equal(pickStar(stars, { alt: there.alt - 20, az: there.az }, LST, LAT), null);
  const m = makeMachine();
  assert.equal(m.phase, 'aim');
});
test('pickStar takes the brightest star inside the radius', () => {
  const a = toAltAz(100, 40, LST, LAT);
  const stars = [star(1, 100, 40, 3), star(2, 100.5, 40.5, 1), star(3, 140, 10, -1)];
  assert.equal(pickStar(stars, a, LST, LAT).hip, 2);
});
test('pickStar skips stars under 5 degrees', () => {
  // Hour angle 87 degrees at dec 0 puts the star at about 2 degrees.
  const low = toAltAz(13, 0, LST, LAT);
  assert.ok(low.alt > 0 && low.alt < 5, 'fixture star is low');
  assert.equal(pickStar([star(1, 13, 0, 0)], low, LST, LAT), null);
});
test('a pick on a shut shutter opens it, then slews after 4 s', () => {
  const m = makeMachine({ az: 100 });
  const ctx = { targetAlt: 50, targetAz: 130, trails: false };
  m.pick(star(1, 0, 0, 1));
  assert.equal(m.phase, 'open');
  run(m, 3.5, ctx);
  assert.equal(m.phase, 'open');
  assert.ok(m.shutter01 > 0.9 && m.shutter01 < 1);
  run(m, 0.7, ctx);
  assert.equal(m.phase, 'slew');
  assert.equal(m.shutter01, 1);
});
test('slew reaches track within 0.2 degrees', () => {
  const m = makeMachine({ az: 100, shutter01: 1 });
  const ctx = { targetAlt: 50, targetAz: 130, trails: false };
  m.pick(star(1, 0, 0, 1));
  assert.equal(m.phase, 'slew');
  run(m, 120, ctx);
  assert.equal(m.phase, 'track');
  assert.equal(m.tracking, true);
  assert.ok(Math.abs(m.cupolaAz - 130) < 0.2 && Math.abs(m.tubeAlt - 50) < 0.2);
});
test('the dome and the tube arrive together', () => {
  const m = makeMachine({ az: 100, shutter01: 1 });
  const ctx = { targetAlt: 80, targetAz: 106, trails: false };
  m.pick(star(1, 0, 0, 1));
  let tc = 0, tt = 0;
  for (let i = 0; i < 4000 && m.phase === 'slew'; i++) {
    m.step(dt, ctx);
    if (Math.abs(m.cupolaAz - 106) > 0.2) tc = i;
    if (Math.abs(m.tubeAlt - 80) > 0.2) tt = i;
  }
  assert.ok(Math.abs(tc - tt) * dt < 6, `${tc} vs ${tt}`);
});
test('fast time holds, slow time slews again', () => {
  const m = makeMachine({ az: 100, shutter01: 1 });
  m.pick(star(1, 0, 0, 1));
  run(m, 120, { targetAlt: 50, targetAz: 130, trails: false });
  assert.equal(m.phase, 'track');
  m.step(dt, { targetAlt: 50, targetAz: 130, trails: true });
  assert.equal(m.phase, 'hold');
  assert.equal(m.tracking, false);
  m.step(dt, { targetAlt: 50, targetAz: 130, trails: false });
  assert.equal(m.phase, 'slew');
});
test('a target under 5 degrees is lost and the tube parks at 30', () => {
  const m = makeMachine({ az: 100, shutter01: 1 });
  m.pick(star(1, 0, 0, 1));
  run(m, 120, { targetAlt: 50, targetAz: 130, trails: false });
  run(m, 30, { targetAlt: 3, targetAz: 130, trails: false });
  assert.equal(m.phase, 'lost');
  assert.equal(m.tracking, false);
  assert.ok(Math.abs(m.tubeAlt - 30) < 0.2);
  m.release();
  assert.equal(m.phase, 'aim');
  assert.equal(m.target, null);
});
test('lost during a slew eases to rest, so the loop can sleep', () => {
  const m = makeMachine({ az: 100, shutter01: 1 });
  m.pick(star(1, 0, 0, 1));
  run(m, 5, { targetAlt: 60, targetAz: 250, trails: false });
  assert.equal(m.phase, 'slew');
  assert.ok(m.moving);
  run(m, 20, { targetAlt: 2, targetAz: 250, trails: false });
  assert.equal(m.phase, 'lost');
  assert.equal(m.moving, false);
});
test('in aim the cupola turns after the beam', () => {
  const m = makeMachine({ az: 100 });
  run(m, 60, { targetAlt: 0, targetAz: 0, trails: false, aimAz: 140 });
  assert.ok(Math.abs(m.cupolaAz - 140) < 0.1);
});
test('classify splits a tap from a drag', () => {
  assert.equal(classify(3, 4, 200), 'tap');
  assert.equal(classify(12, 0, 200), 'drag');
  assert.equal(classify(2, 2, 600), 'drag');
});
