// Load order: world/observatory runs first.
import './observatory.ts';
import { BoxGeometry, BufferGeometry, CatmullRomCurve3, CylinderGeometry, Float32BufferAttribute, Group, Mesh, MeshBasicMaterial, MeshLambertMaterial, Vector3 } from 'three';
import { disposeTree, onLeave, scene } from '../setup.ts';
import { SITE, hillHeight } from './hill.ts';
import { buildDome, stoneMap, type Dome } from './observatory.ts';

/* ---------- the complex: three domes, the stone building, the shed, the road ---------- */
// Positions are in metres from the clearing's centre.
// +X is east and -Z is north.
// The camera looks south.
// So east is on the left of the frame.

const lam = (color: number) => new MeshLambertMaterial({ color });

// The road climbs from the north-east and turns up through the woods.
const ROAD_KNOTS: [number, number][] = [
  [6, -30], [26, -62], [52, -92], [62, -128], [44, -164], [52, -204], [86, -236], [140, -258], [210, -268],
];
const ROAD_W = 5;

// The road's centre line, sampled about every 3 m.
export const ROAD: Vector3[] = new CatmullRomCurve3(ROAD_KNOTS.map(([x, z]) => new Vector3(x, 0, z))).getSpacedPoints(160);

// Distance in metres from a point to the road's centre line.
export function roadDist(x: number, z: number): number {
  let d = Infinity;
  for (const p of ROAD) d = Math.min(d, (p.x - x) ** 2 + (p.z - z) ** 2);
  return Math.sqrt(d);
}

// A ribbon that lies on the ground along the road.
function roadMesh(): Mesh {
  const p: number[] = [], idx: number[] = [];
  const side = new Vector3();
  ROAD.forEach((c, i) => {
    const a = ROAD[Math.max(0, i - 1)], b = ROAD[Math.min(ROAD.length - 1, i + 1)];
    side.set(-(b.z - a.z), 0, b.x - a.x).normalize().multiplyScalar(ROAD_W / 2);
    for (const s of [-1, 1]) {
      const x = c.x + s * side.x, z = c.z + s * side.z;
      p.push(x, hillHeight(x, z) + 0.25, z);
    }
    if (i) idx.push(2 * i - 2, 2 * i - 1, 2 * i, 2 * i - 1, 2 * i + 1, 2 * i);
  });
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(p, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  // The gravel is about as dark as the grass, a little warmer.
  const m = new MeshLambertMaterial({ color: 0x4c4842, polygonOffset: true, polygonOffsetFactor: -2 });
  return new Mesh(g, m);
}

const box = (w: number, h: number, d: number, color: number | MeshLambertMaterial, x: number, y: number, z: number): Mesh => {
  const m = new Mesh(new BoxGeometry(w, h, d), typeof color === 'number' ? lam(color) : color);
  m.position.set(x, y + h / 2, z);
  return m;
};

// The long, low stone building.
// A row of windows runs along its north face.
// It is 30 m long, 9 m deep and 5 m high.
// It has a flat roof.
const HALL = { x: 14, z: 7, w: 30, d: 9, h: 5 };
// Each lit pane has its own material.
// Then each pane can come on alone.
// world/lights sets their colours.
const litPanes = [new MeshBasicMaterial(), new MeshBasicMaterial(), new MeshBasicMaterial()];
// Scales a box's UVs to each face's own size.
// The texture repeat then fits the w by h faces.
// Every other face keeps the same stone size.
// BoxGeometry's face order: +x, -x, +y, -y, +z, -z.
// Each face has four corners.
// The x faces run d across.
// The y faces run d up.
function evenUvs(g: BufferGeometry, w: number, h: number, d: number): void {
  const uv = g.getAttribute('uv');
  const scale = [[d / w, 1], [d / w, 1], [1, d / h], [1, d / h], [1, 1], [1, 1]];
  for (let i = 0; i < uv.count; i++) {
    const [su, sv] = scale[Math.floor(i / 4)];
    uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv);
  }
}

function hall(): Group {
  const g = new Group();
  // The stone blocks match the drums: about 1 m by 0.4 m.
  const walls = box(HALL.w, HALL.h, HALL.d, new MeshLambertMaterial({ map: stoneMap(4, 1.5) }), HALL.x, 0, HALL.z);
  // The end walls take the same block size as the long walls.
  evenUvs(walls.geometry, HALL.w, HALL.h, HALL.d);
  g.add(walls);
  // A dark tarred roof slab.
  g.add(box(HALL.w + 0.6, 0.4, HALL.d + 0.6, 0x26272a, HALL.x, HALL.h, HALL.z));
  // Three of the seven windows are lit.
  const lit = [1, 2, 5], dark = lam(0x121315);
  for (let i = 0; i < 7; i++) {
    const k = lit.indexOf(i);
    const w = new Mesh(new BoxGeometry(1.4, 1.8, 0.1), k < 0 ? dark : litPanes[k]);
    w.position.set(HALL.x - 12 + i * 4, 2.2, HALL.z - HALL.d / 2 - 0.05);
    g.add(w);
  }
  return g;
}

// A shed with a roll-off roof.
// The roof stands rolled off to the west on its rails.
function shed(): Group {
  const g = new Group();
  const x = -30, z = 9;
  // Weathered timber walls, steel rails, a pale roof.
  g.add(box(7, 3, 6, 0x4a4036, x, 0, z));
  for (const dz of [-2.4, 2.4]) g.add(box(9, 0.25, 0.25, 0x2c2f33, x - 7.5, 2.8, z + dz));
  for (const dz of [-2.4, 2.4]) for (const dx of [-11.5, -5]) g.add(box(0.25, 2.8, 0.25, 0x2c2f33, x + dx + 1.5, 0, z + dz));
  g.add(box(7.4, 0.5, 6.4, 0x8c8a86, x - 8.5, 3.05, z));
  // A small tube on a pier stands in the open shed.
  const pier = box(0.5, 2.2, 0.5, 0x2c2f33, x, 0, z);
  const t = new Mesh(new CylinderGeometry(0.2, 0.2, 2.4, 12), lam(0x9aa2aa));
  t.position.set(x, 3.1, z + 0.3);
  t.rotation.x = 0.7;
  g.add(pier, t);
  return g;
}

// windows: the lit panes' materials, west to east.
// own: the hall and the shed.
// world/observatory owns the domes.
export type Complex = { root: Group; main: Dome; small: [Dome, Dome]; windows: MeshBasicMaterial[]; own: Group[] };

export function buildComplex(): Complex {
  const root = new Group();
  root.position.copy(SITE);
  // The main dome holds the big refractor.
  // The laser leaves it.
  const main = buildDome(1.5);
  main.root.position.set(-6, 0, -2);
  // One small dome stands alone to the east.
  // One sits on the hall's roof.
  const east = buildDome(0.8);
  east.root.position.set(40, 0, 2);
  const roof = buildDome(0.75);
  roof.root.position.set(HALL.x + 8, HALL.h + 0.4, HALL.z);
  const own = [hall(), shed()];
  root.add(main.root, east.root, roof.root, ...own);
  root.updateMatrixWorld(true);
  return { root, main, small: [east, roof], windows: litPanes, own };
}

export const complex = buildComplex();
scene.add(complex.root);
// The road lies in world space.
const road = roadMesh();
scene.add(road);
onLeave(() => { for (const g of complex.own) disposeTree(g); disposeTree(road); });
