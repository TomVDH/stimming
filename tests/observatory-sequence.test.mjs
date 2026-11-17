// Observatory pick sequence and the complex lights. Run: node --test tests/observatory-sequence.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { CUTS, cutAt, lightLevel, lightGoal, cutsTotal, startAt, makeLocks, lens } from '../observatory/src/core/sequence.ts';
import { makeMachine } from '../observatory/src/core/machine.ts';
import { SHUTTER_S } from '../observatory/src/core/dome.ts';

const total = CUTS.reduce((s, c) => s + c.dur, 0);
// Steps lightLevel until it reaches the goal; returns the seconds it took.
const until = (phase, from, goal, dt = 0.1, max = 60) => {
  let v = from, t = 0;
  while (v !== goal && t < max) { v = lightLevel(phase, v, dt); t += dt; }
  return { v, t };
};

test('CUTS holds 4 cuts that run about 10 s with no gap', () => {
  // The heavy shutter made the sequence 2 s longer than the old 8 s.
  // The lens cut joins later as a fifth cut of about 2 s.
  assert.equal(CUTS.length, 4, `got ${CUTS.length} cuts`);
  assert.ok(total >= 9.5 && total <= 10.5 + 1e-9, `total ${total}`);
  assert.equal(CUTS[0].at, 0);
  for (let i = 1; i < CUTS.length; i++) {
    assert.ok(Math.abs(CUTS[i].at - (CUTS[i - 1].at + CUTS[i - 1].dur)) < 1e-9, `gap before cut ${i}`);
  }
  assert.equal(cutsTotal, total);
});
test('each cut is a locked camera: one field of view, no zoom', () => {
  for (const c of CUTS) {
    assert.equal(typeof c.fov, 'number', `${c.shot}: fov is one number, got ${JSON.stringify(c.fov)}`);
    assert.ok(Number.isFinite(c.fov) && c.fov >= 4 && c.fov <= 40, `${c.shot}: fov ${c.fov}`);
  }
});
test("the shutter cuts cover the shutter's travel, half each; the slew cuts hold 2 to 2.6 s", () => {
  const open = CUTS.filter(c => c.phase === 'open');
  assert.equal(open.length, 2);
  assert.equal(open[0].at, 0);
  for (const c of open) assert.ok(Math.abs(c.dur - SHUTTER_S / 2) < 1e-9, `${c.shot}: ${c.dur} s`);
  assert.ok(Math.abs(open[1].at + open[1].dur - SHUTTER_S) < 1e-9, 'the open cuts end with the travel');
  assert.equal(CUTS.find(c => c.phase === 'slew').at, SHUTTER_S);
  for (const c of CUTS.filter(c => c.phase === 'slew')) assert.ok(c.dur >= 2 - 1e-9 && c.dur <= 2.6, `${c.shot}: ${c.dur} s`);
});
// A star far round from the slit, so the slew outlasts the cuts.
const far = { hip: 1, ra: 0, dec: 0, mag: 1, ci: 0, dist: 1, spect: '', name: '', bayer: '' };
const sky = { targetAlt: 15, targetAz: 180, trails: false };
test('the real machine: each cut shows the phase it names; the slew starts on the first slew cut', () => {
  const m = makeMachine({ az: 0 });
  m.pick(far);
  assert.equal(m.phase, 'open');
  const dt = 0.01;
  let slewT = null;
  const seen = CUTS.map(() => new Set());
  let shut = null, open = null;
  // The time counts steps, so float sums never shift a cut boundary.
  for (let i = 0; i * dt < cutsTotal; i++) {
    const c = cutAt(i * dt);
    seen[CUTS.indexOf(c)].add(m.phase);
    m.step(dt, sky);
    const t = (i + 1) * dt;
    if (slewT === null && m.phase === 'slew') slewT = t;
    // The shutter moves from the first frame and is open when the slew starts.
    if (shut === null) shut = m.shutter01;
    if (open === null && m.phase === 'slew') open = m.shutter.p;
  }
  assert.ok(shut > 0 && shut < 0.01, `first frame ${shut}`);
  assert.equal(open, 1);
  const first = CUTS.find(c => c.phase === 'slew');
  assert.ok(first, 'a slew cut');
  assert.ok(Math.abs(slewT - first.at) <= dt + 1e-9, `slew at ${slewT}, first slew cut at ${first.at}`);
  CUTS.forEach((c, i) => assert.deepEqual([...seen[i]], [c.phase], `${c.shot} shows ${[...seen[i]]}`));
});
test('with the shutter open, the sequence starts at the first slew cut', () => {
  const shut = makeMachine({ az: 0 });
  shut.pick(far);
  assert.equal(startAt(shut.phase), 0);
  const open = makeMachine({ az: 0, shutter01: 1 });
  open.pick(far);
  assert.equal(open.phase, 'slew');
  const t0 = startAt(open.phase);
  assert.equal(cutAt(t0), CUTS.find(c => c.phase === 'slew'));
  // From there only slew cuts play, and the sequence is shorter.
  for (let t = t0; t < cutsTotal; t += 0.05) assert.equal(cutAt(t).phase, 'slew', `t ${t}`);
  assert.ok(cutsTotal - t0 < cutsTotal);
});
test('each cut locks its camera: the same values at its start, middle and end', () => {
  // The slit turns and the screen turns to portrait inside each cut.
  let az = 0, aspect = 1.6, made = 0;
  const locks = makeLocks(cut => { made++; return { shot: cut.shot, az, ...lens(cut.fov, aspect) }; });
  for (const c of CUTS) {
    const start = locks.at(c.at);
    az += 2; aspect = 0.5;
    const mid = locks.at(c.at + c.dur / 2);
    az += 2; aspect = 1.6;
    const end = locks.at(c.at + c.dur - 1e-6);
    assert.equal(start.shot, c.shot);
    assert.equal(mid, start, `${c.shot}: middle`);
    assert.equal(end, start, `${c.shot}: end`);
    assert.deepEqual(end, { shot: c.shot, az: start.az, fov: c.fov, tall: false }, `${c.shot}: values`);
  }
  assert.equal(made, CUTS.length);
  assert.equal(locks.at(cutsTotal + 0.01), null);
  // A new pick locks every cut again.
  locks.clear();
  assert.equal(locks.at(0).az, az);
});
test('lens: a portrait frame aims tall and widens up to 1.5 times; landscape keeps the cut lens', () => {
  assert.deepEqual(lens(10, 1.6), { fov: 10, tall: false });
  assert.deepEqual(lens(10, 1), { fov: 10, tall: false });
  const p = lens(10, 0.8);
  assert.equal(p.tall, true);
  assert.ok(p.fov > 10 && p.fov < 15, `fov ${p.fov}`);
  assert.deepEqual(lens(10, 0.2), { fov: 15, tall: true });
});
test('each shot shows once', () => {
  assert.equal(new Set(CUTS.map(c => c.shot)).size, CUTS.length);
});
test('cutAt(0) is the edge cut', () => {
  assert.equal(cutAt(0).shot, 'edge');
});
test('cutAt picks the cut that holds the time', () => {
  for (const c of CUTS) assert.equal(cutAt(c.at + c.dur / 2), c);
  // A cut boundary belongs to the later cut.
  for (let i = 1; i < CUTS.length; i++) assert.equal(cutAt(CUTS[i].at), CUTS[i]);
});
test('cutAt is null after the last cut and before the start', () => {
  assert.equal(cutAt(total + 0.01), null);
  assert.equal(cutAt(-0.01), null);
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
