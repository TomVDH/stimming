// Load order: none.
// The module builds nothing until a caller asks for the modern scope.
import {
  BoxGeometry, BufferAttribute, BufferGeometry, CanvasTexture, CatmullRomCurve3, CylinderGeometry,
  EquirectangularReflectionMapping, ExtrudeGeometry, Group, InstancedMesh, LatheGeometry, Matrix4, Mesh,
  MeshPhysicalMaterial, MeshStandardMaterial, Quaternion, RepeatWrapping, RingGeometry, SRGBColorSpace, Shape, SphereGeometry,
  TorusGeometry, TubeGeometry, Vector2, Vector3,
} from 'three';
import type { Material, MeshStandardMaterialParameters } from 'three';

/* ---------- the modern scope: a shrouded 1 m Ritchey-Chretien on a tall fork ---------- */
// A closed thermal shroud hides the truss.
// The front aperture shows the secondary and its vanes.
// The rear mirror cell and the Cassegrain stack stay in the open.
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
// The altitude axis, high over the yoke.
// It clears the rear end at the zenith.
const AXIS_Y = 4.5;
// The tube's balance point: the altitude axis sits this far behind its centre.
const PIVOT_Z = 0.6;
// The yoke's tines stand at this x.
const TINE_X = 0.95;
// The top face of the azimuth drive.
const AZ_TOP = 1.65;
// The yoke's base crossbar sits between these heights.
const YOKE_Y0 = 1.85, YOKE_Y1 = 2.1;

// The shroud runs from its front flange to the rear joint.
const FRONT_Z = -1.42, SHROUD_BACK = 1.3, SHROUD_R = 0.64;
// The front aperture's radius.
const APERTURE_R = 0.5;
// The truss: its rails meet the front flange and the rear cell.
const R_CELL = 0.6;
// The primary: its face, its radius, and the hole for the Cassegrain port.
const CELL_Z = 1.3, CELL_BACK = 1.62, MIRROR_Z = 1.3, MIRROR_R = 0.5, HOLE_R = 0.13;
// The secondary: its face and its radius on the axis.
const SEC_Z = -1.2, SEC_R = 0.16;
// Radii of curvature: the primary is concave at f/8, and the secondary is convex.
const PRIMARY_R = 16, SEC_CONVEX_R = 0.9;
// The shroud's door: an arc round +X, from DOOR_Z0 to DOOR_Z1.
const DOOR_Z0 = -0.9, DOOR_Z1 = -0.2, DOOR_HALF = 0.42;
// The camera's last face, in tube coordinates.
const CAM_END = 2.82;
// The guide scope's axis height above the shroud.
const GUIDE_Y = SHROUD_R + 0.07;

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
// phi0 and phiLen turn only part of the way round.
function turn(runs: P[][], segs = 72, phi0 = 0, phiLen = Math.PI * 2): BufferGeometry {
  return mergeGeos(runs.map(r => new LatheGeometry(r.map(([x, y]) => new Vector2(x, y)), segs, phi0, phiLen)));
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

// A mirror face: a polar grid lifted onto a sphere, so reflections bend across it.
// The sag is r squared over 2R, the sphere's exact sag near the axis.
// facing: -1 for a face that looks along -Z, +1 for one that looks along +Z.
function mirrorFace(rIn: number, rOut: number, z0: number, R: number, facing: number, rings = 32, segs = 192): BufferGeometry {
  const pos: number[] = [], uv: number[] = [];
  for (let i = 0; i <= rings; i++) {
    const r = rIn + ((rOut - rIn) * i) / rings;
    for (let j = 0; j <= segs; j++) {
      const t = (j / segs) * Math.PI * 2;
      const x = r * Math.cos(t), y = r * Math.sin(t);
      pos.push(x, y, z0 - (r * r) / (2 * R));
      uv.push(x / (2 * rOut) + 0.5, y / (2 * rOut) + 0.5);
    }
  }
  const quads = (flip: boolean): number[] => {
    const idx: number[] = [];
    for (let i = 0; i < rings; i++) {
      for (let j = 0; j < segs; j++) {
        const a = i * (segs + 1) + j, b = a + segs + 1;
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
  // The winding sets the normal's sign: flip it when the face looks the wrong way.
  const nz = g.getAttribute('normal').getZ(segs / 2 + (segs + 1));
  if (nz * facing < 0) {
    g.setIndex(quads(true));
    g.computeVertexNormals();
  }
  return g;
}

// The lathe's Y axis turns onto Z, the tube's axis.
const Y_TO_Z = new Matrix4().makeRotationX(Math.PI / 2);
// The lathe's Y axis turns onto X, the altitude axis.
const Y_TO_X = new Matrix4().makeRotationZ(-Math.PI / 2);
const along = (g: BufferGeometry, m: Matrix4, x = 0, y = 0, z = 0): BufferGeometry => g.applyMatrix4(m).translate(x, y, z);

// Cylinders along each axis, from a to b.
const cylZ = (r: number, a: number, b: number, segs = 48): BufferGeometry =>
  new CylinderGeometry(r, r, b - a, segs).rotateX(Math.PI / 2).translate(0, 0, (a + b) / 2);
// The same cylinder with no caps: a skin.
const cylZOpen = (r: number, a: number, b: number, segs = 128): BufferGeometry =>
  new CylinderGeometry(r, r, b - a, segs, 1, true).rotateX(Math.PI / 2).translate(0, 0, (a + b) / 2);
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

// A spoked hand wheel about Y, rim radius r.
function handWheel(r: number): { steel: BufferGeometry; brass: BufferGeometry } {
  const rim = new TorusGeometry(r, r * 0.09, 8, 40).rotateX(Math.PI / 2);
  const parts: BufferGeometry[] = [rim, new CylinderGeometry(r * 0.2, r * 0.2, r * 0.35, 16)];
  for (let i = 0; i < 4; i++) {
    const spoke = new CylinderGeometry(r * 0.05, r * 0.07, r, 8).rotateZ(Math.PI / 2).translate(r / 2, 0, 0);
    parts.push(spoke.rotateY((i / 4) * Math.PI * 2 + Math.PI / 4));
  }
  // The handle stands off the rim, parallel to the axle.
  const grip = mergeGeos([
    new CylinderGeometry(r * 0.04, r * 0.04, r * 0.3, 8).translate(r, r * 0.15, 0),
    new CylinderGeometry(r * 0.09, r * 0.11, r * 0.45, 12).translate(r, r * 0.52, 0),
  ]);
  return { steel: mergeGeos(parts), brass: grip };
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

// A cable bundle: a black lead, an orange fibre and a blue data line.
// Each run has a sleeve ring at its start.
function bundle(k: Kit, M: Mats, Pc: Pieces, pts: [number, number, number][]): void {
  const runs: [MeshStandardMaterial, number, number][] = [[M.cable, 0, 0], [M.fibre, 0.012, 0.006], [M.lan, -0.01, 0.008]];
  for (const [mat, dx, dy] of runs) {
    const curve = new CatmullRomCurve3(pts.map(([x, y, z]) => new Vector3(x + dx, y + dy, z)));
    k.add(mat, new TubeGeometry(curve, 96, 0.008, 8, false));
  }
  // Clamps hold the bundle every third point.
  for (let i = 1; i < pts.length - 1; i += 3) {
    const [x, y, z] = pts[i];
    k.put(Pc.tooth, M.darkSteel, boxAt(new Vector3(x, y, z), new Vector3(1, 0, 0), new Vector3(0, 1, 0), new Vector3(0, 0, 1), 0.05, 0.03, 0.02));
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
type Pieces = Record<'bolt' | 'socket' | 'rivet' | 'tooth' | 'led' | 'beam', BufferGeometry>;
function pieces(): Pieces {
  return {
    // A hex bolt head.
    bolt: new CylinderGeometry(0.014, 0.014, 0.01, 6).translate(0, 0.005, 0),
    // A socket cap screw.
    socket: new CylinderGeometry(0.01, 0.01, 0.01, 14).translate(0, 0.005, 0),
    // A domed rivet head.
    rivet: new SphereGeometry(0.009, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.55, 1),
    // The unit box: a rack tooth, a clamp, a louvre.
    tooth: new BoxGeometry(1, 1, 1),
    // A status lamp's dome.
    led: new SphereGeometry(0.012, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2),
    // The unit cylinder every truss member stretches.
    beam: new CylinderGeometry(1, 1, 1, 10),
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

// A twill weave, as a bump map for the carbon truss.
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

// The shroud's paint: a dark graphite coat with soft tone and bare chips.
// The green channel of the second map holds the roughness.
function paintMaps(): { map: CanvasTexture; rough: CanvasTexture } {
  const S = 512, r = rng(23);
  const [c, x] = canvas(S, S), [c2, y] = canvas(S, S);
  x.fillStyle = '#2b2f36';
  x.fillRect(0, 0, S, S);
  y.fillStyle = 'rgb(170,170,170)';
  y.fillRect(0, 0, S, S);
  // Soft clouds of tone: the coat ages unevenly.
  for (let i = 0; i < 160; i++) {
    const px = r() * S, py = r() * S, rad = 20 + r() * 70;
    const col = r() < 0.5 ? '90,96,104' : '20,22,26';
    const g = x.createRadialGradient(px, py, 0, px, py, rad);
    g.addColorStop(0, `rgba(${col},0.08)`);
    g.addColorStop(1, `rgba(${col},0)`);
    x.fillStyle = g;
    x.fillRect(px - rad, py - rad, rad * 2, rad * 2);
  }
  // Chips show bare metal: lighter, and shinier.
  for (let i = 0; i < 90; i++) {
    const px = r() * S, py = r() * S, s = 0.8 + r() ** 3 * 2;
    x.fillStyle = 'rgb(104,110,118)';
    x.beginPath(); x.arc(px, py, s, 0, Math.PI * 2); x.fill();
    y.fillStyle = 'rgb(60,60,60)';
    y.beginPath(); y.arc(px, py, s, 0, Math.PI * 2); y.fill();
  }
  return { map: tex(c, true), rough: tex(c2, false) };
}

// Sand-cast iron under paint: a fine grain and a soft mottle.
function castMap(): CanvasTexture {
  const S = 256, r = rng(5);
  const [c, x] = canvas(S, S);
  const img = x.createImageData(S, S);
  for (let i = 0; i < S * S; i++) {
    const v = 255 - r() * 12;
    img.data[i * 4] = v; img.data[i * 4 + 1] = v; img.data[i * 4 + 2] = v; img.data[i * 4 + 3] = 255;
  }
  x.putImageData(img, 0, 0);
  for (let i = 0; i < 60; i++) {
    const px = r() * S, py = r() * S, rad = 8 + r() * 24;
    const g = x.createRadialGradient(px, py, 0, px, py, rad);
    g.addColorStop(0, 'rgba(120,120,110,0.035)');
    g.addColorStop(1, 'rgba(120,120,110,0)');
    x.fillStyle = g;
    x.fillRect(px - rad, py - rad, rad * 2, rad * 2);
  }
  return tex(c, true, 4);
}

// A scale face: turned satin metal, engraved ticks, and a label at each major mark.
// label(i) gives the text for tick i.
function scaleMap(ticks: number, major: number, label: (i: number) => string): CanvasTexture {
  const S = 1024, C = S / 2, r = rng(ticks);
  const [c, x] = canvas(S, S);
  x.fillStyle = '#d9dde2';
  x.fillRect(0, 0, S, S);
  // Fine turning rings catch the light unevenly.
  for (let rr = 4; rr < C; rr += 3) {
    x.strokeStyle = `rgba(60,64,70,${0.03 + r() * 0.06})`;
    x.lineWidth = 1.5;
    x.beginPath(); x.arc(C, C, rr, 0, Math.PI * 2); x.stroke();
  }
  x.strokeStyle = '#17191e';
  x.fillStyle = '#17191e';
  x.lineWidth = 3;
  x.beginPath(); x.arc(C, C, C * 0.965, 0, Math.PI * 2); x.stroke();
  x.beginPath(); x.arc(C, C, C * 0.83, 0, Math.PI * 2); x.stroke();
  for (let i = 0; i < ticks; i++) {
    const a = (i / ticks) * Math.PI * 2 - Math.PI / 2;
    const len = i % major === 0 ? 0.12 : i % (major / 2) === 0 ? 0.085 : 0.05;
    x.lineWidth = i % major === 0 ? 3.2 : 2;
    x.beginPath();
    x.moveTo(C + Math.cos(a) * C * 0.965, C + Math.sin(a) * C * 0.965);
    x.lineTo(C + Math.cos(a) * C * (0.965 - len), C + Math.sin(a) * C * (0.965 - len));
    x.stroke();
  }
  x.font = 'bold 40px Georgia, "Times New Roman", serif';
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  for (let i = 0; i < ticks; i += major) {
    const a = (i / ticks) * Math.PI * 2 - Math.PI / 2;
    x.save();
    x.translate(C + Math.cos(a) * C * 0.75, C + Math.sin(a) * C * 0.75);
    x.rotate(a + Math.PI / 2);
    x.fillText(label(i), 0, 0);
    x.restore();
  }
  return tex(c, true);
}

// Metal reflects this: a dark sky, a dim floor and one soft box.
function studioEnv(): CanvasTexture {
  const W = 512, H = 256;
  const [c, x] = canvas(W, H);
  // Sky: deep blue overhead, a pale band at the horizon, a dark ground.
  const g = x.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#1d2638');
  g.addColorStop(0.42, '#55657e');
  g.addColorStop(0.5, '#c9d3e0');
  g.addColorStop(0.56, '#2a2e36');
  g.addColorStop(1, '#070809');
  x.fillStyle = g;
  x.fillRect(0, 0, W, H);
  // Soft light panels round the horizon: every mirror angle catches one.
  for (let i = 0; i < 6; i++) {
    const cx = W * (0.08 + i * 0.17), cy = H * (0.22 + (i % 2) * 0.08);
    const pg = x.createRadialGradient(cx, cy, 2, cx, cy, W * 0.07);
    pg.addColorStop(0, '#ffffff');
    pg.addColorStop(0.6, 'rgba(235,242,255,0.9)');
    pg.addColorStop(1, 'rgba(235,242,255,0)');
    x.fillStyle = pg;
    x.fillRect(cx - W * 0.08, cy - W * 0.08, W * 0.16, W * 0.16);
  }
  // A dark scrim between two panels, so the pattern reads.
  x.fillStyle = '#0d0f13';
  for (let i = 0; i < 4; i++) x.fillRect(W * (0.6 + i * 0.03), H * 0.5, W * 0.01, H * 0.2);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.mapping = EquirectangularReflectionMapping;
  return t;
}

/* ---------- materials ---------- */
type MatKey = 'anodised' | 'paint' | 'cast' | 'carbon' | 'fin' | 'dialAz' | 'dialAlt' | 'steel' | 'darkSteel'
  | 'zinc' | 'brass' | 'rubber' | 'mirror' | 'ceramic' | 'cable' | 'fibre' | 'lan' | 'filter'
  | 'ledG' | 'ledB' | 'ledA';
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

function materials(): Mats {
  const env = studioEnv();
  const std = (key: string, p: MeshStandardMaterialParameters): MeshStandardMaterial =>
    reflectOnly(new MeshStandardMaterial({ envMap: env, ...p }), key);
  const grain = grainMap(), weave = weaveMap(), paint = paintMaps(), cast = castMap();
  const az = scaleMap(360, 30, i => String(i));
  const alt = scaleMap(360, 30, i => { const d = i % 180; return String(d <= 90 ? d : 180 - d); });
  const led = (c: number, key: MatKey): MeshStandardMaterial =>
    std(key, { color: c, emissive: c, emissiveIntensity: 2.5, roughness: 0.3 });
  return {
    // Grey anodised aluminium with a fine grain.
    anodised: std('anodised', { color: 0x8d939b, metalness: 0.4, roughness: 0.34, roughnessMap: grain }),
    // The shroud's graphite paint, with chips and wear.
    paint: std('paint', { color: 0xffffff, map: paint.map, roughness: 1, roughnessMap: paint.rough, metalness: 0.15 }),
    // Sand-cast iron under a grey-green coat.
    cast: std('cast', { color: 0x6b7466, roughness: 0.58, metalness: 0, map: cast }),
    // Matte black carbon with a twill weave.
    carbon: std('carbon', { color: 0x0b0b0d, metalness: 0, roughness: 0.6, bumpMap: weave, bumpScale: 0.6 }),
    // Dark-coated fins: a dull black, so the heat sink reads as one block.
    fin: std('fin', { color: 0x17191d, metalness: 0.3, roughness: 0.55 }),
    // Satin scales: engraved ticks on bright metal, labelled in degrees.
    dialAz: std('dialAz', { color: 0xffffff, metalness: 0.9, roughness: 0.35, map: az }),
    dialAlt: std('dialAlt', { color: 0xffffff, metalness: 0.9, roughness: 0.35, map: alt }),
    steel: std('steel', { color: 0xb8bcc0, metalness: 1, roughness: 0.22 }),
    darkSteel: std('darkSteel', { color: 0x40444a, metalness: 0.9, roughness: 0.38 }),
    zinc: std('zinc', { color: 0x9da1a5, metalness: 1, roughness: 0.42 }),
    // Turned brass for the hand wheel's grips.
    brass: std('brass', { color: 0xc9a467, metalness: 1, roughness: 0.3 }),
    rubber: std('rubber', { color: 0x101012, metalness: 0, roughness: 0.9 }),
    // The primary and secondary: a bright, nearly perfect metal.
    // Coated aluminium with a faint thin-film tint, so the glint carries colour.
    mirror: reflectOnly(new MeshPhysicalMaterial({
      envMap: env, color: 0xe6ebf2, metalness: 1, roughness: 0.03,
      iridescence: 0.12, iridescenceIOR: 1.3, iridescenceThicknessRange: [180, 320], envMapIntensity: 1.1,
    }), 'mirror'),
    // The primary's blank: dark ceramic, so the mirror edge reads as glass.
    ceramic: std('ceramic', { color: 0x1c1f24, metalness: 0.1, roughness: 0.7 }),
    cable: std('cable', { color: 0x111113, metalness: 0, roughness: 0.8 }),
    fibre: std('fibre', { color: 0xd9731f, metalness: 0, roughness: 0.5 }),
    lan: std('lan', { color: 0x2f6fd6, metalness: 0, roughness: 0.5 }),
    // A coated filter: a blue glass disc.
    filter: std('filter', { color: 0x2a4a7a, metalness: 0.2, roughness: 0.06 }),
    ledG: led(0x39ff7a, 'ledG'),
    ledB: led(0x3aa0ff, 'ledB'),
    ledA: led(0xffb23a, 'ledA'),
  };
}

/* ---------- the pier: it never moves ---------- */
function buildPier(k: Kit, M: Mats, Pc: Pieces): void {
  // The plinth: a wide cast base with a chamfered top and anchor bolts.
  k.add(M.cast, turn(edges([[0, 0.02], [1.2, 0.02], [1.2, 0.22], [1.12, 0.3], [0, 0.3]])));
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    k.put(Pc.bolt, M.zinc, stand(new Vector3(Math.cos(a) * 1.08, 0.3, Math.sin(a) * 1.08), UP, a, 1.6));
  }
  // The column, with two rolled ribs.
  k.add(M.anodised, turn([[[0.4, 0.3], [0.4, 1.35]]]));
  k.add(M.anodised, turn(ringProfile(0.4, 0.43, 0.6, 0.63, 0.006)), turn(ringProfile(0.4, 0.43, 1.0, 1.03, 0.006)));
  // The azimuth drive housing, with a bolt ring at its foot.
  k.add(M.anodised, turn(edges([[0.4, 1.3], [0.95, 1.35], [0.95, 1.55], [0.85, AZ_TOP], [0, AZ_TOP]])));
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    k.put(Pc.socket, M.zinc, stand(new Vector3(Math.cos(a) * 0.9, 1.36, Math.sin(a) * 0.9), new Vector3(0, -1, 0), a, 1.2));
  }
  // The azimuth scale: a labelled face on the drive.
  k.add(M.dialAz, new RingGeometry(0.001, 0.94, 160, 1).rotateX(-Math.PI / 2).translate(0, AZ_TOP + 0.001, 0));
  // The azimuth hand wheel: a boss on the housing's south face.
  k.add(M.darkSteel, cylZ(0.12, 0.9, 1.06).translate(0, 1.5, 0));
  const hw = handWheel(0.22);
  k.add(M.darkSteel, hw.steel.rotateX(Math.PI / 2).translate(0, 1.5, 1.1));
  k.add(M.brass, hw.brass.rotateX(Math.PI / 2).translate(0, 1.5, 1.1));
  // The cable tray: a plate and two lips behind the column.
  k.add(M.anodised,
    chamferBox(0.2, 1.0, 0.02, 0.004).translate(0, 0.85, -0.5),
    chamferBox(0.02, 1.0, 0.12, 0.004).translate(-0.1, 0.85, -0.44),
    chamferBox(0.02, 1.0, 0.12, 0.004).translate(0.1, 0.85, -0.44));
  // The power and data box on the plinth.
  k.add(M.anodised, chamferBox(0.34, 0.26, 0.3, 0.02).translate(0.7, 0.44, 0));
  for (const dy of [-0.06, 0.06]) k.put(Pc.socket, M.zinc, stand(new Vector3(0.872, 0.44 + dy, 0), new Vector3(1, 0, 0), 0, 1.4));
  for (let i = 0; i < 3; i++) {
    const p = new Vector3(0.6 + i * 0.05, 0.5, 0.152);
    k.put(Pc.led, [M.ledG, M.ledB, M.ledA][i], stand(p, new Vector3(0, 0, 1), 0, 1.2));
  }
  // Four screws hold the box lid.
  for (const [x, z] of [[0.55, 0.12], [0.85, 0.12], [0.55, -0.12], [0.85, -0.12]] as P[]) {
    k.put(Pc.socket, M.zinc, stand(new Vector3(x, 0.572, z), UP, 0, 1));
  }
  // The mains and data run up the tray, behind the column.
  bundle(k, M, Pc, [
    [0.87, 0.44, 0], [0.7, 0.3, -0.12], [0.3, 0.3, -0.5], [0, 0.5, -0.6],
    [0, 1.0, -0.62], [0, 1.3, -0.5], [0, 1.5, -0.2], [0, 1.6, 0],
  ]);
}

/* ---------- the yoke: it turns in azimuth ---------- */
// The yoke's frame has the pier at its origin.
// Its altitude axis runs along X at AXIS_Y.
function buildYoke(k: Kit, M: Mats, Pc: Pieces): void {
  // The base disc sits on the drive, with its bolt ring.
  k.add(M.cast, turn(edges([[0, AZ_TOP], [1.0, AZ_TOP], [1.0, YOKE_Y0], [0, YOKE_Y0]])));
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    k.put(Pc.socket, M.zinc, stand(new Vector3(Math.cos(a) * 0.85, YOKE_Y0, Math.sin(a) * 0.85), UP, a, 1.1));
  }
  // The crossbar joins the two tines at the foot.
  k.add(M.cast, chamferBox(2 * TINE_X + 0.2, YOKE_Y1 - YOKE_Y0, 0.7, 0.03).translate(0, (YOKE_Y0 + YOKE_Y1) / 2, 0));
  for (const s of [-1, 1]) {
    const x = s * TINE_X;
    // A tine: a fork arm up to the altitude axis.
    k.add(M.cast, chamferBox(0.14, AXIS_Y + 0.35 - YOKE_Y1, 0.55, 0.01).translate(x, (AXIS_Y + 0.35 + YOKE_Y1) / 2, 0));
    // Two gussets stiffen each tine on its outer face.
    for (const y of [2.4, 3.2]) {
      k.add(M.cast, chamferBox(0.05, 0.12, 0.5, 0.01).translate(s * (TINE_X + 0.085), y, 0));
    }
    // A cast collar on the tine's outer face, centred on the axis.
    k.add(M.cast, cylX(0.2, s > 0 ? 1.02 : -1.06, s > 0 ? 1.06 : -1.02).translate(0, AXIS_Y, 0));
  }
  // The direct-drive stator: a ring on the east side, bolted to the tine.
  k.add(M.cast, turn(ringProfile(0.3, 0.45, 1.05, 1.12, 0.008), 128).applyMatrix4(Y_TO_X).translate(0, AXIS_Y, 0));
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    k.put(Pc.bolt, M.zinc, stand(new Vector3(1.12, AXIS_Y + Math.cos(a) * 0.38, Math.sin(a) * 0.38), new Vector3(1, 0, 0), a, 1.2));
  }
  // The altitude encoder's read head on a bracket, west side.
  k.add(M.cast,
    chamferBox(0.26, 0.08, 0.1, 0.006).translate(-1.15, AXIS_Y + 0.42, 0),
    chamferBox(0.08, 0.12, 0.08, 0.006).translate(-1.2, AXIS_Y + 0.52, 0));
  // The cable from the pier climbs the west tine's gap to the tube.
  bundle(k, M, Pc, [[0, 1.6, 0], [-0.3, 1.95, 0], [-0.7, 2.6, 0], [-0.85, 3.6, 0], [-0.85, AXIS_Y, 0]]);
}

/* ---------- the tube: it tilts on the altitude axis ---------- */
// The tube's own frame: its axis is Z, its front is -Z.
// Its origin sits PIVOT_Z in front of the altitude axis.
function buildTube(k: Kit, M: Mats, Pc: Pieces): void {
  /* the shroud: a closed skin from the front flange to the rear joint */
  k.add(M.paint, cylZOpen(SHROUD_R, FRONT_Z, SHROUD_BACK));
  // The front flange: a ring round the aperture, bolted to the skin.
  k.add(M.anodised, along(turn(ringProfile(APERTURE_R, SHROUD_R + 0.01, FRONT_Z - 0.03, FRONT_Z + 0.03, 0.008), 128), Y_TO_Z));
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    k.put(Pc.socket, M.zinc, stand(new Vector3(Math.cos(a) * 0.58, Math.sin(a) * 0.58, FRONT_Z - 0.03), new Vector3(0, 0, -1), a, 1));
  }
  // Stiffener rings round the skin.
  for (const z of [-1.1, 0.5]) {
    k.add(M.anodised, along(turn(ringProfile(SHROUD_R, SHROUD_R + 0.025, z, z + 0.03, 0.005), 128), Y_TO_Z));
  }
  // Panel seams: rows of domed rivets along the skin.
  for (const z of [-1.25, 0.1, 0.5, 1.2]) {
    for (let i = 0; i < 32; i++) {
      const a = (i / 32) * Math.PI * 2;
      k.put(Pc.rivet, M.zinc, stand(new Vector3(Math.cos(a) * SHROUD_R, Math.sin(a) * SHROUD_R, z), new Vector3(Math.cos(a), Math.sin(a), 0), 0, 1));
    }
  }
  // The access door: an arc of skin round +X, with a rivet seam and a handle.
  k.add(M.anodised, along(turn([[[SHROUD_R + 0.008, DOOR_Z0], [SHROUD_R + 0.008, DOOR_Z1]]], 48, Math.PI / 2 - DOOR_HALF, DOOR_HALF * 2), Y_TO_Z));
  for (let j = 0; j <= 9; j++) {
    const th = -DOOR_HALF + (j / 9) * DOOR_HALF * 2;
    for (const z of [DOOR_Z0, DOOR_Z1]) {
      k.put(Pc.rivet, M.zinc, stand(new Vector3(Math.cos(th) * (SHROUD_R + 0.008), Math.sin(th) * (SHROUD_R + 0.008), z), new Vector3(Math.cos(th), Math.sin(th), 0), 0, 0.8));
    }
  }
  k.add(M.darkSteel, cylZ(0.012, DOOR_Z0 + 0.1, DOOR_Z1 - 0.1, 16).translate(SHROUD_R + 0.03, 0, 0));
  for (const z of [DOOR_Z0 + 0.1, DOOR_Z1 - 0.1]) k.add(M.darkSteel, cylX(0.008, SHROUD_R + 0.005, SHROUD_R + 0.03, 12).translate(0, 0, z));
  // The louvres: two rows of slats at the top of the skin, angled outward.
  for (const z of [0.8, 1.0]) {
    for (let i = 0; i < 15; i++) {
      const th = Math.PI / 2 + (i - 7) * 0.09;
      const n = new Vector3(Math.cos(th), Math.sin(th), 0), t = new Vector3(-Math.sin(th), Math.cos(th), 0);
      k.put(Pc.tooth, M.darkSteel, boxAt(n.clone().multiplyScalar(SHROUD_R + 0.004).setZ(z), t, n, new Vector3(0, 0, 1), 0.05, 0.008, 0.06));
    }
  }
  // The nameplate: a small satin plate, blank, on the shroud's flank.
  k.add(M.zinc, new RingGeometry(0.001, 0.03, 24, 1).rotateX(-Math.PI / 2).translate(0, SHROUD_R + 0.004, 0.9));

  /* the truss, inside the skin: rails to the front ring, with a zigzag of diagonals */
  const front: Vector3[] = [], rear: Vector3[] = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    front.push(new Vector3(Math.cos(a) * APERTURE_R, Math.sin(a) * APERTURE_R, FRONT_Z));
    rear.push(new Vector3(Math.cos(a) * R_CELL, Math.sin(a) * R_CELL, CELL_Z));
  }
  for (let i = 0; i < 6; i++) {
    k.put(Pc.beam, M.carbon, beamM(front[i], rear[i], 0.022));
    k.put(Pc.beam, M.carbon, beamM(front[i], rear[(i + 1) % 6], 0.016));
    k.put(Pc.beam, M.carbon, beamM(rear[i], front[(i + 1) % 6], 0.016));
  }

  /* the mirror cell: an anodised ring round the primary, with gussets and a back plate */
  k.add(M.anodised, along(turn(ringProfile(MIRROR_R, R_CELL + 0.06, CELL_Z, CELL_BACK, 0.01), 128), Y_TO_Z));
  k.add(M.anodised, along(turn(ringProfile(HOLE_R, R_CELL + 0.06, CELL_BACK, CELL_BACK + 0.04, 0.01), 128), Y_TO_Z));
  // Twelve radial gussets stiffen the back plate.
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const n = new Vector3(Math.cos(a), Math.sin(a), 0);
    const p = n.clone().multiplyScalar(0.38).setZ(CELL_BACK + 0.07);
    k.put(Pc.tooth, M.anodised, boxAt(p, new Vector3(-Math.sin(a), Math.cos(a), 0), n, new Vector3(0, 0, 1), 0.02, 0.24, 0.06));
  }
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    k.put(Pc.bolt, M.zinc, stand(new Vector3(Math.cos(a) * 0.62, Math.sin(a) * 0.62, CELL_BACK + 0.04), new Vector3(0, 0, 1), a));
  }
  // The primary's blank, and its mirror face turned to the secondary.
  k.add(M.ceramic, along(turn(ringProfile(HOLE_R, MIRROR_R, MIRROR_Z, MIRROR_Z + 0.12, 0.01), 128), Y_TO_Z));
  k.add(M.mirror, mirrorFace(HOLE_R, MIRROR_R, MIRROR_Z - 0.002, PRIMARY_R, -1));

  /* the Cassegrain stack behind the cell: focuser, filter wheel, camera, fins, lamps */
  const fz = CELL_BACK + 0.04;
  k.add(M.anodised, cylZ(0.2, fz, fz + 0.18), chamferBox(0.16, 0.14, 0.2, 0.012).translate(0.24, 0, fz + 0.09));
  k.add(M.steel, cylZ(0.13, fz + 0.18, fz + 0.36));
  k.add(M.darkSteel, new BoxGeometry(0.02, 0.02, 0.3).translate(0.13, 0, fz + 0.27));
  for (let i = 0; i < 12; i++) {
    k.put(Pc.tooth, M.darkSteel, boxAt(new Vector3(0.14, 0, fz + 0.14 + i * 0.02), new Vector3(1, 0, 0), new Vector3(0, 1, 0), new Vector3(0, 0, 1), 0.008, 0.02, 0.006));
  }
  k.add(M.anodised, along(knurl(0.05, 0.03, 28), Y_TO_Z, 0, 0, fz + 0.04));
  k.add(M.anodised, cylZ(0.17, fz + 0.36, fz + 0.48), cylZ(0.19, fz + 0.42, fz + 0.44));
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    k.add(M.filter, cylZ(0.04, fz + 0.44, fz + 0.46, 24).translate(Math.cos(a) * 0.1, Math.sin(a) * 0.1, 0));
  }
  k.add(M.anodised, cylZ(0.19, fz + 0.48, 2.36));
  k.add(M.rubber, cylZ(0.2, 2.2, 2.28));
  // The fin block: fourteen dark-coated fins round a core.
  const fins: P[][] = [];
  for (let i = 0; i < 14; i++) {
    const z = 2.36 + i * 0.03;
    fins.push(...ringProfile(0.22, 0.3, z, z + 0.012, 0.003));
  }
  k.add(M.fin, along(turn(fins, 96), Y_TO_Z), cylZ(0.22, 2.36, 2.78));
  k.add(M.anodised, cylZ(0.22, 2.78, CAM_END));
  // Three connectors on the camera's back, and the status lamps.
  for (let i = 0; i < 3; i++) {
    const a = 0.6 + i * 2.1;
    k.add(M.darkSteel, cylZ(0.03, CAM_END, CAM_END + 0.02, 16).translate(Math.cos(a) * 0.14, Math.sin(a) * 0.14, 0));
  }
  const lamps: [MatKey, number][] = [['ledG', 0], ['ledB', 2.094], ['ledA', 4.189]];
  for (const [key, a] of lamps) {
    k.put(Pc.led, M[key], stand(new Vector3(Math.cos(a) * 0.09, Math.sin(a) * 0.09, CAM_END), new Vector3(0, 0, 1), 0, 1.2));
  }

  /* the secondary: a convex mirror in its cell, held by four vanes from the ring */
  k.add(M.mirror, mirrorFace(0, SEC_R, SEC_Z + 0.002, SEC_CONVEX_R, 1));
  k.add(M.anodised, along(turn(ringProfile(SEC_R, SEC_R + 0.04, SEC_Z - 0.03, SEC_Z + 0.03, 0.006), 64), Y_TO_Z));
  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 4 + (i / 4) * Math.PI * 2;
    k.put(Pc.beam, M.darkSteel, beamM(new Vector3(Math.cos(a) * APERTURE_R, Math.sin(a) * APERTURE_R, FRONT_Z), new Vector3(0, 0, SEC_Z), 0.014));
  }
  /* the dust cover: a motor on the front flange, the cover parked beside the tube */
  const cz = FRONT_Z - 0.12;
  k.add(M.anodised, chamferBox(0.14, 0.14, 0.16, 0.01).translate(0.6, 0, cz), cylX(0.02, 0.66, 0.88, 16).translate(0, 0, cz));
  k.add(M.anodised, cylX(0.56, 0.88, 0.9, 96).translate(0, 0, cz));

  /* the guide scope rides on a bar along the shroud top */
  k.add(M.anodised, chamferBox(0.1, 0.04, 2.8, 0.004).translate(0, SHROUD_R + 0.02, 0));
  k.add(M.anodised, chamferBox(0.12, 0.1, 0.12, 0.006).translate(0, SHROUD_R - 0.02, -1.4), chamferBox(0.12, 0.1, 0.12, 0.006).translate(0, SHROUD_R - 0.02, 1.4));
  for (const z of [-0.9, 0.9]) {
    k.add(M.anodised, along(turn(ringProfile(0.07, 0.09, z - 0.03, z + 0.03, 0.004), 48), Y_TO_Z, 0, GUIDE_Y, 0));
  }
  k.add(M.anodised, cylZ(0.07, -1.2, 0.6, 48).translate(0, GUIDE_Y, 0));
  k.add(M.filter, cylZ(0.066, -1.204, -1.2, 48).translate(0, GUIDE_Y, 0));
  k.add(M.anodised, cylZ(0.06, 0.6, 0.7, 40).translate(0, GUIDE_Y, 0));
}

// The altitude axis's own parts: the trunnions, the bosses, the rotor and the encoder.
// Their frame has the altitude axis along X at the origin.
function buildAxis(k: Kit, M: Mats, Pc: Pieces): void {
  // The trunnions reach from the truss's rails out to the tines, at the balance point.
  k.add(M.cast, cylX(0.1, 0.42, 1.06), cylX(0.1, -1.06, -0.42));
  // Trunnion bosses bolt onto the skin on each side.
  for (const s of [-1, 1]) {
    k.add(M.cast, cylX(0.19, s > 0 ? SHROUD_R - 0.02 : -SHROUD_R - 0.04, s > 0 ? SHROUD_R + 0.04 : -SHROUD_R + 0.02, 64));
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      k.put(Pc.bolt, M.zinc, stand(new Vector3(s * (SHROUD_R + 0.04), Math.cos(a) * 0.15, Math.sin(a) * 0.15), new Vector3(s, 0, 0), a, 0.8));
    }
  }
  // The direct-drive rotor: a hub inside the stator's bore.
  k.add(M.anodised, cylX(0.28, 1.06, 1.14, 64));
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    k.put(Pc.bolt, M.zinc, stand(new Vector3(1.14, Math.cos(a) * 0.2, Math.sin(a) * 0.2), new Vector3(1, 0, 0), a, 0.9));
  }
  // The altitude encoder: a labelled scale on the west side.
  k.add(M.darkSteel, cylX(0.42, -1.14, -1.08, 96));
  k.add(M.dialAlt, new RingGeometry(0.001, 0.42, 160, 1).rotateY(-Math.PI / 2).translate(-1.145, 0, 0));
  // The tube's cable: from the west trunnion down the skin to the camera.
  bundle(k, M, Pc, [[-0.85, 0, 0], [-0.85, -0.3, 0.4], [-0.8, -0.6, 1.0], [-0.6, -0.7, 1.6], [-0.35, -0.6, 2.0], [-0.12, -0.4, 2.2], [-0.04, -0.2, 2.25]]);
}

/* ---------- the model ---------- */
// size scales the whole model.
export function buildModernScope(size: number): ModernScope {
  const root = new Group();
  root.scale.setScalar(size);
  const M = materials();
  const Pc = pieces();
  // pier: fixed. az: turns on the pier's axis. alt: turns on the altitude axis.
  // tubeG: the tube, offset so the altitude axis sits PIVOT_Z behind its centre.
  const pier = new Group(), az = new Group(), alt = new Group(), tubeG = new Group();
  alt.position.set(0, AXIS_Y, 0);
  tubeG.position.set(0, 0, -PIVOT_Z);
  alt.add(tubeG);
  az.add(alt);
  root.add(pier, az);
  const kPier = new Kit(), kYoke = new Kit(), kAxis = new Kit(), kTube = new Kit();
  buildPier(kPier, M, Pc);
  buildYoke(kYoke, M, Pc);
  buildAxis(kAxis, M, Pc);
  buildTube(kTube, M, Pc);
  kPier.build(pier);
  kYoke.build(az);
  kAxis.build(alt);
  kTube.build(tubeG);

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
