// Volcano: a cone at blue hour. Hold to build pressure; let go and it erupts.
// The flash comes first; the boom, the roar and the thunder arrive late, by distance.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { initPage, whenVisible, pageReady, stage as mark, reduced, onReducedChange, audioKit, sound } from '../shared/stim.js';
import { intro as playIntro } from '../shared/intro.js';
import { detail } from '../shared/detail.js';
import { buildScene, MAX_BOMB_LIGHTS } from './scene.js';
import { makeWorld, charge, blast, step as stepWorld, busy, clear, VENT, C_SOUND } from './erupt.js';
import { height } from './terrain.js';
import { volcanoSound } from './sound.js';
mark('libs');

const ID = 'volcano';
const stage = document.getElementById('stage');
const fail = stage.querySelector('.fail');
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const saved = k => { try { return localStorage.getItem(`stimming.${ID}.${k}`); } catch { return null; } };
const save = (k, v) => { try { localStorage.setItem(`stimming.${ID}.${k}`, String(v)); } catch { /* storage is optional */ } };
const windSaved = Number(saved('wind'));
const WIND0 = 0.45;
let wind = saved('wind') != null && windSaved >= 0 && windSaved <= 1 ? windSaved : WIND0;
let frozen = reduced();

const MAX_SPARKS = 4000, MAX_PUFFS = 700, MAX_SEGS = 1200;
const SHUTTER = 0.07;

/* ---------- state ---------- */
const W = makeWorld({ maxSparks: MAX_SPARKS, maxPuffs: MAX_PUFFS });
W.wind = wind; W.soft = frozen;
// ?qa hands the world to a test script.
if (new URLSearchParams(location.search).has('qa')) globalThis.__volcano = W;

/* ---------- bar ---------- */
let keyDown = false;
const ui = initPage({ id: ID, bar: {
  actions: [{ verb: 'erupt', label: 'Erupt', key: 'Space', hold: true, onDown: () => press('key'), onUp: () => release('key') }],
  slider: { label: 'Wind', min: 0, max: 1, step: 0.01, value: wind, onInput: v => { wind = v; W.wind = v; save('wind', v); touch(); } },
  quality: true,
  reset: () => { clear(W); wind = WIND0; W.wind = wind; save('wind', wind); ui.slider?.set(wind); snd.cancel(); touch(); },
  keys: [['hold', 'build pressure'], ['release', 'erupt'], ['space', 'erupt']],
  help: [
    ['hold', 'Hold to build pressure under the vent'],
    ['release', 'Let go to erupt: a longer hold makes a bigger blast'],
    ['click', 'Click for a small burst'],
    ['space', 'Hold Space to build pressure; let go to erupt'],
  ],
} });
const introDone = playIntro({ ready: pageReady() });
const kit = audioKit({ sleepMs: 1500 });
const snd = volcanoSound(kit);

/* ---------- three ---------- */
let renderer = null, composer = null, bloom = null, grade = null, S = null, camera = null;
let cssW = 1, cssH = 1;
const cam = { pos: new THREE.Vector3(), aim: new THREE.Vector3(), dist: 1150 };
const D = detail({ maxDpr: 1.5, budget: 2.4e6, steps: 3, settle: 2, onChange: () => resize(true) });

// The grade: the pressure ring bends the picture, then vignette and grain.
const GRADE = {
  uniforms: { tDiffuse: { value: null }, uRing: { value: new THREE.Vector4(0.5, 0.5, -1, 0) }, uAsp: { value: 1 }, uGrain: { value: 0 } },
  vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse;
    uniform vec4 uRing;
    uniform float uAsp, uGrain;
    varying vec2 vUv;
    float h(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main() {
      vec2 uv = vUv;
      vec2 d = (uv - uRing.xy) * vec2(uAsp, 1.0);
      float r = length(d);
      float w = 0.01 + uRing.z * 0.04;
      float ring = uRing.z > 0.0 ? exp(-pow((r - uRing.z) / w, 2.0)) * uRing.w : 0.0;
      uv -= normalize(d + 1e-5) * ring * 0.004 / vec2(uAsp, 1.0);
      vec3 c = texture2D(tDiffuse, uv).rgb;
      // The shock front shows as a faint pale shell in the haze.
      c += vec3(0.8, 0.82, 0.9) * ring * 0.012;
      vec2 q = vUv - 0.5;
      c *= 1.0 - 0.42 * dot(q * vec2(1.0, 1.25), q * vec2(1.0, 1.25));
      c += (h(vUv * 911.0 + uGrain) - 0.5) * 0.006 * (0.25 + c);
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
  camera = new THREE.PerspectiveCamera(42, 1.6, 2, 20000);
  S = buildScene({ maxSparks: MAX_SPARKS, maxPuffs: MAX_PUFFS, maxSegs: MAX_SEGS });
  const rt = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 });
  composer = new EffectComposer(renderer, rt);
  composer.addPass(new RenderPass(S.scene, camera));
  bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.75, 0.55, 0.82);
  composer.addPass(bloom);
  grade = new ShaderPass(GRADE);
  composer.addPass(grade);
  composer.addPass(new OutputPass());
  canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); halt(); });
  canvas.addEventListener('webglcontextrestored', () => wake());
}

// The shot: from the plain, looking up at the cone; the column leaves the top.
function frame3() {
  const asp = cssW / cssH, tall = asp < 1;
  cam.dist = tall ? 1750 : 1500;
  const fov = tall ? 58 : 42;
  const x = tall ? 0 : -160, z = cam.dist;
  cam.pos.set(x, height(x, z) + 30, z);
  camera.fov = fov;
  camera.aspect = asp;
  camera.updateProjectionMatrix();
  // The vent sits below the centre, and right of it on a wide stage.
  const half = (fov * Math.PI) / 360;
  const elev = Math.atan2(VENT[1] - cam.pos.y, cam.dist) + half * (tall ? 0.42 : 0.3);
  const yaw = tall ? 0 : Math.atan(Math.tan(half) * asp * 0.16);
  const dir = new THREE.Vector3(-Math.sin(yaw) * Math.cos(elev), Math.sin(elev), -Math.cos(yaw) * Math.cos(elev));
  const toVent = new THREE.Vector3(VENT[0] - x, 0, VENT[2] - z).normalize();
  // Turn the yaw about the line to the vent.
  const base = Math.atan2(toVent.x, -toVent.z);
  dir.applyAxisAngle(new THREE.Vector3(0, 1, 0), -base);
  cam.aim.copy(cam.pos).addScaledVector(dir, 1000);
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
  W.scale = D.rung >= 3 ? 0.5 : 1;
  frame3();
  S.streaks.mat.uniforms.uRes.value.set(w, h);
  S.streaks.mat.uniforms.uMinPx.value = 1.3 * dpr;
  grade.uniforms.uAsp.value = cssW / cssH;
  wake();
}

/* ---------- drawing ---------- */
const tmp = new THREE.Vector3();
let shake = 0, frameNo = 0;
function lightPos() {
  // The light stands over the rim, higher while the fountain plays.
  return tmp.set(VENT[0], VENT[1] + 45 + 90 * clamp(W.heat - 0.2, 0, 1.4), VENT[2]);
}
function upload() {
  const U = S.U;
  const L = lightPos();
  U.uLight.value.copy(L);
  U.uHeat.value = W.heat;
  U.uFlash.value = W.flash + 0.12 * W.glare;
  U.uCam.value.copy(camera.position);
  U.uDim.value = 1;
  // The brightest bolt lights the air and the land.
  let bolt = 0;
  for (const b of W.bolts) if (b.glow * b.s > bolt) { bolt = b.glow * b.s; U.uBoltPos.value.set(b.x, b.y, b.z); }
  U.uBolt.value = bolt;
  // Streaks: spatter and bombs, then bolt segments.
  const k = S.streaks, A = k.a.a.array, B = k.a.b.array, Dd = k.a.d.array;
  let n = 0;
  const sh = frozen ? SHUTTER * 0.4 : SHUTTER;
  const lights = [];
  for (const s of W.sparks) {
    const i3 = n * 3, i4 = n * 4;
    A[i3] = s.x; A[i3 + 1] = s.y; A[i3 + 2] = s.z;
    // Bombs leave long trails, as in a long exposure.
    const t = s.state === 2 ? 0 : sh;
    B[i3] = s.x - s.vx * t; B[i3 + 1] = s.y - s.vy * t; B[i3 + 2] = s.z - s.vz * t;
    Dd[i4] = s.T; Dd[i4 + 1] = s.size; Dd[i4 + 2] = 1; Dd[i4 + 3] = 0;
    n++;
    if (s.kind === 1 && s.T > 0.08) lights.push(s);
    // The trail: segments back along the recent path, each dimmer.
    if (s.trail && s.trail.length && !frozen) {
      let px = B[i3], py = B[i3 + 1], pz = B[i3 + 2];
      for (let j = 0; j < s.trail.length && n < MAX_SPARKS + MAX_SEGS; j++) {
        const q = s.trail[j], k3 = n * 3, k4 = n * 4, f = Math.pow(1 - (j + 1) / 8, 1.6);
        A[k3] = px; A[k3 + 1] = py; A[k3 + 2] = pz;
        B[k3] = q[0]; B[k3 + 1] = q[1]; B[k3 + 2] = q[2];
        Dd[k4] = s.T; Dd[k4 + 1] = s.size * (0.4 + 0.5 * f); Dd[k4 + 2] = f * 0.8; Dd[k4 + 3] = 0;
        px = q[0]; py = q[1]; pz = q[2];
        n++;
      }
    }
  }
  for (const b of W.bolts) {
    if (b.glow < 0.01) continue;
    for (const [p, q, w] of b.segs) {
      if (n >= MAX_SPARKS + MAX_SEGS) break;
      const i3 = n * 3, i4 = n * 4;
      A[i3] = p[0]; A[i3 + 1] = p[1]; A[i3 + 2] = p[2];
      B[i3] = q[0]; B[i3 + 1] = q[1]; B[i3 + 2] = q[2];
      Dd[i4] = b.glow * w * 3; Dd[i4 + 1] = 3 * w + 1; Dd[i4 + 2] = 1; Dd[i4 + 3] = 1;
      n++;
    }
  }
  k.g.instanceCount = n;
  k.a.a.needsUpdate = k.a.b.needsUpdate = k.a.d.needsUpdate = true;
  // The hottest bombs light the ground near them.
  lights.sort((a, b) => b.T * b.size - a.T * a.size);
  const bl = S.terrain.bombs;
  for (let i = 0; i < MAX_BOMB_LIGHTS; i++) {
    const s = lights[i];
    if (s) bl[i].set(s.x, s.y + 1.5, s.z, Math.pow(s.T, 2.4) * s.size * 0.6);
    else bl[i].set(0, -1e4, 0, 0);
  }
  // Puffs: far to near, lit by the vent and the bolts.
  const P = W.puffs, cx = camera.position.x, cy = camera.position.y, cz = camera.position.z;
  for (const p of P) p.dd = (p.x - cx) ** 2 + (p.y - cy) ** 2 + (p.z - cz) ** 2;
  P.sort((a, b) => b.dd - a.dd);
  const pa = S.puffs.a, PP = pa.p.array, PS = pa.s.array, PL = pa.l.array;
  const lightK = W.heat * 0.9 + W.flash * 7 + W.glare * 0.7;
  P.forEach((p, i) => {
    PP[i * 3] = p.x; PP[i * 3 + 1] = p.y; PP[i * 3 + 2] = p.z;
    const fin = Math.min(1, p.age / 0.5), fout = Math.min(1, (p.life - p.age) / 12);
    // A puff thins as it spreads and as it ages.
    const thin = Math.pow(p.r0 / p.r, p.kind ? 0.9 : 0.7) * (1 - 0.85 * clamp((p.age - 8) / 36, 0, 1));
    PS[i * 4] = p.r; PS[i * 4 + 1] = p.rot; PS[i * 4 + 2] = p.dens * fin * fout * thin; PS[i * 4 + 3] = p.kind;
    const dl = Math.hypot(p.x - L.x, p.y - L.y, p.z - L.z);
    let bl2 = 0;
    for (const b of W.bolts) bl2 += b.glow * b.s * 2.2 / (1 + ((p.x - b.x) ** 2 + (p.y - b.y) ** 2 + (p.z - b.z) ** 2) / 160000);
    PL[i * 4] = lightK / (1 + (dl / 330) ** 2);
    PL[i * 4 + 1] = bl2;
    PL[i * 4 + 2] = p.hot * Math.exp(-Math.max(0, p.y - VENT[1]) / 130);
    PL[i * 4 + 3] = p.seed;
  });
  S.puffs.g.instanceCount = P.length;
  pa.p.needsUpdate = pa.s.needsUpdate = pa.l.needsUpdate = true;
  // The pressure ring: the newest one still in sight.
  const ring = W.rings[W.rings.length - 1];
  if (ring && !frozen) {
    tmp.set(VENT[0], VENT[1], VENT[2]).project(camera);
    const dv = camera.position.distanceTo(new THREE.Vector3(...VENT));
    const rad = (ring.age * C_SOUND) / dv / Math.tan((camera.fov * Math.PI) / 360) / 2;
    grade.uniforms.uRing.value.set((tmp.x + 1) / 2, (tmp.y + 1) / 2, rad, ring.amp * Math.exp(-ring.age / 1.6));
  } else grade.uniforms.uRing.value.set(0.5, 0.5, -1, 0);
}

function render(now) {
  // Tremor and the shock shake the camera a little; reduced motion keeps it still.
  const t = now / 1000;
  const j = frozen ? 0 : W.tremor * 0.9 + shake * 6;
  const jx = j * (Math.sin(t * 37.1) * 0.6 + Math.sin(t * 23.3 + 1.7) * 0.4);
  const jy = j * (Math.sin(t * 31.7 + 0.4) * 0.6 + Math.sin(t * 19.1 + 2.9) * 0.4);
  camera.position.copy(cam.pos);
  camera.lookAt(cam.aim.x + jx, cam.aim.y + jy, cam.aim.z);
  S.sky.position.copy(camera.position);
  upload();
  bloom.strength = 0.6 + 0.5 * Math.min(1, W.flash * 2);
  grade.uniforms.uGrain.value = frozen ? 0 : frameNo % 97;
  composer.render();
}

/* ---------- simulation ---------- */
let lastInput = performance.now(), timeK = 1;
const panX = (x, y, z) => { tmp.set(x, y, z).project(camera); return clamp(tmp.x, -1, 1); };
function step(dt) {
  const live = busy(W);
  // Ambient steam and drift sleep 60 s after the last input; reduced motion has none.
  const amb = frozen ? 0 : timeK;
  const sdt = live ? dt : dt * (frozen ? 0 : timeK);
  if (sdt > 0) stepWorld(W, sdt, { ambient: amb });
  // Rings reach the camera: the boom lands and the frame shakes.
  for (const r of W.rings) {
    if (!r.hit && r.age * C_SOUND >= cam.dist) { r.hit = true; shake = Math.max(shake, r.amp); }
  }
  shake *= Math.exp(-dt / 0.35);
  for (const e of W.events.splice(0)) {
    const d = camera.position.distanceTo(tmp.set(e.x, e.y, e.z));
    const delay = d / C_SOUND, x = panX(e.x, e.y, e.z);
    if (e.type === 'blast') snd.blast(e.size, delay, x, 1.5 + 9 * e.size);
    else if (e.type === 'bolt') snd.thunder(delay, d, x, e.s);
    else if (e.type === 'land') snd.land(e.e, delay, x);
  }
  snd.update({ tremor: W.tremor, heat: W.heat });
  return live || shake > 0.01;
}

/* ---------- frame loop ---------- */
let visible = true, raf = 0, timer = 0, last = 0;
function frame(now) {
  raf = 0;
  if (!visible || !renderer) return;
  const dt = Math.max(0, Math.min(0.05, (now - last) / 1000));
  last = Math.max(last, now);
  let again = true, lively = true;
  try {
    const idle = (now - lastInput) / 1000;
    timeK = idle < 60 ? 1 : Math.max(0, 1 - (idle - 60) / 2);
    const live = step(dt);
    render(now);
    D.frame(dt);
    frameNo++;
    lively = live || down || keyDown;
    // The cloud drifts and the crater steams at 30 fps until the toy sleeps.
    const drifting = !frozen && timeK > 0;
    again = lively || drifting;
  } finally {
    // A thrown error still leaves the loop able to wake.
    if (!again) snd.rest();
    else schedule(lively ? 0 : Math.max(0, 31 - (performance.now() - now)));
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
// A press builds pressure; the release erupts. Pointer and Space share it.
let down = false, pid = null;
const holders = new Set();
function press(who) {
  if (who === 'key') keyDown = true;
  holders.add(who);
  charge(W, true);
  touch();
}
function release(who, erupt = true) {
  if (who === 'key') keyDown = false;
  if (!holders.delete(who)) return;
  if (holders.size) return;
  if (erupt) blast(W, 0.1 + 0.9 * W.pressure);
  else charge(W, false);
  touch();
}
stage.addEventListener('pointerdown', e => {
  if (e.button !== 0 || !renderer || (e.target !== renderer.domElement && e.target !== stage)) return;
  try { stage.setPointerCapture(e.pointerId); } catch { /* capture is optional */ }
  pid = e.pointerId; down = true;
  press('pointer');
});
function end(e) {
  if (!down || (e && e.pointerId !== pid)) return;
  down = false; pid = null;
  // A cancelled gesture lets the pressure go without a blast.
  release('pointer', e.type === 'pointerup');
}
['pointerup', 'pointercancel', 'lostpointercapture'].forEach(t => stage.addEventListener(t, end));

/* ---------- life cycle ---------- */
whenVisible(stage, on => {
  visible = on;
  if (on) wake();
  else { halt(); snd.hide(); }
});
onReducedChange(on => { frozen = on; W.soft = on; wake(); });
sound.onChange(on => { if (on) touch(); else snd.cancel(); });
new ResizeObserver(() => resize()).observe(stage);

mark('build');
try {
  await setup();
  resize(true);
  // An eruption some time ago: the first frame shows its cloud and last embers.
  blast(W, 0.3);
  for (let i = 0; i < 45 * 30; i++) stepWorld(W, 1 / 30);
  W.events.length = 0; W.rings.length = 0; W.bolts.length = 0;
  // Its ash has drifted off; the embers and the steam stay.
  W.puffs = W.puffs.filter(p => p.kind === 1);
  step(0);
  render(performance.now());
  await renderer.compileAsync(S.scene, camera);
  render(performance.now());
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
