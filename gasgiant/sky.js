// Gas giant dive: the sky over the decks. Space, the sun, the rings and the limb haze.
// The rings show their unlit face: the dense B ring goes dark, the thin rings glow by passed light.
// GLSL only; the composite pastes it after COMMON.

export const SKY = /* glsl */`
const vec3 SUN_C = vec3(1.0, 0.97, 0.92);
const vec3 HAZE_C = vec3(0.38, 0.66, 0.68);
const vec3 RING_C = vec3(0.8, 0.8, 0.88);
float skHash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
// Faint stars, one per cell on a sphere grid.
float stars(vec3 rd) {
  vec3 q = rd * 260.0, i = floor(q), f = fract(q) - 0.5;
  float h = skHash(i);
  float on = step(0.985, h);
  return on * exp(-dot(f, f) * 30.0) * (0.3 + 2.0 * fract(h * 97.0));
}
// The sky along rd from ro; camH is the eye's height in km.
// sunVis is how much of the sun's disc the rings let through.
vec3 skyAt(vec3 ro, vec3 rd, float camH) {
  vec3 c = vec3(stars(rd)) * 0.004;
  float mu = dot(rd, SUN);
  // The sun: a small hot disc and its glare.
  float sunVis = ringShadow(ro);
  c += SUN_C * (smoothstep(0.99996, 0.99999, mu) * 60.0 + pow(max(mu, 0.0), 900.0) * 1.2 + pow(max(mu, 0.0), 60.0) * 0.05) * sunVis;
  // The rings, unless the planet stands in front of them.
  vec2 pl = sphereHit(ro, rd, R);
  float den = dot(rd, AXIS);
  float s = -dot(ro - PC, AXIS) / (abs(den) > 1e-6 ? den : 1e-6);
  if (s > 0.0 && (pl.x > pl.y || pl.x < 0.0 || s < pl.x)) {
    vec3 hp = ro + rd * s;
    float r = length(hp - PC) / R;
    float tau = ringTau(r);
    if (tau > 0.0) {
      float muV = max(abs(den), 0.02), muS = max(dot(SUN, AXIS), 0.02);
      // Light through a ring: thin parts pass it, dense parts drown it.
      float pass = tau / muS * exp(-tau / muS) * 0.6;
      // Fine dust throws light forward, round the sun.
      float fwd = 0.2 + 3.0 * pow(max(mu, 0.0), 8.0);
      // The planet's shadow on the rings.
      vec2 ps = sphereHit(hp, SUN, R + 60.0);
      float lit = ps.x < ps.y && ps.x > 0.0 ? 0.0 : 1.0;
      float cover = 1.0 - exp(-tau / muV);
      // The low sun leaves the rings faint, so they take a little more light.
      c = c * (1.0 - cover) + RING_C * pass * fwd * lit * 1.1;
    }
  }
  // The limb: haze over the horizon, and a thin detached layer above it.
  vec3 oc = ro - PC;
  float b = dot(oc, rd);
  float hMin = (b < 0.0 ? length(oc - rd * b) : length(oc)) - R;
  if (hMin > 0.0) {
    float lit = 0.6 + 0.4 * max(dot(normalize(oc - rd * b), SUN), 0.0);
    float lm = exp(-hMin / 26.0) + 0.25 * exp(-pow(abs(hMin - 120.0) / 7.0, 2.0));
    c += HAZE_C * lm * 0.55 * lit;
  }
  // Inside the air, the sky fills with haze light and the rings fade.
  float inAir = 1.0 - smoothstep(10.0, 80.0, camH);
  float up = max(dot(rd, normalize(oc)), 0.0);
  float col = exp(-max(camH - 15.0, -200.0) / 30.0) * 0.06 / (0.1 + up);
  c = c * exp(-col * 2.0) + HAZE_C * 0.45 * (1.0 - exp(-col)) * inAir;
  return c;
}
`;
