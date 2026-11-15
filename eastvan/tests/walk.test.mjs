// Tests for the walk layout: where each module sits along the walk.
import test from 'node:test';
import assert from 'node:assert/strict';
import { GAP, layWalk, near, stopWorld } from '../walk.js';

const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} is not ${b}`);
const house = { id: 'house', SIZE: [14, 22.9], ORIGIN: [0, 0, -1.45], JOIN: 'back' };
const yard = { id: 'yard', SIZE: [14, 9], ORIGIN: [0, 0, -17.4], JOIN: 'back' };
const lane = { id: 'lane', SIZE: [14, 12], ORIGIN: [0, 0, -22.5], JOIN: 'east' };
const run = { id: 'run', SIZE: [14, 12], ORIGIN: [0, 0, -22.5], JOIN: 'east' };

test('house stays put', () => {
  const [h] = layWalk([house], [0, -1.45]);
  h.offset.forEach(v => close(v, 0));
});

test('back joins step down -z', () => {
  const [, y] = layWalk([house, yard], [0, -1.45]);
  close(y.centre[2], -1.45 - 22.9 / 2 - GAP - 9 / 2);
  close(y.centre[2], -18);
});

test('east joins step along +x', () => {
  const [l, r] = layWalk([lane, run], [0, 0]);
  close(r.centre[0], l.centre[0] + 14 + GAP);
  close(r.centre[2], l.centre[2]);
});

test('near clips', () => {
  assert.deepEqual(near(0, 5), [0, 1]);
  assert.deepEqual(near(2, 5), [1, 2, 3]);
  assert.deepEqual(near(4, 5), [3, 4]);
});

test('stopWorld moves at', () => {
  const stop = { at: [0, 2, 0], yaw: 0.5, pitch: 0.3, w: 20, tall: 15, h: 14, band: 5, range: 12 };
  const out = stopWorld(stop, { offset: [1, 0, -6], yaw: 0 });
  assert.deepEqual(out.at, [1, 2, -6]);
  for (const k of ['yaw', 'pitch', 'w', 'tall', 'h', 'band', 'range']) assert.equal(out[k], stop[k]);
});

test('yaw turns the frame', () => {
  const drive = { id: 'drive', SIZE: [30, 30], ORIGIN: [36.9, 0, -3], JOIN: 'east', YAW: Math.PI / 2 };
  const [, d] = layWalk([run, drive], [0, 0]);
  const [ox, , oz] = drive.ORIGIN, c = Math.cos(d.yaw), s = Math.sin(d.yaw);
  // three.js turns (x, z) about y as (x cos + z sin, -x sin + z cos).
  close(ox * c + oz * s + d.offset[0], d.centre[0]);
  close(-ox * s + oz * c + d.offset[2], d.centre[2]);
  close(d.centre[0], 7 + GAP + 15);
  const st = stopWorld({ at: [36.9, 0, -3], yaw: 0, w: 1, tall: 1, h: 1, band: 1, range: 1 }, d);
  close(st.at[0], d.centre[0]); close(st.at[2], d.centre[2]);
});
