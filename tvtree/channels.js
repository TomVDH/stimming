// TV tree channels: the shader library, the big pictures and every programme.
// The tree and the contact sheet both draw from this file.

// Noise, hue and distance helpers shared by every shader.
export const LIB = `
#define PI 3.14159265
float h21(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float vn(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h21(i), h21(i + vec2(1.0, 0.0)), f.x), mix(h21(i + vec2(0.0, 1.0)), h21(i + vec2(1.0, 1.0)), f.x), f.y);
}
float fbm(vec2 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { s += a * vn(p); p = p * 2.03 + 7.1; a *= 0.5; } return s; }
vec3 hue(float h) { return clamp(abs(fract(h + vec3(0.0, 2.0 / 3.0, 1.0 / 3.0)) * 6.0 - 3.0) - 1.0, 0.0, 1.0); }
float sdSeg(vec2 p, vec2 a, vec2 b) { vec2 pa = p - a, ba = b - a; float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0); return length(pa - ba * h); }
float sdBox(vec2 p, vec2 b, float r) { vec2 q = abs(p) - b + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }
float fill(float d, float w) { return 1.0 - smoothstep(-w, w, d); }
mat2 rot(float a) { float c = cos(a), s = sin(a); return mat2(c, s, -s, c); }`;

// The big pictures span the whole tree when the sets agree.
export const BIG = `
// Seven bars, a reversed strip, then steps of grey.
vec3 bar(float i) {
  if (i < 0.5) return vec3(0.8);
  if (i < 1.5) return vec3(0.8, 0.8, 0.05);
  if (i < 2.5) return vec3(0.05, 0.8, 0.8);
  if (i < 3.5) return vec3(0.05, 0.8, 0.05);
  if (i < 4.5) return vec3(0.8, 0.05, 0.8);
  if (i < 5.5) return vec3(0.8, 0.05, 0.05);
  return vec3(0.05, 0.05, 0.8);
}
// An eye blinks its lids.
// It watches the look point.
vec3 eyeArt(vec2 p, vec2 look, float t, float s) {
  vec3 skin = mix(vec3(0.98, 0.7, 0.62), vec3(0.93, 0.5, 0.62), p.y * 0.6 + 0.5);
  float bt = mod(t + s * 3.7, 4.1);
  float open = clamp(abs(bt - 0.1) / 0.1, 0.0, 1.0);
  float xx = p.x / 0.56, env = max(1.0 - xx * xx, 0.0);
  float up = 0.3 * env * mix(0.02, 1.0, open) - 0.02 * (1.0 - open), lo = -0.23 * env;
  float inEye = fill(p.y - up, 0.008) * fill(lo - p.y, 0.008) * step(abs(xx), 1.0);
  vec3 col = vec3(0.97, 0.95, 0.94) - 0.3 * pow(abs(xx), 3.0) * vec3(0.1, 0.45, 0.4);
  vec2 ic = clamp(look, -1.0, 1.0) * vec2(0.22, 0.07);
  float ir = length(p - ic), a = atan(p.y - ic.y, p.x - ic.x);
  vec3 iris = mix(vec3(0.05, 0.38, 0.42), vec3(0.32, 0.82, 0.58), smoothstep(0.06, 0.16, ir));
  iris *= 0.75 + 0.25 * sin(a * 23.0 + vn(vec2(a * 3.0, s * 9.0)) * 4.0);
  col = mix(col, iris, fill(ir - 0.17, 0.006));
  col = mix(col, vec3(0.02, 0.1, 0.12), fill(abs(ir - 0.168) - 0.012, 0.006));
  col = mix(col, vec3(0.02), fill(ir - 0.075 - 0.01 * sin(t * 0.7), 0.006));
  col = mix(col, vec3(1.0), fill(length(p - ic - vec2(-0.05, 0.055)) - 0.026, 0.006));
  col *= 1.0 - 0.35 * smoothstep(0.1, 0.0, up - p.y);
  col = mix(skin, col, inEye);
  col = mix(col, vec3(0.16, 0.05, 0.1), fill(abs(p.y - up) - 0.012, 0.006) * step(abs(xx), 1.02));
  return col;
}
// The big pictures span the whole tree when the sets agree.
// In tree units, the sets span about two units each way.
vec3 bigImage(vec2 P, float t, vec2 look, float kind) {
  float r = length(P), a = atan(P.y, P.x);
  if (kind > 4.5) {
    // A giant heart beats across the whole tree.
    vec2 q = P / (1.35 * (1.0 + 0.08 * exp(-fract(t * 1.1) * 8.0))) - vec2(0.0, 0.1);
    float v = dot(q, q) - 1.0, h = v * v * v - q.x * q.x * q.y * q.y * q.y;
    vec3 bg = mix(vec3(0.3, 0.02, 0.15), vec3(0.6, 0.05, 0.3), P.y * 0.2 + 0.5) + vec3(1.0, 0.6, 0.8) * step(0.985, h21(floor(P * 30.0) + floor(t * 3.0))) * 0.6;
    return mix(bg, mix(vec3(1.0, 0.2, 0.45), vec3(1.0, 0.55, 0.7), smoothstep(-0.8, 1.2, q.y + q.x * 0.3)), step(h, 0.0));
  }
  if (kind > 3.5) {
    // Night vision: flak blooms and tracer streams climb across the tree.
    vec3 col = mix(vec3(0.02, 0.06, 0.03), vec3(0.05, 0.15, 0.06), P.y * 0.25 + 0.5);
    for (int i = 0; i < 8; i++) {
      float fi = float(i), T = t * 0.9 + fi * 0.125, k = floor(T), f = fract(T);
      vec2 c = vec2(-1.8 + 3.6 * h21(vec2(k, fi)), -0.4 + 1.6 * h21(vec2(k, fi + 5.0)));
      col += vec3(0.7, 1.0, 0.6) * smoothstep(0.4 * f + 0.05, 0.0, length(P - c)) * (1.0 - f) * 1.3;
    }
    for (int i = 0; i < 5; i++) {
      float fi = float(i);
      vec2 d = normalize(vec2(sin(fi * 2.3) * 0.5, 1.0)), q = P - vec2(-1.6 + fi * 0.8, -1.5);
      float along = dot(q, d), across = abs(q.x * d.y - q.y * d.x);
      col += vec3(0.6, 1.0, 0.5) * smoothstep(0.03, 0.0, across) * step(0.5, fract(along * 6.0 - t * 8.0)) * step(0.0, along) * step(along, fract(t * 0.7 + fi * 0.31) * 3.0);
    }
    return col;
  }
  if (kind < 0.5) return eyeArt(P * vec2(0.34, 0.4), look, t + 2.2, 0.37);
  if (kind < 1.5) {
    vec3 sky = mix(vec3(0.3, 0.75, 1.0), vec3(0.12, 0.3, 0.85), P.y * 0.3 + 0.5);
    sky = mix(sky, vec3(1.0, 0.92, 0.5), step(0.5, fract(a / (2.0 * PI) * 10.0 + t * 0.06)) * 0.6);
    vec3 col = mix(sky, mix(vec3(1.0, 0.93, 0.32), vec3(1.0, 0.58, 0.14), smoothstep(0.8, -0.9, P.y)), fill(r - 1.05, 0.02));
    float bt = mod(t, 3.1), open = clamp(abs(bt - 0.14) / 0.14, 0.0, 1.0);
    vec2 e = vec2(abs(P.x) - 0.42, P.y - 0.32);
    col = mix(col, vec3(0.22, 0.08, 0.05), fill(length(e / vec2(1.0, max(open, 0.08))) - 0.17, 0.02));
    col = mix(col, vec3(1.0, 0.45, 0.48), fill(length(vec2(abs(P.x) - 0.74, P.y + 0.12)) - 0.2, 0.05) * 0.7);
    col = mix(col, vec3(0.22, 0.08, 0.05), fill(abs(length(P - vec2(0.0, 0.12)) - 0.58) - 0.07, 0.02) * step(P.y, -0.06));
    return col;
  }
  if (kind < 2.5) {
    vec3 col = hue(fract(r * 0.55 + a / (2.0 * PI) - t * 0.22));
    return mix(col * 0.92, vec3(1.0), smoothstep(0.1, 0.0, abs(fract(r * 1.6 - t * 0.5) - 0.5) - 0.4) * 0.5);
  }
  // Colour bars span the tree, and a strip ticks along below.
  float i = floor(clamp((P.x + 1.75) / 3.5, 0.0, 0.999) * 7.0);
  if (P.y > -0.5) return bar(i);
  if (P.y > -0.68) return mod(i, 2.0) < 0.5 ? bar(6.0 - i) : vec3(0.06);
  return vec3(floor(clamp((P.x + 1.75) / 3.5, 0.0, 0.999) * 6.0) / 5.0 * 0.85 + 0.04) + vec3(0.9, 0.3, 0.5) * step(abs(fract(t * 0.25) * 3.5 - 1.75 - P.x), 0.15);
}
`;

// One function per programme, then the dispatch by channel number.
export const CHANNELS = `const vec2 ASP = vec2(4.0 / 3.0, 1.0);
const float PX = 1.0 / 120.0;
vec3 chBars(vec2 uv, float t) {
  float x = uv.x + sin(uv.y * 30.0 + t * 3.0) * 0.002;
  float i = floor(clamp(x, 0.0, 0.999) * 7.0);
  if (uv.y > 0.33) return bar(i);
  if (uv.y > 0.24) return mod(i, 2.0) < 0.5 ? bar(6.0 - i) : vec3(0.06);
  float j = floor(uv.x * 6.0);
  vec3 c = vec3(j / 5.0) * 0.85 + 0.04;
  // A small block drifts along the bottom strip.
  float bx = fract(t * 0.07);
  if (abs(uv.x - bx) < 0.04 && uv.y < 0.18 && uv.y > 0.06) c = vec3(0.95, 0.4, 0.6);
  return c;
}
vec3 chSnow(vec2 uv, float t) {
  float f = mod(floor(t * 30.0), 97.0);
  float n = h21(floor(uv * vec2(160.0, 120.0)) + f * vec2(17.0, 23.0));
  float l = h21(vec2(floor(uv.y * 120.0), f));
  n = mix(n, l, 0.22);
  return vec3(n * (0.85 + 0.15 * sin((uv.y + t * 0.4) * 6.283)));
}
// A smiling ball bounces off the edges and blushes a new colour.
vec3 chBounce(vec2 uv, float t, float s) {
  vec2 p = uv * ASP;
  float R = 0.14;
  vec2 tt = t * vec2(0.23, 0.31) + vec2(s * 3.1, s * 1.7);
  vec2 tri = abs(fract(tt) * 2.0 - 1.0);
  vec2 c = R + tri * (ASP - 2.0 * R);
  float n = floor(tt.x * 2.0) + floor(tt.y * 2.0);
  vec3 bc = mix(hue(fract(n * 0.137 + s)), vec3(1.0), 0.12);
  vec3 col = mix(vec3(0.04, 0.05, 0.2), vec3(0.14, 0.05, 0.26), uv.y);
  vec2 g = abs(fract(p * 7.0) - 0.5);
  col += 0.05 * step(0.45, max(g.x, g.y));
  // The ball squashes against whichever wall it touches.
  vec2 wall = min(c - R, ASP - R - c);
  vec2 sq = 1.0 - 0.28 * exp(-wall * 60.0);
  vec2 d = (p - c) / vec2(sq.x / sq.y, sq.y / sq.x);
  float ball = fill(length(d) - R, PX);
  vec3 bcol = bc * (0.72 + 0.4 * smoothstep(R, -R, d.y - d.x * 0.4));
  col = mix(col, vec3(0.0), fill(length((p - vec2(c.x, R * 0.25)) / vec2(1.0, 0.25)) - R * 0.9, 0.02) * 0.3);
  col = mix(col, bcol, ball);
  vec2 e = d / R;
  float face = max(fill(length(vec2(abs(e.x) - 0.36, e.y - 0.22)) - 0.14, 0.06), fill(abs(length(e - vec2(0.0, 0.12)) - 0.5) - 0.08, 0.06) * step(e.y, -0.08));
  return mix(col, vec3(0.1, 0.04, 0.14), face * ball);
}
// A striped sunset sun over swells, with one wave curling past.
vec3 chOcean(vec2 uv, float t) {
  vec3 col = mix(vec3(1.0, 0.56, 0.36), vec3(0.42, 0.2, 0.58), smoothstep(0.46, 1.0, uv.y));
  vec2 sp = (uv - vec2(0.5, 0.52)) * ASP;
  float sun = fill(length(sp) - 0.22, PX);
  float cut = step(fract(uv.y * 26.0 + t * 0.5), smoothstep(0.62, 0.44, uv.y) * 0.6);
  col = mix(col, mix(vec3(1.0, 0.86, 0.32), vec3(1.0, 0.36, 0.46), smoothstep(0.72, 0.36, uv.y)), sun * (1.0 - cut));
  float x = uv.x * 1.333;
  float hz = 0.42 + 0.006 * sin(x * 11.0 - t * 1.3);
  if (uv.y < hz) {
    vec3 sea = mix(vec3(0.05, 0.16, 0.4), vec3(0.18, 0.42, 0.66), smoothstep(0.0, hz, uv.y));
    float gl = step(0.72, vn(vec2(uv.x * 46.0, uv.y * 110.0 - t * 2.4))) * exp(-pow((uv.x - 0.5) * 6.0, 2.0)) * smoothstep(0.12, hz, uv.y);
    sea += vec3(1.0, 0.72, 0.5) * gl * 0.9;
    float ph = fract(t * 0.11);
    float wx = mix(-0.35, 1.35, ph);
    float bump = exp(-pow((uv.x - wx) * 4.5, 2.0));
    float w = 0.22 + 0.018 * sin(x * 13.0 + t * 2.1) + 0.012 * sin(x * 27.0 - t * 3.3) + 0.15 * bump;
    if (uv.y < w) {
      sea = mix(vec3(0.08, 0.3, 0.55), vec3(0.2, 0.62, 0.78), smoothstep(w - 0.2, w, uv.y));
      sea = mix(sea, vec3(0.95, 0.98, 1.0), smoothstep(0.022, 0.0, w - uv.y) * (0.55 + 0.45 * bump));
      // The crest throws a little spray ahead of itself.
      float sp2 = step(0.8, h21(floor(uv * vec2(160.0, 120.0)) + floor(t * 12.0))) * bump * smoothstep(0.06, 0.0, abs(uv.y - w + 0.01));
      sea += sp2 * 0.6;
    }
    float w2 = 0.1 + 0.012 * sin(x * 9.0 - t * 1.6);
    if (uv.y < w2) sea = mix(vec3(0.04, 0.2, 0.44), vec3(0.85, 0.95, 1.0), smoothstep(0.014, 0.0, w2 - uv.y));
    col = sea;
  }
  return col;
}
float sdHeart(vec2 p) {
  p.x = abs(p.x);
  if (p.y + p.x > 1.0) return sqrt(dot(p - vec2(0.25, 0.75), p - vec2(0.25, 0.75))) - sqrt(2.0) / 4.0;
  vec2 a = p - vec2(0.0, 1.0), b = p - 0.5 * max(p.x + p.y, 0.0);
  return sqrt(min(dot(a, a), dot(b, b))) * sign(p.x - p.y);
}
// A pixel heart beats twice a second, lub-dub.
vec3 chHeart(vec2 uv, float t) {
  vec2 g = (floor(uv * vec2(48.0, 36.0)) + 0.5) / vec2(48.0, 36.0);
  float b = mod(t * 1.1, 1.0);
  float beat = 1.0 + 0.17 * exp(-b * 11.0) + 0.11 * exp(-max(b - 0.2, 0.0) * 12.0) * step(0.2, b);
  vec2 p = (g - vec2(0.5, 0.5)) * ASP / (0.4 * beat) + vec2(0.0, 0.58);
  float d = sdHeart(p);
  vec3 col = mix(vec3(0.16, 0.04, 0.2), vec3(0.3, 0.06, 0.28), g.y);
  float sp = step(0.985, h21(floor(uv * vec2(48.0, 36.0)) + floor(t * 1.1) * 3.0));
  col += sp * vec3(1.0, 0.7, 0.9) * exp(-b * 4.0);
  vec3 hc = mix(vec3(0.95, 0.1, 0.3), vec3(1.0, 0.45, 0.6), smoothstep(-0.2, 1.2, p.y + p.x * 0.3));
  col = mix(col, hc, step(d, 0.0));
  col = mix(col, vec3(1.0, 0.9, 0.95), step(length(p - vec2(-0.32, 0.86)), 0.13));
  col = mix(col, vec3(0.5, 0.0, 0.15), step(abs(d), 0.045) * step(0.0, d));
  return col;
}
// A neon wire cube spins over a scrolling grid.
vec3 chCube(vec2 uv, float t) {
  vec3 col = mix(vec3(0.03, 0.01, 0.1), vec3(0.32, 0.06, 0.36), smoothstep(0.3, 1.0, uv.y));
  if (uv.y < 0.34) {
    float z = 0.12 / (0.345 - uv.y);
    float x = (uv.x - 0.5) * z * 2.4;
    float gz = abs(fract(z - t * 0.9) - 0.5), gx = abs(fract(x) - 0.5);
    float line = max(smoothstep(0.08 * z, 0.0, 0.5 - gz), smoothstep(0.06 * z, 0.0, 0.5 - gx));
    col = mix(vec3(0.05, 0.0, 0.1), vec3(1.0, 0.25, 0.8), line * smoothstep(0.0, 0.3, uv.y));
  }
  vec2 p = (uv - vec2(0.5, 0.6)) * ASP;
  float a = t * 0.9, b = t * 0.53;
  mat3 R = mat3(cos(a), 0.0, -sin(a), 0.0, 1.0, 0.0, sin(a), 0.0, cos(a)) * mat3(1.0, 0.0, 0.0, 0.0, cos(b), sin(b), 0.0, -sin(b), cos(b));
  float dm = 1e9;
  for (int k = 0; k < 8; k++) for (int ax = 0; ax < 3; ax++) {
    if (((k >> ax) & 1) == 1) continue;
    int k2 = k | (1 << ax);
    vec3 v1 = R * (vec3(float(k & 1), float((k >> 1) & 1), float((k >> 2) & 1)) * 2.0 - 1.0);
    vec3 v2 = R * (vec3(float(k2 & 1), float((k2 >> 1) & 1), float((k2 >> 2) & 1)) * 2.0 - 1.0);
    dm = min(dm, sdSeg(p, v1.xy * 0.62 / (4.0 - v1.z), v2.xy * 0.62 / (4.0 - v2.z)));
  }
  col += vec3(0.35, 1.0, 1.0) * (fill(dm - 0.004, PX) + 0.5 * exp(-dm * 45.0));
  return col;
}
// An original test card: grid, ring, ramps and colour checks.
vec3 chCard(vec2 uv, float t) {
  vec2 p = (uv - 0.5) * ASP;
  vec3 col = vec3(0.36, 0.38, 0.46);
  vec2 g = abs(fract(p * 9.0 + 0.5) - 0.5);
  col = mix(col, vec3(0.88), smoothstep(0.06, 0.02, min(g.x, g.y)));
  float r = length(p);
  if (r < 0.4) {
    if (p.y > 0.13) col = hue(floor((p.x + 0.4) * 7.5) / 7.0 + 0.02) * 0.9;
    else if (p.y > -0.03) col = vec3(floor((p.x + 0.4) / 0.8 * 7.0) / 6.0);
    else if (p.y > -0.2) col = vec3(step(0.0, sin(p.x * (40.0 + 140.0 * (p.x + 0.4)))));
    else col = mix(vec3(0.95, 0.75, 0.2), vec3(0.2, 0.25, 0.7), step(0.0, sin(r * 70.0 - t * 2.0)));
  }
  col = mix(col, vec3(1.0), smoothstep(0.012, 0.0, abs(r - 0.4)));
  col = mix(col, vec3(0.05), smoothstep(0.006, 0.0, min(abs(p.x), abs(p.y))) * step(r, 0.4));
  vec2 q = abs(p) - vec2(0.56, 0.4);
  if (q.x > -0.06 && q.y > -0.06) col = hue(step(0.0, p.x) * 0.5 + step(0.0, p.y) * 0.25);
  col = mix(col, vec3(1.0, 0.3, 0.3), step(length(p - vec2(0.0, 0.45)), 0.03) * step(0.5, fract(t)));
  return col;
}
// A pixel fish turns at each edge.
// Bubbles rise from its mouth.
vec3 chFish(vec2 uv, float t, float s) {
  vec2 res = vec2(64.0, 48.0), q = (floor(uv * res) + 0.5) / res;
  vec3 col = mix(vec3(0.02, 0.16, 0.38), vec3(0.08, 0.56, 0.72), q.y);
  col += 0.05 * step(0.7, sin(q.x * 18.0 + q.y * 7.0 + t * 0.5));
  float sand = 0.1 + 0.025 * sin(q.x * 13.0 + 1.0);
  if (q.y < sand) col = vec3(0.9, 0.74, 0.42) * (0.85 + 0.15 * h21(floor(uv * res)));
  for (int i = 0; i < 3; i++) {
    float fi = float(i), x0 = 0.14 + 0.36 * fi + 0.04 * s;
    float sw = 0.035 * sin(t * 1.3 + fi * 2.0 + q.y * 7.0) * q.y;
    if (abs(q.x - x0 - sw) < 0.02 && q.y < 0.42 + 0.12 * mod(fi, 2.0)) col = vec3(0.16, 0.62, 0.32) * (0.8 + 0.2 * step(0.5, fract(q.y * 12.0)));
  }
  float T = t * 0.16 + s, ph = fract(T), dir = mod(floor(T), 2.0) < 0.5 ? 1.0 : -1.0;
  float fx = mix(-0.2, 1.2, dir > 0.0 ? ph : 1.0 - ph), fy = 0.56 + 0.12 * sin(t * 0.9 + s * 5.0);
  vec2 d = (q - vec2(fx, fy)) * ASP;
  d.x *= dir;
  float body = step(length(d / vec2(0.15, 0.085)), 1.0);
  vec2 td = d - vec2(-0.15, sin(t * 9.0) * 0.015);
  float tail = step(abs(td.y), (0.07 + td.x) * 0.9) * step(td.x, 0.0) * step(-0.07, td.x);
  vec3 fc = vec3(1.0, 0.48, 0.12);
  if (abs(d.x - 0.03) < 0.02 || abs(d.x + 0.07) < 0.016) fc = vec3(1.0, 0.95, 0.9);
  col = mix(col, fc, max(body, tail));
  col = mix(col, vec3(0.05), step(length(d - vec2(0.085, 0.02)), 0.022));
  for (int i = 0; i < 4; i++) {
    float fi = float(i), bt = fract(t * 0.5 + fi * 0.25);
    vec2 bp = vec2(fx + dir * 0.13 / 1.333 + 0.02 * sin(bt * 12.0 + fi), fy + bt * 0.5);
    float rr = length((q - bp) * ASP);
    col = mix(col, vec3(0.8, 0.95, 1.0), step(abs(rr - 0.016 - 0.008 * fi), 0.008) * (1.0 - bt));
  }
  return col;
}
vec3 chEye(vec2 uv, float t, vec2 look, float s) { return eyeArt((uv - 0.5) * ASP / 0.85, look, t, s); }
// A radar sweep paints drifting rain as it passes.
vec3 chRadar(vec2 uv, float t) {
  vec2 p = (uv - 0.5) * ASP;
  float r = length(p), a = atan(p.y, p.x);
  vec3 col = vec3(0.01, 0.06, 0.03);
  float da = mod(t * 1.4 - a, 2.0 * PI), trail = exp(-da * 1.6), disc = step(r, 0.47);
  float w = fbm(p * 5.0 + vec2(t * 0.06, t * 0.02));
  vec3 rc = mix(vec3(0.1, 0.85, 0.25), vec3(1.0, 0.9, 0.1), smoothstep(0.6, 0.7, w));
  rc = mix(rc, vec3(1.0, 0.25, 0.15), smoothstep(0.7, 0.78, w));
  col += rc * smoothstep(0.52, 0.56, w) * disc * (0.3 + 0.7 * trail);
  col += vec3(0.1, 0.5, 0.2) * smoothstep(0.004, 0.0, abs(fract(r * 8.0 + 0.5) - 0.5) / 8.0) * disc * 0.6;
  col += vec3(0.1, 0.5, 0.2) * smoothstep(0.004, 0.0, min(abs(p.x), abs(p.y))) * disc * 0.5;
  col += vec3(0.25, 1.0, 0.45) * (trail * 0.3 + exp(-da * 40.0) * 0.6) * disc;
  return col * mix(1.0, 0.3, smoothstep(0.46, 0.48, r));
}
// Lava rises and sinks in slow blobs.
vec3 chLava(vec2 uv, float t) {
  vec2 p = (uv - 0.5) * ASP;
  float f = 0.0;
  for (int i = 0; i < 6; i++) {
    float fi = float(i);
    vec2 c = vec2(0.42 * sin(fi * 1.7 + t * 0.13 * (1.0 + fi * 0.17)), 0.4 * sin(t * 0.23 * (0.6 + fi * 0.11) + fi * 2.3));
    float r = 0.075 + 0.03 * sin(fi * 3.1);
    f += r * r / (dot(p - c, p - c) + 0.0005);
  }
  vec3 bg = mix(vec3(0.24, 0.02, 0.22), vec3(0.55, 0.08, 0.28), uv.y) + vec3(0.3, 0.06, 0.0) * smoothstep(0.35, 0.9, f);
  vec3 blob = mix(vec3(1.0, 0.33, 0.06), vec3(1.0, 0.86, 0.25), smoothstep(1.1, 3.2, f));
  return mix(bg, blob, smoothstep(0.92, 1.08, f));
}
// The tree on the tree: a tiny tree whose sets swing too.
vec3 chTree(vec2 uv, float t, float s) {
  vec2 p = (uv - vec2(0.5, 0.06)) * ASP;
  vec3 col = mix(vec3(0.05, 0.03, 0.14), vec3(0.17, 0.07, 0.27), uv.y);
  float sw = 0.02 * sin(t * 1.2);
  vec2 top = vec2(sw * 0.5, 0.42);
  float d = sdSeg(p, vec2(0.0), top) - 0.034 * (1.1 - p.y);
  d = min(d, sdSeg(p, vec2(sw * 0.4, 0.28), vec2(-0.34 + sw, 0.44)) - 0.013);
  d = min(d, sdSeg(p, vec2(sw * 0.4, 0.34), vec2(0.36 + sw, 0.5)) - 0.013);
  d = min(d, sdSeg(p, top, vec2(-0.16 + sw, 0.74)) - 0.012);
  d = min(d, sdSeg(p, top, vec2(0.18 + sw, 0.77)) - 0.012);
  col = mix(col, vec3(0.5, 0.27, 0.2), fill(d, PX));
  for (int i = 0; i < 6; i++) {
    float fi = float(i);
    vec2 a = vec2(fi < 3.0 ? -0.08 - 0.09 * fi : 0.08 + 0.09 * (fi - 3.0), fi < 3.0 ? 0.33 + 0.04 * fi + 0.17 * step(1.5, fi) : 0.38 + 0.04 * (fi - 3.0) + 0.17 * step(4.5, fi)) + vec2(sw, 0.0);
    float ang = 0.3 * sin(t * 2.3 + fi * 1.3);
    vec2 dir = vec2(sin(ang), -cos(ang)), c = a + dir * 0.1;
    col = mix(col, vec3(0.05), fill(sdSeg(p, a, c) - 0.002, PX));
    vec2 b = rot(ang) * (p - c - dir * 0.04);
    col = mix(col, hue(fi / 6.0 + s) * 0.9, fill(sdBox(b, vec2(0.05, 0.04), 0.012), PX));
    col = mix(col, hue(h21(vec2(fi, floor(t * 2.5 + fi)))) + 0.3, fill(sdBox(b - vec2(-0.008, 0.0), vec2(0.032, 0.026), 0.008), PX));
  }
  return col;
}
// A seven-segment digit in a box one wide and two tall.
float seg7(vec2 p, int d) {
  int m = d == 0 ? 63 : d == 1 ? 6 : d == 2 ? 91 : d == 3 ? 79 : d == 4 ? 102 : d == 5 ? 109 : d == 6 ? 125 : d == 7 ? 7 : d == 8 ? 127 : 111;
  float c = 0.0;
  if ((m & 1) != 0) c = max(c, fill(sdBox(p - vec2(0.5, 1.9), vec2(0.36, 0.08), 0.04), 0.03));
  if ((m & 2) != 0) c = max(c, fill(sdBox(p - vec2(0.9, 1.45), vec2(0.08, 0.36), 0.04), 0.03));
  if ((m & 4) != 0) c = max(c, fill(sdBox(p - vec2(0.9, 0.55), vec2(0.08, 0.36), 0.04), 0.03));
  if ((m & 8) != 0) c = max(c, fill(sdBox(p - vec2(0.5, 0.1), vec2(0.36, 0.08), 0.04), 0.03));
  if ((m & 16) != 0) c = max(c, fill(sdBox(p - vec2(0.1, 0.55), vec2(0.08, 0.36), 0.04), 0.03));
  if ((m & 32) != 0) c = max(c, fill(sdBox(p - vec2(0.1, 1.45), vec2(0.08, 0.36), 0.04), 0.03));
  if ((m & 64) != 0) c = max(c, fill(sdBox(p - vec2(0.5, 1.0), vec2(0.36, 0.08), 0.04), 0.03));
  return c;
}
float stars2(vec2 uv, float k) { return step(k, h21(floor(uv * vec2(160.0, 120.0)))); }
// A weather map: land, sea, isobars and a cold front with its teeth.
vec3 chWeather(vec2 uv, float t) {
  vec2 p = uv * ASP * 2.0 + vec2(t * 0.05, 0.0);
  float h = fbm(p * 1.2);
  vec3 col = mix(vec3(0.16, 0.42, 0.24), vec3(0.62, 0.58, 0.32), smoothstep(0.5, 0.66, h));
  col = mix(vec3(0.1, 0.24, 0.5), col, step(0.47, h));
  float iso = abs(fract(fbm(p * 0.6 + 3.0) * 8.0 - t * 0.1) - 0.5);
  col = mix(col, vec3(0.95), smoothstep(0.08, 0.03, iso) * 0.7);
  float fl = uv.x - (fract(t * 0.05) * 1.6 - 0.3) - 0.08 * sin(uv.y * 6.0);
  float tooth = step(fl * 28.0, 1.0 - abs(fract(uv.y * 9.0) - 0.5) * 2.0) * step(0.0, fl);
  col = mix(col, vec3(0.15, 0.35, 1.0), max(smoothstep(0.012, 0.0, abs(fl)), tooth));
  return col;
}
// A wall clock; the hands run fast.
vec3 chClock(vec2 uv, float t) {
  vec2 p = (uv - 0.5) * ASP;
  vec3 col = vec3(0.1, 0.12, 0.2);
  float r = length(p), a = atan(p.x, p.y);
  col = mix(col, vec3(0.94, 0.92, 0.86), fill(r - 0.42, PX));
  float tick = abs(fract(a / (2.0 * PI) * 12.0 + 0.5) - 0.5);
  col = mix(col, vec3(0.1), step(r, 0.4) * step(0.34, r) * step(tick, 0.06));
  float sa = floor(t) / 60.0 * 2.0 * PI, ma = t * 0.1, ha = t * 0.0083;
  col = mix(col, vec3(0.1), fill(sdSeg(p, vec2(0.0), 0.22 * vec2(sin(ha), cos(ha))) - 0.022, PX));
  col = mix(col, vec3(0.1), fill(sdSeg(p, vec2(0.0), 0.32 * vec2(sin(ma), cos(ma))) - 0.014, PX));
  col = mix(col, vec3(0.9, 0.15, 0.15), fill(sdSeg(p, -0.06 * vec2(sin(sa), cos(sa)), 0.36 * vec2(sin(sa), cos(sa))) - 0.006, PX));
  return mix(col, vec3(0.9, 0.15, 0.15), fill(r - 0.025, PX));
}
// A film leader counts down from nine.
vec3 chCount(vec2 uv, float t) {
  vec2 p = (uv - 0.5) * ASP;
  float a = atan(p.x, p.y) / (2.0 * PI) + 0.5, r = length(p);
  vec3 col = mix(vec3(0.55, 0.5, 0.42), vec3(0.32, 0.28, 0.24), step(a, fract(t)));
  col = mix(col, vec3(0.08), max(smoothstep(0.008, 0.0, abs(p.x)), smoothstep(0.008, 0.0, abs(p.y))));
  col = mix(col, vec3(0.9), max(smoothstep(0.012, 0.0, abs(r - 0.36)), smoothstep(0.012, 0.0, abs(r - 0.42))));
  return mix(col, vec3(0.06), seg7((p - vec2(-0.12, -0.24)) / 0.24, 9 - int(mod(floor(t), 10.0))));
}
// Stars stream past at warp speed.
vec3 chStars(vec2 uv, float t) {
  vec2 p = (uv - 0.5) * ASP;
  vec3 col = vec3(0.01, 0.0, 0.04);
  float a = atan(p.y, p.x), r = length(p);
  for (int i = 0; i < 3; i++) {
    float fi = float(i), sl = floor(a * 40.0 / PI + fi * 0.33);
    float sp = h21(vec2(sl, fi)), z = fract(sp * 7.3 + t * (0.3 + sp * 0.5) + fi * 0.33);
    float ang = (sl - fi * 0.33 + 0.5) * PI / 40.0, rr = z * z * 0.9, len = 0.02 + z * z * 0.12;
    col += mix(vec3(0.6, 0.7, 1.0), vec3(1.0), sp) * smoothstep(0.004 + z * 0.006, 0.0, abs(a - ang) * r) * step(rr - len, r) * step(r, rr) * z * 2.0;
  }
  return col;
}
// Two paddles rally a square ball; the score ticks over.
vec3 chPaddle(vec2 uv, float t) {
  vec2 p = uv * ASP;
  vec3 col = vec3(0.02, 0.05, 0.03), g = vec3(0.5, 1.0, 0.6);
  col += vec3(0.1, 0.5, 0.2) * step(abs(p.x - ASP.x * 0.5), 0.006) * step(0.5, fract(uv.y * 12.0));
  vec2 tri = abs(fract(vec2(t * 0.45, t * 0.61)) * 2.0 - 1.0);
  vec2 b = vec2(0.08 + tri.x * (ASP.x - 0.16), 0.06 + tri.y * 0.88);
  float ly = clamp(b.y + 0.08 * sin(t * 1.7), 0.12, 0.88), ry = clamp(b.y - 0.07 * sin(t * 1.3), 0.12, 0.88);
  col = mix(col, g, step(abs(p.x - 0.05), 0.012) * step(abs(p.y - ly), 0.09));
  col = mix(col, g, step(abs(p.x - ASP.x + 0.05), 0.012) * step(abs(p.y - ry), 0.09));
  col = mix(col, g, step(max(abs(p.x - b.x), abs(p.y - b.y)), 0.016));
  col = mix(col, g * 0.7, seg7((p - vec2(0.5, 0.8)) / 0.06, int(mod(floor(t * 0.45 + 0.5), 10.0))));
  return mix(col, g * 0.7, seg7((p - vec2(0.77, 0.8)) / 0.06, int(mod(floor(t * 0.45), 10.0))));
}
// A graphic equaliser jumps with peak caps.
vec3 chEq(vec2 uv, float t) {
  vec3 col = vec3(0.03, 0.02, 0.08);
  float i = floor(uv.x * 16.0), x = fract(uv.x * 16.0);
  float h = 0.15 + 0.7 * pow(vn(vec2(i * 1.7, t * 4.0)), 1.5) * (1.0 - i / 24.0);
  float cell = step(0.15, x) * step(x, 0.85) * step(0.2, fract(uv.y * 20.0));
  vec3 c = mix(vec3(0.2, 1.0, 0.4), vec3(1.0, 0.9, 0.2), smoothstep(0.4, 0.7, uv.y));
  c = mix(c, vec3(1.0, 0.2, 0.2), smoothstep(0.75, 0.85, uv.y));
  col = mix(col, c, cell * step(uv.y, h));
  return mix(col, vec3(1.0), step(0.15, x) * step(x, 0.85) * step(abs(uv.y - h - 0.05 - 0.05 * vn(vec2(i, t))), 0.012));
}
// A scope traces a slowly turning figure.
vec3 chScope(vec2 uv, float t) {
  vec2 p = (uv - 0.5) * ASP, g = abs(fract(p * 6.0) - 0.5);
  vec3 col = vec3(0.01, 0.05, 0.03) + vec3(0.0, 0.14, 0.07) * smoothstep(0.46, 0.5, max(g.x, g.y));
  float dm = 1e9;
  vec2 prev = vec2(0.0, 0.0);
  for (int k = 0; k <= 48; k++) {
    float u = float(k) / 48.0 * 2.0 * PI;
    vec2 q = vec2(0.42 * sin(3.0 * u + t * 0.7), 0.36 * sin(2.0 * u));
    if (k > 0) dm = min(dm, sdSeg(p, prev, q));
    prev = q;
  }
  return col + vec3(0.3, 1.0, 0.5) * (fill(dm - 0.004, PX) + 0.4 * exp(-dm * 50.0));
}
// Mirrored colour folds turn like a kaleidoscope.
vec3 chKaleido(vec2 uv, float t) {
  vec2 p = (uv - 0.5) * ASP;
  float r = length(p), k = PI / 4.0, a = abs(mod(atan(p.y, p.x) + t * 0.2, 2.0 * k) - k);
  float n = fbm(vec2(cos(a), sin(a)) * r * 3.0 + vec2(t * 0.3, -t * 0.2));
  vec3 col = hue(fract(n * 1.5 + t * 0.05)) * (0.4 + 0.8 * smoothstep(0.3, 0.7, n));
  return col * smoothstep(0.62, 0.5, r) + vec3(0.03);
}
// Old demo plasma.
vec3 chPlasma(vec2 uv, float t) {
  vec2 p = uv * ASP * 4.0;
  float v = sin(p.x + t) + sin(p.y * 1.3 - t * 0.7) + sin((p.x + p.y) * 0.7 + t * 0.5) + sin(length(p - vec2(2.6 + sin(t * 0.3) * 2.0, 2.0)) * 1.5);
  return 0.5 + 0.5 * cos(v * 1.4 + vec3(0.0, 2.1, 4.2) + t * 0.2);
}
// Rain runs down a window over blurred city lights.
vec3 chRain(vec2 uv, float t) {
  vec3 col = mix(vec3(0.05, 0.08, 0.16), vec3(0.15, 0.2, 0.3), uv.y);
  for (int i = 0; i < 8; i++) {
    float fi = float(i);
    vec2 c = vec2(h21(vec2(fi, 1.0)) * 1.33, 0.1 + 0.5 * h21(vec2(fi, 2.0)));
    col += hue(h21(vec2(fi, 3.0)) * 0.3 + 0.02) * 0.35 * smoothstep(0.09, 0.07, length(uv * ASP - c));
  }
  float cx = floor(uv.x * 24.0), sp = h21(vec2(cx, 9.0)), y = fract(uv.y + t * (0.25 + sp * 0.4) + sp);
  float drop = smoothstep(0.03, 0.0, abs(fract(uv.x * 24.0) - 0.5) - 0.12) * smoothstep(0.0, 0.04, y) * smoothstep(0.2, 0.05, y) * step(0.45, sp);
  return col + vec3(0.6, 0.7, 0.85) * drop * 0.7;
}
// A fire burns on two crossed logs.
vec3 chFire(vec2 uv, float t) {
  vec2 p = uv * ASP;
  float h = (1.0 - uv.y) * 1.3 - 0.3 + fbm(vec2(p.x * 3.0, p.y * 2.0 - t * 1.6)) * 0.7 - abs(uv.x - 0.5) * 0.9;
  vec3 col = vec3(0.06, 0.02, 0.02);
  col = mix(col, vec3(0.8, 0.12, 0.02), smoothstep(0.25, 0.35, h));
  col = mix(col, vec3(1.0, 0.55, 0.05), smoothstep(0.45, 0.55, h));
  col = mix(col, vec3(1.0, 0.95, 0.6), smoothstep(0.7, 0.8, h));
  col = mix(col, vec3(0.22, 0.1, 0.05), fill(sdBox(rot(0.2) * (p - vec2(0.67, 0.1)), vec2(0.35, 0.04), 0.03), PX));
  return mix(col, vec3(0.18, 0.08, 0.04), fill(sdBox(rot(-0.25) * (p - vec2(0.67, 0.12)), vec2(0.33, 0.04), 0.03), PX));
}
// A jellyfish pulses up through dark water.
vec3 chJelly(vec2 uv, float t) {
  vec2 p = (uv - 0.5) * ASP;
  vec3 col = mix(vec3(0.0, 0.04, 0.12), vec3(0.02, 0.15, 0.3), uv.y) + vec3(0.06, 0.09, 0.15) * stars2(uv, 0.995);
  float pulse = 0.5 + 0.5 * sin(t * 2.0);
  vec2 c = vec2(0.1 * sin(t * 0.3), 0.08 + 0.05 * sin(t * 2.0 - 1.0)), q = p - c;
  float body = step(length(q / vec2(0.22 + 0.04 * pulse, 0.17 - 0.03 * pulse)), 1.0) * step(-0.02, q.y);
  vec3 jc = mix(vec3(1.0, 0.4, 0.8), vec3(0.7, 0.5, 1.0), clamp(q.y * 4.0 + 0.5, 0.0, 1.0));
  col = mix(col, jc, body * 0.85);
  for (int i = 0; i < 5; i++) {
    float fi = float(i), x0 = c.x + (fi - 2.0) * 0.07, wave = 0.03 * sin(q.y * 20.0 + t * 3.0 + fi);
    col = mix(col, jc * 0.8, smoothstep(0.012, 0.0, abs(p.x - x0 - wave)) * step(p.y, c.y) * step(c.y - 0.3 - 0.05 * sin(fi), p.y));
  }
  return col;
}
// The moon runs through its phases.
vec3 chMoon(vec2 uv, float t) {
  vec2 p = (uv - 0.5) * ASP;
  vec3 col = vec3(0.02, 0.02, 0.07) + stars2(uv, 0.993) * 0.6;
  float R = 0.3;
  if (length(p) < R) {
    float ph = fract(t * 0.08) * 2.0 * PI;
    vec3 n = vec3(p / R, sqrt(max(0.0, 1.0 - dot(p, p) / (R * R))));
    float lit = smoothstep(-0.03, 0.03, dot(n, vec3(sin(ph), 0.0, -cos(ph))));
    col = mix(vec3(0.05, 0.05, 0.1), vec3(0.9, 0.88, 0.8) * (0.85 - 0.25 * smoothstep(0.5, 0.7, fbm(p * 9.0))), lit);
  }
  return col;
}
// A banded planet sits inside its tilted ring.
vec3 chPlanet(vec2 uv, float t) {
  vec2 p = (uv - 0.5) * ASP, rq = rot(-0.35) * p;
  vec3 col = vec3(0.01, 0.0, 0.05) + stars2(uv, 0.994) * 0.7;
  float ring = length(rq / vec2(1.0, 0.28)), inR = step(0.3, ring) * step(ring, 0.46), R = 0.2, r = length(p);
  vec3 rc = mix(vec3(0.85, 0.7, 0.45), vec3(0.6, 0.45, 0.3), step(0.5, fract(ring * 30.0)));
  if (rq.y > 0.0) col = mix(col, rc, inR);
  if (r < R) {
    float lat = rq.y / R;
    vec3 pc = mix(vec3(0.9, 0.6, 0.3), vec3(0.7, 0.35, 0.2), step(0.5, fract(lat * 4.0 + 0.1 * sin(lat * 9.0 + t))));
    col = pc * (0.35 + 0.65 * sqrt(max(0.0, 1.0 - r * r / (R * R))) * smoothstep(-0.4, 0.4, p.y - p.x + 0.1));
  }
  if (rq.y <= 0.0) col = mix(col, rc, inR);
  return col;
}
// A tunnel of rings rushes toward you.
vec3 chTunnel(vec2 uv, float t) {
  vec2 p = (uv - 0.5) * ASP;
  float r = length(p) + 1e-3, a = atan(p.y, p.x), z = 0.3 / r + t * 1.2;
  float c = step(0.5, fract(z)) * 0.5 + 0.5 * step(0.5, fract(a / PI * 4.0 + z * 0.2));
  return mix(vec3(0.15, 0.0, 0.35), vec3(0.0, 0.9, 1.0), c * 0.7) * smoothstep(0.0, 0.35, r);
}
// A snake winds across a grass grid toward an apple.
vec3 chSnake(vec2 uv, float t) {
  vec2 g = floor(uv * vec2(32.0, 24.0));
  vec3 col = mix(vec3(0.12, 0.18, 0.06), vec3(0.15, 0.22, 0.08), mod(g.x + g.y, 2.0));
  for (int k = 0; k < 14; k++) {
    float tk = floor(t * 8.0) - float(k);
    vec2 c = floor(vec2(16.0 + 13.0 * sin(tk * 0.11), 12.0 + 9.0 * sin(tk * 0.17 + 1.0)));
    if (g == c) col = mix(vec3(0.6, 1.0, 0.2), vec3(0.2, 0.6, 0.1), float(k) / 14.0);
  }
  vec2 food = floor(vec2(5.0 + 22.0 * h21(vec2(floor(t * 0.3), 1.0)), 3.0 + 18.0 * h21(vec2(floor(t * 0.3), 2.0))));
  return g == food ? vec3(1.0, 0.25, 0.25) : col;
}
// Blocks fall and stack; the well clears every twelve seconds.
vec3 chBlocks(vec2 uv, float t) {
  vec2 g = floor(uv * vec2(16.0, 12.0)), f = fract(uv * vec2(16.0, 12.0));
  float cyc = floor(t / 12.0), tt = mod(t, 12.0);
  float hgt = floor(h21(vec2(g.x, cyc)) * 4.0 + tt * 0.5 * h21(vec2(g.x, cyc + 0.5)));
  float px = floor(h21(vec2(floor(tt * 0.8), cyc)) * 14.0), py = 11.0 - floor(fract(tt * 0.8) * 12.0);
  float on = max(step(g.y, hgt - 1.0), step(abs(g.x - px - 0.5), 0.6) * step(abs(g.y - py), 0.5));
  float bev = smoothstep(0.0, 0.12, min(min(f.x, f.y), min(1.0 - f.x, 1.0 - f.y)));
  return mix(vec3(0.04, 0.03, 0.1), hue(h21(vec2(g.x, floor(g.y / 2.0) + cyc))) * (0.6 + 0.4 * bev), on);
}
// Snow falls on two hills and a little fir.
vec3 chHills(vec2 uv, float t) {
  vec3 col = mix(vec3(0.12, 0.16, 0.3), vec3(0.3, 0.38, 0.6), uv.y);
  float h1 = 0.45 + 0.08 * sin(uv.x * 5.0 + 1.0) + 0.04 * sin(uv.x * 13.0), h2 = 0.3 + 0.06 * sin(uv.x * 7.0 + 3.0);
  col = mix(col, vec3(0.75, 0.8, 0.92), step(uv.y, h1));
  col = mix(col, vec3(0.92, 0.95, 1.0), step(uv.y, h2));
  vec2 p = (uv - vec2(0.7, h2 - 0.01)) * ASP;
  col = mix(col, vec3(0.1, 0.3, 0.2), step(abs(p.x) * 2.2, 0.22 - p.y) * step(0.0, p.y));
  for (int i = 0; i < 3; i++) {
    float fi = float(i), sc = 30.0 + fi * 20.0;
    vec2 q = uv * vec2(sc * 1.33, sc) + vec2(sin(t + fi) * 0.5, t * (2.0 + fi));
    col = mix(col, vec3(1.0), step(0.82, h21(floor(q) + fi * 7.0)) * step(length(fract(q) - 0.5), 0.15 + 0.05 * fi));
  }
  return col;
}
// A night skyline; windows switch on and off.
vec3 chCity(vec2 uv, float t) {
  vec3 col = mix(vec3(0.05, 0.03, 0.15), vec3(0.3, 0.1, 0.35), smoothstep(0.8, 0.2, uv.y));
  col = mix(col, vec3(1.0, 0.9, 0.7), step(length((uv - vec2(0.8, 0.8)) * ASP), 0.06));
  for (int L = 0; L < 2; L++) {
    float fl = float(L), w = 0.06 + 0.04 * fl, bx = floor(uv.x / w + fl * 3.3), hb = 0.25 + 0.35 * h21(vec2(bx, fl)) - 0.12 * fl;
    if (uv.y < hb) {
      col = vec3(0.04 + 0.03 * fl, 0.03, 0.08);
      vec2 wn = vec2(fract(uv.x / w + fl * 3.3) * 4.0, uv.y * 60.0), wc = floor(wn);
      float lit = step(0.55, h21(wc + bx * 13.0 + floor(t * 0.2 + h21(wc + bx) * 5.0)));
      float win = step(0.3, fract(wn.x)) * step(fract(wn.x), 0.8) * step(0.3, fract(wn.y)) * step(fract(wn.y), 0.8) * step(0.5, wc.x) * step(wc.x, 2.5);
      col = mix(col, vec3(1.0, 0.8, 0.4), win * lit * step(uv.y, hb - 0.03));
    }
  }
  return col;
}
// A night highway runs to the horizon behind a car.
vec3 chRoad(vec2 uv, float t) {
  vec3 col = mix(vec3(0.4, 0.15, 0.4), vec3(0.08, 0.05, 0.2), uv.y);
  float hz = 0.55;
  if (uv.y < hz) {
    float z = 0.2 / (hz - uv.y + 0.001), x = (uv.x - 0.5) * z, road = step(abs(x), 0.6);
    col = mix(vec3(0.06, 0.05, 0.08), vec3(0.15, 0.14, 0.18), road);
    col = mix(col, vec3(1.0, 0.85, 0.3), road * step(abs(x), 0.02) * step(0.5, fract(z * 0.8 - t * 2.0)));
    col = mix(col, vec3(0.9), step(abs(abs(x) - 0.56), 0.02));
  }
  vec2 tl = vec2(0.5 + 0.06 * sin(t * 0.7), 0.42);
  float lights = step(length((uv - tl - vec2(0.03, 0.0)) * ASP), 0.012) + step(length((uv - tl + vec2(0.03, 0.0)) * ASP), 0.012);
  return mix(col, vec3(1.0, 0.1, 0.1), min(lights, 1.0));
}
// A lighthouse sweeps its beam over a dark sea.
vec3 chLight(vec2 uv, float t) {
  vec3 col = mix(vec3(0.05, 0.06, 0.15), vec3(0.12, 0.12, 0.25), uv.y);
  vec2 top = vec2(0.3, 0.62), d = (uv - top) * ASP;
  float th = t * 1.2, c = dot(normalize(d + 1e-4), normalize(vec2(cos(th), 0.1)));
  col += vec3(1.0, 0.95, 0.7) * smoothstep(0.97, 0.998, c) * 0.5 * (0.3 + 0.7 * abs(cos(th)));
  if (uv.y < 0.3) col = mix(vec3(0.02, 0.05, 0.12), vec3(0.05, 0.12, 0.25), uv.y / 0.3) + vec3(0.12) * step(0.8, vn(vec2(uv.x * 40.0, uv.y * 80.0 - t)));
  col = mix(col, vec3(0.08, 0.07, 0.1), step(uv.y, 0.3 + 0.03 * sin(uv.x * 20.0)) * step(abs(uv.x - 0.3), 0.15));
  vec2 q = uv - vec2(0.3, 0.3);
  col = mix(col, mix(vec3(0.9), vec3(0.8, 0.15, 0.15), step(0.5, fract(q.y * 10.0))), step(abs(q.x * ASP.x), 0.05 - q.y * 0.04) * step(0.0, q.y) * step(q.y, 0.32));
  return mix(col, vec3(1.0, 0.95, 0.6), step(length(d), 0.03));
}
// Fireworks burst, droop and fade.
vec3 chWorks(vec2 uv, float t) {
  vec2 p = uv * ASP;
  vec3 col = vec3(0.02, 0.01, 0.06);
  for (int i = 0; i < 3; i++) {
    float fi = float(i), T = t * 0.5 + fi * 0.33, k = floor(T), f = fract(T);
    vec2 c = vec2(0.25 + 0.85 * h21(vec2(k, fi)), 0.55 + 0.3 * h21(vec2(k, fi + 5.0)));
    vec3 hc = hue(h21(vec2(k, fi + 9.0)));
    for (int j = 0; j < 16; j++) {
      float a = float(j) / 16.0 * 2.0 * PI;
      col += hc * smoothstep(0.012, 0.0, length(p - c - vec2(cos(a), sin(a)) * f * 0.3 + vec2(0.0, f * f * 0.12))) * (1.0 - f) * 1.5;
    }
  }
  return col;
}
// A flower mandala breathes and turns.
vec3 chMandala(vec2 uv, float t) {
  vec2 p = (uv - 0.5) * ASP;
  float r = length(p), a = atan(p.y, p.x);
  vec3 col = vec3(0.08, 0.02, 0.12);
  col = mix(col, vec3(0.95, 0.4, 0.2), step(r, abs(sin(a * 6.0 + t * 0.5)) * 0.2 + 0.22));
  col = mix(col, vec3(1.0, 0.8, 0.3), step(r, abs(cos(a * 12.0 - t * 0.8)) * 0.06 + 0.11));
  col = mix(col, vec3(0.2, 0.5, 0.9), step(abs(r - 0.38 - 0.02 * sin(a * 18.0 + t)), 0.012));
  return mix(col, vec3(0.3, 0.1, 0.5), step(r, 0.04));
}
// A cat blinks and watches the pointer.
vec3 chCat(vec2 uv, float t, vec2 look) {
  vec2 p = (uv - vec2(0.5, 0.42)) * ASP;
  vec3 col = mix(vec3(0.95, 0.75, 0.4), vec3(0.95, 0.6, 0.35), uv.y), fur = vec3(0.25, 0.22, 0.3);
  vec2 e1 = vec2(abs(p.x) - 0.2, p.y - 0.28);
  float ear = max(abs(e1.x) * 1.4 + e1.y * 0.9 - 0.12, -e1.y - 0.05);
  col = mix(col, fur, fill(min(length(p / vec2(1.0, 0.85)) - 0.32, ear), PX));
  float bl = step(0.12, mod(t, 3.7));
  vec2 off = clamp(look, -1.0, 1.0) * vec2(0.025, 0.02);
  for (int i = 0; i < 2; i++) {
    vec2 ec = vec2(i == 0 ? -0.12 : 0.12, 0.05);
    col = mix(col, vec3(0.7, 0.95, 0.3), fill(length((p - ec) / vec2(1.0, max(bl, 0.05))) - 0.065, PX));
    col = mix(col, vec3(0.05), fill(length((p - ec - off) / vec2(0.35, 1.0)) - 0.04, PX) * bl);
  }
  col = mix(col, vec3(0.95, 0.5, 0.6), fill(length((p - vec2(0.0, -0.06)) / vec2(1.0, 0.7)) - 0.025, PX));
  vec2 m = vec2(abs(p.x), p.y);
  return mix(col, vec3(0.9), fill(min(sdSeg(m, vec2(0.08, -0.08), vec2(0.32, -0.04)), sdSeg(m, vec2(0.08, -0.1), vec2(0.32, -0.12))) - 0.003, PX));
}
// A record spins under its arm.
vec3 chVinyl(vec2 uv, float t) {
  vec2 p = (uv - 0.5) * ASP;
  vec3 col = vec3(0.35, 0.2, 0.45);
  float r = length(p), a = atan(p.y, p.x) - t * 3.5;
  if (r < 0.42) {
    col = vec3(0.04) + 0.04 * step(0.5, fract(r * 60.0)) + 0.12 * pow(max(0.0, cos(a * 2.0)), 8.0) * step(0.16, r);
    if (r < 0.15) col = mix(vec3(0.95, 0.3, 0.25), vec3(1.0, 0.85, 0.3), step(0.0, sin(a)));
    col = mix(col, vec3(0.1), step(r, 0.012));
  }
  return mix(col, vec3(0.8), fill(sdSeg(p, vec2(0.55, 0.38), vec2(0.18 + 0.02 * sin(t * 0.2), 0.05)) - 0.01, PX));
}
// A metronome ticks once a second.
vec3 chMetro(vec2 uv, float t) {
  vec2 p = (uv - vec2(0.5, 0.12)) * ASP;
  vec3 col = vec3(0.86, 0.8, 0.7);
  col = mix(col, vec3(0.45, 0.25, 0.15), step(abs(p.x), 0.25 - p.y * 0.25) * step(0.0, p.y) * step(p.y, 0.72));
  float ang = 0.45 * sin(t * PI);
  vec2 dir = vec2(sin(ang), cos(ang));
  col = mix(col, vec3(0.9, 0.85, 0.6), fill(sdSeg(p, vec2(0.0, 0.04), dir * 0.62) - 0.008, PX));
  return mix(col, vec3(0.2), fill(sdBox(rot(ang) * (p - dir * 0.42), vec2(0.04, 0.025), 0.005), PX));
}
// Five sine waves weave in rainbow colours.
vec3 chWaves(vec2 uv, float t) {
  vec3 col = vec3(0.03, 0.02, 0.1);
  for (int i = 0; i < 5; i++) {
    float fi = float(i), y = 0.5 + 0.25 * sin(uv.x * (4.0 + fi * 2.0) + t * (1.0 + fi * 0.3) + fi);
    col = mix(col, hue(fi / 5.0 + t * 0.05), smoothstep(0.02, 0.0, abs(uv.y - y) - 0.01));
  }
  return col;
}
// A checkerboard spins and zooms.
vec3 chRoto(vec2 uv, float t) {
  vec2 p = rot(t * 0.4) * ((uv - 0.5) * ASP) * (2.0 + 1.5 * sin(t * 0.5)) * 4.0;
  return mix(vec3(0.95, 0.2, 0.5), vec3(0.1, 0.05, 0.3), mod(floor(p.x) + floor(p.y), 2.0));
}
// A black and white spiral turns inward.
vec3 chHypno(vec2 uv, float t) {
  vec2 p = (uv - 0.5) * ASP;
  return mix(vec3(0.05), vec3(0.95), step(0.5, fract(length(p) * 8.0 - atan(p.y, p.x) / (2.0 * PI) - t * 0.6)));
}
// The sun climbs over two mountain ranges.
vec3 chSunrise(vec2 uv, float t) {
  float ph = fract(t * 0.04), sy = -0.1 + ph * 0.9;
  vec3 col = mix(vec3(1.0, 0.55, 0.3), vec3(0.3, 0.5, 0.9), smoothstep(0.2, 1.0, uv.y + ph * 0.3));
  col = mix(col, vec3(1.0, 0.9, 0.5), step(length((uv - vec2(0.5, sy)) * ASP), 0.12));
  col = mix(col, vec3(0.35, 0.2, 0.45), step(uv.y, 0.35 + 0.12 * abs(fract(uv.x * 2.0) - 0.5) * 2.0 - 0.08 * sin(uv.x * 9.0)));
  return mix(col, vec3(0.15, 0.1, 0.25), step(uv.y, 0.22 + 0.08 * sin(uv.x * 6.0 + 1.0)));
}
// Bubbles rise and wobble.
vec3 chBubbles(vec2 uv, float t) {
  vec3 col = mix(vec3(0.0, 0.25, 0.4), vec3(0.0, 0.08, 0.2), uv.y);
  vec2 p = uv * ASP;
  for (int i = 0; i < 10; i++) {
    float fi = float(i), y = fract(h21(vec2(fi, 2.0)) + t * (0.08 + 0.1 * h21(vec2(fi, 1.0)))) * 1.2 - 0.1;
    vec2 c = vec2(h21(vec2(fi, 3.0)) * 1.33 + 0.03 * sin(t * 2.0 + fi), y);
    float r = 0.02 + 0.04 * h21(vec2(fi, 4.0));
    col = mix(col, vec3(0.7, 0.9, 1.0), smoothstep(0.006, 0.0, abs(length(p - c) - r)));
    col = mix(col, vec3(1.0), step(length(p - c - vec2(-0.35, 0.35) * r), r * 0.22));
  }
  return col;
}
// A wire globe turns.
vec3 chGlobe(vec2 uv, float t) {
  vec2 p = (uv - 0.5) * ASP;
  vec3 col = vec3(0.02, 0.03, 0.08);
  float R = 0.38, r = length(p);
  if (r < R) {
    vec3 n = vec3(p / R, sqrt(1.0 - r * r / (R * R)));
    float lon = atan(n.x, n.z) + t * 0.4, lat = asin(clamp(n.y, -1.0, 1.0));
    float gl = min(abs(fract(lon * 4.0 / PI + 0.5) - 0.5), abs(fract(lat * 6.0 / PI + 0.5) - 0.5));
    col = mix(vec3(0.05, 0.15, 0.3) * n.z, vec3(0.3, 1.0, 0.8), smoothstep(0.06, 0.02, gl) * n.z);
  }
  return mix(col, vec3(0.3, 1.0, 0.8), smoothstep(0.01, 0.0, abs(r - R)));
}
// A traffic light cycles.
vec3 chTraffic(vec2 uv, float t) {
  vec2 p = (uv - 0.5) * ASP;
  vec3 col = vec3(0.12, 0.14, 0.2);
  col = mix(col, vec3(0.08), step(abs(p.x), 0.025) * step(p.y, -0.2));
  col = mix(col, vec3(0.15, 0.15, 0.12), fill(sdBox(p, vec2(0.12, 0.34), 0.05), PX));
  float ph = mod(t, 8.0);
  for (int i = 0; i < 3; i++) {
    vec3 lc = i == 0 ? vec3(1.0, 0.15, 0.1) : i == 1 ? vec3(1.0, 0.7, 0.1) : vec3(0.2, 1.0, 0.4);
    float on = (i == 2 && ph < 3.5) || (i == 1 && ph >= 3.5 && ph < 4.5) || (i == 0 && ph >= 4.5) ? 1.0 : 0.15;
    col = mix(col, lc * on, fill(length(p - vec2(0.0, 0.22 - float(i) * 0.22)) - 0.08, PX));
  }
  return col;
}
// A heart monitor sweeps its trace.
vec3 chEcg(vec2 uv, float t) {
  vec2 g = abs(fract(uv * vec2(16.0, 12.0)) - 0.5);
  vec3 col = vec3(0.0, 0.05, 0.03) + vec3(0.0, 0.1, 0.05) * smoothstep(0.45, 0.5, max(g.x, g.y));
  float b = fract(uv.x * 1.5);
  float y = 0.45 + 0.35 * exp(-pow((b - 0.5) * 40.0, 2.0)) - 0.12 * exp(-pow((b - 0.53) * 40.0, 2.0)) + 0.05 * exp(-pow((b - 0.75) * 15.0, 2.0)) + 0.03 * exp(-pow((b - 0.3) * 20.0, 2.0));
  col += vec3(0.3, 1.0, 0.5) * smoothstep(0.015, 0.0, abs(uv.y - y)) * (1.0 - fract(fract(t * 0.35) - uv.x));
  return mix(col, vec3(0.3, 1.0, 0.5), seg7((uv * ASP - vec2(1.12, 0.8)) / 0.05, int(mod(floor(t * 0.7) * 7.0, 10.0))));
}
// A newsreader talks over a scrolling ticker.
vec3 chNews(vec2 uv, float t) {
  vec2 p = uv * ASP;
  vec3 col = mix(vec3(0.1, 0.2, 0.5), vec3(0.05, 0.1, 0.3), uv.y) + vec3(0.06, 0.1, 0.2) * step(0.5, fract(uv.x * 6.0 + uv.y * 2.0));
  float mouth = step(0.5, sin(t * 14.0)) * step(0.0, sin(t * 2.3));
  col = mix(col, vec3(0.08, 0.06, 0.1), fill(min(length((p - vec2(0.67, 0.2)) / vec2(1.0, 0.7)) - 0.25, length(p - vec2(0.67, 0.56)) - 0.11), PX));
  col = mix(col, vec3(0.9, 0.3, 0.3), fill(sdBox(p - vec2(0.67, 0.51), vec2(0.03, 0.004 + 0.012 * mouth), 0.003), PX));
  if (uv.y < 0.14) {
    float x = uv.x + t * 0.15;
    col = mix(vec3(0.85, 0.12, 0.15), vec3(1.0), step(0.25, h21(vec2(floor(x * 6.0), 2.0))) * step(0.3, fract(x * 30.0)) * step(abs(uv.y - 0.07), 0.025) * step(0.35, h21(vec2(floor(x * 30.0), 0.0))));
  }
  return col;
}
// Lottery balls tumble in a drum.
vec3 chLotto(vec2 uv, float t) {
  vec2 p = (uv - 0.5) * ASP;
  vec3 col = mix(vec3(0.3, 0.05, 0.4), vec3(0.2, 0.24, 0.32), step(length(p), 0.4));
  for (int i = 0; i < 9; i++) {
    float fi = float(i);
    vec2 c = vec2(sin(t * (2.0 + fi * 0.37) + fi * 2.1), cos(t * (1.7 + fi * 0.29) + fi)) * 0.28;
    col = mix(col, hue(fi / 9.0), fill(length(p - c) - 0.06, PX));
    col = mix(col, vec3(1.0), fill(length(p - c) - 0.025, PX));
  }
  return mix(col, vec3(0.9), smoothstep(0.01, 0.0, abs(length(p) - 0.4)));
}
// A volcano spits sparks under its smoke.
vec3 chVolcano(vec2 uv, float t) {
  vec3 col = mix(vec3(0.3, 0.08, 0.05), vec3(0.08, 0.02, 0.06), uv.y);
  float px = uv.x - 0.5;
  col = mix(col, vec3(0.12, 0.08, 0.08), step(uv.y, 0.55 - abs(px) * 1.1) * step(uv.y, 0.5));
  float lava = smoothstep(0.02, 0.0, abs(px + 0.03 * sin(uv.y * 20.0)) - (0.5 - uv.y) * 0.08) * step(uv.y, 0.5);
  col = mix(col, vec3(1.0, 0.4, 0.05), lava * step(fract(uv.y * 3.0 + t), 0.8));
  for (int i = 0; i < 12; i++) {
    float fi = float(i), f = fract(t * 0.6 + fi / 12.0);
    vec2 c = vec2(0.5 + (h21(vec2(fi, floor(t * 0.6 + fi / 12.0))) - 0.5) * f * 0.8, 0.5 + f * 0.6 - f * f * 0.7);
    col = mix(col, vec3(1.0, 0.6 - f * 0.4, 0.1), step(length((uv - c) * ASP), 0.015 * (1.0 - f) + 0.004));
  }
  return mix(col, vec3(0.2), smoothstep(0.55, 0.75, fbm(vec2(uv.x * 4.0, uv.y * 3.0 - t * 0.4))) * step(0.5, uv.y) * 0.6);
}
// A butterfly flaps across a meadow sky.
vec3 chFly(vec2 uv, float t) {
  vec3 col = mix(vec3(0.5, 0.8, 0.5), vec3(0.6, 0.85, 1.0), uv.y);
  vec2 p = (uv - vec2(0.5 + 0.15 * sin(t * 0.5), 0.5 + 0.08 * sin(t * 1.3))) * ASP;
  float flap = 0.35 + 0.65 * abs(sin(t * 6.0));
  vec2 q = vec2(abs(p.x) / flap, p.y);
  float w = min(length((q - vec2(0.14, 0.08)) / vec2(1.0, 0.85)) - 0.13, length((q - vec2(0.1, -0.08)) / vec2(1.0, 0.8)) - 0.08);
  col = mix(col, vec3(0.95, 0.5, 0.1), fill(w, PX));
  col = mix(col, vec3(0.1), fill(abs(w + 0.02) - 0.008, PX) * step(w, 0.0));
  col = mix(col, vec3(1.0), fill(length(q - vec2(0.16, 0.12)) - 0.03, PX));
  return mix(col, vec3(0.1), fill(sdSeg(p, vec2(0.0, -0.1), vec2(0.0, 0.12)) - 0.012, PX));
}
// A saucer hovers and beams up a little crate.
vec3 chUfo(vec2 uv, float t) {
  vec3 col = mix(vec3(0.02, 0.05, 0.12), vec3(0.1, 0.05, 0.2), uv.y) + stars2(uv, 0.993) * 0.6;
  col = mix(col, vec3(0.08, 0.15, 0.08), step(uv.y, 0.18 + 0.02 * sin(uv.x * 9.0)));
  vec2 c = vec2(0.5 + 0.2 * sin(t * 0.4), 0.72 + 0.02 * sin(t * 2.0)), p = (uv - c) * ASP;
  float beam = step(abs(p.x), 0.06 - p.y * 0.25) * step(p.y, 0.0) * step(0.18, uv.y) * (0.5 + 0.5 * step(0.5, fract(p.y * 20.0 + t * 3.0)));
  col = mix(col, vec3(0.6, 1.0, 0.6), beam * 0.35);
  float lift = fract(t * 0.15);
  vec2 bq = (uv - vec2(c.x, 0.2 + lift * (c.y - 0.25))) * ASP;
  col = mix(col, vec3(0.9, 0.85, 0.75), fill(sdBox(bq, vec2(0.03, 0.02), 0.005), PX) * step(lift, 0.9));
  col = mix(col, vec3(0.6, 0.9, 1.0), fill(length(p - vec2(0.0, 0.04)) - 0.07, PX) * step(0.03, p.y));
  col = mix(col, vec3(0.6, 0.6, 0.7), fill(length(p / vec2(1.0, 0.28)) - 0.17, PX));
  for (int i = 0; i < 5; i++) {
    float fi = float(i) - 2.0;
    col = mix(col, hue(fract(fi * 0.2 + t)), fill(length(p - vec2(fi * 0.06, -0.01)) - 0.012, PX));
  }
  return col;
}
// Night-vision footage: tracers climb and flak bursts over a burning city.
vec3 chRaid(vec2 uv, float t) {
  vec3 col = mix(vec3(0.02, 0.08, 0.03), vec3(0.05, 0.16, 0.06), uv.y);
  for (int i = 0; i < 6; i++) {
    float fi = float(i), T = t * 0.6 + fi * 0.37, k = floor(T), f = fract(T);
    float x0 = 0.1 + 0.8 * h21(vec2(k, fi)), dir = (h21(vec2(k, fi + 3.0)) - 0.5) * 0.6;
    for (int j = 0; j < 8; j++) {
      float u = f - float(j) * 0.035;
      if (u < 0.0) continue;
      vec2 q = vec2(x0 + dir * u, 0.15 + u * 0.9 - u * u * 0.3);
      col += vec3(0.6, 1.0, 0.5) * smoothstep(0.012, 0.0, length((uv - q) * ASP)) * (1.0 - float(j) / 8.0);
    }
  }
  for (int i = 0; i < 4; i++) {
    float fi = float(i), T = t * 0.8 + fi * 0.25, k = floor(T), f = fract(T);
    vec2 c = vec2(0.15 + 0.7 * h21(vec2(k, fi + 7.0)), 0.5 + 0.4 * h21(vec2(k, fi + 9.0)));
    col += vec3(0.8, 1.0, 0.7) * smoothstep(0.06 * f + 0.01, 0.0, length((uv - c) * ASP)) * (1.0 - f) * 1.4;
  }
  col += vec3(0.4, 0.9, 0.3) * 0.25 * smoothstep(0.25, 0.0, abs(uv.x - 0.35 - 0.1 * sin(t * 0.1))) * smoothstep(0.35, 0.1, uv.y);
  col = mix(col, vec3(0.01, 0.04, 0.02), step(uv.y, 0.12 + 0.14 * h21(vec2(floor(uv.x * 14.0), 3.0))));
  return col * (0.85 + 0.3 * h21(floor(uv * vec2(160.0, 120.0)) + floor(t * 24.0)));
}
// Bombers cross in formation; the horizon answers with fire.
vec3 chBombers(vec2 uv, float t) {
  vec3 col = mix(vec3(0.75, 0.45, 0.3), vec3(0.25, 0.22, 0.3), uv.y);
  col = mix(col, vec3(0.35, 0.3, 0.3), smoothstep(0.5, 0.75, fbm(vec2(uv.x * 3.0 - t * 0.05, uv.y * 4.0))) * 0.6);
  float gy = 0.18;
  for (int i = 0; i < 5; i++) {
    float fi = float(i), T = t * 0.7 + fi * 0.2, k = floor(T), f = fract(T);
    vec2 q = (uv - vec2(0.1 + 0.8 * h21(vec2(k, fi)), gy)) * ASP;
    col = mix(col, mix(vec3(1.0, 0.9, 0.5), vec3(0.9, 0.3, 0.05), f), smoothstep(0.08 * sqrt(f) + 0.01, 0.0, length(q * vec2(1.0, 0.8))) * step(0.0, q.y) * (1.0 - f));
    col = mix(col, vec3(0.15, 0.12, 0.12), smoothstep(0.1 * f + 0.02, 0.0, length(q - vec2(0.0, f * 0.25))) * f * 0.8);
  }
  col = mix(col, vec3(0.12, 0.1, 0.1), step(uv.y, gy));
  for (int i = 0; i < 5; i++) {
    float fi = float(i) - 2.0;
    vec2 c = vec2(fract(t * 0.05) * 1.6 - 0.3 - abs(fi) * 0.06, 0.72 + fi * 0.045), q = (uv - c) * ASP;
    float plane = min(sdBox(q, vec2(0.055, 0.008), 0.006), min(sdBox(q - vec2(-0.05, 0.012), vec2(0.006, 0.014), 0.002), sdBox(q - vec2(0.005, -0.004), vec2(0.02, 0.004), 0.002)));
    col = mix(col, vec3(0.08, 0.07, 0.08), fill(plane, PX * 0.5));
    for (int j = 0; j < 3; j++) {
      float d = fract(t * 0.5 + fi * 0.3 + float(j) * 0.33);
      vec2 b = c + vec2(-d * 0.08, -d * 0.5);
      col = mix(col, vec3(0.08), step(length((uv - b) * ASP * vec2(1.0, 0.6)), 0.006) * step(gy, b.y));
    }
  }
  return col;
}
// A barrage walks across mud and wire under a grey sky; film grain.
vec3 chBarrage(vec2 uv, float t) {
  vec3 col = mix(vec3(0.5, 0.48, 0.42), vec3(0.62, 0.62, 0.6), uv.y);
  float gy = 0.4 + 0.03 * sin(uv.x * 7.0);
  col = mix(col, mix(vec3(0.25, 0.2, 0.14), vec3(0.35, 0.28, 0.2), fbm(uv * vec2(20.0, 10.0))), step(uv.y, gy));
  col = mix(col, vec3(0.15), step(abs(fract(uv.x * 9.0) - 0.5), 0.03) * step(uv.y, gy + 0.05) * step(gy - 0.02, uv.y));
  col = mix(col, vec3(0.2), smoothstep(0.004, 0.0, abs(uv.y - gy - 0.04 - 0.008 * sin(uv.x * 80.0))));
  for (int i = 0; i < 5; i++) {
    float fi = float(i), T = t * 0.9 + fi * 0.2, k = floor(T), f = fract(T);
    vec2 q = (uv - vec2(fract(0.15 * k + h21(vec2(k, fi)) * 0.3 + fi * 0.2), gy - 0.05 * h21(vec2(k, fi + 2.0)))) * ASP;
    col = mix(col, vec3(0.2, 0.17, 0.13), fill(sdBox(q - vec2(0.0, 0.12 * sqrt(f)), vec2(0.03 + 0.05 * f, 0.12 * sqrt(f)), 0.03), 0.02) * (1.0 - f * 0.7));
    col = mix(col, vec3(1.0, 0.85, 0.5), smoothstep(0.05, 0.0, length(q)) * smoothstep(0.15, 0.0, f));
  }
  col = mix(col, vec3(0.55, 0.53, 0.5), smoothstep(0.55, 0.8, fbm(vec2(uv.x * 3.0 - t * 0.1, uv.y * 4.0))) * 0.5);
  return col * (0.9 + 0.1 * h21(floor(uv * vec2(160.0, 120.0)) + floor(t * 18.0)));
}
// Searchlights sweep the night; flak blooms among the beams.
vec3 chSearch(vec2 uv, float t) {
  vec3 col = mix(vec3(0.02, 0.02, 0.06), vec3(0.08, 0.07, 0.14), uv.y) + stars2(uv, 0.995) * 0.4;
  for (int i = 0; i < 3; i++) {
    float fi = float(i), a = 1.57 + 0.6 * sin(t * (0.3 + fi * 0.13) + fi * 2.0);
    vec2 d = vec2(cos(a), sin(a)), q = (uv - vec2(0.2 + fi * 0.3, 0.05)) * ASP;
    float along = dot(q, d), across = abs(q.x * d.y - q.y * d.x);
    col += vec3(0.75, 0.8, 0.9) * 0.35 * smoothstep(0.02 + along * 0.06, 0.0, across) * step(0.0, along) * exp(-along * 1.2);
  }
  for (int i = 0; i < 6; i++) {
    float fi = float(i), T = t * 0.7 + fi * 0.17, k = floor(T), f = fract(T);
    float r = length((uv - vec2(0.1 + 0.8 * h21(vec2(k, fi)), 0.45 + 0.45 * h21(vec2(k, fi + 4.0)))) * ASP);
    col = mix(col, vec3(1.0, 0.85, 0.5), smoothstep(0.02, 0.0, r) * smoothstep(0.2, 0.0, f));
    col = mix(col, vec3(0.25, 0.24, 0.26), smoothstep(0.035 * sqrt(f) + 0.005, 0.0, r) * step(0.15, f) * (1.0 - f));
  }
  return mix(col, vec3(0.01), step(uv.y, 0.06 + 0.07 * h21(vec2(floor(uv.x * 18.0), 1.0))));
}
// A battleship fires a broadside; spray columns rise far off.
vec3 chFleet(vec2 uv, float t) {
  float sea = 0.38;
  vec3 col = mix(vec3(0.55, 0.6, 0.65), vec3(0.35, 0.4, 0.5), uv.y);
  col = mix(col, mix(vec3(0.12, 0.2, 0.28), vec3(0.2, 0.3, 0.38), uv.y / sea), step(uv.y, sea));
  vec2 q = (uv - vec2(0.35, sea)) * ASP;
  float hull = sdBox(q - vec2(0.0, 0.025), vec2(0.28 - max(0.0, -q.y) * 0.5, 0.03), 0.01);
  float deck = min(sdBox(q - vec2(0.0, 0.075), vec2(0.07, 0.03), 0.005), sdBox(q - vec2(0.02, 0.12), vec2(0.02, 0.03), 0.003));
  float guns = min(sdBox(rot(-0.25) * (q - vec2(0.15, 0.07)), vec2(0.06, 0.006), 0.002), sdBox(rot(-0.25) * (q - vec2(-0.12, 0.07)), vec2(0.06, 0.006), 0.002));
  col = mix(col, vec3(0.22, 0.24, 0.27), fill(min(hull, min(deck, guns)), PX));
  float salvo = fract(t * 0.25);
  col = mix(col, vec3(1.0, 0.8, 0.4), smoothstep(0.05, 0.0, length(q - vec2(0.22, 0.09))) * smoothstep(0.08, 0.0, salvo));
  col = mix(col, vec3(0.5), smoothstep(0.04 + salvo * 0.15, 0.0, length(q - vec2(0.24 + salvo * 0.2, 0.1 + salvo * 0.05))) * (1.0 - salvo) * 0.8);
  for (int i = 0; i < 3; i++) {
    float fi = float(i), f = fract(t * 0.25 - 0.3 - fi * 0.04), h = 0.25 * sin(clamp(f * 2.0, 0.0, 1.0) * PI);
    vec2 s = (uv - vec2(0.82 + fi * 0.05, sea)) * ASP;
    col = mix(col, vec3(0.92), fill(sdBox(s - vec2(0.0, h * 0.5), vec2(0.015 + f * 0.02, h * 0.5), 0.01), PX) * step(f, 0.5));
  }
  return col;
}
// Film grain for the old-footage channels.
float grain(vec2 uv, float t, float k) { return 1.0 - k + 2.0 * k * h21(floor(uv * vec2(160.0, 120.0)) + floor(t * 20.0)); }
// Late film: a train runs into a tunnel, then the censor cuts to fireworks.
vec3 chLate(vec2 uv, float t) {
  float ph = mod(t, 10.0);
  vec2 p = uv * ASP;
  vec3 col;
  if (ph < 6.0) {
    col = mix(vec3(0.75, 0.65, 0.5), vec3(0.9, 0.82, 0.66), uv.y);
    col = mix(col, vec3(0.45, 0.38, 0.28), step(uv.y, 0.25 + 0.32 * exp(-pow((uv.x - 0.8) * 3.0, 2.0))));
    col = mix(col, vec3(0.3, 0.25, 0.2), step(abs(uv.y - 0.19), 0.006));
    vec2 m = (uv - vec2(0.72, 0.2)) * ASP;
    float arch = max(step(length(m), 0.1) * step(0.0, m.y), step(abs(m.x), 0.1) * step(-0.02, m.y) * step(m.y, 0.0));
    col = mix(col, vec3(0.08, 0.06, 0.05), arch);
    float x = -0.35 + ph * 0.2;
    for (int i = 0; i < 3; i++) {
      float fi = float(i), cx = x - fi * 0.17;
      vec2 q = (uv - vec2(cx, 0.24)) * ASP;
      float car = sdBox(q, vec2(0.1, 0.045), 0.01);
      if (i == 0) car = min(car, sdBox(q - vec2(0.06, 0.07), vec2(0.015, 0.03), 0.003));
      float wheels = min(length(q - vec2(-0.05, -0.05)) - 0.025, length(q - vec2(0.05, -0.05)) - 0.025);
      col = mix(col, vec3(0.18, 0.14, 0.12), fill(min(car, wheels), PX) * step(uv.x, 0.66));
    }
    for (int j = 0; j < 5; j++) {
      float f = fract(t * 0.8 + float(j) * 0.2);
      vec2 c = vec2(x + 0.05 - f * 0.25, 0.34 + f * 0.3);
      col = mix(col, vec3(0.92, 0.9, 0.85), smoothstep(0.05 * f + 0.02, 0.0, length((uv - c) * ASP)) * (1.0 - f) * step(c.x, 0.7));
    }
  } else {
    col = vec3(0.04, 0.03, 0.08);
    col = mix(col, vec3(0.1, 0.08, 0.07), step(uv.y, 0.25 + 0.32 * exp(-pow((uv.x - 0.8) * 3.0, 2.0))));
    for (int i = 0; i < 2; i++) {
      float fi = float(i), f = fract((ph - 6.0) / 2.0 + fi * 0.5);
      vec2 c = vec2(0.35 + fi * 0.4, 0.68);
      for (int j = 0; j < 14; j++) {
        float a = float(j) / 14.0 * 2.0 * PI;
        col += mix(vec3(1.0, 0.4, 0.6), vec3(1.0, 0.85, 0.4), fi) * smoothstep(0.014, 0.0, length(p - c * ASP - vec2(cos(a), sin(a)) * f * 0.3)) * (1.0 - f) * 1.4;
      }
    }
    col = mix(col, vec3(1.0, 0.3, 0.45), step(sdHeart((p - vec2(0.67, 0.38)) / 0.1 + vec2(0.0, 0.5)), 0.0) * step(8.0, ph));
  }
  // The rating badge sits in the corner throughout.
  vec2 b = p - vec2(1.18, 0.86);
  col = mix(col, vec3(0.85, 0.1, 0.12), fill(length(b) - 0.09, PX));
  col = mix(col, vec3(1.0), max(seg7((b - vec2(-0.075, -0.05)) / 0.05, 1), seg7((b - vec2(0.0, -0.05)) / 0.05, 8)));
  return col * grain(uv, t, 0.08);
}
// A steamed-up window: a heart traced in the fog, two shadows behind the blind.
vec3 chSteam(vec2 uv, float t) {
  vec2 p = uv * ASP;
  vec3 room = mix(vec3(0.55, 0.22, 0.15), vec3(0.95, 0.55, 0.3), smoothstep(0.7, 0.2, length((uv - vec2(0.5, 0.45)) * ASP)));
  float lean = 0.02 * sin(t * 0.5);
  float s1 = min(length((p - vec2(0.56 + lean, 0.62)) / vec2(1.0, 1.15)) - 0.09, sdBox(p - vec2(0.56 + lean, 0.3), vec2(0.1, 0.22), 0.08));
  float s2 = min(length((p - vec2(0.78 - lean, 0.6)) / vec2(1.0, 1.15)) - 0.085, sdBox(p - vec2(0.78 - lean, 0.28), vec2(0.1, 0.22), 0.08));
  room = mix(room, vec3(0.2, 0.06, 0.06), smoothstep(0.03, -0.03, min(s1, s2)));
  room = mix(room, vec3(0.3, 0.1, 0.12), step(0.5, fract(uv.y * 14.0)) * step(0.72, uv.y) * 0.5);
  float fog = 0.75 + 0.25 * fbm(uv * vec2(9.0, 7.0));
  float heart = sdHeart((p - vec2(0.36, 0.5)) / 0.2 + vec2(0.0, 0.5));
  float clear = smoothstep(0.11, 0.05, abs(heart));
  float drips = 0.0;
  for (int i = 0; i < 6; i++) {
    float fi = float(i), x = 0.12 + fi * 0.2 + 0.03 * sin(fi * 7.0), len = fract(t * 0.05 + fi * 0.37);
    drips = max(drips, smoothstep(0.006, 0.0, abs(uv.x - x)) * step(1.0 - len, uv.y));
  }
  vec3 glass = mix(vec3(0.82, 0.78, 0.76), room * 0.8 + 0.15, 0.5);
  return mix(glass * fog, room, max(clear, drips * 0.8));
}
// Smooth jazz: a saxophone sways in a violet spotlight; notes drift up.
vec3 chSax(vec2 uv, float t) {
  vec2 p = (uv - vec2(0.5, 0.42)) * ASP;
  vec3 col = mix(vec3(0.06, 0.02, 0.1), vec3(0.4, 0.15, 0.45), smoothstep(0.55, 0.0, length(p * vec2(1.4, 1.0))));
  p = rot(0.12 * sin(t * 1.3)) * p;
  float body = sdSeg(p, vec2(0.02, 0.36), vec2(0.04, -0.12)) - 0.025 - 0.02 * smoothstep(0.3, -0.1, p.y);
  body = min(body, length(p - vec2(0.1, -0.16)) - 0.075);
  body = min(body, sdSeg(p, vec2(0.04, -0.12), vec2(0.12, -0.2)) - 0.06);
  body = min(body, length(p - vec2(0.16, -0.02)) - 0.065);
  body = min(body, sdSeg(p, vec2(0.02, 0.36), vec2(-0.08, 0.44)) - 0.012);
  vec3 brass = mix(vec3(0.75, 0.5, 0.12), vec3(1.0, 0.85, 0.4), smoothstep(-0.1, 0.1, p.x - p.y * 0.3));
  col = mix(col, brass, fill(body, PX));
  col = mix(col, vec3(0.1, 0.06, 0.04), fill(length(p - vec2(0.16, -0.02)) - 0.045, PX));
  for (int i = 0; i < 5; i++) col = mix(col, vec3(0.95, 0.9, 0.7), fill(length(p - vec2(-0.005, 0.25 - float(i) * 0.075)) - 0.013, PX));
  for (int i = 0; i < 4; i++) {
    float fi = float(i), f = fract(t * 0.25 + fi * 0.25);
    vec2 n = (uv - vec2(0.68 + 0.1 * sin(f * 6.0 + fi), 0.4 + f * 0.6)) * ASP;
    float note = min(length(n / vec2(1.3, 1.0)) - 0.022, sdBox(n - vec2(0.022, 0.05), vec2(0.004, 0.05), 0.0));
    col = mix(col, vec3(1.0, 0.8, 0.9), fill(note, PX) * (1.0 - f));
  }
  return col;
}
// Home shopping: a red stiletto turns on its pedestal; the price blinks.
vec3 chHeels(vec2 uv, float t) {
  vec3 col = mix(vec3(0.95, 0.85, 0.9), vec3(0.75, 0.6, 0.8), uv.y);
  vec2 p = (uv - vec2(0.42, 0.3)) * ASP;
  col = mix(col, vec3(0.55, 0.45, 0.6), fill(sdBox(p - vec2(0.0, -0.08), vec2(0.22, 0.04), 0.01), PX));
  float sc = cos(t * 1.2);
  vec2 q = vec2(p.x / max(abs(sc), 0.12), p.y) * vec2(sign(sc), 1.0);
  float sole = sdSeg(q, vec2(-0.2, 0.12), vec2(0.05, -0.02)) - 0.012;
  sole = min(sole, sdSeg(q, vec2(0.05, -0.02), vec2(0.2, -0.03)) - 0.012);
  float heel = sdSeg(q, vec2(-0.18, 0.11), vec2(-0.17, -0.03)) - 0.008;
  float upper = max(length((q - vec2(0.12, 0.02)) / vec2(1.6, 1.0)) - 0.07, -q.y + 0.0);
  upper = min(upper, max(sdSeg(q, vec2(-0.2, 0.13), vec2(0.06, 0.03)) - 0.03, q.y - 0.12));
  col = mix(col, vec3(0.85, 0.05, 0.12), fill(min(min(sole, heel), upper), PX));
  col = mix(col, vec3(1.0, 0.9, 0.2), fill(sdBox(uv * ASP - vec2(1.05, 0.72), vec2(0.18, 0.09), 0.02), PX));
  float blink = step(0.5, fract(t * 1.2));
  col = mix(col, vec3(0.8, 0.0, 0.1) * blink + vec3(0.2) * (1.0 - blink), max(seg7((uv * ASP - vec2(0.95, 0.66)) / 0.06, 9), seg7((uv * ASP - vec2(1.04, 0.66)) / 0.06, 9)));
  col = mix(col, vec3(0.85, 0.1, 0.4), step(uv.y, 0.1));
  return mix(col, vec3(1.0), step(uv.y, 0.1) * step(0.4, fract(uv.x * 22.0 - t * 2.0)) * step(abs(uv.y - 0.05), 0.02) * 0.8);
}
// A hallway light flickers; each time it returns, the figure is closer.
vec3 chHall(vec2 uv, float t) {
  vec2 p = (uv - vec2(0.5, 0.45)) * ASP;
  float cyc = mod(t, 9.0), step3 = floor(cyc / 1.8);
  float on = step(0.25, fract(cyc / 1.8)) * (0.85 + 0.15 * h21(vec2(floor(t * 14.0), 2.0)));
  float m = max(abs(p.x) / 0.62, abs(p.y) / 0.45);
  float depth = 0.12 / max(m, 0.12);
  vec3 col = vec3(0.32, 0.3, 0.26) * (0.25 + 0.75 * m);
  col *= 0.6 + 0.4 * step(0.5, fract(depth * 3.0));
  col = mix(col, vec3(0.02), step(m, 0.13));
  float sz = 0.05 + step3 * 0.05;
  vec2 f = p / sz;
  float fig = min(length(f - vec2(0.0, 0.75)) - 0.35, sdBox(f - vec2(0.0, -0.4), vec2(0.38, 0.9), 0.25));
  col = mix(col, vec3(0.86, 0.85, 0.8), fill(fig, 0.06));
  col = mix(col, vec3(0.02), fill(min(length(f - vec2(-0.13, 0.8)) - 0.07, length(f - vec2(0.13, 0.8)) - 0.07), 0.06));
  col *= on;
  return mix(col, vec3(0.5, 0.0, 0.0), step(8.6, cyc) * 0.8) * grain(uv, t, 0.1);
}
// Dark woods; eyes open, blink and close again.
vec3 chWoods(vec2 uv, float t) {
  vec3 col = mix(vec3(0.02, 0.03, 0.04), vec3(0.06, 0.08, 0.1), uv.y);
  col = mix(col, vec3(0.75, 0.75, 0.7), fill(length((uv - vec2(0.75, 0.8)) * ASP) - 0.07, PX) * smoothstep(0.4, 0.6, uv.x));
  for (int i = 0; i < 9; i++) {
    float fi = float(i), x = fi / 8.0 + 0.04 * sin(fi * 3.0);
    col = mix(col, vec3(0.01), step(abs(uv.x - x), 0.02 + 0.015 * h21(vec2(fi, 1.0))));
  }
  for (int i = 0; i < 7; i++) {
    float fi = float(i), ph = fract(t * 0.13 + fi * 0.37);
    vec2 c = vec2(0.1 + 0.8 * h21(vec2(fi, floor(t * 0.13 + fi * 0.37))), 0.15 + 0.5 * h21(vec2(fi + 4.0, floor(t * 0.13 + fi * 0.37))));
    float open = smoothstep(0.0, 0.15, ph) * smoothstep(0.6, 0.45, ph) * step(0.03, abs(fract(t * 0.7 + fi) - 0.5));
    vec2 q = (uv - c) * ASP;
    float e = min(length((q - vec2(-0.025, 0.0)) / vec2(1.0, max(open, 0.01))) - 0.012, length((q - vec2(0.025, 0.0)) / vec2(1.0, max(open, 0.01))) - 0.012);
    col = mix(col, mix(vec3(1.0, 0.85, 0.2), vec3(0.9, 0.1, 0.05), step(0.5, h21(vec2(fi, 9.0)))), fill(e, PX * 0.5) * step(0.05, open));
  }
  return col;
}
// A tornado walks the plains under a green sky; the warning bar flashes.
vec3 chTornado(vec2 uv, float t) {
  vec3 col = mix(vec3(0.35, 0.45, 0.3), vec3(0.15, 0.2, 0.18), uv.y);
  col = mix(col, vec3(0.08, 0.1, 0.09), smoothstep(0.45, 0.7, fbm(vec2(uv.x * 3.0 + t * 0.1, uv.y * 3.0))) * step(0.6, uv.y));
  col += vec3(0.8, 0.85, 1.0) * step(0.97, h21(vec2(floor(t * 3.0), 1.0))) * 0.5;
  col = mix(col, vec3(0.3, 0.32, 0.18), step(uv.y, 0.22));
  float cx = 0.5 + 0.15 * sin(t * 0.3);
  float y = (uv.y - 0.22) / 0.6, xc = cx + 0.05 * sin(y * 5.0 + t * 2.0) * y;
  float w = 0.02 + 0.14 * y * y;
  float funnel = step(abs(uv.x - xc), w) * step(0.0, y) * step(y, 1.0);
  col = mix(col, mix(vec3(0.3, 0.3, 0.28), vec3(0.45, 0.45, 0.42), step(0.5, fract(y * 12.0 - t * 3.0 + (uv.x - xc) * 8.0))), funnel);
  for (int i = 0; i < 8; i++) {
    float fi = float(i), a = t * 3.0 + fi * 0.8, h = fract(t * 0.3 + fi * 0.13);
    vec2 d = vec2(xc + cos(a) * (0.05 + h * 0.15), 0.22 + h * 0.5);
    col = mix(col, vec3(0.1), step(max(abs(uv.x - d.x) * 1.33, abs(uv.y - d.y)), 0.008) * step(0.0, sin(a)));
  }
  float bar = step(uv.y, 0.1);
  col = mix(col, mix(vec3(0.8, 0.0, 0.0), vec3(1.0, 0.8, 0.0), step(0.5, fract(t * 1.5))), bar);
  return mix(col, vec3(1.0), bar * step(0.4, fract(uv.x * 22.0 - t * 2.0)) * step(abs(uv.y - 0.05), 0.02));
}
// An earthquake shakes the skyline while the seismograph scratches.
vec3 chQuake(vec2 uv, float t) {
  float amp = pow(0.5 + 0.5 * sin(t * 0.4), 3.0);
  float sh = (vn(vec2(t * 25.0, 1.0)) - 0.5) * 0.04 * amp;
  vec3 col = mix(vec3(0.65, 0.6, 0.55), vec3(0.45, 0.5, 0.6), uv.y);
  for (int i = 0; i < 7; i++) {
    float fi = float(i), x0 = 0.05 + fi * 0.135, h = 0.45 + 0.25 * h21(vec2(fi, 3.0)), tilt = sh * (1.0 + fi * 0.3);
    vec2 q = uv - vec2(x0 + tilt * (uv.y - 0.35) * 4.0, 0.35);
    float b = step(abs(q.x), 0.045) * step(0.0, q.y) * step(q.y, h - 0.35);
    vec3 bc = vec3(0.35, 0.33, 0.35) - 0.05 * fi;
    bc = mix(bc, vec3(0.9, 0.8, 0.5), step(0.5, fract(q.x * 60.0)) * step(0.5, fract(q.y * 40.0)) * 0.4);
    col = mix(col, bc, b);
  }
  col = mix(col, vec3(0.6, 0.55, 0.5), smoothstep(0.5, 0.75, fbm(uv * 6.0 + t)) * amp * step(uv.y, 0.6) * 0.6);
  if (uv.y < 0.3) {
    col = vec3(0.95, 0.93, 0.88);
    col = mix(col, vec3(0.7, 0.75, 0.9), smoothstep(0.01, 0.0, abs(fract(uv.x * 10.0 + t * 0.3) - 0.5) - 0.48));
    float y = 0.15 + (vn(vec2(uv.x * 60.0 + t * 18.0, 2.0)) - 0.5) * 0.25 * pow(0.5 + 0.5 * sin(t * 0.4 - (1.0 - uv.x) * 2.0), 3.0);
    col = mix(col, vec3(0.1), smoothstep(0.012, 0.0, abs(uv.y - y)) * step(uv.x, 0.85));
  }
  return col;
}
// A tsunami rises over a seaside town.
vec3 chWave(vec2 uv, float t) {
  float ph = mod(t, 10.0) / 10.0;
  vec3 col = mix(vec3(0.7, 0.75, 0.8), vec3(0.45, 0.55, 0.7), uv.y);
  for (int i = 0; i < 6; i++) {
    float fi = float(i);
    vec2 q = uv - vec2(0.15 + fi * 0.13, 0.3);
    col = mix(col, vec3(0.85, 0.75, 0.65), step(abs(q.x), 0.04) * step(0.0, q.y) * step(q.y, 0.06));
    col = mix(col, vec3(0.7, 0.25, 0.2), step(q.y, 0.1 - abs(q.x) * 0.9) * step(0.06, q.y));
  }
  col = mix(col, vec3(0.75, 0.68, 0.5), step(uv.y, 0.3));
  float front = 1.3 - ph * 1.5, x = uv.x - front;
  float h = 0.25 + 0.55 * smoothstep(0.0, -0.3, x) * smoothstep(-1.2, -0.3, x) + 0.05 * sin(uv.x * 20.0 - t * 3.0);
  float wave = step(uv.y, h) * step(x, 0.0);
  col = mix(col, mix(vec3(0.05, 0.25, 0.4), vec3(0.2, 0.5, 0.65), uv.y), wave);
  col = mix(col, vec3(0.95), smoothstep(0.03, 0.0, abs(uv.y - h)) * step(x, 0.0) * step(-0.4, x));
  col = mix(col, vec3(0.1, 0.25, 0.4), step(uv.y, 0.2) * step(0.0, x));
  float bar = step(0.88, uv.y);
  col = mix(col, vec3(0.8, 0.05, 0.05), bar);
  return mix(col, vec3(1.0), bar * step(0.35, fract(uv.x * 16.0 + t)) * step(abs(uv.y - 0.94), 0.025));
}
// The market crashes: red candles fall, the arrow dives.
vec3 chCrash(vec2 uv, float t) {
  vec3 col = vec3(0.04, 0.04, 0.06);
  vec2 g = abs(fract(uv * vec2(12.0, 8.0)) - 0.5);
  col += vec3(0.06) * smoothstep(0.46, 0.5, max(g.x, g.y));
  float i = floor(uv.x * 20.0 + t * 2.0), x = fract(uv.x * 20.0 + t * 2.0);
  float lvl = 0.85 - fract((i * 0.6) / 40.0) * 0.9 + 0.08 * (h21(vec2(i, 1.0)) - 0.5);
  float o = lvl + 0.05 * h21(vec2(i, 2.0)), c = lvl - 0.04 - 0.05 * h21(vec2(i, 3.0));
  bool up = h21(vec2(i, 4.0)) > 0.8;
  float top = max(o, c), bot = min(o, c);
  vec3 cc = up ? vec3(0.2, 0.9, 0.4) : vec3(0.95, 0.15, 0.15);
  col = mix(col, cc, step(abs(x - 0.5), 0.3) * step(bot, uv.y) * step(uv.y, top));
  col = mix(col, cc, step(abs(x - 0.5), 0.05) * step(bot - 0.04, uv.y) * step(uv.y, top + 0.04));
  vec2 a = (uv - vec2(0.82, 0.62)) * ASP;
  vec2 ar = rot(0.7) * a;
  float arrow = min(sdBox(ar - vec2(0.0, 0.06), vec2(0.02, 0.1), 0.0), max(abs(ar.x) * 1.2 + ar.y + 0.06, -ar.y - 0.12));
  col = mix(col, vec3(1.0, 0.2, 0.2), fill(arrow, PX) * step(0.4, fract(t * 1.3)));
  return mix(col, vec3(0.95, 0.15, 0.15), max(seg7((uv * ASP - vec2(0.05, 0.82)) / 0.05, int(mod(floor(t * 3.0), 10.0))), seg7((uv * ASP - vec2(0.12, 0.82)) / 0.05, int(mod(floor(t * 7.0), 10.0)))));
}
// Pixel shades drop onto a smiley and stay a moment.
vec3 chShades(vec2 uv, float t) {
  vec3 col = hue(fract(t * 0.05)) * 0.35 + 0.1;
  vec2 p = (uv - vec2(0.5, 0.45)) * ASP;
  col = mix(col, vec3(1.0, 0.85, 0.2), fill(length(p) - 0.32, PX));
  col = mix(col, vec3(0.2, 0.1, 0.05), fill(abs(length(p - vec2(0.0, 0.05)) - 0.2) - 0.02, PX) * step(p.y, -0.02));
  float ph = mod(t, 6.0), y = 0.55 - min(ph / 2.5, 1.0) * 0.48;
  vec2 g = floor((p - vec2(-0.22, y)) / 0.028);
  float lens = step(0.0, g.y) * step(g.y, 2.0) * ((step(0.0, g.x) * step(g.x, 6.0)) + (step(9.0, g.x) * step(g.x, 15.0)));
  lens = max(lens, step(3.0, g.y) * step(g.y, 3.0) * step(0.0, g.x) * step(g.x, 15.0));
  float glint = step(abs(g.y - 2.0), 0.0) * (step(abs(g.x - 1.0), 0.0) + step(abs(g.x - 10.0), 0.0));
  col = mix(col, vec3(0.02), min(lens, 1.0));
  return mix(col, vec3(1.0), glint);
}
// Buffering forever: the bar crawls to ninety-nine and starts again.
vec3 chBuffer(vec2 uv, float t) {
  vec2 p = (uv - vec2(0.5, 0.58)) * ASP;
  vec3 col = vec3(0.07, 0.07, 0.09);
  float a = atan(p.y, p.x), r = length(p);
  for (int i = 0; i < 8; i++) {
    float fi = float(i), aa = -fi / 8.0 * 2.0 * PI + floor(t * 8.0) / 8.0 * 2.0 * PI;
    col = mix(col, vec3(0.9) * (1.0 - fi / 9.0), fill(length(p - 0.13 * vec2(cos(aa), sin(aa))) - 0.025, PX));
  }
  float prog = min(0.99, 1.0 - exp(-mod(t, 14.0) * 0.6));
  vec2 b = uv - vec2(0.2, 0.25);
  col = mix(col, vec3(0.25), step(0.0, b.x) * step(b.x, 0.6) * step(abs(b.y), 0.02));
  col = mix(col, vec3(0.3, 0.6, 1.0), step(0.0, b.x) * step(b.x, 0.6 * prog) * step(abs(b.y), 0.02));
  int pc = int(prog * 100.0);
  return mix(col, vec3(0.9), max(seg7((uv * ASP - vec2(1.12, 0.29)) / 0.04, pc / 10), seg7((uv * ASP - vec2(1.17, 0.29)) / 0.04, pc - (pc / 10) * 10)));
}
// Adverts for the other toys: prism, pop field, galaxy, pin art, magnets.
vec3 chToys(vec2 uv, float t) {
  vec2 p = (uv - 0.5) * ASP;
  int k = int(mod(floor(t / 2.5), 5.0));
  vec3 col = vec3(0.1, 0.09, 0.14);
  if (k == 0) {
    float tri = max(abs(p.x) * 1.73 + p.y - 0.18, -p.y - 0.17);
    col = mix(col, vec3(0.9), smoothstep(0.012, 0.0, abs(tri)));
    float a = atan(p.y + 0.0, p.x - 0.08);
    col = mix(col, hue(clamp((a + 0.4) / 0.8, 0.0, 1.0) * 0.8), step(0.12, p.x) * step(abs(a), 0.4) * step(length(p), 0.62));
    col = mix(col, vec3(1.0), smoothstep(0.01, 0.0, sdSeg(p, vec2(-0.6, 0.05), vec2(-0.08, 0.0))));
  } else if (k == 1) {
    vec2 h = p * 9.0;
    vec2 r = vec2(1.0, 1.732), hh = r * 0.5;
    vec2 a = mod(h, r) - hh, b = mod(h - hh, r) - hh, gv = dot(a, a) < dot(b, b) ? a : b, id = h - gv;
    float popped = step(0.6, h21(floor(id * 2.0) + floor(t * 2.0)));
    col = mix(col, mix(vec3(0.2, 0.7, 0.6), vec3(0.08, 0.2, 0.2), popped), step(length(gv), 0.4));
  } else if (k == 2) {
    float r = length(p), a = atan(p.y, p.x);
    col += vec3(1.0, 0.85, 0.6) * smoothstep(0.25, 0.0, abs(fract((a / (2.0 * PI)) * 2.0 - log(r + 0.02) * 1.2 + t * 0.1) - 0.5)) * smoothstep(0.5, 0.05, r) * step(0.7, h21(floor(uv * vec2(160.0, 120.0))));
    col += vec3(1.0, 0.9, 0.7) * exp(-r * 18.0);
  } else if (k == 3) {
    vec2 g = fract(p * 14.0) - 0.5, id = floor(p * 14.0);
    float lift = smoothstep(0.25, 0.1, length(id / 14.0 - vec2(0.05 * sin(t), 0.0)));
    col = mix(col, mix(vec3(0.5), vec3(0.95), lift), step(length(g), 0.22 + 0.12 * lift));
  } else {
    for (int i = 0; i < 12; i++) {
      float a = float(i) / 12.0 * 2.0 * PI + t * 0.3;
      vec2 c = vec2(cos(a), sin(a)) * 0.3;
      col = mix(col, mix(vec3(0.9, 0.2, 0.2), vec3(0.2, 0.3, 0.9), step(0.5, mod(float(i), 2.0))), fill(length(p - c) - 0.075, PX));
    }
  }
  return col;
}
// A warm spark of rays breathes on cream: hello from Claude.
vec3 chClaude(vec2 uv, float t) {
  vec2 p = (uv - 0.5) * ASP;
  vec3 col = vec3(0.95, 0.93, 0.88);
  float r = length(p), a = atan(p.y, p.x) + t * 0.15;
  float n = 12.0, k = floor(a / (2.0 * PI) * n + 0.5), ca = k / n * 2.0 * PI;
  vec2 d = vec2(cos(ca - t * 0.15), sin(ca - t * 0.15));
  float len = (0.22 + 0.12 * h21(vec2(k, 7.0))) * (1.0 + 0.06 * sin(t * 1.4 + k));
  float ray = sdSeg(p, d * 0.03, d * len) - 0.032;
  col = mix(col, vec3(0.85, 0.46, 0.33), fill(min(ray, r - 0.07), PX));
  float blink = step(0.5, fract(t * 1.1));
  return mix(col, vec3(0.2, 0.18, 0.16), blink * step(abs(uv.x - 0.5), 0.01) * step(abs(uv.y - 0.08), 0.03));
}
// A submarine cruises; sonar rings spread through the water.
vec3 chSub(vec2 uv, float t) {
  vec3 col = mix(vec3(0.0, 0.08, 0.15), vec3(0.05, 0.3, 0.45), uv.y);
  col += vec3(0.15, 0.3, 0.35) * 0.3 * smoothstep(0.03, 0.0, abs(fract(uv.x * 4.0 + uv.y * 1.5 + t * 0.05) - 0.5) - 0.42) * uv.y;
  vec2 c = vec2(fract(t * 0.04) * 1.8 - 0.4, 0.45 + 0.03 * sin(t * 0.5));
  vec2 q = (uv - c) * ASP;
  float r = length(q);
  col += vec3(0.4, 1.0, 0.8) * smoothstep(0.01, 0.0, abs(r - fract(t * 0.5) * 0.8)) * (1.0 - fract(t * 0.5)) * 0.6;
  float hull = sdBox(q, vec2(0.22, 0.04), 0.04);
  hull = min(hull, sdBox(q - vec2(0.03, 0.06), vec2(0.04, 0.035), 0.01));
  hull = min(hull, sdBox(q - vec2(0.04, 0.12), vec2(0.004, 0.03), 0.0));
  hull = min(hull, sdBox(q - vec2(-0.25, 0.0), vec2(0.01, 0.04 * abs(sin(t * 6.0)) + 0.01), 0.0));
  col = mix(col, vec3(0.2, 0.22, 0.25), fill(hull, PX));
  for (int i = 0; i < 3; i++) col = mix(col, vec3(0.9, 0.85, 0.5), fill(length(q - vec2(0.12 - float(i) * 0.08, 0.0)) - 0.012, PX));
  for (int i = 0; i < 6; i++) {
    float fi = float(i), f = fract(t * 0.4 + fi / 6.0);
    vec2 b = c + vec2(-0.2 - f * 0.1 + 0.01 * sin(f * 20.0), f * 0.25);
    col = mix(col, vec3(0.7, 0.9, 1.0), smoothstep(0.006, 0.0, abs(length((uv - b) * ASP) - 0.008)));
  }
  return col;
}
// A peach bounces; an aubergine sidles up; hearts float off.
vec3 chFruit(vec2 uv, float t) {
  vec2 p = (uv - 0.5) * ASP;
  vec3 col = mix(vec3(1.0, 0.85, 0.75), vec3(1.0, 0.7, 0.75), uv.y);
  float ph = mod(t, 8.0), near = smoothstep(0.0, 5.0, ph);
  vec2 q = p - vec2(0.25, -0.05 + 0.03 * abs(sin(t * 4.0)));
  float peach = min(length(q - vec2(-0.07, 0.0)) - 0.15, length(q - vec2(0.07, 0.0)) - 0.15);
  col = mix(col, mix(vec3(1.0, 0.55, 0.4), vec3(1.0, 0.75, 0.5), smoothstep(-0.15, 0.15, q.y)), fill(peach, PX));
  col = mix(col, vec3(0.8, 0.35, 0.3), fill(sdSeg(q, vec2(0.0, -0.1), vec2(0.0, 0.08)) - 0.006, PX) * step(peach, 0.0));
  col = mix(col, vec3(0.3, 0.6, 0.25), fill(length((q - vec2(0.05, 0.16)) / vec2(1.0, 0.45)) - 0.05, PX));
  vec2 a = rot(-0.5 + 0.15 * sin(t * 2.0)) * (p - vec2(mix(-0.75, -0.12, near), -0.02));
  float aub = min(length(a / vec2(1.0, 2.2)) - 0.09, length((a - vec2(0.0, 0.12)) / vec2(1.0, 1.8)) - 0.06);
  col = mix(col, mix(vec3(0.35, 0.1, 0.45), vec3(0.6, 0.25, 0.7), smoothstep(-0.05, 0.08, a.x)), fill(aub, PX));
  col = mix(col, vec3(0.3, 0.55, 0.2), fill(sdBox(a - vec2(0.0, 0.25), vec2(0.04, 0.025), 0.015), PX));
  for (int i = 0; i < 5; i++) {
    float f = fract(t * 0.5 + float(i) * 0.2);
    vec2 hp = (p - vec2(0.05 + 0.1 * sin(f * 6.0 + float(i)), -0.1 + f * 0.6)) / 0.05;
    col = mix(col, vec3(1.0, 0.2, 0.4), step(sdHeart(hp + vec2(0.0, 0.5)), 0.0) * step(4.5, ph) * (1.0 - f));
  }
  return col;
}
// A hotel door: sign and sock on the handle; the door rattles, the frame tilts.
vec3 chDoor(vec2 uv, float t) {
  float busy = step(0.3, fract(t * 0.2)), sh = (vn(vec2(t * 9.0, 0.0)) - 0.5) * 0.012 * busy;
  vec2 p = (uv - vec2(0.5 + sh, 0.0)) * ASP;
  vec3 col = mix(vec3(0.55, 0.35, 0.3), vec3(0.68, 0.45, 0.38), step(0.5, fract(uv.x * 30.0)) * 0.3 + uv.y * 0.3);
  col = mix(col, vec3(0.35, 0.18, 0.1), step(abs(p.x), 0.3) * step(p.y, 0.85));
  col = mix(col, vec3(0.42, 0.22, 0.12), max(fill(sdBox(p - vec2(0.0, 0.62), vec2(0.2, 0.14), 0.01), PX), fill(sdBox(p - vec2(0.0, 0.25), vec2(0.2, 0.18), 0.01), PX)) * 0.6);
  vec2 h = p - vec2(0.22, 0.42);
  col = mix(col, vec3(0.85, 0.7, 0.3), fill(length(h) - 0.025, PX));
  vec2 s = rot(0.25 * sin(t * 3.0)) * h;
  col = mix(col, vec3(0.95, 0.9, 0.8), fill(sdBox(s - vec2(0.0, -0.13), vec2(0.06, 0.08), 0.01), PX));
  col = mix(col, vec3(0.8, 0.1, 0.15), fill(sdBox(s - vec2(0.0, -0.13), vec2(0.04, 0.012), 0.0), PX));
  vec2 k = h - vec2(-0.06, -0.08);
  float sock = min(sdBox(k, vec2(0.02, 0.06), 0.01), sdBox(k - vec2(-0.03, -0.06), vec2(0.035, 0.018), 0.012));
  col = mix(col, mix(vec3(0.95), vec3(0.2, 0.4, 0.9), step(0.5, fract(k.y * 25.0))), fill(sock, PX));
  col = mix(col, vec3(1.0, 0.8, 0.5) * (0.7 + 0.3 * h21(vec2(floor(t * 10.0), 3.0))), step(abs(p.x), 0.3) * step(p.y, 0.014));
  vec2 fr = rot(0.06 * sin(t * 7.0) * busy) * (uv * ASP - vec2(0.18, 0.7));
  col = mix(col, vec3(0.75, 0.6, 0.3), fill(sdBox(fr, vec2(0.08, 0.06), 0.0), PX));
  return mix(col, vec3(0.4, 0.6, 0.7), fill(sdBox(fr, vec2(0.06, 0.045), 0.0), PX));
}
// Lovers' lane: a parked car rocks under the moon, windows steamed.
vec3 chCar(vec2 uv, float t) {
  vec3 col = mix(vec3(0.03, 0.04, 0.12), vec3(0.12, 0.1, 0.25), uv.y) + stars2(uv, 0.994) * 0.5;
  col = mix(col, vec3(0.95, 0.92, 0.8), fill(length((uv - vec2(0.8, 0.78)) * ASP) - 0.07, PX));
  col = mix(col, vec3(0.04, 0.06, 0.05), step(uv.y, 0.28 + 0.05 * sin(uv.x * 3.0)));
  float rock = sin(t * 9.0) * 0.014 * step(0.25, fract(t * 0.15));
  vec2 p = rot(rock) * ((uv - vec2(0.45, 0.32)) * ASP);
  p.y -= abs(rock) * 0.5;
  col = mix(col, vec3(0.5, 0.08, 0.12), fill(min(sdBox(p, vec2(0.32, 0.06), 0.04), sdBox(p - vec2(-0.03, 0.09), vec2(0.17, 0.06), 0.05)), PX));
  float win = min(sdBox(p - vec2(-0.1, 0.1), vec2(0.06, 0.035), 0.015), sdBox(p - vec2(0.05, 0.1), vec2(0.06, 0.035), 0.015));
  col = mix(col, mix(vec3(0.75, 0.7, 0.75), vec3(0.92, 0.88, 0.92), fbm(p * 30.0)), fill(win, PX));
  col = mix(col, vec3(0.05), fill(min(length(p - vec2(-0.2, -0.07)) - 0.05, length(p - vec2(0.2, -0.07)) - 0.05), PX));
  float f = fract(t * 0.3);
  return mix(col, vec3(1.0, 0.3, 0.45), step(sdHeart((p - vec2(0.0, 0.2 + f * 0.4)) / 0.05 + vec2(0.0, 0.5)), 0.0) * (1.0 - f));
}
// A banana peels itself in the spotlight, a strip at a time; a boa sways.
vec3 chBanana(vec2 uv, float t) {
  vec2 p = (uv - vec2(0.5, 0.18)) * ASP;
  vec3 col = mix(vec3(0.1, 0.02, 0.06), vec3(0.45, 0.08, 0.18), smoothstep(0.6, 0.0, length(p * vec2(1.3, 0.8) - vec2(0.0, 0.3))));
  col = mix(col, vec3(0.6, 0.1, 0.15), step(uv.y, 0.12) * 0.7);
  float ph = clamp(mod(t, 9.0) / 6.0, 0.0, 1.0);
  vec2 q = rot(0.08 * sin(t * 2.0)) * p;
  col = mix(col, vec3(1.0, 0.95, 0.75), fill(sdSeg(q, vec2(0.0, 0.0), vec2(0.0, 0.46)) - 0.065, PX));
  vec2 pivot = vec2(0.0, 0.48);
  for (int i = 0; i < 3; i++) {
    float side = float(i) - 1.0, open = clamp(ph * 3.0 - float(i) * 0.7, 0.0, 1.0);
    vec2 r = rot(side * open * 2.4) * (q - pivot);
    float strip = sdBox(r - vec2(side * 0.03, -0.2), vec2(0.04, 0.2), 0.03);
    float show = i == 1 ? step(open, 0.5) : 1.0;
    col = mix(col, mix(vec3(1.0, 0.85, 0.15), vec3(0.85, 0.65, 0.1), step(0.0, r.x)), fill(strip, PX) * show);
  }
  col = mix(col, vec3(0.35, 0.25, 0.1), fill(sdBox(q - pivot - vec2(0.0, 0.03), vec2(0.02, 0.03), 0.01), PX));
  for (int i = 0; i < 18; i++) {
    float fi = float(i) / 17.0;
    col = mix(col, vec3(1.0, 0.4, 0.75), fill(length(p - vec2(-0.3 + fi * 0.6, 0.3 + 0.08 * sin(fi * 6.0 + t * 2.0))) - 0.035 - 0.01 * vn(vec2(fi * 20.0, t)), PX));
  }
  return col;
}
// The cork wiggles, wiggles, then pops in a fountain of foam.
vec3 chBubbly(vec2 uv, float t) {
  vec2 p = (uv - vec2(0.5, 0.0)) * ASP;
  vec3 col = mix(vec3(0.15, 0.05, 0.1), vec3(0.45, 0.15, 0.25), uv.y);
  float ph = mod(t, 6.0), pop = step(3.0, ph), f = clamp((ph - 3.0) / 3.0, 0.0, 1.0);
  vec2 q = rot(-0.35) * (p - vec2(-0.1, 0.05));
  col = mix(col, vec3(0.08, 0.25, 0.12), fill(min(sdBox(q - vec2(0.0, 0.2), vec2(0.09, 0.2), 0.05), sdBox(q - vec2(0.0, 0.48), vec2(0.035, 0.1), 0.02)), PX));
  col = mix(col, vec3(0.9, 0.8, 0.4), fill(sdBox(q - vec2(0.0, 0.5), vec2(0.038, 0.06), 0.01), PX));
  col = mix(col, vec3(0.95, 0.9, 0.8), fill(sdBox(q - vec2(0.0, 0.2), vec2(0.07, 0.06), 0.01), PX));
  vec2 tip = vec2(0.0, 0.6);
  col = mix(col, vec3(0.75, 0.55, 0.35), fill(sdBox(q - tip - vec2(0.012 * sin(t * 30.0) * (1.0 - pop), f * 1.2), vec2(0.03, 0.03), 0.01), PX));
  for (int i = 0; i < 24; i++) {
    float fi = float(i), a = (h21(vec2(fi, 1.0)) - 0.5) * 0.9, sp = 0.4 + 0.8 * h21(vec2(fi, 2.0));
    vec2 d = tip + vec2(sin(a), cos(a)) * f * sp - vec2(0.0, f * f * 0.3);
    col = mix(col, vec3(1.0, 0.97, 0.85), pop * fill(length(q - d) - 0.012 - 0.02 * f, PX) * (1.0 - f * 0.7));
  }
  return col;
}
// A burlesque shadow on a lit blind; two big fans keep everything covered.
vec3 chFans(vec2 uv, float t) {
  vec2 p = (uv - vec2(0.5, 0.0)) * ASP;
  vec3 col = mix(vec3(0.95, 0.6, 0.35), vec3(0.9, 0.4, 0.3), uv.y) * (0.9 + 0.1 * step(0.5, fract(uv.y * 16.0)));
  vec2 q = p - vec2(0.04 * sin(t * 1.5), 0.0);
  float fig = length((q - vec2(0.0, 0.78)) / vec2(0.85, 1.0)) - 0.07;
  fig = min(fig, sdSeg(q, vec2(0.0, 0.7), vec2(0.0, 0.62)) - 0.025);
  float waist = 0.06 + 0.04 * smoothstep(0.45, 0.6, q.y) + 0.06 * smoothstep(0.38, 0.2, q.y) * smoothstep(0.0, 0.2, q.y);
  fig = min(fig, max(abs(q.x) - waist, max(q.y - 0.62, -q.y)));
  fig = min(fig, min(sdSeg(q, vec2(-0.04, 0.05), vec2(-0.06, -0.2)), sdSeg(q, vec2(0.04, 0.05), vec2(0.07, -0.2))) - 0.03);
  col = mix(col, vec3(0.15, 0.05, 0.08), fill(fig, PX * 1.5));
  for (int i = 0; i < 2; i++) {
    float side = i == 0 ? -1.0 : 1.0, fi = float(i);
    vec2 r = rot(side * (0.4 + 0.5 * sin(t * 1.2 + fi * 3.14))) * (q - vec2(side * 0.14, 0.42 + 0.08 * sin(t * 1.2 + fi)));
    float ang = atan(r.x, r.y);
    col = mix(col, vec3(0.12, 0.04, 0.07), step(length(r), 0.26) * step(abs(ang), 1.1) * (0.8 + 0.2 * step(0.5, fract(ang * 6.0))));
  }
  return col;
}
// Under the covers: the sheet heaves; two pairs of feet poke out and curl.
vec3 chSheets(vec2 uv, float t) {
  vec2 p = uv * ASP;
  vec3 col = mix(vec3(0.3, 0.12, 0.15), vec3(0.45, 0.2, 0.22), uv.y);
  col = mix(col, vec3(0.25, 0.12, 0.08), step(abs(p.x - 1.2), 0.04) * step(uv.y, 0.7));
  col = mix(col, vec3(0.2, 0.1, 0.07), step(uv.y, 0.22));
  float heave = 0.5 + 0.5 * sin(t * 4.0), bed = 0.3;
  float h = bed + 0.06 + 0.11 * exp(-pow((p.x - 0.62) / 0.2, 2.0)) * (0.8 + 0.4 * heave) + 0.07 * exp(-pow((p.x - 0.85) / 0.12, 2.0)) * (1.2 - 0.4 * heave);
  col = mix(col, mix(vec3(0.95, 0.85, 0.88), vec3(0.8, 0.62, 0.7), smoothstep(h - 0.06, h, uv.y)), step(uv.y, h) * step(0.18, p.x) * step(p.x, 1.16) * step(0.22, uv.y));
  col = mix(col, vec3(0.98, 0.95, 0.95), fill(sdBox(p - vec2(1.07, bed + 0.1), vec2(0.07, 0.04), 0.03), PX));
  for (int i = 0; i < 4; i++) {
    float fi = float(i), curl = 0.5 + 0.5 * sin(t * 6.0 + (i < 2 ? 0.0 : 1.5));
    vec2 f = p - vec2(0.15, bed + 0.03 + fi * 0.035);
    float foot = length(f / vec2(0.05, 0.016)) - 1.0;
    vec2 toe = rot(curl * 0.8) * (f - vec2(-0.045, 0.0));
    foot = min(foot * 0.016, length(toe - vec2(-0.012, 0.0)) - 0.012);
    col = mix(col, i < 2 ? vec3(0.95, 0.75, 0.62) : vec3(0.62, 0.42, 0.32), fill(foot, PX * 0.5));
  }
  return col;
}
// Glossy lips pout, part and blow a kiss; kiss marks stamp the glass.
vec3 chLips(vec2 uv, float t) {
  vec2 p = (uv - 0.5) * ASP;
  vec3 col = vec3(0.12, 0.02, 0.08);
  for (int i = 0; i < 4; i++) {
    float fi = float(i), k = floor(t * 0.5 + fi * 0.25);
    vec2 c = vec2(-0.5 + h21(vec2(k, fi)) * 1.0, -0.35 + 0.7 * h21(vec2(k, fi + 3.0))), m = (p - c) / 0.05;
    float mark = min(length((m - vec2(0.0, 0.3)) / vec2(1.0, 0.45)) - 0.9, length((m + vec2(0.0, 0.3)) / vec2(1.0, 0.5)) - 0.85);
    col = mix(col, vec3(0.75, 0.1, 0.3), step(mark, 0.0) * step(0.18, length(m) * 0.2) * 0.7);
  }
  float open = 0.5 + 0.5 * sin(t * 1.3), pucker = smoothstep(0.6, 1.0, sin(t * 0.7));
  float w = mix(0.36, 0.2, pucker), x = p.x / w;
  float top = 0.12 * (1.0 - x * x) + 0.03 * (1.0 - smoothstep(0.0, 0.25, abs(abs(x) - 0.22))) - 0.035 * (1.0 - smoothstep(0.0, 0.14, abs(x)));
  float gap = 0.012 * open;
  float upper = step(abs(x), 1.0) * step(gap, p.y) * step(p.y, top);
  float lower = step(abs(x), 1.0) * step(-0.14 * (1.0 - x * x), p.y) * step(p.y, -gap);
  col = mix(col, vec3(0.85, 0.05, 0.15), max(upper, lower));
  col = mix(col, vec3(0.25, 0.0, 0.04), step(abs(x), 0.85) * step(-gap, p.y) * step(p.y, gap));
  col += vec3(1.0, 0.75, 0.8) * 0.55 * smoothstep(0.05, 0.0, length((p - vec2(-0.25 * w, -0.07)) / vec2(2.0, 0.6))) * lower;
  return col;
}
// Art house: two figures sway under a mosaic and a dancing black bar.
vec3 chCensor(vec2 uv, float t) {
  vec2 p = (uv - 0.5) * ASP;
  vec3 col = mix(vec3(0.3, 0.15, 0.25), vec3(0.6, 0.3, 0.35), uv.y);
  bool mz = abs(p.x) < 0.3 && abs(p.y + 0.06) < 0.22;
  vec2 s = mz ? ((floor(uv * vec2(20.0, 15.0)) + 0.5) / vec2(20.0, 15.0) - 0.5) * ASP : p;
  float sway = 0.03 * sin(t * 2.0);
  float a = min(length((s - vec2(-0.1 + sway, 0.24)) / vec2(0.8, 1.0)) - 0.075, sdBox(s - vec2(-0.1 + sway, -0.08), vec2(0.08, 0.24), 0.07));
  float b = min(length((s - vec2(0.1 - sway, 0.22)) / vec2(0.8, 1.0)) - 0.07, sdBox(s - vec2(0.1 - sway, -0.1), vec2(0.075, 0.24), 0.07));
  col = mix(col, vec3(0.95, 0.72, 0.6), step(a, 0.0));
  col = mix(col, vec3(0.7, 0.45, 0.35), step(b, 0.0));
  col = mix(col, vec3(0.02), step(abs(p.y - 0.23 - 0.02 * sin(t * 3.0)), 0.03) * step(abs(p.x), 0.26));
  return col * grain(uv, t, 0.06);
}
// A washing line of lace and stockings flutters in the breeze.
vec3 chLine(vec2 uv, float t) {
  vec3 col = mix(vec3(0.95, 0.75, 0.6), vec3(0.6, 0.75, 0.95), uv.y);
  col = mix(col, vec3(0.5, 0.65, 0.35), step(uv.y, 0.2));
  col = mix(col, vec3(0.3), smoothstep(0.005, 0.0, abs(uv.y - 0.72 + 0.08 * sin(uv.x * PI))));
  for (int i = 0; i < 5; i++) {
    float fi = float(i), x0 = 0.12 + fi * 0.19;
    vec2 q = rot(0.12 * sin(t * 2.0 + fi * 1.3)) * ((uv - vec2(x0, 0.72 - 0.08 * sin(x0 * PI))) * ASP);
    vec3 c = (i == 0 || i == 3) ? vec3(0.9, 0.1, 0.25) : i == 1 ? vec3(0.1, 0.08, 0.1) : vec3(1.0, 0.75, 0.85);
    float d;
    if (i == 1 || i == 4) d = min(sdSeg(q, vec2(0.0, 0.0), vec2(0.0, -0.22)) - 0.022, sdSeg(q, vec2(0.0, -0.22), vec2(0.04, -0.24)) - 0.02);
    else if (i == 2) d = min(max(min(length(q - vec2(-0.045, -0.02)) - 0.045, length(q - vec2(0.045, -0.02)) - 0.045), q.y + 0.02), sdSeg(q, vec2(-0.09, -0.02), vec2(0.09, -0.02)) - 0.004);
    else d = max(abs(q.x) - 0.07 - q.y * 0.6, max(q.y, -q.y - 0.11));
    col = mix(col, c * (0.85 + 0.15 * step(0.5, fract((q.x + q.y) * 60.0))), fill(d, PX));
    col = mix(col, vec3(0.6, 0.45, 0.3), fill(sdBox(q, vec2(0.006, 0.015), 0.0), PX));
  }
  return col;
}
// Through the keyhole: clothes sail over a dressing screen into a pile.
vec3 chPeep(vec2 uv, float t) {
  vec2 p = (uv - 0.5) * ASP;
  float key = min(length(p - vec2(0.0, 0.1)) - 0.17, max(abs(p.x) - 0.05 - 0.12 * smoothstep(0.05, -0.4, p.y), max(p.y - 0.05, -p.y - 0.42)));
  vec3 room = mix(vec3(0.6, 0.3, 0.2), vec3(0.85, 0.55, 0.35), uv.y);
  room = mix(room, mix(vec3(0.75, 0.6, 0.4), vec3(0.62, 0.48, 0.33), step(0.5, fract((p.x + 0.25) / 0.5 * 3.0))), step(abs(p.x), 0.25) * step(p.y, 0.05) * step(-0.42, p.y));
  room = mix(room, vec3(0.15, 0.06, 0.05), step(length(p - vec2(0.05 + 0.02 * sin(t * 2.0), 0.11)), 0.05) * step(0.05, p.y));
  float f = fract(t * 0.4), k = mod(floor(t * 0.4), 4.0);
  vec3 cloth = k < 1.0 ? vec3(0.85, 0.1, 0.2) : k < 2.0 ? vec3(0.1) : k < 3.0 ? vec3(1.0, 0.75, 0.85) : vec3(0.9, 0.9, 0.95);
  room = mix(room, cloth, step(length((p - vec2(0.05 + f * 0.4, 0.08 + f * 0.35 - f * f * 0.55)) / vec2(1.6, 0.6)), 0.04));
  room = mix(room, vec3(0.85, 0.1, 0.2), step(length((p - vec2(0.36, -0.38)) / vec2(2.5, 1.0)), 0.03 + 0.012 * k));
  vec3 door = vec3(0.1, 0.06, 0.04) + vec3(0.05, 0.03, 0.02) * step(0.5, fract(uv.x * 40.0 + fbm(uv * 4.0) * 3.0));
  return mix(door, room, step(key, 0.0));
}
// Test footage: a flash, a fireball, then the mushroom climbs.
vec3 chNuke(vec2 uv, float t) {
  float ph = mod(t, 12.0), rise = 1.0 - exp(-ph * 0.35), ch = 0.05 + rise * 0.55;
  vec2 p = (uv - vec2(0.5, 0.25)) * ASP;
  vec3 col = mix(vec3(0.7, 0.68, 0.62), vec3(0.5, 0.52, 0.55), uv.y);
  col = mix(col, vec3(0.55, 0.5, 0.42), step(uv.y, 0.25));
  float stem = step(abs(p.x), 0.03 + 0.03 * rise + 0.02 * fbm(vec2(p.y * 8.0, t))) * step(0.0, p.y) * step(p.y, ch);
  vec2 cq = (p - vec2(0.0, ch)) / vec2(0.12 + 0.18 * rise, 0.07 + 0.08 * rise);
  float cap = length(cq) - 1.0 + 0.25 * fbm(cq * 2.0 + t * 0.3);
  vec3 fire = mix(vec3(1.0, 0.95, 0.8), vec3(1.0, 0.5, 0.15), smoothstep(0.0, 0.6, ph));
  col = mix(col, mix(fire, mix(vec3(0.95, 0.9, 0.8), vec3(0.72, 0.68, 0.64), rise), smoothstep(1.0, 4.0, ph)), max(stem, step(cap, 0.0)));
  col = mix(col, vec3(0.9), smoothstep(0.03, 0.0, abs(length((p - vec2(0.0, ch * 0.7)) / vec2(1.0, 0.25)) - (0.15 + rise * 0.25))) * smoothstep(0.3, 1.0, rise) * 0.6);
  col = mix(col, vec3(0.82, 0.78, 0.7), step(abs(p.y), 0.03 + 0.02 * rise) * step(abs(p.x), rise * 0.6) * step(0.3, ph));
  col = mix(col, vec3(1.0), exp(-ph * 3.0));
  return vec3(dot(col, vec3(0.3, 0.55, 0.15))) * grain(uv, t, 0.1) * (0.92 + 0.08 * sin(uv.y * 200.0 + t * 10.0));
}
// Under the microscope: spiked virions drift toward a cell.
vec3 chVirus(vec2 uv, float t) {
  vec2 p = (uv - 0.5) * ASP;
  vec3 col = mix(vec3(0.05, 0.12, 0.1), vec3(0.1, 0.25, 0.2), fbm(p * 3.0 + t * 0.05));
  col = mix(col, vec3(0.6, 0.25, 0.45), step(length(p - vec2(0.35, -0.3)), 0.32 + 0.02 * sin(atan(p.y + 0.3, p.x - 0.35) * 7.0 + t)));
  for (int i = 0; i < 6; i++) {
    float fi = float(i);
    vec2 c = vec2(-0.6 + fract(h21(vec2(fi, 1.0)) + t * 0.02 * (1.0 + fi * 0.2)) * 1.2, -0.35 + 0.7 * h21(vec2(fi, 2.0)) + 0.05 * sin(t * 0.7 + fi));
    vec2 q = rot(t * 0.3 + fi) * (p - c);
    float r = length(q), a = atan(q.y, q.x);
    vec3 vc = mix(vec3(0.7, 0.85, 0.3), vec3(0.9, 0.4, 0.2), step(0.5, h21(vec2(fi, 3.0))));
    col = mix(col, vc * 0.8, step(r, 0.085) * step(0.92, cos(a * 12.0)));
    col = mix(col, vc * 0.9, step(abs(r - 0.085), 0.008) * step(0.8, cos(a * 12.0)));
    col = mix(col, vc, fill(r - 0.06, PX));
    col = mix(col, vc * 0.6, fill(r - 0.03, PX) * 0.5);
  }
  return col;
}
// A computer virus: warning windows pile up, each with a skull.
vec3 chMalware(vec2 uv, float t) {
  vec3 col = vec3(0.0, 0.5, 0.5);
  float n = mod(floor(t * 2.0), 14.0);
  for (int i = 0; i < 14; i++) {
    float fi = float(i);
    if (fi > n) break;
    vec2 q = (uv - vec2(0.15 + 0.7 * h21(vec2(fi, 4.0)), 0.25 + 0.55 * h21(vec2(fi, 5.0)))) * ASP;
    float inside = step(sdBox(q, vec2(0.17, 0.11), 0.0), 0.0);
    col = mix(col, vec3(0.75), inside);
    col = mix(col, vec3(0.0, 0.0, 0.5), step(abs(q.x), 0.17) * step(abs(q.y - 0.095), 0.015));
    col = mix(col, vec3(0.75, 0.0, 0.0), step(abs(q.x - 0.15), 0.012) * step(abs(q.y - 0.095), 0.012));
    vec2 s = q - vec2(-0.09, -0.01);
    col = mix(col, vec3(0.1), step(min(length(s / vec2(1.0, 0.9)) - 0.045, sdBox(s - vec2(0.0, -0.04), vec2(0.025, 0.015), 0.005)), 0.0) * inside);
    col = mix(col, vec3(0.75), step(min(length(s - vec2(-0.017, 0.005)), length(s - vec2(0.017, 0.005))), 0.012) * inside);
    col = mix(col, vec3(0.35), step(abs(q.x - 0.06), 0.07) * step(abs(fract(q.y * 30.0) - 0.5), 0.15) * step(abs(q.y - 0.02), 0.04) * inside);
    col = mix(col, vec3(0.6), step(abs(q.x - 0.07), 0.05) * step(abs(q.y + 0.065), 0.02));
  }
  return col;
}
// A cooking show: an egg fries and sizzles.
vec3 chEgg(vec2 uv, float t) {
  vec2 p = (uv - vec2(0.45, 0.45)) * ASP, e = p / vec2(1.0, 0.7);
  vec3 col = mix(vec3(0.85, 0.85, 0.82), vec3(0.95, 0.94, 0.9), step(0.5, fract((uv.x + uv.y) * 8.0)));
  float pan = length(e) - 0.36;
  col = mix(col, vec3(0.15), fill(pan, PX));
  col = mix(col, vec3(0.2), fill(sdBox(p - vec2(0.55, -0.02), vec2(0.18, 0.025), 0.02), PX));
  float cook = clamp(mod(t, 10.0) / 6.0, 0.0, 1.0), white = length(e) - 0.2 - 0.03 * sin(atan(e.y, e.x) * 5.0 + 1.0);
  col = mix(col, mix(vec3(0.85, 0.9, 0.85), vec3(1.0), cook), fill(white, PX));
  col = mix(col, vec3(0.8, 0.55, 0.3), smoothstep(0.02, 0.0, abs(white)) * cook);
  col = mix(col, vec3(1.0, 0.7, 0.05), fill(length(e - vec2(0.03, 0.02)) - 0.075, PX));
  col += vec3(0.4) * smoothstep(0.02, 0.0, length(e - vec2(0.0, 0.05)) - 0.015);
  return mix(col, vec3(1.0), step(0.985, h21(floor(uv * vec2(160.0, 120.0)) + floor(t * 12.0))) * step(pan, 0.0));
}
// Football from the stand roof: two teams chase the ball.
vec3 chPitch(vec2 uv, float t) {
  vec2 p = (uv - 0.5) * ASP;
  vec3 col = mix(vec3(0.15, 0.5, 0.2), vec3(0.18, 0.56, 0.24), step(0.5, fract(uv.x * 8.0)));
  float l = smoothstep(0.006, 0.0, abs(p.x)) + smoothstep(0.006, 0.0, abs(length(p) - 0.12));
  l += smoothstep(0.006, 0.0, abs(abs(p.x) - 0.6)) * step(abs(p.y), 0.45) + smoothstep(0.006, 0.0, abs(abs(p.y) - 0.45)) * step(abs(p.x), 0.6);
  l += smoothstep(0.006, 0.0, abs(abs(p.x) - 0.48)) * step(abs(p.y), 0.18) + smoothstep(0.006, 0.0, abs(abs(p.y) - 0.18)) * step(0.48, abs(p.x)) * step(abs(p.x), 0.6);
  col = mix(col, vec3(0.95), min(l, 1.0));
  vec2 ball = vec2(0.45 * sin(t * 0.37), 0.3 * sin(t * 0.53 + 1.0));
  for (int i = 0; i < 10; i++) {
    float fi = float(i);
    vec2 home = vec2((fi < 5.0 ? -0.4 : 0.4) + 0.15 * sin(fi * 2.0), -0.3 + mod(fi, 5.0) * 0.15);
    col = mix(col, fi < 5.0 ? vec3(0.9, 0.15, 0.15) : vec3(0.15, 0.3, 0.9), fill(length(p - mix(home, ball, 0.35 + 0.1 * sin(t + fi))) - 0.025, PX));
  }
  return mix(col, vec3(1.0), fill(length(p - ball) - 0.014, PX));
}
// Tennis from above: a long rally.
vec3 chTennis(vec2 uv, float t) {
  vec2 p = (uv - 0.5) * ASP;
  vec3 col = mix(vec3(0.2, 0.45, 0.7), vec3(0.25, 0.55, 0.35), step(abs(p.x), 0.55) * step(abs(p.y), 0.32));
  float l = smoothstep(0.005, 0.0, abs(abs(p.x) - 0.55)) * step(abs(p.y), 0.32) + smoothstep(0.005, 0.0, abs(abs(p.y) - 0.32)) * step(abs(p.x), 0.55);
  l += smoothstep(0.005, 0.0, abs(abs(p.y) - 0.24)) * step(abs(p.x), 0.55) + smoothstep(0.005, 0.0, abs(abs(p.x) - 0.3)) * step(abs(p.y), 0.24) + smoothstep(0.005, 0.0, abs(p.y)) * step(abs(p.x), 0.3);
  col = mix(col, vec3(0.95), min(l, 1.0));
  col = mix(col, vec3(0.9), step(abs(p.x), 0.006) * step(abs(p.y), 0.38));
  float k = floor(t * 0.4), s = fract(t * 0.4), dir = mod(k, 2.0) < 1.0 ? 1.0 : -1.0;
  vec2 ball = vec2(mix(-0.5, 0.5, s) * dir, mix(0.2 * sin(k * 2.3), 0.2 * sin((k + 1.0) * 2.3), s));
  col = mix(col, vec3(0.1), fill(length((p - ball) / vec2(1.0, 0.6)) - 0.012, PX) * 0.4);
  col = mix(col, vec3(0.85, 1.0, 0.2), fill(length(p - ball - vec2(0.0, sin(s * PI) * 0.05)) - 0.013, PX));
  col = mix(col, vec3(0.95), fill(length(p - vec2(-0.6, 0.2 * sin(k * 2.3 + (dir > 0.0 ? 0.0 : 2.3)))) - 0.03, PX));
  return mix(col, vec3(0.95, 0.4, 0.2), fill(length(p - vec2(0.6, 0.2 * sin(k * 2.3 + (dir > 0.0 ? 2.3 : 0.0)))) - 0.03, PX));
}
// Bowling: the ball rolls down the lane and the pins scatter.
vec3 chBowl(vec2 uv, float t) {
  float ph = mod(t, 5.0), hz = 0.75;
  vec3 col = vec3(0.1, 0.05, 0.12);
  if (uv.y < hz) {
    float z = 0.25 / (hz - uv.y + 0.02), x = (uv.x - 0.5) * z;
    col = mix(vec3(0.15, 0.08, 0.15), mix(vec3(0.85, 0.65, 0.4), vec3(0.75, 0.55, 0.32), step(0.5, fract(x * 8.0))), step(abs(x), 0.5));
  }
  float hit = max(ph - 2.5, 0.0);
  for (int i = 0; i < 6; i++) {
    float fi = float(i), row = fi < 1.0 ? 0.0 : fi < 3.0 ? 1.0 : 2.0, ix = fi < 1.0 ? 0.0 : fi < 3.0 ? fi - 1.5 : fi - 4.0;
    vec2 off = vec2((h21(vec2(fi, floor(t / 5.0))) - 0.5) * 0.3, 0.1 * h21(vec2(fi, 7.0)) - 0.15 * hit) * hit;
    vec2 q = rot(hit * 6.0 * (h21(vec2(fi, 3.0)) - 0.5)) * ((uv - vec2(0.5 + ix * 0.035, 0.66 + row * 0.015) - off) * ASP);
    col = mix(col, vec3(0.95), fill(sdBox(q, vec2(0.008, 0.025), 0.007), PX * 0.5));
    col = mix(col, vec3(0.9, 0.1, 0.1), fill(sdBox(q - vec2(0.0, 0.012), vec2(0.009, 0.003), 0.0), PX * 0.5));
  }
  float bz = mix(0.3, 2.6, clamp(ph / 2.5, 0.0, 1.0)), bs = 0.1 / bz;
  return mix(col, vec3(0.1, 0.2, 0.7), step(length((uv - vec2(0.5 + 0.03 * sin(ph * 2.0), hz + 0.02 - 0.25 / bz + bs * 0.6)) * ASP), bs));
}
// A rubber duck bobs in a bubble bath.
vec3 chDuck(vec2 uv, float t) {
  vec3 col = mix(vec3(0.6, 0.85, 0.95), vec3(0.85, 0.95, 1.0), uv.y) + vec3(0.05) * step(0.5, fract(uv.x * 10.0)) * step(0.5, fract(uv.y * 8.0));
  float water = 0.35 + 0.02 * sin(uv.x * 12.0 + t * 2.0);
  vec2 p = rot(0.1 * sin(t * 1.7)) * ((uv - vec2(0.5 + 0.1 * sin(t * 0.4), water + 0.02 * sin(t * 2.0))) * ASP);
  col = mix(col, vec3(1.0, 0.85, 0.1), fill(min(length((p - vec2(0.0, 0.06)) / vec2(1.4, 0.9)) - 0.12, length(p - vec2(0.1, 0.2)) - 0.07), PX));
  col = mix(col, vec3(1.0, 0.5, 0.05), fill(sdBox(p - vec2(0.18, 0.19), vec2(0.04, 0.012), 0.01), PX));
  col = mix(col, vec3(0.05), fill(length(p - vec2(0.12, 0.23)) - 0.012, PX));
  if (uv.y < water) col = mix(vec3(0.5, 0.75, 0.9), vec3(0.65, 0.85, 0.95), uv.y / water);
  for (int i = 0; i < 12; i++) {
    float fi = float(i);
    col = mix(col, vec3(1.0), fill(length((uv - vec2(fract(fi * 0.17 + 0.05 * sin(t + fi)), water + 0.01 * sin(t * 2.0 + fi))) * ASP) - 0.03 - 0.01 * h21(vec2(fi, 1.0)), PX));
  }
  return col;
}
// A whale breaches, hangs, and crashes back.
vec3 chWhale(vec2 uv, float t) {
  vec3 col = mix(vec3(0.75, 0.85, 0.95), vec3(0.4, 0.6, 0.85), uv.y);
  float sea = 0.35, ph = mod(t, 7.0) / 7.0, y = sea - 0.2 + sin(clamp(ph * 1.6, 0.0, 1.0) * PI) * 0.45;
  vec2 p = rot(0.9 - ph * 1.6) * ((uv - vec2(0.45 + ph * 0.15, y)) * ASP);
  float whale = min(length(p / vec2(2.6, 1.0)) - 0.07, sdBox(p - vec2(-0.2, 0.0), vec2(0.03, 0.05), 0.01));
  col = mix(col, mix(vec3(0.95, 0.95, 0.92), vec3(0.15, 0.2, 0.3), smoothstep(-0.02, 0.03, p.y)), fill(whale, PX));
  if (uv.y < sea + 0.01 * sin(uv.x * 20.0 + t)) col = mix(vec3(0.05, 0.2, 0.4), vec3(0.15, 0.35, 0.55), uv.y / sea);
  float splash = step(0.6, ph) * (1.0 - ph) * 2.5;
  for (int i = 0; i < 10; i++) {
    float fi = float(i), f = fract(ph * 3.0 + fi * 0.1);
    col = mix(col, vec3(0.95), fill(length((uv - vec2(0.55 + (fi - 5.0) * 0.09 * f, sea + sin(f * PI) * 0.15)) * ASP) - 0.012, PX) * splash);
  }
  return col;
}
// Lift-off: fire, smoke and a climbing rocket.
vec3 chRocket(vec2 uv, float t) {
  float ph = mod(t, 9.0), lift = max(0.0, ph - 2.0), fl = step(1.0, ph);
  vec3 col = mix(vec3(0.95, 0.7, 0.5), vec3(0.35, 0.5, 0.8), uv.y);
  col = mix(col, vec3(0.3, 0.3, 0.32), step(uv.y, 0.15));
  col = mix(col, vec3(0.4, 0.15, 0.1), step(abs(uv.x - 0.36), 0.012) * step(uv.y, 0.55) * step(0.15, uv.y));
  vec2 p = (uv - vec2(0.5, 0.2 + lift * lift * 0.05)) * ASP;
  float flame = step(abs(p.x), 0.03 + (-p.y) * 0.15) * step(p.y, 0.0) * step(-0.15 - 0.05 * sin(t * 30.0), p.y);
  col = mix(col, mix(vec3(1.0, 0.95, 0.6), vec3(1.0, 0.45, 0.1), clamp(-p.y * 6.0, 0.0, 1.0)), flame * fl);
  float body = min(sdBox(p - vec2(0.0, 0.12), vec2(0.035, 0.12), 0.01), max(abs(p.x) - 0.07 + p.y * 0.4, max(p.y - 0.06, -p.y)));
  col = mix(col, vec3(0.92), fill(body, PX));
  col = mix(col, vec3(0.8, 0.15, 0.1), fill(max(length(p - vec2(0.0, 0.24)) - 0.035, 0.24 - p.y), PX));
  return mix(col, vec3(0.92, 0.9, 0.88), smoothstep(0.55, 0.65, fbm(vec2(uv.x * 6.0, uv.y * 4.0 - t * 0.5))) * step(uv.y, 0.15 + 0.25 * smoothstep(0.5, 0.0, abs(uv.x - 0.5))) * fl);
}
// Northern lights ripple over a pine horizon.
vec3 chAurora(vec2 uv, float t) {
  vec3 col = mix(vec3(0.0, 0.02, 0.06), vec3(0.02, 0.06, 0.15), uv.y) + stars2(uv, 0.993) * 0.5;
  for (int i = 0; i < 3; i++) {
    float fi = float(i), y = 0.55 + 0.12 * sin(uv.x * 4.0 + t * 0.3 + fi * 1.7) + fi * 0.06;
    float band = smoothstep(0.0, 0.15, uv.y - y + 0.15) * smoothstep(0.25, 0.0, uv.y - y);
    col += mix(vec3(0.1, 1.0, 0.5), vec3(0.6, 0.3, 1.0), fi / 2.0) * band * (0.6 + 0.4 * sin(uv.x * 80.0 + fbm(vec2(uv.x * 6.0, t * 0.3)) * 10.0)) * 0.45;
  }
  return mix(col, vec3(0.01, 0.02, 0.03), step(uv.y, 0.15 + 0.08 * fbm(vec2(uv.x * 10.0, 1.0))));
}
// A mirror ball throws beams over a lit floor.
vec3 chDisco(vec2 uv, float t) {
  vec2 p = (uv - vec2(0.5, 0.7)) * ASP;
  vec3 col = vec3(0.05, 0.02, 0.08);
  for (int i = 0; i < 6; i++) {
    float fi = float(i), a = t * 0.8 + fi * 1.05;
    vec2 d = normalize(vec2(cos(a), sin(a) * 0.5 - 0.6));
    float along = dot(p, d), across = abs(p.x * d.y - p.y * d.x);
    col += hue(fi / 6.0 + t * 0.1) * 0.35 * smoothstep(0.03 + along * 0.08, 0.0, across) * step(0.0, along);
  }
  float r = length(p);
  if (r < 0.14) col = vec3(0.6 + 0.4 * h21(floor(vec2(atan(p.y, p.x) * 3.0 + t * 2.0, r * 40.0)) + floor(t * 4.0))) * (0.5 + 0.5 * (1.0 - r / 0.14));
  col = mix(col, vec3(0.5), step(abs(uv.x - 0.5), 0.003) * step(0.84, uv.y));
  if (uv.y < 0.25) col = hue(h21(floor(uv * vec2(10.0, 4.0)) + floor(t * 2.0))) * 0.7 * step(0.06, fract(uv.x * 10.0)) * step(0.1, fract(uv.y * 16.0));
  return col;
}
// Three reels spin and stop; every other pull lands three sevens.
vec3 chSlots(vec2 uv, float t) {
  vec3 col = mix(vec3(0.5, 0.05, 0.1), vec3(0.8, 0.15, 0.15), uv.y);
  float ph = mod(t, 6.0), win = mod(floor(t / 6.0), 2.0);
  for (int i = 0; i < 3; i++) {
    float fi = float(i), stopT = 2.0 + fi * 0.7;
    vec2 q = uv - vec2(0.2 + fi * 0.3, 0.5);
    if (abs(q.x) < 0.12 && abs(q.y) < 0.22) {
      float fin = win > 0.5 ? 3.0 : floor(h21(vec2(fi, floor(t / 6.0))) * 3.0);
      vec3 rc = vec3(0.95);
      if (ph < stopT) rc = mix(vec3(0.95), hue(mod(floor(q.y / 0.15 + ph * 20.0), 4.0) / 4.0), 0.5);
      else {
        vec2 s = q * ASP / 0.09;
        if (fin < 0.5) rc = mix(rc, vec3(0.85, 0.1, 0.1), step(min(length(s - vec2(-0.4, -0.3)), length(s - vec2(0.4, -0.3))), 0.45));
        else if (fin < 1.5) rc = mix(rc, vec3(1.0, 0.8, 0.1), step(length(s / vec2(1.0, 1.2) - vec2(0.0, 0.1)), 0.7) * step(-0.6, s.y));
        else if (fin < 2.5) rc = mix(rc, vec3(0.1), step(abs(s.x), 0.8) * step(abs(s.y), 0.3));
        else rc = mix(rc, vec3(0.9, 0.1, 0.1), seg7(s * 0.5 + vec2(0.5, 1.0), 7));
      }
      col = rc;
    }
  }
  return col + vec3(1.0, 0.9, 0.3) * win * step(4.0, ph) * step(0.5, fract(t * 4.0 + uv.x * 5.0)) * step(0.85, uv.y) * 0.6;
}
// A green terminal scrolls lines of code.
vec3 chHack(vec2 uv, float t) {
  vec2 g = floor(uv * vec2(40.0, 20.0)), f = fract(uv * vec2(40.0, 20.0));
  float scroll = floor(t * 4.0), len = 6.0 + 30.0 * h21(vec2(19.0 - g.y + scroll, 1.0));
  float ch = step(g.x, len) * step(0.15, f.x) * step(f.x, 0.85) * step(0.2, f.y) * step(f.y, 0.85) * step(0.4, h21(g * 7.0 + floor(f * vec2(3.0, 4.0)) + scroll));
  ch = max(ch, step(g.y, 0.0) * step(abs(g.x - mod(t * 8.0, 30.0)), 0.5) * step(0.5, fract(t * 2.0)));
  return mix(vec3(0.0, 0.03, 0.0), vec3(0.2, 1.0, 0.3), ch) * (0.9 + 0.1 * sin(uv.y * 240.0));
}
// Aerobics: a figure in a leotard jumps to the beat.
vec3 chAerobics(vec2 uv, float t) {
  vec3 col = mix(vec3(1.0, 0.4, 0.7), vec3(0.3, 0.9, 1.0), clamp(uv.x + 0.2 * sin(t), 0.0, 1.0));
  col = mix(col, vec3(0.95, 0.85, 0.2), step(0.5, fract((uv.x - uv.y) * 6.0 + t * 0.5)) * 0.25);
  float b = sin(t * 4.0);
  vec2 p = (uv - vec2(0.5, 0.15 + abs(b) * 0.03)) * ASP;
  float d = length(p - vec2(0.0, 0.62)) - 0.05;
  d = min(d, sdSeg(p, vec2(0.0, 0.56), vec2(0.0, 0.3)) - 0.03);
  for (int i = 0; i < 2; i++) {
    float sx = i == 0 ? -1.0 : 1.0;
    d = min(d, sdSeg(p, vec2(0.0, 0.52), vec2(sx * 0.12, 0.52 + 0.12 * b)) - 0.015);
    d = min(d, sdSeg(p, vec2(sx * 0.12, 0.52 + 0.12 * b), vec2(sx * 0.16, 0.66 + 0.06 * b)) - 0.013);
    d = min(d, sdSeg(p, vec2(0.0, 0.3), vec2(sx * (0.08 + 0.04 * b), 0.0)) - 0.02);
  }
  col = mix(col, vec3(0.15, 0.05, 0.2), fill(d, PX));
  col = mix(col, vec3(1.0, 0.2, 0.5), fill(sdBox(p - vec2(0.0, 0.62), vec2(0.06, 0.012), 0.004), PX));
  return mix(col, vec3(0.2, 1.0, 0.6), fill(sdBox(p - vec2(0.0, 0.4), vec2(0.045, 0.1), 0.02), PX));
}
// An octopus drifts, its arms curling.
vec3 chOcto(vec2 uv, float t) {
  vec3 col = mix(vec3(0.0, 0.1, 0.2), vec3(0.05, 0.3, 0.45), uv.y);
  col = mix(col, vec3(0.75, 0.6, 0.4), step(uv.y, 0.12 + 0.03 * sin(uv.x * 9.0)));
  vec2 p = (uv - vec2(0.5, 0.55 + 0.04 * sin(t))) * ASP;
  vec3 oc = vec3(0.85, 0.3, 0.4);
  for (int i = 0; i < 8; i++) {
    float fi = float(i), a = -PI * 0.5 + (fi - 3.5) * 0.28, d = 1e9;
    vec2 prev = vec2(cos(a), sin(a)) * 0.05 + vec2(0.0, -0.05);
    for (int j = 1; j <= 6; j++) {
      float u = float(j) / 6.0, aa = a + 0.5 * sin(t * 2.0 + fi + u * 3.0) * u;
      vec2 q = prev + vec2(cos(aa), sin(aa)) * 0.05;
      d = min(d, sdSeg(p, prev, q) - 0.025 * (1.0 - u * 0.8));
      prev = q;
    }
    col = mix(col, oc * 0.85, fill(d, PX));
  }
  col = mix(col, oc, fill(length((p - vec2(0.0, 0.06)) / vec2(1.0, 1.25)) - 0.12, PX));
  float eyes = min(length(p - vec2(-0.045, 0.02)), length(p - vec2(0.045, 0.02)));
  col = mix(col, vec3(1.0), fill(eyes - 0.022, PX));
  return mix(col, vec3(0.05), fill(eyes - 0.01, PX));
}
// A camel caravan crosses the dunes at sunset.
vec3 chCamels(vec2 uv, float t) {
  vec3 col = mix(vec3(1.0, 0.55, 0.25), vec3(0.6, 0.25, 0.45), uv.y);
  col = mix(col, vec3(1.0, 0.85, 0.5), fill(length((uv - vec2(0.7, 0.45)) * ASP) - 0.12, PX));
  col = mix(col, vec3(0.45, 0.2, 0.2), step(uv.y, 0.3 + 0.06 * sin(uv.x * 6.0 + 1.0)));
  for (int i = 0; i < 4; i++) {
    float fi = float(i), x = fract(t * 0.03 + fi * 0.12) * 1.4 - 0.2, gait = sin(t * 4.0 + fi);
    vec2 p = (uv - vec2(x, 0.3 + 0.06 * sin(x * 6.0 + 1.0))) * ASP;
    float d = min(length((p - vec2(0.0, 0.1)) / vec2(1.6, 1.0)) - 0.04, length(p - vec2(-0.01, 0.135)) - 0.025);
    d = min(d, min(sdSeg(p, vec2(0.05, 0.11), vec2(0.08, 0.16)) - 0.01, length((p - vec2(0.09, 0.16)) / vec2(1.6, 1.0)) - 0.015));
    for (int j = 0; j < 4; j++) {
      float lx = -0.045 + float(j) * 0.03;
      d = min(d, sdSeg(p, vec2(lx, 0.09), vec2(lx + 0.015 * gait * (mod(float(j), 2.0) * 2.0 - 1.0), 0.0)) - 0.006);
    }
    col = mix(col, vec3(0.2, 0.08, 0.12), fill(d, PX * 0.6));
  }
  return col;
}
// A ski jumper slides down the ramp and flies.
vec3 chSki(vec2 uv, float t) {
  vec3 col = mix(vec3(0.75, 0.85, 1.0), vec3(0.4, 0.6, 0.95), uv.y);
  col = mix(col, vec3(0.95, 0.97, 1.0), step(uv.y, max(0.8 - uv.x * 0.9, 0.15 + 0.1 * uv.x)));
  for (int i = 0; i < 5; i++) {
    float fi = float(i);
    vec2 q = uv - vec2(0.7 + fi * 0.06, 0.15 + 0.1 * (0.7 + fi * 0.06));
    col = mix(col, vec3(0.1, 0.35, 0.2), step(abs(q.x) * 3.0, 0.08 - q.y) * step(0.0, q.y));
  }
  float x = mod(t, 5.0) / 5.0 * 1.2;
  float y = x < 0.45 ? 0.8 - x * 0.9 : 0.395 + (x - 0.45) * 0.15 - (x - 0.45) * (x - 0.45) * 1.0;
  vec2 p = rot(-0.35) * ((uv - vec2(x, y + 0.02)) * ASP);
  float d = min(sdSeg(p, vec2(-0.05, -0.012), vec2(0.06, -0.012)) - 0.004, min(sdBox(p, vec2(0.04, 0.008), 0.006), length(p - vec2(0.045, 0.012)) - 0.01));
  return mix(col, vec3(0.9, 0.1, 0.2), fill(d, PX * 0.6));
}
// A candle on the sill; the flame leans and steadies.
vec3 chCandle(vec2 uv, float t) {
  vec2 p = (uv - vec2(0.5, 0.0)) * ASP;
  vec3 col = mix(vec3(0.05, 0.03, 0.03), vec3(0.15, 0.08, 0.05), uv.y) + vec3(1.0, 0.6, 0.25) * 0.25 * exp(-length(p - vec2(0.0, 0.55)) * 4.0);
  col = mix(col, vec3(0.92, 0.88, 0.8), fill(sdBox(p - vec2(0.0, 0.25), vec2(0.07, 0.22), 0.01), PX));
  col = mix(col, vec3(0.1), fill(sdSeg(p, vec2(0.0, 0.47), vec2(0.0, 0.5)) - 0.004, PX));
  float lean = 0.03 * sin(t * 1.3) + 0.01 * sin(t * 7.0);
  vec2 f = p - vec2(lean * 0.5, 0.56);
  f.x -= lean * (f.y + 0.06) * 2.0;
  col = mix(col, vec3(1.0, 0.75, 0.2), fill(length(f / vec2(0.6, 1.4)) - 0.04, PX));
  return mix(col, vec3(1.0, 0.98, 0.85), fill(length((f + vec2(0.0, 0.01)) / vec2(0.5, 1.1)) - 0.02, PX));
}
vec3 channel(int ch, vec2 uv, float t, float s, vec2 look) {
  if (ch == 0) return chBars(uv, t);
  if (ch == 1) return chBounce(uv, t, s);
  if (ch == 2) return chOcean(uv, t);
  if (ch == 3) return chHeart(uv, t);
  if (ch == 4) return chCube(uv, t);
  if (ch == 5) return chCard(uv, t);
  if (ch == 6) return chFish(uv, t, s);
  if (ch == 7) return chEye(uv, t, look, s);
  if (ch == 8) return chRadar(uv, t);
  if (ch == 9) return chLava(uv, t);
  if (ch == 10) return chTree(uv, t, s);
  // Later channels sit in two blocks, so most tiles skip most tests.
  if (ch < 30) {
    if (ch == 11) return chWeather(uv, t);
    if (ch == 12) return chClock(uv, t);
    if (ch == 13) return chCount(uv, t);
    if (ch == 14) return chStars(uv, t);
    if (ch == 15) return chPaddle(uv, t);
    if (ch == 16) return chEq(uv, t);
    if (ch == 17) return chScope(uv, t);
    if (ch == 18) return chKaleido(uv, t);
    if (ch == 19) return chPlasma(uv, t);
    if (ch == 20) return chRain(uv, t);
    if (ch == 21) return chFire(uv, t);
    if (ch == 22) return chJelly(uv, t);
    if (ch == 23) return chMoon(uv, t);
    if (ch == 24) return chPlanet(uv, t);
    if (ch == 25) return chTunnel(uv, t);
    if (ch == 26) return chSnake(uv, t);
    if (ch == 27) return chBlocks(uv, t);
    if (ch == 28) return chHills(uv, t);
    if (ch == 29) return chCity(uv, t);
  } else if (ch < 50) {
    if (ch == 30) return chRoad(uv, t);
    if (ch == 31) return chLight(uv, t);
    if (ch == 32) return chWorks(uv, t);
    if (ch == 33) return chMandala(uv, t);
    if (ch == 34) return chCat(uv, t, look);
    if (ch == 35) return chVinyl(uv, t);
    if (ch == 36) return chMetro(uv, t);
    if (ch == 37) return chWaves(uv, t);
    if (ch == 38) return chRoto(uv, t);
    if (ch == 39) return chHypno(uv, t);
    if (ch == 40) return chSunrise(uv, t);
    if (ch == 41) return chBubbles(uv, t);
    if (ch == 42) return chGlobe(uv, t);
    if (ch == 43) return chTraffic(uv, t);
    if (ch == 44) return chEcg(uv, t);
    if (ch == 45) return chNews(uv, t);
    if (ch == 46) return chLotto(uv, t);
    if (ch == 47) return chVolcano(uv, t);
    if (ch == 48) return chFly(uv, t);
    if (ch == 49) return chUfo(uv, t);
  } else if (ch < 70) {
    if (ch == 50) return chRaid(uv, t);
    if (ch == 51) return chBombers(uv, t);
    if (ch == 52) return chBarrage(uv, t);
    if (ch == 53) return chSearch(uv, t);
    if (ch == 54) return chFleet(uv, t);
    if (ch == 55) return chLate(uv, t);
    if (ch == 56) return chSteam(uv, t);
    if (ch == 57) return chSax(uv, t);
    if (ch == 58) return chHeels(uv, t);
    if (ch == 59) return chHall(uv, t);
    if (ch == 60) return chWoods(uv, t);
    if (ch == 61) return chTornado(uv, t);
    if (ch == 62) return chQuake(uv, t);
    if (ch == 63) return chWave(uv, t);
    if (ch == 64) return chCrash(uv, t);
    if (ch == 65) return chShades(uv, t);
    if (ch == 66) return chBuffer(uv, t);
    if (ch == 67) return chToys(uv, t);
    if (ch == 68) return chClaude(uv, t);
    if (ch == 69) return chSub(uv, t);
  } else if (ch < 100) {
    if (ch == 70) return chFruit(uv, t);
    if (ch == 71) return chDoor(uv, t);
    if (ch == 72) return chCar(uv, t);
    if (ch == 73) return chBanana(uv, t);
    if (ch == 74) return chBubbly(uv, t);
    if (ch == 75) return chFans(uv, t);
    if (ch == 76) return chSheets(uv, t);
    if (ch == 77) return chLips(uv, t);
    if (ch == 78) return chCensor(uv, t);
    if (ch == 79) return chLine(uv, t);
    if (ch == 80) return chPeep(uv, t);
    if (ch == 81) return chNuke(uv, t);
    if (ch == 82) return chVirus(uv, t);
    if (ch == 83) return chMalware(uv, t);
    if (ch == 84) return chEgg(uv, t);
    if (ch == 85) return chPitch(uv, t);
    if (ch == 86) return chTennis(uv, t);
    if (ch == 87) return chBowl(uv, t);
    if (ch == 88) return chDuck(uv, t);
    if (ch == 89) return chWhale(uv, t);
    if (ch == 90) return chRocket(uv, t);
    if (ch == 91) return chAurora(uv, t);
    if (ch == 92) return chDisco(uv, t);
    if (ch == 93) return chSlots(uv, t);
    if (ch == 94) return chHack(uv, t);
    if (ch == 95) return chAerobics(uv, t);
    if (ch == 96) return chOcto(uv, t);
    if (ch == 97) return chCamels(uv, t);
    if (ch == 98) return chSki(uv, t);
    if (ch == 99) return chCandle(uv, t);
  }
  return chSnow(uv, t);
}
`;

// Programme names, in channel order; the last is static.
export const NAMES = [
  "Colour bars", "Bounce", "Ocean", "Heart", "Cube", "Test card",
  "Fish", "Eye", "Radar", "Lava", "Tree", "Weather",
  "Clock", "Countdown", "Warp", "Paddles", "Equaliser", "Scope",
  "Kaleidoscope", "Plasma", "Rain", "Fireplace", "Jellyfish", "Moon",
  "Planet", "Tunnel", "Snake", "Blocks", "Snowy hills", "Skyline",
  "Highway", "Lighthouse", "Fireworks", "Mandala", "Cat", "Record",
  "Metronome", "Waves", "Checkers", "Spiral", "Sunrise", "Bubbles",
  "Globe", "Traffic light", "Heart monitor", "News", "Lottery", "Volcano",
  "Butterfly", "Saucer", "Night raid", "Bombers", "Barrage", "Searchlights",
  "Battleship", "Late film", "Steamy window", "Smooth jazz", "Teleshop", "Hallway",
  "Woods", "Tornado", "Earthquake", "Tsunami", "Crash", "Shades",
  "Buffering", "Adverts", "Claude", "Submarine", "Fruit bowl", "Do not disturb",
  "Lovers' lane", "Banana", "Bubbly", "Burlesque", "Under the covers", "Lips",
  "Art house", "Washing line", "Keyhole", "Test blast", "Virus", "Malware",
  "Cooking", "Football", "Tennis", "Bowling", "Rubber duck", "Whale",
  "Lift-off", "Aurora", "Disco", "Slots", "Terminal", "Aerobics",
  "Octopus", "Caravan", "Ski jump", "Candle", "Static",
];
export const NCH = NAMES.length;
export const SNOW = NCH - 1;

// Each channel's average colour tints the light on the tree.
export const CH_LIGHT = [
  [0.55,  0.5,  0.5], [0.2,  0.14,  0.42], [0.85,  0.5,  0.45], [0.6,  0.12,  0.3], [0.3,  0.12,  0.45], [0.55,  0.55,  0.6],
  [0.1,  0.45,  0.6], [0.9,  0.68,  0.64], [0.1,  0.38,  0.16], [0.75,  0.25,  0.2], [0.2,  0.1,  0.32], [0.3,  0.45,  0.35],
  [0.7,  0.7,  0.65], [0.45,  0.4,  0.35], [0.1,  0.1,  0.2], [0.1,  0.3,  0.15], [0.2,  0.4,  0.15], [0.05,  0.3,  0.15],
  [0.5,  0.3,  0.5], [0.5,  0.5,  0.5], [0.15,  0.2,  0.3], [0.8,  0.35,  0.08], [0.3,  0.15,  0.4], [0.2,  0.2,  0.2],
  [0.3,  0.2,  0.12], [0.1,  0.4,  0.6], [0.2,  0.3,  0.1], [0.35,  0.3,  0.4], [0.6,  0.65,  0.8], [0.2,  0.12,  0.25],
  [0.2,  0.1,  0.25], [0.15,  0.15,  0.25], [0.25,  0.2,  0.3], [0.6,  0.35,  0.3], [0.7,  0.55,  0.35], [0.25,  0.15,  0.3],
  [0.75,  0.65,  0.55], [0.25,  0.2,  0.35], [0.55,  0.15,  0.4], [0.5,  0.5,  0.5], [0.8,  0.6,  0.5], [0.05,  0.2,  0.35],
  [0.1,  0.3,  0.3], [0.2,  0.25,  0.2], [0.05,  0.2,  0.1], [0.2,  0.25,  0.5], [0.4,  0.25,  0.45], [0.35,  0.12,  0.06],
  [0.6,  0.8,  0.65], [0.15,  0.25,  0.2], [0.15,  0.45,  0.15], [0.6,  0.4,  0.3], [0.45,  0.42,  0.38], [0.15,  0.15,  0.22],
  [0.4,  0.45,  0.5], [0.7,  0.6,  0.45], [0.8,  0.5,  0.35], [0.35,  0.15,  0.4], [0.85,  0.7,  0.8], [0.3,  0.28,  0.25],
  [0.05,  0.06,  0.07], [0.3,  0.38,  0.25], [0.6,  0.58,  0.55], [0.55,  0.6,  0.65], [0.4,  0.08,  0.08], [0.6,  0.5,  0.25],
  [0.12,  0.15,  0.2], [0.3,  0.3,  0.4], [0.9,  0.75,  0.65], [0.05,  0.2,  0.3], [0.95,  0.7,  0.65], [0.5,  0.32,  0.28],
  [0.1,  0.1,  0.2], [0.4,  0.15,  0.2], [0.3,  0.12,  0.18], [0.85,  0.5,  0.32], [0.4,  0.22,  0.24], [0.4,  0.05,  0.12],
  [0.5,  0.3,  0.32], [0.8,  0.75,  0.75], [0.25,  0.14,  0.1], [0.7,  0.7,  0.7], [0.15,  0.25,  0.2], [0.2,  0.5,  0.5],
  [0.8,  0.8,  0.75], [0.2,  0.5,  0.22], [0.25,  0.5,  0.45], [0.4,  0.3,  0.25], [0.75,  0.85,  0.9], [0.5,  0.6,  0.75],
  [0.65,  0.6,  0.65], [0.1,  0.35,  0.3], [0.35,  0.2,  0.4], [0.7,  0.3,  0.3], [0.05,  0.3,  0.08], [0.75,  0.6,  0.8],
  [0.1,  0.25,  0.35], [0.75,  0.4,  0.35], [0.75,  0.82,  0.95], [0.35,  0.2,  0.1], [0.5,  0.5,  0.5],
];

// Each channel calls up the big picture closest to it.
// 0 eye, 1 sun, 2 spiral, 3 bars, 4 night raid, 5 heart.
export const BIG_OF = [3,  1,  1,  2,  2,  3,  2,  0,  2,  2,  2,  2,  3,  3,  2,  3,  3,  2,  2,  2,  2,  1,  2,  1,  1,  2,  3,  3,  1,  2,  2,  1,  2,  2,  0,  2,  3,  2,  2,  2,  1,  2,  2,  3,  3,  3,  2,  1,  1,  2,  4,  4,  4,  4,  4,  1,  1,  2,  3,  0,  0,  2,  3,  2,  3,  1,  3,  2,  1,  2,  5,  5,  5,  5,  5,  5,  5,  5,  5,  5,  5,  4,  2,  3,  1,  3,  3,  3,  1,  2,  2,  2,  2,  3,  3,  1,  2,  1,  2,  1];
