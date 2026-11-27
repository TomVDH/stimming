// Starfruit: long, waxy and golden, with five deep ridges; its slice is a star.
import * as THREE from 'three';
import { bedMesh, solidMaterial } from './half.js';

const A = 1.05, B = 0.72, C = 0.72;
// The star: a ridge at every fifth of a turn. Even in the angle, so the halves meet.
const star = ph => 0.5 + 0.5 * Math.pow(0.5 + 0.5 * Math.cos(5 * ph), 1.5);

// The cut: translucent golden flesh at two depths, a pale star core with a vein
// out along each arm, faint walls between the arms, small seeds round the core.
// Reference: Commons media search "carambola cross section", a whole fruit and two star slices.
const BED = /* glsl */`
float starR(float a) { return 0.5 + 0.5 * pow(0.5 + 0.5 * cos(5.0 * a), 1.5); }
// The angle to the nearest arm's middle, and to the nearest wall between arms.
float armA(float a) { return a - floor(a / 1.2566 + 0.5) * 1.2566; }
float wallA(float a) { return a - (floor(a / 1.2566) + 0.5) * 1.2566; }
float juice(vec2 f) {
  vec2 ce = cellEdge(f * 22.0 + vec2(vn(vec3(f * 5.0, 1.0)), vn(vec3(f * 5.0, 2.0))) * 1.4);
  return sqrt(clamp(ce.x / 0.5, 0.0, 1.0));
}
float relief(vec2 f) {
  float r = length(f), a = atan(f.y, f.x);
  // Small round juice cells for crinkled glints; the veins stand a hair proud.
  float vein = 1.0 - smoothstep(0.004, 0.012, abs(armA(a)) * r);
  return 0.0016 * juice(f) + 0.003 * vn(vec3(f * 6.0, 3.0)) + 0.0008 * vein;
}
vec3 bed(vec2 f, float r, float a, inout float glow) {
  float rr = r / starR(a);
  // Two depths: the deeper cells slide with the view, so the flesh reads clear.
  float j = juice(f) * 0.5 + juice(f - gPar * 0.05 + 0.37) * 0.5;
  vec3 deep = vec3(0.55, 0.19, 0.004), light = vec3(0.66, 0.31, 0.018);
  // The cells barely show in colour: the flesh is clear jelly.
  vec3 col = mix(deep, light, 0.45 + 0.3 * (j - 0.5) + 0.3 * (vn(vec3(f * 4.0, 7.0)) - 0.5));
  // Golden in the arms, paler toward the middle.
  col = mix(col, vec3(0.7, 0.52, 0.14), (1.0 - smoothstep(0.1, 0.4, r)) * 0.45);
  // A pale vein out along each arm, thinning to its tip.
  float vein = (1.0 - smoothstep(0.003, 0.011, abs(armA(a)) * r)) * smoothstep(0.05, 0.12, r) * (1.0 - smoothstep(0.6, 0.92, rr));
  col = mix(col, vec3(0.78, 0.72, 0.42), vein * 0.6);
  // Faint walls run in from each valley.
  float wall = (1.0 - smoothstep(0.002, 0.008, abs(wallA(a)) * r)) * smoothstep(0.08, 0.15, r);
  col = mix(col, vec3(0.74, 0.62, 0.24), wall * 0.35);
  // The pale star at the middle, one point into each arm.
  float core = r / (0.05 + 0.1 * pow(0.5 + 0.5 * cos(5.0 * a), 3.0));
  col = mix(col, vec3(0.8, 0.76, 0.48), 1.0 - smoothstep(0.8, 1.0, core));
  // Small flat seeds near the core in some arms.
  for (int i = 0; i < 5; i++) {
    float sa = float(i) * 1.2566;
    vec2 d = vec2(cos(sa), sin(sa)), p = f - d * 0.2;
    vec2 q = vec2(dot(p, d), dot(p, vec2(-d.y, d.x)));
    float seed = 1.0 - smoothstep(0.85, 1.0, length(q / vec2(0.05, 0.022)));
    col = mix(col, vec3(0.3, 0.17, 0.05), seed * step(0.4, fract(float(i) * 0.618 + 0.2)) * 0.85);
  }
  // The skin: a thin green-gold line, brown on the ridge tips.
  float tipK = smoothstep(0.75, 1.0, 0.5 + 0.5 * cos(5.0 * a));
  col = mix(col, vec3(0.5, 0.42, 0.04), smoothstep(0.965, 0.978, rr));
  col = mix(col, vec3(0.22, 0.12, 0.02), smoothstep(0.97, 0.99, rr) * tipK);
  glow = (0.6 + 0.4 * smoothstep(0.2, 0.9, rr)) * (1.0 - smoothstep(0.96, 0.98, rr));
  return col;
}`;

export const starfruit = {
  id: 'starfruit', label: 'Starfruit', A, B, C,
  shape: (t, ph, e) => Math.pow(Math.max(0, 1 - t * t), 0.45) * (1 + e * t * 0.2) * star(ph),
  look: {
    thru: [0.6, 0.3, 0.03], thruK: 2.6,
    skinA: [0.5, 0.19, 0.004], skinB: [0.6, 0.29, 0.01], mottle: 5,
    blush: [0.3, 0.32, 0.02], blushK: 0.25, blushDir: [0, -1, 0],
    pores: 0.02, poreScale: 40, rough: 0.26, f0: 0.04, wrap: 0.45, sss: [0.5, 0.26, 0.03],
    sheen: [0.04, 0.03, 0.008], tipDark: 0.3,
    glsl: /* glsl */`
      // Each ridge's edge turns green, then brown at its very crest.
      float rg = pow(0.5 + 0.5 * cos(5.0 * atan(fp.z, fp.y)), 10.0);
      base = mix(base, vec3(0.2, 0.2, 0.015), rg * 0.7);
      base = mix(base, vec3(0.16, 0.08, 0.015), pow(rg, 6.0) * 0.6 * smoothstep(0.4, 0.8, vn(fp * 9.0)));
      // Faint green in the valleys, where the fruit ripened last.
      base = mix(base, vec3(0.3, 0.32, 0.02), (1.0 - smoothstep(0.0, 0.3, 0.5 + 0.5 * cos(5.0 * atan(fp.z, fp.y)))) * 0.3);`,
  },
  fuzz: { k: 0, root: [[0.5, 0.35, 0.02], [0.7, 0.5, 0.04]], tip: [0.8, 0.7, 0.2], trans: [0.9, 0.8, 0.3], len: 0.07, width: 1 },
  // Loose seeds: a few flat brown seeds.
  bits: { s: [0.02, 0.034, 0.012], color: () => [0.42, 0.24, 0.08], sig: 3.0, seed: 0, seedCol: [0, 0, 0], scale: 20, n: 4 },
  juice: [0.95, 0.85, 0.15],
  glow: 0.6,
  tip(U, g, mat, e) {
    if (e > 0) {
      const st = new THREE.CylinderGeometry(0.02, 0.035, 0.06, 10);
      st.rotateZ(Math.PI / 2);
      st.translate(-A - 0.02, 0, 0);
      g.add(new THREE.Mesh(st, solidMaterial(U, { col: 'vec3(0.2, 0.16, 0.05)', rough: 0.6 })));
    }
  },
  face(U, g) {
    const bed = bedMesh(U, this, BED, { bumpK: 1.2, wet: 1.1, rough: 0.35 });
    g.add(bed);
    return { bed, parts: [bed] };
  },
};
