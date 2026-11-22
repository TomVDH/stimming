// Sorting sounds: each algorithm sorts, and each step names valid slots.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ALGOS, shuffled, isSorted } from '../sorting/algos.js';

// A small seeded random, so a failure repeats.
function seeded(s) { return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32); }

for (const [name, algo] of Object.entries(ALGOS)) {
  test(`${name} sorts rows of 1 to 64 bars`, () => {
    const rnd = seeded(7);
    for (const n of [1, 2, 3, 5, 8, 32, 48, 64]) {
      for (let r = 0; r < 4; r++) {
        const a = n > 1 ? shuffled(n, rnd) : [0];
        const copy = a.slice();
        let steps = 0;
        for (const s of algo(a)) {
          steps++;
          const slots = s.k === 'move' ? [s.from, s.to] : s.k === 'mark' ? [] : s.k === 'read' ? [s.i] : [s.i, s.j];
          for (const x of slots) assert.ok(x >= 0 && x < n, `${name}: slot ${x} of ${n}`);
          if (s.k === 'move') assert.ok(s.to <= s.from);
        }
        assert.ok(isSorted(a), `${name} leaves ${n} bars unsorted`);
        assert.deepEqual(a.slice().sort((p, q) => p - q), copy.sort((p, q) => p - q));
        assert.ok(steps < n * n * 4 + 8);
      }
    }
  });
}

test('shuffled never returns a sorted row', () => {
  const rnd = seeded(3);
  for (let i = 0; i < 200; i++) assert.ok(!isSorted(shuffled(3, rnd)));
});
