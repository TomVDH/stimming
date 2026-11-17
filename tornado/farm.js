// Tornado alley: the farm about a mile off to the left, and what a tornado does to it.
// A house, a barn, two grain bins, a windmill and a hedge, drawn flat on the screen in the scene pass.
// The CPU part keeps each building's peak wind (damage.js sites) and throws debris as it fails.
// The GLSL part draws each building by its damage: shingles and siding, the roof, the walls, the slab.
import { damageSite, debrisThrow } from './damage.js';

/* ---------- the farm ---------- */
// The farm's place in world metres: main.js drew it here first.
const FX = -420, FZ = -1500;
// Each site, in the order the GLSL reads uFarm: house, barn, windmill, big bin, small bin.
const SITES = [[FX + 3, FZ], [FX - 26, FZ - 20], [FX + 25, FZ + 30], [FX - 52, FZ - 12], [FX - 61, FZ - 8]];
// The winds, m/s, at which each site throws debris: each stage of its failure.
const STEPS = [[40, 50, 58, 68, 82], [36, 46, 54, 64, 76], [40, 56, 64], [50, 60, 68], [50, 60, 68]];
// How much each site throws at each stage, 0 to 1.
const LOAD = [0.5, 0.6, 0.3, 0.5, 0.4];
export const FARM_N = SITES.length;

export function farmState(D) {
  return { sites: SITES.map(([x, z]) => damageSite(D, x, z)), done: SITES.map(() => 0), u: new Float32Array(8 * 4) };
}
// One step: a site that passes a stage throws its debris into the wind.
export function farmStep(F, D, simT) {
  F.sites.forEach((s, i) => {
    // Clear mends the site: its stages start again.
    if (s.peak <= 0) F.done[i] = 0;
    while (F.done[i] < STEPS[i].length && s.peak >= STEPS[i][F.done[i]]) {
      debrisThrow(D, s.x, s.z, simT, LOAD[i] * (0.6 + 0.4 * F.done[i] / STEPS[i].length));
      F.done[i]++;
    }
  });
}
// Packs each site: peak wind, its direction x and z, and the time it last rose.
export function farmUniforms(F) {
  F.u.fill(0);
  F.sites.forEach((s, i) => F.u.set([s.peak, s.dx, s.dz, s.t], i * 4));
  return F.u;
}

/* ---------- GLSL ---------- */
// It reads main.js's proj(), depthOf(), hazed(), sunCover(), vn(), th(), uFoc, uWind and uT,
// line.js's put() and swayAmp(), plain.js's treeDmg() and screenAlong(), and damage.js's dmgAt().
export const FARM_GLSL = /* glsl */`
/* ---------- the farm ---------- */
// Each site: peak wind in m/s, its direction (x, z), the time it last rose.
uniform vec4 uFarm[8];
const vec3 FARM = vec3(${FX}.0, 0.0, ${FZ}.0);
// A stage of failure: 0 below wind a, 1 past wind b.
float fStage(float v, float a, float b) { return clamp((v - a) / (b - a), 0.0, 1.0); }
// Coverage of a shape d metres inside its edge, at m screen units per metre.
float fCov(float d, float m, float px) { return clamp(d * m / px + 0.5, 0.0, 1.0); }
// The side the wind came from, on screen: the roof goes from that edge first.
float fSide(vec3 P, vec4 st) { return length(st.yz) > 0.01 && screenAlong(P, st.yz) < 0.0 ? -1.0 : 1.0; }
// Light on a wall facing the eye, as the old farm had it; fk is the sun's share at the farm.
vec3 fLit(float fk) { return uSunCol * fk * 0.42 + uAmb * 0.12; }

// The house: white boards, three windows and a door, a dark gable roof.
// Shingles and siding go first, then the roof from the windward edge, then the walls; at the end a slab.
void fHouse(vec2 s, vec3 rd, float px, float fk) {
  vec4 st = uFarm[0];
  vec3 P = FARM + vec3(3.0, 0.0, 0.0);
  float z = depthOf(P), m = uFoc / z;
  vec2 q = (s - proj(P)) / m;
  if (abs(q.x) > 9.0 || q.y < -1.0 || q.y > 10.0) return;
  float v = st.x, shg = fStage(v, 35.0, 48.0), peel = fStage(v, 48.0, 62.0), wall = fStage(v, 62.0, 80.0), lev = fStage(v, 80.0, 95.0);
  float side = fSide(P, st), hw = 6.0, wh = 5.5;
  // Failing walls break along a ragged top; a levelled house is a low heap, then a bare slab.
  float rag = vn(vec2(q.x * 0.9, 3.1)) + 0.4 * vn(vec2(q.x * 3.0, 7.7));
  float top = wh * mix(1.0, 0.2 + 0.3 * rag, wall) * mix(1.0, 0.12 + 0.1 * rag, lev);
  top = mix(top, 0.25, fStage(v, 92.0, 100.0));
  float kw = fCov(min(hw - abs(q.x), min(q.y, top - q.y)), m, px);
  vec3 lit = fLit(fk);
  // Torn siding shows the dark sheathing behind it; a failed wall shows the dark rooms.
  vec3 wcol = mix(lit, mix(lit, vec3(0.12, 0.1, 0.08) * (lit + uAmb * 0.2), 0.7), step(vn(vec2(q.x * 2.4, q.y * 0.9) + 2.0), shg * 0.4));
  wcol = mix(wcol, vec3(0.03, 0.025, 0.02) * lit * 4.0, step(top, wh - 0.3) * smoothstep(top - 1.2, top, q.y) * 0.7);
  // The windows and the door, dark; blown windows are darker still.
  float win = 0.0;
  for (int i = 0; i < 3; i++) win = max(win, fCov(min(0.6 - abs(q.x - (float(i) - 1.0) * 3.6 + (i == 1 ? 1.8 : 0.0)), min(q.y - 1.3, 2.6 - q.y)), m, px));
  win = max(win, fCov(min(0.5 - abs(q.x - 1.6), min(q.y, 2.2 - q.y)), m, px));
  wcol = mix(wcol, uAmb * mix(0.04, 0.01, shg), win * (1.0 - wall));
  // A debris heap at the foot of a fallen wall: the rubble is the walls' colour, darker.
  if (lev > 0.0) wcol = mix(wcol, wcol * 0.45, lev);
  put(hazed(wcol, rd, z), kw, z);
  // The roof: a gable, its peak 3.2 m over the walls. It goes from the windward edge first.
  float u = q.x / (hw * 1.1);
  float yr = wh + 3.2 * (1.0 - abs(u));
  float kr = fCov(min(min(1.0 - abs(u), yr - q.y), q.y - wh + 0.05), m, px);
  float edge = -1.0 + 2.2 * peel + 0.25 * (vn(vec2(q.y * 1.7, 4.0)) - 0.5) * step(0.01, peel);
  kr *= step(edge, -side * u) * step(wall, 0.01);
  // Missing shingles show the pale deck in patches.
  vec3 rcol = mix(uAmb * 0.05 + uSunCol * fk * 0.02, vec3(0.22, 0.18, 0.13) * (lit + uAmb * 0.3), step(vn(q * 1.4 + 9.0), shg * 0.6));
  put(hazed(rcol, rd, z), kr, z);
}
// The barn: red boards, a white-trimmed door, a gambrel roof. It fails at lower winds than the house.
void fBarn(vec2 s, vec3 rd, float px, float fk) {
  vec4 st = uFarm[1];
  vec3 P = FARM + vec3(-26.0, 0.0, -20.0);
  float z = depthOf(P), m = uFoc / z;
  vec2 q = (s - proj(P)) / m;
  if (abs(q.x) > 12.0 || q.y < -1.0 || q.y > 14.0) return;
  float v = st.x, shg = fStage(v, 32.0, 44.0), peel = fStage(v, 42.0, 55.0), wall = fStage(v, 55.0, 70.0), lev = fStage(v, 70.0, 85.0);
  float side = fSide(P, st), hw = 9.0, wh = 7.0;
  float rag = vn(vec2(q.x * 0.7, 5.3)) + 0.4 * vn(vec2(q.x * 2.6, 1.1));
  float top = wh * mix(1.0, 0.15 + 0.35 * rag, wall) * mix(1.0, 0.1 + 0.12 * rag, lev);
  // A barn wall leans downwind before it goes.
  float lean = side * 0.35 * wall * (1.0 - lev) * q.y / wh;
  float kw = fCov(min(hw - abs(q.x + lean), min(q.y, top - q.y)), m, px);
  vec3 red = (uSunCol * fk) * vec3(0.16, 0.035, 0.025) + uAmb * vec3(0.03, 0.01, 0.01);
  // Torn boards open dark gaps in the wall.
  red = mix(red, red * 0.25, step(vn(vec2(q.x * 3.5, q.y * 0.25) + 4.0), shg * 0.4));
  // The big door: a white frame with a cross.
  vec2 dq = vec2(q.x + lean, q.y - 2.2);
  float frame = step(abs(dq.x), 2.2) * step(abs(dq.y), 2.2) * (1.0 - step(abs(dq.x), 1.95) * step(abs(dq.y), 1.95));
  float cross = step(abs(dq.x), 2.0) * step(abs(dq.y), 2.0) * step(min(abs(dq.x - dq.y), abs(dq.x + dq.y)), 0.2);
  red = mix(red, fLit(fk) * 0.9, max(frame, cross) * (1.0 - wall));
  if (lev > 0.0) red = mix(red, red * 0.5 + vec3(0.02, 0.015, 0.01), lev);
  put(hazed(red, rd, -P.z), kw, z);
  // The gambrel roof: steep low slopes, a shallow top, 5 m over the walls.
  float u = (q.x + lean) / hw;
  float au = abs(u);
  float yr = wh + (au < 0.55 ? 5.0 - au * 2.0 : 3.9 - (au - 0.55) * 8.6);
  float kr = fCov(min(min(1.0 - au, yr - q.y), q.y - wh + 0.05), m, px);
  float edge = -1.0 + 2.2 * peel + 0.3 * (vn(vec2(q.y * 1.3, 2.0)) - 0.5) * step(0.01, peel);
  kr *= step(edge, -side * u) * step(wall, 0.3);
  // The roof is painted red as the walls; pale deck shows where sheets have gone.
  vec3 rcol = mix((uSunCol * fk) * vec3(0.16, 0.035, 0.025) + uAmb * vec3(0.03, 0.01, 0.01), vec3(0.15, 0.12, 0.09) * (uSunCol * fk * 0.5 + uAmb * 0.5), step(vn(vec2(q.x * 1.1, q.y * 0.3) + 6.0), shg * 0.6));
  put(hazed(rcol, rd, z), kr, z);
}
// A grain bin: corrugated steel, bright where the sun reaches, a cone on top.
// Strong wind crumples it, then rolls it off downwind, then takes it away.
void fBin(vec2 s, vec3 rd, float px, float fk, int i, vec3 P0, float r, float h) {
  vec4 st = uFarm[i];
  float v = st.x, dent = fStage(v, 45.0, 55.0), roll = fStage(v, 55.0, 65.0), gone = fStage(v, 65.0, 75.0);
  vec2 wd = length(st.yz) > 0.01 ? normalize(st.yz) : vec2(1.0, 0.0);
  vec3 P = P0 + vec3(wd.x, 0.0, wd.y) * 45.0 * roll;
  float z = depthOf(P), m = uFoc / z;
  vec2 q = (s - proj(P)) / m;
  if (abs(q.x) > h + r + 2.0 || q.y < -1.0 || q.y > h + r + 2.0) return;
  float side = fSide(P, st);
  // A rolled bin lies on its side: the cylinder's length runs across the screen.
  vec2 ql = roll > 0.5 ? vec2(q.y - r, q.x * side) : q;
  // A crumpled bin leans over at the top and its walls buckle in.
  ql.x -= side * dent * 0.9 * ql.y / h * (1.0 - step(0.5, roll));
  float buck = dent * 0.5 * vn(vec2(ql.y * 1.5, float(i)));
  float ux = ql.x / r;
  float kw = fCov(min(r - buck - abs(ql.x), min(ql.y, h - ql.y)), m, px);
  float kc = fCov(min(r - abs(ql.x), (h + 2.2 * r / 4.5 * (1.0 - abs(ux)) * (1.0 - dent)) - ql.y), m, px) * step(h - 0.05, ql.y);
  float k = max(kw, kc) * (1.0 - gone);
  if (k <= 0.0) return;
  // The rings of corrugation and the cylinder's shade.
  float sh = 0.55 + 0.45 * clamp(-ux * 0.7 + 0.5, 0.0, 1.0);
  vec3 steel = vec3(0.36, 0.37, 0.38) * (uSunCol * 0.5 * fk * sh + uAmb * 0.55) * (0.92 + 0.08 * sin(ql.y * 9.0));
  steel += uSunCol * 0.08 * fk * pow(clamp(1.0 - abs(ux + 0.3), 0.0, 1.0), 6.0) * (1.0 - dent);
  put(hazed(steel, rd, z), k, z);
}
// The windmill: a lattice tower and a wheel of blades that turns with the wind.
// The wheel spins up as a tornado nears and is torn off; then the tower bends and goes down.
void fMill(vec2 s, vec3 rd, float px, float fk) {
  vec4 st = uFarm[2];
  vec3 W = FARM + vec3(25.0, 0.0, 30.0);
  float zw = depthOf(W), m = uFoc / zw;
  vec2 q = (s - proj(W)) / m;
  if (abs(q.x) > 17.0 || q.y < -1.0 || q.y > 17.0) return;
  float v = st.x, blade = fStage(v, 36.0, 44.0), bend = fStage(v, 48.0, 58.0), down = fStage(v, 58.0, 66.0);
  float side = fSide(W, st);
  // The tower turns about its foot: a bend first, then all the way down.
  float a = side * (0.3 * bend + 1.25 * down);
  vec2 ql = mat2(cos(a), -sin(a), sin(a), cos(a)) * q;
  float w = mix(1.0, 0.25, clamp(ql.y / 13.0, 0.0, 1.0));
  vec3 steel = uAmb * 0.05 + (uSunCol * fk) * 0.03;
  float k = fCov(min(w - abs(ql.x), min(ql.y, 13.0 - ql.y)), m, px) * 0.8;
  // The wheel: its blades blur as it races; once torn off it is gone.
  float nearK;
  swayAmp(W.xz, nearK);
  vec2 r = ql - vec2(0.0, 13.0);
  float ang = atan(r.y, r.x) + uT * (0.8 + 3.0 * uWind + 14.0 * nearK);
  float blades = mix(smoothstep(0.2, 0.6, abs(sin(ang * 9.0))) * 0.5 + 0.5, 0.55, clamp(nearK * 2.0, 0.0, 1.0));
  k = max(k, fCov(2.4 - length(r), m, px) * blades * (1.0 - blade));
  put(hazed(steel, rd, zw), k, zw);
}
// The hedge behind the house: a dark ragged row, thinned and laid down by the damage field.
void fHedge(vec2 s, vec3 rd, float px, float fk) {
  float z = -FARM.z;
  vec2 t0 = proj(FARM + vec3(-60.0, 0.0, -40.0)), t1 = proj(FARM + vec3(30.0, 0.0, -40.0));
  if (s.x < t0.x || s.x > t1.x) return;
  float u = (s.x - t0.x) / (t1.x - t0.x);
  vec2 xz = FARM.xz + vec2(-60.0 + 90.0 * u, -40.0), fdir;
  vec4 dm = treeDmg(xz, 11.0 + floor(u * 10.0), fdir);
  float h = (9.0 + 6.0 * vn(vec2(u * 9.0, 1.3)) * (0.4 + 0.6 * sin(u * 3.14159))) * (1.0 - 0.3 * dm.y) * mix(1.0, 0.15 + 0.2 * vn(vec2(u * 20.0, 3.0)), dm.z) * (1.0 - 0.6 * dm.w);
  float top = proj(vec3(xz.x, h, xz.y)).y;
  float k = clamp((top - s.y) / px + 0.5, 0.0, 1.0) * step(t0.y, s.y) * mix(1.0, 0.5, dm.x);
  put(hazed(vec3(0.012, 0.016, 0.008) + (uSunCol * fk) * 0.012, rd, z), k, z);
}
// The yard after a strong tornado: boards, tin and rubble strewn downwind over the field.
void fStrewn(vec2 s, vec3 rd, float px) {
  if (rd.y >= 0.0) return;
  float v = max(max(uFarm[0].x, uFarm[1].x), uFarm[2].x);
  float k0 = fStage(v, 45.0, 80.0);
  if (k0 <= 0.0) return;
  vec3 G = vec3(0.0, CAMH, 0.0) + rd * (CAMH / -rd.y);
  vec2 wd = length(uFarm[1].yz) > 0.01 ? normalize(uFarm[1].yz) : vec2(1.0, 0.0);
  vec2 d = G.xz - (FARM.xz + vec2(-15.0, -5.0));
  // The field runs downwind of the yard, wider as it goes.
  float along = dot(d, wd), across = dot(d, vec2(-wd.y, wd.x));
  float reach = 60.0 + 260.0 * k0;
  float f = smoothstep(reach, reach * 0.3, along) * smoothstep(-40.0, 10.0, along) * smoothstep(40.0 + along * 0.5, 10.0, abs(across));
  if (f <= 0.0) return;
  float n = vn(G.xz * 0.35) * 0.6 + vn(G.xz * 1.3) * 0.4;
  float k = f * k0 * smoothstep(0.45, 0.75, n);
  vec3 col = mix(vec3(0.05, 0.04, 0.03), vec3(0.3, 0.3, 0.3), step(0.8, vn(G.xz * 2.1))) * (uSunCol * 0.4 + uAmb * 0.5);
  float z = depthOf(G);
  put(hazed(col, rd, z), k * 0.85, z);
}
// The whole farm. c is unused: every part lays itself into the objects' layers.
void farm(inout vec3 c, vec2 s, vec3 rd, float px) {
  // The yard, its tallest part and the strewn field downwind, in screen units.
  vec2 at = proj(FARM);
  float m = uFoc / -FARM.z;
  if (abs(s.x - at.x) > 380.0 * m || s.y > at.y + 25.0 * m) return;
  // The farm stands in the deck's shade or out of it as one.
  float fk = 1.0 - sunCover(FARM * 0.001);
  fStrewn(s, rd, px);
  fHedge(s, rd, px, fk);
  fBarn(s, rd, px, fk);
  fBin(s, rd, px, fk, 3, FARM + vec3(-52.0, 0.0, -12.0), 3.6, 7.0);
  fBin(s, rd, px, fk, 4, FARM + vec3(-61.0, 0.0, -8.0), 3.0, 6.0);
  fHouse(s, rd, px, fk);
  fMill(s, rd, px, fk);
}
`;
