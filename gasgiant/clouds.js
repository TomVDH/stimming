// Gas giant dive, pass 3: the cloud march at half size.
// Three decks: ammonia (white), ammonium hydrosulfide (brown), water (grey, with lightning).
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
const float TOP = 34.0, BOT = -96.0;
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
// A tower in a void: one per 48 km cell at most, joining the floor to the ceiling.
// It flares at both ends, pinches in the middle, leans and twists a little.
float tower(vec3 p, float h, float flo, float cei, float seed, float nb, out float f) {
  const float CS = 48.0;
  vec2 cell = floor(p.xz / CS);
  vec3 r = th3(cell + seed);
  f = clamp((h - flo) / (cei - flo), 0.0, 1.0);
  float lean = (f - 0.5) * (r.z - 0.5) * 9.0;
  vec2 c = (cell + 0.25 + 0.5 * r.xy) * CS + vec2(lean, lean * 0.6) + 2.0 * vec2(sin(f * 7.0 + r.x * 6.0), cos(f * 5.0 + r.y * 6.0));
  float e = abs(2.0 * f - 1.0);
  float rad = (1.6 + 2.4 * r.y) * (0.45 + 1.5 * e * e * e) * (0.75 + 0.5 * nb);
  float on = step(0.5, r.z);
  return on * smoothstep(0.0, 1.6, rad - length(p.xz - c));
}
// Density at p, 0 to 1. It sets gAlb, the albedo, and gOpen, how near a top it lies.
// Layers, km: ammonia 2 to 22, void, brown 24 to 38 down, void, water 64 to 92 down.
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
      d = tower(p, h, -24.0, 2.0, 3.1, nb, f) * (0.6 + 0.4 * n1.b);
      gAlb = mix(pal(0.5 + 0.3 * n1.a), pal(0.1), f);
      gOpen = f;
    } else if (h > -38.0) {
      // The brown deck: a floor above, a ceiling below, a few breaks.
      float cov = smoothstep(0.3, 0.48, 1.0 - nc.a + 0.08 * (nb - 0.5));
      float sh = min(-24.0 + 4.0 * (nb - 0.5) - h, (h + 38.0 + 3.0 * (nb - 0.5)) * 0.8);
      d = smoothstep(0.0, 1.6 + lod, sh) * cov * 0.85;
      gAlb = mix(pal(0.34), pal(0.6), n1.a);
      gOpen = clamp(1.0 - (-24.0 - h) / 6.0, 0.0, 1.0);
    } else if (h > -64.0) {
      // The lower void: darker towers from the water deck to the brown ceiling.
      d = tower(p, h, -64.0, -38.0, 7.7, nb, f) * (0.6 + 0.4 * n1.b);
      gAlb = mix(pal(0.95 + 0.15 * n1.a), pal(0.45), f);
      gOpen = f;
    } else {
      // The water deck, heaped where the storm's wake churns.
      float top = -64.0 + 22.0 * m.a * n1.a + 5.0 * (nb - 0.5);
      float sh = min(top - h, (h + 92.0) * 0.8);
      float cov = smoothstep(0.3, 0.5, nc.a + 0.4 * m.a + 0.08 * (nb - 0.5));
      d = smoothstep(0.0, 1.6 + lod, sh) * (0.5 + 0.5 * n1.b) * cov;
      gAlb = mix(vec3(0.72, 0.66, 0.84), pal(0.9), 0.4 * n1.a);
      gOpen = clamp(1.0 - (top - h) / 8.0, 0.0, 1.0);
    }
  }
  return d;
}
// Optical depth toward the sun over three growing taps.
float sunOD(vec3 p, float lod) {
  float od = 0.0, st = 1.2;
  for (int j = 0; j < 3; j++) {
    p += SUN * st;
    od += dens(p, lod + 1.0, 0.0) * st;
    st *= 3.0;
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
      float ds = min(inWin ? 0.3 + 0.012 * t : 0.3 + 0.0075 * t, 9.0 + 0.004 * t);
      float lod = clamp(log2(1.0 + t / 120.0), 0.0, 4.0);
      float dn = dens(p, lod, uFine * (1.0 - smoothstep(1.5, 3.0, lod)));
      if (dn > 0.003) {
        vec3 alb = gAlb;
        float open = gOpen;
        if (tHit < 0.0) tHit = t;
        float h = altOf(p);
        vec4 L = lut(h);
        // Fire's smoke: Beer, multiple scatter, powder, a shadow ambient.
        float tau = SIG * (lod < 2.5 ? sunOD(p, lod) : 0.0);
        float beer = exp(-tau);
        float lit = beer + 0.3 * exp(-0.25 * tau);
        float powder = 1.0 - exp(-2.0 * tau - 0.6);
        lit = mix(lit, lit * powder, 0.35) + 0.025;
        float ring = ringShadow(p);
        vec3 sun = L.rgb * L.a * lit * ph * ring * 0.85;
        vec3 diffuse = L.rgb * (1.0 - L.a) * (0.2 + 0.8 * open * open);
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
        float sg = 1.0 / mix(45.0, 170.0, smoothstep(-90.0, 0.0, hg));
        float ag = 1.0 - exp(-sg * ds * 1.6);
        col += T * lut(hg).rgb * vec3(0.38, 0.42, 0.44) * ag;
        T *= 1.0 - ag;
      }
      t += ds * (dn > 0.003 ? 1.0 : 1.6);
    }
    // Inside the decks, the medium past the window is fog of the same light.
    if (inWin && t >= t1 - 0.01 && T > 0.02) {
      vec4 L = lut(camH - 0.15 * uWin);
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
