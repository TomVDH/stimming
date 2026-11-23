// Starfruit: long, waxy and yellow, with five ridges; its slice is a star.
import * as THREE from 'three';
import { bedMesh, solidMaterial } from './half.js';

const A = 1.05, B = 0.72, C = 0.72;
// The star: a ridge at every fifth of a turn. Even in the angle, so the halves meet.
const star = ph => 0.58 + 0.42 * Math.pow(0.5 + 0.5 * Math.cos(5 * ph), 1.6);

const BED = /* glsl */`
float starR(float a) { return 0.58 + 0.42 * pow(0.5 + 0.5 * cos(5.0 * a), 1.6); }
float relief(vec2 f) { return 0.001 * vn(vec3(f * 55.0, 1.0)); }
vec3 bed(vec2 f, float r, float a, inout float glow) {
  float rr = r / starR(a);
  // Translucent yellow flesh, deeper toward the ridges.
  vec3 col = mix(vec3(0.56, 0.44, 0.03), vec3(0.62, 0.42, 0.015), smoothstep(0.3, 0.9, rr));
  col *= 0.92 + 0.08 * vn(vec3(a * 25.0, rr * 9.0, 1.0));
  // A pale star in the middle, one arm into each ridge.
  float core = r / (0.07 + 0.12 * pow(0.5 + 0.5 * cos(5.0 * a), 3.0));
  col = mix(col, vec3(0.62, 0.6, 0.3), 1.0 - smoothstep(0.85, 1.0, core));
  // A flat brown seed in some arms.
  for (int i = 0; i < 5; i++) {
    float sa = float(i) * 1.2566;
    vec2 d = vec2(cos(sa), sin(sa)), p = f - d * 0.27;
    vec2 q = vec2(dot(p, d), dot(p, vec2(-d.y, d.x)));
    float seed = 1.0 - smoothstep(0.9, 1.0, length(q / vec2(0.07, 0.03)));
    col = mix(col, vec3(0.2, 0.11, 0.04), seed * step(0.4, fract(float(i) * 0.618 + 0.2)));
  }
  // The skin's edge, brown on the ridge tips.
  col = mix(col, vec3(0.58, 0.44, 0.04), smoothstep(0.95, 0.97, rr));
  col = mix(col, vec3(0.3, 0.2, 0.03), smoothstep(0.975, 0.99, rr) * smoothstep(0.7, 1.0, cos(5.0 * a)));
  glow = smoothstep(0.2, 0.9, rr) * (1.0 - smoothstep(0.95, 0.97, rr));
  return col;
}`;

export const starfruit = {
  id: 'starfruit', label: 'Starfruit', A, B, C,
  shape: (t, ph, e) => Math.pow(Math.max(0, 1 - t * t), 0.45) * (1 + e * t * 0.2) * star(ph),
  look: {
    thru: [1.0, 0.8, 0.16], thruK: 1.9,
    skinA: [0.6, 0.4, 0.015], skinB: [0.78, 0.58, 0.04], mottle: 5,
    blush: [0.32, 0.42, 0.03], blushK: 0.3, blushDir: [0, -1, 0],
    pores: 0.02, poreScale: 40, rough: 0.18, f0: 0.05, wrap: 0.5, sss: [0.9, 0.7, 0.1],
    sheen: [0.05, 0.04, 0.01], tipDark: 0.3,
  },
  fuzz: { k: 0, root: [[0.5, 0.35, 0.02], [0.7, 0.5, 0.04]], tip: [0.8, 0.7, 0.2], trans: [0.9, 0.8, 0.3], len: 0.07, width: 1 },
  // Loose seeds: a few flat brown seeds.
  bits: { s: [0.02, 0.034, 0.012], color: () => [0.42, 0.24, 0.08], sig: 3.0, seed: 0, seedCol: [0, 0, 0], scale: 20, n: 4 },
  juice: [0.95, 0.85, 0.15],
  glow: 0.8,
  tip(U, g, mat, e) {
    if (e > 0) {
      const st = new THREE.CylinderGeometry(0.02, 0.035, 0.06, 10);
      st.rotateZ(Math.PI / 2);
      st.translate(-A - 0.02, 0, 0);
      g.add(new THREE.Mesh(st, solidMaterial(U, { col: 'vec3(0.2, 0.16, 0.05)', rough: 0.6 })));
    }
  },
  face(U, g) {
    const bed = bedMesh(U, this, BED, { bumpK: 1, wet: 1.1 });
    g.add(bed);
    return { bed, parts: [bed] };
  },
};
