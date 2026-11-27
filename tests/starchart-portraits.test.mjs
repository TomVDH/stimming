import test from 'node:test';
import assert from 'node:assert/strict';
import { STARS, R } from '../starchart/sun.js';
import { portraitFrame, portraitNeedsRoom, portraitSize, portraitBounds, portraitLoopState, turnPortraitFrame } from '../starchart/portrait-frame.js';

test('every catalog body produces finite portrait uniforms', () => {
  for (const id of Object.keys(STARS)) {
    const frame = portraitFrame(id, new Float32Array(0));
    for (const [key, value] of Object.entries(frame)) {
      if (typeof value === 'number') assert.ok(Number.isFinite(value), `${id}.${key}`);
      if (ArrayBuffer.isView(value)) assert.ok([...value].every(Number.isFinite), `${id}.${key}`);
    }
    assert.ok(frame.view[2] > 0 && frame.view[3] > 0, id);
    assert.equal(frame.volDens, 0, `${id}: external haze stays off`);
    assert.equal(frame.corona, 0, `${id}: external corona stays off`);
  }
});

test('ring portraits include the complete ring system with padding', () => {
  for (const id of ['fomalhaut', 'j1407']) {
    const f = portraitFrame(id, new Float32Array(0)), g = STARS[id].ring;
    const ringRadius = (g.outer || 6) * R;
    assert.ok(f.view[2] > ringRadius * 1.2, id);
    assert.ok(Math.abs(f.view[0]) + R < f.view[2], `${id}: primary star also fits`);
  }
});

test('binary portraits include both stellar centers', () => {
  for (const id of ['betalyr', 'vfts352']) {
    const f = portraitFrame(id, new Float32Array(0));
    const partner = f.bin[3] ? f.bin[0] : f.pair[0];
    assert.ok(Math.abs(f.view[0]) + R < f.view[2], `${id}: primary`);
    assert.ok(Math.abs(partner * R - f.view[0]) + R < f.view[2], `${id}: partner`);
  }
});

test('bounded nebula volumes fit within portrait framing', () => {
  for (const [id, B] of Object.entries(STARS)) {
    if (![4, 5, 6, 7, 8].includes(B.bow?.kind)) continue;
    const f = portraitFrame(id, new Float32Array(0));
    assert.ok(f.view[2] >= B.bow.size * R * 1.8 * .99999, id);
  }
});

test('protostar framing contains full rings while the jets fade sooner', () => {
  const f = portraitFrame('ttauri', new Float32Array(0));
  assert.ok(f.view[2] > 9 * R);
  assert.ok(f.view[3] > 7.5 * R);
  assert.ok(f.view[2] <= 11.1 * R);
});

test('adaptive framing detects emission at an edge without rejecting centered objects', () => {
  const size = 20, pixels = new Uint8ClampedArray(size * size * 4);
  pixels[(10 * size + 10) * 4 + 3] = 255;
  assert.equal(portraitNeedsRoom(pixels, size, size), false);
  pixels[(10 * size + 1) * 4 + 3] = 80;
  assert.equal(portraitNeedsRoom(pixels, size, size), true);
  pixels[(10 * size + 1) * 4 + 3] = 2;
  assert.equal(portraitNeedsRoom(pixels, size, size), false);
});

test('tray portrait scale preserves radius order and stays within the live tray range', () => {
  const radii = Object.values(STARS).map(b => b.rsun).sort((a, b) => a - b);
  let previous = 0;
  for (const radius of radii) {
    const size = portraitSize(radius);
    assert.ok(Number.isFinite(size) && size >= 24 && size <= 100);
    assert.ok(size >= previous);
    previous = size;
  }
  assert.ok(portraitSize(STARS.neutron.rsun) < portraitSize(STARS.sun.rsun));
  assert.ok(portraitSize(STARS.sun.rsun) < portraitSize(STARS.st218.rsun));
});

test('alpha bounds preserve wide objects and include faint feathered pixels', () => {
  const w = 40, h = 30, pixels = new Uint8ClampedArray(w * h * 4);
  assert.equal(portraitBounds(pixels, w, h), null);
  for (let y = 12; y <= 16; y++) for (let x = 4; x <= 35; x++) pixels[(y * w + x) * 4 + 3] = 1;
  const bounds = portraitBounds(pixels, w, h, 2);
  assert.deepEqual(bounds, { x: 2, y: 10, width: 36, height: 9 });
  assert.ok(bounds.width > bounds.height * 3);
});

test('black hole and quasar portraits lift their disc exposure without external haze', () => {
  for (const id of ['cygx1', 'sgra', 'powehi', 'gargantua', 'qso']) {
    const f = portraitFrame(id, new Float32Array(0));
    assert.ok(f.fx3[1] > 1, id);
    assert.equal(f.volDens, 0, id);
    assert.equal(f.corona, 0, id);
    assert.equal(f.holeSky[1], 0, id);
  }
});

test('every non-hole hover loop supplies identical uniforms at its endpoints', () => {
  for (const [id, B] of Object.entries(STARS)) {
    if (B.hole) continue;
    const first = portraitFrame(id, new Float32Array(0));
    const last = portraitFrame(id, new Float32Array(0));
    turnPortraitFrame(first, portraitLoopState(0));
    turnPortraitFrame(last, portraitLoopState(120000));
    assert.equal(first.time, last.time, id);
    for (const key of ['rot', 'toSun', 'beam', 'lh', 'nsU', 'nsV', 'sway']) assert.deepEqual(first[key], last[key], `${id}.${key}`);
  }
});

test('paired-time blending closes without an endpoint velocity jump', () => {
  const signal = ms => {
    const s = portraitLoopState(ms);
    const field = t => Math.sin(t * .73) + .3 * Math.cos(t * 1.17 + s.angle);
    return field(s.timeA) * (1 - s.blend) + field(s.timeB) * s.blend;
  };
  assert.equal(signal(0), signal(120000));
  const before = (signal(0) - signal(-1)), after = (signal(1) - signal(0));
  assert.ok(Math.abs(before - after) < 1e-7);
});

test('pulsar loop rotates its magnetic wind axes and returns them exactly', () => {
  const f = portraitFrame('neutron', new Float32Array(0));
  const initial = [...f.nsU];
  turnPortraitFrame(f, portraitLoopState(30000));
  assert.notDeepEqual([...f.nsU], initial);
  assert.ok([...f.nsU].every(Number.isFinite));
  turnPortraitFrame(f, portraitLoopState(120000));
  assert.deepEqual([...f.nsU], initial);
});

test('Cygnus and Sagittarius cloud light increases independently of their dark shadows', () => {
  for (const id of ['cygx1', 'sgra']) {
    const f = portraitFrame(id, new Float32Array(0));
    assert.ok(f.holeV[2] > STARS[id].hole.vol.light * 1.7);
  }
});

test('far galaxies receive compact framing instead of a cluster-wide view', () => {
  for (const id of ['momz14', 'uhz1']) {
    const f = portraitFrame(id, new Float32Array(0));
    assert.equal(f.view[0], 0); assert.equal(f.view[1], 0);
    assert.ok(f.view[2] < STARS[id].bow.size * R * .05);
  }
});
