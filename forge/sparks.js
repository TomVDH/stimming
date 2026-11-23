// Forge sparks: instanced streaks, and dark flakes of scale.
// Spark flight follows Steelworks' sparks.js (copied, retuned): the CPU writes
// each spark once at launch; the GPU solves its flight.
import * as THREE from 'three';
import { HEAT } from './shaders.js';

const G = 9.81;

const SPARK_VS = /* glsl */`
${HEAT}
attribute vec3 iO, iV;
attribute vec4 iT;
attribute float iC;
uniform float uTime, uShutter, uPx;
uniform vec2 uView;
varying float vSide, vAlong;
varying vec3 vC;
vec3 at(float t) {
  float k = iT.z, e = exp(-k * t);
  vec3 g = vec3(0.0, -9.81, 0.0);
  return iO + iV * (1.0 - e) / k + g * (t / k - (1.0 - e) / (k * k));
}
void main() {
  float t = uTime - iT.x;
  vAlong = 0.0;
  if (t < 0.0 || t > iT.y) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); vC = vec3(0.0); vSide = 0.0; return; }
  vec3 pa = at(t), pb = at(max(t - uShutter, 0.0));
  vec4 ca = projectionMatrix * viewMatrix * vec4(pa, 1.0);
  vec4 cb = projectionMatrix * viewMatrix * vec4(pb, 1.0);
  if (ca.w < 0.05 || cb.w < 0.05) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); vC = vec3(0.0); vSide = 0.0; return; }
  vec2 sa = ca.xy / ca.w * 0.5 * uView, sb = cb.xy / cb.w * 0.5 * uView;
  vec2 d = sa - sb;
  float l = max(length(d), 1e-3);
  vec2 nn = vec2(-d.y, d.x) / l;
  float w = (0.5 + 0.7 * iT.w) * uPx;
  float side = position.y;
  bool head = position.x > 0.5;
  vec4 cc = head ? ca : cb;
  vec2 sp = (head ? sa : sb) + nn * w * side + d / l * w * (head ? 1.0 : -1.0);
  gl_Position = vec4(sp / (0.5 * uView) * cc.w, cc.z, cc.w);
  vSide = side;
  vAlong = position.x * 2.0 - 1.0;
  // A spark cools as it flies; a burning one flares just before it bursts.
  float a = t / iT.y;
  float T = iC - 420.0 * a + 160.0 * smoothstep(0.8, 0.95, a) * step(0.5, iT.w - 0.55);
  vC = heatRGB(T) * 0.55 * (1.0 - smoothstep(0.85, 1.0, a)) * min(1.0, 3.0 * w / (l + w));
}`;

const SPARK_FS = /* glsl */`
varying float vSide, vAlong;
varying vec3 vC;
void main() {
  // Round at both ends, so a short streak is a soft dot, not a square.
  float a = 1.0 - smoothstep(0.55, 1.0, abs(vAlong));
  gl_FragColor = vec4(vC * exp(-vSide * vSide * 2.2) * (0.35 + 0.65 * a), 1.0);
}`;

// floorAt(x, z): the height a spark dies at.
export function makeSparks(max, floorAt) {
  const geo = new THREE.InstancedBufferGeometry();
  // A quad: x 0 tail to 1 head; y -1 to 1 across.
  geo.setAttribute('position', new THREE.Float32BufferAttribute([0, -1, 0, 0, 1, 0, 1, -1, 0, 1, 1, 0], 3));
  geo.setIndex([0, 2, 1, 1, 2, 3]);
  const O = new Float32Array(max * 3), Vv = new Float32Array(max * 3), Tt = new Float32Array(max * 4), C = new Float32Array(max);
  for (let i = 0; i < max; i++) Tt[i * 4] = -1e9;
  const aO = new THREE.InstancedBufferAttribute(O, 3), aV = new THREE.InstancedBufferAttribute(Vv, 3);
  const aT = new THREE.InstancedBufferAttribute(Tt, 4), aC = new THREE.InstancedBufferAttribute(C, 1);
  [aO, aV, aT, aC].forEach(a => a.setUsage(THREE.DynamicDrawUsage));
  geo.setAttribute('iO', aO); geo.setAttribute('iV', aV); geo.setAttribute('iT', aT); geo.setAttribute('iC', aC);
  geo.instanceCount = max;
  const mat = new THREE.ShaderMaterial({
    vertexShader: SPARK_VS, fragmentShader: SPARK_FS,
    uniforms: { uTime: { value: 0 }, uShutter: { value: 1 / 40 }, uPx: { value: 1 }, uView: { value: new THREE.Vector2(1, 1) } },
    transparent: true, depthWrite: false,
    blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor, blendEquation: THREE.AddEquation,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  mesh.renderOrder = 3;

  let head = 0, lo = max, hi = -1, lastEnd = 0, limit = max;
  const at = (o, v, k, t, out) => {
    const e = Math.exp(-k * t), a = (1 - e) / k, b = t / k - (1 - e) / (k * k);
    out[0] = o[0] + v[0] * a; out[1] = o[1] + v[1] * a - G * b; out[2] = o[2] + v[2] * a;
    return out;
  };
  const tmp = [0, 0, 0];

  // One spark. kind 1 burns: it bursts into forks at its end.
  function one(now, o, v, life, k, size, kind, T0) {
    // A spark dies where it meets the floor or the anvil.
    for (let s = 1; s <= 20; s++) {
      const t = (s / 20) * life;
      at(o, v, k, t, tmp);
      if (tmp[1] < floorAt(tmp[0], tmp[2]) + 0.004) { life = t; kind = 0; break; }
    }
    const i = head;
    head = (head + 1) % limit;
    O[i * 3] = o[0]; O[i * 3 + 1] = o[1]; O[i * 3 + 2] = o[2];
    Vv[i * 3] = v[0]; Vv[i * 3 + 1] = v[1]; Vv[i * 3 + 2] = v[2];
    Tt[i * 4] = now; Tt[i * 4 + 1] = life; Tt[i * 4 + 2] = k; Tt[i * 4 + 3] = size + (kind ? 0.6 : 0);
    C[i] = T0;
    lo = Math.min(lo, i); hi = Math.max(hi, i);
    lastEnd = Math.max(lastEnd, now + life);
    if (kind === 1) {
      // The burst: three to five short forks from the end point.
      const p = at(o, v, k, life, [0, 0, 0]);
      const n = 3 + Math.floor(Math.random() * 3);
      for (let j = 0; j < n; j++) {
        const a = Math.random() * Math.PI * 2, b = Math.acos(Math.random() * 2 - 1), sp = 1.2 + Math.random() * 1.8;
        one(now + life, p, [Math.sin(b) * Math.cos(a) * sp, Math.cos(b) * sp, Math.sin(b) * Math.sin(a) * sp], 0.06 + Math.random() * 0.08, 2, 0.1, 0, T0 + 80);
      }
    }
  }

  // A burst of n sparks from o, round direction d, cone half-angle c.
  // opt.flat squashes the cone toward the horizontal, as a blow throws.
  function emit(now, n, o, d, c, s0, s1, opt = {}) {
    const { life = [0.3, 0.9], drag = 1.2, burn = 0.1, spread = 0, size = 0.4, T = 1150, flat = 0 } = opt;
    const up = Math.abs(d[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
    const x = [d[1] * up[2] - d[2] * up[1], d[2] * up[0] - d[0] * up[2], d[0] * up[1] - d[1] * up[0]];
    const xl = Math.hypot(...x); x[0] /= xl; x[1] /= xl; x[2] /= xl;
    const y = [d[1] * x[2] - d[2] * x[1], d[2] * x[0] - d[0] * x[2], d[0] * x[1] - d[1] * x[0]];
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * Math.tan(c);
      const sp = s0 + (s1 - s0) * Math.random() ** 1.5;
      const v = [0, 1, 2].map(j => (d[j] + (x[j] * Math.cos(a) + y[j] * Math.sin(a)) * r) * sp);
      if (flat) v[1] = v[1] * (1 - flat) + Math.abs(v[1]) * 0.15 * flat;
      const oo = [o[0] + (Math.random() - 0.5) * spread, o[1] + Math.random() * spread * 0.2, o[2] + (Math.random() - 0.5) * spread];
      const life0 = life[0] + (life[1] - life[0]) * Math.random();
      one(now + Math.random() * 0.012, oo, v, life0, drag * (0.6 + 0.8 * Math.random()), size * (0.5 + Math.random()), Math.random() < burn ? 1 : 0, T * (0.92 + 0.16 * Math.random()));
    }
  }

  // Sends the written range to the GPU.
  function upload() {
    if (hi < lo) return;
    for (const [a, w] of [[aO, 3], [aV, 3], [aT, 4], [aC, 1]]) {
      a.clearUpdateRanges();
      a.addUpdateRange(lo * w, (hi - lo + 1) * w);
      a.needsUpdate = true;
    }
    lo = max; hi = -1;
  }
  return {
    mesh, mat, emit, upload,
    // True while any spark still flies.
    live: now => now < lastEnd,
    setLimit(n) { limit = Math.max(256, Math.min(max, n)); head %= limit; geo.instanceCount = limit; },
  };
}

/* ---------- flakes of scale: dark chips that fly, land and cool ---------- */
export function makeFlakes(max, floorAt) {
  const geo = new THREE.BoxGeometry(1, 1, 1);
  const mat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.7, metalness: 0.2 });
  mat.onBeforeCompile = s => {
    // The instance colour carries the glow, not the paint.
    s.fragmentShader = s.fragmentShader.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
      #ifdef USE_INSTANCING_COLOR
      totalEmissiveRadiance = vColor;
      diffuseColor.rgb = vec3(0.035);
      #endif`);
  };
  const mesh = new THREE.InstancedMesh(geo, mat, max);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.setColorAt(0, new THREE.Color(0, 0, 0));
  mesh.count = 0;
  mesh.frustumCulled = false;
  mesh.castShadow = false;
  const F = [];
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), sc = new THREE.Vector3(), p = new THREE.Vector3(), col = new THREE.Color();
  let rgb = [0, 0, 0];
  let heatRGB = null;
  function emit(n, o, T, spread = 1) {
    for (let i = 0; i < n; i++) {
      if (F.length >= max) F.shift();
      const a = Math.random() * Math.PI * 2, sp = (0.6 + Math.random() * 1.8) * spread;
      F.push({
        p: [o[0] + (Math.random() - 0.5) * 0.02, o[1] + 0.004, o[2] + (Math.random() - 0.5) * 0.02],
        v: [Math.cos(a) * sp, 0.6 + Math.random() * 1.6 * spread, Math.sin(a) * sp * 0.8],
        r: [Math.random() * 6, Math.random() * 6, Math.random() * 6],
        w: [(Math.random() - 0.5) * 40, (Math.random() - 0.5) * 40, (Math.random() - 0.5) * 40],
        s: [0.003 + Math.random() * 0.006, 0.0008 + Math.random() * 0.0008, 0.003 + Math.random() * 0.005],
        T: T * (0.8 + Math.random() * 0.15), still: false, age: 0,
      });
    }
  }
  // Steps the chips; returns true while any still moves or glows.
  function step(dt) {
    let busy = false;
    for (const f of F) {
      f.age += dt;
      f.T = 20 + (f.T - 20) * Math.exp(-dt * 2.2);
      if (!f.still) {
        f.v[1] -= G * dt;
        const k = Math.exp(-dt * 1.5);
        f.v[0] *= k; f.v[2] *= k;
        for (let j = 0; j < 3; j++) { f.p[j] += f.v[j] * dt; f.r[j] += f.w[j] * dt; }
        const fl = floorAt(f.p[0], f.p[2]);
        if (f.p[1] < fl + 0.001) {
          f.p[1] = fl + 0.001;
          // One small bounce, then it lies flat.
          if (Math.abs(f.v[1]) > 0.6) { f.v[1] *= -0.25; f.v[0] *= 0.4; f.v[2] *= 0.4; f.w = f.w.map(x => x * 0.3); }
          else { f.still = true; f.r[0] = 0; f.r[2] = 0; }
        }
        busy = true;
      }
      if (f.T > 450) busy = true;
    }
    // Old cold chips fade out of the list after a while.
    while (F.length && F[0].still && F[0].age > 40) F.shift();
    return busy;
  }
  function upload() {
    let i = 0;
    for (const f of F) {
      e.set(f.r[0], f.r[1], f.r[2]);
      q.setFromEuler(e);
      p.set(f.p[0], f.p[1], f.p[2]);
      sc.set(f.s[0], f.s[1], f.s[2]);
      m4.compose(p, q, sc);
      mesh.setMatrixAt(i, m4);
      rgb = heatRGB(f.T, rgb);
      mesh.setColorAt(i, col.setRGB(rgb[0] * 0.8, rgb[1] * 0.8, rgb[2] * 0.8));
      i++;
    }
    mesh.count = i;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }
  return { mesh, emit, step, upload, setHeat(fn) { heatRGB = fn; }, clear() { F.length = 0; } };
}
