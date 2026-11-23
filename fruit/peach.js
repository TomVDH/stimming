// Peach: golden velvet with a red blush and a crease; gold flesh round a wrinkled stone.
// One half keeps the stone; the other shows the empty pit.
import * as THREE from 'three';
import { createNoise3D } from 'simplex-noise';
import { bedMesh, solidMaterial, rng } from './half.js';

const A = 0.82, B = 0.86, C = 0.84;
// The stone, in face units: half its height and width.
const SY = 0.3, SZ = 0.22;

// The flesh: gold, red streaks out from the stone, a thin skin at the edge.
const bedGLSL = pit => /* glsl */`
float relief(vec2 f) { float r = length(f), a = atan(f.y, f.x); return 0.0008 * vn(vec3(a * 60.0, r * 8.0, 2.0)) + 0.0006 * vn(vec3(f * 90.0, 3.0)); }
vec3 bed(vec2 f, float r, float a, inout float glow) {
  vec3 gold = mix(vec3(0.5, 0.17, 0.012), vec3(0.62, 0.27, 0.025), smoothstep(0.2, 0.9, r));
  // Fine fibres run out from the middle.
  gold *= 0.93 + 0.07 * sin(a * 90.0 + vn(vec3(f * 9.0, 1.0)) * 6.0);
  vec2 q = f / vec2(${SY.toFixed(2)}, ${SZ.toFixed(2)});
  float e = length(q);
  // Red near the stone, in streaks.
  float streak = smoothstep(0.4, 1.0, vn(vec3(a * 6.0, r * 4.0, 2.0)));
  vec3 col = mix(gold, vec3(0.42, 0.04, 0.025), (1.0 - smoothstep(1.0, 1.9 + streak * 0.6, e)) * 0.9);
  ${pit ? `// Round the hollow the flesh is torn and red.
  col = mix(col, vec3(0.3, 0.025, 0.015), (1.0 - smoothstep(1.0, 1.25, e)) * 0.8);` : ''}
  col = mix(col, vec3(0.55, 0.08, 0.03), smoothstep(0.955, 0.97, r));
  glow = smoothstep(0.5, 0.95, r) * (1.0 - smoothstep(0.95, 0.97, r));
  return col;
}`;

export const peach = {
  id: 'peach', label: 'Peach', A, B, C,
  // A round body; a crease runs down one side, and the tip comes to a small point.
  shape: (t, ph, e) => {
    const d = Math.atan2(Math.sin(ph), Math.cos(ph));
    const crease = 0.075 * Math.exp(-((d / 0.17) ** 2));
    return Math.pow(Math.max(0, 1 - t * t), 0.46) * (1 + e * t * 0.4) * (1 - crease);
  },
  look: {
    thru: [1.0, 0.45, 0.2], thruK: 2.2,
    skinA: [0.72, 0.33, 0.05], skinB: [0.86, 0.47, 0.09], mottle: 5,
    blush: [0.48, 0.025, 0.02], blushK: 0.9, blushDir: [0.25, 0.85, 0.45],
    pores: 0.04, poreScale: 40, rough: 0.8, f0: 0.03, wrap: 0.45, sss: [0.9, 0.35, 0.15],
    speck: [0.8, 70, 0.7], speckCol: [0.7, 0.36, 0.1],
    sheen: [0.5, 0.3, 0.2], tipDark: 0,
  },
  fuzz: { k: 0.35, root: [[0.5, 0.1, 0.03], [0.62, 0.26, 0.06]], tip: [0.72, 0.56, 0.4], trans: [0.95, 0.72, 0.5], len: 0.04, width: 0.6 },
  juice: [0.98, 0.58, 0.12],
  glow: 0.5,
  // A short stem and a leaf on one half; a small point on the other.
  tip(U, g, mat, e) {
    if (e > 0) {
      const st = new THREE.CylinderGeometry(0.018, 0.026, 0.08, 10);
      st.rotateZ(Math.PI / 2);
      st.translate(-A - 0.02, 0, 0);
      g.add(new THREE.Mesh(st, solidMaterial(U, { col: 'vec3(0.12, 0.06, 0.025)', rough: 0.7 })));
      // The leaf: a flat curved oval, lit green.
      const lf = new THREE.SphereGeometry(1, 24, 12);
      lf.scale(0.012, 0.22, 0.08);
      const P = lf.attributes.position;
      for (let i = 0; i < P.count; i++) P.setX(i, P.getX(i) + 0.35 * (P.getY(i) / 0.22) ** 2 * 0.12);
      lf.computeVertexNormals();
      lf.translate(0, 0.21, 0);
      lf.rotateX(-0.5);
      lf.rotateZ(0.5);
      lf.translate(-A - 0.04, 0.0, 0.0);
      g.add(new THREE.Mesh(lf, solidMaterial(U, { col: 'mix(vec3(0.05, 0.2, 0.02), vec3(0.14, 0.34, 0.04), smoothstep(-0.1, 0.4, vL.y))', rough: 0.45, wrap: 0.5, sss: 'vec3(0.6, 1.0, 0.3)' })));
    } else {
      const n = new THREE.ConeGeometry(0.03, 0.05, 12);
      n.rotateZ(Math.PI / 2);
      n.translate(-A - 0.01, 0, 0);
      g.add(new THREE.Mesh(n, mat));
    }
  },
  face(U, g, R, e) {
    const pit = e > 0;
    const bed = bedMesh(U, this, bedGLSL(pit), { bumpK: 1, wet: 0.9, hole: pit ? [SY * 0.96, SZ * 0.96] : null });
    g.add(bed);
    const parts = [bed];
    if (pit) {
      // The hollow the stone left: a half oval, seen from inside, red and fibrous.
      const hg = new THREE.SphereGeometry(1, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2);
      hg.rotateZ(Math.PI / 2);
      hg.scale(0.15, SY * B * 0.96, SZ * C * 0.96);
      hg.translate(-0.012, 0, 0);
      const hollow = new THREE.Mesh(hg, solidMaterial(U, { col: 'mix(vec3(0.2, 0.025, 0.014), vec3(0.42, 0.07, 0.03), smoothstep(-0.14, 0.0, vL.x)) * (0.7 + 0.3 * vn(vL * 60.0))', rough: 0.75, f0: 0.01, wrap: 0.5, sss: 'vec3(0.8, 0.1, 0.05)', bump: 0.6, bumpScale: 45, side: THREE.BackSide }));
      g.add(hollow);
      parts.push(hollow);
    } else {
      // The stone: a deep-ridged oval, half out of the face.
      const sg = new THREE.SphereGeometry(1, 96, 64);
      const noise = createNoise3D(rng(7));
      const P = sg.attributes.position, v = new THREE.Vector3();
      for (let i = 0; i < P.count; i++) {
        v.fromBufferAttribute(P, i);
        // Ridges where the noise crosses zero; pits between them.
        const rdg = 1 - Math.abs(noise(v.x * 2.6, v.y * 1.6, v.z * 2.6));
        v.multiplyScalar(0.93 + 0.1 * rdg * rdg);
        P.setXYZ(i, v.x, v.y, v.z);
      }
      sg.computeVertexNormals();
      sg.scale(0.16, SY * B * 0.92, SZ * C * 0.92);
      const stone = new THREE.Mesh(sg, solidMaterial(U, { col: 'mix(vec3(0.07, 0.02, 0.012), vec3(0.3, 0.09, 0.045), smoothstep(0.3, 0.75, vn(vL * 40.0)))', rough: 0.6, wrap: 0.3, bump: 0.5, bumpScale: 60 }));
      g.add(stone);
      parts.push(stone);
    }
    return { bed, parts };
  },
};
