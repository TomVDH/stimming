// Peach: golden velvet with a red blush and a crease; gold flesh round a wrinkled stone.
// One half keeps the stone; the other shows the empty pit.
import * as THREE from 'three';
import { createNoise3D } from 'simplex-noise';
import { bedMesh, solidMaterial, rng } from './half.js';

const A = 0.82, B = 0.86, C = 0.84;
// The stone, in face units: half its height and width.
const SY = 0.38, SZ = 0.29;

// The flesh: pale cream, wet and fibrous; dark red threads run out from the stone.
// Reference: a halved red peach, Commons "Autumn_Red_peaches.jpg".
const bedGLSL = pit => /* glsl */`
// e: the distance from the stone, 1 at its edge.
float stoneE(vec2 f) { return length(f / vec2(${SY.toFixed(2)}, ${SZ.toFixed(2)})); }
// How far the red reaches out along angle a, in stone units.
float reach(float a) {
  vec2 u = vec2(cos(a), sin(a));
  return 1.25 + 0.9 * vn(vec3(u * 2.2, 3.0)) + 0.6 * vn(vec3(u * 7.0, 4.0));
}
// Fibre threads: thin radial lines, warped so no two run parallel for long.
float fibre(vec2 f, float r, float a) {
  float w = a * 30.0 + 3.0 * vn(vec3(f * 4.0, 1.0)) + 1.0 * vn(vec3(f * 12.0, 2.0));
  float l = abs(fract(w) - 0.5) * 2.0;
  // Each thread breaks and starts again along its length.
  float on = smoothstep(0.35, 0.6, vn(vec3(floor(w), r * 9.0, 5.0)));
  return (1.0 - smoothstep(0.0, 0.55, l * (0.8 + 0.6 * vn(vec3(f * 9.0, 6.0))))) * on;
}
float relief(vec2 f) {
  float r = length(f), a = atan(f.y, f.x);
  // Torn cells: small round domes, long along the fibres.
  vec2 q = vec2(a * r * 26.0, r * 14.0) + vec2(vn(vec3(f * 7.0, 6.0)), vn(vec3(f * 7.0, 7.0))) * 1.6;
  vec2 ce = cellEdge(q);
  float dome = 0.0016 * sqrt(clamp(ce.x / 0.5, 0.0, 1.0));
  // A slow swell, so the wet shine forms patches.
  return dome + 0.0035 * vn(vec3(f * 6.0, 8.0)) + 0.001 * fibre(f, r, a);
}
vec3 bed(vec2 f, float r, float a, inout float glow) {
  float e = stoneE(f);
  // Cream at the middle, warmer yellow toward the skin.
  vec3 cream = mix(vec3(0.68, 0.42, 0.12), vec3(0.76, 0.4, 0.08), smoothstep(0.45, 0.95, r));
  cream *= 0.92 + 0.12 * vn(vec3(f * 4.0, 9.0));
  // The red: dense at the stone, thinning into threads at its reach.
  float rr = reach(a);
  float dense = 1.0 - smoothstep(1.0, 1.0 + 0.45 * rr, e);
  float thread = fibre(f, r, a) * (1.0 - smoothstep(0.2 * rr, rr + 0.2, e - 1.0));
  vec3 deep = vec3(0.34, 0.015, 0.02), wine = vec3(0.55, 0.06, 0.04);
  vec3 red = mix(deep, wine, smoothstep(1.0, 1.0 + 0.5 * rr, e));
  vec3 col = mix(cream, red, clamp(dense * 0.95 + thread * 0.5, 0.0, 1.0));
  // A soft pink haze between the threads, so the red fades, not stops.
  col = mix(col, mix(cream, wine, 0.5), (1.0 - smoothstep(1.0, 1.0 + rr * 1.3, e)) * 0.35 * (1.0 - dense));
  ${pit ? `// Round the hollow the flesh is torn and darkest.
  col = mix(col, vec3(0.22, 0.01, 0.014), (1.0 - smoothstep(1.0, 1.12, e)) * 0.85);` : ''}
  // Under a blushed skin the flesh turns red too, in patches.
  float blush = smoothstep(0.35, 0.75, vn(vec3(cos(a) * 1.6, sin(a) * 1.6, 11.0)));
  col = mix(col, wine, smoothstep(0.88, 0.975, r) * blush * 0.6);
  // The skin: a thin red and gold line.
  col = mix(col, mix(vec3(0.6, 0.26, 0.04), vec3(0.4, 0.03, 0.02), blush), smoothstep(0.972, 0.982, r));
  glow = smoothstep(0.4, 0.95, r) * (1.0 - smoothstep(0.96, 0.98, r)) * (1.0 - dense);
  return col;
}`;

export const peach = {
  id: 'peach', label: 'Peach', A, B, C,
  // A round body; a crease runs down one side, and the tip comes to a small point.
  shape: (t, ph, e) => {
    const d = Math.atan2(Math.sin(ph), Math.cos(ph));
    const crease = 0.075 * Math.exp(-((d / 0.17) ** 2));
    return Math.pow(Math.max(0, 1 - t * t), 0.46) * (1 + e * t * 0.4) * (1 - crease);
  },
  look: {
    thru: [1.0, 0.45, 0.2], thruK: 2.2,
    skinA: [0.72, 0.33, 0.05], skinB: [0.86, 0.47, 0.09], mottle: 5,
    blush: [0.48, 0.025, 0.02], blushK: 0.9, blushDir: [0.25, 0.85, 0.45],
    pores: 0.04, poreScale: 40, rough: 0.8, f0: 0.03, wrap: 0.45, sss: [0.9, 0.35, 0.15],
    speck: [0.8, 70, 0.7], speckCol: [0.7, 0.36, 0.1],
    sheen: [0.5, 0.3, 0.2], tipDark: 0,
  },
  fuzz: { k: 0.35, root: [[0.5, 0.1, 0.03], [0.62, 0.26, 0.06]], tip: [0.72, 0.56, 0.4], trans: [0.95, 0.72, 0.5], len: 0.04, width: 0.6 },
  juice: [0.98, 0.58, 0.12],
  glow: 0.5,
  // A short stem and a leaf on one half; a small point on the other.
  tip(U, g, mat, e) {
    if (e > 0) {
      const st = new THREE.CylinderGeometry(0.018, 0.026, 0.08, 10);
      st.rotateZ(Math.PI / 2);
      st.translate(-A - 0.02, 0, 0);
      g.add(new THREE.Mesh(st, solidMaterial(U, { col: 'vec3(0.12, 0.06, 0.025)', rough: 0.7 })));
      // The leaf: a flat curved oval, lit green.
      const lf = new THREE.SphereGeometry(1, 24, 12);
      lf.scale(0.012, 0.22, 0.08);
      const P = lf.attributes.position;
      for (let i = 0; i < P.count; i++) P.setX(i, P.getX(i) + 0.35 * (P.getY(i) / 0.22) ** 2 * 0.12);
      lf.computeVertexNormals();
      lf.translate(0, 0.21, 0);
      lf.rotateX(-0.5);
      lf.rotateZ(0.5);
      lf.translate(-A - 0.04, 0.0, 0.0);
      g.add(new THREE.Mesh(lf, solidMaterial(U, { col: 'mix(vec3(0.05, 0.2, 0.02), vec3(0.14, 0.34, 0.04), smoothstep(-0.1, 0.4, vL.y))', rough: 0.45, wrap: 0.5, sss: 'vec3(0.6, 1.0, 0.3)' })));
    } else {
      const n = new THREE.ConeGeometry(0.03, 0.05, 12);
      n.rotateZ(Math.PI / 2);
      n.translate(-A - 0.01, 0, 0);
      g.add(new THREE.Mesh(n, mat));
    }
  },
  face(U, g, R, e) {
    const pit = e > 0;
    const bed = bedMesh(U, this, bedGLSL(pit), { bumpK: 1, wet: 0.9, hole: pit ? [SY * 0.96, SZ * 0.96] : null });
    g.add(bed);
    const parts = [bed];
    if (pit) {
      // The hollow the stone left: a half oval, seen from inside, red and fibrous.
      const hg = new THREE.SphereGeometry(1, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2);
      hg.rotateZ(Math.PI / 2);
      hg.scale(0.19, SY * B * 0.96, SZ * C * 0.96);
      hg.translate(-0.012, 0, 0);
      const hollow = new THREE.Mesh(hg, solidMaterial(U, { col: 'mix(vec3(0.16, 0.008, 0.012), vec3(0.42, 0.04, 0.03), smoothstep(-0.12, 0.0, vL.x)) * (0.75 + 0.35 * vn(vec3(vL.yz * 90.0, vL.x * 12.0)))', rough: 0.5, f0: 0.02, wrap: 0.6, sss: 'vec3(0.9, 0.12, 0.06)', bump: 0.25, bumpScale: 70, side: THREE.BackSide }));
      g.add(hollow);
      parts.push(hollow);
    } else {
      // The stone: an almond, deep furrows and pits, red flesh caught in them.
      const sg = new THREE.SphereGeometry(1, 128, 96);
      const noise = createNoise3D(rng(7));
      const P = sg.attributes.position, v = new THREE.Vector3(), tip = [];
      for (let i = 0; i < P.count; i++) {
        v.fromBufferAttribute(P, i);
        // Furrows where the noise crosses zero; smaller pits between them.
        const f1 = Math.abs(noise(v.x * 2.4, v.y * 1.5, v.z * 2.4));
        const pit = Math.max(0, noise(v.x * 6, v.y * 5, v.z * 6) - 0.35);
        const k = 0.88 + 0.14 * Math.min(1, f1 * 2.2) - 0.12 * pit;
        // The stone narrows to a point at one end.
        const w = 1 - 0.28 * Math.max(v.y, 0) ** 2;
        P.setXYZ(i, v.x * k * w, v.y * k * (v.y > 0 ? 1.06 : 1), v.z * k * w);
        // aTip carries the depth: 0 deep in a furrow, 1 on a ridge.
        tip.push(Math.min(1, f1 * 2.2) * (1 - Math.min(1, pit * 3)));
      }
      sg.setAttribute('aTip', new THREE.Float32BufferAttribute(tip, 1));
      sg.computeVertexNormals();
      sg.scale(0.2, SY * B * 0.92, SZ * C * 0.92);
      const stone = new THREE.Mesh(sg, solidMaterial(U, { col: 'mix(mix(vec3(0.3, 0.012, 0.016), vec3(0.05, 0.012, 0.008), smoothstep(0.1, 0.4, vTip) * (1.0 - smoothstep(0.55, 0.9, vTip))), vec3(0.2, 0.06, 0.03), smoothstep(0.6, 1.0, vTip)) * (0.8 + 0.3 * vn(vL * 50.0))', rough: 0.55, wrap: 0.35, sss: 'vec3(0.5, 0.05, 0.03)', bump: 0.35, bumpScale: 90 }));
      g.add(stone);
      parts.push(stone);
    }
    return { bed, parts };
  },
};
