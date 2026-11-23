// Stir vortex renderer: raw WebGL2.
// Passes: dye splat into a 3D atlas, bench, scene, bloom, grade.
// Each program stays small, so D3D11 links it fast.
import { TRI_VS, program, linked, target, free, bind, tri } from '../shared/gl.js';
import { bloomChain } from '../shared/glow.js';
import { GRADE } from '../shared/grade.js';
import { RIG, FUNNEL, FMEAN, CAP } from './rig.js';

const HEAD = `#version 300 es
precision highp float;
`;
const f4 = v => v.toFixed(5);
const AW = RIG.GN * RIG.GC, AH = RIG.GN * Math.ceil(RIG.GS / RIG.GC);

// Sizes, the camera ray, the stirrer, the beaker and the room light.
const COMMON = `${HEAD}
uniform vec3 uCamPos;
uniform mat3 uCamRot;
uniform vec3 uLens;
uniform vec3 uKey;
uniform float uKnob, uLamp;
uniform vec4 uBar;
// A uniform zero keeps D3D from unrolling each march: links in seconds, not minutes.
uniform int uZero;
const float BX = ${f4(RIG.BX)}, BH = ${f4(RIG.BH)}, BZ = ${f4(RIG.BZ)}, BR = ${f4(RIG.BR)};
const float PT = ${f4(RIG.PT)}, RB = ${f4(RIG.RB)}, TH = ${f4(RIG.TH)}, RI = ${f4(RIG.RI)};
const float FL = ${f4(RIG.FL)}, TOP = ${f4(RIG.TOP)}, WL = ${f4(RIG.WL)};
const float KX = ${f4(RIG.KX)}, KY = ${f4(RIG.KY)}, KR = ${f4(RIG.KR)}, KD = ${f4(RIG.KD)};
const float BL = ${f4(RIG.BL)}, BRAD = ${f4(RIG.BRAD)}, BARY = ${f4(RIG.BARY)};
const float ZW = -0.17;
in vec2 vUv;
out vec4 o;

vec3 camRay(vec2 uv) {
  vec2 s = uv * 2.0 - 1.0;
  s.y -= uLens.z;
  return normalize(uCamRot * vec3(s.x * uLens.x, s.y * uLens.y, -1.0));
}
float sdRBox(vec3 p, vec3 b, float r) {
  vec3 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0) - r;
}
// The stirrer: body, ceramic plate, knob with its skirt, the lamp.
// x is the distance, y the part: 1 body, 2 plate, 3 knob, 4 lamp.
vec2 device(vec3 p) {
  vec2 h = vec2(sdRBox(p - vec3(0.0, BH * 0.5, 0.0), vec3(BX, BH * 0.5, BZ), BR), 1.0);
  float pl = sdRBox(p - vec3(0.0, PT - 0.003, 0.0), vec3(0.086, 0.003, 0.086), 0.004);
  if (pl < h.x) h = vec2(pl, 2.0);
  vec3 k = p - vec3(KX, KY, BZ);
  vec2 kd = abs(vec2(length(k.xy), k.z - KD * 0.5)) - vec2(KR - 0.002, KD * 0.5 - 0.002);
  float kn = length(max(kd, 0.0)) + min(max(kd.x, kd.y), 0.0) - 0.002;
  vec2 sd = abs(vec2(length(k.xy), k.z - 0.001)) - vec2(KR + 0.0032, 0.001);
  kn = min(kn, length(max(sd, 0.0)) + min(max(sd.x, sd.y), 0.0) - 0.0005);
  if (kn < h.x) h = vec2(kn, 3.0);
  float lp = length(p - vec3(-KX, KY + 0.004, BZ - 0.0012)) - 0.0028;
  if (lp < h.x) h = vec2(lp, 4.0);
  return h;
}
// The glow on the wall behind the beaker: the light that carries the scene.
vec3 wallGlow(vec3 ro, vec3 rd) {
  if (rd.z >= -1e-3) return vec3(0.0);
  float t = (ZW - ro.z) / rd.z;
  vec3 q = ro + rd * t;
  if (q.y < 0.0) return vec3(0.0);
  vec2 d = (q.xy - vec2(-0.012, 0.085)) * vec2(0.75, 1.0);
  float r2 = dot(d, d);
  float g = 1.0 / pow(1.0 + r2 / 0.008, 1.9) * 0.3 + exp(-r2 / 0.004) * 0.22;
  return vec3(0.74, 0.84, 1.0) * g * smoothstep(0.0, 0.05, q.y);
}
// The dark room seen in glass: the glow, a cool softbox at the key, a warm strip at the right.
vec3 env(vec3 d) {
  vec3 c = vec3(0.004, 0.0045, 0.006);
  c += wallGlow(vec3(0.0, 0.1, 0.0), d);
  vec3 a = normalize(vec3(d.x, d.y * 0.4, d.z)), k = normalize(vec3(uKey.x, uKey.y * 0.4, uKey.z));
  c += vec3(4.2, 4.5, 5.0) * smoothstep(0.955, 0.985, dot(a, k)) * smoothstep(-0.2, 0.25, d.y);
  vec3 b = normalize(vec3(d.x, d.y * 0.25, d.z));
  c += vec3(1.1, 0.72, 0.42) * smoothstep(0.985, 0.996, dot(b, normalize(vec3(0.95, 0.0, 0.3)))) * smoothstep(-0.1, 0.1, d.y) * smoothstep(0.75, 0.3, d.y);
  return c;
}
// How much of the spinning bar covers a point, from 0 to 1.
// uBar: angle, blur arc, light the bar takes, unused.
float barCover(vec3 p, out float dist) {
  vec3 q = p - vec3(0.0, BARY, 0.0);
  float r = length(q.xz);
  float th = atan(q.z, q.x);
  float arc = min(uBar.y, 3.14159);
  // The nearest angle the bar held in the blur arc; the bar has two ends.
  float d = mod(th - uBar.x + 1.5708, 3.14159) - 1.5708;
  float a = uBar.x + clamp(d, -arc, 0.0);
  float c = cos(a), s = sin(a);
  vec3 b = vec3(c * q.x + s * q.z, q.y, -s * q.x + c * q.z);
  b.x = abs(b.x);
  vec3 e = b - vec3(min(b.x, BL - BRAD), 0.0, 0.0);
  float cap = length(e) - BRAD;
  // The pivot ring round the middle.
  vec2 rd = abs(vec2(length(b.yz), b.x)) - vec2(BRAD + 0.0009, 0.0011);
  float ring = length(max(rd, 0.0)) + min(max(rd.x, rd.y), 0.0) - 0.0003;
  dist = min(cap, ring);
  float w = 2.0 * atan(BRAD, max(r, 1e-4));
  return clamp(w / max(arc, w), 0.0, 1.0);
}
`;

/* ---------- splat: tracers into the dye atlas ---------- */
const SPLAT_VS = `#version 300 es
precision highp float;
in vec4 aP;
uniform vec3 uAbs[3];
out vec4 vC;
const float RI = ${f4(RIG.RI)}, FL = ${f4(RIG.FL)}, GH = ${f4(RIG.GH)};
const float GN = ${RIG.GN}.0, GS = ${RIG.GS}.0, GC = ${RIG.GC}.0;
const vec2 ATLAS = vec2(${AW}.0, ${AH}.0);
void main() {
  float dye = floor(aP.w * 0.25);
  float w = aP.w - dye * 4.0;
  vec3 g = vec3((aP.x + RI) / (2.0 * RI), (aP.y - FL) / GH, (aP.z + RI) / (2.0 * RI));
  float s = g.y * GS - 0.5;
  float s0 = floor(s), f = s - s0;
  // Vertex 0 writes the lower slice, vertex 1 the upper one.
  float si = s0 + float(gl_VertexID);
  float k = gl_VertexID == 0 ? 1.0 - f : f;
  if (si < 0.0 || si > GS - 1.0) k = 0.0;
  si = clamp(si, 0.0, GS - 1.0);
  vec2 cell = clamp(g.xz * GN, 0.5, GN - 0.5);
  vec2 px = vec2(mod(si, GC), floor(si / GC)) * GN + cell;
  gl_Position = vec4(px / ATLAS * 2.0 - 1.0, 0.0, 1.0);
  gl_PointSize = 4.0;
  vC = vec4(uAbs[int(dye)], 1.0) * w * k;
}`;
const SPLAT_FS = `${HEAD}
in vec4 vC;
out vec4 o;
void main() {
  vec2 d = gl_PointCoord - 0.5;
  // A Gaussian about one cell wide.
  o = vC * exp(-dot(d, d) * 14.0) * 0.48;
}`;

/* ---------- bench: the bench, the wall, the stirrer and its light ---------- */
const BENCH = `${COMMON}
uniform float uDip;
vec3 nDev(vec3 p) {
  vec2 e = vec2(0.0004, -0.0004);
  return normalize(e.xyy * device(p + e.xyy).x + e.yyx * device(p + e.yyx).x + e.yxy * device(p + e.yxy).x + e.xxx * device(p + e.xxx).x);
}
// The beaker's shadow on the plate: water and glass pass most light.
// Under the funnel the surface spreads the light: a dim spot ringed bright.
float beakerLight(vec3 p, vec3 l) {
  // Where the light ray crosses the water surface.
  vec3 s = p + l * ((WL - p.y) / l.y);
  float rs = length(s.xz);
  // Where it crosses the wall band, from the plate to the rim.
  float sh = 1.0;
  float rp = length(p.xz);
  if (rp < RB) {
    float fun = uDip / ${f4(FUNNEL.DMAX)};
    float spot = exp(-rs * rs / 0.00008);
    float ring = exp(-pow((rs - 0.0105) / 0.0045, 2.0));
    sh = 0.86 * (1.0 - 0.55 * fun * spot + 0.35 * fun * ring);
    // A bright line inside the wall foot, where the glass focuses.
    sh += 0.5 * smoothstep(RB - 0.004, RB - 0.0015, rp) * smoothstep(RB, RB - 0.0012, rp);
    // The bar's shadow lies just under it.
    float dd;
    float cv = barCover(p + l * ((BARY - p.y) / l.y), dd);
    sh *= 1.0 - 0.75 * cv * smoothstep(0.0012, -0.0005, dd);
  } else {
    // Outside: the glass and water throw a pale shadow with a focused heart.
    vec2 ld = normalize(l.xz);
    float along = -dot(p.xz, ld);
    float side = abs(p.x * ld.y - p.z * ld.x);
    float yAt = along / max(length(l.xz), 0.1) * l.y;
    if (along > 0.0 && yAt < TOP - PT && side < RB + 0.004) {
      float u = side / RB;
      float edge = smoothstep(0.84, 1.0, u) * (1.0 - smoothstep(1.0, 1.06, u));
      sh = u < 1.0 ? 0.84 - 0.5 * edge : 1.0;
      sh += smoothstep(1.07, 1.0, u) * smoothstep(0.97, 1.01, u) * 0.6;
      if (yAt < WL - PT) sh += exp(-u * u * 24.0) * 1.6;
    }
  }
  return sh;
}
void main() {
  vec3 ro = uCamPos, rd = camRay(vUv);
  vec3 c = vec3(0.0);
  // The stirrer: a march inside its bounds.
  float t = 0.3, hit = 0.0;
  vec3 p = ro;
  for (int i = 0; i < 80 + uZero; i++) {
    p = ro + rd * t;
    vec2 h = device(p);
    if (h.x < 0.0002) { hit = h.y; break; }
    t += h.x;
    if (t > 2.0 || p.y < -0.01) break;
  }
  vec3 l = uKey;
  vec3 fillD = normalize(vec3(0.7, 0.25, 0.9));
  if (hit > 0.5) {
    vec3 n = nDev(p);
    float ao = clamp(0.35 + 0.65 * device(p + n * 0.008).x / 0.008, 0.2, 1.0);
    vec3 alb = vec3(0.028, 0.029, 0.032);
    float rough = 60.0;
    if (hit > 1.5 && hit < 2.5) { alb = vec3(0.17, 0.17, 0.168); rough = 30.0; }
    if (hit > 2.5 && hit < 3.5) {
      alb = vec3(0.02, 0.02, 0.022);
      // The white index line on the knob face and its rim.
      vec3 k = p - vec3(KX, KY, BZ);
      float a = atan(k.x, k.y) - uKnob;
      a = mod(a + 3.14159, 6.28318) - 3.14159;
      float rr = length(k.xy);
      float line = smoothstep(0.09, 0.05, abs(a) * max(rr, 0.004) / 0.004) * step(0.004, rr) * step(KD * 0.6, k.z);
      alb = mix(alb, vec3(0.8), line);
    }
    float ndl = max(dot(n, l), 0.0);
    float sh = 1.0;
    if (hit > 1.5 && hit < 2.5 && n.y > 0.9) sh = beakerLight(p, l);
    c = alb * vec3(3.4, 3.55, 3.8) * ndl * sh;
    c += alb * vec3(0.5, 0.4, 0.3) * 0.4 * max(dot(n, fillD), 0.0);
    // The wall glow lights the back faces.
    c += alb * vec3(0.5, 0.55, 0.65) * 0.35 * max(-n.z, 0.0);
    vec3 h = normalize(l - rd);
    c += vec3(0.6) * pow(max(dot(n, h), 0.0), rough) * (hit > 1.5 && hit < 2.5 ? 0.2 : 0.5) * sh;
    float F = 0.04 + 0.96 * pow(1.0 - max(dot(-rd, n), 0.0), 5.0);
    c += env(reflect(rd, n)) * F * (hit > 1.5 && hit < 2.5 ? 0.25 : 0.6);
    c *= ao;
    if (hit > 3.5) c = vec3(1.0, 0.55, 0.16) * (0.04 + 2.6 * uLamp) + c * 0.3;
    // The lamp spills a little warm light on the front face.
  } else {
    float tb = rd.y < 0.0 ? -ro.y / rd.y : 1e9;
    vec3 q = ro + rd * tb;
    if (tb < 1e8 && q.z > ZW) {
      // The black epoxy bench, lit by the key and the wall glow.
      float spot = smoothstep(0.55, 0.02, length((q.xz - vec2(-0.04, 0.0)) * vec2(0.8, 1.1)));
      vec3 alb = vec3(0.014, 0.0145, 0.017);
      // The stirrer's soft shadow: the body blocks the key.
      vec3 s = q + l * ((BH * 0.6) / l.y);
      vec2 dd = abs(s.xz) - vec2(BX, BZ);
      float shd = smoothstep(-0.01, 0.025, max(dd.x, dd.y));
      c = alb * vec3(3.4, 3.55, 3.8) * l.y * spot * shd;
      // Contact shadow round the body.
      vec2 bd = abs(q.xz) - vec2(BX, BZ);
      c *= mix(0.3, 1.0, smoothstep(0.0, 0.03, max(bd.x, bd.y)));
      // Epoxy sheen: the wall glow and the key in the bench.
      vec3 rr = reflect(rd, vec3(0.0, 1.0, 0.0));
      c += wallGlow(q, rr) * 0.05 * smoothstep(-0.02, 0.03, max(bd.x, bd.y) + 0.06 * step(0.0, -q.z));
      c += wallGlow(q, vec3(0.0, 0.3, -1.0)) * alb * 1.5;
      c += vec3(0.012, 0.012, 0.014) * exp(-q.z * q.z * 4.0) * spot;
      c = mix(vec3(0.0015, 0.0016, 0.002), c, smoothstep(0.7, 0.25, q.z));
    } else {
      // The wall: dark, with the glow behind the beaker.
      c = vec3(0.003, 0.0033, 0.004) + wallGlow(ro, rd);
    }
  }
  o = vec4(c, 1.0);
}`;

/* ---------- scene: the beaker, the water, the dye, the bar, the pipette ---------- */
const SCENE = `${COMMON}
precision highp sampler2D;
uniform sampler2D uBench, uDye;
uniform float uDip;
uniform vec4 uWob;
uniform vec4 uRip;
uniform vec4 uPip;
uniform vec4 uDrop;
uniform vec3 uDropC;
uniform vec3 uTint;
uniform float uFluo;
// Thread detail: core angle, drift phase, strength.
uniform vec3 uSwirl;
const float FA = ${f4(FUNNEL.A)}, FP = ${f4(FUNNEL.P)}, FMEAN = ${f4(FMEAN)};
const float GH = ${f4(RIG.GH)}, GN = ${RIG.GN}.0, GS = ${RIG.GS}.0, GC = ${RIG.GC}.0;
const vec2 ATLAS = vec2(${AW}.0, ${AH}.0);

// The free surface: height and slope at a point.
float surf(vec3 p, out vec3 n) {
  float k = clamp((WL - p.y) / max(uDip, 0.002), 0.0, 1.0);
  vec2 c = p.xz - uWob.xy * k;
  float r = max(length(c), 1e-5);
  float u = 1.0 + r * r / (FA * FA);
  float F = pow(u, -FP);
  float h = WL + uDip * (FMEAN - F);
  float dh = uDip * FP * (2.0 * r / (FA * FA)) * F / u;
  // Small rings from a drop, spreading and dying.
  vec2 rq = p.xz - uRip.xy;
  float rr = length(rq);
  float ph = rr - uRip.z * 0.18;
  float amp = uRip.w * exp(-ph * ph / 0.00004) * exp(-uRip.z * 2.5);
  h += amp * sin(ph * 900.0) * 0.0006;
  float dr = amp * cos(ph * 900.0) * 0.54;
  vec2 g = c / r * dh + rq / max(rr, 1e-4) * dr;
  n = normalize(vec3(-g.x, 1.0, -g.y));
  return h;
}
// Dye at a point: rgb absorption, a amount.
vec4 tileAt(float si, vec2 cell) {
  vec2 px = vec2(mod(si, GC), floor(si / GC)) * GN + cell;
  return texture(uDye, px / ATLAS);
}
vec4 dyeAt(vec3 p) {
  vec3 g = vec3((p.x + RI) / (2.0 * RI), (p.y - FL) / GH, (p.z + RI) / (2.0 * RI));
  float s = clamp(g.y * GS - 0.5, 0.0, GS - 1.001);
  float s0 = floor(s);
  vec2 cell = clamp(g.xz * GN, 0.5, GN - 0.5);
  return mix(tileAt(s0, cell), tileAt(s0 + 1.0, cell), s - s0);
}
// Helical threads: a pattern that turns with the core and slides down it.
// It shapes the tracer density into strands, as Fire's grain shapes its smoke.
float threads(vec3 p) {
  float r = max(length(p.xz), 1e-4);
  float th = atan(p.z, p.x);
  float a = 3.0 * (th - uSwirl.x) + 230.0 * (p.y - WL) + uSwirl.y + 7.0 * log(r / 0.01);
  float b = 5.0 * (th - uSwirl.x) + 400.0 * (p.y - WL) + 2.3 * uSwirl.y + 11.0 * log(r / 0.01);
  float k = 0.5 + 0.5 * sin(a);
  float m = 0.5 + 0.5 * sin(b + 1.7 * sin(a));
  float pat = k * k * k * 3.2 * (0.6 + 0.8 * m * m);
  return mix(1.0, pat, uSwirl.z * smoothstep(0.034, 0.012, r));
}
float fres(float c, float f0) { float k = 1.0 - c; return f0 + (1.0 - f0) * k * k * k * k * k; }
// The pipette: a glass tube on a long capillary, under a rubber teat.
// uPip: tip x, y, z and the squeeze.
float sdPip(vec3 p, out float part) {
  part = 0.0;
  if (uPip.w < -0.5) return 1e3;
  vec3 q = p - uPip.xyz;
  float r = length(q.xz);
  float cap = max(r - mix(0.0011, 0.0016, clamp(q.y / 0.04, 0.0, 1.0)), abs(q.y - 0.022) - 0.022);
  float body = max(r - 0.0036, abs(q.y - 0.083) - 0.04);
  float neck = max(r - mix(0.0016, 0.0036, clamp((q.y - 0.036) / 0.008, 0.0, 1.0)), abs(q.y - 0.04) - 0.005);
  float g = min(min(cap, body), neck);
  float sq = clamp(uPip.w, 0.0, 1.0);
  vec3 tq = q - vec3(0.0, 0.139, 0.0);
  vec3 tr = vec3(0.0058 * (1.0 + 0.25 * sq), 0.017 * (1.0 - 0.18 * sq), 0.0058 * (1.0 - 0.3 * sq));
  float k0 = length(tq / tr), k1 = length(tq / (tr * tr));
  float teat = k0 * (k0 - 1.0) / max(k1, 1e-5);
  teat = min(teat, max(r - 0.0047, abs(q.y - 0.125) - 0.004));
  if (teat < g) { part = 1.0; return teat; }
  return g;
}
vec3 nPip(vec3 p) {
  vec2 e = vec2(0.0003, -0.0003);
  float a;
  return normalize(e.xyy * sdPip(p + e.xyy, a) + e.yyx * sdPip(p + e.yyx, a) + e.yxy * sdPip(p + e.yxy, a) + e.xxx * sdPip(p + e.xxx, a));
}
// The bench and plate behind the glass, read back from the bench pass.
vec3 project(vec3 p, vec3 fb) {
  vec3 v = p - uCamPos;
  vec3 c = transpose(uCamRot) * v;
  if (c.z > -1e-3) return fb;
  vec2 s = vec2(c.x / -c.z / uLens.x, c.y / -c.z / uLens.y + uLens.z);
  vec2 uv = s * 0.5 + 0.5;
  if (any(lessThan(uv, vec2(0.0))) || any(greaterThan(uv, vec2(1.0)))) return fb;
  return texture(uBench, uv).rgb;
}
// What a ray sees once it leaves the beaker.
vec3 room(vec3 q, vec3 d) {
  if (d.y < 0.0) {
    float t = (PT - q.y) / d.y;
    vec3 h = q + d * t;
    if (max(abs(h.x), abs(h.z)) < 0.086) return project(h, vec3(0.2));
    t = -q.y / d.y;
    h = q + d * t;
    if (h.z > ZW) return project(h, vec3(0.003));
  }
  return vec3(0.003, 0.0033, 0.004) + wallGlow(q, d);
}
// Shades the pipette: thin glass round dye in the capillary, a dark rubber teat.
vec3 shadePip(vec3 p, vec3 rd, float part) {
  vec3 n = nPip(p);
  float c = max(dot(-rd, n), 0.0);
  float F = fres(c, 0.04);
  vec3 refl = env(reflect(rd, n));
  if (part > 0.5) {
    vec3 alb = vec3(0.14, 0.035, 0.03);
    float ndl = max((dot(n, uKey) + 0.15) / 1.15, 0.0);
    vec3 col = alb * vec3(2.0, 2.1, 2.2) * ndl + alb * 0.08;
    col += vec3(0.4) * pow(max(dot(n, normalize(uKey - rd)), 0.0), 40.0) * 0.3;
    return col + refl * F * 0.5;
  }
  vec3 q = p - uPip.xyz;
  vec3 through = room(p, rd) * 0.9;
  // The lowest centimetre holds dye.
  float dyeIn = step(q.y, 0.012) * smoothstep(0.0, 0.002, q.y);
  through *= mix(vec3(1.0), exp(-uDropC * 2.2), dyeIn);
  float edge = pow(1.0 - c, 3.0);
  return through * (1.0 - F) + refl * F + vec3(0.08, 0.09, 0.1) * edge;
}
// The falling drop: a small dyed lens.
vec3 shadeDrop(vec3 p, vec3 rd) {
  vec3 n = normalize(p - uDrop.xyz);
  float c = max(dot(-rd, n), 0.0);
  float F = fres(c, 0.02);
  vec3 col = room(p, refract(rd, n, 0.75)) * exp(-uDropC * 2.6);
  return col * (1.0 - F) + env(reflect(rd, n)) * F + vec3(2.0) * pow(max(dot(reflect(rd, n), uKey), 0.0), 200.0);
}
// The stir bar: white PTFE, lit through the water.
vec3 shadeBar(vec3 p, vec3 rd) {
  vec3 q = p - vec3(0.0, BARY, 0.0);
  float d0;
  barCover(p, d0);
  vec2 e = vec2(0.0003, 0.0);
  float a, b, c;
  barCover(p + e.xyy, a); barCover(p + e.yxy, b); barCover(p + e.yyx, c);
  vec3 n = normalize(vec3(a, b, c) - d0);
  float ndl = max(dot(n, uKey), 0.0);
  vec3 alb = vec3(0.82, 0.83, 0.8);
  vec3 col = alb * (vec3(1.9, 2.0, 2.1) * ndl * uBar.z + vec3(0.3, 0.31, 0.32) * (0.6 + 0.4 * n.y) + vec3(0.25) * max(-n.y, 0.0));
  col += vec3(0.5) * pow(max(dot(n, normalize(uKey - rd)), 0.0), 30.0) * uBar.z;
  return col;
}
// Sunlight in the water: the key from above, the plate bounce from below.
vec3 lightIn(vec3 p) {
  return vec3(1.25, 1.3, 1.4) + vec3(0.55, 0.56, 0.55) * smoothstep(FL + 0.03, FL, p.y) + wallGlow(p, vec3(0.0, 0.1, -1.0)) * 0.4;
}

// The march inside the beaker. It starts at q in air or in water.
vec3 inner(vec3 q, vec3 dir) {
  vec3 T = vec3(1.0), S = vec3(0.0);
  vec3 sn;
  bool water = q.y < surf(q, sn);
  bool barDone = false;
  // Interleaved gradient noise shifts each pixel's steps: no banding.
  float jit = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));
  q += dir * jit * 0.0012;
  vec3 prev = q;
  int events = 0, kind = 0;
  float pPart = 0.0;
  for (int i = 0; i < 150 + uZero; i++) {
    float r = length(q.xz);
    // Out through the wall, the floor or the mouth.
    if (r > RI) {
      // Land on the wall itself: the exit normal decides total reflection.
      vec2 oq = prev.xz, dq = dir.xz;
      float A = max(dot(dq, dq), 1e-8), B = dot(oq, dq), C = dot(oq, oq) - RI * RI;
      float tw = (-B + sqrt(max(B * B - A * C, 0.0))) / A;
      q = prev + dir * max(tw, 0.0);
      r = length(q.xz);
      vec3 nw = vec3(q.x / r, 0.0, q.z / r);
      if (water) {
        vec3 tdir = refract(dir, -nw, 1.333);
        // One bounce on the wall at most: more chains near the critical angle band.
        if (dot(tdir, tdir) < 0.5 && events < 3) { dir = reflect(dir, -nw); q -= nw * 0.0002; events += 3; continue; }
        if (dot(tdir, tdir) < 0.5) { tdir = dir; T *= 0.6; }
        float F = fres(max(dot(tdir, nw), 0.0), 0.02);
        S += T * F * vec3(0.05, 0.06, 0.07);
        T *= 1.0 - F;
        dir = tdir;
      }
      // The glass of the wall tints a grazing path.
      T *= exp(-vec3(14.0, 7.0, 10.0) * TH / max(abs(dot(dir, nw)), 0.08));
      q += dir * 0.004;
      break;
    }
    if (q.y < FL) {
      if (dir.y < 0.0) q = prev + dir * ((FL - prev.y) / dir.y);
      if (water) {
        // The floor passes the plate's light; a grazing ray dims instead of bouncing.
        vec3 tdir = refract(dir, vec3(0.0, 1.0, 0.0), 1.333);
        if (dot(tdir, tdir) < 0.5) { S += T * 0.35 * env(reflect(dir, vec3(0.0, 1.0, 0.0))); T *= 0.55; }
        else dir = tdir;
      }
      T *= exp(-vec3(14.0, 7.0, 10.0) * 0.003 / max(abs(dir.y), 0.1));
      break;
    }
    if (q.y > TOP + 0.002) break;
    float h = surf(q, sn);
    float f = q.y - h;
    if (water == (f > 0.0) && events < 8) {
      // A crossing of the free surface: find it, then bend or reflect.
      vec3 a = prev, b = q;
      for (int k = 0; k < 6 + uZero; k++) {
        vec3 m = (a + b) * 0.5;
        vec3 nn;
        bool mw = m.y < surf(m, nn);
        if (mw == water) a = m; else b = m;
      }
      q = (a + b) * 0.5;
      surf(q, sn);
      events++;
      if (water) {
        // From the water up into the air: total internal reflection on steep walls.
        vec3 tdir = refract(dir, -sn, 1.333);
        if (dot(tdir, tdir) < 0.5 && events > 4) { tdir = dir; T *= 0.5; }
        if (dot(tdir, tdir) < 0.5) {
          dir = reflect(dir, -sn);
          S += T * vec3(0.012, 0.014, 0.016);
          q += dir * 0.0003;
        } else {
          float F = fres(max(dot(tdir, sn), 0.0), 0.02);
          S += T * F * env(reflect(dir, -sn)) * 0.55;
          T *= 1.0 - F;
          dir = tdir;
          water = false;
          q += dir * 0.0003;
        }
      } else {
        // From the air down into the water: a glint of the room, then bend.
        float cw = max(dot(-dir, sn), 0.0);
        float F = fres(cw, 0.02);
        vec3 rf = reflect(dir, sn);
        S += T * F * env(rf);
        S += T * vec3(2.6, 2.7, 2.9) * pow(max(dot(rf, uKey), 0.0), 400.0);
        // The meniscus: a bright rim where the water climbs the glass.
        S += T * vec3(0.25, 0.28, 0.32) * smoothstep(0.0025, 0.0, RI - length(q.xz));
        T *= 1.0 - F;
        dir = refract(dir, sn, 1.0 / 1.333);
        water = true;
        q += dir * 0.0003;
      }
      prev = q;
      continue;
    }
    float stp;
    if (water) {
      // Dye: Beer-Lambert absorption, a little scatter, fluorescein glows.
      vec4 dy = dyeAt(q);
      dy *= threads(q);
      vec3 sig = dy.rgb * 420.0 + uTint * 12.0 + vec3(1.6, 0.45, 0.3);
      float am = dy.a + 1e-4;
      float fl = max(dy.b - dy.r - 0.35 * dy.g, 0.0) * uFluo + uTint.b * 0.02 * uFluo;
      vec3 Li = lightIn(q);
      vec3 alb = exp(-2.0 * dy.rgb / am);
      vec3 sc = alb * dy.a * 5.0 * Li + vec3(0.3, 1.2, 0.35) * fl * 200.0 * Li.g;
      float dist = clamp(abs(f) * 0.6, 0.0006, 0.0022);
      if (!barDone && q.y < BARY + BRAD + 0.003 && length(q.xz) < BL + 0.003) {
        float bd;
        float cv = barCover(q, bd);
        if (bd < 0.0002) {
          S += T * cv * shadeBar(q, dir);
          T *= 1.0 - cv;
          barDone = true;
          if (cv > 0.98) { kind = 3; break; }
        }
        dist = min(dist, max(bd, 0.0004));
      }
      vec3 ext = exp(-sig * dist);
      S += T * sc * dist;
      T *= ext;
      stp = dist;
    } else {
      // Air inside the beaker: the pipette and the falling drop.
      float part;
      float dp = sdPip(q, part);
      if (dp < 0.0002) { kind = 1; pPart = part; break; }
      float dd = uDrop.w > 0.5 ? length(q - uDrop.xyz) - 0.0017 : 1e3;
      if (dd < 0.0002) { kind = 2; break; }
      stp = clamp(min(min(dp, dd), abs(f) * 0.7), 0.0006, 0.006);
    }
    if (max(T.r, max(T.g, T.b)) < 0.01) { kind = 3; break; }
    prev = q;
    q += dir * stp;
  }
  // One exit: each shading call is inlined once.
  if (kind == 3) return S;
  if (kind == 1) return S + T * shadePip(q, dir, pPart);
  if (kind == 2) return S + T * shadeDrop(q, dir);
  return S + T * room(q, dir);
}

// The glass beaker: outer solid as a profile in (radius, height).
float beakerOut(vec3 p) {
  vec2 q = vec2(length(p.xz), p.y);
  vec2 d = abs(q - vec2(0.0, (PT + TOP) * 0.5)) - vec2(RB - 0.003, (TOP - PT) * 0.5 - 0.003);
  float s = length(max(d, 0.0)) + min(max(d.x, d.y), 0.0) - 0.003;
  // The rolled rim.
  float lip = length(q - vec2(RB - 0.0002, TOP - 0.0012)) - 0.0016;
  return min(s, lip);
}
// The shell: open at the mouth, floor and wall of glass.
float beakerShell(vec3 p) {
  vec2 q = vec2(length(p.xz), p.y);
  float o = beakerOut(p);
  vec2 d = abs(q - vec2(0.0, (FL + TOP + 0.01) * 0.5)) - vec2(RI, (TOP + 0.01 - FL) * 0.5);
  float in_ = length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
  return max(o, -in_);
}
vec3 nBeaker(vec3 p) {
  vec2 e = vec2(0.0004, 0.0);
  return normalize(vec3(beakerShell(p + e.xyy) - beakerShell(p - e.xyy), beakerShell(p + e.yxy) - beakerShell(p - e.yxy), beakerShell(p + e.yyx) - beakerShell(p - e.yyx)));
}
void main() {
  vec3 ro = uCamPos, rd = camRay(vUv);
  vec3 bench = texture(uBench, vUv).rgb;
  vec3 c = bench;
  // Bounds: the beaker's cylinder and the pipette's column.
  float a = dot(rd.xz, rd.xz), b = dot(ro.xz, rd.xz);
  float rr = RB + 0.002;
  float disc = b * b - a * (dot(ro.xz, ro.xz) - rr * rr);
  vec2 pc = uPip.xz;
  vec2 oc = ro.xz - pc;
  float bp = dot(oc, rd.xz), dp = bp * bp - a * (dot(oc, oc) - 0.0065 * 0.0065);
  if (disc <= 0.0 && (dp <= 0.0 || uPip.w < -0.5)) { o = vec4(c, 1.0); return; }
  float t = 0.3, hit = 0.0;
  vec3 p;
  for (int i = 0; i < 110 + uZero; i++) {
    p = ro + rd * t;
    float part;
    float ds = beakerShell(p);
    float dpp = sdPip(p, part);
    // Into the mouth: the interior march takes over.
    if (length(p.xz) < RI - 0.0002 && p.y < TOP && p.y > FL) { hit = 3.0; break; }
    float d = min(ds, dpp);
    if (d < 0.0002) { hit = ds < dpp ? 1.0 : 2.0 + part * 0.1; break; }
    t += max(d, 0.0003);
    if (t > 2.0 || p.y < PT - 0.01) break;
  }
  // One call site for the interior march: D3D inlines each call in full.
  vec3 sq = p, sd = rd, mulI = vec3(1.0), addI = vec3(0.0);
  bool go = false;
  if (hit > 2.5) {
    go = true;
  } else if (hit > 1.5) {
    c = shadePip(p, rd, hit > 2.05 ? 1.0 : 0.0);
  } else if (hit > 0.5) {
    vec3 n1 = nBeaker(p);
    float c1 = max(dot(-rd, n1), 0.0);
    float F1 = fres(c1, 0.04);
    vec3 tint = exp(-vec3(14.0, 7.0, 10.0) * TH / max(c1, 0.08));
    float edge = pow(1.0 - c1, 4.0);
    mulI = (1.0 - F1) * tint;
    addI = env(reflect(rd, n1)) * F1 + vec3(0.05, 0.055, 0.06) * edge * (0.4 + 0.6 * max(dot(n1, uKey), 0.0));
    vec3 q = p + rd * TH * 1.6;
    vec3 sn;
    go = true;
    if (q.y < FL && q.y > PT - 0.001) {
      // A path in the floor glass: up into the water, or down to the plate.
      vec3 d2 = refract(rd, n1, 0.66);
      if (dot(d2, d2) < 0.5) d2 = rd;
      if (d2.y > 0.0 && length(q.xz) < RI) {
        sq = q + d2 * ((FL + 0.0002 - q.y) / d2.y);
        sd = refract(d2, vec3(0.0, -1.0, 0.0), 1.5 / 1.333);
        // The thick base edge darkens what it shows.
        mulI *= vec3(0.45, 0.55, 0.52);
      } else {
        go = false;
        c = room(q, d2) * vec3(0.4, 0.5, 0.48) * mulI + addI;
      }
    } else if (length(q.xz) < RI + 0.0006 && q.y < surf(q, sn) && q.y > FL) {
      // A ray into the side below the surface enters the water and bends.
      q.xz *= (RI - 0.0003) / max(length(q.xz), 1e-4);
      sq = q;
      sd = refract(rd, n1, 1.0 / 1.333);
    } else {
      // Into the air above the water: start on the inner wall.
      vec2 oq = p.xz, dq = rd.xz;
      float A = dot(dq, dq), B = dot(oq, dq), C = dot(oq, oq) - RI * RI;
      float D = B * B - A * C;
      float tin = D > 0.0 ? (-B - sqrt(D)) / A : -1.0;
      if (tin > 0.0) sq = p + rd * (tin + 0.0001);
      else { go = false; c = room(p, rd) * mulI * mulI + addI; }
    }
  }
  // A ray through the mouth starts its interior march at the rim plane.
  if (hit > 2.5 && rd.y < 0.0) {
    vec3 m = ro + rd * ((TOP - ro.y) / rd.y);
    if (length(m.xz) < RI) sq = m;
  }
  if (go) c = inner(sq, sd) * mulI + addI;
  // The drop in the air above the rim.
  if (uDrop.w > 0.5 && uDrop.y > TOP) {
    vec3 oc2 = ro - uDrop.xyz;
    float bb = dot(oc2, rd), cc = dot(oc2, oc2) - 0.0017 * 0.0017;
    float h = bb * bb - cc;
    if (h > 0.0) c = shadeDrop(ro + rd * (-bb - sqrt(h)), rd);
  }
  o = vec4(c, 1.0);
}`;

/* ---------- grade: bloom, tone, vignette, grain ---------- */
const FINAL = `${HEAD}
uniform sampler2D uHdr, uBloom;
uniform float uFrame, uBloomK;
uniform vec2 uRes;
in vec2 vUv;
out vec4 o;
${GRADE}
vec3 film(vec3 x) { return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0); }
void main() {
  vec3 c = texture(uHdr, vUv).rgb + texture(uBloom, vUv).rgb * uBloomK;
  c = film(c * 1.05);
  c *= gdVignette(vUv, uRes.x / uRes.y, 0.45, 0.35);
  c = pow(max(c, 0.0), vec3(1.0 / 2.2));
  c += (gdHash(gl_FragCoord.xy + vec2(uFrame * 37.0, uFrame * 91.0)) - 0.5) * 0.012;
  o = vec4(c, 1.0);
}`;

// Absorption by dye kind, per unit of tracer weight: blue, violet, green.
export const DYES = [
  [1.0, 0.42, 0.05],
  [0.3, 1.0, 0.22],
  [0.05, 0.16, 1.0],
];

export async function makeScene(gl) {
  if (!gl.getExtension('EXT_color_buffer_float') && !gl.getExtension('EXT_color_buffer_half_float')) throw new Error('no float targets');
  const P = await linked(gl, {
    splat: program(gl, SPLAT_VS, SPLAT_FS, ['aP']),
    bench: program(gl, TRI_VS, BENCH),
    scene: program(gl, TRI_VS, SCENE),
    final: program(gl, TRI_VS, FINAL),
  });
  const empty = gl.createVertexArray();
  const bloom = bloomChain(gl, { max: 5 });
  // The dye atlas: every y slice of the grid as a tile.
  const atlas = target(gl, AW, AH, { check: true, clear: true });
  const vao = gl.createVertexArray();
  const vbo = gl.createBuffer();
  gl.bindVertexArray(vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
  gl.bufferData(gl.ARRAY_BUFFER, CAP * 16, gl.DYNAMIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 4, gl.FLOAT, false, 16, 0);
  gl.vertexAttribDivisor(0, 1);
  gl.bindVertexArray(null);

  let benchT = null, hdr = null, W = 0, H = 0;
  function resize(w, h) {
    W = Math.max(2, w); H = Math.max(2, h);
    gl.canvas.width = W; gl.canvas.height = H;
    [benchT, hdr].forEach(t => free(gl, t));
    benchT = target(gl, W, H);
    hdr = target(gl, W, H);
  }

  function common(p, v) {
    gl.uniform3fv(p.u.uCamPos, v.cam.pos);
    gl.uniformMatrix3fv(p.u.uCamRot, false, v.cam.rot);
    gl.uniform3fv(p.u.uLens, v.cam.lens);
    gl.uniform3fv(p.u.uKey, v.key);
    gl.uniform1f(p.u.uKnob, v.knob);
    gl.uniform1f(p.u.uLamp, v.lamp);
    gl.uniform4fv(p.u.uBar, v.bar);
    if (p.u.uDip) gl.uniform1f(p.u.uDip, v.dip);
    if (p.u.uZero) gl.uniform1i(p.u.uZero, 0);
  }

  // Splats n packed tracers into the atlas.
  function splat(buf, n) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, atlas.fb);
    gl.viewport(0, 0, AW, AH);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    if (n <= 0) return;
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, buf, 0, n * 4);
    const s = P.splat;
    gl.useProgram(s.p);
    gl.uniform3fv(s.u.uAbs, DYES.flat());
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);
    gl.bindVertexArray(vao);
    gl.drawArraysInstanced(gl.POINTS, 0, 2, n);
    gl.bindVertexArray(null);
    gl.disable(gl.BLEND);
  }

  // v: camera, parts, water and dye state. Draws one frame to the screen.
  function frame(v, { frameNo = 0, bloomLevels = 5 } = {}) {
    if (!hdr) return;
    splat(v.dye.buf, v.dye.n);
    gl.disable(gl.BLEND);
    const b = P.bench;
    gl.useProgram(b.p);
    common(b, v);
    tri(gl, benchT, empty);
    const s = P.scene;
    gl.useProgram(s.p);
    common(s, v);
    bind(gl, s, 'uBench', 0, benchT);
    bind(gl, s, 'uDye', 1, atlas);
    gl.uniform4fv(s.u.uWob, v.wob);
    gl.uniform4fv(s.u.uRip, v.rip);
    gl.uniform4fv(s.u.uPip, v.pip);
    gl.uniform4fv(s.u.uDrop, v.drop);
    gl.uniform3fv(s.u.uDropC, v.dropC);
    gl.uniform3fv(s.u.uTint, v.tint);
    gl.uniform1f(s.u.uFluo, 1);
    gl.uniform3fv(s.u.uSwirl, v.swirl);
    tri(gl, hdr, empty);
    const bt = bloom.render(hdr.tex, W, H, { threshold: 0.75, cap: 6, levels: bloomLevels });
    const fp = P.final;
    gl.useProgram(fp.p);
    bind(gl, fp, 'uHdr', 0, hdr);
    bind(gl, fp, 'uBloom', 1, bt);
    gl.uniform1f(fp.u.uBloomK, 0.3);
    gl.uniform1f(fp.u.uFrame, frameNo % 64);
    gl.uniform2f(fp.u.uRes, W, H);
    tri(gl, null, empty);
  }

  return { resize, frame };
}
