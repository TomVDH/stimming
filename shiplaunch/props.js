// Ship launch props: the drag-chain wires and heaps, the crowd, the bunting.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { CANAL, HULL, wayTop, buntingLine } from './yard.js';

// The wires leave lugs on the inboard deck edge at these stations.
export const WIRE_X = [-30, -10, 10, 30];
const SEG = 18;

/* ---------- wires and heaps ---------- */
export function makeChains(mats) {
  const grp = new THREE.Group();
  // One thin bar per wire segment, placed each frame along a sagging curve.
  const bar = new THREE.BoxGeometry(1, 1, 1).translate(0, 0, 0.5);
  const wire = new THREE.InstancedMesh(bar, mats.wire, WIRE_X.length * SEG);
  wire.castShadow = true;
  wire.frustumCulled = false;
  grp.add(wire);
  // A heap: a low, lumpy mound of rusty chain.
  const heapGeo = new THREE.IcosahedronGeometry(1, 3);
  const pos = heapGeo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const n = 1 + 0.18 * Math.sin(x * 9.1 + z * 7.3) * Math.cos(y * 8.7 + x * 3.1) + 0.1 * Math.sin(z * 23.0 + y * 17.0);
    pos.setXYZ(i, x * n * 1.7, Math.max(-0.1, y) * n * 0.75, z * n * 1.2);
  }
  heapGeo.computeVertexNormals();
  const heaps = WIRE_X.map(() => {
    const h = new THREE.Mesh(heapGeo, mats.rust);
    h.castShadow = h.receiveShadow = true;
    grp.add(h);
    return h;
  });
  const m = new THREE.Matrix4(), a = new THREE.Vector3(), b = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3(), fwd = new THREE.Vector3(0, 0, 1);
  const pts = Array.from({ length: SEG + 1 }, () => new THREE.Vector3());
  /** Lays the wires from the hull's lugs to the heaps. */
  function update(hull, L, drop, slack) {
    let n = 0;
    WIRE_X.forEach((x, k) => {
      const hz = L.heap + (k % 2 ? 0.6 : -0.4);
      const hy = wayTop(hz, drop);
      heaps[k].position.set(x + (k - 1.5) * 0.6, hy, hz - 1.0);
      heaps[k].rotation.y = k * 1.7;
      a.set(x, HULL.D, -HULL.B / 2).applyMatrix4(hull.matrixWorld);
      b.set(x, hy + 0.5, hz);
      const d = a.distanceTo(b);
      // A slack wire sags like a chain; a taut one runs straight.
      const sag = Math.sqrt(Math.max(0, slack * slack - d * d)) * 0.45;
      for (let i = 0; i <= SEG; i++) {
        const t = i / SEG;
        pts[i].lerpVectors(b, a, t);
        pts[i].y -= sag * 4 * t * (1 - t);
        // The wire lies on the ground where it sags under it.
        const g = wayTop(pts[i].z, drop) + 0.05;
        if (pts[i].z < CANAL.zYard && pts[i].y < g) pts[i].y = g;
      }
      for (let i = 0; i < SEG; i++) {
        const len = pts[i].distanceTo(pts[i + 1]);
        q.setFromUnitVectors(fwd, s.subVectors(pts[i + 1], pts[i]).normalize());
        m.compose(pts[i], q, s.set(0.09, 0.09, len));
        wire.setMatrixAt(n++, m);
      }
    });
    wire.instanceMatrix.needsUpdate = true;
  }
  return { grp, update };
}

/* ---------- the crowd ---------- */
// Coats in winter: dark blues, greys, browns, a few bright jackets.
const COATS = [0x1f2633, 0x2b2b2e, 0x3b2f27, 0x283240, 0x4a4038, 0x22303a, 0x5e2a24, 0x6e5a2a, 0x2f3d2c, 0x3a3a44];
export function makeCrowd(mats) {
  // A figure seen mostly from behind: legs, a winter coat, shoulders, a dark head.
  const legL = new THREE.CylinderGeometry(0.075, 0.065, 0.82, 6).translate(-0.1, 0.41, 0);
  const legR = legL.clone().translate(0.2, 0, 0);
  const coat = new THREE.CylinderGeometry(0.2, 0.27, 0.78, 10).translate(0, 1.13, 0);
  const shoulders = new THREE.SphereGeometry(0.22, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2).scale(1.05, 0.45, 0.62).translate(0, 1.5, 0);
  const neck = new THREE.CylinderGeometry(0.06, 0.07, 0.1, 6).translate(0, 1.58, 0);
  const body = mergeGeometries([legL.toNonIndexed(), legR.toNonIndexed(), coat.toNonIndexed(), shoulders.toNonIndexed(), neck.toNonIndexed()]);
  body.scale(1, 1, 0.72);
  const head = new THREE.SphereGeometry(0.115, 10, 8).scale(0.92, 1.1, 1).translate(0, 1.73, 0);
  const people = [];
  let seed = 11;
  const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const add = (x, z, yard = false) => people.push({ x, z, z0: z, y: CANAL.quayTop, h: 0.92 + r() * 0.16, c: COATS[Math.floor(r() * COATS.length)], back: 0, yard });
  // The near quay: two groups frame the shot, a few stand at the very edge.
  for (let i = 0; i < 9; i++) add(-31 - r() * 5, CANAL.zQuay + 1.5 + r() * 5);
  for (let i = 0; i < 8; i++) add(-10 + r() * 5, CANAL.zQuay + 1.5 + r() * 5);
  for (let i = 0; i < 26; i++) add(-60 + r() * 115, CANAL.zQuay + 0.7 + r() * 1.6);
  // The yard's own crowd, on the banks beside the berth.
  for (let i = 0; i < 28; i++) add(-86 + r() * 18, -30 - r() * 14, true);
  for (let i = 0; i < 28; i++) add(68 + r() * 18, -30 - r() * 14, true);
  const bodies = new THREE.InstancedMesh(body, mats.coat, people.length);
  const heads = new THREE.InstancedMesh(head, mats.hair, people.length);
  bodies.castShadow = heads.castShadow = true;
  const col = new THREE.Color();
  people.forEach((p, i) => bodies.setColorAt(i, col.setHex(p.c)));
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), v = new THREE.Vector3();
  /** Places everyone; the near crowd steps back from water on the quay. */
  function update(dt, wetAt, yardY) {
    people.forEach((p, i) => {
      if (!p.yard) {
        const wet = wetAt(p.x);
        const goal = wet > 0.02 ? Math.min(5, 1.5 + wet * 30) : Math.max(0, p.back - dt * 0.4);
        p.back += (goal - p.back) * Math.min(1, dt * 2.5);
        p.z = p.z0 + p.back;
      } else p.y = yardY(p.z, p.x);
      m.compose(v.set(p.x, p.y, p.z), q, s.set(1, p.h, 1));
      bodies.setMatrixAt(i, m);
      heads.setMatrixAt(i, m);
    });
    bodies.instanceMatrix.needsUpdate = heads.instanceMatrix.needsUpdate = true;
  }
  const grp = new THREE.Group();
  grp.add(bodies, heads);
  return { grp, update, people };
}

/* ---------- bunting ---------- */
const FLAGS = [0xc8302a, 0xe8c23a, 0x2a5fa8, 0xf2f2ee, 0x2f8a4a];
export function makeBunting(mats) {
  const line = buntingLine();
  const tri = new THREE.BufferGeometry();
  tri.setAttribute('position', new THREE.Float32BufferAttribute([-0.35, 0, 0, 0.35, 0, 0, 0, -0.75, 0], 3));
  tri.computeVertexNormals();
  const flags = [];
  for (let k = 0; k < line.length - 1; k++) {
    const a = new THREE.Vector3(...line[k]), b = new THREE.Vector3(...line[k + 1]);
    const n = Math.round(a.distanceTo(b) / 1.3);
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n;
      const p = a.clone().lerp(b, t);
      // The line sags between its ends.
      p.y -= 1.2 * 4 * t * (1 - t);
      flags.push({ p, ph: flags.length * 0.7 });
    }
  }
  const mat = mats.flag.clone();
  mat.side = THREE.DoubleSide;
  const mesh = new THREE.InstancedMesh(tri, mat, flags.length);
  const col = new THREE.Color();
  flags.forEach((f, i) => mesh.setColorAt(i, col.setHex(FLAGS[i % FLAGS.length])));
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(1, 1, 1);
  /** Flutters each pennant in the breeze; reduced motion holds them still. */
  function update(t, still) {
    flags.forEach((f, i) => {
      const w = still ? 0.35 : 0.35 + 0.25 * Math.sin(t * 5.3 + f.ph) + 0.1 * Math.sin(t * 11.7 + f.ph * 2.1);
      e.set(w, Math.PI / 2 + 0.3 * Math.sin(t * 1.3 + f.ph), 0);
      m.compose(f.p, q.setFromEuler(e), s);
      mesh.setMatrixAt(i, m);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }
  update(0, true);
  return { mesh, update };
}
