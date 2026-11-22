// Wrecking ball: the sim. A heavy ball on a rope, and a wall of rigid bricks.
// Units are metres and seconds. Y is up; the wall runs along z; the ball swings along x.
// Contact physics follows Domino's finale tower: sphere sets and impulses.

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const G = 9.81;

/* ---------- dimensions ---------- */
// A brick is 215 x 65 x 102.5 mm; each joint is 10 mm.
// A brick's box holds its bed joint below and its head joint at one end.
export const W = {
  bl: 0.215, bh: 0.065, bw: 0.1025, joint: 0.01,
  mx: 0.225, my: 0.075,          // the module: length and course height
  n: 14, courses: 16,            // bricks along a course, and courses
  face: 0,                       // the wall's front face, x
};
W.len = W.n * W.mx;
W.top = W.courses * W.my;
export const BALL = {
  r: 0.3,                        // collision radius
  mass: 1000,                    // kg; a full brick is 2.6 kg
  pivot: [-0.37, 7.5, 0],
  len: 6.85,
};
BALL.rest = [BALL.pivot[0], BALL.pivot[1] - BALL.len, BALL.pivot[2]];
const BRICK_KG = 2.6;

// Brick-brick contact: little bounce, firm friction.
const E_BB = 0.12, MU_BB = 0.62, E_GND = 0.18, MU_GND = 0.7;
// A brick in the wall breaks loose above this impact speed, m/s.
const WAKE_WALL = 1.1, WAKE_PILE = 0.45;
export const H = 1 / 240;

/* ---------- wall layout ---------- */
// Stretcher bond: every second course starts with a half brick.
function layout() {
  const out = [];
  for (let c = 0; c < W.courses; c++) {
    const odd = c & 1;
    const y = c * W.my + W.my / 2;
    let z = -W.len / 2;
    const parts = odd ? [0.5, ...Array(W.n - 1).fill(1), 0.5] : Array(W.n).fill(1);
    parts.forEach((p, k) => {
      const L = p * W.mx;
      out.push({ c, y, z: z + L / 2, half: p < 1, end: k === parts.length - 1 });
      z += L;
    });
  }
  return out;
}

// A quaternion that turns the brick's length (local x) onto world z.
const QWALL = [0, -Math.SQRT1_2, 0, Math.SQRT1_2];

function makeBrick(i, s) {
  const hx = (s.half ? W.mx / 2 : W.mx) / 2, hy = W.my / 2, hz = W.bw / 2;
  const m = s.half ? 0.5 : 1;
  // Inverse inertia of a box, times the inverse mass.
  const IX = 12 / (m * (4 * hy * hy + 4 * hz * hz)), IY = 12 / (m * (4 * hx * hx + 4 * hz * hz)), IZ = 12 / (m * (4 * hx * hx + 4 * hy * hy));
  // Spheres fill the box: four along a full brick, two along a half, two across.
  const r = hy, sx = s.half ? [-hx + r, hx - r] : [-0.075, -0.025, 0.025, 0.075];
  const L = [];
  for (const x of sx) for (const z of [-(hz - r), hz - r]) L.push([x, 0, z]);
  const hx0 = W.face + hz;
  const b = {
    i, c: s.c, half: s.half, end: s.end, hx, hy, hz, m, im: 1 / m, IX, IY, IZ, br: Math.hypot(hx, hy, hz),
    home: [hx0, s.y, s.z, ...QWALL],
    x: hx0, y: s.y, z: s.z, qx: QWALL[0], qy: QWALL[1], qz: QWALL[2], qw: QWALL[3],
    vx: 0, vy: 0, vz: 0, wx: 0, wy: 0, wz: 0,
    // 0 in the wall, 1 loose and awake, 2 loose and asleep, 3 laying back.
    st: 0, still: 0, age: 0, touch: false, landed: 0,
    L, rs: r, S: new Float64Array(L.length * 3), R: new Float64Array(9),
    under: [], fly: null, seed: Math.random(),
  };
  rotOf(b, b.R);
  spheres(b);
  return b;
}

export function makeSim() {
  const spots = layout();
  const bricks = spots.map((s, i) => makeBrick(i, s));
  // Each brick rests on the bricks of the course below that it overlaps.
  for (const a of bricks) {
    if (a.c === 0) continue;
    for (const b of bricks) {
      if (b.c !== a.c - 1) continue;
      const ov = Math.min(a.z + a.hx, b.z + b.hx) - Math.max(a.z - a.hx, b.z - b.hx);
      if (ov > 0.02) a.under.push(b);
    }
  }
  const ball = {
    x: BALL.rest[0], y: BALL.rest[1], z: BALL.rest[2], px: BALL.rest[0], py: BALL.rest[1], pz: BALL.rest[2],
    vx: 0, vy: 0, vz: 0, held: null, drag: 12, hit: false, lift: null, hitT: -1, swing: 0,
  };
  return {
    bricks, ball, events: [], t: 0, n: 0, acc: 0, calm: false,
    loose: 0, out: 0, quiet: 0, rebuild: null, grid: new Map(), shake: 0,
  };
}

/* ---------- rigid body helpers ---------- */
const IA = new Float64Array(3), IB = new Float64Array(3);
function rotOf(p, M) {
  const x = p.qx, y = p.qy, z = p.qz, w = p.qw;
  M[0] = 1 - 2 * (y * y + z * z); M[1] = 2 * (x * y - z * w); M[2] = 2 * (x * z + y * w);
  M[3] = 2 * (x * y + z * w); M[4] = 1 - 2 * (x * x + z * z); M[5] = 2 * (y * z - x * w);
  M[6] = 2 * (x * z - y * w); M[7] = 2 * (y * z + x * w); M[8] = 1 - 2 * (x * x + y * y);
}
// World inverse inertia times a vector: R I⁻¹ Rᵀ v.
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
    const [lx, ly, lz] = L[k];
    S[k * 3] = p.x + M[0] * lx + M[1] * ly + M[2] * lz;
    S[k * 3 + 1] = p.y + M[3] * lx + M[4] * ly + M[5] * lz;
    S[k * 3 + 2] = p.z + M[6] * lx + M[7] * ly + M[8] * lz;
  }
}
function wake(p) {
  if (p.st === 1) return;
  p.st = 1; p.still = 0; p.age = 0; p.landed = 0;
  if (p.snap) p.snap.fill(0);
}
function rest(p) {
  p.st = 2; p.vx = p.vy = p.vz = p.wx = p.wy = p.wz = 0;
}

// One impulse at a contact point, normal n from b to a. A null b is fixed.
// Friction caps at mu times the normal impulse. Returns the closing speed.
function impulse(a, b, cx, cy, cz, nx, ny, nz, e, mu) {
  const rax = cx - a.x, ray = cy - a.y, raz = cz - a.z;
  let vx = a.vx + a.wy * raz - a.wz * ray, vy = a.vy + a.wz * rax - a.wx * raz, vz = a.vz + a.wx * ray - a.wy * rax;
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
  // A slow contact does not bounce, so a pile can rest.
  const j = (-(1 + (vn < -0.6 ? e : 0)) * vn) / k;
  apply(a, b, j * nx, j * ny, j * nz, rax, ray, raz, rbx, rby, rbz);
  // Friction acts along the sliding direction.
  let tx = vx - vn * nx, ty = vy - vn * ny, tz = vz - vn * nz;
  const vt = Math.hypot(tx, ty, tz);
  if (vt > 1e-5) {
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

/* ---------- broad phase ---------- */
const CELL = 0.3;
const key = (i, j, k) => (i + 512) * 1048576 + (j + 512) * 1024 + (k + 512);
function hash(sim) {
  const g = sim.grid;
  for (const v of g.values()) v.length = 0;
  for (const b of sim.bricks) {
    if (b.st === 3) continue;
    const k = key(Math.floor(b.x / CELL), Math.floor(b.y / CELL), Math.floor(b.z / CELL));
    let l = g.get(k);
    if (!l) g.set(k, l = []);
    l.push(b);
  }
}
function near(sim, x, y, z, fn) {
  const i0 = Math.floor(x / CELL), j0 = Math.floor(y / CELL), k0 = Math.floor(z / CELL);
  for (let i = i0 - 1; i <= i0 + 1; i++) for (let j = j0 - 1; j <= j0 + 1; j++) for (let k = k0 - 1; k <= k0 + 1; k++) {
    const l = sim.grid.get(key(i, j, k));
    if (l) for (const b of l) fn(b);
  }
}

/* ---------- contacts ---------- */
// Two bricks meet: every overlapping sphere pair is one contact.
// The deepest pair pushes them apart; each pair trades impulses.
const CPS = new Float64Array(8 * 7);
function meet(sim, a, b) {
  const dx = a.x - b.x, dy = a.y - b.y, dz = a.z - b.z, rr = a.br + b.br;
  if (dx * dx + dy * dy + dz * dz > rr * rr) return;
  const A = a.S, B = b.S, ra = a.rs, rb = b.rs, d0 = ra + rb;
  let n = 0, best = 0, bi = -1;
  for (let i = 0; i < A.length && n < 8; i += 3) {
    for (let j = 0; j < B.length && n < 8; j += 3) {
      const ex = A[i] - B[j], ey = A[i + 1] - B[j + 1], ez = A[i + 2] - B[j + 2], d2 = ex * ex + ey * ey + ez * ez;
      if (d2 >= d0 * d0) continue;
      const d = Math.sqrt(d2), pen = d0 - d, o = n * 7;
      if (d < 1e-6) { CPS[o + 3] = 0; CPS[o + 4] = 1; CPS[o + 5] = 0; } else { CPS[o + 3] = ex / d; CPS[o + 4] = ey / d; CPS[o + 5] = ez / d; }
      // The contact point lies between the two sphere surfaces.
      CPS[o] = B[j] + CPS[o + 3] * (rb - pen / 2); CPS[o + 1] = B[j + 1] + CPS[o + 4] * (rb - pen / 2); CPS[o + 2] = B[j + 2] + CPS[o + 5] * (rb - pen / 2);
      CPS[o + 6] = pen;
      if (pen > best) { best = pen; bi = n; }
      n++;
    }
  }
  if (!n) return;
  const mb = b.st === 1;
  // A brick in the wall or asleep stays put unless the hit is hard.
  if (!mb) {
    const o = bi * 7, nx = CPS[o + 3], ny = CPS[o + 4], nz = CPS[o + 5];
    const rel = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny + (a.vz - b.vz) * nz;
    const lim = b.st === 0 ? WAKE_WALL : WAKE_PILE;
    if (b.st !== 3 && -rel > lim) { if (b.st === 0) loosen(sim, b); wake(b); }
  }
  const both = b.st === 1;
  // Push apart along the deepest normal; a fixed brick does not move.
  {
    const o = bi * 7, nx = CPS[o + 3], ny = CPS[o + 4], nz = CPS[o + 5], pen = Math.max(0, CPS[o + 6] - 0.002) * 0.8, s = both ? 0.5 : 1;
    a.x += nx * pen * s; a.y += ny * pen * s; a.z += nz * pen * s;
    if (both) { b.x -= nx * pen * s; b.y -= ny * pen * s; b.z -= nz * pen * s; }
  }
  let hit = 0;
  for (let k = 0; k < n; k++) {
    const o = k * 7;
    hit = Math.max(hit, impulse(a, both ? b : null, CPS[o], CPS[o + 1], CPS[o + 2], CPS[o + 3], CPS[o + 4], CPS[o + 5], E_BB, MU_BB));
  }
  spheres(a);
  if (both) spheres(b);
  a.touch = true;
  if (both) b.touch = true;
  if (hit > 0.9) sim.events.push({ type: 'knock', v: hit, x: a.x, y: a.y, z: a.z, half: a.half });
}

// The ground: each corner of the box below y = 0 kicks back.
function ground(sim, p) {
  const M = p.R;
  let low = 0, hit = 0, lx = 0, lz = 0;
  for (let c = 0; c < 8; c++) {
    const sx = c & 1 ? p.hx : -p.hx, sy = c & 2 ? p.hy : -p.hy, sz = c & 4 ? p.hz : -p.hz;
    const rx = M[0] * sx + M[1] * sy + M[2] * sz, ry = M[3] * sx + M[4] * sy + M[5] * sz, rz = M[6] * sx + M[7] * sy + M[8] * sz;
    const y = p.y + ry;
    if (y >= 0) continue;
    if (y < low) { low = y; lx = p.x + rx; lz = p.z + rz; }
    hit = Math.max(hit, impulse(p, null, p.x + rx, y, p.z + rz, 0, 1, 0, E_GND, MU_GND));
  }
  if (low < 0) {
    p.y -= low * 0.9;
    p.touch = true;
    // Rolling and spinning die out on the dirt.
    const d = 1 - 4 * H;
    p.wx *= d; p.wy *= d; p.wz *= d;
    if (hit > 1.2 && p.landed < 3) {
      p.landed++;
      sim.events.push({ type: 'land', v: hit, x: lx, y: 0, z: lz, half: p.half, first: p.landed === 1 });
    }
  }
}

// The ball meets a brick: the ball is heavy, so the brick takes the hit.
// Returns the brick's closing speed.
function ballMeets(sim, p) {
  const b = sim.ball, S = p.S, d0 = BALL.r + p.rs;
  const dx = p.x - b.x, dy = p.y - b.y, dz = p.z - b.z, rr = BALL.r + p.br;
  if (dx * dx + dy * dy + dz * dz > rr * rr) return 0;
  let best = 0, bi = -1;
  for (let i = 0; i < S.length; i += 3) {
    const ex = S[i] - b.x, ey = S[i + 1] - b.y, ez = S[i + 2] - b.z, d2 = ex * ex + ey * ey + ez * ez;
    if (d2 >= d0 * d0) continue;
    const pen = d0 - Math.sqrt(d2);
    if (pen > best) { best = pen; bi = i; }
  }
  if (bi < 0) return 0;
  const ex = S[bi] - b.x, ey = S[bi + 1] - b.y, ez = S[bi + 2] - b.z, d = Math.hypot(ex, ey, ez) || 1;
  const nx = ex / d, ny = ey / d, nz = ez / d;
  if (p.st !== 1) { if (p.st === 0) loosen(sim, p); wake(p); }
  p.x += nx * best; p.y += ny * best; p.z += nz * best;
  // The brick sees the ball's velocity at the contact.
  const cx = b.x + nx * BALL.r, cy = b.y + ny * BALL.r, cz = b.z + nz * BALL.r;
  p.vx -= b.vx; p.vy -= b.vy; p.vz -= b.vz;
  const v0x = p.vx, v0y = p.vy, v0z = p.vz;
  const hit = impulse(p, null, cx, cy, cz, nx, ny, nz, 0.05, 0.4);
  // The ball takes the opposite momentum, scaled by mass.
  const k = p.m * BRICK_KG / BALL.mass;
  b.vx -= (p.vx - v0x) * k; b.vy -= (p.vy - v0y) * k; b.vz -= (p.vz - v0z) * k;
  p.vx += b.vx; p.vy += b.vy; p.vz += b.vz;
  spheres(p);
  return hit;
}

// A brick breaks out of the wall: mortar dust and a crack.
function loosen(sim, p) {
  sim.events.push({ type: 'loose', x: p.x, y: p.y, z: p.z, half: p.half });
}

/* ---------- the ball ---------- */
function ballStep(sim, h) {
  const b = sim.ball, [px, py, pz] = BALL.pivot;
  if (b.held || b.lift) {
    // The hand or the crane holds the ball: it chases its target, heavy.
    const t = b.held || b.lift.at;
    const k = 1 - Math.exp(-h * (b.held ? 22 : 9));
    const nx = lerp(b.x, t[0], k), ny = lerp(b.y, t[1], k), nz = lerp(b.z, t[2], k);
    b.vx = (nx - b.x) / h; b.vy = (ny - b.y) / h; b.vz = (nz - b.z) / h;
    b.x = nx; b.y = ny; b.z = nz;
  } else {
    // Light air drag; after a hit the operator brakes the swing.
    // Near the bottom he steadies it, so the rebuild can start.
    const off = Math.abs(b.x - BALL.rest[0]) + Math.abs(b.z - BALL.rest[2]);
    const drag = Math.exp(-h / (b.hit && off < 0.3 ? 0.3 : b.drag));
    b.vx *= drag; b.vy *= drag; b.vz *= drag;
    b.vy -= G * h;
    b.x += b.vx * h; b.y += b.vy * h; b.z += b.vz * h;
  }
  // The rope stays taut: the ball keeps its distance from the pivot.
  let dx = b.x - px, dy = b.y - py, dz = b.z - pz;
  const d = Math.hypot(dx, dy, dz) || 1;
  dx /= d; dy /= d; dz /= d;
  b.x = px + dx * BALL.len; b.y = py + dy * BALL.len; b.z = pz + dz * BALL.len;
  const vr = b.vx * dx + b.vy * dy + b.vz * dz;
  b.vx -= vr * dx; b.vy -= vr * dy; b.vz -= vr * dz;
}

/* ---------- step ---------- */
function substep(sim) {
  const h = H, b = sim.ball;
  ballStep(sim, h);
  hash(sim);
  // Loose bricks fly: gravity, spin, and the ground.
  for (const p of sim.bricks) {
    if (p.st !== 1) continue;
    p.age += h;
    p.touch = false;
    p.vy -= G * h;
    p.x += p.vx * h; p.y += p.vy * h; p.z += p.vz * h;
    const { wx, wy, wz, qx, qy, qz, qw } = p, k = h / 2;
    const nx = qx + k * (wx * qw + wy * qz - wz * qy), ny = qy + k * (wy * qw + wz * qx - wx * qz);
    const nz = qz + k * (wz * qw + wx * qy - wy * qx), nw = qw - k * (wx * qx + wy * qy + wz * qz), l = Math.hypot(nx, ny, nz, nw);
    p.qx = nx / l; p.qy = ny / l; p.qz = nz / l; p.qw = nw / l;
    rotOf(p, p.R);
    ground(sim, p);
    spheres(p);
  }
  // The ball meets every brick near it.
  let hit = 0, hx = 0, hy = 0, hz = 0, n = 0;
  const bs = Math.hypot(b.vx, b.vy, b.vz);
  near(sim, b.x, b.y, b.z, p => {
    if (p.st === 3) return;
    const v = ballMeets(sim, p);
    if (v > 0) { n++; hx += p.x; hy += p.y; hz += p.z; hit = Math.max(hit, v); }
  });
  if (n && !b.hit && bs > 0.6) {
    // The first touch of a swing: the impact and its shock through the wall.
    b.hit = true;
    b.hitT = sim.t;
    b.drag = 0.65;
    shock(sim, hx / n, hy / n, hz / n, bs);
    sim.events.push({ type: 'hit', v: bs, x: hx / n, y: hy / n, z: hz / n });
    sim.shake = Math.min(1, bs / 5);
  }
  // Loose bricks meet their neighbours.
  for (const a of sim.bricks) {
    if (a.st !== 1) continue;
    near(sim, a.x, a.y, a.z, q => {
      if (q === a || q.st === 3 || (q.st === 1 && q.i < a.i)) return;
      meet(sim, a, q);
    });
  }
}

// A hard hit cracks the mortar round the contact; nearby bricks break loose.
function shock(sim, x, y, z, v) {
  const b = sim.ball, r = 0.14 + 0.07 * v;
  const sp = Math.hypot(b.vx, b.vy, b.vz) || 1, dx = b.vx / sp, dy = b.vy / sp, dz = b.vz / sp;
  for (const p of sim.bricks) {
    if (p.st !== 0) continue;
    const ex = p.x - x, ey = p.y - y, ez = p.z - z, d = Math.hypot(ex, ey, ez);
    if (d > r) continue;
    const f = (1 - d / r) * (0.3 + Math.random() * 0.3);
    loosen(sim, p);
    wake(p);
    // Bricks leave along the swing, fanned out from the contact.
    const out = v * f;
    p.vx = dx * out + (ex / (d || 1)) * out * 0.35;
    p.vy = dy * out + (ey / (d || 1)) * out * 0.35 + Math.random() * 0.6;
    p.vz = dz * out + (ez / (d || 1)) * out * 0.55;
    p.wx = (Math.random() - 0.5) * 8 * f; p.wy = (Math.random() - 0.5) * 8 * f; p.wz = (Math.random() - 0.5) * 8 * f;
  }
}

// A brick in the wall with no brick in place under it drops.
function support(sim) {
  for (const p of sim.bricks) {
    if (p.st !== 0 || p.c === 0) continue;
    let held = false;
    for (const q of p.under) if (q.st === 0) { held = true; break; }
    if (!held) {
      loosen(sim, p);
      wake(p);
      // A small nudge, so a column does not drop as one block.
      p.wx = (Math.random() - 0.5) * 0.8; p.wz = (Math.random() - 0.5) * 0.8;
    }
  }
}

function settle(sim, tick) {
  sim.loose = 0;
  sim.out = 0;
  for (const p of sim.bricks) {
    if (p.st === 1) {
      // Slow bricks on a rest feel rolling resistance, so rocking dies out.
      const v2 = p.vx * p.vx + p.vy * p.vy + p.vz * p.vz, w2 = p.wx * p.wx + p.wy * p.wy + p.wz * p.wz;
      if (p.touch && v2 < 0.04 && w2 < 1.5) { p.wx *= 0.93; p.wy *= 0.93; p.wz *= 0.93; p.vx *= 0.97; p.vz *= 0.97; }
      // Every eighth of a second, a brick that has barely moved counts as still.
      if (tick) {
        const s0 = p.snap || (p.snap = new Float64Array(7));
        const moved = Math.hypot(p.x - s0[0], p.y - s0[1], p.z - s0[2]);
        const turn = Math.abs(p.qx * s0[3] + p.qy * s0[4] + p.qz * s0[5] + p.qw * s0[6]);
        p.still = moved < 0.004 && turn > 0.99996 ? p.still + 1 : 0;
        s0[0] = p.x; s0[1] = p.y; s0[2] = p.z; s0[3] = p.qx; s0[4] = p.qy; s0[5] = p.qz; s0[6] = p.qw;
      }
      // Still for a quarter second, or loose for 7 s: the brick sleeps.
      if (p.still >= 2 || p.age > 7 || p.y < -1) rest(p);
    }
    if (p.st === 1) sim.loose++;
    if (p.st !== 0) sim.out++;
  }
}

/* ---------- the rebuild ---------- */
// Loose bricks lay back into their courses, bottom course first.
const FLY = 0.62, GAPT = 0.055;
export function startRebuild(sim, fast = false) {
  if (sim.rebuild || !sim.bricks.some(p => p.st === 2 || p.st === 1)) return false;
  const q = sim.bricks.filter(p => p.st !== 0).sort((a, b) => a.c - b.c || Math.abs(a.z) - Math.abs(b.z));
  sim.rebuild = { q, next: sim.t + 0.1, gap: fast ? GAPT * 0.6 : GAPT };
  return true;
}
function rebuildStep(sim) {
  const r = sim.rebuild;
  if (!r) return;
  // Launch the next brick once it rests; a brick still moving waits its turn.
  while (r.q.length && sim.t >= r.next) {
    // The lowest resting brick whose seat is laid, or on its way, goes next.
    const i = r.q.findIndex(p => p.st === 2 && p.under.every(u => u.st === 0 || u.st === 3));
    if (i < 0) break;
    const p = r.q[i];
    r.q.splice(i, 1);
    launch(sim, p);
    r.next = sim.t + r.gap;
  }
  if (!r.q.length && !sim.bricks.some(p => p.st === 3)) sim.rebuild = null;
}
function launch(sim, p) {
  p.st = 3;
  p.fly = { t0: sim.t, from: [p.x, p.y, p.z, p.qx, p.qy, p.qz, p.qw], dur: sim.calm ? 0.4 : FLY * (0.9 + Math.random() * 0.2), spin: (Math.random() - 0.5) * 2 };
  sim.events.push({ type: 'lift', x: p.x, y: p.y, z: p.z });
  // Bricks resting on it lose their seat and settle again.
  for (const q of sim.bricks) {
    if (q.st !== 2 || q.y <= p.y + 0.02) continue;
    if (Math.abs(q.x - p.x) < 0.3 && Math.abs(q.z - p.z) < 0.3 && q.y - p.y < 0.2) wake(q);
  }
}
const ease = u => u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
function flights(sim) {
  for (const p of sim.bricks) {
    if (p.st !== 3) continue;
    const f = p.fly, u = clamp((sim.t - f.t0) / f.dur), h = p.home, a = f.from;
    const e = ease(u);
    // The path rises over the wall's line and drops into its slot.
    const lift = sim.calm ? 0 : Math.sin(Math.PI * u) * (0.28 + Math.max(0, h[1] - a[1]) * 0.35);
    p.x = lerp(a[0], h[0], e);
    p.y = lerp(a[1], h[1], e) + lift;
    p.z = lerp(a[2], h[2], e);
    const sg = a[3] * h[3] + a[4] * h[4] + a[5] * h[5] + a[6] * h[6] < 0 ? -1 : 1;
    let qx = lerp(a[3] * sg, h[3], e), qy = lerp(a[4] * sg, h[4], e), qz = lerp(a[5] * sg, h[5], e), qw = lerp(a[6] * sg, h[6], e);
    const l = Math.hypot(qx, qy, qz, qw);
    p.qx = qx / l; p.qy = qy / l; p.qz = qz / l; p.qw = qw / l;
    if (u >= 1) {
      [p.x, p.y, p.z, p.qx, p.qy, p.qz, p.qw] = h;
      p.vx = p.vy = p.vz = p.wx = p.wy = p.wz = 0;
      p.st = 0; p.fly = null; p.landed = 0;
      sim.events.push({ type: 'lay', x: p.x, y: p.y, z: p.z, c: p.c, half: p.half });
    }
    rotOf(p, p.R);
    spheres(p);
  }
}

/* ---------- public ---------- */
export function step(sim, dt) {
  sim.acc = Math.min(sim.acc + dt, H * 10);
  let ran = 0;
  while (sim.acc >= H) {
    sim.acc -= H;
    sim.t += H;
    substep(sim);
    if (++ran % 4 === 0) support(sim);
    rebuildStep(sim);
    flights(sim);
    settle(sim, ++sim.n % 30 === 0);
  }
  if (ran) support(sim);
  const b = sim.ball;
  const off = Math.hypot(b.x - BALL.rest[0], b.z - BALL.rest[2]), sp = Math.hypot(b.vx, b.vy, b.vz);
  sim.shake = Math.max(0, sim.shake - dt * 3.5);
  // A slow ball clear of the wall and a still pile start the rebuild after a breath.
  // A ball that rests on rubble counts as clear once it is out of the wall's line.
  const clear = b.x + BALL.r < W.face + 0.02 || off < 0.06;
  if (!sim.rebuild && sim.out && !sim.loose && !b.held && !b.lift && clear && sp < 0.15) {
    sim.quiet += dt;
    if (sim.quiet > 1.4) startRebuild(sim);
  } else sim.quiet = 0;
}

// The hand takes the ball. The target lies on the swing plane.
export function hold(sim, x, y) {
  const b = sim.ball;
  b.lift = null;
  const [px, py] = BALL.pivot;
  // The ball stays on its rope, pulled back from the wall, above the ground.
  let dx = x - px, dy = y - py;
  const a = clamp(Math.atan2(dx, -dy), -0.63, 0.004);
  dx = Math.sin(a) * BALL.len; dy = -Math.cos(a) * BALL.len;
  b.held = [px + dx, py + dy, BALL.pivot[2]];
}
export function letGo(sim) {
  const b = sim.ball;
  if (!b.held) return;
  b.held = null;
  b.hit = false;
  b.drag = 12;
  // A hand-thrown swing keeps at most a fling of 2 m/s.
  const s = Math.hypot(b.vx, b.vy, b.vz);
  if (s > 2) { b.vx *= 2 / s; b.vy *= 2 / s; b.vz *= 2 / s; }
  sim.events.push({ type: 'release', v: s });
}
// The crane pulls the ball back by an angle, then lets it go.
export function lift(sim, ang) {
  const b = sim.ball;
  if (b.held) return;
  const [px, py, pz] = BALL.pivot;
  b.lift = { at: [px - Math.sin(ang) * BALL.len, py - Math.cos(ang) * BALL.len, pz], t: 0 };
  b.hit = false;
  b.drag = 12;
}
export function liftTick(sim, dt) {
  const b = sim.ball;
  if (!b.lift) return;
  b.lift.t += dt;
  const d = Math.hypot(b.x - b.lift.at[0], b.y - b.lift.at[1]);
  if (d < 0.02 || b.lift.t > 3) {
    b.lift = null;
    b.vx = b.vy = b.vz = 0;
    sim.events.push({ type: 'release', v: 0 });
  }
}
export function busy(sim) {
  const b = sim.ball;
  const sp = Math.hypot(b.vx, b.vy, b.vz), off = Math.hypot(b.x - BALL.rest[0], b.y - BALL.rest[1]);
  return !!(b.held || b.lift || sim.loose || sim.rebuild || sp > 0.004 || off > 0.002 || sim.shake > 0 || (sim.out && !sim.rebuild));
}
// A frozen ball: a tiny residual swing comes to rest.
export function park(sim) {
  const b = sim.ball, sp = Math.hypot(b.vx, b.vy, b.vz), off = Math.hypot(b.x - BALL.rest[0], b.y - BALL.rest[1], b.z - BALL.rest[2]);
  if (!b.held && !b.lift && sp < 0.004 && off < 0.002) { b.vx = b.vy = b.vz = 0; [b.x, b.y, b.z] = BALL.rest; }
}
