// Pomegranate: a glossy red globe with a crown of sepals and dry stamens.
// Inside, arils pack the chambers between pith walls. Each aril is its own mesh:
// a teardrop pressed flat where it meets its neighbours. Arils that cross the cut
// are sliced flat and show their juice and a white seed in section.
import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { createNoise3D } from 'simplex-noise';
import { LIGHT, DENT, BEAD } from './glsl.js';
import { bedMesh, solidMaterial, rng } from './half.js';

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

// The aril shader: light through the juice, a seed seen inside, a sliced cap.
const ARIL_VERT = /* glsl */`
${DENT}
attribute vec3 aC, aSeed, aCol;
attribute float aR, aAo, aCut, aSig;
uniform vec3 uCamL, uKeyL, uRimL;
varying vec3 vP, vEye, vKey, vRim, vW, vN, vCol, vSeed, vCapN, vL;
varying float vAo, vCut, vSig;
void main() {
  // Bead space: the teardrop stays inside the unit sphere.
  vP = (position - aC) / (aR * 1.45);
  vEye = (uCamL - aC) / (aR * 1.45);
  vKey = uKeyL;
  vRim = uRimL;
  vSeed = (aSeed - aC) / (aR * 1.45);
  vec3 hp = position + dent(aC) - aC;
  vL = position;
  vec4 wp = modelMatrix * vec4(hp, 1.0);
  vW = wp.xyz;
  vN = normalize(mat3(modelMatrix) * normal);
  vCapN = normalize(mat3(modelMatrix) * vec3(1.0, 0.0, 0.0));
  vCol = aCol; vAo = aAo; vCut = aCut; vSig = aSig;
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;
const ARIL_FRAG = /* glsl */`
${LIGHT}
${BEAD}
uniform float uGlow;
varying vec3 vP, vEye, vKey, vRim, vW, vN, vCol, vSeed, vCapN, vL;
varying float vAo, vCut, vSig;
const float RS = 0.2;
void main() {
  bool cap = vCut > 0.5;
  vec3 n = normalize(cap ? vCapN : vN);
  vec3 vw = normalize(cameraPosition - vW);
  vec3 p = vP;
  vec3 v = normalize(vEye - vP);
  vec3 d = -v;
  // The view ray inside: to the far wall, or to the seed.
  float chord = max(exitLen(p, d), 0.0);
  vec3 oc = p - vSeed;
  float sb = dot(oc, d), sc = dot(oc, oc) - RS * RS, disc = sb * sb - sc;
  bool onSeed = false;
  if (disc > 0.0) { float t = -sb - sqrt(disc); if (t > 0.0 && t < chord) { chord = t; onSeed = true; } }
  vec3 sigma = vSig * (vec3(1.0) - vCol) * 3.2;
  float scale = 1.2;
  vec3 col;
  if (cap && sc < 0.0) {
    // The knife went through the seed: white seed flesh, a thin coat round it.
    float edge = smoothstep(RS * RS - 0.06, RS * RS - 0.01, dot(oc, oc));
    vec3 seed = mix(vec3(0.62, 0.55, 0.45), vec3(0.42, 0.24, 0.18), edge);
    col = shade(seed, n, vw, 0.35, 0.5, seed * 0.5, 0.0);
  } else {
    vec3 sk = beadScatter(p, v, vKey, sigma, scale, chord);
    vec3 sr = beadScatter(p, v, vRim, sigma, scale, chord);
    vec3 through = exp(-sigma * chord * scale);
    float fw = 0.6 + 0.9 * pow(max(dot(-vw, uRimDir), 0.0), 2.0);
    float skm = dot(sk, vec3(0.333)), srm = dot(sr, vec3(0.333));
    col = vCol * (uKeyCol * skm * 0.45 + uRimCol * srm * fw * 0.35 + hemi(n) * 0.08);
    if (onSeed) {
      vec3 sn = normalize(p + d * chord - vSeed);
      col += vec3(0.7, 0.45, 0.4) * (uKeyCol * (0.2 + 0.5 * max(dot(sn, vKey), 0.0)) + hemi(n) * 0.3) * through;
    } else {
      // Light that came in round the far side, dyed deep by the juice.
      col += vCol * (uRimCol * uGlow * 0.5 + uKeyCol * 0.16) * through;
    }
  }
  // Contact and depth: arils pressed together, and those deep in the chamber, sit in shade.
  col *= vAo * mix(0.45, 1.0, smoothstep(-0.11, -0.01, vL.x));
  // A wet skin: the studio, mirrored sharp.
  col += studio(reflect(-vw, n), cap ? 0.03 : 0.015) * fresnel(max(dot(n, vw), 0.0), 0.03);
  // max drops a NaN on D3D; one bad pixel must not bloom.
  gl_FragColor = vec4(min(max(col, vec3(0.0)), vec3(24.0)), 1.0);
}`;

// A smooth minimum: rounds the edge where two limits meet.
const smin = (a, b, k) => { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * 0.25; };

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
    list.push({ c, r, a, fr, loose });
  }
  const base = mergeVertices(new THREE.IcosahedronGeometry(1, 3).deleteAttribute('normal').deleteAttribute('uv'));
  const BP = base.attributes.position, nv = BP.count, ni = base.index.count;
  const n = list.length;
  const pos = new Float32Array(n * nv * 3), cen = new Float32Array(n * nv * 3), sed = new Float32Array(n * nv * 3), col = new Float32Array(n * nv * 3);
  const rad = new Float32Array(n * nv), ao = new Float32Array(n * nv), cut = new Float32Array(n * nv), sig = new Float32Array(n * nv);
  const idx = new Uint32Array(n * ni);
  const u = new THREE.Vector3(), nb = new THREE.Vector3(), axis = new THREE.Vector3();
  const noise = createNoise3D(rng(23));
  list.forEach((o, i) => {
    // Each aril hangs from a stalk: mostly along the ray, in or out, and a little tipped.
    axis.set(0, o.c.y, o.c.z).normalize().multiplyScalar(R() < 0.5 ? 1 : -1).add(new THREE.Vector3((R() - 0.5) * 1.2, (R() - 0.5) * 0.9, (R() - 0.5) * 0.9)).normalize();
    const near = list.filter(q => q !== o && q.c.distanceTo(o.c) < (q.r + o.r) * 1.5);
    const sliced = !o.loose && o.c.x + o.r * 0.95 > CUT;
    const t = R();
    const colr = [0.72 + t * 0.2, 0.004 + t * 0.02, 0.05 + t * 0.05];
    const sg = 0.9 + R() * 0.5;
    const seedC = o.c.clone().addScaledVector(axis, o.r * 0.3);
    for (let v = 0; v < nv; v++) {
      u.fromBufferAttribute(BP, v).normalize();
      // A long teardrop: an oval along the stalk, narrowing to a soft point at it.
      const ax = u.dot(axis);
      let rr = o.r / Math.sqrt((ax / 1.38) ** 2 + (1 - ax * ax) / 0.86 ** 2);
      rr *= (1 - 0.3 * Math.max(ax, 0) ** 3) * (1 + 0.04 * noise(u.x * 2 + i, u.y * 2, u.z * 2));
      const r0 = rr;
      // Pressed flat where a neighbour pushes back.
      for (const q of near) {
        nb.subVectors(q.c, o.c);
        const dist = nb.length();
        nb.divideScalar(dist);
        const k = u.dot(nb);
        if (k > 0.05) rr = smin(rr, (dist * o.r / (o.r + q.r) - 0.0015) / k, o.r * 0.25);
      }
      let isCut = 0;
      if (sliced && u.x > 0.02) {
        const tc = (CUT - o.c.x) / u.x;
        if (tc < rr) { rr = tc; isCut = 1; }
      }
      const j = i * nv + v;
      pos.set([o.c.x + u.x * rr, o.c.y + u.y * rr, o.c.z + u.z * rr], j * 3);
      cen.set([o.c.x, o.c.y, o.c.z], j * 3);
      sed.set([seedC.x, seedC.y, seedC.z], j * 3);
      col.set(colr, j * 3);
      rad[j] = o.r;
      // Faces pressed against a neighbour get less light.
      ao[j] = isCut ? 1 : 0.5 + 0.5 * Math.min(1, Math.max(0, (rr / r0 - 0.7) / 0.3));
      cut[j] = isCut;
      sig[j] = sg;
    }
    for (let q = 0; q < ni; q++) idx[i * ni + q] = base.index.array[q] + i * nv;
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('aC', new THREE.BufferAttribute(cen, 3));
  g.setAttribute('aSeed', new THREE.BufferAttribute(sed, 3));
  g.setAttribute('aCol', new THREE.BufferAttribute(col, 3));
  g.setAttribute('aR', new THREE.BufferAttribute(rad, 1));
  g.setAttribute('aAo', new THREE.BufferAttribute(ao, 1));
  g.setAttribute('aCut', new THREE.BufferAttribute(cut, 1));
  g.setAttribute('aSig', new THREE.BufferAttribute(sig, 1));
  g.setIndex(new THREE.BufferAttribute(idx, 1));
  g.computeVertexNormals();
  const AU = { ...U, uCamL: { value: new THREE.Vector3() }, uKeyL: { value: new THREE.Vector3() }, uRimL: { value: new THREE.Vector3() } };
  const mesh = new THREE.Mesh(g, new THREE.ShaderMaterial({ uniforms: AU, vertexShader: ARIL_VERT, fragmentShader: ARIL_FRAG }));
  // The camera and the lights, in the half's own space, before each draw.
  const inv = new THREE.Matrix4(), m3 = new THREE.Matrix3();
  mesh.onBeforeRender = (r, s, cam) => {
    inv.copy(mesh.matrixWorld).invert();
    AU.uCamL.value.setFromMatrixPosition(cam.matrixWorld).applyMatrix4(inv);
    m3.setFromMatrix4(inv);
    AU.uKeyL.value.copy(U.uKeyDir.value).applyMatrix3(m3).normalize();
    AU.uRimL.value.copy(U.uRimDir.value).applyMatrix3(m3).normalize();
  };
  mesh.frustumCulled = false;
  return mesh;
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
