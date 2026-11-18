// East Van Alley: one East Van alley pole, seen from below at a tilt.
// The sky and the lane bake once per size and hour; only crows draw each frame.
// The crows are the Murmuration sim (flock/index.html), bent into a highway.
import { initPage, whenVisible, reduced, onReducedChange, linFit, stage as mark, pageReady } from '../shared/stim.js';
import { intro as playIntro } from '../shared/intro.js';
import { detail } from '../shared/detail.js';
import { program, linked, onContextLoss, nextFrame } from '../shared/gl.js';
import { SKY } from '../shared/sky.js';
import { dayAt, dayClock, localHour } from '../shared/daytime.js';
import { OUTPUT } from '../shared/output.js';
import { GRADE } from '../shared/grade.js';

const stage = document.getElementById('stage');
const D2R = Math.PI / 180;
const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a, b) => a + Math.random() * (b - a);
const store = {
  get(k) { try { return localStorage.getItem(`stimming.wires.${k}`); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(`stimming.wires.${k}`, String(v)); } catch { /* storage off */ } },
};

playIntro({ ready: pageReady(9000) });
mark('build');

/* ---------- time of day ---------- */
// The slider sets the hour. Now hands the hour back to the device clock.
const kept = store.get('hour');
let follow = kept === null || kept === 'now';
let hour = follow ? localHour() : clamp(+kept || 0, 0, 24);
// The shared clock eases every change of hour; a held Now runs it on.
const clock = dayClock({ hour, tau: 0.6, wrap: true });
// The timelapse: hours per second, the hold's start, and whether it runs.
const LAPSE_RATE = 2, HOLD_MS = 260;
const lapse = { down: 0, on: false };
// True after a fast bake, until the full bake replaces it.
let liveBaked = false;

const act = { hour() {}, now() {}, car() {}, scatter() {}, relight() {}, repaint() {}, nowDown() {}, nowUp() {} };
// Dev tuning: the sun's bearing and the shadow darkness.
const look = { sunAz: 0, shade: 0.4 };
// Dev post: tone map (1 AgX, 0 ACES), film look, contrast, exposure, grain, vignette.
const grade = { tone: 1, film: 1, contrast: 0.55, expo: 1, grain: 0.045, vig: 0.28 };
const ui = initPage({ id: 'wires', signal: true, bar: {
  slider: { label: 'Time', min: 0, max: 24, step: 0.05, value: hour, onInput: v => act.hour(v) },
  actions: [
    // A press goes back to the clock; a hold runs the timelapse.
    { verb: 'now', key: 'N', hold: true, onDown: () => act.nowDown(), onUp: () => act.nowUp() },
    { verb: 'car', key: 'C', onPress: () => act.car() },
    { verb: 'scatter', key: 'S', onPress: () => act.scatter() },
  ],
  quality: true,
  dev: [
    // Turns the sun and the moon about the zenith, in degrees.
    { type: 'slider', id: 'sunaz', group: 'Light', label: 'Sun bearing', min: -180, max: 180, step: 1, value: 0, persist: true, onInput: v => { look.sunAz = v; act.relight(); } },
    // Less sky fill makes the unlit sides and cast shadows darker.
    { type: 'slider', id: 'shade', group: 'Light', label: 'Shadow darkness', min: 0, max: 1, step: 0.01, value: 0.4, persist: true, onInput: v => { look.shade = v; act.relight(); } },
    { type: 'choice', id: 'tone', group: 'Post', label: 'Tone map', display: 'stepper', value: 'agx', persist: true, options: [{ value: 'agx', label: 'AgX' }, { value: 'aces', label: 'ACES' }], onPick: v => { grade.tone = v === 'aces' ? 0 : 1; act.repaint(); } },
    // The film look: a Portra 400 grade over the tone map.
    { type: 'slider', id: 'film', group: 'Post', label: 'Film look', min: 0, max: 1, step: 0.01, value: 1, persist: true, onInput: v => { grade.film = v; act.repaint(); } },
    { type: 'slider', id: 'contrast', group: 'Post', label: 'Contrast', min: 0, max: 1, step: 0.01, value: 0.55, persist: true, onInput: v => { grade.contrast = v; act.repaint(); } },
    { type: 'slider', id: 'expo', group: 'Post', label: 'Exposure', min: 0.4, max: 2.5, step: 0.01, value: 1, persist: true, onInput: v => { grade.expo = v; act.repaint(); } },
    { type: 'slider', id: 'grain', group: 'Post', label: 'Grain', min: 0, max: 0.12, step: 0.005, value: 0.045, persist: true, onInput: v => { grade.grain = v; act.repaint(); } },
    { type: 'slider', id: 'vig', group: 'Post', label: 'Vignette', min: 0, max: 0.6, step: 0.01, value: 0.28, persist: true, onInput: v => { grade.vig = v; act.repaint(); } },
  ],
  help: [['hold N', 'Timelapse'], ['click', 'Startle the crows'], ['click', 'Pluck a wire'], ['click', 'Swing the sneakers'], ['scroll', 'Read about the crows']],
} });

look.sunAz = +ui.setting('sunaz').value;
look.shade = +ui.setting('shade').value;
grade.tone = ui.setting('tone').value === 'aces' ? 0 : 1;
for (const k of ['film', 'contrast', 'expo', 'grain', 'vig']) grade[k] = +ui.setting(k).value;

/* ---------- the lane ---------- */
// World metres: x east across the lane, y up, z north along it.
// The eye stands in the lane and looks north, up at the near pole.
const EYE = [0, 1.6, 0], YAW = 12 * D2R, PITCH = 38 * D2R, FOV = 56 * D2R;
// This lens and tilt keep the horizon out of frame from 0.46 to 2.2 wide.
// The Dutch angle: the frame turns this far against the world.
const ROLL = -13 * D2R;
const F = 1 / Math.tan(FOV / 2);
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const unit = a => { const l = Math.hypot(a[0], a[1], a[2]); return [a[0] / l, a[1] / l, a[2] / l]; };
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const FW = [Math.sin(YAW) * Math.cos(PITCH), Math.sin(PITCH), Math.cos(YAW) * Math.cos(PITCH)];
const RT = unit(cross([0, 1, 0], FW)), UP = cross(FW, RT);
const depth = p => dot(sub(p, EYE), FW);
// Scene units: y runs from -1 to 1 over the frame before the roll.
const project = p => { const d = sub(p, EYE), z = dot(d, FW); return [dot(d, RT) / z * F, dot(d, UP) / z * F, z]; };

// Materials. Each has its own procedural surface in the shader.
const WOOD = 0, TIMBER = 1, STEEL = 2, PAINT = 3, PORCELAIN = 4, RUBBER = 5, ALU = 6, COPPER = 7, PVC = 8, POLY = 9, CANVAS = 10, SOLE = 11;
// Kinds: a flat wire, a round part (a cone frustum), a box, a sneaker.
const WIRE = 0, ROUND = 1, BOX = 2, SHOE = 3;
// One part: two ends, a radius at each, a kind and a material.
// A box uses r0 as its half width and hh as its half height.
const parts = [];
let group = 0;
// A wire piece also holds its sag at each end, its span's phase and its swing.
function part(kind, A, B, r0, r1, mat, { hh = 0, first = false, sway = [0, 0, 0, 0] } = {}) {
  parts.push({ group, first, z: (depth(A) + depth(B)) / 2, d: [...A, r0, ...B, r1, sway[0], sway[1], sway[2], kind, mat, sway[3], hh, parts.length * 0.618 % 1] });
}
const round = (A, B, r0, r1, mat, o) => part(ROUND, A, B, r0, r1 ?? r0, mat, o);
const box = (A, B, hw, hh, mat, o = {}) => part(BOX, A, B, hw, hw, mat, { hh, ...o });
// A wire sags like a chain. It is cut where it passes behind the eye.
// A light wire swings more than a heavy cable.
let spans = 0;
function wire(w0, w1, sag, r, mat = ALU, lash = null) {
  const NEAR = 0.7, n = clamp(Math.ceil(Math.hypot(...sub(w1, w0)) / 0.5), 4, 60);
  // A lashed cable moves with its strand: one phase, one swing.
  const phase = lash ? lash.phase : (++spans * 2.399) % 6.283, amp = lash ? lash.amp : sag < 0.3 ? 0.25 : clamp(0.0075 / r, 0.3, 1.1);
  const dip = t => 4 * sag * t * (1 - t);
  const at = t => [lerp(w0[0], w1[0], t), lerp(w0[1], w1[1], t) - dip(t), lerp(w0[2], w1[2], t)];
  let prev = w0, pt = 0;
  for (let i = 1; i <= n; i++) {
    const t = i / n, w = at(t);
    let a = prev, b = w, ta = pt, tb = t;
    prev = w;
    pt = t;
    const za = depth(a), zb = depth(b);
    if (za < NEAR && zb < NEAR) continue;
    if (za < NEAR || zb < NEAR) {
      const k = (NEAR - za) / (zb - za), m = a.map((v, j) => v + (b[j] - v) * k);
      if (za < NEAR) { a = m; ta = lerp(ta, tb, k); } else { b = m; tb = lerp(ta, tb, k); }
    }
    part(WIRE, a, b, r, r, mat, { sway: [dip(ta), dip(tb), phase, amp] });
  }
  // A rider is a thick piece that hangs on the wire and swings with it.
  // A short wide rider is a traced cylinder (ROUND): a flat strip reads as a pill.
  const rider = (t0, t1, rr, m, drop = 0, kind = WIRE) => part(kind, add(at(t0), [0, -drop, 0]), add(at(t1), [0, -drop, 0]), rr, rr, m, { sway: [dip(t0), dip(t1), phase, amp] });
  // A long span can be plucked: keep its line for the tap test.
  if (sag >= 0.3 && group === POLE_Z.length) pluckable.push({ phase, pts: Array.from({ length: 25 }, (_, i) => at(i / 24)) });
  return { at, rider, dip, phase, amp };
}
// A sneaker hangs by its lace from a point on a wire and swings there.
// Each piece carries its pivot and a code: -1 the knot, -2 and -3 a shoe.
// The shoe is one sculpted part from heel to toe; the shader shapes it.
// The knot sits on the top eyelet. The mass centre comes from the shape.
const SHOE_TIE = [0.095, 0.0915], SHOE_COM = [0.131, 0.047];
const shoes = [];
function shoe(piv, lace, yaw, ph) {
  const sw = { sway: [...piv, -(2 + shoes.length)] };
  // The toe tips down until the mass centre hangs under the knot.
  const dx = SHOE_COM[0] - SHOE_TIE[0], dy = SHOE_COM[1] - SHOE_TIE[1], pitch = Math.atan2(dx, -dy);
  const h = Math.cos(pitch), d = [Math.sin(yaw) * h, -Math.sin(pitch), Math.cos(yaw) * h];
  const top = unit(sub([0, 1, 0], d.map(v => v * d[1])));
  const tie = add(piv, [0, -lace, 0]);
  const heel = sub(tie, add(d.map(v => v * SHOE_TIE[0]), top.map(v => v * SHOE_TIE[1])));
  part(SHOE, heel, add(heel, d.map(v => v * 0.29)), 0.19, 0.19, CANVAS, sw);
  part(WIRE, tie, piv, 0.0028, 0.0028, SOLE, sw);
  // The bob is the mass centre, straight under the pivot at rest.
  const L = lace + Math.hypot(dx, dy), b = add(piv, [0, -L, 0]);
  // The collision capsule runs heel to toe along the foot, 45 mm thick.
  const cap = k => sub(add(heel, add(d.map(v => v * k), top.map(v => v * 0.045))), piv);
  shoes.push({ piv, L, ph, b, v: [0, 0, 0], tw: 0, tv: 0, c0: cap(0.06), c1: cap(0.24) });
}
// A polymer post insulator: a steel base, a grey core with thin sheds,
// then a clamp that holds the conductor. It returns the conductor's place.
const POST_H = 0.385;
function post(base, s = 1) {
  const at = h => add(base, [0, h * s, 0]);
  round(at(0), at(0.04), 0.03 * s, 0.03 * s, STEEL);
  round(at(0.04), at(0.34), 0.02 * s, 0.02 * s, POLY);
  for (let i = 0; i < 7; i++) round(at(0.06 + i * 0.04), at(0.082 + i * 0.04), 0.05 * s, 0.026 * s, POLY);
  round(at(0.34), at(0.37), 0.024 * s, 0.024 * s, STEEL);
  box(add(at(POST_H), [0, 0, -0.05 * s]), add(at(POST_H), [0, 0, 0.05 * s]), 0.016 * s, 0.014 * s, STEEL);
  return at(POST_H);
}
// A stack of sheds along an axis: a bushing, an arrester or a cutout body.
function sheds(base, up, len, r, n, mat) {
  const at = h => add(base, up.map(v => v * h));
  round(at(0), at(len), r * 0.42, r * 0.42, mat);
  for (let i = 0; i < n; i++) { const h = len * (0.08 + 0.84 * i / n); round(at(h), at(h + len * 0.45 / n), r, r * 0.5, mat); }
  round(at(len), at(len + 0.035), r * 0.3, r * 0.3, STEEL);
  return at(len + 0.035);
}
// A through bolt's end: a square washer, a nut and the thread's tip.
// dir points out of the wood; side is any direction across it.
function boltEnd(at, dir, side) {
  const o = h => add(at, dir.map(v => v * h)), sd = side.map(v => v * 0.034);
  box(sub(o(0.003), sd), add(o(0.003), sd), 0.003, 0.034, STEEL);
  round(o(0.006), o(0.022), 0.015, 0.015, STEEL);
  round(o(0.022), o(0.04), 0.008, 0.008, STEEL);
}
// A fuse cutout under an arm: a bracket, a shedded body, two contacts
// and the fuse tube between them. It returns the tube's two ends.
function cutout(m) {
  const cu = unit([0, -1, -0.3]), fw = unit([0, -0.3, -1]);
  const c0 = add(m, [0, -0.09, -0.05]), c1 = add(c0, cu.map(v => v * 0.34));
  box(m, c0, 0.018, 0.004, STEEL);
  box(add(c0, [-0.03, 0, 0]), add(c0, [0.03, 0, 0]), 0.012, 0.02, STEEL);
  sheds(add(c0, cu.map(v => v * 0.02)), cu, 0.28, 0.04, 9, POLY);
  const t0 = add(c0, fw.map(v => v * 0.12)), t1 = add(c1, fw.map(v => v * 0.1));
  box(c0, t0, 0.012, 0.005, STEEL);
  box(c1, t1, 0.012, 0.005, STEEL);
  round(t0, t1, 0.011, 0.011, PVC);
  round(add(t0, [0, 0.035, 0]), add(t0, [0, -0.012, 0]), 0.017, 0.017, STEEL);
  round(add(t1, [0, 0.012, 0]), add(t1, [0, -0.03, 0]), 0.015, 0.015, STEEL);
  return { top: add(t0, [0, 0.035, 0]), bot: add(t1, [0, -0.03, 0]) };
}

// Poles stand on the east edge of the lane, 30 m apart.
const POLE_X = 2.6, POLE_Z = [-26.5, 3.5, 33.5, 63.5, 93.5, 123.5], NEAR_Z = 3.5;
const TOP = 8.8, FOOT_R = 0.2, TOP_R = 0.135;
const poleR = y => lerp(FOOT_R, TOP_R, y / TOP);
// The upper arm is grey steel and carries the insulators.
// The lower arm is timber and carries the fuse cutouts.
const A1Y = TOP - 0.42, A1Z = -(poleR(A1Y) + 0.04), A2Y = TOP - 1.1, A2Z = -(poleR(A2Y) + 0.045), ARM_X = 1.0;
const NY = 7.42, RACK = [5.75, 5.55, 5.35], RW = 0.0078, TEL_X = 0.215, HOOK_Y = 5.12;
// Where each line meets a pole: x, y and z from the pole axis.
// Three primaries, the neutral, three secondaries and two telecom cables.
const LINES = [
  { at: [0, TOP + POST_H, 0], sag: 0.45, r: RW, mat: ALU, rod: true },
  { at: [-ARM_X, A1Y + 0.05 + POST_H, A1Z], sag: 0.45, r: RW, mat: ALU, rod: true },
  { at: [ARM_X, A1Y + 0.05 + POST_H, A1Z], sag: 0.45, r: RW, mat: ALU, rod: true },
  { at: [0, NY, -0.245], sag: 0.55, r: 0.007, mat: ALU },
  ...RACK.map((y, i) => ({ at: [0, y, -0.262], sag: 0.95, r: 0.0085, mat: RUBBER })),
  // Each telecom cable hangs lashed under a steel strand.
  // A heavy cable pulls its strand into a deeper sag.
  { at: [-TEL_X, 4.7, 0], sag: 1.35, r: 0.0045, mat: ALU, strand: 1 },
  { at: [-TEL_X, 4.672, 0], sag: 1.35, r: 0.022, mat: RUBBER, lashed: true },
  { at: [-TEL_X, 4.3, 0], sag: 1.15, r: 0.004, mat: ALU, strand: 2 },
  { at: [-TEL_X, 4.284, 0], sag: 1.15, r: 0.012, mat: RUBBER, lashed: true },
];
// Parts that cast shadows on the near pole: ends and radii.
const casters = [], pluckable = [];
let wireStart = 0, shoeHost = [0, 0, 0], shoePiv = null, shoeSide = [-1, 0, 0], shoeAlong = [-1, 0, 0];
// Lace lengths in metres, from the wire to the knot.
// One shoe hangs clearly higher; their bodies still overlap enough to bump.
const SHOE_LACE = [0.54, 0.84];
function buildLane() {
  spans = 0;
  pluckable.length = 0;
  parts.length = 0;
  casters.length = 0;
  POLE_Z.forEach((z, gi) => {
    group = gi;
    const near = z === NEAR_Z, P = (dx, y, dz = 0) => [POLE_X + dx, y, z + dz];
    round(P(0, 0), P(0, TOP), FOOT_R, TOP_R, WOOD, { first: true });
    post(P(0, TOP));
    box(P(-1.2, A1Y, A1Z), P(1.2, A1Y, A1Z), 0.04, 0.05, STEEL);
    box(P(-1.2, A2Y, A2Z), P(1.2, A2Y, A2Z), 0.045, 0.06, TIMBER);
    for (const sx of [-1, 1]) {
      post(P(sx * ARM_X, A1Y + 0.05, A1Z));
      // Flat steel braces run from the timber arm to one bolt on the pole.
      box(P(sx * 0.66, A2Y - 0.06, A2Z - 0.02), P(sx * 0.03, A2Y - 0.52, -poleR(A2Y) - 0.008), 0.003, 0.022, STEEL);
    }
    // The neutral and the secondaries ride on spools in steel clevises.
    round(P(0, NY - 0.04, -0.205), P(0, NY + 0.04, -0.205), 0.038, 0.038, PORCELAIN);
    for (const dy of [-0.05, 0.05]) box(P(0, NY + dy, -poleR(NY)), P(0, NY + dy, -0.215), 0.022, 0.004, STEEL);
    box(P(0, RACK[2] - 0.1, -poleR(5.5) - 0.006), P(0, RACK[0] + 0.1, -poleR(5.5) - 0.006), 0.02, 0.005, STEEL);
    for (const y of RACK) {
      round(P(0, y - 0.035, -0.228), P(0, y + 0.035, -0.228), 0.034, 0.034, PORCELAIN);
      round(P(0, y - 0.045, -0.228), P(0, y + 0.045, -0.228), 0.006, 0.006, STEEL);
    }
    // Each telecom strand runs through a suspension clamp bolted to the pole.
    for (const y of [4.7, 4.3]) {
      box(P(-TEL_X + 0.02, y, -0.07), P(-TEL_X + 0.02, y, 0.07), 0.04, 0.028, STEEL);
      round(P(-TEL_X - 0.02, y, 0), P(-TEL_X - 0.045, y, 0), 0.013, 0.013, STEEL);
    }
    // The next pole up the lane carries one can, on the side toward the eye.
    if (z === POLE_Z[POLE_Z.indexOf(NEAR_Z) + 1]) {
      const Y0 = 6.25, Y1 = 7.1, CR = 0.25, R0 = poleR(6.7) + 0.09 + CR, c = y => P(-R0, y);
      round(c(Y0), c(Y1), CR, CR, PAINT);
      round(c(Y1), c(Y1 + 0.022), CR + 0.012, CR + 0.012, PAINT);
      round(c(Y1 + 0.022), c(Y1 + 0.05), CR + 0.004, CR * 0.6, PAINT);
      for (const y of [Y0 + 0.14, Y1 - 0.12]) box(P(-R0 + CR - 0.01, y), P(-poleR(y) - 0.01, y), 0.032, 0.035, STEEL);
      sheds(add(c(Y1 + 0.04), [0.1, 0, 0]), [0, 1, 0], 0.2, 0.05, 5, PORCELAIN);
    }
    if (!near) return;
    // Square-washer bolts: both arms, the braces, and a column lower down.
    boltEnd(P(0, A1Y, A1Z - 0.04), [0, 0, -1], [1, 0, 0]);
    boltEnd(P(0, A2Y, A2Z - 0.045), [0, 0, -1], [1, 0, 0]);
    boltEnd(P(0, A2Y - 0.52, -poleR(A2Y) - 0.012), [0, 0, -1], [1, 0, 0]);
    for (const y of [5.05, 4.85, 4.05, 3.6]) boltEnd(P(0.02, y, -poleR(y)), [0, 0, -1], [1, 0, 0]);
    for (const x of [-0.85, -0.4, 0.4, 0.85]) round(P(x, A1Y - 0.05, A1Z), P(x, A1Y - 0.09, A1Z), 0.009, 0.009, STEEL);
    // Three fuse cutouts hang from the timber arm, one per phase.
    // A jumper loops down to each from the conductor above.
    const cuts = [-1.05, 0.42, 1.05].map(x => cutout(P(x, A2Y - 0.06, A2Z - 0.02)));
    const taps = [P(-ARM_X, A1Y + 0.05 + POST_H, A1Z - 0.25), P(0, TOP + POST_H, -0.25), P(ARM_X, A1Y + 0.05 + POST_H, A1Z - 0.25)];
    taps.forEach((t, i) => {
      round(add(t, [0, 0, -0.03]), add(t, [0, 0, 0.03]), 0.014, 0.014, STEEL);
      wire(t, cuts[i].top, 0.2, 0.0042, RUBBER);
    });
    // The transformer bank: grey cans on steel mounts round the pole.
    const Y0 = 6.25, Y1 = 7.1, CR = 0.25, R0 = poleR(6.7) + 0.09 + CR;
    const can = (ox, oz, front) => {
      const c = y => P(ox * R0, y, oz * R0), o = [ox, 0, oz], out = (p, k) => add(p, o.map(v => v * k));
      round(c(Y0), c(Y1), CR, CR, PAINT);
      // The base is set back in a rim, so it reads dark from below.
      round(c(Y0 - 0.004), c(Y0 - 0.002), CR - 0.014, CR - 0.014, RUBBER);
      round(c(Y1), c(Y1 + 0.022), CR + 0.012, CR + 0.012, PAINT);
      round(c(Y1 + 0.022), c(Y1 + 0.05), CR + 0.004, CR * 0.6, PAINT);
      // Two steel channels carry the can; each ends at a bolt on the pole.
      for (const y of [Y0 + 0.14, Y1 - 0.12]) {
        box(out(c(y), -CR + 0.01), out(c(y), -R0 + poleR(y) - 0.01), 0.032, 0.035, STEEL);
        if (front) boltEnd(P(ox * poleR(y) * 0.5, y, -poleR(y) * 0.86), [0, 0, -1], [1, 0, 0]);
      }
      // A porcelain bushing takes the high voltage; a black arrester guards it.
      const hv = sheds(out(c(Y1 + 0.04), 0.1), [0, 1, 0], 0.2, 0.05, 5, PORCELAIN);
      const arr = out(add(c(Y1 - 0.02), [oz * 0.14, 0, -ox * 0.14]), -CR - 0.03);
      box(out(arr, 0.02), out(arr, CR * 0.3), 0.012, 0.004, STEEL);
      sheds(arr, [0, 1, 0], 0.2, 0.038, 6, RUBBER);
      if (!front) return { hv, lv: [] };
      // Two low-voltage studs face the lane.
      const lv = [0.35, 0.95].map(k => {
        const d = unit([ox * (1 - k), 0, oz * (1 - k) - k]), s = add(c(Y1 - 0.2), d.map(v => v * CR));
        round(s, add(s, d.map(v => v * 0.05)), 0.022, 0.018, PORCELAIN);
        round(add(s, d.map(v => v * 0.05)), add(s, d.map(v => v * 0.085)), 0.008, 0.008, STEEL);
        return add(s, d.map(v => v * 0.085));
      });
      return { hv, lv };
    };
    const cans = [can(-1, 0, true), can(0.26, 0.966, false), can(1, 0, true)];
    box(P(-R0 - 0.06, Y0 + 0.3, -CR - 0.002), P(-R0 + 0.06, Y0 + 0.3, -CR - 0.002), 0.002, 0.04, ALU);
    // A lead droops from each fuse to its can; black cables go to the rack.
    // A shallow sag keeps the back lead off the lid of the side can.
    cuts.forEach((c, i) => wire(c.bot, cans[i].hv, 0.05, 0.0042, RUBBER));
    // A lead drops clear of its can first, then swings in to the rack.
    cans.forEach((c, i) => c.lv.forEach((p, j) => {
      const drop = [p[0], Y0 - 0.12, p[2]];
      wire(p, drop, 0.01, 0.007, RUBBER);
      wire(drop, P(i ? 0.03 : -0.03, RACK[j + (i ? 1 : 0)], -0.262), 0.2, 0.007, RUBBER);
    }));
    // A moulding covers the ground wire down the pole; staples hold it.
    box(P(0.085, 0, -poleR(0) - 0.004), P(0.085, TOP - 0.2, -poleR(TOP - 0.2) - 0.004), 0.011, 0.006, PVC);
    for (let y = 2.4; y < TOP - 0.3; y += 0.55) box(P(0.06, y, -poleR(y) - 0.011), P(0.11, y, -poleR(y) - 0.011), 0.0025, 0.004, STEEL);
    // A grey riser pipe with two straps, and two number tags.
    round(P(-0.17, 0, -0.17), P(-0.153, 5.2, -0.153), 0.04, 0.04, PVC);
    for (const y of [3.1, 4.5]) round(P(-0.168, y, -0.168), P(-0.168, y + 0.03, -0.168), 0.046, 0.046, STEEL);
    box(P(-0.05, 3.9, -poleR(3.9) - 0.002), P(0.0, 3.9, -poleR(3.9) - 0.002), 0.002, 0.028, ALU);
    box(P(-0.045, 3.8, -poleR(3.8) - 0.002), P(-0.005, 3.8, -poleR(3.8) - 0.002), 0.002, 0.014, ALU);
    // Each service drop ends on an eye hook under the rack.
    // A tail runs from the hook up to its secondary.
    for (const sx of [-1, 1]) {
      const hook = P(sx * 0.06, HOOK_Y, -poleR(HOOK_Y));
      round(hook, add(hook, [0, 0, -0.05]), 0.008, 0.008, STEEL);
      round(add(hook, [0, -0.02, -0.05]), add(hook, [0, 0.02, -0.05]), 0.016, 0.016, STEEL);
      wire(add(hook, [0, 0, -0.05]), P(sx * 0.02, RACK[sx < 0 ? 0 : 2], -0.262), 0.05, 0.006, RUBBER);
    }
    casters.push([P(0, 0), FOOT_R, P(0, TOP), TOP_R], [P(-1.2, A2Y, A2Z), 0.055, P(1.2, A2Y, A2Z), 0.055],
      [P(-R0, Y0), CR, P(-R0, Y1 + 0.03), CR], [P(R0, Y0), CR, P(R0, Y1 + 0.03), CR]);
  });
  group = POLE_Z.length;
  const ni = POLE_Z.indexOf(NEAR_Z);
  // The last strand's span per bay; the cable under it is lashed to it.
  const strands = [];
  for (const { at, sag, r, mat, rod, strand, lashed } of LINES) {
    for (let i = 0; i + 1 < POLE_Z.length; i++) {
      const w = wire([POLE_X + at[0], at[1], POLE_Z[i] + at[2]], [POLE_X + at[0], at[1], POLE_Z[i + 1] + at[2]], sag, r, mat, lashed ? strands[i] : null);
      if (strand) strands[i] = Object.assign(w, { strand });
      if (i !== ni) continue;
      // A splice case closes round the upper cable, on its axis.
      // It draws after the cable, so the cable enters at its ends.
      if (lashed && strands[i].strand === 1) w.rider(0.03, 0.055, 0.065, RUBBER, 0, ROUND);
      if (strand === 2) {
        // The telecom drop leaves from a clamp on the lower strand.
        w.rider(0.011, 0.014, 0.012, ALU);
        wire(w.at(0.0125), [-12, 4.0, 7], 0.5, 0.006, RUBBER);
      }
    }
    // Armour rods thicken each primary where it lies in its clamp.
    if (rod) for (const z of POLE_Z) wire([POLE_X + at[0], at[1], z + at[2] - 0.45], [POLE_X + at[0], at[1], z + at[2] + 0.45], 0.002, r * 1.6, mat);
  }
  // Two service drops leave the hooks for the houses, each in a wedge clamp.
  for (const [sx, to, sg] of [[1, [14, 4.9, 6.5], 0.6], [-1, [-12, 4.8, 5], 0.7]]) {
    const w = wire([POLE_X + sx * 0.06, HOOK_Y, NEAR_Z - poleR(HOOK_Y) - 0.05], to, sg, 0.011, RUBBER);
    w.rider(0.004, 0.016, 0.017, ALU);
    if (sx > 0) continue;
    // A pair of sneakers hangs over the west drop, in open sky, laces tied.
    const t = 0.2, from = [POLE_X - 0.06, HOOK_Y, NEAR_Z];
    shoePiv = w.at(t);
    shoeHost = [w.dip(t), w.phase, w.amp];
    shoeSide = unit(cross(sub(to, from), [0, 1, 0]));
    shoeAlong = unit(sub(to, from));
    // The two laces are tied into one string, thrown over the cable.
    // So one shoe hangs on each side of it, one lower than the other.
    const over = k => add(shoePiv, shoeSide.map(v => v * k));
    shoe(over(0.014), SHOE_LACE[0], 2.5, 1.3);
    shoe(over(-0.014), SHOE_LACE[1], 3.9, 3.7);
    part(WIRE, add(over(0.014), [0, 0.013, 0]), add(over(-0.014), [0, 0.013, 0]), 0.0028, 0.0028, SOLE, { sway: [...add(shoePiv, [0, 0.013, 0]), -1] });
    part(WIRE, over(0.014), add(over(0.014), [0, 0.013, 0]), 0.0028, 0.0028, SOLE, { sway: [...over(0.014), -1] });
    part(WIRE, over(-0.014), add(over(-0.014), [0, 0.013, 0]), 0.0028, 0.0028, SOLE, { sway: [...over(-0.014), -1] });
  }
  // Far poles draw first. In a group, the pole draws before its fittings.
  const rank = g => (g === POLE_Z.length ? 1e3 : -POLE_Z[g]);
  parts.sort((a, b) => rank(a.group) - rank(b.group) || b.first - a.first || b.z - a.z);
  // The spans and drops sway, so they draw each frame, after the bake.
  wireStart = parts.findIndex(p => p.group === POLE_Z.length);
  return Float32Array.from(parts.flatMap(p => p.d));
}

/* ---------- GLSL ---------- */
const TW = 128, CZ = 4, CELL = 0.07, GZ = 16, TX = 4, TAU_E = 0.2, SPAN = 0.03;
const HEAD = `#version 300 es
precision highp float;
precision highp int;
precision highp sampler2D;
`;
const TRI = `#version 300 es
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;
const HASH = `
uint ih(uint x) {
  x ^= x >> 16; x *= 0x7feb352du; x ^= x >> 15; x *= 0x846ca68bu; x ^= x >> 16;
  return x;
}
float h01(uint x) { return float(ih(x) >> 8) / 16777216.0; }
`;
// Screen pixels and unrolled scene pixels differ by the roll.
const ROT = `
uniform float uRoll;
vec2 rot(vec2 v, float a) { float c = cos(a), s = sin(a); return vec2(c * v.x - s * v.y, s * v.x + c * v.y); }
`;
const FIELD = `
uniform vec3 uGMin, uGf;
uniform float uCell;
uniform vec2 uAtlas;
vec4 fs(sampler2D t, vec3 p) {
  vec3 g = clamp((p - uGMin) / uCell - 0.5, vec3(0.0), uGf - 1.0);
  float z0 = floor(g.z), fz = g.z - z0, z1 = min(z0 + 1.0, uGf.z - 1.0);
  vec2 t0 = vec2(mod(z0, ${TX}.0), floor(z0 / ${TX}.0)) * uGf.xy;
  vec2 t1 = vec2(mod(z1, ${TX}.0), floor(z1 / ${TX}.0)) * uGf.xy;
  return mix(texture(t, (t0 + g.xy + 0.5) / uAtlas), texture(t, (t1 + g.xy + 0.5) / uAtlas), fz);
}
`;
const NOISE3 = `
float h3(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float n3(vec3 x) {
  vec3 i = floor(x), f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(h3(i), h3(i + vec3(1, 0, 0)), f.x), mix(h3(i + vec3(0, 1, 0)), h3(i + vec3(1, 1, 0)), f.x), f.y),
    mix(mix(h3(i + vec3(0, 0, 1)), h3(i + vec3(1, 0, 1)), f.x), mix(h3(i + vec3(0, 1, 1)), h3(i + vec3(1, 1, 1)), f.x), f.y), f.z);
}
`;

// The sky: the shared palette by hour, the sun's disc and the stars.
// It bakes at half size when the hour changes.
const SKY_FS = `${HEAD}
uniform vec2 uRes;
uniform float uF, uStars, uSkyI, uMoonI, uNight;
uniform vec3 uFw, uRt, uUp, uSun, uKeyC, uZen, uMid, uBand, uAnti, uMoon, uCity;
${ROT}
${SKY}
// A physical sky: single Rayleigh and Mie scattering, ozone, Earth's shadow.
const float R_E = 6371e3, R_A = 6471e3, H_R = 8e3, H_M = 1.2e3, G_M = 0.76, B_M = 21e-6;
const vec3 B_R = vec3(5.5e-6, 13.0e-6, 22.4e-6), B_O = vec3(0.65e-6, 1.881e-6, 0.085e-6);
vec2 rsi(vec3 o, vec3 d, float r) {
  float b = dot(o, d), c = dot(o, o) - r * r, h = b * b - c;
  if (h < 0.0) return vec2(1e5, -1e5);
  h = sqrt(h);
  return vec2(-b - h, -b + h);
}
vec3 atm(vec3 d, vec3 s) {
  vec3 o = vec3(0.0, R_E + 2.0, 0.0);
  float tEnd = rsi(o, d, R_A).y;
  vec2 g = rsi(o, d, R_E);
  if (g.x > 0.0) tEnd = min(tEnd, g.x);
  float ds = tEnd / 16.0, mu = dot(d, s), gg = G_M * G_M;
  float pr = 3.0 / (16.0 * 3.14159) * (1.0 + mu * mu);
  float pm = 3.0 / (8.0 * 3.14159) * ((1.0 - gg) * (mu * mu + 1.0)) / (pow(1.0 + gg - 2.0 * mu * G_M, 1.5) * (2.0 + gg));
  vec3 tr = vec3(0.0), tm = vec3(0.0);
  float odR = 0.0, odM = 0.0;
  for (int i = 0; i < 16; i++) {
    vec3 p = o + d * (ds * (float(i) + 0.5));
    float h = length(p) - R_E, dr = exp(-h / H_R) * ds, dm = exp(-h / H_M) * ds;
    odR += dr;
    odM += dm;
    float dl = rsi(p, s, R_A).y / 8.0, lR = 0.0, lM = 0.0;
    bool lit = true;
    for (int j = 0; j < 8; j++) {
      float hl = length(p + s * (dl * (float(j) + 0.5))) - R_E;
      // Earth's shadow: the light ray meets the ground.
      if (hl < 0.0) { lit = false; break; }
      lR += exp(-hl / H_R) * dl;
      lM += exp(-hl / H_M) * dl;
    }
    if (!lit) continue;
    vec3 a = exp(-((B_R + B_O) * (odR + lR) + B_M * 1.1 * (odM + lM)));
    tr += dr * a;
    tm += dm * a;
  }
  return pr * B_R * tr + pm * B_M * tm;
}
out vec4 o;
void main() {
  vec2 c = (gl_FragCoord.xy - 0.5 * uRes) / (0.5 * uRes.y);
  vec2 s = rot(c, -uRoll);
  vec3 d = normalize(uFw + (s.x * uRt + s.y * uUp) / uF);
  // The physical sky, plus the palette's twilight glow; uZen and the rest carry only that.
  vec3 dd = normalize(vec3(d.x, max(d.y, 0.002), d.z));
  vec3 col = atm(dd, uSun) * uSkyI + skSky(d, uSun, uZen, uMid, uBand, uAnti, uStars, 0.0);
  // After dark: moonlit air and the city's glow low down.
  if (uMoonI > 0.0) col += atm(dd, uMoon) * uMoonI + uCity * exp(-dd.y * 5.0);
  // The moon: a crescent disc, about 1 degree across, lit from the sun's side.
  float mr = 0.009, ma = acos(clamp(dot(d, uMoon), -1.0, 1.0));
  if (uNight > 0.0 && uMoon.y > 0.0 && ma < mr * 1.2) {
    vec3 mx = normalize(cross(uMoon, vec3(0.0, 1.0, 0.0)) + 1e-5), my = cross(mx, uMoon);
    vec2 q = vec2(dot(d, mx), dot(d, my)) / mr;
    float r = length(q), edge = 1.0 - smoothstep(0.9, 1.0, r);
    // The disc as a sphere; z points back at the eye.
    vec3 n = vec3(q, sqrt(max(1.0 - r * r, 0.0)));
    // The light comes 135 degrees round from the eye: a waxing crescent.
    vec2 sd = normalize(vec2(dot(uSun, mx), dot(uSun, my)) + 1e-4);
    vec3 L = vec3(sd * 0.707, -0.707);
    float lit = smoothstep(-0.03, 0.08, dot(n, L));
    // Grey seas, and faint earthshine on the dark side.
    float sea = 0.78 + 0.22 * skN(q * 2.6 + 7.0);
    vec3 mc = vec3(1.0, 0.96, 0.88) * (0.9 * lit * sea + 0.012);
    col = mix(col, mc, edge * uNight);
  }
  // The sun's disc and its glare, when it stands above the horizon.
  float sd = dot(d, uSun);
  col += uKeyC * step(0.0, uSun.y) * (12.0 * smoothstep(0.99996, 0.99999, sd) + 0.25 * pow(max(sd, 0.0), 300.0) + 0.06 * pow(max(sd, 0.0), 12.0));
  o = vec4(col, 1.0);
}`;
// The clouds: soft cumulus volumes, marched at a third of the size.
// They redraw a few times a second as they drift, so the march is short.
// Out: the light the cloud sends, and how much sky it hides.
const CLOUD_FS = `${HEAD}
uniform vec2 uRes, uOff, uSeed;
uniform float uF, uCover;
uniform vec3 uFw, uRt, uUp, uKey, uKeyC, uZen, uMid;
${ROT}
${SKY}
${NOISE3}
out vec4 o;
// Cumulus lie in a deck from 1.5 to 2.7 km; units are km.
const float BASE = 1.5, TOP = 2.7;
float density(vec3 p, int oct) {
  float h = (p.y - BASE) / (TOP - BASE);
  // Flat bases and rounded tops.
  float prof = smoothstep(0.0, 0.12, h) * smoothstep(1.0, 0.35, h);
  // The field drifts with the wind; uSeed gives each visit its own sky.
  vec3 q = (p + vec3(uOff.x, 0.0, uOff.y)) * 0.55 + vec3(uSeed.x, 0.0, uSeed.y);
  float n = n3(q) * 0.62 + n3(q * 2.1 + 7.0) * 0.26;
  if (oct > 2) n += n3(q * 4.3 + 3.0) * 0.12;
  float c = skFbm((p.xz + uOff) * 0.09 + uSeed, 3) * 1.25 - 0.22;
  return clamp((n * prof + c - 1.08 + uCover) * 3.0, 0.0, 1.0);
}
// Henyey-Greenstein phase.
float hg(float c, float g) { return (1.0 - g * g) / pow(1.0 + g * g - 2.0 * g * c, 1.5) * 0.0796; }
void main() {
  vec2 c = (gl_FragCoord.xy - 0.5 * uRes) / (0.5 * uRes.y);
  vec2 s = rot(c, -uRoll);
  vec3 d = normalize(uFw + (s.x * uRt + s.y * uUp) / uF);
  o = vec4(0.0);
  if (d.y < 0.1) return;
  float t0 = BASE / d.y, t1 = min(TOP / d.y, t0 + 12.0);
  const int N = 30;
  float ds = (t1 - t0) / float(N), T = 1.0;
  vec3 L = vec3(0.0);
  float ph = mix(hg(dot(d, uKey), 0.55), hg(dot(d, uKey), -0.2), 0.3);
  vec3 amb = mix(uZen, uMid, 0.5) * 1.1;
  float jit = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));
  for (int i = 0; i < N; i++) {
    vec3 p = d * (t0 + (float(i) + jit) * ds);
    float den = density(p, 3);
    if (den < 0.003) continue;
    // Three steps toward the light measure how much cloud shades this point.
    float od = 0.0;
    for (int j = 1; j <= 3; j++) od += density(p + uKey * 0.22 * float(j), 2);
    float tl = exp(-od * 0.22 * 7.0);
    float h = clamp((p.y - BASE) / (TOP - BASE), 0.0, 1.0);
    vec3 e = uKeyC * tl * (ph * 12.0 + 0.5) * (1.0 - exp(-den * 4.0)) + amb * (0.25 + 0.75 * h);
    float a = 1.0 - exp(-den * 7.0 * ds);
    L += T * a * e;
    T *= 1.0 - a;
    if (T < 0.02) break;
  }
  // Far clouds fade into the low sky.
  float fade = exp(-t0 / 11.0) * smoothstep(0.1, 0.28, d.y);
  o = vec4(L, 1.0 - T) * fade;
}`;

// One part of the lane. The vertex shader bounds it on screen.
// The fragment shader traces it: a wire, a cone frustum or a box.
const PART_VS = `${HEAD}
layout(location = 0) in vec4 iA;
layout(location = 1) in vec4 iB;
layout(location = 2) in vec4 iC;
layout(location = 3) in vec4 iM;
uniform vec2 uRes;
uniform float uF, uTime, uWind;
uniform int uPass;
uniform vec3 uEye, uFw, uRt, uUp;
${ROT}
out vec2 vPx;
flat out vec4 vA, vB, vM, vS;
flat out vec3 vK;
// A sneaker's own up: its frame turns with it, so it never flips.
flat out vec3 vU;
// The CPU swings the shoes: a turn per shoe and the knot's ride.
uniform mat3 uShoeR[2];
uniform vec3 uPluck, uShoeAt;
// How far the wind turns a span about the line between its ends.
// Gusts run north along the lane.
float gust(float ph, float amp, float z) {
  ph -= z * 0.06;
  return uWind * amp * (0.2 * sin(uTime * 0.7 + ph) + 0.09 * sin(uTime * 1.7 + ph * 2.3) + 0.035 * sin(uTime * 3.9 + ph * 5.1) + 0.12);
}
// A point with sag s swings like a link in a hanging chain.
vec3 swing(vec3 p, float s, vec3 side, float th) {
  return p + s * (sin(th) * side + (1.0 - cos(th)) * vec3(0.0, 1.0, 0.0));
}
void main() {
  float ppu = 0.5 * uRes.y, kind = iC.w;
  // Each program draws its own kinds; the rest leave the screen.
  int mine = kind < 0.5 ? 0 : kind < 2.5 ? 1 : 2;
  if (mine != uPass) { gl_Position = vec4(2.0, 2.0, 0.0, 1.0); return; }
  vec3 pa = iA.xyz, pb = iB.xyz;
  vU = vec3(0.0, 1.0, 0.0);
  if (iM.y < 0.0) {
    int k = int(-iM.y + 0.5) - 2;
    mat3 R = k == 0 ? uShoeR[0] : k == 1 ? uShoeR[1] : mat3(1.0);
    vec3 at = iC.xyz + uShoeAt;
    pa = at + R * (pa - iC.xyz);
    pb = at + R * (pb - iC.xyz);
    // The rest up matches shoe() on the CPU.
    if (kind > 2.5) { vec3 d0 = normalize(iB.xyz - iA.xyz); vU = R * normalize(vec3(0.0, 1.0, 0.0) - d0 * d0.y); }
  } else if (kind < 0.5 || kind < 1.5 && iC.x + iC.y > 0.0) {
    // A wire, or a round part that rides a wire: both sway with the span.
    vec3 side = normalize(cross(pb - pa, vec3(0.0, 1.0, 0.0)) + 1e-5);
    float th = gust(iC.z, iM.y, pa.z);
    pa = swing(pa, iC.x, side, th);
    pb = swing(pb, iC.y, side, th);
    // uPluck: the plucked span's phase, the age, the strength.
    if (abs(iC.z - uPluck.x) < 0.001 && uPluck.z > 0.0) {
      float k = uPluck.z * exp(-uPluck.y * 1.2) * sin(uPluck.y * (7.0 + 9.0 * iM.y));
      vec3 w = vec3(0.0, 1.0, 0.0) * 0.5 + side * 0.25;
      pa += w * iC.x * k;
      pb += w * iC.y * k;
    }
  }
  vec3 da = pa - uEye, db = pb - uEye;
  float za = max(dot(da, uFw), 0.3), zb = max(dot(db, uFw), 0.3);
  vec2 a = vec2(dot(da, uRt), dot(da, uUp)) / za * uF * ppu, b = vec2(dot(db, uRt), dot(db, uUp)) / zb * uF * ppu;
  // A box is bounded by the diagonal of its section.
  bool isBox = kind > 1.5 && kind < 2.5;
  float e0 = isBox ? length(vec2(iA.w, iM.z)) : iA.w, e1 = isBox ? length(vec2(iB.w, iM.z)) : iB.w;
  float ra = e0 / za * uF * ppu, rb = e1 / zb * uF * ppu;
  // Perspective swells a near round part past its axis radius.
  float pad = kind > 0.5 ? 1.25 : 1.0;
  vec2 ba = b - a;
  float L = length(ba);
  vec2 f = L > 1e-4 ? ba / L : vec2(1.0, 0.0), n = vec2(-f.y, f.x);
  float ea = max(ra, 0.6) * pad + 2.0, eb = max(rb, 0.6) * pad + 2.0;
  bool head = (gl_VertexID & 1) == 1;
  vec2 P = (head ? b + f * eb : a - f * ea) + n * max(ea, eb) * ((gl_VertexID >> 1) == 1 ? 1.0 : -1.0);
  vPx = P;
  gl_Position = vec4(rot(P, uRoll) / (0.5 * uRes), 0.0, 1.0);
  vA = vec4(pa, iA.w);
  vB = vec4(pb, iB.w);
  vM = iM;
  vS = vec4(a, b);
  vK = vec3(ra, rb, kind);
}`;
// One source, three programs: PASS 0 wires, 1 solid parts, 2 the sneakers.
// One large shader took the driver most of a minute to compile.
const partFS = pass => `${HEAD}
#define PASS ${pass}
uniform vec2 uRes;
uniform float uF;
uniform vec3 uEye, uFw, uRt, uUp, uKey, uKeyC, uSun, uZen, uMid, uBand, uAnti, uHaze;
uniform vec4 uOcA[4], uOcB[4];
// A passing car: its headlights (place and power), its beam, its tail lights.
uniform vec4 uCar, uTail;
// The headlight beam's way and the tail lights' way.
uniform vec3 uCarD, uTailD;
// The sky fill's gain: lower is darker shade.
uniform float uFill;
// The bake runs four times; uJit moves the ray inside the pixel.
uniform vec2 uJit;
${SKY}
in vec2 vPx;
flat in vec4 vA, vB, vM, vS;
flat in vec3 vK;
flat in vec3 vU;
out vec4 o;
float hash(vec2 p) { vec3 q = fract(p.xyx * 0.1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
}
float dot2(vec3 v) { return dot(v, v); }
// Inigo Quilez's capped cone: the hit distance and the normal.
float iCone(vec3 ro, vec3 rd, vec3 pa, vec3 pb, float ra, float rb, out vec3 n) {
  vec3 ba = pb - pa, oa = ro - pa, ob = ro - pb;
  float m0 = dot(ba, ba), m1 = dot(oa, ba), m2 = dot(rd, ba), m3 = dot(rd, oa), m5 = dot(oa, oa), m9 = dot(ob, ba);
  if (m1 < 0.0) {
    if (dot2(oa * m2 - rd * m1) < ra * ra * m2 * m2) { n = -ba * inversesqrt(m0); return -m1 / m2; }
  } else if (m9 > 0.0) {
    float t = -m9 / m2;
    if (dot2(ob + rd * t) < rb * rb) { n = ba * inversesqrt(m0); return t; }
  }
  float rr = ra - rb, hy = m0 + rr * rr;
  float k2 = m0 * m0 - m2 * m2 * hy, k1 = m0 * m0 * m3 - m1 * m2 * hy + m0 * ra * rr * m2;
  float k0 = m0 * m0 * m5 - m1 * m1 * hy + m0 * ra * (rr * m1 * 2.0 - m0 * ra);
  float h = k1 * k1 - k2 * k0;
  if (h < 0.0) return -1.0;
  float t = (-k1 - sqrt(h)) / k2, y = m1 + t * m2;
  if (y < 0.0 || y > m0) return -1.0;
  n = normalize(m0 * (m0 * (oa + t * rd) + rr * ba * ra) - ba * hy * y);
  return t;
}
// A box in its own frame: half sizes h, the hit and the normal.
float iBox(vec3 ro, vec3 rd, vec3 h, out vec3 n) {
  vec3 m = 1.0 / rd, k = abs(m) * h, t1 = -m * ro - k, t2 = -m * ro + k;
  float tn = max(max(t1.x, t1.y), t1.z), tf = min(min(t2.x, t2.y), t2.z);
  if (tn > tf || tf < 0.0) return -1.0;
  n = -sign(rd) * step(t1.yzx, t1.xyz) * step(t1.zxy, t1.xyz);
  return tn;
}
// Wood: q.x runs across the grain and q.y along it, in metres.
// It returns the height, 1 at the surface and 0 in a check.
// k is the knot mask: 1 at a knot's heart.
float woodH(vec2 q, float seed, out float k) {
  q.x += seed * 3.0;
  // Knots: one in some cells, where the grain bends round a dark heart.
  vec2 g = q / vec2(0.21, 0.55), id = floor(g), f = fract(g) - 0.5;
  vec2 o = (vec2(hash(id + 3.1), hash(id + 7.7)) - 0.5) * 0.6;
  float on = step(0.45, hash(id + 1.3));
  float kd = length((f - o) * vec2(0.21, 0.55) / vec2(0.016, 0.026));
  k = on * (1.0 - smoothstep(0.6, 1.0, kd));
  float bend = on * exp(-kd * 0.6) * 0.012;
  q.x += bend * sign(f.x - o.x);
  float fib = noise(vec2(q.x * 260.0, q.y * 7.0)) * 0.6 + noise(vec2(q.x * 90.0, q.y * 2.5)) * 0.4;
  // Checks: long cracks that wander and come and go along the pole.
  float c = noise(vec2(q.x * 10.0, q.y * 0.28));
  float len = smoothstep(0.3, 0.55, noise(vec2(q.x * 5.0 + 9.0, q.y * 0.8)));
  float crack = (1.0 - smoothstep(0.0, 0.05, abs(c - 0.5))) * len;
  float fine = (1.0 - smoothstep(0.0, 0.02, abs(noise(vec2(q.x * 38.0, q.y * 1.1)) - 0.5))) * 0.35;
  return clamp(0.2 * fib + 0.8 * (1.0 - max(crack, fine)) - 0.3 * k, 0.0, 1.0);
}
// The sneaker, in its own frame: x from heel to toe, y up, z across.
// It returns the distance; m is 1 on the canvas upper and 0 on the sole.
float smin(float a, float b, float k) { float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0); return mix(b, a, h) - k * h * (1.0 - h); }
float sdCap(vec3 p, vec3 a, vec3 b, float r) { vec3 pa = p - a, ba = b - a; return length(pa - ba * clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0)) - r; }
float shoeD(vec3 p, out float m) {
  // The toe lifts a little off the ground.
  p.y -= 0.014 * smoothstep(0.18, 0.29, p.x);
  // The sole: a stadium in plan, wider at the ball, 24 mm thick.
  float w = mix(0.039, 0.047, smoothstep(0.04, 0.19, p.x)) * (1.0 - 0.18 * smoothstep(0.22, 0.29, p.x));
  float plan = length(p.xz - vec2(clamp(p.x, 0.045, 0.245), 0.0)) - w;
  vec2 e = vec2(plan, abs(p.y - 0.012) - 0.012);
  float sole = length(max(e, 0.0)) + min(max(e.x, e.y), 0.0) - 0.003;
  // The upper: the foot, the toe box and a high collar, blended smooth.
  float foot = sdCap(p, vec3(0.055, 0.052, 0.0), vec3(0.2, 0.046, 0.0), 0.038);
  float toe = length((p - vec3(0.236, 0.04, 0.0)) * vec3(1.0, 1.3, 1.0)) - 0.038;
  float collar = sdCap(p, vec3(0.058, 0.06, 0.0), vec3(0.074, 0.152, 0.0), 0.04);
  float up = smin(smin(foot, toe, 0.022), collar, 0.028);
  // The opening where the foot goes in.
  up = max(up, -sdCap(p, vec3(0.068, 0.105, 0.0), vec3(0.082, 0.23, 0.0), 0.03));
  up = max(up, 0.021 - p.y);
  m = up < sole ? 1.0 : 0.0;
  return min(up, sole);
}
// ao: 1 in the open, less down in a crack.
struct Surf { vec3 alb; float rough, metal; vec3 n; float ao; };
// Each material: colour, roughness and a bumped normal.
// q is the surface place in metres; tx and ty are its tangents.
Surf surface(float mat, vec2 q, vec3 n, vec3 tx, vec3 ty, vec3 p, float seed, bool cap) {
  Surf s = Surf(vec3(0.5), 0.6, 0.0, n, 1.0);
  float e = 0.0015;
  if (mat < 1.5) {
    if (cap) {
      // End grain: growth rings and a dark heart.
      float r = length(q);
      s.alb = 0.45 * mix(vec3(0.3, 0.24, 0.17), vec3(0.46, 0.4, 0.31), 0.5 + 0.5 * sin(r * 420.0 + noise(q * 30.0) * 4.0));
      s.rough = 0.9;
      return s;
    }
    float k, k2;
    float h = woodH(q, seed, k), hx = woodH(q + vec2(e, 0.0), seed, k2), hy = woodH(q + vec2(0.0, e * 12.0), seed, k2);
    // Bump: the checks and the raised grain tilt the normal.
    float fb = noise(vec2(q.x * 700.0, q.y * 30.0)), fbx = noise(vec2((q.x + e) * 700.0, q.y * 30.0));
    s.n = normalize(n - 0.026 * ((hx - h) / e * tx + (hy - h) / (e * 12.0) * ty) - 0.0011 * (fbx - fb) / e * tx);
    // Weather turns a pole silver up high; the treatment stays brown below.
    // Rain streaks and old stains run down the grain.
    float streak = noise(vec2(q.x * 18.0 + seed * 9.0, q.y * 0.3));
    float blot = noise(vec2(q.x * 3.5, q.y * 0.5 + 4.0));
    // A sawn arm is newer wood: tan, with little grey yet.
    float up = mat < 0.5 ? smoothstep(1.5, 8.0, p.y) * 0.7 : 0.12;
    vec3 brown = vec3(0.19, 0.13, 0.07), sand = mat < 0.5 ? vec3(0.34, 0.3, 0.17) : vec3(0.5, 0.38, 0.22), silver = vec3(0.26, 0.24, 0.2);
    vec3 base = mix(mix(brown, sand, blot), silver, up * (0.35 + 0.65 * streak));
    base = mix(base, brown * 0.7, 0.45 * smoothstep(0.55, 0.8, noise(vec2(q.x * 7.0 + 2.0, q.y * 0.22))));
    base = mix(base, vec3(0.07, 0.045, 0.03), k);
    // Old creosote keeps the wood dark.
    s.alb = 0.45 * base * (0.4 + 0.6 * smoothstep(0.15, 0.95, h)) * (0.8 + 0.4 * noise(q * vec2(240.0, 5.0)));
    // Roughness: raw fibre in the checks, worn ridges smoother.
    // Knots hold resin and old treatment oil lies in patches: both shine a little.
    float oil = smoothstep(0.55, 0.8, noise(vec2(q.x * 7.0 + 2.0, q.y * 0.22))) * (1.0 - up);
    s.rough = mix(0.95, 0.68, smoothstep(0.3, 0.95, h));
    s.rough = mix(s.rough, 0.42, max(k * 0.8, oil * 0.6));
    s.rough = clamp(s.rough + 0.1 * (fb - 0.5), 0.3, 1.0);
    // A check is a deep slot: little sky or sun reaches its floor.
    s.ao = 0.25 + 0.75 * smoothstep(0.1, 0.85, h);
  } else if (mat < 2.5) {
    // Galvanised steel: dull zinc with a faint spangle.
    float sp = noise(q * 300.0);
    s.alb = vec3(0.56, 0.58, 0.6) * (0.85 + 0.25 * sp);
    s.rough = 0.42 + 0.2 * sp;
    s.metal = 1.0;
  } else if (mat < 3.5) {
    // Transformer paint: grey enamel with rain streaks and a little rust.
    float streak = noise(vec2(q.x * 26.0, q.y * 1.4));
    float rust = smoothstep(0.62, 0.8, noise(q * vec2(9.0, 5.0) + 3.0)) * smoothstep(0.5, 0.0, fract(q.y * 1.15));
    s.alb = mix(vec3(0.42, 0.45, 0.46) * (0.8 + 0.3 * streak), vec3(0.3, 0.13, 0.06), rust * 0.5);
    s.rough = 0.38 + 0.3 * rust;
    float h = noise(q * 420.0), hx = noise((q + vec2(e, 0.0)) * 420.0), hy = noise((q + vec2(0.0, e)) * 420.0);
    s.n = normalize(n - 0.0006 * ((hx - h) / e * tx + (hy - h) / e * ty));
  } else if (mat < 4.5) {
    s.alb = vec3(0.5, 0.5, 0.52);
    s.rough = 0.18;
  } else if (mat < 5.5) {
    s.alb = vec3(0.022, 0.022, 0.025);
    s.rough = 0.55;
  } else if (mat < 6.5) {
    s.alb = vec3(0.6, 0.61, 0.62) * (0.8 + 0.2 * noise(q * 200.0));
    s.rough = 0.5;
    s.metal = 1.0;
  } else if (mat < 7.5) {
    s.alb = vec3(0.32, 0.2, 0.12);
    s.rough = 0.55;
    s.metal = 1.0;
  } else if (mat < 8.5) {
    s.alb = vec3(0.4, 0.41, 0.42) * (0.85 + 0.2 * noise(vec2(q.x * 30.0, q.y * 2.0)));
    s.rough = 0.6;
  } else if (mat < 9.5) {
    // Grey silicone sheds: matt, a little dusty.
    s.alb = vec3(0.34, 0.35, 0.37) * (0.9 + 0.15 * noise(q * 60.0));
    s.rough = 0.55;
  } else if (mat < 10.5) {
    // Faded red canvas with a coarse weave.
    s.alb = vec3(0.42, 0.045, 0.04) * (0.75 + 0.4 * noise(q * 900.0));
    s.rough = 0.92;
  } else {
    // Scuffed white rubber: soles, toe caps and laces.
    s.alb = vec3(0.62, 0.6, 0.55) * (0.8 + 0.25 * noise(q * 120.0));
    s.rough = 0.65;
  }
  return s;
}
// Does a caster stand between p and a light along l, nearer than far?
float shadow(vec3 p, vec3 l, float far) {
#if PASS == 0
  // A thin wire takes no cast shadow: nobody sees one on it.
  return 1.0;
#else
  vec3 n;
  for (int i = 0; i < 4; i++) {
    if (uOcA[i].w <= 0.0) continue;
    float t = iCone(p, l, uOcA[i].xyz, uOcB[i].xyz, uOcA[i].w, uOcB[i].w, n);
    if (t > 0.02 && t < far) return 0.0;
  }
  return 1.0;
#endif
}
// One light on a surface: Cook-Torrance with GGX.
vec3 lightOn(Surf s, vec3 v, vec3 l, vec3 f0) {
  vec3 n = s.n, h = normalize(l + v);
  float nl = max(dot(n, l), 0.0), nv = max(dot(n, v), 1e-3), nh = max(dot(n, h), 0.0), vh = max(dot(v, h), 0.0);
  float a = s.rough * s.rough, a2 = a * a, dd = nh * nh * (a2 - 1.0) + 1.0;
  float D = a2 / (3.14159 * dd * dd), k = (s.rough + 1.0) * (s.rough + 1.0) / 8.0;
  float G = (nl / (nl * (1.0 - k) + k)) * (nv / (nv * (1.0 - k) + k));
  vec3 Fr = f0 + (1.0 - f0) * pow(1.0 - vh, 5.0);
  return (s.alb * (1.0 - s.metal) * (1.0 - Fr) + D * G * Fr / (4.0 * nl * nv + 1e-3) * 3.14159) * nl;
}
// The key light, the sky as fill and mirror, then the car's lights.
vec3 shade(Surf s, vec3 v, vec3 p) {
  vec3 n = s.n, f0 = mix(vec3(0.04), s.alb, s.metal), dif = s.alb * (1.0 - s.metal);
  float nv = max(dot(n, v), 1e-3);
  vec3 c = lightOn(s, v, uKey, f0) * uKeyC * shadow(p + n * 0.01, uKey, 1e4) * (0.5 + 0.5 * s.ao);
  // Fill: the sky from above, a dim bounce from the lane below.
  vec3 skyC = mix(uZen, uMid, 0.5) * 1.5, ground = skyC * 0.22 + uKeyC * 0.05;
  c += dif * mix(ground, skyC, 0.5 + 0.5 * n.y) * s.ao * uFill;
  vec3 r = reflect(-v, n);
  vec3 env = r.y > 0.0 ? skDusk(r, uSun, uZen, uMid, uBand, uAnti) : ground;
  c += env * (f0 + (1.0 - f0) * pow(1.0 - nv, 5.0)) * (1.0 - s.rough * 0.8) * s.ao * uFill;
  // The car's lamps are wide and near, so their shadows are soft.
  // Each jittered pass casts from another point across the car's front.
  vec3 carR = normalize(cross(uCarD, vec3(0.0, 1.0, 0.0)) + 1e-5);
  vec3 lamp = carR * uJit.x * 2.0 + vec3(0.0, uJit.y * 0.5, 0.0);
  if (uCar.w > 0.0) {
    // Headlights: a wide warm beam from low in the lane.
    vec3 lv = uCar.xyz + lamp - p;
    float d = length(lv);
    vec3 l = lv / d;
    float beam = smoothstep(0.05, 0.7, dot(-l, uCarD));
    if (beam > 0.0) c += lightOn(s, v, l, f0) * vec3(1.0, 0.85, 0.6) * uCar.w * beam / (d * d) * shadow(p + n * 0.01, l, d);
  }
  if (uTail.w > 0.0) {
    vec3 lv = uTail.xyz + lamp - p;
    float d = length(lv);
    // Tail lights: a red beam behind the car, the far side of its headlights.
    float back = smoothstep(-0.1, 0.6, dot(-lv / d, uTailD));
    if (back > 0.0) c += lightOn(s, v, lv / d, f0) * vec3(1.0, 0.04, 0.02) * uTail.w * back / (d * d) * shadow(p + n * 0.01, lv / d, d);
  }
  return c;
}
void main() {
  float ppu = 0.5 * uRes.y, kind = vK.z, mat = vM.x, seed = vM.w;
  vec3 A = vA.xyz, B = vB.xyz, ax = normalize(B - A);
#if PASS == 0
  {
    // A wire: a flat capsule on screen, shaded as a thin round.
    vec2 a = vS.xy, b = vS.zw, ba = b - a, p = vPx + uJit;
    float t = clamp(dot(p - a, ba) / max(dot(ba, ba), 1e-6), 0.0, 1.0);
    float r = mix(vK.x, vK.y, t), re = max(r, 0.6);
    vec2 q = p - (a + ba * t);
    float cov = clamp(0.5 - (length(q) - re), 0.0, 1.0) * min(r / 0.6, 1.0);
    if (cov < 0.003) discard;
    vec2 n2 = normalize(vec2(-ba.y, ba.x) + 1e-5);
    float across = clamp(dot(q, n2) / re, -1.0, 1.0);
    vec3 rd = normalize(uFw + (p.x * uRt + p.y * uUp) / (ppu * uF));
    vec3 side = normalize(n2.x * uRt + n2.y * uUp);
    vec3 P = mix(A, B, t);
    vec3 N = normalize(side * across - rd * sqrt(1.0 - across * across));
    Surf s = surface(mat, vec2(across * 0.01, t), N, side, ax, P, seed, false);
    // Metres along the wire and the angle round it.
    float along = t * length(B - A), ang = asin(across);
    if (mat > 5.5 && mat < 6.5 || mat > 1.5 && mat < 2.5) {
      // Bare conductor: seven strands laid in a helix tilt the normal.
      float lay = sin(ang * 6.0 + along / max(vA.w, 0.002) * 1.4);
      s.n = normalize(N + ax * 0.45 * lay);
      s.rough = 0.32 + 0.12 * noise(vec2(along * 3.0, seed * 9.0));
    } else if (mat > 4.5 && mat < 5.5) {
      // Rubber jacket: grey dust on top, worn glossier in streaks.
      float dust = smoothstep(0.2, 0.9, N.y) * (0.5 + 0.5 * noise(vec2(along * 1.5, seed * 7.0)));
      s.alb = mix(vec3(0.03, 0.03, 0.033), vec3(0.11, 0.105, 0.1), dust * 0.6);
      s.rough = mix(0.38, 0.75, dust) + 0.1 * (noise(vec2(along * 6.0, 3.0 + seed)) - 0.5);
    }
    float z = dot(P - uEye, uFw);
    vec3 c = mix(shade(s, -rd, P), uHaze, 1.0 - exp(-z / 260.0));
    o = vec4(c * cov, cov);
    gl_FragDepth = clamp(z / 400.0, 0.0, 0.9999);
  }
#else
  // A frame on the part: ax along it, bx and cx across.
#if PASS == 2
  vec3 ref = vU;
#else
  vec3 ref = abs(ax.y) > 0.9 ? vec3(0.0, 0.0, -1.0) : vec3(0.0, 1.0, 0.0);
#endif
  vec3 cx = normalize(ref - ax * dot(ref, ax)), bx = cross(cx, ax);
  vec3 mid = 0.5 * (A + B);
  float hl = 0.5 * length(B - A);
#if PASS == 2
  {
    // The sneaker: march its shape in its own frame.
    vec2 px = vPx + uJit;
    vec3 rd = normalize(uFw + (px.x * uRt + px.y * uUp) / (ppu * uF));
    vec3 ro = vec3(dot(uEye - A, ax), dot(uEye - A, cx), dot(uEye - A, bx)), rl = vec3(dot(rd, ax), dot(rd, cx), dot(rd, bx));
    float t = max(dot(mid - uEye, rd) - 0.3, 0.0), far = t + 0.7, m = 0.0, d = 1.0;
    for (int i = 0; i < 56; i++) {
      d = shoeD(ro + rl * t, m);
      if (d < 0.0005 || t > far) break;
      t += d * 0.9;
    }
    if (d > 0.002) discard;
    vec3 q = ro + rl * t;
    vec2 e = vec2(0.0008, 0.0);
    float mm;
    vec3 nl = normalize(vec3(shoeD(q + e.xyy, mm) - shoeD(q - e.xyy, mm), shoeD(q + e.yxy, mm) - shoeD(q - e.yxy, mm), shoeD(q + e.yyx, mm) - shoeD(q - e.yyx, mm)));
    q.y -= 0.014 * smoothstep(0.18, 0.29, q.x);
    Surf s = Surf(vec3(0.6, 0.58, 0.53), 0.6, 0.0, nl.x * ax + nl.y * cx + nl.z * bx, 1.0);
    if (m < 0.5) {
      // The sole: dark tread below, a white wall with one dark pinstripe.
      if (nl.y < -0.5) s.alb = vec3(0.09, 0.085, 0.08) * (0.7 + 0.6 * step(0.5, fract(q.x * 70.0 + q.z * 40.0)));
      else if (abs(q.y - 0.017) < 0.0016) s.alb = vec3(0.05);
    } else {
      bool cap = q.x > 0.232, wall = q.y < 0.033;
      bool hole = q.y > 0.1 && length(q.xz - vec2(0.072, 0.0)) < 0.031;
      // White laces cross the tongue; steel eyelets flank them.
      float lx = fract((q.x - 0.095) * 62.0);
      bool lace = nl.y > 0.25 && q.x > 0.095 && q.x < 0.2 && abs(q.z) < 0.02 && lx < 0.5;
      bool eyelet = nl.y > 0.1 && q.x > 0.095 && q.x < 0.2 && abs(abs(q.z) - 0.023) < 0.0035 && abs(lx - 0.25) < 0.2;
      if (hole) { s.alb = vec3(0.03, 0.025, 0.025); s.rough = 0.95; }
      else if (cap || wall || lace) { s.alb = vec3(0.6, 0.58, 0.53) * (0.85 + 0.2 * noise(q.xz * 300.0)); s.rough = lace ? 0.9 : 0.5; }
      else if (eyelet) { s.alb = vec3(0.6, 0.61, 0.62); s.metal = 1.0; s.rough = 0.35; }
      else {
        // Faded red canvas: a coarse weave and a seam round the collar.
        float weave = 0.75 + 0.25 * noise(q.xy * 900.0) + 0.12 * sin(q.x * 2200.0) * sin(q.y * 2200.0);
        s.alb = vec3(0.4, 0.04, 0.035) * weave * (abs(q.y - 0.138) < 0.002 ? 0.5 : 1.0);
        s.rough = 0.93;
      }
    }
    vec3 P = uEye + rd * t;
    float z = dot(P - uEye, uFw);
    o = vec4(mix(shade(s, -rd, P), uHaze, 1.0 - exp(-z / 260.0)), 1.0);
    gl_FragDepth = clamp(z / 400.0, 0.0, 0.9999);
  }
#else
  {
    vec2 px = vPx + uJit;
    vec3 rd = normalize(uFw + (px.x * uRt + px.y * uUp) / (ppu * uF));
    vec3 n, tx, ty;
    vec2 q;
    float t;
    bool cap = false;
    if (kind < 1.5) {
      t = iCone(uEye, rd, A, B, vA.w, vB.w, n);
      if (t < 0.0) discard;
      vec3 d = uEye + rd * t - A;
      float y = dot(d, ax);
      vec3 rad = d - ax * y;
      q = vec2(atan(dot(rad, cx), dot(rad, bx)) * mix(vA.w, vB.w, clamp(y / (2.0 * hl), 0.0, 1.0)), y);
      cap = abs(dot(n, ax)) > 0.9;
      if (cap) q = vec2(dot(rad, bx), dot(rad, cx));
      if (mat < 0.5 && !cap) {
        // Displacement: a check sinks the surface, so the outline breaks too.
        float kk;
        float sink = 1.0 - 0.1 * (1.0 - smoothstep(0.3, 0.9, woodH(q, seed, kk)));
        vec3 n2;
        float t2 = iCone(uEye, rd, A, B, vA.w * sink, vB.w * sink, n2);
        if (t2 < 0.0) discard;
        t = t2;
        n = n2;
      }
      tx = normalize(cross(ax, n) + 1e-5);
      ty = ax;
    } else {
      vec3 ro = vec3(dot(uEye - mid, ax), dot(uEye - mid, bx), dot(uEye - mid, cx));
      vec3 rl = vec3(dot(rd, ax), dot(rd, bx), dot(rd, cx)), nl;
      t = iBox(ro, rl, vec3(hl, vA.w, vM.z), nl);
      if (t < 0.0) discard;
      vec3 pl = ro + rl * t;
      n = nl.x * ax + nl.y * bx + nl.z * cx;
      cap = abs(nl.x) > 0.5;
      // The grain runs along the timber on all four long faces.
      q = cap ? pl.yz : vec2(abs(nl.y) > 0.5 ? pl.z : pl.y + 0.3, pl.x);
      tx = abs(nl.y) > 0.5 ? cx : bx;
      ty = ax;
    }
    vec3 P = uEye + rd * t;
    Surf s = surface(mat, q, n, tx, ty, P, seed, cap);
    vec3 c = shade(s, -rd, P);
    float z = dot(P - uEye, uFw);
    // A far pole reads as a dark, flat cut-out against the sky.
    float far = smoothstep(14.0, 28.0, z);
    c = mix(c, vec3(dot(c, vec3(0.3, 0.5, 0.2))) * 0.35 + uHaze * 0.06, 0.75 * far);
    o = vec4(mix(c, uHaze, 1.0 - exp(-z / 260.0)), 1.0);
    gl_FragDepth = clamp(z / 400.0, 0.0, 0.9999);
  }
#endif
#endif
}`;
// Adds one jittered bake to the sum, at a quarter weight.
const ADD_FS = `${HEAD}
uniform sampler2D uTex;
out vec4 o;
// uGain: one over the number of jittered passes.
uniform float uGain;
void main() { o = texelFetch(uTex, ivec2(gl_FragCoord.xy), 0) * uGain; }`;

// Each bird adds its velocity, a count and its alarm to one cell.
const SPLAT_VS = `${HEAD}
uniform sampler2D uPos, uVel;
uniform vec3 uGMin, uGf;
uniform float uCell;
uniform vec2 uAtlas;
out vec4 vV;
out float vE;
void main() {
  ivec2 ij = ivec2(gl_VertexID % ${TW}, gl_VertexID / ${TW});
  vec4 P = texelFetch(uPos, ij, 0), V = texelFetch(uVel, ij, 0);
  vec3 g = floor((P.xyz - uGMin) / uCell);
  gl_PointSize = 1.0;
  vV = vec4(V.xyz, 1.0);
  vE = exp(-V.w / ${TAU_E});
  if (any(lessThan(g, vec3(0.0))) || any(greaterThanEqual(g, uGf))) {
    gl_Position = vec4(2.0, 2.0, 0.0, 1.0);
    return;
  }
  vec2 px = vec2(mod(g.z, ${TX}.0), floor(g.z / ${TX}.0)) * uGf.xy + g.xy + 0.5;
  gl_Position = vec4(px / uAtlas * 2.0 - 1.0, 0.0, 1.0);
}`;
const SPLAT_FS = `${HEAD}
in vec4 vV;
in float vE;
layout(location = 0) out vec4 o0;
layout(location = 1) out vec4 o1;
void main() {
  o0 = vV;
  o1 = vec4(vE, 0.0, 0.0, 0.0);
}`;
// A five-tap blur along one grid axis, within the atlas tiles.
const BLUR_FS = `${HEAD}
uniform sampler2D uA, uB;
uniform ivec3 uStep, uG;
layout(location = 0) out vec4 oA;
layout(location = 1) out vec4 oB;
void main() {
  ivec2 p = ivec2(gl_FragCoord.xy), tile = p / uG.xy;
  ivec3 c = ivec3(p - tile * uG.xy, tile.x + tile.y * ${TX});
  oA = vec4(0.0);
  oB = vec4(0.0);
  if (c.z >= uG.z) return;
  for (int k = -2; k <= 2; k++) {
    ivec3 q = c + uStep * k;
    if (any(lessThan(q, ivec3(0))) || any(greaterThanEqual(q, uG))) continue;
    float w = k == 0 ? 0.375 : (k == 1 || k == -1) ? 0.25 : 0.0625;
    ivec2 t = ivec2(q.z % ${TX}, q.z / ${TX}) * uG.xy + q.xy;
    oA += texelFetch(uA, t, 0) * w;
    oB += texelFetch(uB, t, 0) * w;
  }
}`;
// One step of flight for every crow.
// The highway: a steady stream across the sky toward the roost.
// uHw: the stream's direction, its centre line, its width.
const UPDATE_FS = `${HEAD}
uniform sampler2D uPos, uVel, uF0, uF1;
${FIELD}
uniform float uDt, uTime, uLen;
uniform vec4 uHw, uClap;
uniform vec2 uOrigin;
uniform uint uFrame;
layout(location = 0) out vec4 oPos;
layout(location = 1) out vec4 oVel;
${HASH}
const float CZ = ${CZ}.0, RHO = 10.0, V0 = 0.27;
float dn(vec3 p) { return fs(uF0, p).w; }
vec3 mode(vec3 p, vec3 k, vec3 a, float w) { return cross(k, a) * sin(dot(k, p) + w); }
vec3 flow(vec3 p, float t) {
  return (mode(p, vec3(1.9, 0.7, 0.9), vec3(0.2, 1.0, -0.4), t * 0.17)
    + mode(p, vec3(-1.1, 2.1, 0.6), vec3(0.9, 0.3, 0.6), t * 0.13 + 1.7)
    + mode(p, vec3(0.6, -1.3, 2.4), vec3(1.0, -0.5, 0.2), t * 0.23 + 3.1)) * 0.35;
}
vec3 grad(vec3 p, float h) {
  vec3 x = vec3(h, 0.0, 0.0), y = vec3(0.0, h, 0.0), z = vec3(0.0, 0.0, h);
  return vec3(dn(p + x) - dn(p - x), dn(p + y) - dn(p - y), dn(p + z) - dn(p - z)) / (2.0 * h);
}
void main() {
  ivec2 ij = ivec2(gl_FragCoord.xy);
  uint id = uint(ij.y * ${TW} + ij.x);
  vec4 P = texelFetch(uPos, ij, 0), V = texelFetch(uVel, ij, 0);
  vec3 p = P.xyz, v = V.xyz;
  float age = V.w, dt = uDt;
  float r1 = h01(id), r2 = h01(id ^ 0x5bd1e995u), r3 = h01(id * 3u + 0x27d4eb2du);
  vec2 hd = uHw.xy, hp = vec2(-hd.y, hd.x);
  vec4 F = fs(uF0, p);
  float n = F.w;
  vec3 vbar = F.xyz / max(n, 1e-3);
  float al = fs(uF1, p).x / max(n, 1.0);
  vec3 gN = grad(p, uCell), gW = grad(p, uCell * 3.0);
  float sp = length(v);
  vec3 f = sp > 1e-4 ? v / sp : vec3(hd, 0.0);
  float e = exp(-age / ${TAU_E});
  float calm = 1.0 - 0.75 * e;
  vec3 a = vec3(0.0);
  // Crows keep station loosely: they align, space out and drift into groups.
  a += 1.6 * (vbar - v) * n / (n + 2.0);
  a += 0.05 * gW / (n + 4.0) * calm;
  a -= 0.3 * gN / RHO * (0.25 + smoothstep(0.5 * RHO, 1.6 * RHO, n));
  vec3 u = flow(p, uTime);
  a += 0.4 * (V0 * u / max(length(u), 0.35) - v) * calm;
  // Each crow holds its own lane in the stream and its own speed.
  float k = CZ / (CZ - p.z);
  vec2 s = p.xy * k;
  float lane = uHw.z + (r2 - 0.5) * uHw.w + 0.05 * sin(uTime * 0.3 + r1 * 30.0);
  float across = dot(s, hp);
  a.xy += hp * (lane - across) * 0.9 * calm;
  a += 1.4 * (vec3(hd * V0 * (0.85 + 0.3 * r3), 0.0) - v) * calm;
  a.z -= 4.0 * (max(p.z - 0.3, 0.0) - max(-0.45 - p.z, 0.0));
  float v0 = V0 * (0.9 + 0.2 * r2) * (1.0 + 0.8 * e);
  a += 1.2 * (v0 - sp) * f;
  // A startle spreads from neighbour to neighbour.
  bool ready = age > 1.3;
  bool trig = ready && al > 0.2 && h01(id ^ ih(uFrame)) < 1.0 - exp(-6.0 * dt);
  if (uClap.w > 0.0) {
    vec2 dc = s - uClap.xy;
    float rc = length(dc), q = 1.0 - rc / uClap.z;
    if (q > 0.0) {
      v.xy += uClap.w * (0.5 + 0.9 * q) * dc / max(rc, 1e-3);
      v.z += (r3 - 0.5) * uClap.w * q;
      trig = true;
    }
    trig = trig || (ready && rc < uClap.z * 1.8);
  }
  if (trig) age = 0.0;
  e = exp(-age / ${TAU_E});
  vec2 aw = s - uOrigin;
  a.xy += 2.6 * e * aw / max(length(aw), 0.05);
  float am = length(a);
  if (am > 6.0) a *= 6.0 / am;
  v += a * dt;
  float vm = length(v);
  if (vm > 1.4) v *= 1.4 / vm;
  p += v * dt;
  // Past the far edge, a crow joins the stream again upwind.
  float along = dot(p.xy * CZ / (CZ - p.z), hd);
  if (along > uLen) {
    vec2 ns = hd * (-uLen - 0.1 * r3) + hp * (lane + (r1 - 0.5) * 0.06);
    p.xy = ns / (CZ / (CZ - p.z));
    v = vec3(hd * V0, 0.0);
    age = 30.0;
  }
  // Crows row with slow, even beats.
  float ph = fract(P.w + dt * 3.4 * (0.85 + 0.3 * r3) * (1.0 + 0.8 * e));
  age = min(age + dt, 60.0);
  oPos = vec4(p, ph);
  oVel = vec4(v, age);
}`;
// A flying crow seen from below: head, broad fingered wings, a fan tail.
const BIRD_VS = `${HEAD}
uniform sampler2D uPos, uVel;
uniform vec2 uRes;
uniform float uTime, uSpan;
${ROT}
flat out vec4 vP0, vP1, vP2, vP3;
flat out vec4 vK;
out vec2 vPx;
${HASH}
const float CZ = ${CZ}.0;
void main() {
  int i = gl_InstanceID;
  ivec2 ij = ivec2(i % ${TW}, i / ${TW});
  vec4 P = texelFetch(uPos, ij, 0), V = texelFetch(uVel, ij, 0);
  vec3 p = P.xyz, v = V.xyz;
  float k = CZ / (CZ - p.z), ppu = 0.5 * uRes.y, pp = k * ppu;
  vec2 c = p.xy * pp;
  float r = h01(uint(i)), e = exp(-V.w / ${TAU_E});
  float span = uSpan * (0.85 + 0.3 * r) * (1.0 + 0.2 * e);
  float haze = clamp(0.25 - p.z * 0.6, 0.0, 0.6);
  // Crows row steadily and glide now and then.
  float flap = max(smoothstep(-0.8, -0.3, sin(uTime * (0.3 + 0.25 * r) + r * 40.0)), e);
  float fl = length(v);
  vec3 f = fl > 1e-4 ? v / fl : vec3(1.0, 0.0, 0.0);
  vec3 sd = cross(f, vec3(0.0, 1.0, 0.0));
  float sl = length(sd);
  sd = sl > 1e-3 ? sd / sl : vec3(0.0, 0.0, 1.0);
  vec3 up = cross(sd, f);
  float roll = 0.25 * sin(uTime * 0.5 + r * 20.0) + e * 0.9;
  float cr = cos(roll), sr = sin(roll);
  vec3 u2 = up * cr + sd * sr, s2 = sd * cr - up * sr;
  float th = mix(0.04, 0.08 + 0.5 * sin(P.w * 6.2831853), flap), hs = span * 0.5;
  vec3 back = -f * span * 0.04, lift = u2 * sin(th) * hs, reach = s2 * cos(th) * hs;
  // A crow overhead shows its whole underside: the view is from below.
  #define PR(o) (c + vec2((o).x, (o).y * 0.6 + (o).z * 0.8) * pp)
  float chord = span * 0.2;
  vec2 pn = PR(f * span * 0.2), pt = PR(-f * span * 0.33);
  vec2 pf = PR(f * chord * 0.55), pb = PR(-f * chord * 0.55);
  vec2 pl = PR(lift - reach + back + f * chord * 0.2), pr = PR(lift + reach + back + f * chord * 0.2);
  vec2 ql = PR(lift * 0.92 - reach * 0.92 + back - f * chord * 0.5), qr = PR(lift * 0.92 + reach * 0.92 + back - f * chord * 0.5);
  float rb = max(0.06 * span * pp, 0.45);
  vec2 mn = min(min(min(pn, pt), min(pl, pr)), min(ql, qr)) - rb * 2.0 - 1.5, mx = max(max(max(pn, pt), max(pl, pr)), max(ql, qr)) + rb * 2.0 + 1.5;
  vec2 px = mix(mn, mx, vec2(gl_VertexID & 1, gl_VertexID >> 1));
  vP0 = vec4(pn, pt);
  vP1 = vec4(pf, pb);
  vP2 = vec4(pl, pr);
  vP3 = vec4(ql, qr);
  vK = vec4(rb, 1.4, haze, 0.0);
  vPx = px;
  gl_Position = vec4(rot(px, uRoll) / (0.5 * uRes), 0.0, 1.0);
}`;
const BIRD_FS = `${HEAD}
in vec2 vPx;
flat in vec4 vP0, vP1, vP2, vP3;
flat in vec4 vK;
out vec4 o;
float seg(vec2 p, vec2 a, vec2 b) {
  vec2 pa = p - a, ba = b - a;
  return length(pa - ba * clamp(dot(pa, ba) / max(dot(ba, ba), 1e-6), 0.0, 1.0));
}
float cr2(vec2 a, vec2 b) { return a.x * b.y - a.y * b.x; }
float tri(vec2 p, vec2 a, vec2 b, vec2 c) {
  float d = min(seg(p, a, b), min(seg(p, b, c), seg(p, c, a)));
  float c0 = cr2(b - a, p - a), c1 = cr2(c - b, p - b), c2 = cr2(a - c, p - c);
  bool inside = (c0 >= 0.0 && c1 >= 0.0 && c2 >= 0.0) || (c0 <= 0.0 && c1 <= 0.0 && c2 <= 0.0);
  return inside && abs(cr2(b - a, c - a)) > 1e-3 ? -d : d;
}
void main() {
  vec2 p = vPx;
  float d = seg(p, vP0.xy, mix(vP0.xy, vP0.zw, 0.7)) - vK.x * 1.3;
  d = min(d, length(p - vP0.xy) - vK.x * 1.15);
  // The fan tail spreads from the rump.
  d = min(d, length(p - vP0.zw) - vK.x * 1.7);
  // Each wing is a broad quad; its tip splits into fingers.
  for (int s = 0; s < 2; s++) {
    vec2 tf = s == 0 ? vP2.xy : vP2.zw, tb = s == 0 ? vP3.xy : vP3.zw;
    float w = min(tri(p, vP1.xy, vP1.zw, tf), tri(p, vP1.zw, tb, tf));
    vec2 ax = tf - mix(vP1.xy, vP1.zw, 0.5);
    float al = dot(p - mix(vP1.xy, vP1.zw, 0.5), ax) / max(dot(ax, ax), 1e-4);
    vec2 cw = tb - tf;
    float acr = dot(p - tf, cw) / max(dot(cw, cw), 1e-4);
    float fing = smoothstep(0.78, 1.0, al) * (0.5 + 0.5 * cos(acr * 25.0)) * vK.x * 1.2;
    d = min(d, w + fing);
  }
  float cov = clamp(0.5 - d, 0.0, 1.0) * vK.y;
  if (cov < 0.004) discard;
  o = vec4(cov, cov * vK.z, 0.0, 0.0);
}`;
// The sky, the crows in front of it, the lane in front of them.
// Then the shared grade and the fitted ACES output.
const COMP_FS = `${HEAD}
uniform sampler2D uSky, uScene, uBirds, uWires, uCloud;
uniform float uExpo, uT;
uniform vec3 uInk;
// Post: x tone map (1 AgX), y film look, z contrast, w grain.
uniform vec4 uPost;
uniform float uVig;
${GRADE}
${OUTPUT}
out vec4 o;
// AgX, as three.js fits it: Rec.2020 in, a log encode, a sigmoid, then out.
vec3 agxCurve(vec3 x) {
  vec3 x2 = x * x, x4 = x2 * x2;
  return 15.5 * x4 * x2 - 40.14 * x4 * x + 31.96 * x4 - 6.868 * x2 * x + 0.4298 * x2 + 0.1191 * x - 0.00232;
}
vec3 agx(vec3 c) {
  const mat3 toRec = mat3(0.6274, 0.0691, 0.0164, 0.3293, 0.9195, 0.0880, 0.0433, 0.0113, 0.8956);
  const mat3 toSrgb = mat3(1.6605, -0.1246, -0.0182, -0.5876, 1.1329, -0.1006, -0.0728, -0.0083, 1.1187);
  const mat3 inset = mat3(0.856627153315983, 0.0951212405381588, 0.0482516061458583, 0.137318972929847, 0.761241990602591, 0.101439036467562, 0.11189821299995, 0.0767994186031903, 0.811302368396859);
  const mat3 outset = mat3(1.1271005818144368, -0.11060664309660323, -0.016493938717834573, -0.1413297634984383, 1.157823702216272, -0.016493938717834257, -0.14132976349843826, -0.11060664309660294, 1.2519364065950405);
  c = inset * (toRec * c);
  c = clamp((log2(max(c, 1e-10)) + 12.47393) / 16.500999, 0.0, 1.0);
  c = outset * agxCurve(c);
  c = pow(max(c, 0.0), vec3(2.2));
  return clamp(toSrgb * c, 0.0, 1.0);
}
// Portra 400 on display colour: filmic contrast, warm lifted blacks,
// cream highlights, pastel cyan-leaning blues, a little less saturation.
vec3 portra(vec3 c, float k, float con) {
  const vec3 lw = vec3(0.2126, 0.7152, 0.0722);
  float l = dot(c, lw);
  vec3 f = mix(c, c * c * (3.0 - 2.0 * c), con);
  f = f * 0.965 + vec3(0.035, 0.027, 0.02);
  f *= mix(vec3(1.0), vec3(1.03, 1.0, 0.93), smoothstep(0.45, 1.0, l));
  float blue = clamp((c.b - max(c.r, c.g)) * 3.0, 0.0, 1.0);
  f *= mix(vec3(1.0), vec3(0.93, 1.02, 0.98), blue * 0.7);
  f = mix(vec3(dot(f, lw)), f, 0.9);
  return mix(c, f, k);
}
void main() {
  ivec2 fc = ivec2(gl_FragCoord.xy);
  vec2 res = vec2(textureSize(uScene, 0)), uv = gl_FragCoord.xy / res;
  vec3 col = texture(uSky, uv).rgb;
  vec4 Cl = texture(uCloud, uv);
  col = col * (1.0 - Cl.a) + Cl.rgb;
  vec4 B = texelFetch(uBirds, fc, 0), S = texelFetch(uScene, fc, 0);
  if (B.r > 1e-3) {
    // Far crows take on the sky's haze.
    vec3 ink = mix(uInk, col * 0.7, clamp(B.g / B.r, 0.0, 1.0));
    col = mix(ink, col, exp(-3.4 * B.r));
  }
  col = col * (1.0 - S.a) + S.rgb;
  vec4 Wr = texelFetch(uWires, fc, 0);
  col = col * (1.0 - Wr.a) + Wr.rgb;
  col = gdGrade(col, uv, res.x / res.y, gl_FragCoord.xy + floor(fract(uT) * 97.0), vec3(0.0), uVig, 0.45, uPost.w);
  if (uPost.x < 0.5) { o = vec4(ouFilmAces(col, uExpo, gl_FragCoord.xy), 1.0); return; }
  vec3 d = ouSrgb(agx(col * uExpo));
  o = vec4(ouDither(portra(d, uPost.y, uPost.z), gl_FragCoord.xy), 1.0);
}`;

/* ---------- GL ---------- */
const canvas = document.createElement('canvas');
stage.prepend(canvas);
const gl = canvas.getContext('webgl2', { antialias: false, alpha: false, depth: false, stencil: false, premultipliedAlpha: false, powerPreference: 'high-performance' });
if (!gl || !gl.getExtension('EXT_color_buffer_float')) {
  stage.querySelector('.fail').hidden = false;
  ui.hideControls();
  mark('first-frame');
  throw new Error('East Van Alley needs WebGL 2 with float targets.');
}
let P = null, vao = null, strokeVao = null, wireVao = null, strokeN = 0, ready = false, wireT = null;
let S = [], cur = 0, FA = null, FB = null, birdT = null, sceneT = null, skyT = null, passT = null, cloudT = null, wpT = null;
let rows = 8, GX = 0, GY = 0, AW = 0, AH = 0, fieldA = 0, W = 0, H = 0, A = 16 / 9;
const GMIN = [0, 0, 0];

function tex(w, h, fmt, filter) {
  const t = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, t);
  gl.texStorage2D(gl.TEXTURE_2D, 1, fmt, w, h);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return t;
}
// A framebuffer that draws into several textures at once.
function fbo(texs) {
  const fb = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
  texs.forEach((t, i) => gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0 + i, gl.TEXTURE_2D, t, 0));
  gl.drawBuffers(texs.map((t, i) => gl.COLOR_ATTACHMENT0 + i));
  if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) throw new Error('Float targets unavailable');
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);
  return fb;
}
function bindTex(unit, t) {
  gl.activeTexture(gl.TEXTURE0 + unit);
  gl.bindTexture(gl.TEXTURE_2D, t);
}
const freeT = t => { if (!t) return; gl.deleteFramebuffer(t.fb); gl.deleteTexture(t.tex); if (t.depth) gl.deleteRenderbuffer(t.depth); };

async function buildGL() {
  P = await linked(gl, {
    sky: program(gl, TRI, SKY_FS), cloud: program(gl, TRI, CLOUD_FS), wire: program(gl, PART_VS, partFS(0)), solid: program(gl, PART_VS, partFS(1)), shoe: program(gl, PART_VS, partFS(2)), add: program(gl, TRI, ADD_FS),
    splat: program(gl, SPLAT_VS, SPLAT_FS), blur: program(gl, TRI, BLUR_FS), upd: program(gl, TRI, UPDATE_FS),
    bird: program(gl, BIRD_VS, BIRD_FS), comp: program(gl, TRI, COMP_FS),
  });
  // Samplers keep fixed units: state 0-1, field 3-4, birds 5, scene 6, sky 7.
  for (const q of [P.splat, P.upd, P.bird]) { gl.useProgram(q.p); gl.uniform1i(q.u.uPos, 0); gl.uniform1i(q.u.uVel, 1); }
  gl.useProgram(P.upd.p);
  gl.uniform1i(P.upd.u.uF0, 3);
  gl.uniform1i(P.upd.u.uF1, 4);
  gl.useProgram(P.blur.p);
  gl.uniform1i(P.blur.u.uA, 3);
  gl.uniform1i(P.blur.u.uB, 4);
  gl.useProgram(P.comp.p);
  gl.uniform1i(P.comp.u.uBirds, 5);
  gl.uniform1i(P.comp.u.uScene, 6);
  gl.uniform1i(P.comp.u.uSky, 7);
  gl.uniform1i(P.comp.u.uWires, 8);
  gl.uniform1i(P.comp.u.uCloud, 9);
  gl.uniform3fv(P.comp.u.uInk, linFit(0.13, 0.01, 270));
  vao = gl.createVertexArray();
  S = [0, 1].map(() => {
    const pos = tex(TW, rows, gl.RGBA32F, gl.NEAREST), vel = tex(TW, rows, gl.RGBA32F, gl.NEAREST);
    return { pos, vel, fb: fbo([pos, vel]) };
  });
  // The parts ride one instance buffer of four vec4s each.
  const data = buildLane();
  strokeN = data.length / 16;
  strokeVao = gl.createVertexArray();
  gl.bindVertexArray(strokeVao);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
  const lay = from => {
    for (let i = 0; i < 4; i++) {
      gl.enableVertexAttribArray(i);
      gl.vertexAttribPointer(i, 4, gl.FLOAT, false, 64, from * 64 + i * 16);
      gl.vertexAttribDivisor(i, 1);
    }
  };
  lay(0);
  // A second layout starts at the swaying wires.
  wireVao = gl.createVertexArray();
  gl.bindVertexArray(wireVao);
  lay(wireStart);
  gl.bindVertexArray(null);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  FA = FB = birdT = sceneT = skyT = passT = wireT = cloudT = wpT = null;
  fieldA = 0;
}
// The field grid spans the frame, so its width follows the aspect.
function allocField() {
  if (FA && Math.abs(A - fieldA) < 0.01) return;
  fieldA = A;
  for (const f of [FA, FB]) if (f) { gl.deleteFramebuffer(f.fb); gl.deleteTexture(f.t0); gl.deleteTexture(f.t1); }
  GX = Math.ceil((2 * Math.hypot(A, 1) + 0.8) / CELL);
  GY = Math.ceil((2 * Math.hypot(A, 1) + 0.4) / CELL);
  AW = GX * TX;
  AH = GY * TX;
  GMIN[0] = (-GX * CELL) / 2;
  GMIN[1] = (-GY * CELL) / 2;
  GMIN[2] = (-GZ * CELL) / 2;
  const mk = () => {
    const t0 = tex(AW, AH, gl.RGBA16F, gl.LINEAR), t1 = tex(AW, AH, gl.RGBA16F, gl.LINEAR);
    return { t0, t1, fb: fbo([t0, t1]) };
  };
  FA = mk();
  FB = mk();
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}
function allocTargets() {
  const cw = canvas.width, ch = canvas.height;
  if (birdT && birdT.w === cw && birdT.h === ch) return;
  [birdT, sceneT, skyT, passT, cloudT, wireT].forEach(freeT);
  if (wpT) { gl.deleteFramebuffer(wpT.fb); gl.deleteTexture(wpT.tex); }
  const mk = (w, h, filter) => { const t = tex(w, h, gl.RGBA16F, filter); return { tex: t, fb: fbo([t]), w, h }; };
  birdT = mk(cw, ch, gl.NEAREST);
  sceneT = mk(cw, ch, gl.NEAREST);
  // The lane's parts cross each other, so each bake pass needs depth.
  passT = mk(cw, ch, gl.NEAREST);
  passT.depth = gl.createRenderbuffer();
  gl.bindRenderbuffer(gl.RENDERBUFFER, passT.depth);
  gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, cw, ch);
  gl.bindFramebuffer(gl.FRAMEBUFFER, passT.fb);
  gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, passT.depth);
  // The moving layer shares that depth, so the pole hides wires behind it.
  // It draws in four jittered passes too, summed into wireT.
  wireT = mk(cw, ch, gl.NEAREST);
  wpT = mk(cw, ch, gl.NEAREST);
  gl.bindFramebuffer(gl.FRAMEBUFFER, wpT.fb);
  gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, passT.depth);
  cloudT = mk(Math.ceil(cw / 3), Math.ceil(ch / 3), gl.LINEAR);
  skyT = mk(Math.ceil(cw / 2), Math.ceil(ch / 2), gl.LINEAR);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}
function gridUniforms(q) {
  gl.uniform3f(q.u.uGMin, GMIN[0], GMIN[1], GMIN[2]);
  gl.uniform3f(q.u.uGf, GX, GY, GZ);
  gl.uniform1f(q.u.uCell, CELL);
  gl.uniform2f(q.u.uAtlas, AW, AH);
}

/* ---------- light ---------- */
// The CPU twin of atm() in the sky shader, for the fill, haze and mirror colours.
const SKY_I = 30;
function atmJS(d, s) {
  const R_E = 6371e3, R_A = 6471e3, H_R = 8e3, H_M = 1.2e3, G_M = 0.76, B_M = 21e-6;
  const B_R = [5.5e-6, 13.0e-6, 22.4e-6], B_O = [0.65e-6, 1.881e-6, 0.085e-6];
  const rsi = (o, dd, r) => { const b = dot(o, dd), c = dot(o, o) - r * r, h = b * b - c; if (h < 0) return [1e5, -1e5]; const q = Math.sqrt(h); return [-b - q, -b + q]; };
  const o = [0, R_E + 2, 0], g = rsi(o, d, R_E);
  let tEnd = rsi(o, d, R_A)[1];
  if (g[0] > 0) tEnd = Math.min(tEnd, g[0]);
  const ds = tEnd / 16, mu = dot(d, s), gg = G_M * G_M;
  const pr = 3 / (16 * Math.PI) * (1 + mu * mu), pm = 3 / (8 * Math.PI) * ((1 - gg) * (mu * mu + 1)) / ((1 + gg - 2 * mu * G_M) ** 1.5 * (2 + gg));
  const tr = [0, 0, 0], tm = [0, 0, 0];
  let odR = 0, odM = 0;
  for (let i = 0; i < 16; i++) {
    const p = add(o, d.map(v => v * ds * (i + 0.5))), h = Math.hypot(...p) - R_E, dr = Math.exp(-h / H_R) * ds, dm = Math.exp(-h / H_M) * ds;
    odR += dr;
    odM += dm;
    const dl = rsi(p, s, R_A)[1] / 8;
    let lR = 0, lM = 0, lit = true;
    for (let j = 0; j < 8; j++) {
      const hl = Math.hypot(...add(p, s.map(v => v * dl * (j + 0.5)))) - R_E;
      if (hl < 0) { lit = false; break; }
      lR += Math.exp(-hl / H_R) * dl;
      lM += Math.exp(-hl / H_M) * dl;
    }
    if (!lit) continue;
    for (let k = 0; k < 3; k++) {
      const a = Math.exp(-((B_R[k] + B_O[k]) * (odR + lR) + B_M * 1.1 * (odM + lM)));
      tr[k] += dr * a;
      tm[k] += dm * a;
    }
  }
  return [0, 1, 2].map(k => (pr * B_R[k] * tr[k] + pm * B_M * tm[k]) * SKY_I);
}
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
// Moonlight is the same scattering, much weaker.
const MOON_I = SKY_I * 0.015;
// The city's sodium and LED glow on the low sky after dark, linear colour.
const CITY = [0.022, 0.016, 0.011];
// The palette's colours, much less saturated, as a twilight glow only.
// Single scattering goes dark too soon after sunset; this stands in for the rest.
// It swells as the sun sets and fades again toward full night.
function twilight(s, sun) {
  const w = sstep(0.04, -0.06, sun[1]) * sstep(-0.32, -0.14, sun[1]);
  const soft = c => { const l = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; return c.map(v => (l + (v - l) * 0.4) * w); };
  return { zen: soft(s.zen), mid: soft(s.mid), band: soft(s.band), anti: soft(s.anti) };
}
// How much night there is: 0 by day, 1 once the sun is well down.
const nightOf = sun => sstep(-0.02, -0.25, sun[1]);
// The key light is the sun by day and the moon by night.
let light = null;
function lightAt(h) {
  const d = dayAt(h), s = d.sky;
  // The shared sun crosses the south, behind the eye: it lights the pole's face.
  // A sun at or under the horizon still lights from just above it.
  const lift = v => unit([v[0], Math.max(v[1], 0.06), v[2]]);
  const a = look.sunAz * D2R, ca = Math.cos(a), sa = Math.sin(a), spin = v => [v[0] * ca + v[2] * sa, v[1], v[2] * ca - v[0] * sa];
  // The shared moon crosses the south, behind the eye; here it crosses the north, in view.
  // The sun bearing turns the sun only, so the moon stays in view.
  const sun = spin(d.sun), moonN = [d.moon[0], d.moon[1], -d.moon[2]];
  const key = lift(d.sunUp > 0.5 || d.day > 0.3 ? sun : moonN);
  const keyC = d.light.map(c => c * d.level * 1.05);
  // Night needs more exposure, but never so much it looks like day.
  const expo = lerp(2.8, 0.95, Math.sqrt(d.day));
  // The fill falls as the shadow darkness rises; 0.4 keeps the first look.
  const fill = 2 ** (-(look.shade - 0.4) * 3);
  // The sky's colours: the physical sky at four places, plus the twilight glow.
  const tw = twilight(s, sun), up = [0, 1, 0], hs = unit([sun[0], 0.04, sun[2]]), ha = unit([-sun[0], 0.04, -sun[2]]), hm = unit([-sun[2], 0.35, sun[0]]);
  const moon = moonN, night = nightOf(sun);
  const at = (dir, k) => {
    const c = add(add(atmJS(dir, sun), atmJS(dir, moon).map(v => v * MOON_I / SKY_I * night)), tw[k]);
    return add(c, CITY.map(v => v * night * Math.exp(-Math.max(dir[1], 0) * 5)));
  };
  const sk = { ...s, zen: at(up, 'zen'), mid: at(hm, 'mid'), band: at(hs, 'band'), anti: at(ha, 'anti') };
  return { d, sun, moon, night, key, keyC, s: sk, tw, expo, haze: sk.mid, fill };
}

const JITTER = [[-0.125, -0.375], [0.375, -0.125], [-0.375, 0.125], [0.125, 0.375]];
// The sky bakes at half size when the hour changes.
function bakeSky() {
  const { s, keyC, sun, tw } = light;
  gl.disable(gl.BLEND);
  gl.bindVertexArray(vao);
  gl.bindFramebuffer(gl.FRAMEBUFFER, skyT.fb);
  gl.viewport(0, 0, skyT.w, skyT.h);
  const K = P.sky.u;
  gl.useProgram(P.sky.p);
  gl.uniform2f(K.uRes, skyT.w, skyT.h);
  gl.uniform1f(K.uRoll, ROLL);
  gl.uniform1f(K.uF, F);
  gl.uniform1f(K.uStars, s.stars);
  gl.uniform3fv(K.uFw, FW);
  gl.uniform3fv(K.uRt, RT);
  gl.uniform3fv(K.uUp, UP);
  gl.uniform3fv(K.uSun, sun);
  gl.uniform3fv(K.uKeyC, keyC);
  gl.uniform1f(K.uSkyI, SKY_I);
  gl.uniform1f(K.uMoonI, MOON_I * light.night);
  gl.uniform1f(K.uNight, light.night);
  gl.uniform3fv(K.uMoon, light.moon);
  gl.uniform3fv(K.uCity, CITY.map(v => v * light.night));
  gl.uniform3fv(K.uZen, tw.zen);
  gl.uniform3fv(K.uMid, tw.mid);
  gl.uniform3fv(K.uBand, tw.band);
  gl.uniform3fv(K.uAnti, tw.anti);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
}
// Each visit gets its own sky: a random place in the cloud field and a random cover.
const SKY_SEED = [rand(0, 60), rand(0, 60)], COVER = rand(0.16, 0.3);
// The clouds drift east and a little north, about 10 m each second.
function bakeClouds() {
  const { s, key, keyC } = light, K = P.cloud.u;
  gl.disable(gl.BLEND);
  gl.bindVertexArray(vao);
  gl.bindFramebuffer(gl.FRAMEBUFFER, cloudT.fb);
  gl.viewport(0, 0, cloudT.w, cloudT.h);
  gl.useProgram(P.cloud.p);
  gl.uniform2f(K.uRes, cloudT.w, cloudT.h);
  gl.uniform2f(K.uOff, -windT * 0.01, -windT * 0.004);
  gl.uniform2fv(K.uSeed, SKY_SEED);
  // The cover breathes slowly, so clouds form and thin out.
  gl.uniform1f(K.uCover, COVER + 0.05 * Math.sin(windT * 0.021 + SKY_SEED[0]));
  gl.uniform1f(K.uRoll, ROLL);
  gl.uniform1f(K.uF, F);
  gl.uniform3fv(K.uFw, FW);
  gl.uniform3fv(K.uRt, RT);
  gl.uniform3fv(K.uUp, UP);
  gl.uniform3fv(K.uKey, key);
  // At night the moon lights the clouds weakly; the city lights them from below.
  const n = light.night, city = CITY.map(v => v * n * 2.5);
  gl.uniform3fv(K.uKeyC, keyC.map(v => v * (1 - 0.8 * n)));
  gl.uniform3fv(K.uZen, add(s.zen.map(v => v * (1 - 0.5 * n)), city));
  gl.uniform3fv(K.uMid, add(s.mid.map(v => v * (1 - 0.5 * n)), city));
  gl.drawArrays(gl.TRIANGLES, 0, 3);
}
// The uniforms every part program shares: the eye, the light, the car.
const partProgs = () => [P.wire, P.solid, P.shoe];
function partUniforms() {
  const cw = canvas.width, ch = canvas.height, { s, key, keyC, sun } = light;
  const ocA = casters.flatMap(c => [...c[0], c[1]]), ocB = casters.flatMap(c => [...c[2], c[3]]);
  partProgs().forEach((q, i) => {
    const U = q.u;
    gl.useProgram(q.p);
    gl.uniform1i(U.uPass, i);
    gl.uniform2f(U.uRes, cw, ch);
    gl.uniform1f(U.uRoll, ROLL);
    gl.uniform1f(U.uF, F);
    gl.uniform3fv(U.uEye, EYE);
    gl.uniform3fv(U.uFw, FW);
    gl.uniform3fv(U.uRt, RT);
    gl.uniform3fv(U.uUp, UP);
    gl.uniform3fv(U.uKey, key);
    gl.uniform3fv(U.uKeyC, keyC);
    gl.uniform3fv(U.uSun, sun);
    gl.uniform3fv(U.uZen, s.zen);
    gl.uniform3fv(U.uMid, s.mid);
    gl.uniform3fv(U.uBand, s.band);
    gl.uniform3fv(U.uAnti, s.anti);
    gl.uniform3fv(U.uHaze, light.haze);
    // A program that casts no shadows has no caster uniforms.
    if (U.uOcA) { gl.uniform4fv(U.uOcA, ocA); gl.uniform4fv(U.uOcB, ocB); }
    gl.uniform4fv(U.uCar, car.head);
    gl.uniform4fv(U.uTail, car.tail);
    gl.uniform3fv(U.uCarD, car.beam);
    gl.uniform3fv(U.uTailD, car.back);
    gl.uniform1f(U.uFill, light.fill);
    gl.uniformMatrix3fv(U.uShoeR, false, shoeR);
    gl.uniform3fv(U.uShoeAt, shoeRide);
    gl.uniform3f(U.uPluck, pluck.phase, pluck.age, pluck.amp);
  });
}
// Sets one float on some of the part programs.
const partSet = (progs, name, v) => { for (const q of progs) { gl.useProgram(q.p); gl.uniform1f(q.u[name], v); } };
// Draws parts in four jittered passes and sums them into a target.
// The still parts write depth; the moving parts only test against it.
function partPasses(into, pass, vaoP, count, still, progs, jits = JITTER) {
  gl.bindFramebuffer(gl.FRAMEBUFFER, into.fb);
  gl.viewport(0, 0, into.w, into.h);
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.enable(gl.BLEND);
  for (const [jx, jy] of jits) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, pass.fb);
    gl.clearDepth(1);
    gl.clear(still ? gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT : gl.COLOR_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.depthMask(still);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.bindVertexArray(vaoP);
    for (const q of progs) {
      gl.useProgram(q.p);
      gl.uniform2f(q.u.uJit, jx, jy);
      gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, count);
    }
    gl.depthMask(true);
    gl.disable(gl.DEPTH_TEST);
    gl.bindFramebuffer(gl.FRAMEBUFFER, into.fb);
    gl.blendFunc(gl.ONE, gl.ONE);
    gl.useProgram(P.add.p);
    gl.uniform1i(P.add.u.uTex, 10);
    gl.uniform1f(P.add.u.uGain, 1 / jits.length);
    bindTex(10, pass.tex);
    gl.bindVertexArray(vao);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  gl.disable(gl.BLEND);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}
// The still lane: the poles and all their fittings.
// Fast: one centred pass in place of four, for a moving hour.
function bakeParts(fast = false) {
  partUniforms();
  // The short leads on the pole bake still.
  partSet([P.solid, P.wire], 'uWind', 0);
  partPasses(sceneT, passT, strokeVao, wireStart, true, [P.solid, P.wire], fast ? [[0, 0]] : JITTER);
}
// A moving hour relights the scene cheaply; the clouds take every other frame.
function bakeLive(n) {
  light = lightAt(hour);
  flying = crowsAt(hour);
  ui.action('car').disabled = !carDark();
  bakeSky();
  if (n % 2 === 0) bakeClouds();
  bakeParts(true);
}
// A new hour or a new size bakes the sky, the clouds and the lane.
function bake() {
  light = lightAt(hour);
  // The car is only its headlights, so it drives after dark only.
  const night = carDark();
  ui.action('car').disabled = !night;
  if (!night && car.on) { car.on = false; car.head[3] = car.tail[3] = 0; }
  flying = crowsAt(hour);
  bakeSky();
  bakeClouds();
  bakeParts();
}

/* ---------- the crow highway ---------- */
// The stream crosses the frame from lower left to upper right.
const HW = (() => { const x = 1, y = 0.32, l = Math.hypot(x, y); return [x / l, y / l]; })();
const HW_MID = 0.5, HW_WIDE = 0.75;
const hwLen = () => Math.hypot(A, 1) + 0.35;
// Crows start strung along the whole stream, in loose groups.
function seed() {
  const n = TW * rows, pos = new Float32Array(n * 4), vel = new Float32Array(n * 4), len = hwLen();
  const px = -HW[1], py = HW[0];
  for (let i = 0; i < n; i++) {
    const g = Math.floor(Math.random() * 14), along = -len + (g + 0.5 + rand(-0.4, 0.4)) * (2 * len / 14);
    const across = HW_MID + rand(-0.5, 0.5) * HW_WIDE, z = rand(-0.4, 0.25), k = CZ / (CZ - z);
    pos.set([(HW[0] * along + px * across) / k, (HW[1] * along + py * across) / k, z, Math.random()], i * 4);
    vel.set([HW[0] * 0.27, HW[1] * 0.27, 0, 30], i * 4);
  }
  for (const s of S) {
    [[s.pos, pos], [s.vel, vel]].forEach(([t, d]) => {
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, TW, rows, gl.RGBA, gl.FLOAT, d);
    });
  }
  cur = 0;
}

let simT = 0, windT = 0, frameNo = 0, clapQ = null, origin = [0, 0], flying = 0;
// The commute peaks at dusk. A smaller one runs at dawn, the other way in life.
// By day and at night only a few stragglers cross.
function crowsAt(h) {
  const dusk = Math.exp(-(((h - 19.2) / 1.3) ** 2)), dawn = 0.45 * Math.exp(-(((h - 6.4) / 0.9) ** 2));
  return Math.max(6, Math.round(TW * rows * Math.max(dusk, dawn, 0.04)));
}
function simStep(dt) {
  const n = flying, s = S[cur], d = S[1 - cur];
  gl.bindVertexArray(vao);
  gl.bindFramebuffer(gl.FRAMEBUFFER, FA.fb);
  gl.viewport(0, 0, AW, AH);
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE);
  gl.useProgram(P.splat.p);
  gridUniforms(P.splat);
  bindTex(0, s.pos);
  bindTex(1, s.vel);
  gl.drawArrays(gl.POINTS, 0, n);
  gl.disable(gl.BLEND);
  // Three passes blur the field along x, y and z.
  gl.useProgram(P.blur.p);
  gl.uniform3i(P.blur.u.uG, GX, GY, GZ);
  [[FA, FB, [1, 0, 0]], [FB, FA, [0, 1, 0]], [FA, FB, [0, 0, 1]]].forEach(([a, b, st]) => {
    gl.bindFramebuffer(gl.FRAMEBUFFER, b.fb);
    bindTex(3, a.t0);
    bindTex(4, a.t1);
    gl.uniform3i(P.blur.u.uStep, ...st);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  });
  gl.bindFramebuffer(gl.FRAMEBUFFER, d.fb);
  gl.viewport(0, 0, TW, rows);
  const U = P.upd.u;
  gl.useProgram(P.upd.p);
  gridUniforms(P.upd);
  bindTex(0, s.pos);
  bindTex(1, s.vel);
  bindTex(3, FB.t0);
  bindTex(4, FB.t1);
  gl.uniform1f(U.uDt, dt);
  gl.uniform1f(U.uTime, simT);
  gl.uniform1f(U.uLen, hwLen());
  gl.uniform4f(U.uHw, HW[0], HW[1], HW_MID, HW_WIDE);
  gl.uniform4fv(U.uClap, clapQ || [0, 0, 1, 0]);
  gl.uniform2fv(U.uOrigin, origin);
  gl.uniform1ui(U.uFrame, frameNo++);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
  clapQ = null;
  cur = 1 - cur;
}
function draw() {
  const cw = canvas.width, ch = canvas.height, n = flying, s = S[cur];
  gl.bindVertexArray(vao);
  gl.bindFramebuffer(gl.FRAMEBUFFER, birdT.fb);
  gl.viewport(0, 0, cw, ch);
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE);
  const U = P.bird.u;
  gl.useProgram(P.bird.p);
  bindTex(0, s.pos);
  bindTex(1, s.vel);
  gl.uniform2f(U.uRes, cw, ch);
  gl.uniform1f(U.uRoll, ROLL);
  gl.uniform1f(U.uTime, simT);
  gl.uniform1f(U.uSpan, SPAN);
  gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, n);
  gl.disable(gl.BLEND);
  // The wires and the shoes move, so they draw each frame.
  partUniforms();
  partSet([P.wire, P.solid, P.shoe], 'uTime', windT);
  partSet([P.wire, P.solid, P.shoe], 'uWind', reduced() ? 0 : 1);
  partPasses(wireT, wpT, wireVao, strokeN - wireStart, false, [P.wire, P.solid, P.shoe]);
  gl.bindVertexArray(vao);
  gl.viewport(0, 0, cw, ch);
  gl.useProgram(P.comp.p);
  bindTex(5, birdT.tex);
  bindTex(6, sceneT.tex);
  bindTex(7, skyT.tex);
  bindTex(8, wireT.tex);
  bindTex(9, cloudT.tex);
  gl.uniform1f(P.comp.u.uExpo, light.expo * grade.expo);
  gl.uniform4f(P.comp.u.uPost, grade.tone, grade.film, grade.contrast, grade.grain);
  gl.uniform1f(P.comp.u.uVig, grade.vig);
  gl.uniform1f(P.comp.u.uT, simT);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
}

/* ---------- the car, the shoes, a plucked wire ---------- */
// A car passes at night: up the lane, or across it under the shoe wire.
// Each pass picks its route, its way along it and its speed.
// Headlights throw a white beam ahead; tail lights throw a red one behind.
const car = { s: 0, len: 0, v: 9, from: [0, 0, 0], dir: [0, 0, 1], on: false, next: 0,
  head: [0, 0, 0, 0], tail: [0, 0, 0, 0], beam: [0, 0.3, 1], back: [0, 0.3, -1] };
// Cars drive once the sun is well down, by the sky the eye sees.
const carDark = () => light.night > 0.5;
function carStep(dt, now) {
  // After dark a car passes now and then by itself, the first one soon.
  const dark = carDark();
  if (!dark) car.next = 0;
  else if (!car.on && !car.next) car.next = now + rand(1500, 6000);
  if (!car.on && dark && car.next && now > car.next) startCar();
  if (!car.on) return false;
  car.s += car.v * dt;
  // The lamps fade in and out at the ends of the run.
  // The lamps also fade as the day comes up during a pass.
  const k = clamp(car.s / 8) * clamp((car.len - car.s) / 30) * sstep(0.2, 0.6, light.night);
  const at = d => add(car.from, car.dir.map(v => v * (car.s + d)));
  car.head = [...add(at(0), [0, 0.7, 0]), 26 * k];
  car.tail = [...add(at(-4.2), [0, 0.8, 0]), 6 * k];
  if (car.s > car.len) {
    car.on = false;
    car.head[3] = car.tail[3] = 0;
    car.next = now + rand(35000, 80000);
  }
  return true;
}
function startCar() {
  if (car.on) return;
  let dir, mid;
  if (Math.random() < 0.5 || !shoePiv) {
    // Up the lane, in line with the poles, at either side of it.
    dir = [0, 0, 1];
    mid = [-1.3, 0, NEAR_Z];
  } else {
    // Across, under the shoe wire, along its line on the ground.
    dir = unit([shoeAlong[0], 0, shoeAlong[2]]);
    mid = [shoePiv[0], 0, shoePiv[2]];
  }
  if (Math.random() < 0.5) dir = dir.map(v => -v);
  car.dir = dir;
  car.from = sub(mid, dir.map(v => v * 20));
  car.len = 60;
  car.s = 0;
  // Cars roll through the alley: about 9 to 20 km/h.
  car.v = rand(2.5, 5.5);
  car.beam = unit([dir[0], 0.3, dir[2]]);
  car.back = unit([-dir[0], 0.25, -dir[2]]);
  car.on = true;
}
// The shoes: each a pendulum on its lace, under gravity, drag and gusts.
// Steps of 1/120 s or less keep explicit velocity, so a frame's length can vary.
// The lace is a fixed length from the knot.
const GRAV = 9.8, DRAG = 0.35, TWIST_K = 2.2, TWIST_DRAG = 0.5;
const shoeR = new Float32Array(18);
let shoeRide = [0, 0, 0];
for (let i = 0; i < 2; i++) shoeR.set([1, 0, 0, 0, 1, 0, 0, 0, 1], i * 9);
// The host wire's turn in the wind, as gust() in the vertex shader.
function shoeRideAt(t, wind) {
  const ph = shoeHost[1] - shoePiv[2] * 0.06, amp = shoeHost[2], sag = shoeHost[0];
  const th = wind * amp * (0.2 * Math.sin(t * 0.7 + ph) + 0.09 * Math.sin(t * 1.7 + ph * 2.3) + 0.035 * Math.sin(t * 3.9 + ph * 5.1) + 0.12);
  const at = add(shoeSide.map(v => v * sag * Math.sin(th)), [0, sag * (1 - Math.cos(th)), 0]);
  // A pluck on the host wire moves the knot as the vertex shader moves the wire.
  const age = pluck.age - (windT - t);
  if (pluck.amp > 0 && Math.abs(pluck.phase - shoeHost[1]) < 0.001 && age >= 0) {
    const k = pluck.amp * Math.exp(-age * 1.2) * Math.sin(age * (7 + 9 * amp)) * sag;
    return add(at, [shoeSide[0] * 0.25 * k, 0.5 * k, shoeSide[2] * 0.25 * k]);
  }
  return at;
}
// The gust's push on one shoe, in m/s². Calm spells come and go.
function shoeGust(t, ph) {
  const g = 0.5 + 0.5 * Math.sin(t * 0.31 + ph * 1.3) * Math.sin(t * 0.17 + ph);
  return g * (0.9 + 0.5 * Math.sin(t * 1.9 + ph) + 0.35 * Math.sin(t * 3.4 + ph * 2.0) + 0.2 * Math.sin(t * 5.3 + ph * 3.1));
}
// Rodrigues: the row-major 3x3 that turns unit a onto unit b.
function rotTo(a, b) {
  const v = cross(a, b), c = dot(a, b), k = 1 / (1 + c);
  return [v[0] * v[0] * k + c, v[0] * v[1] * k - v[2], v[0] * v[2] * k + v[1],
    v[1] * v[0] * k + v[2], v[1] * v[1] * k + c, v[1] * v[2] * k - v[0],
    v[2] * v[0] * k - v[1], v[2] * v[1] * k + v[0], v[2] * v[2] * k + c];
}
// A shoe's turn: about the rest hang line first, then the swing. Row-major.
function shoeRot(s, piv) {
  const A = rotTo([0, -1, 0], unit(sub(s.b, piv))), c = Math.cos(s.tw), sn = Math.sin(s.tw);
  const B = [c, 0, sn, 0, 1, 0, -sn, 0, c], M = [];
  for (let r = 0; r < 3; r++) for (let q = 0; q < 3; q++) M.push(A[r * 3] * B[q] + A[r * 3 + 1] * B[3 + q] + A[r * 3 + 2] * B[6 + q]);
  return M;
}
const mul3 = (M, v) => [M[0] * v[0] + M[1] * v[1] + M[2] * v[2], M[3] * v[0] + M[4] * v[1] + M[5] * v[2], M[6] * v[0] + M[7] * v[1] + M[8] * v[2]];
// The closest points of two segments: Ericson, Real-Time Collision Detection 5.1.9.
function segClose(p1, q1, p2, q2) {
  const d1 = sub(q1, p1), d2 = sub(q2, p2), r = sub(p1, p2);
  const a = dot(d1, d1), e = dot(d2, d2), f = dot(d2, r), c = dot(d1, r), b = dot(d1, d2), den = a * e - b * b;
  let s = den > 1e-9 ? clamp((b * f - c * e) / den) : 0, t = (b * s + f) / e;
  if (t < 0) { t = 0; s = clamp(-c / a); } else if (t > 1) { t = 1; s = clamp((b - c) / a); }
  return [add(p1, d1.map(v => v * s)), add(p2, d2.map(v => v * t))];
}
const SHOE_R = 0.045;
// Two shoes that touch push apart at their contact point.
// The bobs move by the lever ratio; the lace then holds their length.
function shoeBump(piv) {
  const [s0, s1] = shoes, M0 = shoeRot(s0, piv[0]), M1 = shoeRot(s1, piv[1]);
  const w = (s, M, p, k) => add(p, mul3(M, s[k]));
  const [a, b] = segClose(w(s0, M0, piv[0], 'c0'), w(s0, M0, piv[0], 'c1'), w(s1, M1, piv[1], 'c0'), w(s1, M1, piv[1], 'c1'));
  const gap = sub(b, a), dist = Math.hypot(...gap), pen = 2 * SHOE_R - dist;
  if (pen <= 0 || dist < 1e-6) return;
  const n = gap.map(v => v / dist);
  s0.b = sub(s0.b, n.map(v => v * pen * 0.5 * s0.L / Math.max(0.1, Math.hypot(...sub(a, piv[0])))));
  s1.b = add(s1.b, n.map(v => v * pen * 0.5 * s1.L / Math.max(0.1, Math.hypot(...sub(b, piv[1])))));
  // A glancing knock turns each shoe a little on its lace.
  s0.tv -= pen * 20;
  s1.tv += pen * 20;
}
function shoeStep(dt) {
  if (!shoes.length || dt <= 0) return;
  const wind = reduced() ? 0 : 1, n = Math.ceil(dt * 120), h = dt / n;
  const along = unit(cross([0, 1, 0], shoeSide));
  for (let j = 1; j <= n; j++) {
    const t = windT - dt + j * h;
    shoeRide = shoeRideAt(t, wind);
    const piv = shoes.map(s => add(s.piv, shoeRide)), was = shoes.map(s => s.b);
    // The lace holds the bob at its length from the riding knot.
    const hold = (s, i) => { s.b = add(piv[i], unit(sub(s.b, piv[i])).map(v => v * s.L)); };
    shoes.forEach((s, i) => {
      const f = wind * shoeGust(t, s.ph), f2 = wind * 0.3 * Math.sin(t * 0.83 + s.ph * 2.0);
      const acc = [shoeSide[0] * f + along[0] * f2, -GRAV, shoeSide[2] * f + along[2] * f2];
      const keep = 1 - DRAG * h;
      s.v = s.v.map((v, k) => v * keep + acc[k] * h);
      s.b = add(s.b, s.v.map(v => v * h));
      hold(s, i);
      // The lace twists and untwists slowly.
      s.tv += (-TWIST_K * s.tw - TWIST_DRAG * s.tv + wind * 0.4 * Math.sin(t * 0.53 + s.ph)) * h;
      s.tw += s.tv * h;
    });
    if (shoes.length === 2) { shoeBump(piv); shoes.forEach(hold); }
    // The velocity follows the moves, so a bump carries on as a swing.
    shoes.forEach((s, i) => { s.v = sub(s.b, was[i]).map(v => v / h); });
  }
  const piv = shoes.map(s => add(s.piv, shoeRide));
  shoes.forEach((s, i) => {
    // Out column-major for the shader.
    const M = shoeRot(s, piv[i]);
    for (let r = 0; r < 3; r++) for (let q = 0; q < 3; q++) shoeR[i * 9 + q * 3 + r] = M[r * 3 + q];
  });
}
// A tap throws both shoes across the wire and spins them a little.
function shoeKick() {
  for (const s of shoes) {
    const v = rand(0.7, 1.1) * (Math.random() < 0.5 ? -1 : 1);
    s.v = add(s.v, shoeSide.map(x => x * v));
    s.tv += rand(-1.5, 1.5);
  }
}
const pluck = { phase: -1, age: 0, amp: 0 };

/* ---------- one loop ---------- */
// The stream drifts at 30 fps; a startle runs at full rate.
// A minute after the last input the scene slows to a stop.
let raf = 0, last = 0, visible = true, lastInput = 0, startleT = 0, ease = 1, dirty = false, tickNo = 0;
const SLEEP = 60;
function frame(now) {
  raf = 0;
  if (!ready || !visible) return;
  const raw = Math.max(0, (now - last) / 1000);
  // A held timelapse runs at full rate, like a startle.
  if (startleT <= 0 && !lapse.on && raw < 1 / 32) { raf = requestAnimationFrame(frame); return; }
  last = now;
  // A car in the lane keeps the scene awake until it has gone.
  if (car.on) lastInput = Math.max(lastInput, now - (SLEEP - 3) * 1000);
  ease = clamp(1 - ((now - lastInput) / 1000 - SLEEP) / 2);
  const dt = Math.min(raw, 1 / 20) * ease;
  try {
    startleT = Math.max(0, startleT - raw);
    simT += dt;
    windT += dt;
    shoeStep(dt);
    pluck.age += dt;
    if (pluck.age > 6) pluck.amp = 0;
    if (dt > 0) simStep(dt);
    const lit = carStep(dt, now);
    if (lapse.down && !lapse.on && now - lapse.down > HOLD_MS) lapse.on = true;
    if (lapse.on) {
      lastInput = now;
      clock.to(clock.target + raw * LAPSE_RATE);
    }
    if (clock.step(raw)) {
      hour = clock.hour;
      bakeLive(tickNo++);
      if (lapse.on) ui.slider.set(hour);
      liveBaked = true;
    } else if (liveBaked) {
      // The hour has settled: one full bake at full quality.
      liveBaked = false;
      hour = clock.hour;
      dirty = true;
    }
    if (dirty) { dirty = false; bake(); } else if (!clock.moving) {
      // The lane rebakes only while the car's lights move over it.
      if (lit || car.dark) bakeParts();
      // The clouds redraw every third frame: about ten times a second.
      if (++tickNo % 3 === 0 && dt > 0) bakeClouds();
    }
    car.dark = lit;
    D.frame(raw);
  } finally {
    draw();
  }
  if (ease > 0) raf = requestAnimationFrame(frame);
}
function kick() {
  if (!ready || !visible || raf || reduced()) return;
  last = performance.now();
  raf = requestAnimationFrame(frame);
}
function poke() {
  lastInput = performance.now();
  kick();
}

/* ---------- size ---------- */
const D = detail({ maxDpr: 2, budget: 2.4e6, onChange: () => { if (ready) { resize(); draw(); } } });
function resize() {
  const r = stage.getBoundingClientRect();
  // Before layout the stage can measure zero; the window stands in.
  W = r.width > 8 ? r.width : innerWidth;
  H = r.height > 8 ? r.height : innerHeight;
  const dpr = D.dpr(W, H);
  canvas.width = Math.max(1, Math.round(W * dpr));
  canvas.height = Math.max(1, Math.round(H * dpr));
  A = W / H;
  allocField();
  allocTargets();
  bake();
}

/* ---------- input ---------- */
// A tap lands in unrolled scene units.
function toScene(e) {
  const r = stage.getBoundingClientRect();
  const x = ((e.clientX - r.left) / r.height) * 2 - A, y = 1 - ((e.clientY - r.top) / r.height) * 2;
  return [Math.cos(-ROLL) * x - Math.sin(-ROLL) * y, Math.sin(-ROLL) * x + Math.cos(-ROLL) * y];
}
function startle(sx, sy) {
  if (!ready) return;
  clapQ = [sx, sy, 0.45, 0.7];
  origin = [sx, sy];
  startleT = 3;
  poke();
  // Reduced motion: one short step shows the scatter, then it holds.
  if (reduced()) { for (let i = 0; i < 20; i++) { simT += 1 / 60; simStep(1 / 60); } draw(); }
}
// The nearest plucked line to a tap, within about a finger's width.
function wireAt(sx, sy) {
  let best = null, bd = 0.03;
  for (const w of pluckable) {
    let prev = null;
    for (const pt of w.pts) {
      const q = project(pt);
      if (q[2] > 0.7 && prev) {
        const ax = prev[0], ay = prev[1], bx = q[0] - ax, by = q[1] - ay;
        const t = clamp(((sx - ax) * bx + (sy - ay) * by) / (bx * bx + by * by || 1));
        const d = Math.hypot(sx - ax - bx * t, sy - ay - by * t);
        if (d < bd) { bd = d; best = w; }
      }
      prev = q[2] > 0.7 ? q : null;
    }
  }
  return best;
}
canvas.addEventListener('pointerdown', e => {
  if (!ready || (e.pointerType === 'mouse' && e.button !== 0)) return;
  const [sx, sy] = toScene(e);
  // The shoes first, then a wire; a tap on open sky startles the crows.
  if (shoePiv) {
    const q = project(add(shoePiv, [0, -0.85, 0]));
    if (Math.hypot(sx - q[0], sy - q[1]) < 0.15) { shoeKick(); poke(); return; }
  }
  const w = wireAt(sx, sy);
  if (w) { pluck.phase = w.phase; pluck.age = 0; pluck.amp = 0.32; poke(); return; }
  startle(sx, sy);
});
canvas.addEventListener('pointermove', e => { if (e.pointerType === 'mouse') poke(); });
canvas.addEventListener('contextmenu', e => e.preventDefault());
stage.addEventListener('keydown', e => {
  if (e.target !== stage || e.metaKey || e.ctrlKey || e.altKey || !ready) return;
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    if (!e.repeat) act.scatter();
  }
});
// A scatter starts in the middle of the stream.
act.scatter = () => startle(HW[0] * rand(-0.3, 0.3) - HW[1] * HW_MID, HW[1] * rand(-0.3, 0.3) + HW[0] * HW_MID);
// A new hour bakes on the next frame. With no loop, it bakes at once.
// The clock eases to h; reduced motion and a hidden page jump at once.
function setHour(h) {
  clock.to(h);
  if (!ready || reduced() || !visible) { clock.snap(); hour = clock.hour; }
  if (!ready) return;
  if (reduced() || !visible) { bake(); draw(); } else poke();
}
act.repaint = () => { if (ready) { draw(); poke(); } };
act.relight = () => { if (!ready) return; if (reduced() || !visible) { bake(); draw(); } else { dirty = true; poke(); } };
act.nowDown = () => {
  if (reduced()) return;
  lapse.down = performance.now();
  follow = false;
  poke();
};
// A short press is Now; the end of a hold keeps the hour it reached.
act.nowUp = () => {
  const held = lapse.on;
  lapse.down = 0;
  lapse.on = false;
  if (!held) { act.now(); return; }
  clock.to(clock.hour);
  store.set('hour', clock.hour);
  ui.slider.set(clock.hour);
};
act.hour = v => {
  follow = false;
  store.set('hour', v);
  setHour(v);
};
act.now = () => {
  follow = true;
  store.set('hour', 'now');
  ui.slider.set(localHour());
  setHour(localHour());
};
act.car = () => { if (ready && !reduced() && carDark()) { startCar(); poke(); } };
// Now re-reads the clock once a minute and moves the slider with it.
setInterval(() => {
  if (!ready || !visible || !follow) return;
  const h = localHour();
  if (Math.abs(h - hour) < 0.05) return;
  ui.slider.set(h);
  clock.to(h);
  clock.snap();
  hour = clock.hour;
  bake();
  draw();
}, 60000);

/* ---------- start ---------- */
async function boot() {
  rows = matchMedia('(pointer: coarse)').matches || (navigator.hardwareConcurrency || 8) < 6 ? 1 : 2;
  await buildGL();
  resize();
  seed();
  // A few seconds of flight run before the first paint.
  for (let k = 0; k < 3; k++) {
    for (let j = 0; j < 30; j++) { simT += 1 / 60; simStep(1 / 60); }
    await nextFrame();
  }
  draw();
  gl.finish();
  canvas.classList.add('on');
  ready = true;
  mark('first-frame');
  car.next = performance.now() + rand(12000, 30000);
  poke();
}
onContextLoss(canvas, {
  lost() { ready = false; cancelAnimationFrame(raf); raf = 0; },
  async restored() { await boot(); },
});
try {
  await boot();
} catch (err) {
  console.error(err);
  stage.querySelector('.fail').hidden = false;
  ui.hideControls();
  mark('first-frame');
}
new ResizeObserver(() => { if (ready) { resize(); draw(); } }).observe(stage);
onReducedChange(on => { if (ready) { if (on) { cancelAnimationFrame(raf); raf = 0; } else poke(); } });
// A hidden tab stops the loop and the sim clock.
whenVisible(stage, v => {
  visible = v;
  if (!v) { cancelAnimationFrame(raf); raf = 0; return; }
  kick();
});
