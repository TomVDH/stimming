// Load order: gun/beacon runs first.
import '../gun/beacon.ts';
import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { reduced } from '../../../shared/stim.js';
import { state } from '../state.ts';
import { scene } from '../setup.ts';
import { U } from '../world/uniforms.ts';
import { HEAD } from '../sky/atmosphere.ts';
import { AIR } from '../sky/air.ts';
import { BAND } from '../clouds/bands.ts';
import { noise3 } from '../gun/gun.ts';
import { astMat } from './asteroid.ts';

/* ---------- shards: the rock in pieces ---------- */
// One instanced mesh.
// Each shard's pose comes from its birth time in closed form.
export const SHARD_MAX = 84;
const shardBase = (() => {
  let g = mergeVertices(new THREE.IcosahedronGeometry(1, 1));
  const p = g.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    let r = 1 + 0.35 * noise3(v.x * 1.7, v.y * 1.7, v.z * 1.7);
    // Two flat cuts give each shard a broken face.
    if (v.x > 0.3) r = Math.min(r, 0.55 / v.x);
    if (v.y < -0.4) r = Math.min(r, -0.5 / v.y);
    p.setXYZ(i, v.x * r * 1.1, v.y * r * 0.7, v.z * r * 1.3);
  }
  g.computeVertexNormals();
  return g;
})();
export const shardGeo = new THREE.InstancedBufferGeometry().copy(shardBase as THREE.InstancedBufferGeometry);
const shardSlot = (name: string, n: number) => {
  const a = new THREE.InstancedBufferAttribute(new Float32Array(SHARD_MAX * n), n);
  a.setUsage(THREE.DynamicDrawUsage);
  shardGeo.setAttribute(name, a);
  return a;
};
// aPos: start. aVel: velocity, spin. aSeed: seed, size, birth, cooling time.
export const sPos = shardSlot('aPos', 3), sVel = shardSlot('aVel', 4), sSeed = shardSlot('aSeed', 4);
shardGeo.instanceCount = 0;
export const shardMat = new THREE.ShaderMaterial({
  uniforms: { ...U, uRock: astMat.uniforms.uRock, uWhite: astMat.uniforms.uWhite, uEmber: astMat.uniforms.uEmber, uSpin: { value: reduced() ? 0 : 1 } },
  vertexShader: /* glsl */`
  attribute vec3 aPos;
  attribute vec4 aVel, aSeed;
  uniform float uTime, uSpin;
  varying vec3 vP, vN, vO, vV;
  varying float vHeat, vSeed, vAir;
  mat3 rot(vec3 a, float t) {
    float c = cos(t), s = sin(t), k = 1.0 - c;
    return mat3(c + a.x * a.x * k, a.x * a.y * k + a.z * s, a.x * a.z * k - a.y * s,
                a.x * a.y * k - a.z * s, c + a.y * a.y * k, a.y * a.z * k + a.x * s,
                a.x * a.z * k + a.y * s, a.y * a.z * k - a.x * s, c + a.z * a.z * k);
  }
  // A shard's height at age t: the lob, then the fall.
  float shardY(float t, float vt) {
    return aPos.y + aVel.y * (1.0 - exp(-0.1 * t)) / 0.1 - vt * (t - (1.0 - exp(-0.2 * t)) / 0.2);
  }
  void main() {
    float age = uTime - aSeed.z;
    if (age < 0.0 || age > 60.0) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
    // Drag eats the lob fast and the sideways fling slowly.
    // The pieces carry out sideways as gravity bends them down.
    vec3 k = vec3(0.035, 0.1, 0.035);
    // Each shard reaches its own fall speed in about five seconds.
    // The lob and the fall make one ballistic arc.
    // Fall speeds spread wide, so the pieces land over half a minute.
    float vt = 260.0 + 480.0 * fract(aSeed.x * 3.7);
    // A piece stops where it lands: the clock halts at the touchdown.
    // Bisection finds it; the fall is one-way after the apex.
    float tq = age;
    if (shardY(age, vt) < 15.0) {
      float lo = 0.0, hi = age;
      for (int b = 0; b < 12; b++) { float m = 0.5 * (lo + hi); if (shardY(m, vt) < 15.0) hi = m; else lo = m; }
      tq = hi;
    }
    vec3 c = aPos + aVel.xyz * (1.0 - exp(-k * tq)) / k - vec3(0.0, vt * (tq - (1.0 - exp(-0.2 * tq)) / 0.2), 0.0);
    c.y = max(c.y, 15.0);
    // The velocity at tq; a landed piece has none.
    vec3 vel = vec3(aVel.x * exp(-k.x * tq), aVel.y * exp(-0.1 * tq) - vt * (1.0 - exp(-0.2 * tq)), aVel.z * exp(-k.z * tq));
    if (tq < age) vel = vec3(0.0);
    float spd = length(vel);
    vV = spd > 1.0 ? vel / spd : vec3(0.0, -1.0, 0.0);
    // Fast air burns the leading face; a landed piece only smoulders.
    vAir = smoothstep(180.0, 520.0, spd) * (1.0 - smoothstep(40.0, 58.0, age));
    // Half the pieces burn away in the air; the rest fall all the way.
    float shr = fract(aSeed.x * 5.13) < 0.5 ? 1.0 - smoothstep(8.0, 22.0, age) : 1.0;
    float sc = aSeed.y * shr * (1.0 - smoothstep(55.0, 60.0, age));
    vec3 axis = normalize(vec3(sin(aSeed.x * 7.0), cos(aSeed.x * 3.0) + 0.3, sin(aSeed.x * 5.0)));
    mat3 R = rot(axis, aVel.w * age * uSpin + aSeed.x);
    vP = c + R * (position * sc); vN = R * normal; vO = position;
    vHeat = max(exp(-age / aSeed.w), 0.5 * smoothstep(1600.0, 350.0, c.y) * step(16.0, c.y)); vSeed = aSeed.x;
    gl_Position = projectionMatrix * viewMatrix * vec4(vP, 1.0);
  }`,
  fragmentShader: /* glsl */`
  varying vec3 vP, vN, vO, vV;
  varying float vHeat, vSeed, vAir;
  uniform vec3 uRock, uWhite, uEmber;
  ${HEAD}
  ${AIR}
  void main() {
    vec3 N = normalize(vN);
    float n = k3fbm(vO * 3.0 + vSeed);
    vec3 alb = uRock * (0.5 + 1.0 * n);
    vec3 col = alb * (ambient(N) + sunLight(N));
    // Fresh faces glow and cool; the crust stays dark.
    float fresh = smoothstep(0.45, 0.6, n);
    // Mostly silhouettes: the embers stay faint.
    col += uEmber * fresh * vHeat * 1.4 + uWhite * fresh * vHeat * vHeat * 0.8;
    // The face into the wind glows: orange at the rim, white at the nose.
    float lead = max(dot(N, vV), 0.0);
    col += (uEmber * 0.9 * pow(lead, 3.0) + uWhite * 0.5 * pow(lead, 14.0)) * vAir * (0.5 + 0.8 * n);
    // Far shards go blue and flat in the air.
    // A shard behind the soot ball fades into it; one in front stays solid.
    // Far pieces near the plain drop behind the horizon.
    gl_FragColor = vec4(aerial(col, vP), sootT(vP) * hzFade(vP));
  }`,
  depthWrite: false, transparent: true,
});
const shards = new THREE.Mesh(shardGeo, shardMat);
// The shards draw after the soot and take its cover by depth.
shards.frustumCulled = false; shards.renderOrder = BAND.shards;
scene.add(shards);
state.shardsEnd = 0;
