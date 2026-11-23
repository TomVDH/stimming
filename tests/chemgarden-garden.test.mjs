// Chemical garden: the growth model grows, stays in the tank, settles and clears.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Garden, TANK, mulberry } from '../chemgarden/garden.js';

const grown = (seed = 7) => {
  const g = new Garden({ rand: mulberry(seed) });
  [-0.6, -0.2, 0.2, 0.6].forEach((x, i) => g.drop(i, x, 0, { now: true }));
  g.settle();
  return g;
};

test('every tower settles and the garden goes idle', () => {
  const g = grown();
  assert.equal(g.busy, false);
  assert.equal(g.towers.length, 4);
  for (const t of g.towers) assert.equal(t.phase, 'done');
});

test('every joint stays inside the tank and under the surface', () => {
  const g = grown(11);
  for (const t of g.towers) for (const tb of t.tubes) for (const p of tb.pts) {
    assert.ok(Math.abs(p.x) <= TANK.w / 2, `x ${p.x}`);
    assert.ok(Math.abs(p.z) <= TANK.d / 2, `z ${p.z}`);
    assert.ok(p.y <= TANK.surface + 1e-6 && p.y >= 0, `y ${p.y}`);
  }
});

test('copper reaches the surface; iron stays low', () => {
  const g = grown(3);
  const top = t => Math.max(...t.tubes.flatMap(tb => tb.pts.map(p => p.y)));
  assert.ok(top(g.towers[0]) > TANK.surface - 0.05);
  assert.ok(top(g.towers[3]) < TANK.surface * 0.75);
});

test('a dropped seed sinks, lands and reports each step', () => {
  const g = new Garden({ rand: mulberry(5) });
  g.drop(0, 0, 0);
  const seen = new Set();
  for (let i = 0; i < 900 && (g.busy || i === 0); i++) {
    g.step(1 / 30);
    for (const e of g.events) seen.add(e.type);
    g.events.length = 0;
  }
  for (const k of ['enter', 'land', 'pop', 'surface']) assert.ok(seen.has(k), k);
});

test('clear crumbles every tower and empties the tank', () => {
  const g = grown();
  g.clear();
  for (let i = 0; i < 120; i++) g.step(1 / 30);
  assert.equal(g.towers.length, 0);
});

test('the joint budget crumbles the oldest tower', () => {
  const g = new Garden({ rand: mulberry(9), budget: 600 });
  for (let i = 0; i < 6; i++) { g.drop(i % 4, -0.6 + i * 0.24, 0, { now: true }); g.settle(); }
  let n = 0;
  for (const t of g.towers) for (const tb of t.tubes) n += tb.pts.length;
  assert.ok(n < 1200, `joints ${n}`);
});
