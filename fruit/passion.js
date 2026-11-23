// Passion fruit: a wrinkled purple shell; a cavity of golden jelly sacs, a black seed in each.
// Each sac is a juice bead with a dark seed inside, seen through the jelly.
import * as THREE from 'three';
import { bedMesh, beadMesh, solidMaterial } from './half.js';

const A = 0.8, B = 0.74, C = 0.74;
const CAV = 0.74;

const BED = /* glsl */`
float relief(vec2 f) { return 0.0012 * vn(vec3(f * 60.0, 1.0)); }
vec3 bed(vec2 f, float r, float a, inout float glow) {
  // Dark golden juice at the bottom of the cavity.
  vec3 col = vec3(0.22, 0.1, 0.004) * (0.8 + 0.4 * vn(vec3(f * 12.0, 2.0)));
  // A thin yellow lining, then the spongy cream pith.
  col = mix(col, vec3(0.5, 0.42, 0.12), smoothstep(${(CAV - 0.01).toFixed(3)}, ${(CAV + 0.005).toFixed(3)}, r));
  col = mix(col, vec3(0.6, 0.55, 0.44) * (0.85 + 0.25 * vn(vec3(f * 45.0, 3.0))), smoothstep(${(CAV + 0.02).toFixed(3)}, ${(CAV + 0.04).toFixed(3)}, r));
  // The shell: purple at the edge.
  col = mix(col, vec3(0.16, 0.03, 0.1), smoothstep(0.955, 0.97, r));
  glow = (1.0 - smoothstep(${(CAV - 0.02).toFixed(3)}, ${CAV.toFixed(3)}, r)) * 0.7;
  return col;
}`;

export const passion = {
  id: 'passion', label: 'Passion fruit', A, B, C,
  shape: (t, ph, e) => Math.pow(Math.max(0, 1 - t * t), 0.5) * (1 + e * t * 0.2),
  look: {
    skinA: [0.05, 0.008, 0.035], skinB: [0.16, 0.035, 0.1], mottle: 3,
    blush: [0.2, 0.08, 0.06], blushK: 0.2, blushDir: [0, -1, 0],
    pores: 0.55, poreScale: 7, rough: 0.42, f0: 0.04, wrap: 0.25,
    speck: [0.8, 48, 0.65], speckCol: [0.45, 0.4, 0.38],
    sheen: [0.05, 0.03, 0.05], tipDark: 0.1,
  },
  fuzz: { k: 0, root: [[0.05, 0.01, 0.04], [0.15, 0.04, 0.1]], tip: [0.35, 0.25, 0.3], trans: [0.6, 0.4, 0.5], len: 0.07, width: 1 },
  juice: [0.98, 0.66, 0.08],
  glow: 0.6,
  tip(U, g, mat, e) {
    if (e > 0) {
      const st = new THREE.CylinderGeometry(0.02, 0.03, 0.08, 10);
      st.rotateZ(Math.PI / 2);
      st.translate(-A - 0.03, 0, 0);
      g.add(new THREE.Mesh(st, solidMaterial(U, { col: 'vec3(0.12, 0.13, 0.04)', rough: 0.6 })));
    }
  },
  face(U, g, R) {
    const bed = bedMesh(U, this, BED, { bumpK: 1, wet: 1.0 });
    g.add(bed);
    // The pulp: jelly sacs packed in the cavity, each round a seed.
    const sacs = [];
    for (let k = 0; k < 12000 && sacs.length < 75; k++) {
      const r = Math.sqrt(R()) * CAV, a = R() * Math.PI * 2;
      const s = 0.07 + R() * 0.035;
      if (r + s * 0.75 > CAV) continue;
      const y = Math.cos(a) * r, z = Math.sin(a) * r;
      if (sacs.some(o => (o.y - y) ** 2 + (o.z - z) ** 2 < ((o.s + s) * 0.82) ** 2)) continue;
      sacs.push({ y, z, s });
    }
    const beads = sacs.map(o => {
      const t = R();
      return { p: [-0.01 - R() * 0.015, o.y * B, o.z * C], ph: R() * 6.28, yaw: (R() - 0.5) * 0.6, s: [0.06 + R() * 0.02, o.s * B * (1.05 + R() * 0.2), o.s * B * (0.85 + R() * 0.15)], col: [0.97, 0.6 + t * 0.12, 0.04 + t * 0.03], sig: 0.45 + R() * 0.15, seed: 0.5 + R() * 0.1 };
    });
    const bm = beadMesh(U, beads, { seedCol: [0.015, 0.012, 0.01], wet: 1.2 });
    g.add(bm);
    return { bed, parts: [bed, bm] };
  },
};
