// Tornado alley: the far plain's geometry, drawn flat on the screen in the scene pass.
// Shelterbelts and lone trees, far farmsteads with grain bins, and a fence along the road.
// Every shape lays itself into the objects' layers with put(), so it sorts against the funnels.
// It reads main.js's proj(), depthOf(), vn(), th(), hazeCol(), sunCover(), shadeK() and CAMH.

export const PLAIN_GLSL = /* glsl */`
/* ---------- the far plain ---------- */
// Air between the eye and a far shape: the ground's own haze, so the shapes sit in the land.
vec3 plainHaze(vec3 col, vec3 rd, float z) { return mix(col, hazeCol(rd), 1.0 - exp(-z / 22000.0)); }
// Foliage in the storm light: dark green, with the sun's share where the deck lets it through.
vec3 leafCol(vec3 P, float k) {
  float sun = 1.0 - sunCover(P * 0.001);
  return mix(vec3(0.035, 0.045, 0.022), vec3(0.05, 0.055, 0.03), k) * (uSunCol * 0.45 * sun + uAmb * 0.5);
}
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
  float sy = (top - CAMH) / z * uFoc, sb = -CAMH / z * uFoc;
  float k = clamp((sy - s.y) / px + 0.5, 0.0, 1.0) * clamp((s.y - sb) / px + 1.5, 0.0, 1.0);
  if (k <= 0.0) return;
  // Light shows through the thin crowns near the top.
  k *= mix(1.0, 0.75 + 0.25 * vn(vec2(L * 0.8, s.y * 900.0)), smoothstep(sy - 3.0 * px, sy, s.y));
  put(plainHaze(leafCol(P, vn(vec2(L * 0.1, seed))), rd, z), k, z);
}
// A lone tree: a trunk and a round, ragged crown of radius r, its top h metres up.
void loneTree(vec2 s, vec3 rd, float px, vec3 P, float r, float h, float seed) {
  float z = depthOf(P);
  if (z < 50.0) return;
  vec2 b = proj(P);
  float m = uFoc / z;
  if (abs(s.x - b.x) > r * 1.3 * m + px || s.y < b.y - px || s.y > b.y + h * m + px) return;
  vec2 c = b + vec2(0.0, (h - r) * m);
  vec2 q = (s - c) / m;
  float ang = atan(q.y, q.x);
  // The crown's edge: lumps of foliage round it.
  float rr = r * (0.85 + 0.15 * vn(vec2(ang * 2.5, seed)) + 0.08 * vn(vec2(ang * 7.0, seed + 2.0)));
  float k = clamp((rr - length(q * vec2(1.0, 1.15))) * m / px + 0.5, 0.0, 1.0);
  // The trunk, under the crown.
  k = max(k, clamp((0.35 * m - abs(s.x - b.x)) / px + 0.5, 0.0, 1.0) * min(1.0, 0.7 * m / px) * step(s.y, c.y));
  if (k <= 0.0) return;
  // The crown's sunward side takes a little more light.
  put(plainHaze(leafCol(P, clamp(0.5 - q.x / r * 0.5, 0.0, 1.0)), rd, z), k, z);
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
// The fence along the right field: wooden posts every 20 m, steel posts between, three strands.
const float FENCE_X = ROAD_X + 6.0;
void fence(vec2 s, vec3 rd, float px) {
  float sn = sin(uYaw), cs = cos(uYaw), k = s.x / uFoc, den = k * cs - sn;
  if (abs(den) < 1e-5) return;
  float wz = -FENCE_X * (cs + k * sn) / den;
  float L = -wz - 4.0;
  if (L < 0.0 || L > 2500.0) return;
  float z = depthOf(vec3(FENCE_X, 0.0, wz)), m = uFoc / z;
  vec3 wood = vec3(0.16, 0.13, 0.1) * (uSunCol * 0.5 + uAmb * 0.55), steel = vec3(0.07) * (uSunCol * 0.4 + uAmb * 0.5);
  // The posts on either side of this column's place along the fence.
  float i0 = floor(L / 4.0);
  for (int j = 0; j < 2; j++) {
    float i = i0 + float(j);
    bool post = mod(i, 5.0) < 0.5;
    vec3 P = vec3(FENCE_X + 0.05 * (th(vec2(i, 3.0)) - 0.5), 0.0, -(4.0 + 4.0 * i));
    float zp = depthOf(P);
    vec2 b = proj(P);
    float w = (post ? 0.06 : 0.02) / zp * uFoc, h = (post ? 1.3 : 1.15) / zp * uFoc;
    float kp = clamp((w - abs(s.x - b.x)) / px + 0.5, 0.0, 1.0) * min(1.0, 2.0 * w / px + 0.1) * pbox(vec2(b.x, s.y), vec2(b.x - 1.0, b.y), vec2(b.x + 1.0, b.y + h), px);
    if (kp > 0.0) put(plainHaze(post ? wood : steel, rd, zp), kp, zp);
  }
  // The strands: barbed wire, a hair at any distance.
  for (int j = 0; j < 3; j++) {
    float y = 0.55 + 0.27 * float(j) - 0.05 * 4.0 * fract(L / 4.0) * (1.0 - fract(L / 4.0));
    float sy = (y - CAMH) * m;
    float a = clamp(1.0 - abs(s.y - sy) / (px * 0.8), 0.0, 1.0) * min(1.0, 0.006 * m * 2.0 / px + 0.1);
    if (a > 0.0) put(plainHaze(steel, rd, z), a * 0.8, z);
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
