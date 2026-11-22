// The camera's sensor: one noisy sub, mixed into the running stack.
// Light and noise are worked out per sensor pixel.
// The result is shown per screen pixel.
uniform sampler2D u_tex;
uniform sampler2D u_acc;
// The new sub's share of the stack: 1 over the sub count.
uniform float u_mix;
// Noise scale: below 1 when one sub stands in for a whole stack.
uniform float u_noise;
// Exposure in s, and electrons per light unit.
// Read noise and full well in electrons.
uniform float u_exp;
uniform float u_egain;
uniform float u_read;
uniform float u_full;
uniform float u_seed;
// The filter's weights on R, G and B light.
uniform vec3 u_filter;
// Dark current, a hot pixel and the amp glow, in e- per s.
uniform float u_dark;
uniform float u_hot;
uniform float u_amp;
// Screen px per sensor pixel.
// The screen place of sensor pixel 0, 0.
uniform float u_k;
uniform vec2 u_origin;
// The sensor's size in pixels.
uniform vec2 u_sensor;
out vec4 o;

float normal(vec2 p, float s) {
  float a = max(hash2(p + s), 1e-6), b = hash2(p.yx + s * 1.37 + 11.0);
  return sqrt(-2.0 * log(a)) * cos(6.2831853 * b);
}

void main() {
  vec2 px = pxAt();
  ivec2 ip = ivec2(gl_FragCoord.xy);
  vec2 cell = floor((px - u_origin) / u_k);
  bool big = u_k >= 1.0;
  // Past 1:1, a sensor pixel is a block: sample its centre.
  vec2 at = big ? (cell + 0.5) * u_k + u_origin : px;
  ivec2 ia = clamp(ivec2(int(at.x), int(u_res.y - at.y)), ivec2(0), ivec2(u_res) - 1);
  vec3 light = texelFetch(u_tex, ia, 0).rgb + u_bg + milkyWay(dirAt(at));
  float e = dot(light, u_filter) * u_exp * u_egain;
  // Sensor pixels in this screen pixel; past 1:1 it is a fraction.
  float area = 1.0 / (u_k * u_k);
  // The amp glows at the sensor's top right corner.
  float glow = u_amp * u_exp * exp(-length(cell - vec2(u_sensor.x, 0.0)) / (0.18 * u_sensor.x));
  if (big) {
    // Work in one whole sensor pixel.
    float es = e / area + u_dark * u_exp + glow;
    float h = hash2(cell * 1.7 + 0.5);
    if (h > 0.9994) es += u_hot * u_exp * (h - 0.9994) / 0.0006;
    es += normal(cell, u_seed) * sqrt(es + u_read * u_read) * u_noise;
    e = clamp(es, 0.0, u_full) * area;
  } else {
    // This screen pixel sums many sensor pixels.
    float es = e + (u_dark * u_exp + glow) * area;
    float h = hash2(floor(px) * 1.7 + 0.5);
    if (h > 1.0 - 0.0006 * area) es += u_hot * u_exp;
    es += normal(px, u_seed) * sqrt(es + area * u_read * u_read) * u_noise;
    e = clamp(es, 0.0, u_full * area);
  }
  vec3 acc = texelFetch(u_acc, ip, 0).rgb;
  o = vec4(mix(acc, vec3(e), u_mix), 1.0);
}
