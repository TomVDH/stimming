// Solar loop easter eggs: a long hold on a star plays its real famous event.
// Sun: the Carrington flare of 1 September 1859.
// Betelgeuse: the Great Dimming of 2019 to 2020.
// Pulsar: the Vela pulsar's true voice, 11.19 pulses a second.
// Sun, a hold on Mercury: a ship's distress beacon, then the ship in transit.
// Sun, a hold far out: the pale blue dot, one pixel in a ray of scattered light.
// Vega: its light pulses in prime counts, after Contact.
// Cygnus X-1: a probe falls in, slows, reddens and freezes at the shadow's edge.
// 3C 273: the Moon's dark limb sweeps over it, as at Parkes in 1962.
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
export const EGGS = { sun: 'carrington', betelgeuse: 'dimming', neutron: 'voice', vega: 'primes', cygx1: 'probe', qso: 'moon' };

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

/* ---------- a ship in transit, after Sunshine (Tom, 2026-11-24) ---------- */
// A hold on Mercury: a distress beacon, then a ship crosses the sun beside Mercury.
// The ship is our own: a sunshield disc, a long spine, a payload block.
export const SHIP_END = 38;
// The ship's speed across the disk, in star units a second, and its lead on Mercury.
const SHIP_V = 26, SHIP_LEAD = -260;
export function makeSunshine(mercuryX) {
  return { kind: 'sunshine', t: CUE - HOLD, x0: mercuryX + SHIP_LEAD };
}
/** The ship at its clock t: x in star units, weight, heading, shield slant, glint. */
export function sunshine(egg) {
  const t = Math.max(egg.t, 0);
  const w = egg.t < 0 ? 0 : sstep(0, 2.5, t) * (1 - sstep(SHIP_END - 4, SHIP_END, t));
  // The shield turns a little toward the sun; one turn throws a glint at the eye.
  const tilt = 0.32 + 0.12 * Math.sin(t * 0.22);
  const glint = Math.exp(-(((t - 13) / 0.7) ** 2));
  return { x: egg.x0 + SHIP_V * t, w, heading: Math.PI - 0.12, tilt, glint };
}

/* ---------- the pale blue dot (Tom, 2026-11-25) ---------- */
// Voyager 1, 14 February 1990: the earth, one pixel in a ray of scattered sunlight.
export const DOT_END = 26;
// A hold this far out plays it, on farAt's scale from 0 to 1.
export const DOT_FAR = 0.6;
export function makeBlueDot() {
  return { kind: 'bluedot', t: CUE - HOLD };
}
/** The ray and the dot, each a weight from 0 to 1. */
export function blueDot(egg) {
  const t = egg.t, out = 1 - sstep(20, DOT_END, t);
  const ray = (t < 0 ? 0.35 * sstep(CUE - HOLD, 0, t) : 0.35 + 0.65 * sstep(0, 3, t)) * out;
  const dot = sstep(4, 5.5, t) * out;
  return { ray, dot };
}

/* ---------- primes (Tom, 2026-11-25) ---------- */
// Contact: a signal from Vega counts out the prime numbers.
// One pulse every 0.4 s keeps under three flashes a second.
const PRIMES = [2, 3, 5, 7, 11, 13], BEAT = 0.4, GAP = 1.4;
// Each pulse's start in seconds from the end of the hold, and its group.
export const PULSES = [];
{ let t = 0.6; PRIMES.forEach((n, g) => { for (let i = 0; i < n; i++, t += BEAT) PULSES.push([t, g]); t += GAP - BEAT; }); }
export const PRIME_END = PULSES[PULSES.length - 1][0] + 3;
export function makePrimes() {
  return { kind: 'primes', t: CUE - HOLD, next: 0 };
}
/** The pulse light at the egg's clock, from 0 to 1: a fast rise, a slower fall. */
export function primes(egg) {
  let l = 0;
  for (const [s] of PULSES) {
    const d = egg.t - s;
    if (d < 0) break;
    if (d < 1.2) l = Math.max(l, Math.min(1, d / 0.05) * Math.exp(-d / 0.14));
  }
  return l;
}

/* ---------- a probe at the horizon (Tom, 2026-11-25) ---------- */
// A far watcher never sees a falling probe cross: it slows, reddens and fades at the edge.
export const PROBE_END = 36;
// Its distance in shadow radii: 4.5 at the start, 1 at the edge.
const PROBE_FROM = 4.5, PROBE_T = 6;
export function makeProbe() {
  return { kind: 'probe', t: CUE - HOLD, ph: 0, beat: 0 };
}
/** The probe at its clock: distance s, angle, redshift g (1 far out, 0 at the edge), weight. */
export function probe(egg) {
  const u = Math.max(egg.t, 0) / PROBE_T, k = 1 / (1 + u * u * u);
  const s = 1 + (PROBE_FROM - 1) * k;
  const g = Math.sqrt(1 - 1 / (s + 0.035));
  const w = (egg.t < 0 ? sstep(CUE - HOLD, 0, egg.t) : 1) * (1 - sstep(PROBE_END - 6, PROBE_END, egg.t));
  return { s, a: 2.35 - 0.8 * (1 - k), g, w };
}
/** One step: the beacon blinks once a second in its own time, slower as g falls; true on a new blink. */
export function stepProbe(egg, dt) {
  egg.ph += dt * probe(egg).g;
  const beat = Math.floor(egg.ph);
  const blink = beat > egg.beat;
  egg.beat = beat;
  return blink;
}

/* ---------- the Moon's edge (Tom, 2026-11-25) ---------- */
// Cyril Hazard timed the Moon's limb over 3C 273 at Parkes in 1962 to fix its place.
// The Moon is drawn in frame heights: radius 1.6, its centre 1.3 below the quasar.
export const MOON_R = 1.6, MOON_D = 1.3;
// The chord's half length at the quasar, and the speed in frame heights a second.
const MOON_HALF = Math.sqrt(MOON_R * MOON_R - MOON_D * MOON_D), MOON_V = 0.23;
// The limb covers the quasar at MOON_IN and uncovers it at MOON_OUT.
export const MOON_IN = 4, MOON_OUT = MOON_IN + 2 * MOON_HALF / MOON_V, MOON_END = MOON_OUT + 9;
export function makeMoon() {
  return { kind: 'moon', t: CUE - HOLD };
}
/** The Moon's centre x from the quasar, in frame heights; it moves left to right. */
export const moonX = egg => -MOON_HALF + MOON_V * (egg.t - MOON_IN);

/* ---------- the Vela pulsar's true voice ---------- */
// Vela turns 11.19 times a second; the toy shows it every 1.6 s.
// Radio telescopes play its pulses as a low buzz.
export const VELA_HZ = 11.19;
// A rare voice holds its full speed this long, in seconds.
export const VOICE_HOLD = 6;
export function makeVoice() {
  return { kind: 'voice', t: CUE - HOLD, rate: 1 };
}
/**
 * One step of the spin rate, as a multiple of the toy's own spin.
 * A hold eases it up to the true rate on a log scale; a release eases it back.
 */
export function stepVoice(egg, dt, holding, base, cap = Infinity) {
  const top = Math.min(cap, VELA_HZ * base);
  const up = holding || (egg.rare && egg.t < VOICE_HOLD);
  const goal = up ? Math.exp(Math.log(top) * sstep(CUE - HOLD, 0, egg.t)) : 1;
  // Up quickly as the hold builds; down over about three seconds.
  const k = up ? 1 : 1 - Math.exp(-dt / 1.2);
  egg.rate = up ? Math.max(egg.rate, goal) : egg.rate + (goal - egg.rate) * k;
  egg.done = !up && egg.rate < 1.02;
}
