
uniform float uL;
uniform vec3 uAxisA, uAxisD, uAxisUp;
uniform sampler2D uShadowT;
uniform mat4 uShadowM;
uniform float uShadowB;
uniform vec4 uArcL;
uniform vec4 uMuzL;
// 1 where the sun reaches P, 0 in the gun's shadow.
float sunTap(vec2 uv, float z) { return step(z - uShadowB, texture2D(uShadowT, uv).r); }
float sunVis(vec3 P) {
  vec4 s = uShadowM * vec4(P, 1.0);
  if (s.x < 0.0 || s.x > 1.0 || s.y < 0.0 || s.y > 1.0 || s.z < 0.0) return 1.0;
  // Ground far behind the gun still takes its shadow.
  float z = min(s.z, 1.0);
  vec2 t = vec2(0.5 / 2048.0, 0.5 / 1024.0);
  return 0.25 * (sunTap(s.xy + t * vec2(-1, -1), z) + sunTap(s.xy + t * vec2(1, -1), z) + sunTap(s.xy + t * vec2(-1, 1), z) + sunTap(s.xy + t * vec2(1, 1), z));
}
// The brightest arc lights the gun and the plain.
vec3 arcLight(vec3 P, vec3 N) {
  vec3 d = uArcL.xyz - P;
  float r2 = dot(d, d);
  vec3 arc = vec3(0.7, 0.8, 1.0) * uArcL.w * max(dot(N, d * inversesqrt(r2 + 1.0)), 0.0) * 30000.0 / (r2 + 30000.0);
  // The muzzle blast reaches kilometres.
  vec3 m = uMuzL.xyz - P;
  float m2 = dot(m, m);
  return arc + vec3(0.75, 0.85, 1.0) * uMuzL.w * max(dot(N, m * inversesqrt(m2 + 1.0)), 0.0) * 6.0e5 / (m2 + 6.0e5);
}
vec3 ambient(vec3 N) { return mix(uHorC, uZenC, N.y * 0.5 + 0.5) * 0.55; }
vec3 sunLight(vec3 N) { return uSunC * max(dot(N, uSun), 0.0); }
// The rock lights what faces it, faintly by day.
// The blast lights everything within some 20 km of it.
// The light from P to the eye through the soot ball: 1 clear, 0 hidden.
float sootT(vec3 P) {
  if (uSootK < 0.001) return 1.0;
  vec3 rd = P - cameraPosition;
  float L = length(rd);
  rd /= L;
  vec3 oc = cameraPosition - uSootS.xyz;
  float b = dot(oc, rd), h = b * b - dot(oc, oc) + uSootS.w * uSootS.w;
  if (h <= 0.0) return 1.0;
  h = sqrt(h);
  float ch = max(min(-b + h, L) - max(-b - h, 0.0), 0.0) / uSootS.w;
  return exp(-uSootK * ch);
}
// Sunlight at P after the soot ball: 1 clear.
// The shadow way is steered, so the shadow sweeps the plain in view.
float smokeShade(vec3 P) {
  if (uSootK < 0.001) return 1.0;
  vec3 oc = P - uSootS.xyz;
  float b = dot(oc, uSootL), h = b * b - dot(oc, oc) + uSootS.w * uSootS.w;
  if (h <= 0.0) return 1.0;
  h = sqrt(h);
  float T = exp(-uSootK * max(-b + h - max(-b - h, 0.0), 0.0) / uSootS.w);
  return mix(1.0, T, 0.75);
}
// The blast's light at P: the flash, then a lingering glow; it lands everywhere at once.
float blastAt(vec3 P) {
  float tl = uStarT - uHitP.w;
  if (tl < 0.0) return 0.0;
  return uBk * ((exp(-tl / 0.4) + 0.3 * exp(-tl / 5.0)) * (1.0 - smoothstep(8.0, 18.0, tl)) + 0.16 * exp(-tl / 8.0) * (1.0 - smoothstep(20.0, 32.0, tl)));
}
// At night the near world stays mostly dark against the lit sky.
vec3 blastLight(vec3 P) { vec3 b = uBlast.xyz - P; return uAstC * blastAt(P) * 1.5 * 4.0e8 / (dot(b, b) + 4.0e8) * mix(1.0, 0.35, uStars); }
// The rock lights what faces it: faintly by day, clearly at night.
// uStars is 0 by day and 1 once the sun is 10 degrees under.
float nightK() { return uStars; }
// The rock lights nothing near at night: no orange on the gun or the plain.
vec3 keyLight(vec3 N) { return uAstC * uAst.w * 0.25 * (1.0 - nightK()) * max(dot(N, uAst.xyz), 0.0); }
// Light from behind catches the edges: the sun's and the rock's.
vec3 rim(vec3 N, vec3 P) {
  vec3 V = normalize(cameraPosition - P);
  float f = pow(1.0 - abs(dot(N, V)), 2.5);
  return f * (uSunC * 0.3 * max(dot(uSun, -V), 0.0) + uAstC * uAst.w * 0.15 * (1.0 - nightK()));
}