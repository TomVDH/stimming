// Tornado alley: the far plain's geometry, drawn flat on the screen in the scene pass.
// Shelterbelts and lone trees, far farmsteads with grain bins, and a fence along the road.
// Trees sway in the wind and take damage from the damage field.
// Every shape lays itself into the objects' layers with put(), so it sorts against the funnels.
// It reads main.js's proj(), depthOf(), vn(), th(), hazeCol(), sunCover(), shadeK(), gust() and CAMH,
// line.js's swayAmp() and segCover(), and damage.js's dmgAt().

import { damageSite } from './damage.js';
import { FX, FZ } from './farm.js';

/* ---------- uprooted trees ---------- */
// A near tree that a tornado uproots leaves its spot whole: it rides the inflow to the funnel,
// climbs it tumbling, and fades out there. Far trees only fade where they stand.
export const MAX_FLY = 8;
// How long a flight lasts, in seconds.
const FLY_LIFE = 9;
const fr = x => x - Math.floor(x), f32 = Math.fround;
// main.js's th() in single precision: a seed picks the same spot and kind here as in the GLSL.
function th(a, b) {
  let x = f32(fr(f32(a * 233.34))), y = f32(fr(f32(b * 851.73)));
  const d = f32(f32(x * f32(x + 23.45)) + f32(y * f32(y + 23.45)));
  x = f32(x + d); y = f32(y + d);
  return f32(fr(f32(x * y)));
}
// The near trees, as the GLSL places them: x, z, crown radius, height, seed.
function nearTrees() {
  const T = [[-600, -950, 5, 11, 1], [-260, -2600, 6, 13, 2], [520, -1900, 4.5, 10, 3], [1500, -3500, 7, 15, 4], [-1900, -2200, 5.5, 12, 5], [3400, -2600, 6.5, 14, 6]];
  // farm.js fHedge3(): the farm's windbreak.
  for (let i = 0; i < 9; i++) {
    const h0 = th(i, 31);
    if (h0 < 0.18) continue;
    const r = 3.5 + 2.5 * th(i, 34);
    T.push([FX - 58 + 11 * i + 4 * (th(i, 32) - 0.5), FZ - 40 - 4 * th(33, i), r, r * (2 + 0.5 * h0), 40 + i]);
  }
  // plainTrees(): four trees behind each far farmstead.
  for (const [x, z, sd] of [[-2900, -5200, 1], [1700, -3900, 2], [-1200, -11500, 3]]) {
    for (let i = 0; i < 4; i++) T.push([x - 40 + 24 * i + 8 * th(sd, i), z - 30 - 10 * th(i, sd), 6 + 2 * th(sd + i, 1), 13 + 4 * th(i, sd + 2), sd + i]);
  }
  return T;
}
export function treesState(D) {
  return {
    trees: nearTrees().map(([x, z, r, h, seed]) => ({ x, z, r, h, seed, site: damageSite(D, x, z), gone: false })),
    fly: [], uFly: new Float32Array(MAX_FLY * 4), uFlyB: new Float32Array(MAX_FLY * 4),
  };
}
// A tree goes at its own strength: about 84 m/s, as the GLSL's treeDmg() takes it.
export function treesStep(T, simT) {
  for (const t of T.trees) {
    // Clear mends the field: the tree stands again.
    if (t.site.peak <= 0) { if (t.gone) T.fly.length = 0; t.gone = false; continue; }
    if (t.gone || t.site.peak < 84 + (th(t.seed, 4.7) - 0.5) * 12) continue;
    t.gone = true;
    T.fly.push({ x: t.x, z: t.z, t: simT, seed: t.seed, r: t.r, h: t.h });
    if (T.fly.length > MAX_FLY) T.fly.shift();
  }
}
// Packs the flights still under way: place, start time, seed; then crown radius and height.
export function treesUniforms(T, simT) {
  T.fly = T.fly.filter(f => simT - f.t < FLY_LIFE);
  T.uFly.fill(0); T.uFlyB.fill(0);
  T.fly.forEach((f, i) => { T.uFly.set([f.x, f.z, f.t, f.seed], i * 4); T.uFlyB.set([f.r, f.h, 0, 0], i * 4); });
}

export const PLAIN_GLSL = /* glsl */`
/* ---------- the far plain ---------- */
// Air between the eye and a far shape: the scene's one air model, so every shape sits in the same air.
vec3 plainHaze(vec3 col, vec3 rd, float z) { return hazed(col, rd, z); }
// Foliage in the storm light: dark green, with the sun's share where the deck lets it through.
vec3 leafCol(vec3 P, float k) {
  float sun = 1.0 - sunCover(P * 0.001);
  return mix(vec3(0.035, 0.045, 0.022), vec3(0.05, 0.055, 0.03), k) * (uSunCol * 0.45 * sun + uAmb * 0.5);
}
/* ---------- trees in the wind ---------- */
// A tree's damage from the damage field, by its peak wind and its own strength.
// x: leaves lost, y: limbs lost, z: fallen, w: carried off (only a stripped stump stays).
// dir: the way it falls, in world x and z.
vec4 treeDmg(vec2 xz, float seed, out vec2 dir) {
  vec3 d = dmgAt(xz);
  // Trees differ: some go at 45 m/s, some stand to 57.
  float j = (th(vec2(seed, 4.7)) - 0.5) * 12.0, v = d.x;
  dir = length(d.yz) > 0.05 ? normalize(d.yz) : WDIR;
  // A felled tree keeps most of its leaves; only the strongest wind strips it bare.
  float gone = smoothstep(76.0 + j, 92.0 + j, v);
  return vec4(0.65 * smoothstep(30.0 + j, 62.0 + j, v) + 0.35 * gone, smoothstep(38.0 + j, 58.0 + j, v), smoothstep(45.0 + j, 55.0 + j, v), gone);
}
// A crown's sway at its top, in metres along the world wind (x, z).
// Wind, storm and gusts give a slow swing; a near tornado's inflow bends it hard toward the funnel.
vec2 treeSway(vec2 xz, float h, float seed) {
  vec2 lean = gust(xz, 0.0).xy;
  float nearK;
  swayAmp(xz, nearK);
  float a = length(lean), ph = uT * (0.9 + 0.5 * th(vec2(seed, 1.3))) + seed * 6.3;
  // A steady lean, and a swing about it that grows with the wind.
  float top = h * (0.05 + 0.1 * nearK) * a * (1.0 + 0.45 * sin(ph) + 0.2 * sin(ph * 2.7 + 1.0));
  return a > 1e-4 ? lean / a * top : vec2(0.0);
}
// How far one world metre along xz moves on screen at P, in screen units over m (-1 to 1).
float screenAlong(vec3 P, vec2 xz) { return (proj(P + vec3(xz.x, 0.0, xz.y)).x - proj(P).x) / (uFoc / depthOf(P)); }
// A shelterbelt: a row of trees on the ground from a to b, about h metres tall.
// The view ray's column meets the row's line once; the crown's top is ragged along it.
void belt(vec2 s, vec3 rd, float px, vec2 a, vec2 b, float h, float seed) {
  // The column's ground ray, in world xz, from the eye.
  vec2 d = normalize(rd.xz);
  vec2 e = b - a;
  float den = d.x * e.y - d.y * e.x;
  if (abs(den) < 1e-6) return;
  // Solve eye + d * t = a + e * u.
  float t = (a.x * e.y - a.y * e.x) / den, u = (a.x * d.y - a.y * d.x) / den;
  if (t < 50.0 || u < 0.0 || u > 1.0) return;
  vec2 Q = a + e * u;
  vec3 P = vec3(Q.x, 0.0, Q.y);
  float z = depthOf(P);
  // The crown's top: big trees and gaps along the row, each tree a round head.
  float L = length(e) * u;
  float tree = fract(L / 9.0 + 0.3 * vn(vec2(L * 0.05, seed)));
  float top = h * (0.6 + 0.4 * vn(vec2(L * 0.02, seed + 3.0))) * (0.82 + 0.18 * sqrt(max(1.0 - pow(2.0 * tree - 1.0, 2.0), 0.0)));
  // The row thins at its two ends.
  top *= smoothstep(0.0, 0.04, u) * smoothstep(1.0, 0.96, u);
  // The damage field strips, breaks and lays down the trees along the row.
  vec2 fdir;
  vec4 dm = treeDmg(Q, seed + floor(L / 9.0), fdir);
  top *= (1.0 - 0.3 * dm.y) * mix(1.0, 0.12 + 0.2 * vn(vec2(L * 0.2, seed + 7.0)), dm.z) * (1.0 - 0.6 * dm.w);
  // The crowns swing along the row, each tree a little out of step.
  top += h * 0.03 * length(gust(Q, 0.0).xy) * sin(uT * 1.2 + L * 0.11 + seed);
  float sy = (top - CAMH) / z * uFoc, sb = -CAMH / z * uFoc;
  float k = clamp((sy - s.y) / px + 0.5, 0.0, 1.0) * clamp((s.y - sb) / px + 1.5, 0.0, 1.0);
  if (k <= 0.0) return;
  // Light shows through the thin crowns near the top; stripped crowns let it through all over.
  k *= mix(1.0, 0.75 + 0.25 * vn(vec2(L * 0.8, s.y * 900.0)), max(smoothstep(sy - 3.0 * px, sy, s.y), dm.x * 0.8));
  // Each tree's head is a dome: its top and its sunward side catch the light.
  // Clumps of leaves break it up; their seams sit in shade.
  float sun = 1.0 - sunCover(P * 0.001), vy = clamp((s.y - sb) / max(sy - sb, 1e-6), 0.0, 1.0);
  vec3 Ls = toCam(normalize(uSun + vec3(0.0, 1e-3, 0.0)));
  vec3 N = normalize(vec3((2.0 * tree - 1.0) * 0.8, vy * 1.4 - 0.4, 0.7));
  float cl = vn(vec2(L * 0.7, s.y / px * 0.35 + seed));
  float dif = clamp(dot(N, Ls) * 0.65 + 0.35, 0.0, 1.0) * (0.7 + 0.45 * cl);
  vec3 alb = mix(vec3(0.04, 0.05, 0.024), vec3(0.06, 0.066, 0.034), vn(vec2(L * 0.1, seed)));
  vec3 leaf = alb * (uSunCol * 0.95 * sun * dif + uAmb * (0.3 + 0.35 * vy) * (0.75 + 0.25 * cl));
  vec3 col = mix(leaf, vec3(0.06, 0.055, 0.04) * (uSunCol * 0.4 + uAmb * 0.5), dm.x * 0.6);
  put(plainHaze(col, rd, z), k, z);
}
// A lone tree, by its seed one of three kinds: a spreading deciduous tree, a tall columnar poplar,
// or a conical cedar. r is the deciduous crown's radius, h its top in metres.
// Crowns shade as low-poly facets lit by the true sun, with a rim on the edge toward it.
// The wind leans it; the damage field strips it, breaks it, or lays it down.
void loneTree(vec2 s, vec3 rd, float px, vec3 P, float r, float h0, float seed) {
  float z = depthOf(P);
  if (z < 50.0) return;
  float tk = th(vec2(seed, 6.6));
  int tp = tk < 0.3 ? 1 : tk < 0.55 ? 2 : 0;
  // A poplar stands half again as tall and narrow; a cedar is a broad cone.
  float h = tp == 1 ? h0 * 1.5 : h0;
  vec2 b = proj(P);
  float m = uFoc / z;
  // A fallen tree reaches along the ground: the screen box takes its whole height either way.
  if (abs(s.x - b.x) > h * m + px * 2.0 || s.y < b.y - r * 0.6 * m - px || s.y > b.y + h * m + px) return;
  vec2 fdir;
  vec4 dm = treeDmg(P.xz, seed, fdir);
  vec2 sw = treeSway(P.xz, h, seed);
  // The sway and the fall, as screen leans: k is how much of a world metre shows sideways.
  float swX = screenAlong(P, sw), kf = screenAlong(P, fdir);
  // Most trees snap part way up; some go over at the roots.
  bool snaps = th(vec2(seed, 8.1)) < 0.55;
  float hb = snaps ? h * (0.25 + 0.3 * th(vec2(seed, 2.2))) : 0.0;
  float ang = dm.z * 1.5708;
  // The tree's frame: q in metres from its foot, the part above the break turned about it.
  // As it goes down the turned part settles, so the crown lies on the ground, not in the air.
  vec2 q = (s - b) / m;
  vec2 qa = q - vec2(0.0, mix(hb, r * 0.6, dm.z));
  float ca = cos(ang), sa = sin(ang) * kf;
  // The turn as it looks from here: a tree falling toward the eye shortens, not swings.
  float L = max(length(vec2(sa, ca)), 0.35);
  vec2 ax = vec2(sa, ca) / length(vec2(sa, ca) + 1e-5);
  vec2 ql = vec2(ax.y * qa.x - ax.x * qa.y, (ax.x * qa.x + ax.y * qa.y) / L) + vec2(0.0, hb);
  bool above = ql.y > hb || hb <= 0.0;
  if (!above) ql = q;
  // The sway leans the upper tree a little more than the lower.
  float hy = clamp(ql.y / h, 0.0, 1.0);
  ql.x -= swX * hy * hy * (1.0 - dm.z);
  float sun = 1.0 - sunCover(P * 0.001);
  // The sun in the camera's frame: x right, y up, z toward the eye.
  vec3 Ls = toCam(normalize(uSun + vec3(0.0, 1e-3, 0.0)));
  // Each kind's crown: its centre and half size, where the trunk ends, and its facets' size.
  float W = tp == 1 ? r * 0.38 : tp == 2 ? r * 0.85 : r, y0 = tp == 1 ? 0.2 * h : tp == 2 ? 0.08 * h : h - 1.7 * r;
  vec2 cc = tp == 0 ? vec2(0.0, h - r) : vec2(0.0, mix(y0, h, tp == 1 ? 0.5 : 0.36));
  vec2 cr = tp == 0 ? vec2(r) : vec2(W, (h - y0) * 0.5);
  float cy = tp == 0 ? h - r : y0 + 0.3 * (h - y0), fs = tp == 0 ? r * 0.38 : W * 0.7;
  // The bark: dark and wet.
  // The trunk is round: its sunward side is lit; under the crown it stands in shade.
  float tw0 = 0.32 * (1.0 - 0.3 * hy), sxn = clamp(ql.x / tw0, -1.0, 1.0);
  float tsun = max(dot(vec3(sxn, 0.0, sqrt(1.0 - sxn * sxn)), Ls), 0.0) * mix(1.0, 0.3, smoothstep(y0 - 0.5 * r, y0 + 0.5 * r, ql.y));
  vec3 bark = vec3(0.03, 0.025, 0.02) * (uSunCol * 0.7 * sun * tsun + uAmb * 0.45);
  // Uprooted in the strongest wind: the whole tree leaves its spot, root ball and all.
  // A near tree flies into the funnel as treesFly(); a far one only fades.
  float keep = 1.0 - smoothstep(0.45, 0.55, dm.w);
  // The trunk, to the crown's heart; a broken top's trunk turns with it.
  float kt = clamp((max(tw0 * m, px * 0.5) - abs(ql.x) * m) / px + 0.5, 0.0, 1.0) * min(1.0, 2.0 * tw0 * m / px) * step(0.0, ql.y) * step(ql.y, cy) * keep;
  if (!above && hb > 0.0) kt *= step(q.y, hb + 0.4 * abs(q.x * 3.0));
  // Four limbs from the trunk's top to the lobes, seen most once the leaves go.
  float kl = 0.0;
  for (int i = ROLL0; i < 4; i++) {
    if (!above || tp != 0) break;
    float fi = float(i), lx = (fi - 1.5) * 0.5 * r, ly = cy + (0.15 - 0.25 * abs(fi - 1.5)) * r;
    if (th(vec2(seed + fi, 5.5)) < dm.y * 0.8) continue;
    float sx, u;
    kl = max(kl, segCover(ql * m, vec2(0.0, cy - 0.5 * r) * m, vec2(lx, ly) * m, 0.08 * m, px, sx, u));
  }
  put(plainHaze(bark, rd, z), max(kt, kl) * keep, z);
  // Below a break only the stump stands.
  if (!above) return;
  // The crown's outline; the edge is leafy at three scales, and a scale under a pixel fades to its mean.
  float fine = smoothstep(1.0, 3.0, W * m / px * 0.3), kc = 0.0;
  vec3 Nd = vec3(0.0, 0.0, 1.0);
  if (tp == 2) {
    // A cedar: a cone from near the ground to its tip, its branches in ragged tiers.
    float t = (ql.y - y0) / (h - y0), tier = fract(t * 7.0 + seed);
    float hw = W * pow(max(1.0 - t, 0.0), 0.95) * (1.0 - 0.3 * dm.y) * (0.84 + 0.16 * smoothstep(0.0, 0.9, tier) + 0.06 * fine * (vn(vec2(ql.y * 3.0, seed)) - 0.5));
    kc = clamp((hw - abs(ql.x)) * m / px + 0.5, 0.0, 1.0) * clamp((ql.y - y0) * m / px + 0.5, 0.0, 1.0);
    float nx = clamp(ql.x / max(hw, 1e-3), -1.0, 1.0);
    Nd = normalize(vec3(nx, 0.45, sqrt(1.0 - nx * nx)));
  } else {
    // Lobes: an elm's seven spread wide and a little low, a poplar's six stacked into a column.
    // Each lobe is a dome toward the eye: the one standing highest here gives the normal.
    float hgt = -1e9, cR = 1.0;
    vec2 cn = vec2(0.0);
    for (int i = ROLL0; i < 7; i++) {
      float fi = float(i);
      vec3 lb;
      if (tp == 1) {
        if (i == 6) break;
        float t = fi / 5.0;
        lb = vec3((th(vec2(seed, fi + 0.3)) - 0.5) * 0.3 * W, mix(y0 + 0.6 * W, h - 0.7 * W, t), W * (0.6 + 0.4 * sin(3.14159 * mix(0.15, 0.9, t))) * (0.9 + 0.2 * th(vec2(seed + fi, 2.7))));
      } else {
        vec3 u = i == 0 ? vec3(0.0, 0.15, 0.58) : vec3((th(vec2(seed, fi + 0.3)) - 0.5) * 1.5, (th(vec2(fi + 0.7, seed)) - 0.4) * 0.9, 0.3 + 0.22 * th(vec2(seed + fi, 2.7)));
        lb = vec3(u.x * r, cc.y + u.y * r, u.z * r);
      }
      if (th(vec2(seed + fi, 3.9)) < dm.y * 0.75) continue;
      // Each lobe flutters on its own beat.
      vec2 d = ql - vec2(lb.x + swX * 0.06 * sin(uT * 2.1 + fi * 1.7 + seed), lb.y);
      float an = atan(d.y, d.x);
      float R = lb.z * (1.0 - 0.3 * dm.y) * (0.86 + 0.14 * vn(vec2(an * 2.5 + fi, seed)) + 0.08 * vn(vec2(an * 6.0, seed + fi)) + 0.07 * fine * (vn(vec2(an * 15.0, seed * 3.0 + fi)) - 0.5));
      vec2 de = d * vec2(1.0, tp == 1 ? 0.8 : 1.12);
      float k = clamp((R - length(de)) * m / px + 0.5, 0.0, 1.0), hh = R * R - dot(de, de);
      kc = max(kc, k);
      if (hh > hgt) { hgt = hh; cn = de; cR = R; }
    }
    Nd = vec3(cn / cR, sqrt(max(1.0 - dot(cn, cn) / (cR * cR), 0.0)));
  }
  if (kc <= 0.0) return;
  // Low-poly facets: each cell of the crown is flat, its normal the crown's shape at the cell's centre.
  // Facets show once the crown is a few pixels wide; smaller, the smooth shape shades it.
  float det = smoothstep(2.0, 6.0, W * m / px);
  vec2 g = ql / fs + seed * 3.1, gi = floor(g), gf = fract(g), cv = vec2(0.0), ci = gi;
  float d1 = 9.0, d2 = 9.0;
  for (int y = ROLL0 - 1; y <= 1; y++) for (int x = ROLL0 - 1; x <= 1; x++) {
    vec2 o = vec2(float(x), float(y)), c = o + vec2(th(gi + o), th(gi + o + 17.3)) * 0.8 + 0.1 - gf;
    float dd = dot(c, c);
    if (dd < d1) { d2 = d1; d1 = dd; cv = c; ci = gi + o; } else if (dd < d2) d2 = dd;
  }
  vec2 e = (ql + cv * fs - cc) / cr;
  vec3 Nf = tp == 2 ? normalize(vec3(clamp(e.x, -1.0, 1.0), 0.45, sqrt(max(1.0 - e.x * e.x, 0.05)))) : normalize(vec3(e, sqrt(max(1.0 - dot(e, e), 0.05))));
  // Each facet tilts a little on its own.
  Nf = normalize(Nf + (vec3(th(ci + 3.7), th(ci + 9.1), 0.0) - vec3(0.5, 0.5, 0.0)) * 0.5);
  vec3 N = normalize(mix(Nd, Nf, det));
  // A facet's edge, where two cells meet, sits a touch deeper in the crown.
  float seam = mix(1.0, 0.82 + 0.18 * smoothstep(0.0, 0.25, sqrt(d2) - sqrt(d1)), det);
  // Wrapped light: leaves scatter it, so the shade side is never black.
  float dif = clamp(dot(N, Ls) * 0.65 + 0.35, 0.0, 1.0);
  // The crown shades itself: the side away from the sun, the heart and the underside.
  float away = dot((ql - cc) / cr, -normalize(Ls.xy + 1e-4));
  float self = 1.0 - 0.55 * smoothstep(-0.3, 0.8, away);
  float ao = mix(0.5, 1.0, clamp((ql.y - cc.y + 0.7 * cr.y) / (1.4 * cr.y), 0.0, 1.0)) * seam;
  // Leaves differ a little from facet to facet: an elm mid green, a poplar yellow-green, a cedar dark blue-green.
  vec3 a0 = tp == 1 ? vec3(0.05, 0.064, 0.026) : tp == 2 ? vec3(0.024, 0.038, 0.028) : vec3(0.04, 0.05, 0.024);
  vec3 alb = a0 * mix(1.0, 0.85 + 0.35 * th(ci + seed), det);
  vec3 leaf = alb * (uSunCol * 0.95 * sun * dif * self + uAmb * (0.35 + 0.3 * N.y) * ao);
  // The rim: the crown's edge toward the sun catches it, most when the sun stands to the side or behind.
  float rim = pow(1.0 - Nd.z, 3.0) * max(dot(normalize(Nd.xy + 1e-4), normalize(Ls.xy + 1e-4)), 0.0);
  leaf += uSunCol * vec3(0.12, 0.11, 0.05) * sun * rim * (0.3 + 0.7 * clamp(1.0 - Ls.z, 0.0, 1.0));
  // Leaves go in holes first: light shows through, then the bare limbs.
  // The gaps scale with the crown and fade to their mean once smaller than a pixel: no checker.
  float hole = mix(0.5, vn(ql / r * 3.0 + seed * 7.0), smoothstep(1.5, 4.0, r * m / px / 3.0));
  kc *= mix(1.0, 0.12, smoothstep(0.85, 0.35, hole + 0.8 - dm.x * 0.9));
  // Sky gaps in a healthy elm's crown, most toward its outside, where the limbs show through.
  float gap = mix(0.5, vn(ql / r * 2.2 + seed * 13.0), fine);
  if (tp == 0) kc *= 1.0 - 0.85 * smoothstep(0.66, 0.78, gap) * smoothstep(0.2, 0.75, length((ql - cc) / r));
  kc *= keep;
  // Torn leaves show their pale backs.
  vec3 col = mix(leaf, vec3(0.09, 0.09, 0.06) * (uSunCol * 0.4 * sun + uAmb * 0.5), dm.x * 0.5);
  put(plainHaze(col, rd, z), kc, z);
}
// Coverage of a box from screen point a to b, at pixel size px.
float pbox(vec2 s, vec2 a, vec2 b, float px) {
  vec2 lo = clamp((s - a) / px + 0.5, 0.0, 1.0), hi = clamp((b - s) / px + 0.5, 0.0, 1.0);
  return lo.x * lo.y * hi.x * hi.y;
}
// True where a far farmstead at P can show: its screen box.
// Its trees stay inside this box too.
bool steadIn(vec2 s, float px, vec3 P) {
  vec2 b = proj(P);
  float m = uFoc / depthOf(P);
  return !(abs(s.x - b.x) > 90.0 * m + px || s.y < b.y - 2.0 * px || s.y > b.y + 22.0 * m + px);
}
// A far farmstead at P: a house, a barn, three grain bins.
// Its trees draw in plainTrees(), a pass before.
void stead(vec2 s, vec3 rd, float px, vec3 P, float seed) {
  float z = depthOf(P);
  vec2 b = proj(P);
  float m = uFoc / z;
  if (!steadIn(s, px, P)) return;
  float sun = 1.0 - sunCover(P * 0.001);
  vec3 lit = uSunCol * 0.5 * sun + uAmb * 0.5;
  float fl = s.x < b.x ? 1.0 : -1.0;
  // The damage field: roofs go from about 45 m/s, walls from 60, bins blow away past 60.
  float v = dmgAt(P.xz).x;
  float roofK = 1.0 - clamp((v - 45.0) / 12.0, 0.0, 1.0), wallK = mix(1.0, 0.15, clamp((v - 60.0) / 25.0, 0.0, 1.0));
  float binK = 1.0 - clamp((v - 58.0) / 12.0, 0.0, 1.0);
  // The grain bins: corrugated steel, bright where the sun reaches, each with a cone on top.
  for (int i = 0; i < 3; i++) {
    float fi = float(i), r = 4.5 - 0.6 * fi;
    vec3 C = P + vec3(26.0 + 11.0 * fi, 0.0, 6.0);
    vec2 cb = proj(C);
    float hw = r * m, bh = (9.0 - fi) * m * binK, ch = 3.0 * m * binK;
    float u = (s.x - cb.x) / hw;
    float wall = pbox(s, cb - vec2(hw, 0.0), cb + vec2(hw, bh), px);
    float cone = clamp((cb.y + bh + ch * (1.0 - abs(u)) - s.y) / px + 0.5, 0.0, 1.0) * step(cb.y + bh - px, s.y) * step(abs(u), 1.0);
    float k = max(wall, cone);
    if (k > 0.0) {
      // A cylinder's shade across its face, and the steel's sheen toward the light.
      float sh = 0.55 + 0.45 * clamp(-u * 0.7 + 0.5, 0.0, 1.0);
      vec3 steel = vec3(0.36, 0.37, 0.38) * (uSunCol * 0.5 * sun * sh + uAmb * 0.55) + uSunCol * 0.08 * sun * pow(clamp(1.0 - abs(u + 0.3), 0.0, 1.0), 6.0);
      put(plainHaze(steel, rd, z), k, z);
    }
  }
  // The barn: weathered red, a gambrel roof.
  {
    vec2 a = proj(P + vec3(-16.0, 0.0, -4.0)), c = proj(P + vec3(0.0, 7.0 * wallK, -4.0));
    float k = pbox(s, a, c, px);
    float mid = (a.x + c.x) * 0.5, hw = (c.x - a.x) * 0.5, u = abs(s.x - mid) / hw;
    float roof = c.y + m * (u < 0.55 ? 5.0 - u * 2.0 : 3.9 - (u - 0.55) * 8.6);
    k = max(k, clamp((roof - s.y) / px + 0.5, 0.0, 1.0) * step(c.y - px, s.y) * step(u, 1.0) * roofK);
    put(plainHaze(vec3(0.15, 0.04, 0.03) * lit, rd, z), k, z);
  }
  // The house: pale boards under a dark gable.
  {
    vec2 a = proj(P + vec3(2.0, 0.0, 4.0)), c = proj(P + vec3(12.0, 5.0 * wallK, 4.0));
    put(plainHaze(vec3(0.42, 0.4, 0.36) * lit, rd, z), pbox(s, a, c, px), z);
    float mid = (a.x + c.x) * 0.5, hw = (c.x - a.x) * 0.55, u = abs(s.x - mid) / hw;
    float k = clamp((c.y + m * 2.8 * (1.0 - u) - s.y) / px + 0.5, 0.0, 1.0) * step(c.y - px * 0.5, s.y) * step(u, 1.0) * roofK;
    put(plainHaze(vec3(0.05, 0.045, 0.045) * lit, rd, z), k, z);
  }
}
// The fence along the right field: round wooden posts every 20 m, painted steel T-posts between, three strands.
// The posts take woodShade() from line.js; the strands are galvanised wire, lit as the conductors are.
const float FENCE_X = ROAD_X + 6.0;
void fence(vec2 s, vec3 rd, float px) {
  float sn = sin(uYaw), cs = cos(uYaw), k = s.x / uFoc, den = k * cs - sn;
  if (abs(den) < 1e-5) return;
  float wz = -FENCE_X * (cs + k * sn) / den;
  float L = -wz - 4.0;
  if (L < 0.0 || L > 2500.0) return;
  float z = depthOf(vec3(FENCE_X, 0.0, wz)), m = uFoc / z;
  vec3 eye = vec3(0.0, CAMH, 0.0), up = vec3(0.0, 1.0, 0.0);
  // The posts on either side of this column's place along the fence.
  float i0 = floor(L / 4.0);
  for (int j = 0; j < 2; j++) {
    float i = i0 + float(j);
    bool post = mod(i, 5.0) < 0.5;
    // No post stands quite true.
    vec3 P = vec3(FENCE_X + 0.05 * (th(vec2(i, 3.0)) - 0.5), 0.0, -(4.0 + 4.0 * i));
    vec3 A = normalize(vec3((th(vec2(i, 6.1)) - 0.5) * 0.06, 1.0, (th(vec2(i, 1.9)) - 0.5) * 0.05));
    // A tornado's wind lays the fence down: posts lean from 35 m/s and lie flat by 55.
    vec3 dm = dmgAt(P.xz);
    float fa = clamp((dm.x - 35.0 - 6.0 * th(vec2(i, 4.4))) / 20.0, 0.0, 1.0) * 1.35;
    if (fa > 0.0) A = normalize(A * cos(fa) + vec3(dm.y, 0.0, dm.z) * sin(fa));
    float zp = depthOf(P);
    if (zp < 1.0) continue;
    float hgt = post ? 1.3 : 1.15, u, sx;
    float kp = segCover(s, proj(P), proj(P + A * hgt), (post ? 0.06 : 0.02) / zp * uFoc, px, sx, u);
    if (kp <= 0.0) continue;
    vec3 V = normalize(eye - P), Q = P + A * hgt * u;
    vec3 col;
    if (post) col = woodShade(Q, A, V, sx, hgt * u + 0.3, vn(vec2(sx * 3.0 + i, u * 20.0)));
    else {
      // A T-post: green paint, chipped to rust, a satin sheen.
      vec3 Nv = normalize(V - A * dot(V, A)), N = normalize(Nv + cross(A, Nv) * sx);
      vec3 Ls = normalize(uSun + vec3(0.0, 1e-3, 0.0)), H = normalize(Ls + V);
      float sun = 1.0 - sunCover(Q * 0.001);
      vec3 alb = mix(vec3(0.06, 0.09, 0.06), vec3(0.16, 0.08, 0.04), step(0.7, vn(vec2(i * 3.1, u * 9.0))));
      col = alb * (uSunCol * 0.9 * sun * max(dot(N, Ls), 0.0) + uAmb * 0.5) + uSunCol * sun * ggx(max(dot(N, H), 0.0), 0.45) * max(dot(N, Ls), 0.0) * 0.04 + lineEnv(reflect(-V, N)) * 0.04;
    }
    put(plainHaze(col, rd, zp), kp, zp);
  }
  // The strands: barbed wire, sagging a little between posts; its slope on screen sets its weight.
  // A flattened fence's strands lie low with its posts.
  float fs = cos(clamp((dmgAt(vec2(FENCE_X, wz)).x - 38.0) / 20.0, 0.0, 1.0) * 1.35);
  for (int j = 0; j < 3; j++) {
    float f = fract(L / 4.0), y = (0.55 + 0.27 * float(j) - 0.2 * f * (1.0 - f)) * fs;
    vec3 P0 = vec3(FENCE_X, y, wz), P1 = vec3(FENCE_X, y, wz - 0.5);
    vec2 s0 = proj(P0), s1 = proj(P1), sd = s1 - s0;
    float sl = abs(sd.x) > 1e-7 ? sd.y / sd.x : 1e3;
    float dist = abs(s.y - s0.y) / sqrt(1.0 + sl * sl), rad = 0.003 * m;
    float a = clamp((max(rad, px * 0.5) - dist) / px + 0.5, 0.0, 1.0) * min(1.0, 2.0 * rad / px * 2.5);
    if (a <= 0.0) continue;
    // The barbs every 12 cm thicken the strand a little.
    put(plainHaze(wireShade(P0, normalize(P1 - P0), normalize(eye - P0)), rd, z), a, z);
  }
}
// Far trees, scattered to the horizon: six distance bands from 2.5 to 22 km.
// Each band splits the view into slices of azimuth about 220 m wide; a slice holds a tree or none.
// None stands on the road's line, and none nearer than 9 km stands in front of the touchdown ground.
void farTrees(vec2 s, vec3 rd, float px) {
  float az = atan(rd.x, -rd.z);
  for (int b = ROLL0; b < 6; b++) {
    float fb = float(b), d0 = 2500.0 * pow(1.55, fb), cw = 220.0 / d0;
    float ci = floor(az / cw);
    for (int k = ROLL0 - 1; k <= 1; k++) {
      float c = ci + float(k);
      vec3 h = vec3(th(vec2(c, fb + 0.5)), th(vec2(fb + 3.3, c)), th(vec2(c + 7.1, fb * 3.0)));
      // Trees gather in loose groups: some stretches of horizon hold many, some none.
      float dens = 0.25 + 0.5 * smoothstep(0.3, 0.7, vn(vec2(c * cw * 6.0, fb * 1.7)));
      if (h.x > dens) continue;
      float a = (c + 0.15 + 0.7 * h.y) * cw, d = d0 * (0.8 + 0.5 * h.z);
      vec3 P = vec3(sin(a) * d, 0.0, -cos(a) * d);
      if (abs(P.x - ROAD_X) < 60.0) continue;
      if (d < 9000.0 && a > -0.45 && a < -0.1) continue;
      // Old cottonwoods and elms: crowns 12 to 24 m across, often two or three together.
      float r = 6.0 + 6.0 * th(vec2(c, fb + 9.0)), H = r * (2.0 + 0.5 * th(vec2(fb, c + 2.0)));
      // A second tree stands past h.y 0.45, a third past 0.75.
      for (int j = ROLL0; j < 3; j++) {
        if ((j == 1 && h.y <= 0.45) || (j == 2 && h.y <= 0.75)) continue;
        float f = j == 1 ? 1.6 : 1.5, kr = j == 0 ? 1.0 : (j == 1 ? 0.8 : 0.7), kh = j == 0 ? 1.0 : (j == 1 ? 0.85 : 0.8);
        vec3 o = vec3(cos(a) * r * f, 0.0, sin(a) * r * f);
        vec3 Q = j == 0 ? P : (j == 1 ? P + o : P - o);
        loneTree(s, rd, px, Q, j == 0 ? r : r * kr, j == 0 ? H : H * kh, j == 0 ? c * 0.37 + fb : c * 0.37 + fb + (j == 1 ? 0.5 : 0.7));
      }
    }
  }
}
// Shelterbelts: ends a.xy and b.xy; height and seed.
const vec4 BELT_AB[6] = vec4[6](vec4(-3500.0, -3220.0, -1500.0, -3220.0), vec4(400.0, -4830.0, 2600.0, -4830.0),
  vec4(-6000.0, -9650.0, -300.0, -9650.0), vec4(-3218.0, -1609.0, -3218.0, -4800.0),
  vec4(1000.0, -12870.0, 8000.0, -12870.0), vec4(2400.0, -6400.0, 2400.0, -11200.0));
const vec2 BELT_HS[6] = vec2[6](vec2(13.0, 1.0), vec2(15.0, 2.0), vec2(14.0, 3.0), vec2(12.0, 4.0), vec2(16.0, 5.0), vec2(13.0, 6.0));
// Lone trees: place x, z and crown radius; height.
const vec4 LONE[6] = vec4[6](vec4(-600.0, -950.0, 5.0, 11.0), vec4(-260.0, -2600.0, 6.0, 13.0), vec4(520.0, -1900.0, 4.5, 10.0),
  vec4(1500.0, -3500.0, 7.0, 15.0), vec4(-1900.0, -2200.0, 5.5, 12.0), vec4(3400.0, -2600.0, 6.5, 14.0));
// Farmsteads: place x, z.
const vec2 STEAD[3] = vec2[3](vec2(-2900.0, -5200.0), vec2(1700.0, -3900.0), vec2(-1200.0, -11500.0));
// Every far shape on the plain, laid into the objects' layers.
// It takes five passes: one program would not compile on D3D11.
// The passes run in this order, so the shapes stack as in one pass.
// Everything here stands in a thin band round the horizon, or near the road.
// The fence along the road.
void plainFence(vec2 s, vec3 rd, float px) {
  if (s.y < -0.6 || s.y > 0.06) return;
  fence(s, rd, px);
}
// Shelterbelts on the section lines, a mile apart.
// No belt crosses the road or the touchdown ground.
void plainBelts(vec2 s, vec3 rd, float px) {
  if (s.y < -0.03 || s.y > 0.06) return;
  for (int i = ROLL0; i < 6; i++) belt(s, rd, px, BELT_AB[i].xy, BELT_AB[i].zw, BELT_HS[i].x, BELT_HS[i].y);
}
// Far trees, only in the thin band over the horizon where they can stand.
void plainFar(vec2 s, vec3 rd, float px) {
  if (abs(s.y) < 0.025) farTrees(s, rd, px);
}
// The lone trees in the fields, then four trees behind each farmstead's yard.
// The farmsteads stand far apart on screen: their trees can draw before all their buildings.
void plainTrees(vec2 s, vec3 rd, float px) {
  if (s.y < -0.03 || s.y > 0.06) return;
  for (int i = ROLL0; i < 18; i++) {
    vec3 P;
    float r, h, seed;
    if (i < 6) {
      P = vec3(LONE[i].x, 0.0, LONE[i].y); r = LONE[i].z; h = LONE[i].w; seed = float(i + 1);
    } else {
      int k = (i - 6) / 4;
      float sd = float(k + 1), fi = float(i - 6 - k * 4);
      vec3 S = vec3(STEAD[k].x, 0.0, STEAD[k].y);
      if (!steadIn(s, px, S)) continue;
      P = S + vec3(-40.0 + 24.0 * fi + 8.0 * th(vec2(sd, fi)), 0.0, -30.0 - 10.0 * th(vec2(fi, sd)));
      r = 6.0 + 2.0 * th(vec2(sd + fi, 1.0)); h = 13.0 + 4.0 * th(vec2(fi, sd + 2.0)); seed = sd + fi;
    }
    loneTree(s, rd, px, P, r, h, seed);
  }
}
// The far farmsteads' buildings and bins.
void plainSteads(vec2 s, vec3 rd, float px) {
  if (s.y < -0.03 || s.y > 0.06) return;
  for (int i = ROLL0; i < 3; i++) stead(s, rd, px, vec3(STEAD[i].x, 0.0, STEAD[i].y), float(i + 1));
}
/* ---------- uprooted trees in flight ---------- */
// Each flight: place x, z, start time, seed; then crown radius and height.
uniform vec4 uFly[${MAX_FLY}], uFlyB[${MAX_FLY}];
// An uprooted tree, root ball and all, lifts, rides the inflow to the nearest funnel, climbs it tumbling,
// and fades out in the funnel's dust. It reads line.js's uFoot[] for each tornado's foot.
void treesFly(vec2 s, vec3 rd, float px) {
  for (int e = 0; e < ${MAX_FLY}; e++) {
    vec4 a = uFly[e], b = uFlyB[e];
    float age = uT - a.z, r = b.x, h = b.y, seed = a.w;
    if (h <= 0.0 || age < 0.0 || age > ${FLY_LIFE}.0) continue;
    // The nearest funnel takes it; with none it blows downwind.
    vec2 S = a.xy, C = S + WDIR * 60.0;
    float rc = 25.0, best = 1e9;
    for (int i = 0; i < 4; i++) {
      vec4 f = uFoot[i];
      float d = length(f.xy - S);
      if (f.w > 0.0 && d < best) { best = d; C = f.xy; rc = max(f.z * 0.3, 30.0); }
    }
    vec2 d0 = S - C;
    float r0 = max(length(d0), 1.0), a0 = atan(d0.y, d0.x);
    // It tears free in half a second, then spirals in and up; past the climb's middle it fades.
    float TA = 3.5 + 1.5 * th(vec2(seed, 1.1)), ka = smoothstep(0.0, 1.0, clamp((age - 0.5) / TA, 0.0, 1.0));
    float rad = mix(r0, rc * 0.9, ka), ang = a0 - 0.35 * age * (1.0 + 2.0 * ka);
    float y = h * 0.5 + smoothstep(0.0, 0.6, age) * h * 0.3 + (60.0 + 120.0 * th(vec2(seed, 2.2))) * ka;
    float fade = 1.0 - smoothstep(TA * 0.55, TA + 1.2, age);
    if (fade <= 0.0) continue;
    vec3 Pc = vec3(C.x + rad * cos(ang), y, C.y + rad * sin(ang));
    float zp = depthOf(Pc);
    if (zp < 20.0) continue;
    float m = uFoc / zp;
    vec2 c = proj(Pc);
    if (length(s - c) > h * 0.6 * m + 2.0 * px) continue;
    // It tumbles: its axis turns in the frame, slowly at first.
    float tb = smoothstep(0.0, 1.2, age) * (0.8 + 1.2 * th(vec2(seed, 5.1))) + age * (0.5 + 1.0 * th(vec2(seed, 3.3)));
    vec2 ax = vec2(sin(tb), cos(tb)), dq = (s - c) / m;
    // u runs from the root ball (-h / 2) to the top (h / 2); v across.
    float u = dot(dq, ax), v = dot(dq, vec2(ax.y, -ax.x)), pm = px / m;
    float tk = th(vec2(seed, 6.6));
    int tp = tk < 0.3 ? 1 : tk < 0.55 ? 2 : 0;
    float W = tp == 1 ? r * 0.38 : tp == 2 ? r * 0.85 : r;
    // The crown: an elm's round head, a poplar's column, a cedar's cone.
    float kc, nx, ny;
    if (tp == 2) {
      // Ragged tiers and a leafy edge, as the standing cedar's.
      float t = (u + h * 0.42) / (h * 0.92), hw = W * max(1.0 - t, 0.0) * (0.82 + 0.18 * smoothstep(0.0, 0.9, fract(t * 7.0 + seed)) + 0.08 * (vn(vec2(u * 2.0, seed + v)) - 0.5));
      kc = clamp((hw - abs(v)) / pm + 0.5, 0.0, 1.0) * step(0.0, t);
      nx = clamp(v / max(hw, 1e-3), -1.0, 1.0); ny = 0.4;
    } else {
      vec2 cc = tp == 1 ? vec2(0.0, h * 0.08) : vec2(0.0, h * 0.5 - r), rr = tp == 1 ? vec2(W, h * 0.4) : vec2(r);
      vec2 e2 = (vec2(v, u) - cc) / rr;
      float an = atan(e2.y, e2.x), R = 0.86 + 0.12 * vn(vec2(an * 3.0, seed)) + 0.06 * vn(vec2(an * 9.0, seed + 2.0));
      kc = clamp((R - length(e2)) * min(rr.x, rr.y) / pm + 0.5, 0.0, 1.0);
      nx = e2.x; ny = e2.y;
    }
    // The trunk, and the root ball of earth torn out with it.
    float kt = clamp((0.32 - abs(v)) / pm + 0.5, 0.0, 1.0) * step(-h * 0.5, u) * step(u, h * 0.1);
    float kr = clamp((r * 0.3 - length(vec2(v, u + h * 0.5))) / pm + 0.5, 0.0, 1.0);
    float sun = 1.0 - sunCover(Pc * 0.001);
    vec3 Ls = toCam(normalize(uSun + vec3(0.0, 1e-3, 0.0)));
    // The crown's normal turns with the tumble.
    vec2 nl = vec2(nx, ny), ns = nl.x * vec2(ax.y, -ax.x) + nl.y * ax;
    vec3 N = normalize(vec3(ns, sqrt(max(1.0 - dot(nl, nl), 0.05))));
    float dif = clamp(dot(N, Ls) * 0.65 + 0.35, 0.0, 1.0);
    vec3 a0c = tp == 1 ? vec3(0.05, 0.064, 0.026) : tp == 2 ? vec3(0.024, 0.038, 0.028) : vec3(0.04, 0.05, 0.024);
    vec3 leaf = a0c * (uSunCol * 0.95 * sun * dif + uAmb * 0.45);
    vec3 bark = vec3(0.03, 0.025, 0.02) * (uSunCol * 0.4 * sun + uAmb * 0.45), earth = vec3(0.09, 0.07, 0.05) * (uSunCol * 0.4 * sun + uAmb * 0.5);
    float k = max(kc, max(kt, kr));
    if (k <= 0.0) continue;
    vec3 col = kc >= max(kt, kr) ? leaf : kr > kt ? earth : bark;
    put(hazed(col, rd, zp), k * fade, zp);
  }
}
`;
