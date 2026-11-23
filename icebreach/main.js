// Ice breach: Arctic night; a submarine's sail breaks up through the pack ice.
// Hold to surface: the floe bulges, cracks in a star and breaks. Tap to dive.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { initPage, whenVisible, pageReady, stage as mark, reduced, onReducedChange, audioKit, sound } from '../shared/stim.js';
import { intro as playIntro } from '../shared/intro.js';
import { detail } from '../shared/detail.js';
import { loadSub, SUB } from './sub.js';
import { makeField, fieldGeometries, poseBulge, stepField, pairUp, wake as wakeSlabs, X0, X1, Z0, Z1, CX, CZ } from './ice.js';
import { makeSky, makeRidges } from './sky.js';
import { U, iceMaterial, hullMaterial, waterMaterial } from './mats.js';
import { makeFlood, markOpen, stepFlood, uploadFlood, FX0, FZ0, NX, NZ, CELL } from './flood.js';
import { makePlume, COMPOSITE } from './plume.js';
import { breachSound } from './sound.js';
mark('libs');

const ID = 'icebreach';
// ?qa hands the state and a frame-time tally to a test script.
const QA = new URLSearchParams(location.search).has('qa') ? { step: 0, render: 0, n: 0 } : null;
const stage = document.getElementById('stage');
const fail = stage.querySelector('.fail');
const saved = k => { try { return localStorage.getItem(`stimming.${ID}.${k}`); } catch { return null; } };
const save = (k, v) => { try { localStorage.setItem(`stimming.${ID}.${k}`, String(v)); } catch { /* storage is optional */ } };
const ICE0 = 1.0;
const iceSaved = Number(saved('ice'));
let thick = saved('ice') != null && iceSaved >= 0.6 && iceSaved <= 2.6 ? iceSaved : ICE0;
let frozen = reduced();

// The moon: low, behind the sub and to the left of the shot.
const MOON = new THREE.Vector3(-0.72, 0.24, -0.65).normalize();
// The hull runs across the shot, bow to the right and a little toward the lens.
const YAW = -0.5;

/* ---------- bar ---------- */
const ui = initPage({ id: ID, bar: {
  actions: [
    { verb: 'surface', label: 'Surface', key: 'Space', hold: true, onDown: () => holdOn(), onUp: () => holdOff() },
    { verb: 'dive', label: 'Dive', key: 'D', onPress: () => dive() },
  ],
  slider: { label: 'Ice', min: 0.6, max: 2.6, step: 0.1, value: thick, onInput: v => setIce(v) },
  quality: true,
  reset: () => resetAll(),
  keys: [['tap', 'surface or dive'], ['hold', 'push slowly'], ['drag', 'look round'], ['space', 'surface']],
  help: [
    ['tap', 'Tap or click Surface: she comes up through the ice; tap again to dive'],
    ['hold', 'Hold to push slowly: the ice bulges and cracks; let go before it breaks and she sinks'],
    ['drag', 'Drag to look round'],
    ['space', 'Hold Space to surface; D dives; R lays fresh ice'],
  ],
} });
const introDone = playIntro({ ready: pageReady() });
const kit = audioKit({ sleepMs: 1500 });
const snd = breachSound(kit);

/* ---------- three ---------- */
let renderer = null, composer = null, bloom = null, scene = null, camera = null, grade = null;
let cssW = 1, cssH = 1;
const D = detail({ maxDpr: 1.5, budget: 2.4e6, steps: 3, settle: 2, onChange: () => resize(true) });

let frame = null, subG = null, slabs = null, F = null, W = null, floe = null, water = null, sky = null, plume = null, plumePass = null;
let masts = null, subOff = 0;
// The sail top over the hull's crown, in metres.
const sailH = () => SUB.sailTop - SUB.crown;
let M = null;

function buildSlabs() {
  if (slabs) { frame.remove(slabs); slabs.dispose(); }
  F = makeField(thick);
  U.uT.value = F.T;
  U.uTop.value = F.top;
  broken = false;
  const geos = fieldGeometries(F);
  let nv = 0;
  for (const g of geos) { g.setIndex([...Array(g.attributes.position.count).keys()]); nv += g.attributes.position.count; }
  slabs = new THREE.BatchedMesh(geos.length, nv, nv, M.slab);
  slabs.castShadow = slabs.receiveShadow = true;
  F.slabs.forEach((s, i) => { s.id = slabs.addInstance(slabs.addGeometry(geos[i])); });
  geos.forEach(g => g.dispose());
  frame.add(slabs);
  placeSlabs();
  buildFloe();
  W?.tex.dispose();
  W = makeFlood(F);
  U.tFlood.value = W.tex;
  U.uFloodMin.value.set(FX0, FZ0);
  U.uFloodSize.value.set(NX * CELL, NZ * CELL);
}

const tM = new THREE.Matrix4(), ONE = new THREE.Vector3(1, 1, 1);
function placeSlabs() {
  for (const s of F.slabs) slabs.setMatrixAt(s.id, tM.compose(s.x, s.q, ONE));
}

// The floe round the field: a wide sheet with a hole.
function buildFloe() {
  if (floe) { frame.remove(floe); floe.geometry.dispose(); }
  const sh = new THREE.Shape([new THREE.Vector2(-3000, -3000), new THREE.Vector2(3000, -3000), new THREE.Vector2(3000, 3000), new THREE.Vector2(-3000, 3000)]);
  sh.holes.push(new THREE.Path([new THREE.Vector2(X0, -Z0), new THREE.Vector2(X0, -Z1), new THREE.Vector2(X1, -Z1), new THREE.Vector2(X1, -Z0)]));
  floe = new THREE.Mesh(new THREE.ShapeGeometry(sh, 1).rotateX(-Math.PI / 2), M.snow);
  floe.position.y = F.top;
  floe.receiveShadow = true;
  frame.add(floe);
}

async function setup() {
  renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
  if (!renderer.extensions.has('EXT_color_buffer_float') && !renderer.extensions.has('EXT_color_buffer_half_float')) throw new Error('no float targets');
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const canvas = renderer.domElement;
  canvas.setAttribute('aria-hidden', 'true');
  stage.append(canvas);
  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x1a2438, 0.0011);
  camera = new THREE.PerspectiveCamera(9, 1.6, 1, 6000);
  sky = makeSky(MOON);
  scene.add(sky);
  const envScene = new THREE.Scene();
  envScene.add(new THREE.Mesh(new THREE.SphereGeometry(100, 32, 16), sky.material));
  const pm = new THREE.PMREMGenerator(renderer);
  scene.environment = pm.fromScene(envScene, 0.02).texture;
  pm.dispose();
  const moon = new THREE.DirectionalLight(0xd6e0ff, 1.4);
  moon.position.copy(MOON).multiplyScalar(300);
  moon.castShadow = true;
  moon.shadow.mapSize.set(2048, 2048);
  Object.assign(moon.shadow.camera, { left: -60, right: 60, top: 45, bottom: -45, near: 150, far: 450 });
  moon.shadow.bias = -0.0004;
  moon.shadow.normalBias = 0.04;
  scene.add(moon, moon.target);
  scene.add(new THREE.HemisphereLight(0x3a4458, 0x0c1018, 0.3));
  M = {
    snow: iceMaterial(false), slab: iceMaterial(true), hull: hullMaterial(), water: waterMaterial(),
    ridge: new THREE.MeshStandardMaterial({ color: 0xb8c4d6, roughness: 0.9 }),
  };
  scene.add(makeRidges(M.ridge));
  frame = new THREE.Group();
  frame.rotation.y = YAW;
  scene.add(frame);
  mark('model');
  const g = await loadSub(new URL('./akula.glb', import.meta.url).href);
  subG = new THREE.Group();
  const hull = new THREE.Mesh(g.hull, M.hull);
  hull.castShadow = hull.receiveShadow = true;
  masts = new THREE.Mesh(g.masts, M.hull);
  masts.castShadow = true;
  subG.add(hull, masts);
  // The sail's middle stands under the star's centre.
  subOff = CX - SUB.sailX;
  subG.position.x = subOff;
  frame.add(subG);
  water = new THREE.Mesh(new THREE.PlaneGeometry(X1 - X0 + 6, Z1 - Z0 + 6, 1, 1).rotateX(-Math.PI / 2).translate((X0 + X1) / 2, 0, (Z0 + Z1) / 2), M.water);
  water.receiveShadow = true;
  frame.add(water);
  buildSlabs();
  const rt = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 });
  composer = new EffectComposer(renderer, rt);
  composer.addPass(new RenderPass(scene, camera));
  plume = makePlume(renderer);
  plume.MU.uSun.value.copy(MOON);
  plume.MU.uSunCol.value.setRGB(0.55, 0.66, 0.95);
  plume.MU.uSky.value.setRGB(0.035, 0.05, 0.085);
  plume.MU.uFog.value.copy(scene.fog.color);
  plume.MU.uFogD.value = scene.fog.density;
  plumePass = new ShaderPass(COMPOSITE);
  plumePass.uniforms.tMist.value = plume.texture;
  composer.addPass(plumePass);
  bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.55, 0.5, 0.9);
  composer.addPass(bloom);
  grade = new ShaderPass(GRADE);
  composer.addPass(grade);
  composer.addPass(new OutputPass());
  canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); halt(); });
  canvas.addEventListener('webglcontextrestored', () => wake());
}

// Film grain and a soft vignette, before tone mapping.
const GRADE = {
  uniforms: { tDiffuse: { value: null }, uSeed: { value: 0 } },
  vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse; uniform float uSeed; varying vec2 vUv;
    float h(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233)) + uSeed) * 43758.5453); }
    void main() {
      vec4 c = texture2D(tDiffuse, vUv);
      vec2 q = vUv - 0.5;
      c.rgb *= 1.0 - 0.55 * dot(q, q);
      c.rgb += (h(gl_FragCoord.xy) - 0.5) * 0.012 * (0.4 + c.rgb);
      gl_FragColor = c;
    }`,
};

// The shot: a long lens from a pressure ridge, 7 m over the floe, 115 m from the sail.
const EYE = new THREE.Vector3(0, 7, 115);
const AIM = new THREE.Vector3(2, 2.1, 0);
function frame3() {
  const asp = cssW / cssH;
  const hfov = asp < 1 ? 19 : 17;
  const v = 2 * Math.atan(Math.tan((hfov * Math.PI) / 360) / asp) * 180 / Math.PI;
  camera.fov = Math.max(10, Math.min(40, v));
  camera.aspect = asp;
  camera.updateProjectionMatrix();
}

let Wpx = 0, Hpx = 0;
function resize(force = false) {
  if (!composer) return;
  const r = stage.getBoundingClientRect();
  cssW = Math.max(1, r.width); cssH = Math.max(1, r.height);
  const dpr = D.dpr(cssW, cssH);
  const w = Math.round(cssW * dpr), h = Math.round(cssH * dpr);
  if (!force && w === Wpx && h === Hpx) return;
  Wpx = w; Hpx = h;
  renderer.setPixelRatio(dpr);
  renderer.setSize(cssW, cssH, false);
  composer.setPixelRatio(dpr);
  composer.setSize(cssW, cssH);
  bloom.resolution.set(Math.round(w / 2), Math.round(h / 2));
  frame3();
  // The ladder: pixel ratio first, then the plume buffer, then the slab substeps.
  const fx = D.rung >= 2 ? 0.5 : 1;
  plume.setSize(Math.round(w * fx), Math.round(h * fx));
  subN = D.rung >= 3 ? 2 : 3;
  wake();
}

/* ---------- the sub ---------- */
// Crown height over the water line; phases rest, rise, breach, up, dive.
const SUBS = { yc: 0, vy: 0, phase: 'rest', held: false };
const restY = () => F.bot - 2.5 - sailH();
const UP_Y = 0.2;
let bulge = 0, front = 0, broken = false, mastK = 0;
const events = [];
let pressAt = 0;
function holdOn() {
  pressAt = performance.now();
  SUBS.held = true;
  if (SUBS.phase === 'rest' || SUBS.phase === 'dive') { SUBS.phase = 'rise'; snd.blow(); }
  touch();
}
// A short press surfaces her all the way; a long hold let go before the breach sinks her.
function holdOff() {
  SUBS.held = false;
  if (SUBS.phase === 'rise' && performance.now() - pressAt > 400) SUBS.phase = 'dive';
  touch();
}
function dive() {
  if (SUBS.phase === 'rest' || SUBS.phase === 'dive') return;
  SUBS.phase = 'dive';
  diveAt = simT;
  freeze *= 0.3;
  snd.vent();
  touch();
}
function resetAll() {
  SUBS.phase = 'rest'; SUBS.held = false;
  buildSlabs();
  SUBS.yc = restY(); SUBS.vy = 0;
  bulge = 0; front = 0; freeze = 0; lvl = 0; lvlV = 0; mastK = 0;
  U.uWet.value = 0; U.uRing.value.w = 0;
  plume?.clear();
  plumeUntil = -1;
  snd.cancel();
  touch();
}
function setIce(v) {
  thick = v;
  save('ice', v);
  if (SUBS.phase === 'rest') resetAll();
  touch();
}

function stepSub(dt) {
  const P = SUBS.phase;
  let goal = 0;
  if (P === 'rise') goal = bulge > 0 ? 0.5 : 1.4;
  else if (P === 'breach') goal = SUBS.yc < UP_Y - 1.5 ? 1.25 : Math.max(0.05, (UP_Y - SUBS.yc) * 0.8);
  else if (P === 'dive') goal = SUBS.yc > restY() + 1 ? -1.0 : Math.min(-0.05, (restY() - SUBS.yc) * 0.8);
  SUBS.vy += (goal - SUBS.vy) * Math.min(1, dt * 2.2);
  SUBS.yc += SUBS.vy * dt;
  if (P === 'breach' && SUBS.yc >= UP_Y - 0.02) { SUBS.phase = 'up'; SUBS.vy = 0; }
  if (P === 'dive' && SUBS.yc <= restY() + 0.02) { SUBS.phase = 'rest'; SUBS.vy = 0; SUBS.yc = restY(); }
  if (SUBS.phase === 'up') SUBS.vy = 0;
  // The sail's push on the unbroken floe.
  const top = SUBS.yc + sailH();
  if (!broken) {
    const was = bulge;
    bulge = Math.max(0, top - F.bot);
    // The floe gives once the sail top is up at the ice top: it tents a long way first.
    const brk = F.T + 0.15 + 0.1 * thick;
    const k = Math.min(1, bulge / brk);
    const was2 = front;
    front = Math.max(front, 24 * k * k);
    // The floe tents higher than the sail's push: it bends before it breaks.
    poseBulge(F, Math.min(bulge * 1.8, bulge + 0.5));
    snd.groan(SUBS.phase === 'rise' && bulge > 0 ? 0.25 + 0.75 * k : 0);
    // Each new ring of cracks snaps.
    if (Math.floor(front / 3) > Math.floor(was2 / 3)) snd.crack(0.35 + 0.5 * k, Math.random() * 0.6 - 0.3);
    if (bulge >= brk) breakIce();
    else if (was > 0 && bulge === 0) snd.groan(0);
  } else {
    snd.groan(0);
    // Broken ice gives no fight: she comes straight up through the loose slabs.
    if (SUBS.phase === 'rise') { SUBS.phase = 'breach'; breakAt = simT; U.uWet.value = 1; }
  }
  // The masts come up once she is up, and go down for the dive.
  const mk = SUBS.phase === 'up' ? 1 : 0;
  mastK += Math.sign(mk - mastK) * Math.min(Math.abs(mk - mastK), dt / 4);
  const e = mastK * mastK * (3 - 2 * mastK);
  masts.position.y = -(SUB.mastTop - SUB.roof + 0.2) * (1 - e);
}
function breakIce() {
  broken = true;
  SUBS.phase = 'breach';
  // The sail blows through: a lurch up, the slabs over it thrown off to the sides.
  SUBS.vy = 2.4;
  for (const s of F.slabs) {
    s.awake = true; s.still = 0;
    s.v.y = s.e < 12 ? 2.4 * (1 - s.e / 12) : 0;
    if (s.e < 7) {
      const dz = s.cz - CZ || 0.1, k = 1 - s.e / 7;
      // Off the sail's sides, across the hull, tumbling outward.
      s.v.y += 1.6 * k;
      s.v.z += Math.sign(dz) * (1.8 + 1.4 * k);
      s.v.x += (s.cx - CX) * 0.12;
      s.w.x += Math.sign(dz) * 1.4 * k;
    }
  }
  front = 99;
  breakAt = simT;
  U.uRing.value.set(CX, CZ, simT, 1);
  U.uWet.value = 1;
  freeze = 0;
  lvlV += 1.6;
  snd.breach();
  touch();
}

/* ---------- water ---------- */
// The hole's level over the sea, with a slow slosh; freeze runs 0 to 1.
let lvl = 0, lvlV = 0, freeze = 0, breakAt = -99, diveAt = -99, floodLive = false;
function stepWater(dt) {
  const P = SUBS.phase;
  // The rising hull lifts the sea in the hole; the dive pulls it down.
  let goal = 0;
  if (P === 'breach') goal = F.top + 0.16 + 0.14 * Math.min(1, SUBS.vy);
  // The settling hull keeps the sea over the floe a while after.
  else if (P === 'up' && simT - breakAt < 14) goal = F.top + 0.16 * (1 - (simT - breakAt) / 14);
  else if (P === 'dive' && simT - diveAt < 3) goal = -0.25;
  lvlV += ((goal - lvl) * 5 - lvlV * 1.1) * dt;
  lvl += lvlV * dt;
  water.position.y = Math.min(lvl, F.top - 0.03);
  U.uSurge.value = Math.min(1, Math.abs(lvlV) * 2);
  if (broken) {
    markOpen(W, F);
    for (let i = 0; i < 2; i++) floodLive = stepFlood(W, dt / 2, lvl - F.top);
    uploadFlood(W);
    // The water calms, then the hole freezes over.
    const calm = Math.abs(lvlV) < 0.05 && P !== 'breach';
    freeze = Math.min(1, freeze + (calm ? dt / (P === 'rest' ? 50 : 90) : 0));
  } else floodLive = false;
  U.uFreeze.value = freeze;
  U.uRing.value.w = Math.max(0, 1 - (simT - breakAt) / 14);
  if (U.uWet.value > 0) U.uWet.value = Math.max(0, 1 - (simT - breakAt) / 90);
  U.uWetT.value = simT - breakAt;
  snd.water(Math.min(1, Math.abs(lvlV) * 0.8 + (floodLive ? 0.25 : 0)));
}
// The healed floe: frozen over with the sub down, the field lies whole again.
function heal() {
  for (const s of F.slabs) {
    s.x.copy(s.home); s.q.identity(); s.v.set(0, 0, 0); s.w.set(0, 0, 0); s.awake = false;
  }
  broken = false; front = 0; bulge = 0;
}

/* ---------- plume ---------- */
let plumeUntil = -1, plumeAcc = 0, plumeLive = false, plumeShown = false;
const puffs = [];
const tW = new THREE.Vector3(), tW2 = new THREE.Vector3();
const toWorld = (x, y, z, out) => frame.localToWorld(out.set(x, y, z));
function drivePlume(dt) {
  const P = SUBS.phase, cut = frozen ? 0.4 : 1;
  let on = false;
  // Jet 0: powder thrown up along the sail as it punches through.
  const since = simT - breakAt;
  if (broken && since < 6 && (P === 'breach' || since < 1.5)) {
    const k = (since < 0.8 ? 0.25 : 0.1 * Math.min(1, SUBS.vy)) * cut;
    // Powder rises along both sides of the sail, so the sail stays in sight.
    const side = Math.floor(simT * 10) % 2 ? 3.6 : -3.6;
    toWorld(-9, F.top + 0.6, side, tW); toWorld(6, F.top + 0.6, side, tW2);
    plume.jet(0, tW.toArray(), tW2.toArray(), 2.4, [0, 3.5 + 3 * Math.max(0, 1 - since), side * 0.5], 0.4, k, 0);
    on = true;
  } else plume.off(0);
  // Jets 1 and 2: puffs where slabs strike the hull or each other.
  for (let i = 0; i < 2; i++) {
    const p = puffs[i];
    if (p && simT - p.t < 0.3) { plume.jet(1 + i, p.a, p.a, 1.6, [0, 2.2, 0], 0.3, p.k * cut, 0); on = true; }
    else plume.off(1 + i);
  }
  // Jet 3: sea smoke off the open water until it freezes.
  if (broken && freeze < 0.95) {
    toWorld(-18, 0.6, 0, tW); toWorld(10, 0.6, 0, tW2);
    plume.jet(3, tW.toArray(), tW2.toArray(), 5.5, [0, 0.5, 0], 0.08, 0, 0.008 * (1 - freeze) * (P === 'rest' ? 0.5 : 1) * cut);
    on = true;
  } else plume.off(3);
  if (on) plumeUntil = simT + 25;
  if (simT > plumeUntil) return false;
  // The fluid steps at 30 Hz, whatever the frame rate.
  plumeAcc = Math.min(plumeAcc + dt, 0.1);
  while (plumeAcc >= 1 / 30) { plume.step(1 / 30); plumeAcc -= 1 / 30; }
  return true;
}
function addPuff(e) {
  const k = Math.min(0.8, e.k * 0.06);
  if (k < 0.1) return;
  const i = puffs[0] && simT - puffs[0].t < 0.3 ? 1 : 0;
  puffs[i] = { t: simT, a: toWorld(e.x, e.y, e.z, new THREE.Vector3()).toArray(), k };
}

/* ---------- simulation ---------- */
let simT = 0, subN = 3, calmFor = 0;
function step(dt) {
  stepSub(dt);
  // The slabs settle once the sub has stopped, up or down.
  calmFor = SUBS.phase === 'up' || SUBS.phase === 'rest' ? calmFor + dt : 0;
  subG.position.y = SUBS.yc - SUB.crown;
  let slabLive = false;
  if (broken) {
    if (SUBS.phase !== 'rest' && SUBS.phase !== 'up') wakeSlabs(F, CX, CZ, 34);
    const tp = performance.now();
    pairUp(F);
    for (let i = 0; i < subN; i++) stepField(F, dt / subN, { x: subOff, y: SUBS.yc - SUB.crown, vy: SUBS.vy, calm: calmFor > 3 }, events);
    if (QA) QA.phys = (QA.phys || 0) + performance.now() - tp;
    // The pack locks a few seconds after the sub stops: brash freezes round every slab.
    if (calmFor > 7) for (const s of F.slabs) if (s.awake) { s.awake = false; s.v.set(0, 0, 0); s.w.set(0, 0, 0); }
    slabLive = F.slabs.some(s => s.awake);
    if (freeze >= 1 && SUBS.phase === 'rest') { heal(); slabLive = false; }
  }
  placeSlabs();
  stepWater(dt);
  // Knocks and clacks: the loudest two each frame make sound and powder.
  events.sort((a, b) => b.k - a.k);
  for (const e of events.slice(0, 2)) {
    tW.set(e.x, e.y, e.z); frame.localToWorld(tW).project(camera);
    snd.clack(Math.min(1, e.k / 12), Math.max(-1, Math.min(1, tW.x)));
    addPuff(e);
  }
  events.length = 0;
  plumeLive = drivePlume(dt);
  snd.rush(SUBS.phase === 'breach' || SUBS.phase === 'dive' || SUBS.phase === 'rise' ? Math.min(1, Math.abs(SUBS.vy) / 1.2) : 0);
  simT += dt;
  U.uTime.value = simT;
  const moving = SUBS.phase !== 'rest' && SUBS.phase !== 'up';
  return moving || slabLive || floodLive || Math.abs(lvlV) > 0.01 || (mastK > 0 && mastK < 1);
}

function render() {
  camera.position.copy(EYE);
  camera.lookAt(AIM);
  camera.rotateY(yaw);
  if (plumeLive) { plume.draw(scene, camera, [sky]); plumeShown = true; }
  else if (plumeShown) { plume.blank(); plumeShown = false; }
  grade.uniforms.uSeed.value = (simT * 7.3) % 10;
  composer.render();
}

/* ---------- frame loop ---------- */
let visible = true, raf = 0, timer = 0, last = 0, lastInput = performance.now(), yaw = 0, yawGoal = 0, wasLive = false;
function tick(now) {
  raf = 0;
  if (!visible || !composer) return;
  const t0 = performance.now();
  const dt = Math.max(0, Math.min(0.05, (now - last) / 1000));
  last = Math.max(last, now);
  let again = true, lively = true;
  try {
    const idle = (t0 - lastInput) / 1000;
    // Ambient motion (sea smoke, the freeze) eases to a stop 60 s after the last input.
    const amb = frozen ? 0 : idle < 60 ? 1 : Math.max(0, 1 - (idle - 60) / 2);
    yaw += (yawGoal - yaw) * 0.12;
    const ts = performance.now();
    const live = step(wasLive ? dt : dt * amb);
    wasLive = live;
    const tr = performance.now();
    render();
    if (QA) { QA.step += tr - ts; QA.render += performance.now() - tr; QA.n++; }
    D.frame(dt);
    lively = live || dragging || Math.abs(yawGoal - yaw) > 1e-4;
    again = lively || (amb > 0 && (plumeLive || (broken && freeze < 1)));
  } finally {
    // A thrown error still leaves the loop able to wake.
    if (!again) snd.rest();
    else schedule(lively ? 0 : Math.max(0, 31.5 - (performance.now() - t0)));
  }
}
// One frame at most is ever pending, so loops never stack.
function schedule(delay) {
  if (raf || timer || !visible || !renderer) return;
  if (delay > 0) timer = setTimeout(() => { timer = 0; raf = requestAnimationFrame(tick); }, delay);
  else raf = requestAnimationFrame(tick);
}
function wake() {
  if (timer) { clearTimeout(timer); timer = 0; }
  if (!raf) last = performance.now();
  schedule(0);
}
function halt() { cancelAnimationFrame(raf); raf = 0; clearTimeout(timer); timer = 0; }
function touch() { lastInput = performance.now(); wake(); }

/* ---------- gestures ---------- */
// A press holds to surface; a drag looks round; a tap dives.
let dragging = false, pid = null, px0 = 0, py0 = 0, moved = false, yaw0 = 0, t0p = 0;
stage.addEventListener('pointerdown', e => {
  if (e.button !== 0 || !renderer || (e.target !== renderer.domElement && e.target !== stage)) return;
  try { stage.setPointerCapture(e.pointerId); } catch { /* capture is optional */ }
  pid = e.pointerId; px0 = e.clientX; py0 = e.clientY; moved = false; yaw0 = yawGoal; t0p = performance.now();
  if (SUBS.phase === 'rest' || SUBS.phase === 'dive' || SUBS.phase === 'rise') holdOn();
  touch();
});
stage.addEventListener('pointermove', e => {
  if (e.pointerId !== pid) return;
  const dx = e.clientX - px0;
  // A drag looks round: it cancels the press, so she does not come up.
  if (!moved && Math.hypot(dx, e.clientY - py0) > 8) { moved = true; dragging = true; if (SUBS.held) { SUBS.held = false; if (SUBS.phase === 'rise') SUBS.phase = 'dive'; } }
  if (moved) { yawGoal = Math.max(-0.12, Math.min(0.12, yaw0 - (dx / cssW) * 0.25)); touch(); }
});
function end(e) {
  if (e.pointerId !== pid) return;
  pid = null;
  const tap = !moved && e.type === 'pointerup' && performance.now() - t0p < 260;
  if (tap && (SUBS.phase === 'up' || SUBS.phase === 'breach')) dive();
  else if (SUBS.held) holdOff();
  dragging = false;
  yawGoal = 0;
  touch();
}
['pointerup', 'pointercancel', 'lostpointercapture'].forEach(t => stage.addEventListener(t, end));
stage.addEventListener('keydown', e => { if (e.key === 'r' || e.key === 'R') { resetAll(); e.preventDefault(); } });

/* ---------- life cycle ---------- */
whenVisible(stage, on => { visible = on; if (on) wake(); else { halt(); snd.hide(); } });
sound.onChange(on => { if (on) touch(); else snd.cancel(); });
onReducedChange(on => { frozen = on; wake(); });
new ResizeObserver(() => resize()).observe(stage);
if (QA) globalThis.__ice = { QA, SUBS, get F() { return F; }, get W() { return W; }, holdOn, holdOff, dive, resetAll, EYE, AIM, U, get slabs() { return slabs; }, get sub() { return subG; }, get floe() { return floe; }, get freeze() { return freeze; }, set freeze(v) { freeze = v; } };

mark('build');
try {
  await setup();
  SUBS.yc = restY();
  masts.position.y = -(SUB.mastTop - SUB.roof + 0.2);
  subG.position.y = SUBS.yc - SUB.crown;
  resize(true);
  render();
  await renderer.compileAsync(scene, camera);
  render();
  renderer.getContext().finish();
  renderer.domElement.classList.add('on');
  mark('first-frame');
  wake();
} catch (err) {
  console.error(err);
  fail.removeAttribute('hidden');
  ui.hideControls?.();
}
void introDone;
