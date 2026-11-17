// Tornado alley: the road and its verges as lit materials.
// Asphalt, paint, the gravel berm and the grass ditch each take a diffuse and a GGX specular term.
// The bands meet along wandering, noisy edges: gravel spills into grass, grass creeps over gravel.
// It reads main.js's ROAD_X, vn(), hazeCol(), uSun, uSunCol and uAmb, and wheat.js's whInside().

export const ROAD_GLSL = /* glsl */`
/* ---------- the road and its verges ---------- */
// A noise term that fades to its mean once a pixel covers it: no shimmer far off.
float rdN(vec2 p, float fx, float size) { return mix(0.5, vn(p), 1.0 - smoothstep(size * 0.5, size * 2.0, fx)); }
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
vec3 roadside(vec3 c, vec3 P, vec3 rd, float fx) {
  float side = sign(P.x - ROAD_X), ax = abs(P.x - ROAD_X), z = P.z;
  if (ax > 8.0) return c;
  vec3 V = -rd, L = normalize(uSun + vec3(0.0, 1e-3, 0.0));
  vec2 r1 = mat2(0.8, -0.6, 0.6, 0.8) * P.xz;
  // The ditch: the berm falls to a shallow ditch, which rises to the field.
  float dh = -0.5 * smoothstep(4.3, 4.6, ax) * (1.0 - smoothstep(5.1, 5.4, ax)) + 0.55 * smoothstep(5.5, 5.8, ax) * (1.0 - smoothstep(6.1, 6.5, ax));
  vec3 Nd = normalize(vec3(-dh * side, 1.0, 0.0));
  // A slope toward the sun takes more of it; one away takes less. The sky's fill stays.
  float kS = clamp(dot(Nd, L) / max(L.y, 0.12), 0.35, 1.7);
  // The ditch's floor sees less sky.
  float ao = 1.0 - 0.25 * smoothstep(4.9, 5.4, ax) * (1.0 - smoothstep(5.6, 6.0, ax));
  // The sky the road reflects: the bright horizon low down, the deck's slate above.
  vec3 Rf = reflect(rd, vec3(0.0, 1.0, 0.0));
  vec3 hz = hazeCol(Rf);
  vec3 deck = uAmb * 0.07;
  float nv = max(V.y, 1e-3);
  // The wandering edges: asphalt to gravel, gravel to grass, grass to wheat.
  float eA = 3.7 + 0.05 * (vn(vec2(z * 0.9, 3.0)) - 0.5) + 0.05 * (rdN(r1 * vec2(3.0, 9.0), fx, 0.05) - 0.5);
  float mA = 1.0 - smoothstep(eA - 0.012 - fx, eA + 0.012 + fx, ax);
  float eG = 4.75 + 0.3 * (vn(vec2(z * 0.25, 7.0)) - 0.5) + 0.35 * (rdN(r1 * 1.7, fx, 0.3) - 0.5) + 0.15 * (rdN(P.xz * 9.0, fx, 0.05) - 0.5);
  float mG = smoothstep(eG - 0.12 - fx, eG + 0.12 + fx, ax);
  float mW = smoothstep(-0.1 - fx, 0.45 + fx, whInside(P.xz) + 0.2 * (rdN(r1 * 3.1, fx, 0.15) - 0.5));
  // Grass: dry, late in the season, in tufts with bare patches; rough and dull.
  float tuft = rdN(P.xz * vec2(9.0, 2.0), fx, 0.1) * 0.5 + rdN(r1 * 31.0, fx, 0.03) * 0.5;
  vec3 gA = mix(vec3(0.13, 0.15, 0.05), vec3(0.22, 0.18, 0.09), rdN(r1 * 0.9, fx, 0.5)) * (0.6 + 0.8 * tuft);
  gA = mix(gA, vec3(0.12, 0.09, 0.06), 0.5 * smoothstep(0.62, 0.8, rdN(P.xz * 1.3 + 4.0, fx, 0.4)) * smoothstep(4.9, 5.4, ax) * (1.0 - smoothstep(5.6, 6.0, ax)));
  vec3 grass = gA * (uSunCol * 0.55 * kS + uAmb * 0.6 * ao) + uSunCol * sunSpec(Nd, V, L, 0.85, 0.03) * 0.3;
  // Gravel: grey-brown stones, very rough; the berm's slope turns it to or from the sun.
  float grit = mix(0.75, 1.2, rdN(P.xz * 40.0, fx, 0.025));
  vec3 grav = vec3(0.2, 0.18, 0.15) * grit * (uSunCol * 0.55 * kS + uAmb * 0.6 * ao);
  vec2 bG = envBRDF(0.9, nv);
  grav += mix(hz, deck, 0.6) * (0.04 * bG.x + bG.y) + uSunCol * sunSpec(Nd, V, L, 0.9, 0.04);
  // Asphalt: worn dark, lighter where tyres polish the aggregate, an oily strip down each lane.
  float dx = P.x - ROAD_X, ux = abs(dx);
  float wheel = smoothstep(0.35, 0.1, abs(ux - 1.0)) + smoothstep(0.35, 0.1, abs(ux - 2.7));
  float oil = smoothstep(0.4, 0.1, abs(ux - 1.85));
  // Crack seal: thin dark tar lines across the lanes, now and then.
  float cz = z / 13.0 + 0.4 * vn(vec2(dx * 0.6, floor(z / 13.0)));
  float tar = smoothstep(0.012 + fx, 0.0, abs(fract(cz) - 0.5) * 13.0) * step(0.4, vn(vec2(floor(z / 13.0), 2.0))) * (1.0 - smoothstep(0.02, 0.08, fx));
  float rA = mix(0.78, 0.55, wheel * 0.6) - 0.3 * tar;
  vec3 aA = vec3(0.05, 0.05, 0.052) * (0.85 + 0.3 * rdN(P.xz * 0.7, fx, 1.0)) * (0.85 + 0.25 * rdN(r1 * 23.0, fx, 0.03));
  aA *= (1.0 + 0.25 * wheel) * (1.0 - 0.25 * oil) * (1.0 - 0.3 * tar);
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
