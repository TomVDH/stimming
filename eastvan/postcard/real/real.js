// East Van postcard 1, the realistic study: the house lot in the rain.
// Same lens, hour and weather as the block-out card.
// Axes: x is east, -z is north, y is up. Units are metres.
// Every texture UV is in metres; each texture's repeat sets its tile size.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { whenVisible, reduced, onReducedChange, linFit, pixelRatio } from '../../../shared/stim.js';
import { SKY, skyAt } from '../../../shared/sky.js';
import { GRADE } from '../../../shared/grade.js';

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const hash = n => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const col = (L, C, h, k = 1) => new THREE.Color().setRGB(...linFit(L, C, h)).multiplyScalar(k);
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const RAD = Math.PI / 180, UP = V(0, 1, 0);
function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const ni = g => (g.index ? g.toNonIndexed() : g);
const NOISE = /* glsl */`
float nH(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float nV(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(nH(i), nH(i + vec2(1, 0)), f.x), mix(nH(i + vec2(0, 1)), nH(i + vec2(1, 1)), f.x), f.y); }
float nF(vec2 p) { float a = 0.5, s = 0.0; for (int i = 0; i < 5; i++) { s += a * nV(p); p = p * 2.03 + 7.1; a *= 0.5; } return s; }
`;

/* ---------- textures ---------- */
const loader = new THREE.TextureLoader();
const wrap = (t, tile, srgb) => { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1 / tile, 1 / tile); t.anisotropy = 8; if (srgb) t.colorSpace = THREE.SRGBColorSpace; return t; };
// A downloaded set: colour, normal, and AO with roughness. tile is its size in metres.
function pbrSet(name, tile) {
  const at = m => new URL(`./assets/${name}_${m}_1k.jpg`, import.meta.url).href;
  const arm = wrap(loader.load(at('arm')), tile);
  return { map: wrap(loader.load(at('diff')), tile, true), normalMap: wrap(loader.load(at('nor_gl')), tile), roughnessMap: arm, aoMap: arm };
}
// A painted texture. draw(g, w, h) paints it; tile is its size in metres.
function canvasTex(w, h, tile, draw, srgb = true) {
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  draw(cv.getContext('2d'), w, h);
  return wrap(new THREE.CanvasTexture(cv), tile, srgb);
}
const R0 = rng(11);
const shingleTex = canvasTex(512, 512, 1.6, (g, w, h) => {
  g.fillStyle = '#8a8a8a'; g.fillRect(0, 0, w, h);
  for (let r = 0; r < 12; r++) for (let c = -1; c < 9; c++) {
    const x = (c + (r % 2) * 0.5) * 64, y = r * 43, v = 96 + R0() * 70;
    const gr = g.createLinearGradient(0, y, 0, y + 43);
    gr.addColorStop(0, `rgb(${v + 30},${v + 30},${v + 30})`); gr.addColorStop(0.85, `rgb(${v},${v},${v})`); gr.addColorStop(1, '#222');
    g.fillStyle = gr; g.fillRect(x + 1, y, 62, 43);
  }
}, false);
const scallopTex = canvasTex(512, 512, 1.2, (g, w, h) => {
  g.fillStyle = '#3a3a3a'; g.fillRect(0, 0, w, h);
  for (let r = 13; r >= -1; r--) for (let c = -1; c < 9; c++) {
    const x = (c + (r % 2) * 0.5) * 64 + 32, y = r * 40, v = 150 + R0() * 60;
    const gr = g.createLinearGradient(0, y, 0, y + 56);
    gr.addColorStop(0, `rgb(${v + 30},${v + 30},${v + 30})`); gr.addColorStop(1, `rgb(${v - 40},${v - 40},${v - 40})`);
    g.fillStyle = gr; g.beginPath(); g.moveTo(x - 31, y); g.lineTo(x - 31, y + 26); g.arc(x, y + 26, 31, Math.PI, 0, true); g.lineTo(x + 31, y); g.fill();
  }
}, false);
const brickTex = canvasTex(512, 512, 1.8, (g, w, h) => {
  g.fillStyle = '#6f6a66'; g.fillRect(0, 0, w, h);
  for (let r = 0; r < 24; r++) for (let c = -1; c < 9; c++) {
    const v = R0();
    g.fillStyle = `rgb(${120 + v * 60},${58 + v * 26},${44 + v * 18})`;
    g.fillRect((c + (r % 2) * 0.5) * 64 + 2, r * 21.33 + 2, 60, 17.5);
  }
});
const grainTex = canvasTex(256, 256, 1.5, (g, w, h) => {
  const d = g.createImageData(w, h);
  for (let i = 0; i < d.data.length; i += 4) { const v = 110 + R0() * 90; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; }
  g.putImageData(d, 0, 0);
}, false);
const latticeTex = canvasTex(64, 64, 0.22, (g, w, h) => {
  g.strokeStyle = '#fff'; g.lineWidth = 13;
  g.beginPath(); g.moveTo(-8, -8); g.lineTo(w + 8, h + 8); g.moveTo(w + 8, -8); g.lineTo(-8, h + 8); g.moveTo(-40, 24); g.lineTo(24, -40); g.moveTo(40, h + 40); g.lineTo(w + 40, 40); g.stroke();
});
const linkTex = canvasTex(32, 32, 0.075, (g, w, h) => {
  g.strokeStyle = '#d5d8dc'; g.lineWidth = 1.8;
  g.beginPath(); g.moveTo(-2, -2); g.lineTo(w + 2, h + 2); g.moveTo(w + 2, -2); g.lineTo(-2, h + 2); g.stroke();
});
const leafTex = canvasTex(64, 64, 1, (g, w, h) => {
  g.fillStyle = '#fff'; g.translate(32, 34); g.beginPath();
  for (let i = 0; i <= 20; i++) { const a = i / 20 * Math.PI * 2 - Math.PI / 2, r = 14 + 14 * Math.abs(Math.cos(a * 2.5)); g.lineTo(Math.cos(a) * r, Math.sin(a) * r * 0.95); }
  g.fill(); g.fillRect(-1.5, 20, 3, 10);
});
// A lit curtain seen through glass: pleats, and a darker hem.
const curtainTex = (a, b) => canvasTex(256, 256, 1, (g, w, h) => {
  for (let x = 0; x < w; x++) {
    const p = 0.9 + 0.1 * Math.sin(x * 0.22) * Math.sin(x * 0.037 + 1), gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, a); gr.addColorStop(1, b);
    g.fillStyle = gr; g.globalAlpha = 1; g.fillRect(x, 0, 1, h);
    g.fillStyle = '#000'; g.globalAlpha = 1 - p; g.fillRect(x, 0, 1, h);
  }
});
const plateTex = canvasTex(128, 56, 1, (g, w, h) => {
  g.fillStyle = '#e9dfca'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#1c1c1c'; g.font = '700 44px ui-monospace, monospace'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('1687', w / 2, h / 2 + 3);
});

/* ---------- geometry in metres ---------- */
// A box whose UVs are in metres, at a random place on the texture.
function mBox(w, h, d) {
  const g = new THREE.BoxGeometry(w, h, d), uv = g.attributes.uv, dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]], ox = R0() * 9, oy = R0() * 9;
  for (let f = 0; f < 6; f++) for (let i = 0; i < 4; i++) { const k = f * 4 + i; uv.setXY(k, ox + uv.getX(k) * dims[f][0], oy + uv.getY(k) * dims[f][1]); }
  return g;
}
function mCyl(rt, rb, h, seg = 10) {
  const g = new THREE.CylinderGeometry(rt, rb, h, seg, 1), uv = g.attributes.uv, c = Math.PI * (rt + rb);
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * c, uv.getY(i) * h);
  return g;
}
function mPlane(w, h) {
  const g = new THREE.PlaneGeometry(w, h), uv = g.attributes.uv, ox = R0() * 9, oy = R0() * 9;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, ox + uv.getX(i) * w, oy + uv.getY(i) * h);
  return g;
}

// Starts the page in `stage`. Returns { resize, still }.
export function start(stage) {
  const canvas = document.createElement('canvas');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
  stage.prepend(canvas);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  const FOG = col(0.22, 0.05, 262);
  scene.fog = new THREE.FogExp2(FOG, 0.011);
  // The projection is set by hand: a shift lens keeps verticals straight.
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 1500);
  camera.position.set(0.4, 1.2, 12.6);
  const view = { w: 1, h: 1, dpr: 1 };
  const uT = { value: 0 }, dummy = new THREE.Object3D();

  /* ----- materials ----- */
  const asphalt = pbrSet('asphalt_02', 3), planks = pbrSet('white_planks_clean', 1.8), concrete = pbrSet('concrete_floor_02', 2), bark = pbrSet('bark_brown_02', 1), grass = pbrSet('leafy_grass', 2.4);
  const std = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.6, ...o });
  // Rain makes a surface darker and smoother. Low spots hold puddles.
  function wet(m, puddles = 0) {
    m.onBeforeCompile = sh => {
      sh.vertexShader = 'varying vec3 vWp;\n' + sh.vertexShader.replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\n vWp = (modelMatrix * vec4(transformed, 1.0)).xyz;');
      sh.fragmentShader = 'varying vec3 vWp;\n' + NOISE + sh.fragmentShader
        .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
          float pud = ${puddles.toFixed(2)} * smoothstep(0.5, 0.62, nV(vWp.xz * 0.45) * 0.6 + nV(vWp.xz * 1.7) * 0.4);
          roughnessFactor = mix(roughnessFactor, 0.04, pud); diffuseColor.rgb *= mix(1.0, 0.55, pud);`)
        .replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\n normal = normalize(mix(normal, nonPerturbedNormal, pud));');
    };
    // The shader text differs by puddle amount; so must its cache key.
    m.customProgramCacheKey = () => 'wet' + puddles;
    return m;
  }
  const paint = (L, C, h, o) => std(col(L, C, h), { roughness: 0.42, ...o });
  const M = {
    siding: std(col(0.56, 0.1, 195), { ...planks, roughness: 0.75, aoMap: null }),
    sidingP: std(col(0.5, 0.11, 310), { ...planks, roughness: 0.75, aoMap: null }),
    trim: paint(0.9, 0.03, 92), door: paint(0.56, 0.2, 30, { roughness: 0.3 }),
    gable: std(col(0.78, 0.14, 86), { bumpMap: scallopTex, bumpScale: 3, roughness: 0.7 }),
    roof: std(col(0.3, 0.012, 262), { map: shingleTex, bumpMap: shingleTex, bumpScale: 2.5, roughness: 0.55 }),
    deck: std(col(0.5, 0.025, 75), { ...planks, roughness: 0.6, aoMap: null }),
    found: wet(std(col(0.5, 0.02, 200), { ...concrete, roughness: 0.9 })),
    walk: wet(std(col(0.72, 0.01, 90), { ...concrete, roughness: 0.8 }), 1),
    curb: wet(std(col(0.78, 0.008, 90), { ...concrete, roughness: 0.7 })),
    lawn: std(col(0.62, 0.05, 130), { ...grass, roughness: 0.9 }),
    soil: std(col(0.25, 0.03, 50), { bumpMap: grainTex, bumpScale: 2, roughness: 0.8 }),
    bark: std(col(0.5, 0.03, 60), { ...bark, roughness: 0.8 }), twig: std(col(0.16, 0.02, 50), { roughness: 0.7 }),
    pole: std(col(0.3, 0.035, 60), { ...bark, roughness: 0.85, aoMap: null }),
    brick: std(col(0.75, 0.02, 40), { map: brickTex, bumpMap: brickTex, bumpScale: 1.5, roughness: 0.7 }),
    stucco: std(col(0.8, 0.02, 95), { bumpMap: grainTex, bumpScale: 1.2, roughness: 0.8 }),
    galv: std(col(0.7, 0.005, 250), { metalness: 0.85, roughness: 0.35 }), iron: std(col(0.14, 0.01, 260), { metalness: 0.6, roughness: 0.4 }),
    plastK: std(col(0.16, 0.006, 260), { roughness: 0.3 }), plastG: std(col(0.42, 0.13, 150), { roughness: 0.3 }), plastB: std(col(0.42, 0.14, 255), { roughness: 0.3 }), bagY: std(col(0.82, 0.15, 98), { roughness: 0.35 }),
    wood: std(col(0.45, 0.06, 70), { ...planks, roughness: 0.7, aoMap: null }), kale: std(col(0.36, 0.09, 150), { roughness: 0.5, flatShading: true }),
    bush: std(col(0.28, 0.07, 150), { roughness: 0.6, flatShading: true }), fir: std(col(0.2, 0.05, 165), { roughness: 0.8, flatShading: true }),
    couch: std(col(0.5, 0.1, 60), { bumpMap: grainTex, bumpScale: 1, roughness: 0.95 }),
    room: std(col(0.86, 0.04, 80), { roughness: 0.9 }), floor: std(col(0.45, 0.07, 60), { roughness: 0.5 }), dark: std(col(0.12, 0.01, 260), { roughness: 0.9 }),
    glass: std(col(0.1, 0.02, 250), { roughness: 0.04, transparent: true, opacity: 0.32, envMapIntensity: 3 }),
    blind: std(col(0.5, 0.02, 90), { roughness: 0.8 }),
    lattice: std(col(0.36, 0.05, 200), { alphaMap: latticeTex, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.6 }),
    link: std(col(0.75, 0.005, 250), { alphaMap: linkTex, alphaTest: 0.08, alphaToCoverage: true, side: THREE.DoubleSide, metalness: 0.7, roughness: 0.4 }),
    plate: std(0xffffff, { map: plateTex, roughness: 0.5 }),
    bulb: new THREE.MeshBasicMaterial({ color: col(0.9, 0.1, 75, 9) }), lampLens: new THREE.MeshBasicMaterial({ color: col(0.86, 0.13, 68, 14) }),
    curtainW: new THREE.MeshBasicMaterial({ map: curtainTex('#ffcf8f', '#ff9a4c'), color: new THREE.Color(1.5, 1.5, 1.5) }),
    curtainC: new THREE.MeshBasicMaterial({ map: curtainTex('#ffe9c8', '#f3c890'), color: new THREE.Color(1.1, 1.1, 1.1) }),
    tv: new THREE.MeshBasicMaterial({ color: col(0.7, 0.14, 250, 3) }),
    cat: std(col(0.08, 0.01, 60), { roughness: 0.9 }),
  };
  const NO_CAST = new Set([M.glass, M.link, M.lattice, M.bulb, M.lampLens, M.curtainW, M.curtainC, M.tv, M.lawn, M.plate]);
  // Parts that the depth and normal passes must not see.
  const ghosts = [];

  /* ----- buckets: one merged mesh per material ----- */
  const bucket = new Map(), m4 = new THREE.Matrix4(), q4 = new THREE.Quaternion(), e4 = new THREE.Euler(), s4 = V(1, 1, 1), p4 = V(0, 0, 0);
  function put(m, geo, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
    const g = ni(geo);
    g.applyMatrix4(m4.compose(p4.set(x, y, z), q4.setFromEuler(e4.set(rx, ry, rz)), s4));
    if (!bucket.has(m)) bucket.set(m, []);
    bucket.get(m).push(g);
  }
  const box = (m, w, h, d, x, y, z, rx, ry, rz) => put(m, mBox(w, h, d), x, y, z, rx, ry, rz);
  function limb(m, p0, p1, r0, r1, sides = 6) {
    const d = V(0, 0, 0).subVectors(p1, p0), len = d.length(), g = mCyl(r1, r0, len, sides).translate(0, len / 2, 0);
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(UP, d.normalize()));
    put(m, g, p0.x, p0.y, p0.z);
  }
  function flush() {
    for (const [m, list] of bucket) {
      const mesh = new THREE.Mesh(mergeGeometries(list), m);
      mesh.castShadow = !NO_CAST.has(m);
      mesh.receiveShadow = true;
      if (m === M.link || m === M.lattice) ghosts.push(mesh);
      scene.add(mesh);
    }
    bucket.clear();
  }

  /* ----- house parts ----- */
  // Lap siding: one tilted board per course, cut round the openings.
  // holes: [x0, x1, y0, y1]. The planks in the texture run along v.
  function lapWall(m, x0, x1, y0, y1, z, holes = []) {
    const E = 0.14;
    for (let y = y0; y < y1 - 0.02; y += E) {
      let segs = [[x0, x1]];
      for (const h of holes) if (y + E > h[2] && y < h[3]) segs = segs.flatMap(([a, b]) => (h[1] <= a || h[0] >= b ? [[a, b]] : [[a, Math.min(b, h[0])], [Math.max(a, h[1]), b]])).filter(s => s[1] - s[0] > 0.02);
      for (const [a, b] of segs) {
        const g = new THREE.BoxGeometry(b - a, E + 0.02, 0.016), uv = g.attributes.uv, p = g.attributes.position, u0 = (Math.floor(R0() * 18) + 0.3) * 0.1, v0 = R0() * 5;
        for (let i = 0; i < uv.count; i++) uv.setXY(i, u0 + (p.getY(i) / (E + 0.02) + 0.5) * 0.05, v0 + p.getX(i));
        put(m, g, (a + b) / 2, y + E / 2, z + 0.012, -0.07);
      }
    }
  }
  // A double-hung window in its casing. back: what shows behind the glass.
  function sash(x, y, z, w, h, back = null) {
    const T = M.trim;
    box(T, w + 0.26, 0.11, 0.05, x, y + h / 2 + 0.055, z + 0.035); box(T, w + 0.34, 0.03, 0.1, x, y + h / 2 + 0.125, z + 0.05);
    for (const s of [-1, 1]) { box(T, 0.11, h, 0.05, x + s * (w / 2 + 0.055), y, z + 0.035); box(T, 0.03, h, 0.15, x + s * (w / 2 - 0.015), y, z - 0.05); }
    box(T, w + 0.36, 0.05, 0.16, x, y - h / 2 - 0.02, z + 0.06, 0.12); box(T, w + 0.26, 0.09, 0.03, x, y - h / 2 - 0.095, z + 0.03);
    box(T, w, 0.03, 0.15, x, y + h / 2 - 0.015, z - 0.05);
    for (const [cy, zz] of [[y + h / 4, z - 0.025], [y - h / 4, z - 0.062]]) {
      const sh = h / 2;
      box(T, w - 0.06, 0.05, 0.035, x, cy + sh / 2 - 0.025, zz); box(T, w - 0.06, 0.06, 0.035, x, cy - sh / 2 + 0.03, zz);
      for (const s of [-1, 1]) box(T, 0.05, sh, 0.035, x + s * (w / 2 - 0.055), cy, zz);
      put(M.glass, new THREE.PlaneGeometry(w - 0.14, sh - 0.1), x, cy, zz);
    }
    if (back) put(back, mPlane(w - 0.06, h - 0.04), x, y, z - 0.13);
  }
  // A room behind a window: floor, ceiling and three walls.
  function room(x0, x1, y0, y1, zf, zb, wall = M.room) {
    const w = x1 - x0, h = y1 - y0, d = zf - zb, cx = (x0 + x1) / 2, cz = (zf + zb) / 2;
    box(M.floor, w, 0.05, d, cx, y0 + 0.025, cz); box(wall, w, 0.05, d, cx, y1 - 0.025, cz); box(wall, w, h, 0.05, cx, (y0 + y1) / 2, zb);
    box(wall, 0.05, h, d, x0, (y0 + y1) / 2, cz); box(wall, 0.05, h, d, x1, (y0 + y1) / 2, cz);
  }
  // A gable roof over a house: two slabs, bargeboards, soffit shadow, gutters.
  function roofOn(x, zf, w, d, eave, rise, ov = 0.5) {
    const th = Math.atan2(rise, w / 2), Ls = Math.hypot(rise, w / 2) + ov, zc = zf - d / 2;
    for (const s of [-1, 1]) {
      const cx = x + s * Math.cos(th) * Ls / 2, cy = eave + rise - Math.sin(th) * Ls / 2;
      box(M.roof, Ls, 0.1, d + 1.0, cx, cy + 0.12, zc, 0, 0, -s * th);
      box(M.trim, Ls, 0.24, 0.045, cx, cy + 0.02, zf + 0.5, 0, 0, -s * th); box(M.trim, Ls + 0.04, 0.06, 0.09, cx, cy + 0.15, zf + 0.5, 0, 0, -s * th);
      // The gutter and its downpipe.
      const gx = x + s * (w / 2 + ov * Math.cos(th) + 0.02), gy = eave - ov * Math.sin(th) + 0.02;
      box(M.galv, 0.12, 0.1, d + 1.0, gx, gy, zc); put(M.galv, mCyl(0.04, 0.04, gy - 0.3, 8), x + s * (w / 2 + 0.07), (gy - 0.3) / 2 + 0.3, zf - 0.1);
      box(M.galv, 0.06, 0.06, 0.5, x + s * (w / 2 + 0.07), 0.3, zf + 0.1, 0.5);
    }
    box(M.trim, 0.3, 0.1, d + 1.0, x, eave + rise + 0.2, zc);
  }
  // A front gable: shingles in a triangle, with a hole for the window.
  function gableFront(m, x, eave, w, rise, z, hole) {
    const s = new THREE.Shape([new THREE.Vector2(-w / 2, 0), new THREE.Vector2(w / 2, 0), new THREE.Vector2(0, rise)]);
    if (hole) s.holes.push(new THREE.Path([new THREE.Vector2(hole[0], hole[2]), new THREE.Vector2(hole[0], hole[3]), new THREE.Vector2(hole[1], hole[3]), new THREE.Vector2(hole[1], hole[2])]));
    put(m, new THREE.ShapeGeometry(s), x, eave, z);
    box(M.trim, w + 0.1, 0.2, 0.07, x, eave + 0.02, z + 0.04); box(M.trim, w + 0.2, 0.04, 0.12, x, eave + 0.14, z + 0.06);
  }
  // A porch: deck boards, skirt, posts, beam, roof, rails, stairs.
  function porch({ x, w, zf, base, sx, post = [], ceil = 2.45, depth = 1.8 }) {
    const pf = zf + depth, top = base + ceil;
    for (let bx = x - w / 2 + 0.07; bx < x + w / 2; bx += 0.145) box(M.deck, 0.135, 0.04, depth + 0.06, bx, base - 0.02, zf + depth / 2 + 0.03);
    box(M.trim, w, 0.2, 0.05, x, base - 0.14, pf + 0.04);
    for (const [a, b] of [[x - w / 2, sx - 0.78], [sx + 0.78, x + w / 2]]) put(M.lattice, mPlane(b - a, base - 0.26), (a + b) / 2, (base - 0.24) / 2, pf + 0.02);
    box(M.dark, w - 0.2, base - 0.3, 0.05, x, (base - 0.3) / 2, pf - 0.4);
    for (const px of post) { box(M.trim, 0.15, ceil - 0.3, 0.15, px, base + (ceil - 0.3) / 2, pf - 0.1); box(M.trim, 0.21, 0.12, 0.21, px, base + 0.06, pf - 0.1); box(M.trim, 0.22, 0.1, 0.22, px, top - 0.35, pf - 0.1); }
    box(M.trim, w + 0.1, 0.22, 0.17, x, top - 0.19, pf - 0.1);
    // The roof slopes to the street; its ceiling is pale beadboard.
    box(M.roof, w + 0.6, 0.08, depth + 0.55, x, top + 0.25, zf + depth / 2 + 0.2, 0.2); box(M.trim, w + 0.2, 0.03, depth + 0.2, x, top - 0.07, zf + depth / 2);
    box(M.galv, w + 0.7, 0.1, 0.12, x, top + 0.0, pf + 0.42); box(M.trim, w + 0.6, 0.16, 0.04, x, top + 0.02, pf + 0.34);
    // Rails: a shaped top rail, a bottom rail, square balusters.
    const spans = []; let prev = null;
    for (const px of post) { if (prev !== null && !(prev < sx && px > sx)) spans.push([prev, px]); prev = px; }
    for (const [a, b] of spans) {
      box(M.trim, b - a - 0.15, 0.05, 0.09, (a + b) / 2, base + 0.9, pf - 0.1); box(M.trim, b - a - 0.15, 0.06, 0.05, (a + b) / 2, base + 0.14, pf - 0.1);
      for (let bx = a + 0.19; bx < b - 0.1; bx += 0.115) box(M.trim, 0.032, 0.72, 0.032, bx, base + 0.52, pf - 0.1);
    }
    for (const s of [post[0], post[post.length - 1]]) { box(M.trim, 0.09, 0.05, depth - 0.2, s, base + 0.9, zf + depth / 2 - 0.1); for (let bz = zf + 0.2; bz < pf - 0.2; bz += 0.115) box(M.trim, 0.032, 0.72, 0.032, s, base + 0.52, bz); }
    // Stairs: treads with a nosing, risers, stringers, two rails.
    const n = Math.round(base / 0.19), rise = base / n;
    for (let i = 1; i < n; i++) {
      const y = base - i * rise, z = pf + (i - 1) * 0.28;
      box(M.deck, 1.5, 0.04, 0.31, sx, y - 0.02, z + 0.16); box(M.trim, 1.46, rise - 0.04, 0.02, sx, y - 0.04 - (rise - 0.04) / 2, z + 0.27);
    }
    const run = (n - 1) * 0.28, ang = Math.atan2(base, run + 0.28), len = Math.hypot(base, run);
    for (const s of [-1, 1]) {
      box(M.trim, 0.04, 0.26, len, sx + s * 0.77, base / 2 - 0.08, pf + run / 2 + 0.05, ang);
      box(M.trim, 0.06, 0.05, len, sx + s * 0.77, base / 2 + 0.86, pf + run / 2, ang); box(M.trim, 0.11, 1.0, 0.11, sx + s * 0.77, 0.5, pf + run + 0.02); box(M.trim, 0.15, 0.04, 0.15, sx + s * 0.77, 1.02, pf + run + 0.02);
      for (let i = 1; i < n - 1; i++) box(M.trim, 0.032, 0.74, 0.032, sx + s * 0.77, base - i * rise + 0.45, pf + (i - 0.5) * 0.28);
    }
    return pf;
  }
  // A panel door in its frame, with a glass lite and a knob.
  function door(x, y0, z, m) {
    box(m, 0.92, 2.04, 0.045, x, y0 + 1.02, z - 0.03);
    for (const [py, ph] of [[0.42, 0.56], [1.08, 0.5]]) for (const s of [-1, 1]) box(m, 0.3, ph, 0.02, x + s * 0.2, y0 + py, z - 0.0);
    put(M.glass, new THREE.PlaneGeometry(0.56, 0.42), x, y0 + 1.66, z - 0.005); box(M.trim, 0.62, 0.035, 0.03, x, y0 + 1.42, z); box(M.trim, 0.62, 0.035, 0.03, x, y0 + 1.9, z);
    put(M.galv, new THREE.SphereGeometry(0.035, 10, 8), x + 0.36, y0 + 0.98, z + 0.03);
    box(M.trim, 1.16, 0.12, 0.06, x, y0 + 2.11, z + 0.035); for (const s of [-1, 1]) box(M.trim, 0.11, 2.05, 0.06, x + s * 0.52, y0 + 1.02, z + 0.035);
    box(M.trim, 1.0, 0.03, 0.18, x, y0 + 0.015, z + 0.03);
  }

  /* ----- the house ----- */
  const ZF = -6.5, BASE = 1.3, EAVE = 4.3;
  const bay = [0.85, 3.15, 1.85, 3.8], doorH = [-0.98, -0.02, BASE, BASE + 2.1], winL = [-2.95, -1.95, 2.05, 3.55];
  lapWall(M.siding, -3.6, 3.6, BASE, EAVE, ZF, [bay, doorH, winL]);
  for (const s of [-1, 1]) box(M.trim, 0.12, EAVE - BASE, 0.12, s * 3.57, (BASE + EAVE) / 2, ZF + 0.02);
  box(M.trim, 7.3, 0.16, 0.05, 0, BASE + 0.02, ZF + 0.04);
  box(M.found, 7.2, BASE, 0.2, 0, BASE / 2, ZF - 0.08);
  // Side and back walls, floor and ceiling close the shell.
  for (const s of [-1, 1]) box(M.siding, 0.15, EAVE, 9, s * 3.53, EAVE / 2, ZF - 4.5);
  box(M.dark, 7.2, EAVE, 0.15, 0, EAVE / 2, ZF - 9); box(M.dark, 7.2, 0.12, 9, 0, BASE - 0.06, ZF - 4.5); box(M.dark, 7.2, 0.12, 9, 0, EAVE - 0.06, ZF - 4.5);
  box(M.dark, 0.1, 3, 4, -1.1, 2.8, ZF - 2); box(M.dark, 2.5, 3, 0.1, -2.35, 2.8, ZF - 0.5);
  gableFront(M.gable, 0, EAVE, 7.2, 3.3, ZF, [-0.5, 0.5, 0.55, 1.65]);
  roofOn(0, ZF, 7.2, 9, EAVE, 3.3);
  sash(0, EAVE + 1.1, ZF, 1.0, 1.1);
  sash(-2.45, 2.8, ZF, 1.0, 1.5, M.blind);
  door(-0.5, BASE, ZF, M.door);
  // The hall behind the door, the living room behind the bay, the attic.
  room(-1.05, 0.55, BASE, EAVE, ZF - 0.1, ZF - 3.2);
  room(0.6, 3.5, BASE, EAVE, ZF - 0.1, ZF - 4);
  room(-1.2, 1.2, EAVE, EAVE + 2.0, ZF - 0.1, ZF - 3);
  box(M.tv, 0.9, 0.5, 0.03, 0.75, EAVE + 0.9, ZF - 1.6, 0, -1.1);
  // The bay: three sides of glass on a panelled base.
  box(M.trim, 2.3, 0.55, 0.5, 2.0, 2.12, ZF + 0.25); box(M.trim, 2.42, 0.06, 0.58, 2.0, 2.42, ZF + 0.27, 0.06);
  box(M.trim, 2.3, 0.26, 0.5, 2.0, 3.68, ZF + 0.25); box(M.roof, 2.5, 0.08, 0.72, 2.0, 3.86, ZF + 0.3, 0.14);
  for (const bx of [0.88, 1.63, 2.37, 3.12]) box(M.trim, 0.07, 1.14, 0.07, bx, 2.99, ZF + 0.47);
  for (const bx of [1.255, 2.0, 2.745]) { put(M.glass, new THREE.PlaneGeometry(0.68, 1.1), bx, 2.99, ZF + 0.47); box(M.trim, 0.68, 0.04, 0.04, bx, 2.99, ZF + 0.47); }
  for (const s of [-1, 1]) put(M.glass, new THREE.PlaneGeometry(0.42, 1.1), 2.0 + s * 1.13, 2.99, ZF + 0.25, 0, s * Math.PI / 2);
  // Inside: curtains at the sides, a floor lamp, a sofa, a cat on the sill.
  for (const s of [-1, 1]) put(M.curtainW, mPlane(0.5, 1.5), 2.0 + s * 0.98, 3.05, ZF + 0.36);
  box(M.couch, 1.8, 0.45, 0.8, 2.3, BASE + 0.3, ZF - 2.6); box(M.couch, 1.8, 0.5, 0.2, 2.3, BASE + 0.7, ZF - 2.95);
  put(M.bulb, mCyl(0.16, 0.22, 0.28, 12), 1.0, BASE + 1.55, ZF - 2.4); put(M.iron, mCyl(0.015, 0.015, 1.4, 6), 1.0, BASE + 0.7, ZF - 2.4);
  box(M.room, 0.7, 0.5, 0.03, 2.4, 3.3, ZF - 3.9); box(M.dark, 0.6, 0.4, 0.035, 2.4, 3.3, ZF - 3.9);
  put(M.cat, new THREE.IcosahedronGeometry(1, 2).scale(0.11, 0.13, 0.09), 2.35, 2.58, ZF + 0.3); put(M.cat, new THREE.IcosahedronGeometry(1, 2).scale(0.065, 0.06, 0.06), 2.35, 2.75, ZF + 0.31);
  for (const s of [-1, 1]) put(M.cat, new THREE.ConeGeometry(0.022, 0.05, 4), 2.35 + s * 0.035, 2.82, ZF + 0.31);
  limb(M.cat, V(2.44, 2.47, ZF + 0.3), V(2.6, 2.5, ZF + 0.33), 0.016, 0.012);
  const PF = porch({ x: 0, w: 7.2, zf: ZF, base: BASE, sx: -0.5, post: [-3.5, -1.3, 0.3, 3.5] });
  // The porch lantern, the plate, the couch.
  box(M.iron, 0.1, 0.03, 0.1, 0.28, 3.22, ZF + 0.08); box(M.iron, 0.1, 0.02, 0.1, 0.28, 3.0, ZF + 0.08); put(M.bulb, new THREE.SphereGeometry(0.045, 10, 8), 0.28, 3.11, ZF + 0.09);
  put(M.plate, new THREE.PlaneGeometry(0.3, 0.13), 0.28, 2.7, ZF + 0.03);
  box(M.couch, 1.6, 0.3, 0.62, -2.45, BASE + 0.25, ZF + 0.5); box(M.couch, 1.6, 0.5, 0.18, -2.45, BASE + 0.55, ZF + 0.22);
  for (const s of [-1, 1]) box(M.couch, 0.18, 0.42, 0.62, -2.45 + s * 0.78, BASE + 0.36, ZF + 0.5);
  box(M.brick, 0.62, 2.5, 0.62, 1.9, 6.85, -12.5); box(M.found, 0.74, 0.1, 0.74, 1.9, 8.12, -12.5);

  /* ----- the neighbours ----- */
  // Left: brick below, stucco above, an iron balcony, a low roof.
  box(M.brick, 8, 2.7, 1.2, -10.2, 1.35, -6.6); box(M.brick, 8, 2.7, 10, -10.2, 1.35, -12.2); box(M.found, 8.1, 0.12, 1.3, -10.2, 2.74, -6.6);
  box(M.stucco, 8, 2.6, 10.8, -10.2, 4.0, -12.6);
  put(M.stucco, new THREE.ShapeGeometry(new THREE.Shape([new THREE.Vector2(-4, 0), new THREE.Vector2(4, 0), new THREE.Vector2(0, 1.15)])), -10.2, 5.3, -7.19);
  roofOn(-10.2, -7.2, 8, 11, 5.3, 1.15, 0.7);
  box(M.iron, 8, 0.045, 0.045, -10.2, 3.72, -6.05); box(M.iron, 8, 0.03, 0.03, -10.2, 2.9, -6.05);
  for (let x = -14.15; x <= -6.2; x += 0.115) box(M.iron, 0.016, 0.82, 0.016, x, 3.31, -6.05);
  box(M.trim, 3.3, 0.09, 0.12, -10.2, 4.98, -7.16); for (const s of [-1, 0, 1]) box(M.trim, 0.07, 1.9, 0.1, -10.2 + s * 1.6, 4.0, -7.16);
  for (const s of [-1, 1]) put(M.glass, new THREE.PlaneGeometry(1.5, 1.86), -10.2 + s * 0.8, 4.0, -7.15);
  put(M.curtainC, mPlane(3.1, 1.86), -10.2, 4.0, -7.185);
  sash(-12.4, 1.5, -5.84, 1.3, 1.0, M.blind); door(-8.3, 0, -5.99, M.dark);
  // Right: a taller gabled house in purple.
  const ZP = -6, bP = 1.0, eP = 4.1;
  lapWall(M.sidingP, 7, 13.6, bP, eP, ZP, [[7.8, 8.8, 1.85, 3.35], [9.82, 10.78, bP, bP + 2.1], [11.8, 12.8, 1.85, 3.35]]);
  for (const s of [-1, 1]) box(M.trim, 0.12, eP - bP, 0.12, 10.3 + s * 3.27, (bP + eP) / 2, ZP + 0.02);
  box(M.found, 6.6, bP, 0.2, 10.3, bP / 2, ZP - 0.08); box(M.sidingP, 0.15, eP, 9, 7.07, eP / 2, ZP - 4.5); box(M.dark, 6.5, eP, 0.1, 10.3, eP / 2, ZP - 0.4);
  gableFront(M.sidingP, 10.3, eP, 6.6, 3.6, ZP, [-0.5, 0.5, 0.6, 1.7]);
  roofOn(10.3, ZP, 6.6, 9, eP, 3.6);
  sash(8.3, 2.6, ZP, 1.0, 1.5, M.curtainC); sash(12.3, 2.6, ZP, 1.0, 1.5, M.blind); sash(10.3, eP + 1.15, ZP, 1.0, 1.1, M.blind);
  door(10.3, bP, ZP, M.trim);
  porch({ x: 10.3, w: 6.6, zf: ZP, base: bP, sx: 10.3, post: [7.15, 9.45, 11.15, 13.45], depth: 1.6 });
  // Beyond the frame edges: plain dark houses, tall firs.
  for (const x of [-20.5, 20.7]) { box(M.dark, 7, 4.2, 9, x, 2.1, -11); roofOn(x, -6.5, 7, 9, 4.2, 3); put(M.dark, new THREE.ShapeGeometry(new THREE.Shape([new THREE.Vector2(-3.5, 0), new THREE.Vector2(3.5, 0), new THREE.Vector2(0, 3)])), x, 4.2, -6.5); }
  {
    const R = rng(41);
    for (let i = 0; i < 9; i++) {
      const x = -34 + i * 8.5 + R() * 4, z = -19 - R() * 8, h = 11 + R() * 8, r = 2.2 + R();
      // One cone with a ragged outline reads as a fir at night.
      const g = new THREE.ConeGeometry(r, h, 22, 30, true), p = g.attributes.position;
      for (let k = 0; k < p.count; k++) { const j = 0.62 + 0.6 * hash(Math.floor(p.getY(k) * 3.1) * 7 + Math.floor(Math.atan2(p.getZ(k), p.getX(k)) * 3.5) * 13 + i); p.setX(k, p.getX(k) * j); p.setZ(k, p.getZ(k) * j); }
      put(M.fir, g, x, 2 + h / 2, z);
      put(M.twig, mCyl(0.2, 0.3, 3, 6), x, 1.5, z);
    }
  }

  /* ----- ground: lawn, sidewalk slabs, kerb, path, fence, bed, bins ----- */
  box(M.lawn, 90, 0.2, 66, 0, -0.1, -30); box(M.lawn, 90, 0.2, 10, 0, -0.1, 19);
  for (let x = -27; x < 27; x += 1.5) { const lift = R0() < 0.15 ? R0() * 0.03 : 0; box(M.walk, 1.488, 0.1, 1.5, x + 0.75, -0.03 + lift, 0.45, 0, 0, (R0() - 0.5) * 0.012); }
  // The kerb has a rounded nose; the gutter pan sits below it.
  {
    const s = new THREE.Shape(); s.moveTo(0, -0.2); s.lineTo(0, 0.0); s.absarc(0.05, 0.0, 0.05, Math.PI, Math.PI / 2, true); s.lineTo(0.18, 0.05); s.lineTo(0.18, -0.2);
    const g = new THREE.ExtrudeGeometry(s, { depth: 90, bevelEnabled: false, curveSegments: 6 }), uv = g.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 3 + i % 7, uv.getY(i) * 3);
    put(M.curb, g, -45, -0.01, 3.14, 0, Math.PI / 2); put(M.curb, g.clone(), 45, -0.01, 13.86, 0, -Math.PI / 2);
  }
  box(M.walk, 1.4, 0.06, 2.95, -0.5, 0.0, -1.75);
  function fence(x0, z0, x1, z1) {
    const len = Math.hypot(x1 - x0, z1 - z0), ry = Math.atan2(-(z1 - z0), x1 - x0), mx = (x0 + x1) / 2, mz = (z0 + z1) / 2;
    put(M.link, mPlane(len, 1), mx, 0.55, mz, 0, ry);
    put(M.galv, mCyl(0.021, 0.021, len, 8).rotateZ(Math.PI / 2), mx, 1.07, mz, 0, ry);
    const n = Math.ceil(len / 2.4);
    for (let j = 0; j <= n; j++) { const x = lerp(x0, x1, j / n), z = lerp(z0, z1, j / n); put(M.galv, mCyl(0.03, 0.03, 1.14, 8), x, 0.57, z); put(M.galv, new THREE.SphereGeometry(0.036, 8, 6), x, 1.15, z); }
  }
  fence(-5, -0.55, -1.3, -0.55); fence(0.3, -0.55, 5, -0.55); fence(-5, -0.55, -5, -6.5); fence(5, -0.55, 5, -6.5);
  for (const s of [-1, 1]) for (const h of [0.03, 0.34]) box(M.wood, 2.6, 0.17, 0.04, 2.9, 0.1 + h, -2.3 + s * 0.6);
  for (const s of [-1, 1]) box(M.wood, 0.04, 0.36, 1.2, 2.9 + s * 1.3, 0.18, -2.3);
  box(M.soil, 2.52, 0.05, 1.12, 2.9, 0.33, -2.3);
  for (let i = 0; i < 8; i++) for (let k = 0; k < 5; k++) put(M.kale, new THREE.ConeGeometry(0.035, 0.34, 4), 1.95 + (i % 4) * 0.62 + Math.cos(k * 1.26) * 0.09, 0.5, -2.55 + Math.floor(i / 4) * 0.5 + Math.sin(k * 1.26) * 0.09, Math.PI + Math.sin(k * 1.26) * 0.5, 0, Math.cos(k * 1.26) * 0.5);
  put(M.bush, new THREE.IcosahedronGeometry(1, 2).scale(1.1, 0.8, 1.0), -3.8, 0.7, -5.4); put(M.bush, new THREE.IcosahedronGeometry(1, 2).scale(0.7, 0.55, 0.7), -2.6, 0.45, -5.0);
  // Carts: a tapered body, a lid with a lip, a handle bar, two wheels.
  const cart = (m, x, tilt) => {
    put(m, new THREE.CylinderGeometry(0.34, 0.28, 0.96, 4).rotateY(Math.PI / 4), x, 0.5, 2.5);
    box(m, 0.53, 0.035, 0.6, x, 1.0 + tilt * 0.12, 2.5, -tilt); box(m, 0.5, 0.05, 0.05, x, 0.97, 2.18);
    for (const s of [-1, 1]) put(M.plastK, new THREE.CylinderGeometry(0.1, 0.1, 0.05, 12).rotateZ(Math.PI / 2), x + s * 0.24, 0.1, 2.24);
  };
  cart(M.plastK, 6.5, 0); cart(M.plastG, 7.25, 0.1);
  box(M.plastB, 0.52, 0.3, 0.4, 7.95, 0.15, 2.55); put(M.bagY, new THREE.IcosahedronGeometry(1, 2).scale(0.22, 0.2, 0.2), 8.5, 0.19, 2.6);

  /* ----- pole, lamp, wires ----- */
  const PX = 5.6, PZ = 2.2, PW = -40.4, PE = 51.6, LAMP = V(PX, 8.3, 4.75);
  for (const x of [PW, PX, PE]) {
    put(M.pole, mCyl(0.11, 0.17, 10.6, 12), x, 5.3, PZ); box(M.pole, 0.1, 0.12, 2.4, x, 9.95, PZ);
    for (const dz of [-1, 1]) { put(M.trim, mCyl(0.035, 0.05, 0.14, 8), x, 10.08, PZ + dz); limb(M.galv, V(x, 9.4, PZ), V(x, 9.9, PZ + dz * 0.7), 0.012, 0.012, 4); }
    put(M.trim, mCyl(0.035, 0.05, 0.14, 8), x, 10.67, PZ);
  }
  put(M.galv, mCyl(0.3, 0.3, 0.85, 16), PX - 0.44, 7.9, PZ); put(M.galv, mCyl(0.31, 0.31, 0.04, 16), PX - 0.44, 8.34, PZ);
  for (const a of [0.6, -0.6]) put(M.trim, mCyl(0.03, 0.045, 0.2, 8), PX - 0.44 + Math.sin(a) * 0.16, 8.46, PZ + Math.cos(a) * 0.16);
  limb(M.galv, V(PX, 8.05, PZ + 0.1), V(PX, 8.42, LAMP.z - 0.3), 0.035, 0.03, 8);
  box(M.galv, 0.26, 0.1, 0.62, PX, 8.42, LAMP.z); box(M.lampLens, 0.19, 0.03, 0.4, PX, 8.36, LAMP.z + 0.03);
  box(M.iron, 0.3, 0.42, 0.2, PX - 1.1, 5.95, PZ + 0.22);
  const wirePos = [], wireSw = [], wireIdx = [];
  let wireN = 0, perch;
  function wire(a, b, sag, r, amp = 0.05) {
    const N = 48, S = 5, base = wirePos.length / 3, ph = wireN++ * 1.7;
    const t = V(0, 0, 0).subVectors(b, a).normalize(), n1 = V(0, 0, 0).crossVectors(t, UP).normalize(), n2 = V(0, 0, 0).crossVectors(n1, t);
    for (let i = 0; i <= N; i++) {
      const u = i / N, w = 4 * u * (1 - u), cx = lerp(a.x, b.x, u), cy = lerp(a.y, b.y, u) - sag * w, cz = lerp(a.z, b.z, u);
      for (let j = 0; j < S; j++) {
        const c = Math.cos(j / S * 6.2832) * r, s = Math.sin(j / S * 6.2832) * r;
        wirePos.push(cx + n1.x * c + n2.x * s, cy + n1.y * c + n2.y * s, cz + n1.z * c + n2.z * s);
        wireSw.push(n1.x * w * amp, n1.z * w * amp, ph);
      }
    }
    for (let i = 0; i < N; i++) for (let j = 0; j < S; j++) { const p = base + i * S + j, q = base + i * S + (j + 1) % S; wireIdx.push(p, q, p + S, q, q + S, p + S); }
    return { a, b, sag, amp, ph };
  }
  for (const [dz, y, sag, r] of [[-1, 10.15, 0.55, 0.012], [0, 10.74, 0.55, 0.012], [1, 10.15, 0.55, 0.012], [0.18, 8.9, 0.65, 0.012], [0.2, 7.7, 0.75, 0.017], [0.22, 6.5, 0.95, 0.02], [0.22, 6.05, 1.0, 0.016]]) {
    const w = wire(V(PW, y, PZ + dz), V(PX, y, PZ + dz), sag, r);
    wire(V(PX, y, PZ + dz), V(PE, y, PZ + dz), sag, r);
    if (y === 6.5) perch = w;
  }
  wire(V(PX, 7.7, PZ), V(3.3, 4.75, ZF + 0.3), 0.4, 0.014, 0.03); wire(V(PX, 7.7, PZ), V(9.0, 5.0, -5.8), 0.35, 0.014, 0.03); wire(V(PW, 7.7, PZ), V(-13.5, 5.6, -7), 0.5, 0.014, 0.03);
  /* ----- the tree: real branching down to twigs, and the last leaves ----- */
  const TX = -4.4, TZ = 2.1, tips = [];
  {
    const R = rng(7);
    const grow = (p, d, len, rad, lvl) => {
      const e = p.clone().addScaledVector(d, len);
      limb(lvl < 3 ? M.bark : M.twig, p, e, rad, rad * 0.7, lvl < 2 ? 10 : lvl < 4 ? 5 : 3);
      if (lvl >= 3) tips.push(e);
      if (lvl >= 6) return;
      const n = lvl === 0 ? 4 : 2 + (R() < 0.4 ? 1 : 0);
      for (let i = 0; i < n; i++) {
        const a = (i + R()) / n * 6.283, side = V(Math.cos(a), 0.01, Math.sin(a)).cross(d).normalize();
        const nd = d.clone().applyAxisAngle(side, (lvl === 0 ? 0.5 : 0.3) + R() * 0.5).lerp(UP, 0.1).normalize();
        grow(e, nd, len * (0.66 + R() * 0.16), rad * (i === 0 ? 0.68 : 0.55), lvl + 1);
      }
    };
    grow(V(TX, 0, TZ), V(0.03, 1, 0.02).normalize(), 3.0, 0.3, 0);
    // The root flare meets the ground.
    put(M.bark, mCyl(0.3, 0.5, 0.35, 10), TX, 0.17, TZ);
  }
  const LEAF = [col(0.74, 0.16, 84), col(0.62, 0.17, 58), col(0.48, 0.17, 33)];
  const leafMat = std(0xffffff, { alphaMap: leafTex, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.45 });
  leafMat.onBeforeCompile = sh => {
    sh.uniforms.uT = uT;
    sh.vertexShader = 'uniform float uT;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n #ifdef USE_INSTANCING\n float lf = instanceMatrix[3].x * 7.0 + instanceMatrix[3].y * 3.0; transformed.z += sin(uT * 2.6 + lf) * 0.02 * step(0.5, instanceMatrix[3].y); transformed.x += cos(uT * 1.9 + lf) * 0.012 * step(0.5, instanceMatrix[3].y);\n #endif');
  };
  const leafGeo = new THREE.PlaneGeometry(0.17, 0.17);
  {
    const R = rng(3), on = tips.flatMap(p => (R() < 0.7 ? [p, p] : [])), N = on.length + 700, cards = new THREE.InstancedMesh(leafGeo, leafMat, N);
    on.forEach((p, i) => { dummy.position.set(p.x + (R() - 0.5) * 0.4, p.y - R() * 0.3, p.z + (R() - 0.5) * 0.4); dummy.rotation.set(R() * 3, R() * 6, R() * 3); dummy.scale.setScalar(0.7 + R() * 0.6); dummy.updateMatrix(); cards.setMatrixAt(i, dummy.matrix); cards.setColorAt(i, LEAF[Math.floor(R() * 3)]); });
    // Litter: round the tree, in the gutter, on the lawn and the walk.
    for (let i = on.length; i < N; i++) {
      const k = i - on.length; let x, z;
      if (k < 400) { const a = R() * 6.2832, r = Math.sqrt(-2 * Math.log(1 - R() * 0.98)) * 2.3; x = TX + Math.cos(a) * r * 1.5; z = TZ + Math.sin(a) * r; }
      else if (k < 560) { x = -16 + R() * 28; z = 3.3 + R() * R() * 1.2; } else { x = -14 + R() * 28; z = -5 + R() * 7.5; }
      dummy.position.set(x, (z > 3.2 && z < 13.8 ? -0.138 : z > -0.3 && z < 1.2 ? 0.03 : 0.012) + R() * 0.006, z); dummy.rotation.set(-Math.PI / 2 + (R() - 0.5) * 0.25, 0, R() * 6.28); dummy.scale.setScalar(0.6 + R() * 0.5); dummy.updateMatrix();
      cards.setMatrixAt(i, dummy.matrix); cards.setColorAt(i, LEAF[Math.floor(R() * 3)].clone().multiplyScalar(0.7));
    }
    cards.castShadow = cards.receiveShadow = true;
    scene.add(cards);
    ghosts.push(cards);
  }
  const FALL = 8, fallD = [], fall = new THREE.InstancedMesh(leafGeo, leafMat, FALL);
  { const R = rng(9); for (let i = 0; i < FALL; i++) { fallD.push({ x: TX + (R() - 0.5) * 5.5, y: 4 + R() * 4, z: TZ + (R() - 0.5) * 5, per: 7 + R() * 6, ph: R() }); fall.setColorAt(i, LEAF[Math.floor(R() * 3)]); } }
  fall.frustumCulled = false;
  scene.add(fall);
  ghosts.push(fall);

  /* ----- the wet road: lit asphalt with a true mirror in it ----- */
  const roadMat = std(col(0.62, 0.008, 262), { ...asphalt, roughness: 0.9, envMapIntensity: 0 });
  const roadGeo = new THREE.PlaneGeometry(90, 10.72), ruv = roadGeo.attributes.uv;
  for (let i = 0; i < ruv.count; i++) ruv.setXY(i, ruv.getX(i) * 90, ruv.getY(i) * 10.72);
  const road = new Reflector(roadGeo, { textureWidth: 1024, textureHeight: 576, clipBias: 0.003, multisample: 0 });
  const mirU = { tMir: { value: road.getRenderTarget().texture }, uTexMat: { value: road.material.uniforms.textureMatrix.value }, uT };
  roadMat.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, mirU);
    sh.vertexShader = 'varying vec3 vWp; varying vec4 vMir; uniform mat4 uTexMat;\n' + sh.vertexShader.replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\n vWp = (modelMatrix * vec4(transformed, 1.0)).xyz; vMir = uTexMat * vec4(position, 1.0);');
    sh.fragmentShader = 'varying vec3 vWp; varying vec4 vMir; uniform sampler2D tMir; uniform float uT;\n' + NOISE + /* glsl */`
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
` + sh.fragmentShader
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        float pud = smoothstep(0.46, 0.6, nV(vWp.xz * 0.3) * 0.65 + nV(vWp.xz * 1.1) * 0.35);
        pud = max(pud, smoothstep(4.2, 3.4, vWp.z));
        roughnessFactor = mix(roughnessFactor * 0.55, 0.03, pud); diffuseColor.rgb *= mix(0.42, 0.2, pud);`)
      .replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\n vec3 nmT = texture2D(normalMap, vNormalMapUv).xyz * 2.0 - 1.0; normal = normalize(mix(normal, nonPerturbedNormal, pud));')
      .replace('#include <opaque_fragment>', `
        vec2 dis = nmT.xy * mix(0.03, 0.0015, pud) + rings(vWp.xz, uT) * 0.012 * (0.3 + pud);
        float sp = mix(0.024, 0.002, pud);
        vec3 refl = vec3(0.0);
        for (int i = 0; i < 5; i++) refl += texture2DProj(tMir, vMir + vec4(dis.x, dis.y + (float(i) - 2.0) * sp, 0.0, 0.0) * vMir.w).rgb;
        float Fm = 0.04 + 0.96 * pow(1.0 - clamp(dot(normalize(vViewPosition), nonPerturbedNormal), 0.0, 1.0), 5.0);
        outgoingLight = mix(outgoingLight, refl * 0.2, clamp(Fm * mix(0.8, 1.0, pud) * 1.5, 0.0, 1.0));
        #include <opaque_fragment>`);
  };
  road.material = roadMat;
  road.rotation.x = -Math.PI / 2;
  road.position.set(0, -0.145, 8.5);
  road.receiveShadow = true;
  // The mirror renders once a frame, for the main view only.
  const mirrorRender = road.onBeforeRender;
  road.onBeforeRender = function (r, s, c) { if (c === camera && !s.overrideMaterial) mirrorRender.call(this, r, s, c); };
  scene.add(road);
  box(M.dark, 90, 0.1, 11, 0, -0.25, 8.5);

  /* ----- sky, mountains, far crows ----- */
  const sk = skyAt(19.25), SUN = V(-0.5, 0.55, 0.6).normalize();
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { uSun: { value: SUN }, uZen: { value: V(...sk.zen) }, uMid: { value: V(...sk.mid) }, uBand: { value: V(...sk.band) }, uAnti: { value: V(...sk.anti) }, uT, uFog: { value: FOG }, uCloud: { value: col(0.2, 0.04, 262) }, uCloudLit: { value: col(0.36, 0.06, 300) } },
    vertexShader: 'varying vec3 vDir; void main() { vec4 w = modelMatrix * vec4(position, 1.0); vDir = w.xyz - cameraPosition; gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: /* glsl */`
      uniform vec3 uSun, uZen, uMid, uBand, uAnti, uFog, uCloud, uCloudLit; uniform float uT; varying vec3 vDir;
      ${SKY}
      ${NOISE}
      void main() {
        vec3 d = normalize(vDir);
        vec3 c = skSky(d, uSun, uZen, uMid, uBand, uAnti, 0.0, uT);
        float sd = max(dot(d, uSun), 0.0);
        vec2 p = d.xz / (max(d.y, 0.0) + 0.14) * 0.8 + vec2(uT * 0.008, uT * 0.003);
        float n = nF(p), k = smoothstep(0.22, 0.52, n) * 0.92;
        c = mix(c, mix(uCloud, uCloudLit, clamp(pow(sd, 3.0) * 0.9 + 0.5 * smoothstep(0.45, 0.85, n), 0.0, 1.0)), k);
        gl_FragColor = vec4(mix(c, uFog, clamp(0.7 * exp(-max(d.y, 0.0) * 7.0), 0.0, 1.0)), 1.0);
      }`,
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(700, 32, 16), skyMat);
  sky.renderOrder = -10;
  sky.frustumCulled = false;
  scene.add(sky);
  // The sky lights the scene: wet roofs and glass mirror it.
  {
    const pm = new THREE.PMREMGenerator(renderer), s2 = new THREE.Scene();
    s2.add(new THREE.Mesh(sky.geometry, skyMat));
    scene.environment = pm.fromScene(s2, 0, 1, 1200).texture;
    scene.environmentIntensity = 2.6;
    pm.dispose();
  }
  const ridge = canvasTex(2048, 256, 1, (g, w, h) => {
    const R = rng(5), a = [R() * 6, R() * 6, R() * 6, R() * 6];
    g.fillStyle = '#fff'; g.beginPath(); g.moveTo(0, h);
    for (let x = 0; x <= w; x += 4) { const u = x / w; g.lineTo(x, h - clamp(0.42 + 0.16 * Math.sin(u * 9 + a[0]) + 0.1 * Math.sin(u * 23 + a[1]) + 0.05 * Math.sin(u * 61 + a[2]) + 0.025 * Math.sin(u * 140 + a[3]) + 0.2 * Math.exp(-((u - 0.47) ** 2) / 0.00012) + 0.17 * Math.exp(-((u - 0.487) ** 2) / 0.00012), 0.05, 0.98) * h); }
    g.lineTo(w, h); g.fill();
  });
  ridge.repeat.set(1, 1);
  const mtn = new THREE.Mesh(new THREE.PlaneGeometry(1100, 96), new THREE.MeshBasicMaterial({ map: ridge, color: col(0.18, 0.045, 262), alphaTest: 0.5, alphaToCoverage: true, fog: false }));
  mtn.position.set(0, 46, -400);
  scene.add(mtn);
  ghosts.push(mtn);
  const flockGeo = new THREE.InstancedBufferGeometry();
  flockGeo.setAttribute('position', new THREE.Float32BufferAttribute([0.3, 0, 0, -0.25, 0, 0, 0, 0, 0.62, 0.3, 0, 0, -0.25, 0, 0, 0, 0, -0.62], 3));
  { const R = rng(77), o = [], ph = []; for (let i = 0; i < 70; i++) { o.push(Math.floor(R() * 9) * 45 + R() * 16, 17 + R() * 24, -45 - R() * 110); ph.push(R()); } flockGeo.setAttribute('aOff', new THREE.InstancedBufferAttribute(new Float32Array(o), 3)); flockGeo.setAttribute('aPh', new THREE.InstancedBufferAttribute(new Float32Array(ph), 1)); }
  const flock = new THREE.Mesh(flockGeo, new THREE.ShaderMaterial({
    uniforms: { uT }, side: THREE.DoubleSide,
    vertexShader: 'attribute vec3 aOff; attribute float aPh; uniform float uT; void main() { float x = mod(aOff.x + uT * (5.0 + aPh * 2.0), 400.0) - 200.0; vec3 p = position * 1.3; p.y += abs(p.z) * sin(uT * (7.0 + aPh * 3.0) + aPh * 40.0) * 0.75; gl_Position = projectionMatrix * viewMatrix * vec4(vec3(x, aOff.y + sin(uT * 0.3 + aPh * 20.0) * 1.5, aOff.z) + p, 1.0); }',
    fragmentShader: 'void main() { gl_FragColor = vec4(0.012, 0.012, 0.02, 1.0); }',
  }));
  flock.frustumCulled = false;
  scene.add(flock);
  ghosts.push(flock);

  /* ----- lights ----- */
  // The street lamp throws real shadows across the wet road.
  const lampCol = col(0.84, 0.13, 68);
  const lamp = new THREE.SpotLight(lampCol, 520, 40, 1.2, 0.6, 1.8);
  lamp.position.copy(LAMP); lamp.target.position.set(PX, 0, LAMP.z + 0.6);
  lamp.castShadow = true; lamp.shadow.mapSize.set(2048, 2048); lamp.shadow.bias = -0.0015; lamp.shadow.radius = 4;
  // The porch lantern is a point: every rail throws its own shadow.
  const lantern = new THREE.PointLight(col(0.86, 0.13, 72), 14, 16, 1.8);
  lantern.position.set(0.28, 3.1, ZF + 0.22);
  lantern.castShadow = true; lantern.shadow.mapSize.set(1024, 1024); lantern.shadow.bias = -0.003; lantern.shadow.radius = 3;
  const living = new THREE.PointLight(col(0.86, 0.13, 70), 9, 7, 1.7);
  living.position.set(1.3, BASE + 1.7, ZF - 2.2);
  const tvL = new THREE.PointLight(col(0.7, 0.14, 250), 7, 3.2, 1.6);
  tvL.position.set(0.5, EAVE + 1.0, ZF - 1.4);
  const fill = new THREE.DirectionalLight(col(0.7, 0.06, 260), 0.12);
  fill.position.copy(SUN);
  scene.add(lamp, lamp.target, lantern, living, tvL, fill);
  // The string of bulbs under the porch roof, on its wire.
  const BULBS = [col(0.65, 0.22, 28), col(0.8, 0.17, 85), col(0.7, 0.19, 145), col(0.62, 0.16, 250), col(0.65, 0.22, 340)];
  const string = new THREE.InstancedMesh(new THREE.SphereGeometry(0.03, 8, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(5, 5, 5) }), 26);
  for (let i = 0; i < 26; i++) {
    const u = i / 25;
    dummy.position.set(lerp(-3.55, 3.55, u), 3.52 - Math.abs(Math.sin(u * Math.PI * 5)) * 0.1, PF + 0.0); dummy.rotation.set(0, 0, 0); dummy.scale.setScalar(1); dummy.updateMatrix();
    string.setMatrixAt(i, dummy.matrix); string.setColorAt(i, BULBS[i % 5]);
    if (i) wire(V(lerp(-3.55, 3.55, (i - 1) / 25), 3.55 - Math.abs(Math.sin((i - 1) / 25 * Math.PI * 5)) * 0.1, PF), V(dummy.position.x, dummy.position.y + 0.03, PF), 0, 0.004, 0);
  }
  scene.add(string);
  // The lamp's cone shows in the wet air.
  const cone = new THREE.Mesh(new THREE.ConeGeometry(5.2, 8.6, 40, 1, true).translate(0, -4.3, 0), new THREE.ShaderMaterial({
    uniforms: { uT, uCol: { value: lampCol } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    vertexShader: 'varying vec3 vN, vV; varying float vH; void main() { vec4 w = modelMatrix * vec4(position, 1.0); vN = normalize(mat3(modelMatrix) * normal); vV = normalize(cameraPosition - w.xyz); vH = -position.y; gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: 'uniform vec3 uCol; uniform float uT; varying vec3 vN, vV; varying float vH; void main() { float e = pow(abs(dot(normalize(vN), normalize(vV))), 2.2); float f = 1.0 / (1.0 + vH * vH * 0.22) * smoothstep(8.6, 5.0, vH); gl_FragColor = vec4(uCol * e * f * 0.14, 1.0); }',
  }));
  cone.position.copy(LAMP);
  scene.add(cone);
  ghosts.push(cone);

  /* ----- rain: streaks in the air ----- */
  const rainU = { uT, uLamp: { value: LAMP }, uCam: { value: camera.position }, uCool: { value: col(0.8, 0.04, 250) }, uWarm: { value: col(0.9, 0.11, 70) } };
  const rain = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.ShaderMaterial({
    uniforms: rainU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */`
      attribute float aE; uniform float uT; uniform vec3 uLamp, uCam; varying float vL;
      void main() {
        float r = fract(sin(dot(position.xz, vec2(12.9898, 78.233))) * 43758.5453);
        float y = mod(position.y - uT * (9.5 + r * 4.0), 16.0) + aE * (0.34 + r * 0.24);
        vec3 p = vec3(mod(position.x - uCam.x, 50.0) - 25.0 + uCam.x - y * 0.08, y - 0.3, mod(position.z - uCam.z, 40.0) - 20.0 + uCam.z);
        vec3 q = p - uLamp;
        vL = exp(-dot(q.xz, q.xz) / 14.0) * smoothstep(1.0, -6.0, q.y);
        gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
      }`,
    fragmentShader: 'uniform vec3 uCool, uWarm; varying float vL; void main() { gl_FragColor = vec4(mix(uCool, uWarm * 2.5, vL) * 0.16 * (0.5 + 2.4 * vL), 1.0); }',
  }));
  { const R = rng(21), p = [], e = []; for (let i = 0; i < 6000; i++) { const x = R() * 50, y = R() * 16, z = R() * 40; p.push(x, y, z, x, y, z); e.push(0, 1); } rain.geometry.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); rain.geometry.setAttribute('aE', new THREE.Float32BufferAttribute(e, 1)); }
  rain.frustumCulled = false;
  scene.add(rain);
  ghosts.push(rain);

  function buildWires() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(wirePos, 3)); g.setAttribute('aSw', new THREE.Float32BufferAttribute(wireSw, 3)); g.setIndex(wireIdx);
    const wm = new THREE.MeshBasicMaterial({ color: col(0.1, 0.01, 270), side: THREE.DoubleSide });
    wm.onBeforeCompile = sh => {
      sh.uniforms.uT = uT;
      sh.vertexShader = 'attribute vec3 aSw; uniform float uT;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n transformed.xz += aSw.xy * sin(uT * 1.3 + aSw.z); transformed.y += length(aSw.xy) * 0.35 * sin(uT * 0.9 + aSw.z * 1.7);');
    };
    const wires = new THREE.Mesh(g, wm);
    wires.frustumCulled = false;
    scene.add(wires);
    ghosts.push(wires);
  }

  /* ----- the crow on the wire ----- */
  const crow = new THREE.Group(), crowHead = new THREE.Group(), crowMat = std(col(0.1, 0.02, 285), { roughness: 0.35 });
  crow.rotation.order = crowHead.rotation.order = 'YXZ';
  {
    const ic = (sx, sy, sz) => new THREE.IcosahedronGeometry(1, 3).scale(sx, sy, sz);
    const body = mergeGeometries([ic(0.085, 0.082, 0.17).rotateX(-0.45).translate(0, 0.15, 0), ic(0.028, 0.06, 0.15).rotateX(-0.55).translate(0.078, 0.15, -0.03), ic(0.028, 0.06, 0.15).rotateX(-0.55).translate(-0.078, 0.15, -0.03),
      ni(new THREE.BoxGeometry(0.075, 0.014, 0.19)).rotateX(-0.6).translate(0, 0.07, -0.2), ni(new THREE.CylinderGeometry(0.008, 0.008, 0.09, 5)).translate(0.03, 0.04, 0.01), ni(new THREE.CylinderGeometry(0.008, 0.008, 0.09, 5)).translate(-0.03, 0.04, 0.01)]);
    const skull = mergeGeometries([ic(0.055, 0.052, 0.062), ni(new THREE.ConeGeometry(0.02, 0.09, 8)).rotateX(Math.PI / 2).translate(0, 0.002, 0.088)]);
    crow.add(new THREE.Mesh(body, crowMat)); crowHead.add(new THREE.Mesh(skull, crowMat)); crowHead.position.set(0, 0.245, 0.105); crow.add(crowHead);
    crow.traverse(o => { if (o.isMesh) o.castShadow = true; });
    scene.add(crow);
  }
  buildWires();
  flush();

  /* ----- post: contact shadow, lens, bloom, grade ----- */
  const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 }));
  composer.addPass(new RenderPass(scene, camera));
  const hide = (pass) => { const r = pass.render.bind(pass); pass.render = (...a) => { for (const g of ghosts) g.visible = false; r(...a); for (const g of ghosts) g.visible = true; }; return pass; };
  const gtao = hide(new GTAOPass(scene, camera, 1, 1));
  gtao.updateGtaoMaterial({ radius: 0.45, distanceExponent: 1.5, thickness: 1.2, scale: 1.3, samples: 8, screenSpaceRadius: false });
  gtao.blendIntensity = 1;
  const bokeh = hide(new BokehPass(scene, camera, { focus: 18.5, aperture: 0.00012, maxblur: 0.004 }));
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.32, 0.75, 1.0);
  // The lens: a little colour fringe, vignette and grain on display colour.
  const lens = new ShaderPass({
    uniforms: { tDiffuse: { value: null }, uRes: { value: new THREE.Vector2(1, 1) }, uSeed: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: /* glsl */`
      uniform sampler2D tDiffuse; uniform vec2 uRes; uniform float uSeed; varying vec2 vUv;
      ${GRADE}
      void main() {
        vec2 q = vUv - 0.5; float r2 = dot(q, q);
        vec3 c = vec3(texture2D(tDiffuse, vUv + q * r2 * 0.012).r, texture2D(tDiffuse, vUv).g, texture2D(tDiffuse, vUv - q * r2 * 0.012).b);
        c = clamp((c - 0.5) * 1.06 + 0.5, 0.0, 1.0);
        c = mix(vec3(gdLuma(c)), c, 1.06);
        c += vec3(0.0, 0.008, 0.022) * (1.0 - c);
        c *= gdVignette(vUv, uRes.x / uRes.y, 0.46, 0.34);
        c *= gdGrain(gdHash(gl_FragCoord.xy + vec2(uSeed * 37.0, uSeed * 91.0)), gdLuma(c), 0.075, vec2(0.7, 1.0));
        gl_FragColor = vec4(c, 1.0);
      }`,
  });
  for (const p of [gtao, bokeh, bloom, new OutputPass(), lens]) composer.addPass(p);

  /* ----- the lens and the loop ----- */
  function frameCamera() {
    const asp = view.w / view.h, n = 0.1;
    let tu = Math.tan(31 * RAD), td = Math.tan(19 * RAD);
    const half = asp * (tu + td) / 2;
    if (half < 0.34) { tu *= 0.34 / half; td *= 0.34 / half; }
    const hw = asp * (tu + td) / 2;
    camera.projectionMatrix.makePerspective(-n * hw, n * hw, n * tu, -n * td, n, 1500);
    camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
    camera.rotation.set(0, 0, 0);
    camera.updateMatrixWorld();
    sky.position.copy(camera.position);
    bokeh.uniforms.aspect.value = asp;
  }
  const tvBase = col(0.7, 0.14, 250, 3);
  let reduce = reduced(), low = false, raf = 0, visible = true, last = 0, T = 21.3, slow = 0, frames = 0;
  function update(t) {
    uT.value = t;
    for (let i = 0; i < FALL; i++) {
      const L = fallD[i], u = (t / L.per + L.ph) % 1, q = Math.min(1, u * 1.3);
      dummy.position.set(L.x - 2 * q + Math.sin(t * 1.7 + L.ph * 40) * 0.35 * q, lerp(L.y, 0.02, q), L.z + Math.cos(t * 1.3 + L.ph * 31) * 0.3 * q);
      if (q < 1) dummy.rotation.set(t * 2.1 + L.ph * 9, t * 1.3, Math.sin(t * 3 + L.ph * 20)); else dummy.rotation.set(-Math.PI / 2, 0, L.ph * 6); dummy.scale.setScalar(smooth(0, 0.04, u) * (1 - smooth(0.9, 1, u))); dummy.updateMatrix();
      fall.setMatrixAt(i, dummy.matrix);
    }
    fall.instanceMatrix.needsUpdate = true;
    // The TV flickers in the attic; the lamp hums a little.
    const fl = 0.55 + 0.45 * hash(Math.floor(t * 3.3));
    tvL.intensity = 7 * fl; M.tv.color.copy(tvBase).multiplyScalar(fl);
    // The crow rides the wire, hunched; its head snaps between looks.
    const u = 0.859, w = 4 * u * (1 - u), sw = w * perch.amp * Math.sin(t * 1.3 + perch.ph);
    crow.position.set(lerp(perch.a.x, perch.b.x, u), perch.a.y - perch.sag * w + w * perch.amp * 0.35 * Math.sin(t * 0.9 + perch.ph * 1.7) + 0.02, perch.a.z + sw);
    const k = Math.floor(t / 1.9), s = smooth(0, 0.14, t / 1.9 - k), v = t % 9;
    crow.rotation.set(0, 0.25, v < 0.7 ? Math.sin(v * 46) * 0.16 * Math.sin(v / 0.7 * Math.PI) : 0);
    crowHead.rotation.set(lerp(hash(k + 40) - 0.5, hash(k + 41) - 0.5, s) * 0.2 + 0.25, lerp(hash(k) - 0.5, hash(k + 1) - 0.5, s) * 1.9, 0);
    lens.uniforms.uSeed.value = Math.floor(t * 12);
  }
  function draw() {
    update(T);
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
    // Slow frames: drop the pixel ratio and the lens blur once.
    if (!low && !reduce && ++frames > 30) { slow += dt; if (frames === 150 && slow / 120 > 0.03) { low = true; resize(); } }
    // Reduced motion holds one frame; a resize draws the next.
    if (!reduce) kick(); else last = 0;
  }
  function resize() {
    const w = stage.clientWidth || 1, h = stage.clientHeight || 1, dpr = pixelRatio(w, h, { maxDpr: 2, low });
    Object.assign(view, { w, h, dpr });
    renderer.setPixelRatio(dpr); renderer.setSize(w, h, false);
    composer.setPixelRatio(dpr); composer.setSize(w, h);
    // Contact shadow and bloom work at half size.
    bloom.setSize(w * dpr / 2, h * dpr / 2);
    gtao.setSize(w * dpr / 2, h * dpr / 2);
    road.getRenderTarget().setSize(Math.round(w * dpr / 2), Math.round(h * dpr / 2));
    lens.uniforms.uRes.value.set(w * dpr, h * dpr);
    bokeh.enabled = !low;
    frameCamera();
    kick();
  }
  onReducedChange(v => { reduce = v; kick(); });
  new ResizeObserver(resize).observe(stage);
  whenVisible(stage, v => { visible = v; if (v) kick(); else { cancelAnimationFrame(raf); raf = 0; last = 0; } });
  resize();
  // still(t): draws one frame at time t, for captures.
  return { resize, still(t) { T = t; draw(); }, renderer, passes: { gtao, bokeh, bloom } };
}
