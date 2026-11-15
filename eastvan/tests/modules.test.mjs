// Tests for the module files: each one is a sound, self-contained diorama.
import test from 'node:test';
import assert from 'node:assert/strict';

const NAMES = ['house', 'yard', 'lane'];
const mods = await Promise.all(NAMES.map(n => import(`../modules/${n}.js`)));
// Eaves, awnings and fence posts may hang this far past the plinth.
const SLACK = 0.6;

for (const m of mods) {
  const parts = m.PARTS, sws = new Set(parts.filter(q => q.sw).map(q => q.sw)), dyns = new Set(parts.filter(q => q.dyn).map(q => q.dyn));

  test(`${m.ID}: parts fit the plinth`, () => {
    const [w, d] = m.SIZE, [ox, , oz] = m.ORIGIN;
    for (const q of parts) {
      if (!['box', 'cyl', 'blob'].includes(q.t)) continue;
      const [x, , z] = q.p;
      assert.ok(Math.abs(x - ox) <= w / 2 + SLACK && Math.abs(z - oz) <= d / 2 + SLACK, `${q.k || q.c} at ${x}, ${z} is off the plinth`);
    }
  });

  test(`${m.ID}: poke ids are unique`, () => {
    const ids = m.POKES.map(p => p.id);
    assert.equal(new Set(ids).size, ids.length);
  });

  test(`${m.ID}: acts point at real things`, () => {
    for (const [id, steps] of Object.entries(m.ACTS)) for (const [kind, target] of steps) {
      if (kind === 'flip') assert.ok(sws.has(target), `${id} flips a missing switch ${target}`);
      else assert.ok(dyns.has(target), `${id} moves a missing mover ${target}`);
    }
    for (const id of Object.keys(m.MOVES)) assert.ok(dyns.has(id), `MOVES names a missing mover ${id}`);
    // A poke with no act flips the switch of its own name.
    for (const p of m.POKES) assert.ok(m.ACTS[p.id] || sws.has(p.id), `poke ${p.id} does nothing`);
  });

  test(`${m.ID}: lamps follow real things`, () => {
    for (const l of m.LAMPS) {
      const [kind, id] = l.of.split(':');
      assert.ok(kind === 'sw' ? sws.has(id) : dyns.has(id), `lamp follows a missing ${l.of}`);
    }
  });

  test(`${m.ID}: no plinth parts`, () => {
    assert.ok(!parts.some(q => q.k === 'plinth'));
  });
}
