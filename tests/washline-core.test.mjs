// Washing line core: pulley line, reel clamp, stability.
// Run: node --test tests/washline-core.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeLine, ropeAt, makePiece, hang, reel, stepWorld, WIND } from '../washline/core.js';

const A = [-2.5, 8, 0], B = [2.5, 8, 0];

test('ropeAt gives the anchors at both ends', () => {
  const line = makeLine(A, B);
  const p = ropeAt(line.rope, 0, [0, 0, 0]), q = ropeAt(line.rope, line.len, [0, 0, 0]);
  for (let i = 0; i < 3; i++) {
    assert.ok(Math.abs(p[i] - A[i]) < 1e-6);
    assert.ok(Math.abs(q[i] - B[i]) < 1e-6);
  }
});

test('reel stops at both pulleys', () => {
  const line = makeLine(A, B);
  const pc = makePiece({ w: 1, h: 0.8, col: 0 });
  hang(line, pc, 0.4);
  const got = reel(line, 10);
  assert.ok(got < 10);
  assert.ok(Math.max(...pc.pegs.map(g => g.s)) <= line.len - 0.25 + 1e-9);
  reel(line, -10);
  assert.ok(Math.min(...pc.pegs.map(g => g.s)) >= 0.25 - 1e-9);
});

test('600 steps in a blowy wind stay finite; pegs follow the line', () => {
  const line = makeLine(A, B);
  hang(line, makePiece({ w: 1.1, h: 0.9, col: 0 }), 0.4);
  hang(line, makePiece({ w: 0.8, h: 1.2, col: 1 }), 1.8);
  hang(line, makePiece({ w: 1.2, h: 0.7, col: 2 }), 3.0);
  let t = 0;
  for (let i = 0; i < 600; i++) { t += 1 / 120; stepWorld(line, t, { ...WIND.blowy, scale: 1 }); }
  for (const pc of line.pieces) {
    for (const arr of [pc.x, pc.y, pc.z]) for (const v of arr) assert.ok(Number.isFinite(v));
  }
  const mid = line.rope.y[line.rope.n >> 1];
  assert.ok(mid < A[1], `mid ${mid} should sag below ${A[1]}`);
  const o = [0, 0, 0];
  for (const pc of line.pieces) for (const g of pc.pegs) {
    ropeAt(line.rope, g.s, o);
    const d = Math.hypot(pc.x[g.p] - o[0], pc.y[g.p] - o[1], pc.z[g.p] - o[2]);
    assert.ok(d < 0.02, `peg off the line by ${d}`);
  }
});
