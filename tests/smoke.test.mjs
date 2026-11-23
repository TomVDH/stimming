// Tests for shared/smoke.js: the shader contract, the preset, and the light model.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SMOKE, SM_FIRE, smConsts } from '../shared/smoke.js';

const code = SMOKE.replace(/\/\/[^\n]*/g, '');

test('the GLSL declares no uniforms, varyings, inputs, outputs or main', () => {
  assert.doesNotMatch(code, /^\s*(uniform|varying|attribute|in|out)\s/m);
  assert.doesNotMatch(code, /\bvoid\s+main\b/);
  assert.doesNotMatch(code, /\b(texture2D|gl_FragColor)\b/);
});

test('every function carries the sm prefix', () => {
  const fns = [...code.matchAll(/^(?:float|vec[234])\s+(\w+)\s*\(/gm)].map(m => m[1]);
  assert.deepEqual(fns.sort(), ['smLight', 'smPhase', 'smTransmit']);
});

test('SM_FIRE holds the numbers the GLSL copies share', () => {
  assert.ok(Object.isFrozen(SM_FIRE));
  assert.deepEqual({ ...SM_FIRE }, { absorb: 2.0, ambient: 0.5, powder: 0.59, multi: 1.0, g: 0.55 });
});

test('smConsts writes every look value as a prefixed GLSL float', () => {
  assert.equal(smConsts(), 'const float smAbsorb = 2.0, smAmbient = 0.5, smPowder = 0.59, smMulti = 1.0, smG = 0.55;\n');
  assert.equal(smConsts({ absorb: 1.6, ambient: 0.12, powder: 0.5, multi: 1, g: 0 }), 'const float smAbsorb = 1.6, smAmbient = 0.12, smPowder = 0.5, smMulti = 1.0, smG = 0.0;\n');
  assert.throws(() => smConsts({ ...SM_FIRE, powder: NaN }));
  assert.throws(() => smConsts({ absorb: 1 }));
});

// The GLSL model, in JS, to pin its shape.
const transmit = (tau, multi, powder) => {
  const beer = Math.exp(-tau), ms = Math.exp(-tau * 0.25) * 0.5;
  const base = beer + (beer + ms - beer) * multi;
  const pw = 1 - Math.exp(-tau * 2);
  return base + (base * pw - base) * powder;
};

test('the GLSL formula matches Fire: Beer, the scatter lobe, powder', () => {
  assert.match(code, /exp\(-tau\)/);
  assert.match(code, /exp\(-tau \* 0\.25\) \* 0\.5/);
  assert.match(code, /1\.0 - exp\(-tau \* 2\.0\)/);
  assert.match(code, /clamp\(smTransmit\(tau, multi, powder\) \+ ambient, 0\.0, 1\.0\)/);
  // Thin smoke with no powder passes Beer plus half the lobe.
  assert.ok(Math.abs(transmit(0, 1, 0) - 1.5) < 1e-12);
  // Powder darkens thin smoke most.
  assert.equal(transmit(0, 1, 1), 0);
  assert.ok(transmit(0.5, 1, 0.59) < transmit(0.5, 1, 0));
});
