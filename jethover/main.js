// Jet hover: a jet holds in the hover at blue hour; the hand works the throttle.
// three.js 0.186 WebGPU: Fire's gas for steam and exhaust, a long lens, heat bend, bloom, grade.
import * as THREE from 'three/webgpu';
import * as TSL from 'three/tsl';
import { snoise, snoiseVec3 } from 'three/addons/tsl/math/curlNoise.js';
import { initPage, whenVisible, pageReady, stage as mark, reduced, onReducedChange, audioKit, sound } from '../shared/stim.js';
import { intro as playIntro } from '../shared/intro.js';
import { detail } from '../shared/detail.js';
import { HOURS, dayClock } from '../shared/daytime.js';
import { buildScene, NOZ, NOZ_R, FAN, EYE, TIMES, plateReady } from './scene.js';
import { makePlumes, makePost } from './fx.js';
import { createFire } from './gas.js';
import { createHeat2D } from './heat2d.js';
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
const HOVER_Y = 6.1;
// The nose points at the camera, turned a little off the axis.
const YAW0 = -Math.PI / 2 + 0.32;
const craft = { y: HOVER_Y, vy: 0, x: 0, vx: 0, tx: 0, ty: HOVER_Y, yaw: 0 };
// The nozzles stand 1.62 m under the craft's centre, at world z -3.1.
const NOZ_DY = 1.62, NOZ_Z = -3.1;
// The visible jet runs 9 m at most; past that it spreads in free air.
const JET_MAX = 9;

/* ---------- time of day ---------- */
const timeSaved = saved('time');
const time0 = TIMES.includes(timeSaved) ? timeSaved : 'dusk';
// The clock eases the hour over about two seconds.
const clockT = dayClock({ hour: HOURS[time0], tau: 0.6 });
function pickTime(v) {
  clockT.to(v);
  save('time', v);
  if (frozen) clockT.snap();
  if (ready) applyTime();
  touch();
}

/* ---------- the lens ---------- */
// Wide: the long shot of the craft. Tight: the plumes against the far country.
const lens = { tight: saved('lens') === 'tight', k: 0 };
lens.k = lens.tight ? 1 : 0;
function toggleLens() {
  lens.tight = !lens.tight;
  save('lens', lens.tight ? 'tight' : 'wide');
  if (frozen) { lens.k = lens.tight ? 1 : 0; if (ready) frame3(); }
  touch();
}

/* ---------- dev tuning (?dev) ---------- */
// Each row scales one value; 1 keeps today's look. The values persist.
const tune = {
  bendK: 2, capK: 1.5, heatBlur: 1.5, heatK: 1,
  gasBlur: 1, gasK: 1, occK: 1, exSmoke: 1, exHeat: 1, speedK: 1,
  expo: 1, bloom: 1, grain: 1,
};
const slider = (id, group, label, min, max, step) => ({
  type: 'slider', id, group, label, min, max, step, value: tune[id], persist: true,
  onInput: v => { tune[id] = v; applyTune(); touch(); },
});
const DEV_ROWS = [
  slider('bendK', 'Heat haze', 'Bend strength', 0, 4, 0.05),
  slider('capK', 'Heat haze', 'Bend limit', 0.25, 6, 0.05),
  slider('heatBlur', 'Heat haze', 'Smoothing', 0, 4, 0.05),
  slider('heatK', 'Heat haze', 'Heat to shimmer', 0, 3, 0.05),
  slider('gasBlur', 'Gas', 'Smoothing', 0, 3, 0.05),
  slider('gasK', 'Gas', 'Brightness', 0, 2, 0.05),
  slider('occK', 'Gas', 'Smoke dimming', 0, 3, 0.05),
  slider('exSmoke', 'Gas', 'Exhaust smoke', 0, 3, 0.05),
  slider('exHeat', 'Gas', 'Exhaust heat', 0, 3, 0.05),
  slider('speedK', 'Gas', 'Gas speed', 0.2, 2, 0.05),
  slider('expo', 'Look', 'Exposure', 0.5, 1.6, 0.01),
  slider('bloom', 'Look', 'Bloom', 0, 2, 0.05),
  slider('grain', 'Look', 'Grain', 0, 2, 0.05),
];

/* ---------- bar ---------- */
const ui = initPage({ id: ID, bar: {
  dev: DEV_ROWS,
  choice: { label: 'Time of day', value: time0, options: [
    { value: 'dawn', label: 'Dawn', key: '1' },
    { value: 'day', label: 'Day', key: '2' },
    { value: 'dusk', label: 'Dusk', key: '3' },
    { value: 'night', label: 'Night', key: '4' },
  ], onPick: v => pickTime(v) },
  actions: [
    { verb: 'reheat', label: 'Reheat', key: 'Space', hold: true, onDown: () => keyBurn(true), onUp: () => keyBurn(false) },
    { verb: 'lens', label: 'Lens', key: 'L', onPress: () => toggleLens() },
  ],
  slider: { label: 'Throttle', min: 0.2, max: 0.75, step: 0.01, value: eng.base, onInput: v => { eng.base = v; save('throttle', v); touch(); } },
  quality: true,
  reset: () => { eng.base = BASE0; save('throttle', BASE0); ui.slider?.set?.(BASE0); craft.tx = 0; craft.ty = HOVER_Y; touch(); },
  keys: [['hold', 'full reheat'], ['drag', 'drift'], ['1 2 3 4', 'change the time of day'], ['L', 'tight or wide lens']],
  help: [
    ['hold', 'Hold for full reheat'],
    ['drag', 'Drag while you hold to let the jet drift'],
    ['click', 'Click for a short burst of throttle'],
    ['space', 'Hold Space for full reheat'],
    ['1 2 3 4', 'Change the time of day'],
    ['L', 'Switch between the wide shot and a tight lens on the plumes'],
  ],
} });
// Stored Dev values replace the defaults.
for (const r of DEV_ROWS) { const v = ui.setting?.(r.id)?.value; if (Number.isFinite(v)) tune[r.id] = v; }
const introDone = playIntro({ ready: pageReady() });
const kit = audioKit({ keys: new Set([' ']), sleepMs: 1500 });
const snd = jetSound(kit);

/* ---------- three ---------- */
let renderer = null, post = null, S = null, camera = null, P = null, gas = null, vol = null, gasF = null, volF = null, heat2 = null;
let volScene = null, heatScene = null, planeScene = null, volLamps = null;
// Ready once setup has finished; until then nothing draws.
let ready = false;
let cssW = 1, cssH = 1;
const AIM = new THREE.Vector3(0, 3.6, -1.5);
const D = detail({ maxDpr: 1.5, budget: 2.2e6, steps: 3, settle: 2, onChange: () => resize(true) });

// The gas box: 28 m square and 14 m tall, its floor on the apron.
const BOX = [28, 14, 28], CENTER = [0, 7, -2.5];
// The exhaust: a fine grid of 0.14 m cells round the jets, from the sky to the pad.
// It spans the drift and the climb, so the jets never leave it.
const FBOX = [16, 15, 5], FCENTER = [-1.2, 7.5, -3.1];

async function setup() {
  if (!navigator.gpu) throw new Error('no WebGPU');
  renderer = new THREE.WebGPURenderer({ antialias: false });
  await renderer.init();
  // WebGPURenderer can fall back to WebGL 2; this toy does not.
  if (!renderer.backend.isWebGPUBackend) throw new Error('no WebGPU backend');
  // The renderer's own frame loop never runs: this page owns every frame.
  renderer._animation.stop();
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.9;
  const canvas = renderer.domElement;
  canvas.setAttribute('aria-hidden', 'true');
  stage.append(canvas);
  camera = new THREE.PerspectiveCamera(9, 1.6, 2, 40000);
  S = buildScene();
  // Three jets: two hot nozzles and the cold lift fan.
  P = makePlumes(3);
  P.forEach(p => S.scene.add(p.mesh));
  P[2].U.cold.value = 1;
  P[2].U.r.value = 0.6;
  // The gas and its heat each draw in a scene of their own, at half size.
  volScene = new THREE.Scene();
  heatScene = new THREE.Scene();
  planeScene = new THREE.Scene();
  volLamps = [0, 1, 2].map(() => { const l = new THREE.PointLight(0xff7a30, 0, 40, 2); volScene.add(l); return l; });
  post = makePost({ renderer, scene: S.scene, camera, volScene, heatScene, planeScene });
  gas = createFire({ THREE, TSL, curl: { snoise, snoiseVec3 }, renderer, grid: [112, 56, 112], size: BOX, center: CENTER, pressure: 12, emitMax: 1 });
  const u = gas.u;
  // No point emitters: the jets and the damp floor feed the gas.
  u.emitTemperature.value = 0;
  u.buoyancy.value = 0.35; u.weight.value = -0.05;
  u.turbulence.value = 4.0; u.turbFrequency.value = 10.0; u.vorticity.value = 7.0;
  u.velDamping.value = 0.35; u.cooling.value = 1.6; u.dissipation.value = 0.32;
  // The pad gas glows orange, never white: its heat caps low.
  u.tMax.value = 2.5;
  u.intensity.value = 1.2; u.glowSpread.value = 2.8; u.glowGain.value = 1.0; u.glowAge.value = 2.0;
  u.startColor.value.setRGB(1.0, 0.86, 0.62); u.midColor.value.setRGB(1.0, 0.42, 0.1); u.endColor.value.setRGB(0.22, 0.05, 0.05);
  u.smokeTint.value.setRGB(0.9, 0.86, 0.8);
  u.ambient.value.setRGB(0.035, 0.05, 0.09);
  u.shadowAbsorption.value = 2.2; u.shadowAmbient.value = 0.15; u.asymmetry.value = 0.35;
  u.heatGain.value = 5;
  u.skyShadow.value = 1.2;
  vol = gas.volume({ steps: 72, lift: 0, sceneZ: post.sceneZ });
  volScene.add(vol.mesh);
  heatScene.add(vol.heatMesh);
  // The exhaust: Fire's gas again, fine, fed at the nozzle exits.
  gasF = createFire({ THREE, TSL, curl: { snoise, snoiseVec3 }, renderer, grid: [112, 104, 36], size: FBOX, center: FCENTER, pressure: 10, emitMax: 480 });
  const f = gasF.u;
  // Fire's own emitter: a disc of points just under each nozzle, in the craft's frame.
  const pts = [];
  for (const n of NOZ) {
    for (let k = 0; k < 240; k++) {
      const a = k * 2.39996, r = NOZ_R * 0.85 * Math.sqrt((k + 0.5) / 240);
      pts.push(n.x + Math.cos(a) * r, n.y - 0.15 - (k % 4) * 0.08, n.z + Math.sin(a) * r);
    }
  }
  gasF.setEmitters(pts);
  // Fire's rates times 60: jet gas crosses a cell in a hundredth of a second.
  // Smoke outweighs heat, so the cooled exhaust stays as billows.
  f.emitTemperature.value = 330; f.emitDensity.value = 2000; f.emitGain.value = 1;
  // The emitter feeds this sim; the jet cores add only a little heat.
  f.feed.value.set(0.05, 0);
  f.buoyancy.value = 0.6; f.weight.value = 0.05;
  // Strong swirl rolls the smoke into billows at the jet's edge.
  f.turbulence.value = 4.0; f.turbFrequency.value = 10.0; f.vorticity.value = 8.0;
  f.velDamping.value = 0.25; f.cooling.value = 1.3; f.dissipation.value = 0.7;
  f.skyShadow.value = 1.2;
  // A flat glow curve, near Fire's own, so the cooler stream still shows.
  f.tMax.value = 3;
  f.intensity.value = 0.8; f.glowSpread.value = 4.8; f.glowGain.value = 1.0; f.glowAge.value = 3.0;
  f.startColor.value.copy(u.startColor.value); f.midColor.value.copy(u.midColor.value); f.endColor.value.copy(u.endColor.value);
  f.smokeTint.value.copy(u.smokeTint.value);
  f.ambient.value.copy(u.ambient.value);
  f.shadowAbsorption.value = 2.2; f.shadowAmbient.value = 0.15; f.asymmetry.value = 0.35;
  f.heatGain.value = 5;
  volF = gasF.volume({ steps: 64, lift: 0, sceneZ: post.sceneZ });
  volScene.add(volF.mesh);
  heatScene.add(volF.heatMesh);
  // The hot air: a 2D sim in the nozzle plane, after Schlieren candle.
  // 18 x 15 m; 192 x 160 velocity cells, heat four times finer.
  heat2 = createHeat2D({ THREE, TSL, renderer, size: [18, 15], origin: [-10.2, 0], z: NOZ_Z, grid: [192, 160] });
  planeScene.add(heat2.mesh);
  // The volume model runs only with a light in the scene; this one gives none.
  heatScene.add(new THREE.PointLight(0x000000, 0, 1, 2));
  await gas.compile();
  await gasF.compile();
  await heat2.compile();
  await plateReady;
}

// The lens: long, from a standing eye far out on the apron, as Villeneuve shoots scale.
// Wide: the craft sits small in the middle; the far ranges loom behind it in the haze.
// Tight: from the same place, the frame holds the plumes and the pad blast.
const TIGHT_W = 10;
let gasScale = -1;
function frame3() {
  const asp = cssW / cssH;
  const wide = asp < 1 ? 17 : 9;
  const hHalf = Math.atan(Math.tan((wide * Math.PI) / 360) * asp);
  // Landscape stands 150 m off; a tall stage backs off until 30 m of width fits.
  const dist = asp < 1 ? 15 / Math.tan(hHalf) : 150;
  // The tight frame is TIGHT_W metres across at the plumes, 6 m on a tall stage.
  const tw = asp < 1 ? 6 : TIGHT_W;
  const tight = (2 * Math.atan(tw / 2 / dist / asp) * 180) / Math.PI;
  const vfov = wide + (tight - wide) * lens.k;
  camera.fov = vfov;
  // The heat bend grows with the zoom; so does its cap.
  const zoom = wide / vfov;
  post.U.bend.value = 45 * Math.sqrt(zoom) * tune.bendK;
  post.U.bendT.value = 40 * Math.sqrt(zoom) * tune.bendK * tune.heatK;
  post.U.cap.value = 3 * zoom ** 0.75 * tune.capK;
  post.U.tap.value = 3 * zoom;
  // The gas fills the tight frame, so it marches fewer steps there.
  // A change of pass size rebuilds the post chain; the size stays fixed.
  const rs = lens.k > 0.5 ? 1 : 0;
  if (gasScale !== rs) {
    gasScale = rs;
    gas.setSteps(rs ? 40 : D.rung >= 3 ? 44 : 72);
    gasF.setSteps(rs ? 40 : D.rung >= 3 ? 40 : 64);
  }
  camera.aspect = asp;
  camera.updateProjectionMatrix();
  base.set(AIM.x + dist * 0.05, EYE, AIM.z + dist);
}
const base = new THREE.Vector3(0, EYE, 150);

let W = 0, H = 0;
function resize(force = false) {
  if (!ready) return;
  const r = stage.getBoundingClientRect();
  cssW = Math.max(1, r.width); cssH = Math.max(1, r.height);
  const dpr = D.dpr(cssW, cssH);
  const w = Math.round(cssW * dpr), h = Math.round(cssH * dpr);
  if (!force && w === W && h === H) return;
  W = w; H = h;
  renderer.setPixelRatio(dpr);
  renderer.setSize(cssW, cssH, false);
  gasScale = -1;
  post.U.res.value.set(w, h);
  post.U.amp.value = dpr * Math.max(0.6, Math.min(1.4, cssW / 1280));
  post.U.asp.value = cssW / cssH;
  frame3();
  wake();
}

/* ---------- state ---------- */
let clock = 0, lastInput = performance.now(), timeK = 1, shake = 0, flick = 1;
let visible = true, raf = 0, timer = 0, last = 0, frameNo = 0;
let simAcc = 0;
const SIM_DT = 1 / 60;
// The gas runs slow, as Fire's smoke does: heavy rolls, a long-lens feel.
const GAS_K = 0.55;
let gasClock = 0;
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
  const ty = craft.ty + (eng.rpm - eng.base) * 2.4 + (eng.base - BASE0) * 1.2;
  craft.vy += ((ty - craft.y) * 2.2 - craft.vy * 2.4) * live;
  craft.y += craft.vy * live;
  craft.vx += ((craft.tx - craft.x) * 0.9 - craft.vx * 1.6) * live;
  craft.x += craft.vx * live;
  craft.yaw += (clamp(craft.tx * 0.05, -0.22, 0.22) - craft.yaw) * (1 - Math.exp(-live * 1.2));
  // Time for the flame runs while the scene drifts or the hand acts.
  // The hour eases toward the picked time of day.
  const dawning = clockT.step(live);
  if (dawning) applyTime();
  // The lens zooms over about a second.
  const lt = lens.tight ? 1 : 0;
  const zooming = Math.abs(lt - lens.k) > 0.001;
  if (zooming) { lens.k += (lt - lens.k) * (1 - Math.exp(-live / 0.3)); if (Math.abs(lt - lens.k) <= 0.001) lens.k = lt; frame3(); }
  const busy = dawning || zooming || eng.hand || eng.key || eng.blip > 0 || Math.abs(tgt - eng.rpm) > 0.015 || Math.abs(craft.vx) + Math.abs(craft.vy) > 0.006;
  const tdt = busy ? live : amb;
  clock += tdt;
  flick = frozen && !busy ? 1 : 0.92 + 0.08 * Math.sin(clock * 37.0) * Math.sin(clock * 23.0 + 1.3) + 0.04 * Math.sin(clock * 61.0);
  shake = Math.max(0, eng.rpm - 0.8) * (frozen ? 0 : 1);
  pose();
  // The gas steps on a fixed clock, two steps a frame at most.
  simAcc = Math.min(simAcc + tdt, SIM_DT * 2);
  while (simAcc >= SIM_DT) {
    const gk = GAS_K * tune.speedK;
    gasClock = (gasClock + SIM_DT * gk) % 1000;
    gas.u.time.value = gasClock;
    gas.step(SIM_DT * gk);
    gasF.u.time.value = gasClock;
    gasF.step(SIM_DT * gk);
    heat2.step(SIM_DT * gk);
    simAcc -= SIM_DT;
  }
  snd.update(eng.rpm, clamp(craft.x / 8, -1, 1), dt, eng.hand || eng.key || eng.blip > 0);
  return busy;
}

// Hands the Dev values to the post chain and both gas sims.
function applyTune() {
  if (!ready) return;
  const U = post.U;
  U.heatBlur.value = tune.heatBlur; U.gasBlur.value = tune.gasBlur;
  U.vol.value = 0.32 * tune.gasK; U.occ.value = 0.6 * tune.occK;
  post.glow.strength.value = 0.55 * tune.bloom;
  for (const g of [gas, gasF]) {
    // The 2D heat plane makes the shimmer; the volumes no longer do.
    g.u.heatGain.value = 0;
  }
  gasF.u.emitDensity.value = 2000 * tune.exSmoke; gasF.u.emitTemperature.value = 330 * tune.exHeat;
  frame3();
  applyTime();
}

// Hands the hour to the sky, exposure, grade, gas light and plumes.
function applyTime() {
  const k = S.tod(clockT.hour);
  renderer.toneMappingExposure = k.expo * tune.expo;
  post.U.key.value.setRGB(...k.key);
  post.U.pull.value = k.pull;
  gas.u.ambient.value.setRGB(...k.smoke);
  // The exhaust smoke takes more sky light, so its billows read against the plate.
  gasF.u.ambient.value.setRGB(...k.smoke).multiplyScalar(1.8);
  for (const p of P) p.U.gain.value = k.plume;
}

// Places the craft, then the jets, pools and lamps from its nozzles.
function pose() {
  const g = S.craft.grp;
  const bob = frozen ? 0 : Math.sin(clock * 0.9) * 0.05 + Math.sin(clock * 2.3 + 1) * 0.02;
  g.position.set(craft.x, craft.y + bob, 0);
  const roll = clamp(-craft.vx * 0.05, -0.12, 0.12) + (frozen ? 0 : Math.sin(clock * 0.7) * 0.006);
  const pitch = 0.035 + (frozen ? 0 : Math.sin(clock * 0.53 + 2) * 0.006);
  g.rotation.set(roll, YAW0 + craft.yaw, pitch, 'YZX');
  g.updateMatrixWorld(true);
  axis.set(0, -1, 0).transformDirection(g.matrixWorld);
  const pts = [NOZ[0], NOZ[1], FAN];
  const thr = eng.rpm * flick;
  const u = gas.u;
  jets.forEach((j, i) => {
    j.n.copy(pts[i]).applyMatrix4(g.matrixWorld);
    j.a.copy(axis);
    const lenG = j.n.y / Math.max(0.2, -axis.y);
    j.c.copy(j.n).addScaledVector(axis, lenG);
    const len = Math.min(lenG, JET_MAX);
    const p = P[i];
    p.U.thr.value = i === 2 ? eng.rpm : thr;
    p.U.time.value = clock;
    p.lay(j.n, axis, len, camera.position);
    // The gas: each jet drives its core down; the hot ones heat it.
    u.jetP[i].value.copy(j.n);
    u.jetA[i].value.set(axis.x, axis.y, axis.z, len);
    u.jetK[i].value.set((i === 2 ? 9 : 16) * (0.35 + 0.75 * eng.rpm), i === 2 ? 0 : (6 + 26 * eng.rpm) * flick, (i === 2 ? 1.2 : 11) * (0.4 + eng.rpm), i === 2 ? 0.75 : 0.5);
    // The exhaust sim takes the same jets; the steam stays in the big one.
    gasF.u.jetP[i].value.copy(j.n);
    gasF.u.jetA[i].value.copy(u.jetA[i].value);
    gasF.u.jetK[i].value.copy(u.jetK[i].value).setZ(0);
    // The 2D heat plane takes the two hot jets.
    if (i < 2) heat2.setJet(i, j.n, axis, len, u.jetK[i].value.x, (0.55 + 0.45 * thr) * flick);
    // The apron: a hot pool under each nozzle; the fan's pool is cold.
    const hot = i === 2 ? 0 : (0.25 + 1.5 * thr * thr) * clamp(1.4 - j.n.y / 10, 0.3, 1);
    S.U.hot[i].value.set(j.c.x, 0, j.c.z, hot);
    S.U.noz[i].value.set(j.n.x, j.n.y, j.n.z, i === 2 ? 0 : 2 + 6 * thr);
  });
  // Lamps: one under each nozzle, one bounce off the apron; the gas has its own twins.
  for (let i = 0; i < 2; i++) {
    S.lamps[i].position.copy(jets[i].n).addScaledVector(axis, 0.7);
    S.lamps[i].intensity = (3 + 16 * thr) * flick;
  }
  tmp.copy(jets[0].c).add(jets[1].c).multiplyScalar(0.5);
  S.lamps[2].position.set(tmp.x, 0.6, tmp.z + 0.6);
  S.lamps[2].intensity = (2 + 14 * thr * thr) * flick;
  for (let i = 0; i < 3; i++) { volLamps[i].position.copy(S.lamps[i].position); volLamps[i].intensity = S.lamps[i].intensity * 0.9; }
  S.craft.uGlow.value = (0.5 + 1.6 * thr) * flick;
  u.lightPos.value.set(tmp.x, 0.8, tmp.z);
  gasF.u.lightPos.value.copy(u.lightPos.value);
  // The emitter points ride with the craft.
  gasF.u.emitMatrix.value.copy(g.matrixWorld);
  gasF.u.emitGain.value = 0.5 + 0.6 * thr;
}

function render() {
  // The tight lens magnifies the shake and the sway; they shrink with it.
  const calm = 1 - 0.75 * lens.k;
  const sh = shake * 0.4 * calm;
  const sway = frozen ? 0 : calm;
  camera.position.set(
    base.x + craft.x * 0.2 + Math.sin(clock * 0.21) * 0.25 * sway + (Math.random() - 0.5) * sh,
    base.y + Math.sin(clock * 0.17 + 1) * 0.04 * sway + (Math.random() - 0.5) * sh * 0.5,
    base.z,
  );
  // Wide aims past the craft; tight aims at the midpoint of the two hot pools.
  const px = (S.U.hot[0].value.x + S.U.hot[1].value.x) / 2, pz = (S.U.hot[0].value.z + S.U.hot[1].value.z) / 2;
  const k = lens.k;
  camera.lookAt(
    AIM.x + craft.x * 0.7 + (px - AIM.x - craft.x * 0.7) * k,
    AIM.y + (craft.y - HOVER_Y) * 0.5 + (2.4 - AIM.y - (craft.y - HOVER_Y) * 0.5) * k,
    AIM.z + (pz - AIM.z) * k,
  );
  post.U.time.value = clock;
  post.U.seed.value = frozen ? 0 : frameNo % 97;
  post.U.grain.value = frozen ? 0 : tune.grain;
  // With the renderer's loop stopped, each frame ticks the node clock by hand.
  renderer._animation.nodes.nodeFrame.update();
  post.pipe.render();
}

/* ---------- frame loop ---------- */
// Lively while the hand acts or the engine spools; the hover drifts at 30 fps.
function frame(now) {
  raf = 0;
  const t0 = performance.now();
  if (!visible || !ready) return;
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
  if (raf || timer || !visible || !ready) return;
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
// The emitter follows the pointer in the plane of the nozzles.
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), hit = new THREE.Vector3();
const nozPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -NOZ_Z);
function steer(x, y) {
  ndc.set((x / cssW) * 2 - 1, 1 - (y / cssH) * 2);
  ray.setFromCamera(ndc, camera);
  if (!ray.ray.intersectPlane(nozPlane, hit)) return;
  craft.tx = clamp(hit.x + 1.0, -5, 5);
  // The nozzles run from 2 m to 14 m over the pad.
  craft.ty = clamp(hit.y + NOZ_DY, 2 + NOZ_DY, 14 + NOZ_DY);
}
stage.addEventListener('pointerdown', e => {
  if (e.button !== 0 || !ready || (e.target !== renderer.domElement && e.target !== stage)) return;
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
  steer(p[0], p[1]);
  touch();
});
function end(e) {
  if (!down || (e && e.pointerId !== pid)) return;
  clearTimeout(holdT);
  down = false; pid = null; eng.hand = false;
  // A tap: a short burst of throttle, then back to the hover.
  if (!moved && !held) eng.blip = Math.max(0, 0.4 - (performance.now() - pressT) / 1000);
  // The emitter stays where the hand left it.
  touch();
}
['pointerup', 'pointercancel', 'lostpointercapture'].forEach(t => stage.addEventListener(t, end));
function keyBurn(on) {
  if (!ready || on === eng.key) return;
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
if (new URLSearchParams(location.search).has('qa')) globalThis.__jet = { eng, craft, tune, applyTune: () => applyTune(), plumes: () => P, gas: () => gas, gasF: () => gasF, post: () => post, renderer: () => renderer, D, get frames() { return frameNo; } };

mark('build');
try {
  await setup();
  ready = true;
  // The craft stays hidden for now; the emitter works alone.
  S.craft.grp.visible = false;
  applyTune();
  resize(true);
  // The gas runs for five seconds, so the first frame is a picture.
  for (let i = 0; i < Math.round(300 / GAS_K); i++) step(1 / 60);
  await renderer.compileAsync(S.scene, camera);
  render();
  render();
  renderer.domElement.classList.add('on');
  mark('first-frame');
  wake();
} catch (err) {
  console.error(err);
  ready = false;
  fail.removeAttribute('hidden');
  ui.hideControls?.();
  mark('first-frame');
}
void introDone;
