// The paper: a ring of time columns, each a log-pitch spectrum.
// The pen writes one column per step; the renderer reads them by age.
import { hz, F_LO, SPAN, K_MAX, inkOf } from './voice.js';

export const M = 512, N = 2048;
// The ring covers one semitone below C2 to one above C7.
export const P0 = -1, P1 = SPAN + 1;
const ROWS_PER_SEMI = M / (P1 - P0);
const F_TOP = hz(P1);

export function makePaper() {
  const col = new Float32Array(M * 4);
  // Columns wait here until the frame uploads them.
  let pend = new Float32Array(M * 4 * 64), pendN = 0, pendAt = 0;
  const tmp = [0, 0, 0];
  const P = {
    head: 0,       // Columns written so far.
    pos: 0,        // The paper's position, in columns; head trails it by under one.
    v: 0,          // Paper speed, columns per second.
    dirty: false,
  };

  // One column from the voices as they stand.
  function paint(S) {
    col.fill(0);
    for (const v of S.list) {
      if (v.env < 1e-4) continue;
      const p = S.pitch(v), f0 = hz(p), fc = S.cutoff(v);
      for (let k = 1; k <= K_MAX; k++) {
        const f = k * f0;
        if (f > F_TOP) break;
        const a = S.partial(v, k, f0, fc) * v.env;
        if (a < 2e-4) continue;
        // Light follows a soft power of the level, as the eye reads a log.
        const I = 2.6 * Math.pow(a, 0.55);
        const pk = p + 12 * Math.log2(k);
        const r = (pk - P0) * ROWS_PER_SEMI;
        // Each partial takes half its own hue, so the brush shades upward.
        inkOf(pk, tmp);
        const cr = 0.55 * v.ink[0] + 0.45 * tmp[0], cg = 0.55 * v.ink[1] + 0.45 * tmp[1], cb = 0.55 * v.ink[2] + 0.45 * tmp[2];
        const sig = 0.7 + 0.5 * Math.min(1, a), lo = Math.max(0, Math.floor(r - 3 * sig)), hi = Math.min(M - 1, Math.ceil(r + 3 * sig));
        for (let i = lo; i <= hi; i++) {
          const d = (i + 0.5 - r) / sig, w = I * Math.exp(-0.5 * d * d), o = i * 4;
          col[o] += cr * w; col[o + 1] += cg * w; col[o + 2] += cb * w; col[o + 3] += w;
        }
      }
      // The onset chiff: a faint broadband stripe above the note.
      if (v.chiff > 0.02) {
        const r0 = Math.max(0, Math.floor((p - P0) * ROWS_PER_SEMI));
        for (let i = r0; i < M; i++) {
          const w = v.chiff * 0.07 * Math.exp(-(i - r0) / 140) * (0.45 + 0.55 * Math.random()), o = i * 4;
          col[o] += v.ink[0] * 0.5 * w + 0.5 * w; col[o + 1] += v.ink[1] * 0.5 * w + 0.5 * w; col[o + 2] += v.ink[2] * 0.5 * w + 0.5 * w; col[o + 3] += w;
        }
      }
    }
    if ((pendN + 1) * M * 4 > pend.length) {
      const big = new Float32Array(pend.length * 2);
      big.set(pend);
      pend = big;
    }
    if (pendN === 0) pendAt = P.head;
    pend.set(col, pendN * M * 4);
    pendN++;
    P.head++;
    P.dirty = true;
  }

  // Moves the paper dt seconds: steps the voices and writes each column passed.
  P.advance = (S, dt, step) => {
    const target = P.pos + P.v * dt;
    const cols = Math.max(0, Math.floor(target) - Math.floor(P.pos));
    const n = Math.max(1, Math.min(cols, 600));
    for (let i = 0; i < n; i++) {
      step(dt / n);
      if (i < cols) paint(S);
    }
    // A long jump skips the columns past the cap.
    if (cols > n) P.head += cols - n;
    P.pos = target;
  };

  // Hands the waiting columns to the upload, in ring order.
  P.drain = fn => {
    if (!pendN) return;
    let at = pendAt % N, left = pendN, off = 0;
    // A batch longer than the ring keeps only its newest N columns.
    if (left > N) { off = (left - N) * M * 4; at = (pendAt + left - N) % N; left = N; }
    while (left > 0) {
      const run = Math.min(left, N - at);
      fn(at, run, pend.subarray(off, off + run * M * 4));
      off += run * M * 4; left -= run; at = 0;
    }
    pendN = 0;
  };

  // The ring row for a pitch, in rows from the foot.
  P.row = p => (p - P0) * ROWS_PER_SEMI;
  return P;
}

export const pitchSpan = { P0, P1, F_LO };
