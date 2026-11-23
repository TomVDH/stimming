// Kiwi GLSL: the shared light, the press dent, the toon ramp, the bead optics.
// Every fruit material includes LIGHT; vertex shaders include DENT.

// The light rig, in world space. Key from the upper left, a hot rim behind.
export const LIGHT = /* glsl */`
uniform vec3 uKeyDir, uKeyCol, uRimDir, uRimCol, uSky, uGround;
uniform float uTime;
// A toon ramp: three soft bands.
float toon(float x) {
  float a = smoothstep(0.02, 0.08, x);
  float b = smoothstep(0.42, 0.48, x);
  float c = smoothstep(0.80, 0.86, x);
  return 0.16 * a + 0.42 * b + 0.42 * c;
}
// A soft two-band ramp for gentle shapes.
float toon2(float x) { return 0.35 * smoothstep(-0.05, 0.05, x) + 0.65 * smoothstep(0.45, 0.55, x); }
vec3 hemi(vec3 n) { return mix(uGround, uSky, n.y * 0.5 + 0.5); }
float h12(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float h13(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
float vn(vec3 p) {
  vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(h13(i), h13(i + vec3(1, 0, 0)), f.x), mix(h13(i + vec3(0, 1, 0)), h13(i + vec3(1, 1, 0)), f.x), f.y),
             mix(mix(h13(i + vec3(0, 0, 1)), h13(i + vec3(1, 0, 1)), f.x), mix(h13(i + vec3(0, 1, 1)), h13(i + vec3(1, 1, 1)), f.x), f.y), f.z);
}
`;

// The press: a soft dent in the half's own space, and a jiggle.
export const DENT = /* glsl */`
uniform vec4 uDent;   // xyz centre in half space, w depth
uniform vec4 uJig;    // xyz centre, w amount
uniform float uJigT;
vec3 dent(vec3 p) {
  vec3 d = p - uDent.xyz;
  float k = exp(-dot(d, d) * 5.5);
  vec3 n = normalize(uDent.xyz + vec3(1e-4));
  p -= n * uDent.w * k;
  // The flesh bulges a little round the dent.
  p += normalize(p + vec3(1e-4)) * uDent.w * 0.22 * exp(-dot(d, d) * 1.6) * (1.0 - k);
  // A jiggle: a damped ring that runs out from the tap.
  vec3 e = p - uJig.xyz;
  float r = length(e);
  p += normalize(p + vec3(1e-4)) * uJig.w * sin(r * 14.0 - uJigT * 34.0) * exp(-r * 2.2);
  return p;
}
`;

// Light through one turbid bead, by Beer-Lambert over the chords.
// All in the bead's unit-sphere space: p on the surface, v toward the eye.
export const BEAD = /* glsl */`
// The chord a ray from inside point m runs to the sphere wall along d.
float exitLen(vec3 m, vec3 d) {
  float b = dot(m, d);
  float c = dot(m, m) - 1.0;
  return -b + sqrt(max(b * b - c, 0.0));
}
// Light gathered along the view chord: steps through the bead.
// sigma is extinction per unit of bead radius; L is the light in bead space.
vec3 beadScatter(vec3 p, vec3 v, vec3 L, vec3 sigma, float scale) {
  float chord = max(-2.0 * dot(p, v), 0.0);
  vec3 acc = vec3(0.0);
  vec3 tv = vec3(1.0);
  const int N = 4;
  float dt = chord / float(N);
  for (int i = 0; i < N; i++) {
    vec3 m = p - v * (float(i) + 0.5) * dt;
    float dl = exitLen(m, L);
    vec3 tl = exp(-sigma * dl * scale);
    vec3 step = exp(-sigma * dt * scale);
    acc += tv * tl * (1.0 - step);
    tv *= step;
  }
  return acc;
}
// What the whole view chord lets through from behind the bead.
vec3 beadThrough(vec3 p, vec3 v, vec3 sigma, float scale) {
  float chord = max(-2.0 * dot(p, v), 0.0);
  return exp(-sigma * chord * scale);
}
`;
