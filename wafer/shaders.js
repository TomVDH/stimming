// GLSL for the Wafer hunt: a brightfield microscope over a full wafer.
// Coordinates are microns, y down. fw is the size of one pixel in microns.
// Scenes render in linear light; the post pass adds the optics and the tone curve.

const HEAD = '#version 300 es\nprecision highp float;\nprecision highp int;\n';

const COMMON = `
uniform sampler2D uLut;
uniform float uMetal;
uint ph(uint v) { v = v * 747796405u + 2891336453u; uint w = ((v >> ((v >> 28u) + 4u)) ^ v) * 277803737u; return (w >> 22u) ^ w; }
float h2(vec2 p) { ivec2 i = ivec2(floor(p)) + 65536; return float(ph(uint(i.x) ^ ph(uint(i.y) + 2654435769u))) * (1.0 / 4294967295.0); }
float h1(float x) { return h2(vec2(x, 7.31)); }
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h2(i), h2(i + vec2(1.0, 0.0)), f.x), mix(h2(i + vec2(0.0, 1.0)), h2(i + vec2(1.0)), f.x), f.y);
}
// Thin-film colour: row 0 oxide on silicon, 1 nitride over oxide, 2 oxide on aluminium, 3 bare silicon.
vec3 film(float row, float d) { return texture(uLut, vec2(clamp(d, 0.0, 1999.0) / 2000.0 * 0.998 + 0.001, (row + 0.5) * 0.25)).rgb; }
// Aluminium: domains of different reflectance, a slow tint drift, fine grain, hillocks, rare voids.
vec3 grain(vec3 c, vec2 p, float fw) {
  float dom = vnoise(p * 0.11) - 0.5;
  float tn = vnoise(p * 0.035 + 3.0);
  vec3 tint = mix(vec3(1.03, 1.0, 0.93), vec3(0.93, 0.98, 1.06), tn);
  float k = 1.0 - smoothstep(0.3, 1.6, fw);
  float g = (vnoise(p * 2.3) - 0.5) + 0.5 * (vnoise(p * 7.1 + 9.0) - 0.5);
  float hill = step(0.9965, h2(floor(p * 4.0))) * 0.25;
  float vd = step(0.9993, h2(floor(p * 3.0) + 31.0)) * 0.5;
  return c * tint * (1.0 + 0.2 * dom + k * (0.15 * g + hill - vd));
}
`;

export const WAFER_FS = HEAD + COMMON + `
uniform vec2 uRes;
uniform vec2 uCam;
uniform float uS;
uniform sampler2D uBake0;
uniform sampler2D uBake1;
uniform vec4 uHero[2];
uniform vec4 uDoo[15];
out vec4 o;

const float P = 4600.0, D = 4400.0, R = 36000.0, FLATY = 33600.0;
const int FIELD[25] = int[25](3,1,2,1,3, 1,0,3,2,1, 2,3,0,3,2, 1,2,3,0,1, 3,1,2,1,3);
float gEW = 1.0;

// Overlap of the interval [c-h, c+h] with a pixel window of width f.
float ov(float p, float c, float h, float f) { return max(0.0, min(c + h, p + 0.5 * f) - max(c - h, p - 0.5 * f)) / f; }
float rect(vec2 p, vec2 c, vec2 h, float f) { return ov(p.x, c.x, h.x, f) * ov(p.y, c.y, h.y, f); }
float cdf(float t, float per, float w) { float k = floor(t / per); return k * w + clamp(t - k * per, 0.0, w); }
float stripe(float x, float per, float w, float f) { return (cdf(x + 0.5 * f, per, w) - cdf(x - 0.5 * f, per, w)) / f; }
// Lay a layer down. Every step edge scatters light, so it draws dark, one pixel wide.
void lay(inout vec3 c, vec3 col, float a) {
  a = clamp(a, 0.0, 1.0);
  c = mix(c, col, a);
  c *= 1.0 - gEW * 0.62 * 4.0 * a * (1.0 - a);
}

// Metal over a layer. The light comes from the upper left: a bright rim on that edge of every wire,
// a dark shadow outside the lower right edge. The slope of the coverage finds the edge.
void layM(inout vec3 c, vec3 col, float a) {
  a = clamp(a, 0.0, 1.0);
  float s = dFdx(a) - dFdy(a);
  float rim = clamp(s * 1.3, 0.0, 1.0), sh = clamp(-s * 1.3, 0.0, 1.0);
  c *= 1.0 - 0.55 * gEW * sh;
  c = mix(c, col * (1.0 + 0.55 * gEW * rim), a);
  c *= 1.0 - gEW * 0.2 * 4.0 * a * (1.0 - a);
}

struct Pal { vec3 sub, dif, ply, m1, m2; };
// Poly and diffusion lie under oxide and passivation: dimmer, closer to the field colour.
Pal palOf(float d, float shift) {
  d += shift;
  Pal Q;
  Q.sub = film(0.0, d);
  Q.dif = mix(Q.sub, film(0.0, d - 150.0), 0.6);
  Q.ply = mix(Q.sub, film(0.0, d + 410.0), 0.6);
  Q.m1 = film(2.0, 150.0 + shift * 0.4) * vec3(0.84, 0.88, 0.95);
  Q.m2 = film(2.0, 380.0 + shift * 0.4) * vec3(0.8, 0.86, 0.94);
  return Q;
}
// From far away the metal and the field blur into one grey-blue.
vec3 meanOf(Pal Q) {
  vec3 c = Q.sub * 0.4 + Q.dif * 0.06 + Q.ply * 0.06 + Q.m1 * 0.3 + Q.m2 * 0.18;
  return mix(c, vec3(dot(c, vec3(0.3, 0.59, 0.11))), 0.45);
}

// Standard-cell rows: dim gates and diffusion under a dense mass of M1 and M2 routing.
vec3 logic(vec2 p, float fw, Pal Q, float seed) {
  const float RH = 24.0;
  gEW = 1.0 - smoothstep(0.3, 0.9, fw / 1.8);
  float r = floor(p.y / RH);
  float ly = p.y - r * RH;
  if (mod(r, 2.0) >= 1.0) ly = RH - ly;
  float wd = 1.0 - smoothstep(0.25, 1.0, fw / 6.0);
  float mx = floor(p.x / 36.0), lx = p.x - mx * 36.0;
  float hm = h2(vec2(mx, r + seed * 7.0));
  float b1 = hm < 0.2 ? 99.0 : hm < 0.45 ? 18.0 : hm < 0.6 ? 12.0 : hm < 0.75 ? 24.0 : 12.0;
  float b2 = hm >= 0.75 ? 24.0 : 99.0;
  float cid = (lx > b1 ? 1.0 : 0.0) + (lx > b2 ? 1.0 : 0.0);
  float hc = h2(vec2(mx * 3.0 + cid, r * 5.0 + seed));
  vec3 c = Q.sub * (0.92 + 0.16 * mix(0.5, hc, wd));
  float gap = 1.0 - ov(lx, b1, 1.0, fw) - ov(lx, b2, 1.0, fw);
  lay(c, Q.dif, ov(ly, 6.5, 3.2, fw) * gap);
  lay(c, Q.dif * vec3(1.05, 0.96, 1.04), ov(ly, 17.5, 3.2, fw) * gap);
  lay(c, Q.ply, stripe(p.x - 0.9, 3.0, 1.2, fw) * ov(ly, 12.0, 9.4, fw) * mix(0.85, step(0.1, hc), wd));
  // M1: horizontal tracks, 2 microns apart, cut into runs.
  float ty = floor(p.y / 2.0), cx = floor(p.x / 7.0);
  float pres1 = mix(0.62, step(0.34, h2(vec2(cx, ty + seed))), wd);
  float m1 = stripe(p.y, 2.0, 0.9, fw) * stripe(p.x - 0.5, 7.0, 6.0, fw) * pres1;
  m1 = max(m1, (ov(ly, 1.2, 1.2, fw) + ov(ly, RH - 1.2, 1.2, fw)) * 0.95);
  // M2: vertical tracks, 2.4 microns apart, in 9 micron pieces.
  float kx = floor(p.x / 2.4), cy = floor(p.y / 9.0);
  float pres2 = mix(0.5, step(0.5, h2(vec2(kx * 1.3 + seed, cy))), wd);
  float m2 = stripe(p.x, 2.4, 1.1, fw) * stripe(p.y - 0.5, 9.0, 8.0, fw) * pres2;
  layM(c, grain(Q.m1, p, fw), m1 * uMetal);
  layM(c, grain(Q.m2, p, fw), m2 * uMetal);
  // Vias where a vertical track crosses a horizontal one: small dark dimples.
  float via = stripe(p.x - 0.2, 2.4, 0.7, fw) * stripe(p.y - 0.65, 2.0, 0.7, fw) * step(0.45, h2(vec2(kx, ty) + seed + 5.0)) * m1 * m2;
  c *= 1.0 - 0.5 * via * wd;
  return c;
}

// A bit-cell array: a fine lattice of bit lines and word lines; ROM drops some contacts.
vec3 sram(vec2 p, vec2 bs, float fw, Pal Q, float seed, float rom) {
  if (p.x < 40.0 || p.y > bs.y - 36.0) return logic(p, fw, Q, seed + 3.0);
  gEW = 1.0 - smoothstep(0.3, 0.9, fw / 1.2);
  vec2 a = vec2(p.x - 40.0, p.y);
  float bank = floor(a.x / 132.0), lx = a.x - bank * 132.0;
  vec3 c = Q.sub;
  if (lx > 120.0) {
    lay(c, Q.dif, stripe(a.y - 0.4, 4.5, 2.0, fw) * 0.8);
    layM(c, grain(Q.m1, p, fw), ov(lx, 126.0, 2.0, fw) * uMetal);
    c *= 1.0 - 0.5 * ov(lx, 126.0, 0.7, fw) * stripe(a.y - 1.0, 4.5, 0.8, fw);
    return c;
  }
  float cell = floor(lx / 3.0) + bank * 40.0 + floor(a.y / 4.5) * 83.0;
  c *= 0.93 + 0.14 * h2(vec2(bank, floor(a.y / 36.0)) + seed);
  float wd = 1.0 - smoothstep(0.5, 2.0, fw / 3.0);
  lay(c, Q.dif, (stripe(a.y - 0.4, 4.5, 1.4, fw)) * (1.0 - stripe(lx - 2.4, 3.0, 0.6, fw)));
  lay(c, Q.ply, max(stripe(a.y - 2.5, 4.5, 0.8, fw), stripe(lx - 1.2, 3.0, 0.5, fw) * stripe(a.y - 0.2, 4.5, 2.2, fw)));
  float bl = max(stripe(lx - 0.2, 3.0, 1.1, fw), stripe(lx - 1.8, 3.0, 0.8, fw));
  float wl = stripe(a.y - 0.1, 4.5, 1.0, fw);
  layM(c, grain(Q.m1, p, fw), wl * uMetal * 0.9);
  layM(c, grain(Q.m2, p, fw), bl * uMetal);
  float pres = rom > 0.5 ? mix(0.55, step(0.45, h2(vec2(cell, seed))), wd) : 1.0;
  c *= 1.0 - 0.5 * stripe(lx - 0.25, 3.0, 0.6, fw) * stripe(a.y - 0.35, 4.5, 0.6, fw) * pres * wd;
  return c;
}

// Analog: capacitor plates, resistor serpentines, fingers, square spiral inductors, a guard ring.
vec3 analog(vec2 p, vec2 bs, float fw, Pal Q, float seed, float rf) {
  gEW = 1.0 - smoothstep(0.3, 0.9, fw / 3.0);
  vec2 t = floor(p / 160.0);
  vec2 l = p - t * 160.0;
  float hh = h2(t + seed);
  float ty = rf > 0.5 ? (hh < 0.4 ? 3.0 : floor(hh * 3.0)) : floor(hh * 3.0);
  vec3 c = logic(p, fw, Q, seed + 7.0);
  gEW = 1.0 - smoothstep(0.3, 0.9, fw / 3.0);
  if (ty < 0.5) {
    float pl = stripe(l.x - 3.0, 26.0, 20.0, fw) * stripe(l.y - 3.0, 26.0, 20.0, fw);
    layM(c, grain(Q.m2, p, fw), pl * uMetal);
    layM(c, grain(Q.m1, p, fw), pl * stripe(l.x, 2.0, 0.6, fw) * 0.5 * uMetal);
    c *= 1.0 - 0.5 * stripe(l.x - 5.0, 26.0, 1.0, fw) * stripe(l.y - 5.0, 26.0, 1.0, fw);
  } else if (ty < 1.5) {
    float j = floor(l.y / 6.0), yy = l.y - j * 6.0;
    float bars = ov(l.x, 80.0, 72.0, fw) * ov(yy, 1.5, 1.5, fw);
    float side = mod(j, 2.0) < 0.5 ? 149.5 : 10.5;
    float conn = ov(l.x, side, 1.5, fw) * ov(yy, 4.5, 1.5, fw);
    lay(c, Q.ply, max(bars, conn));
    layM(c, grain(Q.m1, p, fw), (ov(l.x, 8.0, 1.5, fw) + ov(l.x, 152.0, 1.5, fw)) * ov(l.y, 80.0, 74.0, fw) * 0.8 * uMetal);
  } else if (ty < 2.5) {
    float body = rect(l, vec2(80.0), vec2(70.0), fw);
    lay(c, Q.dif, body);
    lay(c, Q.ply, body * stripe(l.x - 5.0, 8.0, 3.0, fw));
    layM(c, grain(Q.m1, p, fw), body * stripe(l.y - 12.0, 24.0, 3.0, fw) * 0.85 * uMetal);
  } else {
    // A square spiral inductor on the top metal; each turn opens on alternate sides.
    vec2 q = l - 80.0;
    float rr = max(abs(q.x), abs(q.y));
    float kk = floor((rr - 22.0) / 9.0);
    float open = (mod(kk, 2.0) < 0.5 ? step(0.0, q.x) : step(q.x, 0.0)) * ov(q.y, 0.0, 4.5, fw);
    float ring = stripe(rr - 22.0, 9.0, 5.0, fw) * step(rr, 74.0) * step(22.0, rr) * (1.0 - open);
    lay(c, Q.dif * 0.9, step(rr, 76.0) * 0.35);
    layM(c, grain(Q.m2, p, fw), ring * uMetal);
    layM(c, grain(Q.m1, p, fw), ov(q.y, 0.0, 2.0, fw) * ov(q.x, -38.0, 38.0, fw) * 0.8 * uMetal);
  }
  float e = min(min(p.x, bs.x - p.x), min(p.y, bs.y - p.y));
  lay(c, Q.dif, ov(e, 5.5, 1.5, fw));
  layM(c, grain(Q.m1, p, fw), ov(e, 5.5, 0.7, fw) * uMetal);
  return c;
}

// Bus channel: parallel lines of mixed width along the long axis, with vias.
vec3 bus(vec2 p, float fw, Pal Q, float seed, bool vert) {
  gEW = 1.0 - smoothstep(0.3, 0.9, fw / 1.5);
  float u = vert ? p.x : p.y, a = vert ? p.y : p.x;
  float idx = floor(u / 3.0), lu = u - idx * 3.0;
  float w = 1.0 + 1.0 * step(0.5, h2(vec2(idx, seed)));
  float wd = 1.0 - smoothstep(0.3, 1.0, fw / 3.0);
  vec3 c = Q.sub;
  vec3 col = mod(idx, 2.0) < 0.5 ? Q.m2 : Q.m1;
  float ln = mix(0.5, ov(lu, 1.5, w * 0.5, fw), wd);
  layM(c, grain(col, p, fw), ln * uMetal);
  c *= 1.0 - 0.5 * ln * stripe(a + idx * 13.0, 40.0, 1.4, fw) * uMetal * wd;
  return c;
}

vec3 fillSq(vec2 p, float fw, Pal Q) {
  gEW = 1.0 - smoothstep(0.3, 0.9, fw / 4.5);
  vec3 c = Q.sub;
  layM(c, grain(Q.m1, p, fw) * 0.92, stripe(p.x, 11.0, 4.5, fw) * stripe(p.y, 11.0, 4.5, fw) * uMetal);
  return c;
}

// Mask credits: three lines of tiny random glyphs, 3 by 5 bits on 8 by 12 micron cells.
vec3 credits(vec2 u, float fw, Pal Q, float seed, vec3 under) {
  gEW = 1.0 - smoothstep(0.3, 0.9, fw / 2.0);
  vec3 c = under;
  vec2 g = floor(u / vec2(8.0, 12.0)), l = u - g * vec2(8.0, 12.0);
  if (g.x < 0.0 || g.x > 11.0 || g.y < 0.0 || g.y > 2.0) return c;
  vec2 b = floor((l - vec2(1.0, 1.0)) / 2.0);
  if (b.x < 0.0 || b.x > 2.0 || b.y < 0.0 || b.y > 4.0) return c;
  float bit = step(0.5, h2(vec2(g.x * 17.0 + g.y * 5.0 + seed, b.x + b.y * 3.0)));
  float cv = rect(l, vec2(2.0 + b.x * 2.0, 2.0 + b.y * 2.0), vec2(1.0, 1.0), fw) * bit;
  layM(c, grain(Q.m1, u, fw), cv * uMetal);
  return c;
}

vec3 block(vec2 q, vec2 lo, vec2 hi, float id, float fw, float dF, float seed, float kind) {
  vec2 p = q - lo, bs = hi - lo;
  float t = h2(vec2(id, seed + 5.0));
  // Die kinds shift the mix: 0 mixed, 1 memory, 2 logic, 3 analog and RF.
  if (kind == 1.0) t = t < 0.7 ? t * 0.55 : 0.5 + t * 0.5;
  else if (kind == 2.0) t = t < 0.7 ? 0.3 + t * 0.3 : 0.5 + t * 0.5;
  else if (kind == 3.0) t = t < 0.55 ? 0.52 + t * 0.26 : t;
  float shift = t < 0.30 ? -30.0 : t < 0.52 ? 70.0 : t < 0.66 ? 170.0 : t < 0.80 ? 230.0 : 40.0;
  Pal Q = palOf(dF, shift);
  vec3 c;
  float lodm = smoothstep(7.0, 18.0, fw);
  if (lodm >= 1.0) c = meanOf(Q);
  else {
    if (t < 0.30) c = sram(p, bs, fw, Q, id, 0.0);
    else if (t < 0.52) c = logic(p, fw, Q, id);
    else if (t < 0.66) c = analog(p, bs, fw, Q, id, kind == 3.0 ? 1.0 : 0.0);
    else if (t < 0.80) c = sram(p, bs, fw, Q, id, 1.0);
    else if (t < 0.90) c = logic(p, fw, palOf(dF, 260.0), id + 3.0);
    else c = logic(p, fw, palOf(dF, 120.0), id + 9.0);
    if (lodm > 0.0) c = mix(c, meanOf(Q), lodm);
  }
  float e = min(min(p.x, bs.x - p.x), min(p.y, bs.y - p.y));
  gEW = 1.0;
  layM(c, grain(Q.m1, q, fw) * 0.9, ov(e, 1.5, 1.5, fw) * uMetal * 0.7);
  return c;
}

vec3 dieColor(vec2 q, float seed, float dF, float fw) {
  vec2 a = abs(q);
  float e = D * 0.5 - max(a.x, a.y);
  float kind = floor(h1(seed * 3.1) * 4.0);
  Pal Q = palOf(dF, 0.0);
  vec3 c = Q.sub;
  float s = a.x > a.y ? q.y : q.x;
  gEW = 1.0 - smoothstep(0.3, 0.9, fw / 3.0);
  float seal = ov(e, 20.0, 5.0, fw) + ov(e, 33.0, 2.5, fw) + ov(e, 44.0, 1.5, fw);
  if (e < 62.0) {
    layM(c, grain(Q.m1, q, fw), seal * uMetal);
    lay(c, Q.dif, ov(e, 52.0, 3.0, fw) * 0.9);
    return c;
  }
  if (e < 106.0) return fillSq(q, fw, Q);
  bool corner = abs(s) > 1860.0;
  if (e < 340.0) {
    if (corner) {
      c = fillSq(q, fw, Q);
      return credits(vec2(abs(s) - 1880.0, e - 120.0), fw, Q, seed, c);
    }
    float k = floor((s + 70.0) / 140.0), ls = s + 70.0 - k * 140.0 - 70.0;
    if (e < 194.0) {
      lay(c, Q.dif, ov(e, 150.0, 47.0, fw) * ov(ls, 0.0, 51.0, fw) * 0.7);
      layM(c, grain(film(2.0, 700.0), q, fw), rect(vec2(ls, e), vec2(0.0, 150.0), vec2(44.0), fw) * uMetal);
      layM(c, grain(film(2.0, 30.0), q, fw), rect(vec2(ls, e), vec2(0.0, 150.0), vec2(36.0), fw) * uMetal);
      c *= 1.0 - 0.3 * rect(vec2(ls, e), vec2(0.0, 150.0), vec2(36.0), fw) * stripe(ls + 36.0, 8.0, 0.8, fw);
    } else if (e < 236.0) c = logic(vec2(s, e), fw, Q, seed + 1.0);
    else if (e < 290.0) {
      float rr = ov(e, 252.0, 9.0, fw) + ov(e, 276.0, 9.0, fw);
      layM(c, grain(Q.m2, q, fw), rr * uMetal);
      c *= 1.0 - 0.4 * rr * stripe(s, 24.0, 1.2, fw) * uMetal;
    } else c = logic(vec2(s, e), fw, palOf(dF, 70.0), seed + 2.0);
    return c;
  }
  // Core floorplan: split the box a few times; a channel runs along every cut.
  vec2 lo = vec2(-1860.0), hi = vec2(1860.0);
  float bid = seed;
  for (int d = 0; d < 4; d++) {
    vec2 sz = hi - lo;
    bool vsplit = sz.x * (0.85 + 0.3 * h1(bid + 3.0)) > sz.y;
    float r = 0.35 + 0.3 * h1(bid + float(d));
    float pc = vsplit ? q.x : q.y;
    float cut = vsplit ? mix(lo.x, hi.x, r) : mix(lo.y, hi.y, r);
    float ch = 56.0 / float(d + 1);
    if (abs(pc - cut) < ch) {
      vec2 qq = vec2(q.x - (vsplit ? cut - ch : lo.x), q.y - (vsplit ? lo.y : cut - ch));
      return bus(qq, fw, palOf(dF, 0.0), bid, vsplit);
    }
    bool second = pc > cut;
    if (vsplit) { if (second) lo.x = cut + ch; else hi.x = cut - ch; } else { if (second) lo.y = cut + ch; else hi.y = cut - ch; }
    bid = h1(bid * 3.0 + (second ? 17.0 : 5.0) + float(d));
    vec2 ns = hi - lo;
    if (d >= 1 && (h1(bid) < 0.25 * float(d) || min(ns.x, ns.y) < 330.0)) break;
  }
  vec3 bc = block(q, lo, hi, bid * 100.0, fw, dF, seed, kind);
  // Film thickness drifts slowly across a die: a soft shift in hue and value.
  float mt = vnoise(q * 0.006 + seed) - 0.5;
  return bc * (1.0 + vec3(0.18, 0.0, -0.18) * mt + 0.06 * (vnoise(q * 0.02) - 0.5));
}

// Scribe lane: bare silicon with monitor stripes, test pads, alignment marks and credits.
vec3 scribe(vec2 q, vec2 w, float fw, float dF) {
  vec3 c = film(3.0, 0.0) * 0.92;
  Pal Q = palOf(dF, 90.0);
  gEW = 1.0 - smoothstep(0.3, 0.9, fw / 4.0);
  vec2 a = abs(q);
  float dc = 0.0, al = 0.0;
  bool lane = false;
  if (a.y > D * 0.5 && a.x <= D * 0.5) { dc = P * 0.5 - a.y; al = w.x; lane = true; }
  else if (a.x > D * 0.5 && a.y <= D * 0.5) { dc = P * 0.5 - a.x; al = w.y; lane = true; }
  if (lane) {
    layM(c, grain(Q.m1, w, fw), stripe(al, 300.0, 70.0, fw) * ov(dc, 0.0, 34.0, fw) * uMetal);
    lay(c, Q.dif, stripe(al - 120.0, 300.0, 120.0, fw) * ov(dc, 0.0, 22.0, fw));
    lay(c, Q.ply, stripe(al - 130.0, 300.0, 3.0, fw) * ov(dc, 0.0, 18.0, fw));
    layM(c, grain(Q.m2, w, fw), stripe(al - 250.0, 300.0, 40.0, fw) * ov(dc, 0.0, 46.0, fw) * uMetal * step(0.5, h2(vec2(floor(al / 300.0), 4.0))));
    // A vernier ruler and a credit block, repeated along the lane.
    layM(c, grain(Q.m1, w, fw), stripe(al, 8.0, 1.4, fw) * ov(dc - 70.0, 0.0, 10.0, fw) * step(abs(mod(al, 1500.0) - 750.0), 160.0) * uMetal);
    c = credits(vec2(mod(al, 1500.0) - 60.0, dc - 56.0), fw, Q, h1(floor(al / 1500.0)) * 50.0, c);
  } else {
    // Intersections: a box in box and a crosshair.
    vec2 b = vec2(P * 0.5) - a;
    float cross = ov(b.x, 0.0, 3.0, fw) * ov(b.y, 0.0, 60.0, fw) + ov(b.y, 0.0, 3.0, fw) * ov(b.x, 0.0, 60.0, fw);
    float box = max(abs(b.x), abs(b.y));
    layM(c, grain(Q.m1, w, fw), (cross + ov(box, 24.0, 2.0, fw)) * uMetal);
    lay(c, Q.ply, ov(box, 14.0, 1.5, fw));
  }
  return c;
}

vec3 heroColor(vec2 q, int k, float fw, float dF) {
  vec4 H = uHero[k];
  vec2 a = abs(q);
  float e = D * 0.5 - max(a.x, a.y);
  Pal Q = palOf(300.0, 0.0);
  vec3 c = Q.sub;
  gEW = 1.0 - smoothstep(0.3, 0.9, fw / 3.0);
  float seal = ov(e, 20.0, 5.0, fw) + ov(e, 33.0, 2.5, fw) + ov(e, 44.0, 1.5, fw);
  layM(c, grain(Q.m1, q, fw), seal * uMetal);
  vec2 uv = q / D + 0.5;
  vec2 rel = (q - H.xy) / H.zw;
  if (abs(rel.x) < 0.5 && abs(rel.y) < 0.5 && e > 62.0) {
    float lod = log2(max(fw * 2048.0 / D, 1.0));
    vec2 bu = vec2(uv.x, 1.0 - uv.y);
    c = k == 0 ? textureLod(uBake0, bu, lod).rgb : textureLod(uBake1, bu, lod).rgb;
  }
  return c;
}

vec3 rainbow(float t) { return 0.5 + 0.5 * cos(6.2832 * (t + vec3(0.0, 0.33, 0.67))); }

void main() {
  vec2 fc = gl_FragCoord.xy;
  float fw = 1.0 / uS;
  vec2 w = vec2(uCam.x + (fc.x - uRes.x * 0.5) * fw, uCam.y + (uRes.y * 0.5 - fc.y) * fw);
  vec3 col = vec3(0.0018, 0.0018, 0.0026);
  float rr = length(w);
  float dEdge = min(R - rr, FLATY - w.y);
  float cov = clamp(dEdge / fw + 0.5, 0.0, 1.0);
  if (dEdge > -2.0 * fw) {
    // Film thickness drifts with radius, as deposition does across a real wafer.
    float rad = rr / R;
    float dRad = 110.0 * rad * rad - 20.0;
    vec3 wf = film(3.0, 0.0) * 1.15;
    vec2 lp = vec2(-9000.0, -14000.0);
    float lowz = smoothstep(14.0, 55.0, fw);
    // Beveled rim and the edge exclusion ring.
    float bev = 1.0 - smoothstep(0.0, 260.0, dEdge);
    wf = mix(wf, wf * vec3(1.25, 1.2, 1.3), bev * 0.5);
    wf *= 1.0 - 0.45 * ov(dEdge, 1500.0, 12.0, fw);
    float ci = floor(w.x / P + 0.5), cj = floor(w.y / P + 0.5);
    vec2 q = w - vec2(ci * P, cj * P);
    bool grid = abs(ci) <= 7.0 && abs(cj) <= 7.0 && dEdge > 220.0;
    bool dieHere = grid && abs(q.x) < D * 0.5 && abs(q.y) < D * 0.5;
    col = wf;
    // Reticle fields: 3 by 3 dies, shot over and over.
    ivec2 g = ivec2(ci + 7.0, cj + 7.0);
    ivec2 f = g / 3, sl = g - f * 3;
    int ret = FIELD[clamp(f.y, 0, 4) * 5 + clamp(f.x, 0, 4)], slot = sl.y * 3 + sl.x;
    int hero = -1;
    if (ret == 0) { if (slot == 4) hero = 0; else if (slot == 1) hero = 1; }
    else if (ret == 1 && slot == 6) hero = 0;
    else if (ret == 2 && slot == 2) hero = 1;
    float seed = float(ret * 9 + slot);
    float dF = 300.0 + dRad + 36.0 * (h1(seed + 40.0) - 0.5);
    float dieId = (cj + 7.0) * 15.0 + (ci + 7.0);
    if (dieHere) {
      if (hero >= 0) col = heroColor(q, hero, fw, dF);
      else {
        col = dieColor(q, seed, dF, fw);
        // Doodle spots: a plain keepout of dummy fill.
        for (int i = 0; i < 15; i++) {
          if (abs(uDoo[i].w - dieId) < 0.5) {
            vec2 dd = abs(q - uDoo[i].xy);
            if (max(dd.x, dd.y) < uDoo[i].z) {
              Pal Q = palOf(dF, 0.0);
              gEW = 1.0;
              vec3 fl = Q.sub;
              col = mix(fl, grain(Q.m1, q, fw) * 0.85, ov(uDoo[i].z - max(dd.x, dd.y), 1.5, 1.5, fw) * 0.6 * uMetal);
            }
          }
        }
      }
    } else if (grid) col = scribe(q, w, fw, dF);
    // Photographed from above, a wafer is a grey mirror with a diffraction rainbow sweeping across the grid.
    {
      vec2 ld = w - lp;
      float t = dot(w, vec2(0.62, 0.78)) * 0.000052 + length(ld) * 0.000018;
      float band = 0.3 + 0.7 * smoothstep(0.1, 0.9, 0.5 + 0.5 * sin(dot(w, vec2(-0.78, 0.62)) * 0.000045 + 0.8));
      col *= mix(1.0, dieHere ? 0.62 : 1.0, lowz);
      float lum = dot(col, vec3(0.3, 0.59, 0.11));
      col = mix(col, vec3(lum) * (0.7 + 0.8 * rainbow(t)), lowz * 0.55 * band);
      col *= mix(1.0, 0.7 + 0.65 * exp(-dot(ld, ld) / 9.0e8), lowz);
      // The edge bead is darker, and the bevel catches a thin line of light.
      col *= mix(0.62, 1.0, smoothstep(0.0, 1100.0, dEdge));
      col += vec3(0.5, 0.5, 0.56) * ov(dEdge, 45.0, 45.0, fw) * 0.22;
    }
    // Three faint scratches across the wafer scatter light as thin bright lines.
    vec2 sa[3] = vec2[3](vec2(-24000.0, -9000.0), vec2(6000.0, 22000.0), vec2(-3000.0, -30000.0));
    vec2 sb[3] = vec2[3](vec2(9000.0, 12000.0), vec2(31000.0, 14000.0), vec2(14000.0, -6000.0));
    for (int i = 0; i < 3; i++) {
      vec2 ba = sb[i] - sa[i], pa = w - sa[i];
      float t = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
      vec2 off = vec2(sin(t * 7.0 + float(i)), cos(t * 5.0)) * 220.0;
      float d = length(pa - ba * t - off);
      col += vec3(0.8, 0.8, 0.9) * (0.05 + 0.1 * h2(vec2(floor(t * 90.0), float(i)))) * clamp(0.5 - (d - 1.4) / max(fw, 1.0), 0.0, 1.0) * 0.5;
    }
  }
  col = mix(vec3(0.0018, 0.0018, 0.0026), col, cov);
  o = vec4(col, 1.0);
}`;

// Vector layers of a hero chip: positions in chip units, world placement by uniforms.
export const MESH_VS = HEAD + `
in vec2 aPos;
out vec2 vU;
uniform vec2 uRel;
uniform float uUnit;
uniform vec2 uRes;
uniform float uS;
uniform vec2 uOff;
void main() {
  vU = aPos;
  vec2 px = (uRel + aPos * uUnit) * uS + uOff;
  gl_Position = vec4(px.x / (uRes.x * 0.5), -px.y / (uRes.y * 0.5), 0.0, 1.0);
}`;
export const MESH_FS = HEAD + COMMON + `
uniform float uRow;
uniform float uD;
uniform float uMode;
uniform float uUnit;
uniform float uS;
uniform float uMix;
uniform float uAlpha;
uniform float uTone;
uniform vec3 uBase;
uniform vec4 uFlat;
in vec2 vU;
out vec4 o;
// Film thickness drifts slowly over a chip, so each layer shifts a little in hue and value.
// Poly and diffusion sit under oxide: they mix toward the field colour and carry a fine mottle.
void main() {
  if (uMode > 0.5) { o = uFlat; return; }
  vec2 wp = vU * uUnit;
  float fw = 1.0 / uS;
  float n = sin(vU.x * 0.0021 + 1.3) * sin(vU.y * 0.0017 + 0.4) + 0.5 * sin(vU.x * 0.0053 + vU.y * 0.0041);
  float lo = vnoise(wp * 0.02) - 0.5;
  vec3 c = film(uRow, uD + 30.0 * n + 40.0 * lo);
  if (uRow > 1.5) c = grain(c * vec3(0.84, 0.88, 0.95), wp, fw);
  else {
    float k = 1.0 - smoothstep(0.3, 1.5, fw);
    c *= 1.0 + k * (0.08 * (vnoise(wp * 0.35) - 0.5) + 0.06 * (vnoise(wp * 5.0) - 0.5));
    c = mix(c, vec3(dot(c, vec3(0.3, 0.59, 0.11))), 0.25);
    c = mix(uBase, c, uMix);
  }
  o = vec4(c * uTone, uAlpha);
}`;

// Doodles: metal 1 line art. Distance to line segments held in a float texture, one row per doodle.
export const DOODLE_VS = HEAD + `
uniform vec2 uRel;
uniform float uHalf;
uniform vec2 uRes;
uniform float uS;
out vec2 vP;
void main() {
  vec2 c = vec2(float(gl_VertexID & 1), float((gl_VertexID >> 1) & 1)) * 2.0 - 1.0;
  vP = c * 1.5;
  vec2 px = (uRel + vP * uHalf) * uS;
  gl_Position = vec4(px.x / (uRes.x * 0.5), -px.y / (uRes.y * 0.5), 0.0, 1.0);
}`;
export const DOODLE_FS = HEAD + COMMON + `
uniform sampler2D uSegs;
uniform int uRow;
uniform int uN;
uniform float uPx;
uniform float uHalf;
uniform float uFlash;
uniform float uS;
in vec2 vP;
out vec4 o;
float seg(vec2 p, vec4 s) {
  vec2 a = s.xy, b = s.zw, pa = p - a, ba = b - a;
  return length(pa - ba * clamp(dot(pa, ba) / max(dot(ba, ba), 1e-6), 0.0, 1.0));
}
void main() {
  float f = 2.0 / uPx;
  // One lithographic line width for every doodle: 1 micron.
  float hw = max(0.5 / uHalf, 0.5 * f);
  vec2 sd = vec2(1.2 * f);
  float d = 9.0, ds = 9.0;
  for (int i = 0; i < 128; i++) {
    if (i >= uN) break;
    vec4 s = texelFetch(uSegs, ivec2(i, uRow), 0);
    d = min(d, seg(vP, s));
    ds = min(ds, seg(vP - sd, s));
  }
  float a = clamp(0.5 - (d - hw) / f, 0.0, 1.0), as = clamp(0.5 - (ds - hw) / f, 0.0, 1.0);
  float fade = clamp((uPx - 1.5) / 4.0, 0.0, 1.0);
  // The same metal as the wiring: bright rim on the upper left, shadow outside the lower right.
  float rim = a * (1.0 - as), sh = (1.0 - a) * as * 0.6;
  vec3 m = grain(film(2.0, 150.0) * vec3(0.84, 0.88, 0.95), vP * uHalf, 1.0 / uS) * (1.0 + 0.55 * rim);
  float al = max(a, sh);
  vec3 col = mix(vec3(0.012, 0.012, 0.02), m, a / max(al, 1e-4));
  // Found: a thin outline that opens out and fades.
  float ring = uFlash * clamp(0.5 - (abs(d - hw - 0.14 - 0.5 * (1.0 - uFlash)) - 0.7 * f) / f, 0.0, 1.0);
  col = mix(col, vec3(1.0, 0.86, 0.55), ring);
  o = vec4(col, max(al * fade, ring));
}`;

// Post: lateral chromatic aberration, a shallow depth of field, an uneven lamp, dust and hairs, grain, tone curve.
export const POST_FS = HEAD + `
uniform sampler2D uScene;
uniform vec2 uRes;
uniform float uDof;
uniform float uExp;
uniform vec4 uSpec;
out vec4 o;
float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
// Distance in pixels to a bowed hair from a to b.
float hair(vec2 fc, vec2 a, vec2 b, float bow) {
  float d = 1e9;
  vec2 prev = a, n = normalize(vec2(-(b - a).y, (b - a).x));
  for (int i = 1; i <= 8; i++) {
    float t = float(i) / 8.0;
    vec2 pt = mix(a, b, t) + n * bow * sin(3.14159 * t);
    vec2 pa = fc - prev, ba = pt - prev;
    d = min(d, length(pa - ba * clamp(dot(pa, ba) / max(dot(ba, ba), 1e-4), 0.0, 1.0)));
    prev = pt;
  }
  return d;
}
void main() {
  vec2 fc = gl_FragCoord.xy;
  vec2 uv = fc / uRes;
  vec2 c = uv - 0.5;
  float asp = uRes.x / uRes.y;
  vec2 cc = c * vec2(asp, 1.0);
  float r2 = dot(cc, cc);
  float k = 0.0016 * r2 * uRes.x / 1920.0;
  vec2 oR = c * k, oB = -c * k;
  // A little softness everywhere, more toward the edges of the frame when zoomed in.
  float bl = 0.6 + uDof * smoothstep(0.1, 0.9, r2) * 1.8;
  vec3 acc = vec3(0.0);
  for (int i = 0; i < 8; i++) {
    float a = float(i) * 2.39996, rr = sqrt((float(i) + 0.5) / 8.0) * bl;
    vec2 d = vec2(cos(a), sin(a)) * rr / uRes;
    acc += vec3(texture(uScene, uv + d + oR).r, texture(uScene, uv + d).g, texture(uScene, uv + d + oB).b);
  }
  vec3 col = acc / 8.0;
  // Koehler illumination is never quite even: a warm hot spot, falling off to the corners.
  float vig = 1.0 - 0.5 * smoothstep(0.15, 1.1, sqrt(r2)) + 0.1 * exp(-r2 * 7.0);
  col *= vig * vec3(1.0, 0.975, 0.92);
  // Dust on the optics: soft dark specks and two hairs, fixed to the frame, out of focus.
  for (int i = 0; i < 7; i++) {
    vec2 p = vec2(hash(vec2(float(i), 1.0)), hash(vec2(float(i), 2.0))) * uRes;
    float r = 5.0 + 22.0 * hash(vec2(float(i), 3.0));
    col *= 1.0 - 0.09 * smoothstep(r, r * 0.35, length(fc - p)) * (0.5 + 0.5 * hash(vec2(float(i), 4.0)));
  }
  float h1 = hair(fc, uRes * vec2(0.12, 0.78), uRes * vec2(0.31, 0.93), 26.0 * uRes.y / 1080.0);
  float h2 = hair(fc, uRes * vec2(0.82, 0.12), uRes * vec2(0.93, 0.27), -18.0 * uRes.y / 1080.0);
  col *= 1.0 - 0.14 * (smoothstep(5.0, 0.6, h1) + smoothstep(4.0, 0.5, h2));
  vec2 sd = fc - uSpec.xy;
  col += vec3(1.0, 0.95, 0.85) * uSpec.w * exp(-dot(sd, sd) / (uSpec.z * uSpec.z));
  col *= uExp;
  col = col / (1.0 + 0.2 * col);
  col = pow(max(col, 0.0), vec3(1.0 / 2.2));
  // Sensor noise: stronger in the dark, with a touch of colour.
  float n1 = hash(fc) - 0.5, n2 = hash(fc + 17.0) - 0.5, n3 = hash(fc + 31.0) - 0.5;
  float lum = dot(col, vec3(0.3, 0.59, 0.11));
  col += (vec3(n1) * 0.03 + vec3(n2, n3, n1) * 0.012) * (1.2 - lum);
  o = vec4(col, 1.0);
}`;
