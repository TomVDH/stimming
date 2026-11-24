// Jet hover exhaust bench: one jet over a lined board.
// Layer 1: a round hot core and a feathered cone, marched as a volume.
// Layer 2: the heat inside the column bends the board behind it.
import * as THREE from 'three/webgpu';
import {
  Fn, vec2, vec3, vec4, float, uniform, uv, pass, positionWorld, cameraPosition, normalize, Loop,
  smoothstep, exp, max, min, abs, fract, mix, sin, mx_noise_float, interleavedGradientNoise, screenCoordinate, screenUV, renderOutput,
} from 'three/tsl';
import { bloom } from 'three/addons/tsl/display/BloomNode.js';
import { devPanel } from './devpanel.js';

/* ---------- controls ---------- */
const tune = { thr: 0.5, shape: 'column', motion: 'fast', len: 5, r0: 0.4, spread: 0.08, feather: 0.5, bright: 1, dia: 1, turb: 1, speed: 1, board: 'lines',
  bend: 1, fluteW: 3.5, flute: 1, flicker: 1, showHeat: false };
// Shape presets: length and spread; Custom takes the sliders.
const SHAPES = { stubby: [1.8, 0.12], column: [5, 0.04] };
// Motion presets: noise size (per metre), speed and strength.
const MOTIONS = { fast: [3.5, 2.0, 1.0], slow: [1.0, 0.45, 1.3], steady: [1.5, 0.3, 0.2] };
const slider = (id, group, label, min, max, step) => ({
  type: 'slider', id, group, label, min, max, step, value: tune[id], onInput: v => { tune[id] = v; apply(); },
});
const ROWS = [
  slider('thr', 'Jet', 'Throttle', 0, 1, 0.01),
  { type: 'choice', id: 'shape', group: 'Jet', label: 'Shape', value: 'column', options: [
    { value: 'stubby', label: 'Stubby' }, { value: 'column', label: 'Column' }, { value: 'custom', label: 'Custom' },
  ], onPick: v => { tune.shape = v; apply(); } },
  { type: 'choice', id: 'motion', group: 'Jet', label: 'Motion', value: 'fast', options: [
    { value: 'fast', label: 'Fast' }, { value: 'slow', label: 'Slow' }, { value: 'steady', label: 'Steady' },
  ], onPick: v => { tune.motion = v; apply(); } },
  slider('len', 'Cone', 'Length (m)', 1, 10, 0.1),
  slider('r0', 'Cone', 'Nozzle radius', 0.15, 0.8, 0.01),
  slider('spread', 'Cone', 'Spread', 0, 0.3, 0.005),
  slider('feather', 'Cone', 'Tail feather', 0, 1, 0.01),
  slider('bright', 'Cone', 'Brightness', 0, 3, 0.05),
  slider('dia', 'Cone', 'Diamonds', 0, 2, 0.05),
  slider('turb', 'Cone', 'Turbulence', 0, 2, 0.05),
  slider('speed', 'Cone', 'Flow speed', 0, 3, 0.05),
  slider('bend', 'Heat', 'Bend strength', 0, 3, 0.05),
  slider('flute', 'Heat', 'Flutes', 0, 3, 0.05),
  slider('fluteW', 'Heat', 'Flute count', 1, 8, 0.5),
  slider('flicker', 'Heat', 'Flicker', 0, 3, 0.05),
  { type: 'toggle', id: 'showHeat', group: 'Heat', label: 'Show heat', value: false, onToggle: v => { tune.showHeat = v; apply(); } },
  { type: 'choice', id: 'board', group: 'Board', label: 'Backdrop', value: 'lines', options: [
    { value: 'lines', label: 'Lines' }, { value: 'dark', label: 'Dark' }, { value: 'sky', label: 'Sky' },
  ], onPick: v => { tune.board = v; apply(); } },
];
Object.assign(tune, devPanel(ROWS, { always: true, key: 'bench' }));

/* ---------- renderer and scene ---------- */
const renderer = new THREE.WebGPURenderer({ antialias: true });
await renderer.init();
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
document.body.prepend(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(32, innerWidth / innerHeight, 0.1, 200);
camera.position.set(0, 3, 16);
camera.lookAt(0, 3, 0);

const U = {
  time: uniform(0), flowT: uniform(0), thr: uniform(0.5), len: uniform(5), r0: uniform(0.4), spread: uniform(0.08),
  feather: uniform(0.5), bright: uniform(1), dia: uniform(1), turb: uniform(1), speed: uniform(1), freq: uniform(3.5),
  board: uniform(0),
  bend: uniform(1), flute: uniform(1), fluteW: uniform(1), flicker: uniform(1), showHeat: uniform(0),
  res: uniform(new THREE.Vector2(1, 1)),
  // The nozzle sits here and points straight down.
  noz: uniform(new THREE.Vector3(0, 6, 0)),
  bmin: uniform(new THREE.Vector3()), bmax: uniform(new THREE.Vector3()),
};

// The board: fine lines show any bend in the air in front of them.
const boardMat = new THREE.MeshBasicNodeMaterial();
boardMat.colorNode = Fn(() => {
  const p = uv().mul(vec2(40, 24));
  const g = abs(fract(p).sub(0.5));
  const line = float(1.0).sub(smoothstep(0.008, 0.025, min(g.x, g.y)));
  const diag = float(1.0).sub(smoothstep(0.008, 0.02, abs(fract(p.x.add(p.y).mul(0.25)).sub(0.5))));
  const lines = mix(vec3(0.16, 0.16, 0.18), vec3(0.75, 0.74, 0.7), max(line, diag.mul(0.5)));
  const sky = mix(vec3(0.62, 0.6, 0.58), vec3(0.42, 0.45, 0.52), uv().y);
  const dark = vec3(0.03, 0.03, 0.04);
  return vec4(mix(mix(lines, dark, U.board.equal(1).select(1, 0)), sky, U.board.equal(2).select(1, 0)), 1);
})();
const board = new THREE.Mesh(new THREE.PlaneGeometry(30, 18), boardMat);
board.position.set(0, 3, -6);
scene.add(board);
// A floor line, so the ground reads.
const floor = new THREE.Mesh(new THREE.PlaneGeometry(30, 12), new THREE.MeshBasicNodeMaterial({ color: 0x2a2826 }));
floor.rotation.x = -Math.PI / 2;
floor.position.set(0, 0, 0);
scene.add(floor);

/* ---------- layer 1: core and cone ---------- */
// The cone is marched as a volume, so it reads round, not as a flat strip.
const STEPS = 48;
const coneMat = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.FrontSide });
coneMat.colorNode = Fn(() => {
  const p0 = positionWorld;
  const d = normalize(p0.sub(cameraPosition));
  const inv = vec3(1.0).div(d.add(vec3(1e-6)));
  const tf = max(U.bmin.sub(p0).mul(inv), U.bmax.sub(p0).mul(inv));
  const tFar = min(min(tf.x, tf.y), tf.z).max(0.0);
  const ds = tFar.div(STEPS);
  const jit = interleavedGradientNoise(screenCoordinate.xy);
  const col = vec3(0).toVar();
  const thr = U.thr;
  Loop(STEPS, ({ i }) => {
    const P = p0.add(d.mul(float(i).add(jit).mul(ds)));
    // s runs down the jet from the nozzle; r is the distance from its axis.
    const s = U.noz.y.sub(P.y);
    const r = P.xz.sub(U.noz.xz).length();
    // Flow noise rides down the jet; it breaks the edges and the tail.
    // flowT is the flow's own clock, so a throttle change never jumps it.
    const flow = vec3(P.x.mul(U.freq), P.y.mul(U.freq.mul(0.6)).add(U.flowT), P.z.mul(U.freq));
    const n = mx_noise_float(flow).mul(0.5).add(0.5);
    const n2 = mx_noise_float(flow.mul(2.3).add(7.1)).mul(0.5).add(0.5);
    const tn = n.mul(0.65).add(n2.mul(0.35));
    const R = U.r0.add(s.max(0.0).mul(U.spread));
    const rr = r.add(tn.sub(0.5).mul(R).mul(0.5).mul(U.turb)).div(R);
    // The tail feathers out, broken by the flow.
    const fz = U.len.mul(U.feather).max(0.2);
    const tail = float(1.0).sub(smoothstep(U.len.sub(fz), U.len, s.add(tn.sub(0.5).mul(fz).mul(0.9).mul(U.turb))));
    // Nothing shows under the floor.
    const live = smoothstep(-0.05, 0.08, s).mul(tail).mul(tail).mul(smoothstep(0.0, 0.05, P.y));
    // The hot core: narrow, white-yellow, strongest near the nozzle.
    const core = exp(rr.mul(rr).mul(-7.0)).mul(exp(s.div(thr.mul(1.2).add(0.6).mul(U.len.mul(0.4))).negate()));
    // The sheath: orange near the nozzle, violet blue further down.
    const sheath = exp(rr.mul(rr).mul(-2.2)).mul(tn.mul(0.8).add(0.5)).mul(exp(s.div(U.len.mul(0.7)).negate()));
    // Orange sheath; only a hint of violet far down.
    const cSheath = mix(vec3(1.0, 0.45, 0.12), vec3(0.75, 0.35, 0.55), smoothstep(0.6, 3.5, s));
    // Shock diamonds: bright cells on the axis, each dimmer than the last.
    const S = U.r0.mul(2.2).mul(thr.mul(0.6).add(0.7));
    const k = s.div(S).sub(0.5);
    const f = abs(fract(k).sub(0.5)).mul(2.0);
    const cell = float(1.0).sub(f.mul(1.6)).sub(rr.mul(2.4)).max(0.0);
    // Faint hints, only at high throttle.
    const dia = cell.mul(exp(k.max(0.0).mul(-0.6))).mul(smoothstep(0.55, 0.9, thr)).mul(U.dia).mul(0.3);
    const e = vec3(1.0, 0.9, 0.65).mul(core).mul(9.0)
      .add(cSheath.mul(sheath).mul(1.6))
      .add(vec3(1.0, 0.7, 0.45).mul(dia).mul(4.0));
    col.addAssign(e.mul(live).mul(ds).mul(thr.mul(1.2).add(0.4)).mul(U.bright));
  });
  return vec4(col, 1);
})();
const cone = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), coneMat);
cone.frustumCulled = false;
scene.add(cone);

/* ---------- layer 2: the heat in the column ---------- */
// The same box marches the heat alone, into its own pass.
// Heat lives only where the jet is: nothing spreads sideways.
const HSTEPS = 24;
const heatMat = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending });
heatMat.colorNode = Fn(() => {
  const p0 = positionWorld;
  const d = normalize(p0.sub(cameraPosition));
  const inv = vec3(1.0).div(d.add(vec3(1e-6)));
  const tf = max(U.bmin.sub(p0).mul(inv), U.bmax.sub(p0).mul(inv));
  const tFar = min(min(tf.x, tf.y), tf.z).max(0.0);
  const ds = tFar.div(HSTEPS);
  const jit = interleavedGradientNoise(screenCoordinate.xy);
  const sum = float(0).toVar();
  Loop(HSTEPS, ({ i }) => {
    const P = p0.add(d.mul(float(i).add(jit).mul(ds)));
    const s = U.noz.y.sub(P.y);
    const r = P.xz.sub(U.noz.xz).length();
    const flow = vec3(P.x.mul(U.freq), P.y.mul(U.freq.mul(0.6)).add(U.flowT), P.z.mul(U.freq));
    const tn = mx_noise_float(flow).mul(0.5).add(0.5);
    const R = U.r0.add(s.max(0.0).mul(U.spread));
    const rr = r.add(tn.sub(0.5).mul(R).mul(0.5).mul(U.turb)).div(R);
    // The heat ends with the cone's feather.
    const fz = U.len.mul(U.feather).max(0.2);
    const tail = float(1.0).sub(smoothstep(U.len.sub(fz), U.len, s.add(tn.sub(0.5).mul(fz).mul(0.9).mul(U.turb))));
    const live = smoothstep(-0.05, 0.1, s).mul(tail).mul(smoothstep(0.0, 0.05, P.y));
    const h = exp(rr.mul(rr).mul(-1.6)).mul(live).mul(U.thr.mul(0.7).add(0.3));
    // The hottest inner core is fluted glass: a few thin upright lines.
    // fluteW holds the count across the inner core; they waver down the jet.
    const wav = mx_noise_float(vec3(P.y.mul(1.3), U.flowT.mul(0.35), 3.1)).mul(0.25);
    const ph = P.x.sub(U.noz.x).div(R.mul(1.1)).mul(U.fluteW).mul(0.5).add(wav);
    const line = smoothstep(0.82, 1.0, sin(ph.mul(6.2832)).abs());
    const fl = line.mul(exp(rr.mul(rr).mul(-12.0))).mul(2.0);
    // A fine flicker races down with the flow.
    const fk = mx_noise_float(vec3(P.x.mul(7.0), P.y.mul(5.0).add(U.flowT.mul(2.0)), P.z.mul(7.0)));
    sum.addAssign(h.mul(fl.mul(U.flute).mul(0.5).add(1.0)).mul(fk.mul(U.flicker).mul(0.45).add(1.0)).mul(ds));
  });
  return vec4(sum, 0, 0, 1);
})();
const heatScene = new THREE.Scene();
const heatBox = new THREE.Mesh(cone.geometry, heatMat);
heatBox.frustumCulled = false;
heatScene.add(heatBox);

// The box holds the whole cone.
function placeCone() {
  const n = U.noz.value, L = U.len.value;
  const w = U.r0.value + U.spread.value * L + 1.0;
  U.bmin.value.set(n.x - w, n.y - L - 0.6, n.z - w);
  U.bmax.value.set(n.x + w, n.y + 0.2, n.z + w);
  cone.position.set(n.x, n.y - (L + 0.4) / 2, n.z);
  cone.scale.set(2 * w, L + 0.8, 2 * w);
  heatBox.position.copy(cone.position);
  heatBox.scale.copy(cone.scale);
}

// Targets: every value eases toward these each frame.
const goal = {};
const EASED = ['thr', 'len', 'r0', 'spread', 'feather', 'bright', 'dia', 'turb', 'speed', 'freq', 'bend', 'flute', 'fluteW', 'flicker'];
function apply() {
  for (const k of ['thr', 'len', 'r0', 'spread', 'feather', 'bright', 'dia', 'turb', 'speed', 'bend', 'flute', 'fluteW', 'flicker']) goal[k] = tune[k];
  U.showHeat.value = tune.showHeat ? 1 : 0;
  const sh = SHAPES[tune.shape];
  if (sh) { goal.len = sh[0]; goal.spread = sh[1]; }
  const [fq, sp, tb] = MOTIONS[tune.motion] || MOTIONS.fast;
  goal.freq = fq; goal.speed = sp * tune.speed; goal.turb = tb * tune.turb;
  U.board.value = tune.board === 'dark' ? 1 : tune.board === 'sky' ? 2 : 0;
}
apply();
// The first frame starts at the goal.
for (const k of EASED) U[k].value = goal[k];
// Space held is full throttle.
let burn = false;
addEventListener('keydown', e => { if (e.code === 'Space') { burn = true; e.preventDefault(); } });
addEventListener('keyup', e => { if (e.code === 'Space') burn = false; });
function ease(dt) {
  // The engine spools up in about 0.4 s and down in about 0.8 s.
  const tThr = burn ? 1 : goal.thr;
  const tau = tThr > U.thr.value ? 0.4 : 0.8;
  U.thr.value += (tThr - U.thr.value) * (1 - Math.exp(-dt / tau));
  // Shape and motion ease over about half a second.
  for (const k of EASED) if (k !== 'thr') U[k].value += (goal[k] - U[k].value) * (1 - Math.exp(-dt / 0.25));
  // The flow clock runs faster with more throttle.
  U.flowT.value += dt * U.speed.value * (U.thr.value * 6 + 3);
  placeCone();
}

/* ---------- post: bloom, tone ---------- */
const pipe = new THREE.RenderPipeline(renderer);
const sp = pass(scene, camera);
const hp = pass(heatScene, camera);
const heat = hp.getTextureNode();
// The board bends along the slope of the summed heat, capped at 10 px.
const bentUV = Fn(() => {
  const px = vec2(1.5).div(U.res);
  const gx = heat.sample(screenUV.add(vec2(px.x, 0))).r.sub(heat.sample(screenUV.sub(vec2(px.x, 0))).r);
  const gy = heat.sample(screenUV.add(vec2(0, px.y))).r.sub(heat.sample(screenUV.sub(vec2(0, px.y))).r);
  const off = vec2(gx, gy).mul(U.bend).mul(90.0).toVar();
  off.mulAssign(min(1.0, float(10.0).div(off.length().add(1e-4))));
  return screenUV.add(off.div(U.res));
})();
const col = sp.getTextureNode().sample(bentUV);
const view = vec3(heat.sample(screenUV).r.mul(1.5).mul(U.showHeat), 0, 0);
pipe.outputNode = renderOutput(col.add(bloom(col, 0.5, 0.5, 0.8)).add(view));
pipe.outputColorTransform = false;

/* ---------- drag: the jet follows the pointer ---------- */
// The nozzle moves in the plane z = 0, from 1 m to 11 m up.
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), hit = new THREE.Vector3();
const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
let dragging = false;
function moveTo(e) {
  ndc.set((e.clientX / innerWidth) * 2 - 1, 1 - (e.clientY / innerHeight) * 2);
  ray.setFromCamera(ndc, camera);
  if (!ray.ray.intersectPlane(plane, hit)) return;
  U.noz.value.set(Math.max(-12, Math.min(12, hit.x)), Math.max(1, Math.min(11, hit.y)), 0);
  placeCone();
}
const cv = renderer.domElement;
cv.style.cursor = 'grab';
cv.addEventListener('pointerdown', e => { dragging = true; cv.setPointerCapture(e.pointerId); cv.style.cursor = 'grabbing'; moveTo(e); });
cv.addEventListener('pointermove', e => { if (dragging) moveTo(e); });
cv.addEventListener('pointerup', () => { dragging = false; cv.style.cursor = 'grab'; });

/* ---------- loop ---------- */
function sizeRes() { renderer.getDrawingBufferSize(U.res.value); }
sizeRes();
addEventListener('resize', () => {
  renderer.setSize(innerWidth, innerHeight);
  sizeRes();
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
});
let last = performance.now();
renderer.setAnimationLoop(() => {
  // A hidden page does no work.
  if (document.hidden) { last = performance.now(); return; }
  const now = performance.now(), dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  U.time.value += dt;
  ease(dt);
  pipe.render();
});
