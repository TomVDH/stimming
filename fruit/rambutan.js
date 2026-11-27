// Rambutan: a red shell with long soft spines; glassy white flesh round a brown seed.
// The spines are the fuzz ribbons, few and long, standing up with hooked tips.
import * as THREE from 'three';
import { bedMesh, solidMaterial } from './half.js';

const A = 0.82, B = 0.7, C = 0.7;
// The seed, in face units: half its height and width.
const SY = 0.36, SZ = 0.28;

// The flesh: glassy and grey-white, lit from within, wet; reference Commons "Rambutan_white_background_alt.jpg".
const bedGLSL = pit => /* glsl */`
float stoneE(vec2 f) { return length(f / vec2(${SY.toFixed(2)}, ${SZ.toFixed(2)})); }
// Milky fibres: soft radial bands of denser flesh, warped.
float milk(vec2 f) {
  float r = length(f), a = atan(f.y, f.x);
  vec2 u = vec2(cos(a), sin(a));
  // Long along the ray, narrow across it, so the flesh reads fibrous.
  float band = vn(vec3(u * 9.0 + vn(vec3(f * 3.0, 1.0)) * 1.5, r * 2.5));
  return band * 0.6 + vn(vec3(f * 3.0 + r * 4.0, 3.0)) * 0.4;
}
float relief(vec2 f) {
  float r = length(f), a = atan(f.y, f.x);
  // Shallow radial grooves where the fibres part; a slow swell under the shine.
  vec2 u = vec2(cos(a), sin(a));
  float g = vn(vec3(u * 16.0 + vn(vec3(f * 3.0, 1.0)) * 1.5, r * 4.0));
  return 0.0012 * g + 0.004 * vn(vec3(f * 5.0, 4.0)) + 0.0005 * vn(vec3(f * 40.0, 5.0));
}
vec3 bed(vec2 f, float r, float a, inout float glow) {
  float e = stoneE(f);
  // Two depths of milky flesh: the deeper one slides with the view.
  float m = milk(f) * 0.55 + milk(f - gPar * 0.06) * 0.45;
  vec3 clear = vec3(0.24, 0.24, 0.22), milky = vec3(0.48, 0.48, 0.43);
  vec3 col = mix(clear, milky, smoothstep(0.15, 0.9, m));
  // The flesh clears near the seed and goes milkier toward the shell.
  col = mix(col, clear * 0.8, (1.0 - smoothstep(1.0, 1.6, e)) * 0.5);
  col *= 0.92 + 0.12 * smoothstep(0.4, 0.8, r);
  // The papery seed coat: a thin brown line round the seed.
  col = mix(col, vec3(0.36, 0.25, 0.14), (1.0 - smoothstep(1.0, 1.06, e)) * 0.85);
  // A thin dark gap where the flesh pulls off the shell.
  col = mix(col, vec3(0.05, 0.04, 0.035), smoothstep(0.885, 0.9, r) * (1.0 - smoothstep(0.905, 0.915, r)));
  // The shell: cream inside, then red, darker at the outside.
  col = mix(col, vec3(0.62, 0.42, 0.3), smoothstep(0.905, 0.915, r));
  col = mix(col, mix(vec3(0.5, 0.05, 0.03), vec3(0.22, 0.01, 0.01), smoothstep(0.95, 0.99, r)), smoothstep(0.935, 0.95, r));
  // The glassy flesh takes the back light right through.
  glow = (1.0 - smoothstep(0.86, 0.9, r)) * (1.2 - 0.6 * m);
  return col;
}`;

export const rambutan = {
  id: 'rambutan', label: 'Rambutan', A, B, C,
  shape: (t, ph, e) => Math.pow(Math.max(0, 1 - t * t), 0.5) * (1 + e * t * 0.25),
  look: {
    thru: [0.7, 0.04, 0.03], thruK: 2,
    skinA: [0.14, 0.006, 0.006], skinB: [0.3, 0.014, 0.01], mottle: 4,
    blush: [0.42, 0.2, 0.02], blushK: 0.2, blushDir: [0, -1, 0.2],
    pores: 0.35, poreScale: 14, rough: 0.64, f0: 0.03, wrap: 0.3, sss: [0.5, 0.05, 0.02],
    sheen: [0.08, 0.02, 0.01], tipDark: 0.15,
  },
  fuzz: { k: 0.85, count: 0.036, lift: 1.1, curl: 1.2, len: 0.3, width: 8, root: [[0.26, 0.008, 0.008], [0.4, 0.02, 0.012]], tip: [0.24, 0.05, 0.015], trans: [0.5, 0.03, 0.02] },
  juice: [0.85, 0.88, 0.8],
  glow: 0.5,
  tip(U, g, mat, e) {
    if (e > 0) {
      const st = new THREE.CylinderGeometry(0.02, 0.035, 0.07, 10);
      st.rotateZ(Math.PI / 2);
      st.translate(-A - 0.02, 0, 0);
      g.add(new THREE.Mesh(st, solidMaterial(U, { col: 'vec3(0.1, 0.07, 0.03)', rough: 0.7 })));
    }
  },
  face(U, g, R, e) {
    const pit = e > 0;
    const bed = bedMesh(U, this, bedGLSL(pit), { bumpK: 0.8, wet: 1.0, rough: 0.45, hole: pit ? [SY * 0.96, SZ * 0.96] : null });
    g.add(bed);
    const parts = [bed];
    if (pit) {
      // The hollow the seed left: lined with the thin brown skin.
      const hg = new THREE.SphereGeometry(1, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2);
      hg.rotateZ(Math.PI / 2);
      hg.scale(0.13, SY * B * 0.96, SZ * C * 0.96);
      hg.translate(-0.012, 0, 0);
      const hollow = new THREE.Mesh(hg, solidMaterial(U, { col: 'mix(vec3(0.2, 0.13, 0.07), vec3(0.42, 0.33, 0.2), smoothstep(-0.12, 0.0, vL.x)) * (0.8 + 0.2 * vn(vL * 80.0))', rough: 0.5, f0: 0.02, wrap: 0.4, side: THREE.BackSide }));
      g.add(hollow);
      parts.push(hollow);
    } else {
      // The seed: a smooth brown oval, half out of the flesh.
      const sg = new THREE.SphereGeometry(1, 64, 40);
      sg.scale(0.13, SY * B * 0.93, SZ * C * 0.93);
      const seed = new THREE.Mesh(sg, solidMaterial(U, { col: 'mix(vec3(0.13, 0.07, 0.035), vec3(0.28, 0.17, 0.08), vn(vL * 30.0))', rough: 0.35, wrap: 0.3, bump: 0.15, bumpScale: 50 }));
      seed.userData.ejectable = { radius: 0.18 };
      g.add(seed);
      parts.push(seed);
    }
    return { bed, parts };
  },
};
