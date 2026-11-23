// Hump yard: the layout. Metres; y up; the yard runs away from the camera along -z.
// One lead track climbs the hump to the crest at z = 0.
// Past the crest a ladder of seven switches splits it into eight sorting tracks.

export const TRACKS = 8;
export const GAUGE = 1.435;
export const SPACING = 4.8;
// Where the ladder's three rows of switches sit, and where the sorting tracks start.
export const SPLITS = [-52, -88, -124];
export const FAN_END = -160;
// The buffer stops at the far end of each sorting track.
export const BUFFER_Z = -330;
// Departing trains run on into the dark to here.
export const FAR_Z = -720;
export const LEAD_Z = 260;
// The master retarder sits just past the crest; each sorting track has one at its head.
export const MASTER = [-14, -34];
export const GROUP = [-162, -178];
// Hump height and grades, as falls per metre in the direction of travel.
export const CREST_Y = 3.6;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

// The fall per metre at z: the climb to the crest, the steep drop, the run into the bowl.
function fall(z) {
  const up = -0.02, steep = 0.045, ladder = 0.011, bowl = 0.0012;
  let g = up;
  g += (steep - up) * smooth(6, -6, z);
  g += (ladder - steep) * smooth(-34, -46, z);
  g += (bowl - ladder) * smooth(-150, -175, z);
  // The far end of each track climbs a little, so cuts roll to a stop.
  g += (-0.004 - bowl) * smooth(-290, -330, z);
  return g;
}
// Height at z, from a table integrated once.
const STEP = 0.5, Z0 = LEAD_Z, Z1 = FAR_Z;
const YT = new Float32Array(Math.ceil((Z0 - Z1) / STEP) + 2);
{
  let y = 0;
  for (let k = 0; k < YT.length; k++) {
    YT[k] = y;
    const z = Z0 - k * STEP;
    y -= fall(z - STEP / 2) * STEP;
  }
  // Shift so the crest stands CREST_Y above the ground.
  const kc = Math.round((Z0 - 0) / STEP), lift = CREST_Y - YT[kc];
  for (let k = 0; k < YT.length; k++) YT[k] += lift;
}
export function heightAt(z) {
  const f = clamp((Z0 - z) / STEP, 0, YT.length - 1.001), k = Math.floor(f), u = f - k;
  return YT[k] + (YT[k + 1] - YT[k]) * u;
}
export const gradeAt = z => fall(z);

// The centre x of each sorting track, and of each switch's two branches.
export const trackX = k => (k - (TRACKS - 1) / 2) * SPACING;
// Node at row r (0 to 3), index i: its x is the mean of the tracks under it.
function nodeX(r, i) {
  const span = TRACKS >> r;
  let x = 0;
  for (let k = i * span; k < (i + 1) * span; k++) x += trackX(k);
  return x / span;
}

/**
 * Builds the segments: a binary tree from the lead to the eight tracks.
 * Each segment: points every metre in z, its length, its parent and children,
 * and at a split, the switch that picks a child.
 */
export function buildYard() {
  const segs = [];
  const seg = (x0, x1, z0, z1, parent) => {
    const n = Math.max(2, Math.ceil(Math.abs(z1 - z0)) + 1);
    const pts = new Float32Array(n * 3);
    for (let q = 0; q < n; q++) {
      const z = z0 + (z1 - z0) * q / (n - 1);
      // An S-curve between the two rows; the first and last few metres run straight.
      const u = smooth(0.12, 0.88, (z - z0) / (z1 - z0));
      pts[q * 3] = x0 + (x1 - x0) * u;
      pts[q * 3 + 1] = heightAt(z);
      pts[q * 3 + 2] = z;
    }
    const cum = new Float32Array(n);
    for (let q = 1; q < n; q++) cum[q] = cum[q - 1] + Math.hypot(pts[q * 3] - pts[q * 3 - 3], pts[q * 3 + 1] - pts[q * 3 - 2], pts[q * 3 + 2] - pts[q * 3 - 1]);
    const s = { id: segs.length, pts, cum, n, len: cum[n - 1], z0, z1, parent, kids: [], sw: 0, row: -1, start: 0 };
    segs.push(s);
    if (parent) { s.start = parent.start + parent.len; parent.kids.push(s); }
    return s;
  };
  const lead = seg(0, 0, LEAD_Z, SPLITS[0], null);
  lead.row = 0;
  let rowSegs = [lead];
  const zs = [...SPLITS, FAN_END];
  for (let r = 0; r < 3; r++) {
    const next = [];
    rowSegs.forEach((p, i) => {
      for (let b = 0; b < 2; b++) {
        const c = seg(nodeX(r, i), nodeX(r + 1, i * 2 + b), zs[r], zs[r + 1], p);
        c.row = r + 1;
        c.index = i * 2 + b;
        next.push(c);
      }
    });
    rowSegs = next;
  }
  // The sorting tracks run straight on past the buffers into the dark.
  const leaves = rowSegs.map((p, k) => {
    const s = seg(trackX(k), trackX(k), FAN_END, FAR_Z, p);
    s.track = k;
    return s;
  });
  // The seven switches: each split segment, its row and place.
  const switches = segs.filter(s => s.kids.length === 2).map(s => ({ seg: s, x: s.pts[(s.n - 1) * 3], z: s.z1, row: s.row }));
  // Where the buffer stands on each sorting track, as a distance from the lead's start.
  for (const l of leaves) l.buffer = l.start + distAtZ(l, BUFFER_Z);
  return { segs, lead, leaves, switches, crestS: distAtZ(lead, 0) };
}

// Distance along a segment to the point at z.
export function distAtZ(s, z) {
  const f = clamp((s.z0 - z) / Math.abs(s.z0 - s.z1) * (s.n - 1), 0, s.n - 1.001), k = Math.floor(f);
  return s.cum[k] + (s.cum[k + 1] - s.cum[k]) * (f - k);
}

// Position and tangent at distance d along a segment.
export function poseAt(s, d, out) {
  let lo = 0, hi = s.n - 1;
  d = clamp(d, 0, s.len);
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (s.cum[m] <= d) lo = m; else hi = m; }
  const u = (d - s.cum[lo]) / Math.max(1e-6, s.cum[hi] - s.cum[lo]);
  const P = s.pts, a = lo * 3, b = hi * 3;
  out[0] = P[a] + (P[b] - P[a]) * u; out[1] = P[a + 1] + (P[b + 1] - P[a + 1]) * u; out[2] = P[a + 2] + (P[b + 2] - P[a + 2]) * u;
  const dx = P[b] - P[a], dy = P[b + 1] - P[a + 1], dz = P[b + 2] - P[a + 2], m = Math.hypot(dx, dy, dz) || 1;
  out[3] = dx / m; out[4] = dy / m; out[5] = dz / m;
  return out;
}
