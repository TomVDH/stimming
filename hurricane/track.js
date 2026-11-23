// Hurricane eye: the storm's shape by category, and the flight by track time.
// Units: km and seconds. The eye's axis is x = z = 0; the sea is y = 0.
// Plan: docs/plans/hurricane.md.

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const mix = (a, b, k) => a + (b - a) * k;

// Flight level and true air speed.
export const ALT = 3.05;
export const V = 0.11;
// The run starts this far inside the wall, at flight level.
export const WALL = 2.4;
// The plane crosses the inner face at this track time.
export const T_BREAK = WALL / V;
// The run starts a little way in, so the first frame already moves.
export const T_START = 3;

// The storm at a category from 1 to 5, eased by the caller.
// A stronger storm has a smaller eye and a steeper, taller wall.
// Rx, the exit radius on the run's line, comes from faceExit().
export function stormShape(cat) {
  const k = clamp((cat - 1) / 4);
  const R0 = mix(26, 13, k);
  const slope = mix(40, 60, k) * Math.PI / 180;
  const lean = 1 / Math.tan(slope);
  const top = mix(12, 16, k);
  return {
    cat, k, R0, lean, top,
    // The face radius at sea level.
    Rs: R0 - ALT * lean,
    Rx: R0,
    // Peak surface wind under the wall, m/s.
    wind: mix(36, 75, k),
    rain: mix(0.65, 1, k),
    jolt: mix(0.5, 1, k),
  };
}

/* ---------- the wall face on the CPU ---------- */
// GL's trilinear lookup of the baked noise, with REPEAT wrap.
function tex(noise, N, x, y, z, ch) {
  const u = x * N - 0.5, v = y * N - 0.5, w = z * N - 0.5;
  const i = Math.floor(u), j = Math.floor(v), k = Math.floor(w);
  const fu = u - i, fv = v - j, fw = w - k;
  const at = (a, b, c) => noise[((((c % N) + N) % N * N + (((b % N) + N) % N)) * N + (((a % N) + N) % N)) * 4 + ch] / 255;
  const l = (a, b, t) => a + (b - a) * t;
  return l(
    l(l(at(i, j, k), at(i + 1, j, k), fu), l(at(i, j + 1, k), at(i + 1, j + 1, k), fu), fv),
    l(l(at(i, j, k + 1), at(i + 1, j, k + 1), fu), l(at(i, j + 1, k + 1), at(i + 1, j + 1, k + 1), fu), fv), fw);
}
// A copy of lumps() in scene.js; change both together.
function lumps(noise, N, p) {
  const [x, y, z] = p;
  const rough = 0.45 + 0.9 * tex(noise, N, x / 23 + 0.13, y / 23 + 0.13, z / 23 + 0.13, 0);
  return (tex(noise, N, x / 7, y / 7, z / 7, 1) - 0.35) * 1.3 * rough
    + (tex(noise, N, x / 4.4 + 0.31, y / 4.4 + 0.31, z / 4.4 + 0.31, 2) - 0.4) * 0.6
    + (tex(noise, N, x / 2.2 + 0.67, y / 2.2 + 0.67, z / 2.2 + 0.67, 3) - 0.45) * 0.26 * rough;
}
// A copy of faceR() in scene.js; change both together.
function faceR(shape, p, a) {
  const TIER = 1.7, yw = p[1] + 0.7 * Math.sin(a * 3 + 0.4) + 0.4 * Math.sin(a * 7 + 2.1);
  const f = yw / TIER, fi = Math.floor(f);
  const hq = (fi + sstep(0.72, 1, f - fi)) * TIER;
  const r = shape.Rs + shape.lean * (p[1] + (hq - yw) * 0.65);
  return r + 0.85 * Math.sin(a * 5 + 1.3 + p[1] * 0.12) + 0.45 * Math.sin(a * 11 - 0.7 - p[1] * 0.25) + 0.25 * Math.sin(a * 23 + p[1] * 0.4);
}
// The run's bearing: the deepest bay at flight level.
// The wall then stands on both sides of the plane until the break.
export function runBearing() {
  const shape = stormShape(3);
  let best = 0, at = 0;
  for (let a = 0; a < 2 * Math.PI; a += 0.002) {
    const p = [Math.cos(a) * shape.R0, ALT, Math.sin(a) * shape.R0];
    const r = faceR(shape, p, a);
    if (r > best) { best = r; at = a; }
  }
  return at;
}
// Where the run's line leaves the lumpy wall, scanned from outside in.
// The run then starts WALL km inside that point, so the break is on time.
export function faceExit(shape, noise, a0) {
  const N = Math.round(Math.cbrt(noise.length / 4));
  const ca = Math.cos(a0), sa = Math.sin(a0);
  for (let s = 0; s < 6; s += 0.005) {
    const r = shape.R0 + 3.5 - s, p = [r * ca, ALT, r * sa];
    const m = Math.min(r - faceR(shape, p, a0), shape.top - ALT) + lumps(noise, N, p);
    if (m < 0) return r;
  }
  return shape.R0 - 2.5;
}

/* ---------- the path in the eye ---------- */
// After the break the plane flies in, then turns left to run round the eye.
// beta is the heading off the inward radial; 90 degrees runs along the wall.
const DS = 0.01;
const S_TURN0 = 2.0, S_TURN1 = 9.0;
const betaAt = s => (Math.PI / 2) * sstep(S_TURN0, S_TURN1, s);

// Integrates the path once per exit radius: dr and theta by arc length.
export function eyePath(R0) {
  const n = Math.ceil(80 / DS);
  const dr = new Float32Array(n + 1), th = new Float32Array(n + 1);
  let r = R0, a = 0;
  for (let i = 0; i <= n; i++) {
    dr[i] = r - R0; th[i] = a;
    const b = betaAt(i * DS);
    r -= Math.cos(b) * DS;
    a += Math.sin(b) * DS / r;
  }
  return { R0, n, dr, th };
}

// Pure functions of track time give the plane's pose, so a scrub is cheap.
// Returns position, heading and bank; the jolts come apart.
export function pose(tau, shape, path, a0) {
  let r, th, beta, kappa;
  if (tau <= T_BREAK) {
    r = shape.Rx + WALL - V * tau; th = 0; beta = 0; kappa = 0;
  } else {
    const s = V * (tau - T_BREAK);
    const f = Math.min(s / DS, path.n - 1);
    const i = Math.floor(f), u = f - i;
    // Past the table end the plane holds its circle.
    const over = Math.max(0, s - path.n * DS);
    r = shape.Rx + mix(path.dr[i], path.dr[i + 1], u);
    th = mix(path.th[i], path.th[i + 1], u) + over / r;
    beta = betaAt(s);
    // The path's curvature: the heading turns, and the circle turns it too.
    const e = 0.02;
    kappa = (betaAt(s + e) - betaAt(s - e)) / (2 * e) + Math.sin(beta) / r;
  }
  const a = a0 + th;
  const ca = Math.cos(a), sa = Math.sin(a);
  const pos = [r * ca, ALT, r * sa];
  // Heading: inward, swung toward increasing angle, which is a left turn.
  const fwd = [-ca * Math.cos(beta) - sa * Math.sin(beta), 0, -sa * Math.cos(beta) + ca * Math.sin(beta)];
  // Bank from the turn rate: tan(bank) = v^2 kappa / g, in metres.
  const bank = Math.atan((V * 1000) ** 2 * (kappa / 1000) / 9.81);
  return { pos, fwd, bank, r };
}

/* ---------- jolts and chop ---------- */
// A smooth value noise on the time line, from -1 to 1.
function h1(i) { let n = Math.imul(i | 0, 374761393) ^ 0x5bd1e995; n = Math.imul(n ^ (n >>> 13), 1274126177); return ((n ^ (n >>> 16)) >>> 0) / 4294967296; }
function vn(x, seed) {
  const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
  return mix(h1(i * 7 + seed), h1((i + 1) * 7 + seed), u) * 2 - 1;
}
// The hard jolts in the wall: track time, heave, pitch and roll kicks.
export const JOLTS = [
  [6.4, -1, 0.7, -0.6],
  [11.2, 0.8, -0.5, 1],
  [15.1, -1, -0.9, -0.8],
  [18.6, 1, 0.6, 0.9],
  [20.9, -0.7, 0.4, -1],
];
// A damped kick: it rings for about a second.
const ring = x => x < 0 ? 0 : Math.exp(-x * 3.2) * Math.sin(x * 11);

// Offsets in radians and km. k scales the lot; zero under reduced motion.
export function chop(tau, shape, k) {
  if (k <= 0) return { pitch: 0, roll: 0, yaw: 0, heave: 0, head: [0, 0], hit: 0 };
  // Chop: rough all through the wall, a breath of it in the eye.
  const inWall = 1 - sstep(T_BREAK - 0.5, T_BREAK + 1.5, tau);
  const a = shape.jolt * k * (0.22 + 0.78 * inWall);
  const amp = a * (inWall > 0 ? 1 : 0.12) + 0.03 * k;
  let pitch = amp * 0.012 * (vn(tau * 2.3, 1) + 0.5 * vn(tau * 5.7, 2));
  let roll = amp * 0.02 * (vn(tau * 1.9, 3) + 0.5 * vn(tau * 6.1, 4));
  let yaw = amp * 0.006 * vn(tau * 1.3, 5);
  let heave = amp * 0.004 * (vn(tau * 2.9, 6) + 0.6 * vn(tau * 7.3, 7));
  let hit = 0;
  for (const [t, hv, p, r] of JOLTS) {
    const g = ring(tau - t) * shape.jolt * k;
    heave += hv * 0.014 * g; pitch += p * 0.05 * g; roll += r * 0.085 * g;
    hit = Math.max(hit, Math.abs(g));
  }
  // The head lags the airframe a little, so the cockpit shifts in view.
  const head = [roll * 0.25 + yaw * 0.5, -heave * 6 - pitch * 0.3];
  return { pitch, roll, yaw, heave, head, hit };
}

// Rain on the airframe, from 0 to 1. It stops at the inner face.
export function rainAt(tau, shape) {
  const burst = 0.75 + 0.25 * vn(tau * 0.45, 9);
  return shape.rain * burst * (1 - sstep(T_BREAK - 0.5, T_BREAK + 0.4, tau));
}

// Lightning in the wall: track time, then the flash's place ahead and aside, in km.
export const BOLTS = [
  [8.6, 1.4, -0.5, 0.6],
  [13.9, 0.9, 0.7, 1.4],
  [17.2, 2.2, 0.2, -0.3],
];
