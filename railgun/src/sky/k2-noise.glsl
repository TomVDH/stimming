
float k2hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float k2noise(vec2 p) {
  vec2 i = floor(p), f = fract(p), u = f * f * (3.0 - 2.0 * f);
  return mix(mix(k2hash(i), k2hash(i + vec2(1, 0)), u.x), mix(k2hash(i + vec2(0, 1)), k2hash(i + vec2(1, 1)), u.x), u.y);
}
float k2fbm(vec2 p) {
  float s = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) { s += a * k2noise(p); p = p * 2.03 + vec2(17.1, 9.2); a *= 0.5; }
  return s;
}
// Three-dimensional value noise for rock.
float k3hash(vec3 p) { p = fract(p * vec3(123.34, 456.21, 789.12)); p += dot(p, p.yzx + 45.32); return fract((p.x + p.y) * p.z); }
float k3noise(vec3 p) {
  vec3 i = floor(p), f = fract(p), u = f * f * (3.0 - 2.0 * f);
  float a = mix(mix(k3hash(i), k3hash(i + vec3(1, 0, 0)), u.x), mix(k3hash(i + vec3(0, 1, 0)), k3hash(i + vec3(1, 1, 0)), u.x), u.y);
  float b = mix(mix(k3hash(i + vec3(0, 0, 1)), k3hash(i + vec3(1, 0, 1)), u.x), mix(k3hash(i + vec3(0, 1, 1)), k3hash(i + vec3(1, 1, 1)), u.x), u.y);
  return mix(a, b, u.z);
}
float k3fbm(vec3 p) {
  float s = 0.0, a = 0.5;
  for (int i = 0; i < 3; i++) { s += a * k3noise(p); p = p * 2.07 + vec3(11.3, 7.1, 5.9); a *= 0.5; }
  return s;
}