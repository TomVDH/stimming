// Fruit slice: ten studio-lit fruits to cut, squeeze and throw.
// three.js 0.170: custom toon shaders, juice beads, fuzz ribbons, a lens finish.
import * as THREE from 'three';
import { initPage, whenVisible, pageReady, stage as mark, reduced, onReducedChange, audioKit, sound } from '../shared/stim.js';
import { intro as playIntro } from '../shared/intro.js';
import { detail } from '../shared/detail.js';
import { makeHalf, longFaceMesh } from './half.js';
import { FRUITS } from './fruits.js';
import { makeFuzz } from './fuzz.js';
import { makeJuice } from './juice.js';
import { makeBits } from './bits.js';
import { makePost } from './post.js';
import { makePuddle, makeMirror, RECT } from './puddle.js';
import { LIGHT } from './glsl.js';
import { fruitSound } from './sound.js';
import { gestureLimits, isFlick } from './gesture.js';
import { resolveCompoundPair } from './piece-physics.js';
import { makeFruitTray } from './tray.js';
mark('libs');

const ID = 'fruit';
const stage = document.getElementById('stage');
const fail = stage.querySelector('.fail');
stage.setAttribute('role', 'group');
stage.setAttribute('aria-label', 'Fruit Slice. Pick a fruit from the ribbon. Swipe through fruit to cut it. Hold still to squeeze. Flick an open piece to throw it. Space slices or joins and cleans the table. Keys 1 to 0 pick the first ten fruits.');
const live = document.createElement('span');
live.setAttribute('role', 'status');
live.setAttribute('aria-live', 'polite');
Object.assign(live.style, { position: 'absolute', width: '1px', height: '1px', overflow: 'hidden', clipPath: 'inset(50%)', whiteSpace: 'nowrap' });
stage.append(live);
const cue = document.createElement('span');
cue.setAttribute('aria-hidden', 'true');
Object.assign(cue.style, {
  position: 'absolute', zIndex: '3', left: '0', top: '0', height: '2px', width: '0', pointerEvents: 'none',
  transformOrigin: '0 50%', borderRadius: '999px', opacity: '0', background: 'oklch(0.96 0.01 90 / 0.9)',
  boxShadow: '0 0 10px oklch(0.88 0.12 80 / 0.55)', transition: 'opacity 100ms ease-out',
});
stage.append(cue);
const announce = text => { live.textContent = ''; requestAnimationFrame(() => { live.textContent = text; }); };
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const saved = k => { try { return localStorage.getItem(`stimming.${ID}.${k}`); } catch { return null; } };
const save = (k, v) => { try { localStorage.setItem(`stimming.${ID}.${k}`, String(v)); } catch { /* storage is optional */ } };
const qa = new URLSearchParams(location.search);
let frozen = reduced();
let activePiece = null, keyPiece = null;

/* ---------- state ---------- */
const pick0 = FRUITS.some(f => f.id === saved('pick')) ? saved('pick') : FRUITS[0].id;
let F = FRUITS.find(f => f.id === pick0);
// Each fruit keeps its own fuzz; a fuzzy orange is allowed.
const st = {
  fuzz: F.fuzz.k,
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
    options: FRUITS.map((f, i) => ({ value: f.id, label: f.label, ...(i < 10 ? { key: String((i + 1) % 10) } : {}) })),
    onPick: v => { swap(v); touch(); },
  },
  actions: [
    { verb: 'slice', label: 'Slice', key: 'Space', onPress: () => toggle() },
    { verb: 'flick', label: 'Flick', key: 'f', onPress: () => { flickSelected(); touch(); } },
    { verb: 'squeeze', label: 'Squeeze', key: 's', hold: true, onDown: () => {
      if (st.openTo) {
        keyPiece = activePiece?.parent ? activePiece : halves[0];
        if (keyPiece) keyPiece.userData.body.squeeze = true;
      } else st.keySqueeze = true;
      touch();
    }, onUp: () => {
      st.keySqueeze = false;
      if (keyPiece) finishPieceSqueeze(keyPiece);
      keyPiece = null;
      touch();
    } },
  ],
  quality: true,
  reset: () => resetFruit(),
  keys: [['swipe', 'slice'], ['hold', 'squeeze'], ['flick', 'toss'], ['space', 'slice / join']],
  help: [
    ['swipe', 'Draw a line through fruit to cut it; the glowing trail shows the cut'],
    ['hold', 'Hold still on fruit to squeeze; release to spring and squirt'],
    ['flick', 'When open, flick a piece to throw it and shake its contents out'],
    ['space', 'Space slices or joins cleanly; F tosses the last-touched open piece; 1 to 0 pick a fruit'],
  ],
} });
const fruitTray = makeFruitTray(stage.closest('.stim-frame') || stage.parentElement, FRUITS, () => st.swapTo ?? F.id, id => { swap(id); touch(); });
const flickAction = ui.action('flick');
const sliceChip = document.querySelector('.s2-chip[aria-keyshortcuts="Space"]');
function syncActions() {
  const open = !!st.openTo;
  const label = sliceChip?.querySelector('.s2-label');
  if (label) label.textContent = open ? 'Join' : 'Slice';
  flickAction.disabled = !open;
}
syncActions();
const introDone = playIntro({ ready: pageReady() });
const kit = audioKit({ keys: new Set([' ', 's', 'S', 'f', 'F', ...'1234567890']), sleepMs: 1500 });
const snd = fruitSound(kit);

/* ---------- three ---------- */
let renderer = null, scene = null, camera = null, post = null, fuzz = null, juice = null, puddle = null, mirror = null, bits = null;
let root = null, halves = [], floor = null, sky = null;
const D = detail({ maxDpr: 1.5, budget: 2.4e6, steps: 3, settle: 2, onChange: () => resize(true) });

// The studio light rig stays fixed.
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
const halfU = side => ({ ...L, uSide: { value: side }, uAbc: { value: new THREE.Vector3(1, 1, 1) }, uCut: { value: 0 }, uSec: { value: new THREE.Vector4(0, 6.2832, 0, 0) }, uDent: { value: new THREE.Vector4(0, 0, 0, 0) }, uJig: { value: new THREE.Vector4(0, 0, 0, 0) }, uJigT: { value: 9 } });
const FLOOR_Y = -0.815;

function makeFloor() {
  const g = new THREE.PlaneGeometry(400, 400);
  g.rotateX(-Math.PI / 2);
  const m = new THREE.ShaderMaterial({
    uniforms: {
      ...L, uShadow: { value: Array.from({ length: 8 }, () => new THREE.Vector4(99, 99, 1, 1)) },
      uShadowK: { value: new Float32Array(8) }, uBg: { value: new THREE.Color() },
      uPud: { value: null }, uRefl: { value: null }, uTexMat: { value: new THREE.Matrix4() }, uRect: { value: RECT }, uJuicy: { value: 0 },
    },
    vertexShader: 'varying vec3 vW; void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: /* glsl */`
      ${LIGHT}
      uniform vec3 uBg;
      uniform vec4 uShadow[8], uRect;
      uniform float uShadowK[8];
      uniform sampler2D uPud, uRefl;
      uniform mat4 uTexMat;
      uniform float uJuicy;
      varying vec3 vW;
      void main() {
        float d = length(vW.xz * vec2(0.8, 1.0));
        vec3 col = vec3(0.018, 0.026, 0.022) * (1.0 + uKeyCol * 0.5 * exp(-d * d * 0.18));
        // Soft contact shadows: one blob under each half.
        float sh = 1.0;
        for (int i = 0; i < 8; i++) {
          vec2 q = (vW.xz - uShadow[i].xy) / uShadow[i].zw;
          sh *= 1.0 - 0.78 * uShadowK[i] * exp(-dot(q, q) * 1.6);
        }
        col *= sh;
        // The puddle: juice over the floor, its rim curved, its top a wet mirror.
        vec2 pu = (vW.xz - uRect.xy) / uRect.zw;
        if (uJuicy > 0.5 && pu.x > 0.0 && pu.x < 1.0 && pu.y > 0.0 && pu.y < 1.0) {
          vec4 P = texture2D(uPud, pu);
          float h = P.r;
          float cover = smoothstep(0.0005, 0.0025, h);
          if (cover > 0.001) {
            vec3 tint = P.gba / max(h, 1e-5);
            float e = 1.5 / 320.0;
            float hx = texture2D(uPud, pu + vec2(e, 0.0)).r - texture2D(uPud, pu - vec2(e, 0.0)).r;
            float hz = texture2D(uPud, pu + vec2(0.0, e)).r - texture2D(uPud, pu - vec2(0.0, e)).r;
            // The rim bends steeply, the middle lies flat: surface tension.
            vec3 n = normalize(vec3(-hx * 26.0, 1.0, -hz * 26.0));
            vec3 v = normalize(cameraPosition - vW);
            float nv = max(dot(n, v), 0.0);
            float fr = 0.02 + 0.98 * pow(1.0 - nv, 5.0);
            vec4 tc = uTexMat * vec4(vW, 1.0);
            vec3 refl = texture2D(uRefl, tc.xy / tc.w + n.xz * 0.04).rgb;
            // Under the juice the floor takes its colour; deeper juice glows with the light.
            float depth = smoothstep(0.0, 0.012, h);
            vec3 under = col * mix(vec3(1.0), tint * 1.3, depth) + tint * (uKeyCol * 0.008 + uRimCol * 0.02) * depth;
            vec3 wet = under * (1.0 - fr) + (refl + studio(reflect(-v, n), 0.01) * 0.8) * fr;
            col = mix(col, wet, cover);
          }
        }
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
  canvas.addEventListener('webglcontextlost', e => {
    e.preventDefault();
    halt();
    fail.textContent = 'The graphics context was lost. Reload Fruit Slice to continue.';
    fail.removeAttribute('hidden');
    ui.hideControls?.();
  });
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
  puddle = makePuddle(renderer);
  mirror = makeMirror(renderer);
  floor.material.uniforms.uRefl.value = mirror.texture;
  post = makePost(renderer, L);
  build(F);
}

// Build fruit f in place of the old one.
function build(f) {
  if (cores.length) clearCores();
  if (halves.length) {
    fuzz.dispose();
    for (const h of halves) if (!base.includes(h)) dropPiece(h);
    for (const h of base) {
      root.remove(h);
      h.traverse(o => { if (o.isMesh) { o.geometry.dispose(); o.material.dispose(); } });
    }
  }
  F = f;
  base = halves = [0, 1].map(i => {
    const hu = halfU(i ? -1 : 1);
    hu.uAbc.value.set(F.A, F.B, F.C);
    const h = makeHalf(F, hu, i ? 0.035 : -0.035, 17 + i * 31);
    h.userData.i = i;
    h.userData.dent = { depth: 0, v: 0, to: 0 };
    // Each half's own body: a squash, a hop, a squeeze, and juice to drip.
    h.userData.body = { sq: 1, sqV: 0, hop: 0, hopV: 0, squeeze: false, drip: 0 };
    // A hull: every third skin point, and the whole join ring, to find what touches the floor.
    const P = h.userData.skin.geometry.attributes.position, hull = [];
    for (let k = 0; k < P.count; k++) if (k % 3 === 0 || k <= 96) hull.push(P.getX(k), P.getY(k), P.getZ(k));
    h.userData.hull = new Float32Array(hull);
    h.userData.piece = newPiece(i, 0, Math.PI * 2);
    h.userData.uni = hu;
    h.userData.longs = [];
    h.matrixAutoUpdate = false;
    root.add(h);
    return h;
  });
  // The rest height: the whole fruit's lowest skin point sits on the floor.
  restY = -Math.min(...halves.map(h => { let m = 0; const a = h.userData.hull; for (let k = 1; k < a.length; k += 3) m = Math.min(m, a[k]); return m; }));
  fuzz = makeFuzz(halves, L, F);
  fuzz.setLevel(D.level, D.rung);
  if (H) fuzz.setPx(2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) / H);
  juice.setTint(F.juice);
  juice.clear();
  puddle?.wipe();
  // Loose bits: this fruit's arils, sacs or seeds; the old ones go.
  if (bits) { if (bits.mesh) scene.remove(bits.mesh); bits.dispose(); }
  bits = makeBits(halfU(1), F, v => snd.tick(v));
  if (bits.mesh) scene.add(bits.mesh);
  L.uGlow.value = F.glow;
  st.fuzz = F.fuzz.k;
  st.open = st.openTo = st.openV = 0;
  syncActions();
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
  fruitTray.sync();
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
let openX = 0.78, restY = 0.8;
// The two halves as built; halves holds the pieces on stage, the halves themselves at first.
let base = [];
// A piece opens artfully, then slides, bounces and collides on the table.
const newPiece = (side, s0, span) => ({
  side, s0, span,
  off: 0, offV: 0, offTo: 0,
  rot: 0, rotV: 0, rotTo: 0,
  slide: new THREE.Vector2(), slideV: new THREE.Vector2(),
  lift: 0, liftV: 0,
  turn: 0, turnV: 0, free: false,
  squeezes: 0, taps: 0, spent: 0,
  radius: clamp(Math.max(F.B, F.C) * (span > 6.2 ? 0.75 : 0.48), 0.24, 0.75),
  mass: Math.max(0.16, span / (Math.PI * 2)),
  contacts: [], bounds: { minX: 0, maxX: 0, minZ: 0, maxZ: 0 },
});
const OPEN_Z = 0.2, OPEN_YAW = 1.0, OPEN_TILT = 0.42;
let simT = 0, amb = 0;
const M4 = new THREE.Matrix4(), S4 = new THREE.Matrix4(), T4 = new THREE.Matrix4(), R4 = new THREE.Matrix4();
const CM = new THREE.Matrix4(), CR = new THREE.Matrix4(), CS = new THREE.Matrix4(), CT = new THREE.Matrix4();
const CQ = new THREE.Quaternion(), CE = new THREE.Euler(), CV = new THREE.Vector3(), CP = new THREE.Vector3();
const CONTACT_T = [0.12, 0.5, 0.82];
const FULL_RADIAL = [0], WEDGE_RADIAL = [0.22, 0.7];

// Six circles follow the rendered wedge: three along its length and two across
// its sector. Full halves use three wider circles. This is intentionally local,
// bounded physics rather than a general rigid-body engine.
function fillPieceContacts(hf) {
  const pc = hf.userData.piece, b = hf.userData.body, c = clamp(st.open, 0, 1.3);
  const mid = pc.s0 + pc.span / 2, hs = b.sq, hw = 1 / Math.sqrt(hs);
  CE.set(0, (pc.side ? Math.PI + OPEN_YAW * st.open : -OPEN_YAW * st.open) + pc.turn, OPEN_TILT * c);
  CQ.setFromEuler(CE);
  CV.set(0, Math.cos(mid), Math.sin(mid)).multiplyScalar(pc.span < 6.2 ? pc.off : 0);
  CR.makeRotationX(pc.rot).setPosition(CV);
  CM.makeRotationFromQuaternion(CQ);
  CS.makeScale(hw, hs, hw);
  CM.premultiply(CS).multiply(CR);
  CT.makeTranslation((pc.side ? 1 : -1) * openX * st.open + pc.slide.x, 0, OPEN_Z * st.open + pc.slide.y);
  CM.premultiply(CT);

  const full = pc.span > 6.2, radial = full ? FULL_RADIAL : WEDGE_RADIAL;
  const scale = Math.max(hw, hs), e = pc.side ? 0.035 : -0.035;
  let n = 0, minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (const t of CONTACT_T) {
    const shape = Math.max(0.08, F.shape(t, mid, e));
    const cross = Math.max(F.B, F.C) * shape;
    for (const rho of radial) {
      CP.set(-F.A * t, F.B * shape * rho * Math.cos(mid), F.C * shape * rho * Math.sin(mid)).applyMatrix4(CM);
      const angular = rho * Math.sin(Math.min(pc.span, Math.PI) * 0.5);
      const localR = full ? cross * 0.84 : cross * (Math.hypot(0.27, angular) + 0.035);
      const q = pc.contacts[n] ??= { x: 0, z: 0, r: 0 };
      q.x = CP.x; q.z = CP.z; q.r = Math.max(0.12, localR * scale);
      minX = Math.min(minX, q.x - q.r); maxX = Math.max(maxX, q.x + q.r);
      minZ = Math.min(minZ, q.z - q.r); maxZ = Math.max(maxZ, q.z + q.r);
      n++;
    }
  }
  pc.contacts.length = n;
  pc.bounds.minX = minX; pc.bounds.maxX = maxX;
  pc.bounds.minZ = minZ; pc.bounds.maxZ = maxZ;
}

let arenaX = 2, arenaZ = 1.25;
function containPiece(pc) {
  const b = pc.bounds;
  let dx = 0, dz = 0;
  if (b.minX < -arenaX) dx = -arenaX - b.minX;
  else if (b.maxX > arenaX) dx = arenaX - b.maxX;
  if (b.minZ < -arenaZ) dz = -arenaZ - b.minZ;
  else if (b.maxZ > arenaZ) dz = arenaZ - b.maxZ;
  if (dx) {
    pc.slide.x += dx;
    if (pc.slideV.x * dx < 0) {
      pc.slideV.x = Math.abs(pc.slideV.x) < 0.15 ? 0 : -pc.slideV.x * 0.3;
    }
  }
  if (dz) {
    pc.slide.y += dz;
    if (pc.slideV.y * dz < 0) {
      pc.slideV.y = Math.abs(pc.slideV.y) < 0.15 ? 0 : -pc.slideV.y * 0.3;
    }
  }
  return !!(dx || dz);
}

// Table-plane contacts keep the actual long wedges apart.
function solvePieceContacts() {
  if (st.open < 0.58 || halves.length < 2) return;
  for (let pass = 0; pass < 6; pass++) {
    for (const hf of halves) fillPieceContacts(hf);
    for (const hf of halves) {
      const pc = hf.userData.piece;
      if (pc.free && containPiece(pc)) fillPieceContacts(hf);
    }
    for (let i = 0; i < halves.length; i++) for (let j = i + 1; j < halves.length; j++) {
      const a = halves[i].userData.piece, b = halves[j].userData.piece;
      if (a.bounds.maxX < b.bounds.minX || b.bounds.maxX < a.bounds.minX || a.bounds.maxZ < b.bounds.minZ || b.bounds.maxZ < a.bounds.minZ) continue;
      if (resolveCompoundPair(a, b, a.contacts, b.contacts, ((i + j) & 1) ? 1 : -1)) {
        fillPieceContacts(halves[i]);
        fillPieceContacts(halves[j]);
      }
    }
  }
}

function step(dt) {
  const n = Math.max(1, Math.ceil(dt / (1 / 120))), h = dt / n;
  const squeezing = st.squeeze || st.keySqueeze;
  for (let i = 0; i < n; i++) {
    [st.open, st.openV] = spring(st.open, st.openV, st.openTo, 60, 0.42, h);
    if (Math.abs(st.open - st.openTo) < 0.001 && Math.abs(st.openV) < 0.01) {
      st.open = st.openTo;
      st.openV = 0;
    }
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
      const pc = hf.userData.piece;
      if (pc.free && st.openTo) {
        pc.off += pc.offV * h;
        pc.rot += pc.rotV * h;
        pc.turn += pc.turnV * h;
        pc.offV *= Math.exp(-h * 4.5);
        pc.rotV *= Math.exp(-h * (pc.lift > 0 ? 0.8 : 3.2));
        pc.turnV *= Math.exp(-h * (pc.lift > 0 ? 0.7 : 2.8));
      } else {
        [pc.off, pc.offV] = spring(pc.off, pc.offV, st.openTo ? pc.offTo : 0, 60, 0.5, h);
        [pc.rot, pc.rotV] = spring(pc.rot, pc.rotV, st.openTo ? pc.rotTo : 0, 60, 0.5, h);
        [pc.turn, pc.turnV] = spring(pc.turn, pc.turnV, 0, 65, 0.65, h);
      }
      if (st.openTo) {
        pc.liftV -= 8.6 * h;
        pc.lift += pc.liftV * h;
        pc.slide.addScaledVector(pc.slideV, h);
        pc.slideV.multiplyScalar(Math.exp(-h * (pc.lift > 0 ? 0.75 : 4.2)));
        if (!pc.free) pc.rotV *= Math.exp(-h * (pc.lift > 0 ? 0.35 : 2.4));
        if (pc.lift < 0) {
          pc.lift = 0;
          if (pc.liftV < -0.35) pc.liftV *= -0.24;
          else pc.liftV = 0;
        }
      } else {
        [pc.slide.x, pc.slideV.x] = spring(pc.slide.x, pc.slideV.x, 0, 72, 0.72, h);
        [pc.slide.y, pc.slideV.y] = spring(pc.slide.y, pc.slideV.y, 0, 72, 0.72, h);
        [pc.lift, pc.liftV] = spring(pc.lift, pc.liftV, 0, 90, 0.72, h);
        [pc.turn, pc.turnV] = spring(pc.turn, pc.turnV, 0, 72, 0.72, h);
      }
      const b = hf.userData.body;
      [b.sq, b.sqV] = spring(b.sq, b.sqV, b.squeeze ? 0.74 : 1, b.squeeze ? 90 : 170, b.squeeze ? 0.7 : 0.15, h);
      [b.hop, b.hopV] = spring(b.hop, b.hopV, 0, 120, 0.3, h);
      const u = hf.userData.skin.material.uniforms;
      const d = hf.userData.dent;
      [d.depth, d.v] = spring(d.depth, d.v, d.to, 140, 0.32, h);
      u.uDent.value.w = d.depth;
      u.uJigT.value += h;
      u.uJig.value.w *= Math.exp(-h * 3.2);
    }
    if (st.openTo) solvePieceContacts();
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
  // Joined again: the wedges become the two halves once more.
  if (!st.openTo && st.open < 0.03 && halves.length > 2) mergeBack();
  // A squeezed half drips juice from its face.
  for (const hf of halves) {
    const b = hf.userData.body;
    if (!b.squeeze || st.open < 0.5) continue;
    b.drip += dt * 30;
    if (b.drip >= 1) { squirtFrom(hf, Math.floor(b.drip), 0.5); b.drip %= 1; }
  }
  st.sliceT += dt;
  simT += dt;
  // Ambient drift: a slow breath, off in reduced motion.
  amb += frozen ? 0 : dt * timeK;
  L.uTime.value = simT;
  L.uFuzz.value = st.fuzz;
  juice.step(dt, FLOOR_Y, (p, r) => puddle.splat(p.x, p.z, r, F.juice));
  puddle.step(dt);
  // The bits bounce off the floor and off the fruit's pieces.
  if (bits.busy) {
    let si = 0;
    for (const hf of halves) {
      hf.updateMatrixWorld(true);
      const pc = hf.userData.piece;
      for (const x of [-0.12, -0.46, -0.78]) {
        const sp = spheres[si] ??= { c: new THREE.Vector3(), v: new THREE.Vector3(), r: 0 };
        sp.c.set(F.A * x, 0, 0).applyMatrix4(hf.matrixWorld);
        sp.v.set(pc.slideV.x, pc.liftV, pc.slideV.y);
        sp.r = clamp(pc.radius * 0.62, 0.12, 0.38);
        si++;
      }
    }
    spheres.length = si;
  }
  bits.step(dt, FLOOR_Y, spheres);
  const coresBusy = stepCores(dt);
  fuzz.step(dt, st);
  snd.update(dt, st);
  const lively = Math.abs(st.openV) > 0.01 || Math.abs(st.open - st.openTo) > 0.002 || Math.abs(st.sqV) > 0.01 || Math.abs(st.sq - (squeezing ? 0.72 : 1)) > 0.002
    || Math.abs(st.hopV) > 0.01 || st.tiltV.length() > 0.01 || st.tilt.length() > 0.002 || squeezing || down
    || halves.some(hf => Math.abs(hf.userData.dent.v) > 0.01 || Math.abs(hf.userData.dent.depth - hf.userData.dent.to) > 0.001 || hf.userData.skin.material.uniforms.uJig.value.w > 0.001)
    || halves.some(hf => { const pc = hf.userData.piece; return Math.abs(pc.offV) > 0.01 || Math.abs(pc.rotV) > 0.01 || Math.abs(pc.turnV) > 0.01 || Math.abs(pc.off - (st.openTo && !pc.free ? pc.offTo : pc.off)) > 0.002; })
    || halves.some(hf => { const pc = hf.userData.piece; return pc.slideV.lengthSq() > 0.001 || (!st.openTo && pc.slide.lengthSq() > 0.0004) || Math.abs(pc.liftV) > 0.02 || pc.lift > 0.002; })
    || halves.some(hf => { const b = hf.userData.body; return b.squeeze || Math.abs(b.sqV) > 0.01 || Math.abs(b.sq - 1) > 0.002 || Math.abs(b.hopV) > 0.01; })
    || juice.busy || fuzz.busy || puddle.busy || bits.busy || coresBusy || !!st.swapTo || Math.abs(st.rollX) > 0.002 || Math.abs(st.rollV) > 0.01;
  return { lively };
}

const UP = new THREE.Vector3(0, 1, 0), V3 = new THREE.Vector3(), M7 = new THREE.Matrix4();
const V1 = new THREE.Vector3(), V2 = new THREE.Vector3(), Q1 = new THREE.Quaternion(), E1 = new THREE.Euler();
const M5 = new THREE.Matrix4(), M6 = new THREE.Matrix4(), T5 = new THREE.Matrix4();
function place() {
  // The root: a breath, a hop, a lean, then squash along the vertical.
  const breath = frozen ? 0 : Math.sin(amb * 1.3) * 0.012;
  const s = st.sq * (1 + breath), w = 1 / Math.sqrt(s);
  // The squash keeps the bottom on the floor.
  T4.makeTranslation(st.rollX, FLOOR_Y + restY * s + st.hop * 0.35, 0);
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
  for (const hf of halves) for (const p of hf.userData.faceParts) p.visible = faces && !p.userData.cutHidden && !p.userData.ejected;
  // Open, light can enter a half through its cut face.
  for (const hf of halves) hf.userData.skin.material.uniforms.uCut.value = faces ? 1 : 0;
  // Whole, the fruit turns its stem end a little toward the eye.
  root.matrix.multiply(R4.makeRotationY(-0.45 * (1 - c)));
  // Open, each half swings its face to the eye and rests tilted back.
  // Its lowest point is found in its new pose, so it sits on the floor, never in it.
  const tilt = OPEN_TILT * c;
  for (const hf of halves) {
    const b = hf.userData.body, pc = hf.userData.piece, i = pc.side;
    E1.set(0, (i ? Math.PI + OPEN_YAW * o : -OPEN_YAW * o) + pc.turn, tilt);
    Q1.setFromEuler(E1);
    // A wedge slides out along its own middle and turns a little about the axis.
    const mid = pc.s0 + pc.span / 2;
    V3.set(0, Math.cos(mid), Math.sin(mid)).multiplyScalar(pc.span < 6.2 ? pc.off : 0);
    M7.makeRotationX(pc.rot).setPosition(V3);
    const a = hf.userData.hull;
    let minY = 0;
    for (let k = 0; k < a.length; k += 3) { V2.set(a[k], a[k + 1], a[k + 2]).applyMatrix4(M7).applyQuaternion(Q1); if (V2.y < minY) minY = V2.y; }
    // Joined halves share one origin, even for asymmetric fruit profiles.
    minY = -restY + (minY + restY) * clamp(o, 0, 1);
    // Its own squash keeps that lowest point on the floor; the hop lifts it.
    const hs = b.sq, hw = 1 / Math.sqrt(hs);
    M5.makeRotationFromQuaternion(Q1);
    M6.makeScale(hw, hs, hw);
    M5.premultiply(M6).multiply(M7);
    T5.makeTranslation((i ? 1 : -1) * openX * o + pc.slide.x, -restY - minY * hs + b.hop * 0.25 + pc.lift, OPEN_Z * o + pc.slide.y);
    hf.matrix.copy(T5).multiply(M5);
    hf.matrixWorldNeedsUpdate = true;
  }
  // Keep every rotating hull above the table during a fruit swap.
  if (Math.abs(st.rollX) > 0.001 || st.swapTo) {
    root.updateMatrixWorld(true);
    let low = Infinity;
    for (const hf of halves) {
      const a = hf.userData.hull;
      for (let k = 0; k < a.length; k += 3) {
        V2.set(a[k], a[k + 1], a[k + 2]).applyMatrix4(hf.matrixWorld);
        low = Math.min(low, V2.y);
      }
    }
    if (Number.isFinite(low) && low < FLOOR_Y) {
      root.matrix.elements[13] += FLOOR_Y - low;
      root.matrixWorldNeedsUpdate = true;
      root.updateMatrixWorld(true);
    }
  }
  // Every resting piece gets its own soft contact shadow.
  const sh = floor.material.uniforms.uShadow.value;
  const sk = floor.material.uniforms.uShadowK.value;
  for (let i = 0; i < sh.length; i++) {
    const hf = halves[i];
    if (!hf) { sh[i].set(99, 99, 1, 1); sk[i] = 0; continue; }
    hf.updateMatrixWorld(true);
    V1.set(-F.A * 0.4 * c, 0, 0).applyMatrix4(hf.matrixWorld);
    const pc = hf.userData.piece, air = pc.lift + hf.userData.body.hop * 0.25;
    const fade = clamp(1 - air * 1.15, 0, 1), spread = 1 + air * 0.65;
    sh[i].set(V1.x, V1.z, Math.max(0.28, pc.radius * 1.45) * spread, Math.max(0.24, pc.radius) * spread);
    sk[i] = fade * fade;
  }
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
  const viewHalf = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * dist.open;
  arenaX = Math.max(1.35, viewHalf * asp * 0.8);
  arenaZ = Math.max(1.05, Math.min(1.45, viewHalf * 0.72));
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
  mirror.resize(w, h);
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
  // The puddle's reflection: the scene from below the floor, only while there is juice.
  const fu = floor.material.uniforms;
  fu.uJuicy.value = puddle.juicy ? 1 : 0;
  fu.uPud.value = puddle.texture;
  if (puddle.juicy) { mirror.render(scene, camera, FLOOR_Y, aim, [floor]); fu.uTexMat.value.copy(mirror.matrix); }
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
    // Only full-rate frames count: the 30 fps drift is chosen, not slow.
    if (lively) D.frame(dt);
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
  syncActions();
  announce(`${F.label} sliced into two pieces.`);
}
function join() {
  if (st.openTo === 0) return;
  st.openTo = 0;
  st.openV -= 0.6;
  bits.clear();
  juice.clear();
  puddle.wipe();
  clearCores();
  for (const hf of base) {
    hf.userData.piece.squeezes = 0;
    hf.userData.piece.taps = 0;
    hf.userData.piece.spent = 0;
  }
  syncActions();
  announce(`${F.label} joining. The table is clearing.`);
}
function toggle() { (st.openTo ? join : slice)(1); touch(); }
function resetFruit() {
  bits?.clear();
  juice?.clear();
  puddle?.wipe();
  if (st.openTo) join();
  else announce(`${F.label} reset.`);
  touch();
}

/* ---------- gestures ---------- */
// Press squishes; a fast swipe across the fruit slices it; a tap wobbles.
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
const local = e => { const r = stage.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
// Juice out of a half's cut face.
const FO = new THREE.Vector3(), FN = new THREE.Vector3(), FD = new THREE.Vector3(), M3 = new THREE.Matrix3();
function faceFrame(hf) {
  hf.updateMatrixWorld(true);
  FO.set(0.02, 0, 0).applyMatrix4(hf.matrixWorld);
  FN.set(1, 0, 0).applyMatrix3(M3.getNormalMatrix(hf.matrixWorld)).normalize();
}
function squirtFrom(hf, n, speed) {
  faceFrame(hf);
  juice.squirt(FO, FN, F.B * 0.55, n, speed);
}
function spillContents(hf, share, dir = null) {
  const cfg = F.bits, pc = hf.userData.piece;
  if (!cfg || pc.spent >= 1) return 0;
  const total = Math.max(1, Math.round(cfg.n * Math.min(1, pc.span / Math.PI) * (frozen ? 0.5 : 1)));
  const left = Math.max(0, total - Math.round(total * pc.spent));
  const count = Math.min(left, Math.max(1, Math.ceil(total * share)));
  if (!count) return 0;
  faceFrame(hf);
  if (dir) FD.copy(dir);
  else {
    FD.set(FN.x, 0, FN.z);
    if (FD.lengthSq() < 1e-4) FD.set(0.35, 0, 0.25);
    FD.normalize();
  }
  bits.spawn(FO, FN, F.B * 0.42, FD, count);
  pc.spent = Math.min(1, pc.spent + count / total);
  return count;
}
function finishPieceSqueeze(hf) {
  if (!hf?.parent) return;
  const b = hf.userData.body, pc = hf.userData.piece;
  b.squeeze = false;
  b.sqV += 3.2; b.hopV += 2.2;
  pc.free = true;
  pc.squeezes++;
  squirtFrom(hf, frozen ? 5 : (pc.squeezes === 1 ? 18 : 9), pc.squeezes === 1 ? 1.2 : 0.8);
  const loose = pc.squeezes > 1 ? spillContents(hf, 0.4) : 0;
  const core = pc.squeezes > 1 && ejectCore(hf);
  snd.boing(0.9);
  announce(core ? `${F.label} piece squeezed; its stone came loose.` : loose ? `${F.label} piece squeezed; its contents came loose.` : `${F.label} piece squeezed.`);
}
const whole = () => !st.openTo && st.open < 0.05;
const spheres = [];
const cores = [];
const CORE_AXIS = new THREE.Vector3(), CORE_DQ = new THREE.Quaternion();

function ejectCore(hf) {
  const source = hf.userData.faceParts.find(p => p.userData.ejectable && !p.userData.cutHidden && !p.userData.ejected);
  if (!source) return false;
  source.updateMatrixWorld(true);
  const material = source.material.clone();
  for (const k in material.uniforms) if (k in L) material.uniforms[k] = L[k];
  if (material.uniforms.uSec) material.uniforms.uSec = { value: new THREE.Vector4(0, 0, 0, 0) };
  const mesh = new THREE.Mesh(source.geometry, material);
  source.matrixWorld.decompose(mesh.position, mesh.quaternion, mesh.scale);
  source.userData.ejected = true;
  source.visible = false;
  scene.add(mesh);
  faceFrame(hf);
  const pc = hf.userData.piece;
  cores.push({
    mesh, source, r: source.userData.ejectable.radius,
    v: FN.clone().multiplyScalar(0.75).add(new THREE.Vector3(pc.slideV.x * 0.35, 1.5, pc.slideV.y * 0.35)),
    w: new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).multiplyScalar(8),
    rest: false,
  });
  return true;
}

function clearCores() {
  for (const c of cores) {
    scene.remove(c.mesh);
    c.mesh.material.dispose();
    c.source.userData.ejected = false;
    if (c.source.parent) c.source.visible = true;
  }
  cores.length = 0;
}

function stepCores(dt) {
  if (!cores.length) return false;
  const n = Math.max(1, Math.ceil(dt / (1 / 120))), h = Math.min(dt, 0.05) / n;
  let moving = false;
  for (let s = 0; s < n; s++) for (const c of cores) {
    if (c.rest) continue;
    c.v.y -= 9.8 * h;
    c.v.multiplyScalar(Math.exp(-h * 0.45));
    c.mesh.position.addScaledVector(c.v, h);
    const wl = c.w.length();
    if (wl > 1e-4) {
      CORE_DQ.setFromAxisAngle(CORE_AXIS.copy(c.w).divideScalar(wl), wl * h);
      c.mesh.quaternion.premultiply(CORE_DQ);
    }
    const floor = FLOOR_Y + c.r;
    if (c.mesh.position.y < floor) {
      c.mesh.position.y = floor;
      if (c.v.y < -0.25) c.v.y *= -0.28;
      else c.v.y = 0;
      c.v.x *= Math.exp(-h * 5.5); c.v.z *= Math.exp(-h * 5.5);
      c.w.multiplyScalar(Math.exp(-h * 3.5));
    }
    const xCap = Math.max(0.5, arenaX - c.r), zCap = Math.max(0.45, arenaZ - c.r);
    if (Math.abs(c.mesh.position.x) > xCap) {
      c.mesh.position.x = Math.sign(c.mesh.position.x) * xCap;
      c.v.x = -Math.sign(c.mesh.position.x) * Math.abs(c.v.x) * 0.4;
    }
    if (Math.abs(c.mesh.position.z) > zCap) {
      c.mesh.position.z = Math.sign(c.mesh.position.z) * zCap;
      c.v.z = -Math.sign(c.mesh.position.z) * Math.abs(c.v.z) * 0.4;
    }
    if (c.mesh.position.y <= floor + 0.002 && c.v.lengthSq() < 0.003 && c.w.lengthSq() < 0.02) {
      c.rest = true; c.v.set(0, 0, 0); c.w.set(0, 0, 0);
    } else moving = true;
  }
  return moving;
}
// A flick: the piece jolts, and its loose bits tumble out of its face along dir.
function flickPiece(hf, dir, speak = true) {
  const b = hf.userData.body, pc = hf.userData.piece;
  pc.free = true;
  b.hopV += 2.6; b.sqV -= 1.4;
  pc.slideV.addScaledVector(new THREE.Vector2(dir.x, dir.z), frozen ? 0.75 : 1.9);
  if (pc.slideV.length() > 2.6) pc.slideV.setLength(2.6);
  pc.liftV += frozen ? 0.5 : 2.4;
  pc.rotV += (Math.random() - 0.5) * (frozen ? 0.6 : 2.8);
  pc.turnV += (dir.x - dir.z) * (frozen ? 0.25 : 0.9);
  faceFrame(hf);
  spillContents(hf, 1, dir);
  juice.squirt(FO, FN, F.B * 0.4, frozen ? 3 : 8, 0.9);
  snd.squish(0.5);
  if (speak) announce(`${F.label} piece tossed.`);
}
// The Flick button acts on the last-touched piece, like direct manipulation.
function flickSelected() {
  if (!st.openTo) return;
  const hf = activePiece?.parent ? activePiece : halves[0];
  if (!hf) return;
  activePiece = hf;
  const pc = hf.userData.piece;
  const dir = new THREE.Vector3(-pc.slide.x + (Math.random() - 0.5) * 0.8, 0, -pc.slide.y + (Math.random() - 0.5) * 0.7);
  if (dir.lengthSq() < 0.02) dir.set(pc.side ? -1 : 1, 0, 0.25);
  flickPiece(hf, dir.normalize());
}
// A screen drag as a direction across the floor.
function floorDir(dx, dy) {
  const r = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0);
  const fw = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 2).negate();
  r.y = 0; fw.y = 0;
  return r.normalize().multiplyScalar(dx).addScaledVector(fw.normalize(), -dy).normalize();
}
const TAU = Math.PI * 2;

/* ---------- wedges ---------- */
// A copy of a node with its own materials; their shared uniforms relink to the rig and to U.
function cloneNode(o, U, map) {
  let n;
  if (o.isInstancedMesh) {
    n = new THREE.InstancedMesh(o.geometry, o.material.clone(), o.count);
    n.instanceMatrix = o.instanceMatrix;
  } else if (o.isMesh) n = new THREE.Mesh(o.geometry, o.material.clone());
  else n = new THREE.Group();
  if (n.material) {
    for (const k in n.material.uniforms) {
      if (k in L) n.material.uniforms[k] = L[k];
      else if (k in U) n.material.uniforms[k] = U[k];
    }
    n.onBeforeRender = o.onBeforeRender;
  }
  n.position.copy(o.position); n.quaternion.copy(o.quaternion); n.scale.copy(o.scale);
  n.userData = { ...o.userData };
  n.frustumCulled = o.frustumCulled;
  map.set(o, n);
  for (const c of o.children) if (!(c.isMesh && c.material?.uniforms?.uLen)) n.add(cloneNode(c, U, map));
  return n;
}
// A piece of side half bh: the sector from s0 across span, with lengthwise faces at its edges.
function makePiece(bh, s0, span, from) {
  const side = bh.userData.piece.side;
  const U = halfU(side ? -1 : 1);
  U.uAbc.value.set(F.A, F.B, F.C);
  U.uSec.value.set(s0, span, 1, 0);
  const map = new Map();
  const g = cloneNode(bh, U, map);
  g.matrixAutoUpdate = false;
  g.userData = {
    skin: map.get(bh.userData.skin), bed: map.get(bh.userData.bed),
    faceParts: bh.userData.faceParts.map(p => map.get(p)),
    dent: { depth: 0, v: 0, to: 0 }, body: { sq: 1, sqV: 0, hop: 0, hopV: 0, squeeze: false, drip: 0 },
    uni: U, longs: [],
    piece: {
      ...newPiece(side, s0, span),
      off: from.off, offV: from.offV, rot: from.rot, rotV: from.rotV,
      turn: from.turn, turnV: from.turnV, free: true,
      squeezes: from.squeezes, taps: from.taps, spent: from.spent,
    },
  };
  const pc = g.userData.piece;
  pc.slide.copy(from.slide); pc.slideV.copy(from.slideV);
  pc.lift = from.lift; pc.liftV = from.liftV;
  // The lengthwise cuts, at both edges of the sector.
  const src = bh.userData.bed.userData.bedSrc, e = side ? 0.035 : -0.035;
  for (const [phi, edge] of [[s0, 1], [s0 + span, -1]]) {
    const lf = longFaceMesh({ ...L, ...U }, F, src, phi, e, edge);
    g.add(lf);
    g.userData.longs.push(lf);
    g.userData.faceParts.push(lf);
  }
  // Its hull: the half's hull inside the sector, and the axis it now shows.
  const a = bh.userData.hull, hull = [];
  for (let k = 0; k < a.length; k += 3) if (((Math.atan2(a[k + 2], a[k + 1]) - s0) % TAU + TAU) % TAU <= span) hull.push(a[k], a[k + 1], a[k + 2]);
  for (let t = 0; t <= 1; t += 0.1) hull.push(-F.A * t, 0, 0);
  g.userData.hull = new Float32Array(hull);
  root.add(g);
  return g;
}
function dropPiece(g) {
  root.remove(g);
  g.traverse(o => { if (o.material) o.material.dispose(); });
  for (const lf of g.userData.longs) lf.geometry.dispose();
}
// Cut piece hf along the lengthwise plane at angle phi (its own space).
function splitPiece(hf, phi) {
  const pc = hf.userData.piece, bh = base[pc.side];
  const hadCore = hf.userData.faceParts.some(p => p.userData.ejectable && !p.userData.cutHidden && !p.userData.ejected);
  let parts;
  if (pc.span > 6.2) parts = [[phi, Math.PI], [phi + Math.PI, Math.PI]];
  else {
    const d = ((phi - pc.s0) % TAU + TAU) % TAU;
    parts = [[pc.s0, d], [phi, pc.span - d]];
  }
  const out = parts.map(([s0, span], k) => {
    const g = makePiece(bh, s0, span, pc);
    const q = g.userData.piece;
    // Children inherit the parent's motion, then become independent bodies.
    q.offTo = q.off;
    q.rotTo = q.rot;
    const mid = s0 + span / 2, sign = k ? 1 : -1;
    q.slideV.x += Math.cos(mid) * 0.7;
    q.slideV.y += Math.sin(mid) * 0.7;
    q.liftV = Math.max(q.liftV, frozen ? 0.25 : 0.75);
    q.rotV += sign * (frozen ? 0.25 : 0.8);
    q.turnV += sign * (frozen ? 0.18 : 0.55);
    return g;
  });
  // A stone belongs to one child, never every shader-clipped clone of it.
  out.forEach((g, k) => {
    for (const p of g.userData.faceParts) if (p.userData.ejectable) p.userData.cutHidden = !hadCore || k !== 0;
  });
  if (base.includes(hf)) root.remove(hf);
  else dropPiece(hf);
  halves = halves.filter(h => h !== hf).concat(out);
  activePiece = out[0];
  fuzz.dispose();
  fuzz = makeFuzz(halves, L, F);
  fuzz.setLevel(D.level, D.rung);
  if (H) fuzz.setPx(2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) / H);
  if (started) renderer.compile(scene, camera);
  // Juice from the new cut.
  for (const g of out) squirtFrom(g, frozen ? 4 : 10, 0.9);
  snd.slice();
  announce(`${F.label} piece split. ${halves.length} pieces on the table.`);
}
// All wedges back into the two halves.
function mergeBack() {
  for (const h of halves) if (!base.includes(h)) dropPiece(h);
  for (const h of base) {
    if (!h.parent) root.add(h);
    const pc = h.userData.piece;
    pc.off = pc.offV = pc.rot = pc.rotV = pc.offTo = pc.rotTo = pc.lift = pc.liftV = 0;
    pc.turn = pc.turnV = pc.squeezes = pc.taps = pc.spent = 0;
    pc.free = false;
    pc.slide.set(0, 0); pc.slideV.set(0, 0);
  }
  halves = base.slice();
  activePiece = null;
  fuzz.dispose();
  fuzz = makeFuzz(halves, L, F);
  fuzz.setLevel(D.level, D.rung);
  if (H) fuzz.setPx(2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) / H);
}
// The cut plane a swipe makes across a piece: through the axis, along the swipe.
const PL = new THREE.Plane(), NR3 = new THREE.Matrix3();
function cutAngle(hf, a, b) {
  hf.updateMatrixWorld(true);
  const o = new THREE.Vector3(0, 0, 0).applyMatrix4(hf.matrixWorld);
  const n = new THREE.Vector3(1, 0, 0).applyMatrix3(NR3.getNormalMatrix(hf.matrixWorld)).normalize();
  PL.setFromNormalAndCoplanarPoint(n, o);
  const pts = [a, b].map(([x, y]) => { ndc.set((x / cssW) * 2 - 1, -(y / cssH) * 2 + 1); ray.setFromCamera(ndc, camera); const q = new THREE.Vector3(); return ray.ray.intersectPlane(PL, q) ? hf.worldToLocal(q) : null; });
  const pc = hf.userData.piece, mid = pc.s0 + pc.span / 2;
  if (!pts[0] || !pts[1]) return mid;
  const am = Math.atan2(pts[1].z - pts[0].z, pts[1].y - pts[0].y);
  if (pc.span > 6.2) return am;
  // Of the line's two angles, take the one inside the sector, nearest its middle.
  let best = null;
  for (const c of [am, am + Math.PI]) {
    const d = ((c - pc.s0) % TAU + TAU) % TAU;
    if (d > 0.18 && d < pc.span - 0.18 && (best === null || Math.abs(d - pc.span / 2) < Math.abs(best.d - pc.span / 2))) best = { c, d };
  }
  return best ? best.c : mid;
}
function hitAt(x, y) {
  ndc.set((x / cssW) * 2 - 1, -(y / cssH) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  const hs = ray.intersectObjects(halves.flatMap(h => [h.userData.skin, ...h.userData.faceParts.filter(p => p.isMesh && p.visible)]), false);
  for (const x of hs) {
    const hf = halves.find(h => h.userData.skin === x.object || h.userData.faceParts.includes(x.object));
    const p = hf.worldToLocal(x.point.clone()), pc = hf.userData.piece;
    // A hit on the part of a mesh its sector clips away does not count.
    if (pc.span < 6.2 && !hf.userData.longs.includes(x.object) && ((Math.atan2(p.z, p.y) - pc.s0) % TAU + TAU) % TAU > pc.span) continue;
    return { half: hf, w: x.point.clone(), p };
  }
  return null;
}
// The halves a press reaches: both while the fruit is whole, so the seam never shows.
const reach = hit => (whole() ? halves : [hit.half]);
// A dent at a point on a half; depth in half units.
function press(hit, depth) {
  for (const hf of reach(hit)) {
    const d = hf.userData.dent, p = hf.worldToLocal(hit.w.clone());
    hf.userData.skin.material.uniforms.uDent.value.set(p.x, p.y, p.z, d.depth);
    d.to = depth;
  }
}
function release(hit) {
  for (const hf of halves) hf.userData.dent.to = 0;
  if (hit) {
    for (const hf of reach(hit)) {
      const u = hf.userData.skin.material.uniforms, p = hf.worldToLocal(hit.w.clone());
      u.uJig.value.set(p.x, p.y, p.z, frozen ? 0.006 : 0.016);
      u.uJigT.value = 0;
    }
  }
}
function cueLine(a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy);
  Object.assign(cue.style, {
    left: `${a[0]}px`, top: `${a[1]}px`, width: `${len}px`, height: '2px',
    border: '0', background: 'oklch(0.96 0.01 90 / 0.9)',
    transform: `translateY(-1px) rotate(${Math.atan2(dy, dx)}rad)`, opacity: len > 8 ? '0.9' : '0',
  });
}
function cueHold(p) {
  Object.assign(cue.style, {
    left: `${p[0]}px`, top: `${p[1]}px`, width: '30px', height: '30px',
    border: '1px solid oklch(0.96 0.01 90 / 0.88)', background: 'transparent',
    transform: 'translate(-50%, -50%) scale(0.72)', opacity: '0.95',
  });
}
function hideCue() { cue.style.opacity = '0'; }

let down = false, pid = null, at0 = null, atN = null, tN = 0, moved = false, held = false, holdT = 0;
let hit0 = null, crossed = 0, path = [], cutFrom = null, t0 = 0, gesture = 'idle', limits = gestureLimits(1, 1);
stage.addEventListener('pointerdown', e => {
  if (e.button !== 0 || !renderer || !started || (e.target !== renderer.domElement && e.target !== stage)) return;
  try { stage.setPointerCapture(e.pointerId); } catch { /* capture is optional */ }
  pid = e.pointerId; at0 = local(e); atN = at0; tN = performance.now(); moved = false; held = false; down = true;
  hit0 = hitAt(at0[0], at0[1]);
  if (hit0 && st.openTo) activePiece = hit0.half;
  limits = gestureLimits(cssW, cssH, e.pointerType);
  gesture = hit0 ? 'press' : 'idle';
  path = [at0];
  crossed = 0;
  cutFrom = st.openTo && hit0 ? { hf: hit0.half, p: at0 } : null;
  t0 = performance.now();
  clearTimeout(holdT);
  if (hit0) { press(hit0, 0.05); snd.squish(0.4); }
  // A hold on the fruit squeezes it flat.
  if (hit0) holdT = setTimeout(() => {
    if (!down || moved) return;
    held = true; gesture = 'squeeze'; cueHold(at0);
    if (hit0 && !st.openTo) { st.squeeze = true; press(hit0, 0.16); snd.squish(1); }
    else if (hit0 && st.openTo) { hit0.half.userData.body.squeeze = true; press(hit0, 0.12); snd.squish(1); }
    touch();
  }, limits.holdMs);
  touch();
});
stage.addEventListener('pointermove', e => {
  const p = local(e);
  if (!down || e.pointerId !== pid) { wake(); return; }
  if (!moved && !held && Math.hypot(p[0] - at0[0], p[1] - at0[1]) >= limits.slop) {
    moved = true;
    clearTimeout(holdT);
    if (gesture === 'press') gesture = 'track';
    stage.classList.add('drag');
  }
  if (moved) {
    path.push(p);
    const dx = (p[0] - atN[0]) / cssW, dy = (p[1] - atN[1]) / cssH;
    const now = performance.now(), dt = Math.max(1, now - tN) / 1000;
    if (gesture === 'track') {
      cueLine(at0, p);
      if (!st.openTo) {
        st.tiltV.x += clamp(dx / dt, -6, 6) * 0.45;
        st.tiltV.y += clamp(dy / dt, -6, 6) * 0.2;
      }
    }
    atN = p; tN = now;
    // The path crosses the fruit's middle: count it as a cut.
    if (!st.openTo && hit0) {
      const h = hitAt(p[0], p[1]);
      if (!h) crossed |= 2;
    }
    if (!st.openTo && gesture === 'track' && (crossed & 2) && swipeLong()) {
      gesture = 'slice'; hideCue(); slice(Math.sign(p[0] - at0[0]) || 1); release(null);
    }
    // Open: a swipe across a piece cuts it again, lengthwise, along the swipe.
    touch();
  }
});
// A swipe counts when it runs far enough.
function swipeLong() {
  const a = path[0], b = path[path.length - 1];
  return Math.hypot(b[0] - a[0], b[1] - a[1]) >= limits.slice;
}
function end(e, cancelled = false) {
  if (!down || (e && e.pointerId !== pid)) return;
  clearTimeout(holdT);
  down = false; pid = null;
  stage.classList.remove('drag');
  hideCue();
  const wasSqueeze = st.squeeze;
  st.squeeze = false;
  if (!cancelled && wasSqueeze) { st.sqV += 3.5; st.hopV += 2.5; snd.boing(1); announce(`${F.label} squeezed.`); }
  // A squeezed half springs back and squirts once more.
  for (const hf of halves) {
    const b = hf.userData.body;
    if (!b.squeeze) continue;
    if (cancelled) b.squeeze = false;
    else finishPieceSqueeze(hf);
  }
  if (cancelled) {
    release(null); hit0 = null; gesture = 'idle'; touch(); return;
  }
  // A short, fast release tosses one open piece; a cut never falls through here.
  if (gesture === 'track' && hit0 && st.openTo && path.length > 1) {
    const a = path[0], z = path[path.length - 1];
    const dist = Math.hypot(z[0] - a[0], z[1] - a[1]), elapsed = performance.now() - t0;
    if (isFlick(dist, elapsed, dist / Math.max(0.001, elapsed / 1000), limits)) {
      gesture = 'flick';
      flickPiece(hit0.half, floorDir((z[0] - a[0]) / cssW, (z[1] - a[1]) / cssH));
    } else if (cutFrom && cutFrom.hf.parent && st.open > 0.8 && swipeLong()
      && cutFrom.hf.userData.piece.span > 0.5 && hitAt(z[0], z[1])?.half !== cutFrom.hf) {
      splitPiece(cutFrom.hf, cutAngle(cutFrom.hf, cutFrom.p, z));
      gesture = 'slice';
      hit0 = null;
    }
  }
  if (gesture === 'press' && !moved && !held) {
    // A tap wobbles the piece. Join stays explicit on the bar.
    if (hit0 && whole()) { st.sqV -= 1.6; snd.boing(0.5); }
    else if (hit0) {
      const hf = hit0.half, b = hf.userData.body, pc = hf.userData.piece;
      b.sqV -= 1.8; b.hopV += 1.2;
      squirtFrom(hf, frozen ? 3 : 8, 0.8);
      pc.taps++;
      const loose = pc.taps > 1 ? spillContents(hf, 0.25) : 0;
      const core = pc.taps > 1 && ejectCore(hf);
      if (loose || core) announce(`${F.label} piece released ${core ? 'its stone' : 'its contents'}.`);
      snd.boing(0.5);
    }
  }
  release(hit0);
  hit0 = null;
  gesture = 'idle';
  touch();
}
stage.addEventListener('pointerup', e => end(e));
['pointercancel', 'lostpointercapture'].forEach(t => stage.addEventListener(t, e => end(e, true)));
stage.addEventListener('pointerleave', () => { lookTo.set(0, 0); wake(); });

/* ---------- life cycle ---------- */
whenVisible(stage, on => {
  visible = on;
  if (on) wake();
  else { end(null, true); halt(); snd.hide(); }
});
onReducedChange(on => { frozen = on; cue.style.transition = on ? 'none' : 'opacity 100ms ease-out'; wake(); });
sound.onChange(on => { if (on) touch(); });
new ResizeObserver(() => resize()).observe(stage);
if (qa.has('qa')) globalThis.__fruit = { st, puddle: () => puddle, mirror: () => mirror, floor: () => floor, get halves() { return halves; }, get F() { return F; }, swap, slice, join, toggle, D, post: () => post, fuzz: () => fuzz, juice: () => juice, cam: () => camera, renderer: () => renderer, get frames() { return frameNo; }, get raf() { return raf || timer; } };

mark('build');
if (qa.has('qa')) globalThis.__fruit.preview = async () => {
  const { previewStrip } = await import('./preview.js');
  halt();
  const open = st.open, openTo = st.openTo;
  st.open = st.openTo = 1;
  place();
  root.matrix.identity();
  const h = halves[0];
  h.matrix.makeRotationY(-Math.PI / 2);
  h.matrix.setPosition(0, FLOOR_Y + restY, 0);
  halves.slice(1).forEach(p => { p.visible = false; });
  root.updateMatrixWorld(true);
  try { return previewStrip(renderer, scene, root, new THREE.Vector3(0, FLOOR_Y + restY, 0), Math.max(F.A, F.B, F.C)); }
  finally {
    halves.forEach(p => { p.visible = true; });
    st.open = open; st.openTo = openTo;
    place(); wake();
  }
};
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
