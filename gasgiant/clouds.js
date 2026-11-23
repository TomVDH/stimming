// Gas giant dive, pass 3: the cloud march at half size.
// Fourteen layers to 640 km down: decks, voids with towers, sheets, a veil. LAYERS in world.js lists them.
// Light follows Fire's smoke: HG phase, Beer with multiple scatter and powder, a shadow ambient.
// Output: one RGBA16F target. rgb is the light in front of the sky, a is the cover.
import { COMMON } from './world.js';
import { CLOUDS } from '../shared/clouds.js';

/* ---------- K: Railgun's tiled 3D billow noise (copied from volcano/clouds.js) ---------- */
const VOL_NOISE = /* glsl */`
vec3 vh3(vec3 p) {
  p = vec3(dot(p, vec3(127.1, 311.7, 74.7)), dot(p, vec3(269.5, 183.3, 246.1)), dot(p, vec3(113.5, 271.9, 124.6)));
  return fract(sin(p) * 43758.5453123);
}
float vworley(vec3 uv, float f) {
  vec3 id = floor(uv * f), p = fract(uv * f);
  float md = 9.0;
  for (int x = -1; x <= 1; x++) for (int y = -1; y <= 1; y++) for (int z = -1; z <= 1; z++) {
    vec3 o = vec3(float(x), float(y), float(z));
    vec3 d = o + vh3(mod(id + o, f)) * 0.8 + 0.1 - p;
    md = min(md, dot(d, d));
  }
  return clamp(1.0 - sqrt(md), 0.0, 1.0);
}
float vgrad(vec3 i, vec3 w, vec3 o, float f) { return dot(vh3(mod(i + o, f)) * 2.0 - 1.0, w - o); }
float vperlin(vec3 uv, float f) {
  vec3 p = uv * f, i = floor(p), w = fract(p);
  vec3 u = w * w * w * (w * (w * 6.0 - 15.0) + 10.0);
  return mix(mix(mix(vgrad(i, w, vec3(0, 0, 0), f), vgrad(i, w, vec3(1, 0, 0), f), u.x), mix(vgrad(i, w, vec3(0, 1, 0), f), vgrad(i, w, vec3(1, 1, 0), f), u.x), u.y),
             mix(mix(vgrad(i, w, vec3(0, 0, 1), f), vgrad(i, w, vec3(1, 0, 1), f), u.x), mix(vgrad(i, w, vec3(0, 1, 1), f), vgrad(i, w, vec3(1, 1, 1), f), u.x), u.y), u.z);
}
vec4 volAt(vec3 p) {
  float pf = clamp(0.5 + 0.8 * (vperlin(p, 4.0) + 0.5 * vperlin(p, 8.0) + 0.25 * vperlin(p, 16.0)), 0.0, 1.0);
  float wf = vworley(p, 4.0) * 0.625 + vworley(p, 8.0) * 0.25 + vworley(p, 16.0) * 0.125;
  float fine = vworley(p, 6.0) * 0.625 + vworley(p, 12.0) * 0.25 + vworley(p, 24.0) * 0.125;
  return vec4(wf + pf * (1.0 - wf), fine, wf, pf);
}`;
/* ---------- end K ---------- */

// Bakes one z layer of the 64 cubed noise volume per draw.
export const BAKE_FS = /* glsl */`#version 300 es
precision highp float;
in vec2 vUv;
out vec4 o;
uniform float uZ;
${VOL_NOISE}
void main() { o = volAt(vec3(vUv, uZ)); }`;

export const MARCH_FS = /* glsl */`#version 300 es
precision highp float;
precision highp sampler3D;
in vec2 vUv;
out vec4 o;
uniform sampler2D uMap, uLut;
uniform sampler3D uVol;
uniform vec3 uCam, uFwd, uRight, uUp;
uniform float uT, uTMap, uSteps, uFine, uWin, uSeed;
uniform vec4 uFlash[4];
${COMMON}
${CLOUDS}
const float SIG = 1.1;
const float TOP = 34.0, BOT = -505.0;
const vec3 FLASH_C = vec3(0.64, 0.74, 1.0);
const vec3 SKY_C = vec3(0.07, 0.14, 0.17);
vec4 lut(float h) { return textureLod(uLut, vec2(clamp((h - LUT_LO) / (LUT_HI - LUT_LO), 0.0, 1.0), 0.5), 0.0); }
vec4 mapAt(vec2 xz) {
  vec2 uv = (xz - MAP_C) / MAP_S + 0.5;
  vec4 m = textureLod(uMap, uv, 0.0);
  float edge = max(abs(uv.x - 0.5), abs(uv.y - 0.5));
  return mix(m, vec4(0.45, 0.45, 0.0, 0.05), smoothstep(0.44, 0.5, edge));
}
vec3 gAlb = vec3(1.0);
float gOpen = 0.0;
vec3 th3(vec2 c) { vec3 p = vec3(dot(c, vec2(127.1, 311.7)), dot(c, vec2(269.5, 183.3)), dot(c, vec2(419.2, 371.9))); return fract(sin(p) * 43758.5453); }
// A tower in a void: one per cs km cell at most.
// Towers gather in clusters and lines, as convection does; open plains lie between.
// A third join floor and ceiling, a third rise as plumes, a third hang from the ceiling.
// fill is the share of cells with a tower in a cluster.
float tower(vec3 p, float h, float flo, float cei, float seed, float nb, float cs, float fill, out float f) {
  vec2 cell = floor(p.xz / cs);
  vec3 r = th3(cell + seed);
  vec3 r2 = th3(cell + seed + 41.0);
  float cl = textureLod(uVol, vec3((cell + 0.5) * 0.09, fract(seed * 0.13) + 0.31), 0.0).a;
  float on = step(1.0 - fill * 1.8 * smoothstep(0.4, 0.66, cl), r.z);
  float k = cs / 48.0 * (0.5 + 0.9 * r2.x);
  f = clamp((h - flo) / (cei - flo), 0.0, 1.0);
  float len = r2.y < 0.34 ? 1.0 : 0.3 + 0.6 * r2.z;
  float g = r2.y < 0.67 ? f / len : (f - 1.0 + len) / len;
  float inside = step(0.0, g) * step(g, 1.0);
  g = clamp(g, 0.0, 1.0);
  float lean = (g - 0.5) * (r.z - 0.5) * 9.0 * k;
  vec2 c = (cell + 0.25 + 0.5 * r.xy) * cs + vec2(lean, lean * 0.6) + 2.0 * k * vec2(sin(g * 7.0 + r.x * 6.0), cos(g * 5.0 + r.y * 6.0));
  // Joined towers flare at both ends; plumes spread an anvil; pendants taper to a tip.
  float e = r2.y < 0.34 ? abs(2.0 * g - 1.0) : g;
  float rad = k * (1.6 + 2.4 * r.y) * (0.45 + 1.5 * e * e * e) * (0.75 + 0.5 * nb);
  rad *= r2.y < 0.34 ? 1.0 : r2.y < 0.67 ? 1.0 - smoothstep(0.88, 1.0, g) * 0.8 : smoothstep(0.0, 0.15, g);
  return on * inside * smoothstep(0.0, 1.6 * k, rad - length(p.xz - c));
}
// Thin sheets stacked from bot up, one in each gap km.
// Each sheet has its own height, thickness and cover; id names it.
float sheets(float h, float bot, float gap, float thick, float nb, float hole, float lod, out vec3 id) {
  float s = (h - bot) / gap;
  id = th3(vec2(floor(s), bot));
  float y = (fract(s) - 0.35 - 0.3 * id.x) * gap + 0.12 * gap * (nb - 0.5);
  float th = thick * (0.5 + id.y);
  float cov = smoothstep(0.0, 0.12, hole - 0.25 - 0.45 * id.z);
  return (1.0 - smoothstep(th * 0.3, th + 0.4 + lod, abs(y))) * cov;
}
float band(float h, float lo, float hi, float w) { return smoothstep(lo - w, lo + w, h) * (1.0 - smoothstep(hi - w, hi + w, h)); }
// Storm curtains and rare twisters in a void from flo to cei.
// cu is the share of storm cells with a curtain; tw the share of curtains with a twister.
// Storms gather where convection does, as the towers do.
float stormsIn(vec3 p, float h, float flo, float cei, float seed, float cs, float tw, float cu) {
  float H = cei - flo;
  float f = clamp((h - flo) / H, 0.0, 1.0);
  float res = 0.0;
  vec2 cell = floor(p.xz / cs);
  vec3 r = th3(cell + seed + 29.0);
  vec3 r2 = th3(cell + seed + 53.0);
  float cl = textureLod(uVol, vec3((cell + 0.5) * 0.11, fract(seed * 0.13) + 0.62), 0.0).a;
  if (r.z > 1.0 - cu * 1.8 * smoothstep(0.42, 0.66, cl)) {
    vec2 c = (cell + 0.5) * cs + (r.xy - 0.5) * cs * 0.3;
    float rc = cs * (0.14 + 0.14 * r.y);
    // A curtain: rain that hangs from the ceiling in streaks and dries before the floor.
    float e = length((p.xz - c) * vec2(1.0, 1.7));
    if (e < rc) {
      float st = textureLod(uVol, vec3(p.x / 4.0, h / 60.0 - uT * 0.004, p.z / 4.0) + r, 0.0).g;
      float reach = 0.3 + 0.6 * r.x;
      float hang = smoothstep(1.0 - reach, 1.0 - reach + 0.35, f);
      res = 0.3 * smoothstep(rc, rc * 0.4, e) * smoothstep(0.45, 0.8, st) * hang;
    }
    // A twister drops from the rain-free base at the curtain's edge.
    if (r2.z > 1.0 - tw) {
      float an = r2.x * 6.2832;
      vec2 tc = c + vec2(cos(an), sin(an) / 1.7) * rc * 1.05;
      // It wanders slowly; the foot trails the top; the rope sways.
      tc += rc * 0.15 * vec2(sin(uT * 0.013 + r2.y * 6.3), cos(uT * 0.011 + r2.x * 6.3));
      tc += vec2(cos(an), sin(an)) * (1.0 - f) * H * 0.35 * (r2.y - 0.3);
      tc += H * 0.04 * vec2(sin(f * 6.0 + uT * 0.07 + r2.y * 9.0), cos(f * 5.0 + uT * 0.06 + r2.x * 9.0));
      vec2 q = p.xz - tc;
      float rr = length(q);
      float f3 = f * f * f;
      float rad = H * (0.008 + 0.01 * r2.y) * (1.0 + 9.0 * f3 * f3) + H * 0.05 * exp(-f * 20.0);
      if (rr < rad * 1.6 + 0.4) {
        // The wall swirls on angle and log radius, as in Tornado alley, so it never winds up.
        float a = atan(q.y, q.x) - uT * (0.4 + 0.5 * r2.x) - 2.0 * log(max(rr, 0.05));
        float sw = textureLod(uVol, vec3(cos(a) * 0.4 + r2.x, h / (H * 0.6) - uT * 0.01, sin(a) * 0.4 + r2.y), 0.0).r;
        res = max(res, smoothstep(rad * 1.25 + 0.3, rad * 0.5, rr) * (0.35 + 0.9 * sw) * mix(0.45, 1.0, smoothstep(0.0, 0.15, f)));
      }
    }
  }
  return res;
}
// Density at p, 0 to 1. It sets gAlb, the albedo, and gOpen, how near a top it lies.
// The branches follow LAYERS in world.js, top down. No cloud lies under -500 km.
// fine scales the small billows; lod grows with distance.
float dens(vec3 p, float lod, float fine) {
  float h = altOf(p);
  float d = 0.0;
  gAlb = vec3(0.9);
  gOpen = 0.0;
  if (h < TOP && h > BOT) {
    vec4 m = mapAt(p.xz);
    // A slow, wide warp breaks the noise lattice; the fine octave turns off its axes.
    vec4 nw = textureLod(uVol, vec3(p.x, h, p.z) / 1300.0 + vec3(0.3, 0.1, 0.7), 0.0);
    vec3 q = vec3(p.x, h * 2.5, p.z) + (nw.xyz - 0.5) * 110.0;
    vec4 n1 = textureLod(uVol, q / 70.0 + vec3(0.0, uT * 0.0006, 0.0), 0.0);
    vec3 qr = vec3(0.8 * q.x - 0.6 * q.z, q.y, 0.6 * q.x + 0.8 * q.z);
    vec4 n2 = textureLod(uVol, qr / 17.3 + vec3(0.37, uT * 0.0015, 0.71), 0.0);
    // In the storm the billows swirl: the noise lies on angle and log radius, as in Tornado alley.
    // On those axes the turn and the outflow are one slide, so nothing winds up.
    vec2 se = (p.xz - ST_C) / ST_AX;
    float sr = length(se);
    float wS = (1.0 - smoothstep(0.9, 1.2, sr)) * step(-8.0, h);
    if (wS > 0.0) {
      float lr = log(max(sr, 0.03)) - 0.00012 * uTMap;
      float ang = atan(se.y, se.x) + 0.0014 * uTMap - 2.6 * lr;
      vec3 sp = vec3(cos(ang) * 1.6 + lr * 6.0, h * 0.04, sin(ang) * 1.6);
      vec4 s1 = textureLod(uVol, sp + vec3(0.0, uT * 0.0006, 0.0), 0.0);
      vec4 s2 = textureLod(uVol, sp * vec3(3.1, 2.0, 3.1) + vec3(0.37, uT * 0.0015, 0.71), 0.0);
      n1 = mix(n1, s1, wS);
      n2 = mix(n2, s2, wS);
    }
    float nb = n1.r + fine * 0.3 * (n2.r - 0.5);
    // Wide cells break each deck here and there.
    vec4 nc = textureLod(uVol, vec3(0.6 * q.x + 0.8 * q.z, h * 4.0, 0.8 * q.x - 0.6 * q.z) / 157.0 + vec3(0.11, 0.0, 0.53), 0.0);
    float f = 0.0;
    // A void sets vd (floor, ceiling, seed, hue) and vk (storm cell km, twister share, curtain share).
    vec4 vd = vec4(0.0);
    vec3 vk = vec3(0.0);
    if (h > 0.0) {
      // The ammonia deck: tops follow the map; billows stand on them; a lumpy ceiling below.
      // Billows stand taller in the zones and the storm, where the cloud is thick.
      float top = 4.0 + 20.0 * m.r + (6.0 + 5.0 * m.r) * (nb - 0.5) * (1.0 + m.a);
      // Relief at Juno's scale: cells, popcorn heads and folded ridges, in km.
      // Convective cells 4 km across heap the tops.
      float rel = 5.0 * (n2.b - 0.45);
      // Popcorn heads stand up to 6 km over the deck.
      float pop = max(n2.b - 0.42, 0.0) / 0.58;
      rel += 6.0 * pop * pop;
      // Folded ridges run along the bands, with sharp crests.
      vec4 n3 = textureLod(uVol, vec3(qr.x / 150.0, h * 0.03, qr.z / 34.0) + vec3(0.21, 0.4, 0.47), 0.0);
      float rg = 1.0 - abs(2.0 * n3.a - 1.0);
      rel += 4.0 * rg * rg * rg - 1.4;
      rel *= fine * (0.4 + 0.6 * m.r);
      top += rel;
      float base = 2.0 + 3.0 * (nb - 0.5);
      float sh = min(top - h, (h - base) * 0.7);
      // Holes open in the low belts; zones and the storm stay closed.
      float cov = smoothstep(0.22, 0.42, nc.a + 0.55 * (m.r - 0.45) + 0.08 * (nb - 0.5));
      // A crisp top near the eye lets the heads cast shadows.
      d = smoothstep(0.0, 0.35 + 0.85 * lod, sh) * (0.55 + 0.45 * n1.b) * cov;
      // Hue drifts a little with the billows, so the colours blend in the cloud.
      // Valleys between heads see less sky; their colour runs deeper.
      float ao = clamp(0.5 + 0.2 * rel, 0.2, 1.15);
      float sat = clamp(m.b + 0.35 * (1.0 - ao), 0.0, 1.0);
      gAlb = mix(vec3(0.86, 0.9, 0.88), pal(m.g + 0.22 * (n1.a - 0.5) + 0.12 * (n2.a - 0.5)), sat);
      gOpen = clamp(1.0 - (top - h) / 6.0, 0.0, 1.0) * ao;
    } else if (h > -24.0) {
      // The upper void: towers stand between the brown floor and the white ceiling.
      d = tower(p, h, -24.0, 2.0, 3.1, nb, 48.0, 0.5, f) * (0.6 + 0.4 * n1.b);
      gAlb = mix(pal(0.5 + 0.3 * n1.a), pal(0.1), f);
      gOpen = f;
      vd = vec4(-24.0, 2.0, 3.1, 0.5);
      vk = vec3(70.0, 0.12, 0.35);
    } else if (h > -38.0) {
      // The brown deck: a floor above, a ceiling below, a few breaks.
      float cov = smoothstep(0.3, 0.48, 1.0 - nc.a + 0.08 * (nb - 0.5));
      float sh = min(-24.0 + 4.0 * (nb - 0.5) - h, (h + 38.0 + 3.0 * (nb - 0.5)) * 0.8);
      d = smoothstep(0.0, 1.6 + lod, sh) * cov * 0.85;
      gAlb = mix(pal(0.34), pal(0.6), n1.a);
      gOpen = clamp(1.0 - (-24.0 - h) / 6.0, 0.0, 1.0);
    } else if (h > -64.0) {
      // The lower void: darker towers from the water deck to the brown ceiling.
      d = tower(p, h, -64.0, -38.0, 7.7, nb, 48.0, 0.5, f) * (0.6 + 0.4 * n1.b);
      gAlb = mix(pal(0.95 + 0.15 * n1.a), pal(0.45), f);
      gOpen = f;
      vd = vec4(-64.0, -38.0, 7.7, 0.95);
      vk = vec3(60.0, 0.15, 0.4);
    } else if (h > -92.0) {
      // The water deck, heaped where the storm's wake churns.
      float top = -64.0 + 22.0 * m.a * n1.a + 5.0 * (nb - 0.5);
      float sh = min(top - h, (h + 92.0) * 0.8);
      float cov = smoothstep(0.3, 0.5, nc.a + 0.4 * m.a + 0.08 * (nb - 0.5));
      d = smoothstep(0.0, 1.6 + lod, sh) * (0.5 + 0.5 * n1.b) * cov;
      gAlb = mix(vec3(0.72, 0.66, 0.84), pal(0.9), 0.4 * n1.a);
      gOpen = clamp(1.0 - (top - h) / 8.0, 0.0, 1.0);
    } else if (h > -140.0) {
      // The shelves: violet sheets 16 km apart, some whole, some lace.
      vec3 id;
      d = sheets(h, -140.0, 16.0, 1.6, nb, nc.a, lod, id) * (0.5 + 0.5 * n1.b);
      gAlb = pal(0.9 + 0.3 * id.x + 0.1 * n1.a);
      gOpen = 0.6 + 0.4 * id.y;
    } else if (h > -158.0) {
      // The veil: a thin purple gauze, combed into streaks.
      d = 0.14 * smoothstep(0.35, 0.75, nb) * band(h, -158.0, -140.0, 3.0);
      gAlb = mix(pal(1.0), pal(1.15), n1.a);
      gOpen = 0.5;
    } else if (h > -230.0) {
      // The nave: a forest of columns 72 km tall, close set.
      d = tower(p, h, -230.0, -158.0, 11.3, nb, 64.0, 0.75, f) * (0.55 + 0.45 * n1.b);
      gAlb = mix(pal(0.55 + 0.1 * n1.a), pal(0.95), f);
      gOpen = 0.3 + 0.7 * f;
      vd = vec4(-230.0, -158.0, 11.3, 0.55);
      vk = vec3(110.0, 0.1, 0.3);
    } else if (h > -262.0) {
      // The indigo deck: heaped on top, pouches hang from its base.
      float pop = max(n2.b - 0.4, 0.0) / 0.6;
      float top = -230.0 + 6.0 * (nb - 0.5) + 5.0 * pop * pop;
      float base = -262.0 + 3.0 * (nb - 0.5) - 6.0 * pop * pop;
      float sh = min(top - h, (h - base) * 0.8);
      float cov = smoothstep(0.22, 0.42, nc.a + 0.12);
      d = smoothstep(0.0, 1.2 + lod, sh) * (0.5 + 0.5 * n1.b) * cov;
      gAlb = mix(vec3(0.36, 0.34, 0.74), pal(0.5), 0.35 * n1.a);
      gOpen = clamp(1.0 - (top - h) / 8.0, 0.0, 1.0);
    } else if (h > -360.0) {
      // The abyss: colossal towers 150 km apart, and a few floating shelves.
      d = tower(p, h, -360.0, -262.0, 5.9, nb, 150.0, 0.45, f) * (0.55 + 0.45 * n1.b);
      vec3 id;
      float sv = sheets(h, -360.0, 33.0, 1.0, nb, nc.a - 0.25, lod, id);
      gAlb = mix(mix(pal(0.45), pal(0.15), f), pal(1.05 + 0.15 * id.x), step(d, sv));
      d = max(d, sv * 0.8);
      gOpen = 0.3 + 0.7 * f;
      vd = vec4(-360.0, -262.0, 5.9, 0.15);
      vk = vec3(150.0, 0.18, 0.35);
    } else if (h > -385.0) {
      // The salt deck: pale jade, flat, its top in long wave rows.
      float top = -360.0 + 3.0 * sin(qr.x / 9.0 + 4.0 * n1.r) * (0.6 + 0.4 * nb);
      float base = -385.0 + 3.0 * (nb - 0.5);
      float sh = min(top - h, (h - base) * 0.8);
      d = smoothstep(0.0, 1.0 + lod, sh) * (0.6 + 0.4 * n1.b) * smoothstep(0.12, 0.3, nc.a + 0.1);
      gAlb = mix(pal(0.08), pal(0.25), n1.a);
      gOpen = clamp(1.0 - (top - h) / 5.0, 0.0, 1.0);
    } else if (h > -470.0) {
      // The stairs: thin laminae 9 km apart, teal and violet by turns.
      vec3 id;
      d = sheets(h, -470.0, 9.0, 0.9, nb, nc.a + 0.15, lod, id) * (0.55 + 0.45 * n1.b);
      gAlb = pal(mod(floor((h + 470.0) / 9.0), 2.0) < 0.5 ? 0.5 + 0.15 * id.x : 0.95 + 0.15 * id.x);
      gOpen = 0.6 + 0.4 * id.y;
    } else {
      // The last deck: dark magenta, churned, with tall heads.
      float pop = max(n2.b - 0.4, 0.0) / 0.6;
      float top = -470.0 + 10.0 * (nb - 0.5) + 8.0 * pop;
      float sh = min(top - h, (h + 500.0) * 0.8);
      d = smoothstep(0.0, 1.4 + lod, sh) * (0.5 + 0.5 * n1.b) * smoothstep(0.2, 0.4, nc.a + 0.1);
      gAlb = mix(pal(1.12), pal(0.95), n1.a) * 0.8;
      gOpen = clamp(1.0 - (top - h) / 10.0, 0.0, 1.0);
    }
    // One call for every void: the storms in it.
    if (vk.x > 0.0) {
      float sd = stormsIn(p, h, vd.x, vd.y, vd.z, vk.x, vk.y, vk.z);
      if (sd > d) {
        d = sd;
        gAlb = mix(pal(vd.w + 0.1 * n1.a), vec3(0.85), 0.35);
        gOpen = 0.5;
      }
    }
  }
  return d;
}
// Optical depth toward the light over four growing taps, to 33 km.
// A low sun needs the reach: a 6 km head throws a 34 km shadow.
float lightOD(vec3 p, vec3 ld, float lod) {
  float od = 0.0, st = 1.2;
  for (int j = 0; j < 4; j++) {
    p += ld * st;
    od += dens(p, lod + 1.0, 0.0) * st;
    st *= 2.6;
  }
  return od;
}
void main() {
  vec3 ro = uCam;
  vec2 c = vUv * 2.0 - 1.0;
  vec3 rd = normalize(uFwd + c.x * uRight + c.y * uUp);
  float camH = altOf(ro);
  // The slab of cloud between the top shell and the bottom shell.
  vec2 hT = sphereHit(ro, rd, R + TOP), hB = sphereHit(ro, rd, R + BOT);
  float t0 = camH > TOP ? hT.x : 0.0;
  float t1 = hB.x > 0.0 && hB.x < 1e8 ? hB.x : hT.y;
  if (camH > TOP && hT.x > hT.y) t1 = -1.0;
  bool inWin = camH < TOP + 4.0;
  // In a void the window opens to 1,600 km and the steps grow faster.
  float vw = clamp((uWin - 220.0) / 1380.0, 0.0, 1.0);
  float grow = mix(0.012, 0.024, vw), cap = mix(9.0, 30.0, vw);
  if (inWin) t1 = min(t1, uWin);
  vec4 res = vec4(0.0);
  if (t1 > t0) {
    float mu = dot(rd, SUN);
    float ph = clPhase(mu);
    float t = t0 + (0.3 + 0.006 * t0) * fract(sin(dot(gl_FragCoord.xy + uSeed, vec2(12.9898, 78.233))) * 43758.5453);
    vec3 col = vec3(0.0);
    float T = 1.0, tHit = -1.0;
    int n = int(uSteps);
    for (int i = 0; i < 256; i++) {
      if (i >= n || t > t1 || T < 0.02) break;
      vec3 p = ro + rd * t;
      float ds = min(inWin ? 0.3 + grow * t : 0.3 + 0.0075 * t, cap + (0.004 + 0.006 * vw) * t);
      float lod = clamp(log2(1.0 + t / 120.0), 0.0, 4.0);
      float dn = dens(p, lod, uFine * (1.0 - smoothstep(1.5, 3.0, lod)));
      if (dn > 0.003) {
        vec3 alb = gAlb;
        float open = gOpen;
        if (tHit < 0.0) tHit = t;
        float h = altOf(p);
        vec4 L = lut(h);
        // Under the deck tops the light comes down through the ceiling, slanted to the sun's side.
        vec3 upv = normalize(p - PC);
        vec3 ld = normalize(mix(upv * 0.75 + normalize(SUN - upv * dot(SUN, upv)) * 0.66, SUN, L.a));
        // Fire's smoke: Beer, multiple scatter, powder, a shadow ambient.
        // Far clouds in the decks take a mean depth; far ones seen from above take none.
        float tau = SIG * (lod < 2.5 ? lightOD(p, ld, lod) : inWin ? 3.0 : 0.0);
        float beer = exp(-tau);
        // The multiple-scatter term carries the light into the cloud, so thin parts glow.
        float lit = beer + 0.38 * exp(-0.22 * tau);
        float powder = 1.0 - exp(-2.0 * tau - 0.6);
        lit = mix(lit, lit * powder, 0.35) + 0.025;
        float ring = ringShadow(p);
        vec3 sun = L.rgb * L.a * lit * ph * ring * 0.85;
        // The light from above lights what it reaches; it glows forward when the eye looks toward it.
        float phD = mix(1.0, clPhase(dot(rd, ld)), 0.4);
        vec3 diffuse = L.rgb * (1.0 - L.a) * (0.07 + 0.45 * open * open + 1.0 * lit * phD);
        vec3 sky = SKY_C * L.a * (0.25 + 0.75 * open) * (0.6 + 0.4 * ring);
        vec3 Lc = alb * (sun + diffuse + sky);
        // Flashes light the cloud round them, with no shadow.
        for (int k = 0; k < 4; k++) {
          vec4 f = uFlash[k];
          if (f.w <= 0.0) continue;
          vec3 fq = f.xyz - p;
          float d2 = dot(fq, fq);
          Lc += FLASH_C * f.w * (1.8 * exp(-d2 / 60.0) + 0.5 * exp(-sqrt(d2) / 14.0));
        }
        float di = min(ds, 4.0 + 0.004 * t);
        float a = 1.0 - exp(-SIG * dn * di);
        col += T * Lc * a;
        T *= 1.0 - a;
      }
      // Clear gas between the clouds: a thin haze that thickens with depth.
      if (inWin && dn <= 0.003) {
        float hg = altOf(p);
        // The voids stay clear to the horizon; the gaps between sheets stay fairly clear.
        float mfp = mix(45.0, 170.0, smoothstep(-90.0, 0.0, hg)) + 300.0 * band(hg, -24.0, 0.0, 3.0) + 300.0 * band(hg, -64.0, -38.0, 3.0)
          + 500.0 * band(hg, -230.0, -158.0, 6.0) + 700.0 * band(hg, -360.0, -262.0, 6.0)
          + 60.0 * band(hg, -140.0, -92.0, 6.0) + 60.0 * band(hg, -470.0, -385.0, 6.0) + 40.0 * step(hg, -500.0);
        float sg = 1.0 / mfp;
        float ag = 1.0 - exp(-sg * ds * 1.6);
        col += T * lut(hg).rgb * vec3(0.38, 0.42, 0.44) * ag;
        T *= 1.0 - ag;
      }
      t += ds * (dn > 0.003 ? 1.0 : 1.6);
    }
    // Inside the decks, the medium past the window is fog of the same light.
    if (inWin && t >= t1 - 0.01 && T > 0.02) {
      vec4 L = lut(camH - 0.15 * min(uWin, 220.0));
      vec3 fog = vec3(0.74, 0.8, 0.82) * L.rgb * (0.5 + 0.5 * (1.0 - L.a));
      col += T * fog;
      T = 0.0;
    }
    // A grazing ray that runs out of steps over the deck ends in the deck's haze, not in space.
    vec3 oc = ro - PC;
    float bq = dot(oc, rd);
    float hMin = (bq < 0.0 ? length(oc - rd * bq) : length(oc)) - R;
    if (!inWin && T > 0.02 && hMin < 22.0 && ((hB.x < hB.y && hB.x > 0.0) || t < t1 - 1.0)) {
      if (tHit < 0.0) tHit = t1;
      col += T * vec3(0.34, 0.58, 0.6) * 0.62;
      T = 0.0;
    }
    float al = 1.0 - T;
    // Haze over the deck seen from above.
    if (!inWin && tHit > 0.0) {
      float hz = 1.0 - exp(-(tHit - t0) / 2600.0);
      col = mix(col, vec3(0.3, 0.55, 0.6) * 0.6 * al, hz * 0.45);
    }
    res = vec4(col, al);
  }
  o = res;
}`;
