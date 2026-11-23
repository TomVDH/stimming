// Rambutan: a red shell with long soft spines; glassy white flesh round a brown seed.
// The spines are the fuzz ribbons, few and long, standing up with hooked tips.
import * as THREE from 'three';
import { bedMesh, solidMaterial } from './half.js';

const A = 0.82, B = 0.7, C = 0.7;
// The seed, in face units: half its height and width.
const SY = 0.36, SZ = 0.28;

const bedGLSL = pit => /* glsl */`
float relief(vec2 f) { float r = length(f), a = atan(f.y, f.x); return 0.0012 * vn(vec3(a * 40.0, r * 10.0, 1.0)); }
vec3 bed(vec2 f, float r, float a, inout float glow) {
  // Glassy white flesh: fine fibres run out from the seed.
  vec3 flesh = vec3(0.5, 0.5, 0.44) * (0.88 + 0.12 * vn(vec3(a * 50.0, r * 6.0, 2.0)));
  vec2 q = f / vec2(${SY.toFixed(2)}, ${SZ.toFixed(2)});
  float e = length(q);
  // A thin papery skin round the seed.
  vec3 col = mix(flesh, vec3(0.42, 0.33, 0.22), (1.0 - smoothstep(1.0, 1.12, e)) * 0.8);
  // The shell: white inside, red outside.
  col = mix(col, vec3(0.62, 0.48, 0.4), smoothstep(0.86, 0.88, r));
  col = mix(col, vec3(0.42, 0.03, 0.02), smoothstep(0.94, 0.955, r));
  glow = (1.0 - smoothstep(0.84, 0.88, r)) * 0.8;
  return col;
}`;

export const rambutan = {
  id: 'rambutan', label: 'Rambutan', A, B, C,
  shape: (t, ph, e) => Math.pow(Math.max(0, 1 - t * t), 0.5) * (1 + e * t * 0.25),
  look: {
    thru: [0.9, 0.15, 0.05], thruK: 3,
    skinA: [0.2, 0.008, 0.006], skinB: [0.38, 0.02, 0.01], mottle: 4,
    blush: [0.42, 0.2, 0.02], blushK: 0.2, blushDir: [0, -1, 0.2],
    pores: 0.35, poreScale: 14, rough: 0.55, f0: 0.035, wrap: 0.3, sss: [0.5, 0.05, 0.02],
    sheen: [0.08, 0.02, 0.01], tipDark: 0.15,
  },
  fuzz: { k: 0.85, count: 0.022, lift: 1.1, curl: 0.8, len: 0.3, width: 11, root: [[0.3, 0.01, 0.008], [0.45, 0.025, 0.012]], tip: [0.18, 0.22, 0.03], trans: [0.45, 0.06, 0.03] },
  juice: [0.85, 0.88, 0.8],
  glow: 0.5,
  tip(U, g, mat, e) {
    if (e > 0) {
      const st = new THREE.CylinderGeometry(0.02, 0.035, 0.07, 10);
      st.rotateZ(Math.PI / 2);
      st.translate(-A - 0.02, 0, 0);
      g.add(new THREE.Mesh(st, solidMaterial(U, { col: 'vec3(0.1, 0.07, 0.03)', rough: 0.7 })));
    }
  },
  face(U, g, R, e) {
    const pit = e > 0;
    const bed = bedMesh(U, this, bedGLSL(pit), { bumpK: 1, wet: 1.3, hole: pit ? [SY * 0.96, SZ * 0.96] : null });
    g.add(bed);
    const parts = [bed];
    if (pit) {
      // The hollow the seed left: lined with the thin brown skin.
      const hg = new THREE.SphereGeometry(1, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2);
      hg.rotateZ(Math.PI / 2);
      hg.scale(0.13, SY * B * 0.96, SZ * C * 0.96);
      hg.translate(-0.012, 0, 0);
      const hollow = new THREE.Mesh(hg, solidMaterial(U, { col: 'mix(vec3(0.2, 0.13, 0.07), vec3(0.42, 0.33, 0.2), smoothstep(-0.12, 0.0, vL.x)) * (0.8 + 0.2 * vn(vL * 80.0))', rough: 0.5, f0: 0.02, wrap: 0.4, side: THREE.BackSide }));
      g.add(hollow);
      parts.push(hollow);
    } else {
      // The seed: a smooth brown oval, half out of the flesh.
      const sg = new THREE.SphereGeometry(1, 64, 40);
      sg.scale(0.13, SY * B * 0.93, SZ * C * 0.93);
      const seed = new THREE.Mesh(sg, solidMaterial(U, { col: 'mix(vec3(0.13, 0.07, 0.035), vec3(0.28, 0.17, 0.08), vn(vL * 30.0))', rough: 0.35, wrap: 0.3, bump: 0.15, bumpScale: 50 }));
      g.add(seed);
      parts.push(seed);
    }
    return { bed, parts };
  },
};
