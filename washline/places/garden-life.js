// Garden life: vegetable patches, a chicken run, a pigeon loft, a swing,
// a parasol, borders, paths, our washing basket and pylons over the fields.
import * as THREE from 'three';
import { col, pick, inst, paint, canvasTex } from './kit.js';

const BLOOM = [[0.62, 0.2, 25], [0.75, 0.16, 330], [0.85, 0.15, 95], [0.6, 0.15, 290], [0.95, 0.01, 90], [0.7, 0.17, 50]];

export function gardenLife(group, R, { HX, EX, PLOT, LINE_Z, plots }) {
  const B = [], C = [], O = [], soil = [], paths = [];
  const nb = plots.filter(p => p.k < 0).sort((a, b) => b.k - a.k);
  const cyl = (x, y, z, r, h, c, rot) => C.push({ p: [x, y, z], s: [r, h, r], r: rot, c: col(c) });

  /* ---------- vegetables ---------- */
  // Rows of leeks and cabbages, and bean poles in tepees.
  const patch = (p, x0, x1) => {
    const z0 = p.zc - 1.6, z1 = p.zc + 1.2;
    soil.push({ p: [(x0 + x1) / 2, 0.03, (z0 + z1) / 2], s: [x1 - x0, 0.06, z1 - z0], c: col([0.38, 0.04, 55]) });
    for (let z = z0 + 0.3, row = 0; z < z1 - 0.1; z += 0.5, row++) {
      const kind = row % 3;
      for (let x = x0 + 0.25; x < x1 - 0.1; x += kind === 1 ? 0.45 : 0.22) {
        if (kind === 1) O.push({ p: [x, 0.17, z], s: [0.16, 0.13, 0.16], c: col([0.55, 0.08, 165]) });
        else for (let k = 0; k < 3; k++) cyl(x + (R() - 0.5) * 0.06, 0.22, z + (R() - 0.5) * 0.06, 0.012, 0.38, [0.55, 0.13, 135], [(R() - 0.5) * 0.3, 0, (R() - 0.5) * 0.3]);
      }
    }
    const tx = x1 - 0.5, tz = z1 - 0.4;
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      cyl(tx + Math.cos(a) * 0.3, 1.0, tz + Math.sin(a) * 0.3, 0.015, 2.1, [0.45, 0.05, 60], [Math.sin(a) * 0.15, 0, -Math.cos(a) * 0.15]);
      for (let h = 0.3; h < 1.8; h += 0.35) O.push({ p: [tx + Math.cos(a) * 0.3 * (1 - h / 2.1), h, tz + Math.sin(a) * 0.3 * (1 - h / 2.1)], s: [0.11, 0.12, 0.11], c: col([0.5, 0.13, 140]) });
    }
  };

  /* ---------- the neighbours, plot by plot ---------- */
  nb.forEach((p, i) => {
    const pick5 = i < 6 ? ['patch', 'chickens', 'border', 'swing', 'barrow', 'pigeons'][i] : pick(R, ['patch', 'parasol', 'goal', 'barrow', 'none']);
    if (pick5 === 'patch') patch(p, 3.2, 5.9);
    if (pick5 === 'chickens') {
      // A wooden coop on legs beside a wire run, hens pecking inside.
      const x = 3.2, z = p.zc;
      B.push({ p: [x, 0.85, z], s: [1.0, 0.9, 1.2], c: col([0.5, 0.06, 55]) });
      B.push({ p: [x, 1.35, z], s: [1.2, 0.06, 1.4], r: [0, 0, 0.15], c: col([0.25, 0.01, 250]) });
      for (const [dx, dz] of [[-0.4, -0.5], [0.4, -0.5], [-0.4, 0.5], [0.4, 0.5]]) cyl(x + dx, 0.2, z + dz, 0.03, 0.4, [0.4, 0.05, 55]);
      const mesh = canvasTex(64, 64, (g) => {
        g.strokeStyle = 'rgba(200,200,200,0.9)'; g.lineWidth = 1;
        for (let k = 0; k <= 64; k += 8) { g.beginPath(); g.moveTo(k, 0); g.lineTo(k, 64); g.stroke(); g.beginPath(); g.moveTo(0, k); g.lineTo(64, k); g.stroke(); }
      }, true);
      mesh.repeat.set(6, 3);
      const run = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.2, 1.8), new THREE.MeshStandardMaterial({ map: mesh, transparent: true, alphaTest: 0.3, side: THREE.DoubleSide, roughness: 0.6 }));
      run.position.set(x + 1.8, 0.6, z);
      group.add(run);
      for (let h = 0; h < 4; h++) {
        const hx = x + 1.1 + R() * 1.4, hz = z + (R() - 0.5) * 1.2, ry = R() * 6, brown = R() < 0.5;
        O.push({ p: [hx, 0.2, hz], s: [0.17, 0.13, 0.12], r: [0, ry, 0.2], c: col(brown ? [0.5, 0.1, 50] : [0.94, 0.01, 90]) });
        O.push({ p: [hx + Math.cos(ry) * 0.15, 0.3, hz - Math.sin(ry) * 0.15], s: [0.06, 0.07, 0.06], c: col(brown ? [0.5, 0.1, 50] : [0.94, 0.01, 90]) });
        B.push({ p: [hx + Math.cos(ry) * 0.15, 0.38, hz - Math.sin(ry) * 0.15], s: [0.05, 0.04, 0.015], r: [0, ry, 0], c: col([0.55, 0.2, 28]) });
      }
    }
    if (pick5 === 'swing') {
      // An A-frame swing with two seats.
      const x = 3.6, z = p.zc;
      for (const dz of [-1.0, 1.0]) for (const dx of [-0.6, 0.6]) cyl(x + dx / 2, 1.05, z + dz, 0.05, 2.2, [0.45, 0.06, 55], [0, 0, dx > 0 ? -0.28 : 0.28]);
      cyl(x, 2.1, z, 0.06, 2.2, [0.45, 0.06, 55], [Math.PI / 2, 0, 0]);
      for (const dz of [-0.45, 0.45]) {
        for (const k of [-0.18, 0.18]) cyl(x, 1.3, z + dz + k, 0.008, 1.6, [0.7, 0.02, 80]);
        B.push({ p: [x, 0.5, z + dz], s: [0.22, 0.04, 0.45], c: col([0.6, 0.17, 30]) });
      }
    }
    if (pick5 === 'pigeons') {
      // A pigeon loft on legs, a landing board, birds on the roof.
      const x = 5.2, z = p.zc;
      B.push({ p: [x, 1.6, z], s: [1.4, 1.6, 2.6], c: col([0.88, 0.02, 85]) });
      B.push({ p: [x - 0.1, 2.48, z], s: [1.7, 0.08, 2.9], r: [0, 0, 0.12], c: col([0.3, 0.02, 250]) });
      for (const dz of [-0.9, 0, 0.9]) B.push({ p: [x - 0.72, 2.0, z + dz], s: [0.04, 0.22, 0.3], c: col([0.12, 0.01, 250]) });
      B.push({ p: [x - 0.85, 1.85, z], s: [0.3, 0.04, 2.4], c: col([0.5, 0.05, 55]) });
      for (const [dx, dz] of [[-0.5, -1.1], [0.5, -1.1], [-0.5, 1.1], [0.5, 1.1]]) cyl(x + dx, 0.4, z + dz, 0.05, 0.8, [0.4, 0.04, 55]);
      for (let k = 0; k < 7; k++) {
        const bz = z - 1.2 + R() * 2.4;
        O.push({ p: [x - 0.3 + R() * 0.6, 2.6 + R() * 0.04, bz], s: [0.09, 0.07, 0.06], r: [0, R() * 6, 0], c: col([0.5 + R() * 0.1, 0.02, 250]) });
      }
    }
    if (pick5 === 'parasol') {
      const x = HX + p.ext + 2, z = p.zc;
      cyl(x, 1.2, z, 0.025, 2.4, [0.9, 0.01, 90]);
      O.push({ p: [x, 2.35, z], s: [1.3, 0.3, 1.3], c: col(pick(R, [[0.6, 0.16, 28], [0.88, 0.08, 95], [0.5, 0.1, 255]])), cone: true });
      cyl(x, 0.72, z, 0.45, 0.04, [0.9, 0.01, 90]);
    }
    if (pick5 === 'goal') {
      const x = 5.6, z = p.zc;
      for (const dz of [-0.9, 0.9]) cyl(x, 0.6, z + dz, 0.035, 1.2, [0.95, 0.01, 90]);
      cyl(x, 1.2, z, 0.035, 1.8, [0.95, 0.01, 90], [Math.PI / 2, 0, 0]);
      O.push({ p: [x - 1.5, 0.11, z + 0.4], s: [0.11, 0.11, 0.11], c: col([0.95, 0.01, 90]) });
    }
    if (pick5 === 'barrow') {
      const x = 4.2, z = p.zc + 0.8;
      B.push({ p: [x, 0.45, z], s: [0.8, 0.3, 0.55], r: [0, 0.4, 0.08], c: col([0.45, 0.1, 150]) });
      const w = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.05, 6, 16), new THREE.MeshStandardMaterial({ color: 0x1b1b1d }));
      w.position.set(x + 0.45, 0.2, z - 0.2); w.rotation.y = 0.4; w.castShadow = true; group.add(w);
    }
    // A border of flowers along one fence, a concrete path to the shed.
    const bz = p.z1 - 0.45;
    for (let x = HX + 4.5; x < EX - 2.8; x += 0.32) {
      O.push({ p: [x, 0.25, bz + (R() - 0.5) * 0.2], s: [0.22, 0.24, 0.2], c: col([0.45 + R() * 0.08, 0.11, 140]) });
      if (R() < 0.7) O.push({ p: [x + (R() - 0.5) * 0.2, 0.42 + R() * 0.12, bz + (R() - 0.5) * 0.2], s: [0.07, 0.06, 0.07], c: col(pick(R, BLOOM)) });
    }
    if (R() < 0.6) paths.push({ p: [(HX + p.ext + 3 + EX - 2.5) / 2, 0.025, p.zc + 1.6], s: [EX - 2.5 - HX - p.ext - 3, 0.02, 0.6], c: col([0.7, 0.01, 80]) });
  });

  /* ---------- our terrace ---------- */
  // A wicker basket of washing waits by the back door.
  B.push({ p: [-2.4, 0.18, LINE_Z + 0.9], s: [0.62, 0.34, 0.44], c: col([0.66, 0.08, 75]) });
  for (let k = 0; k < 6; k++) O.push({ p: [-2.6 + R() * 0.4, 0.38, LINE_Z + 0.75 + R() * 0.3], s: [0.16, 0.08, 0.14], c: col(pick(R, [[0.95, 0.01, 90], [0.55, 0.09, 255], [0.85, 0.1, 95]])) });

  /* ---------- pylons ---------- */
  // Lattice towers stride across the fields; cables sag between them.
  const towers = [[95, -260], [160, -335], [225, -410], [290, -485], [355, -560]];
  const tips = [];
  for (const [x, z] of towers) {
    const h = 42;
    for (const [dx, dz] of [[-3, -3], [3, -3], [-3, 3], [3, 3]]) cyl(x + dx / 2, h / 2, z + dz / 2, 0.25, h, [0.6, 0.01, 250], [dz * 0.035, 0, -dx * 0.035]);
    for (const [y, w] of [[h * 0.62, 18], [h * 0.8, 14], [h * 0.95, 9]]) {
      B.push({ p: [x, y, z], s: [w, 0.5, 0.8], r: [0, 0.75, 0], c: col([0.6, 0.01, 250]) });
      tips.push([x, y, z, w]);
    }
    for (let y = 4; y < h * 0.6; y += 5) B.push({ p: [x, y, z], s: [3.6 - y * 0.05, 0.25, 3.6 - y * 0.05], c: col([0.6, 0.01, 250]) });
  }
  const pts = [];
  for (let i = 0; i + 3 < tips.length; i++) {
    const a = tips[i], b = tips[i + 3];
    for (const side of [-0.45, 0.45]) {
      const ax = a[0] + Math.cos(0.75) * a[3] * side, az = a[2] - Math.sin(0.75) * a[3] * side;
      const bx = b[0] + Math.cos(0.75) * b[3] * side, bz2 = b[2] - Math.sin(0.75) * b[3] * side;
      for (let k = 0; k < 16; k++) {
        for (const t of [k / 16, (k + 1) / 16]) pts.push(ax + (bx - ax) * t, a[1] - 0.3 + (b[1] - a[1]) * t - 9 * 4 * t * (1 - t), az + (bz2 - az) * t);
      }
    }
  }
  const cg = new THREE.BufferGeometry();
  cg.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  group.add(new THREE.LineSegments(cg, new THREE.LineBasicMaterial({ color: 0x5b6068 })));

  /* ---------- draw the parts ---------- */
  const box = new THREE.BoxGeometry(1, 1, 1), ball = new THREE.IcosahedronGeometry(1, 1);
  inst(group, box, paint(0.95), soil, false);
  inst(group, box, paint(0.9), paths, false);
  inst(group, box, paint(0.8), B);
  inst(group, new THREE.CylinderGeometry(1, 1, 1, 8), paint(0.7), C);
  inst(group, ball, paint(0.85), O.filter(o => !o.cone));
  inst(group, new THREE.ConeGeometry(1, 1, 12), paint(0.8), O.filter(o => o.cone));
}
