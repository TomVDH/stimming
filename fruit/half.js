// Fruit halves: the parts every fruit shares.
// A half lives in its own space: the body toward -x, the cut face at x = 0.
// Each fruit module gives the shape, the skin look and its cut face.
import * as THREE from 'three';
import { LIGHT, DENT, BEAD } from './glsl.js';

// A fixed-seed random stream, so each load lays the same fruit.
export function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

export const VERT_HEAD = /* glsl */`
${DENT}
uniform vec3 uKeyDir, uRimDir;
varying vec3 vW, vN, vL, vKeyL, vRimL;
`;

// A dented point and its normal, by finite steps along the surface.
export const DENTED = /* glsl */`
vec3 tA = normalize(cross(normal, abs(normal.y) < 0.9 ? vec3(0, 1, 0) : vec3(1, 0, 0)));
vec3 tB = cross(normal, tA);
vec3 p0 = dent(position);
vec3 nD = normalize(cross(dent(position + tA * 0.01) - p0, dent(position + tB * 0.01) - p0));
if (dot(nD, normal) < 0.0) nD = -nD;
vL = position;
vec4 wp = modelMatrix * vec4(p0, 1.0);
vW = wp.xyz;
vN = normalize(mat3(modelMatrix) * nD);
// The lights in the half's own space, for light through the fruit.
vKeyL = normalize(transpose(mat3(modelMatrix)) * uKeyDir);
vRimL = normalize(transpose(mat3(modelMatrix)) * uRimDir);
gl_Position = projectionMatrix * viewMatrix * wp;
`;

// The skin: a lathe from the cut edge to the tip.
// shape(t, ph) gives the radius share at axis share t and angle ph.
export function skinGeometry(F, e) {
  const NR = 48, NC = 96;
  const pos = [], idx = [];
  for (let i = 0; i <= NR; i++) {
    const t = Math.sin((i / NR) * Math.PI / 2);
    for (let j = 0; j <= NC; j++) {
      const ph = (j / NC) * Math.PI * 2;
      const r = F.shape(t, ph, e);
      pos.push(-F.A * t, F.B * r * Math.cos(ph), F.C * r * Math.sin(ph));
    }
  }
  for (let i = 0; i < NR; i++) for (let j = 0; j < NC; j++) {
    const a = i * (NC + 1) + j, b = a + NC + 1;
    idx.push(a, b, a + 1, a + 1, b, b + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  // The join ring: its normals lie in the cut plane, so both halves shade alike at the seam.
  const N = g.attributes.normal;
  for (let j = 0; j <= NC; j++) {
    const ny = N.getY(j), nz = N.getZ(j), l = Math.hypot(ny, nz) || 1;
    N.setXYZ(j, 0, ny / l, nz / l);
  }
  return g;
}

// The skin look, as uniforms. Every field has a default.
const LOOK = {
  skinA: [0.045, 0.022, 0.009], skinB: [0.11, 0.058, 0.022], mottle: 7,
  blush: [0, 0, 0], blushK: 0, blushDir: [0, 1, 0],
  pores: 0, poreScale: 60, rough: 0.7, f0: 0.04, wrap: 0.25, sss: [0, 0, 0],
  speck: [2, 80, 0], speckCol: [0, 0, 0],
  // Light through the fruit: its colour, and how fast the flesh dims it per unit.
  thru: [0.9, 0.35, 0.1], thruK: 3,
  sheen: [0.22, 0.14, 0.06], tipDark: 0.25,
};
export function skinMaterial(U, look) {
  const L = { ...LOOK, ...look };
  const v3 = a => ({ value: new THREE.Vector3(...a) });
  return new THREE.ShaderMaterial({
    uniforms: {
      ...U,
      uSkinA: v3(L.skinA), uSkinB: v3(L.skinB), uMottle: { value: L.mottle },
      uBlush: v3(L.blush), uBlushK: { value: L.blushK }, uBlushDir: v3(L.blushDir),
      uPores: { value: L.pores }, uPoreScale: { value: L.poreScale }, uRough: { value: L.rough }, uF0: { value: L.f0 }, uWrap: { value: L.wrap }, uSss: v3(L.sss),
      uSpeck: v3(L.speck), uSpeckCol: v3(L.speckCol), uThru: v3(L.thru), uThruK: { value: L.thruK },
      uSheen: v3(L.sheen), uTipDark: { value: L.tipDark },
    },
    vertexShader: `${VERT_HEAD}\nvoid main() {\n${DENTED}\n}`,
    fragmentShader: /* glsl */`
      ${LIGHT}
      uniform float uFuzz, uSide, uMottle, uBlushK, uPores, uPoreScale, uRough, uF0, uWrap, uTipDark;
      uniform vec3 uSkinA, uSkinB, uBlush, uBlushDir, uSheen, uSss, uSpeck, uSpeckCol, uThru, uAbc;
      uniform float uThruK, uCut;
      varying vec3 vW, vN, vL, vKeyL, vRimL;
      void main() {
        vec3 n = normalize(vN);
        vec3 v = normalize(cameraPosition - vW);
        // Colour and pores in fruit space, so the seam does not show.
        vec3 fp = vL * vec3(uSide, 1.0, uSide);
        if (uPores > 0.0) {
          vec3 q = fp * uPoreScale;
          float e = 0.35, c = vn(q);
          vec3 g = vec3(vn(q + vec3(e, 0, 0)) - c, vn(q + vec3(0, e, 0)) - c, vn(q + vec3(0, 0, e)) - c) / e;
          n = normalize(n - uPores * (g - n * dot(g, n)));
        }
        float m = vn(fp * uMottle) * 0.6 + vn(fp * uMottle * 2.7) * 0.4;
        vec3 base = mix(uSkinA, uSkinB, m);
        // A blush on the sun side, broken by noise.
        float bl = uBlushK * smoothstep(-0.3, 0.7, dot(normalize(fp + vec3(1e-4)), uBlushDir) + (vn(fp * 4.0) - 0.5) * 0.8);
        base = mix(base, uBlush, clamp(bl, 0.0, 1.0));
        base *= 1.0 - uTipDark * smoothstep(0.7, 1.0, abs(vL.x) / 0.95);
        // Specks: lenticels and oil glands, small dots in the skin.
        float sp = smoothstep(uSpeck.x, uSpeck.x + 0.04, vn(fp * uSpeck.y));
        base = mix(base, uSpeckCol, sp * uSpeck.z);
        // The fruit's own detail: patches, scars, rougher spots.
        float roughAdd = 0.0;
        ${L.glsl || ''}
        // Fuzz hides the skin's shine: it reads rougher as the fuzz grows.
        float rough = mix(clamp(uRough + roughAdd, 0.02, 1.0), 0.95, uFuzz * 0.7);
        vec3 col = shade(base, n, v, rough, uWrap, uSss * base, uF0 * (1.0 - 0.6 * uFuzz));
        float nv = clamp(dot(n, v), 0.0, 1.0);
        // Velvet: fine fuzz lights up at grazing angles.
        float sheen = pow(1.0 - nv, 2.4);
        // Light through the fruit: the path a light's ray runs inside before it reaches
        // this point, through the fruit's ellipsoid; a half's cut face lets light in early.
        {
          vec3 q = vL / uAbc;
          vec3 back = vec3(0.0);
          for (int i = 0; i < 2; i++) {
            vec3 Lw = i == 0 ? uRimDir : uKeyDir;
            vec3 Ll = normalize(i == 0 ? vRimL : vKeyL);
            vec3 dl = Ll / uAbc;
            float a2 = dot(dl, dl), b2 = dot(q, dl), c2 = dot(q, q) - 1.0;
            float t = (-b2 + sqrt(max(b2 * b2 - a2 * c2, 0.0))) / a2;
            if (uCut > 0.5 && Ll.x > 0.001) t = min(t, max(-vL.x / Ll.x, 0.0));
            // Forward scattering: brightest looking toward the light.
            float ph = 0.15 + 1.4 * pow(max(dot(-v, Lw), 0.0), 3.0);
            back += (i == 0 ? uRimCol : uKeyCol) * exp(-uThruK * t) * ph * smoothstep(-0.2, 0.3, -dot(n, Lw));
          }
          col += uThru * back * 1.8 * (1.0 - 0.7 * uFuzz);
        }
        col += uSheen * sheen * (uKeyCol * (0.25 + 0.6 * max(dot(n, uKeyDir), 0.0)) + uRimCol * 0.9 * max(dot(n, uRimDir) + 0.3, 0.0)) * (0.5 + 0.5 * uFuzz);
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
}

// A disc with an oval hole: rings from the hole's edge out to the rim.
function ringGeometry([hy, hz]) {
  const N = 128, M = 10, pos = [], idx = [];
  for (let j = 0; j <= M; j++) for (let i = 0; i <= N; i++) {
    const th = (i / N) * Math.PI * 2, t = j / M;
    // The circle's x runs to -z in half space; the hole is set in face units.
    const hx = Math.cos(th) * hz, hyy = Math.sin(th) * hy;
    pos.push(hx + (Math.cos(th) - hx) * t, hyy + (Math.sin(th) - hyy) * t, 0);
  }
  for (let j = 0; j < M; j++) for (let i = 0; i < N; i++) {
    const a = j * (N + 1) + i, b = a + N + 1;
    idx.push(a, b, a + 1, a + 1, b, b + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(pos.map((_, k) => (k % 3 === 2 ? 1 : 0)), 3));
  g.setIndex(idx);
  return g;
}

// The cut face's bed: a disc in the cut plane, a hair under the beads.
// bed is GLSL: vec3 bed(vec2 f, float r, float a, inout float glow).
// The GLSL also gives float relief(vec2 f): the cut's height, for the wet film.
export function bedMesh(U, F, bed, { depth = 0.012, wet = 1, rough = 0.5, wrap = 0.6, bumpK = 1, hole = null } = {}) {
  const g = hole ? ringGeometry(hole) : new THREE.CircleGeometry(1, 128);
  // The rim follows the fruit's own outline at the cut, crease and all.
  const P = g.attributes.position;
  for (let i = 0; i < P.count; i++) {
    const x = P.getX(i), y = P.getY(i), ph = Math.atan2(-x, y), k = F.shape(0, ph, 0);
    P.setXY(i, x * k, y * k);
  }
  g.rotateY(Math.PI / 2);
  g.scale(1, F.B, F.C);
  g.translate(-depth, 0, 0);
  const m = new THREE.ShaderMaterial({
    uniforms: U,
    vertexShader: `${VERT_HEAD}\nvarying vec2 vF;\nvarying vec3 vTy, vTz;\nvoid main() {\nvF = vec2(position.y / ${F.B.toFixed(3)}, position.z / ${F.C.toFixed(3)});\nvTy = normalize(mat3(modelMatrix) * vec3(0, 1, 0));\nvTz = normalize(mat3(modelMatrix) * vec3(0, 0, 1));\n${DENTED}\n}`,
    fragmentShader: /* glsl */`
      ${LIGHT}
      uniform float uGlow;
      varying vec3 vW, vN, vL;
      varying vec2 vF;
      varying vec3 vTy, vTz;
      // The view ray's slide across the face per unit of depth, in face units.
      // A fruit reads it to draw flesh below the cut, for depth.
      vec2 gPar;
      ${bed}
      void main() {
        float r = length(vF);
        float a = atan(vF.y, vF.x);
        vec3 n = normalize(vN);
        vec3 v = normalize(cameraPosition - vW);
        gPar = vec2(dot(v, vTy), dot(v, vTz)) / max(dot(v, n), 0.25);
        float glow = 0.0;
        vec3 col = bed(vF, r, a, glow);
        // The cut is wet: its relief breaks a film of juice.
        float e = 0.0012;
        float h0 = relief(vF), hy = relief(vF + vec2(e, 0.0)), hz = relief(vF + vec2(0.0, e));
        vec3 nw = normalize(n - (vTy * (hy - h0) + vTz * (hz - h0)) / e * ${bumpK.toFixed(2)});
        // A cut face tips up into the key; flesh holds less light than paint.
        vec3 lit = shade(col * 0.72, nw, v, ${rough.toFixed(2)}, ${wrap.toFixed(2)}, col * 0.45, 0.0);
        // Glow: the back light soaks through the thin flesh, most when we look toward it.
        lit += col * uRimCol * uGlow * glow * (0.2 + 1.1 * pow(max(dot(-v, uRimDir), 0.0), 2.0));
        float nv = clamp(dot(nw, v), 0.0, 1.0);
        lit += studio(reflect(-v, nw), 0.04) * fresnel(nv, 0.025) * ${wet.toFixed(2)};
        gl_FragColor = vec4(lit, 1.0);
      }`,
  });
  return new THREE.Mesh(g, m);
}

// Juice beads: instanced turbid ellipsoids, lit through their chords.
// Each bead: { p: [x, y, z], ph (turn about x), s: [sx, sy, sz], col, sig, seed }.
export function beadMesh(U, beads, { seedCol = [0.9, 0.82, 0.7], scale = 12, wet = 0.9, behind = 1 } = {}) {
  const m = new THREE.ShaderMaterial({
    uniforms: { ...U, uSeedCol: { value: new THREE.Vector3(...seedCol) } },
    vertexShader: /* glsl */`
      ${DENT}
      uniform vec3 uKeyDir, uRimDir;
      attribute vec3 aCol;
      attribute float aSig, aSeed;
      varying vec3 vP, vEye, vKey, vRim, vW, vN, vCol;
      varying float vSig, vScale, vSeed;
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
        vec3 s2 = vec3(dot(instanceMatrix[0].xyz, instanceMatrix[0].xyz), dot(instanceMatrix[1].xyz, instanceMatrix[1].xyz), dot(instanceMatrix[2].xyz, instanceMatrix[2].xyz));
        vN = normalize(mat3(m) * (position / s2));
        vCol = aCol;
        vSig = aSig;
        vSeed = aSeed;
        vScale = length(instanceMatrix[1].xyz) * ${scale.toFixed(1)};
        gl_Position = projectionMatrix * viewMatrix * wp;
      }`,
    fragmentShader: /* glsl */`
      ${LIGHT}
      ${BEAD}
      uniform float uGlow;
      uniform vec3 uSeedCol;
      varying vec3 vP, vEye, vKey, vRim, vW, vN, vCol;
      varying float vSig, vScale, vSeed;
      void main() {
        vec3 p = normalize(vP);
        vec3 v = normalize(vEye - vP);
        vec3 n = normalize(vN);
        vec3 vw = normalize(cameraPosition - vW);
        // Coloured juice: the other channels die out over the chord.
        vec3 sigma = vSig * (vec3(1.0) - vCol) * 2.2;
        bool onSeed;
        float chord = viewChord(p, v, vSeed, onSeed);
        vec3 sk = beadScatter(p, v, vKey, sigma, vScale, chord);
        vec3 sr = beadScatter(p, v, vRim, sigma, vScale, chord);
        vec3 through = exp(-sigma * chord * vScale);
        float fw = 0.6 + 0.8 * pow(max(dot(-vw, uRimDir), 0.0), 2.0);
        // The juice scatters in its own colour; the chords set how much.
        float skm = dot(sk, vec3(0.333)), srm = dot(sr, vec3(0.333));
        vec3 col = vCol * (uKeyCol * skm * 0.55 + uRimCol * srm * fw * 0.3 + hemi(n) * 0.15);
        if (onSeed) {
          // The seed inside, seen through the juice in front of it.
          vec3 q = p - v * chord;
          vec3 sn = normalize(q);
          float sl = toon2(dot(sn, vKey));
          col += uSeedCol * (uKeyCol * (0.25 + 0.6 * sl) + hemi(n) * 0.4) * through;
        } else {
          // Light from the bed behind: brightest at the thin rims.
          col += (vCol * uRimCol * uGlow * 0.6 + vCol * uKeyCol * 0.35) * through * ${behind.toFixed(2)};
        }
        // A wet skin of juice: the studio, mirrored.
        col += studio(reflect(-vw, n), 0.03) * fresnel(max(dot(n, vw), 0.0), 0.025) * ${wet.toFixed(2)};
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  const sph = new THREE.SphereGeometry(1, 18, 12);
  const n = beads.length;
  const aCol = new Float32Array(n * 3), aSig = new Float32Array(n), aSeed = new Float32Array(n);
  const mesh = new THREE.InstancedMesh(sph, m, n);
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), S = new THREE.Vector3(), P = new THREE.Vector3(), E = new THREE.Euler();
  beads.forEach((b, i) => {
    P.set(...b.p);
    E.set(b.ph, b.yaw ?? 0, b.roll ?? 0);
    Q.setFromEuler(E);
    S.set(...b.s);
    M.compose(P, Q, S);
    mesh.setMatrixAt(i, M);
    aCol.set(b.col, i * 3);
    aSig[i] = b.sig;
    aSeed[i] = b.seed ?? 0;
  });
  sph.setAttribute('aCol', new THREE.InstancedBufferAttribute(aCol, 3));
  sph.setAttribute('aSig', new THREE.InstancedBufferAttribute(aSig, 1));
  sph.setAttribute('aSeed', new THREE.InstancedBufferAttribute(aSeed, 1));
  mesh.frustumCulled = false;
  return mesh;
}

// A plain toon solid for small parts: seeds, a stone, a crown.
// col is GLSL for the base colour; it may read vL, the half-space point.
export function solidMaterial(U, { col = 'vec3(0.03)', rough = 0.3, f0 = 0.04, wrap = 0.2, sss = 'vec3(0.0)', bump = 0, bumpScale = 30, side = THREE.FrontSide } = {}) {
  return new THREE.ShaderMaterial({
    uniforms: U, side,
    vertexShader: /* glsl */`
      ${DENT}
      // aTip runs 0 at a part's base to 1 at its tip; absent, it reads 0.
      attribute float aTip;
      varying vec3 vW, vN, vL;
      varying float vTip;
      void main() {
        vTip = aTip;
        #ifdef USE_INSTANCING
          mat4 im = instanceMatrix;
        #else
          mat4 im = mat4(1.0);
        #endif
        mat4 m = modelMatrix * im;
        vec3 c = (im * vec4(0, 0, 0, 1)).xyz;
        vec3 hp = (im * vec4(position, 1.0)).xyz;
        vL = hp;
        hp += dent(c) - c;
        vec4 wp = modelMatrix * vec4(hp, 1.0);
        vW = wp.xyz;
        vec3 s2 = vec3(dot(im[0].xyz, im[0].xyz), dot(im[1].xyz, im[1].xyz), dot(im[2].xyz, im[2].xyz));
        vN = normalize(mat3(m) * (normal / s2));
        gl_Position = projectionMatrix * viewMatrix * wp;
      }`,
    fragmentShader: /* glsl */`
      ${LIGHT}
      varying vec3 vW, vN, vL;
      varying float vTip;
      void main() {
        vec3 n = normalize(vN);
        // A hollow shows its inside: the normal turns to the eye.
        if (!gl_FrontFacing) n = -n;
        ${bump > 0 ? `{
          vec3 q = vL * ${bumpScale.toFixed(1)};
          float e = 0.3, c = vn(q);
          vec3 g = vec3(vn(q + vec3(e, 0, 0)) - c, vn(q + vec3(0, e, 0)) - c, vn(q + vec3(0, 0, e)) - c) / e;
          n = normalize(n - ${bump.toFixed(2)} * (g - n * dot(g, n)));
        }` : ''}
        vec3 v = normalize(cameraPosition - vW);
        vec3 base = ${col};
        vec3 c = shade(base, n, v, ${rough.toFixed(2)}, ${wrap.toFixed(2)}, ${sss} * base, ${f0.toFixed(3)});
        gl_FragColor = vec4(c, 1.0);
      }`,
  });
}

// One half of a fruit def F. e skews the body: the two halves differ.
// F.face(U, g, R, e) adds the cut face and returns its parts.
export function makeHalf(F, U, e, seed) {
  const g = new THREE.Group();
  const skinMat = skinMaterial(U, F.look);
  const skin = new THREE.Mesh(skinGeometry(F, e), skinMat);
  g.add(skin);
  F.tip?.(U, g, skinMat, e);
  const face = F.face(U, g, rng(seed), e);
  g.userData = { skin, bed: face.bed, faceParts: face.parts };
  return g;
}
