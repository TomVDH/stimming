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
void main() {
  v_off = a_corner * a_pos.z;
  vec2 p = a_pos.xy + v_off;
  v_col = a_col;
  v_shape = a_shape;
  v_kind = a_pos.w;
  gl_Position = vec4(p.x / u_res.x * 2.0 - 1.0, 1.0 - p.y / u_res.y * 2.0, 0.0, 1.0);
}
