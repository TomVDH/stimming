// Tornado alley: the things on the plain a tornado can wreck besides the farm and the line.
// A water tower far off to the right, a billboard past the poles, a centre-pivot irrigator, round bales.
// The CPU part keeps the tower's and the board's peak wind, and rolls and throws the bales.
// The GLSL part draws each one by its damage, flat on the screen in the scene pass.
import { damageSite, debrisThrow, windNow } from './damage.js';

const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);

/* ---------- places ---------- */
// The water tower, right of the road, 5 km out: clear of the road's vanishing point.
const WTOWER = [2300, -4700];
// The billboard, well right of the poles and of the road's vanishing point, facing the eye.
const BILLB = [150, -950];
// The pivot: its centre, the arm's bearing, seven spans of 55 m.
const PIVOTC = [-900, -2300], PIVOT_ANG = 2.6, SPANS = 7, SPAN = 55;
// Round bales in the left field: two loose rows, and three by the road.
export const BALES = 14;
const BALE_HOME = Array.from({ length: BALES }, (_, i) => (i < 11
  ? [-260 - 38 * i - 9 * Math.sin(i * 2.3), -820 - (i % 2) * 60 - 25 * i + 12 * Math.cos(i * 1.7)]
  : [-28 - 9 * (i - 11), -1180 - 40 * (i - 11)]));
// A bale: radius and mass; its drag over mass for a 1.5 m by 1.2 m face.
const BALE_R = 0.75, BALE_K = 0.5 * 1.2 * 1.0 * 1.8 / 400;

export function infraState(D) {
  const I = {
    tower: damageSite(D, WTOWER[0], WTOWER[1]), board: damageSite(D, BILLB[0], BILLB[1]),
    thrown: { tower: 0, board: 0 },
    bales: [],
    uInfra: new Float32Array(2 * 4), uBale: new Float32Array(BALES * 4), uBaleB: new Float32Array(BALES * 4),
  };
  infraReset(I);
  return I;
}
// Puts every bale back where it was baled.
export function infraReset(I) {
  I.bales = BALE_HOME.map(([x, z], i) => ({ x, z, y: 0, vx: 0, vz: 0, vy: 0, roll: 0, head: (i * 0.9) % Math.PI, on: 1 }));
  I.thrown.tower = 0; I.thrown.board = 0;
}
// One step: the bales roll and fly in the tornadoes' wind; a failing tower or board throws debris.
// A bale on the road becomes an obstacle for the traffic.
export function infraStep(I, D, tors, dt, simT, traf) {
  const t = I.tower, b = I.board;
  if (t.peak <= 0) I.thrown.tower = 0;
  if (b.peak <= 0) I.thrown.board = 0;
  if (!I.thrown.tower && t.peak > 72) { debrisThrow(D, t.x, t.z, simT, 0.7); I.thrown.tower = 1; }
  if (!I.thrown.board && b.peak > 38) { debrisThrow(D, b.x, b.z, simT, 0.35); I.thrown.board = 1; }
  if (traf) traf.extra.length = 0;
  for (const p of I.bales) {
    if (!p.on) continue;
    const [wx, wz] = windNow(tors, p.x, p.z);
    const rx = wx - p.vx, rz = wz - p.vz, rv = Math.hypot(rx, rz), w = Math.hypot(wx, wz);
    // Drag pushes the bale along; on the ground it rolls once the wind tops 25 m/s.
    let ax = BALE_K * rx * rv, az = BALE_K * rz * rv;
    if (p.y <= 0) {
      if (w < 25 && Math.hypot(p.vx, p.vz) < 0.3) { ax = 0; az = 0; p.vx *= 0.9; p.vz *= 0.9; }
      // Stubble and soil drag hard on a rolling bale: it rolls at a fraction of the wind.
      const sp = Math.hypot(p.vx, p.vz);
      if (sp > 0) { const f = 2.5 + 0.08 * sp * sp; ax -= f * p.vx / sp; az -= f * p.vz / sp; }
      // Past 55 m/s the wind lifts it.
      if (w > 55) p.vy += (BALE_K * w * w * 0.55 - 9.8) * dt;
    } else p.vy += (BALE_K * w * w * 0.42 - 9.8) * dt;
    p.vx += ax * dt; p.vz += az * dt;
    p.x += p.vx * dt; p.z += p.vz * dt; p.y += p.vy * dt;
    if (p.y < 0) { p.y = 0; p.vy = p.vy < -4 ? -p.vy * 0.3 : 0; }
    const sp = Math.hypot(p.vx, p.vz);
    p.roll += sp / BALE_R * dt;
    // A rolling bale turns its axis across its path.
    if (sp > 0.5 && p.y <= 0) p.head = Math.atan2(p.vz, p.vx) + Math.PI / 2;
    // Far from home it is lost to the eye: it leaves.
    const [hx, hz] = BALE_HOME[I.bales.indexOf(p)];
    if (Math.hypot(p.x - hx, p.z - hz) > 1800 || p.y > 300) p.on = 0;
    if (traf && p.y < 1 && Math.abs(p.x - 3.4) < 5) traf.extra.push({ z: p.z, x0: p.x - 0.9, x1: p.x + 0.9 });
  }
}
// Packs the tower's and the board's damage, and each bale's place, lift, roll and heading.
export function infraUniforms(I) {
  I.uInfra.set([I.tower.peak, I.tower.dx, I.tower.dz, I.tower.t, I.board.peak, I.board.dx, I.board.dz, I.board.t]);
  I.uBale.fill(0); I.uBaleB.fill(0);
  I.bales.forEach((p, i) => { I.uBale.set([p.x, p.z, p.y, p.roll], i * 4); I.uBaleB.set([p.on, p.head, 0, 0], i * 4); });
}

/* ---------- GLSL ---------- */
// It reads main.js's proj(), depthOf(), hazed(), sunCover(), vn(), th(), CAMH and uFoc,
// line.js's put() and segCover(), plain.js's screenAlong() and plainHaze(), damage.js's dmgAt(),
// and farm.js's fStage(), fCov() and fSide().
export const INFRA_GLSL = /* glsl */`
/* ---------- infrastructure ---------- */
// The tower's and the board's damage: peak wind, its direction (x, z), the time it rose.
uniform vec4 uInfra[2];
// Each bale: x, z, height off the ground, roll; then on, heading.
uniform vec4 uBale[${BALES}], uBaleB[${BALES}];
const vec2 WTOWER = vec2(${WTOWER[0]}.0, ${WTOWER[1]}.0), BILLB = vec2(${BILLB[0]}.0, ${BILLB[1]}.0);
const vec2 PIVOTC = vec2(${PIVOTC[0]}.0, ${PIVOTC[1]}.0);
const float PIVOT_ANG = ${PIVOT_ANG}, SPAN = ${SPAN}.0;
const int SPANS = ${SPANS};
// Painted steel in the storm light: a lit side toward the sun, the sky's fill on the rest.
vec3 paintLit(vec3 alb, vec3 P, float side) {
  float sun = 1.0 - sunCover(P * 0.001);
  return alb * (uSunCol * 0.5 * sun * (0.55 + 0.45 * side) + uAmb * 0.55);
}
// A thing's frame as it falls about its foot: q in metres from the foot, turned by ang toward kf.
// The turned part settles by rest metres; a fall toward the eye shortens, not swings.
vec2 fallFrame(vec2 q, float ang, float kf, float rest) {
  float ca = cos(ang), sa = sin(ang) * kf, L = max(length(vec2(sa, ca)), 0.35);
  vec2 ax = vec2(sa, ca) / max(length(vec2(sa, ca)), 1e-5), qa = q - vec2(0.0, rest);
  return vec2(ax.y * qa.x - ax.x * qa.y, (ax.x * qa.x + ax.y * qa.y) / L);
}

// The water tower: four legs, a riser, a round tank under a low cone, 40 m to the top.
// Past 60 m/s the legs buckle and it leans; past 72 it goes down, the tank on the ground.
void waterTower(vec2 s, vec3 rd, float px) {
  vec4 st = uInfra[0];
  vec3 P = vec3(WTOWER.x, 0.0, WTOWER.y);
  float z = depthOf(P), m = uFoc / z;
  vec2 q = (s - proj(P)) / m;
  if (abs(q.x) > 46.0 || q.y < -9.0 || q.y > 46.0) return;
  float v = st.x, lean = fStage(v, 60.0, 72.0), down = fStage(v, 72.0, 82.0);
  vec2 dir = length(st.yz) > 0.01 ? normalize(st.yz) : vec2(1.0, 0.0);
  vec2 ql = fallFrame(q, 0.22 * lean + 1.35 * down, screenAlong(P, dir), 7.0 * down);
  // The legs splay from the tank to the ground; the bracing is too fine to see from here.
  float k = 0.0, sx, u;
  for (int i = 0; i < 2; i++) {
    float sg = i == 0 ? -1.0 : 1.0;
    k = max(k, segCover(ql * m, vec2(5.5 * sg, 0.0) * m, vec2(3.8 * sg, 30.0) * m, 0.35 * m, px, sx, u));
  }
  k = max(k, segCover(ql * m, vec2(0.0, 0.0), vec2(0.0, 30.0) * m, 0.5 * m, px, sx, u));
  vec3 grey = paintLit(vec3(0.42, 0.43, 0.42), P, 0.5);
  put(plainHaze(grey * 0.8, rd, z), k, z);
  // The tank: a squat ball, lit on the sun's side; a cone and a finial on top.
  vec2 tq = (ql - vec2(0.0, 35.0)) / vec2(7.0, 5.5);
  float kt = fCov((1.0 - length(tq)) * 5.5, m, px);
  float yc = 40.0 + 2.5 * (1.0 - abs(ql.x) / 6.5);
  kt = max(kt, fCov(min(yc - ql.y, 6.5 - abs(ql.x)), m, px) * step(37.0, ql.y));
  float side = clamp(0.5 - 0.5 * tq.x * sign(uSun.x + 1e-3) + 0.3 * tq.y, 0.0, 1.0);
  put(plainHaze(paintLit(vec3(0.55, 0.56, 0.55), P, side), rd, z), kt, z);
}
// The billboard: two steel posts, a 12 by 4 m panel 5 m up, its print long faded. No words.
// Strong wind strips the panel strip by strip, then bends the posts down.
void billboard(vec2 s, vec3 rd, float px) {
  vec4 st = uInfra[1];
  vec3 P = vec3(BILLB.x, 0.0, BILLB.y);
  float z = depthOf(P), m = uFoc / z;
  vec2 q = (s - proj(P)) / m;
  if (abs(q.x) > 16.0 || q.y < -1.0 || q.y > 14.0) return;
  float v = st.x, tear = fStage(v, 32.0, 52.0), bend = fStage(v, 52.0, 68.0);
  vec2 dir = length(st.yz) > 0.01 ? normalize(st.yz) : vec2(1.0, 0.0);
  vec2 ql = fallFrame(q, 1.3 * bend, screenAlong(P, dir), 0.0);
  float k = 0.0, sx, u;
  for (int i = 0; i < 2; i++) k = max(k, segCover(ql * m, vec2(3.5 * float(2 * i - 1), 0.0) * m, vec2(3.5 * float(2 * i - 1), 9.0) * m, 0.18 * m, px, sx, u));
  put(plainHaze(paintLit(vec3(0.12, 0.12, 0.12), P, 0.5), rd, z), k, z);
  // The panel: eight strips; each goes at its own wind.
  float strip = floor((ql.x + 6.0) / 1.5);
  float kp = fCov(min(6.0 - abs(ql.x), min(ql.y - 5.0, 9.0 - ql.y)), m, px) * step(tear * 1.05, th(vec2(strip, 3.3)));
  // The print: a pale ground, a broad faded block, a dark band; weathered streaks run down it.
  vec3 alb = mix(vec3(0.55, 0.53, 0.48), vec3(0.3, 0.38, 0.45), step(ql.x, -1.0) * step(5.6, ql.y));
  alb = mix(alb, vec3(0.12, 0.1, 0.09), step(abs(ql.y - 5.6), 0.35));
  alb *= 0.85 + 0.15 * vn(vec2(ql.x * 3.0, ql.y * 0.4));
  put(plainHaze(paintLit(alb, P, 0.8), rd, z), kp, z);
}
// The centre pivot: a pipe on wheeled A-frame towers, 4.5 m up, sagging truss below each span.
// A span overturns in a strong wind and lies twisted; the strongest scatters it.
void pivot(vec2 s, vec3 rd, float px) {
  vec3 C = vec3(PIVOTC.x, 0.0, PIVOTC.y);
  float zc = depthOf(C), mc = uFoc / zc;
  // Everything stands within 5 m of the ground: a thin band on the screen.
  if (abs(s.y - proj(C).y) > 8.0 * mc + 2.0 * px) return;
  vec2 ad = vec2(cos(PIVOT_ANG), sin(PIVOT_ANG)), nd = vec2(-ad.y, ad.x);
  vec3 steel = paintLit(vec3(0.38, 0.39, 0.4), C, 0.6);
  for (int i = 0; i < SPANS; i++) {
    float fi = float(i);
    vec2 a = PIVOTC + ad * SPAN * fi, b = PIVOTC + ad * SPAN * (fi + 1.0), mid = (a + b) * 0.5;
    vec2 pm = proj(vec3(mid.x, 0.0, mid.y));
    float zm = depthOf(vec3(mid.x, 0.0, mid.y)), m = uFoc / zm;
    if (abs(s.x - pm.x) > 40.0 * m + 2.0 * px) continue;
    float v = dmgAt(mid).x, flip = fStage(v, 42.0, 52.0), gone = fStage(v, 70.0, 85.0);
    if (gone >= 1.0) continue;
    // An overturned span lies low and twisted to one side.
    float hk = mix(1.0, 0.18, flip);
    vec2 tw = nd * flip * (4.0 + 3.0 * th(vec2(fi, 2.0)));
    float k = 0.0, sx, u;
    vec3 A = vec3(a.x, 4.5 * hk, a.y), B = vec3(b.x + tw.x, 4.5 * hk, b.y + tw.y);
    k = max(k, segCover(s, proj(A), proj(B), 0.09 * m, px, sx, u));
    // The lower chord: a shallow arch under the pipe.
    for (int j = 0; j < 4; j++) {
      float u0 = float(j) / 4.0, u1 = float(j + 1) / 4.0;
      vec3 L0 = mix(A, B, u0) - vec3(0.0, 1.6 * hk * sin(3.14159 * u0), 0.0), L1 = mix(A, B, u1) - vec3(0.0, 1.6 * hk * sin(3.14159 * u1), 0.0);
      k = max(k, segCover(s, proj(L0), proj(L1), 0.04 * m, px, sx, u) * 0.8);
    }
    // The tower at the span's far end: an A-frame to the ground.
    vec3 T = vec3(b.x + tw.x, 0.0, b.y + tw.y);
    for (int j = 0; j < 2; j++) {
      vec3 F = T + vec3(nd.x, 0.0, nd.y) * (j == 0 ? -1.6 : 1.6) * (1.0 - flip * 0.6);
      k = max(k, segCover(s, proj(F), proj(B), 0.08 * m, px, sx, u));
    }
    put(plainHaze(steel, rd, zm), k * (1.0 - gone), zm);
  }
}
// The round bales: straw, 1.5 m across and 1.2 m long, lying on their sides.
// Seen end-on a bale is a disc with its spiral; side-on a squarish drum with its wrap.
void bales(vec2 s, vec3 rd, float px) {
  for (int i = 0; i < ${BALES}; i++) {
    vec4 a = uBale[i], b = uBaleB[i];
    if (b.x <= 0.0) continue;
    vec3 P = vec3(a.x, a.z + 0.75, a.y);
    float z = depthOf(P);
    if (z < 20.0) continue;
    float m = uFoc / z;
    vec2 c = proj(P), q = (s - c) / m;
    if (abs(q.x) > 1.6 || abs(q.y) > 1.6) continue;
    // How much of the bale's side shows: 1 side-on, 0 end-on.
    float side = abs(screenAlong(P, vec2(cos(b.y), sin(b.y))));
    vec2 hs = vec2(mix(0.75, 0.62, side), 0.75);
    float e = mix(2.0, 5.0, side);
    vec2 qq = abs(q) / hs;
    float d = 1.0 - pow(pow(qq.x, e) + pow(qq.y, e), 1.0 / e);
    float k = fCov(d * 0.7, m, px);
    if (k <= 0.0) continue;
    // The spiral on the end, and the net's bands rolling round the drum.
    float rings = 0.5 + 0.5 * sin(length(q) * 26.0 - atan(q.y, q.x) * 0.6);
    float bands = 0.5 + 0.5 * sin(q.y * 9.0 + a.w * 3.0);
    vec3 alb = vec3(0.4, 0.32, 0.16) * mix(mix(0.8, 1.0, bands), mix(0.7, 1.0, rings), 1.0 - side);
    float lit = clamp(0.6 - 0.4 * q.y / 0.75, 0.3, 1.0);
    put(plainHaze(paintLit(alb, P, lit), rd, z), k, z);
  }
}
// Every piece of infrastructure, laid into the objects' layers.
void infra(vec2 s, vec3 rd, float px) {
  if (s.y < -0.4 || s.y > 0.08) return;
  pivot(s, rd, px);
  waterTower(s, rd, px);
  billboard(s, rd, px);
  bales(s, rd, px);
}
`;
