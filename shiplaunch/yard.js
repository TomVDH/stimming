// Ship launch yard: the hull, the ways, the quays, the pier, the shed, the crane and the far land.
// Metres. x runs along the basin, z across it, y up; still water is y = 0.
// Shapes follow the Westerbroek and Hoogezand side-launch photos on Wikimedia Commons.
import * as THREE from 'three';

/* ---------- the site ---------- */
// The port basin: 200 m wide, 6 m deep. The yard is on its south side.
// The basin is closed at xWest and opens east to the outer harbour.
export const CANAL = { zYard: -27.5, zQuay: 172.5, depth: 6, quayTop: 1.0, xWest: -230 };
// A stone pier runs out from the north quay; the crowd stands on its head.
export const PIER = { x0: -16, x1: -4, z0: 42, top: 1.0 };
// The ways: 1 in 10 across the berth, eight of them under the hull.
export const WAYS = { slope: 0.1, xs: [-35, -25, -15, -5, 5, 15, 25, 35], back: -60 };
// The hull: an 88 m short-sea coaster.
export const HULL = { L: 88, B: 13.5, D: 7, bilge: 1.6, boot: 3.1 };
// The hull's centre starts 12 m inland of the tipping edge.
export const START_Z = CANAL.zYard - 12;

/** Top of the ways at z, for a tipping edge `drop` metres over the water. */
export const wayTop = (z, drop) => drop + Math.max(0, CANAL.zYard - z) * WAYS.slope;

/* ---------- the hull lines ---------- */
// Half breadth at station x (bow at -44) and height y over the keel.
// The midbody is a box with a bilge radius; the bow and stern taper.
const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
function halfBreadth(x, y) {
  const { L, B, bilge } = HULL;
  const hb = B / 2;
  const u = x / (L / 2);
  // Bow: a fine entry that fills out with height (flare); stern: a cruiser stern.
  const bowK = sstep(-1.0, -0.55, u);
  const flare = 0.25 + 0.75 * sstep(0, 6.5, y);
  const fwd = u < -0.55 ? Math.max(0.02, bowK * (0.3 + 0.7 * flare) + (1 - bowK) * 0.02 * flare) : 1;
  const aftK = 1 - sstep(0.62, 1.0, u);
  const aft = u > 0.62 ? Math.max(0.05, aftK * (0.15 + 0.85 * sstep(0, 4.5, y)) + 0.45 * sstep(2.5, 6, y) * (1 - aftK)) : 1;
  // The bilge rounds the bottom corner.
  const r = Math.min(bilge, hb);
  const bil = y < r ? hb - r + Math.sqrt(Math.max(0, r * r - (r - y) * (r - y))) : hb;
  return bil * Math.min(fwd, aft);
}
// The keel rises at the bow forefoot and under the stern.
function keelY(x) {
  const u = x / (HULL.L / 2);
  return 2.6 * sstep(-0.82, -1.0, u) + 3.4 * sstep(0.7, 1.0, u);
}
// The sheer: the deck edge climbs toward the bow.
const deckY = x => HULL.D + 1.6 * sstep(-0.3, -1.0, x / (HULL.L / 2));

/**
 * The hull shell as one mesh, keel at y = 0, centre of the length at x = 0.
 * aSide is +1 on the outboard side (+z) and -1 inboard.
 */
export function hullGeometry() {
  const NX = 96, NY = 22;
  const pos = [], idx = [];
  const ring = 2 * NY + 1;
  for (let i = 0; i <= NX; i++) {
    const x = -HULL.L / 2 + (HULL.L * i) / NX;
    const k = keelY(x), top = deckY(x);
    // One ring: inboard deck edge down to the keel and up to the outboard deck edge.
    for (let j = 0; j <= 2 * NY; j++) {
      const s = j / NY - 1;
      const y = k + (top - k) * Math.abs(s) ** 1.35;
      const hb = halfBreadth(x, y - k);
      pos.push(x, y, Math.sign(s) * hb);
    }
  }
  for (let i = 0; i < NX; i++) for (let j = 0; j < 2 * NY; j++) {
    const a = i * ring + j, b = a + ring;
    idx.push(a, b, a + 1, b, b + 1, a + 1);
  }
  // The transom closes the stern.
  const base = pos.length / 3, last = NX * ring;
  let cx = 0, cy = 0, cz = 0;
  for (let j = 0; j < ring; j++) { cx += pos[(last + j) * 3]; cy += pos[(last + j) * 3 + 1]; cz += pos[(last + j) * 3 + 2]; }
  pos.push(cx / ring, cy / ring, cz / ring);
  for (let j = 0; j < ring - 1; j++) idx.push(base, last + j, last + j + 1);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** The deck, the hatch coaming, the forecastle, the house, the mast and the funnel. */
export function topsides(mats) {
  const grp = new THREE.Group();
  const box = (w, h, d, x, y, z, m) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    b.position.set(x, y, z); b.castShadow = b.receiveShadow = true; grp.add(b); return b;
  };
  const { D } = HULL;
  // The deck plate: a flat lid inside the sheer line.
  box(80, 0.3, 12.6, 2, D - 0.1, 0, mats.deck);
  box(52, 1.5, 10.6, -2, D + 0.75, 0, mats.coaming);
  // The forecastle deck rises with the sheer.
  box(9, 2.2, 9.5, -38.5, D + 1.4, 0, mats.green);
  // The house aft: four tiers and the bridge with its wings.
  box(12, 2.7, 12.2, 33, D + 1.35, 0, mats.white);
  box(10.5, 2.6, 11, 33.6, D + 4.0, 0, mats.white);
  box(9, 2.6, 9.6, 34, D + 6.6, 0, mats.white);
  box(7.4, 2.5, 15.2, 33.4, D + 9.15, 0, mats.white);
  box(7.6, 0.25, 15.4, 33.4, D + 10.5, 0, mats.dark);
  // Bridge windows: one dark band round the front.
  box(0.2, 1.1, 13, 29.6, D + 9.5, 0, mats.glass);
  box(2.2, 4.2, 2.2, 37.6, D + 12.4, 0, mats.green);
  // Masts: one on the forecastle, one on the bridge top.
  box(0.45, 11, 0.45, -37, D + 2.5 + 5.5, 0, mats.white);
  box(0.3, 6, 0.3, 33.5, D + 10.6 + 3, 0, mats.white);
  return grp;
}

/** Bunting: bow to the fore mast, the fore mast to the bridge mast, down to the stern. */
export function buntingLine() {
  const D = HULL.D;
  return [
    [-44, D + 2.6, 0], [-37, D + 13.4, 0], [33.5, D + 16.4, 0], [44, D + 1.4, 0],
  ];
}

/* ---------- the land ---------- */
export function yard(mats, drop) {
  const grp = new THREE.Group();
  const add = (geo, m, x, y, z, shadow = true) => {
    const o = new THREE.Mesh(geo, m); o.position.set(x, y, z);
    o.castShadow = shadow; o.receiveShadow = true; grp.add(o); return o;
  };
  const { zYard, zQuay, depth, quayTop } = CANAL;
  // The berth: a concrete slab under the ways, sloping up 1 in 10 inland.
  const run = zYard - WAYS.back;
  const berth = new THREE.BoxGeometry(130, 0.6, run / Math.cos(Math.atan(WAYS.slope)));
  const slab = add(berth, mats.concrete, 0, 0, 0, false);
  slab.rotation.x = -Math.atan(WAYS.slope);
  slab.position.set(0, drop - 0.85 + (run * WAYS.slope) / 2, zYard - run / 2);
  // The quay wall under the tipping edge, down to the bed.
  add(new THREE.BoxGeometry(400, depth + drop, 1.2), mats.wall, 0, (drop - 0.55 - depth) / 2, zYard - 0.6, false);
  // The ways themselves: steel beams on the slab.
  const ways = [];
  for (const x of WAYS.xs) {
    const w = add(new THREE.BoxGeometry(0.7, 0.5, run + 1), mats.steel, x, 0, 0);
    w.rotation.x = -Math.atan(WAYS.slope);
    w.position.set(x, drop - 0.25 + (run * WAYS.slope) / 2, zYard - run / 2 + 0.5);
    ways.push(w);
  }
  // The yard behind the berth: flat ground with the shed and the crane.
  const backY = wayTop(WAYS.back, drop) - 0.55;
  add(new THREE.BoxGeometry(3000, 2, 400), mats.ground, 0, backY - 1, WAYS.back - 200, false);
  // The banks along the basin beside the berth.
  add(new THREE.BoxGeometry(400, 3, 40), mats.grass, -265, 0.2, zYard - 20, false);
  add(new THREE.BoxGeometry(1400, 3, 40), mats.grass, 765, 0.2, zYard - 20, false);
  // The shed: a long hall with a gable roof.
  add(new THREE.BoxGeometry(90, 20, 40), mats.shed, -20, backY + 10, -105);
  const roof = add(new THREE.CylinderGeometry(0.01, 25, 6, 4, 1, false, Math.PI / 4), mats.roof, -20, backY + 23, -105);
  roof.scale.set(1.3, 1, 0.57); roof.rotation.y = Math.PI / 4;
  roof.scale.set(90 / 35.4, 1, 40 / 35.4);
  // The hammerhead crane: a lattice tower stands for a box here.
  add(new THREE.BoxGeometry(3, 38, 3), mats.steel, 48, backY + 19, -66);
  add(new THREE.BoxGeometry(56, 2.2, 2.2), mats.steel, 38, backY + 39, -66);
  add(new THREE.BoxGeometry(6, 3, 3), mats.steel, 63, backY + 39.5, -66);
  // The north quay: paving on a wall, far across the basin.
  const xW = CANAL.xWest, east = 3000;
  add(new THREE.BoxGeometry(east - xW, depth + quayTop, 1.2), mats.wall, (east + xW) / 2, (quayTop - depth) / 2, zQuay + 0.6, false);
  add(new THREE.BoxGeometry(east + 400, 1, 200), mats.paving, (east - 400) / 2, quayTop - 0.5, zQuay + 100, false);
  // The west end of the basin: a wall and paving behind it.
  add(new THREE.BoxGeometry(1.2, depth + quayTop, zQuay - zYard), mats.wall, xW - 0.6, (quayTop - depth) / 2, (zQuay + zYard) / 2, false);
  add(new THREE.BoxGeometry(200, 1, zQuay - zYard), mats.paving, xW - 100, quayTop - 0.5, (zQuay + zYard) / 2, false);
  // The pier: a stone mole from the north quay, its head toward the berth.
  const P = PIER, pl = zQuay - P.z0;
  add(new THREE.BoxGeometry(P.x1 - P.x0, depth + P.top, pl), mats.wall, (P.x0 + P.x1) / 2, (P.top - depth) / 2, P.z0 + pl / 2, false);
  add(new THREE.BoxGeometry(P.x1 - P.x0 - 0.4, 0.3, pl - 0.4), mats.paving, (P.x0 + P.x1) / 2, P.top - 0.1, P.z0 + pl / 2, false);
  // Bollards along the pier's edges.
  const bol = new THREE.CylinderGeometry(0.22, 0.28, 0.7, 8);
  for (let z = P.z0 + 1; z < zQuay; z += 9) for (const x of [P.x0 + 0.6, P.x1 - 0.6]) add(bol, mats.steel, x, P.top + 0.35, z, true);
  // The basin bed.
  add(new THREE.BoxGeometry(east - xW, 1, zQuay - zYard + 4), mats.bed, (east + xW) / 2, -depth - 0.5, (zQuay + zYard) / 2, false);
  return { grp, ways, backY };
}

/** Far land: rows of trees and a few farms on the flat horizon. */
export function farLand(mats) {
  const grp = new THREE.Group();
  const crown = new THREE.IcosahedronGeometry(1, 1);
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const trees = new THREE.InstancedMesh(crown, mats.tree, 140);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
  let n = 0;
  // A row of trees along the far road on each side of the yard, and poplars far off.
  for (let i = 0; i < 140; i++) {
    const far = i >= 70;
    const x = far ? -600 + rnd() * 1200 : (rnd() < 0.5 ? -1 : 1) * (95 + rnd() * 260);
    const z = far ? -260 - rnd() * 240 : -45 - rnd() * 30;
    const h = far ? 10 + rnd() * 10 : 8 + rnd() * 7;
    const w = far ? h * (rnd() < 0.5 ? 0.28 : 0.55) : h * 0.6;
    p.set(x, 2 + h * 0.75, z); s.set(w, h * 0.55, w);
    m.compose(p, q, s); trees.setMatrixAt(n++, m);
  }
  trees.count = n;
  grp.add(trees);
  return grp;
}
