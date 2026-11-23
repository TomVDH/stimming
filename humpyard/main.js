// Hump yard: a shunting yard at night under floodlights.
// A shunter pushes a train over the hump; each cut uncouples at the crest and rolls free.
// Throw the points to send it to one of eight tracks; retarders squeal, couplers clank.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { initPage, whenVisible, pageReady, stage as mark, reduced, onReducedChange, audioKit, sound } from '../shared/stim.js';
import { intro as playIntro } from '../shared/intro.js';
import { detail } from '../shared/detail.js';
import { makeSim, TYPES } from './sim.js';
import { buildScene, MAX_WAGONS, TRACK_HUE } from './scene.js';
import { heightAt, FAN_END, TRACKS, trackX, MASTER } from './yard.js';
import { makeSound } from './sound.js';
mark('libs');

const ID = 'humpyard';
const stage = document.getElementById('stage');
const fail = stage.querySelector('.fail');
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const saved = k => { try { return localStorage.getItem(`stimming.${ID}.${k}`); } catch { return null; } };
const save = (k, v) => { try { localStorage.setItem(`stimming.${ID}.${k}`, String(v)); } catch { /* storage is optional */ } };
const qa = new URLSearchParams(location.search).has('qa');
let calm = reduced();

/* ---------- state ---------- */
const sim = makeSim();
const pushSaved = Number(saved('push'));
let pushV = saved('push') != null && Number.isFinite(pushSaved) ? clamp(pushSaved, 0, 1) : 0.5;
// The slider maps 0 to 1 onto a push of 0.8 to 3 m/s.
const pushOf = v => 0.8 + 2.2 * v;
sim.push = pushOf(pushV);
sim.auto = saved('auto') !== '0';
// Run the first train part way, so the first frame shows cuts on the tracks.
for (let k = 0; k < 900; k++) sim.step(0.1);
sim.takeEvents();

// Paint for each type: six choices each.
const PAINT = [
  [0x6b2a1a, 0x2f4a5a, 0x5a5048, 0x7a3b1c, 0x3d5233, 0x8a8a84],
  [0x7a7468, 0x9a7a3a, 0x5c5850, 0x3a4a5a, 0x6a3020, 0x888070],
  [0x161616, 0xd8d8d0, 0x7a7a78, 0x203048, 0x1c1c1c, 0xb0b0a8],
  [0x1e5aa8, 0xb02a20, 0x2a7040, 0xd07020, 0xd0d0c8, 0x6a2a6a],
].map(row => row.map(c => new THREE.Color(c)));

/* ---------- bar ---------- */
const ui = initPage({ id: ID, bar: {
  actions: [
    { verb: 'auto', label: 'Auto', key: 'A', onPress: () => setAuto(!sim.auto) },
  ],
  slider: { label: 'Hump speed', min: 0, max: 1, step: 0.01, value: pushV, onInput: v => { pushV = v; sim.push = pushOf(v); save('push', v); touch(); } },
  quality: true,
  keys: [['click', 'throw'], ['1-8', 'route'], ['A', 'auto']],
  help: [
    ['click', 'Click a switch to throw it, or a track to route the next cut there'],
    ['1-8', 'Press 1 to 8 to route the next cut to that track'],
    ['A', 'Press A to let the yard throw the points for you'],
  ],
} });
const introDone = playIntro({ ready: pageReady() });
const kit = audioKit({ keys: new Set(['a', 'A', '1', '2', '3', '4', '5', '6', '7', '8']), sleepMs: 1500 });
const snd = makeSound(kit);
snd.onQuiet = () => { if (!raf && !timer) kit.rest(() => !raf && !timer && !snd.busy); };
function setAuto(on) {
  sim.auto = on;
  save('auto', on ? 1 : 0);
  showAuto();
  touch();
}
function showAuto() {
  document.querySelectorAll('[aria-keyshortcuts="A"]').forEach(b => b.setAttribute('aria-pressed', String(sim.auto)));
}
addEventListener('keydown', e => {
  if (e.repeat || e.ctrlKey || e.metaKey || e.altKey || document.querySelector('.s3-sheet:not([hidden])')) return;
  const k = Number(e.key);
  if (k >= 1 && k <= TRACKS) { route(k - 1); e.preventDefault(); }
});

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
      c *= 1.0 - 0.45 * dot(q * vec2(1.0, 1.25), q * vec2(1.0, 1.25));
      // Shadows lean blue, as under sodium light at night.
      float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
      c += vec3(-0.003, 0.0, 0.007) * (1.0 - smoothstep(0.0, 0.2, l));
      c += (h(vUv * 911.0 + uGrain) - 0.5) * 0.008 * (0.3 + c);
      gl_FragColor = vec4(max(c, 0.0), 1.0);
    }`,
};

async function setup() {
  renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
  const ext = renderer.extensions;
  if (!ext.has('EXT_color_buffer_float') && !ext.has('EXT_color_buffer_half_float')) throw new Error('no float targets');
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const canvas = renderer.domElement;
  canvas.setAttribute('aria-hidden', 'true');
  stage.append(canvas);
  camera = new THREE.PerspectiveCamera(38, 1.6, 1, 2000);
  S = buildScene(sim.yard);
  const rt = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 });
  composer = new EffectComposer(renderer, rt);
  composer.addPass(new RenderPass(S.scene, camera));
  bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.55, 0.5, 0.92);
  composer.addPass(bloom);
  grade = new ShaderPass(GRADE);
  composer.addPass(grade);
  composer.addPass(new OutputPass());
  canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); halt(); });
  canvas.addEventListener('webglcontextrestored', () => wake());
  if (qa) globalThis.__hy = { sim, S, camera, frame: f => { for (let i = 0; i < f; i++) frame(performance.now()); }, run: s => { for (let t = 0; t < s; t += 0.1) step(0.1); render(); } };
}

/* ---------- the shot ---------- */
// High behind the hump, looking down the fan; a tall stage stands further back.
function frame3() {
  if (!camera) return;
  const asp = cssW / cssH, k = clamp((1.5 - asp) / 1.0, 0, 1);
  camera.fov = 34 + 28 * k;
  camera.aspect = asp;
  camera.position.set(-5 + 5 * k, 36 + 14 * k, 26 + 22 * k);
  camera.lookAt(0, -6, -132 + 22 * k);
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
  S.sparkMat.uniforms.uPx.value = dpr * h / 900;
  renderer.shadowMap.enabled = D.rung < 3;
  frame3();
  wake();
}

/* ---------- drawing ---------- */
const M = new THREE.Matrix4(), M2 = new THREE.Matrix4(), V = new THREE.Vector3(), T = new THREE.Vector3(), UP = new THREE.Vector3(0, 1, 0);
const WHITE = new THREE.Color(1, 1, 1), C = new THREE.Color();
let frameNo = 0;
// Builds a wagon's matrix: its local +z points back along the track.
function wagonMatrix(w, out) {
  V.set(w.x, w.y + 0.02, w.z);
  T.set(w.x + w.hx, w.y + w.hy + 0.02, w.z + w.hz);
  out.lookAt(V, T, UP);
  out.setPosition(V);
  return out;
}
const routeGlow = new Float32Array(64);
function upload(dt) {
  const counts = [0, 0, 0, 0];
  let plates = 0;
  for (const w of sim.wagons) {
    const f = S.fleets[w.type], i = counts[w.type]++;
    if (i >= MAX_WAGONS) continue;
    wagonMatrix(w, M);
    f.setMatrixAt(i, M);
    f.setColorAt(i, PAINT[w.type][w.paint]);
    if (plates < MAX_WAGONS) {
      M2.makeTranslation(0, 1.75, w.len / 2 + 0.32);
      S.plates.setMatrixAt(plates, M.clone().multiply(M2));
      C.copy(TRACK_HUE[w.dest]).multiplyScalar(2.2);
      S.plates.setColorAt(plates, C);
      plates++;
    }
  }
  S.fleets.forEach((f, k) => { f.count = Math.min(MAX_WAGONS, counts[k]); f.instanceMatrix.needsUpdate = true; if (f.instanceColor) f.instanceColor.needsUpdate = true; });
  S.plates.count = plates;
  S.plates.instanceMatrix.needsUpdate = true;
  if (S.plates.instanceColor) S.plates.instanceColor.needsUpdate = true;
  const L = sim.loco;
  S.loco.visible = !!L;
  S.locoLamps.forEach(l => { l.mesh.visible = !!L; });
  if (L) {
    wagonMatrix(L, M);
    S.loco.matrixAutoUpdate = false;
    S.loco.matrix.copy(M);
    S.locoLamps.forEach((l, i) => {
      V.set(i ? 0.8 : -0.8, 2.1, L.len / 2 + 0.1).applyMatrix4(M);
      l.mesh.position.copy(V);
    });
  }
  // The route the next cut will take: its rails glow a little.
  const want = new Set();
  let s = sim.yard.lead;
  while (s) { want.add(s.id); s = s.kids.length ? s.kids[s.sw] : null; }
  S.rails.forEach((m, i) => {
    routeGlow[i] += ((want.has(i) ? 1 : 0) - routeGlow[i]) * Math.min(1, dt * 6);
    m.material.emissiveIntensity = 0.22 * routeGlow[i];
  });
  sim.yard.switches.forEach((sw, i) => {
    const [a, b] = S.swLamps[i];
    const lit = sw.locked ? 0.5 : 1.2;
    a.set(0xfff4e0, sw.seg.sw === 0 ? lit : 0.06);
    b.set(0xfff4e0, sw.seg.sw === 1 ? lit : 0.06);
  });
  const tr = sim.train;
  S.signal.set(tr && !tr.red && tr.list.length ? 0x30ff70 : 0xff2a10, 1);
}

// Sparks fly where a retarder grips.
const sparks = [];
function stepSparks(dt) {
  let grip = 0;
  for (const w of sim.wagons) {
    if (!w.brake || calm) continue;
    if (w.z < MASTER[0] && w.z > MASTER[1]) grip += w.brake;
    const n = Math.min(12, Math.floor(w.brake * dt * 260 + Math.random()));
    for (let k = 0; k < n && sparks.length < 900; k++) {
      const side = Math.random() < 0.5 ? -1 : 1, along = (Math.random() - 0.5) * w.len * 0.8;
      sparks.push({
        x: w.x + side * 0.75 + w.hx * along, y: w.y + 0.25, z: w.z + w.hz * along,
        vx: side * (1 + Math.random() * 3.5), vy: 1 + Math.random() * 3.2, vz: w.hz * w.v * (0.4 + Math.random() * 0.6) + (Math.random() - 0.5) * 2,
        life: 1, rate: 1.6 + Math.random() * 2.2,
      });
    }
  }
  for (const p of sparks) {
    p.vy -= 9.8 * dt;
    p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
    const floor = heightAt(p.z) - 0.2;
    if (p.y < floor) { p.y = floor; p.vy *= -0.3; p.vx *= 0.5; p.vz *= 0.5; }
    p.life -= p.rate * dt;
  }
  for (let i = sparks.length - 1; i >= 0; i--) if (sparks[i].life <= 0) { sparks[i] = sparks[sparks.length - 1]; sparks.pop(); }
  const P = S.sp, Lf = S.sl;
  for (let i = 0; i < 900; i++) {
    const p = sparks[i];
    if (p) { P[i * 3] = p.x; P[i * 3 + 1] = p.y; P[i * 3 + 2] = p.z; Lf[i] = p.life; } else Lf[i] = 0;
  }
  S.sparks.geometry.attributes.position.needsUpdate = true;
  S.sparks.geometry.attributes.life.needsUpdate = true;
  S.sparks.geometry.setDrawRange(0, Math.max(1, sparks.length));
  S.gripLight.intensity = grip > 0 ? (30 + 40 * Math.random()) * Math.min(1.5, grip) : 0;
}

function render() {
  grade.uniforms.uGrain.value = calm ? 0 : frameNo % 97;
  composer.render();
}

/* ---------- simulation ---------- */
let lastInput = performance.now(), timeK = 1;
const tmp = new THREE.Vector3();
const panX = (x, y, z) => { tmp.set(x, y, z).project(camera); return clamp(tmp.x, -1, 1); };
const distTo = (x, y, z) => camera.position.distanceTo(tmp.set(x, y, z));
function step(dt) {
  sim.step(dt);
  let grip = 0, gx = 0, gy = 0, gz = 0;
  for (const e of sim.takeEvents()) {
    if (e.type === 'clank') snd.clank(distTo(e.x, e.y, e.z), panX(e.x, e.y, e.z), e.k, e.buffer);
    else if (e.type === 'throw') snd.thump(distTo(e.x, e.y, e.z), panX(e.x, e.y, e.z));
    else if (e.type === 'uncouple') snd.hiss(distTo(e.x, e.y, e.z), panX(e.x, e.y, e.z));
    else if (e.type === 'squeal' && e.k > grip) { grip = e.k; gx = e.x; gy = e.y; gz = e.z; }
  }
  if (grip > 0 || snd.busy) snd.squeal(grip ? distTo(gx, gy, gz) : 60, grip ? panX(gx, gy, gz) : 0, grip);
  const L = sim.loco;
  snd.drive(L ? 0.8 : 0, L ? clamp(Math.abs(L.v) / 3, 0, 1) : 0);
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
    stepSparks(sdt);
    upload(dt);
    render();
    D.frame(dt);
    frameNo++;
    lively = idle < 3 || sparks.length > 0;
    again = timeK > 0 || sparks.length > 0;
  } finally {
    if (!again) { snd.quiet(); kit.rest(() => !raf && !timer && !snd.busy); }
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

/* ---------- gestures: a switch throws; a track takes the next cut ---------- */
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
function groundPoint(clientX, clientY) {
  const r = stage.getBoundingClientRect();
  ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  const o = ray.ray.origin, d = ray.ray.direction;
  if (d.y > -1e-3) return null;
  // Two passes: meet a flat plane, then the bank's height there.
  let y = 1;
  let s = (y - o.y) / d.y;
  for (let k = 0; k < 3; k++) { y = heightAt(o.z + d.z * s); s = (y - o.y) / d.y; }
  return { x: o.x + d.x * s, z: o.z + d.z * s };
}
function route(k) {
  sim.routeTo(k);
  touch();
}
stage.addEventListener('pointerdown', e => {
  if (e.button !== 0 || !renderer || (e.target !== renderer.domElement && e.target !== stage)) return;
  const p = groundPoint(e.clientX, e.clientY);
  if (!p) return;
  touch();
  // The nearest switch within reach, scaled for the distance.
  let best = -1, bd = 7 + Math.max(0, -p.z - 60) * 0.04;
  sim.yard.switches.forEach((sw, i) => { const d = Math.hypot(p.x - sw.x, (p.z - sw.z) * 0.6); if (d < bd) { bd = d; best = i; } });
  if (best >= 0) { sim.throwSwitch(best); return; }
  if (p.z < FAN_END + 15) {
    let k = 0, kd = 1e9;
    for (let j = 0; j < TRACKS; j++) { const d = Math.abs(p.x - trackX(j)); if (d < kd) { kd = d; k = j; } }
    if (kd < 6) route(k);
  }
});
stage.addEventListener('pointermove', e => {
  if (e.pointerType !== 'mouse' || !camera) return;
  const p = groundPoint(e.clientX, e.clientY);
  const near = p && (sim.yard.switches.some(sw => Math.hypot(p.x - sw.x, (p.z - sw.z) * 0.6) < 7 + Math.max(0, -p.z - 60) * 0.04) || (p.z < FAN_END + 15 && p.z > -340 && Math.abs(p.x) < 20));
  stage.style.cursor = near ? 'pointer' : '';
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
  upload(1);
  render();
  renderer.domElement.classList.add('on');
  mark('first-frame');
  await introDone;
  started = true;
  showAuto();
  if (calm) { render(); } else touch();
} catch (err) {
  console.error(err);
  fail.removeAttribute('hidden');
  ui.hideControls?.();
}
addEventListener('pagehide', () => { halt(); S?.dispose(); composer?.dispose?.(); renderer?.dispose(); });
