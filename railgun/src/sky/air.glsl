
uniform float uAir;
const vec3 BETA_R = vec3(5.8e-6, 13.5e-6, 33.1e-6);
const float AIR_H = 8000.0;
// The air on the line from the eye to P, in sea-level metres.
float airDepth(vec3 P) {
  float h0 = max(cameraPosition.y, 0.0) / AIR_H, h1 = max(P.y, 0.0) / AIR_H, dh = h1 - h0;
  float avg = abs(dh) < 1e-4 ? exp(-h0) : (exp(-h0) - exp(-h1)) / dh;
  return length(P - cameraPosition) * avg;
}
vec3 airT(vec3 P) { return exp(-BETA_R * uAir * airDepth(P)); }
vec3 air(vec3 c, vec3 P) {
  vec3 dir = normalize(P - cameraPosition);
  c = mix(c, k2hazeColor(dir), k2hazeAmount(P));
  vec3 T = airT(P);
  return c * T + k2skyB(dir, 0.0) * (1.0 - T);
}
// One aerial perspective for the ranges, the clouds and the storms.
// Rayleigh and a dusty Mie along the ray from the eye to P.
// The air's own light is the horizon sky, warmed toward the sun.
// uAirK sets it: Rayleigh blue fade, dust amount, dust height, sun glow.
vec3 aerialFrom(vec3 col, vec3 ro, vec3 P) {
  vec3 v = P - ro;
  float hit = length(v);
  vec3 rd = v / max(hit, 1.0);
  // The dust stands about three kilometres deep, so cloud bases sit in it too.
  // ambT() in the ambient section reads the same knobs.
  float hR = 8000.0, hM = max(uAirK.z, 100.0);
  float yc = max(ro.y, 0.0), yp = max(P.y, 0.0), dy = yp - yc;
  float aR = abs(dy) < 1.0 ? exp(-yc / hR) : (exp(-yc / hR) - exp(-yp / hR)) * hR / dy;
  float aM = abs(dy) < 1.0 ? exp(-yc / hM) : (exp(-yc / hM) - exp(-yp / hM)) * hM / dy;
  aR *= uAirK.x; aM *= uAirK.y;
  vec3 T = exp(-(vec3(5.8e-6, 13.5e-6, 33.1e-6) * aR + vec3(1.1e-5) * aM) * hit);
  float mu = dot(rd, uSunD), g = 0.76;
  float mie = (1.0 - g * g) / pow(1.0 + g * g - 2.0 * g * mu, 1.5) / 12.0;
  vec3 inL = k2skyB(normalize(vec3(rd.x, 0.02, rd.z)), 0.0) * 0.95 + uGlowC * mie * uAirK.w * aM / max(aM + aR, 1e-3);
  return col * T + inL * (1.0 - T);
}
// The air's own light along a ray, for an extra fade toward it.
vec3 aerialIn(vec3 rd) {
  float mu = dot(rd, uSunD), g = 0.76;
  return k2skyB(normalize(vec3(rd.x, 0.02, rd.z)), 0.0) * 0.95 + uGlowC * (1.0 - g * g) / pow(1.0 + g * g - 2.0 * g * mu, 1.5) / 12.0 * 0.5 * uAirK.w;
}
vec3 aerial(vec3 col, vec3 P) { return aerialFrom(col, cameraPosition, P); }
// The shared air's transmittance alone, for smoke and volumes that blend premultiplied.
vec3 aerialT(vec3 P) {
  vec3 ro = cameraPosition;
  float hit = length(P - ro);
  float yc = max(ro.y, 0.0), yp = max(P.y, 0.0), dy = yp - yc;
  float hM = max(uAirK.z, 100.0);
  float aR = abs(dy) < 1.0 ? exp(-yc / 8000.0) : (exp(-yc / 8000.0) - exp(-yp / 8000.0)) * 8000.0 / dy;
  float aM = abs(dy) < 1.0 ? exp(-yc / hM) : (exp(-yc / hM) - exp(-yp / hM)) * hM / dy;
  aR *= uAirK.x; aM *= uAirK.y;
  return exp(-(vec3(5.8e-6, 13.5e-6, 33.1e-6) * aR + vec3(1.1e-5) * aM) * hit);
}
// Sunlight at height h crosses less air than at the ground.
vec3 sunAt(float h) {
  float am = 1.0 / max(uSun.y, 0.08);
  return uSunC * exp(BETA_R * uAir * AIR_H * (1.0 - exp(-max(h, 0.0) / AIR_H)) * am * 0.4);
}