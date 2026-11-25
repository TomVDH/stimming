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
export const TW_MAX = 14;
// uTwA: x, z, width, variety plus 4 for a tip at the base. uTwB: floor altitude, height, spin in rad/s, phase.
// uTwC: the top's x and z, the sag's reach, the dust's reach.
// A height of 0 turns the twister off.
// TW_DECL goes before dens(): the ceiling and the floor read the twisters too.
export const TW_DECL = /* glsl */`
uniform mediump sampler2DArray uWall;
uniform vec4 uTwA[${TW_MAX}];
uniform vec4 uTwB[${TW_MAX}];
uniform vec4 uTwC[${TW_MAX}];
// Dev (Tom, 2026-11-24): 0 draws the relief march, 1 flipbook cards,
// 2 the full march within uTwMix km of the eye and cards past it,
// 3 ceiling funnels in the cloud density, with no twister layers,
// 4 ceiling funnels within uTwMix km and cards past it.
// uCardK scales the cards' light to the void's.
uniform float uTwCard, uCardK, uTwMix;
// The ceiling funnels' rim and back light.
uniform float uRimK;
// The angle one march pixel spans, in radians.
uniform float uPixA;
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
// uTwC holds each top's place and the sag's and the dust's reach, set in JS.
float twSag(vec2 xz) {
  float g = 0.0;
  for (int i = 0; i < ${TW_MAX}; i++) {
    vec4 C = uTwC[i];
    if (C.z <= 0.0) continue;
    vec2 d = xz - C.xy;
    g = max(g, exp(-dot(d, d) / (C.z * C.z)));
  }
  return 9.0 * g;
}
// Ceiling funnels (Tom, 2026-11-24: "the cloud layer warped down as a contiguous piece").
// At each twister the ceiling's own cloud is pulled down to the floor, as in Tornado alley.
// n1 and n2 are the deck's noise at p, so the funnel's wall rags as the ceiling does.
// tw takes the funnel light's terms: side to the light, depth, height,
// and 2 plus the wall's facing angle in turns, for a funnel.
float ceilFunnel(vec3 p, float h, vec4 n1, vec4 n2, out vec4 tw) {
  float res = 0.0;
  tw = vec4(0.0);
  for (int i = 0; i < ${TW_MAX}; i++) {
    vec4 A = uTwA[i], B = uTwB[i];
    if (B.y <= 0.0) continue;
    // In mode 4 the far ones are cards.
    if (uTwCard > 3.5 && length(A.xy - uCam.xz) > uTwMix) continue;
    // 1.5 is the cards' girth, CARD_MS.
    float s = B.y / TW_H, w = A.z * 1.5;
    vec2 d0 = (p.xz - A.xy) / s;
    if (dot(d0, d0) > 900.0) continue;
    float Y = (h - B.x) / s, f = clamp(Y / TW_H, 0.0, 1.0);
    int v = int(A.w + 0.5) % 4;
    vec2 q = d0 - twAxis(Y, v, B.w);
    float rr = length(q);
    // A tip twister narrows to a point at its foot.
    float R = twRad(Y, v) * w * (A.w > 3.5 ? pow(smoothstep(0.0, 0.45, f), 0.8) : 1.0);
    float edge = R * (0.7 + 0.5 * n1.b + 0.35 * (n2.r - 0.5));
    if (rr > edge * 1.3 + 0.5) continue;
    // The wall swirls on angle and log radius, as in Tornado alley, so it never winds up.
    float a = atan(q.y, q.x) - uT * B.z - 2.0 * log(max(rr, 0.05));
    float sw = textureLod(uVol, vec3(cos(a) * 0.4 + A.x * 0.013, Y / 14.0 - uT * 0.01, sin(a) * 0.4 + A.y * 0.013), 0.0).r;
    float twd = smoothstep(edge * 1.25 + 0.3, edge * 0.5, rr) * (0.35 + 0.9 * sw);
    // The foot thins into the deck, or into the air over a tip.
    twd *= mix(0.45, 1.0, smoothstep(0.0, 0.15, f));
    if (twd > res) {
      res = twd;
      vec3 lt = deepLight(normalize(p - PC));
      tw = vec4(dot(q / max(rr, 1e-3), normalize(lt.xz + 1e-5)), clamp(rr / (edge * 1.25 + 0.3), 0.0, 1.0), f, 2.0 + fract(atan(q.y, q.x) / 6.2831853 + 1.0));
    }
  }
  return res;
}
// The dust heap round each twister's foot: its height over the floor, in km.
float twDust(vec2 xz) {
  float g = 0.0;
  for (int i = 0; i < ${TW_MAX}; i++) {
    float rf = uTwC[i].w;
    if (rf <= 0.0) continue;
    vec2 d = xz - uTwA[i].xy;
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
// One twister along the ray: premultiplied light and alpha. tF is where it first shows, or -1.
vec4 twister(int i, vec3 ro, vec3 rd, float ta0, float tb0, float jit, inout float tF) {
  vec4 A = uTwA[i], B = uTwB[i];
  int v = int(A.w + 0.5) % 4;
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
  // Some taper to a tip wherever they stand (Tom, 2026-11-24).
  float gr = A.w > 3.5 ? 0.0 : twGround(A.xy);
  vec3 upv = normalize(vec3(A.x, 0.0, A.y) - PC);
  // Backlit (Tom, 2026-11-24): the light comes from behind the twister, as the eye sees it, and from above.
  vec3 bk = normalize(vec3(A.x - ro.x, 0.0, A.y - ro.z) + 1e-4);
  vec3 ld = normalize(mix(deepLight(upv), normalize(bk + upv * 0.8), 0.75));
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
    // The foot thins into its dust.
    float foot = mix(smoothstep(0.0, 0.12, f), mix(0.3, 1.0, smoothstep(0.0, 0.1, f)), gr);
    // The top fades out in the wall cloud, so the march's ceiling shows through (Tom, 2026-11-24).
    // The wall's noise rags the fade, so it draws no level line.
    float top = 1.0 - smoothstep(0.68, 0.86, f + 0.3 * (wl.a - 0.5));
    float dd = smoothstep(0.0, soft, Rw - r) * wl.g * 1.8 * top * foot;
    if (dd > 0.002) {
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
      // Volumetric backlight: the light behind shines through what column lies toward it.
      // The path to the wall along the light's level way gives the depth; thin edges glow, the core stays dark.
      vec2 lh = normalize(ld.xz + 1e-5);
      float qd = dot(q, lh), dc = Rw * Rw - (r * r - qd * qd);
      float chord = dc > 0.0 ? max(0.0, -qd + sqrt(dc)) : 0.0;
      float thru = exp(-chord * s / max(length(ld.xz), 0.3) * 1.1) * phL;
      // The colour blends into the ceiling's only where the top meets it.
      vec3 alb = mix(alb0 * mix(vec3(1.0), vec3(0.92, 0.88, 1.08), f), ceilC, 0.7 * smoothstep(0.6, 0.84, f));
      vec3 Lc = alb * (key * (tl * 1.8 + rim * 0.8 + thru * 2.8) + amb * 1.5);
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
      // Its depth is where it first shows: faint fringe does not count.
      if (tF < 0.0 && Tt < 0.97) tF = t;
    }
    t += st;
  }
  return vec4(col, 1.0 - Tt);
}
// The fully marched twister (Tom, 2026-11-24: "fully marched ones for the close ones").
// It marches the spike's density and backlight live, at the cards' girth and in their colours.
// Value noise on a hash, as the spike and the card bake have it.
float tvH(vec3 p) { p = fract(p * 0.1031); p += dot(p, p.zyx + 31.32); return fract((p.x + p.y) * p.z); }
float tvN(vec3 p) {
  vec3 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(tvH(i), tvH(i + vec3(1, 0, 0)), f.x), mix(tvH(i + vec3(0, 1, 0)), tvH(i + vec3(1, 1, 0)), f.x), f.y),
             mix(mix(tvH(i + vec3(0, 0, 1)), tvH(i + vec3(1, 0, 1)), f.x), mix(tvH(i + vec3(0, 1, 1)), tvH(i + vec3(1, 1, 1)), f.x), f.y), f.z);
}
float tvF(vec3 p, int oct) {
  float a = 0.5, s = 0.0;
  for (int i = 0; i < 4; i++) { if (i >= oct) break; s += a * tvN(p); p = p * 2.03 + vec3(1.7, 9.2, 3.1); a *= 0.5; }
  return s;
}
// The spike's density at shape point q (off the axis) and height Y; R is the radius; turn is in turns.
float tvDens(vec2 q, float Y, int v, float R, float turn, int oct) {
  float r = length(q);
  if (r > R * 1.7 + 0.8) return 0.0;
  float f = Y / TW_H;
  float a = atan(q.y, q.x) - turn * 6.2831853 - f * 6.0;
  float n = tvF(vec3(cos(a) * 1.4, sin(a) * 1.4, Y * 0.3) * 1.7 + vec3(0.0, 0.0, r * 0.4), oct);
  float hel = 0.5 + 0.5 * cos(2.0 * a + Y * 0.9);
  float ph = (Y / 2.6 - turn * 2.0) * 6.2831853 + a + 1.4 * sin(a + Y * 0.25) + n * 4.0;
  float bands = smoothstep(0.35, 0.95, 0.5 + 0.5 * sin(ph));
  float rough = v == 2 ? 0.25 : v == 1 ? 0.8 : 1.0, bandK = v == 2 ? 0.35 : v == 1 ? 0.6 : 1.0;
  float edge = R * (0.62 + (1.0 - rough) * 0.32 + 0.5 * n * rough + 0.32 * hel * rough + 0.26 * bands * bandK) - r;
  float d = smoothstep(0.0, (0.5 + 0.6 * f) * (v == 2 ? 0.9 : 1.0), edge);
  float skirt = 1.0 - smoothstep(0.02, 0.16, f);
  d *= mix(1.0, smoothstep(0.35, 0.75, n + 0.2 * hel), skirt * 0.8);
  d *= mix(1.0, smoothstep(0.3, 0.7, n), smoothstep(0.75, 1.0, f) * 0.7);
  // The top thins out over a long reach, ragged by the noise, so it melts into the wall cloud.
  d *= 1.0 - smoothstep(0.6, 0.9, f + 0.45 * (n - 0.5));
  return d * (0.6 + 0.5 * mix(0.5, n, rough) + 0.35 * bands * bandK + 0.2 * hel);
}
float tvHG(float mu, float g) { float g2 = g * g; return (1.0 - g2) / (12.566371 * pow(1.0 + g2 - 2.0 * g * mu, 1.5)); }
float tvPhase(float mu) { return mix(tvHG(mu, 0.75), tvHG(mu, -0.2), 0.3) * 12.566371; }
vec4 twVol(int i, vec3 ro, vec3 rd, float ta0, float tb0, float jit, inout float tF) {
  vec4 A = uTwA[i], B = uTwB[i];
  int v = int(A.w + 0.5) % 4;
  float s = B.y / TW_H, w = A.z * CD_MS, ph = B.w;
  // Half the twister's spin, as the cards turn.
  float turn = uT * B.z * 0.5 / 6.2831853 + ph * 0.1;
  float Rb = s * (w * twRad(TW_H * 0.9, v) * 1.7 + 7.0);
  vec2 oc = ro.xz - A.xy;
  float a2 = dot(rd.xz, rd.xz), b = dot(oc, rd.xz), c = dot(oc, oc) - Rb * Rb;
  float disc = b * b - a2 * c;
  if (disc < 0.0 || a2 < 1e-6) return vec4(0.0);
  float sq = sqrt(disc), ta = (-b - sq) / a2, tb = (-b + sq) / a2;
  if (abs(rd.y) > 1e-5) {
    float u0 = (B.x - 0.6 - ro.y) / rd.y, u1 = (B.x + B.y * 0.92 - ro.y) / rd.y;
    ta = max(ta, min(u0, u1));
    tb = min(tb, max(u0, u1));
  }
  ta = max(ta, ta0);
  tb = min(tb, tb0);
  if (ta >= tb) return vec4(0.0);
  // The light comes from behind the twister as the eye sees it, a little above and to the left: the spike's.
  vec3 bk = normalize(vec3(A.x - ro.x, 0.0, A.y - ro.z) + 1e-4);
  vec3 sd = normalize(cross(bk, vec3(0.0, 1.0, 0.0)));
  vec3 ld = normalize(bk * 0.9 + vec3(0.0, 0.35, 0.0) + sd * 0.25);
  float pha = tvPhase(dot(rd, ld));
  // Over cloud the foot melts into the deck; over a hole, or for a tip twister, the funnel tapers to a tip.
  float gr = A.w > 3.5 ? 0.0 : twGround(A.xy);
  // Steps of 0.18 shape km; the jitter and the frame history fill between them.
  // A far column takes longer ones, to about a pixel of the march.
  float st = max(0.18, ta * 0.0012 / s);
  float t = ta + jit * st * s, lum = 0.0, Tt = 1.0, fF = -1.0;
  for (int k = 0; k < 160; k++) {
    if (t > tb || Tt < 0.03) break;
    vec3 p = ro + rd * t;
    float Y = (altOf(p) - B.x) / s;
    vec2 q = (p.xz - A.xy) / s - twAxis(Y, v, ph);
    float f0 = Y / TW_H;
    float tip = mix(pow(smoothstep(0.0, 0.45, f0), 0.8), 1.0, gr);
    float R = twRad(Y, v) * w * tip, r = length(q);
    // Far from the column, step by the gap to its widest wall.
    if (r > R * 1.7 + 0.8) { t += max((r - R * 1.7 - 0.8) * 0.6, st) * s; continue; }
    float d = tvDens(q, Y, v, R, turn, 3);
    if (d > 0.002) {
      // The light's depth toward the light behind, over four growing taps.
      float od = 0.0, ls = 0.35;
      vec3 pl = vec3(q.x, Y, q.y);
      for (int j = 0; j < 4; j++) {
        pl += ld * ls;
        vec2 ql = pl.xz + twAxis(Y, v, ph) - twAxis(pl.y, v, ph);
        od += tvDens(ql, pl.y, v, twRad(pl.y, v) * w * tip, turn, 2) * ls;
        ls *= 1.8;
      }
      float f = Y / TW_H;
      // The card bake's rate: the body goes dark, thin edges pass the light.
      od = od * 8.0 * (v == 2 ? 2.0 : 1.0) + smoothstep(0.55, 1.0, f) * 1.5;
      float sun = exp(-od) * pha + 0.15 * exp(-od * 0.25) * tvPhase(dot(rd, ld) * 0.5) + 0.03 * exp(-od * 0.1);
      float amb = mix(0.04, 0.09, f) * exp(-max(0.0, 1.0 - r / R) * 1.6);
      float al = 1.0 - exp(-d * 6.0 * st);
      lum += Tt * (sun + amb) * al;
      Tt *= 1.0 - al;
      if (fF < 0.0) fF = f;
      if (tF < 0.0 && Tt < 0.97) tF = t;
    }
    t += st * s;
  }
  float al = 1.0 - Tt;
  if (al < 1e-3) return vec4(0.0);
  vec3 p = ro + rd * max(tF, ta);
  float h = altOf(p);
  vec3 col = cardTint(lum / al, max(fF, 0.0)) * (lum + 0.05 * al);
  // The void's light sets the level, as on the cards.
  col *= dot(lut(h).rgb, vec3(0.3, 0.5, 0.2)) * uCardK;
  float fk = 0.0;
  for (int j = 0; j < 4; j++) {
    vec4 fl = uFlash[j];
    if (fl.w <= 0.0) continue;
    vec3 fq = fl.xyz - p;
    float d2 = dot(fq, fq);
    fk += fl.w * (1.8 * exp(-d2 / 60.0) + 0.5 * exp(-sqrt(d2) / 14.0));
  }
  col += mix(pal(0.5), vec3(0.85), 0.35) * FLASH_C * fk * al * (1.0 - 0.55 * al);
  return vec4(col, al);
}
// One flipbook card along the ray: a vertical plane through the twister, square to the view.
// card() needs CARD_GL ahead of this code. tF is where the card shows, or -1.
vec4 twCard(int i, vec3 ro, vec3 rd, float ta, float tb, inout float tF) {
  vec4 A = uTwA[i], B = uTwB[i];
  float s = B.y / TW_H;
  vec2 n = normalize(uFwd.xz + vec2(0.0, 1e-5));
  float dn = dot(rd.xz, n);
  if (dn < 1e-4) return vec4(0.0);
  float t = dot(A.xy - ro.xz, n) / dn;
  if (t < ta || t > tb) return vec4(0.0);
  vec3 p = ro + rd * t;
  float h = altOf(p);
  vec2 rt = vec2(-n.y, n.x);
  vec2 vT = vec2(dot(p.xz - A.xy, rt) / (2.0 * CD_FX * s * A.z) + 0.5, (h - B.x) / (CD_FY * s));
  if (vT.x < 0.0 || vT.x > 1.0 || vT.y < 0.0 || vT.y > 1.0) return vec4(0.0);
  // The mip level from the distance: frame texels over a pixel's width at t (Tom, 2026-11-24: flicker).
  float lod = log2(max(1.0, t * uPixA * CD_W / (2.0 * CD_FX * s * A.z)));
  vec4 c = card(int(A.w + 0.5) % 4, vT, uT, B.w, B.z, lod);
  if (c.a < 1e-3) return vec4(0.0);
  // The void's light sets the card's level; the hue stays the card's own.
  c.rgb *= dot(lut(h).rgb, vec3(0.3, 0.5, 0.2)) * uCardK;
  // Flashes light it from inside; alpha stands in for thickness, so thin parts glow most.
  float fk = 0.0;
  for (int j = 0; j < 4; j++) {
    vec4 fl = uFlash[j];
    if (fl.w <= 0.0) continue;
    vec3 fq = fl.xyz - p;
    float d2 = dot(fq, fq);
    fk += fl.w * (1.8 * exp(-d2 / 60.0) + 0.5 * exp(-sqrt(d2) / 14.0));
  }
  c.rgb += mix(pal(0.5), vec3(0.85), 0.35) * FLASH_C * fk * c.a * (1.0 - 0.55 * c.a);
  if (tF < 0.0 && c.a > 0.03) tF = t;
  return c;
}
// One layer over another, both premultiplied.
vec4 twOver(vec4 f, vec4 b) { return vec4(f.rgb + (1.0 - f.a) * b.rgb, f.a + (1.0 - f.a) * b.a); }
// The twisters along the ray in two layers, each at its own depth, so the march puts clouds between them.
// Layer A is the nearest twister; layer B holds the rest. A depth of -1 means none.
vec4 twisters(vec3 ro, vec3 rd, float ta, float tb, out float tA, out vec4 cB, out float tB) {
  tA = -1.0; tB = -1.0;
  vec4 cA = vec4(0.0);
  cB = vec4(0.0);
  // Interleaved gradient noise: an even spread, with less grain than a hash.
  float jit = fract(52.9829189 * fract(dot(gl_FragCoord.xy + uSeed * 5.588, vec2(0.06711056, 0.00583715))));
  for (int i = 0; i < ${TW_MAX}; i++) {
    if (uTwB[i].y <= 0.0 || float(i) < uTwLo || float(i) >= uTwHi) continue;
    float tf = -1.0;
    // Mixed: the full march within uTwMix km, cards past it.
    bool near = length(uTwA[i].xy - ro.xz) <= uTwMix;
    // Mode 4: the near ones are funnels in the cloud density.
    if (uTwCard > 3.5 && near) continue;
    vec4 r = uTwCard < 0.5 ? twister(i, ro, rd, ta, tb, jit, tf)
      : uTwCard > 1.5 && uTwCard < 2.5 && near ? twVol(i, ro, rd, ta, tb, jit, tf)
      : twCard(i, ro, rd, ta, tb, tf);
    if (tf < 0.0) continue;
    // A nearer one takes layer A; the old A joins layer B in depth order.
    if (tA < 0.0 || tf < tA) {
      if (tA > 0.0) { cB = tB < 0.0 || tA < tB ? twOver(cA, cB) : twOver(cB, cA); tB = tB < 0.0 ? tA : min(tA, tB); }
      cA = r; tA = tf;
    } else {
      cB = tB < 0.0 || tf < tB ? twOver(r, cB) : twOver(cB, r);
      tB = tB < 0.0 ? tf : min(tf, tB);
    }
  }
  return cA;
}`;

/* ---------- The set in the upper void ---------- */
// The eye looks toward -z, within about 55 degrees either way.
// az is degrees from -z toward +x; d is km; w scales the width.
// Two stand up front, seven in the middle distance, five far off (Tom, 2026-11-24).
// One medium wedge; the rest are thin, and about half taper to a tip at the base.
const NEAR = [
  { az: 16, d: 42, v: 2, w: 0.85, tip: 1, spin: 0.16 },
  { az: -30, d: 58, v: 0, w: 0.7, tip: 0, spin: 0.22 },
  { az: -46, d: 110, v: 2, w: 0.9, tip: 1, spin: 0.2 },
  { az: 2, d: 140, v: 1, w: 0.8, tip: 0, spin: 0.1 },
  { az: 44, d: 125, v: 0, w: 0.75, tip: 1, spin: 0.14 },
  { az: -20, d: 165, v: 2, w: 0.8, tip: 0, spin: 0.18 },
  { az: 24, d: 185, v: 0, w: 0.8, tip: 1, spin: 0.15 },
  { az: -6, d: 230, v: 2, w: 1.0, tip: 1, spin: 0.21 },
  { az: 36, d: 255, v: 0, w: 0.9, tip: 0, spin: 0.13 },
];
// The far ones are seeded, so they stand in the same places every visit.
function seeded(n) {
  let a = 0x2f6b1c9d;
  const rnd = () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  return Array.from({ length: n }, (_, i) => ({
    az: ((i + 0.5) / n - 0.5) * 100 + (rnd() - 0.5) * 10,
    d: 320 * Math.pow(850 / 320, rnd()),
    v: rnd() < 0.5 ? 0 : 2,
    w: 0.85 + 0.4 * rnd(),
    tip: rnd() < 0.5 ? 1 : 0,
    spin: 0.08 + 0.14 * rnd(),
  }));
}
const SET = [...NEAR, ...seeded(TW_MAX - NEAR.length)].sort((a, b) => a.d - b.d);

// The foot sinks 1.5 km into the floor; the top reaches the ceiling.
const FLO = -41.5, HT = 42.5, SH = 24;
// The shape in JS, as in TW_SHAPE: the bend, the radius.
const bendK = v => (v === 1 ? 0.45 : v === 2 ? 1.25 : 1);
const radAt = (f, v) => {
  const fl = Math.pow(Math.min(1, Math.max(0, (f - 0.7) / 0.3)) ** 2 * (3 - 2 * Math.min(1, Math.max(0, (f - 0.7) / 0.3))), 2);
  if (v === 1) return 1.5 + 4.4 * Math.pow(f, 1.2) + 3 * Math.exp(-f * 10) + 4.5 * fl;
  if (v === 2) return 0.42 + 1.5 * Math.pow(f, 2.2) + 1.1 * Math.exp(-f * 20) + 6.5 * fl;
  return 0.55 + 2.4 * Math.pow(f, 1.6) + 2.2 * Math.exp(-f * 16) + 6 * fl;
};
/** Fills the twister uniforms for time t (s): each wanders slowly round its spot. */
export function twisterUniforms(t, a, b, c) {
  const s = HT / SH;
  SET.forEach((e, i) => {
    const r = e.az * Math.PI / 180;
    const x = Math.sin(r) * e.d + 3 * Math.sin(t * 0.008 + i * 1.7);
    const z = -Math.cos(r) * e.d + 3 * Math.cos(t * 0.006 + i * 2.3);
    const ph = i * 1.9, k = bendK(e.v);
    a.set([x, z, e.w, e.v + 4 * e.tip], i * 4);
    b.set([FLO, HT, e.spin, ph], i * 4);
    // The top's place: the bend and the sway at the top, as twAxis() has them.
    const tx = k * 4.2 * Math.sin(3.3) + 0.7 * Math.sin(t * 0.05 + ph + 3);
    const tz = k * 2.4 * Math.sin(5.0) + 0.7 * Math.cos(t * 0.04 + ph * 1.3 + 2);
    c.set([x + tx * s, z + tz * s, s * e.w * radAt(0.9, e.v) * 1.4, e.tip ? 0 : s * e.w * radAt(0, e.v) * 2.4], i * 4);
  });
}

/* ---------- Flipbook cards: the spike's backlit twister, baked (Tom, 2026-11-24) ---------- */
// A frame holds x from -CARD_FX to CARD_FX km and y from 0 to CARD_FY km, in the shape frame.
// The top fades out by 0.86 of the height, so the frame stops at 0.9.
// CARD_MS scales the girth (Tom, 2026-11-24: "more massive"); the frame widens to hold it.
export const CARD_MS = 1.5, CARD_FX = 16, CARD_FY = 21.6;
// 32 pixels a km; 12 frames a turn, neighbours cross-fade; one set per variety.
export const CARD_W = 1024, CARD_H = Math.round(CARD_W * CARD_FY / (2 * CARD_FX) / 4) * 4, CARD_NF = 12, CARD_NV = 3;
// How fast a column swallows the light behind it: the body goes dark, the rim glows.
const CARD_OD = 8;
const CARD_K = `const float CD_FX = ${CARD_FX.toFixed(1)}, CD_FY = ${CARD_FY.toFixed(1)}, CD_MS = ${CARD_MS.toFixed(2)};
const float CD_W = ${CARD_W.toFixed(1)}, CD_H = ${CARD_H.toFixed(1)};
const int CD_NF = ${CARD_NF};`;
// The bake: the spike's march, lit from behind, seen square on.
// A frame keeps light and alpha only; card() adds the colour.
export const CARD_BAKE_FS = /* glsl */`#version 300 es
precision highp float;
in vec2 vUv;
out vec4 o;
uniform float uT, uOd;
uniform int uV;
${CARD_K}
int gV = 0;
const float H = 24.0, PI = 3.14159265;
float h13(vec3 p) { p = fract(p * 0.1031); p += dot(p, p.zyx + 31.32); return fract((p.x + p.y) * p.z); }
float vn3(vec3 p) {
  vec3 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(h13(i), h13(i + vec3(1, 0, 0)), f.x), mix(h13(i + vec3(0, 1, 0)), h13(i + vec3(1, 1, 0)), f.x), f.y),
             mix(mix(h13(i + vec3(0, 0, 1)), h13(i + vec3(1, 0, 1)), f.x), mix(h13(i + vec3(0, 1, 1)), h13(i + vec3(1, 1, 1)), f.x), f.y), f.z);
}
float fbm(vec3 p, int oct) {
  float a = 0.5, s = 0.0;
  for (int i = 0; i < 6; i++) { if (i >= oct) break; s += a * vn3(p); p = p * 2.03 + vec3(1.7, 9.2, 3.1); a *= 0.5; }
  return s;
}
vec2 axisAt(float y) {
  float f = y / H, b = gV == 1 ? 0.45 : gV == 2 ? 1.25 : 1.0;
  return b * vec2(4.2 * sin(f * 3.0 + 0.3) * f, 2.4 * sin(f * 3.8 + 1.2) * f);
}
float radAt(float y) {
  float f = clamp(y / H, 0.0, 1.0), fl = pow(smoothstep(0.7, 1.0, f), 2.0);
  if (gV == 1) return CD_MS * (1.5 + 4.4 * pow(f, 1.2) + 3.0 * exp(-f * 10.0) + 4.5 * fl);
  if (gV == 2) return CD_MS * (0.42 + 1.5 * pow(f, 2.2) + 1.1 * exp(-f * 20.0) + 6.5 * fl);
  return CD_MS * (0.55 + 2.4 * pow(f, 1.6) + 2.2 * exp(-f * 16.0) + 6.0 * fl);
}
// The spike's density, with one change: one turn of uT loops the wall.
float dens(vec3 p, int oct) {
  if (p.y < 0.0 || p.y > H) return 0.0;
  vec2 q = p.xz - axisAt(p.y);
  float r = length(q), R = radAt(p.y);
  if (r > R * 1.7 + 0.8) return 0.0;
  float f = p.y / H;
  float a = atan(q.y, q.x) - uT * 2.0 * PI - f * 6.0;
  vec3 c = vec3(cos(a) * 1.4, sin(a) * 1.4, p.y * 0.3);
  float n = fbm(c * 1.7 + vec3(0.0, 0.0, r * 0.4), oct);
  float hel = 0.5 + 0.5 * cos(2.0 * a + p.y * 0.9);
  float ph = (p.y / 2.6 - uT * 2.0) * 2.0 * PI + a + 1.4 * sin(a + p.y * 0.25) + n * 4.0;
  float bands = smoothstep(0.35, 0.95, 0.5 + 0.5 * sin(ph));
  float rough = gV == 2 ? 0.25 : gV == 1 ? 0.8 : 1.0, bandK = gV == 2 ? 0.35 : gV == 1 ? 0.6 : 1.0;
  float edge = R * (0.62 + (1.0 - rough) * 0.32 + 0.5 * n * rough + 0.32 * hel * rough + 0.26 * bands * bandK) - r;
  // The rope's edge stays tight, so it has a dense core to shade.
  float d = smoothstep(0.0, (0.5 + 0.6 * f) * (gV == 2 ? 0.9 : 1.0), edge);
  float skirt = 1.0 - smoothstep(0.02, 0.16, f);
  d *= mix(1.0, smoothstep(0.35, 0.75, n + 0.2 * hel), skirt * 0.8);
  d *= mix(1.0, smoothstep(0.3, 0.7, n), smoothstep(0.75, 1.0, f) * 0.7);
  // The top fades out raggedly, as the toy's tops do in the wall cloud.
  d *= 1.0 - smoothstep(0.68, 0.86, f + 0.3 * (n - 0.5));
  return d * (0.6 + 0.5 * mix(0.5, n, rough) + 0.35 * bands * bandK + 0.2 * hel);
}
float hg(float mu, float g) { float g2 = g * g; return (1.0 - g2) / (4.0 * PI * pow(1.0 + g2 - 2.0 * g * mu, 1.5)); }
float phase(float mu) { return mix(hg(mu, 0.75), hg(mu, -0.2), 0.3) * 4.0 * PI; }
void main() {
  gV = uV;
  // The spike's light from behind: the eye looks along -z, the light comes toward it.
  vec3 L = normalize(vec3(-0.25, 0.35, -0.9));
  vec3 Lc = vec3(0.85, 1.0, 0.95) * 1.1;
  // Parallel rays: a card has no perspective of its own.
  vec3 ro = vec3((vUv.x - 0.5) * 2.0 * CD_FX, vUv.y * CD_FY, CD_FX), rd = vec3(0.0, 0.0, -1.0);
  // The frame keeps light and alpha only; the card shader adds the colour.
  float lum = 0.0;
  float T = 1.0;
  float t = 0.12 * h13(vec3(gl_FragCoord.xy, 3.0 + uT));
  for (int i = 0; i < 400; i++) {
    if (t > 2.0 * CD_FX || T < 0.01) break;
    vec3 p = ro + rd * t;
    float d = dens(p, 6);
    if (d > 0.002) {
      float od = 0.0, st = 0.25;
      vec3 q = p;
      for (int j = 0; j < 8; j++) { q += L * st; od += dens(q, 4) * st; st *= 1.45; }
      float f = p.y / H;
      // A thicker light path darkens the body; only thin edges pass the light.
      // The thin rope takes twice the rate, or the light passes all of it.
      od = od * uOd * (gV == 2 ? 2.0 : 1.0) + smoothstep(0.55, 1.0, f) * 1.5;
      float mu = dot(rd, L);
      float sunL = exp(-od) * phase(mu) + 0.15 * exp(-od * 0.25) * phase(mu * 0.5) + 0.03 * exp(-od * 0.1);
      vec2 qa = p.xz - axisAt(p.y);
      float depth = max(0.0, 1.0 - length(qa) / radAt(p.y));
      float amb = mix(0.04, 0.09, f) * exp(-depth * 1.6);
      float a = 1.0 - exp(-d * 6.0 * 0.08);
      lum += T * (sunL + amb) * a;
      T *= 1.0 - a;
    }
    t += 0.08;
  }
  // Premultiplied; the square root spends the 8 bits on the darks.
  o = vec4(sqrt(max(lum, 0.0) / 4.0), 1.0 - T, 0.0, 1.0);
}`;
export const CARD_ENC_FS = /* glsl */`#version 300 es
precision highp float;
precision highp int;
precision highp usampler2D;
uniform highp sampler2DArray uSrc;
uniform int uLayer, uLevel;
uniform ivec2 uSize;
out uvec4 o;
// One BC4 block from 16 values in 0 to 255; it returns the low and high words.
uvec2 bc4(float v[16]) {
  float lo = 255.0, hi = 0.0;
  for (int i = 0; i < 16; i++) { lo = min(lo, v[i]); hi = max(hi, v[i]); }
  uint r0 = uint(hi), r1 = uint(lo);
  uvec2 w = uvec2(r0 | (r1 << 8u), 0u);
  for (int i = 0; i < 16; i++) {
    // Steps from the high end: 0 is r0, 7 is r1, 1 to 6 sit between.
    uint k = hi > lo ? uint(floor((hi - v[i]) / (hi - lo) * 7.0 + 0.5)) : 0u;
    uint idx = k == 0u ? 0u : k == 7u ? 1u : k + 1u;
    uint b = 16u + 3u * uint(i);
    if (b + 3u <= 32u) w.x |= idx << b;
    else if (b >= 32u) w.y |= idx << (b - 32u);
    else { w.x |= idx << b; w.y |= idx >> (32u - b); }
  }
  return w;
}
void main() {
  ivec2 bp = ivec2(gl_FragCoord.xy) * 4;
  float r[16], g[16];
  for (int i = 0; i < 16; i++) {
    ivec2 p = min(bp + ivec2(i % 4, i / 4), uSize - 1);
    vec4 s = texelFetch(uSrc, ivec3(p, uLayer), uLevel);
    r[i] = floor(s.r * 255.0 + 0.5);
    g[i] = floor(s.g * 255.0 + 0.5);
  }
  o = uvec4(bc4(r), bc4(g));
}`;
// One card at its own uv, 0 to 1 across and up: premultiplied colour and alpha.
// The frames turn, the funnel bends and sways, the wall climbs, and the top and the foot fade.
export const CARD_GL = /* glsl */`
${CARD_K}
uniform mediump sampler2DArray uBook;
float cdH(vec2 p) { vec3 q = fract(vec3(p.xyx) * 0.1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
float cdN(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(cdH(i), cdH(i + vec2(1, 0)), f.x), mix(cdH(i + vec2(0, 1)), cdH(i + vec2(1, 1)), f.x), f.y);
}
// Colour by light, in the void's greens (Tom, 2026-11-24): deep jade cores, mint rims.
// Lu is the light over the alpha; f is the height, 0 at the floor, 1 at the ceiling.
vec3 cardTint(float Lu, float f) {
  vec3 body = mix(vec3(0.1, 0.26, 0.21), vec3(0.18, 0.24, 0.3), smoothstep(0.5, 0.95, f));
  vec3 lit = mix(vec3(0.5, 0.95, 0.74), vec3(0.84, 1.0, 0.9), smoothstep(0.3, 1.2, Lu));
  vec3 tint = mix(body, lit, smoothstep(0.02, 0.6, Lu));
  // The foot takes the floor's green; the top takes the ceiling's.
  tint = mix(tint, tint * vec3(0.7, 1.15, 0.9), 1.0 - smoothstep(0.05, 0.3, f));
  return mix(tint, tint * vec3(0.8, 1.05, 0.9), smoothstep(0.55, 0.85, f));
}
// v: the variety. t: the time in s. ph: the twister's phase. spin: its spin in rad/s.
// lod is the mip level: the caller works it out, since a read in a branch has no derivatives.
vec4 card(int v, vec2 vT, float t, float ph, float spin, float lod) {
  // Half the twister's spin: massive columns turn slowly (Tom, 2026-11-24).
  float ft = fract(t * spin * 0.5 / 6.2831853 + ph * 0.1) * float(CD_NF);
  int f0 = int(ft), f1 = (f0 + 1) % CD_NF;
  // A lateral warp bends the funnel in a slow S (Tom, 2026-11-24).
  // The foot stays put; the bend grows with height and drifts over minutes.
  vec2 uv = vT;
  float lift = smoothstep(0.0, 0.7, vT.y);
  uv.x += lift * (0.07 * sin(vT.y * 2.6 + ph + t * 0.035) + 0.03 * sin(vT.y * 5.3 - t * 0.06 + ph * 2.3));
  // A faster sway on top of it; the top swings most.
  uv.x += vT.y * (0.014 * sin(vT.y * 3.6 + t * 0.11 + ph) + 0.007 * sin(vT.y * 8.5 - t * 0.19 + ph * 1.7));
  // A slow churn moves the edges; it climbs with the collars.
  vec2 nq = vec2(vT.x * 7.0, vT.y * 11.0 - t * 0.05) + ph;
  uv += vec2(0.006, 0.004) * (vec2(cdN(nq), cdN(nq + 17.3)) - 0.5);
  // Alpha flow: two copies scroll up on half-offset phases and cross-fade.
  // The wall seems to climb, with no jump when a copy resets.
  float fp = t / 24.0 + ph * 0.1, p0 = fract(fp), p1 = fract(fp + 0.5);
  float wf = abs(p0 * 2.0 - 1.0);
  vec2 c = vec2(0.0);
  for (int k = 0; k < 2; k++) {
    vec2 u = uv - vec2(0.0, 0.035 * (k == 0 ? p0 : p1));
    vec2 ca = textureLod(uBook, vec3(u, float(v * CD_NF + f0)), lod).rg;
    vec2 cb = textureLod(uBook, vec3(u, float(v * CD_NF + f1)), lod).rg;
    c += mix(ca, cb, fract(ft)) * (k == 0 ? 1.0 - wf : wf);
  }
  float f = vT.y * CD_FY / 24.0;
  float L = c.r * c.r * 4.0;
  vec3 rgb = cardTint(L / max(c.g, 1e-3), f) * (L + 0.05 * c.g);
  // Alpha gradients mask the top and the foot (Tom, 2026-11-24).
  // A slow wobble across the card keeps each fade off a straight line.
  float wb = 0.025 * sin(vT.x * 23.0 + ph * 0.9) + 0.015 * sin(vT.x * 61.0 + ph * 0.5);
  float mask = smoothstep(0.01, 0.17, vT.y + wb) * (1.0 - smoothstep(0.72, 0.97, vT.y + wb));
  // The warp must not pull the frame's edge into view.
  mask *= smoothstep(0.0, 0.03, uv.x) * smoothstep(1.0, 0.97, uv.x);
  // The body is opaque (Tom, 2026-11-24); only the soft edge lets light through.
  float a = smoothstep(0.04, 0.45, c.g);
  return vec4(rgb / max(c.g, 1e-3) * a, a) * mask;
}`;

/**
 * Bakes the card frames and packs them as BC5 where the browser has RGTC.
 * The programs come from CARD_BAKE_FS and CARD_ENC_FS, linked.
 * @param {WebGL2RenderingContext} gl
 * @param {{ bake: any, enc: any }} prog
 * @param {{ wait?: () => Promise<any>, raw?: boolean }} [opt] wait runs between frames; raw keeps RG8.
 */
export async function bakeCards(gl, prog, { wait = () => new Promise(r => setTimeout(r, 0)), raw = false } = {}) {
  const W = CARD_W, H = CARD_H, N = CARD_NV * CARD_NF;
  const LV = Math.floor(Math.log2(Math.max(W, H))) + 1;
  const arrayTex = fmt => {
    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D_ARRAY, t);
    gl.texStorage3D(gl.TEXTURE_2D_ARRAY, LV, fmt, W, H, N);
    for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D_ARRAY, k, v);
    return t;
  };
  const rawTex = arrayTex(gl.RG8), fb = gl.createFramebuffer(), px = new Uint8Array(4);
  const t0 = performance.now();
  // Four bands a frame, so no draw trips the driver's timeout.
  const TL = 4;
  for (let v = 0; v < CARD_NV; v++) for (let f = 0; f < CARD_NF; f++) {
    gl.useProgram(prog.bake.p);
    gl.uniform1f(prog.bake.u.uOd, CARD_OD);
    gl.uniform1i(prog.bake.u.uV, v);
    gl.uniform1f(prog.bake.u.uT, f / CARD_NF);
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTextureLayer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, rawTex, 0, v * CARD_NF + f);
    gl.viewport(0, 0, W, H);
    gl.enable(gl.SCISSOR_TEST);
    for (let j = 0; j < TL; j++) {
      gl.scissor(0, Math.floor(j * H / TL), W, Math.ceil(H / TL));
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
    }
    gl.disable(gl.SCISSOR_TEST);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    await wait();
  }
  // Mipmaps keep far cards from shimmering.
  gl.bindTexture(gl.TEXTURE_2D_ARRAY, rawTex);
  gl.generateMipmap(gl.TEXTURE_2D_ARRAY);
  const bakeMs = performance.now() - t0;
  let bytes = 0;
  for (let l = 0, w = W, h = H; l < LV; l++, w = Math.max(1, w >> 1), h = Math.max(1, h >> 1)) bytes += w * h * 2 * N;
  // BC5: the GPU packs each 4x4 block; the blocks come back and upload as a compressed texture.
  const RG = !raw && gl.getExtension('EXT_texture_compression_rgtc');
  if (!RG) { gl.deleteFramebuffer(fb); return { tex: rawTex, fmt: 'RG8', bytes, bakeMs, encMs: 0 }; }
  const e0 = performance.now();
  const tex = arrayTex(RG.COMPRESSED_RED_GREEN_RGTC2_EXT);
  const bw0 = Math.ceil(W / 4), bh0 = Math.ceil(H / 4);
  const blk = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, blk);
  gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA32UI, bw0, bh0);
  gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, blk, 0);
  gl.useProgram(prog.enc.p);
  gl.activeTexture(gl.TEXTURE0);
  gl.uniform1i(prog.enc.u.uSrc, 0);
  const buf = new Uint32Array(bw0 * bh0 * 4);
  bytes = 0;
  for (let l = 0, w = W, h = H; l < LV; l++, w = Math.max(1, w >> 1), h = Math.max(1, h >> 1)) {
    const bw = Math.ceil(w / 4), bh = Math.ceil(h / 4), n = bw * bh * 4;
    gl.viewport(0, 0, bw, bh);
    gl.uniform1i(prog.enc.u.uLevel, l);
    gl.uniform2i(prog.enc.u.uSize, w, h);
    for (let k = 0; k < N; k++) {
      gl.bindTexture(gl.TEXTURE_2D_ARRAY, rawTex);
      gl.uniform1i(prog.enc.u.uLayer, k);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      const view = buf.subarray(0, n);
      gl.readPixels(0, 0, bw, bh, gl.RGBA_INTEGER, gl.UNSIGNED_INT, view);
      gl.bindTexture(gl.TEXTURE_2D_ARRAY, tex);
      gl.compressedTexSubImage3D(gl.TEXTURE_2D_ARRAY, l, 0, 0, k, w, h, 1, RG.COMPRESSED_RED_GREEN_RGTC2_EXT, new Uint8Array(view.buffer, 0, n * 4));
      bytes += n * 4;
    }
    // One mip level a frame, so the packing never stalls a frame.
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    await wait();
    gl.useProgram(prog.enc.p);
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.activeTexture(gl.TEXTURE0);
  }
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.deleteFramebuffer(fb);
  gl.deleteTexture(blk);
  gl.deleteTexture(rawTex);
  return { tex, fmt: 'BC5', bytes, bakeMs, encMs: performance.now() - e0 };
}
