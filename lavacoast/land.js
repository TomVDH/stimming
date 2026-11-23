// Lava coast land: one height function for the sim, the meshes and the sea.
// World: metres; x right, y up, z ahead. The eye floats at (0, CAMH, 0).

export const CAMH = 35;
// The flank vent, and the lava tube's mouth in the sea cliff.
export const VENT = [-120, 1300];
export const TUBE_X = 110;
// The sim's grid over the slope, and the backdrop's grid over the island.
export const GRID = { x0: -620, z0: 360, size: 1040, n: 160 };
export const NEAR = { x0: -620, z0: 360, size: 1040, n: 320 };
export const FAR = { x0: -4500, z0: 150, size: 9000, n: 384 };

const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// A lattice hash: the same numbers on every machine.
function hash(ix, iz) {
  let h = (Math.imul(ix | 0, 374761393) + Math.imul(iz | 0, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function vnoise(x, z) {
  const ix = Math.floor(x), iz = Math.floor(z);
  let fx = x - ix, fz = z - iz;
  fx = fx * fx * (3 - 2 * fx); fz = fz * fz * (3 - 2 * fz);
  const a = hash(ix, iz), b = hash(ix + 1, iz), c = hash(ix, iz + 1), d = hash(ix + 1, iz + 1);
  return a + (b - a) * fx + (c - a) * fz + (a - b - c + d) * fx * fz;
}
function fbm(x, z, oct = 4) {
  let s = 0, a = 0.5, n = 0;
  for (let i = 0; i < oct; i++) { s += a * vnoise(x, z); n += a; x = x * 2.03 + 17.1; z = z * 2.03 + 5.3; a *= 0.5; }
  return s / n;
}

// Mounds: x, z, height, radius. Long along the slope, as old flows leave them.
const MOUNDS = [[-48, 1120, 5, 20], [-30, 980, 6, 24], [-70, 900, 5, 20], [-40, 790, 7, 26], [-80, 700, 5, 22], [-20, 650, 6, 20]];
for (let i = 0; i < 22; i++) {
  const z = 560 + 660 * hash(i, 91), spread = 120 + 0.25 * (1300 - z);
  MOUNDS.push([-110 + (hash(i, 37) * 2 - 1) * spread, z, 7 + 9 * hash(i, 53), 18 + 18 * hash(i, 71)]);
}

// The shore line: a headland in the middle, land falling back on both sides.
export function coastZ(x) {
  let z = 470 + 50 * Math.sin(x / 190 + 0.7) + 22 * Math.sin(x / 71 + 2.1) + 34 * (fbm(x / 260, 3.7, 3) - 0.5);
  if (x < -600) z += 0.0004 * (x + 600) * (x + 600);
  if (x > 800) z += 0.00012 * (x - 800) * (x - 800);
  return z;
}

// Ground height at (x, z). Sea level is 0.
export function height(x, z) {
  const s = z - coastZ(x);
  if (s < 0) return Math.max(-60, -1.2 + 0.14 * s - 3 * fbm(x / 90, z / 90, 2));
  // A low sea cliff, then a concave shield slope.
  let b = 9 * smooth(0, 22, s) + 230 * (1 - Math.exp(-s / 750));
  // Gullies and ridges run down the slope; they split the lava into braids.
  const inland = smooth(30, 140, s);
  b += inland * (12 * (fbm(x / 80, z / 320, 3) - 0.5) + 9 * (fbm(x / 34, z / 70, 3) - 0.5) + 2.5 * (fbm(x / 11, z / 16, 2) - 0.5));
  b += 0.7 * (fbm(x / 6, z / 6, 2) - 0.5);
  // Old tumuli and ridges on the slope: the lava parts round them into braids.
  for (const [mx, mz, mh, mr] of MOUNDS) {
    const ax = x - mx, az = z - mz;
    b += mh * (0.7 + 0.6 * fbm(x / 12, z / 12, 2)) * Math.exp(-(ax * ax / (mr * mr * 0.5) + az * az / (mr * mr * 3)));
  }
  // The summit shield to the right.
  const dx = x - 1600, dz = z - 3800;
  b += 420 * Math.exp(-(dx * dx + dz * dz) / (1700 * 1700));
  // The vent: a spatter cone with a crater.
  const vx = x - VENT[0], vz = z - VENT[1], d2 = vx * vx + vz * vz;
  b += 24 * Math.exp(-d2 / (60 * 60)) - 11 * Math.exp(-d2 / (16 * 16));
  return b;
}

// Heights on a grid, row by row from z0: n by n samples at the cell centres.
export function heights(g) {
  const out = new Float32Array(g.n * g.n), cs = g.size / g.n;
  for (let j = 0; j < g.n; j++) for (let i = 0; i < g.n; i++) out[j * g.n + i] = height(g.x0 + (i + 0.5) * cs, g.z0 + (j + 0.5) * cs);
  return out;
}
