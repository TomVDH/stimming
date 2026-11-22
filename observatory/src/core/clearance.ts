// Clearance between the moving head and the fixed pier and housing.
// Pure geometry: triangles in, clashes out. No three.js, so node can test it.
// A clash is a triangle pair that crosses by at least DEPTH metres.
// Two things are not clashes: a face lying flat on a face, and a touch.

// A triangle: nine numbers, x y z for each of its three corners.
export type Tri = Float64Array;

// The least crossing depth that counts as a clash, in metres.
export const DEPTH = 0.001;
// A corner this close to another triangle's plane lies flat on it, in metres.
export const FLAT = 0.0008;
// The broad-phase grid's cell size, in metres.
export const CELL = 0.02;
// The site's latitude, in degrees. Matches world/hero-scope.ts.
export const LAT = 51;
// The dec angle with the tube on the pole, in the joint's convention.
export const POLE_DEC = -Math.PI / 2;
// The mount's axes cross this far over the cupola's turn height, in dome units.
// world/hero-scope.ts, core/mount.ts and view/cuts.ts read it from here.
export const AXES_UP = 0.35;
// The tube's axis runs this far from the polar axis, in metres.
// world/hero-scope.ts and view/cuts.ts read it from here.
export const D_OFF = 0.4275;
// The tube sits this far forward in its rings, toward the objective.
// The shorter rear clears the RA drive and the pier.
export const TUBE_SHIFT = 0.45;

// A joint pose: RA unwrapped, the dec angle, and the side in use.
export type Pose = { ra: number; dec: number; side: number };

type V = [number, number, number];
const sub = (p: V, q: V): V => [p[0] - q[0], p[1] - q[1], p[2] - q[2]];
const cross = (u: V, v: V): V => [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
const dot = (u: V, v: V): number => u[0] * v[0] + u[1] * v[1] + u[2] * v[2];
const len = (v: V): number => Math.hypot(v[0], v[1], v[2]);
const corner = (t: Tri, i: number): V => [t[3 * i], t[3 * i + 1], t[3 * i + 2]];

// True when every corner of a lies within FLAT of b's plane.
function flatOn(a: Tri, b: Tri): boolean {
  const p0 = corner(b, 0);
  const n = cross(sub(corner(b, 1), p0), sub(corner(b, 2), p0));
  const l = len(n);
  if (l < 1e-12) return true;
  for (let i = 0; i < 3; i++) if (Math.abs(dot(sub(corner(a, i), p0), n)) / l > FLAT) return false;
  return true;
}

// True when the two triangles overlap, by the separating-axis test.
function overlaps(a: Tri, b: Tri): boolean {
  const A = [corner(a, 0), corner(a, 1), corner(a, 2)];
  const B = [corner(b, 0), corner(b, 1), corner(b, 2)];
  const ea = [sub(A[1], A[0]), sub(A[2], A[1]), sub(A[0], A[2])];
  const eb = [sub(B[1], B[0]), sub(B[2], B[1]), sub(B[0], B[2])];
  const axes: V[] = [cross(ea[0], ea[1]), cross(eb[0], eb[1])];
  for (const u of ea) for (const v of eb) axes.push(cross(u, v));
  for (const L of axes) {
    const l = len(L);
    if (l < 1e-12) continue;
    let amin = Infinity, amax = -Infinity, bmin = Infinity, bmax = -Infinity;
    for (const p of A) { const d = dot(p, L) / l; if (d < amin) amin = d; if (d > amax) amax = d; }
    for (const p of B) { const d = dot(p, L) / l; if (d < bmin) bmin = d; if (d > bmax) bmax = d; }
    if (Math.min(amax, bmax) - Math.max(amin, bmin) < -1e-9) return false;
  }
  return true;
}

// How far the corners of t reach past f's plane, on the shorter side.
// Returns 0 when t does not straddle f's plane.
function reach(t: Tri, f: Tri): number {
  const p0 = corner(f, 0);
  const n = cross(sub(corner(f, 1), p0), sub(corner(f, 2), p0));
  const l = len(n);
  if (l < 1e-12) return 0;
  let hi = -Infinity, lo = Infinity;
  for (let i = 0; i < 3; i++) {
    const s = dot(sub(corner(t, i), p0), n) / l;
    if (s > hi) hi = s;
    if (s < lo) lo = s;
  }
  if (hi <= 0 || lo >= 0) return 0;
  return Math.min(hi, -lo);
}

// How deep two triangles cross, in metres.
// Returns -1 when they are apart, and 0 when they only touch.
// The depth is the shorter push that separates them through either plane.
export function crossDepth(a: Tri, b: Tri): number {
  if (!overlaps(a, b)) return -1;
  return Math.min(reach(a, b), reach(b, a));
}

// The centre of a triangle.
const centre = (t: Tri): V => [
  (t[0] + t[3] + t[6]) / 3,
  (t[1] + t[4] + t[7]) / 3,
  (t[2] + t[5] + t[8]) / 3,
];

// Grid keys: cell indices offset to stay positive.
const OFF = 512, P = 1024;
const key = (i: number, j: number, k: number): number => ((i + OFF) * P + (j + OFF)) * P + (k + OFF);

// Calls f with the key of every grid cell the triangle's box covers.
function eachCell(t: Tri, f: (k: number) => void): void {
  const mn: V = [Infinity, Infinity, Infinity], mx: V = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < 3; i++) for (let c = 0; c < 3; c++) {
    const v = t[3 * i + c];
    if (v < mn[c]) mn[c] = v;
    if (v > mx[c]) mx[c] = v;
  }
  for (let i = Math.floor(mn[0] / CELL); i <= Math.floor(mx[0] / CELL); i++)
    for (let j = Math.floor(mn[1] / CELL); j <= Math.floor(mx[1] / CELL); j++)
      for (let k = Math.floor(mn[2] / CELL); k <= Math.floor(mx[2] / CELL); k++) f(key(i, j, k));
}

// A broad-phase index over fixed triangles.
// Candidates come back in index order, so results repeat exactly.
export class TriIndex {
  readonly tris: Tri[];
  private grid = new Map<number, number[]>();
  constructor(tris: Tri[]) {
    this.tris = tris;
    tris.forEach((t, id) => eachCell(t, (k) => {
      let list = this.grid.get(k);
      if (!list) { list = []; this.grid.set(k, list); }
      list.push(id);
    }));
  }
  // Fixed triangles that share a cell with t, each once, in index order.
  near(t: Tri): number[] {
    const seen = new Set<number>();
    eachCell(t, (k) => { for (const id of this.grid.get(k) ?? []) seen.add(id); });
    return [...seen].sort((x, y) => x - y);
  }
}

// True when two triangles clash.
export function clashes(a: Tri, b: Tri): boolean {
  if (flatOn(a, b) || flatOn(b, a)) return false;
  return crossDepth(a, b) >= DEPTH;
}

// The clashes of one moving part against an index.
// pairs: clashing triangle pairs. depth: the deepest, in metres. at: its centre.
// partners: the fixed triangles that clash, in index order, each once.
export type Report = { pairs: number; depth: number; at: V | null; partners: number[] };
export function clashReport(index: TriIndex, tris: Tri[]): Report {
  let pairs = 0, depth = 0;
  let at: V | null = null;
  const partners = new Set<number>();
  for (const t of tris) {
    for (const id of index.near(t)) {
      const f = index.tris[id];
      if (flatOn(t, f) || flatOn(f, t)) continue;
      const d = crossDepth(t, f);
      if (d >= DEPTH) {
        pairs++;
        partners.add(id);
        if (d > depth) { depth = d; at = centre(t); }
      }
    }
  }
  return { pairs, depth, at, partners: [...partners].sort((x, y) => x - y) };
}

const DEG = Math.PI / 180;
const POLE: V = [0, Math.sin(LAT * DEG), -Math.cos(LAT * DEG)];
const EQ: V = [0, Math.cos(LAT * DEG), Math.sin(LAT * DEG)];
const wrapTurn = (x: number): number => x - 2 * Math.PI * Math.round(x / (2 * Math.PI));

// The pose that points the tube at alt and az, in degrees.
// The side keeps the counterweight down, as on a real German mount.
// An east target rides with the tube west of the pier, and the reverse.
// In this joint frame, the tube is up when sin(ra) <= 0.
// force names a side instead. near is the RA the unwrap starts from.
export function targetPose(alt: number, az: number, near: number, force?: number): Pose {
  const a = alt * DEG, z = az * DEG;
  const t: V = [Math.sin(z) * Math.cos(a), Math.sin(a), -Math.cos(z) * Math.cos(a)];
  const ha = Math.atan2(-t[0], dot(t, EQ));
  const decl = Math.asin(Math.min(1, Math.max(-1, dot(t, POLE))));
  const side = force ?? (ha < 0 ? -1 : 1);
  const raW = -(side > 0 ? ha : ha + Math.PI);
  return { ra: near + wrapTurn(raW - near), dec: -(side > 0 ? decl : Math.PI - decl), side };
}

// Eases a fraction from 0 to 1 at both ends.
const ease = (u: number): number => u * u * (3 - 2 * u);

// While RA turns in a flip, the tube stays this far off the pole, in radians.
// On the pole, the tube's rear runs along the RA drive.
export const FLIP_TILT = 0.25;
// The flip crosses the pole at this RA, modulo a turn: clear of the drive.
export const FLIP_CROSS = -2.0;

// The value of x, modulo a turn, inside lo to hi; NaN when there is none.
function inRange(x: number, lo: number, hi: number): number {
  const v = x + 2 * Math.PI * Math.ceil((lo - x) / (2 * Math.PI));
  return v <= hi ? v : NaN;
}

// The flip's end RA: to.ra plus whole turns, so the turn passes FLIP_CROSS.
// Of those, the shortest turn wins.
export function flipRa(from: Pose, to: Pose): number {
  let best = to.ra, len = Infinity;
  for (let k = -2; k <= 2; k++) {
    const t = to.ra + 2 * Math.PI * k;
    const passes = !Number.isNaN(inRange(FLIP_CROSS, Math.min(from.ra, t), Math.max(from.ra, t)));
    if (passes && Math.abs(t - from.ra) < len) { best = t; len = Math.abs(t - from.ra); }
  }
  return best;
}

// The flip at fraction s, in five steps.
// 1: dec moves to FLIP_TILT off the pole, on the start's side.
// 2: RA turns to FLIP_CROSS.
// 3: dec crosses the pole to FLIP_TILT on the far side.
// 4: RA turns the rest of the way.
// 5: dec settles on the target.
export function flipPose(from: Pose, to: Pose, s: number): Pose {
  const raEnd = flipRa(from, to);
  const cross = inRange(FLIP_CROSS, Math.min(from.ra, raEnd), Math.max(from.ra, raEnd));
  const rc = Number.isNaN(cross) ? (from.ra + raEnd) / 2 : cross;
  const da = POLE_DEC + FLIP_TILT * (from.dec >= POLE_DEC ? 1 : -1);
  const db = POLE_DEC + FLIP_TILT * (to.dec >= POLE_DEC ? 1 : -1);
  const seg = (s0: number, s1: number): number => ease(Math.min(1, Math.max(0, (s - s0) / (s1 - s0))));
  if (s < 0.25) return { ra: from.ra, dec: from.dec + (da - from.dec) * seg(0, 0.25), side: to.side };
  if (s < 0.45) return { ra: from.ra + (rc - from.ra) * seg(0.25, 0.45), dec: da, side: to.side };
  if (s < 0.55) return { ra: rc, dec: da + (db - da) * seg(0.45, 0.55), side: to.side };
  if (s < 0.75) return { ra: rc + (raEnd - rc) * seg(0.55, 0.75), dec: db, side: to.side };
  return { ra: raEnd, dec: db + (to.dec - db) * seg(0.75, 1), side: to.side };
}
