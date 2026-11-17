// Tornado alley: vehicles on the road, as a scene.
// A pickup flees the storm toward the eye and races past; then two storm chasers rush in from behind.
// The CPU part drives each vehicle: it brakes, follows, and swerves round what lies on the road.
// The GLSL part ray-traces each vehicle as faceted hulls, wheels, glass, lamps and spray.
import { POLE_X, POLE_Z0, POLE_GAP, POLES } from './line.js';

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
// brake, pitch, roll.
export function trafficUniforms(T, simT) {
  T.u.fill(0); T.uB.fill(0); T.uC.fill(0);
  T.veh.slice(0, MAX_VEH).forEach((v, i) => {
    const age = simT - v.t0;
    const hd = Math.atan2(v.xv, v.dir * Math.max(v.v, 0.3));
    T.u.set([v.x, v.z, v.dir * v.v, v.kind], i * 4);
    T.uB.set([age >= 0 ? 1 : 0, v.seed, Math.max(age, 0), hd], i * 4);
    T.uC.set([v.brake, v.pitch, v.roll, 0], i * 4);
  });
}

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
// Closes a hull: a nearer hit replaces the one held.
void hEnd(int myId, inout float t, inout vec3 n, inout int id) {
  if (hTn > hTf || hTn <= 0.0 || hTn >= t) return;
  t = hTn; n = hN; id = myId; gHitK = 1.0;
  if (myId == 2) { gExT = hTf; gExN = hNf; }
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
float vHW(int k) { return k == 1 ? 0.95 : k == 0 ? 0.99 : 1.0; }
float vBelt(int k) { return k == 0 ? 1.14 : k == 1 ? 1.1 : 1.2; }
float vRoof(int k) { return k == 0 ? 1.86 : k == 1 ? 1.76 : 2.35; }
float vFront(int k) { return k == 0 ? 2.85 : k == 1 ? 2.47 : 2.75; }
float vRear(int k) { return k == 0 ? -2.82 : k == 1 ? -2.43 : -2.77; }
vec4 vWh(int k) { return k == 0 ? vec4(0.41, 1.72, 0.85, 0.15) : k == 1 ? vec4(0.38, 1.45, 0.8, 0.14) : vec4(0.38, 1.8, 0.84, 0.14); }
// The windshield: a plane through the hood's back edge (y, z) with normal (0, ny, nz).
vec4 vWs(int k) { return k == 0 ? vec4(1.12, 1.0, 0.68, 0.74) : k == 1 ? vec4(1.08, 1.07, 0.75, 0.66) : vec4(1.15, 1.77, 0.55, 0.83); }
// The vehicle's parts, in its own frame: x across (right), y up, z forward. Returns the hit part's id.
// ids: 1 hood and nose, 2 cabin and body, 3 black trim, 4 amber bar, 5 bright metal, 9 tyre, 10 bed liner,
// 11 rim, 12 white plastic.
int vHit(int kind, vec3 ro, vec3 rd, out float t, out vec3 n, float spin) {
  t = 1e9; n = vec3(0.0, 1.0, 0.0);
  int id = 0;
  float hw = vHW(kind);
  vec4 ws = vWs(kind);
  vec3 wsN = vec3(0.0, ws.z, ws.w), wsQ = vec3(0.0, ws.x, ws.y);
  if (kind == 0) {
    // The nose and hood; the nose drops toward the bumper.
    hBeg(); hBox(ro, rd, vec3(0.0, 0.77, 1.9), vec3(0.99, 0.35, 0.95), 0.1);
    hPq(ro, rd, vec3(0.0, 1.0, 0.5), vec3(0.0, 1.12, 2.4)); hEnd(1, t, n, id);
    // The cab: raked windshield, sides that lean in above the belt, a near-upright back.
    hBeg(); hBox(ro, rd, vec3(0.0, 1.14, 0.2), vec3(0.99, 0.72, 0.8), 0.09);
    hPq(ro, rd, wsN, wsQ);
    hPq(ro, rd, vec3(1.0, 0.25, 0.0), vec3(0.99, 1.1, 0.0)); hPq(ro, rd, vec3(-1.0, 0.25, 0.0), vec3(-0.99, 1.1, 0.0));
    hPq(ro, rd, vec3(0.0, 0.12, -1.0), vec3(0.0, 1.2, -0.6)); hEnd(2, t, n, id);
    // The bed: two walls, a tailgate, and a black liner floor.
    vBox(ro, rd, vec3(0.925, 0.81, -1.71), vec3(0.065, 0.39, 1.11), 0.03, 1, t, n, id);
    vBox(ro, rd, vec3(-0.925, 0.81, -1.71), vec3(0.065, 0.39, 1.11), 0.03, 1, t, n, id);
    vBox(ro, rd, vec3(0.0, 0.8, -2.76), vec3(0.99, 0.38, 0.06), 0.03, 1, t, n, id);
    vBox(ro, rd, vec3(0.0, 0.57, -1.7), vec3(0.86, 0.15, 1.1), 0.0, 10, t, n, id);
    // Chrome bumpers, black mirrors.
    vBox(ro, rd, vec3(0.0, 0.45, 2.86), vec3(1.0, 0.11, 0.1), 0.04, 5, t, n, id);
    vBox(ro, rd, vec3(0.0, 0.45, -2.88), vec3(1.0, 0.1, 0.09), 0.04, 5, t, n, id);
    vBox(ro, rd, vec3(1.08, 1.27, 0.85), vec3(0.1, 0.08, 0.05), 0.02, 3, t, n, id);
    vBox(ro, rd, vec3(-1.08, 1.27, 0.85), vec3(0.1, 0.08, 0.05), 0.02, 3, t, n, id);
  } else if (kind == 1) {
    hBeg(); hBox(ro, rd, vec3(0.0, 0.76, 1.75), vec3(0.95, 0.32, 0.72), 0.1);
    hPq(ro, rd, vec3(0.0, 1.0, 0.5), vec3(0.0, 1.08, 2.05)); hEnd(1, t, n, id);
    // The wagon's long body, its hatch leaning in at the back.
    hBeg(); hBox(ro, rd, vec3(0.0, 1.1, -0.68), vec3(0.95, 0.66, 1.75), 0.1);
    hPq(ro, rd, wsN, wsQ);
    hPq(ro, rd, vec3(1.0, 0.3, 0.0), vec3(0.95, 1.1, 0.0)); hPq(ro, rd, vec3(-1.0, 0.3, 0.0), vec3(-0.95, 1.1, 0.0));
    hPq(ro, rd, vec3(0.0, 0.3, -1.0), vec3(0.0, 1.2, -2.43)); hEnd(2, t, n, id);
    // Roof bars, a black gear case, the amber bar at the front.
    vBox(ro, rd, vec3(0.0, 1.8, -0.25), vec3(0.78, 0.025, 0.03), 0.0, 3, t, n, id);
    vBox(ro, rd, vec3(0.0, 1.8, -1.75), vec3(0.78, 0.025, 0.03), 0.0, 3, t, n, id);
    vBox(ro, rd, vec3(0.0, 1.92, -1.0), vec3(0.52, 0.1, 0.72), 0.06, 3, t, n, id);
    vBox(ro, rd, vec3(0.0, 1.84, 0.14), vec3(0.62, 0.05, 0.08), 0.02, 4, t, n, id);
    // A short mast with a cup anemometer, and two whip aerials.
    vRod(ro, rd, vec2(0.55, -2.0), 0.018, 1.7, 2.62, 5, t, n, id);
    vRod(ro, rd, vec2(-0.7, -2.2), 0.006, 1.6, 2.75, 3, t, n, id);
    vRod(ro, rd, vec2(-0.5, -2.2), 0.006, 1.6, 2.6, 3, t, n, id);
    for (int k = 0; k < 3; k++) {
      float a = spin + float(k) * 2.0944;
      vBox(ro, rd, vec3(0.55 + 0.11 * cos(a), 2.63, -2.0 + 0.11 * sin(a)), vec3(0.025), 0.01, 3, t, n, id);
    }
    vBox(ro, rd, vec3(0.0, 0.5, 2.48), vec3(0.96, 0.12, 0.07), 0.04, 3, t, n, id);
    vBox(ro, rd, vec3(0.0, 0.5, -2.46), vec3(0.96, 0.12, 0.06), 0.04, 3, t, n, id);
    vBox(ro, rd, vec3(1.03, 1.2, 0.95), vec3(0.09, 0.08, 0.05), 0.02, 3, t, n, id);
    vBox(ro, rd, vec3(-1.03, 1.2, 0.95), vec3(0.09, 0.08, 0.05), 0.02, 3, t, n, id);
  } else {
    hBeg(); hBox(ro, rd, vec3(0.0, 0.78, 2.25), vec3(0.98, 0.37, 0.5), 0.12);
    hPq(ro, rd, vec3(0.0, 1.0, 0.6), vec3(0.0, 1.15, 2.45)); hEnd(1, t, n, id);
    // The van's tall box body.
    hBeg(); hBox(ro, rd, vec3(0.0, 1.38, -0.5), vec3(1.0, 0.97, 2.27), 0.13);
    hPq(ro, rd, wsN, wsQ);
    hPq(ro, rd, vec3(1.0, 0.08, 0.0), vec3(1.0, 1.3, 0.0)); hPq(ro, rd, vec3(-1.0, 0.08, 0.0), vec3(-1.0, 1.3, 0.0)); hEnd(2, t, n, id);
    // The roof rack, its instrument cases, the amber bar.
    vBox(ro, rd, vec3(0.0, 2.39, -0.7), vec3(0.85, 0.03, 1.55), 0.0, 3, t, n, id);
    vBox(ro, rd, vec3(0.42, 2.52, -0.3), vec3(0.22, 0.1, 0.35), 0.03, 12, t, n, id);
    vBox(ro, rd, vec3(-0.4, 2.49, -1.1), vec3(0.28, 0.07, 0.4), 0.03, 3, t, n, id);
    vBox(ro, rd, vec3(0.0, 2.42, 1.0), vec3(0.65, 0.05, 0.08), 0.02, 4, t, n, id);
    // The instrument mast at the back: a radiation shield half way, a cross-arm, cups on one end, a vane on the other.
    vRod(ro, rd, vec2(0.0, -2.2), 0.035, 2.35, 3.68, 5, t, n, id);
    vBox(ro, rd, vec3(0.0, 3.1, -2.2), vec3(0.08, 0.13, 0.08), 0.03, 12, t, n, id);
    vBox(ro, rd, vec3(0.0, 3.64, -2.2), vec3(0.46, 0.015, 0.015), 0.0, 5, t, n, id);
    vRod(ro, rd, vec2(0.46, -2.2), 0.01, 3.62, 3.74, 5, t, n, id);
    for (int k = 0; k < 3; k++) {
      float a = spin + float(k) * 2.0944;
      vBox(ro, rd, vec3(0.46 + 0.12 * cos(a), 3.74, -2.2 + 0.12 * sin(a)), vec3(0.028), 0.012, 3, t, n, id);
    }
    vBox(ro, rd, vec3(-0.46, 3.68, -2.32), vec3(0.004, 0.06, 0.12), 0.0, 3, t, n, id);
    vBox(ro, rd, vec3(0.0, 0.47, 2.78), vec3(0.99, 0.12, 0.07), 0.04, 3, t, n, id);
    vBox(ro, rd, vec3(0.0, 0.47, -2.8), vec3(0.99, 0.12, 0.06), 0.04, 3, t, n, id);
    vBox(ro, rd, vec3(1.08, 1.45, 1.55), vec3(0.09, 0.14, 0.05), 0.02, 3, t, n, id);
    vBox(ro, rd, vec3(-1.08, 1.45, 1.55), vec3(0.09, 0.14, 0.05), 0.02, 3, t, n, id);
  }
  vec4 wh = vWh(kind);
  for (int k = 0; k < 4; k++) {
    float wz = (k < 2 ? 1.0 : -1.0) * wh.y, wx = (k % 2 == 0 ? 1.0 : -1.0) * wh.z;
    vWheel(ro, rd, vec2(wh.x, wz), wh.x, wx, wh.w, t, n, id);
  }
  return t < 1e8 ? id : 0;
}
// The part a body hit lands on: paint, glass, a lamp lens, grille or a wheel well.
// Returns 2 glass, 6 head lamp, 7 tail lamp, 8 wheel well, 10 grille, 3 trim; else the id it was given.
int vPart(int id, int kind, vec3 h, vec3 nl) {
  if (id != 1 && id != 2) return id;
  vec4 wh = vWh(kind);
  // Wheel wells: the side's cut-out round each wheel, with a black flare round its rim.
  if (abs(nl.x) > 0.6) {
    float dw = length(vec2(h.y - wh.x, abs(h.z) - wh.y));
    if (dw < wh.x + 0.1) return 8;
    if (dw < wh.x + 0.15 && h.y > wh.x * 0.6) return kind == 0 ? id : 3;
  }
  float belt = vBelt(kind), roof = vRoof(kind), hw = vHW(kind), fr = vFront(kind), rr = vRear(kind);
  // The front: lamps either side of the grille.
  if (nl.z > 0.55 && id == 1) {
    float ly = kind == 2 ? 0.92 : 0.88;
    if (abs(h.y - ly) < 0.1 && abs(h.x) > hw * 0.55 && abs(h.x) < hw - 0.08) return 6;
    if (abs(h.x) < hw * 0.53 && h.y > 0.56 && h.y < ly + 0.1) return 10;
  }
  // The back: tall tail lamps at the corners.
  if (nl.z < -0.55 && abs(h.x) > hw - 0.22 && abs(h.x) < hw - 0.03 && h.y > 0.84 && h.y < (kind == 0 ? 1.16 : 1.26)) return 7;
  if (id != 2 || h.y < belt + 0.02 || nl.y > 0.8 || h.y > roof - 0.07) return id;
  vec4 ws = vWs(kind);
  // How far the hit stands behind the windshield's plane, and its height over the belt.
  float dWs = -dot(vec2(ws.z, ws.w), vec2(h.y - ws.x, h.z - ws.y));
  // The windshield, between its pillars.
  if (dWs < 0.03 && nl.z > 0.3) return abs(h.x) < hw * 0.8 - (h.y - belt) * 0.25 ? 2 : id;
  // The side glass, cut by the pillars.
  if (abs(nl.x) > 0.5) {
    if (dWs < 0.09 || h.z < rr + 0.12) return id;
    if (kind == 0) return h.z > -0.5 && abs(h.z - 0.18) > 0.06 ? 2 : id;
    if (kind == 1) return abs(h.z + 0.25) > 0.06 && abs(h.z + 1.55) > 0.07 && h.z > rr + 0.3 ? 2 : id;
    return h.z > 0.55 ? 2 : id;
  }
  // The rear glass.
  if (nl.z < -0.3 && abs(h.x) < hw * 0.75 && h.y > belt + (kind == 2 ? 0.25 : 0.06)) return kind == 2 && abs(h.x) < 0.04 ? id : 2;
  return id;
}
// The colour of a hit, in world space. N is the world normal; h and nl the hit and normal in the vehicle's frame.
// see is 1 where the glass looks out through the far window: the world behind shows, dimmed by two panes.
vec3 vShade(int id, int kind, vec3 P, vec3 N, vec3 V, vec3 h, vec3 nl, float seed, float brake, float see) {
  float sun = 1.0 - sunCover(P * 0.001);
  vec3 L = normalize(uSun + vec3(0.0, 1e-3, 0.0)), H = normalize(L + V);
  float nlight = max(dot(N, L), 0.0), nv = max(dot(N, V), 0.05);
  // Paint: a faded white pickup, a dark green wagon, a white van. Clear-coated, so it holds the sky.
  vec3 paint = kind == 0 ? vec3(0.55, 0.54, 0.5) : kind == 1 ? vec3(0.05, 0.085, 0.07) : vec3(0.62, 0.62, 0.6);
  vec3 alb = paint, f0 = vec3(0.04), em = vec3(0.0);
  float rough = mix(0.32, 0.12, uRain);
  if (id == 2) {
    // Glass: the dim cab inside, and the sky in a strong Fresnel.
    alb = vec3(0.012); rough = 0.04;
    // The van's hail guard: a mesh of bars over the windshield.
    if (kind == 2 && nl.z > 0.3) {
      float bar = max(step(0.82, fract(h.x * 9.0)), step(0.8, fract(h.y * 7.0)));
      if (bar > 0.0) { alb = vec3(0.02); rough = 0.5; f0 = vec3(0.04); }
    }
  }
  if (id == 3) { alb = vec3(0.035); rough = 0.55; }
  // Chrome on the pickup; brushed aluminium on the chasers' masts.
  if (id == 5) { alb = vec3(0.0); f0 = vec3(0.72, 0.73, 0.75); rough = kind == 0 ? 0.14 : 0.35; }
  if (id == 6) { alb = vec3(0.05); f0 = vec3(0.3); rough = 0.05; em = vec3(1.0, 0.92, 0.8) * 4.0 * pow(max(nl.z, 0.0), 2.0); }
  if (id == 7) { alb = vec3(0.12, 0.01, 0.01); rough = 0.08; em = vec3(0.9, 0.04, 0.02) * (0.5 + 3.5 * brake) * pow(max(-nl.z, 0.0), 2.0); }
  if (id == 8) { alb = vec3(0.008); rough = 0.9; }
  if (id == 9) { alb = vec3(0.025); rough = 0.85; }
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
  // Panel seams: a hair of shadow at the door edges.
  if ((id == 1 || id == 2) && abs(nl.x) > 0.5) {
    float sz = kind == 0 ? min(abs(h.z - 1.0), abs(h.z + 0.55)) : kind == 1 ? min(abs(h.z - 1.05), abs(h.z + 0.25)) : min(abs(h.z - 1.75), abs(h.z - 0.55));
    alb *= mix(0.45, 1.0, smoothstep(0.004, 0.012, sz));
  }
  // The lower body takes road grime; under the storm it is wet and darker.
  if (id == 1 || id == 2) alb = mix(alb, vec3(0.12, 0.1, 0.075), smoothstep(0.8, 0.42, h.y) * (0.55 + 0.25 * uRain));
  // The underside and the wheel wells see little sky.
  float ao = mix(0.35, 1.0, smoothstep(-0.6, 0.3, nl.y)) * mix(0.55, 1.0, smoothstep(0.3, 0.75, h.y));
  vec2 ab = envBRDF(rough, nv);
  vec3 c = alb * (uSunCol * 0.9 * sun * nlight + uAmb * (0.45 + 0.25 * N.y) * ao);
  c += lineEnv(reflect(-V, N)) * (f0 * ab.x + ab.y) * ao;
  // The sun's highlight, capped: a thin bright part would sparkle from sample to sample.
  c += uSunCol * sun * min(ggx(max(dot(N, H), 0.0), rough), 2.5) * nlight * (f0 + 0.02) * 1.2;
  // What lies behind: the bright haze at the horizon, dark ground below it, the deck above.
  vec3 back = mix(hazeCol(-V) * mix(1.0, 0.25, smoothstep(0.0, 0.2, -V.y)), uAmb * 0.03, smoothstep(0.0, -0.04, -V.y));
  // The wagon's rear glass is privacy-tinted.
  if (id == 2) c += back * see * (kind == 1 ? 0.12 : 0.35) * (1.0 - ab.x * 0.04 - ab.y);
  return c + em;
}
// A lamp's glow: a point of light at P facing along dir, of colour col.
void vLamp(vec2 s, vec3 P, vec3 dir, vec3 col, float px) {
  float z = depthOf(P);
  if (z < 0.5) return;
  vec3 toEye = normalize(vec3(0.0, CAMH, 0.0) - P);
  float face = pow(max(dot(dir, toEye), 0.0), 3.0);
  if (face <= 0.0) return;
  // A hot core as wide as the lamp, and a bloom a few pixels round it: the lens's, not the air's.
  float d = length(s - proj(P)), dp = d / px;
  float core = exp(-pow(d / (px * 0.9 + 0.09 / z * uFoc), 2.0));
  gVehGlow += col * face * (core * 5.0 + 0.5 * exp(-dp / 5.0) + 0.05 * exp(-dp / 30.0));
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
    // The tail lamps light the near spray red; harder under the brakes.
    vec3 col = mix(dust, mist, wet) + vec3(0.9, 0.05, 0.02) * (0.08 + 0.5 * brake) * exp(-fk * 0.6);
    put(hazed(col, normalize(Pp - vec3(0.0, CAMH, 0.0)), zp), al, zp);
  }
}
// One vehicle, ray-traced at several moments in the shutter, each at its own spot in the pixel.
// Far vehicles draw before the line, near ones after it.
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
    float hy = kind == 2 ? 0.92 : 0.88;
    for (int k = 0; k < 2; k++) {
      float sx = k == 0 ? -1.0 : 1.0;
      vLamp(s, C + rt * sx * (hw - 0.22) + vec3(0.0, hy, 0.0) + f * (fr + 0.01), f, vec3(1.0, 0.9, 0.75), px);
      vLamp(s, C + rt * sx * (hw - 0.14) + vec3(0.0, kind == 0 ? 0.98 : 1.06, 0.0) + f * (rr - 0.01), -f, vec3(0.9, 0.06, 0.03) * (0.4 + 1.6 * brake), px);
      if (kind != 0) {
        // The amber bar flashes left and right in turn.
        float on = step(0.5, fract(uT * 1.6 + (sx > 0.0 ? 0.5 : 0.0)));
        vec3 Pb = C + rt * sx * 0.4 + vec3(0.0, kind == 1 ? 1.84 : 2.42, 0.0) + f * (kind == 1 ? 0.14 : 1.0);
        vLamp(s, Pb, normalize(vec3(0.0, 0.2, 0.0) - f), vec3(1.0, 0.45, 0.05) * on * 0.8, px);
        vLamp(s, Pb, normalize(vec3(0.0, 0.2, 0.0) + f), vec3(1.0, 0.45, 0.05) * on * 0.8, px);
      }
    }
  }
  if ((z > 60.0) == near) return;
  vec3 eye = vec3(0.0, CAMH, 0.0);
  // A short contact shadow under the vehicle, on the road.
  {
    float tg = CAMH / max(-rd.y, 1e-4);
    vec3 G = eye + rd * tg - C;
    vec2 q = vec2(dot(G, rt), dot(G, f) - (fr + rr) * 0.5) / vec2(hw + 0.2, (fr - rr) * 0.5 + 0.15);
    float k = (1.0 - smoothstep(0.55, 1.0, length(q))) * 0.6;
    if (rd.y < 0.0 && k > 0.0) put(vec3(0.004), k, depthOf(C));
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
  float spin = uT * 9.0 + seed * 6.0, top = kind == 2 ? 3.8 : 2.8;
  // The smear across the view in the shutter's 1/40 s, in metres at the vehicle.
  float lat = abs(dot(C, rt)) + 1.0;
  gPxW = max(px * z / uFoc, lat * spd / 40.0 / max(z, 1.0) * abs(dot(f, normalize(C))));
  // A near vehicle takes six: its blur spans many pixels.
  int ns = z < 25.0 ? 6 : 3;
  float jit = th(gl_FragCoord.xy + fract(uT * 3.7) * 61.0);
  vec3 acc = vec3(0.0);
  float cov = 0.0, zHit = z;
  for (int k = 0; k < ns; k++) {
    float fk = (float(k) + jit) / float(ns);
    vec2 so = s + (vec2(fract(fk * 1.618 + 0.3), fract(fk * 2.414 + 0.7)) - 0.5) * px;
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
    vec3 inv = 1.0 / ld, ta = (vec3(-hw - 0.2, 0.0, rr - 0.15) - lo) * inv, tb = (vec3(hw + 0.2, top, fr + 0.15) - lo) * inv;
    vec3 mn = min(ta, tb), mx = max(ta, tb);
    if (min(min(mx.x, mx.y), mx.z) < max(max(max(mn.x, mn.y), mn.z), 0.0)) continue;
    float t;
    vec3 n;
    gHitK = 1.0;
    int id = vHit(kind, lo, ld, t, n, spin);
    if (id == 0) continue;
    vec3 hl = lo + ld * t;
    // Back out of the roll and pitch for the world normal.
    vec3 nb = n;
    nb.yz = transpose(mp) * nb.yz; nb.xy = transpose(mr) * nb.xy;
    vec3 N = normalize(rt * nb.x + vec3(0.0, nb.y, 0.0) + f * nb.z);
    vec3 P = Ck + rt * hl.x + vec3(0.0, hl.y, 0.0) + f * hl.z;
    id = vPart(id, kind, hl, n);
    // Glass in a cab with windows all round shows the world through the far window.
    float see = 0.0;
    if (id == 2 && kind != 2) {
      vec3 xp = lo + ld * gExT;
      see = float(vPart(2, kind, xp, gExN) == 2);
      // Seat backs and headrests block the lower part of the far window.
      float hr = step(abs(abs(xp.x) - 0.42), 0.13) * step(xp.y, vBelt(kind) + 0.38);
      see *= 1.0 - max(step(xp.y, vBelt(kind) + 0.2), hr);
    }
    vec3 col = vShade(id, kind, P, N, -rw, hl, n, seed, brake, see);
    // The amber bar flashes, left and right in turn.
    if (id == 4) col = vec3(1.0, 0.45, 0.05) * (0.2 + 7.0 * step(0.5, fract(uT * 1.6 + (hl.x > 0.0 ? 0.5 : 0.0))));
    acc += col * gHitK;
    cov += gHitK;
    zHit = depthOf(P);
  }
  if (cov > 0.0) put(hazed(acc / cov, rd, zHit), cov / float(ns), zHit);
  if (sprayFront) vSpray(s, C, f, rt, kind, spd, age, seed, brake);
}
// Every vehicle in one pass: far ones before the line, near ones after it.
void traffic(vec2 s, vec3 rd, float px, bool near) {
  for (int i = 0; i < ${MAX_VEH}; i++) vehicle(i, s, rd, px, near);
}
`;
