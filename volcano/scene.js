// Volcano scene: sky, cone, vent halo, ash puffs and glowing streaks.
// Each object has its own small ShaderMaterial, so each program links fast.
import * as THREE from 'three';
import { height, noise3 } from './terrain.js';

export const MAX_BOMB_LIGHTS = 12;

// Shared uniforms: the camera, the vent light, the flash and the bolts.
export function makeUniforms() {
  return {
    uCam: { value: new THREE.Vector3() },
    uLight: { value: new THREE.Vector3() },
    uHeat: { value: 0.2 },
    uFlash: { value: 0 },
    uBolt: { value: 0 },
    uBoltPos: { value: new THREE.Vector3() },
    uHorizon: { value: new THREE.Color(0.16, 0.12, 0.13) },
    uDim: { value: 1 },
  };
}

// Haze: fog toward the horizon colour, warm in-scatter round the vent, cold round a bolt.
const HAZE = /* glsl */`
uniform vec3 uCam, uLight, uHorizon, uBoltPos;
uniform float uHeat, uFlash, uBolt;
const vec3 FIRE = vec3(1.0, 0.33, 0.07);
const vec3 BOLT = vec3(0.62, 0.68, 1.0);
// The glow along a view ray that passes a point light at distance b.
float pass(vec3 dir, float dist, vec3 at, float r1, float r2) {
  vec3 tv = at - uCam;
  float tc = clamp(dot(tv, dir), 0.0, dist);
  float b = length(tv - dir * tc);
  float near = smoothstep(0.0, 350.0, tc);
  return near * (exp(-b / r1) * 0.55 + exp(-b / r2) * 0.45);
}
vec3 fogColour(vec3 dir) {
  float up = max(dir.y, 0.0);
  float west = smoothstep(0.2, -0.95, dir.z);
  return uHorizon * (0.35 + 0.65 * west) * exp(-up * 7.0);
}
vec3 haze(vec3 col, vec3 wp) {
  vec3 d = wp - uCam;
  float dist = length(d);
  vec3 dir = d / dist;
  float f = 1.0 - exp(-dist * 0.00022);
  // A low haze layer lies on the plain; it thins with height.
  float low = exp(-max(wp.y - 20.0, 0.0) / 90.0) * (1.0 - exp(-dist * 0.0012));
  col = mix(col, fogColour(dir), clamp(f + low * 0.3, 0.0, 1.0));
  float g = pass(dir, dist, uLight, 90.0, 520.0);
  col += FIRE * g * (uHeat * 0.16 + uFlash * 0.9);
  col += BOLT * pass(dir, dist, uBoltPos, 180.0, 900.0) * uBolt * 0.2;
  return col;
}
`;

/* ---------- sky ---------- */
function sky(U) {
  const mat = new THREE.ShaderMaterial({
    uniforms: U, depthWrite: false, side: THREE.BackSide,
    vertexShader: /* glsl */`
      varying vec3 vW;
      void main() { vW = (modelMatrix * vec4(position, 1.0)).xyz; gl_Position = projectionMatrix * viewMatrix * vec4(vW, 1.0); gl_Position.z = gl_Position.w; }`,
    fragmentShader: /* glsl */`
      ${HAZE}
      uniform float uDim;
      varying vec3 vW;
      float h2(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      void main() {
        vec3 dir = normalize(vW - uCam);
        float e = dir.y;
        float west = smoothstep(0.3, -1.0, dir.z);
        // Blue hour: deep blue overhead, a pale band low, the afterglow in the west.
        vec3 zen = vec3(0.006, 0.010, 0.030);
        vec3 band = vec3(0.030, 0.042, 0.075);
        vec3 c = mix(band, zen, smoothstep(0.0, 0.55, e));
        c += vec3(0.30, 0.12, 0.05) * west * west * exp(-max(e, 0.0) * 14.0);
        c += vec3(0.07, 0.07, 0.10) * west * exp(-max(e, 0.0) * 4.0);
        // Stars: a sparse grid on the sphere, gone near the horizon.
        vec2 g = vec2(atan(dir.x, dir.z), asin(clamp(e, -1.0, 1.0))) * 260.0;
        vec2 cell = floor(g);
        float s = h2(cell);
        vec2 off = vec2(h2(cell + 3.1), h2(cell + 7.7)) * 0.7 + 0.15;
        float star = step(0.993, s) * exp(-dot(g - cell - off, g - cell - off) * 26.0);
        c += vec3(0.85, 0.9, 1.0) * star * pow(h2(cell + 1.3), 3.0) * 0.9 * smoothstep(0.08, 0.4, e) * uDim;
        // The vent glow and the bolt light the air.
        c += FIRE * pass(dir, 1e5, uLight, 120.0, 650.0) * (uHeat * 0.16 + uFlash * 0.9);
        c += BOLT * pass(dir, 1e5, uBoltPos, 200.0, 900.0) * uBolt * 0.25;
        gl_FragColor = vec4(c, 1.0);
      }`,
  });
  const m = new THREE.Mesh(new THREE.SphereGeometry(9000, 48, 24), mat);
  m.renderOrder = 0;
  m.frustumCulled = false;
  return m;
}

/* ---------- terrain ---------- */
// A radial grid: rings close at the vent, wide at the far hills.
function terrainGeometry(rings = 220, segs = 360, R = 7500) {
  const pos = new Float32Array((rings * segs + 1) * 3);
  pos[1] = height(0, 0);
  let k = 3;
  for (let i = 1; i <= rings; i++) {
    const r = R * Math.pow(i / rings, 2.3);
    for (let j = 0; j < segs; j++) {
      const a = (j / segs) * Math.PI * 2, x = Math.cos(a) * r, z = Math.sin(a) * r;
      pos[k++] = x; pos[k++] = height(x, z); pos[k++] = z;
    }
  }
  const idx = [];
  for (let j = 0; j < segs; j++) idx.push(0, 1 + ((j + 1) % segs), 1 + j);
  for (let i = 1; i < rings; i++) {
    const a0 = 1 + (i - 1) * segs, a1 = 1 + i * segs;
    for (let j = 0; j < segs; j++) {
      const j1 = (j + 1) % segs;
      idx.push(a0 + j, a0 + j1, a1 + j, a0 + j1, a1 + j1, a1 + j);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}
function terrain(U) {
  const bombs = Array.from({ length: MAX_BOMB_LIGHTS }, () => new THREE.Vector4(0, -1e4, 0, 0));
  const mat = new THREE.ShaderMaterial({
    uniforms: { ...U, uBombs: { value: bombs } },
    vertexShader: /* glsl */`
      varying vec3 vW; varying vec3 vN;
      void main() { vW = position; vN = normal; gl_Position = projectionMatrix * viewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */`
      ${HAZE}
      uniform vec4 uBombs[${MAX_BOMB_LIGHTS}];
      varying vec3 vW; varying vec3 vN;
      void main() {
        vec3 n = normalize(vN);
        float r = length(vW.xz);
        // Near-black basalt; the upper cone is paler ash.
        vec3 alb = mix(vec3(0.05, 0.045, 0.043), vec3(0.085, 0.078, 0.074), smoothstep(700.0, 150.0, r));
        // Sky light: dim blue from above, a warm lift from the west.
        vec3 lit = vec3(0.020, 0.025, 0.040) * (0.25 + 0.75 * n.y) + vec3(0.03, 0.018, 0.014) * max(-n.z, 0.0);
        // The vent light: above the rim, so the rim shades the flanks a little.
        vec3 L = uLight - vW;
        float d2 = dot(L, L), d = sqrt(d2);
        float wrap = max(dot(n, L / d) * 0.75 + 0.25, 0.0);
        lit += FIRE * wrap * (uHeat * 5200.0 + uFlash * 90000.0) / (d2 + 9000.0);
        // The lit column overhead throws a second, softer light down the flanks.
        vec3 L2 = uLight + vec3(0.0, 330.0, 0.0) - vW;
        float c2 = dot(L2, L2);
        lit += FIRE * max(dot(n, L2 * inversesqrt(c2)) * 0.6 + 0.4, 0.0) * (max(uHeat - 0.35, 0.0) * 14000.0 + uFlash * 40000.0) / (c2 + 60000.0);
        // Hot bombs light the ground round them.
        for (int i = 0; i < ${MAX_BOMB_LIGHTS}; i++) {
          vec4 b = uBombs[i];
          vec3 q = b.xyz - vW;
          float e2 = dot(q, q);
          lit += FIRE * b.w * max(dot(n, q * inversesqrt(e2 + 1.0)) * 0.6 + 0.4, 0.0) * 160.0 / (e2 + 40.0);
        }
        // A bolt lights the land from above.
        vec3 bq = uBoltPos - vW;
        lit += BOLT * uBolt * (0.5 + 0.5 * n.y) * 1.2e5 / (dot(bq, bq) + 4e5);
        vec3 col = alb * lit;
        gl_FragColor = vec4(haze(col, vW), 1.0);
      }`,
  });
  const m = new THREE.Mesh(terrainGeometry(), mat);
  m.renderOrder = 1;
  m.frustumCulled = false;
  return { mesh: m, bombs };
}

/* ---------- vent halo ---------- */
function halo(U) {
  const g = new THREE.PlaneGeometry(2, 2);
  const mat = new THREE.ShaderMaterial({
    uniforms: { ...U, uSize: { value: 340 } },
    transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */`
      uniform vec3 uLight; uniform float uSize;
      varying vec2 vQ;
      void main() {
        vQ = position.xy;
        vec3 right = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
        vec3 up = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
        vec3 wp = uLight + (right * position.x + up * position.y) * uSize;
        gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
      }`,
    fragmentShader: /* glsl */`
      uniform float uHeat, uFlash;
      varying vec2 vQ;
      void main() {
        float r2 = dot(vQ, vQ);
        float g = exp(-r2 * 12.0) * 0.4 + exp(-r2 * 60.0) * 0.8;
        vec3 c = vec3(1.0, 0.38, 0.09) * g * (uHeat * 0.12 + uFlash * 2.2) + vec3(1.0, 0.85, 0.65) * exp(-r2 * 90.0) * uFlash * 1.5;
        gl_FragColor = vec4(c, 1.0);
      }`,
  });
  const m = new THREE.Mesh(g, mat);
  m.renderOrder = 2;
  m.frustumCulled = false;
  return m;
}

/* ---------- ash and steam puffs ---------- */
// A tileable noise texture: two octave sets in red and green.
function noiseTexture(N = 128) {
  const data = new Uint8Array(N * N * 4);
  const per = (x, y, f, z) => {
    // Noise on a torus, so the tile has no seam.
    const a = (x / N) * Math.PI * 2, b = (y / N) * Math.PI * 2;
    return noise3(Math.cos(a) * f + 9, Math.sin(a) * f + Math.cos(b) * f, Math.sin(b) * f + z);
  };
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    let lo = 0, hi = 0;
    lo += per(x, y, 1.0, 0) * 0.55 + per(x, y, 2.1, 3) * 0.3 + per(x, y, 4.3, 5) * 0.15;
    hi += per(x, y, 6.0, 11) * 0.6 + per(x, y, 12.5, 13) * 0.4;
    const i = (y * N + x) * 4;
    data[i] = Math.round(Math.min(255, Math.max(0, (lo * 0.5 + 0.5) * 255)));
    data[i + 1] = Math.round(Math.min(255, Math.max(0, (hi * 0.5 + 0.5) * 255)));
    data[i + 2] = 0; data[i + 3] = 255;
  }
  const t = new THREE.DataTexture(data, N, N, THREE.RGBAFormat);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter;
  t.generateMipmaps = true;
  t.needsUpdate = true;
  return t;
}
function puffs(U, max) {
  const g = new THREE.InstancedBufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0]), 3));
  g.setIndex([0, 1, 2, 0, 2, 3]);
  const a = {
    p: new THREE.InstancedBufferAttribute(new Float32Array(max * 3), 3),
    s: new THREE.InstancedBufferAttribute(new Float32Array(max * 4), 4),
    l: new THREE.InstancedBufferAttribute(new Float32Array(max * 4), 4),
  };
  Object.values(a).forEach(x => x.setUsage(THREE.DynamicDrawUsage));
  g.setAttribute('iP', a.p); g.setAttribute('iS', a.s); g.setAttribute('iL', a.l);
  g.instanceCount = 0;
  const mat = new THREE.ShaderMaterial({
    uniforms: { ...U, uNoise: { value: noiseTexture() }, uTime: { value: 0 } },
    transparent: true, depthWrite: false,
    blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
    vertexShader: /* glsl */`
      uniform vec3 uLight;
      attribute vec3 iP; attribute vec4 iS; attribute vec4 iL;
      varying vec2 vQ; varying vec2 vUv; varying vec4 vS; varying vec4 vL; varying vec3 vW; varying vec2 vTo;
      void main() {
        vec3 right = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
        vec3 up = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
        vQ = position.xy;
        float c = cos(iS.y), s = sin(iS.y);
        vUv = vec2(c * vQ.x - s * vQ.y, s * vQ.x + c * vQ.y) * 0.5;
        vW = iP + (right * vQ.x + up * vQ.y) * iS.x;
        // The light's side of the puff, in the puff's screen frame.
        vec3 tl = uLight - iP;
        vTo = normalize(vec2(dot(tl, right), dot(tl, up)) + 1e-4);
        vS = iS; vL = iL;
        gl_Position = projectionMatrix * viewMatrix * vec4(vW, 1.0);
      }`,
    fragmentShader: /* glsl */`
      ${HAZE}
      uniform sampler2D uNoise;
      varying vec2 vQ; varying vec2 vUv; varying vec4 vS; varying vec4 vL; varying vec3 vW; varying vec2 vTo;
      void main() {
        float r2 = dot(vQ, vQ);
        if (r2 > 1.0) discard;
        vec2 o = vec2(vL.w * 7.31, vL.w * 3.17);
        float lo = texture2D(uNoise, vUv * 0.9 + o).r;
        float hi = texture2D(uNoise, vUv * 2.6 + o.yx).g;
        float n = lo * 0.65 + hi * 0.35;
        float steam = vS.w;
        // Billows: the noise cuts the outline and shapes the body.
        float mask = 1.0 - smoothstep(0.0, 1.0, r2 + (0.5 - n) * 2.2);
        float dens = clamp(mask * (0.65 + (n - 0.5) * 2.4), 0.0, 1.0) * vS.z * 0.8;
        if (dens < 0.003) discard;
        // Lit toward the light; thin edges let more through.
        float facing = dot(vQ, vTo);
        float side = smoothstep(-0.9, 0.9, facing) * 0.75 + 0.25;
        float thin = 1.0 - dens * 0.6;
        vec3 alb = mix(vec3(0.19, 0.175, 0.165), vec3(0.55, 0.55, 0.58), steam);
        // Sky light falls on the billow tops; the afterglow lines the thin edges.
        float top = smoothstep(-0.2, 0.9, vQ.y + (n - 0.5));
        vec3 lit = vec3(0.04, 0.048, 0.08) * (0.35 + 0.9 * top) + vec3(0.02, 0.012, 0.01) * steam;
        lit += vec3(0.16, 0.08, 0.06) * thin * thin * 0.6;
        lit += FIRE * vL.x * side * (0.6 + 0.6 * thin);
        lit += BOLT * vL.y * (0.55 + 0.45 * thin);
        vec3 col = alb * lit * (0.55 + 0.9 * n);
        // The jet's own heat: the core near the vent glows.
        col += FIRE * vL.z * dens * smoothstep(0.35, 0.8, n) * 0.6;
        col = haze(col, vW);
        gl_FragColor = vec4(col * dens, dens);
      }`,
  });
  const m = new THREE.Mesh(g, mat);
  m.renderOrder = 3;
  m.frustumCulled = false;
  return { mesh: m, g, a, mat };
}

/* ---------- glowing streaks: spatter, bombs, bolts ---------- */
function streaks(max) {
  const g = new THREE.InstancedBufferGeometry();
  // x runs along the streak, y across it.
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, -1, 0, 1, -1, 0, 1, 1, 0, 0, 1, 0]), 3));
  g.setIndex([0, 1, 2, 0, 2, 3]);
  const a = {
    a: new THREE.InstancedBufferAttribute(new Float32Array(max * 3), 3),
    b: new THREE.InstancedBufferAttribute(new Float32Array(max * 3), 3),
    d: new THREE.InstancedBufferAttribute(new Float32Array(max * 4), 4),
  };
  Object.values(a).forEach(x => x.setUsage(THREE.DynamicDrawUsage));
  g.setAttribute('iA', a.a); g.setAttribute('iB', a.b); g.setAttribute('iD', a.d);
  g.instanceCount = 0;
  const mat = new THREE.ShaderMaterial({
    uniforms: { uRes: { value: new THREE.Vector2(1, 1) }, uMinPx: { value: 1.3 } },
    transparent: true, depthWrite: false,
    blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor,
    vertexShader: /* glsl */`
      uniform vec2 uRes; uniform float uMinPx;
      attribute vec3 iA; attribute vec3 iB; attribute vec4 iD;
      varying float vX; varying float vY; varying vec4 vD; varying float vK;
      void main() {
        vec4 a = projectionMatrix * viewMatrix * vec4(iA, 1.0);
        vec4 b = projectionMatrix * viewMatrix * vec4(iB, 1.0);
        if (a.w < 1.0 || b.w < 1.0) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
        vec2 h = 0.5 * uRes;
        vec2 sa = a.xy / a.w * h, sb = b.xy / b.w * h;
        // Width in pixels from the size in metres, never under the floor.
        float w = max(iD.y * h.y * projectionMatrix[1][1] / a.w, uMinPx);
        vec2 d = sb - sa;
        float L = length(d);
        vec2 dir = L > 1e-3 ? d / L : vec2(0.0, 1.0);
        vec2 nrm = vec2(-dir.y, dir.x);
        vec2 p = mix(sa - dir * w * 0.5, sb + dir * w * 0.5, position.x) + nrm * position.y * w * 0.5;
        float z = mix(a.z / a.w, b.z / b.w, position.x);
        gl_Position = vec4(p / h, z, 1.0);
        vX = position.x; vY = position.y; vD = iD;
        // A long streak spreads its light, so it dims a little.
        vK = mix(1.0, w / (L + w), 0.45);
        // The width floor keeps tiny sparks bright enough but no brighter.
        vK *= min(1.0, iD.y * h.y * projectionMatrix[1][1] / a.w / uMinPx + 0.25);
      }`,
    fragmentShader: /* glsl */`
      varying float vX; varying float vY; varying vec4 vD; varying float vK;
      vec3 blackbody(float t) {
        vec3 c = vec3(0.9, 0.08, 0.01) * smoothstep(0.0, 0.3, t);
        c = mix(c, vec3(1.0, 0.36, 0.05), smoothstep(0.25, 0.6, t));
        c = mix(c, vec3(1.0, 0.72, 0.36), smoothstep(0.6, 0.95, t));
        return c * (0.05 + 7.0 * pow(t, 2.4));
      }
      void main() {
        float g = exp(-vY * vY * 3.2);
        vec3 c = vD.w > 0.5 ? vec3(0.78, 0.82, 1.0) * vD.x : blackbody(vD.x);
        // The head of a falling streak is the hot end.
        float head = vD.w > 0.5 ? 1.0 : mix(0.55, 1.0, vX);
        gl_FragColor = vec4(c * g * vD.z * vK * head, 0.0);
      }`,
  });
  const m = new THREE.Mesh(g, mat);
  m.renderOrder = 4;
  m.frustumCulled = false;
  return { mesh: m, g, a, mat };
}

export function buildScene({ maxSparks, maxPuffs, maxSegs }) {
  const scene = new THREE.Scene();
  const U = makeUniforms();
  const s = sky(U), t = terrain(U), h = halo(U);
  const p = puffs(U, maxPuffs), k = streaks(maxSparks + maxSegs);
  scene.add(s, t.mesh, h, p.mesh, k.mesh);
  return { scene, U, sky: s, terrain: t, halo: h, puffs: p, streaks: k };
}
