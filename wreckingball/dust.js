// Wrecking ball: brick dust. A raymarched volume at half resolution.
// The density is a few puffs, eroded by 3D noise; a depth prepass stops the march.
// Lighting is Fire's smoke shading (Tom, 2026-11-22: "fire toy smoke shader -- always").
import * as THREE from 'three';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { FullScreenQuad } from 'three/addons/postprocessing/Pass.js';

const MAXP = 12;
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
uniform vec3 uCam, uKey, uSunCol, uBoxMin, uBoxMax;
uniform vec4 uP[${MAXP}], uQ[${MAXP}];
uniform int uN;
uniform float uT, uFrame;
varying vec2 vUv;
const float SIG = 9.0;
// Density: each puff is a soft ball, squashed near the ground, eroded by noise.
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
  // A drifting warp breaks each ball into billows.
  vec3 w = p * 1.3 + vec3(-uT * 0.05, -uT * 0.1, -uT * 0.03);
  vec2 n = texture(uNoise, w).rg;
  vec2 m = texture(uNoise, p * 0.45 + vec3(0.3, -uT * 0.03, 0.7)).rg;
  float b = puffs(p + (vec3(n.x, n.y, n.x * n.y) - 0.4) * 0.5 + (vec3(m.x, m.y * 0.6, m.y) - 0.45) * 0.9);
  if (b < 0.002) return 0.0;
  float fine = texture(uNoise, p * 4.1 + n.x * 0.7 - vec3(0.0, uT * 0.14, 0.0)).r;
  float c = n.x * 0.6 + fine * 0.5 + n.y * 0.2;
  // Thin dust erodes to wisps; dense dust keeps its body.
  return b * clamp((c - 0.52) * 3.6 + b * 0.55, 0.0, 1.7);
}
float densLite(vec3 p) {
  float b = puffs(p);
  return b * (texture(uNoise, p * 1.1 - vec3(0.0, uT * 0.09, 0.0)).r * 0.9 + 0.05);
}
/* ---------- K3 lighting: Fire's smoke shading (shared/fire.js, volume()) ---------- */
// A short self-shadow march toward the key, Beer plus a multiple-scatter lobe,
// the powder term, an ambient floor, and a Henyey-Greenstein phase times 4 pi.
const float ABSORB = 2.0, AMBIENT = 0.5, POWDER = 0.59, MULTI = 1.0, G_HG = 0.55;
float hg(float c, float g) { float g2 = g * g; return (1.0 - g2) / pow(max(1.0 + g2 - 2.0 * g * c, 1e-4), 1.5) * 0.079577; }
float lightT(vec3 p) {
  // Three taps along the key; a far tap stands for the rest of the cloud.
  float sum = densLite(p + uKey * 0.08) * 0.08 + densLite(p + uKey * 0.22) * 0.14 + densLite(p + uKey * 0.5) * 0.3;
  float tau = sum * SIG * ABSORB * 0.5;
  float beer = exp(-tau);
  float ms = exp(-tau * 0.25) * 0.5;
  float base = mix(beer, beer + ms, MULTI);
  float powder = 1.0 - exp(-tau * 2.0);
  float fin = mix(base, base * powder, POWDER);
  return clamp(fin + AMBIENT, 0.0, 1.0);
}
/* ---------- end K3 lighting ---------- */
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
  const int N = 30;
  float dt = (t1 - t0) / float(N);
  // Interleaved gradient noise, turned each frame; the blur hides it.
  float j = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))) + uFrame * 0.618034);
  float t = t0 + dt * j;
  float T = 1.0;
  vec3 S = vec3(0.0);
  float ph = hg(dot(rd, uKey), G_HG) * 12.56637;
  // Brick dust is warm; the sky fills it from above, the dirt from below.
  vec3 alb = vec3(0.8, 0.64, 0.52);
  for (int i = 0; i < N; i++) {
    vec3 p = ro + rd * t;
    t += dt;
    float d = dens(p);
    if (d < 0.002) continue;
    // Fire's detail term: grain on the density.
    d *= 0.85 + 0.35 * (texture(uNoise, p * 9.0 + vec3(0.0, -uT * 0.2, 0.0)).g * 2.0 - 1.0);
    vec3 Li = uSunCol * lightT(p) * ph;
    Li += vec3(0.035, 0.04, 0.06) * (0.6 + 0.4 * clamp(p.y, 0.0, 1.0)) + vec3(0.02, 0.014, 0.01);
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

export function createDust(renderer, { sun, sunCol, keep }) {
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
      uCam: { value: new THREE.Vector3() }, uKey: { value: sun }, uSunCol: { value: new THREE.Color(sunCol).multiplyScalar(0.85) },
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
    uniforms: { tDiffuse: { value: null }, uDust: { value: null }, uOn: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform sampler2D tDiffuse; uniform sampler2D uDust; uniform float uOn; varying vec2 vUv;
      void main() {
        vec4 c = texture2D(tDiffuse, vUv);
        vec4 d = uOn > 0.5 ? texture2D(uDust, vUv) : vec4(0.0, 0.0, 0.0, 1.0);
        gl_FragColor = vec4(c.rgb * d.a + d.rgb, c.a);
      }`,
  });
  let frameN = 0, clock = 0;

  /* ---------- puffs ---------- */
  // A puff: centre, start and end radius, density, life, squash, drift.
  function puff(x, y, z, r0, r1, d0, life, squash = 1, rise = 0.12) {
    // A young puff close by takes the new dust instead.
    for (const p of P) {
      if (p.age < 0.4 && Math.hypot(p.x - x, p.y - y, p.z - z) < p.r * 0.6) {
        p.d0 = Math.min(1.4, p.d0 + d0 * 0.5); p.r1 = Math.max(p.r1, r1); return;
      }
    }
    if (P.length >= MAXP) {
      let k = 0;
      for (let i = 1; i < P.length; i++) if (P[i].d < P[k].d) k = i;
      P.splice(k, 1);
    }
    P.push({ x, y, z, r0, r1, r: r0, d0, d: 0, life, age: 0, squash, rise, sx: (Math.random() - 0.5) * 0.1, sz: 0.06 + Math.random() * 0.06 });
  }
  function add(e, calm) {
    const L = calm ? 0.5 : 1;
    switch (e.type) {
      case 'hit': {
        const k = clamp(e.v / 5, 0.3, 1.2);
        puff(e.x - 0.05, e.y, e.z, 0.25, 0.95 + 0.5 * k, 1.3 * k, 4.6 * L, 1.0, 0.12);
        // Dust bursts through the hole and drops to the wall's foot.
        puff(e.x + 0.5, e.y + 0.1, e.z + 0.1, 0.2, 0.8 * k + 0.4, 0.9 * k, 4.0 * L, 1.0, 0.16);
        puff(e.x + 0.2, 0.22, e.z - 0.15, 0.25, 1.1, 0.8 * k, 5.0 * L, 1.7, 0.05);
        puff(e.x - 0.35, 0.2, e.z + 0.25, 0.2, 0.9, 0.55 * k, 4.6 * L, 1.8, 0.04);
        break;
      }
      case 'loose':
        if (Math.random() < 0.35) puff(e.x, e.y, e.z, 0.08, 0.32, 0.22, 2.6 * L, 1.0, 0.1);
        break;
      case 'land':
        if (e.first && e.v > 2.2) puff(e.x, 0.06, e.z, 0.06, 0.28 + 0.06 * Math.min(e.v, 6), clamp(e.v / 7, 0.15, 0.55), 2.4 * L, 2.0, 0.08);
        break;
    }
  }
  // Ages the puffs. Returns true while any dust shows.
  function step(dt) {
    clock += dt;
    for (let i = P.length - 1; i >= 0; i--) {
      const p = P[i];
      p.age += dt;
      const u = p.age / p.life;
      p.r = p.r0 + (p.r1 - p.r0) * (1 - Math.exp(-p.age * 2.2));
      // The dust blooms in a few frames, then thins as it spreads.
      p.d = p.d0 * Math.min(1, p.age / 0.06) * Math.exp(-u * 2.2) * (1 - u) * Math.pow(p.r0 / p.r, 0.9);
      p.y += p.rise * dt * Math.exp(-p.age * 0.5);
      p.x += p.sx * dt; p.z += p.sz * dt;
      if (u >= 1 || p.d < 0.004) P.splice(i, 1);
    }
    return P.length > 0;
  }

  function prepare(scene, camera, t) {
    const on = P.length > 0;
    pass.uniforms.uOn.value = on ? 1 : 0;
    if (!on) return;
    frameN++;
    const U = march.uniforms;
    const bmin = U.uBoxMin.value.set(1e9, 1e9, 1e9), bmax = U.uBoxMax.value.set(-1e9, -1e9, -1e9);
    P.forEach((p, i) => {
      uP[i].set(p.x, p.y, p.z, p.r);
      uQ[i].set(p.d, p.squash, 0, 0);
      bmin.min(new THREE.Vector3(p.x - p.r, p.y - p.r / p.squash, p.z - p.r));
      bmax.max(new THREE.Vector3(p.x + p.r, p.y + p.r / p.squash, p.z + p.r));
    });
    bmin.y = Math.max(bmin.y, 0);
    U.uN.value = P.length;
    U.uT.value = clock;
    U.uFrame.value = frameN % 64;
    U.uProjInv.value.copy(camera.projectionMatrixInverse);
    U.uView.value.copy(camera.matrixWorld);
    U.uCam.value.copy(camera.position);
    // Depth prepass at half size; the shadow maps stay as they are.
    const auto = renderer.shadowMap.autoUpdate, bg = scene.background;
    renderer.shadowMap.autoUpdate = false;
    scene.overrideMaterial = depthOnly;
    renderer.setRenderTarget(depthRT);
    renderer.clear();
    renderer.render(scene, camera);
    scene.overrideMaterial = null;
    scene.background = bg;
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
    pass.uniforms.uDust.value = a.texture;
  }
  function resize(nw, nh) {
    w = Math.max(2, nw); h = Math.max(2, nh);
    depthRT.setSize(w, h); a.setSize(w, h); b.setSize(w, h);
  }
  // Compiles the march with one puff, so the first hit does not stall.
  function warm(scene, camera) {
    puff(0, -5, 0, 0.1, 0.1, 0.001, 0.05);
    prepare(scene, camera, 0);
    P.length = 0;
    pass.uniforms.uOn.value = 0;
  }
  function dispose() { quad.dispose(); }
  return { pass, add, step, prepare, resize, warm, dispose, get count() { return P.length; } };
}
