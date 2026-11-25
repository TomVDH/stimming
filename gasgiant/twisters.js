// Gas giant dive: alien twisters in the upper void, after the spike in spike-twister.html.
// Each variety bakes once into an unrolled wall: angle across, height up.
// The march wraps the wall round a bent axis and turns it; the light stays live.

/* ---------- The shape, shared by the bake and the march ---------- */
// The shape frame is in km: Y up from the void's floor, 24 km tall.
// Varieties: 0 banded, 1 wide, 2 smooth.
const TW_SHAPE = /* glsl */`
const float TW_H = 24.0;
// The wide one leans less; the smooth rope swings most.
vec2 twBend(float Y, int v) {
  float f = Y / TW_H, b = v == 1 ? 0.45 : v == 2 ? 1.25 : 1.0;
  return b * vec2(4.2 * sin(f * 3.0 + 0.3) * f, 2.4 * sin(f * 3.8 + 1.2) * f);
}
// The radius: a narrow foot widens steadily into the ceiling's flare.
float twRad(float Y, int v) {
  float f = clamp(Y / TW_H, 0.0, 1.0), fl = pow(smoothstep(0.7, 1.0, f), 2.0);
  if (v == 1) return 1.5 + 4.4 * pow(f, 1.2) + 3.0 * exp(-f * 10.0) + 4.5 * fl;
  if (v == 2) return 0.42 + 1.5 * pow(f, 2.2) + 1.1 * exp(-f * 20.0) + 6.5 * fl;
  return 0.55 + 2.4 * pow(f, 1.6) + 2.2 * exp(-f * 16.0) + 6.0 * fl;
}`;

/* ---------- The bake: one layer per variety ---------- */
export const WALL_W = 1024, WALL_H = 512, WALL_N = 3;
// r: the wall's radius over twRad, over 1.8. g: the density, over 1.8.
// b: the collars. a: the noise.
export const WALL_FS = /* glsl */`#version 300 es
precision highp float;
in vec2 vUv;
out vec4 o;
uniform int uV;
${TW_SHAPE}
float h13(vec3 p) { p = fract(p * 0.1031); p += dot(p, p.zyx + 31.32); return fract((p.x + p.y) * p.z); }
float vn3(vec3 p) {
  vec3 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(h13(i), h13(i + vec3(1, 0, 0)), f.x), mix(h13(i + vec3(0, 1, 0)), h13(i + vec3(1, 1, 0)), f.x), f.y),
             mix(mix(h13(i + vec3(0, 0, 1)), h13(i + vec3(1, 0, 1)), f.x), mix(h13(i + vec3(0, 1, 1)), h13(i + vec3(1, 1, 1)), f.x), f.y), f.z);
}
float fbm(vec3 p) {
  float a = 0.5, s = 0.0;
  for (int i = 0; i < 6; i++) { s += a * vn3(p); p = p * 2.03 + vec3(1.7, 9.2, 3.1); a *= 0.5; }
  return s;
}
void main() {
  int v = uV;
  float a = vUv.x * 6.2831853, f = vUv.y, Y = f * TW_H, R = twRad(Y, v);
  // The noise runs on a circle, so the wall wraps with no seam.
  float n = fbm(vec3(cos(a) * 1.4, sin(a) * 1.4, Y * 0.3) * 1.7 + vec3(0.0, 0.0, R * 0.32));
  float hel = 0.5 + 0.5 * cos(2.0 * a + Y * 0.9);
  // Collars spiral up, so a turn of the wall reads as a climb.
  float ph = Y / 2.6 * 6.2831853 + a + 1.4 * sin(a + Y * 0.25) + n * 4.0;
  float bands = smoothstep(0.35, 0.95, 0.5 + 0.5 * sin(ph));
  // The smooth rope keeps a calm wall: little noise, faint collars.
  float rough = v == 2 ? 0.25 : v == 1 ? 0.8 : 1.0, bandK = v == 2 ? 0.35 : v == 1 ? 0.6 : 1.0;
  float K = 0.62 + (1.0 - rough) * 0.32 + 0.5 * n * rough + 0.32 * hel * rough + 0.26 * bands * bandK;
  // The skirt at the floor is torn; the flare frays into the ceiling.
  float skirt = 1.0 - smoothstep(0.02, 0.16, f);
  float fray = mix(1.0, smoothstep(0.35, 0.75, n + 0.2 * hel), skirt * 0.8) * mix(1.0, smoothstep(0.3, 0.7, n), smoothstep(0.75, 1.0, f) * 0.7);
  float m = fray * (0.6 + 0.5 * mix(0.5, n, rough) + 0.35 * bands * bandK + 0.2 * hel);
  o = vec4(K / 1.8, m / 1.8, bands, n);
}`;

/* ---------- The march: a short relief march per twister ---------- */
export const TW_MAX = 6;
// uTwA: x, z, width, variety. uTwB: floor altitude, height, spin in rad/s, phase.
// A height of 0 turns the twister off.
// TW_DECL goes before dens(): the ceiling and the floor read the twisters too.
export const TW_DECL = /* glsl */`
uniform mediump sampler2DArray uWall;
uniform vec4 uTwA[${TW_MAX}];
uniform vec4 uTwB[${TW_MAX}];
${TW_SHAPE}
// The axis sways slowly; the top sways most.
vec2 twAxis(float Y, int v, float ph) {
  float f = Y / TW_H;
  return twBend(Y, v) + f * 0.7 * vec2(sin(uT * 0.05 + ph + f * 3.0), cos(uT * 0.04 + ph * 1.3 + f * 2.0));
}
// A girth wave climbs the column, so the taper breathes.
float twR(float Y, int v, float w, float ph) { return twRad(Y, v) * w * (1.0 + 0.1 * sin(Y * 0.45 - uT * 0.35 + ph)); }
// The brown deck's cover at xz, 0 to 1: 0 over an open hole.
// It reads the deck's own noise at its top, as dens() does.
float twGround(vec2 xz) {
  vec4 nw = textureLod(uVol, vec3(xz.x, -40.0, xz.y) / 1300.0 + vec3(0.3, 0.1, 0.7), 0.0);
  vec3 q = vec3(xz.x, -100.0, xz.y) + (nw.xyz - 0.5) * 110.0;
  vec4 nc = textureLod(uVol, vec3(0.6 * q.x + 0.8 * q.z, -160.0, 0.8 * q.x - 0.6 * q.z) / 157.0 + vec3(0.11, 0.0, 0.53), 0.0);
  return smoothstep(0.18, 0.36, 1.0 - nc.a) * (1.0 - breakAt(xz, 7.7, 0.0));
}
// How far the ceiling sags at xz, in km: a wall cloud round each twister's top.
float twSag(vec2 xz) {
  float g = 0.0;
  for (int i = 0; i < ${TW_MAX}; i++) {
    vec4 A = uTwA[i], B = uTwB[i];
    if (B.y <= 0.0) continue;
    int v = int(A.w + 0.5);
    float s = B.y / TW_H, rt = s * A.z * twRad(TW_H * 0.9, v) * 1.4;
    vec2 d = xz - A.xy - twAxis(TW_H, v, B.w) * s;
    g = max(g, exp(-dot(d, d) / (rt * rt)));
  }
  return 9.0 * g;
}
// The dust heap round each twister's foot: its height over the floor, in km.
float twDust(vec2 xz) {
  float g = 0.0;
  for (int i = 0; i < ${TW_MAX}; i++) {
    vec4 A = uTwA[i], B = uTwB[i];
    if (B.y <= 0.0) continue;
    int v = int(A.w + 0.5);
    float rf = B.y / TW_H * A.z * twRad(0.0, v) * 2.4;
    vec2 d = xz - A.xy;
    g = max(g, exp(-dot(d, d) / (rf * rf)));
  }
  return 4.5 * g;
}`;
export const TW_MARCH = /* glsl */`// The wall's radius at a shape point, in shape km.
float twWall(vec2 q, float Y, int v, float R, float spin, out vec4 wl) {
  float f = Y / TW_H;
  float an = atan(q.y, q.x) - f * 6.0 - spin * uT;
  wl = textureLod(uWall, vec3(fract(an / 6.2831853), f, float(v)), 0.0);
  return R * wl.r * 1.8;
}
// One twister along the ray: premultiplied light and alpha. tF takes its first hit.
vec4 twister(int i, vec3 ro, vec3 rd, float ta0, float tb0, float jit, inout float tF) {
  vec4 A = uTwA[i], B = uTwB[i];
  int v = int(A.w + 0.5);
  float s = B.y / TW_H, w = A.z, spin = B.z, ph = B.w;
  // A vertical cylinder holds the twister, its bend and its flare.
  float Rb = s * (w * twRad(TW_H, v) * 1.8 + 6.0);
  vec2 oc = ro.xz - A.xy;
  float a2 = dot(rd.xz, rd.xz), b = dot(oc, rd.xz), c = dot(oc, oc) - Rb * Rb;
  float disc = b * b - a2 * c;
  if (disc < 0.0 || a2 < 1e-6) return vec4(0.0);
  float sq = sqrt(disc), ta = (-b - sq) / a2, tb = (-b + sq) / a2;
  // The slab from the floor to the top, with room for the planet's curve.
  if (abs(rd.y) > 1e-5) {
    float u0 = (B.x - 0.6 - ro.y) / rd.y, u1 = (B.x + B.y + 0.3 - ro.y) / rd.y;
    ta = max(ta, min(u0, u1));
    tb = min(tb, max(u0, u1));
  }
  ta = max(ta, ta0);
  tb = min(tb, tb0);
  if (ta >= tb) return vec4(0.0);
  // Over cloud the foot melts into the deck; over a hole the funnel tapers to a tip.
  float gr = twGround(A.xy);
  vec3 upv = normalize(vec3(A.x, 0.0, A.y) - PC);
  vec3 ld = deepLight(upv);
  float phL = clPhase(dot(rd, ld));
  vec3 alb0 = mix(pal(0.5), vec3(0.85), 0.35);
  vec3 col = vec3(0.0);
  vec3 ceilC = mix(pal(0.05), vec3(0.8), 0.25);
  float Tt = 1.0, shk = -1.0;
  // The fine step grows with distance, to about a pixel of the march.
  float fine = max(0.08 * s, ta * 0.0012);
  float t = ta + jit * fine;
  for (int k = 0; k < 96; k++) {
    if (t > tb || Tt < 0.03) break;
    vec3 p = ro + rd * t;
    float h = altOf(p), Y = (h - B.x) / s, f = Y / TW_H;
    if (f < 0.0 || f > 1.0) { t += fine * 3.0; continue; }
    vec2 q = (p.xz - A.xy) / s - twAxis(Y, v, ph);
    float r = length(q), R = twR(Y, v, w, ph) * mix(pow(smoothstep(0.0, 0.45, f), 0.8), 1.0, gr);
    // Far from the column, step by the gap to its widest wall.
    if (r > R * 1.8) { t += max((r - R * 1.8) * s * 0.5, fine); continue; }
    vec4 wl;
    float Rw = twWall(q, Y, v, R, spin, wl);
    // Short skips keep the soft edge whole; a far edge widens to a pixel, so it does not stipple.
    float st = r > Rw ? max((r - Rw) * s * 0.4, fine) : fine;
    float soft = (0.5 + 0.6 * f) * (v == 2 ? 1.6 : 1.0) * w + t * 0.003 / s;
    // The top thins into the ceiling's wall cloud; the foot thins into its dust.
    float foot = mix(smoothstep(0.0, 0.12, f), mix(0.3, 1.0, smoothstep(0.0, 0.1, f)), gr);
    float dd = smoothstep(0.0, soft, Rw - r) * wl.g * 1.8 * (1.0 - 0.75 * smoothstep(0.84, 0.98, f)) * foot;
    if (dd > 0.002) {
      tF = tF < 0.0 ? t : min(tF, t);
      // The wall's normal: the radial way, tipped by the wall's slope round and up.
      vec4 wx;
      float ca = cos(0.03), sa = sin(0.03);
      float Ra = twWall(mat2(ca, sa, -sa, ca) * q, Y, v, R, spin, wx);
      float Yu = Y + 0.3, Ru = twWall(q, Yu, v, twR(Yu, v, w, ph), spin, wx);
      float dRa = (Ra - Rw) / 0.03, dRy = (Ru - Rw) / 0.3;
      vec2 rh = q / max(r, 1e-3), th = vec2(-rh.y, rh.x);
      vec2 nh = rh - th * dRa / max(r, 0.05);
      vec3 N = normalize(vec3(nh.x, -dRy, nh.y));
      float side = dot(N, ld);
      float depth = clamp(r / max(Rw, 1e-3), 0.0, 1.0);
      vec4 L = lut(h);
      // Pools of light through the ceiling's breaks reach the twister too.
      if (shk < 0.0) {
        vec2 vo = voidOver(h);
        shk = vo.x > -1e3 ? mix(0.5, 1.0 + 0.9 * uRays, shaftAt(p, h, ld, upv, vo)) : 1.0;
      }
      vec3 key = L.rgb * (L.a * 0.85 * clPhase(dot(rd, SUN)) + (1.0 - L.a) * (0.07 + mix(1.0, phL, 0.4)) * uTune.y * shk);
      // Tornado alley's funnel light: the lit side falls off into the body; the top is darker.
      float tod = (1.0 - side) * 1.1 + (1.0 - depth) * 0.9 * (0.5 - 0.5 * side) + smoothstep(0.45, 1.0, f) * 0.9;
      float tl = (exp(-tod) + 0.3 * exp(-tod * 0.4) + 0.05 * exp(-tod * 0.16)) / 1.35;
      // The shade side fills cool slate, less deep in the body; the floor's light warms the foot.
      vec3 amb = L.rgb * (0.05 + 0.1 * (1.0 - L.a)) * vec3(0.7, 0.85, 1.2) * (0.3 + 0.55 * f) * exp(-(1.0 - depth) * 1.6);
      amb += lut(B.x + 3.0).rgb * 0.12 * (1.0 - f) * max(0.0, -N.y + 0.3) * uTune.z;
      // Rim: the thin grazing edge glows toward the light.
      float rim = pow(1.0 - abs(dot(N, rd)), 3.0) * depth * phL;
      // The colour blends into the ceiling's only where the top meets it.
      vec3 alb = mix(alb0 * mix(vec3(1.0), vec3(0.92, 0.88, 1.08), f), ceilC, 0.6 * smoothstep(0.88, 0.99, f));
      vec3 Lc = alb * (key * (tl * 1.8 + rim * 0.6) + amb * 1.5);
      for (int j = 0; j < 4; j++) {
        vec4 fl = uFlash[j];
        if (fl.w <= 0.0) continue;
        vec3 fq = fl.xyz - p;
        float d2 = dot(fq, fq);
        Lc += FLASH_C * fl.w * (1.8 * exp(-d2 / 60.0) + 0.5 * exp(-sqrt(d2) / 14.0)) * exp(-(1.0 - depth) * 1.2);
      }
      float aa = 1.0 - exp(-6.0 * dd * st);
      col += Tt * Lc * aa;
      Tt *= 1.0 - aa;
    }
    t += st;
  }
  return vec4(col, 1.0 - Tt);
}
// Every twister along the ray, front to back. tF is the first hit, or -1.
vec4 twisters(vec3 ro, vec3 rd, float ta, float tb, out float tF) {
  tF = -1.0;
  vec3 c = vec3(0.0);
  float Tt = 1.0;
  // Interleaved gradient noise: an even spread, with less grain than a hash.
  float jit = fract(52.9829189 * fract(dot(gl_FragCoord.xy + uSeed * 5.588, vec2(0.06711056, 0.00583715))));
  for (int i = 0; i < ${TW_MAX}; i++) {
    if (uTwB[i].y <= 0.0) continue;
    vec4 r = twister(i, ro, rd, ta, tb, jit, tF);
    c += Tt * r.rgb;
    Tt *= 1.0 - r.a;
  }
  return vec4(c, 1.0 - Tt);
}`;

/* ---------- The set in the upper void ---------- */
// The eye looks toward -z, within 50 degrees either way.
// az is degrees from -z toward +x; d is km; w scales the width.
const SET = [
  { az: 14, d: 38, v: 0, w: 1.0, spin: 0.16 },
  { az: -32, d: 62, v: 2, w: 1.1, spin: 0.22 },
  { az: 38, d: 95, v: 1, w: 1.0, spin: 0.1 },
  { az: -8, d: 140, v: 1, w: 1.3, spin: 0.12 },
  { az: -44, d: 190, v: 0, w: 1.25, spin: 0.14 },
  { az: 28, d: 240, v: 2, w: 1.4, spin: 0.2 },
];
// The foot sinks 1.5 km into the floor; the top reaches the ceiling.
const FLO = -41.5, HT = 42.5;
/** Fills the twister uniforms for time t (s): each wanders slowly round its spot. */
export function twisterUniforms(t, a, b) {
  SET.forEach((s, i) => {
    const r = s.az * Math.PI / 180;
    const x = Math.sin(r) * s.d + 3 * Math.sin(t * 0.008 + i * 1.7);
    const z = -Math.cos(r) * s.d + 3 * Math.cos(t * 0.006 + i * 2.3);
    a.set([x, z, s.w, s.v], i * 4);
    b.set([FLO, HT, s.spin, i * 1.9], i * 4);
  });
}
