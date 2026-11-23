// Volcano clouds: one raymarched pass for the cloud sea, the collar and the cap.
// After Railgun's cloud pass (railgun/src/clouds/pass.ts, layer.glsl): a half-size march, then a composite with true depth.
// The vent, the flash, the bolts and the hot bombs light the clouds from inside and below.
import * as THREE from 'three';
import { EYE } from './terrain.js';
import { MAX_BOMB_LIGHTS } from './scene.js';
import { HEAD, PLUME_GLSL } from './plume.js';

/* ---------- kit: Railgun's tiled 3D billow noise (railgun/storms.js VOL_NOISE) ---------- */
const VOL_NOISE = /* glsl */`
vec3 vh3(vec3 p) {
  p = vec3(dot(p, vec3(127.1, 311.7, 74.7)), dot(p, vec3(269.5, 183.3, 246.1)), dot(p, vec3(113.5, 271.9, 124.6)));
  return fract(sin(p) * 43758.5453123);
}
float vworley(vec3 uv, float f) {
  vec3 id = floor(uv * f), p = fract(uv * f);
  float md = 9.0;
  for (int x = -1; x <= 1; x++) for (int y = -1; y <= 1; y++) for (int z = -1; z <= 1; z++) {
    vec3 o = vec3(float(x), float(y), float(z));
    vec3 d = o + vh3(mod(id + o, f)) * 0.8 + 0.1 - p;
    md = min(md, dot(d, d));
  }
  return clamp(1.0 - sqrt(md), 0.0, 1.0);
}
float vgrad(vec3 i, vec3 w, vec3 o, float f) { return dot(vh3(mod(i + o, f)) * 2.0 - 1.0, w - o); }
float vperlin(vec3 uv, float f) {
  vec3 p = uv * f, i = floor(p), w = fract(p);
  vec3 u = w * w * w * (w * (w * 6.0 - 15.0) + 10.0);
  return mix(mix(mix(vgrad(i, w, vec3(0, 0, 0), f), vgrad(i, w, vec3(1, 0, 0), f), u.x), mix(vgrad(i, w, vec3(0, 1, 0), f), vgrad(i, w, vec3(1, 1, 0), f), u.x), u.y),
             mix(mix(vgrad(i, w, vec3(0, 0, 1), f), vgrad(i, w, vec3(1, 0, 1), f), u.x), mix(vgrad(i, w, vec3(0, 1, 1), f), vgrad(i, w, vec3(1, 1, 1), f), u.x), u.y), u.z);
}
vec4 volAt(vec3 p) {
  float pf = clamp(0.5 + 0.8 * (vperlin(p, 4.0) + 0.5 * vperlin(p, 8.0) + 0.25 * vperlin(p, 16.0)), 0.0, 1.0);
  float wf = vworley(p, 4.0) * 0.625 + vworley(p, 8.0) * 0.25 + vworley(p, 16.0) * 0.125;
  float fine = vworley(p, 6.0) * 0.625 + vworley(p, 12.0) * 0.25 + vworley(p, 24.0) * 0.125;
  return vec4(wf + pf * (1.0 - wf), fine, wf, 1.0);
}`;
/* ---------- end kit ---------- */

// R holds billows, G fine Worley for erosion, B cells.
function bakeNoise(renderer, n = 96) {
  const rt = new THREE.WebGL3DRenderTarget(n, n, n, { depthBuffer: false });
  rt.texture.minFilter = rt.texture.magFilter = THREE.LinearFilter;
  rt.texture.wrapS = rt.texture.wrapT = rt.texture.wrapR = THREE.RepeatWrapping;
  const mat = new THREE.ShaderMaterial({
    uniforms: { uZ: { value: 0 } }, depthTest: false, depthWrite: false,
    vertexShader: /* glsl */`varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
    fragmentShader: /* glsl */`varying vec2 vUv; uniform float uZ;
    ${VOL_NOISE}
    void main() { gl_FragColor = volAt(vec3(vUv, uZ)); }`,
  });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
  const flat = new THREE.Camera();
  for (let z = 0; z < n; z++) {
    mat.uniforms.uZ.value = (z + 0.5) / n;
    renderer.setRenderTarget(rt, z);
    renderer.render(quad, flat);
  }
  renderer.setRenderTarget(null);
  mat.dispose(); quad.geometry.dispose();
  return rt;
}

// The cloud bodies, in metres.
// A collar round the summit, a cap on the twin, and a deck high overhead.
const SHAPE = /* glsl */`
precision highp sampler3D;
uniform sampler3D uVol;
uniform float uT;
uniform vec2 uWind;
const float VOL_LO = 850.0, VOL_HI = 5000.0;
// The active cone's profile, from terrain.js: relief, base radius, crater radius, power.
const float CONE_H = 2050.0, CONE_R = 5200.0, CONE_CR = 150.0;
// The summit collar's band of height.
const float COL_LO = 950.0, COL_HI = 1400.0;
const vec3 CAP = vec3(-8200.0, 2470.0, -7000.0);
// Extinction per metre at full density.
const float SIG = 0.011;
float gSh = 0.0, gA = 1.0, gFb = 0.0;
// The cone's radius at height y.
float coneR(float y) {
  float s = 1.0 - pow(clamp(y / CONE_H, 0.0, 1.0), 1.0 / 1.85);
  return CONE_CR + s * (CONE_R - CONE_CR);
}
// A layer of domes, after Railgun's heap layer: cover, cells, round crowns, a flat base.
// Returns the depth inside in km; A is the billow size.
float domes(vec2 w, float hk, float base, float cut, float tall, float scale, float seed, out float A) {
  vec2 a = mat2(0.825, -0.565, 0.565, 0.825) * w / (scale * 5.0), b = mat2(-0.32, -0.947, 0.947, -0.32) * w / (scale * 1.9);
  float cv = texture(uVol, vec3(a, seed)).r * 0.65 + texture(uVol, vec3(b, seed + 0.31)).r * 0.35;
  float c = smoothstep(cut - 0.1, cut + 0.14, cv);
  float cell = texture(uVol, vec3(w / scale, seed + 0.58)).b;
  float loc = clamp((cell - (1.0 - c) * 0.6) / max(c * 0.42, 0.05), 0.0, 1.0);
  float top = base - 0.06 + tall * (0.3 + 0.7 * c) * sqrt(1.0 - (1.0 - loc) * (1.0 - loc));
  A = (0.05 + 0.2 * loc) * tall * 2.0;
  return min(top - hk, (hk - base) * 1.5) - (1.0 - c) * 0.2;
}
float dens(vec3 p, float lod, bool fine) {
  vec2 w = (p.xz + uWind * uT) / 1000.0;
  float hk = p.y / 1000.0;
  float sh = -9.0, A = 0.1, Ai;
  // The deck overhead: broken altocumulus, 3.9 to 4.7 km.
  if (hk > 3.7) { float s2 = domes(w * 0.8 + 3.1, hk, 3.9, 0.74, 0.55, 1.3, 0.47, Ai); if (s2 > sh) { sh = s2; A = Ai * 0.8; } }
  // The collar: domes in a band round the summit, broken round the cone.
  // Ring coordinates tile a whole number of times round, so the noise has no seam.
  float r = length(p.xz), ang = atan(p.z, p.x) / 6.2832;
  float out1 = (r - coneR(p.y)) / 1000.0;
  if (out1 < 1.4 && hk > COL_LO / 1000.0 - 0.1 && hk < COL_HI / 1000.0 + 0.4) {
    float cv2 = texture(uVol, vec3(ang * 3.0 + uT * 0.00008, 0.31, 0.57)).r * 0.7 + texture(uVol, vec3(ang * 7.0, 0.62, 0.21)).r * 0.3;
    float cc = smoothstep(0.36, 0.6, cv2);
    float cell2 = texture(uVol, vec3(ang * 11.0, out1 / 1.1, 0.29)).b;
    float loc2 = clamp((cell2 - (1.0 - cc) * 0.6) / max(cc * 0.42, 0.05), 0.0, 1.0);
    float topc = COL_LO / 1000.0 + 0.06 + (0.1 + 0.26 * cc) * sqrt(1.0 - (1.0 - loc2) * (1.0 - loc2));
    float shc = min(min(topc - hk, (hk - COL_LO / 1000.0) * 1.5), (0.1 + 0.45 * cc * loc2 - out1) * 0.7);
    shc -= (1.0 - cc) * 0.25;
    if (shc > sh) { sh = shc; A = 0.08 + 0.18 * loc2; }
  }
  // The cap: stacked lenses over the twin's summit.
  vec3 q = (p - CAP) / vec3(1350.0, 190.0, 1150.0);
  float shp = (1.0 - length(q)) * 0.16 - 0.025 * (0.5 + 0.5 * cos(q.y * 9.4));
  if (shp > sh) { sh = shp; A = 0.06; }
  gSh = sh; gA = A; gFb = sh - A;
  if (sh < -A * 0.55) return 0.0;
  // Billows rise slowly, so the tops boil.
  vec3 qb = vec3(w.x * 0.8 - w.y * 0.6, hk - uT * 0.0025, w.x * 0.6 + w.y * 0.8);
  vec4 m = texture(uVol, qb / 1.1);
  float fb = sh + A * (m.r * 0.6 + m.b * 0.4 - 0.5);
  if (fine) fb += A * 0.4 * (texture(uVol, qb / 0.32 + 3.7).g - 0.5);
  gSh = sh; gA = A; gFb = fb;
  return smoothstep(0.0, 0.035 * (1.0 + 1.5 * lod), fb);
}
`;

const marchSrc = plume => /* glsl */`
uniform vec4 uBombs[${MAX_BOMB_LIGHTS}];
uniform sampler2D tDist;
uniform mat4 uInv;
uniform vec3 uGlowD;
in vec2 vN;
layout(location = 1) out highp vec4 gDistOut;
// Optical depth toward a light, in growing steps.
float tapOD(vec3 p, vec3 L, float st, int n, float lod) {
  float od = 0.0;
  for (int j = 0; j < 4; j++) {
    if (j >= n) break;
    p += L * st;
    od += dens(p, lod + 1.0, false) * st;
    st *= 1.9;
  }
  return od;
}
// Henyey-Greenstein, as in Fire's smoke.
float hg(float c, float g) { float g2 = g * g; return (1.0 - g2) / pow(1.0 + g2 - 2.0 * g * c, 1.5) * 0.0796; }
${plume}
void main() {
  vec4 w = uInv * vec4(vN, 1.0, 1.0);
  vec3 ro = cameraPosition, rd = normalize(w.xyz / w.w - ro);
  float tEnd = texture(tDist, vN * 0.5 + 0.5).r * 1000.0;
  // The volume's slab.
  // The volume's slab; the eye stands under it.
  float t0 = rd.y > 0.0 ? max((VOL_LO - ro.y) / rd.y, 0.0) : 1e9, t1 = min(tEnd, 60000.0);
  if (rd.y > 0.0) t1 = min(t1, (VOL_HI - ro.y) / rd.y);
  gDistOut = vec4(0.0);
  if (t1 <= t0) { gl_FragColor = vec4(0.0); return; }
  const int N = 96;
  float ds = 120.0;
  float grow = clamp(pow(max((t1 - t0) / (ds * float(N)), 1.0), 1.6 / float(N)), 1.0, 1.2);
  float t = t0 + ds * fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
  vec3 col = vec3(0.0);
  float T = 1.0, tHit = -1.0, shV = -1.0;
  bool inside = false;
  // The afterglow lies low in the west, ahead of the eye.
  float phG = hg(dot(rd, uGlowD), 0.45) * 12.566;
  for (int i = 0; i < N; i++) {
    if (t > t1) break;
    vec3 p = ro + rd * t;
    float lod = clamp(log2(t / 5000.0 + 1.0), 0.0, 4.0);
    float dn = dens(p, lod, lod < 2.0);
    if (dn > 0.002 && !inside) {
      // On entry, bisect back to the surface, so the silhouette is exact.
      float a0 = max(t - ds, t0), b0 = t;
      for (int k = 0; k < 5; k++) {
        float m = 0.5 * (a0 + b0);
        if (dens(ro + rd * m, lod, lod < 2.0) > 0.002) b0 = m; else a0 = m;
      }
      t = b0; p = ro + rd * t;
      dn = dens(p, lod, lod < 2.0);
    }
    inside = dn > 0.002;
    float dSh = gSh, dA = gA, dFb = gFb;
    if (!inside) {
      // Far from any cloud, skip ahead.
      float gap = -dSh - dA * 0.6;
      t += gap > 0.0 ? clamp(gap * 700.0, ds, 700.0) : ds;
      ds *= grow;
      continue;
    }
    if (tHit < 0.0) tHit = t;
    float powder = 1.0 - exp(-SIG * dn * 500.0);
    float crease = clamp(0.7 - 1.4 * dSh / max(dA, 0.05), 0.15, 1.2);
    float open = exp(-3.0 * max(dFb, 0.0)) * crease;
    // Sky light from above; the tops catch it, the undersides stay dark.
    float up = clamp((p.y - 900.0) / 3000.0, 0.0, 1.0);
    vec3 Lc = vec3(0.026, 0.034, 0.062) * (0.25 + 0.75 * up) * (0.3 + 0.9 * open);
    // The afterglow: a dim sun below the horizon, through the cloud.
    float od = tapOD(p, uGlowD, 120.0, 2, lod);
    float Tl = max(exp(-SIG * od), 0.5 * exp(-SIG * od * 0.2));
    Lc += vec3(0.20, 0.085, 0.045) * 0.07 * Tl * phG * mix(1.0, powder, 0.5) * (0.4 + 0.6 * up);
    // The vent: one shade tap per ray, at its first cloud.
    vec3 Lv = uLight - p;
    float dv2 = dot(Lv, Lv);
    vec3 Ld = Lv * inversesqrt(dv2);
    if (shV < 0.0) shV = exp(-SIG * tapOD(p, Ld, 150.0, 3, lod) * 0.8);
    float back = pow(max(dot(rd, Ld), 0.0), 4.0);
    float thin = 1.0 - powder;
    float rf = 1.6e6 / (dv2 + 1.6e6), rfF = 4.5e6 / (dv2 + 4.5e6);
    float vent = uHeat * 0.5 * rf + uFlash * 2.2 * rfF;
    Lc += FIRE * vent * ((0.06 + 0.94 * shV) * (0.3 + 0.7 * powder) + 0.6 * thin * back);
    // A bolt lights the cloud round it, with no shadow.
    vec3 bq = uBoltPos - p;
    float bd2 = dot(bq, bq);
    Lc += BOLT * uBolt * (1.8 * exp(-bd2 / 1.4e6) + 0.5 * exp(-sqrt(bd2) / 2600.0)) * (0.4 + 0.6 * dn);
    // Hot bombs in the cloud light it from within.
    for (int j = 0; j < ${MAX_BOMB_LIGHTS}; j++) {
      vec4 bb = uBombs[j];
      if (bb.w <= 0.0) continue;
      vec3 q3 = bb.xyz - p;
      Lc += FIRE * bb.w * 0.9 / (1.0 + dot(q3, q3) / 22000.0);
    }
    float di = clamp(ds, 50.0, 40.0 + t * 0.008);
    float a = 1.0 - exp(-SIG * dn * di);
    col += T * Lc * a;
    T *= 1.0 - a;
    if (T < 0.02) break;
    t += di;
  }
  // Two segments, the clouds and the plume, joined front to back by distance.
  float al = 1.0 - T;
  vec4 cl = vec4(0.0);
  float tc = 1e9;
  if (al >= 0.002) { cl = vec4(haze(col / al, ro + rd * tHit) * al, al); tc = tHit; }
  float tp;
  vec4 pm = plumeMarch(ro, rd, tEnd, tp);
  // The plume takes the same air: it fades toward the horizon colour.
  float fh = 1.0 - exp(-tp * 0.000042);
  vec4 pl = vec4(mix(pm.rgb, fogColour(rd) * pm.a, fh), pm.a);
  bool lit = pm.a > 0.002 || max(pm.r, max(pm.g, pm.b)) > 0.0005;
  vec4 o = tp < tc ? pl + (1.0 - pl.a) * cl : cl + (1.0 - cl.a) * pl;
  float dep = !lit ? tc : (tc > 1e8 ? tp : (tp < tc ? (pl.a > 0.3 ? tp : tc) : (cl.a > 0.3 ? tc : tp)));
  if (dep > 1e8) { gl_FragColor = vec4(0.0); return; }
  gl_FragColor = o;
  gDistOut = vec4(dep / 1000.0, 0.0, 0.0, 1.0);
}
`;
export function makeClouds(renderer, scene, U, terrainMesh, bombs, HAZE, plume) {
  const vol = bakeNoise(renderer);
  // The terrain's distance from the eye, in km, at the march's size.
  const distRT = new THREE.WebGLRenderTarget(2, 2, { type: THREE.HalfFloatType });
  distRT.texture.minFilter = distRT.texture.magFilter = THREE.NearestFilter;
  const distScene = new THREE.Scene();
  distScene.add(new THREE.Mesh(terrainMesh.geometry, new THREE.ShaderMaterial({
    vertexShader: /* glsl */`varying vec3 vW; void main() { vW = position; gl_Position = projectionMatrix * viewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */`varying vec3 vW; void main() { gl_FragColor = vec4(length(vW - cameraPosition) / 1000.0, 0.0, 0.0, 1.0); }`,
  })));
  distScene.children[0].frustumCulled = false;
  // Two targets: light with cover in alpha, and the first cloud's distance in km.
  const rt = new THREE.WebGLRenderTarget(2, 2, { count: 2, type: THREE.HalfFloatType, depthBuffer: false });
  rt.textures[1].minFilter = rt.textures[1].magFilter = THREE.NearestFilter;
  const CU = {
    uVol: { value: vol.texture }, uT: { value: 0 }, uWind: { value: new THREE.Vector2(-3.5, 1.2) },
    tDist: { value: distRT.texture }, uInv: { value: new THREE.Matrix4() }, uBombs: { value: bombs },
    uGlowD: { value: new THREE.Vector3(0, 0.06, -1).normalize() },
  };
  const passMat = new THREE.ShaderMaterial({
    uniforms: { ...U, ...CU, ...plume.MU }, depthTest: false, depthWrite: false,
    vertexShader: /* glsl */`out vec2 vN; void main() { vN = position.xy; gl_Position = vec4(position.xy, 1.0, 1.0); }`,
    fragmentShader: `${SHAPE}\n${HAZE}\n${HEAD}\n${marchSrc(PLUME_GLSL)}`,
  });
  const tri = new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
  const passScene = new THREE.Scene();
  const passMesh = new THREE.Mesh(tri, passMat);
  passMesh.frustumCulled = false;
  passScene.add(passMesh);

  // The composite: the light over the scene, at each cloud's own depth.
  const COMP = { tCol: { value: rt.textures[0] }, tDep: { value: rt.textures[1] }, uInv: CU.uInv, uVPc: { value: new THREE.Matrix4() } };
  const fs = depthOnly => /* glsl */`uniform sampler2D tCol, tDep; uniform mat4 uInv, uVPc; varying vec2 vUv;
  void main() {
    // A small tent filter softens the march's grain at half size.
    vec2 px = 1.0 / vec2(textureSize(tCol, 0));
    vec4 c0 = texture2D(tCol, vUv);
    vec4 c = (texture2D(tCol, vUv + vec2(px.x, 0.0)) + texture2D(tCol, vUv - vec2(px.x, 0.0)) + texture2D(tCol, vUv + vec2(0.0, px.y)) + texture2D(tCol, vUv - vec2(0.0, px.y))) * 0.25;
    c = c0 * 0.4 + c * 0.6;
    if (${depthOnly ? 'c.a < 0.5' : 'c.a < 0.004 && max(c.r, max(c.g, c.b)) < 0.0005'}) discard;
    // The farthest of five taps keeps an empty edge texel from pulling depth to the eye.
    float dep = max(texture2D(tDep, vUv).r, max(max(texture2D(tDep, vUv + vec2(px.x, 0.0)).r, texture2D(tDep, vUv - vec2(px.x, 0.0)).r), max(texture2D(tDep, vUv + vec2(0.0, px.y)).r, texture2D(tDep, vUv - vec2(0.0, px.y)).r)));
    if (dep <= 0.0) discard;
    vec4 w = uInv * vec4(vUv * 2.0 - 1.0, 1.0, 1.0);
    vec3 rd = normalize(w.xyz / w.w - cameraPosition);
    vec4 cp = uVPc * vec4(cameraPosition + rd * dep * 1000.0, 1.0);
    gl_FragDepth = clamp(cp.z / cp.w * 0.5 + 0.5, 0.0, 1.0);
    gl_FragColor = c;
  }`;
  const vs = /* glsl */`varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;
  const comp = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
    uniforms: COMP, vertexShader: vs, fragmentShader: fs(false),
    transparent: true, depthWrite: false, depthTest: true,
    blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
    blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor,
  }));
  const compDepth = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
    uniforms: COMP, vertexShader: vs, fragmentShader: fs(true),
    transparent: true, colorWrite: false, depthWrite: true, depthTest: true,
  }));
  for (const [m, o] of [[comp, 1.5], [compDepth, 1.501]]) { m.frustumCulled = false; m.renderOrder = o; scene.add(m); }

  const vp = new THREE.Matrix4(), clear = new THREE.Color();
  let res = 0.5;
  // Runs once a frame, before the composer.
  function draw(camera, t) {
    const w = Math.max(1, Math.round(renderer.domElement.width * res)), h = Math.max(1, Math.round(renderer.domElement.height * res));
    if (rt.width !== w || rt.height !== h) { rt.setSize(w, h); distRT.setSize(w, h); }
    camera.updateMatrixWorld();
    vp.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    CU.uInv.value.copy(vp).invert();
    COMP.uVPc.value.copy(vp);
    CU.uT.value = t;
    const ca = renderer.getClearAlpha();
    renderer.getClearColor(clear);
    renderer.setClearColor(new THREE.Color(1000, 0, 0), 1);
    renderer.setRenderTarget(distRT);
    renderer.clear();
    renderer.render(distScene, camera);
    renderer.setClearColor(0x000000, 0);
    renderer.setRenderTarget(rt);
    renderer.clear();
    renderer.render(passScene, camera);
    renderer.setRenderTarget(null);
    renderer.setClearColor(clear, ca);
  }
  return { draw, setRes: r => { res = r; }, U: CU, passMat };
}
