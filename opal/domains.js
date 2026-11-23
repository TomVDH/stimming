// Opal domains: the cells of ordered silica spheres in the colour layers.
// The shader reads them from a data texture; the sound reads the same cells.
// Each cell flashes one spectral colour when the light meets its lattice.

// The stone: an oval cabochon, semi-axes in tray units. The dome sits on z = 0.
export const AX = [1.0, 0.72, 0.4];
// Precious opal's refractive index.
export const N_OPAL = 1.45;
// The colour layers, top down: height in the stone and cell size.
export const LAYERS = [
  { z: 0.29, s: 0.2 },
  { z: 0.215, s: 0.155 },
  { z: 0.145, s: 0.13 },
  { z: 0.075, s: 0.185 },
];
// Cells on a side of one layer's grid. The grid centres on the stone.
export const GRID = 16;
// The soft box's spread, seen inside the stone, in radians.
export const BOX_SIGMA = 0.045;

function mulberry(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Builds two RGBA float textures, GRID wide and GRID * layers tall.
// A: jitter x, jitter y, lattice normal x, normal y.
// B: base wavelength in nm, lobe width, gain, roll phase.
export function makeDomains(seed = 23) {
  const r = mulberry(seed);
  const gauss = () => Math.sqrt(-2 * Math.log(1 - r())) * Math.cos(6.2832 * r());
  const n = GRID * GRID * LAYERS.length;
  const a = new Float32Array(n * 4), b = new Float32Array(n * 4);
  const cells = [];
  LAYERS.forEach((L, k) => {
    for (let j = 0; j < GRID; j++) for (let i = 0; i < GRID; i++) {
      const idx = (k * GRID + j) * GRID + i;
      const jx = 0.12 + 0.76 * r(), jy = 0.12 + 0.76 * r();
      // Lattices stack near the seam's axis; a few lean far.
      const th = 0.1 + Math.abs(gauss()) * 0.19 + (r() < 0.12 ? 0.12 * r() : 0);
      const ph = r() * 6.2832;
      const nx = Math.sin(th) * Math.cos(ph), ny = Math.sin(th) * Math.sin(ph);
      // Black opal: red and green lead, blue and violet fill.
      const u = r();
      const l0 = u < 0.34 ? 655 + 75 * r() : u < 0.74 ? 528 + 42 * r() : 462 + 40 * r();
      const sig = 0.012 + 0.03 * r();
      // Some cells are dead: potch with no order.
      const g = r() < 0.16 ? 0.08 : 0.55 + 0.7 * r();
      a.set([jx, jy, nx, ny], idx * 4);
      b.set([l0, sig, g, r() * 40], idx * 4);
      const x = (i + jx - GRID / 2) * L.s, y = (j + jy - GRID / 2) * L.s;
      if ((x / AX[0]) ** 2 + (y / AX[1]) ** 2 < 1 - (L.z / AX[2]) ** 2) {
        cells.push({ k, x, y, z: L.z, n: [nx, ny, Math.sqrt(1 - nx * nx - ny * ny)], l0, sig, g, area: L.s * L.s, lobe: 0, armed: true });
      }
    }
  });
  return { a, b, cells };
}

const dot = (p, q) => p[0] * q[0] + p[1] * q[1] + p[2] * q[2];
const norm = p => { const l = Math.hypot(p[0], p[1], p[2]) || 1; return [p[0] / l, p[1] / l, p[2] / l]; };
// GLSL refract: i and n are unit vectors, eta the index ratio.
function refract(i, n, eta) {
  const c = dot(n, i), k = 1 - eta * eta * (1 - c * c);
  if (k < 0) return [0, 0, 0];
  const f = eta * c + Math.sqrt(k);
  return [eta * i[0] - f * n[0], eta * i[1] - f * n[1], eta * i[2] - f * n[2]];
}

// The flash of each cell at its centre, as the shader sees it.
// cam and light are in the tray's frame: the eye's place, the light's direction.
// It returns the cells whose flash rose past the mark since the last call.
export function flares(cells, cam, light) {
  const out = [];
  for (const c of cells) {
    const zz = 1 - (c.x / AX[0]) ** 2 - (c.y / AX[1]) ** 2;
    const P = [c.x, c.y, AX[2] * Math.sqrt(Math.max(zz, 0))];
    const N = norm([P[0] / AX[0] ** 2, P[1] / AX[1] ** 2, P[2] / AX[2] ** 2]);
    const rd = norm([P[0] - cam[0], P[1] - cam[1], P[2] - cam[2]]);
    const din = refract(rd, N, 1 / N_OPAL);
    const lin = refract([-light[0], -light[1], -light[2]], N, 1 / N_OPAL);
    const h = norm([-din[0] - lin[0], -din[1] - lin[1], -din[2] - lin[2]]);
    const se = c.sig * c.sig + BOX_SIGMA * BOX_SIGMA;
    const lobe = Math.exp(-(1 - dot(h, c.n)) / se) * c.g;
    const lam = c.l0 * Math.abs(dot(lin, c.n));
    if (c.armed && lobe > 0.55 && lam > 410 && lam < 700) { c.armed = false; out.push({ c, lobe, lam }); }
    else if (lobe < 0.2) c.armed = true;
    c.lobe = lobe;
  }
  return out;
}
