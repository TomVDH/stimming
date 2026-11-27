// Thin-film interference for a brightfield metallurgical microscope.
// A transfer matrix gives the reflectance of each oxide stack at 31 wavelengths.
// The spectrum then runs through a 3200 K halogen lamp and the CIE curves to linear sRGB.
export const LUT_W = 512;
export const LUT_MAX = 2000;
export const ROWS = 4;

const cmul = (a, b) => [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]];
const cadd = (a, b) => [a[0] + b[0], a[1] + b[1]];
const cdiv = (a, b) => { const m = b[0] * b[0] + b[1] * b[1]; return [(a[0] * b[0] + a[1] * b[1]) / m, (a[1] * b[0] - a[0] * b[1]) / m]; };
const csub = (a, b) => [a[0] - b[0], a[1] - b[1]];

// Reflectance at normal incidence of film layers (air side first) over a substrate index.
function reflect(layers, sub, lam) {
  let B = [1, 0], C = sub;
  for (let i = layers.length - 1; i >= 0; i--) {
    const { n, d } = layers[i], dl = 2 * Math.PI * n * d / lam, c = Math.cos(dl), s = Math.sin(dl);
    // M = [[c, i s / n], [i n s, c]] applied to [B, C].
    const nB = cadd([c * B[0], c * B[1]], cmul([0, s / n], C));
    const nC = cadd(cmul([0, n * s], B), [c * C[0], c * C[1]]);
    B = nB; C = nC;
  }
  const r = cdiv(csub(B, C), cadd(B, C));
  return r[0] * r[0] + r[1] * r[1];
}
const g = (l, mu, s1, s2) => { const t = (l - mu) / (l < mu ? s1 : s2); return Math.exp(-0.5 * t * t); };
const xyz = l => [
  1.056 * g(l, 599.8, 37.9, 31.0) + 0.362 * g(l, 442.0, 16.0, 26.7) - 0.065 * g(l, 501.1, 20.4, 26.2),
  0.821 * g(l, 568.8, 46.9, 40.5) + 0.286 * g(l, 530.9, 16.3, 31.1),
  1.217 * g(l, 437.0, 11.8, 36.0) + 0.681 * g(l, 459.0, 26.0, 13.8),
];
const planck = (l, T) => { const x = l * 1e-9; return 1 / (x ** 5 * (Math.exp(1.4388e-2 / (x * T)) - 1)); };
const lin = ([X, Y, Z]) => [3.2406 * X - 1.5372 * Y - 0.4986 * Z, -0.9689 * X + 1.8758 * Y + 0.0415 * Z, 0.0557 * X - 0.2040 * Y + 1.0570 * Z];

const LAMS = Array.from({ length: 31 }, (_, i) => 400 + i * 10);
const siN = l => [4.0 - (l - 500) * 0.0007, 0.04];
const AL = [1.0, 6.5];
// The lamp is warm; the camera white balance removes about 85 percent of that.
let WB = null;
function toRgb(spec) {
  let X = 0, Y = 0, Z = 0;
  LAMS.forEach((l, i) => { const w = planck(l, 3200), c = xyz(l); X += spec[i] * w * c[0]; Y += spec[i] * w * c[1]; Z += spec[i] * w * c[2]; });
  return [X, Y, Z];
}
function white() {
  if (WB) return WB;
  const one = LAMS.map(() => 1), xyzW = toRgb(one);
  const k = 1 / xyzW[1], rgb = lin(xyzW.map(v => v * k));
  WB = rgb.map(v => 1 / Math.pow(Math.max(v, 1e-3), 0.85));
  const lum = 0.2126 * rgb[0] * WB[0] + 0.7152 * rgb[1] * WB[1] + 0.0722 * rgb[2] * WB[2];
  WB = WB.map(v => v / lum);
  WB.k = k;
  return WB;
}

// Linear sRGB reflectance colour of a stack: row 0 oxide on silicon, 1 nitride over oxide on silicon,
// 2 oxide on aluminium, 3 bare silicon. d is the oxide thickness in nm.
export function filmColour(row, d) {
  const wb = white();
  const spec = LAMS.map(l => {
    const sub = row === 2 ? AL : siN(l);
    const layers = row === 0 ? [{ n: 1.46, d }] : row === 1 ? [{ n: 2.0, d: 550 }, { n: 1.46, d }] : row === 2 ? [{ n: 1.46, d }] : [{ n: 1.46, d: 3 }];
    return reflect(layers, sub, l);
  });
  const rgb = lin(toRgb(spec).map(v => v * wb.k));
  return rgb.map((v, i) => Math.max(0, v * wb[i]));
}

export function buildLut() {
  const data = new Float32Array(LUT_W * ROWS * 4);
  for (let r = 0; r < ROWS; r++) {
    for (let x = 0; x < LUT_W; x++) {
      const c = filmColour(r, x / (LUT_W - 1) * LUT_MAX), o = (r * LUT_W + x) * 4;
      data[o] = c[0]; data[o + 1] = c[1]; data[o + 2] = c[2]; data[o + 3] = 1;
    }
  }
  return data;
}
