// Tablecloth yank: the sim. A Verlet cloth and the rigid pieces of a set table.
// Units are metres and seconds. Y is up; the table runs along x; the pull end is +x.
// Rigid contacts follow Wrecking ball: sphere sets and impulses with friction.
import { TOP, TABLE, CLOTH, CANDLE, SETTING, BREAKS, FILL, RIM, shardPlan } from './shapes.js';

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const G = 9.81;
export const H = 1 / 240;
const ITERS = 6;
const CR = 0.004;                 // cloth collision radius
const MU_CLOTH = 0.2, MU_WOOD = 0.24, MU_FLOOR = 0.38;
const E_WOOD = 0.14, E_FLOOR = 0.22;
// A piece breaks on the floor above this closing speed, m/s.
const BREAK_V = { plate: 2.2, wine: 1.6, tumbler: 1.9 };

/* ---------- table ---------- */
// Signed distance to the bullnose slab, with the outward normal.
const N3 = [0, 0, 0];
const cx = TABLE.hx - TABLE.re, cz = TABLE.hz - TABLE.re;
function slab(x, y, z) {
  const qx = clamp(x, -cx, cx), qz = clamp(z, -cz, cz), qy = TABLE.cy;
  const dx = x - qx, dy = y - qy, dz = z - qz;
  const d = Math.hypot(dx, dy, dz) || 1e-9;
  N3[0] = dx / d; N3[1] = dy / d; N3[2] = dz / d;
  return d - TABLE.re;
}

// The cloth meets a deeper block: the top and the apron below it.
// A thin slab alone lets a hanging hem slip under the top.
const BY0 = TOP - 0.36 + TABLE.re, BY1 = TABLE.cy;
function block(x, y, z) {
  const qx = clamp(x, -cx, cx), qy = clamp(y, BY0, BY1), qz = clamp(z, -cz, cz);
  const dx = x - qx, dy = y - qy, dz = z - qz;
  const d = Math.hypot(dx, dy, dz);
  if (d > 1e-7) { N3[0] = dx / d; N3[1] = dy / d; N3[2] = dz / d; return d - TABLE.re; }
  // Inside the core: leave by the nearest face.
  const ex = cx - Math.abs(x), ez = cz - Math.abs(z), et = BY1 - y, eb = y - BY0;
  const m = Math.min(ex, ez, et, eb);
  N3[0] = m === ex ? Math.sign(x) : 0; N3[1] = m === et ? 1 : m === eb ? -1 : 0; N3[2] = m === ez && m !== ex ? Math.sign(z) : 0;
  return -m - TABLE.re;
}

/* ---------- rigid pieces ---------- */
function ring(out, n, r, y, s, a0 = 0) {
  for (let k = 0; k < n; k++) { const a = a0 + k / n * Math.PI * 2; out.push([r * Math.sin(a), y, r * Math.cos(a), s]); }
}
// Each kind: contact spheres in the base frame, mass, centre height, inertia.
function kindOf(kind) {
  const L = [];
  switch (kind) {
    case 'plate':
      ring(L, 10, 0.0735, 0.0035, 0.0035); ring(L, 12, 0.1305, 0.0205, 0.0045, 0.13);
      return { L, m: 0.55, c: [0, 0.009, 0], I: [0.002, 0.004, 0.002] };
    case 'wine':
      ring(L, 8, 0.033, 0.0035, 0.0035); L.push([0, 0.05, 0, 0.0045]);
      ring(L, 8, 0.0365, 0.142, 0.0055, 0.2); ring(L, 8, 0.0308, 0.2065, 0.0035);
      return { L, m: 0.3, c: [0, 0.088, 0], I: [0.0012, 0.00019, 0.0012] };
    case 'tumbler':
      ring(L, 8, 0.0285, 0.003, 0.003); ring(L, 8, 0.0298, 0.05, 0.0042, 0.2); ring(L, 8, 0.0334, 0.1015, 0.003);
      return { L, m: 0.43, c: [0, 0.044, 0], I: [0.00052, 0.00025, 0.00052] };
    case 'stick':
      ring(L, 8, 0.0412, 0.0035, 0.0035); L.push([0, 0.058, 0, 0.0155]);
      ring(L, 6, 0.023, 0.129, 0.0045);
      for (const y of [0.16, 0.2, 0.24, 0.28]) L.push([0, y, 0, 0.0105]);
      return { L, m: 0.42, c: [0, 0.058, 0], I: [0.0011, 0.0003, 0.0011] };
    case 'knife':
      // The handle lies on the cloth; the blade lifts a hair off it.
      for (const z of [0.108, 0.075, 0.042]) L.push([0, 0.0055, z, 0.0055]);
      for (const z of [0.0, -0.04, -0.08, -0.108]) L.push([0, 0.003, z, 0.003]);
      return { L, m: 0.1, c: [0, 0.004, 0.035], I: [0.00045, 0.00045, 0.00002] };
    case 'fork':
      for (const z of [0.094, 0.058, 0.022]) L.push([0, 0.004, z, 0.004]);
      L.push([0, 0.004, -0.025, 0.003]);
      for (const z of [-0.068, -0.096]) for (const x of [-0.009, 0.009]) L.push([x, 0.0055, z, 0.003]);
      return { L, m: 0.08, c: [0, 0.0045, 0.02], I: [0.00028, 0.00028, 0.00002] };
  }
  return null;
}

function makeBody(kind, spec) {
  const K = kindOf(kind);
  const L = K.L.map(([x, y, z, s]) => [x - K.c[0], y - K.c[1], z - K.c[2], s]);
  const b = {
    kind, m: K.m, im: 1 / K.m, IX: 1 / K.I[0], IY: 1 / K.I[1], IZ: 1 / K.I[2], c: K.c,
    L, S: new Float64Array(L.length * 3), R: new Float64Array(9),
    br: Math.max(...L.map(([x, y, z, s]) => Math.hypot(x, y, z) + s)),
    x: 0, y: 0, z: 0, qx: 0, qy: 0, qz: 0, qw: 1, vx: 0, vy: 0, vz: 0, wx: 0, wy: 0, wz: 0,
    awake: false, still: 0, gone: false, onCloth: false, clothV: 0, home: spec, scale: 1,
    ax: 0, az: 0, pvx: 0, pvz: 0,
  };
  return b;
}
// Puts a piece at its home: base on the cloth, turned by its angle.
function home(b) {
  const s = b.home, h = s.a / 2;
  b.qx = 0; b.qy = Math.sin(h); b.qz = 0; b.qw = Math.cos(h);
  rotOf(b, b.R);
  const R = b.R, c = b.c;
  b.x = s.x + R[0] * c[0] + R[1] * c[1] + R[2] * c[2];
  b.y = TOP + CLOTH.thick + c[1];
  b.z = s.z + R[6] * c[0] + R[7] * c[1] + R[8] * c[2];
  b.vx = b.vy = b.vz = b.wx = b.wy = b.wz = 0;
  b.awake = false; b.still = 0; b.gone = false; b.scale = 1; b.kicked = false; b.onCloth = false; b.cside = 1;
  spheres(b);
}

/* ---------- rigid body helpers ---------- */
const IA = new Float64Array(3), IB = new Float64Array(3);
function rotOf(p, M) {
  const x = p.qx, y = p.qy, z = p.qz, w = p.qw;
  M[0] = 1 - 2 * (y * y + z * z); M[1] = 2 * (x * y - z * w); M[2] = 2 * (x * z + y * w);
  M[3] = 2 * (x * y + z * w); M[4] = 1 - 2 * (x * x + z * z); M[5] = 2 * (y * z - x * w);
  M[6] = 2 * (x * z - y * w); M[7] = 2 * (y * z + x * w); M[8] = 1 - 2 * (x * x + y * y);
}
function iw(p, a, b, c, out) {
  const R = p.R;
  const u = (R[0] * a + R[3] * b + R[6] * c) * p.IX, v = (R[1] * a + R[4] * b + R[7] * c) * p.IY, w = (R[2] * a + R[5] * b + R[8] * c) * p.IZ;
  out[0] = R[0] * u + R[1] * v + R[2] * w;
  out[1] = R[3] * u + R[4] * v + R[5] * w;
  out[2] = R[6] * u + R[7] * v + R[8] * w;
}
function spheres(p) {
  const M = p.R, S = p.S, L = p.L;
  for (let k = 0; k < L.length; k++) {
    const l = L[k];
    S[k * 3] = p.x + M[0] * l[0] + M[1] * l[1] + M[2] * l[2];
    S[k * 3 + 1] = p.y + M[3] * l[0] + M[4] * l[1] + M[5] * l[2];
    S[k * 3 + 2] = p.z + M[6] * l[0] + M[7] * l[1] + M[8] * l[2];
  }
}
// One impulse at a contact, normal n from b to a. A null b is a surface moving at (sx, sy, sz).
function impulse(a, b, cx, cy, cz, nx, ny, nz, e, mu, sx = 0, sy = 0, sz = 0) {
  const rax = cx - a.x, ray = cy - a.y, raz = cz - a.z;
  let vx = a.vx + a.wy * raz - a.wz * ray - sx, vy = a.vy + a.wz * rax - a.wx * raz - sy, vz = a.vz + a.wx * ray - a.wy * rax - sz;
  let rbx = 0, rby = 0, rbz = 0;
  if (b) {
    rbx = cx - b.x; rby = cy - b.y; rbz = cz - b.z;
    vx -= b.vx + b.wy * rbz - b.wz * rby; vy -= b.vy + b.wz * rbx - b.wx * rbz; vz -= b.vz + b.wx * rby - b.wy * rbx;
  }
  const vn = vx * nx + vy * ny + vz * nz;
  if (vn >= 0) return 0;
  iw(a, ray * nz - raz * ny, raz * nx - rax * nz, rax * ny - ray * nx, IA);
  let k = a.im + nx * (IA[1] * raz - IA[2] * ray) + ny * (IA[2] * rax - IA[0] * raz) + nz * (IA[0] * ray - IA[1] * rax);
  if (b) {
    iw(b, rby * nz - rbz * ny, rbz * nx - rbx * nz, rbx * ny - rby * nx, IB);
    k += b.im + nx * (IB[1] * rbz - IB[2] * rby) + ny * (IB[2] * rbx - IB[0] * rbz) + nz * (IB[0] * rby - IB[1] * rbx);
  }
  // A slow contact does not bounce, so a piece can rest.
  const j = (-(1 + (vn < -0.5 ? e : 0)) * vn) / k;
  apply(a, b, j * nx, j * ny, j * nz, rax, ray, raz, rbx, rby, rbz);
  let tx = vx - vn * nx, ty = vy - vn * ny, tz = vz - vn * nz;
  const vt = Math.hypot(tx, ty, tz);
  if (vt > 1e-6) {
    tx /= vt; ty /= vt; tz /= vt;
    iw(a, ray * tz - raz * ty, raz * tx - rax * tz, rax * ty - ray * tx, IA);
    let kt = a.im + tx * (IA[1] * raz - IA[2] * ray) + ty * (IA[2] * rax - IA[0] * raz) + tz * (IA[0] * ray - IA[1] * rax);
    if (b) {
      iw(b, rby * tz - rbz * ty, rbz * tx - rbx * tz, rbx * ty - rby * tx, IB);
      kt += b.im + tx * (IB[1] * rbz - IB[2] * rby) + ty * (IB[2] * rbx - IB[0] * rbz) + tz * (IB[0] * rby - IB[1] * rbx);
    }
    const jt = -Math.min(vt / kt, mu * j);
    apply(a, b, jt * tx, jt * ty, jt * tz, rax, ray, raz, rbx, rby, rbz);
  }
  return -vn;
}
function apply(a, b, jx, jy, jz, rax, ray, raz, rbx, rby, rbz) {
  a.vx += jx * a.im; a.vy += jy * a.im; a.vz += jz * a.im;
  iw(a, ray * jz - raz * jy, raz * jx - rax * jz, rax * jy - ray * jx, IA);
  a.wx += IA[0]; a.wy += IA[1]; a.wz += IA[2];
  if (!b) return;
  b.vx -= jx * b.im; b.vy -= jy * b.im; b.vz -= jz * b.im;
  iw(b, rby * jz - rbz * jy, rbz * jx - rbx * jz, rbx * jy - rby * jx, IB);
  b.wx -= IB[0]; b.wy -= IB[1]; b.wz -= IB[2];
}
function integrate(p, h) {
  p.x += p.vx * h; p.y += p.vy * h; p.z += p.vz * h;
  const { wx, wy, wz } = p;
  let { qx, qy, qz, qw } = p;
  const hx = wx * h / 2, hy = wy * h / 2, hz = wz * h / 2;
  const nx = qx + hx * qw + hy * qz - hz * qy, ny = qy + hy * qw + hz * qx - hx * qz, nz = qz + hz * qw + hx * qy - hy * qx, nw = qw - hx * qx - hy * qy - hz * qz;
  const l = Math.hypot(nx, ny, nz, nw) || 1;
  p.qx = nx / l; p.qy = ny / l; p.qz = nz / l; p.qw = nw / l;
  rotOf(p, p.R);
  spheres(p);
}

/* ---------- cloth ---------- */
const NX = CLOTH.nx, NZ = CLOTH.nz, NP = NX * NZ;
export const HX = CLOTH.w / (NX - 1), HZ = CLOTH.d / (NZ - 1);
const idx = (i, j) => i * NZ + j;
function makeCloth() {
  const P = new Float32Array(NP * 3), Q = new Float32Array(NP * 3), W = new Float32Array(NP).fill(1);
  for (let i = 0; i < NX; i++) for (let j = 0; j < NZ; j++) {
    const k = idx(i, j) * 3;
    P[k] = -CLOTH.w / 2 + i * HX; P[k + 1] = TOP + CR; P[k + 2] = -CLOTH.d / 2 + j * HZ;
  }
  Q.set(P);
  // Structural links, then bend links that skip one particle.
  const C = [];
  for (let i = 0; i < NX; i++) for (let j = 0; j < NZ; j++) {
    if (i + 1 < NX) C.push(idx(i, j), idx(i + 1, j));
    if (j + 1 < NZ) C.push(idx(i, j), idx(i, j + 1));
  }
  // Shear links keep a hanging corner from folding down like a net.
  const D = [];
  for (let i = 0; i + 1 < NX; i++) for (let j = 0; j + 1 < NZ; j++) D.push(idx(i, j), idx(i + 1, j + 1), idx(i + 1, j), idx(i, j + 1));
  const B = [];
  for (let i = 0; i < NX; i++) for (let j = 0; j < NZ; j++) {
    if (i + 2 < NX) B.push(idx(i, j), idx(i + 2, j));
    if (j + 2 < NZ) B.push(idx(i, j), idx(i, j + 2));
  }
  const rest = a => {
    const r = new Float32Array(a.length / 2);
    for (let c = 0; c < r.length; c++) {
      const i = a[c * 2] * 3, j = a[c * 2 + 1] * 3;
      r[c] = Math.hypot(P[i] - P[j], P[i + 1] - P[j + 1], P[i + 2] - P[j + 2]);
    }
    return r;
  };
  return {
    P, Q, W, C: new Int32Array(C), CL: rest(C), D: new Int32Array(D), DL: rest(D), B: new Int32Array(B), BL: rest(B),
    rest: null, awake: true, still: 0, speed: 0, onTop: NP, slip: 0, flying: 0,
    grid: new Map(), from: null,
    // Fire: heat and fuel per particle; cut marks a particle burnt through.
    heat: new Float32Array(NP), fuel: new Float32Array(NP).fill(1), cut: new Uint8Array(NP),
  };
}
// Burning cloth shrinks and curls: each particle scales the rest length of its links.
const SHRINK = new Float32Array(NP).fill(1);
function links(P, W, C, CL, k, cut, fire) {
  if (!fire) { linksFast(P, W, C, CL, k); return; }
  const ks = k * 0.25;
  for (let c = 0, n = CL.length; c < n; c++) {
    const ia = C[c * 2], ib = C[c * 2 + 1];
    // A link with a burnt-through end holds nothing.
    if (cut[ia] | cut[ib]) continue;
    const wa = W[ia], wb = W[ib], ws = wa + wb;
    if (ws === 0) continue;
    const a = ia * 3, b = ib * 3;
    const dx = P[b] - P[a], dy = P[b + 1] - P[a + 1], dz = P[b + 2] - P[a + 2];
    const d = Math.sqrt(dx * dx + dy * dy + dz * dz) + 1e-9, r = CL[c] * Math.min(SHRINK[ia], SHRINK[ib]);
    // Cloth resists stretch hard and squash softly.
    const s = (d - r) / (d * ws) * (d > r ? k : ks);
    const sa = s * wa, sb = s * wb;
    P[a] += dx * sa; P[a + 1] += dy * sa; P[a + 2] += dz * sa;
    P[b] -= dx * sb; P[b + 1] -= dy * sb; P[b + 2] -= dz * sb;
  }
}
// Without fire, no link is cut or shrunk: the plain loop is a third faster.
function linksFast(P, W, C, CL, k) {
  const ks = k * 0.25;
  for (let c = 0, n = CL.length; c < n; c++) {
    const ia = C[c * 2], ib = C[c * 2 + 1];
    const wa = W[ia], wb = W[ib], ws = wa + wb;
    if (ws === 0) continue;
    const a = ia * 3, b = ib * 3;
    const dx = P[b] - P[a], dy = P[b + 1] - P[a + 1], dz = P[b + 2] - P[a + 2];
    const d = Math.sqrt(dx * dx + dy * dy + dz * dz) + 1e-9, r = CL[c];
    const s = (d - r) / (d * ws) * (d > r ? k : ks);
    const sa = s * wa, sb = s * wb;
    P[a] += dx * sa; P[a + 1] += dy * sa; P[a + 2] += dz * sa;
    P[b] -= dx * sb; P[b + 1] -= dy * sb; P[b + 2] -= dz * sb;
  }
}
// The held hem leads each column: a particle stays within its rest path of the hem.
// On the table the path runs over the pull edge, and over the far edge too.
const EX = TABLE.hx + 0.004, EY = TOP - 0.004;
function tether(sim) {
  const cl = sim.cloth, P = cl.P;
  for (let j = 0; j < NZ; j++) {
    const e = idx(NX - 1, j) * 3, hx = P[e], hy = P[e + 1], hz = P[e + 2];
    const over = hx > TABLE.hx - 0.02 && hy < TOP;
    for (let i = 0; i < NX - 1; i++) {
      const k = idx(i, j) * 3, L = (NX - 1 - i) * HX * 1.02;
      const x = P[k], y = P[k + 1], z = P[k + 2];
      // The path goes round the edges it must cross.
      let tx = hx, ty = hy, tz = hz, d;
      if (over && x < TABLE.hx && y > TOP - 0.06) {
        let ax = EX, ay = EY, rest = Math.hypot(EX - hx, EY - hy, z - hz);
        if (x < -TABLE.hx && y < TOP) { ax = -EX; rest += 2 * EX; }
        tx = ax; ty = ay; tz = z;
        d = Math.hypot(x - tx, y - ty, z - tz) + rest;
      } else d = Math.hypot(x - tx, y - ty, z - tz);
      if (d <= L) continue;
      const g = Math.hypot(x - tx, y - ty, z - tz) || 1e-9, m = Math.min(d - L, g) / g;
      P[k] += (tx - x) * m; P[k + 1] += (ty - y) * m; P[k + 2] += (tz - z) * m;
    }
  }
}
/* ---------- cloth grid ---------- */
// A flat 3D grid of the particles, 5 cm cells, rebuilt each cloth step.
const GC = 0.05, GX0 = -1.6, GY0 = -0.05, GZ0 = -1.3, GXN = 110, GYN = 38, GZN = 52;
const ghead = new Int32Array(GXN * GYN * GZN), gnext = new Int32Array(NP);
const gi = (v, o, n) => Math.min(n - 1, Math.max(0, Math.floor((v - o) / GC)));
function grid3(P) {
  ghead.fill(-1);
  for (let p = 0; p < NP; p++) {
    const c = (gi(P[p * 3], GX0, GXN) * GYN + gi(P[p * 3 + 1], GY0, GYN)) * GZN + gi(P[p * 3 + 2], GZ0, GZN);
    gnext[p] = ghead[c]; ghead[c] = p;
  }
}
// Calls f(p) for each particle in the cells round a sphere.
function near(x, y, z, r, f) {
  const i0 = gi(x - r, GX0, GXN), i1 = gi(x + r, GX0, GXN), j0 = gi(y - r, GY0, GYN), j1 = gi(y + r, GY0, GYN), k0 = gi(z - r, GZ0, GZN), k1 = gi(z + r, GZ0, GZN);
  for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) for (let k = k0; k <= k1; k++) {
    for (let p = ghead[(i * GYN + j) * GZN + k]; p >= 0; p = gnext[p]) f(p);
  }
}
// The cloth's normal at each particle: its top side faces up on the table.
const PN = new Float32Array(NP * 3);
function normals(P) {
  for (let i = 0; i < NX; i++) for (let j = 0; j < NZ; j++) {
    const a = idx(Math.min(NX - 1, i + 1), j) * 3, b = idx(Math.max(0, i - 1), j) * 3, c = idx(i, Math.min(NZ - 1, j + 1)) * 3, d = idx(i, Math.max(0, j - 1)) * 3;
    const ex = P[a] - P[b], ey = P[a + 1] - P[b + 1], ez = P[a + 2] - P[b + 2];
    const fx = P[c] - P[d], fy = P[c + 1] - P[d + 1], fz = P[c + 2] - P[d + 2];
    let nx = fy * ez - fz * ey, ny = fz * ex - fx * ez, nz = fx * ey - fy * ex;
    const l = Math.hypot(nx, ny, nz) || 1, k = idx(i, j) * 3;
    PN[k] = nx / l; PN[k + 1] = ny / l; PN[k + 2] = nz / l;
  }
}
// The four legs, as upright cylinders under the block.
const LEG_R = 0.03, LEGS = [[1, 1], [1, -1], [-1, 1], [-1, -1]].map(([a, b]) => [a * (TABLE.hx - 0.07), b * (TABLE.hz - 0.07)]);
function legPush(P, k, r) {
  const x = P[k], z = P[k + 2];
  if (P[k + 1] > BY0 + 0.02) return;
  for (const [lx, lz] of LEGS) {
    const dx = x - lx, dz = z - lz, d2 = dx * dx + dz * dz, R = LEG_R + r;
    if (d2 >= R * R) continue;
    const d = Math.sqrt(d2) || 1e-9;
    P[k] = lx + dx / d * R; P[k + 2] = lz + dz / d * R;
  }
}
// A link or a quad between particles must not cut the table's rounded edge.
// The particles alone pass that test while their chord cuts the corner.
const QN = (NX - 1) * (NZ - 1);
function chords(P) {
  const lo = BY0 - 0.04, hx = TABLE.hx + 0.03, hz = TABLE.hz + 0.03;
  const push = (ks, n, x, y, z) => {
    if (y > TOP + 0.03 || y < lo || Math.abs(x) > hx || Math.abs(z) > hz) return;
    const d = block(x, y, z) - CR;
    if (d >= 0) return;
    for (let m = 0; m < n; m++) { const k = ks[m]; P[k] -= N3[0] * d; P[k + 1] -= N3[1] * d; P[k + 2] -= N3[2] * d; }
  };
  const ks = [0, 0, 0, 0];
  for (let i = 0; i + 1 < NX; i++) for (let j = 0; j + 1 < NZ; j++) {
    const a = idx(i, j) * 3, b = idx(i + 1, j) * 3, c = idx(i + 1, j + 1) * 3, d = idx(i, j + 1) * 3;
    ks[0] = a; ks[1] = b;
    push(ks, 2, (P[a] + P[b]) / 2, (P[a + 1] + P[b + 1]) / 2, (P[a + 2] + P[b + 2]) / 2);
    ks[1] = d;
    push(ks, 2, (P[a] + P[d]) / 2, (P[a + 1] + P[d + 1]) / 2, (P[a + 2] + P[d + 2]) / 2);
    ks[1] = b; ks[2] = c; ks[3] = d;
    push(ks, 4, (P[a] + P[b] + P[c] + P[d]) / 4, (P[a + 1] + P[b + 1] + P[c + 1] + P[d + 1]) / 4, (P[a + 2] + P[b + 2] + P[c + 2] + P[d + 2]) / 4);
  }
}
// Cloth layers keep a gap, so a heap on the floor does not pass through itself.
const SELF = 0.016;
function selfCollide(P, W) {
  for (let p = 0; p < NP; p++) {
    if (W[p] === 0) continue;
    const k = p * 3, pi = (p / NZ) | 0, pj = p - pi * NZ;
    near(P[k], P[k + 1], P[k + 2], SELF, q => {
      if (q <= p) return;
      const qi = (q / NZ) | 0, qj = q - qi * NZ;
      // Grid neighbours keep their own rest lengths.
      if (Math.abs(qi - pi) < 3 && Math.abs(qj - pj) < 3) return;
      const m = q * 3, dx = P[m] - P[k], dy = P[m + 1] - P[k + 1], dz = P[m + 2] - P[k + 2], d2 = dx * dx + dy * dy + dz * dz;
      if (d2 >= SELF * SELF) return;
      const d = Math.sqrt(d2) || 1e-6, s = (SELF - d) / d * 0.5;
      P[k] -= dx * s; P[k + 1] -= dy * s; P[k + 2] -= dz * s;
      P[m] += dx * s; P[m + 1] += dy * s; P[m + 2] += dz * s;
    });
  }
}
function collide(sim, flyCheck) {
  const cl = sim.cloth, P = cl.P, Q = cl.Q;
  let onTop = 0;
  chords(P);
  for (let p = 0; p < NP; p++) {
    const k = p * 3;
    let x = P[k], y = P[k + 1], z = P[k + 2];
    if (y < TOP + 0.05 && y > BY0 - 0.05 && Math.abs(x) < TABLE.hx + 0.03 && Math.abs(z) < TABLE.hz + 0.03) {
      const d = block(x, y, z) - CR;
      if (d < 0) {
        x -= N3[0] * d; y -= N3[1] * d; z -= N3[2] * d;
        P[k] = x; P[k + 1] = y; P[k + 2] = z;
        // Friction on the wood takes the sliding part of the step.
        const vx = x - Q[k], vy = y - Q[k + 1], vz = z - Q[k + 2], vn = vx * N3[0] + vy * N3[1] + vz * N3[2];
        const f = 0.22;
        Q[k] += (vx - vn * N3[0]) * f; Q[k + 1] += (vy - vn * N3[1]) * f; Q[k + 2] += (vz - vn * N3[2]) * f;
      }
      if (N3[1] > 0.7 && d < 0.004) onTop++;
    }
    legPush(P, k, CR);
    if (y < CR + 0.0005) {
      P[k + 1] = y = Math.max(y, CR);
      // Cloth on the boards holds still once it slows: static friction.
      const sx = x - Q[k], sz = z - Q[k + 2];
      if (sx * sx + sz * sz < 0.0006 * 0.0006) { Q[k] = x; Q[k + 2] = z; } else { Q[k] += sx * 0.45; Q[k + 2] += sz * 0.45; }
      if (Q[k + 1] < CR) Q[k + 1] = CR;
    }
  }
  cl.onTop = onTop;
  // The cloth goes round the pieces, on its own side of each.
  for (const b of sim.bodies) {
    if (b.gone || (!b.awake && !flyCheck)) continue;
    const S = b.S, L = b.L, side = b.cside || 1;
    near(b.x, b.y, b.z, b.br + 0.02, p => {
      const k = p * 3, x = P[k], y = P[k + 1], z = P[k + 2];
      // Cloth flat on the top lies under a piece; the slab holds it there.
      if (y < TOP + 0.012 && y > TOP - 0.03 && Math.abs(x) < TABLE.hx && Math.abs(z) < TABLE.hz) return;
      const nx = PN[k] * side, ny = PN[k + 1] * side, nz = PN[k + 2] * side;
      for (let s = 0; s < L.length; s++) {
        const ex = P[k] - S[s * 3], ey = P[k + 1] - S[s * 3 + 1], ez = P[k + 2] - S[s * 3 + 2], r = L[s][3] + CR + 0.003;
        const d2 = ex * ex + ey * ey + ez * ez;
        if (d2 >= r * r) continue;
        const dn = ex * nx + ey * ny + ez * nz;
        if (dn > 0) {
          // The particle passed the piece: it goes back under, at the same offset.
          const tx = ex - nx * dn, ty = ey - ny * dn, tz = ez - nz * dn;
          const m = -dn - Math.sqrt(Math.max(0, r * r - (tx * tx + ty * ty + tz * tz)));
          P[k] += nx * m; P[k + 1] += ny * m; P[k + 2] += nz * m;
        } else {
          const d = Math.sqrt(d2) || 1e-9, m = (r - d) / d;
          P[k] += ex * m; P[k + 1] += ey * m; P[k + 2] += ez * m;
        }
      }
    });
  }
}
// A grid of the particles on the table, for the cloth under a piece.
const CELL = 0.05;
const gkey = (i, j) => (i + 100) * 1000 + (j + 100);
function hashCloth(sim) {
  const cl = sim.cloth, g = cl.grid, P = cl.P;
  for (const v of g.values()) v.length = 0;
  for (let p = 0; p < NP; p++) {
    const k = p * 3, y = P[k + 1];
    if (y < BY0 - 0.05 || y > TOP + 0.03 || Math.abs(P[k]) > TABLE.hx + 0.08 || Math.abs(P[k + 2]) > TABLE.hz + 0.08) continue;
    const key = gkey(Math.floor(P[k] / CELL), Math.floor(P[k + 2] / CELL));
    let l = g.get(key);
    if (!l) g.set(key, l = []);
    l.push(p);
  }
}
const CV = [0, 0, 0];
// The cloth's velocity at a point of the table's skin, or null where the wood is bare.
// On the top the search is flat; on a face it is in 3D.
function clothUnder(sim, x, z, h, y = -1) {
  const cl = sim.cloth, P = cl.P, Q = cl.Q;
  const i0 = Math.floor(x / CELL), j0 = Math.floor(z / CELL);
  let best = 0.045 * 0.045, bp = -1;
  for (let i = i0 - 1; i <= i0 + 1; i++) for (let j = j0 - 1; j <= j0 + 1; j++) {
    const l = cl.grid.get(gkey(i, j));
    if (!l) continue;
    for (const p of l) {
      const dx = P[p * 3] - x, dz = P[p * 3 + 2] - z, dy = P[p * 3 + 1] - (y < 0 ? TOP : y);
      if (y < 0 && Math.abs(dy) > 0.03) continue;
      const d = dx * dx + dz * dz + (y < 0 ? 0 : dy * dy);
      if (d < best) { best = d; bp = p; }
    }
  }
  if (bp < 0) return null;
  const k = bp * 3;
  // Friction takes the tangent part; the normal pass never sees it, so a flap lifts nothing.
  CV[0] = (P[k] - Q[k]) / (h * 2); CV[1] = (P[k + 1] - Q[k + 1]) / (h * 2); CV[2] = (P[k + 2] - Q[k + 2]) / (h * 2);
  return CV;
}
function clothStep(sim, h, damp = 0.9965, iters = ITERS) {
  const cl = sim.cloth, P = cl.P, Q = cl.Q, W = cl.W, hand = sim.hand;
  const g = G * h * h;
  let vmax = 0;
  for (let p = 0; p < NP; p++) {
    const k = p * 3;
    if (W[p] === 0) continue;
    const vx = (P[k] - Q[k]) * damp, vy = (P[k + 1] - Q[k + 1]) * damp, vz = (P[k + 2] - Q[k + 2]) * damp;
    Q[k] = P[k]; Q[k + 1] = P[k + 1]; Q[k + 2] = P[k + 2];
    P[k] += vx; P[k + 1] += vy - g; P[k + 2] += vz;
    const v2 = vx * vx + vy * vy + vz * vz;
    if (v2 > vmax) vmax = v2;
  }
  // The hand sets the held hem each step.
  if (hand.pins) {
    for (const pin of hand.pins) {
      const k = pin.p * 3;
      Q[k] = P[k]; Q[k + 1] = P[k + 1]; Q[k + 2] = P[k + 2];
      P[k] = hand.x + pin.ox; P[k + 1] = Math.max(CR, hand.y + pin.oy); P[k + 2] = pin.oz;
      const d = block(P[k], P[k + 1], P[k + 2]) - CR;
      if (d < 0) { P[k] -= N3[0] * d; P[k + 1] -= N3[1] * d; P[k + 2] -= N3[2] * d; }
    }
  }
  const fly = cl.flying > 0;
  grid3(P);
  normals(P);
  // Burn marks stay until the reset heals them.
  const fire = !!(sim.fireT > 0 || sim.reset || cl.marked);
  for (let it = 0; it < iters; it++) {
    links(P, W, cl.C, cl.CL, 1, cl.cut, fire);
    links(P, W, cl.D, cl.DL, 0.8, cl.cut, fire);
    if (it & 1) links(P, W, cl.B, cl.BL, 0.35, cl.cut, fire);
    if (hand.pins) tether(sim);
    // Collision runs on two passes of six; the last one sets the shape.
    if (it === 2 || it === iters - 1) collide(sim, fly);
  }
  if (cl.onTop < NP * 0.9) { grid3(P); selfCollide(P, W); }
  cl.speed = Math.sqrt(vmax) / h;
}

/* ---------- liquid ---------- */
// Each glass carries a slosh oscillator: the first mode of a cylinder of its radius.
function makeLiquid(kind) {
  const r = kind === 'wine' ? 0.04 : 0.034;
  return { kind, f: FILL[kind], sx: 0, sz: 0, vx: 0, vz: 0, w: Math.sqrt(G * 1.84 / r), pour: 0 };
}
function sloshStep(sim, b, h) {
  const L = b.liq;
  if (!L || b.gone) return;
  // The surface leans against the glass's own acceleration, and lags it.
  const ax = clamp(b.ax, -60, 60), az = clamp(b.az, -60, 60);
  const tx = -ax / G, tz = -az / G, w = L.w, z = 0.075;
  L.vx += (-w * w * (L.sx - tx) - 2 * z * w * L.vx) * h;
  L.vz += (-w * w * (L.sz - tz) - 2 * z * w * L.vz) * h;
  L.sx = clamp(L.sx + L.vx * h, -0.7, 0.7); L.sz = clamp(L.sz + L.vz * h, -0.7, 0.7);
  // The glass pours where the surface stands above the lowest point of its rim.
  const R = b.R, ux = R[1], uy = R[4], uz = R[7];
  let nx = -L.sx, ny = 1, nz = -L.sz;
  const nl = Math.hypot(nx, ny, nz); nx /= nl; ny /= nl; nz /= nl;
  const nu = nx * ux + ny * uy + nz * uz, perp = Math.sqrt(Math.max(0, 1 - nu * nu));
  const rr = b.kind === 'wine' ? 0.0326 : 0.0352, rim = RIM[b.kind] - b.c[1];
  const lift = (rim - (L.f - b.c[1])) * nu - rr * perp;
  if (lift < 0 && L.f > 0.0) {
    const loss = Math.min(L.f, -lift * 3.2 * h + 0.002 * h);
    const bottom = b.kind === 'wine' ? 0.095 : 0.0135;
    L.f = Math.max(bottom, L.f - loss);
    L.pour += loss;
    if (L.f <= bottom + 0.001) L.f = 0;
  }
  if (L.f && L.f < (b.kind === 'wine' ? 0.096 : 0.0145)) L.f = 0;
}

/* ---------- sim ---------- */
export function makeSim() {
  const bodies = SETTING.map(s => {
    const b = makeBody(s.kind, s);
    if (s.kind === 'wine' || s.kind === 'tumbler') b.liq = makeLiquid(s.kind);
    home(b);
    return b;
  });
  const sim = {
    t: 0, acc: 0, calm: false, events: [], bodies, shards: [], drops: [], glitter: [], puddles: [],
    cloth: makeCloth(), hand: { pins: null, x: 0, y: 0, x0: 0, y0: 0, tx: 0, ty: 0, vx: 0, vy: 0, follow: false, auto: 0, drop: 0 },
    quiet: 0, reset: null, dirty: false, flame: { lean: 0, v: 0, out: 0, down: 0, touch: 0 }, wind: 0, yankV: 0, clear: 0,
    burning: 0, fireT: 0, fireC: [0, 0, 0], embers: [],
  };
  // The cloth falls onto the table and drapes before the first frame.
  settle(sim, 2.4);
  sim.cloth.rest = Float32Array.from(sim.cloth.P);
  regrid(sim);
  return sim;
}
function settle(sim, secs) {
  const n = Math.round(secs / H);
  // A heavy damping lets the drape come to rest in the pre-roll.
  for (let s = 0; s < n; s++) clothStep(sim, H, s < n * 0.6 ? 0.985 : 0.995, 18);
  sim.cloth.Q.set(sim.cloth.P);
  sim.cloth.awake = false;
}

/* ---------- hand ---------- */
// The hand takes the whole hem at once, as two hands would.
export function grab(sim, x, y) {
  const hand = sim.hand, cl = sim.cloth, P = cl.P;
  if (sim.reset) return false;
  hand.pins = [];
  for (let j = 0; j < NZ; j++) {
    const p = idx(NX - 1, j), k = p * 3;
    hand.pins.push({ p, ox: P[k] - x, oy: P[k + 1] - y, oz: P[k + 2] });
    cl.W[p] = 0;
  }
  hand.x = hand.tx = hand.x0 = x; hand.y = hand.ty = hand.y0 = y;
  hand.follow = false; hand.auto = 0;
  wakeCloth(sim);
  sim.dirty = true;
  sim.events.push({ type: 'grab' });
  return true;
}
export function moveHand(sim, x, y) {
  const hand = sim.hand;
  if (!hand.pins || hand.follow) return;
  hand.tx = Math.min(x, 5); hand.ty = clamp(y, -0.3, 1.6);
  wakeCloth(sim);
}
// A fast release follows through; a slow one lets the hem drop.
export function letGo(sim, vx, vy) {
  const hand = sim.hand;
  if (!hand.pins || hand.follow) return;
  const sp = Math.hypot(vx, vy);
  if (sp > 0.9 && vx > -0.2) {
    const s = Math.min(sp, 8) / sp;
    hand.vx = Math.max(vx * s, 0.35 * Math.min(sp, 8)); hand.vy = vy * s;
    hand.follow = true;
    sim.yankV = Math.min(sp, 8);
    sim.events.push({ type: 'yank', v: sim.yankV });
  } else drop(sim);
}
function drop(sim) {
  const hand = sim.hand, cl = sim.cloth;
  if (!hand.pins) return;
  for (const pin of hand.pins) cl.W[pin.p] = 1;
  hand.pins = null; hand.follow = false; hand.auto = 0;
  sim.events.push({ type: 'release' });
}
// Space: a clean yank at speed v, down and toward the viewer.
export function autoYank(sim, v) {
  if (sim.hand.pins || sim.reset || sim.cloth.onTop < NP * 0.2) return false;
  const P = sim.cloth.P;
  let x = 0, y = 0;
  for (let j = 0; j < NZ; j++) { const k = idx(NX - 1, j) * 3; x += P[k]; y += P[k + 1]; }
  if (!grab(sim, x / NZ, y / NZ)) return false;
  const hand = sim.hand;
  hand.follow = true; hand.auto = v;
  hand.vx = 0; hand.vy = 0;
  sim.yankV = v;
  sim.events.push({ type: 'yank', v });
  return true;
}
function handStep(sim, h, f) {
  const hand = sim.hand;
  if (!hand.pins) return;
  if (!hand.follow) {
    // The hem eases toward the pointer within the frame's substeps.
    hand.x += (hand.tx - hand.x) * f; hand.y += (hand.ty - hand.y) * f;
    return;
  }
  if (hand.auto) {
    // A short wind-up, then the full speed, longer for a slow pull.
    const sp = Math.hypot(hand.vx, hand.vy), ramp = hand.auto * h / (0.05 + 0.25 * clamp(1 - hand.auto / 4));
    const s = Math.min(hand.auto, sp + ramp);
    hand.vx = s * 0.8; hand.vy = hand.y > 0.03 ? -s * 0.6 : 0;
    if (hand.vy === 0) hand.vx = s;
  }
  hand.x += hand.vx * h; hand.y += hand.vy * h;
  // At the floor the pull turns to run along it.
  if (hand.y < 0.02) {
    hand.y = 0.02;
    if (hand.vy < 0) { hand.vx = Math.hypot(hand.vx, hand.vy); hand.vy = 0; }
  }
  hand.tx = hand.x; hand.ty = hand.y;
  const cl = sim.cloth;
  if (cl.onTop === 0) hand.drop += h; else hand.drop = 0;
  if (hand.drop > 0.06 || hand.x > 4.5) {
    drop(sim);
    sim.events.push({ type: 'clear', v: sim.yankV });
  }
}
// The grids follow a cloth that moved while it slept: after a settle or a reset.
function regrid(sim) {
  const P = sim.cloth.P;
  grid3(P); normals(P); hashCloth(sim);
}
function wakeCloth(sim) {
  const cl = sim.cloth;
  if (!cl.awake) { cl.Q.set(cl.P); cl.awake = true; }
  cl.still = 0;
}

/* ---------- pieces ---------- */
function wake(b) { if (!b.awake && !b.gone) { b.awake = true; b.still = 0; } }
// Plane contacts: normal passes first, then one friction solve at the centroid.
// Friction per sphere on a ring makes yaw noise, so it acts once on the whole patch.
const CT = new Float64Array(64 * 11);
function normal(a, cx, cy, cz, nx, ny, nz, e, first) {
  const rax = cx - a.x, ray = cy - a.y, raz = cz - a.z;
  const vn = (a.vx + a.wy * raz - a.wz * ray) * nx + (a.vy + a.wz * rax - a.wx * raz) * ny + (a.vz + a.wx * ray - a.wy * rax) * nz;
  if (vn >= 0) return 0;
  iw(a, ray * nz - raz * ny, raz * nx - rax * nz, rax * ny - ray * nx, IA);
  const k = a.im + nx * (IA[1] * raz - IA[2] * ray) + ny * (IA[2] * rax - IA[0] * raz) + nz * (IA[0] * ray - IA[1] * rax);
  const j = (-(1 + (first && vn < -0.5 ? e : 0)) * vn) / k;
  apply(a, null, j * nx, j * ny, j * nz, rax, ray, raz, 0, 0, 0);
  return j;
}
/* ---------- the cloth's surface for a piece ---------- */
// The quads round a piece, gathered once per contact pass.
const SF = { on: false, best: 1, sgn: 0, F: null };
const SN = [0, 0, 0], SV = [0, 0, 0], CP = [0, 0, 0];
const STAMP = new Int32Array(QN);
let stampN = 0;
const T_SURF = CR + 0.002;
function onTopAt(P, k) { return P[k + 1] < TOP + 0.012 && P[k + 1] > TOP - 0.03 && Math.abs(P[k]) < TABLE.hx - 0.01 && Math.abs(P[k + 2]) < TABLE.hz - 0.01; }
// Each piece keeps its list of quads for one cloth step; its reach covers the drift.
function gather(sim, b) {
  SF.best = 1; SF.sgn = 0;
  let F = b.sfc;
  if (!F) F = b.sfc = { n: 0, at: -1, q: new Int32Array(512), c: new Float32Array(512 * 4), top: new Uint8Array(512) };
  SF.F = F;
  if (F.at === sim.tick) { SF.on = F.n > 0; return; }
  F.at = sim.tick; F.n = 0;
  const P = sim.cloth.P, cut = sim.cloth.cut;
  stampN++;
  near(b.x, b.y, b.z, b.br + 0.04, p => {
    const i = (p / NZ) | 0, j = p - i * NZ;
    for (let qi = i - 1; qi <= i; qi++) for (let qj = j - 1; qj <= j; qj++) {
      if (qi < 0 || qj < 0 || qi >= NX - 1 || qj >= NZ - 1 || F.n >= 512) continue;
      const q = qi * (NZ - 1) + qj;
      if (STAMP[q] === stampN) continue;
      STAMP[q] = stampN;
      const a = idx(qi, qj), c = idx(qi + 1, qj + 1), e = idx(qi + 1, qj), d = idx(qi, qj + 1);
      if (cut[a] | cut[c] | cut[e] | cut[d]) continue;
      const ka = a * 3, kb = e * 3, kc = c * 3, kd = d * 3;
      const cx = (P[ka] + P[kb] + P[kc] + P[kd]) / 4, cy = (P[ka + 1] + P[kb + 1] + P[kc + 1] + P[kd + 1]) / 4, cz = (P[ka + 2] + P[kb + 2] + P[kc + 2] + P[kd + 2]) / 4;
      const r = Math.sqrt(Math.max(
        (P[ka] - cx) ** 2 + (P[ka + 1] - cy) ** 2 + (P[ka + 2] - cz) ** 2, (P[kb] - cx) ** 2 + (P[kb + 1] - cy) ** 2 + (P[kb + 2] - cz) ** 2,
        (P[kc] - cx) ** 2 + (P[kc + 1] - cy) ** 2 + (P[kc + 2] - cz) ** 2, (P[kd] - cx) ** 2 + (P[kd + 1] - cy) ** 2 + (P[kd + 2] - cz) ** 2));
      const o = F.n * 4;
      F.c[o] = cx; F.c[o + 1] = cy; F.c[o + 2] = cz; F.c[o + 3] = r;
      F.top[F.n] = onTopAt(P, ka) && onTopAt(P, kb) && onTopAt(P, kc) && onTopAt(P, kd) ? 1 : 0;
      F.q[F.n++] = q;
    }
  });
  SF.on = F.n > 0;
}
// Closest point on triangle abc to p (Ericson); writes CP, returns the squared distance.
function closest(P, a, b, c, px, py, pz) {
  const ax = P[a], ay = P[a + 1], az = P[a + 2];
  const abx = P[b] - ax, aby = P[b + 1] - ay, abz = P[b + 2] - az, acx = P[c] - ax, acy = P[c + 1] - ay, acz = P[c + 2] - az;
  const apx = px - ax, apy = py - ay, apz = pz - az;
  const d1 = abx * apx + aby * apy + abz * apz, d2 = acx * apx + acy * apy + acz * apz;
  let u, v;
  if (d1 <= 0 && d2 <= 0) { u = 0; v = 0; }
  else {
    const bpx = px - P[b], bpy = py - P[b + 1], bpz = pz - P[b + 2];
    const d3 = abx * bpx + aby * bpy + abz * bpz, d4 = acx * bpx + acy * bpy + acz * bpz;
    const cpx = px - P[c], cpy = py - P[c + 1], cpz = pz - P[c + 2];
    const d5 = abx * cpx + aby * cpy + abz * cpz, d6 = acx * cpx + acy * cpy + acz * cpz;
    const vc = d1 * d4 - d3 * d2, vb = d5 * d2 - d1 * d6, va = d3 * d6 - d5 * d4;
    if (d3 >= 0 && d4 <= d3) { u = 1; v = 0; }
    else if (d6 >= 0 && d5 <= d6) { u = 0; v = 1; }
    else if (vc <= 0 && d1 >= 0 && d3 <= 0) { u = d1 / (d1 - d3); v = 0; }
    else if (vb <= 0 && d2 >= 0 && d6 <= 0) { u = 0; v = d2 / (d2 - d6); }
    else if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) { const w = (d4 - d3) / ((d4 - d3) + (d5 - d6)); u = 1 - w; v = w; }
    else { const dn = 1 / (va + vb + vc); u = vb * dn; v = vc * dn; }
  }
  CP[0] = ax + abx * u + acx * v; CP[1] = ay + aby * u + acy * v; CP[2] = az + abz * u + acz * v;
  BW[0] = 1 - u - v; BW[1] = u; BW[2] = v;
  return (px - CP[0]) ** 2 + (py - CP[1]) ** 2 + (pz - CP[2]) ** 2;
}
const BW = [0, 0, 0], BEST = { d2: 0, x: 0, y: 0, z: 0, nx: 0, ny: 0, nz: 0, vx: 0, vy: 0, vz: 0, top: 0 };
// A sphere against the cloth near it. Returns the depth past the cloth's skin, or 0.
// The piece keeps to its own side of the cloth; side flips only while the two are apart.
function surfaceAt(sim, b, s, x, y, z, r) {
  const cl = sim.cloth, P = cl.P, Q = cl.Q, reach = r + T_SURF + 0.03;
  let best = reach * reach, hit = false;
  const F = SF.F;
  for (let m = 0; m < F.n; m++) {
    const o = m * 4, ex = x - F.c[o], ey = y - F.c[o + 1], ez = z - F.c[o + 2], R = F.c[o + 3] + reach;
    if (ex * ex + ey * ey + ez * ez > R * R) continue;
    const q = F.q[m], qi = (q / (NZ - 1)) | 0, qj = q - qi * (NZ - 1);
    const a = idx(qi, qj) * 3, e = idx(qi + 1, qj) * 3, c = idx(qi + 1, qj + 1) * 3, d = idx(qi, qj + 1) * 3;
    for (let t = 0; t < 2; t++) {
      const t0 = a, t1 = t ? c : e, t2 = t ? d : c;
      const d2 = closest(P, t0, t1, t2, x, y, z);
      if (d2 >= best) continue;
      best = d2; hit = true;
      // The top side: z run crossed with x run.
      const ix = t ? P[c] - P[d] : P[e] - P[a], iy = t ? P[c + 1] - P[d + 1] : P[e + 1] - P[a + 1], iz = t ? P[c + 2] - P[d + 2] : P[e + 2] - P[a + 2];
      const jx = t ? P[d] - P[a] : P[c] - P[e], jy = t ? P[d + 1] - P[a + 1] : P[c + 1] - P[e + 1], jz = t ? P[d + 2] - P[a + 2] : P[c + 2] - P[e + 2];
      let nx = jy * iz - jz * iy, ny = jz * ix - jx * iz, nz = jx * iy - jy * ix;
      const nl = Math.hypot(nx, ny, nz) || 1;
      BEST.nx = nx / nl; BEST.ny = ny / nl; BEST.nz = nz / nl;
      BEST.x = CP[0]; BEST.y = CP[1]; BEST.z = CP[2]; BEST.top = F.top[m];
      const k = 1 / (2 * H);
      BEST.vx = ((P[t0] - Q[t0]) * BW[0] + (P[t1] - Q[t1]) * BW[1] + (P[t2] - Q[t2]) * BW[2]) * k;
      BEST.vy = ((P[t0 + 1] - Q[t0 + 1]) * BW[0] + (P[t1 + 1] - Q[t1 + 1]) * BW[1] + (P[t2 + 1] - Q[t2 + 1]) * BW[2]) * k;
      BEST.vz = ((P[t0 + 2] - Q[t0 + 2]) * BW[0] + (P[t1 + 2] - Q[t1 + 2]) * BW[1] + (P[t2 + 2] - Q[t2 + 2]) * BW[2]) * k;
    }
  }
  if (!hit) return 0;
  const dist = Math.sqrt(best), ox = x - BEST.x, oy = y - BEST.y, oz = z - BEST.z;
  const along = ox * BEST.nx + oy * BEST.ny + oz * BEST.nz;
  if (dist - r < SF.best) { SF.best = dist - r; SF.sgn = Math.sign(along) || SF.sgn; }
  // Cloth flat on the top, and all cloth over the top, belongs to the slab contact.
  if (BEST.top || (y > TOP - 0.03 && Math.abs(x) < TABLE.hx + 0.005 && Math.abs(z) < TABLE.hz + 0.005)) return 0;
  const side = b.cside || 1;
  let pen;
  if (along * side < -1e-4) {
    // A centre just past the cloth goes back to its side.
    // Far past, the side is in doubt: no push.
    if (dist > 0.012) return 0;
    pen = dist + r + T_SURF;
    SN[0] = BEST.nx * side; SN[1] = BEST.ny * side; SN[2] = BEST.nz * side;
  } else {
    pen = r + T_SURF - dist;
    if (dist > 1e-5) { SN[0] = ox / dist; SN[1] = oy / dist; SN[2] = oz / dist; }
    else { SN[0] = BEST.nx * side; SN[1] = BEST.ny * side; SN[2] = BEST.nz * side; }
  }
  if (pen <= 0) return 0;
  // A deep pass is a tunnel through a fold, not a contact: cap the push.
  pen = Math.min(pen, 0.02);
  // The normal pass ignores the cloth's speed; friction takes its tangent part.
  const vn = BEST.vx * SN[0] + BEST.vy * SN[1] + BEST.vz * SN[2];
  SV[0] = BEST.vx - vn * SN[0]; SV[1] = BEST.vy - vn * SN[1]; SV[2] = BEST.vz - vn * SN[2];
  return pen;
}
function contacts(sim, b, h, events) {
  const S = b.S, L = b.L, shard = b.kind === 'shard';
  let n = 0, deep = 0, dx = 0, dy = 0, dz = 0, under = false, cv = 0;
  SF.on = false;
  // A shard meets the cloth only near the floor, where it lies in a heap.
  if (!shard || b.y < 0.25) gather(sim, b);
  for (let s = 0; s < L.length && n < 64; s++) {
    const x = S[s * 3], y = S[s * 3 + 1], z = S[s * 3 + 2], r = L[s][3];
    if (y < TOP + 0.06 && y > TOP - 0.1 && Math.abs(x) < TABLE.hx + 0.05 && Math.abs(z) < TABLE.hz + 0.05) {
      let d = slab(x, y, z) - r;
      const nx = N3[0], ny = N3[1], nz = N3[2];
      const C = ny > 0.5 && !shard ? clothUnder(sim, x, z, h) : null;
      if (C) d -= CLOTH.thick;
      if (d < 0) {
        if (C) { under = true; cv = Math.max(cv, Math.hypot(C[0], C[2])); }
        const o = n++ * 11;
        CT[o] = x - nx * r; CT[o + 1] = y - ny * r; CT[o + 2] = z - nz * r; CT[o + 3] = nx; CT[o + 4] = ny; CT[o + 5] = nz;
        CT[o + 6] = C ? C[0] : 0; CT[o + 7] = C ? C[2] : 0; CT[o + 8] = C ? MU_CLOTH : MU_WOOD; CT[o + 9] = E_WOOD; CT[o + 10] = C ? C[1] : 0;
        if (-d > deep) { deep = -d; dx = nx; dy = ny; dz = nz; }
      }
    }
    // Off the top, a piece meets the cloth's own surface: a hanging face, a heap, a flying sheet.
    if (n < 64 && SF.on) {
      const pen = surfaceAt(sim, b, s, x, y, z, r);
      if (pen > 0) {
        const o = n++ * 11;
        CT[o] = x - SN[0] * r; CT[o + 1] = y - SN[1] * r; CT[o + 2] = z - SN[2] * r; CT[o + 3] = SN[0]; CT[o + 4] = SN[1]; CT[o + 5] = SN[2];
        CT[o + 6] = SV[0]; CT[o + 7] = SV[2]; CT[o + 8] = 0.3; CT[o + 9] = 0.05; CT[o + 10] = SV[1];
        if (pen > deep) { deep = pen; dx = SN[0]; dy = SN[1]; dz = SN[2]; }
        if (SN[1] > 0.3) { under = true; cv = Math.max(cv, Math.hypot(SV[0], SV[2])); }
      }
    }
    // The legs stand in the way of a falling piece.
    if (y < BY0 + 0.02 && n < 64) {
      for (const [lx, lz] of LEGS) {
        const ex = x - lx, ez = z - lz, R = LEG_R + r, d2 = ex * ex + ez * ez;
        if (d2 >= R * R) continue;
        const d = Math.sqrt(d2) || 1e-9, o = n++ * 11, nx = ex / d, nz = ez / d;
        CT[o] = x - nx * r; CT[o + 1] = y; CT[o + 2] = z - nz * r; CT[o + 3] = nx; CT[o + 4] = 0; CT[o + 5] = nz;
        CT[o + 6] = 0; CT[o + 7] = 0; CT[o + 8] = MU_WOOD; CT[o + 9] = E_WOOD; CT[o + 10] = 0;
        if (R - d > deep) { deep = R - d; dx = nx; dy = 0; dz = nz; }
      }
    }
    if (y - r < 0 && n < 64) {
      const o = n++ * 11;
      CT[o] = x; CT[o + 1] = 0; CT[o + 2] = z; CT[o + 3] = 0; CT[o + 4] = 1; CT[o + 5] = 0;
      CT[o + 6] = 0; CT[o + 7] = 0; CT[o + 8] = MU_FLOOR; CT[o + 9] = shard ? 0.3 : E_FLOOR; CT[o + 10] = 0;
      if (r - y > deep) { deep = r - y; dx = 0; dy = 1; dz = 0; }
    }
  }
  // Apart from the cloth, a piece learns which side of it it is on.
  if (SF.on && SF.best > 0.02 && SF.sgn) b.cside = SF.sgn;
  if (n) {
    // The closing speed before any impulse drives sound and breaks.
    let hit = 0, hx = 0, hz = 0, floor = false;
    for (let c = 0; c < n; c++) {
      const o = c * 11, rax = CT[o] - b.x, ray = CT[o + 1] - b.y, raz = CT[o + 2] - b.z;
      const vn = (b.vx + b.wy * raz - b.wz * ray) * CT[o + 3] + (b.vy + b.wz * rax - b.wx * raz) * CT[o + 4] + (b.vz + b.wx * ray - b.wy * rax) * CT[o + 5];
      // Cloth on the boards pads a fall no more than the boards do.
      if (-vn > hit) { hit = -vn; hx = CT[o]; hz = CT[o + 2]; floor = CT[o + 1] < 0.03 && CT[o + 4] > 0.7; }
    }
    let J = 0;
    for (let it = 0; it < 3; it++) for (let c = 0; c < n; c++) {
      const o = c * 11;
      J += normal(b, CT[o], CT[o + 1], CT[o + 2], CT[o + 3], CT[o + 4], CT[o + 5], CT[o + 9], it === 0);
    }
    // One friction impulse at the centroid, capped by the total normal impulse.
    let px = 0, py = 0, pz = 0, nx = 0, ny = 0, nz = 0, sx = 0, sy = 0, sz = 0, mu = 0;
    for (let c = 0; c < n; c++) {
      const o = c * 11;
      px += CT[o]; py += CT[o + 1]; pz += CT[o + 2]; nx += CT[o + 3]; ny += CT[o + 4]; nz += CT[o + 5];
      sx += CT[o + 6]; sz += CT[o + 7]; sy += CT[o + 10]; mu += CT[o + 8];
    }
    px /= n; py /= n; pz /= n; sx /= n; sy /= n; sz /= n; mu /= n;
    const nl = Math.hypot(nx, ny, nz) || 1; nx /= nl; ny /= nl; nz /= nl;
    if (J > 0) {
      const rax = px - b.x, ray = py - b.y, raz = pz - b.z;
      const vx = b.vx + b.wy * raz - b.wz * ray - sx, vy = b.vy + b.wz * rax - b.wx * raz - sy, vz = b.vz + b.wx * ray - b.wy * rax - sz;
      const vn = vx * nx + vy * ny + vz * nz;
      let tx = vx - vn * nx, ty = vy - vn * ny, tz = vz - vn * nz;
      const vt = Math.hypot(tx, ty, tz);
      if (vt > 1e-7) {
        tx /= vt; ty /= vt; tz /= vt;
        iw(b, ray * tz - raz * ty, raz * tx - rax * tz, rax * ty - ray * tx, IA);
        const kt = b.im + tx * (IA[1] * raz - IA[2] * ray) + ty * (IA[2] * rax - IA[0] * raz) + tz * (IA[0] * ray - IA[1] * rax);
        const jt = -Math.min(vt / kt, mu * J);
        apply(b, null, jt * tx, jt * ty, jt * tz, rax, ray, raz, 0, 0, 0);
      }
      // Torsion: the patch resists a spin about its normal.
      let rb = 0;
      for (let c = 0; c < n; c++) { const o = c * 11; rb += Math.hypot(CT[o] - px, CT[o + 1] - py, CT[o + 2] - pz); }
      rb = rb / n * 0.67;
      // A piece at rest on a surface stops rocking within about a second.
      if (hit < 0.3 && !shard) { const k = 0.988; b.wx *= k; b.wy *= k; b.wz *= k; }
      const wn = b.wx * nx + b.wy * ny + b.wz * nz;
      iw(b, nx, ny, nz, IA);
      const kn = IA[0] * nx + IA[1] * ny + IA[2] * nz;
      if (kn > 0) {
        const m = mu * J * Math.max(rb, 0.002), dl = -clamp(wn / kn, -m, m);
        b.wx += IA[0] * dl; b.wy += IA[1] * dl; b.wz += IA[2] * dl;
      }
    }
    if (hit > 0.3) {
      if (floor && BREAKS.has(b.kind) && hit > BREAK_V[b.kind] && !b.breakAt) b.breakAt = { v: hit, x: hx, z: hz };
      else if (events) events.push({ type: shard ? 'tink' : floor ? 'floor' : 'knock', kind: b.kind, sub: b.sub, v: hit, x: hx, y: floor ? 0 : TOP, z: hz, cloth: under });
    }
  }
  if (deep > 0) {
    const m = Math.max(0, deep - 0.0005) * 0.8;
    b.x += dx * m; b.y += dy * m; b.z += dz * m;
    spheres(b);
  }
  // The trailing edge of the cloth flicks a piece as it slips out.
  if (!shard) {
    if (b.onCloth && !under && b.clothV > 0.7 && !b.kicked && b.y < TOP + 0.3) { b.kicked = true; kick(sim, b, b.clothV, events || []); }
    b.onCloth = under; b.clothV = under ? cv : b.clothV * 0.5;
  }
}
function kick(sim, b, v, events) {
  const k = clamp(v / 6, 0.15, 1), j = Math.random;
  const tall = b.kind === 'wine' || b.kind === 'tumbler' || b.kind === 'stick';
  b.vy += tall ? 0.015 + 0.025 * k : 0.035 + 0.06 * k;
  // A tall piece rocks; a flat one only jumps.
  const spin = tall ? 0.9 * k : 4 * k;
  b.wx += (j() - 0.5) * spin; b.wz += (j() - 0.3) * spin * (tall ? 1 : 0.4); b.wy += (j() - 0.5) * (tall ? 0.6 : 2.4) * k;
  events.push({ type: 'kick', kind: b.kind, v: k, x: b.x, y: b.y, z: b.z });
}
function pairs(sim, events) {
  const B = sim.bodies;
  for (let a = 0; a < B.length; a++) {
    const A = B[a];
    if (A.gone) continue;
    for (let c = a + 1; c < B.length; c++) {
      const C = B[c];
      if (C.gone || (!A.awake && !C.awake)) continue;
      const dx = A.x - C.x, dy = A.y - C.y, dz = A.z - C.z, rr = A.br + C.br;
      if (dx * dx + dy * dy + dz * dz > rr * rr) continue;
      for (let i = 0; i < A.L.length; i++) for (let k = 0; k < C.L.length; k++) {
        const ex = A.S[i * 3] - C.S[k * 3], ey = A.S[i * 3 + 1] - C.S[k * 3 + 1], ez = A.S[i * 3 + 2] - C.S[k * 3 + 2];
        const r = A.L[i][3] + C.L[k][3], d2 = ex * ex + ey * ey + ez * ez;
        if (d2 >= r * r) continue;
        const d = Math.sqrt(d2) || 1e-9, nx = ex / d, ny = ey / d, nz = ez / d, pen = r - d;
        wake(A); wake(C);
        const px = C.S[k * 3] + nx * C.L[k][3], py = C.S[k * 3 + 1] + ny * C.L[k][3], pz = C.S[k * 3 + 2] + nz * C.L[k][3];
        const v = impulse(A, C, px, py, pz, nx, ny, nz, 0.25, 0.3);
        const s = pen * 0.4 * (A.im / (A.im + C.im)), t = pen * 0.4 - s;
        A.x += nx * s; A.y += ny * s; A.z += nz * s; C.x -= nx * t; C.y -= ny * t; C.z -= nz * t;
        spheres(A); spheres(C);
        if (v > 0.3) events.push({ type: 'clink', kind: A.kind, other: C.kind, v, x: px, y: py, z: pz });
      }
    }
  }
}

/* ---------- shatter ---------- */
const plans = new Map();
// Each breakable piece keeps one shard plan; a new round turns it.
export function planOf(b) {
  if (!plans.has(b)) plans.set(b, shardPlan(b.kind));
  return plans.get(b);
}
function shatter(sim, b, events) {
  const at = b.breakAt;
  b.breakAt = null; b.gone = true; b.awake = false;
  const plan = planOf(b);
  const turn = Math.random() * Math.PI * 2, ct = Math.cos(turn / 2), st = Math.sin(turn / 2);
  // The shard frame is the piece's frame turned about its axis.
  const qx = b.qx * ct - b.qz * st, qy = b.qy * ct + b.qw * st, qz = b.qz * ct + b.qx * st, qw = b.qw * ct - b.qy * st;
  const R = new Float64Array(9);
  rotOf({ qx, qy, qz, qw }, R);
  plan.forEach((pl, n) => {
    const lx = pl.c[0] - b.c[0], ly = pl.c[1] - b.c[1], lz = pl.c[2] - b.c[2];
    const s = {
      kind: 'shard', sub: b.kind, plan: n, owner: b, m: 0.03, im: 1 / 0.03, IX: 1 / 1.5e-5, IY: 1 / 2.5e-5, IZ: 1 / 1.5e-5,
      L: pl.pts.map(([x, y, z]) => [x - pl.c[0], y - pl.c[1], z - pl.c[2], 0.0025]),
      S: new Float64Array(pl.pts.length * 3), R: new Float64Array(9),
      br: Math.max(...pl.pts.map(([x, y, z]) => Math.hypot(x - pl.c[0], y - pl.c[1], z - pl.c[2]))) + 0.003,
      x: b.x + R[0] * lx + R[1] * ly + R[2] * lz, y: Math.max(0.006, b.y + R[3] * lx + R[4] * ly + R[5] * lz), z: b.z + R[6] * lx + R[7] * ly + R[8] * lz,
      qx, qy, qz, qw, awake: true, still: 0, gone: false, age: 0, fade: 1, cside: b.cside,
    };
    // Pieces burst out across the boards, the base pieces least.
    const dx = s.x - at.x, dz = s.z - at.z, dl = Math.hypot(dx, dz) || 1, base = n === 0;
    const burst = (base ? 0.25 : 0.6 + Math.random() * 1.2) * clamp(at.v / 3.5, 0.5, 1.4);
    s.vx = b.vx * 0.3 + dx / dl * burst + (Math.random() - 0.5) * 0.4;
    s.vz = b.vz * 0.3 + dz / dl * burst + (Math.random() - 0.5) * 0.4;
    s.vy = (base ? 0.3 : 0.5 + Math.random() * 1.1) * clamp(at.v / 3.5, 0.5, 1.2);
    s.wx = (Math.random() - 0.5) * 30; s.wy = (Math.random() - 0.5) * 20; s.wz = (Math.random() - 0.5) * 30;
    rotOf(s, s.R); spheres(s);
    sim.shards.push(s);
  });
  // Glitter: small bright chips that skitter and spin.
  const n = b.kind === 'plate' ? 18 : 30;
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, sp = 0.4 + Math.random() * 1.8;
    sim.glitter.push({
      sub: b.kind, x: at.x, y: 0.01, z: at.z, vx: Math.cos(a) * sp, vy: 0.4 + Math.random() * 1.4, vz: Math.sin(a) * sp,
      rx: Math.random() * 6, ry: Math.random() * 6, sx: (Math.random() - 0.5) * 40, sy: (Math.random() - 0.5) * 40,
      s: 0.003 + Math.random() * 0.006, still: false, fade: 1,
    });
  }
  // The liquid splashes out over the boards.
  if (b.liq && b.liq.f > 0) {
    splash(sim, b.liq.kind, at.x, 0.01, at.z, b.vx, b.vz, 26);
    puddle(sim, b.liq.kind, at.x, 0.0012, at.z, b.liq.kind === 'wine' ? 0.16 : 0.13, true);
    b.liq.f = 0;
  }
  events.push({ type: 'shatter', kind: b.kind, v: at.v, x: at.x, y: 0, z: at.z });
}
function splash(sim, kind, x, y, z, vx, vz, n) {
  for (let i = 0; i < n && sim.drops.length < 220; i++) {
    const a = Math.random() * Math.PI * 2, sp = 0.3 + Math.random() * 1.4;
    sim.drops.push({ kind, x, y, z, vx: vx * 0.3 + Math.cos(a) * sp, vy: 0.3 + Math.random() * 1.2, vz: vz * 0.3 + Math.sin(a) * sp, s: 0.0025 + Math.random() * 0.004 });
  }
}
function puddle(sim, kind, x, y, z, r, fast) {
  // A puddle on the table stops at its edge.
  if (y > TOP - 0.01) r = Math.min(r, Math.max(0.01, Math.min(TABLE.hx - Math.abs(x), TABLE.hz - Math.abs(z)) - 0.004));
  // A drop near a puddle feeds it.
  for (const p of sim.puddles) {
    if (p.kind === kind && Math.abs(p.y - y) < 0.01 && Math.hypot(p.x - x, p.z - z) < p.max * 0.8) { p.max = Math.min(p.cap, Math.hypot(p.max, r * 0.35)); return; }
  }
  if (sim.puddles.length >= 14) return;
  const cap = y > TOP - 0.01 ? Math.max(0.01, Math.min(TABLE.hx - Math.abs(x), TABLE.hz - Math.abs(z)) - 0.004) : 0.24;
  sim.puddles.push({ kind, x, y, z, r: fast ? r * 0.25 : r * 0.4, max: Math.min(r, cap), cap, seed: Math.random() * 100, fade: 1 });
}

/* ---------- step ---------- */
export function step(sim, dt) {
  if (sim.reset) { resetTick(sim, dt); return; }
  sim.acc = Math.min(sim.acc + dt, 1 / 20);
  const n = Math.floor(sim.acc / H);
  const events = sim.events;
  for (let s = 0; s < n; s++) {
    sim.acc -= H; sim.t += H;
    handStep(sim, H, 1 / (n - s));
    const cl = sim.cloth;
    // The cloth steps at 120 Hz; the pieces at 240 Hz.
    sim.n = (sim.n || 0) + 1;
    // Quad lists last two substeps.
    if (sim.n & 1) sim.tick = (sim.tick || 0) + 1;
    if (cl.awake && (sim.n & 1)) {
      clothStep(sim, H * 2);
      hashCloth(sim);
    }
    // A piece wakes when the cloth under it moves.
    for (const b of sim.bodies) {
      if (b.awake || b.gone || !cl.awake) continue;
      const C = clothUnder(sim, b.S[0], b.S[2], H);
      if (C && Math.hypot(C[0], C[2]) > 0.03) wake(b);
    }
    for (const b of sim.bodies) {
      if (!b.awake) continue;
      b.pvx = b.vx; b.pvz = b.vz;
      b.vy -= G * H;
      // Air and rolling losses settle a rocking glass.
      const ad = 1 - 1.2 * H;
      b.wx *= ad; b.wy *= ad; b.wz *= ad;
    }
    for (let it = 0; it < 2; it++) {
      for (const b of sim.bodies) if (b.awake) contacts(sim, b, H, it ? null : events);
      pairs(sim, it ? [] : events);
    }
    for (const b of sim.bodies) {
      if (!b.awake) continue;
      integrate(b, H);
      b.ax = b.ax * 0.7 + (b.vx - b.pvx) / H * 0.3; b.az = b.az * 0.7 + (b.vz - b.pvz) / H * 0.3;
      sloshStep(sim, b, H);
      if (b.breakAt) shatter(sim, b, events);
    }
    for (const b of sim.bodies) if (!b.awake && b.liq) { b.ax *= 0.9; b.az *= 0.9; sloshStep(sim, b, H); }
    // Shards meet only the table and the floor.
    for (const s of sim.shards) {
      if (!s.awake) continue;
      s.vy -= G * H;
      s.wx *= 0.995; s.wy *= 0.995; s.wz *= 0.995;
      contacts(sim, s, H, s.age < 1.5 ? events : null);
      integrate(s, H);
    }
  }
  const h = dt;
  pours(sim, h, events);
  particles(sim, h, events);
  flame(sim, h);
  if (sim.embers.length) embers(sim, h);
  if (sim.fireT) { douse(sim); burn(sim, h); }
  settleTest(sim, h);
}
function pours(sim, h, events) {
  for (const b of sim.bodies) {
    const L = b.liq;
    if (!L || L.pour <= 0) continue;
    // A stream leaves from the low side of the rim.
    const R = b.R, rim = RIM[b.kind] - b.c[1];
    const ox = R[1] * rim, oy = R[4] * rim, oz = R[7] * rim;
    const lx = -L.sx - R[1] * 0.3, lz = -L.sz - R[7] * 0.3, ll = Math.hypot(lx, lz) || 1;
    const rr = 0.033, n = Math.min(4, 1 + Math.floor(L.pour * 200));
    for (let i = 0; i < n && sim.drops.length < 220; i++) {
      sim.drops.push({ kind: L.kind, x: b.x + ox - lx / ll * rr, y: b.y + oy, z: b.z + oz - lz / ll * rr, vx: b.vx - lx / ll * 0.25 + (Math.random() - 0.5) * 0.08, vy: b.vy + 0.05, vz: b.vz - lz / ll * 0.25 + (Math.random() - 0.5) * 0.08, s: 0.003 + Math.random() * 0.003 });
    }
    events.push({ type: 'pour', kind: L.kind, v: Math.min(1, L.pour * 60), x: b.x, y: b.y, z: b.z });
    L.pour = 0;
  }
}
function particles(sim, h, events) {
  const D = sim.drops;
  for (let i = D.length - 1; i >= 0; i--) {
    const d = D[i];
    d.vy -= G * h; d.x += d.vx * h; d.y += d.vy * h; d.z += d.vz * h;
    const onTable = Math.abs(d.x) < TABLE.hx && Math.abs(d.z) < TABLE.hz;
    const floorY = onTable && d.y > TOP - 0.05 ? TOP + 0.001 : 0.001;
    if (d.y < floorY) {
      puddle(sim, d.kind, d.x, floorY + (onTable ? CLOTH.thick : 0), d.z, onTable ? 0.05 : 0.08, false);
      if (Math.random() < 0.15) events.push({ type: 'drip', kind: d.kind, x: d.x, y: floorY, z: d.z });
      D.splice(i, 1);
    }
  }
  for (const g of sim.glitter) {
    if (g.still) continue;
    g.vy -= G * h; g.x += g.vx * h; g.y += g.vy * h; g.z += g.vz * h; g.rx += g.sx * h; g.ry += g.sy * h;
    if (g.y < g.s * 0.3) {
      g.y = g.s * 0.3;
      if (g.vy < -0.6 && Math.random() < 0.3) events.push({ type: 'tink', sub: g.sub, v: -g.vy * 0.4, x: g.x, y: 0, z: g.z });
      g.vy = -g.vy * 0.25; g.vx *= 0.6; g.vz *= 0.6; g.sx *= 0.5; g.sy *= 0.5;
      // A chip comes to rest flat on the boards.
      if (Math.abs(g.vy) < 0.08 && Math.hypot(g.vx, g.vz) < 0.05) { g.still = true; g.rx = Math.PI / 2; g.vx = g.vz = 0; }
    }
  }
  for (const p of sim.puddles) if (p.r < p.max) p.r = Math.min(p.max, p.r + (p.max - p.r) * h * 3 + h * 0.01);
}
// The candle flame leans in the wind of the passing cloth.
// A fallen candle burns on for a few seconds and lights any cloth at its flame.
const FP = [0, 0, 0];
function flamePoint(b) {
  const R = b.R, ly = CANDLE.y1 + 0.014 - b.c[1];
  FP[0] = b.x + R[1] * ly;
  FP[1] = b.y + R[4] * ly;
  FP[2] = b.z + R[7] * ly;
  // The flame rises from the wick, whatever the candle's lean.
  FP[1] += 0.008 * (1 - Math.max(0, R[4]));
  return FP;
}
function flame(sim, h) {
  const st = sim.bodies.find(b => b.kind === 'stick'), F = sim.flame;
  const cl = sim.cloth;
  // Only a cloth still on the table passes the candle.
  const wind = cl.awake && cl.onTop > 0 ? clamp(cl.speed * 0.08, 0, 0.6) : 0;
  sim.wind = wind;
  F.v += (-90 * (F.lean - wind) - 9 * F.v) * h;
  F.lean = clamp(F.lean + F.v * h, -0.9, 0.9);
  if (!st || F.out) { if (F.out) F.out = Math.min(1, F.out + h * 3.5); return; }
  const down = st.gone || st.R[4] < 0.55;
  F.down = down ? F.down + h : 0;
  // A hard fall or a long wait puts it out; so does the fire it lit.
  const hard = down && Math.hypot(st.vx, st.vy, st.vz) > 3.2;
  if (st.gone || hard || F.down > 5 || (sim.burning > 6 && F.down > 1.5)) {
    F.out = 1e-3; sim.events.push({ type: 'snuff', x: st.x, y: st.y, z: st.z });
    return;
  }
  const [fx, fy, fz] = flamePoint(st);
  // As it lands, the candle throws burning wax: a spray of embers round the flame.
  if (F.down > 0.12 && !F.spat) {
    F.spat = true;
    for (let i = 0; i < 16; i++) {
      const a = Math.random() * Math.PI * 2, sp = 0.5 + Math.random() * 1.8;
      sim.embers.push({ x: fx, y: fy + 0.01, z: fz, vx: Math.cos(a) * sp + st.vx * 0.5, vy: 0.6 + Math.random() * 1.6, vz: Math.sin(a) * sp + st.vz * 0.5, life: 1, s: 0.0025 + Math.random() * 0.003 });
    }
    sim.events.push({ type: 'spit', x: fx, y: fy, z: fz });
  }
  // The flame lights cloth that touches it; an upright flame needs a longer touch.
  let best = -1, bd = (down ? 0.07 : 0.025) ** 2;
  const P = cl.P;
  near(fx, fy, fz, 0.07, p => {
    if (cl.cut[p] || cl.fuel[p] < 0.5) return;
    const d = (P[p * 3] - fx) ** 2 + (P[p * 3 + 1] - fy) ** 2 + (P[p * 3 + 2] - fz) ** 2;
    if (d < bd) { bd = d; best = p; }
  });
  F.touch = best >= 0 ? F.touch + h : 0;
  if (best >= 0 && F.touch > (down ? 0.05 : 0.6) && cl.heat[best] < 1) {
    cl.heat[best] = 1.4;
    if (!sim.fireT) sim.events.push({ type: 'ignite', x: fx, y: fy, z: fz });
    sim.fireT = sim.fireT || 1e-3;
    wakeCloth(sim);
  }
}

/* ---------- fire ---------- */
// Each particle holds heat and fuel. Heat past 1 lights it.
// A lit particle burns its fuel in about BURN_T seconds and heats its neighbours.
// Cloth above a flame catches fast; cloth below catches slowly.
// Spent fuel cuts the particle out of the cloth: a hole with a glowing edge.
const BURN_T = 6, SPREAD = 0.9, UPHILL = 7;
const NB = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
// Embers fly, bounce low and die; one that lands on cloth lights it.
function embers(sim, h) {
  const E = sim.embers, cl = sim.cloth, P = cl.P;
  for (let i = E.length - 1; i >= 0; i--) {
    const e = E[i];
    e.vy -= G * h; e.x += e.vx * h; e.y += e.vy * h; e.z += e.vz * h;
    e.life -= h / 1.8;
    const onTable = Math.abs(e.x) < TABLE.hx && Math.abs(e.z) < TABLE.hz && e.y > TOP - 0.05;
    const floorY = onTable ? TOP + 0.003 : 0.003;
    if (e.y < floorY) { e.y = floorY; e.vy *= -0.25; e.vx *= 0.5; e.vz *= 0.5; }
    let hit = -1;
    near(e.x, e.y, e.z, 0.035, p => {
      if (hit < 0 && !cl.cut[p] && cl.fuel[p] > 0.5 && (P[p * 3] - e.x) ** 2 + (P[p * 3 + 1] - e.y) ** 2 + (P[p * 3 + 2] - e.z) ** 2 < 0.035 * 0.035) hit = p;
    });
    if (hit >= 0 && e.life < 0.97) {
      if (cl.heat[hit] < 1) {
        cl.heat[hit] = 1.4;
        if (!sim.fireT) sim.events.push({ type: 'ignite', x: e.x, y: e.y, z: e.z });
        sim.fireT = sim.fireT || 1e-3;
        wakeCloth(sim);
      }
      E.splice(i, 1);
      continue;
    }
    if (e.life <= 0) E.splice(i, 1);
  }
}
function burn(sim, h) {
  const cl = sim.cloth, P = cl.P, heat = cl.heat, fuel = cl.fuel, cut = cl.cut;
  let n = 0, sx = 0, sy = 0, sz = 0;
  for (let p = 0; p < NP; p++) {
    if (cut[p]) continue;
    if (heat[p] < 1 || fuel[p] <= 0) {
      // Warm cloth cools slowly.
      if (heat[p] > 0) heat[p] = Math.max(0, heat[p] - h * 0.12);
      continue;
    }
    n++;
    const k = p * 3, x = P[k], y = P[k + 1], z = P[k + 2];
    sx += x; sy += y; sz += z;
    // Each patch burns at its own pace, so the front stays ragged.
    fuel[p] -= h / BURN_T * (0.7 + 0.6 * ((p * 0.618) % 1));
    SHRINK[p] = 0.82 + 0.18 * Math.max(0, fuel[p]);
    if (fuel[p] <= 0) { fuel[p] = 0; cut[p] = 1; continue; }
    const i = (p / NZ) | 0, j = p - i * NZ;
    // A young flame spreads slower than a full one.
    const g = SPREAD * h * Math.min(1, (1 - fuel[p]) * 4 + 0.25);
    for (const [di, dj] of NB) {
      const a = i + di, b = j + dj;
      if (a < 0 || b < 0 || a >= NX || b >= NZ) continue;
      const q = a * NZ + b;
      if (cut[q] || fuel[q] <= 0 || heat[q] >= 1) continue;
      const dy = P[q * 3 + 1] - y, dl = Math.hypot(P[q * 3] - x, dy, P[q * 3 + 2] - z) || 1;
      const up = dy / dl, f = up > 0 ? 1 + UPHILL * up * up : 1 + 0.6 * up;
      heat[q] += g * f / (di && dj ? 1.4 : 1);
    }
  }
  // Rising heat lights cloth that hangs over a fire, though it is no neighbour.
  // A tenth of the fire looks up each frame.
  if (n) {
    const off = (sim.burnScan = ((sim.burnScan || 0) + 1) % 10);
    for (let p = off; p < NP; p += 10) {
      if (cut[p] || heat[p] < 1 || fuel[p] <= 0) continue;
      const k = p * 3;
      near(P[k], P[k + 1] + 0.09, P[k + 2], 0.08, q => {
        if (cut[q] || fuel[q] <= 0 || heat[q] >= 1 || P[q * 3 + 1] < P[k + 1] + 0.02) return;
        heat[q] += h * 22;
      });
    }
  }
  sim.burning = n;
  if (n) cl.marked = true;
  if (n) { sim.fireC[0] = sx / n; sim.fireC[1] = sy / n; sim.fireC[2] = sz / n; }
  // Smoke lingers after the last flame; the sim stays busy for it.
  sim.fireT = n ? 1e-3 : sim.fireT + h;
  if (sim.fireT > 7) sim.fireT = 0;
  if (n && !cl.awake) wakeCloth(sim);
}
// Wine and water put out the cloth they soak.
function douse(sim) {
  const cl = sim.cloth, P = cl.P;
  for (const d of sim.puddles) {
    if (d.r < 0.02) continue;
    near(d.x, d.y, d.z, d.r, p => {
      const k = p * 3;
      if (Math.abs(P[k + 1] - d.y) < 0.03 && Math.hypot(P[k] - d.x, P[k + 2] - d.z) < d.r * 0.85) cl.heat[p] = Math.min(cl.heat[p], 0.2);
    });
  }
}
function settleTest(sim, h) {
  const cl = sim.cloth, hand = sim.hand;
  // The cloth sleeps when no particle moves 3 mm in a quarter second.
  // A cloth that has left the table sleeps 2 s later, once it lies low.
  cl.offT = cl.awake && !hand.pins && cl.onTop === 0 ? (cl.offT || 0) + h : 0;
  if (cl.offT > 2 && !sim.burning) {
    let top = 0;
    for (let i = 1; i < cl.P.length; i += 3) top = Math.max(top, cl.P[i]);
    if (top < 0.35) { cl.awake = false; cl.Q.set(cl.P); cl.offT = 0; }
  }
  if (cl.awake && !hand.pins && !sim.burning) {
    cl.still += h;
    if (!cl.snap) cl.snap = Float32Array.from(cl.P);
    if (cl.still > 0.25) {
      let m = 0;
      const P = cl.P, A = cl.snap;
      for (let i = 0; i < P.length; i++) m = Math.max(m, Math.abs(P[i] - A[i]));
      cl.snap.set(P); cl.still = 0;
      if (m < 0.004) { cl.awake = false; cl.Q.set(cl.P); }
    }
  } else if (cl.snap) { cl.snap = null; cl.still = 0; }
  // The cloth checks pieces only while it flies above the table.
  let fly = 0;
  if (cl.awake) {
    const P = cl.P;
    for (let p = 0; p < NP; p += 7) if (P[p * 3 + 1] > TOP + 0.012 && Math.abs(P[p * 3]) < TABLE.hx + 0.2) fly++;
  }
  cl.flying = fly;
  for (const b of sim.bodies) {
    if (!b.awake) continue;
    const v = Math.hypot(b.vx, b.vy, b.vz), w = Math.hypot(b.wx, b.wy, b.wz);
    const cv = b.onCloth && cl.awake ? b.clothV : 0;
    // Contact jitter never stops, so sleep tests the pose over an eighth of a second.
    b.still += h;
    if (!b.snap || v > 0.15 || w > 2.5 || cv > 0.03) { b.snap = [b.x, b.y, b.z, b.qx, b.qy, b.qz, b.qw]; b.still = 0; b.calm = 0; }
    else if (b.still > 0.125) {
      const S = b.snap, dq = Math.abs(S[3] * b.qx + S[4] * b.qy + S[5] * b.qz + S[6] * b.qw);
      const ok = Math.hypot(b.x - S[0], b.y - S[1], b.z - S[2]) < 0.0015 && dq > 0.99997;
      b.calm = ok ? b.calm + 1 : 0;
      b.snap = [b.x, b.y, b.z, b.qx, b.qy, b.qz, b.qw]; b.still = 0;
      if (b.calm >= 2) { b.awake = false; b.snap = null; b.vx = b.vy = b.vz = b.wx = b.wy = b.wz = 0; }
    }
    if (b.y < -1) { b.gone = true; b.awake = false; }
  }
  for (const s of sim.shards) {
    if (!s.awake) continue;
    s.age += h;
    const v = Math.hypot(s.vx, s.vy, s.vz);
    s.still = v < 0.04 ? s.still + h : 0;
    if (s.still > 0.3 || s.age > 5) { s.awake = false; s.vx = s.vy = s.vz = s.wx = s.wy = s.wz = 0; }
  }
}

/* ---------- state ---------- */
// The sim needs frames while anything moves.
export function busy(sim) {
  if (sim.reset || sim.hand.pins || sim.cloth.awake || sim.drops.length || sim.fireT || sim.embers.length) return true;
  if (sim.bodies.some(b => b.awake) || sim.shards.some(s => s.awake) || sim.glitter.some(g => !g.still)) return true;
  if (sim.puddles.some(p => p.r < p.max - 1e-4)) return true;
  if (Math.abs(sim.flame.lean) > 0.002 || Math.abs(sim.flame.v) > 0.01 || (sim.flame.out > 0 && sim.flame.out < 1) || (sim.flame.down > 0 && !sim.flame.out)) return true;
  return sim.bodies.some(b => b.liq && b.liq.f > 0 && !b.gone && (Math.abs(b.liq.sx) + Math.abs(b.liq.sz) > 0.003 || Math.abs(b.liq.vx) + Math.abs(b.liq.vz) > 0.03));
}
// Pieces moved or broke, or the cloth left its place.
export function changed(sim) { return sim.dirty; }

/* ---------- reset ---------- */
// The pieces lift, the cloth flies back under them, and each piece sets down.
export function startReset(sim) {
  if (sim.reset || sim.hand.pins || !sim.dirty) return false;
  const cl = sim.cloth;
  const stagger = sim.calm ? 0 : 0.055;
  const order = sim.bodies.map((b, i) => i).sort((a, b) => sim.bodies[a].home.x - sim.bodies[b].home.x);
  sim.reset = {
    t: 0, from: Float32Array.from(cl.P),
    pieces: sim.bodies.map((b, i) => ({
      b, was: b.gone, from: { x: b.x, y: b.y, z: b.z, qx: b.qx, qy: b.qy, qz: b.qz, qw: b.qw }, delay: order.indexOf(i) * stagger, done: false,
    })),
  };
  for (const b of sim.bodies) { b.awake = false; b.breakAt = null; }
  sim.hand.follow = false;
  // The fire goes out; the cloth heals as it flies back.
  sim.reset.fuel = Float32Array.from(cl.fuel);
  cl.heat.fill(0); sim.burning = 0; sim.fireT = 0; sim.embers.length = 0;
  sim.events.push({ type: 'reset' });
  return true;
}
const ease = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const out3 = t => 1 - Math.pow(1 - t, 3);
const T_LIFT = 0.45, T_CLOTH = 1.0, T_SET = 0.5;
function resetTick(sim, dt) {
  const R = sim.reset, cl = sim.cloth;
  R.t += dt;
  const t = R.t;
  // Shards, glitter, drops and puddles fade.
  const f = clamp(1 - t / 0.5);
  for (const s of sim.shards) s.fade = f;
  for (const g of sim.glitter) g.fade = f;
  for (const p of sim.puddles) p.fade = f;
  sim.drops.length = 0;
  // 1. Each piece lifts to hover above its seat, or a new one grows there.
  const tmp = { qx: 0, qy: 0, qz: 0, qw: 1 };
  for (const p of R.pieces) {
    const b = p.b, s = b.home;
    const lift = TOP + 0.22 + b.c[1];
    const u = clamp((t - p.delay * 0.5) / T_LIFT);
    const k = sim.calm ? u : ease(u);
    // The home pose, held above the seat.
    const hh = s.a / 2;
    tmp.qx = 0; tmp.qy = Math.sin(hh); tmp.qz = 0; tmp.qw = Math.cos(hh);
    const ty = t < T_LIFT + T_CLOTH ? lift : lift - (lift - (TOP + CLOTH.thick + b.c[1])) * (sim.calm ? clamp((t - T_LIFT - T_CLOTH - p.delay) / T_SET) : out3(clamp((t - T_LIFT - T_CLOTH - p.delay) / T_SET)));
    rotOf(tmp, b.R);
    const hx = s.x + b.R[0] * b.c[0] + b.R[1] * b.c[1] + b.R[2] * b.c[2], hz = s.z + b.R[6] * b.c[0] + b.R[7] * b.c[1] + b.R[8] * b.c[2];
    if (p.was) {
      b.gone = false; b.scale = sim.calm ? (u > 0 ? 1 : 0) : out3(u);
      b.x = hx; b.y = ty; b.z = hz; b.qx = tmp.qx; b.qy = tmp.qy; b.qz = tmp.qz; b.qw = tmp.qw;
      if (b.liq) { b.liq.f = FILL[b.kind]; }
    } else {
      // The arc from where it lies to the hover point.
      const fr = p.from, arc = sim.calm ? 0 : Math.sin(k * Math.PI) * 0.12;
      b.x = fr.x + (hx - fr.x) * k; b.z = fr.z + (hz - fr.z) * k;
      b.y = t < T_LIFT + T_CLOTH ? fr.y + (lift - fr.y) * k + arc : ty;
      slerp(fr, tmp, k, b);
      if (b.liq && b.liq.f === 0) b.liq.f = FILL[b.kind] * k;
      else if (b.liq) b.liq.f = b.liq.f + (FILL[b.kind] - b.liq.f) * k;
    }
    if (b.liq) { b.liq.sx *= 0.9; b.liq.sz *= 0.9; b.liq.vx = b.liq.vz = 0; }
    rotOf(b, b.R); spheres(b);
    b.vx = b.vy = b.vz = b.wx = b.wy = b.wz = 0;
    if (!p.done && t > T_LIFT + T_CLOTH + p.delay + T_SET * 0.92) {
      p.done = true;
      sim.events.push({ type: 'set', kind: b.kind, x: b.x, y: b.y, z: b.z });
    }
  }
  // 2. The cloth flies back in an arc and settles on the table.
  const u = clamp((t - T_LIFT * 0.6) / T_CLOTH), k = sim.calm ? u : ease(u);
  const P = cl.P, A = R.from, B = cl.rest;
  for (let p = 0; p < NP; p++) {
    const i = p * 3;
    const far = Math.hypot(B[i] - A[i], B[i + 1] - A[i + 1], B[i + 2] - A[i + 2]);
    // The arc stays under the hovering pieces.
    const lift = sim.calm ? 0 : Math.sin(k * Math.PI) * Math.min(0.12, far * 0.3) * (0.8 + 0.2 * Math.sin(p * 0.37));
    P[i] = A[i] + (B[i] - A[i]) * k; P[i + 1] = A[i + 1] + (B[i + 1] - A[i + 1]) * k + lift; P[i + 2] = A[i + 2] + (B[i + 2] - A[i + 2]) * k;
  }
  for (let p = 0; p < NP; p++) { cl.fuel[p] = R.fuel[p] + (1 - R.fuel[p]) * k; SHRINK[p] = 0.82 + 0.18 * cl.fuel[p]; if (k > 0.5) cl.cut[p] = 0; }
  if (!R.whump && u >= 1) { R.whump = true; sim.events.push({ type: 'lay' }); }
  cl.Q.set(P);
  sim.flame.out = Math.max(0, sim.flame.out - dt * 2);
  if (t > T_LIFT + T_CLOTH + R.pieces.reduce((m, p) => Math.max(m, p.delay), 0) + T_SET + 0.05) {
    for (const b of sim.bodies) home(b);
    for (const b of sim.bodies) if (b.liq) { b.liq.f = FILL[b.kind]; b.liq.sx = b.liq.sz = b.liq.vx = b.liq.vz = 0; b.liq.pour = 0; }
    // Each break turns its shards differently next time.
    for (const b of sim.bodies) if (BREAKS.has(b.kind)) plans.delete(b);
    sim.shards.length = 0; sim.glitter.length = 0; sim.puddles.length = 0;
    cl.P.set(cl.rest); cl.Q.set(cl.rest); cl.W.fill(1); cl.awake = false; cl.onTop = NP;
    regrid(sim);
    sim.flame.out = 0; sim.flame.lean = 0; sim.flame.v = 0; sim.flame.down = 0; sim.flame.touch = 0; sim.flame.spat = false;
    cl.fuel.fill(1); cl.cut.fill(0); cl.heat.fill(0); SHRINK.fill(1); cl.marked = false;
    sim.reset = null; sim.dirty = false; sim.quiet = 0;
    sim.events.push({ type: 'ready' });
  }
}
function slerp(a, b, t, out) {
  let bx = b.qx, by = b.qy, bz = b.qz, bw = b.qw;
  let d = a.qx * bx + a.qy * by + a.qz * bz + a.qw * bw;
  if (d < 0) { bx = -bx; by = -by; bz = -bz; bw = -bw; d = -d; }
  let s0 = 1 - t, s1 = t;
  if (d < 0.9995) { const th = Math.acos(d), s = Math.sin(th); s0 = Math.sin((1 - t) * th) / s; s1 = Math.sin(t * th) / s; }
  out.qx = a.qx * s0 + bx * s1; out.qy = a.qy * s0 + by * s1; out.qz = a.qz * s0 + bz * s1; out.qw = a.qw * s0 + bw * s1;
  const l = Math.hypot(out.qx, out.qy, out.qz, out.qw);
  out.qx /= l; out.qy /= l; out.qz /= l; out.qw /= l;
}

// The table resets by itself once all is still for 2.5 s.
export function autoReset(sim, dt, active) {
  if (sim.reset || !sim.dirty || active) { sim.quiet = 0; return; }
  sim.quiet += dt;
  if (sim.quiet > 2.5) startReset(sim);
}
export const DIMS = { NX, NZ, NP, CR };
// The scene pushes its fine cloth mesh out of the table with these.
export { block, N3 as BLOCK_N, BY0, LEGS, LEG_R, flamePoint };
