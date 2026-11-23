// Superconductor track: the nitrogen fog. A raymarched volume at half resolution.
// Puffs are born at the puck's rim, sink, and spread on the track and the bench.
// Lighting is Fire's smoke shading (Tom, 2026-11-22: "fire toy smoke shader -- always").
import * as THREE from 'three';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { FullScreenQuad } from 'three/addons/postprocessing/Pass.js';
import { TRACK, TOP, PUCK, boil } from './sim.js';

const MAXP = 16;
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const TAU = Math.PI * 2;
// Noise space: one unit of noise is this many metres of fog.
const NS = 14;

// A tileable 3D value noise, two channels, made once.
function noiseTex(n = 32) {
  const data = new Uint8Array(n * n * n * 2);
  const lat = (s, g) => {
    const v = new Float32Array(g * g * g);
    let x = s * 9301 + 49297;
    for (let i = 0; i < v.length; i++) { x = (x * 9301 + 49297) % 233280; v[i] = x / 233280; }
    return v;
  };
  const octs = [[4, 0.5, 1], [8, 0.3, 2], [16, 0.2, 3]].map(([g, w, s]) => [g, w, lat(s, g), lat(s + 7, g)]);
  const sm = t => t * t * (3 - 2 * t);
  for (let z = 0; z < n; z++) for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    let a = 0, b = 0;
    for (const [g, w, va, vb] of octs) {
      const fx = x / n * g, fy = y / n * g, fz = z / n * g;
      const ix = Math.floor(fx), iy = Math.floor(fy), iz = Math.floor(fz);
      const tx = sm(fx - ix), ty = sm(fy - iy), tz = sm(fz - iz);
      const at = (v, i, j, k) => v[((i % g) + ((j % g) * g) + ((k % g) * g * g))];
      for (const [v, add] of [[va, 0], [vb, 1]]) {
        const c00 = at(v, ix, iy, iz) * (1 - tx) + at(v, ix + 1, iy, iz) * tx;
        const c10 = at(v, ix, iy + 1, iz) * (1 - tx) + at(v, ix + 1, iy + 1, iz) * tx;
        const c01 = at(v, ix, iy, iz + 1) * (1 - tx) + at(v, ix + 1, iy, iz + 1) * tx;
        const c11 = at(v, ix, iy + 1, iz + 1) * (1 - tx) + at(v, ix + 1, iy + 1, iz + 1) * tx;
        const r = (c00 * (1 - ty) + c10 * ty) * (1 - tz) + (c01 * (1 - ty) + c11 * ty) * tz;
        if (add) b += r * w; else a += r * w;
      }
    }
    const o = (x + y * n + z * n * n) * 2;
    data[o] = clamp(a) * 255; data[o + 1] = clamp(b) * 255;
  }
  const t = new THREE.Data3DTexture(data, n, n, n);
  t.format = THREE.RGFormat;
  t.type = THREE.UnsignedByteType;
  t.minFilter = t.magFilter = THREE.LinearFilter;
  t.wrapS = t.wrapT = t.wrapR = THREE.RepeatWrapping;
  t.unpackAlignment = 1;
  t.needsUpdate = true;
  return t;
}

const MARCH = /* glsl */`
precision highp float;
precision highp sampler3D;
uniform sampler2D uDepth;
uniform sampler3D uNoise;
uniform mat4 uProjInv, uView;
uniform vec3 uCam, uLamp, uLampCol, uBoxMin, uBoxMax;
uniform vec4 uP[${MAXP}], uQ[${MAXP}];
uniform int uN;
uniform float uT;
varying vec2 vUv;
const float SIG = 90.0;
const float NS = ${NS.toFixed(1)};
// Density: each puff is a soft ball, flattened where it lies on a surface.
float puffs(vec3 p) {
  float d = 0.0;
  for (int i = 0; i < ${MAXP}; i++) {
    if (i >= uN) break;
    vec3 q = p - uP[i].xyz;
    q.y *= uQ[i].y;
    float r = uP[i].w, s = dot(q, q) / (r * r);
    if (s >= 1.0) continue;
    float f = 1.0 - s;
    d += uQ[i].x * f * f;
  }
  return d;
}
float dens(vec3 p) {
  vec3 n0 = p * NS;
  // Cold gas sinks: the billows roll downward.
  vec2 n = texture(uNoise, n0 * 1.1 + vec3(0.0, uT * 0.22, uT * 0.05)).rg;
  vec2 m = texture(uNoise, n0 * 0.4 + vec3(0.3, uT * 0.08, 0.7)).rg;
  float b = puffs(p + ((vec3(n.x, n.y * 0.6, n.x * n.y) - 0.4) * 0.45 + (vec3(m.x, m.y * 0.5, m.y) - 0.45) * 0.6) / NS);
  if (b < 0.002) return 0.0;
  float fine = texture(uNoise, n0 * 3.7 + n.x * 0.7 + vec3(0.0, uT * 0.35, 0.0)).r;
  float c = n.x * 0.6 + fine * 0.5 + n.y * 0.2;
  // Thin fog frays into wisps; thick fog keeps its body.
  return b * clamp((c - 0.55) * 3.8 + b * 0.35, 0.0, 1.5);
}
float densLite(vec3 p) {
  float b = puffs(p);
  return b * (texture(uNoise, p * NS - vec3(0.0, -uT * 0.2, 0.0)).r * 0.9 + 0.05);
}
/* ---------- K3 lighting: Fire's smoke shading (shared/fire.js, volume()) ---------- */
// A short self-shadow march toward the key, Beer plus a multiple-scatter lobe,
// the powder term, an ambient floor, and a Henyey-Greenstein phase times 4 pi.
const float ABSORB = 2.0, AMBIENT = 0.5, POWDER = 0.59, MULTI = 1.0, G_HG = 0.55;
float hg(float c, float g) { float g2 = g * g; return (1.0 - g2) / pow(max(1.0 + g2 - 2.0 * g * c, 1e-4), 1.5) * 0.079577; }
float lightT(vec3 p, vec3 k) {
  // Three taps toward the lamp; a far tap stands for the rest of the cloud.
  float sum = densLite(p + k * 0.006) * 0.006 + densLite(p + k * 0.016) * 0.01 + densLite(p + k * 0.036) * 0.02;
  float tau = sum * SIG * ABSORB * 0.5;
  float beer = exp(-tau);
  float ms = exp(-tau * 0.25) * 0.5;
  float base = mix(beer, beer + ms, MULTI);
  float powder = 1.0 - exp(-tau * 2.0);
  float fin = mix(base, base * powder, POWDER);
  return clamp(fin + AMBIENT, 0.0, 1.0);
}
/* ---------- end K3 lighting ---------- */
float h12(vec2 p) { vec3 q = fract(vec3(p.xyx) * 0.1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
void main() {
  // The view ray, and the distance to the first solid surface.
  vec4 v = uProjInv * vec4(vUv * 2.0 - 1.0, 1.0, 1.0);
  vec3 vd = normalize(v.xyz / v.w);
  vec3 rd = normalize((uView * vec4(vd, 0.0)).xyz);
  float z = texture(uDepth, vUv).r;
  vec4 sp = uProjInv * vec4(vUv * 2.0 - 1.0, z * 2.0 - 1.0, 1.0);
  float tSolid = length(sp.xyz / sp.w);
  vec3 ro = uCam;
  vec3 inv = 1.0 / rd;
  vec3 ta = (uBoxMin - ro) * inv, tb = (uBoxMax - ro) * inv;
  vec3 tn = min(ta, tb), tf = max(ta, tb);
  float t0 = max(max(max(tn.x, tn.y), tn.z), 0.0), t1 = min(min(min(tf.x, tf.y), tf.z), tSolid);
  if (t1 <= t0) { gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0); return; }
  const int N = 26;
  float dt = (t1 - t0) / float(N);
  // White-noise dither: the blur hides it without stripes.
  float j = h12(gl_FragCoord.xy + fract(uT * 7.13) * 97.0);
  float t = t0 + dt * j;
  float T = 1.0;
  vec3 S = vec3(0.0);
  // Nitrogen fog is white; the lamp lights it, the room fills it faintly blue.
  vec3 alb = vec3(0.92, 0.95, 1.0);
  for (int i = 0; i < N; i++) {
    vec3 p = ro + rd * t;
    t += dt;
    float d = dens(p);
    if (d < 0.002) continue;
    // Fire's detail term: grain on the density.
    d *= 0.85 + 0.35 * (texture(uNoise, p * NS * 7.0 + vec3(0.0, uT * 0.4, 0.0)).g * 2.0 - 1.0);
    vec3 k = normalize(uLamp - p);
    float ph = hg(dot(rd, k), G_HG) * 12.56637;
    vec3 Li = uLampCol * lightT(p, k) * ph;
    Li += vec3(0.06, 0.075, 0.1);
    float al = 1.0 - exp(-max(d, 0.0) * SIG * dt);
    S += T * al * Li * alb;
    T *= 1.0 - al;
    if (T < 0.01) break;
  }
  gl_FragColor = vec4(S, T);
}`;

// A three-tap blur along one axis: it hides the march dither, as in Fire.
const BLUR = /* glsl */`
uniform sampler2D uSrc;
uniform vec2 uStep;
varying vec2 vUv;
void main() {
  vec2 s = uStep / vec2(textureSize(uSrc, 0));
  gl_FragColor = texture2D(uSrc, vUv) * 0.5 + (texture2D(uSrc, vUv + s) + texture2D(uSrc, vUv - s)) * 0.25;
}`;
const VERT = 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';

// The surface under a point: the track top over the ring, else the bench.
const floorAt = (x, z) => Math.abs(Math.hypot(x, z) - TRACK.r) < TRACK.baseW / 2 ? TOP : 0;

export function createVapour(renderer, { lamp, lampCol, keep }) {
  const P = [];
  const noise = keep(noiseTex());
  const opts = { type: THREE.HalfFloatType, depthBuffer: false };
  const depthRT = keep(new THREE.WebGLRenderTarget(2, 2, { depthBuffer: true, depthTexture: new THREE.DepthTexture(2, 2) }));
  const a = keep(new THREE.WebGLRenderTarget(2, 2, opts)), b = keep(new THREE.WebGLRenderTarget(2, 2, opts));
  const uP = Array.from({ length: MAXP }, () => new THREE.Vector4()), uQ = Array.from({ length: MAXP }, () => new THREE.Vector4());
  const march = keep(new THREE.ShaderMaterial({
    uniforms: {
      uDepth: { value: depthRT.depthTexture }, uNoise: { value: noise },
      uProjInv: { value: new THREE.Matrix4() }, uView: { value: new THREE.Matrix4() },
      uCam: { value: new THREE.Vector3() }, uLamp: { value: lamp }, uLampCol: { value: new THREE.Color(lampCol).multiplyScalar(3.2) },
      uBoxMin: { value: new THREE.Vector3() }, uBoxMax: { value: new THREE.Vector3() },
      uP: { value: uP }, uQ: { value: uQ }, uN: { value: 0 }, uT: { value: 0 },
    },
    vertexShader: VERT, fragmentShader: MARCH, depthTest: false, depthWrite: false,
  }));
  const blur = keep(new THREE.ShaderMaterial({
    uniforms: { uSrc: { value: null }, uStep: { value: new THREE.Vector2(1, 0) } },
    vertexShader: VERT, fragmentShader: BLUR, depthTest: false, depthWrite: false,
  }));
  const quad = new FullScreenQuad(march);
  // Depth only: the prepass writes no colour.
  const depthOnly = keep(new THREE.MeshBasicMaterial({ colorWrite: false }));
  const pass = new ShaderPass({
    uniforms: { tDiffuse: { value: null }, uFog: { value: null }, uOn: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform sampler2D tDiffuse; uniform sampler2D uFog; uniform float uOn; varying vec2 vUv;
      void main() {
        vec4 c = texture2D(tDiffuse, vUv);
        vec4 d = uOn > 0.5 ? texture2D(uFog, vUv) : vec4(0.0, 0.0, 0.0, 1.0);
        gl_FragColor = vec4(c.rgb * d.a + d.rgb, c.a);
      }`,
  });
  let clock = 0, emitAcc = 0, calm = false;
  const bmin = new THREE.Vector3(), bmax = new THREE.Vector3(), tmp = new THREE.Vector3();

  /* ---------- puffs ---------- */
  function puff(o) {
    if (P.length >= MAXP) {
      // The thinnest old puff gives way.
      let k = 0;
      for (let i = 1; i < P.length; i++) if (P[i].d / (1 + P[i].age) < P[k].d / (1 + P[k].age)) k = i;
      P.splice(k, 1);
    }
    P.push({ age: 0, d: 0, r: o.r0, squash: 1, vy: -0.01, landed: false, ...o });
  }
  // Births one puff at the rim, on a random side.
  function rimPuff(p, s, k = 1) {
    const a = Math.random() * TAU, rr = PUCK.r * (0.75 + Math.random() * 0.3);
    const vt = s.om * TRACK.r;
    puff({
      x: p.x + Math.cos(a) * rr, y: p.y - 0.001, z: p.z + Math.sin(a) * rr,
      vx: -p.n * vt * 0.06 + Math.cos(a) * 0.012, vz: p.c * vt * 0.06 + Math.sin(a) * 0.012,
      r0: 0.009 + Math.random() * 0.005, r1: (0.028 + Math.random() * 0.016) * (0.7 + 0.3 * k), d0: 0.32 * k + 0.1, life: 2.3 + Math.random() * 1.1,
    });
  }

  // Called each frame with the sim and the puck's pose.
  function follow(s, p, dt) {
    calm = s.calm;
    if (calm) { still(s, p); return; }
    clock += dt;
    const k = boil(s);
    // A pour boils hard: a quick burst of large puffs round the puck.
    for (const e of s.events) {
      if (e.type !== 'pour') continue;
      for (let i = 0; i < 6; i++) {
        const a = i / 6 * TAU + Math.random();
        puff({ x: p.x + Math.cos(a) * 0.02, y: p.y + 0.004, z: p.z + Math.sin(a) * 0.02, vx: Math.cos(a) * 0.05, vz: Math.sin(a) * 0.05,
          r0: 0.014, r1: 0.06 + Math.random() * 0.02, d0: 1.0, life: 3.0 + Math.random(), delay: 0.12 + i * 0.05 });
      }
    }
    if (s.pour && s.pour.t > 0.14 && s.pour.t < s.pour.dur) emitAcc += dt * 9;
    emitAcc += dt * 7 * k * k;
    while (emitAcc >= 1) { emitAcc -= 1; if (k > 0.03 || s.pour) rimPuff(p, s, Math.max(k, s.pour ? 1 : 0)); }
    for (let i = P.length - 1; i >= 0; i--) {
      const q = P[i];
      if (q.delay > 0) { q.delay -= dt; continue; }
      q.age += dt;
      const u = q.age / q.life;
      const f = floorAt(q.x, q.z);
      // Dense cold gas falls, then flows out over the surface it meets.
      if (!q.landed) {
        q.vy = Math.max(q.vy - dt * 0.12, -0.075);
        q.y += q.vy * dt;
        if (q.y - q.r * 0.35 < f) { q.landed = true; q.y = f + q.r * 0.35; }
      } else {
        q.squash = Math.min(2.4, q.squash + dt * 0.9);
        // Off the track's edge it pours down to the bench.
        if (q.y - q.r * 0.35 > f + 0.003) q.landed = false;
        const rr = Math.hypot(q.x, q.z) || 1;
        const out = Math.sign(rr - TRACK.r) || 1;
        q.vx += q.x / rr * out * dt * 0.02; q.vz += q.z / rr * out * dt * 0.02;
      }
      q.vx *= 1 - dt * 0.9; q.vz *= 1 - dt * 0.9;
      q.x += q.vx * dt; q.z += q.vz * dt;
      q.r = q.r0 + (q.r1 - q.r0) * (1 - Math.exp(-q.age * 1.4));
      q.d = q.d0 * Math.min(1, q.age / 0.15) * (1 - u) * Math.pow(q.r0 / q.r, 0.6);
      if (u >= 1) P.splice(i, 1);
    }
  }
  // Reduced motion: a still fog round the puck, sized by the boil.
  function still(s, p) {
    const k = boil(s);
    P.length = 0;
    if (k < 0.03) return;
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * TAU + 0.4;
      const x = p.x + Math.cos(a) * PUCK.r * 1.05, z = p.z + Math.sin(a) * PUCK.r * 1.05;
      P.push({ x, y: p.y - 0.006 - (i % 3) * 0.003, z, r: 0.022 + (i % 2) * 0.008, d: 0.5 * k, squash: 1.2, age: 0, life: 1, r0: 0.02, r1: 0.02 });
    }
    for (let i = 0; i < 4; i++) {
      const a = i / 4 * TAU + 1.1;
      const x = p.x + Math.cos(a) * 0.045, z = p.z + Math.sin(a) * 0.045;
      P.push({ x, y: floorAt(x, z) + 0.006, z, r: 0.04, d: 0.35 * k, squash: 2.2, age: 0, life: 1, r0: 0.04, r1: 0.04 });
    }
  }
  // True while any fog shows.
  const alive = () => P.length > 0;

  function prepare(scene, camera) {
    const live = P.filter(q => !(q.delay > 0) && q.d > 0.003);
    const on = live.length > 0;
    pass.uniforms.uOn.value = on ? 1 : 0;
    if (!on) return;
    const U = march.uniforms;
    bmin.set(1e9, 1e9, 1e9); bmax.set(-1e9, -1e9, -1e9);
    live.forEach((q, i) => {
      uP[i].set(q.x, q.y, q.z, q.r);
      uQ[i].set(q.d, q.squash, 0, 0);
      // The noise warp pushes fog out past the ball a little.
      const m = q.r * 1.2;
      bmin.min(tmp.set(q.x - m, q.y - m / q.squash, q.z - m));
      bmax.max(tmp.set(q.x + m, q.y + m / q.squash, q.z + m));
    });
    bmin.y = Math.max(bmin.y, 0);
    U.uBoxMin.value.copy(bmin); U.uBoxMax.value.copy(bmax);
    U.uN.value = live.length;
    U.uT.value = calm ? 0 : clock;
    U.uProjInv.value.copy(camera.projectionMatrixInverse);
    U.uView.value.copy(camera.matrixWorld);
    U.uCam.value.copy(camera.position);
    // Depth prepass at half size; the shadow maps stay as they are.
    const auto = renderer.shadowMap.autoUpdate;
    renderer.shadowMap.autoUpdate = false;
    scene.overrideMaterial = depthOnly;
    renderer.setRenderTarget(depthRT);
    renderer.clear();
    renderer.render(scene, camera);
    scene.overrideMaterial = null;
    renderer.shadowMap.autoUpdate = auto;
    renderer.shadowMap.needsUpdate = true;
    // The march, then a blur in x and in y.
    quad.material = march;
    renderer.setRenderTarget(a);
    quad.render(renderer);
    quad.material = blur;
    blur.uniforms.uSrc.value = a.texture; blur.uniforms.uStep.value.set(1, 0);
    renderer.setRenderTarget(b);
    quad.render(renderer);
    blur.uniforms.uSrc.value = b.texture; blur.uniforms.uStep.value.set(0, 1);
    renderer.setRenderTarget(a);
    quad.render(renderer);
    renderer.setRenderTarget(null);
    pass.uniforms.uFog.value = a.texture;
  }
  function resize(nw, nh) {
    const w = Math.max(2, nw), h = Math.max(2, nh);
    depthRT.setSize(w, h); a.setSize(w, h); b.setSize(w, h);
  }
  // Compiles the march with one puff, so the first frame does not stall.
  function warm(scene, camera) {
    const keepP = P.splice(0);
    P.push({ x: 0, y: -1, z: 0, r: 0.01, d: 0.01, squash: 1, age: 0, life: 1 });
    prepare(scene, camera);
    P.length = 0;
    P.push(...keepP);
  }
  // Fills the fog as if it had poured for a few seconds, for the first frame.
  function prime(s, p, seconds = 4) {
    const dt = 1 / 30;
    for (let t = 0; t < seconds; t += dt) follow(s, p, dt);
  }
  function dispose() { quad.dispose(); }
  return { pass, follow, prepare, resize, warm, prime, alive, dispose, get count() { return P.length; } };
}
