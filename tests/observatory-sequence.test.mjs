// Observatory pick sequence and the complex lights. Run: node --test tests/observatory-sequence.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CUTS, lightLevel, lightGoal, makeLocks, lens, startSeq, stepSeq, skipSeq, cadence, CUT_FPS,
  OPEN_CUT, LIFT_CUT, ROLL_MAX, GLASS_ENTER, GLASS_RISE, GLASS_HOLD, MIN_SHOT, SETTLE,
} from '../observatory/src/core/sequence.ts';
import { makeMachine, TUBE } from '../observatory/src/core/machine.ts';
import { SHUTTER_S } from '../observatory/src/core/dome.ts';

// Steps lightLevel until it reaches the goal; returns the seconds it took.
const until = (phase, from, goal, dt = 0.1, max = 60) => {
  let v = from, t = 0;
  while (v !== goal && t < max) { v = lightLevel(phase, v, dt); t += dt; }
  return { v, t };
};

// A lift of L degrees from rest at t0, at cap and accel.
// It gives what the machine reports.
// altLeft and altEta at time t.
function lift(L, t0 = SHUTTER_S / 2, cap = TUBE.cap, acc = TUBE.accel) {
  const ta = Math.min(cap / acc, Math.sqrt(L / acc));
  const v = acc * ta, cruise = Math.max(0, (L - acc * ta * ta) / v);
  const T = 2 * ta + cruise;
  const done = (u) => {
    if (u <= 0) return 0;
    if (u >= T) return L;
    if (u < ta) return 0.5 * acc * u * u;
    if (u < ta + cruise) return 0.5 * acc * ta * ta + v * (u - ta);
    const w = T - u;
    return L - 0.5 * acc * w * w;
  };
  return { T: t0 + T, at: (t) => ({ altLeft: L - done(t - t0), altEta: Math.max(0, t0 + T - Math.max(t, t0)) }) };
}
// Plays a sequence against a lift.
// It returns each shot with its start and length.
function play(view, phase = 'open', dt = 0.01) {
  let s = startSeq(phase, view(0));
  const shots = [{ shot: s.shot, at: 0 }];
  let t = 0;
  while (!s.done && t < 60) {
    t += dt;
    s = stepSeq(s, dt, view(t));
    if (s.shot !== shots[shots.length - 1].shot) shots.push({ shot: s.shot, at: t });
  }
  shots.forEach((x, i) => { x.dur = (i + 1 < shots.length ? shots[i + 1].at : t) - x.at; });
  return { shots, end: t };
}
const names = (r) => r.shots.map(x => x.shot).join(',');
const of = (r, shot) => r.shots.find(x => x.shot === shot);

test('five shots in order, each a locked camera with one lens', () => {
  assert.deepEqual(CUTS.map(c => c.shot), ['edge', 'slit', 'lift', 'roll', 'glass']);
  for (const c of CUTS) {
    assert.equal(typeof c.fov, 'number', `${c.shot}: fov is one number`);
    // The inside shot needs a wider lens: the room is small.
    assert.ok(Number.isFinite(c.fov) && c.fov >= 4 && c.fov <= 60, `${c.shot}: fov ${c.fov}`);
  }
});
test('the two shutter shots share its travel; the slew starts with the lift shot', () => {
  assert.equal(OPEN_CUT * 2, SHUTTER_S);
  const r = play(lift(15).at);
  assert.equal(names(r), 'edge,slit,lift,roll,glass');
  assert.ok(Math.abs(of(r, 'slit').at - OPEN_CUT) < 0.02);
  assert.ok(Math.abs(of(r, 'lift').at - SHUTTER_S) < 0.02);
  assert.ok(Math.abs(of(r, 'lift').dur - LIFT_CUT) < 0.02);
});
test('the real machine: the slew starts when the lift shot starts', () => {
  const m = makeMachine({ az: 0 });
  m.pick({ hip: 1, ra: 0, dec: 0, mag: 1, ci: 0, dist: 1, spect: '', name: '', bayer: '' });
  let t = 0;
  while (m.phase === 'open' && t < 20) { m.step(0.01, { targetAlt: 20, targetAz: 180, trails: false }); t += 0.01; }
  assert.ok(Math.abs(t - SHUTTER_S) <= 0.011, `slew at ${t}`);
});
// The time the lift comes within SETTLE of its goal.
// The hold starts then.
const settleT = (L) => { let t = 0; while (L.at(t).altLeft > SETTLE && t < 60) t += 0.001; return t; };
test('a mid lift: the roll plays; the glass enters with 6 degrees to lift, rises, stops and holds 1.5 s', () => {
  const L = lift(15), r = play(L.at);
  assert.equal(names(r), 'edge,slit,lift,roll,glass');
  const roll = of(r, 'roll'), glass = of(r, 'glass');
  assert.ok(roll.dur >= MIN_SHOT - 0.02 && roll.dur <= ROLL_MAX + 0.02, `roll ${roll.dur}`);
  const left = L.at(glass.at).altLeft;
  assert.ok(left <= GLASS_ENTER + 0.05 && left >= GLASS_ENTER - 0.2, `left at the glass ${left}`);
  assert.ok(L.T - glass.at >= GLASS_RISE - 0.02, `rise ${L.T - glass.at}`);
  assert.ok(Math.abs(r.end - (settleT(L) + GLASS_HOLD)) < 0.03, `end ${r.end}, settle ${settleT(L)}`);
  assert.ok(r.end >= 13 && r.end <= 24, `the sequence runs ${r.end} s`);
});
test('a long lift: the roll holds at most 9 s; the glass starts before the arrival', () => {
  // A budgeted lift: 30 degrees arrive about 14 s after the start.
  const L = lift(30, SHUTTER_S / 2, 3, 0.5), r = play(L.at);
  const roll = of(r, 'roll'), glass = of(r, 'glass');
  assert.ok(roll.dur <= ROLL_MAX + 0.02, `roll ${roll.dur}`);
  assert.ok(L.at(glass.at).altLeft <= GLASS_ENTER + 0.05, `left ${L.at(glass.at).altLeft}`);
  assert.ok(L.T - glass.at >= GLASS_RISE - 0.02, `rise ${L.T - glass.at}`);
  assert.ok(r.end >= 13 && r.end <= 24, `the sequence runs ${r.end} s`);
});
test('a short lift: the roll gives way; the glass enters from under the frame and rises at least 2 s', () => {
  // 8 degrees: about 4 are left when the shutter is open.
  const L = lift(8), r = play(L.at);
  assert.ok(!of(r, 'roll'), names(r));
  assert.ok(L.T - of(r, 'glass').at >= GLASS_RISE - 0.02, `rise ${L.T - of(r, 'glass').at}`);
  // A shot either shows for MIN_SHOT or is skipped: no flash.
  for (const x of r.shots) assert.ok(x.dur >= MIN_SHOT - 0.02, `${x.shot} ${x.dur}`);
});
test('every lift: no shot flashes; the glass never starts before the shutter is open', () => {
  for (const deg of [3, 6, 9, 12, 15, 19, 24]) {
    const r = play(lift(deg).at);
    for (const x of r.shots) assert.ok(x.dur >= MIN_SHOT - 0.02, `${deg} degrees: ${x.shot} ${x.dur}`);
    assert.ok(of(r, 'glass').at >= SHUTTER_S - 0.02, `${deg} degrees: glass at ${of(r, 'glass').at}`);
  }
});
test('a very short lift: the lift shot is skipped; the glass starts when the shutter is open', () => {
  const L = lift(4), r = play(L.at);
  assert.equal(names(r), 'edge,slit,glass');
  assert.ok(Math.abs(of(r, 'glass').at - SHUTTER_S) < 0.02);
});
test('no lift: the glass shot holds 1.5 s after the shutter cuts', () => {
  const r = play(() => ({ altLeft: 0, altEta: 0 }));
  assert.equal(names(r), 'edge,slit,glass');
  assert.ok(Math.abs(of(r, 'glass').dur - GLASS_HOLD) < 0.03);
});
test('a pick on an open shutter starts with the lift shot', () => {
  // The shutter is open, so the lift starts at once.
  const L = lift(15, 0), r = play(L.at, 'slew');
  assert.equal(names(r), 'lift,roll,glass');
  assert.ok(L.T - of(r, 'glass').at >= GLASS_RISE - 0.02);
});
test('a skip ends the sequence at once', () => {
  const s = skipSeq(startSeq('open', { altLeft: 10, altEta: 9 }));
  assert.equal(s.done, true);
  assert.equal(stepSeq(s, 0.1, { altLeft: 10, altEta: 9 }).done, true);
});
test('the ?cuts replay plays the same shots as the first pick', () => {
  const L = lift(12);
  assert.deepEqual(play(L.at).shots, play(L.at).shots);
});
test('each cut locks its camera: the same values at its start, middle and end', () => {
  // The slit turns and the screen turns to portrait inside each cut.
  let az = 0, aspect = 1.6, made = 0;
  const locks = makeLocks(cut => { made++; return { shot: cut.shot, az, ...lens(cut.fov, aspect) }; });
  for (const c of CUTS) {
    const start = locks.of(c);
    az += 2; aspect = 0.5;
    const mid = locks.of(c);
    az += 2; aspect = 1.6;
    const end = locks.of(c);
    assert.equal(start.shot, c.shot);
    assert.equal(mid, start, `${c.shot}: middle`);
    assert.equal(end, start, `${c.shot}: end`);
    assert.deepEqual(end, { shot: c.shot, az: start.az, fov: c.fov, tall: false }, `${c.shot}: values`);
  }
  assert.equal(made, CUTS.length);
  // A new pick locks every cut again.
  locks.clear();
  assert.equal(locks.of(CUTS[0]).az, az);
});
test('lens: a portrait frame aims tall and widens up to 1.5 times; landscape keeps the cut lens', () => {
  assert.deepEqual(lens(10, 1.6), { fov: 10, tall: false });
  assert.deepEqual(lens(10, 1), { fov: 10, tall: false });
  const p = lens(10, 0.8);
  assert.equal(p.tall, true);
  assert.ok(p.fov > 10 && p.fov < 15, `fov ${p.fov}`);
  assert.deepEqual(lens(10, 0.2), { fov: 15, tall: true });
});
// Plays a display at hz for some seconds.
// It returns the times the cadence renders.
function beats(hz, secs, jitter = 0) {
  const c = { acc: 1 / CUT_FPS }, at = [];
  let t = 0;
  for (let i = 0; i < hz * secs; i++) {
    // A little jitter, as real frame times have.
    const dt = 1 / hz + (i % 2 ? jitter : -jitter);
    t += dt;
    if (cadence(c, dt)) at.push(t);
  }
  return at;
}
test('cadence: the cuts render 24 frames a second at 60, 120 and 144 Hz', () => {
  assert.equal(CUT_FPS, 24);
  for (const hz of [60, 120, 144]) {
    const at = beats(hz, 4);
    const fps = (at.length - 1) / (at[at.length - 1] - at[0]);
    assert.ok(Math.abs(fps - 24) <= 1, `${hz} Hz: ${fps.toFixed(2)} fps`);
    // Each gap is the beat, give or take one display frame.
    for (let i = 1; i < at.length; i++) {
      const gap = at[i] - at[i - 1];
      assert.ok(Math.abs(gap - 1 / 24) <= 1 / hz + 1e-6, `${hz} Hz: gap ${(gap * 1000).toFixed(1)} ms`);
    }
  }
});
test('cadence: at 120 and 144 Hz every beat lands on the same spacing', () => {
  for (const hz of [120, 144]) {
    const at = beats(hz, 4);
    for (let i = 1; i < at.length; i++) assert.ok(Math.abs(at[i] - at[i - 1] - 1 / 24) < 1e-6, `${hz} Hz gap ${at[i] - at[i - 1]}`);
  }
});
test('cadence: jittered 60 Hz frames still give 24 a second; a long stall does not burst', () => {
  const at = beats(60, 4, 0.0015);
  const fps = (at.length - 1) / (at[at.length - 1] - at[0]);
  assert.ok(Math.abs(fps - 24) <= 1, `${fps}`);
  const c = { acc: 0 };
  assert.equal(cadence(c, 0.5), true);
  // After the stall, the next frame waits for the next beat.
  assert.equal(cadence(c, 1 / 60), false);
});
test('lightGoal: 1 at rest, 0.35 while it hunts, 0 for the survey', () => {
  assert.equal(lightGoal('aim'), 1);
  assert.equal(lightGoal('lost'), 1);
  assert.equal(lightGoal('open'), 0.35);
  assert.equal(lightGoal('slew'), 0.35);
  assert.equal(lightGoal('track'), 0);
  assert.equal(lightGoal('hold'), 0);
  assert.equal(lightGoal('inside'), 0);
});
test('lightLevel in track falls toward 0 and reaches it within 3 s', () => {
  const a = lightLevel('track', 1, 0.1);
  assert.ok(a < 1 && a > 0, `first step ${a}`);
  const { v, t } = until('track', 1, 0);
  assert.equal(v, 0);
  assert.ok(t <= 3 + 1e-9, `took ${t} s`);
});
test('lightLevel in aim rises from 0 to 1 in 4 to 5 s, not sooner than 3.5 s', () => {
  const { v, t } = until('aim', 0, 1);
  assert.equal(v, 1);
  assert.ok(t >= 3.5 && t >= 4 - 1e-9 && t <= 5 + 1e-9, `took ${t} s`);
});
test('lightLevel in slew dims from 1 to 0.35 and stays there', () => {
  const { v } = until('slew', 1, 0.35);
  assert.equal(v, 0.35);
  assert.equal(lightLevel('slew', 0.35, 0.1), 0.35);
  // From dark, the hunt brings the lights up to 0.35, not past it.
  assert.equal(until('open', 0, 0.35).v, 0.35);
});
test('lightLevel never overshoots on a big step', () => {
  assert.equal(lightLevel('aim', 0.9, 10), 1);
  assert.equal(lightLevel('track', 0.1, 10), 0);
});
