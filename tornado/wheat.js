// Tornado alley: the near wheat, as a stand of stalks the ray walks through.
// The ray steps cell by cell through a grid of stalks, front to back.
// Each cell holds one stalk with its head; the ray meets it at its nearest pass.
// It reads main.js's CAMH, ROAD_X, WHEAT_GAP, gust(), bend(), th() and vn().
// The wind's waves and gusts come from gust(): xy the lean, z the sheen, w the gust.

export const WHEAT_GLSL = /* glsl */`
/* ---------- the near wheat ---------- */
// One stalk per cell, 4.5 cm apart: about 500 a square metre.
const float WH_CELL = 0.045;
// The canopy's skin: the tallest awns reach WH_TOP; most heads end under WH_SKIN.
// A grazing ray crosses the skin over metres, so the skin is a thin haze in closed form.
const float WH_TOP = 1.09, WH_SKIN = 1.0;
// The grid turns against the road, so no row lines up with the eye.
const mat2 WH_R = mat2(0.83, -0.56, 0.56, 0.83);
// The lens focuses far: a near stalk blurs by the aperture's radius, about 3 mm at f/5.6.
// In metres that blur is the same at every depth, so one constant serves.
const float WH_BLUR = 0.003 / WH_CELL;
// The field's edge along the verge wanders, in metres past WHEAT_GAP.
float whEdge(float z) { return 0.32 * (vn(vec2(z * 0.35, 1.7)) - 0.5) + 0.14 * (vn(vec2(z * 2.1, 4.3)) - 0.5); }
// How far a world point lies inside the field, in metres; below 0 it is verge.
float whInside(vec2 xz) { return abs(xz.x - ROAD_X) - WHEAT_GAP - whEdge(xz.y); }
// The stand thins out over its outer 45 cm, so the edge is feathered, not cut.
const float WH_FEATHER = 0.45;
// The stand along one ray. It returns the stand's colour and what still shows of the ground.
vec4 wheatStand(vec3 rd, float px) {
  vec3 eye = vec3(0.0, CAMH, 0.0);
  vec3 sunD = normalize(uSun + vec3(0.0, 0.02, 0.0));
  float sinEl = max(sunD.y, 0.04);
  // Toward the sun the eye sees light come through the heads and awns.
  float back = pow(max(dot(rd, sunD), 0.0), 3.0);
  // The shade takes the sky's colour: the horizon on the sun's side and away from it.
  // The pair is scaled to the fill's brightness, so only the colour changes.
  vec3 hzS = hazeCol(sunD), hzA = hazeCol(-sunD);
  float lum = dot(uAmb, vec3(0.3, 0.55, 0.15)) * 2.0 / max(dot(hzS + hzA, vec3(0.3, 0.55, 0.15)), 1e-4);
  // Half the tint: the sky's own colour, never a sunset wash over the whole stand.
  hzS = mix(uAmb, hzS * lum, 0.5); hzA = mix(uAmb, hzA * lum, 0.5);
  vec2 sh = normalize(sunD.xz + 1e-6), vh = normalize(-rd.xz + 1e-6);
  vec3 acc = vec3(0.0);
  float T = 1.0;
  // Where the ray enters the field: the eye may stand on the verge, beside the stand.
  float tE = 0.0;
  // The walk starts at the outermost stalk the wandering edge allows.
  float gap = WHEAT_GAP - 0.2;
  if (abs(ROAD_X) < gap) tE = rd.x < 0.0 ? (ROAD_X - gap) / rd.x : (ROAD_X + gap) / max(rd.x, 1e-6);
  // The skin: awns and the tallest heads, lit by the low sun, thicker in clumps.
  // Near the eye the walk starts over the tallest awns, so each head shows its own top.
  // Far off the skin stands in for the tops: a grazing ray would spend its walk above them.
  float tA = max(max((CAMH - WH_TOP) / -rd.y, 0.0), tE);
  float skin = mix(WH_TOP, WH_SKIN, smoothstep(2.5, 8.0, tA * length(rd.xz)));
  float t0 = max(max((CAMH - skin) / -rd.y, 0.0), tE);
  // A ray that meets the ground before the field sees no stand.
  if (CAMH + rd.y * t0 <= 0.0) return vec4(0.0, 0.0, 0.0, 1.0);
  vec2 xs = (eye + rd * mix(tA, t0, 0.5)).xz;
  if (t0 > tA) {
    vec4 gs = gust(xs, 0.0);
    float g = gs.w, wv = max(gs.z, 0.0);
    // Clumps thicken the skin; they fade once a pixel spans them along the view.
    float fs = t0 * px / uFoc * t0 / max(CAMH - WH_SKIN, 0.02);
    float dens = 1.1 * (0.55 + 0.9 * mix(0.5, vn(xs * 2.3), 1.0 - smoothstep(0.1, 0.4, fs))) * (1.0 - 0.35 * wv) * smoothstep(0.0, WH_FEATHER * 1.5, whInside(xs));
    float Tb = exp(-dens * (t0 - tA) * length(rd.xz));
    vec3 awn = mix(vec3(0.42, 0.32, 0.15), vec3(0.58, 0.49, 0.31), 0.3 + 0.5 * wv + 0.2 * g);
    // The heads' grain, 3 cm across: sharp across the view, stretched along it as a pixel spans more.
    float fa = t0 * px / uFoc;
    vec2 acr = vec2(-vh.y, vh.x);
    float gr = vn(vec2(dot(xs, acr) * 33.0, dot(xs, vh) * 33.0 * clamp(0.03 / fs, 0.02, 1.0)));
    awn *= 0.8 + 0.4 * mix(0.5, gr, 1.0 - smoothstep(0.012, 0.03, fa));
    awn *= uSunCol * 0.5 * (1.2 + 1.6 * back * vec3(1.0, 0.85, 0.55)) + (hzS + hzA) * 0.275;
    acc = awn * (1.0 - Tb);
    T = Tb;
  }
  vec3 p0 = eye + rd * t0;
  // The lean barely changes over one walk: it is read once, where the ray enters.
  // The walk runs in leaned space, where every stalk stands straight.
  vec4 gw = gust(p0.xz, 0.0);
  float g = gw.w, wv = max(gw.z, 0.0);
  vec2 L = WH_R * bend(gw, 1.0) / WH_CELL;
  // Ripeness in patches: green-gold, ripe gold, and pale dead-ripe heads.
  // A patch spans metres, so the ray reads it once, where it enters.
  float rp0 = vn(p0.xz * 0.06 + 3.0) * 0.65 + vn(p0.xz * 0.5 + 8.0) * 0.35;
  // The waxy sheen runs along the stalks: a hair-like highlight about their leaned axis.
  // It is faint toward a sun behind the eye and glints at a grazing sun ahead.
  vec2 lw = bend(gw, 1.0);
  vec3 ax = normalize(vec3(lw.x, 1.0, lw.y)), Hs = normalize(sunD - rd);
  float tH = dot(ax, Hs);
  float spec = pow(max(1.0 - tH * tH, 0.0), 40.0) * (0.04 + 0.96 * pow(1.0 - max(dot(-rd, Hs), 0.0), 5.0));
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
    // The ray's own cell, then the neighbour on its side: a tilted stalk or a nodding head can cross over.
    vec2 qm = q0 + dq * (0.5 * (s + sOut));
    vec2 nb = abs(dq.x) > abs(dq.y) ? vec2(0.0, fract(qm.y) < 0.5 ? -1.0 : 1.0) : vec2(fract(qm.x) < 0.5 ? -1.0 : 1.0, 0.0);
    for (int j = 0; j < 2; j++) {
      vec2 cc = j == 0 ? cell : cell + nb;
      vec2 c = cc + 517.0;
      // The stalk's world place: no wheat on the road or its verges.
      vec2 wxz = transpose(WH_R) * ((cc + 0.5) * WH_CELL);
      // The walk's cells are leaned; the road test reads the foot.
      float inside = whInside(wxz);
      // Near the edge more cells stand empty; thin patches open here and there.
      float dens = 0.92 * smoothstep(-0.05, WH_FEATHER, inside) * mix(0.35, 1.0, smoothstep(0.22, 0.48, vn(wxz * 0.6 + 11.0)));
      if (th(c + 9.1) < dens) {
        vec3 h = vec3(th(c), th(c + 3.1), th(c + 7.7));
        // The stalk stands anywhere in its cell: no lattice shows.
        vec2 o = cc + 0.06 + 0.88 * h.xy;
        // Heights vary in lumps about a metre wide, finer clumps, stalk by stalk, and a few stragglers stand tall.
        float top = 0.86 + 0.12 * vn(wxz * 0.9 + 5.0) + 0.05 * vn(wxz * 3.1 + 2.0) + 0.06 * (h.z - 0.5);
        top += 0.09 * step(0.96, th(c + 5.5)) - 0.1 * (1.0 - smoothstep(0.0, WH_FEATHER, inside));
        top = min(top, WH_TOP - 0.03);
        // Each stalk tilts a few degrees its own way about its head, in cells per metre.
        vec2 tilt = (vec2(th(c + 4.4), th(c + 6.6)) - 0.5) * 3.2;
        // The head nods 10 to 30 degrees, mostly downwind; the awns follow it.
        float hl = 0.09 + 0.03 * th(c + 8.8), yb = top - hl;
        vec2 nod = normalize(WH_R * WDIR * 1.2 + vec2(th(c + 2.2), th(c + 3.7)) - 0.5) * (4.0 + 6.0 * th(c + 6.1));
        // In leaned space the gap to a straight axis is linear in s: each nearest pass is one solve.
        // The stalk: o + tilt (y - yb). The head: from the stalk's top along the nod.
        vec2 Ds0 = q0 - o + tilt * (yb - p0.y), Dsv = dq - tilt * rd.y;
        vec2 Dh0 = q0 - o + nod * (yb - p0.y), Dhv = dq - nod * rd.y;
        float sIn = s;
        float ss = clamp(-dot(Ds0, Dsv) / max(dot(Dsv, Dsv), 1e-8), sIn, sOut);
        float sh2 = clamp(-dot(Dh0, Dhv) / max(dot(Dhv, Dhv), 1e-8), sIn, sOut);
        float yh = p0.y + rd.y * sh2;
        // The head's pass counts where it falls on the head or its awns; else the stalk's.
        bool onHead = yh > yb - 0.01;
        float sc = onHead ? sh2 : ss;
        vec2 D = onHead ? Dh0 + Dhv * sc : Ds0 + Dsv * sc;
        float y = p0.y + rd.y * sc, d = length(D);
        // A pixel's width here, in cell units.
        float aa = max((t0 + sc) * px / uFoc / WH_CELL, 0.02) + WH_BLUR;
        float e = (top - y) / hl;
        float r = 0.0, a = 1.0;
        bool head = onHead && e > -0.5 && e < 1.0;
        // The head: a spindle about 10 cm long and 1.2 cm thick, its kernels in rows.
        if (onHead && e >= 0.0 && e < 1.0) r = 0.14 * sin(3.14159 * sqrt(e)) * (0.9 + 0.1 * sin(e * 40.0 + atan(D.y, D.x) * 3.0));
        // The awns: a fine pale fringe up to 5 cm past the head.
        else if (onHead && e < 0.0 && e > -0.5) { r = 0.16 * (1.0 + e * 2.0); a = 0.3; }
        // The stalk: 5 mm thick, a little thicker low down where the leaves sheathe it.
        else if (!onHead && y > 0.0 && y < yb) { r = 0.06 + 0.05 * smoothstep(0.6, 0.2, y); a = 0.9; }
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
          // The surface the eye meets on the round stalk or head, and its normal.
          float u = clamp(d / max(r, 1e-4), 0.0, 1.0);
          vec2 nxz = transpose(WH_R) * (D / max(d, 1e-4));
          vec2 N = nxz * u + vh * sqrt(1.0 - u * u);
          // The side toward the sun takes the light; the far side goes dark.
          float lam = clamp(dot(N, sunD.xz) * 0.6 + 0.45, 0.0, 1.0);
          // Ripeness: the ray's patch, and each stalk a little on its own.
          float rp = rp0 + 0.15 * (th(c + 1.3) - 0.5);
          vec3 ripe = mix(mix(vec3(0.22, 0.21, 0.08), vec3(0.42, 0.3, 0.12), smoothstep(0.15, 0.45, rp)), vec3(0.5, 0.41, 0.25), smoothstep(0.6, 0.9, rp));
          // Stalks are straw up top and still green-grey near the soil.
          // Each joint between nodes takes its own shade, so no stalk runs as one long bar.
          vec3 alb = head ? ripe : mix(vec3(0.17, 0.18, 0.08), ripe * vec3(0.9, 0.95, 1.0), smoothstep(0.15, 0.6, y)) * (0.75 + 0.45 * th(c + floor(y * 11.0) * 1.7));
          if (e < 0.0 && head) alb = mix(ripe, vec3(0.6, 0.52, 0.34), 0.6);
          // A bent stalk shows its pale side to the eye.
          // Behind a crest it swings back and shows its dark side.
          alb = mix(alb, vec3(0.55, 0.47, 0.3), (g * 0.2 + wv * 0.5) * (head ? 1.0 : 0.5));
          alb *= 1.0 + 0.3 * min(gw.z, 0.0);
          // Thin tissue passes light: awns most, heads some, stalks a little.
          // Backlit, it glows warm and most at the rim, where the eye sees through the least.
          float thin = e < 0.0 ? 0.9 : (head ? 0.35 : 0.15);
          vec3 glow = alb * vec3(1.0, 0.85, 0.55) * 2.0 * back * thin * (0.4 + 0.9 * smoothstep(0.4, 1.0, u));
          vec3 sun = alb * lam * 1.4 + spec * (head ? 1.5 : 3.0) + glow;
          // The sky that way, in the shade and in the open face.
          vec3 sky = mix(hzA, hzS, 0.5 + 0.5 * dot(N, sh));
          vec3 col = uSunCol * 0.5 * sunT * sun + alb * sky * 0.55 * ao;
          acc += T * k * col;
          T *= 1.0 - k;
          if (T < 0.02) break;
        }
      }
    }
    if (T < 0.02) break;
    // The next cell along the ray.
    s = sOut;
    if (tMax.x < tMax.y) { tMax.x += inv.x; cell.x += stp.x; } else { tMax.y += inv.y; cell.y += stp.y; }
  }
  // What the walk did not reach: deep stalks in their own shade, unless the ray ends on a verge or the road.
  // A walk cut short high in the stand takes the canopy's mean light, not the deep shade.
  vec2 gxz = rd.xz * (CAMH / -rd.y);
  float yEnd = p0.y + rd.y * s;
  vec3 hzM = (hzS + hzA) * 0.5;
  vec3 deep = vec3(0.17, 0.12, 0.05) * (uSunCol * 0.12 + hzM * 0.3);
  vec3 crown = vec3(0.3, 0.22, 0.09) * (uSunCol * (0.25 + 0.35 * back * vec3(1.0, 0.85, 0.55)) + hzM * 0.4);
  // The fill varies stalk to stalk too, so a far face is not one flat colour.
  // Its grain reads where the ray enters the stand, so it holds still from row to row.
  // From the tops a pixel spans metres along the view there: the grain fades out.
  float fe = t0 * px / uFoc, fz = t0 > tE + 1e-3 ? fe * t0 / max(CAMH - WH_SKIN, 0.02) : fe;
  float fv = 0.75 + 0.5 * mix(0.5, vn(vec2(dot(p0.xz, vec2(1.1, 3.7)), p0.y * 22.0)), 1.0 - smoothstep(0.08, 0.25, fz));
  // Heads and stalks deeper in: a 3 cm grain where a pixel still resolves it.
  fv *= 0.7 + 0.6 * mix(0.5, vn(vec2(dot(p0.xz, vec2(9.0, 30.0)), yEnd * 30.0)), 1.0 - smoothstep(0.012, 0.03, fz));
  // Only the top of the deep stand catches the light; under it the stand goes dark.
  if (whInside(gxz) > -0.05) { acc += T * mix(deep, crown, smoothstep(0.72, 1.0, yEnd)) * fv; T = 0.0; }
  return vec4(acc, T);
}
`;
