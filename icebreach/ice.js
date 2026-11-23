// Ice breach ice: a Voronoi floe round the sail, each slab a rigid body.
// Frame: the sub frame on the water line; x along the hull, y up, z to starboard.
import * as THREE from 'three';
import { subSDF } from './sub.js';

// The broken field: a rectangle round the sub, in frame metres.
export const X0 = -64, X1 = 52, Z0 = -30, Z1 = 30;
// The star's centre: over the sail's front top.
export const CX = 1.5, CZ = 0;
// Snow on the ice, in metres.
export const SNOW = 0.24;
const G = 9.81;
// Ice and snow float with this share under the water.
const SINK = 0.8;

/* ---------- seeds and cells ---------- */
function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

function seeds(r01) {
  const S = [];
  // The star: rings of wedges round the centre, wider along the hull.
  const rings = [[1.8, 6], [3.8, 9], [6.4, 12], [9.6, 15], [13.4, 18]];
  rings.forEach(([r, n], k) => {
    const a0 = r01() * Math.PI * 2;
    for (let i = 0; i < n; i++) {
      const a = a0 + (i + 0.5 * (r01() - 0.5)) * (Math.PI * 2 / n);
      const rr = r * (0.85 + 0.3 * r01());
      S.push([CX + Math.cos(a) * rr * 1.45, CZ + Math.sin(a) * rr, k]);
    }
  });
  // The crown line: pairs of seeds either side of the hull's top.
  for (let x = X0 + 4; x < X1 - 3; x += 5 + 2 * r01()) {
    if (Math.abs(x - CX) / 1.45 < 16) continue;
    for (const sz of [-1, 1]) S.push([x + r01() * 2, sz * (2.6 + 1.6 * r01()), 4]);
  }
  // The rest: scattered floes, larger away from the centre.
  for (let tries = 0; tries < 4000; tries++) {
    const x = X0 + (X1 - X0) * r01(), z = Z0 + (Z1 - Z0) * r01();
    const e = Math.hypot((x - CX) / 1.45, z - CZ);
    if (e < 16) continue;
    const gap = 4.6 + 0.14 * e;
    if (S.every(s => Math.hypot(s[0] - x, s[1] - z) > gap)) S.push([x, z, 5]);
  }
  return S;
}

// Clips a convex polygon to the half-plane dot(p - m, d) <= 0.
function clip(poly, mx, mz, dx, dz) {
  const out = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    const fa = (a[0] - mx) * dx + (a[1] - mz) * dz, fb = (b[0] - mx) * dx + (b[1] - mz) * dz;
    if (fa <= 0) out.push(a);
    if ((fa < 0) !== (fb < 0) && fa !== fb) {
      const t = fa / (fa - fb);
      out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
    }
  }
  return out;
}

function cells(S) {
  const rect = [[X0, Z0], [X1, Z0], [X1, Z1], [X0, Z1]];
  return S.map(([sx, sz, ring], i) => {
    let poly = rect;
    for (let j = 0; j < S.length; j++) {
      if (j === i) continue;
      const [tx, tz] = S[j];
      if (Math.hypot(tx - sx, tz - sz) > 60) continue;
      poly = clip(poly, (sx + tx) / 2, (sz + tz) / 2, tx - sx, tz - sz);
      if (poly.length < 3) break;
    }
    return { poly, ring };
  }).filter(c => c.poly.length >= 3);
}

function centroid(poly) {
  let a = 0, cx = 0, cz = 0;
  for (let i = 0; i < poly.length; i++) {
    const [x0, z0] = poly[i], [x1, z1] = poly[(i + 1) % poly.length];
    const c = x0 * z1 - x1 * z0;
    a += c; cx += (x0 + x1) * c; cz += (z0 + z1) * c;
  }
  a *= 0.5;
  return [cx / (6 * a), cz / (6 * a), Math.abs(a)];
}

const onRect = (p, q) => (Math.abs(p[0] - q[0]) < 1e-6 && (Math.abs(p[0] - X0) < 1e-6 || Math.abs(p[0] - X1) < 1e-6))
  || (Math.abs(p[1] - q[1]) < 1e-6 && (Math.abs(p[1] - Z0) < 1e-6 || Math.abs(p[1] - Z1) < 1e-6));

/* ---------- slab geometry ---------- */
// Attributes: position, normal, aKind (0 top, 1 side, 2 bottom), aHome (home xz),
// aCrack (centroid weight, distance to the edge, the front that opens it).
function slabGeometry(poly, cx, cz, top, bot) {
  const mid = (top + bot) / 2, P = [], N = [], K = [], H = [], C = [];
  const v = (x, y, z, nx, ny, nz, k, cr) => { P.push(x - cx, y - mid, z - cz); N.push(nx, ny, nz); K.push(k); H.push(x, z); C.push(...cr); };
  const n = poly.length;
  for (let i = 0; i < n; i++) {
    const a = poly[i], b = poly[(i + 1) % n];
    // The edge's distance from the centroid, for the crack line.
    const ex = b[0] - a[0], ez = b[1] - a[1], el = Math.hypot(ex, ez) || 1;
    const hgt = Math.abs((cx - a[0]) * ez - (cz - a[1]) * ex) / el;
    // The front reaches radial cracks first and rings later.
    const mx = (a[0] + b[0]) / 2 - CX, mz = (a[1] + b[1]) / 2 - CZ;
    const md = Math.hypot(mx / 1.45, mz) || 1;
    const radial = Math.abs((ex * mx / 1.45 + ez * mz) / (el * md));
    const key = onRect(a, b) ? 999 : md * (radial > 0.6 ? 1 : 1.7);
    // Top: a fan from the centroid.
    v(cx, top, cz, 0, 1, 0, 0, [1, hgt, key]);
    v(b[0], top, b[1], 0, 1, 0, 0, [0, hgt, key]);
    v(a[0], top, a[1], 0, 1, 0, 0, [0, hgt, key]);
    // Bottom.
    v(cx, bot, cz, 0, -1, 0, 2, [1, hgt, 999]);
    v(a[0], bot, a[1], 0, -1, 0, 2, [0, hgt, 999]);
    v(b[0], bot, b[1], 0, -1, 0, 2, [0, hgt, 999]);
    // Side: outward normal; aCrack.y holds the height from the bottom.
    const nx = ez / el, nz = -ex / el;
    const T = top - bot;
    v(a[0], top, a[1], nx, 0, nz, 1, [0, T, key]);
    v(b[0], top, b[1], nx, 0, nz, 1, [0, T, key]);
    v(a[0], bot, a[1], nx, 0, nz, 1, [0, 0, key]);
    v(b[0], top, b[1], nx, 0, nz, 1, [0, T, key]);
    v(b[0], bot, b[1], nx, 0, nz, 1, [0, 0, key]);
    v(a[0], bot, a[1], nx, 0, nz, 1, [0, 0, key]);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3));
  g.setAttribute('aKind', new THREE.Float32BufferAttribute(K, 1));
  g.setAttribute('aHome', new THREE.Float32BufferAttribute(H, 2));
  g.setAttribute('aCrack', new THREE.Float32BufferAttribute(C, 3));
  return g;
}

/* ---------- the field ---------- */
/**
 * Builds the floe: slab bodies and their geometry.
 * thick is the ice under the snow, in metres.
 */
export function makeField(thick, seed = 7) {
  const r01 = rng(seed);
  const C = cells(seeds(r01));
  const T = thick + SNOW, top = T * (1 - SINK), bot = -T * SINK, mid = (top + bot) / 2;
  const slabs = C.map(({ poly, ring }) => {
    const [cx, cz, A] = centroid(poly);
    const rho = Math.sqrt(A / Math.PI);
    const m = A * T * 900;
    const It = m * (rho * rho / 4 + T * T / 12), Iy = m * rho * rho / 2;
    // Contacts: corners top and bottom, the bottom centre, mid-edges on big slabs.
    const pts = [], cols = [];
    const ring2 = [];
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i], b = poly[(i + 1) % poly.length];
      ring2.push([a[0] - cx, a[1] - cz]);
      if (Math.hypot(b[0] - a[0], b[1] - a[1]) > 5) ring2.push([(a[0] + b[0]) / 2 - cx, (a[1] + b[1]) / 2 - cz]);
    }
    for (const [x, z] of ring2) {
      pts.push(new THREE.Vector3(x, bot - mid, z), new THREE.Vector3(x, top - mid, z));
      // Columns sit half way in, so the slab rocks less on its corners.
      cols.push(new THREE.Vector3(x * 0.6, bot - mid, z * 0.6));
    }
    pts.push(new THREE.Vector3(0, bot - mid, 0));
    cols.push(new THREE.Vector3(0, bot - mid, 0));
    // The slab's own outline, local, for slab-on-slab tests.
    const local = poly.map(([x, z]) => [x - cx, z - cz]);
    return {
      poly, local, ring, cx, cz, A, rho, m, It, Iy, T, half: T / 2,
      pts, cols,
      home: new THREE.Vector3(cx, mid, cz),
      x: new THREE.Vector3(cx, mid, cz), q: new THREE.Quaternion(),
      v: new THREE.Vector3(), w: new THREE.Vector3(),
      Ii: new Float64Array(9), awake: false, still: 0, rad: Math.hypot(rho * 1.6, T),
      kx: 0, kz: 0,
    };
  });
  // The field's reach from its centre, in the star's metric.
  slabs.forEach(s => { s.e = Math.hypot((s.cx - CX) / 1.45, s.cz - CZ); });
  return { slabs, T, top, bot, mid, thick };
}

/** Builds one geometry per slab, for a BatchedMesh. */
export function fieldGeometries(F) {
  return F.slabs.map(s => slabGeometry(s.poly, s.cx, s.cz, F.top, F.bot));
}

/* ---------- the bulge before the breach ---------- */
const UP = new THREE.Vector3(0, 1, 0), tN = new THREE.Vector3();
/** Poses every slab on a cone over the sail: amplitude A metres. */
export function poseBulge(F, A) {
  const r0 = 9 + 2.5 * F.thick;
  for (const s of F.slabs) {
    const dx = s.cx - CX, dz = s.cz - CZ, e = Math.max(0.3, Math.hypot(dx / 1.45, dz));
    const u = Math.max(0, 1 - e / r0);
    const h = A * Math.pow(u, 1.5);
    const g = -1.5 * A * Math.sqrt(u) / r0;
    const gx = g * dx / (1.45 * 1.45 * e), gz = g * dz / e;
    s.x.set(s.cx, F.mid + h, s.cz);
    tN.set(-gx, 1, -gz).normalize();
    s.q.setFromUnitVectors(UP, tN);
    s.v.set(0, 0, 0); s.w.set(0, 0, 0);
  }
}

/* ---------- rigid bodies ---------- */
const M3 = new THREE.Matrix3(), tA = new THREE.Vector3(), tB = new THREE.Vector3(), tR = new THREE.Vector3(),
  tP = new THREE.Vector3(), tV = new THREE.Vector3(), tJ = new THREE.Vector3(), tAx = new THREE.Vector3(), tQ = new THREE.Quaternion();
const nS = new THREE.Vector3();

// The world inverse inertia: R diag(1/I) R^T, kept per body each substep.
function inertia(s) {
  const e = M3.setFromMatrix4(tmpM4.makeRotationFromQuaternion(s.q)).elements;
  const d = [1 / s.It, 1 / s.Iy, 1 / s.It];
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
    let acc = 0;
    for (let k = 0; k < 3; k++) acc += e[i + 3 * k] * d[k] * e[j + 3 * k];
    s.Ii[i * 3 + j] = acc;
  }
}
const tmpM4 = new THREE.Matrix4();
function mulI(s, a, out) {
  const I = s.Ii;
  return out.set(I[0] * a.x + I[1] * a.y + I[2] * a.z, I[3] * a.x + I[4] * a.y + I[5] * a.z, I[6] * a.x + I[7] * a.y + I[8] * a.z);
}
function impulse(s, r, J) {
  s.v.addScaledVector(J, 1 / s.m);
  s.w.add(mulI(s, tA.crossVectors(r, J), tB));
}
// The point's velocity: v + w x r.
const pointV = (s, r, out) => out.crossVectors(s.w, r).add(s.v);
function kEff(s, r, n) {
  mulI(s, tA.crossVectors(r, n), tB);
  return 1 / s.m + n.dot(tA.crossVectors(tB, r));
}

/**
 * Steps the field by h seconds.
 * sub: { y (hull axis height), vy }; water: level at x, z.
 */
export function stepField(F, h, sub, events) {
  const S = F.slabs;
  for (const s of S) {
    if (!s.awake) continue;
    inertia(s);
    // Gravity.
    s.v.y -= G * h;
    // Buoyancy and drag, column by column.
    const wpc = 1 / s.cols.length;
    tAx.set(0, 1, 0).applyQuaternion(s.q);
    let wet = 0;
    for (const c of s.cols) {
      tR.copy(c).applyQuaternion(s.q);
      tP.copy(tR).add(s.x);
      const sub2 = Math.min(F.T, Math.max(0, -tP.y / Math.max(0.3, tAx.y)));
      if (sub2 <= 0) continue;
      wet += wpc * sub2 / F.T;
      tR.addScaledVector(tAx, sub2 / 2);
      const k = sub2 / F.T;
      tJ.set(0, (s.m / SINK) * G * wpc * k * h, 0);
      pointV(s, tR, tV);
      // Water drags the moving part, harder up and down.
      tJ.x -= s.m * wpc * k * 1.6 * tV.x * h;
      tJ.y -= s.m * wpc * k * 3.0 * tV.y * h;
      tJ.z -= s.m * wpc * k * 1.6 * tV.z * h;
      impulse(s, tR, tJ);
    }
    // The pack pulls a floating slab back toward its place.
    if (wet > 0.3) {
      const k = 0.12;
      s.v.x += ((s.home.x - s.x.x) * k - s.v.x * 0.6) * h;
      s.v.z += ((s.home.z - s.x.z) * k - s.v.z * 0.6) * h;
      // Yaw back home: the y part of the turn from here to home.
      tQ.copy(s.q).invert().premultiply(s.homeQ || IDQ);
      const ang = 2 * Math.atan2(tQ.y, tQ.w);
      s.w.y += (ang * 0.3 - s.w.y * 0.6) * h;
      s.w.multiplyScalar(1 - 1.5 * h * wet);
    }
    // Brash ice and friction take a little of every motion, more once the sub is still.
    const damp = sub.calm ? 2.2 : 0.15;
    s.v.multiplyScalar(1 - damp * h);
    s.w.multiplyScalar(1 - (damp + 0.4) * h);
  }
  // Contacts: two passes.
  for (let it = 0; it < 2; it++) {
    for (const s of S) {
      if (!s.awake) continue;
      for (const p of s.pts) {
        tR.copy(p).applyQuaternion(s.q);
        tP.copy(tR).add(s.x);
        contactSub(s, tR, tP, sub, h, events);
        contactEdge(s, tR, tP, F, h);
      }
    }
    if (it === 0) contactSlabs(F, h, events);
  }
  // Integrate.
  for (const s of S) {
    if (!s.awake) continue;
    s.x.addScaledVector(s.v, h);
    tQ.set(s.w.x * h * 0.5, s.w.y * h * 0.5, s.w.z * h * 0.5, 0).multiply(s.q);
    s.q.x += tQ.x; s.q.y += tQ.y; s.q.z += tQ.z; s.q.w += tQ.w;
    s.q.normalize();
    // Sleep after a still second.
    const e = s.v.lengthSq() + s.w.lengthSq() * s.rho * s.rho;
    s.still = e < 3e-3 ? s.still + h : 0;
    if (s.still > 0.8) { s.awake = false; s.v.set(0, 0, 0); s.w.set(0, 0, 0); }
  }
}
const IDQ = new THREE.Quaternion();

const tN2 = new THREE.Vector3(), tT = new THREE.Vector3();
function solve(s, r, n, pen, vSurf, h, mu) {
  pointV(s, r, tV);
  tV.sub(vSurf);
  const vn = tV.dot(n);
  // The push-out speed is capped, so a deep start never fires a slab.
  const bias = Math.min(Math.max(0, pen - 0.01) * 0.25 / h, 0.6 + Math.abs(vSurf.y));
  if (vn >= bias) return 0;
  const k = kEff(s, r, n);
  const lam = (bias - vn) / k;
  // A degenerate contact gives no impulse.
  if (!Number.isFinite(lam)) return 0;
  tJ.copy(n).multiplyScalar(lam);
  impulse(s, r, tJ);
  // Friction against the surface.
  pointV(s, r, tV); tV.sub(vSurf);
  tT.copy(tV).addScaledVector(n, -tV.dot(n));
  const vt = tT.length();
  if (vt > 1e-5) {
    tT.multiplyScalar(1 / vt);
    const lt = Math.min(vt / kEff(s, r, tT), mu * lam);
    tJ.copy(tT).multiplyScalar(-lt);
    impulse(s, r, tJ);
  }
  return lam;
}

const vSub = new THREE.Vector3(), ZERO = new THREE.Vector3();
function contactSub(s, r, p, sub, h, events) {
  const d = subSDF(p.x - sub.x, p.y - sub.y, p.z, nS);
  if (d >= 0.02) return;
  vSub.set(0, sub.vy, 0);
  // Wet tiles let slabs slide.
  const lam = solve(s, r, nS, -d, vSub, h, 0.18);
  if (lam > s.m * 1.2 && events) events.push({ type: 'knock', x: p.x, y: p.y, z: p.z, k: lam / s.m });
}

// The unbroken floe round the field holds slabs in and carries them on top.
function contactEdge(s, r, p, F, h) {
  let ox = 0, oz = 0;
  if (p.x < X0) ox = X0 - p.x; else if (p.x > X1) ox = X1 - p.x;
  if (p.z < Z0) oz = Z0 - p.z; else if (p.z > Z1) oz = Z1 - p.z;
  if (!ox && !oz) return;
  if (p.y < F.bot - 0.1 || p.y > F.top) return;
  const up = F.top - p.y;
  if (up < Math.max(Math.abs(ox), Math.abs(oz))) { tN2.set(0, 1, 0); solve(s, r, tN2, up, ZERO, h, 0.5); }
  else if (Math.abs(ox) > Math.abs(oz)) { tN2.set(Math.sign(ox), 0, 0); solve(s, r, tN2, Math.abs(ox), ZERO, h, 0.4); }
  else { tN2.set(0, 0, Math.sign(oz)); solve(s, r, tN2, Math.abs(oz), ZERO, h, 0.4); }
}

/* ---------- slab on slab ---------- */
const lp = new THREE.Vector3(), qi = new THREE.Quaternion(), rB = new THREE.Vector3(), vA = new THREE.Vector3(), vB = new THREE.Vector3();
// Signed distance inside a convex local outline (positive inside), with the nearest edge's outward normal.
function insideDist(local, x, z, out) {
  let best = 1e9;
  for (let i = 0; i < local.length; i++) {
    const a = local[i], b = local[(i + 1) % local.length];
    const ex = b[0] - a[0], ez = b[1] - a[1], el = Math.hypot(ex, ez) || 1;
    // The outline runs clockwise in x, z; the outward normal is (ez, -ex).
    const nx = ez / el, nz = -ex / el;
    const d = -((x - a[0]) * nx + (z - a[1]) * nz);
    if (d < best) { best = d; out[0] = nx; out[1] = nz; }
  }
  return best;
}
const nrm = [0, 0];
/** Lists slab pairs near enough to touch this frame, each both ways. */
export function pairUp(F) {
  const S = F.slabs, P = F.pairs || (F.pairs = []);
  P.length = 0;
  for (let i = 0; i < S.length; i++) {
    const A = S[i];
    for (let j = i + 1; j < S.length; j++) {
      const B = S[j];
      if (!A.awake && !B.awake) continue;
      if (A.x.distanceToSquared(B.x) > (A.rad + B.rad + 0.25) ** 2) continue;
      P.push(A, B, B, A);
    }
  }
}
function contactSlabs(F, h, events) {
  const P = F.pairs || [];
  for (let k = 0; k < P.length; k += 2) {
    const A = P[k], B = P[k + 1];
    {
      qi.copy(B.q).invert();
      for (const p of A.pts) {
        tR.copy(p).applyQuaternion(A.q);
        tP.copy(tR).add(A.x);
        lp.copy(tP).sub(B.x).applyQuaternion(qi);
        if (lp.y > B.half + 0.02 || lp.y < -B.half + 0.05) continue;
        const din = insideDist(B.local, lp.x, lp.z, nrm);
        if (din < 0.06) continue;
        const dTop = B.half - lp.y;
        let pen, n = tN2;
        if (dTop < din) { n.set(0, 1, 0).applyQuaternion(B.q); pen = dTop; }
        else { n.set(-nrm[0], 0, -nrm[1]).applyQuaternion(B.q); pen = din; n.negate(); }
        // n points from B to A.
        rB.copy(tP).sub(B.x);
        pointV(A, tR, vA); pointV(B, rB, vB);
        const vn = vA.sub(vB).dot(n);
        const bias = Math.min(Math.max(0, pen - 0.02) * 0.2 / h, 0.5);
        if (vn >= bias) continue;
        const k = kEff(A, tR, n) + kEff(B, rB, n);
        const lam = (bias - vn) / k;
        if (!Number.isFinite(lam)) continue;
        tJ.copy(n).multiplyScalar(lam);
        impulse(A, tR, tJ);
        tJ.negate();
        impulse(B, rB, tJ);
        if (!B.awake) { B.awake = true; B.still = 0; inertia(B); }
        if (lam > A.m * 1.5 && events) events.push({ type: 'clack', x: tP.x, y: tP.y, z: tP.z, k: lam / A.m });
      }
    }
  }
}

/** Wakes every slab within r metres of x, z. */
export function wake(F, x, z, r) {
  for (const s of F.slabs) if (!s.awake && Math.hypot(s.x.x - x, s.x.z - z) < r + s.rho) { s.awake = true; s.still = 0; }
}
