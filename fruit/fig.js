// Fig: a purple teardrop, green toward the stem, with a dusty bloom.
// Inside: a white rind round a pink-red mass of fibres and tiny seeds.
import * as THREE from 'three';
import { bedMesh, solidMaterial } from './half.js';

const A = 0.95, B = 0.72, C = 0.72;

// Reference: Commons "Fig_cut_open.jpg": strands of rose-red flesh with honey seeds, a pale rind.
const BED = /* glsl */`
// The strands: long cells along the ray, warped so they bend and cross.
vec2 strand(vec2 f) {
  float r = length(f), a = atan(f.y, f.x);
  vec2 q = vec2(a * r * 18.0, r * 4.5) + vec2(vn(vec3(f * 4.0, 1.0)), vn(vec3(f * 4.0, 2.0))) * 1.8;
  return cellEdge(q);
}
vec2 fseed(vec2 f) { return cells(f * 34.0 + vec2(vn(vec3(f * 8.0, 3.0))) * 1.5); }
// The rind's inner edge wanders, with strands reaching into it.
float rindR(float a) { vec2 u = vec2(cos(a), sin(a)); return 0.84 + 0.03 * (vn(vec3(u * 3.0, 4.0)) - 0.5) * 2.0 + 0.02 * (vn(vec3(u * 14.0, 5.0)) - 0.5); }
// The hollow: an irregular slit in the middle.
float holeD(vec2 f) {
  vec2 q = mat2(0.8, 0.6, -0.6, 0.8) * f;
  return length(q / vec2(0.2, 0.07)) + 0.4 * (vn(vec3(f * 12.0, 6.0)) - 0.5);
}
float relief(vec2 f) {
  float r = length(f), a = atan(f.y, f.x);
  float inner = 1.0 - smoothstep(-0.01, 0.01, r - rindR(a));
  vec2 st = strand(f);
  vec2 c = fseed(f);
  float seed = (1.0 - smoothstep(0.1, 0.24, c.x)) * step(0.25, c.y);
  // Each strand a round, wet ridge; seeds stand out; the rind is smooth.
  return (0.0022 * sqrt(clamp(st.x / 0.5, 0.0, 1.0)) + 0.0014 * seed) * inner + 0.002 * vn(vec3(f * 6.0, 7.0));
}
vec3 bed(vec2 f, float r, float a, inout float glow) {
  float rr = rindR(a);
  vec2 st = strand(f);
  // Each strand its own shade; deep wine at the middle, rose further out.
  vec3 wine = vec3(0.15, 0.005, 0.03), rose = vec3(0.42, 0.03, 0.08), blush = vec3(0.56, 0.22, 0.22);
  float k = smoothstep(0.2, 0.95, r / rr) * (0.6 + 0.7 * st.y);
  vec3 col = mix(wine, rose, clamp(k, 0.0, 1.0));
  // The strands pale toward the rind, where they are thin and dry.
  col = mix(col, blush, smoothstep(0.8, 1.0, r / rr) * (0.2 + 0.4 * st.y));
  // A darker gap between strands.
  col *= 0.45 + 0.55 * smoothstep(0.0, 0.25, st.x);
  // Honey seeds among the strands, each with a small dark shadow on one side.
  vec2 c = fseed(f);
  float on = step(0.25, c.y) * (1.0 - smoothstep(0.85, 1.0, r / rr));
  col = mix(col, col * 0.35, (1.0 - smoothstep(0.16, 0.3, c.x)) * on * 0.6);
  col = mix(col, vec3(0.62, 0.44, 0.13), (1.0 - smoothstep(0.1, 0.2, c.x)) * on);
  // The hollow: dark and wet, its rim strands curled in.
  float h = holeD(f);
  col = mix(col, vec3(0.06, 0.004, 0.012), 1.0 - smoothstep(0.8, 1.05, h));
  // The rind: cream, faintly green at the skin; strands reach into it.
  float reach = smoothstep(0.3, 0.7, vn(vec3(a * 40.0, 1.0, 8.0))) * 0.03;
  float rind = smoothstep(rr - 0.008 + reach, rr + 0.008 + reach, r);
  vec3 cream = mix(vec3(0.66, 0.6, 0.47), vec3(0.5, 0.52, 0.32), smoothstep(0.88, 0.97, r)) * (0.92 + 0.1 * vn(vec3(f * 25.0, 9.0)));
  col = mix(col, cream, rind);
  col = mix(col, vec3(0.06, 0.02, 0.05), smoothstep(0.97, 0.98, r));
  glow = (1.0 - rind) * 0.7 * smoothstep(0.7, 1.2, h);
  return col;
}`;

export const fig = {
  id: 'fig', label: 'Fig', A, B, C,
  // The stem half draws in to a neck; the other half stays round.
  shape: (t, ph, e) => Math.pow(Math.max(0, 1 - t * t), e > 0 ? 0.3 : 0.45) * (e > 0 ? 1 - 0.72 * Math.pow(t, 1.2) : 1 + 0.06 * t),
  look: {
    thru: [0.12, 0.02, 0.04], thruK: 3.5,
    skinA: [0.022, 0.007, 0.02], skinB: [0.065, 0.018, 0.045], mottle: 4,
    blush: [0.07, 0.09, 0.03], blushK: 0.5, blushDir: [1, 0, 0],
    pores: 0.04, poreScale: 35, rough: 0.6, f0: 0.03, wrap: 0.25,
    speck: [0.84, 70, 0.25], speckCol: [0.2, 0.17, 0.18],
    sheen: [0.14, 0.13, 0.17], tipDark: 0.05,
    glsl: /* glsl */`
      // Faint ribs run from the stem to the eye, darker in the grooves.
      float rib = 0.5 + 0.5 * cos(atan(fp.z, fp.y) * 9.0 + vn(fp * 3.0) * 1.5);
      base *= 0.82 + 0.25 * rib;
      // A dusty bloom, in patches, dulls the shine.
      float bloom = smoothstep(0.35, 0.7, vn(fp * 5.0));
      base = mix(base, vec3(0.09, 0.07, 0.1), bloom * 0.3);
      roughAdd += 0.2 * bloom;`,
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
    const bed = bedMesh(U, this, BED, { bumpK: 1.2, wet: 1.0, rough: 0.4 });
    g.add(bed);
    return { bed, parts: [bed] };
  },
};
