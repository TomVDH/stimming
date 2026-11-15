// Garden houses in relief: gutters, downpipes, gable upstands, dormers,
// roof windows, shutter boxes, window surrounds, dishes, lamps, verandas.
import * as THREE from 'three';
import { col, pick, inst, paint, quad } from './kit.js';

// The roof rises 3.45 m over 4.75 m, from the gutter to the ridge.
const RUN = 4.75, RISE = 3.45, SLOPE = Math.atan2(RISE, RUN), PITCH = Math.hypot(RUN, RISE);
const ZINC = [0.66, 0.01, 250];

export function houseRelief(group, R, { HX, PLOT, LINE_Z, plots }) {
  const B = [], C = [], glass = [], lamps = [];
  const roofAt = (p, t) => [HX + 0.35 - RUN * t, p.eave + 0.05 + RISE * t];
  for (const p of plots) {
    const trim = col(R() < 0.6 ? [0.94, 0.01, 90] : [0.32, 0.02, 250]);
    // A zinc gutter runs along the eave; a downpipe drops at one end.
    C.push({ p: [HX + 0.42, p.eave - 0.02, p.zc], s: [0.075, PLOT, 0.075], r: [Math.PI / 2, 0, 0], c: col(ZINC) });
    const pz = R() < 0.5 ? p.z0 + 0.25 : p.z1 - 0.25, foot = p.ext ? 3.05 : 0;
    C.push({ p: [HX + 0.1, (p.eave + foot) / 2, pz], s: [0.045, p.eave - foot, 0.045], c: col(ZINC) });
    C.push({ p: [HX + 0.26, p.eave - 0.18, pz], s: [0.045, 0.4, 0.045], r: [0, 0, 1.1], c: col(ZINC) });
    if (!p.ext && R() < 0.45) C.push({ p: [HX + 0.35, 0.45, pz], s: [0.3, 0.9, 0.3], c: col(R() < 0.6 ? [0.42, 0.09, 150] : [0.2, 0.01, 250]) });
    // A brick upstand marks the party wall up the roof.
    const [mx, my] = roofAt(p, 0.5);
    B.push({ p: [mx, my + 0.12, p.z0], s: [PITCH + 0.2, 0.32, 0.24], r: [0, 0, -SLOPE], c: col([p.brick[0] - 0.06, p.brick[1], p.brick[2]]) });
    // Upper windows: shutter boxes and stone surrounds stand off the wall.
    const ups = p.ours ? [LINE_Z - 0.9] : [p.zc + PLOT / 4, p.zc - PLOT / 4];
    for (const z of ups) {
      if (R() < 0.5 || p.ours) B.push({ p: [HX + 0.07, 4.84, z], s: [0.14, 0.22, 1.18], c: trim });
      for (const k of [-1, 1]) B.push({ p: [HX + 0.03, 4.0, z + k * 0.55], s: [0.06, 1.48, 0.1], c: trim });
      B.push({ p: [HX + 0.03, 4.74, z], s: [0.06, 0.08, 1.2], c: trim });
    }
    // A wall lamp lights the back door.
    if (!p.ext) {
      const dz = p.ours ? LINE_Z + 1.4 : p.zc + PLOT / 4;
      B.push({ p: [HX + 0.08, 2.45, dz + 0.7], s: [0.12, 0.2, 0.12], c: col([0.2, 0.01, 250]) });
      lamps.push({ p: [HX + 0.08, 2.32, dz + 0.7], s: [0.1, 0.12, 0.1] });
    }
    // Dormers, roof windows, a dish, an aerial.
    if (!p.ours && R() < 0.35) {
      const [dx, dy] = roofAt(p, 0.34), dz = p.zc + (R() - 0.5) * 1.2;
      const clad = col(R() < 0.5 ? [0.3, 0.02, 250] : [0.9, 0.01, 90]);
      B.push({ p: [dx, dy + 0.62, dz], s: [1.6, 1.3, 1.7], c: clad });
      B.push({ p: [dx + 0.05, dy + 1.32, dz], s: [1.8, 0.1, 1.9], c: col([0.25, 0.01, 250]) });
      glass.push({ p: [dx + 0.81, dy + 0.62, dz], s: [0.04, 0.8, 1.1] });
    }
    if (R() < 0.3) {
      const [vx, vy] = roofAt(p, 0.55), vz = p.zc + (R() - 0.5) * 2.4;
      B.push({ p: [vx, vy + 0.04, vz], s: [0.84, 0.07, 1.0], r: [0, 0, -SLOPE], c: col([0.3, 0.01, 250]) });
      glass.push({ p: [vx, vy + 0.08, vz], s: [0.7, 0.03, 0.86], r: [0, 0, -SLOPE] });
    }
    if (R() < 0.22) {
      const dz = p.zc + (R() - 0.5) * 3, y = p.eave - 0.9;
      C.push({ p: [HX + 0.2, y, dz], s: [0.02, 0.4, 0.02], r: [0, 0, Math.PI / 2], c: col([0.5, 0.01, 250]) });
      B.push({ p: [HX + 0.42, y + 0.1, dz], s: [0.08, 0.6, 0.6], r: [0, 0, -0.5], c: col([0.88, 0.01, 250]), dish: true });
    }
    if (R() < 0.3) {
      const [ax, ay] = roofAt(p, 0.98), az = p.zc + (R() - 0.5) * 2;
      C.push({ p: [ax, ay + 1.1, az], s: [0.025, 2.2, 0.025], c: col([0.55, 0.01, 250]) });
      for (const h of [1.7, 2.0]) C.push({ p: [ax, ay + h, az], s: [0.015, 1.2, 0.015], r: [Math.PI / 2, 0, 0], c: col([0.55, 0.01, 250]) });
    }
    // Some houses without an extension keep a veranda instead.
    if (!p.ours && !p.ext && p.k < 0 && R() < 0.4) {
      const d = 3.2, z0 = p.z0 + 0.2, z1 = p.z1 - 0.2;
      for (const z of [z0, z1, (z0 + z1) / 2]) C.push({ p: [HX + d, 1.2, z], s: [0.05, 2.4, 0.05], c: col([0.3, 0.01, 250]) });
      B.push({ p: [HX + d, 2.42, p.zc], s: [0.1, 0.1, z1 - z0], c: col([0.3, 0.01, 250]) });
      for (let z = z0; z <= z1 + 0.01; z += (z1 - z0) / 6) B.push({ p: [HX + d / 2, 2.67, z], s: [Math.hypot(d, 0.5), 0.05, 0.05], r: [0, 0, -Math.atan2(0.5, d)], c: col([0.3, 0.01, 250]) });
      const roof = new THREE.Mesh(quad([HX, 2.92, z1], [HX, 2.92, z0], [HX + d, 2.42, z1], [HX + d, 2.42, z0]),
        new THREE.MeshStandardMaterial({ color: col([0.94, 0.01, 90]), roughness: 0.4, transparent: true, opacity: 0.45, side: THREE.DoubleSide, depthWrite: false }));
      roof.castShadow = true;
      group.add(roof);
    }
  }
  const box = new THREE.BoxGeometry(1, 1, 1);
  inst(group, box, paint(0.8), B.filter(b => !b.dish));
  inst(group, new THREE.SphereGeometry(0.5, 14, 8, 0, Math.PI * 2, 0, 1.1), paint(0.4, 0.3), B.filter(b => b.dish));
  // Weathered zinc: matte, so the gutters never glare.
  inst(group, new THREE.CylinderGeometry(1, 1, 1, 8), paint(0.75, 0.15), C);
  inst(group, box, new THREE.MeshStandardMaterial({ color: col([0.25, 0.02, 240]), roughness: 0.1, metalness: 0.3 }), glass, false);
  inst(group, box, new THREE.MeshStandardMaterial({ color: col([0.9, 0.08, 80]), emissive: col([0.85, 0.12, 75]), emissiveIntensity: 1.6 }), lamps, false);
}
