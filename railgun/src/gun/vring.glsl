
// One vapour ring: born at delay d, scale s of the first.
// It starts off metres ahead and runs a further run metres down the bore.
float vring(vec3 p, float d, float s, float off, float run, float seed) {
  float age = uMs.w - d;
  if (age <= 0.0) return 0.0;
  off += run * (1.0 - exp(-age / 0.6));
  float Rv = (30.0 + 560.0 * (1.0 - exp(-age / 0.28))) * s, tv = (22.0 + 0.16 * Rv) * mix(1.0, s, 0.5);
  vec3 q = p - uMs.xyz - uMx.xyz * (0.12 * Rv + off);
  float x = dot(q, uMx.xyz);
  vec3 rq = q - uMx.xyz * x;
  float rr = length(rq);
  // The ring tears: its strength wanders round the rim.
  vec3 e1 = normalize(cross(uMx.xyz, vec3(0.0, 1.0, 0.0))), e2 = cross(uMx.xyz, e1);
  float ph = atan(dot(rq, e2), dot(rq, e1));
  vec3 cp = vec3(cos(ph), sin(ph), 0.0);
  float tear = smoothstep(0.35, 0.65, texture(uVol, cp * 0.9 + vec3(0.3 + seed, 0.6, 0.1 + 0.05 * age)).r);
  // The rim wobbles in and out, so the torus is not a perfect circle.
  float wob = 1.0 + 0.16 * (texture(uVol, cp * 0.35 + vec3(0.7, 0.2 + seed, 0.5)).g - 0.5);
  float tw = tv * (0.55 + 0.7 * tear);
  return exp(-pow((rr - Rv * wob) / tw, 2.0)) * exp(-pow(x / (0.8 * tw), 2.0)) * exp(-age / 0.55)
    * smoothstep(0.0, 0.05, age) * (0.08 + 0.92 * tear);
}
