// The camera's sensor: one noisy sub, mixed into the running stack.
uniform sampler2D u_tex;
uniform sampler2D u_acc;
// The new sub's share of the stack: 1 over the sub count.
uniform float u_mix;
// Exposure in s, electrons per light unit, read noise in electrons.
uniform float u_exp;
uniform float u_egain;
uniform float u_read;
uniform float u_full;
uniform float u_seed;
// 1 for a colour sensor, 0 for mono.
uniform float u_colour;
// Hot pixels and amp glow, electrons per second.
uniform float u_hot;
uniform float u_amp;
out vec4 o;

float normal(vec2 p, float s) {
  float a = max(hash2(p + s), 1e-6), b = hash2(p.yx + s * 1.37 + 11.0);
  return sqrt(-2.0 * log(a)) * cos(6.2831853 * b);
}

void main() {
  vec2 px = pxAt();
  ivec2 ip = ivec2(gl_FragCoord.xy);
  vec3 s = texelFetch(u_tex, ip, 0).rgb + u_bg + milkyWay(dirAt(px));
  vec3 e = s * u_exp * u_egain;
  // Shot noise and read noise: one normal draw per channel.
  e += vec3(normal(px, u_seed), normal(px, u_seed + 3.1), normal(px, u_seed + 7.7)) * sqrt(e + u_read * u_read);
  // Hot pixels sit at fixed places on the sensor.
  float h = hash2(floor(px) * 1.7 + 0.5);
  if (h > 0.9994) e += u_hot * u_exp * (h - 0.9994) / 0.0006;
  e += u_amp * u_exp * exp(-length(px - vec2(u_res.x, 0.0)) / (0.18 * u_res.x));
  e = clamp(e, 0.0, u_full);
  if (u_colour < 0.5) e = vec3(dot(e, vec3(0.3, 0.45, 0.25)));
  vec3 acc = texelFetch(u_acc, ip, 0).rgb;
  o = vec4(mix(acc, e, u_mix), 1.0);
}
