// Fruit GLSL: the shared light, the press dent, the toon ramp, the bead optics.
// Every fruit material includes LIGHT; vertex shaders include DENT.

// The light rig, in world space. Key from the upper left, a hot rim behind.
export const LIGHT = /* glsl */`
uniform vec3 uKeyDir, uKeyCol, uRimDir, uRimCol, uSky, uGround;
uniform float uTime;
// A soft two-band ramp, kept for small parts.
float toon(float x) { return smoothstep(0.0, 1.0, x); }
float toon2(float x) { return 0.35 * smoothstep(-0.05, 0.05, x) + 0.65 * smoothstep(0.45, 0.55, x); }
vec3 hemi(vec3 n) { return mix(uGround, uSky, n.y * 0.5 + 0.5); }
// A piece of a half is a sector round the axis: x its start, y its span, z on.
uniform vec4 uSec;
void secClip(vec3 p) {
  if (uSec.z > 0.5 && mod(atan(p.z, p.y) - uSec.x, 6.2832) > uSec.y) discard;
}
float h12(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float h13(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
float vn(vec3 p) {
  vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(h13(i), h13(i + vec3(1, 0, 0)), f.x), mix(h13(i + vec3(0, 1, 0)), h13(i + vec3(1, 1, 0)), f.x), f.y),
             mix(mix(h13(i + vec3(0, 0, 1)), h13(i + vec3(1, 0, 1)), f.x), mix(h13(i + vec3(0, 1, 1)), h13(i + vec3(1, 1, 1)), f.x), f.y), f.z);
}

// Cells with edges: x the distance to the nearest wall, y that cell's hash.
vec2 cellEdge(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 mr = vec2(0.0), mg = vec2(0.0);
  float d = 8.0, id = 0.0;
  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
    vec2 g = vec2(x, y);
    vec2 r = g + vec2(h12(i + g), h12(i + g + 17.3)) - f;
    float dd = dot(r, r);
    if (dd < d) { d = dd; mr = r; mg = g; id = h12(i + g + 3.1); }
  }
  float e = 8.0;
  for (int y = -2; y <= 2; y++) for (int x = -2; x <= 2; x++) {
    vec2 g = mg + vec2(x, y);
    vec2 r = g + vec2(h12(i + g), h12(i + g + 17.3)) - f;
    if (dot(mr - r, mr - r) > 1e-5) e = min(e, dot(0.5 * (mr + r), normalize(r - mr)));
  }
  return vec2(e, id);
}
// Cells: distance to the nearest seed point, and that cell's hash.
vec2 cells(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  float d = 8.0, id = 0.0;
  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
    vec2 g = vec2(x, y);
    vec2 r = g + vec2(h12(i + g), h12(i + g + 17.3)) - f;
    float dd = dot(r, r);
    if (dd < d) { d = dd; id = h12(i + g + 3.1); }
  }
  return vec2(sqrt(d), id);
}
// The studio: three softboxes and a dim room, for reflections.
// rough widens and dims each box, as a rough surface blurs it.
float box(vec3 d, vec3 c, float w, float h, float rough) {
  float k = dot(d, c);
  if (k <= 0.0) return 0.0;
  vec3 t1 = normalize(cross(abs(c.y) > 0.95 ? vec3(1, 0, 0) : vec3(0, 1, 0), c));
  vec3 t2 = cross(c, t1);
  float u = abs(dot(d, t1) / k), v = abs(dot(d, t2) / k);
  float s = 0.015 + rough * rough * 1.6;
  return smoothstep(w + s, w - s, u) * smoothstep(h + s, h - s, v) / (1.0 + rough * rough * 12.0);
}
vec3 studio(vec3 d, float rough) {
  vec3 c = mix(uGround, uSky, smoothstep(-0.3, 0.6, d.y)) * 0.7;
  // A broad, dim ceiling: wet faces tipped up catch a soft sheen anywhere.
  c += vec3(0.09, 0.09, 0.085) * smoothstep(0.15, 0.85, d.y) / (1.0 + rough * 2.0);
  c += uKeyCol * 2.2 * box(d, uKeyDir, 0.42, 0.3, rough);
  c += uRimCol * 1.6 * box(d, uRimDir, 0.1, 0.55, rough);
  c += vec3(0.5, 0.55, 0.6) * 0.35 * box(d, normalize(vec3(0.85, 0.25, 0.55)), 0.35, 0.3, rough);
  // A big soft top light: it lays a sheen on every cut face tipped up.
  c += vec3(1.0, 0.97, 0.92) * 0.45 * box(d, normalize(vec3(-0.25, 1.0, 0.3)), 0.45, 0.35, rough);
  return c;
}
float fresnel(float nv, float f0) { return f0 + (1.0 - f0) * pow(1.0 - nv, 5.0); }
// A surface lit by the rig: wrap diffuse with a scatter tint, then the studio's reflection.
vec3 shade(vec3 albedo, vec3 n, vec3 v, float rough, float wrap, vec3 sss, float f0) {
  float nk = dot(n, uKeyDir), nr = dot(n, uRimDir);
  float dk = max((nk + wrap) / (1.0 + wrap), 0.0);
  float dr = max((nr + wrap) / (1.0 + wrap), 0.0);
  vec3 col = albedo * (uKeyCol * dk + uRimCol * dr * 0.25 + hemi(n) * 0.7);
  // Light that wraps past the terminator comes back tinted.
  col += sss * (uKeyCol * (dk - max(nk, 0.0)) + uRimCol * (dr - max(nr, 0.0)) * 0.6);
  float nv = clamp(dot(n, v), 0.0, 1.0);
  col += studio(reflect(-v, n), rough) * fresnel(nv, f0);
  return col;
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
// The view chord through the bead: to the far wall, or to a seed inside.
// rs is the seed's radius share; hit says the ray ends on the seed.
float viewChord(vec3 p, vec3 v, float rs, out bool hit) {
  float chord = max(2.0 * dot(p, v), 0.0);
  hit = false;
  if (rs > 0.0) {
    float b = dot(p, -v), c = dot(p, p) - rs * rs, d = b * b - c;
    if (d > 0.0) { float t = -b - sqrt(d); if (t > 0.0 && t < chord) { chord = t; hit = true; } }
  }
  return chord;
}
// Light gathered along the view chord: four steps through the bead.
// sigma is extinction per unit of bead radius; L is the light in bead space.
vec3 beadScatter(vec3 p, vec3 v, vec3 L, vec3 sigma, float scale, float chord) {
  vec3 acc = vec3(0.0);
  vec3 tv = vec3(1.0);
  const int N = 4;
  float dt = chord / float(N);
  for (int i = 0; i < N; i++) {
    vec3 m = p - v * (float(i) + 0.5) * dt;
    vec3 tl = exp(-sigma * exitLen(m, L) * scale);
    vec3 st = exp(-sigma * dt * scale);
    acc += tv * tl * (1.0 - st);
    tv *= st;
  }
  return acc;
}
`;
