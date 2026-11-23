// Kiwi fruit: the two halves, their skin, and the cut face of juice beads.
// Each half is built in its own space: the body toward -x, the cut face at x = 0.
import * as THREE from 'three';
import { LIGHT, DENT, BEAD } from './glsl.js';

// The fruit's size: half length, then the two cross radii.
export const A = 1.0, B = 0.8, C = 0.76;
// The cut face, in units of the face radius.
export const FACE = { core: 0.25, ring0: 0.28, ring1: 0.47, ray1: 0.86, peri: 0.965 };

// The radius of the body at a distance along the axis; e skews it to an egg.
export function profile(t, e) {
  return Math.pow(Math.max(0, 1 - t * t), 0.47) * (1 + e * t) * (1 - 0.06 * t * t * t * t);
}

// A fixed-seed random stream, so each load lays the same fruit.
export function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

const VERT_HEAD = /* glsl */`
${DENT}
varying vec3 vW, vN, vL;
`;

// The skin: a lathe from the cut edge to the tip.
function skinGeometry(e) {
  const NR = 48, NC = 96;
  const pos = [], uv = [], idx = [];
  for (let i = 0; i <= NR; i++) {
    const th = (i / NR) * Math.PI / 2;
    const t = Math.sin(th);
    const r = profile(t, e);
    for (let j = 0; j <= NC; j++) {
      const ph = (j / NC) * Math.PI * 2;
      pos.push(-A * t, B * r * Math.cos(ph), C * r * Math.sin(ph));
      uv.push(j / NC, i / NR);
    }
  }
  for (let i = 0; i < NR; i++) for (let j = 0; j < NC; j++) {
    const a = i * (NC + 1) + j, b = a + NC + 1;
    idx.push(a, b, a + 1, a + 1, b, b + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

// A dented point and its normal, by finite steps along the surface.
const DENTED = /* glsl */`
vec3 tA = normalize(cross(normal, abs(normal.y) < 0.9 ? vec3(0, 1, 0) : vec3(1, 0, 0)));
vec3 tB = cross(normal, tA);
vec3 p0 = dent(position);
vec3 nD = normalize(cross(dent(position + tA * 0.01) - p0, dent(position + tB * 0.01) - p0));
if (dot(nD, normal) < 0.0) nD = -nD;
vL = position;
vec4 wp = modelMatrix * vec4(p0, 1.0);
vW = wp.xyz;
vN = normalize(mat3(modelMatrix) * nD);
gl_Position = projectionMatrix * viewMatrix * wp;
`;

export function skinMaterial(U) {
  return new THREE.ShaderMaterial({
    uniforms: U,
    vertexShader: `${VERT_HEAD}\nvoid main() {\n${DENTED}\n}`,
    fragmentShader: /* glsl */`
      ${LIGHT}
      uniform float uFuzz, uSide;
      varying vec3 vW, vN, vL;
      void main() {
        vec3 n = normalize(vN);
        vec3 v = normalize(cameraPosition - vW);
        // Brown skin, mottled in fruit space, so the seam does not show.
        vec3 fp = vL * vec3(uSide, 1.0, uSide);
        float m = vn(fp * 7.0) * 0.6 + vn(fp * 19.0) * 0.4;
        vec3 base = mix(vec3(0.045, 0.022, 0.009), vec3(0.11, 0.058, 0.022), m);
        base *= 1.0 - 0.25 * smoothstep(0.7, 1.0, abs(vL.x));
        float k = toon(dot(n, uKeyDir) * 0.5 + 0.5);
        vec3 col = base * (uKeyCol * k + hemi(n) * 0.6);
        // Velvet: fine fuzz lights up at grazing angles.
        float nv = clamp(dot(n, v), 0.0, 1.0);
        float sheen = pow(1.0 - nv, 2.4);
        vec3 fuzzCol = vec3(0.22, 0.14, 0.06);
        // A toon rim: one crisp band where the back light grazes.
        float rimK = smoothstep(0.6, 0.68, 1.0 - nv) * smoothstep(0.0, 0.35, dot(n, uRimDir));
        col += vec3(0.42, 0.26, 0.1) * uRimCol * rimK * 0.3 * (0.4 + 0.6 * uFuzz);
        col += fuzzCol * sheen * (uKeyCol * (0.25 + 0.6 * max(dot(n, uKeyDir), 0.0)) + uRimCol * 0.9 * max(dot(n, uRimDir) + 0.3, 0.0)) * (0.5 + 0.5 * uFuzz);
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
}

// The flesh bed under the beads: light that has soaked through the half.
function bedMaterial(U) {
  return new THREE.ShaderMaterial({
    uniforms: U,
    vertexShader: `${VERT_HEAD}\nvarying vec2 vF;\nvoid main() {\nvF = vec2(position.y / ${B.toFixed(3)}, position.z / ${C.toFixed(3)});\n${DENTED}\n}`,
    fragmentShader: /* glsl */`
      ${LIGHT}
      uniform float uGlow;
      varying vec3 vW, vN, vL;
      varying vec2 vF;
      void main() {
        float r = length(vF);
        float a = atan(vF.y, vF.x);
        vec3 n = normalize(vN);
        // Rays of light run out from the core between the cells.
        float ray = pow(abs(sin(a * 20.0 + sin(r * 9.0) * 0.4)), 6.0);
        vec3 inner = vec3(0.30, 0.50, 0.035);
        vec3 outer = vec3(0.10, 0.34, 0.012);
        vec3 col = mix(inner, outer, smoothstep(0.3, 0.8, r));
        col = mix(col, vec3(0.42, 0.62, 0.08), ray * 0.6 * smoothstep(0.45, 0.6, r) * (1.0 - smoothstep(0.84, 0.88, r)));
        // The pale band under the skin, then the skin's own edge.
        col = mix(col, vec3(0.24, 0.42, 0.05), smoothstep(${FACE.ray1.toFixed(3)}, ${(FACE.ray1 + 0.02).toFixed(3)}, r));
        col = mix(col, vec3(0.06, 0.03, 0.012), smoothstep(${FACE.peri.toFixed(3)}, ${(FACE.peri + 0.012).toFixed(3)}, r));
        float k = toon(dot(n, uKeyDir) * 0.5 + 0.5);
        vec3 lit = col * (uKeyCol * (0.3 + 0.7 * k) * 0.55 + hemi(n) * 0.5);
        // Glow: the rim light soaks through the thin outer flesh.
        lit += col * uRimCol * uGlow * 0.35 * (0.35 + 0.65 * smoothstep(0.4, 0.95, r)) * (1.0 - smoothstep(0.95, 0.97, r));
        gl_FragColor = vec4(lit, 1.0);
      }`,
  });
}

// The juice beads: each a small turbid ellipsoid, lit through its chords.
function beadMaterial(U) {
  return new THREE.ShaderMaterial({
    uniforms: U,
    vertexShader: /* glsl */`
      ${DENT}
      ${'uniform vec3 uKeyDir, uRimDir;'}
      attribute vec3 aCol;
      attribute float aSig;
      varying vec3 vP, vEye, vKey, vRim, vW, vN, vCol;
      varying float vSig, vScale;
      void main() {
        mat4 m = modelMatrix * instanceMatrix;
        mat4 im = inverse(m);
        vP = position;
        vEye = (im * vec4(cameraPosition, 1.0)).xyz;
        vKey = normalize(mat3(im) * uKeyDir);
        vRim = normalize(mat3(im) * uRimDir);
        vec3 c = (instanceMatrix * vec4(0, 0, 0, 1)).xyz;
        vec3 hp = (instanceMatrix * vec4(position, 1.0)).xyz;
        hp += dent(c) - c;
        vec4 wp = modelMatrix * vec4(hp, 1.0);
        vW = wp.xyz;
        vN = normalize(mat3(m) * (position / vec3(dot(instanceMatrix[0].xyz, instanceMatrix[0].xyz), dot(instanceMatrix[1].xyz, instanceMatrix[1].xyz), dot(instanceMatrix[2].xyz, instanceMatrix[2].xyz))));
        vCol = aCol;
        vSig = aSig;
        vScale = length(instanceMatrix[1].xyz) * 12.0;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }`,
    fragmentShader: /* glsl */`
      ${LIGHT}
      ${BEAD}
      uniform float uGlow;
      varying vec3 vP, vEye, vKey, vRim, vW, vN, vCol;
      varying float vSig, vScale;
      void main() {
        vec3 p = normalize(vP);
        vec3 v = normalize(vEye - vP);
        vec3 n = normalize(vN);
        vec3 vw = normalize(cameraPosition - vW);
        // Green juice: red and blue die out over the chord, green carries.
        vec3 sigma = vSig * (vec3(1.0) - vCol) * 2.2;
        vec3 sk = beadScatter(p, v, vKey, sigma, vScale);
        vec3 sr = beadScatter(p, v, vRim, sigma, vScale);
        vec3 through = beadThrough(p, v, sigma, vScale);
        // Light that comes through the bed behind: brightest at the thin rims.
        vec3 behind = vCol * uRimCol * uGlow * 0.5 + vCol * 0.05;
        float fw = 0.6 + 0.8 * pow(max(dot(-vw, uRimDir), 0.0), 2.0);
        vec3 col = vCol * (uKeyCol * sk * 0.9 + uRimCol * sr * fw * 0.45 + hemi(n) * 0.25) + behind * through;
        // A toon glint: one crisp wet highlight.
        vec3 h = normalize(uKeyDir + vw);
        float s = smoothstep(0.90, 0.93, pow(max(dot(n, h), 0.0), 24.0));
        float fr = pow(1.0 - max(dot(n, vw), 0.0), 4.0);
        col += uKeyCol * s * 0.9 + hemi(n) * fr * 0.25;
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
}

// The seeds: small glossy black drops.
function seedMaterial(U) {
  return new THREE.ShaderMaterial({
    uniforms: U,
    vertexShader: /* glsl */`
      ${DENT}
      varying vec3 vW, vN;
      void main() {
        mat4 m = modelMatrix * instanceMatrix;
        vec3 c = (instanceMatrix * vec4(0, 0, 0, 1)).xyz;
        vec3 hp = (instanceMatrix * vec4(position, 1.0)).xyz + dent(c) - c;
        vec4 wp = modelMatrix * vec4(hp, 1.0);
        vW = wp.xyz;
        vN = normalize(mat3(m) * normal);
        gl_Position = projectionMatrix * viewMatrix * wp;
      }`,
    fragmentShader: /* glsl */`
      ${LIGHT}
      varying vec3 vW, vN;
      void main() {
        vec3 n = normalize(vN);
        vec3 v = normalize(cameraPosition - vW);
        vec3 col = vec3(0.025, 0.02, 0.015) * (1.0 + hemi(n) * 2.0);
        vec3 h = normalize(uKeyDir + v);
        col += uKeyCol * smoothstep(0.82, 0.86, pow(max(dot(n, h), 0.0), 16.0)) * 0.8;
        col += uRimCol * 0.15 * pow(1.0 - max(dot(n, v), 0.0), 3.0);
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
}

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
        vec3 base = mix(vec3(0.62, 0.55, 0.30), vec3(0.42, 0.48, 0.14), smoothstep(0.55, 1.0, r));
        base *= 0.94 + 0.06 * sin(a * 23.0 + r * 4.0);
        float k = toon(dot(n, uKeyDir) * 0.5 + 0.5);
        vec3 col = base * (uKeyCol * (0.3 + 0.7 * k) * 0.55 + hemi(n) * 0.5);
        col += base * uRimCol * uGlow * 0.08;
        vec3 h = normalize(uKeyDir + v);
        col += uKeyCol * smoothstep(0.9, 0.93, pow(max(dot(n, h), 0.0), 30.0)) * 0.35;
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
}

// One half: skin, bed, core, beads and seeds. e skews the body to an egg.
export function makeHalf(U, e, seed) {
  const g = new THREE.Group();
  const skin = new THREE.Mesh(skinGeometry(e), skinMaterial(U));
  g.add(skin);
  // The tip: a stem nub on the wide half, a small knob on the other.
  const nubG = new THREE.SphereGeometry(1, 20, 12);
  nubG.scale(e > 0 ? 0.05 : 0.03, e > 0 ? 0.075 : 0.04, e > 0 ? 0.075 : 0.04);
  nubG.translate(-A - (e > 0 ? 0.0 : 0.005), 0, 0);
  g.add(new THREE.Mesh(nubG, skin.material));
  // The bed: a disc in the cut plane, a hair under the beads.
  const bedG = new THREE.CircleGeometry(1, 96);
  bedG.rotateY(Math.PI / 2);
  bedG.scale(1, B, C);
  bedG.translate(-0.012, 0, 0);
  const bed = new THREE.Mesh(bedG, bedMaterial(U));
  g.add(bed);
  // The core: a low dome proud of the face.
  const coreG = new THREE.SphereGeometry(1, 48, 16, 0, Math.PI * 2, 0, Math.PI / 2);
  coreG.rotateZ(-Math.PI / 2);
  coreG.scale(0.03, FACE.core * B, FACE.core * C);
  const core = new THREE.Mesh(coreG, coreMaterial(U));
  g.add(core);

  const R = rng(seed);
  const beads = [], seeds = [];
  const put = (list, rho, ph, sr, st, sx, x = -0.008) => list.push({ rho, ph, sr, st, sx, x });
  // Locules: fat beads between the core and the outer rays, seeds among them.
  const NL = 26;
  for (let i = 0; i < NL; i++) {
    const ph = (i + 0.5 * R()) / NL * Math.PI * 2;
    put(beads, 0.36 + R() * 0.04, ph, 0.075 + R() * 0.015, 0.05 + R() * 0.01, 0.026, -0.01);
    const ns = 2 + Math.floor(R() * 2);
    for (let k = 0; k < ns; k++) seeds.push({ rho: FACE.ring0 + 0.04 + R() * 0.13, ph: ph + (R() - 0.5) * 0.12 + Math.PI / NL });
  }
  // Rays: rows of slim beads out to the pale band.
  const NRAY = 40;
  for (let i = 0; i < NRAY; i++) {
    const ph0 = (i + R() * 0.3) / NRAY * Math.PI * 2;
    let rho = FACE.ring1 + 0.01;
    while (rho < FACE.ray1 - 0.04) {
      const len = 0.045 + rho * 0.06 + R() * 0.02;
      const c = rho + len;
      if (c + len * 0.6 > FACE.ray1) break;
      const w = (Math.PI * c / NRAY) * (0.62 + R() * 0.15);
      put(beads, c, ph0 + (R() - 0.5) * 0.03, len, w, 0.022 + R() * 0.008);
      rho = c + len + 0.006;
    }
  }
  const sph = new THREE.SphereGeometry(1, 18, 12);
  const bm = new THREE.InstancedMesh(sph, beadMaterial(U), beads.length);
  const aCol = new Float32Array(beads.length * 3), aSig = new Float32Array(beads.length);
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), S = new THREE.Vector3(), P = new THREE.Vector3(), E = new THREE.Euler();
  beads.forEach((b, i) => {
    const y = Math.cos(b.ph) * b.rho * B, z = Math.sin(b.ph) * b.rho * C;
    P.set(b.x, y, z);
    // Each bead's long axis runs out along its ray.
    E.set(b.ph, 0, 0);
    Q.setFromEuler(E);
    S.set(b.sx, b.sr * B, b.st * B);
    M.compose(P, Q, S);
    bm.setMatrixAt(i, M);
    const inner = b.rho < FACE.ring1;
    const t = R();
    const col = inner ? [0.40 + t * 0.1, 0.66, 0.06] : [0.12 + t * 0.10, 0.56 + t * 0.1, 0.03];
    aCol.set(col, i * 3);
    aSig[i] = inner ? 0.8 : 1.2 + t * 0.5;
  });
  bm.geometry = sph.clone();
  bm.geometry.setAttribute('aCol', new THREE.InstancedBufferAttribute(aCol, 3));
  bm.geometry.setAttribute('aSig', new THREE.InstancedBufferAttribute(aSig, 1));
  bm.frustumCulled = false;
  g.add(bm);

  const seedG = new THREE.SphereGeometry(1, 12, 8);
  const sm = new THREE.InstancedMesh(seedG, seedMaterial(U), seeds.length);
  seeds.forEach((s, i) => {
    P.set(0.004, Math.cos(s.ph) * s.rho * B, Math.sin(s.ph) * s.rho * C);
    E.set(s.ph, 0, 0);
    Q.setFromEuler(E);
    S.set(0.012, 0.024, 0.014);
    M.compose(P, Q, S);
    sm.setMatrixAt(i, M);
  });
  sm.frustumCulled = false;
  g.add(sm);
  g.userData = { skin, bed, core, beads: bm, seeds: sm };
  return g;
}
