// Steelworks: a cast house at night. Drill the taphole; the iron runs.
// three.js 0.170: the hall, the iron, sparks, fume, haze, bloom, grade.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { initPage, whenVisible, pageReady, stage as mark, reduced, onReducedChange, audioKit, sound } from '../shared/stim.js';
import { intro as playIntro } from '../shared/intro.js';
import { detail } from '../shared/detail.js';
import { TAP, TAP_DIR, TAP_Y, EYE, AIM, EDGE_X, LADLE, LOW_Y, SLAG_PIT, SKIM, CHANNELS } from './layout.js';
import { hallMaterial, buildHall, buildGear } from './hall.js';
import { makeIron } from './iron.js';
import { makeSparks } from './sparks.js';
import { IRON_VS, IRON_FS, STREAM_VS, STREAM_FS, GRADE, HAZE, FUMEMIX } from './shaders.js';
import { makeFluid } from './fume.js';
import { steelSound } from './sound.js';
mark('libs');

const ID = 'steelworks';
const stage = document.getElementById('stage');
const fail = stage.querySelector('.fail');
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const saved = k => { try { return localStorage.getItem(`stimming.${ID}.${k}`); } catch { return null; } };
const save = (k, v) => { try { localStorage.setItem(`stimming.${ID}.${k}`, String(v)); } catch { /* storage is optional */ } };
const FLOW0 = 0.6;
const flowSaved = Number(saved('flow'));
let frozen = reduced();
const qa = new URLSearchParams(location.search);

/* ---------- the cast: drill, blow, run, plug ---------- */
// Hold 1.2 s to break through. The cast runs 40 s, then the gun plugs it.
const DRILL_T = 1.2, BLOW_T = 2.2, CAST_T = 40, PLUG_T = 1.4;
const cast = { phase: 'idle', t: 0, bore: 0, hand: false, key: false, flow: saved('flow') != null && flowSaved >= 0.2 && flowSaved <= 1 ? flowSaved : FLOW0, rate: 0, jet: 0, castT: 0 };

/* ---------- bar ---------- */
const ui = initPage({ id: ID, bar: {
  actions: [
    { verb: 'tap', label: 'Tap', key: 'Space', hold: true, onDown: () => keyHold(true), onUp: () => keyHold(false) },
    { verb: 'plug', label: 'Plug', key: 'p', onPress: () => plug() },
  ],
  slider: { label: 'Flow', min: 0.2, max: 1, step: 0.01, value: cast.flow, onInput: v => { cast.flow = v; save('flow', v); touch(); } },
  quality: true,
  reset: () => { cast.flow = FLOW0; save('flow', FLOW0); ui.slider?.set?.(FLOW0); touch(); },
  keys: [['hold', 'drill'], ['click', 'splash'], ['space', 'tap'], ['p', 'plug']],
  help: [
    ['hold', 'Hold to drill the taphole; the iron runs when it breaks through'],
    ['click', 'Click the running iron to splash it'],
    ['space', 'Hold Space to drill'],
    ['p', 'Press P to plug the taphole'],
  ],
} });
const introDone = playIntro({ ready: pageReady() });
const kit = audioKit({ keys: new Set([' ']), sleepMs: 1500 });
const snd = steelSound(kit);
const syncPlug = () => { const a = ui.action?.('plug'); if (a) a.disabled = !(cast.phase === 'blow' || cast.phase === 'cast'); };

/* ---------- three ---------- */
let renderer = null, composer = null, bloom = null, grade = null, haze = null, scene = null, camera = null;
let sceneDepth = null, fume = null, fumeMix = null, hallMat = null, gear = null, iron = null, ironMat = null, sparks = null, jet = null, fall = null, ladleTop = null;
let cssW = 1, cssH = 1;
const D = detail({ maxDpr: 1.5, budget: 2.2e6, steps: 3, settle: 2, onChange: () => resize(true) });
const SPARK_MAX = 9000;

function streamMesh() {
  const g = new THREE.PlaneGeometry(2, 1, 1, 28).translate(0, 0.5, 0);
  const m = new THREE.ShaderMaterial({
    vertexShader: STREAM_VS, fragmentShader: STREAM_FS, transparent: true, depthWrite: false, side: THREE.DoubleSide,
    uniforms: { uA: { value: new THREE.Vector3() }, uV: { value: new THREE.Vector3() }, uLen: { value: 1 }, uR: { value: 0.1 }, uG: { value: 9.81 }, uTime: { value: 0 }, uHeat: { value: 1 }, uOn: { value: 0 } },
  });
  const mesh = new THREE.Mesh(g, m);
  mesh.frustumCulled = false;
  mesh.renderOrder = 2;
  return mesh;
}

async function setup() {
  renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
  const ext = renderer.extensions;
  if (!ext.has('EXT_color_buffer_float') && !ext.has('EXT_color_buffer_half_float')) throw new Error('no float targets');
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  const canvas = renderer.domElement;
  canvas.setAttribute('aria-hidden', 'true');
  stage.append(canvas);
  camera = new THREE.PerspectiveCamera(44, 1.6, 0.2, 400);
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x010102);
  hallMat = hallMaterial();
  scene.add(buildHall(hallMat));
  gear = buildGear(hallMat);
  scene.add(gear.drill.g, gear.gun.g);
  iron = makeIron();
  ironMat = new THREE.ShaderMaterial({
    vertexShader: IRON_VS, fragmentShader: IRON_FS, side: THREE.DoubleSide,
    uniforms: { uSim: { value: iron.tex }, uTime: { value: 0 }, uShaftC: hallMat.uniforms.uShaftC },
  });
  for (const g of iron.ribbons()) { const m = new THREE.Mesh(g, ironMat); m.frustumCulled = false; m.renderOrder = 1; scene.add(m); }
  jet = streamMesh(); fall = streamMesh();
  scene.add(jet, fall);
  ladleTop = new THREE.Mesh(new THREE.CircleGeometry(1.75, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x000000 }));
  ladleTop.position.copy(LADLE);
  scene.add(ladleTop);
  sparks = makeSparks(SPARK_MAX);
  scene.add(sparks.mesh);
  const rt = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 });
  rt.depthTexture = new THREE.DepthTexture(1, 1, THREE.UnsignedIntType);
  composer = new EffectComposer(renderer, rt);
  composer.addPass(new RenderPass(scene, camera));
  // The haze reads the scene's depth from the buffer the scene went to.
  // It runs before the fume, so no pass samples the target it draws into.
  haze = new ShaderPass(HAZE);
  const hazeRender = haze.render.bind(haze);
  haze.render = (r, wb, rb, ...rest) => { sceneDepth = rb.depthTexture; haze.uniforms.tDepth.value = sceneDepth; hazeRender(r, wb, rb, ...rest); };
  Object.assign(haze.uniforms.uLP, { value: hallMat.uniforms.uLP.value });
  Object.assign(haze.uniforms.uLC, { value: hallMat.uniforms.uLC.value });
  haze.uniforms.uShaftC.value = hallMat.uniforms.uShaftC.value;
  haze.uniforms.uProjInv.value = camera.projectionMatrixInverse;
  haze.uniforms.uCamW.value = camera.matrixWorld;
  haze.uniforms.uCamP.value = camera.position;
  composer.addPass(haze);
  // The fume marches against the scene's depth, then lies over it.
  fume = makeFluid(renderer);
  fumeMix = new ShaderPass(FUMEMIX);
  fumeMix.uniforms.uRes.value = new THREE.Vector2(1, 1);
  const fumeRender = fumeMix.render.bind(fumeMix);
  fumeMix.render = (r, wb, rb, ...rest) => {
    // The scene's depth stays in the haze's input buffer; never sample a bound target.
    fume.draw(camera, sceneDepth, frameNo);
    fumeMix.uniforms.tVol.value = fume.col; fumeMix.uniforms.tVolHeat.value = fume.heat;
    fumeRender(r, wb, rb, ...rest);
  };
  composer.addPass(fumeMix);
  bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.7, 0.6, 0.85);
  composer.addPass(bloom);
  grade = new ShaderPass(GRADE);
  composer.addPass(grade);
  composer.addPass(new OutputPass());
  canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); halt(); });
  canvas.addEventListener('webglcontextrestored', () => wake());
}

// The lens: about 28 mm. A tall stage widens and steps back.
const eye = EYE.clone(), aim = AIM.clone();
function frame3() {
  const asp = cssW / cssH;
  camera.fov = asp < 1 ? 66 : asp < 1.3 ? 58 : 50;
  camera.aspect = asp;
  camera.updateProjectionMatrix();
  eye.copy(EYE); aim.copy(AIM);
  // ?eye=x,y,z&aim=x,y,z&fov=n try a framing, for tuning only.
  const vq = k => qa.get(k)?.split(',').map(Number);
  if (vq('eye')?.length === 3) eye.fromArray(vq('eye'));
  if (vq('aim')?.length === 3) aim.fromArray(vq('aim'));
  if (qa.get('fov')) { camera.fov = Number(qa.get('fov')); camera.updateProjectionMatrix(); }
  if (asp < 1) { eye.add(new THREE.Vector3(1.5, 1.4, 5.5)); aim.x += 1.5; aim.y += 0.5; }
}

let W = 0, H = 0;
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
  haze.uniforms.uSteps.value = D.rung >= 2 ? 16 : 28;
  fume.resize(Math.max(1, w >> 1), Math.max(1, h >> 1));
  fume.VU.uSteps.value = D.rung >= 3 ? 28 : 48;
  fumeMix.uniforms.uRes.value.set(w, h);
  fumeMix.uniforms.uAmp.value = dpr * Math.max(0.6, Math.min(1.4, cssW / 1280));
  sparks.mat.uniforms.uView.value.set(w, h);
  sparks.mat.uniforms.uPx.value = dpr * Math.max(0.7, Math.min(1.4, cssW / 1280));
  sparks.setLimit(D.rung >= 3 ? SPARK_MAX / 2 : SPARK_MAX);
  grade.uniforms.uAsp.value = cssW / cssH;
  frame3();
  wake();
}

/* ---------- state ---------- */
let clock = 0, simT = 0, lastInput = performance.now(), timeK = 1, shake = 0;
let visible = true, raf = 0, timer = 0, last = 0, frameNo = 0, simAcc = 0;
const SIM_DT = 1 / 120, FUME_DT = 1 / 60;
let fumeAcc = 0;
const tn = new THREE.Vector3(TAP_DIR.x, 0, TAP_DIR.y);
const tapP = new THREE.Vector3(TAP.x, TAP_Y, TAP.y).addScaledVector(tn, 0.35);
const spoutCh = CHANNELS.find(c => c.id === 'iron');
const spoutP = new THREE.Vector3(spoutCh.pts.at(-1).x, spoutCh.y1 + 0.05, spoutCh.pts.at(-1).y);
const holding = () => cast.hand || cast.key;
// Drill pose: 0 parked, 1 at the taphole. Gun pose likewise.
const pose = { drill: 0, gun: 0, feed: 0 };

function setPhase(p) { cast.phase = p; cast.t = 0; syncPlug(); }
function plug() {
  if (cast.phase !== 'cast' && cast.phase !== 'blow') return;
  setPhase('plug');
  snd.event('gun');
  touch();
}

// The cast's own clock: gestures, rates and gear, before the sim.
function stepCast(dt) {
  cast.t += dt;
  const ph = cast.phase;
  if (ph === 'idle') {
    cast.rate = 0;
    if (holding()) setPhase('drill');
    // An early release backs the bore off.
    cast.bore = Math.max(0, cast.bore - dt * 0.6);
  } else if (ph === 'drill') {
    if (holding()) cast.bore += dt / DRILL_T;
    else { setPhase('idle'); }
    if (cast.bore >= 1) { cast.bore = 0; setPhase('blow'); cast.castT = 0; snd.event('blow'); emitBlow(); }
  } else if (ph === 'blow') {
    // The first gush: gas and iron blow out of the new hole.
    cast.rate = (0.55 + 0.4 * cast.flow) * (1.2 - 0.3 * sstep(0, BLOW_T, cast.t));
    if (cast.t > BLOW_T) setPhase('cast');
  } else if (ph === 'cast') {
    cast.castT += dt;
    cast.rate = 0.12 + 0.4 * cast.flow;
    if (cast.castT > CAST_T) plug();
  } else if (ph === 'plug') {
    // The gun chokes the jet once it reaches the hole.
    const k = sstep(0.5, PLUG_T, cast.t);
    cast.rate = (0.12 + 0.4 * cast.flow) * (1 - k);
    if (cast.t > PLUG_T + 1.2) setPhase('idle');
  }
  // The jet's size follows the rate, with a short lag.
  cast.jet += (cast.rate - cast.jet) * Math.min(1, dt * 6);
  // The gear: the drill swings in while held, the gun at the plug.
  const dT = ph === 'drill' ? 1 : 0;
  pose.drill += (dT - pose.drill) * Math.min(1, dt * (dT ? 7 : 1.4));
  pose.feed = ph === 'drill' ? 0.15 + 0.55 * cast.bore : pose.feed * Math.exp(-dt * 3);
  const gT = ph === 'plug' && cast.t < PLUG_T + 0.9 ? 1 : 0;
  pose.gun += (gT - pose.gun) * Math.min(1, dt * (gT ? 5 : 1.0));
}

const v3 = (a) => [a.x, a.y, a.z];
function emitBlow() {
  const d = tn.clone().add(new THREE.Vector3(0, 0.35, 0)).normalize();
  sparks.emit(simT, frozen ? 500 : 1600, v3(tapP), v3(d), 0.55, 5, 16, { life: [0.6, 1.8], drag: 0.5, carbon: 0.45, spread: 0.4, size: 0.7 });
}
// Sparks each frame from the places where iron splashes.
function emitFlow(dt) {
  const k = frozen ? 0.35 : 1;
  const r = cast.jet / 0.36;
  const n = x => { const f = x * dt * k; return Math.floor(f) + (Math.random() < f % 1 ? 1 : 0); };
  if (cast.phase === 'drill') {
    const tip = tapP.clone().addScaledVector(tn, 0.1);
    sparks.emit(simT, n(260), v3(tip), v3(tn.clone().add(new THREE.Vector3(0, 0.4, 0)).normalize()), 0.9, 2, 7, { life: [0.2, 0.7], drag: 1.2, carbon: 0.15, size: 0.35 });
  }
  if (cast.jet > 0.004) {
    const land = tapP.clone().addScaledVector(tn, 1.6).setY(-0.2);
    sparks.emit(simT, n(420 * r), v3(tapP), v3(tn.clone().add(new THREE.Vector3(0, 0.55, 0)).normalize()), 0.5, 3, 9, { life: [0.4, 1.3], drag: 0.7, carbon: 0.35, size: 0.5 });
    sparks.emit(simT, n(260 * r), v3(land), [0, 1, 0], 0.7, 2, 7, { life: [0.3, 1.0], drag: 0.8, carbon: 0.3, size: 0.45, spread: 0.5 });
  }
  const skim = iron.hotAt(iron.skimCell);
  if (skim.h > 0.05 && skim.T > 0.7) sparks.emit(simT, n(70 * skim.s), [skim.x, skim.y, skim.z], [0, 1, 0], 0.6, 1.5, 4.5, { life: [0.3, 0.9], drag: 0.9, carbon: 0.3, size: 0.35, spread: 0.6 });
  // The spout's fall throws a fountain up out of the ladle pit.
  const sr = iron.st.spoutRate;
  if (sr > 0.006) {
    const lp = [LADLE.x, LOW_Y + 3.6, LADLE.z];
    sparks.emit(simT, n(900 * Math.min(1, sr / 0.18)), lp, [-0.25, 1, 0.05], 0.55, 7, 13, { life: [0.8, 1.9], drag: 0.45, carbon: 0.4, size: 0.6, spread: 1.4 });
    sparks.emit(simT, n(140 * Math.min(1, sr / 0.18)), v3(spoutP), [0.6, 0.5, 0], 0.7, 1.5, 4, { life: [0.3, 0.8], drag: 1, carbon: 0.2, size: 0.35 });
  }
}

function step(dt) {
  const amb = frozen ? 0 : dt * timeK;
  stepCast(dt);
  const busy = cast.phase !== 'idle' || cast.bore > 0 || iron.busy() || sparks.live(simT) || pose.drill > 0.01 || pose.gun > 0.01;
  const tdt = busy ? dt : amb;
  clock += tdt;
  simT += dt;
  // The iron steps on a fixed clock, at most four steps a frame.
  simAcc = Math.min(simAcc + dt, SIM_DT * 4);
  while (simAcc >= SIM_DT) {
    const share = cast.phase === 'blow' ? 0.05 : 0.08 + 0.3 * sstep(4, 16, cast.castT);
    iron.step(SIM_DT, cast.rate, share);
    simAcc -= SIM_DT;
  }
  iron.upload();
  // The fume steps on its own fixed clock while it has anything to move.
  fumeAcc = Math.min(fumeAcc + tdt, FUME_DT * 2);
  while (fumeAcc >= FUME_DT) { fume.step(FUME_DT); fumeAcc -= FUME_DT; }
  if (dt > 0) emitFlow(dt);
  sparks.upload();
  shake = cast.phase === 'blow' && !frozen ? (1 - cast.t / BLOW_T) : 0;
  snd.update(dt, { drill: cast.phase === 'drill', bore: cast.bore, jet: cast.jet / 0.36, run: iron.st.spoutRate + iron.st.pitRate, sparks: cast.jet / 0.36 + (iron.st.spoutRate > 0.006 ? 0.5 : 0) });
  return busy;
}

// Places the gear, the streams and the lights.
function place() {
  const { drill, gun, rod } = gear;
  drill.arm.rotation.y = drill.yaw - 1.25 * (1 - pose.drill);
  drill.arm.position.set(Math.sin(drill.arm.rotation.y) * pose.feed, 0, Math.cos(drill.arm.rotation.y) * pose.feed);
  rod.rotation.z = simT * 40 * (cast.phase === 'drill' ? 1 : 0);
  gun.arm.rotation.y = gun.yaw + 1.35 * (1 - pose.gun);
  const gf = 0.55 * sstep(0.85, 1, pose.gun);
  gun.arm.position.set(Math.sin(gun.arm.rotation.y) * gf, 0, Math.cos(gun.arm.rotation.y) * gf);
  // The jet: out of the taphole, arcing into the trough.
  const r = cast.jet / 0.36;
  const ju = jet.material.uniforms;
  ju.uA.value.copy(tapP);
  ju.uV.value.copy(tn).multiplyScalar(2.2 + 1.6 * r).setY(0.25 + 0.4 * r);
  ju.uLen.value = 0.62; ju.uR.value = 0.08 + 0.12 * r; ju.uTime.value = clock; ju.uOn.value = sstep(0.0, 0.08, r);
  // The fall from the spout into the ladle.
  const sr = Math.min(1, iron.st.spoutRate / 0.18);
  const fu = fall.material.uniforms;
  fu.uA.value.copy(spoutP); fu.uV.value.set(1.1, 0.1, 0);
  fu.uLen.value = 1.0; fu.uR.value = 0.05 + 0.1 * sr; fu.uTime.value = clock; fu.uOn.value = sstep(0.0, 0.15, sr);
  ladleTop.position.y = LADLE.y + 0.6 + 3.2 * iron.st.ladle;
  ladleTop.material.color.setRGB(2.2, 1.0, 0.3).multiplyScalar(0.12 + 0.88 * sr);
  ironMat.uniforms.uTime.value = clock;
  placeFume(r);
  // Lights: the jet, seven iron groups, the ladle pit, the slag pit.
  const U = hallMat.uniforms, LP = U.uLP.value, LC = U.uLC.value;
  const flick = frozen ? 1 : 0.9 + 0.1 * Math.sin(clock * 31) * Math.sin(clock * 17 + 1);
  LP[0].set(tapP.x + tn.x * 1.2, TAP_Y + 0.6, tapP.z + tn.z * 1.2, 0.4);
  LC[0].set(1.0, 0.42, 0.1).multiplyScalar((1.2 + r * 14 + (cast.phase === 'blow' ? 30 * (1 - cast.t / BLOW_T) : 0) + (cast.phase === 'drill' ? 1.5 + 3 * cast.bore : 0)) * flick);
  iron.lights(LP, LC, 1, 9 * flick);
  LP[8].set(EDGE_X + 1.0, -0.6, LADLE.z, 1.5);
  // The ladle is preheated: its pit glows dull before the iron comes.
  LC[8].set(1.0, 0.42, 0.1).multiplyScalar((2.5 + 40 * sr * (0.15 + 0.85 * Math.max(sr, iron.st.ladle * 0.3))) * flick);
  LP[9].set(SLAG_PIT.x, SLAG_PIT.y + 3.4, SLAG_PIT.z, 1.5);
  LC[9].set(1.0, 0.36, 0.08).multiplyScalar(14 * Math.min(1, iron.st.pitRate / 0.06) * flick);
  U.uHot.value = cast.phase === 'drill' ? 0.5 + 1.5 * cast.bore : cast.jet > 0.004 ? 1.8 : 0.22;
  U.uGlowK.value = 2.2 + 0.4 * (frozen ? 0 : Math.sin(clock * 0.7));
}

// The fume's emitters follow the jet and the hot iron below them.
const duct = new THREE.Vector3(TAP.x, 0, TAP.y).addScaledVector(tn, 2.0);
function placeFume(r) {
  const J = fume.jetU, VU = fume.VU;
  J.uHood.value.set(duct.x, duct.z, 2.4, 4.6);
  const blow = cast.phase === 'blow' ? 1 - cast.t / BLOW_T : 0;
  const jd = tn.clone().setY(0.25).normalize();
  J.uJetP.value[0].set(tapP.x, tapP.y, tapP.z, 0.35 + 0.3 * blow);
  J.uJetA.value[0].set(jd.x, jd.y, jd.z, 1.8);
  J.uJetK.value[0].set(3 * r + 6 * blow, 4 * r + 8 * blow, 3 * r + 7 * blow, 0);
  const at = [Math.round(iron.chans[0].n * 0.25), iron.skimCell - 2, iron.chans[1].first + Math.round(iron.chans[1].n * 0.3)];
  at.forEach((c, i) => {
    const h = iron.hotAt(c), k = sstep(0.55, 0.95, h.T) * Math.min(1, h.h / 0.15);
    J.uJetP.value[i + 1].set(h.x, h.y - 0.1, h.z, 1.1);
    J.uJetA.value[i + 1].set(0, 1, 0, 0.9);
    J.uJetK.value[i + 1].set(1.2 * k, 2.5 * k, 1.3 * k, 0);
  });
  const LP = hallMat.uniforms.uLP.value, LC = hallMat.uniforms.uLC.value;
  VU.uLightP.value.set(LP[2].x, LP[2].y, LP[2].z);
  VU.uLightC.value.setRGB(LC[0].x + LC[1].x + LC[2].x, LC[0].y + LC[1].y + LC[2].y, LC[0].z + LC[1].z + LC[2].z).multiplyScalar(0.05);
  VU.uJetA0.value.copy(tapP).setY(0.2);
  VU.uJetA1.value.set(SKIM.x, 0.2, SKIM.y);
  VU.uJetC.value.setRGB(LC[1].x + LC[2].x, LC[1].y + LC[2].y, LC[1].z + LC[2].z).multiplyScalar(0.02);
}

function render() {
  const sh = shake * 0.04;
  camera.position.set(eye.x + (Math.random() - 0.5) * sh, eye.y + (Math.random() - 0.5) * sh, eye.z);
  camera.lookAt(aim);
  sparks.mat.uniforms.uTime.value = simT;
  grade.uniforms.uGrain.value = frozen ? 0 : frameNo % 97;
  camera.updateMatrixWorld();
  haze.uniforms.uFrame.value = frozen ? 0 : frameNo % 64;
  bloom.strength = 0.55 + 0.25 * Math.min(1, cast.jet / 0.36);
  composer.render();
}

/* ---------- frame loop ---------- */
function frame(now) {
  raf = 0;
  const t0 = performance.now();
  if (!visible || !renderer) return;
  const dt = Math.max(0, Math.min(0.05, (now - last) / 1000));
  last = Math.max(last, now);
  let again = true, lively = true;
  try {
    const idle = (now - lastInput) / 1000;
    timeK = idle < 60 ? 1 : Math.max(0, 1 - (idle - 60) / 2);
    lively = step(dt);
    place();
    render();
    D.frame(dt);
    frameNo++;
    again = lively || snd.busy || (timeK > 0 && !frozen);
  } finally {
    // A thrown error still leaves the loop able to wake.
    if (!again) snd.rest();
    else schedule(lively ? 0 : Math.max(0, 31 - (performance.now() - t0)));
  }
}
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
function touch() { lastInput = performance.now(); timeK = 1; wake(); }

/* ---------- gestures ---------- */
// A hold drills; a tap on the running iron splashes it.
let down = false, pid = null, at0 = null, moved = false, held = false, holdT = 0;
const local = e => { const r = stage.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hit = new THREE.Vector3();
function splash(x, y) {
  ndc.set((x / cssW) * 2 - 1, -(y / cssH) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  if (!ray.ray.intersectPlane(plane, hit)) return;
  const c = iron.nearest(hit.x, hit.z);
  if (c.d > 1.2 || c.h < 0.03 || c.T < 0.5) return;
  sparks.emit(simT, frozen ? 60 : 180, [c.x, c.y + 0.05, c.z], [0, 1, 0], 0.75, 2.5, 8, { life: [0.4, 1.2], drag: 0.7, carbon: 0.4, size: 0.5, spread: 0.3 });
  snd.event('splash');
}
stage.addEventListener('pointerdown', e => {
  if (e.button !== 0 || !renderer || (e.target !== renderer.domElement && e.target !== stage)) return;
  try { stage.setPointerCapture(e.pointerId); } catch { /* capture is optional */ }
  pid = e.pointerId; at0 = local(e); moved = false; held = false; down = true;
  clearTimeout(holdT);
  // Only a hold drills; a tap stays a tap.
  holdT = setTimeout(() => { held = true; if (cast.phase === 'idle' || cast.phase === 'drill') { cast.hand = true; touch(); } }, 260);
  touch();
});
stage.addEventListener('pointermove', e => {
  if (!down || e.pointerId !== pid) return;
  const p = local(e);
  if (!moved && Math.hypot(p[0] - at0[0], p[1] - at0[1]) >= 8) moved = true;
});
function end(e) {
  if (!down || (e && e.pointerId !== pid)) return;
  clearTimeout(holdT);
  down = false; pid = null; cast.hand = false;
  if (!held && !moved) {
    // A tap on idle iron gives the drill a short nudge, so the press answers.
    if (cast.phase === 'idle') { cast.bore = Math.min(0.3, cast.bore + 0.15); pose.drill = Math.max(pose.drill, 0.35); }
    else splash(at0[0], at0[1]);
  }
  touch();
}
['pointerup', 'pointercancel', 'lostpointercapture'].forEach(t => stage.addEventListener(t, end));
function keyHold(on) {
  if (!renderer || on === cast.key) return;
  cast.key = on;
  touch();
}

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
if (qa.has('qa')) globalThis.__steel = { cast, iron: () => iron, fume: () => fume, D, hall: () => hallMat, cam: () => camera, eye, aim, render: () => { place(); render(); }, setPhase, plug, get frames() { return frameNo; }, get simT() { return simT; } };

mark('build');
try {
  await setup();
  resize(true);
  syncPlug();
  // The first frame is a picture: the old crust, the peepholes, the shafts.
  for (let i = 0; i < 4; i++) step(1 / 60);
  place();
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
void SKIM;
