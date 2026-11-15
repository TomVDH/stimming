// Atmosphere: single scattering with Rayleigh, Mie and ozone over a flat earth.
// The Kasten-Young airmass dims the sunlight; the Earth's shadow rises after sunset.
// cliff-air.js uses it for the sky, the fog light and the aerial perspective.
// Units: metres. Pass altitudes above the sea.
export const ATMO = /* glsl */ `
  const float PI_A = 3.14159265;
  const float HR = 8000.0, HM = 1100.0;
  const vec3 BR = vec3(5.8e-6, 13.5e-6, 33.1e-6);
  const vec3 BO = vec3(0.65e-6, 1.881e-6, 0.085e-6);
  const vec3 BM = vec3(3.2e-5);
  // Air mass for a path at this cosine from the zenith (Kasten-Young).
  // The formula holds down to the horizon; below it the limb value stands.
  float airmass(float c) {
    if (c <= 0.0) return 38.0;
    float z = degrees(acos(clamp(c, 0.0, 1.0)));
    return 1.0 / (c + 0.50572 * pow(96.07995 - z, -1.6364));
  }
  // Sunlight that reaches altitude h, reddened by the air it crossed.
  // After sunset the Earth's shadow rises: below its top no sun arrives.
  vec3 sunAt(vec3 s, float h) {
    float m = airmass(s.y);
    vec3 od = (BR + BO) * HR * exp(-h / HR) + BM * 1.1 * HM * exp(-h / HM);
    vec3 t = exp(-od * m);
    if (s.y < 0.0) { float sh = 6.371e6 * s.y * s.y * 0.5; t *= smoothstep(sh * 0.6, sh * 1.4 + 1.0, h); }
    return t;
  }
  float phR(float c) { return 3.0 / (16.0 * PI_A) * (1.0 + c * c); }
  float phM(float c) { const float g = 0.76; return 3.0 / (8.0 * PI_A) * ((1.0 - g * g) * (1.0 + c * c)) / ((2.0 + g * g) * pow(1.0 + g * g - 2.0 * g * c, 1.5)); }
  // Optical depth along a straight ray: altitude h0, climb dy per metre, length L.
  float depth(float h0, float dy, float L, float H) {
    float dh = dy * L;
    if (abs(dh) < 1.0) return L * exp(-h0 / H);
    return H * (exp(-h0 / H) - exp(-(h0 + dh) / H)) / dy;
  }
  // In-scattered light and transmittance along a ray of length L (L < 0: to space).
  void scatter(float h0, vec3 d, float L, vec3 s, float E, out vec3 inS, out vec3 T) {
    float c = dot(d, s);
    vec3 odR, odM;
    if (L < 0.0) {
      float m = airmass(d.y);
      odR = (BR + BO) * HR * exp(-h0 / HR) * m; odM = BM * HM * exp(-h0 / HM) * m;
    } else {
      odR = (BR + BO) * depth(h0, d.y, L, HR); odM = BM * depth(h0, d.y, L, HM);
    }
    T = exp(-(odR + odM));
    // Light is scattered where the air is; the sun there is the sun at that height.
    float hs = L < 0.0 ? h0 + 0.35 * HR * max(d.y, 0.0) + 300.0 : h0 + 0.5 * d.y * L;
    vec3 sun = E * sunAt(s, max(hs, 0.0));
    vec3 sR = BR * phR(c), sM = BM * phM(c);
    inS = sun * (sR + sM) / (BR + BO + BM) * (1.0 - T);
    // Light scattered more than once keeps twilight blue and lifts the shade.
    float twi = smoothstep(-0.22, 0.15, s.y);
    inS += E * vec3(0.0028, 0.0095, 0.031) * twi * (1.0 - T) / max(0.35, 1.0 - 0.65 * max(d.y, 0.0));
    // After sunset, a warm band lies low on the horizon under the sun.
    float glow = smoothstep(-0.2, -0.02, s.y) * smoothstep(0.1, 0.0, s.y);
    float az = max(dot(normalize(d.xz + 1e-5), normalize(s.xz + 1e-5)), 0.0);
    inS += E * vec3(1.0, 0.4, 0.13) * 0.035 * glow * pow(az, 5.0) * exp(-max(d.y, 0.0) * 10.0) * (1.0 - T);
  }
`;
