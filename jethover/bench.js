// Jet hover exhaust bench: one jet over a lined board.
// Layer 1: a round hot core and a feathered cone, marched as a volume.
// Layer 2: the heat inside the column bends the board behind it.
// Layer 3: soot from Fire's fluid, formed at the tail of the cone.
import * as THREE from 'three/webgpu';
import * as TSL from 'three/tsl';
import { snoise, snoiseVec3 } from 'three/addons/tsl/math/curlNoise.js';
import { gaussianBlur } from 'three/addons/tsl/display/GaussianBlurNode.js';
import { createFire } from './gas.js';
import {
  Fn, vec2, vec3, vec4, float, uniform, uv, pass, positionWorld, cameraPosition, normalize, Loop,
  smoothstep, exp, max, min, abs, fract, mix, sin, mx_noise_float, interleavedGradientNoise, screenCoordinate, screenUV, renderOutput,
} from 'three/tsl';
import { bloom } from 'three/addons/tsl/display/BloomNode.js';
import { devPanel } from './devpanel.js';

/* ---------- controls ---------- */
const tune = { thr: 0.5, motion: 'fast', len: 5, r0: 0.4, spread: 0.04, feather: 0.5, bright: 1, dia: 1, turb: 1, speed: 1, board: 'lines',
  bend: 1, fluteW: 3.5, flute: 1, flicker: 1, showHeat: false,
  soot: true, res: 'med', sAmount: 1, sDark: 1, sLife: 1, sSpeed: 1, sLit: 1 };
// Motion presets: noise size (per metre), speed and strength.
const MOTIONS = { fast: [3.5, 2.0, 1.0], slow: [1.0, 0.45, 1.3], steady: [1.5, 0.3, 0.2] };
const slider = (id, group, label, min, max, step) => ({
  type: 'slider', id, group, label, min, max, step, value: tune[id], onInput: v => { tune[id] = v; apply(); },
});
const ROWS = [
  slider('thr', 'Jet', 'Throttle', 0, 1, 0.01),
  { type: 'choice', id: 'motion', group: 'Jet', label: 'Motion', value: 'fast', options: [
    { value: 'fast', label: 'Fast' }, { value: 'slow', label: 'Slow' }, { value: 'steady', label: 'Steady' },
  ], onPick: v => { tune.motion = v; apply(); } },
  slider('len', 'Cone', 'Length (m)', 1, 10, 0.1),
  slider('r0', 'Cone', 'Nozzle radius', 0.15, 0.8, 0.01),
  slider('spread', 'Cone', 'Spread', 0, 0.3, 0.005),
  slider('feather', 'Cone', 'Tail feather', 0, 1, 0.01),
  slider('bright', 'Cone', 'Brightness', 0, 3, 0.05),
  slider('dia', 'Cone', 'Diamonds', 0, 5, 0.05),
  slider('turb', 'Cone', 'Turbulence', 0, 2, 0.05),
  slider('speed', 'Cone', 'Flow speed', 0, 3, 0.05),
  slider('bend', 'Heat', 'Bend strength', 0, 3, 0.05),
  slider('flute', 'Heat', 'Flutes', 0, 3, 0.05),
  slider('fluteW', 'Heat', 'Flute count', 1, 8, 0.5),
  slider('flicker', 'Heat', 'Flicker', 0, 3, 0.05),
  { type: 'toggle', id: 'showHeat', group: 'Heat', label: 'Show heat', value: false, onToggle: v => { tune.showHeat = v; apply(); } },
  { type: 'toggle', id: 'soot', group: 'Soot', label: 'Soot', value: true, onToggle: v => { tune.soot = v; apply(); } },
  { type: 'choice', id: 'res', group: 'Soot', label: 'Resolution', value: 'med', options: [
    { value: 'low', label: 'Low' }, { value: 'med', label: 'Medium' }, { value: 'high', label: 'High' },
  ], onPick: async v => { tune.res = v; await buildSoot(v); apply(); } },
  slider('sAmount', 'Soot', 'Amount', 0, 3, 0.05),
  slider('sDark', 'Soot', 'Darkness', 0, 3, 0.05),
  slider('sLife', 'Soot', 'Lifetime', 0.2, 4, 0.05),
  slider('sSpeed', 'Soot', 'Speed', 0.2, 2, 0.05),
  slider('sLit', 'Soot', 'Light', 0, 3, 0.05),
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
  soot: uniform(1), sLit: uniform(1), sSpeed: uniform(1),
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
    const rr = r.add(tn.sub(0.5).mul(R).mul(0.9).mul(U.turb)).div(R);
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
    // The diamonds sit on the clean axis; turbulence must not wash them out.
    const cell = float(1.0).sub(f.mul(1.6)).sub(r.div(R).mul(2.4)).max(0.0);
    // Faint hints that grow with the throttle.
    const dia = cell.mul(exp(k.max(0.0).mul(-0.6))).mul(smoothstep(0.3, 0.9, thr)).mul(U.dia).mul(0.5);
    // The core stays under white, so the diamonds can show in it.
    const e = vec3(1.0, 0.9, 0.65).mul(core).mul(5.0)
      .add(cSheath.mul(sheath).mul(1.6))
      .add(vec3(1.0, 0.7, 0.45).mul(dia).mul(9.0));
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
    const rr = r.add(tn.sub(0.5).mul(R).mul(0.9).mul(U.turb)).div(R);
    // The heat ends with the cone's feather.
    const fz = U.len.mul(U.feather).max(0.2);
    const tail = float(1.0).sub(smoothstep(U.len.sub(fz), U.len, s.add(tn.sub(0.5).mul(fz).mul(0.9).mul(U.turb))));
    const live = smoothstep(-0.05, 0.1, s).mul(tail).mul(smoothstep(0.0, 0.05, P.y));
    const h = exp(rr.mul(rr).mul(-1.6)).mul(live).mul(U.thr.mul(0.7).add(0.3));
    // The hottest inner core is fluted glass: a few thin upright lines.
    // fluteW holds the count across the inner core.
    // They run straight: the air leaves the nozzle fast and direct.
    const ph = P.x.sub(U.noz.x).div(R.mul(1.1)).mul(U.fluteW).mul(0.5);
    const line = smoothstep(0.82, 1.0, sin(ph.mul(6.2832)).abs());
    // The flutes taper off by halfway down the column.
    const half = float(1.0).sub(smoothstep(U.len.mul(0.2), U.len.mul(0.5), s));
    const rc = r.div(R);
    const fl = line.mul(exp(rc.mul(rc).mul(-12.0))).mul(half).mul(2.0);
    // A fine flicker races down with the flow.
    // It varies only up and across, so the march through the depth keeps it.
    const fk = mx_noise_float(vec3(P.x.mul(7.0), P.y.mul(5.0).add(U.flowT.mul(2.0)), 0.5));
    sum.addAssign(h.mul(fl.mul(U.flute).mul(0.5).add(1.0)).mul(fk.mul(U.flicker).mul(0.45).add(1.0)).mul(ds));
  });
  return vec4(sum, 0, 0, 1);
})();
const heatScene = new THREE.Scene();
const heatBox = new THREE.Mesh(cone.geometry, heatMat);
heatBox.frustumCulled = false;
heatScene.add(heatBox);

/* ---------- layer 3: soot from Fire's fluid ---------- */
// One copy of Fire's gas round the jet: 12 x 11 x 6 m.
// The drag keeps the nozzle 4 m from the box sides.
// Resolution: cell size in metres and the volume's march steps.
const RES = { low: [0.25, 40], med: [0.15, 56], high: [0.1, 72] };
const volScene = new THREE.Scene();
const sootLamp = new THREE.PointLight(0xff7a30, 6, 30, 2);
volScene.add(sootLamp);
// The volume model runs only with a light in the scene.
heatScene.add(new THREE.PointLight(0x000000, 0, 1, 2));
// Fire's emitter: a disc just under the nozzle carries heat for the flame.
const pts = [];
for (let k = 0; k < 240; k++) {
  const a = k * 2.39996, rr = 0.34 * Math.sqrt((k + 0.5) / 240);
  pts.push(Math.cos(a) * rr, -0.15 - (k % 4) * 0.08, Math.sin(a) * rr);
}
let gas = null, gu = null, vol = null, building = false;
// Builds the gas at a resolution; a change of resolution builds it again.
async function buildSoot(level) {
  const [cell, steps] = RES[level] || RES.med;
  building = true;
  if (gas) { volScene.remove(vol.mesh); heatScene.remove(vol.heatMesh); gas.dispose(); }
  const size = [12, 11, 6];
  gas = createFire({ THREE, TSL, curl: { snoise, snoiseVec3 }, renderer, grid: size.map(m => Math.round(m / cell)), size, center: [0, 5.5, 0], pressure: 10, emitMax: 240 });
  gu = gas.u;
  gas.setEmitters(pts);
  // No emitter at the nozzle: no smoke comes out of it.
  gu.emitTemperature.value = 0; gu.emitDensity.value = 0; gu.emitGain.value = 0;
  // The jet core carries a little heat down its drive.
  gu.feed.value.set(0.1, 0);
  // Little lift: the soot rushes down with the jet, not up its sides.
  gu.buoyancy.value = 0.3; gu.weight.value = 0.05;
  // The jet runs free past its drive and pulls the still air in.
  gu.freeJet.value = 1; gu.entrain.value = 2.0;
  // Less stir: the soot holds together with the jet.
  gu.turbulence.value = 1.5; gu.turbFrequency.value = 10.0; gu.vorticity.value = 4.0;
  gu.velDamping.value = 0.25; gu.cooling.value = 1.3;
  gu.skyShadow.value = 1.2;
  gu.tMax.value = 3;
  gu.intensity.value = 0.8; gu.glowSpread.value = 4.8; gu.glowGain.value = 1.0; gu.glowAge.value = 3.0;
  gu.startColor.value.setRGB(1.0, 0.86, 0.62); gu.midColor.value.setRGB(1.0, 0.42, 0.1); gu.endColor.value.setRGB(0.22, 0.05, 0.05);
  gu.smokeTint.value.setRGB(0.22, 0.2, 0.19);
  gu.ambient.value.setRGB(0.05, 0.05, 0.06);
  gu.shadowAbsorption.value = 2.2; gu.shadowAmbient.value = 0.15; gu.asymmetry.value = 0.35;
  // Layer 2 makes the heat bend; the gas gives only the smoke sum.
  gu.heatGain.value = 0;
  // The soot darkens what lies behind it, as Fire's shadow pass does.
  // Thin haze does not darken; only denser clouds read.
  gu.occMin.value = 0.15; gu.occFloor.value = 1;
  // Only the main jet drives the gas; the other two slots stay off.
  for (let j = 1; j < 3; j++) { gu.jetP[j].value.set(0, -100, 0); gu.jetK[j].value.set(0, 0, 0, 0.4); }
  vol = gas.volume({ steps, lift: 0 });
  volScene.add(vol.mesh);
  heatScene.add(vol.heatMesh);
  await gas.compile();
  building = false;
}
await buildSoot(tune.res);
const emitM = new THREE.Matrix4();
const GAS_DT = 1 / 60;
let gasAcc = 0, gasClock = 0;
function stepSoot(dt) {
  // A rebuild in progress skips the gas.
  if (building) return;
  const n = U.noz.value, L = U.len.value, thr = U.thr.value;
  // The nozzle drives only the jet's first metres; momentum carries it on.
  gu.jetP[0].value.copy(n);
  gu.jetA[0].value.set(0, -1, 0, Math.min(1.2 + 2.5 * thr, n.y));
  gu.jetK[0].value.set(16 * (0.35 + 0.75 * thr), 6 + 26 * thr, 0, U.r0.value);
  gu.sourcePosition.value.copy(n);
  gu.emitMatrix.value.copy(emitM.makeTranslation(n.x, n.y, n.z));
  gu.lightPos.value.set(n.x, n.y - L * 0.5, n.z + 0.5);
  sootLamp.position.copy(gu.lightPos.value);
  sootLamp.intensity = 3 + 12 * thr;
  // The gas steps on a fixed clock, two steps a frame at most.
  gasAcc = Math.min(gasAcc + dt * 0.55 * U.sSpeed.value, 2 * GAS_DT);
  while (gasAcc >= GAS_DT) {
    gasAcc -= GAS_DT;
    gasClock = (gasClock + GAS_DT) % 1000;
    gu.time.value = gasClock;
    gas.step(GAS_DT);
  }
}

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
  // Soot: a feed at the tail of the cone, its darkening, its fade.
  U.soot.value = tune.soot ? 1 : 0; U.sLit.value = tune.sLit; U.sSpeed.value = tune.sSpeed;
  // Soot forms low in the jet column; none at the nozzle, none dumped at one spot.
  gu.tailSoot.value = 0; gu.sideSoot.value = 0;
  gu.coreSoot.value = tune.soot ? 1400 * tune.sAmount : 0;
  // The clouds fade in about 1.7 s, so they do not linger.
  gu.dissipation.value = 0.6 / tune.sLife;
  gu.occGain.value = 4 * tune.sDark;
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
  stepSoot(dt);
}

/* ---------- post: bloom, tone ---------- */
const pipe = new THREE.RenderPipeline(renderer);
const sp = pass(scene, camera);
const hp = pass(heatScene, camera);
const heat = hp.getTextureNode();
// The board bends along the slope of the summed heat, capped at 10 px times the strength.
const bentUV = Fn(() => {
  const px = vec2(1.5).div(U.res);
  const gx = heat.sample(screenUV.add(vec2(px.x, 0))).r.sub(heat.sample(screenUV.sub(vec2(px.x, 0))).r);
  const gy = heat.sample(screenUV.add(vec2(0, px.y))).r.sub(heat.sample(screenUV.sub(vec2(0, px.y))).r);
  const off = vec2(gx, gy).mul(U.bend).mul(320.0).toVar();
  // The cap grows with the strength, so every heat row stays live.
  off.mulAssign(min(1.0, U.bend.mul(10.0).max(0.01).div(off.length().add(1e-4))));
  return screenUV.add(off.div(U.res));
})();
const vp = pass(volScene, camera);
vp.setResolutionScale(0.5);
const volCol = gaussianBlur(vp, 1.0, 3).getTextureNode().sample(bentUV).rgb.mul(0.6).mul(U.sLit).mul(U.soot);
// Five taps soften the volume's dither in the smoke sum.
const smoke = Fn(() => {
  const d = vec2(2.5).div(U.res);
  return heat.sample(screenUV).b.mul(0.4)
    .add(heat.sample(screenUV.add(vec2(d.x, 0))).b.mul(0.15)).add(heat.sample(screenUV.sub(vec2(d.x, 0))).b.mul(0.15))
    .add(heat.sample(screenUV.add(vec2(0, d.y))).b.mul(0.15)).add(heat.sample(screenUV.sub(vec2(0, d.y))).b.mul(0.15));
})();
const behind = exp(smoke.mul(0.6).mul(U.soot).negate());
const col = vec4(sp.getTextureNode().sample(bentUV).rgb.mul(behind).add(volCol), 1);
const view = vec3(heat.sample(screenUV).r.mul(6.0).mul(U.showHeat), 0, 0);
pipe.outputNode = renderOutput(col.add(bloom(col, 0.5, 0.5, 0.8)).add(view));
pipe.outputColorTransform = false;

/* ---------- drag: the jet follows the pointer ---------- */
// The nozzle moves in the plane z = 0: 4 m each side, 1 m to 10 m up.
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), hit = new THREE.Vector3();
const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
let dragging = false;
function moveTo(e) {
  ndc.set((e.clientX / innerWidth) * 2 - 1, 1 - (e.clientY / innerHeight) * 2);
  ray.setFromCamera(ndc, camera);
  if (!ray.ray.intersectPlane(plane, hit)) return;
  U.noz.value.set(Math.max(-4, Math.min(4, hit.x)), Math.max(1, Math.min(10, hit.y)), 0);
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
