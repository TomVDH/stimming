// The wing skin's PBR maps, baked in planform space.
// u runs root to tip along the span; v is the chord fraction, leading edge 0.
// Pure maths only, so a worker can run it.

// Albedo and roughness store a factor; the material divides these scales back out.
export const ALB_K = 0.8, ROUGH_K = 0.62;
// Normals store four times the true slope, for 8-bit precision.
// The material's normalScale takes the four back out.
export const NRM_K = 4;

const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const fract = x => x - Math.floor(x);
// An integer hash, 0 to 1.
const hash = (i, j) => {
  let h = Math.imul(i | 0, 374761393) + Math.imul(j | 0, 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};
// Smooth value noise.
function vnoise(x, y) {
  const i = Math.floor(x), j = Math.floor(y), fx = x - i, fy = y - j;
  const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
  const a = hash(i, j), b = hash(i + 1, j), c = hash(i, j + 1), d = hash(i + 1, j + 1);
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}
// Groove amount, 1 on the line and 0 past half width w.
const groove = (d, w) => { const k = Math.abs(d) / w; return k < 1 ? 1 - k * k : 0; };

// The skin's layout, in metres and chord fractions.
const FRONT = 0.16, REAR = 0.585, SLAT = 0.11, RIB = 0.62;
// Slat breaks along the span; the engine sits at 7.5 m.
const SLATS = [4.6, 9.3, 12.4, 15.4, 18.3, 21.0, 23.4];
// Access doors: span range and chord range.
const DOORS = [[2.0, 2.9, 0.3, 0.38], [10.6, 11.1, 0.36, 0.42], [15.9, 16.3, 0.38, 0.46]];
// Round access covers: span, chord fraction, radius.
const COVERS = [[6.2, 0.3, 0.16], [13.8, 0.33, 0.14], [19.6, 0.35, 0.12]];
// The walkway: span range and chord range, near the root.
const WALK = [1.5, 6.2, 0.21, 0.5];

// A fastener row: distance across the row, position along it, pitch, head radius.
// Four taps per texel average the heads, so the rows never shimmer.
function rivets(across, along, pitch, r, ta, tb) {
  if (Math.abs(across) > r + tb) return 0;
  let sum = 0;
  for (let k = 0; k < 4; k++) {
    const a = along + ((k & 1) - 0.5) * ta * 0.5, d = across + ((k >> 1) - 0.5) * tb * 0.5;
    const e = a - Math.round(a / pitch) * pitch;
    sum += 1 - smooth(r * 0.55, r, Math.sqrt(e * e + d * d));
  }
  return sum / 4;
}

// Returns the albedo factor, the roughness factor and the height in millimetres.
function skinAt(z, s, c, du, dv, out) {
  const x = s * c;
  let h = 0, alb = 1, rough = 1;
  // A slow mottle in the paint.
  const m = vnoise(z * 0.7, x * 0.7) - 0.5;
  alb += 0.04 * m; rough -= 0.16 * m;

  // The slats: a spanwise seam, breaks between them, and a tone each.
  if (s < SLAT + 0.02) {
    let gs = groove(x - SLAT * c, 0.012 + dv);
    for (const zc of SLATS) gs = Math.max(gs, s < SLAT ? groove(z - zc, 0.012 + du) : 0);
    h -= 0.6 * gs; alb *= 1 - 0.55 * gs;
    if (s < SLAT) { let i = 0; while (i < SLATS.length && z > SLATS[i]) i++; alb *= 1 + 0.05 * (hash(i, 3) - 0.5); }
  }
  // The leading edge wears bright and smooth from rain and ice.
  if (s < 0.035) {
    const le = 1 - smooth(0.0, 0.035, s);
    alb *= 1 + le * (0.1 + 0.08 * vnoise(z * 4, s * 300));
    rough *= 1 - 0.35 * le;
  }

  // The wing box between the spars.
  if (s > FRONT - 0.02 && s < REAR + 0.02) {
    // The skin bows slightly between ribs and spars, as panels do.
    const bu = fract((z - 1.2) / RIB), bv = clamp((s - FRONT) / (REAR - FRONT));
    // The bow eases flat at its edges, so no crease shows at the ribs.
    const qu = Math.sin(Math.PI * bu), qv = Math.sin(Math.PI * bv);
    h += 0.8 * qu * qu * qv * qv;
    // Double rows of fasteners line both spars.
    let f = 0;
    const xf = x - FRONT * c, xr = x - REAR * c;
    f = Math.max(rivets(xf - 0.022, z, 0.05, 0.007, du, dv), rivets(xf + 0.022, z, 0.05, 0.007, du, dv),
      rivets(xr - 0.022, z, 0.05, 0.007, du, dv), rivets(xr + 0.022, z, 0.05, 0.007, du, dv));
    // Single rows run along each rib, between the spars.
    if (s > FRONT && s < REAR) { const zr = Math.round((z - 1.2) / RIB) * RIB + 1.2; f = Math.max(f, 0.6 * rivets(z - zr, x, 0.06, 0.006, dv, du)); }
    h += 0.25 * f; alb *= 1 - 0.06 * f; rough *= 1 - 0.12 * f;
    // A few bays were touched up with fresher, glossier paint.
    const bay = Math.floor((z - 1.2) / RIB);
    if (hash(bay, 9) > 0.86 && s > FRONT + 0.02 && s < REAR - 0.02) { alb *= 1.035; rough *= 0.86; }
  }

  // Access doors: an outline groove with a ring of screws.
  for (let k = 0; k < DOORS.length; k++) {
    const z0 = DOORS[k][0], z1 = DOORS[k][1], x0 = DOORS[k][2] * c, x1 = DOORS[k][3] * c;
    if (z < z0 - 0.08 || z > z1 + 0.08) continue;
    const dz = Math.max(z0 - z, z - z1), dx = Math.max(x0 - x, x - x1), d = Math.max(dz, dx);
    if (d > 0.08) continue;
    const g = groove(d, 0.007 + Math.max(du, dv) * 0.5);
    h -= 0.5 * g; alb *= 1 - 0.5 * g;
    // The screws sit 4 cm inside the edge.
    const along = Math.abs(dz) > Math.abs(dx) ? z : x;
    const sc = rivets(d + 0.04, along, 0.1, 0.008, du, dv);
    h += 0.2 * sc; alb *= 1 - 0.12 * sc;
  }
  for (let k = 0; k < COVERS.length; k++) {
    const zc = COVERS[k][0], sc = COVERS[k][1], r = COVERS[k][2];
    if (Math.abs(z - zc) > r + 0.06) continue;
    const dz = z - zc, dx = x - sc * c, d = Math.sqrt(dz * dz + dx * dx) - r;
    if (d > 0.06) continue;
    const g = groove(d, 0.006 + Math.max(du, dv) * 0.5);
    h -= 0.5 * g; alb *= 1 - 0.5 * g;
    if (d < 0) { alb *= 1.02; h += 0.3; }
  }

  // The walkway: a black outline round a dark, gritty non-slip pad.
  const w0 = WALK[0], w1 = WALK[1], ws0 = WALK[2], ws1 = WALK[3];
  const wd = Math.max(w0 - z, z - w1, ws0 * c - x, x - ws1 * c);
  if (wd < 0.06) {
    const line = 1 - smooth(0.02, 0.03 + Math.max(du, dv) * 0.5, Math.abs(wd + 0.03));
    if (wd < -0.06) { alb *= 0.78; rough *= 1.35; h += 0.15 * vnoise(z * 400, x * 400); }
    alb = alb * (1 - line) + 0.22 * line; rough = rough * (1 - line) + 1.1 * line;
  }

  // Grime streaks run aft with the airflow, worst near the trailing edge.
  const aft = smooth(0.5, 1.0, s);
  if (aft > 0) {
    const st = vnoise(z * 9, x * 0.4) * 0.7 + vnoise(z * 31, x * 1.1) * 0.3;
    const g = aft * st * st;
    alb *= 1 - 0.16 * g; rough *= 1 + 0.25 * g;
    // Hydraulic seepage leaves thin dark trails behind some spoiler hinges.
    const cell = Math.floor(z / 0.35), zc = (cell + 0.5) * 0.35;
    if (s > 0.765 && hash(cell, 5) > 0.85) {
      // Each trail wanders, frays and fades aft.
      const wob = (vnoise(x * 3, cell) - 0.5) * 0.04, w = 0.015 + 0.02 * hash(cell, 6);
      const trail = groove(z - zc - wob, w + du) * Math.exp(-(s - 0.765) * 6) * vnoise(x * 6, cell + 0.5);
      alb *= 1 - 0.25 * trail; rough *= 1 + 0.2 * trail;
    }
  }
  out[0] = alb; out[1] = rough; out[2] = h;
}

// Bakes W by H maps for the planform ST: [leading x, trailing x, span z] per station.
// Returns RGBA8 albedo, roughness and normal arrays.
export function bakeSkin(W, H, ST) {
  const Z0 = ST[0][2], ZT = ST[ST.length - 1][2], SPAN = ZT - Z0;
  const chord = z => {
    for (let i = 1; i < ST.length; i++) if (z <= ST[i][2]) {
      const f = (z - ST[i - 1][2]) / (ST[i][2] - ST[i - 1][2]);
      return (ST[i - 1][0] - ST[i - 1][1]) * (1 - f) + (ST[i][0] - ST[i][1]) * f;
    }
    return ST[ST.length - 1][0] - ST[ST.length - 1][1];
  };
  const alb = new Uint8Array(W * H * 4), rgh = new Uint8Array(W * H * 4), nrm = new Uint8Array(W * H * 4);
  const hgt = new Float32Array(W * H), cs = new Float32Array(W), o = [0, 0, 0];
  const du = SPAN / W;
  for (let i = 0; i < W; i++) cs[i] = chord(Z0 + (i + 0.5) * du);
  for (let j = 0; j < H; j++) {
    const s = (j + 0.5) / H;
    for (let i = 0; i < W; i++) {
      const c = cs[i];
      skinAt(Z0 + (i + 0.5) * du, s, c, du, c / H, o);
      const p = j * W + i, q = p * 4;
      alb[q] = alb[q + 1] = alb[q + 2] = Math.round(clamp(o[0] * ALB_K) * 255); alb[q + 3] = 255;
      rgh[q] = rgh[q + 1] = rgh[q + 2] = Math.round(clamp(o[1] * ROUGH_K) * 255); rgh[q + 3] = 255;
      hgt[p] = o[2];
    }
  }
  // Slopes in metres; heights are in millimetres.
  // three.js scales the span axis by chord over span, so the span slope grows to match.
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    const c = cs[i], dv = c / H, p = j * W + i, q = p * 4;
    const hl = hgt[j * W + Math.max(i - 1, 0)], hr = hgt[j * W + Math.min(i + 1, W - 1)];
    const hd = hgt[Math.max(j - 1, 0) * W + i], hu = hgt[Math.min(j + 1, H - 1) * W + i];
    const sz = (hr - hl) / (2 * du) * 1e-3, sc = (hu - hd) / (2 * dv) * 1e-3;
    const nx = -sz * SPAN / c * NRM_K, ny = -sc * NRM_K, l = Math.sqrt(nx * nx + ny * ny + 1);
    nrm[q] = Math.round((nx / l * 0.5 + 0.5) * 255);
    nrm[q + 1] = Math.round((ny / l * 0.5 + 0.5) * 255);
    nrm[q + 2] = Math.round((1 / l * 0.5 + 0.5) * 255);
    nrm[q + 3] = 255;
  }
  return { W, H, alb, rgh, nrm };
}
