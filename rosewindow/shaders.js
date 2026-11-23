// Rose window shaders: raw WebGL2, GLSL ES 3.00.
// Metres; y is up. The end wall's inner face is z = 0; the nave is z > 0.
// The camera never moves: the stone marches once per size into a G-buffer.

export const HEAD = `#version 300 es
precision highp float;
precision highp sampler3D;
`;

/* ---------- the nave: one distance field ---------- */
export const SCENE = /* glsl */`
const float PX = 6.5;       // arcade line, off the axis
const float BAY = 6.5;
const float ZG = -0.55;     // glass plane, inside the wall
const float RW = 4.5;       // window radius
const float W2 = 4.59;      // half side of the glass map
const float SPL = 0.45;     // inner splay at the wall face
const float YS = 8.5;       // arch springing
const vec3 WC = vec3(0.0, 11.2, 0.0);

float sdOct(vec2 p, float r) { p = abs(p); return max(max(p.x, p.y), (p.x + p.y) * 0.7071) - r; }

// A round pier with four shafts, a moulded base and a capital.
float sdPier(vec3 p) {
  float rr = length(p.xz);
  vec2 a = abs(p.xz);
  float sh = min(rr - 0.62, min(length(a - vec2(0.66, 0.0)), length(a - vec2(0.0, 0.66))) - 0.19);
  sh = max(sh, abs(p.y - 4.2) - 3.6);
  float base = length(vec2(max(rr - 0.8, 0.0), p.y - 0.47)) - 0.17;
  float plinth = max(sdOct(p.xz, 1.04), p.y - 0.3);
  float cap = max(rr - 0.76 - 0.42 * smoothstep(7.7, 8.3, p.y), abs(p.y - 8.0) - 0.32);
  float aba = max(sdOct(p.xz, 1.18), abs(p.y - 8.42) - 0.12);
  return min(min(sh, base), min(plinth, min(cap, aba)));
}
// The arcade wall over the piers, with pointed arches and a string course.
float sdArcade(vec3 p) {
  float ax = abs(p.x - PX);
  float d = min(ax - 0.45, max(ax - 0.58, abs(p.y - 14.15) - 0.13));
  d = max(d, YS - 0.2 - p.y);
  float u = abs(p.z - 3.25 - BAY * floor((p.z - 3.25) / BAY + 0.5));
  float hs = BAY * 0.5 - 0.62, v = p.y - YS;
  float open = v > 0.0 ? length(vec2(u + hs, v)) - 2.0 * hs : u - hs;
  return max(d, -open);
}
// The end wall, with the window's splayed opening down to the glass.
float sdWall(vec3 p) {
  float rr = length(p.xy - WC.xy);
  float hole = max(rr - RW - SPL * clamp((p.z - ZG) / -ZG, 0.0, 1.0), ZG - p.z);
  return max(p.z, -hole);
}
float map(vec3 p) {
  vec3 q = vec3(abs(p.x), p.y, p.z);
  float d = min(p.y, sdWall(p));
  d = min(d, 44.0 - p.z);
  d = min(d, 13.5 - q.x);
  d = min(d, max(10.6 - p.y, PX + 0.45 - q.x));
  d = min(d, max(2.0 * PX - length(vec2(q.x + PX, p.y - 19.0)), 19.0 - p.y));
  d = min(d, sdArcade(q));
  vec3 l = vec3(q.x - PX, p.y, p.z - BAY * clamp(floor(p.z / BAY + 0.5), 0.0, 6.0));
  return min(d, sdPier(l));
}
`;

const HASH = /* glsl */`
float hash1(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
vec2 hash2(vec2 p) { float a = hash1(p); return vec2(a, hash1(p + a * 17.0)); }
`;

const CAMERA = /* glsl */`
uniform vec3 uCam, uR, uU, uF;
uniform vec2 uTan;
vec3 rayDir(vec2 uv) { vec2 s = (uv * 2.0 - 1.0) * uTan; return normalize(uF + s.x * uR + s.y * uU); }
`;

// The sun through the glass, at one point. Shared by the shade, haze and mote passes.
// The light map holds the glass colour times the reveal clip, and the depth to the first stone.
const SUNLIGHT = /* glsl */`
uniform sampler2D uLight;
uniform vec3 uSun;
uniform float uTexel;
// lam: metres from the glass along the ray. Returns the colour that reaches p.
vec3 sunAt(vec3 p, float bias, out float lam) {
  lam = (ZG - p.z) / min(uSun.z, -1e-3);
  vec3 q = p + uSun * lam;
  vec2 uv = (q.xy - WC.xy) / (2.0 * W2) + 0.5;
  if (uSun.z > -0.02 || lam < 0.0 || uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0) return vec3(0.0);
  // The sun's disc and the glass's waves blur the patch by distance.
  float lod = log2(max((lam * 0.0065 + 0.012) / uTexel, 1.0));
  vec3 c = textureLod(uLight, uv, lod).rgb;
  float dep = textureLod(uLight, uv, 0.0).a;
  return c * smoothstep(-bias, 0.0, dep - lam);
}
`;

/* ---------- glass: the rose, baked once ---------- */
// rgb: linear transmission. a: stone tracery cover.
export const GLASS_FS = `${HEAD}
in vec2 vUv;
out vec4 o;
${HASH}
const float PI = 3.14159265;
// Glass colours: transmission, linear.
const vec3 BLUE = vec3(0.03, 0.085, 0.42), DEEP = vec3(0.018, 0.045, 0.3), RUBY = vec3(0.52, 0.025, 0.035);
const vec3 GOLD = vec3(0.72, 0.43, 0.06), GREEN = vec3(0.06, 0.33, 0.12), MURREY = vec3(0.26, 0.04, 0.22), PALE = vec3(0.56, 0.6, 0.5);

// One lancet: a wedge between two mullions, ending in a pointed head.
// x: radius; y: the angle off its axis; n: lancets in the ring.
// Returns the inside distance (negative inside), in units of the radius.
float lancet(float r, float da, float n, float r0, float r1) {
  float half_ = PI / n;
  float hw0 = r1 * sin(half_) - 0.014;
  float w = r * sin(abs(da));
  float side = w - (r * sin(half_) - 0.014);
  float body = max(side, max(r0 - r, r - r1));
  float s = r - r1;
  // A blunt two-centred arch: radius 1.3 half-widths.
  float head = s > 0.0 ? length(vec2(w + 0.3 * hw0, s)) - 1.3 * hw0 : side;
  return min(body, max(head, -s));
}
// Returns: x = region (0 stone, 1 glass), y = colour id, z = a seed for the panel.
vec3 region(vec2 p) {
  float r = length(p);
  float a = atan(p.y, p.x) + PI * 0.5;
  if (r > 0.985) return vec3(0.0);
  // The centre: a quatrefoil of ruby and gold on blue.
  if (r < 0.215) {
    if (r > 0.195) return vec3(0.0);
    float lob = min(min(length(p - vec2(0.075, 0.0)), length(p + vec2(0.075, 0.0))), min(length(p - vec2(0.0, 0.075)), length(p + vec2(0.0, 0.075))));
    if (r < 0.05) return vec3(1.0, 3.0, 1.0);
    if (lob < 0.072) return vec3(1.0, lob > 0.06 ? 3.0 : 2.0, 2.0);
    return vec3(1.0, 0.0, 3.0);
  }
  if (r < 0.25) return vec3(0.0);
  // The inner ring: twelve lancets, with roundels between their heads.
  if (r < 0.6) {
    float n = 12.0, k = floor(a / (2.0 * PI) * n + 0.5);
    float da = a - k * 2.0 * PI / n;
    float ka = floor(a / (2.0 * PI) * n) + 0.5;
    vec2 rc = 0.56 * vec2(sin(ka * 2.0 * PI / n), -cos(ka * 2.0 * PI / n));
    float rd = length(p - rc);
    if (rd < 0.044) return vec3(1.0, rd < 0.02 ? 3.0 : rd < 0.03 ? 4.0 : 2.0, 10.0 + ka);
    if (rd < 0.056) return vec3(0.0);
    float l = lancet(r, da, n, 0.27, 0.455);
    if (l > 0.0) return vec3(0.0);
    // Two medallions in each lancet, ruby on blue; a pale and ruby border.
    float m1 = length(vec2(r - 0.33, r * sin(da))), m2 = length(vec2(r - 0.47, r * sin(da)));
    float m = min(m1, m2);
    if (m < 0.052) return vec3(1.0, m < 0.04 ? 2.0 : 3.0, 20.0 + k * 2.0 + step(m2, m1));
    if (l > -0.014) return vec3(1.0, 6.0, 40.0 + k);
    return vec3(1.0, 0.0, 60.0 + k);
  }
  if (r < 0.64) return vec3(0.0);
  // The outer ring: 24 lancets, a roundel above each head.
  float n = 24.0, k = floor(a / (2.0 * PI) * n + 0.5);
  float da = a - k * 2.0 * PI / n;
  vec2 rc = 0.935 * vec2(sin(k * 2.0 * PI / n), -cos(k * 2.0 * PI / n));
  float rd = length(p - rc);
  if (rd < 0.038) return vec3(1.0, rd < 0.016 ? 3.0 : 2.0, 80.0 + k);
  if (rd < 0.048) return vec3(0.0);
  float l = lancet(r, da, n, 0.655, 0.77);
  if (l > 0.0) return vec3(0.0);
  float m = length(vec2(r - 0.745, r * sin(da)));
  float alt = mod(k, 3.0);
  if (m < 0.05) return vec3(1.0, m < 0.038 ? (alt < 1.0 ? 2.0 : alt < 2.0 ? 4.0 : 5.0) : 3.0, 110.0 + k);
  if (l > -0.012) return vec3(1.0, 6.0, 140.0 + k);
  return vec3(1.0, alt < 2.0 ? 0.0 : 1.0, 170.0 + k);
}
vec3 colourOf(float id) {
  if (id < 0.5) return BLUE;
  if (id < 1.5) return DEEP;
  if (id < 2.5) return RUBY;
  if (id < 3.5) return GOLD;
  if (id < 4.5) return GREEN;
  if (id < 5.5) return MURREY;
  return PALE;
}
// The pieces: a Voronoi net of cut glass, about 12 cm a piece.
vec3 pieces(vec2 p) {
  vec2 g = p / 0.03, i = floor(g), f = fract(g);
  float d1 = 9.0, d2 = 9.0; vec2 best = vec2(0.0);
  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
    vec2 c = vec2(x, y), h = hash2(i + c);
    float d = length(c + h * 0.85 + 0.075 - f);
    if (d < d1) { d2 = d1; d1 = d; best = i + c; } else if (d < d2) d2 = d;
  }
  return vec3(best, (d2 - d1) * 0.03);
}
void main() {
  vec2 p = (vUv * 2.0 - 1.0) * 1.02;
  vec3 R = region(p);
  // Lead where the region changes: four taps 1.6 cm apart.
  float e = 0.0038;
  float lead = 0.0;
  for (int i = 0; i < 4; i++) {
    vec2 o4 = vec2(i == 0 ? e : i == 1 ? -e : 0.0, i == 2 ? e : i == 3 ? -e : 0.0);
    vec3 Q = region(p + o4);
    lead = max(lead, step(0.5, abs(Q.y - R.y) + abs(Q.z - R.z) + abs(Q.x - R.x) * 9.0));
  }
  if (R.x < 0.5) { o = vec4(0.0, 0.0, 0.0, 1.0); return; }
  vec3 pc = pieces(p);
  float h = hash1(pc.xy + R.z * 3.1);
  vec3 c = colourOf(R.y);
  // A few odd pieces in the blue ground: a pale or a ruby quarry.
  if (R.y < 1.5) { float q = hash1(pc.xy * 1.7 + 3.0); c = q > 0.965 ? PALE * 0.6 : q > 0.93 ? RUBY : c; }
  // Each pot of glass differs in depth of colour.
  c *= 0.62 + 0.62 * h;
  // Painted matting darkens each piece toward its leads.
  c *= mix(0.45, 1.0, smoothstep(0.0, 0.011, pc.z));
  // Figure painting in the medallions: dark strokes.
  if (R.y > 1.5 && R.y < 5.5) {
    vec2 s = p * 90.0;
    float st = abs(sin(s.x + 2.0 * sin(s.y * 0.7 + h * 6.0)) * sin(s.y * 1.3 + 1.7 * sin(s.x * 0.6)));
    c *= mix(0.35, 1.0, smoothstep(0.0, 0.35, st));
  }
  lead = max(lead, 1.0 - smoothstep(0.0012, 0.0026, pc.z));
  // Iron bars ring each lancet every 30 cm or so.
  float rr = length(p);
  float bar = abs(fract(rr / 0.072 + 0.3) - 0.5) * 0.072;
  lead = max(lead, (rr > 0.27 && rr < 0.84) ? 1.0 - smoothstep(0.0028, 0.0042, bar) : 0.0);
  o = vec4(c * (1.0 - lead), 0.0);
}`;

/* ---------- the G-buffer: the stone, once per size ---------- */
export const GBUF_FS = `${HEAD}
in vec2 vUv;
layout(location = 0) out vec4 o0;
layout(location = 1) out vec4 o1;
uniform int uZero;
uniform sampler3D uNoise;
${SCENE}
${HASH}
${CAMERA}
vec3 normalAt(vec3 p) {
  const vec2 k = vec2(1.0, -1.0);
  const float e = 0.0015;
  return normalize(k.xyy * map(p + k.xyy * e) + k.yyx * map(p + k.yyx * e) + k.yxy * map(p + k.yxy * e) + k.xxx * map(p + k.xxx * e));
}
float occlusion(vec3 p, vec3 n) {
  float o = 0.0, w = 1.0;
  for (int i = 1; i <= 5; i++) {
    float h = 0.12 * float(i * i);
    o += w * clamp(h - map(p + n * h), 0.0, h) / h;
    w *= 0.62;
  }
  return clamp(1.0 - o * 0.5, 0.0, 1.0);
}
float nz(vec3 p) { return texture(uNoise, p).r; }
// Ashlar: courses, staggered joints, a tone a block.
vec3 ashlar(vec2 f, float hh, float ww, out float joint) {
  float row = floor(f.y / hh);
  float x = f.x / ww + hash1(vec2(row, 7.0)) * 3.0;
  float col = floor(x);
  float jy = abs(fract(f.y / hh) - 0.5) * hh, jx = abs(fract(x) - 0.5) * ww;
  joint = min(hh * 0.5 - jy, ww * 0.5 - jx);
  return vec3(hash1(vec2(row, col)), hash1(vec2(col, row) + 3.3), 0.0);
}
void main() {
  vec3 rd = rayDir(vUv);
  float t = 0.05;
  for (int i = 0; i < 180 + uZero; i++) {
    float d = map(uCam + rd * t);
    if (d < 0.0003 * t + 0.0004) break;
    t += d * 0.8;
    if (t > 90.0) break;
  }
  vec3 p = uCam + rd * t;
  vec3 n = normalAt(p);
  // The glass: snap to its exact plane, so no march bands show.
  float tg = (ZG - uCam.z) / rd.z;
  vec3 pg = uCam + rd * tg;
  if (p.z < ZG + 0.3 && length(pg.xy - WC.xy) < RW) {
    t = tg;
    p = pg;
    o0 = vec4(0.0, 0.0, 1.0, t);
    o1 = vec4((p.xy - WC.xy) / (2.0 * W2) + 0.5, 0.0, -1.0);
    return;
  }
  float ao = occlusion(p, n);
  float joint = 1.0;
  vec3 b;
  vec3 alb;
  if (p.y < 0.01) {
    // Floor: worn flags, darker and cooler than the walls.
    b = ashlar(p.xz * vec2(1.0, 1.0), 0.92, 1.35, joint);
    alb = vec3(0.34, 0.315, 0.28) * (0.78 + 0.34 * b.x);
    alb *= 0.85 + 0.3 * nz(p * 0.35);
  } else {
    // Walls and piers: pale limestone ashlar.
    vec2 f;
    if (abs(n.z) > 0.75) f = p.xy;
    else if (abs(n.x) > 0.75 && abs(abs(p.x) - PX) > 1.3) f = p.zy;
    else if (abs(n.y) > 0.75) f = p.xz;
    else { vec2 c = vec2(abs(p.x) - PX, p.z - BAY * floor(p.z / BAY + 0.5)); f = vec2(atan(c.y, c.x) * 0.9, p.y); }
    b = ashlar(f, 0.52, 1.05, joint);
    alb = vec3(0.5, 0.46, 0.385) * (0.84 + 0.26 * b.x);
    alb *= mix(vec3(0.96, 0.98, 1.0), vec3(1.04, 1.0, 0.94), b.y);
    alb *= 0.86 + 0.28 * nz(p * 0.5);
    // Grime climbs a metre and a half from the floor.
    alb *= mix(0.68, 1.0, smoothstep(0.0, 1.6, p.y));
  }
  alb *= 0.88 + 0.24 * nz(p * 6.0);
  alb *= mix(0.72, 1.0, smoothstep(0.003, 0.014, joint));
  o0 = vec4(n, t);
  o1 = vec4(alb, ao);
}`;

/* ---------- the light map: glass x clip, and the depth to the first stone ---------- */
export const LIGHT_FS = `${HEAD}
in vec2 vUv;
out vec4 o;
uniform int uZero;
uniform sampler2D uGlass;
uniform vec3 uSun;
${SCENE}
void main() {
  vec2 q = WC.xy + (vUv * 2.0 - 1.0) * W2;
  vec3 s = uSun;
  if (length(q - WC.xy) > RW + 0.01 || s.z > -0.02) { o = vec4(0.0); return; }
  vec4 g = texture(uGlass, vUv);
  // The outer reveal: 45 cm of wall past the glass cuts a slanted sun.
  vec2 off = s.xy / -s.z;
  float clear = 1.0 - smoothstep(RW - 0.03, RW + 0.05, length(q + off * 0.45 - WC.xy));
  // Tracery 25 cm deep throws a wider shadow when the sun slants.
  vec2 du = off * 0.12 / (2.0 * W2);
  clear *= 1.0 - max(texture(uGlass, vUv + du).a, texture(uGlass, vUv - du).a);
  vec3 d = -s;
  vec3 p0 = vec3(q, ZG + 0.01);
  float t = 0.02;
  for (int i = 0; i < 140 + uZero; i++) {
    float dd = map(p0 + d * t);
    if (dd < 0.003) break;
    t += dd * 0.8;
    if (t > 110.0) break;
  }
  o = vec4(g.rgb * clear, t);
}`;

/* ---------- haze: shafts in the dust, half size ---------- */
export const HAZE_FS = `${HEAD}
in vec2 vUv;
out vec4 o;
uniform int uZero, uSteps;
uniform sampler2D uG0;
uniform sampler3D uNoise;
uniform vec3 uSunC, uWin, uAmb, uDrift;
uniform float uDens;
uniform vec4 uStir;
${SCENE}
${CAMERA}
${SUNLIGHT}
float hg(float c, float g) { float k = 1.0 + g * g - 2.0 * g * c; return (1.0 - g * g) / (12.566 * k * sqrt(k)); }
void main() {
  vec3 rd = rayDir(vUv);
  float tEnd = min(texelFetch(uG0, ivec2(gl_FragCoord.xy) * 2, 0).a, 60.0);
  float dt = tEnd / float(uSteps);
  // Interleaved gradient noise hides the steps.
  float j = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));
  vec3 sun = vec3(0.0), win = vec3(0.0);
  float amb = 0.0, lam;
  // A tap kicks up a puff of dust round its ray, swirling, then settling.
  float env = uStir.w / 0.5 * exp(1.0 - uStir.w / 0.5) * step(0.0, uStir.w);
  for (int i = 0; i < 64 + uZero; i++) {
    if (i >= uSteps) break;
    vec3 p = uCam + rd * ((float(i) + j) * dt);
    vec3 v = p - uCam;
    float al = dot(v, uStir.xyz);
    float r2 = dot(v, v) - al * al;
    float puff = env * exp(-r2 / (0.5 + 0.012 * al * al));
    vec3 sw = cross(uStir.xyz, v) * puff * 0.08;
    // Dust: two drifting octaves; it thins high in the vault.
    float n = texture(uNoise, (p + sw) * 0.055 + uDrift).r * 0.65 + texture(uNoise, (p + sw * 2.0) * 0.16 - uDrift * 1.7).r * 0.35;
    float dens = uDens * (0.3 + 1.4 * n * n) * mix(1.0, 0.5, smoothstep(10.0, 22.0, p.y)) * (1.0 + 2.2 * puff * n);
    sun += sunAt(p, 0.08, lam) * dens;
    vec3 wv = vec3(WC.xy, ZG) - p;
    float w2 = dot(wv, wv);
    win += dens * RW * RW / (w2 + RW * RW) * max(-wv.z, 0.0) * inversesqrt(w2) * hg(dot(normalize(-wv), -rd), 0.35);
    amb += dens;
  }
  vec3 c = (sun * uSunC * hg(dot(uSun, rd), 0.55) + win * uWin + amb * uAmb * 0.08) * dt;
  o = vec4(c, 1.0);
}`;

/* ---------- shade: light the G-buffer each frame ---------- */
export const SHADE_FS = `${HEAD}
in vec2 vUv;
out vec4 o;
uniform sampler2D uG0, uG1, uGlass, uHaze;
uniform sampler3D uNoise;
uniform vec3 uSunC, uSky, uAmb, uWin, uBounceP, uBounceC;
uniform vec2 uHazeTexel;
${SCENE}
${CAMERA}
${SUNLIGHT}
// The sky and the sun behind one point of the glass.
vec3 backlight(vec2 xy, vec3 rd) {
  vec2 off = uSun.xy / max(-uSun.z, 0.05);
  float lit = (1.0 - smoothstep(RW - 0.05, RW + 0.12, length(xy + off * 0.45 - WC.xy))) * step(uSun.z, -0.02);
  // Old glass scatters: panes glow most when the eye looks toward the sun.
  float lobe = exp((dot(rd, uSun) - 1.0) * 5.0);
  return uSky + uSunC * lit * (0.1 * max(-uSun.z, 0.0) + 0.45 * lobe);
}
void main() {
  vec4 g0 = texture(uG0, vUv), g1 = texture(uG1, vUv);
  vec3 rd = rayDir(vUv);
  float t = g0.a;
  vec3 p = uCam + rd * t, n = g0.xyz, col;
  float lam;
  if (g1.a < -0.5) {
    vec4 g = texture(uGlass, g1.xy);
    vec3 back = backlight(p.xy, rd);
    // Seeds and streaks of blown glass.
    float sd = texture(uNoise, vec3(g1.xy * vec2(9.0, 30.0), 0.37)).r;
    vec3 c = g.rgb * back * (0.78 + 0.44 * sd);
    // Tracery: lit by the room and the panes round it.
    vec3 halo = textureLod(uGlass, g1.xy, 4.5).rgb * back;
    vec3 st = vec3(0.42, 0.39, 0.34) * (uAmb * 1.5 + halo * 0.55);
    col = mix(c, st, g.a);
  } else {
    vec3 alb = g1.rgb;
    float ao = g1.a;
    vec3 sun = sunAt(p + n * 0.03, 0.12 + t * 0.004, lam) * uSunC * max(dot(n, uSun), 0.0);
    // Fill from the high windows: cool, from above.
    // The high windows light the upper stone more than the floor.
    vec3 fill = uAmb * ao * (0.55 + 0.45 * n.y) * mix(0.75, 1.5, smoothstep(2.0, 18.0, p.y));
    // The rose as a wide soft lamp.
    vec3 wv = vec3(WC.xy, ZG) - p;
    float wd = length(wv);
    vec3 win = uWin * RW * RW / (wd * wd + RW * RW) * max(dot(n, wv / wd), 0.0) * max(-wv.z / wd, 0.0) * mix(0.35, 1.0, ao);
    // The bright patch throws its colour back up.
    vec3 bv = uBounceP - p;
    float bd = length(bv);
    vec3 bounce = uBounceC / (bd * bd + 10.0) * max(0.25 + 0.75 * dot(n, bv / bd), 0.0) * ao;
    col = alb * (sun + fill + win + bounce);
    // The worn floor shows a dull sheen of the rose.
    if (p.y < 0.02) {
      float wear = smoothstep(0.35, 0.75, texture(uNoise, p * 0.12).r) * (1.0 - smoothstep(2.5, 5.5, abs(p.x)));
      vec3 r = reflect(rd, normalize(n + vec3(texture(uNoise, p * 0.31).r - 0.5, 0.0, texture(uNoise, p.zyx * 0.31 + 0.5).r - 0.5) * 0.05));
      float rl = (ZG - p.z) / min(r.z, -1e-3);
      vec2 rq = p.xy + r.xy * rl;
      vec2 ruv = (rq - WC.xy) / (2.0 * W2) + 0.5;
      float inWin = step(length(rq - WC.xy), RW) * step(r.z, -0.01);
      float fr = 0.006 + 0.5 * pow(1.0 - max(dot(-rd, n), 0.0), 5.0);
      col += textureLod(uGlass, ruv, 5.5).rgb * backlight(rq, r) * inWin * fr * (0.15 + 0.5 * wear);
    }
  }
  // Air: a little veil with distance, then the shafts.
  vec2 h = uHazeTexel;
  vec3 hz = (texture(uHaze, vUv).rgb * 2.0 + texture(uHaze, vUv + h).rgb + texture(uHaze, vUv - h).rgb
    + texture(uHaze, vUv + vec2(h.x, -h.y)).rgb + texture(uHaze, vUv + vec2(-h.x, h.y)).rgb) / 6.0;
  col = col * exp(-0.004 * t) + hz;
  o = vec4(col, t);
}`;

/* ---------- motes: dust that glints only in a shaft ---------- */
export const MOTE_VS = `${HEAD}
uniform float uTime, uPx, uDpr;
uniform vec4 uStir;       // xyz: the tap's ray; w: its age in seconds
uniform vec3 uSunC;
uniform sampler3D uNoise;
${SCENE}
${CAMERA}
${SUNLIGHT}
out vec3 vC;
out float vD;
float h1(float n) { return fract(sin(n * 12.9898) * 43758.5453); }
float hg(float c, float g) { float k = 1.0 + g * g - 2.0 * g * c; return (1.0 - g * g) / (12.566 * k * sqrt(k)); }
void main() {
  float id = float(gl_VertexID);
  vec4 h = vec4(h1(id + 0.1), h1(id + 7.3), h1(id + 13.7), h1(id + 21.1));
  // Dust fills the air in front of the rose; it wraps round the box.
  float w = 0.6 + h.w;
  vec3 p = vec3(h.y * 14.0 - 7.0, h.z * 16.5 + 0.3, h.x * 26.0);
  p += vec3(sin(uTime * 0.11 * w + h.z * 40.0), sin(uTime * 0.07 * w + h.y * 30.0), sin(uTime * 0.09 * w + h.w * 50.0)) * (0.25 + 0.35 * h.w);
  // A slow rise where the sun warms the air.
  p.y = 0.3 + mod(p.y - 0.3 + uTime * 0.02 * (0.3 + h.w), 16.5);
  // A tap swirls the dust round its ray, then lets it settle.
  float env = uStir.w / 0.45 * exp(1.0 - uStir.w / 0.45) * step(0.0, uStir.w);
  vec3 v = p - uCam, ax = uStir.xyz;
  float al = dot(v, ax);
  vec3 pr = v - ax * al;
  float r2 = dot(pr, pr);
  float k = env * exp(-r2 / (0.6 + 0.02 * al * al));
  float an = 2.6 * k;
  pr = pr * cos(an) + cross(ax, pr) * sin(an);
  p = uCam + ax * al + pr * (1.0 + 0.4 * k);
  float lam;
  vec3 lit = sunAt(p, 0.1, lam);
  float d = length(p - uCam);
  // Each flake turns: a glint when its face meets the sun.
  float tw = pow(0.5 + 0.5 * sin(uTime * (0.8 + 2.4 * h.y) + h.w * 60.0), 8.0);
  vec3 c = lit * uSunC * hg(dot(uSun, normalize(p - uCam)), 0.6) * (0.35 + 4.0 * tw);
  float sz = clamp(0.03 * uPx / d, 1.0, 3.0) * uDpr;
  c *= 0.22 * uDpr * uDpr / max(sz * sz, 1.0) * (1.0 + 1.5 * k);
  vC = c;
  vD = d;
  vec3 cv = vec3(dot(p - uCam, uR), dot(p - uCam, uU), dot(p - uCam, uF));
  bool off = cv.z < 0.3 || dot(c, c) < 1e-9;
  gl_Position = off ? vec4(2.0, 2.0, 2.0, 1.0) : vec4(cv.x / (cv.z * uTan.x), cv.y / (cv.z * uTan.y), 0.0, 1.0);
  gl_PointSize = off ? 0.0 : sz;
}`;
export const MOTE_FS = `${HEAD}
in vec3 vC;
in float vD;
out vec4 o;
uniform sampler2D uG0;
void main() {
  if (texelFetch(uG0, ivec2(gl_FragCoord.xy), 0).a < vD) discard;
  float r = length(gl_PointCoord - 0.5) * 2.0;
  o = vec4(vC * smoothstep(1.0, 0.25, r), 1.0);
}`;

/* ---------- grade ---------- */
export const FINAL_FS = `${HEAD}
in vec2 vUv;
out vec4 o;
uniform sampler2D uHdr, uBloom;
uniform float uBloomK, uExpo, uAsp, uFrame;
${HASH}
vec3 aces(vec3 x) { return clamp(x * (2.51 * x + 0.03) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0); }
void main() {
  vec3 c = texture(uHdr, vUv).rgb + texture(uBloom, vUv).rgb * uBloomK;
  vec2 q = vUv - 0.5;
  q.x *= uAsp;
  c *= uExpo * (1.0 - 0.32 * dot(q, q));
  c = pow(aces(c), vec3(1.0 / 2.2));
  // Fine grain, and a dither against bands in the dark stone.
  c += (hash1(gl_FragCoord.xy + uFrame * 17.0) - 0.5) * 0.016;
  o = vec4(c, 1.0);
}`;
