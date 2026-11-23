// Load order: world/lamp runs first.
import './lamp.ts';
import { BoxGeometry, Color, CylinderGeometry, Group, Mesh, MeshBasicMaterial, MeshLambertMaterial, PointLight, SphereGeometry, Vector3 } from 'three';
import { disposeTree, onLeave, scene } from '../setup.ts';
import { hillHeight } from './hill.ts';
import { ROAD, complex, type Complex } from './complex.ts';
import { BIG_DOOR_K, BIG_WALL_R } from './observatory.ts';

/* ---------- the complex lights: window panes, door lamps, road lamps ---------- */
// Each lamp has its own material.
// Then each lamp can come on alone.
// A level from 0 to 1 sets its colour.
// The lamps are small unlit meshes.
// Only the door lamps cast light.
// No light casts a shadow.

// Linear colours.
// Values over 2 cross the bloom threshold.
const PANE_OFF = new Color(0.012, 0.012, 0.013), PANE_ON = new Color(0.95, 1.1, 1.35);
const LAMP_OFF = new Color(0.02, 0.02, 0.02), LAMP_ON = new Color(4.4, 4.8, 5.6);
// The door lamp's light on the drum and the ground, in candela.
const DOOR_CD = 2.5;
// The door glow at full light.
const DOOR_GLOW_K = 0.9;

// Indices into ROAD, whose points stand 2.3 m apart.
// The lamps stand about 16 m apart.
const ROAD_LAMPS = [3, 10, 17, 24, 31, 38];
// A road lamp stands this far from the road's centre line.
const ROAD_SIDE = 3.6;
const POST_H = 4;

// One lamp: a level from 0 to 1 sets it.
type Lamp = (k: number) => void;
// lamp(i, n) gives lamp i of n its own level at dusk.
export type Lights = { count: number; set(level: number, lamp?: (i: number, n: number) => number): void };

export function buildLights(c: Complex): Lights {
  const domes = [c.main, ...c.small];
  const glow = (m: MeshBasicMaterial, i: number): Lamp => (k) => { m.color.copy(off[i]).lerp(on[i], k); };
  const off = [PANE_OFF, LAMP_OFF];
  const on = [PANE_ON, LAMP_ON];

  // A lamp over each dome door, in the dome's own scale.
  // The classic drum radius is 3.2; its door arch tops out at 2.1.
  // The big dome's door is smaller, on its base.
  const bulb = new SphereGeometry(0.16, 10, 6);
  const bulbs: Mesh[] = [];
  const doors: Lamp[] = domes.map((d) => {
    const mat = new MeshBasicMaterial({ color: LAMP_ON });
    const m = new Mesh(bulb, mat);
    bulbs.push(m);
    const k = d.big ? BIG_DOOR_K : 1, z = d.big ? -BIG_WALL_R - 0.03 : -3.28;
    m.position.set(0, 2.5 * k, z);
    m.scale.setScalar(k);
    // The lamp's light reaches about 12 m at size 1.
    const pl = new PointLight(LAMP_ON.clone().multiplyScalar(1 / 6), DOOR_CD, 12 * d.root.scale.x * k, 2);
    pl.position.set(0, 2.6 * k, z - 0.62 * k);
    d.root.add(m, pl);
    const bulbLamp = glow(mat, 1);
    return (k) => { bulbLamp(k); d.door.emissiveIntensity = DOOR_GLOW_K * k; pl.intensity = DOOR_CD * k; };
  });

  // Lamp posts along the road near the complex, in world space.
  const road = new Group();
  const post = new CylinderGeometry(0.08, 0.1, POST_H, 6).translate(0, POST_H / 2, 0);
  const head = new BoxGeometry(0.5, 0.22, 0.5);
  const postMat = new MeshLambertMaterial({ color: 0x505050 });
  const side = new Vector3();
  const roadLamps: Lamp[] = ROAD_LAMPS.map((i) => {
    const a = ROAD[i - 1], b = ROAD[i + 1], p = ROAD[i];
    side.set(-(b.z - a.z), 0, b.x - a.x).normalize().multiplyScalar(ROAD_SIDE);
    const x = p.x + side.x, z = p.z + side.z, y = hillHeight(x, z);
    const pm = new Mesh(post, postMat);
    pm.position.set(x, y, z);
    const mat = new MeshBasicMaterial({ color: LAMP_ON });
    const hm = new Mesh(head, mat);
    hm.position.set(x, y + POST_H + 0.11, z);
    road.add(pm, hm);
    return glow(mat, 1);
  });
  scene.add(road);
  onLeave(() => { disposeTree(road); for (const m of bulbs) disposeTree(m); });

  const panes = c.windows.map(m => glow(m, 0));
  // The order they come on at dusk.
  // People light the hall and the domes first.
  // Then the road lamps come on from the top down.
  const lamps: Lamp[] = [panes[1], doors[0], panes[0], doors[1], panes[2], doors[2], ...roadLamps];
  return {
    count: lamps.length,
    set(level, lamp) {
      const k = Math.min(1, Math.max(0, level));
      lamps.forEach((l, i) => l(lamp ? k * lamp(i, lamps.length) : k));
    },
  };
}

export const lights = buildLights(complex);
