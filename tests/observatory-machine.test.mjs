// Observatory machine, pick and gesture. Run: node --test tests/observatory-machine.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeMachine, liftLimits, CUPOLA, TUBE, TUBE_PARK_ALT } from '../observatory/src/core/machine.ts';
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
// The load on each drive changes speed a tenth faster at most.
// Outside track the tube az rides the cupola.
// So its bound adds the cupola's acceleration.
// altAcc: the lift's own acceleration after a pick.
function noStep(m, b, dt, what, altAcc = TUBE.accel) {
  const acc = { cupola: CUPOLA.accel, alt: altAcc, az: TUBE.accel + CUPOLA.accel };
  for (const k of AXES) {
    const a = m.axes[k];
    assert.ok(Math.abs(a.dvel - b[k].dvel) <= acc[k] * dt + 1e-9, `${what}, ${k}: drive speed step ${a.dvel - b[k].dvel}`);
    assert.ok(Math.abs(a.vel - b[k].vel) <= 1.1 * acc[k] * dt + 1e-9, `${what}, ${k}: speed step ${a.vel - b[k].vel}`);
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
      m.step(step, { targetAlt: 20, targetAz: 250, trails: false });
      noStep(m, b, step, `dt ${step}`);
      for (const k of AXES) {
        const a = m.axes[k];
        // Before track the tube az rides the cupola.
        // Its lead keeps the tube's limits.
        const ride = k === 'az' && m.phase !== 'track';
        const v = ride ? a.dvel - m.axes.cupola.dvel : a.dvel;
        const vb = ride ? b.az.dvel - b.cupola.dvel : b[k].dvel;
        assert.ok(Math.abs(v) <= lim[k].cap + 1e-9, `dt ${step}, ${k}: speed ${v}`);
        assert.ok(Math.abs(v - vb) <= lim[k].accel * step + 1e-9, `dt ${step}, ${k}: speed step ${v - vb}`);
      }
    }
    assert.equal(m.phase, 'track');
  }
});
test('a pick on a shut shutter opens it over 6 s, then slews', () => {
  assert.equal(SHUTTER_S, 10);
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
  // At the end stop the bounce stays in 0 to 1.
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
// From rest: the shutter shut, the tube parked, the cupola at az.
// Steps until the shutter is half open.
// Returns the steps taken.
function toHalfOpen(m, step, ctx) {
  let n = 0;
  while (m.shutter01 < 0.5) { m.step(step, ctx); n++; }
  return n;
}
test('the tube parks at 5°, shut or open', () => {
  assert.equal(TUBE_PARK_ALT, 5);
  assert.equal(makeMachine({ az: 100 }).tubeAlt, 5);
  assert.equal(makeMachine({ az: 100, shutter01: 1 }).tubeAlt, 5);
});
test('the lift starts when the shutter is half open', () => {
  for (const step of [1 / 60, 0.1]) {
    const m = makeMachine({ az: 100 });
    const ctx = { targetAlt: 40, targetAz: 100, trails: false };
    m.pick(star(1, 0, 0, 1));
    while (m.shutter01 < 0.5) {
      assert.equal(m.tubeAlt, 5, `dt ${step}: the tube waits, shutter ${m.shutter01}`);
      assert.equal(m.axes.alt.dvel, 0, `dt ${step}: the drive waits`);
      m.step(step, ctx);
    }
    assert.equal(m.phase, 'open');
    assert.ok(m.axes.alt.dvel > 0, `dt ${step}: the lift starts at shutter ${m.shutter01}`);
  }
});
test('a 15° lift uses 1.5°/s and keeps its limits', () => {
  for (const step of [1 / 60, 0.1]) {
    const m = makeMachine({ az: 100 });
    const ctx = { targetAlt: 20, targetAz: 100, trails: false };
    m.pick(star(1, 0, 0, 1));
    assert.equal(m.tubeAlt, 5);
    let cruise = 0, prev = 0;
    for (let i = 0; i < 60 / step; i++) {
      m.step(step, ctx);
      const v = m.axes.alt.dvel;
      assert.ok(Math.abs(v) <= TUBE.cap + 1e-9, `dt ${step}: speed ${v}`);
      assert.ok(Math.abs(v - prev) <= TUBE.accel * step + 1e-9, `dt ${step}: speed step ${v - prev}`);
      if (Math.abs(v - TUBE.cap) < 1e-9) cruise++;
      prev = v;
    }
    assert.ok(cruise > 0, `dt ${step}: it cruises at 1.5°/s`);
    assert.equal(m.tubeAlt, 20);
  }
});
test('a long cupola turn does not slow the lift', () => {
  // The star stands 170° round from the slit.
  const m = makeMachine({ az: 100 });
  const ctx = { targetAlt: 40, targetAz: 270, trails: false };
  m.pick(star(1, 0, 0, 1));
  toHalfOpen(m, dt, ctx);
  const from = m.tubeAlt;
  run(m, 6, ctx);
  assert.ok(m.tubeAlt - from > 6, `lifted ${m.tubeAlt - from}° in 6 s`);
  assert.equal(m.phase, 'slew');
});
test('the tube az stays within 0.5° of the cupola in open and slew', () => {
  for (const step of [1 / 60, 0.1]) {
    const m = makeMachine({ az: 100 });
    const ctx = { targetAlt: 40, targetAz: 270, trails: false };
    m.pick(star(1, 0, 0, 1));
    let slewed = false;
    for (let i = 0; i < 150 / step && m.phase !== 'track'; i++) {
      m.step(step, ctx);
      if (m.phase === 'slew') slewed = true;
      assert.ok(Math.abs(azDelta(m.cupolaAz, m.tubeAz)) < 0.5, `dt ${step}: ${azDelta(m.cupolaAz, m.tubeAz)} in ${m.phase}`);
    }
    assert.ok(slewed);
    assert.equal(m.phase, 'track');
  }
});
test('the hand-over to track has no speed step, then the tube sits on the star', () => {
  for (const step of [1 / 60, 0.1]) {
    const m = makeMachine({ az: 100 });
    const sky = t => ({ targetAlt: 40 + SIDEREAL * 0.5 * t, targetAz: 160 + SIDEREAL * 0.8 * t, trails: false });
    m.pick(star(1, 0, 0, 1));
    let t = 0, handed = null;
    for (; t < 120; t += step) {
      const b = snap(m), before = m.phase;
      m.step(step, sky(t));
      noStep(m, b, step, `dt ${step} at ${t.toFixed(2)}`, liftLimits(35).accel);
      if (before === 'slew' && m.phase === 'track') handed = t;
    }
    assert.ok(handed !== null, `dt ${step}: track`);
    // Track starts once the cupola and the tube have arrived and settled.
    const c = sky(t);
    assert.ok(Math.abs(azDelta(m.tubeAz, c.targetAz)) < 0.01, `dt ${step}: az off ${azDelta(m.tubeAz, c.targetAz)}`);
    assert.ok(Math.abs(m.tubeAlt - c.targetAlt) < 0.01, `dt ${step}: alt off ${m.tubeAlt - c.targetAlt}`);
  }
});
test('release lowers the tube to 5°, never below', () => {
  for (const step of [1 / 60, 0.1]) {
    const m = makeMachine({ az: 100, shutter01: 1 });
    m.pick(star(1, 0, 0, 1));
    for (let i = 0; i < 60 / step; i++) m.step(step, { targetAlt: 40, targetAz: 130, trails: false });
    assert.equal(m.phase, 'track');
    m.release();
    let low = Infinity;
    for (let i = 0; i < 60 / step; i++) {
      const b = snap(m);
      m.step(step, { targetAlt: 0, targetAz: 0, trails: false });
      noStep(m, b, step, `dt ${step}`);
      low = Math.min(low, m.tubeAlt);
    }
    assert.ok(low >= 5, `dt ${step}: low ${low}`);
    assert.equal(m.tubeAlt, 5);
    assert.equal(m.moving, false);
    // The shutter stays open in play.
    assert.equal(m.shutter01, 1);
  }
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
test('a target under 5 degrees is lost and the tube parks at 5', () => {
  const m = makeMachine({ az: 100, shutter01: 1 });
  m.pick(star(1, 0, 0, 1));
  run(m, 120, { targetAlt: 50, targetAz: 130, trails: false });
  // The tube lowers 45° at 1.5°/s.
  run(m, 40, { targetAlt: 3, targetAz: 130, trails: false });
  assert.equal(m.phase, 'lost');
  assert.equal(m.tracking, false);
  assert.ok(Math.abs(m.tubeAlt - 5) < 0.2);
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
  // The 55° lift runs at up to 4°/s, so it takes longer to bring down.
  run(m, 30, { targetAlt: 2, targetAz: 250, trails: false });
  assert.equal(m.phase, 'lost');
  assert.equal(m.moving, false);
});
test('hold, lost and release run down without a speed step, then rest', () => {
  const far = { targetAlt: 20, targetAz: 250, trails: false };
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
  run(m, 45, { targetAlt: 0, targetAz: 0, trails: false, aimAz: 90 });
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
test('shut (the ?cuts review): the tube lowers first, the shutter shuts once it is under 20°; a pick then opens it again', () => {
  const m = makeMachine({ az: 100 });
  const ctx = { targetAlt: 40, targetAz: 130, trails: false };
  m.pick(star(1, 0, 0, 1));
  run(m, 60, ctx);
  assert.equal(m.phase, 'track');
  assert.equal(m.shutter01, 1);
  m.shut();
  assert.equal(m.phase, 'aim');
  assert.equal(m.target, null);
  assert.ok(m.moving, 'the machine moves');
  let t = 0, under = null, shut = null;
  while (t < 60) {
    m.step(dt, ctx);
    t += dt;
    if (under === null && m.tubeAlt < 20) under = t;
    // The shutter never moves while the tube stands at 20° or higher.
    if (m.tubeAlt >= 20) assert.equal(m.shutter01, 1, `shutter ${m.shutter01} with the tube at ${m.tubeAlt}`);
    if (shut === null && m.shutter01 === 0 && m.shutter.bs === 0) shut = t;
  }
  assert.ok(under > 5, `under 20° at ${under}`);
  // SHUTTER_S of travel, then the bounce at the end stop.
  assert.ok(shut - under > SHUTTER_S && shut - under < SHUTTER_S + 0.6, `shut ${shut - under} s after`);
  assert.equal(m.tubeAlt, 5);
  assert.equal(m.moving, false);
  m.pick(star(1, 0, 0, 1));
  assert.equal(m.phase, 'open');
});
test('the cupola turns to the star while the shutter opens', () => {
  const m = makeMachine({ az: 100 });
  const ctx = { targetAlt: 40, targetAz: 130, trails: false };
  m.pick(star(1, 0, 0, 1));
  assert.equal(m.phase, 'open');
  // Half the shutter's travel: the cupola is on its way.
  run(m, SHUTTER_S / 2, ctx);
  assert.equal(m.phase, 'open');
  assert.ok(m.cupolaAz > 105 && m.cupolaAz < 130, `cupola at ${m.cupolaAz}`);
  assert.ok(Math.abs(azDelta(m.cupolaAz, m.tubeAz)) < 0.5, 'the tube az rides the cupola');
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
// The real sky at latitude 51: a star's place t seconds on.
// lst0 sets the local sidereal time at t 0, in degrees.
const realSky = (ra, dec, lst0) => t => {
  const p = toAltAz(ra, dec, lst0 + SIDEREAL * t, 51);
  return { targetAlt: p.alt, targetAz: p.az, trails: false };
};
// The review's meridian star, a zenith star and a pole star.
const STARS = {
  meridian: realSky(0, 0, -3),
  zenith: realSky(0, 47, -6),
  pole: realSky(37.95, 89.26, 0),
};
test('a tracked star locks the tube: no per-frame work for 15 min of real sky, under 0.01° off', () => {
  for (const [name, sky] of Object.entries(STARS)) {
    for (const step of [1 / 60, 1 / 120, 1 / 240, 0.1]) {
      const m = makeMachine({ az: 150, shutter01: 1 });
      m.pick(star(1, 0, 0, 1));
      let i = 0;
      for (; i * step < 200 && m.phase !== 'track'; i++) m.step(step, sky(i * step));
      assert.equal(m.phase, 'track', `${name}, dt ${step}`);
      // The settle after the slew.
      const settle = i + Math.round(5 / step);
      let busy = 0, frames = 0, worst = 0;
      for (const end = i + Math.round(900 / step); i < end; i++) {
        const c = sky((i + 1) * step);
        m.step(step, c);
        if (i < settle) continue;
        frames++;
        worst = Math.max(worst, Math.abs(m.tubeAlt - c.targetAlt), Math.abs(azDelta(m.tubeAz, c.targetAz)));
        assert.ok(atRest(m.axes.alt) && atRest(m.axes.az), `${name}, dt ${step}: the tube is not locked at ${(i * step).toFixed(1)} s`);
        // Only the cupola's steps after the star keep the loop busy.
        if (m.moving) { busy++; assert.ok(!atRest(m.axes.cupola), `${name}, dt ${step}: moving with the cupola still`); }
      }
      assert.ok(worst < 0.01, `${name}, dt ${step}: off by ${worst}`);
      if (name !== 'zenith') assert.ok(busy / frames < 0.1, `${name}, dt ${step}: busy ${(100 * busy / frames).toFixed(1)}%`);
      assert.equal(m.phase, 'track', `${name}, dt ${step}`);
    }
  }
});
test('a locked tube hands back to its drive without a visible step: hold, lost, release', () => {
  const cases = {
    hold: [m => m, c => ({ ...c, trails: true }), 1],
    lost: [m => m, c => ({ ...c, targetAlt: 3 }), 1],
    release: [m => { m.release(); return m; }, c => c, 2],
  };
  for (const step of [1 / 60, 1 / 240]) {
    for (const [name, [act, ctxOf, k]] of Object.entries(cases)) {
      const m = makeMachine({ az: 150, shutter01: 1 });
      const sky = STARS.meridian;
      m.pick(star(1, 0, 0, 1));
      let i = 0;
      for (; i * step < 200 && (m.phase !== 'track' || m.moving); i++) m.step(step, sky(i * step));
      assert.ok(atRest(m.axes.alt) && atRest(m.axes.az), `${name}: locked first`);
      // The tube's speed on screen, from its places.
      let pAlt = m.tubeAlt, pAz = m.tubeAz, vAlt = null, vAz = null;
      act(m);
      for (let j = 0; j < 20 / step; j++, i++) {
        const was = { alt: atRest(m.axes.alt), az: atRest(m.axes.az) };
        m.step(step, ctxOf(sky((i + 1) * step)));
        const nAlt = (m.tubeAlt - pAlt) / step, nAz = azDelta(pAz, m.tubeAz) / step;
        if (vAlt !== null) {
          // When an axis comes to rest, its load lands on the drive.
          // That landing stays under 0.004°.
          // Every other frame has no speed step.
          const lands = k => !was[k] && atRest(m.axes[k]);
          if (lands('alt')) assert.ok(Math.abs(nAlt - vAlt) * step <= 0.004, `${name}: alt lands ${(nAlt - vAlt) * step}°`);
          else assert.ok(Math.abs(nAlt - vAlt) <= 1.1 * TUBE.accel * step + 1e-6, `${name}, dt ${step}: alt speed step ${(nAlt - vAlt) / step} a second at ${j}`);
          if (lands('az')) assert.ok(Math.abs(nAz - vAz) * step <= 0.004, `${name}: az lands ${(nAz - vAz) * step}°`);
          else assert.ok(Math.abs(nAz - vAz) <= 1.1 * k * (TUBE.accel + CUPOLA.accel) * step + 1e-6, `${name}, dt ${step}: az speed step ${(nAz - vAz) / step} a second at ${j}`);
        }
        // A landed axis stands still from here.
        vAlt = !was.alt && atRest(m.axes.alt) ? 0 : nAlt;
        vAz = !was.az && atRest(m.axes.az) ? 0 : nAz;
        pAlt = m.tubeAlt; pAz = m.tubeAz;
      }
    }
  }
});
test('a fractional shutter at the start never jams the machine', () => {
  const m = makeMachine({ az: 100, shutter01: 0.5 });
  run(m, 10, { targetAlt: 0, targetAz: 0, trails: false });
  assert.equal(m.moving, false);
});
// A pick from rest at az 100, the shutter shut, the tube parked at 5°.
// Steps until the drive lands on alt; returns the times from the pick.
function liftRun(alt, step = 1 / 60, see = () => {}) {
  const m = makeMachine({ az: 100 });
  const ctx = { targetAlt: alt, targetAz: 100, trails: false };
  m.pick(star(1, 0, 0, 1));
  let t = 0, half = null, landed = null;
  while (t < 60 && landed === null) {
    const b = snap(m);
    m.step(step, ctx);
    t += step;
    see(m, b, t);
    if (half === null && m.shutter01 >= 0.5) half = t;
    if (m.axes.alt.drv === alt && m.axes.alt.dvel === 0) landed = t;
  }
  return { m, half, landed };
}
test('the lift budget: a 15° lift keeps 1.5°/s; longer lifts take about 14 s, at 4°/s at most', () => {
  assert.deepEqual(liftLimits(15), TUBE);
  assert.deepEqual(liftLimits(-15), TUBE);
  for (const [lift, cap] of [[15, 1.5], [35, 35 / 11], [60, 4]]) {
    const lim = liftLimits(lift);
    assert.ok(Math.abs(lim.cap - cap) < 1e-9, `${lift}°: cap ${lim.cap}`);
    assert.ok(Math.abs(lim.accel - cap / 3) < 1e-9, `${lift}°: accel ${lim.accel}`);
    for (const step of [1 / 60, 0.1]) {
      let top = 0;
      const { half, landed } = liftRun(5 + lift, step, (m, b) => {
        const v = m.axes.alt.dvel;
        top = Math.max(top, Math.abs(v));
        assert.ok(Math.abs(v) <= cap + 1e-9, `${lift}°, dt ${step}: speed ${v}`);
        assert.ok(Math.abs(v - b.alt.dvel) <= (cap / 3) * step + 1e-9, `${lift}°, dt ${step}: speed step ${v - b.alt.dvel}`);
      });
      assert.ok(Math.abs(top - cap) < 1e-9, `${lift}°, dt ${step}: cruises at ${top}`);
      if (lift === 35) assert.ok(landed - half <= 14.5, `35°, dt ${step}: lands ${landed - half} s after the lift starts`);
    }
  }
});
test('the boost ends with the lift: a release lowers the tube at the normal limits', () => {
  const m = makeMachine({ az: 100 });
  m.pick(star(1, 0, 0, 1));
  run(m, 60, { targetAlt: 65, targetAz: 100, trails: false });
  assert.equal(m.phase, 'track');
  m.release();
  let prev = m.axes.alt.dvel;
  for (let i = 0; i < 80 / dt; i++) {
    m.step(dt, { targetAlt: 0, targetAz: 0, trails: false });
    const v = m.axes.alt.dvel;
    assert.ok(Math.abs(v) <= TUBE.cap + 1e-9, `speed ${v}`);
    assert.ok(Math.abs(v - prev) <= TUBE.accel * dt + 1e-9, `speed step ${v - prev}`);
    prev = v;
  }
  assert.equal(m.tubeAlt, 5);
});
test('altLeft and altEta: the way and the time left to the lift\'s arrival', () => {
  // A short lift, a budgeted lift and a capped lift.
  for (const lift of [10, 30, 60]) {
    const marks = [];
    const { m, landed } = liftRun(5 + lift, 1 / 60, (mm, _, t) => {
      // Sample from the first frame, through the shutter, into the lift.
      if (marks.length < 12 && Math.round(t * 60) % 60 === 0) marks.push({ t, eta: mm.altEta(), left: mm.altLeft(), alt: mm.axes.alt.pos });
    });
    assert.ok(landed !== null, `${lift}°: lands`);
    for (const k of marks) {
      assert.ok(Math.abs(k.t + k.eta - landed) <= 0.3, `${lift}°: at ${k.t.toFixed(2)} s the eta says ${(k.t + k.eta).toFixed(2)}, it lands at ${landed.toFixed(2)}`);
      assert.ok(Math.abs(k.left - Math.abs(5 + lift - k.alt)) < 1e-6, `${lift}°: left ${k.left}`);
    }
    // Settled on the star: nothing left.
    run(m, 5, { targetAlt: 5 + lift, targetAz: 100, trails: false });
    assert.equal(m.altLeft(), 0);
    assert.equal(m.altEta(), 0);
  }
});
