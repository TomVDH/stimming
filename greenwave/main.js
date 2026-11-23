// Green wave: one avenue at night, ten sets of signals in a row.
// The Offset slider sets how late each signal starts its green after the one before.
// Right: groups of cars glide through on green. Wrong: stop-and-go and brake lights.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { initPage, whenVisible, pageReady, stage as mark, reduced, onReducedChange, audioKit, sound } from '../shared/stim.js';
import { intro as playIntro } from '../shared/intro.js';
import { detail } from '../shared/detail.js';
import { makeSim, IDEAL, CYCLE, LANES, LANE_W, CROSS_W, stopZ, MAX_CARS, MAX_SIDE } from './sim.js';
import { buildScene, MAX_STREAKS } from './scene.js';
import { makeSound } from './sound.js';
mark('libs');

const ID = 'greenwave';
const stage = document.getElementById('stage');
const fail = stage.querySelector('.fail');
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const saved = k => { try { return localStorage.getItem(`stimming.${ID}.${k}`); } catch { return null; } };
const save = (k, v) => { try { localStorage.setItem(`stimming.${ID}.${k}`, String(v)); } catch { /* storage is optional */ } };
const qa = new URLSearchParams(location.search).has('qa');
let calm = reduced();

/* ---------- state ---------- */
const sim = makeSim();
const offSaved = Number(saved('offset')), flowSaved = Number(saved('flow'));
sim.offset = saved('offset') != null && Number.isFinite(offSaved) ? clamp(offSaved, 0, CYCLE) : IDEAL;
if (saved('flow') != null && Number.isFinite(flowSaved)) sim.flow = clamp(flowSaved, 0, 1);
const HALF = LANES * LANE_W / 2;
const laneX = l => -HALF + (l + 0.5) * LANE_W;

/* ---------- bar ---------- */
const ui = initPage({ id: ID, bar: {
  actions: [
    { verb: 'wave', label: 'Wave', key: 'W', onPress: () => setOffset(IDEAL, true) },
  ],
  slider: { label: 'Offset', min: 0, max: CYCLE, step: 0.5, value: sim.offset, onInput: v => setOffset(v, false) },
  settings: [
    { type: 'slider', id: 'flow', label: 'Traffic', min: 0, max: 1, step: 0.01, value: sim.flow, onInput: v => { sim.flow = v; save('flow', v); touch(); } },
  ],
  quality: true,
  keys: [['click', 'brake'], ['hold', 'stop'], ['W', 'wave']],
  help: [
    ['click', 'Tap a car to brake it hard'],
    ['hold', 'Hold a car to keep it stopped'],
    ['W', 'Press W to time the signals for a green wave'],
  ],
} });
const introDone = playIntro({ ready: pageReady() });
const kit = audioKit({ keys: new Set(['w', 'W']), sleepMs: 1500 });
const snd = makeSound(kit);
snd.onQuiet = () => { if (!raf && !timer) kit.rest(() => !raf && !timer && !snd.busy); };
function setOffset(v, fromKey) {
  sim.offset = v;
  save('offset', v);
  if (fromKey) { ui.slider?.set(v); snd.swell(); }
  touch();
}

/* ---------- three ---------- */
let renderer = null, composer = null, bloom = null, grade = null, S = null, camera = null;
let cssW = 1, cssH = 1;
const D = detail({ maxDpr: 1.5, budget: 2.2e6, steps: 3, settle: 2, onChange: () => resize(true) });
const GRADE = {
  uniforms: { tDiffuse: { value: null }, uGrain: { value: 0 } },
  vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse;
    uniform float uGrain;
    varying vec2 vUv;
    float h(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main() {
      vec3 c = texture2D(tDiffuse, vUv).rgb;
      vec2 q = vUv - 0.5;
      c *= 1.0 - 0.5 * dot(q * vec2(1.0, 1.2), q * vec2(1.0, 1.2));
      float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
      c += vec3(-0.002, 0.0, 0.008) * (1.0 - smoothstep(0.0, 0.2, l));
      c += (h(vUv * 911.0 + uGrain) - 0.5) * 0.008 * (0.3 + c);
      gl_FragColor = vec4(max(c, 0.0), 1.0);
    }`,
};
async function setup() {
  renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
  const ext = renderer.extensions;
  if (!ext.has('EXT_color_buffer_float') && !ext.has('EXT_color_buffer_half_float')) throw new Error('no float targets');
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  const canvas = renderer.domElement;
  canvas.setAttribute('aria-hidden', 'true');
  stage.append(canvas);
  camera = new THREE.PerspectiveCamera(30, 1.6, 1, 4000);
  S = buildScene();
  const rt = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 });
  composer = new EffectComposer(renderer, rt);
  composer.addPass(new RenderPass(S.scene, camera));
  bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.7, 0.55, 0.85);
  composer.addPass(bloom);
  grade = new ShaderPass(GRADE);
  composer.addPass(grade);
  composer.addPass(new OutputPass());
  canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); halt(); });
  canvas.addEventListener('webglcontextrestored', () => wake());
  if (qa) globalThis.__gw = { sim, S, camera, run: s => { for (let t = 0; t < s; t += 0.1) step(0.1); upload(); render(); } };
}

/* ---------- the shot ---------- */
// High behind the traffic, a long lens down the avenue; a tall stage widens the lens.
function frame3() {
  if (!camera) return;
  const asp = cssW / cssH, k = clamp((1.5 - asp) / 1.0, 0, 1);
  camera.fov = 15 + 28 * k;
  camera.aspect = asp;
  camera.position.set(1.5 - k, 58 - 8 * k, 210 - 110 * k);
  camera.lookAt(0, -4, -400 + 160 * k);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld();
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
  const bk = D.rung >= 2 ? 0.25 : 0.5;
  bloom.resolution.set(Math.round(w * bk), Math.round(h * bk));
  frame3();
  wake();
}

/* ---------- drawing ---------- */
const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), V = new THREE.Vector3(), SC = new THREE.Vector3(), UP = new THREE.Vector3(0, 1, 0);
const C = new THREE.Color();
const RED = new THREE.Color(1, 0.04, 0.02), WARM = new THREE.Color(1, 0.88, 0.7);
const LIGHT = [new THREE.Color(1, 0.09, 0.03), new THREE.Color(1, 0.5, 0.02), new THREE.Color(0.15, 1, 0.45)];
let frameNo = 0, nStreak = 0, nPool = 0;
const streak = (x, z, w, len, c, k) => {
  if (nStreak >= MAX_STREAKS) return;
  M.compose(V.set(x, 0.015, z), Q.identity(), SC.set(w, 1, len));
  S.streaks.setMatrixAt(nStreak, M);
  S.streaks.setColorAt(nStreak, C.copy(c).multiplyScalar(k));
  nStreak++;
};
const pool = (x, z, w, d, c, k) => {
  if (nPool >= 400) return;
  M.compose(V.set(x, 0.012, z), Q.identity(), SC.set(w, 1, d));
  S.pools.setMatrixAt(nPool, M);
  S.pools.setColorAt(nPool, C.copy(c).multiplyScalar(k));
  nPool++;
};
function upload() {
  nStreak = 0; nPool = 0;
  for (const s of S.still) s.pool ? pool(s.x, s.z, s.w, s.w, s.c, 1) : streak(s.x, s.z, s.w, s.len, s.c, 1);
  // Signals: one lamp lit per head; its colour runs down the wet road toward you.
  for (const sig of S.signals) {
    const L = sim.light(sig.i);
    sig.mats.forEach((m, k) => m.color.copy(LIGHT[k]).multiplyScalar(k === L ? 5 : 0.04));
    for (let l = 0; l < LANES; l++) {
      sig.sprites[l].material.color.copy(LIGHT[L]).multiplyScalar(0.9);
      sig.sprites[l].position.y = 6.15 + [0.38, 0, -0.38][L];
      streak(laneX(l), stopZ(sig.i) - CROSS_W - 2.3, 0.9, 42, LIGHT[L], 0.75);
    }
  }
  let n = 0, t = 0;
  const putCar = (x, z, yaw, c) => {
    Q.setFromAxisAngle(UP, yaw);
    M.compose(V.set(x, 0, z), Q, SC.set(1, 1, c.len / 4.4));
    S.cars.setMatrixAt(n, M);
    S.cars.setColorAt(n, S.PAINT[c.paint]);
    n++;
  };
  const putTail = (x, y, z, yaw, k) => {
    Q.setFromAxisAngle(UP, yaw);
    M.compose(V.set(x, y, z), Q, SC.set(1, 1, 1));
    S.tails.setMatrixAt(t, M);
    S.tails.setColorAt(t, C.copy(RED).multiplyScalar(k));
    t++;
  };
  for (const c of sim.cars()) {
    if (n >= MAX_CARS) break;
    const x = laneX(c.lane), back = c.z + c.len / 2;
    putCar(x, c.z, 0, c);
    const k = (1.2 + 7 * c.lamp) * c.fade;
    for (const s of [-0.66, 0.66]) {
      putTail(x + s, 0.78, back + 0.02, 0, k);
      streak(x + s, back + 0.1, 0.4, 7 + 7 * c.lamp, RED, (0.22 + 0.6 * c.lamp) * c.fade);
    }
    // The headlights light the wet road ahead of the car.
    pool(x, c.z - c.len / 2 - 7, 3.2, 12, WARM, 0.1 * c.fade);
  }
  for (const c of sim.side) {
    if (n >= MAX_CARS + MAX_SIDE) break;
    const zc = stopZ(c.i) - CROSS_W / 2 - 2 + c.dir * 1.9;
    putCar(c.x, zc, -c.dir * Math.PI / 2, c);
    const k = (1 + 7 * c.lamp) * c.fade;
    for (const s of [-0.66, 0.66]) putTail(c.x - c.dir * (c.len / 2 + 0.02), 0.78, zc + s, -c.dir * Math.PI / 2 + Math.PI, k);
    pool(c.x + c.dir * (c.len / 2 + 7), zc, 12, 3.2, WARM, 0.1 * c.fade);
  }
  S.cars.count = n; S.tails.count = t;
  S.streaks.count = nStreak; S.pools.count = nPool;
  for (const m of [S.cars, S.tails, S.streaks, S.pools]) { m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; }
}
function render() {
  grade.uniforms.uGrain.value = calm ? 0 : frameNo % 97;
  composer.render();
}

/* ---------- simulation ---------- */
let lastInput = performance.now(), timeK = 1;
const tmp = new THREE.Vector3();
const panX = (x, y, z) => { tmp.set(x, y, z).project(camera); return clamp(tmp.x, -1, 1); };
function step(dt) {
  sim.step(dt);
  const ev = sim.takeEvents().filter(e => e.z > -360 && e.hard > 0.2).slice(0, 3);
  if (ev.length) snd.brakes(ev.map(e => ({ pan: panX(laneX(e.lane), 0, e.z), hard: e.hard * clamp(1 - (90 - e.z) / 500, 0.2, 1) })));
  let v = 0, k = 0;
  for (const c of sim.cars()) if (c.z > -500) { v += c.v; k++; }
  snd.drive(v / Math.max(1, k) * 0.75, k / 2.5, timeK);
}

/* ---------- frame loop ---------- */
let visible = true, raf = 0, timer = 0, last = 0, started = false;
function frame(now) {
  raf = 0;
  if (!visible || !renderer || !started) return;
  const entry = performance.now();
  const dt = Math.max(0, Math.min(0.05, (now - last) / 1000));
  last = Math.max(last, now);
  let again = true, lively = true;
  try {
    const idle = (now - lastInput) / 1000;
    const limit = calm ? 30 : 60;
    timeK = idle < limit ? 1 : Math.max(0, 1 - (idle - limit) / 2);
    const sdt = dt * timeK * timeK * (3 - 2 * timeK);
    if (sdt > 0) step(sdt);
    upload();
    render();
    D.frame(dt);
    frameNo++;
    lively = idle < 3 || pointer.id !== null;
    again = timeK > 0;
  } finally {
    if (!again) { snd.drive(0, 0, 0); kit.rest(() => !raf && !timer && !snd.busy); }
    else schedule(lively ? 0 : Math.max(0, 31 - (performance.now() - entry)));
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

/* ---------- pointer: tap brakes a car, hold keeps it stopped ---------- */
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
function carAt(clientX, clientY) {
  const r = stage.getBoundingClientRect();
  ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  const o = ray.ray.origin, d = ray.ray.direction;
  if (d.y > -1e-4) return null;
  // Meet a plane at roof height, so a tap on the car body counts.
  const s = (0.9 - o.y) / d.y, x = o.x + d.x * s, z = o.z + d.z * s;
  let best = null, bd = 3 + Math.max(0, 60 - z) * 0.012;
  for (const c of sim.cars()) {
    const dd = Math.hypot((x - laneX(c.lane)) * 1.5, z - c.z);
    if (dd < bd + c.len / 2) { bd = dd - c.len / 2; best = c; }
  }
  return best;
}
const pointer = { id: null, car: -1, held: false, timer: 0 };
stage.addEventListener('pointerdown', e => {
  if (e.button !== 0 || !renderer || pointer.id !== null || (e.target !== renderer.domElement && e.target !== stage)) return;
  const c = carAt(e.clientX, e.clientY);
  touch();
  if (!c) return;
  try { stage.setPointerCapture(e.pointerId); } catch { /* capture is optional */ }
  Object.assign(pointer, { id: e.pointerId, car: c.id, held: false });
  sim.brake(c.id, true);
  snd.stop(panX(laneX(c.lane), 0, c.z));
  pointer.timer = setTimeout(() => { pointer.timer = 0; if (pointer.id !== null) pointer.held = true; }, 260);
});
function endPointer(e) {
  if (e.pointerId !== pointer.id) return;
  clearTimeout(pointer.timer);
  sim.release(pointer.car);
  pointer.id = null; pointer.car = -1; pointer.held = false;
  touch();
}
['pointerup', 'pointercancel', 'lostpointercapture'].forEach(t => stage.addEventListener(t, endPointer));
stage.addEventListener('pointermove', e => {
  if (e.pointerType !== 'mouse' || !camera || pointer.id !== null) return;
  stage.style.cursor = carAt(e.clientX, e.clientY) ? 'pointer' : '';
});

/* ---------- life cycle ---------- */
whenVisible(stage, on => {
  visible = on;
  if (on) { last = performance.now(); schedule(0); }
  else { halt(); snd.quiet(); }
});
onReducedChange(on => { calm = on; touch(); });
sound.onChange(on => { if (on) touch(); });
new ResizeObserver(() => resize()).observe(stage);

mark('build');
try {
  await setup();
  resize(true);
  upload();
  render();
  renderer.domElement.classList.add('on');
  mark('first-frame');
  await introDone;
  started = true;
  if (!calm) touch();
} catch (err) {
  console.error(err);
  fail.removeAttribute('hidden');
  ui.hideControls?.();
}
addEventListener('pagehide', () => { halt(); composer?.dispose?.(); renderer?.dispose(); });
