// Blood orange: a dimpled waxy peel with a red flush; ten segments of juice vesicles.
// Each vesicle is real geometry: a long teardrop on its stalk, pointing out to the peel,
// packed against its neighbours and sliced flat at the cut. The juice runs orange to crimson.
import * as THREE from 'three';
import { createNoise3D } from 'simplex-noise';
import { bedMesh, solidMaterial, rng } from './half.js';
import { makeArils } from './arils.js';

const A = 0.84, B = 0.88, C = 0.88;
const NS = 10;
// The cut plane sits a hair above the face, so sliced vesicles show clean.
const CUT = 0.004;
// Segment walls: evenly spaced, each nudged a little.
// One wall sits exactly at a half turn, where the angle wraps.
const wallA = i => (i / NS) * Math.PI * 2 + (i % NS === 5 ? 0 : 0.07 * Math.sin(i * 2.3));
const W = Array.from({ length: NS }, (_, i) => wallA(i).toFixed(4));
// The flesh runs from the core to the albedo, in face units.
const CORE = 0.075, ALB = 0.86;

const BED = /* glsl */`
float wallD(float a, float r) {
  float d = 9.0;
  ${W.map(w => `d = min(d, abs(mod(a - ${w} + 9.4248, 6.2832) - 3.1416) * r);`).join('\n  ')}
  return d;
}
vec2 sponge(vec2 f) { return cellEdge(f * 55.0); }
float relief(vec2 f) { return 0.0012 * smoothstep(0.0, 0.25, sponge(f).x); }
vec3 bed(vec2 f, float r, float a, inout float glow) {
  float wall = 1.0 - smoothstep(0.006, 0.011, wallD(a, r));
  float core = 1.0 - smoothstep(${CORE.toFixed(3)} - 0.01, ${CORE.toFixed(3)} + 0.005, r - 0.012 * sin(a * 10.0));
  float alb = smoothstep(${(ALB - 0.012).toFixed(3)}, ${ALB.toFixed(3)}, r + 0.006 * sin(a * 37.0));
  // The segments are open: the vesicles show down to the juice below.
  if (max(max(wall * smoothstep(0.05, 0.1, r), core), alb) < 0.5) discard;
  // Pith: a soft white sponge, tinged where the juice has stained it.
  vec2 sp = sponge(f);
  vec3 pith = mix(vec3(0.62, 0.54, 0.42), vec3(0.7, 0.62, 0.48), vn(vec3(f * 16.0, 2.0)));
  pith *= 0.85 + 0.15 * smoothstep(0.0, 0.25, sp.x);
  vec3 col = mix(pith, vec3(0.6, 0.3, 0.2), smoothstep(0.3, 0.8, vn(vec3(f * 3.0, 9.0))) * 0.25);
  // Membranes: thin, so a little of the red juice shows through them.
  col = mix(col, col * vec3(0.95, 0.7, 0.6), wall * (1.0 - alb) * 0.5);
  // The flavedo: the thin coloured peel, oil glands dotted in it.
  float peel = smoothstep(0.95, 0.957, r);
  vec3 fl = mix(vec3(0.6, 0.14, 0.005), vec3(0.42, 0.05, 0.008), vn(vec3(f * 6.0, 4.0)));
  fl = mix(fl, vec3(0.75, 0.3, 0.02), (1.0 - smoothstep(0.1, 0.25, cells(f * 120.0).x)) * 0.6);
  col = mix(col, fl, peel);
  // Where the pith drops into a segment, its lip sits in the vesicles' shade.
  col *= 0.6 + 0.4 * smoothstep(0.5, 0.95, max(max(wall, core), alb));
  glow = 0.2 * (1.0 - peel);
  return col;
}`;

// The floor under the gaps: more sacs, drawn per pixel, lying deeper.
const FLOOR = /* glsl */`
vec2 sac(float r, float a) { return cellEdge(vec2(a * r * 7.0, r * 9.0 - sin(a * 30.0) * 0.1) * vec2(4.0, 1.0)); }
float relief(vec2 f) { return 0.0; }
vec3 bed(vec2 f, float r, float a, inout float glow) {
  vec2 s = sac(r, a);
  float k = clamp(smoothstep(0.3, 0.75, vn(vec3(f * 2.6, 7.0))) + (s.y - 0.5) * 0.4, 0.0, 1.0);
  vec3 juice = mix(vec3(0.55, 0.13, 0.008), vec3(0.28, 0.008, 0.012), k);
  vec3 col = mix(juice * 1.5, juice, smoothstep(0.0, 0.3, s.x));
  glow = 0.8;
  return col * 0.8;
}`;

export const orange = {
  id: 'orange', label: 'Orange', A, B, C,
  shape: (() => {
    const nz = createNoise3D(rng(13));
    return (t, ph, e) => Math.pow(Math.max(0, 1 - t * t), 0.5) * (1 + e * t * 0.3)
      * (1 + 0.012 * t * nz(Math.cos(ph) * 2, Math.sin(ph) * 2, t * 2 + (e > 0 ? 4 : 0)));
  })(),
  look: {
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
  face(U, g, R) {
    const bed = bedMesh(U, this, BED, { bumpK: 1, wet: 0.9, depth: 0.004 });
    const floor = bedMesh(U, this, FLOOR, { depth: 0.16, wet: 0.4 });
    // Vesicles: in each segment, rows from the core out to the albedo.
    const list = [];
    const flush = createNoise3D(rng(31));
    for (let i = 0; i < NS; i++) {
      const a0 = wallA(i), a1 = i + 1 < NS ? wallA(i + 1) : wallA(0) + Math.PI * 2;
      let rr = CORE + 0.02;
      while (rr < ALB - 0.04) {
        const wid = 0.017 + rr * 0.014;
        // The last row shortens to end at the albedo.
        const len = Math.min(wid * 4.6, (ALB - rr) * 0.55);
        const c = rr + len * 0.8;
        const pad = 0.01 / c;
        const span = a1 - a0 - pad * 2;
        const n = Math.max(1, Math.round((span * c) / (wid * 1.4)));
        for (let j = 0; j < n; j++) {
          const a = a0 + pad + span * (j + 0.5 + (R() - 0.5) * 0.4) / n;
          // Staggered along the ray, so no rows show.
          const cc = c + (R() - 0.5) * len * 0.5;
          // They lie right at the cut, so the knife opens each down its middle.
          list.push({ c: new THREE.Vector3(-0.001 - R() * 0.007, Math.cos(a) * cc * B, Math.sin(a) * cc * C), r: wid * B, a, stretch: Math.min(5.2, len / wid * 1.05) });
        }
        rr = c + len * 0.8;
      }
    }
    const pulp = makeArils(U, list, R, {
      // Each points out to the peel along its ray, a little tipped.
      axis: (v, Rr) => new THREE.Vector3((Rr() - 0.5) * 0.15, Math.cos(v.a) + (Rr() - 0.5) * 0.15, Math.sin(v.a) + (Rr() - 0.5) * 0.15).normalize(),
      stretch: [5.2, 0.95], point: 0.3, lumpy: 0.05, soft: 0.3,
      // The flush runs in patches across the face; each vesicle varies on it.
      color: (() => {
        let k = 0;
        return Rr => {
          const v = list[k++];
          const p = flush(v.c.y * 2.2, v.c.z * 2.2, 0.3);
          const t = Math.min(1, Math.max(0, 0.5 + p * 0.9 + (Rr() - 0.5) * 0.35));
          return [0.97 - t * 0.33, 0.4 - t * 0.38, 0.03 + t * 0.02];
        };
      })(),
      sig: Rr => 0.6 + Rr() * 0.35,
      seedK: 0, rs: 0, cut: CUT, scale: 1.0, scatter: 0.6, behind: 1.0,
      deep: [-0.06, 0.0], deepShade: 0.8, detail: 2, bound: 5.3, nearK: 5.4,
    });
    g.add(bed, floor, pulp);
    return { bed, parts: [bed, floor, pulp] };
  },
};
