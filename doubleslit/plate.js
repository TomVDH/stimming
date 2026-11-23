// Double slit renderer: raw WebGL2.
// Dots splat into a plate that keeps every count, and into a flash layer that fades.
// The compose pass draws the detector glass; bloom and the grade follow.
import { TRI_VS, program, linked, target, free, bind, tri } from '../shared/gl.js';
import { bloomChain } from '../shared/glow.js';

const HEAD = `#version 300 es
precision highp float;
`;

/* ---------- K1: accumulation and decay (copied from trails/index.html) ---------- */
// The flash layer ping-pongs; each frame fades it by exp(-dt/tau).
// The epsilon floor lets half floats reach zero.
const DECAY = `${HEAD}
uniform sampler2D uSrc;
uniform float uK, uEps;
in vec2 vUv;
out vec4 o;
void main() { vec4 c = texture(uSrc, vUv) * uK; o = max(c - uEps, 0.0); }`;
// A dot draws as a soft Gaussian quad, added into the target.
const DOT_VS = `#version 300 es
in vec2 aCorner;
in vec4 aDot;
in vec4 aCol;
uniform vec2 uRes;
out vec2 vQ;
flat out vec4 vCol;
void main() {
  float r = aDot.z * 3.2 + 1.0;
  vQ = aCorner * r / aDot.z;
  vCol = vec4(aCol.rgb * aDot.w, 1.0);
  gl_Position = vec4((aDot.xy + aCorner * r) / uRes * 2.0 - 1.0, 0.0, 1.0);
}`;
const DOT_FS = `${HEAD}
in vec2 vQ;
flat in vec4 vCol;
out vec4 o;
void main() { o = vec4(vCol.rgb * exp(-0.5 * dot(vQ, vQ)), 1.0); }`;
/* ---------- end K1 ---------- */

// The detector face: dark glass in a dark room, the plate's counts, the flashes.
const COMPOSE = `${HEAD}
uniform sampler2D uPlate, uFlash;
uniform vec2 uRes, uC, uHalf, uGlint;
uniform float uCorner, uPx, uGain, uHex;
in vec2 vUv;
out vec4 o;
float box(vec2 p, vec2 b, float r) { vec2 q = abs(p) - b + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }
// Distance to the nearest edge of a hexagon cell, in cell units.
float hexEdge(vec2 p) {
  const vec2 s = vec2(1.0, 1.7320508);
  vec2 a = mod(p, s) - s * 0.5, b = mod(p - s * 0.5, s) - s * 0.5;
  vec2 g = dot(a, a) < dot(b, b) ? a : b;
  g = abs(g);
  return 0.5 - max(dot(g, normalize(s)), g.x);
}
void main() {
  vec2 px = gl_FragCoord.xy;
  vec2 p = px - uC;
  float d = box(p, uHalf, uCorner);
  vec2 n = p / uHalf;
  // The room: near black, a touch lighter behind the plate.
  vec3 col = vec3(0.003, 0.0033, 0.0043) * (1.0 + 0.6 * exp(-dot(n, n) * 0.6));
  // The plate casts a soft shadow on the room.
  col *= 1.0 - 0.55 * exp(-max(d, 0.0) / (14.0 * uPx)) * step(0.0, d);
  float frame = 9.0 * uPx;
  if (d < frame) {
    // The frame: matte black metal with one lit edge, top left.
    float t = clamp(-d / frame, 0.0, 1.0);
    vec3 metal = vec3(0.007, 0.0072, 0.008);
    float lit = max(dot(normalize(p + 1e-4), uGlint), 0.0);
    metal += vec3(0.05, 0.048, 0.045) * exp(-abs(d - frame * 0.82) / (1.2 * uPx)) * (0.2 + lit * lit);
    col = d > 0.0 ? metal : col;
  }
  if (d < 0.0) {
    // The glass: dark blue-grey, a little lighter at the centre.
    vec3 glass = vec3(0.0052, 0.006, 0.0088) * (1.15 - 0.3 * dot(n, n));
    // The fibre bundle shows as a faint hexagon grid, as on real intensifiers.
    float e = hexEdge(px / uHex);
    float gain = 1.0 - 0.16 * exp(-e / 0.035);
    glass *= 1.0 - 0.18 * exp(-e / 0.02);
    vec3 acc = texture(uPlate, vUv).rgb * gain;
    // Each count is raw energy; a soft curve keeps dense bands from clipping.
    // The curve acts on the brightest channel, so the hue holds.
    float m = max(max(acc.r, acc.g), max(acc.b, 1e-5));
    vec3 dots = acc * ((1.0 - exp(-m * uGain)) / m);
    col = glass + dots * 0.78;
    col += texture(uFlash, vUv).rgb;
    // The room light lies as a broad sheen on the glass.
    vec2 q = (n - uGlint * 0.55) * vec2(1.0, 1.5);
    col += vec3(0.95, 0.97, 1.0) * 0.012 * exp(-dot(q, q) * 2.2);
    // The bevel: a thin bright line inside the edge, brightest toward the light.
    float lit = max(dot(normalize(p + 1e-4), uGlint), 0.0);
    col += vec3(0.09, 0.09, 0.1) * exp(-abs(d + 1.5 * uPx) / (0.9 * uPx)) * (0.15 + 0.85 * pow(lit, 3.0));
    col *= 1.0 - 0.5 * exp(d / (3.0 * uPx));
  }
  o = vec4(col, 1.0);
}`;

// The grade: bloom, filmic curve, vignette, grain.
const FINAL = `${HEAD}
in vec2 vUv;
out vec4 o;
uniform sampler2D uHdr, uBloom;
uniform float uFrame, uBloomK;
float hash(vec2 p) { vec3 q = fract(p.xyx * 0.1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
vec3 film(vec3 x) { return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0); }
void main() {
  vec2 v = vUv - 0.5;
  vec3 c = texture(uHdr, vUv).rgb + texture(uBloom, vUv).rgb * uBloomK;
  c = film(c);
  c *= 1.0 - 0.4 * dot(v, v);
  c = pow(c, vec3(1.0 / 2.2));
  c += (hash(gl_FragCoord.xy + uFrame * 17.3) - 0.5) * 0.012;
  o = vec4(c, 1.0);
}`;

// Instance data: x, y in device pixels, sigma in pixels, energy, then rgb and a spare.
export const DOT_FLOATS = 8;
const MAX_INST = 65536;

export async function makePlate(gl) {
  if (!gl.getExtension('EXT_color_buffer_float') && !gl.getExtension('EXT_color_buffer_half_float')) throw new Error('no float targets');
  const P = await linked(gl, {
    decay: program(gl, TRI_VS, DECAY),
    dot: program(gl, DOT_VS, DOT_FS, ['aCorner', 'aDot', 'aCol']),
    compose: program(gl, TRI_VS, COMPOSE),
    final: program(gl, TRI_VS, FINAL),
  });
  const empty = gl.createVertexArray();
  const bloom = bloomChain(gl, { max: 5 });

  // The dot quad: one corner buffer, one instance buffer.
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  const instBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, instBuf);
  gl.bufferData(gl.ARRAY_BUFFER, MAX_INST * DOT_FLOATS * 4, gl.DYNAMIC_DRAW);
  gl.enableVertexAttribArray(1);
  gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 32, 0);
  gl.vertexAttribDivisor(1, 1);
  gl.enableVertexAttribArray(2);
  gl.vertexAttribPointer(2, 4, gl.FLOAT, false, 32, 16);
  gl.vertexAttribDivisor(2, 1);
  gl.bindVertexArray(null);

  let plate = null, flash = null, flash2 = null, hdr = null, W = 0, H = 0;
  const clearT = t => { gl.bindFramebuffer(gl.FRAMEBUFFER, t.fb); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); };

  function resize(w, h) {
    W = Math.max(2, w); H = Math.max(2, h);
    gl.canvas.width = W; gl.canvas.height = H;
    [plate, flash, flash2, hdr].forEach(t => free(gl, t));
    plate = target(gl, W, H, { clear: true, check: true });
    flash = target(gl, W, H, { clear: true });
    flash2 = target(gl, W, H, { clear: true });
    hdr = target(gl, W, H);
  }

  // Adds dots into one layer. data holds count instances of DOT_FLOATS.
  function splat(layer, data, count) {
    if (!count) return;
    const dst = layer === 'plate' ? plate : flash;
    gl.bindFramebuffer(gl.FRAMEBUFFER, dst.fb);
    gl.viewport(0, 0, W, H);
    gl.useProgram(P.dot.p);
    gl.uniform2f(P.dot.u.uRes, W, H);
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, instBuf);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);
    for (let i = 0; i < count; i += MAX_INST) {
      const n = Math.min(MAX_INST, count - i);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, data, i * DOT_FLOATS, n * DOT_FLOATS);
      gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, n);
    }
    gl.disable(gl.BLEND);
    gl.bindVertexArray(null);
  }

  // Fades the flash layer by exp(-dt / tau).
  function decay(dt, tau) {
    gl.useProgram(P.decay.p);
    bind(gl, P.decay, 'uSrc', 0, flash);
    gl.uniform1f(P.decay.u.uK, Math.exp(-dt / tau));
    gl.uniform1f(P.decay.u.uEps, 0.02 * dt);
    tri(gl, flash2, empty);
    [flash, flash2] = [flash2, flash];
  }

  function clear(layer = 'all') {
    if (layer !== 'flash') clearT(plate);
    clearT(flash); clearT(flash2);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  // view: plate centre, half size, corner and pixel size in device pixels.
  function frame(view, { frameNo = 0, bloomLevels = 5, gain = 1.4 } = {}) {
    if (!hdr) return;
    const c = P.compose;
    gl.disable(gl.BLEND);
    gl.useProgram(c.p);
    bind(gl, c, 'uPlate', 0, plate);
    bind(gl, c, 'uFlash', 1, flash);
    gl.uniform2f(c.u.uRes, W, H);
    gl.uniform2f(c.u.uC, view.cx, view.cy);
    gl.uniform2f(c.u.uHalf, view.hw, view.hh);
    gl.uniform1f(c.u.uCorner, view.corner);
    gl.uniform1f(c.u.uPx, view.px);
    gl.uniform1f(c.u.uGain, gain);
    gl.uniform1f(c.u.uHex, view.hex);
    gl.uniform2f(c.u.uGlint, view.gx, view.gy);
    tri(gl, hdr, empty);
    const bt = bloom.render(hdr.tex, W, H, { threshold: 0.55, cap: 8, levels: bloomLevels });
    const f = P.final;
    gl.useProgram(f.p);
    bind(gl, f, 'uHdr', 0, hdr);
    bind(gl, f, 'uBloom', 1, bt);
    gl.uniform1f(f.u.uBloomK, 0.3);
    gl.uniform1f(f.u.uFrame, frameNo % 64);
    tri(gl, null, empty);
  }

  return { resize, splat, decay, clear, frame };
}
