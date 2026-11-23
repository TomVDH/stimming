// Fruit fuzz: short hairs as instanced camera-facing ribbons.
// Each hair is a cubic curve on four control points, rooted on the skin.
import * as THREE from 'three';
import { MeshSurfaceSampler } from 'three/addons/math/MeshSurfaceSampler.js';
import { LIGHT, DENT } from './glsl.js';
import { createNoise3D } from 'simplex-noise';
import { rng } from './half.js';

const SEG = 5;
// Hair counts per half for Low, Standard and High.
const COUNT = [7000, 17000, 30000];

const VERT = /* glsl */`
${DENT}
uniform float uLen, uWidth, uRuffle, uTime, uPx, uSide, uLift, uCurl, uPatch;
attribute float aPatch;
uniform vec3 uFlow, uGrav;
attribute float aT, aSide;
attribute vec3 aRoot, aNrm;
attribute vec4 aRnd;
varying vec3 vT, vW, vNs;
varying float vTt, vCov, vRootK;
vec3 bez(vec3 a, vec3 b, vec3 c, vec3 d, float t) {
  float s = 1.0 - t;
  return s * s * s * a + 3.0 * s * s * t * b + 3.0 * s * t * t * c + t * t * t * d;
}
vec3 dbez(vec3 a, vec3 b, vec3 c, vec3 d, float t) {
  float s = 1.0 - t;
  return 3.0 * s * s * (b - a) + 6.0 * s * t * (c - b) + 3.0 * t * t * (d - c);
}
void main() {
  vec3 n = normalize(aNrm);
  // The comb runs one way in fruit space, so the seam shows no parting.
  vec3 tip = normalize(vec3(0.75 * uSide, -0.6, 0.15 * uSide));
  vec3 comb = tip - n * dot(tip, n);
  float sw = aRnd.y * 6.2832;
  vec3 side = normalize(cross(n, comb + vec3(1e-4, 2e-4, 0.0)));
  comb = normalize(normalize(comb + vec3(1e-4)) * 0.8 + side * (sin(sw) * 0.9 + sin(aRoot.y * 23.0 + aRoot.z * 17.0) * 0.5));
  // Rubbed patches: the hairs there are short and lie flat.
  float len = uLen * (0.55 + 0.75 * aRnd.x) * (1.0 - uPatch * aPatch);
  // A ruffle: each hair lifts and twists while the fruit squeezes.
  float ru = uRuffle * (0.6 + 0.8 * fract(aRnd.w * 7.3));
  vec3 lift = n * (uLift + 0.3 * aRnd.z + ru * 0.7) * (1.0 - 0.6 * uPatch * aPatch);
  vec3 p0 = dent(aRoot);
  vec3 p1 = p0 + (lift * 0.9 + comb * 0.25) * len * 0.33;
  vec3 p2 = p1 + (lift * 0.45 + comb * 0.8 + side * aRnd.z * 0.4 + uFlow * 0.5) * len * 0.36;
  // Curl hooks the tip over, as on long spines.
  vec3 p3 = p2 + (lift * (0.1 - uCurl * 0.6) + comb * (0.75 + uCurl) - side * aRnd.z * 0.5 + uFlow * 1.1 + uGrav * 0.25 + side * ru * sin(uTime * 30.0 + aRnd.w * 40.0) * 0.4) * len * 0.36;
  vec3 hp = bez(p0, p1, p2, p3, aT);
  vec3 ht = dbez(p0, p1, p2, p3, aT);
  vec4 wp = modelMatrix * vec4(hp, 1.0);
  vec3 T = normalize(mat3(modelMatrix) * ht);
  vec3 V = normalize(cameraPosition - wp.xyz);
  vec3 S = normalize(cross(T, V));
  // A hair under one pixel keeps one pixel and fades instead.
  float wdt = uWidth * (1.0 - 0.75 * aT);
  float dist = length(cameraPosition - wp.xyz);
  float minW = uPx * dist;
  vCov = clamp(wdt / minW, 0.0, 1.0);
  wp.xyz += S * aSide * max(wdt, minW) * 0.5;
  vT = T;
  vW = wp.xyz;
  vNs = normalize(mat3(modelMatrix) * n);
  vTt = aT;
  vRootK = aRnd.w;
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;

const FRAG = /* glsl */`
${LIGHT}
uniform vec3 uRoot0, uRoot1, uTip, uTrans;
varying vec3 vT, vW, vNs;
varying float vTt, vCov, vRootK;
void main() {
  vec3 T = normalize(vT);
  vec3 V = normalize(cameraPosition - vW);
  vec3 ns = normalize(vNs);
  // Root colour from the skin, tips lighter and golden.
  vec3 root = mix(uRoot0, uRoot1, vRootK);
  vec3 tipc = uTip;
  vec3 base = mix(root, tipc, smoothstep(0.1, 1.0, vTt));
  // Wrap light along the fibre: the hair lights all round its axis.
  float tl = dot(T, uKeyDir);
  float diff = sqrt(max(1.0 - tl * tl, 0.0));
  float side = toon(dot(ns, uKeyDir) * 0.5 + 0.55);
  vec3 H = normalize(uKeyDir + V);
  float th = dot(T, H);
  float spec = pow(sqrt(max(1.0 - th * th, 0.0)), 60.0);
  // The hair shades itself near the root.
  float ao = mix(0.55, 1.0, vTt);
  vec3 col = base * (uKeyCol * diff * side * 0.9 + hemi(ns) * 1.1) * ao;
  col += uKeyCol * spec * 0.12 * side * vTt;
  // Light from behind runs through the thin tips.
  float back = pow(max(dot(-V, uRimDir), 0.0), 2.0);
  float rimSide = smoothstep(-0.3, 0.4, dot(ns, uRimDir));
  float tr = sqrt(max(1.0 - pow(dot(T, uRimDir), 2.0), 0.0));
  col += uTrans * uRimCol * (back * 2.2 + 0.3) * rimSide * tr * smoothstep(0.1, 1.0, vTt);
  gl_FragColor = vec4(col, vCov * (1.0 - smoothstep(0.85, 1.0, vTt) * 0.6));
}`;

function strip() {
  const g = new THREE.InstancedBufferGeometry();
  const t = [], s = [], idx = [];
  for (let i = 0; i <= SEG; i++) for (const k of [-1, 1]) { t.push(i / SEG); s.push(k); }
  for (let i = 0; i < SEG; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  g.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(t.length * 3), 3));
  g.setAttribute('aT', new THREE.Float32BufferAttribute(t, 1));
  g.setAttribute('aSide', new THREE.Float32BufferAttribute(s, 1));
  g.setIndex(idx);
  return g;
}

export function makeFuzz(halves, L, F) {
  const Z = F.fuzz;
  const v3 = a => ({ value: new THREE.Vector3(...a) });
  const n = COUNT[2];
  const parts = halves.map((hf, hi) => {
    const skin = hf.userData.skin;
    const sampler = new MeshSurfaceSampler(skin).setRandomGenerator(rng(91 + hi * 7)).build();
    const R = rng(5 + hi * 13);
    const root = new Float32Array(n * 3), nrm = new Float32Array(n * 3), rnd = new Float32Array(n * 4), patch = new Float32Array(n);
    const pn = createNoise3D(rng(77));
    const p = new THREE.Vector3(), q = new THREE.Vector3();
    for (let i = 0; i < n; i++) {
      // Roots keep clear of the cut edge, so no hair crosses the face.
      do sampler.sample(p, q); while (p.x > -0.004);
      root.set([p.x, p.y, p.z], i * 3);
      nrm.set([q.x, q.y, q.z], i * 3);
      rnd.set([R(), R(), R(), R()], i * 4);
      // The patch field runs in fruit space, so both halves agree at the seam.
      const s = hi ? -1 : 1, pv = pn(p.x * s * 2.2, p.y * 2.2, p.z * s * 2.2);
      patch[i] = Math.min(1, Math.max(0, (pv - 0.15) / 0.5));
    }
    const g = strip();
    g.setAttribute('aRoot', new THREE.InstancedBufferAttribute(root, 3));
    g.setAttribute('aNrm', new THREE.InstancedBufferAttribute(nrm, 3));
    g.setAttribute('aRnd', new THREE.InstancedBufferAttribute(rnd, 4));
    g.setAttribute('aPatch', new THREE.InstancedBufferAttribute(patch, 1));
    g.instanceCount = COUNT[1];
    const su = skin.material.uniforms;
    const U = {
      ...L, uDent: su.uDent, uJig: su.uJig, uJigT: su.uJigT,
      uSide: su.uSide, uRoot0: v3(Z.root[0]), uRoot1: v3(Z.root[1]), uTip: v3(Z.tip), uTrans: v3(Z.trans), uLen: { value: 0.07 }, uWidth: { value: 0.0045 }, uLift: { value: Z.lift ?? 0.38 }, uPatch: { value: Z.patch ?? 0 }, uCurl: { value: Z.curl ?? 0 }, uRuffle: { value: 0 }, uPx: { value: 0.001 },
      uFlow: { value: new THREE.Vector3() }, uGrav: { value: new THREE.Vector3(0, -1, 0) },
    };
    const m = new THREE.ShaderMaterial({ uniforms: U, vertexShader: VERT, fragmentShader: FRAG, side: THREE.DoubleSide, alphaToCoverage: true, transparent: false });
    const mesh = new THREE.Mesh(g, m);
    mesh.frustumCulled = false;
    hf.add(mesh);
    return { hf, mesh, U, g, prev: new THREE.Vector3(), vel: new THREE.Vector3(), flow: new THREE.Vector3(), flowV: new THREE.Vector3(), first: true };
  });

  let level = 1, fuzz = 0.6, busy = false;
  const wp = new THREE.Vector3(), iq = new THREE.Quaternion(), tmp = new THREE.Vector3(), wq = new THREE.Quaternion();
  function count() {
    const c = fuzz < 0.02 ? 0 : Math.round(COUNT[level] * (Z.count ?? 1));
    for (const pt of parts) { pt.g.instanceCount = c; pt.mesh.visible = c > 0; }
  }
  return {
    get busy() { return busy; },
    dispose() { for (const pt of parts) { pt.hf.remove(pt.mesh); pt.g.dispose(); pt.mesh.material.dispose(); } },
    setLevel(lv, rung) { level = Math.max(0, lv - (rung >= 3 ? 1 : 0)); count(); },
    // The pixel size at one unit of distance, for the hair width floor.
    setPx(px) { for (const pt of parts) pt.U.uPx.value = px; },
    step(dt, st) {
      if (Math.abs(st.fuzz - fuzz) > 1e-4 || (fuzz < 0.02) !== (st.fuzz < 0.02)) { fuzz = st.fuzz; count(); }
      fuzz = st.fuzz;
      busy = false;
      for (const pt of parts) {
        pt.U.uLen.value = 0.01 + fuzz * Z.len;
        pt.U.uWidth.value = (0.0028 + fuzz * 0.0016) * Z.width;
        pt.hf.updateWorldMatrix(true, false);
        pt.hf.getWorldPosition(wp);
        if (pt.first || dt <= 0) { pt.prev.copy(wp); pt.first = false; }
        tmp.subVectors(wp, pt.prev).divideScalar(Math.max(dt, 1e-3));
        pt.prev.copy(wp);
        // Hairs trail the motion, then spring back past rest.
        const target = tmp.multiplyScalar(-0.12);
        target.y += Math.max(-1, Math.min(1, st.sqV * 0.05));
        const k = 70, z = 0.18, w = Math.sqrt(k);
        if (dt > 0) {
          const a = new THREE.Vector3().subVectors(target, pt.flow).multiplyScalar(k).addScaledVector(pt.flowV, -2 * z * w);
          pt.flowV.addScaledVector(a, Math.min(dt, 1 / 30));
          pt.flow.addScaledVector(pt.flowV, Math.min(dt, 1 / 30));
        }
        pt.flow.clampLength(0, 0.9);
        // Flow and gravity go into the half's own space.
        pt.hf.getWorldQuaternion(wq);
        iq.copy(wq).invert();
        pt.U.uFlow.value.copy(pt.flow).applyQuaternion(iq);
        pt.U.uGrav.value.set(0, -1, 0).applyQuaternion(iq);
        const squeezing = st.squeeze || st.keySqueeze;
        pt.U.uRuffle.value += ((squeezing ? 0.8 : Math.min(0.6, Math.abs(st.sqV) * 0.08)) - pt.U.uRuffle.value) * Math.min(1, dt * 8);
        if (pt.flow.length() > 0.004 || pt.flowV.length() > 0.02 || pt.U.uRuffle.value > 0.01) busy = true;
      }
    },
  };
}
