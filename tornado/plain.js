// Tornado alley: the far plain's geometry, drawn flat on the screen in the scene pass.
// Shelterbelts and lone trees, far farmsteads with grain bins, and a fence along the road.
// Trees sway in the wind and take damage from the damage field.
// Every shape lays itself into the objects' layers with put(), so it sorts against the funnels.
// It reads main.js's proj(), depthOf(), vn(), th(), hazeCol(), sunCover(), shadeK(), gust() and CAMH,
// line.js's swayAmp() and segCover(), and damage.js's dmgAt().

export const PLAIN_GLSL = /* glsl */`
/* ---------- the far plain ---------- */
// Air between the eye and a far shape: the ground's own haze, so the shapes sit in the land.
vec3 plainHaze(vec3 col, vec3 rd, float z) { return mix(col, hazeCol(rd), 1.0 - exp(-z / 22000.0)); }
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
  vec3 col = mix(leafCol(P, vn(vec2(L * 0.1, seed))), vec3(0.06, 0.055, 0.04) * (uSunCol * 0.4 + uAmb * 0.5), dm.x * 0.6);
  put(plainHaze(col, rd, z), k, z);
}
// A lone tree: a trunk, a few limbs, and a crown of lobes of radius r, its top h metres up.
// The wind leans it; the damage field strips it, breaks it, or lays it down.
void loneTree(vec2 s, vec3 rd, float px, vec3 P, float r, float h, float seed) {
  float z = depthOf(P);
  if (z < 50.0) return;
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
  // The bark: dark and wet; a stripped stump shows pale wood.
  vec3 bark = mix(vec3(0.03, 0.025, 0.02), vec3(0.16, 0.13, 0.1), dm.w) * (uSunCol * 0.4 * sun + uAmb * 0.5);
  float cy = h - r;
  // The crown's carried away with the top in the strongest wind.
  float keep = above ? 1.0 - dm.w : 1.0;
  // The trunk, to the crown's heart; a broken top's trunk turns with it.
  float tw = 0.32 * (1.0 - 0.3 * hy);
  float kt = clamp((max(tw * m, px * 0.5) - abs(ql.x) * m) / px + 0.5, 0.0, 1.0) * min(1.0, 2.0 * tw * m / px) * step(0.0, ql.y) * step(ql.y, cy) * keep;
  if (!above && hb > 0.0) kt *= step(q.y, hb + 0.4 * abs(q.x * 3.0));
  // Four limbs from the trunk's top to the lobes, seen most once the leaves go.
  float kl = 0.0;
  for (int i = 0; i < 4; i++) {
    if (!above) break;
    float fi = float(i), lx = (fi - 1.5) * 0.5 * r, ly = cy + (0.15 - 0.25 * abs(fi - 1.5)) * r;
    if (th(vec2(seed + fi, 5.5)) < dm.y * 0.8) continue;
    float sx, u;
    kl = max(kl, segCover(ql * m, vec2(0.0, cy - 0.5 * r) * m, vec2(lx, ly) * m, 0.08 * m, px, sx, u));
  }
  put(plainHaze(bark, rd, z), max(kt, kl * keep), z);
  // Below a break only the stump stands.
  if (!above) return;
  // The crown: five lobes, each with a ragged edge; limbs lost take whole lobes.
  float kc = 0.0, lit = 0.0;
  for (int i = 0; i < 5; i++) {
    float fi = float(i);
    vec3 lb = i == 0 ? vec3(0.0, 0.25, 0.62) : i == 1 ? vec3(-0.5, -0.05, 0.55) : i == 2 ? vec3(0.5, 0.0, 0.55) : i == 3 ? vec3(0.1, 0.55, 0.48) : vec3(-0.2, -0.4, 0.5);
    if (th(vec2(seed + fi, 3.9)) < dm.y * 0.75) continue;
    // Each lobe flutters on its own beat.
    vec2 c = vec2(lb.x * r + swX * 0.06 * sin(uT * 2.1 + fi * 1.7 + seed), cy + lb.y * r);
    vec2 d = ql - c;
    float an = atan(d.y, d.x);
    float R = lb.z * r * (1.0 - 0.3 * dm.y) * (0.88 + 0.12 * vn(vec2(an * 2.5 + fi, seed)) + 0.07 * vn(vec2(an * 6.0, seed + fi)));
    float k = clamp((R - length(d * vec2(1.0, 1.12))) * m / px + 0.5, 0.0, 1.0);
    if (k > kc) { kc = k; lit = clamp(0.5 + 0.5 * dot(d / max(R, 1e-3), normalize(vec2(-uSun.x, 0.6))), 0.0, 1.0); }
  }
  if (kc <= 0.0) return;
  // Leaves go in holes first: light shows through, then the bare limbs.
  // The gaps scale with the crown and fade to their mean once smaller than a pixel: no checker.
  float hole = mix(0.5, vn(ql / r * 3.0 + seed * 7.0), smoothstep(1.5, 4.0, r * m / px / 3.0));
  kc *= mix(1.0, 0.12, smoothstep(0.85, 0.35, hole + 0.8 - dm.x * 0.9));
  kc *= keep;
  // Torn leaves show their pale backs.
  vec3 col = mix(leafCol(P, lit), vec3(0.09, 0.09, 0.06) * (uSunCol * 0.4 * sun + uAmb * 0.5), dm.x * 0.5);
  put(plainHaze(col, rd, z), kc, z);
}
// Coverage of a box from screen point a to b, at pixel size px.
float pbox(vec2 s, vec2 a, vec2 b, float px) {
  vec2 lo = clamp((s - a) / px + 0.5, 0.0, 1.0), hi = clamp((b - s) / px + 0.5, 0.0, 1.0);
  return lo.x * lo.y * hi.x * hi.y;
}
// A far farmstead at P: a house, a barn, three grain bins, a few trees.
void stead(vec2 s, vec3 rd, float px, vec3 P, float seed) {
  float z = depthOf(P);
  vec2 b = proj(P);
  float m = uFoc / z;
  if (abs(s.x - b.x) > 90.0 * m + px || s.y < b.y - 2.0 * px || s.y > b.y + 22.0 * m + px) return;
  float sun = 1.0 - sunCover(P * 0.001);
  vec3 lit = uSunCol * 0.5 * sun + uAmb * 0.5;
  float fl = s.x < b.x ? 1.0 : -1.0;
  // The trees behind the yard.
  for (int i = 0; i < 4; i++) {
    float fi = float(i);
    loneTree(s, rd, px, P + vec3(-40.0 + 24.0 * fi + 8.0 * th(vec2(seed, fi)), 0.0, -30.0 - 10.0 * th(vec2(fi, seed))), 6.0 + 2.0 * th(vec2(seed + fi, 1.0)), 13.0 + 4.0 * th(vec2(fi, seed + 2.0)), seed + fi);
  }
  // The grain bins: corrugated steel, bright where the sun reaches, each with a cone on top.
  for (int i = 0; i < 3; i++) {
    float fi = float(i), r = 4.5 - 0.6 * fi;
    vec3 C = P + vec3(26.0 + 11.0 * fi, 0.0, 6.0);
    vec2 cb = proj(C);
    float hw = r * m, bh = (9.0 - fi) * m, ch = 3.0 * m;
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
    vec2 a = proj(P + vec3(-16.0, 0.0, -4.0)), c = proj(P + vec3(0.0, 7.0, -4.0));
    float k = pbox(s, a, c, px);
    float mid = (a.x + c.x) * 0.5, hw = (c.x - a.x) * 0.5, u = abs(s.x - mid) / hw;
    float roof = c.y + m * (u < 0.55 ? 5.0 - u * 2.0 : 3.9 - (u - 0.55) * 8.6);
    k = max(k, clamp((roof - s.y) / px + 0.5, 0.0, 1.0) * step(c.y - px, s.y) * step(u, 1.0));
    put(plainHaze(vec3(0.15, 0.04, 0.03) * lit, rd, z), k, z);
  }
  // The house: pale boards under a dark gable.
  {
    vec2 a = proj(P + vec3(2.0, 0.0, 4.0)), c = proj(P + vec3(12.0, 5.0, 4.0));
    put(plainHaze(vec3(0.42, 0.4, 0.36) * lit, rd, z), pbox(s, a, c, px), z);
    float mid = (a.x + c.x) * 0.5, hw = (c.x - a.x) * 0.55, u = abs(s.x - mid) / hw;
    float k = clamp((c.y + m * 2.8 * (1.0 - u) - s.y) / px + 0.5, 0.0, 1.0) * step(c.y - px * 0.5, s.y) * step(u, 1.0);
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
  for (int j = 0; j < 3; j++) {
    float f = fract(L / 4.0), y = 0.55 + 0.27 * float(j) - 0.2 * f * (1.0 - f);
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
  for (int b = 0; b < 6; b++) {
    float fb = float(b), d0 = 2500.0 * pow(1.55, fb), cw = 220.0 / d0;
    float ci = floor(az / cw);
    for (int k = -1; k <= 1; k++) {
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
      loneTree(s, rd, px, P, r, H, c * 0.37 + fb);
      if (h.y > 0.45) loneTree(s, rd, px, P + vec3(cos(a) * r * 1.6, 0.0, sin(a) * r * 1.6), r * 0.8, H * 0.85, c * 0.37 + fb + 0.5);
      if (h.y > 0.75) loneTree(s, rd, px, P - vec3(cos(a) * r * 1.5, 0.0, sin(a) * r * 1.5), r * 0.7, H * 0.8, c * 0.37 + fb + 0.7);
    }
  }
}
// Every far shape on the plain, laid into the objects' layers.
void plain(vec2 s, vec3 rd, float px) {
  // Everything here stands within a thin band round the horizon, or near the road for the fence.
  if (s.y < -0.6 || s.y > 0.06) return;
  fence(s, rd, px);
  if (s.y < -0.03) return;
  // Shelterbelts on the section lines, a mile apart; none crosses the road or the touchdown ground.
  belt(s, rd, px, vec2(-3500.0, -3220.0), vec2(-1500.0, -3220.0), 13.0, 1.0);
  belt(s, rd, px, vec2(400.0, -4830.0), vec2(2600.0, -4830.0), 15.0, 2.0);
  belt(s, rd, px, vec2(-6000.0, -9650.0), vec2(-300.0, -9650.0), 14.0, 3.0);
  belt(s, rd, px, vec2(-3218.0, -1609.0), vec2(-3218.0, -4800.0), 12.0, 4.0);
  belt(s, rd, px, vec2(1000.0, -12870.0), vec2(8000.0, -12870.0), 16.0, 5.0);
  belt(s, rd, px, vec2(2400.0, -6400.0), vec2(2400.0, -11200.0), 13.0, 6.0);
  // Far trees, only in the thin band over the horizon where they can stand.
  if (abs(s.y) < 0.025) farTrees(s, rd, px);
  // Lone trees in the fields.
  loneTree(s, rd, px, vec3(-600.0, 0.0, -950.0), 5.0, 11.0, 1.0);
  loneTree(s, rd, px, vec3(-260.0, 0.0, -2600.0), 6.0, 13.0, 2.0);
  loneTree(s, rd, px, vec3(520.0, 0.0, -1900.0), 4.5, 10.0, 3.0);
  loneTree(s, rd, px, vec3(1500.0, 0.0, -3500.0), 7.0, 15.0, 4.0);
  loneTree(s, rd, px, vec3(-1900.0, 0.0, -2200.0), 5.5, 12.0, 5.0);
  loneTree(s, rd, px, vec3(3400.0, 0.0, -2600.0), 6.5, 14.0, 6.0);
  // Far farmsteads.
  stead(s, rd, px, vec3(-2900.0, 0.0, -5200.0), 1.0);
  stead(s, rd, px, vec3(1700.0, 0.0, -3900.0), 2.0);
  stead(s, rd, px, vec3(-1200.0, 0.0, -11500.0), 3.0);
}
`;
