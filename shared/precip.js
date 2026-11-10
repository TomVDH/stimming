// Shared GLSL: rain and snow in the air, on the frame.
// Layers of streaks or flakes at three depths; near ones are larger and faster.
// It is a screen effect: cheap, and it needs no particles.
// Rain that must pass through a lamp's beam in the world still needs particles.
// Paste PRECIP into a fragment shader. It declares no uniforms.
// It compiles in raw WebGL2 and in a three.js ShaderMaterial.
//
// Use, before the pane or the grade:
//   float w = ppRain(uv, asp, time, amount, dir, 3);      // or ppSnow(...)
//   col += light * w;
// uv is 0 to 1 on the frame. asp is width over height. amount is 0 to 1.
// dir is the unit fall direction on the frame; precipDir(wind, snow) gives it.
// light is what lights the drops: the sky's grey, plus any lamp near the pixel.
// The last argument is the layer count; precipDetail(level) gives it.

export const PRECIP = /* glsl */`
float ppH(vec2 p) { vec3 q = fract(vec3(p.xyx) * 0.1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
// One depth of rain. near is 1 for the closest layer and falls toward 0.
float ppRainLayer(vec2 q, vec2 dir, float t, float amt, float near, float seed) {
  // Columns lie across the fall; each streak runs along it.
  float pitch = 0.03 * near + 0.006, span = 0.5 * near + 0.08;
  float c = dot(q, vec2(-dir.y, dir.x)), s = dot(q, dir) - t * (3.4 * near + 0.5);
  float col = floor(c / pitch);
  // Each column has its own phase, so drops never fall in rows.
  float along = s / span + ppH(vec2(col, seed)) * 9.0;
  vec2 id = vec2(col, floor(along));
  float h = ppH(id + seed);
  if (h > amt * 0.55) return 0.0;
  float fy = fract(along), len = 0.3 + 0.45 * ppH(id + seed + 7.1);
  float across = abs((fract(c / pitch) - 0.5 + (ppH(id + seed + 3.7) - 0.5) * 0.6) * pitch);
  float line = smoothstep(0.0022 * near + 0.0005, 0.0, across) * smoothstep(0.0, 0.08, fy) * smoothstep(len, len - 0.12, fy);
  // A near streak is spread by its speed, so it is fainter.
  return line * (0.4 + 0.6 * ppH(id + seed + 1.3)) * mix(1.0, 0.55, near);
}
// Rain streaks. layers is 1 to 3; the far layers are the cheap ones to drop.
float ppRain(vec2 uv, float asp, float t, float amt, vec2 dir, int layers) {
  if (amt <= 0.0) return 0.0;
  vec2 q = vec2(uv.x * asp, uv.y);
  float w = ppRainLayer(q, dir, t, amt, 1.0, 11.0);
  if (layers > 1) w += ppRainLayer(q, dir, t, amt, 0.55, 23.0);
  if (layers > 2) w += ppRainLayer(q, dir, t, amt, 0.3, 37.0);
  return w;
}
// One depth of snow: a flake per cell, by chance, that sways as it falls.
float ppSnowLayer(vec2 q, vec2 dir, float t, float amt, float near, float seed) {
  float cell = 0.08 * near + 0.02;
  vec2 g = (q - dir * t * (0.3 * near + 0.08)) / cell, id = floor(g);
  float h = ppH(id + seed);
  if (h > amt * 0.75) return 0.0;
  float h2 = ppH(id + seed + 5.3);
  vec2 at = vec2(0.5) + (vec2(h2, ppH(id + seed + 9.1)) - 0.5) * 0.5 + vec2(sin(t * (0.6 + h2) + h2 * 40.0) * 0.14, 0.0);
  float r = (0.05 + 0.09 * ppH(id + seed + 2.9)) * (0.7 + 0.6 * near);
  // A near flake is out of focus: larger and soft at its edge.
  return smoothstep(r, r * mix(0.55, 0.05, near), length(fract(g) - at)) * mix(1.0, 0.5, near);
}
// Snowflakes. layers is 1 to 4.
float ppSnow(vec2 uv, float asp, float t, float amt, vec2 dir, int layers) {
  if (amt <= 0.0) return 0.0;
  vec2 q = vec2(uv.x * asp, uv.y);
  float w = ppSnowLayer(q, dir, t, amt, 1.0, 13.0);
  if (layers > 1) w += ppSnowLayer(q, dir, t, amt, 0.6, 29.0);
  if (layers > 2) w += ppSnowLayer(q, dir, t, amt, 0.35, 41.0);
  if (layers > 3) w += ppSnowLayer(q, dir, t, amt, 0.2, 53.0);
  return w;
}
`;

// The unit fall direction on the frame for an air speed in m/s.
// Rain slants a little; snow drifts far more. y is up, so the fall is negative.
export function precipDir(wind = 0, snow = false) {
  const x = -wind / (snow ? 3 : 9), l = Math.hypot(x, 1);
  return [x / l, -1 / l];
}

// The layer budget at a detail level (shared/detail.js): 0 low, 1 standard, 2 high.
export const precipDetail = level => ({ rain: level > 0 ? 3 : 2, snow: level > 0 ? 4 : 2 });
