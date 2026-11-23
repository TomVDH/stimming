// Solar loop renderer: raw WebGL2. The image is one intensity channel, as a detector sees it.
// Passes: the disk and corona, the strands (additive, optically thin), bloom, then the final.
// The final pass adds the detector's marks and applies the band's colour table.
import { TRI_VS, program, linked, target, free, bind, tri, to } from '../shared/gl.js';
import { bloomChain } from '../shared/glow.js';
import { R, STRIDE, MAX_STRANDS } from './sun.js';

const HEAD = `#version 300 es
precision highp float;
`;
const NR = 5;
// Samples along each strand.
const NS = 56;

const NOISE = `
float h13(vec3 p) { p = fract(p * 0.1031); p += dot(p, p.zyx + 31.32); return fract((p.x + p.y) * p.z); }
float vn(vec3 p) {
  vec3 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(h13(i), h13(i + vec3(1, 0, 0)), f.x), mix(h13(i + vec3(0, 1, 0)), h13(i + vec3(1, 1, 0)), f.x), f.y),
             mix(mix(h13(i + vec3(0, 0, 1)), h13(i + vec3(1, 0, 1)), f.x), mix(h13(i + vec3(0, 1, 1)), h13(i + vec3(1, 1, 1)), f.x), f.y), f.z);
}
float fbm(vec3 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { s += a * vn(p); p = p * 2.03 + 7.1; a *= 0.5; } return s; }
// Cell edges: the network that borders each supergranule.
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
  float I = 0.0;
  float ang = atan(P.x, P.y);
  float drift = uTime * 0.004;
  if (r < R) {
    float mu = sqrt(max(1.0 - r * r / (R * R), 0.0));
    vec3 n = vec3(P / R, mu);
    vec3 q = uToSun * n;
    // Warp the network so its cells never read as tiles.
    vec3 w = q * 60.0 + 0.9 * vec3(vn(q * 14.0), vn(q * 14.0 + 5.2), vn(q * 14.0 + 9.7));
    float net = smoothstep(0.22, 0.0, cells(w + drift)) * vn(q * 40.0 + 3.0);
    float sp = fbm(q * 150.0 + vec3(0.0, drift * 3.0, 0.0));
    float mot = fbm(q * 18.0 - drift);
    float base = 0.5 + uDisk.y * 1.6 * (net - 0.15) + 0.4 * (sp - 0.5) + 1.0 * (mot - 0.5);
    // A longer path through the thin corona near the limb.
    float limb = 1.0 + uDisk.z * (inversesqrt(max(mu, 0.035)) - 1.0);
    I = uDisk.x * max(base, 0.05) * limb;
    for (int k = 0; k < ${NR}; k++) {
      float dd = 2.0 - 2.0 * dot(n, uReg[k].xyz);
      float m = exp(-dd / 0.0042) * uReg[k].w;
      I += uDisk2.z * m * (0.25 + 1.6 * pow(sp, 3.0) + 0.6 * net);
    }
    for (int k = 0; k < 2; k++) {
      if (uFlW[k].y <= 0.0) continue;
      float a = acos(clamp(dot(n, uFl[k].xyz), -1.0, 1.0));
      float front = exp(-pow((a - uFlW[k].x) / 0.016, 2.0)) * smoothstep(uFlW[k].x + 0.02, uFlW[k].x - 0.12, a);
      I += uFlW[k].y * front * (0.6 + 0.8 * sp);
      // Behind the wave the corona dims.
      I *= 1.0 - 0.35 * uFlW[k].y * smoothstep(uFlW[k].x, 0.0, a);
    }
  } else {
    float h = r - R;
    float streak = fbm(vec3(ang * 34.0, h * 0.004 - drift, 1.3));
    I = uDisk.w * exp(-h / uDisk2.x) * (0.7 + 0.6 * streak);
    I += 0.03 * uDisk.w * exp(-h / 260.0);
    // Spicules: a ragged fringe of cool jets at the limb.
    float sh = 2.5 + 7.0 * pow(vn(vec3(ang * 420.0, uTime * 0.05, 0.5)), 2.0);
    I += uDisk2.y * 0.55 * exp(-h / sh) * (0.6 + 0.6 * vn(vec3(ang * 1300.0, 2.0, uTime * 0.08)));
  }
  // A haze over each region: unresolved loops.
  for (int k = 0; k < ${NR}; k++) {
    vec3 c = uReg[k].xyz * (R + 34.0);
    vec2 d = P - c.xy;
    float vis = r < R ? smoothstep(-40.0, 40.0, c.z) : 1.0;
    I += uDisk2.w * uReg[k].w * vis * exp(-dot(d, d) / (2.0 * 46.0 * 46.0));
  }
  // The erupting bubble: a faint shell, dim inside.
  for (int k = 0; k < 2; k++) {
    if (uFlB[k].z <= 0.0) continue;
    vec3 c = uFl[k].xyz * (R + uFlB[k].x);
    float d = length(P - c.xy) / uFlB[k].y;
    float shell = exp(-pow((d - 1.0) / 0.06, 2.0)) * pow(fbm(vec3(P * 0.02, 1.7)), 2.0) * 2.4;
    float vis = r < R && c.z < 0.0 ? 0.0 : 1.0;
    // The cavity: plasma swept out behind the front.
    I *= 1.0 - 0.6 * min(uFlB[k].z, 1.0) * vis * smoothstep(1.0, 0.55, d);
    I += uFlB[k].z * shell * vis;
  }
  o = vec4(vec3(max(I, 0.0)), 1.0);
}`;

/* ---------- strands: one camera-facing ribbon per loop thread ---------- */
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
    vec3 tng = normalize(B - A);
    // An erupting rope swells into a bulb: its upper legs bow outward.
    if (aD.w == 2.0) p -= tng * sin(6.2832 * s) * 0.3 * max(aA.w - 30.0, 0.0);
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
  o = vec4(vec3(I * prof * vis * feet), 1.0);
}`;

/* ---------- final: detector marks, log stretch, colour table ---------- */
const FINAL = `${HEAD}
uniform sampler2D uHdr, uBloom;
uniform vec4 uSat[2];
uniform vec3 uLut;
uniform vec2 uRes;
uniform float uFrame, uExpo, uSc;
in vec2 vUv;
out vec4 o;
float hash(vec2 p) { p = fract(p * vec2(443.897, 441.423)); p += dot(p, p.yx + 19.19); return fract((p.x + p.y) * p.x); }
vec3 gold(float s) { return vec3(pow(s, 0.8), pow(s, 1.18) * 0.9, pow(s, 3.2) * 0.72); }
vec3 teal(float s) { return vec3(pow(s, 2.9) * 0.86, pow(s, 1.08) * 0.98, pow(s, 1.2) * 0.94); }
vec3 red(float s) { return vec3(pow(s, 0.55), pow(s, 1.95) * 0.9, pow(s, 4.2) * 0.72); }
void main() {
  float I = texture(uHdr, vUv).r + texture(uBloom, vUv).r * 0.32;
  for (int k = 0; k < 2; k++) {
    float S = uSat[k].z;
    if (S <= 0.0) continue;
    vec2 d = (gl_FragCoord.xy - uSat[k].xy) / uSc;
    I += S * 6.0 * exp(-dot(d, d) / 90.0);
    // The filter mesh scatters a cross of diffraction spots on the diagonals.
    for (int a = 0; a < 2; a++) {
      vec2 ax = a == 0 ? vec2(0.7071, 0.7071) : vec2(0.7071, -0.7071);
      float al = dot(d, ax), ac = dot(d, vec2(-ax.y, ax.x));
      float spots = pow(0.5 + 0.5 * cos(6.2832 * al / 13.0), 3.0);
      float reach = 1.0 - smoothstep(40.0 + 120.0 * S, 120.0 + 420.0 * S, abs(al));
      I += S * 5.0 * exp(-ac * ac / 3.5) * spots * reach * 18.0 / (abs(al) + 12.0);
    }
    // Excess charge bleeds along the readout column.
    float bl = smoothstep(0.35, 0.8, S);
    I += bl * 2.2 * exp(-d.x * d.x / 0.9) * (1.0 - smoothstep(0.0, 60.0 + 340.0 * S, abs(d.y)));
  }
  float s = clamp(log2(1.0 + I * uExpo * 12.0) / log2(37.0), 0.0, 1.0);
  vec3 c = uLut.x * gold(s) + uLut.y * teal(s) + uLut.z * red(s);
  vec2 v = vUv - 0.5;
  c *= 1.0 - 0.35 * dot(v, v);
  // Shot noise, stronger in the dark.
  c += (hash(gl_FragCoord.xy + uFrame * 17.0) - 0.5) * 0.022 * (1.0 - s * 0.6);
  o = vec4(max(c, 0.0), 1.0);
}`;

export async function makeRender(gl) {
  if (!gl.getExtension('EXT_color_buffer_float') && !gl.getExtension('EXT_color_buffer_half_float')) throw new Error('no float targets');
  const P = await linked(gl, {
    sky: program(gl, TRI_VS, SKY),
    strand: program(gl, STRAND_VS, STRAND_FS),
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

  let hdr = null, W = 0, H = 0;
  function resize(w, h) {
    W = Math.max(2, w); H = Math.max(2, h);
    gl.canvas.width = W; gl.canvas.height = H;
    free(gl, hdr);
    hdr = target(gl, W, H);
  }
  // v: view, rot (sun to view), toSun, time, band, regs, flares, sat, count, bloomLevels, frameNo.
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
    const f = P.final;
    gl.useProgram(f.p);
    bind(gl, f, 'uHdr', 0, hdr);
    bind(gl, f, 'uBloom', 1, bt);
    gl.uniform4fv(f.u.uSat, v.sat);
    gl.uniform3fv(f.u.uLut, v.band.lut);
    gl.uniform2f(f.u.uRes, W, H);
    gl.uniform1f(f.u.uFrame, v.frameNo % 64);
    gl.uniform1f(f.u.uExpo, v.band.expo);
    gl.uniform1f(f.u.uSc, v.sc);
    tri(gl, null, empty);
  }
  return { resize, frame, data };
}
