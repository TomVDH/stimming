// Pi walk renderer: raw WebGL2.
// Each step is one instanced line of light; lines add in a float target.
// Bloom and a grade follow; the head is a light in the grade.
import { program, linked, target, free, bind, tri, TRI_VS } from '../shared/gl.js';
import { bloomChain } from '../shared/glow.js';

const HEAD = `#version 300 es
precision highp float;
`;

// One step: a quad from its start to its end, as wide as the glow.
// The colour comes from the ramp by the step's place in the walk.
const STEP_VS = `#version 300 es
in vec2 aCorner;
in vec2 aP0;
in vec2 aP1;
uniform vec2 uRes, uC;
uniform vec3 uView;
uniform float uN, uW, uE, uHeat, uHeatLen, uSweep, uSweepE, uTotal;
uniform sampler2D uRamp;
out float vX;
flat out vec3 vCol;
void main() {
  float i = float(gl_InstanceID);
  // The head step is drawn only as far as the walk has gone.
  vec2 p1 = mix(aP0, aP1, clamp(uN - i, 0.0, 1.0));
  vec2 A = uC + (aP0 - uView.xy) * uView.z;
  vec2 B = uC + (p1 - uView.xy) * uView.z;
  vec2 d = B - A;
  float L = length(d);
  vec2 t = L > 1e-4 ? d / L : vec2(1.0, 0.0);
  vec2 n = vec2(-t.y, t.x);
  float pad = uW * 3.2;
  vec2 p = mix(A, B, aCorner.x * 0.5 + 0.5) + n * aCorner.y * pad;
  vX = aCorner.y * pad / uW;
  float u = i / max(uN, 1.0);
  vec3 col = texture(uRamp, vec2(u * 0.996 + 0.002, 0.5)).rgb * uE;
  // The newest steps burn hot and cool into the ramp.
  float age = max(uN - i - 1.0, 0.0);
  col += vec3(1.0, 0.9, 0.78) * uHeat * exp(-age / uHeatLen);
  // The end sweep: a band of light runs from the first step to the last.
  float s = (i / uTotal - uSweep) / 0.03;
  col += mix(vec3(1.0), col / max(uE, 1e-4), 0.5) * uSweepE * exp(-s * s);
  vCol = col;
  gl_Position = vec4(p / uRes * 2.0 - 1.0, 0.0, 1.0);
}`;
const STEP_FS = `${HEAD}
in float vX;
flat in vec3 vCol;
out vec4 o;
void main() {
  o = vec4(vCol * exp(-0.5 * vX * vX), 1.0);
}`;

// The grade: the dark room, the head's light, bloom, filmic curve, vignette, grain.
const FINAL = `${HEAD}
in vec2 vUv;
out vec4 o;
uniform sampler2D uHdr, uBloom;
uniform vec4 uHead;
uniform vec3 uHeadCol;
uniform float uFrame, uBloomK;
float hash(vec2 p) { vec3 q = fract(p.xyx * 0.1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
vec3 film(vec3 x) { return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0); }
void main() {
  vec2 v = vUv - 0.5;
  vec3 c = texture(uHdr, vUv).rgb + texture(uBloom, vUv).rgb * uBloomK;
  // The room: near black, a cool haze toward the middle.
  c += vec3(0.0040, 0.0046, 0.0070) * (1.0 - 1.4 * dot(v, v));
  // The head: a white-hot core, a warm skirt and a wide faint glow.
  vec2 q = (gl_FragCoord.xy - uHead.xy) / uHead.z;
  float r2 = dot(q, q);
  c += vec3(1.0, 0.95, 0.88) * uHead.w * 2.6 * exp(-r2 * 1.4);
  c += uHeadCol * uHead.w * (0.55 * exp(-r2 * 0.12) + 0.05 / (1.0 + r2 * 0.02));
  // Dense knots keep some of their hue: part of the curve acts on the brightest channel.
  float m = max(c.r, max(c.g, c.b));
  c = mix(film(c), c * film(vec3(m)).r / max(m, 1e-4), 0.55);
  c *= 1.0 - 0.42 * dot(v, v);
  c = pow(c, vec3(1.0 / 2.2));
  c += (hash(gl_FragCoord.xy + uFrame * 17.3) - 0.5) * 0.012;
  o = vec4(c, 1.0);
}`;

export async function makeRenderer(gl) {
  const P = await linked(gl, {
    step: program(gl, STEP_VS, STEP_FS, ['aCorner', 'aP0', 'aP1']),
    final: program(gl, TRI_VS, FINAL),
  });
  const empty = gl.createVertexArray();
  const bloom = bloomChain(gl, { max: 6 });

  // The ramp: a small float texture, sampled by step.
  const ramp = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, ramp);
  for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
  const rampTex = { tex: ramp };

  // Steps: a corner quad, and the walk's points read twice, one point apart.
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  const pts = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, pts);
  for (let i = 0; i < 2; i++) {
    gl.enableVertexAttribArray(1 + i);
    gl.vertexAttribPointer(1 + i, 2, gl.FLOAT, false, 8, i * 8);
    gl.vertexAttribDivisor(1 + i, 1);
  }
  gl.bindVertexArray(null);
  let steps = 0;

  let hdr = null, W = 0, H = 0;
  function resize(w, h) {
    W = Math.max(2, w); H = Math.max(2, h);
    gl.canvas.width = W; gl.canvas.height = H;
    free(gl, hdr);
    hdr = target(gl, W, H, { clear: true, check: true });
  }

  // colors: n linear RGB triples, start to head.
  function setRamp(colors) {
    const d = new Float32Array(colors.length * 4);
    colors.forEach((c, i) => d.set([c[0], c[1], c[2], 1], i * 4));
    gl.bindTexture(gl.TEXTURE_2D, ramp);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, colors.length, 1, 0, gl.RGBA, gl.FLOAT, d);
  }

  // points: x, y per point of the walk; a walk of n steps has n + 1.
  function setWalk(points) {
    gl.bindBuffer(gl.ARRAY_BUFFER, pts);
    gl.bufferData(gl.ARRAY_BUFFER, points, gl.STATIC_DRAW);
    steps = points.length / 2 - 1;
  }

  // Draws the walk. o: n steps drawn, view, line width and light levels.
  function draw(o) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, hdr.fb);
    gl.viewport(0, 0, W, H);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    const count = Math.min(steps, Math.ceil(o.n));
    if (count > 0) {
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE);
      const s = P.step;
      gl.useProgram(s.p);
      gl.uniform2f(s.u.uRes, W, H);
      gl.uniform2f(s.u.uC, o.cx, o.cy);
      gl.uniform3f(s.u.uView, o.vx, o.vy, o.scale);
      gl.uniform1f(s.u.uN, o.n);
      gl.uniform1f(s.u.uW, o.w);
      gl.uniform1f(s.u.uE, o.e);
      gl.uniform1f(s.u.uHeat, o.heat);
      gl.uniform1f(s.u.uHeatLen, o.heatLen);
      gl.uniform1f(s.u.uSweep, o.sweep);
      gl.uniform1f(s.u.uSweepE, o.sweepE);
      gl.uniform1f(s.u.uTotal, Math.max(1, o.total));
      bind(gl, s, 'uRamp', 0, rampTex);
      gl.bindVertexArray(vao);
      gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, count);
      gl.disable(gl.BLEND);
    }
    gl.bindVertexArray(null);
    const bt = bloom.render(hdr.tex, W, H, { threshold: 0.6, cap: 6, levels: o.bloomLevels });
    const f = P.final;
    gl.useProgram(f.p);
    bind(gl, f, 'uHdr', 0, hdr);
    bind(gl, f, 'uBloom', 1, bt);
    gl.uniform4f(f.u.uHead, o.hx, o.hy, o.hr, o.hl);
    gl.uniform3f(f.u.uHeadCol, o.hc[0], o.hc[1], o.hc[2]);
    gl.uniform1f(f.u.uBloomK, 0.45);
    gl.uniform1f(f.u.uFrame, o.frameNo % 64);
    tri(gl, null, empty);
  }

  return { resize, setRamp, setWalk, draw };
}
