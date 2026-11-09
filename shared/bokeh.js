// Shared GLSL: disc bokeh, after Buoy Business and Wind farm.
// Paste BOKEH into a fragment shader that can sample the sharp image.
// Golden-angle taps fill a disc; hot texels weigh more, so lights open into clean discs.
// Run it at half resolution and upsample; the gather is then smooth and cheap.
//
// bokeh(t, uv, rad, blades, hotT, hotW, rim)
//   rad: the disc radius in uv units, per axis (divide x by the aspect).
//   blades: 0 keeps the disc round; 5 to 8 give an aperture polygon.
//   hotT, hotW: the brightness where a texel counts as a light, and its extra weight.
//   rim: 0 for an even disc, 1 for a bright ring at the edge.

export const BOKEH = /* glsl */`
float bkBlade(float a, float n) {
  if (n < 2.5) return 1.0;
  float s = 6.2832 / n;
  return cos(0.5 * s) / cos(mod(a, s) - 0.5 * s);
}
vec3 bokeh(sampler2D t, vec2 uv, vec2 rad, float blades, float hotT, float hotW, float rim) {
  vec3 acc = vec3(0.0);
  float ws = 0.0;
  // A small turn per pixel breaks the tap rings without visible grain.
  float rot = 0.5 * fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));
  for (int k = 0; k < 48; k++) {
    float rk = sqrt((float(k) + 0.5) / 48.0), a = float(k) * 2.39996 + rot;
    vec2 d = vec2(cos(a), sin(a)) * rk * bkBlade(a, blades);
    vec3 c = texture(t, uv + d * rad).rgb;
    float hot = max(max(c.r, max(c.g, c.b)) - hotT, 0.0);
    float w = (1.0 + hot * hot * hotW) * mix(1.0, 0.4 + 1.6 * smoothstep(0.7, 1.0, rk), rim);
    acc += c * w;
    ws += w;
  }
  return acc / ws;
}
`;
