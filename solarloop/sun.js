// Solar loop model: active regions, coronal loops, flares.
// Lengths are in Mm; the sun's radius is 696. Times are in seconds.
// The sun frame equals the view frame when the sun is not turned:
// x right, y up, z toward the viewer; the limb's top stands at (0, R, 0).
// Each frame writes one strand per loop thread into a Float32Array.

export const R = 696;
// A black hole's shadow edge, in Schwarzschild radii; it stands at R.
export const BCRIT = 2.598;
// The toy runs each star's rotation this many times faster than life.
export const SPIN_UP = 1e4;
export const STRIDE = 16;
export const MAX_STRANDS = 2048;
export const MAX_FLARES = 2;
// A flare runs this long, then the region is calm again.
export const FLARE_END = 50;

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const add = (a, b, k = 1) => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];
const scale = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
const norm = a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const gauss = (x, m, w) => Math.exp(-(((x - m) / w) ** 2));
// A hash in 0 to 1 for integer keys.
function hash(a, b = 0, c = 0) {
  let h = Math.imul(a | 0, 0x27d4eb2d) ^ Math.imul(b | 0, 0x165667b1) ^ Math.imul(c | 0, 0x9e3779b1);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
const sphere = (psi, beta) => [Math.sin(psi) * Math.cos(beta), Math.cos(psi) * Math.cos(beta), Math.sin(beta)];

/* ---------- stars ---------- */
// The model runs in star units: the star's radius is always R.
// rsun: the star's radius in suns; a scale body's size follows from it.
// row: the star's pair of colour ramps. hotW, coolW: channel weights.
// disk: base light, texture, limb mix (0 darkens, 1 brightens), corona at the limb.
// disk2: corona scale height, chromosphere and spicules, moss, region haze.
// tex: granule scale, swirl scale, network weight, limb darkening power.
// loop, prom: loop and prominence light. dust: a clumpy envelope of ejecta.
// rays: light shaft gain. hal: halation tint. streak: lens streak tint.
// wide, long: the scale body beside the limb and the one in transit.
// field, beam, lensing: a neutron star's field lines, pulsar beams and bent light.
// oblate: how much wider the equator is than the poles, seen side-on.
// grav: the spin axis in the star's frame, and the gravity darkening at its equator.
// clouds: a brown dwarf's cloud deck: weight, band count, turbulence, drift speed.
// yso: a young star's dust disk and jets: its axis in the star's frame, and weight.
// day: the true rotation period in days; the toy runs it 10,000 times faster.
// spots: sunspot strength; only stars with a convecting surface have them.
// hole: a black hole's disc tilt toward the eye, disc light, disc heat, lensed star gain.
// reach: how much farther the full view stands back. jet: a quasar's jet light.
// wind: a Wolf-Rayet wind's glow, its clumps, the nebula's light and its radius in R.
// core: a buried neutron star shown in cutaway through the disk.
// ring: a giant ring system in front: its opacity, axis ratio, tilt, glow, centre in R.
// bin: a binary partner in a thick disc: separation, disc radius and thickness in R; mass ratio; the orbit's tilt toward the eye; jet, light and heat.
const FLARE = { hole: null, reach: 1, jet: 0, wind: [0, 0, 0, 0], core: 0, ring: null, bin: null, day: 0, spots: 0, rope: 1, ribbon: 1.6, rain: 0.9, sat: 1, bubble: 0.22, field: 0, beam: 0, lensing: 0, oblate: 0, grav: [0, 1, 0, 0], clouds: [0, 0, 0, 0], yso: [0, 1, 0, 0] };
export const STARS = {
  // The Vela pulsar: a neutron star 24 km across, a city's width, spinning.
  // Field lines, two beam cones, bent light, and a wind nebula round it.
  neutron: {
    ...FLARE, ribbon: 2, rain: 0, bubble: 0.1, field: 1, beam: 1, lensing: 2.2,
    row: 5, rsun: 1.72e-5, expo: 1, hotW: 1, coolW: 1, loop: 0, prom: 0, dust: 0, rays: 0.7,
    hal: [0.6, 0.65, 1], streak: [0.6, 0.7, 1],
    disk: [0.6, 0.18, 0.15, 0.25], disk2: [60, 0, 0, 0], tex: [60, 5, 0, 0.35],
    wide: 'none', long: 'none', root: 440,
  },
  // WR 124: a Wolf-Rayet star, twelve suns wide, hidden in its own dense wind.
  // The wind's clumps stream out; the nebula M1-67 shows as the view pulls back.
  wr124: {
    ...FLARE, rain: 0, bubble: 0.3, wind: [1, 1, 2.4, 9],
    row: 20, rsun: 11.93, expo: 1, hotW: 1, coolW: 1, loop: 0, prom: 0, dust: 0, rays: 1.2,
    hal: [0.6, 0.6, 1], streak: [0.6, 0.72, 1],
    disk: [1.4, 0.12, 0.3, 0.3], disk2: [260, 0, 0, 0], tex: [40, 4, 0, 0.3],
    wide: 'none', long: 'none', root: 155.56,
  },
  // A Thorne-Zytkow object: the 1977 prediction, a red supergiant round a neutron star.
  // No one is confirmed; this is the model. A cutaway shows the core through the disk.
  tzo: {
    ...FLARE, day: 13000, ribbon: 1.2, bubble: 0.15, core: 1,
    row: 21, rsun: 1000, expo: 1, hotW: 1, coolW: 1.1, loop: 0.3, prom: 0.6, dust: 0.35, rays: 0.8,
    hal: [1, 0.3, 0.12], streak: [1, 0.5, 0.3],
    disk: [1.85, 1.3, 0, 0.3], disk2: [150, 0.6, 0.3, 0.05], tex: [6, 2.8, 0, 0.8],
    wide: 'none', long: 'none', root: 103.83,
  },
  // Sirius B: a white dwarf, a star's mass in a ball smaller than the earth.
  siriusb: {
    ...FLARE, day: 1, rain: 0, bubble: 0.1,
    row: 6, rsun: 0.0084, expo: 1, hotW: 1, coolW: 1, loop: 0, prom: 0, dust: 0, rays: 1,
    hal: [0.6, 0.85, 0.95], streak: [0.6, 0.85, 1],
    disk: [1.2, 0.3, 0.2, 0.4], disk2: [40, 0.1, 0, 0], tex: [80, 6, 0, 0.6],
    wide: 'none', long: 'none', root: 392,
  },
  // Our sun: a yellow dwarf, the furnace in gold and white.
  sun: {
    ...FLARE, spots: 1, day: 25.4, row: 0, rsun: 1, expo: 1, hotW: 1, coolW: 1.15, loop: 1, prom: 1, dust: 0, rays: 0.9,
    hal: [1, 0.42, 0.12], streak: [1, 0.7, 0.34],
    disk: [2.1, 0.7, 0.12, 0.35], disk2: [55, 0.9, 0.5, 0.12], tex: [170, 16, 0.15, 0.55],
    wide: 'none', long: 'mercury', root: 220,
  },
  // Proxima: a small red flare star, a seventh of the sun's width.
  proxima: {
    ...FLARE, spots: 1.5, day: 83, ribbon: 2.4, sat: 1.4, bubble: 0.3,
    row: 1, rsun: 0.154, expo: 1, hotW: 1, coolW: 1.2, loop: 0.8, prom: 0.9, dust: 0, rays: 0.7,
    hal: [1, 0.3, 0.1], streak: [1, 0.5, 0.3],
    disk: [1.7, 0.8, 0.1, 0.45], disk2: [40, 1.2, 0.7, 0.15], tex: [120, 12, 0.2, 0.7],
    wide: 'none', long: 'none', root: 261.63,
  },
  // Zeta Ophiuchi: an O star, eight suns wide, hot violet blue.
  zetaoph: {
    ...FLARE, day: 1.0, rain: 0.2, oblate: 0.15, grav: [0, 1, 0, 0.35],
    row: 8, rsun: 8, expo: 0.95, hotW: 1, coolW: 0.8, loop: 0.5, prom: 0.45, dust: 0, rays: 1.25,
    hal: [0.5, 0.6, 1], streak: [0.5, 0.65, 1],
    disk: [1.5, 0.5, 0.05, 0.45], disk2: [100, 0.25, 0.3, 0.08], tex: [80, 9, 0.08, 0.38],
    wide: 'none', long: 'none', root: 164.81,
  },
  // Regulus: a B star, four suns wide, spun almost to breaking.
  // Seen side-on: its equator is a third wider than its poles, and darker.
  regulus: {
    ...FLARE, day: 0.66, rain: 0.3, oblate: 0.32, grav: [0, 1, 0, 0.5],
    row: 9, rsun: 4.2, expo: 1, hotW: 1, coolW: 0.85, loop: 0.5, prom: 0.5, dust: 0, rays: 1.1,
    hal: [0.6, 0.72, 1], streak: [0.55, 0.75, 1],
    disk: [1.45, 0.5, 0.06, 0.42], disk2: [85, 0.3, 0.3, 0.07], tex: [100, 9, 0.08, 0.45],
    wide: 'none', long: 'none', root: 174.61,
  },
  // Vega: an A star, near three suns wide, pure white, spinning fast.
  // Shown side-on (Tom), not pole-on as from the earth.
  // Its equator is a fifth wider than its poles, and 2000 K cooler.
  vega: {
    ...FLARE, day: 0.52, oblate: 0.19, grav: [0, 1, 0, 0.45],
    row: 10, rsun: 2.7, expo: 1, hotW: 1, coolW: 1, loop: 0.4, prom: 0.45, dust: 0, rays: 1,
    hal: [0.8, 0.85, 1], streak: [0.75, 0.82, 1],
    disk: [1.4, 0.4, 0.1, 0.4], disk2: [70, 0.35, 0.3, 0.06], tex: [120, 10, 0.05, 0.5],
    wide: 'none', long: 'none', root: 185,
  },
  // Sirius: a white star, near twice the sun's width.
  sirius: {
    ...FLARE, day: 5.5,
    row: 7, rsun: 1.71, expo: 1, hotW: 1, coolW: 1, loop: 0.45, prom: 0.5, dust: 0, rays: 1,
    hal: [0.75, 0.8, 1], streak: [0.7, 0.8, 1],
    disk: [1.4, 0.45, 0.1, 0.4], disk2: [70, 0.4, 0.3, 0.06], tex: [120, 10, 0.05, 0.55],
    wide: 'none', long: 'none', root: 293.66,
  },
  // Procyon: an F star, twice the sun's width, cream white.
  procyon: {
    ...FLARE, spots: 0.3, day: 23,
    row: 11, rsun: 2.05, expo: 1, hotW: 1, coolW: 1.05, loop: 0.75, prom: 0.75, dust: 0, rays: 0.95,
    hal: [1, 0.7, 0.4], streak: [1, 0.85, 0.6],
    disk: [1.8, 0.6, 0.1, 0.38], disk2: [60, 0.7, 0.4, 0.1], tex: [150, 14, 0.12, 0.55],
    wide: 'none', long: 'none', root: 207.65,
  },
  // Epsilon Eridani: a young K star, spotty and active, three quarters of the sun.
  epseri: {
    ...FLARE, spots: 1.3, day: 11.2, ribbon: 1.9, sat: 1.2,
    row: 12, rsun: 0.74, expo: 1, hotW: 1, coolW: 1.15, loop: 1, prom: 0.95, dust: 0, rays: 0.8,
    hal: [1, 0.38, 0.12], streak: [1, 0.6, 0.32],
    disk: [1.9, 0.85, 0.1, 0.4], disk2: [48, 1, 0.6, 0.14], tex: [140, 14, 0.2, 0.62],
    wide: 'none', long: 'none', root: 233.08,
  },
  // Luhman 16: an L/T brown dwarf, Jupiter's width, magenta brown.
  luhman: {
    ...FLARE, day: 0.22, ribbon: 0.7, rope: 0.5, rain: 0, bubble: 0.08, clouds: [1, 6, 1.6, 1],
    row: 13, rsun: 0.1, expo: 0.9, hotW: 1, coolW: 1, loop: 0, prom: 0, dust: 0, rays: 0.4,
    hal: [0.8, 0.25, 0.3], streak: [0.9, 0.4, 0.45],
    disk: [1.3, 0.9, 0, 0.12], disk2: [30, 0, 0, 0], tex: [14, 4, 0, 0.7],
    wide: 'none', long: 'none', root: 293.66,
  },
  // WISE 0855: a Y brown dwarf, the coldest known; dark, with water ice clouds.
  wise: {
    ...FLARE, day: 0.42, ribbon: 0.4, rope: 0.3, rain: 0, bubble: 0.05, clouds: [1, 4, 1.2, 0.6],
    row: 14, rsun: 0.1, expo: 0.85, hotW: 1, coolW: 1, loop: 0, prom: 0, dust: 0, rays: 0.25,
    hal: [0.5, 0.25, 0.3], streak: [0.6, 0.4, 0.45],
    disk: [1.1, 1, 0, 0.08], disk2: [25, 0, 0, 0], tex: [10, 3, 0, 0.75],
    wide: 'none', long: 'none', root: 329.63,
  },
  // T Tauri: a young star, three suns wide, still wrapped in its birth dust.
  // A ringed dust disk circles it at a slant; a jet leaves each pole.
  ttauri: {
    ...FLARE, spots: 1.8, day: 2.8, ribbon: 2.1, sat: 1.3, bubble: 0.28, yso: [0.28, 0.9, 0.34, 1], grav: [0.28, 0.9, 0.34, 0],
    row: 15, rsun: 3, expo: 1, hotW: 1, coolW: 1.2, loop: 0.95, prom: 0.95, dust: 0.4, rays: 0.85,
    hal: [1, 0.45, 0.15], streak: [1, 0.65, 0.35],
    disk: [1.8, 0.8, 0.08, 0.4], disk2: [70, 1, 0.6, 0.16], tex: [90, 12, 0.18, 0.6],
    wide: 'none', long: 'none', root: 185,
  },
  // V1400 Centauri: a young K star that a giant ring system crossed in 2007.
  // The rings, J1407b's, reach 0.6 AU: about 130 star radii from their centre.
  j1407: {
    ...FLARE, spots: 1.2, day: 3.2, ribbon: 1.8, sat: 1.1,
    ring: { tau: 1, ratio: 0.32, angle: 0.5, glow: 0.7, cx: -40, cy: -28 },
    row: 22, rsun: 1, expo: 1, hotW: 1, coolW: 1, loop: 0.35, prom: 0.35, dust: 0.1, rays: 0.8,
    hal: [1, 0.45, 0.15], streak: [1, 0.65, 0.35],
    disk: [1.8, 0.8, 0.1, 0.38], disk2: [50, 0.9, 0.55, 0.13], tex: [130, 13, 0.18, 0.62],
    wide: 'none', long: 'none', root: 196,
  },
  // Arcturus: an orange giant, 25 suns wide.
  arcturus: {
    ...FLARE, spots: 0.4, day: 730, bubble: 0.18,
    row: 16, rsun: 25.4, expo: 1, hotW: 1, coolW: 1.1, loop: 0.45, prom: 0.6, dust: 0.15, rays: 0.85,
    hal: [1, 0.4, 0.14], streak: [1, 0.6, 0.32],
    disk: [1.85, 1, 0.02, 0.32], disk2: [110, 0.6, 0.35, 0.07], tex: [30, 6, 0.05, 0.7],
    wide: 'none', long: 'none', root: 138.59,
  },
  // Beta Lyrae: a blue-white giant pours gas onto a heavier partner hidden in a thick disc.
  // The donor turns once per orbit, 12.94 days; its partner circles it about four radii out.
  betalyr: {
    ...FLARE, day: 12.94, rain: 0.3, reach: 3.1,
    bin: { a: 5, rd: 1.8, th: 0.6, q: 0.226, tilt: 0.42, jet: 0.6, light: 1, heat: 1 },
    row: 23, rsun: 15, expo: 1, hotW: 1, coolW: 1, loop: 0.35, prom: 0.3, dust: 0, rays: 1,
    hal: [0.6, 0.72, 1], streak: [0.6, 0.76, 1],
    disk: [1.5, 0.5, 0.06, 0.4], disk2: [90, 0.25, 0.3, 0.07], tex: [70, 8, 0.08, 0.42],
    wide: 'none', long: 'none', root: 130.81,
  },
  // Rigel: a blue supergiant, 79 suns wide.
  rigel: {
    ...FLARE, day: 160, rain: 0.3,
    row: 2, rsun: 78.9, expo: 1, hotW: 1, coolW: 0.8, loop: 0.55, prom: 0.55, dust: 0, rays: 1.1,
    hal: [0.55, 0.7, 1], streak: [0.5, 0.75, 1],
    disk: [1.5, 0.55, 0.05, 0.42], disk2: [95, 0.3, 0.3, 0.08], tex: [60, 8, 0.1, 0.4],
    wide: 'none', long: 'none', root: 329.63,
  },
  // Betelgeuse: a red supergiant, 760 suns wide, with a handful of giant cells.
  betelgeuse: {
    ...FLARE, day: 13000, ribbon: 1.2, bubble: 0.15,
    row: 3, rsun: 764, expo: 1, hotW: 1, coolW: 1.1, loop: 0.3, prom: 0.65, dust: 0.45, rays: 0.8,
    hal: [1, 0.35, 0.12], streak: [1, 0.55, 0.3],
    disk: [1.9, 1.3, 0, 0.3], disk2: [150, 0.6, 0.3, 0.05], tex: [7, 3, 0, 0.8],
    wide: 'none', long: 'none', root: 164.81,
  },
  // VY Canis Majoris: a red hypergiant, 1420 suns wide, in its own dust.
  vycma: {
    ...FLARE, day: 20000, ribbon: 1, bubble: 0.12,
    row: 4, rsun: 1420, expo: 0.95, hotW: 1, coolW: 1.1, loop: 0.18, prom: 0.55, dust: 1, rays: 0.75,
    hal: [0.9, 0.25, 0.1], streak: [1, 0.45, 0.28],
    disk: [1.9, 1.5, 0, 0.16], disk2: [140, 0.45, 0.2, 0.05], tex: [5, 2.5, 0, 0.65],
    wide: 'none', long: 'none', root: 110,
  },
  // Cygnus X-1: a black hole of 21 suns, fed by a blue supergiant; an X-ray hot disc.
  // A hole has no surface: the shadow's edge stands where a star's limb would.
  cygx1: {
    ...FLARE, rope: 0, ribbon: 0, rain: 0, bubble: 0, sat: 0,
    hole: { tilt: 0.16, light: 0.9, heat: 1.2, stars: 1 }, reach: 3,
    row: 18, rsun: 9.0e-5, expo: 1, hotW: 1, coolW: 1, loop: 0, prom: 0, dust: 0, rays: 0,
    hal: [0.55, 0.7, 1], streak: [0.6, 0.75, 1],
    disk: [0, 0, 0, 0], disk2: [60, 0, 0, 0], tex: [60, 5, 0, 0.35],
    wide: 'none', long: 'none', root: 98,
  },
  // Sagittarius A*: the hole at the centre of our galaxy, 4.3 million suns.
  sgra: {
    ...FLARE, rope: 0, ribbon: 0, rain: 0, bubble: 0, sat: 0,
    hole: { tilt: 0.18, light: 0.8, heat: 0.85, stars: 1.2 }, reach: 3,
    row: 17, rsun: 18.3, expo: 1, hotW: 1, coolW: 1, loop: 0, prom: 0, dust: 0, rays: 0,
    hal: [1, 0.45, 0.15], streak: [1, 0.7, 0.4],
    disk: [0, 0, 0, 0], disk2: [60, 0, 0, 0], tex: [60, 5, 0, 0.35],
    wide: 'none', long: 'none', root: 82.41,
  },
  // 3C 273: the first quasar found, a hole of 260 million suns feeding hard.
  // A blue-white disc and a one-sided jet with knots that travel out.
  qso: {
    ...FLARE, rope: 0, ribbon: 0, rain: 0, bubble: 0, sat: 0,
    hole: { tilt: 0.2, light: 0.85, heat: 1.5, stars: 0.8 }, reach: 3, jet: 1.3,
    row: 19, rsun: 1100, expo: 1, hotW: 1, coolW: 1, loop: 0, prom: 0, dust: 0, rays: 0,
    hal: [0.6, 0.7, 1], streak: [0.7, 0.8, 1],
    disk: [0, 0, 0, 0], disk2: [60, 0, 0, 0], tex: [60, 5, 0, 0.35],
    wide: 'none', long: 'none', root: 73.42,
  },
};
/* ---------- a binary's stream, traced through gravity ---------- */
// A parcel of gas leaves L1 and falls in the rotating frame of the pair.
// The restricted three-body problem: two point masses, Coriolis, the spin's pull.
// Units: the separation is 1, the pair's mass is 1, the orbit's rate is 1.
// Returns 12 points in the donor's frame, in donor radii: x, y, z and the stream's width.
const paths = new WeakMap();
export function streamPath(bin) {
  if (paths.has(bin)) return paths.get(bin);
  const q = bin.q, md = q / (1 + q), mg = 1 / (1 + q), xd = -mg, xg = md;
  // L1: where the pulls and the spin balance on the line between the stars.
  const f = x => x - md * (x - xd) / Math.abs(x - xd) ** 3 - mg * (x - xg) / Math.abs(x - xg) ** 3;
  let lo = xd + 0.01, hi = xg - 0.01;
  for (let i = 0; i < 80; i++) { const m = (lo + hi) / 2; if (f(lo) * f(m) <= 0) hi = m; else lo = m; }
  const acc = (x, y, vx, vy) => {
    const r1 = Math.hypot(x - xd, y) ** 3, r2 = Math.hypot(x - xg, y) ** 3;
    return [2 * vy + x - md * (x - xd) / r1 - mg * (x - xg) / r2, -2 * vx + y - md * y / r1 - mg * y / r2];
  };
  const d = st => { const a = acc(...st); return [st[2], st[3], a[0], a[1]]; };
  let s = [(lo + hi) / 2 + 0.003, 0, 0.01, 0];
  const pts = [[s[0], s[1]]];
  const rdA = bin.rd / bin.a, dt = 0.0005;
  // RK4 until the parcel strikes the disc's rim.
  for (let n = 0; n < 40000 && Math.hypot(s[0] - xg, s[1]) > rdA; n++) {
    const k1 = d(s), k2 = d(s.map((v, i) => v + dt / 2 * k1[i])), k3 = d(s.map((v, i) => v + dt / 2 * k2[i])), k4 = d(s.map((v, i) => v + dt * k3[i]));
    s = s.map((v, i) => v + dt / 6 * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]));
    pts.push([s[0], s[1]]);
  }
  // The donor's frame: the donor at the centre, the partner on +x, the spin about +y.
  // Even steps along the path: the parcel starts slowly, so time steps would bunch at L1.
  const R3 = [[1, 0], ...pts.map(q => [(q[0] - xd) * bin.a, -q[1] * bin.a])];
  const cum = [0];
  for (let i = 1; i < R3.length; i++) cum.push(cum[i - 1] + Math.hypot(R3[i][0] - R3[i - 1][0], R3[i][1] - R3[i - 1][1]));
  const at = u => {
    const L = u * cum[cum.length - 1];
    let k = 1;
    while (k < cum.length - 1 && cum[k] < L) k++;
    const f = (L - cum[k - 1]) / Math.max(cum[k] - cum[k - 1], 1e-9);
    return [R3[k - 1][0] + (R3[k][0] - R3[k - 1][0]) * f, 0, R3[k - 1][1] + (R3[k][1] - R3[k - 1][1]) * f];
  };
  const out = [];
  for (let i = 0; i < 12; i++) {
    const p = at(i / 11);
    // A broad neck at the donor, narrowing, then spreading as it meets the disc.
    out.push([...p, 0.32 - 0.15 * Math.sin(Math.PI * i / 11) + 0.06 * i / 11]);
  }
  paths.set(bin, out);
  return out;
}

// Every star weights its loops by one temperature response.
export const resp = lt => gauss(lt, 5.95, 0.2) + 0.04 * gauss(lt, 7.0, 0.3);
// Scale bodies: diameter in km; bright bodies shine, dark ones block light.
// kind: 0 bare rock. No body beside a star: only Mercury crosses the sun.
export const BODIES = {
  mercury: { km: 4879, kind: 0 },
  none: { km: 0, kind: 0 },
};
// A body's diameter in star units, where the star's radius is R.
export const bodySize = (star, body) => BODIES[body].km / 1000 / star.rsun;

/* ---------- a neutron star's spin ---------- */
// The magnetic axis turns about the spin axis on a cone that crosses the line of sight.
// Halfway between up and the eye: a beam rises overhead, then sweeps past the eye.
export const SPIN = norm([0.1, 0.7, 0.7]);
export const SPIN_PERIOD = 1.6;
export function magAxis(time) {
  const a = 2 * Math.PI * time / SPIN_PERIOD;
  const u = norm(cross(SPIN, [0, 0, 1])), v = cross(SPIN, u);
  // The cone's half angle equals the spin axis's angle from the eye, so a beam sweeps past it.
  const off = Math.acos(SPIN[2]);
  return norm(add(scale(SPIN, Math.cos(off)), add(scale(u, Math.cos(a)), v, Math.sin(a)), Math.sin(off)));
}

/* ---------- regions ---------- */
// psi: angle round the limb from its top. beta: toward the viewer (+) or behind (-).
// theta: the bipole axis, 0 along the limb. span: half the footpoint gap.
// psi runs clockwise round the limb from the north pole; the spin axis points up.
// Every region sits in a belt 5 to 35 degrees from the equator, as on the sun.
const REGION_DEFS = [
  // The west limb's northern belt, on the right: the wide view.
  { psi: 1.12, beta: 0.03, theta: 0.12, span: [12, 69], len: 96, hk: 1.05, n: 16, lt: 5.95 },
  { psi: 1.44, beta: -0.07, theta: -0.35, span: [21, 96], len: 84, hk: 1.15, n: 14, lt: 6.0 },
  { psi: 1.71, beta: 0.16, theta: 1.1, span: [10, 42], len: 60, hk: 0.95, n: 10, lt: 5.9 },
  { psi: 0.99, beta: -0.02, theta: 0.55, span: [15, 57], len: 75, hk: 1.0, n: 12, lt: 5.95 },
  { psi: 1.3, beta: 0.2, theta: 0.3, span: [10, 39], len: 68, hk: 0.9, n: 10, lt: 5.9 },
  // Its southern belt: the long lens.
  { psi: 1.86, beta: 0.04, theta: 0.2, span: [12, 66], len: 90, hk: 1.1, n: 16, lt: 5.95 },
  { psi: 2.0, beta: -0.06, theta: -0.3, span: [18, 90], len: 80, hk: 1.15, n: 14, lt: 6.0 },
  { psi: 2.12, beta: 0.12, theta: 0.9, span: [10, 45], len: 60, hk: 0.95, n: 10, lt: 5.9 },
  { psi: 2.06, beta: -0.25, theta: 0.5, span: [12, 50], len: 70, hk: 1.0, n: 12, lt: 5.95 },
  { psi: 1.93, beta: 0.22, theta: 0.3, span: [10, 40], len: 65, hk: 0.9, n: 10, lt: 5.9 },
  // The rest of the belts: the near disk, the far side and behind.
  { psi: 0.0, beta: 1.26, theta: 0.4, span: [12, 55], len: 70, hk: 1.0, n: 12, lt: 5.95 },
  { psi: 3.14, beta: -1.33, theta: -0.2, span: [10, 48], len: 60, hk: 1.05, n: 10, lt: 5.95 },
  { psi: -1.13, beta: -0.48, theta: 0.7, span: [12, 52], len: 66, hk: 1.0, n: 12, lt: 5.95 },
  { psi: -2.04, beta: 0.1, theta: 0.1, span: [10, 44], len: 60, hk: 0.95, n: 10, lt: 5.9 },
];
// The number of regions: the disk pass takes one uniform each.
export const NR = REGION_DEFS.length;

/* ---------- giant prominences ---------- */
// Cool plasma held high in the corona: far larger than the loops.
// len: the footprint along the limb; h: the height, both in Mm.
const PROM_DEFS = [
  // A hedgerow: a curtain of fine upright threads.
  { type: 'hedge', psi: 0.99, beta: 0.015, theta: 0, len: 260, h: 165, n: 80 },
  // An arch: a twisted rope that rises from behind the limb.
  { type: 'arch', psi: 1.59, beta: -0.035, theta: 0.08, len: 270, h: 205, n: 18 },
  // A tall curtain: the wall that fills the wide view's sky.
  { type: 'hedge', psi: 1.3, beta: 0.01, theta: 0, len: 140, h: 240, n: 46 },
  // The southern belt, framed by the long lens.
  { type: 'arch', psi: 1.82, beta: -0.03, theta: 0.06, len: 250, h: 220, n: 18 },
  { type: 'hedge', psi: 2.12, beta: 0.015, theta: 0, len: 200, h: 150, n: 60 },
  // The east limb, for the full star.
  { type: 'hedge', psi: -1.56, beta: 0.01, theta: 0, len: 150, h: 230, n: 46 },
  // The polar crowns, for the full star.
  { type: 'arch', psi: 2.84, beta: -0.03, theta: 0.1, len: 200, h: 160, n: 14 },
  { type: 'hedge', psi: -0.11, beta: 0.01, theta: 0, len: 180, h: 120, n: 50 },
];
// An eruption lifts the prominence off; it forms again by this time.
export const PROM_END = 46;

// A frame on the sphere: centre c, axis e along the bipole, f across it.
function basis(psi, beta, theta) {
  const c = sphere(psi, beta);
  const t1 = norm(cross(c, [0, 0, 1]));
  const t2 = cross(t1, c);
  const e = norm(add(scale(t1, Math.cos(theta)), t2, Math.sin(theta)));
  return { c, e, f: cross(c, e) };
}

export function makeSun() {
  const proms = PROM_DEFS.map((d, pi) => ({ ...d, ...basis(d.psi, d.beta, d.theta), id: pi + 1, erupt: -1 }));
  const regions = REGION_DEFS.map((d, ri) => {
    const { c, e, f } = basis(d.psi, d.beta, d.theta);
    const bundles = [];
    for (let i = 0; i < d.n; i++) {
      const h = k => hash(ri * 97 + i, k, 3);
      bundles.push({
        id: ri * 100 + i,
        rank: h(1),
        // Nested spans: the inner loops are low, the outer loops tall.
        a: d.span[0] + (d.span[1] - d.span[0]) * Math.pow(h(2), 0.8),
        off: (h(3) - 0.5) * d.len * 0.8,
        shear: (h(4) - 0.5) * 16,
        // Loops lean outward from the region's middle, as a fan.
        tilt: (h(5) - 0.5) * 0.5 + (h(3) - 0.5) * 0.9,
        period: 24 + 22 * h(6),
        phase: h(7),
        lt: d.lt + (h(8) - 0.5) * 0.32,
        threads: 3 + Math.floor(h(9) * 4),
        tall: 0.85 + 0.55 * h(10),
        // Each bundle turns its own axis and shifts its middle.
        turn: (h(11) - 0.5) * 1.1,
        mid: (h(12) - 0.5) * 1.1,
      });
    }
    // Long loops and open fans: faint threads that climb out of the frame.
    for (let i = 0; i < 2; i++) {
      const h = k => hash(ri * 97 + i, k, 9);
      bundles.push({
        id: ri * 100 + 50 + i, rank: 0.2 + 0.7 * h(1),
        a: d.span[1] * (1.6 + 1.6 * h(2)), off: (h(3) - 0.5) * d.len, shear: (h(4) - 0.5) * 30,
        tilt: (h(5) < 0.5 ? -1 : 1) * (0.5 + 0.6 * h(9)), period: 40 + 30 * h(6), phase: h(7), lt: d.lt - 0.05,
        threads: 3, tall: 1.6 + 1.4 * h(8), faint: 0.2, turn: (h(10) - 0.5) * 1.2, mid: 0,
      });
    }
    // spot: where Activity opens this region's sunspots, 0 to 1.
    return { ...d, ri, c, e, f, bundles, lastFlare: -1e9, spot: hash(ri, 11, 5) };
  });
  return { regions, proms, flares: [] };
}

/* ---------- strands ---------- */
// One strand: footpoints A and B (unit vectors), apex height, tilt, width, light, flow phase,
// drain, twist radius, twist turns, twist phase, kind (0 loop, 1 ribbon on the surface, 2 rope).
function put(out, n, A, h, B, tilt, w, I, ph, drain, twR = 0, twN = 0, twP = 0, kind = 0) {
  if (n >= MAX_STRANDS || I < 1e-4) return n;
  const o = n * STRIDE;
  out[o] = A[0]; out[o + 1] = A[1]; out[o + 2] = A[2]; out[o + 3] = h;
  out[o + 4] = B[0]; out[o + 5] = B[1]; out[o + 6] = B[2]; out[o + 7] = tilt;
  out[o + 8] = w; out[o + 9] = I; out[o + 10] = ph; out[o + 11] = drain;
  out[o + 12] = twR; out[o + 13] = twN; out[o + 14] = twP; out[o + 15] = kind;
  return n + 1;
}
// A point on the surface: the region's centre, moved by e and f in Mm.
const foot = (rg, de, df) => norm(add(add(scale(rg.c, R), rg.e, de), rg.f, df));
// A foot on a bundle's own axis, turned by ang from the region's axis.
function footT(rg, ang, de, df) {
  const c = Math.cos(ang), s = Math.sin(ang);
  return foot(rg, de * c - df * s, de * s + df * c);
}

// The life of one ambient loop over its period: rise, shine, drain, fade.
function life(l) {
  const vis = sstep(0, 0.12, l) * (1 - sstep(0.84, 0.97, l));
  const drain = clamp((l - 0.56) / 0.3);
  return { vis, drain, rise: 0.8 + 0.2 * sstep(0, 0.35, l) };
}

// A flare's parts over its own clock t.
export const flareCurve = {
  sep: (t, rg) => (0.12 + 0.5 * (1 - Math.exp(-t / 9))) * rg.span[1],
  ribbon: t => sstep(0, 0.1, t) * (0.3 + 0.7 * Math.exp(-t / 2.2)) * Math.exp(-t / 16) * (1 - sstep(30, 42, t)),
  kernel: t => sstep(0, 0.05, t) * Math.exp(-t / 1.5),
  // Slow and vast: the rope fills the frame over about six seconds.
  ropeH: (t, h0) => h0 + 14 * t + 10 * t * t,
  // The region's own loops: a burst as they reconnect, gone, then back.
  ambient: t => (1 + 1.6 * Math.exp(-t / 0.45)) * (1 - 0.88 * sstep(0.4, 3, t)) + 0.88 * sstep(28, 44, t),
  // Arcade loop j forms at this time: low loops first, then higher.
  born: j => 0.45 + 0.62 * j + 0.012 * j * j,
};
export const ARCADE = 22;
// The rope lies across the neutral line at a slant, so its arch shows side on.
const ROPE_TURN = 0.85;

// Light of the region's filament rope at rest: it forms again after a flare.
function ropeRest(rg, time) {
  return sstep(32, 52, time - rg.lastFlare);
}

/**
 * Writes every strand for the given clock into out.
 * @returns {number} The strand count.
 */
// The hand lights a region or prominence: lit runs from 0 to 1.
export const LIT_GAIN = 0.15;
const glow = o => 1 + LIT_GAIN * (o.lit || 0);
// spin: the pulsar's own clock, which an egg can speed up.
export function strands(sun, time, { star, activity, spin = time }, out) {
  const B = STARS[star];
  let n = 0;
  const act = clamp(activity);
  for (const rg of sun.regions) {
    const fl = sun.flares.find(f => f.rg === rg);
    const amb = fl ? flareCurve.ambient(fl.t) : 1;
    for (const b of rg.bundles) {
      // Low activity leaves fewer loops alive and makes them dimmer.
      const alive = sstep(b.rank - 0.12, b.rank + 0.02, 0.3 + 0.75 * act);
      if (alive <= 0) continue;
      const per = b.period * (1.25 - 0.4 * act);
      const u = time / per + b.phase;
      const cyc = Math.floor(u), l = u - cyc;
      const L = life(l);
      if (L.vis <= 0) continue;
      // Each new cycle draws the loop with a new shape.
      const j = k => hash(b.id, cyc, k);
      const a = b.a * (0.82 + 0.36 * j(1));
      const off = b.off + (j(2) - 0.5) * 14;
      const sh = b.shear + (j(3) - 0.5) * 10;
      const tilt = b.tilt + (j(4) - 0.5) * 0.35;
      const lt = b.lt + (j(5) - 0.5) * 0.18;
      const I0 = resp(lt) * B.loop * L.vis * alive * amb * (0.55 + 0.45 * act) * (0.6 + 0.8 * j(6) * j(6)) * (b.faint || 1) * glow(rg);
      const h = a * rg.hk * b.tall * L.rise;
      for (let k = 0; k < b.threads; k++) {
        const q = m => hash(b.id * 7 + k, cyc, m + 10);
        // Threads of one bundle share their feet and part a little at the top.
        const da = (q(1) - 0.5) * 2.4, dof = (q(2) - 0.5) * 7;
        const m = b.mid * a + (j(7) - 0.5) * 8;
        const A = footT(rg, b.turn, m + a + da + (q(3) - 0.5) * 1.5, off + sh + dof);
        const Bf = footT(rg, b.turn, m - a - da + (q(4) - 0.5) * 1.5, off - sh + dof);
        const w = 0.45 + 1.1 * q(5) * q(5);
        const I = I0 * (0.3 + 0.7 * q(6)) * 0.36;
        n = put(out, n, A, h * (0.97 + 0.06 * q(7)), Bf, tilt + (q(8) - 0.5) * 0.14, w, I, q(9) * 7, L.drain);
      }
    }
    // The filament: a low twisted rope along the region's neutral line.
    const rest = fl ? 0 : ropeRest(rg, time);
    if (rest > 0) {
      const h0 = rg.span[1] * 0.42;
      const A = footT(rg, ROPE_TURN, 0, -rg.len * 0.55), Bf = footT(rg, ROPE_TURN, 0, rg.len * 0.55);
      for (let k = 0; k < 5; k++) n = put(out, n, A, h0, Bf, 0, 1.3, B.rope * 0.07 * rest, k, 0, 2.5, 1.3, k * 1.2566 + time * 0.05, 2);
    }
  }
  for (const p of sun.proms) n = promStrands(p, B, time, out, n);
  if (B.field) n = fieldStrands(spin, B, out, n);
  for (const fl of sun.flares) n = flareStrands(fl, B, out, n);
  return n;
}

// Dipole field lines: each leaves near one magnetic pole and returns near the other.
// Closed shells nest round the star; the outer ones reach the edge of the frame.
const FIELD_N = 56;
function fieldStrands(time, B, out, n) {
  const m = magAxis(time);
  const u = norm(cross(m, [0.3, 0.2, 0.93])), v = cross(m, u);
  for (let i = 0; i < FIELD_N; i++) {
    const q = k => hash(i, k, 41);
    const ph = (i / FIELD_N) * 2 * Math.PI + q(1) * 0.25;
    // Three shells: low and bright, middle, and tall and faint.
    const shell = i % 3;
    const th = [0.95, 0.7, 0.5][shell] + 0.12 * (q(2) - 0.5);
    const ring = add(scale(u, Math.cos(ph)), v, Math.sin(ph));
    const A = norm(add(scale(m, Math.cos(th)), ring, Math.sin(th)));
    const Bf = norm(add(scale(m, -Math.cos(th)), ring, Math.sin(th)));
    // A dipole line from colatitude th rises to R over sin squared.
    const h = R * (1 / Math.sin(th) ** 2 - 1);
    const I = B.field * [0.16, 0.11, 0.07][shell] * (0.5 + 0.5 * q(4));
    n = put(out, n, A, h, Bf, 0, 0.8 + q(3), I, q(5) * 7, 0);
  }
  return n;
}

// The prominence's growth, light and kind over its eruption clock.
export function promPhase(p) {
  const t = p.erupt;
  if (t < 0) return { grow: 0, fade: 1, kind: 3 };
  // It lifts with growing speed, fades as it leaves, then forms again.
  if (t < 17) return { grow: 0.05 * t + 0.012 * t * t, fade: 1 - sstep(10, 17, t), kind: p.type === 'arch' ? 4 : 3 };
  return { grow: 0, fade: sstep(24, PROM_END - 2, t), kind: 3 };
}

function promStrands(p, B, time, out, n) {
  const { grow, fade, kind } = promPhase(p);
  if (fade <= 0.002) return n;
  const I0 = B.prom * fade * glow(p);
  const fp = (de, df) => foot(p, de, df);
  for (let i = 0; i < p.n; i++) {
    const q = m => hash(p.id * 131 + i, m, 5);
    if (p.type === 'hedge') {
      const u = (i / (p.n - 1) - 0.5) * p.len + (q(1) - 0.5) * 4;
      const prof = Math.pow(Math.max(0, 1 - (2 * u / p.len) ** 2), 0.6);
      if (prof <= 0.02) continue;
      const hgt = p.h * prof * (0.55 + 0.45 * q(2)) * (1 + 0.07 * Math.sin(time * 0.06 + i * 1.7)) * (1 + grow * (0.6 + 0.8 * q(3)));
      const half = 1.2 + 2.5 * q(4);
      const lean = (q(5) - 0.5) * 0.25 + grow * 0.15 * Math.sign(u);
      n = put(out, n, fp(u, -half), hgt, fp(u, half), lean, 0.7 + 1.6 * q(6) ** 2,
        I0 * (0.35 + 0.65 * q(7)) * 0.3 * Math.sqrt(prof), q(12) * 7, 0,
        1.5 + 3 * q(8), 1 + 2 * q(9), q(11) * 6.28 + time * 0.05 * (q(10) - 0.5), kind);
    } else {
      const A = fp(p.len / 2 + (q(1) - 0.5) * 24, (q(2) - 0.5) * 20);
      const Bf = fp(-p.len / 2 + (q(3) - 0.5) * 24, (q(4) - 0.5) * 20);
      const hgt = p.h * (0.85 + 0.3 * q(5)) * (1 + 0.04 * Math.sin(time * 0.05 + i)) * (1 + grow);
      n = put(out, n, A, hgt, Bf, 0.15 + (q(9) - 0.5) * 0.2, 1.2 + 3 * q(10) ** 2,
        I0 * (0.4 + 0.6 * q(11)) * 0.22, q(12) * 7, 0,
        (6 + 16 * q(6)) * (1 + grow * 1.5), 1.2 + 0.8 * q(7), q(8) * 6.28 + time * 0.025, kind);
    }
  }
  return n;
}

/* ---------- prominence eruptions ---------- */
export function startEruption(p) { p.erupt = 0; }
export function stepProms(sun, dt) {
  for (const p of sun.proms) if (p.erupt >= 0) { p.erupt += dt; if (p.erupt >= PROM_END) p.erupt = -1; }
}
// The point a prominence shows to a tap: part way up its body.
export const promApex = p => scale(p.c, R + p.h * 0.6);

function flareStrands(fl, B, out, n) {
  const { rg, t } = fl;
  const C = flareCurve;
  const sep = C.sep(t, rg);
  const len = rg.len * 0.9;
  // Two ribbons, one each side of the neutral line, parting as the flare runs.
  // Face-on, the ribbons stand against the bright disk, so they burn harder (Tom, 2026-11-24).
  const face = fl.face || 0;
  const rib = C.ribbon(t) * B.ribbon * fl.k * (1 + 2.5 * face);
  if (rib > 0.001) {
    for (const s of [-1, 1]) {
      // Five strands per ribbon: a bright core and a frayed edge.
      for (let k = 0; k < 5; k++) {
        const wob = (hash(fl.seed, k, s + 5) - 0.5) * (3 + k);
        const A = foot(rg, s * (sep + wob), -len / 2 + k * 3), Bf = foot(rg, s * (sep - wob), len / 2 - k * 4);
        n = put(out, n, A, 0.9, Bf, 0, 1.1 + k * 0.45, rib * (k === 0 ? 1.3 : 0.65 - 0.08 * k), k, 0, 0, 0, 0, 1);
      }
    }
  }
  // The rope lifts off with growing speed and leaves the frame.
  const h0 = rg.span[1] * 0.42;
  const hr = C.ropeH(t, h0);
  const ropeI = B.rope * (0.5 + 1.6 * Math.exp(-t / 1.5)) * sstep(0, 0.15, t) * (1 - sstep(500, 900, hr)) * fl.k;
  if (ropeI > 0.002) {
    const A = footT(rg, ROPE_TURN, 0, -rg.len * 0.6), Bf = footT(rg, ROPE_TURN, 0, rg.len * 0.6);
    const twR = 2.5 + 0.2 * (hr - h0);
    for (let k = 0; k < 12; k++) {
      n = put(out, n, A, hr * (0.94 + 0.012 * k), Bf, 0.08 * Math.sin(k), 1.4 + 0.008 * hr, ropeI * 0.12, k, 0, twR * (0.7 + 0.05 * k), 0.9, k * 0.5236 + t * 0.4, 2);
    }
  }
  // The arcade: loops snap in over the ribbons, each born hot, then cooling.
  for (let j = 0; j < ARCADE; j++) {
    const tj = C.born(j);
    const tau = t - tj;
    if (tau <= 0) break;
    const q = m => hash(fl.seed * 31 + j, m, 77);
    const a = C.sep(tj, rg) * (0.95 + 0.15 * q(1));
    const lt = Math.log10(0.9e6 + 21e6 * Math.exp(-tau / 1.6));
    const em = sstep(0, 0.25, tau) * Math.exp(-tau / 30) * (1 - sstep(30, 40, tau));
    // Every band sees the snap; then each sees the loop at its own temperature.
    const I = (resp(lt) + 1.2 * Math.exp(-tau / 0.45)) * em * 0.6 * fl.k * (1 + 1.5 * face);
    if (I < 0.003) continue;
    const off = (q(2) - 0.5) * len;
    const drain = clamp((tau - 12) / 13);
    // Three threads per arcade loop: a loop is a bundle of strands.
    for (let k = 0; k < 3; k++) {
      // Each thread takes its own hash slots: 20, 30, 40, 50 and 60 apart by k.
      const A = foot(rg, a + (q(20 + k) - 0.5) * 3, off + (q(30 + k) - 0.5) * 4 + 2);
      const Bf = foot(rg, -a + (q(40 + k) - 0.5) * 3, off + (q(50 + k) - 0.5) * 4 - 2);
      n = put(out, n, A, a * 1.2 + 3, Bf, (q(11) - 0.5) * 0.2, 1.0 + 0.5 * q(60 + k), I * [0.7, 0.5, 0.35][k], q(14) * 7, drain);
    }
  }
  return n;
}

/* ---------- flares ---------- */
// A flare site where the hand taps the disk (Tom, 2026-11-24).
// It carries what a flare needs from a region: its frame, span and length.
// c is the tapped point in the star's frame; the bipole runs east to west.
export function makeSite(c) {
  let e = cross([0, 1, 0], c);
  if (Math.hypot(e[0], e[1], e[2]) < 1e-3) e = [1, 0, 0];
  e = norm(e);
  return { c, e, f: cross(c, e), span: [12, 60], len: 80, hk: 1, lastFlare: -1e9, site: true };
}
// The flare's pace: slower on every star, and slower still on a large one.
// The sun runs at 0.75; a supergiant takes about four times as long.
export const flarePace = B => 0.75 / clamp(Math.pow(B.rsun, 0.18), 0.8, 3.5);
export function startFlare(sun, rg, time, k = 1) {
  sun.flares = sun.flares.filter(f => f.rg !== rg);
  if (sun.flares.length >= MAX_FLARES) sun.flares.shift();
  const fl = { rg, t: 0, k, seed: Math.floor(Math.random() * 1e6) };
  sun.flares.push(fl);
  rg.lastFlare = time;
  return fl;
}
export function stepFlares(sun, dt) {
  for (const f of sun.flares) f.t += dt;
  sun.flares = sun.flares.filter(f => f.t < FLARE_END);
}

/**
 * Uniforms for the disk pass and the detector, per flare, in the sun frame.
 * bubble: centre height, radius, light.
 * kernel: the saturating core, at a point just above the surface.
 */
export function flareView(fl, star) {
  const B = STARS[star], C = flareCurve, rg = fl.rg, t = fl.t;
  const h0 = rg.span[1] * 0.42;
  const hr = C.ropeH(t, h0);
  return {
    c: rg.c,
    bubble: [0.75 * hr, 0.6 * hr + 14, B.bubble * sstep(0.2, 0.9, t) * Math.exp(-t / 4) * fl.k],
    kernel: [rg.span[1] * 0.25, C.kernel(t) * B.sat * fl.k],
  };
}
