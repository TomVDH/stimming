// Spectra: temperature, colour, absorption and emission lines, and a measurement.
// Wavelengths are in nm. Temperatures are in K.

export const L0 = 380;
export const L1 = 760;
export const STEP = 0.5;
export const BINS = Math.round((L1 - L0) / STEP) + 1;
export const lambdaAt = (i: number): number => L0 + i * STEP;

export type GalaxyType = 'none' | 'elliptical' | 'spiral';

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

// Planck's law, relative.
export function planck(l: number, T: number): number {
  const x = l * 1e-9;
  return 1 / (x ** 5 * (Math.exp(0.0143877735 / (x * T)) - 1));
}

/* ---------- spectral class and temperature ---------- */
const LETTERS = 'OBAFGKM';
// Anchor temperatures: class code (letter index times ten plus subclass) and K.
const ANCHORS: [number, number][] = [
  [5, 42000], [10, 30000], [15, 15200], [20, 9800], [25, 8200], [30, 7300], [35, 6650],
  [40, 5940], [45, 5560], [50, 5150], [55, 4410], [60, 3840], [65, 3170], [69, 2400],
];

function teffOfCode(code: number): number {
  if (code <= ANCHORS[0][0]) return ANCHORS[0][1];
  for (let i = 1; i < ANCHORS.length; i++) {
    const [c1, t1] = ANCHORS[i];
    if (code <= c1) {
      const [c0, t0] = ANCHORS[i - 1];
      return t0 + ((code - c0) / (c1 - c0)) * (t1 - t0);
    }
  }
  return ANCHORS[ANCHORS.length - 1][1];
}

// The temperature of a catalog spectral type such as "K1.5III", or null.
export function teffFromSpect(spect: string): number | null {
  const s = spect.replace(/^(sd|d|g|k|esd)/, '');
  const m = /^([OBAFGKM])(\d(?:\.\d+)?)?/.exec(s);
  if (m) return teffOfCode(LETTERS.indexOf(m[1]) * 10 + (m[2] ? Number(m[2]) : 5));
  if (/^D/.test(s)) return 12000;
  if (/^W/.test(s)) return 50000;
  if (/^[CNRS]/.test(s)) return 3000;
  return null;
}

// Temperature from the B-V colour index (Ballesteros 2012).
export function bvToTeff(bv: number): number {
  return 4600 * (1 / (0.92 * bv + 1.7) + 1 / (0.92 * bv + 0.62));
}

// The spectral class nearest to a temperature, such as "K3".
export function classFromTeff(T: number): string {
  for (let code = 0; code < 70; code++) {
    if (teffOfCode(code + 0.5) < T) return `${LETTERS[Math.floor(code / 10)]}${code % 10}`;
  }
  return 'M9';
}

// A star's linear RGB from its temperature, brightest channel at 1.
// Real star colours are pale, so the tint mixes a little toward white.
export function starRGB(T: number): [number, number, number] {
  const r = planck(610, T), g = planck(545, T), b = planck(465, T);
  const m = Math.max(r, g, b);
  const mix = (c: number): number => 0.12 + 0.88 * (c / m);
  return [mix(r), mix(g), mix(b)];
}

// The sRGB colour of one wavelength, dim at the ends of sight.
export function wavelengthRGB(l: number): [number, number, number] {
  let r = 0, g = 0, b = 0;
  if (l < 440) { r = -(l - 440) / 60; b = 1; }
  else if (l < 490) { g = (l - 440) / 50; b = 1; }
  else if (l < 510) { g = 1; b = -(l - 510) / 20; }
  else if (l < 580) { r = (l - 510) / 70; g = 1; }
  else if (l < 645) { r = 1; g = -(l - 645) / 65; }
  else r = 1;
  const k = l < 420 ? 0.3 + 0.7 * (l - 380) / 40 : l > 700 ? 0.3 + 0.7 * (760 - l) / 60 : 1;
  return [clamp(r * k, 0, 1), clamp(g * k, 0, 1), clamp(b * k, 0, 1)];
}

/* ---------- lines ---------- */
// el: the element or molecule.
// l: rest wavelength. w: base width.
// peak: the line is strongest at this temperature.
// spread: its width in log T.
export type Line = { id: string; el: string; l: number; w: number; peak: number; spread: number; depth: number };

export const LINES: readonly Line[] = [
  { id: 'Hα', el: 'H', l: 656.28, w: 1.0, peak: 9500, spread: 0.17, depth: 0.5 },
  { id: 'Hβ', el: 'H', l: 486.13, w: 1.0, peak: 9500, spread: 0.17, depth: 0.6 },
  { id: 'Hγ', el: 'H', l: 434.05, w: 1.0, peak: 9500, spread: 0.17, depth: 0.6 },
  { id: 'Hδ', el: 'H', l: 410.17, w: 1.0, peak: 9500, spread: 0.17, depth: 0.55 },
  { id: 'He I', el: 'He', l: 447.15, w: 0.6, peak: 22000, spread: 0.12, depth: 0.3 },
  { id: 'He I', el: 'He', l: 587.56, w: 0.6, peak: 22000, spread: 0.12, depth: 0.3 },
  { id: 'He II', el: 'He', l: 468.6, w: 0.6, peak: 40000, spread: 0.08, depth: 0.25 },
  { id: 'Ca II K', el: 'Ca', l: 393.37, w: 1.2, peak: 4800, spread: 0.22, depth: 0.85 },
  { id: 'Ca II H', el: 'Ca', l: 396.85, w: 1.2, peak: 4800, spread: 0.22, depth: 0.8 },
  { id: 'Ca I', el: 'Ca', l: 422.67, w: 0.5, peak: 3900, spread: 0.12, depth: 0.5 },
  { id: 'G band', el: 'C', l: 430.5, w: 1.0, peak: 5200, spread: 0.12, depth: 0.35 },
  { id: 'Fe I', el: 'Fe', l: 438.35, w: 0.35, peak: 5000, spread: 0.15, depth: 0.35 },
  { id: 'Fe I', el: 'Fe', l: 527.0, w: 0.35, peak: 5000, spread: 0.15, depth: 0.3 },
  { id: 'Mg b', el: 'Mg', l: 517.27, w: 0.9, peak: 4500, spread: 0.15, depth: 0.45 },
  { id: 'Na D', el: 'Na', l: 589.29, w: 0.9, peak: 3800, spread: 0.14, depth: 0.6 },
];

// Earth's air: these lines never shift with the target.
export const TELLURIC: readonly Line[] = [
  { id: 'O₂ B', el: 'O₂', l: 686.9, w: 1.4, peak: 0, spread: 0, depth: 0.45 },
  { id: 'H₂O', el: 'O₂', l: 718.0, w: 3.0, peak: 0, spread: 0, depth: 0.15 },
  { id: 'O₂ A', el: 'O₂', l: 759.4, w: 2.0, peak: 0, spread: 0, depth: 0.7 },
];

// Spiral galaxies glow in these lines from their gas.
const EMISSION: readonly Line[] = [
  { id: 'Hα', el: 'H', l: 656.28, w: 0.8, peak: 0, spread: 0, depth: 0.9 },
  { id: '[N II]', el: 'N', l: 658.4, w: 0.8, peak: 0, spread: 0, depth: 0.3 },
  { id: '[O III]', el: 'O', l: 500.7, w: 0.8, peak: 0, spread: 0, depth: 0.45 },
  { id: 'Hβ', el: 'H', l: 486.13, w: 0.8, peak: 0, spread: 0, depth: 0.25 },
  { id: '[S II]', el: 'S', l: 671.6, w: 0.8, peak: 0, spread: 0, depth: 0.18 },
  { id: '[O II]', el: 'O', l: 372.7, w: 0.8, peak: 0, spread: 0, depth: 0.5 },
  // Young stars light their hydrogen: Lyα is the strongest line of all.
  { id: 'Lyα', el: 'H', l: 121.57, w: 0.9, peak: 0, spread: 0, depth: 2.5 },
];

// Titanium oxide band heads: they mark the cool M stars.
const TIO = [476.1, 495.4, 516.7, 544.8, 559.8, 615.9, 670.5, 705.4];

export function lineDepth(line: Line, T: number): number {
  const d = (Math.log10(T) - Math.log10(line.peak)) / line.spread;
  return line.depth * Math.exp(-d * d);
}

// Strong lines grow wider.
const lineWidth = (line: Line, depth: number): number => line.w * (0.6 + 2.2 * depth);

const tioStrength = (T: number): number => clamp((3900 - T) / 900, 0, 1) * 0.6;

const gauss = (x: number, fwhm: number): number => Math.exp(-2.7726 * (x / fwhm) ** 2);

export type Target = { teff: number; galaxy: GalaxyType; redshift: number };

// The noise-free spectrum of a target, brightest bin at 1.
export function model(t: Target): Float32Array {
  const out = new Float32Array(BINS);
  const z1 = 1 + t.redshift;
  // Galaxies take a mixed old-star continuum; spirals add young blue light.
  const absT = t.galaxy === 'none' ? t.teff : 4800;
  for (let i = 0; i < BINS; i++) {
    const l = lambdaAt(i), lr = l / z1;
    let c: number;
    if (t.galaxy === 'none') c = planck(lr, t.teff);
    else c = 0.6 * planck(lr, 4300) + 0.4 * planck(lr, 6500) + (t.galaxy === 'spiral' ? 0.15 * planck(lr, 15000) : 0);
    let a = 1;
    for (const ln of LINES) {
      const d = lineDepth(ln, absT) * (t.galaxy === 'none' ? 1 : ln.el === 'H' ? 0.3 : 0.8);
      if (d < 0.005) continue;
      a *= 1 - d * gauss(lr - ln.l, lineWidth(ln, d));
    }
    const tio = t.galaxy === 'none' ? tioStrength(t.teff) : 0;
    if (tio > 0) {
      for (const h of TIO) {
        const x = lr - h;
        a *= 1 - tio * (x >= 0 ? Math.exp(-x / 12) : Math.exp(x / 0.6));
      }
    }
    // Old stars leave a step at 400 nm rest.
    if (t.galaxy !== 'none' && lr < 400) a *= t.galaxy === 'elliptical' ? 0.55 : 0.85;
    // Hydrogen between us and the galaxy eats light blueward of Lyα.
    if (lr < 121.57) a *= lr < 91.2 ? 0.03 : 0.5;
    let e = 0;
    if (t.galaxy === 'spiral') for (const ln of EMISSION) e += ln.depth * gauss(lr - ln.l, ln.w);
    for (const ln of TELLURIC) a *= 1 - ln.depth * gauss(l - ln.l, ln.w);
    out[i] = c * a * (1 + e * 0.6);
  }
  let m = 0;
  for (let i = 0; i < BINS; i++) m = Math.max(m, out[i]);
  for (let i = 0; i < BINS; i++) out[i] /= m;
  return out;
}

/* ---------- the measurement ---------- */
// What the spectrograph can claim so far.
export type Found = { id: string; el: string; l: number; depth: number; sigma: number; emission: boolean };

const binOf = (l: number): number => Math.round((l - L0) / STEP);

// Mean of a spectrum over a wavelength range.
function mean(s: Float32Array, a: number, b: number): [number, number] {
  const i0 = clamp(binOf(a), 0, BINS - 1), i1 = clamp(binOf(b), 0, BINS - 1);
  let sum = 0;
  for (let i = i0; i <= i1; i++) sum += s[i];
  const n = i1 - i0 + 1;
  return [sum / n, n];
}

// A blue over red colour ratio, from line-free windows.
function colourRatio(s: Float32Array): number {
  return mean(s, 445, 465)[0] / Math.max(1e-6, mean(s, 600, 640)[0]);
}

// The ratio for each temperature, for the inverse look-up.
const RATIO_T: number[] = [];
const RATIO_R: number[] = [];
for (let T = 2400; T <= 45000; T *= 1.03) {
  RATIO_T.push(T);
  RATIO_R.push(colourRatio(model({ teff: T, galaxy: 'none', redshift: 0 })));
}

function teffFromRatio(r: number): number {
  for (let i = 1; i < RATIO_R.length; i++) {
    if (RATIO_R[i] >= r) {
      const k = (r - RATIO_R[i - 1]) / (RATIO_R[i] - RATIO_R[i - 1]);
      return RATIO_T[i - 1] + k * (RATIO_T[i] - RATIO_T[i - 1]);
    }
  }
  return RATIO_T[RATIO_T.length - 1];
}

// A spectrograph run on one target: it sums noisy frames.
// The signal-to-noise ratio grows with the square root of the time.
export class Run {
  readonly truth: Float32Array;
  private sum = new Float32Array(BINS);
  readonly now = new Float32Array(BINS);
  time = 0;

  // snrRate: the signal-to-noise ratio after one second.
  constructor(readonly target: Target, readonly snrRate: number) {
    this.truth = model(target);
  }

  get snr(): number {
    return this.snrRate * Math.sqrt(this.time);
  }

  // Adds dt seconds of light with fresh noise.
  step(dt: number, rand: () => number): void {
    if (dt <= 0) return;
    const sigma = 1 / (this.snrRate * Math.sqrt(dt));
    for (let i = 0; i < BINS; i++) {
      // Box-Muller gives one normal draw.
      const g = Math.sqrt(-2 * Math.log(rand() + 1e-12)) * Math.cos(6.2831853 * rand());
      const v = this.truth[i];
      this.sum[i] += (v + g * sigma * Math.sqrt(v + 0.02)) * dt;
    }
    this.time += dt;
    for (let i = 0; i < BINS; i++) this.now[i] = this.sum[i] / this.time;
  }

  // Lines measured so far, absorption and emission.
  lines(): Found[] {
    if (this.time <= 0) return [];
    const z1 = 1 + this.target.redshift;
    const out: Found[] = [];
    const noise = 1 / Math.max(1e-6, this.snr);
    const test = (ln: Line, shift: number, emission: boolean): void => {
      const l = ln.l * shift, w = Math.max(0.6, ln.w);
      if (l < L0 + 4 || l > L1 - 1) return;
      const [core, nc] = mean(this.now, l - w / 2, l + w / 2);
      const [lo] = mean(this.now, l - 4 * w, l - 2 * w);
      const [hi] = mean(this.now, l + 2 * w, Math.min(L1, l + 4 * w));
      const cont = (lo + hi) / 2;
      if (cont <= 0) return;
      const depth = emission ? core / cont - 1 : 1 - core / cont;
      const sigma = noise * Math.sqrt(1 / nc + 0.5) / Math.sqrt(cont);
      out.push({ id: ln.id, el: ln.el, l, depth, sigma, emission });
    };
    for (const ln of LINES) test(ln, z1, false);
    // TiO: light drops across a band head, blue side to red.
    if (this.target.galaxy === 'none') {
      for (const h of [615.9, 705.4]) {
        // Two blue windows give the continuum's slope; the red side should follow it.
        const [far] = mean(this.now, h - 14, h - 8);
        const [blue] = mean(this.now, h - 7, h - 1);
        const [red, nr] = mean(this.now, h + 0.5, h + 8);
        const expect = blue + ((blue - far) / 7) * 8.25;
        if (expect <= 0) continue;
        out.push({ id: 'TiO', el: 'TiO', l: h, depth: 1 - red / expect, sigma: noise * Math.sqrt(3 / nr) / Math.sqrt(expect), emission: false });
      }
    }
    for (const ln of TELLURIC) test(ln, 1, false);
    if (this.target.galaxy === 'spiral') for (const ln of EMISSION) test(ln, z1, true);
    return out;
  }

  // The colour temperature and its rough error, or null before any light.
  teff(): { T: number; err: number } | null {
    if (this.time <= 0) return null;
    const T = teffFromRatio(colourRatio(this.now));
    return { T, err: T * 1.5 / Math.max(1, this.snr) };
  }
}

// A line counts as found above three sigma and a floor depth.
export const isFound = (f: Found): boolean => f.depth > Math.max(3 * f.sigma, 0.03);

/* ---------- cosmology ---------- */
// Lookback time in Gyr and comoving distance in Mpc, for flat ΛCDM.
// H0 70, matter 0.3, dark energy 0.7.
export function cosmology(z: number): { lookback: number; distance: number } {
  const E = (x: number): number => Math.sqrt(0.3 * (1 + x) ** 3 + 0.7);
  const n = 200;
  let dc = 0, tl = 0;
  for (let i = 0; i < n; i++) {
    const x = ((i + 0.5) / n) * z;
    dc += 1 / E(x);
    tl += 1 / ((1 + x) * E(x));
  }
  return { distance: (dc * z / n) * (299792.458 / 70), lookback: (tl * z / n) * (977.8 / 70) };
}
