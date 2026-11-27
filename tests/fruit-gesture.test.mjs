import test from 'node:test';
import assert from 'node:assert/strict';
import { gestureLimits, isFlick } from '../fruit/gesture.js';

test('Fruit gesture limits remain bounded across viewports', () => {
  const phone = gestureLimits(375, 812, 'touch');
  const desktop = gestureLimits(1280, 800, 'mouse');
  assert.deepEqual(phone, {
    slop: 16, slice: 45, flickMax: 90, flickMs: 480, flickSpeed: 420, holdMs: 300,
  });
  assert.equal(desktop.slice, 68);
  assert.equal(desktop.flickMax, 124);
});

test('Fruit flick requires short, fast, intentional travel', () => {
  const limits = gestureLimits(375, 812, 'touch');
  assert.equal(isFlick(60, 140, 600, limits), true);
  assert.equal(isFlick(10, 120, 600, limits), false);
  assert.equal(isFlick(100, 140, 700, limits), false);
  assert.equal(isFlick(60, 520, 600, limits), false);
  assert.equal(isFlick(60, 140, 300, limits), false);
});
