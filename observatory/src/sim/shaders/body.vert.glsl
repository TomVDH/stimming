#version 300 es
// One quad per body: a star, a galaxy or a ghost ring.
layout(location = 0) in vec2 a_corner;
// Centre in px from the top left, half size in px, kind.
layout(location = 1) in vec4 a_pos;
// Linear colour and total light.
layout(location = 2) in vec4 a_col;
// Shape terms; each kind reads them its own way.
layout(location = 3) in vec4 a_shape;
uniform vec2 u_res;
out vec2 v_off;
flat out vec4 v_col;
flat out vec4 v_shape;
flat out float v_kind;
// The body's centre in px, for off-axis optics.
flat out vec2 v_pos;
void main() {
  v_off = a_corner * a_pos.z;
  vec2 p = a_pos.xy + v_off;
  if (a_pos.w > 2.5) {
    // A grating spectrum: a strip that starts z px right of the star.
    v_off = a_corner * vec2(a_shape.x * 0.5, a_shape.y * 3.0);
    p = a_pos.xy + vec2(a_shape.z + a_shape.x * 0.5, 0.0) + v_off;
  }
  v_col = a_col;
  v_shape = a_shape;
  v_kind = a_pos.w;
  v_pos = a_pos.xy;
  gl_Position = vec4(p.x / u_res.x * 2.0 - 1.0, 1.0 - p.y / u_res.y * 2.0, 0.0, 1.0);
}
