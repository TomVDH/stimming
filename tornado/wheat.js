// Tornado alley: the near wheat, as a stand of stalks the ray walks through.
// The ray steps cell by cell through a grid of stalks, front to back.
// Each cell holds one stalk with its head; the ray meets it at its nearest pass.
// It reads main.js's CAMH, ROAD_X, WHEAT_GAP, WDIR, gust(), bend(), th() and vn().

export const WHEAT_GLSL = /* glsl */`
/* ---------- the near wheat ---------- */
// One stalk per cell, 4.5 cm apart: about 500 a square metre.
const float WH_CELL = 0.045;
// The canopy's skin: the tallest awns reach WH_TOP; most heads end under WH_SKIN.
// A grazing ray crosses the skin over metres, so the skin is a thin haze in closed form.
const float WH_TOP = 1.09, WH_SKIN = 1.0;
// The grid turns against the road, so no row lines up with the eye.
const mat2 WH_R = mat2(0.83, -0.56, 0.56, 0.83);
// The field's edge along the verge wanders, in metres past WHEAT_GAP.
float whEdge(float z) { return 0.32 * (vn(vec2(z * 0.35, 1.7)) - 0.5) + 0.14 * (vn(vec2(z * 2.1, 4.3)) - 0.5); }
// How far a world point lies inside the field, in metres; below 0 it is verge.
float whInside(vec2 xz) { return abs(xz.x - ROAD_X) - WHEAT_GAP - whEdge(xz.y); }
// The stand thins out over its outer 45 cm, so the edge is feathered, not cut.
const float WH_FEATHER = 0.45;
// A wave that runs downwind through the stand: crests about 6 m apart.
// It rides on the gusts and grows with the wind. 0 is upright, 1 a full crest.
float wheatWave(vec2 xz) {
  float ph = dot(xz, WDIR) * 1.05 - uT * (2.2 + 2.8 * uWind) + vn(xz * 0.15) * 3.0;
  return pow(0.5 + 0.5 * sin(ph), 2.0) * (0.25 + 0.75 * gust(xz)) * (0.3 + 0.7 * uWind);
}
// The stand along one ray. It returns the stand's colour and what still shows of the ground.
vec4 wheatStand(vec3 rd, float px) {
  vec3 eye = vec3(0.0, CAMH, 0.0);
  vec3 sunD = normalize(uSun + vec3(0.0, 0.02, 0.0));
  float sinEl = max(sunD.y, 0.04);
  vec3 acc = vec3(0.0);
  float T = 1.0;
  // Where the ray enters the field: the eye may stand on the verge, beside the stand.
  float tE = 0.0;
  // The walk starts at the outermost stalk the wandering edge allows.
  float gap = WHEAT_GAP - 0.2;
  if (abs(ROAD_X) < gap) tE = rd.x < 0.0 ? (ROAD_X - gap) / rd.x : (ROAD_X + gap) / max(rd.x, 1e-6);
  // The skin: awns and the tallest heads, lit by the low sun, thicker in clumps.
  float tA = max(max((CAMH - WH_TOP) / -rd.y, 0.0), tE), t0 = max(max((CAMH - WH_SKIN) / -rd.y, 0.0), tE);
  // A ray that meets the ground before the field sees no stand.
  if (CAMH + rd.y * t0 <= 0.0) return vec4(0.0, 0.0, 0.0, 1.0);
  vec2 xs = (eye + rd * mix(tA, t0, 0.5)).xz;
  if (t0 > tA) {
    float g = gust(xs), wv = wheatWave(xs);
    float dens = 1.1 * (0.55 + 0.9 * vn(xs * 2.3)) * (1.0 - 0.35 * wv) * smoothstep(0.0, WH_FEATHER * 1.5, whInside(xs));
    float Tb = exp(-dens * (t0 - tA) * length(rd.xz));
    vec3 awn = mix(vec3(0.42, 0.32, 0.15), vec3(0.58, 0.49, 0.31), 0.3 + 0.5 * wv + 0.2 * g) * (uSunCol * 0.5 * 1.2 + uAmb * 0.55);
    acc = awn * (1.0 - Tb);
    T = Tb;
  }
  vec3 p0 = eye + rd * t0;
  // The lean barely changes over one walk: it is read once, where the ray enters.
  // The walk runs in leaned space, where every stalk stands straight.
  float g = gust(p0.xz), wv = wheatWave(p0.xz);
  vec2 L = WH_R * (bend(p0.xz, 1.0, g) + WDIR * 0.16 * wv) / WH_CELL;
  // The ray in cell units: q(s) = q0 + dq * s, with s in metres past t0.
  vec2 q0 = WH_R * p0.xz / WH_CELL - L * p0.y, dq = WH_R * rd.xz / WH_CELL - L * rd.y;
  vec2 cell = floor(q0), stp = sign(dq);
  vec2 inv = 1.0 / max(abs(dq), vec2(1e-6));
  vec2 tMax = (stp * (cell - q0) + max(stp, 0.0)) * inv;
  float s = 0.0;
  for (int i = 0; i < 40; i++) {
    float sOut = min(tMax.x, tMax.y);
    float yIn = p0.y + rd.y * s;
    if (yIn < 0.0 || T < 0.02) break;
    vec2 c = cell + 517.0;
    // The stalk's world place: no wheat on the road or its verges.
    vec2 wxz = transpose(WH_R) * ((cell + 0.5) * WH_CELL);
    // The walk's cells are leaned; the road test reads the foot.
    float inside = whInside(wxz);
    // Near the edge more cells stand empty; a few do everywhere, so no row lines up.
    float dens = 0.92 * smoothstep(-0.05, WH_FEATHER, inside);
    if (th(c + 9.1) < dens) {
      vec3 h = vec3(th(c), th(c + 3.1), th(c + 7.7));
      // The stalk stands anywhere in its cell: no lattice shows.
      vec2 o = cell + 0.06 + 0.88 * h.xy;
      // Heights vary in clumps; edge stalks stand shorter.
      float top = 0.94 + 0.08 * h.z + 0.07 * (vn(wxz * 1.3 + 5.0) - 0.5) - 0.1 * (1.0 - smoothstep(0.0, WH_FEATHER, inside));
      // In leaned space the ray's gap to the stalk is linear in s: its nearest pass is one solve.
      vec2 D0 = q0 - o, Dv = dq;
      float sIn = s;
      float sc = clamp(-dot(D0, Dv) / max(dot(Dv, Dv), 1e-8), sIn, sOut);
      vec2 D = D0 + Dv * sc;
      float y = p0.y + rd.y * sc, d = length(D);
      // A pixel's width here, in cell units.
      float aa = max((t0 + sc) * px / uFoc / WH_CELL, 0.02);
      float e = (top - y) / 0.1;
      float r = 0.0, a = 1.0;
      bool head = e > -0.5 && e < 1.0;
      // The head: a spindle 10 cm long and 1.2 cm thick, its kernels in rows.
      if (e >= 0.0 && e < 1.0) r = 0.14 * sin(3.14159 * sqrt(e)) * (0.9 + 0.1 * sin(e * 40.0 + atan(D.y, D.x) * 3.0));
      // The awns: a fine pale fringe up to 5 cm over the head.
      else if (e < 0.0 && e > -0.5) { r = 0.16 * (1.0 + e * 2.0); a = 0.3; }
      // The stalk: 5 mm thick, a little thicker low down where the leaves sheathe it.
      else if (y > 0.0) { r = 0.06 + 0.05 * smoothstep(0.6, 0.2, y); a = 0.9; }
      float k = a * smoothstep(r + aa, r - aa, d) * min(1.0, 2.0 * r / aa);
      if (k > 0.002) {
        // The canopy shades what lies under its top; a low sun reaches only the top few centimetres.
        // Along the verge the sun and the sky also reach in through the field's open face.
        float depth = max(top - 0.03 - y, 0.0);
        bool left = wxz.x < ROAD_X;
        inside = max(inside, 0.0);
        float sideX = left ? sunD.x : -sunD.x;
        float path = min(depth / sinEl, sideX > 0.02 ? inside / sideX : 1e3);
        float sunT = exp(-path * 3.5);
        // Gaps in the canopy let a sunfleck through, now and then.
        sunT = max(sunT, 0.6 * step(0.93, th(c + floor(y * 8.0) + 1.7)) * exp(-depth * 2.0));
        // Deep in the stand less sky reaches: the stalks go dark.
        // At the open face the sky and the verge's bounce light the stalks.
        float face = exp(-inside / 0.6);
        float ao = max(mix(0.25, 1.0, smoothstep(0.15, 0.95, y)), 1.3 * face);
        // The head's side toward the sun takes the light; its far side goes dark.
        vec2 nxz = transpose(WH_R) * (D / max(d, 1e-4));
        float lam = head ? clamp(dot(nxz, sunD.xz) * 0.6 + 0.45, 0.0, 1.0) : 0.6;
        vec3 alb = head ? mix(vec3(0.3, 0.2, 0.08), vec3(0.46, 0.33, 0.14), th(c + 1.3)) : mix(vec3(0.3, 0.23, 0.11), vec3(0.26, 0.24, 0.1), th(c + 2.9));
        if (e < 0.0 && head) alb = vec3(0.55, 0.47, 0.3);
        // A bent stalk shows its pale side to the eye.
        alb = mix(alb, vec3(0.55, 0.47, 0.3), (g * 0.35 + wv * 0.4) * (head ? 1.0 : 0.5));
        vec3 col = alb * (uSunCol * 0.5 * lam * sunT * 1.4 + uAmb * 0.55 * ao);
        acc += T * k * col;
        T *= 1.0 - k;
        if (T < 0.02) break;
      }
    }
    // The next cell along the ray.
    s = sOut;
    if (tMax.x < tMax.y) { tMax.x += inv.x; cell.x += stp.x; } else { tMax.y += inv.y; cell.y += stp.y; }
  }
  // What the walk did not reach: deep stalks in their own shade, unless the ray ends on a verge or the road.
  // A walk cut short high in the stand takes the canopy's mean light, not the deep shade.
  vec2 gxz = rd.xz * (CAMH / -rd.y);
  float yEnd = p0.y + rd.y * s;
  vec3 deep = vec3(0.17, 0.12, 0.05) * (uSunCol * 0.12 + uAmb * 0.3);
  vec3 crown = vec3(0.36, 0.26, 0.11) * (uSunCol * 0.3 + uAmb * 0.45);
  // The fill varies stalk to stalk too, so a far face is not one flat colour.
  float fv = 0.75 + 0.5 * vn(gxz * 3.7 + vec2(yEnd * 9.0, 0.0));
  if (whInside(gxz) > -0.05) { acc += T * mix(deep, crown, smoothstep(0.55, 1.0, yEnd)) * fv; T = 0.0; }
  return vec4(acc, T);
}
`;
