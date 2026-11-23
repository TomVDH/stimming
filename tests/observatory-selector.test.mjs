// Observatory selector states. Run: node --test tests/observatory-selector.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { choose, hover, makeSelector, release, tapSel } from '../observatory/src/core/selector.ts';

const star = (hip) => ({ hip, ra: 0, dec: 0, mag: 2, ci: 0.5, dist: 10, spect: 'G2', name: '', bayer: '' });

test('a new selector is idle and its last scope is the reflector', () => {
  const s = makeSelector();
  assert.equal(s.mode, 'idle'); assert.equal(s.star, null); assert.equal(s.last, 'reflector');
});

test('a hover over a star shows it; a hover over empty sky goes idle', () => {
  const s = makeSelector();
  hover(s, star(1)); assert.equal(s.mode, 'hover'); assert.equal(s.star.hip, 1);
  hover(s, null); assert.equal(s.mode, 'idle'); assert.equal(s.star, null);
});

test('a tap on a star locks it', () => {
  const s = makeSelector();
  assert.equal(tapSel(s, star(1)), 'lock'); assert.equal(s.mode, 'locked'); assert.equal(s.star.hip, 1);
});

test('a hover while locked keeps the locked star', () => {
  const s = makeSelector();
  tapSel(s, star(1)); hover(s, star(2)); hover(s, null);
  assert.equal(s.mode, 'locked'); assert.equal(s.star.hip, 1);
});

test('a tap on empty sky while locked releases; while idle it does nothing', () => {
  const s = makeSelector();
  assert.equal(tapSel(s, null), 'none');
  tapSel(s, star(1));
  assert.equal(tapSel(s, null), 'release'); assert.equal(s.mode, 'idle'); assert.equal(s.star, null);
});

test('a tap on another star while locked locks the new star', () => {
  const s = makeSelector();
  tapSel(s, star(1));
  assert.equal(tapSel(s, star(2)), 'lock'); assert.equal(s.star.hip, 2);
});

test('choose while locked gives the star, sets last and goes idle', () => {
  const s = makeSelector();
  tapSel(s, star(1));
  assert.equal(choose(s, 'refractor').hip, 1);
  assert.equal(s.last, 'refractor'); assert.equal(s.mode, 'idle'); assert.equal(s.star, null);
});

test('choose while not locked gives null and keeps last', () => {
  const s = makeSelector();
  hover(s, star(1));
  assert.equal(choose(s, 'refractor'), null); assert.equal(s.last, 'reflector');
});

test('release lets go of a lock', () => {
  const s = makeSelector();
  tapSel(s, star(1)); release(s);
  assert.equal(s.mode, 'idle'); assert.equal(s.star, null);
});
