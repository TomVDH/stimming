import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HULLS } from '../tornado/vshape.js';
import { hullMesh, rayHull } from '../tornado/vmesh.js';

// The nearest triangle a ray meets, Moller-Trumbore; Infinity on a miss.
function rayMesh(pos, ro, rd) {
  let best = Infinity;
  for (let i = 0; i < pos.length; i += 9) {
    const a = pos.slice(i, i + 3), b = pos.slice(i + 3, i + 6), c = pos.slice(i + 6, i + 9);
    const e1 = b.map((v, k) => v - a[k]), e2 = c.map((v, k) => v - a[k]);
    const p = [rd[1] * e2[2] - rd[2] * e2[1], rd[2] * e2[0] - rd[0] * e2[2], rd[0] * e2[1] - rd[1] * e2[0]];
    const det = e1[0] * p[0] + e1[1] * p[1] + e1[2] * p[2];
    if (Math.abs(det) < 1e-12) continue;
    const s = ro.map((v, k) => v - a[k]);
    const u = (s[0] * p[0] + s[1] * p[1] + s[2] * p[2]) / det;
    if (u < -1e-9 || u > 1 + 1e-9) continue;
    const q = [s[1] * e1[2] - s[2] * e1[1], s[2] * e1[0] - s[0] * e1[2], s[0] * e1[1] - s[1] * e1[0]];
    const v = (rd[0] * q[0] + rd[1] * q[1] + rd[2] * q[2]) / det;
    if (v < -1e-9 || u + v > 1 + 1e-9) continue;
    const t = (e2[0] * q[0] + e2[1] * q[1] + e2[2] * q[2]) / det;
    if (t > 1e-9 && t < best) best = t;
  }
  return best;
}
// A fixed random stream, so a failure repeats.
function rng(seed) { let a = seed; return () => { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296; }; }

test('a plain box has 12 triangles, every vertex inside its planes', () => {
  const m = hullMesh([0, 1, 0], [1, 0.5, 2], 0, []);
  assert.equal(m.pos.length / 9, 12);
  for (let i = 0; i < m.pos.length; i += 3) {
    assert.ok(Math.abs(m.pos[i]) <= 1 + 1e-6, 'x ' + m.pos[i]);
    assert.ok(Math.abs(m.pos[i + 1] - 1) <= 0.5 + 1e-6, 'y ' + m.pos[i + 1]);
    assert.ok(Math.abs(m.pos[i + 2]) <= 2 + 1e-6, 'z ' + m.pos[i + 2]);
  }
});

test('each triangle normal points out and has unit length', () => {
  const m = hullMesh([0, 0, 0], [1, 1, 1], 0.2, []);
  for (let i = 0; i < m.nrm.length; i += 9) {
    const n = m.nrm.slice(i, i + 3), p = m.pos.slice(i, i + 3);
    assert.ok(Math.abs(Math.hypot(...n) - 1) < 1e-9);
    assert.ok(n[0] * p[0] + n[1] * p[1] + n[2] * p[2] > 0, 'normal points in');
  }
});

test('the mesh and the ray test agree on 2000 rays per hull', () => {
  const r = rng(7);
  for (const hs of HULLS) for (const hl of hs) {
    const m = hullMesh(hl.c, hl.h, hl.e, hl.pl);
    for (let k = 0; k < 2000; k++) {
      // From a point 12 m off, toward a point in the hull's box.
      const th = r() * Math.PI * 2, ph = (r() - 0.5) * Math.PI;
      const ro = [hl.c[0] + 12 * Math.cos(ph) * Math.cos(th), hl.c[1] + 12 * Math.sin(ph), hl.c[2] + 12 * Math.cos(ph) * Math.sin(th)];
      const at = hl.c.map((v, i) => v + (r() * 2 - 1) * hl.h[i]);
      const d = at.map((v, i) => v - ro[i]), l = Math.hypot(...d), rd = d.map(v => v / l);
      const a = rayMesh(m.pos, ro, rd), b = rayHull(ro, rd, hl.c, hl.h, hl.e, hl.pl);
      assert.ok(a === b || Math.abs(a - b) < 1e-4, `hull id ${hl.id}: mesh ${a}, ray ${b}`);
    }
  }
});
