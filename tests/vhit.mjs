// A JS port of traffic.js's vHit(), for the mesh tests: the nearest part and its distance.
// gPxW is 0 here: rods and capsules keep their own radius.
import { HULLS, BOXES, ARCH, WHEELS, RODS, CUPS, DISH } from '../tornado/vshape.js';
import { hullPlanes } from '../tornado/vmesh.js';

const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mul = (a, s) => a.map(v => v * s);
const norm = a => mul(a, 1 / Math.hypot(...a));

// hBox() and hPl(): the entry and the exit.
function hull(ro, rd, planes) {
  let tn = -1e9, tf = 1e9;
  for (const pl of planes) {
    const n = pl.slice(0, 3), dn = dot(n, rd), di = pl[3] - dot(n, ro);
    if (Math.abs(dn) < 1e-7) { if (di < 0) tf = -1e9; continue; }
    const t = di / dn;
    if (dn < 0) { if (t > tn) tn = t; } else if (t < tf) tf = t;
  }
  return [tn, tf];
}
// hCut(): an entry inside the arch moves to where the ray leaves the cut.
function cut(ro, rd, c, r, x0, tn) {
  const o = [ro[1] - c[0], ro[2] - c[1]], d = [rd[1], rd[2]];
  const A = d[0] * d[0] + d[1] * d[1], B = o[0] * d[0] + o[1] * d[1], D = B * B - A * (o[0] * o[0] + o[1] * o[1] - r * r);
  let hit = false;
  if (D <= 0 || A < 1e-9) return [tn, hit];
  const t0 = (-B - Math.sqrt(D)) / A, t1 = (-B + Math.sqrt(D)) / A;
  for (const s of [1, -1]) {
    const dx = s * rd[0], tx = (x0 - s * ro[0]) / (Math.abs(dx) > 1e-9 ? dx : 1e-9);
    let a = t0, b = t1;
    if (dx > 0) a = Math.max(a, tx); else b = Math.min(b, tx);
    if (a >= b || tn < a || tn >= b) continue;
    tn = b; hit = true;
  }
  return [tn, hit];
}

export function vHitJS(kind, ro, rd, spin = 0) {
  let t = 1e9, id = 0;
  const take = (tn, tf, myId) => { if (!(tn > tf || tn <= 0 || tn >= t)) { t = tn; id = myId; } };
  const ar = ARCH[kind];
  for (const h of HULLS[kind]) {
    let [tn, tf] = hull(ro, rd, hullPlanes(h.c, h.h, h.e, h.pl)), was = false;
    if (h.cut & 1) { const [n, hit] = cut(ro, rd, [ar[0], ar[1]], ar[3], ar[4], tn); tn = n; was = was || hit; }
    if (h.cut & 2) { const [n, hit] = cut(ro, rd, [ar[0], ar[2]], ar[3], ar[4], tn); tn = n; was = was || hit; }
    take(tn, tf, was ? 8 : h.id);
  }
  for (const b of BOXES[kind]) { const [tn, tf] = hull(ro, rd, hullPlanes(b.c, b.h, b.e, [])); take(tn, tf, b.id); }
  const cp = CUPS[kind];
  if (cp) for (let k = 0; k < 3; k++) {
    const a = spin + k * 2.0944, c = add(cp.c, [cp.r * Math.cos(a), 0, cp.r * Math.sin(a)]);
    const [tn, tf] = hull(ro, rd, hullPlanes(c, [cp.s, cp.s, cp.s], cp.s * 0.43, [])); take(tn, tf, 3);
  }
  if (kind === 2) { const p = DISH.post; const [tn, tf] = hull(ro, rd, hullPlanes(p.c, p.h, p.e, [])); take(tn, tf, p.id); }
  if (kind !== 0) for (const [x, z, r, y0, y1, rid] of RODS.slice((kind - 1) * 3, kind * 3)) {
    const o = [ro[0] - x, ro[2] - z], d = [rd[0], rd[2]], A = d[0] * d[0] + d[1] * d[1];
    if (A < 1e-9) continue;
    const tc = -(o[0] * d[0] + o[1] * d[1]) / A, m = [o[0] + d[0] * tc, o[1] + d[1] * tc], D = r * r - (m[0] * m[0] + m[1] * m[1]);
    if (D < 0) continue;
    const tn = tc - Math.sqrt(D / A), y = ro[1] + rd[1] * tn;
    if (tn <= 0 || tn >= t || y < y0 || y > y1) continue;
    t = tn; id = rid;
  }
  if (kind === 2) {
    const ax = norm(DISH.ax), cs = add(DISH.v, mul(ax, DISH.rs)), oc = sub(ro, cs);
    const b = dot(rd, oc); let h = b * b - dot(oc, oc) + DISH.rs * DISH.rs;
    if (h >= 0) {
      h = Math.sqrt(h);
      const ca = Math.sqrt(1 - (DISH.rr * DISH.rr) / (DISH.rs * DISH.rs));
      for (const tk of [-b - h, -b + h]) {
        if (tk <= 0 || tk >= t) continue;
        const q = mul(sub(add(ro, mul(rd, tk)), cs), 1 / DISH.rs);
        if (dot(q, mul(ax, -1)) < ca) continue;
        t = tk; id = dot(q, rd) < 0 ? 16 : 15;
        break;
      }
    }
    // The feed arm and the horn: capsules.
    const dn = norm(sub([0, -1, 0], mul(ax, dot([0, -1, 0], ax)))), fo = add(DISH.v, mul(ax, 0.45));
    for (const [a, b2, r] of [[add(add(DISH.v, mul(ax, 0.1)), mul(dn, 0.4)), fo, 0.018], [sub(fo, mul(ax, 0.03)), add(fo, mul(ax, 0.04)), 0.035]]) {
      const ba = sub(b2, a), oa = sub(ro, a);
      const baba = dot(ba, ba), bard = dot(ba, rd), baoa = dot(ba, oa), rdoa = dot(rd, oa), oaoa = dot(oa, oa);
      const A = baba - bard * bard, B = baba * rdoa - baoa * bard, C = baba * oaoa - baoa * baoa - r * r * baba, D = B * B - A * C;
      if (D < 0) continue;
      let tc = (-B - Math.sqrt(D)) / A; const y = baoa + tc * bard;
      if (y <= 0 || y >= baba) {
        const oc2 = y <= 0 ? oa : sub(ro, b2), b3 = dot(rd, oc2), h2 = b3 * b3 - (dot(oc2, oc2) - r * r);
        if (h2 < 0) continue;
        tc = -b3 - Math.sqrt(h2);
      }
      if (tc <= 0 || tc >= t) continue;
      t = tc; id = 12;
    }
  }
  const [wr, wzA, wxA, ww, wz0] = WHEELS[kind];
  for (let k = 0; k < 4; k++) {
    const c = [wr, (k < 2 ? 1 : -1) * wzA + wz0], x = (k % 2 === 0 ? 1 : -1) * wxA;
    const o = [ro[1] - c[0], ro[2] - c[1]], d = [rd[1], rd[2]];
    const A = d[0] * d[0] + d[1] * d[1], B = o[0] * d[0] + o[1] * d[1], C = o[0] * o[0] + o[1] * o[1] - wr * wr, D = B * B - A * C;
    if (D < 0 || A < 1e-8) continue;
    const tn = (-B - Math.sqrt(D)) / A;
    if (tn < 0 || tn >= t) continue;
    const hx = ro[0] + rd[0] * tn;
    if (Math.abs(hx - x) > ww) {
      const tx = (x - Math.sign(rd[0]) * ww - ro[0]) / rd[0], q = [ro[1] + rd[1] * tx - c[0], ro[2] + rd[2] * tx - c[1]];
      if (tx < 0 || tx >= t || q[0] * q[0] + q[1] * q[1] > wr * wr) continue;
      t = tx; id = Math.hypot(...q) < wr * 0.62 ? 11 : 9;
      continue;
    }
    t = tn; id = 9;
  }
  return t < 1e8 ? { id, t } : { id: 0, t: Infinity };
}
