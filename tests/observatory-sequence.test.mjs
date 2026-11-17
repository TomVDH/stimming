// Observatory pick sequence and the complex lights. Run: node --test tests/observatory-sequence.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { CUTS, cutAt, lightLevel, lightGoal, cutsTotal } from '../observatory/src/core/sequence.ts';

const total = CUTS.reduce((s, c) => s + c.dur, 0);
// Steps lightLevel until it reaches the goal; returns the seconds it took.
const until = (phase, from, goal, dt = 0.1, max = 60) => {
  let v = from, t = 0;
  while (v !== goal && t < max) { v = lightLevel(phase, v, dt); t += dt; }
  return { v, t };
};

test('CUTS holds 4 cuts that run 7.5 to 8 s with no gap', () => {
  // The lens cut joins later as a fifth cut of about 2 s.
  assert.equal(CUTS.length, 4, `got ${CUTS.length} cuts`);
  assert.ok(total >= 7.5 && total <= 8 + 1e-9, `total ${total}`);
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
test('each cut holds a beat: 2 to 2.6 s', () => {
  for (const c of CUTS) assert.ok(c.dur >= 2 - 1e-9 && c.dur <= 2.6, `${c.shot}: ${c.dur} s`);
});
test('the shutter opens over the first two cuts; the slew starts on the third', () => {
  // The shutter takes 4 s from the pick.
  // The slew starts then.
  assert.equal(cutAt(3.99).shot, 'slit');
  assert.equal(cutAt(4).shot, 'gear');
  assert.equal(CUTS[CUTS.length - 1].shot, 'roll');
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
