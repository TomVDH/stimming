// Arils: juicy kernels as real geometry, packed against each other.
// Each is a teardrop on its stalk, pressed flat by a smooth minimum against each neighbour.
// Kernels that cross the cut can be sliced flat to show their juice and seed.
// Shading runs in each kernel's own sphere space: light through the juice, a seed inside.
import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { createNoise3D } from 'simplex-noise';
import { LIGHT, DENT, BEAD } from './glsl.js';
import { rng } from './half.js';

const f = x => x.toFixed(4);
const v3 = c => `vec3(${c.map(f).join(', ')})`;

// The defaults are the pomegranate's.
const DEF = {
  axis: (a, R) => new THREE.Vector3(0, a.c.y, a.c.z).normalize().multiplyScalar(R() < 0.5 ? 1 : -1).add(new THREE.Vector3((R() - 0.5) * 1.2, (R() - 0.5) * 0.9, (R() - 0.5) * 0.9)).normalize(),
  color: R => { const t = R(); return [0.72 + t * 0.2, 0.004 + t * 0.02, 0.05 + t * 0.05]; },
  sig: R => 0.9 + R() * 0.5,
  stretch: [1.38, 0.86], point: 0.3, lumpy: 0.04, soft: 0.25,
  seedK: 0.3, rs: 0.2, seedCol: [0.7, 0.45, 0.4], seedCut: [[0.62, 0.55, 0.45], [0.42, 0.24, 0.18]],
  cut: 0.004, scale: 1.2, scatter: 0.45, behind: 1, deep: [-0.11, -0.01], deepShade: 0.45,
  // Mesh detail, and the bead-space bound: it must hold the longest stretch.
  detail: 3, bound: 1.45, nearK: 1.5, aoMin: 0.5,
};

// The aril shader: light through the juice, a seed seen inside, a sliced cap.
const vert = o => /* glsl */`
${DENT}
attribute vec3 aC, aSeed, aCol;
attribute float aR, aAo, aCut, aSig;
uniform vec3 uCamL, uKeyL, uRimL;
varying vec3 vP, vEye, vKey, vRim, vW, vN, vCol, vSeed, vCapN, vL;
varying float vAo, vCut, vSig;
void main() {
  // Bead space: the teardrop stays inside the unit sphere.
  vP = (position - aC) / (aR * ${f(o.bound)});
  vEye = (uCamL - aC) / (aR * ${f(o.bound)});
  vKey = uKeyL;
  vRim = uRimL;
  vSeed = (aSeed - aC) / (aR * ${f(o.bound)});
  vec3 hp = position + dent(aC) - aC;
  vL = position;
  vec4 wp = modelMatrix * vec4(hp, 1.0);
  vW = wp.xyz;
  vN = normalize(mat3(modelMatrix) * normal);
  vCapN = normalize(mat3(modelMatrix) * vec3(1.0, 0.0, 0.0));
  vCol = aCol; vAo = aAo; vCut = aCut; vSig = aSig;
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;
const frag = o => /* glsl */`
${LIGHT}
${BEAD}
uniform float uGlow;
varying vec3 vP, vEye, vKey, vRim, vW, vN, vCol, vSeed, vCapN, vL;
varying float vAo, vCut, vSig;
const float RS = ${f(o.rs)};
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
  float scale = ${f(o.scale)};
  vec3 col;
  if (cap && sc < 0.0) {
    // The knife went through the seed: white seed flesh, a thin coat round it.
    float edge = smoothstep(RS * RS - 0.06, RS * RS - 0.01, dot(oc, oc));
    vec3 seed = mix(${v3(o.seedCut[0])}, ${v3(o.seedCut[1])}, edge);
    col = shade(seed, n, vw, 0.35, 0.5, seed * 0.5, 0.0);
  } else {
    vec3 sk = beadScatter(p, v, vKey, sigma, scale, chord);
    vec3 sr = beadScatter(p, v, vRim, sigma, scale, chord);
    vec3 through = exp(-sigma * chord * scale);
    float fw = 0.6 + 0.9 * pow(max(dot(-vw, uRimDir), 0.0), 2.0);
    float skm = dot(sk, vec3(0.333)), srm = dot(sr, vec3(0.333));
    col = vCol * (uKeyCol * skm * ${f(o.scatter)} + uRimCol * srm * fw * ${f(o.scatter * 0.78)} + hemi(n) * 0.08);
    if (onSeed) {
      vec3 sn = normalize(p + d * chord - vSeed);
      col += ${v3(o.seedCol)} * (uKeyCol * (0.2 + 0.5 * max(dot(sn, vKey), 0.0)) + hemi(n) * 0.3) * through;
    } else {
      // Light that came in round the far side, dyed deep by the juice.
      col += vCol * (uRimCol * uGlow * 0.5 + uKeyCol * 0.16) * through * ${f(o.behind)};
    }
  }
  // Contact and depth: arils pressed together, and those deep in the chamber, sit in shade.
  col *= vAo * mix(${f(o.deepShade)}, 1.0, smoothstep(${f(o.deep[0])}, ${f(o.deep[1])}, vL.x));
  // A wet skin: the studio, mirrored sharp.
  col += studio(reflect(-vw, n), cap ? 0.03 : 0.015) * fresnel(max(dot(n, vw), 0.0), 0.03);
  // max drops a NaN on D3D; one bad pixel must not bloom.
  gl_FragColor = vec4(min(max(col, vec3(0.0)), vec3(24.0)), 1.0);
}`;

// A smooth minimum: rounds the edge where two limits meet.
const smin = (a, b, k) => { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * 0.25; };

// Build the arils of list [{ c, r, loose }] as one mesh. o sets their look.
export function makeArils(U, list, R, opts = {}) {
  const o = { ...DEF, ...opts };
  const base = mergeVertices(new THREE.IcosahedronGeometry(1, o.detail).deleteAttribute('normal').deleteAttribute('uv'));
  const BP = base.attributes.position, nv = BP.count, ni = base.index.count;
  const n = list.length;
  const pos = new Float32Array(n * nv * 3), cen = new Float32Array(n * nv * 3), sed = new Float32Array(n * nv * 3), col = new Float32Array(n * nv * 3);
  const rad = new Float32Array(n * nv), ao = new Float32Array(n * nv), cut = new Float32Array(n * nv), sig = new Float32Array(n * nv);
  const idx = new Uint32Array(n * ni);
  const u = new THREE.Vector3(), nb = new THREE.Vector3(), axis = new THREE.Vector3();
  const noise = createNoise3D(rng(23));
  list.forEach((a, i) => {
    axis.copy(o.axis(a, R));
    const near = list.filter(q => q !== a && q.c.distanceTo(a.c) < (q.r + a.r) * o.nearK);
    const sliced = o.cut !== null && !a.loose && a.c.x + a.r * 0.95 > o.cut;
    const colr = o.color(R);
    const sg = o.sig(R);
    const seedC = a.c.clone().addScaledVector(axis, a.r * o.seedK);
    for (let v = 0; v < nv; v++) {
      u.fromBufferAttribute(BP, v).normalize();
      // A long teardrop: an oval along the stalk, narrowing to a soft point at it.
      const ax = u.dot(axis);
      // An item may carry its own stretch along the stalk.
      let rr = a.r / Math.sqrt((ax / (a.stretch ?? o.stretch[0])) ** 2 + (1 - ax * ax) / o.stretch[1] ** 2);
      rr *= (1 - o.point * Math.max(ax, 0) ** 3) * (1 + o.lumpy * noise(u.x * 2 + i, u.y * 2, u.z * 2));
      const r0 = rr;
      // Pressed flat where a neighbour pushes back.
      for (const q of near) {
        nb.subVectors(q.c, a.c);
        const dist = nb.length();
        nb.divideScalar(dist);
        const k = u.dot(nb);
        if (k > 0.05) rr = smin(rr, (dist * a.r / (a.r + q.r) - 0.0015) / k, a.r * o.soft);
      }
      let isCut = 0;
      if (sliced && u.x > 0.02) {
        const tc = (o.cut - a.c.x) / u.x;
        if (tc < rr) { rr = tc; isCut = 1; }
      }
      const j = i * nv + v;
      pos.set([a.c.x + u.x * rr, a.c.y + u.y * rr, a.c.z + u.z * rr], j * 3);
      cen.set([a.c.x, a.c.y, a.c.z], j * 3);
      sed.set([seedC.x, seedC.y, seedC.z], j * 3);
      col.set(colr, j * 3);
      rad[j] = a.r;
      // Faces pressed against a neighbour get less light.
      ao[j] = isCut ? 1 : o.aoMin + (1 - o.aoMin) * Math.min(1, Math.max(0, (rr / r0 - 0.7) / 0.3));
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
  const mesh = new THREE.Mesh(g, new THREE.ShaderMaterial({ uniforms: AU, vertexShader: vert(o), fragmentShader: frag(o) }));
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

