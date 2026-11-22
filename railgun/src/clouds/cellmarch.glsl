// The march through one storm cell, after Window seat's tower march, in kilometres.
// The host defines cell.glsl, the storm host (stormSun, stormSky, stormTwi, stormFlash, stormExtra),
// Ls, uStars, uStormSoft and CELL_R, the planet's radius in metres, before this chunk.
// The host pastes CLOUDS (shared/clouds.js) first, for clPhase.

// The march's stride in km near the eye; it grows with distance.
const float CELL_STEP = 0.45;

// The ray's span inside cell i: its bound and its height shell; x > y on a miss.
// The height over the curved ground rises along the ray by t * t / (2 R).
vec2 cellSpan(int i, vec3 ro, vec3 rd) {
  vec4 e = uCe[i];
  vec2 oc = ro.xz - e.xy;
  float A2 = dot(rd.xz, rd.xz), B = dot(oc, rd.xz), C2 = dot(oc, oc) - e.z * e.z, D = B * B - A2 * C2;
  if (D <= 0.0 || A2 < 1e-9) return vec2(1.0, 0.0);
  D = sqrt(D);
  vec2 sp = vec2(max((-B - D) / A2, 0.0), (-B + D) / A2);
  // The shell: from under the base to over the overshoot.
  float a = A2 / (2.0 * CELL_R), lo = (uCb[i].w - 0.6) * 1000.0, hi = (uCa[i].w + 0.5 * uCa[i].z + 0.5) * 1000.0;
  // The root of a t * t + rd.y * t = h - ro.y, in a form that keeps its precision.
  float tLo = 2.0 * (lo - ro.y) / (rd.y + sqrt(rd.y * rd.y + 4.0 * a * (lo - ro.y)));
  float tHi = 2.0 * (hi - ro.y) / (rd.y + sqrt(rd.y * rd.y + 4.0 * a * (hi - ro.y)));
  return vec2(max(sp.x, tLo), min(sp.y, tHi));
}

// It returns the colour and, in alpha, the cover; Phit is the first cloud.
// Flash holds the lightning and the storm host's other lights: the host adds them after the air.
vec4 marchCell(vec3 ro, vec3 rd, float t0, float t1, float jit, out vec3 Phit, out vec3 Flash) {
  float mu = dot(rd, Ls), phase = clPhase(mu);
  // Far flashes punch through the haze, so distant storms still flicker.
  float fBoost = 1.0 + clamp(t0 / 120000.0, 0.0, 1.5);
  vec3 twi = stormTwi();
  vec3 col = vec3(0.0);
  Flash = vec3(0.0);
  // Steps grow with distance, as a pixel's footprint does.
  float st = CELL_STEP * clamp(t0 / 70000.0, 0.75, 2.2), stm = st * 1000.0;
  float Tc = 1.0, t = t0 + stm * jit;
  Phit = ro + rd * t0;
  bool hit = false;
  for (int k = 0; k < 96; k++) {
    if (t > t1) break;
    vec3 P = ro + rd * t;
    vec2 dxz = P.xz - ro.xz;
    vec3 p = vec3(P.x - gC.x, P.y + dot(dxz, dxz) / (2.0 * CELL_R), P.z - gC.y) / 1000.0;
    float aw, sh = towerShape(p, aw);
    float A = billowAmp(p.y, aw);
    // Far outside the shape, even the biggest lump cannot reach: skip ahead.
    float gap = -sh - A * 1.3 - 0.5;
    if (gap > 0.0) { t += max(gap * 800.0, stm); continue; }
    // Lumps at the railgun's own strength: twice Window seat's, for far storms.
    float fb = sh + A * 2.2 * billow(p, aw);
    fb += A * 1.2 * (0.4 + 0.5 * aw) * billowFine(p, aw);
    // The anvil is ice: far out, it frays to a veil.
    float far = aw * smoothstep(0.0, gLen + gR2, dot(p.xz, gAx));
    fb -= far * 0.6;
    // A decaying column frays and thins below its anvil.
    float dc = gDecay * (1.0 - aw);
    fb -= dc * A * 0.5;
    float dn = smoothstep(0.0, 0.3 + 0.9 * dc, fb) * gGrow * (1.0 - 0.7 * far) * (1.0 - 0.5 * dc);
    if (dn < 0.004) { t += stm; continue; }
    if (!hit) { Phit = P; hit = true; }
    float h01 = clamp((p.y - gBase) / (gTop - gBase), 0.0, 1.0);
    // Light toward the sun: a lumpy tap near, a smooth tap far.
    float od = towerLightDens(p + Ls * 0.5) * 0.8 + shapeTap(p + Ls * 2.2) * 1.8;
    // Beer's law for the direct beam; light scattered many times spreads evenly.
    float Tl = exp(-3.0 * od), Tm = 0.3 * exp(-0.6 * od);
    // Powder: thin edges that face away from the light stay dark.
    float powder = mix(1.0, 1.0 - exp(-5.0 * dn), 0.5 * (1.0 - max(mu, 0.0)));
    vec3 S = stormSun(P) * (Tl * phase + Tm * 0.7) * powder;
    // Sky light falls from above; folds and the base see little.
    // Creases sit deep in the base shape; lump crowns stand out of it.
    float crease = clamp(0.7 - 1.4 * sh / max(A, 0.1), 0.15, 1.2);
    float open = exp(-0.45 * max(fb, 0.0)) * crease;
    // A tap outward and up finds a lump in the way, so folds stay dim.
    vec2 rad = normalize(p.xz - gAx * gLean * h01 + 1e-4);
    open *= 1.0 - 0.75 * towerLightDens(p + vec3(rad.x * 0.4, 0.3, rad.y * 0.4));
    float sky = (0.2 + 0.8 * h01) * (0.25 + 0.75 * open);
    S += stormSky(h01) * 1.5 * sky;
    // The glow round the sun lights the side that faces it.
    S += twi * 0.3 * Tl * (0.3 + 0.25 * phase) * open;
    S *= mix(1.0, 0.45, uStars);
    // The base is flat and dark.
    S *= mix(0.55, 1.0, smoothstep(gBase, gBase + 2.5, p.y));
    // A soft storm is thinner at its rim: the light seeps further in.
    float al = 1.0 - exp(-7.0 * dn * st / mix(1.0, uStormSoft, 0.5));
    col += Tc * S * al;
    // The flash is a soft ball of light inside the cloud, brightest deep in.
    Flash += Tc * stormFlash(P) * (1.0 - 0.6 * clamp(open, 0.0, 1.0)) * fBoost * al;
    // The blast, the bolt and the rock join the flash.
    Flash += Tc * stormExtra(P, p, 1.0 - exp(-5.0 * dn), exp(-0.6 * od)) * al;
    Tc *= 1.0 - al;
    if (Tc < 0.03) break;
    t += stm;
  }
  float a = 1.0 - Tc;
  return vec4(a > 0.004 ? col / a : vec3(0.0), a);
}
