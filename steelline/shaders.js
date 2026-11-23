// Steel line GLSL: sky, the static works, the moving goods, haze, the final grade.
// Hot metal is the key light; the night sky is a faint cool fill.
import { SMOKE, smConsts } from '../shared/smoke.js';
import { BF_PROFILE, M } from './works.js';

export const NL = 24;
const f = x => (Number.isInteger(x) ? x.toFixed(1) : String(x));

const NOISE = /* glsl */`
float h11(float p) { return fract(sin(p * 127.1) * 43758.5453); }
float h21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y);
}
float fbm(vec2 p) {
  float s = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) { s += a * vnoise(p); p = p * 2.03 + vec2(1.7, 9.2); a *= 0.5; }
  return s;
}`;

// Iron and steel glow, shared with Steelworks: heat 1 is tap heat.
const INCAND = /* glsl */`
vec3 incand(float T) {
  float t = clamp((T - 0.22) / 0.78, 0.0, 1.0);
  vec3 c = mix(vec3(0.55, 0.03, 0.004), vec3(1.0, 0.2, 0.02), smoothstep(0.0, 0.4, t));
  c = mix(c, vec3(1.0, 0.52, 0.13), smoothstep(0.4, 0.8, t));
  c = mix(c, vec3(1.0, 0.86, 0.62), smoothstep(0.8, 1.0, t));
  return c * (0.03 * t + 0.9 * t * t + 2.4 * t * t * t * t);
}`;

// Point lights in front of the slice, and the night sky fill.
const LIGHT = /* glsl */`
uniform vec4 uLP[${NL}];
uniform vec4 uLC[${NL}];
uniform int uLN;
uniform vec3 uAmb;
const vec3 MOON = vec3(-0.45, 0.75, 0.48);
vec3 shade(vec3 P, vec3 N, vec3 alb, float spec, float inside) {
  vec3 c = alb * uAmb * (0.3 + 0.7 * max(dot(N, normalize(MOON)), 0.0)) * mix(1.0, 0.3, inside);
  for (int i = 0; i < ${NL}; i++) {
    if (i >= uLN) break;
    vec3 d = uLP[i].xyz - P;
    float r2 = dot(d, d), R = uLP[i].w;
    vec3 L = d * inversesqrt(r2);
    float att = R * R / (R * R + r2) * (1.0 - smoothstep(16.0 * R * R, 64.0 * R * R, r2));
    float dif = max(dot(N, L), 0.0) * 0.85 + 0.15;
    vec3 H = normalize(L + vec3(0.0, 0.0, 1.0));
    float sp = pow(max(dot(N, H), 0.0), 36.0) * spec;
    c += uLC[i].rgb * att * (alb * dif + sp);
  }
  return c;
}`;

const HEAD = /* glsl */`#version 300 es
precision highp float;
`;

/* ---------- sky ---------- */
export const SKY_FS = /* glsl */`${HEAD}
in vec2 vUv;
out vec4 o;
uniform vec4 uView;
uniform float uDay, uT;
${NOISE}
// A far works on the horizon: sheds, stacks and a few lamps, at a slow parallax.
float skyline(float x, out float lamp) {
  float cell = floor(x / 9.0), f = fract(x / 9.0);
  float h = 4.0 + 10.0 * h11(cell) * h11(cell + 3.1);
  float stack = step(0.82, h11(cell + 7.0)) * step(abs(f - 0.5), 0.05) * (26.0 + 12.0 * h11(cell + 2.0));
  lamp = step(0.6, h11(cell + 11.0));
  return max(h, stack);
}
void main() {
  vec2 w = uView.xy + vUv * uView.zw;
  // Night: deep blue at the zenith, a dull glow low over the works.
  float y = clamp(w.y / 110.0, 0.0, 1.0);
  vec3 night = mix(vec3(0.03, 0.02, 0.018), vec3(0.004, 0.006, 0.014), smoothstep(0.0, 0.7, y));
  vec3 day = mix(vec3(0.34, 0.33, 0.33), vec3(0.12, 0.16, 0.24), smoothstep(0.0, 1.0, y));
  vec3 c = mix(night, day, uDay);
  // Stars, only at night, fixed to the sky.
  vec2 sp = vUv * vec2(uView.z / uView.w, 1.0) * 180.0 + vec2(uView.x * 0.4, 0.0);
  float st = step(0.996, h21(floor(sp))) * smoothstep(0.5, 0.0, length(fract(sp) - 0.5)) * smoothstep(20.0, 60.0, w.y);
  c += st * vec3(0.5, 0.55, 0.7) * (1.0 - uDay) * (0.5 + 0.5 * h21(floor(sp) + 1.0));
  // Low cloud lit from below by the works.
  float cl = fbm(vec2(w.x * 0.008 + uT * 0.002, w.y * 0.03));
  c += smoothstep(0.45, 0.8, cl) * mix(vec3(0.05, 0.022, 0.012), vec3(0.06), uDay) * smoothstep(110.0, 40.0, w.y) * smoothstep(10.0, 40.0, w.y);
  // The far skyline at a third of the pan speed.
  float lamp;
  float fx = uView.x * 0.66 + vUv.x * uView.z;
  float sh = skyline(fx, lamp);
  if (w.y < sh + 2.0 && w.y > -2.0) {
    c = mix(vec3(0.008, 0.009, 0.013), vec3(0.16, 0.17, 0.19), uDay);
    vec2 g = vec2(fract(fx / 1.4), fract(w.y / 2.0));
    c += lamp * step(abs(g.x - 0.5), 0.18) * step(abs(g.y - 0.5), 0.15) * step(0.7, h21(floor(vec2(fx / 1.4, w.y / 2.0)))) * vec3(0.5, 0.35, 0.18) * (1.0 - uDay);
  }
  o = vec4(c, 1.0);
}`;

/* ---------- the static works ---------- */
export const SCENE_VS = /* glsl */`${HEAD}
layout(location = 0) in vec4 aP;
layout(location = 1) in vec4 aM;
layout(location = 2) in vec4 aC;
uniform vec4 uView;
out vec2 vW;
out vec2 vU;
flat out vec4 vM;
flat out vec4 vC;
void main() {
  vW = aP.xy; vU = aP.zw; vM = aM; vC = aC;
  gl_Position = vec4((aP.xy - uView.xy) / uView.zw * 2.0 - 1.0, 0.0, 1.0);
}`;

export const SCENE_FS = /* glsl */`${HEAD}
in vec2 vW;
in vec2 vU;
flat in vec4 vM;
flat in vec4 vC;
out vec4 o;
uniform float uT, uBelt, uPx;
${NOISE}
${INCAND}
${LIGHT}
void main() {
  int m = int(vM.x + 0.5), nm = int(vM.y + 0.5);
  vec3 alb = vC.rgb, N = vec3(0.0, 0.0, 1.0), emit = vec3(0.0);
  float spec = 0.0, inside = 0.0, z = 0.0;
  // Normals from the shape: cylinders, domes and tilted faces.
  if (nm == 1) { float s = clamp((vW.x - vM.z) / vM.w, -0.98, 0.98); N = vec3(s, 0.0, sqrt(1.0 - s * s)); }
  else if (nm == 2) { float s = clamp((vW.y - vM.z) / vM.w, -0.98, 0.98); N = vec3(0.0, s, sqrt(1.0 - s * s)); }
  else if (nm == 3) { vec2 d = vU / max(vM.w, 1e-3); float q = min(dot(d, d), 0.96); N = vec3(d, sqrt(1.0 - q)); }
  else if (nm == 4) { N = normalize(vec3(vM.z, vM.w, 1.0)); }
  vec2 u = vU;
  if (m == ${M.WALL}) {
    // Corrugated cladding seen from inside; panels and grime low down.
    N = normalize(N + vec3(0.35 * sin(u.x * 10.47), 0.0, 0.0));
    alb *= 0.8 + 0.2 * step(0.06, fract(u.y / 6.0)) + 0.15 * vnoise(u * vec2(0.3, 1.5));
    alb *= mix(0.6, 1.0, smoothstep(0.0, 6.0, u.y));
    inside = 1.0; z = -7.0;
  } else if (m == ${M.CUT}) {
    // The section cut: a diagonal hatch on a lighter face.
    float hatch = step(0.82, fract((u.x + u.y) / 0.7));
    alb *= 1.0 + 0.45 * hatch + 0.2 * vnoise(u * 2.0);
    spec = 0.05;
  } else if (m == ${M.STEEL}) {
    // Plates: seams every 2 m up and 3 m across; rivet rows on the seams.
    vec2 s = fract(u / vec2(3.0, 2.0));
    float seam = step(s.x, 0.02) + step(s.y, 0.03);
    alb *= 0.85 + 0.25 * vnoise(u * 0.7) - 0.3 * min(seam, 1.0);
    float rv = step(length(fract(u / vec2(0.5, 2.0) + vec2(0.0, 0.5)) - vec2(0.5)), 0.06) * step(abs(s.y - 0.5), 0.5);
    alb += rv * 0.02;
    spec = 0.35;
  } else if (m == ${M.BRICK}) {
    // Refractory courses; a hot lining glows dull red through the mortar.
    vec2 b = vec2(u.x / 0.5 + 0.5 * step(0.5, fract(u.y / 0.5)), u.y / 0.25);
    float mortar = step(fract(b.x), 0.06) + step(fract(b.y), 0.1);
    alb *= 0.75 + 0.35 * h21(floor(b)) - 0.45 * min(mortar, 1.0);
    emit += vC.w * incand(0.42 + 0.1 * h21(floor(b)) - 0.08 * min(mortar, 1.0)) * 0.6;
  } else if (m == ${M.CONC}) {
    alb *= 0.75 + 0.4 * fbm(u * 0.4);
  } else if (m == ${M.SOIL}) {
    // Strata that dip and pinch; gravel; darker deep down.
    float band = fbm(vec2(vW.x * 0.02, vW.y * 0.25 + 0.6 * sin(vW.x * 0.013)));
    alb = mix(alb, alb * vec3(1.35, 1.2, 1.0), smoothstep(0.4, 0.7, band));
    alb *= 0.7 + 0.5 * vnoise(vW * 3.0);
    alb *= mix(0.45, 1.0, smoothstep(-40.0, -2.0, vW.y));
    float peb = smoothstep(0.92, 0.97, h21(floor(vW * 2.0)));
    alb += peb * 0.04;
    inside = 0.6;
  } else if (m == ${M.TRUSS}) {
    // A Warren girder: chords, diagonals and posts; open between them.
    float a = vM.z, v = u.y / a, f2 = fract(u.x / a);
    float d = min(abs(f2 - v), abs(f2 - (1.0 - v)));
    float keep = max(step(d, 0.09), max(step(v, 0.14), step(0.86, v)));
    keep = max(keep, step(abs(f2 - 0.5), 0.035));
    if (keep < 0.5) discard;
    spec = 0.25;
  } else if (m == ${M.BELT}) {
    // Rubber with moving cleats.
    float cl = step(0.9, fract((u.x - uBelt) / 0.9));
    alb *= 1.0 + 1.5 * cl;
  } else if (m == ${M.GLASS}) {
    // Wired glass in a mullion grid, faintly lit from outside.
    vec2 g = fract(u / vec2(1.1, 1.0));
    float mull = step(g.x, 0.08) + step(g.y, 0.08);
    emit += vC.rgb * vC.w * (1.0 - min(mull, 1.0)) * (0.7 + 0.3 * vnoise(u)) * clamp(1.0 - uAmb.b * 2.0, 0.2, 1.0);
    alb = mix(vec3(0.01), vec3(0.12, 0.14, 0.17), clamp(uAmb.b * 2.0, 0.0, 1.0));
  } else if (m == ${M.PILE}) {
    // Grains: lumps with lit tops.
    float g = vnoise(u * 5.0) * 0.6 + vnoise(u * 13.0) * 0.4;
    alb *= 0.55 + 0.8 * g;
    N = normalize(vec3(0.0, 0.5, 1.0) + vec3(vnoise(u * 9.0) - 0.5, vnoise(u * 9.0 + 3.0) - 0.5, 0.0) * 0.8);
    spec = 0.15 * vC.w;
  } else if (m == ${M.RAIL}) {
    alb *= 0.6 + 0.6 * step(0.5, u.y / 0.35);
    spec = 1.0;
  } else if (m == ${M.PIPE}) {
    alb *= 0.9 + 0.2 * vnoise(u * 0.5) - 0.35 * step(fract(u.x / 6.0), 0.03);
    spec = 0.5;
  } else if (m == ${M.HOLE}) {
    alb *= 1.0; inside = 1.0;
  } else if (m == ${M.GRATE}) {
    alb *= 0.7 + 0.6 * step(0.5, fract(u.x / 0.25));
    spec = 0.4;
  }
  vec3 c = shade(vec3(vW, z), N, alb, spec, inside) + emit;
  o = vec4(c, 1.0);
}`;

/* ---------- the moving goods ---------- */
// Instance: x, y, half width, half height | angle, kind, heat, phase | r, g, b, extra.
export const K = {
  BOX: 0, HOT: 1, COIL: 2, LADLE: 3, TORPEDO: 4, WORKER: 5, SPARK: 6, STREAM: 7, FLAME: 8,
  SKIP: 9, WAGON: 10, LOCO: 11, CONV: 12, FURNACE: 13, SLOT: 14, WATER: 15, LAMP: 16, LUMP: 17, TRUSS: 18,
};

export const SPRITE_VS = /* glsl */`${HEAD}
layout(location = 0) in vec4 aA;
layout(location = 1) in vec4 aB;
layout(location = 2) in vec4 aC;
uniform vec4 uView;
out vec2 vQ;
out vec2 vW;
flat out vec4 vA;
flat out vec4 vB;
flat out vec4 vC;
void main() {
  vec2 q = vec2(float((gl_VertexID & 1) * 2 - 1), float((gl_VertexID >> 1) * 2 - 1));
  vec2 p = q * aA.zw;
  float c = cos(aB.x), s = sin(aB.x);
  vec2 w = aA.xy + vec2(c * p.x - s * p.y, s * p.x + c * p.y);
  vQ = p; vW = w; vA = aA; vB = aB; vC = aC;
  gl_Position = vec4((w - uView.xy) / uView.zw * 2.0 - 1.0, 0.0, 1.0);
}`;

const BF = BF_PROFILE.map(([y, r]) => `vec2(${f(y)}, ${f(r)})`).join(', ');

export const SPRITE_FS = /* glsl */`${HEAD}
in vec2 vQ;
in vec2 vW;
flat in vec4 vA;
flat in vec4 vB;
flat in vec4 vC;
out vec4 o;
uniform float uT, uPx;
${NOISE}
${INCAND}
${LIGHT}
const vec2 BFP[${BF_PROFILE.length}] = vec2[](${BF});
float bfR(float y) {
  if (y <= BFP[0].x) return BFP[0].y;
  for (int i = 1; i < ${BF_PROFILE.length}; i++) if (y <= BFP[i].x) return mix(BFP[i - 1].y, BFP[i].y, (y - BFP[i - 1].x) / (BFP[i].x - BFP[i - 1].x));
  return BFP[${BF_PROFILE.length - 1}].y;
}
float sdBox(vec2 p, vec2 b, float r) { vec2 d = abs(p) - b + r; return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0) - r; }
// Coverage from a distance, about one pixel soft.
float cov(float d) { return clamp(0.5 - d / uPx, 0.0, 1.0); }
void main() {
  int k = int(vB.y + 0.5);
  vec2 p = vQ, hs = vA.zw;
  float heat = vB.z, ph = vB.w;
  vec3 col = vC.rgb, emit = vec3(0.0), N = vec3(0.0, 0.0, 1.0);
  float a = 1.0, spec = 0.3;
  if (k == ${K.BOX}) {
    a = cov(sdBox(p, hs, min(0.15, min(hs.x, hs.y))));
    N = normalize(vec3(p.x / hs.x * 0.25, p.y / hs.y * 0.4, 1.0));
    emit = col * vC.w;
  } else if (k == ${K.TRUSS}) {
    // A lattice girder that moves: a crane bridge or a boom.
    vec2 u = p + hs;
    float v = u.y / (2.0 * hs.y), f2 = fract(u.x / (2.0 * hs.y));
    float d = min(abs(f2 - v), abs(f2 - (1.0 - v)));
    a = max(step(d, 0.1), max(step(v, 0.15), step(0.85, v)));
  } else if (k == ${K.HOT}) {
    // A hot body: a slab, a strip or a coke cake. Scale darkens as it cools.
    a = cov(sdBox(p, hs, min(0.12, min(hs.x, hs.y))));
    float sc = vnoise(vW * vec2(3.0, 6.0) + ph * 17.0);
    float t = heat * (0.92 + 0.12 * sc) - 0.05 * smoothstep(0.7, 1.0, abs(p.y) / hs.y);
    col = vec3(0.04, 0.035, 0.03) * (0.7 + 0.6 * sc);
    emit = incand(t) * vC.w;
  } else if (k == ${K.LUMP}) {
    float d = length(p / hs) - 1.0 + 0.25 * vnoise(p * 5.0 + ph * 9.0);
    a = cov(d * min(hs.x, hs.y));
    N = normalize(vec3(p / hs * 0.6, 1.0));
    emit = incand(heat);
  } else if (k == ${K.COIL}) {
    // A coil end-on: wraps round a dark eye.
    float r = length(p) / hs.x;
    a = cov((r - 1.0) * hs.x) * step(0.34, r);
    float wrap = 0.75 + 0.25 * step(0.5, fract(r * 14.0));
    col *= wrap;
    N = normalize(vec3(p / hs.x * 0.3, 1.0));
    emit = incand(heat * (0.9 + 0.1 * wrap)) ;
    spec = 0.8;
  } else if (k == ${K.LADLE}) {
    // A ladle: a tapered bowl with a rim, its lining cut open on the metal.
    float y = p.y / hs.y, w = mix(0.72, 1.0, (y + 1.0) * 0.5);
    float out_ = sdBox(vec2(p.x / w, p.y), vec2(hs.x, hs.y), 0.3);
    a = cov(out_);
    float inner = sdBox(vec2(p.x / w, p.y + 0.2), vec2(hs.x - 0.55, hs.y - 0.5), 0.2);
    float lining = step(inner, 0.25);
    col = mix(vec3(0.05, 0.05, 0.055), vec3(0.16, 0.08, 0.05), lining);
    // The bath fills to vC.w, level in the world.
    float lvl = -hs.y + 0.5 + (2.0 * hs.y - 1.2) * vC.w;
    float bath = step(inner, 0.0) * step(p.y, lvl);
    float empty = step(inner, 0.0) * (1.0 - bath);
    col = mix(col, vec3(0.012), empty);
    float sl = vnoise(vW * 2.5 + uT * 0.4);
    emit = bath * incand(heat * (0.9 + 0.1 * sl)) + lining * (1.0 - bath) * incand(0.36) * 0.25 * heat;
    // The rim and lugs.
    a = max(a, cov(sdBox(p - vec2(0.0, hs.y - 0.2), vec2(hs.x + 0.25, 0.22), 0.1)));
    N = normalize(vec3(p.x / hs.x * 0.5, 0.0, 1.0));
  } else if (k == ${K.TORPEDO}) {
    // A torpedo car: a long vessel on two bogies; the mouth glows when full.
    vec2 b = vec2(hs.x, hs.y * 0.62);
    vec2 c = p - vec2(0.0, hs.y * 0.3);
    float body = length(vec2(max(abs(c.x) - b.x + b.y, 0.0), c.y)) - b.y;
    float bog = min(sdBox(p - vec2(-hs.x * 0.6, -hs.y * 0.62), vec2(hs.x * 0.28, hs.y * 0.2), 0.1), sdBox(p - vec2(hs.x * 0.6, -hs.y * 0.62), vec2(hs.x * 0.28, hs.y * 0.2), 0.1));
    float wh = 1e3;
    for (int i = 0; i < 4; i++) { float wx = (float(i) < 2.0 ? -0.6 : 0.6) * hs.x + (mod(float(i), 2.0) - 0.5) * hs.x * 0.3; wh = min(wh, length(p - vec2(wx, -hs.y * 0.82)) - hs.y * 0.17); }
    a = cov(min(body, min(bog, wh)));
    col = body < 0.0 ? vec3(0.075, 0.07, 0.068) : vec3(0.025);
    N = body < 0.0 ? normalize(vec3(0.0, c.y / b.y, 1.0)) : N;
    float mouth = cov(sdBox(c - vec2(0.0, b.y - 0.25), vec2(1.0, 0.3), 0.2));
    emit = mouth * incand(heat * 0.95);
    // Cut open: the lining and the iron inside.
    float inner = length(vec2(max(abs(c.x) - b.x + b.y, 0.0), c.y)) - (b.y - 0.55);
    float bath = step(inner, 0.0) * step(c.y, -b.y + 0.55 + (2.0 * b.y - 1.1) * vC.w);
    if (inner < 0.0) col = vec3(0.012);
    emit += bath * incand(heat * (0.9 + 0.1 * vnoise(vW * 2.0 + uT * 0.3)));
    float lin = step(inner, 0.4) * step(0.0, inner);
    col = mix(col, vec3(0.16, 0.08, 0.05), lin);
    spec = 0.4;
  } else if (k == ${K.WORKER}) {
    // A tiny figure: a white hat, a hi-vis vest, two legs that walk.
    vec2 q = p / hs;
    float head = length(q - vec2(0.0, 0.72)) - 0.24;
    float body = sdBox(q - vec2(0.0, 0.18), vec2(0.34, 0.36), 0.12);
    float sw = sin(ph) * 0.22 * vC.w;
    float l1 = sdBox(q - vec2(-0.14 + sw, -0.55), vec2(0.1, 0.4), 0.05);
    float l2 = sdBox(q - vec2(0.14 - sw, -0.55), vec2(0.1, 0.4), 0.05);
    float d = min(min(head, body), min(l1, l2)) * min(hs.x, hs.y);
    a = clamp(0.5 - d / (uPx * 0.7), 0.0, 1.0);
    col = head < 0.0 ? vec3(0.75, 0.75, 0.72) : body < 0.0 ? col : vec3(0.03, 0.035, 0.05);
    // The hat and the vest's stripe catch any light: they read in the dark.
    emit = head < 0.0 ? vec3(0.05) : body < 0.0 ? col * (0.12 + 0.5 * step(abs(q.y - 0.12), 0.09)) : vec3(0.0);
    spec = 0.0;
  } else if (k == ${K.SPARK}) {
    // A streak: hot, thin, round at both ends.
    vec2 q = p / hs;
    float d = length(vec2(max(abs(q.x) - 0.6, 0.0) / 0.4, q.y));
    float g = exp(-d * d * 3.0);
    o = vec4(incand(heat) * g * vC.w, 0.0);
    return;
  } else if (k == ${K.STREAM}) {
    // A pour: a column that necks and ropes as it falls.
    float y = (p.y + hs.y) / (2.0 * hs.y);
    float n = vnoise(vec2(p.x * 3.0, vW.y * 1.2 + uT * 9.0));
    float w = hs.x * mix(0.55, 1.0, y) * (0.8 + 0.4 * n);
    float d = abs(p.x + 0.15 * sin(vW.y * 0.9 + uT * 6.0) * (1.0 - y)) / max(w, 1e-3);
    float g = smoothstep(1.0, 0.6, d);
    o = vec4(incand(heat * (0.88 + 0.12 * n)) * g * vC.w + incand(heat * 0.7) * exp(-d * d * 0.6) * 0.15 * vC.w, 0.0);
    return;
  } else if (k == ${K.FLAME}) {
    // The converter flame: a white core licking up, orange tongues round it.
    vec2 q = p / hs;
    float y = (q.y + 1.0) * 0.5;
    float n = fbm(vec2(q.x * 2.0, vW.y * 0.35 - uT * 3.5));
    float w = mix(0.35, 1.0, sqrt(y)) * (0.6 + 0.6 * n);
    float d = abs(q.x) / max(w, 0.05);
    float g = smoothstep(1.0, 0.2, d) * smoothstep(1.05, 0.55, y + 0.25 * n) * smoothstep(0.0, 0.04, y);
    float core = smoothstep(0.55, 0.0, d) * smoothstep(0.75, 0.1, y + 0.15 * n);
    vec3 c = incand(0.78 + 0.2 * n) * g * 1.6 + vec3(2.2, 2.05, 1.8) * core * 2.4;
    o = vec4(c * vC.w, 0.0);
    return;
  } else if (k == ${K.WATER}) {
    float n = vnoise(vec2(p.x * 4.0, p.y * 0.8 - uT * 14.0));
    float g = smoothstep(0.55, 0.85, n) * (1.0 - abs(p.x) / hs.x);
    o = vec4(vec3(0.35, 0.42, 0.5) * g * vC.w * 0.4, 0.0);
    return;
  } else if (k == ${K.LAMP}) {
    float r = length(p) / hs.x;
    o = vec4(col * vC.w * (exp(-r * r * 30.0) * 3.0 + exp(-r * 4.0) * 0.12), 0.0);
    return;
  } else if (k == ${K.SKIP}) {
    // A skip car: a bucket on two axles, heaped when loaded.
    float bucket = sdBox(p - vec2(0.0, 0.1 * hs.y), vec2(hs.x, hs.y * 0.7), 0.15);
    float load = length((p - vec2(0.0, hs.y * 0.65)) / vec2(hs.x * 0.9, hs.y * 0.5)) - 1.0;
    float wh = min(length(p - vec2(-hs.x * 0.6, -hs.y * 0.75)), length(p - vec2(hs.x * 0.6, -hs.y * 0.75))) - hs.y * 0.24;
    float d = min(bucket, wh);
    if (vC.w > 0.5) d = min(d, load * hs.y * 0.5);
    a = cov(d);
    col = bucket < 0.0 ? vec3(0.07, 0.03, 0.02) : load < 0.0 ? vec3(0.12, 0.05, 0.03) * (0.6 + 0.7 * vnoise(p * 8.0)) : vec3(0.02);
  } else if (k == ${K.WAGON}) {
    // An ore wagon: a hopper body on bogies, heaped to vC.w.
    float body = sdBox(p - vec2(0.0, 0.1 * hs.y), vec2(hs.x, hs.y * 0.6), 0.15);
    float hop = sdBox(p - vec2(0.0, -0.45 * hs.y), vec2(hs.x * 0.45, hs.y * 0.25), 0.1);
    float wh = 1e3;
    for (int i = 0; i < 4; i++) wh = min(wh, length(p - vec2((float(i) - 1.5) * hs.x * 0.55 + (float(i) < 2.0 ? -0.2 : 0.2) * hs.x, -hs.y * 0.78)) - hs.y * 0.2);
    float load = (length((p - vec2(0.0, hs.y * 0.7)) / vec2(hs.x * 0.92, hs.y * 0.45)) - 1.0) * hs.y * 0.4;
    float d = min(min(body, hop), wh);
    if (vC.w > 0.05) d = min(d, load);
    a = cov(d);
    col = (body < 0.0 || hop < 0.0) ? col : load < 0.0 ? vec3(0.13, 0.055, 0.032) * (0.5 + 0.9 * vnoise(vW * 6.0)) : vec3(0.02);
    N = normalize(vec3(0.0, p.y / hs.y * 0.3, 1.0));
  } else if (k == ${K.LOCO}) {
    // A shunting engine: a hood, a cab, a headlamp.
    float body = sdBox(p - vec2(-0.15 * hs.x, -0.05 * hs.y), vec2(hs.x * 0.85, hs.y * 0.5), 0.2);
    float cab = sdBox(p - vec2(hs.x * 0.55, hs.y * 0.35), vec2(hs.x * 0.35, hs.y * 0.6), 0.15);
    float wh = 1e3;
    for (int i = 0; i < 4; i++) wh = min(wh, length(p - vec2((float(i) - 1.5) * hs.x * 0.48, -hs.y * 0.72)) - hs.y * 0.24);
    float win = sdBox(p - vec2(hs.x * 0.55, hs.y * 0.55), vec2(hs.x * 0.2, hs.y * 0.18), 0.05);
    a = cov(min(min(body, cab), wh));
    col = wh < 0.0 && body > 0.0 ? vec3(0.02) : col * (0.8 + 0.2 * step(0.5, fract(p.x * 0.5)));
    emit = step(win, 0.0) * vec3(0.5, 0.42, 0.3) * 0.6;
    N = normalize(vec3(0.0, p.y / hs.y * 0.3, 1.0));
  } else if (k == ${K.CONV}) {
    // The converter: a pear on its trunnions, cut open on its lining and bath.
    vec2 q = p / hs;
    // Radius by height: a round bottom, a full belly, a cone to the mouth.
    float rr = q.y > 0.3 ? mix(1.0, 0.42, smoothstep(0.3, 1.0, q.y)) : sqrt(max(1.0 - pow((q.y - 0.3) / 1.3, 2.0), 0.0));
    float outer = max((abs(q.x) - rr) * hs.x, abs(p.y) - hs.y);
    float shell = outer + 0.45, wall = outer + 1.35;
    a = cov(outer);
    // The open mouth: the lining stops at the top.
    float inside = step(wall, 0.0);
    float lining = step(shell, 0.0) * (1.0 - inside);
    vec2 b = vec2(p.x / 0.5 + 0.5 * step(0.5, fract(p.y / 0.5)), p.y / 0.25);
    float brick = 0.75 + 0.35 * h21(floor(b)) - 0.4 * min(step(fract(b.x), 0.07) + step(fract(b.y), 0.12), 1.0);
    vec2 sb = fract(p / vec2(3.0, 1.6));
    col = mix(vec3(0.075, 0.075, 0.08) * (0.85 + 0.3 * vnoise(p)) * (1.0 - 0.35 * step(sb.y, 0.05)), vec3(0.16, 0.08, 0.05) * brick, lining);
    // The trunnion ring round the belly.
    float ring = step(abs(p.y + 0.6), 0.7) * (1.0 - inside) * (1.0 - lining);
    col = mix(col, vec3(0.1, 0.1, 0.11), ring);
    // The bath stays level in the world as the vessel tilts.
    float lvl = vA.y - hs.y * 0.95 + vC.w * hs.y * 1.05;
    float bath = inside * step(vW.y, lvl);
    float sl = fbm(vW * 1.6 + vec2(0.0, uT * (0.5 + 2.5 * ph)));
    col = mix(col, vec3(0.008), inside * (1.0 - bath));
    // A hot lining glows; the bath churns during the blow.
    emit = bath * incand(heat * (0.84 + 0.2 * sl)) + lining * incand(0.3 + 0.25 * heat * brick) * 0.5 + inside * (1.0 - bath) * incand(heat * 0.7) * 0.05;
    N = normalize(vec3(p.x / hs.x * 0.7, 0.0, 1.0));
    spec = 0.4 * (1.0 - lining);
  } else if (k == ${K.FURNACE}) {
    // The furnace inside: burden layers sink, melt low down, and pool in the hearth.
    float y = vW.y, r = bfR(y), x = vW.x - vA.x;
    a = step(abs(x), r);
    float drift = ph;
    float yy = y + drift + 1.6 * (1.0 - abs(x) / max(r, 1.0)) * smoothstep(20.0, 50.0, y) - 0.9 * abs(x) / max(r, 1.0);
    float layer = step(0.5, fract(yy / 1.8));
    vec3 ore = vec3(0.12, 0.05, 0.03), coke = vec3(0.045, 0.045, 0.05);
    col = mix(ore, coke, layer) * (0.6 + 0.8 * vnoise(vec2(x, yy) * 3.0));
    // Heat rises downward; the cohesive zone is an arch of softening ore.
    float zone = smoothstep(40.0, 14.0, y + 7.0 * (1.0 - x * x / 49.0));
    emit = incand(0.22 + 0.5 * zone) * zone * (0.55 + 0.45 * vnoise(vec2(x, yy) * 2.0)) * (0.5 + 0.5 * heat) * mix(1.0, 0.5, layer);
    // Raceways in front of each tuyere: white-hot pockets.
    float race = exp(-pow(abs(abs(x) - r + 1.6), 2.0) * 0.6 - pow(y - 16.0, 2.0) * 0.5);
    emit += incand(0.92) * race * 0.6 * (0.4 + 0.6 * heat);
    // The hearth pool: iron under a slag layer, level with vC.w.
    float lvl = 6.0 + 7.0 * vC.w;
    if (y < lvl) {
      float slag = step(lvl - 0.9, y);
      float sl = fbm(vec2(x * 0.9, uT * 0.4));
      emit = mix(incand(0.8 + 0.08 * sl), incand(0.62 + 0.1 * sl), slag) * (0.75 + 0.25 * fbm(vec2(x * 1.3, y * 2.0 - uT * 0.3)));
      col = vec3(0.02);
      // Coke bed: the deadman stands in the pool.
      float dm = smoothstep(0.5, 0.3, vnoise(vec2(x * 1.4, y * 2.4))) * (1.0 - slag) * smoothstep(4.0, 2.0, abs(x)) * step(lvl - 4.0, y);
      emit *= 1.0 - dm * 0.45;
      emit += incand(0.98) * smoothstep(0.25, 0.0, abs(y - lvl + 0.95)) * 0.6;
    }
  } else if (k == ${K.SLOT}) {
    // A coke oven chamber: coal that bakes to a glow.
    a = cov(sdBox(p, hs, 0.05));
    float n = vnoise(vec2(p.x * 3.0, vW.y * 1.5 + ph * 10.0));
    col = vec3(0.025) * (0.6 + n);
    emit = incand(heat * (0.85 + 0.25 * n)) * smoothstep(-1.0, -0.6, p.y / hs.y);
  }
  if (a <= 0.003) discard;
  vec3 c = shade(vec3(vW, 0.4), N, col, spec, 0.0) + emit;
  o = vec4(c * a, a);
}`;

/* ---------- haze over the hot steps ---------- */
// Fire's smoke light (shared/smoke.js), at half size.
// Density: a low haze, fume plumes over the hot steps, steam over the quench tower.
export const PLUMES = 10;
export const HAZE_FS = /* glsl */`${HEAD}
in vec2 vUv;
out vec4 o;
uniform vec4 uView;
uniform float uT, uDay;
uniform vec4 uPl[${PLUMES}];
uniform vec4 uPlC[${PLUMES}];
${NOISE}
${SMOKE}
${smConsts()}
${LIGHT.replace('uniform vec3 uAmb;', 'uniform vec3 uAmb;').replace(/vec3 shade[\s\S]*$/, '')}
// A plume: a source at xy, strength z, spread w; its tint says smoke or steam.
float dens(vec2 w, out vec3 tint) {
  float d = 0.012 * smoothstep(40.0, 0.0, w.y) * (0.6 + 0.8 * fbm(vec2(w.x * 0.03 + uT * 0.01, w.y * 0.08)));
  vec3 ts = vec3(d);
  for (int i = 0; i < ${PLUMES}; i++) {
    vec4 pl = uPl[i];
    if (pl.z <= 0.0) continue;
    float up = w.y - pl.y;
    if (up < -2.0) continue;
    float rise = max(up, 0.0);
    // A plume widens as it climbs and leans with the wind.
    float lean = rise * 0.18 + sin(rise * 0.05 + uT * 0.2) * 2.0;
    float wd = pl.w + rise * 0.22;
    float dx = (w.x - pl.x - lean) / wd;
    float n = fbm(vec2(w.x * 0.09 - uT * 0.05, w.y * 0.07 - uT * 0.35 + float(i) * 7.0));
    float pd = pl.z * exp(-dx * dx * 1.6) * smoothstep(-2.0, 2.0, up) * exp(-rise * 0.012) * smoothstep(0.25, 0.75, n + 0.2 - abs(dx) * 0.15);
    ts += uPlC[i].rgb * pd;
    d += pd;
  }
  tint = ts / max(d, 1e-4);
  return d;
}
void main() {
  vec2 w = uView.xy + vUv * uView.zw;
  vec3 tint;
  float d = dens(w, tint);
  if (d < 1e-4) { o = vec4(0.0, 0.0, 0.0, 1.0); return; }
  // Light in-scatter: each light, through a few taps of the plume toward it.
  vec3 S = uAmb * d * smLight(d * 6.0 * smAbsorb, smMulti, smPowder, smAmbient) * 0.8;
  for (int i = 0; i < ${NL}; i++) {
    if (i >= uLN) break;
    vec3 L = uLP[i].xyz - vec3(w, 0.0);
    float r2 = dot(L, L), R = uLP[i].w;
    float att = R * R / (R * R + r2) * (1.0 - smoothstep(16.0 * R * R, 64.0 * R * R, r2));
    if (att < 0.004) continue;
    float tau = 0.0;
    vec3 tt;
    if (i < 4) for (int j = 1; j <= 3; j++) tau += dens(w + L.xy * float(j) * 0.2, tt) * length(L.xy) * 0.2;
    float Lt = smLight(tau * smAbsorb * 4.0, smMulti, smPowder, smAmbient);
    float cth = dot(normalize(vec3(0.0, 0.0, 1.0)), normalize(L));
    S += uLC[i].rgb * att * d * Lt * smPhase(cth, smG) * 12.56637;
  }
  float T = exp(-d * 3.5);
  o = vec4(S * tint * 1.6, T);
}`;

/* ---------- final: haze over the scene, bloom, tone, grade ---------- */
export const FINAL_FS = /* glsl */`${HEAD}
in vec2 vUv;
out vec4 o;
uniform sampler2D uHdr, uHaze, uBloom;
uniform float uBloomK, uExpo, uAsp, uFrame;
float h(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
void main() {
  vec3 c = texture(uHdr, vUv).rgb;
  vec4 hz = texture(uHaze, vUv);
  c = c * hz.a + hz.rgb;
  c += texture(uBloom, vUv).rgb * uBloomK;
  c *= uExpo;
  // A filmic shoulder that keeps the iron white-hot.
  c = c * (2.51 * c + 0.03) / (c * (2.43 * c + 0.59) + 0.14);
  // Cool shadows, a soft vignette, fine grain.
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  c += vec3(-0.004, 0.0, 0.01) * (1.0 - smoothstep(0.0, 0.15, l));
  vec2 q = (vUv - 0.5) * vec2(uAsp, 1.0);
  c *= 1.0 - 0.22 * dot(q, q);
  c = pow(max(c, 0.0), vec3(1.0 / 2.2));
  c += (h(vUv * 917.0 + uFrame) - 0.5) * 0.012;
  o = vec4(c, 1.0);
}`;
