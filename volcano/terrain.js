// Volcano terrain: one height function in metres, at true scale.
// The mesh and the sim both read it, so bombs land on the drawn ground.
// Reference: East and Central Java (Semeru, Batok, the Tengger caldera, Sindoro and Sumbing).

// The active vent stands at the origin; the camera looks along -z.
export const CRATER_R = 150;
export const BASE_R = 5200;
const CONE_H = 2050;
// The eye stands in a village on the lowland, 8.5 km from the vent.
export const VILLAGE = [1700, 8300];
export const EYE = [VILLAGE[0], 0, VILLAGE[1]];

// Value noise on a hashed lattice; smooth and seeded, no library.
function hash3(x, y, z) {
  let h = (x * 374761393 + y * 668265263 + z * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}
const fade = t => t * t * (3 - 2 * t);
export function noise3(x, y, z) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const xf = fade(x - xi), yf = fade(y - yi), zf = fade(z - zi);
  const l = (a, b, t) => a + (b - a) * t;
  const c = (i, j, k) => hash3(xi + i, yi + j, zi + k);
  return l(
    l(l(c(0, 0, 0), c(1, 0, 0), xf), l(c(0, 1, 0), c(1, 1, 0), xf), yf),
    l(l(c(0, 0, 1), c(1, 0, 1), xf), l(c(0, 1, 1), c(1, 1, 1), xf), yf),
    zf) * 2 - 1;
}
function fbm(x, y, z, oct = 4) {
  let s = 0, a = 0.5, f = 1;
  for (let i = 0; i < oct; i++) { s += a * noise3(x * f, y * f, z * f); f *= 2.03; a *= 0.5; }
  return s;
}
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// A stratovolcano: concave flanks that steepen to the rim, fluted by radial ribs.
// cx, cz: centre; H: relief; R: base radius; cr: crater radius; ribs: count round it; seed.
function strato(x, z, cx, cz, H, R, cr, ribs, seed) {
  const dx = x - cx, dz = z - cz, r = Math.hypot(dx, dz);
  if (r > R * 1.15) return 0;
  const a = Math.atan2(dz, dx), ca = Math.cos(a), sa = Math.sin(a);
  // The base is not round: one flank runs out longer.
  const lean = 1 + 0.12 * fbm(ca * 1.3 + seed, sa * 1.3, seed, 2);
  const s = Math.min(1, Math.max(r - cr, 0) / (R * lean - cr));
  let h = H * Math.pow(1 - s, 1.85);
  // The crater: a bowl inside a sharp, uneven rim.
  if (r < cr) h = H - 0.45 * cr * (1 - (r / cr) ** 2) * 0.6;
  h += 0.12 * cr * Math.exp(-(((r - cr) / (0.25 * cr)) ** 2)) * (0.6 + 0.8 * Math.abs(fbm(ca * 3, sa * 3, seed + 2, 2)));
  // Ribs: sharp crests between gullies, deepest on the mid slopes, as on Batok.
  const w = a * ribs + 2.2 * fbm(ca * 2 + seed, sa * 2, r * 0.0006, 3);
  const rib = 1 - Math.abs(Math.sin(w * 0.5)) * 2;
  const band = smooth(cr * 1.2, R * 0.18, r) * smooth(R * 1.05, R * 0.45, r);
  h += rib * band * H * 0.035 * (0.6 + 0.5 * fbm(ca * 4, sa * 4, seed + 5, 2));
  // Lumps and lava-flow lobes on the lower flanks.
  h += H * 0.02 * fbm(dx * 0.0012, dz * 0.0012, seed + 9, 3) * smooth(cr, R * 0.3, r);
  return h * smooth(R * 1.15, R * 0.9, r);
}

// A caldera wall: a ring ridge, steep inside, gentle outside.
function caldera(x, z, cx, cz, R, H) {
  const r = Math.hypot(x - cx, z - cz);
  const a = Math.atan2(z - cz, x - cx);
  const d = r - R * (1 + 0.06 * Math.sin(a * 3 + 1));
  const inner = Math.exp(-((Math.min(d, 0) / 260) ** 2));
  const outer = Math.exp(-((Math.max(d, 0) / 2200) ** 1.4));
  const crest = H * (0.8 + 0.25 * fbm(Math.cos(a) * 3, Math.sin(a) * 3, 4.4, 3));
  return crest * (d < 0 ? inner : outer);
}

// Far volcanoes and ridges, 20 to 35 km out, for the range behind.
const FAR = [
  [-8200, -7000, 2350, 6600, 180, 44, 3.1],
  [-23000, -26000, 2600, 9000, 220, 36, 7.3],
  [15000, -31000, 2900, 10000, 260, 40, 11.2],
  [-3000, -36000, 2100, 9000, 200, 30, 13.8],
  [5200, 2700, 330, 900, 90, 30, 17.5],
];

export function height(x, z) {
  // The lowland: a soft plain at sea-cloud level.
  let h = 60 * fbm(x * 0.00025, z * 0.00025, 1.7, 4) + 25 * fbm(x * 0.002, z * 0.002, 2.9, 2);
  h += strato(x, z, 0, 0, CONE_H, BASE_R, CRATER_R, 52, 0.5);
  // The breach: Semeru's avalanche gully runs down the right flank.
  {
    const a = Math.atan2(z, x), r = Math.hypot(x, z);
    const da = Math.atan2(Math.sin(a - 0.35), Math.cos(a - 0.35));
    h -= 120 * Math.exp(-((da / 0.06) ** 2)) * smooth(CRATER_R * 0.8, 600, r) * smooth(4200, 1500, r);
  }
  for (const f of FAR) h += strato(x, z, f[0], f[1], f[2], f[3], f[4], f[5], f[6]);
  h += caldera(x, z, 6400, 1800, 3600, 720);
  // The village stands on a flat terrace; the fields round it are level.
  const vx = x - VILLAGE[0], vz = z - VILLAGE[1];
  const flat = smooth(900, 300, Math.hypot(vx, vz));
  h = h * (1 - flat) + 40 * flat;
  return h;
}
export const RIM_H = height(CRATER_R, 0);
// The eye: a person on a rise at the village's edge.
EYE[1] = height(EYE[0], EYE[2]) + 14;

// The ground normal from central differences.
export function normalAt(x, z, e = 4) {
  const hx = height(x + e, z) - height(x - e, z);
  const hz = height(x, z + e) - height(x, z - e);
  const nx = -hx, ny = 2 * e, nz = -hz;
  const l = Math.hypot(nx, ny, nz);
  return [nx / l, ny / l, nz / l];
}
