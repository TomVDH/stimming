// Fruit slice: a toony fruit to squish and slice. Four fruits, one at a time.
// three.js 0.170: custom toon shaders, juice beads, fuzz ribbons, a lens finish.
import * as THREE from 'three';
import { initPage, whenVisible, pageReady, stage as mark, reduced, onReducedChange, audioKit, sound } from '../shared/stim.js';
import { intro as playIntro } from '../shared/intro.js';
import { detail } from '../shared/detail.js';
import { makeHalf } from './half.js';
import { FRUITS } from './fruits.js';
import { makeFuzz } from './fuzz.js';
import { makeJuice } from './juice.js';
import { makePost } from './post.js';
import { fruitSound } from './sound.js';
mark('libs');

const ID = 'fruit';
const stage = document.getElementById('stage');
const fail = stage.querySelector('.fail');
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const saved = k => { try { return localStorage.getItem(`stimming.${ID}.${k}`); } catch { return null; } };
const save = (k, v) => { try { localStorage.setItem(`stimming.${ID}.${k}`, String(v)); } catch { /* storage is optional */ } };
const qa = new URLSearchParams(location.search);
let frozen = reduced();

/* ---------- state ---------- */
const pick0 = FRUITS.some(f => f.id === saved('pick')) ? saved('pick') : FRUITS[0].id;
let F = FRUITS.find(f => f.id === pick0);
// Each fruit keeps its own fuzz; a fuzzy orange is allowed.
const fuzzOf = f => { const v = saved(`fuzz.${f.id}`); const n = Number(v); return v !== null && n >= 0 && n <= 1 ? n : f.fuzz.k; };
const st = {
  fuzz: fuzzOf(F),
  // The swap: the old fruit rolls out, the new one rolls in.
  rollX: 0, rollV: 0, swapTo: null,
  // Open: 0 whole, 1 two halves apart. A spring carries it.
  open: 0, openV: 0, openTo: 0,
  // Squash along the vertical: 1 at rest. A spring carries it.
  sq: 1, sqV: 0, sqTo: 1,
  // The hop after a release or a slice.
  hop: 0, hopV: 0,
  // The tilt the body leans, from a drag.
  tilt: new THREE.Vector2(), tiltV: new THREE.Vector2(),
  // The press: which half, where, and how deep.
  squeeze: false, keySqueeze: false,
  // Time since the slice, for the blade flash and the juice.
  sliceT: 9,
};

/* ---------- bar ---------- */
const ui = initPage({ id: ID, bar: {
  choice: {
    label: 'Fruit', value: F.id,
    options: FRUITS.map((f, i) => ({ value: f.id, label: f.label, key: String((i + 1) % 10) })),
    onPick: v => { swap(v); touch(); },
  },
  actions: [
    { verb: 'slice', label: 'Slice', key: 'Space', onPress: () => toggle() },
    { verb: 'squeeze', label: 'Squeeze', key: 's', hold: true, onDown: () => { st.keySqueeze = true; touch(); }, onUp: () => { st.keySqueeze = false; touch(); } },
  ],
  slider: { label: 'Fuzz', min: 0, max: 1, step: 0.01, value: st.fuzz, onInput: v => { st.fuzz = v; save(`fuzz.${F.id}`, v); touch(); } },
  quality: true,
  reset: () => { for (const f of FRUITS) save(`fuzz.${f.id}`, f.fuzz.k); st.fuzz = F.fuzz.k; ui.slider?.set?.(st.fuzz); touch(); },
  keys: [['press', 'squish'], ['swipe', 'slice'], ['tap', 'wobble'], ['space', 'slice']],
  help: [
    ['press', 'Press the fruit to squish it; it springs back'],
    ['swipe', 'Swipe across it to slice it in two'],
    ['tap', 'Tap a half to make it wobble; tap the gap to join them'],
    ['space', 'Space slices or joins, hold S to squeeze, 1 to 0 pick a fruit'],
  ],
} });
const introDone = playIntro({ ready: pageReady() });
const kit = audioKit({ keys: new Set([' ', 's', 'S', ...'1234567890']), sleepMs: 1500 });
const snd = fruitSound(kit);

/* ---------- three ---------- */
let renderer = null, scene = null, camera = null, post = null, fuzz = null, juice = null;
let root = null, halves = [], floor = null, sky = null;
const D = detail({ maxDpr: 1.5, budget: 2.4e6, steps: 3, settle: 2, onChange: () => resize(true) });

// The light rig, shared by every material.
const L = {
  uKeyDir: { value: new THREE.Vector3(-0.55, 0.78, 0.62).normalize() },
  uKeyCol: { value: new THREE.Color(1.0, 0.93, 0.80).multiplyScalar(1.55) },
  uRimDir: { value: new THREE.Vector3(0.45, 0.5, -0.78).normalize() },
  uRimCol: { value: new THREE.Color(1.0, 0.82, 0.5).multiplyScalar(2.3) },
  uSky: { value: new THREE.Color(0.08, 0.14, 0.13) },
  uGround: { value: new THREE.Color(0.05, 0.035, 0.022) },
  uTime: { value: 0 },
  uFuzz: { value: st.fuzz },
  uGlow: { value: 0.55 },
};
const halfU = side => ({ ...L, uSide: { value: side }, uDent: { value: new THREE.Vector4(0, 0, 0, 0) }, uJig: { value: new THREE.Vector4(0, 0, 0, 0) }, uJigT: { value: 9 } });
const FLOOR_Y = -0.815;

function makeFloor() {
  const g = new THREE.PlaneGeometry(400, 400);
  g.rotateX(-Math.PI / 2);
  const m = new THREE.ShaderMaterial({
    uniforms: { ...L, uShadow: { value: [new THREE.Vector4(), new THREE.Vector4()] }, uBg: { value: new THREE.Color() } },
    vertexShader: 'varying vec3 vW; void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: /* glsl */`
      uniform vec3 uKeyCol, uSky, uBg;
      uniform vec4 uShadow[2];
      varying vec3 vW;
      void main() {
        float d = length(vW.xz * vec2(0.8, 1.0));
        vec3 col = vec3(0.018, 0.026, 0.022) * (1.0 + uKeyCol * 0.5 * exp(-d * d * 0.18));
        // Soft contact shadows: one blob under each half.
        float sh = 1.0;
        for (int i = 0; i < 2; i++) {
          vec2 q = (vW.xz - uShadow[i].xy) / uShadow[i].zw;
          sh *= 1.0 - 0.8 * exp(-dot(q, q) * 1.6);
        }
        col *= sh;
        col = mix(col, uBg, smoothstep(2.5, 9.0, d));
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  return new THREE.Mesh(g, m);
}

// Far warm lamps: the lens opens them into soft discs.
function makeLamps() {
  const g = new THREE.Group();
  const m = new THREE.ShaderMaterial({ vertexShader: 'void main() { gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0); }', fragmentShader: 'uniform vec3 uC; void main() { gl_FragColor = vec4(uC, 1.0); }', uniforms: { uC: { value: new THREE.Color(2.4, 1.5, 0.75) } } });
  const geo = new THREE.SphereGeometry(0.13, 10, 8);
  const P = [[-6.5, 0.3, -15], [-3.8, 1.0, -18], [-1.6, -0.1, -20], [2.9, 0.7, -17], [5.6, 0.1, -14], [8.2, 1.2, -19], [-9.2, -0.2, -17]];
  for (const [x, y, z] of P) { const s = new THREE.Mesh(geo, m); s.position.set(x, y, z); g.add(s); }
  return g;
}

function makeSky() {
  const g = new THREE.SphereGeometry(30, 32, 16);
  const m = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false,
    uniforms: { ...L, uBg: { value: new THREE.Color() } },
    vertexShader: 'varying vec3 vD; void main() { vD = position; gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0); }',
    fragmentShader: /* glsl */`
      uniform vec3 uRimDir, uRimCol, uBg;
      varying vec3 vD;
      void main() {
        vec3 d = normalize(vD);
        // A soft glow where the rim light stands behind the fruit.
        float g = pow(max(dot(d, normalize(vec3(0.35, 0.2, -1.0))), 0.0), 5.0) * smoothstep(-0.05, 0.15, d.y);
        vec3 col = uBg + uRimCol * g * 0.02 + vec3(0.0, 0.006, 0.005) * smoothstep(-0.2, 0.4, d.y);
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  return new THREE.Mesh(g, m);
}

async function setup() {
  renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
  const ext = renderer.extensions;
  if (!ext.has('EXT_color_buffer_float') && !ext.has('EXT_color_buffer_half_float')) throw new Error('no float targets');
  const canvas = renderer.domElement;
  canvas.setAttribute('aria-hidden', 'true');
  stage.append(canvas);
  canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); halt(); });
  camera = new THREE.PerspectiveCamera(30, 1.6, 0.1, 80);
  scene = new THREE.Scene();
  const bg = new THREE.Color(0.006, 0.010, 0.009);
  scene.background = bg;
  floor = makeFloor();
  floor.position.y = FLOOR_Y;
  floor.material.uniforms.uBg.value = bg;
  sky = makeSky();
  sky.material.uniforms.uBg.value = bg;
  scene.add(floor, sky, makeLamps());
  root = new THREE.Group();
  root.matrixAutoUpdate = false;
  scene.add(root);
  juice = makeJuice(L);
  scene.add(juice.mesh);
  post = makePost(renderer, L);
  build(F);
}

// Build fruit f in place of the old one.
function build(f) {
  if (halves.length) {
    fuzz.dispose();
    for (const h of halves) {
      root.remove(h);
      h.traverse(o => { if (o.isMesh) { o.geometry.dispose(); o.material.dispose(); } });
    }
  }
  F = f;
  halves = [0, 1].map(i => {
    const h = makeHalf(F, halfU(i ? -1 : 1), i ? 0.035 : -0.035, 17 + i * 31);
    h.userData.i = i;
    h.userData.dent = { depth: 0, v: 0, to: 0 };
    root.add(h);
    return h;
  });
  fuzz = makeFuzz(halves, L, F);
  fuzz.setLevel(D.level, D.rung);
  if (H) fuzz.setPx(2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) / H);
  juice.setTint(F.juice);
  L.uGlow.value = F.glow;
  st.fuzz = fuzzOf(F);
  ui.slider?.set?.(st.fuzz);
  st.open = st.openTo = st.openV = 0;
  // New shaders compile now, in one hitch, not over the next frames.
  // The hitch is not a slow device: the slow-frame watch starts over.
  if (started) { renderer.compile(scene, camera); D.reset(); }
}

// Pick a fruit: the one on stage rolls out, the new one rolls in.
function swap(id) {
  if (id === (st.swapTo ?? F.id)) return;
  st.swapTo = id;
  save('pick', id);
  ui.choice?.set(id);
  if (frozen || !started) { build(FRUITS.find(f => f.id === id)); st.swapTo = null; st.rollX = st.rollV = 0; return; }
  st.rollV = Math.min(st.rollV, -2);
}

/* ---------- motion ---------- */
// A damped spring: k stiffness, z damping ratio.
function spring(x, v, to, k, z, dt) {
  const w = Math.sqrt(k), a = -k * (x - to) - 2 * z * w * v;
  v += a * dt;
  return [x + v * dt, v];
}
let openX = 0.78;
const OPEN_Z = 0.2, OPEN_YAW = 1.0, OPEN_TILT = 0.42;
let simT = 0, amb = 0;
const M4 = new THREE.Matrix4(), S4 = new THREE.Matrix4(), T4 = new THREE.Matrix4(), R4 = new THREE.Matrix4();

function step(dt) {
  const n = Math.max(1, Math.ceil(dt / (1 / 120))), h = dt / n;
  const squeezing = st.squeeze || st.keySqueeze;
  for (let i = 0; i < n; i++) {
    [st.open, st.openV] = spring(st.open, st.openV, st.openTo, 60, 0.42, h);
    // Closed halves meet and bounce: they never pass through each other.
    if (st.open < 0) {
      if (st.openV < -0.4) snd.join(0);
      st.open = 0;
      st.openV = Math.abs(st.openV) * 0.22;
    }
    const sqTo = squeezing ? 0.72 : 1;
    [st.sq, st.sqV] = spring(st.sq, st.sqV, sqTo, squeezing ? 90 : 160, squeezing ? 0.7 : 0.16, h);
    [st.hop, st.hopV] = spring(st.hop, st.hopV, 0, 120, 0.3, h);
    for (const ax of ['x', 'y']) {
      const r = spring(st.tilt[ax], st.tiltV[ax], 0, 110, 0.22, h);
      st.tilt[ax] = r[0]; st.tiltV[ax] = r[1];
    }
    for (const hf of halves) {
      const u = hf.userData.skin.material.uniforms;
      const d = hf.userData.dent;
      [d.depth, d.v] = spring(d.depth, d.v, d.to, 140, 0.32, h);
      u.uDent.value.w = d.depth;
      u.uJigT.value += h;
      u.uJig.value.w *= Math.exp(-h * 3.2);
    }
  }
  // The roll: out to the left, a rebuild, then in from the right on a spring.
  if (st.swapTo) {
    st.rollV -= 26 * dt;
    st.rollX += st.rollV * dt;
    if (st.rollX < -6) {
      build(FRUITS.find(f => f.id === st.swapTo));
      st.swapTo = null;
      st.rollX = 6; st.rollV = -9;
    }
  } else {
    for (let i = 0; i < n; i++) {
      const was = st.rollX;
      [st.rollX, st.rollV] = spring(st.rollX, st.rollV, 0, 45, 0.5, h);
      // It lands: a squash as it stops.
      if (was > 0.05 && st.rollX <= 0.05 && st.rollV < -1) { st.sqV -= 2.2; snd.join(0); }
    }
  }
  st.sliceT += dt;
  simT += dt;
  // Ambient drift: a slow breath, off in reduced motion.
  amb += frozen ? 0 : dt * timeK;
  L.uTime.value = simT;
  L.uFuzz.value = st.fuzz;
  juice.step(dt, FLOOR_Y);
  fuzz.step(dt, st);
  snd.update(dt, st);
  const lively = Math.abs(st.openV) > 0.01 || Math.abs(st.open - st.openTo) > 0.002 || Math.abs(st.sqV) > 0.01 || Math.abs(st.sq - (squeezing ? 0.72 : 1)) > 0.002
    || Math.abs(st.hopV) > 0.01 || st.tiltV.length() > 0.01 || st.tilt.length() > 0.002 || squeezing || down
    || halves.some(hf => Math.abs(hf.userData.dent.v) > 0.01 || Math.abs(hf.userData.dent.depth - hf.userData.dent.to) > 0.001 || hf.userData.skin.material.uniforms.uJig.value.w > 0.001)
    || juice.busy || fuzz.busy || !!st.swapTo || Math.abs(st.rollX) > 0.002 || Math.abs(st.rollV) > 0.01;
  return { lively };
}

const V1 = new THREE.Vector3();
function place() {
  // The root: a breath, a hop, a lean, then squash along the vertical.
  const breath = frozen ? 0 : Math.sin(amb * 1.3) * 0.012;
  const s = st.sq * (1 + breath), w = 1 / Math.sqrt(s);
  // The squash keeps the bottom on the floor.
  T4.makeTranslation(st.rollX, FLOOR_Y + (F.rest ?? F.B) * s + st.hop * 0.35, 0);
  // A roll turns it about its own middle as it travels.
  R4.makeRotationFromEuler(new THREE.Euler(st.tilt.y * 0.35, 0, -st.tilt.x * 0.35 - st.rollX / F.B));
  S4.makeScale(w, s, w);
  M4.copy(T4).multiply(R4).multiply(S4);
  root.matrix.copy(M4);
  root.matrixWorldNeedsUpdate = true;
  const o = st.open;
  const c = clamp(o, 0, 1.3);
  // Whole, the cut faces hide: a dent must not show them through the skin.
  const faces = st.openTo > 0 || o > 0.02;
  for (const hf of halves) for (const p of hf.userData.faceParts) p.visible = faces;
  // Whole, the fruit turns its stem end a little toward the eye.
  root.matrix.multiply(R4.makeRotationY(-0.45 * (1 - c)));
  // Open, each half swings its face to the eye and rests tilted back.
  const tilt = OPEN_TILT * c;
  const lift = Math.sqrt((F.A * Math.sin(tilt)) ** 2 + (F.B * Math.cos(tilt)) ** 2) - F.B;
  halves[0].position.set(-openX * o, lift, OPEN_Z * o);
  halves[0].rotation.set(0, -OPEN_YAW * o, tilt);
  halves[1].position.set(openX * o, lift, OPEN_Z * o);
  halves[1].rotation.set(0, Math.PI + OPEN_YAW * o, tilt);
  // A soft contact shadow under each half.
  const sh = floor.material.uniforms.uShadow.value;
  halves.forEach((hf, i) => {
    hf.updateMatrixWorld(true);
    V1.set(-F.A * 0.4 * c, 0, 0).applyMatrix4(hf.matrixWorld);
    sh[i].set(V1.x, V1.z, 0.95 - 0.35 * c, 0.8);
  });
}

/* ---------- framing ---------- */
const eye = new THREE.Vector3(), aim = new THREE.Vector3();
const vq = k => qa.get(k)?.split(',').map(Number);
// The eye's distance for the whole fruit, and for the open halves.
const dist = { whole: 6, open: 6 };
function frame3() {
  const asp = cssW / cssH;
  camera.aspect = asp;
  camera.fov = 30;
  const t = Math.tan(THREE.MathUtils.degToRad(15));
  // Fit a width and a height in the frame, with a margin.
  const fit = (w, h) => Math.max(h / (2 * t), w / (2 * t * asp)) * 1.12;
  openX = asp < 1 ? 0.6 : 0.78;
  dist.whole = Math.max(5.0, fit(2.3, 2.0));
  dist.open = Math.max(5.0, fit(2 * (openX + 0.85), 2.0));
  aim.set(0, -0.12, 0);
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
  post.resize(w, h, D.level, D.rung);
  fuzz.setLevel(D.level, D.rung);
  frame3();
  fuzz.setPx(2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) / h);
  wake();
}

// The eye sways a little toward the pointer.
const look = new THREE.Vector2(), lookTo = new THREE.Vector2();
function render() {
  const k = 1 - Math.exp(-lastDt * 3);
  look.lerp(lookTo, frozen ? 1 : k);
  // The eye steps back as the halves open, so both stay in frame.
  const d = dist.whole + (dist.open - dist.whole) * clamp(st.open, 0, 1);
  eye.set(0, 0.22 * d, d);
  if (vq('eye')?.length === 3) eye.fromArray(vq('eye'));
  camera.position.set(eye.x + look.x * 0.35, eye.y + look.y * 0.2, eye.z);
  camera.lookAt(aim);
  camera.updateMatrixWorld();
  post.render(scene, camera, { frame: frozen ? 0 : frameNo, focus: camera.position.distanceTo(aim) - 0.5 - 0.2 * st.open, aperture: 0.03 });
}

/* ---------- frame loop ---------- */
let raf = 0, timer = 0, last = 0, lastDt = 0, visible = true, lastInput = 0, timeK = 1, frameNo = 0;
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
    lively = s.lively || look.distanceTo(lookTo) > 0.002;
    place();
    render();
    D.frame(dt);
    frameNo++;
    again = lively || (!frozen && timeK > 0);
  } finally {
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
function slice(dir = 1) {
  if (st.openTo === 1) return;
  st.openTo = 1;
  st.openV += 0.5;
  st.sqV -= 2.5;
  st.hopV += 2.2;
  st.sliceT = 0;
  juice.burst(root, dir, frozen ? 0.4 : 1);
  snd.slice();
}
function join() {
  if (st.openTo === 0) return;
  st.openTo = 0;
  st.openV -= 0.6;
}
function toggle() { (st.openTo ? join : slice)(1); touch(); }

/* ---------- gestures ---------- */
// Press squishes; a fast swipe across the fruit slices it; a tap wobbles.
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
const local = e => { const r = stage.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
function hitAt(x, y) {
  ndc.set((x / cssW) * 2 - 1, -(y / cssH) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  const hs = ray.intersectObjects(halves.map(h => h.userData.skin).concat(halves.map(h => h.userData.bed)), false);
  if (!hs.length) return null;
  const o = hs[0].object;
  const hf = halves.find(h => h.userData.skin === o || h.userData.bed === o);
  return { half: hf, p: hf.worldToLocal(hs[0].point.clone()) };
}
// A dent at a point on a half; depth in half units.
function press(hit, depth) {
  const d = hit.half.userData.dent;
  hit.half.userData.skin.material.uniforms.uDent.value.set(hit.p.x, hit.p.y, hit.p.z, d.depth);
  d.to = depth;
}
function release(hit) {
  for (const hf of halves) hf.userData.dent.to = 0;
  if (hit) {
    const u = hit.half.userData.skin.material.uniforms;
    u.uJig.value.set(hit.p.x, hit.p.y, hit.p.z, frozen ? 0.006 : 0.016);
    u.uJigT.value = 0;
  }
}
let down = false, pid = null, at0 = null, atN = null, tN = 0, moved = false, held = false, holdT = 0, hit0 = null, crossed = 0, path = [];
stage.addEventListener('pointerdown', e => {
  if (e.button !== 0 || !renderer || !started || (e.target !== renderer.domElement && e.target !== stage)) return;
  try { stage.setPointerCapture(e.pointerId); } catch { /* capture is optional */ }
  pid = e.pointerId; at0 = local(e); atN = at0; tN = performance.now(); moved = false; held = false; down = true;
  hit0 = hitAt(at0[0], at0[1]);
  path = [at0];
  crossed = 0;
  clearTimeout(holdT);
  if (hit0) { press(hit0, 0.05); snd.squish(0.4); }
  // A hold on the fruit squeezes it flat.
  holdT = setTimeout(() => {
    if (!down || moved) return;
    held = true;
    if (hit0 && !st.openTo) { st.squeeze = true; press(hit0, 0.16); snd.squish(1); }
    touch();
  }, 260);
  touch();
});
stage.addEventListener('pointermove', e => {
  const p = local(e);
  lookTo.set((p[0] / cssW - 0.5) * 2, -(p[1] / cssH - 0.5) * 2);
  if (!down || e.pointerId !== pid) { wake(); return; }
  if (!moved && !held && Math.hypot(p[0] - at0[0], p[1] - at0[1]) >= 8) {
    moved = true;
    clearTimeout(holdT);
    stage.classList.add('drag');
  }
  if (moved) {
    path.push(p);
    // A drag pulls the whole fruit; it leans after the pointer.
    const dx = (p[0] - atN[0]) / cssW, dy = (p[1] - atN[1]) / cssH;
    const now = performance.now(), dt = Math.max(1, now - tN) / 1000;
    st.tiltV.x += clamp(dx / dt, -6, 6) * 0.6;
    st.tiltV.y += clamp(dy / dt, -6, 6) * 0.3;
    atN = p; tN = now;
    // The path crosses the fruit's middle: count it as a cut.
    if (!st.openTo && hit0 === null) {
      const h = hitAt(p[0], p[1]);
      if (h) crossed |= 1;
      else if (crossed & 1) crossed |= 2;
    } else if (!st.openTo && hit0) {
      const h = hitAt(p[0], p[1]);
      if (!h) crossed |= 2;
    }
    if (!st.openTo && (crossed & 2) && swipeLong()) { slice(Math.sign(p[0] - at0[0]) || 1); release(null); }
    touch();
  }
});
// A swipe counts when it runs far enough.
function swipeLong() {
  const a = path[0], b = path[path.length - 1];
  return Math.hypot(b[0] - a[0], b[1] - a[1]) > Math.min(cssW, cssH) * 0.18;
}
function end(e) {
  if (!down || (e && e.pointerId !== pid)) return;
  clearTimeout(holdT);
  down = false; pid = null;
  stage.classList.remove('drag');
  const wasSqueeze = st.squeeze;
  st.squeeze = false;
  if (wasSqueeze) { st.sqV += 3.5; st.hopV += 2.5; snd.boing(1); }
  if (!moved && !held) {
    // A tap: wobble the half under it; a tap in the gap joins.
    if (hit0) { st.sqV -= 1.6; snd.boing(0.5); }
    else if (st.openTo) join();
  }
  release(hit0);
  hit0 = null;
  touch();
}
['pointerup', 'pointercancel', 'lostpointercapture'].forEach(t => stage.addEventListener(t, end));
stage.addEventListener('pointerleave', () => { lookTo.set(0, 0); wake(); });

/* ---------- life cycle ---------- */
whenVisible(stage, on => {
  visible = on;
  if (on) wake();
  else { halt(); snd.hide(); }
});
onReducedChange(on => { frozen = on; wake(); });
sound.onChange(on => { if (on) touch(); });
new ResizeObserver(() => resize()).observe(stage);
if (qa.has('qa')) globalThis.__fruit = { st, get halves() { return halves; }, get F() { return F; }, swap, slice, join, toggle, D, post: () => post, fuzz: () => fuzz, juice: () => juice, cam: () => camera, renderer: () => renderer, get frames() { return frameNo; }, get raf() { return raf || timer; } };

mark('build');
try {
  await setup();
  if (qa.get('open') === '1') { st.open = st.openTo = 1; }
  resize(true);
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
