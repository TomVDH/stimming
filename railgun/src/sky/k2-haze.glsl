
uniform float uHaze;
uniform float uHazeH;
uniform vec2 uLayer;
// uDustLoad: shot dust in the low air, 0 clear to 1 thick.
uniform float uDustLoad;
float k2hazeAmount(vec3 P) {
  vec3 v = P - cameraPosition;
  float dist = length(v);
  float k = 1.0 / uHazeH;
  float h0 = max(cameraPosition.y, 0.0), h1 = max(P.y, 0.0), dh = h1 - h0;
  float avg = abs(dh) < 0.01 ? exp(-h0 * k) : (exp(-h0 * k) - exp(-h1 * k)) / (dh * k);
  return 1.0 - exp(-dist * uHaze * (1.0 + 1.8 * uDustLoad) * max(avg, 0.0));
}
// The haze takes the horizon sky colour without the sun's disc.
// At night the haze takes the bare sky: no rock glow, no hit glow on the plain.
vec3 k2hazeColor(vec3 dir) { vec3 d = normalize(vec3(dir.x, 0.02, dir.z)); return mix(k2skyS(d, 0.0), k2skyB(d, 0.0), uStars) * 0.9 * mix(vec3(1.0), vec3(1.08, 0.86, 0.66), uDustLoad); }
vec3 k2haze(vec3 c, vec3 P) {
  return mix(c, k2hazeColor(normalize(P - cameraPosition)), k2hazeAmount(P));
}