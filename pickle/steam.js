// Glowing pickle: steam. A raymarched volume at half size, from Wrecking ball's dust.
// Puffs rise from the hot pickle; a depth prepass stops the march at solids.
// The light is Fire's smoke light from shared/smoke.js.
import * as THREE from 'three';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { FullScreenQuad } from 'three/addons/postprocessing/Pass.js';
import { SMOKE, smConsts } from '../shared/smoke.js';

const MAXP = 14;
// Noise space: one unit is 4 cm of steam.
const K = 25;
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));

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
uniform vec3 uCam, uGlowP, uGlowC, uRoom, uRoomD, uBoxMin, uBoxMax;
uniform vec4 uP[${MAXP}], uQ[${MAXP}];
uniform int uN;
uniform float uT, uFrame;
varying vec2 vUv;
const float K = ${K.toFixed(1)};
const float SIG = 9.0 * K;
// Density: each puff is a soft ball, stretched upward as it rises, eroded by noise.
float puffs(vec3 p) {
  float d = 0.0;
  for (int i = 0; i < ${MAXP}; i++) {
    if (i >= uN) break;
    vec3 q = p - uP[i].xyz;
    q.y *= uQ[i].y;
    float r = uP[i].w, s = dot(q, q) / (r * r);
    if (s >= 1.0) continue;
    float f = 1.0 - s;
    d += uQ[i].x * f * f * f;
  }
  return d;
}
float dens(vec3 p) {
  vec3 k = p * K;
  // A rising warp curls each puff into wisps.
  vec3 w = k * 1.1 + vec3(-uT * 0.04, -uT * 0.35, -uT * 0.02);
  vec2 n = texture(uNoise, w).rg;
  vec2 m = texture(uNoise, k * 0.4 + vec3(0.3, -uT * 0.12, 0.7)).rg;
  float b = puffs(p + ((vec3(n.x, n.y, n.x * n.y) - 0.4) * 0.6 + (vec3(m.x, m.y * 0.5, m.y) - 0.45) * 1.0) / K);
  if (b < 0.002) return 0.0;
  float fine = texture(uNoise, k * 3.6 + n.x * 0.8 - vec3(0.0, uT * 0.5, 0.0)).r;
  float c = n.x * 0.6 + fine * 0.5 + n.y * 0.2;
  // Steam is thin: it erodes to ribbons.
  return b * clamp((c - 0.56) * 4.0 + b * 0.4, 0.0, 1.5);
}
float densLite(vec3 p) {
  float b = puffs(p);
  return b * (texture(uNoise, p * K - vec3(0.0, uT * 0.3, 0.0)).r * 0.9 + 0.05);
}
${SMOKE}
${smConsts()}
// Fire's smoke light (shared/smoke.js) after three taps toward the key.
float lightT(vec3 p, vec3 key) {
  // Three taps along the key; a far tap stands for the rest of the cloud.
  float sum = densLite(p + key * (0.08 / K)) * 0.08 + densLite(p + key * (0.22 / K)) * 0.14 + densLite(p + key * (0.5 / K)) * 0.3;
  return smLight(sum * 9.0 * smAbsorb * 0.5, smMulti, smPowder, smAmbient);
}
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
  const int N = 28;
  float dt = (t1 - t0) / float(N);
  // Interleaved gradient noise, turned each frame; the blur hides it.
  float j = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))) + uFrame * 0.618034);
  float t = t0 + dt * j;
  float T = 1.0;
  vec3 S = vec3(0.0);
  float phR = smPhase(dot(rd, uRoomD), smG) * 12.56637;
  for (int i = 0; i < N; i++) {
    vec3 p = ro + rd * t;
    t += dt;
    float d = dens(p);
    if (d < 0.002) continue;
    // Fire's detail term: grain on the density.
    d *= 0.85 + 0.35 * (texture(uNoise, p * K * 8.0 + vec3(0.0, -uT * 0.6, 0.0)).g * 2.0 - 1.0);
    // The glow is a point: its key turns and falls off with distance.
    vec3 gv = uGlowP - p;
    float r2 = dot(gv, gv);
    vec3 key = gv * inversesqrt(r2);
    vec3 Li = uGlowC / (r2 + 2e-4) * lightT(p, key) * smPhase(dot(rd, key), smG) * 12.56637;
    Li += uRoom * lightT(p, uRoomD) * phR;
    Li += vec3(0.012, 0.014, 0.02);
    float al = 1.0 - exp(-max(d, 0.0) * SIG * dt);
    S += T * al * Li * 0.9;
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

export function createSteam(renderer, { glow, keep }) {
  const P = [];
  const noise = keep(noiseTex());
  const opts = { type: THREE.HalfFloatType, depthBuffer: false };
  let w = 2, h = 2;
  const depthRT = keep(new THREE.WebGLRenderTarget(w, h, { depthBuffer: true, depthTexture: new THREE.DepthTexture(w, h) }));
  const a = keep(new THREE.WebGLRenderTarget(w, h, opts)), b = keep(new THREE.WebGLRenderTarget(w, h, opts));
  const uP = Array.from({ length: MAXP }, () => new THREE.Vector4()), uQ = Array.from({ length: MAXP }, () => new THREE.Vector4());
  const march = keep(new THREE.ShaderMaterial({
    uniforms: {
      uDepth: { value: depthRT.depthTexture }, uNoise: { value: noise },
      uProjInv: { value: new THREE.Matrix4() }, uView: { value: new THREE.Matrix4() },
      uCam: { value: new THREE.Vector3() }, uGlowP: { value: glow }, uGlowC: { value: new THREE.Color(0, 0, 0) },
      uRoom: { value: new THREE.Color(0.3, 0.36, 0.5) }, uRoomD: { value: new THREE.Vector3(-0.9, 1.3, 0.35).normalize() },
      uBoxMin: { value: new THREE.Vector3() }, uBoxMax: { value: new THREE.Vector3() },
      uP: { value: uP }, uQ: { value: uQ }, uN: { value: 0 }, uT: { value: 0 }, uFrame: { value: 0 },
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
    uniforms: { tDiffuse: { value: null }, uSteam: { value: null }, uOn: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform sampler2D tDiffuse; uniform sampler2D uSteam; uniform float uOn; varying vec2 vUv;
      void main() {
        vec4 c = texture2D(tDiffuse, vUv);
        vec4 d = uOn > 0.5 ? texture2D(uSteam, vUv) : vec4(0.0, 0.0, 0.0, 1.0);
        gl_FragColor = vec4(c.rgb * d.a + d.rgb, c.a);
      }`,
  });
  let frameN = 0, clock = 0;
  const tmp = new THREE.Vector3();

  /* ---------- puffs ---------- */
  // A puff: centre, start and end radius, density, life, stretch, rise speed.
  function puff(x, y, z, r0, r1, d0, life, rise = 0.05) {
    if (P.length >= MAXP) {
      let k = 0;
      for (let i = 1; i < P.length; i++) if (P[i].d < P[k].d) k = i;
      P.splice(k, 1);
    }
    P.push({ x, y, z, r0, r1, r: r0, d0, d: 0, life, age: 0, rise, sx: (Math.random() - 0.5) * 0.012, sz: (Math.random() - 0.6) * 0.01 });
  }
  // Ages the puffs. Returns true while any steam shows.
  function step(dt) {
    clock += dt;
    for (let i = P.length - 1; i >= 0; i--) {
      const p = P[i];
      p.age += dt;
      const u = p.age / p.life;
      p.r = p.r0 + (p.r1 - p.r0) * (1 - Math.exp(-p.age * 0.9));
      // Steam shows fast, then thins as it spreads and dries.
      p.d = p.d0 * Math.min(1, p.age / 0.15) * (1 - u) * Math.pow(p.r0 / p.r, 1.2);
      // It rises fast off the hot skin, then slows and drifts.
      p.y += p.rise * dt * (0.4 + 0.6 * Math.exp(-p.age * 0.6));
      p.x += p.sx * dt; p.z += p.sz * dt;
      if (u >= 1 || p.d < 0.003) P.splice(i, 1);
    }
    return P.length > 0;
  }

  function prepare(scene, camera, t, glowC) {
    const on = P.length > 0;
    pass.uniforms.uOn.value = on ? 1 : 0;
    if (!on) return;
    frameN++;
    const U = march.uniforms;
    U.uGlowC.value.copy(glowC);
    const bmin = U.uBoxMin.value.set(1e9, 1e9, 1e9), bmax = U.uBoxMax.value.set(-1e9, -1e9, -1e9);
    // The warp moves steam up to 1.6 / K off its ball; the box allows it.
    const pad = 1.6 / K;
    P.forEach((p, i) => {
      uP[i].set(p.x, p.y, p.z, p.r);
      uQ[i].set(p.d, 0.7, 0, 0);
      bmin.min(tmp.set(p.x - p.r - pad, p.y - p.r / 0.7 - pad, p.z - p.r - pad));
      bmax.max(tmp.set(p.x + p.r + pad, p.y + p.r / 0.7 + pad, p.z + p.r + pad));
    });
    U.uN.value = P.length;
    U.uT.value = clock;
    U.uFrame.value = frameN % 64;
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
    pass.uniforms.uSteam.value = a.texture;
  }
  function resize(nw, nh) {
    w = Math.max(2, nw); h = Math.max(2, nh);
    depthRT.setSize(w, h); a.setSize(w, h); b.setSize(w, h);
  }
  // Compiles the march with one puff, so the first wisp does not stall.
  function warm(scene, camera) {
    puff(0, -5, 0, 0.01, 0.01, 0.001, 0.05);
    prepare(scene, camera, 0, new THREE.Color(0, 0, 0));
    P.length = 0;
    pass.uniforms.uOn.value = 0;
  }
  function dispose() { quad.dispose(); }
  return { pass, puff, step, prepare, resize, warm, dispose, get count() { return P.length; } };
}
