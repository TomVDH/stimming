// Passion fruit: a wrinkled, dimpled purple shell with fine white specks.
// Inside, a thick cream pith lined with a thin yellow skin holds a mound of pulp:
// jelly sacs, golden and soft, a black seed in each, glistening in their juice.
import * as THREE from 'three';
import { bedMesh, solidMaterial } from './half.js';
import { makeArils } from './arils.js';

const A = 0.8, B = 0.74, C = 0.74;
// The cavity, in face units.
const CAV = 0.72;

const BED = /* glsl */`
vec2 sponge(vec2 f) { return cellEdge(f * 46.0); }
float relief(vec2 f) { return 0.0014 * smoothstep(0.0, 0.25, sponge(f).x) + 0.001 * vn(vec3(f * 18.0, 2.0)); }
vec3 bed(vec2 f, float r, float a, inout float glow) {
  // The cavity is open: the pulp shows down to the juice below.
  float cav = ${CAV.toFixed(3)} + 0.012 * sin(a * 9.0 + 1.0) + 0.006 * sin(a * 23.0);
  if (r < cav - 0.004) discard;
  // The pith: thick and cream, spongy, a faint purple flush near the shell.
  vec2 sp = sponge(f);
  vec3 col = mix(vec3(0.6, 0.56, 0.46), vec3(0.68, 0.64, 0.52), vn(vec3(f * 10.0, 3.0)));
  col *= 0.86 + 0.14 * smoothstep(0.0, 0.25, sp.x);
  col = mix(col, vec3(0.42, 0.24, 0.32), smoothstep(0.84, 0.95, r) * 0.55);
  // The lining: a thin yellow skin round the cavity, shaded at its lip.
  float lin = 1.0 - smoothstep(cav + 0.008, cav + 0.022, r);
  col = mix(col, vec3(0.5, 0.4, 0.08), lin * 0.9);
  col *= 0.55 + 0.45 * smoothstep(cav - 0.004, cav + 0.03, r);
  // The shell at the edge: dark purple.
  col = mix(col, vec3(0.1, 0.02, 0.07), smoothstep(0.958, 0.968, r));
  glow = lin * 0.4;
  return col;
}`;

const FLOOR = /* glsl */`
float relief(vec2 f) { return 0.0; }
vec3 bed(vec2 f, float r, float a, inout float glow) { glow = 0.6; return vec3(0.22, 0.1, 0.004); }`;

export const passion = {
  id: 'passion', label: 'Passion fruit', A, B, C,
  shape: (t, ph, e) => Math.pow(Math.max(0, 1 - t * t), 0.5) * (1 + e * t * 0.2),
  look: {
    thru: [0.5, 0.12, 0.25], thruK: 4,
    skinA: [0.025, 0.004, 0.02], skinB: [0.09, 0.014, 0.06], mottle: 3,
    blush: [0.11, 0.02, 0.045], blushK: 0.3, blushDir: [0.3, 0.8, 0.2],
    rough: 0.36, f0: 0.04, wrap: 0.25, sss: [0.4, 0.05, 0.25],
    speck: [0.8, 150, 0.45], speckCol: [0.4, 0.34, 0.36],
    sheen: [0.05, 0.03, 0.05], tipDark: 0.15,
    glsl: /* glsl */`
      // Wrinkles: slow folds, and small dimples on them. The skin shrinks as it ripens.
      {
        vec3 q = fp * 4.5;
        float e = 0.04;
        float h0 = vn(q) + 0.35 * vn(q * 3.7);
        vec3 gr = vec3(vn(q + vec3(e, 0, 0)) + 0.35 * vn((q + vec3(e, 0, 0)) * 3.7) - h0,
                       vn(q + vec3(0, e, 0)) + 0.35 * vn((q + vec3(0, e, 0)) * 3.7) - h0,
                       vn(q + vec3(0, 0, e)) + 0.35 * vn((q + vec3(0, 0, e)) * 3.7) - h0) / e;
        n = normalize(n - 0.24 * (gr - n * dot(gr, n)));
        // The valleys are darker and duller.
        base *= 0.55 + 0.6 * smoothstep(0.25, 0.75, h0);
        roughAdd += 0.25 * (1.0 - smoothstep(0.3, 0.7, h0));
      }`,
  },
  fuzz: { k: 0, root: [[0.05, 0.01, 0.04], [0.15, 0.04, 0.1]], tip: [0.35, 0.25, 0.3], trans: [0.6, 0.4, 0.5], len: 0.07, width: 1 },
  juice: [0.98, 0.66, 0.08],
  glow: 0.6,
  tip(U, g, mat, e) {
    if (e > 0) {
      const st = new THREE.CylinderGeometry(0.018, 0.03, 0.09, 10);
      st.rotateZ(Math.PI / 2);
      st.translate(-A - 0.035, 0, 0);
      g.add(new THREE.Mesh(st, solidMaterial(U, { col: 'vec3(0.12, 0.13, 0.04)', rough: 0.6 })));
      // A small dry collar where the stalk meets the shell.
      const col = new THREE.TorusGeometry(0.035, 0.012, 8, 20);
      col.rotateY(Math.PI / 2);
      col.translate(-A + 0.005, 0, 0);
      g.add(new THREE.Mesh(col, solidMaterial(U, { col: 'vec3(0.12, 0.09, 0.04)', rough: 0.7 })));
    }
  },
  face(U, g, R) {
    const bed = bedMesh(U, this, BED, { bumpK: 1, wet: 0.9, depth: 0.004 });
    const floor = bedMesh(U, this, FLOOR, { depth: 0.17, wet: 0.6 });
    // The pulp: sacs packed in a mound that rises above the cut in the middle.
    const list = [];
    for (let k = 0; k < 90000 && list.length < 300; k++) {
      const fr = Math.sqrt(R()) * (CAV - 0.03), a = R() * Math.PI * 2;
      const r = (0.05 + R() ** 2 * 0.05) * B;
      if (fr + (r / B) * 0.55 > CAV) continue;
      const top = 0.04 * (1 - (fr / CAV) ** 2) - 0.004;
      const c = new THREE.Vector3(top - R() * 0.13, Math.cos(a) * fr * B, Math.sin(a) * fr * C);
      if (list.some(o => o.c.distanceToSquared(c) < ((o.r + r) * 0.76) ** 2)) continue;
      list.push({ c, r, loose: true });
    }
    const pulp = makeArils(U, list, R, {
      // Soft round sacs, a little lumpy, squeezed against each other.
      axis: (a, Rr) => new THREE.Vector3(Rr() - 0.5, Rr() - 0.5, Rr() - 0.5).normalize(),
      stretch: [1.22, 0.92], point: 0.12, lumpy: 0.09, soft: 0.4,
      color: Rr => { const t = Rr(); return [0.97, 0.52 + t * 0.2, 0.025 + t * 0.03]; },
      sig: Rr => 0.55 + Rr() * 0.35,
      // A big dark seed sits near the middle of each sac.
      seedK: 0.32, rs: 0.27, seedCol: [0.02, 0.014, 0.01],
      cut: null, scale: 1.1, scatter: 0.6, behind: 0.4, deep: [-0.15, 0.0], deepShade: 0.3,
    });
    g.add(bed, floor, pulp);
    return { bed, parts: [bed, floor, pulp] };
  },
};
