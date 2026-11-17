// Load order: world/complex runs first.
import './complex.ts';
import { Color, ConeGeometry, InstancedMesh, MeshLambertMaterial, Object3D } from 'three';
import { scene } from '../setup.ts';
import { CLEAR, EYE_H, RISE, TOP, hillHeight } from './hill.ts';
import { roadDist } from './complex.ts';

/* ---------- the woods: dark conifers over the hill, in one draw call ---------- */
// Trees stand on a jittered 7 m grid in the land the camera sees.
const STEP = 7;
const AREA = { x0: -760, x1: 760, z0: -330, z1: 760 };
// No trees within this distance of the camera's foot, the clearing or the road.
const EYE_GAP = 75, CLEAR_GAP = 6, ROAD_GAP = 6;
// The hilltop is bare above this height, so the treetops stay under the complex.
const TREELINE = TOP - 17;

// Every tree this near the complex stays: the close cuts look out over them.
const NEAR_KEEP = 250;
// The view's half-width in degrees either side of south, with a margin.
const HALF_VIEW = 60;
// The trim tests from 10 m over the eye, so a taller Dev eye still sees woods.
const TEST_EYE_H = EYE_H + 10;
// The canopy hides what is behind it from this height over the ground.
const CANOPY = 6;
// The test stops this far short of the tree, so its own neighbours do not hide it.
const SELF_GAP = 15;

// True when the eye can see a tree top over the land and the canopy.
// The camera faces south (+Z) from the rise.
function seen(x: number, z: number, top: number): boolean {
  if (Math.hypot(x, z) < NEAR_KEEP) return true;
  const ex = RISE.x, ez = RISE.z, ey = hillHeight(ex, ez) + TEST_EYE_H;
  const dx = x - ex, dz = z - ez, d = Math.hypot(dx, dz);
  if (Math.abs(Math.atan2(dx, dz)) * 180 / Math.PI > HALF_VIEW) return false;
  // March the sight line every 8 m; the clearing has no canopy.
  for (let s = EYE_GAP; s < d - SELF_GAP; s += 8) {
    const k = s / d, px = ex + dx * k, pz = ez + dz * k;
    const roof = hillHeight(px, pz) + (Math.hypot(px, pz) < CLEAR + CLEAR_GAP ? 0 : CANOPY);
    if (ey + (top - ey) * k < roof) return false;
  }
  return true;
}

// A seeded generator, so the woods stand the same on every load.
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function buildWoods(): InstancedMesh {
  const rand = rng(51);
  const spots: [number, number, number][] = [];
  for (let z = AREA.z0; z < AREA.z1; z += STEP) {
    for (let x = AREA.x0; x < AREA.x1; x += STEP) {
      const tx = x + (rand() - 0.5) * STEP * 0.9, tz = z + (rand() - 0.5) * STEP * 0.9;
      // The clearing's edge is ragged.
      if (Math.hypot(tx, tz) < CLEAR + CLEAR_GAP + rand() * 8) continue;
      if (Math.hypot(tx - RISE.x, tz - RISE.z) < EYE_GAP) continue;
      if (Math.hypot(tx, tz) < 200 && hillHeight(tx, tz) > TREELINE - rand() * 4) continue;
      if (roadDist(tx, tz) < ROAD_GAP + rand() * 2) continue;
      const r = rand();
      // Trees the camera never sees are left out.
      if (!seen(tx, tz, hillHeight(tx, tz) + 13 + 8 * r)) continue;
      spots.push([tx, tz, r]);
    }
  }
  // A unit cone with its foot at the origin; the base is never seen.
  const geo = new ConeGeometry(1, 1, 7, 1, true).translate(0, 0.5, 0);
  const trees = new InstancedMesh(geo, new MeshLambertMaterial({ color: 0xffffff }), spots.length);
  const o = new Object3D(), c = new Color();
  spots.forEach(([x, z, r], i) => {
    const h = 12 + 8 * r;
    // The crown starts 1 m up; a trunk does not show at this range.
    o.position.set(x, hillHeight(x, z) + 1, z);
    o.scale.set(h * 0.36, h, h * 0.36);
    o.rotation.y = r * 6.28;
    o.updateMatrix();
    trees.setMatrixAt(i, o.matrix);
    // Dark spruce green, each tree a little different.
    trees.setColorAt(i, c.setRGB(0.03 + 0.015 * r, 0.05 + 0.02 * r, 0.038 + 0.012 * r));
  });
  return trees;
}

export const woods = buildWoods();
scene.add(woods);
