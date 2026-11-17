// Load order: setup runs first.
import '../setup.ts';
import { AmbientLight, BufferAttribute, DirectionalLight, Mesh, MeshLambertMaterial, PlaneGeometry, Vector3 } from 'three';
import { scene } from '../setup.ts';

/* ---------- the hill: a long ridge that runs east to west ---------- */
// Scene axes: +Y is up, -Z is north, +X is east.
// Azimuth runs from north through east, as in core/sky.ts.

const RIDGE = 14;
// The dome stands on a flat pad at the origin.
const PAD = 3.6;

function ridge(x: number, z: number): number {
  // The ridge runs long to the east and drops sooner to the west.
  const along = Math.exp(-((x / (x > 0 ? 220 : 110)) ** 2));
  // A peaked crest: the ground falls away close to the drum.
  const across = 1 / (1 + (z / 30) ** 2);
  // A slow swell keeps the crest from a clean bell.
  const swell = 1.2 * Math.sin(x * 0.021 + 1) * Math.exp(-((z / 80) ** 2)) * along;
  return RIDGE * along * across + swell;
}
const TOP = ridge(0, 0);

// Ground height in metres at a point.
export function hillHeight(x: number, z: number): number {
  const r = Math.hypot(x, z);
  const k = Math.min(1, Math.max(0, (r - PAD) / PAD));
  const s = k * k * (3 - 2 * k);
  return TOP + (ridge(x, z) - TOP) * s;
}

// The dome's foot on the pad.
export const SITE = new Vector3(0, TOP, 0);

const grey = new MeshLambertMaterial({ color: 0x4a4b4e });

const geo = new PlaneGeometry(1200, 600, 300, 150);
geo.rotateX(-Math.PI / 2);
const pos = geo.attributes.position as BufferAttribute;
for (let i = 0; i < pos.count; i++) pos.setY(i, hillHeight(pos.getX(i), pos.getZ(i)));
geo.computeVertexNormals();
export const hill = new Mesh(geo, grey);
scene.add(hill);

// Flat land past the ridge hides the stars below the horizon.
const flat = new Mesh(new PlaneGeometry(9000, 9000).rotateX(-Math.PI / 2), grey);
flat.position.y = -0.5;
scene.add(flat);

// One dim key light and a weak fill.
const key = new DirectionalLight(0xffffff, 1.4);
key.position.set(-60, 80, -90);
scene.add(key, new AmbientLight(0xffffff, 0.35));
