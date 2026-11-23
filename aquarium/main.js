// Aquarium: a planted tank seen through its front glass.
// Click the surface to feed; click the glass to knock. Three schools answer.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { initPage, whenVisible, pageReady, stage as mark, reduced, onReducedChange, audioKit, sound } from '../shared/stim.js';
import { intro as playIntro } from '../shared/intro.js';
import { detail } from '../shared/detail.js';
import { buildScene, sandH, SURF, GLASS, BACK } from './scene.js';
import { makeTank, populate, feed, knock, stepTank, busy, SPECIES } from './fish.js';
import { aquariumSound } from './sound.js';
mark('libs');

const ID = 'aquarium';
const stage = document.getElementById('stage');
const fail = stage.querySelector('.fail');
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const rnd = (a, b) => a + Math.random() * (b - a);
const saved = k => { try { return localStorage.getItem(`stimming.${ID}.${k}`); } catch { return null; } };
const save = (k, v) => { try { localStorage.setItem(`stimming.${ID}.${k}`, String(v)); } catch { /* storage is optional */ } };
const lightSaved = Number(saved('light'));
let lamp = saved('light') != null && lightSaved >= 0.15 && lightSaved <= 1 ? lightSaved : 0.85;
let frozen = reduced();

const MAX_FISH = 80, MAX_PTS = 700, MOTES = 220, PEARLS = 24;

/* ---------- bar ---------- */
const ui = initPage({ id: ID, bar: {
  actions: [
    { verb: 'feed', key: 'F', onPress: () => feedAt(null) },
    { verb: 'knock', key: 'K', onPress: () => knockAt(null) },
  ],
  slider: { label: 'Light', min: 0.15, max: 1, step: 0.01, value: lamp, onInput: v => { lamp = v; save('light', v); touch(); } },
  quality: true,
  reset: () => { tank.flakes = []; tank.fish.forEach(f => { f.fear = 0; f.target = null; }); lamp = 0.85; save('light', lamp); ui.slider?.set(lamp); touch(); },
  keys: [['click', 'feed or knock'], ['f', 'feed'], ['k', 'knock']],
  help: [
    ['click', 'Click the water surface at the top to drop food'],
    ['click', 'Click the glass below it to knock'],
    ['f', 'Drop a pinch of food'],
    ['k', 'Knock on the glass'],
  ],
} });
const introDone = playIntro({ ready: pageReady() });
const kit = audioKit({ sleepMs: 1500 });
const snd = aquariumSound(kit);

/* ---------- three ---------- */
let renderer = null, composer = null, bloom = null, grade = null, S = null, camera = null;
let cssW = 1, cssH = 1, tanH = 0.23;
const BASE = new THREE.Vector3(0, 25, 115);
const AIM = new THREE.Vector3(0, 23.2, GLASS);
const look = { x: 0, y: 0, tx: 0, ty: 0 };
const D = detail({ maxDpr: 1.5, budget: 2.2e6, steps: 3, settle: 2, onChange: () => resize(true) });

// The grade: knock ripple on the glass, vignette, grain.
const GRADE = {
  uniforms: { tDiffuse: { value: null }, uKnock: { value: new THREE.Vector4(0.5, 0.5, -10, 0) }, uTime: { value: 0 }, uAsp: { value: 1 }, uGrain: { value: 0 } },
  vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse;
    uniform vec4 uKnock;
    uniform float uTime, uAsp, uGrain;
    varying vec2 vUv;
    float sq(float x) { return x * x; }
    float h(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main() {
      vec2 uv = vUv;
      // A knock flexes the glass: one ring runs out and fades.
      float age = uTime - uKnock.z;
      vec2 d = (uv - uKnock.xy) * vec2(uAsp, 1.0);
      float r = length(d);
      float ring = 0.0;
      if (age >= 0.0 && age < 0.9) {
        float front = age * 0.55;
        ring = exp(-sq((r - front) * 28.0)) * sq(1.0 - age / 0.9) * uKnock.w;
        uv += normalize(d + 1e-5) * ring * 0.012 / vec2(uAsp, 1.0);
      }
      vec3 c = texture2D(tDiffuse, uv).rgb;
      // The knuckle mark flashes, and the ring catches light as it runs.
      float flash = age >= 0.0 ? exp(-r * r * 900.0) * max(0.0, 1.0 - age / 0.22) * uKnock.w : 0.0;
      c += vec3(0.55, 0.8, 0.85) * (ring * 0.22 + flash * 0.5);
      vec2 q = vUv - 0.5;
      c *= 1.0 - 0.38 * dot(q * vec2(1.1, 1.3), q * vec2(1.1, 1.3));
      c += (h(vUv * 911.0 + uGrain) - 0.5) * 0.004 * (0.3 + c);
      gl_FragColor = vec4(max(c, 0.0), 1.0);
    }`,
};

/* ---------- state ---------- */
const tank = makeTank();
// ?qa hands the tank to a test script.
if (new URLSearchParams(location.search).has('qa')) globalThis.__aq = tank;
let clumps = [];
let clock = 0, lastInput = performance.now(), timeK = 1;
let visible = true, raf = 0, timer = 0, last = 0, frameNo = 0;
const motes = Array.from({ length: MOTES }, () => ({ p: [0, 0, 0], seed: Math.random() }));
const pearls = [];
let pearlT = 2, shiver = 0, ripIx = 0;

// The view: the glass fills the stage; width follows the aspect.
const halfAt = z => (BASE.z - z) * tanH * (cssW / cssH);
tank.halfW = z => halfAt(z);
tank.floor = (x, z) => sandH(x, z, clumps);

function layout() {
  const asp = cssW / cssH, w0 = halfAt(0);
  // Two tall clumps at the back corners, a carpet across the front.
  clumps = [
    { x: -w0 * 0.62, z: -11, r: Math.max(4.5, w0 * 0.12), mound: 2.2, n: asp < 1 ? 16 : 34, top: SURF },
    { x: w0 * 0.58, z: -6, r: Math.max(4, w0 * 0.1), mound: 1.8, n: asp < 1 ? 13 : 26, top: SURF },
    { x: w0 * 0.08, z: -15, r: Math.max(3, w0 * 0.07), mound: 1.2, n: asp < 1 ? 7 : 14, top: 30 },
  ];
  tank.clumps = clumps;
  S.U.uClump.value.forEach((v, i) => v.set(clumps[i].x, clumps[i].z, clumps[i].r, clumps[i].mound));
  // Tall leaves.
  const ta = S.tall.a;
  let n = 0;
  clumps.forEach((c, ci) => {
    for (let k = 0; k < c.n && n < 160; k++, n++) {
      const a = rnd(0, Math.PI * 2), r = Math.sqrt(Math.random()) * c.r * 0.55;
      const x = c.x + Math.cos(a) * r, z = c.z + Math.sin(a) * r * 0.7;
      ta.root.setXYZ(n, x, sandH(x, z, clumps) - 0.4, z);
      // Most tips stay just under the surface, so the mirror shows them.
      const room = SURF - 1 - sandH(x, z, clumps);
      const h = ci === 2 ? rnd(12, 22) : room * rnd(0.62, 1.02);
      ta.shape.setXYZW(n, h, rnd(0.7, 1.15), rnd(-0.35, 0.35) + (x - c.x) * 0.04, Math.random());
      ta.tint.setX(n, ci === 2 ? rnd(0.6, 1) : rnd(0, 0.35));
    }
  });
  S.tall.g.instanceCount = n;
  Object.values(ta).forEach(a => { a.needsUpdate = true; });
  // Carpet: short blades from the glass to mid depth.
  const ca = S.carpet.a, wF = halfAt(GLASS) + 2;
  const want = Math.min(2600, Math.round(wF * 2 * 15 * (D.rung >= 3 ? 0.5 : 1)));
  for (let k = 0; k < want; k++) {
    const x = rnd(-wF, wF), z = GLASS - 1 - Math.pow(Math.random(), 1.3) * 22;
    ca.root.setXYZ(k, x, sandH(x, z, clumps) - 0.2, z);
    ca.shape.setXYZW(k, rnd(1.2, 3.2) * (0.6 + 0.4 * Math.sin(x * 0.15 + z * 0.3) ** 2), rnd(0.22, 0.4), rnd(-0.6, 0.6), Math.random());
    ca.tint.setX(k, rnd(0.3, 0.9));
  }
  S.carpet.g.instanceCount = want;
  Object.values(ca).forEach(a => { a.needsUpdate = true; });
  // Motes fill the water.
  motes.forEach(m => { m.p = [rnd(-halfAt(BACK), halfAt(BACK)), rnd(4, SURF - 1), rnd(BACK + 1, GLASS - 2)]; });
  // School sizes follow the visible width.
  populate(tank, clamp(halfAt(0) / 43, 0.35, 1.25));
}

async function setup() {
  renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
  const ext = renderer.extensions;
  if (!ext.has('EXT_color_buffer_float') && !ext.has('EXT_color_buffer_half_float')) throw new Error('no float targets');
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 0.95;
  const canvas = renderer.domElement;
  canvas.setAttribute('aria-hidden', 'true');
  stage.append(canvas);
  camera = new THREE.PerspectiveCamera(26, 1.6, 1, 600);
  S = buildScene({ maxFish: MAX_FISH, maxPoints: MAX_PTS });
  const rt = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 });
  composer = new EffectComposer(renderer, rt);
  composer.addPass(new RenderPass(S.scene, camera));
  bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.4, 0.5, 0.9);
  composer.addPass(bloom);
  grade = new ShaderPass(GRADE);
  composer.addPass(grade);
  composer.addPass(new OutputPass());
  canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); halt(); });
  canvas.addEventListener('webglcontextrestored', () => wake());
}

function frame3() {
  // A narrow lens: the glass fills the frame from the sand to just above the water.
  const asp = cssW / cssH;
  const halfY = asp < 0.8 ? 21.2 : 22;
  tanH = halfY / (BASE.z - GLASS);
  camera.fov = (2 * Math.atan(tanH) * 180) / Math.PI;
  camera.aspect = asp;
  camera.updateProjectionMatrix();
}

let W = 0, H = 0;
function resize(force = false) {
  if (!renderer) return;
  const r = stage.getBoundingClientRect();
  cssW = Math.max(1, r.width); cssH = Math.max(1, r.height);
  const dpr = D.dpr(cssW, cssH);
  const w = Math.round(cssW * dpr), h = Math.round(cssH * dpr);
  if (!force && w === W && h === H) return;
  const relayout = Math.abs(cssW / cssH - (W && H ? W / H : 0)) > 0.02 || force;
  W = w; H = h;
  renderer.setPixelRatio(dpr);
  renderer.setSize(cssW, cssH, false);
  composer.setPixelRatio(dpr);
  composer.setSize(cssW, cssH);
  bloom.resolution.set(Math.round(cssW * dpr * (D.rung >= 2 ? 0.25 : 0.5)), Math.round(cssH * dpr * (D.rung >= 2 ? 0.25 : 0.5)));
  frame3();
  S.ptMat.uniforms.uPx.value = (h * camera.projectionMatrix.elements[5]) / 2;
  S.shafts.forEach((m, i) => { m.visible = D.rung < 2 || i % 2 === 0; });
  S.shaftMat.uniforms.uK.value = D.rung >= 2 ? 0.12 : 0.06;
  grade.uniforms.uAsp.value = cssW / cssH;
  if (relayout) layout();
  wake();
}

/* ---------- drawing ---------- */
const tmpV = new THREE.Vector3();
function upload() {
  const fa = S.fa, fish = tank.fish;
  fish.forEach((f, i) => {
    fa.pos.setXYZ(i, f.p[0], f.p[1], f.p[2]);
    fa.dir.setXYZW(i, f.dir[0], f.dir[1], f.dir[2], f.roll);
    fa.swim.setXYZW(i, f.phase, f.amp, SPECIES[f.sp].hk, f.s);
    fa.body.setXY(i, f.curve, f.sp);
  });
  S.fishG.instanceCount = fish.length;
  // Shadow blobs: position and a size from the body.
  fish.forEach((f, i) => S.U.uShadow.value[i].set(f.p[0], f.p[1], f.p[2], f.s * 0.42 * SPECIES[f.sp].hk));
  S.U.uShadows.value = Math.min(80, fish.length);
  Object.values(fa).forEach(a => { a.needsUpdate = true; });
  // Points: flakes first, then motes, then pearls.
  const P = S.ptPos, Dt = S.ptData;
  let n = 0;
  for (const fl of tank.flakes) {
    if (n >= MAX_PTS) break;
    P.setXYZ(n, fl.p[0], fl.p[1], fl.p[2]);
    const fade = fl.gone ? Math.max(0, 1 - fl.gone * 5) : fl.state === 2 ? clamp(1 - (fl.t - 34) / 6, 0, 1) : 1;
    Dt.setXYZW(n++, 0, fl.size, fl.seed, fade);
  }
  for (const m of motes) { P.setXYZ(n, m.p[0], m.p[1], m.p[2]); Dt.setXYZW(n++, 1, 0.16 + m.seed * 0.12, m.seed, 0.9); }
  for (const b of pearls) { P.setXYZ(n, b.p[0], b.p[1], b.p[2]); Dt.setXYZW(n++, 2, b.r, 0, 0.9); }
  S.ptG.setDrawRange(0, n);
  P.needsUpdate = true; Dt.needsUpdate = true;
}

function render() {
  camera.position.set(BASE.x + look.x * 5, BASE.y + look.y * 2.2, BASE.z);
  camera.lookAt(AIM.x + look.x * 1.2, AIM.y + look.y * 0.5, AIM.z);
  S.set(clock, lamp);
  S.surfMat.uniforms.uShiver.value = shiver;
  grade.uniforms.uTime.value = clock;
  grade.uniforms.uGrain.value = frozen ? 0 : frameNo % 97;
  bloom.strength = 0.2 + 0.2 * lamp;
  upload();
  composer.render();
}

/* ---------- simulation ---------- */
function ripple(x, z, amp) {
  S.ripples[ripIx].set(x, z, clock, amp);
  ripIx = (ripIx + 1) % S.ripples.length;
}
function step(dt) {
  const amb = frozen ? 0 : dt * timeK;
  const live = busy(tank);
  // Reduced motion: fish move only for food or fear, and slower.
  const sdt = frozen ? (live ? dt : 0) : live ? dt : amb;
  clock += frozen ? (live ? dt * 0.5 : 0) : Math.max(amb, live ? dt : 0);
  stepTank(tank, sdt, { soft: frozen });
  for (const e of tank.events.splice(0)) {
    if (e.type === 'nip') { if (e.top) { ripple(e.x, e.z, 0.12); snd.nip(e.x / halfAt(0), true); } else snd.nip(e.x / halfAt(0), false); }
    else if (e.type === 'dart') snd.dart(e.x / halfAt(0));
  }
  // Motes drift on the slow current.
  if (amb > 0) {
    const wF = halfAt(BACK);
    for (const m of motes) {
      m.p[0] += Math.sin(clock * 0.1 + m.seed * 40) * 0.25 * amb;
      m.p[1] += (Math.sin(clock * 0.13 + m.seed * 17) * 0.12 - 0.03) * amb;
      if (m.p[1] < 3) m.p[1] = SURF - 1.5;
      if (m.p[0] > wF) m.p[0] = -wF; else if (m.p[0] < -wF) m.p[0] = wF;
    }
    // Pearls: oxygen bubbles leave the leaves under a bright lamp.
    pearlT -= amb * lamp * lamp;
    if (pearlT < 0 && pearls.length < PEARLS && clumps.length) {
      pearlT = rnd(0.6, 3.5);
      const c = clumps[(Math.random() * 2) | 0];
      pearls.push({ p: [c.x + rnd(-c.r, c.r) * 0.6, rnd(12, 34), c.z + rnd(-2, 3)], vy: rnd(5, 9), r: rnd(0.14, 0.3), w: rnd(0, 6) });
    }
  }
  for (let i = pearls.length - 1; i >= 0; i--) {
    const b = pearls[i];
    b.w += amb * 9;
    b.p[1] += b.vy * amb;
    b.p[0] += Math.sin(b.w) * 0.6 * amb;
    if (b.p[1] > SURF - 0.2) { pearls.splice(i, 1); ripple(b.p[0], b.p[2], 0.04); snd.pearl(b.p[0] / halfAt(0)); }
  }
  shiver *= Math.exp(-dt * 5);
  // The view follows the pointer, eased.
  const k = 1 - Math.exp(-dt * 3);
  look.x += (look.tx - look.x) * k; look.y += (look.ty - look.y) * k;
  snd.update({ lamp, busy: live });
  return live;
}

/* ---------- frame loop ---------- */
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
    render();
    D.frame(dt);
    frameNo++;
    const looking = Math.abs(look.tx - look.x) + Math.abs(look.ty - look.y) > 0.002;
    lively = live || down || looking;
    again = lively || (timeK > 0 && !frozen);
  } finally {
    // A thrown error still leaves the loop able to wake.
    if (!again) snd.rest();
    else schedule(lively ? 0 : Math.max(0, 36 - (performance.now() - now)));
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
const ray = new THREE.Raycaster();
const ndc = new THREE.Vector2();
// Where a stage point meets the glass, and the surface behind it.
function hit(sx, sy) {
  ndc.set((sx / cssW) * 2 - 1, 1 - (sy / cssH) * 2);
  ray.setFromCamera(ndc, camera);
  const o = ray.ray.origin, d = ray.ray.direction;
  const tg = (GLASS - o.z) / d.z;
  const g = [o.x + d.x * tg, o.y + d.y * tg];
  let s = null;
  if (d.y > 0) {
    const ts = (SURF - o.y) / d.y;
    const z = o.z + d.z * ts;
    s = [o.x + d.x * ts, z];
  }
  return { glass: g, surf: s };
}
function feedAt(pt) {
  let x, z;
  if (pt) { x = pt[0]; z = clamp(pt[1], BACK + 3, GLASS - 3); }
  else { x = rnd(-0.4, 0.4) * halfAt(0); z = rnd(-6, 10); }
  feed(tank, x, z, frozen ? 9 : 13);
  ripple(x, z, 0.35);
  snd.patter(x / halfAt(0));
  touch();
}
function knockAt(pt, sx, sy) {
  const g = pt || [rnd(-0.2, 0.2) * halfAt(GLASS), rnd(14, 26)];
  knock(tank, g[0], g[1], frozen);
  shiver = 1;
  // The ring sits where the knuckle lands on the screen.
  const scr = sx != null ? [sx / cssW, 1 - sy / cssH] : (() => { tmpV.set(g[0], g[1], GLASS).project(camera); return [(tmpV.x + 1) / 2, (tmpV.y + 1) / 2]; })();
  grade.uniforms.uKnock.value.set(scr[0], scr[1], clock, frozen ? 0.5 : 1);
  snd.knock(g[0] / halfAt(GLASS));
  touch();
}

let down = false, pid = null, at0 = null, moved = false, held = false, holdT = 0;
const local = e => { const r = stage.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
// The parallax target: a mouse looks around by hovering; a finger by dragging.
function aim(x, y) {
  if (frozen) return;
  look.tx = clamp((x / cssW) * 2 - 1, -1, 1);
  look.ty = clamp(1 - (y / cssH) * 2, -1, 1) * 0.6;
}
stage.addEventListener('pointerdown', e => {
  if (e.button !== 0 || !renderer || (e.target !== renderer.domElement && e.target !== stage)) return;
  try { stage.setPointerCapture(e.pointerId); } catch { /* capture is optional */ }
  pid = e.pointerId; at0 = local(e); moved = false; held = false; down = true;
  clearTimeout(holdT);
  holdT = setTimeout(() => { held = true; }, 260);
  touch();
});
stage.addEventListener('pointermove', e => {
  const p = local(e);
  if (e.pointerType === 'mouse' && !down) { aim(...p); touch(); return; }
  if (!down || e.pointerId !== pid) return;
  if (!moved && Math.hypot(p[0] - at0[0], p[1] - at0[1]) < 8) return;
  moved = true;
  aim(...p);
  touch();
});
stage.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse' && !down) { look.tx = look.ty = 0; touch(); } });
function end(e) {
  if (!down || (e && e.pointerId !== pid)) return;
  clearTimeout(holdT);
  down = false; pid = null;
  if (e.type === 'pointerup' && !moved && !held && camera) {
    const [x, y] = at0, h = hit(x, y);
    // A ray that meets the surface inside the tank, or near it, feeds; lower down it knocks.
    if (h.glass[1] > SURF - 0.5) feedAt([h.glass[0], rnd(0, 10)]);
    else if (h.surf && h.surf[1] > BACK - 12) feedAt([h.surf[0], h.surf[1]]);
    else knockAt(h.glass, x, y);
  }
  if (e.pointerType !== 'mouse') { look.tx = look.ty = 0; }
  touch();
}
['pointerup', 'pointercancel', 'lostpointercapture'].forEach(t => stage.addEventListener(t, end));

/* ---------- life cycle ---------- */
whenVisible(stage, on => {
  visible = on;
  if (on) wake();
  else { halt(); snd.hide(); }
});
onReducedChange(on => { frozen = on; if (on) look.tx = look.ty = 0; wake(); });
sound.onChange(on => { if (on) touch(); });
new ResizeObserver(() => resize()).observe(stage);

mark('build');
try {
  await setup();
  resize(true);
  // The schools settle before the first frame, so it opens composed.
  for (let i = 0; i < 240; i++) stepTank(tank, 1 / 30);
  tank.events.length = 0;
  step(0);
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
