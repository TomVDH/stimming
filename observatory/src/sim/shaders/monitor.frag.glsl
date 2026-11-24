// The control room's monitor: an LCD panel in a black bezel.
// We look at the screen; the screen lights the bezel and the desk.
uniform sampler2D u_screen;
uniform vec2 u_res;
// The panel's glass on the canvas, in px from the top left.
uniform vec4 u_rect;
uniform float u_radius;
uniform float u_bezel;
// The room's share of the screen's glow; 0 when the panel fills the view.
uniform float u_room;
uniform float u_levels;
// 1 when the software runs its red night mode.
uniform float u_night;
out vec4 o;

float box(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

float hash(vec2 p) {
  vec3 q = fract(vec3(p.xyx) * 0.1031);
  q += dot(q, q.yzx + 33.33);
  return fract((q.x + q.y) * q.z);
}

// Smooth value noise for the backlight's patches.
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + 1.0), f.x), f.y);
}

// One LCD subpixel stripe: 1 inside its third of the pixel.
float band(float x) {
  return smoothstep(-0.08, 0.12, x) * smoothstep(1.08, 0.88, x);
}

// The software's night mode keeps only red light.
vec3 night(vec3 c) {
  return u_night > 0.5 ? vec3(dot(c, vec3(0.35, 0.5, 0.15)) * 1.15, 0.0, 0.0) : c;
}

void main() {
  vec2 px = vec2(gl_FragCoord.x, u_res.y - gl_FragCoord.y);
  vec2 c = (u_rect.xy + u_rect.zw) * 0.5, hs = (u_rect.zw - u_rect.xy) * 0.5;
  float d = box(px - c, hs, u_radius);
  // The screen's mean light glows on everything round it.
  vec3 avg = night(textureLod(u_screen, vec2(0.5), u_levels - 1.0).rgb);
  // With no bezel, the panel's edge meets black.
  vec3 bezel = vec3(0.0);
  if (u_bezel > 0.0) {
    bezel = vec3(0.026, 0.027, 0.03) + avg * 0.3 * exp(-max(d, 0.0) / (u_bezel * 0.3));
    // A hair of light on the bezel's lip, brighter on top.
    bezel += vec3(0.022) * smoothstep(u_bezel - 2.5, u_bezel - 0.5, d) * smoothstep(u_bezel + 0.5, u_bezel - 0.5, d) * (px.y < c.y ? 1.0 : 0.35);
  }
  vec3 col;
  if (d < 1.0) {
    vec2 uv = (px - u_rect.xy) / (u_rect.zw - u_rect.xy);
    vec2 t = vec2(uv.x, 1.0 - uv.y);
    vec3 s = texture(u_screen, t).rgb;
    // Bright marks bloom a little through the panel.
    s += (textureLod(u_screen, t, 3.0).rgb * 0.6 + textureLod(u_screen, t, 5.0).rgb * 0.4) * 0.12;
    s = night(s);
    // An LCD never shows true black; the backlight bleeds in at the edges.
    float rim = min(min(uv.x, 1.0 - uv.x), min(uv.y, 1.0 - uv.y) * 1.6);
    vec3 black = vec3(0.014, 0.016, 0.022) + (1.0 - smoothstep(0.0, 0.07, rim)) * vec3(0.016, 0.018, 0.026);
    // The backlight is a little patchy, as every panel is.
    black *= 0.85 + 0.3 * vnoise(uv * vec2(6.0, 4.0) + 3.7);
    // An IPS panel glows grey-blue in its corners on dark content.
    float corner = smoothstep(0.55, 1.0, length((uv - 0.5) * vec2(2.0, 2.3)) / 1.2);
    black += corner * vec3(0.02, 0.021, 0.027);
    s = black + s * (1.0 - black);
    // The panel dims toward its corners.
    s *= 1.0 - 0.18 * dot(uv - 0.5, uv - 0.5);
    // Up close, each screen pixel shows as red, green and blue stripes in a dark grid.
    vec2 cells = vec2(textureSize(u_screen, 0));
    vec2 vp = uv * cells;
    float grid = smoothstep(1.8, 4.5, (u_rect.z - u_rect.x) / cells.x);
    float fx = fract(vp.x) * 3.0, fy = fract(vp.y);
    vec3 mask = vec3(band(fx), band(fx - 1.0), band(fx - 2.0)) * 2.7;
    mask *= smoothstep(0.0, 0.1, fy) * smoothstep(1.0, 0.9, fy);
    s *= mix(vec3(1.0), mask, grid * 0.6);
    // The matte coating holds a faint sheen of the room.
    s += vec3(0.01) * smoothstep(0.5, 0.0, abs(uv.x * 0.75 + uv.y * 0.55 - 0.42));
    col = mix(s, bezel, smoothstep(-1.0, 1.0, d));
  } else if (d < u_bezel) {
    col = bezel;
  } else {
    // The dark room; the desk below the monitor catches more of its light.
    float fall = exp(-(d - u_bezel) / (hs.y * 0.5));
    float desk = smoothstep(u_rect.w + u_bezel, u_rect.w + u_bezel + 30.0, px.y);
    col = avg * fall * (0.05 + 0.1 * desk) * u_room;
  }
  // Dither hides banding in the dark gradients.
  col += (hash(px) - 0.5) / 255.0;
  o = vec4(max(col, 0.0), 1.0);
}
