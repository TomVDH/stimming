// Load order: world/complex runs first.
import './complex.ts';
import { Color, ConeGeometry, InstancedMesh, MeshLambertMaterial, Object3D } from 'three';
import { scene } from '../setup.ts';
import { CLEAR, RISE, TOP, hillHeight } from './hill.ts';
import { roadDist } from './complex.ts';

/* ---------- the woods: dark conifers over the hill, in one draw call ---------- */
// Trees stand on a jittered 7 m grid in the land the camera sees.
const STEP = 7;
const AREA = { x0: -760, x1: 760, z0: -330, z1: 760 };
// No trees within this distance of the camera's foot, the clearing or the road.
const EYE_GAP = 75, CLEAR_GAP = 6, ROAD_GAP = 6;
// The hilltop is bare above this height, so the treetops stay under the complex.
const TREELINE = TOP - 17;

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
      spots.push([tx, tz, rand()]);
    }
  }
  // A unit cone with its foot at the origin.
  const geo = new ConeGeometry(1, 1, 7, 1).translate(0, 0.5, 0);
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
    trees.setColorAt(i, c.setScalar(0.025 + 0.02 * r));
  });
  return trees;
}

export const woods = buildWoods();
scene.add(woods);
