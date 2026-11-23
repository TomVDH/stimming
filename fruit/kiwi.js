// Kiwi: a fuzzy brown egg; green flesh with pale rays, black seeds in a jelly ring, a cream core.
import * as THREE from 'three';
import { LIGHT } from './glsl.js';
import { VERT_HEAD, DENTED, bedMesh, beadMesh, solidMaterial } from './half.js';

const A = 1.0, B = 0.8, C = 0.76;
// The cut face, in units of the face radius.
const FACE = { core: 0.25, ring0: 0.28, ring1: 0.47, ray1: 0.86, peri: 0.965 };
const f3 = x => x.toFixed(3);

const BED = /* glsl */`
// Fine cell walls in the flesh, long along the rays.
vec2 kcell(vec2 f, float r, float a) { return cellEdge(vec2(a * 34.0, r * 26.0 + sin(a * 7.0) * 0.3)); }
float relief(vec2 f) {
  float r = length(f), a = atan(f.y, f.x);
  return 0.0016 * smoothstep(0.0, 0.25, kcell(f, r, a).x);
}
vec3 bed(vec2 f, float r, float a, inout float glow) {
  vec2 ce = kcell(f, r, a);
  // Flesh: deep green, brighter and yellower toward the seed ring.
  vec3 deep = vec3(0.055, 0.2, 0.006), light = vec3(0.16, 0.33, 0.012);
  vec3 col = mix(light, deep, smoothstep(0.5, 0.82, r));
  col *= 0.85 + 0.3 * ce.y;
  // Pale rays: thin white streaks out from the seed ring.
  float ray = 0.0;
  for (int i = 0; i < 3; i++) {
    float k = 22.0 + float(i) * 17.0;
    float s = abs(sin(a * k + sin(r * (5.0 + float(i) * 3.0) + float(i)) * 0.6));
    ray = max(ray, (1.0 - smoothstep(0.0, 0.05 + r * 0.03, s)) * (0.8 - float(i) * 0.2));
  }
  ray *= smoothstep(0.44, 0.5, r) * (1.0 - smoothstep(0.62, 0.86, r));
  col = mix(col, vec3(0.42, 0.52, 0.2), ray * 0.7);
  // Cell walls: faint pale lines.
  col = mix(col, col * 1.5 + vec3(0.02, 0.03, 0.0), (1.0 - smoothstep(0.0, 0.07, ce.x)) * 0.35);
  // The seed ring: a paler, glassy band.
  float ring = smoothstep(${f3(FACE.ring0 - 0.02)}, ${f3(FACE.ring0 + 0.02)}, r) * (1.0 - smoothstep(${f3(FACE.ring1 - 0.03)}, ${f3(FACE.ring1 + 0.02)}, r));
  col = mix(col, vec3(0.2, 0.3, 0.02), ring * 0.8);
  // Under the skin: a lighter band, then the thin brown skin.
  col = mix(col, vec3(0.2, 0.34, 0.03), smoothstep(0.88, 0.93, r) * 0.7);
  col = mix(col, vec3(0.05, 0.025, 0.01), smoothstep(${f3(FACE.peri)}, ${f3(FACE.peri + 0.012)}, r));
  glow = (0.25 + 0.75 * smoothstep(0.45, 0.95, r)) * (1.0 - smoothstep(0.95, 0.97, r));
  return col;
}`;

// The core: a cream dome with soft streaks out from its middle.
function coreMaterial(U) {
  return new THREE.ShaderMaterial({
    uniforms: U,
    vertexShader: `${VERT_HEAD}\nvoid main() {\n${DENTED}\n}`,
    fragmentShader: /* glsl */`
      ${LIGHT}
      uniform float uGlow;
      varying vec3 vW, vN, vL;
      void main() {
        vec3 n = normalize(vN);
        vec3 v = normalize(cameraPosition - vW);
        vec2 f = vL.yz / ${(FACE.core * B).toFixed(4)};
        float r = length(f);
        float a = atan(f.y, f.x);
        vec3 base = mix(vec3(0.36, 0.34, 0.15), vec3(0.22, 0.3, 0.06), smoothstep(0.45, 1.0, r));
        base *= 0.9 + 0.1 * smoothstep(0.3, 0.9, abs(sin(a * 31.0 + r * 6.0)));
        vec3 col = shade(base, n, v, 0.08, 0.5, base * 0.5, 0.025);
        col += base * uRimCol * uGlow * 0.08;
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
}

export const kiwi = {
  id: 'kiwi', label: 'Kiwi', A, B, C,
  // An egg; e skews it, and the tip flattens a little.
  shape: (t, ph, e) => Math.pow(Math.max(0, 1 - t * t), 0.47) * (1 + e * t) * (1 - 0.06 * t ** 4),
  look: { rough: 0.85, f0: 0.03, wrap: 0.2 },
  fuzz: { k: 0.6, root: [[0.04, 0.02, 0.008], [0.09, 0.045, 0.018]], tip: [0.15, 0.085, 0.034], trans: [0.5, 0.32, 0.13], len: 0.07, width: 1 },
  juice: [0.42, 0.88, 0.08],
  glow: 0.55,
  // The tip: a stem nub on the wide half, a small knob on the other.
  tip(U, g, mat, e) {
    const n = new THREE.SphereGeometry(1, 20, 12);
    n.scale(e > 0 ? 0.05 : 0.03, e > 0 ? 0.075 : 0.04, e > 0 ? 0.075 : 0.04);
    n.translate(-A - (e > 0 ? 0 : 0.005), 0, 0);
    g.add(new THREE.Mesh(n, mat));
  },
  face(U, g, R) {
    const bed = bedMesh(U, this, BED, { bumpK: 1 });
    g.add(bed);
    // The core: a low dome proud of the face.
    const coreG = new THREE.SphereGeometry(1, 48, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    coreG.rotateZ(-Math.PI / 2);
    coreG.scale(0.012, FACE.core * B, FACE.core * C);
    const core = new THREE.Mesh(coreG, coreMaterial(U));
    g.add(core);
    const beads = [], seeds = [];
    // The seed ring: flat jelly cells, each a juice bead, seeds lying in them.
    const NL = 34;
    for (let i = 0; i < NL; i++) {
      const ph = (i + 0.4 * R()) / NL * Math.PI * 2;
      const t = R();
      const rho = 0.37 + (R() - 0.5) * 0.03;
      beads.push({ p: [-0.012, Math.cos(ph) * rho * B, Math.sin(ph) * rho * C], ph, s: [0.014, (0.08 + R() * 0.012) * B, (0.03 + R() * 0.008) * B], col: [0.3 + t * 0.1, 0.55, 0.04], sig: 0.6 });
      const ns = 2 + Math.floor(R() * 3);
      for (let k = 0; k < ns; k++) seeds.push({ rho: FACE.ring0 + 0.03 + R() * 0.15, ph: ph + (R() - 0.5) * 0.1 + Math.PI / NL });
    }
    const bm = beadMesh(U, beads);
    g.add(bm);
    const sm = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 12, 8), solidMaterial(U, { col: 'vec3(0.02, 0.016, 0.012)', rough: 0.12, f0: 0.05 }), seeds.length);
    const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), S = new THREE.Vector3(0.012, 0.024, 0.014), P = new THREE.Vector3(), E = new THREE.Euler();
    seeds.forEach((s, i) => {
      P.set(-0.002, Math.cos(s.ph) * s.rho * B, Math.sin(s.ph) * s.rho * C);
      Q.setFromEuler(E.set(s.ph, 0, 0));
      sm.setMatrixAt(i, M.compose(P, Q, S));
    });
    sm.frustumCulled = false;
    g.add(sm);
    return { bed, parts: [bed, core, bm, sm] };
  },
};
