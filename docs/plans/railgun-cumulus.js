// The railgun's cloud layer: one raymarched shell of heaps, after Window seat's deck.
// The ray finds the cloud itself, so size and perspective are true.

// Heights in metres above the curved ground.
export const CU = { lo: 1600, hi: 3900, cover: 0.52, wind: [10, 4] };

// The host declares: sampler3D uVol, float uCloudC, float uCuCover, vec2 uCuWind,
//   vec3 cuSun(float h) (the sunlight at height h), vec3 cuSky() (the sky light),
//   and the sun's direction uSunD.
// cuMarch(ro, rd, tEnd) returns the light it scatters and, in alpha, what passes.
// gCuT holds the first cloud's distance, for the air.
export const CU_GLSL = /* glsl */`
const float CU_LO = ${CU.lo.toFixed(1)}, CU_HI = ${CU.hi.toFixed(1)};
// Extinction per metre at full density.
const float CU_SIG = 0.009;
const float CU_R = 6.0e6;
float gCuT = -1.0;
// The distance along rd to height H over the curved ground, from ro below it.
// The ground falls away as d squared over 2R, so the shell bends down.
float cuShell(vec3 ro, vec3 rd, float H) {
  float k = dot(rd.xz, rd.xz), h = H - ro.y;
  return 2.0 * h / (rd.y + sqrt(max(rd.y * rd.y + 2.0 * k * h / CU_R, 0.0)));
}
// Height over the curved ground at p.
float cuH(vec3 ro, vec3 p) { vec2 d = p.xz - ro.xz; return p.y + dot(d, d) / (2.0 * CU_R); }
// Two Henyey-Greenstein lobes: a strong forward one and a soft back one.
float cuHG(float mu, float g) { float g2 = g * g; return (1.0 - g2) / pow(1.0 + g2 - 2.0 * g * mu, 1.5); }
float cuPhase(float mu) { return mix(cuHG(mu, 0.72), cuHG(mu, -0.2), 0.35); }
// The last sample's shape terms, for the crease light.
float gCuSh = 0.0, gCuA = 1.0, gCuFb = 0.0;
// Density at p (metres) and height h over the ground, from 0 to 1.
// Each cell is a dome with a flat base; billows break its surface.
float cuDens(vec3 p, float h, float lod, bool fine) {
  // The map in km; the whole layer slides with the wind.
  vec2 w = (p.xz + uCuWind * uCloudC) / 1000.0;
  // Cover from two slices of the noise, turned at odd angles and scales.
  vec2 a = mat2(0.825, -0.565, 0.565, 0.825) * w / 22.0, b = mat2(-0.32, -0.947, 0.947, -0.32) * w / 8.6;
  float cv = texture(uVol, vec3(a, 0.13)).r * 0.65 + texture(uVol, vec3(b, 0.44)).r * 0.35;
  float c = smoothstep(uCuCover - 0.1, uCuCover + 0.14, cv);
  if (c <= 0.0) return 0.0;
  // The cell map sets each dome's height; more cover makes bigger domes.
  float cell = texture(uVol, vec3(w / 6.5, 0.71)).b;
  // The cell noise peaks near 0.6: stretch it, so each dome reaches its round crown.
  float loc = clamp((cell - (1.0 - c) * 0.6) / max(c * 0.42, 0.05), 0.0, 1.0);
  float hk = h / 1000.0, base = CU_LO / 1000.0 + 0.05;
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
  gCuSh = sh; gCuA = A; gCuFb = fb;
  // The edge is crisp near; far off it softens with the footprint.
  return smoothstep(0.0, 0.04 + 0.06 * lod, fb);
}
// Optical depth toward the sun, in growing steps.
float cuLight(vec3 ro, vec3 p, vec3 L, float lod) {
  float od = 0.0, st = 140.0;
  for (int j = 0; j < 4; j++) {
    p += L * st;
    od += cuDens(p, cuH(ro, p), lod + 1.0, false) * st;
    st *= 1.9;
  }
  return od;
}
vec4 cuMarch(vec3 ro, vec3 rd, float tEnd) {
  // Below the horizon the ray meets the ground first.
  if (rd.y < -0.02) return vec4(0.0, 0.0, 0.0, 1.0);
  float t0 = cuShell(ro, rd, CU_LO), t1 = min(cuShell(ro, rd, CU_HI), t0 + 60000.0);
  t1 = min(t1, tEnd);
  if (t0 >= t1) return vec4(0.0, 0.0, 0.0, 1.0);
  const int N = 36;
  float len = t1 - t0;
  // Steps start short and grow, so far cloud reaches the horizon.
  float ds = min(len / float(N), 220.0);
  float grow = clamp(pow(max(len / (ds * float(N)), 1.0), 1.7 / float(N)), 1.0, 1.25);
  // Plain random jitter: an even pattern shows as a hatch at half resolution.
  float t = t0 + ds * fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
  vec3 L = uSunD;
  float mu = dot(rd, L), phase = cuPhase(mu) + 1.5;
  vec3 col = vec3(0.0), sky = cuSky();
  float Tc = 1.0;
  for (int i = 0; i < N; i++) {
    if (t > t1) break;
    vec3 p = ro + rd * t;
    float h = cuH(ro, p);
    // Footprint: a level of detail that grows with distance.
    float lod = clamp(log2(t / 4000.0 + 1.0), 0.0, 4.0);
    float dn = cuDens(p, h, lod, lod < 2.0);
    float dSh = gCuSh, dA = gCuA, dFb = gCuFb;
    if (dn > 0.002) {
      if (gCuT < 0.0) gCuT = t;
      float h01 = clamp((h - CU_LO) / (CU_HI - CU_LO), 0.0, 1.0);
      float od = cuLight(ro, p, L, lod);
      // Beer's law, with a slower tail for light that scatters many times.
      float Tl = max(exp(-CU_SIG * od), 0.5 * exp(-CU_SIG * od * 0.2));
      // Powder: thin edges facing away from the light look dark.
      float powder = 1.0 - exp(-CU_SIG * dn * 600.0);
      vec3 S = cuSun(h) * 0.42 * Tl * phase * mix(1.0, powder, 0.55);
      // Sky light from above; lump crowns catch it, creases deep in the dome do not.
      float crease = clamp(0.7 - 1.4 * dSh / max(dA, 0.05), 0.15, 1.2);
      float open = exp(-3.0 * max(dFb, 0.0)) * crease;
      S += sky * 0.42 * (0.3 + 0.7 * h01) * (0.3 + 0.9 * open);
      float a = 1.0 - exp(-CU_SIG * dn * ds);
      col += Tc * S * a;
      Tc *= 1.0 - a;
      if (Tc < 0.02) break;
    }
    t += ds;
    ds *= grow;
  }
  return vec4(col, Tc);
}
`;
