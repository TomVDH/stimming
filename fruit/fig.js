// Fig: a purple teardrop, green toward the stem, with a dusty bloom.
// Inside: a white rind round a pink-red mass of fibres and tiny seeds.
import * as THREE from 'three';
import { bedMesh, solidMaterial } from './half.js';

const A = 0.95, B = 0.72, C = 0.72;

const BED = /* glsl */`
vec2 fseed(vec2 f) { return cells(f * 34.0); }
float relief(vec2 f) {
  float r = length(f), a = atan(f.y, f.x);
  float inner = 1.0 - smoothstep(0.78, 0.82, r);
  vec2 c = fseed(f);
  return (0.0012 * vn(vec3(a * 70.0, r * 5.0, 1.0)) + 0.0015 * (1.0 - smoothstep(0.1, 0.25, c.x)) * step(0.5, c.y)) * inner;
}
vec3 bed(vec2 f, float r, float a, inout float glow) {
  // The flowers: fibres run in from the rind and meet in the middle.
  float fib = vn(vec3(a * 60.0, r * 4.0, 2.0)) * 0.6 + vn(vec3(a * 140.0, r * 9.0, 3.0)) * 0.4;
  vec3 col = mix(vec3(0.22, 0.008, 0.02), vec3(0.55, 0.08, 0.08), fib);
  // Toward the rind the fibres turn pale.
  col = mix(col, vec3(0.6, 0.42, 0.34), smoothstep(0.55, 0.8, r) * (0.5 + 0.5 * fib));
  // Tiny seeds, pale gold, among the fibres.
  vec2 c = fseed(f);
  col = mix(col, vec3(0.62, 0.5, 0.22), (1.0 - smoothstep(0.1, 0.18, c.x)) * step(0.5, c.y) * (1.0 - smoothstep(0.7, 0.8, r)));
  // A small dark hollow in the middle.
  col = mix(col, vec3(0.12, 0.01, 0.015), 1.0 - smoothstep(0.05, 0.11, r + 0.03 * sin(a * 5.0)));
  // The white rind, then the purple skin.
  col = mix(col, vec3(0.62, 0.56, 0.44) * (0.9 + 0.1 * vn(vec3(f * 30.0, 4.0))), smoothstep(0.8, 0.84, r));
  col = mix(col, vec3(0.1, 0.03, 0.08), smoothstep(0.965, 0.975, r));
  glow = (1.0 - smoothstep(0.8, 0.84, r)) * 0.5;
  return col;
}`;

export const fig = {
  id: 'fig', label: 'Fig', A, B, C,
  // The stem half draws in to a neck; the other half stays round.
  shape: (t, ph, e) => Math.pow(Math.max(0, 1 - t * t), e > 0 ? 0.3 : 0.45) * (e > 0 ? 1 - 0.72 * Math.pow(t, 1.2) : 1 + 0.06 * t),
  look: {
    thru: [0.6, 0.1, 0.18], thruK: 3,
    skinA: [0.035, 0.01, 0.03], skinB: [0.12, 0.03, 0.08], mottle: 4,
    blush: [0.09, 0.13, 0.035], blushK: 0.45, blushDir: [1, 0, 0],
    pores: 0.04, poreScale: 35, rough: 0.5, f0: 0.035, wrap: 0.25,
    speck: [0.8, 60, 0.4], speckCol: [0.24, 0.2, 0.22],
    sheen: [0.2, 0.18, 0.24], tipDark: 0.05,
  },
  fuzz: { k: 0, root: [[0.04, 0.01, 0.03], [0.12, 0.03, 0.08]], tip: [0.3, 0.25, 0.3], trans: [0.5, 0.4, 0.5], len: 0.07, width: 1 },
  juice: [0.8, 0.16, 0.2],
  glow: 0.45,
  // The stem on the neck; a small dark eye at the round end.
  tip(U, g, mat, e) {
    if (e > 0) {
      const st = new THREE.CylinderGeometry(0.035, 0.05, 0.1, 12);
      st.rotateZ(Math.PI / 2);
      st.translate(-A - 0.04, 0, 0);
      g.add(new THREE.Mesh(st, solidMaterial(U, { col: 'vec3(0.1, 0.12, 0.04)', rough: 0.6 })));
    } else {
      const eye = new THREE.TorusGeometry(0.03, 0.012, 8, 20);
      eye.rotateY(Math.PI / 2);
      eye.translate(-A + 0.004, 0, 0);
      g.add(new THREE.Mesh(eye, solidMaterial(U, { col: 'vec3(0.03, 0.01, 0.02)', rough: 0.5 })));
    }
  },
  face(U, g) {
    const bed = bedMesh(U, this, BED, { bumpK: 1, wet: 0.9 });
    g.add(bed);
    return { bed, parts: [bed] };
  },
};
