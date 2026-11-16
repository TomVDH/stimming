// Cliff grass: blades on a bezier curve, after the Ghost of Tsushima talk.
// Clumps share a facing, a lean and a tint; normals round across each blade.
// Gusts roll across the turf as a moving noise field; low sun shines through.
// Near blades have six segments, far blades three.
import * as THREE from 'three';
import { col } from './kit.js';
import { airify } from './cliff-air.js';

// A flat strip: x is the side (-0.5 to 0.5), y the place along the blade (0 to 1).
function stripGeo(S) {
  const pos = [], idx = [];
  for (let i = 0; i <= S; i++) pos.push(-0.5, i / S, 0, 0.5, i / S, 0);
  for (let i = 0; i < S; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(new Array(pos.length).fill(0), 3));
  g.setIndex(idx);
  return g;
}

const VERT_COMMON = /* glsl */ `
  uniform float uT; uniform vec3 uWind;
  attribute vec4 aBlade;
  varying float vTip, vGust;
  float gH(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float gN(vec2 p) {
    vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(gH(i), gH(i + vec2(1, 0)), f.x), mix(gH(i + vec2(0, 1)), gH(i + 1.0), f.x), f.y);
  }`;

// The blade is built here, before three.js reads the normal and the position.
const VERT_BLADE = /* glsl */ `
  float bT = position.y, bS = position.x;
  float bH = aBlade.x, bW = aBlade.y, bLean = aBlade.z, bPh = aBlade.w;
  vec3 bIp = instanceMatrix[3].xyz;
  mat3 bRot = mat3(instanceMatrix);
  // Gusts roll downwind as bands about seven metres apart, broken up by noise.
  // Each blade adds its own flutter.
  float bWs = length(uWind);
  vec2 bDir = bWs > 1e-5 ? uWind.xz / bWs : vec2(0.0, 1.0);
  vec2 bG = bIp.xz * 0.09 - bDir * uT * (0.8 + 3.0 * bWs);
  float bNoise = 0.6 * gN(bG) + 0.4 * gN(bG * 2.3 + 7.1);
  float bWave = 0.5 + 0.5 * sin(dot(bIp.xz, bDir) * 0.9 - uT * (2.2 + 6.0 * bWs) + bNoise * 3.0);
  float bGust = mix(bNoise, bWave, 0.55);
  float bFl = 0.12 * sin(uT * (5.0 + 3.0 * bPh) + bPh * 6.28);
  vec3 bWl = transpose(bRot) * uWind * 6.0 * (bGust * 1.6 + 0.12 + bFl);
  vGust = bGust;
  // Quadratic bezier: root, a control point, the tip pushed by the wind.
  vec3 bP2 = vec3(0.0, 0.0, bH * bLean) + bWl * bH;
  float bOff = length(bP2.xz);
  bP2.y = sqrt(max(bH * bH - bOff * bOff * 0.85, bH * bH * 0.12));
  vec3 bP1 = vec3(0.0, bH * 0.62, 0.0) + vec3(bP2.x, 0.0, bP2.z) * 0.28;
  vec3 bB = mix(mix(vec3(0.0), bP1, bT), mix(bP1, bP2, bT), bT);
  vec3 bTg = normalize(2.0 * (1.0 - bT) * bP1 + 2.0 * bT * (bP2 - bP1) + 1e-5);
  vec3 bSide = vec3(1.0, 0.0, 0.0);
  float bWid = bW * pow(max(1.0 - bT, 0.0), 0.7);
  vec3 bPos = bB + bSide * bS * bWid;
  // Rounded normal: it turns outward toward each edge of the blade.
  vec3 bN = normalize(cross(bSide, bTg));
  vec3 objectNormal = normalize(bN + bSide * bS * 1.6);
  vTip = bT;`;

export function grass(group, u, R, { heightAt, edgeZ, wallAt, aoAt, eye = [0, 14] }) {
  // Clumps: one jittered point per 0.6 m cell; a blade joins the nearest.
  const CELL = 0.6;
  const hash = (a, b, k) => { const s = Math.sin(a * 127.1 + b * 311.7 + k * 74.7) * 43758.5453; return s - Math.floor(s); };
  const clumpOf = (x, z) => {
    const cx = Math.floor(x / CELL), cz = Math.floor(z / CELL);
    let best = null, bd = 1e9;
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) {
      const a = cx + i, b = cz + j;
      const px = (a + hash(a, b, 1)) * CELL, pz = (b + hash(a, b, 2)) * CELL;
      const d = (px - x) ** 2 + (pz - z) ** 2;
      if (d < bd) { bd = d; best = [a, b]; }
    }
    const [a, b] = best;
    return { yaw: hash(a, b, 3) * 6.283, lean: 0.15 + 0.45 * hash(a, b, 4), tall: hash(a, b, 5), hue: hash(a, b, 6), dry: hash(a, b, 7) };
  };

  const near = [], far = [];
  for (let i = 0; i < 160000; i++) {
    let x, z;
    if (i < 115000) {
      const d = 2.5 + 32 * Math.pow(R(), 1.9), a = (R() - 0.5) * 1.8;
      x = d * Math.sin(a); z = eye[1] - d * Math.cos(a);
    } else { x = (R() - 0.5) * 10; z = 9 + 12 * R(); }
    if (z < edgeZ(x) + 0.4 || wallAt(x, z) < 0.45) continue;
    const c = clumpOf(x, z);
    // Most clumps are short sea turf; a few grow into longer tufts.
    const base = c.tall > 0.9 ? 0.16 + 0.12 * c.tall : 0.05 + 0.07 * c.tall;
    const h = base * (0.7 + 0.6 * R());
    const dist = Math.hypot(x - eye[0], z - eye[1]);
    // Far blades widen, so the turf keeps its cover at a distance.
    const w = (0.007 + 0.006 * R()) * (1 + dist / 9);
    const lean = c.lean + 0.25 * R();
    const tint = c.dry > 0.93
      ? col([0.6 + 0.08 * R(), 0.07, 92])
      : col([0.4 + 0.1 * R() + 0.05 * c.hue, 0.1 + 0.035 * c.hue, 124 + 20 * c.hue]);
    const item = { p: [x, heightAt(x, z) - 0.01, z], yaw: c.yaw + (R() - 0.5) * 1.3, b: [h, w, lean, R()], c: tint.multiplyScalar(aoAt(x, z)) };
    (dist < 11 || z > 4 ? near : far).push(item);
  }

  const w = { uWind: { value: new THREE.Vector3() }, uTrans: { value: new THREE.Vector3() } };
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.7, side: THREE.DoubleSide });
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, w);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>\n${VERT_COMMON}`)
      .replace('#include <beginnormal_vertex>', VERT_BLADE)
      .replace('#include <begin_vertex>', 'vec3 transformed = bPos;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec3 uTrans; varying float vTip, vGust;')
      // Dark at the root, a touch paler toward the tip.
      .replace('#include <color_fragment>', `#include <color_fragment>
        float gTip = clamp(vTip, 0.0, 1.0);
        diffuseColor.rgb *= mix(0.35, 1.12, gTip);
        // Bent blades catch more sky: gusts show as paler bands.
        diffuseColor.rgb *= 0.86 + 0.32 * clamp(vGust, 0.0, 1.0);`)
      // Light through the blade: strongest looking toward the sun, near the tip.
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        float gBack = pow(max(dot(normalize(vAirW - cameraPosition), uSunDir), 0.0), 3.0);
        totalEmissiveRadiance += uTrans * (0.2 + 2.2 * gBack) * gTip * diffuseColor.rgb;`);
  };
  mat.customProgramCacheKey = () => 'cliff-blade';
  airify(mat, u);

  // Shuffled order: drawing the first part of a list thins it evenly.
  const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const meshes = [];
  const build = (items, S) => {
    if (!items.length) return;
    shuffle(items);
    const geo = stripGeo(S);
    const blade = new Float32Array(items.length * 4);
    items.forEach((it, i) => blade.set(it.b, i * 4));
    geo.setAttribute('aBlade', new THREE.InstancedBufferAttribute(blade, 4));
    const m = new THREE.InstancedMesh(geo, mat, items.length);
    const mx = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1), Y = new THREE.Vector3(0, 1, 0);
    items.forEach((it, i) => {
      m.setMatrixAt(i, mx.compose(p.set(...it.p), q.setFromAxisAngle(Y, it.yaw), one));
      m.setColorAt(i, it.c);
    });
    // Blades bend far past their rest shape; a loose bound keeps them drawn.
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, -5), 60);
    m.frustumCulled = false;
    m.receiveShadow = true;
    group.add(m);
    meshes.push(m);
  };
  build(near, 6);
  build(far, 3);
  // A share from 0 to 1 of the blades to draw.
  w.density = (k) => { for (const m of meshes) m.count = Math.max(1, Math.round(m.instanceMatrix.count * k)); };
  return w;
}
