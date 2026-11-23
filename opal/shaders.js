// Opal turn shaders: two small programs, so a D3D11 driver links each fast.
// SCENE casts one ray a pixel into the tray: the dome, or the velvet.
// FINAL tones the frame and adds the bloom.

const HEAD = `#version 300 es
precision highp float;
`;

const NOISE = `
float hash(vec2 p) { vec3 q = fract(vec3(p.xyx) * 0.1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
vec3 hash3(vec2 p) { vec3 q = fract(vec3(p.xyx) * vec3(0.1031, 0.103, 0.0973)); q += dot(q, q.yxz + 33.33); return fract((q.xxy + q.yzz) * q.zyx); }
float vn(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
}
`;

export const SCENE_FS = `${HEAD}
in vec2 vUv;
out vec4 o;
uniform highp sampler2D uDomA, uDomB;
// World to tray: the tray tilts under a fixed eye and light.
uniform mat3 uRinv;
uniform vec3 uCam, uCamR, uCamU, uCamF;
uniform float uTanH, uAsp, uPix;
// The soft box: its direction, its two axes, its half sizes.
uniform vec3 uL, uLx, uLy;
uniform vec2 uBox;
uniform float uKey, uPlay, uPin, uGlint;
uniform vec4 uLz, uLs;
uniform int uZero;
${NOISE}
const vec3 AX = vec3(1.0, 0.72, 0.4);
const float ETA = 1.0 / 1.45;
const float SB2 = 0.045 * 0.045;

// A spectral colour in linear RGB, from its wavelength in nm.
vec3 spec(float l) {
  vec3 d = (vec3(l) - vec3(612.0, 542.0, 458.0)) / vec3(46.0, 36.0, 28.0);
  vec3 c = exp(-0.5 * d * d);
  // Violet keeps a touch of red.
  c.r += 0.22 * exp(-0.5 * pow((l - 418.0) / 18.0, 2.0));
  return c * vec3(1.05, 0.95, 1.25);
}

// The room as the dome reflects it: dark, and the soft box's bright window.
vec3 env(vec3 r) {
  vec3 w = transpose(uRinv) * r;
  // A dim room: walls lit a little by the box, darker overhead.
  vec3 c = vec3(0.004, 0.0045, 0.006) + vec3(0.03, 0.03, 0.036) * exp(-abs(w.z) * 4.0) * (0.6 + 0.4 * dot(w.xy, uL.xy));
  float f = dot(w, uL);
  if (f > 0.15) {
    vec2 q = vec2(dot(w, uLx), dot(w, uLy)) / f;
    vec2 e = abs(q) - uBox + 0.07;
    float sd = length(max(e, 0.0)) + min(max(e.x, e.y), 0.0) - 0.07;
    // The diffuser is brighter at its centre; a soft halo leaks round it.
    float panel;
    panel = smoothstep(0.03, -0.03, sd) * (1.0 - 0.45 * dot(q / uBox, q / uBox));
    c += vec3(1.0, 0.97, 0.92) * uKey * (panel * 11.0 + 0.25 * exp(-max(sd, 0.0) * 9.0));
  }
  // Below the tray's horizon the dome sees the velvet.
  return w.z < -0.02 ? vec3(0.0015, 0.0013, 0.0024) : c;
}

// One colour layer: a warped Voronoi of domains from the data texture.
vec3 layer(int k, vec2 q, float s, vec3 h, vec3 lin, vec3 ha, float pw) {
  q += (vec2(vn(q * 2.4 + float(k) * 5.1), vn(q * 2.4 + 31.0 + float(k) * 3.7)) - 0.5) * 0.16;
  q += (vec2(vn(q * 9.0 + 3.0), vn(q * 9.0 + 41.0)) - 0.5) * 0.05;
  vec2 g = q / s + 8.0;
  ivec2 c0 = ivec2(floor(g)), best = c0;
  float d1 = 1e9, d2 = 1e9;
  vec4 a = vec4(0.5, 0.5, 0.0, 0.0);
  for (int j = -1; j <= 1 + uZero; j++) for (int i = -1; i <= 1; i++) {
    ivec2 c = c0 + ivec2(i, j);
    if (c.x < 0 || c.y < 0 || c.x > 15 || c.y > 15) continue;
    vec4 t = texelFetch(uDomA, ivec2(c.x, c.y + k * 16), 0);
    vec2 p = vec2(c) + t.xy - g;
    float d = dot(p, p);
    if (d < d1) { d2 = d1; d1 = d; best = c; a = t; }
    else if (d < d2) d2 = d;
  }
  vec4 b = texelFetch(uDomB, ivec2(best.x, best.y + k * 16), 0);
  vec3 n = vec3(a.zw, sqrt(max(0.0, 1.0 - dot(a.zw, a.zw))));
  // The lattice bends a little across a domain: the flash rolls over it.
  vec2 bend = vec2(vn(q * 4.2 + b.w), vn(q * 4.2 + b.w + 17.0)) - 0.5;
  bend += (vec2(vn(q * 11.0 + b.w), vn(q * 11.0 + b.w + 5.0)) - 0.5) * 0.35;
  n = normalize(n + vec3(bend * 0.2, 0.0));
  float se = b.y * b.y + SB2;
  float lobe = exp(-(1.0 - dot(h, n)) / se);
  // The room's dim light from above gives each domain a faint glow.
  float amb = exp(-(1.0 - dot(ha, n)) / 0.03) * 0.012;
  float lam = b.x * abs(dot(lin, n));
  // Stacking faults: fine stripes across the lattice's lean.
  vec2 sd = a.zw + vec2(0.03, 0.02);
  float stripe = 0.9 + 0.1 * sin(dot(q, normalize(sd)) * 210.0 + b.w);
  // Borders between domains are thin and dull.
  // Deep layers seen through the crown have softer borders.
  float edge = smoothstep(0.0, 0.05 + 0.05 * float(k) + pw * 2.0 / s, sqrt(d2) - sqrt(d1));
  return spec(lam) * (lobe * uKey * 0.55 + amb) * b.z * stripe * (0.35 + 0.65 * edge);
}

// Pinfire: small bright points, one in some cells of a fine grid.
vec3 pins(vec2 q, float sc, float seed, vec3 h, vec3 lin, float pw) {
  vec2 g = q / sc;
  vec2 c0 = floor(g);
  vec3 sum = vec3(0.0);
  for (int j = -1; j <= 1 + uZero; j++) for (int i = -1; i <= 1; i++) {
    vec2 c = c0 + vec2(float(i), float(j));
    vec3 r = hash3(c + seed), u = hash3(c + seed + 71.3);
    float d = length(g - c - 0.15 - 0.7 * r.xy) * sc;
    float rad = sc * (0.08 + 0.12 * r.z);
    float spot = smoothstep(rad + pw, rad * 0.25, d) * step(0.62, r.z);
    float th = 0.32 * sqrt(u.x), ph = 6.2832 * u.y;
    vec3 n = vec3(sin(th) * vec2(cos(ph), sin(ph)), cos(th));
    float lobe = exp(-(1.0 - dot(h, n)) / (0.0008 + SB2));
    sum += spec((460.0 + 250.0 * u.z) * abs(dot(lin, n))) * lobe * lobe * spot;
  }
  return sum * uKey * uPin;
}

// Inside the stone: the colour layers over black potch.
vec3 inside(vec3 P, vec3 N, vec3 rd, vec3 lt, vec3 ut, float pw) {
  vec3 din = refract(rd, N, ETA);
  vec3 lin = refract(-lt, N, ETA);
  float lit = dot(lin, lin) > 0.5 ? smoothstep(-0.05, 0.25, dot(N, lt)) : 0.0;
  vec3 h = normalize(-din - lin);
  vec3 ha = normalize(-din - refract(-ut, N, ETA));
  vec3 col = vec3(0.0);
  float T = 1.0;
  for (int k = 0; k < 4 + uZero; k++) {
    float z = uLz[k];
    if (P.z <= z || din.z >= -0.05) continue;
    float t = (z - P.z) / din.z;
    vec3 x = P + din * t;
    float rim = 1.0 - dot(x.xy / AX.xy, x.xy / AX.xy);
    if (rim <= 0.0) continue;
    vec3 c = layer(k, x.xy, uLs[k], h, lin, ha, pw * 1.45);
    // Colour thins out toward the rim of the seam.
    col += T * c * smoothstep(0.0, 0.18, rim) * lit;
    T *= 0.68 * exp(-t * 0.5);
    if (k == 0 || k == 2) {
      float zp = z - 0.035;
      float tp = (zp - P.z) / din.z;
      vec3 xp = P + din * tp;
      col += T * pins(xp.xy, k == 0 ? 0.034 : 0.026, float(k) * 13.7, h, lin, pw) * smoothstep(0.0, 0.2, rim) * lit;
    }
  }
  // Black potch: a dark blue-grey body, lit a little through the crown.
  vec3 body = vec3(0.011, 0.014, 0.024) * (0.25 + 0.9 * max(dot(N, lt), 0.0) * uKey * 0.12);
  // A faint milk in the crown scatters blue.
  body += vec3(0.004, 0.007, 0.012) * pow(1.0 - max(dot(-rd, N), 0.0), 2.0);
  return col * uPlay + body * T;
}

// The velvet: deep indigo pile, a sheen at grazing angles, the stone's shadow.
vec3 velvet(vec3 p, vec3 rd, vec3 lt) {
  float crush = vn(p.xy * 1.7 + 3.0) * 0.6 + vn(p.xy * 4.3 + 9.0) * 0.4;
  float pile = vn(p.xy * 150.0) * 0.55 + vn(p.xy * 380.0 + 5.0) * 0.45;
  float nv = clamp(-rd.z, 0.0, 1.0);
  float ndl = max(lt.z, 0.0);
  // The soft box throws a pool of light round the stone.
  vec2 pc = p.xy - vec2(lt.x, lt.y) * 0.25;
  float pool = exp(-dot(pc, pc) * 0.3);
  vec3 alb = vec3(0.016, 0.013, 0.03) * (0.75 + 0.5 * crush);
  float sheen = (0.07 + 0.9 * pow(1.0 - nv, 4.0)) * (0.5 + 0.9 * crush) * (0.7 + 0.6 * pile);
  vec3 c = (alb * (0.8 + 0.4 * pile) + vec3(0.035, 0.03, 0.07) * sheen) * ndl * pool * uKey * 0.3;
  // The stone's shadow: closest approach of the light ray to the dome.
  vec3 o = p / AX, d = lt / AX;
  float tc = -dot(o, d) / dot(d, d);
  float m = length(o + d * max(tc, 0.0));
  float w = 0.08 + 0.35 * max(tc, 0.0);
  float sh = tc > 0.0 ? smoothstep(1.0 - w, 1.0 + w, m) : 1.0;
  // Contact shade where the dome meets the pile.
  float e = length(p.xy / AX.xy) - 1.0;
  float ao = 1.0 - 0.85 * exp(-max(e, 0.0) * 14.0);
  return c * mix(0.08, 1.0, sh) * ao + vec3(0.0012, 0.001, 0.002) * ao;
}

void main() {
  vec2 s = vUv * 2.0 - 1.0;
  vec3 rdW = normalize(uCamF + s.x * uTanH * uAsp * uCamR + s.y * uTanH * uCamU);
  vec3 ro = uRinv * uCam, rd = uRinv * rdW;
  vec3 lt = uRinv * uL, ut = uRinv * vec3(0.0, 0.0, 1.0);

  // The velvet plane.
  float tv = rd.z < 0.0 ? -ro.z / rd.z : 1e4;
  vec3 col = velvet(ro + rd * tv, rd, lt);

  // The dome, cast in the unit sphere's space.
  vec3 so = ro / AX, sd = rd / AX;
  float dl = length(sd);
  vec3 dn = sd / dl;
  float b = dot(so, dn);
  float c2 = dot(so, so) - b * b;
  float tS = (-b - sqrt(max(1.0 - c2, 0.0))) / dl;
  // A pixel's footprint at the stone, in tray units.
  float pw = uPix * tS;
  // Edge cover: the ray's miss distance against one pixel.
  float cover = clamp((1.0 - sqrt(c2)) / (pw * 1.2) + 0.5, 0.0, 1.0);
  if (cover > 0.0) {
    vec3 sp = so + dn * (-b - sqrt(max(1.0 - c2, 0.0)));
    sp /= max(length(sp), 1e-4);
    vec3 P = sp * AX;
    if (P.z > 0.0) {
      vec3 N = normalize(P / (AX * AX));
      float ci = clamp(-dot(rd, N), 0.0, 1.0);
      float F = 0.034 + 0.966 * pow(1.0 - ci, 5.0);
      vec3 st = inside(P, N, rd, lt, ut, pw) * (1.0 - F) + env(reflect(rd, N)) * F * uGlint;
      cover *= smoothstep(0.0, pw * 1.5, P.z);
      col = mix(col, st, cover);
    }
  }
  o = vec4(col, 1.0);
}`;

export const FINAL_FS = `${HEAD}
in vec2 vUv;
uniform sampler2D uHdr, uBloom;
uniform float uBloomK, uExpo, uAsp, uFrame;
out vec4 o;
${NOISE}
vec3 aces(vec3 x) { return clamp(x * (2.51 * x + 0.03) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0); }
void main() {
  vec3 c = texture(uHdr, vUv).rgb + texture(uBloom, vUv).rgb * uBloomK;
  vec2 q = vUv - 0.5;
  q.x *= uAsp;
  c *= uExpo * (1.0 - 0.3 * dot(q, q));
  c = pow(aces(c), vec3(1.0 / 2.2));
  // A dither against bands in the dark velvet.
  c += (hash(gl_FragCoord.xy + uFrame * 17.0) - 0.5) * 0.012;
  o = vec4(c, 1.0);
}`;
