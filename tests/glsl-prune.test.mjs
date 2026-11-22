import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pruneGLSL } from '../shared/glsl-prune.js';

const SRC = `#version 300 es
precision highp float;
#define CAMH uCamH
uniform float uCamH;
out vec4 outC;
// A prototype: its body comes later.
float far(float x);
vec3 gGlob = vec3(0.0);
const float K = 2.0;
float used(float x) { return x * K + far(x); }
/* An unused function, with braces inside. */
float unused(float x) { if (x > 0.0) { return 1.0; } return 0.0; }
float over(float x) { return x; }
float over(vec2 x) { return x.x; }
float far(float x) { return over(x) + CAMH; }
void main() { outC = vec4(used(1.0)); }`;

test('keeps what main reaches and drops the rest', () => {
  const out = pruneGLSL(SRC);
  assert.match(out, /float used\(/);
  assert.match(out, /float far\(float x\) \{/);
  assert.doesNotMatch(out, /unused/);
  assert.match(out, /void main\(\)/);
});

test('keeps declarations, preprocessor lines and the order', () => {
  const out = pruneGLSL(SRC);
  assert.ok(out.startsWith('#version 300 es\n'));
  for (const s of ['#define CAMH uCamH', 'uniform float uCamH;', 'const float K = 2.0;', 'vec3 gGlob = vec3(0.0);']) assert.ok(out.includes(s), s);
  assert.ok(out.indexOf('float used(') < out.indexOf('void main('));
});

test('a called name keeps every overload and its prototype', () => {
  const out = pruneGLSL(SRC);
  assert.match(out, /float over\(float x\)/);
  assert.match(out, /float over\(vec2 x\)/);
  assert.match(out, /float far\(float x\);/);
});

test('a prototype alone keeps nothing', () => {
  const out = pruneGLSL(SRC, ['nothing']);
  assert.doesNotMatch(out, /float far\(/);
  assert.doesNotMatch(out, /float used\(/);
});

test('other roots pick their own functions', () => {
  const out = pruneGLSL(SRC, ['far']);
  assert.match(out, /float over\(/);
  assert.doesNotMatch(out, /float used\(/);
});

test('a struct stays whole', () => {
  const out = pruneGLSL('struct P { vec2 a; float b; };\nP mk() { return P(vec2(0.0), 1.0); }\nvoid main() {}');
  assert.match(out, /struct P \{ vec2 a; float b; \};/);
  assert.doesNotMatch(out, /mk\(/);
});
