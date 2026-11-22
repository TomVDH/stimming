// Pi walk digits: the Chudnovsky series agrees with Machin's formula.
// Run: node --test tests/piwalk-digits.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { piDigits } from '../piwalk/digits.js';

// Machin: pi = 16 atan(1/5) - 4 atan(1/239), in BigInt fixed point.
function machin(count) {
  const one = 10n ** BigInt(count + 10);
  const atan = x => {
    let s = 0n, t = one / x, n = 1n, sign = 1n;
    const x2 = x * x;
    while (t) { s += sign * (t / n); t /= x2; n += 2n; sign = -sign; }
    return s;
  };
  return (16n * atan(5n) - 4n * atan(239n)).toString().slice(0, count);
}

test('the first digits are 3.14159265358979', () => {
  assert.equal(Array.from(piDigits(15)).join(''), '314159265358979');
});

test('20,000 digits match a Machin series', () => {
  assert.equal(Array.from(piDigits(20000)).join(''), machin(20000));
});

test('a longer run starts with a shorter one', () => {
  const a = piDigits(30000), b = piDigits(30050);
  assert.deepEqual(a, b.slice(0, 30000));
});
