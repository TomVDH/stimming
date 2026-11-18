// Load order: world/far runs first.
import './far.ts';
import { BackSide, BoxGeometry, BufferGeometry, CanvasTexture, Color, CylinderGeometry, DoubleSide, ExtrudeGeometry, Float32BufferAttribute, FrontSide, Group, MathUtils, Mesh, MeshLambertMaterial, MeshStandardMaterial, RepeatWrapping, SRGBColorSpace, Shape, Vector3 } from 'three';
import type { Object3D, Side } from 'three';
import type { AltAz } from '../core/sky.ts';
import { TUBE_PARK_ALT as PARK } from '../core/machine.ts';

/* ---------- one dome: stone drum, white cupola, slit, shutter, tube ---------- */
const DEG = MathUtils.DEG2RAD;
// Sizes in metres at size 1.
// world/hero shares these sizes.
export const DRUM_R = 3.2, DRUM_H = 3.4;
// The drum is this much wider at its foot.
export const DRUM_BATTER = 1.04;
export const DOME_R = 3.3;
// The slit is 1.3 m wide.
export const SLIT_B = Math.asin(0.65 / DOME_R);
// The slit runs from the front foot to 20 degrees past the zenith.
export const SLIT_E = 110 * DEG;
// The shutter has two leaves that part at 45 degrees.
export const SPLIT_E = 45 * DEG;
// Open, the upper leaf slides over the back; the lower leaf drops down the drum.
export const UP_OPEN = Math.PI - SLIT_E - 3 * DEG;
export const LOW_OPEN = -SPLIT_E - 2 * DEG;
// The tube pivots this high over the dome's centre.
export const PIVOT_Y = 0.5;
// The tube reaches 2.6 m forward, so it stays inside the dome at any altitude.
export const TUBE_FRONT = 2.6, TUBE_BACK = 1.4;
export const TUBE_R = 0.36;
// The laser: radius, length, its axis's distance from the tube's axis.
// Its mouth stands LASER_BACK behind the tube's front.
const LASER_R = 0.07, LASER_L = 1, LASER_D = TUBE_R + 0.12, LASER_BACK = 0.3;
// The pier stands this tall under the drum's top.
export const PIER_H = 1.6;
// The door is 1 m wide; its arch springs at 1.6 m.
export const DOOR_HALF = 0.5, DOOR_SPRING = 1.6;
export const TUBE_REST_ALT = 45;
// The tube parks low under the shutter line.
// core/machine.ts holds the value.
export const TUBE_PARK_ALT = PARK;

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

// Stone courses: one canvas, 8 blocks across and 8 rows up.
// A seeded generator keeps the blocks the same on every load.
let seed = 11;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const stoneCanvas = (() => {
  const c = document.createElement('canvas'), x = c.getContext('2d')!;
  c.width = 256; c.height = 128;
  // The mortar shows between the blocks.
  x.fillStyle = '#3a3733'; x.fillRect(0, 0, 256, 128);
  for (let row = 0; row < 8; row++) {
    // Every other row shifts by half a block.
    const off = row % 2 ? 16 : 0;
    for (let col = -1; col < 8; col++) {
      const v = 118 + rnd() * 34, w = v - 6 + rnd() * 8;
      x.fillStyle = `rgb(${v},${w},${w - 10})`;
      x.fillRect(col * 32 + off + 1, row * 16 + 1, 30, 14);
    }
  }
  return c;
})();
// A stone map that repeats rx times across and ry times up.
export function stoneMap(rx: number, ry: number): CanvasTexture {
  const t = new CanvasTexture(stoneCanvas);
  t.colorSpace = SRGBColorSpace;
  t.wrapS = t.wrapT = RepeatWrapping;
  t.repeat.set(rx, ry);
  return t;
}
// The door glows warm from the room behind it; the lights set its strength.
export const DOOR_GLOW = new Color(1.0, 0.55, 0.22);
// Painted steel for the pier and the fork.
const dark = () => new MeshLambertMaterial({ color: 0x2c2f33 });

// The machine pose the setters last set.
// az: the slit's azimuth; open: the shutter, 0 to 1; tube: alt and az.
export type DomePose = { az: number; open: number; tube: AltAz };

export type Dome = {
  root: Group;
  cupola: Group;
  shutter: Object3D;
  tube: Group;
  setCupola(az: number): void;
  setShutter(open01: number): void;
  setTube(a: AltAz): void;
  slitTop: Vector3;
  // The laser's mouth in world space; a dome with no laser gives the slit top.
  laserMouth(out: Vector3): Vector3;
  door: MeshLambertMaterial;
  pose: DomePose;
  // Shows or hides the dome's own shapes; the lamps on it stay.
  show(on: boolean): void;
};

// size scales the whole dome; 1 is a 6.6 m cupola.
// laser: a cylinder on the tube, the laser's stand-in.
export function buildDome(size: number, laser = false): Dome {
  const root = new Group();
  root.scale.setScalar(size);

  // The stone drum, with a ledge where the dome sits.
  // About 24 blocks round the drum and 8 courses up.
  const drum = new Mesh(new CylinderGeometry(DRUM_R, DRUM_R * DRUM_BATTER, DRUM_H, 48), new MeshLambertMaterial({ map: stoneMap(3, 1) }));
  drum.position.y = DRUM_H / 2;
  const ledge = new Mesh(new CylinderGeometry(DRUM_R + 0.18, DRUM_R + 0.18, 0.22, 48), lam(0x6d6862));
  ledge.position.y = DRUM_H - 0.11;
  root.add(drum, ledge);

  // The door faces north, to the camera.
  const arch = new Shape();
  arch.moveTo(-DOOR_HALF, 0);
  arch.lineTo(-DOOR_HALF, DOOR_SPRING);
  arch.absarc(0, DOOR_SPRING, DOOR_HALF, Math.PI, 0, true);
  arch.lineTo(DOOR_HALF, 0);
  const doorMat = new MeshLambertMaterial({ color: 0x3a2a1c, emissive: DOOR_GLOW, emissiveIntensity: 0 });
  const door = new Mesh(new ExtrudeGeometry(arch, { depth: 0.12, bevelEnabled: false, curveSegments: 16 }), doorMat);
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
  // White paint outside; the inside reads dark through the slit.
  cupola.add(new Mesh(shell, lam(0xe4e2dc)), new Mesh(shell, lam(0x111111, BackSide)));

  // The shutter covers the slit.
  // Each leaf turns about the dome's east-west axis.
  const shutter = new Group();
  const leafMat = lam(0xd6d4ce, DoubleSide);
  const leaf = (e0: number, e1: number) => new Mesh(domePatch(DOME_R + 0.06, -SLIT_B - 0.04, SLIT_B + 0.04, e0, e1, 4, 24), leafMat);
  const upper = leaf(SPLIT_E, SLIT_E), lower = leaf(0, SPLIT_E);
  shutter.add(upper, lower);
  cupola.add(shutter);

  // The pier and the fork stand still; the fork turns in azimuth.
  const pier = new Mesh(new CylinderGeometry(0.45, 0.55, PIER_H, 24), dark());
  pier.position.y = DRUM_H - PIER_H / 2;
  root.add(pier);
  const fork = new Group();
  fork.position.y = DRUM_H;
  root.add(fork);
  const base = new Mesh(new CylinderGeometry(0.7, 0.7, 0.2, 24), dark());
  base.position.y = 0.1;
  fork.add(base);
  for (const s of [-1, 1]) {
    const arm = new Mesh(new BoxGeometry(0.16, PIVOT_Y + 0.2, 0.4), dark());
    arm.position.set(s * 0.62, 0.2 + (PIVOT_Y + 0.2) / 2 - 0.1, 0);
    fork.add(arm);
  }

  // The tube points along local -Z when its altitude is zero.
  const tube = new Group();
  tube.position.y = PIVOT_Y;
  fork.add(tube);
  // Brushed steel catches the door light and the sky.
  const steel = new MeshStandardMaterial({ color: 0xa8b0b8, metalness: 0.3, roughness: 0.42 });
  const body = new Mesh(new CylinderGeometry(TUBE_R, TUBE_R, TUBE_FRONT + TUBE_BACK, 24), steel);
  body.rotation.x = -Math.PI / 2;
  body.position.z = -(TUBE_FRONT - TUBE_BACK) / 2;
  tube.add(body);
  // The laser rides on the tube's upper west side, near the front.
  // A plain cylinder stands in until the laser has a model.
  const mouth = new Vector3(-LASER_D * Math.SQRT1_2, LASER_D * Math.SQRT1_2, -TUBE_FRONT + LASER_BACK);
  if (laser) {
    const can = new Mesh(new CylinderGeometry(LASER_R, LASER_R, LASER_L, 12), dark());
    can.rotation.x = -Math.PI / 2;
    can.position.set(mouth.x, mouth.y, mouth.z + LASER_L / 2);
    tube.add(can);
  }

  const slitTop = new Vector3();
  const slitLocal = new Vector3(0, DOME_R * Math.sin(SLIT_E), -DOME_R * Math.cos(SLIT_E));
  const pose: DomePose = { az: 0, open: 0, tube: { alt: 0, az: 0 } };
  // The dome's own shapes; lamps that other modules add stay out.
  const own: Object3D[] = [drum, ledge, door, cupola, pier, fork];

  // Turns the slit to face an azimuth in degrees.
  // The parents' world matrices must be current.
  function setCupola(az: number): void {
    pose.az = az;
    cupola.rotation.y = -az * DEG;
    cupola.updateMatrixWorld(true);
    slitTop.copy(slitLocal).applyMatrix4(cupola.matrixWorld);
  }
  // 0 is shut, 1 is open.
  function setShutter(open01: number): void {
    const k = Math.min(1, Math.max(0, open01));
    pose.open = k;
    upper.rotation.x = k * UP_OPEN;
    lower.rotation.x = k * LOW_OPEN;
  }
  function setTube(a: AltAz): void {
    pose.tube.alt = a.alt; pose.tube.az = a.az;
    fork.rotation.y = -a.az * DEG;
    tube.rotation.x = a.alt * DEG;
  }
  setShutter(1);
  setTube({ alt: TUBE_REST_ALT, az: 0 });
  const show = (on: boolean): void => { for (const o of own) o.visible = on; };
  function laserMouth(out: Vector3): Vector3 {
    if (!laser) return out.copy(slitTop);
    tube.updateWorldMatrix(true, false);
    return tube.localToWorld(out.copy(mouth));
  }
  return { root, cupola, shutter, tube, setCupola, setShutter, setTube, slitTop, laserMouth, door: doorMat, pose, show };
}
