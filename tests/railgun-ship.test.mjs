// Capital ship core: states, hits, joints, hulk fall, light.
// Run: node --test tests/railgun-ship.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  KILL, ARRIVE, VACUUM, BREAK, HULL, SHIP_ALT,
  makeShip, stepShip, hitShip, jointOrder, hulkAt, driftDeg, sunlit,
} from '../railgun/ship.js';

const station = (seed = 7) => { const s = makeShip(seed, 0); stepShip(s, ARRIVE); return s; };

test('a hit below 0.85 wounds, a second hit kills', () => {
  const s = station();
  assert.equal(hitShip(s, 0.5, 50, 1000), 'wound');
  assert.equal(s.state, 'wounded'); assert.equal(s.wound.joint, 150);
  assert.equal(hitShip(s, 0.2, 60, 1000), 'kill'); assert.equal(s.state, 'breakup');
});
test('a full charge kills at once', () => {
  const s = station();
  assert.equal(hitShip(s, KILL, 50, 1000), 'kill');
  assert.equal(s.state, 'breakup');
  assert.ok(s.hulks.every(h => h.breakAt !== null && h.breakAt >= 50));
});
test('no hit while arriving, breaking up, falling or gone', () => {
  const a = makeShip(7, 0);
  assert.equal(hitShip(a, 1, 5, 0), null);
  for (const state of ['breakup', 'falling', 'gone']) {
    const s = station(); s.state = state;
    assert.equal(hitShip(s, 1, 50, 0), null);
    assert.equal(s.state, state);
  }
});
test('joints fail outward from the hit within 2 s', () => {
  const o = jointOrder(150);
  assert.equal(o[0].joint, 150); assert.equal(o[0].at, 0);
  assert.ok(o.every(j => j.at >= 0 && j.at <= BREAK)); assert.ok(o[1].at <= o[2].at);
  assert.equal(o[2].at, BREAK);
});
test('hulk break times follow the joint order from the hit', () => {
  const s = station();
  hitShip(s, 1, 100, 150);
  const by = Object.fromEntries(s.hulks.map(h => [h.id, h.breakAt]));
  const at = Object.fromEntries(jointOrder(150).map(j => [j.joint, 100 + j.at]));
  assert.equal(by.prow, at[2440]);
  assert.equal(by.fore, Math.max(at[2440], at[150]));
  assert.equal(by.mid, Math.max(at[150], at[-2520]));
  assert.equal(by.drive, at[-2520]);
  assert.equal(by.tower, at[150]);
});
test('hulks fall 60 to 120 s and land 40 to 80 km out', () => {
  for (let seed = 1; seed <= 50; seed++) {
    const s = makeShip(seed, 0);
    assert.equal(s.hulks.length, 5);
    for (const h of s.hulks) {
      assert.ok(h.fallT >= 60 && h.fallT <= 120);
      assert.ok(h.dist >= 40000 && h.dist <= 80000);
      assert.ok(h.rumbleDelay >= 15 && h.rumbleDelay <= 25);
      assert.ok(Math.abs(h.bearing) <= 0.7);
      assert.equal(h.breakAt, null); assert.equal(h.landedAt, null);
    }
  }
});
test('the hull sections match the brief', () => {
  assert.deepEqual(HULL.joints, [2440, 150, -2520]);
  const d = Object.fromEntries(HULL.sections.map(x => [x.id, x]));
  assert.equal(d.prow.depth, 900); assert.equal(d.fore.depth, 1200);
  assert.equal(d.mid.depth, 1350); assert.equal(d.drive.x0, -5500);
  assert.equal(d.prow.x1, 5500); assert.equal(d.tower.x0, -2300);
});
test('entry is zero in vacuum and full by 25 s', () => {
  const h = makeShip(3, 0).hulks[0];
  assert.equal(hulkAt(h, 14).entry, 0);
  assert.equal(hulkAt(h, VACUUM).entry, 0);
  assert.equal(hulkAt(h, 25).entry, 1);
  const mid = hulkAt(h, 20).entry; assert.ok(mid > 0 && mid < 1);
});
test('hulkAt eases in and lands at fallT', () => {
  const h = makeShip(3, 0).hulks[0];
  assert.equal(hulkAt(h, 0).f, 0);
  assert.equal(hulkAt(h, h.fallT).f, 1);
  assert.ok(hulkAt(h, h.fallT / 2).f < 0.5);
  assert.equal(hulkAt(h, h.fallT - 0.1).landed, false);
  assert.equal(hulkAt(h, h.fallT).landed, true);
  assert.ok(Math.abs(hulkAt(h, 11).tumble - hulkAt(h, 10).tumble) < 0.1);
});
test('a hulk does not fall before its break', () => {
  const h = makeShip(3, 0).hulks[0];
  const a = hulkAt(h, -2);
  assert.equal(a.f, 0); assert.equal(a.entry, 0); assert.equal(a.landed, false);
});
test('falling turns gone once every hulk lands', () => {
  const s = station(); hitShip(s, 1, 100, 0);
  const end = Math.max(...s.hulks.map(h => h.breakAt + h.fallT));
  stepShip(s, 100 + BREAK + 0.01); assert.equal(s.state, 'falling');
  stepShip(s, end - 0.1); assert.equal(s.state, 'falling');
  stepShip(s, end); assert.equal(s.state, 'gone');
  assert.ok(s.hulks.every(h => h.landedAt !== null));
});
test('arrive turns station after 40 s', () => {
  const s = makeShip(2, 10);
  stepShip(s, 10 + ARRIVE - 0.1); assert.equal(s.state, 'arrive');
  stepShip(s, 10 + ARRIVE); assert.equal(s.state, 'station');
});
test('a wounded ship holds its state when stepped', () => {
  const s = station(); hitShip(s, 0.5, 50, 1000);
  stepShip(s, 500); assert.equal(s.state, 'wounded');
});
test('drift is one degree per 60 s', () => {
  assert.equal(driftDeg(0), 0); assert.equal(driftDeg(60), 1); assert.equal(driftDeg(120), 2);
});
test('sunlit: lit by day and at dusk, dark at deep night', () => {
  assert.equal(sunlit(SHIP_ALT, 10), 1); assert.equal(sunlit(SHIP_ALT, -12), 1);
  assert.equal(sunlit(SHIP_ALT, -25), 0);
  const edge = 6371000 * (1 / Math.cos(18 * Math.PI / 180) - 1);
  assert.equal(sunlit(edge + 1000, -18), 1);
  assert.equal(sunlit(edge - 1000, -18), 0);
  assert.ok(Math.abs(sunlit(edge, -18) - 0.5) < 1e-9);
});
test('makeShip is deterministic per seed', () => {
  assert.deepEqual(makeShip(3, 0), makeShip(3, 0));
  assert.notDeepEqual(makeShip(3, 0).hulks, makeShip(4, 0).hulks);
  assert.doesNotThrow(() => makeShip(0, 0));
});
