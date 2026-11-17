// Load order: post/chain runs first.
import '../post/chain.ts';
import { BufferGeometry, Color, DirectionalLight, Float32BufferAttribute, HemisphereLight, Mesh, MeshLambertMaterial, PlaneGeometry, Vector3 } from 'three';
import { disposeTree, onLeave, scene } from '../setup.ts';

/* ---------- the land: the observatory hill, the camera's rise, far ridges ---------- */
// Scene axes: +Y is up, -Z is north, +X is east.
// Azimuth runs from north through east, as in core/sky.ts.

// The complex stands in a flat clearing on the hilltop at the origin.
export const CLEAR = 46;
// The camera's rise lies north of the hill, across a wooded valley.
export const RISE = { x: 0, z: -300 };
// The wide eye stands this high over the rise.
export const EYE_H = 27;

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

// Dark grass and earth under starlight.
const ground = new MeshLambertMaterial({ color: new Color(0.06, 0.066, 0.05) });

// Grid lines from lo to hi, dense at 0 and sparse at the ends.
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
// Steps are about 4 m at the complex and grow to 30 m at the edges.
function landMesh(): BufferGeometry {
  const xs = axis(-1000, 1000, 80, 80), zs = axis(-700, 1900, 50, 150);
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
  return g;
}
export const hill = new Mesh(landMesh(), ground);
scene.add(hill);

// Flat land past the mesh hides the stars below the horizon.
const flat = new Mesh(new PlaneGeometry(9000, 9000).rotateX(-Math.PI / 2), ground);
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
