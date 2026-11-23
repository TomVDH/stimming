// Volcano terrain: one height function in metres.
// The mesh and the sim both read it, so bombs land on the drawn ground.

// The vent stands at the origin; the camera looks along -z from a far ridge.
export const CRATER_R = 64;
export const BASE_R = 1350;
const CONE_H = 760;

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

// The cone profile: concave flanks that steepen toward the rim.
function cone(r) {
  const s = Math.min(1, Math.max(r, CRATER_R) / BASE_R);
  return CONE_H * Math.pow(1 - s, 1.9);
}
export const RIM_H = cone(CRATER_R);

export function height(x, z) {
  const r = Math.hypot(x, z);
  const ang0 = Math.atan2(z, x);
  // The cone leans: one flank runs out longer, so the profile is not a perfect cone.
  const lean = 1 + 0.1 * Math.cos(ang0 - 3.0) + 0.05 * Math.cos(2 * ang0 + 0.4);
  let h = cone(CRATER_R + (r - CRATER_R) / lean);
  // A shoulder on the left flank: an old parasitic cone.
  const sx = x + 640, sz = z - 200;
  h += 90 * Math.exp(-(sx * sx + sz * sz) / (2 * 210 * 210));
  // The crater: a bowl inside the rim, and a sharp lip on it.
  if (r < CRATER_R) h -= 50 * (1 - (r / CRATER_R) ** 2);
  h += 5 * Math.exp(-(((r - CRATER_R) / 10) ** 2));
  // The rim is uneven: one side stands higher, one has a notch.
  const ang = Math.atan2(z, x);
  h += (7 * Math.sin(ang + 0.6) - 9 * Math.exp(-(((ang + 2.2) / 0.25) ** 2))) * Math.exp(-(((r - CRATER_R) / 40) ** 2));
  // Radial gullies: noise on the circle, so the angle has no seam.
  if (r < BASE_R * 1.1) {
    const a = Math.atan2(z, x), ca = Math.cos(a), sa = Math.sin(a);
    const g = 1 - Math.abs(fbm(ca * 3.2, sa * 3.2, r * 0.0042, 3)) * 2.2;
    const amp = 30 * smooth(CRATER_R + 6, 320, r) * Math.pow(Math.max(0, 1 - r / (BASE_R * 1.1)), 0.6);
    h += g * amp;
  }
  // Lumps on the cone and a soft plain.
  h += 4 * fbm(x * 0.012, z * 0.012, 3.1, 3) * smooth(CRATER_R, 200, r);
  // Broad swells break the cone's outline.
  h += 34 * fbm(x * 0.0026, z * 0.0026, 5.3, 3) * smooth(CRATER_R + 40, 500, r) * Math.max(0, 1 - r / (BASE_R * 1.2));
  h += 9 * fbm(x * 0.0011, z * 0.0011, 7.7, 3);
  // Far hills make the horizon.
  h += 260 * smooth(2600, 6200, r) * (0.55 + 0.45 * fbm(x * 0.0005, z * 0.0005, 1.3, 4));
  return h;
}

// The ground normal from central differences.
export function normalAt(x, z, e = 2) {
  const hx = height(x + e, z) - height(x - e, z);
  const hz = height(x, z + e) - height(x, z - e);
  const nx = -hx, ny = 2 * e, nz = -hz;
  const l = Math.hypot(nx, ny, nz);
  return [nx / l, ny / l, nz / l];
}
