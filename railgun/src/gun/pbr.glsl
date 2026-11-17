
uniform vec3 uGroundC;
// The sky as image-based light: zenith, horizon and the lit plain under them.
vec3 iblGround() { return uGroundC * (uSunC * 0.3 + mix(uHorC, uZenC, 0.5) * 0.15); }
vec3 iblSky() { return mix(uHorC, uZenC, 0.75) * 0.6; }
// Diffuse irradiance from the hemisphere round N.
vec3 iblIrr(vec3 N) { return mix(iblGround(), iblSky(), N.y * 0.5 + 0.5); }
// Radiance along R; roughness blurs it toward the irradiance.
vec3 iblRad(vec3 R, float rough) {
  vec3 sky = mix(uHorC, uZenC, smoothstep(0.0, 0.6, R.y)) * 0.85;
  vec3 sharp = mix(iblGround(), sky, smoothstep(-0.06, 0.04, R.y));
  return mix(sharp, iblIrr(R), rough * rough);
}
// Split-sum scale and bias for the specular, after Karis.
vec2 envBRDF(float NoV, float rough) {
  vec4 r = rough * vec4(-1.0, -0.0275, -0.572, 0.022) + vec4(1.0, 0.0425, 1.04, -0.04);
  float a = min(r.x * r.x, exp2(-9.28 * NoV)) * r.x + r.y;
  return vec2(-1.04, 1.04) * a + r.zw;
}
// One GGX lobe: D, Smith visibility, Schlick Fresnel; Lambert keeps the rest.
// E is the light's irradiance; the result is the light it sends to the eye.
vec3 pbrLight(vec3 alb, float metal, float rough, vec3 F0, vec3 N, vec3 V, vec3 L, vec3 E) {
  float NoL = max(dot(N, L), 0.0);
  if (NoL <= 0.0) return vec3(0.0);
  vec3 H = normalize(L + V);
  float NoV = max(dot(N, V), 1e-3), NoH = max(dot(N, H), 0.0), VoH = max(dot(V, H), 0.0);
  float a2 = max(pow(rough, 4.0), 2e-4), d = NoH * NoH * (a2 - 1.0) + 1.0;
  float k = (rough + 1.0) * (rough + 1.0) / 8.0;
  float vis = 1.0 / ((NoV * (1.0 - k) + k) * (NoL * (1.0 - k) + k) * 4.0);
  vec3 F = F0 + (1.0 - F0) * pow(1.0 - VoH, 5.0);
  // The cap stops fireflies on sharp metal edges.
  vec3 spec = min(a2 / (d * d) * vis, 60.0) * F;
  return (alb * (1.0 - metal) * (1.0 - F) + spec) * NoL * E;
}
// The sky's share: diffuse irradiance and the split-sum reflection.
// ao darkens both; the reflection keeps more of its light at grazing angles.
vec3 pbrSky(vec3 alb, float metal, float rough, vec3 F0, vec3 N, vec3 V, float ao) {
  float NoV = max(dot(N, V), 1e-3);
  vec2 ab = envBRDF(NoV, rough);
  vec3 Fss = F0 * ab.x + ab.y;
  float so = clamp(pow(NoV + ao, exp2(-16.0 * rough - 1.0)) - 1.0 + ao, 0.0, 1.0);
  return alb * (1.0 - metal) * (1.0 - Fss) * iblIrr(N) * ao + iblRad(reflect(-V, N), rough) * Fss * so;
}