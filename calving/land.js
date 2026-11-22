// Calving land: the fjord, its walls, the glacier and the ice face, as height functions.
// World units are metres. Water lies at y = 0; the camera floats near the origin; -z is up the fjord.
import { createNoise2D } from 'simplex-noise';

// A seeded random source, so the fjord is the same on each load.
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const n2 = createNoise2D(rng(57));
const m2 = createNoise2D(rng(91));
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

/* ---------- the face line ---------- */
// The face runs across the fjord head, far on the left and nearer on the right.
export const FACE_X0 = -230, FACE_X1 = 1250, FACE_DX = 1.25;
export function faceZ(x) { return -760 + 0.26 * x + 26 * Math.sin(x / 240 + 0.6) + 9 * n2(x / 90, 3.1); }
// The horizontal normal of the face line, toward the water.
export function faceN(x) {
  const dz = (faceZ(x + 1) - faceZ(x - 1)) / 2;
  const l = Math.hypot(1, dz);
  return [-dz / l, 1 / l];
}

/* ---------- seracs ---------- */
// Columns stand side by side; their borders are the grooves that cracks follow.
const R = rng(5701);
export const CELLS = [];
{
  let x = FACE_X0 - 10;
  while (x < FACE_X1 + 10) {
    const w = 6 + 22 * Math.pow(R(), 1.5);
    // A few columns stand proud; a few sit back in old scars.
    const off = (R() - 0.5) * 8 + (R() < 0.15 ? -4 - 5 * R() : 0);
    // Each column steps back once or twice on its way up.
    const steps = [];
    for (let k = 0, y = 12 + 30 * R(); k < 2 && y < 62; k++, y += 18 + 25 * R()) steps.push([y, -0.6 - 2 * R()]);
    // The top is a broken line through a few knots.
    const knots = Array.from({ length: 3 + ((R() * 3) | 0) }, () => (R() - 0.5) * 12);
    CELLS.push({ x0: x, x1: x + w, off, top: (R() - 0.5) * 12, knots, steps, tilt: -0.02 - 0.06 * R(), groove: 1 + 3.5 * R(), blue: R() });
    x += w;
  }
}
export function cellAt(x) {
  let lo = 0, hi = CELLS.length - 1;
  while (lo < hi) { const m = (lo + hi + 1) >> 1; if (CELLS[m].x0 <= x) lo = m; else hi = m - 1; }
  return lo;
}
// The top line before the seracs: lower toward the left wall.
export function baseTop(x) { return 66 + 7 * n2(x / 160, 7.7) - 30 * smooth(-60, -230, x); }
// The top of the face at x: a broken line on each column.
export function faceTop(x) {
  const c = CELLS[cellAt(x)], t = (x - c.x0) / (c.x1 - c.x0);
  const k = c.knots, f = t * (k.length - 1), i = Math.min(k.length - 2, Math.floor(f));
  const peak = k[i] + (k[i + 1] - k[i]) * (f - i);
  // Column edges break down into the grooves.
  const edge = Math.min(t, 1 - t) * (c.x1 - c.x0);
  return baseTop(x) + c.top + peak - 7 * Math.exp(-edge / 1.6) + 1.2 * n2(x / 2.3, 1.3);
}
// How far a face point stands out from the line, in metres, toward the water.
export function faceDepth(x, y) {
  const c = CELLS[cellAt(x)], t = (x - c.x0) / (c.x1 - c.x0);
  const w = c.x1 - c.x0;
  let d = c.off + c.tilt * y;
  // Ledges: the column steps back as it rises.
  for (const [sy, so] of c.steps) d += so * smooth(sy - 2.5, sy + 2.5, y + 3 * n2(x / 5, sy));
  // Its borders sink in as deep grooves.
  const e = Math.min(t, 1 - t) * w;
  d -= c.groove * Math.exp(-e * e / 1.8);
  // Fractures: sharp creases, mostly upright.
  d += 1.1 * (Math.abs(n2(x / 7, y / 22)) - 0.4) + 0.5 * (Math.abs(n2(x / 2.6, y / 7)) - 0.4);
  // The sea cuts a notch at the waterline.
  d -= 2.4 * Math.exp(-((y - 1.2) ** 2) / 3);
  return d;
}

/* ---------- the land ---------- */
// The fjord walls, as x at a given z.
// The left wall juts out as a headland, then turns away toward the camera.
const softplus = x => (x > 20 ? x : Math.log1p(Math.exp(x)));
export const wallL = z => -185 + 0.2 * (z + 800) - 84 * softplus((z + 470) / 60) + 25 * n2(z / 300, 11);
export const wallR = z => 1230 + 0.12 * (z + 760) + 60 * n2(z / 500, 13);
function ridged(x, z, f) { return 1 - Math.abs(n2(x * f, z * f)); }
// Rock above the walls: steep at the water, peaks behind.
function rock(e, x, z) {
  if (e > 0) return -1.6 * e;
  const d = -e;
  let h = 980 * (1 - Math.exp(-d / 420));
  h += 260 * ridged(x, z, 1 / 900) * smooth(0, 600, d);
  h += 120 * n2(x / 260, z / 260) * smooth(0, 300, d);
  h += 40 * n2(x / 70, z / 70);
  // Gullies and buttresses run down the steep walls.
  h += 55 * (Math.abs(n2(x / 160 + z / 900, z / 160)) - 0.35) * smooth(0, 150, d);
  return h;
}
// The glacier surface, rising up the valley behind the face.
function glacier(x, b) {
  const base = baseTop(x) - 4;
  return base + 0.025 * b + 4e-6 * Math.min(b, 9000) ** 2 + 30 * m2(x / 700, b / 900) * smooth(200, 2000, b) + 3 * n2(x / 40, b / 40);
}
// The far range closes the valley on the skyline.
function range(x, z) {
  const d = -z - 5000;
  if (d < -2000) return -1e3;
  const r1 = ridged(x, z, 1 / 1500), r2 = ridged(x + 300, z, 1 / 520), r3 = ridged(x, z + 77, 1 / 190);
  return 120 + smooth(-2000, 3000, d) * (720 * Math.pow(r1, 1.6) + 170 * r2 * r2 + 22 * r3) + 120 * n2(x / 500, z / 500);
}
/** The land height and its kind: 0 rock, 1 glacier. */
export function land(x, z) {
  const e = Math.min(x - wallL(z), wallR(z) - x);
  const r = Math.max(rock(e, x, z), range(x, z));
  const b = faceZ(x) - z;
  // The glacier starts behind the face top strip, out of sight from the water.
  if (e > -40 && b > 150) {
    const g = glacier(x, b);
    if (g > r) return { h: g, kind: 1 };
  }
  if (e > 0 && b <= 150) return { h: Math.max(r, -40), kind: 0 };
  return { h: r, kind: 0 };
}

/* ---------- the face surface ---------- */
// Row heights of the face, bottom to top, as fractions; then the strip over the top.
export const FACE_ROWS = 72;
export const TOP_BACK = [0.6, 1.6, 3.2, 5.5, 9, 14, 21, 32, 50, 80, 130, 190];
// The glacier surface just behind the top edge.
export function topStrip(x, b, top) {
  const s = glacier(x, b + 150) - 0.025 * 150 - 8;
  const k = smooth(0, 18, b);
  return top * (1 - k) + Math.min(top, s + 5 * n2(x / 11, b / 9)) * k - 3 * smooth(0, 3, b) * (1 - k);
}
