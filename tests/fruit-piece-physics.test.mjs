import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveCompoundPair } from '../fruit/piece-physics.js';

const piece = (mass, vx = 0, vz = 0) => ({
  mass,
  slide: { x: 0, y: 0 },
  slideV: { x: vx, y: vz },
  turnV: 0,
});
const circle = (x, z, r = 0.25) => ({ x, z, r });

test('Fruit compound contact separates the deepest overlap by inverse mass', () => {
  const a = piece(1), b = piece(0.5);
  const ac = [circle(-0.3, 0), circle(0, 0)];
  const bc = [circle(0.4, 0), circle(0.7, 0)];
  assert.equal(resolveCompoundPair(a, b, ac, bc), true);
  assert.ok(a.slide.x < 0);
  assert.ok(b.slide.x > 0);
  assert.ok(b.slide.x > -a.slide.x);
  assert.ok(0.4 + b.slide.x - a.slide.x >= 0.518);
});

test('Fruit compound contact removes closing velocity', () => {
  const a = piece(1, 1), b = piece(1, -1);
  resolveCompoundPair(a, b, [circle(0, 0, 0.3)], [circle(0.5, 0, 0.3)]);
  assert.ok(b.slideV.x - a.slideV.x >= 0);
});

test('Fruit compound contact includes bounded tangential friction', () => {
  const a = piece(1, 1, 1), b = piece(1, -1, -1);
  resolveCompoundPair(a, b, [circle(0, 0, 0.3)], [circle(0.5, 0, 0.3)]);
  assert.ok(Math.abs(b.slideV.y - a.slideV.y) < 2);
  assert.notEqual(a.turnV, b.turnV);
});

test('Coincident fruit contacts separate along a finite fallback', () => {
  const a = piece(1), b = piece(1);
  resolveCompoundPair(a, b, [circle(0, 0, 0.3)], [circle(0, 0, 0.3)], -1);
  assert.ok(Number.isFinite(a.slide.x) && Number.isFinite(a.slide.y));
  assert.ok(Math.hypot(a.slide.x, a.slide.y) > 0.3);
  assert.ok(Math.abs(a.slide.x + b.slide.x) < 1e-9);
  assert.ok(Math.abs(a.slide.y + b.slide.y) < 1e-9);
});

test('Separated fruit compounds keep their state', () => {
  const a = piece(1), b = piece(1);
  assert.equal(resolveCompoundPair(a, b, [circle(0, 0)], [circle(1, 0)]), false);
  assert.deepEqual(a.slide, { x: 0, y: 0 });
  assert.deepEqual(b.slide, { x: 0, y: 0 });
});

test('A long wedge collides at its tip, not only its centre', () => {
  const a = piece(1), b = piece(1);
  const longA = [circle(-0.8, 0, 0.18), circle(-0.4, 0, 0.18), circle(0, 0, 0.18)];
  const longB = [circle(-0.98, 0.1, 0.18), circle(-1.4, 0.1, 0.18)];
  assert.equal(resolveCompoundPair(a, b, longA, longB), true);
  assert.notEqual(a.slide.x, 0);
});
