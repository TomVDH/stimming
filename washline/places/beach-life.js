// Beach life: olives and cypresses on the headlands, a windmill, a hamlet,
// a jetty with a moored boat, the tide line, the hut wall's gear, gulls.
import * as THREE from 'three';
import { col, pick, inst, paint } from './kit.js';
import { caique } from './beach-dress.js';

export function beachLife(group, R, { HX, SHORE, LINE_Z, hut, rocks, stone, rock }) {
  const B = [], C = [], O = [], G = [], lamps = [];
  group.updateMatrixWorld(true);
  const ray = new THREE.Raycaster(), down = new THREE.Vector3(0, -1, 0), from = new THREE.Vector3();
  // The rock surface under a point, with how flat it is there.
  const ground = (x, z) => {
    ray.set(from.set(x, 200, z), down);
    const h = ray.intersectObjects(rocks, false)[0];
    if (!h) return null;
    return { y: h.point.y, flat: h.face.normal.clone().transformDirection(h.object.matrixWorld).y };
  };

  /* ---------- the headlands ---------- */
  // Olives and cypresses grow where the rock is flat enough.
  let top = null;
  const spots = [];
  for (let i = 0; i < 420; i++) {
    const right = R() < 0.5;
    const x = right ? 14 + R() * 42 : -12 - R() * 38, z = right ? -2 - R() * 98 : -R() * 90;
    const g = ground(x, z);
    if (!g || g.flat < 0.55 || g.y < 1.2) continue;
    spots.push({ x, z, y: g.y, right });
    if (right && g.flat > 0.75 && (!top || g.y > top.y)) top = { x, z, y: g.y };
    const kind = R();
    if (kind < 0.18) {
      const h = 5 + R() * 5;
      G.push({ p: [x, g.y + h / 2 - 0.3, z], s: [0.9, h, 0.9], c: col([0.3 + R() * 0.04, 0.06, 150]) });
    } else if (kind < 0.62) {
      const k = 1 + R() * 1.4;
      C.push({ p: [x, g.y + 0.6 * k, z], s: [0.12 * k, 1.2 * k, 0.12 * k], r: [(R() - 0.5) * 0.4, 0, (R() - 0.5) * 0.4], c: col([0.35, 0.03, 50]) });
      for (let j = 0; j < 5; j++) O.push({ p: [x + (R() - 0.5) * 1.6 * k, g.y + (1.2 + R() * 0.6) * k, z + (R() - 0.5) * 1.6 * k], s: [0.8, 0.5, 0.8].map(v => v * k * (0.6 + R() * 0.5)), c: col([0.58 + R() * 0.06, 0.04, 135]) });
    } else {
      O.push({ p: [x, g.y + 0.3, z], s: [0.9, 0.5, 0.9].map(v => v * (0.6 + R())), c: col([0.42 + R() * 0.1, 0.07, 120 + R() * 25]) });
    }
  }

  // A windmill turns its sails on the highest flat rock to the right.
  const mill = new THREE.Group();
  const lime = new THREE.MeshStandardMaterial({ color: col([0.95, 0.01, 90]), roughness: 0.85 });
  const tower = new THREE.Mesh(new THREE.CylinderGeometry(2.0, 2.4, 6.5, 20), lime);
  tower.position.y = 3.25; tower.castShadow = true; mill.add(tower);
  const cap = new THREE.Mesh(new THREE.ConeGeometry(2.3, 2.2, 20), new THREE.MeshStandardMaterial({ color: col([0.42, 0.06, 55]), roughness: 0.9 }));
  cap.position.y = 7.6; cap.castShadow = true; mill.add(cap);
  const door = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.8, 0.2), new THREE.MeshStandardMaterial({ color: col([0.5, 0.15, 250]) }));
  door.position.set(0, 0.9, 2.3); mill.add(door);
  const sails = new THREE.Group();
  sails.position.set(0, 6.8, 2.6);
  const canvasMat = new THREE.MeshStandardMaterial({ color: col([0.93, 0.02, 85]), roughness: 0.9, side: THREE.DoubleSide });
  const spar = new THREE.MeshStandardMaterial({ color: col([0.35, 0.04, 55]) });
  for (let k = 0; k < 8; k++) {
    const arm = new THREE.Group();
    arm.rotation.z = (k / 8) * Math.PI * 2;
    const pole = new THREE.Mesh(new THREE.BoxGeometry(0.1, 5.2, 0.1), spar);
    pole.position.y = 2.6; arm.add(pole);
    const sail = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 3.6), canvasMat);
    sail.position.set(0.6, 3.2, 0); arm.add(sail);
    sails.add(arm);
  }
  mill.add(sails);
  if (top) { mill.position.set(top.x, top.y - 0.4, top.z); mill.rotation.y = -0.6; group.add(mill); }

  // A hamlet of white cubes steps down the right-hand slope.
  const homes = [];
  for (const sp of spots) {
    if (!sp.right || sp.y > 12 || sp.z < -40 || sp.z > -8 || homes.some(h => Math.hypot(h.x - sp.x, h.z - sp.z) < 5.5)) continue;
    if (homes.length >= 7) break;
    homes.push(sp);
    const w = 3 + R() * 2, d = 3 + R() * 2, h = 2.8 + R() * 1.5, ry = (R() - 0.5) * 0.4;
    B.push({ p: [sp.x, sp.y + h / 2 - 0.5, sp.z], s: [w, h + 1, d], r: [0, ry, 0], c: col([0.95, 0.01, 90]) });
    B.push({ p: [sp.x - Math.sin(ry) * (d / 2), sp.y + 0.6, sp.z + Math.cos(ry) * (d / 2 + 0.02)], s: [0.8, 1.7, 0.06], r: [0, ry, 0], c: col(pick(R, [[0.5, 0.15, 250], [0.55, 0.12, 160], [0.55, 0.15, 30]])) });
    B.push({ p: [sp.x + 1, sp.y + h - 1.0, sp.z + d / 2 + 0.03], s: [0.6, 0.6, 0.06], r: [0, ry, 0], c: col([0.5, 0.15, 250]) });
  }

  /* ---------- the shore ---------- */
  // A tide line of dry seaweed, bleached driftwood, stones in the shallows.
  for (let i = 0; i < 220; i++) {
    const x = -15 + R() * 30;
    if (x > 7.2 && x < 9.8 || R() < 0.35 * (0.5 + 0.5 * Math.sin(x * 1.3))) continue;
    const z = SHORE + 1.0 + R() * 1.1 + 0.25 * Math.sin(x * 0.7);
    // Most weed has dried pale; a little is fresh and dark.
    O.push({ p: [x, 0.015, z], s: [0.12 + R() * 0.14, 0.015, 0.05 + R() * 0.05], r: [0, R() * 3, 0], c: col(R() < 0.25 ? [0.36, 0.03, 70] : [0.6 + R() * 0.12, 0.035, 75]) });
  }
  for (let i = 0; i < 5; i++) C.push({ p: [-11 + R() * 16, 0.07, SHORE + 1.3 + R() * 1.4], s: [0.06 + R() * 0.05, 1 + R() * 1.6, 0.06 + R() * 0.05], r: [0, R() * 3, Math.PI / 2], c: col([0.82, 0.01, 70]) });
  for (let i = 0; i < 12; i++) {
    const s = [0.4 + R() * 0.7, 0.3 + R() * 0.4, 0.4 + R() * 0.7];
    const m = new THREE.Mesh(rock(s), stone);
    m.position.set((R() < 0.5 ? -1 : 1) * (2 + R() * 12), -0.25, SHORE - 1.5 - R() * 9);
    m.castShadow = true;
    group.add(m);
  }

  // A concrete jetty runs out on the right, with bollards and tyres.
  const jx = 8.5, j0 = SHORE + 1, j1 = SHORE - 15;
  B.push({ p: [jx, 0.25, (j0 + j1) / 2], s: [2.1, 0.7, j0 - j1], c: col([0.8, 0.01, 80]) });
  for (let z = j0 - 2; z > j1; z -= 4) {
    C.push({ p: [jx + 0.75, 0.75, z], s: [0.12, 0.3, 0.12], c: col([0.3, 0.01, 250]) });
    const tyre = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.1, 6, 16), new THREE.MeshStandardMaterial({ color: 0x18181a, roughness: 0.9 }));
    tyre.position.set(jx - 1.1, 0.2, z - 1); tyre.rotation.y = Math.PI / 2; group.add(tyre);
  }
  const hull = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6 });
  const moored = new THREE.Mesh(caique(4.2, 1.6, [0.62, 0.15, 30]), hull);
  moored.position.set(jx - 2.2, -0.35, SHORE - 9); moored.rotation.y = Math.PI / 2 + 0.05;
  moored.castShadow = true;
  group.add(moored);
  C.push({ p: [jx - 1.1, 0.4, SHORE - 7.2], s: [0.015, 1.4, 0.015], r: [0, 0, 1.2], c: col([0.8, 0.04, 80]) });

  /* ---------- the hut wall ---------- */
  // A grey plinth, oars, a lantern by the pulley, a string of buoys.
  B.push({ p: [HX + 0.02, 0.16, 0], s: [0.04, 0.32, hut.z1 - hut.z0], c: col([0.72, 0.02, 250]) });
  for (const dz of [1.5, 1.75]) {
    B.push({ p: [HX + 0.28, 1.45, dz], s: [0.05, 2.9, 0.06], r: [0, 0, 0.17], c: col([0.62, 0.05, 70]) });
    B.push({ p: [HX + 0.52, 0.28, dz], s: [0.03, 0.6, 0.16], r: [0, 0, 0.17], c: col([0.5, 0.15, 250]) });
  }
  B.push({ p: [HX + 0.14, 2.95, 0.75], s: [0.16, 0.26, 0.16], c: col([0.18, 0.01, 250]) });
  lamps.push({ p: [HX + 0.14, 2.92, 0.75], s: [0.12, 0.18, 0.12] });
  for (let k = 0; k < 4; k++) O.push({ p: [HX + 0.12, 2.4 - k * 0.38, -1.5 + (k % 2) * 0.05], s: [0.13, 0.13, 0.13], c: col(k % 2 ? [0.95, 0.01, 90] : [0.68, 0.17, 45]) });
  C.push({ p: [HX + 0.1, 1.85, -1.5], s: [0.008, 1.4, 0.008], c: col([0.7, 0.03, 80]) });

  /* ---------- gulls ---------- */
  // Gulls wheel over the cove on slow circles.
  const white = new THREE.MeshStandardMaterial({ color: col([0.95, 0.01, 90]), roughness: 0.7 });
  const gulls = [];
  for (let i = 0; i < 6; i++) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.09, 0.1), white);
    g.add(body);
    const wings = [-1, 1].map(k => {
      const pivot = new THREE.Group();
      const w = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.02, 0.75), white);
      w.position.z = k * 0.37;
      pivot.add(w); g.add(pivot);
      return { pivot, k };
    });
    group.add(g);
    gulls.push({ g, wings, cx: (R() - 0.5) * 30, cy: 12 + R() * 14, cz: -25 - R() * 30, r: 8 + R() * 14, sp: (0.12 + R() * 0.1) * (R() < 0.5 ? -1 : 1), ph: R() * 6 });
  }

  const box = new THREE.BoxGeometry(1, 1, 1);
  inst(group, box, paint(0.85), B);
  inst(group, new THREE.CylinderGeometry(1, 1, 1, 8), paint(0.85), C);
  inst(group, new THREE.IcosahedronGeometry(1, 1), paint(0.9), O);
  inst(group, new THREE.ConeGeometry(0.5, 1, 9), paint(0.9), G);
  inst(group, box, new THREE.MeshStandardMaterial({ color: col([0.9, 0.08, 80]), emissive: col([0.85, 0.12, 75]), emissiveIntensity: 1.6 }), lamps, false);

  return {
    tick(t) {
      sails.rotation.z = -t * 0.35;
      moored.position.y = -0.35 + 0.08 * Math.sin(t * 0.85 + 1);
      moored.rotation.z = 0.03 * Math.sin(t * 0.7);
      for (const q of gulls) {
        const a = q.ph + t * q.sp;
        q.g.position.set(q.cx + Math.cos(a) * q.r, q.cy + Math.sin(a * 2.3) * 0.8, q.cz + Math.sin(a) * q.r);
        q.g.rotation.set(0, -a + (q.sp > 0 ? 0 : Math.PI), 0.15 * Math.sign(q.sp));
        const flap = 0.35 * Math.sin(t * 5 + q.ph) * (0.5 + 0.5 * Math.sin(t * 0.4 + q.ph));
        for (const w of q.wings) w.pivot.rotation.x = w.k * flap;
      }
    },
  };
}
