// Load order: none.
// The module builds nothing until a caller asks for the modern scope.
import {
  BoxGeometry, BufferAttribute, BufferGeometry, CanvasTexture, CatmullRomCurve3, CylinderGeometry,
  EquirectangularReflectionMapping, ExtrudeGeometry, Group, InstancedMesh, LatheGeometry, Matrix4, Mesh,
  MeshStandardMaterial, Quaternion, RepeatWrapping, RingGeometry, SRGBColorSpace, Shape, SphereGeometry,
  TubeGeometry, Vector2, Vector3,
} from 'three';
import type { Material, MeshStandardMaterialParameters } from 'three';
import { lensGeometry, makeGlassMaterial } from './hero-glass.ts';

/* ---------- the modern scope: a fork-mounted astrograph with a cooled camera ---------- */
// An alt-az fork on direct drive, a carbon astrograph, a cooled CMOS camera and a guide scope.
// Sizes are in metres at size 1, as in world/hero-scope.ts.
// +Y is up, -Z is north, +X is east.
// The tube's front points -Z at rest.

export type ModernScope = {
  root: Group;
  // Points the tube at alt and az in degrees.
  // Azimuth runs from north through east.
  setTube(alt: number, az: number): void;
};

const DEG = Math.PI / 180;
// The fork's altitude axis, high over the pier.
// Its rear end clears the azimuth drive at the zenith.
const AXIS_Y = 2.35;
// The top face of the azimuth drive.
const AZ_TOP = 1.06;
// The column's top, under the drive housing.
const COLUMN_TOP = 0.94;
// The tines stand at this x, on each side of the tube.
const TINE_X = 0.21;
// The optical tube's outer radius.
const TUBE_R = 0.115;
// The objective lens: its rim plane and its radius.
// The lens builds at z 0; it moves to the front cell after building.
const LENS = { radius: 0.1, edge: 0, a: 0.1, b: 0.4 };
// The guide scope's axis height above the tube's axis.
const GUIDE_Y = TUBE_R + 0.018 + 0.05;

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
// A smooth arc from angle a0 to a1, in radians.
function arc(cx: number, cy: number, r: number, a0: number, a1: number, n: number): P[] {
  const out: P[] = [];
  for (let i = 0; i <= n; i++) {
    const a = a0 + (a1 - a0) * (i / n);
    out.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  return out;
}
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
const cylX = (r: number, a: number, b: number, segs = 48): BufferGeometry =>
  new CylinderGeometry(r, r, b - a, segs).rotateZ(-Math.PI / 2).translate((a + b) / 2, 0, 0);

// A box with chamfered edges, centred on the origin.
function chamferBox(w: number, h: number, d: number, c: number): BufferGeometry {
  const s = new Shape();
  const x = w / 2 - c, y = h / 2 - c;
  s.moveTo(-x, -y); s.lineTo(x, -y); s.lineTo(x, y); s.lineTo(-x, y); s.lineTo(-x, -y);
  const g = new ExtrudeGeometry(s, { depth: d - 2 * c, bevelEnabled: true, bevelThickness: c, bevelSize: c, bevelSegments: 1, curveSegments: 1 });
  return g.translate(0, 0, -(d - 2 * c) / 2);
}

// A knurled knob: a ridged disc about Y.
function knurl(r: number, h: number, ridges: number): BufferGeometry {
  const s = new Shape();
  for (let i = 0; i <= ridges * 2; i++) {
    const a = (i / (ridges * 2)) * Math.PI * 2, rr = i % 2 ? r : r * 0.955;
    if (i === 0) s.moveTo(rr * Math.cos(a), rr * Math.sin(a));
    else s.lineTo(rr * Math.cos(a), rr * Math.sin(a));
  }
  // The extrusion runs along Z, so it turns to stand along Y.
  return new ExtrudeGeometry(s, { depth: h, bevelEnabled: false }).rotateX(-Math.PI / 2);
}

// Stands a piece at p with its axis along dir.
const UP = new Vector3(0, 1, 0);
const qa = new Quaternion(), qb = new Quaternion(), sc = new Vector3(), dn = new Vector3();
function stand(p: Vector3, dir: Vector3, spin = 0, s = 1): Matrix4 {
  qa.setFromUnitVectors(UP, dn.copy(dir).normalize());
  qa.multiply(qb.setFromAxisAngle(UP, spin));
  return new Matrix4().compose(p, qa, sc.setScalar(s));
}

// A cable bundle: a black lead, an orange fibre and a blue data line.
function bundle(k: Kit, M: Mats, pts: [number, number, number][]): void {
  const runs: [MeshStandardMaterial, number, number][] = [[M.cable, 0, 0], [M.fibre, 0.009, 0.004], [M.lan, -0.007, 0.006]];
  for (const [mat, dx, dy] of runs) {
    const curve = new CatmullRomCurve3(pts.map(([x, y, z]) => new Vector3(x + dx, y + dy, z)));
    k.add(mat, new TubeGeometry(curve, 64, 0.006, 8, false));
  }
}

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
type Pieces = Record<'bolt' | 'socket' | 'tooth' | 'led', BufferGeometry>;
function pieces(): Pieces {
  return {
    // A hex bolt head.
    bolt: new CylinderGeometry(0.008, 0.008, 0.006, 6).translate(0, 0.003, 0),
    // A socket cap screw.
    socket: new CylinderGeometry(0.0055, 0.0055, 0.0055, 14).translate(0, 0.00275, 0),
    // One rack or gear tooth.
    tooth: new BoxGeometry(1, 1, 1),
    // A status lamp's dome.
    led: new SphereGeometry(0.0065, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2),
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

// Fine grain for the anodised roughness: a grey noise field.
function grainMap(): CanvasTexture {
  const S = 256, r = rng(11);
  const [c, x] = canvas(S, S);
  const img = x.createImageData(S, S);
  for (let i = 0; i < S * S; i++) {
    const v = 200 + r() * 55;
    img.data[i * 4] = v; img.data[i * 4 + 1] = v; img.data[i * 4 + 2] = v; img.data[i * 4 + 3] = 255;
  }
  x.putImageData(img, 0, 0);
  return tex(c, false, 3);
}

// A twill weave, as a bump map for the carbon tube.
function weaveMap(): CanvasTexture {
  const S = 128, cell = 8;
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
  return tex(c, false, 10);
}

// A scale face: fine ticks on satin metal, every 10 and every 30 degrees.
function dialMap(): CanvasTexture {
  const S = 1024, C = S / 2;
  const [c, x] = canvas(S, S);
  x.fillStyle = '#d9dde2';
  x.fillRect(0, 0, S, S);
  x.strokeStyle = '#1a1d22';
  for (let i = 0; i < 360; i++) {
    const a = (i / 360) * Math.PI * 2;
    const major = i % 30 === 0, mid = i % 10 === 0;
    const len = major ? 0.12 : mid ? 0.075 : 0.035;
    x.lineWidth = major ? 4 : mid ? 2.4 : 1.2;
    x.beginPath();
    x.moveTo(C + Math.cos(a) * C * 0.96, C + Math.sin(a) * C * 0.96);
    x.lineTo(C + Math.cos(a) * C * (0.96 - len), C + Math.sin(a) * C * (0.96 - len));
    x.stroke();
  }
  return tex(c, true);
}

// Metal reflects this: a dark sky, a dim floor and one soft box.
function studioEnv(): CanvasTexture {
  const W = 128, H = 64;
  const [c, x] = canvas(W, H);
  const g = x.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#5a6678');
  g.addColorStop(0.45, '#2a303b');
  g.addColorStop(0.55, '#15171c');
  g.addColorStop(1, '#0b0c0e');
  x.fillStyle = g;
  x.fillRect(0, 0, W, H);
  x.fillStyle = '#e8eef8';
  x.fillRect(W * 0.18, H * 0.12, W * 0.12, H * 0.14);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.mapping = EquirectangularReflectionMapping;
  return t;
}

/* ---------- materials ---------- */
type MatKey = 'anodised' | 'carbon' | 'fin' | 'dial' | 'steel' | 'darkSteel' | 'zinc' | 'rubber'
  | 'cable' | 'fibre' | 'lan' | 'filter' | 'ledG' | 'ledB' | 'ledA';
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

function materials(): { M: Mats; glass: Material } {
  const env = studioEnv();
  const std = (key: string, p: MeshStandardMaterialParameters): MeshStandardMaterial =>
    reflectOnly(new MeshStandardMaterial({ envMap: env, ...p }), key);
  const grain = grainMap(), weave = weaveMap(), dial = dialMap();
  const led = (c: number, key: MatKey): MeshStandardMaterial =>
    std(key, { color: c, emissive: c, emissiveIntensity: 2.5, roughness: 0.3 });
  const M: Mats = {
    // Grey anodised aluminium with a fine grain.
    anodised: std('anodised', { color: 0x7a818b, metalness: 0.3, roughness: 0.42, roughnessMap: grain }),
    // Matte black carbon with a twill weave.
    carbon: std('carbon', { color: 0x0b0b0d, metalness: 0, roughness: 0.6, bumpMap: weave, bumpScale: 0.6 }),
    // Dark-coated fins: a dull black, so the heat sink reads as one block.
    fin: std('fin', { color: 0x17191d, metalness: 0.3, roughness: 0.55 }),
    // Satin scales: engraved ticks on bright metal.
    dial: std('dial', { color: 0xffffff, metalness: 0.9, roughness: 0.35, map: dial }),
    steel: std('steel', { color: 0xb8bcc0, metalness: 1, roughness: 0.22 }),
    darkSteel: std('darkSteel', { color: 0x40444a, metalness: 0.9, roughness: 0.38 }),
    zinc: std('zinc', { color: 0x9da1a5, metalness: 1, roughness: 0.42 }),
    rubber: std('rubber', { color: 0x101012, metalness: 0, roughness: 0.9 }),
    cable: std('cable', { color: 0x111113, metalness: 0, roughness: 0.8 }),
    fibre: std('fibre', { color: 0xd9731f, metalness: 0, roughness: 0.5 }),
    lan: std('lan', { color: 0x2f6fd6, metalness: 0, roughness: 0.5 }),
    // A coated filter: a blue glass disc.
    filter: std('filter', { color: 0x2a4a7a, metalness: 0.2, roughness: 0.06 }),
    ledG: led(0x39ff7a, 'ledG'),
    ledB: led(0x3aa0ff, 'ledB'),
    ledA: led(0xffb23a, 'ledA'),
  };
  // The objective: a coated glass with no stars, as the hero's dark glass.
  const glass = makeGlassMaterial(null, LENS).material;
  return { M, glass };
}

/* ---------- the pier: it never moves ---------- */
function buildPier(k: Kit, M: Mats, Pc: Pieces): void {
  // Three levelling feet under the plinth.
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + Math.PI / 6;
    k.add(M.rubber, cylY(0.034, 0, 0.02, 20).translate(Math.cos(a) * 0.3, 0, Math.sin(a) * 0.3));
  }
  // The plinth: a squat anodised base with a chamfered top.
  k.add(M.anodised, turn(edges([[0, 0.02], [0.36, 0.02], [0.36, 0.1], [0.34, 0.12], [0, 0.12]])));
  // The column, with two rolled ribs.
  k.add(M.anodised, turn([[[0.11, 0.12], [0.11, COLUMN_TOP]]]));
  k.add(M.anodised, turn(ringProfile(0.11, 0.122, 0.3, 0.32, 0.004)), turn(ringProfile(0.11, 0.122, 0.66, 0.68, 0.004)));
  // The azimuth drive housing.
  k.add(M.anodised, turn(edges([[0.11, 0.9], [0.24, COLUMN_TOP], [0.24, 1.0], [0.2, AZ_TOP], [0, AZ_TOP]])));
  // The azimuth scale: a fixed face on the drive.
  k.add(M.dial, new RingGeometry(0.001, 0.235, 128, 1).rotateX(-Math.PI / 2).translate(0, AZ_TOP + 0.001, 0));
  // The cable tray: a channel on the back of the column.
  k.add(M.anodised,
    chamferBox(0.09, 0.68, 0.01, 0.002).translate(0, 0.56, -0.2),
    chamferBox(0.01, 0.68, 0.05, 0.002).translate(-0.045, 0.56, -0.175),
    chamferBox(0.01, 0.68, 0.05, 0.002).translate(0.045, 0.56, -0.175));
  // The power and data box on the plinth.
  k.add(M.anodised, chamferBox(0.16, 0.14, 0.16, 0.012).translate(0.22, 0.2, 0));
  for (const dy of [-0.03, 0.03]) k.put(Pc.socket, M.zinc, stand(new Vector3(0.302, 0.2 + dy, 0), new Vector3(1, 0, 0), 0, 1.3));
  for (let i = 0; i < 3; i++) {
    const p = new Vector3(0.195 + i * 0.025, 0.255, 0.082);
    k.put(Pc.led, [M.ledG, M.ledB, M.ledA][i], stand(p, new Vector3(0, 0, 1), 0, 1.1));
  }
  // Four screws hold the box lid.
  for (const [x, z] of [[0.15, 0.07], [0.29, 0.07], [0.15, -0.07], [0.29, -0.07]] as P[]) {
    k.put(Pc.socket, M.zinc, stand(new Vector3(x, 0.27, z), UP, 0, 0.9));
  }
  // The mains and data run up the tray, behind the column.
  bundle(k, M, [
    [0.31, 0.2, 0], [0.27, 0.16, -0.1], [0.12, 0.16, -0.22], [0, 0.3, -0.25],
    [0, 0.7, -0.27], [0, 0.98, -0.28], [0, 1.02, -0.12], [0, 1.1, 0],
  ]);
}

/* ---------- the fork: it turns in azimuth ---------- */
// The fork's frame has the pier at its origin.
// Its altitude axis runs along X at AXIS_Y.
function buildFork(k: Kit, M: Mats, Pc: Pieces): void {
  // The base disc sits on the drive.
  k.add(M.anodised, turn(edges([[0, AZ_TOP], [0.2, AZ_TOP], [0.2, 1.14], [0, 1.14]])));
  for (const s of [-1, 1]) {
    const x = s * TINE_X;
    // A tine: a chamfered fork arm to the altitude axis.
    k.add(M.anodised, chamferBox(0.04, AXIS_Y + 0.06 - 1.14, 0.14, 0.008).translate(x, (AXIS_Y + 0.06 + 1.14) / 2, 0));
    // A cast collar on the tine's outer face, centred on the axis.
    const a = s > 0 ? [TINE_X + 0.02, TINE_X + 0.05] : [-TINE_X - 0.05, -TINE_X - 0.02];
    k.add(M.anodised, cylX(0.085, a[0], a[1]).translate(0, AXIS_Y, 0));
    // A gusset ties the tine to the base disc.
    k.add(M.anodised, chamferBox(0.03, 0.12, 0.12, 0.004).translate(x, 1.2, 0));
  }
  // The direct-drive stator: a ring on the east side.
  k.add(M.anodised, turn(ringProfile(0.13, 0.17, 0.26, 0.3, 0.004), 96).applyMatrix4(Y_TO_X).translate(0, AXIS_Y, 0));
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    k.put(Pc.bolt, M.zinc, stand(new Vector3(0.302, AXIS_Y + Math.cos(a) * 0.15, Math.sin(a) * 0.15), new Vector3(1, 0, 0), a, 0.8));
  }
  // The altitude encoder's read head on a bracket, west side.
  k.add(M.anodised,
    chamferBox(0.08, 0.03, 0.03, 0.004).translate(-0.27, AXIS_Y + 0.13, 0),
    chamferBox(0.03, 0.05, 0.03, 0.004).translate(-0.3, AXIS_Y + 0.155, 0));
  // The cable from the pier climbs the west tine to the tube.
  bundle(k, M, [[0, 1.1, 0], [-0.07, 1.3, 0], [-0.15, 1.75, 0], [-0.17, AXIS_Y - 0.3, 0], [-0.17, AXIS_Y, 0]]);
}

/* ---------- the tube: it tilts on the altitude axis ---------- */
// +Z is the tube's own axis. The front points -Z.
// The origin is the altitude axis.
// Z_REAR and Z_FRONT bound the tube body.
const Z_FRONT = -0.4, Z_REAR = 0.4;

function buildOta(k: Kit, M: Mats, Pc: Pieces): void {
  // The carbon tube body.
  k.add(M.carbon, along(turn([[[TUBE_R, Z_FRONT], [TUBE_R, Z_REAR]]], 96), Y_TO_Z));
  // The front cell: an anodised ring round the objective.
  k.add(M.anodised, along(turn(ringProfile(0.1, 0.13, -0.44, -0.38, 0.004), 96), Y_TO_Z));
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    k.put(Pc.socket, M.zinc, stand(new Vector3(Math.cos(a) * 0.115, Math.sin(a) * 0.115, -0.44), new Vector3(0, 0, -1), a, 0.9));
  }
  // The dew hood: a carbon shell with a rolled lip at the front.
  k.add(M.carbon, along(turn([
    [[0.128, -0.66], [0.128, -0.44]],
    arc(0.123, -0.66, 0.005, 0, -Math.PI, 6),
    [[0.118, -0.66], [0.118, -0.44]],
  ], 96), Y_TO_Z));
  // The motorised dust cap: a motor on the hood, the cap parked beside it.
  k.add(M.anodised, chamferBox(0.05, 0.05, 0.06, 0.005).translate(0.15, 0, -0.52));
  k.add(M.anodised, cylX(0.13, 0.2, 0.212, 64).translate(0, 0, -0.52));
  // The rear flange, with its bolts.
  k.add(M.anodised, along(turn(ringProfile(0.115, 0.13, Z_REAR, 0.44, 0.004), 96), Y_TO_Z));
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    k.put(Pc.bolt, M.zinc, stand(new Vector3(Math.cos(a) * 0.122, Math.sin(a) * 0.122, 0.44), new Vector3(0, 0, 1), a));
  }
  // The motorised focuser: a body, a motor on its side, a draw tube with a rack.
  k.add(M.anodised, cylZ(0.072, 0.44, 0.6), chamferBox(0.08, 0.07, 0.1, 0.008).translate(0.11, 0, 0.5));
  k.add(M.steel, cylZ(0.04, 0.6, 0.78, 48));
  k.add(M.darkSteel, new BoxGeometry(0.012, 0.012, 0.16).translate(0.048, 0, 0.69));
  for (let i = 0; i < 10; i++) {
    k.put(Pc.tooth, M.darkSteel, boxAt(new Vector3(0.056, 0, 0.62 + i * 0.015), new Vector3(1, 0, 0), new Vector3(0, 1, 0), new Vector3(0, 0, 1), 0.005, 0.012, 0.0045));
  }
  // The focuser's knurled knob, on the body's rear.
  k.add(M.anodised, along(knurl(0.034, 0.02, 24), Y_TO_Z, 0, 0, 0.6));
  // The filter wheel: a body, a wheel with five blue filters.
  k.add(M.anodised, cylZ(0.085, 0.78, 0.86), cylZ(0.096, 0.845, 0.857));
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    k.add(M.filter, cylZ(0.02, 0.857, 0.865, 24).translate(Math.cos(a) * 0.058, Math.sin(a) * 0.058, 0));
  }
  // The cooled camera: its body, a dew heater band and a fin block.
  k.add(M.anodised, cylZ(0.088, 0.86, 1.04));
  k.add(M.rubber, cylZ(0.095, 0.9, 0.95));
  const fins: P[][] = [];
  for (let i = 0; i < 12; i++) {
    const z = 1.04 + i * 0.02;
    fins.push(...ringProfile(0.1, 0.14, z, z + 0.008, 0.002));
  }
  k.add(M.fin, along(turn(fins, 96), Y_TO_Z), cylZ(0.1, 1.04, 1.28));
  k.add(M.anodised, cylZ(0.1, 1.28, 1.3));
  // Status lamps on the camera's back, each a different colour.
  const lamps: [MatKey, number][] = [['ledG', 0], ['ledB', 2.094], ['ledA', 4.189]];
  for (const [key, a] of lamps) {
    k.put(Pc.led, M[key], stand(new Vector3(Math.cos(a) * 0.05, Math.sin(a) * 0.05, 1.3), new Vector3(0, 0, 1), 0, 1.2));
  }
  // The guide scope rides on a dovetail bar above the tube.
  k.add(M.anodised, chamferBox(0.04, 0.018, 0.9, 0.004).translate(0, TUBE_R + 0.009, 0));
  for (const z of [-0.2, 0.25]) {
    k.add(M.anodised, along(turn(ringProfile(0.038, 0.06, z - 0.03, z + 0.03, 0.003), 48), Y_TO_Z, 0, GUIDE_Y, 0));
  }
  k.add(M.anodised, cylZ(0.036, -0.38, 0.32, 40).translate(0, GUIDE_Y, 0));
  k.add(M.filter, cylZ(0.034, -0.384, -0.38, 40).translate(0, GUIDE_Y, 0));
  k.add(M.anodised, cylZ(0.03, 0.32, 0.36, 32).translate(0, GUIDE_Y, 0));
  // The camera cable runs down the west side of the tube.
  bundle(k, M, [[-0.17, 0, 0], [-0.175, -0.12, 0.02], [-0.16, -0.2, 0.25], [-0.15, -0.17, 0.6], [-0.16, -0.16, 1.0], [-0.12, -0.15, 1.25], [-0.05, -0.12, 1.36], [-0.02, -0.05, 1.33]]);
  // The saddle: two tube rings on a plate under the tube.
  for (const z of [-0.2, 0.2]) {
    k.add(M.anodised, along(turn(ringProfile(TUBE_R - 0.002, TUBE_R + 0.02, z - 0.025, z + 0.025, 0.003), 72), Y_TO_Z));
  }
  k.add(M.anodised, chamferBox(0.2, 0.025, 0.5, 0.006).translate(0, -0.14, 0));
  // The hub on the east side: the altitude drive's rotor.
  k.add(M.anodised, cylX(0.12, 0.27, 0.3, 64));
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    k.put(Pc.bolt, M.zinc, stand(new Vector3(0.302, Math.cos(a) * 0.095, Math.sin(a) * 0.095), new Vector3(1, 0, 0), a, 0.8));
  }
  // The altitude encoder: a satin scale on the west side.
  k.add(M.dial, new RingGeometry(0.001, 0.135, 128, 1).rotateY(-Math.PI / 2).translate(-0.272, 0, 0));
  k.add(M.darkSteel, cylX(0.135, -0.27, -0.25, 64));
}

// A box piece at p, sized along three given axes.
function boxAt(p: Vector3, xa: Vector3, ya: Vector3, za: Vector3, sx: number, sy: number, sz: number): Matrix4 {
  return new Matrix4().makeBasis(xa.clone().multiplyScalar(sx), ya.clone().multiplyScalar(sy), za.clone().multiplyScalar(sz)).setPosition(p);
}

/* ---------- the model ---------- */
// size scales the whole model.
export function buildModernScope(size: number): ModernScope {
  const root = new Group();
  root.scale.setScalar(size);
  const { M, glass: glassMat } = materials();
  const Pc = pieces();
  // pier: fixed. az: turns on the pier's axis. alt: turns on the fork's axis.
  const pier = new Group(), az = new Group(), alt = new Group();
  alt.position.set(0, AXIS_Y, 0);
  az.add(alt);
  root.add(pier, az);
  const kPier = new Kit(), kAz = new Kit(), kAlt = new Kit();
  buildPier(kPier, M, Pc);
  buildFork(kAz, M, Pc);
  buildOta(kAlt, M, Pc);
  kPier.build(pier);
  kAz.build(az);
  kAlt.build(alt);
  // The objective: a lens that faces the front.
  const lens = lensGeometry(LENS, 0.02).rotateY(Math.PI).translate(0, 0, Z_FRONT - 0.02);
  alt.add(new Mesh(lens, glassMat));

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
