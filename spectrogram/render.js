// Spectrogram renderer: raw WebGL2.
// The ink pass reads the paper ring by age; bloom and the grade follow.
import { TRI_VS, program, linked, target, free, bind, tri } from '../shared/gl.js';
import { bloomChain } from '../shared/glow.js';
import { M, N } from './paper.js';

const HEAD = `#version 300 es
precision highp float;
precision highp sampler2D;
`;

// The ink: old lines blur, lift, sway, cool and fade.
const INK = `${HEAD}
in vec2 vUv;
out vec4 o;
uniform sampler2D uRing;
uniform float uHead, uHeadX, uColPx, uY0, uY1, uTrail, uVis, uCalm, uOct;
uniform vec4 uPen[8];
uniform vec3 uPenC[8];
uniform int uPens;
uniform vec2 uRes;
float hash(vec2 p) { return fract(sin(dot(p, vec2(41.31, 289.17))) * 43758.5453); }
// Rows past the ring's ends fade out, so the edge row never smears.
vec4 ring(float c, float r, float lod) {
  float keep = smoothstep(-6.0, 2.0, r) * (1.0 - smoothstep(${M}.0 - 2.0, ${M}.0 + 6.0, r));
  return textureLod(uRing, vec2(r / ${M}.0, (c + 0.5) / ${N}.0), lod) * keep;
}
void main() {
  vec2 px = gl_FragCoord.xy;
  float row0 = (px.y - uY0) / (uY1 - uY0) * ${M}.0;
  float ageC = (uHeadX - px.x) / uColPx;
  // The ground: deep blue-black, a little lighter low down.
  vec3 col = mix(vec3(0.010, 0.011, 0.024), vec3(0.003, 0.004, 0.010), vUv.y);
  // A faint line at each C, like a ruled stave.
  float oct = fract(row0 / uOct + 0.5) - 0.5;
  float rule = exp(-pow(oct * uOct * (uY1 - uY0) / ${M}.0 / 0.9, 2.0)) * step(0.0, row0) * step(row0, ${M}.0);
  col += vec3(0.005, 0.007, 0.016) * rule;
  if (ageC >= 0.0) {
    float c = uHead - ageC;
    float a = ageC / uTrail;
    // Smoke: the line lifts and sways as it ages; calm keeps it still.
    float k = (1.0 - uCalm) * a * a;
    float r = row0 - 18.0 * k - 9.0 * k * sin(c * 0.011 + row0 * 0.017) * sin(c * 0.0047 - row0 * 0.009 + 1.7);
    float lod = log2(1.0 + 10.0 * a * a + a);
    vec4 s = ring(c, r, lod);
    // Two side taps round the blur, so mips never show as blocks.
    float sp = exp2(lod) * 0.7;
    s = s * 0.5 + 0.25 * (ring(c - sp, r + sp, lod) + ring(c + sp, r - sp, lod));
    vec3 ink = s.rgb;
    float lum = s.a;
    // Fresh ink burns white; age cools it toward indigo.
    ink += vec3(0.85, 0.82, 0.78) * lum * 0.55 * exp(-ageC / 14.0);
    vec3 cool = vec3(0.16, 0.13, 0.55) * lum;
    ink = mix(ink, cool, smoothstep(0.15, 1.1, a) * 0.85);
    float fade = exp(-1.5 * a * a - 0.6 * a) * (1.0 - smoothstep(uVis - 80.0, uVis, ageC));
    col += ink * fade;
    // The noise floor rides the paper.
    float n = hash(vec2(floor(c), floor(row0 * 0.5)));
    col += vec3(0.010, 0.012, 0.026) * n * n * fade * step(0.0, row0) * step(row0, ${M}.0);
  } else {
    // Ahead of the pen the live partials throw light to the right.
    float d = -ageC * uColPx;
    vec4 s = ring(uHead - 1.0, row0, 0.0) * 0.6 + ring(uHead - 1.0, row0, 2.0) * 0.4;
    col += s.rgb * (0.45 * exp(-d / (46.0 * uColPx)) + 0.06 * exp(-d / (200.0 * uColPx)));
  }
  // The slit: a thin cold seam at the pen.
  float dx = abs(px.x - uHeadX) / uColPx;
  col += vec3(0.05, 0.07, 0.13) * exp(-dx * 1.2) + vec3(0.012, 0.016, 0.03) * exp(-dx * 0.08);
  // A bead of light where each voice writes.
  for (int i = 0; i < 8; i++) {
    if (i >= uPens) break;
    vec2 d = vec2((px.x - uHeadX) / uColPx, (row0 - uPen[i].x) * 1.4);
    float r = length(d);
    col += uPenC[i] * uPen[i].y * (2.2 * exp(-r * 0.55) + 0.25 * exp(-r * 0.06));
  }
  o = vec4(col, 1.0);
}`;

// The grade: filmic curve, bloom, a slight fringe, vignette and grain.
const FINAL = `${HEAD}
in vec2 vUv;
out vec4 o;
uniform sampler2D uHdr, uBloom;
uniform float uFrame, uBloomK;
float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
vec3 film(vec3 x) {
  x *= 0.95;
  return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
}
void main() {
  vec2 v = vUv - 0.5;
  // The lens spreads red and blue a hair apart toward the edge.
  vec2 f = v * dot(v, v) * 0.006;
  vec3 c;
  c.r = texture(uHdr, vUv - f).r;
  c.g = texture(uHdr, vUv).g;
  c.b = texture(uHdr, vUv + f).b;
  c += texture(uBloom, vUv).rgb * uBloomK;
  c = film(c);
  c *= 1.0 - 0.5 * dot(v, v);
  c = pow(c, vec3(1.0 / 2.2));
  c += (hash(gl_FragCoord.xy + uFrame * 17.3) - 0.5) * 0.018;
  o = vec4(c, 1.0);
}`;

export async function makeRender(gl) {
  if (!gl.getExtension('EXT_color_buffer_float')) throw new Error('no float targets');
  const P = await linked(gl, { ink: program(gl, TRI_VS, INK), final: program(gl, TRI_VS, FINAL) });
  const vao = gl.createVertexArray();
  const bloom = bloomChain(gl, { max: 5 });
  // The ring: pitch across, time down, with mips for the smoke.
  const levels = Math.floor(Math.log2(Math.max(M, N))) + 1;
  const ringTex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, ringTex);
  gl.texStorage2D(gl.TEXTURE_2D, levels, gl.RGBA16F, M, N);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
  const zero = new Float32Array(M * 64 * 4);
  for (let y = 0; y < N; y += 64) gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, y, M, 64, gl.RGBA, gl.FLOAT, zero);
  gl.generateMipmap(gl.TEXTURE_2D);

  let hdr = null, W = 0, H = 0;
  const pen = new Float32Array(32), penC = new Float32Array(24);

  function resize(w, h) {
    W = Math.max(2, w); H = Math.max(2, h);
    gl.canvas.width = W; gl.canvas.height = H;
    free(gl, hdr);
    hdr = target(gl, W, H);
  }

  // Uploads the columns the paper wrote, then rebuilds the mips.
  function upload(paper) {
    if (!paper.dirty) return;
    gl.bindTexture(gl.TEXTURE_2D, ringTex);
    paper.drain((at, n, data) => gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, at, M, n, gl.RGBA, gl.FLOAT, data));
    gl.generateMipmap(gl.TEXTURE_2D);
    paper.dirty = false;
  }

  // view: headX, colPx, y0, y1 in device pixels from the foot; trail and vis in columns.
  function frame(paper, view, pens, { frameNo = 0, calm = false, bloomLevels = 5 } = {}) {
    if (!hdr) return;
    upload(paper);
    const p = P.ink;
    gl.disable(gl.BLEND);
    gl.useProgram(p.p);
    bind(gl, p, 'uRing', 0, ringTex);
    gl.uniform1f(p.u.uHead, paper.head);
    gl.uniform1f(p.u.uHeadX, view.headX);
    gl.uniform1f(p.u.uColPx, view.colPx);
    gl.uniform1f(p.u.uY0, view.y0);
    gl.uniform1f(p.u.uY1, view.y1);
    gl.uniform1f(p.u.uTrail, view.trail);
    gl.uniform1f(p.u.uVis, view.vis);
    gl.uniform1f(p.u.uCalm, calm ? 1 : 0);
    gl.uniform1f(p.u.uOct, view.oct);
    gl.uniform2f(p.u.uRes, W, H);
    const n = Math.min(8, pens.length);
    for (let i = 0; i < n; i++) {
      pen[i * 4] = pens[i].row; pen[i * 4 + 1] = pens[i].lvl;
      penC.set(pens[i].ink, i * 3);
    }
    gl.uniform4fv(p.u.uPen, pen);
    gl.uniform3fv(p.u.uPenC, penC);
    gl.uniform1i(p.u.uPens, n);
    tri(gl, hdr, vao);
    const bt = bloom.render(hdr.tex, W, H, { threshold: 0.32, cap: 8, levels: bloomLevels });
    const f = P.final;
    gl.useProgram(f.p);
    bind(gl, f, 'uHdr', 0, hdr);
    bind(gl, f, 'uBloom', 1, bt);
    gl.uniform1f(f.u.uBloomK, 0.95);
    gl.uniform1f(f.u.uFrame, calm ? 0 : frameNo % 64);
    tri(gl, null, vao);
  }

  // Empties the ring at once: the first frame of a reload.
  function wipe() {
    gl.bindTexture(gl.TEXTURE_2D, ringTex);
    for (let y = 0; y < N; y += 64) gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, y, M, 64, gl.RGBA, gl.FLOAT, zero);
    gl.generateMipmap(gl.TEXTURE_2D);
  }

  return { resize, frame, wipe };
}
