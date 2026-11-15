// Beach dressing: caiques, nets, drying octopus, a taverna table, a tamarisk,
// bougainvillea, a cat, a chapel on the headland, islands in the haze.
import * as THREE from 'three';
import { col, pick, inst, paint } from './kit.js';

// A caique: a side profile with a curved sheer, extruded and rounded.
// Vertex colours paint the bottom, a blue band and a white topside.
function caique(len, beam, band) {
  const sh = new THREE.Shape(), n = 24, top = [], bot = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, x = (t - 0.5) * len;
    top.push([x, 0.75 + 0.45 * Math.pow(Math.abs(t - 0.45) * 1.8, 2.4)]);
    bot.push([x, 0.05 + 0.55 * Math.pow(Math.abs(2 * t - 1), 3)]);
  }
  sh.moveTo(...top[0]);
  for (const p of top.slice(1)) sh.lineTo(...p);
  for (const p of bot.reverse()) sh.lineTo(...p);
  const g = new THREE.ExtrudeGeometry(sh, { depth: beam - 0.5, bevelEnabled: true, bevelThickness: 0.25, bevelSize: 0.22, bevelSegments: 4, curveSegments: 4 });
  g.translate(0, 0, -(beam - 0.5) / 2);
  const p = g.attributes.position, c = new Float32Array(p.count * 3);
  const red = col([0.45, 0.14, 30]), blue = col(band), white = col([0.95, 0.01, 90]);
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i), k = y < 0.32 ? red : y < 0.5 ? blue : white;
    c[i * 3] = k.r; c[i * 3 + 1] = k.g; c[i * 3 + 2] = k.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(c, 3));
  g.computeVertexNormals();
  return g;
}

export function dressBeach(group, R, { HX, SHORE, LINE_Z, hut, anchors }) {
  const B = [], C = [], O = [];
  const hull = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6 });
  const boat = (x, y, z, ry, rz, band, len = 5) => {
    const m = new THREE.Mesh(caique(len, 1.8, band), hull);
    m.position.set(x, y, z); m.rotation.set(0, ry, rz);
    m.castShadow = m.receiveShadow = true;
    group.add(m);
    // A small wheelhouse and a stub mast amidships.
    const wh = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.7, 1.0), new THREE.MeshStandardMaterial({ color: col([0.95, 0.01, 90]), roughness: 0.6 }));
    wh.position.set(-0.6, 1.2, 0); m.add(wh);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.08, 1.15), new THREE.MeshStandardMaterial({ color: col(band), roughness: 0.6 }));
    cap.position.set(-0.6, 1.58, 0); m.add(cap);
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 2.2, 6), new THREE.MeshStandardMaterial({ color: col([0.55, 0.06, 60]) }));
    mast.position.set(0.9, 1.9, 0); m.add(mast);
    wh.castShadow = mast.castShadow = true;
    return m;
  };
  // One caique rests on the pebbles behind the line; one rides at anchor.
  boat(6.2, 0.05, SHORE + 0.4, 1.05, 0.12, [0.5, 0.15, 250], 4.6);
  boat(-7, -0.35, -24, 2.2, 0, [0.55, 0.17, 30], 6);
  boat(14, -0.35, -60, 0.8, 0, [0.6, 0.12, 150], 5.5);

  // Fishing nets in a heap with cork floats, and stacked crates.
  for (let i = 0; i < 26; i++) O.push({ p: [4.4 + (R() - 0.5) * 1.1, 0.12 + R() * 0.25, SHORE + 3.4 + (R() - 0.5) * 0.9], s: [0.32, 0.18, 0.3], c: col(pick(R, [[0.72, 0.16, 70], [0.78, 0.15, 90], [0.6, 0.16, 40]])) });
  for (let i = 0; i < 10; i++) O.push({ p: [4.4 + (R() - 0.5) * 1.2, 0.35 + R() * 0.15, SHORE + 3.4 + (R() - 0.5) * 1.0], s: [0.08, 0.06, 0.08], c: col([0.95, 0.01, 90]) });
  for (let i = 0; i < 3; i++) B.push({ p: [5.6, 0.18 + i * 0.32, SHORE + 4.6], s: [0.6, 0.3, 0.42], r: [0, 0.2 * i, 0], c: col([0.6, 0.12, 190]) });

  // A rope coil lies at the post's foot, with stones around it.
  const [px, , pz] = anchors.b;
  const coil = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.05, 6, 20), new THREE.MeshStandardMaterial({ color: col([0.75, 0.05, 80]), roughness: 0.9 }));
  coil.rotation.x = -Math.PI / 2; coil.position.set(px + 0.5, 0.06, pz + 0.3); coil.castShadow = true; group.add(coil);
  for (let i = 0; i < 7; i++) O.push({ p: [px + (R() - 0.5) * 0.6, 0.08, pz + (R() - 0.5) * 0.6], s: [0.16, 0.1, 0.13], c: col([0.6 + R() * 0.15, 0.02, 70]) });

  // Octopus dry on a short line between two sticks by the hut.
  const ox0 = HX + 0.5, ox1 = HX + 2.3, oz = LINE_Z - 1.7;
  for (const x of [ox0, ox1]) C.push({ p: [x, 0.8, oz], s: [0.03, 1.6, 0.03], c: col([0.5, 0.05, 60]) });
  C.push({ p: [(ox0 + ox1) / 2, 1.55, oz], s: [0.008, ox1 - ox0, 0.008], r: [0, 0, Math.PI / 2], c: col([0.3, 0.02, 60]) });
  for (let i = 0; i < 3; i++) {
    const x = ox0 + 0.55 + i * 0.6;
    O.push({ p: [x, 1.38, oz], s: [0.11, 0.14, 0.1], c: col([0.48, 0.12, 25]) });
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      C.push({ p: [x + Math.cos(a) * 0.06, 1.1, oz + Math.sin(a) * 0.05], s: [0.018, 0.45, 0.018], r: [Math.sin(a) * 0.15, 0, -Math.cos(a) * 0.15], c: col([0.55, 0.1, 30]) });
    }
  }

  // A taverna table with two blue chairs under the hut's wall.
  const tz = LINE_Z + 4.6, tx = HX + 5.6;
  B.push({ p: [tx + 1.5, 0.74, tz], s: [0.75, 0.04, 0.75], c: col([0.95, 0.01, 90]) });
  for (const [dx, dz] of [[-0.3, -0.3], [0.3, -0.3], [-0.3, 0.3], [0.3, 0.3]]) B.push({ p: [tx + 1.5 + dx, 0.36, tz + dz], s: [0.04, 0.72, 0.04], c: col([0.5, 0.15, 250]) });
  for (const [dx, ry] of [[-0.65, 0.3], [0.7, -2.6]]) {
    const cx = tx + 1.5 + dx, cz = tz + 0.1;
    B.push({ p: [cx, 0.45, cz], s: [0.42, 0.05, 0.42], r: [0, ry, 0], c: col([0.75, 0.08, 85]) });
    B.push({ p: [cx - Math.cos(ry) * 0.2, 0.72, cz + Math.sin(ry) * 0.2], s: [0.04, 0.55, 0.42], r: [0, ry, 0.1], c: col([0.5, 0.15, 250]) });
    for (const k of [-1, 1]) for (const j of [-1, 1]) B.push({ p: [cx + k * 0.18, 0.22, cz + j * 0.18], s: [0.03, 0.45, 0.03], c: col([0.5, 0.15, 250]) });
  }

  // Bougainvillea climbs over the door; pots stand by the wall.
  for (let i = 0; i < 70; i++) {
    const t = R(), x = HX - 1.2 + (R() - 0.5) * (0.6 + t * 1.8), y = 1.8 + t * 1.6;
    O.push({ p: [x, Math.min(y, 3.35), hut.z1 + 0.1 + R() * 0.2], s: [0.13, 0.11, 0.1].map(v => v * (0.6 + R() * 0.7)), c: col(R() < 0.65 ? [0.55 + R() * 0.08, 0.22, 345] : [0.42, 0.11, 140]) });
  }
  for (let i = 0; i < 4; i++) {
    const x = HX - 0.3 - i * 0.35, z = hut.z1 + 0.35;
    C.push({ p: [x, 0.2, z], s: [0.14, 0.4, 0.14], c: col([0.6, 0.12, 45]) });
    O.push({ p: [x, 0.5, z], s: [0.18, 0.15, 0.18], c: col([0.45, 0.11, 140]) });
    for (let k = 0; k < 4; k++) O.push({ p: [x + (R() - 0.5) * 0.25, 0.6, z + (R() - 0.5) * 0.2], s: [0.04, 0.035, 0.04], c: col([0.58, 0.2, 25]) });
  }
  // A cat sleeps on the bench.
  O.push({ p: [HX - 2.3, 0.56, hut.z1 + 0.35], s: [0.22, 0.1, 0.12], c: col([0.95, 0.01, 90]) });
  O.push({ p: [HX - 2.1, 0.6, hut.z1 + 0.35], s: [0.08, 0.07, 0.08], c: col([0.55, 0.08, 60]) });

  // A tamarisk leans over the hut's far side.
  C.push({ p: [hut.x0 - 1.2, 1.4, -1.2], s: [0.14, 2.8, 0.14], r: [0.1, 0, -0.25], c: col([0.38, 0.03, 50]) });
  for (let i = 0; i < 22; i++) O.push({ p: [hut.x0 - 0.6 + (R() - 0.5) * 3, 3.2 + R() * 1.4, -1.2 + (R() - 0.5) * 2.6], s: [0.7, 0.45, 0.7].map(v => v * (0.6 + R() * 0.6)), c: col([0.6 + R() * 0.06, 0.05, 140]) });

  /* ---------- the chapel ---------- */
  // A whitewashed chapel with a blue dome sits on the left headland.
  const ch = new THREE.Group(), lime = new THREE.MeshStandardMaterial({ color: col([0.96, 0.01, 90]), roughness: 0.85 });
  const add = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; ch.add(m); };
  add(new THREE.BoxGeometry(9, 9, 9), lime, 0, 4.5, 0);
  add(new THREE.BoxGeometry(4, 3.4, 6), lime, 0, 10.7, 0);
  add(new THREE.CylinderGeometry(1.5, 1.6, 1.2, 16), lime, 0, 13, 0);
  add(new THREE.SphereGeometry(1.55, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: col([0.5, 0.15, 250]), roughness: 0.4 }), 0, 13.6, 0);
  add(new THREE.BoxGeometry(0.4, 1.4, 1.6), lime, 0, 13.3, -3.2);
  add(new THREE.BoxGeometry(0.1, 1.2, 0.08), new THREE.MeshStandardMaterial({ color: col([0.85, 0.1, 85]) }), 0, 15.5, 0);
  add(new THREE.BoxGeometry(0.6, 0.1, 0.08), new THREE.MeshStandardMaterial({ color: col([0.85, 0.1, 85]) }), 0, 15.7, 0);
  ch.position.set(-27, 0, -46);
  ch.rotation.y = 0.5;
  group.add(ch);

  /* ---------- islands ---------- */
  // Long low islands lie on the horizon in the haze.
  for (const [x, z, w, h, L] of [[-700, -1700, 900, 90, 0.66], [520, -2100, 1300, 130, 0.72], [-80, -2600, 700, 60, 0.76]]) {
    const s = new THREE.Shape();
    s.moveTo(-w / 2, -5);
    for (let i = 0; i <= 40; i++) {
      const t = i / 40, y = h * Math.pow(Math.sin(Math.PI * t), 0.7) * (0.75 + 0.25 * Math.sin(t * 13 + x));
      s.lineTo(-w / 2 + w * t, y);
    }
    s.lineTo(w / 2, -5);
    const m = new THREE.Mesh(new THREE.ShapeGeometry(s), new THREE.MeshBasicMaterial({ color: col([L, 0.04, 250]), fog: false }));
    m.position.set(x, -2, z);
    group.add(m);
  }

  const box = new THREE.BoxGeometry(1, 1, 1);
  inst(group, box, paint(0.8), B);
  inst(group, new THREE.CylinderGeometry(1, 1, 1, 8), paint(0.8), C);
  inst(group, new THREE.IcosahedronGeometry(1, 1), paint(0.85), O);
}
