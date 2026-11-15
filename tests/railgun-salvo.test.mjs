// Railgun Salvo core: bank, launch, recoil, tally, gain.
// Run: node --test tests/railgun-salvo.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { BANK, ROUND_C, KILL_LINE, GAP, LAUNCH, MAX_ROUNDS, bankAt, launchAt, recoilAt, makeTally, landRound, roundGain } from '../railgun/salvo.js';

test('the constants match the spec', () => {
  assert.deepEqual(BANK, [2.41, 5.5, 8.6, 12.6, 14.6]);
  assert.equal(ROUND_C, 0.35); assert.equal(KILL_LINE, 1.0); assert.equal(GAP, 0.5); assert.equal(LAUNCH, 0.3); assert.equal(MAX_ROUNDS, 5);
});

test('the hold banks rounds at the table times', () => {
  assert.equal(bankAt(2.3), 0); assert.equal(bankAt(2.41), 1); assert.equal(bankAt(8.6), 3); assert.equal(bankAt(16), 5);
});

test('rounds launch 0.5 s apart from 0.3 s', () => {
  assert.deepEqual([1, 2, 5].map(launchAt), [0.3, 0.8, 2.3]);
});

test('a fresh rock: crater, crater, break, hunt, hunt', () => {
  const t = makeTally();
  assert.deepEqual([1, 2, 3, 4, 5].map(() => landRound(t, ROUND_C)), ['crater', 'crater', 'break', 'hunt', 'hunt']);
});

test('a wounded rock breaks on round 1; three hunts, then a miss', () => {
  const t = makeTally(); landRound(t, ROUND_C); landRound(t, ROUND_C);
  assert.deepEqual([1, 2, 3, 4, 5].map(() => landRound(t, ROUND_C)), ['break', 'hunt', 'hunt', 'hunt', 'miss']);
});

test('recoil rises round by round and peaks near the cap', () => {
  const peak = j => Math.max(...Array.from({ length: 60 }, (_, i) => recoilAt(launchAt(j) + i * 0.01, 5, 300)));
  assert.ok(peak(1) < peak(2) && peak(4) < peak(5));
  assert.ok(Math.abs(peak(5) - 300) < 3);
});

test('between rounds the barrel gets partway home', () => {
  const s = recoilAt(launchAt(2) - 0.01, 5, 300);
  assert.ok(s > 5 && s < 60);
});

test('a three-round bank stops at three fifths of the cap', () => {
  assert.ok(Math.abs(Math.max(...Array.from({ length: 400 }, (_, i) => recoilAt(i * 0.01, 3, 300))) - 180) < 3);
});

test('the last round runs out slowly', () => {
  assert.ok(recoilAt(launchAt(5) + 3, 5, 300) > 100);
});

test('no recoil before the first round leaves', () => {
  assert.equal(recoilAt(0.29, 5, 300), 0);
});

test('round gain rises to 1', () => {
  assert.ok(roundGain(1, 5) < roundGain(5, 5));
  assert.ok(Math.abs(roundGain(5, 5) - 1) < 1e-12);
});
