// Sorting sounds renderer: raw WebGL2.
// Rods of light and their floor reflections add into one float target.
// Bloom and a grade follow.
import { program, linked, target, free, bind, tri, TRI_VS } from '../shared/gl.js';
import { bloomChain } from '../shared/glow.js';

const HEAD = `#version 300 es
precision highp float;
`;

// One rod: cx, floor y, half width, height | r, g, b, heat | tip, sheen, mark, spare.
// uMirror 1 draws the reflection and the floor light under the floor.
const ROD_VS = `#version 300 es
in vec2 aCorner;
in vec4 aA;
in vec4 aB;
in vec4 aC;
uniform vec2 uRes;
uniform float uMirror, uDrop;
flat out vec4 vA;
flat out vec4 vB;
flat out vec4 vC;
void main() {
  vA = aA; vB = aB; vC = aC;
  float w = aA.z;
  float padX = w * (uMirror > 0.5 ? 7.0 : 4.0);
  float lo = uMirror > 0.5 ? aA.y - uDrop : aA.y - w;
  float hi = uMirror > 0.5 ? aA.y : aA.y + aA.w + w * 4.0;
  vec2 p = vec2(mix(aA.x - padX, aA.x + padX, aCorner.x * 0.5 + 0.5), mix(lo, hi, aCorner.y * 0.5 + 0.5));
  gl_Position = vec4(p / uRes * 2.0 - 1.0, 0.0, 1.0);
}`;
const ROD_FS = `${HEAD}
flat in vec4 vA;
flat in vec4 vB;
flat in vec4 vC;
uniform float uMirror, uDrop;
out vec4 o;
const vec3 HOT = vec3(1.0, 0.94, 0.86);
const vec3 COOL = vec3(0.45, 0.78, 1.0);
void main() {
  float w = vA.z, h = vA.w, heat = vB.w, tip = vC.x, sheen = vC.y;
  float px = gl_FragCoord.x - vA.x;
  float py = uMirror > 0.5 ? vA.y - gl_FragCoord.y : gl_FragCoord.y - vA.y;
  // A mirror image blurs and fades with its distance below the floor.
  float soft = uMirror > 0.5 ? 0.8 + py * 0.06 : 0.8;
  float cy = min(max(py, 0.0), h - w);
  float d = length(vec2(px, py - cy)) - w;
  float body = smoothstep(soft, -soft, d) * step(-0.5, py);
  // Glass lit from inside: a bright core, a dim body, a lit rim.
  float u = clamp(px / w, -1.0, 1.0);
  float shade = 0.34 + 0.95 * exp(-u * u * 7.0) + 0.42 * smoothstep(0.6, 0.98, abs(u));
  // The foot and the cap glow a little more than the middle.
  shade *= 1.0 + 0.35 * exp(-py / (w * 5.0)) + 0.25 * exp(-max(h - py, 0.0) / (w * 2.5));
  vec3 base = vB.rgb * (1.0 + 0.55 * sheen);
  // Heat turns the rod white-hot, keeping a trace of its colour.
  vec3 hot = mix(base, HOT, 0.6) * (1.0 + 0.9 * heat);
  vec3 c = mix(base, hot, heat) * shade * body;
  // The tip: a white glint at the top of the rod.
  vec2 t = vec2(px, py - (h - w * 0.7)) / (w * 0.85);
  c += HOT * (tip * 2.2 + sheen * 0.25) * exp(-dot(t, t));
  // A faint halo: the haze round the rod.
  float halo = exp(-max(d, 0.0) / (w * 1.6)) * (1.0 - body);
  c += (base * 0.07 + HOT * heat * 0.08) * halo * step(0.0, py);
  if (uMirror > 0.5) {
    c *= 0.2 * exp(-py / (uDrop * 0.42));
    // The floor catches the rod's light in a soft pool.
    vec2 q = vec2(px / (w * 5.5), py / (w * 1.8));
    float pool = exp(-dot(q, q));
    c += (base * 0.05 + HOT * (heat * 0.3 + tip * 0.08)) * pool;
    // A held bar: a small cool light on the floor under its rod.
    vec2 m = vec2(px / (w * 1.3), (py - w * 1.6) / (w * 0.55));
    c += COOL * vC.z * 1.8 * exp(-dot(m, m));
  }
  o = vec4(c, 1.0);
}`;

// The grade: the dark room, the floor, the sweep light, bloom, film curve, vignette, grain.
const FINAL = `${HEAD}
in vec2 vUv;
out vec4 o;
uniform sampler2D uHdr, uBloom;
uniform vec2 uRes;
uniform vec4 uFloor;
uniform vec3 uSweep;
uniform float uFrame, uBloomK;
float hash(vec2 p) { vec3 q = fract(p.xyx * 0.1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
vec3 film(vec3 x) { return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0); }
void main() {
  vec2 v = vUv - 0.5;
  vec2 f = gl_FragCoord.xy;
  vec3 c = texture(uHdr, vUv).rgb + texture(uBloom, vUv).rgb * uBloomK;
  // The room: near black, a cool haze that rises from the floor line.
  float above = f.y - uFloor.x;
  float span = max(uFloor.w - uFloor.z, 1.0);
  float inRow = smoothstep(0.0, span * 0.12, f.x - uFloor.z) * smoothstep(0.0, span * 0.12, uFloor.z + span - f.x);
  c += vec3(0.0040, 0.0046, 0.0068) * (1.0 - 1.6 * dot(v, v));
  c += vec3(0.010, 0.008, 0.014) * inRow * exp(-abs(above) / (uFloor.y * 0.35));
  // The floor line: the edge of the black glass catches a thread of light.
  c += vec3(0.05, 0.045, 0.06) * inRow * exp(-abs(above) / 1.2);
  // The sweep: a column of white light runs along the row.
  float sx = (f.x - uSweep.x) / max(uSweep.y, 1.0);
  float col = exp(-sx * sx) * smoothstep(-uFloor.y * 0.35, 0.0, above) * exp(-max(above, 0.0) / (uFloor.y * 0.55));
  c += vec3(1.0, 0.92, 0.8) * uSweep.z * 0.09 * col;
  c = film(c);
  c *= 1.0 - 0.5 * dot(v, v);
  c = pow(c, vec3(1.0 / 2.2));
  c += (hash(f + uFrame * 17.3) - 0.5) * 0.012;
  o = vec4(c, 1.0);
}`;

export const ROD_FLOATS = 12;
const MAX_RODS = 256;

export async function makeRenderer(gl) {
  const P = await linked(gl, {
    rod: program(gl, ROD_VS, ROD_FS, ['aCorner', 'aA', 'aB', 'aC']),
    final: program(gl, TRI_VS, FINAL),
  });
  const empty = gl.createVertexArray();
  const bloom = bloomChain(gl, { max: 6 });

  // Rods: a corner quad and one instance buffer.
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  const inst = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, inst);
  gl.bufferData(gl.ARRAY_BUFFER, MAX_RODS * ROD_FLOATS * 4, gl.DYNAMIC_DRAW);
  for (let i = 0; i < 3; i++) {
    gl.enableVertexAttribArray(1 + i);
    gl.vertexAttribPointer(1 + i, 4, gl.FLOAT, false, ROD_FLOATS * 4, i * 16);
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

  // Draws one frame.
  // view: floor y, row height, row x0 and x1, the reflection depth, in device pixels.
  // sweep: x, width and level of the sweep light.
  function render(data, count, view, sweep, { frameNo = 0, bloomLevels = 6 } = {}) {
    count = Math.min(count, MAX_RODS);
    gl.bindFramebuffer(gl.FRAMEBUFFER, hdr.fb);
    gl.viewport(0, 0, W, H);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);
    const r = P.rod;
    gl.useProgram(r.p);
    gl.uniform2f(r.u.uRes, W, H);
    gl.uniform1f(r.u.uDrop, view.drop);
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, inst);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, data, 0, count * ROD_FLOATS);
    for (const m of [1, 0]) {
      gl.uniform1f(r.u.uMirror, m);
      gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, count);
    }
    gl.disable(gl.BLEND);
    gl.bindVertexArray(null);
    const bt = bloom.render(hdr.tex, W, H, { threshold: 0.5, cap: 10, levels: bloomLevels });
    const f = P.final;
    gl.useProgram(f.p);
    bind(gl, f, 'uHdr', 0, hdr);
    bind(gl, f, 'uBloom', 1, bt);
    gl.uniform2f(f.u.uRes, W, H);
    gl.uniform4f(f.u.uFloor, view.floor, view.rowH, view.x0, view.x1);
    gl.uniform3f(f.u.uSweep, sweep[0], sweep[1], sweep[2]);
    gl.uniform1f(f.u.uBloomK, 0.6);
    gl.uniform1f(f.u.uFrame, frameNo % 64);
    tri(gl, null, empty);
  }

  return { resize, render };
}
