// BZ reaction renderer and sim: raw WebGL2.
// The sim is Barkley's excitable medium on a ping-pong pair of RGBA16F targets.
// The dish pass lights the dye from below; bloom and the grade follow.
import { TRI_VS, program, linked, target, free, bind, tri } from '../shared/gl.js';
import { bloomChain } from '../shared/glow.js';

// The grid spans the dish square; r = 1 is the inner wall.
export const N = 768;
// Barkley constants: a, b, epsilon, space step, time step.
export const MODEL = { a: 0.75, b: 0.02, eps: 0.02, h: 0.55, dt: 0.02 };
export const MAX_PACE = 12, MAX_SEG = 8, MAX_BUB = 40;

const HEAD = `#version 300 es
precision highp float;
precision highp int;
precision highp sampler2D;
`;

/* ---------- Turing kit: ping-pong step (copied from turing/index.html) ---------- */
// One Barkley step. U is the fast front; V is the slow recovery, the oxidised dye.
// W is a stir scar: it blocks the front for a while, so cut ends curl.
// The 3 x 3 Laplacian weights sides 0.2 and corners 0.05.
// A neighbour outside the dish reads the centre cell: no flux through the wall.
const STEP = `${HEAD}
uniform sampler2D uS;
uniform float uDt, uEps, uA, uB, uK, uScar, uWipe;
uniform vec4 uPace[${MAX_PACE}];
uniform int uNP;
uniform vec4 uSeg[${MAX_SEG}];
uniform int uNSeg;
uniform float uSegW;
out vec4 o;
bool inside(ivec2 q) {
  vec2 p = (vec2(q) + 0.5) / ${N}.0 * 2.0 - 1.0;
  return dot(p, p) < 1.0;
}
vec2 c0;
vec2 at(ivec2 q) {
  if (q.x < 0 || q.y < 0 || q.x >= ${N} || q.y >= ${N} || !inside(q)) return c0;
  return texelFetch(uS, q, 0).rg;
}
void main() {
  ivec2 p = ivec2(gl_FragCoord.xy);
  if (!inside(p)) { o = vec4(0.0); return; }
  vec4 s0 = texelFetch(uS, p, 0);
  c0 = s0.rg;
  float w = s0.b;
  float sides = at(p + ivec2(1, 0)).x + at(p - ivec2(1, 0)).x + at(p + ivec2(0, 1)).x + at(p - ivec2(0, 1)).x;
  float corners = at(p + ivec2(1, 1)).x + at(p + ivec2(-1, 1)).x + at(p + ivec2(1, -1)).x + at(p + ivec2(-1, -1)).x;
  float lap = 0.2 * sides + 0.05 * corners - c0.x;
  float u = c0.x, v = c0.y;
  float th = (v + uB) / uA + 1.5 * w;
  float k = uDt / uEps;
  // Below the threshold the step is implicit, so it stays stable.
  u = u < th ? u / (1.0 - k * (1.0 - u) * (u - th)) : u + k * u * (1.0 - u) * (u - th);
  u += uK * lap;
  v += uDt * (c0.x - v);
  w -= uDt * w / 1.6;
  vec2 x = vec2(p) + 0.5;
  // A pacemaker fires only where the dye has recovered.
  for (int i = 0; i < ${MAX_PACE}; i++) {
    if (i >= uNP) break;
    vec4 q = uPace[i];
    if (q.w > 0.5 && length(x - q.xy) < q.z && v < 0.18) u = 1.0;
  }
  // A cut kills the front and leaves a refractory scar.
  for (int i = 0; i < ${MAX_SEG}; i++) {
    if (i >= uNSeg) break;
    vec2 a = uSeg[i].xy, ab = uSeg[i].zw - a;
    float t = clamp(dot(x - a, ab) / max(dot(ab, ab), 1e-6), 0.0, 1.0);
    float d = length(x - a - ab * t);
    float m = 1.0 - smoothstep(uSegW * 0.6, uSegW, d);
    u *= 1.0 - m;
    v = mix(v, max(v, uScar), m);
    w = max(w, m);
  }
  u *= 1.0 - uWipe;
  v *= 1.0 - uWipe;
  w *= 1.0 - uWipe;
  o = vec4(clamp(u, 0.0, 1.0), clamp(v, 0.0, 1.0), clamp(w, 0.0, 1.0), 1.0);
}`;
/* ---------- end Turing kit ---------- */

// The front density: each cell of a 16 x 16 grid counts lit fronts.
const REDUCE = `${HEAD}
uniform sampler2D uS;
out vec4 o;
void main() {
  ivec2 b = ivec2(gl_FragCoord.xy) * ${N / 16};
  float n = 0.0;
  for (int j = 0; j < 8; j++) for (int i = 0; i < 8; i++) {
    n += step(0.5, texelFetch(uS, b + ivec2(i, j) * ${N / 128} + 1, 0).r);
  }
  o = vec4(n / 64.0, 0.0, 0.0, 1.0);
}`;

// The dish: a lightbox, glass, the dye by Beer-Lambert, bubbles and seeds.
const DISH = `${HEAD}
out vec4 o;
uniform sampler2D uS;
uniform vec2 uC;
uniform float uR, uPx;
uniform vec4 uDot[${MAX_PACE}];
uniform int uND;
uniform vec4 uBub[${MAX_BUB}];
uniform int uNB;
uniform vec2 uGlint;
uniform vec3 uKRed, uKOx;
// The lightbox: a warm pool that falls off into the dark room.
vec3 box(float r) {
  float f = 1.0 - smoothstep(1.02, 1.24, r);
  return vec3(1.0, 0.93, 0.83) * (1.3 * f * f + 0.05 * exp(-max(r - 1.0, 0.0) * 3.0));
}
void main() {
  vec2 p = (gl_FragCoord.xy - uC) / uR;
  float r = length(p);
  float px = uPx;
  vec3 col = box(r);
  float wall = 0.04;
  if (r < 1.0) {
    vec3 s = texture(uS, p * 0.5 + 0.5).rgb;
    // The band is the excited front, with a fading oxidised tail behind it.
    float ox = clamp(0.85 * smoothstep(0.2, 0.8, s.x) + 0.55 * smoothstep(0.22, 0.7, s.y), 0.0, 1.0);
    // A seed is a grain of oxidised dye.
    float dotm = 0.0;
    for (int i = 0; i < ${MAX_PACE}; i++) {
      if (i >= uND) break;
      float d = length(p - uDot[i].xy) / uDot[i].z;
      dotm = max(dotm, uDot[i].w * (1.0 - smoothstep(0.6, 1.0, d)));
    }
    // The meniscus climbs the wall, so the dye is deeper there.
    float edge = 1.0 - r;
    float h = 1.0 + 1.5 * exp(-edge / 0.03);
    vec3 k = mix(uKRed, uKOx, ox);
    // The leading edge, freshly oxidised, is almost clear.
    k = mix(k, uKOx * 0.45, smoothstep(0.5, 1.0, s.x) * (1.0 - smoothstep(0.1, 0.55, s.y)) * 0.7);
    k = mix(k, uKOx * 2.4, dotm);
    // A stir scar thins the dye for a moment.
    k *= 1.0 - 0.3 * s.z;
    vec3 T = exp(-h * k);
    col *= T;
    // The meniscus bends the light out; a dark line hugs the wall.
    col *= 1.0 - 0.6 * exp(-edge / 0.008);
    col += vec3(0.3, 0.26, 0.22) * exp(-abs(edge - 0.004) / (1.5 * px));
    // Bubbles: a dark lens rim around a bright core.
    for (int i = 0; i < ${MAX_BUB}; i++) {
      if (i >= uNB) break;
      vec4 b = uBub[i];
      float d = length(p - b.xy) / b.z;
      if (d < 1.3) {
        float aa = px / b.z;
        float body = 1.0 - smoothstep(1.0 - aa, 1.0 + aa, d);
        float rim = smoothstep(0.3, 0.92, d) * body;
        col = mix(col, col * 0.08 + vec3(0.012, 0.008, 0.006), rim * 0.92);
        col += box(r) * vec3(1.0, 0.92, 0.85) * 0.55 * exp(-d * d * 7.0) * body;
      }
    }
  } else if (r < 1.0 + wall) {
    // The glass wall seen end on: grey, with bright inner and outer edges.
    float t = (r - 1.0) / wall;
    col *= 0.5 + 0.25 * t;
    col += box(r) * 0.6 * exp(-t / 0.06);
    col *= 1.0 - 0.5 * exp(-abs(t - 0.82) / 0.05);
    col += box(r) * 0.35 * exp(-(1.0 - t) / 0.06);
  } else if (r < 1.0 + wall + 0.014) {
    // The foot of the dish rounds off just past the wall.
    float t = (r - 1.0 - wall) / 0.014;
    col *= 0.7 + 0.3 * t;
  }
  // One soft room light glints on the rim, top left.
  float ang = dot(normalize(p + 1e-5), normalize(uGlint));
  float rimBand = exp(-pow((r - 1.0 - wall * 0.45) / (wall * 0.22), 2.0));
  col += vec3(1.0, 0.97, 0.92) * rimBand * pow(max(ang, 0.0), 40.0) * 1.6;
  // The same light lies on the liquid as a broad, faint sheen.
  vec2 q = (p - uGlint * 0.55) * vec2(1.0, 1.7);
  col += vec3(1.0, 0.97, 0.92) * 0.035 * exp(-dot(q, q) * 7.0) * step(r, 1.0);
  o = vec4(col, 1.0);
}`;

// The grade: filmic curve, bloom, vignette and grain.
const FINAL = `${HEAD}
in vec2 vUv;
out vec4 o;
uniform sampler2D uHdr, uBloom;
uniform float uFrame, uBloomK;
float hash(vec2 p) { vec3 q = fract(p.xyx * 0.1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
vec3 film(vec3 x) {
  return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
}
void main() {
  vec2 v = vUv - 0.5;
  vec3 c = texture(uHdr, vUv).rgb;
  c += texture(uBloom, vUv).rgb * uBloomK;
  c = film(c * 0.92);
  c *= 1.0 - 0.45 * dot(v, v);
  c = pow(c, vec3(1.0 / 2.2));
  c += (hash(gl_FragCoord.xy + uFrame * 17.3) - 0.5) * 0.014;
  o = vec4(c, 1.0);
}`;

export async function makeSim(gl) {
  if (!gl.getExtension('EXT_color_buffer_float') && !gl.getExtension('EXT_color_buffer_half_float')) throw new Error('no float targets');
  const P = await linked(gl, {
    step: program(gl, TRI_VS, STEP),
    reduce: program(gl, TRI_VS, REDUCE),
    dish: program(gl, TRI_VS, DISH),
    final: program(gl, TRI_VS, FINAL),
  });
  const vao = gl.createVertexArray();
  const bloom = bloomChain(gl, { max: 5 });
  let A = target(gl, N, N, { clear: true, check: true });
  let B = target(gl, N, N, { clear: true, check: true });
  const R = target(gl, 16, 16, { format: gl.RGBA8, filter: gl.NEAREST, clear: true });
  const readBuf = new Uint8Array(16 * 16 * 4);
  let hdr = null, W = 0, H = 0;
  const pace = new Float32Array(MAX_PACE * 4), seg = new Float32Array(MAX_SEG * 4);
  const dots = new Float32Array(MAX_PACE * 4), bubs = new Float32Array(MAX_BUB * 4);
  const m = MODEL;
  const kLap = (m.dt * 10) / (3 * m.h * m.h);

  function resize(w, h) {
    W = Math.max(2, w); H = Math.max(2, h);
    gl.canvas.width = W; gl.canvas.height = H;
    free(gl, hdr);
    hdr = target(gl, W, H);
  }

  // One sim step. fires: pacemakers as [x, y, r, fire] in cells. cuts: [ax, ay, bx, by] in cells.
  function step(fires, cuts, { segW = 6, scar = 0.8, wipe = 0 } = {}) {
    const p = P.step;
    gl.useProgram(p.p);
    bind(gl, p, 'uS', 0, A);
    gl.uniform1f(p.u.uDt, m.dt);
    gl.uniform1f(p.u.uEps, m.eps);
    gl.uniform1f(p.u.uA, m.a);
    gl.uniform1f(p.u.uB, m.b);
    gl.uniform1f(p.u.uK, kLap);
    gl.uniform1f(p.u.uScar, scar);
    gl.uniform1f(p.u.uWipe, wipe);
    gl.uniform1f(p.u.uSegW, segW);
    const np = Math.min(MAX_PACE, fires.length);
    for (let i = 0; i < np; i++) pace.set(fires[i], i * 4);
    gl.uniform4fv(p.u.uPace, pace);
    gl.uniform1i(p.u.uNP, np);
    const ns = Math.min(MAX_SEG, cuts.length);
    for (let i = 0; i < ns; i++) seg.set(cuts[i], i * 4);
    gl.uniform4fv(p.u.uSeg, seg);
    gl.uniform1i(p.u.uNSeg, ns);
    tri(gl, B, vao);
    [A, B] = [B, A];
  }

  // The share of the dish under a lit front, from 0 to 1.
  function density() {
    const p = P.reduce;
    gl.useProgram(p.p);
    bind(gl, p, 'uS', 0, A);
    tri(gl, R, vao);
    gl.readPixels(0, 0, 16, 16, gl.RGBA, gl.UNSIGNED_BYTE, readBuf);
    let n = 0;
    for (let i = 0; i < 256; i++) n += readBuf[i * 4];
    return n / (255 * 256 * 0.785);
  }

  function clear() {
    for (const t of [A, B]) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, t.fb);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  // view: centre and radius in device pixels; dots and bubbles in dish units.
  function frame(view, dotList, bubList, { frameNo = 0, bloomLevels = 5 } = {}) {
    if (!hdr) return;
    const p = P.dish;
    gl.disable(gl.BLEND);
    gl.useProgram(p.p);
    bind(gl, p, 'uS', 0, A);
    gl.uniform2f(p.u.uC, view.cx, view.cy);
    gl.uniform1f(p.u.uR, view.r);
    gl.uniform1f(p.u.uPx, 1 / view.r);
    const nd = Math.min(MAX_PACE, dotList.length);
    for (let i = 0; i < nd; i++) dots.set(dotList[i], i * 4);
    gl.uniform4fv(p.u.uDot, dots);
    gl.uniform1i(p.u.uND, nd);
    const nb = Math.min(MAX_BUB, bubList.length);
    for (let i = 0; i < nb; i++) bubs.set(bubList[i], i * 4);
    gl.uniform4fv(p.u.uBub, bubs);
    gl.uniform1i(p.u.uNB, nb);
    gl.uniform2f(p.u.uGlint, view.gx, view.gy);
    gl.uniform3f(p.u.uKRed, 0.13, 3.1, 3.3);
    gl.uniform3f(p.u.uKOx, 0.48, 0.3, 0.05);
    tri(gl, hdr, vao);
    const bt = bloom.render(hdr.tex, W, H, { threshold: 0.9, cap: 6, levels: bloomLevels });
    const f = P.final;
    gl.useProgram(f.p);
    bind(gl, f, 'uHdr', 0, hdr);
    bind(gl, f, 'uBloom', 1, bt);
    gl.uniform1f(f.u.uBloomK, 0.22);
    gl.uniform1f(f.u.uFrame, frameNo % 64);
    tri(gl, null, vao);
  }

  return { resize, step, frame, clear, density };
}
