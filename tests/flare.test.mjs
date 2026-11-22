// Tests for the JS helpers in shared/flare.js.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FLARE, FLARE_BUOY, flareFade, flareEdge, buoySlots, flarePass } from '../shared/flare.js';

test('fade is 1 at the light and 1/e at the reach', () => {
  assert.equal(flareFade(0), 1);
  assert.ok(Math.abs(flareFade(370) - Math.exp(-1)) < 1e-12);
  assert.ok(Math.abs(flareFade(100, 50) - Math.exp(-2)) < 1e-12);
});

test('edge fade is full inside the frame and 0 past 10 % outside', () => {
  assert.equal(flareEdge(0.5, 0.5), 1);
  assert.equal(flareEdge(0.97, 0.5), 1);
  assert.equal(flareEdge(1.1, 0.5), 0);
  assert.equal(flareEdge(0.5, -0.2), 0);
  const mid = flareEdge(1.04, 0.5);
  assert.ok(mid > 0 && mid < 1);
});

test('slots pack place, strengths and colour, and stop when full', () => {
  const s = buoySlots(2);
  assert.ok(s.add(0.25, 0.75, [1, 0.8, 0.5], { orb: 2, streak: 0.69, ghost: 0.81, size: 2.5, spread: 1.5, warmth: 0.2 }));
  assert.deepEqual([...s.pos.slice(0, 4)], [0.25, 0.75, 2.5, 1.5]);
  assert.deepEqual([...s.k.slice(0, 4)].map(x => +x.toFixed(4)), [2, 0.69, 0.81, 0.2]);
  assert.deepEqual([...s.col.slice(0, 4)].map(x => +x.toFixed(4)), [1, 0.8, 0.5, 0]);
  assert.ok(s.add(0, 0, [1, 1, 1]));
  assert.equal(s.add(0, 0, [1, 1, 1]), false);
  s.clear();
  assert.equal(s.used, 0);
  assert.equal(s.k[0], 0);
});

test('the pass shares the slot arrays and sizes its uniform arrays', () => {
  const s = buoySlots(3);
  const p = flarePass({ slots: s });
  assert.equal(p.uniforms.uFP.value, s.pos);
  assert.equal(p.uniforms.uFK.value, s.k);
  assert.match(p.fragmentShader, /uFP\[3\]/);
  assert.deepEqual(p.uniforms.uLook.value, [FLARE_BUOY.thin, FLARE_BUOY.length, 20]);
});

test('the GLSL holds the Buoy Business parts with the fl prefix', () => {
  for (const name of ['flBuoy(', 'flOrb(', 'flLine(', 'flRingTap(', 'FL_BB ', 'FL_BB_STREAK', 'FL_BB_GHOST', 'flFlare(']) assert.ok(FLARE.includes(name), name);
});

test('slots take a three.js-style colour, and the pass refuses zero slots', () => {
  const s = buoySlots(1);
  s.add(0.5, 0.5, { r: 0.2, g: 0.4, b: 0.6 }, { orb: 1 });
  assert.deepEqual([...s.col.slice(0, 3)].map(x => +x.toFixed(4)), [0.2, 0.4, 0.6]);
  assert.throws(() => flarePass({ slots: buoySlots(0) }));
});
