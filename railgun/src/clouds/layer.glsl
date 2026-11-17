// The heap layer: one raymarched shell of heaps, after Window seat's deck.
// The ray finds each heap at its true distance, so size and perspective are true.
// The host declares uVol, uCloudC, uLayerCut, uLayerWind, uSunD, layerSun(P, h) and layerSky().

// The shell, in metres over the curved ground.
const float LY_LO = 1600.0, LY_HI = 3900.0;
// Extinction per metre at full density.
const float LY_SIG = 0.009;
const float LY_R = 6.0e6;
// The first cloud's distance along the ray, or -1.
float gLyT = -1.0;
// The distance along rd to height H over the curved ground, from ro below it.
float lyShell(vec3 ro, vec3 rd, float H) {
  float k = dot(rd.xz, rd.xz), h = H - ro.y;
  return 2.0 * h / (rd.y + sqrt(max(rd.y * rd.y + 2.0 * k * h / LY_R, 0.0)));
}
// Height over the curved ground at p: the ground falls away as d squared over 2R.
float lyH(vec3 ro, vec3 p) { vec2 d = p.xz - ro.xz; return p.y + dot(d, d) / (2.0 * LY_R); }
float lyHG(float mu, float g) { float g2 = g * g; return (1.0 - g2) / pow(1.0 + g2 - 2.0 * g * mu, 1.5); }
// A strong forward lobe for the silver lining, a soft back lobe.
float lyPhase(float mu) { return mix(lyHG(mu, 0.72), lyHG(mu, -0.2), 0.35); }
// The last sample's shape terms, for the crease light.
float gLySh = 0.0, gLyA = 1.0, gLyFb = 0.0;
// Density at p and height h, from 0 to 1.
// Each cell is a round dome with a flat base; billows break its surface.
float lyDens(vec3 p, float h, float lod, bool fine) {
  // The map in km; the whole layer slides with the wind.
  vec2 w = (p.xz + uLayerWind * uCloudC) / 1000.0;
  // Cover from two slices of the noise, turned at odd angles and scales.
  vec2 a = mat2(0.825, -0.565, 0.565, 0.825) * w / 22.0, b = mat2(-0.32, -0.947, 0.947, -0.32) * w / 8.6;
  float cv = texture(uVol, vec3(a, 0.13)).r * 0.65 + texture(uVol, vec3(b, 0.44)).r * 0.35;
  // uLayerCut is the cover threshold: higher leaves more open sky.
  float c = smoothstep(uLayerCut - 0.1, uLayerCut + 0.14, cv);
  if (c <= 0.0) return 0.0;
  // The cell noise peaks near 0.6: stretch it, so each dome reaches its round crown.
  float cell = texture(uVol, vec3(w / 6.5, 0.71)).b;
  float loc = clamp((cell - (1.0 - c) * 0.6) / max(c * 0.42, 0.05), 0.0, 1.0);
  float hk = h / 1000.0, base = LY_LO / 1000.0 + 0.05;
  // A round crown: a circle's profile, not a cone.
  float top = base - 0.1 + (0.35 + 1.1 * c) * sqrt(1.0 - (1.0 - loc) * (1.0 - loc));
  // Depth inside, in km: the dome above, the flat base below.
  float sh = min(top - hk, (hk - base) * 1.5);
  float A = 0.16 + 0.36 * loc;
  // Even the biggest lump cannot reach this point.
  if (sh < -A * 0.55) return 0.0;
  // Billows: round lumps that rise slowly, so the tops boil.
  vec3 q = vec3(w.x * 0.8 - w.y * 0.6, hk - uCloudC * 0.004, w.x * 0.6 + w.y * 0.8);
  vec4 m = texture(uVol, q / 2.4);
  float fb = sh + A * (m.r * 0.6 + m.b * 0.4 - 0.5);
  if (fine) fb += A * 0.35 * (texture(uVol, q / 0.7 + 3.7).g - 0.5);
  gLySh = sh; gLyA = A; gLyFb = fb;
  // The edge is crisp near; far off it softens with the footprint.
  return smoothstep(0.0, 0.04 + 0.06 * lod, fb);
}
// Optical depth toward the sun, in growing steps.
float lyLight(vec3 ro, vec3 p, vec3 L, float lod) {
  float od = 0.0, st = 140.0;
  for (int j = 0; j < 4; j++) {
    p += L * st;
    od += lyDens(p, lyH(ro, p), lod + 1.0, false) * st;
    st *= 1.9;
  }
  return od;
}
// The light the layer scatters along the ray, and in alpha what passes.
// tEnd stops the ray at the ranges.
vec4 lyMarch(vec3 ro, vec3 rd, float tEnd) {
  // Below the horizon the ray meets the ground first.
  if (rd.y < -0.02) return vec4(0.0, 0.0, 0.0, 1.0);
  float t0 = lyShell(ro, rd, LY_LO), t1 = min(min(lyShell(ro, rd, LY_HI), t0 + 60000.0), tEnd);
  if (t0 >= t1) return vec4(0.0, 0.0, 0.0, 1.0);
  const int N = 36;
  float len = t1 - t0;
  // Steps start short and grow, so far cloud reaches the horizon.
  float ds = min(len / float(N), 220.0);
  float grow = clamp(pow(max(len / (ds * float(N)), 1.0), 1.7 / float(N)), 1.0, 1.25);
  // Plain random jitter: an even pattern shows as a hatch at reduced resolution.
  float t = t0 + ds * fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
  vec3 L = uSunD;
  float phase = lyPhase(dot(rd, L)) + 1.5;
  vec3 col = vec3(0.0), sky = layerSky();
  float Tc = 1.0;
  for (int i = 0; i < N; i++) {
    if (t > t1) break;
    vec3 p = ro + rd * t;
    float h = lyH(ro, p);
    // The footprint grows with distance; far cloud takes coarser detail.
    float lod = clamp(log2(t / 4000.0 + 1.0), 0.0, 4.0);
    float dn = lyDens(p, h, lod, lod < 2.0);
    float dSh = gLySh, dA = gLyA, dFb = gLyFb;
    if (dn > 0.002) {
      if (gLyT < 0.0) gLyT = t;
      float h01 = clamp((h - LY_LO) / (LY_HI - LY_LO), 0.0, 1.0);
      float od = lyLight(ro, p, L, lod);
      // Beer's law, with a slower tail for light that scatters many times.
      float Tl = max(exp(-LY_SIG * od), 0.5 * exp(-LY_SIG * od * 0.2));
      // Powder: thin edges facing away from the light look dark.
      float powder = 1.0 - exp(-LY_SIG * dn * 600.0);
      vec3 S = layerSun(p, h) * 0.42 * Tl * phase * mix(1.0, powder, 0.55);
      // Lump crowns catch the sky; creases deep in the dome do not.
      float crease = clamp(0.7 - 1.4 * dSh / max(dA, 0.05), 0.15, 1.2);
      float open = exp(-3.0 * max(dFb, 0.0)) * crease;
      S += sky * 0.42 * (0.3 + 0.7 * h01) * (0.3 + 0.9 * open);
      float a = 1.0 - exp(-LY_SIG * dn * ds);
      col += Tc * S * a;
      Tc *= 1.0 - a;
      if (Tc < 0.02) break;
    }
    t += ds;
    ds *= grow;
  }
  return vec4(col, Tc);
}
