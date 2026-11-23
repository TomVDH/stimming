// Load order: post/chain runs first.
import '../post/chain.ts';
import { BufferGeometry, CatmullRomCurve3, Color, DirectionalLight, Float32BufferAttribute, HemisphereLight, Mesh, MeshLambertMaterial, PlaneGeometry, Vector3 } from 'three';
import { disposeTree, onLeave, scene } from '../setup.ts';

/* ---------- the land: an alpine peak in boreal forest, the camera's ridge, the road ---------- */
// Scene axes: +Y is up, -Z is north, +X is east.
// Azimuth runs from north through east, as in core/sky.ts.
// The peak follows the Pic du Midi de Bigorre: a rock pyramid with arêtes.
// It stands alone, over deep land on three sides.
// Source: Wikimedia Commons photos of the observatory and its peak.
// Boreal forest covers the slopes up to a ragged treeline.

// The complex stands on level pads cut into the summit's rock.
// The summit's top is the origin.
// Other modules keep clear of the summit within this radius.
export const CLEAR = 54;
// The camera's ridge lies far north of the peak, across a wide forested valley.
// From there the summit stands on the horizon.
export const RISE = { x: 0, z: -550 };
// The wide eye stands this high over the ridge.
export const EYE_H = 27;

const sstep = (a: number, b: number, x: number): number => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
// A hash of a lattice point and a seed, in [0, 1).
function hash(i: number, j: number, s: number): number {
  const h = Math.sin(i * 127.1 + j * 311.7 + s * 74.7) * 43758.5453;
  return h - Math.floor(h);
}
// Smooth value noise in [0, 1).
export function vnoise(x: number, y: number, s: number): number {
  const i = Math.floor(x), j = Math.floor(y), u = x - i, v = y - j;
  const a = u * u * (3 - 2 * u), b = v * v * (3 - 2 * v);
  const n0 = hash(i, j, s) + (hash(i + 1, j, s) - hash(i, j, s)) * a;
  const n1 = hash(i, j + 1, s) + (hash(i + 1, j + 1, s) - hash(i, j + 1, s)) * a;
  return n0 + (n1 - n0) * b;
}
// Sharp ridges in [0, 1]: rock ribs with gullies between.
function ridged(x: number, y: number, s: number): number {
  let sum = 0, amp = 0.5, w = 1;
  for (let i = 0; i < 4; i++) {
    const n = 1 - Math.abs(vnoise(x, y, s) * 2 - 1);
    sum += amp * n * n * w;
    w = Math.min(1, n * 1.6);
    x = x * 2.03 + 13.7; y = y * 2.03 + 5.3; amp *= 0.5;
  }
  return sum / 0.94;
}
const angDiff = (a: number, b: number): number => {
  let d = (a - b) % (2 * Math.PI);
  if (d > Math.PI) d -= 2 * Math.PI;
  if (d < -Math.PI) d += 2 * Math.PI;
  return d;
};

// The peak's arêtes: azimuth, width in radians, strength.
// The north-east arête is broad; the road climbs beside it.
const ARETES = [[62, 0.5, 0.5], [195, 0.25, 0.2], [285, 0.25, 0.22]].map(([a, w, k]) => ({ a: a * Math.PI / 180, w, k }));
// The peak: height, the rounding radius of its top, foot radius.
// A broad top gives the complex room; the flanks run at about 34 degrees.
const PEAK = 220, CAP = 90, FOOT = 520;

// The camera's ridge runs east-west to the north.
const northShape = (x: number, z: number): number => Math.exp(-(((z + 580) / 120) ** 2)) * Math.exp(-((x / 700) ** 2));

// The land without the camera's ridge.
function lowLand(x: number, z: number): number {
  const r = Math.hypot(x, z), th = Math.atan2(x, -z);
  let ar = 0;
  for (const A of ARETES) ar = Math.max(ar, A.k * Math.exp(-((angDiff(th, A.a) / A.w) ** 2)));
  // The top rounds over smoothly, so the summit is a crest, not a plateau.
  const rr = r * (1 - ar), d = Math.sqrt(rr * rr + CAP * CAP) - CAP;
  const peak = PEAK * Math.max(0, 1 - d / FOOT) ** 1.6;
  // The peak stands alone: deep land surrounds it on the east, south and west.
  // The camera's ridge to the north stays.
  const north01 = Math.exp(-((th / 0.9) ** 2));
  const moat = -100 * Math.exp(-(((r - 560) / 160) ** 2)) * (1 - north01);
  // A wide valley lies between the camera's ridge and the peak.
  const valley = -60 * Math.exp(-(((z + 340) / 110) ** 2)) * Math.exp(-((x / 900) ** 2));
  // Rock ribs and gullies cover the slopes, not the summit.
  // The back country takes broader, deeper ribs.
  const rough = (26 + 16 * sstep(700, 1500, z)) * ridged(x / 120 + 3, z / 120 + 7, 11) * sstep(80, 180, r);
  const fine = 5 * (vnoise(x / 22, z / 22, 3) - 0.5);
  // Rock knolls break up the summit between the pads.
  const crag = 4 * ridged(x / 28 + 1, z / 28 + 2, 4) * (1 - sstep(100, 140, r));
  // Two forested ridges recede behind the peak, out of the valley mist.
  // The height haze fills the deep land between them, so each ridge reads as a layer.
  const edge = 1 - sstep(1150, 1550, Math.abs(x));
  // Ridged noise gives them peaks, cols and spurs, not smooth swells.
  // Their crests stay under the summit's skyline.
  const crest = 0.6 + 0.55 * ridged(x / 330 + 11, z / 330 + 3, 21);
  const mid1 = 105 * Math.exp(-(((z - 1350) / 170) ** 2)) * (0.7 + 0.3 * Math.sin(x / 310 + 1.3)) * crest * edge;
  const mid2 = 170 * Math.exp(-(((z - 2350) / 240) ** 2)) * (0.65 + 0.35 * Math.sin(x / 430 + 2.4)) * crest * edge;
  return peak + moat + valley + rough + fine + crag + mid1 + mid2;
}
// The ridge's crest stands this far under the summit.
// The eye, EYE_H over it, then sees the summit on the horizon.
const RIDGE_UNDER = 26;
const NORTH_A = (lowLand(0, 0) - RIDGE_UNDER - lowLand(RISE.x, RISE.z)) / northShape(RISE.x, RISE.z);
function base(x: number, z: number): number {
  return lowLand(x, z) + NORTH_A * northShape(x, z);
}
const TOP0 = base(0, 0);

// A buttress on the north face carries the switchbacks at about 30 degrees.
function raw(x: number, z: number): number {
  const h = base(x, z);
  const mask = Math.exp(-(((x - 115) / 90) ** 2)) * sstep(-10, -40, z);
  const apron = TOP0 - 6 - 0.6 * Math.max(0, -z - 30);
  return h + mask * Math.max(0, apron - h);
}
// The summit's height: the complex's origin.
export const TOP = raw(0, 0);

/* ---------- the building pads ---------- */
// Each building stands on its own level pad.
// A pad takes the rock's height at its centre, so the pads step down the crest.
// x, z: the centre; ax, az: half-sizes in metres; y: the pad's height.
export type Pad = { x: number; z: number; ax: number; az: number; y: number };
const pad = (x: number, z: number, ax: number, az: number): Pad => ({ x, z, ax, az, y: Math.round(raw(x, z) * 2) / 2 });
export const PADS = {
  big: pad(-12, -6, 16, 16), classic: pad(-36, -16, 8, 8), ops: pad(18, 7, 15, 7.5), east: pad(42, 2, 5, 5),
  north: pad(36, -16, 4.5, 4.5), dish: pad(-36, 9, 6.5, 6.5), mast: pad(4, -21, 3, 3),
};
const PAD_LIST = Object.values(PADS);
// A pad's edge runs out into the rock over this many metres.
const PAD_EDGE = 5;
// 1 on a pad, 0 off it.
function padW(p: Pad, x: number, z: number): number {
  const e = ((Math.abs(x - p.x) / p.ax) ** 4 + (Math.abs(z - p.z) / p.az) ** 4) ** 0.25;
  return 1 - sstep(1, 1 + PAD_EDGE / Math.min(p.ax, p.az), e);
}
function onPad(x: number, z: number): number {
  let w = 0;
  for (const p of PAD_LIST) w = Math.max(w, padW(p, x, z));
  return w;
}
function landNoRoad(x: number, z: number): number {
  let h = raw(x, z);
  for (const p of PAD_LIST) { const w = padW(p, x, z); if (w > 0) h += (p.y - h) * w; }
  return h;
}

/* ---------- the road: switchbacks up the buttress ---------- */
// Each leg follows the slope at its own height.
// Hairpins join the legs at their ends.
// Under the last leg the road runs down the valley to the west.
export const ROAD_W = 5;
// The legs: count, top height, drop per leg, west end, east end.
const LEGS = 6, LEG_DH = 19, LEG_XA = 45, LEG_XB = 165;

// The z of the crest at this x: the highest point north of the summit.
function crestZ(x: number): number {
  let bz = -10, bh = -1e9;
  for (let z = -10; z >= -160; z -= 2) { const h = raw(x, z); if (h > bh) { bh = h; bz = z; } }
  return bz;
}
// The first leg starts a little under the crest at its west end.
const LEG_H0 = raw(LEG_XA, crestZ(LEG_XA)) - 8;
// The z on the north face where the land stands at height h.
function faceZ(x: number, h: number): number {
  let lo = crestZ(x), hi = -280;
  for (let k = 0; k < 40; k++) { const m = (lo + hi) / 2; if (raw(x, m) > h) lo = m; else hi = m; }
  return (lo + hi) / 2;
}

function roadKnots(): Vector3[] {
  const k: Vector3[] = [];
  // From the operations pad, down off the crest to the north-east.
  k.push(new Vector3(8, PADS.ops.y, -1), new Vector3(24, raw(24, -20), -20), new Vector3(38, raw(38, -38), -38));
  for (let i = 0; i < LEGS; i++) {
    const east = i % 2 === 0, xa = LEG_XA + 4 * i, xb = LEG_XB + 4 * i;
    for (let j = 0; j <= 4; j++) {
      const t = j / 4, x = east ? xa + (xb - xa) * t : xb - (xb - xa) * t, h = LEG_H0 - LEG_DH * (i + t);
      k.push(new Vector3(x, h, faceZ(x, h)));
    }
    // The hairpin bulges past the leg's end.
    if (i < LEGS - 1) {
      const x = east ? xb + 12 : xa - 12, h = LEG_H0 - LEG_DH * (i + 1);
      k.push(new Vector3(x, h, faceZ(x, h) - 4));
    }
  }
  // Down the valley to the west, out of view.
  for (const [x, z] of [[10, -232], [-80, -240], [-220, -232], [-420, -215], [-700, -200]]) k.push(new Vector3(x, raw(x, z), z));
  return k;
}
// The road's centre line, about every 3 m, with its height.
export const ROAD: Vector3[] = (() => {
  const c = new CatmullRomCurve3(roadKnots(), false, 'centripetal');
  return c.getSpacedPoints(Math.round(c.getLength() / 3));
})();

// Road segments sorted into 24 m cells, so a lookup checks few segments.
const CELL = 24, REACH = ROAD_W / 2 + 12;
const cells = new Map<number, number[]>();
const cellKey = (i: number, j: number): number => (i + 1000) * 4000 + (j + 1000);
for (let s = 0; s + 1 < ROAD.length; s++) {
  const a = ROAD[s], b = ROAD[s + 1];
  const i0 = Math.floor((Math.min(a.x, b.x) - REACH) / CELL), i1 = Math.floor((Math.max(a.x, b.x) + REACH) / CELL);
  const j0 = Math.floor((Math.min(a.z, b.z) - REACH) / CELL), j1 = Math.floor((Math.max(a.z, b.z) + REACH) / CELL);
  for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) {
    const key = cellKey(i, j), list = cells.get(key);
    if (list) list.push(s); else cells.set(key, [s]);
  }
}
// The nearest road point within REACH: its distance and the road's height there.
function nearRoad(x: number, z: number): { d: number; y: number } {
  const list = cells.get(cellKey(Math.floor(x / CELL), Math.floor(z / CELL)));
  let best = Infinity, y = 0;
  if (!list) return { d: best, y };
  for (const s of list) {
    const a = ROAD[s], b = ROAD[s + 1];
    const dx = b.x - a.x, dz = b.z - a.z, l2 = dx * dx + dz * dz || 1;
    const t = Math.min(1, Math.max(0, ((x - a.x) * dx + (z - a.z) * dz) / l2));
    const px = a.x + dx * t - x, pz = a.z + dz * t - z, d = Math.hypot(px, pz);
    if (d < best) { best = d; y = a.y + (b.y - a.y) * t; }
  }
  return { d: best, y };
}
// Distance in metres from a point to the road's centre line.
// Points far from the road give Infinity.
export function roadDist(x: number, z: number): number {
  return nearRoad(x, z).d;
}

// Ground height in metres at a point.
// The road cuts a flat bench into the slope; its banks run out over 10 m.
export function hillHeight(x: number, z: number): number {
  const h = landNoRoad(x, z), r = nearRoad(x, z);
  if (r.d > REACH) return h;
  const w = 1 - sstep(ROAD_W / 2 + 0.8, REACH - 1, r.d);
  return h + (r.y - h) * w;
}

// The summit's top: the complex's origin.
export const SITE = new Vector3(0, TOP, 0);

/* ---------- the ground's colours ---------- */
// Linear colours under starlight.
// Forest floor and meadow, rock, snow, the platform's concrete, the road's banks.
const MEADOW = new Color(0.05, 0.058, 0.042), ROCK = new Color(0.1, 0.098, 0.096);
const SCREE = new Color(0.085, 0.08, 0.072), SNOW = new Color(0.2, 0.215, 0.25), GRAVEL = new Color(0.13, 0.13, 0.128);
const BANK = new Color(0.12, 0.11, 0.095);
// Rock shows above this height; meadow and forest below.
export const TREELINE = TOP - 35;

// Grid lines from lo to hi.
// They are dense at 0 and sparse at the ends.
// n0 and n1 are the steps on each side of 0.
function axis(lo: number, hi: number, n0: number, n1: number): number[] {
  // Spacing at 0 is a third of the mean spacing.
  const warp = (u: number) => 0.35 * u + 0.65 * u * u * u;
  const out: number[] = [];
  for (let i = n0; i > 0; i--) out.push(lo * warp(i / n0));
  for (let i = 0; i <= n1; i++) out.push(hi * warp(i / n1));
  return out;
}

// One mesh holds all the land in view.
// Steps are about 4 m at the summit.
// They grow to about 35 m at the edges.
// The mesh reaches the second ridge behind the peak.
function landMesh(): BufferGeometry {
  const xs = axis(-1600, 1600, 140, 140), zs = axis(-700, 2900, 70, 200);
  const p: number[] = [], idx: number[] = [];
  for (const z of zs) for (const x of xs) p.push(x, hillHeight(x, z), z);
  const row = xs.length;
  for (let j = 0; j < zs.length - 1; j++) {
    for (let i = 0; i < row - 1; i++) {
      const a = j * row + i, b = a + 1, c = a + row, d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(p, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  // Each vertex takes a colour from its slope, height and facing.
  const n = g.getAttribute('normal'), col: number[] = [], c = new Color();
  for (let i = 0; i < n.count; i++) {
    const x = p[3 * i], y = p[3 * i + 1], z = p[3 * i + 2], ny = n.getY(i), nz = n.getZ(i);
    const ragged = (vnoise(x / 18, z / 18, 7) - 0.5) * 24;
    // Steep ground and ground over the treeline is rock.
    const rock = Math.max(sstep(0.8, 0.62, ny), sstep(TREELINE - 6, TREELINE + 10, y + ragged));
    c.copy(MEADOW).lerp(SCREE, sstep(0.88, 0.72, ny) * 0.6).lerp(ROCK, rock);
    // Snow lies in the north gullies high on the peak.
    // The gullies run downhill, so the noise stretches up and down the slope.
    const gully = vnoise(x / 6, (y + z * 0.2) / 26, 9);
    // The summit round the complex stays clear of snow.
    const snow = sstep(70, 120, Math.hypot(x, z)) * sstep(TREELINE + 12, TOP - 8, y) * sstep(-0.2, -0.55, nz) * sstep(0.62, 0.74, gully) * sstep(0.35, 0.6, ny);
    c.lerp(SNOW, snow * 0.7);
    // The road's cut banks show bare earth, so the switchbacks read from afar.
    const bank = 1 - sstep(ROAD_W / 2, REACH, nearRoad(x, z).d);
    c.lerp(BANK, bank * 0.75);
    // The pads are poured concrete.
    c.lerp(GRAVEL, onPad(x, z));
    col.push(c.r, c.g, c.b);
  }
  g.setAttribute('color', new Float32BufferAttribute(col, 3));
  return g;
}
const ground = new MeshLambertMaterial({ vertexColors: true });
export const hill = new Mesh(landMesh(), ground);
scene.add(hill);

// Flat land past the mesh hides the stars below the horizon.
const flat = new Mesh(new PlaneGeometry(9000, 9000).rotateX(-Math.PI / 2), new MeshLambertMaterial({ color: MEADOW }));
flat.position.y = -0.5;
scene.add(flat);
onLeave(() => { disposeTree(hill); disposeTree(flat); });

// Starlight: a cold, dim sky over a black ground.
// The dusk raises it.
// At night it holds HEMI_I.
export const HEMI_I = 1.3;
export const hemi = new HemisphereLight(new Color(0.5, 0.55, 0.68), new Color(0.02, 0.02, 0.025), HEMI_I);
scene.add(hemi);
// A faint key from high in the north gives the shapes form.
const key = new DirectionalLight(new Color(0.62, 0.7, 0.92), 0.35);
key.position.set(-60, 120, -90);
scene.add(key);
