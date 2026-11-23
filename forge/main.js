// Forge: a coal forge in a dim smithy. Heat the bar, hammer it, quench it.
// three.js 0.170: the smithy, the steel, sparks, steam, haze, bloom, grade.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { initPage, whenVisible, pageReady, stage as mark, reduced, onReducedChange, audioKit, sound } from '../shared/stim.js';
import { intro as playIntro } from '../shared/intro.js';
import { detail } from '../shared/detail.js';
import { heatRGB, HAZE, STEAMMIX, GRADE } from './shaders.js';
import { materials, room, hearth, coals, bellows, anvil, trough, hammer, tongs, envMap, COALS, FACE, ANVIL, HEARTH, TROUGH, WINDOW } from './smithy.js';
import { makeSteel } from './steel.js';
import { makeSparks, makeFlakes } from './sparks.js';
import { makeFluid } from './steam.js';
import { forgeSound } from './sound.js';
mark('libs');

const ID = 'forge';
const stage = document.getElementById('stage');
const fail = stage.querySelector('.fail');
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const ease = t => t * t * (3 - 2 * t);
const saved = k => { try { return localStorage.getItem(`stimming.${ID}.${k}`); } catch { return null; } };
const save = (k, v) => { try { localStorage.setItem(`stimming.${ID}.${k}`, String(v)); } catch { /* storage is optional */ } };
const qa = new URLSearchParams(location.search);
let frozen = reduced();

/* ---------- state ---------- */
const KG0 = 1.2;
const kgSaved = Number(saved('hammer'));
const st = {
  kg: kgSaved >= 0.5 && kgSaved <= 2 ? kgSaved : KG0,
  // The fire: air from the bellows, and the core heat in degrees C.
  air: 0.35, coal: 960,
  // The bellows stroke clock, and a hold that keeps it going.
  stroke: -1, pumpHold: false, pumpKey: false,
  // Where the bar is bound, and whether it is moving there.
  at: 'anvil', move: null, drag: null,
  // The hammer: blow clock, a hold, strikes waiting for the bar.
  blow: -1, lastBlow: -9, strikeHold: false, strikeKey: false, queued: 0, feed: 0, feedK: 0, ready: 0,
  // The quench: time in the water, the boil, the steam.
  wetT: -1, boil: 0, steam: 0, plungeT: -9, plungeP: new THREE.Vector2(),
  shake: 0, flash: 0,
};
const FEEDS = [0.03, 0.05, 0.07, 0.09, 0.07, 0.05];

/* ---------- bar ---------- */
const ui = initPage({ id: ID, bar: {
  choice: {
    label: 'Station', value: st.at,
    options: [
      { value: 'fire', label: 'Fire', key: '1' },
      { value: 'anvil', label: 'Anvil', key: '2' },
      { value: 'trough', label: 'Trough', key: '3' },
    ],
    onPick: v => { goTo(v); touch(); },
  },
  actions: [
    { verb: 'strike', label: 'Strike', key: 'Space', hold: true, onDown: () => strikeKey(true), onUp: () => strikeKey(false) },
    { verb: 'pump', label: 'Pump', key: 'b', hold: true, onDown: () => pumpKey(true), onUp: () => pumpKey(false) },
    { verb: 'new', label: 'New bar', key: 'n', onPress: () => newBar() },
  ],
  slider: { label: 'Hammer', min: 0.5, max: 2, step: 0.1, value: st.kg, onInput: v => { st.kg = v; save('hammer', v); } },
  quality: true,
  reset: () => { st.kg = KG0; save('hammer', KG0); ui.slider?.set?.(KG0); },
  keys: [['click', 'strike'], ['drag', 'move bar'], ['space', 'strike'], ['b', 'pump']],
  help: [
    ['click', 'Click the bellows to pump; the coals flare and the bar heats'],
    ['drag', 'Drag the bar between the fire, the anvil and the trough'],
    ['click', 'Click at the anvil to hammer; hold to keep hammering'],
    ['space', 'Space strikes, B pumps, 1 to 3 move the bar'],
  ],
} });
const introDone = playIntro({ ready: pageReady() });
const kit = audioKit({ keys: new Set([' ', 'b', 'B', 'n', 'N', '1', '2', '3']), sleepMs: 1500 });
const snd = forgeSound(kit);

/* ---------- three ---------- */
let renderer = null, composer = null, bloom = null, haze = null, grade = null, steamMix = null, sceneDepth = null;
let scene = null, camera = null, M = null, fireU = null, steel = null, bel = null, tong = null, ham = null, water = null;
let coalLight = null, barLight = null, flashLight = null, sparks = null, flakes = null, steam = null;
const D = detail({ maxDpr: 1.5, budget: 2.2e6, steps: 3, settle: 2, onChange: () => resize(true) });
const SPARK_MAX = 4000;

// The height a spark or a flake comes to rest at.
function floorAt(x, z) {
  if (x > ANVIL.x - 0.08 && x < ANVIL.x + 0.32 && Math.abs(z - ANVIL.z) < 0.05) return FACE.y;
  if (Math.abs(x - HEARTH.x) < HEARTH.w / 2 + 0.03 && Math.abs(z - HEARTH.z) < HEARTH.d / 2 + 0.03) return HEARTH.h;
  if (Math.abs(x - TROUGH.x) < TROUGH.w / 2 && Math.abs(z - TROUGH.z) < TROUGH.d / 2) return TROUGH.water;
  return 0;
}

const WATER_HEAD = /* glsl */`
uniform float uTime, uBoil, uRipT;
uniform vec2 uRipP;
varying vec3 vWP;
float wh(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float wn(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(wh(i), wh(i + vec2(1, 0)), f.x), mix(wh(i + vec2(0, 1)), wh(i + vec2(1, 1)), f.x), f.y); }
// The surface height: rings from the plunge, and the boil round the bar.
float wave(vec2 p) {
  float r = length(p - uRipP);
  float t = uRipT;
  float ring = sin(r * 90.0 - t * 22.0) * exp(-abs(r - t * 0.24) * 30.0) * exp(-t * 0.9) * 0.002;
  float boil = (wn(p * 70.0 + vec2(0.0, uTime * 3.0)) + wn(p * 150.0 - vec2(uTime * 5.0, 0.0)) * 0.5) * uBoil * exp(-r * r * 60.0) * 0.003;
  return ring + boil + wn(p * 9.0 + uTime * 0.05) * 0.0004;
}`;

async function setup() {
  renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
  const ext = renderer.extensions;
  if (!ext.has('EXT_color_buffer_float') && !ext.has('EXT_color_buffer_half_float')) throw new Error('no float targets');
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const canvas = renderer.domElement;
  canvas.setAttribute('aria-hidden', 'true');
  stage.append(canvas);
  camera = new THREE.PerspectiveCamera(42, 1.6, 0.05, 40);
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x010101);
  M = materials();
  const env = envMap(renderer);
  for (const m of Object.values(M)) { m.envMap = env; m.envMapIntensity = 0.3; }
  scene.add(room(M), hearth(M), anvil(M));
  const tr = trough(M);
  water = tr.surf;
  scene.add(tr.g);
  // The water: ripples and a boil bend its normal.
  const WU = { uTime: { value: 0 }, uBoil: { value: 0 }, uRipT: { value: 9 }, uRipP: { value: new THREE.Vector2(9, 9) } };
  M.water.onBeforeCompile = s => {
    Object.assign(s.uniforms, WU);
    s.vertexShader = 'varying vec3 vWP;\n' + s.vertexShader.replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWP = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    s.fragmentShader = `${WATER_HEAD}
` + s.fragmentShader.replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
      {
        vec2 p = vWP.xz; float e = 0.0015;
        vec2 g = vec2(wave(p + vec2(e, 0.0)) - wave(p - vec2(e, 0.0)), wave(p + vec2(0.0, e)) - wave(p - vec2(0.0, e))) / (2.0 * e);
        normal = normalize(normal - (viewMatrix * vec4(g.x, 0.0, g.y, 0.0)).xyz);
        // Foam where the boil breaks the surface.
        float f = smoothstep(0.62, 0.9, wn(p * 120.0 + vec2(uTime * 4.0, 0.0))) * uBoil * exp(-pow(length(p - uRipP), 2.0) * 90.0);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.35, 0.36, 0.37), f);
      }`);
  };
  M.water.userData.U = WU;
  const c = coals();
  fireU = c.U;
  scene.add(c.g);
  bel = bellows(M);
  scene.add(bel.g);
  steel = makeSteel();
  steel.mat.envMap = env; steel.mat.envMapIntensity = 0.3;
  tong = new THREE.Group();
  tong.add(steel.mesh, tongs(M));
  scene.add(tong);
  ham = new THREE.Group();
  const hm = hammer(M);
  ham.add(hm);
  scene.add(ham);
  coalLight = new THREE.PointLight(0xffffff, 1, 0, 2);
  coalLight.position.set(COALS.x, COALS.y + 0.32, COALS.z + 0.1);
  coalLight.castShadow = false;
  coalLight.shadow.mapSize.set(1024, 1024);
  coalLight.shadow.bias = -0.002;
  coalLight.shadow.radius = 5;
  coalLight.shadow.camera.near = 0.05;
  barLight = new THREE.PointLight(0xffffff, 0, 0, 2);
  flashLight = new THREE.PointLight(0xffd8a0, 0, 0, 2);
  const win = new THREE.SpotLight(new THREE.Color(0.5, 0.65, 1.0), 2.2, 0, 0.45, 0.85, 1.1);
  win.position.set(WINDOW.x, WINDOW.y, WINDOW.z + 0.05);
  win.target.position.set(0.55, 0, 0.9);
  const hemi = new THREE.HemisphereLight(0x11161f, 0x170d06, 0.7);
  scene.add(coalLight, barLight, flashLight, win, win.target, hemi);
  sparks = makeSparks(SPARK_MAX, floorAt);
  scene.add(sparks.mesh);
  flakes = makeFlakes(220, floorAt);
  flakes.setHeat(heatRGB);
  scene.add(flakes.mesh);

  const rt = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 });
  rt.depthTexture = new THREE.DepthTexture(1, 1, THREE.UnsignedIntType);
  composer = new EffectComposer(renderer, rt);
  composer.addPass(new RenderPass(scene, camera));
  // The haze reads the scene's depth from the buffer the scene went to.
  haze = new ShaderPass(HAZE);
  const hazeRender = haze.render.bind(haze);
  // The two composer buffers share one depth texture, so the next pass
  // overwrites it: the steam marches here, while the scene's depth holds.
  haze.render = (r, wb, rb, ...rest) => {
    sceneDepth = rb.depthTexture;
    haze.uniforms.tDepth.value = sceneDepth;
    if (steamMix.enabled) steam.draw(camera, sceneDepth, frameNo);
    hazeRender(r, wb, rb, ...rest);
  };
  const HU = haze.uniforms;
  HU.uLP.value = [0, 1, 2].map(() => new THREE.Vector4(0, 0, 0, 1));
  HU.uLC.value = [0, 1, 2].map(() => new THREE.Vector3());
  HU.uShaftC.value = new THREE.Vector3(0.35, 0.5, 0.8);
  HU.uWin.value = new THREE.Vector4(WINDOW.x, WINDOW.y, WINDOW.z, WINDOW.w);
  HU.uShaftD.value = new THREE.Vector3(-0.22, -0.62, 0.75).normalize();
  HU.uProjInv.value = camera.projectionMatrixInverse;
  HU.uCamW.value = camera.matrixWorld;
  HU.uCamP.value = camera.position;
  composer.addPass(haze);
  // The steam marches against the scene's depth, then lies over it.
  steam = makeFluid(renderer);
  steamMix = new ShaderPass(STEAMMIX);
  steamMix.uniforms.uRes.value = new THREE.Vector2(1, 1);
  const steamRender = steamMix.render.bind(steamMix);
  steamMix.render = (r, wb, rb, ...rest) => {
    steamMix.uniforms.tVol.value = steam.col; steamMix.uniforms.tVolHeat.value = steam.heat;
    steamRender(r, wb, rb, ...rest);
  };
  steamMix.enabled = false;
  composer.addPass(steamMix);
  bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.6, 0.5, 0.92);
  composer.addPass(bloom);
  grade = new ShaderPass(GRADE);
  composer.addPass(grade);
  composer.addPass(new OutputPass());
  canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); halt(); });
  canvas.addEventListener('webglcontextrestored', () => wake());
}

/* ---------- where the bar goes: the three stations ---------- */
const UP = new THREE.Vector3(0, 1, 0);
// The hammer meets the bar here, on the face near the step.
const STRIKE = FACE.clone().add(new THREE.Vector3(-0.07, 0, 0));
const DIR_A = new THREE.Vector3(-1, 0, -0.28).normalize();
const pose = (tip, dir, pitch) => ({ tip: tip.clone(), yaw: Math.atan2(dir.z, -dir.x), pitch });
function stationPose(name) {
  if (name === 'fire') return pose(COALS.clone().add(new THREE.Vector3(0.03, 0.05, 0.05)), new THREE.Vector3(-0.8, 0, -0.6).normalize(), 0.06);
  if (name === 'trough') return pose(new THREE.Vector3(TROUGH.x - 0.06, TROUGH.water - 0.17, TROUGH.z + 0.01), new THREE.Vector3(-0.55, 0, -0.45).normalize(), 0.95);
  // On the anvil the bar slides along its line as the blows walk.
  const f = FEEDS[st.feed % FEEDS.length];
  return pose(STRIKE.clone().addScaledVector(DIR_A, f).setY(FACE.y + 0.0125), DIR_A, 0);
}
const cur = stationPose('anvil');
function lerpPose(a, b, k, lift) {
  const e = ease(k);
  let dy = b.yaw - a.yaw;
  dy = Math.atan2(Math.sin(dy), Math.cos(dy));
  return {
    tip: a.tip.clone().lerp(b.tip, e).addScaledVector(UP, lift * Math.sin(Math.PI * e)),
    yaw: a.yaw + dy * e,
    pitch: a.pitch + (b.pitch - a.pitch) * e - lift * 0.6 * Math.sin(Math.PI * e),
  };
}
function goTo(name, dur = 0.75) {
  if (!steel || (name === st.at && !st.move && !st.drag)) return;
  const from = { tip: cur.tip.clone(), yaw: cur.yaw, pitch: cur.pitch };
  if (st.at === 'trough' && st.wetT >= 0) snd.clink(panOf(cur.tip), 0.5);
  st.at = name;
  st.move = { from, t: 0, dur, lift: 0.24 };
  st.wetT = -1;
  ui.choice?.set(name);
  syncActs();
}
function syncActs() {
  const s = ui.action?.('strike');
  if (s) s.disabled = false;
}

/* ---------- the bellows and the fire ---------- */
const OPEN = 0.3, SHUT = 0.05;
function pump() {
  if (st.stroke >= 0 && st.stroke < 0.7) return;
  st.stroke = 0;
  snd.pump(0.8 + 0.4 * Math.random());
}
function bellowsAngle() {
  const s = st.stroke;
  if (s < 0) return OPEN;
  if (s < 0.26) return OPEN - (OPEN - SHUT) * ease(s / 0.26);
  return SHUT + (OPEN - SHUT) * ease(Math.min(1, (s - 0.26) / 0.6));
}
function stepFire(dt) {
  if (st.stroke >= 0) {
    const s0 = st.stroke;
    st.stroke += dt;
    // The blast lands as the boards close.
    if (s0 < 0.14 && st.stroke >= 0.14) { st.air = Math.min(1.3, st.air + 0.26); st.coal += 25; }
    if (st.stroke > 0.88) st.stroke = (st.pumpHold || st.pumpKey) ? 0 : -1;
    if (st.stroke === 0) snd.pump(0.8 + 0.4 * Math.random());
  } else if (st.pumpHold || st.pumpKey) pump();
  st.air *= Math.exp(-dt / 3.6);
  const target = 820 + 500 * Math.min(1, st.air) + 100 * Math.max(0, st.air - 1);
  st.coal += (target - st.coal) * (1 - Math.exp(-dt / (target > st.coal ? 0.7 : 3.2)));
}

/* ---------- the hammer ---------- */
// Blow clock: lift, fall, strike at 0.17 s, rebound, ready.
const T_HIT = 0.17, T_BLOW = 0.48, READY = -0.7;
function hammerAngle(t) {
  if (t < 0) return READY;
  if (t < 0.1) return READY + (-1.05 - READY) * ease(t / 0.1);
  if (t < T_HIT) { const k = (t - 0.1) / (T_HIT - 0.1); return -1.05 * (1 - k * k); }
  if (t < 0.3) return -0.42 * Math.sin(Math.PI / 2 * (t - T_HIT) / 0.13);
  return -0.42 + (READY + 0.42) * ease(Math.min(1, (t - 0.3) / 0.18));
}
function strike() {
  if (!steel) return;
  if (st.at !== 'anvil' || st.drag) { st.queued = 1; goTo('anvil'); return; }
  if (st.move) { st.queued = 1; return; }
  if (st.blow >= 0) return;
  st.blow = 0;
}
const tmpV = new THREE.Vector3(), tmpW = new THREE.Vector3();
function impact() {
  const local = tong.worldToLocal(tmpV.copy(STRIKE)).x;
  const i = steel.near(local);
  const r = steel.blow(local, st.kg / KG0);
  const heat = r.heat, soft = r.soft;
  const P = [STRIKE.x, FACE.y + 2 * steel.b[i] + 0.002, STRIKE.z];
  const k = frozen ? 0.35 : 1;
  if (heat > 620) {
    // Scale bursts off in a low wide fan; hotter steel throws more.
    const n = Math.round(k * (18 + 150 * Math.min(1.5, r.shed) + 70 * sstep(900, 1250, heat)) * (0.6 + 0.4 * st.kg / KG0));
    sparks.emit(simT, n, P, [0, 1, 0], 1.45, 0.9, 3.8, { life: [0.3, 1.0], drag: 2.2, burn: 0.03 + 0.35 * sstep(1150, 1320, heat), size: 0.6, T: heat + 60, flat: 0.5, spread: 0.03 });
    flakes.emit(Math.round(k * (3 + 26 * Math.min(1, r.shed))), P, heat, 0.8 + 0.3 * st.kg / KG0);
    st.flash = Math.min(1.6, 0.4 + 0.9 * sstep(700, 1200, heat));
  }
  st.shake = frozen ? 0 : 0.35 + 0.4 * soft;
  snd.blow(heat, soft, st.kg, panOf(STRIKE));
  steel.mesh.userData.hit = performance.now();
}
function stepHammer(dt) {
  const there = st.at === 'anvil' && !st.move && !st.drag;
  // The hammer rests on the heel; it rises for blows and lies down after.
  const want = there && (st.blow >= 0 || st.strikeHold || st.strikeKey || st.queued || simT - st.lastBlow < 1.6);
  st.ready += ((want ? 1 : 0) - st.ready) * (1 - Math.exp(-dt * (want ? 14 : 3)));
  if (st.blow >= 0) st.lastBlow = simT;
  if (st.blow >= 0) {
    const t0 = st.blow;
    st.blow += dt;
    if (t0 < T_HIT && st.blow >= T_HIT) impact();
    // The bar walks along the face between blows.
    if (t0 < 0.3 && st.blow >= 0.3) { st.feed++; st.feedK = 0; }
    if (st.blow > T_BLOW) {
      st.blow = -1;
      if (there && (st.strikeHold || st.strikeKey || st.queued)) { st.queued = Math.max(0, st.queued - 1); st.blow = 0; }
    }
  } else if (there && st.ready > 0.9 && (st.strikeHold || st.strikeKey || st.queued)) {
    st.queued = Math.max(0, st.queued - 1);
    st.blow = 0;
  }
}

/* ---------- the quench ---------- */
function stepWater(dt) {
  if (st.at === 'trough' && !st.move && !st.drag) {
    if (st.wetT < 0) {
      st.wetT = 0;
      st.plungeT = 0;
      const p = waterPoint();
      if (p) st.plungeP.set(p.x, p.z);
      snd.plunge(steel.st.maxT);
      steel.shedAll(0.5);
    }
    st.wetT += dt;
    // Cold and quiet: the bar comes out dark and goes back to the anvil.
    if (st.wetT > 3.2 && steel.st.maxT < 160 && st.steam < 0.2) goTo('anvil', 0.95);
  }
  st.plungeT += dt;
  const s = Math.min(1, steel.st.steam / 40);
  st.steam += (s - st.steam) * (1 - Math.exp(-dt * (s > st.steam ? 12 : 1.2)));
  st.boil += (Math.min(1, s * 1.5) - st.boil) * (1 - Math.exp(-dt * (s > st.boil ? 8 : 1.5)));
}
// Where the bar crosses the water's surface, in world space.
function waterPoint() {
  let prev = null;
  for (let i = steel.X.length - 1; i >= 0; i--) {
    const p = tmpW.set(steel.X[i], 0, 0).applyMatrix4(tong.matrixWorld);
    if (p.y < TROUGH.water) return prev ? prev.clone().lerp(p, 0.5) : p.clone();
    prev = p.clone();
  }
  return null;
}

/* ---------- per-sample exposure: fire, anvil, water ---------- */
function expose() {
  const { fire, onAnvil, wet, X } = steel;
  for (let i = 0; i < X.length; i++) {
    const p = tmpW.set(X[i], 0, 0).applyMatrix4(tong.matrixWorld);
    const d = Math.hypot(p.x - COALS.x, (p.z - COALS.z) * 1.1);
    fire[i] = sstep(0.24, 0.08, d) * sstep(COALS.y + 0.12, COALS.y + 0.04, p.y);
    onAnvil[i] = p.x > ANVIL.x - 0.08 && p.x < ANVIL.x + 0.32 && Math.abs(p.z - ANVIL.z) < 0.055 && p.y < FACE.y + 0.02 ? 1 : 0;
    wet[i] = Math.abs(p.x - TROUGH.x) < TROUGH.w / 2 && Math.abs(p.z - TROUGH.z) < TROUGH.d / 2 ? sstep(TROUGH.water + 0.004, TROUGH.water - 0.015, p.y) : 0;
  }
}

/* ---------- the frame ---------- */
let lastDt = 0, simT = 0, clock = 0, lastInput = performance.now(), timeK = 1;
let visible = true, raf = 0, timer = 0, last = 0, frameNo = 0, steamAcc = 0, heatAcc = 0;
const HEAT_DT = 1 / 60, STEAM_DT = 1 / 60;

function stepPose(dt) {
  if (st.drag) {
    const want = st.drag.pose;
    const k = 1 - Math.exp(-dt * 18);
    cur.tip.lerp(want.tip, k);
    let dy = want.yaw - cur.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
    cur.yaw += dy * k; cur.pitch += (want.pitch - cur.pitch) * k;
    return;
  }
  const target = stationPose(st.at);
  if (st.move) {
    st.move.t += dt / st.move.dur;
    const p = lerpPose(st.move.from, target, Math.min(1, st.move.t), st.move.lift);
    cur.tip.copy(p.tip); cur.yaw = p.yaw; cur.pitch = p.pitch;
    if (st.move.t >= 1) {
      st.move = null;
      if (st.at === 'anvil') snd.clink(panOf(cur.tip), 1);
      if (st.at === 'fire') snd.lay();
      if (st.queued && st.at !== 'anvil') st.queued = 0;
    }
    return;
  }
  // At rest the bar eases to its station; on the anvil this is the feed.
  const k = 1 - Math.exp(-dt * 14);
  cur.tip.lerp(target.tip, k);
  cur.yaw += (target.yaw - cur.yaw) * k;
  cur.pitch += (target.pitch - cur.pitch) * k;
}
function placeBar() {
  const L = steel.length();
  tong.rotation.set(0, cur.yaw, cur.pitch, 'YZX');
  tmpV.set(-1, 0, 0).applyEuler(tong.rotation);
  tong.position.copy(cur.tip).addScaledVector(tmpV, -L);
  tong.updateMatrixWorld(true);
}

// The hammer: at rest on the anvil's heel, or ready over the strike point.
const H_DIR = new THREE.Vector3(0.75, 0.5, 0.42).normalize();
const H_K = new THREE.Vector3().crossVectors(H_DIR, UP).normalize();
const H_UP = new THREE.Vector3().crossVectors(H_K, H_DIR).normalize();
const H_BASE = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(H_DIR, H_UP, H_K));
const H_R = 0.36;
const REST_P = new THREE.Vector3(ANVIL.x + 0.22, FACE.y + 0.02, ANVIL.z + 0.01);
const REST_Q = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, -0.5, 0, 'YXZ'));
const qa1 = new THREE.Quaternion(), pa = new THREE.Vector3(), qTmp = new THREE.Quaternion();
function placeHammer() {
  const hm = ham.children[0];
  const th = hammerAngle(st.blow);
  const i = steel.near(tong.worldToLocal(tmpV.copy(STRIKE)).x);
  const top = FACE.y + 2 * steel.b[i] + 0.001;
  // The wrist sits above and behind the strike point, along the handle.
  const W = tmpV.set(STRIKE.x, top + 0.045, STRIKE.z).addScaledVector(H_DIR, H_R);
  qa1.copy(H_BASE).premultiply(qTmp.setFromAxisAngle(H_K, th));
  // The head: the wrist minus the handle, turned by the swing.
  pa.set(-H_R, 0, 0).applyQuaternion(qa1).add(W);
  const k = ease(st.ready);
  ham.position.copy(REST_P).lerp(pa, k).addScaledVector(UP, 0.12 * Math.sin(Math.PI * k));
  ham.quaternion.copy(REST_Q).slerp(qa1, k);
  hm.position.set(0, 0, 0);
}

const rgb = [0, 0, 0];
function place() {
  placeBar();
  placeHammer();
  bel.pose(bellowsAngle());
  fireU.uCoal.value = st.coal;
  fireU.uBlast.value = Math.min(1, st.air);
  fireU.uTime.value = clock;
  steel.U.uTime.value = clock;
  const flick = frozen ? 1 : 0.92 + 0.08 * Math.sin(clock * 23) * Math.sin(clock * 13.7 + 1) + 0.05 * Math.sin(clock * 5.1);
  // Flames over the coals run hotter than the bed: the light is orange.
  heatRGB(st.coal + 160, rgb);
  const cL = Math.max(rgb[0], 1e-3);
  coalLight.color.setRGB(1, Math.min(0.6, rgb[1] / cL * 1.1 + 0.1), Math.min(0.22, rgb[2] / cL + 0.03));
  coalLight.intensity = (3.2 + 3.6 * sstep(820, 1350, st.coal)) * flick;
  // The bar's light sits over its hottest part.
  let hi = 0, hT = 20;
  for (let i = 0; i < steel.T.length; i++) if (steel.T[i] > hT) { hT = steel.T[i]; hi = i; }
  heatRGB(hT, rgb);
  const bL = Math.max(rgb[0], 1e-3);
  barLight.color.setRGB(rgb[0] / bL, rgb[1] / bL, rgb[2] / bL);
  barLight.intensity = 0.09 * rgb[0];
  barLight.position.set(steel.X[hi], 0.06, 0.03).applyMatrix4(tong.matrixWorld);
  flashLight.position.set(STRIKE.x, FACE.y + 0.12, STRIKE.z + 0.05);
  flashLight.intensity = st.flash * 1.4;
  // The haze sees the fire, the bar and the flash.
  const HU = haze.uniforms;
  HU.uLP.value[0].set(COALS.x, COALS.y + 0.08, COALS.z, 0.02);
  HU.uLC.value[0].set(coalLight.color.r, coalLight.color.g, coalLight.color.b).multiplyScalar(coalLight.intensity * 0.6);
  HU.uLP.value[1].set(barLight.position.x, barLight.position.y - 0.04, barLight.position.z, 0.01);
  HU.uLC.value[1].set(barLight.color.r, barLight.color.g, barLight.color.b).multiplyScalar(barLight.intensity);
  HU.uLP.value[2].set(flashLight.position.x, flashLight.position.y, flashLight.position.z, 0.01);
  HU.uLC.value[2].set(1, 0.75, 0.4).multiplyScalar(flashLight.intensity * 0.5);
  const WU = M.water.userData.U;
  if (WU) { WU.uTime.value = clock; WU.uBoil.value = st.boil; WU.uRipT.value = st.plungeT; WU.uRipP.value.copy(st.plungeP); }
  placeSteam();
}

function placeSteam() {
  steamMix.enabled = st.steam > 0.002;
  const J = steam.jetU, VU = steam.VU;
  const p = st.at === 'trough' ? waterPoint() : null;
  const s = st.steam;
  for (let i = 0; i < 4; i++) J.uJetK.value[i].set(0, 0, 0, 0);
  if (p) {
    // Steam boils off where the bar meets the water and along it.
    J.uJetP.value[0].set(p.x, TROUGH.water + 0.01, p.z, 0.05);
    J.uJetA.value[0].set(0, 1, 0, 0.12);
    J.uJetK.value[0].set(1.3 * s, 10 * s, 24 * s, 0);
    const t = tmpW.set(steel.X[2], 0, 0).applyMatrix4(tong.matrixWorld);
    J.uJetP.value[1].set((p.x + t.x) / 2, TROUGH.water + 0.01, (p.z + t.z) / 2, 0.07);
    J.uJetA.value[1].set(0, 1, 0, 0.1);
    J.uJetK.value[1].set(0.9 * s, 7 * s, 15 * s, 0);
  }
  VU.uLightP.value.copy(coalLight.position);
  VU.uLightC.value.copy(coalLight.color).multiplyScalar(coalLight.intensity * 0.5);
  VU.uJetA0.value.set(steel.X[0], 0, 0).applyMatrix4(tong.matrixWorld);
  VU.uJetA1.value.set(steel.X[Math.min(steel.X.length - 1, 14)], 0, 0).applyMatrix4(tong.matrixWorld);
  heatRGB(steel.st.maxT, rgb);
  VU.uJetC.value.setRGB(rgb[0], rgb[1], rgb[2]).multiplyScalar(0.05);
}

function step(dt) {
  const amb = frozen ? 0 : dt * timeK;
  stepFire(dt);
  stepHammer(dt);
  stepPose(dt);
  placeBar();
  // The heat runs on a fixed clock, at most four steps a frame.
  heatAcc = Math.min(heatAcc + dt * timeK, HEAT_DT * 4);
  if (heatAcc >= HEAT_DT) {
    expose();
    while (heatAcc >= HEAT_DT) { steel.step(HEAT_DT, st.coal); heatAcc -= HEAT_DT; }
  }
  stepWater(dt);
  // Embers rise from the coals while the blast is on.
  if (!frozen && st.air > 0.25 && Math.random() < st.air * 30 * dt) {
    sparks.emit(simT, 1, [COALS.x + (Math.random() - 0.5) * 0.2, COALS.y + 0.05, COALS.z + (Math.random() - 0.5) * 0.15], [0, 1, 0], 0.5, 0.6, 1.8, { life: [0.4, 1.1], drag: 2.2, size: 0.2, T: st.coal, burn: 0.05 });
  }
  // Steel at welding heat burns in the fire: sparkler bursts.
  if (st.at === 'fire' && steel.st.maxT > 1290 && Math.random() < 14 * dt) {
    const t = tmpW.set(steel.X[3], 0, 0).applyMatrix4(tong.matrixWorld);
    sparks.emit(simT, frozen ? 2 : 6, [t.x, t.y + 0.04, t.z], [0, 1, 0], 0.7, 1.2, 3, { life: [0.2, 0.5], drag: 1.5, size: 0.3, T: 1400, burn: 0.8 });
  }
  const flakesBusy = flakes.step(dt);
  sparks.upload();
  // The steam steps on its own clock while it has anything to move.
  if (st.steam > 0.002 || st.wetT >= 0) {
    steamAcc = Math.min(steamAcc + dt, STEAM_DT * 2);
    while (steamAcc >= STEAM_DT) { steam.step(STEAM_DT); steamAcc -= STEAM_DT; }
  }
  st.flash *= Math.exp(-dt * 18);
  st.shake *= Math.exp(-dt * 20);
  simT += dt;
  clock += Math.max(amb, st.air > 0.3 ? dt * 0.5 : 0);
  snd.update(dt, { fire: clamp((st.coal - 700) / 600, 0, 1), steam: st.steam, boil: st.boil });
  // Lively: anything in motion now; drifting: the heat still changing.
  const lively = !!st.move || !!st.drag || st.blow >= 0 || st.stroke >= 0 || st.pumpHold || st.pumpKey || st.strikeHold || st.strikeKey
    || sparks.live(simT) || flakesBusy || st.steam > 0.01 || st.wetT >= 0 && st.at === 'trough' || st.ready > 0.01 && st.ready < 0.99 || st.flash > 0.02;
  const warm = steel.st.maxT > 380 || st.air > 0.05;
  return { lively, warm };
}

// The eye drifts along the line toward the bar's station.
const VIEW = { fire: -0.55, anvil: 0, trough: 0.62 };
// It also steps in toward the work: most at the anvil, where the bar changes shape.
const ZOOM = { fire: 0.35, anvil: 0.8, trough: 0.45 };
let pan = 0, zoom = 0;
const fwd = new THREE.Vector3();
function render() {
  // A tall stage sees one station at a time, so it pans further.
  const k = cssW / cssH < 1 ? 1.5 : 1;
  const want = VIEW[st.at] * k;
  const wz = ZOOM[st.at] * (cssW / cssH < 1 ? 0.6 : 1);
  // The eye holds still during a drag: a moving eye would move the pointer's aim.
  const ek = st.drag ? 0 : 1 - Math.exp(-lastDt * 2.2);
  pan += (want - pan) * ek;
  zoom += (wz - zoom) * ek;
  fwd.subVectors(aim, eye).normalize().multiplyScalar(zoom);
  const sh = st.shake * 0.004;
  camera.position.set(eye.x + pan * 0.9 + fwd.x + (Math.random() - 0.5) * sh, eye.y + fwd.y + (Math.random() - 0.5) * sh, eye.z + fwd.z);
  camera.lookAt(aim.x + pan, aim.y + (st.at === 'anvil' && !st.drag ? 0.06 * zoom : 0), aim.z);
  camera.updateMatrixWorld();
  sparks.mat.uniforms.uTime.value = simT;
  flakes.upload();
  steel.upload();
  grade.uniforms.uGrain.value = frozen ? 0 : frameNo % 97;
  haze.uniforms.uFrame.value = frozen ? 0 : frameNo % 64;
  composer.render();
}

/* ---------- framing ---------- */
const eye = new THREE.Vector3(), aim = new THREE.Vector3();
const vq = k => qa.get(k)?.split(',').map(Number);
function frame3() {
  const asp = cssW / cssH;
  camera.aspect = asp;
  // A tall stage steps back and up, so all four stations stay in.
  if (asp < 1) { camera.fov = 54; eye.set(0.2, 1.55, 3.0); aim.set(0.05, 0.74, -0.1); }
  else if (asp < 1.35) { camera.fov = 46; eye.set(0.35, 1.5, 2.8); aim.set(0.0, 0.7, -0.15); }
  else { camera.fov = 40; eye.set(0.42, 1.4, 2.45); aim.set(0.05, 0.7, -0.15); }
  // ?eye=x,y,z&aim=x,y,z&fov=n try a framing, for tuning only.
  if (vq('eye')?.length === 3) eye.fromArray(vq('eye'));
  if (vq('aim')?.length === 3) aim.fromArray(vq('aim'));
  if (qa.get('fov')) camera.fov = Number(qa.get('fov'));
  camera.updateProjectionMatrix();
}

let cssW = 1, cssH = 1, W = 0, H = 0;
function resize(force = false) {
  if (!renderer) return;
  const r = stage.getBoundingClientRect();
  cssW = Math.max(1, r.width); cssH = Math.max(1, r.height);
  const dpr = D.dpr(cssW, cssH);
  const w = Math.round(cssW * dpr), h = Math.round(cssH * dpr);
  if (!force && w === W && h === H) return;
  W = w; H = h;
  renderer.setPixelRatio(dpr);
  renderer.setSize(cssW, cssH, false);
  composer.setPixelRatio(dpr);
  composer.setSize(cssW, cssH);
  const bk = D.rung >= 2 ? 0.25 : 0.5;
  bloom.resolution.set(Math.round(w * bk), Math.round(h * bk));
  haze.uniforms.uSteps.value = D.rung >= 2 ? 12 : 22;
  steam.resize(Math.max(1, w >> 1), Math.max(1, h >> 1));
  steam.VU.uSteps.value = D.rung >= 3 ? 28 : 48;
  steamMix.uniforms.uRes.value.set(w, h);
  steamMix.uniforms.uAmp.value = dpr * Math.max(0.6, Math.min(1.4, cssW / 1280));
  sparks.mat.uniforms.uView.value.set(w, h);
  sparks.mat.uniforms.uPx.value = dpr * Math.max(0.7, Math.min(1.4, cssW / 1280));
  sparks.setLimit(D.rung >= 3 ? SPARK_MAX / 2 : SPARK_MAX);
  grade.uniforms.uAsp.value = cssW / cssH;
  coalLight.shadow.mapSize.set(D.rung >= 2 ? 512 : 1024, D.rung >= 2 ? 512 : 1024);
  frame3();
  wake();
}

/* ---------- frame loop ---------- */
function frame(now) {
  raf = 0;
  const t0 = performance.now();
  if (!visible || !renderer) return;
  const dt = Math.max(0, Math.min(0.05, (now - last) / 1000));
  lastDt = dt;
  last = Math.max(last, now);
  let again = true, lively = true;
  try {
    const idle = (now - lastInput) / 1000;
    timeK = idle < 60 ? 1 : Math.max(0, 1 - (idle - 60) / 2);
    const s = step(dt);
    lively = s.lively;
    place();
    render();
    D.frame(dt);
    frameNo++;
    again = lively || (s.warm && timeK > 0) || snd.busy && timeK > 0;
  } finally {
    // A thrown error still leaves the loop able to wake.
    if (!again) snd.rest();
    else schedule(lively ? 0 : Math.max(0, 31 - (performance.now() - t0)));
  }
}
function schedule(delay) {
  if (raf || timer || !visible || !renderer || !started) return;
  if (delay > 0) timer = setTimeout(() => { timer = 0; raf = requestAnimationFrame(frame); }, delay);
  else raf = requestAnimationFrame(frame);
}
function wake() {
  if (timer) { clearTimeout(timer); timer = 0; }
  if (!raf) last = performance.now();
  schedule(0);
}
function halt() { cancelAnimationFrame(raf); raf = 0; clearTimeout(timer); timer = 0; }
function touch() { lastInput = performance.now(); timeK = 1; wake(); }
let started = false;

/* ---------- acts ---------- */
function newBar() {
  if (!steel) return;
  steel.reset(false);
  flakes.clear();
  st.feed = 0;
  goTo('fire', 0.9);
  if (st.at === 'fire' && !st.move) snd.lay();
  touch();
}
function strikeKey(on) { st.strikeKey = on; if (on) strike(); touch(); }
function pumpKey(on) { st.pumpKey = on; if (on) pump(); touch(); }
const panOf = p => clamp(p.x / 1.3, -1, 1);

/* ---------- gestures ---------- */
// Drag moves the bar; a tap acts where it lands; a hold repeats the act.
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), plane = new THREE.Plane(UP, -0.95), hit = new THREE.Vector3();
const local = e => { const r = stage.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
function aimAt(x, y) { ndc.set((x / cssW) * 2 - 1, -(y / cssH) * 2 + 1); ray.setFromCamera(ndc, camera); }
// What the pointer is over: the bellows, or a station's side of the room.
function target(x, y) {
  aimAt(x, y);
  if (ray.intersectObject(bel.g, true).length) return 'bellows';
  const h = ray.intersectObjects([...scene.children].filter(o => o !== sparks.mesh && o !== flakes.mesh), true)[0];
  const px = h ? h.point.x : (ray.ray.intersectPlane(plane, hit) ? hit.x : 0);
  if (px < (HEARTH.x + ANVIL.x) / 2 + 0.05) return px < HEARTH.x - HEARTH.w / 2 - 0.02 && h && h.point.y > 0.4 ? 'bellows' : 'fire';
  if (px < (ANVIL.x + TROUGH.x) / 2 + 0.05) return 'anvil';
  return 'trough';
}
// The drag pose: the bar follows the pointer along the line of stations.
const STOPS = ['fire', 'anvil', 'trough'];
function dragPose(x, y) {
  aimAt(x, y);
  if (!ray.ray.intersectPlane(plane, hit)) return null;
  const P = STOPS.map(stationPose);
  const xs = P.map(p => p.tip.x);
  const hx = clamp(hit.x, xs[0], xs[2]);
  const j = hx < xs[1] ? 0 : 1;
  const k = (hx - xs[j]) / (xs[j + 1] - xs[j]);
  const p = lerpPose(P[j], P[j + 1], k, 0);
  p.tip.y = Math.max(p.tip.y, FACE.y + 0.2);
  p.pitch = 0.05;
  return { pose: p, near: STOPS[Math.round(j + k)] };
}
let down = false, pid = null, at0 = null, moved = false, held = false, holdT = 0, onWhat = null;
stage.addEventListener('pointerdown', e => {
  if (e.button !== 0 || !renderer || !started || (e.target !== renderer.domElement && e.target !== stage)) return;
  try { stage.setPointerCapture(e.pointerId); } catch { /* capture is optional */ }
  pid = e.pointerId; at0 = local(e); moved = false; held = false; down = true;
  onWhat = target(at0[0], at0[1]);
  clearTimeout(holdT);
  // A hold repeats the act under the pointer: pump, or hammer.
  holdT = setTimeout(() => {
    if (!down || moved) return;
    held = true;
    if (onWhat === 'bellows' || (onWhat === 'fire' && st.at === 'fire')) { st.pumpHold = true; pump(); }
    else if (onWhat === 'anvil') { st.strikeHold = true; strike(); }
    touch();
  }, 260);
  touch();
});
stage.addEventListener('pointermove', e => {
  if (!down || e.pointerId !== pid) return;
  const p = local(e);
  if (!moved && !held && Math.hypot(p[0] - at0[0], p[1] - at0[1]) >= 8) {
    moved = true;
    clearTimeout(holdT);
    st.move = null;
    st.wetT = -1;
    stage.classList.add('drag');
  }
  if (moved) {
    const d = dragPose(p[0], p[1]);
    if (d) { st.drag = d; touch(); }
  }
});
function end(e) {
  if (!down || (e && e.pointerId !== pid)) return;
  clearTimeout(holdT);
  down = false; pid = null;
  st.pumpHold = false; st.strikeHold = false;
  stage.classList.remove('drag');
  if (moved && st.drag) {
    // The bar drops at the nearest station.
    const near = st.drag.near;
    const from = { tip: cur.tip.clone(), yaw: cur.yaw, pitch: cur.pitch };
    st.drag = null;
    st.at = near;
    st.move = { from, t: 0, dur: 0.35, lift: 0 };
    ui.choice?.set(near);
  } else if (!held && !moved) {
    if (onWhat === 'bellows') pump();
    else if (onWhat !== st.at) goTo(onWhat);
    else if (onWhat === 'fire') pump();
    else if (onWhat === 'anvil') strike();
  }
  st.drag = null;
  touch();
}
['pointerup', 'pointercancel', 'lostpointercapture'].forEach(t => stage.addEventListener(t, end));

/* ---------- life cycle ---------- */
whenVisible(stage, on => {
  visible = on;
  if (on) wake();
  else { halt(); snd.hide(); }
});
onReducedChange(on => { frozen = on; wake(); });
sound.onChange(on => { if (on) touch(); });
new ResizeObserver(() => resize()).observe(stage);
// ?qa hands the state to a test script.
if (qa.has('qa')) globalThis.__forge = { st, haze: () => haze, depth: () => sceneDepth, mix: () => steamMix, renderer: () => renderer, scene: () => scene, lights: () => ({ coalLight, barLight, flashLight }), steel: () => steel, steam: () => steam, cam: () => camera, eye, aim, goTo, strike, pump, newBar, D, get frames() { return frameNo; }, get raf() { return raf || timer; } };

mark('build');
try {
  await setup();
  resize(true);
  // The first frame is a picture: an orange bar on the anvil, the fire up.
  for (let i = 0; i < 3; i++) step(1 / 60);
  st.ready = 0;
  zoom = ZOOM.anvil;
  place();
  render();
  await renderer.compileAsync(scene, camera);
  render();
  renderer.getContext().finish();
  renderer.domElement.classList.add('on');
  mark('first-frame');
  await introDone;
  started = true;
  touch();
} catch (err) {
  console.error(err);
  fail.removeAttribute('hidden');
  ui.hideControls?.();
}
