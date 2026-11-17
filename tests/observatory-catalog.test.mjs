// Observatory catalog. Run: node --test tests/observatory-catalog.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { decodeStars } from '../observatory/src/core/catalog.ts';

const binBuf = readFileSync(new URL('../observatory/stars.bin', import.meta.url));
const bin = binBuf.buffer.slice(binBuf.byteOffset, binBuf.byteOffset + binBuf.byteLength);
const jsonText = readFileSync(new URL('../observatory/stars.json', import.meta.url), 'utf8');
const stars = decodeStars(bin, JSON.parse(jsonText));

test('about 9,000 stars at mag 6.5 or brighter', () => {
  assert.ok(stars.length >= 8500 && stars.length <= 9300, `count ${stars.length}`);
  assert.ok(stars.every((s) => s.mag <= 6.5));
});
test('Sirius is hip 32349, mag -1.46, dec -16.7', () => {
  const s = stars.find((x) => x.hip === 32349);
  assert.ok(s);
  assert.equal(s.name, 'Sirius');
  assert.ok(Math.abs(s.mag + 1.46) < 0.03); // HYG lists -1.44
  assert.ok(Math.abs(s.dec + 16.7) < 0.05);
  assert.ok(s.ra > 100 && s.ra < 102);
  assert.ok(Math.abs(s.dist - 2.64) < 0.05);
  assert.equal(s.bayer, 'α CMa');
});
test('the Sun is not in the list', () => assert.ok(!stars.some((s) => s.name === 'Sol' || s.mag < -20)));
test('fields are sane', () => {
  for (const s of stars) {
    assert.ok(s.ra >= 0 && s.ra < 360 && s.dec >= -90 && s.dec <= 90);
    assert.ok(Number.isNaN(s.dist) || s.dist > 0);
  }
});
test('stars.bin and stars.json stay under 300 KB together', () => assert.ok(binBuf.length + Buffer.byteLength(jsonText) < 300 * 1024));
