// Dichroic glass shaders: three small programs, so a D3D11 driver links each fast.
// MAP lights the table, in 12 spectral samples, through and off the panes.
// SCENE casts one ray tree a pixel. FINAL tones the frame and adds the bloom.

const HEAD = `#version 300 es
precision highp float;
`;

// The panes, the coating, and the spectral helpers. MAP and SCENE share it.
const GLASS = `
uniform vec3 uPo[3], uPu[3], uPn[3];
// Each pane's length along the table and its height.
uniform vec2 uPl[3];
// 1 where an end is a fused seam, 0 where it is free.
uniform vec2 uPx[3];
// The coating: band low edge, high edge, inverted, peak reflectance.
uniform vec4 uCoat;
uniform vec3 uL;
uniform float uLampR;
uniform int uZero;
const float NEFF = 1.75;
// The polished edge band, in units: 1.8 mm.
const float EDGE = 0.018;
// How far leaves overlap at a fused seam: 12 mm.
const float SEAM = 0.012;
const mat3x4 ONE = mat3x4(vec4(1.0), vec4(1.0), vec4(1.0));
const mat3x4 ZERO = mat3x4(vec4(0.0), vec4(0.0), vec4(0.0));
const mat3x4 LAM = mat3x4(412.5, 437.5, 462.5, 487.5, 512.5, 537.5, 562.5, 587.5, 612.5, 637.5, 662.5, 687.5);

mat3x4 sstep(float a, float b, mat3x4 x) {
  return mat3x4(smoothstep(vec4(a), vec4(b), x[0]), smoothstep(vec4(a), vec4(b), x[1]), smoothstep(vec4(a), vec4(b), x[2]));
}
mat3x4 mulS(mat3x4 a, mat3x4 b) { return matrixCompMult(a, b); }

// The coating's reflectance and transmittance at cos c to the face.
// The band moves toward blue as the angle grows.
void coat(float c, out mat3x4 R, out mat3x4 T) {
  c = clamp(c, 0.0, 1.0);
  float s = sqrt(1.0 - (1.0 - c * c) / (NEFF * NEFF));
  // The two polarisations part at a slant: the edges soften.
  float w = 13.0 + 24.0 * (1.0 - c);
  float lo = uCoat.x * s, hi = uCoat.y * s;
  mat3x4 band = mulS(sstep(lo - w, lo + w, LAM), ONE - sstep(hi - w, hi + w, LAM));
  mat3x4 r = (band * (1.0 - uCoat.z) + (ONE - band) * uCoat.z) * uCoat.w;
  // Bare glass Fresnel takes over at a graze.
  float f = 0.04 + 0.96 * pow(1.0 - c, 5.0);
  R = r + (ONE - r) * f;
  T = (ONE - R) * 0.97;
}

// The ray's distance to pane k, or -1.
// d.x: depth inside the free border. d.y: inside a seam, with the overlap.
// d.z: inside the true border.
float hitPane(int k, vec3 ro, vec3 rd, out vec3 d) {
  d = vec3(-1.0);
  vec3 n = uPn[k];
  float dn = dot(rd, n);
  if (abs(dn) < 1e-5) return -1.0;
  float t = dot(uPo[k] - ro, n) / dn;
  if (t <= 1e-4) return -1.0;
  vec3 q = ro + rd * t - uPo[k];
  float a = dot(q, uPu[k]), b = q.z, L = uPl[k].x;
  float h = min(b, uPl[k].y - b);
  vec2 sx = uPx[k];
  d.x = min(min(sx.x > 0.5 ? 1e3 : a, sx.y > 0.5 ? 1e3 : L - a), h);
  // Leaves overlap at a seam, so no light slips between them.
  d.y = min(sx.x > 0.5 ? a + SEAM : 1e3, sx.y > 0.5 ? L - a + SEAM : 1e3);
  d.z = min(min(a, L - a), h);
  return t;
}
// The share of pane k that covers a crossing, blurred by w.
float cover(vec3 d, float w) {
  float ws = min(w, SEAM * 0.8);
  return smoothstep(-w, w, d.x) * smoothstep(-ws, ws, d.y);
}
`;

/* ---------- MAP: the light on the table ---------- */
export const MAP_FS = `${HEAD}
in vec2 vUv;
layout(location = 0) out vec4 o0;
layout(location = 1) out vec4 o1;
layout(location = 2) out vec4 o2;
uniform vec2 uMap0;
uniform float uMapS;
// The lamp's aim and its strength.
uniform vec3 uAim;
uniform float uI;
${GLASS}

// The lamp's cone: a soft pool round the glass.
float spot(vec3 d) {
  float c = dot(d, uAim);
  // A tight beam, 34 degrees to its dark edge: thrown colour lands outside it.
  float core = smoothstep(0.83, 0.985, c);
  return uI * (core * core * (3.0 - 2.0 * core) * 0.92 + 0.08 * smoothstep(0.4, 0.83, c));
}

// The share of the lamp's light that passes pane k between a and b.
mat3x4 through(int k, vec3 a, vec3 b) {
  vec3 d = b - a;
  float len = length(d);
  d /= len;
  vec3 e;
  float t = hitPane(k, a, d, e);
  if (t < 0.0 || t > len) return ONE;
  // The lamp's size blurs every border: wide far from the glass.
  float pen = max(uLampR * t / len, 0.004);
  float cov = cover(e, pen);
  if (cov <= 0.0) return ONE;
  mat3x4 R, T;
  coat(abs(dot(d, uPn[k])), R, T);
  // The polished edge bends its light away: a thin dark line.
  T *= mix(0.3, 1.0, smoothstep(EDGE - pen, EDGE + pen, e.z));
  return ONE + (T - ONE) * cov;
}

void main() {
  vec3 p = vec3(uMap0 + vUv * uMapS, 0.0);
  // The lamp straight down onto p, through every pane on the way.
  vec3 v = uL - p;
  float d2 = dot(v, v);
  v *= inversesqrt(d2);
  mat3x4 tr = ONE;
  for (int k = 0; k < 3 + uZero; k++) tr = mulS(tr, through(k, p, uL));
  mat3x4 E = tr * (spot(-v) * max(v.z, 0.0) / d2);

  // Each pane throws the lamp's mirror image onto the table.
  for (int k = 0; k < 3 + uZero; k++) {
    vec3 n = uPn[k];
    float dp = dot(p - uPo[k], n), dl = dot(uL - uPo[k], n);
    if (dp * dl <= 0.0) continue;
    vec3 Li = uL - 2.0 * dl * n;
    vec3 w = Li - p;
    float wl = length(w);
    w /= wl;
    vec3 e;
    float t = hitPane(k, p, w, e);
    if (t < 0.0 || t > wl) continue;
    float pen = max(uLampR * t / wl, 0.004);
    // Each leaf throws its own colour: its border is soft, seams too.
    float cov = smoothstep(EDGE - pen, EDGE + pen, e.z);
    if (cov <= 0.0) continue;
    mat3x4 R, T;
    coat(abs(dot(w, n)), R, T);
    vec3 X = p + w * t;
    mat3x4 m = R * cov;
    // The other panes filter both legs: lamp to mirror, mirror to table.
    for (int i = 0; i < 4 + uZero; i++) {
      int j = (k + 1 + i / 2) % 3;
      m = mulS(m, i % 2 == 0 ? through(j, p, X) : through(j, X, uL));
    }
    E += m * (spot(normalize(X - uL)) * max(w.z, 0.0) / (wl * wl));
  }
  o0 = E[0]; o1 = E[1]; o2 = E[2];
}`;

/* ---------- SCENE: one ray tree a pixel ---------- */
export const SCENE_FS = `${HEAD}
in vec2 vUv;
out vec4 o;
uniform highp sampler2D uM0, uM1, uM2;
uniform vec2 uMap0;
uniform float uMapS;
uniform vec3 uCam, uCamR, uCamU, uCamF;
uniform float uTanH, uAsp, uPix;
// The lamp disc's radiance; the room's fill.
uniform float uLampL, uFill;
uniform vec4 uWr[3], uWg[3], uWb[3];
${GLASS}

float hash(vec2 p) { vec3 q = fract(vec3(p.xyx) * 0.1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
float vn(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
}

// What a ray sees past the glass: the lit table, the dark room, the lamp.
mat3x4 shade(vec3 ro, vec3 rd, float bulb) {
  float tt = rd.z < 0.0 ? -ro.z / rd.z : 1e9;
  mat3x4 c;
  if (rd.z < 0.0) {
    vec3 p = ro + rd * tt;
    vec2 uv = (p.xy - uMap0) / uMapS;
    // The map fades out at its rim; the beam is dark there anyway.
    vec2 rim = smoothstep(vec2(0.0), vec2(0.04), uv) * smoothstep(vec2(0.0), vec2(0.04), 1.0 - uv);
    mat3x4 E = mat3x4(texture(uM0, uv), texture(uM1, uv), texture(uM2, uv)) * (rim.x * rim.y);
    // A warm white top: a little less blue comes back.
    mat3x4 alb = ONE * 0.8 - (ONE - (LAM - ONE * 400.0) / 300.0) * 0.05;
    float grain = 1.0 + 0.02 * (vn(p.xy * 90.0) - 0.5) + 0.012 * (vn(p.xy * 7.0) - 0.5);
    // The room's fill fades far from the lamp's pool.
    float fill = uFill / (1.0 + 0.02 * dot(p.xy, p.xy));
    c = mulS(alb, E + ONE * fill) * grain;
  } else {
    // A dark room: the walls catch a little of the pool.
    c = ONE * (uFill * (0.5 + 1.2 * exp(-abs(rd.z) * 3.0)));
  }
  // The lamp's frosted bulb, seen only in the glass.
  vec3 q = uL - ro;
  float tl = dot(q, rd);
  if (bulb > 0.0 && tl > 0.0 && tl < tt) {
    float m = length(q - rd * tl);
    c += ONE * (uLampL * smoothstep(uLampR, uLampR * 0.75, m));
  }
  return c;
}

vec3 toRGB(mat3x4 s) {
  vec3 c;
  c.r = dot(s[0], uWr[0]) + dot(s[1], uWr[1]) + dot(s[2], uWr[2]);
  c.g = dot(s[0], uWg[0]) + dot(s[1], uWg[1]) + dot(s[2], uWg[2]);
  c.b = dot(s[0], uWb[0]) + dot(s[1], uWb[1]) + dot(s[2], uWb[2]);
  return max(c, 0.0);
}

void main() {
  vec2 sc = vUv * 2.0 - 1.0;
  vec3 rd0 = normalize(uCamF + sc.x * uTanH * uAsp * uCamR + sc.y * uTanH * uCamU);
  // A queue of rays: each pane hit splits one into reflected and passed.
  vec3 qo[7], qd[7];
  mat3x4 qw[7];
  int qs[7], qn[7];
  float ql[7];
  qo[0] = uCam; qd[0] = rd0; qw[0] = ONE; qs[0] = -1; qn[0] = 0; ql[0] = 0.0;
  int n = 1;
  mat3x4 acc = ZERO;
  for (int i = 0; i < 7 + uZero; i++) {
    if (i >= n) break;
    vec3 ro = qo[i], rd = qd[i];
    mat3x4 w = qw[i];
    float best = 1e9, be = 0.0, bb = 0.0;
    int k = -1;
    float pw0 = uPix * ql[i];
    for (int j = 0; j < 3 + uZero; j++) {
      if (j == qs[i]) continue;
      vec3 e;
      float t = hitPane(j, ro, rd, e);
      float ec = min(e.x, e.y);
      if (t > 0.0 && t < best && ec > -uPix * (ql[i] + t)) { best = t; be = ec; bb = e.z; k = j; }
    }
    float tt = rd.z < 0.0 ? -ro.z / rd.z : 1e9;
    bool leaf = true;
    if (k >= 0 && best < tt) {
      vec3 P = ro + rd * best;
      float pw = max(uPix * (ql[i] + best), 1e-4);
      float cov = clamp(be / pw + 0.5, 0.0, 1.0);
      vec3 nk = uPn[k];
      float c = abs(dot(rd, nk));
      mat3x4 R, T;
      coat(c, R, T);
      // The polished edge: green and dim to look through, with a rounded glint.
      float face = smoothstep(EDGE - pw * 0.5, EDGE + pw * 0.5, bb);
      mat3x4 dl = (LAM - ONE * 540.0) / 200.0;
      mat3x4 GREEN = (ONE - mulS(dl, dl)) * 0.55;
      T = T * face + GREEN * (1.0 - face);
      R = R * face + ONE * (0.06 * (1.0 - face));
      R *= cov;
      T = ONE + (T - ONE) * cov;
      // The edge's normal turns from the face out toward its border.
      vec3 q = P - uPo[k];
      float a = dot(q, uPu[k]);
      vec3 out_ = a < uPl[k].x * 0.5 ? -uPu[k] : uPu[k];
      if (min(q.z, uPl[k].y - q.z) < min(a, uPl[k].x - a)) out_ = vec3(0.0, 0.0, q.z < uPl[k].y * 0.5 ? -1.0 : 1.0);
      vec3 fn = nk * sign(-dot(rd, nk));
      vec3 en = normalize(fn + out_ * 1.4);
      vec3 rr = reflect(rd, en);
      vec3 ld = normalize(uL - P);
      float glint = exp(-(1.0 - dot(rr, ld)) / 0.012) * uLampL * 0.02;
      acc += w * (glint * (1.0 - face) * cov);
      if (qn[i] < 2 && n <= 5) {
        qo[n] = P; qd[n] = reflect(rd, nk); qw[n] = mulS(w, R); qs[n] = k; qn[n] = qn[i] + 1; ql[n] = ql[i] + best; n++;
        qo[n] = P; qd[n] = rd; qw[n] = mulS(w, T); qs[n] = k; qn[n] = qn[i] + 1; ql[n] = ql[i] + best; n++;
        leaf = false;
      } else {
        ro = P;
        w = mulS(w, T);
      }
    }
    // The eye never sees the bulb itself: it hangs above the frame.
    if (leaf) acc += mulS(w, shade(ro, rd, float(qn[i])));
  }
  o = vec4(toRGB(acc), 1.0);
}`;

/* ---------- FINAL: tone, bloom, grain ---------- */
export const FINAL_FS = `${HEAD}
in vec2 vUv;
uniform sampler2D uHdr, uBloom;
uniform float uBloomK, uExpo, uAsp, uFrame;
out vec4 o;
float hash(vec2 p) { vec3 q = fract(vec3(p.xyx) * 0.1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
vec3 aces(vec3 x) { return clamp(x * (2.51 * x + 0.03) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0); }
void main() {
  vec3 c = texture(uHdr, vUv).rgb + texture(uBloom, vUv).rgb * uBloomK;
  vec2 q = vUv - 0.5;
  q.x *= uAsp;
  c *= uExpo * (1.0 - 0.35 * dot(q, q));
  c = pow(aces(c), vec3(1.0 / 2.2));
  // A dither against bands in the dark falloff.
  c += (hash(gl_FragCoord.xy + uFrame * 17.0) - 0.5) * 0.008;
  o = vec4(c, 1.0);
}`;
