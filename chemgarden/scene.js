// Chemical garden: the three.js scene. A tank of water glass before a soft lamp.
// The towers are one instanced capsule mesh; the room, liquid and glass are shader planes.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { linFit } from '../shared/stim.js';
import { TANK } from './garden.js';

const W = TANK.w, D = TANK.d, S = TANK.surface, B = TANK.bed;
// The room plane stands this far behind the tank centre.
const ROOM_Z = -1.1;
const lin = (L, C, h) => new THREE.Vector3(...linFit(L, C, h));

// Salt colours, in SALTS order: wall, dense rim, fresh gel, crystal.
// Real colours: copper blue, cobalt violet, nickel green, iron rust.
export const PALETTE = [
  { tint: [0.66, 0.13, 228], deep: [0.36, 0.13, 248], fresh: [0.9, 0.06, 205], gem: [0.6, 0.17, 245], puff: [0.7, 0.12, 225] },
  { tint: [0.52, 0.17, 305], deep: [0.3, 0.14, 295], fresh: [0.8, 0.11, 335], gem: [0.42, 0.15, 355], puff: [0.6, 0.15, 315] },
  { tint: [0.8, 0.13, 148], deep: [0.5, 0.12, 155], fresh: [0.93, 0.07, 130], gem: [0.66, 0.16, 150], puff: [0.82, 0.1, 145] },
  { tint: [0.56, 0.14, 48], deep: [0.3, 0.09, 40], fresh: [0.82, 0.13, 75], gem: [0.36, 0.1, 50], puff: [0.62, 0.13, 60] },
];

// The lamp: a soft glow on the room wall behind the tank.
// Every lit part asks it what lies behind it on the line from the eye.
const LAMP = /* glsl */`
uniform vec3 uLampCol;
uniform vec4 uLamp;
float glowAt(vec2 q) {
  vec2 d = (q - uLamp.xy) / vec2(uLamp.z * 1.5, uLamp.z);
  float r = dot(d, d);
  return uLamp.w * (exp(-r) * 0.92 + 0.08 / (1.0 + r * 4.0));
}
// The glow behind world point p, seen from the eye.
float behind(vec3 p) {
  vec3 e = cameraPosition;
  float k = (${ROOM_Z.toFixed(2)} - e.z) / min(p.z - e.z, -1e-3);
  return glowAt(e.xy + (p.xy - e.xy) * k);
}
`;
// Value noise in 3D: crust on the tube walls.
const NOISE = /* glsl */`
float h31(vec3 p) { p = fract(p * 0.1031); p += dot(p, p.zyx + 31.32); return fract((p.x + p.y) * p.z); }
float vnoise(vec3 p) {
  vec3 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(h31(i), h31(i + vec3(1, 0, 0)), f.x), mix(h31(i + vec3(0, 1, 0)), h31(i + vec3(1, 1, 0)), f.x), f.y),
             mix(mix(h31(i + vec3(0, 0, 1)), h31(i + vec3(1, 0, 1)), f.x), mix(h31(i + vec3(0, 1, 1)), h31(i + vec3(1, 1, 1)), f.x), f.y), f.z);
}
`;

export function createScene(canvas, { onLost } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance' });
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); onLost?.(); });

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(22, 1, 0.1, 30);
  const shared = {
    uLampCol: { value: lin(0.96, 0.025, 85) },
    uLamp: { value: new THREE.Vector4(0.04, 0.56, 0.42, 0.55) },
    uTime: { value: 0 },
  };
  const disposables = [];
  const keep = x => (disposables.push(x), x);
  const mat = (o) => keep(new THREE.ShaderMaterial({ ...o, uniforms: { ...shared, ...(o.uniforms || {}) } }));
  const plane = (w, h) => keep(new THREE.PlaneGeometry(w, h));

  /* ---------- room ---------- */
  // The room wall: dark, with the lamp's soft glow.
  const room = new THREE.Mesh(plane(14, 8), mat({
    depthWrite: false,
    vertexShader: `varying vec3 vW; void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: LAMP + `varying vec3 vW;
      void main() {
        float g = glowAt(vW.xy);
        // The lamp is warm at its heart and cools toward its edge.
        vec3 tint = mix(vec3(0.62, 0.78, 1.0), vec3(1.0), smoothstep(0.05, 0.7, g / uLamp.w));
        vec3 c = uLampCol * tint * g * 0.85 + vec3(0.003, 0.005, 0.011);
        gl_FragColor = vec4(c, 1.0);
      }`,
  }));
  room.position.set(0, 0.6, ROOM_Z);
  room.renderOrder = -10;
  scene.add(room);

  /* ---------- bed ---------- */
  // Pale grit on the tank floor: a thin box, top and front face.
  const bedGeo = keep(new THREE.BoxGeometry(W - 0.01, B, D - 0.01));
  const bed = new THREE.Mesh(bedGeo, mat({
    vertexShader: `varying vec3 vW; varying vec3 vN; void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vN = normal; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: LAMP + NOISE + `varying vec3 vW; varying vec3 vN;
      void main() {
        float n = vnoise(vW * 420.0), m = vnoise(vW * 60.0);
        float g = behind(vW);
        vec3 base = vec3(0.16, 0.16, 0.15) * (0.55 + 0.7 * n) * (0.8 + 0.4 * m);
        // The top catches the lamp at the back; the front face sits in its own shade.
        float top = step(0.5, vN.y);
        float back = smoothstep(${(D / 2).toFixed(3)}, ${(-D / 2).toFixed(3)}, vW.z);
        vec3 c = base * (top * (0.35 + 0.9 * g * (0.3 + back)) + (1.0 - top) * (0.18 + 0.25 * g));
        c += uLampCol * pow(n, 8.0) * g * 0.6 * top;
        gl_FragColor = vec4(c, 1.0);
      }`,
  }));
  bed.position.set(0, B / 2, 0);
  scene.add(bed);

  /* ---------- towers ---------- */
  // One capsule: 8 sides, a body and two half-sphere caps.
  // aRing: (side x, side y, t along the axis, cap offset in radii).
  const SIDES = 8;
  const rings = [[-1, 0], [-0.7071, 0], [0, 0], [0, 1], [0.7071, 1], [1, 1]];
  const ring = [], idx = [];
  for (const [s, t] of rings) {
    const c = Math.sqrt(Math.max(0, 1 - s * s));
    for (let i = 0; i <= SIDES; i++) {
      const a = (i / SIDES) * Math.PI * 2;
      ring.push(Math.cos(a) * c, Math.sin(a) * c, t, s);
    }
  }
  for (let r = 0; r < rings.length - 1; r++) {
    for (let i = 0; i < SIDES; i++) {
      const a = r * (SIDES + 1) + i, b = a + SIDES + 1;
      idx.push(a, b, a + 1, a + 1, b, b + 1);
    }
  }
  const MAX = 9000;
  const capGeo = keep(new THREE.InstancedBufferGeometry());
  capGeo.setAttribute('aRing', new THREE.Float32BufferAttribute(ring, 4));
  capGeo.setIndex(idx);
  const aA = new THREE.InstancedBufferAttribute(new Float32Array(MAX * 4), 4);
  const aB = new THREE.InstancedBufferAttribute(new Float32Array(MAX * 4), 4);
  const aC = new THREE.InstancedBufferAttribute(new Float32Array(MAX * 4), 4);
  for (const a of [aA, aB, aC]) a.setUsage(THREE.DynamicDrawUsage);
  capGeo.setAttribute('aA', aA);
  capGeo.setAttribute('aB', aB);
  capGeo.setAttribute('aC', aC);
  capGeo.instanceCount = 0;
  const pal = k => PALETTE.map(p => lin(...p[k]));
  const towerMat = mat({
    uniforms: { uTint: { value: pal('tint') }, uDeep: { value: pal('deep') }, uFresh: { value: pal('fresh') } },
    vertexShader: `
      attribute vec4 aRing; attribute vec4 aA; attribute vec4 aB; attribute vec4 aC;
      varying vec3 vW; varying vec3 vN; varying float vSalt; varying float vBirth; varying float vHash;
      void main() {
        vec3 ax = aB.xyz - aA.xyz;
        float L = length(ax);
        vec3 w = L > 1e-5 ? ax / L : vec3(0.0, 1.0, 0.0);
        vec3 u = normalize(cross(w, abs(w.y) < 0.95 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0)));
        vec3 v = cross(w, u);
        float r = mix(aA.w, aB.w, aRing.z);
        vec3 side = u * aRing.x + v * aRing.y;
        vec3 p = mix(aA.xyz, aB.xyz, aRing.z) + side * r + w * aRing.w * r;
        // A short capsule is a bead: a full sphere.
        // On a long one the caps fill bends and keep the body's normal.
        float bead = 1.0 - smoothstep(0.3, 1.2, L / max(aA.w, 1e-4));
        vN = normalize(side + w * aRing.w * bead);
        vW = p;
        vSalt = aC.x; vBirth = mix(aC.y, aC.z, aRing.z); vHash = aC.w;
        gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
      }`,
    fragmentShader: LAMP + NOISE + `
      uniform float uTime;
      uniform vec3 uTint[4]; uniform vec3 uDeep[4]; uniform vec3 uFresh[4];
      varying vec3 vW; varying vec3 vN; varying float vSalt; varying float vBirth; varying float vHash;
      void main() {
        vec3 N = normalize(vN), V = normalize(cameraPosition - vW);
        float f = abs(dot(N, V));
        int s = int(vSalt + 0.5);
        vec3 tint = uTint[0], deep = uDeep[0], fresh = uFresh[0];
        if (s == 1) { tint = uTint[1]; deep = uDeep[1]; fresh = uFresh[1]; }
        else if (s == 2) { tint = uTint[2]; deep = uDeep[2]; fresh = uFresh[2]; }
        else if (s == 3) { tint = uTint[3]; deep = uDeep[3]; fresh = uFresh[3]; }
        float fr = exp(-max(uTime - vBirth, 0.0) / 2.6);
        float n = vnoise(vW * 260.0 + vHash * 17.0), m = vnoise(vW * 55.0 + vHash * 5.0);
        // The wall is dense at its edges, where the eye looks through more of it.
        vec3 wall = mix(deep, tint, smoothstep(0.05, 0.95, f));
        wall *= 0.62 + 0.55 * n * (0.6 + 0.8 * m);
        wall = mix(wall, fresh, fr * 0.75);
        // Back light comes through the hollow middle in the wall's colour.
        // Thin gel lets more through, and paler.
        float g = behind(vW);
        vec3 c = uLampCol * g * mix(wall, fresh, 0.22) * (0.3 + 1.5 * f * f);
        // The key light from above left, with a soft wet sheen.
        vec3 L = normalize(vec3(-0.45, 0.85, 0.35));
        c += wall * (0.5 + 0.5 * dot(N, L)) * 0.22 + wall * 0.025;
        vec3 H = normalize(L + V);
        c += uLampCol * pow(max(dot(N, H), 0.0), 48.0) * 0.3 * (0.5 + n);
        // The lamp grazes the edges.
        float e = 1.0 - f;
        c += mix(wall, fresh, 0.5) * e * e * g * 0.9;
        // The growth front is fresh, pale gel: it glows a little.
        c += fresh * fr * fr * 0.55;
        gl_FragColor = vec4(c, 1.0);
      }`,
  });
  const towers = new THREE.Mesh(capGeo, towerMat);
  towers.frustumCulled = false;
  scene.add(towers);

  /* ---------- seeds ---------- */
  // Faceted crystals: one instanced icosahedron, flat shaded.
  const gemGeo = keep(new THREE.IcosahedronGeometry(1, 0));
  const aGem = new THREE.InstancedBufferAttribute(new Float32Array(256), 1);
  gemGeo.setAttribute('aSalt', aGem);
  const gemMat = mat({
    uniforms: { uGem: { value: pal('gem') }, uFresh: { value: pal('fresh') } },
    vertexShader: `attribute float aSalt; varying vec3 vW; varying float vSalt;
      void main() { vec4 w = modelMatrix * instanceMatrix * vec4(position, 1.0); vW = w.xyz; vSalt = aSalt; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: LAMP + `uniform vec3 uGem[4]; uniform vec3 uFresh[4]; varying vec3 vW; varying float vSalt;
      void main() {
        vec3 N = normalize(cross(dFdx(vW), dFdy(vW)));
        vec3 V = normalize(cameraPosition - vW);
        if (dot(N, V) < 0.0) N = -N;
        int s = int(vSalt + 0.5);
        vec3 gem = uGem[0];
        if (s == 1) gem = uGem[1]; else if (s == 2) gem = uGem[2]; else if (s == 3) gem = uGem[3];
        float g = behind(vW);
        vec3 L = normalize(vec3(-0.45, 0.85, 0.35));
        vec3 c = gem * (0.12 + 0.3 * max(dot(N, L), 0.0)) + gem * g * 0.35;
        vec3 H = normalize(L + V);
        c += uLampCol * pow(max(dot(N, H), 0.0), 80.0) * 1.4;
        c += uLampCol * pow(1.0 - abs(dot(N, V)), 4.0) * g * 0.5;
        gl_FragColor = vec4(c, 1.0);
      }`,
  });
  const gems = new THREE.InstancedMesh(gemGeo, gemMat, 256);
  gems.count = 0;
  gems.frustumCulled = false;
  scene.add(gems);

  /* ---------- particles ---------- */
  // Puffs of salt solution, landing dust, bubbles and the crystal's trail.
  const PMAX = 1400;
  const pGeo = keep(new THREE.BufferGeometry());
  const pPos = new THREE.BufferAttribute(new Float32Array(PMAX * 3), 3).setUsage(THREE.DynamicDrawUsage);
  const pCol = new THREE.BufferAttribute(new Float32Array(PMAX * 4), 4).setUsage(THREE.DynamicDrawUsage);
  const pSize = new THREE.BufferAttribute(new Float32Array(PMAX), 1).setUsage(THREE.DynamicDrawUsage);
  pGeo.setAttribute('position', pPos);
  pGeo.setAttribute('aCol', pCol);
  pGeo.setAttribute('aSize', pSize);
  pGeo.setDrawRange(0, 0);
  const pMat = mat({
    uniforms: { uScale: { value: 400 } },
    transparent: true, depthWrite: false,
    vertexShader: `attribute vec4 aCol; attribute float aSize; uniform float uScale; varying vec4 vC;
      void main() { vec4 mv = modelViewMatrix * vec4(position, 1.0); vC = aCol; gl_PointSize = max(1.0, aSize * uScale / -mv.z); gl_Position = projectionMatrix * mv; }`,
    // Premultiplied colour: a negative alpha marks a bright bubble.
    fragmentShader: `varying vec4 vC;
      void main() {
        vec2 q = gl_PointCoord * 2.0 - 1.0;
        float r = dot(q, q);
        if (r > 1.0) discard;
        float a = abs(vC.a);
        float k = vC.a < 0.0 ? smoothstep(1.0, 0.55, r) * (0.35 + 0.65 * smoothstep(0.3, 0.9, r)) : exp(-r * 2.6) * (1.0 - r);
        gl_FragColor = vec4(vC.rgb * k * a, k * a * (vC.a < 0.0 ? 0.3 : 1.0));
      }`,
    blending: THREE.CustomBlending,
    blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
  });
  const points = new THREE.Points(pGeo, pMat);
  points.frustumCulled = false;
  points.renderOrder = 5;
  scene.add(points);

  /* ---------- liquid ---------- */
  // The liquid tints all behind the front pane, a faint straw yellow.
  const liqTint = new THREE.Mesh(plane(W, S), mat({
    transparent: true, depthWrite: false, depthTest: false,
    vertexShader: `varying vec3 vW; void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `varying vec3 vW; void main() { gl_FragColor = vec4(0.94, 0.93, 0.8, 1.0); }`,
    blending: THREE.CustomBlending, blendSrc: THREE.ZeroFactor, blendDst: THREE.SrcColorFactor,
  }));
  liqTint.position.set(0, S / 2, D / 2);
  liqTint.renderOrder = 10;
  scene.add(liqTint);
  // The lamp scatters in the liquid; it thickens a little toward the floor.
  const liqGlow = new THREE.Mesh(plane(W, S), mat({
    transparent: true, depthWrite: false, depthTest: false,
    vertexShader: `varying vec3 vW; void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: LAMP + NOISE + `varying vec3 vW;
      void main() {
        float g = behind(vW);
        // Water glass is not even: soft swirls of denser liquid.
        g *= 0.9 + 0.2 * vnoise(vec3(vW.x * 3.0, vW.y * 7.0, 0.5));
        float low = 1.0 - smoothstep(0.0, ${S.toFixed(2)}, vW.y);
        vec3 c = uLampCol * vec3(1.0, 0.96, 0.82) * (g * 0.07 + 0.006 + low * 0.012);
        // A faint slanted reflection on the front pane: it reads as glass.
        float sx = (vW.x + 0.46 - vW.y * 0.16) * 6.0;
        c += vec3(0.85, 0.92, 1.0) * exp(-sx * sx) * 0.014;
        gl_FragColor = vec4(c, 0.0);
      }`,
    blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor,
  }));
  liqGlow.position.copy(liqTint.position);
  liqGlow.renderOrder = 11;
  scene.add(liqGlow);

  /* ---------- surface ---------- */
  // The underside of the surface mirrors the lamp: a silver band.
  // Ripples: x, z, start time, size.
  const ripples = Array.from({ length: 6 }, () => new THREE.Vector4(0, 0, -99, 0));
  const surf = new THREE.Mesh(plane(W - 0.004, D - 0.004), mat({
    uniforms: { uRip: { value: ripples } },
    transparent: true, depthWrite: false,
    vertexShader: `varying vec3 vW; void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: LAMP + `uniform float uTime; uniform vec4 uRip[6]; varying vec3 vW;
      void main() {
        float g = glowAt(vec2(vW.x * 1.1, 0.75 + vW.z * 0.6));
        float front = smoothstep(${(-D / 2).toFixed(3)}, ${(D / 2).toFixed(3)}, vW.z);
        float w = 0.0;
        for (int i = 0; i < 6; i++) {
          float t = uTime - uRip[i].z;
          if (t < 0.0 || t > 2.2) continue;
          float d = length(vW.xz - uRip[i].xy);
          float r = t * 0.22;
          float e = (d - r) * 70.0;
          w += uRip[i].w * exp(-e * e) * exp(-t * 2.0);
        }
        vec3 c = uLampCol * (0.08 + 0.55 * g) * (0.45 + 0.55 * front) + uLampCol * w * 1.4;
        gl_FragColor = vec4(c, 0.0);
      }`,
    blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor,
    side: THREE.DoubleSide,
  }));
  surf.rotation.x = -Math.PI / 2;
  surf.position.set(0, S, 0);
  surf.renderOrder = 12;
  scene.add(surf);

  /* ---------- glass ---------- */
  // The tank's edges catch the lamp as thin lines. One quad per edge.
  const edgeMat = mat({
    transparent: true, depthWrite: false,
    vertexShader: `attribute float aK; varying vec3 vW; varying vec2 vUv; varying float vK;
      void main() { vUv = uv; vK = aK; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: LAMP + `varying vec3 vW; varying vec2 vUv; varying float vK;
      void main() {
        float g = behind(vW);
        float across = 1.0 - abs(vUv.x * 2.0 - 1.0);
        vec3 c = uLampCol * vK * (0.05 + 0.75 * g) * pow(across, 1.5);
        gl_FragColor = vec4(c, 0.0);
      }`,
    blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor,
  });
  const edges = [];
  // A thin quad between two points; k sets its brightness.
  const edge = (a, b, thick, k) => {
    const g = keep(new THREE.BufferGeometry());
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const l = Math.hypot(dx, dy) || 1, nx = -dy / l * thick, ny = dx / l * thick;
    const p = [a[0] - nx, a[1] - ny, a[2], a[0] + nx, a[1] + ny, a[2], b[0] - nx, b[1] - ny, b[2], b[0] + nx, b[1] + ny, b[2]];
    g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1, 1, 1], 2));
    g.setAttribute('aK', new THREE.Float32BufferAttribute([k, k, k, k], 1));
    g.setIndex([0, 2, 1, 1, 2, 3]);
    const m = new THREE.Mesh(g, edgeMat);
    m.renderOrder = 13;
    scene.add(m);
    edges.push(m);
  };
  const H = TANK.h, X = W / 2, Z = D / 2, T = 0.005;
  for (const z of [Z, -Z]) {
    const k = z > 0 ? 1 : 0.55;
    edge([-X, 0, z], [-X, H, z], T, k);
    edge([X, 0, z], [X, H, z], T, k);
    edge([-X, H, z], [X, H, z], T * 0.8, k * 0.8);
    edge([-X, 0.001, z], [X, 0.001, z], T * 0.8, k * 0.5);
  }
  // The meniscus: the waterline on the front pane.
  edge([-X, S, Z + 0.001], [X, S, Z + 0.001], 0.003, 1.5);
  edge([-X, S, -Z], [X, S, -Z], 0.0025, 0.8);
  // The pane walls seen edge on: soft bands at the sides.
  const sideMat = mat({
    transparent: true, depthWrite: false,
    vertexShader: `varying vec3 vW; varying vec2 vUv; void main() { vUv = uv; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: LAMP + `varying vec3 vW; varying vec2 vUv;
      void main() {
        float g = behind(vW);
        float k = 0.5 + 0.5 * cos((vUv.x - 0.5) * 6.2831);
        gl_FragColor = vec4(uLampCol * g * 0.06 * k, 0.0);
      }`,
    blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor,
  });
  for (const sx of [-1, 1]) {
    const m = new THREE.Mesh(plane(D, H), sideMat);
    m.rotation.y = Math.PI / 2;
    m.position.set(sx * X, H / 2, 0);
    m.renderOrder = 13;
    scene.add(m);
  }

  /* ---------- post ---------- */
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const grade = new ShaderPass({
    uniforms: { tDiffuse: { value: null }, uSeed: { value: 0 }, uAspect: { value: 1 } },
    vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform sampler2D tDiffuse; uniform float uSeed; uniform float uAspect; varying vec2 vUv;
      float h(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233)) + uSeed) * 43758.5453); }
      void main() {
        vec3 c = texture2D(tDiffuse, vUv).rgb;
        vec2 q = (vUv - 0.5) * vec2(uAspect, 1.0);
        c *= 1.0 - 0.45 * smoothstep(0.35, 1.05, length(q));
        c += (h(vUv * 913.0) - 0.5) * 0.012;
        gl_FragColor = vec4(max(c, 0.0), 1.0);
      }`,
  });
  // The grade resolves the multisampled scene; bloom then reads a plain target.
  composer.addPass(grade);
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.5, 0.55, 0.82);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  /* ---------- frame ---------- */
  const look = new THREE.Vector3();
  let aspect = 1;
  // The shot: fit the tank, keep its floor above the bar.
  // cover: the bar's share of the stage height, at the foot.
  function frame(w, h, cover = 0, par = [0, 0]) {
    aspect = w / h;
    camera.aspect = aspect;
    const top = H + 0.07, bottom = -0.07;
    let half = (top - bottom) / 2 / (1 - cover);
    // A wide stage fits the tank width; a tall one shows the middle of the tank.
    if (aspect >= 0.95) half = Math.max(half, (W + 0.22) / 2 / aspect);
    const yc = top - half;
    const dist = half / Math.tan((camera.fov * Math.PI) / 360) + Z;
    look.set(0, yc, 0);
    camera.position.set(par[0] * 0.22, yc + 0.07 + par[1] * 0.08, dist);
    camera.lookAt(look);
    camera.updateProjectionMatrix();
    grade.uniforms.uAspect.value = aspect;
    pMat.uniforms.uScale.value = h * renderer.getPixelRatio() / (2 * Math.tan((camera.fov * Math.PI) / 360));
  }
  // The tank x range the camera sees at mid depth.
  function visibleX() {
    const half = Math.tan((camera.fov * Math.PI) / 360) * (camera.position.z) * aspect;
    return [Math.max(-X + 0.06, camera.position.x - half * 0.9), Math.min(X - 0.06, camera.position.x + half * 0.9)];
  }
  function resize(w, h, dpr, { bloomScale = 0.5, samples = 4 } = {}) {
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h, false);
    composer.setPixelRatio(dpr);
    composer.setSize(w, h);
    // Only the scene target is multisampled: bloom on it draws black on some GPUs.
    if (composer.readBuffer.samples !== samples) {
      composer.readBuffer.samples = samples;
      composer.readBuffer.dispose();
    }
    composer.writeBuffer.samples = 0;
    bloom.resolution.set(w * dpr * bloomScale, h * dpr * bloomScale);
    bloom.setSize(Math.round(w * dpr * bloomScale), Math.round(h * dpr * bloomScale));
  }

  // The pointer's hit on the tank's mid plane.
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), mid = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), hit = new THREE.Vector3();
  function pick(nx, ny) {
    ndc.set(nx * 2 - 1, 1 - ny * 2);
    ray.setFromCamera(ndc, camera);
    return ray.ray.intersectPlane(mid, hit) ? { x: hit.x, y: hit.y } : null;
  }

  // Writes the garden into the instance buffers.
  function writeTowers(garden) {
    const A = aA.array, Bb = aB.array, C = aC.array;
    let n = 0;
    garden.capsules((ax, ay, az, ar, bx, by, bz, br, salt, ba, bb, hash) => {
      if (n >= MAX) return;
      const o = n * 4;
      A[o] = ax; A[o + 1] = ay; A[o + 2] = az; A[o + 3] = ar;
      Bb[o] = bx; Bb[o + 1] = by; Bb[o + 2] = bz; Bb[o + 3] = br;
      C[o] = salt; C[o + 1] = ba; C[o + 2] = bb; C[o + 3] = hash;
      n++;
    });
    capGeo.instanceCount = n;
    for (const a of [aA, aB, aC]) { a.clearUpdateRanges(); a.addUpdateRange(0, n * 4); a.needsUpdate = true; }
    // Seeds: falling ones tumble, landed ones rest in the bulb.
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), sc = new THREE.Vector3(), p = new THREE.Vector3();
    let g = 0;
    for (const t of garden.towers) {
      if (g >= 256) break;
      const k = garden.keep(t, t.y);
      if (k <= 0) continue;
      e.set(t.rot[0], t.rot[1], t.rot[2]);
      q.setFromEuler(e);
      sc.set(t.seedR, t.seedR * 0.8, t.seedR * 0.9).multiplyScalar(k);
      p.set(t.x, t.y, t.z);
      m.compose(p, q, sc);
      gems.setMatrixAt(g, m);
      aGem.array[g] = t.salt;
      g++;
    }
    gems.count = g;
    gems.instanceMatrix.needsUpdate = true;
    aGem.needsUpdate = true;
  }

  function writeParticles(list) {
    const P = pPos.array, Cc = pCol.array, Sz = pSize.array;
    let n = 0;
    for (const p of list) {
      if (n >= PMAX) break;
      P[n * 3] = p.x; P[n * 3 + 1] = p.y; P[n * 3 + 2] = p.z;
      Cc[n * 4] = p.c[0]; Cc[n * 4 + 1] = p.c[1]; Cc[n * 4 + 2] = p.c[2]; Cc[n * 4 + 3] = p.a;
      Sz[n] = p.s;
      n++;
    }
    pGeo.setDrawRange(0, n);
    for (const a of [pPos, pCol, pSize]) { a.clearUpdateRanges(); a.addUpdateRange(0, n * a.itemSize); a.needsUpdate = true; }
  }

  let rip = 0;
  function ripple(x, z, size) {
    ripples[rip].set(x, z, shared.uTime.value, size);
    rip = (rip + 1) % ripples.length;
  }

  function render(time, grain = 0) {
    shared.uTime.value = time;
    grade.uniforms.uSeed.value = grain;
    composer.render();
  }

  async function warm() {
    await renderer.compileAsync(scene, camera);
  }

  function dispose() {
    for (const d of disposables) d.dispose?.();
    composer.dispose?.();
    bloom.dispose?.();
    renderer.dispose();
  }

  return { renderer, scene, camera, frame, resize, pick, visibleX, writeTowers, writeParticles, ripple, render, warm, dispose, bloom, MAX };
}
