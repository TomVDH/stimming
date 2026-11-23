// Dichroic glass: the folded screen, the coatings, the eye and the lamp.
// One unit is 10 cm. The table is the plane z = 0; z points up.

// The zigzag's four upright seams, left to right, seen from the front.
const SEAMS = [[-0.98, -0.12], [-0.34, 0.34], [0.36, -0.30], [0.98, 0.16]];
// Each leaf's height: the middle leaf stands tallest.
const HEIGHTS = [1.2, 1.5, 1.0];

/** The three leaves: a corner, a unit edge along the table, its length, the height, the unit normal, the centre. */
export const PANES = HEIGHTS.map((h, k) => {
  const [x0, y0] = SEAMS[k], [x1, y1] = SEAMS[k + 1];
  const len = Math.hypot(x1 - x0, y1 - y0);
  const u = [(x1 - x0) / len, (y1 - y0) / len, 0];
  return {
    o: [x0, y0, 0], u, v: [0, 0, 1], len, h,
    n: [u[1], -u[0], 0],
    c: [(x0 + x1) / 2, (y0 + y1) / 2, h / 2],
  };
});

/**
 * The coatings. lo and hi bound the reflected band in nm at normal incidence.
 * Each name holds at 40 to 55 degrees, the usual slant here.
 * inv 1 reflects outside the band. peak: the band's reflectance.
 * note: the root of each coating's three leaf tones, in semitones from A4.
 */
export const COATS = {
  gold: { lo: 570, hi: 692, inv: 0, peak: 0.9, note: -5 },
  magenta: { lo: 512, hi: 592, inv: 1, peak: 0.88, note: -9 },
  cyan: { lo: 482, hi: 574, inv: 0, peak: 0.88, note: -2 },
};
export const COAT_KEYS = ['gold', 'magenta', 'cyan'];

// The coating stack's mean index: it sets how fast the band moves blue.
export const NEFF = 1.75;

/** The band's centre in nm under light at cos c to the face. */
export function bandAt(coat, c) {
  const s = Math.sqrt(1 - (1 - c * c) / (NEFF * NEFF));
  const hi = Math.min(coat.hi, 720);
  return (coat.lo + hi) / 2 * s;
}

/* ---------- spectral samples ---------- */
// Twelve wavelengths, 25 nm apart, from 412.5 to 687.5 nm.
export const LAMBDA = Array.from({ length: 12 }, (_, i) => 412.5 + 25 * i);

// The CIE 1931 observer as a sum of skewed Gaussians (Wyman, Sloan, Shirley 2013).
const g = (x, m, s1, s2) => { const t = (x - m) / (x < m ? s1 : s2); return Math.exp(-0.5 * t * t); };
const cie = l => [
  1.056 * g(l, 599.8, 37.9, 31.0) + 0.362 * g(l, 442.0, 16.0, 26.7) - 0.065 * g(l, 501.1, 20.4, 26.2),
  0.821 * g(l, 568.8, 46.9, 40.5) + 0.286 * g(l, 530.9, 16.3, 31.1),
  1.217 * g(l, 437.0, 11.8, 36.0) + 0.681 * g(l, 459.0, 26.0, 13.8),
];

/** RGB weights per sample: three arrays of 12; a flat spectrum sums to white. */
export function rgbWeights() {
  const rows = [[], [], []];
  for (const l of LAMBDA) {
    const [X, Y, Z] = cie(l);
    const rgb = [
      3.2406 * X - 1.5372 * Y - 0.4986 * Z,
      -0.9689 * X + 1.8758 * Y + 0.0415 * Z,
      0.0557 * X - 0.2040 * Y + 1.0570 * Z,
    ];
    // A little luminance in each sample keeps pure spectral colours in gamut.
    const lum = 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
    for (let c = 0; c < 3; c++) rows[c].push(rgb[c] * 0.86 + lum * 0.14);
  }
  return rows.map(r => { const s = r.reduce((a, b) => a + b, 0); return r.map(v => v / s); });
}

/* ---------- eye and lamp ---------- */
// The eye looks at this point, from the front, 36 degrees down.
export const TARGET = [0, 0.3, 0.45];
export const PITCH = 36 * Math.PI / 180;
// The lamp aims at the glass's middle.
export const AIM = [0, 0, 0.55];
// The lamp's radius: a small frosted bulb, 1.5 cm.
export const LAMP_R = 0.15;
// The light map covers this part of the table.
export const MAP = { x0: -8, y0: -6, size: 18, res: 1280 };
