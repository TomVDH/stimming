// Spectroscope: a lamp, a wedge and a plate of emission lines.
// The readout comes from Flame test, unchanged; the lamp replaces the flame.
import { fitCanvas, onQuality, linFit, css, reduced, whenVisible, keyWord, onTouch } from '../shared/stim.js';

const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
const lerp = (a, b, t) => a + (b - a) * t;
const rnd = (a, b) => a + Math.random() * (b - a);

/* ---------- elements ---------- */
// Lines: [nm, weight]. Bands: [nm, weight, width in nm].
// Weights come from flame spectra, then tuning by eye.
const SALTS = [
  { id: 'li', label: 'Lithium', col: [0.56, 0.21, 24], tau: 2.5,
    lines: [[670.8, 1], [610.4, 0.25], [460.3, 0.08]] },
  { id: 'na', label: 'Sodium', col: [0.82, 0.17, 80], tau: 6,
    lines: [[589.0, 1], [589.6, 0.5]] },
  { id: 'k', label: 'Potassium', col: [0.68, 0.12, 310], tau: 2.5,
    lines: [[766.5, 0.8], [769.9, 0.5], [404.4, 0.35], [404.7, 0.2]] },
  { id: 'cu', label: 'Copper', col: [0.74, 0.15, 170], tau: 2.5,
    lines: [[510.5, 0.5], [515.3, 0.6], [521.8, 0.7], [428, 0.35, 6], [435, 0.4, 6], [443, 0.35, 6], [452, 0.3, 6], [488, 0.3, 5], [498, 0.35, 5], [535, 0.4, 14]] },
  { id: 'sr', label: 'Strontium', col: [0.6, 0.21, 28], tau: 2.5,
    lines: [[460.7, 0.3], [606, 0.6, 8], [646, 0.7, 6], [659, 0.8, 5], [668, 0.9, 6], [682, 0.6, 6], [636, 0.4, 5], [674, 0.5, 4]] },
  { id: 'ca', label: 'Calcium', col: [0.66, 0.17, 45], tau: 2.5,
    lines: [[422.7, 0.5], [554, 0.6, 8], [602, 0.5, 6], [622, 1, 7], [646, 0.35, 6]] },
  { id: 'ba', label: 'Barium', col: [0.86, 0.13, 125], tau: 2.5,
    lines: [[553.5, 1], [455.4, 0.2], [493.4, 0.2], [487, 0.3, 5], [513, 0.5, 6], [524, 0.55, 6], [534, 0.45, 6]] },
];
const NA = SALTS.findIndex(s => s.id === 'na');
const MAXL = 48;
// Settings options: one dot and one number key per element.
export const ELEMENTS = SALTS.map((s, i) => ({ value: s.id, label: s.label, dot: css(s.col), key: String(i + 1) }));

/* ---------- colour of one wavelength ---------- */
// The CIE 1931 multi-lobe fit, as in the table.
// The result is linear sRGB, peak channel one, dim edges lifted.
const g3 = (x, m, s1, s2) => { const t = (x - m) / (x < m ? s1 : s2); return Math.exp(-0.5 * t * t); };
function spectral(n) {
  const X = 1.056 * g3(n, 599.8, 37.9, 31) + 0.362 * g3(n, 442, 16, 26.7) - 0.065 * g3(n, 501.1, 20.4, 26.2);
  const Y = 0.821 * g3(n, 568.8, 46.9, 40.5) + 0.286 * g3(n, 530.9, 16.3, 31.1);
  const Z = 1.217 * g3(n, 437, 11.8, 36) + 0.681 * g3(n, 459, 26, 13.8);
  const c = [3.2406 * X - 1.5372 * Y - 0.4986 * Z, -0.9689 * X + 1.8758 * Y + 0.0415 * Z, 0.0557 * X - 0.204 * Y + 1.057 * Z].map(v => Math.max(0, v));
  const m = Math.max(...c, 1e-5), b = 0.7 + 0.3 * clamp(Y * 1.3);
  // The fit's far tails turn green, so the edges hold red and violet.
  const r = clamp((n - 690) / 30), v = clamp((415 - n) / 20);
  const sm = x => x * x * (3 - 2 * x), R = [1, 0, 0], V = [0.55, 0, 1];
  return c.map((x, i) => lerp(lerp(x / m, R[i], sm(r)), V[i], sm(v)) * b);
}
SALTS.forEach(s => { s.lin = linFit(...s.col); s.lines.forEach(l => { l.rgb = spectral(l[0]); }); });

/* ---------- shaders ---------- */
const TRI = `#version 300 es
out vec2 vUv;
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  vUv = p;
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;
const HEAD = `#version 300 es
precision highp float;
precision highp sampler2D;
in vec2 vUv;
out vec4 o;
`;
const NOISE = `
float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p), u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}
float fbm(vec2 p) {
  float s = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) { s += a * vnoise(p); p = p * 2.03 + vec2(1.7, 9.2); a *= 0.5; }
  return s;
}
`;
// The scene: lamp, beam, wedge, fan and plate, in device pixels.
const SCENE_FS = HEAD + NOISE + `
uniform vec2 uRes;
uniform float uS, uTime, uDpr;
uniform vec4 uLamp;         // body centre x, y, half width, half height
uniform vec2 uAp;           // the aperture, where the beam leaves
uniform vec3 uBeam;
uniform float uPuff, uCobalt, uGrating, uFanY;
uniform vec3 uWedge;        // centre x, y, half side
uniform vec2 uIn, uOut;     // beam entry and exit on the wedge
uniform vec4 uPlate;        // x0, y0, x1, y1
uniform vec4 uLoupe;        // centre x, y, radius, shown
uniform int uN;
uniform vec4 uLX[${MAXL}];  // plate x, sigma px, intensity, band sigma
uniform vec3 uLC[${MAXL}];

// Plate x to wavelength: a prism squeezes red, a grating spaces evenly.
float plateLam(float x) {
  float t = clamp((uPlate.z - x) / (uPlate.z - uPlate.x), 0.0, 1.0);
  float a = 1.0 / (780.0 * 780.0), b = 1.0 / (390.0 * 390.0);
  return mix(mix(1.0 / sqrt(a + t * (b - a)), 780.0 - 390.0 * t, 0.5), 780.0 - 390.0 * t, uGrating);
}
float sdTri(vec2 p, float r) {
  const float k = 1.7320508;
  p.x = abs(p.x) - r;
  p.y = p.y + r / k;
  if (p.x + k * p.y > 0.0) p = vec2(p.x - k * p.y, -k * p.x - p.y) / 2.0;
  p.x -= clamp(p.x, -2.0 * r, 0.0);
  return -length(p) * sign(p.y);
}
float sdBox(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}
float segDist(vec2 p, vec2 a, vec2 b, out float s) {
  vec2 ab = b - a;
  s = clamp(dot(p - a, ab) / dot(ab, ab), 0.0, 1.0);
  return length(p - a - ab * s);
}
// The lamp: the table's lamp body, with a glowing element aperture.
// It returns colour in rgb and cover in a.
vec4 lamp(vec2 p) {
  vec2 q = p - uLamp.xy;
  float hw = uLamp.z, hh = uLamp.w;
  float d = sdBox(q, vec2(hw, hh), hh * 0.42);
  if (d > 2.0 * uDpr) return vec4(0.0);
  float cover = 1.0 - smoothstep(-0.5 * uDpr, 0.5 * uDpr, d);
  float v = clamp(q.y / hh * 0.5 + 0.5, 0.0, 1.0);
  vec3 body = mix(vec3(0.008, 0.009, 0.012), vec3(0.07, 0.075, 0.09), v * v);
  // The bezel is the lighter front quarter.
  if (q.x > 0.5 * hw) body = mix(vec3(0.02, 0.022, 0.028), vec3(0.2, 0.21, 0.24), v * v);
  // Each fin is a dark groove with a lit edge.
  for (int i = 0; i < 4; i++) {
    float x = -hw * (0.78 - float(i) * 0.14);
    float on = step(abs(q.y), hh * 0.62);
    body *= 1.0 - 0.8 * on * exp(-pow((q.x - x) / (0.8 * uDpr), 2.0));
    body += on * vec3(0.05, 0.055, 0.07) * exp(-pow((q.x - x - 1.2 * uDpr) / (0.6 * uDpr), 2.0));
  }
  body += vec3(0.12, 0.13, 0.16) * exp(-pow(d / (0.8 * uDpr), 2.0)) * 0.6;
  // The aperture: a dark socket, then the element's glow.
  vec2 a = (q - vec2(hw * 0.97, 0.0)) / (hh * vec2(0.16, 0.5));
  body = mix(body, vec3(0.004, 0.004, 0.006), 1.0 - smoothstep(0.9, 1.0, length(a)));
  vec2 g = (q - vec2(hw * 0.98, 0.0)) / (hh * vec2(0.09, 0.32));
  body += (uBeam * 1.6 + vec3(0.08)) * (1.0 + 0.8 * uPuff) * (1.0 - smoothstep(0.8, 1.0, length(g)));
  return vec4(body, cover);
}

void main() {
  vec2 p = gl_FragCoord.xy;
  float t = uTime, S = uS;
  vec3 c = vec3(0.0);
  vec3 fl = uBeam * 0.7;

  // The room: dark, lit only by the lamp.
  vec2 qf = (p - uAp) / S;
  c += fl * 0.06 * exp(-dot(qf, qf) * 7.0);
  vec2 qp = (p - uAp - vec2(0.02 * S, -0.08 * S)) / (S * vec2(0.2, 0.035));
  c += fl * 0.12 * exp(-dot(qp, qp));

  // The beam: the lamp's light, from its aperture to the wedge.
  float s;
  float db = segDist(p, uAp, uIn, s);
  float bw = S * 0.007;
  float haze = 0.7 + 0.3 * fbm(p / S * 7.0 + vec2(t * 0.06, 0.0));
  c += uBeam * exp(-pow(db / bw, 2.0)) * smoothstep(0.0, 0.08, s) * 0.55 * haze;
  c += uBeam * exp(-pow(db / (bw * 5.0), 2.0)) * smoothstep(0.0, 0.2, s) * 0.06;
  c += uBeam * (0.5 + 0.4 * uPuff) * exp(-dot(p - uAp, p - uAp) / (bw * bw * 6.0));

  // The wedge: an outline with lit edges, and the beam inside it.
  vec2 wp = p - uWedge.xy;
  float dt = sdTri(vec2(wp.x, -wp.y), uWedge.z);
  float edge = exp(-pow(dt / (1.1 * uDpr), 2.0));
  float lit = 0.5 + 0.5 * clamp(dot(normalize(wp + 1e-4), normalize(uAp - uWedge.xy)), -1.0, 1.0);
  c += edge * (vec3(0.05, 0.06, 0.08) + fl * 0.25 * lit);
  if (dt < 0.0) {
    c += vec3(0.008, 0.01, 0.014);
    float di = segDist(p, uIn, uOut, s);
    c += uBeam * exp(-pow(di / bw, 2.0)) * 0.45;
  }
  c += uBeam * 0.8 * exp(-dot(p - uIn, p - uIn) / (bw * bw * 3.0));

  // The fan: each line is a sheet from the exit point to the plate.
  float k = (p.y - uOut.y) / (uFanY - uOut.y);
  if (k > 0.0 && k < 1.0 && dt > 0.0) {
    float X = uOut.x + (p.x - uOut.x) / max(k, 1e-3);
    float w0 = S * 0.004 * (1.0 - k) / max(k, 0.02);
    float hz = 0.55 + 0.45 * fbm(p / S * 5.0 + vec2(0.0, t * 0.04));
    vec3 sh = vec3(0.0);
    for (int i = 0; i < ${MAXL}; i++) {
      if (i >= uN) break;
      float sg = uLX[i].y + w0;
      sh += uLC[i] * uLX[i].z * exp(-0.5 * pow((X - uLX[i].x) / sg, 2.0)) * sqrt(uLX[i].y / sg);
    }
    c += sh * hz * (0.25 + 0.6 * k * k);
  }

  // The plate: a dark strip that only shows lines.
  if (p.x > uPlate.x - 2.0 * S && p.x < uPlate.z + 2.0 * S) {
    vec2 pc = vec2(clamp(p.x, uPlate.x, uPlate.z), clamp(p.y, uPlate.y, uPlate.w));
    float out_ = length(p - pc);
    float inside = 1.0 - smoothstep(0.0, uDpr, out_);
    vec3 pl = vec3(0.002, 0.0022, 0.003);
    float v = smoothstep(uPlate.y, uPlate.y + 3.0 * uDpr, p.y) * smoothstep(uPlate.w, uPlate.w - 3.0 * uDpr, p.y);
    vec3 ln = vec3(0.0);
    for (int i = 0; i < ${MAXL}; i++) {
      if (i >= uN) break;
      float e = exp(-0.5 * pow((p.x - uLX[i].x) / uLX[i].y, 2.0)) * uLX[i].z;
      ln += uLC[i] * e * 3.2 + vec3(e * e * 0.6);
    }
    c += (pl + ln * v) * inside;
    // A thin rim, lit faintly by what lands on it.
    vec2 bh = 0.5 * (uPlate.zw - uPlate.xy), bq = abs(p - 0.5 * (uPlate.xy + uPlate.zw)) - bh;
    float box = length(max(bq, 0.0)) + min(max(bq.x, bq.y), 0.0);
    float rim = exp(-pow(box / (0.8 * uDpr), 2.0));
    c += rim * (vec3(0.03, 0.033, 0.045) + ln * 0.05);
    // Ticks every 50 nm, under the plate.
    float below = p.y - uPlate.w;
    if (below > 2.0 * uDpr && below < 9.0 * uDpr) {
      for (int j = 0; j < 8; j++) {
        float n = 400.0 + 50.0 * float(j);
        float a = 1.0 / (780.0 * 780.0), b = 1.0 / (390.0 * 390.0);
        float tt = mix(0.5 * ((1.0 / (n * n) - a) / (b - a) + (780.0 - n) / 390.0), (780.0 - n) / 390.0, uGrating);
        float tx = mix(uPlate.z, uPlate.x, tt);
        float len = (j % 2 == 0) ? 9.0 : 5.5;
        c += vec3(0.07, 0.075, 0.09) * exp(-pow((p.x - tx) / (0.6 * uDpr), 2.0)) * step(below, len * uDpr);
      }
    }
  }
  // The lamp body sits over its own glow.
  vec4 lb = lamp(p);
  c = mix(c, lb.rgb, lb.a);
  // The loupe magnifies the plate 16 times around its centre.
  if (uLoupe.w > 0.001) {
    vec2 d = p - uLoupe.xy;
    float r = uLoupe.z * (0.7 + 0.3 * uLoupe.w), dl = length(d), mag = 16.0;
    c *= 1.0 - 0.6 * uLoupe.w * exp(-pow(max(dl - r, 0.0) / (6.0 * uDpr), 2.0));
    if (dl < r + 3.0 * uDpr) {
      float xs = uLoupe.x + d.x / mag;
      vec3 lc = vec3(0.003, 0.0035, 0.005);
      for (int i = 0; i < ${MAXL}; i++) {
        if (i >= uN) break;
        float sg = max(1.2 * uDpr, uLX[i].w * mag);
        float e = exp(-0.5 * pow((p.x - uLoupe.x - (uLX[i].x - uLoupe.x) * mag) / sg, 2.0)) * uLX[i].z;
        lc += uLC[i] * e * 3.2 + vec3(e * e * 0.6);
      }
      float lam = plateLam(xs);
      // Ticks every nanometre along the floor, longer every five.
      float fw = max(fwidth(lam), 1e-4), yb = (d.y + r) / r;
      float t1 = 1.0 - smoothstep(0.0, 1.2 * fw, abs(fract(lam + 0.5) - 0.5));
      float t5 = 1.0 - smoothstep(0.0, 1.2 * fw, abs(fract(lam / 5.0 + 0.5) - 0.5) * 5.0);
      lc += vec3(0.09, 0.095, 0.11) * max(t1 * step(yb, 0.14), t5 * step(yb, 0.26));
      lc *= 1.0 - 0.45 * smoothstep(0.55 * r, r, dl);
      float inside = 1.0 - smoothstep(r - uDpr, r, dl);
      c = mix(c, lc, inside * uLoupe.w);
      c += exp(-pow((dl - r) / (1.1 * uDpr), 2.0)) * uLoupe.w * vec3(0.2, 0.21, 0.25);
    }
  }
  o = vec4(c, 1.0);
}`;
// Bloom: a soft threshold, then a mip chain down and up.
const PRE_FS = HEAD + `
uniform sampler2D uSrc;
uniform vec2 uTex;
uniform float uThr;
void main() {
  vec3 c = 0.25 * (texture(uSrc, vUv + uTex * vec2(-1, -1)).rgb + texture(uSrc, vUv + uTex * vec2(1, -1)).rgb
    + texture(uSrc, vUv + uTex * vec2(-1, 1)).rgb + texture(uSrc, vUv + uTex * vec2(1, 1)).rgb);
  float b = max(max(c.r, c.g), c.b), knee = uThr * 0.5;
  float s = clamp(b - uThr + knee, 0.0, 2.0 * knee);
  s = s * s / (4.0 * knee + 1e-4);
  o = vec4(c * max(s, b - uThr) / max(b, 1e-4), 1.0);
}`;
const DOWN_FS = HEAD + `
uniform sampler2D uSrc;
uniform vec2 uTex;
void main() {
  vec3 c = texture(uSrc, vUv).rgb * 0.5;
  c += 0.125 * (texture(uSrc, vUv + uTex * vec2(-1, -1)).rgb + texture(uSrc, vUv + uTex * vec2(1, -1)).rgb
    + texture(uSrc, vUv + uTex * vec2(-1, 1)).rgb + texture(uSrc, vUv + uTex * vec2(1, 1)).rgb);
  o = vec4(c, 1.0);
}`;
const UP_FS = HEAD + `
uniform sampler2D uSrc;
uniform vec2 uTex;
uniform float uK;
void main() {
  vec3 c = texture(uSrc, vUv).rgb * 4.0;
  c += 2.0 * (texture(uSrc, vUv + vec2(uTex.x, 0)).rgb + texture(uSrc, vUv - vec2(uTex.x, 0)).rgb
    + texture(uSrc, vUv + vec2(0, uTex.y)).rgb + texture(uSrc, vUv - vec2(0, uTex.y)).rgb);
  c += texture(uSrc, vUv + uTex).rgb + texture(uSrc, vUv - uTex).rgb
    + texture(uSrc, vUv + vec2(uTex.x, -uTex.y)).rgb + texture(uSrc, vUv - vec2(uTex.x, -uTex.y)).rgb;
  o = vec4(c / 16.0 * uK, 1.0);
}`;
// Grade: tone curve, vignette and grain.
const OUT_FS = HEAD + `
uniform sampler2D uScene, uBloom;
uniform float uBloomK, uTime;
uniform vec2 uRes;
vec3 aces(vec3 x) { return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0); }
float h(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
void main() {
  vec3 c = texture(uScene, vUv).rgb + texture(uBloom, vUv).rgb * uBloomK;
  c += vec3(0.006, 0.006, 0.01);
  c = aces(c * 1.1);
  vec2 v = (vUv - 0.5) * vec2(uRes.x / uRes.y, 1.0);
  c *= 1.0 - 0.35 * smoothstep(0.35, 1.0, length(v));
  c = pow(c, vec3(1.0 / 2.2));
  c += (h(gl_FragCoord.xy + fract(uTime) * 91.0) - 0.5) * 0.018;
  o = vec4(c, 1.0);
}`;

/* ---------- the view ---------- */
// One view per page; it builds its canvas and GL on first open.
// opts: stage, kit (the page's audio kit), ui, onExit.
export function spectroscope({ stage, kit, ui, onExit }) {
  let canvas = null, gl = null, P = null, scene = null, mips = [], triVao = null, booting = null, failed = false;
  // amt is the element in the lamp; shown chases it, so lines swell in.
  const amt = new Float32Array(SALTS.length), shown = new Float32Array(SALTS.length);
  let on = false, salt = 0, cobalt = 0, grating = 0, gratingTo = 0, trace = 1;
  let puffE = 0, puffV = 0, ring = 0, time = 3.7;
  {
    const v = k => ui.setting(k)?.value;
    salt = Math.max(0, SALTS.findIndex(s => s.id === v('element')));
    cobalt = v('cobalt') ? 1 : 0;
    grating = gratingTo = v('spectro') === 'grating' ? 1 : 0;
    trace = v('trace') === false ? 0 : 1;
  }

  /* ---------- WebGL ---------- */
  function compile(vs, fs) {
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
    const p = gl.createProgram(), v = sh(gl.VERTEX_SHADER, vs), f = sh(gl.FRAGMENT_SHADER, fs);
    gl.attachShader(p, v);
    gl.attachShader(p, f);
    gl.linkProgram(p);
    return { p, v, f, u: {} };
  }
  // Every active uniform gets its location, arrays by their first element.
  function locate(prog) {
    const n = gl.getProgramParameter(prog.p, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < n; i++) {
      const name = gl.getActiveUniform(prog.p, i).name;
      prog.u[name.replace(/\[0\]$/, '')] = gl.getUniformLocation(prog.p, name);
    }
  }
  const nextFrame = () => new Promise(r => requestAnimationFrame(r));
  async function initGL() {
    gl = canvas.getContext('webgl2', { alpha: false, antialias: false, depth: false, stencil: false, powerPreference: 'high-performance' });
    if (!gl) throw new Error('WebGL 2 unavailable');
    if (!gl.getExtension('EXT_color_buffer_float') && !gl.getExtension('EXT_color_buffer_half_float')) throw new Error('float targets unavailable');
    gl.getExtension('OES_texture_float_linear');
    const par = gl.getExtension('KHR_parallel_shader_compile');
    const progs = { scene: compile(TRI, SCENE_FS), pre: compile(TRI, PRE_FS), down: compile(TRI, DOWN_FS), up: compile(TRI, UP_FS), out: compile(TRI, OUT_FS) };
    // Polling lets the driver link off the main thread.
    const all = Object.values(progs);
    if (par) while (!gl.isContextLost() && !all.every(q => gl.getProgramParameter(q.p, par.COMPLETION_STATUS_KHR))) await nextFrame();
    for (const q of all) {
      if (!gl.getProgramParameter(q.p, gl.LINK_STATUS)) throw new Error(gl.getShaderInfoLog(q.f) || gl.getShaderInfoLog(q.v) || gl.getProgramInfoLog(q.p) || 'link failed');
      locate(q);
    }
    P = progs;
    triVao = gl.createVertexArray();
    gl.bindVertexArray(triVao);
  }
  function target(w, h) {
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA16F, w, h);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) throw new Error('RGBA16F is not renderable');
    return { tex, fb, w, h };
  }
  function free(t) { if (t) { gl.deleteTexture(t.tex); gl.deleteFramebuffer(t.fb); } }
  function bind(prog, name, unit, t) {
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, t.tex);
    gl.uniform1i(prog.u[name], unit);
  }
  function draw(dst) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, dst ? dst.fb : null);
    gl.viewport(0, 0, dst ? dst.w : canvas.width, dst ? dst.h : canvas.height);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  // Five bloom levels, from half size down; rung 2 starts at quarter size.
  // Slow frames raise the rung; a new quality choice clears it.
  let rung = 0, allocKey = '';
  function alloc() {
    const W = canvas.width, H = canvas.height, sh = rung >= 2 ? 2 : 1, key = `${W}x${H}/${sh}`;
    if (key === allocKey) return;
    allocKey = key;
    free(scene);
    mips.forEach(free);
    scene = target(W, H);
    mips = [];
    for (let i = 0, w = W >> sh, h = H >> sh; i < 5; i++, w >>= 1, h >>= 1) mips.push(target(Math.max(1, w), Math.max(1, h)));
  }

  /* ---------- layout ---------- */
  // Device pixels, from the bottom left as GL counts.
  // The aperture sits where the flame's waist sat.
  const G = { base: [0, 0, 1], lamp: [0, 0, 1, 1], ap: [0, 0], wedge: [0, 0, 1], plate: [0, 0, 1, 1], inP: [0, 0], outP: [0, 0], S: 1, dpr: 1 };
  function layout() {
    const { W, H, dpr } = fitCanvas(canvas, { maxDpr: 2, low: rung >= 1 });
    G.dpr = dpr;
    G.S = Math.min(W, H);
    if (W >= H * 0.95) {
      G.base = [0.24 * W, 0.2 * H, 0.52 * H];
      G.wedge = [0.43 * W, 0, 0.085 * H];
      G.plate = [0.5 * W, 0.6 * H, 0.94 * W, 0.72 * H];
    } else {
      G.base = [0.28 * W, 0.22 * H, 0.3 * H];
      G.wedge = [0.66 * W, 0, 0.11 * W];
      G.plate = [0.06 * W, 0.66 * H, 0.94 * W, 0.73 * H];
    }
    // The beam leaves the aperture; the wedge points down and lifts the fan.
    const by = G.base[1] + 0.38 * G.base[2], r = G.wedge[2], k = Math.sqrt(3);
    G.ap = [G.base[0], by];
    const hw = 0.075 * G.S, hh = 0.032 * G.S;
    G.lamp = [G.base[0] - 0.98 * hw, by, hw, hh];
    G.wedge[1] = by;
    G.inP = [G.wedge[0] - r + r / k / k, by];
    const ey = 0.2 * r;
    G.outP = [G.wedge[0] + r - (-ey + r / k) / k, by + ey];
    if (P) alloc();
  }

  /* ---------- lines ---------- */
  // Wavelength to plate x; violet sits left.
  const A = 1 / 780 ** 2, B = 1 / 390 ** 2;
  // The prism map is half Cauchy, half even, so red still spreads.
  const lamT = l => lerp(0.5 * ((1 / (l * l) - A) / (B - A) + (780 - l) / 390), (780 - l) / 390, grating);
  const dTdL = l => lerp(0.5 * (2 / (l ** 3) / (B - A) + 1 / 390), 1 / 390, grating);
  const LX = new Float32Array(MAXL * 4), LC = new Float32Array(MAXL * 3);
  let nLines = 0;
  // Every element carries a trace of sodium.
  const level = i => {
    if (i !== NA) return shown[i];
    let other = 0;
    SALTS.forEach((s, j) => { if (j !== NA) other += shown[j]; });
    return shown[i] + trace * (0.015 + 0.07 * other);
  };
  function buildLines() {
    const [x0, , x1] = G.plate, pw = x1 - x0, px = G.dpr;
    let n = 0;
    const add = (l, w) => {
      if (n >= MAXL || w < 0.002) return;
      const wid = l[2] || 0;
      LX[n * 4] = x1 - lamT(l[0]) * pw;
      LX[n * 4 + 1] = Math.max(1.1 * px, 0.5 * wid * dTdL(l[0]) * pw);
      // A band spreads its light, so its peak is lower.
      LX[n * 4 + 3] = 0.5 * wid * dTdL(l[0]) * pw;
      LX[n * 4 + 2] = w * (wid ? 0.4 : 1) * (cobalt ? 1 - 0.94 * Math.exp(-(((l[0] - 590) / 28) ** 2)) : 1);
      LC.set(l.rgb, n * 3);
      n++;
    };
    SALTS.forEach((s, i) => { const a = level(i); s.lines.forEach(l => add(l, l[1] * a)); });
    nLines = n;
  }
  // The beam is the mean element colour in linear light.
  const beam = [0, 0, 0];
  function mixBeam() {
    let sum = 0, other = 0;
    beam.fill(0);
    SALTS.forEach((s, i) => { if (i !== NA) other += shown[i]; });
    SALTS.forEach((s, i) => {
      const a = i === NA ? shown[i] + trace * 0.05 * other : shown[i];
      for (let c = 0; c < 3; c++) beam[c] += s.lin[c] * a;
      sum += a;
    });
    if (sum > 1e-4) for (let c = 0; c < 3; c++) beam[c] /= sum;
    const k = (1 - Math.exp(-1.4 * sum)) * 1.4;
    // Cobalt glass mutes the beam's yellow and red.
    const cb = cobalt ? [0.42, 0.32, 1.15] : [1, 1, 1];
    for (let c = 0; c < 3; c++) beam[c] = (0.02 + beam[c] * k) * cb[c];
  }

  /* ---------- render ---------- */
  function render() {
    const W = canvas.width, H = canvas.height;
    buildLines();
    mixBeam();
    const s = P.scene;
    gl.useProgram(s.p);
    gl.uniform2f(s.u.uRes, W, H);
    gl.uniform1f(s.u.uS, G.S);
    gl.uniform1f(s.u.uDpr, G.dpr);
    gl.uniform1f(s.u.uTime, time);
    gl.uniform4fv(s.u.uLamp, G.lamp);
    gl.uniform2fv(s.u.uAp, G.ap);
    gl.uniform3fv(s.u.uBeam, beam);
    gl.uniform1f(s.u.uPuff, Math.min(1.3, puffV) * (reduced() ? 0.5 : 1));
    gl.uniform1f(s.u.uFanY, G.plate[1]);
    gl.uniform1f(s.u.uCobalt, cobalt);
    gl.uniform1f(s.u.uGrating, grating);
    gl.uniform3fv(s.u.uWedge, G.wedge);
    gl.uniform2fv(s.u.uIn, G.inP);
    gl.uniform2fv(s.u.uOut, G.outP);
    gl.uniform4fv(s.u.uPlate, G.plate);
    gl.uniform4f(s.u.uLoupe, loupe.x, loupe.y, loupe.r, loupe.v);
    gl.uniform1i(s.u.uN, nLines);
    if (nLines) {
      gl.uniform4fv(s.u.uLX, LX, 0, nLines * 4);
      gl.uniform3fv(s.u.uLC, LC, 0, nLines * 3);
    }
    gl.disable(gl.BLEND);
    draw(scene);
    // Bloom down.
    gl.useProgram(P.pre.p);
    bind(P.pre, 'uSrc', 0, scene);
    gl.uniform2f(P.pre.u.uTex, 1 / W, 1 / H);
    gl.uniform1f(P.pre.u.uThr, 0.9);
    draw(mips[0]);
    gl.useProgram(P.down.p);
    for (let i = 1; i < mips.length; i++) {
      bind(P.down, 'uSrc', 0, mips[i - 1]);
      gl.uniform2f(P.down.u.uTex, 1 / mips[i - 1].w, 1 / mips[i - 1].h);
      draw(mips[i]);
    }
    // Bloom up, added level by level.
    gl.useProgram(P.up.p);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);
    for (let i = mips.length - 1; i > 0; i--) {
      bind(P.up, 'uSrc', 0, mips[i]);
      gl.uniform2f(P.up.u.uTex, 1 / mips[i].w, 1 / mips[i].h);
      gl.uniform1f(P.up.u.uK, 0.9);
      draw(mips[i - 1]);
    }
    gl.disable(gl.BLEND);
    const q = P.out;
    gl.useProgram(q.p);
    bind(q, 'uScene', 0, scene);
    bind(q, 'uBloom', 1, mips[0]);
    gl.uniform1f(q.u.uBloomK, 0.55);
    gl.uniform1f(q.u.uTime, time);
    gl.uniform2f(q.u.uRes, W, H);
    draw(null);
  }

  /* ---------- sim ---------- */
  function step(dt) {
    const k = 1 - Math.exp(-dt / 0.12);
    for (let i = 0; i < SALTS.length; i++) {
      // The lamp holds its element; the others burn off.
      if (i === salt) amt[i] = 1;
      else amt[i] *= Math.exp(-dt / SALTS[i].tau);
      if (amt[i] < 1e-3) amt[i] = 0;
      shown[i] += (amt[i] - shown[i]) * k;
      if (Math.abs(amt[i] - shown[i]) < 1e-3) shown[i] = amt[i];
    }
    // A strike swells fast and fades over about half a second.
    puffV += (puffE - puffV) * (1 - Math.exp(-dt / 0.04));
    puffE *= Math.exp(-dt / 0.45);
    if (puffE < 1e-3) puffE = 0;
    ring *= Math.exp(-dt / 1.6);
    if (ring < 0.01) ring = 0;
    loupe.v += (loupe.to - loupe.v) * (1 - Math.exp(-dt / 0.07));
    if (Math.abs(loupe.to - loupe.v) < 1e-3) loupe.v = loupe.to;
    grating += (gratingTo - grating) * (1 - Math.exp(-dt / 0.15));
    if (Math.abs(gratingTo - grating) < 1e-3) grating = gratingTo;
  }
  const settling = () => !!ptr || loupe.v !== loupe.to || puffE > 0 || puffV > 1e-3 || ring > 0
    || amt.some((a, i) => a !== shown[i]) || grating !== gratingTo;

  /* ---------- sound ---------- */
  // Light frequency moved down 40 octaves, in Hz times nm: 589 nm sings near 463 Hz.
  const F_LIGHT = 2.99792458e17 / 2 ** 40;
  const MAXV = 24;
  let bus = null;
  const pan = x => clamp((x / canvas.width) * 2 - 1, -1, 1) * 0.7;
  function voices() {
    const ac = kit.live();
    if (!ac) return null;
    if (bus?.ac === ac) return bus;
    // The chord: one sine per bright line, panned toward the plate.
    const chord = ac.createGain(), cp = ac.createStereoPanner();
    chord.gain.value = 0.55;
    chord.connect(cp).connect(kit.out);
    bus = { ac, cp, chord, tones: new Map() };
    return bus;
  }
  // A strike clicks: one short band of noise.
  function tick(x) {
    const b = voices();
    if (!b || !kit.noise) return;
    const ac = b.ac, t = ac.currentTime + 0.005, dur = rnd(0.02, 0.035);
    const src = ac.createBufferSource(), fl = ac.createBiquadFilter(), g = ac.createGain(), sp = ac.createStereoPanner();
    src.buffer = kit.noise;
    fl.type = 'bandpass';
    fl.Q.value = 2;
    fl.frequency.value = rnd(3200, 4800);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(rnd(0.25, 0.35), t + dur * 0.25);
    g.gain.exponentialRampToValueAtTime(1e-4, t + dur);
    sp.pan.value = pan(x);
    src.connect(fl).connect(g).connect(sp).connect(kit.out);
    src.start(t, Math.random() * 0.6);
    src.stop(t + dur + 0.05);
  }
  // The chord follows the live lines and rings after each strike.
  const live2 = [];
  function soundFrame() {
    const b = voices();
    if (!b) return;
    const t = b.ac.currentTime;
    b.cp.pan.setTargetAtTime(pan((G.plate[0] + G.plate[2]) / 2), t, 0.1);
    live2.length = 0;
    const filt = l => (cobalt ? 1 - 0.94 * Math.exp(-(((l - 590) / 28) ** 2)) : 1);
    const lit = on ? ring : 0;
    SALTS.forEach((s, i) => {
      const a = level(i) * lit;
      s.lines.forEach((l, j) => { const w = l[1] * a * (l[2] ? 0.5 : 1) * filt(l[0]); if (w > 0.03) live2.push([`${i}:${j}`, l[0], w, l[2] || 0]); });
    });
    live2.sort((p, q) => q[2] - p[2]);
    live2.length = Math.min(live2.length, MAXV);
    const keep = new Set();
    for (const [key, nm, w, wid] of live2) {
      keep.add(key);
      let v = b.tones.get(key);
      if (!v) {
        const o = b.ac.createOscillator(), g = b.ac.createGain();
        o.type = 'sine';
        o.frequency.value = F_LIGHT / nm;
        // A band is a smear of lines, so it wavers a little.
        if (wid) o.detune.value = rnd(-12, 12);
        g.gain.value = 0;
        o.connect(g).connect(b.chord);
        o.start();
        v = { o, g };
        b.tones.set(key, v);
      }
      v.g.gain.setTargetAtTime(0.07 * Math.min(1.2, w), t, 0.08);
      v.off = 0;
    }
    // A silent tone stops after half a second.
    for (const [key, v] of b.tones) {
      if (keep.has(key)) continue;
      v.g.gain.setTargetAtTime(0, t, 0.08);
      v.off ||= t;
      if (t - v.off > 0.5) { v.o.stop(); v.o.disconnect(); b.tones.delete(key); }
    }
  }

  /* ---------- performance ladder ---------- */
  // After 4 s of lively run time, 2 s of slow frames steps down one rung.
  // Rungs: pixel ratio, then bloom size.
  let runT = 0, slowT = 0, ftAvg = 1 / 60;
  function watchdog(raw, lively) {
    if (!lively || raw > 0.25) return;
    runT += raw;
    ftAvg += (raw - ftAvg) * 0.1;
    if (runT < 4 || rung >= 2) return;
    slowT = ftAvg > 1 / 38 ? slowT + raw : 0;
    if (slowT < 2) return;
    rung++;
    slowT = 0;
    ftAvg = 1 / 60;
    layout();
  }

  /* ---------- frame loop ---------- */
  // Lively at full rate, drifting at 30 fps, asleep 60 s after the last input.
  let raf = 0, last = 0, lastDraw = 0, visible = true, rested = false, lastInput = performance.now();
  const SLEEP = 60000, EASE = 2000;
  function live() { lastInput = performance.now(); wake(); }
  function wake() {
    if (!raf && on && visible && P) { last = performance.now(); raf = requestAnimationFrame(frame); }
  }
  function frame(now) {
    raf = 0;
    if (!on) return;
    const raw = (now - last) / 1000, dt = Math.min(0.05, raw);
    watchdog(raw, settling());
    last = now;
    const idle = now - lastInput;
    const lively = settling();
    try {
      step(dt);
      soundFrame();
      // The shimmer eases to a stop over the last 2 s before sleep.
      const flow = clamp((SLEEP + EASE - idle) / EASE) * (reduced() ? 0.25 : 1);
      time += dt * (lively ? Math.max(flow, reduced() ? 0.25 : 1) : flow);
      if (lively || now - lastDraw >= 31) { render(); lastDraw = now; }
    } finally {
      if (on && visible && (lively || idle < SLEEP + EASE)) raf = requestAnimationFrame(frame);
      // Once the chord has rung out, the audio context sleeps.
      if (!lively && !rested) { rested = true; kit.rest(() => !settling()); }
      if (lively) rested = false;
    }
  }

  /* ---------- loupe ---------- */
  // The loupe follows the pointer along the plate.
  // On touch it lifts above the finger.
  const loupe = { x: 0, y: 0, r: 1, v: 0, to: 0 };
  let ptr = null;
  function onPlate([x, y]) {
    const [x0, y0, x1, y1] = G.plate, h = y1 - y0;
    return x > x0 - 0.02 * G.S && x < x1 + 0.02 * G.S && y > y0 - 0.5 * h && y < y1 + 0.5 * h;
  }
  function aim([x], touch) {
    const [x0, y0, x1, y1] = G.plate;
    loupe.r = 0.1 * G.S;
    loupe.x = clamp(x, x0, x1);
    loupe.y = (y0 + y1) / 2 + (touch ? loupe.r * 1.3 : 0);
    loupe.to = 1;
    live();
  }
  function unaim() { if (loupe.to) { loupe.to = 0; live(); } canvas.style.cursor = ''; }
  function hover(e) {
    if (ptr || e.pointerType === 'touch') return;
    const at = toGL(e.clientX, e.clientY), hot = onPlate(at);
    canvas.style.cursor = hot ? 'zoom-in' : '';
    if (hot) aim(at, false); else unaim();
  }
  // Client pixels to device pixels, from the bottom left.
  function toGL(cx, cy) {
    const r = canvas.getBoundingClientRect();
    return [(cx - r.left) * (canvas.width / r.width), (r.bottom - cy) * (canvas.height / r.height)];
  }
  // A press on the plate holds the loupe; a tap elsewhere strikes the lamp.
  function down(e) {
    e.stopPropagation();
    if (ptr || e.button > 0) return;
    try { canvas.setPointerCapture(e.pointerId); } catch { /* A synthetic pointer has no capture. */ }
    ptr = { id: e.pointerId, x0: e.clientX, y0: e.clientY, mode: 'press' };
    const at = toGL(e.clientX, e.clientY);
    if (onPlate(at)) { ptr.mode = 'loupe'; ptr.touch = e.pointerType === 'touch'; aim(at, ptr.touch); return; }
    live();
  }
  function move(e) {
    e.stopPropagation();
    if (!ptr) { hover(e); return; }
    if (e.pointerId !== ptr.id) return;
    if (ptr.mode === 'loupe') aim(toGL(e.clientX, e.clientY), ptr.touch);
  }
  function up(e) {
    e?.stopPropagation();
    if (!ptr || (e && e.pointerId !== ptr.id)) return;
    const m = ptr.mode, moved = e ? Math.hypot(e.clientX - ptr.x0, e.clientY - ptr.y0) : 99;
    ptr = null;
    if (m === 'loupe') { if (!e || e.pointerType === 'touch' || !onPlate(toGL(e.clientX, e.clientY))) unaim(); return; }
    if (e?.type === 'pointerup' && moved < 8) strike();
    live();
  }

  /* ---------- actions ---------- */
  // A strike flares the lamp and rings the chord.
  function strike() {
    puffE = 1;
    ring = 1;
    tick(G.ap[0]);
    live();
  }
  function setElement(id) {
    const i = SALTS.findIndex(s => s.id === id);
    if (i < 0) return;
    salt = i;
    if (on) strike();
  }
  // Keys 1 to 7 pick the element; Space strikes; Escape leaves.
  function onKey(e) {
    if (!on || e.metaKey || e.ctrlKey || e.altKey || e.defaultPrevented) return;
    if (e.target.closest?.('input, textarea, select, [contenteditable], .s2-sheet')) return;
    const n = Number(e.key);
    if (n >= 1 && n <= SALTS.length) { e.preventDefault(); ui.setting('element')?.set(SALTS[n - 1].id, true); return; }
    if (e.key === 'Escape') { e.preventDefault(); onExit?.(); return; }
    if (e.target.closest?.('button, a')) return;
    if (e.code === 'Space' && !e.repeat) { e.preventDefault(); strike(); return; }
  }

  /* ---------- key strip ---------- */
  // The strip swaps its words while the view shows.
  const KEYS = [['press plate', 'magnify'], ['click', 'strike'], ['1-7', 'element'], ['esc', 'table']];
  let saved = null;
  function swapKeys(entries) {
    const rows = [...(stage.parentElement?.querySelectorAll('.s2-keys > div') || [])];
    if (!rows.length) return;
    const coarse = matchMedia('(pointer: coarse)').matches;
    rows.forEach((row, i) => {
      const [word, verb] = entries[i] || ['', ''];
      row.querySelector('kbd').textContent = keyWord(word, coarse);
      row.querySelector('dd').textContent = verb;
      row.style.display = !word || (coarse && !onTouch(word)) ? 'none' : '';
    });
  }
  function readKeys() {
    return [...(stage.parentElement?.querySelectorAll('.s2-keys > div') || [])].map(r => ({ r, k: r.querySelector('kbd').textContent, d: r.querySelector('dd').textContent, s: r.style.display }));
  }

  /* ---------- open and close ---------- */
  async function boot() {
    canvas = document.createElement('canvas');
    canvas.className = 'spectro';
    canvas.setAttribute('aria-hidden', 'true');
    stage.append(canvas);
    try {
      await initGL();
      layout();
      alloc();
    } catch (err) {
      failed = true;
      canvas.remove();
      throw err;
    }
    canvas.addEventListener('pointerdown', down);
    canvas.addEventListener('pointermove', move);
    canvas.addEventListener('pointerleave', () => { if (!ptr) unaim(); });
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointercancel', up);
    canvas.addEventListener('lostpointercapture', up);
    canvas.addEventListener('wheel', e => e.stopPropagation());
    addEventListener('keydown', onKey);
    new ResizeObserver(() => { layout(); if (P && on) render(); }).observe(stage);
    onQuality(() => { rung = 0; slowT = 0; layout(); if (P && on) render(); });
    // A hidden tab stops the loop and the sim clock with it.
    whenVisible(stage, v => {
      visible = v;
      if (!v) { cancelAnimationFrame(raf); raf = 0; return; }
      wake();
    });
  }
  async function open() {
    if (on || failed) return on;
    booting ||= boot();
    await booting;
    on = true;
    // The lines bloom in from a dark plate.
    shown.fill(0);
    amt.fill(0);
    layout();
    render();
    canvas.classList.add('on');
    canvas.style.pointerEvents = '';
    saved = readKeys();
    swapKeys(KEYS);
    ui.keys.show();
    strike();
    return true;
  }
  function close() {
    if (!on) return;
    on = false;
    cancelAnimationFrame(raf);
    raf = 0;
    ptr = null;
    loupe.v = loupe.to = 0;
    canvas.classList.remove('on');
    canvas.style.pointerEvents = 'none';
    canvas.style.cursor = '';
    // The chord fades out with the view.
    if (bus) for (const v of bus.tones.values()) v.g.gain.setTargetAtTime(0, bus.ac.currentTime, 0.08);
    saved?.forEach(({ r, k, d, s }) => { r.querySelector('kbd').textContent = k; r.querySelector('dd').textContent = d; r.style.display = s; });
    saved = null;
  }

  return {
    open, close, setElement, strike,
    get on() { return on; },
    setCobalt(v) { cobalt = v ? 1 : 0; live(); },
    setGrating(v) { gratingTo = v ? 1 : 0; live(); },
    setTrace(v) { trace = v ? 1 : 0; live(); },
  };
}
