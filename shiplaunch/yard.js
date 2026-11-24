// Ship launch yard: the hull, the ways, the quays, the pier, the shed, the crane and the far land.
// Metres. x runs along the basin, z across it, y up; still water is y = 0.
// Shapes follow the Westerbroek and Hoogezand side-launch photos on Wikimedia Commons.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

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

/**
 * The deck, the bulwark, the forecastle, the hold and its covers, the house, the funnel, the masts.
 * Shapes follow the Westerbroek coaster photo; one merged mesh per material.
 */
export function topsides(mats) {
  const grp = new THREE.Group();
  const parts = new Map();
  const put = (g, m) => { if (!parts.has(m)) parts.set(m, []); parts.get(m).push(g.toNonIndexed()); };
  const box = (w, h, d, x, y, z, m) => put(new THREE.BoxGeometry(w, h, d).translate(x, y, z), m);
  const cyl = (r0, r1, h, x, y, z, m, seg = 10) => put(new THREE.CylinderGeometry(r0, r1, h, seg).translate(x, y, z), m);
  const { D } = HULL;
  const hbAt = x => halfBreadth(x, deckY(x) - keelY(x));
  // The main deck, and the forecastle deck that rides the sheer forward.
  box(78, 0.3, 12.6, 3, D - 0.1, 0, mats.deck);
  for (let x = -43; x < -32; x += 1.5) box(1.6, 0.3, Math.max(0.4, 2 * hbAt(x) - 0.3), x + 0.75, deckY(x + 0.75) - 0.15, 0, mats.deck);
  // The bulwark along both deck edges, taller round the bow.
  for (let x = -43; x < 40; x += 2) {
    const xc = x + 1, h = xc < -30 ? 1.5 : 1.0, hb = hbAt(xc);
    for (const sd of [-1, 1]) box(2.04, h, 0.14, xc, deckY(xc) + h / 2, sd * (hb - 0.07), mats.green);
  }
  // The breakwater behind the forecastle, and the windlass on it.
  box(0.3, 1.7, 10.4, -32.5, deckY(-32.5) + 0.85, 0, mats.green);
  for (const sd of [-1, 1]) {
    cyl(0.55, 0.55, 1.2, -39, deckY(-39) + 0.75, sd * 1.6, mats.dark, 12);
    // The anchor in its pocket on the bow.
    box(1.5, 1.1, 0.25, -40.5, deckY(-40.5) - 1.6, sd * (hbAt(-40.5) + 0.08), mats.dark);
  }
  // The hold: the coaming and seven pontoon covers with their ribs.
  box(52, 1.5, 10.6, -2, D + 0.75, 0, mats.coaming);
  for (let i = 0; i < 7; i++) {
    const xc = -24.6 + i * 7.25;
    box(7.0, 0.5, 10.9, xc, D + 1.75, 0, mats.hatch);
    for (const dx of [-2.3, 0, 2.3]) box(0.22, 0.22, 10.9, xc + dx, D + 2.1, 0, mats.hatch);
  }
  // The house aft: four tiers, each with a row of windows.
  const tiers = [[12, 2.7, 12.2, 33, D + 1.35], [10.5, 2.6, 11, 33.6, D + 4.0], [9, 2.6, 9.6, 34, D + 6.6]];
  for (const [w, h, d, x, y] of tiers) {
    box(w, h, d, x, y, 0, mats.white);
    // Windows on the front and both sides.
    const fx = x - w / 2 - 0.03;
    for (let z = -d / 2 + 1.1; z <= d / 2 - 1.0; z += 1.7) box(0.08, 0.75, 0.9, fx, y + 0.25, z, mats.glass);
    for (let xx = x - w / 2 + 1.2; xx <= x + w / 2 - 1.0; xx += 1.8) for (const sd of [-1, 1]) box(0.9, 0.75, 0.08, xx, y + 0.25, sd * (d / 2 + 0.03), mats.glass);
    // A rail round the tier's top.
    for (const sd of [-1, 1]) box(w, 0.07, 0.07, x, y + h / 2 + 1.0, sd * (d / 2 - 0.05), mats.white);
    box(0.07, 0.07, d, x - w / 2 + 0.05, y + h / 2 + 1.0, 0, mats.white);
  }
  // The wheelhouse, its window band all round, the wings and their bulwarks.
  box(7.4, 2.5, 10.2, 33.4, D + 9.15, 0, mats.white);
  box(7.8, 0.3, 10.6, 33.4, D + 10.5, 0, mats.dark);
  box(0.12, 1.15, 9.6, 29.66, D + 9.45, 0, mats.glass);
  for (const sd of [-1, 1]) {
    box(6.6, 1.15, 0.12, 33.6, D + 9.45, sd * 5.16, mats.glass);
    box(2.6, 0.25, 2.8, 31.0, D + 7.95, sd * 6.4, mats.white);
    box(2.6, 1.1, 0.12, 31.0, D + 8.6, sd * 7.75, mats.white);
  }
  // The funnel: a tapered stack with a black top.
  cyl(1.0, 1.25, 4.4, 37.6, D + 12.6, 0, mats.green, 14);
  cyl(1.02, 1.02, 0.8, 37.6, D + 15.2, 0, mats.dark, 14);
  // Masts: a light mast on the forecastle, a radar mast on the wheelhouse.
  cyl(0.16, 0.22, 11, -37, deckY(-37) + 5.5, 0, mats.white, 8);
  box(0.12, 0.12, 2.4, -37, deckY(-37) + 8.5, 0, mats.white);
  cyl(0.14, 0.18, 6.5, 33.5, D + 10.65 + 3.25, 0, mats.white, 8);
  box(0.25, 0.25, 4.6, 33.5, D + 13.4, 0, mats.white);
  box(0.12, 0.3, 3.6, 33.0, D + 14.2, 0, mats.dark);
  box(0.12, 0.3, 2.6, 34.0, D + 11.7, 0, mats.dark);
  // The rescue boat in its davit on the outboard side.
  put(new THREE.CapsuleGeometry(0.85, 3.6, 4, 10).rotateZ(Math.PI / 2).translate(38.4, D + 4.2, 6.6), mats.orange);
  box(0.25, 3.2, 0.25, 36.3, D + 4.6, 6.4, mats.white);
  box(0.25, 3.2, 0.25, 40.5, D + 4.6, 6.4, mats.white);
  for (const [m, list] of parts) {
    const mesh = new THREE.Mesh(mergeGeometries(list), m);
    mesh.castShadow = mesh.receiveShadow = true;
    grp.add(mesh);
  }
  return grp;
}

/** Bunting: bow to the fore mast, the fore mast to the bridge mast, down to the stern. */
export function buntingLine() {
  const D = HULL.D;
  return [
    [-44, D + 3.1, 0], [-37, D + 12.4, 0], [33.5, D + 16.6, 0], [44, D + 1.4, 0],
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
