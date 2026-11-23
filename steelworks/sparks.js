// Steelworks sparks: a ring of instanced streaks.
// The CPU writes each spark once at launch; the GPU solves its flight.
import * as THREE from 'three';
import { SPARK_VS, SPARK_FS } from './shaders.js';
import { EDGE_X, LOW_Y } from './layout.js';

const G = 9.81;
const floorAt = x => (x > EDGE_X ? LOW_Y : 0);

export function makeSparks(max) {
  const geo = new THREE.InstancedBufferGeometry();
  // A quad: x 0 tail to 1 head; y -1 to 1 across.
  geo.setAttribute('position', new THREE.Float32BufferAttribute([0, -1, 0, 0, 1, 0, 1, -1, 0, 1, 1, 0], 3));
  geo.setIndex([0, 2, 1, 1, 2, 3]);
  const O = new Float32Array(max * 3), Vv = new Float32Array(max * 3), Tt = new Float32Array(max * 4);
  for (let i = 0; i < max; i++) Tt[i * 4] = -1e9;
  const aO = new THREE.InstancedBufferAttribute(O, 3), aV = new THREE.InstancedBufferAttribute(Vv, 3), aT = new THREE.InstancedBufferAttribute(Tt, 4);
  [aO, aV, aT].forEach(a => a.setUsage(THREE.DynamicDrawUsage));
  geo.setAttribute('iO', aO); geo.setAttribute('iV', aV); geo.setAttribute('iT', aT);
  geo.instanceCount = max;
  const mat = new THREE.ShaderMaterial({
    vertexShader: SPARK_VS, fragmentShader: SPARK_FS,
    uniforms: { uTime: { value: 0 }, uShutter: { value: 1 / 30 }, uPx: { value: 1 }, uView: { value: new THREE.Vector2(1, 1) } },
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

  // One spark. kind 1 is a carbon spark: it bursts into forks at its end.
  function one(now, o, v, life, k, size, kind) {
    // A spark dies where it meets the floor.
    for (let s = 1; s <= 24; s++) {
      const t = (s / 24) * life;
      at(o, v, k, t, tmp);
      if (tmp[1] < floorAt(tmp[0]) + 0.02) { life = t; kind = 0; break; }
    }
    const i = head;
    head = (head + 1) % limit;
    O[i * 3] = o[0]; O[i * 3 + 1] = o[1]; O[i * 3 + 2] = o[2];
    Vv[i * 3] = v[0]; Vv[i * 3 + 1] = v[1]; Vv[i * 3 + 2] = v[2];
    Tt[i * 4] = now; Tt[i * 4 + 1] = life; Tt[i * 4 + 2] = k; Tt[i * 4 + 3] = size + (kind ? 0.6 : 0);
    lo = Math.min(lo, i); hi = Math.max(hi, i);
    lastEnd = Math.max(lastEnd, now + life);
    if (kind === 1) {
      // The burst: three to five forks from the end point.
      const p = at(o, v, k, life, [0, 0, 0]);
      const n = 3 + Math.floor(Math.random() * 3);
      for (let j = 0; j < n; j++) {
        const a = Math.random() * Math.PI * 2, b = Math.acos(Math.random() * 2 - 1), sp = 3 + Math.random() * 4;
        one(now + life, p, [Math.sin(b) * Math.cos(a) * sp, Math.cos(b) * sp, Math.sin(b) * Math.sin(a) * sp], 0.1 + Math.random() * 0.15, 1.5, 0.1, 0);
      }
    }
  }

  // A burst of n sparks from o, round the direction d, cone half-angle c.
  function emit(now, n, o, d, c, s0, s1, opt = {}) {
    const { life = [0.5, 1.4], drag = 0.6, carbon = 0.3, spread = 0, size = 0.5 } = opt;
    const up = Math.abs(d[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
    // A frame round d.
    const x = [d[1] * up[2] - d[2] * up[1], d[2] * up[0] - d[0] * up[2], d[0] * up[1] - d[1] * up[0]];
    const xl = Math.hypot(...x); x[0] /= xl; x[1] /= xl; x[2] /= xl;
    const y = [d[1] * x[2] - d[2] * x[1], d[2] * x[0] - d[0] * x[2], d[0] * x[1] - d[1] * x[0]];
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * Math.tan(c);
      const sp = s0 + (s1 - s0) * Math.random() ** 1.5;
      const v = [0, 1, 2].map(j => (d[j] + (x[j] * Math.cos(a) + y[j] * Math.sin(a)) * r) * sp);
      const oo = [o[0] + (Math.random() - 0.5) * spread, o[1] + (Math.random() - 0.5) * spread * 0.4, o[2] + (Math.random() - 0.5) * spread];
      const life0 = life[0] + (life[1] - life[0]) * Math.random();
      one(now + Math.random() * 0.016, oo, v, life0, drag * (0.6 + 0.8 * Math.random()), size * (0.5 + Math.random()), Math.random() < carbon ? 1 : 0);
    }
  }

  // Sends the written range to the GPU.
  function upload() {
    if (hi < lo) return;
    for (const [a, w] of [[aO, 3], [aV, 3], [aT, 4]]) {
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
    clear() { Tt.fill(0); for (let i = 0; i < max; i++) Tt[i * 4] = -1e9; lo = 0; hi = max - 1; lastEnd = 0; },
  };
}
