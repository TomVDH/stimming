// Load order: none.
// The module builds nothing until a caller asks for the modern scope.
import {
  BoxGeometry, BufferAttribute, BufferGeometry, CanvasTexture, CatmullRomCurve3, CircleGeometry, CylinderGeometry, DoubleSide,
  EquirectangularReflectionMapping, ExtrudeGeometry, Group, InstancedMesh, LatheGeometry, Matrix4, Mesh,
  MeshPhysicalMaterial, MeshStandardMaterial, Quaternion, RepeatWrapping, RingGeometry, SRGBColorSpace, Shape,
  SphereGeometry, TubeGeometry, Vector2, Vector3,
} from 'three';
import type { Material, MeshStandardMaterialParameters } from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';

/* ---------- the modern scope: a 1 m Ritchey-Chretien on a direct-drive fork ---------- */
// References: Wikimedia Commons, "24 inch PlaneWave CDK at the WestRock Observatory.png"
// and "MPIA 50 cm July 2023.jpg": a Serrurier truss with anodised nodes,
// a large mirror cell with a primary baffle, a white tapered pier.
// Sizes are in metres at size 1, as in world/hero-scope.ts.
// +Y is up, -Z is north, +X is east.
// The tube's front, the secondary end, points -Z at rest.

export type ModernScope = {
  root: Group;
  // Points the tube at alt and az in degrees.
  // Azimuth runs from north through east.
  setTube(alt: number, az: number): void;
};

const DEG = Math.PI / 180;

/* ---------- sizes ---------- */
// The pier: a base plate, a tapered octagonal column, a flange.
const PIER_TOP = 0.95;
// The fixed azimuth drum, then the turntable that carries the fork.
const DRUM_Y0 = 1.02, DRUM_Y1 = 1.18, TABLE_Y1 = 1.34;
// The altitude axis: the rear end clears the turntable at the zenith.
const AXIS_Y = 3.3;
// The fork arms: centre x and thickness.
const ARM_X = 0.86, ARM_T = 0.16;

// The tube's own frame: Z is the optical axis, the front is -Z.
// Its origin is on the altitude axis.
// The centre section carries the trunnions; the mirror cell bolts behind it.
const CELL_R = 0.64;
const SECTION_Z0 = -0.18, SECTION_Z1 = 0.42;
const CELL_Z0 = 0.42, CELL_Z1 = 0.82;
// The primary: 1 m across, f/3, so R = 2f = 6 m.
// Its rim lies at MIRROR_Z; its centre sits deeper by the sag.
const MIRROR_Z = 0.5, MIRROR_R = 0.5, HOLE_R = 0.12, BLANK_T = 0.1, PRIMARY_RC = 6;
const SAG = (MIRROR_R * MIRROR_R) / (2 * PRIMARY_RC);
// The top cage and the convex secondary, which faces the primary.
const CAGE_Z = -1.95, CAGE_R = 0.58;
const SEC_Z = -1.78, SEC_R = 0.17;
// The truss nodes: four at the centre section, four at the cage.
const NODE_BACK_R = 0.6, NODE_FRONT_R = 0.55, NODE_BACK_Z = SECTION_Z0, NODE_FRONT_Z = CAGE_Z + 0.07;
// The cloth shroud runs between the nodes.
const SHROUD_Z0 = SECTION_Z0 - 0.06, SHROUD_Z1 = CAGE_Z + 0.1;
// The back of the instrument stack.
const STACK_END = 1.55;

/* ---------- geometry helpers ---------- */
type P = [number, number];

// Joins geometries that share position, normal and uv into one.
function mergeGeos(gs: BufferGeometry[]): BufferGeometry {
  let nv = 0, ni = 0;
  for (const g of gs) {
    const n = g.getAttribute('position').count;
    nv += n;
    ni += g.index ? g.index.count : n;
  }
  const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), uv = new Float32Array(nv * 2);
  const idx = new Uint32Array(ni);
  let v = 0, i = 0;
  for (const g of gs) {
    const n = g.getAttribute('position').count;
    pos.set(g.getAttribute('position').array as Float32Array, v * 3);
    nor.set(g.getAttribute('normal').array as Float32Array, v * 3);
    uv.set(g.getAttribute('uv').array as Float32Array, v * 2);
    if (g.index) for (let k = 0; k < g.index.count; k++) idx[i++] = g.index.getX(k) + v;
    else for (let k = 0; k < n; k++) idx[i++] = k + v;
    v += n;
    g.dispose();
  }
  const out = new BufferGeometry();
  out.setAttribute('position', new BufferAttribute(pos, 3));
  out.setAttribute('normal', new BufferAttribute(nor, 3));
  out.setAttribute('uv', new BufferAttribute(uv, 2));
  out.setIndex(new BufferAttribute(idx, 1));
  return out;
}

// Turns profile runs of [radius, height] about the Y axis.
// A run goes up the outside, so its normals face out.
function turn(runs: P[][], segs = 72): BufferGeometry {
  return mergeGeos(runs.map(r => new LatheGeometry(r.map(([x, y]) => new Vector2(x, y)), segs)));
}
// A polyline as runs of one edge each: every corner is sharp.
const edges = (pts: P[]): P[][] => pts.slice(1).map((p, i) => [pts[i], p]);
// A flanged ring: a rectangle in [radius, height] with small chamfers.
function ringProfile(r0: number, r1: number, h0: number, h1: number, c: number): P[][] {
  return edges([[r0, h0], [r1 - c, h0], [r1, h0 + c], [r1, h1 - c], [r1 - c, h1], [r0, h1], [r0, h0]]);
}

// The lathe's Y axis turns onto Z, the tube's axis.
const Y_TO_Z = new Matrix4().makeRotationX(Math.PI / 2);
// The lathe's Y axis turns onto X, the altitude axis.
const Y_TO_X = new Matrix4().makeRotationZ(-Math.PI / 2);
const along = (g: BufferGeometry, m: Matrix4, x = 0, y = 0, z = 0): BufferGeometry => g.applyMatrix4(m).translate(x, y, z);

// Cylinders along each axis, from a to b.
const cylY = (r: number, a: number, b: number, segs = 48): BufferGeometry =>
  new CylinderGeometry(r, r, b - a, segs).translate(0, (a + b) / 2, 0);
const cylZ = (r: number, a: number, b: number, segs = 48): BufferGeometry =>
  new CylinderGeometry(r, r, b - a, segs).rotateX(Math.PI / 2).translate(0, 0, (a + b) / 2);
// The same cylinder with no caps: a skin.
const cylZOpen = (r: number, a: number, b: number, segs = 96): BufferGeometry =>
  new CylinderGeometry(r, r, b - a, segs, 1, true).rotateX(Math.PI / 2).translate(0, 0, (a + b) / 2);
const cylX = (r: number, a: number, b: number, segs = 48): BufferGeometry =>
  new CylinderGeometry(r, r, b - a, segs).rotateZ(-Math.PI / 2).translate((a + b) / 2, 0, 0);

// A box with chamfered edges, centred on the origin.
function chamferBox(w: number, h: number, d: number, c: number): BufferGeometry {
  const s = new Shape();
  const x = w / 2 - c, y = h / 2 - c;
  s.moveTo(-x, -y); s.lineTo(x, -y); s.lineTo(x, y); s.lineTo(-x, y); s.lineTo(-x, -y);
  const g = new ExtrudeGeometry(s, { depth: d - 2 * c, bevelEnabled: true, bevelThickness: c, bevelSize: c, bevelSegments: 2, curveSegments: 1 });
  return g.translate(0, 0, -(d - 2 * c) / 2);
}

// Builds an indexed grid from rows of points, then gives it normals.
// The grid flips its winding when its normals face the wrong way.
// out(p, n) is true when the normal n at point p faces the right way.
function gridGeometry(pos: number[], uv: number[], rows: number, cols: number, out: (p: Vector3, n: Vector3) => boolean): BufferGeometry {
  const quads = (flip: boolean): number[] => {
    const idx: number[] = [];
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        const a = i * (cols + 1) + j, b = a + cols + 1;
        if (flip) idx.push(a, a + 1, b, b, a + 1, b + 1);
        else idx.push(a, b, a + 1, b, b + 1, a + 1);
      }
    }
    return idx;
  };
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(new Float32Array(pos), 3));
  g.setAttribute('uv', new BufferAttribute(new Float32Array(uv), 2));
  g.setIndex(quads(false));
  g.computeVertexNormals();
  // A vertex one row in, away from any seam, tells the side.
  const k = cols + 1 + Math.floor(cols / 4);
  const p = new Vector3().fromBufferAttribute(g.getAttribute('position'), k);
  const n = new Vector3().fromBufferAttribute(g.getAttribute('normal'), k);
  if (!out(p, n)) {
    g.setIndex(quads(true));
    g.computeVertexNormals();
  }
  return g;
}


// The light shroud: black cloth stretched over the truss.
// It sags between the eight struts and draws in a little at mid-length.
function shroudGeometry(z0: number, z1: number, r0: number, r1: number): BufferGeometry {
  const rows = 48, segs = 256, pos: number[] = [], uv: number[] = [];
  for (let i = 0; i <= rows; i++) {
    const t = i / rows, mid = Math.sin(Math.PI * t);
    const rr = r0 + (r1 - r0) * t - 0.008 * mid;
    for (let j = 0; j <= segs; j++) {
      const a = (j / segs) * Math.PI * 2;
      const r = rr - 0.012 * (0.5 - 0.5 * Math.cos(8 * a)) * (0.4 + 0.6 * mid);
      pos.push(Math.cos(a) * r, Math.sin(a) * r, z0 + (z1 - z0) * t);
      uv.push((j / segs) * 8, t * 4);
    }
  }
  return gridGeometry(pos, uv, rows, segs, (p, n) => n.x * p.x + n.y * p.y > 0);
}

// A fork arm: a tapered plate, round at the top about the altitude axis.
// The shape lies in z and y; the extrusion turns onto X.
function armGeometry(): BufferGeometry {
  const s = new Shape();
  s.moveTo(-0.45, TABLE_Y1);
  s.lineTo(0.45, TABLE_Y1);
  s.lineTo(0.3, AXIS_Y);
  s.absarc(0, AXIS_Y, 0.3, 0, Math.PI, false);
  s.lineTo(-0.45, TABLE_Y1);
  const g = new ExtrudeGeometry(s, { depth: ARM_T - 0.024, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 2, curveSegments: 32 });
  return g.rotateY(-Math.PI / 2);
}

// Stands a piece at p with its axis along dir.
const UP = new Vector3(0, 1, 0);
const qa = new Quaternion(), qb = new Quaternion(), sc = new Vector3(), dn = new Vector3();
function stand(p: Vector3, dir: Vector3, spin = 0, s = 1): Matrix4 {
  qa.setFromUnitVectors(UP, dn.copy(dir).normalize());
  qa.multiply(qb.setFromAxisAngle(UP, spin));
  return new Matrix4().compose(p, qa, sc.setScalar(s));
}
// A box piece at p, sized along three given axes.
function boxAt(p: Vector3, xa: Vector3, ya: Vector3, za: Vector3, sx: number, sy: number, sz: number): Matrix4 {
  return new Matrix4().makeBasis(xa.clone().multiplyScalar(sx), ya.clone().multiplyScalar(sy), za.clone().multiplyScalar(sz)).setPosition(p);
}
// A unit cylinder stretched from a to b, with radius r.
function beamM(a: Vector3, b: Vector3, r: number): Matrix4 {
  const d = new Vector3().subVectors(b, a);
  const q = new Quaternion().setFromUnitVectors(UP, d.clone().normalize());
  return new Matrix4().compose(new Vector3().addVectors(a, b).multiplyScalar(0.5), q, new Vector3(r, d.length(), r));
}
const X = new Vector3(1, 0, 0), Y = new Vector3(0, 1, 0), Z = new Vector3(0, 0, 1);

// One rigid group's parts: merged by material, small parts instanced.
class Kit {
  private parts = new Map<Material, BufferGeometry[]>();
  private bits = new Map<string, { geo: BufferGeometry; mat: Material; ms: Matrix4[] }>();
  add(mat: Material, ...gs: BufferGeometry[]): void {
    const list = this.parts.get(mat) ?? [];
    list.push(...gs);
    this.parts.set(mat, list);
  }
  put(geo: BufferGeometry, mat: Material, m: Matrix4): void {
    const key = geo.uuid + mat.uuid;
    const b = this.bits.get(key) ?? { geo, mat, ms: [] };
    b.ms.push(m);
    this.bits.set(key, b);
  }
  build(into: Group): void {
    for (const [mat, gs] of this.parts) into.add(new Mesh(mergeGeos(gs), mat));
    for (const b of this.bits.values()) {
      const im = new InstancedMesh(b.geo, b.mat, b.ms.length);
      b.ms.forEach((m, i) => im.setMatrixAt(i, m));
      im.computeBoundingSphere();
      into.add(im);
    }
  }
}

/* ---------- small repeated parts ---------- */
type Pieces = Record<'bolt' | 'socket' | 'box' | 'led' | 'beam', BufferGeometry>;
function pieces(): Pieces {
  return {
    // A hex bolt head.
    bolt: new CylinderGeometry(0.014, 0.014, 0.01, 6).translate(0, 0.005, 0),
    // A socket cap screw.
    socket: new CylinderGeometry(0.009, 0.009, 0.009, 16).translate(0, 0.0045, 0),
    // The unit box: rack teeth, clamps, fan bars, vanes.
    box: new BoxGeometry(1, 1, 1),
    // A status lamp's dome.
    led: new SphereGeometry(0.01, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2),
    // The unit cylinder every truss member stretches.
    beam: new CylinderGeometry(1, 1, 1, 16),
  };
}

/* ---------- textures, made once in code ---------- */
// A seeded generator keeps the marks the same on every load.
function rng(seed: number): () => number {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
}
function canvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return [c, c.getContext('2d')!];
}
function tex(c: HTMLCanvasElement, srgb: boolean, repeat = 1): CanvasTexture {
  const t = new CanvasTexture(c);
  if (srgb) t.colorSpace = SRGBColorSpace;
  t.wrapS = t.wrapT = RepeatWrapping;
  t.repeat.set(repeat, repeat);
  t.anisotropy = 8;
  return t;
}

// Fine grain for anodised and powder-coat roughness: a grey noise field.
function grainMap(): CanvasTexture {
  const S = 256, r = rng(11);
  const [c, x] = canvas(S, S);
  const img = x.createImageData(S, S);
  for (let i = 0; i < S * S; i++) {
    const v = 205 + r() * 50;
    img.data[i * 4] = v; img.data[i * 4 + 1] = v; img.data[i * 4 + 2] = v; img.data[i * 4 + 3] = 255;
  }
  x.putImageData(img, 0, 0);
  return tex(c, false, 3);
}

// A weave, as a bump map: a twill for carbon, a fine plain weave for cloth.
function weaveMap(cell: number, repeat: number): CanvasTexture {
  const S = 128;
  const [c, x] = canvas(S, S);
  const img = x.createImageData(S, S);
  for (let j = 0; j < S; j++) {
    for (let i = 0; i < S; i++) {
      // Each cell crosses over on alternate squares.
      const over = ((Math.floor(i / cell) + Math.floor(j / cell)) & 1) === 0;
      const t = over ? i % cell : j % cell;
      const h = 128 + 90 * Math.sin((t / cell) * Math.PI);
      const o = (j * S + i) * 4;
      img.data[o] = h; img.data[o + 1] = h; img.data[o + 2] = h; img.data[o + 3] = 255;
    }
  }
  x.putImageData(img, 0, 0);
  return tex(c, false, repeat);
}

// The dome the scope stands in, as an equirect map.
// Metal reflects it, and the mirrors see it round their own structure.
// A pale ribbed shell, an open slit of night sky, warm lamps on the drum wall.
function domeEnv(): CanvasTexture {
  const W = 1024, H = 512, r = rng(31);
  const [c, x] = canvas(W, H);
  const g = x.createLinearGradient(0, 0, 0, H / 2);
  g.addColorStop(0, '#7f8895');
  g.addColorStop(1, '#c4cbd5');
  x.fillStyle = g;
  x.fillRect(0, 0, W, H / 2);
  const f = x.createLinearGradient(0, H / 2, 0, H);
  f.addColorStop(0, '#3a3f47');
  f.addColorStop(0.15, '#1b1e23');
  f.addColorStop(1, '#0c0d10');
  x.fillStyle = f;
  x.fillRect(0, H / 2, W, H / 2);
  // Ribs: 24 meridians of the shell.
  x.strokeStyle = 'rgba(56,62,72,0.6)';
  x.lineWidth = 3;
  for (let i = 0; i < 24; i++) {
    const u = (i / 24) * W;
    x.beginPath(); x.moveTo(u, 0); x.lineTo(u, H / 2); x.stroke();
  }
  // Panel seams: rings of latitude.
  x.strokeStyle = 'rgba(66,72,82,0.45)';
  x.lineWidth = 2;
  for (const v of [0.12, 0.24, 0.36, 0.45]) {
    x.beginPath(); x.moveTo(0, v * H); x.lineTo(W, v * H); x.stroke();
  }
  // The open slit: night sky from the zenith to the horizon, with stars.
  const s = x.createLinearGradient(0, 0, 0, H / 2);
  s.addColorStop(0, '#04060c');
  s.addColorStop(1, '#16203a');
  x.fillStyle = s;
  x.fillRect(W * 0.46, 0, W * 0.08, H * 0.5);
  for (let i = 0; i < 160; i++) {
    x.fillStyle = `rgba(255,255,255,${0.35 + r() * 0.65})`;
    x.fillRect(W * 0.46 + r() * W * 0.08, r() * H * 0.48, 1.5, 1.5);
  }
  // Warm work lamps on the drum wall.
  for (let i = 0; i < 8; i++) {
    const cx = (i / 8 + 0.03) * W, cy = H * 0.54;
    const lg = x.createRadialGradient(cx, cy, 0, cx, cy, 26);
    lg.addColorStop(0, 'rgba(255,236,200,1)');
    lg.addColorStop(1, 'rgba(255,236,200,0)');
    x.fillStyle = lg;
    x.fillRect(cx - 26, cy - 26, 52, 52);
  }
  // Two soft panels high on the shell.
  for (const u of [0.18, 0.78]) {
    const pg = x.createLinearGradient(0, H * 0.1, 0, H * 0.3);
    pg.addColorStop(0, 'rgba(255,255,255,0.95)');
    pg.addColorStop(1, 'rgba(235,242,255,0.6)');
    x.fillStyle = pg;
    x.fillRect(W * u, H * 0.1, W * 0.07, H * 0.2);
  }
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.mapping = EquirectangularReflectionMapping;
  return t;
}

/* ---------- materials ---------- */
type MatKey = 'white' | 'black' | 'accent' | 'stainless' | 'darkSteel' | 'zinc' | 'flock' | 'rubber' | 'carbon'
  | 'cloth' | 'zerodur' | 'fin' | 'cable' | 'fibre' | 'lan' | 'display' | 'ledG' | 'ledB' | 'ledA' | 'ledW';
type Mats = Record<MatKey, MeshStandardMaterial>;

// The hero's convention: the env map adds reflections only.
// Built-in lights keep the scene's level.
function reflectOnly<M extends MeshStandardMaterial>(m: M, key: string): M {
  m.onBeforeCompile = (sh) => {
    sh.fragmentShader = sh.fragmentShader.replace('#include <lights_fragment_maps>', `#include <lights_fragment_maps>
      iblIrradiance = vec3(0.0);`);
  };
  m.customProgramCacheKey = () => 'modern-scope|' + key;
  return m;
}

function materials(env: CanvasTexture): Mats {
  const std = (key: string, p: MeshStandardMaterialParameters): MeshStandardMaterial =>
    reflectOnly(new MeshStandardMaterial({ envMap: env, ...p }), key);
  const grain = grainMap();
  const led = (c: number, key: MatKey): MeshStandardMaterial =>
    std(key, { color: c, emissive: c, emissiveIntensity: 2.5, roughness: 0.3 });
  return {
    // White powder coat on the pier and the cell.
    white: std('white', { color: 0xe8eaed, roughness: 0.48, metalness: 0, roughnessMap: grain }),
    // Black hard anodising on the fork, the drums and the cage.
    black: std('black', { color: 0x16181c, metalness: 0.55, roughness: 0.32, roughnessMap: grain }),
    // White anodised nodes, caps and trim: brighter and glossier than the powder coat.
    accent: std('accent', { color: 0xf4f5f7, metalness: 0.25, roughness: 0.22 }),
    // Polished stainless rings and bands.
    stainless: std('stainless', { color: 0xd0d4d9, metalness: 1, roughness: 0.14 }),
    darkSteel: std('darkSteel', { color: 0x40444a, metalness: 0.9, roughness: 0.38 }),
    zinc: std('zinc', { color: 0x9da1a5, metalness: 1, roughness: 0.42 }),
    // Flock black inside the tube and the baffles: it eats stray light.
    flock: std('flock', { color: 0x040405, metalness: 0, roughness: 1 }),
    rubber: std('rubber', { color: 0x101012, metalness: 0, roughness: 0.9 }),
    // Carbon struts under a clear coat.
    carbon: reflectOnly(new MeshPhysicalMaterial({
      envMap: env, color: 0x0e0e10, metalness: 0.2, roughness: 0.45,
      bumpMap: weaveMap(8, 10), bumpScale: 0.5, clearcoat: 1, clearcoatRoughness: 0.08,
    }), 'carbon'),
    // The shroud's black cloth: a soft sheen at grazing angles.
    cloth: reflectOnly(new MeshPhysicalMaterial({
      envMap: env, color: 0x111114, metalness: 0, roughness: 0.95,
      sheen: 1, sheenColor: 0x4a505a, sheenRoughness: 0.55, bumpMap: weaveMap(2, 30), bumpScale: 0.35,
      // The aperture shows the cloth's inside face too.
      side: DoubleSide,
    }), 'cloth'),
    // The primary's blank: an amber glass-ceramic.
    zerodur: std('zerodur', { color: 0x8a5a2a, metalness: 0, roughness: 0.12 }),
    // Dark-coated fins on the camera's heat sink.
    fin: std('fin', { color: 0x1a1c20, metalness: 0.4, roughness: 0.5 }),
    cable: std('cable', { color: 0x111113, metalness: 0, roughness: 0.8 }),
    fibre: std('fibre', { color: 0xd9731f, metalness: 0, roughness: 0.5 }),
    lan: std('lan', { color: 0xd8dbe0, metalness: 0, roughness: 0.5 }),
    // A small status screen: dark glass with a faint white glow.
    display: std('display', { color: 0x101214, emissive: 0x8a9098, emissiveIntensity: 0.6, roughness: 0.08, metalness: 0 }),
    ledG: led(0x39ff7a, 'ledG'),
    ledB: led(0x3aa0ff, 'ledB'),
    ledA: led(0xffb23a, 'ledA'),
    // The lamp rings: a cool white line.
    ledW: std('ledW', { color: 0xf2f6ff, emissive: 0xeef3ff, emissiveIntensity: 1.6, roughness: 0.3 }),
  };
}


// A cable bundle: a black lead, an orange fibre and a white data line.
// Clamps hold it at every third point.
function bundle(k: Kit, M: Mats, Pc: Pieces, pts: [number, number, number][]): void {
  const runs: [MeshStandardMaterial, number, number][] = [[M.cable, 0, 0], [M.fibre, 0.014, 0.006], [M.lan, -0.012, 0.009]];
  for (const [mat, dx, dy] of runs) {
    const curve = new CatmullRomCurve3(pts.map(([x, y, z]) => new Vector3(x + dx, y + dy, z)));
    k.add(mat, new TubeGeometry(curve, 96, 0.009, 8, false));
  }
  for (let i = 1; i < pts.length - 1; i += 3) {
    const [x, y, z] = pts[i];
    k.put(Pc.box, M.black, boxAt(new Vector3(x, y, z), X, Y, Z, 0.06, 0.035, 0.025));
  }
}

/* ---------- the pier: it never moves ---------- */
function buildPier(k: Kit, M: Mats, Pc: Pieces): void {
  // A steel base plate, with a levelling bolt at each corner.
  k.add(M.darkSteel, chamferBox(1.5, 0.06, 1.5, 0.01).translate(0, 0.03, 0));
  for (const [x, z] of [[-0.66, -0.66], [0.66, -0.66], [-0.66, 0.66], [0.66, 0.66]] as P[]) {
    k.add(M.stainless, cylY(0.035, 0.06, 0.1, 6).translate(x, 0, z), cylY(0.012, 0.1, 0.16, 12).translate(x, 0, z));
  }
  // The column: a tapered octagon in white powder coat, faceted.
  const col = new CylinderGeometry(0.42, 0.56, PIER_TOP - 0.06, 8).translate(0, (PIER_TOP + 0.06) / 2, 0).toNonIndexed();
  col.computeVertexNormals();
  k.add(M.white, col);
  // The top flange and the fixed azimuth drum.
  k.add(M.white, turn(edges([[0, PIER_TOP], [0.66, PIER_TOP], [0.66, DRUM_Y0], [0, DRUM_Y0]]), 96));
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    k.put(Pc.bolt, M.stainless, stand(new Vector3(Math.cos(a) * 0.6, DRUM_Y0, Math.sin(a) * 0.6), UP, a, 1.1));
  }
  k.add(M.black, turn(ringProfile(0, 0.85, DRUM_Y0, DRUM_Y1, 0.01), 128));
  // The encoder band: a polished ring round the drum, with a white lamp line.
  k.add(M.stainless, turn(ringProfile(0.85, 0.856, DRUM_Y0 + 0.05, DRUM_Y0 + 0.09, 0.002), 160));
  k.add(M.ledW, turn(ringProfile(0.85, 0.853, DRUM_Y0 + 0.11, DRUM_Y0 + 0.118, 0.001), 160));
  // The control box on the column's south face, with a status screen and lamps.
  k.add(M.black, chamferBox(0.36, 0.42, 0.16, 0.014).translate(0, 0.6, 0.56));
  k.add(M.display, new BoxGeometry(0.22, 0.09, 0.006).translate(0, 0.69, 0.643));
  for (let i = 0; i < 3; i++) {
    k.put(Pc.led, [M.ledG, M.ledB, M.ledA][i], stand(new Vector3(-0.06 + i * 0.06, 0.56, 0.64), Z, 0, 1));
  }
  for (const dx of [-0.1, 0, 0.1]) k.put(Pc.socket, M.stainless, stand(new Vector3(dx, 0.392, 0.56), new Vector3(0, -1, 0), 0, 1.6));
  // Mains and data rise from the box into the drum.
  bundle(k, M, Pc, [[0.08, 0.81, 0.6], [0.12, 0.9, 0.66], [0.2, 0.97, 0.76], [0.24, 1.06, 0.83]]);
}

/* ---------- the fork: it turns in azimuth ---------- */
function buildFork(k: Kit, M: Mats, Pc: Pieces): void {
  // The turntable, with a polished band.
  k.add(M.black, turn(ringProfile(0, 0.9, DRUM_Y1, TABLE_Y1, 0.012), 128));
  k.add(M.stainless, turn(ringProfile(0.9, 0.905, DRUM_Y1 + 0.06, DRUM_Y1 + 0.1, 0.002), 160));
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    k.put(Pc.socket, M.stainless, stand(new Vector3(Math.cos(a) * 0.82, TABLE_Y1, Math.sin(a) * 0.82), UP, a, 1));
  }
  // The two arms.
  for (const s of [-1, 1]) {
    k.add(M.black, armGeometry().translate(s * ARM_X + ARM_T / 2 - 0.012, 0, 0));
    // A white trim line down the arm's outer face.
    k.add(M.accent, chamferBox(0.006, AXIS_Y - TABLE_Y1 - 0.5, 0.03, 0.002).translate(s * (ARM_X + ARM_T / 2 + 0.003), (AXIS_Y + TABLE_Y1) / 2 - 0.15, 0.2));
    // The direct-drive housing on the arm's outer face, centred on the axis.
    const x0 = ARM_X + ARM_T / 2, x1 = x0 + 0.16;
    const lo = s > 0 ? x0 : -x1, hi = s > 0 ? x1 : -x0;
    k.add(M.black, cylX(0.42, lo, hi, 128).translate(0, AXIS_Y, 0));
    k.add(M.stainless, cylX(0.425, s > 0 ? x0 + 0.06 : -x0 - 0.1, s > 0 ? x0 + 0.1 : -x0 - 0.06, 128).translate(0, AXIS_Y, 0));
    // The cover: a white cap, a lamp ring and a ring of screws.
    const xc = s * (x1 + 0.01);
    k.add(M.accent, cylX(0.22, Math.min(xc, s * x1), Math.max(xc, s * x1), 96).translate(0, AXIS_Y, 0));
    k.add(M.ledW, new RingGeometry(0.3, 0.312, 128).rotateY(s * Math.PI / 2).translate(s * (x1 + 0.002), AXIS_Y, 0));
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      k.put(Pc.socket, M.stainless, stand(new Vector3(s * x1, AXIS_Y + Math.cos(a) * 0.37, Math.sin(a) * 0.37), new Vector3(s, 0, 0), a, 1));
    }
  }
  // The cable climbs the west arm's inner face to the altitude axis.
  bundle(k, M, Pc, [[0, TABLE_Y1, 0], [-0.4, TABLE_Y1 + 0.05, 0.2], [-0.72, TABLE_Y1 + 0.4, 0.3], [-0.74, 2.4, 0.26], [-0.74, AXIS_Y - 0.3, 0.1], [-0.74, AXIS_Y, 0]]);
}

/* ---------- the tube: it tilts on the altitude axis ---------- */
function buildTube(k: Kit, M: Mats, Pc: Pieces): void {
  /* the centre section: a black anodised ring that carries the trunnions */
  k.add(M.black, along(turn(ringProfile(MIRROR_R + 0.02, CELL_R, SECTION_Z0, SECTION_Z1, 0.01), 160), Y_TO_Z));
  k.add(M.flock, cylZOpen(MIRROR_R + 0.02, SECTION_Z0, CELL_Z1, 160));
  k.add(M.stainless, along(turn(ringProfile(CELL_R, CELL_R + 0.005, SECTION_Z0 + 0.04, SECTION_Z0 + 0.07, 0.002), 160), Y_TO_Z));
  // The trunnions: short shafts out to the fork's bearings.
  k.add(M.black, cylX(0.13, CELL_R - 0.02, ARM_X - ARM_T / 2, 64), cylX(0.13, -ARM_X + ARM_T / 2, -CELL_R + 0.02, 64));
  for (const s of [-1, 1]) k.add(M.stainless, cylX(0.14, s > 0 ? CELL_R : -CELL_R - 0.03, s > 0 ? CELL_R + 0.03 : -CELL_R, 64));

  /* the mirror cell: white, with a back plate, fans and two electronics boxes */
  k.add(M.white, along(turn(ringProfile(MIRROR_R + 0.02, CELL_R, CELL_Z0, CELL_Z1, 0.012), 160), Y_TO_Z));
  k.add(M.white, along(turn(ringProfile(HOLE_R + 0.06, CELL_R, CELL_Z1, CELL_Z1 + 0.03, 0.008), 160), Y_TO_Z));
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    k.put(Pc.socket, M.stainless, stand(new Vector3(Math.cos(a) * 0.6, Math.sin(a) * 0.6, CELL_Z1 + 0.03), Z, a, 1));
  }
  // Four fans pull air across the back of the mirror.
  const fz = CELL_Z1 + 0.03;
  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 4 + (i / 4) * Math.PI * 2, cx = Math.cos(a) * 0.38, cy = Math.sin(a) * 0.38;
    k.add(M.black, along(turn(ringProfile(0.075, 0.092, fz, fz + 0.03, 0.004), 48), Y_TO_Z, cx, cy, 0));
    k.add(M.flock, cylZ(0.075, fz, fz + 0.012, 48).translate(cx, cy, 0));
    k.add(M.black, cylZ(0.026, fz, fz + 0.034, 24).translate(cx, cy, 0));
    for (const [w, h] of [[0.15, 0.008], [0.008, 0.15]] as P[]) {
      k.put(Pc.box, M.black, boxAt(new Vector3(cx, cy, fz + 0.03), X, Y, Z, w, h, 0.006));
    }
  }
  // Electronics boxes on the cell's top and its west side.
  for (const a of [Math.PI / 2, Math.PI * 1.1]) {
    const n = new Vector3(Math.cos(a), Math.sin(a), 0), t = new Vector3(-Math.sin(a), Math.cos(a), 0);
    const c = n.clone().multiplyScalar(CELL_R + 0.05).setZ((CELL_Z0 + CELL_Z1) / 2);
    const g = chamferBox(0.28, 0.1, 0.26, 0.012).applyMatrix4(new Matrix4().makeBasis(t, n, Z)).translate(c.x, c.y, c.z);
    k.add(M.black, g);
    for (let i = 0; i < 3; i++) {
      const p = c.clone().addScaledVector(t, -0.06 + i * 0.06).setZ((CELL_Z0 + CELL_Z1) / 2 + 0.13);
      k.put(Pc.led, [M.ledG, M.ledB, M.ledA][i], stand(p, Z, 0, 0.8));
    }
  }

  /* the primary's blank: amber glass-ceramic, seen at its edge through the truss */
  k.add(M.zerodur, cylZOpen(MIRROR_R, MIRROR_Z, MIRROR_Z + BLANK_T, 160));
  k.add(M.zerodur, along(turn(ringProfile(HOLE_R, MIRROR_R, MIRROR_Z + BLANK_T - 0.01, MIRROR_Z + BLANK_T, 0.004), 160), Y_TO_Z));

  /* the truss: eight carbon struts in four V pairs, on white nodes */
  const back: Vector3[] = [], front: Vector3[] = [];
  for (let i = 0; i < 4; i++) {
    const ab = Math.PI / 4 + (i / 4) * Math.PI * 2, af = (i / 4) * Math.PI * 2;
    back.push(new Vector3(Math.cos(ab) * NODE_BACK_R, Math.sin(ab) * NODE_BACK_R, NODE_BACK_Z));
    front.push(new Vector3(Math.cos(af) * NODE_FRONT_R, Math.sin(af) * NODE_FRONT_R, NODE_FRONT_Z));
  }
  for (let i = 0; i < 4; i++) {
    for (const f of [front[i], front[(i + 1) % 4]]) {
      k.put(Pc.beam, M.carbon, beamM(back[i], f, 0.022));
      // Stainless end fittings at both ends of each strut.
      const d = new Vector3().subVectors(f, back[i]).normalize();
      k.put(Pc.beam, M.stainless, beamM(back[i].clone().addScaledVector(d, 0.04), back[i].clone().addScaledVector(d, 0.1), 0.025));
      k.put(Pc.beam, M.stainless, beamM(f.clone().addScaledVector(d, -0.1), f.clone().addScaledVector(d, -0.04), 0.025));
    }
  }
  for (const p of [...back, ...front]) {
    const n = new Vector3(p.x, p.y, 0).normalize(), t = new Vector3(-n.y, n.x, 0);
    k.put(Pc.box, M.accent, boxAt(p, t, n, Z, 0.11, 0.06, 0.09));
    k.put(Pc.socket, M.stainless, stand(p.clone().addScaledVector(n, 0.03), n, 0, 1.2));
  }

  /* the cloth shroud over the truss, with elastic hems */
  k.add(M.cloth, shroudGeometry(SHROUD_Z0, SHROUD_Z1, CELL_R + 0.008, NODE_FRONT_R + 0.06));
  k.add(M.rubber, along(turn(ringProfile(CELL_R - 0.01, CELL_R + 0.016, SHROUD_Z0 - 0.02, SHROUD_Z0 + 0.02, 0.008), 160), Y_TO_Z));
  k.add(M.rubber, along(turn(ringProfile(NODE_FRONT_R + 0.04, NODE_FRONT_R + 0.068, SHROUD_Z1 - 0.02, SHROUD_Z1 + 0.02, 0.008), 160), Y_TO_Z));

  /* the top cage: a black ring with a white lip, the spider and the secondary */
  k.add(M.black, along(turn(ringProfile(CAGE_R - 0.04, CAGE_R + 0.04, CAGE_Z - 0.07, CAGE_Z + 0.07, 0.01), 160), Y_TO_Z));
  k.add(M.flock, cylZOpen(CAGE_R - 0.04, CAGE_Z - 0.07, CAGE_Z + 0.07, 160));
  k.add(M.accent, along(turn(ringProfile(CAGE_R - 0.04, CAGE_R + 0.044, CAGE_Z - 0.085, CAGE_Z - 0.07, 0.004), 160), Y_TO_Z));
  // The secondary housing, its focus motor and its baffle.
  k.add(M.black, cylZ(0.21, CAGE_Z - 0.12, SEC_Z - 0.01, 96), cylZ(0.08, CAGE_Z - 0.2, CAGE_Z - 0.12, 48));
  k.add(M.flock, cylZOpen(0.205, SEC_Z - 0.01, SEC_Z + 0.09, 96));
  k.add(M.black, cylZOpen(0.215, SEC_Z - 0.01, SEC_Z + 0.09, 96));
  // Four thin vanes hold the housing in the cage.
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    const n = new Vector3(Math.cos(a), Math.sin(a), 0), t = new Vector3(-n.y, n.x, 0);
    const p = n.clone().multiplyScalar((0.21 + CAGE_R - 0.04) / 2).setZ(CAGE_Z - 0.04);
    k.put(Pc.box, M.black, boxAt(p, t, n, Z, 0.006, CAGE_R - 0.04 - 0.21, 0.1));
  }

  /* the Cassegrain stack: rotator, focuser, filter wheel, cooled camera */
  const z0 = CELL_Z1 + 0.03;
  k.add(M.black, cylZ(0.3, z0, z0 + 0.08, 96));
  k.add(M.accent, cylZ(0.305, z0 + 0.035, z0 + 0.045, 96));
  k.add(M.black, cylZ(0.16, z0 + 0.08, z0 + 0.22, 64));
  k.add(M.stainless, cylZ(0.165, z0 + 0.14, z0 + 0.16, 64));
  k.add(M.black, cylZ(0.3, z0 + 0.22, z0 + 0.3, 96), chamferBox(0.14, 0.12, 0.08, 0.01).translate(0, 0.3, z0 + 0.26));
  k.add(M.stainless, cylZ(0.21, z0 + 0.3, z0 + 0.52, 96));
  const fins: P[][] = [];
  for (let i = 0; i < 9; i++) {
    const z = z0 + 0.52 + i * 0.022;
    fins.push(...ringProfile(0.17, 0.25, z, z + 0.01, 0.003));
  }
  k.add(M.fin, along(turn(fins, 96), Y_TO_Z), cylZ(0.17, z0 + 0.52, STACK_END - 0.02, 64));
  k.add(M.black, cylZ(0.2, STACK_END - 0.02, STACK_END, 96));
  for (let i = 0; i < 3; i++) {
    const a = Math.PI / 2 + (i - 1) * 0.35;
    k.put(Pc.led, [M.ledG, M.ledB, M.ledA][i], stand(new Vector3(Math.cos(a) * 0.15, Math.sin(a) * 0.15, STACK_END), Z, 0, 1));
  }
  // The camera's cable runs from the top box down to the stack.
  bundle(k, M, Pc, [[0.08, CELL_R + 0.1, CELL_Z1 - 0.05], [0.14, 0.56, 1.0], [0.16, 0.34, 1.2], [0.12, 0.24, 1.32]]);
}

// The primary baffle: a flocked black tube that runs forward from the hole.
function buildBaffle(k: Kit, M: Mats): void {
  k.add(M.black, cylZOpen(0.11, -0.3, MIRROR_Z + SAG, 64));
  k.add(M.flock, cylZOpen(0.105, -0.3, MIRROR_Z + SAG, 64));
  k.add(M.black, along(turn(ringProfile(0.105, 0.12, -0.32, -0.3, 0.003), 64), Y_TO_Z));
}

// The tube's cable: from the west trunnion over the cell to the top box.
// Its frame is the altitude axis, so its start stays put as the tube tilts.
function buildAxis(k: Kit, M: Mats, Pc: Pieces): void {
  bundle(k, M, Pc, [[-0.74, 0, 0], [-0.7, 0.2, 0.25], [-0.52, 0.56, 0.5], [-0.15, CELL_R + 0.1, 0.62]]);
}

/* ---------- the model ---------- */
// size scales the whole model.
export function buildModernScope(size: number): ModernScope {
  const root = new Group();
  root.scale.setScalar(size);
  const env = domeEnv();
  const M = materials(env);
  const Pc = pieces();
  // pier: fixed. az: turns on the pier's axis. alt: turns on the altitude axis.
  const pier = new Group(), az = new Group(), alt = new Group();
  alt.position.set(0, AXIS_Y, 0);
  az.add(alt);
  root.add(pier, az);
  const kPier = new Kit(), kFork = new Kit(), kTube = new Kit(), kAxis = new Kit();
  buildPier(kPier, M, Pc);
  buildFork(kFork, M, Pc);
  buildTube(kTube, M, Pc);
  buildBaffle(kTube, M);
  buildAxis(kAxis, M, Pc);
  kPier.build(pier);
  kFork.build(az);
  kTube.build(alt);
  kAxis.build(alt);

  // The mirrors: planar reflectors, so each one shows the scene with true parallax.
  // The primary's dish is too shallow to bend the view: its sag is 21 mm.
  // While a mirror renders, the dome map stands in for the dome.
  const mirror = (geo: BufferGeometry, res: number): Reflector => {
    const m = new Reflector(geo, { color: 0xdde2ea, textureWidth: res, textureHeight: res, clipBias: 0.003 });
    const base = m.onBeforeRender.bind(m);
    m.onBeforeRender = (r, s, c, g, mat, grp) => {
      const bg = s.background;
      s.background = env;
      base(r, s, c, g, mat, grp);
      s.background = bg;
    };
    return m;
  };
  // Both faces build facing +Z; the primary turns round to face the front.
  const primary = mirror(new RingGeometry(HOLE_R, MIRROR_R, 160, 1), 1024);
  primary.rotation.y = Math.PI;
  primary.position.z = MIRROR_Z + SAG / 2;
  const secondary = mirror(new CircleGeometry(SEC_R, 64), 512);
  secondary.position.z = SEC_Z;
  alt.add(primary, secondary);

  // Azimuth turns by -az, so east is +X.
  // Altitude tilts the tube up from the horizon.
  // Both axes are plain rotations, so the sweep never flips the tube.
  function setTube(altDeg: number, azDeg: number): void {
    alt.rotation.x = altDeg * DEG;
    az.rotation.y = -azDeg * DEG;
  }
  setTube(45, 0);
  return { root, setTube };
}
