// Load order: setup runs first.
import '../setup.ts';
import { AmbientLight, DirectionalLight, Mesh, MeshLambertMaterial, PlaneGeometry, Vector3 } from 'three';
import type { BufferAttribute } from 'three';
import { scene } from '../setup.ts';

/* ---------- the land: the observatory hill, the camera's rise, far ridges ---------- */
// Scene axes: +Y is up, -Z is north, +X is east.
// Azimuth runs from north through east, as in core/sky.ts.

// The complex stands in a flat clearing on the hilltop at the origin.
export const CLEAR = 46;
// The camera's rise lies north of the hill, across a wooded valley.
export const RISE = { x: 0, z: -300 };

function land(x: number, z: number): number {
  const r = Math.hypot(x, z);
  const hill = 62 / (1 + (r / 110) ** 2);
  const rise = 32 / (1 + (Math.hypot(x - RISE.x, z - RISE.z) / 90) ** 2);
  // Low ridges far to the south sit under the complex's skyline.
  const far = 42 * Math.exp(-(((z - 1150) / 260) ** 2)) * (0.75 + 0.25 * Math.sin(x * 0.0041 + 0.6));
  const swell = 3 * Math.sin(x * 0.013 + 0.4) * Math.sin(z * 0.011 + 1.1);
  return hill + rise + far + swell;
}
export const TOP = land(0, 0);

// Ground height in metres at a point.
export function hillHeight(x: number, z: number): number {
  const r = Math.hypot(x, z);
  // The clearing is flat; it rounds over into the slope by 80 m.
  const k = Math.min(1, Math.max(0, (r - CLEAR) / 34));
  const s = k * k * (3 - 2 * k);
  return TOP + (land(x, z) - TOP) * s;
}

// The centre of the clearing.
export const SITE = new Vector3(0, TOP, 0);

const grey = new MeshLambertMaterial({ color: 0x4a4b4e });

// One mesh holds all the land in view, at 6 m steps.
const geo = new PlaneGeometry(2000, 2600, 330, 430);
geo.rotateX(-Math.PI / 2);
geo.translate(0, 0, 600);
const pos = geo.attributes.position as BufferAttribute;
for (let i = 0; i < pos.count; i++) pos.setY(i, hillHeight(pos.getX(i), pos.getZ(i)));
geo.computeVertexNormals();
export const hill = new Mesh(geo, grey);
scene.add(hill);

// Flat land past the mesh hides the stars below the horizon.
const flat = new Mesh(new PlaneGeometry(9000, 9000).rotateX(-Math.PI / 2), grey);
flat.position.y = -0.5;
scene.add(flat);

// One dim key light and a weak fill.
const key = new DirectionalLight(0xffffff, 1.4);
key.position.set(-60, 80, -90);
scene.add(key, new AmbientLight(0xffffff, 0.35));
