// Mangosteen: a deep purple ball under a green cap; a thick crimson rind round white segments.
import * as THREE from 'three';
import { bedMesh, solidMaterial } from './half.js';

const A = 0.68, B = 0.82, C = 0.82;
// The segments: six, of uneven size. JS writes their walls into the GLSL.
const WALLS = [0, 1.02, 2.15, 3.2, 4.15, 5.2].map(x => x.toFixed(3));

const BED = /* glsl */`
vec2 mseg(float a, float r) {
  float d = 9.0, s = 0.0, best = 9.0;
  ${WALLS.map((w, i) => `{ float q = mod(a - ${w} + 9.4248, 6.2832) - 3.1416; d = min(d, abs(q) * r); if (q > 0.0 && q < best) { best = q; s = ${i}.0; } }`).join('\n  ')}
  return vec2(d, s);
}
float relief(vec2 f) {
  float r = length(f), a = atan(f.y, f.x);
  float inFlesh = 1.0 - smoothstep(0.54, 0.57, r);
  // Each segment bulges; the walls sink.
  return (0.006 * smoothstep(0.0, 0.08, mseg(a, r).x) - 0.003 + 0.004 * (1.0 - smoothstep(0.3, 0.56, r))) * inFlesh + 0.0008 * vn(vec3(f * 50.0, 1.0)) * (1.0 - inFlesh);
}
vec3 bed(vec2 f, float r, float a, inout float glow) {
  vec2 sg = mseg(a, r);
  // Snow-white flesh, faintly fibrous.
  vec3 col = vec3(0.66, 0.65, 0.61) * (0.92 + 0.08 * vn(vec3(a * 30.0, r * 12.0, 1.0)));
  col = mix(col, col * 0.72, (1.0 - smoothstep(0.002, 0.012, sg.x)) * smoothstep(0.02, 0.06, r));
  // One big segment holds a seed.
  vec2 sp = f - vec2(cos(0.5), sin(0.5)) * 0.3;
  col = mix(col, vec3(0.3, 0.22, 0.17), (1.0 - smoothstep(0.08, 0.095, length(sp * vec2(1.0, 1.6)))) * step(sg.y, 0.5));
  // The rind: thick, crimson, paler where it meets the flesh, specked with latex.
  float rind = smoothstep(0.555, 0.575, r);
  vec3 rc = mix(vec3(0.42, 0.06, 0.16), vec3(0.17, 0.005, 0.05), smoothstep(0.58, 0.78, r));
  rc *= 0.85 + 0.3 * vn(vec3(f * 22.0, 4.0));
  rc = mix(rc, vec3(0.55, 0.42, 0.12), smoothstep(0.84, 0.9, vn(vec3(f * 70.0, 6.0))) * 0.6);
  col = mix(col, rc, rind);
  col = mix(col, vec3(0.06, 0.008, 0.025), smoothstep(0.965, 0.975, r));
  glow = (1.0 - rind) * 0.6;
  return col;
}`;

export const mangosteen = {
  id: 'mangosteen', label: 'Mangosteen', A, B, C,
  shape: (t, ph, e) => Math.pow(Math.max(0, 1 - t * t), 0.55) * (1 + e * t * 0.15),
  look: {
    thru: [0.35, 0.02, 0.12], thruK: 5,
    skinA: [0.05, 0.006, 0.02], skinB: [0.13, 0.018, 0.05], mottle: 4,
    blush: [0.18, 0.05, 0.035], blushK: 0.25, blushDir: [0, -1, 0],
    pores: 0.03, poreScale: 30, rough: 0.3, f0: 0.045, wrap: 0.2,
    speck: [0.84, 22, 0.45], speckCol: [0.3, 0.2, 0.05],
    sheen: [0.04, 0.02, 0.04], tipDark: 0.1,
  },
  fuzz: { k: 0, root: [[0.05, 0.006, 0.02], [0.13, 0.02, 0.05]], tip: [0.3, 0.12, 0.25], trans: [0.5, 0.2, 0.4], len: 0.07, width: 1 },
  juice: [0.82, 0.78, 0.82],
  glow: 0.4,
  // The cap: four thick green sepals round a stem; a small dark rosette at the other end.
  tip(U, g, mat, e) {
    if (e > 0) {
      const green = solidMaterial(U, { col: 'mix(vec3(0.05, 0.1, 0.02), vec3(0.14, 0.22, 0.05), vn(vL * 25.0)) * (1.0 - 0.4 * smoothstep(0.7, 1.0, vTip))', rough: 0.45, wrap: 0.4, sss: 'vec3(0.4, 0.6, 0.2)', bump: 0.3, bumpScale: 40 });
      for (let k = 0; k < 4; k++) {
        const s = new THREE.SphereGeometry(1, 24, 14);
        // A sepal: a thick rounded lobe, laid on the fruit's shoulder.
        s.scale(0.045, 0.2, 0.16);
        const P = s.attributes.position, tip = new Float32Array(P.count);
        for (let i = 0; i < P.count; i++) {
          const y = P.getY(i);
          tip[i] = (y + 0.2) / 0.4;
          // It bends down round the fruit as it runs out.
          P.setX(i, P.getX(i) + 0.55 * (Math.max(0, y) ** 2));
        }
        s.setAttribute('aTip', new THREE.BufferAttribute(tip, 1));
        s.computeVertexNormals();
        s.translate(0, 0.17, 0);
        s.rotateX((k / 4) * Math.PI * 2 + 0.4);
        s.translate(-A + 0.02, 0, 0);
        g.add(new THREE.Mesh(s, green));
      }
      const st = new THREE.CylinderGeometry(0.03, 0.04, 0.12, 12);
      st.rotateZ(Math.PI / 2);
      st.translate(-A - 0.07, 0, 0);
      g.add(new THREE.Mesh(st, green));
    } else {
      const ros = new THREE.Group();
      for (let k = 0; k < 6; k++) {
        const b = new THREE.SphereGeometry(1, 10, 8);
        b.scale(0.015, 0.035, 0.018);
        b.translate(0, 0.05, 0);
        b.rotateX((k / 6) * Math.PI * 2);
        b.translate(-A + 0.006, 0, 0);
        ros.add(new THREE.Mesh(b, solidMaterial(U, { col: 'vec3(0.04, 0.03, 0.025)', rough: 0.5 })));
      }
      g.add(ros);
    }
  },
  face(U, g) {
    const bed = bedMesh(U, this, BED, { bumpK: 1, wet: 1.0 });
    g.add(bed);
    return { bed, parts: [bed] };
  },
};
