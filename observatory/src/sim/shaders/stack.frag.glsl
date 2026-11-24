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
// The filter's weight on hydrogen-alpha line light, kept in the alpha channel.
// Only the Hα filter reads it; the broad filters see that light in red.
uniform float u_line;
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
// Bleeds from overfull stars: screen x and y, half length and width in sensor pixels.
uniform vec4 u_bleeds[8];
uniform float u_nbleed;
// 1 when drizzle rebuilds detail finer than a sensor pixel past 1:1.
uniform float u_drizzle;
out vec4 o;
// Cosmic rays: hits per second over the whole sensor, at the summit.
const float RAYS = 0.25;
// Cosmic rays land in tiles of this many sensor pixels.
const float TILE = 48.0;

float normal(vec2 p, float s) {
  float a = max(hash2(p + s), 1e-6), b = hash2(p.yx + s * 1.37 + 11.0);
  return sqrt(-2.0 * log(a)) * cos(6.2831853 * b);
}

// The flat field at a sensor place: vignetting and dust shadows.
float flatField(vec2 p) {
  vec2 q = (p - 0.5 * u_sensor) / (0.5 * length(u_sensor));
  float f = 1.0 - 0.26 * dot(q, q);
  // Dust on the filter casts out-of-focus rings: dark edges, paler centres.
  vec2 dust[3] = vec2[3](vec2(0.31, 0.64), vec2(0.72, 0.27), vec2(0.57, 0.83));
  for (int i = 0; i < 3; i++) {
    float d = length(p - dust[i] * u_sensor), r = 96.0 + float(i) * 22.0;
    float disc = smoothstep(r + 5.0, r - 5.0, d);
    float rim = disc * smoothstep(r * 0.55 - 6.0, r * 0.55 + 6.0, d);
    f *= 1.0 - 0.025 * disc - 0.04 * rim;
  }
  return f;
}

// The sky's electrons in one sensor pixel at a screen place.
float skyAt(vec2 at, float area) {
  ivec2 ia = clamp(ivec2(int(at.x), int(u_res.y - at.y)), ivec2(0), ivec2(u_res) - 1);
  vec4 t = texelFetch(u_tex, ia, 0);
  vec3 light = t.rgb + u_bg + milkyWay(dirAt(at));
  return (dot(light, u_filter) + t.a * u_line) * u_exp * u_egain / area;
}

// A full well's overflow runs along its column, as a CCD bleeds.
// Returns the share of this screen pixel that bleeds fill, 0 to 1.
// w: the screen pixel's width in sensor pixels.
float bleed(vec2 at, float w) {
  float f = 0.0;
  for (int i = 0; i < 8; i++) {
    if (float(i) >= u_nbleed) break;
    vec4 b = u_bleeds[i];
    // Distances in sensor pixels.
    float dx = abs(at.x - b.x) / u_k, dy = abs(at.y - b.y) / u_k;
    // The column is narrower toward its ends.
    float hw = 0.5 * b.w * (1.0 - 0.6 * smoothstep(0.5 * b.z, b.z, dy));
    float across = clamp((hw + 0.5 * w - dx) / w, 0.0, 1.0);
    f = max(f, dy < b.z ? min(across, hw * 2.0 / w) : 0.0);
  }
  return f;
}

// Cosmic-ray hits near sensor place p in this sub: electrons.
// w: half the footprint of the screen pixel, in sensor pixels.
float rays(vec2 p, float w) {
  vec2 t = floor(p / TILE);
  float tiles = (u_sensor.x / TILE) * (u_sensor.y / TILE);
  if (hash2(t + u_seed * 0.137) > RAYS * u_exp / tiles) return 0.0;
  // A short track at a random place and angle; most are dots or worms.
  vec2 a = (t + 0.15 + 0.7 * vec2(hash2(t + u_seed + 3.1), hash2(t.yx + u_seed + 5.7))) * TILE;
  float ang = 6.2831853 * hash2(t + u_seed * 2.3), len = 14.0 * pow(hash2(t * 1.3 + u_seed), 3.0);
  vec2 b = a + len * vec2(cos(ang), sin(ang));
  vec2 ab = b - a;
  float k = clamp(dot(p - a, ab) / max(dot(ab, ab), 1e-6), 0.0, 1.0);
  float d = length(p - (a + ab * k));
  float energy = 3000.0 + 22000.0 * hash2(t + u_seed * 4.1);
  return d < 0.7 + w ? energy * (w > 0.5 ? (len + 1.0) : 1.0 - d / (0.7 + w)) : 0.0;
}

void main() {
  vec2 px = pxAt();
  ivec2 ip = ivec2(gl_FragCoord.xy);
  vec2 cell = floor((px - u_origin) / u_k);
  bool big = u_k >= 1.0;
  // Past 1:1, a sensor pixel is a block: sample its centre.
  // Drizzle samples each screen pixel instead, so no blocks show.
  bool blocks = big && u_drizzle < 0.5;
  vec2 at = blocks ? (cell + 0.5) * u_k + u_origin : px;
  // Sensor pixels in this screen pixel; past 1:1 it is a fraction.
  float area = 1.0 / (u_k * u_k);
  // The sensor place of this screen pixel.
  vec2 sp = big ? cell + 0.5 : (px - u_origin) / u_k;
  float fl = flatField(sp);
  float e = skyAt(at, area) * fl;
  // The amp glows at the sensor's top right corner.
  float glow = u_amp * u_exp * exp(-length(sp - vec2(u_sensor.x, 0.0)) / (0.18 * u_sensor.x));
  // Fixed per column: a small offset, and one warm column.
  float col = (hash2(vec2(floor(sp.x), 3.1)) - 0.5) * 1.6 + (floor(sp.x) == 4021.0 ? u_dark * u_exp * 3.0 : 0.0);
  // New in each sub: a row's readout offset, faint stripes across.
  float row = normal(vec2(floor(sp.y), 7.0), u_seed) * 0.15 * u_read;
  float ray = rays(sp, big ? 0.0 : 0.5 / u_k) * u_noise;
  if (big) {
    // Work in one whole sensor pixel.
    float es = e + u_dark * u_exp + glow + col + row;
    float h = hash2(cell * 1.7 + 0.5);
    if (h > 0.9994) es += u_hot * u_exp * (h - 0.9994) / 0.0006;
    es += normal(blocks ? cell : floor(px), u_seed) * sqrt(max(es, 0.0) + u_read * u_read) * u_noise;
    es = mix(es + ray, u_full, bleed(at, 1.0));
    e = clamp(es, 0.0, u_full) * area;
  } else {
    // This screen pixel sums many sensor pixels.
    float es = e * area + (u_dark * u_exp + glow + col + row) * area;
    float h = hash2(floor(px) * 1.7 + 0.5);
    if (h > 1.0 - 0.0006 * area) es += u_hot * u_exp;
    es += normal(px, u_seed) * sqrt(max(es, 0.0) + area * u_read * u_read) * u_noise;
    // A bleed fills its share of this pixel's sensor pixels to the brim.
    es = mix(es + ray, u_full * area, bleed(at, 1.0 / u_k));
    e = clamp(es, 0.0, u_full * area);
  }
  vec3 acc = texelFetch(u_acc, ip, 0).rgb;
  o = vec4(mix(acc, vec3(e), u_mix), 1.0);
}
