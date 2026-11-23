// Chromatography sim: water and four dyes wick through a round filter paper.
// Raw WebGL2, RGBA32F, one grid of N x N cells over the paper's square.
// State A: water W, wet memory, permeability K, paper impurity.
// State B: four dye masses that move with the water: violet, magenta, cyan, yellow.
// State C: the same dyes, held by the fibres where the water left them.
import { program, linked, TRI_VS } from '../shared/gl.js';

export const N = 256;
// The paper's radius in cells; the square holds the circle with a margin.
export const R_CELLS = 125;
export const MAX_BEADS = 8;
// Dye mobility: the fraction of the water's speed each dye keeps.
export const RF = [0.16, 0.38, 0.6, 0.83];

const STEP_FS = `#version 300 es
precision highp float;
layout(location = 0) out vec4 oA;
layout(location = 1) out vec4 oB;
layout(location = 2) out vec4 oC;
uniform highp sampler2D uA, uB, uC;
uniform float uKf, uEvap, uDd, uStick;
uniform vec4 uRf;
uniform vec4 uBead[${MAX_BEADS}];
uniform int uBeadN;

// Capillary potential: water moves from high to low P.
// The cube gives a sharp front that slows as it grows.
float P(float w) { return w * w * w; }

void main() {
  ivec2 c = ivec2(gl_FragCoord.xy);
  vec4 a = texelFetch(uA, c, 0), b = texelFetch(uB, c, 0), h = texelFetch(uC, c, 0);
  float K = a.z;
  if (K <= 0.0) { oA = a; oB = b; oC = h; return; }
  float wi = a.x, pi = P(wi);
  float ci = 1.0 / max(wi, 1e-4);
  float dW = 0.0, dImp = 0.0, flow = 0.0;
  vec4 dD = vec4(0.0);
  for (int k = 0; k < 8; k++) {
    ivec2 o = k == 0 ? ivec2(1, 0) : k == 1 ? ivec2(-1, 0) : k == 2 ? ivec2(0, 1) : k == 3 ? ivec2(0, -1)
            : k == 4 ? ivec2(1, 1) : k == 5 ? ivec2(-1, 1) : k == 6 ? ivec2(1, -1) : ivec2(-1, -1);
    float wt = k < 4 ? 1.0 : 0.5;
    vec4 an = texelFetch(uA, c + o, 0);
    if (an.z <= 0.0) continue;
    vec4 bn = texelFetch(uB, c + o, 0);
    float kij = wt * uKf * sqrt(K * an.z);
    // Inflow from the neighbour is positive.
    float F = kij * (P(an.x) - pi);
    dW += F;
    flow += abs(F);
    // Upwind: the dye goes with the water from the side it leaves.
    bool inF = F > 0.0;
    float wu = inF ? an.x : wi;
    vec4 cu = inF ? bn / max(an.x, 1e-4) : b * ci;
    float iu = inF ? an.w / max(an.x, 1e-4) : a.w * ci;
    // Dye lags in the thin film at the front.
    float mob = smoothstep(0.02, 0.16, wu);
    dD += F * mob * uRf * cu;
    dImp += F * mob * iu;
    // A small diffusion in the water softens each band.
    float wm = min(wi, an.x);
    dD += uDd * wt * wm * wm * (bn / max(an.x, 1e-4) - b * ci);
  }
  float w = max(wi + dW, 0.0);
  // Beads hold the paper under them full of water.
  for (int k = 0; k < ${MAX_BEADS}; k++) {
    if (k >= uBeadN) break;
    vec4 q = uBead[k];
    if (q.w > 0.0 && distance(vec2(c) + 0.5, q.xy) < q.z) w = max(w, q.w);
  }
  // Thin paper dries first, so the drying edge draws water and dye outward.
  w = max(0.0, w - uEvap * (0.55 + 0.45 * (1.0 - w)));
  oA = vec4(w, max(a.y, w), K, max(a.w + dImp, 0.0));
  // Flowing water leaves some dye on the fibres: the bands trail.
  // Slow dyes cling harder.
  vec4 nb = max(b + dD, vec4(0.0));
  vec4 dep = nb * uStick * min(1.0, flow * 40.0) * (1.25 - uRf) * smoothstep(0.04, 0.3, w);
  oB = nb - dep;
  oC = h + dep;
}`;

// A dot of marker ink: dye and a little solvent in a soft disc.
const SPLAT_FS = `#version 300 es
precision highp float;
layout(location = 0) out vec4 oA;
layout(location = 1) out vec4 oB;
layout(location = 2) out vec4 oC;
uniform highp sampler2D uA, uB, uC;
uniform vec3 uAt;
uniform vec4 uInk;
uniform float uWet;
void main() {
  ivec2 c = ivec2(gl_FragCoord.xy);
  vec4 a = texelFetch(uA, c, 0), b = texelFetch(uB, c, 0);
  float d = distance(vec2(c) + 0.5, uAt.xy) / uAt.z;
  float g = a.z > 0.0 ? exp(-d * d * 2.2) : 0.0;
  oA = vec4(min(1.0, a.x + uWet * g), max(a.y, a.x), a.z, a.w);
  oB = b + uInk * g;
  oC = texelFetch(uC, c, 0);
}`;

// Copies a fresh sheet from the CPU arrays.
export function makeSim(gl) {
  const ext = gl.getExtension('EXT_color_buffer_float');
  if (!ext) throw new Error('no float targets');
  const mk = () => {
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA32F, N, N);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return tex;
  };
  // Two states, each three textures on one framebuffer.
  const st = [0, 1].map(() => {
    const A = mk(), B = mk(), C = mk(), fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, A, 0);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT1, gl.TEXTURE_2D, B, 0);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT2, gl.TEXTURE_2D, C, 0);
    gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1, gl.COLOR_ATTACHMENT2]);
    return { A, B, C, fb };
  });
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  const vao = gl.createVertexArray();
  let cur = 0, P = null;
  const beads = new Float32Array(MAX_BEADS * 4);

  async function link() {
    P = await linked(gl, { step: program(gl, TRI_VS, STEP_FS), splat: program(gl, TRI_VS, SPLAT_FS) });
  }
  function bindState(p) {
    const s = st[cur];
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, s.A); gl.uniform1i(p.u.uA, 0);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, s.B); gl.uniform1i(p.u.uB, 1);
    gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, s.C); gl.uniform1i(p.u.uC, 2);
  }
  function draw() {
    gl.bindFramebuffer(gl.FRAMEBUFFER, st[1 - cur].fb);
    gl.viewport(0, 0, N, N);
    gl.bindVertexArray(vao);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    cur = 1 - cur;
  }
  // Loads a clean sheet: dry paper with its permeability and impurity.
  function reset(K) {
    const a = new Float32Array(N * N * 4), b = new Float32Array(N * N * 4);
    for (let i = 0; i < N * N; i++) { a[i * 4 + 2] = K[i]; a[i * 4 + 3] = K[i] > 0 ? 0.035 : 0; }
    for (const s of st) {
      gl.bindTexture(gl.TEXTURE_2D, s.A); gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, N, N, gl.RGBA, gl.FLOAT, a);
      gl.bindTexture(gl.TEXTURE_2D, s.B); gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, N, N, gl.RGBA, gl.FLOAT, b);
      gl.bindTexture(gl.TEXTURE_2D, s.C); gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, N, N, gl.RGBA, gl.FLOAT, b);
    }
  }
  function splat(x, y, r, ink, wet) {
    const p = P.splat;
    gl.useProgram(p.p);
    bindState(p);
    gl.uniform3f(p.u.uAt, x, y, r);
    gl.uniform4fv(p.u.uInk, ink);
    gl.uniform1f(p.u.uWet, wet);
    draw();
  }
  // Runs n steps. list holds beads as [x, y, radius, level].
  function step(n, list, { evap = 2e-5, kf = 0.05, dd = 0.0005, stick = 1.2e-4 } = {}) {
    if (n <= 0) return;
    const p = P.step;
    gl.useProgram(p.p);
    beads.fill(0);
    const bn = Math.min(MAX_BEADS, list.length);
    for (let i = 0; i < bn; i++) beads.set(list[i], i * 4);
    gl.uniform4fv(p.u.uBead, beads);
    gl.uniform1i(p.u.uBeadN, bn);
    gl.uniform1f(p.u.uKf, kf);
    gl.uniform1f(p.u.uEvap, evap);
    gl.uniform1f(p.u.uDd, dd);
    gl.uniform1f(p.u.uStick, stick);
    gl.uniform4fv(p.u.uRf, RF);
    for (let i = 0; i < n; i++) { bindState(p); draw(); }
  }
  // Reads the water field back: the wettest cell and the wet cell count.
  // The loop calls it once a second while the paper dries.
  const px = new Float32Array(N * N * 4);
  function sample() {
    gl.bindFramebuffer(gl.FRAMEBUFFER, st[cur].fb);
    gl.readBuffer(gl.COLOR_ATTACHMENT0);
    gl.readPixels(0, 0, N, N, gl.RGBA, gl.FLOAT, px);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    let max = 0, wet = 0;
    for (let i = 0; i < N * N; i++) { const w = px[i * 4]; if (w > max) max = w; if (w > 0.02) wet++; }
    return { max, wet, px };
  }
  // Reads both states along a row, for QA: [W, wet, K, imp, v, m, c, y] per cell.
  function row(y) {
    const a = new Float32Array(N * 4), b = new Float32Array(N * 4);
    gl.bindFramebuffer(gl.FRAMEBUFFER, st[cur].fb);
    gl.readBuffer(gl.COLOR_ATTACHMENT0);
    gl.readPixels(0, y, N, 1, gl.RGBA, gl.FLOAT, a);
    gl.readBuffer(gl.COLOR_ATTACHMENT1);
    gl.readPixels(0, y, N, 1, gl.RGBA, gl.FLOAT, b);
    gl.readBuffer(gl.COLOR_ATTACHMENT0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return Array.from({ length: N }, (_, i) => [...a.slice(i * 4, i * 4 + 4), ...b.slice(i * 4, i * 4 + 4)].map(v => +v.toFixed(3)));
  }
  return {
    link, reset, splat, step, sample, row,
    get A() { return st[cur].A; },
    get B() { return st[cur].B; },
    get C() { return st[cur].C; },
  };
}
