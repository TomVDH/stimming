// Load order: world/lamp runs first.
import './lamp.ts';
import { BoxGeometry, Color, CylinderGeometry, Group, Mesh, MeshBasicMaterial, MeshLambertMaterial, SphereGeometry, Vector3 } from 'three';
import { scene } from '../setup.ts';
import { hillHeight } from './hill.ts';
import { ROAD, complex, type Complex } from './complex.ts';

/* ---------- the complex lights: window panes, door lamps, road lamps ---------- */
// Each group has one material; a level from 0 to 1 sets its colour.
// The lamps are small unlit meshes; no lamp casts light or shadow.

const PANE_OFF = 0x2a2a2a, PANE_ON = 0xd2d2d2;
const LAMP_OFF = 0x303030, LAMP_ON = 0xe6e6e6;

// Indices into ROAD, whose points stand 2.3 m apart.
// The lamps stand about 16 m apart.
const ROAD_LAMPS = [3, 10, 17, 24, 31, 38];
// A road lamp stands this far to the side of the centre line.
const ROAD_SIDE = 3.6;
const POST_H = 4;

export type Lights = { set(level: number): void };

export function buildLights(c: Complex): Lights {
  const doorMat = new MeshBasicMaterial({ color: LAMP_ON });
  const roadMat = new MeshBasicMaterial({ color: LAMP_ON });

  // A lamp over each dome door, in the dome's own scale.
  // The drum radius is 3.2; the door arch tops out at 2.1.
  const bulb = new SphereGeometry(0.16, 10, 6);
  for (const d of [c.main, ...c.small]) {
    const m = new Mesh(bulb, doorMat);
    m.position.set(0, 2.5, -3.28);
    d.root.add(m);
  }

  // Lamp posts along the road near the complex, in world space.
  const road = new Group();
  const post = new CylinderGeometry(0.08, 0.1, POST_H, 6).translate(0, POST_H / 2, 0);
  const head = new BoxGeometry(0.5, 0.22, 0.5);
  const postMat = new MeshLambertMaterial({ color: 0x505050 });
  const side = new Vector3();
  for (const i of ROAD_LAMPS) {
    const a = ROAD[i - 1], b = ROAD[i + 1], p = ROAD[i];
    side.set(-(b.z - a.z), 0, b.x - a.x).normalize().multiplyScalar(ROAD_SIDE);
    const x = p.x + side.x, z = p.z + side.z, y = hillHeight(x, z);
    const pm = new Mesh(post, postMat);
    pm.position.set(x, y, z);
    const hm = new Mesh(head, roadMat);
    hm.position.set(x, y + POST_H + 0.11, z);
    road.add(pm, hm);
  }
  scene.add(road);

  const off = [new Color(PANE_OFF), new Color(LAMP_OFF)];
  const on = [new Color(PANE_ON), new Color(LAMP_ON)];
  const groups: [MeshBasicMaterial, number][] = [[c.windows, 0], [doorMat, 1], [roadMat, 1]];
  return {
    set(level) {
      const k = Math.min(1, Math.max(0, level));
      for (const [m, i] of groups) m.color.copy(off[i]).lerp(on[i], k);
    },
  };
}

export const lights = buildLights(complex);
