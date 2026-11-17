// Tornado alley: vehicles on the road, as a scene.
// A pickup flees the storm toward the eye and races past; then two storm chasers rush in from behind.
// The CPU part drives each vehicle: it brakes, follows, and swerves round what lies on the road.
// The GLSL part ray-traces each vehicle as faceted hulls, wheels, glass, lamps and spray.
import { POLE_X, POLE_Z0, POLE_GAP, POLES } from './line.js';
import { reduced } from '../shared/stim.js';

const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);

/* ---------- the scene ---------- */
// The road's centre, as main.js ROAD_X; lanes are 3.7 m wide, traffic keeps right.
const ROAD_X = 3.4, LANE = 1.85;
// A vehicle on the shoulder: its centre this far from the road's centre, half on the gravel.
const SHOULDER = 3.9;
// Off the road, in the wheat beyond the ditch.
const FIELD = 7.5;
export const MAX_VEH = 3;
// Vehicle kinds: a pickup, a wagon with roof gear, a van with an instrument mast.
const PICKUP = 0, WAGON = 1, VAN = 2;
// Each kind's half length and half width, in metres.
const HALF_L = [2.95, 2.5, 2.8], HALF_W = [1.0, 0.96, 1.0];
// Hard braking and an easy pull away, m/s².
const BRAKE = 7.5, ACCEL = 2.6;
// A downed pole's length over the ground, in metres.
const POLE_LEN = 10.4;

export function trafficState() {
  return {
    veh: [], obs: [], extra: [], auto: false, autoAt: -1,
    u: new Float32Array(MAX_VEH * 4), uB: new Float32Array(MAX_VEH * 4), uC: new Float32Array(MAX_VEH * 4),
  };
}
// One vehicle: its lane, place, direction (+1 toward the eye) and cruise speed.
function car(kind, x, z, dir, v, t0) {
  return { kind, lane: x, x, z, dir, v, vSet: v, t0, seed: Math.random(), xT: x, xv: 0, acc: 0, lat: 0, brake: 0, pitch: 0, roll: 0 };
}
// Starts the scene at simT: the pickup first, the chasers when it has passed the eye.
export function trafficRun(T, simT) {
  T.veh.length = 0;
  // The pickup: 1.1 km out on the eye's lane, heading for the eye at 34 m/s.
  const vp = 34, z0 = -1100;
  T.veh.push(car(PICKUP, ROAD_X - LANE, z0, 1, vp, simT));
  // The chasers: 3 s after the pickup passes, from behind the eye, close together at 31 m/s.
  const tc = simT - z0 / vp + 3;
  T.veh.push(car(WAGON, ROAD_X + LANE, 70, -1, 31, tc));
  T.veh.push(car(VAN, ROAD_X + LANE, 92, -1, 31, tc));
}

/* ---------- what lies on the road ---------- */
// Each obstacle: its place along the road, and the span across it it blocks.
// A pole that falls toward the road lies across it; other modules add theirs to T.extra.
function obstacles(T, line) {
  T.obs.length = 0;
  if (line) {
    for (let i = 0; i < POLES; i++) {
      const lean = line.lean[i];
      if (!line.down[i] || lean > -0.4) continue;
      const reach = POLE_LEN * Math.sin(-lean);
      T.obs.push({ z: -(POLE_Z0 + POLE_GAP * i), x0: POLE_X - reach - 0.3, x1: POLE_X + 0.3 });
    }
  }
  for (const o of T.extra) T.obs.push(o);
}

/* ---------- driving ---------- */
// One vehicle's step: pick a free line round what lies ahead, then steer and brake to it.
function drive(T, v, dt, simT) {
  const hl = HALF_L[v.kind], hw = HALF_W[v.kind];
  const ahead = o => (o.z - v.z) * v.dir;
  // It looks as far as it needs to stop, and a little more.
  const look = 25 + v.v * v.v / (2 * 5) + v.v;
  const near = T.obs.filter(o => { const a = ahead(o); return a > -hl - 2 && a < look; });
  const free = x => near.every(o => x + hw + 0.35 < o.x0 || x - hw - 0.35 > o.x1);
  // The lines it may take, in the order a driver would: its lane, its shoulder, the other lane, the far shoulder, the field.
  const out = v.lane < ROAD_X ? -1 : 1;
  const lines = [
    [v.lane, v.vSet], [ROAD_X + out * SHOULDER, 16], [2 * ROAD_X - v.lane, 25],
    [ROAD_X - out * SHOULDER, 16], [ROAD_X + out * FIELD, 5],
  ];
  let vt = v.vSet;
  if (near.length) {
    const pick = lines.find(([x]) => free(x));
    if (pick) { v.xT = pick[0]; vt = pick[1]; }
    else vt = Math.sqrt(2 * 5 * Math.max(Math.min(...near.map(ahead)) - hl - 6, 0));
  } else v.xT = v.lane;
  // It keeps a gap to the vehicle ahead in its own direction.
  for (const o of T.veh) {
    if (o === v || o.dir !== v.dir || simT < o.t0) continue;
    const g = (o.z - v.z) * v.dir;
    if (g > 0 && g < 70) vt = Math.min(vt, o.v + (g - 16) * 0.45);
  }
  // A swerve in progress takes off some speed.
  vt = Math.max(0, vt - Math.abs(v.xT - v.x) * 1.5);
  const dv = clamp(vt - v.v, -BRAKE * dt, ACCEL * dt);
  v.v += dv;
  const k = 1 - Math.exp(-dt / 0.25);
  v.acc += (dv / Math.max(dt, 1e-3) - v.acc) * k;
  // The steer: a lateral speed toward the chosen line, quicker at speed.
  const m = Math.min(3.5, 0.5 + 0.12 * v.v);
  const xv0 = v.xv;
  v.xv += (clamp((v.xT - v.x) * 1.1, -m, m) - v.xv) * (1 - Math.exp(-dt / 0.35));
  v.lat += ((v.xv - xv0) / Math.max(dt, 1e-3) - v.lat) * k;
  v.x += v.xv * dt;
  v.z += v.dir * v.v * dt;
  // Brakes past 1 m/s²; the nose dips as it brakes and the body rolls out of a swerve.
  v.brake = clamp((-v.acc - 1) / 5);
  v.pitch = clamp(-v.acc * 0.0045, -0.012, 0.035);
  v.roll = clamp(v.lat * 0.012 * v.dir, -0.05, 0.05);
}
// One step: the scene runs once by itself, 8 s after the first tornado's dust is up.
export function trafficStep(T, tors, simT, dt = 0.016, line = null) {
  if (!T.auto && T.autoAt < 0 && tors.some(t => t.dust > 0.9)) T.autoAt = simT + 8;
  if (!T.auto && T.autoAt >= 0 && simT >= T.autoAt) { T.auto = true; trafficRun(T, simT); }
  obstacles(T, line);
  for (const v of T.veh) if (simT >= v.t0) drive(T, v, dt, simT);
  // A vehicle leaves once it is past the eye or lost in the haze.
  T.veh = T.veh.filter(v => (v.dir > 0 ? v.z < 80 : v.z > -7000));
}
// True while any vehicle still drives: the page keeps its loop.
export const trafficBusy = T => T.veh.length > 0;
// Packs each vehicle for the scene pass: x, z, signed speed, kind; alive, seed, age, heading;
// brake, pitch, roll, twinkle (0 under reduced motion).
export function trafficUniforms(T, simT) {
  T.u.fill(0); T.uB.fill(0); T.uC.fill(0);
  T.veh.slice(0, MAX_VEH).forEach((v, i) => {
    const age = simT - v.t0;
    const hd = Math.atan2(v.xv, v.dir * Math.max(v.v, 0.3));
    T.u.set([v.x, v.z, v.dir * v.v, v.kind], i * 4);
    T.uB.set([age >= 0 ? 1 : 0, v.seed, Math.max(age, 0), hd], i * 4);
    T.uC.set([v.brake, v.pitch, v.roll, reduced() ? 0 : 1], i * 4);
  });
}

/* ---------- the vehicles' shapes, as data ---------- */
// Hulls and small parts live in tables: one loop traces them all.
// So each traced call site stays small, and the shader compiles fast.
// A plane with normal n through q: its unit normal and offset.
const pq = (n, q) => { const l = Math.hypot(...n), u = n.map(v => v / l); return [...u, u[0] * q[0] + u[1] * q[1] + u[2] * q[2]]; };
// The plane and its mirror across the vehicle's middle.
const pqm = (n, q) => [pq(n, q), pq([-n[0], n[1], n[2]], [-q[0], q[1], q[2]])];
// The windshield: a plane through the hood's back edge (y, z) with normal (0, ny, nz).
const WS = [[1.32, 0.92, 0.802, 0.597], [1.08, 1.07, 0.75, 0.66], [1.15, 1.77, 0.55, 0.83]];
const ws = k => pq([0, WS[k][2], WS[k][3]], [0, WS[k][0], WS[k][1]]);
// Each kind's wheel arches: centre height, front z, rear z, radius; and the well's inner wall x.
const ARCH = [[0.4, 1.8, -1.88, 0.52, 0.6], [0.38, 1.45, -1.45, 0.48, 0.58], [0.38, 1.8, -1.8, 0.49, 0.62]];
// A hull: box centre, half size, edge cut, id, planes, arch cuts (1 front, 2 rear).
const H = (c, h, e, id, pl, cut = 0) => ({ c, h, e, id, pl, cut });
const B = (c, h, e, id) => ({ c, h, e, id });
const mirrorB = b => B([-b.c[0], b.c[1], b.c[2]], b.h, b.e, b.id);
const HULLS = [
  [
    // The pickup's front end: a tall face, a hood that falls a little to the nose.
    // The nose narrows in plan, its corners round off; the fenders' shoulders roll over.
    H([0, 0.88, 1.88], [1, 0.44, 0.96], 0.07, 1, [[0, 0.999, 0.0437, 1.36], pq([0, 1, 0.9], [0, 1.18, 2.84]), pq([0, -1, 0.8], [0, 0.5, 2.84]),
      ...pqm([1, 0, 0.12], [1, 0, 2.2]), ...pqm([1, 0, 1], [0.9, 0, 2.84]), ...pqm([1, 1.2, 0], [1, 1.25, 0])], 1),
    // The crew cab: raked windshield, sides that lean in above the belt, a rounded roof.
    H([0, 1.19, -0.23], [1, 0.75, 1.15], 0.08, 2, [ws(0), ...pqm([1, 0.16, 0], [1, 1.32, 0]), ...pqm([0.6, 1, 0], [0.84, 1.94, 0]),
      pq([0, 1, -0.8], [0, 1.92, -1.28]), pq([0, 0.05, -1], [0, 1.3, -1.38])], 2),
    // The bed's side walls, flush with the cab's belt; a 7 cm gap stands between cab and bed.
    H([0.965, 0.895, -2.2], [0.035, 0.435, 0.75], 0.02, 1, [], 2),
    H([-0.965, 0.895, -2.2], [0.035, 0.435, 0.75], 0.02, 1, [], 2),
    // A chrome bumper that wraps the corners.
    H([0, 0.5, 2.86], [1, 0.13, 0.08], 0.04, 5, [...pqm([1, 0, 1], [0.88, 0, 2.94])]),
  ],
  [
    // The wagon's nose: a hood that falls to a rounded front, fenders that roll over.
    H([0, 0.73, 1.735], [0.95, 0.37, 0.735], 0.07, 1, [pq([0, 1, 0.14], [0, 1.08, 1.2]), pq([0, 1, 1.1], [0, 0.92, 2.36]), pq([0, -1, 0.9], [0, 0.5, 2.42]),
      ...pqm([1, 0, 0.1], [0.95, 0, 1.6]), ...pqm([1, 0, 0.9], [0.84, 0, 2.47]), ...pqm([1, 1.1, 0], [0.95, 1, 0])], 1),
    // The long body: raked windshield, sides that lean in, a hatch that leans in at the back.
    H([0, 1.06, -0.725], [0.95, 0.7, 1.705], 0.08, 2, [ws(1), ...pqm([1, 0.22, 0], [0.95, 1.1, 0]), ...pqm([1, -0.35, 0], [0.95, 0.55, 0]),
      ...pqm([0.55, 1, 0], [0.72, 1.76, 0]), pq([0, 1, 0.35], [0, 1.755, 0.25]), pq([0, 0.28, -1], [0, 1.1, -2.43]),
      pq([0, 1, -0.7], [0, 1.75, -2.15]), pq([0, -1, -0.7], [0, 0.5, -2.38])], 3),
    // Black bumpers that wrap the corners.
    H([0, 0.5, 2.42], [0.96, 0.14, 0.08], 0.04, 3, [...pqm([1, 0, 1], [0.84, 0, 2.5])]),
    H([0, 0.5, -2.4], [0.96, 0.13, 0.07], 0.04, 3, [...pqm([1, 0, -1], [0.84, 0, -2.47])]),
  ],
  [
    // The van's short nose: a steep hood, a rounded front.
    H([0, 0.78, 2.2], [1, 0.42, 0.55], 0.1, 1, [pq([0, 1, 0.32], [0, 1.18, 1.8]), pq([0, 1, 1.2], [0, 0.86, 2.68]), pq([0, -1, 0.8], [0, 0.48, 2.7]),
      ...pqm([1, 0, 0.08], [1, 0, 1.9]), ...pqm([1, 0, 0.7], [0.86, 0, 2.75]), ...pqm([1, 1, 0], [1, 1.08, 0])], 1),
    // The tall body: a high roof over the windshield, near-upright sides, rounded top edges.
    H([0, 1.355, -0.535], [1, 0.995, 2.235], 0.14, 2, [ws(2), ...pqm([1, 0.05, 0], [1, 1.3, 0]), ...pqm([1, -0.3, 0], [1, 0.55, 0]),
      ...pqm([0.7, 1, 0], [0.86, 2.35, 0]), pq([0, 1, 0.6], [0, 2.35, 0.85]), pq([0, 1, -0.5], [0, 2.35, -2.55]), pq([0, -1, -0.6], [0, 0.5, -2.72])], 3),
    // A black bumper that wraps the corners.
    H([0, 0.47, 2.74], [0.99, 0.13, 0.08], 0.04, 3, [...pqm([1, 0, 1], [0.86, 0, 2.82])]),
  ],
];
// Small parts: plain boxes. ids as vHit's list.
const pair = b => [b, mirrorB(b)];
const BOXES = [
  [
    // The bed's bulkhead, tailgate, liner floor and wheel housings.
    B([0, 1.09, -1.48], [0.93, 0.24, 0.02], 0.01, 1), B([0, 0.925, -2.91], [1, 0.405, 0.035], 0.025, 1),
    B([0, 0.83, -2.2], [0.93, 0.03, 0.7], 0, 13), ...pair(B([0.78, 0.94, -1.88], [0.15, 0.1, 0.5], 0.06, 13)),
    // The frame, an air dam, a chrome rear bumper, a hitch, running boards.
    B([0, 0.42, -0.1], [0.6, 0.1, 2.6], 0, 3), B([0, 0.34, 2.78], [0.86, 0.04, 0.08], 0.02, 3),
    B([0, 0.52, -2.98], [1, 0.1, 0.05], 0.035, 5), B([0, 0.46, -3.08], [0.04, 0.035, 0.07], 0.01, 3),
    ...pair(B([1.04, 0.47, -0.05], [0.08, 0.022, 1.22], 0.01, 3)),
    // Tall towing mirrors on short arms.
    ...pair(B([1.18, 1.47, 0.72], [0.11, 0.13, 0.05], 0.03, 3)), ...pair(B([1.05, 1.41, 0.74], [0.05, 0.02, 0.02], 0, 3)),
  ],
  [
    // A bright skid plate, the frame, running boards.
    B([0, 0.34, 2.36], [0.5, 0.03, 0.12], 0.015, 5), B([0, 0.38, 0], [0.6, 0.07, 1.9], 0, 3),
    ...pair(B([1, 0.42, 0], [0.07, 0.02, 0.85], 0.01, 3)),
    // Roof rails, two cross bars, a black gear case, the amber bar at the front.
    ...pair(B([0.68, 1.8, -0.95], [0.03, 0.035, 1.1], 0.01, 3)),
    B([0, 1.85, -0.25], [0.72, 0.02, 0.03], 0, 3), B([0, 1.85, -1.65], [0.72, 0.02, 0.03], 0, 3),
    B([0, 1.96, -1], [0.5, 0.09, 0.55], 0.05, 3), B([0, 1.85, 0.12], [0.6, 0.045, 0.07], 0.03, 4),
    // Mirrors on short arms at the windshield's foot.
    ...pair(B([1.06, 1.2, 0.86], [0.08, 0.075, 0.05], 0.025, 3)), ...pair(B([0.97, 1.17, 0.9], [0.04, 0.02, 0.02], 0, 3)),
  ],
  [
    // The rear bumper, a step, the frame.
    B([0, 0.47, -2.8], [0.99, 0.12, 0.06], 0.04, 3), B([0, 0.37, -2.88], [0.4, 0.02, 0.08], 0.01, 3),
    B([0, 0.38, 0], [0.6, 0.06, 2.2], 0, 3),
    // The roof rack: two rails, four cross bars; its instrument cases; the amber bar.
    ...pair(B([0.8, 2.4, -0.7], [0.03, 0.03, 1.55], 0.01, 3)),
    ...[0, 1, 2, 3].map(k => B([0, 2.42, 0.6 - k * 0.85], [0.8, 0.015, 0.025], 0, 3)),
    B([0.42, 2.535, -0.3], [0.22, 0.1, 0.35], 0.03, 12), B([-0.4, 2.505, -1.1], [0.28, 0.07, 0.4], 0.03, 3),
    B([0, 2.41, 0.55], [0.65, 0.05, 0.08], 0.02, 4),
    // The mast's radiation shield, its cross-arm, the vane.
    B([0, 3.1, -2.2], [0.08, 0.13, 0.08], 0.03, 12), B([0, 3.64, -2.2], [0.46, 0.015, 0.015], 0, 5),
    B([-0.46, 3.68, -2.32], [0.004, 0.06, 0.12], 0, 3),
    // Big mirrors at the windshield's foot.
    ...pair(B([1.12, 1.5, 1.5], [0.08, 0.16, 0.05], 0.025, 3)), ...pair(B([1.03, 1.45, 1.53], [0.05, 0.02, 0.02], 0, 3)),
  ],
];
const f5 = v => (Math.round(v * 1e5) / 1e5).toString().replace(/^(-?\d+)$/, '$1.0');
const v4 = a => `vec4(${a.map(f5).join(', ')})`;
// Per hull: (centre, edge cut), (half size, id), (first plane, plane count, arch cuts, 0).
const VH = [], VP = [], VB = [], VK = [];
HULLS.forEach((hs, k) => {
  const h0 = VH.length / 3, b0 = VB.length / 2;
  hs.forEach(h => {
    VH.push(v4([...h.c, h.e]), v4([...h.h, h.id]), v4([VP.length, h.pl.length, h.cut, 0]));
    h.pl.forEach(p => VP.push(v4(p)));
  });
  BOXES[k].forEach(b => VB.push(v4([...b.c, b.e]), v4([...b.h, b.id])));
  VK.push(`ivec4(${h0}, ${hs.length}, ${b0}, ${BOXES[k].length})`);
});
const MAX_HULLS = Math.max(...HULLS.map(h => h.length)), MAX_PLANES = Math.max(...HULLS.flat().map(h => h.pl.length));
const MAX_BOXES = Math.max(...BOXES.map(b => b.length));
const VEH_DATA_GLSL = `
const vec4 VH[${VH.length}] = vec4[](${VH.join(', ')});
const vec4 VP[${VP.length}] = vec4[](${VP.join(', ')});
const vec4 VB[${VB.length}] = vec4[](${VB.join(', ')});
// Each kind: first hull, hull count, first box, box count.
const ivec4 VK[3] = ivec4[](${VK.join(', ')});
const vec4 VA[3] = vec4[](${ARCH.map(a => v4(a.slice(0, 4))).join(', ')});
const float VAX[3] = float[](${ARCH.map(a => f5(a[4])).join(', ')});
`;

/* ---------- GLSL ---------- */
// It reads main.js's CAMH, uFoc, uRain, WDIR, toWorld(), proj(), depthOf(), sunCover(), hazed(), th(), vn(),
// line.js's put(), lineEnv() and ggx(), and road.js's envBRDF().
export const TRAFFIC_GLSL = /* glsl */`
/* ---------- vehicles ---------- */
// Each vehicle: x, z in world metres, signed speed (+ toward the eye), kind;
// then alive, seed, age, heading; then brake, pitch, roll.
uniform vec4 uVeh[${MAX_VEH}], uVehB[${MAX_VEH}], uVehC[${MAX_VEH}];
// The lamps' glow, added after the storm pass's picture.
vec3 gVehGlow = vec3(0.0);

${VEH_DATA_GLSL}
/* ---------- convex hulls ---------- */
// A hull is the space inside a set of planes; the ray enters at the last entry.
// A pixel's width in metres at the vehicle, and the share of a pixel the hit thin part covers.
// gPxW also takes the motion blur's sideways smear: a thin part spread over it covers its share.
float gPxW = 0.0, gHitK = 1.0;
float hTn, hTf;
vec3 hN, hNf;
// The cab's exit point along the ray, and the normal there: what shows through its glass.
float gExT;
vec3 gExN;
void hBeg() { hTn = -1e9; hTf = 1e9; hN = vec3(0.0, 1.0, 0.0); hNf = hN; }
// One plane: inside where dot(n, p) <= w. n is unit length.
void hPl(vec3 ro, vec3 rd, vec3 n, float w) {
  float dn = dot(n, rd), di = w - dot(n, ro);
  if (abs(dn) < 1e-7) { if (di < 0.0) hTf = -1e9; return; }
  float t = di / dn;
  if (dn < 0.0) { if (t > hTn) { hTn = t; hN = n; } } else if (t < hTf) { hTf = t; hNf = n; }
}
// A plane with normal n through point q.
void hPq(vec3 ro, vec3 rd, vec3 n, vec3 q) { n = normalize(n); hPl(ro, rd, n, dot(n, q)); }
// A box at c, half size h, its twelve edges cut back by e: the cuts catch the light as rounded edges do.
void hBox(vec3 ro, vec3 rd, vec3 c, vec3 h, float e) {
  vec3 o = ro - c;
  hPl(o, rd, vec3(1.0, 0.0, 0.0), h.x); hPl(o, rd, vec3(-1.0, 0.0, 0.0), h.x);
  hPl(o, rd, vec3(0.0, 1.0, 0.0), h.y); hPl(o, rd, vec3(0.0, -1.0, 0.0), h.y);
  hPl(o, rd, vec3(0.0, 0.0, 1.0), h.z); hPl(o, rd, vec3(0.0, 0.0, -1.0), h.z);
  if (e <= 0.0) return;
  const float R = 0.70710678;
  for (int i = 0; i < 4; i++) {
    vec2 g = vec2(i % 2 == 0 ? 1.0 : -1.0, i < 2 ? 1.0 : -1.0);
    hPl(o, rd, vec3(g.x, g.y, 0.0) * R, (h.x + h.y - e) * R);
    hPl(o, rd, vec3(g.x, 0.0, g.y) * R, (h.x + h.z - e) * R);
    hPl(o, rd, vec3(0.0, g.x, g.y) * R, (h.y + h.z - e) * R);
  }
}
// True when the held entry lies on a wheel arch's cut face.
bool gHCut = false;
// Cuts a wheel arch out of the held hull: a cylinder across the body, at (y, z) c, radius r.
// Each side's cut stops at x0 from the centre, where the well's liner stands.
void hCut(vec3 ro, vec3 rd, vec2 c, float r, float x0) {
  vec2 o = ro.yz - c, d = rd.yz;
  float A = dot(d, d), B = dot(o, d), D = B * B - A * (dot(o, o) - r * r);
  if (D <= 0.0 || A < 1e-9) return;
  float t0 = (-B - sqrt(D)) / A, t1 = (-B + sqrt(D)) / A;
  for (int k = 0; k < 2; k++) {
    float s = k == 0 ? 1.0 : -1.0, dx = s * rd.x, tx = (x0 - s * ro.x) / (abs(dx) > 1e-9 ? dx : 1e-9);
    float a = t0, b = t1;
    if (dx > 0.0) a = max(a, tx); else b = min(b, tx);
    if (a >= b || hTn < a || hTn >= b) continue;
    // The entry falls inside the cut: the ray enters where it leaves the cut.
    hTn = b;
    gHCut = true;
    hN = b < t1 ? vec3(s, 0.0, 0.0) : vec3(0.0, -(o + d * b) / r);
  }
}
// Closes a hull: a nearer hit replaces the one held.
// An entry on a cut face is the wheel well (id 8).
void hEnd(int myId, inout float t, inout vec3 n, inout int id) {
  bool cut = gHCut;
  gHCut = false;
  if (hTn > hTf || hTn <= 0.0 || hTn >= t) return;
  t = hTn; n = hN; id = cut ? 8 : myId; gHitK = 1.0;
  if (myId == 2) { gExT = hTf; gExN = hNf; }
}
// True when the ray meets the box at c, half size h, nearer than t.
// Most rays miss most parts: this cheap test skips their planes.
bool vSlab(vec3 ro, vec3 rd, vec3 c, vec3 h, float t) {
  vec3 inv = 1.0 / rd, ta = (c - h - ro) * inv, tb = (c + h - ro) * inv;
  vec3 mn = min(ta, tb), mx = max(ta, tb);
  float t0 = max(max(mn.x, mn.y), mn.z), t1 = min(min(mx.x, mx.y), mx.z);
  return t1 >= max(t0, 0.0) && t0 < t;
}
// A capsule from a to b, radius r0.
// One thinner than a pixel is traced a pixel wide and covers only its share, as vRod.
void vCap(vec3 ro, vec3 rd, vec3 a, vec3 b, float r0, int myId, inout float t, inout vec3 n, inout int id) {
  float r = max(r0, gPxW * 0.6);
  vec3 ba = b - a, oa = ro - a;
  float baba = dot(ba, ba), bard = dot(ba, rd), baoa = dot(ba, oa), rdoa = dot(rd, oa), oaoa = dot(oa, oa);
  float A = baba - bard * bard, B = baba * rdoa - baoa * bard, C = baba * oaoa - baoa * baoa - r * r * baba, D = B * B - A * C;
  if (D < 0.0) return;
  float tc = (-B - sqrt(D)) / A, y = baoa + tc * bard;
  // The body; else the cap at the nearer end.
  if (y <= 0.0 || y >= baba) {
    vec3 oc = y <= 0.0 ? oa : ro - b;
    float b2 = dot(rd, oc), c2 = dot(oc, oc) - r * r, h2 = b2 * b2 - c2;
    if (h2 < 0.0) return;
    tc = -b2 - sqrt(h2);
  }
  if (tc <= 0.0 || tc >= t) return;
  vec3 p = ro + rd * tc, q = p - a;
  t = tc; n = normalize(q - ba * clamp(dot(q, ba) / baba, 0.0, 1.0)); id = myId; gHitK = r0 / r;
}
// A dish: a spherical cap, vertex v, facing along axis ax, rim radius rr, sphere radius rs.
// The concave face is id 15, the back 16.
void vDish(vec3 ro, vec3 rd, vec3 v, vec3 ax, float rr, float rs, inout float t, inout vec3 n, inout int id) {
  vec3 cs = v + ax * rs, oc = ro - cs;
  float b = dot(rd, oc), h = b * b - dot(oc, oc) + rs * rs;
  if (h < 0.0) return;
  h = sqrt(h);
  float ca = sqrt(1.0 - rr * rr / (rs * rs));
  for (int k = 0; k < 2; k++) {
    float tk = k == 0 ? -b - h : -b + h;
    if (tk <= 0.0 || tk >= t) continue;
    vec3 q = (ro + rd * tk - cs) / rs;
    if (dot(q, -ax) < ca) continue;
    // The back faces out of the sphere; the concave face looks in.
    bool back = dot(q, rd) < 0.0;
    t = tk; n = back ? q : -q; id = back ? 16 : 15; gHitK = 1.0;
    return;
  }
}
// A plain box, its edges cut back by e.
void vBox(vec3 ro, vec3 rd, vec3 c, vec3 h, float e, int myId, inout float t, inout vec3 n, inout int id) {
  hBeg(); hBox(ro, rd, c, h, e); hEnd(myId, t, n, id);
}
// A ray against a wheel: a cylinder across the vehicle, at height and place c (y, z), radius r, half width w at x.
// The outer disc shows the rim (id 11) inside the tyre (id 9).
void vWheel(vec3 ro, vec3 rd, vec2 c, float r, float x, float w, inout float t, inout vec3 n, inout int id) {
  vec2 o = ro.yz - c, d = rd.yz;
  float A = dot(d, d), B = dot(o, d), C = dot(o, o) - r * r, D = B * B - A * C;
  if (D < 0.0 || A < 1e-8) return;
  float tn = (-B - sqrt(D)) / A;
  if (tn < 0.0 || tn >= t) return;
  float hx = ro.x + rd.x * tn;
  if (abs(hx - x) > w) {
    // The tyre's side face: a disc at x +- w.
    float tx = (x - sign(rd.x) * w - ro.x) / rd.x;
    vec2 q = ro.yz + rd.yz * tx - c;
    if (tx < 0.0 || tx >= t || dot(q, q) > r * r) return;
    t = tx; n = vec3(-sign(rd.x), 0.0, 0.0); id = length(q) < r * 0.62 ? 11 : 9; gHitK = 1.0;
    return;
  }
  t = tn; n = vec3(0.0, normalize(o + d * tn)); id = 9; gHitK = 1.0;
}
// A thin upright rod at (x, z), radius r, from y0 to y1.
// A rod thinner than a pixel is traced a pixel wide and covers only its share: no sparkle.
void vRod(vec3 ro, vec3 rd, vec2 c, float r0, float y0, float y1, int myId, inout float t, inout vec3 n, inout int id) {
  float r = max(r0, gPxW * 0.6);
  vec2 o = ro.xz - c, d = rd.xz;
  float A = dot(d, d);
  if (A < 1e-9) return;
  // From the ray's closest approach: the usual quadratic loses a thin rod to rounding far off.
  float tc = -dot(o, d) / A;
  vec2 m = o + d * tc;
  float D = r * r - dot(m, m);
  if (D < 0.0) return;
  float tn = tc - sqrt(D / A), y = ro.y + rd.y * tn;
  if (tn <= 0.0 || tn >= t || y < y0 || y > y1) return;
  vec2 q = o + d * tn;
  t = tn; n = normalize(vec3(q.x, 0.0, q.y)); id = myId; gHitK = r0 / r;
}
// Each kind's shape: half width, belt line, roof, front, rear; the wheels' radius, place and track.
// The pickup is a full-size crew cab: 5.95 m long, 2 m wide, 1.94 m tall, a 3.68 m wheelbase.
float vHW(int k) { return k == 1 ? 0.95 : 1.0; }
float vBelt(int k) { return k == 0 ? 1.32 : k == 1 ? 1.1 : 1.2; }
float vRoof(int k) { return k == 0 ? 1.94 : k == 1 ? 1.76 : 2.35; }
float vFront(int k) { return k == 0 ? 2.93 : k == 1 ? 2.47 : 2.75; }
float vRear(int k) { return k == 0 ? -3.02 : k == 1 ? -2.43 : -2.77; }
vec4 vWh(int k) { return k == 0 ? vec4(0.4, 1.84, 0.86, 0.14) : k == 1 ? vec4(0.38, 1.45, 0.8, 0.14) : vec4(0.38, 1.8, 0.84, 0.14); }
// The axles' mid point along the body.
float vWz(int k) { return k == 0 ? -0.04 : 0.0; }
// The windshield: a plane through the hood's back edge (y, z) with normal (0, ny, nz).
vec4 vWs(int k) { return k == 0 ? vec4(1.32, 0.92, 0.802, 0.597) : k == 1 ? vec4(1.08, 1.07, 0.75, 0.66) : vec4(1.15, 1.77, 0.55, 0.83); }
// The vehicle's parts, in its own frame: x across (right), y up, z forward. Returns the hit part's id.
// ids: 1 hood and nose, 2 cabin and body, 3 black trim, 4 amber bar, 5 bright metal, 9 tyre, 10 bed liner,
// 11 rim, 12 white plastic.
int vHit(int kind, vec3 ro, vec3 rd, out float t, out vec3 n, float spin) {
  t = 1e9; n = vec3(0.0, 1.0, 0.0);
  int id = 0;
  ivec4 r = VK[kind];
  vec4 ar = VA[kind];
  // The hulls: a box with cut edges, more planes, the wheel arches cut out.
  for (int i = 0; i < ${MAX_HULLS}; i++) {
    if (i >= r.y) break;
    int j = (r.x + i) * 3;
    vec4 a = VH[j], b = VH[j + 1], c = VH[j + 2];
    if (!vSlab(ro, rd, a.xyz, b.xyz, t)) continue;
    hBeg(); hBox(ro, rd, a.xyz, b.xyz, a.w);
    int p0 = int(c.x), np = int(c.y), cut = int(c.z);
    for (int k = 0; k < ${MAX_PLANES}; k++) {
      if (k >= np) break;
      vec4 pl = VP[p0 + k];
      hPl(ro, rd, pl.xyz, pl.w);
    }
    if ((cut & 1) != 0) hCut(ro, rd, ar.xy, ar.w, VAX[kind]);
    if ((cut & 2) != 0) hCut(ro, rd, ar.xz, ar.w, VAX[kind]);
    hEnd(int(b.w + 0.5), t, n, id);
  }
  // The small parts: plain boxes.
  for (int i = 0; i < ${MAX_BOXES}; i++) {
    if (i >= r.w) break;
    int j = (r.z + i) * 2;
    vec4 a = VB[j], b = VB[j + 1];
    if (!vSlab(ro, rd, a.xyz, b.xyz, t)) continue;
    vBox(ro, rd, a.xyz, b.xyz, a.w, int(b.w + 0.5), t, n, id);
  }
  // The chasers' masts, aerials and spinning cups.
  if (kind == 1) {
    vRod(ro, rd, vec2(0.55, -2.0), 0.018, 1.7, 2.62, 5, t, n, id);
    vRod(ro, rd, vec2(-0.7, -2.2), 0.006, 1.6, 2.75, 3, t, n, id);
    vRod(ro, rd, vec2(-0.5, -2.2), 0.006, 1.6, 2.6, 3, t, n, id);
  } else if (kind == 2) {
    vRod(ro, rd, vec2(0.0, -2.2), 0.035, 2.35, 3.68, 5, t, n, id);
    vRod(ro, rd, vec2(0.46, -2.2), 0.01, 3.62, 3.74, 5, t, n, id);
    // A dish on a post: it looks up and out to the right.
    vec3 dv = vec3(0.0, 2.8, -1.6), dx = normalize(vec3(0.55, 0.8, 0.15));
    if (vSlab(ro, rd, vec3(0.1, 2.8, -1.6), vec3(0.5, 0.45, 0.5), t)) {
      vDish(ro, rd, dv, dx, 0.42, 0.9, t, n, id);
      // The feed arm from the rim's foot to the feed horn at the focus.
      vec3 dn = normalize(vec3(0.0, -1.0, 0.0) - dx * dot(vec3(0.0, -1.0, 0.0), dx)), fo = dv + dx * 0.45;
      vCap(ro, rd, dv + dx * 0.1 + dn * 0.4, fo, 0.018, 12, t, n, id);
      vCap(ro, rd, fo - dx * 0.03, fo + dx * 0.04, 0.035, 12, t, n, id);
      vBox(ro, rd, vec3(0.0, 2.72, -1.6), vec3(0.08, 0.06, 0.08), 0.02, 3, t, n, id);
    }
    vRod(ro, rd, vec2(0.0, -1.6), 0.03, 2.43, 2.68, 5, t, n, id);
  }
  if (kind != 0) {
    // A cup anemometer: on the wagon's short mast, or one end of the van's cross-arm.
    vec3 cc = kind == 1 ? vec3(0.55, 2.63, -2.0) : vec3(0.46, 3.74, -2.2);
    float cr = kind == 1 ? 0.11 : 0.12, cs = kind == 1 ? 0.025 : 0.028;
    for (int k = 0; k < 3; k++) {
      float a = spin + float(k) * 2.0944;
      vBox(ro, rd, cc + vec3(cr * cos(a), 0.0, cr * sin(a)), vec3(cs), cs * 0.43, 3, t, n, id);
    }
  }
  vec4 wh = vWh(kind);
  for (int k = 0; k < 4; k++) {
    float wz = (k < 2 ? 1.0 : -1.0) * wh.y + vWz(kind), wx = (k % 2 == 0 ? 1.0 : -1.0) * wh.z;
    vWheel(ro, rd, vec2(wh.x, wz), wh.x, wx, wh.w, t, n, id);
  }
  return t < 1e8 ? id : 0;
}
// The part a body hit lands on: paint, glass, a lamp lens, grille or a wheel well.
// Returns 2 glass, 6 head lamp, 7 tail lamp, 8 wheel well, 10 grille, 3 trim; else the id it was given.
// The pickup's parts: 14 is mirror glass.
int vPartP(int id, vec3 h, vec3 nl) {
  // The mirror's glass faces back.
  if (id == 3 && abs(h.x) > 1.08 && h.y > 1.35 && nl.z < -0.6) return 14;
  if (id != 1 && id != 2) return id;
  // Paint is 1 on every body panel; only glass is 2.
  // A black flare round each wheel arch.
  if (abs(nl.x) > 0.5 && h.y > 0.36 && h.y < 1.0) {
    float dw = min(length(h.yz - vec2(0.4, 1.8)), length(h.yz - vec2(0.4, -1.88)));
    if (dw < 0.585) return 3;
  }
  // The front: tall lamps at the corners, a big grille between them.
  if (nl.z > 0.5 && h.z > 2.6) {
    float ax = abs(h.x);
    if (ax > 0.6 && ax < 0.95 && h.y > 0.9 + 0.12 * smoothstep(0.75, 0.6, ax) && h.y < 1.15) return 6;
    if (ax < 0.57 && h.y > 0.64 && h.y < 1.15) return 10;
    return 1;
  }
  // The back: tall tail lamps at the bed's corners.
  if (nl.z < -0.5 && h.z < -2.8) return abs(h.x) > 0.85 && h.y > 0.86 && h.y < 1.28 ? 7 : 1;
  if (id != 2 || h.y < 1.35 || h.y > 1.86 || nl.y > 0.85) return 1;
  // The windshield, between its pillars.
  float dWs = 0.92 - 1.344 * (h.y - 1.32) - h.z;
  if (dWs < 0.03 && nl.z > 0.3) return abs(h.x) < 0.84 - (h.y - 1.32) * 0.2 ? 2 : 1;
  // Two door windows each side; the B pillar and the C pillar split them.
  if (abs(nl.x) > 0.5) return dWs > 0.09 && h.z > -1.26 && abs(h.z + 0.25) > 0.06 ? 2 : 1;
  // The rear window.
  if (nl.z < -0.3) return abs(h.x) < 0.76 && h.y > 1.4 && h.y < 1.84 ? 2 : 1;
  return 1;
}
// The wagon's parts: black cladding along the sills, glass all round.
int vPartW(int id, vec3 h, vec3 nl) {
  if (id == 3 && abs(h.x) > 0.98 && h.y > 1.12 && nl.z < -0.6) return 14;
  if (id != 1 && id != 2) return id;
  if (abs(nl.x) > 0.5 && h.y > 0.34 && h.y < 0.95) {
    float dw = min(length(h.yz - vec2(0.38, 1.45)), length(h.yz - vec2(0.38, -1.45)));
    if (dw < 0.54) return 3;
  }
  if (abs(nl.x) > 0.3 && h.y < 0.5) return 3;
  // The front: lamps at the corners, a grille between them.
  if (nl.z > 0.5 && h.z > 2.2) {
    float ax = abs(h.x);
    if (ax > 0.5 && ax < 0.86 && h.y > 0.78 && h.y < 0.94) return 6;
    if (ax < 0.47 && h.y > 0.56 && h.y < 0.9) return 10;
    return 1;
  }
  // The back: tail lamps at the corners, the hatch's glass between them.
  if (nl.z < -0.5 && h.z < -2.2) {
    if (abs(h.x) > 0.7 && h.y > 0.92 && h.y < 1.3) return 7;
    return abs(h.x) < 0.68 && h.y > 1.2 && h.y < 1.66 ? 2 : 1;
  }
  if (id != 2 || h.y < 1.12 || h.y > 1.7 || nl.y > 0.85) return 1;
  vec4 ws = vWs(1);
  float dWs = -dot(ws.zw, vec2(h.y - ws.x, h.z - ws.y));
  if (dWs < 0.03 && nl.z > 0.3) return abs(h.x) < 0.78 - (h.y - 1.1) * 0.25 ? 2 : 1;
  // Three windows each side; the B, C and D pillars split them.
  if (abs(nl.x) > 0.5) return dWs > 0.09 && h.z > -2.12 && abs(h.z + 0.25) > 0.06 && abs(h.z + 1.5) > 0.07 ? 2 : 1;
  return 1;
}
// The van's parts: glass only in the cab and the rear doors.
int vPartV(int id, vec3 h, vec3 nl) {
  if (id == 3 && abs(h.x) > 1.04 && h.y > 1.34 && nl.z < -0.6) return 14;
  if (id != 1 && id != 2) return id;
  if (abs(nl.x) > 0.5 && h.y > 0.34 && h.y < 0.95) {
    float dw = min(length(h.yz - vec2(0.38, 1.8)), length(h.yz - vec2(0.38, -1.8)));
    if (dw < 0.55) return 3;
  }
  if (nl.z > 0.45 && h.z > 2.35 && h.y < 1.0) {
    float ax = abs(h.x);
    if (ax > 0.56 && ax < 0.9 && h.y > 0.72 && h.y < 0.9) return 6;
    if (ax < 0.53 && h.y > 0.5 && h.y < 0.85) return 10;
    return 1;
  }
  // The back: tall tail lamps, a window in each rear door.
  if (nl.z < -0.5 && h.z < -2.6) {
    float ax = abs(h.x);
    if (ax > 0.86 && h.y > 0.72 && h.y < 1.5) return 7;
    return ax > 0.05 && ax < 0.8 && h.y > 1.45 && h.y < 2.05 ? 2 : 1;
  }
  if (id != 2 || h.y < 1.22 || h.y > 2.2 || nl.y > 0.85) return 1;
  vec4 ws = vWs(2);
  float dWs = -dot(ws.zw, vec2(h.y - ws.x, h.z - ws.y));
  // The high roof's cap stands over the windshield.
  if (dWs < 0.03 && nl.z > 0.3) return abs(h.x) < 0.86 && h.y < 2.08 ? 2 : 1;
  if (abs(nl.x) > 0.5) return dWs > 0.09 && h.z > 0.72 && h.y < 1.98 ? 2 : 1;
  return 1;
}
int vPart(int id, int kind, vec3 h, vec3 nl) {
  return kind == 0 ? vPartP(id, h, nl) : kind == 1 ? vPartW(id, h, nl) : vPartV(id, h, nl);
}
// The share of sun a hit gets past the vehicle's own parts; the speed and age for the wheels.
float gSh = 1.0, gSpd = 0.0, gAge = 0.0;
// The sun's light off one GGX layer, per unit of the sun's light on the face.
// Smith visibility and Schlick Fresnel; the diffuse term carries no 1/pi, so this takes pi.
vec3 vLobe(vec3 N, vec3 V, vec3 L, float r, vec3 f0) {
  vec3 H = normalize(L + V);
  float nl = max(dot(N, L), 0.0), nv = max(dot(N, V), 1e-3), nh = max(dot(N, H), 0.0);
  // The sun is a disc, and a sharp lobe sparkles: roughness stays above 0.16.
  float rr = max(r, 0.16), k = rr * rr * 0.5;
  float vis = 0.25 / ((nl * (1.0 - k) + k) * (nv * (1.0 - k) + k));
  vec3 F = f0 + (1.0 - f0) * pow(1.0 - max(dot(V, H), 0.0), 5.0);
  return F * min(ggx(nh, rr) * vis, 12.0) * 3.14159 * nl;
}
// The colour of a hit, in world space. N is the world normal; h and nl the hit and normal in the vehicle's frame.
// see is 1 where the glass looks out through the far window: the world behind shows, dimmed by two panes.
vec3 vShade(int id, int kind, vec3 P, vec3 N, vec3 V, vec3 h, vec3 nl, float seed, float brake, float see) {
  // A shading normal never faces away from the eye: edge-on rows would reflect the ground.
  N = normalize(N + V * max(0.08 - dot(N, V), 0.0));
  float sun = (1.0 - sunCover(P * 0.001)) * gSh;
  vec3 L = normalize(uSun + vec3(0.0, 1e-3, 0.0)), H = normalize(L + V);
  float nlight = max(dot(N, L), 0.0), nv = max(dot(N, V), 0.05);
  // Paint: a faded white pickup, a dark green wagon, a white van.
  // A soft pigment layer under a clear coat: the coat holds the sky.
  vec3 paint = kind == 0 ? vec3(0.55, 0.54, 0.5) : kind == 1 ? vec3(0.05, 0.085, 0.07) : vec3(0.62, 0.62, 0.6);
  vec3 alb = paint, f0 = vec3(0.04), em = vec3(0.0);
  float rough = 0.45, coat = 1.0, cr = mix(0.14, 0.07, uRain);
  if (id == 2) {
    // Glass: the dim cab inside, and the sky in a strong Fresnel.
    alb = vec3(0.012); rough = 0.04;
    // The van's hail guard: a mesh of bars over the windshield.
    if (kind == 2 && nl.z > 0.3) {
      float bar = max(step(0.82, fract(h.x * 9.0)), step(0.8, fract(h.y * 7.0)));
      if (bar > 0.0) { alb = vec3(0.02); rough = 0.5; f0 = vec3(0.04); }
    }
  }
  // Black plastic and rubber reflect little: low sun must not turn them tan.
  if (id == 3) { alb = vec3(0.025); f0 = vec3(0.03); rough = 0.55; }
  // Chrome on the pickup; brushed aluminium on the chasers' masts.
  if (id == 5) { alb = vec3(0.0); f0 = vec3(0.72, 0.73, 0.75); rough = kind == 0 ? 0.14 : 0.35; }
  if (id == 6) { alb = vec3(0.05); f0 = vec3(0.3); rough = 0.05; em = vec3(1.0, 0.92, 0.8) * 4.0 * pow(max(nl.z, 0.0), 2.0); }
  if (id == 7) { alb = vec3(0.12, 0.01, 0.01); rough = 0.08; em = vec3(0.9, 0.04, 0.02) * (0.5 + 3.5 * brake) * pow(max(-nl.z, 0.0), 2.0); }
  if (id == 8) { alb = vec3(0.008); rough = 0.9; }
  if (id == 9) { alb = vec3(0.016); f0 = vec3(0.02); rough = 0.85; }
  if (id == 10) {
    // The grille: horizontal bars in a bright surround.
    float bar = step(0.55, fract(h.y * 16.0));
    float rim = step(vHW(kind) * 0.47, abs(h.x)) + step(kind == 2 ? 0.98 : 0.94, h.y);
    alb = mix(vec3(0.012), vec3(0.03), bar); rough = 0.4;
    if (rim > 0.0 && kind == 0) { alb = vec3(0.0); f0 = vec3(0.7); rough = 0.15; }
  }
  // The rims: bright alloy on the pickup, black steel on the chasers.
  if (id == 11) { alb = kind == 0 ? vec3(0.0) : vec3(0.03); f0 = kind == 0 ? vec3(0.62) : vec3(0.04); rough = 0.3; }
  if (id == 12) { alb = vec3(0.6, 0.6, 0.58); rough = 0.5; }
  // The bed liner: black textured plastic.
  if (id == 13) { alb = vec3(0.022); rough = 0.8; }
  // The dish: white fibreglass, its back a little greyer.
  if (id == 15 || id == 16) { alb = vec3(id == 15 ? 0.6 : 0.5); rough = 0.55; }
  // The mirror's glass.
  if (id == 14) { alb = vec3(0.0); f0 = vec3(0.85); rough = 0.03; }
  vec4 wh = vWh(kind);
  float wz = h.z > vWz(kind) ? wh.y + vWz(kind) : -wh.y + vWz(kind);
  vec2 q = vec2(h.y - wh.x, h.z - wz);
  float qr = length(q) / wh.x;
  if (id == 11) {
    // Six spokes; at speed they blur to their mean.
    float a = atan(q.y, q.x) - gAge * gSpd / wh.x;
    float sp = smoothstep(-0.2, 0.3, cos(6.0 * a)), blur = clamp(1.0 - gSpd * 0.07, 0.0, 1.0);
    sp = mix(0.55, sp, blur);
    // The lip and the hub are solid.
    sp = max(sp, step(0.5, qr) + step(qr, 0.12));
    // Bright alloy on the pickup, dark grey alloy on the chasers.
    alb = mix(vec3(0.012), vec3(0.0), sp); f0 = mix(vec3(0.02), vec3(kind == 0 ? 0.6 : 0.2), sp); rough = mix(0.8, 0.3, sp);
  }
  if (id == 9) {
    // Tread: grooves run round the tyre; the sidewall bulges a little.
    float u = (abs(h.x) - wh.z) / wh.w;
    if (abs(nl.x) < 0.5) alb *= 1.0 - 0.6 * (1.0 - smoothstep(0.03, 0.09, abs(abs(u) - 0.4)));
    else alb *= 1.0 + 0.5 * smoothstep(0.75, 0.85, qr) * smoothstep(1.0, 0.9, qr);
  }
  // Door cuts, the handles, the doors' lower edge and the hood's front seam.
  // Each kind: three door cuts along z, two handles, the handles' height, the hood seam.
  vec3 dz = kind == 0 ? vec3(0.86, -0.25, -1.3) : kind == 1 ? vec3(0.98, -0.25, -1.45) : vec3(1.62, 0.66, h.x > 0.0 ? -0.75 : 0.66);
  vec2 hz = kind == 0 ? vec2(0.02, -1.12) : kind == 1 ? vec2(0.15, -1.1) : vec2(0.85, h.x > 0.0 ? 0.5 : 0.85);
  float hy = kind == 0 ? 1.2 : kind == 1 ? 1.02 : 1.12, hs = kind == 0 ? 2.7 : kind == 1 ? 2.3 : 2.58;
  if ((id == 1 || id == 2) && abs(nl.x) > 0.5) {
    float sz = min(min(abs(h.z - dz.x), abs(h.z - dz.y)), abs(h.z - dz.z));
    float seam = 1.0 - (1.0 - smoothstep(0.003, 0.011, sz)) * step(0.5, h.y) * step(h.z, dz.x + 0.04) * step(dz.z - 0.04, h.z);
    seam *= 1.0 - (1.0 - smoothstep(0.003, 0.011, abs(h.y - 0.53))) * step(dz.z, h.z) * step(h.z, dz.x);
    float hd = max(1.0 - smoothstep(0.0, 0.01, max(abs(h.y - hy) - 0.018, abs(h.z - hz.x) - 0.1)), 1.0 - smoothstep(0.0, 0.01, max(abs(h.y - hy) - 0.018, abs(h.z - hz.y) - 0.1)));
    alb *= mix(0.4, 1.0, seam) * (1.0 - 0.5 * hd);
  }
  if (id == 1 && nl.y > 0.6) alb *= mix(0.4, 1.0, smoothstep(0.003, 0.011, abs(h.z - hs)));
  // The van's rear doors meet at the middle.
  if (kind == 2 && id == 1 && nl.z < -0.5) alb *= mix(0.4, 1.0, smoothstep(0.003, 0.011, abs(h.x)));
  if (id == 10 && kind == 0) {
    // A chrome frame and a centre bar round a fine dark mesh.
    float fr = max(max(step(0.51, abs(h.x)), step(1.1, h.y)), max(step(h.y, 0.69), step(abs(h.y - 0.9), 0.025)));
    float mesh = step(0.45, fract(h.y * 24.0)) * step(0.35, fract(h.x * 14.0 + step(0.5, fract(h.y * 12.0)) * 0.5));
    alb = mix(vec3(0.008), vec3(0.03), mesh); f0 = vec3(0.04); rough = 0.5;
    if (fr > 0.0) { alb = vec3(0.0); f0 = vec3(0.7); rough = 0.15; }
  }
  // The lower body takes road grime; under the storm it is wet and darker.
  float grime = smoothstep(kind == 0 ? 0.7 : 0.8, 0.42, h.y) * (0.55 + 0.25 * uRain);
  if (id == 1 || id == 2) alb = mix(alb, vec3(0.12, 0.1, 0.075), grime);
  // Only paint has the coat; grime dulls it.
  coat = id == 1 ? 1.0 - grime * 0.8 : 0.0;
  // Rain wets every surface: rougher ones gloss up the most.
  rough = mix(rough, rough * 0.6, uRain);
  // The underside and the wheel wells see little sky.
  float ao = mix(0.35, 1.0, smoothstep(-0.6, 0.3, nl.y)) * mix(0.55, 1.0, smoothstep(0.3, 0.75, h.y));
  // Split-sum light: the sky's reflection and its share, for the base and the coat.
  vec3 R = reflect(-V, N), env = lineEnv(R), E = uSunCol * 0.9 * sun;
  vec2 ab = envBRDF(rough, nv), ac = envBRDF(cr, nv);
  vec3 Fe = f0 * ab.x + ab.y;
  float Fc = (0.04 * ac.x + ac.y) * coat;
  // The diffuse layer takes only the light the specular layer passes.
  vec3 c = alb * (1.0 - Fe) * (E * nlight + uAmb * (0.45 + 0.25 * N.y) * ao);
  c += env * Fe * ao + E * vLobe(N, V, L, rough, f0);
  // The clear coat on top: it passes what it does not reflect.
  c = c * (1.0 - Fc) + env * ao * Fc + E * vLobe(N, V, L, cr, vec3(0.04)) * coat;
  // What lies behind: the bright haze at the horizon, dark ground below it, the deck above.
  vec3 back = mix(hazeCol(-V) * mix(1.0, 0.25, smoothstep(0.0, 0.2, -V.y)), uAmb * 0.03, smoothstep(0.0, -0.04, -V.y));
  // The wagon's rear glass is privacy-tinted.
  // The pickup's rear glass is tinted too; every cab is dim, not black.
  if (id == 2) c += back * see * (kind == 1 ? 0.12 : kind == 0 ? 0.16 : 0.35) * (1.0 - ab.x * 0.04 - ab.y);
  if (id == 2) c += vec3(0.05, 0.045, 0.04) * (uAmb * 0.5 + uSunCol * 0.3 * sun) * (1.0 - see) * (1.0 - ab.y);
  return c + em;
}
// A lamp's glow: a point of light at P facing along dir, of colour col.
// The lens's ghosts: place along the line from the frame's centre through the lamp,
// radius as a share of the frame's height, and the coating's tint.
const float GT[5] = float[](-0.35, -0.7, -1.05, 0.45, -1.5);
const float GR[5] = float[](0.012, 0.03, 0.018, 0.022, 0.055);
const vec3 GC[5] = vec3[](vec3(0.7, 1.0, 0.75), vec3(1.0, 0.6, 0.85), vec3(0.75, 0.85, 1.0), vec3(1.0, 0.85, 0.55), vec3(0.6, 0.9, 1.0));
// tw is 1 when far lamps twinkle; 0 under reduced motion.
void vLamp(vec2 s, vec3 P, vec3 dir, vec3 col, float px, float seed, float tw) {
  float z = depthOf(P);
  if (z < 0.5) return;
  vec3 toEye = normalize(vec3(0.0, CAMH, 0.0) - P);
  float face = pow(max(dot(dir, toEye), 0.0), 3.0);
  if (face <= 0.0) return;
  // The lamp grows brighter as it closes in.
  float k = face * clamp(60.0 / z, 0.25, 3.0);
  // Far off, hot air over the road bends the beam: the lamp twinkles in and out.
  float sh = vn(vec2(uT * 3.1 + seed * 17.0, seed * 5.3)) * 0.65 + vn(vec2(uT * 8.3 + seed * 3.0, seed * 11.0 + 3.0)) * 0.35;
  k *= mix(1.0, smoothstep(0.3, 0.7, sh) * 1.6, smoothstep(80.0, 400.0, z) * tw);
  // A hot core as wide as the lamp, and a bloom a few pixels round it: the lens's, not the air's.
  vec2 lp = proj(P);
  float d = length(s - lp), dp = d / px;
  float core = exp(-pow(d / (px * 0.9 + 0.09 / z * uFoc), 2.0));
  gVehGlow += col * k * (core * 5.0 + 0.5 * exp(-dp / 5.0) + 0.05 * exp(-dp / 30.0));
  // Only a bright lamp throws ghosts: soft discs with a brighter rim, never a hard edge.
  float g = k * face - 0.3;
  if (g <= 0.0) return;
  vec2 cc = vec2(0.0, 0.5 - uHz), a = lp - cc;
  for (int i = 0; i < 5; i++) {
    float q = length(s - cc - a * GT[i]) / GR[i];
    if (q > 1.0) continue;
    float disc = smoothstep(1.0, 0.6, q) * (0.55 + 0.45 * smoothstep(0.3, 0.9, q));
    gVehGlow += col * GC[i] * disc * min(g, 2.5) * 0.03;
  }
}
// The spray behind the vehicle: a plume off each rear wheel.
// On a wet road it is bright mist lit by the sky and the tail lamps; on a dry one, thin dust.
void vSpray(vec2 s, vec3 C, vec3 f, vec3 rt, int kind, float spd, float age, float seed, float brake) {
  float rear = -vRear(kind), hw = vHW(kind), wet = uRain;
  // A rough screen box round the whole plume.
  vec3 Pm = C - f * (rear + 4.0 + spd * 0.15);
  float zm = depthOf(Pm);
  if (zm < 0.5 || length(s - proj(Pm + vec3(0.0, 0.8, 0.0))) > (7.0 + spd * 0.25) / zm * uFoc) return;
  float sun = 1.0 - sunCover(C * 0.001);
  vec3 mist = vec3(0.6, 0.62, 0.65) * (uAmb * 0.95 + uSunCol * 0.25 * sun);
  vec3 dust = mix(vec3(0.3, 0.25, 0.19), vec3(0.4), 0.3) * (uSunCol * 0.4 * sun + uAmb * 0.6);
  for (int k = 0; k < 12; k++) {
    float fk = float(k >> 1), sd = (k & 1) == 0 ? 1.0 : -1.0;
    float back = rear + 0.4 + fk * (1.1 + spd * 0.05);
    // The plume climbs and spreads out as it falls behind; the wind takes it.
    float side = hw - 0.15 + fk * (0.12 + 0.2 * wet);
    vec3 Pp = C - f * back + rt * sd * side + vec3(0.0, 0.25 + fk * (0.14 + 0.06 * wet), 0.0) + vec3(WDIR.x, 0.0, WDIR.y) * fk * 0.45;
    float zp = depthOf(Pp);
    if (zp < 0.5) continue;
    float rp = (0.4 + 0.32 * fk) * (1.0 + 0.4 * wet) / zp * uFoc;
    vec2 q = (s - proj(Pp)) / rp;
    float d = length(q);
    if (d > 1.0) continue;
    // Streaks in the spray run back along the vehicle's path.
    float n = vn(q * vec2(2.3, 1.3) + vec2(fk * 3.1 + age * 0.9 * spd * 0.1, seed * 9.0 + sd));
    float al = mix(0.05, 0.5, wet) * (1.0 - fk / 6.0) * smoothstep(1.0, 0.2, d) * (0.45 + 0.7 * n) * smoothstep(3.0, 20.0, spd);
    if (al <= 0.0) continue;
    // The tail lamps light the near spray red; harder under the brakes.
    vec3 col = mix(dust, mist, wet) + vec3(0.9, 0.05, 0.02) * (0.08 + 0.5 * brake) * exp(-fk * 0.6);
    // hazed() sets up the pixel's air on its first call: it takes the pixel's own ray.
    put(hazed(col, toWorld(normalize(vec3(s, -uFoc))), zp), al, zp);
  }
}
// The panels are not flat: a shading normal gives them their curves.
// The sides roll in at the shoulder and tuck under low down; a crease runs along the pickup's waist.
// The hood and roof crown; the pickup hood's raised centre catches the light at its edges.
vec3 vBend(vec3 h, vec3 n, int id, int kind) {
  if (id != 1 && id != 2) return n;
  if (kind != 0) {
    float belt = vBelt(kind);
    if (abs(n.x) > 0.6 && h.y < belt + 0.05) {
      n.y += smoothstep(belt - 0.25, belt, h.y) * 0.22 - smoothstep(0.7, 0.45, h.y) * 0.25;
      n.z += sin(h.z * 1.7) * 0.03;
    } else if (abs(n.x) > 0.6) n.y += (h.y - (belt + vRoof(kind)) * 0.5) * 0.06;
    else if (n.y > 0.6) n.x += h.x * 0.08;
    return normalize(n);
  }
  if (abs(n.x) > 0.6 && h.y < 1.34) {
    n.y += smoothstep(1.1, 1.32, h.y) * 0.3 + smoothstep(1.06, 1.08, h.y) * 0.07 - smoothstep(0.75, 0.48, h.y) * 0.3;
    // Each panel bows out a little along its length.
    n.z += sin(h.z * 1.7) * 0.03;
  } else if (n.y > 0.6) {
    n.x += h.x * 0.09;
    if (h.z > 0.9) { float ax = abs(h.x); n.x += sign(h.x) * (smoothstep(0.36, 0.44, ax) - smoothstep(0.44, 0.54, ax)) * 0.2; }
    else n.z -= (h.z + 0.6) * 0.06;
  } else if (n.z > 0.5) n.y += (h.y - 0.9) * 0.12;
  return normalize(n);
}
// One vehicle, ray-traced at several moments in the shutter, each at its own spot in the pixel.
// Edges take more samples, so silhouettes and panel lines stay smooth at any distance.
// Far vehicles draw before the infrastructure, near ones after it.
void vehicle(int i, vec2 s, vec3 rd, float px, bool near) {
  vec4 a = uVeh[i], b = uVehB[i], cV = uVehC[i];
  if (b.x <= 0.0) return;
  int kind = int(a.w + 0.5);
  float spd = abs(a.z), age = b.z, seed = b.y, brake = cV.x;
  vec3 C = vec3(a.x, 0.0, a.y);
  float z = depthOf(C + vec3(0.0, 1.0, 0.0));
  if (z < 0.3) return;
  // The heading: f forward, rt to the right.
  vec3 f = vec3(sin(b.w), 0.0, cos(b.w)), rt = vec3(-f.z, 0.0, f.x);
  float fr = vFront(kind), rr = vRear(kind), hw = vHW(kind);
  // The lamps: headlights ahead, tail lamps behind; the chasers' amber bar too.
  // Their glow reaches past the vehicle's screen box, so they come first, once per frame.
  if (!near) {
    float hy = kind == 2 ? 0.82 : 0.88;
    for (int k = 0; k < 2; k++) {
      float sx = k == 0 ? -1.0 : 1.0;
      vLamp(s, C + rt * sx * (hw - 0.22) + vec3(0.0, hy, 0.0) + f * (fr + 0.01), f, vec3(1.0, 0.9, 0.75), px, seed + sx * 7.0, cV.w);
      vLamp(s, C + rt * sx * (hw - 0.14) + vec3(0.0, kind == 0 ? 0.98 : 1.1, 0.0) + f * (rr - 0.01), -f, vec3(0.9, 0.06, 0.03) * (0.4 + 1.6 * brake), px, seed + sx * 9.0 + 2.0, cV.w);
      if (kind != 0) {
        // The amber bar flashes left and right in turn.
        float on = step(0.5, fract(uT * 1.6 + (sx > 0.0 ? 0.5 : 0.0)));
        vec3 Pb = C + rt * sx * 0.4 + vec3(0.0, kind == 1 ? 1.85 : 2.41, 0.0) + f * (kind == 1 ? 0.12 : 0.55);
        vLamp(s, Pb, normalize(vec3(0.0, 0.2, 0.0) - f), vec3(1.0, 0.45, 0.05) * on * 0.8, px, seed + 4.0, cV.w);
        vLamp(s, Pb, normalize(vec3(0.0, 0.2, 0.0) + f), vec3(1.0, 0.45, 0.05) * on * 0.8, px, seed + 5.0, cV.w);
      }
    }
  }
  if ((z > 60.0) == near) return;
  vec3 eye = vec3(0.0, CAMH, 0.0);
  float top = kind == 2 ? 3.8 : 2.8;
  // A short contact shadow under the vehicle, on the road.
  {
    float tg = CAMH / max(-rd.y, 1e-4);
    vec3 G = eye + rd * tg - C;
    vec2 q = vec2(dot(G, rt), dot(G, f) - (fr + rr) * 0.5) / vec2(hw + 0.2, (fr - rr) * 0.5 + 0.15);
    float k = (1.0 - smoothstep(0.55, 1.0, length(q))) * 0.45;
    if (rd.y < 0.0 && k > 0.0) put(vec3(0.004), k, depthOf(C));
    // The vehicle casts the low sun's long shadow on the road.
    if (rd.y < 0.0 && uSun.y > 0.0) {
      vec3 L = normalize(uSun), ls = vec3(dot(L, rt), L.y, dot(L, f));
      vec3 gl = vec3(dot(G, rt), 0.0, dot(G, f));
      // The vehicle's box first: most ground points see the sun past it.
      vec3 inv = 1.0 / ls, ta = (vec3(-hw - 0.32, 0.0, rr - 0.15) - gl) * inv, tb = (vec3(hw + 0.32, top, fr + 0.15) - gl) * inv;
      vec3 mn = min(ta, tb), mx = max(ta, tb);
      if (min(min(mx.x, mx.y), mx.z) > max(max(max(mn.x, mn.y), mn.z), 0.0)) {
        // Four rays over the pixel and the sun's disc: a soft, smooth edge.
        float zg = depthOf(G + C), fp = px * zg / uFoc / max(-rd.y, 0.05), sh = 0.0, t;
        vec3 n;
        // A thin rod casts a shadow at least a ground pixel wide.
        gPxW = fp;
        for (int j = 0; j < 4; j++) {
          vec2 o = (vec2(float(j & 1), float(j >> 1)) - 0.5) * 0.5;
          vec3 lj = normalize(ls + vec3(o.x, 0.0, o.y) * 0.02);
          sh += float(vHit(kind, gl + vec3(o.x, 0.0, o.y) * fp, lj, t, n, 0.0) != 0);
        }
        // The shadow takes away the sun's share of the road's light.
        float sunL = dot(uSunCol, vec3(0.3, 0.6, 0.1)) * 0.55, ambL = dot(uAmb, vec3(0.3, 0.6, 0.1)) * 0.6;
        // Near the horizon the road is too foreshortened to hold a clean edge: the shadow fades.
        float ks = sh * 0.25 * sunL / max(sunL + ambL, 1e-4) * (1.0 - sunCover((G + C) * 0.001)) * smoothstep(0.006, 0.02, -rd.y);
        if (ks > 0.0) put(vec3(0.0), ks, zg);
      }
    }
  }
  // Layers stack in call order: spray nearer the eye than the body lays down after it.
  bool sprayFront = depthOf(C - f * 4.0) < depthOf(C);
  if (!sprayFront) vSpray(s, C, f, rt, kind, spd, age, seed, brake);
  // The screen box: nothing more to do outside it.
  vec2 c0 = proj(C + vec3(0.0, 1.4, 0.0));
  float R = (4.2 + spd * 0.02) / z * uFoc;
  if (z > 2.0 && (abs(s.x - c0.x) > R || abs(s.y - c0.y) > R)) { if (sprayFront) vSpray(s, C, f, rt, kind, spd, age, seed, brake); return; }
  // The body rolls and pitches on its springs: the road's small bumps, and the driver's braking and steering.
  float roll = 0.008 * sin(age * 2.3 + seed * 6.0) + 0.004 * sin(age * 5.1) + cV.z;
  float pitch = 0.004 * sin(age * 3.1 + seed * 3.0) + cV.y;
  float spin = uT * 9.0 + seed * 6.0;
  // The smear across the view in the shutter's 1/40 s, in metres at the vehicle.
  float lat = abs(dot(C, rt)) + 1.0;
  gPxW = max(px * z / uFoc, lat * spd / 40.0 / max(z, 1.0) * abs(dot(f, normalize(C))));
  // Four samples, six near; where they disagree (an edge, a lamp, a pane) sixteen.
  // Each sample is its own spot in the pixel and its own moment in the shutter.
  int nb = z < 25.0 ? 6 : 4, ns = 0, id0 = -1;
  gSpd = spd; gAge = age; gSh = 1.0;
  float shK = 1.0;
  bool mixed = false;
  float jit = th(gl_FragCoord.xy + fract(uT * 3.7) * 61.0), jit2 = th(gl_FragCoord.yx * 1.37 + 5.1);
  vec3 acc = vec3(0.0);
  float cov = 0.0, zHit = z;
  for (int k = 0; k < 16; k++) {
    if (k == nb && !mixed) break;
    ns++;
    float fk = fract(float(k) * 0.618034 + jit);
    vec2 so = s + (fract(vec2(0.7548777, 0.5698403) * float(k) + vec2(jit, jit2)) - 0.5) * px;
    vec3 rw = toWorld(normalize(vec3(so, -uFoc)));
    // The shutter is open 1/40 s: the vehicle moves within it.
    vec3 Ck = C + f * spd * (fk - 0.5) / 40.0;
    vec3 o = eye - Ck;
    // Into the vehicle's frame, with its roll about f and its pitch about rt (nose down for positive pitch).
    vec3 lo = vec3(dot(o, rt), o.y, dot(o, f)), ld = vec3(dot(rw, rt), rw.y, dot(rw, f));
    mat2 mr = mat2(cos(roll), sin(roll), -sin(roll), cos(roll)), mp = mat2(cos(pitch), -sin(pitch), sin(pitch), cos(pitch));
    lo.xy = mr * (lo.xy - vec2(0.0, 0.8)) + vec2(0.0, 0.8); ld.xy = mr * ld.xy;
    lo.yz = mp * (lo.yz - vec2(0.8, 0.0)) + vec2(0.8, 0.0); ld.yz = mp * ld.yz;
    // The whole vehicle's box first: most rays in the screen box miss it.
    vec3 inv = 1.0 / ld, ta = (vec3(-hw - 0.32, 0.0, rr - 0.15) - lo) * inv, tb = (vec3(hw + 0.32, top, fr + 0.15) - lo) * inv;
    vec3 mn = min(ta, tb), mx = max(ta, tb);
    float t;
    vec3 n;
    gHitK = 1.0;
    int id = min(min(mx.x, mx.y), mx.z) < max(max(max(mn.x, mn.y), mn.z), 0.0) ? 0 : vHit(kind, lo, ld, t, n, spin);
    if (id != 0) id = vPart(id, kind, lo + ld * t, n);
    if (id0 < 0) id0 = id;
    mixed = mixed || id != id0 || gHitK < 1.0;
    if (id == 0) continue;
    vec3 hl = lo + ld * t;
    float hk = gHitK;
    {
      // A ray to the sun from the hit: the body shades its own parts.
      // Two samples trace it; the rest trace only where parts or shadows disagree.
      // Past 40 m the vehicle is too small to show it.
      vec3 L = normalize(uSun + vec3(0.0, 1e-3, 0.0)), ls = vec3(dot(L, rt), L.y, dot(L, f));
      ls.xy = mr * ls.xy; ls.yz = mp * ls.yz;
      float sv = 1.0;
      if (dot(n, ls) <= 0.0) sv = 0.0;
      else if (id != 6 && id != 7 && z <= 40.0) {
        if (k < 2 || mixed || id != id0) {
          float tSh, sx = gExT;
          vec3 nSh, sn = gExN;
          int si = vHit(kind, hl + n * 0.004, ls, tSh, nSh, spin);
          sv = si == 0 ? 1.0 : si == 2 ? 0.45 : 0.0;
          gExT = sx; gExN = sn;
        } else sv = shK;
      }
      if (k == 0) shK = sv;
      if (k == 1 && sv != shK) mixed = true;
      gSh = sv;
      n = vBend(hl, n, id, kind);
    }
    // Back out of the roll and pitch for the world normal.
    vec3 nb = n;
    nb.yz = transpose(mp) * nb.yz; nb.xy = transpose(mr) * nb.xy;
    vec3 N = normalize(rt * nb.x + vec3(0.0, nb.y, 0.0) + f * nb.z);
    vec3 P = Ck + rt * hl.x + vec3(0.0, hl.y, 0.0) + f * hl.z;
    // Glass in a cab with windows all round shows the world through the far window.
    float see = 0.0;
    if (id == 2 && kind != 2) {
      vec3 xp = lo + ld * gExT;
      see = float(vPart(2, kind, xp, gExN) == 2);
      // Seat backs with rounded shoulders, and a rounded headrest over each, block the lower window.
      float bx = abs(abs(xp.x) - 0.42), by = xp.y - vBelt(kind);
      float back = step(by, 0.16 - 0.5 * max(bx - 0.18, 0.0));
      float rest = step(length(vec2(bx / 0.12, (by - 0.3) / 0.09)), 1.0);
      see *= 1.0 - max(back, rest);
    }
    vec3 col = vShade(id, kind, P, N, -rw, hl, n, seed, brake, see);
    // The amber bar flashes, left and right in turn.
    if (id == 4) col = vec3(1.0, 0.45, 0.05) * (0.2 + 7.0 * step(0.5, fract(uT * 1.6 + (hl.x > 0.0 ? 0.5 : 0.0))));
    acc += col * hk;
    cov += hk;
    zHit = depthOf(P);
  }
  if (cov > 0.0) put(hazed(acc / cov, rd, zHit), cov / float(ns), zHit);
  if (sprayFront) vSpray(s, C, f, rt, kind, spd, age, seed, brake);
}
// Every vehicle in one pass: far ones before the infrastructure, near ones after it.
void traffic(vec2 s, vec3 rd, float px, bool near) {
  for (int i = 0; i < ${MAX_VEH}; i++) vehicle(i, s, rd, px, near);
}
`;
