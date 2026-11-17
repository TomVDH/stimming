// Load order: world/dusk runs first.
import './dusk.ts';
import {
  BackSide, BoxGeometry, BufferGeometry, CanvasTexture, Color, CylinderGeometry, DirectionalLight, ExtrudeGeometry, HalfFloatType,
  HemisphereLight, Light, MeshBasicMaterial, PerspectiveCamera, PointLight, Scene, Shape, SpotLight, WebGLRenderTarget, Float32BufferAttribute, Group, InstancedMesh,
  Matrix3, Matrix4, Mesh, MeshStandardMaterial, NoColorSpace, RepeatWrapping, SRGBColorSpace, SphereGeometry,
  TorusGeometry, Vector3,
} from 'three';
import type { Material, Object3D } from 'three';
import { camera, renderer, scene } from '../setup.ts';
import { complex } from './complex.ts';
import { patch as duskPatch } from './dusk.ts';
import { buildHeroScope, type HeroScope } from './hero-scope.ts';
import { DOME_R, DOOR_GLOW, DOOR_HALF, DOOR_SPRING, DRUM_BATTER, DRUM_H, DRUM_R, LOW_OPEN, PIER_H, SLIT_B, SLIT_E, SPLIT_E, UP_OPEN, type Dome } from './observatory.ts';

/* ---------- the hero model: the main dome in full detail, for the cuts only ---------- */
// The wide shot keeps the light model.
// The cuts swap this one in.
// It hangs under the main dome's root.
// So it shares that root's place and scale.
// Sizes are dome units, as in world/observatory.ts.
// u() turns real metres into dome units.

const DEG = Math.PI / 180;
const R = DOME_R;
// One dome unit is this many metres.
const SCALE = complex.main.root.scale.x;
const u = (metres: number): number => metres / SCALE;

// The drum's radius at a height.
// The drum leans in a little as it rises.
const wallR = (y: number): number => DRUM_R * (DRUM_BATTER - (DRUM_BATTER - 1) * y / DRUM_H);
// Heights from the ground.
// The ashlar courses start at the plinth's top.
const PLINTH_Y = 0.55;
// The drum wall stops here.
// The track and the gear sit on top.
const WALL_TOP = DRUM_H - 0.44;
// Six courses fill the wall between the plinth and the top.
const COURSES = 6;
const COURSE_H = (WALL_TOP - PLINTH_Y) / COURSES;
// The string course marks the observing floor, three courses up.
const STRING_Y = PLINTH_Y + 3 * COURSE_H;
// The catwalk's deck is 0.9 m deep.
// It lies 0.9 m under the cupola's foot.
const DECK_Y = DRUM_H - 0.6;
const DECK_IN = wallR(DECK_Y), DECK_OUT = DECK_IN + u(0.95);
// The rail is 1.05 m high.
const RAIL_H = u(1.05);

/* ---------- the mesh kit ---------- */
type P2 = [number, number];
const ID = new Matrix4();

// One bucket of triangles for one material.
// A matrix places each part.
// The winding follows the vertex normals.
class Geo {
  p: number[] = []; n: number[] = []; t: number[] = []; ix: number[] = [];
  private m = new Matrix4(); private nm = new Matrix3();
  private a = new Vector3(); private b = new Vector3();
  at(m: Matrix4 = ID): this { this.m.copy(m); this.nm.getNormalMatrix(m); return this; }
  v(x: number, y: number, z: number, nx: number, ny: number, nz: number, s = 0, t = 0): number {
    this.a.set(x, y, z).applyMatrix4(this.m);
    this.b.set(nx, ny, nz).applyMatrix3(this.nm).normalize();
    this.p.push(this.a.x, this.a.y, this.a.z);
    this.n.push(this.b.x, this.b.y, this.b.z);
    this.t.push(s, t);
    return this.p.length / 3 - 1;
  }
  // A face that points against its normals turns round.
  tri(i: number, j: number, k: number): void {
    const p = this.p, n = this.n;
    const ax = p[3 * j] - p[3 * i], ay = p[3 * j + 1] - p[3 * i + 1], az = p[3 * j + 2] - p[3 * i + 2];
    const bx = p[3 * k] - p[3 * i], by = p[3 * k + 1] - p[3 * i + 1], bz = p[3 * k + 2] - p[3 * i + 2];
    const fx = ay * bz - az * by, fy = az * bx - ax * bz, fz = ax * by - ay * bx;
    const d = fx * (n[3 * i] + n[3 * j] + n[3 * k]) + fy * (n[3 * i + 1] + n[3 * j + 1] + n[3 * k + 1]) + fz * (n[3 * i + 2] + n[3 * j + 2] + n[3 * k + 2]);
    if (d < 0) this.ix.push(i, k, j);
    else this.ix.push(i, j, k);
  }
  // Four corners in order round the face.
  quad(a: number, b: number, c: number, d: number): void { this.tri(a, b, c); this.tri(a, c, d); }
  // Copies a three.js shape through the current matrix.
  add(g: BufferGeometry): this {
    const pos = g.attributes.position, nor = g.attributes.normal, uv = g.attributes.uv;
    const base = this.p.length / 3;
    for (let i = 0; i < pos.count; i++) {
      this.v(pos.getX(i), pos.getY(i), pos.getZ(i), nor.getX(i), nor.getY(i), nor.getZ(i), uv ? uv.getX(i) : 0, uv ? uv.getY(i) : 0);
    }
    const idx = g.index;
    const count = idx ? idx.count : pos.count;
    for (let i = 0; i < count; i += 3) {
      const a = idx ? idx.getX(i) : i, b = idx ? idx.getX(i + 1) : i + 1, c = idx ? idx.getX(i + 2) : i + 2;
      this.ix.push(base + a, base + b, base + c);
    }
    g.dispose();
    return this;
  }
  box(w: number, h: number, d: number, m: Matrix4): this { return this.at(m).add(new BoxGeometry(w, h, d)); }
  // Copies a shape in door space onto the curved, leaning wall.
  // Door space: x runs right as seen from outside.
  // y runs up, and z runs out of the wall.
  // ashlar: the texture points follow the courses, as on the drum.
  // one: the shape is one stone.
  // Then its texture points stay inside one block.
  wrap(g: BufferGeometry, ashlar = false, one = false): this {
    // A random block of the four in the texture's top row.
    const bu = Math.floor(rnd() * 4) * 0.25;
    const pos = g.attributes.position, nor = g.attributes.normal, uv = g.attributes.uv;
    const base = this.p.length / 3;
    this.at();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i), r = wallR(y);
      const a = -x / r, sn = Math.sin(a), cs = Math.cos(a), rr = r + z;
      const nx = nor.getX(i), ny = nor.getY(i), nz = nor.getZ(i);
      let s = ashlar ? a / (2 * Math.PI) * 6 : uv ? uv.getX(i) : 0;
      let t = ashlar ? (y - PLINTH_Y) / COURSE_H * 0.5 : uv ? uv.getY(i) : 0;
      if (one) { s = bu + 0.02 + 0.2 * (s - Math.floor(s)); t = 0.54 + 0.42 * (t - Math.floor(t)); }
      this.v(rr * sn, y, -rr * cs, -nx * cs + nz * sn, ny, -nx * sn - nz * cs, s, t);
    }
    const idx = g.index;
    const count = idx ? idx.count : pos.count;
    for (let i = 0; i < count; i += 3) {
      const a = idx ? idx.getX(i) : i, b = idx ? idx.getX(i + 1) : i + 1, c = idx ? idx.getX(i + 2) : i + 2;
      this.tri(base + a, base + b, base + c);
    }
    g.dispose();
    return this;
  }
  // A closed or open profile turned round the Y axis.
  // Angle 0 is north, -Z.
  // Angles grow toward east, +X, as azimuth does.
  // uv gives the texture point for an angle and a profile point.
  // caps: a closed profile cut short gets flat ends.
  // A capped profile must be convex.
  lathe(prof: P2[], seg: number, opt: { a0?: number; a1?: number; closed?: boolean; smooth?: boolean; caps?: boolean; uv?: (a: number, r: number, y: number, k: number) => P2 } = {}): this {
    const { a0 = 0, a1 = 2 * Math.PI, closed = false, smooth = false } = opt;
    const uv = opt.uv ?? ((a: number, _r: number, y: number) => [a / (2 * Math.PI), y] as P2);
    if (opt.caps) {
      for (const [a, sd] of [[a0, -1], [a1, 1]]) {
        const sn = Math.sin(a), cs = Math.cos(a);
        const ids = prof.map(([r, y]) => this.v(r * sn, y, -r * cs, sd * cs, 0, sd * sn, r, y));
        for (let i = 1; i + 1 < ids.length; i++) this.tri(ids[0], ids[i], ids[i + 1]);
      }
    }
    sweepCore(this, prof, closed, smooth, seg + 1, (j, s, h, out) => {
      const a = a0 + (a1 - a0) * j / seg, sn = Math.sin(a), cs = Math.cos(a);
      out.x = s * sn; out.y = h; out.z = -s * cs;
    }, (j, ns, nh, out) => {
      const a = a0 + (a1 - a0) * j / seg;
      out.set(ns * Math.sin(a), nh, -ns * Math.cos(a));
    }, (j, k) => { const a = a0 + (a1 - a0) * j / seg; const q = prof[k % prof.length]; return uv(a, q[0], q[1], k); });
    return this;
  }
  // A profile carried along a path of frames.
  // A frame gives a point, a side axis and an up axis.
  sweep(prof: P2[], frames: Frame[], opt: { closed?: boolean; smooth?: boolean; uv?: (j: number, k: number) => P2 } = {}): this {
    const { closed = true, smooth = false } = opt;
    const uv = opt.uv ?? ((j: number, k: number) => [j, k] as P2);
    sweepCore(this, prof, closed, smooth, frames.length, (j, s, h, out) => {
      const f = frames[j];
      out.copy(f.p).addScaledVector(f.s, s).addScaledVector(f.u, h);
    }, (j, ns, nh, out) => {
      const f = frames[j];
      out.copy(f.s).multiplyScalar(ns).addScaledVector(f.u, nh);
    }, uv);
    return this;
  }
  get tris(): number { return this.ix.length / 3; }
  build(): BufferGeometry {
    const g = new BufferGeometry();
    g.setAttribute('position', new Float32BufferAttribute(this.p, 3));
    g.setAttribute('normal', new Float32BufferAttribute(this.n, 3));
    g.setAttribute('uv', new Float32BufferAttribute(this.t, 2));
    g.setIndex(this.ix);
    g.computeBoundingSphere();
    return g;
  }
}

export type Frame = { p: Vector3; s: Vector3; u: Vector3 };
const PV = new Vector3(), NV = new Vector3();

// The shared core of lathe and sweep.
// at(j, s, h) places a profile point.
// nor(j, ns, nh) turns a profile normal.
function sweepCore(g: Geo, prof: P2[], closed: boolean, smooth: boolean, rows: number,
  at: (j: number, s: number, h: number, out: Vector3) => void,
  nor: (j: number, ns: number, nh: number, out: Vector3) => void,
  uv: (j: number, k: number) => P2): void {
  const n = prof.length, segs = closed ? n : n - 1;
  // A closed profile that runs clockwise turns its normals round.
  let area = 0;
  for (let k = 0; k < n; k++) { const a = prof[k], b = prof[(k + 1) % n]; area += a[0] * b[1] - b[0] * a[1]; }
  const o = closed && area < 0 ? -1 : 1;
  const segN: P2[] = [];
  for (let k = 0; k < segs; k++) {
    const a = prof[k], b = prof[(k + 1) % n];
    const ds = b[0] - a[0], dh = b[1] - a[1], l = Math.hypot(ds, dh) || 1;
    segN.push([o * dh / l, -o * ds / l]);
  }
  if (smooth) {
    // Each profile point has one vertex.
    // Its normal is the mean of its two edges.
    const ptN: P2[] = prof.map((_, k) => {
      const e0 = segN[(k - 1 + segs) % segs], e1 = segN[Math.min(k, segs - 1)];
      const first = !closed && k === 0, last = !closed && k === n - 1;
      const x = first ? e1[0] : last ? e0[0] : e0[0] + e1[0], y = first ? e1[1] : last ? e0[1] : e0[1] + e1[1];
      const l = Math.hypot(x, y) || 1;
      return [x / l, y / l];
    });
    const idx: number[][] = [];
    for (let j = 0; j < rows; j++) {
      const row: number[] = [];
      for (let k = 0; k < n; k++) {
        at(j, prof[k][0], prof[k][1], PV); nor(j, ptN[k][0], ptN[k][1], NV);
        const [s, t] = uv(j, k);
        row.push(g.v(PV.x, PV.y, PV.z, NV.x, NV.y, NV.z, s, t));
      }
      idx.push(row);
    }
    for (let j = 0; j + 1 < rows; j++) for (let k = 0; k < segs; k++) {
      const k1 = (k + 1) % n;
      g.quad(idx[j][k], idx[j + 1][k], idx[j + 1][k1], idx[j][k1]);
    }
    return;
  }
  // Hard edges: each profile edge has its own strip of vertices.
  for (let k = 0; k < segs; k++) {
    const k1 = (k + 1) % n, [ns, nh] = segN[k];
    let prev0 = -1, prev1 = -1;
    for (let j = 0; j < rows; j++) {
      nor(j, ns, nh, NV);
      at(j, prof[k][0], prof[k][1], PV);
      const [s0, t0] = uv(j, k);
      const i0 = g.v(PV.x, PV.y, PV.z, NV.x, NV.y, NV.z, s0, t0);
      at(j, prof[k1][0], prof[k1][1], PV);
      const [s1, t1] = uv(j, k + 1);
      const i1 = g.v(PV.x, PV.y, PV.z, NV.x, NV.y, NV.z, s1, t1);
      if (j) g.quad(prev0, i0, i1, prev1);
      prev0 = i0; prev1 = i1;
    }
  }
}

// A matrix from a place and Euler angles in YXZ order.
function mat(x: number, y: number, z: number, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1): Matrix4 {
  const m = new Matrix4();
  const cx = Math.cos(rx), snx = Math.sin(rx), cy = Math.cos(ry), sny = Math.sin(ry), cz = Math.cos(rz), snz = Math.sin(rz);
  // R = Ry * Rx * Rz.
  m.set(
    cy * cz + sny * snx * snz, -cy * snz + sny * snx * cz, sny * cx, x,
    cx * snz, cx * cz, -snx, y,
    -sny * cz + cy * snx * snz, sny * snz + cy * snx * cz, cy * cx, z,
    0, 0, 0, 1);
  return m.multiply(new Matrix4().makeScale(sx, sy, sz));
}

// A frame on the drum wall at azimuth a and height y.
// X runs right as seen from outside.
// Z points out of the wall.
function onWall(a: number, y: number, out = 0, r = wallR(y)): Matrix4 {
  const sn = Math.sin(a), cs = Math.cos(a);
  return new Matrix4().makeBasis(
    new Vector3(-cs, 0, -sn), new Vector3(0, 1, 0), new Vector3(sn, 0, -cs),
  ).setPosition((r + out) * sn, y, -(r + out) * cs);
}

// A matrix that stands local +Y on a normal at a point.
function onNormal(p: Vector3, n: Vector3): Matrix4 {
  const y = n.clone().normalize();
  const x = Math.abs(y.y) < 0.9 ? new Vector3(0, 1, 0).cross(y).normalize() : new Vector3(1, 0, 0).cross(y).normalize();
  const z = x.clone().cross(y);
  return new Matrix4().makeBasis(x, y, z).setPosition(p);
}
// Scratch matrix for the per-frame pose.
const TM = new Matrix4();

// An instanced copy of one shape at many matrices.
function instances(g: Geo, m: Material, mats: Matrix4[]): InstancedMesh {
  const im = new InstancedMesh(g.build(), m, mats.length);
  mats.forEach((x, i) => im.setMatrixAt(i, x));
  im.computeBoundingSphere();
  return im;
}

/* ---------- textures, painted in code ---------- */
// A seeded generator keeps every load the same.
let seed = 1931;
const rnd = (): number => (seed = (seed * 16807) % 2147483647) / 2147483647;

function canvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return [c, c.getContext('2d', { willReadFrequently: true })!];
}

// A soft noise layer that tiles.
// cx, cy: the grid of random values.
// The grid is drawn large and smooth.
function noise(x: CanvasRenderingContext2D, w: number, h: number, cx: number, cy: number, alpha: number, op: GlobalCompositeOperation): void {
  const [c, g] = canvas(cx + 2, cy + 2);
  const d = g.createImageData(cx + 2, cy + 2);
  const val: number[] = [];
  for (let i = 0; i < cx * cy; i++) val.push(rnd() * 255);
  // The border repeats the far edge, so the layer tiles.
  for (let y = 0; y < cy + 2; y++) for (let xx = 0; xx < cx + 2; xx++) {
    const v = val[((y + cy - 1) % cy) * cx + ((xx + cx - 1) % cx)], i = 4 * (y * (cx + 2) + xx);
    d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255;
  }
  g.putImageData(d, 0, 0);
  x.save();
  x.imageSmoothingEnabled = true;
  x.globalAlpha = alpha; x.globalCompositeOperation = op;
  x.drawImage(c, 1, 1, cx, cy, 0, 0, w, h);
  x.restore();
}

// A normal map from a height map.
// Both maps tile.
// k: the slope gain.
function normalOf(h: HTMLCanvasElement, k: number): HTMLCanvasElement {
  const w = h.width, ht = h.height;
  const src = h.getContext('2d')!.getImageData(0, 0, w, ht).data;
  const [c, x] = canvas(w, ht);
  const out = x.createImageData(w, ht), d = out.data;
  const H = (xx: number, yy: number): number => src[4 * (((yy + ht) % ht) * w + ((xx + w) % w))];
  for (let y = 0; y < ht; y++) for (let xx = 0; xx < w; xx++) {
    // The canvas top is the texture's top.
    // So up is row - 1.
    const dx = (H(xx + 1, y) - H(xx - 1, y)) * k / 255, dy = (H(xx, y - 1) - H(xx, y + 1)) * k / 255;
    const l = Math.hypot(dx, dy, 1), i = 4 * (y * w + xx);
    d[i] = 128 + 127 * (-dx / l); d[i + 1] = 128 + 127 * (-dy / l); d[i + 2] = 128 + 127 / l; d[i + 3] = 255;
  }
  x.putImageData(out, 0, 0);
  return c;
}

function tex(c: HTMLCanvasElement, srgb: boolean): CanvasTexture {
  const t = new CanvasTexture(c);
  t.colorSpace = srgb ? SRGBColorSpace : NoColorSpace;
  t.wrapS = t.wrapT = RepeatWrapping;
  t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  return t;
}

// Ashlar: four blocks across, two courses up.
// The lower course sits half a block over.
function stoneTex(): { map: CanvasTexture; normal: CanvasTexture } {
  const W = 1024, H = 256, BW = 256, CH = 128;
  const [a, ax] = canvas(W, H), [h, hx] = canvas(W, H);
  ax.fillStyle = '#3d3a35'; ax.fillRect(0, 0, W, H);
  hx.fillStyle = '#404040'; hx.fillRect(0, 0, W, H);
  for (let row = 0; row < 2; row++) {
    const off = row ? BW / 2 : 0;
    for (let col = 0; col < 4; col++) {
      const v = 122 + rnd() * 30, warm = rnd() * 6;
      const fill = `rgb(${v + 4 + warm | 0},${v + warm / 2 | 0},${v - 8 | 0})`;
      // A block past the right edge comes back on the left.
      for (const wrap of [0, -W]) {
        const x0 = col * BW + off + wrap, y0 = row * CH;
        ax.fillStyle = fill; ax.fillRect(x0 + 2, y0 + 2, BW - 4, CH - 4);
        // The arrises are worn round: three steps up from the joint.
        for (let s = 0; s < 4; s++) {
          const g = 120 + s * 28;
          hx.fillStyle = `rgb(${g},${g},${g})`;
          hx.fillRect(x0 + 2 + s, y0 + 2 + s, BW - 4 - 2 * s, CH - 4 - 2 * s);
        }
      }
    }
  }
  // Tooling and grain in the face.
  noise(ax, W, H, 96, 24, 0.16, 'overlay');
  noise(ax, W, H, 24, 6, 0.10, 'multiply');
  noise(ax, W, H, 512, 128, 0.12, 'overlay');
  noise(hx, W, H, 512, 128, 0.22, 'overlay');
  noise(hx, W, H, 128, 32, 0.18, 'overlay');
  // Rain darkens the foot of each course a little.
  for (let row = 0; row < 2; row++) {
    const gr = ax.createLinearGradient(0, row * CH + CH * 0.55, 0, row * CH + CH);
    gr.addColorStop(0, 'rgba(30,28,25,0)'); gr.addColorStop(1, 'rgba(30,28,25,0.22)');
    ax.fillStyle = gr; ax.fillRect(0, row * CH, W, CH);
  }
  return { map: tex(a, true), normal: tex(normalOf(h, 2.2), false) };
}

// Rivet heads: a small raised dome each, in the height map.
function rivetDots(hx: CanvasRenderingContext2D, ax: CanvasRenderingContext2D, pts: P2[], r: number): void {
  for (const [x, y] of pts) {
    const g = hx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, 'rgba(255,255,255,0.9)'); g.addColorStop(0.7, 'rgba(255,255,255,0.35)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    hx.fillStyle = g; hx.fillRect(x - r, y - r, 2 * r, 2 * r);
    // Grime gathers round each head.
    ax.strokeStyle = 'rgba(70,66,60,0.16)'; ax.lineWidth = 1;
    ax.beginPath(); ax.arc(x, y, r * 0.8, 0, 2 * Math.PI); ax.stroke();
  }
}

// One plate's lap: the upper plate's edge stands on the lower one.
// The height map steps up at the edge, over a short bevel.
function lap(hx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, up: number): void {
  for (let i = 0; i < 3; i++) {
    hx.fillStyle = `rgba(255,255,255,${up / 255 / 3})`;
    hx.fillRect(x, y + i, w, h - i);
  }
}

// The cupola's plate: two gores across.
// It runs from the equator up to the zenith.
// Gore seams lie a quarter and three quarters across.
// A ring seam lies every 15 degrees.
const RINGS = [15, 30, 45, 60, 75];
function domeTex(): { map: CanvasTexture; normal: CanvasTexture } {
  const W = 512, H = 1024;
  const [a, ax] = canvas(W, H), [h, hx] = canvas(W, H);
  ax.fillStyle = '#dcdad3'; ax.fillRect(0, 0, W, H);
  hx.fillStyle = '#606060'; hx.fillRect(0, 0, W, H);
  const ys = [H, ...RINGS.map(l => Math.round(H * (1 - l / 90))), 0];
  // Each panel takes its own tone.
  // The upper plates lap over the lower.
  for (let band = 0; band + 1 < ys.length; band++) {
    const y1 = ys[band], y0 = ys[band + 1];
    for (const [x0, x1, over] of [[128, 384, 1], [384, 640, 0]]) {
      const tone = (rnd() - 0.5) * 9;
      ax.fillStyle = `rgba(${tone > 0 ? 255 : 0},${tone > 0 ? 255 : 0},${tone > 0 ? 250 : 0},${Math.abs(tone) / 100})`;
      for (const off of [0, -W]) {
        ax.fillRect(x0 + off, y0, x1 - x0, y1 - y0);
        lap(hx, x0 + off, y0, x1 - x0, y1 - y0, band * 10 + over * 8);
      }
    }
    // Dirt sits in the lap under each ring seam.
    const g = ax.createLinearGradient(0, y1, 0, y1 - 14);
    g.addColorStop(0, 'rgba(60,56,50,0.22)'); g.addColorStop(1, 'rgba(60,56,50,0)');
    ax.fillStyle = g; ax.fillRect(0, y1 - 14, W, 14);
  }
  // A thin shadow line at every seam.
  ax.fillStyle = 'rgba(40,38,34,0.35)';
  for (const y of ys.slice(1, -1)) ax.fillRect(0, y, W, 1);
  for (const x of [128, 384]) ax.fillRect(x, 0, 1, H);
  // Rivet rows: above each ring seam and beside each gore seam.
  const pts: P2[] = [];
  for (const y of ys.slice(1, -1)) for (let x = 8; x < W; x += 16) pts.push([x, y - 6]);
  for (const x of [128, 384]) for (let y = 7; y < H; y += 14) pts.push([x + 6, y]);
  rivetDots(hx, ax, pts, 3.2);
  // Weather: soft streaks under the rivets, broad clouds of grime.
  ax.fillStyle = 'rgba(80,76,68,0.035)';
  for (let i = 0; i < 160; i++) { const x = rnd() * W, y = rnd() * H; ax.fillRect(x, y, 1.5, 20 + rnd() * 70); }
  noise(ax, W, H, 8, 16, 0.045, 'multiply');
  noise(ax, W, H, 64, 128, 0.04, 'overlay');
  // The plate is not quite flat between its seams.
  noise(hx, W, H, 6, 12, 0.10, 'overlay');
  return { map: tex(a, true), normal: tex(normalOf(h, 4), false) };
}

// The shutter leaf's plate: laps across it.
// Rivets run along the laps and the edges.
function leafTex(): { map: CanvasTexture; normal: CanvasTexture } {
  const W = 256, H = 512;
  const [a, ax] = canvas(W, H), [h, hx] = canvas(W, H);
  ax.fillStyle = '#d9d7d0'; ax.fillRect(0, 0, W, H);
  hx.fillStyle = '#606060'; hx.fillRect(0, 0, W, H);
  const pts: P2[] = [];
  for (let k = 0; k < 4; k++) {
    const y0 = k * 128;
    const tone = (rnd() - 0.5) * 8;
    ax.fillStyle = `rgba(${tone > 0 ? 255 : 0},${tone > 0 ? 255 : 0},${tone > 0 ? 250 : 0},${Math.abs(tone) / 100})`;
    ax.fillRect(0, y0, W, 128);
    lap(hx, 0, y0, W, 128, 12 + (k % 2) * 10);
    ax.fillStyle = 'rgba(40,38,34,0.32)'; ax.fillRect(0, y0, W, 1);
    for (let x = 8; x < W; x += 16) pts.push([x, y0 + 6]);
  }
  for (const x of [14, W - 14]) for (let y = 7; y < H; y += 14) pts.push([x, y]);
  rivetDots(hx, ax, pts, 3.2);
  noise(ax, W, H, 4, 8, 0.06, 'multiply');
  noise(hx, W, H, 4, 8, 0.10, 'overlay');
  return { map: tex(a, true), normal: tex(normalOf(h, 4), false) };
}

/* ---------- materials ---------- */
// Every hero material takes the dusk's last light, as the scene's do.
const mats: Material[] = [];
function std(p: ConstructorParameters<typeof MeshStandardMaterial>[0]): MeshStandardMaterial {
  const m = new MeshStandardMaterial(p);
  mats.push(m);
  return m;
}

/* ---------- the cupola's sphere, in slit space ---------- */
// b: the angle across the slit.
// e: the angle along it, from the front foot.
// The slit looks along local -Z, as in world/observatory.ts.
function sp(r: number, b: number, e: number, out = new Vector3()): Vector3 {
  return out.set(r * Math.sin(b), r * Math.cos(b) * Math.sin(e), -r * Math.cos(b) * Math.cos(e));
}
// Unit axes along b and along e at a point.
const alongB = (b: number, e: number): Vector3 => new Vector3(Math.cos(b), -Math.sin(b) * Math.sin(e), Math.sin(b) * Math.cos(e));
const alongE = (_b: number, e: number): Vector3 => new Vector3(0, Math.cos(e), Math.sin(e));

// A patch of the sphere.
// inward turns its faces in.
// uv gives the texture point for a direction and a grid point.
function patch(g: Geo, r: number, b0: number, b1: number, e0: number, e1: number, nb: number, ne: number,
  uv: (d: Vector3, i: number, j: number) => P2, inward = false): void {
  const ids: number[][] = [], d = new Vector3();
  for (let j = 0; j <= ne; j++) {
    const row: number[] = [], e = e0 + (e1 - e0) * j / ne;
    for (let i = 0; i <= nb; i++) {
      const b = b0 + (b1 - b0) * i / nb;
      sp(1, b, e, d);
      const [s, t] = uv(d, i, j), k = inward ? -1 : 1;
      row.push(g.v(d.x * r, d.y * r, d.z * r, k * d.x, k * d.y, k * d.z, s, t));
    }
    ids.push(row);
  }
  for (let j = 0; j < ne; j++) for (let i = 0; i < nb; i++) g.quad(ids[j][i], ids[j][i + 1], ids[j + 1][i + 1], ids[j + 1][i]);
}

// The dome texture's point for a direction.
// 12 tiles go round.
// v runs from the equator to the zenith.
const domeUV = (d: Vector3): P2 => [(Math.atan2(d.x, d.z) + Math.PI) / (2 * Math.PI) * 12, Math.asin(Math.max(-1, Math.min(1, d.y))) / (Math.PI / 2)];

// Frames along the sphere at a fixed b, from e0 to e1.
// side, +1 or -1, picks the outward side.
function framesAlongE(r: number, b: number, e0: number, e1: number, n: number, side: number): Frame[] {
  const out: Frame[] = [];
  for (let j = 0; j <= n; j++) {
    const e = e0 + (e1 - e0) * j / n, p = sp(r, b, e);
    out.push({ p, s: alongB(b, e).multiplyScalar(side), u: p.clone().normalize() });
  }
  return out;
}
// Frames along the sphere at a fixed e, from b0 to b1.
// Their side axis points along +e.
function framesAlongB(r: number, e: number, b0: number, b1: number, n: number): Frame[] {
  const out: Frame[] = [];
  for (let j = 0; j <= n; j++) {
    const b = b0 + (b1 - b0) * j / n, p = sp(r, b, e);
    out.push({ p, s: alongE(b, e), u: p.clone().normalize() });
  }
  return out;
}
// Metres to dome units for a profile.
const um = (pts: P2[]): P2[] => pts.map(([a, b]) => [u(a), u(b)]);

/* ---------- the inside: less sky, a dim red work light ---------- */
// Three.js lights cast no shadow.
// So the sky would light the inside in full.
// An inside material scales its light by occ.
// occ is the share of sky that the surface sees.
// The red work lamp adds its own light in the shader.
// So no light joins the scene.
// A new scene light changes every shader of the wide shot.
// A dull, deep red, a quarter as bright as at first.
// The inside reads dark, with a faint warm-red spill near the lamp.
const RED = { uRedP: { value: new Vector3() }, uRedC: { value: new Color(1.0, 0.075, 0.035).multiplyScalar(8.2) } };
function inside(m: MeshStandardMaterial, occ: number): MeshStandardMaterial {
  const prev = m.onBeforeCompile, key = m.customProgramCacheKey(), uOcc = { value: occ };
  m.onBeforeCompile = (sh, r) => {
    prev.call(m, sh, r);
    Object.assign(sh.uniforms, RED, { uOcc });
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uOcc;\nuniform vec3 uRedP, uRedC;')
      .replace('#include <lights_fragment_end>', `#include <lights_fragment_end>
        #ifdef USE_FOG
        {
          reflectedLight.directDiffuse *= uOcc;
          reflectedLight.directSpecular *= uOcc;
          reflectedLight.indirectDiffuse *= uOcc;
          reflectedLight.indirectSpecular *= uOcc;
          vec3 toLamp = uRedP - vHazeP;
          float d2 = dot(toLamp, toLamp);
          vec3 nW = inverseTransformDirection(normal, viewMatrix);
          float lit = max(dot(nW, toLamp * inversesqrt(d2)), 0.0);
          reflectedLight.directDiffuse += uRedC * lit / (1.0 + d2) * BRDF_Lambert(diffuseColor.rgb);
        }
        #endif`);
  };
  // The patch changes the program, so the cache key changes too.
  // It builds on the material's own key, as world/dusk does.
  m.customProgramCacheKey = () => key + '|inside';
  return m;
}

/* ---------- the hero ---------- */
// The textures, painted in their own step before the build.
type Painted = { stone: ReturnType<typeof stoneTex>; dome: ReturnType<typeof domeTex>; leaf: ReturnType<typeof leafTex> };

type Built = {
  root: Group;
  scope: HeroScope;
  textures: CanvasTexture[];
  // Puts the hero under the main dome's root, or takes it away.
  show(on: boolean): void;
  // Copies the light model's pose: cupola, shutter, tube, door glow.
  follow(d: Dome): void;
};

function buildHero(main: Dome, tx: Painted): Built {
  const root = new Group();
  root.name = 'hero';

  const stone = tx.stone;
  // The stone matches the light model's drum: a pale, warm limestone.
  const stoneMat = std({ map: stone.map, normalMap: stone.normal, roughness: 0.92 });
  // Black-painted iron: rail, brackets, lamp cages.
  const iron = std({ color: 0x1c1e20, roughness: 0.55, metalness: 0.35 });
  const ironI = std({ color: 0x1c1e20, roughness: 0.55, metalness: 0.35 });
  const deckMat = std({ color: 0x4d4f50, roughness: 0.6, metalness: 0.3 });
  // The doors: dark green paint over oak.
  const doorMat = std({ color: 0x2e4a3a, roughness: 0.45 });
  // The fanlight and the crack between the doors glow.
  // They follow the light model's door glow.
  const glow = std({ color: 0x000000, emissive: DOOR_GLOW, emissiveIntensity: 0, roughness: 0.3 });

  /* ---------- the drum ---------- */
  const st = new Geo(), ir = new Geo(), dr = new Geo(), gl = new Geo();
  // The door's opening in azimuth, at the courses it cuts.
  // The gap stays inside the jambs, so no cut end shows.
  const DOOR_W = DOOR_HALF + 0.17;
  const doorA = DOOR_W / wallR(1);
  const DOOR_TOP = DOOR_SPRING + DOOR_HALF + 0.24;
  // Ashlar texture: 24 blocks round the drum, so six tiles.
  const stoneUV = (row: number, y0: number, y1: number) => (a: number, _r: number, y: number): P2 =>
    [a / (2 * Math.PI) * 6, row * 0.5 + 0.5 * (y - y0) / (y1 - y0)];

  // The plinth: one tall course that stands proud, with a sloped top.
  const pr = wallR(0) + u(0.12);
  st.lathe([[wallR(0) - 0.3, 0], [pr, 0], [pr, PLINTH_Y - u(0.09)], [wallR(PLINTH_Y) - 0.005, PLINTH_Y], [wallR(0) - 0.3, PLINTH_Y]], 144,
    { closed: true, caps: true, a0: doorA, a1: 2 * Math.PI - doorA, uv: stoneUV(0, 0, PLINTH_Y + 0.3) });
  // The courses: each face has a small chamfer at its joints.
  const J = u(0.012), C = u(0.025);
  for (let k = 0; k < COURSES; k++) {
    const y0 = PLINTH_Y + k * COURSE_H, y1 = y0 + COURSE_H;
    const cut = y0 < DOOR_TOP;
    st.lathe([[wallR(y0) - J, y0], [wallR(y0 + C), y0 + C], [wallR(y1 - C), y1 - C], [wallR(y1) - J, y1]], 144,
      { a0: cut ? doorA : 0, a1: cut ? 2 * Math.PI - doorA : 2 * Math.PI, uv: stoneUV(k % 2, y0, y1) });
  }
  // The string course: a weathered band with a drip under it.
  const sy = STRING_Y, sr = wallR(sy);
  st.lathe([[sr - 0.02, sy - u(0.12)], [sr + u(0.09), sy - u(0.10)], [sr + u(0.11), sy - u(0.07)], [sr + u(0.11), sy + u(0.02)],
    [sr + u(0.05), sy + u(0.08)], [sr - 0.02, sy + u(0.09)]], 144,
  { closed: true, caps: true, a0: doorA, a1: 2 * Math.PI - doorA, uv: stoneUV(1, sy - 0.3, sy + 0.3) });
  // The coping on the wall's top, under the track.
  const cr = wallR(WALL_TOP);
  st.lathe([[DRUM_R - 0.36, WALL_TOP - u(0.02)], [cr + u(0.07), WALL_TOP - u(0.02)], [cr + u(0.07), WALL_TOP + u(0.04)],
    [cr + u(0.03), WALL_TOP + u(0.07)], [DRUM_R - 0.36, WALL_TOP + u(0.07)]], 144, { closed: true, uv: stoneUV(0, WALL_TOP - 0.3, WALL_TOP + 0.3) });

  /* ---------- the door: a stone surround, two leaves, a lit fanlight ---------- */
  // The surround is drawn flat in door space.
  // Then it is wrapped onto the wall.
  const PROUD = u(0.05);
  // Jambs: long and short blocks in turn, proud of the wall.
  for (let i = 0; i < 4; i++) {
    const h = DOOR_SPRING / 4, w = i % 2 ? 0.2 : 0.27, y = h * (i + 0.5);
    for (const sd of [-1, 1]) {
      st.wrap(new BoxGeometry(w - 0.012, h - 0.012, 0.2).translate(sd * (DOOR_HALF + w / 2), y, PROUD - 0.1), false, true);
    }
  }
  // Voussoirs go round the arch.
  // The keystone stands taller and further out.
  const NV = 9, RO = DOOR_HALF + 0.24;
  for (let i = 0; i < NV; i++) {
    const a0 = Math.PI * i / NV + 0.0025, a1 = Math.PI * (i + 1) / NV - 0.0025;
    const key = i === (NV - 1) / 2;
    const ro = key ? RO + 0.07 : RO;
    const shape: P2[] = [[Math.cos(a0) * DOOR_HALF, DOOR_SPRING + Math.sin(a0) * DOOR_HALF], [Math.cos(a0) * ro, DOOR_SPRING + Math.sin(a0) * ro],
      [Math.cos(a1) * ro, DOOR_SPRING + Math.sin(a1) * ro], [Math.cos(a1) * DOOR_HALF, DOOR_SPRING + Math.sin(a1) * DOOR_HALF]];
    const w = new Geo();
    prism(w, shape, PROUD - 0.2, PROUD + (key ? u(0.03) : 0), ID);
    st.wrap(w.build(), false, true);
  }
  // The courses stop at the door.
  // The spandrels fill round the arch.
  const cutTop = PLINTH_Y + Math.ceil((DOOR_TOP - PLINTH_Y) / COURSE_H) * COURSE_H;
  {
    // It sits a joint's depth back and fills only the gap.
    // A fine grid keeps it on the curve of the wall.
    const g = new Geo(), NX = 28, NY = 6;
    const foot = (x: number): number => Math.abs(x) < RO ? DOOR_SPRING + Math.sqrt(RO * RO - x * x) - 0.02 : DOOR_SPRING;
    const ids: number[][] = [];
    for (let i = 0; i <= NX; i++) {
      const x = -DOOR_W + 2 * DOOR_W * i / NX, y0 = foot(x), col: number[] = [];
      for (let j = 0; j <= NY; j++) { const y = y0 + (cutTop - y0) * j / NY; col.push(g.v(x, y, -J, 0, 0, 1)); }
      ids.push(col);
    }
    for (let i = 0; i < NX; i++) for (let j = 0; j < NY; j++) g.quad(ids[i][j], ids[i + 1][j], ids[i + 1][j + 1], ids[i][j + 1]);
    st.wrap(g.build(), true);
  }
  // The reveal: the opening's sides, set back to the doors.
  const DEPTH = u(0.4);
  const outline: P2[] = [[DOOR_HALF, 0], [DOOR_HALF, DOOR_SPRING]];
  for (let i = 1; i < 24; i++) { const a = Math.PI * i / 24; outline.push([Math.cos(a) * DOOR_HALF, DOOR_SPRING + Math.sin(a) * DOOR_HALF]); }
  outline.push([-DOOR_HALF, DOOR_SPRING], [-DOOR_HALF, 0]);
  {
    const fr: Frame[] = outline.map(([x, y]) => ({ p: new Vector3(x, y, 0), s: new Vector3(0, 0, 1), u: new Vector3() }));
    // The reveal's faces look into the opening.
    fr.forEach((f, i) => {
      const a = outline[Math.max(0, i - 1)], b = outline[Math.min(outline.length - 1, i + 1)];
      f.u.set(-(b[1] - a[1]), b[0] - a[0], 0).normalize();
      if (f.u.x * f.p.x + f.u.y * (f.p.y - DOOR_SPRING * 0.6) > 0) f.u.negate();
    });
    // It runs past the leaves, so no gap shows at their edges.
    const rv = new Geo().sweep([[PROUD, 0], [-DEPTH - 0.08, 0]], fr, { closed: false, uv: (j, k) => [j * 0.15, k * 0.3] });
    st.wrap(rv.build());
  }
  // The leaves stand flat, leaning back with the drum's batter.
  const LEAN = Math.atan(DRUM_R * (DRUM_BATTER - 1) / DRUM_H);
  const dm = onWall(0, 0, 0).multiply(mat(0, 0, 0, -LEAN));
  // The threshold step.
  st.box(DOOR_HALF * 2 + 0.36, 0.1, 0.42, onWall(0, 0.05, PROUD + 0.12));
  // Two leaves, framed and panelled, set back in the reveal.
  const back = -DEPTH + 0.02;
  dr.box(DOOR_HALF * 2, DOOR_SPRING, 0.04, mat(0, DOOR_SPRING / 2, back).premultiply(dm));
  for (const sd of [-1, 1]) {
    const cx = sd * DOOR_HALF / 2, lw = DOOR_HALF;
    // Stiles and rails stand 2 cm proud of the panels.
    for (const x of [cx - lw / 2 + 0.04, cx + lw / 2 - 0.04]) dr.box(0.07, DOOR_SPRING - 0.02, 0.05, mat(x, DOOR_SPRING / 2, back + 0.025).premultiply(dm));
    for (const y of [0.1, 0.62, 1.12, DOOR_SPRING - 0.04]) dr.box(lw - 0.1, y === 0.1 ? 0.2 : 0.07, 0.05, mat(cx, y, back + 0.025).premultiply(dm));
    // Raised fields inside the panels.
    for (const [y0, y1] of [[0.24, 0.58], [0.66, 1.08], [1.16, DOOR_SPRING - 0.08]]) {
      dr.box(lw - 0.2, y1 - y0 - 0.06, 0.035, mat(cx, (y0 + y1) / 2, back + 0.02).premultiply(dm));
    }
    // A ring pull on each leaf.
    ir.at(mat(sd * 0.07, 0.95, back + 0.06).premultiply(dm)).add(new TorusGeometry(0.045, 0.008, 6, 16));
  }
  // The light from the room shows in a crack between the leaves.
  gl.box(0.012, DOOR_SPRING - 0.06, 0.05, mat(0, DOOR_SPRING / 2, back + 0.01).premultiply(dm));
  // The fanlight: lit glass behind iron glazing bars.
  {
    const fan: P2[] = [];
    for (let i = 0; i <= 24; i++) { const a = Math.PI * i / 24; fan.push([Math.cos(a) * DOOR_HALF, Math.sin(a) * DOOR_HALF]); }
    prism(gl, fan, -0.03, 0, mat(0, DOOR_SPRING, back).premultiply(dm));
    ir.box(DOOR_HALF * 2, 0.06, 0.06, mat(0, DOOR_SPRING + 0.02, back + 0.03).premultiply(dm));
    for (let i = 1; i < 6; i++) {
      const a = Math.PI * i / 6;
      ir.box(0.025, DOOR_HALF, 0.03, mat(Math.cos(a) * DOOR_HALF / 2, DOOR_SPRING + Math.sin(a) * DOOR_HALF / 2, back + 0.02, 0, 0, a - Math.PI / 2).premultiply(dm));
    }
    ir.at(mat(0, DOOR_SPRING, back + 0.02).premultiply(dm)).add(new TorusGeometry(DOOR_HALF * 0.45, 0.012, 4, 24, Math.PI));
  }

  /* ---------- the lamps: bulkhead cages round the light model's bulbs ---------- */
  // world/lights and world/lamp own the bulbs.
  // The hero adds only the iron round them.
  const bulbs = main.root.children.filter((o): o is Mesh => o instanceof Mesh && o.geometry instanceof SphereGeometry);
  for (const b of bulbs) {
    const r = (b.geometry as SphereGeometry).parameters.radius, bp = b.position;
    const a = Math.atan2(bp.x, -bp.z), wr = wallR(bp.y);
    const m = onWall(a, bp.y, 0, wr);
    // The wall plate behind the globe.
    ir.at(mat(0, 0, 0.01, Math.PI / 2).premultiply(m)).add(new CylinderGeometry(r * 1.45, r * 1.5, 0.04, 24));
    // Three bars arch over the globe.
    const out = Math.hypot(bp.x, bp.z) - wr;
    for (const tilt of [-0.75, 0, 0.75]) {
      ir.at(mat(0, 0, out, 0, 0, tilt).premultiply(m))
        .add(new TorusGeometry(r * 1.08, r * 0.075, 5, 14, Math.PI).rotateZ(Math.PI / 2).rotateY(Math.PI / 2));
    }
    // A collar where the bars meet the plate.
    ir.at(mat(0, 0, 0.025).premultiply(m)).add(new TorusGeometry(r * 1.12, r * 0.09, 6, 24));
    // A small visor keeps the rain off the globe.
    ir.at(mat(0, r * 1.05, r * 0.55, -0.35).premultiply(m)).add(new BoxGeometry(r * 2.6, 0.02, r * 1.3));
  }

  /* ---------- the catwalk round the drum ---------- */
  // A steel deck on brackets, with a toe board.
  // A rail and a knee rail run round it.
  // The deck is grey checker plate.
  // The rest is black iron.
  const deck = new Geo();
  deck.lathe([[DECK_IN - 0.02, DECK_Y - u(0.03)], [DECK_OUT, DECK_Y - u(0.03)], [DECK_OUT, DECK_Y], [DECK_IN - 0.02, DECK_Y]], 160, { closed: true });
  // The fascia channel at the deck's edge rises into a toe board.
  ir.at().lathe([[DECK_OUT - u(0.01), DECK_Y - u(0.16)], [DECK_OUT + u(0.012), DECK_Y - u(0.16)], [DECK_OUT + u(0.012), DECK_Y + u(0.1)],
    [DECK_OUT - u(0.01), DECK_Y + u(0.1)]], 160, { closed: true });
  const RAIL_R = DECK_OUT - u(0.03);
  for (const [y, t] of [[DECK_Y + RAIL_H, u(0.024)], [DECK_Y + RAIL_H * 0.5, u(0.018)]] as P2[]) {
    ir.at(mat(0, y, 0, Math.PI / 2)).add(new TorusGeometry(RAIL_R, t, 8, 220));
  }
  ir.at();
  // One post, one bracket and one joist every 10 degrees.
  const post = new Geo();
  const pw = u(0.045);
  post.box(pw, RAIL_H, pw, mat(0, DECK_Y + RAIL_H / 2, -RAIL_R));
  // The joist runs under the deck from the wall to the fascia.
  const jl = DECK_OUT - DECK_IN;
  post.box(u(0.05), u(0.12), jl, mat(0, DECK_Y - u(0.09), -(DECK_IN + jl / 2)));
  // The knee brace runs from the wall to the joist's outer third.
  const b0 = new Vector3(0, DECK_Y - u(0.75), -wallR(DECK_Y - u(0.75))), b1 = new Vector3(0, DECK_Y - u(0.12), -(DECK_IN + jl * 0.75));
  const bl = b0.distanceTo(b1);
  post.box(u(0.04), bl, u(0.06), mat(0, (b0.y + b1.y) / 2, (b0.z + b1.z) / 2, Math.atan2(b1.z - b0.z, b1.y - b0.y)));
  post.box(u(0.12), u(0.18), u(0.02), mat(0, b0.y, b0.z - u(0.01)));
  const steps: Matrix4[] = [];
  for (let k = 0; k < 36; k++) steps.push(new Matrix4().makeRotationY(-(5 + 10 * k) * DEG));
  const posts = instances(post, ironI, steps);

  /* ---------- the cupola: gore plates, slit girders, the shutter ---------- */
  const cupola = new Group();
  cupola.position.y = DRUM_H;
  const dome = tx.dome, leafT = tx.leaf;
  // White paint over steel plate, a little worn.
  const paint = std({ map: dome.map, normalMap: dome.normal, roughness: 0.55 });
  const leafPaint = std({ map: leafT.map, normalMap: leafT.normal, roughness: 0.5 });
  const plain = std({ color: 0xd9d7d0, roughness: 0.55 });
  const plainI = std({ color: 0xd9d7d0, roughness: 0.55 });
  // The inside of the plate, in shadow.
  const inner = std({ color: 0x55534f, roughness: 0.85, side: BackSide });

  // The shell: two halves beside the slit, a cap behind its end.
  const shell = new Geo();
  patch(shell, R, -Math.PI / 2, -SLIT_B, 0, Math.PI, 26, 96, domeUV);
  patch(shell, R, SLIT_B, Math.PI / 2, 0, Math.PI, 26, 96, domeUV);
  patch(shell, R, -SLIT_B, SLIT_B, SLIT_E, Math.PI, 6, 26, domeUV);
  const shellGeo = shell.build();
  cupola.add(new Mesh(shellGeo, paint), new Mesh(shellGeo, inner));

  // The slit girders run over the top to the back foot.
  // Their top carries the leaf's rails.
  // A lip over the slit sheds the wind and the rain.
  // The foot flange's edge is chamfered, so it catches the light.
  const GIRDER = um([[0, 0], [0.205, 0], [0.18, 0.012], [0.15, 0.012], [0.15, 0.22], [0.135, 0.235], [-0.045, 0.235],
    [-0.045, 0.2], [-0.03, 0.2], [-0.03, 0.222], [0, 0.222]]);
  const pl = new Geo();
  for (const side of [-1, 1]) pl.sweep(GIRDER, framesAlongE(R, side * SLIT_B, 0, Math.PI, 120, side));
  // A header closes the slit's top end.
  const gB = u(0.2) / R;
  pl.sweep(GIRDER, framesAlongB(R, SLIT_E, -SLIT_B - gB, SLIT_B + gB, 16));

  // The leaf rides over the girders.
  // To open, it slides over the back.
  // It laps over the roll shutter below and the header above.
  const leaf = new Group();
  const rL = R + u(0.27), bL = SLIT_B + u(0.24) / R;
  const eB = SPLIT_E - u(0.12) / R, eT = SLIT_E + u(0.2) / R;
  const lg = new Geo(), lp = new Geo();
  // Its plate: 2.4 m of texture along it.
  patch(lg, rL, -bL, bL, eB, eT, 18, 44, (_d, i, j) => [i / 18, (eT - eB) * rL * SCALE * j / 44 / 2.4]);
  patch(lp, rL - u(0.008), -bL, bL, eB, eT, 10, 30, () => [0, 0], true);
  // Side skirts hang down outside the girders.
  for (const side of [-1, 1]) {
    lp.sweep(um([[0, 0], [0.007, 0], [0.007, -0.2], [0, -0.2]]), framesAlongE(rL, side * bL, eB, eT, 30, side));
  }
  // The weather lip at its foot hangs over the roll shutter.
  lp.sweep(um([[0, 0], [0.007, 0], [-0.02, -0.15], [-0.027, -0.15]]), framesAlongB(rL, eB, -bL, bL, 16));
  // Low angle ribs cross it every 70 cm.
  // Rivets stitch their feet.
  const RIB = um([[-0.004, 0], [0.004, 0], [0.004, 0.045], [0.03, 0.045], [0.03, 0.054], [-0.03, 0.054], [-0.03, 0.045], [-0.004, 0.045]]);
  const leafRiv: Matrix4[] = [], riv = (p: Vector3, n: Vector3, list: Matrix4[]) => list.push(onNormal(p, n));
  const ribStep = u(0.7) / rL;
  for (let e = eB + ribStep * 0.6; e < eT - ribStep * 0.3; e += ribStep) {
    lp.sweep(RIB, framesAlongB(rL, e, -bL + u(0.03) / rL, bL - u(0.03) / rL, 16));
    for (const off of [-1, 1]) {
      const ee = e + off * u(0.045) / rL;
      for (let b = -bL + u(0.06) / rL; b < bL - u(0.04) / rL; b += u(0.09) / rL) { const q = sp(rL, b, ee); riv(q, q.clone().normalize(), leafRiv); }
    }
  }
  // Edge angles run along both sides of the plate.
  for (const side of [-1, 1]) {
    lp.sweep(um([[0, 0], [0.05, 0], [0.05, 0.006], [0.006, 0.006], [0.006, 0.05], [0, 0.05]]), framesAlongE(rL, side * (bL - u(0.055) / rL), eB, eT, 30, side));
    for (let e = eB + u(0.05) / rL; e < eT; e += u(0.09) / rL) { const q = sp(rL, side * (bL - u(0.025) / rL), e); riv(q, q.clone().normalize(), leafRiv); }
  }
  // An open profile runs from the foot up.
  // Then its normals face out.
  const rivet = new Geo().lathe(um([[0.011, 0], [0.0075, 0.0055], [0.0005, 0.007]]), 6, { smooth: true });
  leaf.add(new Mesh(lg.build(), leafPaint), new Mesh(lp.build(), plain), instances(rivet, plainI, leafRiv));
  cupola.add(leaf);

  // Bolt heads on the roll shutter's box.
  const boxBolts: Matrix4[] = [];
  // The roll shutter: hinged slats run down the slit.
  // They roll into a box at the slit's foot.
  const NS = 18, DS = SPLIT_E / NS, rT = R + u(0.13), bT = SLIT_B + u(0.02) / R;
  const slatH = DS * rT * SCALE;
  const slat = new Geo().sweep(um([[0, -0.012], [0.012, -0.017], [slatH - 0.01, -0.015], [slatH, -0.009], [slatH, 0.004],
    [slatH - 0.025, 0.012], [0.03, 0.014], [0.007, 0.011], [0, 0.002]]), framesAlongB(rT, 0, -bT, bT, 14));
  const slats = new InstancedMesh(slat.build(), plainI, NS);
  // The slats move, so their bounds change.
  slats.frustumCulled = false;
  cupola.add(slats);
  // The box has a rounded lip in front.
  // A slot behind the lip takes the slats.
  {
    const box = new Shape();
    const p0 = R - 0.12, lipIn = rT + u(0.03), lipOut = R + u(0.3), top = u(0.11);
    box.moveTo(p0, -0.18);
    box.lineTo(lipOut, -0.18);
    box.lineTo(lipOut, top - u(0.06));
    box.absarc((lipIn + lipOut) / 2, top - u(0.06), (lipOut - lipIn) / 2, 0, Math.PI, false);
    box.lineTo(lipIn, -0.08);
    box.lineTo(rT - u(0.04), -0.08);
    box.lineTo(rT - u(0.04), u(0.02));
    box.lineTo(p0, u(0.02));
    const xB = R * Math.sin(SLIT_B) + u(0.24);
    pl.at().add(new ExtrudeGeometry(box, { depth: 2 * xB, bevelEnabled: false, curveSegments: 10 }).rotateY(Math.PI / 2).translate(-xB, 0, 0));
    // The housing is bolted up from plates.
    // Cover strips hide the joints.
    // Two rows of bolts hold the lip.
    for (const x of [-xB, -xB / 3, xB / 3, xB]) pl.box(u(0.06), top - u(0.06) + 0.18 - u(0.01), u(0.008), mat(x, (-0.18 + top - u(0.06)) / 2, -lipOut - u(0.004)));
    for (const y of [-0.15, top - u(0.09)]) {
      for (let x = -xB + u(0.06); x < xB; x += u(0.15)) boxBolts.push(new Matrix4().makeRotationX(-Math.PI / 2).setPosition(x, y, -lipOut));
    }
  }

  // The skirt: a deep band round the cupola's foot.
  // A rolled bead runs along its lower edge.
  pl.at().lathe([[R - 0.08, 0.01], [R + u(0.02), 0.01], [R + u(0.05), -0.005], [R + u(0.05), -0.15], [R + u(0.075), -0.16],
    [R + u(0.075), -0.18], [R + u(0.05), -0.19], [R - 0.08, -0.19]], 180, { closed: true });

  // Rivets on the shell: a row above the skirt.
  // More rivets run along each girder's foot.
  const shellRiv: Matrix4[] = [];
  const bClear = SLIT_B + u(0.24) / R;
  for (let k = 0; k < 360; k++) {
    const az = (k + 0.5) / 360 * 2 * Math.PI, x = Math.sin(az), z = -Math.cos(az);
    // In slit space the slit covers small |x| at the front.
    if (z < 0 && Math.abs(x) < Math.sin(bClear)) continue;
    const q = new Vector3(x * R, u(0.035), z * R);
    q.setLength(R);
    riv(q, q.clone().normalize(), shellRiv);
  }
  for (const side of [-1, 1]) {
    const b = side * (SLIT_B + u(0.18) / R);
    for (let e = u(0.05) / R; e < Math.PI; e += u(0.09) / R) {
      const q = sp(R + u(0.012), b, e);
      riv(q, q.clone().normalize(), shellRiv);
    }
  }
  const bolt = new Geo().lathe(um([[0.018, 0], [0.018, 0.009], [0.012, 0.014], [0.0005, 0.014]]), 6);
  cupola.add(new Mesh(pl.build(), plain), instances(rivet, plainI, shellRiv), instances(bolt, plainI, boxBolts));

  /* ---------- the drive: a toothed ring under the skirt, pinions on the catwalk ---------- */
  // Machined steel, oiled.
  // The drive housings wear grey-green enamel.
  // No sky map lights the metal.
  // So the metal keeps some diffuse light, to read at night.
  const steel = std({ color: 0x55595d, roughness: 0.4, metalness: 0.45 });
  const steelI = std({ color: 0x55595d, roughness: 0.4, metalness: 0.45 });
  const enamel = std({ color: 0x3b4741, roughness: 0.45, metalness: 0.25 });
  const brass = std({ color: 0xb08a48, roughness: 0.35, metalness: 0.8 });
  // The ring gear's rim hangs under the skirt.
  // Its teeth face out.
  const PITCH = u(0.063), RING_N = Math.round(2 * Math.PI * R / PITCH);
  const G0 = -0.28, G1 = -0.2, TOOTH = u(0.045);
  const cs = new Geo();
  cs.lathe([[R - 0.1, G1], [R - TOOTH / 2, G1], [R - TOOTH / 2, G0], [R - 0.1, G0]], 240, { closed: true });
  // Bogies under the rim ride on the track.
  const bogie = new Geo();
  bogie.box(0.13, 0.05, 0.09, mat(0, -0.305, -(R - 0.075)));
  bogie.at(mat(0, -0.345, -(R - 0.075), 0, 0, Math.PI / 2)).add(new CylinderGeometry(0.034, 0.034, 0.05, 14));
  const bogies: Matrix4[] = [];
  for (let k = 0; k < 16; k++) bogies.push(new Matrix4().makeRotationY(-(k + 0.5) / 16 * 2 * Math.PI));
  // One tooth: a trapezoid, wide at its root, pushed out along Y.
  const tooth = (n: number, r: number, h0: number, h1: number): Geo => {
    const p = 2 * Math.PI * r / n, g = new Geo();
    prism(g, [[-0.28 * p, r - TOOTH / 2], [0.28 * p, r - TOOTH / 2], [0.15 * p, r + TOOTH / 2], [-0.15 * p, r + TOOTH / 2]], h0, h1, mat(0, 0, 0, -Math.PI / 2));
    return g;
  };
  const teeth: Matrix4[] = [];
  for (let k = 0; k < RING_N; k++) teeth.push(new Matrix4().makeRotationY(-k / RING_N * 2 * Math.PI));
  cupola.add(new Mesh(cs.build(), steel), instances(tooth(RING_N, R, G0 + 0.004, G1 - 0.004), steelI, teeth), instances(bogie, steelI, bogies));

  // The track ring sits on the wall's coping.
  // A dark seal stands inside it.
  const fx = new Geo();
  fx.lathe([[R - 0.16, DRUM_H - 0.395], [R - 0.01, DRUM_H - 0.395], [R - 0.01, DRUM_H - 0.385], [R - 0.07, DRUM_H - 0.38],
    [R - 0.06, DRUM_H - 0.36], [R - 0.12, DRUM_H - 0.36], [R - 0.11, DRUM_H - 0.38], [R - 0.16, DRUM_H - 0.385]], 240, { closed: true });
  fx.lathe([[R - 0.17, DRUM_H - 0.39], [R - 0.155, DRUM_H - 0.39], [R - 0.155, DRUM_H - 0.215], [R - 0.17, DRUM_H - 0.215]], 120, { closed: true });

  // Three drive units stand on the catwalk.
  // Each pinion meshes with the ring.
  // One stands just east of the door.
  // So the gear cut finds it.
  const PIN_N = 14, rp = PIN_N * PITCH / (2 * Math.PI), rc = R + rp;
  const DRIVES = [13, 133, 253].map(a => a * DEG);
  const pinTeeth: Matrix4[] = [];
  for (let k = 0; k < PIN_N; k++) pinTeeth.push(new Matrix4().makeRotationY(-k / PIN_N * 2 * Math.PI));
  const pinGeo = new Geo();
  for (const m of pinTeeth) {
    const g = tooth(PIN_N, rp, G0 + 0.006, G1 - 0.006).build();
    pinGeo.at(m).add(g);
  }
  pinGeo.at().add(new CylinderGeometry(rp - TOOTH / 2, rp - TOOTH / 2, G1 - G0 - 0.01, 24).translate(0, (G0 + G1) / 2, 0));
  const pinG = pinGeo.build();
  const pinions: Mesh[] = [];
  const dv = new Geo(), dvBrass = new Geo();
  const yb = DECK_Y, hb = DRUM_H + G0 - 0.12 - yb;
  for (const a of DRIVES) {
    const m = new Matrix4().makeRotationY(-a);
    const p = new Mesh(pinG, steel);
    p.position.set(rc * Math.sin(a), DRUM_H, -rc * Math.cos(a));
    pinions.push(p);
    // The gearbox stands under the pinion.
    // The shaft rises through its lid.
    dv.box(0.24, hb, 0.2, mat(0, yb + hb / 2, -rc).premultiply(m));
    dv.box(0.28, 0.025, 0.24, mat(0, yb + hb + 0.012, -rc).premultiply(m));
    steelBits(fx, m, rc, yb + hb, DRUM_H + G0);
    // The motor lies along the wall.
    // It has cooling fins and a terminal box.
    dv.at(mat(-0.22, yb + 0.1, -rc, 0, 0, Math.PI / 2).premultiply(m)).add(new CylinderGeometry(0.075, 0.075, 0.24, 20));
    for (let f = 0; f < 6; f++) dv.at(mat(-0.13 - f * 0.035, yb + 0.1, -rc, 0, 0, Math.PI / 2).premultiply(m)).add(new CylinderGeometry(0.088, 0.088, 0.008, 20));
    dv.box(0.08, 0.06, 0.07, mat(-0.24, yb + 0.2, -rc).premultiply(m));
    // A brass rating plate and an oil cup.
    dvBrass.box(0.06, 0.035, 0.004, mat(-0.22, yb + 0.1, -rc - 0.077).premultiply(m));
    dvBrass.at(mat(0.06, yb + hb + 0.04, -rc - 0.05).premultiply(m)).add(new CylinderGeometry(0.012, 0.016, 0.03, 10));
    // A bracket ties the unit to the wall.
    dv.box(0.04, 0.16, wallR(yb) - (rc - 0.1) + 0.05, mat(0.1, yb + 0.08, -(rc - 0.1 + wallR(yb)) / 2 + 0.02).premultiply(m));
  }
  fx.at();

  /* ---------- the inside, seen through the slit ---------- */
  const FLOOR_Y = DRUM_H - PIER_H, IN_R = DRUM_R - 0.36;
  const plaster = inside(std({ color: 0x8a867e, roughness: 0.9 }), 0.12);
  const floorMat = inside(std({ color: 0x3e3832, roughness: 0.75 }), 0.12);
  const lampMat = inside(std({ color: 0x3b4741, roughness: 0.45, metalness: 0.25 }), 0.14);
  const wood = inside(std({ color: 0x6a4a30, roughness: 0.7 }), 0.12);
  // The cupola's inside sees some sky through the slit.
  const ribMat = inside(std({ color: 0x6b6d6e, roughness: 0.7 }), 0.35);
  inside(inner, 0.35);
  const inWall = new Geo(), fl = new Geo(), fix = new Geo(), lad = new Geo(), rb = new Geo();
  // The drum's inner wall is plastered.
  // It faces in.
  inWall.lathe([[IN_R, WALL_TOP + u(0.07)], [IN_R, FLOOR_Y]], 96);
  // The observing floor, boarded, and the room's skirting.
  // The telescope's pier rises through it, south of the dome's axis.
  // The floor lies under the eyepiece's lowest reach.
  fl.lathe([[IN_R, FLOOR_Y], [0, FLOOR_Y]], 96);
  fl.lathe([[IN_R, FLOOR_Y + u(0.15)], [IN_R - u(0.02), FLOOR_Y + u(0.15)], [IN_R - u(0.02), FLOOR_Y]], 96);
  // The red work lamp hangs low on the wall.
  // It sits low, so the glow fades up the cupola.
  // The bulb stands just in front of its housing.
  const LAMP_A = 160 * DEG, LAMP_R = IN_R - 0.1;
  const lampP = new Vector3(LAMP_R * Math.sin(LAMP_A), FLOOR_Y + 0.5, -LAMP_R * Math.cos(LAMP_A));
  main.root.localToWorld(RED.uRedP.value.copy(lampP));
  fix.box(0.12, 0.1, 0.07, mat((LAMP_R + 0.07) * Math.sin(LAMP_A), lampP.y + 0.03, -(LAMP_R + 0.07) * Math.cos(LAMP_A), 0, -LAMP_A));
  const redBulb = new Mesh(new SphereGeometry(0.03, 10, 6), new MeshBasicMaterial({ color: new Color(0.32, 0.02, 0.01) }));
  redBulb.position.copy(lampP);
  // The observing ladder stands against the wall, out of the telescope's way.
  // Every part stays 2 units from the axes' crossing and under its tube.
  // Five oak treads, a top step, two rails.
  {
    const H = u(1.5), D = u(1), RC = 2 + D / 2;
    const m = new Matrix4().makeRotationY(-205 * DEG).multiply(mat(0, FLOOR_Y, -RC));
    // Stringers climb from the front foot to the top step.
    // Posts hold the back.
    for (const sx of [-1, 1]) {
      const l = Math.hypot(H, D);
      lad.box(u(0.05), l, u(0.12), mat(sx * u(0.32), H / 2, 0, Math.atan2(-D, H)).premultiply(m));
      lad.box(u(0.045), H + u(0.6), u(0.045), mat(sx * u(0.3), (H + u(0.6)) / 2, -D / 2 - u(0.1), 0).premultiply(m));
    }
    for (let k = 1; k <= 5; k++) {
      const f = k / 5;
      lad.box(u(0.62), u(0.035), k === 5 ? u(0.35) : u(0.2), mat(0, H * f, D / 2 - D * f + (k === 5 ? u(0.08) : 0)).premultiply(m));
    }
    // A hand rail joins the posts at the top.
    lad.box(u(0.64), u(0.04), u(0.04), mat(0, H + u(0.6), -D / 2 - u(0.1)).premultiply(m));
  }
  // Inside the cupola, ribs climb the gore seams.
  // Box girders run along the slit.
  // A ring beam runs round the foot.
  const inSlit = (p: Vector3): boolean => {
    const r = p.length(), b = Math.asin(p.x / r), e = Math.atan2(p.y, -p.z);
    return Math.abs(b) < SLIT_B + u(0.32) / R && e < SLIT_E + u(0.3) / R;
  };
  // Their tops sit 2 cm under the plate, so no face fights the shell's depth.
  const RIBP = um([[-0.006, -0.02], [0.006, -0.02], [0.006, -0.2], [0.06, -0.2], [0.06, -0.215], [-0.06, -0.215], [-0.06, -0.2], [-0.006, -0.2]]);
  for (let k = 0; k < 12; k++) {
    const az = (7.5 + 30 * k) * DEG, fr: Frame[] = [];
    for (let L = 0; L <= 88; L += 2) {
      const p = new Vector3(Math.cos(L * DEG) * Math.sin(az), Math.sin(L * DEG), -Math.cos(L * DEG) * Math.cos(az)).multiplyScalar(R - 0.005);
      if (inSlit(p)) break;
      fr.push({ p, s: new Vector3(Math.cos(az), 0, Math.sin(az)), u: p.clone().normalize() });
    }
    if (fr.length > 1) rb.sweep(RIBP, fr);
  }
  const INBOX = um([[0, -0.02], [0.24, -0.02], [0.24, -0.3], [0, -0.3]]);
  for (const side of [-1, 1]) rb.sweep(INBOX, framesAlongE(R - 0.004, side * SLIT_B, 0, SLIT_E + u(0.24) / R, 60, side));
  rb.sweep(INBOX, framesAlongB(R - 0.004, SLIT_E, -SLIT_B, SLIT_B, 10));
  rb.lathe([[R - 0.01, u(0.16)], [R - u(0.2), u(0.16)], [R - u(0.2), u(0.14)], [R - u(0.03), u(0.14)], [R - u(0.03), u(0.02)],
    [R - u(0.2), u(0.02)], [R - u(0.2), 0], [R - 0.01, 0]], 120, { closed: true });
  cupola.add(new Mesh(rb.build(), ribMat));

  const parts: Object3D[] = [
    new Mesh(st.build(), stoneMat), new Mesh(ir.build(), iron), new Mesh(deck.build(), deckMat),
    new Mesh(fx.build(), steel), new Mesh(dv.build(), enamel), new Mesh(dvBrass.build(), brass), ...pinions,
    new Mesh(inWall.build(), plaster), new Mesh(fl.build(), floorMat), new Mesh(fix.build(), lampMat), new Mesh(lad.build(), wood), redBulb, new Mesh(dr.build(), doorMat), new Mesh(gl.build(), glow), posts, cupola,
  ];
  root.add(...parts);

  // The telescope stands on the pier.
  // Another module builds it.
  // Its root sits where the dome's root sits.
  // So it takes size 1 here.
  const scope = buildHeroScope(1);
  root.add(scope.root);
  // It takes the inside light, but its glass keeps its own look.
  const seen = new Set<Material>(mats);
  scope.root.traverse((o) => {
    if (!(o instanceof Mesh) || o === scope.glass) return;
    const m = o.material as Material;
    if (seen.has(m) || !(m instanceof MeshStandardMaterial)) return;
    seen.add(m);
    // The tube stands in the slit, so it sees much of the sky.
    mats.push(inside(m, 0.7));
  });
  if (scope.glass.material instanceof MeshStandardMaterial) mats.push(scope.glass.material);
  for (const m of mats) duskPatch(m);

  let shown = false;
  return {
    root,
    scope,
    textures: [stone.map, stone.normal, dome.map, dome.normal, leafT.map, leafT.normal],
    show(on) {
      if (on === shown) return;
      shown = on;
      if (on) main.root.add(root);
      else root.removeFromParent();
    },
    follow(d) {
      const P = d.pose;
      cupola.rotation.y = -P.az * DEG;
      leaf.rotation.x = P.open * UP_OPEN;
      // The slats run down by the light model's lower-leaf angle.
      // A slat wholly under the foot is rolled up in the box.
      for (let i = 0; i < NS; i++) {
        const a = i * DS + P.open * LOW_OPEN;
        if (a + DS > -0.002) TM.makeRotationX(a);
        else TM.makeScale(0, 0, 0);
        slats.setMatrixAt(i, TM);
      }
      slats.instanceMatrix.needsUpdate = true;
      // Each pinion turns one tooth per ring tooth that passes.
      // At a whole tooth count, a ring tooth sits in a pinion gap.
      DRIVES.forEach((a, i) => {
        const teethPast = (a - P.az * DEG) * RING_N / (2 * Math.PI);
        pinions[i].rotation.y = -(a + Math.PI + Math.PI / PIN_N + teethPast * 2 * Math.PI / PIN_N);
      });
      scope.setTube(P.tube.alt, P.tube.az);
      glow.emissiveIntensity = d.door.emissiveIntensity;
    },
  };
}

// A drive's shaft from its gearbox lid to the pinion.
// A collar sits at its foot.
function steelBits(g: Geo, m: Matrix4, rc: number, y0: number, y1: number): void {
  g.at(mat(0, (y0 + y1) / 2, -rc).premultiply(m)).add(new CylinderGeometry(0.025, 0.025, y1 - y0, 12));
  g.at(mat(0, y0 + 0.03, -rc).premultiply(m)).add(new CylinderGeometry(0.05, 0.05, 0.04, 16));
  g.at();
}

// A flat shape pushed out between two depths along local Z.
function prism(g: Geo, shape: P2[], z0: number, z1: number, m: Matrix4): void {
  g.at(m);
  const n = shape.length;
  // The front and the back faces fan out from the first point.
  for (const [z, nz] of [[z1, 1], [z0, -1]] as P2[]) {
    const ids = shape.map(([x, y]) => g.v(x, y, z, 0, 0, nz, x, y));
    for (let i = 1; i + 1 < n; i++) g.tri(ids[0], ids[i], ids[i + 1]);
  }
  const fr: Frame[] = [z0, z1].map(z => ({ p: new Vector3(0, 0, z), s: new Vector3(1, 0, 0), u: new Vector3(0, 1, 0) }));
  g.sweep(shape, fr);
  g.at();
}

/* ---------- the build: after the first frame, in steps ---------- */
// The whole build takes more than 50 ms.
// So it waits for the first frame.
// Each step is its own task.
// So no step holds a frame for long.
// 1: paint the textures.
// 2: build the meshes.
// 3: compile the shaders without a stall.
// 4: upload the meshes and the textures.
// The cuts use the hero once it is ready.
// Until then they keep the light model.
let built: Built | null = null, ready = false;
const ms = { paint: 0, build: 0, compile: 0, upload: 0 };
const timed = <T>(key: keyof typeof ms, f: () => T): T => { const t = performance.now(), r = f(); ms[key] = Math.round(performance.now() - t); return r; };

// The shaders compile for the composer's target: linear colour, no tone map.
// The GPU builds its draw state per target format.
// So the samples match too.
const warmTarget = (): WebGLRenderTarget => new WebGLRenderTarget(4, 4, { type: HalfFloatType, samples: 4 });

// Renders the hero off screen.
// Then its buffers, textures and draw states sit on the GPU.
// A stand-in scene holds lights of the real scene's kinds and counts.
// So every shader matches the cuts' shaders, and none compiles twice.
// Each task draws one mesh.
// So no task holds a frame for long.
function upload(b: Built, done: () => void): void {
  const ws = new Scene();
  ws.fog = scene.fog;
  scene.traverse((o) => {
    if (!(o instanceof Light)) return;
    if (o instanceof HemisphereLight) ws.add(new HemisphereLight());
    else if (o instanceof DirectionalLight) ws.add(new DirectionalLight());
    else if (o instanceof SpotLight) ws.add(new SpotLight());
    else if (o instanceof PointLight) ws.add(new PointLight());
  });
  ws.add(b.root);
  // A far eye sees all of the model.
  // So frustum culling skips nothing.
  const eye = new PerspectiveCamera(40, 1, 0.1, 200);
  eye.position.set(0, 4, 30);
  eye.lookAt(0, 3, 0);
  const rt = warmTarget();
  const meshes: Mesh[] = [];
  b.root.traverse((o) => { if (o instanceof Mesh) meshes.push(o); });
  let i = 0;
  const step = (): void => {
    const t = performance.now();
    if (i === 0) for (const tx of b.textures) renderer.initTexture(tx);
    for (const m of meshes) m.visible = m === meshes[i];
    renderer.setRenderTarget(rt);
    renderer.render(ws, eye);
    renderer.setRenderTarget(null);
    i++;
    ms.upload += performance.now() - t;
    if (i < meshes.length) { setTimeout(step, 0); return; }
    for (const m of meshes) m.visible = true;
    rt.dispose();
    ws.remove(b.root);
    ms.upload = Math.round(ms.upload);
    done();
  };
  step();
}

function start(): void {
  const tx = timed('paint', () => ({ stone: stoneTex(), dome: domeTex(), leaf: leafTex() }));
  setTimeout(() => {
    const b = built = timed('build', () => buildHero(complex.main, tx));
    setTimeout(() => {
      const rt = warmTarget(), t = performance.now();
      renderer.setRenderTarget(rt);
      const done = renderer.compileAsync(b.root, camera, scene);
      renderer.setRenderTarget(null);
      void done.then(() => {
        ms.compile = Math.round(performance.now() - t);
        rt.dispose();
        setTimeout(() => upload(b, () => { ready = true; }), 0);
      });
    }, 0);
  }, 0);
}
setTimeout(start, 0);

export const hero = {
  // True once the model is built and on the GPU.
  get ready(): boolean { return ready; },
  // The objective glass: the lens cut puts the star reflections on it.
  get glass(): Mesh | null { return built ? built.scope.glass : null; },
  // The telescope: the cuts hand its glass the stars and the sky.
  get scope(): HeroScope | null { return built ? built.scope : null; },
  show(on: boolean): void { built?.show(on); },
  follow(d: Dome): void { built?.follow(d); },
  // Triangles, draw calls, and the time of each build step in ms.
  stats(): { tris: number; calls: number; ms: typeof ms; ready: boolean } {
    let tris = 0, calls = 0;
    built?.root.traverse((o) => {
      if (!(o instanceof Mesh)) return;
      const g = o.geometry as BufferGeometry;
      const n = (g.index ? g.index.count : g.attributes.position.count) / 3;
      const k = o instanceof InstancedMesh ? o.count : 1;
      tris += n * k; calls++;
    });
    return { tris, calls, ms: { ...ms }, ready };
  },
};
