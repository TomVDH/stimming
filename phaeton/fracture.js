// Phaeton fracture: plain maths, no three.js.
// A surface becomes Voronoi patches with thickness: the shards of a shell.

// A seeded generator, so one seed always gives one break.
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * A surface of revolution about the y axis.
 * @param {number[][]} profile [radius, y] pairs, from the top down.
 * @param {number} segs Steps around the axis.
 * @returns {{ pos: Float32Array, nor: Float32Array, idx: Uint32Array }}
 */
export function lathe(profile, segs) {
  const rings = profile.length, pos = new Float32Array(rings * segs * 3), nor = new Float32Array(rings * segs * 3);
  for (let i = 0; i < rings; i++) {
    const a = profile[Math.max(0, i - 1)], b = profile[Math.min(rings - 1, i + 1)];
    // The normal is the profile tangent turned outward.
    let nr = -(b[1] - a[1]), ny = b[0] - a[0];
    const l = Math.hypot(nr, ny) || 1;
    nr /= l; ny /= l;
    for (let j = 0; j < segs; j++) {
      const th = (j / segs) * Math.PI * 2, c = Math.cos(th), s = Math.sin(th), o = (i * segs + j) * 3;
      pos[o] = profile[i][0] * c; pos[o + 1] = profile[i][1]; pos[o + 2] = profile[i][0] * s;
      nor[o] = nr * c; nor[o + 1] = ny; nor[o + 2] = nr * s;
    }
  }
  const idx = [];
  for (let i = 0; i < rings - 1; i++) {
    for (let j = 0; j < segs; j++) {
      const a = i * segs + j, b = i * segs + (j + 1) % segs, c = a + segs, d = b + segs;
      // A ring of radius zero gives one triangle per step, not two.
      if (profile[i][0] > 1e-9) idx.push(a, b, c);
      if (profile[i + 1][0] > 1e-9) idx.push(b, d, c);
    }
  }
  return { pos, nor, idx: new Uint32Array(idx) };
}

/**
 * Seeds on a surface, denser near the focus points.
 * @param {{ pos: Float32Array, idx: Uint32Array }} surf
 * @param {number} count
 * @param {() => number} rand
 * @param {{ at: number[], reach: number, gain: number }[]} [focus]
 * @returns {number[][]}
 */
export function seedSurface(surf, count, rand, focus = []) {
  const { pos, idx } = surf, nT = idx.length / 3, cum = new Float64Array(nT);
  let sum = 0;
  for (let t = 0; t < nT; t++) {
    const a = idx[t * 3] * 3, b = idx[t * 3 + 1] * 3, c = idx[t * 3 + 2] * 3;
    const ux = pos[b] - pos[a], uy = pos[b + 1] - pos[a + 1], uz = pos[b + 2] - pos[a + 2];
    const vx = pos[c] - pos[a], vy = pos[c + 1] - pos[a + 1], vz = pos[c + 2] - pos[a + 2];
    const area = 0.5 * Math.hypot(uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx);
    const cx = (pos[a] + pos[b] + pos[c]) / 3, cy = (pos[a + 1] + pos[b + 1] + pos[c + 1]) / 3, cz = (pos[a + 2] + pos[b + 2] + pos[c + 2]) / 3;
    let w = 1;
    for (const f of focus) {
      const d = Math.hypot(cx - f.at[0], cy - f.at[1], cz - f.at[2]);
      w += f.gain * Math.exp(-(d * d) / (f.reach * f.reach));
    }
    sum += area * w;
    cum[t] = sum;
  }
  const seeds = [];
  for (let n = 0; n < count; n++) {
    const pick = rand() * sum;
    let lo = 0, hi = nT - 1;
    while (lo < hi) { const m = (lo + hi) >> 1; if (cum[m] < pick) lo = m + 1; else hi = m; }
    const a = idx[lo * 3] * 3, b = idx[lo * 3 + 1] * 3, c = idx[lo * 3 + 2] * 3;
    let u = rand(), v = rand();
    if (u + v > 1) { u = 1 - u; v = 1 - v; }
    const w = 1 - u - v;
    seeds.push([pos[a] * w + pos[b] * u + pos[c] * v, pos[a + 1] * w + pos[b + 1] * u + pos[c + 1] * v, pos[a + 2] * w + pos[b + 2] * u + pos[c + 2] * v]);
  }
  return seeds;
}

// Keeps the part of a convex polygon on the near side of a plane.
// A vertex is [x, y, z, nx, ny, nz]. The plane is dot(p, d) <= k.
export function clipPoly(poly, dx, dy, dz, k) {
  const out = [], n = poly.length;
  for (let i = 0; i < n; i++) {
    const a = poly[i], b = poly[(i + 1) % n];
    const da = a[0] * dx + a[1] * dy + a[2] * dz - k, db = b[0] * dx + b[1] * dy + b[2] * dz - k;
    if (da <= 0) out.push(a);
    if ((da <= 0) !== (db <= 0)) {
      // One order for both sides of a shared edge gives the same point, bit for bit.
      const swap = a[0] > b[0] || (a[0] === b[0] && (a[1] > b[1] || (a[1] === b[1] && a[2] > b[2])));
      const p = swap ? b : a, q = swap ? a : b, dp = swap ? db : da, dq = swap ? da : db;
      const t = dp / (dp - dq), v = new Array(6);
      for (let c = 0; c < 6; c++) v[c] = p[c] + (q[c] - p[c]) * t;
      out.push(v);
    }
  }
  return out;
}

const key = v => `${Math.round(v[0] * 2e6)},${Math.round(v[1] * 2e6)},${Math.round(v[2] * 2e6)}`;

/**
 * Cuts a surface into one shard per seed and gives each shard thickness.
 * The output is one triangle soup; each vertex names its shard.
 * @param {{ pos: Float32Array, nor: Float32Array, idx: Uint32Array }} surf
 * @param {number[][]} seeds
 * @param {number} thick The shell thickness; the inner face lies this far inside.
 * @returns {{ position: Float32Array, normal: Float32Array, piece: Float32Array, wall: Float32Array,
 *   pieces: { c: number[], n: number[], r: number, area: number }[] }}
 */
export function shellShards(surf, seeds, thick) {
  const { pos, nor, idx } = surf, nS = seeds.length;
  const patches = seeds.map(() => []), dist = new Float64Array(nS);
  for (let t = 0; t < idx.length; t += 3) {
    const tri = [0, 1, 2].map(c => {
      const o = idx[t + c] * 3;
      return [pos[o], pos[o + 1], pos[o + 2], nor[o], nor[o + 1], nor[o + 2]];
    });
    const cx = (tri[0][0] + tri[1][0] + tri[2][0]) / 3, cy = (tri[0][1] + tri[1][1] + tri[2][1]) / 3, cz = (tri[0][2] + tri[1][2] + tri[2][2]) / 3;
    let best = Infinity;
    for (let i = 0; i < nS; i++) {
      dist[i] = Math.hypot(seeds[i][0] - cx, seeds[i][1] - cy, seeds[i][2] - cz);
      if (dist[i] < best) best = dist[i];
    }
    // Only a seed this near can be the nearest seed of a point in the triangle.
    const size = Math.max(...tri.map(v => Math.hypot(v[0] - cx, v[1] - cy, v[2] - cz))), far = best + 2 * size, cands = [];
    for (let i = 0; i < nS; i++) if (dist[i] <= far) cands.push(i);
    for (const s of cands) {
      const a = seeds[s], a2 = a[0] * a[0] + a[1] * a[1] + a[2] * a[2];
      let poly = tri;
      for (const c of cands) {
        if (c === s) continue;
        // The bisector plane between the two seeds keeps the side of seed s.
        const q = seeds[c];
        poly = clipPoly(poly, q[0] - a[0], q[1] - a[1], q[2] - a[2], 0.5 * (q[0] * q[0] + q[1] * q[1] + q[2] * q[2] - a2));
        if (poly.length < 3) break;
      }
      if (poly.length >= 3) patches[s].push(poly);
    }
  }
  const P = [], N = [], ID = [], W = [], pieces = [];
  const put = (x, y, z, nx, ny, nz, id, wall) => { P.push(x, y, z); N.push(nx, ny, nz); ID.push(id); W.push(wall); };
  for (let s = 0; s < nS; s++) {
    const polys = patches[s];
    if (!polys.length) continue;
    const id = pieces.length, edges = new Map(), start = ID.length;
    let area = 0, cx = 0, cy = 0, cz = 0, nx = 0, ny = 0, nz = 0;
    for (const poly of polys) {
      for (let i = 1; i < poly.length - 1; i++) {
        const a = poly[0], b = poly[i], c = poly[i + 1];
        const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
        const ar = 0.5 * Math.hypot(uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx);
        if (ar < 1e-13) continue;
        area += ar;
        cx += ar * (a[0] + b[0] + c[0]) / 3; cy += ar * (a[1] + b[1] + c[1]) / 3; cz += ar * (a[2] + b[2] + c[2]) / 3;
        nx += ar * (a[3] + b[3] + c[3]); ny += ar * (a[4] + b[4] + c[4]); nz += ar * (a[5] + b[5] + c[5]);
        // The outer face, then the inner face with the turn reversed.
        for (const v of [a, b, c]) put(v[0], v[1], v[2], v[3], v[4], v[5], id, 0);
        for (const v of [a, c, b]) put(v[0] - v[3] * thick, v[1] - v[4] * thick, v[2] - v[5] * thick, -v[3], -v[4], -v[5], id, 0);
      }
      for (let i = 0; i < poly.length; i++) edges.set(`${key(poly[i])}|${key(poly[(i + 1) % poly.length])}`, [poly[i], poly[(i + 1) % poly.length]]);
    }
    // A sliver too small to see gives no piece.
    if (area < 1e-12) { P.length = N.length = start * 3; ID.length = W.length = start; continue; }
    // An edge with no twin is the rim: it gets a wall.
    for (const [k, [a, b]] of edges) {
      const [ka, kb] = k.split('|');
      if (ka === kb || edges.has(`${kb}|${ka}`)) continue;
      const ex = b[0] - a[0], ey = b[1] - a[1], ez = b[2] - a[2];
      const mx = (a[3] + b[3]) / 2, my = (a[4] + b[4]) / 2, mz = (a[5] + b[5]) / 2;
      let wx = ey * mz - ez * my, wy = ez * mx - ex * mz, wz = ex * my - ey * mx;
      const l = Math.hypot(wx, wy, wz) || 1;
      wx /= l; wy /= l; wz /= l;
      const a2 = [a[0] - a[3] * thick, a[1] - a[4] * thick, a[2] - a[5] * thick], b2 = [b[0] - b[3] * thick, b[1] - b[4] * thick, b[2] - b[5] * thick];
      for (const v of [a, a2, b, b, a2, b2]) put(v[0], v[1], v[2], wx, wy, wz, id, 1);
    }
    const c = [cx / area, cy / area, cz / area], nl = Math.hypot(nx, ny, nz) || 1, n = [nx / nl, ny / nl, nz / nl];
    // The centre sits in the middle of the glass.
    for (let i = 0; i < 3; i++) c[i] -= n[i] * thick * 0.5;
    let r = 0;
    for (const poly of polys) for (const v of poly) r = Math.max(r, Math.hypot(v[0] - c[0], v[1] - c[1], v[2] - c[2]));
    pieces.push({ c, n, r, area });
  }
  return { position: new Float32Array(P), normal: new Float32Array(N), piece: new Float32Array(ID), wall: new Float32Array(W), pieces };
}
