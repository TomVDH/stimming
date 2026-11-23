// Solar loop renderer: raw WebGL2, graded like film.
// Two light channels: red holds hot plasma, green holds cool plasma.
// Passes: the disk and corona, the strands (additive, optically thin), bloom, light rays, the final.
// The final pass bends the air at the limb, grades through the band's ramps and adds the lens.
import { TRI_VS, program, linked, target, free, bind, tri, to } from '../shared/gl.js';
import { bloomChain } from '../shared/glow.js';
import { R, STRIDE, MAX_STRANDS } from './sun.js';

const HEAD = `#version 300 es
precision highp float;
`;
const NR = 5;
// Samples along each strand.
const NS = 56;
// Steps in the light ray march.
const RAY_N = 40;

/* ---------- colour ramps: two per band, hot then cool ---------- */
// Each stop is an sRGB colour and its place on the tone axis.
const LUTS = [
  // Gold: warm black, ember, amber, gold, white.
  [['000000', 0], ['0c0503', 0.08], ['2e1004', 0.22], ['7a2f06', 0.4], ['cf6a0c', 0.58], ['ffa22c', 0.74], ['ffd47a', 0.87], ['fff3d6', 0.96], ['ffffff', 1]],
  [['000000', 0], ['140402', 0.1], ['4a0e03', 0.28], ['a8300a', 0.48], ['f2661a', 0.66], ['ffa04a', 0.8], ['ffd9a8', 0.92], ['fff8f0', 1]],
  // Teal: cold steel, with sand for the cool plasma.
  [['000000', 0], ['030607', 0.1], ['0b1a1e', 0.26], ['24484f', 0.44], ['5e8c8f', 0.62], ['a6c4c0', 0.78], ['dfeae4', 0.9], ['fbfcf8', 1]],
  [['000000', 0], ['0d0805', 0.12], ['33200f', 0.3], ['7a5430', 0.5], ['c29a68', 0.68], ['e9d4aa', 0.84], ['fffaf0', 1]],
  // Red: crimson to a pink white.
  [['000000', 0], ['120201', 0.1], ['3e0703', 0.26], ['8c1406', 0.44], ['d8320c', 0.62], ['ff7134', 0.78], ['ffb995', 0.9], ['fff0e8', 1]],
  [['000000', 0], ['160104', 0.1], ['4c0410', 0.3], ['a00c1c', 0.5], ['e8302a', 0.68], ['ff7a62', 0.82], ['ffc8bc', 0.93], ['fff2ee', 1]],
];
const LUT_W = 256;
function lutPixels() {
  const px = new Uint8Array(LUT_W * LUTS.length * 4);
  LUTS.forEach((stops, row) => {
    const rgb = stops.map(([h, at]) => [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16), at]);
    for (let i = 0; i < LUT_W; i++) {
      const x = i / (LUT_W - 1);
      let k = 1;
      while (k < rgb.length - 1 && rgb[k][3] < x) k++;
      const a = rgb[k - 1], b = rgb[k];
      let t = (x - a[3]) / Math.max(1e-6, b[3] - a[3]);
      // Smooth steps between stops: no kinks in the gradient.
      t = t * t * (3 - 2 * t);
      const o = (row * LUT_W + i) * 4;
      for (let c = 0; c < 3; c++) px[o + c] = Math.round(a[c] + (b[c] - a[c]) * t);
      px[o + 3] = 255;
    }
  });
  return px;
}

const NOISE = `
float h13(vec3 p) { p = fract(p * 0.1031); p += dot(p, p.zyx + 31.32); return fract((p.x + p.y) * p.z); }
float vn(vec3 p) {
  vec3 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(h13(i), h13(i + vec3(1, 0, 0)), f.x), mix(h13(i + vec3(0, 1, 0)), h13(i + vec3(1, 1, 0)), f.x), f.y),
             mix(mix(h13(i + vec3(0, 0, 1)), h13(i + vec3(1, 0, 1)), f.x), mix(h13(i + vec3(0, 1, 1)), h13(i + vec3(1, 1, 1)), f.x), f.y), f.z);
}
float fbm(vec3 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { s += a * vn(p); p = p * 2.03 + 7.1; a *= 0.5; } return s; }
// Cell edges: 0 on the lanes between cells.
float cells(vec3 p) {
  vec3 i = floor(p), f = fract(p);
  float d1 = 9.0, d2 = 9.0;
  for (int z = -1; z <= 1; z++) for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
    vec3 g = vec3(x, y, z);
    vec3 o = vec3(h13(i + g), h13(i + g + 17.3), h13(i + g + 41.9));
    float d = length(g + o - f);
    if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) d2 = d;
  }
  return d2 - d1;
}
`;

/* ---------- the disk and the corona ---------- */
const SKY = `${HEAD}
uniform vec4 uView;
uniform mat3 uToSun;
uniform float uTime;
uniform vec4 uDisk, uDisk2;
uniform vec4 uReg[${NR}];
uniform vec4 uFl[2], uFlW[2], uFlB[2];
in vec2 vUv;
out vec4 o;
const float R = ${R.toFixed(1)};
${NOISE}
void main() {
  vec2 P = uView.xy + (vUv * 2.0 - 1.0) * uView.zw;
  float r = length(P);
  float hot = 0.0, cool = 0.0;
  float ang = atan(P.x, P.y);
  float tb = uTime * 0.02;
  if (r < R) {
    float mu = sqrt(max(1.0 - r * r / (R * R), 0.0));
    vec3 n = vec3(P / R, mu);
    vec3 q = uToSun * n;
    // Granules boil: bright cells, dark lanes, drifting through time.
    float gran = smoothstep(0.0, 0.4, cells(q * 170.0 + vec3(0.0, 0.0, tb * 2.0)));
    // Swirls of plasma: noise bent by noise, slowly turning.
    vec3 wq = q * 26.0;
    vec3 warp = vec3(fbm(wq + tb * 0.1), fbm(wq + 5.1), fbm(wq + 9.3));
    float turb = fbm(q * 16.0 + warp * 1.7 + vec3(0.0, 0.0, tb * 0.25));
    // The supergranule network, warped so it never reads as tiles.
    vec3 w = q * 22.0 + 0.8 * vec3(vn(q * 9.0), vn(q * 9.0 + 5.2), vn(q * 9.0 + 9.7));
    float net = smoothstep(0.25, 0.0, cells(w + tb * 0.2));
    float mot = fbm(q * 14.0 + vec3(0.0, tb * 0.3, 0.0));
    // Filaments: dark sinuous lanes of cool plasma seen from above.
    float fil = smoothstep(0.035, 0.0, abs(fbm(q * 5.0 + 3.1) - 0.5)) * smoothstep(0.45, 0.65, fbm(q * 3.0 + 8.0));
    float tex = 1.0 + uDisk.y * ((gran - 0.6) * 0.6 + (turb - 0.5) * 1.6 + (mot - 0.5) * 0.5 + net * 0.15) - 0.55 * fil;
    // The photosphere darkens to the limb; the corona brightens.
    float dark = pow(max(mu, 0.02), 0.55);
    float bright = 1.0 + 0.6 * (inversesqrt(max(mu, 0.04)) - 1.0);
    hot = uDisk.x * max(tex, 0.08) * mix(dark, bright, uDisk.z);
    for (int k = 0; k < ${NR}; k++) {
      float dd = 2.0 - 2.0 * dot(n, uReg[k].xyz);
      float m = exp(-dd / 0.006) * uReg[k].w;
      hot += uDisk2.z * uDisk.x * m * (0.4 + 1.2 * net + 0.6 * gran);
    }
    for (int k = 0; k < 2; k++) {
      if (uFlW[k].y <= 0.0) continue;
      float a = acos(clamp(dot(n, uFl[k].xyz), -1.0, 1.0));
      float front = exp(-pow((a - uFlW[k].x) / 0.016, 2.0)) * smoothstep(uFlW[k].x + 0.02, uFlW[k].x - 0.12, a);
      hot += uFlW[k].y * front * (1.0 + gran) * uDisk.x * 0.5;
      // Behind the wave the corona dims.
      hot *= 1.0 - 0.3 * uFlW[k].y * smoothstep(uFlW[k].x, 0.0, a);
    }
    // The chromosphere glows red at the very edge.
    cool += uDisk2.y * 0.5 * smoothstep(0.2, 0.0, mu);
  } else {
    float h = r - R;
    // Streamers: broad rays in the corona, and fine ones.
    float st = fbm(vec3(ang * 7.0, h * 0.002 - tb * 0.1, 1.3));
    float fine = fbm(vec3(ang * 48.0, h * 0.006 - tb * 0.3, 4.1));
    hot = uDisk.w * (exp(-h / uDisk2.x) * (0.6 + 0.8 * fine) + 0.3 * exp(-h / 360.0) * (0.4 + 1.2 * st * st));
    // The chromosphere: a thin bright rim, and a ragged fringe of spicules.
    float sh = 3.0 + 9.0 * pow(vn(vec3(ang * 300.0, uTime * 0.05, 0.5)), 2.0);
    cool += uDisk2.y * (exp(-h / sh) * (0.6 + 0.6 * vn(vec3(ang * 900.0, 2.0, uTime * 0.08))) + 0.8 * exp(-h / 2.5));
  }
  // A haze over each region: unresolved loops.
  for (int k = 0; k < ${NR}; k++) {
    vec3 c = uReg[k].xyz * (R + 50.0);
    vec2 d = P - c.xy;
    float vis = r < R ? smoothstep(-60.0, 60.0, c.z) : 1.0;
    hot += uDisk2.w * uReg[k].w * vis * exp(-dot(d, d) / (2.0 * 70.0 * 70.0));
  }
  // The erupting bubble: a faint shell, dim inside.
  for (int k = 0; k < 2; k++) {
    if (uFlB[k].z <= 0.0) continue;
    vec3 c = uFl[k].xyz * (R + uFlB[k].x);
    float d = length(P - c.xy) / uFlB[k].y;
    float shell = exp(-pow((d - 1.0) / 0.06, 2.0)) * pow(fbm(vec3(P * 0.012, 1.7)), 2.0) * 2.4;
    float vis = r < R && c.z < 0.0 ? 0.0 : 1.0;
    // The cavity: plasma swept out behind the front.
    hot *= 1.0 - 0.6 * min(uFlB[k].z, 1.0) * vis * smoothstep(1.0, 0.55, d);
    hot += uFlB[k].z * shell * vis;
  }
  o = vec4(max(hot, 0.0), max(cool, 0.0), 0.0, 1.0);
}`;

/* ---------- strands: one camera-facing ribbon per thread ---------- */
// Kinds: 0 loop, 1 ribbon, 2 rope, 3 prominence, 4 erupting prominence.
const STRAND_VS = `#version 300 es
precision highp float;
layout(location = 0) in vec4 aA;
layout(location = 1) in vec4 aB;
layout(location = 2) in vec4 aC;
layout(location = 3) in vec4 aD;
uniform mat3 uRot;
uniform vec4 uView;
uniform vec2 uRes;
out float vV, vS, vI, vDrain, vPh, vKind, vHgt;
out vec3 vP;
const float R = ${R.toFixed(1)};
const int N = ${NS};
vec3 curve(float s) {
  vec3 A = aA.xyz, B = aB.xyz;
  float om = acos(clamp(dot(A, B), -1.0, 1.0));
  vec3 base = om < 1e-4 ? A : (sin((1.0 - s) * om) * A + sin(s * om) * B) / sin(om);
  vec3 side = normalize(cross(A, B) + vec3(1e-6));
  vec3 up = normalize(base * cos(aB.w) + side * sin(aB.w));
  // Steep legs, a round top: a semi-ellipse.
  float lift = aA.w * sqrt(max(4.0 * s * (1.0 - s), 0.0));
  vec3 p = base * R + up * lift;
  if (aD.x > 0.0) {
    vec3 tng = normalize(B - A + vec3(1e-6));
    // An erupting rope swells into a bulb: its upper legs bow outward.
    if (aD.w == 2.0 || aD.w == 4.0) p -= tng * sin(6.2832 * s) * 0.3 * max(aA.w - 30.0, 0.0);
    vec3 ax2 = normalize(cross(up, tng));
    float a = aD.y * 6.2832 * s + aD.z;
    p += aD.x * sqrt(sin(3.14159 * s)) * (cos(a) * up + sin(a) * ax2);
  }
  return p;
}
vec2 px(vec3 p) { return ((p.xy - uView.xy) / uView.zw * 0.5 + 0.5) * uRes; }
void main() {
  int i = gl_VertexID >> 1;
  float side = (gl_VertexID & 1) == 0 ? -1.0 : 1.0;
  float s = float(i) / float(N - 1);
  float ds = 0.5 / float(N - 1);
  vec3 c = curve(s);
  vec3 p = uRot * c;
  vec3 p1 = uRot * curve(min(s + ds, 1.0)), p0 = uRot * curve(max(s - ds, 0.0));
  vec2 sp = px(p);
  vec2 t2 = px(p1) - px(p0);
  vec2 tn = length(t2) > 1e-4 ? normalize(t2) : vec2(1.0, 0.0);
  vec2 nr = vec2(-tn.y, tn.x);
  float ppm = uRes.y / (2.0 * uView.w);
  float wpx = aC.x * ppm;
  float wq = max(wpx, 1.5);
  // A thread seen along its length looks brighter: a longer path.
  vec3 t3 = normalize(p1 - p0 + vec3(1e-6));
  float los = 1.0 / max(length(t3.xy), 0.3);
  vI = aC.y * (wpx / wq) * los;
  vV = side;
  vS = s;
  vDrain = aC.w;
  vPh = aC.z;
  vKind = aD.w;
  vHgt = length(c) - R;
  vP = p;
  vec2 q = sp + nr * side * wq * 1.6;
  gl_Position = vec4(q / uRes * 2.0 - 1.0, 0.0, 1.0);
}`;

const STRAND_FS = `${HEAD}
uniform float uTime, uRain;
in float vV, vS, vI, vDrain, vPh, vKind, vHgt;
in vec3 vP;
out vec4 o;
const float R = ${R.toFixed(1)};
float n1(float x) { float i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f); return mix(fract(sin(i * 91.3) * 43758.5), fract(sin((i + 1.0) * 91.3) * 43758.5), f); }
void main() {
  float prof = exp(-5.12 * vV * vV);
  // The sun hides what stands behind it.
  float r = length(vP.xy);
  float zs = sqrt(max(R * R - r * r, 0.0));
  float vis = max(smoothstep(R - 0.8, R + 0.8, r), smoothstep(-1.5, 0.8, vP.z - zs));
  // The cool chromosphere dims the feet, except on the ribbons.
  float feet = vKind == 1.0 ? 1.0 : mix(0.35, 1.0, smoothstep(0.0, 6.0, vHgt));
  float foot = min(vS, 1.0 - vS);
  // Upflows: faint ripples that climb from the feet.
  float rip = 1.0 + 0.22 * sin(6.2832 * (foot * 7.0 - uTime * 0.32 + vPh)) * (1.0 - smoothstep(0.08, 0.4, foot));
  float I = vI * rip * (1.0 - 0.72 * vDrain * smoothstep(0.0, 0.5, foot + 0.25 * vDrain));
  // Rain: knots fall down both legs as the loop drains.
  if (vDrain > 0.0) {
    float k = 0.0;
    for (int j = 0; j < 3; j++) {
      float u = clamp(vDrain * 1.5 - float(j) * 0.25, 0.0, 1.0);
      if (u <= 0.0 || u >= 1.0) continue;
      float at = 0.48 * u * u;
      float w = 0.012 + 0.01 * u;
      k += exp(-pow((foot - (0.5 - at)) / w, 2.0)) * (1.0 - u * 0.6);
    }
    I += vI * uRain * k * 1.6;
  }
  // Prominences: knots of cool plasma slide down toward the feet.
  if (vKind >= 3.0) {
    float fl = foot * 40.0 + uTime * 0.6 + vPh * 13.0;
    float kn = n1(fl) * 0.7 + n1(fl * 2.7 + 5.0) * 0.5;
    I *= 0.35 + 1.1 * kn * kn;
  }
  float cf = vKind >= 3.0 ? 1.0 : vKind == 2.0 ? 0.8 : vKind == 1.0 ? 0.5 : 0.0;
  float L = I * prof * vis * feet;
  o = vec4(L * (1.0 - cf), L * cf, 0.0, 1.0);
}`;

/* ---------- light rays: a march toward the sun's centre ---------- */
const RAYS = `${HEAD}
uniform sampler2D uSrc;
uniform vec2 uC;
uniform float uThr, uAsp, uTime;
in vec2 vUv;
out vec4 o;
${NOISE}
void main() {
  vec2 dir = uC - vUv;
  float len = min(length(dir) * 0.5, 0.45);
  vec2 d = normalize(dir + 1e-6) * len / float(${RAY_N});
  vec2 uv = vUv;
  vec3 s = vec3(0.0);
  float w = 1.0;
  for (int i = 0; i < ${RAY_N}; i++) {
    vec3 c = texture(uSrc, clamp(uv, 0.0, 1.0)).rgb;
    s += max(c - uThr, 0.0) * w;
    w *= 0.955;
    uv += d;
  }
  // Shafts: the light streams out in rays that turn very slowly.
  vec2 a = (vUv - uC) * vec2(uAsp, 1.0);
  float th = atan(a.x, a.y);
  float sh = fbm(vec3(th * 26.0, uTime * 0.01, 2.0));
  sh = 0.25 + 2.2 * pow(sh, 2.5) + 0.6 * pow(vn(vec3(th * 90.0, 1.0, uTime * 0.02)), 4.0);
  o = vec4(s / float(${RAY_N}) * sh, 1.0);
}`;

/* ---------- final: heat bend, grade, lens ---------- */
const FINAL = `${HEAD}
uniform sampler2D uHdr, uBloom, uRays, uLut;
uniform vec4 uSat[2];
uniform vec4 uView, uMix, uEarth;
uniform vec3 uHal, uStreak;
uniform vec2 uRes, uC;
uniform float uFrame, uTime, uExpo, uSc, uRow;
in vec2 vUv;
out vec4 o;
const float R = ${R.toFixed(1)};
${NOISE}
float hash(vec2 p) { p = fract(p * vec2(443.897, 441.423)); p += dot(p, p.yx + 19.19); return fract((p.x + p.y) * p.x); }
// The kernel's white core, added to the hot light before the grade.
float kern(vec2 fc) {
  float s = 0.0;
  for (int k = 0; k < 2; k++) {
    float S = uSat[k].z;
    if (S <= 0.0) continue;
    vec2 d = (fc - uSat[k].xy) / uSc;
    s += S * (6.0 * exp(-dot(d, d) / 90.0) + 1.2 * exp(-dot(d, d) / 2400.0));
  }
  return s;
}
vec2 sig(vec2 uv, float kx) {
  vec3 h = texture(uHdr, uv).rgb + texture(uBloom, uv).rgb * 0.3 + texture(uRays, uv).rgb * uMix.x;
  return vec2(h.r * uMix.y + kx, h.g * uMix.z);
}
vec3 grade(vec2 s) {
  float I = s.x + s.y;
  float t = 1.0 - exp(-I * uExpo);
  float fr = s.y / max(I, 1e-5);
  vec3 a = texture(uLut, vec2(t, (uRow * 2.0 + 0.5) / 6.0)).rgb;
  vec3 b = texture(uLut, vec2(t, (uRow * 2.0 + 1.5) / 6.0)).rgb;
  return mix(a, b, fr);
}
void main() {
  vec2 uv = vUv;
  // Heat bends the air above the limb.
  vec2 P = uView.xy + (uv * 2.0 - 1.0) * uView.zw;
  float hr = length(P) - R;
  float hz = exp(-abs(hr) / 25.0) + 0.3 * exp(-max(hr, 0.0) / 120.0);
  vec2 wob = vec2(vn(vec3(P * 0.05, uTime * 0.3)), vn(vec3(P * 0.05 + 7.7, uTime * 0.3))) - 0.5;
  uv += wob * hz * uMix.w / uRes;
  // The lens splits colour toward the frame's edge.
  vec2 ca = (uv - 0.5) * 0.0025;
  float kx = kern(gl_FragCoord.xy);
  vec3 c;
  c.r = grade(sig(uv + ca, kx)).r;
  c.g = grade(sig(uv, kx)).g;
  c.b = grade(sig(uv - ca, kx)).b;
  // Halation: the film's red glow round bright light.
  vec3 bl = texture(uBloom, uv).rgb;
  c += uHal * (1.0 - exp(-(bl.r * uMix.y + bl.g * uMix.z) * 0.8)) * 0.35;
  // The lens: an anamorphic streak and ghosts from each saturated core.
  vec2 cs = uRes * 0.5;
  for (int k = 0; k < 2; k++) {
    float S = uSat[k].z;
    if (S <= 0.0) continue;
    vec2 d = (gl_FragCoord.xy - uSat[k].xy) / uSc;
    float st = exp(-d.y * d.y / 10.0) * exp(-abs(d.x) / (260.0 * (0.4 + S))) * 0.9
             + exp(-d.y * d.y / 160.0) * exp(-abs(d.x) / 500.0) * 0.25;
    c += uStreak * st * min(S, 1.5);
    for (int g = 0; g < 3; g++) {
      float m = g == 0 ? -0.45 : g == 1 ? -0.95 : -1.6;
      float rad = (g == 0 ? 18.0 : g == 1 ? 42.0 : 10.0) * uSc;
      vec2 gp = cs + (uSat[k].xy - cs) * m;
      float dist = length(gl_FragCoord.xy - gp);
      float disc = smoothstep(rad, rad * 0.75, dist) * (0.6 + 0.4 * smoothstep(rad * 0.5, rad, dist));
      vec3 tint = g == 1 ? uStreak.bgr : uStreak;
      c += tint * disc * 0.05 * S;
    }
  }
  // A small dark world for scale, lit at its rim by the sun behind it.
  if (uEarth.w > 0.0) {
    vec2 e = gl_FragCoord.xy - uEarth.xy;
    float d = length(e) / uEarth.z;
    float disc = smoothstep(1.0, 0.86, d);
    float face = 0.5 + 0.5 * dot(normalize(e + 1e-4), normalize(uC * uRes - uEarth.xy));
    float rim = exp(-pow((d - 0.97) / 0.07, 2.0)) * (0.05 + 0.95 * face * face * face);
    c = c * (1.0 - 0.97 * disc * uEarth.w) + vec3(0.45, 0.66, 1.0) * rim * 0.55 * uEarth.w;
  }
  vec2 v = vUv - 0.5;
  c *= clamp(1.0 - 0.55 * pow(length(v * vec2(1.0, 0.9)) * 1.35, 2.2), 0.3, 1.0);
  // Film grain, strongest in the mid tones.
  float l = dot(c, vec3(0.3, 0.55, 0.15));
  float gr = (hash(gl_FragCoord.xy + uFrame * 17.0) + hash(gl_FragCoord.xy * 1.7 + uFrame * 5.0) - 1.0);
  c += gr * 0.035 * (0.3 + 3.0 * l * (1.0 - l));
  o = vec4(clamp(c, 0.0, 1.0), 1.0);
}`;

export async function makeRender(gl) {
  if (!gl.getExtension('EXT_color_buffer_float') && !gl.getExtension('EXT_color_buffer_half_float')) throw new Error('no float targets');
  const P = await linked(gl, {
    sky: program(gl, TRI_VS, SKY),
    strand: program(gl, STRAND_VS, STRAND_FS),
    rays: program(gl, TRI_VS, RAYS),
    final: program(gl, TRI_VS, FINAL),
  });
  const empty = gl.createVertexArray();
  const bloom = bloomChain(gl, { max: 5 });
  // The strand data: four vec4 per instance.
  const data = new Float32Array(MAX_STRANDS * STRIDE);
  const vbo = gl.createBuffer();
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
  gl.bufferData(gl.ARRAY_BUFFER, data.byteLength, gl.DYNAMIC_DRAW);
  for (let i = 0; i < 4; i++) {
    gl.enableVertexAttribArray(i);
    gl.vertexAttribPointer(i, 4, gl.FLOAT, false, STRIDE * 4, i * 16);
    gl.vertexAttribDivisor(i, 1);
  }
  gl.bindVertexArray(null);
  // The colour ramps: one row per band and channel.
  const lut = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, lut);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, LUT_W, LUTS.length, 0, gl.RGBA, gl.UNSIGNED_BYTE, lutPixels());
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  const lutT = { tex: lut };

  let hdr = null, rays = null, W = 0, H = 0;
  function resize(w, h) {
    W = Math.max(2, w); H = Math.max(2, h);
    gl.canvas.width = W; gl.canvas.height = H;
    free(gl, hdr); free(gl, rays);
    hdr = target(gl, W, H);
    rays = target(gl, Math.max(2, W >> 1), Math.max(2, H >> 1));
  }
  // v: view, rot, toSun, time, band, regs, flares, sat, count, bloomLevels, frameNo, sun centre, earth.
  function frame(v) {
    if (!hdr) return;
    gl.disable(gl.BLEND);
    const s = P.sky;
    gl.useProgram(s.p);
    gl.uniform4fv(s.u.uView, v.view);
    gl.uniformMatrix3fv(s.u.uToSun, false, v.toSun);
    gl.uniform1f(s.u.uTime, v.time % 4000);
    gl.uniform4fv(s.u.uDisk, v.band.disk);
    gl.uniform4fv(s.u.uDisk2, v.band.disk2);
    gl.uniform4fv(s.u.uReg, v.regs);
    gl.uniform4fv(s.u.uFl, v.fl);
    gl.uniform4fv(s.u.uFlW, v.flW);
    gl.uniform4fv(s.u.uFlB, v.flB);
    tri(gl, hdr, empty);

    if (v.count > 0) {
      const p = P.strand;
      gl.useProgram(p.p);
      gl.uniformMatrix3fv(p.u.uRot, false, v.rot);
      gl.uniform4fv(p.u.uView, v.view);
      gl.uniform2f(p.u.uRes, W, H);
      gl.uniform1f(p.u.uTime, v.time % 4000);
      gl.uniform1f(p.u.uRain, v.band.rain);
      gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, v.data, 0, v.count * STRIDE);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE);
      gl.bindVertexArray(vao);
      to(gl, hdr);
      gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, NS * 2, v.count);
      gl.bindVertexArray(null);
      gl.disable(gl.BLEND);
    }

    const bt = bloom.render(hdr.tex, W, H, { threshold: 0.9, cap: 6, levels: v.bloomLevels });
    const r = P.rays;
    gl.useProgram(r.p);
    bind(gl, r, 'uSrc', 0, hdr);
    gl.uniform2fv(r.u.uC, v.centre);
    gl.uniform1f(r.u.uThr, 0.45);
    gl.uniform1f(r.u.uAsp, W / H);
    gl.uniform1f(r.u.uTime, v.time % 4000);
    tri(gl, rays, empty);

    const f = P.final;
    gl.useProgram(f.p);
    bind(gl, f, 'uHdr', 0, hdr);
    bind(gl, f, 'uBloom', 1, bt);
    bind(gl, f, 'uRays', 2, rays);
    bind(gl, f, 'uLut', 3, lutT);
    const B = v.band;
    gl.uniform4fv(f.u.uSat, v.sat);
    gl.uniform4fv(f.u.uView, v.view);
    gl.uniform4f(f.u.uMix, B.rays, B.hotW, B.coolW, v.shimmer);
    gl.uniform4fv(f.u.uEarth, v.earth);
    gl.uniform3fv(f.u.uHal, B.hal);
    gl.uniform3fv(f.u.uStreak, B.streak);
    gl.uniform2f(f.u.uRes, W, H);
    gl.uniform2fv(f.u.uC, v.centre);
    gl.uniform1f(f.u.uFrame, v.frameNo % 64);
    gl.uniform1f(f.u.uTime, v.time % 4000);
    gl.uniform1f(f.u.uExpo, B.expo);
    gl.uniform1f(f.u.uSc, v.sc);
    gl.uniform1f(f.u.uRow, B.row);
    tri(gl, null, empty);
  }
  return { resize, frame, data };
}
