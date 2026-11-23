// Geoboard: the sim. Each band is a closed loop of contacts on a board of nails.
// Units are millimetres and seconds. Sim (x, y) lies in the board plane; z is height.
// The scene maps sim (x, y, z) to world (x, z, y).

export const B = {
  n: 5, gap: 30, margin: 22, thick: 16, radius: 3,
  pegR: 1.45, pegH: 24, headR: 3.3, headH: 1.1,
  bandH: 4.0, bandT: 2.4,
  layer0: 4.6, layerGap: 3.4,
  lift: 4.5, handR: 3.4,
  maxLam: 8.2,
};
B.size = (B.n - 1) * B.gap + 2 * B.margin;
B.handZ = B.pegH + B.headH + B.lift;

const TAU = Math.PI * 2;
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const M = 6;      // transverse modes per run
export const K = 18;     // samples per straight run

// Nail centres, row by row from the far edge.
export const PEGS = [];
for (let j = 0; j < B.n; j++) for (let i = 0; i < B.n; i++) PEGS.push({ x: (i - (B.n - 1) / 2) * B.gap, y: (j - (B.n - 1) / 2) * B.gap });
const peg = (i, j) => i + j * B.n;

// The first frame: four bands in shapes that cross.
// No edge passes through a nail: each edge step has no common factor.
export const LAYOUT = [
  { col: 'red', pegs: [peg(1, 0), peg(4, 1), peg(3, 4), peg(0, 3)] },
  { col: 'amber', pegs: [peg(0, 0), peg(2, 1), peg(1, 3)] },
  { col: 'blue', pegs: [peg(0, 4), peg(4, 3)] },
  { col: 'green', pegs: [peg(2, 1), peg(3, 1), peg(3, 2), peg(2, 2)] },
];

/* ---------- pitch ---------- */
// Neo-Hookean rubber: tension grows as lam - 1/lam^2; mass per length falls as 1/lam.
// So a run's pitch is C / l * sqrt(lam^2 - 1/lam).
const C = 4400;
// A band near its rest length is taken as just taut.
export const pitchOf = (l, lam) => { const k = Math.max(1.08, lam); return clamp(C * Math.sqrt(k * k - 1 / k) / Math.max(4, l), 55, 1700); };
// Rubber rings briefly; low runs ring longer.
const t60Of = f => clamp(0.95 * (200 / f) ** 0.35, 0.28, 1.6);
// Slow motion for the eye, as in String harp: 6 Hz at 200 Hz.
const visOm = f => TAU * 6 * (f / 200) ** 0.45;

let uid = 1;
const contact = (k, o) => ({ id: uid++, k, x: 0, y: 0, z: 0, s: 1, vx: 0, vy: 0, ...o });
const pegContact = (p, s, z) => contact('peg', { p, s, x: PEGS[p].x, y: PEGS[p].y, z });

// Sort a convex set of nails counter-clockwise, so each wraps on side +1.
function ring(pegs) {
  let cx = 0, cy = 0;
  for (const p of pegs) { cx += PEGS[p].x; cy += PEGS[p].y; }
  cx /= pegs.length; cy /= pegs.length;
  return [...pegs].sort((a, b) => Math.atan2(PEGS[a].y - cy, PEGS[a].x - cx) - Math.atan2(PEGS[b].y - cy, PEGS[b].x - cx));
}

export function makeBoard() {
  const bd = { bands: [], events: [], tension: 0.5, calm: false, queue: [], clock: 0, creak: 0, hits: new Map() };
  LAYOUT.forEach((L, i) => {
    const z0 = B.layer0 + i * B.layerGap;
    const b = { i, col: L.col, z0, cs: [], lam: 1, len: 0, t: B.bandT, h: B.bandH, runs: [], arcs: [], vib: new Map(), hand: null, free: null, drop: 0, home: ring(L.pegs), lastLen: 0 };
    b.cs = b.home.map(p => pegContact(p, 1, z0));
    bd.bands.push(b);
    solve(bd, b);
  });
  return bd;
}

export function restOf(bd) { return 96 - 34 * bd.tension; }

/* ---------- geometry ---------- */
function radiusOf(b, c) { return c.k === 'peg' ? B.pegR + b.t * 0.5 : c.k === 'hand' ? c.r : 0.8; }

// Tangent points from circle a to circle b; s = +1 puts the centre on the left.
function tangent(ax, ay, ra, sa, bx, by, rb, sb, out) {
  const dx = bx - ax, dy = by - ay, D = Math.hypot(dx, dy) || 1e-6;
  const ux = dx / D, uy = dy / D, nx = -uy, ny = ux;
  const be = clamp((sb * rb - sa * ra) / D, -1, 1), al = Math.sqrt(1 - be * be);
  const mx = al * nx + be * ux, my = al * ny + be * uy;
  out[0] = ax - sa * ra * mx; out[1] = ay - sa * ra * my;
  out[2] = bx - sb * rb * mx; out[3] = by - sb * rb * my;
}

// Signed sweep from angle a0 to a1, in the turn direction s.
function sweepOf(a0, a1, s) {
  let d = (s * (a1 - a0)) % TAU;
  if (d < 0) d += TAU;
  return d;
}

const T4 = [0, 0, 0, 0];
// The taut path: runs between tangent points, and arcs round each contact.
export function solve(bd, b) {
  const n = b.cs.length, L0 = restOf(bd);
  b.runs.length = 0; b.arcs.length = 0;
  for (let i = 0; i < n; i++) {
    const a = b.cs[i], c = b.cs[(i + 1) % n];
    tangent(a.x, a.y, radiusOf(b, a), a.s, c.x, c.y, radiusOf(b, c), c.s, T4);
    b.runs.push({ a, c, x0: T4[0], y0: T4[1], x1: T4[2], y1: T4[3], l: Math.hypot(T4[2] - T4[0], T4[3] - T4[1]), key: a.id + '>' + c.id });
  }
  let len = 0;
  for (let i = 0; i < n; i++) {
    const c = b.cs[i], rin = b.runs[(i - 1 + n) % n], rout = b.runs[i], r = radiusOf(b, c);
    const a0 = Math.atan2(rin.y1 - c.y, rin.x1 - c.x), a1 = Math.atan2(rout.y0 - c.y, rout.x0 - c.x);
    let sw = sweepOf(a0, a1, c.s);
    // A wrong-way sweep means the contact is about to let go.
    if (sw > TAU * 0.95 && n > 2) sw = 0;
    b.arcs.push({ c, a0, sw: c.s * sw, r });
    len += sw * r + rout.l;
  }
  b.len = len;
  b.lam = len / L0;
  const k = 1 / Math.sqrt(Math.max(1, b.lam));
  b.t = B.bandT * k; b.h = B.bandH * k;
}

/* ---------- topology ---------- */

// A nail whose wrap passes back through zero lets the band go.
// Each nail tracks its wrap angle from the nail centres, step by step.
// So a wrap past half a turn still counts as a wrap.
function turnAt(b, i) {
  const n = b.cs.length, c = b.cs[i], p = b.cs[(i - 1 + n) % n], q = b.cs[(i + 1) % n];
  const ax = c.x - p.x, ay = c.y - p.y, bx = q.x - c.x, by = q.y - c.y;
  if (ax * ax + ay * ay < 0.25 || bx * bx + by * by < 0.25) return null;
  return Math.atan2(ax * by - ay * bx, ax * bx + ay * by);
}
function track(b) {
  for (let i = 0; i < b.cs.length; i++) {
    const c = b.cs[i];
    if (c.k !== 'peg') continue;
    const th = turnAt(b, i);
    if (th == null) continue;
    if (c.th == null) {
      // A new contact starts at no wrap; an old one takes the turn on its side.
      c.wrap = c.fresh ? 0 : (c.s * th >= 0 ? th : th + c.s * TAU);
      c.fresh = false;
    } else {
      let d = th - c.th;
      d -= TAU * Math.round(d / TAU);
      c.wrap += d;
    }
    c.th = th;
  }
}
function unwrap(bd, b) {
  for (let pass = 0; pass < 4; pass++) {
    track(b);
    let gone = -1;
    if (b.cs.length <= 2) return;
    for (let i = 0; i < b.cs.length; i++) {
      const c = b.cs[i];
      if (c.k !== 'peg' || distinct(b, c) < 2) continue;
      if (c.s * c.wrap < -0.002) { gone = i; break; }
    }
    if (gone < 0) return;
    const c = b.cs[gone];
    b.cs.splice(gone, 1);
    bd.events.push({ type: 'tick', x: c.x, y: c.y, soft: true });
    solve(bd, b);
  }
}
// Distinct nails the band holds, leaving out one contact.
function distinct(b, skip) {
  const s = new Set();
  for (const c of b.cs) if (c !== skip && c.k === 'peg') s.add(c.p);
  return s.size;
}

// Point in triangle, with a small margin.
function inTri(px, py, ax, ay, bx, by, cx, cy) {
  const d1 = (px - bx) * (ay - by) - (ax - bx) * (py - by);
  const d2 = (px - cx) * (by - cy) - (bx - cx) * (py - cy);
  const d3 = (px - ax) * (cy - ay) - (cx - ax) * (py - ay);
  return !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0));
}

// The moving contact m swept from (ox, oy); nails under its runs catch the band.
function wrapSweep(bd, b, m, ox, oy) {
  for (let side = 0; side < 2; side++) {
    for (let k = 0; k < 3; k++) {
      const n = b.cs.length, im = b.cs.indexOf(m);
      const f = side === 0 ? b.cs[(im - 1 + n) % n] : b.cs[(im + 1) % n];
      if (f === m) break;
      let best = -1, bestA = 1e9, bestS = 1, bestZ = 0;
      const dx0 = ox - f.x, dy0 = oy - f.y;
      const g = side === 0 ? b.cs[(im + 1) % n] : b.cs[(im - 1 + n) % n];
      for (let p = 0; p < PEGS.length; p++) {
        if (f.k === 'peg' && f.p === p) continue;
        if (g.k === 'peg' && g.p === p) continue;
        const P = PEGS[p];
        // A nail at the moving point is under the finger, not under a run.
        if (Math.hypot(P.x - ox, P.y - oy) < 4 || Math.hypot(P.x - m.x, P.y - m.y) < 4) continue;
        if (m.from && m.from.p === p && Math.hypot(P.x - m.x, P.y - m.y) < 9) continue;
        if (!inTri(P.x, P.y, f.x, f.y, ox, oy, m.x, m.y)) continue;
        // The run is high near the finger and passes over the nail heads.
        const lx = m.x - f.x, ly = m.y - f.y, ll = lx * lx + ly * ly || 1;
        const u = clamp(((P.x - f.x) * lx + (P.y - f.y) * ly) / ll);
        const z = f.z + (m.z - f.z) * u;
        if (z > B.pegH - 0.4) continue;
        if (Math.hypot(P.x - f.x, P.y - f.y) < 1) continue;
        // The first nail the sweeping run meets is the least angle from its old line.
        const px = P.x - f.x, py = P.y - f.y;
        const ang = Math.abs(Math.atan2(dx0 * py - dy0 * px, dx0 * px + dy0 * py));
        if (ang < bestA) {
          bestA = ang; best = p;
          // The nail lies on this side of the run before the sweep.
          const cr = side === 0 ? dx0 * py - dy0 * px : (f.x - ox) * (P.y - oy) - (f.y - oy) * (P.x - ox);
          bestS = cr >= 0 ? 1 : -1;
          bestZ = z;
        }
      }
      if (best < 0) break;
      const c = pegContact(best, bestS, bestZ);
      c.fresh = true;
      const at = side === 0 ? im : im + 1;
      b.cs.splice(at, 0, c);
      bd.events.push({ type: 'tick', x: c.x, y: c.y });
    }
  }
}
/* ---------- vibration ---------- */
function vibOf(b, r) {
  let v = b.vib.get(r.key);
  if (!v) { v = { re: new Float64Array(M), im: new Float64Array(M), act: 0, f: 200 }; b.vib.set(r.key, v); }
  return v;
}

// A pluck is a triangle at s, split into modes. A new pluck mostly stops the old.
export function pluck(bd, b, r, s, d, why = 'pluck') {
  s = clamp(s, 0.06, 0.94);
  const v = vibOf(b, r), k = 2 * d / (Math.PI * Math.PI * s * (1 - s));
  let act = 0;
  for (let n = 0; n < M; n++) {
    const m = n + 1, A = k * Math.sin(m * Math.PI * s) / (m * m);
    v.re[n] = v.re[n] * 0.3 + A; v.im[n] *= 0.3;
    act += Math.abs(v.re[n]) + Math.abs(v.im[n]);
  }
  v.act = act;
  const f = pitchOf(r.l, b.lam);
  v.f = f;
  bd.events.push({ type: why, band: b.i, f, amp: Math.min(1, Math.abs(d) / 5), s, x: (r.x0 + r.x1) / 2, y: (r.y0 + r.y1) / 2, t60: t60Of(f), l: r.l, lam: b.lam });
}

function ringRuns(bd, b, dt) {
  const live = new Set();
  for (const r of b.runs) {
    live.add(r.key);
    const v = b.vib.get(r.key);
    if (!v || !v.act) continue;
    // The eye gets a slower decay than the ear, as the motion is slowed too.
    const f = pitchOf(r.l, b.lam), om = visOm(f), tau = t60Of(f) * 1.9 / 6.9;
    v.f = f;
    let act = 0;
    for (let n = 0; n < M; n++) {
      const g = Math.exp(-dt * (1 + 0.6 * n) / tau), a = om * (n + 1) * dt;
      const c = Math.cos(a), s = Math.sin(a);
      const re = v.re[n] * c - v.im[n] * s, im = v.re[n] * s + v.im[n] * c;
      v.re[n] = re * g; v.im[n] = im * g;
      act += Math.abs(v.re[n]) + Math.abs(v.im[n]);
    }
    if (act < 0.02) { v.re.fill(0); v.im.fill(0); act = 0; }
    v.act = act;
  }
  for (const k of b.vib.keys()) if (!live.has(k)) b.vib.delete(k);
}

// Displacement of a run at s, and its blur envelope.
export function dispAt(v, s) {
  let d = 0;
  for (let n = 0; n < M; n++) d += v.re[n] * Math.sin((n + 1) * Math.PI * s);
  return d;
}
export function envAt(v, s) {
  let e = 0;
  for (let n = 0; n < M; n++) { const w = Math.sin((n + 1) * Math.PI * s); e += (v.re[n] * v.re[n] + v.im[n] * v.im[n]) * w * w; }
  return Math.sqrt(e);
}

/* ---------- hand ---------- */
// Grab a band on a run (insert a finger) or at a nail (lift it off).
export function grab(bd, b, hit) {
  if (b.hand) return;
  settleFree(bd, b, true);
  const i = hit.c ? b.cs.indexOf(hit.c) : -1;
  let h;
  if (i >= 0 && b.cs[i].k === 'peg') {
    const c = b.cs[i];
    h = contact('hand', { x: c.x, y: c.y, z: c.z, s: c.s, r: B.handR, from: { p: c.p, s: c.s } });
    b.cs.splice(i, 1, h);
  } else {
    const r = nearestRun(b, hit.x, hit.y);
    h = contact('hand', { x: r.x, y: r.y, z: r.z, s: 1, r: 0, from: null });
    b.cs.splice(r.i + 1, 0, h);
  }
  h.tx = h.x; h.ty = h.y;
  b.hand = h;
  bd.events.push({ type: 'grab', x: h.x, y: h.y });
  solve(bd, b);
}

// The nearest point on a straight run: its index, fraction, point and height.
export function nearestRun(b, x, y) {
  let best = null, bd2 = Infinity;
  b.runs.forEach((r, i) => {
    const lx = r.x1 - r.x0, ly = r.y1 - r.y0, ll = lx * lx + ly * ly || 1;
    const s = clamp(((x - r.x0) * lx + (y - r.y0) * ly) / ll, 0.04, 0.96);
    const px = r.x0 + lx * s, py = r.y0 + ly * s, d = Math.hypot(px - x, py - y);
    if (d < bd2) { bd2 = d; best = { i, s, x: px, y: py, z: r.a.z + (r.c.z - r.a.z) * s }; }
  });
  return best;
}

// A finger swept from (x0, y0) to (x1, y1): each run it crosses twangs.
export function strumAcross(bd, x0, y0, x1, y1, speed) {
  const dx = x1 - x0, dy = y1 - y0;
  if (dx * dx + dy * dy < 1e-4) return;
  for (const b of bd.bands) {
    if (b.hand) continue;
    for (const r of b.runs) {
      const ex = r.x1 - r.x0, ey = r.y1 - r.y0, den = dx * ey - dy * ex;
      if (Math.abs(den) < 1e-6) continue;
      const t = ((r.x0 - x0) * ey - (r.y0 - y0) * ex) / den, s = ((r.x0 - x0) * dy - (r.y0 - y0) * dx) / den;
      if (t < 0 || t > 1 || s < 0.03 || s > 0.97) continue;
      // One run takes one pluck per pass of the finger.
      if ((bd.hits.get(r.key) ?? -1) > bd.clock - 0.09) continue;
      bd.hits.set(r.key, bd.clock);
      const sg = den > 0 ? 1 : -1;
      pluck(bd, b, r, s, sg * clamp(speed * 0.0042, 0.9, 6) * (bd.calm ? 0.5 : 1), 'strum');
    }
  }
}

export function moveHand(bd, b, x, y) {
  if (!b.hand) return;
  const e = B.size / 2 + 14;
  b.hand.tx = clamp(x, -e, e); b.hand.ty = clamp(y, -e, e);
}

// Let go over a nail: the band hooks it. In open space: a free point snaps back.
export function letGo(bd, b, vx = 0, vy = 0) {
  const h = b.hand;
  if (!h) return;
  b.hand = null;
  const n = b.cs.length, im = b.cs.indexOf(h);
  const prev = b.cs[(im - 1 + n) % n], next = b.cs[(im + 1) % n];
  let near = -1, nd = 9;
  PEGS.forEach((P, p) => { const d = Math.hypot(P.x - h.x, P.y - h.y); if (d < nd) { nd = d; near = p; } });
  const others = new Set(b.cs.filter(c => c !== h && c.k === 'peg').map(c => c.p));
  if (near >= 0 && (others.size >= 2 || !others.has(near))) {
    const same = c => c.k === 'peg' && c.p === near;
    if (same(prev) || same(next)) b.cs.splice(im, 1);
    else b.cs.splice(im, 1, pegContact(near, h.s, h.z));
    bd.events.push({ type: 'hook', x: PEGS[near].x, y: PEGS[near].y });
    b.drop = 1;
    solve(bd, b);
    // The band drops onto the nail and its two runs ring a little.
    const k = b.cs.findIndex(c => c.k === 'peg' && c.p === near);
    if (k >= 0) {
      const r1 = b.runs[k], r0 = b.runs[(k - 1 + b.cs.length) % b.cs.length];
      pluck(bd, b, r1, 0.3, 1.1, 'drop');
      if (r0 !== r1) pluck(bd, b, r0, 0.7, 0.8, 'quiet');
    }
    return;
  }
  // A band left on one nail flies back to the nail it came from.
  let back = null;
  if (others.size < 2) back = h.from || { p: b.home.find(p => !others.has(p)) ?? b.home[0], s: 1 };
  const f = contact('free', { x: h.x, y: h.y, z: h.z, s: h.s, vx, vy, home: back });
  b.cs.splice(im, 1, f);
  b.free = f;
  solve(bd, b);
}

/* ---------- step ---------- */
const SUB = 1 / 240;
export function step(bd, dt) {
  bd.clock += dt;
  // Queued plucks: a strum, a reset.
  for (let i = bd.queue.length - 1; i >= 0; i--) {
    const q = bd.queue[i];
    q.t -= dt;
    if (q.t <= 0) { bd.queue.splice(i, 1); q.fn(); }
  }
  let creak = 0;
  for (const b of bd.bands) {
    const h = b.hand;
    if (h) {
      // The finger lifts the band above the nail heads.
      h.z += (B.handZ - h.z) * (1 - Math.exp(-dt / 0.035));
      const dx = h.tx - h.x, dy = h.ty - h.y, d = Math.hypot(dx, dy);
      const nsub = Math.min(24, Math.max(1, Math.ceil(d / 2.5)));
      for (let s = 0; s < nsub; s++) {
        const ox = h.x, oy = h.y;
        h.x += dx / nsub; h.y += dy / nsub;
        solve(bd, b);
        // Rubber stretched near its limit holds the finger back.
        if (b.lam > B.maxLam) { h.x = ox; h.y = oy; solve(bd, b); break; }
        wrapSweep(bd, b, h, ox, oy);
        solve(bd, b);
        unwrap(bd, b);
      }
      // The finger sits on the outside of the bend.
      const n = b.cs.length, im = b.cs.indexOf(h), p = b.cs[(im - 1 + n) % n], q = b.cs[(im + 1) % n];
      const turn = (h.x - p.x) * (q.y - h.y) - (h.y - p.y) * (q.x - h.x);
      if (Math.abs(turn) > 2) h.s = turn > 0 ? 1 : -1;
      // A straight band has no bend to wrap the finger round.
      const bend = Math.PI - Math.acos(clamp(((p.x - h.x) * (q.x - h.x) + (p.y - h.y) * (q.y - h.y)) / ((Math.hypot(p.x - h.x, p.y - h.y) * Math.hypot(q.x - h.x, q.y - h.y)) || 1), -1, 1));
      h.r = B.handR * clamp(bend / 0.7);
      // Peg contacts keep the height where they caught the band.
      solve(bd, b);
      creak += Math.abs(b.len - b.lastLen) / Math.max(dt, 1e-3);
    } else if (b.free) {
      stepFree(bd, b, dt);
    } else {
      // Bands at rest settle down the nails to their layer.
      for (const c of b.cs) if (Math.abs(c.z - b.z0) > 0.01) c.z += (b.z0 - c.z) * (1 - Math.exp(-dt / 0.07)); else c.z = b.z0;
      b.drop = Math.max(0, b.drop - dt * 4);
    }
    b.lastLen = b.len;
    ringRuns(bd, b, dt);
  }
  bd.creak += (creak - bd.creak) * (1 - Math.exp(-dt / 0.06));
}

function stepFree(bd, b, dt) {
  const f = b.free;
  const nsub = Math.max(1, Math.round(dt / SUB)), h = dt / nsub;
  // Strong rubber snaps back fast; reduced motion takes a short ease.
  const K = bd.calm ? 0 : 52000;
  for (let s = 0; s < nsub && b.free; s++) {
    const n = b.cs.length, im = b.cs.indexOf(f), p = b.cs[(im - 1 + n) % n], q = b.cs[(im + 1) % n];
    const ox = f.x, oy = f.y;
    const ten = Math.max(0.25, b.lam - 1 / (b.lam * b.lam));
    let ax, ay;
    if (f.home) {
      const P = PEGS[f.home.p], dx = P.x - f.x, dy = P.y - f.y, d = Math.hypot(dx, dy) || 1;
      if (d < 2.5) { home(bd, b, f); return; }
      ax = 2 * dx / d; ay = 2 * dy / d;
    } else {
      const ux = p.x - f.x, uy = p.y - f.y, ul = Math.hypot(ux, uy) || 1;
      const vx = q.x - f.x, vy = q.y - f.y, vl = Math.hypot(vx, vy) || 1;
      ax = ux / ul + vx / vl; ay = uy / ul + vy / vl;
    }
    if (bd.calm) {
      // Reduced motion: a plain ease toward the line, with no overshoot.
      const tx = f.home ? PEGS[f.home.p].x : (p.x + q.x) / 2, ty = f.home ? PEGS[f.home.p].y : (p.y + q.y) / 2;
      const k = 1 - Math.exp(-h / 0.035);
      f.vx = (tx - f.x) * k / h; f.vy = (ty - f.y) * k / h;
    } else {
      f.vx += K * ten * ax * h; f.vy += K * ten * ay * h;
      f.vx *= 1 - 3 * h; f.vy *= 1 - 3 * h;
    }
    f.x += f.vx * h; f.y += f.vy * h;
    // The free point stays high while it flies, so it clears the heads.
    f.z += (b.z0 + 1.5 - f.z) * (1 - Math.exp(-h / 0.12));
    solve(bd, b);
    wrapSweep(bd, b, f, ox, oy);
    solve(bd, b);
    unwrap(bd, b);
    if (f.home) continue;
    // The free point crossed the line between its neighbours: it is gone.
    const n2 = b.cs.length, j = b.cs.indexOf(f), P = b.cs[(j - 1 + n2) % n2], Q = b.cs[(j + 1) % n2];
    const turn = (f.x - P.x) * (Q.y - f.y) - (f.y - P.y) * (Q.x - f.x);
    const lx = Q.x - P.x, ly = Q.y - P.y, ll = Math.hypot(lx, ly) || 1;
    const off = Math.abs(((f.x - P.x) * ly - (f.y - P.y) * lx) / ll);
    if (f.s * turn < 0 || off < 0.25) merge(bd, b, f, P, Q, lx, ly, ll);
  }
}

// The free point leaves; the run it joins twangs with its speed.
function merge(bd, b, f, P, Q, lx, ly, ll) {
  const s = ((f.x - P.x) * lx + (f.y - P.y) * ly) / (ll * ll);
  const vperp = (f.vx * -ly + f.vy * lx) / ll;
  b.cs.splice(b.cs.indexOf(f), 1);
  b.free = null;
  solve(bd, b);
  const r = b.runs.find(r => r.a === P && r.c === Q);
  const sp = Math.hypot(f.vx, f.vy);
  bd.events.push({ type: 'slap', x: f.x, y: f.y, speed: sp });
  if (r) pluck(bd, b, r, s, (vperp >= 0 ? 1 : -1) * clamp(sp * 0.0045, 0.6, 7) * (bd.calm ? 0.35 : 1), 'snap');
}

function home(bd, b, f) {
  const i = b.cs.indexOf(f);
  b.cs.splice(i, 1, pegContact(f.home.p, f.home.s, f.z));
  b.free = null;
  b.drop = 1;
  solve(bd, b);
  bd.events.push({ type: 'slap', x: f.x, y: f.y, speed: Math.hypot(f.vx, f.vy) });
  const r = b.runs[i];
  if (r) pluck(bd, b, r, 0.35, 3 * (bd.calm ? 0.35 : 1), 'snap');
}

// A grab during a snap-back ends it at once.
function settleFree(bd, b, quiet) {
  const f = b.free;
  if (!f) return;
  if (f.home) { home(bd, b, f); return; }
  b.cs.splice(b.cs.indexOf(f), 1);
  b.free = null;
  solve(bd, b);
  if (!quiet) bd.events.push({ type: 'slap', x: f.x, y: f.y, speed: 0 });
}

export function busy(bd) {
  if (bd.queue.length) return true;
  for (const b of bd.bands) {
    if (b.hand || b.free || b.drop > 0) return true;
    for (const c of b.cs) if (Math.abs(c.z - b.z0) > 0.01) return true;
    for (const v of b.vib.values()) if (v.act) return true;
  }
  return false;
}

/* ---------- actions ---------- */
// Strum: a hand sweeps left to right; each run twangs as it passes.
export function strum(bd, amp = 3.2) {
  const all = [];
  for (const b of bd.bands) for (const r of b.runs) if (r.l > 6) all.push({ b, key: r.key, x: (r.x0 + r.x1) / 2 });
  all.sort((p, q) => p.x - q.x);
  const span = B.size;
  for (const it of all) {
    bd.queue.push({ t: 0.02 + (it.x + span / 2) / span * 0.55, fn: () => {
      const r = it.b.runs.find(r => r.key === it.key);
      if (r) pluck(bd, it.b, r, 0.5 + (Math.random() - 0.5) * 0.3, amp * (0.85 + Math.random() * 0.3), 'strum');
    } });
  }
}

// Reset: each band lifts off and lands in its first shape, one after another.
export function reset(bd) {
  bd.queue.length = 0;
  bd.bands.forEach((b, i) => {
    b.hand = null; b.free = null;
    bd.queue.push({ t: 0.05 + i * 0.12, fn: () => {
      b.cs = b.home.map(p => pegContact(p, 1, B.handZ));
      b.vib.clear();
      b.drop = 1;
      solve(bd, b);
      bd.events.push({ type: 'hook', x: b.cs[0].x, y: b.cs[0].y });
      b.runs.forEach((r, k) => bd.queue.push({ t: 0.09 + k * 0.03, fn: () => {
        const rr = b.runs[k];
        if (rr) pluck(bd, b, rr, 0.5, 1.8, 'quiet');
      } }));
    } });
  });
}

export function setTension(bd, v) {
  bd.tension = clamp(v);
  for (const b of bd.bands) solve(bd, b);
}

/* ---------- sampling ---------- */
// The band's centre line: x, y, z, and the run index (arcs: minus the contact index, less one).
export function sample(bd, b, out, vis = 1) {
  let n = 0;
  const put = (x, y, z, run) => { out.x[n] = x; out.y[n] = y; out.z[n] = z; out.run[n] = run; n++; };
  const N = b.cs.length;
  for (let i = 0; i < N; i++) {
    const a = b.arcs[i], c = a.c;
    const steps = Math.max(1, Math.ceil(Math.abs(a.sw) / 0.22));
    for (let k = 0; k <= steps; k++) {
      const ang = a.a0 + a.sw * k / steps;
      put(c.x + a.r * Math.cos(ang), c.y + a.r * Math.sin(ang), c.z, -(i + 1));
    }
    const r = b.runs[i], v = b.vib.get(r.key), nx = -(r.y1 - r.y0) / (r.l || 1), ny = (r.x1 - r.x0) / (r.l || 1);
    for (let k = 1; k < K; k++) {
      const s = k / K;
      const d = v && v.act ? dispAt(v, s) * vis : 0;
      put(r.x0 + (r.x1 - r.x0) * s + nx * d, r.y0 + (r.y1 - r.y0) * s + ny * d, r.a.z + (r.c.z - r.a.z) * s + d * 0.2, i);
    }
  }
  return n;
}
