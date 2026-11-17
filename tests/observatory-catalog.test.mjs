// Observatory catalog. Run: node --test tests/observatory-catalog.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CI_UNKNOWN, STAR_BYTES, decodeStars, loadStars } from '../observatory/src/core/catalog.ts';

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
test('a star with no colour index decodes to NaN', () => {
  // Two records: colour index unknown, then 0.65.
  const v = new DataView(new ArrayBuffer(2 * STAR_BYTES));
  v.setInt16(10, CI_UNKNOWN, true);
  v.setInt16(STAR_BYTES + 10, 650, true);
  const [none, known] = decodeStars(v.buffer, { names: {}, bayer: {}, spect: [''] });
  assert.ok(Number.isNaN(none.ci), `ci ${none.ci}`);
  assert.equal(known.ci, 0.65);
});

// loadStars with a fake fetch for one test.
async function withFetch(fake, fn) {
  const real = globalThis.fetch;
  globalThis.fetch = fake;
  try { await fn(); } finally { globalThis.fetch = real; }
}
test('loadStars rejects with the file and the status when the server says no', () => withFetch(
  async (url) => (String(url).endsWith('stars.bin') ? new Response(null, { status: 404 }) : new Response('{"names":{},"bayer":{},"spect":[""]}')),
  () => assert.rejects(loadStars('http://site/observatory/stars.bin'), /stars\.bin.*404/),
));
test('loadStars rejects with the file when the request fails', () => withFetch(
  async () => { throw new TypeError('Failed to fetch'); },
  () => assert.rejects(loadStars('http://site/observatory/stars.bin'), /could not load .*stars\.(bin|json)/),
));
test('loadStars decodes a good answer', () => withFetch(
  async (url) => (String(url).endsWith('stars.bin') ? new Response(new ArrayBuffer(STAR_BYTES)) : new Response('{"names":{"0":"Test"},"bayer":{},"spect":[""]}')),
  async () => {
    const s = await loadStars('http://site/observatory/stars.bin');
    assert.equal(s.length, 1);
    assert.equal(s[0].name, 'Test');
  },
));
