// Ship launch physics: grease, slide, tip, float and drag chains.
// Every way lets go at once, so the hull moves in one cross-section plane.
// State: the centre of weight (z across, y up) and roll (outboard down is +).
import { CANAL, WAYS, HULL, START_Z, wayTop } from './yard.js';

const G = 9.81, RHO = 1000;
// Launch weight 1,600 t with the cradles; the centre of weight is 5.4 m over the keel.
export const MASS = 1.6e6, KG = 5.4;
// Roll inertia: radius of gyration 0.38 of the beam.
const I_ROLL = MASS * (0.38 * HULL.B) ** 2;
// The length that floats: displaced volume over midship area, a prismatic 0.8.
const L_EFF = 0.8 * HULL.L;
// The cradle stands 0.9 m under the keel; its runners slide on the ways.
const CRADLE = 0.9;
// Grease friction falls as the tallow warms with the run.
const MU_COLD = 0.045, MU_WARM = 0.018;
// Penalty contact of the runners on the ways: stiff and well damped.
const K_WAY = 3.0e9, C_WAY = 5.0e7;
// Drag chains: four heaps of 60 t each, chain on concrete.
const HEAP_MASS = 2.4e5, MU_CHAIN = 0.55;
// The wire runs from the inboard deck edge to the heaps; slack before it bites.
const WIRE_SLACK = 13;
const K_WIRE = 4.0e7, C_WIRE = 6.0e6;
// The heaps stop at a row of bollards 3 m inland of the edge.
const HEAP_STOP = CANAL.zYard - 3;

/* ---------- the midship section ---------- */
// 24 points round the section in hull space: z across, y up from the keel.
function section() {
  const pts = [], hb = HULL.B / 2, r = HULL.bilge, D = HULL.D;
  // Outboard side: up from the bilge to the deck edge.
  for (let i = 0; i <= 5; i++) { const a = -Math.PI / 2 + (i / 5) * (Math.PI / 2); pts.push([hb - r + r * Math.cos(a), r + r * Math.sin(a)]); }
  pts.push([hb, D * 0.5], [hb, D]);
  // The deck, then the inboard side down.
  pts.push([0, D + 0.25], [-hb, D], [-hb, D * 0.5]);
  for (let i = 0; i <= 5; i++) { const a = Math.PI + (i / 5) * (Math.PI / 2); pts.push([-hb + r + r * Math.cos(a), r + r * Math.sin(a)]); }
  // The flat bottom back to the start.
  pts.push([0, 0]);
  return pts;
}
const SECTION = section();
// The cradle's foot follows the 1 in 10 slope under an upright hull.
const footY = z => -CRADLE - z * WAYS.slope;
// Runner points along the foot, under the flat of the bottom.
const RUNNERS = Array.from({ length: 9 }, (_, i) => { const z = -HULL.B * 0.42 + (HULL.B * 0.84 * i) / 8; return [z, footY(z)]; });
// Lug on the inboard deck edge.
const LUG = [-HULL.B / 2, HULL.D];

/* ---------- clip and area ---------- */
// Area and centroid of the polygon part under the line y = a + s z.
function submerged(poly, a, s) {
  let A = 0, cz = 0, cy = 0;
  const n = poly.length, out = [];
  const below = p => p[1] <= a + s * p[0];
  for (let i = 0; i < n; i++) {
    const p = poly[i], q = poly[(i + 1) % n];
    const bp = below(p), bq = below(q);
    if (bp) out.push(p);
    if (bp !== bq) {
      const fp = p[1] - a - s * p[0], fq = q[1] - a - s * q[0];
      const t = fp / (fp - fq);
      out.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]);
    }
  }
  const m = out.length;
  for (let i = 0; i < m; i++) {
    const p = out[i], q = out[(i + 1) % m];
    const c = p[0] * q[1] - q[0] * p[1];
    A += c; cz += (p[0] + q[0]) * c; cy += (p[1] + q[1]) * c;
  }
  A *= 0.5;
  if (Math.abs(A) < 1e-6) return { A: 0, cz: 0, cy: 0 };
  return { A: Math.abs(A), cz: cz / (6 * A), cy: cy / (6 * A) };
}
// The design area: the section's whole area.
const A_FULL = submerged(SECTION, 1e3, 0).A;

/* ---------- the world ---------- */
export function makeLaunch() {
  return {
    phase: 'held', // held, creep, slide, free
    t: 0, tPhase: 0, drop: 1.5,
    gz: START_Z, gy: 0, roll: 0,
    vz: 0, vy: 0, wr: 0,
    s: 0, vs: 0,
    creep: 0,
    heap: 0, heapV: 0, taut: 0, tension: 0,
    wet: 0, hitV: 0,
    water: { level: 0, slope: 0 },
    events: [],
    seed: 1,
  };
}

/** Puts the hull back on the ways at the start, for a tipping edge drop metres up. */
export function reset(W, drop = W.drop) {
  Object.assign(W, makeLaunch(), { drop, seed: W.seed + 1, events: [] });
  W.gy = wayTop(START_Z, drop) + CRADLE + KG;
  W.heap = heapRest();
}
const heapRest = () => START_Z - HULL.B / 2 - 6;

/** Cuts the rope. The grease holds for one to three seconds, then lets go. */
export function release(W) {
  if (W.phase !== 'held') return false;
  W.phase = 'creep';
  W.tPhase = 0;
  // A seeded hold: each launch hesitates a different time.
  const r = Math.abs(Math.sin(W.seed * 12.9898) * 43758.5453) % 1;
  W.creep = 1.0 + 1.8 * r;
  W.events.push({ type: 'release' });
  return true;
}

// Hull space to world: rotate by roll, then add the centre of weight.
function toWorld(W, p) {
  const c = Math.cos(W.roll), s = Math.sin(W.roll);
  const z = p[0], y = p[1] - KG;
  return [W.gz + z * c - y * s, W.gy + z * s + y * c];
}
export const worldPoint = toWorld;

/** Keel centre in world space, for placing the mesh. */
export function keel(W) { return toWorld(W, [0, 0]); }

/** Steps the launch by dt seconds. */
export function step(W, dt) {
  const n = Math.max(1, Math.ceil(dt / (1 / 480)));
  const h = dt / n;
  for (let i = 0; i < n; i++) sub(W, h);
}

function sub(W, dt) {
  W.t += dt; W.tPhase += dt;
  if (W.phase === 'held') return;
  if (W.phase === 'creep') {
    // Cold tallow creeps a few millimetres, then lets go.
    if (W.tPhase >= W.creep) { W.phase = 'slide'; W.tPhase = 0; W.events.push({ type: 'move' }); }
    else return;
  }
  if (W.phase === 'slide') return slide(W, dt);
  free(W, dt);
}

// One degree of freedom down the slope, in the cradle.
function slide(W, dt) {
  const th = Math.atan(WAYS.slope);
  const mu = MU_WARM + (MU_COLD - MU_WARM) * Math.exp(-W.s / 4);
  const fw = wireForce(W, dt);
  const a = G * (Math.sin(th) - mu * Math.cos(th)) + (fw.fz * Math.cos(th)) / MASS;
  W.vs = Math.max(0, W.vs + a * dt);
  W.s += W.vs * dt;
  W.gz = START_Z + W.s * Math.cos(th);
  W.gy = wayTop(W.gz, W.drop) + CRADLE + KG;
  W.vz = W.vs * Math.cos(th); W.vy = -W.vs * Math.sin(th);
  // The centre of weight passes the tipping edge: she tips.
  if (W.gz >= CANAL.zYard) { W.phase = 'free'; W.tPhase = 0; W.events.push({ type: 'tip', v: W.vs }); }
}

// The heaps answer a taut wire: friction holds them until it is beaten.
function wireForce(W, dt) {
  const [lz, ly] = toWorld(W, LUG);
  const hz = W.heap, hy = wayTop(hz, W.drop) + 0.4;
  const dz = lz - hz, dy = ly - hy, d = Math.hypot(dz, dy);
  const len = Math.hypot(LUG[0] + START_Z - heapRest(), HULL.D + CRADLE) + WIRE_SLACK;
  W.taut = Math.max(0, d - len);
  // Stretch speed along the wire, from the lug's velocity.
  const ux = dz / d, uy = dy / d;
  const c = Math.cos(W.roll), s = Math.sin(W.roll);
  const rz = lz - W.gz, ry = ly - W.gy;
  const lvz = W.vz - W.wr * ry, lvy = W.vy + W.wr * rz;
  const rate = (lvz - W.heapV) * ux + lvy * uy;
  let T = W.taut > 0 ? K_WIRE * W.taut + C_WIRE * rate : 0;
  T = Math.max(0, T);
  // The heap slides once the pull beats the chain's friction.
  const fr = MU_CHAIN * HEAP_MASS * G;
  if (W.heap < HEAP_STOP) {
    if (W.heapV > 0 || T * ux > fr) W.heapV = Math.max(0, W.heapV + ((T * ux - fr) / HEAP_MASS) * dt);
    W.heap = Math.min(HEAP_STOP, W.heap + W.heapV * dt);
    if (W.heap >= HEAP_STOP) W.heapV = 0;
  }
  W.tension = T;
  void c; void s;
  return { fz: -T * ux, fy: -T * uy, lz, ly };
}

// A free body: the ways, the water, the wires.
function free(W, dt) {
  let fz = 0, fy = -MASS * G, tq = 0;
  const add = (Fz, Fy, pz, py) => { fz += Fz; fy += Fy; tq += (pz - W.gz) * Fy - (py - W.gy) * Fz; };
  // Runners on the ways, until each passes the edge.
  const mu = MU_WARM;
  for (const r of RUNNERS) {
    const [pz, py] = toWorld(W, r);
    if (pz > CANAL.zYard) continue;
    const top = wayTop(pz, W.drop);
    const pen = top - py;
    if (pen <= 0) continue;
    const rz = pz - W.gz, ry = py - W.gy;
    const vz = W.vz - W.wr * ry, vy = W.vy + W.wr * rz;
    // The slope's normal and its downhill tangent.
    const nz = WAYS.slope / Math.hypot(1, WAYS.slope), ny = 1 / Math.hypot(1, WAYS.slope);
    const vn = vz * nz + vy * ny, vt = vz * ny - vy * nz;
    const N = Math.max(0, (K_WAY * pen - C_WAY * vn) / RUNNERS.length);
    const F = -mu * N * Math.tanh(vt / 0.05);
    add(N * nz + F * ny, N * ny - F * nz, pz, py);
  }
  // The edge itself: a round nose the hull pivots on.
  {
    const ez = CANAL.zYard, ey = W.drop;
    // The cradle's foot is the sloped line footY in hull space.
    const c = Math.cos(W.roll), s = Math.sin(W.roll);
    const qz = ez - W.gz, qy = ey - W.gy;
    // The edge in hull space.
    const hz = qz * c + qy * s, hy = -qz * s + qy * c + KG;
    const pen = hy - footY(hz);
    if (pen > 0 && pen < 1.5 && Math.abs(hz) < HULL.B * 0.42) {
      const nz = -s, ny = c;
      const vz = W.vz - W.wr * qy, vy = W.vy + W.wr * qz;
      const vn = vz * nz + vy * ny, vt = vz * ny - vy * nz;
      const N = Math.max(0, K_WAY * pen - C_WAY * vn) * 0.5;
      const F = -mu * N * Math.tanh(vt / 0.05);
      add(N * nz + F * ny, N * ny - F * nz, ez, ey);
    }
  }
  // Water: buoyancy from the submerged part of the section.
  const wl = W.water.level, ws = W.water.slope;
  const c = Math.cos(W.roll), s = Math.sin(W.roll);
  // The water line in hull space: y = a + m z.
  const hullPts = SECTION.map(p => toWorld(W, p));
  let A = 0, bz = 0, by = 0;
  {
    // Clip in world space: y <= wl + ws (z - gz).
    const sub = submerged(hullPts, wl - ws * W.gz, ws);
    A = sub.A; bz = sub.cz; by = sub.cy;
  }
  const imm = Math.min(1, A / (0.25 * A_FULL));
  W.wet = imm;
  if (A > 0) {
    const B = RHO * G * A * L_EFF;
    add(0, B, bz, by);
    // Drag and wave-making: linear plus quadratic, on the submerged centroid.
    const rz = bz - W.gz, ry = by - W.gy;
    const vz = W.vz - W.wr * ry, vy = W.vy + W.wr * rz;
    add(-imm * (2.5e5 * vz + 1.0e5 * vz * Math.abs(vz)), -imm * (3.2e6 * vy + 1.2e6 * vy * Math.abs(vy)), bz, by);
    // Roll damping: bilge keels and the radiated wave.
    tq += -imm * (6e6 * W.wr + 4e7 * W.wr * Math.abs(W.wr));
  }
  // The wires.
  const fw = wireForce(W, dt);
  add(fw.fz, fw.fy, fw.lz, fw.ly);
  // Added mass grows as she goes in.
  const mz = MASS + imm * 4e5, my = MASS + imm * 2.4e6, Ir = I_ROLL * (1 + 0.3 * imm);
  // The first touch of the water: the hit.
  if (!W.hitV && A > 0.5) { W.hitV = Math.hypot(W.vz, W.vy); W.events.push({ type: 'hit', v: W.hitV, vy: W.vy, roll: W.roll }); }
  W.vz += (fz / mz) * dt; W.vy += (fy / my) * dt; W.wr += (tq / Ir) * dt;
  W.gz += W.vz * dt; W.gy += W.vy * dt; W.roll += W.wr * dt;
  void c; void s;
}

/** True while the hull still moves enough to watch. */
export function moving(W) {
  if (W.phase === 'held') return false;
  if (W.phase !== 'free') return true;
  return Math.abs(W.wr) > 0.004 || Math.abs(W.roll) > 0.006 || Math.hypot(W.vz, W.vy) > 0.03 || W.tPhase < 4;
}

/** The section in world space, for the draft pass and the spray. */
export function sectionWorld(W) { return SECTION.map(p => toWorld(W, p)); }
export { SECTION, LUG, CRADLE, HEAP_STOP, heapRest };

/** The wire's length: slack until the hull has run this far from the heap. */
export const WIRE_LEN = Math.hypot(LUG[0] + START_Z - heapRest(), HULL.D + CRADLE) + WIRE_SLACK;
