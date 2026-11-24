// Mangosteen: a near-black purple ball under an olive cap.
// Cut: a thick wine-red rind, a dark gap, white segments as soft pillows.
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
// Reference: Commons "Mangosteens_-_whole_and_opened.jpg".
// The flesh's edge: each segment bulges out to a rounded lobe.
float fleshR(vec2 sg, float r) {
  float ang = sg.x / max(r, 0.05);
  return 0.56 + 0.075 * sqrt(clamp(ang / 0.5, 0.0, 1.0));
}
// A segment's pillow: high in its middle, sinking to its walls and its edge.
float pillow(vec2 f, float r, vec2 sg) {
  float edge = fleshR(sg, r) - r;
  float d = min(sg.x, edge);
  return sqrt(clamp(d / 0.07, 0.0, 1.0));
}
float relief(vec2 f) {
  float r = length(f), a = atan(f.y, f.x);
  vec2 sg = mseg(a, r);
  float inF = 1.0 - smoothstep(-0.004, 0.004, r - fleshR(sg, r));
  float p = pillow(f, r, sg);
  // The pillows stand soft and smooth; the rind is fine-grained.
  return (0.009 * p + 0.0008 * vn(vec3(f * 30.0, 1.0))) * inF + 0.0003 * vn(vec3(f * 50.0, 2.0)) * (1.0 - inF);
}
vec3 bed(vec2 f, float r, float a, inout float glow) {
  vec2 sg = mseg(a, r);
  float rf = fleshR(sg, r);
  float p = pillow(f, r, sg);
  // Snow-white flesh, a touch translucent where the pillow thins.
  vec3 white = vec3(0.7, 0.69, 0.66) * (0.94 + 0.06 * vn(vec3(f * 14.0, 3.0)));
  vec3 col = mix(white * vec3(0.78, 0.78, 0.8), white, smoothstep(0.0, 0.6, p));
  // The creases between segments, in soft shadow.
  col *= 0.55 + 0.45 * smoothstep(0.0, 0.025, sg.x);
  // A pale yellow point where the segments meet.
  col = mix(col, vec3(0.6, 0.5, 0.25), 1.0 - smoothstep(0.015, 0.04, r));
  // One big segment holds a seed, seen through its flesh.
  vec2 sp = f - vec2(cos(0.5), sin(0.5)) * 0.3;
  col = mix(col, vec3(0.42, 0.34, 0.26), (1.0 - smoothstep(0.05, 0.085, length(sp * vec2(1.0, 1.6)))) * step(sg.y, 0.5) * 0.6);
  // The gap: a dark hollow between the lobes and the rind, deeper with the view.
  float gap = smoothstep(rf - 0.004, rf + 0.004, r) * (1.0 - smoothstep(0.655, 0.665, r));
  vec3 hole = vec3(0.04, 0.004, 0.008) * (0.6 + 0.4 * smoothstep(0.0, 0.03, r - rf - length(gPar) * 0.01));
  // The rind: deep wine red, paler pink at its inner face, near black at the skin.
  float rind = smoothstep(0.655, 0.665, r);
  vec3 rc = mix(vec3(0.24, 0.04, 0.06), vec3(0.11, 0.01, 0.03), smoothstep(0.665, 0.74, r));
  rc = mix(rc, vec3(0.06, 0.004, 0.012), smoothstep(0.86, 0.96, r));
  rc *= 0.85 + 0.25 * vn(vec3(f * 18.0, 4.0));
  // A few yellow latex beads where the rind was cut.
  rc = mix(rc, vec3(0.55, 0.4, 0.08), smoothstep(0.94, 0.96, vn(vec3(f * 40.0, 6.0))) * 0.5);
  col = mix(col, hole, gap);
  col = mix(col, rc, rind);
  col = mix(col, vec3(0.025, 0.004, 0.012), smoothstep(0.975, 0.985, r));
  glow = (1.0 - rind) * (1.0 - gap) * (0.4 + 0.5 * (1.0 - p));
  return col;
}`;

export const mangosteen = {
  id: 'mangosteen', label: 'Mangosteen', A, B, C,
  shape: (t, ph, e) => Math.pow(Math.max(0, 1 - t * t), 0.55) * (1 + e * t * 0.15),
  look: {
    thru: [0.08, 0.006, 0.03], thruK: 4,
    skinA: [0.006, 0.0018, 0.006], skinB: [0.02, 0.004, 0.016], mottle: 4,
    blush: [0.06, 0.018, 0.016], blushK: 0.2, blushDir: [0, -1, 0],
    pores: 0.03, poreScale: 30, rough: 0.34, f0: 0.045, wrap: 0.2,
    speck: [0.9, 18, 0.25], speckCol: [0.18, 0.1, 0.035],
    sheen: [0.025, 0.015, 0.03], tipDark: 0.1,
  },
  fuzz: { k: 0, root: [[0.05, 0.006, 0.02], [0.13, 0.02, 0.05]], tip: [0.3, 0.12, 0.25], trans: [0.5, 0.2, 0.4], len: 0.07, width: 1 },
  juice: [0.82, 0.78, 0.82],
  glow: 0.4,
  // The cap: four thick green sepals round a stem; a small dark rosette at the other end.
  tip(U, g, mat, e) {
    if (e > 0) {
      const green = solidMaterial(U, { col: 'mix(vec3(0.035, 0.03, 0.01), vec3(0.11, 0.09, 0.03), vn(vL * 25.0)) * (1.0 - 0.4 * smoothstep(0.7, 1.0, vTip))', rough: 0.45, wrap: 0.4, sss: 'vec3(0.4, 0.6, 0.2)', bump: 0.3, bumpScale: 40 });
      for (let k = 0; k < 4; k++) {
        const s = new THREE.SphereGeometry(1, 24, 14);
        // A sepal: a thick rounded lobe, laid on the fruit's shoulder.
        s.scale(0.05, 0.25, 0.19);
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
    const bed = bedMesh(U, this, BED, { bumpK: 1, wet: 0.7, rough: 0.55 });
    g.add(bed);
    return { bed, parts: [bed] };
  },
};
