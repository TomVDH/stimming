// Epicycles renderer: raw WebGL2.
// Lines of light add into one float target; bloom and a grade follow.
import { program, linked, target, free, bind, tri, TRI_VS } from '../shared/gl.js';
import { bloomChain } from '../shared/glow.js';

const HEAD = `#version 300 es
precision highp float;
`;

// A strip of light: x, y in device pixels, the side (-1 or 1), the age.
const STRIP_VS = `#version 300 es
in vec4 aV;
uniform vec2 uRes;
out float vS;
out float vA;
void main() {
  vS = aV.z; vA = aV.w;
  gl_Position = vec4(aV.xy / uRes * 2.0 - 1.0, 0.0, 1.0);
}`;
// uHeat 1: the pen trail, hot at the head, cooling with age.
// uHeat 0: one colour, with the age as the level.
const STRIP_FS = `${HEAD}
in float vS;
in float vA;
uniform vec3 uCol;
uniform float uE, uHeat;
out vec4 o;
void main() {
  float a = clamp(vA, 0.0, 1.0);
  vec3 c = mix(vec3(1.0, 0.9, 0.74), vec3(1.0, 0.5, 0.15), smoothstep(0.0, 0.22, a));
  c = mix(c, vec3(0.72, 0.24, 0.06), smoothstep(0.22, 1.0, a));
  float e = 0.07 + 1.05 * exp(-a * 3.2) + 4.0 * exp(-a * 90.0);
  vec3 col = uHeat > 0.5 ? c * e : uCol * vA;
  o = vec4(col * uE * exp(-4.5 * vS * vS), 1.0);
}`;

// One shape of light: a ring, a segment or a dot, as a distance glow.
const SHAPE_VS = `#version 300 es
in vec2 aCorner;
in vec4 aA;
in vec4 aB;
in vec4 aC;
uniform vec2 uRes;
flat out vec4 vA;
flat out vec4 vB;
flat out vec4 vC;
void main() {
  vA = aA; vB = aB; vC = aC;
  float pad = aB.x + aB.y * 4.0 + 1.0;
  vec2 lo = min(aA.xy, aA.zw) - pad, hi = max(aA.xy, aA.zw) + pad;
  vec2 p = mix(lo, hi, aCorner * 0.5 + 0.5);
  gl_Position = vec4(p / uRes * 2.0 - 1.0, 0.0, 1.0);
}`;
const SHAPE_FS = `${HEAD}
flat in vec4 vA;
flat in vec4 vB;
flat in vec4 vC;
uniform vec3 uPen;
out vec4 o;
void main() {
  vec2 p = gl_FragCoord.xy, a = vA.xy, ab = vA.zw - vA.xy;
  float t = clamp(dot(p - a, ab) / max(dot(ab, ab), 1e-6), 0.0, 1.0);
  float d = abs(length(p - a - ab * t) - vB.x) / vB.y;
  // The pen head lights the rings and arms near it.
  vec2 q = (p - uPen.xy) / uPen.z;
  float lit = 1.0 + vC.w * exp(-dot(q, q));
  o = vec4(vC.rgb * vB.z * lit * exp(-0.5 * d * d), 1.0);
}`;

// The grade: the dark room, the pen's light, bloom, filmic curve, vignette, grain.
const FINAL = `${HEAD}
in vec2 vUv;
out vec4 o;
uniform sampler2D uHdr, uBloom;
uniform vec4 uPen;
uniform float uFrame, uBloomK;
float hash(vec2 p) { vec3 q = fract(p.xyx * 0.1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
vec3 film(vec3 x) { return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0); }
void main() {
  vec2 v = vUv - 0.5;
  vec3 c = texture(uHdr, vUv).rgb + texture(uBloom, vUv).rgb * uBloomK;
  // The room: near black, a cool haze toward the middle.
  c += vec3(0.0042, 0.0050, 0.0068) * (1.0 - 1.4 * dot(v, v));
  // The pen is a small lamp: its warm light falls on the haze.
  vec2 q = (gl_FragCoord.xy - uPen.xy) / uPen.z;
  c += vec3(1.0, 0.55, 0.22) * uPen.w * 0.026 / (1.0 + dot(q, q));
  c = film(c);
  c *= 1.0 - 0.45 * dot(v, v);
  c = pow(c, vec3(1.0 / 2.2));
  c += (hash(gl_FragCoord.xy + uFrame * 17.3) - 0.5) * 0.012;
  o = vec4(c, 1.0);
}`;

// Shape instance: x0, y0, x1, y1 | radius, sigma, energy, spare | r, g, b, glint.
export const SHAPE_FLOATS = 12;
const MAX_SHAPES = 2048;
const MAX_STRIP = 16384;

export async function makeRenderer(gl) {
  const P = await linked(gl, {
    strip: program(gl, STRIP_VS, STRIP_FS, ['aV']),
    shape: program(gl, SHAPE_VS, SHAPE_FS, ['aCorner', 'aA', 'aB', 'aC']),
    final: program(gl, TRI_VS, FINAL),
  });
  const empty = gl.createVertexArray();
  const bloom = bloomChain(gl, { max: 6 });

  // Strips: one dynamic buffer of vec4 vertices.
  const stripVao = gl.createVertexArray();
  gl.bindVertexArray(stripVao);
  const stripBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, stripBuf);
  gl.bufferData(gl.ARRAY_BUFFER, MAX_STRIP * 16, gl.DYNAMIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 4, gl.FLOAT, false, 16, 0);

  // Shapes: a corner quad and one instance buffer.
  const shapeVao = gl.createVertexArray();
  gl.bindVertexArray(shapeVao);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  const shapeBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, shapeBuf);
  gl.bufferData(gl.ARRAY_BUFFER, MAX_SHAPES * SHAPE_FLOATS * 4, gl.DYNAMIC_DRAW);
  for (let i = 0; i < 3; i++) {
    gl.enableVertexAttribArray(1 + i);
    gl.vertexAttribPointer(1 + i, 4, gl.FLOAT, false, SHAPE_FLOATS * 4, i * 16);
    gl.vertexAttribDivisor(1 + i, 1);
  }
  gl.bindVertexArray(null);

  let hdr = null, W = 0, H = 0;
  function resize(w, h) {
    W = Math.max(2, w); H = Math.max(2, h);
    gl.canvas.width = W; gl.canvas.height = H;
    free(gl, hdr);
    hdr = target(gl, W, H, { clear: true, check: true });
  }

  // Starts a frame: clears the light target and sets additive blending.
  function begin() {
    gl.bindFramebuffer(gl.FRAMEBUFFER, hdr.fb);
    gl.viewport(0, 0, W, H);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);
  }

  // Draws one strip. data holds count vec4 vertices.
  function strip(data, count, { heat = 0, col = [1, 1, 1], e = 1 } = {}) {
    if (count < 4) return;
    count = Math.min(count, MAX_STRIP);
    const s = P.strip;
    gl.useProgram(s.p);
    gl.uniform2f(s.u.uRes, W, H);
    gl.uniform3f(s.u.uCol, col[0], col[1], col[2]);
    gl.uniform1f(s.u.uE, e);
    gl.uniform1f(s.u.uHeat, heat);
    gl.bindVertexArray(stripVao);
    gl.bindBuffer(gl.ARRAY_BUFFER, stripBuf);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, data, 0, count * 4);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, count);
  }

  // Draws shapes. pen: x, y and the reach of its light, in device pixels.
  function shapes(data, count, pen) {
    if (!count) return;
    count = Math.min(count, MAX_SHAPES);
    const s = P.shape;
    gl.useProgram(s.p);
    gl.uniform2f(s.u.uRes, W, H);
    gl.uniform3f(s.u.uPen, pen[0], pen[1], pen[2]);
    gl.bindVertexArray(shapeVao);
    gl.bindBuffer(gl.ARRAY_BUFFER, shapeBuf);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, data, 0, count * SHAPE_FLOATS);
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, count);
  }

  // Ends a frame: bloom, then the grade to the screen.
  // pen: x, y, reach in device pixels, and its light level.
  function end(pen, { frameNo = 0, bloomLevels = 6 } = {}) {
    gl.disable(gl.BLEND);
    gl.bindVertexArray(null);
    const bt = bloom.render(hdr.tex, W, H, { threshold: 0.35, cap: 10, levels: bloomLevels });
    const f = P.final;
    gl.useProgram(f.p);
    bind(gl, f, 'uHdr', 0, hdr);
    bind(gl, f, 'uBloom', 1, bt);
    gl.uniform4f(f.u.uPen, pen[0], pen[1], pen[2], pen[3]);
    gl.uniform1f(f.u.uBloomK, 0.55);
    gl.uniform1f(f.u.uFrame, frameNo % 64);
    tri(gl, null, empty);
  }

  return { resize, begin, strip, shapes, end };
}
