import test from 'node:test';
import assert from 'node:assert/strict';
import { STARS } from '../starchart/sun.js';
import { VOICES, NORM, TAPNORM, GLOWNORM } from '../starchart/choir.js';
import { ROOT } from '../starchart/sound.js';

const ids = Object.keys(STARS);

test('every Star Chart body has a voice, root, NORM and TAPNORM entry', () => {
  for (const id of ids) {
    assert.ok(VOICES[id], `${id} missing from VOICES`);
    assert.ok(Number.isFinite(ROOT[id]) && ROOT[id] > 0, `${id} missing valid ROOT`);
    assert.ok(Object.hasOwn(NORM, id), `${id} missing from NORM`);
    assert.ok(Object.hasOwn(TAPNORM, id), `${id} missing from TAPNORM`);
    assert.equal(VOICES[id].norm, NORM[id], `${id} VOICES.norm differs from NORM`);
    assert.equal(VOICES[id].tapNorm, TAPNORM[id], `${id} VOICES.tapNorm differs from TAPNORM`);
    assert.equal(VOICES[id].glowNorm, GLOWNORM[id] ?? 1, `${id} VOICES.glowNorm differs from GLOWNORM`);
  }
});

test('all normalization factors stay within valid bounds', () => {
  for (const id of ids) {
    assert.ok(NORM[id] >= 0.02 && NORM[id] <= 2, `${id} NORM out of range: ${NORM[id]}`);
    assert.ok(TAPNORM[id] >= 0.5 && TAPNORM[id] <= 2, `${id} TAPNORM out of range: ${TAPNORM[id]}`);
    if (Object.hasOwn(GLOWNORM, id)) {
      assert.ok(GLOWNORM[id] > 0 && GLOWNORM[id] <= 1, `${id} GLOWNORM out of range: ${GLOWNORM[id]}`);
    }
  }
});

test('every loud distant addition is trimmed well below 0.5', () => {
  for (const id of ['eincross', 'momz14', 'uhz1', 'earendel', 'v838', 'mothra', 'etacar', 'wohg64', 'vfts352', 'ring']) {
    assert.ok(NORM[id] < 0.4, `${id} NORM too loud: ${NORM[id]}`);
  }
});
