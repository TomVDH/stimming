// Volcano village: the houses in the foreground, one instanced mesh.
// Javanese houses: whitewashed walls under steep hipped roofs of terracotta tile.
import * as THREE from 'three';
import { height, EYE } from './terrain.js';

// A seeded random, so the village is the same on every load.
function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (Math.imul(s ^ (s >>> 15), 2246822519) + 0x9e3779b9) >>> 0; return s / 4294967296; };
}

// One house in unit size: walls, then a hipped roof; aPart is 0 for walls, 1 for roof.
function houseGeometry() {
  const P = [], K = [];
  const quad = (a, b, c, d, k) => { P.push(...a, ...b, ...c, ...a, ...c, ...d); K.push(k, k, k, k, k, k); };
  const tri = (a, b, c, k) => { P.push(...a, ...b, ...c); K.push(k, k, k); };
  const w = 0.5, d = 0.65, h = 0.42;
  // Walls, wound to face out.
  quad([-w, 0, d], [w, 0, d], [w, h, d], [-w, h, d], 0);
  quad([w, 0, -d], [-w, 0, -d], [-w, h, -d], [w, h, -d], 0);
  quad([w, 0, d], [w, 0, -d], [w, h, -d], [w, h, d], 0);
  quad([-w, 0, -d], [-w, 0, d], [-w, h, d], [-w, h, -d], 0);
  // The roof: eaves past the walls, a short ridge along z.
  const ew = 0.64, ed = 0.8, rh = 0.95, rz = 0.3;
  const e1 = [-ew, h, ed], e2 = [ew, h, ed], e3 = [ew, h, -ed], e4 = [-ew, h, -ed];
  const r1 = [0, rh, rz], r2 = [0, rh, -rz];
  quad(e2, e3, r2, r1, 1);
  quad(e4, e1, r1, r2, 1);
  tri(e1, e2, r1, 1);
  tri(e3, e4, r2, 1);
  // The eaves' underside, so a low eye sees no gap.
  quad(e1, e4, e3, e2, 1);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  g.setAttribute('aPart', new THREE.Float32BufferAttribute(K, 1));
  g.computeVertexNormals();
  return g;
}

export function makeVillage(U, HAZE, n = 90) {
  const base = houseGeometry();
  const g = new THREE.InstancedBufferGeometry();
  g.index = null;
  for (const k of ['position', 'normal', 'aPart']) g.setAttribute(k, base.getAttribute(k));
  const iP = new Float32Array(n * 4), iS = new Float32Array(n * 4);
  const R = rng(7);
  const placed = [];
  let k = 0;
  for (let tries = 0; k < n && tries < 4000; tries++) {
    // Polar about the eye: most houses ahead, toward the volcano.
    const dist = 70 + 700 * Math.pow(R(), 1.3);
    const az = (R() - 0.5) * 2.1;
    const x = EYE[0] + Math.sin(az) * dist, z = EYE[2] - Math.cos(az) * dist;
    const sz = 6.5 + R() * 4.5;
    if (placed.some(([px, pz, ps]) => Math.hypot(px - x, pz - z) < (ps + sz) * 0.75)) continue;
    placed.push([x, z, sz]);
    // Houses face the lanes: a few set angles, a little off.
    const rot = Math.floor(R() * 4) * (Math.PI / 2) + 0.35 + (R() - 0.5) * 0.15;
    iP.set([x, height(x, z) - 0.2, z, rot], k * 4);
    iS.set([sz, sz * (0.85 + R() * 0.3), sz * (0.9 + R() * 0.5), Math.floor(R() * 997)], k * 4);
    k++;
  }
  g.setAttribute('iP', new THREE.InstancedBufferAttribute(iP, 4));
  g.setAttribute('iS', new THREE.InstancedBufferAttribute(iS, 4));
  g.instanceCount = k;
  const mat = new THREE.ShaderMaterial({
    uniforms: U,
    vertexShader: /* glsl */`
      attribute float aPart;
      attribute vec4 iP, iS;
      varying vec3 vW, vN, vL;
      varying float vPart, vSeed;
      void main() {
        float c = cos(iP.w), s = sin(iP.w);
        mat3 rot = mat3(c, 0.0, -s, 0.0, 1.0, 0.0, s, 0.0, c);
        vL = position;
        vW = iP.xyz + rot * (position * iS.xyz);
        vN = rot * normalize(normal / iS.xyz);
        vPart = aPart; vSeed = iS.w;
        gl_Position = projectionMatrix * viewMatrix * vec4(vW, 1.0);
      }`,
    fragmentShader: /* glsl */`
      ${HAZE}
      varying vec3 vW, vN, vL;
      varying float vPart, vSeed;
      // Seeds and face ids are rounded: interpolated values drift and scramble the hash.
      float h1(float x) { return fract(sin(x * 91.7 + floor(vSeed + 0.5) * 5.173) * 43758.5453); }
      void main() {
        vec3 n = normalize(vN);
        vec3 alb, glow = vec3(0.0);
        if (vPart > 0.5) {
          // Terracotta tile in rows; old roofs are darker.
          float row = smoothstep(0.35, 0.5, fract(vL.y * 26.0));
          alb = vec3(0.26, 0.095, 0.05) * (0.7 + 0.3 * h1(3.0)) * (0.8 + 0.2 * row);
        } else {
          // Whitewash, stained low on the wall.
          // Plaster: whitewash, ochre or pale green; damp darkens the foot.
          float pick = h1(5.0);
          alb = pick < 0.5 ? vec3(0.42, 0.39, 0.33) : pick < 0.8 ? vec3(0.42, 0.32, 0.18) : vec3(0.3, 0.36, 0.3);
          alb *= (0.7 + 0.3 * h1(6.0)) * (0.55 + 0.45 * smoothstep(0.0, 0.3, vL.y));
          // Windows and a door, by the wall's own coordinates.
          float u = abs(n.x) > abs(n.z) ? vL.z / 1.3 + 0.5 : vL.x + 0.5;
          float v = vL.y / 0.42;
          float cell = floor(u * 3.0), fu = fract(u * 3.0);
          float win = step(0.3, fu) * step(fu, 0.7) * step(0.38, v) * step(v, 0.72);
          float door = step(0.43, u) * step(u, 0.57) * step(v, 0.75) * step(0.5, abs(n.z));
          float on = step(0.45, h1(cell + 7.0 * floor(n.x * 2.0 + n.z * 3.0 + 0.5)));
          float dOn = step(0.6, h1(11.0));
          glow = vec3(1.0, 0.52, 0.2) * 1.4 * max(win * on, door * dOn * 0.7);
          // Lit windows spill a little warm light on the wall round them.
          float wd = length(vec2(max(abs(fu - 0.5) - 0.2, 0.0) / 3.0, max(abs(v - 0.55) - 0.17, 0.0) * 0.42));
          glow += vec3(1.0, 0.5, 0.2) * 0.05 * on * exp(-wd * 30.0) * (1.0 - win);
          alb *= 1.0 - max(win, door) * 0.75;
        }
        // Sky light from above; the afterglow from the west.
        // Whitewash holds the last sky light; walls take more than the ground.
        float wall = 1.0 - vPart;
        vec3 lit = vec3(0.020, 0.025, 0.040) * (0.35 + 0.65 * max(n.y, 0.0) + wall * 0.6) + vec3(0.03, 0.018, 0.014) * max(-n.z, 0.0) * (1.0 + wall);
        // The vent, the flash and the bolts reach the village, weak with distance.
        vec3 L = uLight - vW;
        float d2 = dot(L, L);
        lit += FIRE * max(dot(n, L * inversesqrt(d2)), 0.0) * (uHeat * 1.3e5 + uFlash * 2.2e6) / (d2 + 2.2e5) * 3.0;
        vec3 bq = uBoltPos - vW;
        lit += BOLT * uBolt * max(dot(n, normalize(bq)) * 0.6 + 0.4, 0.0) * 3e6 / (dot(bq, bq) + 1e7) * 3.0;
        gl_FragColor = vec4(haze(alb * lit + glow, vW), 1.0);
      }`,
  });
  const m = new THREE.Mesh(g, mat);
  m.renderOrder = 1;
  m.frustumCulled = false;
  return m;
}
