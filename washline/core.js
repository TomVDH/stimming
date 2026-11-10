// Washing line core: a pulley line with pegged cloth, in plain JS.
// It has no imports, so node can test it.
// Units are metres, kilograms and seconds; y is up.

export const H = 1 / 120;
const ITER = 8;
const PEG_DROP = 0.012;
const END = 0.25;
const RHO_C = 1.2 * 0.8;
const lerp = (a, b, t) => a + (b - a) * t;

/* ---------- K4: Verlet rope and cloth ---------- */
// Lifted from archive/legacy.html; ropes and cloth move in 3D.
export const K4 = {
  // A rope is a chain of points with one rest length per segment.
  makeRope(n, a, b, len, mass) {
    const r = {
      n, seg: len / (n - 1), mass,
      x: new Float32Array(n), y: new Float32Array(n), z: new Float32Array(n),
      px: new Float32Array(n), py: new Float32Array(n), pz: new Float32Array(n),
      fx: new Float32Array(n), fy: new Float32Array(n), fz: new Float32Array(n),
      pin: new Uint8Array(n),
    };
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      r.x[i] = r.px[i] = lerp(a[0], b[0], t);
      r.y[i] = r.py[i] = lerp(a[1], b[1], t);
      r.z[i] = r.pz[i] = lerp(a[2], b[2], t);
    }
    r.pin[0] = r.pin[n - 1] = 1;
    return r;
  },
  // Gravity and the loads in fx, fy, fz move each free point.
  stepRope(r, h, damp) {
    const h2 = h * h, im = 1 / r.mass;
    for (let i = 0; i < r.n; i++) {
      if (r.pin[i]) continue;
      const vx = (r.x[i] - r.px[i]) * damp, vy = (r.y[i] - r.py[i]) * damp, vz = (r.z[i] - r.pz[i]) * damp;
      r.px[i] = r.x[i]; r.py[i] = r.y[i]; r.pz[i] = r.z[i];
      r.x[i] += vx + r.fx[i] * im * h2;
      r.y[i] += vy + (r.fy[i] * im - 9.8) * h2;
      r.z[i] += vz + r.fz[i] * im * h2;
    }
  },
  // One pass pulls each segment back to its rest length.
  solveRope(r) {
    const x = r.x, y = r.y, z = r.z, pin = r.pin;
    for (let i = 0; i < r.n - 1; i++) {
      const dx = x[i + 1] - x[i], dy = y[i + 1] - y[i], dz = z[i + 1] - z[i];
      const d = Math.hypot(dx, dy, dz) || 1e-9;
      const wa = pin[i] ? 0 : 1, wb = pin[i + 1] ? 0 : 1, ws = wa + wb;
      if (!ws) continue;
      const k = (d - r.seg) / (d * ws);
      x[i] += dx * k * wa; y[i] += dy * k * wa; z[i] += dz * k * wa;
      x[i + 1] -= dx * k * wb; y[i + 1] -= dy * k * wb; z[i + 1] -= dz * k * wb;
    }
  },
  // A cloth is a grid of points with structural, shear and bend links.
  makeCloth(w, h, cols, rows) {
    const n = cols * rows, dx = w / (cols - 1), dy = h / (rows - 1);
    const c = {
      w, h, cols, rows, n,
      x: new Float32Array(n), y: new Float32Array(n), z: new Float32Array(n),
      px: new Float32Array(n), py: new Float32Array(n), pz: new Float32Array(n),
      ax: new Float32Array(n), ay: new Float32Array(n), az: new Float32Array(n),
      inv: new Float32Array(n).fill(1),
    };
    for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) {
      const p = i * cols + j;
      c.x[p] = j * dx;
      c.y[p] = -i * dy;
    }
    const A = [], B = [], R = [], K = [];
    const link = (a, b, k) => { A.push(a); B.push(b); R.push(Math.hypot(c.x[a] - c.x[b], c.y[a] - c.y[b])); K.push(k); };
    for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) {
      const p = i * cols + j;
      if (j < cols - 1) link(p, p + 1, 1);
      if (i < rows - 1) link(p, p + cols, 1);
      if (i < rows - 1 && j < cols - 1) { link(p, p + cols + 1, 0.9); link(p + 1, p + cols, 0.9); }
      // Bend links span two points; their stiffness is the fabric's.
      if (j < cols - 2) link(p, p + 2, -1);
      if (i < rows - 2) link(p, p + 2 * cols, -1);
    }
    c.a = Int32Array.from(A); c.b = Int32Array.from(B); c.rest = Float32Array.from(R); c.k = Float32Array.from(K);
    const T = [];
    for (let i = 0; i < rows - 1; i++) for (let j = 0; j < cols - 1; j++) {
      const p = i * cols + j;
      T.push(p, p + cols, p + 1, p + 1, p + cols, p + cols + 1);
    }
    c.tris = Uint16Array.from(T);
    return c;
  },
  // Each step moves a point 0.05 units at most, so a yank cannot blow up.
  stepCloth(c, h, damp) {
    const h2 = h * h, MAX = 0.05;
    for (let p = 0; p < c.n; p++) {
      if (!c.inv[p]) continue;
      let sx = (c.x[p] - c.px[p]) * damp + c.ax[p] * h2;
      let sy = (c.y[p] - c.py[p]) * damp + (c.ay[p] - 9.8) * h2;
      let sz = (c.z[p] - c.pz[p]) * damp + c.az[p] * h2;
      const s = Math.hypot(sx, sy, sz);
      if (s > MAX) { const f = MAX / s; sx *= f; sy *= f; sz *= f; }
      c.px[p] = c.x[p]; c.py[p] = c.y[p]; c.pz[p] = c.z[p];
      c.x[p] += sx; c.y[p] += sy; c.z[p] += sz;
    }
  },
  // One pass over every link; bend links take the fabric's stiffness.
  solveCloth(c, bend) {
    const x = c.x, y = c.y, z = c.z, inv = c.inv, A = c.a, B = c.b, R = c.rest, K = c.k;
    for (let i = 0, m = A.length; i < m; i++) {
      const a = A[i], b = B[i], wa = inv[a], wb = inv[b], ws = wa + wb;
      if (!ws) continue;
      const dx = x[b] - x[a], dy = y[b] - y[a], dz = z[b] - z[a];
      const d = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1e-9;
      const k = ((d - R[i]) / (d * ws)) * (K[i] < 0 ? bend : K[i]);
      x[a] += dx * k * wa; y[a] += dy * k * wa; z[a] += dz * k * wa;
      x[b] -= dx * k * wb; y[b] -= dy * k * wb; z[b] -= dz * k * wb;
    }
  },
};

/* ---------- fabric and wind ---------- */
export const FABRIC = { bend: 0.25, damp: 0.992, kgm2: 0.2 };
export const WIND = {
  calm: { u: 0.35, turb: 0.3 },
  breeze: { u: 1.3, turb: 0.45 },
  blowy: { u: 2.8, turb: 0.6 },
};
// A steady direction, a slow swell and sine-sum turbulence.
const wOut = [0, 0, 0];
function windAt(line, x, y, t, wind) {
  const U = wind.u * wind.scale, dx = line.windDir[0], dz = line.windDir[1];
  const k = 1 + 0.35 * Math.sin(t * 0.37 + x * 0.15) * Math.sin(t * 0.23 + 1.1 + y * 0.1);
  const tw = wind.turb * (Math.sin(x * 1.3 + t * 2.1) * Math.sin(y * 0.9 - t * 1.7) + 0.5 * Math.sin(x * 3.1 - y * 2.3 + t * 4.3));
  wOut[0] = U * (k * dx + tw * 0.4);
  wOut[1] = U * tw * 0.3;
  wOut[2] = U * (k * dz + tw * 0.3);
  return wOut;
}

/* ---------- the pulley line ---------- */
// The rope runs from pulley a to pulley b; both ends are pinned.
export function makeLine(a, b, { n = 64, slack = 1.015, mass = 0.04, windDir = [0.45, 0.89] } = {}) {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]) * slack;
  const d = Math.hypot(windDir[0], windDir[1]) || 1;
  return { rope: K4.makeRope(n, a, b, len, mass), a, b, len, pieces: [], windDir: [windDir[0] / d, windDir[1] / d] };
}

// The point at arc length s, between the two rope points around it.
export function ropeAt(r, s, out) {
  const u = Math.min(r.n - 1, Math.max(0, s / r.seg));
  const i = Math.min(r.n - 2, Math.floor(u)), f = u - i;
  out[0] = lerp(r.x[i], r.x[i + 1], f);
  out[1] = lerp(r.y[i], r.y[i + 1], f);
  out[2] = lerp(r.z[i], r.z[i + 1], f);
  return out;
}

// A piece is a cloth plus its pegs; hang() places it.
export function makePiece({ w, h, col, cols = 18, rows = 14 }) {
  const c = K4.makeCloth(w, h, cols, rows);
  c.col = col;
  c.mass = w * h * FABRIC.kgm2;
  c.pegs = [];
  return c;
}

// Pegs grip the two top corners at s0 and s0 + w.
const tmp = [0, 0, 0];
export function hang(line, c, s0) {
  s0 = Math.min(line.len - END - c.w, Math.max(END, s0));
  const dy = c.h / (c.rows - 1);
  for (let j = 0; j < c.cols; j++) {
    ropeAt(line.rope, s0 + (j * c.w) / (c.cols - 1), tmp);
    for (let i = 0; i < c.rows; i++) {
      const p = i * c.cols + j;
      c.x[p] = c.px[p] = tmp[0];
      c.y[p] = c.py[p] = tmp[1] - PEG_DROP - i * dy;
      c.z[p] = c.pz[p] = tmp[2] + 0.002 * Math.sin(j * 1.7 + i * 0.9);
    }
  }
  c.pegs = [{ s: s0, p: 0 }, { s: s0 + c.w, p: c.cols - 1 }];
  for (const g of c.pegs) c.inv[g.p] = 0;
  line.pieces.push(c);
  return c;
}

// Reeling moves every peg along the line; pulleys stop the ends.
export function reel(line, ds) {
  let lo = Infinity, hi = -Infinity;
  for (const c of line.pieces) for (const g of c.pegs) { lo = Math.min(lo, g.s); hi = Math.max(hi, g.s); }
  if (lo === Infinity) return 0;
  const got = Math.min(Math.max(ds, END - lo), line.len - END - hi);
  for (const c of line.pieces) for (const g of c.pegs) g.s += got;
  return got;
}

// Unclipping a peg frees its corner; it returns the pegs left.
export function unpeg(c, i) {
  const g = c.pegs.splice(i, 1)[0];
  if (g) c.inv[g.p] = 1;
  // The last peg off lets the piece leap on the gust.
  if (g && !c.pegs.length) for (let p = 0; p < c.n; p++) c.py[p] = c.y[p] - 1.8 * H;
  return c.pegs.length;
}

// The reel that clears width w at the near pulley.
// 0 means room now; Infinity means the line is full.
export function roomAtNear(line, w, gap) {
  let lo = Infinity, hi = -Infinity;
  for (const c of line.pieces) for (const g of c.pegs) { lo = Math.min(lo, g.s); hi = Math.max(hi, g.s); }
  if (lo === Infinity) return 0;
  const need = Math.max(0, END + w + gap - lo);
  return hi + need <= line.len - END ? need : Infinity;
}

// Free pieces leave once they are far away or below the floor.
export function cull(line, { r = 30, floor = -1 } = {}) {
  const mx = (line.a[0] + line.b[0]) / 2, my = (line.a[1] + line.b[1]) / 2, mz = (line.a[2] + line.b[2]) / 2;
  const gone = [];
  line.pieces = line.pieces.filter(c => {
    if (c.pegs.length) return true;
    const k = c.n >> 1, d = Math.hypot(c.x[k] - mx, c.y[k] - my, c.z[k] - mz);
    if (d < r && c.y[k] > floor) return true;
    gone.push(c);
    return false;
  });
  return gone;
}

/* ---------- one step ---------- */
// Wind pushes each triangle; the pegs carry the loads into the rope.
function windForces(line, c, t, wind) {
  const cols = c.cols, rows = c.rows, x = c.x, y = c.y, z = c.z, px = c.px, py = c.py, pz = c.pz;
  const ax = c.ax, ay = c.ay, az = c.az, im3 = c.n / (c.mass * 3), ih = 1 / H;
  ax.fill(0); ay.fill(0); az.fill(0);
  // Wind samples one point per column in three bands.
  const ws = c.ws || (c.ws = new Float32Array(cols * 9));
  for (let b = 0; b < 3; b++) {
    const row = Math.min(rows - 1, Math.round(((b + 0.5) * rows) / 3));
    for (let j = 0; j < cols; j++) {
      const p = row * cols + j, w = windAt(line, x[p], y[p], t, wind), o = (b * cols + j) * 3;
      ws[o] = w[0]; ws[o + 1] = w[1]; ws[o + 2] = w[2];
    }
  }
  let fx = 0, fy = 0, fz = 0;
  const T = c.tris;
  for (let q = 0; q < T.length; q += 3) {
    const a = T[q], b = T[q + 1], d = T[q + 2];
    const e1x = x[b] - x[a], e1y = y[b] - y[a], e1z = z[b] - z[a];
    const e2x = x[d] - x[a], e2y = y[d] - y[a], e2z = z[d] - z[a];
    // N is the cross product; its length is twice the area.
    const nx = e1y * e2z - e1z * e2y, ny = e1z * e2x - e1x * e2z, nz = e1x * e2y - e1y * e2x;
    const nl = Math.sqrt(nx * nx + ny * ny + nz * nz);
    if (nl < 1e-9) continue;
    const o = (Math.min(2, Math.floor((((a / cols) | 0) * 3) / rows)) * cols + (a % cols)) * 3;
    const vx = ws[o] - ((x[a] - px[a]) + (x[b] - px[b]) + (x[d] - px[d])) * ih / 3;
    const vy = ws[o + 1] - ((y[a] - py[a]) + (y[b] - py[b]) + (y[d] - py[d])) * ih / 3;
    const vz = ws[o + 2] - ((z[a] - pz[a]) + (z[b] - pz[b]) + (z[d] - pz[d])) * ih / 3;
    // F = 0.5 rho C (v.n)|v.n| n area, with n and area from N.
    const vn = vx * nx + vy * ny + vz * nz;
    const s = (0.25 * RHO_C * vn * Math.abs(vn)) / (nl * nl);
    const Fx = s * nx, Fy = s * ny, Fz = s * nz;
    fx += Fx; fy += Fy; fz += Fz;
    const gx = Fx * im3, gy = Fy * im3, gz = Fz * im3;
    ax[a] += gx; ay[a] += gy; az[a] += gz;
    ax[b] += gx; ay[b] += gy; az[b] += gz;
    ax[d] += gx; ay[d] += gy; az[d] += gz;
  }
  if (!c.pegs.length) return;
  // A peg's load splits between the two rope points around it.
  const r = line.rope, k = 1 / c.pegs.length;
  for (const g of c.pegs) {
    const u = Math.min(r.n - 1, g.s / r.seg), i = Math.min(r.n - 2, Math.floor(u)), f = u - i;
    const lx = fx * k, ly = (fy - c.mass * 9.8) * k, lz = fz * k;
    r.fx[i] += lx * (1 - f); r.fy[i] += ly * (1 - f); r.fz[i] += lz * (1 - f);
    r.fx[i + 1] += lx * f; r.fy[i + 1] += ly * f; r.fz[i + 1] += lz * f;
  }
}

export function stepWorld(line, t, wind) {
  const r = line.rope;
  r.fx.fill(0); r.fy.fill(0); r.fz.fill(0);
  for (const c of line.pieces) {
    windForces(line, c, t, wind);
    // A free piece rides an updraft, stronger in a strong wind.
    if (!c.pegs.length) {
      const lift = 9.8 * (0.86 + 0.34 * (wind.u * wind.scale) / 2.8);
      // The gust carries it at about twice the mean wind speed.
      const k = c.n >> 1, w = windAt(line, c.x[k], c.y[k], t, wind), wx = w[0] * 2.2, wz = w[2] * 2.2;
      for (let p = 0; p < c.n; p++) {
        c.ay[p] += lift * (1 + 0.35 * Math.sin(t * 3.1 + (p % c.cols) * 0.7));
        c.ax[p] += (wx - (c.x[p] - c.px[p]) / H) * 1.5;
        c.az[p] += (wz - (c.z[p] - c.pz[p]) / H) * 1.5;
      }
    }
  }
  K4.stepRope(r, H, 0.995);
  for (const c of line.pieces) K4.stepCloth(c, H, FABRIC.damp);
  for (let it = 0; it < ITER; it++) {
    K4.solveRope(r);
    K4.solveRope(r);
    for (const c of line.pieces) {
      for (const g of c.pegs) {
        ropeAt(r, g.s, tmp);
        c.x[g.p] = tmp[0]; c.y[g.p] = tmp[1] - PEG_DROP; c.z[g.p] = tmp[2];
      }
      K4.solveCloth(c, FABRIC.bend);
    }
  }
}
