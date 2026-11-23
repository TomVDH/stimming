// Blood orange: a dimpled waxy peel with a red flush; ten segments of juice sacs.
// The sacs are drawn per pixel: fine cells long along each ray, each with its own red.
import * as THREE from 'three';
import { bedMesh, solidMaterial } from './half.js';

const A = 0.84, B = 0.88, C = 0.88;
const NS = 10;
// Segment walls: evenly spaced, each nudged a little.
// One wall sits exactly at a half turn, where the angle wraps.
const W = Array.from({ length: NS }, (_, i) => ((i / NS) * Math.PI * 2 + (i === 5 ? 0 : 0.07 * Math.sin(i * 2.3))).toFixed(4));

const BED = /* glsl */`
// The distance to the nearest segment wall, and which segment holds the point.
vec2 seg(float a, float r) {
  float d = 9.0, s = 0.0, best = 9.0;
  ${W.map((w, i) => `{ float q = mod(a - ${w} + 9.4248, 6.2832) - 3.1416; d = min(d, abs(q) * r); if (q > 0.0 && q < best) { best = q; s = ${i}.0; } }`).join('\n  ')}
  return vec2(d, s);
}
// The sacs: cells long along the ray, about sixty across the fruit.
vec2 sac(float r, float a) { return cellEdge(vec2(a * r * 7.0, r * 9.0 - sin(a * 30.0) * 0.1) * vec2(4.0, 1.0)); }
float relief(vec2 f) {
  float r = length(f), a = atan(f.y, f.x);
  vec2 s = sac(r, a);
  float inside = smoothstep(0.1, 0.12, r) * (1.0 - smoothstep(0.84, 0.86, r));
  return (0.0025 * smoothstep(0.0, 0.3, s.x) - 0.0015 * (1.0 - smoothstep(0.004, 0.012, seg(a, r).x))) * inside;
}
vec3 bed(vec2 f, float r, float a, inout float glow) {
  vec2 sg = seg(a, r);
  vec2 s = sac(r, a);
  // The red flush comes in patches across segments; each sac varies on it.
  float k = clamp(smoothstep(0.3, 0.75, vn(vec3(f * 2.6, 7.0))) + (fract(sin(sg.y * 12.9898) * 43758.5) - 0.5) * 0.25 + (s.y - 0.5) * 0.3, 0.0, 1.0);
  // Detail fades where a sac is smaller than a few pixels.
  float aa = clamp(fwidth(r) * 60.0, 0.0, 1.0);
  vec3 juice = mix(vec3(0.62, 0.13, 0.008), vec3(0.3, 0.008, 0.012), k);
  // A sac is deep in its middle and pale where its walls are thin.
  vec3 col = mix(juice * 1.6 + vec3(0.05, 0.025, 0.0), juice, mix(smoothstep(0.0, 0.3, s.x), 0.8, aa));
  // Membranes between segments, a star of pith in the middle.
  float wall = 1.0 - smoothstep(0.004, 0.009, sg.x);
  float core = 1.0 - smoothstep(0.06, 0.075, r - 0.012 * sin(a * 10.0));
  vec3 pith = vec3(0.56, 0.46, 0.33);
  col = mix(col, pith * 0.9, max(wall * smoothstep(0.05, 0.1, r) * 0.85, core));
  // The albedo: a white spongy ring, then the thin peel.
  float alb = smoothstep(0.85, 0.865, r);
  col = mix(col, mix(pith, vec3(0.62, 0.42, 0.3), vn(vec3(f * 38.0, 5.0)) * 0.6), alb);
  col = mix(col, vec3(0.55, 0.12, 0.005), smoothstep(0.95, 0.958, r));
  glow = (1.0 - max(wall, core)) * (1.0 - alb) * (0.5 + 0.5 * smoothstep(0.0, 0.3, s.x));
  return col;
}`;

export const orange = {
  id: 'orange', label: 'Orange', A, B, C,
  shape: (t, ph, e) => Math.pow(Math.max(0, 1 - t * t), 0.5) * (1 + e * t * 0.3),
  look: {
    skinA: [0.55, 0.11, 0.006], skinB: [0.78, 0.21, 0.012], mottle: 6,
    blush: [0.34, 0.025, 0.012], blushK: 0.55, blushDir: [0.3, 0.7, 0.3],
    pores: 0.32, poreScale: 70, rough: 0.28, f0: 0.05, wrap: 0.35, sss: [0.8, 0.3, 0.0],
    speck: [0.72, 140, 0.25], speckCol: [0.9, 0.38, 0.03],
    sheen: [0.12, 0.04, 0.008], tipDark: 0.08,
  },
  fuzz: { k: 0, root: [[0.4, 0.09, 0.005], [0.6, 0.16, 0.01]], tip: [0.8, 0.35, 0.05], trans: [0.9, 0.4, 0.06], len: 0.07, width: 1 },
  juice: [0.95, 0.2, 0.05],
  glow: 0.75,
  // The stem button on one half, the navel on the other.
  tip(U, g, mat, e) {
    if (e > 0) {
      const b = new THREE.CylinderGeometry(0.05, 0.065, 0.04, 16);
      b.rotateZ(Math.PI / 2);
      b.translate(-A - 0.005, 0, 0);
      g.add(new THREE.Mesh(b, solidMaterial(U, { col: 'vec3(0.09, 0.11, 0.02)', rough: 0.7, bump: 0.4, bumpScale: 90 })));
    } else {
      const n = new THREE.SphereGeometry(1, 14, 10);
      n.scale(0.012, 0.035, 0.035);
      n.translate(-A + 0.004, 0, 0);
      g.add(new THREE.Mesh(n, solidMaterial(U, { col: 'vec3(0.32, 0.07, 0.005)', rough: 0.5 })));
    }
  },
  face(U, g) {
    const bed = bedMesh(U, this, BED, { bumpK: 1, wet: 1.2 });
    g.add(bed);
    return { bed, parts: [bed] };
  },
};
