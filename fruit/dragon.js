// Dragon fruit: magenta skin with curled bracts, magenta to green; white flesh, black seeds.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { bedMesh, solidMaterial } from './half.js';

const A = 1.0, B = 0.78, C = 0.78;

const BED = /* glsl */`
// Seeds: one per cell, a dark speck in a clear halo of gel.
vec2 dseed(vec2 f) { return cells(f * 30.0 + vec2(vn(vec3(f * 3.0, 1.0)), vn(vec3(f * 3.0, 2.0))) * 2.0); }
float relief(vec2 f) { vec2 c = dseed(f); return 0.0015 * (1.0 - smoothstep(0.1, 0.3, c.x)) * step(0.2, c.y); }
vec3 bed(vec2 f, float r, float a, inout float glow) {
  vec3 flesh = vec3(0.56, 0.55, 0.5) * (0.9 + 0.1 * vn(vec3(f * 26.0, 1.0)));
  vec2 c = dseed(f);
  float has = step(0.2, c.y) * smoothstep(0.05, 0.12, r) * (1.0 - smoothstep(0.84, 0.88, r));
  float gel = (1.0 - smoothstep(0.16, 0.36, c.x)) * has;
  float seed = (1.0 - smoothstep(0.1, 0.16, c.x)) * has;
  vec3 col = mix(flesh, flesh * 0.62, gel * 0.7);
  col = mix(col, vec3(0.012, 0.01, 0.01), seed);
  // The rind: a pink layer, then the magenta skin.
  col = mix(col, vec3(0.5, 0.05, 0.2), smoothstep(0.88, 0.93, r));
  col = mix(col, vec3(0.62, 0.03, 0.22), smoothstep(0.965, 0.975, r));
  glow = (1.0 - smoothstep(0.86, 0.92, r)) * (0.4 + 0.6 * smoothstep(0.4, 0.86, r));
  return col;
}`;

// The bracts: leaf-like scales lying along the skin, tips curled out.
function bracts(F, e, R) {
  const parts = [];
  const rows = [0.12, 0.32, 0.52, 0.7, 0.86];
  rows.forEach((t, ri) => {
    const n = ri === 4 ? 5 : 7;
    for (let k = 0; k < n; k++) {
      const ph = (k + (ri % 2) * 0.5 + (R() - 0.5) * 0.2) / n * Math.PI * 2;
      const r = F.shape(t, ph, e);
      const P = new THREE.Vector3(-F.A * t, F.B * r * Math.cos(ph), F.C * r * Math.sin(ph));
      const N = new THREE.Vector3(P.x / F.A ** 2, P.y / F.B ** 2, P.z / F.C ** 2).normalize();
      const T = new THREE.Vector3(-1, 0, 0).addScaledVector(N, N.x).normalize();
      const S = new THREE.Vector3().crossVectors(N, T);
      const len = (0.42 - t * 0.12) * (0.85 + R() * 0.3), wid = 0.14 + R() * 0.03;
      const U = 10, V = 6, pos = [], tip = [], idx = [];
      for (let i = 0; i <= U; i++) for (let j = 0; j <= V; j++) {
        const u = i / U, v = j / V * 2 - 1;
        // The bract widens, then tapers to a point; its tip lifts and curls out.
        const w = wid * Math.sin(Math.PI * Math.pow(u, 0.7)) * (1 - 0.35 * u);
        const lift = 0.006 + 0.16 * u * u * u + 0.012 * (1 - v * v);
        const p = P.clone().addScaledVector(T, u * len).addScaledVector(S, v * w).addScaledVector(N, lift);
        pos.push(p.x, p.y, p.z);
        tip.push(u);
      }
      for (let i = 0; i < U; i++) for (let j = 0; j < V; j++) {
        const a = i * (V + 1) + j, b = a + V + 1;
        idx.push(a, b, a + 1, a + 1, b, b + 1);
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute('aTip', new THREE.Float32BufferAttribute(tip, 1));
      g.setIndex(idx);
      parts.push(g);
    }
  });
  const g = mergeGeometries(parts);
  g.computeVertexNormals();
  return g;
}

export const dragon = {
  id: 'dragon', label: 'Dragon fruit', A, B, C,
  shape: (t, ph, e) => Math.pow(Math.max(0, 1 - t * t), 0.5) * (1 + e * t * 0.3),
  look: {
    skinA: [0.36, 0.008, 0.08], skinB: [0.55, 0.02, 0.14], mottle: 3,
    blush: [0.3, 0.2, 0.04], blushK: 0.15, blushDir: [1, 0, 0],
    pores: 0.04, poreScale: 30, rough: 0.38, f0: 0.04, wrap: 0.3, sss: [0.6, 0.05, 0.2],
    sheen: [0.05, 0.01, 0.03], tipDark: 0.1,
  },
  fuzz: { k: 0, root: [[0.4, 0.01, 0.12], [0.6, 0.03, 0.2]], tip: [0.35, 0.45, 0.08], trans: [0.8, 0.3, 0.4], len: 0.07, width: 1 },
  juice: [0.85, 0.82, 0.78],
  glow: 0.45,
  tip(U, g, mat, e) {
    let s = 3 + (e > 0 ? 1 : 0);
    const R = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    g.add(new THREE.Mesh(bracts(this, e, R), solidMaterial(U, {
      col: 'mix(vec3(0.5, 0.015, 0.14), mix(vec3(0.16, 0.3, 0.03), vec3(0.42, 0.42, 0.06), smoothstep(0.85, 1.0, vTip)), smoothstep(0.45, 0.9, vTip))',
      rough: 0.4, wrap: 0.5, sss: 'vec3(0.5, 0.6, 0.2)', side: THREE.DoubleSide,
    })));
    const n = new THREE.SphereGeometry(1, 16, 10);
    n.scale(0.05, 0.08, 0.08);
    n.translate(-A + 0.01, 0, 0);
    g.add(new THREE.Mesh(n, mat));
  },
  face(U, g) {
    const bed = bedMesh(U, this, BED, { bumpK: 1, wet: 1.1 });
    g.add(bed);
    return { bed, parts: [bed] };
  },
};
