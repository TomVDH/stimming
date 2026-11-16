// The tube: a faint still of the toy in hand, behind the whole Clock page.
// It looks like a 1950s picture tube: a bulge, scan lines and grain.
// It draws on a change only; the grain moves while a toy is in hand.
import { TRI_VS, program, linked, tri, onContextLoss } from '../gl.js';

// How strong the picture is over the page, 0 to 1.
const LEVEL = 0.42;

const FS = `#version 300 es
precision mediump float;
in vec2 vUv;
out vec4 o;
uniform sampler2D uA, uB;
uniform vec2 uRes;
uniform float uPx, uMix, uTime, uJolt, uHasA, uHasB, uLevel;
float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
// The still is square; it covers the screen.
vec3 pic(sampler2D t, vec2 p, float a) {
  vec2 q = a > 1.0 ? vec2(p.x, p.y / a) : vec2(p.x * a, p.y);
  return texture(t, q * 0.5 + 0.5).rgb;
}
void main() {
  vec2 p = vUv * 2.0 - 1.0;
  float a = uRes.x / uRes.y;
  // The bulge: the picture swells toward the middle of the glass.
  vec2 w = p * (0.84 + 0.11 * dot(p, p));
  // A change of toy rolls the picture and tears a few lines.
  float row = floor(vUv.y * 70.0);
  w.y += uJolt * 0.14;
  w.x += uJolt * 0.06 * (hash(vec2(row, floor(uTime * 24.0) + 3.0)) - 0.5);
  // The first texture row is the top of the still.
  vec2 s = vec2(w.x, -w.y);
  vec3 c = mix(pic(uA, s, a) * uHasA, pic(uB, s, a) * uHasB, uMix);
  // Scan lines: one line each three CSS pixels.
  c *= 0.76 + 0.24 * sin(gl_FragCoord.y / uPx * 2.0944);
  // Grain; a change of toy adds a burst of it.
  c += (hash(gl_FragCoord.xy + floor(uTime * 20.0) * 17.0) - 0.5) * (0.06 + 0.3 * uJolt);
  // The glass: a rounded face that falls to dark at its edge.
  float d = pow(abs(p.x), 3.0) + pow(abs(p.y), 3.0);
  float alpha = (1.0 - smoothstep(0.4, 1.0, d)) * uLevel * mix(uHasA, uHasB, uMix);
  o = vec4(max(c, 0.0) * alpha, alpha);
}`;

/**
 * Builds the tube behind the page.
 * @returns {Promise<{ show: (url: string) => void, live: (on: boolean) => void } | null>}  Null without WebGL2.
 */
export async function tube() {
  const canvas = Object.assign(document.createElement('canvas'), { className: 'clock-tube' });
  canvas.setAttribute('aria-hidden', 'true');
  const gl = canvas.getContext('webgl2', { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false, powerPreference: 'low-power' });
  if (!gl) return null;
  document.body.prepend(canvas);

  const still = matchMedia('(prefers-reduced-motion: reduce)');
  // A timer, not a frame: a hidden tab gets no frames.
  const tick = () => new Promise(r => setTimeout(r, 16));
  let P, vao, tex, has = [0, 0];
  async function build() {
    P = (await linked(gl, { tube: program(gl, TRI_VS, FS) }, { limit: 500, wait: tick })).tube;
    vao = gl.createVertexArray();
    tex = [0, 1].map(() => {
      const t = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      // One dark pixel, so an empty texture is still complete.
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 255]));
      return t;
    });
    has = [0, 0];
  }
  await build();

  let mix = 0, jolt = 0, time = 0, hot = false, raf = 0, last = 0, drawn = 0, src = '', gone = false;
  function draw() {
    if (gone) return;
    // The picture is soft, so the canvas stays at 1.5x at most.
    const k = Math.min(devicePixelRatio || 1, 1.5), w = Math.round(innerWidth * k), h = Math.round(innerHeight * k);
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    gl.useProgram(P.p);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex[0]); gl.uniform1i(P.u.uA, 0);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, tex[1]); gl.uniform1i(P.u.uB, 1);
    gl.uniform2f(P.u.uRes, w, h);
    gl.uniform1f(P.u.uPx, k);
    gl.uniform1f(P.u.uMix, mix);
    gl.uniform1f(P.u.uTime, time);
    gl.uniform1f(P.u.uJolt, jolt);
    gl.uniform1f(P.u.uHasA, has[0]);
    gl.uniform1f(P.u.uHasB, has[1]);
    gl.uniform1f(P.u.uLevel, LEVEL);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    tri(gl, null, vao);
    drawn = performance.now();
  }
  // The new still is B; when its fade ends it becomes A.
  const settle = () => { tex.reverse(); has = [1, 0]; mix = 0; };
  const wake = () => { if (!raf && !gone) { last = performance.now(); raf = requestAnimationFrame(frame); } };
  function frame(now) {
    raf = 0;
    const dt = Math.min((now - last) / 1000, 0.1), fading = has[1] === 1 || jolt > 0;
    last = now;
    if (has[1]) mix = Math.min(1, mix + dt / 0.5);
    jolt = Math.max(0, jolt - dt / 0.35);
    if (hot && !still.matches) time += dt;
    // The grain alone needs twenty pictures a second, not sixty.
    if (fading || now - drawn > 48) draw();
    if (has[1] && mix >= 1) settle();
    if (has[1] || jolt > 0 || (hot && !still.matches)) raf = requestAnimationFrame(frame);
  }

  function show(url) {
    if (url === src) return;
    src = url;
    const im = new Image();
    im.onload = () => {
      // A newer toy or a lost context makes this still stale.
      if (url !== src || gone) return;
      // A fade past its middle ends at once, so the next one starts clean.
      if (has[1] && mix > 0.5) settle();
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, tex[1]);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, im);
      has[1] = 1;
      mix = 0;
      if (still.matches) { mix = 1; draw(); settle(); }
      else { jolt = 1; wake(); }
    };
    im.src = url;
  }
  const live = on => { hot = on; if (on) wake(); };

  addEventListener('resize', draw);
  onContextLoss(canvas, {
    lost() { gone = true; cancelAnimationFrame(raf); raf = 0; },
    async restored() { await build(); gone = false; const again = src; src = ''; if (again) show(again); },
  });
  return { show, live };
}
