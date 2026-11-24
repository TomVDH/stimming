// Solar loop easter eggs: a long hold on a star plays its real famous event.
// Sun: the Carrington flare of 1 September 1859.
// Betelgeuse: the Great Dimming of 2019 to 2020.
// Each egg also comes on its own, now and then, while the toy is awake.

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const norm = v => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const along = (c, u, a) => norm([c[0] + u[0] * a, c[1] + u[1] * a, c[2] + u[2] * a]);

// A press held this long, in seconds, plays the egg.
export const HOLD = 3;
// The cue starts after this hold; a shorter press stays a tap.
export const CUE = 0.6;
// An egg comes on its own about once per this many awake seconds.
export const RARE = 25 * 60;
// The star that holds each egg.
export const EGGS = { sun: 'carrington', betelgeuse: 'dimming' };

/* ---------- the Carrington flare ---------- */
// Carrington and Hodgson saw two white kernels flash over a huge spot group.
// The storm reached the earth 17.6 hours later: 6.3 s at 10,000 times.
export const CARR_STORM = 17.6 * 3600 / 1e4;
export const CARR_END = 60;
// The spot group's two spots, either side of its centre, in radians.
const SPOT_GAP = 0.05;

/**
 * A Carrington flare at the unit point c on the sun, in the sun frame.
 * It brings its own active region, so the flare's rope and arcade rise there.
 */
export function makeCarrington(c, seed = Math.random()) {
  const t1 = norm(cross(c, [0, 0, 1]));
  const t2 = cross(t1, c);
  const th = (seed - 0.5) * 1.2;
  const e = norm([0, 1, 2].map(i => t1[i] * Math.cos(th) + t2[i] * Math.sin(th)));
  const f = cross(c, e);
  const rg = { c, e, f, span: [14, 82], len: 120, hk: 1.15, n: 0, lt: 6, bundles: [], lastFlare: -1e9, ri: -1 };
  return { kind: 'carrington', t: CUE - HOLD, rg, fired: false, storm: false };
}

/** The look at time t, in seconds from the flash; below 0 the hold builds the spots. */
export function carrington(egg) {
  const t = egg.t;
  const spot = t < 0 ? sstep(CUE - HOLD, 0, t) : 1 - sstep(40, CARR_END, t);
  const white = t < 0 ? 0 : sstep(0, 0.35, t) * (0.4 + 0.6 * Math.exp(-t / 3)) * (1 - sstep(8, 16, t));
  // The kernels part as the ribbons do, across the spot group.
  const sep = 0.006 + 0.018 * sstep(0, 10, t);
  const { c, e, f } = egg.rg;
  return {
    spots: [[along(c, e, SPOT_GAP * 0.55), spot], [along(c, e, -SPOT_GAP * 0.45), spot * 0.75]],
    kernels: [[along(along(c, f, sep), e, 0.006), white], [along(along(c, f, -sep), e, -0.008), white * 0.85]],
  };
}

/* ---------- the Great Dimming ---------- */
// Betelgeuse fell to about 36 percent of its light, its southern half dark.
// A cool patch spread on its surface; then a dust cloud condensed over it.
export const DIM_END = 36;
// South in the star's frame.
export const SOUTH = [0, -1, 0];
export function makeDimming() {
  return { kind: 'dimming', t: CUE - HOLD };
}
/** The cool patch and the dust veil, each from 0 to 1. */
export function dimming(egg) {
  const t = egg.t;
  const clear = 1 - sstep(16, DIM_END, t);
  const cool = (t < 0 ? 0.6 * sstep(CUE - HOLD, 0, t) : 0.6 + 0.4 * sstep(0, 3, t)) * clear;
  const veil = sstep(0, 5, t) * clear;
  return { cool, veil };
}
