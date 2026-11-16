// The tube: a dim still of the toy in hand, in the middle of the Clock.
// It looks like a 1950s picture tube, seen from inside: a concave warp, scan lines and grain.
// It has no hard edge: the picture fades out toward the toys.
// A toy with a loop plays it in place of the still while the toy is in hand.
// It draws on a change only; the grain moves while a toy is in hand.
import { TRI_VS, program, linked, tri, onContextLoss } from '../gl.js';

// How bright the picture is at its middle, 0 to 1.
const LEVEL = 0.46;

const FS = `#version 300 es
precision mediump float;
in vec2 vUv;
out vec4 o;
uniform sampler2D uA, uB;
uniform float uPx, uMix, uTime, uJolt, uHasA, uHasB, uLevel;
float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
void main() {
  vec2 p = vUv * 2.0 - 1.0;
  float r = length(p);
  // The warp is concave: the middle sinks back and the rim pulls outward.
  // Past r = 0.84 the picture folds; the fade hides that part.
  vec2 w = p * (1.7 - 0.8 * r * r);
  // A change of toy rolls the picture and tears a few lines.
  float row = floor(vUv.y * 48.0);
  w.y += uJolt * 0.16;
  w.x += uJolt * 0.07 * (hash(vec2(row, floor(uTime * 24.0) + 3.0)) - 0.5);
  // The first texture row is the top of the still.
  vec2 s = vec2(w.x, -w.y) * 0.5 + 0.5;
  vec3 c = mix(texture(uA, s).rgb * uHasA, texture(uB, s).rgb * uHasB, uMix);
  // The shade: a dim picture that goes darker toward the rim.
  c *= uLevel * (1.0 - 0.8 * smoothstep(0.08, 0.8, r));
  // Scan lines: one line each three CSS pixels.
  float line = 0.5 + 0.5 * sin(gl_FragCoord.y / uPx * 2.0944);
  c *= 0.7 + 0.3 * line;
  // Grain: it lies on the whole face, also where the picture is dark.
  float g = hash(gl_FragCoord.xy + floor(uTime * 20.0) * 17.0);
  c += (g - 0.5) * 0.25 * uJolt * mix(uHasA, uHasB, uMix) + g * 0.035;
  // No hard edge: the face fades out past the ring of toys.
  float a = pow(1.0 - smoothstep(0.2, 1.0, r), 1.4);
  // The dark lines and the grain reach wider than the picture.
  o = vec4(max(c, 0.0) * a, a * (0.26 + 0.3 * (1.0 - line)));
}`;

/**
 * Builds the tube inside a host element; the canvas fills it.
 * @param {HTMLElement} host
 * @returns {Promise<{ show: (url: string, loop?: string | null) => void, live: (on: boolean) => void } | null>}  Null without WebGL2.
 */
export async function tube(host) {
  const canvas = Object.assign(document.createElement('canvas'), { className: 'clock-tube' });
  canvas.setAttribute('aria-hidden', 'true');
  const gl = canvas.getContext('webgl2', { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false, powerPreference: 'low-power' });
  if (!gl) return null;
  host.append(canvas);

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
  /** @type {HTMLVideoElement | null} */
  let vid = null;
  // A dropped loop frees its decoder.
  const drop = () => { if (!vid) return; vid.pause(); vid.removeAttribute('src'); vid.load(); vid = null; };
  function draw() {
    if (gone) return;
    // The picture is soft, so the canvas stays at 2x at most.
    const k = Math.min(devicePixelRatio || 1, 2), w = Math.max(1, Math.round(host.clientWidth * k)), h = w;
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    gl.useProgram(P.p);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex[0]); gl.uniform1i(P.u.uA, 0);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, tex[1]); gl.uniform1i(P.u.uB, 1);
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
    // A loop in play puts its present frame in the newest picture.
    const playing = vid !== null && hot && vid.readyState >= 2;
    if (playing) {
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, tex[has[1] ? 1 : 0]);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, vid);
    }
    // The grain alone needs twenty pictures a second, not sixty.
    if (fading || playing || now - drawn > 48) draw();
    if (has[1] && mix >= 1) settle();
    if (has[1] || jolt > 0 || (hot && !still.matches)) raf = requestAnimationFrame(frame);
  }

  function show(url, loop = null) {
    if (url === src) return;
    src = url;
    drop();
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
      else { jolt = 1; wake(); if (loop) film(url, loop); }
    };
    im.src = url;
  }
  // The loop loads after the still, so the picture never waits for it.
  function film(url, loop) {
    const v = document.createElement('video');
    v.muted = true;
    v.loop = true;
    v.playsInline = true;
    v.preload = 'auto';
    v.addEventListener('loadeddata', () => {
      if (url !== src || gone) return;
      vid = v;
      if (hot) { v.play().catch(() => {}); wake(); }
    }, { once: true });
    v.src = loop;
  }
  // A loop plays only while its toy is in hand; else it rests on one frame.
  function live(on) {
    hot = on;
    if (vid) { if (on) vid.play().catch(() => {}); else vid.pause(); }
    if (on) wake();
  }

  new ResizeObserver(draw).observe(host);
  onContextLoss(canvas, {
    lost() { gone = true; cancelAnimationFrame(raf); raf = 0; drop(); },
    async restored() { await build(); gone = false; const again = src; src = ''; if (again) show(again); },
  });
  return { show, live };
}
