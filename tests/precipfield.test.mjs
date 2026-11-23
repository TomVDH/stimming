// Tests for shared/precipfield.js: the shader contract and the JS helpers.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PRECIPFIELD, PF_SNOW, PF_RAIN, pfFloat } from '../shared/precipfield.js';

// Strip comments, so the contract checks read code only.
const code = PRECIPFIELD.replace(/\/\/[^\n]*/g, '');

test('the GLSL declares no uniforms, varyings, inputs, outputs or main', () => {
  assert.doesNotMatch(code, /^\s*(uniform|varying|attribute|in|out)\s/m);
  assert.doesNotMatch(code, /\bvoid\s+main\b/);
  assert.doesNotMatch(code, /\b(texture2D|gl_FragColor|gl_VertexID|gl_InstanceID)\b/);
});

test('every function, struct and constant carries the pf prefix', () => {
  const fns = [...code.matchAll(/^(?:float|vec[234]|int|bool|void|PfStreak)\s+(\w+)\s*\(/gm)].map(m => m[1]);
  const structs = [...code.matchAll(/\bstruct\s+(\w+)/g)].map(m => m[1]);
  const consts = [...code.matchAll(/^const\s+\w+\s+(\w+)/gm)].map(m => m[1]);
  assert.ok(fns.length >= 10, `found ${fns.length} functions`);
  for (const n of fns) assert.match(n, /^pf[A-Z0-9]/, n);
  for (const n of structs) assert.match(n, /^Pf[A-Z]/, n);
  for (const n of consts) assert.match(n, /^pf[A-Z]/, n);
});

test('the functions Whiteout and Frietkot need are present', () => {
  for (const n of ['pfHash3', 'pfFlutter', 'pfFlutterVel', 'pfPlace', 'pfPx', 'pfCoc', 'pfWidth', 'pfCorner', 'pfPlaneCorner', 'pfStreak', 'pfSpread', 'pfPhase', 'pfPoint', 'pfCover']) {
    assert.match(code, new RegExp(`\\b${n}\\s*\\(`), n);
  }
});

test('presets are frozen, finite and in physical ranges', () => {
  for (const p of [PF_SNOW, PF_RAIN]) {
    assert.ok(Object.isFrozen(p));
    for (const [k, v] of Object.entries(p)) assert.ok(Number.isFinite(v) && v >= 0, `${k} ${v}`);
  }
  assert.ok(PF_SNOW.fall > 0.5 && PF_SNOW.fall < 2, 'snow falls at about 1 m/s');
  assert.ok(PF_RAIN.fall > 5 && PF_RAIN.fall < 10, 'rain falls at 5 to 10 m/s');
  assert.ok(PF_RAIN.lobe > PF_SNOW.lobe, 'drops scatter further forward than flakes');
  assert.equal(PF_RAIN.flutter, 0);
  assert.equal(PF_SNOW.expo, 1 / 60);
});

test('pfFloat writes a GLSL float literal for every number', () => {
  assert.equal(pfFloat(1), '1.0');
  assert.equal(pfFloat(-3), '-3.0');
  assert.equal(pfFloat(0.0018), '0.0018');
  assert.equal(pfFloat(1.1), '1.1');
  assert.equal(Number(pfFloat(1 / 60)), 1 / 60);
  assert.throws(() => pfFloat(NaN));
  assert.throws(() => pfFloat(Infinity));
});
