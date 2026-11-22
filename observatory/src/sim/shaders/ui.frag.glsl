// The software's drawing, laid over the image on the virtual monitor.
uniform sampler2D u_ui;
uniform vec2 u_res;
out vec4 o;

void main() {
  vec2 uv = gl_FragCoord.xy / u_res;
  o = texture(u_ui, vec2(uv.x, 1.0 - uv.y));
}
