// Blood orange: a dimpled waxy peel with a red flush.
// The cut is one wet, translucent face: dark maroon flesh with red-orange patches.
// Each cut juice sac is a small dome, so the studio's reflection breaks into crinkled glints.
// Segment walls are faint; a white star at the core; a narrow pink-white albedo; a thick rind.
import * as THREE from 'three';
import { createNoise3D } from 'simplex-noise';
import { bedMesh, solidMaterial, rng } from './half.js';

const A = 0.84, B = 0.88, C = 0.88;
const NS = 10;
// Segment walls: evenly spaced, each nudged a little.
const W = Array.from({ length: NS }, (_, i) => ((i / NS) * Math.PI * 2 + 0.07 * Math.sin(i * 2.3)).toFixed(4));

const BED = /* glsl */`
// A membrane wanders a little along its length.
float wallD(float a, float r) {
  a += 0.02 * sin(r * 13.0 + a * 3.0) / max(r, 0.15) + 0.012 * (vn(vec3(r * 18.0, a * 4.0, 3.0)) - 0.5);
  float d = 9.0;
  ${W.map(w => `d = min(d, abs(mod(a - ${w} + 9.4248, 6.2832) - 3.1416) * r);`).join('\n  ')}
  return d;
}
// The cut sacs: small cells, long along the ray, jittered so no rows show.
vec2 sac(vec2 f) {
  float r = length(f), a = atan(f.y, f.x);
  vec2 q = vec2(a * r * 19.0, r * 8.0);
  // A strong warp at two scales: no rows or columns survive.
  q += vec2(vn(vec3(f * 6.0, 1.0)), vn(vec3(f * 6.0, 2.0))) * 1.8 + vec2(vn(vec3(f * 17.0, 3.0)), vn(vec3(f * 17.0, 4.0))) * 0.6;
  return cellEdge(q);
}
// Where the flesh is: inside the rind, out of the core.
float fleshMask(float r, float a) {
  float rind = smoothstep(0.835, 0.855, r + 0.006 * sin(a * 37.0));
  float core = 1.0 - smoothstep(0.025, 0.08, r - 0.012 * (vn(vec3(a * 3.0, 1.0, 4.0)) - 0.5) * 2.0);
  return (1.0 - rind) * (1.0 - core);
}
float relief(vec2 f) {
  float r = length(f), a = atan(f.y, f.x);
  vec2 s = sac(f);
  // Each sac a small dome; walls between segments a shallow groove; each segment a soft bulge.
  float wd = wallD(a, r);
  // Slow undulation as well, so the shine forms wet patches, not a pattern.
  // A round dome, curved everywhere: each sac catches the light in one small spot.
  float dome = 0.0024 * sqrt(clamp(s.x / 0.5, 0.0, 1.0)) + 0.004 * vn(vec3(f * 9.0, 4.0)) + 0.0015 * vn(vec3(f * 25.0, 5.0));
  float seg = 0.003 * smoothstep(0.0, 0.15, wd);
  return (dome + seg) * fleshMask(r, a) + 0.0008 * vn(vec3(f * 60.0, 6.0)) * (1.0 - fleshMask(r, a));
}
vec3 bed(vec2 f, float r, float a, inout float glow) {
  vec2 s = sac(f);
  float m = fleshMask(r, a);
  // Flesh: dark maroon, with red and orange patches; sacs a touch lighter at their walls.
  float patchy = vn(vec3(f * 2.4, 7.0)) * 0.7 + vn(vec3(f * 6.0, 8.0)) * 0.3;
  vec3 maroon = vec3(0.075, 0.003, 0.009), red = vec3(0.26, 0.012, 0.016), orange = vec3(0.46, 0.11, 0.01);
  vec3 flesh = mix(maroon, red, smoothstep(0.42, 0.78, patchy));
  flesh = mix(flesh, orange, smoothstep(0.75, 0.95, patchy) * 0.7);
  // The rim of the flesh blushes red, as anthocyanin gathers at the segment edges.
  flesh = mix(flesh, red * 1.2, smoothstep(0.7, 0.84, r) * 0.5);
  // Fine grain: each sac a shade apart, its thin walls a little paler.
  flesh *= 0.78 + 0.3 * s.y + 0.35 * (1.0 - smoothstep(0.0, 0.18, s.x));
  // Faint segment walls, paler toward the middle.
  float wd = wallD(a, r);
  float wall = (1.0 - smoothstep(0.0, 0.009, wd)) * (1.0 - smoothstep(0.2, 0.6, r)) * 0.35 * vn(vec3(r * 12.0, a * 3.0, 9.0));
  flesh = mix(flesh, flesh * 1.6 + vec3(0.06, 0.03, 0.02), wall);
  // Pith: the white star at the core and the albedo, fibrous, juice-stained at its inner edge.
  vec3 pith = mix(vec3(0.62, 0.52, 0.46), vec3(0.72, 0.62, 0.54), vn(vec3(a * 40.0, r * 8.0, 2.0)));
  // The core: a small, soft, uneven pale knot, not a star.
  float core = 1.0 - smoothstep(0.025, 0.08, r - 0.012 * (vn(vec3(a * 3.0, 1.0, 4.0)) - 0.5) * 2.0);
  pith = mix(pith, vec3(0.5, 0.2, 0.17), smoothstep(0.82, 0.86, r) * (1.0 - smoothstep(0.86, 0.89, r)) * 0.8 + core * 0.5);
  vec3 col = mix(pith, flesh, m);
  // The flavedo: a thick orange rind, deeper at the surface, oil glands dotted in it.
  float fl = smoothstep(0.895, 0.915, r + 0.004 * sin(a * 23.0));
  vec3 peel = mix(vec3(0.78, 0.3, 0.02), vec3(0.6, 0.15, 0.006), smoothstep(0.92, 0.99, r));
  peel = mix(peel, vec3(0.85, 0.42, 0.04), (1.0 - smoothstep(0.1, 0.25, cells(f * 110.0).x)) * 0.45);
  col = mix(col, peel, fl);
  glow = m * 0.55 + (1.0 - m) * (1.0 - fl) * 0.15;
  return col;
}`;

export const orange = {
  id: 'orange', label: 'Orange', A, B, C,
  shape: (() => {
    const nz = createNoise3D(rng(13));
    return (t, ph, e) => Math.pow(Math.max(0, 1 - t * t), 0.5) * (1 + e * t * 0.3)
      * (1 + 0.012 * t * nz(Math.cos(ph) * 2, Math.sin(ph) * 2, t * 2 + (e > 0 ? 4 : 0)));
  })(),
  look: {
    thru: [1.0, 0.42, 0.04], thruK: 2.5,
    skinA: [0.55, 0.11, 0.006], skinB: [0.76, 0.2, 0.01], mottle: 6,
    blush: [0.3, 0.02, 0.012], blushK: 0.5, blushDir: [0.3, 0.7, 0.3],
    pores: 0.38, poreScale: 85, rough: 0.26, f0: 0.05, wrap: 0.35, sss: [0.8, 0.3, 0.0],
    speck: [0.7, 160, 0.3], speckCol: [0.9, 0.4, 0.03],
    sheen: [0.1, 0.035, 0.006], tipDark: 0.08,
    glsl: /* glsl */`
      // The red flush comes in streaks along the fruit, and in blotches.
      float fl = smoothstep(0.55, 0.8, vn(vec3(fp.x * 2.0, fp.y * 7.0, fp.z * 7.0) + 5.0));
      base = mix(base, vec3(0.32, 0.03, 0.015), fl * 0.3);
      // Each oil gland sits in a small pit, a touch duller.
      roughAdd += 0.1 * (1.0 - smoothstep(0.1, 0.3, cells(vec2(fp.y + fp.x * 0.7, fp.z - fp.x * 0.5) * 120.0).x));`,
  },
  fuzz: { k: 0, root: [[0.4, 0.09, 0.005], [0.6, 0.16, 0.01]], tip: [0.8, 0.35, 0.05], trans: [0.9, 0.4, 0.06], len: 0.07, width: 1 },
  juice: [0.95, 0.2, 0.05],
  glow: 0.75,
  // The stem button on one half, the navel on the other.
  tip(U, g, mat, e) {
    if (e > 0) {
      const b = new THREE.CylinderGeometry(0.045, 0.06, 0.035, 20);
      b.rotateZ(Math.PI / 2);
      b.translate(-A - 0.004, 0, 0);
      g.add(new THREE.Mesh(b, solidMaterial(U, { col: 'mix(vec3(0.06, 0.08, 0.015), vec3(0.14, 0.13, 0.04), vn(vL * 120.0))', rough: 0.65, bump: 0.8, bumpScale: 140 })));
    } else {
      const n = new THREE.SphereGeometry(1, 14, 10);
      n.scale(0.012, 0.035, 0.035);
      n.translate(-A + 0.004, 0, 0);
      g.add(new THREE.Mesh(n, solidMaterial(U, { col: 'vec3(0.32, 0.07, 0.005)', rough: 0.5 })));
    }
  },
  face(U, g) {
    const bed = bedMesh(U, this, BED, { bumpK: 3.5, wet: 0.75, depth: 0.0, rough: 0.55 });
    g.add(bed);
    return { bed, parts: [bed] };
  },
};
