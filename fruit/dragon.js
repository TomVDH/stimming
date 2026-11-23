// Dragon fruit: a crimson-magenta egg clad in thick, fleshy bracts that lift into green tips,
// a crown of them at one end. The cut: grey-white translucent flesh, wet, with small black
// seeds spread through it, each in a faint clear halo; a thick magenta rind that blushes inward.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { bedMesh, solidMaterial } from './half.js';

const A = 1.0, B = 0.76, C = 0.76;
const GOLD = Math.PI * (3 - Math.sqrt(5));

const BED = /* glsl */`
// Seeds: about one in each small cell, jittered, oval, each at its own angle.
vec3 dseed(vec2 f) {
  vec2 q = f * 26.0 + vec2(vn(vec3(f * 4.0, 1.0)), vn(vec3(f * 4.0, 2.0))) * 1.6;
  vec2 i = floor(q), fr = fract(q);
  float best = 9.0, id = 0.0;
  vec2 dv = vec2(0.0);
  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
    vec2 g = vec2(x, y);
    vec2 o = vec2(h12(i + g), h12(i + g + 17.3));
    vec2 d = g + 0.15 + o * 0.7 - fr;
    float h = h12(i + g + 5.7);
    // A seed is an oval at its own angle.
    float an = h * 6.2832;
    vec2 e = vec2(dot(d, vec2(cos(an), sin(an))), dot(d, vec2(-sin(an), cos(an)))) / vec2(1.0, 0.62);
    float dd = length(e);
    if (dd < best) { best = dd; id = h; dv = d; }
  }
  return vec3(best, id, 0.0);
}
float fleshMask(float r) { return 1.0 - smoothstep(0.83, 0.88, r); }
float relief(vec2 f) {
  vec3 s = dseed(f);
  float r = length(f);
  float has = step(0.25, s.y);
  // Seeds stand a hair proud; the flesh between is finely crinkled under the juice.
  float seed = (1.0 - smoothstep(0.12, 0.2, s.x)) * has * 0.0025;
  vec2 c = cellEdge(f * 46.0 + vn(vec3(f * 7.0, 3.0)) * 1.5);
  float crinkle = 0.0016 * sqrt(clamp(c.x / 0.5, 0.0, 1.0)) + 0.0025 * vn(vec3(f * 8.0, 4.0));
  return (seed + crinkle) * fleshMask(r) + 0.0008 * vn(vec3(f * 50.0, 5.0)) * (1.0 - fleshMask(r));
}
vec3 bed(vec2 f, float r, float a, inout float glow) {
  vec3 s = dseed(f);
  float has = step(0.25, s.y) * smoothstep(0.03, 0.08, r) * fleshMask(r);
  // Flesh: white with a grey translucence, clouded; brightest where it is thickest.
  float cloud = vn(vec3(f * 5.0, 6.0)) * 0.6 + vn(vec3(f * 13.0, 7.0)) * 0.4;
  vec3 flesh = mix(vec3(0.4, 0.41, 0.41), vec3(0.6, 0.6, 0.6), smoothstep(0.25, 0.75, cloud));
  vec2 c = cellEdge(f * 46.0 + vn(vec3(f * 7.0, 3.0)) * 1.5);
  flesh *= 0.9 + 0.12 * smoothstep(0.0, 0.3, c.x);
  // Each seed sits in a small clear halo, a touch darker.
  flesh *= 1.0 - 0.25 * (1.0 - smoothstep(0.16, 0.4, s.x)) * has;
  vec3 col = mix(flesh, vec3(0.012, 0.01, 0.01), (1.0 - smoothstep(0.13, 0.19, s.x)) * has);
  // The rind: the flesh blushes pink, then thick magenta, darkest at the skin.
  float edge = r + 0.01 * sin(a * 9.0) + 0.012 * (vn(vec3(a * 5.0, 1.0, 9.0)) - 0.5);
  col = mix(col, vec3(0.5, 0.18, 0.26), smoothstep(0.74, 0.84, edge) * 0.6);
  col = mix(col, vec3(0.42, 0.018, 0.12), smoothstep(0.85, 0.885, edge));
  col = mix(col, vec3(0.3, 0.008, 0.08), smoothstep(0.95, 0.975, r));
  glow = fleshMask(r) * 0.7;
  return col;
}`;

// One bract: a thick, fleshy, pointed leaf lying on the skin at P, lifting at its tip.
// Two surfaces that meet at the edges and the tip, so it reads solid.
function bract(P, N, T, len, wid, thick, curl) {
  const S = new THREE.Vector3().crossVectors(N, T);
  const U = 14, V = 8, pos = [], tip = [], idx = [];
  for (const side of [1, -1]) {
    const o = pos.length / 3;
    for (let i = 0; i <= U; i++) for (let j = 0; j <= V; j++) {
      const u = i / U, v = j / V * 2 - 1;
      // Broad at the base, a long point; the tip lifts off the skin and curls out.
      const w = wid * Math.pow(1 - u, 0.85) * Math.min(1, u * 6 + 0.35);
      const lift = curl * u * u * u + 0.004;
      const th = side > 0 ? thick * Math.pow(1 - u, 0.6) * (1 - v * v) : 0;
      const p = P.clone().addScaledVector(T, u * len * (1 - 0.15 * curl * u)).addScaledVector(S, v * w).addScaledVector(N, lift + th - 0.006 * (1 - u));
      pos.push(p.x, p.y, p.z);
      tip.push(u);
    }
    for (let i = 0; i < U; i++) for (let j = 0; j < V; j++) {
      const a = o + i * (V + 1) + j, b = a + V + 1;
      if (side > 0) idx.push(a, b, a + 1, a + 1, b, b + 1);
      else idx.push(a, a + 1, b, a + 1, b + 1, b);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('aTip', new THREE.Float32BufferAttribute(tip, 1));
  g.setIndex(idx);
  return g;
}

// The bracts of one half, set in a spiral; the crowned half ends in a ring of them.
function bracts(F, e, R) {
  const parts = [];
  const crown = e > 0;
  const n = crown ? 12 : 10;
  for (let k = 0; k < n; k++) {
    const t = 0.1 + (k / n) * 0.72 + (R() - 0.5) * 0.04;
    const ph = k * GOLD + (crown ? 0.4 : 1.9) + (R() - 0.5) * 0.3;
    const r = F.shape(t, ph, e);
    const P = new THREE.Vector3(-F.A * t, F.B * r * Math.cos(ph), F.C * r * Math.sin(ph));
    const N = new THREE.Vector3(P.x / F.A ** 2, P.y / F.B ** 2, P.z / F.C ** 2).normalize();
    // Each lies along the fruit toward the crowned end, a little twisted.
    const T = new THREE.Vector3(-1, (R() - 0.5) * 0.4, (R() - 0.5) * 0.4).addScaledVector(N, -new THREE.Vector3(-1, 0, 0).dot(N)).normalize();
    const big = crown ? 1 + t * 0.5 : 0.9 - t * 0.3;
    parts.push(bract(P, N, T, (0.5 + R() * 0.12) * big, (0.17 + R() * 0.04) * big, 0.035 * big, 0.09 + R() * 0.06));
  }
  if (crown) {
    // The crown: a ring of bracts round the tip, pointing out along the axis.
    for (let k = 0; k < 6; k++) {
      const ph = (k / 6) * Math.PI * 2 + R() * 0.3, t = 0.9;
      const r = F.shape(t, ph, e);
      const P = new THREE.Vector3(-F.A * t, F.B * r * Math.cos(ph), F.C * r * Math.sin(ph));
      const out = new THREE.Vector3(0, Math.cos(ph), Math.sin(ph));
      const T = new THREE.Vector3(-1, 0, 0).addScaledVector(out, 0.35).normalize();
      const N = out.clone().addScaledVector(T, -out.dot(T)).normalize();
      parts.push(bract(P, N, T, 0.42 + R() * 0.12, 0.12, 0.03, 0.18));
    }
  }
  const g = mergeGeometries(parts);
  g.computeVertexNormals();
  return g;
}

export const dragon = {
  id: 'dragon', label: 'Dragon fruit', A, B, C,
  // An egg, the crowned end a little narrower.
  shape: (t, ph, e) => Math.pow(Math.max(0, 1 - t * t), 0.5) * (1 + e * t * 0.4),
  look: {
    thru: [0.9, 0.08, 0.3], thruK: 2.5,
    skinA: [0.2, 0.003, 0.045], skinB: [0.36, 0.01, 0.085], mottle: 3,
    blush: [0.42, 0.1, 0.05], blushK: 0.2, blushDir: [0, -1, 0.2],
    pores: 0.04, poreScale: 40, rough: 0.42, f0: 0.04, wrap: 0.3, sss: [0.6, 0.05, 0.18],
    sheen: [0.06, 0.01, 0.03], tipDark: 0.15,
    glsl: /* glsl */`
      // Faint long streaks, and a waxy bloom that dulls the skin in patches.
      base *= 0.9 + 0.12 * vn(vec3(fp.x * 4.0, fp.y * 18.0, fp.z * 18.0));
      roughAdd += 0.15 * smoothstep(0.4, 0.8, vn(fp * 3.0 + 4.0));`,
  },
  fuzz: { k: 0, root: [[0.4, 0.01, 0.12], [0.6, 0.03, 0.2]], tip: [0.35, 0.45, 0.08], trans: [0.8, 0.3, 0.4], len: 0.07, width: 1 },
  juice: [0.85, 0.82, 0.8],
  glow: 0.45,
  tip(U, g, mat, e) {
    let s = 3 + (e > 0 ? 1 : 0);
    const R = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    g.add(new THREE.Mesh(bracts(this, e, R), solidMaterial(U, {
      // Crimson at the base, merging into the skin; green toward the tip, yellow at the very end.
      col: 'mix(vec3(0.46, 0.008, 0.1), mix(vec3(0.1, 0.2, 0.025), vec3(0.34, 0.36, 0.05), smoothstep(0.88, 1.0, vTip)), smoothstep(0.42, 0.85, vTip)) * (0.85 + 0.25 * vn(vL * 30.0))',
      rough: 0.38, wrap: 0.5, sss: 'vec3(0.5, 0.6, 0.2)', side: THREE.DoubleSide,
    })));
    if (e < 0) {
      // The stalk end: a short dry stub.
      const n = new THREE.CylinderGeometry(0.04, 0.06, 0.06, 12);
      n.rotateZ(Math.PI / 2);
      n.translate(-A - 0.01, 0, 0);
      g.add(new THREE.Mesh(n, solidMaterial(U, { col: 'vec3(0.12, 0.08, 0.03)', rough: 0.7 })));
    }
  },
  face(U, g) {
    const bed = bedMesh(U, this, BED, { bumpK: 2.5, wet: 0.8, rough: 0.5, wrap: 0.7 });
    g.add(bed);
    return { bed, parts: [bed] };
  },
};
