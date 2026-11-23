// Pomegranate: a leathery red ball with a crown; ruby arils in pith chambers.
// Each aril is a juice bead with a pale seed inside, seen through the juice.
import * as THREE from 'three';
import { bedMesh, beadMesh } from './half.js';

const A = 0.8, B = 0.86, C = 0.86;
const CH = 6;

// The pith: a lumpy middle and six wavy walls out to the rind.
// JS and GLSL share these numbers, so the arils keep off the pith.
const pithR = a => 0.15 + 0.035 * Math.sin(3 * a + 0.7);
const wallA = (i, r) => (i / CH) * Math.PI * 2 + 0.12 * Math.sin(r * 5 + i * 1.7);
function inPith(r, a, pad = 0) {
  if (r < pithR(a) + pad) return true;
  for (let i = 0; i < CH; i++) {
    let d = Math.abs(((a - wallA(i, r)) % (Math.PI * 2) + Math.PI * 3) % (Math.PI * 2) - Math.PI);
    if (d * r < 0.02 + pad) return true;
  }
  return false;
}

const BED = /* glsl */`
float relief(vec2 f) { return 0.0012 * vn(vec3(f * 70.0, 1.0)); }
float pithR(float a) { return 0.15 + 0.035 * sin(3.0 * a + 0.7); }
vec3 bed(vec2 f, float r, float a, inout float glow) {
  // Deep juice between the arils.
  vec3 col = vec3(0.09, 0.003, 0.008);
  // Pith: a spongy cream, in the middle and in six wavy walls.
  float wall = 1.0;
  for (int i = 0; i < ${CH}; i++) {
    float wa = float(i) / ${CH}.0 * 6.2832 + 0.12 * sin(r * 5.0 + float(i) * 1.7);
    float d = abs(mod(a - wa + 9.4248, 6.2832) - 3.1416) * r;
    wall = min(wall, d);
  }
  float pith = max(1.0 - smoothstep(pithR(a) - 0.01, pithR(a) + 0.01, r), 1.0 - smoothstep(0.013, 0.021, wall));
  vec3 cream = mix(vec3(0.58, 0.44, 0.22), vec3(0.70, 0.58, 0.32), vn(vec3(f * 30.0, 1.0)));
  col = mix(col, cream, pith);
  // The rind: pale pink inside, red skin at the edge.
  col = mix(col, mix(vec3(0.62, 0.36, 0.25), vec3(0.72, 0.5, 0.34), vn(vec3(f * 24.0, 3.0))), smoothstep(0.885, 0.9, r));
  col = mix(col, vec3(0.38, 0.03, 0.03), smoothstep(0.965, 0.975, r));
  glow = (1.0 - pith) * (1.0 - smoothstep(0.88, 0.9, r)) * 0.6;
  return col;
}`;

export const pomegranate = {
  id: 'pomegranate', label: 'Pomegranate', A, B, C,
  // A ball, a little flat at the ends.
  // A ball with five soft flats, a little flat at the ends.
  // The flats are even in the angle, so both halves meet at the seam.
  shape: (t, ph, e) => Math.pow(Math.max(0, 1 - t * t), 0.42) * (1 + e * t * 0.5) * (1 + 0.025 * Math.cos(5 * ph) * Math.sqrt(Math.max(0, 1 - t * t))),
  look: {
    skinA: [0.13, 0.005, 0.01], skinB: [0.32, 0.018, 0.022], mottle: 3.2,
    blush: [0.36, 0.1, 0.04], blushK: 0.35, blushDir: [0.2, -0.8, 0.4],
    pores: 0.025, poreScale: 26, rough: 0.32, f0: 0.045, wrap: 0.25, sss: [0.5, 0.06, 0.05],
    speck: [0.78, 55, 0.6], speckCol: [0.05, 0.008, 0.008],
    sheen: [0.06, 0.02, 0.02], tipDark: 0.3,
  },
  fuzz: { k: 0, root: [[0.18, 0.015, 0.015], [0.3, 0.03, 0.025]], tip: [0.45, 0.1, 0.07], trans: [0.6, 0.14, 0.1], len: 0.07, width: 1 },
  juice: [0.85, 0.05, 0.12],
  glow: 0.4,
  // The crown: a short tube with six sepals on the wide half; a stub on the other.
  tip(U, g, mat, e) {
    const x0 = -A * 0.98;
    if (e > 0) {
      const tube = new THREE.CylinderGeometry(0.15, 0.12, 0.16, 24, 1, true);
      tube.rotateZ(Math.PI / 2);
      tube.translate(x0 - 0.06, 0, 0);
      const parts = [tube];
      for (let i = 0; i < 6; i++) {
        const s = new THREE.ConeGeometry(0.055, 0.17, 10);
        // Each sepal leans out from the rim of the tube.
        s.translate(0, 0.085, 0);
        s.rotateX(0.75);
        s.translate(0, 0, 0.11);
        s.rotateZ(Math.PI / 2);
        s.rotateX((i / 6) * Math.PI * 2);
        s.translate(x0 - 0.13, 0, 0);
        parts.push(s);
      }
      for (const p of parts) g.add(new THREE.Mesh(p, mat));
      // The inside of the crown is dark.
      const hole = new THREE.CircleGeometry(0.13, 20);
      hole.rotateY(-Math.PI / 2);
      hole.translate(x0 - 0.13, 0, 0);
      g.add(new THREE.Mesh(hole, new THREE.MeshBasicMaterial({ color: 0x0a0202 })));
    } else {
      const n = new THREE.SphereGeometry(1, 16, 10);
      n.scale(0.03, 0.05, 0.05);
      n.translate(-A + 0.005, 0, 0);
      g.add(new THREE.Mesh(n, mat));
    }
  },
  face(U, g, R) {
    const bed = bedMesh(U, this, BED, { bumpK: 1 });
    g.add(bed);
    // Arils: darts thrown into the chambers, none on the pith.
    const ar = [];
    for (let k = 0; k < 20000 && ar.length < 230; k++) {
      const r = Math.sqrt(R()) * 0.86, a = R() * Math.PI * 2;
      const s = 0.05 + R() * 0.022;
      if (r + s * 0.7 > 0.88 || inPith(r, a, s * 0.55)) continue;
      const y = Math.cos(a) * r, z = Math.sin(a) * r;
      if (ar.some(o => (o.y - y) ** 2 + (o.z - z) ** 2 < ((o.s + s) * 0.86) ** 2)) continue;
      ar.push({ y, z, s, a });
    }
    const beads = ar.map(o => {
      const t = R();
      // Ruby to deep garnet; some arils a little paler.
      const col = [0.78 + t * 0.15, 0.008 + t * 0.025, 0.045 + t * 0.035];
      return { p: [-0.004 - R() * 0.01, o.y * B, o.z * C], ph: o.a + (R() - 0.5) * 0.8, yaw: (R() - 0.5) * 0.4, s: [0.055 + R() * 0.012, o.s * B * (1.05 + R() * 0.15), o.s * B * (0.85 + R() * 0.15)], col, sig: 0.4 + R() * 0.25, seed: 0.4 + R() * 0.12 };
    });
    const bm = beadMesh(U, beads, { seedCol: [0.6, 0.42, 0.34], wet: 1.1 });
    g.add(bm);
    return { bed, parts: [bed, bm] };
  },
};
