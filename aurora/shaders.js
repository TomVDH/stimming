// Fjord aurora shaders. Three small programs, so D3D11 links each fast.
// World: x east, y up, z north, in km. The camera looks north, level.
// A screen point maps to the ray (X, Y, 1); the horizon is Y = 0.
import { OUTPUT } from '../shared/output.js';

const HEAD = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 o;
`;

// Hashes and value noise, shared by the passes.
const NOISE = `
float h1(float n) { return fract(sin(n * 0.1031 + 7.13) * 43758.5453); }
float h2(vec2 p) { vec3 q = fract(p.xyx * 0.1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
float vn(float x) { float i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f); return mix(h1(i), h1(i + 1.0), f); }
float vn2(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h2(i), h2(i + vec2(1, 0)), f.x), mix(h2(i + vec2(0, 1)), h2(i + vec2(1, 1)), f.x), f.y);
}
// A square: pow() of a negative base is NaN on NVIDIA.
float sq(float x) { return x * x; }
float ign(vec2 p) { return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715)))); }
`;

/* ---------- pass 1: the aurora ---------- */
// Emission only, on the sky above the horizon, at reduced size.
// Each curtain is a thin vertical sheet that folds; a march crosses it.
// The sheet integral is exact per step, so thin sheets never flicker.
export const AURORA_FS = `${HEAD}
uniform float uTanW, uYTop, uT, uAct, uHem, uRed, uJit, uSteps;
uniform vec3 uZ0, uAmp, uGain, uYaw;
uniform vec4 uSurge;
uniform vec4 uGust[3];
${NOISE}
const float R = 6371.0;
// Field lines lean toward the viewer, so rays fan out upward.
const float TILT = 0.2;
const vec3 GREEN = vec3(0.10, 1.0, 0.36);
const vec3 RED = vec3(1.0, 0.07, 0.16);
const vec3 PINK = vec3(1.0, 0.2, 0.62);

// The sheet's north offset at east position x.
float fold(float x, float i, float A) {
  float t = uT, p = i * 17.3;
  // Each curtain folds at its own scale.
  x *= 1.0 + 0.45 * i;
  return A * ((1.6 - 0.5 * i) * sin(x * 0.0036 + t * 0.031 + p)
    + 0.62 * sin(x * 0.0154 - t * 0.17 + p * 1.7)
    + 0.34 * sin(x * 0.041 + t * 0.33 + p * 0.6)
    + 0.16 * sin(x * 0.097 - t * 0.71 + p));
}

// A curtain's own frame: x along the arc, y across it.
vec2 arc(vec2 p, float i) { float c = cos(uYaw[int(i)]), s = sin(uYaw[int(i)]); return vec2(c * p.x + s * p.y, -s * p.x + c * p.y); }
// The sheet's distance from a point, in km, across the arc.
float sheetS(vec2 q, float alt, float i) {
  return q.y - uZ0[int(i)] - fold(q.x, i, uAmp[int(i)]) + TILT * (alt - 100.0);
}

// Brightness along the arc: patches, the substorm surge and the gusts.
float along(float x, float i) {
  float b = 0.45 + 1.1 * vn(x * 0.0055 + uT * 0.04 + i * 3.1) * vn(x * 0.013 - uT * 0.06 + i * 8.0);
  float d = (x - uSurge.x) / uSurge.y;
  b += uSurge.z * (1.6 * exp(-d * d) + 0.55 * smoothstep(-0.5, 2.5, d));
  for (int k = 0; k < 3; k++) {
    vec4 g = uGust[k];
    float e = (abs(x - g.x) - g.y) / 70.0;
    b += g.z * (1.2 * exp(-e * e) + exp(-sq((x - g.x) / 90.0)));
  }
  return b;
}

// Colour by height: a pink hem, green, then faint red tops.
vec3 emit(float x, float alt, float i) {
  float base = 104.0 - 10.0 * uAct + 7.0 * (vn(x * 0.011 + i * 7.0) - 0.5);
  float hgt = alt - base;
  float sp = 0.35 + 1.6 * uAct;
  float r1 = vn(x * 0.12 + uT * 0.5 * sp + i * 31.0);
  float r2 = vn(x * 0.31 - uT * 1.2 * sp + i * 13.0);
  float ray = 0.55 + 0.9 * r1 * (0.4 + 0.8 * r2);
  float H = 12.0 + 38.0 * vn(x * 0.05 + i * 5.0 + uT * 0.1) + 14.0 * uAct;
  // The lower border is the brightest line of a curtain.
  float g = smoothstep(-2.0, 2.5, hgt) * exp(-max(hgt, 0.0) / H) * (1.0 + 1.3 * exp(-max(hgt, 0.0) / 5.0));
  float hem = exp(-sq((hgt + 2.0) / 2.4)) * uHem * (0.4 + 0.6 * vn(x * 0.02 - uT * 0.3 + i));
  float red = smoothstep(60.0, 140.0, hgt) * exp(-max(hgt - 140.0, 0.0) / 55.0) * smoothstep(300.0, 230.0, alt) * uRed;
  return along(x, i) * (GREEN * g * ray + PINK * hem * ray + RED * red * (0.55 + 0.45 * ray));
}

// tanh() of a large value is NaN on some GL drivers, so x clamps first.
float erfA(float x) { x = clamp(x, -3.0, 3.0); return tanh(1.2025 * x + 0.1 * x * x * x); }

void main() {
  vec3 d = vec3((vUv.x * 2.0 - 1.0) * uTanW, max(vUv.y * uYTop, 1e-4), 1.0);
  float hl = length(d.xz);
  vec2 h = d.xz / hl;
  float m = d.y / hl;
  float jit = ign(gl_FragCoord.xy + uJit * 5.588);
  // Horizontal range where the ray is 85 to 340 km up, on a round Earth.
  float rLo = R * (-m + sqrt(m * m + 170.0 / R));
  float rHi = R * (-m + sqrt(m * m + 640.0 / R));
  float pathK = sqrt(1.0 + m * m);
  vec3 acc = vec3(0.0);
  for (int c = 0; c < 3; c++) {
    float i = float(c);
    float A = uAmp[c], w = 2.6 + 1.5 * uAct;
    // The heading in the curtain's frame; hq is its pace across the arc.
    vec2 hc = arc(h, i);
    float hq = max(hc.y, 0.04);
    // The band the folds and the lean can reach.
    float r0 = max(rLo, (uZ0[c] - 2.8 * A - 55.0) / hq);
    float r1 = min(rHi, (uZ0[c] + 2.8 * A + 8.0) / hq);
    if (r1 <= r0 || uGain[c] <= 0.0) continue;
    float dr = (r1 - r0) / uSteps;
    float ra = r0 - dr * jit * 0.5;
    float alt = ra * m + ra * ra / (2.0 * R);
    float sa = sheetS(hc * ra, alt, i);
    for (float j = 0.0; j < 40.0; j++) {
      if (j >= uSteps) break;
      float rb = ra + dr;
      float altB = rb * m + rb * rb / (2.0 * R);
      float sb = sheetS(hc * rb, altB, i);
      // Skip a step that stays well clear of the sheet.
      if (min(abs(sa), abs(sb)) < 4.0 * w + 30.0 || sa * sb < 0.0) {
        float ds = sb - sa;
        float core = abs(ds) < 1e-3 ? exp(-sa * sa / (w * w)) * dr : dr * (erfA(sb / w) - erfA(sa / w)) / ds * w * 0.886;
        // A wide, faint skirt: the diffuse glow round each sheet.
        float W2 = 26.0;
        float skirt = abs(ds) < 1e-3 ? exp(-sa * sa / (W2 * W2)) * dr : dr * (erfA(sb / W2) - erfA(sa / W2)) / ds * W2 * 0.886;
        // The emission comes from where the ray crosses the sheet.
        float f = abs(ds) < 1e-3 ? 0.5 : clamp(-sa / ds, 0.0, 1.0);
        float rc = mix(ra, rb, f);
        float altC = rc * m + rc * rc / (2.0 * R);
        acc += emit(hc.x * rc, altC, i) * uGain[c] * (abs(core) + 0.05 * abs(skirt));
      }
      ra = rb; sa = sb;
    }
  }
  o = vec4(acc * pathK * 0.055, 1.0);
}`;

/* ---------- pass 2: the scene ---------- */
// Sky, stars, mountains and snow; below the horizon, the mirror.
export const SCENE_FS = `${HEAD}
uniform sampler2D uAur;
uniform float uTanW, uYTop, uHz, uAsp, uT, uTw, uPx, uAct, uRm;
uniform vec2 uMtn;
${NOISE}
const vec3 ZEN = vec3(0.0018, 0.0036, 0.013);
const vec3 HOR = vec3(0.009, 0.018, 0.036);

// Aurora light in a screen column, from a small mip: it lights snow and haze.
// The light rolls off, so a storm lights the snow without glare.
vec3 ambient(float u, float lod) { vec3 a = textureLod(uAur, vec2(u, 0.35), lod).rgb; return a / (1.0 + 2.5 * a); }

// A peak with concave flanks, as the Lofoten spires have.
float tent(float x, float c, float w, float h) { return h * pow(max(1.0 - abs(x - c) / w, 0.0), 1.7); }
float ridged(float x) {
  float s = 0.0, a = 0.5, f = 1.0;
  for (int k = 0; k < 5; k++) { s += a * (1.0 - abs(vn(x * f) * 2.0 - 1.0)); f *= 2.13; a *= 0.47; }
  return s;
}
// Ridge heights per layer, in screen-relative units (Y / tanW).
float ridgeL(float x) {
  float r = max(max(tent(x, -0.96, 0.42, 0.285), tent(x, -0.64, 0.36, 0.22)), max(tent(x, -0.38, 0.3, 0.12), tent(x, -0.18, 0.2, 0.035)));
  return r + 0.07 * (ridged(x * 9.0 + 3.0) - 0.45) * smoothstep(0.0, 0.08, r);
}
float ridgeR(float x) {
  float r = max(max(tent(x, 0.84, 0.36, 0.205), tent(x, 0.55, 0.3, 0.15)), max(tent(x, 1.08, 0.3, 0.17), tent(x, 0.33, 0.18, 0.045)));
  return r + 0.06 * (ridged(x * 8.0 + 11.0) - 0.45) * smoothstep(0.0, 0.07, r);
}
float ridgeF(float x) {
  float r = 0.016 + max(max(tent(x, -0.12, 0.28, 0.058), tent(x, 0.07, 0.22, 0.078)), tent(x, 0.27, 0.26, 0.05));
  return r + 0.025 * (ridged(x * 11.0 + 23.0) - 0.45);
}

// One mountain face. x, y in screen-relative units; top is the ridge height.
vec3 face(float x, float y, float top, float seed, float snowK, float haze, vec3 sky, vec3 amb) {
  float depth = top - y;
  // Gullies run down the fall line, so the noise stretches up and down.
  vec2 q = vec2(x * 70.0 + y * 25.0, y * 16.0) + seed;
  float n = vn2(q) * 0.5 + vn2(q * vec2(2.7, 1.4) + 4.1) * 0.32 + vn2(q * 6.1) * 0.18;
  // Broad snowfields first, then the gullies cut into them.
  float field = vn2(vec2(x * 9.0, y * 5.0) + seed * 0.3);
  float up = clamp(y / max(top, 0.02), 0.0, 1.0);
  float snow = smoothstep(0.46, 0.56, n * 0.7 + field * 0.45 + snowK + 0.25 * up - 0.27);
  // Upward faces catch the sky; the crest takes a backlit rim.
  float lift = 0.3 + 0.7 * smoothstep(0.0, 0.6, up) + 0.7 * exp(-depth / 0.003);
  vec3 light = amb * 0.9 + vec3(0.012, 0.017, 0.032);
  vec3 rock = vec3(0.0018, 0.002, 0.0028) + light * 0.03;
  vec3 c = mix(rock, light * vec3(0.85, 0.9, 1.0) * 0.95 * lift, snow * (0.75 + 0.25 * n));
  // The shore: a dark band of rock at the water line.
  c *= 0.35 + 0.65 * smoothstep(0.0, 0.012, y);
  return mix(c, sky, haze);
}

vec3 stars(vec3 d) {
  vec3 s = vec3(0.0);
  for (int k = 0; k < 2; k++) {
    float sc = k == 0 ? 70.0 : 190.0;
    vec3 p = d * sc, c = floor(p), f = fract(p);
    float r = h2(c.xy + c.z * 17.17 + float(k) * 3.7);
    float keep = k == 0 ? 0.09 : 0.05;
    if (r > keep) continue;
    vec3 off = vec3(h2(c.yz + 1.3), h2(c.zx + 5.1), h2(c.xy + 9.7)) * 0.6 + 0.2;
    float dpx = length(f - off) / sc / uPx;
    float mag = pow(h2(c.zy + 2.9), 5.0) * (k == 0 ? 2.6 : 0.9) + 0.05;
    float tw = 1.0 - uRm * 0.35 * (0.5 + 0.5 * sin(uTw * (3.0 + 4.0 * r * 30.0) + r * 400.0));
    float t = h2(c.xz + 4.4);
    vec3 tint = mix(vec3(0.75, 0.85, 1.0), vec3(1.0, 0.85, 0.65), t * t);
    s += tint * mag * tw * exp(-dpx * dpx / 0.55) * 0.55;
  }
  return s;
}

// Everything above the water at a direction (X, Y), Y >= 0.
vec3 world(float X, float Y, float u, float blur) {
  float y = max(Y, 0.0);
  vec3 amb = ambient(u, 6.0);
  float e = y / sqrt(1.0 + X * X);
  vec3 sky = mix(HOR, ZEN, smoothstep(0.0, 0.75, e));
  // The airglow: a faint green band low in the sky.
  sky += vec3(0.0018, 0.0062, 0.0028) * exp(-sq((e - 0.13) / 0.075));
  // Aurora light scatters in the low air.
  sky += amb * 0.18 * exp(-e / 0.14);
  vec3 col = sky;
  col += stars(normalize(vec3(X, y, 1.0))) * smoothstep(0.0, 0.1, e);
  vec3 a = textureLod(uAur, vec2(u, y / uYTop), blur).rgb;
  col += a * (0.55 + 0.45 * smoothstep(0.0, 0.12, e));
  // Mountains, front to back.
  // uMtn scales the range across and up for a portrait stage.
  float xs = X / (uTanW * uMtn.x), ys = y / (uTanW * uMtn.y);
  vec3 hzSky = HOR + amb * 0.18;
  float l = ridgeL(xs);
  if (ys < l) return face(xs, ys, l, 0.0, 0.0, 0.06, hzSky, amb);
  float r = ridgeR(xs);
  if (ys < r) return face(xs, ys, r, 41.0, 0.04, 0.12, hzSky, amb);
  float f = ridgeF(xs);
  if (ys < f) return face(xs, ys, f, 87.0, 0.22, 0.38, hzSky, amb);
  return col;
}

// The swell's slope at a water point, in camera heights.
vec2 swell(vec2 p) {
  vec2 g = vec2(0.0);
  g += vec2(0.15, 1.0) * 0.6 * cos(p.y * 0.55 + p.x * 0.08 + uT * 0.7);
  g += vec2(-0.4, 1.0) * 0.35 * cos(p.y * 1.3 - p.x * 0.5 + uT * 1.1);
  g += vec2(0.7, 0.7) * 0.18 * cos(p.y * 2.9 + p.x * 2.1 + uT * 1.7);
  return g * 0.006;
}

void main() {
  float X = (vUv.x * 2.0 - 1.0) * uTanW;
  float Y = (vUv.y - uHz) * 2.0 * uTanW / uAsp;
  vec3 col;
  if (Y >= 0.0) {
    col = world(X, Y, vUv.x, 0.0);
  } else {
    float dist = 1.0 / max(-Y, 1e-4);
    vec2 sl = swell(vec2(X * dist, dist)) * exp(-dist / 30.0);
    float Yr = max(-Y + 2.0 * sl.y, 0.0);
    float Xr = X + 2.0 * sl.x;
    float sinE = -Y / length(vec3(X, Y, 1.0));
    float F = 0.02 + 0.98 * pow(1.0 - sinE, 5.0);
    col = world(Xr, Yr, Xr / uTanW * 0.5 + 0.5, 0.6) * F;
    col += vec3(0.0006, 0.0009, 0.0016) * (1.0 - F);
  }
  o = vec4(col, 1.0);
}`;

/* ---------- pass 3: bloom in, the film curve out ---------- */
export const FINAL_FS = `${HEAD}
uniform sampler2D uHdr, uBloom;
uniform float uFrame, uBloomK, uExpo, uAsp;
${OUTPUT}
float gh(vec2 p) { uvec2 q = uvec2(p); uint n = (q.x * 1597334677u) ^ (q.y * 3812015801u); n *= 1597334677u; n ^= n >> 16; return float(n) / 4294967295.0; }
void main() {
  vec3 c = texture(uHdr, vUv).rgb + texture(uBloom, vUv).rgb * uBloomK;
  vec2 q = (vUv - 0.5) * vec2(uAsp, 1.0);
  c *= 1.0 - 0.45 * smoothstep(0.35, 1.15, length(q));
  float g = gh(gl_FragCoord.xy + vec2(uFrame * 37.0, uFrame * 91.0)) - 0.5;
  c *= 1.0 + g * 0.06;
  o = vec4(ouFilm(c, uExpo, gl_FragCoord.xy), 1.0);
}`;
