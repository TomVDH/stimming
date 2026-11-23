// Clearance rules: crossings clash, contacts and slivers do not.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clashes, crossDepth, DEPTH, flipPose, POLE_DEC, targetPose } from '../observatory/src/core/clearance.ts';

const tri = (...v) => Float64Array.from(v);
// A flat triangle in the plane z = 0.
const flat = tri(0, 0, 0, 1, 0, 0, 0, 1, 0);

test('a triangle that pierces the plane clashes', () => {
  const pierce = tri(0.2, 0.2, -0.5, 0.2, 0.2, 0.5, 0.8, 0.2, 0);
  assert.ok(crossDepth(flat, pierce) >= DEPTH, `depth ${crossDepth(flat, pierce)}`);
  assert.ok(clashes(flat, pierce));
});

test('triangles apart by a gap do not clash', () => {
  const above = tri(0.2, 0.2, 0.5, 0.2, 0.2, 0.9, 0.8, 0.2, 0.5);
  assert.equal(crossDepth(flat, above), -1);
  assert.ok(!clashes(flat, above));
});

test('a face lying flat on a face is a contact, not a clash', () => {
  const onTop = tri(0.1, 0.1, 0.0004, 0.6, 0.1, 0.0004, 0.1, 0.6, 0.0004);
  assert.ok(!clashes(flat, onTop));
});

test('a sliver of crossing under DEPTH is a contact', () => {
  // A tilted triangle that dips 0.2 mm through the plane.
  const sliver = tri(0.2, 0.2, -0.0002, 0.2, 0.2, 0.0002, 0.8, 0.2, 0);
  assert.ok(!clashes(flat, sliver));
});

test('targetPose keeps the counterweight down over the whole sky', () => {
  // In the joint frame the tube is up, and the weights down, when sin(ra) <= 0.
  for (let alt = 0; alt <= 90; alt += 5) {
    for (let az = 0; az < 360; az += 5) {
      const p = targetPose(alt, az, 0);
      assert.ok(Math.sin(p.ra) <= 1e-9, `${alt}/${az}: sin(ra) ${Math.sin(p.ra)}`);
    }
  }
  // An east target rides on side -1, a west target on side +1.
  assert.equal(targetPose(30, 90, 0).side, -1);
  assert.equal(targetPose(30, 270, 0).side, 1);
});

test('flipPose starts on the from-pose and ends on the to-pose, modulo a turn', () => {
  const from = targetPose(30, 90, 0);
  const to = targetPose(30, 270, from.ra);
  const start = flipPose(from, to, 0);
  const end = flipPose(from, to, 1);
  const turn = (x) => Math.abs(x - 2 * Math.PI * Math.round(x / (2 * Math.PI)));
  assert.ok(Math.abs(start.ra - from.ra) < 1e-12 && Math.abs(start.dec - from.dec) < 1e-12);
  assert.ok(turn(end.ra - to.ra) < 1e-9 && Math.abs(end.dec - to.dec) < 1e-12);
});

test('a flip never holds the tube on the pole while RA turns', () => {
  const from = targetPose(45, 170, 0);
  const to = targetPose(45, 190, from.ra);
  let prev = flipPose(from, to, 0);
  for (let i = 1; i <= 400; i++) {
    const p = flipPose(from, to, i / 400);
    // Wherever RA moves, dec sits at least 0.2 rad off the pole.
    if (Math.abs(p.ra - prev.ra) > 1e-9) assert.ok(Math.abs(p.dec - POLE_DEC) >= 0.2, `step ${i}: dec ${p.dec}`);
    prev = p;
  }
});
