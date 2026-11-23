// Kiwi: a fuzzy brown egg. The cut shows green flesh with pale rays,
// a ring of black seeds each in its own jelly cell, and a raised cream core.
import * as THREE from 'three';
import { createNoise3D } from 'simplex-noise';
import { LIGHT } from './glsl.js';
import { VERT_HEAD, DENTED, bedMesh, beadMesh, solidMaterial, rng } from './half.js';

const A = 1.0, B = 0.8, C = 0.76;
// The cut face, in units of the face radius.
const FACE = { core: 0.23, ring0: 0.26, ring1: 0.47, peri: 0.965 };
// The seed spokes: each a radial row of jelly cells. JS and GLSL share the angles.
const NK = 38;
const spokeA = k => ((k + 0.32 * Math.sin(k * 2.7)) / NK) * Math.PI * 2;
const f3 = x => x.toFixed(3);

const BED = /* glsl */`
float spokeA(float k) { return (k + 0.32 * sin(k * 2.7)) / ${NK}.0 * 6.2832; }
// The angle to the nearest pale ray: rays run between the spokes.
float rayD(float a) {
  float u = a / 6.2832 * ${NK}.0;
  float k0 = floor(u), d = 9.0;
  for (int j = -1; j <= 1; j++) {
    float k = k0 + float(j);
    float ra = 0.5 * (spokeA(k) + spokeA(k + 1.0));
    d = min(d, abs(mod(a - ra + 9.4248, 6.2832) - 3.1416));
  }
  return d;
}
// Fine cell walls in the flesh, long along the rays.
vec2 kcell(vec2 f) {
  float r = length(f), a = atan(f.y, f.x);
  return cellEdge(vec2(a * 40.0, r * 30.0 + sin(a * 7.0) * 0.3));
}
// The flesh at one depth: green, rays, cell walls.
vec3 flesh(vec2 f, float shade) {
  float r = length(f), a = atan(f.y, f.x);
  vec2 ce = kcell(f);
  vec3 col = mix(vec3(0.11, 0.24, 0.012), vec3(0.038, 0.14, 0.007), smoothstep(0.48, 0.85, r));
  col *= 0.86 + 0.28 * ce.y;
  // Pale rays: strong near the seed ring, fading to the rim.
  // Each ray wanders, and runs out at its own length.
  float wob = (vn(vec3(a * 12.0, r * 6.0, 4.0)) - 0.5) * 0.02;
  float reach = 0.6 + 0.25 * vn(vec3(floor(a / 6.2832 * ${NK}.0 + 0.5), 1.0, 7.0));
  float ray = (1.0 - smoothstep(0.0, 0.004 + r * 0.008, abs(rayD(a + wob / max(r, 0.1))) * r)) * smoothstep(0.43, 0.5, r) * (1.0 - smoothstep(reach - 0.2, reach + 0.05, r));
  // Many finer rays between them, short and faint.
  float fa = a * ${NK * 3}.0 + vn(vec3(a * 30.0, r * 8.0, 2.0)) * 2.0;
  float fine = (1.0 - smoothstep(0.0, 0.25, abs(sin(fa)))) * smoothstep(0.47, 0.52, r) * (1.0 - smoothstep(0.54, 0.72, r)) * vn(vec3(a * 50.0, 3.0, 1.0));
  col = mix(col, vec3(0.36, 0.46, 0.18), max(ray * 0.75, fine * 0.35) * shade);
  col = mix(col, col * 1.45 + vec3(0.02, 0.03, 0.0), (1.0 - smoothstep(0.0, 0.07, ce.x)) * 0.3 * shade);
  return col;
}
float relief(vec2 f) {
  float r = length(f), a = atan(f.y, f.x);
  return 0.0015 * smoothstep(0.0, 0.25, kcell(f).x) - 0.002 * (1.0 - smoothstep(0.0, 0.01, rayD(a) * r)) * smoothstep(0.45, 0.5, r);
}
vec3 bed(vec2 f, float r, float a, inout float glow) {
  // Two depths of flesh: the cut, and a layer seen through it.
  vec3 top = flesh(f, 1.0);
  vec3 deep = flesh(f - gPar * 0.035, 0.7) * 0.8;
  vec3 col = mix(top, deep, 0.45);
#ifdef LONGFACE
  // Lengthwise, the seeds lie in the ring's band as black flecks.
  {
    vec2 cc = cells(f * 34.0);
    float band = smoothstep(${f3(FACE.ring0)}, ${f3(FACE.ring0 + 0.04)}, r) * (1.0 - smoothstep(${f3(FACE.ring1 - 0.06)}, ${f3(FACE.ring1)}, r));
    col = mix(col, vec3(0.01, 0.008, 0.006), (1.0 - smoothstep(0.12, 0.2, cc.x)) * step(0.35, cc.y) * band);
  }
#endif
  // The seed ring: a glassy yellow-green band under the jelly cells.
  float ring = smoothstep(${f3(FACE.ring0 - 0.02)}, ${f3(FACE.ring0 + 0.01)}, r) * (1.0 - smoothstep(${f3(FACE.ring1 - 0.03)}, ${f3(FACE.ring1 + 0.02)}, r));
  col = mix(col, vec3(0.12, 0.2, 0.01), ring * 0.85);
  // Under the skin: a lighter band, then the thin brown skin.
  col = mix(col, vec3(0.18, 0.32, 0.03), smoothstep(0.9, 0.94, r) * 0.7);
  col = mix(col, vec3(0.045, 0.024, 0.01), smoothstep(${f3(FACE.peri)}, ${f3(FACE.peri + 0.01)}, r));
  glow = (0.25 + 0.75 * smoothstep(0.45, 0.95, r)) * (1.0 - smoothstep(0.95, 0.97, r));
  return col;
}`;

// The core: a cream dome, fibres out from its middle, glassy where it meets the ring.
function coreMaterial(U) {
  return new THREE.ShaderMaterial({
    uniforms: U,
    vertexShader: `${VERT_HEAD}\nvoid main() {\n${DENTED}\n}`,
    fragmentShader: /* glsl */`
      ${LIGHT}
      uniform float uGlow;
      varying vec3 vW, vN, vL;
      void main() {
        secClip(vL);
        vec3 n = normalize(vN);
        vec3 v = normalize(cameraPosition - vW);
        vec2 f = vL.yz / vec2(${(FACE.core * B).toFixed(4)}, ${(FACE.core * C).toFixed(4)});
        float r = length(f);
        float a = atan(f.y, f.x);
        // Fibres: fine radial streaks, denser toward the rim.
        float fib = vn(vec3(a * 46.0, r * 3.0, 1.0)) * 0.6 + vn(vec3(a * 110.0, r * 6.0, 2.0)) * 0.4;
        vec3 base = mix(vec3(0.4, 0.38, 0.17), vec3(0.24, 0.28, 0.07), smoothstep(0.3, 0.7, fib));
        // A soft star of pale fibres in the very middle.
        base = mix(base, vec3(0.5, 0.48, 0.28), (1.0 - smoothstep(0.0, 0.25, r)) * 0.5);
        // The rim turns glassy green as it meets the seed ring.
        base = mix(base, vec3(0.16, 0.26, 0.04), smoothstep(0.7, 1.0, r));
        vec3 col = shade(base * 0.8, n, v, 0.1, 0.55, base * 0.5, 0.025);
        col += base * uRimCol * uGlow * 0.06;
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
}

export const kiwi = {
  id: 'kiwi', label: 'Kiwi', A, B, C,
  // An egg; e skews it, the tip flattens a little, and slow bumps fade at the cut.
  shape: (() => {
    const nz = createNoise3D(rng(9));
    return (t, ph, e) => Math.pow(Math.max(0, 1 - t * t), 0.47) * (1 + e * t) * (1 - 0.06 * t ** 4)
      * (1 + 0.025 * t * nz(Math.cos(ph) * 1.3, Math.sin(ph) * 1.3, t * 1.4 + (e > 0 ? 3 : 0)));
  })(),
  look: {
    thru: [0.12, 0.08, 0.025], thruK: 9,
    // Under the fuzz the skin is a dark green-brown, with small pale lenticels.
    skinA: [0.03, 0.022, 0.008], skinB: [0.075, 0.05, 0.018], mottle: 6,
    blush: [0.05, 0.045, 0.012], blushK: 0.3, blushDir: [0, -1, 0],
    rough: 0.8, f0: 0.03, wrap: 0.2,
    speck: [0.84, 90, 0.5], speckCol: [0.16, 0.11, 0.05],
    sheen: [0.18, 0.11, 0.048], tipDark: 0.3,
  },
  fuzz: { k: 0.6, patch: 0.65, root: [[0.03, 0.016, 0.006], [0.07, 0.038, 0.014]], tip: [0.125, 0.075, 0.03], trans: [0.5, 0.32, 0.13], len: 0.07, width: 1 },
  juice: [0.42, 0.88, 0.08],
  glow: 0.55,
  // The stem end: a sunken, wrinkled scar. The blossom end: a small dark point.
  tip(U, g, mat, e) {
    if (e > 0) {
      const s = new THREE.SphereGeometry(1, 28, 14);
      s.scale(0.03, 0.07, 0.07);
      s.translate(-A + 0.012, 0, 0);
      g.add(new THREE.Mesh(s, solidMaterial(U, { col: 'mix(vec3(0.05, 0.03, 0.012), vec3(0.13, 0.08, 0.035), vn(vL * 140.0))', rough: 0.75, bump: 1.2, bumpScale: 160 })));
    } else {
      const s = new THREE.ConeGeometry(0.018, 0.04, 12);
      s.rotateZ(Math.PI / 2);
      s.translate(-A - 0.01, 0, 0);
      g.add(new THREE.Mesh(s, solidMaterial(U, { col: 'vec3(0.03, 0.02, 0.01)', rough: 0.6 })));
    }
  },
  face(U, g, R) {
    const bed = bedMesh(U, this, BED, { bumpK: 1, wet: 1.05 });
    g.add(bed);
    // The core: a low dome proud of the face.
    const coreG = new THREE.SphereGeometry(1, 64, 20, 0, Math.PI * 2, 0, Math.PI / 2);
    coreG.rotateZ(-Math.PI / 2);
    coreG.scale(0.016, FACE.core * B, FACE.core * C);
    const core = new THREE.Mesh(coreG, coreMaterial(U));
    g.add(core);
    // The seed ring: along each spoke a row of jelly cells, a black seed in each.
    const beads = [];
    for (let k = 0; k < NK; k++) {
      const a0 = spokeA(k);
      const n = 3 + Math.floor(R() * 3);
      for (let j = 0; j < n; j++) {
        const rho = FACE.ring0 + 0.035 + (j + R() * 0.6) / n * (FACE.ring1 - FACE.ring0 - 0.06);
        // Cells stagger a little to each side of the spoke.
        const ph = a0 + (R() - 0.5) * 0.05 + (j % 2 ? 0.018 : -0.018);
        const t = R();
        const len = 0.026 + R() * 0.01, wid = 0.013 + R() * 0.004;
        beads.push({ p: [-0.006, Math.cos(ph) * rho * B, Math.sin(ph) * rho * C], ph: ph + (R() - 0.5) * 0.2, s: [0.011, len * B, wid * B], col: [0.22 + t * 0.08, 0.4 + t * 0.06, 0.03], sig: 0.3, seed: 0.74 + R() * 0.08 });
      }
    }
    const bm = beadMesh(U, beads, { seedCol: [0.004, 0.003, 0.003], scale: 28, wet: 1.3, behind: 0.35 });
    g.add(bm);
    return { bed, parts: [bed, core, bm] };
  },
};
