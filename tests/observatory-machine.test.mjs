// Observatory machine, pick and gesture. Run: node --test tests/observatory-machine.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeMachine, CUPOLA, TUBE } from '../observatory/src/core/machine.ts';
import { atRest, azDelta, shutterAtRest, SHUTTER_S } from '../observatory/src/core/dome.ts';
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
// The sidereal rate in degrees a second.
const SIDEREAL = 360 / 86164;
const AXES = ['cupola', 'alt', 'az'];
const snap = m => Object.fromEntries(AXES.map(k => [k, { ...m.axes[k] }]));
// One step: no drive changes speed faster than its acceleration.
// The load on each drive changes speed at most half as fast again.
// In aim the tube az rides the cupola, so it adds the cupola's acceleration.
function noStep(m, b, dt, what) {
  const acc = { cupola: CUPOLA.accel, alt: TUBE.accel, az: TUBE.accel + CUPOLA.accel };
  for (const k of AXES) {
    const a = m.axes[k];
    assert.ok(Math.abs(a.dvel - b[k].dvel) <= acc[k] * dt + 1e-9, `${what}, ${k}: drive speed step ${a.dvel - b[k].dvel}`);
    assert.ok(Math.abs(a.vel - b[k].vel) <= 1.5 * acc[k] * dt, `${what}, ${k}: speed step ${a.vel - b[k].vel}`);
  }
}
const allRest = m => AXES.every(k => atRest(m.axes[k]));

test("Tom's limits: the cupola 2°/s at 0.6°/s², the tube 1.5°/s at 0.5°/s²; a slew keeps them", () => {
  assert.deepEqual([CUPOLA.cap, CUPOLA.accel, TUBE.cap, TUBE.accel], [2, 0.6, 1.5, 0.5]);
  for (const step of [1 / 60, 0.1]) {
    const m = makeMachine({ az: 100, shutter01: 1 });
    m.pick(star(1, 0, 0, 1));
    const lim = { cupola: CUPOLA, alt: TUBE, az: TUBE };
    for (let i = 0; i < 130 / step; i++) {
      const b = snap(m);
      m.step(step, { targetAlt: 70, targetAz: 250, trails: false });
      noStep(m, b, step, `dt ${step}`);
      for (const k of AXES) {
        const a = m.axes[k];
        assert.ok(Math.abs(a.dvel) <= lim[k].cap + 1e-9, `dt ${step}, ${k}: speed ${a.dvel}`);
        assert.ok(Math.abs(a.dvel - b[k].dvel) <= lim[k].accel * step + 1e-9, `dt ${step}, ${k}: speed step ${a.dvel - b[k].dvel}`);
      }
    }
    assert.equal(m.phase, 'track');
  }
});
test('a pick on a shut shutter opens it over 6 s, then slews', () => {
  assert.equal(SHUTTER_S, 6);
  const m = makeMachine({ az: 100 });
  const ctx = { targetAlt: 50, targetAz: 130, trails: false };
  m.pick(star(1, 0, 0, 1));
  assert.equal(m.phase, 'open');
  let t = 0;
  while (m.phase === 'open' && t < 20) {
    m.step(dt, ctx);
    t += dt;
    assert.ok(m.shutter01 >= 0 && m.shutter01 <= 1, `shutter ${m.shutter01}`);
  }
  assert.equal(m.phase, 'slew');
  assert.ok(Math.abs(t - SHUTTER_S) <= 0.1, `open took ${t} s`);
  assert.equal(m.shutter.p, 1);
  // The bounce at the end stop keeps the shutter in 0 to 1.
  for (let i = 0; i < 30; i++) { m.step(dt, ctx); assert.ok(m.shutter01 >= 0 && m.shutter01 <= 1); }
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
  assert.ok(Math.abs(tc - tt) * dt < 2, `${tc} vs ${tt}`);
});
test('fast time holds, slow time slews again', () => {
  const m = makeMachine({ az: 100, shutter01: 1 });
  m.pick(star(1, 0, 0, 1));
  run(m, 120, { targetAlt: 50, targetAz: 130, trails: false });
  assert.equal(m.phase, 'track');
  m.step(dt, { targetAlt: 50, targetAz: 130, trails: true });
  assert.equal(m.phase, 'hold');
  assert.equal(m.tracking, false);
  // The fast sky turned the star away while the machine held.
  m.step(dt, { targetAlt: 50, targetAz: 135, trails: false });
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
test('hold, lost and release run down without a speed step, then rest', () => {
  const far = { targetAlt: 75, targetAz: 250, trails: false };
  const cases = {
    hold: [m => m, { ...far, trails: true }],
    lost: [m => m, { ...far, targetAlt: 2 }],
    release: [m => { m.release(); return m; }, far],
  };
  for (const step of [1 / 60, 0.1]) {
    for (const [name, [act, ctx]] of Object.entries(cases)) {
      const m = makeMachine({ az: 100, shutter01: 1 });
      m.pick(star(1, 0, 0, 1));
      for (let i = 0; i < 12 / step; i++) m.step(step, far);
      assert.equal(m.phase, 'slew', name);
      assert.ok(Math.abs(m.axes.cupola.dvel) > 1, `${name}: the cupola runs, ${m.axes.cupola.dvel}`);
      act(m);
      for (let i = 0; i < 30 / step; i++) {
        const b = snap(m);
        m.step(step, ctx);
        noStep(m, b, step, `${name}, dt ${step}`);
      }
      assert.ok(allRest(m), `${name}, dt ${step}: at rest`);
      assert.equal(m.moving, false, `${name}, dt ${step}: still`);
    }
  }
});
test('after a release the tube az joins the cupola and rides with it', () => {
  const m = makeMachine({ az: 100, shutter01: 1 });
  m.pick(star(1, 0, 0, 1));
  run(m, 120, { targetAlt: 50, targetAz: 130, trails: false });
  m.step(dt, { targetAlt: 50, targetAz: 160, trails: false });
  run(m, 3, { targetAlt: 50, targetAz: 160, trails: false });
  m.release();
  run(m, 30, { targetAlt: 0, targetAz: 0, trails: false, aimAz: 90 });
  assert.equal(m.cupolaAz, 90);
  assert.equal(m.tubeAz, m.cupolaAz);
  assert.equal(m.moving, false);
});
test('a star at the sidereal rate: the tube stays under 0.01° off once settled, and rests between frames', () => {
  for (const step of [1 / 60, 0.1]) {
    const m = makeMachine({ az: 100, shutter01: 1 });
    m.pick(star(1, 0, 0, 1));
    const sky = t => ({ targetAlt: 50 + SIDEREAL * 0.5 * t, targetAz: 130 + SIDEREAL * 0.8 * t, trails: false });
    let t = 0;
    for (; t < 60; t += step) m.step(step, sky(t));
    assert.equal(m.phase, 'track');
    for (; t < 360; t += step) {
      const c = sky(t);
      m.step(step, c);
      assert.ok(Math.abs(m.tubeAlt - c.targetAlt) < 0.01, `dt ${step}: alt off ${m.tubeAlt - c.targetAlt}`);
      assert.ok(Math.abs(azDelta(m.tubeAz, c.targetAz)) < 0.01, `dt ${step}: az off ${azDelta(m.tubeAz, c.targetAz)}`);
      assert.ok(atRest(m.axes.alt) && atRest(m.axes.az), `dt ${step}: the tube moves at ${t}`);
    }
    assert.equal(m.phase, 'track');
  }
});
test('the machine comes to rest: every speed exactly 0, so the loop can sleep', () => {
  const m = makeMachine({ az: 100 });
  assert.equal(m.moving, false);
  m.pick(star(1, 0, 0, 1));
  run(m, 60, { targetAlt: 40, targetAz: 140, trails: false });
  assert.equal(m.phase, 'track');
  for (const k of AXES) {
    assert.equal(m.axes[k].vel, 0, `${k} speed`);
    assert.equal(m.axes[k].dvel, 0, `${k} drive speed`);
  }
  assert.ok(shutterAtRest(m.shutter));
  assert.equal(m.moving, false);
});
test('in aim the cupola turns after the beam', () => {
  const m = makeMachine({ az: 100 });
  run(m, 60, { targetAlt: 0, targetAz: 0, trails: false, aimAz: 140 });
  assert.equal(m.cupolaAz, 140);
  assert.equal(m.moving, false);
});
test('classify splits a tap from a drag', () => {
  assert.equal(classify(3, 4, 200), 'tap');
  assert.equal(classify(12, 0, 200), 'drag');
  assert.equal(classify(2, 2, 600), 'drag');
});
test('shut (the ?cuts review): back to aim, the shutter shuts in 6 s, the tube parks; a pick then opens it again', () => {
  const m = makeMachine({ az: 100 });
  const ctx = { targetAlt: 20, targetAz: 130, trails: false };
  m.pick(star(1, 0, 0, 1));
  run(m, 60, ctx);
  assert.equal(m.shutter01, 1);
  m.shut();
  assert.equal(m.phase, 'aim');
  assert.equal(m.target, null);
  assert.ok(m.moving, 'the shutter moves');
  run(m, 3, ctx);
  assert.ok(m.shutter01 > 0 && m.shutter01 < 1, `shutter ${m.shutter01}`);
  // 6 s of travel, then the bounce at the end stop.
  run(m, 3.6, ctx);
  assert.equal(m.shutter01, 0);
  run(m, 20, ctx);
  assert.equal(m.tubeAlt, 30);
  assert.equal(m.moving, false);
  m.pick(star(1, 0, 0, 1));
  assert.equal(m.phase, 'open');
});
test('without shut, aim keeps the shutter open', () => {
  const m = makeMachine({ az: 100, shutter01: 1 });
  m.pick(star(1, 0, 0, 1));
  run(m, 5, { targetAlt: 20, targetAz: 130, trails: false });
  m.release();
  run(m, 10, { targetAlt: 20, targetAz: 130, trails: false });
  assert.equal(m.shutter01, 1);
});
test('a zero step mid-slew, as on the first frame after a sleep, keeps every number finite', () => {
  const m = makeMachine({ az: 100, shutter01: 1 });
  m.pick(star(1, 0, 0, 1));
  run(m, 5, { targetAlt: 60, targetAz: 160, trails: false });
  m.step(0, { targetAlt: 60, targetAz: 160.3, trails: false });
  for (const k of AXES) for (const f of ['pos', 'vel', 'drv', 'dvel']) assert.ok(Number.isFinite(m.axes[k][f]), `${k}.${f} ${m.axes[k][f]}`);
  assert.ok(Number.isFinite(m.shutter01));
});
