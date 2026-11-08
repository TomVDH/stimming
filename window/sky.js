// Window seat sky: single scatter, seen from cruise height.
// Rayleigh, Mie and ozone; the Earth casts its shadow into the air.
// The bake runs in JS, once per light change, into two float tables.
// L holds the light scattered toward the eye along each view ray.
// T holds the transmittance along that ray, to the ground or to space.

const R = 6371, RT = 6471;
// Table size: azimuth from the light, then elevation.
export const NU = 96, NV = 80;
const BR = [5.802e-3, 13.558e-3, 33.1e-3];
const BMS = 3.996e-3, BME = 4.44e-3;
const BO = [0.65e-3, 1.881e-3, 0.085e-3];
const G = 0.76;
const HALF_PI = Math.PI / 2;

// The eye's horizon lies below level by this angle, in radians.
export const horizonEl = h => -Math.acos(R / (R + h));

// Row coordinate v to elevation; rows crowd near the eye's horizon.
function vToEl(v, hor) {
  if (v >= 0.5) { const x = ((v - 0.5) * 2) ** 2; return hor + x * (HALF_PI - hor); }
  const x = ((0.5 - v) * 2) ** 2;
  return hor - x * (HALF_PI + hor);
}
// Elevation to row coordinate; the shader uses the same map.
function elToV(el, hor) {
  return el >= hor ? 0.5 + 0.5 * Math.sqrt((el - hor) / (HALF_PI - hor)) : 0.5 - 0.5 * Math.sqrt((hor - el) / (HALF_PI + hor));
}

const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// Optical depth from a point toward the light, out to the top.
// The result is null when the Earth hides the light.
function lightDepth(px, py, pz, lx, ly, lz, out) {
  const r2 = px * px + py * py + pz * pz, r = Math.sqrt(r2);
  const b = px * lx + py * ly + pz * lz;
  // The light ray's lowest point decides the Earth's shadow.
  const rmin = b < 0 ? Math.sqrt(Math.max(0, r2 - b * b)) : r;
  const vis = smooth(-2, 2, rmin - R);
  if (vis <= 0) return 0;
  const tTop = -b + Math.sqrt(Math.max(0, b * b - (r2 - RT * RT)));
  const n = 8, ds = tTop / n;
  let dR = 0, dM = 0, dO = 0;
  for (let i = 0; i < n; i++) {
    const s = (i + 0.5) * ds;
    const qx = px + lx * s, qy = py + ly * s, qz = pz + lz * s;
    const h = Math.sqrt(qx * qx + qy * qy + qz * qz) - R;
    if (h < 0) continue;
    dR += Math.exp(-h / 8) * ds;
    dM += Math.exp(-h / 1.2) * ds;
    dO += Math.max(0, 1 - Math.abs(h - 25) / 15) * ds;
  }
  out[0] = dR; out[1] = dM; out[2] = dO;
  return vis;
}

// Bakes the sky for an eye at height h0 km and a light at elevation lightEl.
// The light sits at azimuth zero; E scales its strength.
export function bake(h0, lightEl, E) {
  const hor = horizonEl(h0);
  const L = new Float32Array(NU * NV * 4), T = new Float32Array(NU * NV * 4);
  const lx = Math.cos(lightEl), ly = Math.sin(lightEl), lz = 0;
  const oy = R + h0, dep = [0, 0, 0];
  const N = 32;
  for (let j = 0; j < NV; j++) {
    const el = vToEl((j + 0.5) / NV, hor), ce = Math.cos(el), dy = Math.sin(el);
    for (let i = 0; i < NU; i++) {
      const ph = (i + 0.5) / NU * Math.PI;
      const dx = ce * Math.cos(ph), dz = ce * Math.sin(ph);
      // Phase functions for this view against the light.
      const mu = dx * lx + dy * ly;
      const pR = 3 / (16 * Math.PI) * (1 + mu * mu);
      const pM = 3 / (8 * Math.PI) * ((1 - G * G) * (1 + mu * mu)) / ((2 + G * G) * Math.pow(1 + G * G - 2 * G * mu, 1.5));
      // The ray ends on the ground or at the top of the air.
      const b = oy * dy, c = oy * oy - R * R, disc = b * b - c;
      const tG = disc > 0 && b < 0 ? -b - Math.sqrt(disc) : -1;
      const tEnd = tG > 0 ? tG : -b + Math.sqrt(b * b - (oy * oy - RT * RT));
      const ds = tEnd / N;
      let tr = 0, tg = 0, tb = 0, sr = 0, sg = 0, sb = 0;
      for (let k = 0; k < N; k++) {
        const s = (k + 0.5) * ds;
        const px = dx * s, py = oy + dy * s, pz = dz * s;
        const h = Math.max(0, Math.sqrt(px * px + py * py + pz * pz) - R);
        const rR = Math.exp(-h / 8), rM = Math.exp(-h / 1.2), rO = Math.max(0, 1 - Math.abs(h - 25) / 15);
        const er = BR[0] * rR + BME * rM + BO[0] * rO;
        const eg = BR[1] * rR + BME * rM + BO[1] * rO;
        const eb = BR[2] * rR + BME * rM + BO[2] * rO;
        // Transmittance to the sample's midpoint.
        const vr = Math.exp(-(tr + er * ds * 0.5)), vg = Math.exp(-(tg + eg * ds * 0.5)), vb = Math.exp(-(tb + eb * ds * 0.5));
        const vis = lightDepth(px, py, pz, lx, ly, lz, dep);
        if (vis > 0) {
          const kr = Math.exp(-(BR[0] * dep[0] + BME * dep[1] + BO[0] * dep[2]));
          const kg = Math.exp(-(BR[1] * dep[0] + BME * dep[1] + BO[1] * dep[2]));
          const kb = Math.exp(-(BR[2] * dep[0] + BME * dep[1] + BO[2] * dep[2]));
          const m = BMS * rM * pM;
          sr += vr * kr * vis * (BR[0] * rR * pR + m) * ds;
          sg += vg * kg * vis * (BR[1] * rR * pR + m) * ds;
          sb += vb * kb * vis * (BR[2] * rR * pR + m) * ds;
        }
        tr += er * ds; tg += eg * ds; tb += eb * ds;
      }
      const o = (j * NU + i) * 4;
      L[o] = sr * E; L[o + 1] = sg * E; L[o + 2] = sb * E; L[o + 3] = 1;
      T[o] = Math.exp(-tr); T[o + 1] = Math.exp(-tg); T[o + 2] = Math.exp(-tb); T[o + 3] = 1;
    }
  }
  return { L, T, hor };
}

// Reads a baked table for elevation el and azimuth ph from the light.
// It filters like the GPU: bilinear between texel centres.
export function lookup(tab, el, ph, hor) {
  const u = Math.min(Math.max(ph / Math.PI * NU - 0.5, 0), NU - 1);
  const v = Math.min(Math.max(elToV(el, hor) * NV - 0.5, 0), NV - 1);
  const i0 = Math.floor(u), j0 = Math.floor(v), i1 = Math.min(i0 + 1, NU - 1), j1 = Math.min(j0 + 1, NV - 1);
  const fu = u - i0, fv = v - j0, out = [0, 0, 0];
  for (let c = 0; c < 3; c++) {
    const a = tab[(j0 * NU + i0) * 4 + c], b = tab[(j0 * NU + i1) * 4 + c];
    const d = tab[(j1 * NU + i0) * 4 + c], e = tab[(j1 * NU + i1) * 4 + c];
    out[c] = (a + (b - a) * fu) + ((d + (e - d) * fu) - (a + (b - a) * fu)) * fv;
  }
  return out;
}
