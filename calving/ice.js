// Calving world: the crack, the tower that leans and falls, its blocks, spray, mist, the surge and the brash ice.
// Plain data and small three.js meshes; main.js steps it and draws it.
import * as THREE from 'three';
import { CELLS, cellAt, faceZ, faceN, faceTop, wallL, FACE_X0, FACE_DX, FACE_ROWS, TOP_BACK, rng } from './land.js';
import { gridNormals, MAX_WAVES, WAVE_C, WAVE_L } from './scene.js';

export const G = 9.81;
export const C_SOUND = 343;
// Ice floats with a ninth of itself above the water.
const LIFT = 1025 / 917;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const rand = Math.random;
const between = (a, b) => a + (b - a) * rand();

/* ---------- the surge, on the CPU ---------- */
// The same sum as WAVES in scene.js, so floes ride the water they float on.
export function waveAt(W, x, z, out) {
  let h = 0, gx = 0, gz = 0;
  for (const w of W.waves) {
    const tau = W.t - w.t0;
    if (tau <= 0) continue;
    const dx = x - w.x, dz = z - w.z, r = Math.hypot(dx, dz) + 0.01;
    const s = r - WAVE_C * tau;
    const env = smooth(WAVE_L * 0.3, -WAVE_L * 0.2, s) * Math.exp(Math.min(s, 0) / (WAVE_L * 1.6));
    if (env < 1e-4) continue;
    const A = w.amp * Math.sqrt(60 / (r + 60)) * Math.exp(-tau / 80) * smooth(0, 1.5, tau);
    const ph = (2 * Math.PI * s) / WAVE_L;
    h -= A * env * Math.sin(ph);
    const k = -A * env * Math.cos(ph) * (2 * Math.PI / WAVE_L) / r;
    gx += k * dx; gz += k * dz;
  }
  out.h = h; out.gx = gx; out.gz = gz;
  return out;
}

/* ---------- the world ---------- */
export function makeWorld(S, { brash = 260, maxPuffs = 900, maxChips = 160 } = {}) {
  const W = {
    S, t: 0, amb: 0,
    crack: null, calvings: [], blocks: [], puffs: [], chips: [], waves: [], events: [],
    brash: [], maxPuffs, maxChips, scale: 1, soft: false, nextChip: 8,
    face: S.face.geometry, F: S.F,
  };
  // The face as it stands now; carves move these points back.
  W.P = W.face.attributes.position.array;
  W.Nrm = W.face.attributes.normal.array;
  W.I = W.face.attributes.aI.array;
  W.E = W.face.attributes.aEdge.array;
  seedBrash(W, brash);
  return W;
}

/* ---------- brash ice ---------- */
function seedBrash(W, n) {
  const R = rng(4242);
  for (let i = 0; i < n; i++) {
    // Most floes crowd the face; the rest drift out toward the camera.
    let x, z, s;
    const a = (-30 + 58 * R()) * Math.PI / 180;
    if (i < n * 0.6) {
      const dx = Math.sin(a), dz = -Math.cos(a);
      // March out to the face along the bearing.
      let d = 400;
      for (let k = 0; k < 6; k++) d = (faceZ(dx * d) - 0) / dz;
      const back = 10 + 220 * Math.pow(R(), 1.6);
      d -= back;
      x = dx * d; z = dz * d;
      s = (0.7 + 2.2 * Math.pow(R(), 2)) * (R() < 0.04 ? 2.6 : 1);
    } else {
      const d = 70 + 500 * Math.pow(R(), 1.3);
      x = Math.sin(a) * d; z = -Math.cos(a) * d;
      s = 0.35 + 1.6 * Math.pow(R(), 2.2);
    }
    if (x < wallL(z) + 8) continue;
    W.brash.push({ x, z, s, yaw: R() * 6.283, ph: R() * 6.283, sq: 0.5 + 0.4 * R(), y: 0, tx: 0, tz: 0, hit: 0 });
  }
}

/* ---------- the crack: a press starts it, a hold makes it bigger ---------- */
// Size 0 is a slab off the top; size 1 is a tower from the waterline.
function outline(W, c) {
  const s = c.size;
  const want = 9 + 46 * s;
  // The crack follows the grooves: it widens one column at a time.
  let a = cellAt(c.x), b = a;
  const left = i => CELLS[i].x0, right = i => CELLS[i].x1;
  while (right(b) - left(a) < want) {
    const wl = CELLS[a - 1], wr = CELLS[b + 1];
    const okL = wl && wl.x0 > wallL(faceZ(wl.x0)) + 12, okR = wr && wr.x1 < 1180;
    if (!okL && !okR) break;
    if (okL && (!okR || (c.x - left(a)) < (right(b) - c.x))) a--; else b++;
  }
  c.x0 = left(a); c.x1 = right(b);
  const top = faceTop(c.x);
  const tapBase = clamp(c.y - 4, 1.5, top - 16);
  c.yb = tapBase + (1.5 - tapBase) * Math.pow(s, 0.8);
  c.D = 5 + 13 * s;
}
export function startCrack(W, x, y) {
  const c = { x, y, size: 0, t0: W.t, run: 0, holding: true };
  outline(W, c);
  W.crack = c;
  W.events.push({ type: 'crack', x, y: Math.max(y, 10), z: faceZ(x), size: 0.25 });
  dust(W, x, clamp(y, 6, faceTop(x) - 2), 6, 0.4);
  return c;
}
// While held, the crack runs wider and lower; a few chips fall from it.
export function growCrack(W, dt) {
  const c = W.crack;
  if (!c || !c.holding) return;
  const old = c.x1 - c.x0;
  c.size = Math.min(1, c.size + dt / 2.4);
  outline(W, c);
  if (c.x1 - c.x0 > old + 0.5) {
    W.events.push({ type: 'tick', x: c.x, y: c.y, z: faceZ(c.x), size: c.size });
    dust(W, rand() < 0.5 ? c.x0 : c.x1, between(c.yb, faceTop(c.x)), 4, 0.3);
  }
  if (rand() < dt * (2 + 6 * c.size)) chip(W, between(c.x0, c.x1), between(c.yb, faceTop(c.x) - 3), 0.25 + 0.5 * rand());
}
export function cancelCrack(W) { W.crack = null; }

/* ---------- the calving ---------- */
// The release commits the crack: the face carves back and the tower stands free.
export function release(W) {
  const c = W.crack;
  if (!c) return null;
  W.crack = null;
  return calve(W, c);
}
// A calving at random, as the Calve action asks.
export function calveRandom(W, x, size) {
  const c = { x, y: between(5, 40), size, holding: false };
  outline(W, c);
  W.events.push({ type: 'crack', x, y: 30, z: faceZ(x), size: 0.3 + 0.5 * size });
  return calve(W, c);
}
function calve(W, c) {
  const F = W.F, NX = F.NX;
  const i0 = clamp(Math.round((c.x0 - FACE_X0) / FACE_DX), 1, NX - 2);
  const i1 = clamp(Math.round((c.x1 - FACE_X0) / FACE_DX), i0 + 2, NX - 2);
  // The base row: the same index across the tower gives a ragged base.
  let topAvg = 0;
  for (let i = i0; i <= i1; i++) topAvg += W.P[(FACE_ROWS * NX + i) * 3 + 1];
  topAvg /= i1 - i0 + 1;
  const j0 = clamp(Math.round(((c.yb + 6) / (topAvg + 6)) * FACE_ROWS), 2, FACE_ROWS - 6);
  const H = topAvg - c.yb, D = c.D;
  // The pieces: stacked slabs, split across for a wide tower.
  const nv = clamp(Math.round(H / 20 + rand() * 0.8), 1, 4), nh = (i1 - i0) * FACE_DX > 30 ? 2 : 1;
  const js = [j0];
  for (let k = 1; k < nv; k++) js.push(Math.round(j0 + ((FACE_ROWS - j0) * (k + (rand() - 0.5) * 0.5)) / nv));
  js.push(FACE_ROWS);
  const is = [i0];
  if (nh > 1) is.push(Math.round((i0 + i1) / 2 + (rand() - 0.5) * 4));
  is.push(i1);
  const imid = (i0 + i1) >> 1;
  const nx = F.N[imid * 2], nz = F.N[imid * 2 + 1];
  const k0 = (j0 * NX + imid) * 3;
  const pivot = new THREE.Vector3(W.P[k0], W.P[k0 + 1] - 0.5, W.P[k0 + 2]).addScaledVector(new THREE.Vector3(nx, 0, nz), 0.5);
  const axis = new THREE.Vector3(nz, 0, -nx);
  const pieces = [];
  for (let a = 0; a < is.length - 1; a++) for (let b = 0; b < js.length - 1; b++) {
    pieces.push(makePiece(W, is[a], is[a + 1], js[b], js[b + 1], D, b === js.length - 2));
  }
  carve(W, i0, i1, j0, D);
  const cv = {
    pieces, pivot, axis, H, D, size: c.size, x: (c.x0 + c.x1) / 2, z: faceZ((c.x0 + c.x1) / 2),
    th: 0, om: 0, age: 0, hold: 0.25 + 0.4 * rand(),
    // A tall tower leans further before it breaks.
    brk: 0.06 + 0.22 * c.size + 0.08 * rand(),
    k: (2 * 3 * G) / (2 * Math.max(12, H)), lean0: 0.025 + 0.03 * (1 - c.size),
    n: new THREE.Vector3(nx, 0, nz), done: false,
    line: { x0: c.x0, x1: c.x1, yb: c.yb, tx: c.x, ty: c.y },
  };
  W.calvings.push(cv);
  W.events.push({ type: 'groan', x: cv.x, y: c.yb + H * 0.5, z: cv.z, size: c.size, dur: 2 + 4 * c.size });
  return cv;
}

// The carve moves the face back by D over the tower's columns and leaves fresh blue ice.
function carve(W, i0, i1, j0, D) {
  const F = W.F, NX = F.NX, NY = F.NY, P = W.P, I = W.I;
  for (let i = i0; i <= i1; i++) {
    const nx = F.N[i * 2], nz = F.N[i * 2 + 1];
    for (let j = j0; j < NY; j++) {
      const k = j * NX + i;
      // Over the top, points closer than D to the front fold back to D.
      const push = j <= FACE_ROWS ? D : Math.max(0, D - F.B[k]);
      if (push <= 0) continue;
      P[k * 3] -= nx * push; P[k * 3 + 2] -= nz * push;
      if (j <= FACE_ROWS) I[k * 4 + 3] = W.t;
    }
  }
  gridNormals(F, P, W.Nrm, i0 - 2, i1 + 2);
  const pos = W.face.attributes.position, nrm = W.face.attributes.normal, ai = W.face.attributes.aI;
  // Upload only the changed rows' span.
  const a = j0 * NX + i0 - 2, b = (NY - 1) * NX + i1 + 2;
  pos.clearUpdateRanges(); pos.addUpdateRange(a * 3, (b - a + 1) * 3); pos.needsUpdate = true;
  nrm.clearUpdateRanges(); nrm.addUpdateRange((j0 - 1) * NX * 3, (NY - j0 + 1) * NX * 3); nrm.needsUpdate = true;
  ai.clearUpdateRanges(); ai.addUpdateRange(a * 4, (b - a + 1) * 4); ai.needsUpdate = true;
}

// One piece: the slab between the face and its carve, closed by its sides.
function makePiece(W, ia, ib, ja, jb, D, isTop) {
  const F = W.F, NX = F.NX, P = W.P, Nf = W.Nrm;
  const pos = [], nrm = [], ai = [], edge = [];
  const front = (i, j) => { const k = (j * NX + i) * 3; return [P[k], P[k + 1], P[k + 2]]; };
  const back = (i, j) => { const f = front(i, j); return [f[0] - F.N[i * 2] * D, f[1], f[2] - F.N[i * 2 + 1] * D]; };
  const fresh = W.t;
  // Inner faces are fresh blue ice; the top keeps its weathered crust.
  function tri(a, b, c, na, nb, nc, fr) {
    for (const [p, n] of [[a, na], [b, nb], [c, nc]]) {
      pos.push(p[0], p[1], p[2]);
      nrm.push(n[0], n[1], n[2]);
      ai.push(p[0], p[1], fr ? 0.6 : 0.1, fr ? fresh : -1e6);
      edge.push(fr ? 0 : 0.6);
    }
  }
  const flat = (a, b, c) => {
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    const n = [uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx], l = Math.hypot(...n) || 1;
    return [n[0] / l, n[1] / l, n[2] / l];
  };
  function quad(a, b, c, d, fr) {
    const n1 = flat(a, b, c), n2 = flat(b, d, c);
    tri(a, b, c, n1, n1, n1, fr); tri(b, d, c, n2, n2, n2, fr);
  }
  // The front copies the face point for point, so the seam does not show.
  const I = W.I, E = W.E;
  function frontV(i, j) {
    const k = j * NX + i;
    pos.push(P[k * 3], P[k * 3 + 1], P[k * 3 + 2]);
    nrm.push(Nf[k * 3], Nf[k * 3 + 1], Nf[k * 3 + 2]);
    ai.push(I[k * 4], I[k * 4 + 1], I[k * 4 + 2], I[k * 4 + 3]);
    edge.push(E[k]);
  }
  for (let j = ja; j < jb; j++) for (let i = ia; i < ib; i++) {
    frontV(i, j); frontV(i + 1, j); frontV(i, j + 1);
    frontV(i + 1, j); frontV(i + 1, j + 1); frontV(i, j + 1);
    quad(back(i + 1, j), back(i, j), back(i + 1, j + 1), back(i, j + 1), true);
  }
  for (let j = ja; j < jb; j++) {
    quad(back(ia, j), front(ia, j), back(ia, j + 1), front(ia, j + 1), true);
    quad(front(ib, j), back(ib, j), front(ib, j + 1), back(ib, j + 1), true);
  }
  for (let i = ia; i < ib; i++) {
    quad(back(i, ja), back(i + 1, ja), front(i, ja), front(i + 1, ja), true);
    quad(front(i, jb), front(i + 1, jb), back(i, jb), back(i + 1, jb), !isTop);
  }
  // Local frame about the centre of the slab.
  const n = pos.length / 3;
  const com = new THREE.Vector3();
  for (let k = 0; k < n; k++) com.x += pos[k * 3], com.y += pos[k * 3 + 1], com.z += pos[k * 3 + 2];
  com.divideScalar(n);
  const lo = new THREE.Vector3(1e9, 1e9, 1e9), hi = new THREE.Vector3(-1e9, -1e9, -1e9);
  for (let k = 0; k < n; k++) {
    pos[k * 3] -= com.x; pos[k * 3 + 1] -= com.y; pos[k * 3 + 2] -= com.z;
    lo.min(new THREE.Vector3(pos[k * 3], pos[k * 3 + 1], pos[k * 3 + 2]));
    hi.max(new THREE.Vector3(pos[k * 3], pos[k * 3 + 1], pos[k * 3 + 2]));
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  g.setAttribute('aI', new THREE.Float32BufferAttribute(ai, 4));
  g.setAttribute('aEdge', new THREE.Float32BufferAttribute(edge, 1));
  g.computeBoundingSphere();
  const mesh = new THREE.Mesh(g, W.S.iceMat);
  mesh.position.copy(com);
  W.S.blocks.add(mesh);
  const ext = hi.clone().sub(lo).multiplyScalar(0.5);
  const vol = (ib - ia) * FACE_DX * D * Math.max(1, ext.y * 2);
  const blk = {
    mesh, com0: com.clone(), pos: com.clone(), vel: new THREE.Vector3(), q: new THREE.Quaternion(), om: new THREE.Vector3(),
    ext, vol, free: false, wet: false, plunge: 0, age: 0, rest: 0, sink: 0, seed: rand(),
  };
  W.blocks.push(blk);
  return blk;
}

/* ---------- spray, mist and dust ---------- */
// kind 0 splash, 1 mist, 2 ice dust, 3 drops, 4 base surge.
function puff(W, p) {
  if (W.puffs.length >= W.maxPuffs) {
    // Over the cap, the thinnest old mist gives way.
    let k = -1, best = 1e9;
    for (let i = 0; i < W.puffs.length; i += 3) { const q = W.puffs[i]; const v = q.dens * (1 - q.age / q.life); if (v < best) { best = v; k = i; } }
    if (k < 0) return;
    W.puffs[k] = W.puffs[W.puffs.length - 1]; W.puffs.pop();
  }
  W.puffs.push(Object.assign({ age: 0, rot: rand() * 6.28, spin: (rand() - 0.5) * 0.3, seed: rand(), grow: 0.5, drag: 0.2, rise: 0 }, p));
}
function dust(W, x, y, n, k) {
  const [nx, nz] = faceN(x), z = faceZ(x);
  n = Math.round(n * W.scale) || 1;
  for (let i = 0; i < n; i++) {
    puff(W, {
      kind: 2, x: x + nx * 2 + between(-2, 2), y: y + between(-2, 2), z: z + nz * 2 + between(-2, 2),
      vx: nx * between(0.5, 2.5), vy: between(-1.5, 0.5), vz: nz * between(0.5, 2.5),
      r: between(0.8, 2), grow: between(0.3, 0.9), dens: k * between(0.25, 0.5), life: between(5, 11), drag: 0.5,
    });
  }
}
// A small ice chip drops from the face.
function chip(W, x, y, s) {
  if (W.chips.length >= W.maxChips) return;
  const [nx, nz] = faceN(x), z = faceZ(x);
  W.chips.push({ x: x + nx * 1.5, y, z: z + nz * 1.5, vx: nx * between(0.5, 2), vy: between(-1, 1), vz: nz * between(0.5, 2), s, rx: rand() * 6, ry: rand() * 6, sp: between(-4, 4), wet: false, age: 0 });
}
function splash(W, x, z, v, size, nx, nz) {
  // e: 0 for a chip, about 1 for a tower.
  const e = clamp(Math.sqrt(size * v * v) / 140, 0, 1.4);
  const sc = W.scale * (W.soft ? 0.6 : 1);
  const up = Math.min(46, 0.95 * v + 6) * (0.45 + 0.55 * Math.min(1, e));
  const tx = nz, tz = -nx;
  const wide = Math.sqrt(size) * 0.8 + 2;
  const nCol = Math.round((2 + 220 * e) * sc);
  // A chip throws a small splash; a tower throws a big one.
  const rf = 0.3 + 0.7 * Math.min(1, e * 2.5);
  for (let i = 0; i < nCol; i++) {
    const a = between(-1, 1), o = between(-0.3, 1);
    // A few jets climb high and thin above the main column.
    const jet = rand() < 0.15;
    const vu = up * (0.25 + 0.75 * Math.pow(rand(), 0.7)) * (jet ? 1.3 : 1);
    puff(W, {
      kind: 0, x: x + tx * a * wide + nx * o * wide * 0.5, y: between(0, 3), z: z + tz * a * wide + nz * o * wide * 0.5,
      vx: (nx * between(0.05, 0.4) + tx * a * 0.15) * vu, vy: vu, vz: (nz * between(0.05, 0.4) + tz * a * 0.15) * vu,
      r: between(2, 4.5) * rf * (0.8 + 0.4 * e) * (jet ? 0.5 : 1), grow: between(1, 2.4), dens: between(0.45, 0.8), life: between(3, 6), drag: 0.25,
    });
  }
  // Drops arc out of the column and fall back as rain.
  const nDrop = Math.round((4 + 160 * e) * sc);
  for (let i = 0; i < nDrop; i++) {
    const a = between(-1, 1), vu = up * between(0.4, 1.15);
    puff(W, {
      kind: 3, x: x + tx * a * wide, y: between(1, 4), z: z + tz * a * wide,
      vx: (nx * between(0.1, 0.6) + tx * a * 0.3) * vu, vy: vu, vz: (nz * between(0.1, 0.6) + tz * a * 0.3) * vu,
      r: between(0.4, 0.9), grow: 0.05, dens: between(0.35, 0.6), life: 12, drag: 0.08,
    });
  }
  // The base surge: a white roll of spray runs out over the water.
  const nBase = Math.round(44 * e * sc);
  for (let i = 0; i < nBase; i++) {
    const ang = between(-1.2, 1.2), sp = between(5, 9 + 10 * e);
    const dx = nx * Math.cos(ang) + tx * Math.sin(ang), dz = nz * Math.cos(ang) + tz * Math.sin(ang);
    puff(W, {
      kind: 4, x: x + dx * wide * 0.5, y: between(1.5, 4), z: z + dz * wide * 0.5,
      vx: dx * sp, vy: between(0.2, 1.2), vz: dz * sp,
      r: between(2, 4) * (0.7 + 0.5 * e), grow: between(0.4, 0.9), dens: between(0.25, 0.45), life: between(10, 18), drag: 0.45,
    });
  }
}
// A splash that falls back leaves mist that hangs and drifts.
function mist(W, p) {
  puff(W, {
    kind: 1, x: p.x, y: p.y, z: p.z, vx: p.vx * 0.3, vy: Math.max(-1.5, p.vy * 0.2), vz: p.vz * 0.3,
    r: p.r * 1.1, grow: between(0.2, 0.45), dens: p.dens * between(0.25, 0.35), life: between(20, 35), drag: 0.6,
  });
}
function addWave(W, x, z, amp, foam) {
  // Impacts close in time and place make one wave.
  for (const w of W.waves) {
    if (W.t - w.t0 < 3 && Math.hypot(w.x - x, w.z - z) < 90) {
      w.amp = Math.min(3.6, Math.hypot(w.amp, amp));
      w.foam = Math.min(1.6, w.foam + foam * 0.6);
      return;
    }
  }
  if (W.waves.length >= MAX_WAVES) W.waves.shift();
  W.waves.push({ x, z, t0: W.t, amp, foam, passed: false });
}

/* ---------- step ---------- */
const tmpQ = new THREE.Quaternion(), tmpV = new THREE.Vector3(), tmpM = new THREE.Matrix4(), up = new THREE.Vector3(0, 1, 0);
const wv = { h: 0, gx: 0, gz: 0 };
/** Step the world by dt seconds. amb scales the ambient life, 0 to 1. */
export function step(W, dt, { amb = 1, cam = null } = {}) {
  W.t += dt;
  W.amb = amb;
  growCrack(W, dt);
  // The towers lean, then break into free blocks.
  for (const cv of W.calvings) {
    cv.age += dt;
    if (cv.done) continue;
    if (cv.age < cv.hold) {
      // The tower settles a hand's width as its base gives.
      for (const b of cv.pieces) b.pos.copy(b.com0).y -= 0.4 * smooth(0, cv.hold, cv.age);
    } else {
      cv.om += cv.k * (cv.th + cv.lean0) * dt;
      cv.th += cv.om * dt;
      tmpQ.setFromAxisAngle(cv.axis, cv.th);
      for (const b of cv.pieces) {
        b.q.copy(tmpQ);
        b.pos.copy(b.com0).sub(cv.pivot).applyQuaternion(tmpQ).add(cv.pivot);
        b.pos.y -= 0.4;
      }
      // Dust pours from the opening crack behind the tower.
      if (rand() < dt * 30 * cv.om) dust(W, between(cv.x - 10, cv.x + 10), cv.pivot.y + cv.H * between(0.3, 1), 2, 0.5);
      if (rand() < dt * 8 * cv.om * (1 + cv.size)) chip(W, between(cv.x - 8, cv.x + 8), cv.pivot.y + between(0, 4), between(0.4, 1.2));
      if (cv.th >= cv.brk) {
        cv.done = true;
        for (const b of cv.pieces) {
          b.free = true;
          b.f0 = (b.pos.z - faceZ(b.pos.x)) * faceN(b.pos.x)[1] - 0.5;
          // Each block leaves with the speed it had on the turning tower.
          tmpV.copy(b.pos).sub(cv.pivot);
          b.vel.crossVectors(cv.axis, tmpV).multiplyScalar(cv.om);
          b.om.copy(cv.axis).multiplyScalar(cv.om * between(0.8, 1.3));
          b.om.x += between(-0.06, 0.06); b.om.y += between(-0.08, 0.08); b.om.z += between(-0.06, 0.06);
          // Lower blocks kick out from the base.
          const low = 1 - clamp((b.pos.y - cv.pivot.y) / Math.max(1, cv.H), 0, 1);
          b.vel.addScaledVector(cv.n, low * between(0.5, 2.5));
        }
        W.events.push({ type: 'break', x: cv.x, y: cv.pivot.y + cv.H * 0.5, z: cv.z, size: cv.size, fall: Math.sqrt((2 * (cv.pivot.y + cv.H)) / G) });
      }
    }
  }
  W.calvings = W.calvings.filter(cv => !cv.done || cv.age < 30);
  stepBlocks(W, dt);
  stepChips(W, dt);
  stepPuffs(W, dt);
  stepWaves(W, cam);
  stepBrash(W, dt);
  // Untouched, small ice falls now and then.
  if (amb > 0.5 && !W.soft) {
    W.nextChip -= dt;
    if (W.nextChip <= 0) {
      W.nextChip = between(9, 26);
      const x = cam ? cam.x + between(-160, 160) : between(-120, 200);
      const cx = clamp(x, wallL(faceZ(x)) + 20, 1150), top = faceTop(cx);
      const n = 1 + ((rand() * 3) | 0);
      for (let i = 0; i < n; i++) chip(W, cx + between(-3, 3), top - between(2, 25), between(0.5, 1.6));
      dust(W, cx, top - 10, 5, 0.45);
      W.events.push({ type: 'chip', x: cx, y: top - 10, z: faceZ(cx), size: n / 3 });
    }
  }
}

function stepBlocks(W, dt) {
  for (const b of W.blocks) {
    b.age += dt;
    if (!b.free) continue;
    const R = tmpM.makeRotationFromQuaternion(b.q).elements;
    // The vertical half size of the turned slab.
    const hy = Math.abs(R[1]) * b.ext.x + Math.abs(R[5]) * b.ext.y + Math.abs(R[9]) * b.ext.z;
    waveAt(W, b.pos.x, b.pos.z, wv);
    const sub = clamp((wv.h - (b.pos.y - hy)) / (2 * hy), 0, 1);
    const speed = b.vel.length();
    if (sub > 0 && !b.wet) {
      b.wet = true;
      const v = Math.max(0, -b.vel.y);
      const [nx, nz] = faceN(b.pos.x);
      splash(W, b.pos.x, b.pos.z, v, b.vol / 600, nx, nz);
      const e = clamp(Math.sqrt((b.vol / 600) * v * v) / 140, 0, 1.4);
      addWave(W, b.pos.x, b.pos.z, 0.15 + 2.4 * e, 0.3 + 0.9 * e);
      W.events.push({ type: 'impact', x: b.pos.x, y: 0, z: b.pos.z, size: e });
    }
    // Plunging blocks throw spray all the way down.
    if (sub > 0 && sub < 1 && speed > 4 && rand() < dt * speed * 0.6 * W.scale) {
      const [nx, nz] = faceN(b.pos.x);
      splash(W, b.pos.x + between(-3, 3), b.pos.z + between(-3, 3), speed * 0.5, 0.05, nx, nz);
    }
    b.vel.y += (sub * LIFT - 1) * G * dt;
    const drag = Math.exp(-dt * sub * 1.4);
    b.vel.multiplyScalar(drag);
    b.om.multiplyScalar(Math.exp(-dt * sub * 1.1));
    if (sub > 0.2) {
      // Afloat, the shortest axis of the slab turns upright: it lies flat.
      const e = [b.ext.x, b.ext.y, b.ext.z];
      let sa = 0;
      for (let a = 1; a < 3; a++) if (e[a] < e[sa]) sa = a;
      tmpV.set(R[sa * 4], R[sa * 4 + 1], R[sa * 4 + 2]);
      if (tmpV.y < 0) tmpV.negate();
      b.om.addScaledVector(tmpV.cross(up), 0.6 * sub * dt);
      // The surge carries floating ice and the slope pushes it.
      b.vel.x -= wv.gx * G * 0.3 * dt; b.vel.z -= wv.gz * G * 0.3 * dt;
      // A slow current takes the new bergs out.
      const [nx, nz] = faceN(b.pos.x);
      b.vel.x += nx * 0.02 * dt; b.vel.z += nz * 0.02 * dt;
    }
    b.pos.addScaledVector(b.vel, dt);
    // A block may not sink back into the face behind it.
    const [nx, nz] = faceN(b.pos.x);
    const front = (b.pos.z - faceZ(b.pos.x)) * nz;
    if (front < b.f0) {
      b.pos.x += nx * (b.f0 - front); b.pos.z += nz * (b.f0 - front);
      const vn = b.vel.x * nx + b.vel.z * nz;
      if (vn < 0) { b.vel.x -= nx * vn; b.vel.z -= nz * vn; }
    }
    const w = b.om.length();
    if (w > 1e-5) { tmpQ.setFromAxisAngle(tmpV.copy(b.om).divideScalar(w), w * dt); b.q.premultiply(tmpQ).normalize(); }
    b.rest = speed < 0.4 && w < 0.05 && sub > 0.3 ? b.rest + dt : 0;
  }
  // Old bergs melt away so the count stays low.
  const free = W.blocks.filter(b => b.free && b.wet);
  if (free.length > 36) free.slice(0, free.length - 36).forEach(b => { b.sink = Math.max(b.sink, 0.001); });
  for (const b of W.blocks) {
    if (b.sink > 0) { b.sink += dt; b.pos.y -= dt * 0.6; }
    if (b.age > 600) b.sink = Math.max(b.sink, 0.001);
  }
  W.blocks = W.blocks.filter(b => {
    if (b.sink > 25) { W.S.blocks.remove(b.mesh); b.mesh.geometry.dispose(); return false; }
    return true;
  });
}

function stepChips(W, dt) {
  for (const c of W.chips) {
    c.age += dt;
    if (!c.wet) {
      c.vy -= G * dt;
      c.x += c.vx * dt; c.y += c.vy * dt; c.z += c.vz * dt;
      c.rx += c.sp * dt; c.ry += c.sp * 0.7 * dt;
      if (c.y < 0) {
        c.wet = true;
        const [nx, nz] = faceN(c.x);
        splash(W, c.x, c.z, -c.vy, c.s * c.s * c.s * 0.004, nx, nz);
        c.vy = 0; c.vx *= 0.2; c.vz *= 0.2;
        if (c.s > 0.9) addWave(W, c.x, c.z, 0.02 * c.s, 0.08);
      }
      // A chip that hits the base breaks into dust.
      if (c.y > 0 && rand() < dt * 0.5) dust(W, c.x, c.y, 1, 0.2);
    } else {
      waveAt(W, c.x, c.z, wv);
      c.y += (wv.h - 0.1 * c.s - c.y) * Math.min(1, dt * 3);
      c.x += c.vx * dt; c.z += c.vz * dt;
      c.vx *= Math.exp(-dt); c.vz *= Math.exp(-dt);
    }
  }
  W.chips = W.chips.filter(c => c.age < 40);
}

function stepPuffs(W, dt) {
  const out = [];
  // A light breeze runs down the fjord toward the camera.
  const bx = 0.9, bz = 1.6;
  for (const p of W.puffs) {
    p.age += dt;
    if (p.age >= p.life) { if (p.kind === 0) mist(W, p); continue; }
    if (p.kind === 0 || p.kind === 3) p.vy -= G * dt * (p.kind === 0 ? 0.6 : 1);
    if (p.kind === 1 || p.kind === 2 || p.kind === 4) { p.vx += (bx - p.vx) * dt * 0.1; p.vz += (bz - p.vz) * dt * 0.1; }
    const k = Math.exp(-p.drag * dt);
    p.vx *= k; p.vz *= k;
    if (p.kind !== 0 && p.kind !== 3) p.vy *= k;
    p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
    p.r += p.grow * dt * (p.kind === 1 ? 1 / (1 + p.age * 0.05) : 1);
    p.rot += p.spin * dt;
    // Splash that falls back into the water turns to mist; drops end.
    if (p.y < 0.5 && p.vy < 0) {
      if (p.kind === 0) { mist(W, p); continue; }
      if (p.kind === 3) continue;
      p.y = 0.5; p.vy = 0;
    }
    out.push(p);
  }
  W.puffs.length = 0;
  for (const p of out) W.puffs.push(p);
}

// The surge reaches the camera: the event tells the sound and the view.
function stepWaves(W, cam) {
  for (const w of W.waves) {
    if (!cam || w.passed) continue;
    const d = Math.hypot(cam.x - w.x, cam.z - w.z);
    if (WAVE_C * (W.t - w.t0) >= d - 60) {
      w.passed = true;
      const A = w.amp * Math.sqrt(60 / (d + 60)) * Math.exp(-(W.t - w.t0) / 80);
      W.events.push({ type: 'surge', x: cam.x, y: 0, z: cam.z - 40, size: A, local: true });
    }
  }
  W.waves = W.waves.filter(w => W.t - w.t0 < 140);
}

function stepBrash(W, dt) {
  const t = W.t;
  for (const b of W.brash) {
    waveAt(W, b.x, b.z, wv);
    // A floe rides the surge; small ones follow the slope at once.
    const bob = 0.04 * b.s * Math.sin(t * (1.1 / Math.sqrt(b.s + 0.3)) + b.ph) * W.amb;
    b.y = wv.h + bob - 0.06 * b.s;
    const follow = 1 / (1 + b.s * 0.25);
    b.tx += (Math.atan(-wv.gx) * follow - b.tx) * Math.min(1, dt * 3);
    b.tz += (Math.atan(wv.gz) * follow - b.tz) * Math.min(1, dt * 3);
    // Orbital motion: the floe sways forward and back as crests pass.
    b.x -= wv.gx * dt * 4; b.z -= wv.gz * dt * 4;
    b.yaw += 0.01 * dt * Math.sin(b.ph) * W.amb;
    // Floes knock together on a steep slope.
    const steep = Math.hypot(wv.gx, wv.gz);
    b.hit = steep > 0.004 && rand() < dt * steep * 60 ? 1 : 0;
  }
}

/** True while anything moves fast enough to need full frame rate. */
export function busy(W) {
  if (W.crack || W.calvings.some(c => !c.done)) return true;
  if (W.blocks.some(b => b.free && (b.rest < 2 || !b.wet) && b.sink === 0)) return true;
  if (W.chips.some(c => !c.wet)) return true;
  if (W.puffs.some(p => p.kind === 0 || p.kind === 3)) return true;
  // The surge counts until it has passed the camera and calmed.
  // A chip's ripple is too small to count.
  return W.waves.some(w => w.amp > 0.1 && W.t - w.t0 < 55);
}
/** True while slow things still drift: mist, settling bergs. */
export function drifting(W) {
  return W.puffs.length > 0 || W.blocks.some(b => b.sink > 0 || b.rest < 6) || W.waves.length > 0;
}
export function clearAll(W) {
  W.crack = null;
  W.calvings.length = 0;
  for (const b of W.blocks) { W.S.blocks.remove(b.mesh); b.mesh.geometry.dispose(); }
  W.blocks.length = 0; W.puffs.length = 0; W.chips.length = 0; W.waves.length = 0; W.events.length = 0;
}
