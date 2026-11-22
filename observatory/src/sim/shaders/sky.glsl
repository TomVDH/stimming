// Shared sky terms; render.ts puts this after the version line.
uniform vec2 u_res;
// The field centre in px from the top left, and px per radian.
uniform vec2 u_center;
uniform float u_scale;
// The eyepiece frame in shell axes.
uniform vec3 u_r;
uniform vec3 u_u;
uniform vec3 u_f;
// Sky glow per px per second, and the Milky Way's gain.
uniform vec3 u_bg;
uniform float u_mw;

// The north galactic pole in shell axes.
const vec3 NGP = vec3(-0.8677, 0.1981, 0.4560);

// px from the top left.
vec2 pxAt() {
  return vec2(gl_FragCoord.x, u_res.y - gl_FragCoord.y);
}

// The sky direction through a pixel.
vec3 dirAt(vec2 px) {
  vec2 d = (px - u_center) / u_scale;
  return normalize(u_f + d.x * u_r - d.y * u_u);
}

float hash3(vec3 p) {
  p = fract(p * 0.3183099 + vec3(0.71, 0.113, 0.419));
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}

float vnoise(vec3 x) {
  vec3 i = floor(x), f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(hash3(i), hash3(i + vec3(1, 0, 0)), f.x), mix(hash3(i + vec3(0, 1, 0)), hash3(i + vec3(1, 1, 0)), f.x), f.y),
    mix(mix(hash3(i + vec3(0, 0, 1)), hash3(i + vec3(1, 0, 1)), f.x), mix(hash3(i + vec3(0, 1, 1)), hash3(i + vec3(1, 1, 1)), f.x), f.y),
    f.z);
}

float fbm(vec3 p) {
  float s = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) {
    s += a * vnoise(p);
    p *= 2.03;
    a *= 0.5;
  }
  return s;
}

// The unresolved Milky Way: a glow with dark dust lanes near the plane.
vec3 milkyWay(vec3 d) {
  float b = asin(clamp(dot(d, NGP), -1.0, 1.0));
  float band = exp(-abs(b) / 0.14);
  float cloud = fbm(d * 160.0);
  float dust = smoothstep(0.5, 0.72, fbm(d * 90.0 + 7.3));
  float glow = band * (0.45 + 0.9 * cloud) * (1.0 - 0.7 * dust * band);
  return u_mw * glow * vec3(0.95, 0.92, 1.0);
}

float hash2(vec2 p) {
  vec3 q = fract(vec3(p.xyx) * 0.1031);
  q += dot(q, q.yzx + 33.33);
  return fract((q.x + q.y) * q.z);
}
