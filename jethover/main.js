// Jet hover: a jet holds in the hover at blue hour; the hand works the throttle.
// three.js 0.170: scene, gas sim and volume, heat refraction, bloom, grade.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { initPage, whenVisible, pageReady, stage as mark, reduced, onReducedChange, audioKit, sound } from '../shared/stim.js';
import { intro as playIntro } from '../shared/intro.js';
import { detail } from '../shared/detail.js';
import { buildScene, NOZ, FAN, NOZ_R } from './scene.js';
import { makePlumes, REFRACT, GRADE } from './fx.js';
import { makeFluid } from './fluid.js';
import { jetSound } from './sound.js';
mark('libs');

const ID = 'jethover';
const stage = document.getElementById('stage');
const fail = stage.querySelector('.fail');
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const saved = k => { try { return localStorage.getItem(`stimming.${ID}.${k}`); } catch { return null; } };
const save = (k, v) => { try { localStorage.setItem(`stimming.${ID}.${k}`, String(v)); } catch { /* storage is optional */ } };
const BASE0 = 0.45;
const baseSaved = Number(saved('throttle'));
let frozen = reduced();

/* ---------- the engine and the craft ---------- */
// rpm lags the throttle: it spools up fast and runs down slow.
const eng = { base: saved('throttle') != null && baseSaved >= 0.2 && baseSaved <= 0.75 ? baseSaved : BASE0, rpm: 0, hand: false, key: false, blip: 0 };
eng.rpm = eng.base;
const HOVER_Y = 6.1, YAW0 = -0.62;
const craft = { y: HOVER_Y, vy: 0, x: 0, vx: 0, tx: 0, yaw: 0 };

/* ---------- bar ---------- */
const ui = initPage({ id: ID, bar: {
  actions: [{ verb: 'reheat', label: 'Reheat', key: 'Space', hold: true, onDown: () => keyBurn(true), onUp: () => keyBurn(false) }],
  slider: { label: 'Throttle', min: 0.2, max: 0.75, step: 0.01, value: eng.base, onInput: v => { eng.base = v; save('throttle', v); touch(); } },
  quality: true,
  reset: () => { eng.base = BASE0; save('throttle', BASE0); ui.slider?.set?.(BASE0); craft.tx = 0; touch(); },
  keys: [['hold', 'full reheat'], ['drag', 'drift'], ['space', 'full reheat']],
  help: [
    ['hold', 'Hold for full reheat'],
    ['drag', 'Drag while you hold to let the jet drift'],
    ['click', 'Click for a short burst of throttle'],
    ['space', 'Hold Space for full reheat'],
  ],
} });
const introDone = playIntro({ ready: pageReady() });
const kit = audioKit({ keys: new Set([' ']), sleepMs: 1500 });
const snd = jetSound(kit);

/* ---------- three ---------- */
let renderer = null, composer = null, bloom = null, refract = null, grade = null, S = null, camera = null;
let heatScene = null, heatRT = null, occl = null, P = null, gas = null;
let cssW = 1, cssH = 1;
const AIM = new THREE.Vector3(0, 4.7, 0);
const D = detail({ maxDpr: 1.5, budget: 2.2e6, steps: 3, settle: 2, onChange: () => resize(true) });

async function setup() {
  renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
  const ext = renderer.extensions;
  if (!ext.has('EXT_color_buffer_float') && !ext.has('EXT_color_buffer_half_float')) throw new Error('no float targets');
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.9;
  const canvas = renderer.domElement;
  canvas.setAttribute('aria-hidden', 'true');
  stage.append(canvas);
  camera = new THREE.PerspectiveCamera(30, 1.6, 0.5, 2000);
  S = buildScene(renderer);
  // Three jets: two hot nozzles and the cold lift fan.
  P = makePlumes(3);
  P.plumes.forEach(m => S.scene.add(m));
  P.plumes[2].material.uniforms.uCold.value = 1;
  P.plumes[2].material.uniforms.uR.value = 0.6;
  gas = makeFluid(renderer);
  // The jet cores' fine heat; its depth also stops the gas march at the craft.
  heatScene = new THREE.Scene();
  P.heats.forEach(m => heatScene.add(m));
  // The craft hides the heat behind it: it writes depth only.
  occl = S.craft.grp.clone();
  const om = new THREE.MeshBasicMaterial({ colorWrite: false });
  occl.traverse(o => { if (o.isMesh) o.material = om; });
  occl.renderOrder = -1;
  heatScene.add(occl);
  heatRT = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, depthBuffer: true });
  heatRT.depthTexture = new THREE.DepthTexture(1, 1, THREE.UnsignedIntType);
  const rt = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 });
  composer = new EffectComposer(renderer, rt);
  composer.addPass(new RenderPass(S.scene, camera));
  refract = new ShaderPass(REFRACT);
  refract.uniforms.tHeat.value = heatRT.texture;
  refract.uniforms.tVol.value = gas.col;
  refract.uniforms.tVolHeat.value = gas.heat;
  composer.addPass(refract);
  bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.6, 0.55, 0.82);
  composer.addPass(bloom);
  grade = new ShaderPass(GRADE);
  composer.addPass(grade);
  composer.addPass(new OutputPass());
  canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); halt(); });
  canvas.addEventListener('webglcontextrestored', () => wake());
}

// The lens: the craft and its plumes fill the frame; a tall stage pulls back.
function frame3() {
  const asp = cssW / cssH;
  const vfov = asp < 1 ? 34 : 30;
  const hHalf = Math.atan(Math.tan((vfov * Math.PI) / 360) * asp);
  const dist = Math.max(33, (asp < 1 ? 8.4 : 9) / Math.tan(hHalf));
  camera.fov = vfov;
  camera.aspect = asp;
  camera.updateProjectionMatrix();
  base.set(0, 3.0, dist);
  AIM.y = asp < 1 ? 3.6 : 4.4;
}
const base = new THREE.Vector3(0, 1.6, 24);

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
  heatRT.setSize(Math.max(1, w >> 1), Math.max(1, h >> 1));
  gas.resize(Math.max(1, w >> 1), Math.max(1, h >> 1));
  gas.VU.uSteps.value = D.rung >= 3 ? 36 : 64;
  refract.uniforms.uRes.value.set(w, h);
  refract.uniforms.uAmp.value = dpr * Math.max(0.6, Math.min(1.4, cssW / 1280));
  grade.uniforms.uAsp.value = cssW / cssH;
  frame3();
  wake();
}

/* ---------- state ---------- */
let clock = 0, lastInput = performance.now(), timeK = 1, shake = 0, flick = 1;
let visible = true, raf = 0, timer = 0, last = 0, frameNo = 0;
let simAcc = 0;
const SIM_DT = 1 / 60;
const tmp = new THREE.Vector3(), axis = new THREE.Vector3();
const jets = [0, 1, 2].map(() => ({ n: new THREE.Vector3(), c: new THREE.Vector3(), a: new THREE.Vector3(0, -1, 0) }));
const throttle = () => (eng.hand || eng.key || eng.blip > 0 ? 1 : eng.base);

function step(dt) {
  const live = dt;
  const amb = frozen ? 0 : dt * timeK;
  // The engine: spool toward the throttle.
  const tgt = throttle();
  const tau = tgt > eng.rpm ? 0.55 : 1.1;
  eng.rpm += (tgt - eng.rpm) * (1 - Math.exp(-live / tau));
  eng.blip = Math.max(0, eng.blip - live);
  // The craft: extra thrust climbs, and it rides a soft spring.
  const ty = HOVER_Y + (eng.rpm - eng.base) * 2.4 + (eng.base - BASE0) * 1.2;
  craft.vy += ((ty - craft.y) * 2.2 - craft.vy * 2.4) * live;
  craft.y += craft.vy * live;
  craft.vx += ((craft.tx - craft.x) * 0.9 - craft.vx * 1.6) * live;
  craft.x += craft.vx * live;
  craft.yaw += (clamp(craft.tx * 0.05, -0.22, 0.22) - craft.yaw) * (1 - Math.exp(-live * 1.2));
  // Time for the flame runs while the scene drifts or the hand acts.
  const busy = eng.hand || eng.key || eng.blip > 0 || Math.abs(tgt - eng.rpm) > 0.015 || Math.abs(craft.vx) + Math.abs(craft.vy) > 0.006;
  const tdt = busy ? live : amb;
  clock += tdt;
  flick = frozen && !busy ? 1 : 0.92 + 0.08 * Math.sin(clock * 37.0) * Math.sin(clock * 23.0 + 1.3) + 0.04 * Math.sin(clock * 61.0);
  shake = Math.max(0, eng.rpm - 0.8) * (frozen ? 0 : 1);
  pose(tdt);
  // The gas steps on a fixed clock, two steps a frame at most.
  simAcc = Math.min(simAcc + tdt, SIM_DT * 2);
  while (simAcc >= SIM_DT) { gas.step(SIM_DT); simAcc -= SIM_DT; }
  snd.update(eng.rpm, clamp(craft.x / 8, -1, 1), dt, eng.hand || eng.key || eng.blip > 0);
  return busy;
}

// Places the craft, then the jets, pools and lamps from its nozzles.
function pose(tdt) {
  const g = S.craft.grp;
  const bob = frozen ? 0 : Math.sin(clock * 0.9) * 0.05 + Math.sin(clock * 2.3 + 1) * 0.02;
  g.position.set(craft.x, craft.y + bob, 0);
  const roll = clamp(-craft.vx * 0.05, -0.12, 0.12) + (frozen ? 0 : Math.sin(clock * 0.7) * 0.006);
  const pitch = 0.035 + (frozen ? 0 : Math.sin(clock * 0.53 + 2) * 0.006);
  g.rotation.set(roll, YAW0 + craft.yaw, pitch, 'YZX');
  g.updateMatrixWorld(true);
  occl.position.copy(g.position); occl.quaternion.copy(g.quaternion);
  occl.updateMatrixWorld(true);
  axis.set(0, -1, 0).transformDirection(g.matrixWorld);
  const pts = [NOZ[0], NOZ[1], FAN];
  const thr = eng.rpm * flick;
  jets.forEach((j, i) => {
    j.n.copy(pts[i]).applyMatrix4(g.matrixWorld);
    j.a.copy(axis);
    const len = j.n.y / Math.max(0.2, -axis.y);
    j.c.copy(j.n).addScaledVector(axis, len);
    for (const m of [P.plumes[i], P.heats[i]]) {
      const u = m.material.uniforms;
      u.uN.value.copy(j.n); u.uAxis.value.copy(axis); u.uLen.value = len;
      u.uThr.value = i === 2 ? eng.rpm : thr; u.uTime.value = clock;
    }
    // The gas: each jet drives its core down; the hot ones heat it.
    gas.jetU.uJetP.value[i].set(j.n.x, j.n.y, j.n.z, i === 2 ? 0.75 : 0.6);
    gas.jetU.uJetA.value[i].set(axis.x, axis.y, axis.z, len);
    gas.jetU.uJetK.value[i].set((i === 2 ? 9 : 15) * (0.35 + 0.75 * eng.rpm), i === 2 ? 0 : 6 + 14 * eng.rpm, (i === 2 ? 1.2 : 4) * (0.3 + eng.rpm), 0);
    // The pad: a hot pool under each nozzle; the fan's pool is cold.
    const hot = i === 2 ? 0 : (0.25 + 1.5 * thr * thr) * clamp(1.4 - j.n.y / 10, 0.3, 1);
    S.padU.uHot.value[i].set(j.c.x, 0, j.c.z, hot);
    S.padU.uNoz.value[i].set(j.n.x, j.n.y, j.n.z, i === 2 ? 0 : 2 + 6 * thr);
  });
  // Lamps: one under each nozzle, one bounce off the pad.
  for (let i = 0; i < 2; i++) {
    S.lamps[i].position.copy(jets[i].n).addScaledVector(axis, 0.7);
    S.lamps[i].intensity = (3 + 16 * thr) * flick;
  }
  tmp.copy(jets[0].c).add(jets[1].c).multiplyScalar(0.5);
  S.lamps[2].position.set(tmp.x, 0.6, tmp.z + 0.6);
  S.lamps[2].intensity = (2 + 14 * thr * thr) * flick;
  S.craft.glowU.uGlow.value = (0.5 + 1.6 * thr) * flick;
  // The gas takes its light from the pools, just over the pad.
  gas.VU.uLightP.value.set(tmp.x, 1.4, tmp.z);
  gas.VU.uLightC.value.setRGB(1.0, 0.42, 0.13).multiplyScalar((0.5 + 1.8 * thr * thr) * flick);
  void tdt;
}

function render() {
  const sh = shake * 0.05;
  const sway = frozen ? 0 : 1;
  camera.position.set(
    base.x + Math.sin(clock * 0.21) * 0.25 * sway + (Math.random() - 0.5) * sh,
    base.y + Math.sin(clock * 0.17 + 1) * 0.08 * sway + (Math.random() - 0.5) * sh,
    base.z,
  );
  camera.lookAt(AIM.x + craft.x * 0.35, AIM.y + (craft.y - HOVER_Y) * 0.4, AIM.z);
  refract.uniforms.uTime.value = clock;
  grade.uniforms.uGrain.value = frozen ? 0 : frameNo % 97;
  bloom.strength = 0.45 + 0.35 * eng.rpm;
  renderer.setRenderTarget(heatRT);
  renderer.setClearColor(0x000000, 1);
  renderer.clear();
  renderer.render(heatScene, camera);
  gas.draw(camera, heatRT.depthTexture, frameNo);
  renderer.setRenderTarget(null);
  composer.render();
}

/* ---------- frame loop ---------- */
// Lively while the hand acts or the engine spools; the hover drifts at 30 fps.
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
function touch() { lastInput = performance.now(); timeK = 1; wake(); }

/* ---------- gestures ---------- */
// A press opens the throttle at once; a tap leaves a short burst.
let down = false, pid = null, at0 = null, moved = false, held = false, holdT = 0, pressT = 0;
const local = e => { const r = stage.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
// The drift target: the pointer's place across the stage, in metres.
function steer(x) { craft.tx = clamp(((x / cssW) * 2 - 1) * 9, -5, 5); }
stage.addEventListener('pointerdown', e => {
  if (e.button !== 0 || !renderer || (e.target !== renderer.domElement && e.target !== stage)) return;
  try { stage.setPointerCapture(e.pointerId); } catch { /* capture is optional */ }
  pid = e.pointerId; at0 = local(e); moved = false; held = false; down = true; pressT = performance.now();
  clearTimeout(holdT);
  holdT = setTimeout(() => { held = true; }, 260);
  eng.hand = true;
  // A small kick answers the press in the same frame.
  eng.rpm = Math.min(1, eng.rpm + 0.06);
  touch();
});
stage.addEventListener('pointermove', e => {
  if (!down || e.pointerId !== pid) return;
  const p = local(e);
  if (!moved && Math.hypot(p[0] - at0[0], p[1] - at0[1]) < 8) return;
  moved = true;
  steer(p[0]);
  touch();
});
function end(e) {
  if (!down || (e && e.pointerId !== pid)) return;
  clearTimeout(holdT);
  down = false; pid = null; eng.hand = false;
  // A tap: a short burst of throttle, then back to the hover.
  if (!moved && !held) eng.blip = Math.max(0, 0.4 - (performance.now() - pressT) / 1000);
  craft.tx = 0;
  touch();
}
['pointerup', 'pointercancel', 'lostpointercapture'].forEach(t => stage.addEventListener(t, end));
function keyBurn(on) {
  if (!renderer || on === eng.key) return;
  eng.key = on;
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
if (new URLSearchParams(location.search).has('qa')) globalThis.__jet = { eng, craft, gas: () => gas, refract: () => refract, D, get frames() { return frameNo; } };

mark('build');
try {
  await setup();
  resize(true);
  // The gas runs for five seconds, so the first frame is a picture.
  for (let i = 0; i < 300; i++) step(1 / 60);
  render();
  await renderer.compileAsync(S.scene, camera);
  await renderer.compileAsync(heatScene, camera);
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
