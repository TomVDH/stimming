// The mesh: the light that rises from below the Clock's footer.
// It is one small shader: a slow field of noise picks from a run of hues, mixed in OKLab,
// so every blend stays clean. The pointer stirs the field and brightens it.
// It has three looks for Tom to pick from: mesh (the tall flowing glow), horizon (a low band
// with a bright line) and broadcast (soft colour bars under scan lines, as a test card).
// It moves only for a few seconds after the pointer does; then it rests on one frame.
import { TRI_VS, program, linked, tri, onContextLoss } from '../gl.js';

// The canvas is this share of its CSS size: soft light needs few pixels; scan lines need all of them.
const SCALE = { mesh: 0.4, horizon: 0.5, broadcast: 1 };
const MODES = { mesh: 0, horizon: 1, broadcast: 2 };
// The field runs on this long after the last pointer move, in seconds.
const TAIL = 2.6;

const FS = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 o;
uniform vec2 uRes, uPtr;
uniform float uTime, uStir, uMode;
float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vn(vec2 x) {
  vec2 i = floor(x), u = fract(x);
  u = u * u * (3.0 - 2.0 * u);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 x) {
  float s = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) { s += a * vn(x); x = x * 2.03 + 11.7; a *= 0.5; }
  return s / 0.9375;
}
// OKLab to linear sRGB.
vec3 lab2lin(vec3 c) {
  vec3 q = vec3(c.x + 0.3963377774 * c.y + 0.2158037573 * c.z, c.x - 0.1055613458 * c.y - 0.0638541728 * c.z, c.x - 0.0894841775 * c.y - 1.2914855480 * c.z);
  q = q * q * q;
  return vec3(4.0767416621 * q.x - 3.3077115913 * q.y + 0.2309699292 * q.z, -1.2684380046 * q.x + 2.6097574011 * q.y - 0.3413193965 * q.z, -0.0041960863 * q.x - 0.7034186147 * q.y + 1.7076147010 * q.z);
}
// An OKLCH colour as OKLab: lightness, chroma, hue in degrees.
vec3 lch(float l, float c, float h) { return vec3(l, c * cos(radians(h)), c * sin(radians(h))); }
// The run of hues, left to right: magenta, violet, cyan, green, amber, red.
vec3 hues(float x) {
  vec3 lab = mix(lch(0.62, 0.23, 328.0), lch(0.56, 0.19, 292.0), smoothstep(0.0, 0.22, x));
  lab = mix(lab, lch(0.78, 0.14, 205.0), smoothstep(0.2, 0.46, x));
  lab = mix(lab, lch(0.8, 0.16, 150.0), smoothstep(0.44, 0.6, x) * 0.6);
  lab = mix(lab, lch(0.84, 0.16, 84.0), smoothstep(0.58, 0.82, x));
  lab = mix(lab, lch(0.7, 0.2, 28.0), smoothstep(0.82, 1.05, x));
  return pow(max(lab2lin(lab), 0.0), vec3(1.0 / 2.2));
}
// The eight colour bars of the broadcast look: the wordmark's letters, left to right.
vec3 bar(float i) {
  vec3 c = i < 0.5 ? lch(0.72, 0.22, 328.0) : i < 1.5 ? lch(0.68, 0.2, 300.0) : i < 2.5 ? lch(0.74, 0.16, 250.0) : i < 3.5 ? lch(0.82, 0.13, 205.0)
    : i < 4.5 ? lch(0.84, 0.16, 150.0) : i < 5.5 ? lch(0.88, 0.16, 110.0) : i < 6.5 ? lch(0.86, 0.16, 84.0) : lch(0.74, 0.2, 28.0);
  return pow(max(lab2lin(c), 0.0), vec3(1.0 / 2.2));
}
void main() {
  float wide = uRes.x / uRes.y;
  vec2 p = vec2(vUv.x * wide, vUv.y), at = vec2(uPtr.x * wide, uPtr.y);
  float t = uTime * 0.05;
  // The field bends itself, so the light flows and does not slide.
  vec2 w = p * 0.9 + 0.55 * vec2(fbm(p * 0.8 + vec2(t, -t * 0.6)), fbm(p * 0.8 + vec2(-t * 0.7, t) + 4.7));
  // The pointer pushes the field away from itself.
  float near = exp(-dot(p - at, p - at) * 2.2) * uStir;
  w += (p - at) * near * 0.6;
  float f = fbm(w * 1.3 + t), g = fbm(w * 0.7 - t * 0.8 + 9.1);
  vec3 col;
  float a;
  if (uMode < 0.5) {
    // Mesh: the field shifts the place in the run of hues.
    col = hues(vUv.x + (f - 0.5) * 0.7);
    // The light rises from below the edge; the field breaks its top into soft tongues. No edge is hard.
    float rise = smoothstep(0.0, 1.0, (1.0 - vUv.y) + (g - 0.5) * 0.5 - 0.08);
    a = pow(rise, 2.4) * (0.5 + 0.5 * f) * (0.62 + 0.5 * near);
    // The light is a horizon: it is dimmer at the very foot, where the credit line stands.
    a *= mix(0.42, 1.0, smoothstep(0.0, 0.2, vUv.y));
  } else if (uMode < 1.5) {
    // Horizon: a low band of the hues and one bright line in it, as the last light of a day.
    col = hues(vUv.x + (f - 0.5) * 0.3);
    float line = exp(-pow((vUv.y - 0.34 - (g - 0.5) * 0.04) / 0.02, 2.0));
    col = mix(col, vec3(1.0), line * 0.45);
    // The band glows from the foot up to the line, and fades fast above it.
    float below = 1.0 - smoothstep(0.0, 0.36, vUv.y), above = exp(-max(vUv.y - 0.34, 0.0) * 9.0);
    a = (below * 0.55 * above + line * 0.95) * (0.6 + 0.4 * f) * (0.8 + 0.4 * near);
  } else {
    // Broadcast: eight soft colour bars, as a test card, under scan lines and grain.
    float x = vUv.x + 0.003 * sin(vUv.y * 70.0 + uTime * 3.0);
    float k = floor(clamp(x, 0.0, 0.999) * 8.0), e = fract(x * 8.0);
    col = mix(bar(k), bar(min(k + 1.0, 7.0)), smoothstep(0.9, 1.0, e));
    col *= 0.68 + 0.32 * sin(gl_FragCoord.y * 2.0944);
    col += (hash(gl_FragCoord.xy + floor(uTime * 24.0) * 7.0) - 0.5) * 0.12;
    // The bars rise from the foot and fade upward; the one under the pointer is brighter.
    float lit = exp(-pow((vUv.x - uPtr.x) * 8.0, 2.0)) * uStir;
    a = pow(smoothstep(0.8, 0.0, vUv.y), 1.25) * (0.7 + 0.3 * lit);
  }
  o = vec4(col * a, a);
}`;

/**
 * Puts the mesh under a footer and starts it.
 * @param {HTMLElement} credit  The footer; the canvas goes in as its first child.
 * @param {string} [look]  mesh, horizon or broadcast.
 * @returns {Promise<{ look: (name: string) => void } | null>}  Null without WebGL2: the footer keeps its CSS glow.
 */
export async function mesh(credit, look = 'mesh') {
  const canvas = Object.assign(document.createElement('canvas'), { className: 'clock-mesh' });
  canvas.setAttribute('aria-hidden', 'true');
  const gl = canvas.getContext('webgl2', { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false, powerPreference: 'low-power' });
  if (!gl) return null;
  credit.prepend(canvas);

  const still = matchMedia('(prefers-reduced-motion: reduce)');
  // A timer, not a frame: a hidden tab gets no frames.
  const tick = () => new Promise(r => setTimeout(r, 16));
  let P, vao;
  async function build() {
    P = (await linked(gl, { mesh: program(gl, TRI_VS, FS) }, { limit: 500, wait: tick })).mesh;
    vao = gl.createVertexArray();
  }
  await build();

  // The pointer's place in the canvas, 0 to 1 from the left and from the foot; it eases.
  const ptr = { x: 0.5, y: 0.2 }, want = { x: 0.5, y: 0.2 };
  let time = Math.random() * 40, stir = 0, until = 0, raf = 0, last = 0, gone = false;
  function draw() {
    if (gone) return;
    const k = SCALE[look] ?? 0.4, w = Math.max(2, Math.round(canvas.clientWidth * k)), h = Math.max(2, Math.round(canvas.clientHeight * k));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    gl.useProgram(P.p);
    gl.uniform2f(P.u.uRes, w, h);
    gl.uniform2f(P.u.uPtr, ptr.x, ptr.y);
    gl.uniform1f(P.u.uTime, time);
    gl.uniform1f(P.u.uStir, stir);
    gl.uniform1f(P.u.uMode, MODES[look] ?? 0);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    tri(gl, null, vao);
  }
  function frame(now) {
    raf = 0;
    const dt = Math.min((now - last) / 1000, 0.1), awake = now < until;
    last = now;
    // The field slows to a stop: its speed follows how awake it is.
    stir += ((awake ? 1 : 0) - stir) * (1 - Math.exp(-dt * 2.2));
    time += dt * (0.25 + 0.75 * stir);
    ptr.x += (want.x - ptr.x) * (1 - Math.exp(-dt * 4));
    ptr.y += (want.y - ptr.y) * (1 - Math.exp(-dt * 4));
    draw();
    if (awake || stir > 0.01) raf = requestAnimationFrame(frame);
  }
  const wake = () => {
    until = performance.now() + TAIL * 1000;
    if (!raf && !gone) { last = performance.now(); raf = requestAnimationFrame(frame); }
  };
  if (still.matches) draw();
  else {
    addEventListener('pointermove', e => {
      const r = canvas.getBoundingClientRect();
      want.x = (e.clientX - r.left) / r.width;
      want.y = 1 - (e.clientY - r.top) / r.height;
      wake();
    }, { passive: true });
    // It flows for a moment when the page opens, then rests.
    wake();
  }
  new ResizeObserver(draw).observe(canvas);
  onContextLoss(canvas, {
    lost() { gone = true; cancelAnimationFrame(raf); raf = 0; },
    async restored() { await build(); gone = false; draw(); },
  });
  return { look(name) { look = name; draw(); wake(); } };
}
