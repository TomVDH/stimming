// Double slit optics: the far-field intensity, a landing sampler, the colour of a wavelength.
// Pure maths, no DOM, so a node test can load it.

// Slit width to gap as in Harvard's demo: 200 um wide, 1.0 mm apart.
export const GAP_TO_WIDTH = 5;
// The reference wavelength: at 532 nm the envelope's first zero is at u = 1.
export const NM0 = 532;
export const NM_MIN = 420, NM_MAX = 660;
// The share of landings that are dark counts, uniform over the plate.
export const DARK = 0.012;
const BINS = 4096;

const sinc = x => (Math.abs(x) < 1e-6 ? 1 : Math.sin(x) / x);

/**
 * Far-field intensity at angle u for one or two slits.
 * u is in units of the 532 nm envelope zero.
 * @param {number} u
 * @param {number} nm
 * @param {1 | 2} slits
 */
export function intensity(u, nm, slits) {
  const k = Math.PI * u * (NM0 / nm);
  const env = sinc(k) ** 2;
  return slits === 2 ? env * Math.cos(k * GAP_TO_WIDTH) ** 2 : env;
}

/**
 * A sampler of landings by inverse CDF over the plate.
 * The plate spans u from -span to +span.
 * @param {() => number} [rnd]
 */
export function makeSampler(rnd = Math.random) {
  const cdf = new Float64Array(BINS + 1);
  let span = 1, key = '';
  // Builds the table once per slit count, colour and span.
  function build(nm, slits, s) {
    const k = `${nm}|${slits}|${s}`;
    if (k === key) return;
    key = k;
    span = s;
    cdf[0] = 0;
    for (let i = 0; i < BINS; i++) {
      const u = ((i + 0.5) / BINS * 2 - 1) * span;
      cdf[i + 1] = cdf[i] + intensity(u, nm, slits);
    }
    const total = cdf[BINS];
    for (let i = 1; i <= BINS; i++) cdf[i] /= total;
  }
  // One landing: x in plate units (-1 to 1) along the fringes' axis.
  function x() {
    if (rnd() < DARK) return rnd() * 2 - 1;
    const r = rnd();
    let lo = 0, hi = BINS;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (cdf[mid] <= r) lo = mid; else hi = mid;
    }
    const f = (r - cdf[lo]) / Math.max(1e-12, cdf[lo + 1] - cdf[lo]);
    return ((lo + f) / BINS) * 2 - 1;
  }
  return { build, x, get span() { return span; } };
}

/**
 * The beam's height profile: a Gaussian, cut at the plate edge.
 * @param {number} sigma
 * @param {() => number} [rnd]
 */
export function beamY(sigma, rnd = Math.random) {
  for (let i = 0; i < 8; i++) {
    const g = Math.sqrt(-2 * Math.log(1 - rnd())) * Math.cos(2 * Math.PI * rnd());
    const y = g * sigma;
    if (Math.abs(y) < 0.97) return y;
  }
  return 0;
}

// A two-sided Gaussian lobe, as in the Wyman, Sloan and Shirley fit.
const lobe = (x, mu, s1, s2) => { const t = (x - mu) / (x < mu ? s1 : s2); return Math.exp(-0.5 * t * t); };

/**
 * Linear sRGB of a spectral line, brightest channel 1.
 * Colours outside sRGB clip, with a little white.
 * @param {number} nm
 * @returns {[number, number, number]}
 */
export function spectralRGB(nm) {
  const X = 1.056 * lobe(nm, 599.8, 37.9, 31.0) + 0.362 * lobe(nm, 442.0, 16.0, 26.7) - 0.065 * lobe(nm, 501.1, 20.4, 26.2);
  const Y = 0.821 * lobe(nm, 568.8, 46.9, 40.5) + 0.286 * lobe(nm, 530.9, 16.3, 31.1);
  const Z = 1.217 * lobe(nm, 437.0, 11.8, 36.0) + 0.681 * lobe(nm, 459.0, 26.0, 13.8);
  let r = 3.2406 * X - 1.5372 * Y - 0.4986 * Z;
  let g = -0.9689 * X + 1.8758 * Y + 0.0415 * Z;
  let b = 0.0557 * X - 0.204 * Y + 1.057 * Z;
  // A quarter of the gamut shortfall moves toward white; the rest clips.
  const lo = Math.min(r, g, b) * 0.25;
  if (lo < 0) { r -= lo; g -= lo; b -= lo; }
  r = Math.max(0, r); g = Math.max(0, g); b = Math.max(0, b);
  const hi = Math.max(r, g, b, 1e-6);
  return [r / hi, g / hi, b / hi];
}

/** Relative luminance of a linear sRGB colour. */
export const luma = ([r, g, b]) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
