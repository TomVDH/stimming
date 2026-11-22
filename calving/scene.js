// Calving scene: sky, land, the ice face, the water with its mirror, brash ice, blocks and spray.
// Each object has its own small ShaderMaterial, so each program links fast on D3D11.
import * as THREE from 'three';
import { land, wallL, faceZ, faceN, faceTop, faceDepth, topStrip, FACE_X0, FACE_X1, FACE_DX, FACE_ROWS, TOP_BACK, rng } from './land.js';

export const MAX_WAVES = 8;
// The surge: a long wave in deep water. Speed is sqrt(g h) for h near 110 m.
export const WAVE_C = 33, WAVE_L = 130;

/* ---------- shared uniforms ---------- */
export function makeUniforms() {
  return {
    uCam: { value: new THREE.Vector3() },
    uTime: { value: 0 },
    uAmbT: { value: 0 },
    uSun: { value: new THREE.Vector3(-0.55, 0.2, -0.81).normalize() },
    uSunCol: { value: new THREE.Color(2.6, 1.55, 0.86) },
    uZen: { value: new THREE.Color(0.075, 0.13, 0.27) },
    uHor: { value: new THREE.Color(0.22, 0.26, 0.34) },
    uGlow: { value: new THREE.Color(0.85, 0.42, 0.18) },
    uAmb: { value: new THREE.Color(0.12, 0.165, 0.25) },
    uWave: { value: Array.from({ length: MAX_WAVES }, () => new THREE.Vector4(0, 0, 0, 0)) },
    uFoam: { value: Array.from({ length: MAX_WAVES }, () => new THREE.Vector4(0, 0, 0, 0)) },
    uCrack: { value: new THREE.Vector4(0, 0, 0, 0) },
    uCrackP: { value: new THREE.Vector4(0, 0, 0, 0) },
  };
}

// Sky colour, haze and the light on ice. Every material splices this text.
const COMMON = /* glsl */`
uniform vec3 uCam, uSun, uSunCol, uZen, uHor, uGlow, uAmb;
uniform float uTime, uAmbT;
float hash12(vec2 p) { vec3 q = fract(vec3(p.xyx) * 0.1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash12(i), hash12(i + vec2(1, 0)), u.x), mix(hash12(i + vec2(0, 1)), hash12(i + vec2(1, 1)), u.x), u.y);
}
float fbm(vec2 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { s += a * vnoise(p); p = p * 2.03 + 17.1; a *= 0.5; } return s; }
// How much the low sun lies along a direction, by azimuth only.
float toSun(vec3 d) { return dot(normalize(d.xz + 1e-5), normalize(uSun.xz)) * 0.5 + 0.5; }
vec3 fogCol(vec3 d) {
  float e = max(d.y, 0.0);
  float az = toSun(d);
  vec3 c = mix(uHor, uZen, smoothstep(0.0, 0.7, e) * 0.6);
  c += uGlow * pow(az, 6.0) * exp(-e * 6.0) * 0.45;
  c += uSunCol * pow(max(dot(d, uSun), 0.0), 24.0) * 0.12;
  return c;
}
vec3 haze(vec3 col, vec3 wp) {
  vec3 dv = wp - uCam;
  float dist = length(dv);
  vec3 dir = dv / dist;
  float f = 1.0 - exp(-dist * 0.00007);
  // A low haze lies on the fjord; it thins with height.
  float low = (1.0 - exp(-dist * 0.0004)) * exp(-max(wp.y, 0.0) / 140.0);
  return mix(col, fogCol(dir), clamp(f + 0.3 * low, 0.0, 1.0));
}
// Light on snow and ice: the sky from above, the sun low, a glow through thin edges.
vec3 iceLight(vec3 wp, vec3 n, vec3 alb, float thin) {
  vec3 v = normalize(uCam - wp);
  float ndl = dot(n, uSun);
  // Sky light: blue from overhead, paler from the horizon behind the camera.
  vec3 sky = mix(uHor * 0.55, uAmb, n.y * 0.5 + 0.5) * (0.75 + 0.25 * max(n.z, 0.0));
  vec3 c = alb * (sky + uSunCol * max(ndl, 0.0) * 0.95);
  // Wrap light: ice scatters the sun a little past the terminator.
  c += alb * vec3(0.25, 0.55, 0.8) * uSunCol * smoothstep(-0.35, 0.1, ndl) * 0.05;
  // Translucency: thin ice glows blue when the sun stands behind it.
  float back = pow(max(dot(-v, uSun), 0.0), 3.0);
  c += vec3(0.25, 0.6, 0.75) * uSunCol * back * thin * 0.7;
  vec3 h = normalize(v + uSun);
  c += uSunCol * pow(max(dot(n, h), 0.0), 80.0) * 0.2 * step(0.0, ndl);
  return c;
}
`;

// The surge on the water: the same sum runs on the CPU in waveAt().
const WAVES = /* glsl */`
uniform vec4 uWave[${MAX_WAVES}];
uniform vec4 uFoam[${MAX_WAVES}];
const float WC = ${WAVE_C.toFixed(1)}, WL = ${WAVE_L.toFixed(1)};
float waveH(vec2 p, out vec2 g) {
  float h = 0.0; g = vec2(0.0);
  for (int i = 0; i < ${MAX_WAVES}; i++) {
    vec4 w = uWave[i];
    float tau = uTime - w.z;
    if (w.w <= 0.0 || tau <= 0.0) continue;
    vec2 d = p - w.xy;
    float r = length(d) + 0.01;
    float s = r - WC * tau;
    float env = smoothstep(WL * 0.3, -WL * 0.2, s) * exp(min(s, 0.0) / (WL * 1.6));
    float A = w.w * sqrt(60.0 / (r + 60.0)) * exp(-tau / 80.0) * smoothstep(0.0, 1.5, tau);
    float ph = 6.2831853 * s / WL;
    h -= A * env * sin(ph);
    g -= A * env * cos(ph) * (6.2831853 / WL) * d / r;
  }
  return h;
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
      ${COMMON}
      varying vec3 vW;
      void main() {
        vec3 d = normalize(vW - uCam);
        float e = max(d.y, 0.0);
        float az = toSun(d);
        float s = max(dot(d, uSun), 0.0);
        vec3 c = mix(uHor, uZen, pow(smoothstep(0.0, 0.75, e), 0.7));
        c += uGlow * pow(az, 3.0) * exp(-e * 7.0);
        c += uSunCol * (pow(s, 1500.0) * 12.0 + pow(s, 90.0) * 0.25 + pow(s, 12.0) * 0.08);
        // High thin cloud, lit warm on the sun side.
        vec2 q = d.xz / (e + 0.08);
        float cl = fbm(q * vec2(0.9, 2.6) + vec2(3.0, 0.0));
        cl = smoothstep(0.5, 0.85, cl) * smoothstep(0.02, 0.18, e) * (1.0 - smoothstep(0.5, 0.9, e));
        vec3 cc = mix(uHor * 1.1, uGlow * 1.6 + uSunCol * 0.2, pow(az, 2.0));
        c = mix(c, cc, cl * 0.55);
        gl_FragColor = vec4(c, 1.0);
      }`,
  });
  const m = new THREE.Mesh(new THREE.SphereGeometry(20000, 48, 24), mat);
  m.frustumCulled = false;
  m.renderOrder = -1;
  return m;
}

/* ---------- land ---------- */
// A fan of rings from the camera: fine at the walls, coarse at the far range.
function landGeometry(segs = 440, rings = 360, a0 = -1.05, a1 = 1.05, r0 = 120, r1 = 16000) {
  const n = segs * rings;
  const pos = new Float32Array(n * 3), kind = new Float32Array(n);
  for (let i = 0; i < rings; i++) {
    const r = r0 * Math.pow(r1 / r0, i / (rings - 1));
    for (let j = 0; j < segs; j++) {
      const a = a0 + (a1 - a0) * (j / (segs - 1));
      const x = Math.sin(a) * r, z = -Math.cos(a) * r;
      const L = land(x, z), k = i * segs + j;
      pos[k * 3] = x; pos[k * 3 + 1] = L.h; pos[k * 3 + 2] = z;
      kind[k] = L.kind;
    }
  }
  const idx = [];
  for (let i = 0; i < rings - 1; i++) for (let j = 0; j < segs - 1; j++) {
    const a = i * segs + j, b = a + 1, c = a + segs, d = c + 1;
    idx.push(a, b, c, b, d, c);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('aKind', new THREE.BufferAttribute(kind, 1));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}
function landMesh(U) {
  const mat = new THREE.ShaderMaterial({
    uniforms: U,
    vertexShader: /* glsl */`
      attribute float aKind;
      varying vec3 vW, vN; varying float vK;
      void main() { vW = position; vN = normal; vK = aKind; gl_Position = projectionMatrix * viewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */`
      ${COMMON}
      varying vec3 vW, vN; varying float vK;
      // Rock texture: slopes of a noise bend the normal.
      vec3 bump(vec3 n, vec3 p) {
        vec2 q = vec2(p.x + p.z * 0.6, p.y) * 0.09;
        float a = fbm(q), e = 0.05;
        vec2 g = vec2(fbm(q + vec2(e, 0.0)) - a, fbm(q + vec2(0.0, e)) - a) / e;
        vec3 t = normalize(cross(n, vec3(0.0, 1.0, 0.0)) + 1e-4);
        vec3 b = normalize(cross(t, n));
        return normalize(n + (t * g.x + b * g.y) * 0.55 * smoothstep(3000.0, 600.0, length(p - uCam)));
      }
      void main() {
        vec3 n = bump(normalize(vN), vW);
        // Dark wet rock; snow holds on the gentler ledges high up.
        float g = fbm(vW.xz * 0.012) ;
        vec3 rockC = mix(vec3(0.035, 0.034, 0.036), vec3(0.07, 0.066, 0.062), g);
        float fine = fbm(vW.xz * 0.05 + vW.y * 0.03);
        float snow = smoothstep(0.7, 0.85, n.y + 0.3 * (fine - 0.5)) * smoothstep(250.0, 600.0, vW.y + 200.0 * g);
        snow = max(snow, smoothstep(700.0, 1100.0, vW.y + 300.0 * g) * smoothstep(0.45, 0.7, n.y + 0.3 * (fine - 0.5)));
        vec3 alb = mix(rockC, vec3(0.82, 0.86, 0.92), snow);
        // The glacier: white firn, grey with dust in its stripes.
        if (vK > 0.5 && vK < 1.5) {
          float st = smoothstep(0.55, 0.7, fbm(vec2(vW.x * 0.01, vW.z * 0.0015)));
          alb = mix(vec3(0.78, 0.82, 0.88), vec3(0.42, 0.44, 0.46), st * 0.6);
          alb *= 0.85 + 0.15 * vnoise(vW.xz * 0.08);
        }
        vec3 c = iceLight(vW, n, alb, 0.0);
        gl_FragColor = vec4(haze(c, vW), 1.0);
      }`,
  });
  return new THREE.Mesh(landGeometry(), mat);
}

/* ---------- the ice face ---------- */
// The face is one grid: columns along the line, rows up the face and back over its top.
export function faceGrid() {
  const NX = Math.round((FACE_X1 - FACE_X0) / FACE_DX) + 1;
  const NY = FACE_ROWS + 1 + TOP_BACK.length;
  const P0 = new Float32Array(NX * NY * 3);
  // Each vertex keeps its column x, its height and its distance behind the front.
  const B = new Float32Array(NX * NY);
  const N = new Float32Array(NX * 2), X = new Float32Array(NX);
  for (let i = 0; i < NX; i++) {
    const x = FACE_X0 + i * FACE_DX, [nx, nz] = faceN(x), z = faceZ(x);
    // Past the left wall the face sinks out of sight inside the rock.
    const top = x < wallL(z) - 2 ? -6 : faceTop(x);
    X[i] = x; N[i * 2] = nx; N[i * 2 + 1] = nz;
    const dTop = faceDepth(x, top) - 1.2;
    for (let j = 0; j < NY; j++) {
      const k = j * NX + i;
      let y, d;
      if (j <= FACE_ROWS) {
        y = -6 + (top + 6) * (j / FACE_ROWS);
        // The top edge breaks back a little.
        d = faceDepth(x, y) - 1.5 * Math.max(0, (y - top + 2.5) / 2.5);
        B[k] = 0;
      } else {
        const b = TOP_BACK[j - FACE_ROWS - 1];
        y = topStrip(x, b, top);
        d = dTop - b;
        B[k] = b;
      }
      P0[k * 3] = x + nx * d; P0[k * 3 + 1] = y; P0[k * 3 + 2] = z + nz * d;
    }
  }
  return { NX, NY, P0, B, N, X };
}
// Grid normals by central differences, for columns i0 to i1.
export function gridNormals(F, P, nrm, i0 = 0, i1 = F.NX - 1) {
  const { NX, NY } = F;
  const v = (i, j, c) => P[(j * NX + i) * 3 + c];
  for (let j = 0; j < NY; j++) for (let i = Math.max(0, i0); i <= Math.min(NX - 1, i1); i++) {
    const ia = Math.max(0, i - 1), ib = Math.min(NX - 1, i + 1), ja = Math.max(0, j - 1), jb = Math.min(NY - 1, j + 1);
    const tx = v(ib, j, 0) - v(ia, j, 0), ty = v(ib, j, 1) - v(ia, j, 1), tz = v(ib, j, 2) - v(ia, j, 2);
    const ux = v(i, jb, 0) - v(i, ja, 0), uy = v(i, jb, 1) - v(i, ja, 1), uz = v(i, jb, 2) - v(i, ja, 2);
    let nx = ty * uz - tz * uy, ny = tz * ux - tx * uz, nz = tx * uy - ty * ux;
    let l = Math.hypot(nx, ny, nz);
    // A collapsed column has no area; give it a level normal.
    if (l < 1e-6) { nx = 0; ny = 1; nz = 0; l = 1; }
    const k = (j * NX + i) * 3;
    nrm[k] = nx / l; nrm[k + 1] = ny / l; nrm[k + 2] = nz / l;
  }
}
// The face and blocks share one shading: weathered white, blue in the grooves, fresh scars bright blue.
const ICE_FS = /* glsl */`
  ${COMMON}
  uniform vec4 uCrack, uCrackP;
  varying vec3 vW, vN; varying vec4 vI; varying float vEdge;
  // The running crack: up both side grooves and across the base.
  float crackLine(float x, float y) {
    if (uCrack.w <= 0.0) return 0.0;
    float side = y > uCrack.z - 0.6 ? min(abs(x - uCrack.x), abs(x - uCrack.y)) : 1e3;
    float base = x > uCrack.x - 0.5 && x < uCrack.y + 0.5 ? abs(y - uCrack.z - 0.8 * sin(x * 0.9) - 0.5 * sin(x * 2.3)) : 1e3;
    float d = min(side, base);
    float reach = uCrackP.z - length(vec2(x, y) - uCrackP.xy);
    return smoothstep(0.75, 0.1, d) * smoothstep(-2.0, 0.0, reach) * uCrack.w;
  }
  void main() {
    vec3 n = normalize(vN);
    if (!gl_FrontFacing) n = -n;
    // vI: column x, height, recess (blue), fresh (scar age, 0 to 1).
    float x = vI.x, y = vI.y;
    float g = fbm(vec2(x * 0.09, y * 0.16));
    float layers = fbm(vec2(x * 0.012, y * 0.35 + 0.8 * fbm(vec2(x * 0.02, y * 0.05))));
    // Weathered face: white to pale grey, with old dust in thin layers.
    vec3 alb = mix(vec3(0.6, 0.63, 0.66), vec3(0.88, 0.9, 0.92), g);
    alb = mix(alb, vec3(0.36, 0.37, 0.38), smoothstep(0.62, 0.72, layers) * 0.55);
    // Thin upright fractures and dirt streaks run down the face.
    float fr = vnoise(vec2(x * 0.55, y * 0.035));
    alb *= 1.0 - 0.45 * smoothstep(0.035, 0.0, abs(fr - 0.5)) * step(0.5, vnoise(vec2(x * 0.2, y * 0.08)));
    alb *= 0.88 + 0.12 * vnoise(vec2(x * 1.3, y * 0.05));
    // Blue ice shows where the face sits back and in the grooves.
    float blue = clamp(vI.z, 0.0, 1.0);
    alb = mix(alb, vec3(0.24, 0.5, 0.68), blue * 0.6);
    // A fresh scar: clean, deep blue, fading to white over minutes.
    alb = mix(alb, mix(vec3(0.12, 0.42, 0.68), vec3(0.32, 0.62, 0.8), g), vI.w);
    // A band of dirty ice at the waterline, and the wet dark notch.
    alb = mix(alb, vec3(0.18, 0.19, 0.2), smoothstep(9.0, 2.0, y + 3.0 * g) * 0.55 * (1.0 - vI.w));
    alb *= mix(0.55, 1.0, smoothstep(-0.5, 2.0, y));
    // Only the thin top edge lets the sun through.
    float thin = vEdge * (0.6 + 0.4 * blue);
    float cl = crackLine(x, y);
    alb *= 1.0 - 0.8 * cl;
    thin *= 1.0 - cl;
    vec3 c = iceLight(vW, n, alb, thin);
    gl_FragColor = vec4(haze(c, vW), 1.0);
  }`;
function faceMesh(U, F) {
  const { NX, NY, P0 } = F;
  const g = new THREE.BufferGeometry();
  const pos = new THREE.BufferAttribute(P0.slice(), 3);
  pos.setUsage(THREE.DynamicDrawUsage);
  const nrm = new THREE.BufferAttribute(new Float32Array(NX * NY * 3), 3);
  nrm.setUsage(THREE.DynamicDrawUsage);
  gridNormals(F, pos.array, nrm.array);
  // aI: column x, height, recess blue, scar birth time.
  const I = new Float32Array(NX * NY * 4);
  for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) {
    const k = j * NX + i, x = F.X[i];
    const y = P0[k * 3 + 1];
    const d = j <= FACE_ROWS ? faceDepth(x, y) : -3;
    I[k * 4] = x; I[k * 4 + 1] = y; I[k * 4 + 2] = Math.max(0, Math.min(1, (-d - 1) / 5)); I[k * 4 + 3] = -1e6;
  }
  const ia = new THREE.BufferAttribute(I, 4);
  ia.setUsage(THREE.DynamicDrawUsage);
  g.setAttribute('position', pos);
  g.setAttribute('normal', nrm);
  g.setAttribute('aI', ia);
  // aEdge: 1 on the thin crest of each column, 0 below it.
  const E = new Float32Array(NX * NY);
  for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) {
    const k = j * NX + i, top = P0[(FACE_ROWS * NX + i) * 3 + 1];
    E[k] = j <= FACE_ROWS ? Math.exp(-Math.max(0, top - P0[k * 3 + 1]) / 2.5) : Math.exp(-F.B[k] / 3);
  }
  g.setAttribute('aEdge', new THREE.BufferAttribute(E, 1));
  const idx = new Uint32Array((NX - 1) * (NY - 1) * 6);
  let q = 0;
  for (let j = 0; j < NY - 1; j++) for (let i = 0; i < NX - 1; i++) {
    const a = j * NX + i, b = a + 1, c = a + NX, d = c + 1;
    idx[q++] = a; idx[q++] = b; idx[q++] = c; idx[q++] = b; idx[q++] = d; idx[q++] = c;
  }
  g.setIndex(new THREE.BufferAttribute(idx, 1));
  g.computeBoundingSphere();
  const mat = new THREE.ShaderMaterial({ uniforms: U, vertexShader: ICE_VS, fragmentShader: ICE_FS });
  return new THREE.Mesh(g, mat);
}
// The ice vertex shader serves the face and the falling blocks.
const ICE_VS = /* glsl */`
  attribute vec4 aI;
  attribute float aEdge;
  uniform float uTime;
  varying vec3 vW, vN; varying vec4 vI; varying float vEdge;
  void main() {
    vec4 w = modelMatrix * vec4(position, 1.0);
    vW = w.xyz;
    vN = normalize(mat3(modelMatrix) * normal);
    // A scar stays blue for a minute, then pales over three more.
    vI = vec4(aI.xyz, aI.w > -1e5 ? 1.0 - smoothstep(60.0, 240.0, uTime - aI.w) : 0.0);
    vEdge = aEdge;
    gl_Position = projectionMatrix * viewMatrix * w;
  }`;
export function iceMaterial(U) {
  return new THREE.ShaderMaterial({ uniforms: U, vertexShader: ICE_VS, fragmentShader: ICE_FS, side: THREE.DoubleSide });
}

/* ---------- water ---------- */
// A fan of rings round the camera; the surge lifts it in the vertex shader.
function waterGeometry(segs = 220, rings = 340, a0 = -1.5, a1 = 1.5, r0 = 0.6, r1 = 15000) {
  const pos = new Float32Array(segs * rings * 3);
  for (let i = 0; i < rings; i++) {
    const r = r0 * Math.pow(r1 / r0, i / (rings - 1));
    for (let j = 0; j < segs; j++) {
      const a = a0 + (a1 - a0) * (j / (segs - 1)), k = (i * segs + j) * 3;
      pos[k] = Math.sin(a) * r; pos[k + 1] = 0; pos[k + 2] = -Math.cos(a) * r;
    }
  }
  const idx = [];
  for (let i = 0; i < rings - 1; i++) for (let j = 0; j < segs - 1; j++) {
    const a = i * segs + j, b = a + 1, c = a + segs, d = c + 1;
    idx.push(a, b, c, b, d, c);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setIndex(idx);
  return g;
}
function waterMesh(U, mirror) {
  const mat = new THREE.ShaderMaterial({
    uniforms: { ...U, tMirror: { value: mirror.texture }, uMirrorM: { value: mirror.matrix }, uOrigin: { value: new THREE.Vector2() } },
    vertexShader: /* glsl */`
      ${COMMON}
      ${WAVES}
      uniform vec2 uOrigin;
      uniform mat4 uMirrorM;
      varying vec3 vW; varying vec4 vM;
      void main() {
        vec3 p = position + vec3(uOrigin.x, 0.0, uOrigin.y);
        vec2 g;
        p.y = waveH(p.xz, g);
        vW = p;
        vM = uMirrorM * vec4(p.x, 0.0, p.z, 1.0);
        gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
      }`,
    fragmentShader: /* glsl */`
      ${COMMON}
      ${WAVES}
      uniform sampler2D tMirror;
      varying vec3 vW; varying vec4 vM;
      // Ripples: two drifting layers of slopes from a value noise.
      vec2 ripple(vec2 p, float t) {
        vec2 e = vec2(0.02, 0.0);
        vec2 q1 = p * 0.35 + vec2(t * 0.05, t * 0.03);
        vec2 q2 = p * vec2(0.9, 1.4) - vec2(t * 0.07, -t * 0.02);
        float a = vnoise(q1), b = vnoise(q2);
        vec2 g1 = vec2(vnoise(q1 + e.xy) - a, vnoise(q1 + e.yx) - a) / e.x;
        vec2 g2 = vec2(vnoise(q2 + e.xy) - b, vnoise(q2 + e.yx) - b) / e.x;
        return g1 * 0.035 + g2 * 0.02;
      }
      void main() {
        vec2 g;
        float h = waveH(vW.xz, g);
        float dist = length(vW - uCam);
        // Ripples fade with distance, so far water stays a calm mirror.
        float fadeR = exp(-dist / 260.0);
        vec2 rg = ripple(vW.xz, uAmbT) * (0.25 + 0.75 * fadeR);
        vec3 n = normalize(vec3(-g.x - rg.x, 1.0, -g.y - rg.y));
        vec3 v = normalize(uCam - vW);
        float cosT = max(dot(n, v), 0.0);
        float F = 0.02 + 0.98 * pow(1.0 - cosT, 5.0);
        // The mirror, bent by the slope of the water.
        vec2 uv = vM.xy / vM.w;
        uv += n.xz * vec2(0.6, 1.0) * 0.18 / (1.0 + dist * 0.004);
        vec3 refl = texture2D(tMirror, uv).rgb;
        // Black-green water; a little sky light comes up from below.
        vec3 body = vec3(0.004, 0.014, 0.012) + uAmb * vec3(0.02, 0.05, 0.045);
        vec3 c = mix(body, refl, F);
        // Foam where blocks hit: churned white that thins into streaks.
        float foam = 0.0;
        for (int i = 0; i < ${MAX_WAVES}; i++) {
          vec4 f = uFoam[i];
          float tau = uTime - f.z;
          if (f.w <= 0.0 || tau <= 0.0) continue;
          float r = length(vW.xz - f.xy);
          float R = f.w * (14.0 + 26.0 * (1.0 - exp(-tau / 7.0))) + 2.0 * tau;
          float k = 1.0 - smoothstep(R * 0.45, R, r);
          float tex = fbm(vW.xz * 0.06 + f.xy * 0.01 + tau * 0.02);
          float thin = exp(-tau / 35.0);
          foam += k * smoothstep(1.0 - thin, 1.15 - thin * 0.6, tex + 0.35 * thin);
        }
        foam = clamp(foam, 0.0, 1.0);
        vec3 fc = iceLight(vW, vec3(0.0, 1.0, 0.0), vec3(0.75, 0.8, 0.82), 0.0);
        c = mix(c, fc, foam * 0.85);
        gl_FragColor = vec4(haze(c, vW), 1.0);
      }`,
  });
  const m = new THREE.Mesh(waterGeometry(), mat);
  m.frustumCulled = false;
  return m;
}

/* ---------- the mirror ---------- */
// A planar mirror at y = 0, after the Reflector example in three.js.
function makeMirror() {
  const rt = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType });
  const cam = new THREE.PerspectiveCamera();
  cam.matrixAutoUpdate = true;
  const matrix = new THREE.Matrix4();
  const plane = new THREE.Plane(), clip = new THREE.Vector4(), q = new THREE.Vector4();
  const v = new THREE.Vector3(), t = new THREE.Vector3(), look = new THREE.Vector3();
  function update(camera) {
    cam.copy(camera);
    // Reflect the eye and the aim through y = 0.
    v.copy(camera.position); v.y = -v.y;
    camera.getWorldDirection(look);
    t.copy(camera.position).add(look); t.y = -t.y;
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion); up.y = -up.y;
    cam.position.copy(v); cam.up.copy(up); cam.lookAt(t);
    cam.updateMatrixWorld();
    cam.projectionMatrix.copy(camera.projectionMatrix);
    matrix.set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1);
    matrix.multiply(cam.projectionMatrix).multiply(cam.matrixWorldInverse);
    // An oblique near plane clips all below the water.
    plane.setFromNormalAndCoplanarPoint(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, -0.4, 0));
    plane.applyMatrix4(cam.matrixWorldInverse);
    clip.set(plane.normal.x, plane.normal.y, plane.normal.z, plane.constant);
    const P = cam.projectionMatrix.elements;
    q.x = (Math.sign(clip.x) + P[8]) / P[0];
    q.y = (Math.sign(clip.y) + P[9]) / P[5];
    q.z = -1.0;
    q.w = (1.0 + P[10]) / P[14];
    clip.multiplyScalar(2.0 / clip.dot(q));
    P[2] = clip.x; P[6] = clip.y; P[10] = clip.z + 1.0; P[14] = clip.w;
  }
  return { rt, cam, matrix, texture: rt.texture, update };
}

/* ---------- brash ice ---------- */
// One lumpy chunk, flattened; each instance scales and turns it.
export function chunkGeometry(seed, detail = 1) {
  const g = new THREE.IcosahedronGeometry(1, detail);
  const p = g.attributes.position, R = rng(seed);
  const ph = [R() * 9, R() * 9, R() * 9, R() * 9];
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    // Lumps and a few broken facets; a worn floe is round, not sharp.
    const k = 1 + 0.22 * Math.sin(x * 2.1 + ph[0]) * Math.sin(z * 1.7 + ph[1]) + 0.12 * Math.sin(y * 3.3 + ph[2]) + 0.08 * Math.sin((x + z) * 5.1 + ph[3]);
    p.setXYZ(i, x * k, Math.min(y * k, 0.62 + 0.1 * Math.sin(x * 3.0 + ph[3])), z * k);
  }
  g.computeVertexNormals();
  return g;
}
function brashMesh(U, count) {
  const mat = new THREE.ShaderMaterial({
    uniforms: U,
    vertexShader: /* glsl */`
      attribute float aShade;
      varying vec3 vW, vN; varying float vS;
      void main() {
        vec4 w = modelMatrix * instanceMatrix * vec4(position, 1.0);
        vW = w.xyz;
        vN = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * normal);
        vS = aShade;
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: /* glsl */`
      ${COMMON}
      varying vec3 vW, vN; varying float vS;
      void main() {
        vec3 n = normalize(vN);
        // Old floes are white; some are clear blue ice, some carry dirt.
        vec3 alb = mix(vec3(0.82, 0.86, 0.9), vec3(0.3, 0.6, 0.78), smoothstep(0.65, 0.9, vS));
        alb = mix(alb, vec3(0.3, 0.3, 0.3), smoothstep(0.15, 0.0, vS) * 0.6);
        // Below the line the water tints the ice aquamarine.
        alb = mix(alb, vec3(0.2, 0.45, 0.45), smoothstep(0.0, -0.3, vW.y) * 0.4);
        vec3 c = iceLight(vW, n, alb, 0.3);
        gl_FragColor = vec4(haze(c, vW), 1.0);
      }`,
  });
  const geo = chunkGeometry(11, 2);
  const shade = new Float32Array(count);
  const R = rng(77);
  for (let i = 0; i < count; i++) shade[i] = R();
  geo.setAttribute('aShade', new THREE.InstancedBufferAttribute(shade, 1));
  const m = new THREE.InstancedMesh(geo, mat, count);
  m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  m.frustumCulled = false;
  return m;
}

/* ---------- spray, mist and ice dust ---------- */
// Soft sprites, sorted far to near and blended in premultiplied alpha.
function puffMesh(U, max) {
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
    uniforms: U, transparent: true, depthWrite: false,
    blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
    vertexShader: /* glsl */`
      attribute vec3 iP; attribute vec4 iS, iL;
      varying vec2 vQ; varying vec4 vS, vL; varying vec3 vW;
      void main() {
        // iS: radius, turn, density, kind. iL: sunlit, seed, stretch, unused.
        float c = cos(iS.y), s = sin(iS.y);
        vec2 q = mat2(c, s, -s, c) * position.xy;
        vQ = position.xy; vS = iS; vL = iL;
        vec4 mv = viewMatrix * vec4(iP, 1.0);
        mv.xy += q * iS.x * vec2(1.0, 1.0 + iL.z);
        vW = iP;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */`
      ${COMMON}
      varying vec2 vQ; varying vec4 vS, vL; varying vec3 vW;
      void main() {
        float r2 = dot(vQ, vQ);
        if (r2 > 1.0) discard;
        float n = fbm(vQ * 2.2 + vL.y * 9.0);
        float m = fbm(vQ * 5.5 - vL.y * 3.0);
        float body = exp(-r2 * 3.2);
        float k = vS.w;
        float a;
        // Splash and the base roll billow with hard edges; mist and dust stay soft.
        if (k < 0.5) a = smoothstep(0.05, 0.55, body * (0.45 + 1.0 * n) - 0.12 * m);
        else if (k > 3.5) a = smoothstep(0.05, 0.7, body * (0.5 + 0.9 * n) - 0.08 * m);
        else if (k < 2.5) a = body * (0.35 + 0.85 * n) * 0.75;
        else a = smoothstep(1.0, 0.3, length(vQ * vec2(3.0, 1.0))) * 0.8;
        a *= vS.z;
        if (a < 0.003) discard;
        vec3 v = normalize(uCam - vW);
        // Spray scatters forward: it glows where the sun stands behind it.
        float mu = dot(-v, uSun);
        float hg = min(2.0, (1.0 - 0.36) / pow(1.0 + 0.36 - 1.2 * mu, 1.5));
        // Lit from the sky above; the lower side of a billow is darker.
        vec3 shade = mix(uHor * 0.55, uAmb, 0.7) * (k < 0.5 || k > 2.5 ? 2.0 : 1.45) * (0.68 + 0.32 * (vQ.y * 0.5 + 0.5)) * (0.8 + 0.4 * n);
        vec3 lit = shade + uSunCol * vL.x * (0.12 + 0.22 * hg) * (0.7 + 0.3 * m);
        vec3 tint = k > 1.5 && k < 2.5 ? vec3(0.88, 0.93, 1.0) : vec3(0.93, 0.97, 0.97);
        vec3 c = haze(lit * tint, vW);
        gl_FragColor = vec4(c * a, a);
      }`,
  });
  const m = new THREE.Mesh(g, mat);
  m.frustumCulled = false;
  m.renderOrder = 10;
  return { mesh: m, g, a };
}

/* ---------- the whole scene ---------- */
export function buildScene({ brash = 260, maxPuffs = 900, maxChips = 160 } = {}) {
  const U = makeUniforms();
  const scene = new THREE.Scene();
  const F = faceGrid();
  const mirror = makeMirror();
  const S = {
    scene, U, F, mirror,
    sky: sky(U),
    land: landMesh(U),
    face: faceMesh(U, F),
    water: waterMesh(U, mirror),
    brash: brashMesh(U, brash),
    chips: brashMesh(U, maxChips),
    puffs: puffMesh(U, maxPuffs),
    blocks: new THREE.Group(),
    iceMat: iceMaterial(U),
  };
  scene.add(S.sky, S.land, S.face, S.water, S.brash, S.chips, S.blocks, S.puffs.mesh);
  return S;
}
