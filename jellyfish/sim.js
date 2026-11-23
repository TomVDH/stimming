// Jellyfish tank: the sim. Four kinds of jelly and a starfield of small ones drift on a round flow.
// World units: the drum axis is z, the drum radius is T.R, y is up.

export const T = {
  R: 6,            // drum radius
  zBack: -2.4,     // back wall of the drum
  zFront: 2.4,     // front glass
  G: 16,           // tentacle guide chains round each rim
  A: 4,            // oral arms per jelly
  N: 14,           // points per chain
  wave: 9,         // speed of a tap's pressure ring, units per second
};
export const CHAINS = T.G + T.A;

// Four kinds of large jelly; scene.js holds their look.
// tent and arm are chain lengths in bell sizes; dome scales the bell height.
export const SPECIES = {
  moon: { kind: 0, dome: 1.0, tent: [0.95, 1.2], arm: [0.8, 1.0], flare: 0.42, kt: 2.6, ka: 4.5, period: [1.5, 2.1] },
  nettle: { kind: 1, dome: 1.45, tent: [2.6, 3.4], arm: [1.7, 2.2], flare: 0.16, kt: 1.4, ka: 2.2, period: [1.2, 1.6] },
  stripe: { kind: 2, dome: 1.2, tent: [2.0, 2.6], arm: [2.2, 2.8], flare: 0.2, kt: 1.5, ka: 2.0, period: [1.4, 1.9] },
  yolk: { kind: 3, dome: 0.8, tent: [1.7, 2.3], arm: [0.9, 1.2], flare: 0.3, kt: 1.8, ka: 3.0, period: [1.8, 2.4] },
};

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const mix = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };

/* ---------- bell shape ---------- */
// One profile serves the sim and the vertex shader; keep both in step.
// c is the contraction, 0 open to 1 closed.
export function bellShape(c) {
  const a = mix(1.12, 1.6, c);
  const rr = mix(1.0, 0.8, c);
  const rho = rr / Math.sin(a);
  const flat = mix(0.56, 0.72, c);
  return { a, rr, rho, flat, h: rho * (1 - Math.cos(a)) * flat };
}

// The contraction over one cycle: a quick close, then a slow open.
export function stroke(ph) {
  const p = ph - Math.floor(ph);
  if (p < 0.28) { const t = p / 0.28; return t * t * (3 - 2 * t); }
  const t = (p - 0.28) / 0.72;
  return 1 - (1 - Math.pow(1 - t, 2.2));
}

/* ---------- the current ---------- */
// The flow circles the drum axis clockwise, strongest near the wall.
export function flowAt(x, y, z, F, out) {
  const r = Math.hypot(x, y) || 1e-4;
  const s = F * (0.25 + 0.75 * smooth(0, T.R, r)) * (1 - 0.6 * smooth(T.R * 0.9, T.R * 1.05, r));
  out[0] = (y / r) * s;
  out[1] = (-x / r) * s;
  out[2] = -z * 0.02 * F;
  return out;
}

/* ---------- jellies ---------- */
// A small seeded random, so the first frame is always the same picture.
function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// First places: a picture with near and far bells, none at the rim.
// Each row: x, y, z, size, tilt, species.
const START = [
  [-2.0, 2.0, 0.6, 1.05, 0.4, 'nettle'], [2.3, 1.0, -0.6, 0.95, -1.4, 'moon'], [1.4, 3.2, 0.7, 0.85, 2.6, 'stripe'],
  [-1.0, -1.6, -0.3, 0.95, 1.0, 'yolk'], [3.2, -0.9, -1.4, 0.8, -2.5, 'nettle'], [-3.4, -0.2, -1.4, 0.8, -2.4, 'moon'],
  [0.3, 0.6, -1.8, 0.7, 1.8, 'stripe'],
];
const pick = (r, [a, b]) => a + (b - a) * r();

// The starfield: small jellies through the whole drum.
export const SMALL = { size: [0.03, 0.065] };

export function makeTank(count = 6, smalls = 420) {
  const r = rng(80);
  const jellies = [];
  for (let i = 0; i < count; i++) {
    const [x, y, z, size, tilt, sp] = START[i % START.length];
    const S = SPECIES[sp];
    const j = {
      i, size, sp, kind: S.kind, S,
      p: [x, y, z], v: [0, 0, 0],
      ax: [Math.sin(tilt), Math.cos(tilt), 1.2 * (r() - 0.5)],
      wander: tilt, wz: 0, seed: r() * 100,
      phase: r(), period: pick(r, S.period), depth: 0.55 + r() * 0.2,
      c: 0, flinch: 0, fdir: [0, 1, 0], hit: new Set(),
      // Chains: position and last position per point.
      X: new Float32Array(CHAINS * T.N * 3), O: new Float32Array(CHAINS * T.N * 3),
      len: new Float32Array(CHAINS),
    };
    for (let g = 0; g < CHAINS; g++) j.len[g] = pick(r, g < T.G ? S.tent : S.arm) * size;
    jellies.push(j);
  }
  const tank = { jellies, small: makeSmall(smalls, r), taps: [], events: [], flow: 0.5, F: 0.35, t: 0, flowT: 0, calm: false };
  // Hang the chains straight, then let them settle into the flow.
  for (const j of jellies) { roots(j); hang(j); }
  for (let k = 0; k < 90; k++) step(tank, 1 / 30, 1);
  tank.events.length = 0;
  return tank;
}

export function setFlow(tank, f) { tank.flow = f; tank.F = 0.08 + 0.55 * f; }

// Small jellies live in flat arrays: no chains, one axis each.
function makeSmall(n, r) {
  const s = {
    n, P: new Float32Array(n * 3), V: new Float32Array(n * 3), A: new Float32Array(n * 3),
    W: new Float32Array(n), ph: new Float32Array(n), per: new Float32Array(n), size: new Float32Array(n),
    c: new Float32Array(n), fl: new Float32Array(n), F: new Float32Array(n * 2), seed: new Float32Array(n),
  };
  for (let i = 0; i < n; i++) {
    const rad = Math.sqrt(r()) * (T.R - 0.6), th = r() * Math.PI * 2;
    s.P[i * 3] = Math.cos(th) * rad;
    s.P[i * 3 + 1] = Math.sin(th) * rad;
    s.P[i * 3 + 2] = T.zBack + 0.4 + r() * (T.zFront - T.zBack - 0.9);
    const w = r() * Math.PI * 2;
    s.W[i] = w;
    s.A[i * 3] = Math.sin(w); s.A[i * 3 + 1] = Math.cos(w); s.A[i * 3 + 2] = 0;
    s.ph[i] = r(); s.per[i] = 0.8 + r() * 0.7;
    s.size[i] = pick(r, SMALL.size) * (r() < 0.1 ? 1.8 : 1);
    s.seed[i] = r();
  }
  return s;
}

/* ---------- frames ---------- */
// The bell's frame: local y is the swim axis; z of the world is the ref.
export function basis(ax, e1, e2) {
  let x = -ax[1], y = ax[0];
  const l = Math.hypot(x, y) || 1;
  e1[0] = x / l; e1[1] = y / l; e1[2] = 0;
  e2[0] = ax[1] * e1[2] - ax[2] * e1[1];
  e2[1] = ax[2] * e1[0] - ax[0] * e1[2];
  e2[2] = ax[0] * e1[1] - ax[1] * e1[0];
}

const E1 = [0, 0, 0], E2 = [0, 0, 0];
// Chain roots: tentacles on the rim, oral arms under the bell's centre.
function roots(j) {
  const b = bellShape(j.c), s = j.size, ax = j.ax;
  basis(ax, E1, E2);
  j.e1 = [...E1]; j.e2 = [...E2];
  for (let g = 0; g < CHAINS; g++) {
    let lx, ly, lz;
    if (g < T.G) {
      const a = (g / T.G) * Math.PI * 2;
      lx = Math.cos(a) * b.rr * s * 0.98; ly = -0.02 * s; lz = Math.sin(a) * b.rr * s * 0.98;
    } else {
      const a = ((g - T.G) / T.A) * Math.PI * 2 + Math.PI / 4;
      lx = Math.cos(a) * 0.07 * s; ly = b.h * j.S.dome * s * 0.42; lz = Math.sin(a) * 0.07 * s;
    }
    const o = g * T.N * 3;
    j.X[o] = j.p[0] + E1[0] * lx + ax[0] * ly + E2[0] * lz;
    j.X[o + 1] = j.p[1] + E1[1] * lx + ax[1] * ly + E2[1] * lz;
    j.X[o + 2] = j.p[2] + E1[2] * lx + ax[2] * ly + E2[2] * lz;
    j.O[o] = j.X[o]; j.O[o + 1] = j.X[o + 1]; j.O[o + 2] = j.X[o + 2];
  }
}
function hang(j) {
  for (let g = 0; g < CHAINS; g++) {
    const o = g * T.N * 3, L = j.len[g] / (T.N - 1);
    for (let k = 1; k < T.N; k++) {
      const q = o + k * 3;
      for (let d = 0; d < 3; d++) { j.X[q + d] = j.X[o + d] - j.ax[d] * L * k; j.O[q + d] = j.X[q + d]; }
    }
  }
}

/* ---------- tap ---------- */
// A tap on the glass at (x, y): a pressure ring leaves it.
export function tap(tank, x, y, k = 1) {
  tank.taps.push({ x, y, z: T.zFront, t0: tank.t, k });
  if (tank.taps.length > 4) {
    const old = tank.taps.shift();
    for (const j of tank.jellies) j.hit.delete(old);
  }
}

const FL = [0, 0, 0];
/* ---------- step ---------- */
// amb scales ambient motion: 1 awake, 0 asleep.
export function step(tank, dt, amb = 1) {
  const n = Math.max(1, Math.ceil(dt / (1 / 60)));
  const h = dt / n;
  for (let s = 0; s < n; s++) sub(tank, h, amb);
}

function sub(tank, dt, amb) {
  tank.t += dt;
  const calm = tank.calm, F = calm ? 0 : tank.F * amb;
  tank.flowT += F * dt;
  const J = tank.jellies;
  // The tap rings: each reaches a jelly once.
  for (let ti = 0; ti < tank.taps.length; ti++) {
    const tp = tank.taps[ti], front = (tank.t - tp.t0) * T.wave;
    for (const j of J) {
      if (j.hit.has(tp)) continue;
      const dx = j.p[0] - tp.x, dy = j.p[1] - tp.y, dz = j.p[2] - tp.z, d = Math.hypot(dx, dy, dz);
      if (d > front) continue;
      j.hit.add(tp);
      const k = tp.k * Math.exp(-Math.max(0, d - 1.5) / 3.2) * (calm ? 0.6 : 1);
      if (k < 0.08) continue;
      const l = d || 1;
      // Bell first, away from the tap; keep the axis off the view line.
      j.fdir = [dx / l, dy / l, clamp(dz / l, -0.4, 0.4)];
      j.flinch = Math.max(j.flinch, k);
      // A new stroke starts now unless the bell is already closing.
      const p = j.phase - Math.floor(j.phase);
      if (p > 0.18) j.phase = Math.ceil(j.phase);
      const push = 0.35 * k;
      j.v[0] += dx / l * push; j.v[1] += dy / l * push; j.v[2] += dz / l * push * 0.5;
      tank.events.push({ type: 'flinch', x: j.p[0], z: j.p[2], k });
    }
  }
  for (let ti = tank.taps.length - 1; ti >= 0; ti--) if ((tank.t - tank.taps[ti].t0) * T.wave > 30) {
    const tp = tank.taps[ti];
    for (const j of J) j.hit.delete(tp);
    tank.taps.splice(ti, 1);
  }

  for (const j of J) {
    const fl = j.flinch;
    // Ambient pulse slows to a stop as the tank sleeps.
    const mid = j.phase - Math.floor(j.phase) > 1e-6;
    const rate = calm ? (fl > 0.02 || mid ? 1 : 0) : amb;
    const period = mix(j.period, 0.62, Math.min(1, fl * 1.3));
    const before = j.phase;
    let ph = before + (dt / period) * rate;
    // Calm bells finish their stroke, then rest open.
    if (calm && fl <= 0.02 && Math.floor(ph) > Math.floor(before)) ph = Math.floor(ph);
    if (calm && fl <= 0.02 && before === Math.floor(before)) ph = before;
    j.phase = ph;
    const depth = mix(j.depth, calm ? 0.6 : 1, Math.min(1, fl * 1.5));
    const c = stroke(ph) * depth;
    const dc = Math.max(0, c - j.c);
    j.c = c;
    // The closing bell drives the jelly along its axis.
    const th = dc * j.size * 0.5;
    j.v[0] += j.ax[0] * th; j.v[1] += j.ax[1] * th; j.v[2] += j.ax[2] * th;
    // Drag pulls the bell to the water's speed.
    flowAt(j.p[0], j.p[1], j.p[2], F, FL);
    const dr = 1 - Math.exp(-dt * (calm ? 2.6 : 1.3));
    for (let d = 0; d < 3; d++) j.v[d] += (FL[d] - j.v[d]) * dr;
    j.v[1] -= 0.03 * dt * (calm ? 0 : amb);
    // Soft walls: the drum, its glass and its back.
    const r = Math.hypot(j.p[0], j.p[1]), lim = T.R - 1.1 - j.size * 0.6;
    if (r > lim) { const k = (r - lim) * 1.6 * dt; j.v[0] -= j.p[0] / r * k; j.v[1] -= j.p[1] / r * k; }
    const zf = T.zFront - 0.9 - j.size * 0.4, zb = T.zBack + 0.9;
    if (j.p[2] > zf) j.v[2] -= (j.p[2] - zf) * 1.5 * dt;
    if (j.p[2] < zb) j.v[2] -= (j.p[2] - zb) * 1.5 * dt;
    // Soft spacing between bells.
    for (const o of J) if (o.i > j.i) {
      const dx = o.p[0] - j.p[0], dy = o.p[1] - j.p[1], dz = o.p[2] - j.p[2], d = Math.hypot(dx, dy, dz) || 1;
      const m = (j.size + o.size) * 1.25;
      if (d < m) {
        const k = (m - d) / m * 0.9 * dt;
        j.v[0] -= dx / d * k; j.v[1] -= dy / d * k; j.v[2] -= dz / d * k;
        o.v[0] += dx / d * k; o.v[1] += dy / d * k; o.v[2] += dz / d * k;
      }
    }
    for (let d = 0; d < 3; d++) j.p[d] += j.v[d] * dt;

    // The axis wanders slowly; a flinch turns it away from the tap.
    const wr = calm ? 0 : amb;
    j.wander += Math.sin(tank.t * 0.071 + j.seed) * 0.05 * dt * wr + Math.sin(tank.t * 0.023 + j.seed * 2.3) * 0.02 * dt * wr;
    j.wz = 0.6 * Math.sin(tank.t * 0.05 + j.seed * 1.7);
    // Bells near the wall turn inward, so the drum keeps them.
    const inw = smooth(lim - 1.5, lim + 0.5, r);
    let tx = Math.sin(j.wander), ty = Math.cos(j.wander), tz = j.wz;
    if (inw > 0) { tx = mix(tx, -j.p[0] / r, inw * 0.7); ty = mix(ty, -j.p[1] / r, inw * 0.7); }
    const fk = Math.min(1, fl * 1.6);
    tx = mix(tx, j.fdir[0], fk); ty = mix(ty, j.fdir[1], fk); tz = mix(tz, j.fdir[2], fk);
    const turn = 1 - Math.exp(-dt * (0.25 * wr + 3.2 * fl));
    for (let d = 0; d < 3; d++) j.ax[d] += ([tx, ty, tz][d] - j.ax[d]) * turn;
    j.ax[2] = clamp(j.ax[2], -0.78, 0.78);
    const al = Math.hypot(...j.ax) || 1;
    j.ax[0] /= al; j.ax[1] /= al; j.ax[2] /= al;
    // After a flinch the wander picks up the new heading.
    if (fl > 0.05) j.wander = Math.atan2(j.ax[0], j.ax[1]);
    // A calm flinch is one soft stroke.
    j.flinch = fl * Math.exp(-dt / (calm ? 0.7 : 1.7));
    if (j.flinch < 0.005) j.flinch = 0;

    chains(j, dt, F, calm ? 0 : amb);
  }
  smallStep(tank, dt, amb, F);
}

/* ---------- the starfield ---------- */
const A3 = [0, 0, 0];
function smallStep(tank, dt, amb, F) {
  const s = tank.small, calm = tank.calm, n = s.n, P = s.P, V = s.V, A = s.A;
  // A ring hits each small jelly once, as its front passes.
  for (const tp of tank.taps) {
    const f1 = (tank.t - tp.t0) * T.wave, f0 = f1 - dt * T.wave;
    if (f0 > 16) continue;
    for (let i = 0; i < n; i++) {
      const dx = P[i * 3] - tp.x, dy = P[i * 3 + 1] - tp.y, dz = P[i * 3 + 2] - tp.z;
      const d = Math.hypot(dx, dy, dz);
      if (d <= f0 || d > f1) continue;
      const k = tp.k * Math.exp(-Math.max(0, d - 0.8) / 1.4) * (calm ? 0.6 : 1);
      if (k < 0.1) continue;
      const l = d || 1;
      s.F[i * 2] = dx / l; s.F[i * 2 + 1] = dy / l;
      s.fl[i] = Math.max(s.fl[i], k);
      const p = s.ph[i] - Math.floor(s.ph[i]);
      if (p > 0.18) s.ph[i] = Math.ceil(s.ph[i]);
      const push = 0.9 * k;
      V[i * 3] += dx / l * push; V[i * 3 + 1] += dy / l * push; V[i * 3 + 2] += dz / l * push * 0.4;
    }
  }
  const dr = 1 - Math.exp(-dt * (calm ? 2.6 : 1.1));
  const wr = calm ? 0 : amb;
  for (let i = 0; i < n; i++) {
    const o = i * 3, fl = s.fl[i];
    // The pulse: as for the large bells, but quicker.
    const mid = s.ph[i] - Math.floor(s.ph[i]) > 1e-6;
    const rate = calm ? (fl > 0.02 || mid ? 1 : 0) : amb;
    const before = s.ph[i];
    let ph = before + dt / mix(s.per[i], 0.38, Math.min(1, fl * 1.3)) * rate;
    if (calm && fl <= 0.02 && Math.floor(ph) > Math.floor(before)) ph = Math.floor(ph);
    if (calm && fl <= 0.02 && before === Math.floor(before)) ph = before;
    s.ph[i] = ph;
    const c = stroke(ph) * mix(0.7, 1, Math.min(1, fl * 1.5));
    const th = Math.max(0, c - s.c[i]) * 0.22;
    s.c[i] = c;
    V[o] += A[o] * th; V[o + 1] += A[o + 1] * th; V[o + 2] += A[o + 2] * th;
    flowAt(P[o], P[o + 1], P[o + 2], F, FL);
    for (let d = 0; d < 3; d++) V[o + d] += (FL[d] - V[o + d]) * dr;
    V[o + 1] -= 0.01 * dt * wr;
    // Soft walls.
    const r = Math.hypot(P[o], P[o + 1]), lim = T.R - 0.5;
    if (r > lim) { const k = (r - lim) * 2 * dt; V[o] -= P[o] / r * k; V[o + 1] -= P[o + 1] / r * k; }
    const zf = T.zFront - 0.45, zb = T.zBack + 0.35;
    if (P[o + 2] > zf) V[o + 2] -= (P[o + 2] - zf) * 2 * dt;
    if (P[o + 2] < zb) V[o + 2] -= (P[o + 2] - zb) * 2 * dt;
    for (let d = 0; d < 3; d++) P[o + d] += V[o + d] * dt;
    // The axis wanders; a flinch turns it away from the tap.
    s.W[i] += Math.sin(tank.t * 0.13 + s.seed[i] * 60) * 0.12 * dt * wr;
    let tx = Math.sin(s.W[i]), ty = Math.cos(s.W[i]);
    const inw = smooth(lim - 1, lim + 0.3, r);
    if (inw > 0) { tx = mix(tx, -P[o] / r, inw * 0.7); ty = mix(ty, -P[o + 1] / r, inw * 0.7); }
    const fk = Math.min(1, fl * 1.6);
    tx = mix(tx, s.F[i * 2], fk); ty = mix(ty, s.F[i * 2 + 1], fk);
    A3[0] = tx; A3[1] = ty; A3[2] = 0.5 * Math.sin(tank.t * 0.07 + s.seed[i] * 40);
    const turn = 1 - Math.exp(-dt * (0.4 * wr + 4 * fl));
    for (let d = 0; d < 3; d++) A[o + d] += (A3[d] - A[o + d]) * turn;
    const al = Math.hypot(A[o], A[o + 1], A[o + 2]) || 1;
    A[o] /= al; A[o + 1] /= al; A[o + 2] /= al;
    if (fl > 0.05) s.W[i] = Math.atan2(A[o], A[o + 1]);
    s.fl[i] = fl > 0.005 ? fl * Math.exp(-dt / (calm ? 0.6 : 1.4)) : 0;
  }
}

/* ---------- chains ---------- */
// Verlet with drag toward the water, then follow-the-leader lengths.
function chains(j, dt, F, amb) {
  roots(j);
  const X = j.X, O = j.O, N = T.N, ax = j.ax, p = j.p;
  const damp = Math.exp(-dt * 5.5);
  for (let g = 0; g < CHAINS; g++) {
    const o = g * N * 3, arm = g >= T.G, L = j.len[g] / (N - 1);
    // Rest shape: down the axis, flared out from the rim.
    let rx = X[o] - p[0], ry = X[o + 1] - p[1], rz = X[o + 2] - p[2];
    const ra = rx * ax[0] + ry * ax[1] + rz * ax[2];
    rx -= ax[0] * ra; ry -= ax[1] * ra; rz -= ax[2] * ra;
    const rl = Math.hypot(rx, ry, rz) || 1, fl = arm ? 0.12 : j.S.flare;
    let dx = -ax[0] + rx / rl * fl, dy = -ax[1] + ry / rl * fl, dz = -ax[2] + rz / rl * fl;
    const dl = Math.hypot(dx, dy, dz);
    dx /= dl; dy /= dl; dz /= dl;
    // A slow sway bends the rest shape side to side.
    const sw = Math.sin(j.seed + g * 1.7 - j.phase * 6.283) * (arm ? 0.12 : 0.2) * amb;
    for (let k = 1; k < N; k++) {
      const q = o + k * 3, s = k / (N - 1);
      flowAt(X[q], X[q + 1], X[q + 2], F, FL);
      const bend = sw * s * s;
      const tx = X[o] + (dx + j.e1[0] * bend) * L * k, ty = X[o + 1] + (dy + j.e1[1] * bend) * L * k, tz = X[o + 2] + (dz + j.e1[2] * bend) * L * k;
      // Stiff at the root, loose at the tip; arms are stiffer.
      const ks = 1 - Math.exp(-dt * (arm ? j.S.ka : j.S.kt) * (1 - 0.8 * s));
      const T3 = [tx, ty, tz];
      for (let d = 0; d < 3; d++) {
        const w = FL[d] * dt, x = X[q + d];
        let nx = x + (x - O[q + d] - w) * damp + w;
        nx += (T3[d] - nx) * ks;
        X[q + d] = nx;
        O[q + d] = x;
      }
    }
    for (let k = 1; k < N; k++) {
      const a = o + (k - 1) * 3, q = o + k * 3;
      const ex = X[q] - X[a], ey = X[q + 1] - X[a + 1], ez = X[q + 2] - X[a + 2];
      const d = Math.hypot(ex, ey, ez) || 1e-6, f = L / d;
      X[q] = X[a] + ex * f; X[q + 1] = X[a + 1] + ey * f; X[q + 2] = X[a + 2] + ez * f;
    }
  }
}

/* ---------- busy ---------- */
// True while something still moves under calm or sleep.
export function busy(tank) {
  for (const j of tank.jellies) {
    if (j.flinch > 0) return true;
    if (Math.hypot(...j.v) > 0.004) return true;
    const p = j.phase - Math.floor(j.phase);
    if (tank.calm && p > 1e-6) return true;
  }
  const s = tank.small;
  for (let i = 0; i < s.n; i++) {
    if (s.fl[i] > 0) return true;
    if (Math.abs(s.V[i * 3]) + Math.abs(s.V[i * 3 + 1]) + Math.abs(s.V[i * 3 + 2]) > 0.006) return true;
    if (tank.calm && s.ph[i] - Math.floor(s.ph[i]) > 1e-6) return true;
  }
  return tank.taps.some(tp => (tank.t - tp.t0) < 3);
}

// Writes every chain point into a float texture: one row per chain.
export function pack(tank, out) {
  let o = 0;
  for (const j of tank.jellies) {
    for (let g = 0; g < CHAINS; g++) {
      for (let k = 0; k < T.N; k++) {
        const q = (g * T.N + k) * 3;
        out[o++] = j.X[q]; out[o++] = j.X[q + 1]; out[o++] = j.X[q + 2]; out[o++] = 1;
      }
    }
  }
}
