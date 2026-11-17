// Load order: world/hill runs first.
import './hill.ts';
import { BackSide, BoxGeometry, BufferGeometry, CylinderGeometry, DoubleSide, ExtrudeGeometry, Float32BufferAttribute, FrontSide, Group, MathUtils, Mesh, MeshLambertMaterial, Shape, Vector3 } from 'three';
import type { Object3D, Side } from 'three';
import type { AltAz } from '../core/sky.ts';
import { scene } from '../setup.ts';
import { SITE } from './hill.ts';

/* ---------- the observatory: stone drum, white dome, slit, shutter, tube ---------- */
const DEG = MathUtils.DEG2RAD;
// Sizes in metres.
const DRUM_R = 3.2, DRUM_H = 3.4;
const DOME_R = 3.3;
// The slit is 1.3 m wide.
const SLIT_B = Math.asin(0.65 / DOME_R);
// The slit runs from the front foot to 20 degrees past the zenith.
const SLIT_E = 110 * DEG;
// The shutter has two leaves that part at 45 degrees.
const SPLIT_E = 45 * DEG;
// Open, the upper leaf slides over the back; the lower leaf drops down the drum.
const UP_OPEN = Math.PI - SLIT_E - 3 * DEG;
const LOW_OPEN = -SPLIT_E - 2 * DEG;
// The tube pivots this high over the dome's centre.
const PIVOT_Y = 0.9;
const TUBE_REST_ALT = 45;

// A piece of the dome's sphere in slit coordinates.
// b: angle across the slit, from -90 to 90 degrees.
// e: angle along the slit, from the front foot (0) over the top to the back foot (180).
// The slit looks along local -Z.
function domePatch(r: number, b0: number, b1: number, e0: number, e1: number, nb: number, ne: number): BufferGeometry {
  const p: number[] = [], n: number[] = [], idx: number[] = [];
  for (let j = 0; j <= ne; j++) {
    const e = e0 + (e1 - e0) * (j / ne);
    for (let i = 0; i <= nb; i++) {
      const b = b0 + (b1 - b0) * (i / nb);
      const x = Math.sin(b), y = Math.cos(b) * Math.sin(e), z = -Math.cos(b) * Math.cos(e);
      p.push(r * x, r * y, r * z);
      n.push(x, y, z);
    }
  }
  const row = nb + 1;
  for (let j = 0; j < ne; j++) {
    for (let i = 0; i < nb; i++) {
      const a = j * row + i, b = a + 1, c = a + row, d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(p, 3));
  g.setAttribute('normal', new Float32BufferAttribute(n, 3));
  g.setIndex(idx);
  return g;
}

// Joins patches into one geometry.
function merge(parts: BufferGeometry[]): BufferGeometry {
  const p: number[] = [], n: number[] = [], idx: number[] = [];
  for (const g of parts) {
    const base = p.length / 3;
    p.push(...(g.attributes.position.array as Float32Array));
    n.push(...(g.attributes.normal.array as Float32Array));
    for (const i of g.index!.array) idx.push(i + base);
    g.dispose();
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(p, 3));
  g.setAttribute('normal', new Float32BufferAttribute(n, 3));
  g.setIndex(idx);
  return g;
}

const lam = (color: number, side: Side = FrontSide) => new MeshLambertMaterial({ color, side });

export type Observatory = {
  root: Group;
  cupola: Group;
  shutter: Object3D;
  tube: Group;
  setCupola(az: number): void;
  setShutter(open01: number): void;
  setTube(a: AltAz): void;
  slitTop: Vector3;
};

export function buildObservatory(): Observatory {
  const root = new Group();

  // The stone drum, with a ledge where the dome sits.
  const drum = new Mesh(new CylinderGeometry(DRUM_R, DRUM_R * 1.04, DRUM_H, 48), lam(0x6c6c6c));
  drum.position.y = DRUM_H / 2;
  const ledge = new Mesh(new CylinderGeometry(DRUM_R + 0.18, DRUM_R + 0.18, 0.22, 48), lam(0x5e5e5e));
  ledge.position.y = DRUM_H - 0.11;
  root.add(drum, ledge);

  // The door faces north, to the camera.
  const arch = new Shape();
  arch.moveTo(-0.5, 0);
  arch.lineTo(-0.5, 1.6);
  arch.absarc(0, 1.6, 0.5, Math.PI, 0, true);
  arch.lineTo(0.5, 0);
  const door = new Mesh(new ExtrudeGeometry(arch, { depth: 0.12, bevelEnabled: false, curveSegments: 16 }), lam(0x9a9a9a));
  door.position.set(0, 0, -DRUM_R - 0.02);
  door.rotation.y = Math.PI;
  root.add(door);

  // The cupola turns on the ledge.
  const cupola = new Group();
  cupola.position.y = DRUM_H;
  root.add(cupola);
  const shell = merge([
    domePatch(DOME_R, -Math.PI / 2, -SLIT_B, 0, Math.PI, 24, 48),
    domePatch(DOME_R, SLIT_B, Math.PI / 2, 0, Math.PI, 24, 48),
    domePatch(DOME_R, -SLIT_B, SLIT_B, SLIT_E, Math.PI, 4, 20),
  ]);
  // The inside reads dark through the slit.
  cupola.add(new Mesh(shell, lam(0xbdbdbd)), new Mesh(shell, lam(0x161616, BackSide)));

  // The shutter covers the slit.
  // Each leaf turns about the dome's east-west axis.
  const shutter = new Group();
  const leafMat = lam(0xa4a4a4, DoubleSide);
  const leaf = (e0: number, e1: number) => new Mesh(domePatch(DOME_R + 0.06, -SLIT_B - 0.04, SLIT_B + 0.04, e0, e1, 4, 24), leafMat);
  const upper = leaf(SPLIT_E, SLIT_E), lower = leaf(0, SPLIT_E);
  shutter.add(upper, lower);
  cupola.add(shutter);

  // The pier and the fork stand still; the fork turns in azimuth.
  const pier = new Mesh(new CylinderGeometry(0.45, 0.55, 1.6, 24), lam(0x585858));
  pier.position.y = DRUM_H - 0.8;
  root.add(pier);
  const fork = new Group();
  fork.position.y = DRUM_H;
  root.add(fork);
  const base = new Mesh(new CylinderGeometry(0.7, 0.7, 0.2, 24), lam(0x5a5a5a));
  base.position.y = 0.1;
  fork.add(base);
  for (const s of [-1, 1]) {
    const arm = new Mesh(new BoxGeometry(0.16, PIVOT_Y + 0.2, 0.4), lam(0x5a5a5a));
    arm.position.set(s * 0.62, 0.2 + (PIVOT_Y + 0.2) / 2 - 0.1, 0);
    fork.add(arm);
  }

  // The tube points along local -Z when its altitude is zero.
  const tube = new Group();
  tube.position.y = PIVOT_Y;
  fork.add(tube);
  const body = new Mesh(new CylinderGeometry(0.36, 0.36, 5.0, 24), lam(0x8e8e8e));
  body.rotation.x = -Math.PI / 2;
  body.position.z = -1.7;
  tube.add(body);

  const slitTop = new Vector3();
  const slitLocal = new Vector3(0, DOME_R * Math.sin(SLIT_E), -DOME_R * Math.cos(SLIT_E));

  // Turns the slit to face an azimuth in degrees.
  function setCupola(az: number): void {
    cupola.rotation.y = -az * DEG;
    cupola.updateMatrixWorld(true);
    slitTop.copy(slitLocal).applyMatrix4(cupola.matrixWorld);
  }
  // 0 is shut, 1 is open.
  function setShutter(open01: number): void {
    const k = Math.min(1, Math.max(0, open01));
    upper.rotation.x = k * UP_OPEN;
    lower.rotation.x = k * LOW_OPEN;
  }
  function setTube(a: AltAz): void {
    fork.rotation.y = -a.az * DEG;
    tube.rotation.x = a.alt * DEG;
  }
  setShutter(1);
  setTube({ alt: TUBE_REST_ALT, az: 0 });
  return { root, cupola, shutter, tube, setCupola, setShutter, setTube, slitTop };
}

export { TUBE_REST_ALT };

export const obs = buildObservatory();
obs.root.position.copy(SITE);
scene.add(obs.root);
obs.root.updateMatrixWorld(true);
obs.setCupola(0);
