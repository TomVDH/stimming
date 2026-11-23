// Calving: a glacier face in a fjord. Tap the ice; a tower leans, falls and splashes.
// The crack, the roar and the boom arrive late, by distance; the surge rolls to the camera last.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { initPage, whenVisible, pageReady, stage as mark, reduced, onReducedChange, audioKit, sound } from '../shared/stim.js';
import { intro as playIntro } from '../shared/intro.js';
import { detail } from '../shared/detail.js';
import { buildScene, MAX_WAVES } from './scene.js';
import { faceZ, faceTop, faceN, wallL } from './land.js';
import { makeWorld, step as stepWorld, startCrack, cancelCrack, release, calveRandom, busy, clearAll, waveAt, C_SOUND } from './ice.js';
import { calvingSound } from './sound.js';
mark('libs');

const ID = 'calving';
const stage = document.getElementById('stage');
const fail = stage.querySelector('.fail');
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const saved = k => { try { return localStorage.getItem(`stimming.${ID}.${k}`); } catch { return null; } };
const save = (k, v) => { try { localStorage.setItem(`stimming.${ID}.${k}`, String(v)); } catch { /* storage is optional */ } };
const LENS0 = 0.45;
const lensSaved = Number(saved('lens'));
let lens = saved('lens') != null && lensSaved >= 0 && lensSaved <= 1 ? lensSaved : LENS0;
let frozen = reduced();

const MAX_PUFFS = 900, BRASH = 260, MAX_CHIPS = 160;
const qa = new URLSearchParams(location.search).has('qa');

/* ---------- bar ---------- */
let keyDown = false;
const ui = initPage({ id: ID, bar: {
  actions: [{ verb: 'calve', label: 'Calve', key: 'Space', hold: true, onDown: () => keyPress(), onUp: () => keyRelease() }],
  slider: { label: 'Lens', min: 0, max: 1, step: 0.01, value: lens, onInput: v => { lens = v; save('lens', v); frame3(); touch(); } },
  quality: true,
  reset: () => { if (W) clearAll(W); pan.to = pan.at = 0; lens = LENS0; save('lens', lens); ui.slider?.set(lens); frame3(); snd.cancel(); touch(); },
  keys: [['click', 'break the ice'], ['hold', 'bigger'], ['drag', 'pan'], ['space', 'calve']],
  help: [
    ['click', 'Click the ice face to break a tower off it'],
    ['hold', 'Hold on the ice to break a bigger tower'],
    ['drag', 'Drag to pan the long lens along the face'],
    ['space', 'Press Space to calve where you look; hold it for a big one'],
  ],
} });
const introDone = playIntro({ ready: pageReady() });
const kit = audioKit({ sleepMs: 1500 });
const snd = calvingSound(kit);

/* ---------- three ---------- */
let renderer = null, composer = null, bloom = null, grade = null, S = null, W = null, camera = null;
let cssW = 1, cssH = 1;
const D = detail({ maxDpr: 1.5, budget: 2.2e6, steps: 3, settle: 2, onChange: () => resize(true) });
// The camera floats low on the water, a long lens on the face.
const CAM = new THREE.Vector3(0, 3.5, 0);
const pan = { at: 0, to: 0 };
const view = { yaw0: -8 * Math.PI / 180, fov: 14, pitch: 0 };

// The grade: vignette, a cool toe and fine grain.
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
      c *= 1.0 - 0.38 * dot(q * vec2(1.0, 1.2), q * vec2(1.0, 1.2));
      // Shadows lean cold, as in a northern dusk.
      float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
      c += vec3(-0.004, 0.0, 0.006) * (1.0 - smoothstep(0.0, 0.25, l));
      c += (h(vUv * 911.0 + uGrain) - 0.5) * 0.006 * (0.25 + c);
      gl_FragColor = vec4(max(c, 0.0), 1.0);
    }`,
};

async function setup() {
  renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
  const ext = renderer.extensions;
  if (!ext.has('EXT_color_buffer_float') && !ext.has('EXT_color_buffer_half_float')) throw new Error('no float targets');
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.95;
  const canvas = renderer.domElement;
  canvas.setAttribute('aria-hidden', 'true');
  stage.append(canvas);
  camera = new THREE.PerspectiveCamera(14, 1.6, 1, 40000);
  S = buildScene({ brash: BRASH, maxPuffs: MAX_PUFFS, maxChips: MAX_CHIPS });
  W = makeWorld(S, { maxPuffs: MAX_PUFFS, maxChips: MAX_CHIPS });
  W.soft = frozen;
  if (qa) globalThis.__calving = { W, S, camera, view, pan, frame: f => { for (let i = 0; i < f; i++) frame(performance.now()); } };
  const rt = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 });
  composer = new EffectComposer(renderer, rt);
  composer.addPass(new RenderPass(S.scene, camera));
  bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.35, 0.45, 1.25);
  composer.addPass(bloom);
  grade = new ShaderPass(GRADE);
  composer.addPass(grade);
  composer.addPass(new OutputPass());
  canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); halt(); });
  canvas.addEventListener('webglcontextrestored', () => wake());
}

/* ---------- the shot ---------- */
// Lens 0 is a wide view of the fjord; lens 1 is a long lens on the face.
function frame3() {
  if (!camera) return;
  const asp = cssW / cssH;
  const vf = 24 * Math.pow(0.3, lens);
  // A tall stage keeps the same width of face and shows more sky and water.
  const tanH = Math.tan((vf * Math.PI) / 360) * (asp < 1 ? 1.25 : 1.6);
  const fov = asp < 1.6 ? Math.min(62, (2 * Math.atan(tanH / asp) * 180) / Math.PI) : vf;
  view.fov = fov;
  // The waterline sits low, so the face and the peaks fill the frame.
  view.pitch = Math.atan(0.4 * Math.tan((fov * Math.PI) / 360)) * (asp < 1 ? 0.35 : 1);
  camera.fov = fov;
  camera.aspect = asp;
  camera.updateProjectionMatrix();
}
const look = new THREE.Vector3(), rock = { p: 0, r: 0, y: 0 };
const wv = { h: 0, gx: 0, gz: 0 };
function place(dt) {
  pan.at += (pan.to - pan.at) * (1 - Math.exp(-dt * 10));
  const yaw = view.yaw0 + pan.at;
  // The surge lifts the boat and rocks it; reduced motion keeps it still.
  waveAt(W, CAM.x, CAM.z, wv);
  const k = frozen ? 0 : 1;
  const fx = Math.sin(yaw), fz = -Math.cos(yaw);
  const along = wv.gx * fx + wv.gz * fz, across = wv.gx * fz - wv.gz * fx;
  rock.y = wv.h * 0.85 * k;
  rock.p += (Math.atan(along) * 0.8 * k - rock.p) * Math.min(1, dt * 4);
  rock.r += (Math.atan(across) * 0.6 * k - rock.r) * Math.min(1, dt * 3);
  camera.position.set(CAM.x, CAM.y + rock.y, CAM.z);
  const pitch = view.pitch + rock.p;
  look.set(fx * Math.cos(pitch), Math.sin(pitch), fz * Math.cos(pitch)).add(camera.position);
  camera.up.set(Math.cos(yaw) * Math.sin(rock.r), 1, Math.sin(yaw) * Math.sin(rock.r)).normalize();
  camera.lookAt(look);
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
  // The mirror renders at half size, a quarter on the lower rungs.
  const mk = D.rung >= 2 ? 0.25 : 0.5;
  S.mirror.rt.setSize(Math.max(1, Math.round(w * mk)), Math.max(1, Math.round(h * mk)));
  W.scale = D.rung >= 3 ? 0.5 : 1;
  frame3();
  wake();
}

/* ---------- drawing ---------- */
const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), E3 = new THREE.Euler(), P3 = new THREE.Vector3(), S3 = new THREE.Vector3();
let frameNo = 0;
function upload() {
  const U = S.U;
  U.uCam.value.copy(camera.position);
  U.uTime.value = W.t;
  // The surge and its foam go to the water shader.
  for (let i = 0; i < MAX_WAVES; i++) {
    const w = W.waves[i];
    if (w) { U.uWave.value[i].set(w.x, w.z, w.t0, w.amp); U.uFoam.value[i].set(w.x, w.z, w.t0, w.foam); }
    else { U.uWave.value[i].set(0, 0, 0, 0); U.uFoam.value[i].set(0, 0, 0, 0); }
  }
  for (const b of W.blocks) { b.mesh.position.copy(b.pos); b.mesh.quaternion.copy(b.q); }
  // The crack runs out from the press at about 60 m a second.
  const c = W.crack, cv = W.calvings[W.calvings.length - 1];
  if (c) { U.uCrack.value.set(c.x0, c.x1, c.yb, 1); U.uCrackP.value.set(c.x, c.y, (W.t - c.t0) * 60 + 4, 0); }
  else if (cv && cv.age < 3) { const l = cv.line; U.uCrack.value.set(l.x0, l.x1, l.yb, 1 - cv.age / 3); U.uCrackP.value.set(l.tx, l.ty, 999, 0); }
  else U.uCrack.value.w = 0;
  // Brash and chips: one matrix each.
  W.brash.forEach((b, i) => {
    E3.set(b.tz, b.yaw, b.tx, 'YXZ');
    Q.setFromEuler(E3);
    M.compose(P3.set(b.x, b.y, b.z), Q, S3.set(b.s, b.s * b.sq, b.s * 0.8));
    S.brash.setMatrixAt(i, M);
  });
  S.brash.count = W.brash.length;
  S.brash.instanceMatrix.needsUpdate = true;
  W.chips.forEach((c, i) => {
    E3.set(c.rx, c.ry, 0);
    Q.setFromEuler(E3);
    const k = c.age > 30 ? Math.max(0.01, 1 - (c.age - 30) / 10) : 1;
    M.compose(P3.set(c.x, c.y, c.z), Q, S3.set(c.s * k, c.s * 0.6 * k, c.s * 0.8 * k));
    S.chips.setMatrixAt(i, M);
  });
  S.chips.count = W.chips.length;
  S.chips.instanceMatrix.needsUpdate = true;
  // Puffs: far to near.
  const P = W.puffs, cx = camera.position.x, cy = camera.position.y, cz = camera.position.z;
  for (const p of P) p.dd = (p.x - cx) ** 2 + (p.y - cy) ** 2 + (p.z - cz) ** 2;
  P.sort((a, b) => b.dd - a.dd);
  const pa = S.puffs.a, PP = pa.p.array, PS = pa.s.array, PL = pa.l.array;
  P.forEach((p, i) => {
    PP[i * 3] = p.x; PP[i * 3 + 1] = p.y; PP[i * 3 + 2] = p.z;
    const fin = Math.min(1, p.age / (p.kind === 3 ? 0.05 : 0.35));
    const fout = Math.min(1, (p.life - p.age) / Math.min(p.life * 0.5, p.kind === 1 ? 14 : 3));
    PS[i * 4] = p.r; PS[i * 4 + 1] = p.rot; PS[i * 4 + 2] = p.dens * fin * fout; PS[i * 4 + 3] = p.kind;
    // The low sun reaches spray only above the face's shadow.
    const nz = faceN(p.x)[1];
    const ahead = Math.max(0, (p.z - faceZ(p.x)) * nz);
    const shadow = faceTop(p.x) - 0.31 * ahead;
    PL[i * 4] = 0.15 + 0.85 * clamp((p.y - shadow + 6) / 12, 0, 1);
    PL[i * 4 + 1] = p.seed;
    PL[i * 4 + 2] = p.kind === 0 || p.kind === 3 ? Math.min(2.5, Math.abs(p.vy) / 12) : 0;
    PL[i * 4 + 3] = 0;
  });
  S.puffs.g.instanceCount = P.length;
  pa.p.needsUpdate = pa.s.needsUpdate = pa.l.needsUpdate = true;
}

function render() {
  upload();
  grade.uniforms.uGrain.value = frozen ? 0 : frameNo % 97;
  // The mirror: the scene from under the water, without the water.
  S.mirror.update(camera);
  S.water.visible = false;
  renderer.setRenderTarget(S.mirror.rt);
  renderer.render(S.scene, S.mirror.cam);
  renderer.setRenderTarget(null);
  S.water.visible = true;
  composer.render();
}

/* ---------- simulation ---------- */
let lastInput = performance.now(), timeK = 1, ambT = 0;
const tmp = new THREE.Vector3();
const panX = (x, y, z) => { tmp.set(x, y, z).project(camera); return clamp(tmp.x, -1, 1); };
let clinkT = 0;
function step(dt) {
  const live = busy(W);
  // Ambient life sleeps 60 s after the last input; reduced motion has none.
  const amb = frozen ? 0 : timeK;
  const sdt = live ? dt : dt * amb;
  ambT += dt * amb;
  S.U.uAmbT.value = ambT;
  if (sdt > 0) stepWorld(W, sdt, { amb, cam: camera.position });
  for (const e of W.events.splice(0)) {
    const d = camera.position.distanceTo(tmp.set(e.x, e.y, e.z));
    const delay = e.local ? 0 : d / C_SOUND, x = panX(e.x, e.y, e.z);
    if (e.type === 'crack') snd.crack(e.size, delay, x);
    else if (e.type === 'tick') snd.tick(e.size, delay, x);
    else if (e.type === 'groan') snd.groan(e.size, delay, x, e.dur);
    else if (e.type === 'break') snd.fall(e.size, delay, x, e.fall);
    else if (e.type === 'impact') snd.impact(e.size, delay, x);
    else if (e.type === 'chip') snd.chip(e.size, delay, x);
    else if (e.type === 'surge') snd.surge(e.size);
  }
  // Near floes knock together as the surge lifts them.
  clinkT -= dt;
  for (const b of W.brash) {
    if (!b.hit || clinkT > 0) continue;
    const d = Math.hypot(b.x - camera.position.x, b.z - camera.position.z);
    if (d > 260) continue;
    snd.clink(d / C_SOUND, panX(b.x, b.y, b.z), Math.min(1, b.s / 2) * (1 - d / 260));
    clinkT = 0.04;
  }
  return live;
}

/* ---------- frame loop ---------- */
let visible = true, raf = 0, timer = 0, last = 0;
function frame(now) {
  raf = 0;
  if (!visible || !renderer) return;
  // rAF time runs behind the clock here; the 30 fps wait uses the clock.
  const entry = performance.now();
  const dt = Math.max(0, Math.min(0.05, (now - last) / 1000));
  last = Math.max(last, now);
  let again = true, lively = true;
  try {
    const idle = (now - lastInput) / 1000;
    timeK = idle < 60 ? 1 : Math.max(0, 1 - (idle - 60) / 2);
    const live = step(dt);
    place(dt);
    render();
    D.frame(dt);
    frameNo++;
    const panning = Math.abs(pan.to - pan.at) > 1e-4;
    lively = live || down || keyDown || panning;
    // Ripples, mist and bobbing floes drift at 30 fps until the toy sleeps.
    again = lively || (!frozen && timeK > 0);
  } finally {
    // A thrown error still leaves the loop able to wake.
    if (!again) snd.rest();
    else schedule(lively ? 0 : Math.max(0, 31 - (performance.now() - entry)));
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
// The face point under a screen point: march the ray onto the face line.
const ray = new THREE.Raycaster();
const ndc = new THREE.Vector2();
function facePoint(clientX, clientY) {
  const r = stage.getBoundingClientRect();
  ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  const o = ray.ray.origin, d = ray.ray.direction;
  let s = 700;
  for (let k = 0; k < 8; k++) s = (faceZ(o.x + d.x * s) - o.z) / d.z;
  let x = o.x + d.x * s;
  const y = o.y + d.y * s;
  x = clamp(x, wallL(faceZ(x)) + 18, 1150);
  return { x, y: clamp(y, 2, faceTop(x)) };
}
// A press starts a crack at once; a drag pans; a hold grows the crack.
let down = false, pid = null, mode = 'none', sx = 0, sy = 0, panFrom = 0;
stage.addEventListener('pointerdown', e => {
  if (e.button !== 0 || !renderer || (e.target !== renderer.domElement && e.target !== stage)) return;
  try { stage.setPointerCapture(e.pointerId); } catch { /* capture is optional */ }
  pid = e.pointerId; down = true; mode = 'press';
  sx = e.clientX; sy = e.clientY; panFrom = pan.to;
  const p = facePoint(e.clientX, e.clientY);
  startCrack(W, p.x, p.y);
  touch();
});
stage.addEventListener('pointermove', e => {
  if (!down || e.pointerId !== pid) return;
  const dx = e.clientX - sx;
  if (mode === 'press' && Math.hypot(dx, e.clientY - sy) > 8) {
    // A drag is a pan; its crack heals before it ran.
    mode = 'drag';
    cancelCrack(W);
    stage.classList.add('pan');
  }
  if (mode === 'drag') {
    const hf = 2 * Math.atan(Math.tan((view.fov * Math.PI) / 360) * (cssW / cssH));
    pan.to = clamp(panFrom - (dx / cssW) * hf, -0.16, 0.5);
    touch();
  }
});
function end(e) {
  if (!down || (e && e.pointerId !== pid)) return;
  down = false; pid = null;
  stage.classList.remove('pan');
  // A cancelled press heals its crack; a release lets the tower go.
  if (mode === 'press' && e.type === 'pointerup') release(W);
  else cancelCrack(W);
  mode = 'none';
  touch();
}
['pointerup', 'pointercancel', 'lostpointercapture'].forEach(t => stage.addEventListener(t, end));
// Space: a tap calves a small tower in view; a hold grows a big one.
function keyPress() {
  if (keyDown || !W) return;
  keyDown = true;
  const x = Math.sin(view.yaw0 + pan.at) * 790 + (Math.random() - 0.5) * 120;
  const cx = clamp(x, wallL(faceZ(x)) + 18, 1150);
  startCrack(W, cx, 20 + Math.random() * 30);
  touch();
}
function keyRelease() {
  if (!keyDown) return;
  keyDown = false;
  release(W);
  touch();
}

/* ---------- life cycle ---------- */
whenVisible(stage, on => {
  visible = on;
  if (on) wake();
  else { halt(); snd.hide(); }
});
onReducedChange(on => { frozen = on; if (W) W.soft = on; wake(); });
sound.onChange(on => { if (on) touch(); else snd.cancel(); });
new ResizeObserver(() => resize()).observe(stage);

mark('build');
try {
  await setup();
  resize(true);
  // A calving some time ago: a fresh blue scar, new bergs, the last of its mist.
  calveRandom(W, -40, 0.55);
  for (let i = 0; i < 50 * 30; i++) stepWorld(W, 1 / 30, { amb: 1 });
  W.events.length = 0; W.waves.length = 0;
  place(0);
  render();
  await renderer.compileAsync(S.scene, camera);
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
