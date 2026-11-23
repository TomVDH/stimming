// Solar loop model: active regions, coronal loops, flares.
// Lengths are in Mm; the sun's radius is 696. Times are in seconds.
// The sun frame equals the view frame when the sun is not turned:
// x right, y up, z toward the viewer; the limb's top stands at (0, R, 0).
// Each frame writes one strand per loop thread into a Float32Array.

export const R = 696;
export const STRIDE = 16;
export const MAX_STRANDS = 960;
export const MAX_FLARES = 2;
// A flare runs this long, then the region is calm again.
export const FLARE_END = 50;

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const add = (a, b, k = 1) => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];
const scale = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
const norm = a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const gauss = (x, m, w) => Math.exp(-(((x - m) / w) ** 2));
// A hash in 0 to 1 for integer keys.
function hash(a, b = 0, c = 0) {
  let h = Math.imul(a | 0, 0x27d4eb2d) ^ Math.imul(b | 0, 0x165667b1) ^ Math.imul(c | 0, 0x9e3779b1);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
const sphere = (psi, beta) => [Math.sin(psi) * Math.cos(beta), Math.cos(psi) * Math.cos(beta), Math.sin(beta)];

/* ---------- bands ---------- */
// Each band sees its own temperatures. The response is in log10 of kelvin.
// disk: base, network contrast, limb brightening, corona at the limb.
// disk2: corona scale height, spicule fringe, moss, region haze.
export const BANDS = {
  gold: {
    lut: [1, 0, 0], expo: 1,
    resp: lt => gauss(lt, 5.95, 0.2) + 0.04 * gauss(lt, 7.0, 0.3),
    rope: 0.7, ribbon: 1.6, rain: 0.9, sat: 1, bubble: 0.22, wave: 0.5, loop: 1,
    disk: [0.12, 0.22, 0.5, 0.075], disk2: [48, 0.2, 0.8, 0.1],
  },
  teal: {
    lut: [0, 1, 0], expo: 1.15,
    resp: lt => 0.9 * gauss(lt, 5.62, 0.17) + 1.3 * gauss(lt, 7.05, 0.2),
    rope: 0.9, ribbon: 2.2, rain: 0.35, sat: 1.35, bubble: 0.3, wave: 0.3, loop: 1.1,
    disk: [0.05, 0.2, 0.35, 0.03], disk2: [60, 0.04, 0.45, 0.07],
  },
  red: {
    lut: [0, 0, 1], expo: 0.9,
    resp: lt => gauss(lt, 4.85, 0.28) + 0.3 * gauss(lt, 6.2, 0.22),
    rope: 1.6, ribbon: 2.4, rain: 2.2, sat: 0.7, bubble: 0.08, wave: 0.65, loop: 0.75,
    disk: [0.4, 0.32, 0.12, 0.05], disk2: [22, 1, 0.5, 0.04],
  },
};

/* ---------- regions ---------- */
// psi: angle round the limb from its top. beta: toward the viewer (+) or behind (-).
// theta: the bipole axis, 0 along the limb. span: half the footpoint gap.
const REGION_DEFS = [
  { psi: -0.115, beta: 0.03, theta: 0.12, span: [8, 46], len: 64, hk: 1.05, n: 16, lt: 5.95 },
  { psi: 0.1, beta: -0.07, theta: -0.35, span: [14, 64], len: 56, hk: 1.15, n: 14, lt: 6.0 },
  { psi: 0.26, beta: 0.16, theta: 1.1, span: [7, 28], len: 40, hk: 0.95, n: 10, lt: 5.9 },
  { psi: -0.3, beta: -0.02, theta: 0.55, span: [10, 38], len: 50, hk: 1.0, n: 12, lt: 5.95 },
  { psi: 0.01, beta: 0.2, theta: 0.3, span: [7, 26], len: 45, hk: 0.9, n: 10, lt: 5.9 },
];

export function makeSun() {
  const regions = REGION_DEFS.map((d, ri) => {
    const c = sphere(d.psi, d.beta);
    const t1 = norm(cross(c, [0, 0, 1]));
    const t2 = cross(t1, c);
    const e = norm(add(scale(t1, Math.cos(d.theta)), t2, Math.sin(d.theta)));
    const f = cross(c, e);
    const bundles = [];
    for (let i = 0; i < d.n; i++) {
      const h = k => hash(ri * 97 + i, k, 3);
      bundles.push({
        id: ri * 100 + i,
        rank: h(1),
        // Nested spans: the inner loops are low, the outer loops tall.
        a: d.span[0] + (d.span[1] - d.span[0]) * Math.pow(h(2), 0.8),
        off: (h(3) - 0.5) * d.len * 0.8,
        shear: (h(4) - 0.5) * 16,
        // Loops lean outward from the region's middle, as a fan.
        tilt: (h(5) - 0.5) * 0.5 + (h(3) - 0.5) * 0.9,
        period: 24 + 22 * h(6),
        phase: h(7),
        lt: d.lt + (h(8) - 0.5) * 0.32,
        threads: 3 + Math.floor(h(9) * 4),
        tall: 0.85 + 0.55 * h(10),
        // Each bundle turns its own axis and shifts its middle.
        turn: (h(11) - 0.5) * 1.1,
        mid: (h(12) - 0.5) * 1.1,
      });
    }
    // Long loops and open fans: faint threads that climb out of the frame.
    for (let i = 0; i < 2; i++) {
      const h = k => hash(ri * 97 + i, k, 9);
      bundles.push({
        id: ri * 100 + 50 + i, rank: 0.2 + 0.7 * h(1),
        a: d.span[1] * (1.6 + 1.6 * h(2)), off: (h(3) - 0.5) * d.len, shear: (h(4) - 0.5) * 30,
        tilt: (h(5) < 0.5 ? -1 : 1) * (0.5 + 0.6 * h(9)), period: 40 + 30 * h(6), phase: h(7), lt: d.lt - 0.05,
        threads: 3, tall: 1.6 + 1.4 * h(8), faint: 0.2, turn: (h(10) - 0.5) * 1.2, mid: 0,
      });
    }
    return { ...d, ri, c, e, f, bundles, lastFlare: -1e9 };
  });
  return { regions, flares: [] };
}

/* ---------- strands ---------- */
// One strand: footpoints A and B (unit vectors), apex height, tilt, width, light, flow phase,
// drain, twist radius, twist turns, twist phase, kind (0 loop, 1 ribbon on the surface, 2 rope).
function put(out, n, A, h, B, tilt, w, I, ph, drain, twR = 0, twN = 0, twP = 0, kind = 0) {
  if (n >= MAX_STRANDS || I < 1e-4) return n;
  const o = n * STRIDE;
  out[o] = A[0]; out[o + 1] = A[1]; out[o + 2] = A[2]; out[o + 3] = h;
  out[o + 4] = B[0]; out[o + 5] = B[1]; out[o + 6] = B[2]; out[o + 7] = tilt;
  out[o + 8] = w; out[o + 9] = I; out[o + 10] = ph; out[o + 11] = drain;
  out[o + 12] = twR; out[o + 13] = twN; out[o + 14] = twP; out[o + 15] = kind;
  return n + 1;
}
// A point on the surface: the region's centre, moved by e and f in Mm.
const foot = (rg, de, df) => norm(add(add(scale(rg.c, R), rg.e, de), rg.f, df));
// A foot on a bundle's own axis, turned by ang from the region's axis.
function footT(rg, ang, de, df) {
  const c = Math.cos(ang), s = Math.sin(ang);
  return foot(rg, de * c - df * s, de * s + df * c);
}

// The life of one ambient loop over its period: rise, shine, drain, fade.
function life(l) {
  const vis = sstep(0, 0.12, l) * (1 - sstep(0.84, 0.97, l));
  const drain = clamp((l - 0.56) / 0.3);
  return { vis, drain, rise: 0.8 + 0.2 * sstep(0, 0.35, l) };
}

// A flare's parts over its own clock t.
export const flareCurve = {
  sep: (t, rg) => (0.12 + 0.5 * (1 - Math.exp(-t / 9))) * rg.span[1],
  ribbon: t => sstep(0, 0.1, t) * (0.3 + 0.7 * Math.exp(-t / 2.2)) * Math.exp(-t / 16) * (1 - sstep(30, 42, t)),
  kernel: t => sstep(0, 0.05, t) * Math.exp(-t / 1.5),
  ropeH: (t, h0) => h0 + 22 * t + 42 * t * t,
  // The region's own loops: a burst as they reconnect, gone, then back.
  ambient: t => (1 + 1.6 * Math.exp(-t / 0.45)) * (1 - 0.88 * sstep(0.4, 3, t)) + 0.88 * sstep(28, 44, t),
  // Arcade loop j forms at this time: low loops first, then higher.
  born: j => 0.45 + 0.62 * j + 0.012 * j * j,
};
export const ARCADE = 22;
// The rope lies across the neutral line at a slant, so its arch shows side on.
const ROPE_TURN = 0.85;

// Light of the region's filament rope at rest: it forms again after a flare.
function ropeRest(rg, time) {
  return sstep(32, 52, time - rg.lastFlare);
}

/**
 * Writes every strand for the given clock into out.
 * @returns {number} The strand count.
 */
export function strands(sun, time, { band, activity }, out) {
  const B = BANDS[band];
  let n = 0;
  const act = clamp(activity);
  for (const rg of sun.regions) {
    const fl = sun.flares.find(f => f.rg === rg);
    const amb = fl ? flareCurve.ambient(fl.t) : 1;
    for (const b of rg.bundles) {
      // Low activity leaves fewer loops alive and makes them dimmer.
      const alive = sstep(b.rank - 0.12, b.rank + 0.02, 0.3 + 0.75 * act);
      if (alive <= 0) continue;
      const per = b.period * (1.25 - 0.4 * act);
      const u = time / per + b.phase;
      const cyc = Math.floor(u), l = u - cyc;
      const L = life(l);
      if (L.vis <= 0) continue;
      // Each new cycle draws the loop with a new shape.
      const j = k => hash(b.id, cyc, k);
      const a = b.a * (0.82 + 0.36 * j(1));
      const off = b.off + (j(2) - 0.5) * 14;
      const sh = b.shear + (j(3) - 0.5) * 10;
      const tilt = b.tilt + (j(4) - 0.5) * 0.35;
      const lt = b.lt + (j(5) - 0.5) * 0.18;
      const I0 = B.resp(lt) * B.loop * L.vis * alive * amb * (0.55 + 0.45 * act) * (0.6 + 0.8 * j(6) * j(6)) * (b.faint || 1);
      const h = a * rg.hk * b.tall * L.rise;
      for (let k = 0; k < b.threads; k++) {
        const q = m => hash(b.id * 7 + k, cyc, m + 10);
        // Threads of one bundle share their feet and part a little at the top.
        const da = (q(1) - 0.5) * 2.4, dof = (q(2) - 0.5) * 7;
        const m = b.mid * a + (j(7) - 0.5) * 8;
        const A = footT(rg, b.turn, m + a + da + (q(3) - 0.5) * 1.5, off + sh + dof);
        const Bf = footT(rg, b.turn, m - a - da + (q(4) - 0.5) * 1.5, off - sh + dof);
        const w = 0.45 + 1.1 * q(5) * q(5);
        const I = I0 * (0.3 + 0.7 * q(6)) * 0.36;
        n = put(out, n, A, h * (0.97 + 0.06 * q(7)), Bf, tilt + (q(8) - 0.5) * 0.14, w, I, q(9) * 7, L.drain);
      }
    }
    // The filament: a low twisted rope along the region's neutral line.
    const rest = fl ? 0 : ropeRest(rg, time);
    if (rest > 0) {
      const h0 = rg.span[1] * 0.42;
      const A = footT(rg, ROPE_TURN, 0, -rg.len * 0.55), Bf = footT(rg, ROPE_TURN, 0, rg.len * 0.55);
      for (let k = 0; k < 5; k++) n = put(out, n, A, h0, Bf, 0, 1.3, B.rope * 0.07 * rest, k, 0, 2.5, 1.3, k * 1.2566 + time * 0.05, 2);
    }
  }
  for (const fl of sun.flares) n = flareStrands(fl, B, out, n);
  return n;
}

function flareStrands(fl, B, out, n) {
  const { rg, t } = fl;
  const C = flareCurve;
  const sep = C.sep(t, rg);
  const len = rg.len * 0.9;
  // Two ribbons, one each side of the neutral line, parting as the flare runs.
  const rib = C.ribbon(t) * B.ribbon * fl.k;
  if (rib > 0.001) {
    for (const s of [-1, 1]) {
      for (let k = 0; k < 3; k++) {
        const wob = (hash(fl.seed, k, s + 5) - 0.5) * 3;
        const A = foot(rg, s * (sep + wob), -len / 2 + k * 3), Bf = foot(rg, s * (sep - wob), len / 2 - k * 4);
        n = put(out, n, A, 0.9, Bf, 0, 1.3 + k * 0.5, rib * (k === 0 ? 1.4 : 0.6), k, 0, 0, 0, 0, 1);
      }
    }
  }
  // The rope lifts off with growing speed and leaves the frame.
  const h0 = rg.span[1] * 0.42;
  const hr = C.ropeH(t, h0);
  const ropeI = B.rope * (0.4 + 2.2 * Math.exp(-t / 0.9)) * sstep(0, 0.15, t) * (1 - sstep(380, 760, hr)) * fl.k;
  if (ropeI > 0.002) {
    const A = footT(rg, ROPE_TURN, 0, -rg.len * 0.6), Bf = footT(rg, ROPE_TURN, 0, rg.len * 0.6);
    const twR = 2.5 + 0.2 * (hr - h0);
    for (let k = 0; k < 7; k++) {
      n = put(out, n, A, hr, Bf, 0.08 * Math.sin(k), 1.4 + 0.008 * hr, ropeI * 0.16, k, 0, twR, 0.9, k * 0.8976 + t * 0.7, 2);
    }
  }
  // The arcade: loops snap in over the ribbons, each born hot, then cooling.
  for (let j = 0; j < ARCADE; j++) {
    const tj = C.born(j);
    const tau = t - tj;
    if (tau <= 0) break;
    const q = m => hash(fl.seed * 31 + j, m, 77);
    const a = C.sep(tj, rg) * (0.95 + 0.15 * q(1));
    const lt = Math.log10(0.9e6 + 21e6 * Math.exp(-tau / 1.6));
    const em = sstep(0, 0.25, tau) * Math.exp(-tau / 30) * (1 - sstep(30, 40, tau));
    // Every band sees the snap; then each sees the loop at its own temperature.
    const I = (B.resp(lt) + 1.2 * Math.exp(-tau / 0.45)) * em * 0.6 * fl.k;
    if (I < 0.003) continue;
    const off = (q(2) - 0.5) * len;
    const drain = clamp((tau - 12) / 13);
    for (let k = 0; k < 2; k++) {
      const A = foot(rg, a + (q(3 + k) - 0.5) * 3, off + (q(5 + k) - 0.5) * 4 + 2);
      const Bf = foot(rg, -a + (q(7 + k) - 0.5) * 3, off + (q(9 + k) - 0.5) * 4 - 2);
      n = put(out, n, A, a * 1.2 + 3, Bf, (q(11) - 0.5) * 0.2, 1.1 + 0.6 * q(12 + k), I * (k ? 0.55 : 0.8), q(14) * 7, drain);
    }
  }
  return n;
}

/* ---------- flares ---------- */
export function startFlare(sun, rg, time, k = 1) {
  sun.flares = sun.flares.filter(f => f.rg !== rg);
  if (sun.flares.length >= MAX_FLARES) sun.flares.shift();
  const fl = { rg, t: 0, k, seed: Math.floor(Math.random() * 1e6) };
  sun.flares.push(fl);
  rg.lastFlare = time;
  return fl;
}
export function stepFlares(sun, dt) {
  for (const f of sun.flares) f.t += dt;
  sun.flares = sun.flares.filter(f => f.t < FLARE_END);
}

/**
 * Uniforms for the disk pass and the detector, per flare, in the sun frame.
 * wave: front angle (rad) and light. bubble: centre height, radius, light.
 * kernel: the saturating core, at a point just above the surface.
 */
export function flareView(fl, band) {
  const B = BANDS[band], C = flareCurve, rg = fl.rg, t = fl.t;
  const h0 = rg.span[1] * 0.42;
  const hr = C.ropeH(t, h0);
  return {
    c: rg.c,
    wave: [(30 + 210 * t) / R, B.wave * 0.5 * sstep(0.25, 0.9, t) * Math.exp(-t / 3.2) * fl.k],
    bubble: [0.75 * hr, 0.6 * hr + 14, B.bubble * sstep(0.2, 0.9, t) * Math.exp(-t / 4) * fl.k],
    kernel: [rg.span[1] * 0.25, C.kernel(t) * B.sat * fl.k],
  };
}
