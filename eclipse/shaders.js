// Desert eclipse shaders. Four small programs, so D3D11 links each fast.
// World: x east of the view, z ahead, y up; km.
// A screen point maps to the ray (X, Y, 1); the horizon is Y = 0.
// The umbra is a disc of radius RU on the ground and in the air.
import { OUTPUT } from '../shared/output.js';

const HEAD = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 o;
`;

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
`;

// The penumbra: the sun's visible share at a distance from the umbra's centre.
const SHADE = `
uniform vec3 uUmb;
uniform float uK;
const float PI = 3.14159265;
// The share of a unit disc left by a disc of radius k at distance d.
float visible(float d, float k) {
  if (d >= 1.0 + k) return 1.0;
  if (d <= k - 1.0) return 0.0;
  float a = acos(clamp((d * d + 1.0 - k * k) / (2.0 * d), -1.0, 1.0));
  float b = acos(clamp((d * d + k * k - 1.0) / (2.0 * d * k), -1.0, 1.0));
  float s = sqrt(max(0.0, (-d + 1.0 + k) * (d + 1.0 - k) * (d - 1.0 + k) * (d + 1.0 + k)));
  return 1.0 - (a + k * k * b - 0.5 * s) / PI;
}
// Local sunlight at a ground point p, in km from the viewer.
// lean: how far the umbra column has shifted toward the sun at this height.
float flocal(vec2 p, vec2 lean) {
  float r = length(p - uUmb.xy - lean);
  return visible(r / uUmb.z * (uK - 1.0), uK);
}
`;

/* ---------- pass 1: the sky, the stars and the mesas ---------- */
export const SKY_FS = `${HEAD}
uniform float uTanW, uHz, uAsp, uPx, uT, uStars, uAmb, uRm, uGlow;
// Where the light comes from: the crescent's centre.
uniform vec3 uLightDir;
// The sun's bearing over the tangent of its height.
uniform vec2 uLean;
uniform vec3 uSunDir;
uniform vec4 uStar[24];
${NOISE}
${SHADE}
// Extinction per km; blue fades first, so far light turns orange.
const vec3 EXT = vec3(0.0042, 0.0085, 0.019);

// Sky light along a ray, with the umbra cut out of the lit air.
// el: the tangent of elevation. tmax: where the ray stops, in km.
vec3 air(vec2 h, float el, float tmax, out float litN) {
  float L = 1.0 / (max(el, 0.0) / 3.5 + 1.0 / 95.0);
  vec3 num = vec3(0), den = vec3(0);
  float cap = 1.0 - exp(-tmax / L);
  for (int i = 0; i < 8; i++) {
    float s = -L * log(1.0 - cap * (float(i) + 0.5) / 8.0);
    // The umbra leans toward the sun as it rises through the air.
    float f = flocal(h * s, uLean * s * el);
    vec3 tr = exp(-s * EXT);
    // In the dark the eye lifts the far lit air: the glow.
    num += f * tr * (1.0 + uGlow * step(1e-4, f) * vec3(1.4, 0.62, 0.24)); den += tr;
    if (i == 0) litN = f;
  }
  return num / den;
}

vec3 daySky(vec3 dir, float el) {
  vec3 zen = vec3(0.025, 0.075, 0.34), hor = vec3(0.36, 0.48, 0.68);
  vec3 c = mix(hor, zen, pow(clamp(el * 2.4, 0.0, 1.0), 0.5));
  float cs = dot(dir, uLightDir);
  // The aureole: bright air around the visible sun.
  c += vec3(1.0, 0.9, 0.74) * (exp((cs - 1.0) * 6000.0) * 1.2 + exp((cs - 1.0) * 400.0) * 0.22 + exp((cs - 1.0) * 25.0) * 0.07);
  return c;
}

// The mesa line: three layers; each returns its top's elevation tangent.
const vec3 MD = vec3(9.0, 22.0, 46.0);
const vec3 MH = vec3(0.2, 0.52, 0.86);
float mesa(float X, int i) {
  float D = MD[i], x = X * D / (1.4 + 0.9 * float(i)) + float(i) * 31.7;
  float n = vn(x * 0.9) * 0.7 + vn(x * 2.3 + 4.0) * 0.3;
  // Flat tops with steep cliffs and a talus apron.
  float top = smoothstep(0.67, 0.695, n) * (0.75 + 0.25 * vn(x * 0.37 + 9.0)) * (0.96 + 0.04 * vn(x * 7.0));
  float apron = smoothstep(0.44, 0.695, n) * 0.3;
  float h = MH[i] * max(top, apron) - D * D / 12742.0;
  return h / D;
}

void main() {
  float X = (vUv.x * 2.0 - 1.0) * uTanW;
  float Y = (vUv.y - uHz) * 2.0 * uTanW / uAsp;
  vec3 dir = normalize(vec3(X, Y, 1.0));
  float hl = length(vec2(X, 1.0));
  vec2 h = vec2(X, 1.0) / hl;
  float el = Y / hl;
  float litN;
  vec3 lit = air(h, max(el, 0.0), 1e4, litN);
  vec3 sky = daySky(dir, max(el, 0.0)) * lit;
  // Light scattered many times, so the zenith is never black.
  sky += uAmb * vec3(0.1, 0.16, 0.42) * (1.0 - 0.5 * clamp(el * 2.0, 0.0, 1.0));

  // Stars and planets: x, y in view tangents, brightness, size.
  vec3 st = vec3(0);
  for (int i = 0; i < 24; i++) {
    vec4 s = uStar[i];
    vec2 d = (vec2(X, Y) - s.xy) / uPx;
    float tw = 1.0 + uRm * 0.25 * sin(uT * (3.0 + float(i)) + float(i) * 2.1) * step(s.w, 1.2);
    st += s.z * tw * exp(-dot(d, d) / (2.0 * s.w * s.w)) * mix(vec3(0.85, 0.9, 1.0), vec3(1.0, 0.92, 0.8), step(1.2, s.w));
  }
  sky += st * uStars;

  // The mesas, nearest first, in haze lit by the air before them.
  for (int i = 0; i < 3; i++) {
    float m = mesa(X, i);
    if (Y < m) {
      float D = MD[i] * hl;
      float ln;
      vec3 haze = air(h, 0.0, D, ln);
      float tr = exp(-D / 70.0);
      vec3 hor = daySky(normalize(vec3(X, 0.002, 1.0)), 0.002);
      // Backlit rock: only sky light reaches the faces we see.
      vec3 rock = vec3(0.3, 0.17, 0.12) * (0.16 * flocal(h * D, vec2(0)) + uAmb * 0.4);
      sky = rock * tr + hor * haze * (1.0 - tr) * 1.05 + uAmb * vec3(0.1, 0.16, 0.42) * (1.0 - tr) * 0.6;
      break;
    }
  }
  o = vec4(sky, 1.0);
}`;

/* ---------- pass 2: the salt pan, and the sky copied above it ---------- */
export const GROUND_FS = `${HEAD}
uniform sampler2D uSky;
uniform float uTanW, uHz, uAsp, uT, uF, uHeat, uBands, uAmb, uRm;
uniform vec2 uBandDir;
uniform vec3 uSunDir;
${NOISE}
${SHADE}
// Eye height, in km.
const float EYE = 0.0017;

// The salt crust: polygon ridges, a cell's distance to its edge, in m.
float ridge(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  float d1 = 9.0, d2 = 9.0;
  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
    vec2 g = vec2(x, y), c = g + 0.15 + 0.7 * vec2(h2(i + g), h2(i + g + 17.0)) - f;
    float d = dot(c, c);
    if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) d2 = d;
  }
  return sqrt(d2) - sqrt(d1);
}

void main() {
  float X = (vUv.x * 2.0 - 1.0) * uTanW;
  float Y = (vUv.y - uHz) * 2.0 * uTanW / uAsp;
  if (Y >= 0.0) { o = texture(uSky, vUv); return; }
  float yHz = uHz + 0.0015;
  vec3 hor = texture(uSky, vec2(vUv.x, yHz)).rgb;
  float t = EYE / -Y;
  vec2 p = vec2(X, 1.0) * t;
  vec2 pm = p * 1000.0;
  vec3 dir = normalize(vec3(X, Y, 1.0));

  // Sunlight on this patch: the umbra edge sweeps across the pan.
  float r = length(p - uUmb.xy);
  float Fg = smoothstep(uUmb.z - 0.25, uUmb.z + 0.25, r) * max(uF, flocal(p, vec2(0)));

  // Shadow bands: two sets of waves, a hand's width apart, racing.
  vec2 bd = uBandDir, bn = vec2(-bd.y, bd.x);
  float w1 = sin(dot(pm, bd) * 5.2 - uT * 9.0 + 2.2 * vn2(pm * 0.35 + uT * 0.4));
  float w2 = sin(dot(pm, normalize(bd + 0.35 * bn)) * 3.7 - uT * 7.0 + 1.5 * vn2(pm * 0.21 - uT * 0.3));
  float aa = clamp(1.0 - length(fwidth(pm)) * 1.2, 0.0, 1.0);
  float bands = 1.0 + uBands * aa * (0.55 * w1 + 0.35 * w2);

  // The crust, its polygon ridges fading out with distance.
  float e = ridge(pm / 1.7);
  float fw = length(fwidth(pm / 1.7));
  float rid = (1.0 - smoothstep(0.0, 0.05 + fw, e)) * clamp(1.0 - fw * 3.0, 0.0, 1.0);
  vec3 alb = vec3(0.8, 0.76, 0.7) * (0.94 + 0.06 * vn2(pm * 0.05)) * (1.0 - 0.28 * rid);
  float sunUp = uSunDir.y;
  vec3 direct = vec3(1.0, 0.94, 0.84) * Fg * sunUp * 1.15 * bands;
  vec3 sky = vec3(0.32, 0.42, 0.62) * (0.4 * Fg + 0.0) + uAmb * vec3(0.12, 0.17, 0.4) * 1.4;
  // Fill from the low sky all round: a wide average, so no column stands out.
  vec3 fill = vec3(0);
  for (int i = 0; i < 5; i++) fill += texture(uSky, vec2(0.5 + (float(i) - 2.0) * 0.2, uHz + 0.03)).rgb;
  vec3 col = alb * (direct + sky + fill * 0.032);
  // The crust shines at a low angle; it holds the horizon's light.
  vec3 refl = texture(uSky, vec2(vUv.x, uHz - Y * uAsp / (2.0 * uTanW))).rgb;
  col += refl * (0.03 + 0.3 * pow(1.0 + dir.y, 24.0));
  // Glare: the crust shines toward the sun at a low angle.
  vec3 rf = reflect(dir, vec3(0, 1, 0));
  float g = dot(rf, uSunDir);
  float rough = mix(40.0, 160.0, smoothstep(0.02, 0.6, t));
  col += vec3(1.0, 0.9, 0.75) * Fg * bands * (exp((g - 1.0) * rough) * 1.4 + exp((g - 1.0) * 12.0) * 0.18) * (0.6 + 0.4 * rid);

  // Haze toward the horizon.
  float tr = exp(-t / 9.0);
  col = mix(hor, col, tr);

  // A mirage: hot air above the pan mirrors the sky at the horizon.
  float mir = uHeat * 0.0075 * uTanW;
  float k = smoothstep(-mir, -mir * 0.15, Y) * step(0.0005, uHeat);
  if (k > 0.0) {
    float wob = uRm * (vn(X * 900.0 + uT * 2.2) - 0.5) * 0.0011 + uRm * (vn(X * 250.0 - uT * 0.8) - 0.5) * 0.0018;
    float yr = uHz + (-Y * 1.4 + wob) * uAsp / (2.0 * uTanW);
    vec3 m = texture(uSky, vec2(vUv.x + uRm * (vn(Y * 4000.0 + uT * 3.0) - 0.5) * 0.0012, yr)).rgb;
    col = mix(col, m * 0.92, k * 0.85);
  }
  o = vec4(col, 1.0);
}`;

/* ---------- pass 3: the sun, the moon and the corona ---------- */
// Drawn into a box round the sun, blended over the sky.
// Output: emission in rgb; alpha is the moon's faint hint.
export const SUN_FS = `${HEAD}
uniform vec2 uView;
uniform float uTanW, uHz, uAsp, uPx, uRs, uK, uT, uSunI, uCor, uChr, uHint;
uniform vec2 uS, uD;
${NOISE}
const float PI = 3.14159265;
float valley(float a) {
  float s = sin(7.0 * a + 0.2) * 0.35 + sin(13.0 * a + 1.3) * 0.5 + sin(29.0 * a + 0.4) * 0.3
    + sin(47.0 * a + 2.1) * 0.2 + sin(83.0 * a + 5.0) * 0.15;
  float v = clamp(0.5 + 0.38 * s, 0.0, 1.0);
  return v * v * v;
}
// Streamers: bright lobes by angle, narrower farther out.
// The solar equator tilts 0.26 rad; most streamers lie near it.
const float EQ = 0.26;
float lobe(float a, float c, float w) { return exp(-sq(sin((a - c) * 0.5)) / (w * w)); }
float streamers(float a, float r) {
  float w = 0.21 / (0.45 + 0.55 * r);
  float s = lobe(a, EQ - 0.12, w) + 0.85 * lobe(a, EQ + 0.42, w * 0.8);
  s += 0.95 * lobe(a, EQ + 3.2, w * 1.1) + 0.6 * lobe(a, EQ + 2.75, w * 0.7);
  s += 0.35 * lobe(a, EQ + 1.95, w * 0.6) + 0.3 * lobe(a, EQ - 1.25, w * 0.6);
  return s;
}

void main() {
  vec2 frag = gl_FragCoord.xy;
  float X = (frag.x / uView.x * 2.0 - 1.0) * uTanW;
  float Y = (frag.y / uView.y - uHz) * 2.0 * uTanW / uAsp;
  vec2 q = (vec2(X, Y) - uS) / uRs;
  float r = length(q);
  float ang = atan(q.y, q.x);
  vec2 qm = q - uD;
  float rm = length(qm);
  float am = atan(qm.y, qm.x);
  float lr = uK * (1.0 - 0.022 * valley(am));
  // Antialias over one pixel, in sun radii.
  float px = uPx / uRs;
  float out_ = smoothstep(lr - px * 0.5, lr + px * 0.5, rm);
  vec3 e = vec3(0);

  // The photosphere, darker and redder at the limb.
  float mu = sqrt(max(0.0, 1.0 - r * r));
  float disc = 1.0 - smoothstep(1.0 - px * 0.6, 1.0 + px * 0.6, r);
  e += uSunI * disc * vec3(1.0, 0.86, 0.66) * (0.4 + 0.6 * mu) * mix(vec3(1.0, 0.82, 0.62), vec3(1.0), mu);

  // The chromosphere: a thin pink rim, and prominences.
  float chr = exp(-max(0.0, r - 1.0) / 0.006) * step(1.0 - px, r);
  float pa = 0.0;
  for (int i = 0; i < 5; i++) {
    float fi = float(i);
    float c = 0.6 + fi * 1.31 + 0.4 * sin(fi * 3.7);
    float da = abs(atan(sin(ang - c), cos(ang - c)));
    // Drawn tall, as the sun is: they must clear the larger moon.
    float hgt = 0.17 + 0.1 * h1(fi * 5.1);
    float wid = 0.08 + 0.08 * h1(fi * 2.3);
    float f = vn(ang * 60.0 + fi * 9.0 + uT * 0.05) * 0.3 + 0.7;
    // A flame: wide at its foot, thin and faint at its top.
    float up = clamp((r - 1.0) / (hgt * f), 0.0, 1.0);
    pa += smoothstep(wid * (1.0 - 0.6 * up), 0.0, da) * (1.0 - up) * step(1.0, r);
  }
  e += vec3(1.0, 0.18, 0.36) * (chr * 6.0 * uChr + pa * 4.5) * uCor * 4.0;

  // The corona: K light falling off steeply, with streamers and fine rays.
  if (r > 1.0) {
    float x = r - 1.0;
    // Fine filaments run out along the field, bending a little.
    float bend = 0.02 * sin(r * 1.7 + ang * 3.0);
    // The fine layer fades outward, where its period nears a pixel.
    float fine = 1.0 - smoothstep(1.4, 2.6, r);
    float fil = vn((ang + bend) * 26.0 + 3.0) * 0.6 + (vn((ang + bend) * 70.0 + uT * 0.03) - 0.5) * 0.4 * fine + 0.2;
    float inner = 1.5 * exp(-x / 0.045) + 0.55 * exp(-x / 0.2);
    float s = streamers(ang + bend * 0.5, r);
    // Polar plumes: short, fine rays at the poles.
    float plume = exp(-sq(cos(ang - EQ)) * 9.0) * (0.5 + 0.5 * vn(ang * 90.0)) * exp(-x * 1.5);
    float body = 0.28 * pow(r, -3.6) * (0.5 + 0.8 * fil) + 0.5 * pow(r, -1.8) * s * (0.5 + 0.8 * fil) + 0.3 * plume;
    float c = inner * (0.7 + 0.45 * fil) + body * smoothstep(4.4, 2.0, r);
    e += vec3(0.95, 0.95, 1.0) * mix(vec3(1.0, 0.95, 0.88), vec3(0.88, 0.94, 1.0), smoothstep(1.0, 2.5, r)) * c * uCor;
  }
  e *= out_;
  // The moon: dark, with a faint sky hint so the hand can find it.
  float inMoon = 1.0 - out_;
  o = vec4(e, inMoon * uHint);
}`;

/* ---------- pass 4: bloom, the flare, the grade ---------- */
export const FINAL_FS = `${HEAD}
uniform sampler2D uHdr, uBloom;
uniform float uBloomK, uExpo, uAsp, uFrame, uCool, uFlare, uRing;
uniform vec2 uSrc;
// The moon on screen: centre in uv, radius in screen heights; and its darkness.
uniform vec4 uMoon;
${OUTPUT}
float hash(vec2 p) { vec3 q = fract(p.xyx * 0.1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
// Ghosts: place on the line, radius, colour.
const float GK[3] = float[3](-0.45, -0.9, 0.35);
const float GR[3] = float[3](0.05, 0.11, 0.025);
const vec3 GC[3] = vec3[3](vec3(1.0, 0.55, 0.25), vec3(0.4, 0.75, 1.0), vec3(1.0, 0.8, 0.4));
void main() {
  vec2 a = vec2(uAsp, 1.0);
  // Glare spills less over the dark moon, so its disc stays black.
  float onMoon = (1.0 - smoothstep(uMoon.z * 0.85, uMoon.z * 1.02, length((vUv - uMoon.xy) * a))) * uMoon.w;
  vec3 c = texture(uHdr, vUv).rgb + texture(uBloom, vUv).rgb * uBloomK * (1.0 - 0.75 * onMoon);
  // The flare, in screen units with x scaled to the aspect.
  vec2 d = (vUv - uSrc) * a;
  float r = length(d);
  vec3 f = vec3(0);
  // Haze veil and soft orb.
  f += vec3(1.0, 0.86, 0.7) * (exp(-r * 9.0) * 0.06 + exp(-r * 40.0) * 0.2);
  // The streak, in three bands.
  float sy = abs(d.y);
  f += vec3(0.55, 0.7, 1.0) * exp(-sy * 900.0) * exp(-abs(d.x) * 7.0) * 0.3;
  f += vec3(0.7, 0.8, 1.0) * exp(-sy * 260.0) * exp(-abs(d.x) * 10.0) * 0.12;
  f += vec3(1.0, 0.85, 0.7) * exp(-sy * 70.0) * exp(-abs(d.x) * 7.0) * 0.1;
  // Ghosts on the line through the frame centre.
  for (int i = 0; i < 3; i++) {
    vec2 g = (vUv - (0.5 + (uSrc - 0.5) * GK[i])) * a;
    f += GC[i] * smoothstep(GR[i], GR[i] * 0.7, length(g)) * 0.05;
  }
  c += f * uFlare;
  // The diamond ring: a star of spikes round the last bead.
  float ang = atan(d.y, d.x);
  float spikes = pow(abs(cos(ang * 3.0 + 0.3)), 80.0) + pow(abs(cos(ang * 4.0 + 0.9)), 160.0) * 0.5;
  c += vec3(1.0, 0.97, 0.92) * uRing * (exp(-r * 320.0) * 10.0 + exp(-r * 70.0) * 1.6 + exp(-r * 22.0) * 0.06 * (1.0 - 0.8 * onMoon) + spikes * exp(-r * 22.0) * 0.5);
  // The cold: the grade loses warmth as the light goes.
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  c = mix(c, mix(vec3(l), c, 0.8) * vec3(0.86, 0.95, 1.14), uCool);
  vec3 col = ouAcesFit(c * uExpo / 0.6);
  // Vignette and grain.
  vec2 v = (vUv - 0.5) * a;
  col *= 1.0 - 0.22 * dot(v, v);
  col = ouSrgb(col);
  col += (hash(gl_FragCoord.xy + uFrame * 17.0) - 0.5) * 0.022;
  o = vec4(ouDither(col, gl_FragCoord.xy), 1.0);
}`;
