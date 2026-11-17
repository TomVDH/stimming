// Tornado alley: the road and its verges as lit materials.
// Asphalt, paint, the gravel berm and the grass ditch each take a diffuse and a GGX specular term.
// The bands meet along wandering, noisy edges: gravel spills into grass, grass creeps over gravel.
// It reads main.js's ROAD_X, vn(), hazeCol(), uSun, uSunCol and uAmb, and wheat.js's whInside().

export const ROAD_GLSL = /* glsl */`
/* ---------- the road and its verges ---------- */
// A noise term that fades to its mean once a pixel covers it: no shimmer far off.
float rdN(vec2 p, float fx, float size) { return mix(0.5, vn(p), 1.0 - smoothstep(size * 0.5, size * 2.0, fx)); }
// Cells from the noise volume (Worley): 0 at a stone's heart, near 1 at its edge. 4 cells per unit of p.
// The volume repeats every 16 units; the slice drifts through its depth, so no tile repeats.
float rdW(vec2 p, float fx, float size) { return mix(0.5, W(vec3(p, 0.37 + 6.0 * vn(p * 0.045 + 3.1))), 1.0 - smoothstep(size * 0.5, size * 2.0, fx)); }
// The split-sum's reflectance for a roughness and a view angle (a fitted curve).
vec2 envBRDF(float r, float nv) {
  vec4 q = r * vec4(-1.0, -0.0275, -0.572, 0.022) + vec4(1.0, 0.0425, 1.04, -0.04);
  float a = min(q.x * q.x, exp2(-9.28 * nv)) * q.x + q.y;
  return vec2(-1.04, 1.04) * a + q.zw;
}
// The sun's GGX highlight on a surface, as light per unit sun colour.
float sunSpec(vec3 n, vec3 v, vec3 l, float r, float f0) {
  vec3 h = normalize(v + l);
  float nl = max(dot(n, l), 0.0), nv = max(dot(n, v), 1e-3), nh = max(dot(n, h), 0.0);
  float a = r * r, a2 = a * a, d = nh * nh * (a2 - 1.0) + 1.0;
  float D = a2 / (3.14159 * d * d);
  float k = a * 0.5, G = 1.0 / ((nl * (1.0 - k) + k) * (nv * (1.0 - k) + k));
  float F = f0 + (1.0 - f0) * pow(1.0 - max(dot(v, h), 0.0), 5.0);
  return D * G * F * nl * 0.25;
}
// The ground's materials over the far colour c at ground point P.
// fx is a pixel's footprint in metres; rd is the view ray.
// The ditch's slope across the verge: a swale 2.2 m wide and 35 cm deep.
float rdSwale(float ax) { float u = clamp((ax - 4.3) / 2.2, 0.0, 1.0); return -0.35 * 3.14159 / 2.2 * cos(3.14159 * u) * step(4.3, ax) * step(ax, 6.5); }
vec3 roadside(vec3 c, vec3 P, vec3 rd, float fx) {
  float side = sign(P.x - ROAD_X), ax = abs(P.x - ROAD_X), z = P.z;
  if (ax > 8.0) return c;
  vec3 V = -rd, L = normalize(uSun + vec3(0.0, 1e-3, 0.0));
  vec2 r1 = mat2(0.8, -0.6, 0.6, 0.8) * P.xz;
  // The normal follows the swale's slope: the floor faces up, each bank leans.
  vec3 Nd = normalize(vec3(-rdSwale(ax) * side, 1.0, 0.0));
  // A bank toward the sun takes more of it; one away takes less. The sky's fill stays.
  // A low sun rakes the banks; grass blades soften that by half.
  float kS = mix(1.0, clamp(dot(Nd, L) / max(L.y, 0.12), 0.35, 1.7), 0.5);
  // The ditch's floor sees less sky.
  float ao = 1.0 - 0.12 * smoothstep(4.9, 5.4, ax) * (1.0 - smoothstep(5.6, 6.0, ax));
  // The sky the road reflects: the bright horizon low down, the deck's slate above.
  vec3 Rf = reflect(rd, vec3(0.0, 1.0, 0.0));
  vec3 hz = hazeCol(Rf);
  vec3 deck = uAmb * 0.07;
  float nv = max(V.y, 1e-3);
  // The wandering edges: asphalt to gravel, gravel to grass, grass to wheat.
  float eA = 3.7 + 0.05 * (vn(vec2(z * 0.9, 3.0)) - 0.5) + 0.05 * (rdN(r1 * vec2(3.0, 9.0), fx, 0.05) - 0.5);
  float mA = 1.0 - smoothstep(eA - 0.012 - fx, eA + 0.012 + fx, ax);
  // Gravel to grass is a wide, soft feather: grass tufts creep onto the stones first, then close up.
  float eG = 4.75 + 0.3 * (vn(vec2(z * 0.25, 7.0)) - 0.5) + 0.3 * (rdN(r1 * 1.7, fx, 0.3) - 0.5);
  float tufts = rdW(r1 * 5.0, fx, 0.06);
  float mG = smoothstep(eG - 0.45 - fx, eG + 0.45 + fx, ax);
  mG = clamp(mG * 1.6 - tufts * 0.6 * (1.0 - mG), 0.0, 1.0);
  // Where they meet, fine dirt washed off the berm.
  float dirt = mG * (1.0 - mG) * 4.0 * (0.5 + 0.5 * rdN(r1 * 3.3 + 2.0, fx, 0.1));
  float mW = smoothstep(-0.1 - fx, 0.45 + fx, whInside(P.xz) + 0.2 * (rdN(r1 * 3.1, fx, 0.15) - 0.5));
  // Grass: dry, late in the season, in tufts with bare patches; rough and dull.
  // Blades show as streaks, each clump combed its own way; dark gaps open between the clumps.
  vec2 r3 = mat2(0.26, 0.97, -0.97, 0.26) * P.xz;
  float blades = rdN(r1 * vec2(70.0, 9.0), fx, 0.012) * 0.5 + rdN(r3 * vec2(55.0, 7.0), fx, 0.015) * 0.5;
  float clumpG = rdW(P.xz * 2.2, fx, 0.12);
  float tuft = mix(rdN(P.xz * vec2(9.0, 2.0), fx, 0.1), blades, 0.6) * (1.15 - 0.6 * smoothstep(0.55, 0.9, clumpG));
  vec3 gA = mix(vec3(0.13, 0.15, 0.05), vec3(0.24, 0.2, 0.1), rdN(r1 * 0.9, fx, 0.5)) * (0.55 + 0.85 * tuft);
  gA = mix(gA, vec3(0.12, 0.09, 0.06), 0.5 * smoothstep(0.62, 0.8, rdN(P.xz * 1.3 + 4.0, fx, 0.4)) * smoothstep(4.9, 5.4, ax) * (1.0 - smoothstep(5.6, 6.0, ax)));
  vec3 grass = gA * (uSunCol * 0.55 * kS + uAmb * 0.6 * ao) + uSunCol * sunSpec(Nd, V, L, 0.85, 0.03) * 0.3;
  // Gravel: stones 2 to 4 cm, each its own tone, dark in the gaps; very rough.
  // The berm's slope turns it to or from the sun.
  float st1 = rdW(P.xz * 6.0, fx, 0.04), st2 = rdW(r1 * 14.0, fx, 0.018);
  float stone = (1.15 - 0.55 * st1 * st1) * (1.05 - 0.3 * st2 * st2);
  vec3 gTone = mix(vec3(0.2, 0.18, 0.15), vec3(0.26, 0.22, 0.17), rdN(P.xz * 24.0, fx, 0.04));
  vec3 grav = gTone * stone * (uSunCol * 0.55 * kS + uAmb * 0.6 * ao);
  grav = mix(grav, vec3(0.24, 0.19, 0.13) * (uSunCol * 0.55 * kS + uAmb * 0.6 * ao), dirt * 0.6);
  vec2 bG = envBRDF(0.9, nv);
  grav += mix(hz, deck, 0.6) * (0.04 * bG.x + bG.y) + uSunCol * sunSpec(Nd, V, L, 0.9, 0.04);
  // Asphalt: worn dark, lighter where tyres polish the aggregate, an oily strip down each lane.
  float dx = P.x - ROAD_X, ux = abs(dx);
  float wheel = smoothstep(0.35, 0.1, abs(ux - 1.0)) + smoothstep(0.35, 0.1, abs(ux - 2.7));
  float oil = smoothstep(0.4, 0.1, abs(ux - 1.85));
  // Crack seal: thin dark tar lines across the lanes, now and then.
  float cz = z / 13.0 + 0.4 * vn(vec2(dx * 0.6, floor(z / 13.0)));
  float tar = smoothstep(0.012 + fx, 0.0, abs(fract(cz) - 0.5) * 13.0) * step(0.4, vn(vec2(floor(z / 13.0), 2.0))) * (1.0 - smoothstep(0.02, 0.08, fx));
  vec3 aA = vec3(0.05, 0.05, 0.052) * (0.85 + 0.3 * rdN(P.xz * 0.7, fx, 1.0)) * (0.85 + 0.25 * rdN(r1 * 23.0, fx, 0.03));
  // Aggregate: pale stones show through the worn binder, most in the wheel paths.
  float agg = smoothstep(0.22, 0.08, rdW(P.xz * 45.0, fx, 0.006)) * (0.5 + 0.8 * wheel);
  aA = mix(aA, vec3(0.13, 0.125, 0.12), agg * 0.5);
  // Patches of newer, darker asphalt, cut square across a lane.
  float pz = floor(z / 9.0), pIn = step(0.82, th(vec2(pz, sign(dx)))) * step(abs(fract(z / 9.0) - 0.5), 0.3) * step(0.3, ux) * step(ux, 3.3);
  aA *= 1.0 - 0.3 * pIn;
  // Fine cracks near the crumbling edge: a ridge network in the noise.
  float crk = (1.0 - smoothstep(0.0, 0.025, abs(rdN(r1 * 2.6 + 9.0, fx, 0.02) - 0.5))) * smoothstep(2.9, 3.5, ux) * (1.0 - smoothstep(0.01, 0.04, fx));
  aA *= (1.0 + 0.25 * wheel) * (1.0 - 0.25 * oil) * (1.0 - 0.3 * tar) * (1.0 - 0.5 * crk);
  // Long stains run with the traffic, metres to tens of metres: the surface never reads as one sheet.
  aA *= 0.82 + 0.36 * rdN(vec2(dx * 0.35, z * 0.06) + 7.0, fx, 4.0) * (0.7 + 0.6 * rdN(vec2(dx * 1.1, z * 0.2) + 2.0, fx, 1.5));
  float rA = mix(0.78, 0.55, wheel * 0.6) - 0.3 * tar - 0.1 * pIn;
  vec2 bA = envBRDF(rA, nv);
  vec3 envA = mix(hz, deck, smoothstep(0.02, 0.2, Rf.y) * (1.0 - 0.4 * rA) + 0.35 * rA);
  vec3 asph = aA * (uSunCol * 0.55 + uAmb * 0.6) + envA * (0.04 * bA.x + bA.y) + uSunCol * sunSpec(vec3(0.0, 1.0, 0.0), V, L, rA, 0.04);
  // Paint: worn white edge line and double yellow centre line, smoother than the asphalt.
  float wear = 0.75 + 0.25 * rdN(r1 * vec2(2.0, 14.0), fx, 0.05);
  float pW = band(ax - 3.45, 0.06, fx) * wear, pY = max(band(dx - 0.12, 0.05, fx), band(dx + 0.12, 0.05, fx)) * wear;
  vec2 bP = envBRDF(0.45, nv);
  vec3 pSpec = mix(hz, deck, smoothstep(0.02, 0.2, Rf.y)) * (0.04 * bP.x + bP.y) + uSunCol * sunSpec(vec3(0.0, 1.0, 0.0), V, L, 0.45, 0.04);
  vec3 lit = uSunCol * 0.55 + uAmb * 0.6;
  asph = mix(asph, vec3(0.62) * lit + pSpec, pW);
  asph = mix(asph, vec3(0.6, 0.41, 0.04) * lit + pSpec, pY);
  // Out from the field: grass, then gravel, then the asphalt.
  vec3 col = mix(grass, c, mW);
  col = mix(grav, col, mG);
  return mix(col, asph, mA);
}
`;
