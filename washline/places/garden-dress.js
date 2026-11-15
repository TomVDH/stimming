// Garden dressing: the pole, sheds, trees, terrace things, neighbours' toys,
// a rotary dryer, the next street's backs, a church tower and poplars.
import * as THREE from 'three';
import { ok, col, rgb, pick, inst, paint, canvasTex } from './kit.js';

const FLOWER = [[0.58, 0.2, 25], [0.7, 0.16, 0], [0.95, 0.01, 90], [0.6, 0.18, 330]];
const SHED = [[0.45, 0.07, 55], [0.42, 0.06, 150], [0.38, 0.05, 45], [0.55, 0.04, 70]];
const WASH = [[0.95, 0.01, 90], [0.6, 0.1, 255], [0.8, 0.08, 20], [0.85, 0.1, 95], [0.6, 0.1, 150], [0.45, 0.04, 260], [0.75, 0.1, 350]];

export function dressGarden(group, R, { HX, EX, PLOT, LINE_Z, plots, look, anchors }) {
  const box = new THREE.BoxGeometry(1, 1, 1), ball = new THREE.IcosahedronGeometry(1, 1);
  const cyl = new THREE.CylinderGeometry(1, 1, 1, 10);
  const B = [], C = [], G = [];
  const glowCloth = (x, y, z, w, h, c, ry = 0) => {
    const at = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry, 0)), new THREE.Vector3(1, 1, 1));
    look.addStatic(new THREE.PlaneGeometry(w, h), { alb: rgb(col(c)), tr: rgb(col([Math.min(0.95, c[0] + 0.05), c[1] * 1.4, c[2]])) }, { size: [w, h], at });
  };

  /* ---------- our pole ---------- */
  // A green steel pole with a crossbar holds the far pulley.
  const [px, py, pz] = anchors.b;
  C.push({ p: [px + 0.06, py / 2, pz], s: [0.04, py + 0.15, 0.04], c: col([0.4, 0.07, 150]) });
  B.push({ p: [px + 0.06, py + 0.05, pz], s: [0.05, 0.05, 0.5], c: col([0.4, 0.07, 150]) });

  /* ---------- sheds and greenhouses ---------- */
  const plank = canvasTex(64, 64, (g) => {
    g.fillStyle = '#d0d0d0'; g.fillRect(0, 0, 64, 64);
    for (let x = 0; x < 64; x += 8) { g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(x, 0, 1, 64); g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(x + 1, 0, 1, 64); }
  }, true);
  const glass = new THREE.MeshStandardMaterial({ color: col([0.85, 0.02, 200]), roughness: 0.1, metalness: 0.1, transparent: true, opacity: 0.22, depthWrite: false });
  for (const p of plots) {
    const roll = R();
    if (p.ours || roll < 0.7) {
      // A pent-roof shed with a door and a small window.
      const w = 1.8 + R() * 1.2, d = 1.8 + R() * 0.8, h = 2.1 + R() * 0.3;
      const x = EX - d / 2 - 0.3, z = p.zc + (p.ours ? -0.6 : (R() - 0.5) * (PLOT - w - 0.4));
      const m = new THREE.Mesh(box, new THREE.MeshStandardMaterial({ map: plank, color: col(p.ours ? [0.42, 0.06, 150] : pick(R, SHED)), roughness: 0.9 }));
      m.position.set(x, h / 2, z); m.scale.set(d, h, w);
      m.castShadow = m.receiveShadow = true;
      group.add(m);
      B.push({ p: [x - 0.05, h + 0.12, z], s: [d + 0.35, 0.06, w + 0.3], r: [0, 0, 0.1], c: col([0.22, 0.01, 250]) });
      B.push({ p: [x - d / 2 - 0.01, 0.95, z + w * 0.18], s: [0.03, 1.85, 0.75], c: col([0.3, 0.04, 55]) });
      B.push({ p: [x - d / 2 - 0.01, 1.45, z - w * 0.25], s: [0.03, 0.5, 0.6], c: col([0.25, 0.02, 240]) });
    } else if (roll < 0.85) {
      // A glasshouse with white frames.
      const x = EX - 1.6, z = p.zc, w = 2.4, d = 2.2, h = 2.2;
      const gm = new THREE.Mesh(box, glass);
      gm.position.set(x, h / 2, z); gm.scale.set(d, h, w);
      group.add(gm);
      for (const dz of [-w / 2, 0, w / 2]) for (const dx of [-d / 2, d / 2]) B.push({ p: [x + dx, h / 2, z + dz], s: [0.04, h, 0.04], c: col([0.95, 0.01, 90]) });
      B.push({ p: [x, h, z], s: [d, 0.04, w], c: col([0.95, 0.01, 90]) });
    }
  }

  /* ---------- trees ---------- */
  // Our apple tree stands behind the line; neighbours keep birches and conifers.
  const tree = (x, z, kind, s = 1) => {
    if (kind === 'conifer') {
      C.push({ p: [x, 0.4 * s, z], s: [0.1 * s, 0.8 * s, 0.1 * s], c: col([0.3, 0.04, 50]) });
      G.push({ p: [x, 2.6 * s, z], s: [0.9 * s, 2.4 * s, 0.9 * s], c: col([0.33, 0.07, 160]), cone: true });
      return;
    }
    const birch = kind === 'birch', th = (birch ? 3.6 : 1.6) * s;
    C.push({ p: [x, th / 2, z], s: [0.09 * s, th, 0.09 * s], c: col(birch ? [0.88, 0.01, 90] : [0.32, 0.04, 50]) });
    const cr = (birch ? 1.1 : 1.4) * s, cy = th + cr * 0.6;
    for (let i = 0; i < 14; i++) {
      const a = R() * Math.PI * 2, u = R();
      B.push({ p: [x + Math.cos(a) * cr * u, cy + (R() - 0.4) * cr * 0.9, z + Math.sin(a) * cr * u], s: [0.55, 0.45, 0.55].map(v => v * cr * (0.6 + R() * 0.5)),
        c: col([(birch ? 0.6 : 0.48) + R() * 0.08, 0.12, birch ? 120 : 135]), ball: true });
    }
    if (kind === 'apple') for (let i = 0; i < 18; i++) {
      const a = R() * Math.PI * 2, u = 0.4 + R() * 0.6;
      B.push({ p: [x + Math.cos(a) * cr * u, cy + (R() - 0.3) * cr * 0.8, z + Math.sin(a) * cr * u], s: [0.06, 0.06, 0.06], c: col([0.55, 0.18, 30]), ball: true, small: true });
    }
  };
  tree(6.2, LINE_Z - 1.6, 'apple', 0.85);
  // Trees grow only behind the line, never in front of the camera.
  for (const p of plots) if (p.k < 0 && R() < 0.45) tree(HX + 6 + R() * 6, p.zc + (R() - 0.5) * 3, pick(R, ['apple', 'birch', 'conifer']), 0.8 + R() * 0.5);

  /* ---------- our terrace ---------- */
  // Two white plastic chairs and a round table on the slabs.
  const chair = (x, z, ry) => {
    const c = col([0.94, 0.01, 90]), cs = Math.cos(ry), sn = Math.sin(ry);
    const at = (dx, dz) => [x + dx * cs + dz * sn, z - dx * sn + dz * cs];
    const c0 = at(0, 0);
    B.push({ p: [c0[0], 0.44, c0[1]], s: [0.44, 0.04, 0.44], r: [0, ry, 0], c });
    const bk = at(-0.22, 0);
    B.push({ p: [bk[0], 0.72, bk[1]], s: [0.04, 0.55, 0.42], r: [0, ry, 0.12], c });
    for (const [dx, dz] of [[-0.19, -0.19], [-0.19, 0.19], [0.19, -0.19], [0.19, 0.19]]) {
      const l = at(dx, dz);
      C.push({ p: [l[0], 0.22, l[1]], s: [0.018, 0.44, 0.018], c });
    }
  };
  chair(-3.3, 1.6, 0.4); chair(-2.2, 2.2, -2.2);
  C.push({ p: [-2.7, 0.7, 1.95], s: [0.4, 0.03, 0.4], c: col([0.94, 0.01, 90]) });
  C.push({ p: [-2.7, 0.35, 1.95], s: [0.03, 0.7, 0.03], c: col([0.94, 0.01, 90]) });
  // A kettle barbecue: a black bowl with a lid on three legs.
  B.push({ p: [-3.4, 0.82, -2.0], s: [0.28, 0.22, 0.28], c: col([0.15, 0.01, 250]), ball: true });
  for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI * 2; C.push({ p: [-3.4 + Math.cos(a) * 0.18, 0.35, -2.0 + Math.sin(a) * 0.18], s: [0.012, 0.7, 0.012], c: col([0.3, 0.01, 250]) }); }
  // A bicycle leans on the house wall.
  const wheel = new THREE.TorusGeometry(0.34, 0.025, 6, 24);
  for (const dz of [0.55, -0.5]) {
    const w = new THREE.Mesh(wheel, new THREE.MeshStandardMaterial({ color: 0x1a1a1c, roughness: 0.6 }));
    w.position.set(HX + 0.25, 0.36, 2.2 + dz); w.rotation.y = Math.PI / 2 + 0.05; w.rotation.z = 0.08;
    w.castShadow = true; group.add(w);
  }
  B.push({ p: [HX + 0.27, 0.62, 2.2], s: [0.04, 0.04, 0.95], r: [0.35, 0, 0], c: col([0.45, 0.14, 255]) });
  B.push({ p: [HX + 0.27, 0.95, 1.85], s: [0.04, 0.04, 0.5], c: col([0.2, 0.01, 250]) });
  // Pots of geraniums along the terrace edge.
  const pots = [], blooms = [];
  for (let i = 0; i < 6; i++) {
    const x = -1.4 + (R() - 0.5) * 0.4, z = -2.4 + i * 0.9;
    if (Math.abs(z - LINE_Z) < 0.4) continue;
    pots.push({ p: [x, 0.13, z], s: [0.14, 0.26, 0.14], c: col([0.58, 0.11, 45]) });
    B.push({ p: [x, 0.38, z], s: [0.2, 0.15, 0.2], c: col([0.45, 0.11, 140]), ball: true });
    const fc = col(pick(R, FLOWER));
    for (let k = 0; k < 6; k++) blooms.push({ p: [x + (R() - 0.5) * 0.3, 0.48 + R() * 0.06, z + (R() - 0.5) * 0.3], s: [0.04, 0.035, 0.04], c: fc });
  }
  // Roses along the fence, a compost bin by the shed.
  for (let i = 0; i < 5; i++) {
    const x = -1 + i * 1.4, z = -2.5;
    B.push({ p: [x, 0.45, z], s: [0.4, 0.4, 0.3], c: col([0.42, 0.1, 140]), ball: true });
    for (let k = 0; k < 7; k++) blooms.push({ p: [x + (R() - 0.5) * 0.6, 0.45 + R() * 0.4, z + 0.2], s: [0.06, 0.05, 0.06], c: col([0.6, 0.17, 10]) });
  }
  B.push({ p: [EX - 3.6, 0.45, 2.1], s: [0.75, 0.9, 0.75], c: col([0.32, 0.06, 150]) });

  /* ---------- neighbours ---------- */
  // A rotary dryer with washing, a trampoline, a slide, a gnome, a cat.
  const nb = plots.filter(p => !p.ours && p.k < 0).sort((a, b) => b.k - a.k);
  {
    const p = nb[0], x = 1.6, z = p.zc;
    C.push({ p: [x, 1.0, z], s: [0.03, 2.0, 0.03], c: col([0.75, 0.01, 250]) });
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + 0.3;
      B.push({ p: [x + Math.cos(a) * 0.8, 1.9, z + Math.sin(a) * 0.8], s: [1.6, 0.025, 0.025], r: [0, -a, -0.08], c: col([0.75, 0.01, 250]) });
      const w = 0.5 + R() * 0.5, h = 0.4 + R() * 0.5, d = 0.4 + R() * 0.8;
      glowCloth(x + Math.cos(a) * d, 1.9 - h / 2 - 0.02, z + Math.sin(a) * d, w, h, pick(R, WASH), -a + Math.PI / 2);
    }
  }
  {
    const p = nb[2], x = 2.2, z = p.zc;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.12, 8, 32), new THREE.MeshStandardMaterial({ color: col([0.55, 0.14, 255]), roughness: 0.7 }));
    ring.rotation.x = Math.PI / 2; ring.position.set(x, 0.85, z); ring.castShadow = true; group.add(ring);
    const mat = new THREE.Mesh(new THREE.CircleGeometry(1.4, 32), new THREE.MeshStandardMaterial({ color: 0x111113, roughness: 0.9, side: THREE.DoubleSide }));
    mat.rotation.x = -Math.PI / 2; mat.position.set(x, 0.82, z); group.add(mat);
    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; C.push({ p: [x + Math.cos(a) * 1.5, 0.42, z + Math.sin(a) * 1.5], s: [0.03, 0.84, 0.03], c: col([0.6, 0.01, 250]) }); }
  }
  {
    const p = nb[3], x = 0.5, z = p.zc + 1;
    B.push({ p: [x, 0.65, z], s: [2.1, 0.06, 0.45], r: [0, 0, -0.55], c: col([0.62, 0.16, 30]) });
    B.push({ p: [x + 0.95, 0.75, z], s: [0.06, 1.5, 0.5], c: col([0.7, 0.14, 95]) });
  }
  {
    // A static line of washing along a neighbour's fence.
    const p = nb[4], z = p.zc - 0.8;
    C.push({ p: [-1, 0.95, z], s: [0.03, 1.9, 0.03], c: col([0.5, 0.01, 250]) });
    C.push({ p: [4.5, 0.95, z], s: [0.03, 1.9, 0.03], c: col([0.5, 0.01, 250]) });
    for (let x = -0.7; x < 4.1; ) {
      const w = 0.4 + R() * 0.7, h = 0.4 + R() * 0.6;
      glowCloth(x + w / 2, 1.85 - h / 2, z, w, h, pick(R, WASH), (R() - 0.5) * 0.3);
      x += w + 0.1 + R() * 0.3;
    }
  }
  // A gnome on our lawn and a cat on the wall.
  B.push({ p: [0.6, 0.15, 2.4], s: [0.1, 0.3, 0.1], c: col([0.5, 0.14, 255]) });
  G.push({ p: [0.6, 0.38, 2.4], s: [0.09, 0.2, 0.09], c: col([0.55, 0.2, 28]), cone: true });
  B.push({ p: [HX + 3.2, 2.08, -PLOT / 2], s: [0.35, 0.16, 0.14], c: col([0.25, 0.02, 60]), ball: true });
  B.push({ p: [HX + 3.48, 2.22, -PLOT / 2], s: [0.09, 0.09, 0.09], c: col([0.25, 0.02, 60]), ball: true });
  B.push({ p: [HX + 2.9, 2.1, -PLOT / 2 + 0.08], s: [0.2, 0.025, 0.025], r: [0, 0, 0.6], c: col([0.25, 0.02, 60]) });

  /* ---------- the next street ---------- */
  // Its backs face us across their own gardens.
  const backs = canvasTex(256, 128, (g) => {
    g.fillStyle = '#c8c8c8'; g.fillRect(0, 0, 256, 128);
    for (let i = 0; i < 8; i++) for (const y of [24, 76]) { g.fillStyle = '#3b3e46'; g.fillRect(i * 32 + 9, y, 14, 22); }
  }, true);
  for (let z = 30; z > -140; ) {
    const w = 5.2 + R() * 1.2, h = 6 + R() * 2.5, x = EX + 26 + R() * 2;
    const m = new THREE.Mesh(box, new THREE.MeshStandardMaterial({ map: backs, color: col(R() < 0.85 ? [0.62, 0.08, 35] : [0.9, 0.01, 90]), roughness: 0.95 }));
    m.position.set(x + 4, h / 2, z - w / 2); m.scale.set(8, h, w);
    m.castShadow = m.receiveShadow = true;
    group.add(m);
    B.push({ p: [x + 2, h + 1.6, z - w / 2], s: [4.5, 0.1, w], r: [0, 0, -0.62], c: col([0.34, 0.04, 40]) });
    if (R() < 0.5) tree(x - 6 - R() * 8, z - w / 2, pick(R, ['apple', 'birch', 'conifer']), 1 + R() * 0.6);
    z -= w;
  }

  /* ---------- horizon ---------- */
  // A brick church tower with a slate spire, poplars along the fields.
  const T = new THREE.Group(), brick = new THREE.MeshStandardMaterial({ color: col([0.5, 0.08, 40]), roughness: 0.95 });
  const add = (geo, mat, y, sx = 1, sy = 1, sz = 1) => { const m = new THREE.Mesh(geo, mat); m.position.y = y; m.scale.set(sx, sy, sz); T.add(m); };
  add(box, brick, 18, 8, 36, 8);
  add(box, brick, 36.6, 9, 1.2, 9);
  add(new THREE.CylinderGeometry(3.2, 3.6, 7, 8), brick, 40.5);
  add(new THREE.ConeGeometry(3.4, 22, 8), new THREE.MeshStandardMaterial({ color: col([0.3, 0.02, 250]), roughness: 0.5 }), 55);
  for (let k = 0; k < 4; k++) {
    const o = new THREE.Mesh(box, new THREE.MeshStandardMaterial({ color: 0x15130f }));
    o.scale.set(1.6, 4, 0.5);
    o.position.set(Math.sin((k * Math.PI) / 2) * 4.05, 30, Math.cos((k * Math.PI) / 2) * 4.05);
    o.rotation.y = (k * Math.PI) / 2;
    T.add(o);
  }
  T.position.set(-60, 0, -380);
  group.add(T);
  for (let i = 0; i < 26; i++) {
    const x = 160 + i * 14 + R() * 6, z = -420 + (R() - 0.5) * 40, h = 22 + R() * 8;
    G.push({ p: [x, h / 2, z], s: [2.6, h, 2.6], c: col([0.4 + R() * 0.05, 0.08, 135]), ell: true });
  }
  for (let i = 0; i < 18; i++) {
    const x = -140 - i * 13, z = -360 + (R() - 0.5) * 50, h = 20 + R() * 8;
    G.push({ p: [x, h / 2, z], s: [2.6, h, 2.6], c: col([0.42 + R() * 0.05, 0.08, 135]), ell: true });
  }

  /* ---------- draw the parts ---------- */
  inst(group, box, paint(0.85), B.filter(b => !b.ball));
  inst(group, ball, paint(0.85), B.filter(b => b.ball && !b.small));
  inst(group, ball, paint(0.5), B.filter(b => b.small), false);
  inst(group, cyl, paint(0.6), C);
  inst(group, new THREE.ConeGeometry(1, 1, 10), paint(0.9), G.filter(g => g.cone));
  inst(group, new THREE.SphereGeometry(0.5, 10, 12), paint(0.95), G.filter(g => g.ell));
  inst(group, cyl, paint(0.9), pots);
  inst(group, ball, paint(0.6), blooms, false);
}
