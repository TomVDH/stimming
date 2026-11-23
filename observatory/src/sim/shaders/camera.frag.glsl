// The camera's preview: the stack, stretched for the screen.
uniform sampler2D u_acc;
// The sensor's frame in px from the top left: x0, y0, x1, y1.
uniform vec4 u_rect;
// The stretch: black point, softness and white point in electrons.
uniform float u_black;
uniform float u_soft;
uniform float u_white;
// The software tints each filter's picture in that filter's colour.
uniform vec3 u_tint;
out vec4 o;

void main() {
  vec2 px = pxAt();
  if (px.x < u_rect.x || px.y < u_rect.y || px.x > u_rect.z || px.y > u_rect.w) {
    o = vec4(vec3(0.028, 0.03, 0.036), 1.0);
    return;
  }
  vec3 v = texelFetch(u_acc, ivec2(gl_FragCoord.xy), 0).rgb;
  vec3 x = max(v - u_black, 0.0);
  vec3 y = asinh(x / u_soft) / asinh((u_white - u_black) / u_soft);
  o = vec4(clamp(y, 0.0, 1.0) * u_tint, 1.0);
}
