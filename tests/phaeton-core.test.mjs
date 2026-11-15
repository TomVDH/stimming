// Phaeton core: the shot clocks, the debris poses, the shell fracture.
// Run: node --test tests/phaeton-core.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeShot } from '../phaeton/shot.js';
import { solve, poseAt, pile, pack, NEVER, ROW, G } from '../phaeton/debris.js';
import { rng, lathe, seedSurface, shellShards } from '../phaeton/fracture.js';

const TABLE = { x0: -1.75, x1: 1.75, z: 0.5, y: 0 };
const SHOT = { muzzle: -0.95, speed: 380, targets: [-0.55, -0.2, 0.15, 0.5, 0.85, 1.2].map(x => ({ x, r: 0.04 })) };
const piece = o => ({ p0: [0, 0.3, 0], t0: 0.001, v: [3, 2, 0.5], k: 6, axis: [1, 0, 0], turn: 20, r: 0.01, ...o });

test('W(s) never runs backward and ends in real time', () => {
  const shot = makeShot(SHOT);
  let last = -1;
  for (let s = 0; s <= shot.dur; s += 0.004) {
    const T = shot.W(s);
    assert.ok(T >= last, `W falls at s=${s}`);
    last = T;
  }
  const a = shot.W(shot.dur - 1), b = shot.W(shot.dur - 0.5);
  assert.ok(Math.abs(b - a - 0.5) < 1e-9);
});

test('each photo holds the slug at its target', () => {
  const shot = makeShot(SHOT);
  const photos = shot.spans.filter(e => e.kind === 'photo');
  assert.equal(photos.length, 6);
  photos.forEach((p, i) => {
    const x0 = shot.slugX(shot.W(p.s0)), x1 = shot.slugX(shot.W(p.s1)), t = SHOT.targets[i];
    assert.ok(x0 < t.x - t.r && x0 > t.x - t.r - 0.05, 'the photo starts just before the entry');
    assert.ok(x1 > t.x + t.r && x1 < t.x + 0.3, 'the photo ends just after the exit');
    assert.ok(p.s1 - p.s0 >= 0.5, 'flash onsets stay half a second apart or more');
  });
});

test('a pose depends on T only, forward and backward', () => {
  const p = solve(piece({}), TABLE, 0.002), times = [0, 0.0011, 0.01, 0.2, 0.31, 0.5, 1, 3];
  const fwd = times.map(T => poseAt(p, T)), back = [...times].reverse().map(T => poseAt(p, T)).reverse();
  assert.deepEqual(fwd, back);
  assert.deepEqual(poseAt(p, 0).pos, p.p0);
  assert.equal(poseAt(p, p.t0).angle, 0);
});

test('a piece meets the table at t1 and never goes under it', () => {
  const rand = rng(7);
  for (let n = 0; n < 200; n++) {
    const p = solve(piece({ v: [rand() * 8 - 4, rand() * 12 - 4, rand() * 2 - 1], k: 2 + rand() * 40 }), TABLE, 0.002);
    if (p.t1 >= NEVER) continue;
    assert.ok(Math.abs(poseAt(p, p.t0 + p.t1).pos[1] - p.h) < 1e-6);
    for (let tau = p.t1; tau < p.rest + 1; tau += 0.003) assert.ok(poseAt(p, p.t0 + tau).pos[1] >= p.h - 1e-9);
    // At rest the piece lies still, at its rest height, with the whole turn done.
    const a = poseAt(p, p.t0 + p.rest), b = poseAt(p, p.t0 + p.rest + 2);
    assert.deepEqual(a.pos.map(v => +v.toFixed(9)), b.pos.map(v => +v.toFixed(9)));
    assert.ok(Math.abs(b.pos[1] - p.h) < 1e-9);
    assert.ok(Math.abs(b.angle - p.turn) < 1e-9);
  }
});

test('the path has no jump at a contact', () => {
  const p = solve(piece({ v: [1.5, 1, 0.2], k: 3 }), TABLE, 0.002), d = 1e-6;
  const marks = [p.t1, p.t1 + 2 * p.u1 * 0.3 / G, p.rest];
  for (const m of marks) {
    const a = poseAt(p, p.t0 + m - d).pos, b = poseAt(p, p.t0 + m + d).pos;
    for (let i = 0; i < 3; i++) assert.ok(Math.abs(a[i] - b[i]) < 1e-4, `jump at ${m} on axis ${i}`);
  }
});

test('a piece that passes the table edge falls into the dark', () => {
  const p = solve(piece({ v: [0, 0, 40], k: 4 }), TABLE, 0.002);
  assert.equal(p.t1, NEVER);
  assert.ok(poseAt(p, 2).pos[1] < -5);
});

test('a pile lifts the later piece', () => {
  const a = solve(piece({ v: [0.01, 0, 0], k: 6 }), TABLE, 0.002), b = solve(piece({ v: [0.01, 0.5, 0], k: 6 }), TABLE, 0.002);
  pile([a, b], TABLE, () => 0.002, 0.001);
  assert.equal(a.h, 0.002);
  assert.ok(Math.abs(b.h - 0.003) < 1e-12);
  assert.equal(pack([a, b]).length, 2 * ROW * 4);
});

test('shell shards keep the whole surface and close each shard', () => {
  const profile = [];
  for (let i = 0; i <= 24; i++) { const a = (i / 24) * Math.PI; profile.push([0.04 * Math.sin(a), 0.04 * Math.cos(a)]); }
  const surf = lathe(profile, 40), seeds = seedSurface(surf, 60, rng(3));
  const sh = shellShards(surf, seeds, 0.001);
  assert.ok(sh.pieces.length > 50 && sh.pieces.length <= 60);
  // The shards' outer faces add up to the surface: no gap, no overlap.
  let surfArea = 0;
  for (let t = 0; t < surf.idx.length; t += 3) {
    const [a, b, c] = [0, 1, 2].map(j => [0, 1, 2].map(k => surf.pos[surf.idx[t + j] * 3 + k]));
    const u = b.map((v, i) => v - a[i]), w = c.map((v, i) => v - a[i]);
    surfArea += 0.5 * Math.hypot(u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]);
  }
  const sum = sh.pieces.reduce((s, p) => s + p.area, 0);
  assert.ok(Math.abs(sum / surfArea - 1) < 1e-6, `area ratio ${sum / surfArea}`);
  // Every vertex names a real shard; a wall belongs to a rim.
  const ids = new Set(sh.piece);
  assert.equal(ids.size, sh.pieces.length);
  assert.ok(sh.wall.some(w => w === 1));
  // One seed gives one break.
  const again = shellShards(surf, seedSurface(surf, 60, rng(3)), 0.001);
  assert.deepEqual(again.position, sh.position);
});
