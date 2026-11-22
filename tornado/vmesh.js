// Tornado alley: the vehicles' meshes, from the tables in vshape.js.
// Pure: no browser and no GL, so node tests can run it.
// The mesh matches vHit() in traffic.js: the same parts, ids and normals.
import { HULLS, BOXES, ARCH, WHEELS, RODS, CUPS, DISH } from './vshape.js';

const R = Math.SQRT1_2;
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = a => mul(a, 1 / Math.hypot(...a));
// Facets per round part.
// Each facet lies within about 1 mm of the true curve.
const SEG = { arch: 48, wheel: 48, rod: 12, cap: 16, dish: 24 };

/**
 * A hull's planes in the vehicle's frame, in hBox() order: inside where dot(n, p) <= w.
 * Six faces, twelve cut edges when e > 0, then the table's planes.
 * @param {number[]} c @param {number[]} h @param {number} e @param {number[][]} planes
 * @returns {number[][]}
 */
export function hullPlanes(c, h, e, planes) {
  // A plane about the box's centre, moved into the vehicle's frame.
  const at = (n, w) => [...n, w + dot(n, c)];
  const out = [
    at([1, 0, 0], h[0]), at([-1, 0, 0], h[0]), at([0, 1, 0], h[1]),
    at([0, -1, 0], h[1]), at([0, 0, 1], h[2]), at([0, 0, -1], h[2]),
  ];
  if (e > 0) for (let i = 0; i < 4; i++) {
    const g = [i % 2 === 0 ? 1 : -1, i < 2 ? 1 : -1];
    out.push(at([g[0] * R, g[1] * R, 0], (h[0] + h[1] - e) * R));
    out.push(at([g[0] * R, 0, g[1] * R], (h[0] + h[2] - e) * R));
    out.push(at([0, g[0] * R, g[1] * R], (h[1] + h[2] - e) * R));
  }
  return [...out, ...planes];
}

// Clips a convex polygon to dot(n, p) <= w.
// It also returns the points on the plane.
function clip(poly, n, w) {
  const out = [], cut = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    const da = dot(n, a) - w, db = dot(n, b) - w;
    if (da <= 0) out.push(a);
    if ((da < 0 && db > 0) || (da > 0 && db < 0)) {
      const t = da / (da - db), p = a.map((v, k) => v + (b[k] - v) * t);
      out.push(p);
      cut.push(p);
    } else if (da === 0) cut.push(a);
  }
  return { out, cut };
}

/**
 * The faces of a convex piece: the part of space inside every plane.
 * Each plane is { n, w, id, nf, skip }: nf gives a smooth normal at a point; skip drops its face.
 * @param {{ n: number[], w: number, id: number, nf?: (p: number[]) => number[], skip?: boolean }[]} planes
 * @param {number[]} c A point near the piece: the start cube sits round it.
 * @returns {{ pl: object, p: number[][] }[]}
 */
function pieceFaces(planes, c) {
  // A cube far larger than any vehicle; each plane cuts it.
  const S = 50, v = (x, y, z) => [c[0] + x * S, c[1] + y * S, c[2] + z * S];
  const box = (n, p) => ({ pl: { n, id: 0, skip: true }, p });
  let faces = [
    box([1, 0, 0], [v(1, -1, -1), v(1, 1, -1), v(1, 1, 1), v(1, -1, 1)]),
    box([-1, 0, 0], [v(-1, -1, -1), v(-1, -1, 1), v(-1, 1, 1), v(-1, 1, -1)]),
    box([0, 1, 0], [v(-1, 1, -1), v(-1, 1, 1), v(1, 1, 1), v(1, 1, -1)]),
    box([0, -1, 0], [v(-1, -1, -1), v(1, -1, -1), v(1, -1, 1), v(-1, -1, 1)]),
    box([0, 0, 1], [v(-1, -1, 1), v(1, -1, 1), v(1, 1, 1), v(-1, 1, 1)]),
    box([0, 0, -1], [v(-1, -1, -1), v(-1, 1, -1), v(1, 1, -1), v(1, -1, -1)]),
  ];
  for (const pl of planes) {
    const cap = [], next = [];
    for (const f of faces) {
      const { out, cut } = clip(f.p, pl.n, pl.w);
      cap.push(...cut);
      if (out.length >= 3) next.push({ pl: f.pl, p: out });
    }
    // The cap: the cut points, in order round their centre.
    const uniq = cap.filter((p, i) => cap.findIndex(q => Math.hypot(...sub(p, q)) < 1e-9) === i);
    if (uniq.length >= 3) {
      const m = uniq.reduce((s, p) => s.map((x, k) => x + p[k] / uniq.length), [0, 0, 0]);
      const u = norm(sub(uniq[0], m)), t = cross(pl.n, u);
      const ang = p => Math.atan2(dot(sub(p, m), t), dot(sub(p, m), u));
      uniq.sort((p, q) => ang(p) - ang(q));
      next.push({ pl, p: uniq });
    }
    faces = next;
    if (!faces.length) break;
  }
  return faces;
}

// A growing mesh: positions, normals and part ids, three vertices per triangle.
function sink() {
  const m = { pos: [], nrm: [], id: [], cup: [] };
  m.tri = (a, b, c, na, nb, nc, id, cup = [0, 0, 0]) => {
    if (Math.hypot(...cross(sub(b, a), sub(c, a))) < 1e-14) return;
    m.pos.push(...a, ...b, ...c);
    m.nrm.push(...na, ...nb, ...nc);
    m.id.push(id, id, id);
    m.cup.push(...cup, ...cup, ...cup);
  };
  // A face as a fan, wound to agree with n.
  m.fan = (p, n, id, nf = null, cup) => {
    for (let i = 1; i + 1 < p.length; i++) {
      let a = p[0], b = p[i], c = p[i + 1];
      if (dot(cross(sub(b, a), sub(c, a)), n) < 0) [b, c] = [c, b];
      m.tri(a, b, c, nf ? nf(a) : n, nf ? nf(b) : n, nf ? nf(c) : n, id, cup);
    }
  };
  return m;
}
// Adds a convex piece's faces; skipped planes leave no face.
// A cut face shows only where it borders the cut.
// That part lies inside the cut's later planes (clipBy).
function addPiece(m, planes, c, cup) {
  for (const f of pieceFaces(planes, c)) {
    if (f.pl.skip) continue;
    let p = f.p;
    for (const q of f.pl.clipBy || []) if ((p = clip(p, q.n, q.w).out).length < 3) break;
    if (p.length >= 3) m.fan(p, f.pl.n, f.pl.id, f.pl.nf, cup);
  }
}
const asPlanes = (list, id) => list.map(p => ({ n: p.slice(0, 3), w: p[3], id }));

/**
 * A convex hull as flat triangles: positions and face normals, nine numbers per triangle.
 * @param {number[]} c @param {number[]} h @param {number} e @param {number[][]} planes
 * @returns {{ pos: number[], nrm: number[] }}
 */
export function hullMesh(c, h, e, planes) {
  const m = sink();
  addPiece(m, asPlanes(hullPlanes(c, h, e, planes), 0), c);
  return { pos: m.pos, nrm: m.nrm };
}

/**
 * The ray's entry into a hull, as hBox() and hPl() trace it: t, or Infinity on a miss.
 * @param {number[]} ro @param {number[]} rd @param {number[]} c @param {number[]} h @param {number} e @param {number[][]} planes
 */
export function rayHull(ro, rd, c, h, e, planes) {
  let tn = -1e9, tf = 1e9;
  for (const pl of hullPlanes(c, h, e, planes)) {
    const n = pl.slice(0, 3), dn = dot(n, rd), di = pl[3] - dot(n, ro);
    if (Math.abs(dn) < 1e-7) { if (di < 0) tf = -1e9; continue; }
    const t = di / dn;
    if (dn < 0) { if (t > tn) tn = t; } else if (t < tf) tf = t;
  }
  return tn > tf || tn <= 0 ? Infinity : tn;
}

// A wheel arch's cut on side s.
// The cylinder round x at (y, z) c, radius r, beyond x0.
// Its planes: the x0 wall, the cylinder's box, then its facets.
// Inside is where dot(n, p) <= w.
// The box comes first, so the pieces round the arch stay small.
function archCut(c, r, x0, s) {
  const list = [{ n: [-s, 0, 0], w: -x0 }];
  list.push({ n: [0, -1, 0], w: r - c[0] }, { n: [0, 1, 0], w: r + c[0] }, { n: [0, 0, -1], w: r - c[1] }, { n: [0, 0, 1], w: r + c[1] });
  const N = SEG.arch;
  for (let i = 0; i < N; i++) {
    const a = (i + 0.5) * 2 * Math.PI / N, n = [0, Math.cos(a), Math.sin(a)];
    list.push({ n, w: r * Math.cos(Math.PI / N) + n[1] * c[0] + n[2] * c[1], round: true });
  }
  return { list, c, r, x0, s };
}
// The well's normal points to the arch's axis, as in hCut().
const wellNormal = (c, s) => p => {
  const d = [0, c[0] - p[1], c[1] - p[2]];
  return Math.hypot(d[1], d[2]) < 1e-9 ? [s, 0, 0] : norm(d);
};
// Takes the arch cut out of each piece.
// Each new piece is outside one cut plane and inside the ones before.
// A face on a cut plane is the well (id 8) where it borders the cut.
// The planes before leave no face.
function subtract(pieces, cut) {
  const out = [];
  const bound = [cut.s * cut.x0, cut.c[0] - cut.r, cut.c[1] - cut.r, cut.c[0] + cut.r, cut.c[1] + cut.r];
  for (const pc of pieces) {
    // A piece that misses the cut's box keeps whole.
    const fs = pieceFaces(pc, [0, 1, 0]);
    if (!fs.length) continue;
    const pts = fs.flatMap(f => f.p);
    const lo = [0, 1, 2].map(k => Math.min(...pts.map(p => p[k]))), hi = [0, 1, 2].map(k => Math.max(...pts.map(p => p[k])));
    const xIn = cut.s > 0 ? hi[0] > bound[0] : lo[0] < bound[0];
    if (!xIn || hi[1] <= bound[1] || lo[1] >= bound[3] || hi[2] <= bound[2] || lo[2] >= bound[4]) { out.push(pc); continue; }
    cut.list.forEach((p, i) => {
      const outside = { n: mul(p.n, -1), w: -p.w, id: 8, nf: p.round ? wellNormal(cut.c, cut.s) : null, clipBy: cut.list.slice(i + 1) };
      const before = cut.list.slice(0, i).map(q => ({ ...q, skip: true }));
      out.push([...pc, outside, ...before]);
    });
  }
  return out;
}

// A closed wheel: a 48-sided drum round x.
// The rim's disc (id 11) fills 0.62 of the radius.
function wheel(m, c, r, x, w) {
  const N = SEG.wheel, ring = (k, f) => { const a = (k / N) * 2 * Math.PI; return [0, c[0] + Math.cos(a) * r * f, c[1] + Math.sin(a) * r * f]; };
  for (let k = 0; k < N; k++) {
    const a = ring(k, 1), b = ring(k + 1, 1);
    const p = [[x - w, a[1], a[2]], [x + w, a[1], a[2]], [x + w, b[1], b[2]], [x - w, b[1], b[2]]];
    m.fan(p, norm([0, (a[1] + b[1]) / 2 - c[0], (a[2] + b[2]) / 2 - c[1]]), 9, q => norm([0, q[1] - c[0], q[2] - c[1]]));
    for (const s of [-1, 1]) {
      const xs = x + s * w, i0 = ring(k, 0.62), i1 = ring(k + 1, 0.62);
      m.fan([[xs, i0[1], i0[2]], [xs, a[1], a[2]], [xs, b[1], b[2]], [xs, i1[1], i1[2]]], [s, 0, 0], 9);
      m.fan([[xs, c[0], c[1]], [xs, i0[1], i0[2]], [xs, i1[1], i1[2]]], [s, 0, 0], 11);
    }
  }
}
// An upright rod at (x, z), y0 to y1: its side only, as vRod().
function rod(m, x, z, r, y0, y1, id) {
  const N = SEG.rod;
  for (let k = 0; k < N; k++) {
    const a0 = (k / N) * 2 * Math.PI, a1 = ((k + 1) / N) * 2 * Math.PI;
    const p0 = [x + Math.cos(a0) * r, z + Math.sin(a0) * r], p1 = [x + Math.cos(a1) * r, z + Math.sin(a1) * r];
    m.fan([[p0[0], y0, p0[1]], [p1[0], y0, p1[1]], [p1[0], y1, p1[1]], [p0[0], y1, p0[1]]],
      norm([Math.cos((a0 + a1) / 2), 0, Math.sin((a0 + a1) / 2)]), id, q => norm([q[0] - x, 0, q[2] - z]));
  }
}
// A capsule from a to b, radius r.
// A tube and two half balls, as rings of latitude.
function capsule(m, a, b, r, id) {
  const N = SEG.cap, H = 6, ax = norm(sub(b, a));
  const u = norm(cross(ax, Math.abs(ax[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0])), v = cross(ax, u);
  // Rings from the pole at a to the pole at b.
  const rings = [];
  for (let i = 0; i <= H; i++) { const t = (i / H) * Math.PI / 2; rings.push([a, -Math.cos(t), Math.sin(t)]); }
  for (let i = 0; i <= H; i++) { const t = (i / H) * Math.PI / 2; rings.push([b, Math.sin(t), Math.cos(t)]); }
  const pt = (rg, k) => { const g = (k / N) * 2 * Math.PI, d = add(mul(ax, rg[1]), mul(add(mul(u, Math.cos(g)), mul(v, Math.sin(g))), rg[2])); return [add(rg[0], mul(d, r)), d]; };
  for (let i = 0; i + 1 < rings.length; i++) for (let k = 0; k < N; k++) {
    const [p00, n00] = pt(rings[i], k), [p01, n01] = pt(rings[i], k + 1), [p10, n10] = pt(rings[i + 1], k), [p11, n11] = pt(rings[i + 1], k + 1);
    const out = norm(add(add(n00, n01), add(n10, n11)));
    const fix = (p, q, s, np, nq, ns) => (dot(cross(sub(q, p), sub(s, p)), out) < 0 ? m.tri(p, s, q, np, ns, nq, id) : m.tri(p, q, s, np, nq, ns, id));
    fix(p00, p01, p11, n00, n01, n11);
    fix(p00, p11, p10, n00, n11, n10);
  }
}
// The van's dish: a cap of a sphere.
// Its back (id 16) faces out; its face (id 15) faces the centre.
function dish(m) {
  const ax = norm(DISH.ax), cs = add(DISH.v, mul(ax, DISH.rs)), rs = DISH.rs;
  const top = Math.asin(DISH.rr / rs), N = SEG.dish, H = 8;
  const u = norm(cross(ax, [0, 1, 0])), v = cross(ax, u);
  // A sphere point at polar angle t from -ax, and its outward normal.
  const at = (t, k) => { const g = (k / N) * 2 * Math.PI, d = add(mul(ax, -Math.cos(t)), mul(add(mul(u, Math.cos(g)), mul(v, Math.sin(g))), Math.sin(t))); return [add(cs, mul(d, rs)), d]; };
  for (let i = 0; i < H; i++) for (let k = 0; k < N; k++) {
    const t0 = (i / H) * top, t1 = ((i + 1) / H) * top;
    const q = [at(t0, k), at(t0, k + 1), at(t1, k + 1), at(t1, k)];
    for (const back of [true, false]) {
      const s = back ? 1 : -1, n = norm(mul(add(add(q[0][1], q[1][1]), add(q[2][1], q[3][1])), s));
      m.fan(q.map(e => e[0]), n, back ? 16 : 15, p => norm(mul(sub(p, cs), s)));
    }
  }
}

/**
 * One kind's whole vehicle, in its own frame: x right, y up, z forward.
 * id per vertex is vHit()'s part id. cup is the cup's offset from its hub (x, z) and 1 for a cup.
 * @param {0 | 1 | 2} kind
 * @returns {{ pos: Float32Array, nrm: Float32Array, id: Float32Array, cup: Float32Array }}
 */
export function vehicleMesh(kind) {
  const m = sink(), ar = ARCH[kind];
  for (const h of HULLS[kind]) {
    let pieces = [asPlanes(hullPlanes(h.c, h.h, h.e, h.pl), h.id)];
    for (const [bit, cz] of [[1, ar[1]], [2, ar[2]]]) {
      if (!(h.cut & bit)) continue;
      for (const s of [1, -1]) pieces = subtract(pieces, archCut([ar[0], cz], ar[3], ar[4], s));
    }
    for (const pc of pieces) addPiece(m, pc, h.c);
  }
  for (const b of BOXES[kind]) addPiece(m, asPlanes(hullPlanes(b.c, b.h, b.e, []), b.id), b.c);
  const cp = CUPS[kind];
  if (cp) for (let k = 0; k < 3; k++) {
    // At spin 0; the vertex shader turns each cup round the hub.
    const a = k * 2.0944, o = [cp.r * Math.cos(a), cp.r * Math.sin(a)], c = add(cp.c, [o[0], 0, o[1]]);
    addPiece(m, asPlanes(hullPlanes(c, [cp.s, cp.s, cp.s], cp.s * 0.43, []), 3), c, [o[0], o[1], 1]);
  }
  if (kind === 2) {
    const p = DISH.post;
    addPiece(m, asPlanes(hullPlanes(p.c, p.h, p.e, []), p.id), p.c);
    dish(m);
    const ax = norm(DISH.ax), dn = norm(sub([0, -1, 0], mul(ax, dot([0, -1, 0], ax)))), fo = add(DISH.v, mul(ax, 0.45));
    capsule(m, add(add(DISH.v, mul(ax, 0.1)), mul(dn, 0.4)), fo, 0.018, 12);
    capsule(m, sub(fo, mul(ax, 0.03)), add(fo, mul(ax, 0.04)), 0.035, 12);
  }
  if (kind !== 0) for (const [x, z, r, y0, y1, id] of RODS.slice((kind - 1) * 3, kind * 3)) rod(m, x, z, r, y0, y1, id);
  const [wr, wzA, wxA, ww, wz0] = WHEELS[kind];
  for (let k = 0; k < 4; k++) wheel(m, [wr, (k < 2 ? 1 : -1) * wzA + wz0], wr, (k % 2 === 0 ? 1 : -1) * wxA, ww);
  return { pos: Float32Array.from(m.pos), nrm: Float32Array.from(m.nrm), id: Float32Array.from(m.id), cup: Float32Array.from(m.cup) };
}
