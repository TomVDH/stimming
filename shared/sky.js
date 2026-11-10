// Shared GLSL: the sky bundle. A sky by direction, stars, and height haze.
// One driver, skyAt(hour), gives the colours for any time of day.
// Paste SKY into a fragment shader. It declares no uniforms.
// It compiles in raw WebGL2 and in a three.js ShaderMaterial.
//
// Use:
//   const s = skyAt(hour);                       // JS: zen, mid, band, anti, sun, stars, day
//   vec3 c = skSky(dir, sun, zen, mid, band, anti, stars, time);
//   float a = skHaze(cameraPosition, P, density, height);
//   c = mix(c, skDusk(normalize(vec3(dir.x, 0.04, dir.z)), sun, zen, mid, band, anti) * 0.9, a);
// dir is the unit view ray; y is up. sun is the unit direction to the sun.
// zen is the zenith. mid and band colour the sky toward the sun; anti is the far side.
// density is haze per metre at sea level; height is where it thins to a third.
// Sources: Coast and meteor (sky, palettes), the night-scene kit (stars, haze), Buoy Business (star field).

export const SKY = /* glsl */`
float skH(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
// The sky with no stars: zenith above, a band low toward the sun.
vec3 skDusk(vec3 dir, vec3 sun, vec3 zen, vec3 mid, vec3 band, vec3 anti) {
  float up = max(dir.y, 0.0);
  float az = dot(normalize(dir.xz + vec2(1e-5)), normalize(sun.xz));
  float sw = pow(0.5 + 0.5 * az, 3.0);
  vec3 hor = mix(anti, band, sw);
  vec3 m = mix(anti, mid, sw);
  vec3 col = mix(zen, m, exp(-up * 3.2));
  col = mix(col, hor, exp(-up * 11.0));
  // The afterglow hugs the horizon above the sun.
  return col + band * 0.8 * pow(sw, 8.0) * exp(-up * 28.0);
}
// The kit's stars: about one cell in two hundred holds a faint star.
float skStars(vec3 dir) {
  vec2 q = vec2(atan(dir.x, -dir.z) * 260.0, dir.y * 260.0);
  vec2 i = floor(q), f = fract(q) - 0.5;
  float h = skH(i);
  float on = step(0.995, h);
  vec2 o = vec2(skH(i + 7.1), skH(i + 3.3)) - 0.5;
  return on * exp(-dot(f - o * 0.6, f - o * 0.6) * 60.0) * (0.02 + 0.05 * skH(i + 1.7));
}
// A livelier field: each star has its own place, size, tint and twinkle.
// Cells are 0.6 degrees; one in forty holds a star. t is the clock in seconds.
vec3 skStarField(vec3 d, float t) {
  float el = asin(clamp(d.y, -1.0, 1.0));
  vec2 g = vec2(atan(d.z, d.x), el) * (57.2958 / 0.6);
  vec2 cell = floor(g), f = fract(g);
  float on = step(0.975, skH(cell));
  // Across a cell, azimuth narrows toward the zenith.
  vec2 at = vec2((f.x - 0.15 - 0.7 * skH(cell + 13.7)) * cos(el), f.y - 0.15 - 0.7 * skH(cell + 27.4));
  float core = smoothstep(0.1, 0.0, length(at));
  float h = skH(cell + 54.8);
  float mag = 0.15 + 0.85 * pow(skH(cell + 41.1), 3.0);
  float twinkle = 0.75 + 0.25 * sin(t * (2.0 + 5.0 * h) + h * 40.0);
  vec3 tint = mix(vec3(0.75, 0.82, 1.0), vec3(1.0, 0.9, 0.75), skH(cell + 68.5));
  // Stars fade out at the horizon.
  return tint * on * core * mag * twinkle * 1.6 * smoothstep(0.02, 0.15, d.y);
}
// The whole sky in one call. stars 0 to 1 brings the star field in.
vec3 skSky(vec3 dir, vec3 sun, vec3 zen, vec3 mid, vec3 band, vec3 anti, float stars, float t) {
  vec3 col = skDusk(dir, sun, zen, mid, band, anti);
  return stars > 0.0 ? col + skStarField(dir, t) * stars * 0.12 : col;
}
// Height haze from cam to P: exponential fog, integrated along the ray.
// Returns how much of the haze colour covers the point, 0 to 1.
float skHaze(vec3 cam, vec3 P, float density, float height) {
  float dist = length(P - cam);
  float k = 1.0 / height;
  float h0 = max(cam.y, 0.0), h1 = max(P.y, 0.0), dh = h1 - h0;
  float avg = abs(dh) < 0.01 ? exp(-h0 * k) : (exp(-h0 * k) - exp(-h1 * k)) / (dh * k);
  return 1.0 - exp(-dist * density * max(avg, 0.0));
}
`;

// Palettes in linear RGB. Night, blue hour and last light are Coast and meteor's.
const NIGHT = { zen: [0.0015, 0.0043, 0.0184], mid: [0.0045, 0.0058, 0.0209], band: [0.0468, 0.011, 0.0074], anti: [0.0025, 0.0053, 0.0188], stars: 1, day: 0 };
const BLUE = { zen: [0.0059, 0.0201, 0.0796], mid: [0.1009, 0.0418, 0.1188], band: [0.6045, 0.1298, 0.019], anti: [0.0299, 0.0323, 0.0776], stars: 0.45, day: 0.05 };
const LAST = { zen: [0.0298, 0.0881, 0.2177], mid: [0.3232, 0.1618, 0.3036], band: [1, 0.4406, 0.1071], anti: [0.1818, 0.1588, 0.2757], stars: 0, day: 0.3 };
const DAWN = { zen: [0.03, 0.075, 0.1887], mid: [0.3773, 0.1787, 0.2781], band: [1, 0.5354, 0.15], anti: [0.1805, 0.1477, 0.2579], stars: 0, day: 0.3 };
const DAY = { zen: [0.0612, 0.2218, 0.6034], mid: [0.2728, 0.515, 0.7461], band: [0.6511, 0.8477, 0.9208], anti: [0.3419, 0.5427, 0.7637], stars: 0, day: 1 };
// The day as keyframes: hour, then the palette at that hour.
const KEYS = [[0, NIGHT], [4.5, NIGHT], [5.5, BLUE], [6.5, DAWN], [8.5, DAY], [16.5, DAY], [18.5, LAST], [19.5, BLUE], [21, NIGHT], [24, NIGHT]];

// The sky at an hour of the day, 0 to 24. Every value is ready for a uniform.
// sun is the unit direction to the sun: it rises on the left and sets on the right.
// day is 0 at night and 1 in full daylight; use it to switch lamps and exposure.
export function skyAt(hour) {
  const h = ((hour % 24) + 24) % 24;
  let i = 0;
  while (i < KEYS.length - 2 && h >= KEYS[i + 1][0]) i++;
  const [h0, a] = KEYS[i], [h1, b] = KEYS[i + 1];
  const t = (h - h0) / (h1 - h0);
  const mix3 = key => a[key].map((v, n) => v + (b[key][n] - v) * t);
  const turn = Math.PI * (h - 6) / 12, el = Math.sin(turn), az = -1.2 * Math.cos(turn);
  return {
    zen: mix3('zen'), mid: mix3('mid'), band: mix3('band'), anti: mix3('anti'),
    stars: a.stars + (b.stars - a.stars) * t,
    day: a.day + (b.day - a.day) * t,
    sun: [Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el)],
  };
}
