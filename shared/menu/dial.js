// @ts-check
// Signal Dial: the production Stimming main menu.
// Default view: twelve toys on a circular dial over an unblurred WebGL2 CRT, with top-left
// interactive Stimming wordmark + subtle OKLCH mesh, bottom convex OKLab rainbow cloud,
// and a full-viewport All Toys page (with password-gated Lab under Signal/CRT styling).
import { TRI_VS, program, linked, tri, target, free, bind, onContextLoss } from '../gl.js';
import { injectSprite, flagsHTML, techHTML, glyph, inkOf } from '../access.js';
import { shotIcon } from '../series/shots.js';

const SIZE = 12;
const MENU_FPS = 30;
const MENU_STEP = 1000 / MENU_FPS;
const LAB_PASS = 'celestible';
const HEX_PREVIEW_KEYS = ['eastvan', 'goo', 'science', 'maths', 'dark'];

const root = document.documentElement;
const initView = root.dataset.view;
const fail = () => { delete root.dataset.view; delete root.dataset.dial; root.classList.remove('js-reveal'); };

// Unified 30 fps frame clock: all menu WebGL layers tick in lockstep and sleep at 0 rAF when idle.
function createMenuClock() {
  /** @type {Set<(now: number, dt: number) => boolean>} */
  const tasks = new Set();
  let raf = 0, last = 0;
  /** @param {number} now */
  function tick(now) {
    raf = 0;
    if (document.hidden || !tasks.size) { last = 0; return; }
    if (last && now - last < MENU_STEP - 2) {
      raf = requestAnimationFrame(tick);
      return;
    }
    const dt = last ? Math.min((now - last) / 1000, 0.1) : 1 / MENU_FPS;
    last = now;
    for (const fn of [...tasks]) {
      if (!fn(now, dt)) tasks.delete(fn);
    }
    if (tasks.size && !document.hidden) raf = requestAnimationFrame(tick);
    else last = 0;
  }
  const poke = () => {
    if (!raf && tasks.size && !document.hidden) raf = requestAnimationFrame(tick);
  };
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { cancelAnimationFrame(raf); raf = 0; last = 0; }
    else poke();
  });
  return {
    /** @param {(now: number, dt: number) => boolean} fn */
    add(fn) { tasks.add(fn); poke(); },
    /** @param {(now: number, dt: number) => boolean} fn */
    remove(fn) {
      tasks.delete(fn);
      if (!tasks.size) { cancelAnimationFrame(raf); raf = 0; last = 0; }
    },
  };
}
const menuClock = createMenuClock();

if (initView === 'dial' || initView === 'all' || initView === 'lab') {
  boot().catch(e => { fail(); console.error('Signal Dial:', e); });
}

/** @param {string} [accent] */
function parseToyLCH(accent = '') {
  const found = [...accent.matchAll(/oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)/gi)].map(m => [+m[1], +m[2], +m[3]]);
  const a = found[0] || [0.72, 0.16, 285];
  const b = found[1] || [Math.max(0.42, a[0] - 0.1), Math.max(0.08, a[1] * 0.94), (a[2] + 42) % 360];
  const c = found[2] || [Math.min(0.86, a[0] + 0.05), Math.max(0.08, a[1] * 0.88), (a[2] - 34 + 360) % 360];
  return [a, b, c];
}

/* ---------- Unblurred, circularly masked premultiplied-alpha WebGL2 CRT ---------- */
const LEVEL = 0.36;
const POWER = 0.46;
const CHANGE = 0.38;
const GLOW = [0.09, 0.07, 0.05];

const CRT_FS = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 o;
uniform sampler2D uA, uB;
uniform vec2 uRes, uImgA, uImgB, uSpot;
uniform float uPx, uMix, uKick, uPower, uTime, uHasA, uHasB, uLevel, uDim, uSpotRad;

float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
uint pcg(uint v) { uint t = v * 747796405u + 2891336453u; uint w = ((t >> ((t >> 28u) + 4u)) ^ t) * 277803737u; return (w >> 22u) ^ w; }
float rnd(vec2 p, float f) { uvec2 u = uvec2(ivec2(p)); return float(pcg(u.x + pcg(u.y + pcg(uint(f))))) / 4294967295.0; }
float vn(vec2 x, float f) {
  vec2 i = floor(x), u = fract(x);
  u = u * u * (3.0 - 2.0 * u);
  return mix(mix(rnd(i, f), rnd(i + vec2(1.0, 0.0), f), u.x), mix(rnd(i + vec2(0.0, 1.0), f), rnd(i + vec2(1.0, 1.0), f), u.x), u.y);
}
vec2 spotUv(vec2 localP, vec2 img, float zoom) {
  float ia = img.x / max(1.0, img.y);
  vec2 p = localP * 0.58;
  if (ia > 1.0) p.x /= ia;
  else p.y *= ia;
  return clamp(p * zoom + 0.5, 0.002, 0.998);
}
vec3 pic(sampler2D t, vec2 localP, vec2 img, vec2 ca, float zoom) {
  vec2 s = spotUv(localP, img, zoom);
  vec3 c = vec3(textureLod(t, s + ca, 0.0).r, textureLod(t, s, 0.0).g, textureLod(t, s - ca, 0.0).b);
  c = pow(max(c, 0.0), vec3(2.35));
  return max(mix(vec3(dot(c, vec3(0.2126, 0.7152, 0.0722))), c, 1.62), 0.0);
}

void main() {
  vec2 uvTop = vec2(vUv.x, 1.0 - vUv.y);
  vec2 dPx = (uvTop - uSpot) * uRes;
  vec2 p = dPx / max(1.0, uSpotRad);
  float r = length(p);
  if (r > 1.38) { o = vec4(0.0); return; }

  vec2 pc = p * (1.0 + 0.085 * r * r);
  float g = uMix, k = uKick;

  float rowPx = max(3.0, floor(3.0 * uPx + 0.5));
  float row = floor(gl_FragCoord.y / rowPx);
  float slip = (hash(vec2(row, floor(uTime * 24.0))) - 0.5) * 0.0014;
  float away = (pc.y * 0.5 + 0.5) - fract(uTime * 0.085) * 1.3 + 0.15;
  float band = exp(-away * away / 0.0018);
  slip += band * (0.006 + 0.0025 * sin(uTime * 37.0 + row * 1.9));
  slip += k * 0.026 * (hash(vec2(floor(row / 3.0), floor(uTime * 30.0) + 5.0)) - 0.5);
  pc.x += slip;

  vec2 open = vec2(max(0.004, smoothstep(0.0, 0.35, uPower)), max(0.004, smoothstep(0.24, 0.85, uPower)));
  vec2 pr = pc / open;
  float lit = 1.0 - smoothstep(1.08, 1.52, length(pr));

  vec2 ca = pr * (0.0014 + 0.0045 * k);
  float zoomB = 1.0 - 0.05 * (1.0 - g);

  vec3 light = mix(pic(uA, pr, uImgA, ca, 1.0) * uHasA, pic(uB, pr, uImgB, ca, zoomB) * uHasB, g);
  light *= uLevel * uDim;

  float m = floor(mod(gl_FragCoord.x / max(1.0, floor(uPx + 0.5)), 3.0));
  vec3 stripe = vec3(m == 0.0, m == 1.0, m == 2.0) * 0.82 + 0.28;
  vec3 grille = mix(vec3(1.0), stripe / 0.553, 0.36);
  float lum = clamp(dot(light, vec3(0.3, 0.6, 0.1)), 0.0, 1.0);
  float sy = fract(gl_FragCoord.y / rowPx) - 0.5;
  float sw = mix(0.26, 0.54, sqrt(lum));
  light *= grille * mix(1.0, exp(-sy * sy / (sw * sw)) * 1.48, 0.68);

  for (int i = 0; i < 5; i++) {
    vec2 at = vec2(hash(vec2(float(i), 3.0)), hash(vec2(float(i), 7.0))) * 1.2 - 0.6;
    float brad = 0.009 + 0.012 * hash(vec2(float(i), 9.0));
    light *= 1.0 - 0.45 * smoothstep(brad, brad * 0.35, length(p - at));
  }

  vec3 c = vec3(0.009, 0.0095, 0.013) * grille;
  float roll = exp(-pow((fract(pc.y * 0.5 + 0.5 + uTime * 0.07) - 0.5) * 9.0, 2.0)) * 0.045;
  c += light * (1.0 + roll + band * 0.22) * lit;

  float field = floor(uTime * 24.0);
  vec2 gp = mat2(0.89, 0.45, -0.45, 0.89) * gl_FragCoord.xy / uPx;
  float n = mix(rnd(gl_FragCoord.xy, field), vn(gp / 1.6, field + 7.0), 0.4) - 0.5;
  float lump = vn(p * 2.4 + vec2(uTime * 0.05, -uTime * 0.03), 3.0);
  float heavy = (0.58 + 0.62 * lump) * (1.0 + 0.35 * r * r);
  float idleSnow = mix(0.026, 0.008, clamp(uDim, 0.0, 1.0));
  c *= 1.0 + n * 0.40 * heavy * lit;
  c += n * (idleSnow * heavy + 0.14 * k) * lit;
  c += step(0.99993, rnd(floor(gl_FragCoord.xy / (2.0 * uPx)), field + 3.0)) * 0.42 * lit;

  c *= (1.0 - 0.30 * smoothstep(0.18, 0.92, r * r)) * (1.0 + 0.01 * sin(uTime * 113.0)) * (1.0 + 0.22 * k);
  c = pow(max(c, 0.0), vec3(1.0 / 2.2));
  o = vec4(c, 1.0);
}`;

const AFTER_FS = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 o;
uniform sampler2D uNow, uWas;
uniform vec3 uKeep;
void main() {
  vec4 now = texture(uNow, vUv), was = texture(uWas, vUv);
  o = vec4(max(now.rgb, was.rgb * uKeep), 1.0);
}`;

const COMP_FS = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 o;
uniform sampler2D uTex;
uniform vec2 uRes, uSpot;
uniform float uSpotRad, uAim, uUseAim, uEllipX;

void main() {
  vec3 tube = texture(uTex, vUv).rgb;
  vec2 uvTop = vec2(vUv.x, 1.0 - vUv.y);
  vec2 px = (uvTop - uSpot) * uRes;
  vec2 scaled = vec2(px.x / max(0.5, uEllipX), px.y);
  float r = length(scaled) / max(1.0, uSpotRad);
  float a = pow(1.0 - smoothstep(0.24, 1.0, r), 1.38);

  if (uUseAim > 0.001) {
    float off = atan(px.x, -px.y) - uAim;
    off = abs(atan(sin(off), cos(off)));
    a *= 1.0 - 0.68 * uUseAim * (1.0 - smoothstep(0.08, 0.52, off)) * smoothstep(0.28, 0.86, r);
  }
  o = vec4(tube * a, a * 0.92);
}`;

const LAB_CRT_FS = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 o;
uniform vec2 uRes;
uniform float uPx, uTime, uStrength;

float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
uint pcg(uint v) { uint t = v * 747796405u + 2891336453u; uint w = ((t >> ((t >> 28u) + 4u)) ^ t) * 277803737u; return (w >> 22u) ^ w; }
float rnd(vec2 p, float f) { uvec2 u = uvec2(ivec2(p)); return float(pcg(u.x + pcg(u.y + pcg(uint(f))))) / 4294967295.0; }
float vn(vec2 x, float f) {
  vec2 i = floor(x), u = fract(x);
  u = u * u * (3.0 - 2.0 * u);
  return mix(mix(rnd(i, f), rnd(i + vec2(1.0, 0.0), f), u.x), mix(rnd(i + vec2(0.0, 1.0), f), rnd(i + vec2(1.0, 1.0), f), u.x), u.y);
}

void main() {
  vec2 p = (vUv - 0.5) * 2.0;
  float asp = uRes.x / max(1.0, uRes.y);
  vec2 pa = vec2(p.x * max(1.0, asp * 0.62), p.y);
  float r = length(pa);

  float rowPx = max(3.0, floor(3.0 * uPx + 0.5));
  float m = floor(mod(gl_FragCoord.x / max(1.0, floor(uPx + 0.5)), 3.0));
  vec3 stripe = vec3(m == 0.0, m == 1.0, m == 2.0) * 0.82 + 0.28;
  vec3 grille = mix(vec3(1.0), stripe / 0.553, 0.36);
  float sy = fract(gl_FragCoord.y / rowPx) - 0.5;
  float scan = mix(1.0, exp(-sy * sy / (0.30 * 0.30)) * 1.38, 0.56);

  vec3 c = vec3(0.009, 0.0095, 0.013) * grille;
  float away = vUv.y - fract(uTime * 0.085) * 1.3 + 0.15;
  float band = exp(-away * away / 0.0018);
  float roll = exp(-pow((fract(vUv.y + uTime * 0.07) - 0.5) * 9.0, 2.0)) * 0.0045;
  c += (roll + band * 0.0065) * uStrength * grille;

  float field = floor(uTime * 24.0);
  vec2 gp = mat2(0.89, 0.45, -0.45, 0.89) * gl_FragCoord.xy / uPx;
  float n = mix(rnd(gl_FragCoord.xy, field), vn(gp / 1.6, field + 7.0), 0.4) - 0.5;
  float lump = vn(pa * 2.4 + vec2(uTime * 0.05, -uTime * 0.03), 3.0);
  float heavy = (0.58 + 0.62 * lump) * (1.0 + 0.28 * r * r);
  float snowAmp = 0.036 * uStrength;

  c *= 1.0 + n * 0.40 * heavy;
  c += n * snowAmp * heavy * scan;
  c += step(0.99993, rnd(floor(gl_FragCoord.xy / (2.0 * uPx)), field + 3.0)) * 0.38 * uStrength;

  c *= (1.0 - 0.34 * smoothstep(0.18, 1.05, r * r)) * (1.0 + 0.01 * sin(uTime * 113.0));
  c = pow(max(c, 0.0), vec3(1.0 / 2.2));
  o = vec4(c, 1.0);
}`;

const FOOT_MESH_FS = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 o;
uniform vec2 uRes, uPtr;
uniform vec3 uDial;
uniform vec4 uBox;
uniform float uTime, uStir;
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
vec3 lab2lin(vec3 c) {
  vec3 q = vec3(c.x + 0.3963377774 * c.y + 0.2158037573 * c.z, c.x - 0.1055613458 * c.y - 0.0638541728 * c.z, c.x - 0.0894841775 * c.y - 1.2914855480 * c.z);
  q = q * q * q;
  return vec3(4.0767416621 * q.x - 3.3077115913 * q.y + 0.2309699292 * q.z, -1.2684380046 * q.x + 2.6097574011 * q.y - 0.3413193965 * q.z, -0.0041960863 * q.x - 0.7034186147 * q.y + 1.7076147010 * q.z);
}
vec3 lch(float l, float c, float h) { return vec3(l, c * cos(radians(h)), c * sin(radians(h))); }
vec3 hues(float x) {
  vec3 lab = mix(lch(0.62, 0.23, 328.0), lch(0.56, 0.19, 292.0), smoothstep(0.0, 0.22, x));
  lab = mix(lab, lch(0.78, 0.14, 205.0), smoothstep(0.2, 0.46, x));
  lab = mix(lab, lch(0.8, 0.16, 150.0), smoothstep(0.44, 0.6, x) * 0.6);
  lab = mix(lab, lch(0.84, 0.16, 84.0), smoothstep(0.58, 0.82, x));
  lab = mix(lab, lch(0.7, 0.2, 28.0), smoothstep(0.82, 1.05, x));
  return pow(max(lab2lin(lab), 0.0), vec3(1.0 / 2.2));
}
void main() {
  float wide = uRes.x / max(1.0, uRes.y);
  vec2 p = vec2(vUv.x * wide, vUv.y), at = vec2(uPtr.x * wide, uPtr.y);
  float t = uTime * 0.05;
  vec2 w = p * 0.9 + 0.55 * vec2(fbm(p * 0.8 + vec2(t, -t * 0.6)), fbm(p * 0.8 + vec2(-t * 0.7, t) + 4.7));
  float near = exp(-dot(p - at, p - at) * 2.2) * uStir;
  w += (p - at) * near * 0.6;
  float f = fbm(w * 1.3 + t), g = fbm(w * 0.7 - t * 0.8 + 9.1);
  vec3 col = hues(vUv.x + (f - 0.5) * 0.7);

  vec2 scr = vec2(uBox.x + vUv.x * uBox.z, uBox.y + (1.0 - vUv.y) * uBox.w);
  float dDial = uDial.z > 1.0 ? length(scr - uDial.xy) / uDial.z : 2.0;
  float cradle = smoothstep(0.82, 1.26, dDial);
  float sideLift = pow(abs(vUv.x - 0.5) * 2.0, 1.65) * 0.34;
  float rise = smoothstep(0.0, 1.0, (1.0 - vUv.y) + sideLift + (g - 0.5) * 0.44 - 0.16);
  float a = pow(rise, 2.35) * cradle * (0.48 + 0.52 * f) * (0.44 + 0.34 * near);
  a *= mix(0.42, 1.0, smoothstep(0.0, 0.18, vUv.y));
  col *= 0.72;
  o = vec4(col * a, a);
}`;

const TOP_MESH_FS = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 o;
uniform vec2 uRes;
uniform vec3 uC1, uC2, uC3;
uniform float uTime;
float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vn(vec2 x) {
  vec2 i = floor(x), u = fract(x);
  u = u * u * (3.0 - 2.0 * u);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 x) {
  float s = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) { s += a * vn(x); x = x * 2.02 + 7.3; a *= 0.5; }
  return s / 0.9375;
}
vec3 lab2lin(vec3 c) {
  vec3 q = vec3(c.x + 0.3963377774 * c.y + 0.2158037573 * c.z, c.x - 0.1055613458 * c.y - 0.0638541728 * c.z, c.x - 0.0894841775 * c.y - 1.2914855480 * c.z);
  q = q * q * q;
  return vec3(4.0767416621 * q.x - 3.3077115913 * q.y + 0.2309699292 * q.z, -1.2684380046 * q.x + 2.6097574011 * q.y - 0.3413193965 * q.z, -0.0041960863 * q.x - 0.7034186147 * q.y + 1.7076147010 * q.z);
}
vec3 lch(vec3 c) { return vec3(c.x, c.y * cos(radians(c.z)), c.y * sin(radians(c.z))); }
void main() {
  vec2 uvTop = vec2(vUv.x, 1.0 - vUv.y);
  float wide = uRes.x / max(1.0, uRes.y);
  vec2 p = vec2(uvTop.x * wide, uvTop.y);
  float t = uTime * 0.09;
  vec2 w = p * 1.05 + 0.48 * vec2(fbm(p * 0.95 + vec2(t, -t * 0.5)), fbm(p * 0.95 + vec2(-t * 0.6, t) + 5.2));
  float f1 = fbm(w * 1.15 + t * 0.6);
  float f2 = fbm(w * 0.85 - t * 0.5 + 11.4);
  vec3 lab = mix(lch(uC1), lch(uC2), smoothstep(0.18, 0.82, f1));
  lab = mix(lab, lch(uC3), smoothstep(0.32, 0.88, f2) * 0.68);
  lab.x *= 0.84;
  vec3 col = pow(max(lab2lin(lab), 0.0), vec3(1.0 / 2.2));
  float dist = length(vec2(uvTop.x * 1.12, uvTop.y * 1.2));
  float mask = pow(1.0 - smoothstep(0.04, 1.0, dist + (f2 - 0.5) * 0.24), 2.15);
  float a = mask * (0.10 + 0.055 * f1);
  o = vec4(col * a, a);
}`;

/** @param {HTMLElement} host @param {() => number[]} getDial */
async function makeFooterMesh(host, getDial) {
  const canvas = Object.assign(document.createElement('canvas'), { className: 'sm-foot-mesh' });
  canvas.setAttribute('aria-hidden', 'true');
  const gl = canvas.getContext('webgl2', { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false, powerPreference: 'low-power' });
  if (!gl) return null;
  host.prepend(canvas);

  const still = matchMedia('(prefers-reduced-motion: reduce)');
  const tick = () => new Promise(r => setTimeout(r, 16));
  const TAIL = 2.6, SCALE = 0.4;
  /** @type {any} */ let P, vao;
  async function build() {
    P = (await linked(gl, { mesh: program(gl, TRI_VS, FOOT_MESH_FS) }, { limit: 500, wait: tick })).mesh;
    vao = gl.createVertexArray();
  }
  await build();

  const ptr = { x: 0.5, y: 0.2 }, want = { x: 0.5, y: 0.2 };
  let time = Math.random() * 40, stir = 0, until = 0, paused = false, gone = false;
  let box = { left: 0, top: 0, width: 1, height: 1 };
  function measure() {
    const r = canvas.getBoundingClientRect();
    box = { left: r.left, top: r.top, width: r.width || 1, height: r.height || 1 };
  }
  measure();
  function draw() {
    if (gone || !P || paused) return;
    const w = Math.max(2, Math.round(box.width * SCALE)), h = Math.max(2, Math.round(box.height * SCALE));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    const g = getDial();
    gl.useProgram(P.p);
    gl.uniform2f(P.u.uRes, w, h);
    gl.uniform2f(P.u.uPtr, ptr.x, ptr.y);
    gl.uniform3f(P.u.uDial, g[0], g[1], g[2]);
    gl.uniform4f(P.u.uBox, box.left, box.top, box.width, box.height);
    gl.uniform1f(P.u.uTime, time);
    gl.uniform1f(P.u.uStir, stir);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    tri(gl, null, vao);
  }
  /** @param {number} now @param {number} dt */
  function step(now, dt) {
    if (gone || paused || document.hidden) return false;
    const awake = now < until;
    stir += ((awake ? 1 : 0) - stir) * (1 - Math.exp(-dt * 2.2));
    time += dt * (0.25 + 0.75 * stir);
    ptr.x += (want.x - ptr.x) * (1 - Math.exp(-dt * 4));
    ptr.y += (want.y - ptr.y) * (1 - Math.exp(-dt * 4));
    draw();
    return awake || stir > 0.01;
  }
  const wake = () => {
    if (paused || gone || still.matches) return;
    until = performance.now() + TAIL * 1000;
    menuClock.add(step);
  };
  if (still.matches) draw();
  else {
    document.addEventListener('pointermove', e => {
      if (paused || !box.width || !box.height) return;
      want.x = (e.clientX - box.left) / box.width;
      want.y = 1 - (e.clientY - box.top) / box.height;
      wake();
    }, { passive: true });
    wake();
  }
  new ResizeObserver(() => { measure(); draw(); }).observe(canvas);
  onContextLoss(canvas, {
    lost() { gone = true; menuClock.remove(step); },
    async restored() { await build(); gone = false; measure(); draw(); },
  });
  host.setAttribute('data-foot-mesh', '');
  return {
    draw() { measure(); draw(); },
    /** @param {boolean} on */
    setPaused(on) {
      paused = on;
      if (paused) menuClock.remove(step);
      else { measure(); draw(); }
    },
  };
}

/** @param {HTMLElement} host */
async function makeTopMesh(host) {
  const canvas = Object.assign(document.createElement('canvas'), { className: 'sm-top-mesh' });
  canvas.setAttribute('aria-hidden', 'true');
  const gl = canvas.getContext('webgl2', { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false, powerPreference: 'low-power' });
  if (!gl) return null;
  host.prepend(canvas);

  const still = matchMedia('(prefers-reduced-motion: reduce)');
  const tick = () => new Promise(r => setTimeout(r, 16));
  const SCALE = 0.25;
  /** @type {any} */ let P, vao;
  async function build() {
    P = (await linked(gl, { mesh: program(gl, TRI_VS, TOP_MESH_FS) }, { limit: 500, wait: tick })).mesh;
    vao = gl.createVertexArray();
  }
  await build();

  const cur = [[0.72, 0.16, 285], [0.62, 0.15, 325], [0.76, 0.14, 245]];
  const tgt = [[0.72, 0.16, 285], [0.62, 0.15, 325], [0.76, 0.14, 245]];
  let time = Math.random() * 20, until = 0, paused = false, gone = false;

  const hDiff = (to, from) => ((to - from + 540) % 360) - 180;
  function draw() {
    if (gone || !P || paused) return;
    const w = Math.max(2, Math.round(canvas.clientWidth * SCALE)), h = Math.max(2, Math.round(canvas.clientHeight * SCALE));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    gl.useProgram(P.p);
    gl.uniform2f(P.u.uRes, w, h);
    gl.uniform3f(P.u.uC1, cur[0][0], cur[0][1], cur[0][2]);
    gl.uniform3f(P.u.uC2, cur[1][0], cur[1][1], cur[1][2]);
    gl.uniform3f(P.u.uC3, cur[2][0], cur[2][1], cur[2][2]);
    gl.uniform1f(P.u.uTime, time);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    tri(gl, null, vao);
  }
  /** @param {number} now @param {number} dt */
  function step(now, dt) {
    if (gone || paused || document.hidden) return false;
    const k = 1 - Math.exp(-dt * 2.1);
    let err = 0;
    for (let i = 0; i < 3; i++) {
      const dl = tgt[i][0] - cur[i][0], dc = tgt[i][1] - cur[i][1], dh = hDiff(tgt[i][2], cur[i][2]);
      cur[i][0] += dl * k;
      cur[i][1] += dc * k;
      cur[i][2] = (cur[i][2] + dh * k + 360) % 360;
      err += Math.abs(dl) + Math.abs(dc) + Math.abs(dh) / 180;
    }
    const drifting = now < until;
    if (drifting || err > 0.004) time += dt * 0.65;
    draw();
    return !still.matches && (drifting || err > 0.004);
  }
  /** @param {number[][]} lchs @param {boolean} [snap] */
  function setColours(lchs, snap = false) {
    for (let i = 0; i < 3; i++) {
      tgt[i] = [...lchs[i]];
      if (snap || still.matches) cur[i] = [...lchs[i]];
    }
    if (snap || still.matches) { draw(); return; }
    until = performance.now() + 2400;
    if (!paused && !gone) menuClock.add(step);
  }
  new ResizeObserver(draw).observe(canvas);
  onContextLoss(canvas, {
    lost() { gone = true; menuClock.remove(step); },
    async restored() { await build(); gone = false; draw(); },
  });
  host.setAttribute('data-top-mesh', '');
  draw();
  return {
    setColours,
    draw,
    /** @param {boolean} on */
    setPaused(on) {
      paused = on;
      if (paused) menuClock.remove(step);
      else draw();
    },
  };
}

/** @param {HTMLElement} host */
async function makeCRT(host) {
  const canvas = Object.assign(document.createElement('canvas'), { className: 'sm-crt' });
  canvas.setAttribute('aria-hidden', 'true');
  const gl = canvas.getContext('webgl2', { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false, powerPreference: 'low-power' });
  if (!gl) return null;
  host.append(canvas);

  const still = matchMedia('(prefers-reduced-motion: reduce)');
  const tick = () => new Promise(r => setTimeout(r, 16));
  const MAX_BUF = 960, STILL_CACHE_MAX = 18, VID_DWELL_MS = 180;
  /** @type {any} */ let P, A, C, vao, pics;
  /** @type {any[]} */ let glow = [];
  let has = [0, 0], imgSz = [[512, 512], [512, 512]];
  /** @type {Map<string, HTMLImageElement>} */ const stillCache = new Map();
  const vid = document.createElement('video');
  vid.muted = true; vid.loop = true; vid.playsInline = true; vid.preload = 'auto';
  let vidActive = false, vidTimer = 0, lastVidTime = -1;
  let src = '', drawn = 0, moved = 0, time = 0, mix = 0, power = 1, powerTo = 1, dim = 0, dimTo = 0;
  let spotCx = 0, spotCy = 0, spotRad = 420, boxSide = 860;
  let aimNow = 0, aimTo = 0, aimBlend = 0, aimBlendTo = 0, paused = false, sleeping = false, fresh = true, gone = false;
  const ease = t => 1 - Math.pow(1 - t, 4);

  async function build() {
    const progs = await linked(gl, { crt: program(gl, TRI_VS, CRT_FS), after: program(gl, TRI_VS, AFTER_FS), comp: program(gl, TRI_VS, COMP_FS) }, { limit: 600, wait: tick });
    P = progs.crt; A = progs.after; C = progs.comp; glow = [];
    vao = gl.createVertexArray();
    const blank = () => {
      const t = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 255]));
      return t;
    };
    pics = [blank(), blank()];
    has = [0, 0];
  }
  await build();

  const dropVideo = () => {
    clearTimeout(vidTimer); vidTimer = 0;
    if (vidActive || vid.getAttribute('src')) {
      vidActive = false;
      lastVidTime = -1;
      vid.pause();
      vid.removeAttribute('src');
      vid.load();
    }
  };
  const settle = () => { pics.reverse(); imgSz.reverse(); has = [1, 0]; mix = 0; };

  /** @param {string} url @param {HTMLImageElement} im */
  function cacheStill(url, im) {
    stillCache.delete(url);
    stillCache.set(url, im);
    if (stillCache.size > STILL_CACHE_MAX) {
      const oldest = stillCache.keys().next().value;
      if (oldest) stillCache.delete(oldest);
    }
  }

  /** @param {string} url */
  function preloadStill(url) {
    if (stillCache.has(url)) return;
    const im = new Image();
    im.decoding = 'async';
    im.onload = () => cacheStill(url, im);
    im.src = url;
  }

  function applyBox() {
    boxSide = Math.max(64, Math.ceil(spotRad * 2.04));
    canvas.style.left = `${Math.round(spotCx - boxSide * 0.5)}px`;
    canvas.style.top = `${Math.round(spotCy - boxSide * 0.5)}px`;
    canvas.style.width = `${boxSide}px`;
    canvas.style.height = `${boxSide}px`;
  }

  function draw() {
    if (gone || !P) return;
    const dpr = Math.min(devicePixelRatio || 1, 1.25);
    const w = Math.max(2, Math.min(MAX_BUF, Math.round(boxSide * dpr)));
    const h = w;
    const px = w / Math.max(1, boxSide);
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    const standbyQuiet = dim < 0.002 && has[1] === 0 && power === powerTo && (performance.now() - moved > 450);
    const needGlow = standbyQuiet ? 1 : 3;
    if (!glow.length || glow[0].w !== w || glow[0].h !== h || (!standbyQuiet && glow.length < 3)) {
      glow.forEach(t => free(gl, t));
      glow = Array.from({ length: Math.max(needGlow, 3) }, () => target(gl, w, h, { format: gl.RGBA8 }));
      fresh = true;
    }
    const kick = has[1] ? Math.pow(Math.max(0, 1 - mix / 0.36), 2) : 0;
    const radPx = spotRad * px;

    gl.useProgram(P.p);
    [[pics[0], P.u.uA], [pics[1], P.u.uB]].forEach(([t, u], i) => {
      gl.activeTexture(gl.TEXTURE0 + i); gl.bindTexture(gl.TEXTURE_2D, t); gl.uniform1i(u, i);
    });
    gl.uniform1f(P.u.uPx, px);
    gl.uniform2f(P.u.uRes, w, h);
    gl.uniform2f(P.u.uImgA, imgSz[0][0], imgSz[0][1]);
    gl.uniform2f(P.u.uImgB, imgSz[1][0], imgSz[1][1]);
    gl.uniform2f(P.u.uSpot, 0.5, 0.5);
    gl.uniform1f(P.u.uSpotRad, radPx);
    gl.uniform1f(P.u.uPower, 1 - Math.pow(1 - power, 3));
    gl.uniform1f(P.u.uMix, ease(mix));
    gl.uniform1f(P.u.uKick, kick);
    gl.uniform1f(P.u.uTime, time);
    gl.uniform1f(P.u.uHasA, has[0]);
    gl.uniform1f(P.u.uHasB, has[1]);
    gl.uniform1f(P.u.uLevel, LEVEL);
    gl.uniform1f(P.u.uDim, dim);
    const now = performance.now(), gap = Math.min((now - drawn) / 1000, 0.1);
    gl.bindFramebuffer(gl.FRAMEBUFFER, glow[0].fb);
    tri(gl, glow[0], vao);

    let srcTarget = glow[0];
    if (!standbyQuiet) {
      const off = fresh || still.matches;
      gl.useProgram(A.p);
      bind(gl, A, 'uNow', 0, glow[0]);
      bind(gl, A, 'uWas', 1, glow[1]);
      gl.uniform3f(A.u.uKeep, ...(/** @type {[number, number, number]} */ (GLOW.map(t => (off ? 0 : Math.exp(-gap / t))))));
      tri(gl, glow[2], vao);
      srcTarget = glow[2];
    }

    gl.useProgram(C.p);
    bind(gl, C, 'uTex', 0, srcTarget);
    gl.uniform2f(C.u.uRes, w, h);
    gl.uniform2f(C.u.uSpot, 0.5, 0.5);
    gl.uniform1f(C.u.uSpotRad, radPx);
    gl.uniform1f(C.u.uAim, aimNow);
    gl.uniform1f(C.u.uUseAim, aimBlend);
    gl.uniform1f(C.u.uEllipX, 1);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, w, h);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.bindVertexArray(vao);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    if (!standbyQuiet) [glow[1], glow[2]] = [glow[2], glow[1]];
    fresh = false;
    drawn = now;
  }

  /** @param {number} now @param {number} dt */
  function step(now, dt) {
    if (document.hidden || paused || gone || sleeping) return false;
    const rolling = has[1] === 1;
    if (rolling) mix = Math.min(1, mix + dt / CHANGE);
    const opening = power !== powerTo;
    if (opening) power = Math.min(powerTo, power + dt / POWER);
    const dimming = Math.abs(dimTo - dim) > 0.004;
    if (dimming) dim += (dimTo - dim) * Math.min(1, dt * 4.2); else dim = dimTo;
    const blendingAim = Math.abs(aimBlendTo - aimBlend) > 0.004;
    if (blendingAim) aimBlend += (aimBlendTo - aimBlend) * Math.min(1, dt * 5.0); else aimBlend = aimBlendTo;

    const dAim = Math.atan2(Math.sin(aimTo - aimNow), Math.cos(aimTo - aimNow));
    const aiming = Math.abs(dAim) > 0.004;
    if (aiming) aimNow += dAim * Math.min(1, dt * 12); else aimNow = aimTo;

    if (!still.matches) time += dt;
    const playing = vidActive && vid.readyState >= 2 && !vid.paused;
    if (playing && vid.currentTime !== lastVidTime) {
      lastVidTime = vid.currentTime;
      const slot = has[1] ? 1 : 0;
      imgSz[slot] = [vid.videoWidth || 512, vid.videoHeight || 512];
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, pics[slot]);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, vid);
    }
    if (rolling || opening || dimming || blendingAim || aiming || playing) moved = now;
    const fading = !still.matches && now - moved < 350;
    if (rolling || opening || dimming || blendingAim || aiming || playing || fading || now - drawn > 48) draw();
    if (rolling && mix >= 1) settle();
    return !still.matches || rolling || opening || dimming || blendingAim || aiming;
  }

  const wake = () => { if (!gone && !paused && !sleeping && !document.hidden) menuClock.add(step); };

  /** @param {HTMLImageElement} im @param {string} url @param {string | null} loopUrl */
  function commitImage(im, url, loopUrl) {
    if (url !== src || gone) return;
    if (has[1] && ease(mix) > 0.5) settle();
    imgSz[1] = [im.naturalWidth || 512, im.naturalHeight || 512];
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, pics[1]);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, im);
    if (!has[0] && !has[1]) { power = still.matches ? 1 : 0; powerTo = 1; }
    has[1] = 1; mix = 0;
    if (still.matches) { mix = 1; dim = dimTo; aimBlend = aimBlendTo; draw(); settle(); return; }
    wake();
    if (loopUrl && dimTo > 0.5 && !paused && !sleeping) {
      vidTimer = window.setTimeout(() => {
        if (url !== src || gone || dimTo < 0.5 || paused || sleeping) return;
        vidActive = false;
        lastVidTime = -1;
        vid.onloadeddata = () => {
          if (url !== src || gone || dimTo < 0.5 || paused || sleeping) return;
          vidActive = true;
          vid.play().catch(() => {});
          wake();
        };
        vid.src = loopUrl;
        vid.load();
      }, VID_DWELL_MS);
    }
  }

  /** @param {string} url @param {string | null} loopUrl */
  function show(url, loopUrl) {
    if (url === src && dimTo > 0.5) return;
    src = url;
    dimTo = 1;
    aimBlendTo = 1;
    sleeping = false;
    dropVideo();
    const cached = stillCache.get(url);
    if (cached && cached.complete && cached.naturalWidth > 0) {
      cacheStill(url, cached);
      commitImage(cached, url, loopUrl);
      return;
    }
    const im = new Image();
    im.decoding = 'async';
    im.onload = () => { cacheStill(url, im); commitImage(im, url, loopUrl); };
    im.src = url;
  }

  /** @param {boolean} on @param {boolean} [snap] */
  function setStandby(on, snap = false) {
    dimTo = on ? 0 : 1;
    aimBlendTo = on ? 0 : 1;
    if (on) { dropVideo(); src = ''; }
    if (snap || still.matches) { dim = dimTo; aimBlend = aimBlendTo; draw(); }
    wake();
  }
  /** @param {boolean} on */
  function setPaused(on) {
    paused = on;
    if (paused) { if (vidActive) vid.pause(); clearTimeout(vidTimer); menuClock.remove(step); }
    else { if (vidActive && dimTo > 0.5) vid.play().catch(() => {}); wake(); }
  }
  /** @param {boolean} on */
  function setSleeping(on) {
    if (sleeping === on) return;
    sleeping = on;
    if (sleeping) { dropVideo(); menuClock.remove(step); }
    else wake();
  }
  /** @param {number} cx @param {number} cy @param {number} rad */
  function setSpot(cx, cy, rad) {
    if (Math.abs(cx - spotCx) < 0.5 && Math.abs(cy - spotCy) < 0.5 && Math.abs(rad - spotRad) < 0.5) return;
    spotCx = cx; spotCy = cy; spotRad = rad;
    applyBox();
    fresh = true;
    draw();
    wake();
  }
  /** @param {number} deg @param {boolean} [snap] */
  function aim(deg, snap = false) {
    aimTo = deg * Math.PI / 180;
    if (snap || still.matches) aimNow = aimTo;
    wake();
  }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { if (vidActive) vid.pause(); }
    else if (!paused && !sleeping && vidActive && dimTo > 0.5) vid.play().catch(() => {});
  });
  onContextLoss(canvas, {
    lost() { gone = true; menuClock.remove(step); dropVideo(); },
    async restored() { await build(); gone = false; const a = src; src = ''; if (a) show(a, null); else draw(); },
  });
  applyBox();
  draw();
  if (!still.matches) wake();
  return { show, preloadStill, setStandby, setPaused, setSleeping, setSpot, aim };
}

/** @param {HTMLElement} host */
async function makeLabCRT(host) {
  const canvas = Object.assign(document.createElement('canvas'), { className: 'sm-lab-crt' });
  canvas.setAttribute('aria-hidden', 'true');
  const gl = canvas.getContext('webgl2', { alpha: false, antialias: false, depth: false, stencil: false, powerPreference: 'low-power' });
  if (!gl) return null;
  host.prepend(canvas);

  const still = matchMedia('(prefers-reduced-motion: reduce)');
  const tick = () => new Promise(r => setTimeout(r, 16));
  /** @type {any} */ let P, vao;
  async function build() {
    P = (await linked(gl, { crt: program(gl, TRI_VS, LAB_CRT_FS) }, { limit: 500, wait: tick })).crt;
    vao = gl.createVertexArray();
  }
  await build();

  let time = Math.random() * 40, strength = 1, active = false, gone = false;
  function draw() {
    if (gone || !P) return;
    const dpr = 1;
    const w = Math.max(2, Math.round((host.clientWidth || 1) * dpr));
    const h = Math.max(2, Math.round((host.clientHeight || 1) * dpr));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    gl.useProgram(P.p);
    gl.uniform2f(P.u.uRes, w, h);
    gl.uniform1f(P.u.uPx, dpr);
    gl.uniform1f(P.u.uTime, time);
    gl.uniform1f(P.u.uStrength, strength);
    gl.viewport(0, 0, w, h);
    tri(gl, null, vao);
  }
  /** @param {number} _now @param {number} dt */
  function step(_now, dt) {
    if (!active || gone || document.hidden || still.matches) return false;
    time += dt;
    draw();
    return true;
  }
  const wake = () => {
    if (!active || gone || document.hidden) return;
    draw();
    if (!still.matches) menuClock.add(step);
  };
  onContextLoss(canvas, {
    lost() { gone = true; menuClock.remove(step); },
    async restored() { await build(); gone = false; wake(); },
  });
  return {
    draw,
    /** @param {boolean} on @param {number} [s] */
    setActive(on, s = 1) {
      active = on;
      strength = s;
      if (!active) { menuClock.remove(step); return; }
      wake();
    },
  };
}

/* ---------- Icon cleanup & promoted top-down Harmonograph + glossy Ebru Marbling icons ---------- */
/** @param {Element | null} svg */
function stripHarshShadows(svg) {
  if (!svg) return;
  const dropIds = new Set();
  svg.querySelectorAll('filter').forEach(flt => {
    if (flt.querySelector('feDropShadow') && flt.id) dropIds.add(flt.id);
  });
  if (dropIds.size) {
    svg.querySelectorAll('[filter]').forEach(el => {
      const ref = el.getAttribute('filter') || '';
      for (const id of dropIds) if (ref.includes(`#${id}`)) el.removeAttribute('filter');
    });
  }
  [...svg.children].forEach(el => {
    const tag = el.tagName.toLowerCase();
    const fill = (el.getAttribute('fill') || '').trim();
    if (el.hasAttribute('filter')) return;
    if ((tag === 'path' || tag === 'rect' || tag === 'circle') && (fill === 'oklch(0.07 0.01 260)' || fill === 'oklch(0.07 0.01 265)')) {
      el.remove();
    } else if (tag === 'ellipse' && /^oklch\(0\.0[45]\s/.test(fill)) {
      el.remove();
    }
  });
}

/** @param {Element} a @param {any} gsap */
function upgradeHarmonoIcon(a, gsap) {
  const svg = /** @type {SVGSVGElement | null} */ (a?.querySelector('.obj svg'));
  if (!svg) return;
  const f = n => +n.toFixed(2);
  const clamp = (v, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
  const lg = (id, stops, attrs = 'x1="0" y1="0" x2="0" y2="1"') =>
    `<linearGradient id="${id}" ${attrs}>${stops.map(([o, c, op = 1]) => `<stop offset="${o}" style="stop-color:${c};stop-opacity:${op}"/>`).join('')}</linearGradient>`;
  const rg = (id, stops, attrs = 'cx="0.5" cy="0.5" r="0.5"') =>
    `<radialGradient id="${id}" ${attrs}>${stops.map(([o, c, op = 1]) => `<stop offset="${o}" style="stop-color:${c};stop-opacity:${op}"/>`).join('')}</radialGradient>`;

  const u = 'hmt-';
  const R = 50, FIG_R = 40;
  const INK = 'oklch(0.72 0.21 302)', HOT = 'oklch(0.97 0.03 300)', PINK = 'oklch(0.75 0.21 335)';
  const T_END = 6 * Math.PI, NPTS = 260, DAMP = 0.026, TURN = 0.175, REST_PH = 0.65;
  const swing = (ph, t) => { const e = Math.exp(-DAMP * t); return [e * Math.sin(t + ph), e * Math.sin(t)]; };
  const figure = (ph, rot, upTo = 1) => {
    const pts = [], n = Math.max(2, Math.round(NPTS * upTo));
    for (let i = 0; i < n; i++) {
      const t = (i / (NPTS - 1)) * T_END, [x, y] = swing(ph, t), ang = rot + TURN * t;
      pts.push([64 + (x * Math.cos(ang) - y * Math.sin(ang)) * FIG_R, 64 + (x * Math.sin(ang) + y * Math.cos(ang)) * FIG_R]);
    }
    return pts;
  };
  const line = pts => 'M' + pts.map(p => `${f(p[0])} ${f(p[1])}`).join('L');
  const spark = (cls, r) => `<circle class="${cls}-h" r="${f(r * 2.8)}" fill="url(#${u}pen)" filter="url(#${u}gb)"/><circle class="${cls}" r="${r}" fill="${HOT}"/>`;

  svg.innerHTML = `<defs>
      ${lg(`${u}rim`, [[0, '#fff', 0.62], [0.5, '#fff', 0]], 'x1="0" y1="0" x2="1" y2="1"')}
      ${rg(`${u}lit`, [[0, '#fff', 0.36], [1, '#fff', 0]], 'cx="0.32" cy="0.26" r="0.7"')}
      <filter id="${u}gb" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="2.2"/></filter>
      ${rg(`${u}disc`, [[0, 'oklch(0.28 0.055 286)'], [0.58, 'oklch(0.18 0.034 283)'], [1, 'oklch(0.12 0.022 282)']], 'cx="0.38" cy="0.32" r="0.78"')}
      ${lg(`${u}lip`, [[0, 'oklch(0.38 0.095 298)'], [0.5, 'oklch(0.54 0.14 302)'], [1, 'oklch(0.24 0.065 290)']], 'x1="0" y1="0" x2="1" y2="0"')}
      ${lg(`${u}ink`, [[0, PINK], [0.48, INK], [1, 'oklch(0.68 0.19 284)']], 'x1="0" y1="0" x2="1" y2="1"')}
      ${rg(`${u}pen`, [[0, HOT, 1], [0.35, INK, 0.75], [1, INK, 0]])}
      ${rg(`${u}pool`, [[0, INK, 0.38], [0.62, INK, 0.1], [1, INK, 0]])}
      <clipPath id="${u}sc"><circle cx="64" cy="64" r="46.5"/></clipPath>
    </defs>
    <circle cx="64" cy="64" r="59" fill="url(#${u}pool)"/>
    <circle cx="64" cy="67" r="${R}" fill="url(#${u}lip)"/>
    <circle cx="64" cy="64" r="${R}" fill="url(#${u}disc)"/>
    <circle cx="64" cy="64" r="${R}" fill="url(#${u}lit)"/>
    <circle cx="64" cy="64" r="${R}" fill="none" stroke="url(#${u}rim)" stroke-width="2"/>
    <circle cx="64" cy="64" r="45.5" fill="none" stroke="oklch(0.62 0.14 300 / 0.24)" stroke-width="1"/>
    <g clip-path="url(#${u}sc)">
      <path class="hm-ghost" fill="none" stroke="${INK}" stroke-width="2.8" stroke-linejoin="round" stroke-linecap="round" opacity="0"/>
      <path class="hm-glow" fill="none" stroke="${INK}" stroke-width="7.2" stroke-linejoin="round" stroke-linecap="round" opacity="0.54" filter="url(#${u}gb)"/>
      <path class="hm-ink" fill="none" stroke="url(#${u}ink)" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>
      <path class="hm-hot" fill="none" stroke="${HOT}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>
    </g>
    ${spark('hm-bl', 3.4)}${spark('hm-br', 3.4)}${spark('hm-pen', 3.3)}`;

  const box = [12, 12, 104, 107], side = Math.max(box[2], box[3]), size = (side * 128) / 110;
  const cx = box[0] + box[2] / 2, cy = box[1] + box[3] / 2;
  svg.setAttribute('viewBox', `${f(cx - size / 2)} ${f(cy - size / 2)} ${f(size)} ${f(size)}`);
  svg.style.overflow = 'visible';

  const ghost = svg.querySelector('.hm-ghost'), glow = svg.querySelector('.hm-glow');
  const ink = svg.querySelector('.hm-ink'), hot = svg.querySelector('.hm-hot');
  /** @type {Array<[Element | null, Element | null]>} */
  const dots = ['hm-pen', 'hm-bl', 'hm-br'].map(c => [svg.querySelector(`.${c}`), svg.querySelector(`.${c}-h`)]);
  const st = { ph: REST_PH, phTo: REST_PH, rot: 0, rotTo: 0, prog: 1, hold: 0, gh: 0, live: false, t: 0, pulse: 0 };
  const put = ([c, h], p, o) => {
    if (!c || !h) return;
    c.setAttribute('cx', String(f(p[0]))); c.setAttribute('cy', String(f(p[1])));
    h.setAttribute('cx', String(f(p[0]))); h.setAttribute('cy', String(f(p[1])));
    h.setAttribute('opacity', String(f(o)));
  };
  const draw = () => {
    const pts = figure(st.ph, st.rot, st.prog);
    const dStr = line(pts);
    glow?.setAttribute('d', dStr);
    ink?.setAttribute('d', dStr);
    hot?.setAttribute('d', line(pts.slice(Math.max(0, pts.length - 28))));
    hot?.setAttribute('opacity', String(f(st.live && st.prog < 1 ? 0.95 : 0)));
    ghost?.setAttribute('opacity', String(f(st.gh)));
    put(dots[0], pts[pts.length - 1], 0.55 + 0.45 * st.pulse);
    const [sx, sy] = swing(st.ph, ((st.prog * NPTS - 1) / (NPTS - 1)) * T_END);
    put(dots[1], [64 - R + 1, 64 + sx * 16], 0.5 + 0.4 * st.pulse);
    put(dots[2], [64 + R - 1, 64 + sy * 16], 0.5 + 0.4 * st.pulse);
  };
  draw();

  if (!gsap) return;
  let running = false;
  const tick = () => {
    const time = gsap.ticker.time;
    const dt = Math.min(0.1, time - (st.t || time));
    st.t = time;
    st.ph += (st.phTo - st.ph) * Math.min(1, dt * 3.2);
    st.gh = Math.max(0, st.gh - dt * 0.34);
    if (st.live) {
      st.rot += dt * 0.32;
      if (st.prog < 1) st.prog = Math.min(1, st.prog + dt * 0.32);
      else if ((st.hold += dt) > 0.9) { ghost?.setAttribute('d', ink?.getAttribute('d') || ''); st.gh = 0.62; st.prog = 0.24; st.hold = 0; }
      st.pulse = st.prog < 1 ? 1 : 0.45;
    } else {
      st.prog = Math.min(1, st.prog + dt * 0.95);
      st.rot += (st.rotTo - st.rot) * Math.min(1, dt * 2.6);
      st.pulse = Math.max(0, st.pulse - dt * 2);
    }
    draw();
    if (!st.live && st.prog >= 1 && st.gh <= 0 && st.pulse <= 0 && Math.abs(st.rot - st.rotTo) + Math.abs(st.ph - st.phTo) < 0.003) {
      st.rot = st.rotTo; st.ph = st.phTo; draw();
      running = false; gsap.ticker.remove(tick);
    }
  };
  const start = () => { if (!running) { running = true; st.t = gsap.ticker.time; gsap.ticker.add(tick); } };
  const localPt = e => {
    const r = svg.getBoundingClientRect(), v = svg.viewBox.baseVal;
    return r.width ? [v.x + ((e.clientX - r.left) / r.width) * v.width, v.y + ((e.clientY - r.top) / r.height) * v.height] : null;
  };
  const onMove = p => { if (p) st.phTo = REST_PH + clamp((p[0] - 64) / 48, -1, 1) * 0.72; };
  const onEnter = e => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (!st.live) { ghost?.setAttribute('d', ink?.getAttribute('d') || ''); st.gh = 0.62; st.prog = 0.28; st.hold = 0; }
    st.live = true; start();
    if (e && e.clientX != null) onMove(localPt(e));
  };
  const onLeave = () => {
    st.live = false; st.phTo = REST_PH;
    st.rotTo = Math.round(st.rot / (2 * Math.PI)) * 2 * Math.PI;
    start();
  };
  a.addEventListener('pointerenter', onEnter);
  a.addEventListener('pointermove', e => { if (st.live) onMove(localPt(e)); });
  a.addEventListener('pointerleave', onLeave);
  a.addEventListener('focusin', () => onEnter(null));
  a.addEventListener('focusout', onLeave);
}

/** @param {Element} a @param {any} gsap */
function upgradeMarbleIcon(a, gsap) {
  const svg = /** @type {SVGSVGElement | null} */ (a?.querySelector('.obj svg'));
  if (!svg) return;
  const f = n => +n.toFixed(1);
  const clamp = (v, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
  const lg = (id, stops, attrs = 'x1="0" y1="0" x2="0" y2="1"') =>
    `<linearGradient id="${id}" ${attrs}>${stops.map(([o, c, op = 1]) => `<stop offset="${o}" style="stop-color:${c};stop-opacity:${op}"/>`).join('')}</linearGradient>`;
  const rg = (id, stops, attrs = 'cx="0.5" cy="0.5" r="0.5"') =>
    `<radialGradient id="${id}" ${attrs}>${stops.map(([o, c, op = 1]) => `<stop offset="${o}" style="stop-color:${c};stop-opacity:${op}"/>`).join('')}</radialGradient>`;

  const u = 'mbt-';
  const NAVY = 'oklch(0.36 0.14 265)', RED = 'oklch(0.58 0.2 26)', OCHRE = 'oklch(0.81 0.155 78)', TEAL = 'oklch(0.56 0.12 198)', CREAM = 'oklch(0.95 0.028 88)';
  const BANDS = [NAVY, CREAM, RED, OCHRE, CREAM, TEAL, NAVY, CREAM, RED, OCHRE];
  const XS = [];
  for (let x = 6; x <= 122; x += 2.5) XS.push(x);
  const COMB_X = [24, 44, 64, 84, 104];

  const bandY = (i, x, px, py, liveAmp, t) => {
    const base = 14 + i * 10.6;
    let y = base + 3.4 * Math.sin(x * 0.085 + i * 1.15);
    for (let c = 0; c < COMB_X.length; c++) {
      const dir = c % 2 === 0 ? 1 : -1;
      const cx = COMB_X[c] + liveAmp * 2.2 * Math.sin(t * 2.2 + c * 0.9);
      const dx = (x - cx) / 7.8;
      y += dir * 13.5 * Math.exp(-dx * dx);
    }
    if (liveAmp > 0.001) {
      const dpx = (x - px) / 14, dpy = (base - py) / 28;
      const pull = Math.exp(-dpx * dpx - dpy * dpy * 0.45);
      y += liveAmp * pull * (py - 64) * 0.52;
      y += liveAmp * 11 * Math.exp(-dpx * dpx) * Math.sin(t * 3.4 + i * 0.45) * 0.28;
    }
    return y;
  };
  const buildPaths = (px, py, amp, t) => BANDS.map((_, i) => {
    if (i === 0) return 'M8 8H120V120H8Z';
    const pts = XS.map(x => `${f(x)} ${f(bandY(i, x, px, py, amp, t))}`).join('L');
    return `M8 122L${pts}L120 122Z`;
  });

  svg.innerHTML = `<defs>
      ${lg(`${u}rim`, [[0, '#fff', 0.65], [0.5, '#fff', 0]], 'x1="0" y1="0" x2="1" y2="1"')}
      ${rg(`${u}lit`, [[0, '#fff', 0.38], [0.65, '#fff', 0.04], [1, '#fff', 0]], 'cx="0.3" cy="0.24" r="0.72"')}
      ${lg(`${u}bath`, [[0, 'oklch(0.97 0.024 90)'], [1, 'oklch(0.89 0.04 82)']], 'x1="0" y1="0" x2="1" y2="1"')}
      <clipPath id="${u}clip"><rect x="12" y="12" width="104" height="104" rx="20"/></clipPath>
    </defs>
    <rect x="11" y="11" width="106" height="106" rx="21" fill="oklch(0.32 0.09 264)"/>
    <g clip-path="url(#${u}clip)">
      <rect x="12" y="12" width="104" height="104" fill="url(#${u}bath)"/>
      ${BANDS.map(c => `<path class="mb-b" fill="${c}"/>`).join('')}
      <rect x="12" y="12" width="104" height="104" fill="url(#${u}lit)"/>
    </g>
    <rect x="11.5" y="11.5" width="105" height="105" rx="20.5" fill="none" stroke="url(#${u}rim)" stroke-width="2"/>`;

  svg.setAttribute('viewBox', '3 3 122 122');
  svg.style.overflow = 'visible';

  const els = [...svg.querySelectorAll('.mb-b')];
  const restPaths = buildPaths(64, 64, 0, 0);
  restPaths.forEach((p, i) => els[i].setAttribute('d', p));

  if (!gsap) return;
  const st = { px: 64, py: 64, pxTo: 64, pyTo: 64, amp: 0, ampTo: 0, live: false, t: 0 };
  let running = false;
  const tick = () => {
    st.t = gsap.ticker.time;
    st.px += (st.pxTo - st.px) * 0.14;
    st.py += (st.pyTo - st.py) * 0.14;
    st.amp += (st.ampTo - st.amp) * 0.1;
    buildPaths(st.px, st.py, st.amp, st.t).forEach((p, i) => els[i].setAttribute('d', p));
    if (!st.live && st.amp < 0.005) {
      st.amp = 0; restPaths.forEach((p, i) => els[i].setAttribute('d', p));
      running = false; gsap.ticker.remove(tick);
    }
  };
  const start = () => { if (!running) { running = true; gsap.ticker.add(tick); } };
  const localPt = e => {
    const r = svg.getBoundingClientRect(), v = svg.viewBox.baseVal;
    return r.width ? [v.x + ((e.clientX - r.left) / r.width) * v.width, v.y + ((e.clientY - r.top) / r.height) * v.height] : null;
  };
  const onMove = p => { if (p) { st.pxTo = clamp(p[0], 16, 112); st.pyTo = clamp(p[1], 16, 112); } };
  const onEnter = e => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    st.live = true; st.ampTo = 1; start();
    if (e && e.clientX != null) onMove(localPt(e));
    else { st.pxTo = 76; st.pyTo = 48; }
  };
  const onLeave = () => { st.live = false; st.ampTo = 0; st.pxTo = 64; st.pyTo = 64; start(); };
  a.addEventListener('pointerenter', onEnter);
  a.addEventListener('pointermove', e => { if (st.live) onMove(localPt(e)); });
  a.addEventListener('pointerleave', onLeave);
  a.addEventListener('focusin', () => onEnter(null));
  a.addEventListener('focusout', onLeave);
}

/* ---------- Boot Signal Dial directly on index.html ---------- */
async function boot() {
  const gsap = /** @type {any} */ (window).gsap;
  if (gsap?.ticker) {
    gsap.ticker.fps(MENU_FPS);
    gsap.ticker.lagSmoothing(500, Math.round(MENU_STEP));
  }
  const [toysData, seriesData, loopsList] = await Promise.all([
    fetch('toys.json').then(r => r.json()),
    fetch('series.json').then(r => r.json()),
    fetch('shared/loops/index.json').then(r => r.json()).catch(() => []),
  ]);
  const LOOPS = new Set(Array.isArray(loopsList) ? loopsList : []);
  const rootUrl = p => new URL(p, document.baseURI).href;

  root.classList.remove('js-reveal');

  /** @type {Map<string, HTMLAnchorElement>} */ const liveTiles = new Map();
  /** @type {Map<string, HTMLAnchorElement>} */ const labTiles = new Map();
  /** @type {Map<string, number[]>} */ const tileViewBox = new Map();
  /** @type {Set<string>} */ const preparedTiles = new Set();
  /** @type {any[]} */ const LAB = [];

  // Hold unmounted tiles off-DOM; prepare each SVG lazily on first mount.
  /** @param {string} id @param {HTMLAnchorElement | undefined} a */
  function prepareTile(id, a) {
    if (!a || preparedTiles.has(id)) return;
    preparedTiles.add(id);
    if (id === 'harmono') upgradeHarmonoIcon(a, gsap);
    if (id === 'marble') upgradeMarbleIcon(a, gsap);
    const svg = a.querySelector('.obj svg');
    stripHarshShadows(svg);
    const vb = svg?.getAttribute('viewBox')?.trim().split(/[\s,]+/).map(Number);
    if (vb && vb.length === 4 && vb[2] > 0) tileViewBox.set(id, vb);
  }

  /** @param {HTMLAnchorElement} a */
  function detachTile(a) {
    a.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
    a.dispatchEvent(new PointerEvent('pointerleave', { bubbles: false }));
    a.remove();
  }

  document.querySelectorAll('main .shelf .toy').forEach(node => {
    const a = /** @type {HTMLAnchorElement} */ (node);
    if (a.closest('section.lab')) return;
    if (!toysData[a.id] || toysData[a.id].number == null) return;
    a.classList.add('is-in');
    liveTiles.set(a.id, a);
    a.remove();
  });

  document.querySelectorAll('section.lab .shelf .toy').forEach(node => {
    const a = /** @type {HTMLAnchorElement} */ (node);
    const id = a.id;
    if (!id || liveTiles.has(id) || labTiles.has(id)) return;
    const t = toysData[id] || {};
    const labelNode = a.querySelector('.name');
    const rawName = labelNode ? [...labelNode.childNodes].filter(c => c.nodeType === 3).map(c => c.textContent).join('').trim() : id;
    const stage = labelNode?.querySelector('.alpha') ? 'Alpha' : labelNode?.querySelector('.beta') ? 'Beta' : '';
    a.classList.add('is-in');
    labTiles.set(id, a);
    LAB.push({ id, ...t, name: t.name || rawName, stage, href: a.getAttribute('href') || `${id}/index.html`, isLab: true });
    a.remove();
  });
  const labById = Object.fromEntries(LAB.map(t => [t.id, t]));

  const ALL = Object.entries(toysData)
    .filter(([id, t]) => t.number != null && liveTiles.has(id))
    .map(([id, t]) => ({ id, ...t, href: liveTiles.get(id)?.getAttribute('href') || `${id}/index.html`, emblemUrl: t.emblem ? rootUrl(t.emblem) : '', ink: inkOf(t.accent || '') }))
    .sort((a, b) => a.number - b.number);
  if (ALL.length < SIZE) return fail();
  const byId = Object.fromEntries(ALL.map(t => [t.id, t]));

  injectSprite(document);
  const liveTitleEl = document.getElementById('title');
  const onnoEl = document.querySelector('.credit .onno');
  const onnoName = [...'onnøzelaer'].map((ch, i) => `<span style="--i:${i}">${ch}</span>`).join('');

  const app = Object.assign(document.createElement('div'), { className: 'sm-app' });
  app.innerHTML = `
    <div class="sm-mesh" aria-hidden="true"></div>
    <div class="sm-foot-glow" aria-hidden="true"></div>

    <header class="sm-top-wrap">
      <div class="sm-top">
        <div class="sm-brand" id="sm-brand">
          <p class="sm-tagline">delightful and effective ways to deny shareholder value</p>
        </div>
        <nav class="bar sm-top-actions" aria-label="Menu actions">
          <span class="sm-reroll-wrap" id="sm-reroll-wrap">
            <button type="button" class="w" data-act="reroll" title="Re-roll (R)">Re-roll<kbd class="sm-kbd">R</kbd></button>
            <span class="sl">/</span>
          </span>
          <button type="button" class="w" data-sheet="all" aria-expanded="false">All Toys</button>
        </nav>
      </div>
    </header>

    <main class="sm-stage" id="sm-stage">
      <div class="sm-dial-wrap" id="sm-dial-wrap">
        <i class="sm-hand" id="sm-hand" aria-hidden="true"></i>
        <div class="sm-dial-mid" id="sm-dial-mid">
          <div class="sm-dial-frost" aria-hidden="true"></div>
          <div class="sm-copy" id="sm-copy">
            <div class="sm-dial-tech" id="sm-dial-tech"></div>
            <div class="sm-title-box"><h1 class="sm-title" id="sm-title"></h1></div>
            <p class="sm-motto" id="sm-motto"></p>
            <div class="sm-acc" id="sm-acc"></div>
            <div class="bar sm-gate"><a class="w" data-open>Play</a></div>
          </div>
        </div>
        <div class="sm-deck" id="sm-deck"></div>
      </div>
    </main>

    <footer class="sm-foot">
      <div class="bar sm-foot-meta">
        <span class="sm-ai-note" aria-label="Copyleft 2026, GPL-3.0"><svg class="sm-cl" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6.3"/><path d="M6.4 5.7a3.1 3.1 0 1 1 0 4.6"/></svg>2026 · GPL-3.0</span>
        <span class="sl">/</span>
        <span class="sm-ai-note">Made with the help of AI</span>
        <span class="sl">/</span>
        <a class="w sm-attr" href="${rootUrl('credits/')}">Attributions</a>
      </div>
      <span class="sm-sig" id="sm-sig" tabindex="0" aria-label="yet another onnøzelaer concoction">
        <span class="sm-sig-mark" id="sm-sig-mark"></span>
        <span class="sm-sig-label" aria-hidden="true">
          <span class="sm-sig-pre">yet another...</span>
          <span class="sm-sig-main">${onnoName}</span>
          <span class="sm-sig-post">concoction.</span>
        </span>
      </span>
    </footer>

    <section class="sm-sheet" id="sm-sheet" hidden aria-label="All toys">
      <div class="sm-sheet-top">
        <div class="sm-sheet-top-in">
          <div class="bar sm-sheet-hd" id="sm-sheet-hd"></div>
          <div class="bar sm-sheet-close">
            <button type="button" class="w sm-close-x" data-close aria-label="Close"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.2 3.2L12.8 12.8M12.8 3.2L3.2 12.8"/></svg></button>
          </div>
        </div>
      </div>
      <div class="sm-sheet-grid" id="sm-sheet-grid"></div>
    </section>
  `;
  document.body.append(app);
  root.dataset.dial = 'on';

  if (liveTitleEl) document.getElementById('sm-brand')?.prepend(liveTitleEl);
  if (onnoEl) document.getElementById('sm-sig-mark')?.append(onnoEl);

  const dialWrap = /** @type {HTMLElement} */ (document.getElementById('sm-dial-wrap'));
  const handNeedle = /** @type {HTMLElement} */ (document.getElementById('sm-hand'));
  const deckEl = /** @type {HTMLElement} */ (document.getElementById('sm-deck'));
  const rerollWrap = /** @type {HTMLElement} */ (document.getElementById('sm-reroll-wrap'));
  const dialTechEl = /** @type {HTMLElement} */ (document.getElementById('sm-dial-tech'));
  const titleBoxEl = /** @type {HTMLElement} */ (app.querySelector('.sm-title-box'));
  const titleEl = /** @type {HTMLElement} */ (document.getElementById('sm-title'));
  const mottoEl = /** @type {HTMLElement} */ (document.getElementById('sm-motto'));
  const accEl = /** @type {HTMLElement} */ (document.getElementById('sm-acc'));
  const openLink = /** @type {HTMLAnchorElement} */ (app.querySelector('[data-open]'));
  const sheetEl = /** @type {HTMLElement} */ (document.getElementById('sm-sheet'));
  const sheetHd = /** @type {HTMLElement} */ (document.getElementById('sm-sheet-hd'));
  const sheetGrid = /** @type {HTMLElement} */ (document.getElementById('sm-sheet-grid'));

  if (gsap) gsap.set(handNeedle, { xPercent: -50, yPercent: -100, transformOrigin: '50% 100%' });

  let dialGeom = [0, 0, 0];
  function measureDial() {
    const r = dialWrap.getBoundingClientRect();
    dialGeom = r.width ? [r.left + r.width / 2, r.top + r.height / 2, r.width * 0.5] : [0, 0, 0];
    return dialGeom;
  }
  const getDialGeom = () => (dialGeom[2] > 0 ? dialGeom : measureDial());
  const crt = await makeCRT(app).catch(() => null);
  const topMesh = await makeTopMesh(app).catch(() => null);
  const footMesh = await makeFooterMesh(app, getDialGeom).catch(() => null);
  /** @type {Awaited<ReturnType<typeof makeLabCRT>> | null} */ let labCrt = null;
  /** @type {Promise<any> | null} */ let labCrtBoot = null;
  const syncLabCRT = () => {
    const on = sheetOpen && seriesFilter === 'lab';
    if (!on) {
      delete sheetEl.dataset.labCrt;
      labCrt?.setActive(false);
      return;
    }
    const strength = labUnlocked ? 0.5 : 1.0;
    sheetEl.dataset.labCrt = labUnlocked ? 'grid' : 'gate';
    if (labCrt) { labCrt.setActive(true, strength); return; }
    if (!labCrtBoot) {
      labCrtBoot = makeLabCRT(sheetEl).catch(() => null).then(c => {
        labCrt = c;
        if (sheetOpen && seriesFilter === 'lab') labCrt?.setActive(true, labUnlocked ? 0.5 : 1.0);
      });
    }
  };
  const still = matchMedia('(prefers-reduced-motion: reduce)');
  const shuffle = a => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };

  /** @type {any[]} */ let queue = [];
  /** @type {any[]} */ let hand = [];
  /** @type {any} */ let active = null;
  let sheetOpen = false, seriesFilter = initView === 'lab' ? 'lab' : 'all', dwellTimer = 0;
  let isStandby = false, idleTimer = 0, sleepTimer = 0, leaveTimer = 0, pointerSelection = false;
  let prefetchToken = 0;
  const IDLE_MS = 15000, SLEEP_MS = 60000;
  let labUnlocked = false;
  try { labUnlocked = sessionStorage.getItem('stimming.lab.ok') === '1'; } catch {}
  /** @type {Map<string, string>} */ const titleFitCache = new Map();
  /** @type {IntersectionObserver | null} */ let sheetIO = null;
  /** @type {Map<Element, HTMLAnchorElement>} */ const mountedSheetTiles = new Map();

  /** @param {any} t */
  function alignedFlashHTML(t) {
    if (!t.emblemUrl) return `<div class="sm-flash-frame"><i class="sm-no-em">${t.name[0]}</i></div>`;
    const vb = tileViewBox.get(t.id);
    let style = `--em:url('${t.emblemUrl}')`;
    if (vb) {
      const [vx, vy, vw] = vb;
      style += `;--ew:${((128 / vw) * 100).toFixed(3)}%;--ex:${((-vx / vw) * 100).toFixed(3)}%;--ey:${((-vy / vw) * 100).toFixed(3)}%`;
    }
    return `<div class="sm-flash-frame"><i style="${style}"></i></div>`;
  }

  /** @param {any} toy @param {number} idx */
  function makeCell(toy, idx) {
    const cell = document.createElement('div');
    cell.className = 'sm-cell';
    cell.dataset.id = toy.id;
    const rad = (idx * 360 / SIZE) * Math.PI / 180;
    cell.style.setProperty('--slot-ink', toy.ink || '#fff');
    cell.style.setProperty('--dx', Math.sin(rad).toFixed(4));
    cell.style.setProperty('--dy', (-Math.cos(rad)).toFixed(4));
    const live = Object.assign(document.createElement('div'), { className: 'sm-live' });
    const tile = liveTiles.get(toy.id);
    if (tile) {
      prepareTile(toy.id, tile);
      live.append(tile);
    }
    const fl = Object.assign(document.createElement('div'), { className: 'sm-flash' });
    fl.setAttribute('aria-hidden', 'true');
    fl.innerHTML = alignedFlashHTML(toy);
    cell.append(live, fl);
    return cell;
  }

  function parkAllTiles() {
    app.querySelectorAll('a.toy').forEach(a => detachTile(/** @type {HTMLAnchorElement} */ (a)));
    deckEl.innerHTML = '';
  }

  function pulseDialRing() {
    if (still.matches) return;
    dialWrap.classList.remove('is-ring-in');
    void dialWrap.offsetWidth;
    dialWrap.classList.add('is-ring-in');
  }

  /** @param {HTMLElement[]} cells */
  function flashCells(cells) {
    if (still.matches) return;
    cells.forEach((cell, i) => {
      cell.classList.remove('is-intro');
      cell.style.setProperty('--stagger', `${i * 52}ms`);
    });
    void app.offsetWidth;
    cells.forEach(cell => cell.classList.add('is-intro'));
  }

  /** @param {string} [id] */
  function fitTitle(id = active?.id || '') {
    const maxW = titleBoxEl.clientWidth;
    if (!maxW) return;
    const key = id ? `${id}@${maxW}` : '';
    if (key && titleFitCache.has(key)) {
      const cached = titleFitCache.get(key) || '';
      if (cached) titleEl.style.setProperty('--title-fit', cached);
      else titleEl.style.removeProperty('--title-fit');
      return;
    }
    titleEl.style.removeProperty('--title-fit');
    let basePx = parseFloat(getComputedStyle(titleEl).fontSize) || 32;
    const maxH = basePx * 2.35;
    let fitted = '';
    let guard = 0;
    while ((titleEl.scrollWidth > maxW + 1 || titleEl.scrollHeight > maxH) && basePx > 16 && guard++ < 14) {
      basePx = Math.max(16, basePx - 1.5);
      fitted = `${basePx}px`;
      titleEl.style.setProperty('--title-fit', fitted);
    }
    if (key) titleFitCache.set(key, fitted);
  }

  function updateCRTSpot() {
    if (!crt) return;
    const g = measureDial();
    const w = app.clientWidth || 1, h = app.clientHeight || 1;
    const cx = g[2] > 0 ? g[0] : w * 0.5;
    const cy = g[2] > 0 ? g[1] : h * 0.5;
    const rad = (g[2] > 0 ? g[2] * 2 : Math.min(w, h) * 0.72) * 0.6;
    crt.setSpot(cx, cy, rad);
  }

  /** @param {number} idx @param {boolean} [snap] */
  function pointHand(idx, snap = false) {
    if (idx < 0) return;
    const deg = idx * 360 / SIZE;
    crt?.aim(deg, snap);
    if (!gsap) return;
    if (snap || still.matches) gsap.set(handNeedle, { rotation: deg });
    else gsap.to(handNeedle, { rotation: `${deg}_short`, duration: 0.65, ease: 'expo.out', overwrite: true });
  }

  function bumpSleep() {
    clearTimeout(sleepTimer);
    crt?.setSleeping(false);
    sleepTimer = window.setTimeout(() => {
      if (!sheetOpen) crt?.setSleeping(true);
    }, SLEEP_MS);
  }

  /** @param {boolean} [snap] */
  function enterStandby(snap = false) {
    clearTimeout(leaveTimer);
    if (active && liveTiles.has(active.id)) {
      liveTiles.get(active.id)?.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
    }
    isStandby = true;
    app.setAttribute('data-standby', '');
    deckEl.querySelectorAll('.sm-cell.is-act').forEach(c => c.classList.remove('is-act'));
    crt?.setStandby(true, snap);
  }

  function bumpIdle() {
    bumpSleep();
    clearTimeout(idleTimer);
    idleTimer = window.setTimeout(() => {
      if (!sheetOpen && !isStandby) enterStandby(false);
    }, IDLE_MS);
  }

  /** @param {any[]} toys */
  function prefetchHand(toys) {
    if (!crt) return;
    const conn = /** @type {any} */ (navigator).connection;
    if (conn && (conn.saveData || /2g/.test(conn.effectiveType || ''))) return;
    const token = ++prefetchToken;
    const urls = toys.map(t => rootUrl(`shared/stills/${t.id}.webp`));
    let idx = 0;
    const schedule = /** @type {any} */ (window).requestIdleCallback || (fn => setTimeout(fn, 240));
    const step = () => {
      if (token !== prefetchToken || sheetOpen || document.hidden) return;
      for (let k = 0; k < 2 && idx < urls.length; k++, idx++) crt.preloadStill(urls[idx]);
      if (idx < urls.length) schedule(step, { timeout: 1200 });
    };
    schedule(step, { timeout: 1200 });
  }

  /** @param {any} toy @param {{ immediate?: boolean, fromPointer?: boolean }} [opts] */
  function select(toy, { immediate = false, fromPointer = false } = {}) {
    if (!toy) return;
    clearTimeout(leaveTimer);
    const waking = isStandby;
    const changed = waking || !active || active.id !== toy.id;
    const prevId = active?.id;
    active = toy;
    pointerSelection = fromPointer;
    isStandby = false;
    app.removeAttribute('data-standby');
    bumpIdle();

    const lchs = parseToyLCH(toy.accent);
    app.style.setProperty('--acc-ink', toy.ink || '#fff');
    app.style.setProperty('--c1', `oklch(${lchs[0][0]} ${lchs[0][1]} ${lchs[0][2]})`);
    app.style.setProperty('--c2', `oklch(${lchs[1][0]} ${lchs[1][1]} ${lchs[1][2]})`);
    topMesh?.setColours(lchs, immediate);

    const idx = hand.findIndex(t => t.id === toy.id);
    if (changed) {
      if (prevId && prevId !== toy.id && liveTiles.has(prevId)) {
        liveTiles.get(prevId)?.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
      }
      if (!fromPointer && liveTiles.has(toy.id)) {
        const tile = liveTiles.get(toy.id);
        if (tile?.parentElement?.classList.contains('sm-live')) {
          tile.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
        }
      }
      titleEl.textContent = toy.name;
      fitTitle(toy.id);
      if (!immediate && !still.matches) {
        titleEl.classList.remove('is-unfurl');
        void titleEl.offsetWidth;
        titleEl.classList.add('is-unfurl');
      }
      mottoEl.textContent = toy.tag || '';
      const fl = flagsHTML(toy.access);
      accEl.innerHTML = (fl ? `<div class="sm-acc-flags">${fl}</div>` : '')
        + (toy.sound ? `<span class="acc-i acc-snd${immediate ? '' : ' is-flash'}">${glyph('sound')}<b>Best with sound</b></span>` : '');
      dialTechEl.innerHTML = techHTML(toy.tech);
      openLink.href = rootUrl(toy.href);
      const stillUrl = rootUrl(`shared/stills/${toy.id}.webp`);
      const loopUrl = LOOPS.has(toy.id) ? rootUrl(`shared/loops/${toy.id}.mp4`) : null;
      crt?.show(stillUrl, loopUrl);
    }

    deckEl.querySelectorAll('.sm-cell').forEach(c => c.classList.toggle('is-act', /** @type {HTMLElement} */ (c).dataset.id === toy.id));
    if (idx >= 0) pointHand(idx, immediate);
  }

  /** @param {string | null} [pinId] */
  function deal(pinId = null) {
    clearTimeout(dwellTimer);
    clearTimeout(leaveTimer);
    bumpSleep();
    const next = [];
    if (pinId && byId[pinId]) next.push(byId[pinId]);
    while (next.length < SIZE) {
      if (!queue.length) {
        let seen = [];
        try { seen = JSON.parse(localStorage.getItem('stimming.seen') || '[]'); } catch {}
        const seenSet = new Set(seen);
        queue = [
          ...shuffle(ALL.filter(t => !seenSet.has(t.id) && !next.includes(t))),
          ...shuffle(ALL.filter(t => seenSet.has(t.id) && !next.includes(t))),
        ];
      }
      const pick = queue.shift();
      if (pick && !next.includes(pick)) next.push(pick);
    }
    hand = next;
    try {
      const prev = JSON.parse(localStorage.getItem('stimming.seen') || '[]');
      localStorage.setItem('stimming.seen', JSON.stringify([...hand.map(t => t.id), ...prev].slice(0, SIZE * 3)));
    } catch {}
    parkAllTiles();
    const cells = hand.map((t, i) => {
      const cell = makeCell(t, i);
      deckEl.append(cell);
      return cell;
    });
    flashCells(cells);
    pulseDialRing();
    prefetchHand(hand);
    if (pinId && byId[pinId]) {
      select(hand[0], { immediate: true, fromPointer: false });
    } else {
      active = null;
      enterStandby(false);
      updateCRTSpot();
    }
  }

  function clearSheetTiles() {
    sheetIO?.disconnect();
    sheetIO = null;
    for (const tile of mountedSheetTiles.values()) detachTile(tile);
    mountedSheetTiles.clear();
    sheetGrid.innerHTML = '';
  }

  function restoreStageTiles() {
    clearSheetTiles();
    deckEl.querySelectorAll('.sm-cell').forEach(cell => {
      const live = cell.querySelector('.sm-live');
      const id = /** @type {HTMLElement} */ (cell).dataset.id || '';
      const tile = liveTiles.get(id);
      if (live && tile) {
        prepareTile(id, tile);
        live.append(tile);
      }
    });
  }

  let hexStackHTML = '';
  const getHexStackHTML = () => {
    if (hexStackHTML) return hexStackHTML;
    hexStackHTML = HEX_PREVIEW_KEYS
      .filter(k => seriesData[k]?.icon)
      .map(k => `<span class="sm-hex-chip">${shotIcon(k, seriesData[k].icon, { tilt: 'Dutch', frame: 'Hex ring', line: 'Series', c: seriesData[k].color })}</span>`)
      .join('');
    return hexStackHTML;
  };

  /** @param {any} t */
  function makeSheetCard(t) {
    const card = document.createElement('div');
    card.className = `sm-card${active && active.id === t.id ? ' is-act' : ''}`;
    card.dataset.id = t.id;
    if (t.isLab) card.dataset.lab = '1';
    const ic = Object.assign(document.createElement('div'), { className: 'sm-card-ic' });
    const label = Object.assign(document.createElement('span'), { className: 'sm-card-name' });
    label.innerHTML = t.stage ? `${t.name}<span class="sm-card-stage">(${t.stage})</span>` : t.name;
    card.append(ic, label);
    return card;
  }

  /** @param {Map<string, HTMLAnchorElement>} tiles */
  function mountSheetObserver(tiles) {
    /** @param {Element} card */
    const attach = card => {
      if (mountedSheetTiles.has(card)) return;
      const id = /** @type {HTMLElement} */ (card).dataset.id || '';
      const tile = tiles.get(id);
      const ic = card.querySelector('.sm-card-ic');
      if (!tile || !ic) return;
      prepareTile(id, tile);
      ic.append(tile);
      mountedSheetTiles.set(card, tile);
    };
    /** @param {Element} card */
    const release = card => {
      const tile = mountedSheetTiles.get(card);
      if (!tile) return;
      detachTile(tile);
      mountedSheetTiles.delete(card);
    };
    if (!('IntersectionObserver' in window)) {
      sheetGrid.querySelectorAll('.sm-card').forEach(attach);
      return;
    }
    sheetIO = new IntersectionObserver(entries => {
      for (const e of entries) {
        if (e.isIntersecting) attach(e.target);
        else release(e.target);
      }
    }, { root: sheetGrid, rootMargin: '280px 0px' });
    sheetGrid.querySelectorAll('.sm-card').forEach(card => sheetIO?.observe(card));
  }

  /** @param {string} name @param {string} [iconHTML] @param {string} [color] */
  function makeRubricHeader(name, iconHTML = '', color = '') {
    const hd = Object.assign(document.createElement('h2'), { className: 'sm-rubric' });
    if (color) hd.style.setProperty('--c', color);
    hd.innerHTML = `<span class="at">${iconHTML}<span></span></span>`;
    const span = hd.querySelector('.at > span');
    if (span) span.textContent = name;
    return hd;
  }

  function renderSheet() {
    clearSheetTiles();
    sheetHd.innerHTML = `<button type="button" class="w" data-ser="all" aria-pressed="${seriesFilter === 'all'}">All ${ALL.length}</button>`
      + `<span class="sl">/</span>`
      + `<span class="sm-series-soon" aria-disabled="true"><span class="sm-hex-stack" aria-hidden="true">${getHexStackHTML()}</span><span>Series coming soon</span></span>`
      + `<span class="sl sm-div">|</span>`
      + `<button type="button" class="w" data-ser="lab" aria-pressed="${seriesFilter === 'lab'}">Lab${labUnlocked ? ` ${LAB.length}` : ''}</button>`;

    if (seriesFilter === 'lab' && !labUnlocked) {
      syncLabCRT();
      sheetGrid.classList.add('is-gate');
      sheetGrid.innerHTML = `
        <div class="sm-lab-gate" id="sm-lab-gate">
          <span class="sm-lab-eyebrow"><svg viewBox="0 0 16 16" aria-hidden="true"><rect x="3" y="7.5" width="10" height="6.8" rx="1.2"/><path d="M5.2 7.5V5.2a2.8 2.8 0 0 1 5.6 0v2.3"/></svg>Lab access</span>
          <h2 class="sm-lab-title" data-t="Password required">Password required</h2>
          <form class="sm-lab-form" id="sm-lab-form" autocomplete="off">
            <input type="password" class="sm-lab-in" id="sm-lab-in" placeholder="Password" autocomplete="new-password" data-1p-ignore="true" data-lpignore="true" spellcheck="false" aria-label="Lab password">
            <button type="submit" class="w sm-lab-go">Enter</button>
          </form>
          <p class="sm-lab-err" id="sm-lab-err" aria-live="polite"></p>
        </div>
      `;
      const form = /** @type {HTMLFormElement} */ (sheetGrid.querySelector('#sm-lab-form'));
      const inp = /** @type {HTMLInputElement} */ (sheetGrid.querySelector('#sm-lab-in'));
      const err = /** @type {HTMLElement} */ (sheetGrid.querySelector('#sm-lab-err'));
      const gateBox = /** @type {HTMLElement} */ (sheetGrid.querySelector('#sm-lab-gate'));
      form.addEventListener('submit', e => {
        e.preventDefault();
        if (inp.value.trim().toLowerCase() === LAB_PASS) {
          labUnlocked = true;
          try { sessionStorage.setItem('stimming.lab.ok', '1'); } catch {}
          renderSheet();
        } else {
          err.textContent = 'Access denied // signal rejected';
          gateBox.classList.remove('is-err');
          void gateBox.offsetWidth;
          gateBox.classList.add('is-err');
          inp.select();
          inp.focus();
        }
      });
      requestAnimationFrame(() => inp.focus());
      return;
    }

    syncLabCRT();
    sheetGrid.classList.remove('is-gate');
    const frag = document.createDocumentFragment();
    if (seriesFilter === 'lab') {
      const slate = LAB.filter(t => t.slate);
      const bench = LAB.filter(t => t.bench && !t.slate);
      const body = LAB.filter(t => !t.slate && !t.bench);
      if (slate.length) {
        frag.append(makeRubricHeader('Slate'));
        slate.forEach(t => frag.append(makeSheetCard(t)));
      }
      const grouped = new Map(Object.keys(seriesData).map(k => [k, /** @type {any[]} */ ([])]));
      /** @type {any[]} */ const rest = [];
      body.forEach(t => (grouped.get(t.series) || rest).push(t));
      for (const [k, items] of grouped) {
        if (!items.length) continue;
        const s = seriesData[k];
        const iconHTML = s.icon ? shotIcon(k, s.icon, { tilt: 'Dutch', frame: 'Hex ring', line: 'Series', c: s.color }) : '';
        frag.append(makeRubricHeader(s.name, iconHTML, s.color));
        items.forEach(t => frag.append(makeSheetCard(t)));
      }
      if (rest.length) {
        frag.append(makeRubricHeader('Other'));
        rest.forEach(t => frag.append(makeSheetCard(t)));
      }
      if (bench.length) {
        frag.append(makeRubricHeader('Bench'));
        bench.forEach(t => frag.append(makeSheetCard(t)));
      }
      sheetGrid.append(frag);
      mountSheetObserver(labTiles);
    } else {
      ALL.forEach(t => frag.append(makeSheetCard(t)));
      sheetGrid.append(frag);
      mountSheetObserver(liveTiles);
    }
  }

  /** @param {boolean} [force] */
  function toggleSheet(force) {
    const next = typeof force === 'boolean' ? force : !sheetOpen;
    if (next === sheetOpen) return;
    sheetOpen = next;
    app.toggleAttribute('data-sheet-open', sheetOpen);
    app.querySelectorAll('[data-sheet="all"]').forEach(b => b.setAttribute('aria-expanded', String(sheetOpen)));
    sheetEl.hidden = !sheetOpen;
    crt?.setPaused(sheetOpen);
    topMesh?.setPaused(sheetOpen);
    footMesh?.setPaused(sheetOpen);
    if (sheetOpen) {
      clearTimeout(idleTimer);
      clearTimeout(sleepTimer);
      deckEl.querySelectorAll('a.toy').forEach(a => detachTile(/** @type {HTMLAnchorElement} */ (a)));
      renderSheet();
    } else {
      syncLabCRT();
      restoreStageTiles();
      updateCRTSpot();
      bumpSleep();
      if (!isStandby) bumpIdle();
    }
  }

  /** @param {number} dir */
  function step(dir) {
    const list = sheetOpen ? ALL : hand;
    if (!list.length) return;
    if (isStandby || !active) { select(list[dir >= 0 ? 0 : list.length - 1], { fromPointer: false }); return; }
    const idx = list.findIndex(t => active && t.id === active.id);
    select(list[(idx < 0 ? 0 : idx + dir + list.length) % list.length], { fromPointer: false });
  }

  /* ---------- Events ---------- */
  dialWrap.addEventListener('pointerenter', () => clearTimeout(leaveTimer));
  dialWrap.addEventListener('pointerleave', e => {
    if (e.pointerType === 'touch') return;
    clearTimeout(dwellTimer);
    if (pointerSelection && !sheetOpen && !isStandby) {
      clearTimeout(leaveTimer);
      leaveTimer = window.setTimeout(() => { if (!sheetOpen) enterStandby(false); }, 550);
    }
  });
  deckEl.addEventListener('pointerover', e => {
    if (e.pointerType === 'touch') return;
    clearTimeout(leaveTimer);
    const c = /** @type {HTMLElement | null} */ (/** @type {Element} */ (e.target).closest('.sm-cell'));
    if (!c) return;
    clearTimeout(dwellTimer);
    dwellTimer = window.setTimeout(() => select(byId[c.dataset.id || ''], { fromPointer: true }), 45);
  });
  deckEl.addEventListener('pointerleave', () => clearTimeout(dwellTimer));
  deckEl.addEventListener('click', e => {
    const c = /** @type {HTMLElement | null} */ (/** @type {Element} */ (e.target).closest('.sm-cell'));
    if (!c) return;
    const toy = byId[c.dataset.id || ''];
    if (!toy) return;
    clearTimeout(dwellTimer);
    if (isStandby || !active || active.id !== toy.id) {
      e.preventDefault();
      select(toy, { fromPointer: true });
    }
  });
  app.addEventListener('pointermove', () => {
    if (sheetOpen) return;
    bumpSleep();
    if (!isStandby) bumpIdle();
  }, { passive: true });
  app.addEventListener('pointerdown', () => { if (!sheetOpen) bumpSleep(); }, { passive: true });

  sheetGrid.addEventListener('click', e => {
    const targetEl = /** @type {Element} */ (e.target);
    const c = /** @type {HTMLElement | null} */ (targetEl.closest('.sm-card'));
    if (!c || targetEl.closest('a.toy')) return;
    const toy = c.dataset.lab ? labById[c.dataset.id || ''] : byId[c.dataset.id || ''];
    if (toy) location.href = rootUrl(toy.href || `${toy.id}/index.html`);
  });

  sheetHd.addEventListener('click', e => {
    const s = /** @type {HTMLElement | null} */ (/** @type {Element} */ (e.target).closest('[data-ser]'));
    if (s && s.dataset.ser) { seriesFilter = s.dataset.ser; renderSheet(); }
  });
  sheetEl.querySelector('[data-close]')?.addEventListener('click', () => toggleSheet(false));

  app.addEventListener('click', e => {
    const targetEl = /** @type {Element} */ (e.target);
    if (targetEl.closest('[data-act="reroll"]')) { if (sheetOpen) toggleSheet(false); deal(); return; }
    if (targetEl.closest('[data-sheet="all"]')) { seriesFilter = 'all'; toggleSheet(); }
  });

  let resizeRaf = 0;
  new ResizeObserver(() => {
    if (resizeRaf) return;
    resizeRaf = requestAnimationFrame(() => {
      resizeRaf = 0;
      titleFitCache.clear();
      fitTitle();
      if (!sheetOpen) {
        updateCRTSpot();
        footMesh?.draw?.();
        topMesh?.draw?.();
      }
      if (sheetOpen && seriesFilter === 'lab') labCrt?.draw?.();
    });
  }).observe(app);

  let wheelAt = 0;
  app.addEventListener('wheel', e => {
    if (sheetOpen) return;
    bumpSleep();
    const now = performance.now();
    if (now - wheelAt < 160) return;
    if (Math.abs(e.deltaY) < 12 && Math.abs(e.deltaX) < 12) return;
    wheelAt = now;
    step((e.deltaY || e.deltaX) > 0 ? 1 : -1);
  }, { passive: true });

  window.addEventListener('keydown', e => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (!sheetOpen) bumpSleep();
    const targetEl = /** @type {HTMLElement | null} */ (e.target);
    if (targetEl && targetEl.closest('input, textarea, select')) {
      if (e.key === 'Escape') { targetEl.blur(); toggleSheet(false); }
      return;
    }
    const k = e.key.toLowerCase();
    if (k === 'escape') { toggleSheet(false); return; }
    if (k === 'r') { if (sheetOpen) toggleSheet(false); deal(); return; }
    if (k === 'a') { seriesFilter = 'all'; toggleSheet(); return; }
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); step(1); return; }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); step(-1); return; }
    if (e.key === 'Enter' && active && !targetEl?.closest('button, a')) { location.href = rootUrl(active.href); }
  });

  const urlParams = new URLSearchParams(location.search);
  deal(urlParams.get('toy'));
  if (initView === 'all' || initView === 'lab') toggleSheet(true);
  setTimeout(() => rerollWrap.setAttribute('data-on', ''), matchMedia('(max-width: 860px)').matches ? 400 : 1600);
  requestAnimationFrame(() => { fitTitle(); updateCRTSpot(); });
}
