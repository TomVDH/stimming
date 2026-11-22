// Pi walk: the decimal digits of pi, from the Chudnovsky series.
// Binary splitting in BigInt gives 250,000 digits in about half a second.
// As a module worker it answers { sizes } with one message per size.

const C3_24 = 640320n ** 3n / 24n;
// Each term of the series adds about 14.18 digits.
const PER_TERM = 14.181647462725477;

// Binary splitting over terms a to b: returns P, Q and T.
function split(a, b) {
  if (b - a === 1) {
    if (a === 0) return [1n, 1n, 13591409n];
    const k = BigInt(a);
    const P = (6n * k - 5n) * (2n * k - 1n) * (6n * k - 1n);
    const Q = k * k * k * C3_24;
    const T = P * (13591409n + 545140134n * k);
    return [P, Q, a & 1 ? -T : T];
  }
  const m = (a + b) >> 1;
  const [P1, Q1, T1] = split(a, m);
  const [P2, Q2, T2] = split(m, b);
  return [P1 * P2, Q1 * Q2, T1 * Q2 + P1 * T2];
}

// Newton's integer square root, from a start above the root.
function isqrt(n) {
  let x = 1n << BigInt((n.toString(16).length * 4 >> 1) + 1);
  for (;;) {
    const y = (x + n / x) >> 1n;
    if (y >= x) return x;
    x = y;
  }
}

/**
 * The first count digits of pi, the leading 3 included.
 * @param {number} count
 * @returns {Uint8Array}
 */
export function piDigits(count) {
  // Guard digits absorb the rounding of the last division.
  const D = Math.max(1, count - 1), guard = 12;
  const [, Q, T] = split(0, Math.floor((D + guard) / PER_TERM) + 2);
  const one = 10n ** BigInt(D + guard);
  const pi = (Q * 426880n * isqrt(10005n * one * one)) / T;
  const s = pi.toString();
  const out = new Uint8Array(count);
  for (let i = 0; i < count; i++) out[i] = s.charCodeAt(i) - 48;
  return out;
}

// In a worker: compute each asked size, smallest first.
if (typeof WorkerGlobalScope !== 'undefined' && globalThis instanceof WorkerGlobalScope) {
  globalThis.onmessage = e => {
    for (const n of e.data.sizes) {
      const digits = piDigits(n);
      globalThis.postMessage({ digits }, [digits.buffer]);
    }
  };
}
