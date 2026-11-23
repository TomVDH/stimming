// Load order: none.
// The module builds nothing until a caller asks for the hero scope.
import {
  BoxGeometry, BufferAttribute, BufferGeometry, CanvasTexture, CylinderGeometry,
  EquirectangularReflectionMapping, ExtrudeGeometry, Group, InstancedMesh, LatheGeometry, Matrix4, Mesh,
  MeshStandardMaterial, Quaternion, RepeatWrapping, RingGeometry, SRGBColorSpace, Shape,
  SphereGeometry, TorusGeometry, TubeGeometry, Vector2, Vector3, Curve,
} from 'three';
import type { Material, Matrix3, MeshStandardMaterialParameters, Texture } from 'three';
import type { Star } from '../core/catalog.ts';
import { HEMI_I, hemi } from './hill.ts';
import { buildStarEnv, lensGeometry, makeGlassMaterial, type LensShape } from './hero-glass.ts';
import { TUBE_REST_ALT } from './observatory.ts';
import { AXES_UP, D_OFF, flipPose, targetPose, TUBE_SHIFT, type Pose } from '../core/clearance.ts';

/* ---------- the hero scope: a long refractor on a German equatorial mount ---------- */
// Only the cuts show this model.
// The wide shot keeps the light model.
// Sizes are in metres at size 1, as in world/observatory.ts.
// +Y is up, -Z is north, +X is east.

export type HeroScope = {
  root: Group;
  glass: Mesh;
  // Returns true when a flip over the pole starts.
  setTube(alt: number, az: number): boolean;
  // Advances a running flip. Returns true while it still runs.
  step(now: number): boolean;
  // The joint groups, for the clearance check.
  parts: { mount: Group; polar: Group; ra: Group; dec: Group; tube: Group; worm: Group; knob: Group };
  // m: the sky matrix from sky/stars.ts, catalog frame to world.
  setSky(m: Matrix4 | Matrix3): void;
  // dir: the target star's world direction.
  // k = 0 adds no boost.
  setTarget(dir: Vector3, k: number): void;
  // The slit's azimuth and half width in degrees.
  // The slit is off by default.
  setSlit(azDeg: number, halfWidthDeg: number, on: boolean): void;
  // Hands over the catalog once it loads.
  // The glass then shows the stars.
  setStars(stars: readonly Star[]): void;
};

const DEG = Math.PI / 180;
// The scope's frame puts the cupola's turn height here.
// A host lifts the scope's root by its own turn height less this.
export const SCOPE_TURN = 3.4;
// Copied from world/observatory.ts, TUBE_FRONT: the mouth's reach forward.
const TUBE_FRONT = 2.6;
// Copied from world/observatory.ts, SLIT_B: the slit is 1.3 m wide.
const SLIT_HALF = 0.65;
// Copied from sky/stars.ts, LAT: the site's latitude in degrees.
const LAT = 51;
// The axes cross over the dome's centre, 0.35 over the drum top.
// Nothing below the polar axis ever moves.
const AXES_Y = SCOPE_TURN + AXES_UP;
// The declination flange's outer face, out from the polar axis.
// The dec axis is long enough that the saddle clears the RA housing.
const DEC_FACE = 0.215;
// The saddle plate's thickness on that flange.
const PLATE = 0.03;
// The flip over the pole takes this long, in milliseconds.
const FLIP_MS = 1600;
// The worm's place on the polar housing.
// The thread reaches 0.026 m; at 0.25 m it clears the teeth.
const WORM_Y = -0.905, WORM_Z = 0.25;
// A single-start worm: one turn moves the wheel one tooth.
// 150 teeth, so the worm turns 150 times per RA turn.
const WORM_RATIO = 150;
// Thread pitch equals tooth pitch, so thread and teeth travel together.
const WORM_PITCH = (2 * Math.PI * 0.2155) / WORM_RATIO;
// Dec hand wheel turns per dec turn: a stylised ratio, not the real one.
const KNOB_RATIO = 8;
// Wraps an angle to the range -PI to PI.
const wrapTurn = (x: number): number => x - 2 * Math.PI * Math.round(x / (2 * Math.PI));
// The polar axis points at the pole: north, LAT degrees up.
const POLE = new Vector3(0, Math.sin(LAT * DEG), -Math.cos(LAT * DEG));
// The equator crosses the meridian in the south along this line.
const EQ = new Vector3(0, Math.cos(LAT * DEG), Math.sin(LAT * DEG));

/* ---------- geometry helpers ---------- */
// A helix round the X axis, centred on the origin.
// r: its radius. len: its length. turns: its turns over that length.
class Helix extends Curve<Vector3> {
  readonly r: number;
  readonly len: number;
  readonly turns: number;
  constructor(r: number, len: number, turns: number) {
    super();
    this.r = r;
    this.len = len;
    this.turns = turns;
  }
  getPoint(t: number, out = new Vector3()): Vector3 {
    const a = t * this.turns * Math.PI * 2;
    return out.set(-this.len / 2 + this.len * t, this.r * Math.cos(a), this.r * Math.sin(a));
  }
}
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

// Turns a profile of [radius, height] points about the Y axis.
// Each run is one smooth band.
// Runs meet at sharp edges.
// A run goes up the outside, so its normals face out.
// band: the slice of the texture's v that each run maps to.
// phi0 and phiLen turn only part of the way round.
function turn(runs: P[][], segs: number, band: [number, number] = [0, 1], phi0 = 0, phiLen = Math.PI * 2): BufferGeometry {
  const g = mergeGeos(runs.map(r => new LatheGeometry(r.map(([x, y]) => new Vector2(x, y)), segs, phi0, phiLen)));
  const uv = g.getAttribute('uv');
  for (let i = 0; i < uv.count; i++) uv.setY(i, band[0] + uv.getY(i) * (band[1] - band[0]));
  return g;
}
// Narrow parts take a quiet slice of the enamel, with few chips.
const QUIET: [number, number] = [0.14, 0.24];
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
// r0 and r1 are the inner and outer radii.
// h0 and h1 are the two faces.
function ringProfile(r0: number, r1: number, h0: number, h1: number, c: number): P[][] {
  return edges([[r0, h0], [r1 - c, h0], [r1, h0 + c], [r1, h1 - c], [r1 - c, h1], [r0, h1], [r0, h0]]);
}

// The lathe's Y axis turns onto Z, the tube's axis.
const Y_TO_Z = new Matrix4().makeRotationX(Math.PI / 2);
// The lathe's Y axis turns onto X, the declination axis.
const Y_TO_X = new Matrix4().makeRotationZ(-Math.PI / 2);
const along = (g: BufferGeometry, m: Matrix4, x = 0, y = 0, z = 0): BufferGeometry => g.applyMatrix4(m).translate(x, y, z);

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
  const g = new ExtrudeGeometry(s, { depth: h, bevelEnabled: false });
  // The extrusion runs along Z.
  // The knob stands along Y.
  return g.rotateX(-Math.PI / 2);
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

/* ---------- small repeated parts ---------- */
// Each piece stands on the origin, its axis along +Y.
type Pieces = Record<'bolt' | 'nut' | 'button' | 'rivet' | 'tooth' | 'thumb' | 'socket', BufferGeometry>;
function pieces(): Pieces {
  return {
    // A hex bolt head on a washer.
    bolt: mergeGeos([
      new CylinderGeometry(0.0105, 0.0105, 0.0018, 8).translate(0, 0.0009, 0),
      new CylinderGeometry(0.0086, 0.0088, 0.0062, 6).translate(0, 0.0049, 0),
    ]),
    // A hex nut.
    nut: new CylinderGeometry(0.0088, 0.0088, 0.007, 6).translate(0, 0.0035, 0),
    // A round button head.
    button: new SphereGeometry(0.0058, 10, 4, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.75, 1),
    // A round rivet head, low.
    rivet: new SphereGeometry(0.0042, 6, 2, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.55, 1),
    // One gear tooth.
    tooth: new BoxGeometry(1, 1, 1),
    // A thumbscrew: a short shank and a knurled head.
    thumb: mergeGeos([
      new CylinderGeometry(0.004, 0.004, 0.014, 8).translate(0, 0.007, 0),
      knurl(0.011, 0.008, 12).translate(0, 0.014, 0),
    ]),
    // A socket cap screw.
    socket: new CylinderGeometry(0.0062, 0.0062, 0.0062, 14).translate(0, 0.0031, 0),
  };
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

const UP = new Vector3(0, 1, 0);
const qa = new Quaternion(), qb = new Quaternion(), sc = new Vector3(), dn = new Vector3();
// Stands a piece at p with its axis along dir.
// spin turns it about its own axis.
// s scales it.
function stand(p: Vector3, dir: Vector3, spin = 0, s: Vector3 | number = 1): Matrix4 {
  qa.setFromUnitVectors(UP, dn.copy(dir).normalize());
  qa.multiply(qb.setFromAxisAngle(UP, spin));
  return new Matrix4().compose(p, qa, typeof s === 'number' ? sc.setScalar(s) : s);
}
// A box piece at p, sized along three given axes.
function boxAt(p: Vector3, xa: Vector3, ya: Vector3, za: Vector3, sx: number, sy: number, sz: number): Matrix4 {
  return new Matrix4().makeBasis(xa.clone().multiplyScalar(sx), ya.clone().multiplyScalar(sy), za.clone().multiplyScalar(sz)).setPosition(p);
}
// A ring of n pieces about the Z axis.
// r is its radius.
// z is its height.
// face: +1 or -1 faces them along Z.
// face 0 points them out.
// s scales each piece.
function ringZ(n: number, r: number, z: number, face: number, a0 = 0, s = 1): Matrix4[] {
  const out: Matrix4[] = [];
  for (let i = 0; i < n; i++) {
    const a = a0 + (i / n) * Math.PI * 2, c = Math.cos(a), sn = Math.sin(a);
    const dir = face ? new Vector3(0, 0, face) : new Vector3(c, sn, 0);
    out.push(stand(new Vector3(c * r, sn * r, z), dir, a, s));
  }
  return out;
}

/* ---------- textures, made once in code ---------- */
// A seeded generator keeps the wear the same on every load.
function rng(seed: number): () => number {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
}
function canvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return [c, c.getContext('2d')!];
}
function tex(c: HTMLCanvasElement, srgb: boolean): CanvasTexture {
  const t = new CanvasTexture(c);
  if (srgb) t.colorSpace = SRGBColorSpace;
  t.wrapS = t.wrapT = RepeatWrapping;
  t.anisotropy = 8;
  return t;
}

// The tube's enamel: u runs round the tube, v along it.
// map: the paint's tone and its chips.
// orm: roughness in green, metal in blue.
function enamelMaps(): { map: CanvasTexture; orm: CanvasTexture } {
  const W = 1024, H = 512, r = rng(23);
  const [c, x] = canvas(W, H), [c2, y] = canvas(W, H);
  x.fillStyle = '#ffffff'; x.fillRect(0, 0, W, H);
  y.fillStyle = 'rgb(0,112,0)'; y.fillRect(0, 0, W, H);
  // Each mark draws three times, so the seam round the tube tiles.
  const wrap = (f: (dx: number) => void): void => { f(-W); f(0); f(W); };
  // Soft clouds of tone: the enamel ages unevenly.
  for (let i = 0; i < 220; i++) {
    const px = r() * W, py = r() * H, rad = 30 + r() * 110, warm = r() < 0.65;
    const col = warm ? '150,138,112' : '255,255,252';
    wrap(dx => {
      const g = x.createRadialGradient(px + dx, py, 0, px + dx, py, rad);
      g.addColorStop(0, `rgba(${col},0.05)`);
      g.addColorStop(1, `rgba(${col},0)`);
      x.fillStyle = g;
      x.fillRect(px + dx - rad, py - rad, rad * 2, rad * 2);
    });
  }
  // Faint streaks run along the tube from years of dew.
  for (let i = 0; i < 70; i++) {
    const px = r() * W, py = r() * H, len = 40 + r() * 200, a = 0.02 + r() * 0.035;
    wrap(dx => { x.fillStyle = `rgba(110,100,82,${a})`; x.fillRect(px + dx, py, 1 + r() * 2, len); });
  }
  // The ends darken where hands and dust gather by the flanges.
  for (const [y0, y1] of [[0, 22], [H, H - 22]]) {
    const g = x.createLinearGradient(0, y0, 0, y1);
    g.addColorStop(0, 'rgba(90,82,66,0.16)');
    g.addColorStop(1, 'rgba(90,82,66,0)');
    x.fillStyle = g;
    x.fillRect(0, Math.min(y0, y1), W, 22);
  }
  // Chips show dark primer and steel.
  const chip = (cx: number, cy: number, s: number): void => {
    wrap(dx => {
      for (const [ctx, fill] of [[x, 'rgb(78,72,64)'], [y, 'rgb(0,84,170)']] as const) {
        ctx.fillStyle = fill;
        ctx.beginPath();
        const n = 7;
        for (let k = 0; k < n; k++) {
          const a = (k / n) * Math.PI * 2, rr = s * (0.45 + r() * 0.75);
          ctx.lineTo(cx + dx + Math.cos(a) * rr, cy + Math.sin(a) * rr * 0.8);
        }
        ctx.closePath();
        ctx.fill();
      }
    });
  };
  // Most chips sit near the flanges, where tools and hands knock.
  for (let i = 0; i < 300; i++) {
    const edge = r() < 0.5 ? r() ** 2.2 * 26 : H - r() ** 2.2 * 26;
    chip(r() * W, edge, 0.8 + r() ** 3 * 5);
  }
  // A few small chips lie anywhere.
  for (let i = 0; i < 46; i++) chip(r() * W, r() * H, 0.6 + r() ** 2 * 1.8);
  return { map: tex(c, true), orm: tex(c2, false) };
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
  const t = tex(c, true);
  t.repeat.set(4, 4);
  return t;
}

// Worn metal as roughness: turning marks, smooth smudges, bright scratches.
// The map is grey, so the shader's green channel carries it.
// Its mean is about 0.78.
function metalWear(): CanvasTexture {
  const S = 256, r = rng(31);
  const [c, x] = canvas(S, S);
  // Turning marks run round each part: rows of constant v.
  for (let y = 0; y < S; y++) {
    const v = Math.round(188 + r() * 24);
    x.fillStyle = `rgb(${v},${v},${v})`;
    x.fillRect(0, y, S, 1);
  }
  // Smudges where hands touch are smoother.
  for (let i = 0; i < 40; i++) {
    const px = r() * S, py = r() * S, rad = 6 + r() * 26;
    const g = x.createRadialGradient(px, py, 0, px, py, rad);
    g.addColorStop(0, 'rgba(110,110,110,0.35)');
    g.addColorStop(1, 'rgba(110,110,110,0)');
    x.fillStyle = g;
    x.fillRect(px - rad, py - rad, rad * 2, rad * 2);
  }
  // Fine scratches are rougher.
  x.lineWidth = 1;
  for (let i = 0; i < 140; i++) {
    const px = r() * S, py = r() * S, a = r() * Math.PI, len = 4 + r() * 22;
    x.strokeStyle = `rgba(250,250,250,${0.2 + r() * 0.3})`;
    x.beginPath();
    x.moveTo(px, py);
    x.lineTo(px + Math.cos(a) * len, py + Math.sin(a) * len);
    x.stroke();
  }
  const t = tex(c, false);
  t.repeat.set(2, 2);
  return t;
}

// A setting circle's face: turned brass, engraved ticks filled black.
// ticks: marks round the circle.
// major: marks per labelled step.
// label: the text for labelled step i.
function circleMap(ticks: number, major: number, label: (i: number) => string): CanvasTexture {
  const S = 1024, C = S / 2, r = rng(ticks);
  const [c, x] = canvas(S, S);
  x.fillStyle = '#ffffff'; x.fillRect(0, 0, S, S);
  // Fine turning rings catch the light unevenly.
  for (let rr = 4; rr < C; rr += 3) {
    x.strokeStyle = `rgba(60,50,30,${0.03 + r() * 0.07})`;
    x.lineWidth = 1.5;
    x.beginPath(); x.arc(C, C, rr, 0, Math.PI * 2); x.stroke();
  }
  x.strokeStyle = '#17130e';
  x.fillStyle = '#17130e';
  // The scale's rim lines.
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
    x.fillText(label(i / major), 0, 0);
    x.restore();
  }
  return tex(c, true);
}

// Metal and glass reflect this: a night sky over a dark floor.
// It matches the starlight, so metal reads as lit paint does.
function nightEnv(): CanvasTexture {
  const W = 128, H = 64;
  const [c, x] = canvas(W, H);
  // Radiance from a hemisphere light: its colour times intensity over pi.
  const k = HEMI_I / Math.PI;
  const sky = hemi.color.clone().multiplyScalar(k), floor = hemi.groundColor.clone().multiplyScalar(k);
  const mid = sky.clone().lerp(floor, 0.62);
  const g = x.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, sky.getStyle());
  g.addColorStop(0.38, sky.clone().lerp(mid, 0.5).getStyle());
  g.addColorStop(0.5, mid.getStyle());
  g.addColorStop(0.6, floor.getStyle());
  g.addColorStop(1, floor.getStyle());
  x.fillStyle = g;
  x.fillRect(0, 0, W, H);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.mapping = EquirectangularReflectionMapping;
  return t;
}

/* ---------- materials ---------- */
type Mats = Record<'enamel' | 'cast' | 'pier' | 'darkSteel' | 'steel' | 'zinc' | 'brass' | 'hourCircle' | 'decCircle'
  | 'anodised' | 'matte' | 'rubber' | 'lens', MeshStandardMaterial>;

// The hemisphere light gives the diffuse light.
// The env map adds reflections only, so paint keeps the scene's level.
// Built-in materials take the height haze through the fog chunks.
// world/dusk adds the last light to each one at load.
// tail: more GLSL that runs after the reflections are read.
function reflectOnly<M extends MeshStandardMaterial>(m: M, key: string, tail = ''): M {
  m.onBeforeCompile = (sh) => {
    sh.fragmentShader = sh.fragmentShader.replace('#include <lights_fragment_maps>', `#include <lights_fragment_maps>
      iblIrradiance = vec3(0.0);
      ${tail}`);
  };
  m.customProgramCacheKey = () => 'hero-scope|' + key;
  return m;
}

function materials(): Mats {
  const env = nightEnv();
  const std = (key: string, p: MeshStandardMaterialParameters): MeshStandardMaterial =>
    reflectOnly(new MeshStandardMaterial({ envMap: env, ...p }), key);
  const wear = enamelMaps(), cast = castMap(), worn = metalWear();
  const hours = circleMap(288, 12, i => String(i));
  // Declination runs 0 at the equator to 90 at each pole.
  const decs = circleMap(360, 10, i => String(10 * (i % 18 <= 9 ? i % 18 : 18 - (i % 18))));
  const brass = { color: 0xc9a467, metalness: 1, roughness: 0.3 };
  // Coated glass: the coating tints what the glass reflects.
  // Face on, the tint is magenta.
  // At a slant, it turns green.
  const coat = `{
    float cv = clamp(dot(geometryNormal, geometryViewDir), 0.0, 1.0);
    radiance *= mix(vec3(0.62, 1.0, 0.72), vec3(1.0, 0.62, 0.95), smoothstep(0.3, 0.95, cv));
  }`;
  return {
    // Cream enamel.
    // The map's blue is metal: zero on paint, so paint is dielectric.
    // Chips show metal through the map.
    // Its green is about 0.44, so the paint's roughness is about 0.37.
    enamel: std('paint', { color: 0xddd6c4, roughness: 0.85, metalness: 1, map: wear.map, roughnessMap: wear.orm, metalnessMap: wear.orm }),
    // Grey-green enamel on the castings.
    // The sand-cast grain shows through the paint as a fine bump.
    cast: std('cast', { color: 0x6b7466, roughness: 0.58, metalness: 0, map: cast, bumpMap: cast, bumpScale: 0.6 }),
    // The pier wears a darker coat.
    pier: std('pier', { color: 0x3d433d, roughness: 0.68, metalness: 0, map: cast, bumpMap: cast, bumpScale: 0.6 }),
    // Each metal's roughness is its target over the map mean, 0.78.
    darkSteel: std('darkSteel', { color: 0x40444a, metalness: 1, roughness: 0.49, roughnessMap: worn }),
    steel: std('steel', { color: 0xb8bcc0, metalness: 1, roughness: 0.28, roughnessMap: worn }),
    // Zinc-plated bolts and screws.
    zinc: std('zinc', { color: 0x9da1a5, metalness: 1, roughness: 0.54, roughnessMap: worn }),
    brass: std('brass', { ...brass, roughness: 0.38, roughnessMap: worn }),
    // The circles' satin face blurs what they reflect, so the ticks read.
    hourCircle: std('hourCircle', { ...brass, roughness: 0.42, map: hours }),
    decCircle: std('decCircle', { ...brass, roughness: 0.42, map: decs }),
    // Black anodised aluminium is a metal under a dyed oxide.
    anodised: std('anodised', { color: 0x1b1c1f, metalness: 1, roughness: 0.4 }),
    matte: std('matte', { color: 0x09090a, metalness: 0, roughness: 0.92 }),
    rubber: std('rubber', { color: 0x101010, metalness: 0, roughness: 0.85 }),
    lens: reflectOnly(new MeshStandardMaterial({ color: 0x050607, metalness: 0, roughness: 0.04, envMap: env, envMapIntensity: 4 }), 'lens', coat),
  };
}

/* ---------- the tube ---------- */
// +Z is the optical axis.
// The origin is the pivot.
// Section radii: a slight step at each joint toward the eyepiece.
const R_FRONT = 0.1615, R_MID = 0.1565, R_REAR0 = 0.151, R_REAR1 = 0.132;
// Joints along the axis.
const Z_REAR = -1.1, Z_J1 = -0.2, Z_J2 = 0.95, Z_CELL = 2.12;
// The rear section tapers toward the eyepiece.
const rearR = (z: number): number => R_REAR1 + (R_REAR0 - R_REAR1) * ((z - Z_REAR) / (Z_J1 - Z_REAR));
// The objective: its radius and its rim's plane.
const GLASS_R = 0.138, GLASS_Z = 2.27;
// The cell's bore, its front face, its radius, and the dew shield.
const BORE_R = 0.148, CELL_Z = 2.3, CELL_R = 0.172, SHIELD_R = 0.1815;
// The shield's clamp ring is its widest part.
const SHIELD_OUT = SHIELD_R + 0.006;
// The glass's face: sin(tilt) = 0.1 r + 0.4 r^3.
// The face tilts 30 degrees at the rim.
// The field slides fast across the centre as the tube turns.
// The rim crowds the sky together.
const LENS: LensShape = { radius: GLASS_R, edge: GLASS_Z, a: 0.1, b: 0.4 };
// The tube's axis runs D_OFF from the polar axis; core/clearance.ts holds it.
// On the meridian the tube sits that far off the slit's centre.
// So the shield keeps SLIT_HALF - SHIELD_OUT - D_OFF to each slit edge: 0.035 m.
// The finder rides at this angle round the tube, toward the top.
const FINDER_A = 50 * DEG, FINDER_D = 0.27;
// The tube rings hold the tube at these points.
const RINGS = [-0.45, 0.5];
// The saddle plate lies under the rings, on the declination flange.
// SADDLE_X is its face toward the tube.
const SADDLE_X = DEC_FACE + PLATE - D_OFF;

// A joint of two flanges, bolts through both.
function joint(k: Kit, M: Mats, Pc: Pieces, z: number, rBack: number, rFront: number, n: number): void {
  const ro = Math.max(rBack, rFront) + 0.02, t = 0.022, c = 0.003;
  k.add(M.enamel, along(turn([
    [[rBack, z - t], [ro - c, z - t]],
    [[ro - c, z - t], [ro, z - t + c]],
    [[ro, z - t + c], [ro, z - 0.0015]],
    [[ro, z - 0.0015], [ro - 0.003, z]],
    [[ro - 0.003, z], [ro, z + 0.0015]],
    [[ro, z + 0.0015], [ro, z + t - c]],
    [[ro, z + t - c], [ro - c, z + t]],
    [[ro - c, z + t], [rFront, z + t]],
  ], 72, QUIET), Y_TO_Z));
  const rb = (Math.max(rBack, rFront) + ro) / 2 + 0.001;
  for (const m of ringZ(n, rb, z + t, 1, 0.1, 0.8)) k.put(Pc.bolt, M.zinc, m);
  for (const m of ringZ(n, rb, z - t, -1, 0.1, 0.8)) k.put(Pc.nut, M.zinc, m);
}

// Rivets along the rolled sheet's seam, which faces -Y.
function seam(k: Kit, M: Mats, Pc: Pieces, z0: number, z1: number, r: (z: number) => number): void {
  const n = Math.floor((z1 - z0) / 0.07);
  for (let i = 0; i < n; i++) {
    const z = z0 + 0.05 + i * ((z1 - z0 - 0.1) / (n - 1));
    for (const a of [-0.035, 0.035]) {
      const rr = r(z) / Math.cos(a);
      k.put(Pc.rivet, M.enamel, stand(new Vector3(Math.sin(a) * rr, -Math.cos(a) * rr, z), new Vector3(Math.sin(a), -Math.cos(a), 0)));
    }
  }
}

function buildTube(k: Kit, M: Mats, Pc: Pieces, glassMat: Material): Mesh {
  // Three rolled sections.
  k.add(M.enamel,
    along(turn([[[R_REAR1, Z_REAR], [R_REAR0, Z_J1]]], 72), Y_TO_Z),
    along(turn([[[R_MID, Z_J1], [R_MID, Z_J2]]], 72), Y_TO_Z),
    along(turn([[[R_FRONT, Z_J2], [R_FRONT, Z_CELL]]], 72), Y_TO_Z));
  seam(k, M, Pc, Z_REAR + 0.03, Z_J1 - 0.03, rearR);
  seam(k, M, Pc, Z_J1 + 0.03, Z_J2 - 0.03, () => R_MID);
  seam(k, M, Pc, Z_J2 + 0.03, Z_CELL - 0.03, () => R_FRONT);
  joint(k, M, Pc, Z_J1, R_REAR0, R_MID, 16);
  joint(k, M, Pc, Z_J2, R_MID, R_FRONT, 16);
  joint(k, M, Pc, Z_CELL, R_FRONT, CELL_R, 18);

  /* the objective cell, the retaining ring and the glass */
  const cz = Z_CELL + 0.022;
  k.add(M.enamel, along(turn([
    [[CELL_R, cz], [CELL_R, CELL_Z - 0.004]],
    [[CELL_R, CELL_Z - 0.004], [CELL_R - 0.004, CELL_Z]],
  ], 96, QUIET), Y_TO_Z));
  // The cell's face and bore are black, so no light scatters.
  k.add(M.anodised, along(turn([[[CELL_R - 0.004, CELL_Z], [BORE_R, CELL_Z]]], 96), Y_TO_Z));
  k.add(M.matte, along(turn([[[BORE_R, CELL_Z], [BORE_R, GLASS_Z - 0.01]]], 96), Y_TO_Z));
  // The retaining ring holds the glass's edge.
  const rz = GLASS_Z + 0.018, ri = GLASS_R - 0.008;
  k.add(M.darkSteel, along(turn([
    [[BORE_R, GLASS_Z - 0.004], [BORE_R, rz]],
    [[BORE_R, rz], [ri + 0.006, rz]],
    [[ri + 0.006, rz], [ri, rz - 0.006]],
    [[ri, rz - 0.006], [ri, GLASS_Z - 0.004]],
  ], 96), Y_TO_Z));
  for (const m of ringZ(8, (BORE_R + ri) / 2, rz, 1, Math.PI / 8, 0.75)) k.put(Pc.button, M.zinc, m);

  // The glass: a sphere cap, set back in the cell.
  const glass = new Mesh(lensGeometry(LENS, 0.03), glassMat);

  /* the dew shield */
  const s0 = CELL_Z, s1 = TUBE_FRONT;
  // The clamp ring at its foot.
  k.add(M.enamel, along(turn(ringProfile(SHIELD_R - 0.004, SHIELD_OUT, s0, s0 + 0.035, 0.002), 96, QUIET), Y_TO_Z));
  k.add(M.enamel, along(turn([
    [[SHIELD_R, s0 + 0.035], [SHIELD_R, s1 - 0.005]],
    // A rolled lip at the mouth.
    arc(SHIELD_R - 0.005, s1 - 0.005, 0.005, 0, Math.PI, 8),
  ], 96), Y_TO_Z));
  k.add(M.matte, along(turn([
    [[SHIELD_R - 0.01, s1 - 0.005], [SHIELD_R - 0.01, s0]],
    // Two baffles stop stray light.
    ...ringProfile(SHIELD_R - 0.022, SHIELD_R - 0.009, s0 + 0.1, s0 + 0.104, 0.001),
    ...ringProfile(SHIELD_R - 0.022, SHIELD_R - 0.009, s0 + 0.2, s0 + 0.204, 0.001),
  ], 96), Y_TO_Z));
  for (const m of ringZ(3, SHIELD_OUT, s0 + 0.0175, 0, Math.PI / 2, 0.8)) k.put(Pc.thumb, M.brass, m);

  /* the rear: end flange, end plate, focuser, eyepiece */
  const ez = Z_REAR, et = 0.022;
  k.add(M.enamel, along(turn([
    ...ringProfile(R_REAR1 - 0.002, R_REAR1 + 0.02, ez - et, ez, 0.003).slice(0, 5),
    // The end plate faces back, with a raised boss.
    [[0.1, ez - et], [R_REAR1 - 0.002, ez - et]],
    [[0.1, ez - et - 0.01], [0.1, ez - et]],
    [[0.06, ez - et - 0.01], [0.1, ez - et - 0.01]],
  ], 72, QUIET), Y_TO_Z));
  for (const m of ringZ(14, R_REAR1 + 0.011, ez - et, -1, 0.2, 0.8)) k.put(Pc.bolt, M.zinc, m);
  const fz = ez - et - 0.01;
  // The focuser's base and its body, black anodised.
  k.add(M.anodised,
    along(turn([...ringProfile(0.035, 0.075, fz - 0.014, fz, 0.003), [[0.06, fz - 0.045], [0.06, fz - 0.014]]], 48), Y_TO_Z),
    chamferBox(0.11, 0.095, 0.1, 0.009).translate(0, 0, fz - 0.09));
  for (const m of ringZ(6, 0.067, fz - 0.014, -1, 0, 0.8)) k.put(Pc.socket, M.zinc, m);
  // The draw tube slides out of the body on its rack.
  const dz0 = fz - 0.14, dz1 = fz - 0.3;
  k.add(M.steel, along(turn([[[0.04, dz1], [0.04, dz0]]], 40), Y_TO_Z));
  k.add(M.darkSteel, new BoxGeometry(0.011, 0.014, dz0 - dz1).translate(0.0445, 0, (dz0 + dz1) / 2));
  const X = new Vector3(1, 0, 0), Yv = new Vector3(0, 1, 0), Z = new Vector3(0, 0, 1);
  for (let i = 0; i < 14; i++) {
    const z = dz1 + 0.008 + i * ((dz0 - dz1 - 0.016) / 13);
    k.put(Pc.tooth, M.darkSteel, boxAt(new Vector3(0.0515, 0, z), X, Yv, Z, 0.005, 0.012, 0.0045));
  }
  // The pinion crosses the body.
  // Brass knobs turn it.
  const pz = fz - 0.105;
  k.add(M.anodised, new CylinderGeometry(0.016, 0.016, 0.18, 20).translate(0.062, 0, pz));
  k.add(M.brass,
    knurl(0.03, 0.026, 36).translate(0.062, 0.052, pz), knurl(0.03, 0.026, 36).rotateX(Math.PI).translate(0.062, -0.052, pz),
    knurl(0.02, 0.012, 26).translate(0.062, 0.078, pz), knurl(0.02, 0.012, 26).rotateX(Math.PI).translate(0.062, -0.078, pz));
  k.put(Pc.thumb, M.brass, stand(new Vector3(-0.055, 0, fz - 0.09), new Vector3(-1, 0, 0), 0, 1.3));
  // The eyepiece: a chrome barrel, a black body, a rubber cup.
  const ep = dz1;
  k.add(M.steel, along(turn([[[0.028, ep - 0.027], [0.028, ep]]], 32), Y_TO_Z));
  k.add(M.anodised, along(turn([
    [[0.034, ep - 0.027], [0.028, ep - 0.027]],
    [[0.034, ep - 0.09], [0.034, ep - 0.027]],
  ], 32), Y_TO_Z), along(knurl(0.036, 0.027, 24), Y_TO_Z, 0, 0, ep - 0.077));
  k.add(M.rubber, along(turn([
    [[0.032, ep - 0.126], [0.034, ep - 0.09]],
    [[0.027, ep - 0.128], [0.032, ep - 0.126]],
    [[0.022, ep - 0.117], [0.027, ep - 0.128]],
  ], 32), Y_TO_Z));
  k.add(M.lens, along(turn([[[0, ep - 0.106], [0.022, ep - 0.108]]], 24), Y_TO_Z));

  /* the finder on two stand-offs */
  const fc = Math.cos(FINDER_A), fs = Math.sin(FINDER_A);
  const fx = fc * FINDER_D, fy = fs * FINDER_D;
  const fz0 = -0.95, fz1 = -0.24;
  k.add(M.enamel, along(turn([[[0.03, fz0], [0.03, fz1]]], 40), Y_TO_Z, fx, fy));
  k.add(M.enamel, along(turn([
    ...ringProfile(0.026, 0.037, fz1, fz1 + 0.05, 0.003),
    [[0.04, fz1 + 0.05], [0.04, fz1 + 0.17]],
    arc(0.0375, fz1 + 0.17, 0.0025, 0, Math.PI, 4),
  ], 40, QUIET), Y_TO_Z, fx, fy));
  k.add(M.matte, along(turn([[[0.035, fz1 + 0.17], [0.035, fz1 + 0.05]]], 40), Y_TO_Z, fx, fy));
  k.add(M.lens, along(turn([[[0.035, fz1 + 0.052], [0, fz1 + 0.058]]], 24), Y_TO_Z, fx, fy));
  k.add(M.anodised, along(turn([
    [[0.021, fz0], [0.03, fz0]],
    [[0.021, fz0 - 0.045], [0.021, fz0]],
    [[0.025, fz0 - 0.045], [0.021, fz0 - 0.045]],
    [[0.025, fz0 - 0.09], [0.025, fz0 - 0.045]],
  ], 32), Y_TO_Z, fx, fy));
  k.add(M.rubber, along(turn([[[0.023, fz0 - 0.112], [0.025, fz0 - 0.09]], [[0.014, fz0 - 0.112], [0.023, fz0 - 0.112]]], 24), Y_TO_Z, fx, fy));
  for (const z of [-0.82, -0.4]) {
    k.add(M.anodised, along(turn(ringProfile(0.031, 0.049, z - 0.012, z + 0.012, 0.003), 40), Y_TO_Z, fx, fy));
    // The pedestal stands on the main tube, under the ring.
    const r0 = z < Z_J1 ? rearR(z) : R_MID, len = FINDER_D - 0.047 - r0 + 0.004;
    const ped = chamferBox(len, 0.026, 0.022, 0.004).translate(r0 + len / 2 - 0.002, 0, z);
    k.add(M.anodised, ped.rotateZ(FINDER_A));
    // Three thumbscrews centre the finder in its ring.
    for (let i = 0; i < 3; i++) {
      const a = FINDER_A + Math.PI / 3 + (i * 2 * Math.PI) / 3;
      k.put(Pc.thumb, M.steel, stand(new Vector3(fx + Math.cos(a) * 0.048, fy + Math.sin(a) * 0.048, z), new Vector3(Math.cos(a), Math.sin(a), 0), 0, 0.75));
    }
  }

  /* the tube rings and the saddle plate */
  for (const z of RINGS) {
    const r0 = z < Z_J1 ? rearR(z) : R_MID, r1 = r0 + 0.02;
    k.add(M.cast, along(turn(ringProfile(r0 + 0.001, r1, z - 0.03, z + 0.03, 0.003), 72), Y_TO_Z));
    // The foot joins the ring to the saddle plate.
    k.add(M.cast, chamferBox(-SADDLE_X - r1 + 0.01, 0.085, 0.05, 0.005).translate((SADDLE_X - r1 + 0.01) / 2, 0, z));
    // A hinge on one side, a clamp on the other.
    k.add(M.cast, chamferBox(0.026, 0.026, 0.062, 0.004).translate(0, r1 + 0.007, z));
    k.add(M.darkSteel, new CylinderGeometry(0.007, 0.007, 0.07, 12).rotateX(Math.PI / 2).translate(0, r1 + 0.01, z));
    for (const dx of [-0.01, 0.01]) k.add(M.cast, chamferBox(0.014, 0.028, 0.052, 0.003).translate(dx, -r1 - 0.01, z));
    k.put(Pc.bolt, M.zinc, stand(new Vector3(0.017, -r1 - 0.014, z), new Vector3(1, 0, 0), 0, 1.1));
    k.put(Pc.thumb, M.brass, stand(new Vector3(-0.017, -r1 - 0.014, z), new Vector3(-1, 0, 0), 0, 1.3));
  }
  // The saddle: a broad boss on the flange, arms to the rings.
  const pl0 = RINGS[0] - 0.045, pl1 = RINGS[1] + 0.045;
  k.add(M.cast, chamferBox(PLATE, 0.17, 0.3, 0.008).translate(SADDLE_X - PLATE / 2, 0, 0));
  k.add(M.cast, chamferBox(0.026, 0.095, pl1 - pl0, 0.007).translate(SADDLE_X - 0.013, 0, (pl0 + pl1) / 2));
  // Ribs stiffen the arms on the side toward the mount.
  for (const [z0, z1] of [[pl0, -0.16], [0.16, pl1]]) {
    k.add(M.cast, chamferBox(0.026, 0.022, z1 - z0, 0.005).translate(SADDLE_X - 0.038, 0, (z0 + z1) / 2));
  }
  for (const z of [-0.1, 0.1]) {
    for (const y of [-0.06, 0.06]) k.put(Pc.socket, M.zinc, stand(new Vector3(SADDLE_X, y, z), new Vector3(1, 0, 0)));
  }
  return glass;
}

/* ---------- the declination axis: it turns with the tube ---------- */
// +X runs out to the tube.
// The weights hang on -X.
function buildDec(k: Kit, M: Mats, Pc: Pieces): void {
  // The flange that carries the saddle plate.
  const fl = DEC_FACE - 0.025;
  k.add(M.cast, along(turn([
    ...ringProfile(0.045, 0.12, fl, DEC_FACE, 0.004),
    [[0.055, 0.13], [0.055, fl]],
  ], 56), Y_TO_X));
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.3;
    k.put(Pc.bolt, M.zinc, stand(new Vector3(fl, Math.cos(a) * 0.095, Math.sin(a) * 0.095), new Vector3(-1, 0, 0), a, 0.85));
  }
  // The declination circle: turned brass, engraved.
  const cx = -0.212;
  k.add(M.brass, along(turn([[[0.125, cx - 0.011], [0.125, cx]], [[0.125, cx], [0.05, cx]]], 96), Y_TO_X));
  const face = new RingGeometry(0.052, 0.125, 128, 1).rotateY(-Math.PI / 2).translate(cx - 0.0111, 0, 0);
  k.add(M.decCircle, face);
  k.add(M.darkSteel, along(turn([
    [[0.05, -0.28], [0.05, cx - 0.011]],
    [[0.05, cx - 0.011], [0.026, cx - 0.011]],
  ], 40), Y_TO_X));
  // The weight shaft, the weights, the safety collar, the end nut.
  // A light tube on a short arm needs two weights.
  const x0 = -0.95;
  k.add(M.steel, along(turn([[[0.026, x0], [0.026, -0.28]], [[0.026, -0.28], [0.05, -0.28]]], 32), Y_TO_X));
  const weight = (c: number): BufferGeometry => along(turn([
    [[0.028, c - 0.037], [0.12, c - 0.037]],
    [[0.12, c - 0.037], [0.135, c - 0.024]],
    [[0.135, c - 0.024], [0.135, c + 0.024]],
    [[0.135, c + 0.024], [0.12, c + 0.037]],
    [[0.12, c + 0.037], [0.028, c + 0.037]],
  ], 64), Y_TO_X);
  for (const c of [-0.66, -0.739]) {
    k.add(M.pier, weight(c));
    k.put(Pc.thumb, M.steel, stand(new Vector3(c, 0.135, 0), new Vector3(0, 1, 0), 0, 1.4));
  }
  k.add(M.darkSteel, along(turn(ringProfile(0.026, 0.044, -0.83, -0.798, 0.004), 40), Y_TO_X));
  k.put(Pc.thumb, M.steel, stand(new Vector3(-0.814, 0.044, 0), new Vector3(0, 1, 0), 0, 1));
  // A low domed nut caps the shaft.
  const dome: P[] = [];
  for (let i = 0; i <= 6; i++) {
    const a = (i / 6) * (Math.PI / 2);
    dome.push([0.033 * Math.sin(a), x0 - 0.016 * Math.cos(a)]);
  }
  k.add(M.darkSteel, along(turn([dome, [[0.033, x0], [0.033, x0 + 0.012]], [[0.033, x0 + 0.012], [0.026, x0 + 0.012]]], 32), Y_TO_X));
}

/* ---------- the right ascension axis: the head turns on the polar axis ---------- */
// +Y runs up the polar axis to the pole.
function buildRa(k: Kit, M: Mats, Pc: Pieces, hk: Kit): void {
  // The collar turns on the housing's top bearing.
  // A slim neck rises from it, so the tube's saddle sits close.
  k.add(M.cast, turn([
    ...ringProfile(0.11, 0.18, -0.222, -0.2, 0.004),
    [[0.11, -0.2], [0.11, -0.06]],
  ], 64));
  // The declination housing crosses the top of the polar axis.
  k.add(M.cast, along(turn([
    [[0.05, -0.2], [0.115, -0.2]],
    [[0.115, -0.2], [0.115, -0.168]],
    [[0.115, -0.168], [0.1, -0.16]],
    [[0.1, -0.16], [0.104, 0.0], [0.1, 0.1]],
    [[0.1, 0.1], [0.115, 0.108]],
    [[0.115, 0.108], [0.115, 0.14]],
    [[0.115, 0.14], [0.055, 0.14]],
  ], 64), Y_TO_X));
  for (const x of [-0.2, 0.14]) {
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const dir = new Vector3(x < 0 ? -1 : 1, 0, 0);
      k.put(Pc.bolt, M.zinc, stand(new Vector3(x, Math.cos(a) * 0.085, Math.sin(a) * 0.085), dir, a, 0.8));
    }
  }
  // The index mark for the declination circle.
  k.add(M.brass, new BoxGeometry(0.026, 0.007, 0.009).translate(-0.207, 0.128, 0));
  // A clamp lever locks the declination axis.
  k.add(M.darkSteel, new CylinderGeometry(0.012, 0.012, 0.045, 12).translate(0.04, 0.118, 0));
  k.add(M.darkSteel, new CylinderGeometry(0.005, 0.005, 0.11, 8).rotateZ(Math.PI / 2).translate(0.04 + 0.055, 0.14, 0));
  k.add(M.rubber, new CylinderGeometry(0.009, 0.009, 0.04, 12).rotateZ(Math.PI / 2).translate(0.04 + 0.1, 0.14, 0));
  // The declination slow motion: a gearbox and a hand wheel.
  k.add(M.cast, chamferBox(0.06, 0.065, 0.08, 0.007).translate(-0.165, -0.105, 0.045));
  k.add(M.darkSteel, new CylinderGeometry(0.007, 0.007, 0.07, 10).rotateX(Math.PI / 2).translate(-0.165, -0.105, 0.115));
  // The hand wheel sits on its own axis, so its group can spin it.
  const dw = handWheel(0.05);
  hk.add(M.darkSteel, dw.steel.rotateX(Math.PI / 2));
  hk.add(M.brass, dw.brass.rotateX(Math.PI / 2));
  // The shaft's lower end carries the worm wheel and the hour circle.
  k.add(M.darkSteel, turn([[[0.05, -1.0], [0.05, -0.86]], [[0.05, -1.0], [0.0, -1.0]].reverse() as P[]], 40));
  k.add(M.cast, turn([
    ...ringProfile(0.05, 0.075, -0.938, -0.872, 0.004),
    [[0.19, -0.9], [0.075, -0.894]],
    [[0.075, -0.916], [0.19, -0.91]],
  ], 72));
  // The worm wheel's bronze rim and its teeth.
  k.add(M.brass, turn(ringProfile(0.188, 0.212, -0.928, -0.882, 0.003), 96));
  const teeth = 150, axis = new Vector3(0, 1, 0);
  for (let i = 0; i < teeth; i++) {
    const a = (i / teeth) * Math.PI * 2;
    // The basis is right-handed, so no tooth renders inside out.
    const out = new Vector3(Math.cos(a), 0, Math.sin(a)), tan = new Vector3(Math.sin(a), 0, -Math.cos(a));
    // Teeth nearly touch, so the rim reads as filled.
    k.put(Pc.tooth, M.brass, boxAt(out.clone().multiplyScalar(0.2155).setY(-0.905), tan, axis, out, 0.0082, 0.042, 0.008));
  }
  // The hour circle faces south and down, under the wheel.
  const hy = -0.962;
  k.add(M.brass, turn([[[0.165, hy], [0.165, hy + 0.012]], [[0.06, hy + 0.012], [0.165, hy + 0.012]].reverse() as P[]], 96));
  k.add(M.hourCircle, new RingGeometry(0.06, 0.165, 128, 1).rotateX(Math.PI / 2).translate(0, hy - 0.0001, 0));
  k.put(Pc.nut, M.zinc, stand(new Vector3(0, -1.0, 0), new Vector3(0, -1, 0), 0, 4));
}

/* ---------- the polar axis housing and the drive: fixed to the pier ---------- */
function buildPolar(k: Kit, M: Mats, Pc: Pieces, wk: Kit): void {
  // The housing: two bearing bosses and a cast barrel.
  k.add(M.cast, turn([
    [[0.06, -0.86], [0.182, -0.86]],
    [[0.182, -0.86], [0.182, -0.81]],
    [[0.182, -0.81], [0.158, -0.795]],
    [[0.158, -0.795], [0.164, -0.55], [0.158, -0.3]],
    [[0.158, -0.3], [0.182, -0.285]],
    [[0.182, -0.285], [0.182, -0.222]],
    [[0.182, -0.222], [0.13, -0.222]],
  ], 72));
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    k.put(Pc.bolt, M.zinc, stand(new Vector3(Math.cos(a) * 0.16, -0.86, Math.sin(a) * 0.16), new Vector3(0, -1, 0), a));
  }
  // An inspection cover on each flank gives access to the bearings.
  // Each cover curves with the barrel.
  for (const mid of [Math.PI / 2, -Math.PI / 2]) {
    k.add(M.cast, turn(ringProfile(0.15, 0.172, -0.66, -0.42, 0.004), 12, [0, 1], mid - 0.42, 0.84));
    for (const y of [-0.63, -0.54, -0.45]) {
      for (const da of [-0.32, 0.32]) {
        const n = new Vector3(Math.sin(mid + da), 0, Math.cos(mid + da));
        k.put(Pc.socket, M.zinc, stand(n.clone().multiplyScalar(0.171).setY(y), n));
      }
    }
  }
  // The worm crosses the wheel's upper side, away from the pier.
  const wy = WORM_Y, wz = WORM_Z;
  // The worm's parts sit on their axis, for spinning.
  wk.add(M.steel, along(turn([[[0.011, -0.12], [0.011, 0.29]]], 16), Y_TO_X, 0, 0, 0));
  // The worm's core, then one helical thread round it.
  // A helix shows its turn; a ring of bumps looks still.
  wk.add(M.steel, along(turn([[[0.018, -0.065], [0.018, 0.065]]], 24), Y_TO_X, 0, 0, 0));
  const turns = 0.13 / WORM_PITCH;
  wk.add(M.steel, new TubeGeometry(new Helix(0.0215, 0.13, turns), Math.round(turns * 24), 0.0042, 6, false));
  // Two bearing blocks hold the worm.
  for (const x of [-0.095, 0.095]) k.add(M.cast, chamferBox(0.03, 0.07, 0.07, 0.006).translate(x, wy, wz + 0.012));
  // A cover shields the worm from above.
  k.add(M.cast, chamferBox(0.22, 0.075, 0.03, 0.006).translate(0, wy, wz + 0.05));
  // The gearbox and the drive motor sit over the worm.
  k.add(M.cast, chamferBox(0.085, 0.085, 0.07, 0.008).translate(0.15, wy, wz + 0.03));
  k.add(M.pier, along(turn([
    ...ringProfile(0.0, 0.06, 0.03, 0.04, 0.004),
    [[0.052, 0.04], [0.052, 0.17]],
    ...ringProfile(0.0, 0.06, 0.17, 0.18, 0.004),
  ], 32), Y_TO_X, 0, wy, wz + 0.085));
  // Cooling fins ring the motor.
  for (let i = 0; i < 5; i++) {
    const h = 0.065 + i * 0.022;
    k.add(M.pier, along(turn(edges([[0.05, h], [0.059, h], [0.059, h + 0.006], [0.05, h + 0.006]]), 24), Y_TO_X, 0, wy, wz + 0.085));
  }
  k.add(M.pier, chamferBox(0.04, 0.03, 0.04, 0.004).translate(0.11, wy, wz + 0.14));
  // The hand wheel for the slow motion in right ascension.
  const hw = handWheel(0.07);
  // The RA hand wheel rides on the worm's shaft, so it turns with the worm.
  // It sits past the motor, where the tube never reaches.
  wk.add(M.darkSteel, hw.steel.rotateZ(-Math.PI / 2).translate(0.27, 0, 0));
  wk.add(M.brass, hw.brass.rotateZ(-Math.PI / 2).translate(0.27, 0, 0));
  // The hour circle's index on a bracket from the lower boss.
  // The bracket runs outside the wheel's rim, above and below the wheel.
  k.add(M.cast, chamferBox(0.03, 0.012, 0.062, 0.003).translate(0, -0.85, -0.209));
  k.add(M.cast, chamferBox(0.03, 0.1, 0.012, 0.003).translate(0, -0.9, -0.24));
  k.add(M.brass, new BoxGeometry(0.008, 0.012, 0.064).translate(0, -0.958, -0.202));
  // A cap screw on the drop's outer face, clear of the wheel.
  k.put(Pc.socket, M.zinc, stand(new Vector3(0, -0.9, -0.246), new Vector3(0, 0, -1)));
}

/* ---------- the pier head and the pier: they never move ---------- */
// The axes cross over the dome's centre.
// The column stands under the polar housing, this far south of it.
// So the tube's rear swings past the pier at every pose.
const CZ = 0.42;
// The head is a casting, drawn side on.
// Its z runs south, its y up.
// Its top follows the polar axis, so the housing sits in it.
function buildPier(k: Kit, M: Mats, Pc: Pieces): void {
  const a = (u: number): Vector2 => new Vector2(POLE.z * u, POLE.y * u);
  // The web carries the housing's middle.
  // It narrows to the south as it drops.
  // So it clears the tube's rear and the worm wheel.
  const py = -1.4;
  const pts = [
    a(-0.36), a(-0.78),
    new Vector2(0.312, -0.751), new Vector2(0.36, py),
    new Vector2(0.25, py), new Vector2(0.24, -0.95),
    new Vector2(0.14, -0.75), new Vector2(0.12, -0.45),
  ];
  const W = 0.3, b = 0.028;
  const head = new ExtrudeGeometry(new Shape(pts), { depth: W - 2 * b, bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelSegments: 3, curveSegments: 1 });
  head.translate(0, 0, -(W - 2 * b) / 2).rotateY(-Math.PI / 2);
  k.add(M.cast, head);
  // A small brass plate on the east flank, held by four screws.
  const pz = 0.3, pyy = -0.6;
  k.add(M.brass, chamferBox(0.004, 0.075, 0.12, 0.0015).translate(W / 2 + 0.002, pyy, pz));
  for (const dy of [-0.026, 0.026]) {
    for (const dz of [-0.048, 0.048]) k.put(Pc.button, M.zinc, stand(new Vector3(W / 2 + 0.004, pyy + dy, pz + dz), new Vector3(1, 0, 0), 0, 0.5));
  }
  // A round plinth under the web, on the column's cap plate.
  const pb = py - 0.06, ty = pb - 0.045;
  k.add(M.cast, turn([
    ...edges([[0.2, pb], [0.2, py - 0.01], [0.19, py], [0.0, py]]),
    [[0.24, pb], [0.2, pb]],
    [[0.24, ty], [0.24, pb]],
    [[0.18, ty], [0.24, ty]],
  ], 64).translate(0, 0, CZ));
  for (let i = 0; i < 8; i++) {
    const q = (i / 8) * Math.PI * 2 + Math.PI / 8;
    k.put(Pc.bolt, M.zinc, stand(new Vector3(Math.cos(q) * 0.22, pb, CZ + Math.sin(q) * 0.22), UP, q, 1.2));
  }
  // The cast iron column, bottom up: foot, taper, ring, bead.
  // It reaches down to the drum's foot, under any floor.
  k.add(M.pier, turn([
    ...edges([[0.28, -AXES_Y], [0.28, -3.3], [0.22, -3.0], [0.17, ty - 0.18], [0.2, ty - 0.16], [0.2, ty - 0.12], [0.18, ty - 0.1], [0.18, ty - 0.076]]),
    arc(0.18, ty - 0.06, 0.016, -Math.PI / 2, Math.PI / 2, 8),
    [[0.18, ty - 0.044], [0.18, ty]],
  ], 48).translate(0, 0, CZ));
}

/* ---------- the model ---------- */
// size scales the whole model.
// Size 1 matches buildDome(1).
export function buildHeroScope(size: number): HeroScope {
  const root = new Group();
  root.scale.setScalar(size);
  const M = materials(), Pc = pieces();
  // mount: the pier and the head, under the tube.
  // polar: turns the frame so +Y is the polar axis.
  // ra: turns by the hour angle.
  // dec: turns by the declination.
  const mount = new Group(), polar = new Group(), ra = new Group(), dec = new Group(), tube = new Group();
  root.add(mount);
  mount.add(polar);
  polar.add(ra);
  ra.add(dec);
  dec.add(tube);
  polar.rotation.x = LAT * DEG - Math.PI / 2;
  tube.position.x = D_OFF;
  tube.position.z = TUBE_SHIFT;
  // The axes' crossing stays over the dome's centre at every pose.
  mount.position.set(0, AXES_Y, 0);
  const kits = [new Kit(), new Kit(), new Kit(), new Kit(), new Kit()];
  const wormKit = new Kit(), knobKit = new Kit();
  buildPier(kits[0], M, Pc);
  buildPolar(kits[1], M, Pc, wormKit);
  buildRa(kits[2], M, Pc, knobKit);
  buildDec(kits[3], M, Pc);
  // The objective's glass reflects the stars once they arrive.
  const G = makeGlassMaterial(null, LENS);
  const glass = buildTube(kits[4], M, Pc, G.material);
  [mount, polar, ra, dec, tube].forEach((g, i) => kits[i].build(g));
  tube.add(glass);
  // The worm spins in its own group, on the polar housing.
  const worm = new Group();
  worm.position.set(0, WORM_Y, WORM_Z);
  polar.add(worm);
  wormKit.build(worm);
  // The dec slow motion's hand wheel spins in its own group, on the RA head.
  const knob = new Group();
  knob.position.set(-0.165, -0.105, 0.15);
  ra.add(knob);
  knobKit.build(knob);

  const t = new Vector3();
  // The pose on screen: RA unwrapped, the dec angle, and the side in use.
  // Side +1 puts the tube east of the pier, -1 west.
  let pose = { ra: 0, dec: 0, side: 0 };
  let flip: { from: Pose; to: Pose; t0: number } | null = null;
  let started = false;
  // Writes a pose to the joints and the worm.
  function apply(p: Pose): void {
    ra.rotation.y = p.ra;
    dec.rotation.x = p.dec;
    worm.rotation.x = -p.ra * WORM_RATIO;
    knob.rotation.z = -p.dec * KNOB_RATIO;
  }
  // The pose on screen now; mid-flip, it lies on the path between the two poses.
  function current(now: number): Pose {
    if (!flip) return pose;
    const s = Math.min(1, (now - flip.t0) / FLIP_MS);
    return flipPose(flip.from, flip.to, s);
  }
  // Points the tube at alt and az in degrees, as Dome.setTube does.
  // Azimuth runs from north through east.
  // The tube rides on the side of the target's hour angle.
  // A change of side flips the mount over the pole, over FLIP_MS.
  // Returns true while the flip runs.
  function setTube(alt: number, az: number): boolean {
    const now = performance.now();
    const from = started ? current(now) : null;
    // The RA angle is unwrapped near the pose on screen, so it never jumps.
    // The side keeps the counterweight down; core/clearance.ts holds the rule.
    const to = targetPose(alt, az, from ? from.ra : 0);
    const side = to.side;
    if (!started) {
      started = true;
      pose = to;
      apply(to);
      return false;
    }
    // A flip that has run its time ends here.
    if (flip && now - flip.t0 >= FLIP_MS) {
      pose = flip.to;
      flip = null;
    }
    // Same side: the flip keeps its start and follows the target.
    if (flip && side === flip.to.side) {
      flip.to = to;
      apply(current(now));
      return true;
    }
    if (!flip && side === pose.side) {
      pose = to;
      apply(to);
      return false;
    }
    // A new side starts a flip from the pose on screen.
    const start = current(now);
    flip = { from: start, to, t0: now };
    pose = { ...to };
    apply(start);
    return true;
  }
  // Advances a running flip. Returns true while it still runs.
  function step(now: number): boolean {
    if (!flip) return false;
    if (now - flip.t0 >= FLIP_MS) {
      pose = flip.to;
      flip = null;
      apply(pose);
      return false;
    }
    apply(current(now));
    return true;
  }
  setTube(TUBE_REST_ALT, 0);
  let env: Texture | null = null;
  return {
    root, glass, setTube, step, parts: { mount, polar, ra, dec, tube, worm, knob },
    setSky: G.setSky, setTarget: G.setTarget, setSlit: G.setSlit,
    setStars(stars) {
      env?.dispose();
      env = buildStarEnv(stars);
      G.setEnv(env);
    },
  };
}
