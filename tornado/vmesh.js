// Tornado alley: meshes for the vehicles, built from the shape tables in vshape.js.
// Pure: no browser and no GL, so node tests can run it.

const R = Math.SQRT1_2;
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = a => { const l = Math.hypot(...a); return a.map(v => v / l); };

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

// Clips one convex polygon to dot(n, p) <= w; also returns the points on the plane.
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
 * A convex hull as flat triangles: positions and face normals, nine numbers per triangle.
 * @param {number[]} c @param {number[]} h @param {number} e @param {number[][]} planes
 * @returns {{ pos: number[], nrm: number[] }}
 */
export function hullMesh(c, h, e, planes) {
  // Start from a cube far larger than any vehicle; each plane cuts it.
  const S = 50, v = (x, y, z) => [c[0] + x * S, c[1] + y * S, c[2] + z * S];
  let faces = [
    { n: [1, 0, 0], p: [v(1, -1, -1), v(1, 1, -1), v(1, 1, 1), v(1, -1, 1)] },
    { n: [-1, 0, 0], p: [v(-1, -1, -1), v(-1, -1, 1), v(-1, 1, 1), v(-1, 1, -1)] },
    { n: [0, 1, 0], p: [v(-1, 1, -1), v(-1, 1, 1), v(1, 1, 1), v(1, 1, -1)] },
    { n: [0, -1, 0], p: [v(-1, -1, -1), v(1, -1, -1), v(1, -1, 1), v(-1, -1, 1)] },
    { n: [0, 0, 1], p: [v(-1, -1, 1), v(1, -1, 1), v(1, 1, 1), v(-1, 1, 1)] },
    { n: [0, 0, -1], p: [v(-1, -1, -1), v(-1, 1, -1), v(1, 1, -1), v(1, -1, -1)] },
  ];
  for (const pl of hullPlanes(c, h, e, planes)) {
    const n = pl.slice(0, 3), w = pl[3], cap = [];
    const next = [];
    for (const f of faces) {
      const { out, cut } = clip(f.p, n, w);
      cap.push(...cut);
      if (out.length >= 3) next.push({ n: f.n, p: out });
    }
    // The cap: the cut points, in order round their centre.
    const uniq = cap.filter((p, i) => cap.findIndex(q => Math.hypot(...sub(p, q)) < 1e-9) === i);
    if (uniq.length >= 3) {
      const m = uniq.reduce((s, p) => s.map((x, k) => x + p[k] / uniq.length), [0, 0, 0]);
      const u = norm(sub(uniq[0], m)), t = cross(n, u);
      uniq.sort((p, q) => Math.atan2(dot(sub(p, m), t), dot(sub(p, m), u)) - Math.atan2(dot(sub(q, m), t), dot(sub(q, m), u)));
      next.push({ n, p: uniq });
    }
    faces = next;
  }
  const pos = [], nrm = [];
  for (const f of faces) {
    // A fan from the first corner, wound so the normal points out.
    for (let i = 1; i + 1 < f.p.length; i++) {
      let a = f.p[0], b = f.p[i], d = f.p[i + 1];
      if (dot(cross(sub(b, a), sub(d, a)), f.n) < 0) [b, d] = [d, b];
      if (Math.hypot(...cross(sub(b, a), sub(d, a))) < 1e-12) continue;
      pos.push(...a, ...b, ...d);
      nrm.push(...f.n, ...f.n, ...f.n);
    }
  }
  return { pos, nrm };
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
