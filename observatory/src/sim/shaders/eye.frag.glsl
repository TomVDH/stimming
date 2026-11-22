// The eyepiece: what the eye sees through the field stop.
uniform sampler2D u_tex;
// The field stop's radius in px.
uniform float u_radius;
// Light to eye response.
uniform float u_gain;
// Bloom from the brightest stars.
uniform float u_glare;
// Lateral colour at the field's edge, in px.
uniform float u_ca;
// Night-vision grain, 0 for still frames.
uniform float u_grain;
uniform float u_time;
out vec4 o;

void main() {
  vec2 px = pxAt();
  vec2 d = px - u_center;
  float rr = length(d) / u_radius;
  if (rr > 1.0 + 2.0 / u_radius) {
    o = vec4(0.0, 0.0, 0.0, 1.0);
    return;
  }
  vec2 uv = gl_FragCoord.xy / u_res;
  // Colour fringes grow toward the edge, red out and blue in.
  vec2 dir = vec2(d.x, -d.y) / max(1.0, length(d)) / u_res;
  float k = u_ca * rr * rr;
  // The field curves, so the edge goes soft.
  float lod = 1.6 * smoothstep(0.75, 1.0, rr);
  vec3 s;
  s.r = textureLod(u_tex, uv + dir * k, lod).r;
  s.g = textureLod(u_tex, uv, lod).g;
  s.b = textureLod(u_tex, uv - dir * k, lod).b;
  vec3 glare = textureLod(u_tex, uv, 3.0).rgb * 0.5 + textureLod(u_tex, uv, 5.0).rgb * 0.3 + textureLod(u_tex, uv, 7.0).rgb * 0.2;
  vec3 v = (s + glare * u_glare + u_bg + milkyWay(dirAt(px))) * u_gain;
  // The eye saturates softly on brightness, so hue survives.
  float vin = max(dot(v, vec3(0.2126, 0.7152, 0.0722)), 1e-6);
  float lum = 1.0 - exp(-vin);
  vec3 L = v * (lum / vin);
  // Burnt-out cores go partly white.
  L = mix(L, vec3(lum), 0.4 * smoothstep(0.6, 1.0, lum));
  L = min(L, vec3(1.0));
  // Faint light loses its colour: rod vision.
  L = mix(vec3(lum), L, smoothstep(0.05, 0.55, lum));
  L *= 1.0 - 0.25 * pow(rr, 4.0);
  L += (hash2(px + fract(u_time) * 517.0) - 0.5) * u_grain * (0.4 + 2.0 * sqrt(lum));
  L *= smoothstep(1.0 + 1.5 / u_radius, 1.0 - 1.5 / u_radius, rr);
  o = vec4(pow(max(L, 0.0), vec3(1.0 / 2.2)), 1.0);
}
