// Load order: world/observatory runs first.
import './observatory.ts';
import { BoxGeometry, BufferGeometry, CanvasTexture, Color, CylinderGeometry, DoubleSide, Float32BufferAttribute, Group, LatheGeometry, Mesh, MeshBasicMaterial, MeshLambertMaterial, RepeatWrapping, SRGBColorSpace, SphereGeometry, Vector2, Vector3 } from 'three';
import { disposeTree, onLeave, scene } from '../setup.ts';
import { ROAD, ROAD_W, SITE, hillHeight, roadDist } from './hill.ts';
import { buildDome, type Dome } from './observatory.ts';

/* ---------- the complex: three domes, the operations building, the dish, the mast, the road ---------- */
// Positions are in metres from the platform's centre.
// +X is east and -Z is north.
// The camera looks south.
// So east is on the left of the frame.

const lam = (color: number) => new MeshLambertMaterial({ color });
// Thin shells show both faces.
const lam2 = (color: number) => new MeshLambertMaterial({ color, side: DoubleSide });

// The road lives in world/hill, which cuts its bench into the land.
// Other modules take it from here.
export { ROAD, roadDist };

// A ribbon on the road's bench, and a low wall on its downhill edge.
function roadMesh(): Group {
  const p: number[] = [], idx: number[] = [], wp: number[] = [], widx: number[] = [];
  const side = new Vector3();
  // The wall: 0.7 m high, 0.45 m thick, just past the road's edge.
  const WALL_H = 0.7, WALL_T = 0.45, WALL_OUT = ROAD_W / 2 + 0.4;
  ROAD.forEach((c, i) => {
    const a = ROAD[Math.max(0, i - 1)], b = ROAD[Math.min(ROAD.length - 1, i + 1)];
    side.set(-(b.z - a.z), 0, b.x - a.x).normalize();
    for (const s of [-1, 1]) p.push(c.x + s * side.x * ROAD_W / 2, c.y + 0.12, c.z + s * side.z * ROAD_W / 2);
    if (i) idx.push(2 * i - 2, 2 * i - 1, 2 * i, 2 * i - 1, 2 * i + 1, 2 * i);
    // The downhill side is the side where the land falls away.
    const probe = (s: number) => hillHeight(c.x + s * side.x * (ROAD_W / 2 + 6), c.z + s * side.z * (ROAD_W / 2 + 6));
    const s = probe(1) < probe(-1) ? 1 : -1;
    // Four corners of the wall's section: inner foot, inner top, outer top, outer foot.
    for (const [o, h] of [[WALL_OUT, -0.3], [WALL_OUT, WALL_H], [WALL_OUT + WALL_T, WALL_H], [WALL_OUT + WALL_T, -0.6]]) {
      wp.push(c.x + s * side.x * o, c.y + h, c.z + s * side.z * o);
    }
    if (i) for (let k = 0; k < 3; k++) {
      const a0 = 4 * (i - 1) + k, b0 = 4 * i + k;
      widx.push(a0, b0, a0 + 1, a0 + 1, b0, b0 + 1);
    }
  });
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(p, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  // The gravel is paler than the forest floor, so the road reads at night.
  const m = new MeshLambertMaterial({ color: 0x6b665e, polygonOffset: true, polygonOffsetFactor: -2, side: DoubleSide });
  const wg = new BufferGeometry();
  wg.setAttribute('position', new Float32BufferAttribute(wp, 3));
  wg.setIndex(widx);
  wg.computeVertexNormals();
  // Dry stone, grey under starlight.
  const wm = new MeshLambertMaterial({ color: 0x8a857d, side: DoubleSide });
  const out = new Group();
  out.add(new Mesh(g, m), new Mesh(wg, wm));
  return out;
}

const box = (w: number, h: number, d: number, color: number | MeshLambertMaterial, x: number, y: number, z: number): Mesh => {
  const m = new Mesh(new BoxGeometry(w, h, d), typeof color === 'number' ? lam(color) : color);
  m.position.set(x, y + h / 2, z);
  return m;
};

// The operations building: two storeys, clad in pale metal panels.
// Strip windows run along its north face on both floors.
// It is 26 m long, 10 m deep and 7 m high, with a flat roof.
const OPS = { x: 18, z: 7, w: 26, d: 10, h: 7 };
// Each lit pane has its own material.
// Then each pane can come on alone.
// world/lights sets their colours.
const litPanes = [new MeshBasicMaterial(), new MeshBasicMaterial(), new MeshBasicMaterial()];

// The cladding: pale panels with a fine vertical rib every 0.5 m.
// One tile of the texture is 4 m wide and the building's height.
const cladMap = (() => {
  const c = document.createElement('canvas'), x = c.getContext('2d')!;
  c.width = 256; c.height = 256;
  x.fillStyle = '#d8dadc'; x.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 8; i++) {
    x.fillStyle = 'rgba(60,64,70,0.35)'; x.fillRect(i * 32, 0, 2, 256);
    x.fillStyle = 'rgba(255,255,255,0.25)'; x.fillRect(i * 32 + 2, 0, 1, 256);
  }
  // A panel joint runs across at mid-height.
  x.fillStyle = 'rgba(60,64,70,0.4)'; x.fillRect(0, 128, 256, 2);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.wrapS = t.wrapT = RepeatWrapping;
  t.repeat.set(OPS.w / 4, 1);
  return t;
})();

function ops(): Group {
  const g = new Group();
  g.add(box(OPS.w, OPS.h, OPS.d, new MeshLambertMaterial({ map: cladMap }), OPS.x, 0, OPS.z));
  // A dark parapet caps the roof.
  g.add(box(OPS.w + 0.3, 0.6, OPS.d + 0.3, 0x5c6066, OPS.x, OPS.h, OPS.z));
  // Two bands of dark glass, one per floor.
  // Three panes on the upper floor are lit.
  const glass = lam(0x0e1216), front = OPS.z - OPS.d / 2 - 0.06;
  for (const y of [1.2, 4.4]) g.add(box(OPS.w - 2, 1.5, 0.1, glass, OPS.x, y, front));
  const paneW = (OPS.w - 2) / 8;
  [2, 3, 6].forEach((k, i) => {
    const m = new Mesh(new BoxGeometry(paneW - 0.25, 1.3, 0.1), litPanes[i]);
    m.position.set(OPS.x - (OPS.w - 2) / 2 + paneW * (k + 0.5), 4.4 + 0.75, front - 0.03);
    g.add(m);
  });
  // A steel entrance canopy at the west end.
  g.add(box(4, 0.25, 2.2, 0x8a8e94, OPS.x - OPS.w / 2 + 4, 3, front - 1.1));
  // Plant on the roof: chillers and ducts.
  for (const [dx, dz, w, d, h] of [[-8, 1, 4, 2.4, 1.6], [-3, -1.5, 3, 2, 1.2], [5, 1.5, 5, 2.6, 1.8]]) {
    g.add(box(w, h, d, 0x9a9ea4, OPS.x + dx, OPS.h + 0.3, OPS.z + dz));
  }
  // A small white dish on the roof's east end looks up.
  const cup = new Mesh(new SphereGeometry(1.6, 24, 8, 0, Math.PI * 2, 0, 0.9), lam2(0xe8e9ea));
  cup.position.set(OPS.x + 10, OPS.h + 2.2, OPS.z - 1);
  cup.rotation.x = Math.PI - 0.7;
  g.add(cup, box(0.4, 1.6, 0.4, 0x9a9ea4, OPS.x + 10, OPS.h, OPS.z - 1));
  return g;
}

// The tracking dish: a 10 m antenna on an az-el mount, west of the main dome.
// It points high into the south-west sky.
function dish(): Group {
  const g = new Group();
  const x = -36, z = 9;
  const white = lam2(0xe6e7e8);
  // A concrete footing, the pedestal and the yoke.
  g.add(box(5, 0.8, 5, 0xa8a8a4, x, 0, z));
  const ped = new Mesh(new CylinderGeometry(1.1, 1.5, 5, 20), white);
  ped.position.set(x, 3.3, z);
  g.add(ped);
  const head = new Group();
  head.position.set(x, 6.4, z);
  head.rotation.y = 2.4;
  g.add(head);
  head.add(new Mesh(new BoxGeometry(3.2, 1.2, 2), white));
  for (const s of [-1, 1]) {
    const arm = new Mesh(new BoxGeometry(0.4, 3, 1.2), white);
    arm.position.set(s * 1.8, 1.6, 0);
    head.add(arm);
  }
  // The reflector: a paraboloid 10 m across and 1.6 m deep.
  const tilt = new Group();
  tilt.position.y = 2.8;
  tilt.rotation.x = -0.6;
  head.add(tilt);
  const R = 5, F = 3.9, prof: Vector2[] = [];
  for (let i = 0; i <= 16; i++) { const r = R * i / 16; prof.push(new Vector2(r, r * r / (4 * F))); }
  tilt.add(new Mesh(new LatheGeometry(prof, 48), white));
  // Four struts carry the feed at the focus.
  for (let k = 0; k < 4; k++) {
    const a = k * Math.PI / 2 + Math.PI / 4, px = Math.cos(a) * R * 0.8, pz = Math.sin(a) * R * 0.8;
    const top = new Vector3(0, F, 0), foot = new Vector3(px, (R * 0.8) ** 2 / (4 * F), pz);
    const strut = new Mesh(new CylinderGeometry(0.06, 0.06, top.distanceTo(foot), 6), white);
    strut.position.copy(top).add(foot).multiplyScalar(0.5);
    strut.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), top.clone().sub(foot).normalize());
    tilt.add(strut);
  }
  const feed = new Mesh(new CylinderGeometry(0.35, 0.25, 0.9, 12), white);
  feed.position.y = F;
  tilt.add(feed);
  return g;
}

// A lattice mast with a red aviation light on top, north of the operations building.
// The light burns steady, so the page does no per-frame work for it.
const aviation = new MeshBasicMaterial({ color: new Color(6, 0.25, 0.15) });
function mast(): Group {
  const g = new Group();
  const x = 4, z = -20, H = 26;
  const steel = lam(0x8f9399);
  for (const [dx, dz] of [[-0.45, -0.3], [0.45, -0.3], [0, 0.45]]) {
    const leg = new Mesh(new CylinderGeometry(0.06, 0.1, H, 5), steel);
    leg.position.set(x + dx, H / 2, z + dz);
    g.add(leg);
  }
  for (let y = 2; y < H; y += 2.5) g.add(box(0.9, 0.06, 0.9, 0x8f9399, x, y, z));
  const bulb = new Mesh(new SphereGeometry(0.22, 10, 6), aviation);
  bulb.position.set(x, H + 0.3, z);
  g.add(bulb);
  return g;
}

// windows: the lit panes' materials, west to east.
// own: the operations building, the dish and the mast.
// world/observatory owns the domes.
export type Complex = { root: Group; main: Dome; small: [Dome, Dome]; windows: MeshBasicMaterial[]; own: Group[] };

export function buildComplex(): Complex {
  const root = new Group();
  root.position.copy(SITE);
  // The main dome holds the big refractor.
  // The laser leaves it.
  // It is the big Keck-style enclosure: 25 m across, 22.2 m to the top.
  const main = buildDome(3.64, true, true);
  main.root.position.set(-12, 0, -6);
  // Two small modern enclosures stand to the east.
  const east = buildDome(0.75, false, true);
  east.root.position.set(42, 0, 2);
  const north = buildDome(0.62, false, true);
  north.root.position.set(36, 0, -16);
  const own = [ops(), dish(), mast()];
  root.add(main.root, east.root, north.root, ...own);
  root.updateMatrixWorld(true);
  return { root, main, small: [east, north], windows: litPanes, own };
}

export const complex = buildComplex();
scene.add(complex.root);
// The road lies in world space.
const road = roadMesh();
scene.add(road);
onLeave(() => { for (const g of complex.own) disposeTree(g); disposeTree(road); });
