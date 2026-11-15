// East Van wires: creosote poles down the lane with crossarms, transformers
// and cobra-head lamps; power and phone lines sag pole to pole, and service
// drops loop to every house. Crows use the near spans as perches.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { col, inst, paint } from './kit.js';

export function laneWires(group, R, { LANE, LINE_Z, lots, anchors, groundY }) {
  const px = LANE + 0.7;
  const poles = [];
  for (let z = 30; z >= -150; z -= 30) poles.push({ z, y: groundY(z) });
  const C = [], B = [], lamps = [], tubes = [], perches = [];
  const wood = col([0.36, 0.04, 50]), steel = col([0.55, 0.01, 250]);

  // A sagging span from a to b, as a thin tube.
  const span = (a, b, sag, r, perch = false) => {
    const pts = [];
    for (let i = 0; i <= 12; i++) {
      const t = i / 12;
      pts.push(new THREE.Vector3(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t - sag * 4 * t * (1 - t), a[2] + (b[2] - a[2]) * t));
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    tubes.push(new THREE.TubeGeometry(curve, 24, r, 4, false));
    if (perch) perches.push(curve);
  };

  for (const p of poles) {
    const top = p.y + 12;
    // The pole: tapered wood, a crossarm, glass insulators.
    C.push({ p: [px, p.y + 6, p.z], s: [0.16, 12, 0.16], c: wood });
    B.push({ p: [px, top - 1, p.z], s: [2.6, 0.12, 0.12], c: wood });
    for (const dx of [-1.1, 0, 1.1]) C.push({ p: [px + dx, top - 0.85, p.z], s: [0.05, 0.18, 0.05], c: col([0.75, 0.05, 180]) });
    if (Math.round(p.z / 30) % 2 === 0) C.push({ p: [px + 0.4, top - 3.2, p.z], s: [0.3, 1.0, 0.3], c: steel });
    // A cobra-head lamp leans out over the lane.
    B.push({ p: [px - 1.0, p.y + 8, p.z], s: [2.0, 0.07, 0.07], r: [0, 0, 0.1], c: steel });
    B.push({ p: [px - 2.0, p.y + 8.05, p.z], s: [0.6, 0.15, 0.3], c: steel });
    lamps.push({ p: [px - 2.0, p.y + 7.96, p.z], s: [0.45, 0.04, 0.22] });
  }
  // Power along the crossarms, a neutral below, then the fat phone cable.
  for (let i = 0; i + 1 < poles.length; i++) {
    const a = poles[i], b = poles[i + 1], near = a.z > -70;
    for (const dx of [-1.1, 0, 1.1]) span([px + dx, a.y + 11.1, a.z], [px + dx, b.y + 11.1, b.z], 0.5, 0.011, near);
    span([px, a.y + 9.6, a.z], [px, b.y + 9.6, b.z], 0.6, 0.012, near);
    span([px - 0.15, a.y + 6.8, a.z], [px - 0.15, b.y + 6.8, b.z], 0.9, 0.024, near);
  }
  // Service drops loop from the nearest pole to each house and garage.
  for (const lot of lots) {
    if (lot.z < -100) continue;
    const pole = poles.reduce((m, p) => (Math.abs(p.z - lot.z) < Math.abs(m.z - lot.z) ? p : m));
    const from = [px, pole.y + 7.6, pole.z];
    if (lot.ours) span(from, [-LANE - 1.3, 5.9, LINE_Z - 4], 0.7, 0.012);
    else if (lot.house) span(from, [lot.house.x - lot.side * lot.house.d / 2, 5.2, lot.z + 1], 1.1, 0.011);
    if (lot.garage && R() < 0.4) span([px, pole.y + 6.6, pole.z], [lot.garage.x, lot.garage.h + 0.2, lot.z], 0.5, 0.01);
  }
  // The pulley hook on the near pole.
  const [hx, hy, hz] = anchors.b;
  B.push({ p: [hx + 0.12, hy + 0.05, hz], s: [0.24, 0.03, 0.03], c: steel });

  const wireMesh = new THREE.Mesh(mergeGeometries(tubes), new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.6 }));
  wireMesh.castShadow = true;
  group.add(wireMesh);
  inst(group, new THREE.CylinderGeometry(1, 1.2, 1, 10), paint(0.9), C);
  inst(group, new THREE.BoxGeometry(1, 1, 1), paint(0.7, 0.2), B);
  inst(group, new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: col([0.95, 0.06, 80]), emissive: col([0.9, 0.12, 70]), emissiveIntensity: 1.2 }), lamps, false);
  return { perches, tick() {} };
}
