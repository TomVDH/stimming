// Ship launch: a coaster on a canal yard in low winter sun, launched sideways.
// Seen from the far quay, among the crowd. Tap or Space cuts the rope.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { initPage, whenVisible, pageReady, stage as mark, reduced, onReducedChange, audioKit, sound } from '../shared/stim.js';
import { intro as playIntro } from '../shared/intro.js';
import { detail } from '../shared/detail.js';
import { hullGeometry, topsides, yard, farLand, CANAL, PIER, HULL, START_Z, wayTop } from './yard.js';
import { makeLaunch, reset as resetLaunch, release, step as stepLaunch, keel, moving, sectionWorld, WIRE_LEN } from './launch.js';
import { makeChains, makeCrowd, makeBunting } from './props.js';
import { launchSound } from './sound.js';
import { makeSpray, emit, stepSpray, sprayMesh } from './spray.js';
import { makeMist, COMPOSITE } from './mist.js';
import { makeCanal } from './canal.js';
mark('libs');

const ID = 'shiplaunch';
const stage = document.getElementById('stage');
const fail = stage.querySelector('.fail');
const saved = k => { try { return localStorage.getItem(`stimming.${ID}.${k}`); } catch { return null; } };
const save = (k, v) => { try { localStorage.setItem(`stimming.${ID}.${k}`, String(v)); } catch { /* storage is optional */ } };
const DROP0 = 1.5;
const dropSaved = Number(saved('drop'));
let drop = saved('drop') != null && dropSaved >= 0.6 && dropSaved <= 2.4 ? dropSaved : DROP0;
let frozen = reduced();

// The low winter sun: behind the yard and to the left of the shot.
const SUN = new THREE.Vector3(-0.78, 0.13, -0.61).normalize();

/* ---------- state ---------- */
const L = makeLaunch();
resetLaunch(L, drop);
// ?qa hands the world to a test script.
if (new URLSearchParams(location.search).has('qa')) globalThis.__launch = L;

/* ---------- bar ---------- */
const ui = initPage({ id: ID, bar: {
  actions: [{ verb: 'launch', label: 'Launch', key: 'Space', onPress: () => launch() }],
  slider: { label: 'Drop', min: 0.6, max: 2.4, step: 0.05, value: drop, onInput: v => setDrop(v) },
  quality: true,
  reset: () => again(),
  keys: [['click', 'cut the rope'], ['space', 'launch'], ['drag', 'look round'], ['r', 'reset']],
  help: [
    ['click', 'Click to cut the rope: she slides down the ways'],
    ['space', 'Space cuts the rope too; after the launch it resets the yard'],
    ['drag', 'Drag to look round'],
    ['r', 'R puts her back on the ways'],
  ],
} });
const introDone = playIntro({ ready: pageReady() });
const kit = audioKit({ sleepMs: 1500 });
const snd = launchSound(kit);
// The action reads Launch before the cut and Again after it.
const launchLabel = () => [...document.querySelectorAll('.s2-label')].find(e => /^(Launch|Again)$/.test(e.textContent));
function setLabel(t) { const el = launchLabel(); if (el && el.textContent !== t) el.textContent = t; }

/* ---------- three ---------- */
let renderer = null, composer = null, bloom = null, scene = null, camera = null;
let cssW = 1, cssH = 1;
const D = detail({ maxDpr: 1.5, budget: 2.4e6, steps: 3, settle: 2, onChange: () => resize(true) });

const SKY_VS = 'varying vec3 vDir; void main() { vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position.z = gl_Position.w; }';
const SKY_FS = /* glsl */`
  uniform vec3 uSun;
  varying vec3 vDir;
  void main() {
    vec3 d = normalize(vDir);
    float h = max(d.y, 0.0);
    float mu = max(dot(d, uSun), 0.0);
    // A pale winter zenith, a warm band low down, the glow round the sun.
    vec3 zen = vec3(0.16, 0.25, 0.42), hor = vec3(0.86, 0.72, 0.58);
    vec3 c = mix(hor, zen, pow(h, 0.45));
    float side = 0.5 + 0.5 * dot(normalize(d.xz + 1e-4), normalize(uSun.xz));
    c += vec3(1.0, 0.62, 0.32) * (0.35 * side * exp(-h * 9.0) + 0.9 * pow(mu, 12.0) + 8.0 * pow(mu, 900.0));
    c = mix(c, vec3(0.42, 0.38, 0.36), smoothstep(0.0, -0.05, d.y));
    gl_FragColor = vec4(c, 1.0);
  }`;

function mats() {
  const std = (color, rough = 0.8, metal = 0) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal });
  return {
    green: std(0x2f6d3c, 0.45), red: std(0x6a2a1e, 0.7), white: std(0xdcdcd6, 0.5), deck: std(0x5d3a2c, 0.8),
    coaming: std(0x2f6d3c, 0.5), dark: std(0x2a2a2a, 0.7), glass: std(0x0c1418, 0.15, 0.2),
    concrete: std(0x8b8780, 0.9), wall: std(0x5c5a55, 0.95), steel: std(0x4a4a48, 0.55, 0.6),
    ground: std(0x6d6a5f, 0.95), grass: std(0x4f5a34, 1), shed: std(0x7d8a92, 0.7, 0.2), roof: std(0x50585e, 0.6, 0.3),
    paving: std(0x76665a, 0.95), bed: std(0x2a2a1e, 1), tree: std(0x2c3322, 1),
    wire: std(0x2a2522, 0.6, 0.7), rust: std(0x6b3a22, 0.95, 0.3), flag: std(0xffffff, 0.8),
  };
}

let hull = null, shell = null, M = null, Y = null;
// The hull paint: green topsides over a red-brown bottom, plate seams, a wet sheen after the hit.
const hullU = { uWet: { value: 0 } };
function hullMaterial() {
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 });
  m.onBeforeCompile = sh => {
    sh.uniforms.uWet = hullU.uWet;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vL;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvL = position;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vL;\nuniform float uWet;')
      .replace('#include <color_fragment>', `#include <color_fragment>
        float boot = ${HULL.boot.toFixed(2)};
        vec3 paint = vL.y < boot ? vec3(0.16, 0.035, 0.022) : vec3(0.035, 0.16, 0.06);
        // A dark boot-top band between the two paints.
        paint = mix(paint, vec3(0.02, 0.02, 0.022), step(boot, vL.y) * step(vL.y, boot + 0.28));
        // Plate seams: butts every 2.6 m along, strakes every 2 m up.
        float bx = abs(fract(vL.x / 2.6) - 0.5) * 2.6, sy = abs(fract(vL.y / 2.0) - 0.5) * 2.0;
        float seam = max(smoothstep(0.035, 0.0, abs(bx - 1.3)), smoothstep(0.03, 0.0, abs(sy - 1.0)));
        paint *= 1.0 - 0.18 * seam;
        // Water runs down the outboard topsides after the hit.
        float wet = uWet * smoothstep(6.8, 3.5, vL.y) * step(0.0, vL.z);
        paint *= 1.0 - 0.38 * wet;
        diffuseColor.rgb = paint;`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        roughnessFactor = (vL.y < ${HULL.boot.toFixed(2)} ? 0.62 : 0.42) * (1.0 - 0.65 * uWet * smoothstep(6.8, 3.5, vL.y) * step(0.0, vL.z));`);
  };
  return m;
}
let canal = null, sky = null, spray = null, mist = null, mistPass = null, chains = null, crowd = null, bunting = null;
const SP = makeSpray();
function setup() {
  renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
  if (!renderer.extensions.has('EXT_color_buffer_float') && !renderer.extensions.has('EXT_color_buffer_half_float')) throw new Error('no float targets');
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const canvas = renderer.domElement;
  canvas.setAttribute('aria-hidden', 'true');
  stage.append(canvas);
  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0xb8a690, 0.0024);
  camera = new THREE.PerspectiveCamera(44, 1.6, 0.5, 4000);
  M = mats();
  sky = new THREE.Mesh(new THREE.SphereGeometry(3000, 32, 16), new THREE.ShaderMaterial({
    uniforms: { uSun: { value: SUN } }, vertexShader: SKY_VS, fragmentShader: SKY_FS, side: THREE.BackSide, depthWrite: false, fog: false,
  }));
  sky.renderOrder = -1;
  scene.add(sky);
  // The sky lights the shade and shows in every gloss: one PMREM from the sky dome.
  const envScene = new THREE.Scene();
  envScene.add(new THREE.Mesh(new THREE.SphereGeometry(100, 32, 16), sky.material));
  const pm = new THREE.PMREMGenerator(renderer);
  scene.environment = pm.fromScene(envScene, 0.02).texture;
  pm.dispose();
  // The sun is the key light; the sky fills the shade.
  const sun = new THREE.DirectionalLight(0xffc690, 3.2);
  sun.position.copy(SUN).multiplyScalar(200);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -160, right: 160, top: 150, bottom: -150, near: 10, far: 700 });
  sun.shadow.bias = -0.0004;
  scene.add(sun, sun.target);
  scene.add(new THREE.HemisphereLight(0x9fb3cf, 0x4a4036, 0.25));
  scene.add(farLand(M));
  buildYard();
  hull = new THREE.Group();
  shell = new THREE.Mesh(hullGeometry(), hullMaterial());
  shell.castShadow = shell.receiveShadow = true;
  hull.add(shell, topsides(M));
  bunting = makeBunting(M);
  hull.add(bunting.mesh);
  scene.add(hull);
  chains = makeChains(M);
  crowd = makeCrowd();
  crowd.U.uSun.value.copy(SUN);
  crowd.U.uSunCol.value.setRGB(2.6, 1.75, 1.1);
  crowd.U.uSky.value.setRGB(0.55, 0.6, 0.68);
  crowd.U.uFog.value.copy(scene.fog.color);
  crowd.U.uFogD.value = scene.fog.density;
  scene.add(chains.grp, crowd.grp);
  canal = makeCanal(renderer, drop);
  if (globalThis.__launch) globalThis.__canal = canal;
  canal.WU.uSun.value.copy(SUN);
  canal.WU.uSunCol.value.setRGB(2.4, 1.6, 1.0);
  canal.WU.uFog.value.copy(scene.fog.color);
  canal.WU.uFogD.value = scene.fog.density;
  scene.add(canal.group);
  spray = sprayMesh();
  spray.U.uSun.value.copy(SUN);
  spray.U.uSunCol.value.setRGB(2.6, 1.75, 1.1);
  spray.U.uSky.value.setRGB(0.55, 0.6, 0.68);
  spray.U.uFog.value.copy(scene.fog.color);
  spray.U.uFogD.value = scene.fog.density;
  spray.U.tFoam.value = canal.WU.tFoam.value;
  scene.add(spray.mesh);
  const rt = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 });
  composer = new EffectComposer(renderer, rt);
  composer.addPass(new RenderPass(scene, camera));
  mist = makeMist(renderer);
  mist.MU.uSun.value.copy(SUN);
  mist.MU.uSunCol.value.setRGB(2.6, 1.75, 1.1);
  mist.MU.uSky.value.setRGB(0.5, 0.56, 0.66);
  mist.MU.uFog.value.copy(scene.fog.color);
  mist.MU.uFogD.value = scene.fog.density;
  mistPass = new ShaderPass(COMPOSITE);
  mistPass.uniforms.tMist.value = mist.texture;
  composer.addPass(mistPass);
  if (globalThis.__launch) globalThis.__mist = mist;
  bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.5, 0.5, 0.9);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); halt(); });
  canvas.addEventListener('webglcontextrestored', () => wake());
}

// The berth and the ways stand at the Drop; a new Drop rebuilds them.
function buildYard() {
  if (Y) { scene.remove(Y.grp); Y.grp.traverse(o => o.geometry?.dispose()); }
  Y = yard(M, drop);
  scene.add(Y.grp);
}

// Places the hull from the launch state. The mesh's origin is the keel.
function placeHull() {
  const [z, y] = keel(L);
  hull.position.set(0, y, z);
  // Launch roll turns z toward y; three's x rotation turns y toward z.
  hull.rotation.set(-L.roll, 0, 0);
  hull.updateMatrixWorld(true);
}

/* ---------- the sweep ---------- */
// Three shots and the moves between them. hfov is the wide-stage lens; tall, the phone's.
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const SHOT = {
  // Waiting: high over the north quay, the whole basin against the low sun.
  wide: { eye: V(-70, 40, 205), aim: V(0, 0, -22), hfov: 46, tall: 34 },
  // The hit and the wave: the pier head, in the crowd, broadside on.
  pier: { eye: V(PIER.x0 + 3, PIER.top + 2.5, PIER.z0 + 13), aim: V(10, 4, START_Z + 8), hfov: 62, tall: 70 },
  // After: up and back toward the harbour mouth.
  after: { eye: V(70, 24, 150), aim: V(-5, 2, -18), hfov: 52, tall: 40 },
};
// The crane move down from the wide shot to the pier, and the pull back out.
const DOWN = { eye: new THREE.CatmullRomCurve3([SHOT.wide.eye, V(-48, 22, 130), V(-24, 8, 78), SHOT.pier.eye]),
  aim: new THREE.CatmullRomCurve3([SHOT.wide.aim, V(2, 1, -24), V(6, 3, -28), SHOT.pier.aim]) };
const BACK = { eye: new THREE.CatmullRomCurve3([SHOT.pier.eye, V(-2, 7, 80), V(40, 16, 128), SHOT.after.eye]),
  aim: new THREE.CatmullRomCurve3([SHOT.pier.aim, V(6, 3, -26), V(0, 2, -20), SHOT.after.aim]) };
// Beats after the hit, in seconds: the push-in, the crouch as the wall breaks, the pull back.
const BEAT = { push: 4, crouch0: 6.5, crouch1: 9, rise0: 14, rise1: 17, back0: 18, back1: 43 };
if (globalThis.__launch) globalThis.__cam = { SHOT, BEAT };
const ease = t => { t = Math.min(1, Math.max(0, t)); return t * t * (3 - 2 * t); };
const span = (t, a, b) => ease((t - a) / (b - a));
let cutAt = -1, cu = 0, hfov = SHOT.wide.hfov, tallH = SHOT.wide.tall;
const eyeV = new THREE.Vector3(), aimV = new THREE.Vector3();
/** Where the camera stands now; dt eases the move down. */
function sweep(dt) {
  if (cutAt < 0) { eyeV.copy(SHOT.wide.eye); aimV.copy(SHOT.wide.aim); hfov = SHOT.wide.hfov; tallH = SHOT.wide.tall; return; }
  if (hitAt < 0) {
    // The move down follows her down the ways and lands as she hits.
    const slide = Math.max(0, (L.gz - START_Z) / (CANAL.zYard + 4 - START_Z));
    const goal = Math.min(0.92, Math.max((simT - cutAt) / 14, slide * 0.92));
    cu += (goal - cu) * Math.min(1, dt * 1.5);
  } else cu += (1 - cu) * Math.min(1, dt * 1.2);
  if (frozen) { cu = hitAt < 0 ? 0 : 1; }
  const th = hitAt < 0 ? 0 : simT - hitAt;
  if (frozen) {
    // Reduced motion: hard cuts between the three still shots.
    const s = hitAt < 0 ? SHOT.wide : th < BEAT.back0 ? SHOT.pier : SHOT.after;
    eyeV.copy(s.eye); aimV.copy(s.aim); hfov = s.hfov; tallH = s.tall;
    return;
  }
  const u = ease(cu);
  DOWN.eye.getPoint(u, eyeV); DOWN.aim.getPoint(u, aimV);
  hfov = SHOT.wide.hfov + (SHOT.pier.hfov - SHOT.wide.hfov) * u;
  tallH = SHOT.wide.tall + (SHOT.pier.tall - SHOT.wide.tall) * u;
  if (hitAt < 0) return;
  // A slow push in on the spray sheet.
  eyeV.lerp(aimV, 0.05 * span(th, 0, BEAT.push));
  // The crouch: the wall stands over the lens as it breaks.
  eyeV.y -= 1.3 * (span(th, BEAT.crouch0, BEAT.crouch1) - span(th, BEAT.rise0, BEAT.rise1));
  const b = span(th, BEAT.back0, BEAT.back1);
  if (b > 0) {
    BACK.eye.getPoint(b, tmpV); eyeV.lerp(tmpV, Math.min(1, b * 4));
    BACK.aim.getPoint(b, tmpV); aimV.lerp(tmpV, Math.min(1, b * 4));
    hfov += (SHOT.after.hfov - hfov) * b;
    tallH += (SHOT.after.tall - tallH) * b;
  }
}
// The camera moves from the cut until the pull back ends.
const sweeping = () => !frozen && cutAt >= 0 && (hitAt < 0 || simT - hitAt < BEAT.back1);
// The lens keeps the subject's width: a tall stage widens the vertical view.
function frame3() {
  const asp = cssW / cssH;
  const h = asp < 1 ? tallH : hfov;
  const v = 2 * Math.atan(Math.tan((h * Math.PI) / 360) / asp) * 180 / Math.PI;
  camera.fov = Math.max(30, Math.min(90, v));
  camera.aspect = asp;
  camera.updateProjectionMatrix();
}

let Wpx = 0, Hpx = 0;
function resize(force = false) {
  if (!renderer) return;
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
  // The ladder: pixel ratio first, then the mirror and the mist, then the counts.
  const fx = D.rung >= 2 ? 0.5 : 1;
  canal.setMirrorSize(Math.round(w * fx), Math.round(h * fx));
  spray.U.uRes.value.set(w, h);
  mist.setSize(Math.round(w * fx), Math.round(h * fx));
  countK = D.rung >= 3 ? 0.5 : 1;
  wake();
}

/* ---------- actions ---------- */
function launch() {
  if (L.phase === 'held') { release(L); cutAt = simT; cu = 0; setLabel('Again'); }
  else flashCut();
  touch();
}
// A flash cut back to the yard, as the intro cuts; reduced motion cuts plain.
let flashEl = null;
function flashCut() {
  if (frozen) return again();
  if (!flashEl) {
    flashEl = document.createElement('div');
    flashEl.setAttribute('aria-hidden', 'true');
    flashEl.style.cssText = 'position:absolute;inset:0;background:#fff;opacity:0;pointer-events:none;transition:opacity 0.1s linear;border-radius:inherit';
    stage.append(flashEl);
  }
  flashEl.style.opacity = '1';
  setTimeout(() => { again(); flashEl.style.transition = 'opacity 0.35s ease-out'; flashEl.style.opacity = '0'; setTimeout(() => { flashEl.style.transition = 'opacity 0.1s linear'; }, 400); }, 110);
}
// Puts her back on the ways and calms the canal.
function again() {
  resetLaunch(L, drop);
  if (canal && canal.drop !== drop) buildYard();
  canal?.reset(drop);
  draftOn = false;
  hitAt = -1;
  cutAt = -1;
  cu = 0;
  SP.n = 0;
  hullU.uWet.value = 0;
  mist?.clear();
  mistUntil = -1;
  prevFace.fill(-9);
  crowd.cheer(false);
  canal.clearPatch();
  placeHull();
  snd.cancel();
  setLabel('Launch');
  touch();
}
function setDrop(v) {
  drop = v;
  save('drop', v);
  // The berth changes only while she waits on it.
  if (L.phase === 'held') again();
  touch();
}

/* ---------- simulation ---------- */
let mistLive = false, mistShown = false;
let simT = 0, draftOn = false, hitAt = -1, yaw = 0, yawGoal = 0;
const SUB = 1 / 240;
// The wave wall: the impact ridge's height per metre of Drop.
// The ridge stays under max metres, so she is not buried.
const WALL = { k: 3, max: 6.5 };
if (globalThis.__launch) globalThis.__wall = WALL;
function step(dt) {
  // The water line under her: the level a beam's width out each side.
  const off = HULL.B / 2 + 3;
  const a = canal.levelAt(L.gz - off), b = canal.levelAt(L.gz + off);
  L.water.level = 0.5 * (a + b);
  L.water.slope = (b - a) / (2 * off);
  stepLaunch(L, dt);
  const delay = camera.position.distanceTo(tmpV.set(0, 4, L.gz)) / 343, px = 0.1;
  for (const e of L.events.splice(0)) {
    if (e.type === 'hit') { hitAt = simT; hullU.uWet.value = 1; canal.impact(-46, 46, L.gz + HULL.B / 2 + 7, Math.min(WALL.max, WALL.k * drop * Math.min(1.3, e.v / 6))); snd.hit(Math.min(1, e.v / 7), delay, px); snd.cheer(delay + 2.2, 0.6 + 0.4 * Math.min(1, e.v / 7)); crowd.cheer(true); }
    else if (e.type === 'release') snd.release(delay, px);
    else if (e.type === 'move') snd.groan(delay, px);
  }
  placeHull();
  throwSpray(dt);
  stepSpray(SP, dt);
  // The topsides dry over a minute.
  hullU.uWet.value *= Math.exp(-dt / 40);
  // The draft pass runs once she is near the water.
  const near = L.phase === 'free' || (L.phase === 'slide' && L.gz > CANAL.zYard - 8);
  if (near) { canal.drawHull(shell); draftOn = true; }
  else if (draftOn) { canal.clearDraft(); draftOn = false; }
  const n = Math.min(8, Math.max(1, Math.round(dt / SUB)));
  canal.step(n, dt / n);
  simT += dt;
  canal.WU.uT.value = simT;
  if (L.phase === 'free') { canal.readColumn(); if (simT - hitAt < 60) canal.readPatch(); }
  pierSplash();
  mistLive = driveMist(dt);
  const washK = FACE.reduce((a, f) => a + Math.max(0, canal.etaAt(f.x, f.z)), 0) / 8;
  snd.update({ rumble: L.phase === 'slide' ? Math.min(1, L.vs / 4.5) : (L.phase === 'free' && L.tPhase < 1.2 ? 0.8 * (1 - L.tPhase / 1.2) : 0), chains: Math.min(1, L.heapV / 2.5), wash: Math.min(1, washK * 1.5) });
  // The lively phase ends 75 s after the hit at the latest.
  const fresh = hitAt < 0 || simT - hitAt < 75;
  // The canal counts as busy while a wave still runs across it.
  const waves = hitAt >= 0 && (Math.abs(canal.levelAt(L.gz + 12)) + Math.abs(canal.levelAt(60)) + Math.abs(canal.levelAt(120)) + washK > 0.04);
  const live = fresh && (moving(L) || SP.n > 0 || mistLive || waves);
  return live;
}

let frameDt = 0;
function render() {
  yaw += (yawGoal - yaw) * 0.12;
  sweep(frameDt);
  frame3();
  camera.position.copy(eyeV);
  camera.lookAt(aimV);
  camera.rotateY(yaw);
  canal.WU.uCam.value.copy(camera.position);
  canal.WU.uFocal.value = cssH / 2 / Math.tan((camera.fov * Math.PI) / 360);
  spray.upload(SP);
  chains.update(hull, L, drop, WIRE_LEN);
  crowd.update(frameDt, canal.wetAt, () => 1.7, camera, frozen ? 0 : performance.now() / 1000);
  bunting.update(simT, frozen);
  spray.U.uCam.value.copy(camera.position);
  canal.drawMirror(scene, camera);
  if (mistLive) { mist.draw(scene, camera, [spray.mesh, sky]); mistShown = true; }
  else if (mistShown) { mist.blank(); mistShown = false; }
  composer.render();
}

/* ---------- spray ---------- */
const tmpV = new THREE.Vector3();
let sRnd = 3, slapT = 0, countK = 1;
const sideIn = [null, null];
const r01 = () => ((sRnd = (sRnd * 16807) % 2147483647) / 2147483647);
// Where the hull's face drives into the water, it throws a sheet of spray.
function throwSpray(dt) {
  sideIn[0] = sideIn[1] = null;
  if (L.phase !== 'free' || dt <= 0) return;
  const pts = sectionWorld(L), wl = L.water.level;
  let zo = -1e9, zi = 1e9;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i], q = pts[(i + 1) % pts.length];
    if ((p[1] - wl) * (q[1] - wl) >= 0) continue;
    const t = (wl - p[1]) / (q[1] - p[1]), z = p[0] + (q[0] - p[0]) * t;
    zo = Math.max(zo, z); zi = Math.min(zi, z);
  }
  if (zo < -1e8) return;
  for (const [z, side] of [[zo, 1], [zi, -1]]) {
    const rz = z - L.gz, ry = wl - L.gy;
    const vz = L.vz - L.wr * ry, vy = L.vy + L.wr * rz;
    // The face's speed into the water: down, and out toward its own side.
    const vin = Math.max(0, -vy) + 0.9 * Math.max(0, side * vz);
    sideIn[side > 0 ? 0 : 1] = { z, vin, wl };
    if (vin < 0.5) continue;
    const k = Math.pow(vin - 0.5, 1.5) * (side > 0 ? 260 : 110) * dt * (frozen ? 0.4 : 1) * countK;
    const n = Math.floor(k) + (r01() < k % 1 ? 1 : 0);
    for (let i = 0; i < n; i++) {
      // Along the hull, thinning toward the bow and the stern.
      const u = r01() * 2 - 1, x = u * 40;
      const taper = 1 - u * u * 0.6;
      const up = (1.0 + 1.7 * vin * (0.4 + 0.8 * r01())) * taper, out = (1.0 + 1.5 * vin) * taper;
      if (r01() < 0.7) emit(SP, 1, x, wl + 0.3, z + side * 0.5, 0, up, side * out, 1.0, 1, 0.5 + 0.6 * r01());
      else emit(SP, 1, x, wl + 0.2, z + side * 0.3, 0, up * 1.3, side * out * 1.2, 2.0, 0, 0.03);
    }
  }
}
// The wave breaks on the pier: spray stands up along its faces.
// Points just off the head and the two sides, with the way out to the water.
const FACE = [];
for (let x = PIER.x0 + 0.5; x < PIER.x1; x += 1) FACE.push({ x, z: PIER.z0 - 0.5, nx: 0, nz: -1 });
for (let z = PIER.z0 + 0.5; z < PIER.z0 + 30; z += 1.5) FACE.push({ x: PIER.x1 + 0.5, z, nx: 1, nz: 0 }, { x: PIER.x0 - 0.5, z, nx: -1, nz: 0 });
const prevFace = new Float32Array(FACE.length).fill(-9);
function pierSplash() {
  let sum = 0, sx = 0;
  FACE.forEach((f, i) => {
    const e = canal.etaAt(f.x, f.z), de = e - prevFace[i];
    prevFace[i] = e;
    if (e < 0.15 || de < 0.006 || de > 2) return;
    const up = 2 + 30 * Math.min(de, 0.2), wx = f.x + f.nx * 0.3, wz = f.z + f.nz * 0.3;
    // The jet climbs the wall and falls back over the water and the deck.
    emit(SP, 1, wx, e + 0.2, wz, -f.nx * 0.8, up, -f.nz * 0.8, 1.0, 1, 0.5 + 0.6 * r01());
    if (r01() < 0.5) emit(SP, 1, wx, e + 0.1, wz, -f.nx * 1.4, up * 1.2, -f.nz * 1.4, 1.6, 0, 0.02);
    sum += de; sx += f.x * de;
  });
  // The slap of the wave on the pier, panned to where it breaks.
  if (sum > 0.05 && simT - slapT > 0.6) { slapT = simT; tmpV.set(sx / sum, 1, PIER.z0).project(camera); snd.slap(Math.min(1, sum), Math.max(-1, Math.min(1, tmpV.x))); }
}

/* ---------- mist and dust ---------- */
let mistUntil = -1, mistAcc = 0;
// The emitters follow the launch: spray mist, chain dust, grease smoke.
function driveMist(dt) {
  let on = false;
  for (let k = 0; k < 2; k++) {
    const s = sideIn[k];
    if (s && s.vin > 0.5) {
      const side = k ? -1 : 1, z = s.z + side * 1.2;
      mist.jet(k, [-38, s.wl + 1.2, z], [38, s.wl + 1.2, z], 2.4, [0, 2.2, side * 2.6], 0.35, (s.vin - 0.5) * (k ? 0.35 : 0.9), 0);
      on = true;
    } else mist.off(k);
  }
  if (L.heapV > 0.05) {
    const y = wayTop(L.heap, drop) + 0.6;
    mist.jet(2, [-32, y, L.heap], [32, y, L.heap], 1.8, [0, 1.3, 0.8], 0.25, 0, Math.min(1.5, L.heapV * 0.7));
    on = true;
  } else mist.off(2);
  if (L.phase === 'slide' && L.vs > 1) {
    const y = wayTop(L.gz, drop) + 0.4;
    mist.jet(3, [-36, y, L.gz], [36, y, L.gz], 1.4, [0, 0.7, 0], 0.2, 0.04 * L.vs, 0.015 * L.vs);
    on = true;
  } else mist.off(3);
  if (on) mistUntil = simT + 40;
  if (simT > mistUntil) return false;
  // The fluid steps at 30 Hz, whatever the frame rate.
  mistAcc = Math.min(mistAcc + dt, 0.1);
  while (mistAcc >= 1 / 30) { mist.step(1 / 30); mistAcc -= 1 / 30; }
  return true;
}

/* ---------- frame loop ---------- */
let visible = true, raf = 0, timer = 0, last = 0, lastInput = performance.now(), wasLive = false;
function frame(now) {
  raf = 0;
  if (!visible || !renderer) return;
  const t0 = performance.now();
  const dt = Math.max(0, Math.min(0.05, (now - last) / 1000));
  last = Math.max(last, now);
  let again2 = true, lively = true;
  try {
    const idle = (t0 - lastInput) / 1000;
    // Ambient motion eases to a stop over 2 s, 60 s after the last input.
    const amb = frozen ? 0 : idle < 60 ? 1 : Math.max(0, 1 - (idle - 60) / 2);
    const live = step(wasLive ? dt : dt * amb);
    wasLive = live;
    frameDt = dt;
    render();
    D.frame(dt);
    lively = live || sweeping() || dragging || Math.abs(yawGoal - yaw) > 1e-4;
    // The water's chop and the bunting drift at 30 fps until the toy sleeps.
    const drifting = amb > 0;
    again2 = lively || drifting;
  } finally {
    // A thrown error still leaves the loop able to wake.
    if (!again2) snd.rest();
    else schedule(lively ? 0 : Math.max(0, 31 - (performance.now() - t0)));
  }
}
// One frame at most is ever pending, so loops never stack.
function schedule(delay) {
  if (raf || timer || !visible || !renderer) return;
  if (delay > 0) timer = setTimeout(() => { timer = 0; raf = requestAnimationFrame(frame); }, delay);
  else raf = requestAnimationFrame(frame);
}
function wake() {
  if (timer) { clearTimeout(timer); timer = 0; }
  if (!raf) last = performance.now();
  schedule(0);
}
function halt() { cancelAnimationFrame(raf); raf = 0; clearTimeout(timer); timer = 0; }
function touch() { lastInput = performance.now(); wake(); }

/* ---------- gestures ---------- */
// A tap cuts the rope; a drag turns the head and eases back on release.
let dragging = false, pid = null, px0 = 0, py0 = 0, moved = false, yaw0 = 0;
stage.addEventListener('pointerdown', e => {
  if (e.button !== 0 || !renderer || (e.target !== renderer.domElement && e.target !== stage)) return;
  try { stage.setPointerCapture(e.pointerId); } catch { /* capture is optional */ }
  pid = e.pointerId; px0 = e.clientX; py0 = e.clientY; moved = false; yaw0 = yawGoal;
  touch();
});
stage.addEventListener('pointermove', e => {
  if (e.pointerId !== pid) return;
  const dx = e.clientX - px0;
  if (!moved && Math.hypot(dx, e.clientY - py0) > 8) { moved = true; dragging = true; }
  if (moved) { yawGoal = Math.max(-0.26, Math.min(0.26, yaw0 + (dx / cssW) * 0.9)); touch(); }
});
function end(e) {
  if (e.pointerId !== pid) return;
  pid = null;
  if (!moved && e.type === 'pointerup') { if (L.phase === 'held') launch(); }
  dragging = false;
  // The head eases back to the shot.
  yawGoal = 0;
  touch();
}
['pointerup', 'pointercancel', 'lostpointercapture'].forEach(t => stage.addEventListener(t, end));
stage.addEventListener('keydown', e => { if (e.key === 'r' || e.key === 'R') { again(); e.preventDefault(); } });

/* ---------- life cycle ---------- */
whenVisible(stage, on => { visible = on; if (on) wake(); else { halt(); snd.hide(); } });
sound.onChange(on => { if (on) touch(); else snd.cancel(); });
onReducedChange(on => { frozen = on; wake(); });
new ResizeObserver(() => resize()).observe(stage);

mark('build');
try {
  setup();
  resize(true);
  placeHull();
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
