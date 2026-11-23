// Pomegranate: a glossy red globe with a crown of sepals and dry stamens.
// Inside, arils pack the chambers between pith walls. Each aril is its own mesh:
// a teardrop pressed flat where it meets its neighbours. Arils that cross the cut
// are sliced flat and show their juice and a white seed in section.
import * as THREE from 'three';
import { createNoise3D } from 'simplex-noise';
import { bedMesh, solidMaterial, rng } from './half.js';
import { makeArils } from './arils.js';

const A = 0.8, B = 0.86, C = 0.86;
const CH = 6;
// The cut plane sits a hair above the face, so sliced arils show clean.
const CUT = 0.004;

// The pith: a lumpy middle and six wavy walls out to the rind.
// JS and GLSL share these numbers, so the arils keep off the pith.
const pithR = a => 0.13 + 0.03 * Math.sin(3 * a + 0.7);
const wallA = (i, r) => (i / CH) * Math.PI * 2 + 0.16 * Math.sin(r * 4.5 + i * 1.7);
const rindR = a => 0.875 + 0.012 * Math.sin(a * 7 + 1) + 0.008 * Math.sin(a * 17);
function inPith(r, a, pad) {
  if (r < pithR(a) + pad || r > rindR(a) - pad) return true;
  for (let i = 0; i < CH; i++) {
    const d = Math.abs(((a - wallA(i, r)) % (Math.PI * 2) + Math.PI * 3) % (Math.PI * 2) - Math.PI);
    if (d * r < 0.02 + pad) return true;
  }
  return false;
}

const BED = /* glsl */`
float pithR(float a) { return 0.13 + 0.03 * sin(3.0 * a + 0.7); }
float rindR(float a) { return 0.875 + 0.012 * sin(a * 7.0 + 1.0) + 0.008 * sin(a * 17.0); }
float wallD(float a, float r) {
  float w = 1.0;
  for (int i = 0; i < ${CH}; i++) {
    float wa = float(i) / ${CH}.0 * 6.2832 + 0.16 * sin(r * 4.5 + float(i) * 1.7);
    w = min(w, abs(mod(a - wa + 9.4248, 6.2832) - 3.1416) * r);
  }
  return w;
}
// The pith is a sponge: small cells with pale walls.
vec2 sponge(vec2 f) { return cellEdge(f * 52.0); }
float relief(vec2 f) {
  float r = length(f), a = atan(f.y, f.x);
  float wall = 1.0 - smoothstep(0.013, 0.022, wallD(a, r));
  float pith = max(1.0 - smoothstep(pithR(a) - 0.01, pithR(a) + 0.01, r), smoothstep(rindR(a) - 0.01, rindR(a) + 0.005, r));
  return wall * 0.004 + max(pith, wall) * 0.0012 * smoothstep(0.0, 0.2, sponge(f).x);
}
vec3 bed(vec2 f, float r, float a, inout float glow) {
  // Deep juice and shadow between the arils.
  vec3 col = vec3(0.06, 0.003, 0.007) * (0.7 + 0.6 * vn(vec3(f * 20.0, 1.0)));
  float wd = wallD(a, r);
  float wall = 1.0 - smoothstep(0.013, 0.022, wd);
  float mid = 1.0 - smoothstep(pithR(a) - 0.01, pithR(a) + 0.01, r);
  float rind = smoothstep(rindR(a) - 0.01, rindR(a) + 0.005, r);
  // The chambers are open: the arils show down to the floor.
  if (max(max(wall, mid), rind) < 0.5) discard;
  // Pith: cream with a yellow cast, pink toward the rind; pores darker.
  vec2 sp = sponge(f);
  vec3 cream = mix(vec3(0.56, 0.44, 0.2), vec3(0.66, 0.56, 0.3), vn(vec3(f * 14.0, 2.0)));
  cream = mix(cream, vec3(0.62, 0.36, 0.26), smoothstep(0.75, 0.95, r) * 0.6);
  cream *= 0.82 + 0.18 * smoothstep(0.0, 0.25, sp.x);
  // Walls: thin translucent membranes, yellow where they are thin.
  vec3 membrane = mix(vec3(0.62, 0.52, 0.24), cream, smoothstep(0.004, 0.016, wd));
  col = mix(col, membrane, wall);
  col = mix(col, cream, max(mid, rind));
  // Where the pith drops into a chamber, its lip sits in the arils' shade.
  float solid = max(max(wall, mid), rind);
  col *= 0.5 + 0.5 * smoothstep(0.5, 0.98, solid);
  // The skin at the edge: a thin red line.
  col = mix(col, vec3(0.3, 0.02, 0.025), smoothstep(0.962, 0.972, r));
  glow = (1.0 - max(max(wall, mid), rind)) * 0.3 + wall * 0.5;
  return col;
}`;

const FLOOR = /* glsl */`
float relief(vec2 f) { return 0.0; }
vec3 bed(vec2 f, float r, float a, inout float glow) { glow = 0.2; return vec3(0.05, 0.003, 0.006); }`;

// The arils, packed into the chambers in a slab below the cut.
function arils(U, R) {
  const list = [];
  for (let k = 0; k < 80000 && list.length < 380; k++) {
    const fr = Math.sqrt(R()) * 0.9, a = R() * Math.PI * 2;
    const r = (0.05 + R() * 0.022) * B;
    if (inPith(fr, a, (r / B) * 0.55)) continue;
    // Most sit below the cut; some were pushed up and bulge above it.
    const loose = R() < 0.22;
    const c = new THREE.Vector3(loose ? -0.03 + R() * 0.035 : -0.012 - R() * 0.07, Math.cos(a) * fr * B, Math.sin(a) * fr * C);
    if (list.some(o => o.c.distanceToSquared(c) < ((o.r + r) * 0.74) ** 2)) continue;
    list.push({ c, r, loose });
  }
  return makeArils(U, list, R, { cut: CUT });
}

// The crown: a flared tube whose rim splits into six sepals; dry stamens inside.
function crown(U, x0) {
  const NU = 14, NT = 96, pos = [], tip = [], idx = [];
  for (let i = 0; i <= NU; i++) for (let j = 0; j <= NT; j++) {
    const uu = i / NU, th = (j / NT) * Math.PI * 2;
    const tooth = Math.pow(0.5 + 0.5 * Math.cos(6 * th), 2.2);
    // The tube rises, flares, and the sepals curl out, then in at their tips.
    const h = uu * (0.13 + 0.1 * tooth);
    const rr = 0.1 + 0.03 * uu + (0.07 * tooth + 0.015) * uu * uu - 0.03 * tooth * Math.max(0, uu - 0.85) * 6;
    pos.push(x0 - h, Math.cos(th) * rr, Math.sin(th) * rr);
    tip.push(uu * (0.6 + 0.4 * tooth));
  }
  for (let i = 0; i < NU; i++) for (let j = 0; j < NT; j++) {
    const a = i * (NT + 1) + j, b = a + NT + 1;
    idx.push(a, b, a + 1, a + 1, b, b + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('aTip', new THREE.Float32BufferAttribute(tip, 1));
  g.setIndex(idx);
  g.computeVertexNormals();
  const grp = new THREE.Group();
  grp.add(new THREE.Mesh(g, solidMaterial(U, {
    col: 'mix(mix(vec3(0.3, 0.02, 0.025), vec3(0.42, 0.06, 0.04), vn(vL * 30.0)), vec3(0.3, 0.18, 0.08), smoothstep(0.55, 0.95, vTip))',
    rough: 0.45, wrap: 0.4, sss: 'vec3(0.6, 0.1, 0.05)', bump: 0.4, bumpScale: 70, side: THREE.DoubleSide,
  })));
  // The floor of the crown, and the stamens standing on it.
  const fl = new THREE.CircleGeometry(0.11, 24);
  fl.rotateY(-Math.PI / 2);
  fl.translate(x0 - 0.015, 0, 0);
  grp.add(new THREE.Mesh(fl, solidMaterial(U, { col: 'vec3(0.08, 0.035, 0.015)', rough: 0.8 })));
  const st = new THREE.CylinderGeometry(0.0035, 0.005, 1, 5, 4);
  st.translate(0, 0.5, 0);
  const P = st.attributes.position, tp = new Float32Array(P.count);
  for (let i = 0; i < P.count; i++) tp[i] = P.getY(i);
  st.setAttribute('aTip', new THREE.BufferAttribute(tp, 1));
  const N = 70, sm = new THREE.InstancedMesh(st, solidMaterial(U, { col: 'mix(vec3(0.14, 0.07, 0.03), vec3(0.42, 0.3, 0.12), smoothstep(0.8, 0.95, vTip))', rough: 0.7, wrap: 0.5 }), N);
  const R = rng(41), M = new THREE.Matrix4(), Q = new THREE.Quaternion(), S = new THREE.Vector3(), Pv = new THREE.Vector3(), E = new THREE.Euler();
  for (let i = 0; i < N; i++) {
    const r = Math.sqrt(R()) * 0.095, a = R() * Math.PI * 2;
    Pv.set(x0 - 0.015, Math.cos(a) * r, Math.sin(a) * r);
    // Each stamen stands out of the crown, leaning outward a little.
    E.set((R() - 0.5) * 0.5 + Math.sin(a) * r * 3, 0, Math.PI / 2 + (R() - 0.5) * 0.4 - Math.cos(a) * r * 3);
    Q.setFromEuler(E);
    S.set(1, 0.07 + R() * 0.06, 1);
    sm.setMatrixAt(i, M.compose(Pv, Q, S));
  }
  grp.add(sm);
  return grp;
}

export const pomegranate = {
  id: 'pomegranate', label: 'Pomegranate', A, B, C,
  // A globe with five soft flats and slow bumps, a little flat at the ends.
  // The flats are even in the angle, and the bumps fade at the cut, so the halves meet.
  shape: (() => {
    const nz = createNoise3D(rng(5));
    return (t, ph, e) => {
      const s = Math.sqrt(Math.max(0, 1 - t * t));
      const bump = 0.018 * t * nz(Math.cos(ph) * 1.4, Math.sin(ph) * 1.4, t * 1.6 + (e > 0 ? 5 : 0));
      return Math.pow(Math.max(0, 1 - t * t), 0.42) * (1 + e * t * 0.5) * (1 + 0.022 * Math.cos(5 * ph) * s + bump);
    };
  })(),
  look: {
    thru: [0.9, 0.06, 0.05], thruK: 3,
    skinA: [0.13, 0.004, 0.01], skinB: [0.34, 0.016, 0.022], mottle: 2.6,
    blush: [0.34, 0.09, 0.05], blushK: 0.2, blushDir: [0.2, -0.8, 0.4],
    pores: 0.03, poreScale: 55, rough: 0.24, f0: 0.045, wrap: 0.25, sss: [0.55, 0.06, 0.05],
    speck: [0.8, 60, 0.55], speckCol: [0.06, 0.012, 0.01],
    sheen: [0.05, 0.015, 0.015], tipDark: 0.25,
    glsl: /* glsl */`
      // Pale patches where the sun missed, and darker wine blotches.
      base = mix(base, vec3(0.4, 0.1, 0.06), smoothstep(0.6, 0.88, vn(fp * 1.7 + 3.0)) * 0.35);
      base *= 1.0 - 0.4 * smoothstep(0.55, 0.9, vn(fp * 5.0 + 7.0));
      // Fine streaks run from crown to base.
      base *= 0.92 + 0.08 * vn(vec3(fp.x * 3.0, fp.y * 26.0, fp.z * 26.0));
      // Small brown scars, matte.
      float scar = smoothstep(0.86, 0.9, vn(fp * 11.0 + 11.0)) * smoothstep(0.4, 0.6, vn(fp * 40.0));
      base = mix(base, vec3(0.13, 0.06, 0.025), scar * 0.85);
      roughAdd += scar * 0.5 + 0.12 * vn(fp * 3.0 + 2.0);`,
  },
  fuzz: { k: 0, root: [[0.18, 0.015, 0.015], [0.3, 0.03, 0.025]], tip: [0.45, 0.1, 0.07], trans: [0.6, 0.14, 0.1], len: 0.07, width: 1 },
  juice: [0.85, 0.05, 0.12],
  glow: 0.45,
  tip(U, g, mat, e) {
    if (e > 0) {
      // The crown is large: about a third of the fruit across.
      const cr = crown(U, 0);
      cr.scale.setScalar(1.45);
      cr.position.x = -A * 0.96;
      g.add(cr);
    }
    else {
      const n = new THREE.SphereGeometry(1, 16, 10);
      n.scale(0.025, 0.045, 0.045);
      n.translate(-A + 0.006, 0, 0);
      g.add(new THREE.Mesh(n, mat));
    }
  },
  face(U, g, R) {
    const bed = bedMesh(U, this, BED, { bumpK: 1, wet: 1.0, depth: 0.004 });
    // The chamber floor: dark juice deep under the arils.
    const floor = bedMesh(U, this, FLOOR, { depth: 0.14, wet: 0.4 });
    const ar = arils(U, R);
    g.add(bed, floor, ar);
    return { bed, parts: [bed, floor, ar] };
  },
};
