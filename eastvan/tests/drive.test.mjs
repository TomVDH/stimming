// Tests for the Drive's parts from city data: the disc and the walk's slice.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { driveParts } from '../drive.js';

const data = JSON.parse(fs.readFileSync(new URL('../data/drive.json', import.meta.url)));
const RECT = { kind: 'rect', e0: -18, n0: 21.9, e1: 12, n1: 51.9 };
const SLACK = 0.6;
// A part's centre in the data frame: x is north (n), z is east (e).
const centre = q => (q.p ? q.p : q.a ? q.a : q.ring ? [q.ring.reduce((s, r) => s + r[0], 0) / q.ring.length, 0, q.ring.reduce((s, r) => s + r[1], 0) / q.ring.length] : null);

test('rect cut stays inside', () => {
  const { PARTS } = driveParts(data, RECT);
  assert.ok(PARTS.length > 50, 'the slice has parts');
  for (const q of PARTS) {
    const c = centre(q);
    if (!c) continue;
    assert.ok(c[0] >= RECT.n0 - SLACK && c[0] <= RECT.n1 + SLACK && c[2] >= RECT.e0 - SLACK && c[2] <= RECT.e1 + SLACK, `${q.t} ${q.c} at n ${c[0].toFixed(1)}, e ${c[2].toFixed(1)}`);
  }
});

test('disc still builds', () => {
  const d = driveParts(data, { kind: 'disc', r: 58 });
  assert.equal(d.POKES.filter(p => p.id.startsWith('shop')).length, 24);
  assert.equal(d.LAMPS.length, 3);
});

test('lane mouth is open', () => {
  const { PARTS } = driveParts(data, RECT);
  for (const q of PARTS) {
    if (q.t !== 'poly' || q.h < 2) continue;
    const [n, , e] = centre(q);
    assert.ok(!(n > 37.6 && n < 40.3 && e < -11.9), `a building stands in the lane at n ${n.toFixed(1)}, e ${e.toFixed(1)}`);
  }
});
