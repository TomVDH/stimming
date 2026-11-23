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

/* ---------- colour ramps: two per star, hot then cool ---------- */
// Each stop is an sRGB colour and its place on the tone axis.
const LUTS = [
  // Sun: warm black, ember, amber, gold, white.
  [['000000', 0], ['0c0503', 0.08], ['2e1004', 0.22], ['7a2f06', 0.4], ['cf6a0c', 0.58], ['ffa22c', 0.74], ['ffd47a', 0.87], ['fff3d6', 0.96], ['ffffff', 1]],
  [['000000', 0], ['140402', 0.1], ['4a0e03', 0.28], ['a8300a', 0.48], ['f2661a', 0.66], ['ffa04a', 0.8], ['ffd9a8', 0.92], ['fff8f0', 1]],
  // Proxima: deep orange to a peach white; crimson prominences.
  [['000000', 0], ['120302', 0.1], ['3d0a03', 0.26], ['8a2205', 0.44], ['d64a0e', 0.62], ['ff8030', 0.78], ['ffc28a', 0.9], ['fff0e0', 1]],
  [['000000', 0], ['160104', 0.1], ['4c0410', 0.3], ['a00c1c', 0.5], ['e8302a', 0.68], ['ff7a62', 0.82], ['ffc8bc', 0.93], ['fff2ee', 1]],
  // Rigel: cold blue steel to white; lilac prominences.
  [['000000', 0], ['02060d', 0.1], ['0a1a33', 0.26], ['1f4a80', 0.44], ['5a8fd0', 0.62], ['a8ccf5', 0.78], ['e2f0ff', 0.9], ['ffffff', 1]],
  [['000000', 0], ['0a0710', 0.12], ['2a1f3d', 0.3], ['5e4e86', 0.5], ['9e93c8', 0.68], ['d8d2f0', 0.84], ['fbfaff', 1]],
  // Betelgeuse: rust, orange, a dusty peach.
  [['000000', 0], ['100302', 0.1], ['360b04', 0.26], ['7a1e06', 0.44], ['c2430c', 0.62], ['f07a2a', 0.78], ['ffbc7a', 0.9], ['fff0dc', 1]],
  [['000000', 0], ['120203', 0.1], ['3e0608', 0.3], ['8a1410', 0.5], ['d0401e', 0.68], ['f88a5a', 0.84], ['fff0e4', 1]],
  // VY Canis Majoris: blood red with brown shadows.
  [['000000', 0], ['0c0201', 0.1], ['2a0603', 0.28], ['5e1006', 0.46], ['a0240c', 0.64], ['d8501c', 0.8], ['ffa070', 0.92], ['ffe6d6', 1]],
  [['000000', 0], ['0e0304', 0.12], ['300a0c', 0.3], ['6a1a18', 0.5], ['a8402c', 0.68], ['e08050', 0.84], ['fff0e0', 1]],
  // Neutron star: electric blue to white; violet for cool light.
  [['000000', 0], ['03030c', 0.1], ['0e0f36', 0.26], ['2a2f8a', 0.44], ['5a6ff0', 0.62], ['a6b8ff', 0.78], ['e6ecff', 0.9], ['ffffff', 1]],
  [['000000', 0], ['0d0412', 0.12], ['32104a', 0.3], ['6a2a9a', 0.5], ['b070e0', 0.68], ['e8c8ff', 0.84], ['ffffff', 1]],
  // Sirius B: a white dwarf, cyan white.
  [['000000', 0], ['04080a', 0.1], ['10262c', 0.26], ['2f6470', 0.44], ['70b0bc', 0.62], ['b8e2ea', 0.78], ['ecfbff', 0.9], ['ffffff', 1]],
  [['000000', 0], ['08060e', 0.12], ['221c36', 0.3], ['4e4672', 0.5], ['9088b8', 0.68], ['d4d0ec', 0.84], ['ffffff', 1]],
  // Sirius: blue white, pale rose prominences.
  [['000000', 0], ['05070c', 0.1], ['141c30', 0.26], ['3a5078', 0.44], ['7e98c4', 0.62], ['c2d2f0', 0.78], ['f0f5ff', 0.9], ['ffffff', 1]],
  [['000000', 0], ['0e0608', 0.12], ['3a1a22', 0.3], ['7a4250', 0.5], ['c08a96', 0.68], ['ecd2d8', 0.84], ['ffffff', 1]],
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
uniform vec4 uDisk, uDisk2, uTex, uBeam;
uniform float uDust;
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
    float gran = smoothstep(0.0, 0.6, cells(q * uTex.x + vec3(0.0, 0.0, tb * 2.0)));
    // Swirls of plasma: noise bent by noise, slowly turning.
    vec3 wq = q * uTex.y * 1.6;
    vec3 warp = vec3(fbm(wq + tb * 0.1), fbm(wq + 5.1), fbm(wq + 9.3));
    float turb = fbm(q * uTex.y + warp * 1.7 + vec3(0.0, 0.0, tb * 0.25));
    // The supergranule network, warped so it never reads as tiles.
    vec3 w = q * 22.0 + 0.8 * vec3(vn(q * 9.0), vn(q * 9.0 + 5.2), vn(q * 9.0 + 9.7));
    float net = smoothstep(0.25, 0.0, cells(w + tb * 0.2));
    float mot = fbm(q * 14.0 + vec3(0.0, tb * 0.3, 0.0));
    // Filaments: dark sinuous lanes of cool plasma seen from above.
    float fil = smoothstep(0.035, 0.0, abs(fbm(q * 5.0 + 3.1) - 0.5)) * smoothstep(0.45, 0.65, fbm(q * 3.0 + 8.0));
    float tex = 1.0 + uDisk.y * ((gran - 0.6) * 0.35 + (turb - 0.5) * 1.6 + (mot - 0.5) * 0.5 + net * uTex.z) - 0.55 * fil * min(uDisk2.y, 1.0);
    // The photosphere darkens to the limb; the corona brightens.
    float dark = pow(max(mu, 0.02), uTex.w);
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
    // A neutron star's magnetic poles burn hot.
    if (uBeam.w > 0.0) hot += uDisk.x * 1.6 * uBeam.w * exp(-(1.0 - abs(dot(n, uBeam.xyz))) / 0.03);
    // The chromosphere glows red at the very edge.
    cool += uDisk2.y * 0.5 * smoothstep(0.2, 0.0, mu);
    // Dust in front of the disk dims it in slow patches.
    hot *= 1.0 - uDust * 0.55 * smoothstep(0.4, 0.75, fbm(vec3(P * 0.006, 5.0 + tb * 0.05)));
  } else {
    float h = r - R;
    // Streamers: broad rays in the corona, and fine ones.
    float st = fbm(vec3(ang * 7.0, h * 0.002 - tb * 0.1, 1.3));
    float fine = fbm(vec3(ang * 48.0, h * 0.006 - tb * 0.3, 4.1));
    hot = uDisk.w * (exp(-h / uDisk2.x) * (0.6 + 0.8 * fine) + 0.3 * exp(-h / 360.0) * (0.4 + 1.2 * st * st));
    // The chromosphere: a thin bright rim, and a ragged fringe of spicules.
    float sh = 3.0 + 9.0 * pow(vn(vec3(ang * 300.0, uTime * 0.05, 0.5)), 2.0);
    cool += uDisk2.y * (exp(-h / sh) * (0.6 + 0.6 * vn(vec3(ang * 900.0, 2.0, uTime * 0.08))) + 0.8 * exp(-h / 2.5));
    if (uDust > 0.0) {
      // The envelope: arcs and knots of ejected dust, lit by the star.
      float warp = fbm(vec3(P * 0.006, 1.0));
      float arcs = fbm(vec3(ang * 5.0, h * 0.006, 7.0) + 0.6 * warp);
      float knots = pow(fbm(vec3(P * 0.012, 3.0 + tb * 0.05)), 3.0);
      float env = exp(-h / 260.0);
      cool += uDust * env * (0.3 * smoothstep(0.45, 0.8, arcs) + 1.4 * knots);
      hot += uDust * 0.1 * exp(-h / 500.0) * (0.5 + warp);
    }
  }
  // A haze over each region: unresolved loops.
  for (int k = 0; k < ${NR}; k++) {
    vec3 c = uReg[k].xyz * (R + 50.0);
    vec2 d = P - c.xy;
    float vis = r < R ? smoothstep(-60.0, 60.0, c.z) : 1.0;
    hot += uDisk2.w * uReg[k].w * vis * exp(-dot(d, d) / (2.0 * 70.0 * 70.0));
  }
  // A pulsar's two beams sweep out from its magnetic poles; facing us, they flash.
  if (uBeam.w > 0.0) {
    for (int k = 0; k < 2; k++) {
      vec3 b = k == 0 ? uBeam.xyz : -uBeam.xyz;
      float l2 = length(b.xy);
      float behind = b.z < 0.0 && r < R ? 0.0 : 1.0;
      if (l2 > 1e-3 && r > R * 0.98) {
        float da = acos(clamp(dot(P / r, b.xy / l2), -1.0, 1.0));
        float wid = 0.05 + 0.3 * (1.0 - l2);
        float fall = exp(-(r - R) / (1800.0 * l2 + 300.0));
        float grain = 0.75 + 0.5 * fbm(vec3(r * 0.004 - uTime * 2.0, da * 30.0, float(k)));
        hot += uBeam.w * 1.4 * exp(-pow(da / wid, 2.0)) * fall * grain * behind;
      }
      hot += uBeam.w * 4.0 * pow(max(b.z, 0.0), 14.0) * exp(-max(r - R, 0.0) / 500.0);
    }
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

/* ---------- final: heat bend, grade, haze layers, bodies, lens, film ---------- */
const FINAL = `${HEAD}
uniform sampler2D uHdr, uBloom, uRays, uLut;
uniform vec4 uSat[2];
uniform vec4 uView, uMix, uBodyA, uBodyB, uCam, uFilm;
uniform vec2 uBodyK;
uniform vec3 uHal, uStreak;
uniform vec2 uRes, uC;
uniform float uFrame, uTime, uExpo, uSc, uRow, uLens, uHaze;
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
  vec3 h = texture(uHdr, uv).rgb + texture(uBloom, uv).rgb * 0.38 + texture(uRays, uv).rgb * uMix.x;
  return vec2(h.r * uMix.y + kx, h.g * uMix.z);
}
vec3 grade(vec2 s) {
  float I = s.x + s.y;
  float t = 1.0 - exp(-I * uExpo * (1.0 - 0.35 * uLens));
  // The long lens presses the tones: a darker, harder curve.
  t = pow(t, 1.0 + 0.35 * uLens);
  float fr = s.y / max(I, 1e-5);
  vec3 a = texture(uLut, vec2(t, (uRow * 2.0 + 0.5) / ${LUTS.length.toFixed(1)})).rgb;
  vec3 b = texture(uLut, vec2(t, (uRow * 2.0 + 1.5) / ${LUTS.length.toFixed(1)})).rgb;
  return mix(a, b, fr);
}
// The star's own light at a point: full on the disk, falling off above it.
float starLight(vec2 P) {
  float h = length(P) - R;
  return h < 0.0 ? 1.0 : exp(-h / 240.0) * 0.8 + 0.05;
}
// One scale body: b is x, y, radius in pixels, and weight.
// Kinds: 0 bare rock, 1 a star, 2 the earth, 3 the moon, 4 a lumpy moonlet.
vec3 body(vec3 c, vec2 fc, vec4 b, float kind) {
  if (b.w <= 0.0) return c;
  vec2 e = fc - b.xy;
  float r = max(b.z, 0.7);
  float d = length(e) / r;
  if (kind == 1.0) {
    // A star too small to resolve still shines: a core and a halo.
    float limb = sqrt(max(1.0 - d * d, 0.0));
    // A resolved sun shows its darkened limb and its boiling surface.
    float surf = 0.8 + 0.4 * fbm(vec3(e / max(r, 1.0) * 14.0, uTime * 0.02));
    float core = smoothstep(1.0, 1.0 - 2.0 / r, d) * pow(limb, 0.5) * surf * 1.4 + exp(-dot(e, e) / (2.0 * (r * 0.3 + 1.2) * (r * 0.3 + 1.2)));
    float halo = exp(-length(e) / (4.0 + r * 0.25)) * 0.5;
    return c * (1.0 - smoothstep(1.0, 0.97, d) * b.w) + vec3(1.0, 0.82, 0.55) * (core + halo) * b.w;
  }
  float a = atan(e.y, e.x);
  // A moonlet is lumpy: its edge wanders with the angle.
  if (kind == 4.0) d *= 1.0 + 0.16 * (vn(vec3(a * 1.6, 2.0, 0.0)) - 0.5) + 0.06 * (vn(vec3(a * 5.0, 7.0, 0.0)) - 0.5);
  float disc = smoothstep(1.0, 1.0 - 1.5 / r, d);
  // The star stands behind the body: a crescent of light on its near side.
  vec2 to = normalize(uC * uRes - b.xy + 1e-4);
  vec3 L = normalize(vec3(to * 0.95, -0.28));
  vec3 n = vec3(e / r, sqrt(max(1.0 - d * d, 0.0)));
  float lam = max(dot(n, L), 0.0);
  vec3 q = vec3(e / r * 3.0, 0.0);
  vec3 alb = vec3(0.16);
  if (kind == 2.0) {
    float land = smoothstep(0.5, 0.56, fbm(q * 1.2 + 3.0) + 0.08 * fbm(q * 9.0));
    vec3 cq = q * 3.2 + vec3(fbm(q * 2.0), fbm(q * 2.0 + 4.0), uTime * 0.01) * 1.4;
    float cloud = smoothstep(0.45, 0.8, fbm(cq)) * (0.6 + 0.4 * fbm(q * 12.0));
    alb = mix(mix(vec3(0.02, 0.06, 0.16), vec3(0.2, 0.18, 0.1), land), vec3(0.8), cloud);
  } else if (kind == 3.0) {
    alb = vec3(0.32) * (0.75 + 0.5 * fbm(q * 3.0)) * (1.0 - 0.3 * smoothstep(0.55, 0.7, fbm(q * 1.2 + 5.0)));
  } else if (kind == 4.0) {
    alb = vec3(0.17, 0.15, 0.13) * (0.7 + 0.6 * fbm(q * 4.0));
  }
  vec3 light = grade(vec2(2.5, 0.0)) * 1.3;
  vec3 lit = alb * light * lam;
  // A thin atmosphere glows round the earth; bare rock has only its sunlit edge.
  float rim = exp(-pow((d - 0.98) / (kind == 2.0 ? 0.05 : 0.025), 2.0)) * pow(0.5 + 0.5 * dot(normalize(e + 1e-4), to), 3.0);
  vec3 rimC = kind == 2.0 ? vec3(0.45, 0.7, 1.0) : light * 0.6;
  return c * (1.0 - disc * b.w) + (lit * disc + rimC * rim * 0.8) * b.w;
}
void main() {
  // Gate weave: the frame drifts a fraction of a pixel, as film does in a gate.
  vec2 weave = (vec2(vn(vec3(uFrame * 0.37, 1.0, 0.0)), vn(vec3(uFrame * 0.37, 5.0, 0.0))) - 0.5) * uFilm.y / uRes;
  vec2 uv = vUv + weave;
  vec2 P = uView.xy + (uv * 2.0 - 1.0) * uView.zw;
  float r = length(P);
  // Gravity bends the light round a neutron star: the sky slides outward at the limb.
  // The shift never reaches into the disk, so the limb stays single.
  if (uCam.z > 0.0 && r > R) uv -= normalize(P) * min(uCam.z * 0.08 * R * R / r, (r - R) * 0.6) / uView.zw * 0.5;
  // Heat bends the air above the limb.
  float hr = r - R;
  float hz = exp(-abs(hr) / 25.0) + 0.3 * exp(-max(hr, 0.0) / 120.0);
  vec2 wob = vec2(vn(vec3(P * 0.05, uTime * 0.3)), vn(vec3(P * 0.05 + 7.7, uTime * 0.3))) - 0.5;
  uv += wob * hz * uMix.w / uRes;
  // The lens splits colour toward the frame's edge.
  vec2 ca = (uv - 0.5) * (0.004 + 0.003 * uLens);
  float kx = kern(gl_FragCoord.xy);
  vec3 c;
  c.r = grade(sig(uv + ca, kx)).r;
  c.g = grade(sig(uv, kx)).g;
  c.b = grade(sig(uv - ca * 1.4, kx)).b;
  vec3 bl = texture(uBloom, uv).rgb;
  float bll = bl.r * uMix.y + bl.g * uMix.z;
  // Halation: the film's red glow round bright light.
  c += uHal * (1.0 - exp(-bll * 0.8)) * 0.45;
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
  // The scale bodies stand behind the haze, so the haze veils them.
  vec2 fc = uv * uRes;
  c = body(c, fc, uBodyA, uBodyK.x);
  c = body(c, fc, uBodyB, uBodyK.y);
  // Haze in layers, lit by the star; nearer layers slide further as the camera pans.
  vec2 sp = gl_FragCoord.xy / uRes.y;
  vec2 cam = uCam.xy;
  vec2 to = normalize(uC * vec2(uRes.x / uRes.y, 1.0) - sp + 1e-4);
  float sl = starLight(P);
  vec3 hc = grade(vec2(0.5 + 1.6 * sl + bll * 0.6, 0.1 + 0.3 * sl));
  if (uHaze > 0.0) {
    // Far veils: broad and slow.
    float far = smoothstep(0.3, 0.85, fbm(vec3(sp * 0.7 + cam * 0.15 + vec2(uTime * 0.002, 0.0), 1.0)));
    // Middle clouds: billows, lit on the side toward the star.
    vec2 q = sp * 1.6 + cam * 0.45 + vec2(uTime * 0.006, 0.0);
    vec3 w = vec3(fbm(vec3(q, 4.0)), fbm(vec3(q + 3.3, 4.0)), 0.0);
    float d1 = fbm(vec3(q + w.xy * 0.8, 6.0));
    float d2 = fbm(vec3(q + w.xy * 0.8 + to * 0.06, 6.0));
    float cloud = smoothstep(0.42, 0.8, d1);
    float lit = clamp(0.5 + (d1 - d2) * 9.0, 0.0, 1.0);
    // Near dust: dark wisps across the light, with bright edges.
    vec2 nq = sp * 3.2 + cam * 1.1 + vec2(uTime * 0.014, uTime * 0.004);
    float dust = smoothstep(0.55, 0.8, fbm(vec3(nq + 0.5 * fbm(vec3(nq * 0.7, 8.0)), 9.0)));
    float H = uHaze;
    // Over the bright disk the veils darken and shape the light rather than milk it.
    float sky = smoothstep(0.98, 0.6, sl);
    c = mix(c, hc * 0.7, H * far * 0.25 * sky) + hc * far * H * 0.12 * sl * sky;
    c = mix(c, c * (0.55 + 0.7 * lit), H * cloud * 0.5 * (1.0 - sky));
    c = mix(c, hc * (0.25 + 1.1 * lit), H * cloud * 0.38 * sky);
    c *= 1.0 - H * dust * 0.5;
    c += hc * H * dust * 0.25 * sl * pow(clamp(1.0 - abs(dust - 0.5) * 2.0, 0.0, 1.0), 2.0);
    // Motes: a few specks very close, soft and out of focus, catching the light.
    vec2 mq = sp * 9.0 + cam * 2.4 + vec2(uTime * 0.03, -uTime * 0.012);
    vec2 mc = floor(mq), mf = fract(mq) - 0.5;
    float mh = hash(mc);
    vec2 mo = (vec2(hash(mc + 3.1), hash(mc + 7.7)) - 0.5) * 0.6;
    float mote = mh > 0.985 ? smoothstep(0.09, 0.04, length(mf - mo)) : 0.0;
    c += hc * mote * H * 0.18 * (0.3 + sl);
  }
  // Lens dirt: smudges on the glass that glow where bright light falls.
  float dirt = smoothstep(0.55, 0.85, fbm(vec3(vUv * vec2(uRes.x / uRes.y, 1.0) * 3.0, 11.0))) * 0.7
             + smoothstep(0.8, 0.95, fbm(vec3(vUv * 18.0, 13.0)));
  c += hc * dirt * (1.0 - exp(-bll * 0.6)) * 0.35 * uFilm.z;
  // Highlights burn out to white, as on overexposed film.
  float lum = dot(c, vec3(0.3, 0.55, 0.15));
  c = mix(c, vec3(1.0, 0.98, 0.94), smoothstep(0.82, 1.05, lum) * 0.6);
  // Exposure flicker: the light breathes from frame to frame.
  c *= 1.0 + uFilm.w * (hash(vec2(uFrame, 3.7)) - 0.5);
  vec2 v = vUv - 0.5;
  c *= clamp(1.0 - (0.6 + 0.25 * uLens) * pow(length(v * vec2(1.0, 0.9)) * 1.35, 2.2), 0.15, 1.0);
  // Film grain: coarse clumps and fine grain, strongest in the mid tones.
  float l = dot(c, vec3(0.3, 0.55, 0.15));
  vec2 g2 = floor(gl_FragCoord.xy / max(1.0, uRes.y / 700.0));
  float fine = hash(g2 + uFrame * 17.0) + hash(g2 * 1.7 + uFrame * 5.0) - 1.0;
  float clump = vn(vec3(gl_FragCoord.xy * 0.45, uFrame * 7.3)) - 0.5;
  float gr = fine * 0.7 + clump * 0.9;
  c += gr * uFilm.x * (0.35 + 3.2 * l * (1.0 - l));
  // Chroma noise in the shadows: the stock's colour layers part in the dark.
  vec3 cn = vec3(hash(g2 + uFrame * 3.1), hash(g2 + uFrame * 5.3 + 9.0), hash(g2 + uFrame * 7.7 + 4.0)) - 0.5;
  c += cn * uFilm.x * 0.6 * (1.0 - smoothstep(0.0, 0.35, l));
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
  // v: view, rot, toSun, time, band (the star), regs, flares, sat, count, bloom, frame, centre, bodies, lens.
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
    gl.uniform4fv(s.u.uTex, v.band.tex);
    gl.uniform1f(s.u.uDust, v.band.dust);
    gl.uniform4fv(s.u.uBeam, v.beam);
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
    gl.uniform4fv(f.u.uBodyA, v.bodyA);
    gl.uniform4fv(f.u.uBodyB, v.bodyB);
    gl.uniform2fv(f.u.uBodyK, v.bodyK);
    gl.uniform1f(f.u.uLens, v.lens);
    gl.uniform4fv(f.u.uCam, v.cam);
    gl.uniform4fv(f.u.uFilm, v.film);
    gl.uniform1f(f.u.uHaze, Math.min(1, 0.4 + 0.6 * v.lens + 0.3 * v.band.dust));
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
