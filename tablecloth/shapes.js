// Tablecloth yank: shapes. Profiles, the table layout and shard plans.
// Units are metres. Y is up. The table runs along x; the pull end is +x.
// A profile is a list of [r, y] points, turned about the y axis.

export const TOP = 0.75;              // table top height
export const TABLE = { hx: 0.7, hz: 0.425, th: 0.04, re: 0.02 };
// The slab is a bullnose plate: a core rectangle swept by a 2 cm circle.
TABLE.cy = TOP - TABLE.re;
export const CLOTH = { w: 2.1, d: 1.5, nx: 56, nz: 40, thick: 0.003 };

/* ---------- profiles ---------- */
// Dinner plate, 27 cm: foot ring, well, verge, rolled rim.
export const PLATE = [
  [0, 0.0045], [0.064, 0.0045], [0.069, 0.0012], [0.073, 0], [0.077, 0.0008], [0.084, 0.0058],
  [0.105, 0.0105], [0.124, 0.0158], [0.1335, 0.0188], [0.1358, 0.0212], [0.1342, 0.0236], [0.1295, 0.0232],
  [0.116, 0.0192], [0.096, 0.0122], [0.086, 0.0086], [0.05, 0.0082], [0, 0.0082],
];
// Wine glass: foot, stem, tulip bowl; outer wall up, inner wall down.
export const WINE = [
  [0, 0], [0.0355, 0], [0.0368, 0.0016], [0.0352, 0.0036], [0.022, 0.0058], [0.011, 0.0092], [0.006, 0.016],
  [0.0043, 0.03], [0.004, 0.066], [0.0058, 0.08], [0.012, 0.0905], [0.026, 0.103], [0.0365, 0.12],
  [0.042, 0.142], [0.0418, 0.162], [0.0386, 0.184], [0.0346, 0.206], [0.0341, 0.2105], [0.0326, 0.2095],
  [0.0366, 0.184], [0.0399, 0.162], [0.0402, 0.142], [0.035, 0.121], [0.0248, 0.105], [0.011, 0.0945], [0, 0.093],
];
// Tumbler: a heavy base, slightly flared walls.
export const TUMBLER = [
  [0, 0], [0.0305, 0], [0.0318, 0.0022], [0.0332, 0.03], [0.0356, 0.08], [0.0366, 0.104], [0.0352, 0.1052],
  [0.0342, 0.08], [0.0318, 0.03], [0.0302, 0.0155], [0.026, 0.0136], [0, 0.0132],
];
// Brass candlestick with a knop and a drip pan.
export const STICK = [
  [0, 0], [0.0445, 0], [0.0458, 0.0035], [0.0438, 0.0095], [0.031, 0.0155], [0.0145, 0.0235], [0.0108, 0.039],
  [0.0158, 0.0565], [0.0164, 0.062], [0.011, 0.077], [0.0088, 0.108], [0.0135, 0.1205], [0.0272, 0.1265],
  [0.0288, 0.1305], [0.0126, 0.1335], [0, 0.1335],
];
export const CANDLE = { r: 0.0105, y0: 0.131, y1: 0.305 };

// Inner wall of each glass as [y, r] rows, for the liquid.
export const INNER = {
  wine: [[0.093, 0], [0.0945, 0.011], [0.105, 0.0248], [0.121, 0.035], [0.142, 0.0402], [0.162, 0.0399], [0.184, 0.0366], [0.2095, 0.0326]],
  tumbler: [[0.0132, 0], [0.0136, 0.026], [0.0155, 0.0302], [0.03, 0.0318], [0.08, 0.0342], [0.1052, 0.0352], [0.1052, 0.0352], [0.1052, 0.0352]],
};
export const FILL = { wine: 0.128, tumbler: 0.074 };
export const RIM = { wine: 0.2095, tumbler: 0.1052 };
export function innerR(kind, y) {
  const P = INNER[kind];
  if (y <= P[0][0]) return 0;
  for (let i = 1; i < P.length; i++) {
    if (y <= P[i][0]) {
      const t = (y - P[i - 1][0]) / Math.max(1e-6, P[i][0] - P[i - 1][0]);
      return P[i - 1][1] + (P[i][1] - P[i - 1][1]) * t;
    }
  }
  return P[P.length - 1][1];
}

/* ---------- the setting ---------- */
// Two places across the table and a candle between them.
// A front diner faces -z, so their right hand is +x.
export const SETTING = [
  { kind: 'plate', x: 0.12, z: 0.235, a: 0 },
  { kind: 'knife', x: 0.295, z: 0.235, a: 0 },
  { kind: 'fork', x: -0.055, z: 0.235, a: 0 },
  { kind: 'wine', x: 0.285, z: 0.07, a: 0 },
  { kind: 'tumbler', x: 0.385, z: 0.125, a: 0 },
  { kind: 'plate', x: -0.17, z: -0.235, a: 1.1 },
  { kind: 'knife', x: -0.345, z: -0.235, a: Math.PI },
  { kind: 'fork', x: 0.005, z: -0.235, a: Math.PI },
  { kind: 'wine', x: -0.335, z: -0.07, a: 0 },
  { kind: 'tumbler', x: -0.435, z: -0.125, a: 0 },
  { kind: 'stick', x: 0.0, z: 0.0, a: 0 },
];

/* ---------- shard plans ---------- */
// A shard is a patch of the piece's own surface: a profile slice turned over an arc.
// The sim uses its points for contact; the scene builds its mesh from the same plan.
// Three's lathe puts a point at x = r sin(phi), z = r cos(phi).
const latheAt = (r, y, phi) => [r * Math.sin(phi), y, r * Math.cos(phi)];

function slice(P, test) {
  const out = [];
  for (const p of P) if (test(p)) out.push(p);
  return out;
}
// Cuts a circle into n arcs of uneven size.
function arcs(n, rnd) {
  const w = Array.from({ length: n }, () => 0.55 + rnd());
  const s = w.reduce((a, b) => a + b, 0), o = rnd() * Math.PI * 2;
  let a = o;
  return w.map(v => { const d = v / s * Math.PI * 2, r = [a, d]; a += d; return r; });
}
function patch(prof, phi0, dphi, whole = false) {
  const pts = [];
  const ends = [prof[0], prof[prof.length - 1], prof[(prof.length / 2) | 0]];
  const angs = whole ? [0, Math.PI * 0.67, Math.PI * 1.33] : [phi0 + dphi * 0.08, phi0 + dphi * 0.92, phi0 + dphi * 0.5];
  for (const [r, y] of ends) for (const a of angs) pts.push(latheAt(r, y, a));
  // The centre of mass is the mean of the sample points.
  const c = [0, 0, 0];
  for (const p of pts) { c[0] += p[0]; c[1] += p[1]; c[2] += p[2]; }
  c[0] /= pts.length; c[1] /= pts.length; c[2] /= pts.length;
  return { prof, phi0: whole ? 0 : phi0, dphi: whole ? Math.PI * 2 : dphi, c, pts };
}
export function shardPlan(kind, rnd = Math.random) {
  const out = [];
  if (kind === 'plate') {
    out.push(patch([[0, 0.0045], [0.05, 0.0045], [0.05, 0.0082], [0, 0.0082]], 0, 0, true));
    const ring = slice(PLATE, ([r]) => r >= 0.05);
    for (const [a, d] of arcs(5, rnd)) out.push(patch(ring, a, d));
    // The rim breaks off in two short arcs.
    const rim = slice(PLATE, ([r]) => r >= 0.11);
    for (const [a, d] of arcs(7, rnd).slice(0, 2)) out.push(patch(rim, a, d * 0.7));
  } else if (kind === 'wine') {
    out.push(patch(slice(WINE, ([r, y]) => y < 0.1 && (y < 0.093 || r > 0.02)).slice(0, 12), 0, 0, true));
    const low = slice(WINE, ([r, y]) => y >= 0.09 && y <= 0.15 && r > 0.015).slice(0, 4);
    const high = slice(WINE, ([r, y]) => y >= 0.14 && y <= 0.211).slice(0, 5);
    for (const [a, d] of arcs(4, rnd)) out.push(patch(low, a, d));
    for (const [a, d] of arcs(5, rnd)) out.push(patch(high, a, d));
  } else if (kind === 'tumbler') {
    out.push(patch(TUMBLER.slice(0, 4), 0, 0, true));
    const low = [[0.0325, 0.02], [0.0332, 0.03], [0.0345, 0.055]];
    const high = [[0.0345, 0.055], [0.0356, 0.08], [0.0366, 0.104]];
    for (const [a, d] of arcs(4, rnd)) out.push(patch(low, a, d));
    for (const [a, d] of arcs(4, rnd)) out.push(patch(high, a, d));
  }
  return out;
}
export const BREAKS = new Set(['plate', 'wine', 'tumbler']);
