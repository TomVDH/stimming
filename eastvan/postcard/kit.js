// East Van postcards: the shared kit.
// It owns the renderer, the sky, the weather, the post passes and the loop.
// A place is one module in scenes/: it exports `cards` and `build(k)`.
// Axes for every place: x is east, -z is north, y is up. Units are metres.
// The mountains stand to the north, far beyond -z.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { whenVisible, reduced, onReducedChange, linFit, pixelRatio } from '../../shared/stim.js';
import { SKY, skyAt } from '../../shared/sky.js';
import { GRADE } from '../../shared/grade.js';

export { THREE, mergeGeometries };
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
export const hash = n => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
// A colour from OKLCH, in linear RGB. k scales it; above 1 feeds the bloom.
export const col = (L, C, h, k = 1) => new THREE.Color().setRGB(...linFit(L, C, h)).multiplyScalar(k);
export const V = (x, y, z) => new THREE.Vector3(x, y, z);
export const RAD = Math.PI / 180, UP = V(0, 1, 0);
export function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
// A canvas texture. draw(g, w, h) paints it; rx and ry repeat it.
export function tex(w, h, draw, { rx = 1, ry = 1, srgb = true } = {}) {
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  draw(cv.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(rx, ry);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}
// A sign: text on a plain ground, as a texture. Use invented names only.
export function signTex(text, { w = 512, h = 128, bg = '#1c1c1c', fg = '#fff', font = '700 72px ui-monospace, monospace' } = {}) {
  return tex(w, h, g => {
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    g.fillStyle = fg; g.font = font; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(text, w / 2, h / 2 + 4, w - 24);
  });
}
export const ico = (sx, sy, sz, detail = 1) => new THREE.IcosahedronGeometry(1, detail).scale(sx, sy, sz);
export const ni = g => (g.index ? g.toNonIndexed() : g);

/* ---------- materials ---------- */
// A matte material from OKLCH. noCast: the mesh casts no shadow.
export function std(L, C, h, { noCast = false, ...o } = {}) {
  const m = new THREE.MeshStandardMaterial({ color: col(L, C, h), roughness: 0.9, ...o });
  m.userData.noCast = noCast;
  return m;
}
// A material that glows on its own; k above 1 feeds the bloom.
export function glow(L, C, h, k = 1) {
  const m = new THREE.MeshBasicMaterial({ color: col(L, C, h, k) });
  m.userData.noCast = true;
  return m;
}
const sidingTex = tex(8, 32, (g, w, h) => { g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(0, h - 5, w, 5); }, { ry: 20 });
const jointTex = tex(64, 64, (g, w, h) => { g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(0,0,0,0.28)'; g.fillRect(w - 3, 0, 3, h); }, { rx: 400 });
const linkTex = tex(32, 32, (g, w, h) => {
  g.strokeStyle = '#c9ccd0'; g.lineWidth = 2.4;
  g.beginPath(); g.moveTo(-2, -2); g.lineTo(w + 2, h + 2); g.moveTo(w + 2, -2); g.lineTo(-2, h + 2); g.stroke();
});
export const WARM = col(0.86, 0.13, 72), TV = col(0.7, 0.14, 250);
const glass = (o) => std(0.2, 0.03, 250, { roughness: 0.25, noCast: true, ...o });
// The shared palette. A place may add its own with std().
// winLit, winTV and leaf brightness follow the card: win, tv, glow.
export const M = {
  body: std(0.5, 0.085, 195, { map: sidingTex }), gable: std(0.76, 0.14, 86), trim: std(0.93, 0.03, 92),
  found: std(0.4, 0.045, 200), roof: std(0.3, 0.018, 262, { roughness: 0.8 }), deck: std(0.55, 0.02, 80),
  door: std(0.62, 0.2, 30), couch: std(0.55, 0.11, 60), brick: std(0.45, 0.11, 35), stucco: std(0.86, 0.025, 95),
  purple: std(0.48, 0.1, 310, { map: sidingTex }), iron: std(0.2, 0.01, 260),
  lawn: std(0.56, 0.125, 138, { roughness: 1, noCast: true }), walk: std(0.72, 0.012, 90, { map: jointTex }), conc: std(0.7, 0.012, 90),
  curb: std(0.76, 0.01, 90), road: std(0.42, 0.012, 262, { roughness: 0.95, noCast: true }), gravel: std(0.55, 0.02, 80, { roughness: 1, noCast: true }),
  wood: std(0.58, 0.07, 70), soil: std(0.3, 0.03, 50), kale: std(0.5, 0.11, 150, { flatShading: true }),
  bush: std(0.4, 0.09, 150, { flatShading: true }), fir: std(0.32, 0.06, 165, { flatShading: true }),
  bark: std(0.36, 0.035, 55), pole: std(0.43, 0.04, 62), steel: std(0.6, 0.01, 250, { roughness: 0.6 }),
  binK: std(0.24, 0.006, 260, { roughness: 0.6 }), binG: std(0.5, 0.14, 150, { roughness: 0.6 }), binB: std(0.5, 0.15, 255, { roughness: 0.6 }),
  bagY: std(0.87, 0.16, 98, { flatShading: true }),
  link: new THREE.MeshStandardMaterial({ map: linkTex, alphaTest: 0.06, alphaToCoverage: true, side: THREE.DoubleSide, roughness: 0.5 }),
  winLit: glass({ emissive: WARM }), winDim: glass({ emissive: col(0.5, 0.06, 240), emissiveIntensity: 0.1 }), winTV: glass({ emissive: TV }),
  h1: std(0.62, 0.09, 20, { map: sidingTex }), h2: std(0.8, 0.06, 85, { map: sidingTex }), h3: std(0.6, 0.06, 150, { map: sidingTex }),
  h4: std(0.52, 0.07, 255, { map: sidingTex }), h5: std(0.45, 0.12, 30, { map: sidingTex }), h6: std(0.88, 0.02, 95, { map: sidingTex }),
};
M.link.userData.noCast = true;
export const LEAF = [col(0.8, 0.16, 84), col(0.7, 0.18, 58), col(0.57, 0.19, 33)];
const leafMat = new THREE.MeshStandardMaterial({ roughness: 0.85, flatShading: true, emissive: col(0.7, 0.17, 60), emissiveIntensity: 0 });
const flatMat = new THREE.MeshStandardMaterial({ roughness: 0.9, side: THREE.DoubleSide });
const leafGeo = new THREE.PlaneGeometry(0.17, 0.12);
const crowMat = new THREE.MeshStandardMaterial({ color: col(0.17, 0.025, 285), roughness: 0.5, flatShading: true });
const wireCol = col(0.13, 0.01, 270);

const NOISE = /* glsl */`
float nH(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float nV(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(nH(i), nH(i + vec2(1, 0)), f.x), mix(nH(i + vec2(0, 1)), nH(i + vec2(1, 1)), f.x), f.y); }
float nF(vec2 p) { float a = 0.5, s = 0.0; for (int i = 0; i < 5; i++) { s += a * nV(p); p = p * 2.03 + 7.1; a *= 0.5; } return s; }
`;
// A mountain ridge as a white shape on clear. lions adds the twin peaks.
export const ridgeTex = (seed, lions) => tex(2048, 256, (g, w, h) => {
  const R = rng(seed), a = [R() * 6, R() * 6, R() * 6, R() * 6];
  g.fillStyle = '#fff'; g.beginPath(); g.moveTo(0, h);
  for (let x = 0; x <= w; x += 4) {
    const u = x / w;
    let y = 0.42 + 0.16 * Math.sin(u * 9 + a[0]) + 0.1 * Math.sin(u * 23 + a[1]) + 0.05 * Math.sin(u * 61 + a[2]) + 0.025 * Math.sin(u * 140 + a[3]);
    if (lions) y += 0.2 * Math.exp(-((u - 0.47) ** 2) / 0.00012) + 0.17 * Math.exp(-((u - 0.487) ** 2) / 0.00012);
    g.lineTo(x, h - clamp(y, 0.05, 0.98) * h);
  }
  g.lineTo(w, h); g.fill();
});

// Card defaults. A card overrides what it needs.
const CARD = {
  hour: 12, sun: [0.3, 0.8, 0.5], sunCol: col(1, 0, 0), sunI: 3, hemi: [col(0.8, 0.05, 250), col(0.6, 0.05, 90), 1],
  fog: col(0.8, 0.03, 250), fogD: 0.006, exposure: 1, win: 0.4, tv: 0, glow: 0,
  rain: 0, rainLamp: [0, -99, 0], wet: false, leaves: 0, wind: 0.3, smoke: 0.15, smokeCol: col(0.9, 0.02, 80),
  flock: 0, flockDir: 1, flockCol: col(0.1, 0.02, 270), mtn: null, ski: false,
  bloom: [0.45, 0.7, 0.95], tilt: null, shadow: { at: [0, 0, -1], r: 26 },
  sky: { cloudA: 0.3, cov: 0.45, cloud: col(0.8, 0.02, 250), cloudLit: col(0.97, 0.02, 90), hazeA: 0.8, hazeK: 8, disc: 1, sunCol: col(0.95, 0.05, 90, 4) },
  grade: { con: 1.05, sat: 1.08, vig: 0.32, grain: 0.05, lift: [0, 0, 0], gain: [1, 1, 1] },
};

// Starts the page. mods: the place modules, in card order.
// onCard(i, card) fires after each switch. Returns { cards, pick }.
export function start(stage, mods, { onCard = () => {} } = {}) {
  const canvas = document.createElement('canvas');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
  stage.prepend(canvas);
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x000000, 0.01);
  // The projection is set by hand: a shift lens keeps verticals straight.
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 1500);
  const view = { w: 1, h: 1, dpr: 1, px: 1 };
  const uT = { value: 0 }, dummy = new THREE.Object3D();
  const SUN = V(0, 1, 0), FOG = new THREE.Color();
  const cu = () => ({ value: new THREE.Color() }), v3u = () => ({ value: V(0, 0, 0) });

  /* ----- lights every place shares ----- */
  const sunLight = new THREE.DirectionalLight(0xffffff, 1);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(2048, 2048);
  sunLight.shadow.bias = -0.0004;
  sunLight.shadow.normalBias = 0.04;
  const hemi = new THREE.HemisphereLight(0xffffff, 0xffffff, 1);
  scene.add(sunLight, sunLight.target, hemi);

  /* ----- sky, mountains, far crows ----- */
  const skyU = {
    uSun: { value: SUN }, uZen: v3u(), uMid: v3u(), uBand: v3u(), uAnti: v3u(), uStars: { value: 0 }, uT,
    uFog: { value: FOG }, uSunCol: cu(), uCloud: cu(), uCloudLit: cu(), uCloudA: { value: 0 }, uCov: { value: 0.4 },
    uHazeA: { value: 1 }, uHazeK: { value: 6 }, uDisc: { value: 0 },
  };
  const sky = new THREE.Mesh(new THREE.SphereGeometry(700, 32, 16), new THREE.ShaderMaterial({
    uniforms: skyU, side: THREE.BackSide, depthWrite: false, depthTest: false,
    vertexShader: 'varying vec3 vDir; void main() { vec4 w = modelMatrix * vec4(position, 1.0); vDir = w.xyz - cameraPosition; gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: /* glsl */`
      uniform vec3 uSun, uZen, uMid, uBand, uAnti, uFog, uSunCol, uCloud, uCloudLit;
      uniform float uStars, uT, uCloudA, uCov, uHazeA, uHazeK, uDisc; varying vec3 vDir;
      ${SKY}
      ${NOISE}
      void main() {
        vec3 d = normalize(vDir);
        vec3 c = skSky(d, uSun, uZen, uMid, uBand, uAnti, uStars, uT);
        float sd = max(dot(d, uSun), 0.0);
        // Clouds lie on a flat ceiling and drift east.
        vec2 p = d.xz / (max(d.y, 0.0) + 0.14) * 0.8 + vec2(uT * 0.008, uT * 0.003);
        float n = nF(p), k = smoothstep(uCov, uCov + 0.3, n) * uCloudA;
        c = mix(c, mix(uCloud, uCloudLit, clamp(pow(sd, 3.0) * 0.9 + 0.5 * smoothstep(0.45, 0.85, n), 0.0, 1.0)), k);
        c += uSunCol * (uDisc * smoothstep(0.99955, 0.9998, sd) + 0.3 * pow(sd, 90.0) + 0.07 * pow(sd, 8.0)) * (1.0 - 0.6 * k);
        float hz = clamp(uHazeA * exp(-max(d.y, 0.0) * uHazeK), 0.0, 1.0);
        gl_FragColor = vec4(mix(c, uFog + uSunCol * 0.06 * pow(sd, 6.0), hz), 1.0);
      }`,
  }));
  sky.renderOrder = -10;
  sky.frustumCulled = false;
  scene.add(sky);
  // The North Shore mountains: two ridges, far to the north.
  const mtn = [0, 1].map(i => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1100, i ? 62 : 96), new THREE.MeshBasicMaterial({ map: ridgeTex(i ? 12 : 5, !i), alphaTest: 0.5, alphaToCoverage: true, fog: false }));
    m.position.set(i ? 60 : 0, (i ? 62 : 96) / 2 - 2, i ? -330 : -400);
    scene.add(m);
    return m;
  });
  const ski = new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial({ color: col(0.9, 0.1, 80, 3), size: 2.2, sizeAttenuation: false, fog: false }));
  {
    const p = [];
    for (let l = 0; l < 3; l++) for (let i = 0; i < 9; i++) p.push(70 + l * 16 + i * 1.1, 10 + i * 1.6 - l * 2, -329);
    ski.geometry.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
    scene.add(ski);
  }
  // The crow commute: east at dusk, west at dawn.
  const flockU = { uT, uDir: { value: 1 }, uCol: cu() };
  const flockGeo = new THREE.InstancedBufferGeometry();
  flockGeo.setAttribute('position', new THREE.Float32BufferAttribute([0.3, 0, 0, -0.25, 0, 0, 0, 0, 0.62, 0.3, 0, 0, -0.25, 0, 0, 0, 0, -0.62], 3));
  {
    const R = rng(77), N = 70, o = [], ph = [];
    for (let i = 0; i < N; i++) { o.push(Math.floor(R() * 9) * 45 + R() * 16, 17 + R() * 24, -45 - R() * 110); ph.push(R()); }
    flockGeo.setAttribute('aOff', new THREE.InstancedBufferAttribute(new Float32Array(o), 3));
    flockGeo.setAttribute('aPh', new THREE.InstancedBufferAttribute(new Float32Array(ph), 1));
  }
  const flock = new THREE.Mesh(flockGeo, new THREE.ShaderMaterial({
    uniforms: flockU, side: THREE.DoubleSide,
    vertexShader: /* glsl */`
      attribute vec3 aOff; attribute float aPh; uniform float uT, uDir;
      void main() {
        float x = mod(aOff.x + uT * (5.0 + aPh * 2.0) * uDir, 400.0) - 200.0;
        vec3 p = position * 1.3;
        p.y += abs(p.z) * sin(uT * (7.0 + aPh * 3.0) + aPh * 40.0) * 0.75;
        p.x *= uDir;
        gl_Position = projectionMatrix * viewMatrix * vec4(vec3(x, aOff.y + sin(uT * 0.3 + aPh * 20.0) * 1.5, aOff.z) + p, 1.0);
      }`,
    fragmentShader: 'uniform vec3 uCol; void main() { gl_FragColor = vec4(uCol, 1.0); }',
  }));
  flock.frustumCulled = false;
  scene.add(flock);

  /* ----- rain: a box of streaks that follows the camera ----- */
  const rainU = { uT, uA: { value: 0.3 }, uLamp: v3u(), uCam: v3u(), uCool: { value: col(0.8, 0.04, 250) }, uWarm: { value: col(0.9, 0.11, 70) } };
  const rain = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.ShaderMaterial({
    uniforms: rainU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */`
      attribute float aE; uniform float uT; uniform vec3 uLamp, uCam; varying float vL;
      void main() {
        float r = fract(sin(dot(position.xz, vec2(12.9898, 78.233))) * 43758.5453);
        float y = mod(position.y - uT * (9.0 + r * 4.0), 16.0) + aE * (0.34 + r * 0.2);
        vec3 p = vec3(mod(position.x - uCam.x, 50.0) - 25.0 + uCam.x - y * 0.08, y - 0.3 + max(uCam.y - 6.0, 0.0), mod(position.z - uCam.z, 40.0) - 20.0 + uCam.z);
        vec3 q = p - uLamp;
        vL = exp(-dot(q.xz, q.xz) / 16.0) * smoothstep(1.0, -6.0, q.y);
        gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
      }`,
    fragmentShader: 'uniform float uA; uniform vec3 uCool, uWarm; varying float vL; void main() { gl_FragColor = vec4(mix(uCool, uWarm * 2.5, vL) * uA * (0.5 + 2.0 * vL), 1.0); }',
  }));
  {
    const R = rng(21), N = 4200, p = [], e = [];
    for (let i = 0; i < N; i++) { const x = R() * 50, y = R() * 16, z = R() * 40; p.push(x, y, z, x, y, z); e.push(0, 1); }
    rain.geometry.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
    rain.geometry.setAttribute('aE', new THREE.Float32BufferAttribute(e, 1));
    rain.frustumCulled = false;
    scene.add(rain);
  }
  const smokeU = { uT, uPx: { value: 1 }, uA: { value: 0.2 }, uWind: { value: 0.4 }, uCol: cu() };

  /* ----- post ----- */
  const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 }));
  composer.addPass(new RenderPass(scene, camera));
  // Tilt-shift: blur grows above and below a sharp band.
  const TILT = {
    uniforms: { tDiffuse: { value: null }, uDir: { value: new THREE.Vector2(1, 0) }, uRes: { value: new THREE.Vector2(1, 1) }, uFocus: { value: 0.5 }, uBand: { value: 0.16 }, uAmount: { value: 1.5 } },
    vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: /* glsl */`
      uniform sampler2D tDiffuse; uniform vec2 uDir, uRes; uniform float uFocus, uBand, uAmount; varying vec2 vUv;
      void main() {
        float r = clamp((abs(vUv.y - uFocus) - uBand) * uAmount, 0.0, 1.0) * 1.6 * uRes.y / 900.0;
        vec4 s = vec4(0.0); float ws = 0.0;
        for (int i = -4; i <= 4; i++) { float f = float(i), w = exp(-f * f / 8.0); s += texture2D(tDiffuse, vUv + uDir * f * r * 1.7 / uRes) * w; ws += w; }
        gl_FragColor = s / ws;
      }`,
  };
  const tiltH = new ShaderPass(TILT), tiltV = new ShaderPass(TILT);
  tiltV.uniforms.uDir.value.set(0, 1);
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.5, 0.6, 0.9);
  // The grade works on display colour: contrast, saturation, tint, vignette, grain.
  const grade = new ShaderPass({
    uniforms: { tDiffuse: { value: null }, uRes: { value: new THREE.Vector2(1, 1) }, uCon: { value: 1 }, uSat: { value: 1 }, uVig: { value: 0.3 }, uGrain: { value: 0.05 }, uSeed: { value: 0 }, uLift: { value: V(0, 0, 0) }, uGain: { value: V(1, 1, 1) } },
    vertexShader: TILT.vertexShader,
    fragmentShader: /* glsl */`
      uniform sampler2D tDiffuse; uniform vec2 uRes; uniform float uCon, uSat, uVig, uGrain, uSeed; uniform vec3 uLift, uGain; varying vec2 vUv;
      ${GRADE}
      void main() {
        vec3 c = texture2D(tDiffuse, vUv).rgb;
        c = clamp((c - 0.5) * uCon + 0.5, 0.0, 1.0);
        c = mix(vec3(gdLuma(c)), c, uSat) * uGain;
        c += uLift * (1.0 - c);
        c *= gdVignette(vUv, uRes.x / uRes.y, uVig, 0.35);
        c *= gdGrain(gdHash(gl_FragCoord.xy + vec2(uSeed * 37.0, uSeed * 91.0)), gdLuma(c), uGrain, vec2(0.6, 1.0));
        gl_FragColor = vec4(c, 1.0);
      }`,
  });
  for (const p of [tiltH, tiltV, bloom, new OutputPass(), grade]) composer.addPass(p);

  /* ----- the builder a place gets ----- */
  function builder() {
    const group = new THREE.Group();
    scene.add(group);
    const bucket = new Map(), cardHooks = [], frameHooks = [], blobD = [], roads = [], falls = [];
    const wirePos = [], wireSw = [], wireIdx = [];
    let wireN = 0, blobs = null;
    const m4 = new THREE.Matrix4(), q4 = new THREE.Quaternion(), e4 = new THREE.Euler(), s4 = V(1, 1, 1), p4 = V(0, 0, 0);
    let base = new THREE.Matrix4();
    // Moves all that fn builds by x, y, z, after a turn of ry about y.
    // Use it for sloped ground and for turned props. Wires stay in world space.
    function at(x, y, z, fn, ry = 0) {
      const old = base;
      base = old.clone().multiply(new THREE.Matrix4().compose(V(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry, 0)), V(1, 1, 1)));
      fn();
      base = old;
    }
    const mat = m => { const r = typeof m === 'string' ? M[m] : m; if (!r) throw new Error('postcard kit: no material ' + m); return r; };
    // Adds a geometry to the merged mesh of its material.
    function put(m, geo, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
      const key = mat(m), g = ni(geo);
      g.applyMatrix4(m4.compose(p4.set(x, y, z), q4.setFromEuler(e4.set(rx, ry, rz)), s4)).applyMatrix4(base);
      if (!bucket.has(key)) bucket.set(key, []);
      bucket.get(key).push(g);
    }
    // A box: size w, h, d; centre x, y, z; then rotation in radians.
    const box = (m, w, h, d, x, y, z, rx, ry, rz) => put(m, new THREE.BoxGeometry(w, h, d), x, y, z, rx, ry, rz);
    // A tapered cylinder from point p0 to point p1.
    function limb(m, p0, p1, r0, r1, sides = 6) {
      const d = V(0, 0, 0).subVectors(p1, p0), len = d.length();
      const g = new THREE.CylinderGeometry(r1, r0, len, sides, 1).translate(0, len / 2, 0);
      g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(UP, d.normalize()));
      put(m, g, p0.x, p0.y, p0.z);
    }
    // A gabled house. zf is the front wall; dir 1 faces +z, -1 faces -z.
    function gableHouse({ x, zf, w, d, base, wall, rise, body, gable = body, found = 'found', roof = 'roof', dir = 1, ov = 0.45 }) {
      const eave = base + wall, zc = zf - dir * d / 2;
      if (base > 0) box(found, w, base, d, x, base / 2, zc);
      box(body, w, wall, d, x, base + wall / 2, zc);
      const tri = new THREE.Shape([new THREE.Vector2(-w / 2, 0), new THREE.Vector2(w / 2, 0), new THREE.Vector2(0, rise)]);
      put(gable, new THREE.ExtrudeGeometry(tri, { depth: d, bevelEnabled: false }), x, eave, dir > 0 ? zf - d : zf);
      const th = Math.atan2(rise, w / 2), Ls = Math.hypot(rise, w / 2) + ov;
      for (const s of [-1, 1]) {
        const cx = x + s * Math.cos(th) * Ls / 2, cy = eave + rise - Math.sin(th) * Ls / 2;
        box(roof, Ls, 0.14, d + 0.9, cx, cy + 0.09, zc, 0, 0, -s * th);
        box('trim', Ls, 0.2, 0.06, cx, cy, zf + dir * 0.46, 0, 0, -s * th);
      }
      box('trim', w + 0.12, 0.16, 0.08, x, eave, zf + dir * 0.03);
    }
    // A framed window, centre x, y, z. side: the glass faces along x.
    function win(m, w, h, x, y, z, side = false) {
      const b = (k, bw, bh, bd, ox, oy) => (side ? box(k, bd, bh, bw, x, y + oy, z + ox) : box(k, bw, bh, bd, x + ox, y + oy, z));
      b(m, w, h, 0.05, 0, 0);
      b('trim', w + 0.18, 0.09, 0.1, 0, h / 2 + 0.045); b('trim', w + 0.22, 0.09, 0.14, 0, -h / 2 - 0.045);
      b('trim', 0.09, h, 0.1, -w / 2 - 0.045, 0); b('trim', 0.09, h, 0.1, w / 2 + 0.045, 0);
      b('trim', w, 0.05, 0.08, 0, 0);
    }
    // A chain-link fence from x0, z0 to x1, z1; ht is its height.
    function fence(x0, z0, x1, z1, ht = 1) {
      const len = Math.hypot(x1 - x0, z1 - z0), ry = Math.atan2(-(z1 - z0), x1 - x0), mx = (x0 + x1) / 2, mz = (z0 + z1) / 2;
      const g = new THREE.PlaneGeometry(len, ht), uv = g.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * len / 0.11, uv.getY(i) * ht / 0.11);
      put('link', g, mx, ht / 2 + 0.05, mz, 0, ry);
      put('steel', new THREE.CylinderGeometry(0.022, 0.022, len, 6).rotateZ(Math.PI / 2), mx, ht + 0.06, mz, 0, ry);
      const n = Math.ceil(len / 2.4);
      for (let j = 0; j <= n; j++) put('steel', new THREE.CylinderGeometry(0.03, 0.03, ht + 0.12, 6), lerp(x0, x1, j / n), ht / 2 + 0.06, lerp(z0, z1, j / n));
    }
    // A wheeled cart for waste, at x, z on ground y. tilt lifts the lid.
    function cart(m, x, z, tilt = 0, y = 0) {
      put(m, new THREE.CylinderGeometry(0.34, 0.27, 0.98, 4).rotateY(Math.PI / 4), x, y + 0.49, z);
      box(m, 0.52, 0.05, 0.58, x, y + 1.01 + tilt * 0.12, z, -tilt);
    }
    // A parked car, about 4.3 m long, its length along x before the turn ry.
    function car(m, x, z, ry = 0, y = 0) {
      at(x, y, z, () => {
        box(m, 4.3, 0.62, 1.75, 0, 0.62, 0); box(m, 2.4, 0.55, 1.58, -0.2, 1.2, 0);
        box('winDim', 2.2, 0.4, 1.62, -0.2, 1.22, 0); box('winDim', 2.44, 0.4, 1.36, -0.2, 1.22, 0);
        for (const [wx, wz] of [[-1.4, -0.8], [1.4, -0.8], [-1.4, 0.8], [1.4, 0.8]]) put('binK', new THREE.CylinderGeometry(0.32, 0.32, 0.22, 10).rotateX(Math.PI / 2), wx, 0.32, wz);
      }, ry);
    }
    // A wood pole of height h. arm: the crossarm runs along 'x' or 'z'.
    function pole(x, z, h = 10.6, arm = 'z') {
      put('pole', new THREE.CylinderGeometry(0.12, 0.17, h, 8), x, h / 2, z);
      if (!arm) return;
      const ax = arm === 'x';
      box('pole', ax ? 2.4 : 0.12, 0.14, ax ? 0.12 : 2.4, x, h - 0.65, z);
      for (const d of [-1, 1]) put('trim', new THREE.CylinderGeometry(0.04, 0.05, 0.14, 6), x + (ax ? d : 0), h - 0.52, z + (ax ? 0 : d));
    }
    // A wire from a to b (Vector3) that sags and sways. Returns a handle for wireAt.
    function wire(a, b, sag, r = 0.018, amp = 0.05) {
      const N = 40, S = 5, base = wirePos.length / 3, ph = wireN++ * 1.7;
      const t = V(0, 0, 0).subVectors(b, a).normalize(), n1 = V(0, 0, 0).crossVectors(t, UP).normalize(), n2 = V(0, 0, 0).crossVectors(n1, t);
      for (let i = 0; i <= N; i++) {
        const u = i / N, w = 4 * u * (1 - u), cx = lerp(a.x, b.x, u), cy = lerp(a.y, b.y, u) - sag * w, cz = lerp(a.z, b.z, u);
        for (let j = 0; j < S; j++) {
          const c = Math.cos(j / S * 6.2832) * r, s = Math.sin(j / S * 6.2832) * r;
          wirePos.push(cx + n1.x * c + n2.x * s, cy + n1.y * c + n2.y * s, cz + n1.z * c + n2.z * s);
          wireSw.push(n1.x * w * amp, n1.z * w * amp, ph);
        }
      }
      for (let i = 0; i < N; i++) for (let j = 0; j < S; j++) {
        const p = base + i * S + j, q = base + i * S + (j + 1) % S;
        wireIdx.push(p, q, p + S, q, q + S, p + S);
      }
      return { a, b, sag, amp, ph, n1 };
    }
    // The point on a wire at fraction u (0 to 1) at time t, with its sway.
    function wireAt(w, u, t) {
      const k = 4 * u * (1 - u), s = k * w.amp * Math.sin(t * 1.3 + w.ph);
      return V(lerp(w.a.x, w.b.x, u) + w.n1.x * s, lerp(w.a.y, w.b.y, u) - w.sag * k + k * w.amp * 0.35 * Math.sin(t * 0.9 + w.ph * 1.7), lerp(w.a.z, w.b.z, u) + w.n1.z * s);
    }
    // A street tree at x, z. hero: bigger, and its leaves stir. bare: no leaves.
    function tree(x, z, seed, { hero = false, bare = false, size = 1 } = {}) {
      const R = rng(seed), k = (hero ? 1 : 0.85 + R() * 0.3) * size, fork = V(x, 3.3 * k, z);
      limb('bark', V(x, 0, z), fork, 0.3 * k, 0.21 * k);
      const n = hero ? 6 : 4;
      for (let i = 0; i < n; i++) {
        const a = (i + R() * 0.7) / n * 6.2832, r = (1.5 + R() * 1.4) * k, h = (2.4 + R() * 2.2) * k;
        const end = V(x + Math.cos(a) * r, fork.y + h, z + Math.sin(a) * r), mid = fork.clone().lerp(end, 0.55);
        limb('bark', fork, end, 0.15 * k, 0.045 * k);
        const a2 = a + (R() - 0.5) * 2.4, end2 = V(mid.x + Math.cos(a2) * r * 0.65, mid.y + h * 0.35, mid.z + Math.sin(a2) * r * 0.65);
        limb('bark', mid, end2, 0.07 * k, 0.03 * k);
        for (const [p, s] of [[end, 0.78], [end2, 0.62], [mid, 0.5]]) {
          if (bare || (hero && R() < 0.12)) continue;
          const q = V(p.x, p.y + 0.15, p.z).applyMatrix4(base);
          blobD.push({ x: q.x, y: q.y, z: q.z, s: s * (0.8 + R() * 0.6) * (hero ? 1 : 1.7) * size, ph: R() * 6.28, c: Math.floor(R() * 3), ry: R() * 6.28, hero });
        }
      }
    }
    // Leaves on the ground. place(R) returns [x, y, z] for each of n leaves.
    function litter(n, place, seed = 3) {
      const R = rng(seed), mesh = new THREE.InstancedMesh(leafGeo, flatMat, n);
      for (let i = 0; i < n; i++) {
        const [x, y, z] = place(R);
        dummy.position.set(x, y + R() * 0.01, z); dummy.rotation.set(-Math.PI / 2, 0, R() * 6.28); dummy.scale.setScalar(0.6 + R() * 0.5); dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix); mesh.setColorAt(i, LEAF[Math.floor(R() * 3)]);
      }
      mesh.receiveShadow = true;
      group.add(mesh);
    }
    // Leaves that fall. place(R) returns each start [x, y, z]; ground is their rest height.
    // The card's `leaves` sets how many fall; `wind` pushes them along x.
    function fall(n, place, ground = 0.035, seed = 9) {
      const R = rng(seed), mesh = new THREE.InstancedMesh(leafGeo, flatMat, n), d = [];
      for (let i = 0; i < n; i++) { const [x, y, z] = place(R); d.push({ x, y, z, per: 7 + R() * 6, ph: R() }); mesh.setColorAt(i, LEAF[Math.floor(R() * 3)]); }
      mesh.castShadow = true;
      mesh.frustumCulled = false;
      group.add(mesh);
      falls.push({ mesh, d, ground, n });
    }
    // Chimney smoke that rises from x, y, z. The card's `smoke` sets its strength.
    function smoke(x, y, z) {
      const pts = new THREE.Points(new THREE.BufferGeometry(), new THREE.ShaderMaterial({
        uniforms: { ...smokeU, uAt: { value: V(x, y, z) } }, transparent: true, depthWrite: false,
        vertexShader: /* glsl */`
          attribute float aS; uniform float uT, uPx, uWind; uniform vec3 uAt; varying float vA;
          void main() {
            float life = fract(uT * 0.05 + aS), r2 = fract(aS * 7.31);
            vec3 p = uAt + vec3(uWind * life * life * 5.0 + sin(uT * 0.5 + aS * 30.0) * 0.25 * life, life * 5.0, (r2 - 0.5) * 0.7 * life);
            vA = sin(3.14159 * life) * (1.0 - life * 0.5);
            vec4 mv = viewMatrix * vec4(p, 1.0);
            gl_Position = projectionMatrix * mv;
            gl_PointSize = (0.5 + life * 2.6) * uPx / -mv.z;
          }`,
        fragmentShader: 'uniform float uA; uniform vec3 uCol; varying float vA; void main() { float a = smoothstep(0.5, 0.08, length(gl_PointCoord - 0.5)); gl_FragColor = vec4(uCol, a * vA * uA); }',
      }));
      pts.geometry.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(16 * 3), 3));
      pts.geometry.setAttribute('aS', new THREE.Float32BufferAttribute(Array.from({ length: 16 }, (_, i) => i / 16 + hash(i) * 0.04), 1));
      pts.frustumCulled = false;
      group.add(pts);
    }
    // A wet, mirror road: w along x, d along z, centre x, z, at height y.
    // It shows only when the card says wet: true. Put a dry road just below it.
    function wetRoad(w, d, x, y, z, base = col(0.2, 0.02, 265)) {
      const road = new Reflector(new THREE.PlaneGeometry(w, d), {
        textureWidth: 1024, textureHeight: 576, clipBias: 0.003, multisample: 0,
        shader: {
          uniforms: {
            color: { value: null }, tDiffuse: { value: null }, textureMatrix: { value: null }, uT: { value: 0 },
            uBase: { value: base }, uFog: { value: new THREE.Color() }, uFogD: { value: 0.01 }, uLamp: { value: V(0, -99, 0) }, uLampCol: { value: col(0.84, 0.13, 68) }, uRain: { value: 1 },
          },
          vertexShader: 'uniform mat4 textureMatrix; varying vec4 vUv; varying vec3 vW; void main() { vUv = textureMatrix * vec4(position, 1.0); vW = (modelMatrix * vec4(position, 1.0)).xyz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
          fragmentShader: /* glsl */`
            uniform sampler2D tDiffuse; uniform float uT, uFogD, uRain; uniform vec3 uBase, uFog, uLamp, uLampCol;
            varying vec4 vUv; varying vec3 vW;
            ${NOISE}
            vec2 rings(vec2 p, float t) {
              vec2 o = vec2(0.0);
              for (int k = 0; k < 2; k++) {
                vec2 q = p * (1.5 + float(k) * 0.9) + float(k) * 17.3, c = floor(q), f = fract(q) - 0.5;
                float ph = fract(nH(c) + t * (0.5 + 0.3 * nH(c + 3.1)));
                vec2 d = f - (vec2(nH(c + 1.7), nH(c + 5.3)) - 0.5) * 0.5;
                float r = length(d), w = ph * 0.45;
                o += normalize(d + 1e-4) * sin((r - w) * 42.0) * smoothstep(0.07, 0.0, abs(r - w)) * (1.0 - ph);
              }
              return o;
            }
            void main() {
              vec2 p = vW.xz;
              float pud = smoothstep(0.44, 0.6, nV(p * 0.3) * 0.65 + nV(p * 1.1) * 0.35);
              vec2 n = rings(p, uT) * 0.014 * (0.35 + pud) * uRain;
              float rough = (nV(p * 11.0) - 0.5) * mix(0.05, 0.004, pud), s = mix(0.028, 0.003, pud);
              vec3 r = vec3(0.0);
              for (int i = 0; i < 5; i++) r += texture2DProj(tDiffuse, vUv + vec4(n.x, n.y + rough + (float(i) - 2.0) * s, 0.0, 0.0) * vUv.w).rgb;
              r *= 0.2;
              vec3 Vd = normalize(cameraPosition - vW);
              float F = 0.04 + 0.96 * pow(1.0 - max(Vd.y, 0.0), 5.0);
              vec2 l = p - uLamp.xz;
              vec3 base = uBase * (0.8 + 0.4 * nV(p * 16.0)) * (1.0 - 0.45 * pud) + uLampCol * 0.03 * exp(-dot(l, l) / 40.0);
              vec3 c = mix(base, r, clamp(F * mix(0.6, 1.0, pud) * 1.5, 0.0, 1.0));
              float d = distance(cameraPosition, vW);
              gl_FragColor = vec4(mix(c, uFog, 1.0 - exp(-uFogD * uFogD * d * d)), 1.0);
            }`,
        },
      });
      road.rotation.x = -Math.PI / 2;
      road.position.set(x, y, z);
      group.add(road);
      roads.push(road);
      return road;
    }
    // A crow, about 0.45 m long, feet at its origin, facing +z.
    // pose(t, mode, yaw): mode is 'idle', 'rain', 'peck' or 'caw'.
    function crow() {
      const obj = new THREE.Group(), bodyG = new THREE.Group(), head = new THREE.Group();
      obj.rotation.order = head.rotation.order = 'YXZ';
      const body = mergeGeometries([
        ico(0.085, 0.082, 0.17).rotateX(-0.45).translate(0, 0.15, 0),
        ico(0.028, 0.06, 0.15).rotateX(-0.55).translate(0.078, 0.15, -0.03), ico(0.028, 0.06, 0.15).rotateX(-0.55).translate(-0.078, 0.15, -0.03),
        ni(new THREE.BoxGeometry(0.075, 0.014, 0.19)).rotateX(-0.6).translate(0, 0.07, -0.2),
        ni(new THREE.CylinderGeometry(0.008, 0.008, 0.09, 4)).translate(0.03, 0.04, 0.01), ni(new THREE.CylinderGeometry(0.008, 0.008, 0.09, 4)).translate(-0.03, 0.04, 0.01),
      ]);
      const skull = mergeGeometries([ico(0.055, 0.052, 0.062), ni(new THREE.ConeGeometry(0.02, 0.09, 5)).rotateX(Math.PI / 2).translate(0, 0.002, 0.088)]);
      const jaw = new THREE.Mesh(ni(new THREE.ConeGeometry(0.014, 0.075, 4)).rotateX(Math.PI / 2).translate(0, -0.012, 0.045), crowMat);
      jaw.position.set(0, 0, 0.04);
      const eyes = new THREE.Mesh(mergeGeometries([new THREE.SphereGeometry(0.006, 6, 4).translate(0.043, 0.012, 0.032), new THREE.SphereGeometry(0.006, 6, 4).translate(-0.043, 0.012, 0.032)]), new THREE.MeshBasicMaterial({ color: col(0.5, 0.02, 250) }));
      bodyG.add(new THREE.Mesh(body, crowMat));
      head.add(new THREE.Mesh(skull, crowMat), jaw, eyes);
      head.position.set(0, 0.245, 0.105);
      obj.add(bodyG, head);
      obj.traverse(o => { if (o.isMesh) o.castShadow = true; });
      group.add(obj);
      // The head snaps between looks, as a bird's does.
      function pose(t, mode = 'idle', yaw0 = 0) {
        const k = Math.floor(t / 1.9), s = smooth(0, 0.14, t / 1.9 - k);
        let yaw = lerp(hash(k) - 0.5, hash(k + 1) - 0.5, s) * 1.9, pitch = lerp(hash(k + 40) - 0.5, hash(k + 41) - 0.5, s) * 0.5;
        let lean = 0, roll = 0, open = 0, squash = 1;
        if (mode === 'rain') { squash = 0.9; pitch = pitch * 0.4 + 0.25; const v = t % 9; if (v < 0.7) roll = Math.sin(v * 46) * 0.16 * Math.sin(v / 0.7 * Math.PI); }
        if (mode === 'peck') { const v = t % 5.2; if (v < 1.5) { lean = Math.abs(Math.sin(v / 1.5 * Math.PI * 3)) * 0.85; yaw *= 0.2; pitch = 0.3; } }
        if (mode === 'caw') { const v = t % 7.5; if (v > 5.6 && v < 7.1) { open = Math.abs(Math.sin((v - 5.6) / 1.5 * Math.PI * 3)); lean = 0.22 * open; pitch = -0.45 * open; yaw *= 0.3; } }
        obj.rotation.set(lean, yaw0, roll);
        bodyG.scale.set(1, squash + open * 0.05, 1);
        head.rotation.set(pitch, yaw, 0);
        jaw.rotation.x = open * 0.5;
      }
      return { obj, pose };
    }
    // Turns the buckets, wires and tree leaves into meshes.
    function finish() {
      for (const [m, list] of bucket) {
        const mesh = new THREE.Mesh(mergeGeometries(list), m);
        mesh.castShadow = !m.userData.noCast;
        mesh.receiveShadow = true;
        group.add(mesh);
      }
      bucket.clear();
      if (wirePos.length) {
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.Float32BufferAttribute(wirePos, 3));
        g.setAttribute('aSw', new THREE.Float32BufferAttribute(wireSw, 3));
        g.setIndex(wireIdx);
        const wm = new THREE.MeshBasicMaterial({ color: wireCol, side: THREE.DoubleSide });
        wm.onBeforeCompile = sh => {
          sh.uniforms.uT = uT;
          sh.vertexShader = 'attribute vec3 aSw; uniform float uT;\n' + sh.vertexShader.replace('#include <begin_vertex>',
            '#include <begin_vertex>\n transformed.xz += aSw.xy * sin(uT * 1.3 + aSw.z); transformed.y += length(aSw.xy) * 0.35 * sin(uT * 0.9 + aSw.z * 1.7);');
        };
        const wires = new THREE.Mesh(g, wm);
        wires.frustumCulled = false;
        group.add(wires);
      }
      if (blobD.length) {
        blobs = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), leafMat, blobD.length);
        blobD.forEach((b, i) => {
          dummy.position.set(b.x, b.y, b.z); dummy.rotation.set(0, b.ry, 0); dummy.scale.set(b.s, b.s * 0.8, b.s); dummy.updateMatrix();
          blobs.setMatrixAt(i, dummy.matrix); blobs.setColorAt(i, LEAF[b.c]);
        });
        blobs.castShadow = blobs.receiveShadow = true;
        group.add(blobs);
      }
    }
    // The per-frame work the kit does for a place.
    function frame(t, card) {
      if (blobs) {
        const a = 0.05 + Math.abs(card.wind) * 0.06;
        blobD.forEach((b, i) => {
          if (!b.hero) return;
          dummy.position.set(b.x + Math.sin(t * 0.9 + b.ph) * a, b.y + Math.sin(t * 1.3 + b.ph * 2) * a * 0.4, b.z + Math.cos(t * 0.7 + b.ph) * a);
          dummy.rotation.set(0, b.ry + Math.sin(t * 0.5 + b.ph) * 0.05, 0); dummy.scale.set(b.s, b.s * 0.8, b.s); dummy.updateMatrix();
          blobs.setMatrixAt(i, dummy.matrix);
        });
        blobs.instanceMatrix.needsUpdate = true;
      }
      for (const f of falls) {
        const n = Math.min(f.n, card.leaves);
        f.mesh.count = n;
        for (let i = 0; i < n; i++) {
          const L = f.d[i], u = (t / L.per + L.ph) % 1, q = Math.min(1, u * 1.3);
          dummy.position.set(L.x + card.wind * q * 4 + Math.sin(t * 1.7 + L.ph * 40) * 0.35 * q, lerp(L.y, f.ground, q), L.z + Math.cos(t * 1.3 + L.ph * 31) * 0.3 * q);
          if (q < 1) dummy.rotation.set(t * 2.1 + L.ph * 9, t * 1.3, Math.sin(t * 3 + L.ph * 20)); else dummy.rotation.set(-Math.PI / 2, 0, L.ph * 6);
          dummy.scale.setScalar(smooth(0, 0.04, u) * (1 - smooth(0.94, 1, u))); dummy.updateMatrix();
          f.mesh.setMatrixAt(i, dummy.matrix);
        }
        f.mesh.instanceMatrix.needsUpdate = true;
      }
      for (const r of roads) r.material.uniforms.uT.value = t;
      for (const fn of frameHooks) fn(t, card);
    }
    const k = {
      THREE, group, at, put, box, limb, gableHouse, win, fence, cart, car, pole, wire, wireAt, tree, litter, fall, smoke, wetRoad, crow,
      // onCard(fn): fn(card) runs when a card of this place shows.
      onCard: fn => cardHooks.push(fn),
      // onFrame(fn): fn(t, card) runs each frame; t is seconds.
      onFrame: fn => frameHooks.push(fn),
    };
    return { k, group, finish, frame, cardHooks, roads };
  }

  /* ----- cards ----- */
  const places = mods.map(mod => ({ mod, built: null }));
  const cards = [];
  places.forEach(p => p.mod.cards.forEach(c => cards.push({ ...CARD, ...c, sky: { ...CARD.sky, ...c.sky }, grade: { ...CARD.grade, ...c.grade }, shadow: { ...CARD.shadow, ...c.shadow }, place: p })));
  let card = cards[0], cardI = -1, low = false;
  function apply(i) {
    cardI = i; card = cards[i];
    const p = card.place;
    if (!p.built) { const b = builder(); p.mod.build(b.k); b.finish(); p.built = b; }
    for (const q of places) if (q.built) q.built.group.visible = q === p;
    const s = skyAt(card.hour), k = card.sky;
    for (const key of ['zen', 'mid', 'band', 'anti']) skyU['u' + key[0].toUpperCase() + key.slice(1)].value.fromArray(s[key]);
    skyU.uStars.value = k.stars ?? s.stars;
    SUN.set(...card.sun).normalize();
    FOG.copy(card.fog);
    scene.fog.color.copy(card.fog); scene.fog.density = card.fogD;
    skyU.uSunCol.value.copy(k.sunCol); skyU.uCloud.value.copy(k.cloud); skyU.uCloudLit.value.copy(k.cloudLit);
    skyU.uCloudA.value = k.cloudA; skyU.uCov.value = k.cov; skyU.uHazeA.value = k.hazeA; skyU.uHazeK.value = k.hazeK; skyU.uDisc.value = k.disc;
    const sh = card.shadow, sc = sunLight.shadow.camera;
    sunLight.target.position.set(...sh.at);
    sunLight.position.copy(SUN).multiplyScalar(70).add(sunLight.target.position);
    Object.assign(sc, { left: -sh.r, right: sh.r, top: sh.r, bottom: -sh.r, near: 1, far: 150 });
    sc.updateProjectionMatrix();
    sunLight.color.copy(card.sunCol); sunLight.intensity = card.sunI;
    hemi.color.copy(card.hemi[0]); hemi.groundColor.copy(card.hemi[1]); hemi.intensity = card.hemi[2];
    renderer.toneMappingExposure = card.exposure;
    M.winLit.emissiveIntensity = card.win; M.winTV.emissiveIntensity = card.tv;
    leafMat.emissiveIntensity = card.glow;
    rain.visible = card.rain > 0; rainU.uA.value = card.rain; rainU.uLamp.value.set(...card.rainLamp);
    for (const r of p.built.roads) {
      const u = r.material.uniforms;
      r.visible = card.wet; u.uFogD.value = card.fogD; u.uFog.value.copy(card.fog); u.uLamp.value.set(...card.rainLamp); u.uRain.value = card.rain > 0 ? 1 : 0;
    }
    smokeU.uA.value = card.smoke; smokeU.uWind.value = card.wind * 1.2; smokeU.uCol.value.copy(card.smokeCol);
    flock.visible = card.flock > 0; flockGeo.instanceCount = Math.min(70, card.flock); flockU.uDir.value = card.flockDir; flockU.uCol.value.copy(card.flockCol);
    mtn.forEach((m, j) => { m.visible = !!card.mtn; if (card.mtn) m.material.color.copy(card.mtn[j]); });
    ski.visible = card.ski;
    [bloom.strength, bloom.radius, bloom.threshold] = card.bloom;
    const g = card.grade, u = grade.uniforms;
    u.uCon.value = g.con; u.uSat.value = g.sat; u.uVig.value = g.vig; u.uGrain.value = g.grain; u.uLift.value.fromArray(g.lift); u.uGain.value.fromArray(g.gain);
    for (const fn of p.built.cardHooks) fn(card);
    frameCamera();
    onCard(i, card);
  }
  // Narrow screens widen the lens, so the subject always fits.
  function frameCamera() {
    const c = card.cam, asp = view.w / view.h, n = 0.1;
    let tu = Math.tan(c.up * RAD), td = Math.tan(c.down * RAD);
    const half = asp * (tu + td) / 2;
    if (half < c.minHalf) { tu *= c.minHalf / half; td *= c.minHalf / half; }
    const hw = asp * (tu + td) / 2;
    camera.projectionMatrix.makePerspective(-n * hw, n * hw, n * tu, -n * td, n, 1500);
    camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
    camera.position.set(...c.pos);
    camera.rotation.set((c.pitch || 0) * RAD, (c.yaw || 0) * RAD, 0, 'YXZ');
    camera.updateMatrixWorld();
    sky.position.copy(camera.position);
    rainU.uCam.value.copy(camera.position);
    view.px = view.h * view.dpr / (tu + td);
    smokeU.uPx.value = view.px;
    const on = !!card.tilt && !low;
    tiltH.enabled = tiltV.enabled = on;
    if (on) for (const p of [tiltH, tiltV]) { p.uniforms.uFocus.value = card.tilt[0]; p.uniforms.uBand.value = card.tilt[1]; p.uniforms.uAmount.value = card.tilt[2]; }
  }

  /* ----- the loop ----- */
  let reduce = reduced(), raf = 0, visible = true, last = 0, T = 21.3, slow = 0, frames = 0;
  function draw() {
    uT.value = T;
    if (card.tv) M.winTV.emissiveIntensity = card.tv * (0.55 + 0.45 * hash(Math.floor(T * 3.3)));
    card.place.built.frame(T, card);
    grade.uniforms.uSeed.value = Math.floor(T * 12);
    composer.render();
    canvas.classList.add('on');
  }
  function kick() { if (!raf && visible) raf = requestAnimationFrame(frame); }
  function frame(now) {
    raf = 0;
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60;
    last = now;
    if (!reduce) T += dt;
    draw();
    // Slow frames: drop the pixel ratio and the blur once.
    if (!low && !reduce && ++frames > 30) { slow += dt; if (frames === 150 && slow / 120 > 0.024) { low = true; resize(); } }
    // Reduced motion holds one frame; a key or a resize draws the next.
    if (!reduce) kick(); else last = 0;
  }
  function resize() {
    const w = stage.clientWidth || 1, h = stage.clientHeight || 1, dpr = pixelRatio(w, h, { maxDpr: 2, low });
    Object.assign(view, { w, h, dpr });
    renderer.setPixelRatio(dpr); renderer.setSize(w, h, false);
    composer.setPixelRatio(dpr); composer.setSize(w, h);
    // The bloom works at half size; its glow is soft anyway.
    bloom.setSize(w * dpr / 2, h * dpr / 2);
    for (const p of places) if (p.built) for (const r of p.built.roads) r.getRenderTarget().setSize(Math.round(w * dpr / 2), Math.round(h * dpr / 2));
    for (const p of [tiltH, tiltV, grade]) p.uniforms.uRes.value.set(w * dpr, h * dpr);
    frameCamera();
    kick();
  }
  function pick(i) {
    if (i === cardI || !cards[i]) return;
    apply(i);
    resize();
  }
  onReducedChange(v => { reduce = v; kick(); });
  new ResizeObserver(resize).observe(stage);
  whenVisible(stage, v => { visible = v; if (v) kick(); else { cancelAnimationFrame(raf); raf = 0; last = 0; } });
  return { cards, pick };
}
