// Window seat cloud noise: one tiling 3D texture, baked once in JS.
// R: value noise mixed with Worley, for the base cloud shape.
// G, B, A: inverted Worley at three rising frequencies, for erosion.

// An integer hash of a lattice point and a seed, to [0, 1).
function ih(x, y, z, s) {
  let n = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(z, 1274126177) + Math.imul(s, 1442695041)) | 0;
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  n ^= n >>> 16;
  return (n >>> 0) / 4294967296;
}
const wrap = (i, p) => ((i % p) + p) % p;
const fade = t => t * t * (3 - 2 * t);

// Value noise that tiles with period F lattice cells over the unit cube.
function vnoise(x, y, z, F, s) {
  x *= F; y *= F; z *= F;
  const x0 = Math.floor(x), y0 = Math.floor(y), z0 = Math.floor(z);
  const fx = fade(x - x0), fy = fade(y - y0), fz = fade(z - z0);
  const xa = wrap(x0, F), xb = wrap(x0 + 1, F), ya = wrap(y0, F), yb = wrap(y0 + 1, F), za = wrap(z0, F), zb = wrap(z0 + 1, F);
  const l = (a, b, t) => a + (b - a) * t;
  return l(
    l(l(ih(xa, ya, za, s), ih(xb, ya, za, s), fx), l(ih(xa, yb, za, s), ih(xb, yb, za, s), fx), fy),
    l(l(ih(xa, ya, zb, s), ih(xb, ya, zb, s), fx), l(ih(xa, yb, zb, s), ih(xb, yb, zb, s), fx), fy), fz);
}

// Inverted Worley noise that tiles with C cells per side; 1 at a feature point.
function worley(x, y, z, C, s) {
  x *= C; y *= C; z *= C;
  const cx = Math.floor(x), cy = Math.floor(y), cz = Math.floor(z);
  let best = 9;
  for (let k = -1; k <= 1; k++) for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
    const gx = cx + i, gy = cy + j, gz = cz + k;
    const wx = wrap(gx, C), wy = wrap(gy, C), wz = wrap(gz, C);
    const px = gx + ih(wx, wy, wz, s), py = gy + ih(wx, wy, wz, s + 7), pz = gz + ih(wx, wy, wz, s + 13);
    const d = (px - x) ** 2 + (py - y) ** 2 + (pz - z) ** 2;
    if (d < best) best = d;
  }
  return 1 - Math.min(1, Math.sqrt(best));
}

// Bakes an N^3 RGBA8 volume; about 0.3 s at N = 64.
export function bakeNoise(N = 64) {
  const out = new Uint8Array(N * N * N * 4);
  let o = 0;
  for (let z = 0; z < N; z++) for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const u = x / N, v = y / N, w = z / N;
    const fb = vnoise(u, v, w, 4, 1) * 0.5 + vnoise(u, v, w, 8, 2) * 0.25 + vnoise(u, v, w, 16, 3) * 0.15 + vnoise(u, v, w, 32, 4) * 0.1;
    const w4 = worley(u, v, w, 4, 5), w8 = worley(u, v, w, 8, 6), w16 = worley(u, v, w, 16, 7);
    // The base shape: billowy Worley lumps, broken up by the value noise.
    const pw = Math.min(1, Math.max(0, (fb - 0.5) * 1.3 + 0.5) * 0.55 + (w4 * 0.625 + w8 * 0.25 + w16 * 0.125) * 0.45);
    out[o++] = Math.round(pw * 255);
    out[o++] = Math.round(w4 * 255);
    out[o++] = Math.round(w8 * 255);
    out[o++] = Math.round(w16 * 255);
  }
  return out;
}
