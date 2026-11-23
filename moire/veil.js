// Moire veils: the shaders. Two passes: the veils in HDR, then bloom, grade and tone.
// The bands come from a Fourier model of the weave, never from screen pixels.
// Each cosine term fades by its own phase step per pixel and per frame.
import { GRADE } from '../shared/grade.js';

// The state block: eight vec4 per frame, now at 0 and the frame before at 8.
//   0: slide, twist (rad), breeze clock, gust
//   1: fold depth, sway, billow, unused
//   2 to 4: pull blobs: centre xy, displacement zw
//   5 to 7: tap rings: centre xy, radius, strength
export const STATE = 8;

export const VEIL_FS = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 o;
uniform vec2 uRes;
uniform vec4 uSt[16];
// Sun: centre xy in stage units, disc radius, strength.
uniform vec4 uSun;
// Weave: pitch, weft pitch ratio, front edge in cloth units, hem width.
uniform vec4 uWeave;
// Openness of one thread direction as a series: mean, first and second harmonic.
uniform vec3 uCw, uCf;
uniform vec3 uAlbF, uAlbR;
// Sheen colour and sharpness.
uniform vec4 uSheen;
// Look: room fill, diffraction gain, glow gain, fold depth.
uniform vec4 uLook;
const float PI = 3.14159265, TAU = 6.2831853;
// The eye sits CAM units in front of the front veil; the rear veil hangs GAP behind it.
const float CAM = 260.0, GAP = 3.5, BLOB_R2 = 240.0;
// Three pleat waves per veil: wave numbers, depths, phases, drift.
const vec3 FK = vec3(0.483, 0.861, 0.299);
const vec3 FA = vec3(0.62, 0.2, 0.9);
const vec3 FP = vec3(0.4, 2.1, 4.4);
const vec3 FW = vec3(0.11, -0.17, 0.07);

// One veil at stage point s: warp and weft phase, cloth x, cloth y.
// o picks the frame (0 now, 8 before); r is 0 for the front veil, 1 for the rear.
vec4 veil(vec2 s, int o, int r, out float J, out float slope) {
  vec4 a = uSt[o], b = uSt[o + 1];
  float rear = float(r), seed = rear * 2.3, t = a.z;
  // Perspective: the rear veil shows a little more cloth per unit.
  vec2 c = s * (CAM + GAP * rear) / CAM;
  // The breeze sways each veil sideways in slow waves.
  c.x -= b.y * (0.6 * sin(0.045 * c.y + 0.5 * t + seed) + 0.4 * sin(0.093 * c.y - 0.8 * t + 2.0 * seed));
  // A gust drives a billow across the cloth.
  c.x -= b.z * sin(0.07 * c.x + 0.035 * c.y - 2.1 * t + 3.0 * seed);
  float x = c.x - a.x * (1.0 - rear);
  // The pleats ride with the cloth; the arc across them unrolls the weave.
  float u = x, dz = 0.0;
  float amp = b.x * (1.0 - 0.12 * rear) * uLook.w;
  float bend = 0.4 * sin(0.021 * c.y + seed + 0.1 * t);
  for (int k = 0; k < 3; k++) {
    float K = FK[k], A = FA[k] * amp;
    float p = K * x + FP[k] * (1.0 + rear) + FW[k] * t + bend;
    float ak = A * K;
    u += 0.25 * ak * ak * x + 0.125 * A * ak * sin(2.0 * p);
    dz += ak * cos(p);
  }
  J = sqrt(1.0 + dz * dz);
  slope = dz;
  vec2 m = vec2(u, c.y);
  if (r == 0) {
    // The hand's pull: a soft blob of displacement round each grab.
    for (int i = 2; i < 5; i++) {
      vec4 q = uSt[o + i];
      vec2 d = c - q.xy;
      m -= q.zw * exp(-dot(d, d) / BLOB_R2);
    }
    // A tap sends a ring of push outward.
    for (int i = 5; i < 8; i++) {
      vec4 q = uSt[o + i];
      vec2 d = c - q.xy;
      float l = length(d) + 1e-3, e = l - q.z;
      m -= d / l * q.w * sin(e * 0.6) * exp(-e * e / 40.0);
    }
  }
  float tw = a.y * rear;
  vec2 w = mat2(cos(tw), sin(tw), -sin(tw), cos(tw)) * m;
  return vec4(TAU * w.x / uWeave.x, TAU * w.y / (uWeave.x * uWeave.y), m);
}

// The weight of one cosine term once a pixel and a frame average it.
// g is its phase step per pixel; d is its phase step since the last frame.
float att(vec2 g, float d) {
  float l = length(g);
  return exp(-0.8 * l * l - d * d / 24.0) * smoothstep(3.0, 1.7, l);
}
// The mean openness of one thread direction over the pixel.
float one(float p, vec2 g, float d, vec3 c) {
  return c.x + c.y * cos(p) * att(g, d) + c.z * cos(2.0 * p) * att(2.0 * g, 2.0 * d);
}
// The mean of the product of two thread directions: the moire lives here.
// Sum and difference terms each keep their own weight.
float pair(float pa, vec2 ga, float da, float pb, vec2 gb, float db, vec3 ca, vec3 cb) {
  float s = one(pa, ga, da, ca) * cb.x + (one(pb, gb, db, cb) - cb.x) * ca.x;
  for (int j = 1; j < 3; j++) for (int k = 1; k < 3; k++) {
    float fj = float(j), fk = float(k), w = 0.5 * ca[j] * cb[k];
    s += w * (cos(fj * pa - fk * pb) * att(fj * ga - fk * gb, fj * da - fk * db)
            + cos(fj * pa + fk * pb) * att(fj * ga + fk * gb, fj * da + fk * db));
  }
  return max(s, 0.0);
}
vec2 grad(float p) { return vec2(dFdx(p), dFdy(p)); }

// A spectrum from violet to red across one diffraction order.
vec3 spectrum(float x) {
  return clamp(vec3(1.5 - abs(4.0 * x - 3.0), 1.5 - abs(4.0 * x - 2.0), 1.5 - abs(4.0 * x - 1.0)), 0.0, 1.0);
}
// The sun through a weave: a cross of spikes across the threads, smeared into colour.
vec3 spikes(vec2 d, float ang) {
  vec3 acc = vec3(0.0);
  for (int i = 0; i < 2; i++) {
    float a = ang + float(i) * PI * 0.5;
    vec2 e = vec2(cos(a), sin(a));
    float t = abs(dot(d, e)), q = dot(d, vec2(-e.y, e.x));
    float wq = 0.22 + 0.01 * t;
    float line = exp(-q * q / (wq * wq)) * exp(-t / 26.0) / (1.0 + 0.04 * t);
    float ord = t * uWeave.x / 4.2;
    acc += line * mix(vec3(1.0), spectrum(fract(ord)) * 1.7, smoothstep(0.15, 0.9, ord));
  }
  return acc;
}

void main() {
  float asp = uRes.x / uRes.y;
  vec2 s = (vUv - 0.5) * vec2(asp, 1.0) * 100.0;
  float Jf, Jr, sf, sr, j0, j1;
  vec4 f = veil(s, 0, 0, Jf, sf), fp = veil(s, 8, 0, j0, j1);
  vec4 r = veil(s, 0, 1, Jr, sr), rp = veil(s, 8, 1, j0, j1);
  vec2 gfw = grad(f.x), gff = grad(f.y), grw = grad(r.x), grf = grad(r.y);
  vec2 df = f.xy - fp.xy, dr = r.xy - rp.xy;

  // The front veil ends at its edge; the edge folds under into a hem.
  float edge = uWeave.z, hemW = uWeave.w, aw = fwidth(f.z) * 0.75 + 1e-4;
  float onF = smoothstep(edge - aw, edge + aw, f.z);
  float hem = onF * (1.0 - smoothstep(edge + hemW - aw, edge + hemW + aw, f.z));
  // The ply under the hem is a mirror of the cloth, a little off true.
  // The seam wavers, so the hem carries a chain of light beads.
  const float HT = 0.02;
  mat2 hr = mat2(cos(HT), sin(HT), -sin(HT), cos(HT));
  vec2 hs = TAU / (uWeave.x * vec2(1.0, uWeave.y));
  vec2 h = hr * vec2(2.0 * edge - f.z + 0.11 + 0.3 * sin(f.w * 0.13), f.w) * hs;
  vec2 hp = hr * vec2(2.0 * edge - fp.z + 0.11 + 0.3 * sin(fp.w * 0.13), fp.w) * hs;
  vec2 ghw = grad(h.x), ghf = grad(h.y), dh = h - hp;

  float Tf = one(f.x, gfw, df.x, uCw) * one(f.y, gff, df.y, uCf);
  float Tr = one(r.x, grw, dr.x, uCw) * one(r.y, grf, dr.y, uCf);
  float P = pair(f.x, gfw, df.x, r.x, grw, dr.x, uCw, uCw) * pair(f.y, gff, df.y, r.y, grf, dr.y, uCf, uCf);
  float H = pair(f.x, gfw, df.x, h.x, ghw, dh.x, uCw, uCw) * pair(f.y, gff, df.y, h.y, ghf, dh.y, uCf, uCf);
  P = mix(P, P * H / max(Tf, 1e-3), hem);
  Tf = mix(Tf, H, hem);
  // A steep fold packs more cloth into the pixel.
  float t0 = uCw.x * uCf.x;
  float kf = pow(t0, Jf - 1.0), kr = pow(t0, Jr - 1.0);
  Tf *= kf; Tr *= kr; P *= kf * kr;
  // Where the front veil is absent, light meets the rear veil alone.
  Tf = mix(1.0, Tf, onF);
  P = mix(Tr, P, onF);

  // The light behind: evening glow over a dark sill, a low sun and its halo.
  vec2 ds = s - uSun.xy;
  float rr = length(ds);
  vec3 sunC = vec3(1.0, 0.56, 0.24);
  // The window: a dark sill below, light falling off away from the sun.
  float win = smoothstep(-62.0, -30.0, s.y) * (1.0 - 0.5 * smoothstep(20.0, 62.0, s.y));
  win *= exp(-pow(max(abs(ds.x) - 18.0, 0.0) / 55.0, 2.0));
  vec3 sky = mix(vec3(0.46, 0.2, 0.07), vec3(0.05, 0.07, 0.17), smoothstep(-30.0, 45.0, s.y)) * win;
  vec3 Lsoft = sky + sunC * uSun.w * (0.7 * exp(-rr / 24.0) + 1.6 * exp(-rr / 7.0));
  vec3 L = Lsoft + sunC * uSun.w * 26.0 * smoothstep(uSun.z, uSun.z * 0.75, rr);

  vec3 col = L * P;
  // Rear threads glow, seen through the front gaps.
  col += uAlbR * Lsoft * (Tf - P) * Jr * uLook.z;
  // Front threads glow where they sit behind rear gaps, and dimly behind rear threads.
  col += onF * uAlbF * Lsoft * ((Tr - P) + 0.5 * uAlbR * (1.0 - Tf - Tr + P)) * Jf * uLook.z;
  // Room light in front: a dim fill and a sheen on the fold crests.
  vec3 lv = normalize(vec3(-0.55, 0.5, 0.75)), hv = normalize(lv + vec3(0.0, 0.0, 1.0));
  vec3 nf = normalize(vec3(-sf, 0.0, 1.0)), nr = normalize(vec3(-sr, 0.0, 1.0));
  float cf = onF * (1.0 - Tf), cr = (1.0 - Tr) * Tf;
  vec3 fill = vec3(0.008, 0.009, 0.014) * uLook.x;
  col += fill * (cf * (0.55 + 0.45 * dot(nf, lv)) + 0.5 * cr * (0.55 + 0.45 * dot(nr, lv)));
  col += uSheen.rgb * uLook.x * (cf * pow(max(dot(nf, hv), 0.0), uSheen.w) + 0.4 * cr * pow(max(dot(nr, hv), 0.0), uSheen.w));
  // Diffraction: one cross per veil, turned with its weave.
  vec3 dif = spikes(ds, 0.0) * onF * Tr + spikes(ds, -uSt[0].y) * Tf;
  col += dif * sunC * uSun.w * uLook.y;
  o = vec4(col, 1.0);
}`;

export const FINAL_FS = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 o;
uniform sampler2D uScene, uBloom;
uniform vec2 uRes;
uniform float uBloomK, uExp, uSeed;
${GRADE}
void main() {
  vec3 c = texture(uScene, vUv).rgb + texture(uBloom, vUv).rgb * uBloomK;
  c = gdGrade(c * uExp, vUv, uRes.x / uRes.y, gl_FragCoord.xy + vec2(uSeed * 37.0, uSeed * 91.0), vec3(0.004, 0.003, 0.006), 0.5, 0.38, 0.035);
  // A filmic curve, then display gamma.
  c = clamp((c * (2.51 * c + 0.03)) / (c * (2.43 * c + 0.59) + 0.14), 0.0, 1.0);
  o = vec4(pow(c, vec3(1.0 / 2.2)), 1.0);
}`;
