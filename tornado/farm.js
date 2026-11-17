// Tornado alley: the farm about a mile off to the left, and what a tornado does to it.
// A house, a barn and two grain bins ray-traced as lit solids; a windmill and a windbreak of trees.
// The CPU part keeps each building's peak wind (damage.js sites) and throws debris as it fails.
// The GLSL part draws each building by its damage: shingles and siding, the roof, the walls, the slab.
import { damageSite, debrisThrow } from './damage.js';

/* ---------- the farm ---------- */
// The farm's place in world metres: main.js drew it here first.
export const FX = -420, FZ = -1500;
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
// It reads main.js's proj(), depthOf(), hazed(), sunCover(), toWorld(), vn(), th(), CAMH, uFoc, uWind and uT,
// line.js's put(), swayAmp(), lineEnv() and ggx(), road.js's envBRDF(), plain.js's loneTree(), treeDmg()
// and screenAlong(), damage.js's dmgAt(), and traffic.js's hull tracer (hBeg, hPl, hPq, hBox, hEnd).
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

/* ---------- the buildings, in 3D ---------- */
// The yard turns 0.45 rad from the view's axis, so each building shows an end and a side.
const float YARD = 0.45;
const vec3 YX = vec3(cos(YARD), 0.0, sin(YARD)), YZ = vec3(-sin(YARD), 0.0, cos(YARD));
// The nearest hit's point in its own building's frame, and its building's damage stages.
vec3 gFH = vec3(0.0);
// Damage stages for the house and the barn: shingles, roof, walls, levelled, slab.
vec4 gHS = vec4(0.0), gBS = vec4(0.0);
float gHSlab = 0.0;
// The end the wind came from, along each building's long axis: +1 or -1.
float fUp(vec4 st) { float d = dot(st.yz, vec2(YX.x, YX.z)); return length(st.yz) > 0.01 && d > 0.0 ? -1.0 : 1.0; }
// Into a building's frame: x along its ridge, y up, z across.
vec3 fTo(vec3 p, vec3 c) { vec3 d = p - c; return vec3(dot(d, YX), d.y, dot(d, YZ)); }
vec3 fDir(vec3 d) { return vec3(dot(d, YX), d.y, dot(d, YZ)); }
vec3 fFrom(vec3 n) { return YX * n.x + vec3(0.0, n.y, 0.0) + YZ * n.z; }
// The house: 12 by 8 m, walls 5.5 m, a gable roof 3 m over them with a 0.45 m eave.
// ids: 21 wall, 22 roof.
void fHouse3(vec3 ro, vec3 rd, inout float t, inout vec3 n, inout int id) {
  vec3 o = fTo(ro, FARM + vec3(3.0, 0.0, 0.0)), d = fDir(rd);
  float t0 = t, up = fUp(uFarm[0]);
  // Failing walls break off along a slanted top; a levelled house is a heap, then a slab.
  float top = mix(5.5 * mix(1.0, 0.35, gHS.z) * mix(1.0, 0.1, gHS.w), 0.25, gHSlab);
  float k = 0.3 * gHS.z * (1.0 - gHS.w) * up;
  hBeg(); hBox(o, d, vec3(0.0, 2.75, 0.0), vec3(6.0, 2.75, 4.0), 0.04);
  if (gHS.z > 0.0) hPl(o, d, normalize(vec3(-k, 1.0, 0.0)), top / length(vec3(-k, 1.0, 0.0)));
  hEnd(21, t, n, id);
  // The roof stands while the walls do; it goes from the windward end first.
  if (gHS.z < 0.01 && gHS.y < 1.0) {
    hBeg(); hPl(o, d, vec3(0.0, -1.0, 0.0), -5.4);
    hPq(o, d, vec3(0.0, 4.45, 3.0), vec3(0.0, 8.5, 0.0)); hPq(o, d, vec3(0.0, 4.45, -3.0), vec3(0.0, 8.5, 0.0));
    hPl(o, d, vec3(1.0, 0.0, 0.0), 6.3); hPl(o, d, vec3(-1.0, 0.0, 0.0), 6.3);
    if (gHS.y > 0.0) hPl(o, d, vec3(up, 0.0, 0.0), 6.3 - 12.6 * gHS.y);
    hEnd(22, t, n, id);
  }
  if (t < t0) gFH = o + d * t;
}
// The barn: 18 by 12 m, walls 7 m, a gambrel roof: steep low slopes to a knee, shallow to a 12 m ridge.
// ids: 23 wall, 24 roof.
void fBarn3(vec3 ro, vec3 rd, inout float t, inout vec3 n, inout int id) {
  vec3 o = fTo(ro, FARM + vec3(-26.0, 0.0, -20.0)), d = fDir(rd);
  float t0 = t, up = fUp(uFarm[1]);
  float top = 7.0 * mix(1.0, 0.3, gBS.z) * mix(1.0, 0.12, gBS.w);
  float k = 0.35 * gBS.z * (1.0 - gBS.w) * up;
  hBeg(); hBox(o, d, vec3(0.0, 3.5, 0.0), vec3(9.0, 3.5, 6.0), 0.04);
  if (gBS.z > 0.0) hPl(o, d, normalize(vec3(-k, 1.0, 0.0)), top / length(vec3(-k, 1.0, 0.0)));
  hEnd(23, t, n, id);
  if (gBS.z < 0.3 && gBS.y < 1.0) {
    hBeg(); hPl(o, d, vec3(0.0, -1.0, 0.0), -6.9);
    hPq(o, d, vec3(0.0, 2.7, 3.2), vec3(0.0, 7.0, 6.3)); hPq(o, d, vec3(0.0, 2.7, -3.2), vec3(0.0, 7.0, -6.3));
    hPq(o, d, vec3(0.0, 3.6, 1.8), vec3(0.0, 12.0, 0.0)); hPq(o, d, vec3(0.0, 3.6, -1.8), vec3(0.0, 12.0, 0.0));
    hPl(o, d, vec3(1.0, 0.0, 0.0), 9.3); hPl(o, d, vec3(-1.0, 0.0, 0.0), 9.3);
    if (gBS.y > 0.0) hPl(o, d, vec3(up, 0.0, 0.0), 9.3 - 18.6 * gBS.y);
    hEnd(24, t, n, id);
  }
  if (t < t0) gFH = o + d * t;
}
// A grain bin: a corrugated cylinder of radius r and height h, a cone 0.3 r high on top.
// Crumpled, it squats and its cone flattens; rolled, it lies on its side downwind; then it is gone.
// ids: 25 wall, 26 cone.
void fBin3(vec3 ro, vec3 rd, int i, vec3 B, float r, float h, inout float t, inout vec3 n, inout int id) {
  vec4 st = uFarm[i];
  float v = st.x, dent = fStage(v, 45.0, 55.0), roll = fStage(v, 55.0, 65.0), gone = fStage(v, 65.0, 75.0);
  if (gone >= 1.0) return;
  vec2 wd = length(st.yz) > 0.01 ? normalize(st.yz) : vec2(1.0, 0.0);
  // The bin's frame: ay its axis; a rolled bin's axis lies across the wind.
  vec3 ax = YX, ay = vec3(0.0, 1.0, 0.0), az = YZ, c = B;
  h *= 1.0 - 0.25 * dent;
  if (roll > 0.5) { ay = vec3(-wd.y, 0.0, wd.x); ax = vec3(0.0, 1.0, 0.0); az = vec3(wd.x, 0.0, wd.y); c = B + az * 45.0 * roll + vec3(0.0, r, 0.0) - ay * h * 0.5; }
  vec3 p = ro - c, o = vec3(dot(p, ax), dot(p, ay), dot(p, az)), d = vec3(dot(rd, ax), dot(rd, ay), dot(rd, az));
  float t0 = t;
  // The wall: from the ray's closest approach to the axis, so it holds up a mile off.
  vec2 oq = o.xz, dq = d.xz;
  float A = dot(dq, dq);
  if (A > 1e-9) {
    float tc = -dot(oq, dq) / A;
    vec2 mq = oq + dq * tc;
    float D = r * r - dot(mq, mq);
    if (D > 0.0) {
      float th0 = tc - sqrt(D / A), y = o.y + d.y * th0;
      if (th0 > 0.0 && th0 < t && y > 0.0 && y < h) { t = th0; vec2 q = oq + dq * th0; n = vec3(q.x, 0.0, q.y) / r; id = 25; }
    }
  }
  // The cone: radius r at h, closing to its apex.
  float hc = r * 0.3 * (1.0 - dent), kk = r / max(hc, 0.05);
  vec3 a = o - vec3(0.0, h + hc, 0.0);
  float qa = d.x * d.x + d.z * d.z - kk * kk * d.y * d.y, qb = a.x * d.x + a.z * d.z - kk * kk * a.y * d.y, qc = a.x * a.x + a.z * a.z - kk * kk * a.y * a.y;
  float disc = qb * qb - qa * qc;
  if (disc > 0.0 && abs(qa) > 1e-9) {
    for (int j = 0; j < 2; j++) {
      float tt = (-qb + (j == 0 ? -1.0 : 1.0) * sqrt(disc)) / qa, y = o.y + d.y * tt;
      if (tt > 0.0 && tt < t && y >= h && y <= h + hc) { t = tt; vec3 q = o + d * tt; n = normalize(vec3(q.x, kk * kk * (h + hc - q.y), q.z)); id = 26; break; }
    }
  }
  // Back to world normals for the shading.
  if (t < t0) { gFH = o + d * t; n = normalize(ax * n.x + ay * n.y + az * n.z); n = fDir(n); }
}
// Every building: the nearest hit's id, distance and normal in the yard's frame.
int fYard(vec3 ro, vec3 rd, out float t, out vec3 n) {
  t = 1e9; n = vec3(0.0, 1.0, 0.0);
  int id = 0;
  fBarn3(ro, rd, t, n, id);
  fHouse3(ro, rd, t, n, id);
  fBin3(ro, rd, 3, FARM + vec3(-52.0, 0.0, -12.0), 3.6, 7.0, t, n, id);
  fBin3(ro, rd, 4, FARM + vec3(-61.0, 0.0, -8.0), 3.0, 6.0, t, n, id);
  return id;
}
// A lit surface in the storm light: sun, sky fill with occlusion, the sky's reflection and a capped glint.
vec3 fLight(vec3 alb, vec3 N, vec3 P, vec3 V, float rough, float f0, float ao) {
  float sun = 1.0 - sunCover(P * 0.001);
  vec3 L = normalize(uSun + vec3(0.0, 1e-3, 0.0)), H = normalize(L + V);
  float nl = max(dot(N, L), 0.0), nv = max(dot(N, V), 0.05);
  vec2 ab = envBRDF(rough, nv);
  vec3 c = alb * (uSunCol * 0.9 * sun * nl + uAmb * (0.45 + 0.25 * N.y) * ao);
  c += lineEnv(reflect(-V, N)) * (f0 * ab.x + ab.y) * ao;
  return c + uSunCol * sun * min(ggx(max(dot(N, H), 0.0), rough), 2.5) * nl * f0;
}
// The colour of a building hit. h is the hit in its building's frame, nl the normal in the yard's frame.
// fp is a pixel's width in metres there: fine detail fades to its mean below it.
vec3 fShade(int id, vec3 h, vec3 nl, vec3 P, vec3 V, float fp) {
  vec3 N = fFrom(nl);
  float ao = mix(0.6, 1.0, smoothstep(0.0, 1.2, h.y));
  if (id == 21 || id == 23) {
    bool house = id == 21;
    vec4 S = house ? gHS : gBS;
    float top = house ? 5.5 : 7.0;
    // Boards: white lap siding on the house, red vertical boards on the barn; both fade a mile off.
    float fine = 1.0 - smoothstep(0.08, 0.3, fp);
    vec3 alb = house ? vec3(0.62, 0.6, 0.55) * (1.0 - 0.12 * fine * step(0.8, fract(h.y * 5.0)))
                     : vec3(0.3, 0.06, 0.04) * (1.0 - 0.15 * fine * step(0.85, fract((abs(nl.x) > 0.5 ? h.z : h.x) * 4.0)));
    // Torn siding shows the dark sheathing in patches.
    alb = mix(alb, vec3(0.13, 0.11, 0.09), step(vn(vec2(h.x + h.z, h.y * 0.4) * 2.4 + 2.0), S.x * 0.4) * 0.7);
    // The eaves shade the top of each wall while the roof stands.
    float eave = (1.0 - S.z) * (1.0 - S.y) * smoothstep(top - 0.7, top - 0.1, h.y);
    ao *= 1.0 - 0.55 * eave;
    // A broken wall's top shows the dark rooms and rubble.
    if (nl.y > 0.6) { alb = vec3(0.07, 0.06, 0.05); ao *= 0.7; }
    vec3 c = fLight(alb, N, P, V, 0.8, 0.03, ao);
    // Openings: on the house, windows that hold the sky and a door; on the barn, a white-framed door with a cross.
    float along = abs(nl.z) > 0.5 ? h.x : h.z;
    bool longSide = abs(nl.z) > 0.5;
    if (house) {
      float win = 0.0;
      if (longSide) for (int i = 0; i < 3; i++) win = max(win, step(abs(along - (float(i) - 1.0) * 3.6), 0.55) * step(1.3, h.y) * step(h.y, 2.6));
      else win = step(abs(along), 0.5) * step(1.4, h.y) * step(h.y, 2.6);
      float door = longSide ? step(abs(along - 1.8), 0.45) * step(h.y, 2.2) : 0.0;
      if (win > 0.0 && S.z < 0.3) c = mix(uAmb * 0.02 + lineEnv(reflect(-V, N)) * 0.35 * (1.0 - S.x), vec3(0.01), S.x);
      if (door > 0.0) c = fLight(vec3(0.12, 0.08, 0.05), N, P, V, 0.6, 0.03, ao);
    } else if (!longSide && S.z < 0.6) {
      vec2 dq = vec2(along, h.y - 2.2);
      float frame = step(abs(dq.x), 2.2) * step(abs(dq.y), 2.2) * (1.0 - step(abs(dq.x), 1.95) * step(abs(dq.y), 1.95));
      float cross = step(abs(dq.x), 2.0) * step(abs(dq.y), 2.0) * step(min(abs(dq.x - dq.y), abs(dq.x + dq.y)), 0.2);
      if (max(frame, cross) > 0.0) c = fLight(vec3(0.6, 0.58, 0.54), N, P, V, 0.7, 0.03, ao);
    }
    return c;
  }
  if (id == 22 || id == 24) {
    vec4 S = id == 22 ? gHS : gBS;
    // Dark asphalt shingles on the house, red-painted tin on the barn; the pale deck shows where they go.
    vec3 alb = id == 22 ? vec3(0.06, 0.055, 0.055) : vec3(0.26, 0.06, 0.045);
    alb = mix(alb, vec3(0.3, 0.25, 0.18), step(vn(vec2(h.x * 1.1, h.y * 1.4 + h.z) + 9.0), S.x * 0.6));
    // The gable ends under the roof are wall.
    if (abs(nl.x) > 0.9) alb = id == 22 ? vec3(0.62, 0.6, 0.55) : vec3(0.3, 0.06, 0.04);
    if (nl.y < -0.5) return fLight(alb, N, P, V, 0.8, 0.03, 0.35);
    return fLight(alb, N, P, V, id == 24 ? 0.45 : 0.85, id == 24 ? 0.08 : 0.03, 1.0);
  }
  // Galvanised bins: the corrugation's ribs catch the light in rings.
  float rib = 1.0 - smoothstep(0.1, 0.4, fp);
  vec3 Nb = normalize(N + vec3(0.0, 0.25 * sin(h.y * 8.0) * rib, 0.0));
  return fLight(vec3(0.34, 0.35, 0.36), Nb, P, V, 0.5, 0.18, ao);
}
// The yard's ground: occlusion at each building's foot and the shadows the low sun casts.
void fGround(vec2 s, vec3 rd, float px) {
  if (rd.y >= 0.0) return;
  vec3 eye = vec3(0.0, CAMH, 0.0), G = eye + rd * (CAMH / -rd.y);
  vec3 q = fTo(G, FARM + vec3(-20.0, 0.0, -8.0));
  if (abs(q.x) > 120.0 || abs(q.z) > 120.0) return;
  // Each footprint darkens the ground within a couple of metres.
  float occ = 0.0;
  vec3 a = fTo(G, FARM + vec3(3.0, 0.0, 0.0)), b = fTo(G, FARM + vec3(-26.0, 0.0, -20.0));
  vec2 da = max(abs(a.xz) - vec2(6.0, 4.0), 0.0), db = max(abs(b.xz) - vec2(9.0, 6.0), 0.0);
  occ = max(occ, exp(-length(da) / 1.8) * (1.0 - gHSlab));
  occ = max(occ, exp(-length(db) / 2.2) * (1.0 - gBS.w));
  // The low sun's shadow: does a ray from here to the sun meet a building?
  float tS;
  vec3 nS;
  float sh = fYard(G + vec3(0.0, 0.05, 0.0), normalize(uSun + vec3(0.0, 1e-3, 0.0)), tS, nS) > 0 ? 1.0 - sunCover(G * 0.001) : 0.0;
  float k = max(occ * 0.45, sh * 0.5);
  if (k > 0.0) put(vec3(0.0), k, depthOf(G));
}
// The hedge behind the house: a windbreak of lumpy crowns with gaps, each a lone tree in the wind.
void fHedge3(vec2 s, vec3 rd, float px) {
  for (int i = 0; i < 9; i++) {
    float fi = float(i), h0 = th(vec2(fi, 31.0));
    if (h0 < 0.18) continue;
    vec3 P = FARM + vec3(-58.0 + 11.0 * fi + 4.0 * (th(vec2(fi, 32.0)) - 0.5), 0.0, -40.0 - 4.0 * th(vec2(33.0, fi)));
    float r = 3.5 + 2.5 * th(vec2(fi, 34.0));
    loneTree(s, rd, px, P, r, r * (2.0 + 0.5 * h0), 40.0 + fi);
  }
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
  // The damage stages, once per pixel: shingles, roof, walls, levelled.
  float vh = uFarm[0].x, vb = uFarm[1].x;
  gHS = vec4(fStage(vh, 35.0, 48.0), fStage(vh, 48.0, 62.0), fStage(vh, 62.0, 80.0), fStage(vh, 80.0, 95.0));
  gHSlab = fStage(vh, 92.0, 100.0);
  gBS = vec4(fStage(vb, 32.0, 44.0), fStage(vb, 42.0, 55.0), fStage(vb, 55.0, 70.0), fStage(vb, 70.0, 85.0));
  float fk = 1.0 - sunCover(FARM * 0.001);
  fStrewn(s, rd, px);
  fGround(s, rd, px);
  fHedge3(s, rd, px);
  // The buildings, traced at four spots in the pixel: smooth edges at any lens.
  if (abs(s.x - at.x) < 110.0 * m && s.y > at.y - 2.0 * px && s.y < at.y + 14.0 * m) {
    vec3 eye = vec3(0.0, CAMH, 0.0), acc = vec3(0.0);
    float cov = 0.0, zH = -FARM.z;
    for (int k = 0; k < 4; k++) {
      vec2 so = s + (vec2(k & 1, k >> 1) - 0.5) * 0.5 * px + vec2(0.125, -0.125) * px * float(1 - 2 * (k & 1));
      vec3 rw = toWorld(normalize(vec3(so, -uFoc)));
      float t;
      vec3 n;
      int id = fYard(eye, rw, t, n);
      if (id == 0) continue;
      vec3 P = eye + rw * t;
      acc += fShade(id, gFH, n, P, -rw, px * t / uFoc);
      cov += 1.0;
      zH = t;
    }
    if (cov > 0.0) put(hazed(acc / cov, rd, zH), cov / 4.0, zH);
  }
  fMill(s, rd, px, fk);
}
`;
