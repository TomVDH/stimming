// Window seat shaders: two passes on one full-screen quad.
// Pass 1 draws the outside into its own buffer, only behind the glass.
// Pass 2 draws the cabin, the frame and the panes; the glass samples pass 1.

export const QUAD_VS = `#version 300 es
in vec2 aPos; void main() { gl_Position = vec4(aPos, 0.0, 1.0); }`;

const W2 = v => `vec2(${v[0].toFixed(4)}, ${v[1].toFixed(4)})`;

// Noise, the window shape and the sky lookup, for both passes.
const common = ({ ALT, WIN }) => `
const float R = 6371.0, H = ${ALT.toFixed(1)};
const float PI = 3.14159265;
uniform vec3 uEye; uniform vec2 uBank;
uniform sampler2D uSkyL, uSkyT; uniform vec2 uSunAz; uniform float uHorEl;
float hash12(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
vec2 hash22(vec2 p) { return vec2(hash12(p), hash12(p + 19.19)); }
float vnoise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash12(i), hash12(i + vec2(1, 0)), f.x), mix(hash12(i + vec2(0, 1)), hash12(i + vec2(1, 1)), f.x), f.y); }
float fbm(vec2 p, int n) { float a = 0.5, s = 0.0; for (int i = 0; i < 6; i++) { if (i >= n) break; s += a * vnoise(p); p = p * 2.03 + 17.1; a *= 0.5; } return s; }

// A rounded box: the shape of the window.
float sdBox(vec2 p, vec2 b, float r) { vec2 q = abs(p) - b + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }
const vec2 OUTB = ${W2(WIN.out)}, INB = ${W2(WIN.inn)};
const float ROUT = ${WIN.rOut.toFixed(4)}, RIN = ${WIN.rIn.toFixed(4)}, DEPTH = ${WIN.depth.toFixed(4)}, SLOT = ${WIN.slot.toFixed(4)};
// The inner and outer panes sit behind the scratch pane.
// The outer pane fills the skin opening, smaller and sharper.
const float Z_IN = ${WIN.zIn.toFixed(4)}, Z_OUT = ${WIN.zOut.toFixed(4)}, RSK = ${WIN.rSkin.toFixed(4)};
const vec2 SKIN = ${W2(WIN.skin)};
// The recess narrows from the rim to the pane.
float sdRecess(vec2 p, float z) { float k = clamp(z / DEPTH, 0.0, 1.0); return sdBox(p, mix(OUTB, INB, k), mix(ROUT, RIN, k)); }
// The ray's point on the plane at depth z, in window metres.
vec2 at(vec3 da, float z) { return (uEye + da * ((z - uEye.z) / da.z)).xy; }
// Outside rays turn with the bank of the plane.
vec3 toWorld(vec3 da) { return vec3(da.x, da.y * uBank.x - da.z * uBank.y, da.y * uBank.y + da.z * uBank.x); }

// The baked sky table: azimuth from the light, then elevation.
// Rows crowd near the eye's horizon, as in sky.js.
vec2 skyUV(vec3 d) {
  float el = asin(clamp(d.y, -1.0, 1.0));
  vec2 h = d.xz; float lh = length(h);
  float ph = lh > 1e-5 ? acos(clamp(dot(h / lh, uSunAz), -1.0, 1.0)) : 0.0;
  float v = el >= uHorEl ? 0.5 + 0.5 * sqrt((el - uHorEl) / (0.5 * PI - uHorEl)) : 0.5 - 0.5 * sqrt((uHorEl - el) / (0.5 * PI + uHorEl));
  return vec2(ph / PI, v);
}
`;

/* ---------- pass 1: the outside ---------- */
export const outsideFS = ({ ALT, WIN, MAXCELL, MAXFL }) => `#version 300 es
precision highp float;
precision highp sampler3D;
${common({ ALT, WIN })}
uniform vec2 uRes, uOutRes; uniform float uTime, uTowns, uFocal, uCover, uFlash, uCirrus;
uniform int uDeckSteps, uTowSteps, uTowOct, uLightSteps; uniform float uTowStep, uMid, uAurora;
uniform highp sampler3D uNoise;
uniform vec2 uCam;
uniform vec3 uF, uR, uU;
uniform vec3 uAmb, uSun, uSunL, uFloor;
uniform vec3 uWing[4], uLet[4], uWingN, uLetN, uTip; uniform float uStrobe;
uniform vec4 uTw[${MAXCELL}]; uniform vec4 uTwB[${MAXCELL}]; uniform vec4 uTwC[${MAXCELL}]; uniform int uNTw;
uniform vec4 uFl[${MAXFL}];
out vec4 o;

// A ray from the eye hits the sphere at height hl, from above.
float hitLayer(vec3 d, float hl) {
  float b = (R + H) * d.y, c = (H - hl) * (2.0 * R + H + hl), disc = b * b - c;
  return (disc < 0.0 || b > 0.0) ? -1.0 : -b - sqrt(disc);
}
// Both crossings of the shell at height hl, near then far; -1 on a miss.
vec2 shell(vec3 d, float hl) {
  float b = (R + H) * d.y, c = (H - hl) * (2.0 * R + H + hl), disc = b * b - c;
  if (disc < 0.0 || b > 0.0) return vec2(-1.0);
  float q = sqrt(disc);
  return vec2(-b - q, -b + q);
}
// The point's height above the ground, t km along the ray.
float heightAt(vec3 d, float t) { return length(vec3(0.0, R + H, 0.0) + d * t) - R; }

// Aurora: two wavy curtains far out past the window, 95 to 320 km up.
// Each ray meets a curtain sheet once; its height there sets the colour.
// Green glows low, red high, and a violet fringe lines the lower edge.
// Folds seen edge-on glow brightest. soft drops the fine rays, for reflections.
vec3 aurora(vec3 d, float soft) {
  if (uAurora <= 0.0 || d.z < 0.08 || d.y < uHorEl - 0.02) return vec3(0.0);
  vec3 e = vec3(0.0);
  vec2 dh = normalize(d.xz);
  for (int k = 0; k < 2; k++) {
    float z0 = k == 0 ? 400.0 : 560.0, ph = k == 0 ? 0.0 : 2.1, kk = float(k);
    // Find where the ray crosses the wavy sheet, by a few fixed-point steps.
    float t = (z0 - uCam.y) / d.z, x = 0.0, slope = 0.0;
    for (int i = 0; i < 3; i++) {
      x = uCam.x + d.x * t;
      float a1 = x / 850.0 + ph + uTime * 0.008, a2 = x / 230.0 - ph + uTime * 0.021, a3 = x / 70.0 + ph * 3.0 + uTime * 0.05;
      float zc = z0 + 130.0 * sin(a1) + 60.0 * sin(a2) + 18.0 * sin(a3);
      slope = 130.0 / 850.0 * cos(a1) + 60.0 / 230.0 * cos(a2) + 18.0 / 70.0 * cos(a3);
      t = (zc - uCam.y) / d.z;
    }
    if (t <= 0.0) continue;
    float h = length(vec3(0.0, R + H, 0.0) + d * t) - R;
    // The lower edge wanders up and down along the curtain.
    float base = 96.0 + 22.0 * vnoise(vec2(x / 140.0 + uTime * 0.015, 5.0 + kk));
    if (h < base - 4.0 || h > 330.0) continue;
    // Where the sheet turns side-on to the eye, its light piles up: the folds.
    float edgeOn = clamp(1.0 / max(abs(dot(dh, normalize(vec2(-slope, 1.0)))), 0.2), 1.0, 4.0);
    // Rays: fine vertical streaks that slide along the curtain.
    float ray = vnoise(vec2(x / 2.6 + uTime * 0.35, kk * 7.0)) * 0.6 + vnoise(vec2(x / 0.8 - uTime * 0.5, 3.0 + kk)) * 0.4;
    ray = mix(0.55 + 0.9 * ray * ray, 1.0, soft);
    // Slow surges brighten and fade whole stretches of curtain.
    float surge = smoothstep(0.25, 0.8, vnoise(vec2(x / 180.0 - uTime * 0.03, 11.0 + kk)));
    surge *= 0.45 + 0.55 * vnoise(vec2(x / 45.0 + uTime * 0.05, 4.0 + kk));
    float u = h - base;
    vec3 col = vec3(0.12, 1.0, 0.42) * smoothstep(-2.0, 5.0, u) * exp(-max(u - 6.0, 0.0) / (22.0 + 20.0 * surge)) * 1.3;
    col += vec3(1.0, 0.12, 0.25) * 0.1 * exp(-pow((h - 200.0) / 45.0, 2.0));
    col += vec3(0.75, 0.2, 1.0) * 0.7 * smoothstep(-3.0, 0.0, u) * smoothstep(5.0, 1.0, u);
    e += col * ray * surge * edgeOn * (k == 0 ? 1.0 : 0.5);
  }
  return e * uAurora * 0.06;
}

// Sky light along a ray, from the baked table, with the aurora.
vec3 skyL(vec3 d) { return texture(uSkyL, skyUV(d)).rgb + uFloor; }

// Towns: one site per 16 km cell, with a size and a street angle.
// x: town density, y: street angle of the strongest site.
// z: the town light spread wide, as the haze scatters it.
// ang2 and mixW give the second town's street angle and its share,
// so the street grids blend where two towns meet.
vec3 towns(vec2 w, out float ang2, out float mixW) {
  vec2 g = w / 16.0, i = floor(g);
  float T = 0.0, best = 0.0, ang = 0.0, wide = 0.0, second = 0.0;
  ang2 = 0.0;
  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
    vec2 c = i + vec2(x, y);
    vec2 site = (c + 0.15 + 0.7 * hash22(c)) * 16.0;
    float sz = pow(hash12(c + 11.3), 2.6) * uTowns;
    float r = 1.0 + 6.5 * sz;
    vec2 q = w - site;
    float v = (0.3 + sz) * exp(-dot(q, q) / (r * r));
    T += v;
    wide += (0.15 + sz) * sz * exp(-dot(q, q) / (r * r * 6.0));
    float a = hash12(c + 2.7) * 3.1416;
    if (v > best) { second = best; ang2 = ang; best = v; ang = a; }
    else if (v > second) { second = v; ang2 = a; }
  }
  mixW = second / max(best + second, 1e-5);
  // Ragged edges: towns spill along valleys, not in discs.
  T *= 0.45 + 1.1 * fbm(w / 2.2, 3);
  return vec3(T, ang, wide);
}
vec3 towns(vec2 w) { float a, m; return towns(w, a, m); }

// One lamp per cell, at a random spot, lit with chance p.
float lamps(vec2 w, float s, float p, float fw, float seed, out float hue) {
  vec2 gp = w / s, id = floor(gp), f = fract(gp);
  hue = hash12(id + seed + 9.3);
  float on = step(hash12(id + seed), p);
  vec2 at = 0.2 + 0.6 * hash22(id + seed + 3.1);
  float r = max(0.02, fw / s * 0.7);
  vec2 q = f - at;
  float b = 0.012 / (r * r) * exp(-dot(q, q) / (r * r)) * on * (0.5 + hash12(id + seed + 5.5));
  // Far away, lamps blend into their average glow.
  return mix(p * 0.04, b, smoothstep(0.9, 0.25, fw / s));
}

// Street lamps on a block grid turned to the town's own angle.
// s is the block size in km; lamps stand every quarter block along each street.
// Some streets are avenues: brighter and fully lit.
float streets(vec2 w, float ang, float s, float p, float fw, out float hue) {
  vec2 cs = vec2(cos(ang), sin(ang));
  vec2 q = vec2(dot(w, cs), dot(w, vec2(-cs.y, cs.x))) / s;
  hue = hash12(floor(q / 9.0) + 9.3);
  float r = max(0.035, fw / s * 0.7);
  float b = 0.0;
  for (int k = 0; k < 2; k++) {
    vec2 a = k == 0 ? q : q.yx;
    float line = floor(a.y + 0.5), lamp = floor(a.x * 4.0 + 0.5);
    vec2 dd = vec2(a.x - lamp / 4.0, a.y - line);
    float avenue = step(0.82, hash12(vec2(line, float(k) + 5.1)));
    float on = step(hash12(vec2(lamp, line) + float(k) * 13.7), p * (1.0 + avenue));
    float rr = r * (1.0 + avenue * 0.5);
    b += on * (0.6 + 0.7 * avenue) * 0.0035 / (rr * rr) * exp(-dot(dd, dd) / (rr * rr));
  }
  // Far away, lamps blend into their average glow.
  return mix(p * 0.07, b, smoothstep(0.35, 0.08, fw / s));
}
vec3 ground(vec2 w, float fw) {
  vec3 sodium = vec3(1.0, 0.5, 0.16), led = vec3(0.8, 0.88, 1.0);
  // Fields: a patchwork that catches the sky light.
  vec2 fp = floor(vec2(w.x * 1.7 + w.y * 0.4, w.y * 2.4 - w.x * 0.3));
  float parcel = 0.45 + 0.9 * hash12(fp);
  vec3 g = uAmb * 0.005 * parcel * (0.7 + 0.6 * fbm(w / 9.0, 3));
  g += uSunL * 0.004 * parcel * max(uSun.y, 0.0);
  float ang2, mixW;
  vec3 tw = towns(w, ang2, mixW);
  float T = tw.x;
  // The light dome: haze over each town glows from the streets below.
  g += vec3(1.0, 0.55, 0.24) * tw.z * 0.009;
  float dense = smoothstep(0.08, 0.5, T);
  // The town glow: warm haze over the roofs.
  g += sodium * T * 0.013;
  float hue;
  // Streets run on each town's own grid; parks and yards leave dark gaps.
  float blocks = smoothstep(0.25, 0.75, vnoise(w / 0.6 + 3.1));
  float a = 0.0;
  if (dense > 0.005) {
    // Streets bend a little; old towns are never a perfect grid.
    vec2 wq = w + 0.22 * (vec2(vnoise(w / 1.6), vnoise(w / 1.6 + 9.0)) - 0.5);
    float pl = dense * (0.3 + 0.65 * blocks);
    a = streets(wq, tw.y, 0.18, pl, fw, hue);
    // Where two towns meet, their grids cross-fade instead of meeting at a seam.
    if (mixW > 0.08) { float h2; a = mix(a, streets(wq, ang2, 0.18, pl, fw, h2), smoothstep(0.08, 0.5, mixW)); }
  }
  // Districts differ: sodium orange, warm white, or cold LED.
  vec3 lampCol = hue < 0.55 ? sodium : hue < 0.82 ? vec3(1.0, 0.78, 0.5) : led;
  g += lampCol * a;
  // Highways: long white lines between towns, with a few lamps out in the dark.
  vec2 hw = w / 22.0 + 0.9 * vec2(vnoise(w / 30.0), vnoise(w / 30.0 + 7.3));
  float ridge = abs(vnoise(hw) - 0.5);
  float hwW = max(0.02, fw * 0.6) / 22.0;
  float road = exp(-ridge * ridge / (hwW * hwW * 4.0)) * 0.012 / max(0.02, fw * 0.6) * (0.5 + 0.5 * vnoise(w / 3.0));
  g += mix(led, sodium, 0.5) * road * 0.18;
  float rural = lamps(w, 0.9, 0.08 * uTowns, fw, 41.0, hue);
  g += sodium * rural * 0.6;
  return g;
}

// Lightning lights the cloud around each flash from inside.
vec3 flashAt(vec2 w, float dens) {
  float f = 0.0;
  for (int i = 0; i < ${MAXFL}; i++) {
    vec4 l = uFl[i];
    if (l.z <= 0.0) continue;
    vec2 q = w - l.xy;
    f += l.z * exp(-dot(q, q) / (l.w * l.w));
  }
  return vec3(0.72, 0.74, 1.0) * f * (0.1 + dens * 1.5);
}

// Cloud noise: one tiling 3D texture, sampled at a level of detail.
// R holds the base shape; G, B, A hold Worley noise for erosion.
float gFocal1 = 1.0;
// Near, cubic weights between voxels hide the diamond steps of plain blending.
vec4 cnS(vec3 p, float tile) {
  vec3 q = p / tile * 64.0 - 0.5, i = floor(q), f = fract(q);
  f = f * f * (3.0 - 2.0 * f);
  return textureLod(uNoise, (i + f + 0.5) / 64.0, 0.0);
}
vec4 cn(vec3 p, float tile, float lod) {
  if (lod >= 1.0) return textureLod(uNoise, p / tile, lod);
  return mix(cnS(p, tile), textureLod(uNoise, p / tile, lod), smoothstep(0.3, 1.0, lod));
}
// The mip level that matches one pixel's footprint at distance t.
float lodAt(float t, float tile) { return clamp(log2(t / gFocal1 / (tile / 64.0)) + 0.5, 0.0, 6.0); }
// Cover on the map from two flat slices of the volume, about 0.2 to 0.8.
float coverAt(vec2 w, float sc, float z) {
  return textureLod(uNoise, vec3(w / sc, z), 0.0).r * 0.65 + textureLod(uNoise, vec3(w / (sc * 0.37), z + 0.31), 0.0).r * 0.35;
}
// Two Henyey-Greenstein lobes: a strong forward one and a soft back one.
float hg(float mu, float g) { float g2 = g * g; return (1.0 - g2) / pow(1.0 + g2 - 2.0 * g * mu, 1.5); }
float cloudPhase(float mu) { return mix(hg(mu, 0.72), hg(mu, -0.2), 0.35); }

/* The deck: stratocumulus at 1.5 to 3.7 km, fully volumetric. */
const float DECK_LO = 1.45, DECK_HI = 3.8, SIG = 9.0;
// Deck density at p = (map x, height, map z) in km, from 0 to 1.
// fine adds the Worley erosion that frays the edges.
float deckDens(vec3 p, float lod, bool fine) {
  vec2 w = p.xz + vec2(uTime * 0.012, 0.0);
  float c = smoothstep(uCover - 0.1, uCover + 0.14, fbm(mat2(0.8, -0.6, 0.6, 0.8) * w / 26.0, 3) * 1.1 - 0.03);
  if (c <= 0.0) return 0.0;
  float base = 1.55, top = base + 0.7 + 1.5 * c;
  float hgt = smoothstep(base, base + 0.35, p.y) * smoothstep(top, top - 0.5 - 0.6 * c, p.y);
  if (hgt <= 0.0) return 0.0;
  float d = clamp((cn(vec3(w.x, p.y * 1.6, w.y), 7.0, lod).r * hgt - (1.0 - c)) / max(c, 0.05), 0.0, 1.0);
  if (fine && d > 0.0) {
    vec4 e = cn(vec3(w.x, p.y * 1.3, w.y) + vec3(0.0, uTime * 0.003, 0.0), 1.4, lod);
    // Erosion bites the thin edges hardest.
    d = clamp(d - (1.0 - d) * (e.g * 0.625 + e.b * 0.25 + e.a * 0.125) * 0.6, 0.0, 1.0);
  }
  return d;
}
// Optical depth toward the light, in growing steps.
float deckLight(vec3 p, float lod) {
  float od = 0.0, st = 0.15;
  for (int j = 0; j < 6; j++) {
    if (j >= uLightSteps) break;
    p += uSun * st;
    od += deckDens(p, lod + 1.0, false) * st;
    st *= 1.9;
  }
  return od;
}

// A cloud shell segment along the ray, from height hi down to lo.
vec2 shellSeg(vec3 d, float lo, float hi) {
  vec2 top = shell(d, hi), bot = shell(d, lo);
  if (top.x < 0.0) return vec2(-1.0);
  return vec2(top.x, min(bot.x > 0.0 ? bot.x : top.y, top.x + 900.0));
}

// The deck as a volume: light from above through the cloud, town light from below.
// It returns the light it scatters and, in alpha, what it lets through.
vec4 deck(vec3 d) {
  vec2 seg = shellSeg(d, DECK_LO, DECK_HI);
  if (seg.x < 0.0) return vec4(0.0, 0.0, 0.0, 1.0);
  float t0 = seg.x, t1 = seg.y;
  int N = uDeckSteps;
  // Steps start short and grow, so far cloud reaches the horizon.
  float len = t1 - t0;
  float ds = min(len / float(N), 0.45);
  float grow = clamp(pow(max(len / (ds * float(N)), 1.0), 1.7 / float(N)), 1.0, 1.3);
  float t = t0 + ds * fract(52.98 * fract(dot(gl_FragCoord.xy, vec2(0.0671, 0.00584))));
  // Town light under the deck, sampled at both ends of the segment.
  float ua = towns(uCam + d.xz * t0).z, ub = towns(uCam + d.xz * t1).z;
  float mu = dot(d, uSun);
  float phase = cloudPhase(mu);
  // A low sun reaches only the tops that face it.
  float sunK = smoothstep(-0.05, 0.3, uSun.y + 0.1);
  bool lit = dot(uSunL, vec3(1.0)) > 1e-4;
  vec3 col = vec3(0.0), last = vec3(0.0);
  float Tc = 1.0, lastD = 0.0;
  for (int i = 0; i < 40; i++) {
    if (i >= N || t > t1) break;
    vec2 w = uCam + d.xz * t;
    vec3 p = vec3(w.x, heightAt(d, t), w.y);
    float lod = lodAt(t, 7.0);
    float dn = deckDens(p, lod, lod < 3.0);
    if (dn > 0.002) {
      float h01 = clamp((p.y - 1.55) / 2.0, 0.0, 1.0);
      vec3 S = vec3(0.0);
      if (lit) {
        float od = deckLight(p, lod);
        // Beer's law, with a slower tail for light that scatters many times.
        float Tl = max(exp(-SIG * od), 0.5 * exp(-SIG * od * 0.2));
        // Powder: thin edges facing away from the light look dark.
        float powder = 1.0 - exp(-SIG * dn * 0.6);
        S += uSunL * 0.05 * sunK * Tl * phase * mix(1.0, powder, 0.55);
      }
      // Sky light from above; the base sees less of it.
      S += uAmb * 0.026 * (0.3 + 0.7 * h01);
      // Streets light the base; the cloud filters that light as it rises.
      float town = mix(ua, ub, (t - t0) / max(t1 - t0, 1e-3));
      S += vec3(1.0, 0.5, 0.2) * town * 0.022 * exp(-SIG * 0.5 * max(p.y - 1.55, 0.0));
      S += flashAt(w, 1.0) * 0.6 * (0.4 + 0.6 * h01);
      float a = 1.0 - exp(-SIG * dn * ds);
      col += Tc * S * a;
      Tc *= 1.0 - a;
      last = S;
      if (Tc < 0.02) break;
    }
    lastD = dn;
    t += ds;
    ds *= grow;
  }
  // The rest of a long path takes a smooth, far-blurred density and the last light.
  if (Tc >= 0.02 && t < t1) {
    float tm = 0.5 * (t + t1);
    vec2 wm = uCam + d.xz * tm;
    float far = deckDens(vec3(wm.x, heightAt(d, tm), wm.y), 6.0, false);
    float a = 1.0 - exp(-SIG * 0.35 * far * (t1 - t));
    col += Tc * last * a;
    Tc *= 1.0 - a;
  }
  return vec4(col, Tc);
}

/* The mid layer: thin altocumulus at 5.2 to 6.1 km, in cells and rolls. */
float midDens(vec3 p, float lod) {
  vec2 w = p.xz + vec2(uTime * 0.02, 0.0);
  float c = smoothstep(0.66 - uMid * 0.18, 0.86 - uMid * 0.18, fbm(w / 21.0 + 50.0, 3) * 1.1 - 0.03) * step(0.01, uMid);
  if (c <= 0.0) return 0.0;
  float hgt = smoothstep(5.2, 5.45, p.y) * smoothstep(6.1, 5.75, p.y);
  vec4 n = cn(vec3(w.x * 1.0, p.y * 3.0, w.y * 1.6), 3.2, lod);
  return clamp((n.r * hgt - (1.0 - c)) / max(c, 0.05) - (n.b * 0.3), 0.0, 1.0);
}
vec4 midLayer(vec3 d) {
  vec2 seg = shellSeg(d, 5.2, 6.1);
  if (seg.x < 0.0 || uMid <= 0.0) return vec4(0.0, 0.0, 0.0, 1.0);
  float t0 = seg.x, t1 = seg.y;
  const int N = 12;
  float ds = min((t1 - t0) / float(N), 0.8);
  float grow = clamp(pow(max((t1 - t0) / (ds * float(N)), 1.0), 1.7 / float(N)), 1.0, 1.45);
  float t = t0 + ds * fract(0.37 + 52.98 * fract(dot(gl_FragCoord.xy, vec2(0.0671, 0.00584))));
  float phase = cloudPhase(dot(d, uSun));
  float sunK = smoothstep(-0.05, 0.3, uSun.y + 0.15);
  vec3 col = vec3(0.0);
  float Tc = 1.0;
  for (int i = 0; i < N; i++) {
    if (t > t1) break;
    vec2 w = uCam + d.xz * t;
    vec3 p = vec3(w.x, heightAt(d, t), w.y);
    float dn = midDens(p, lodAt(t, 3.2));
    if (dn > 0.002) {
      // Thin cloud: one tap toward the light is enough.
      float Tl = exp(-SIG * 0.6 * midDens(p + uSun * 0.3, lodAt(t, 3.2) + 1.0) * 0.3);
      vec3 S = uSunL * 0.06 * sunK * Tl * phase + uAmb * 0.03;
      float a = 1.0 - exp(-SIG * 0.6 * dn * ds);
      col += Tc * S * a;
      Tc *= 1.0 - a;
    }
    t += ds;
    ds *= grow;
  }
  // Far off, the thin layer melts into the haze instead of banding.
  float fade = exp(-t0 / 200.0);
  return vec4(col * fade, 1.0 - (1.0 - Tc) * fade);
}

/* Cirrus: a thin ice slab at 12.1 to 12.8 km, streaked by the wind. */
vec4 cirrus(vec3 d, vec3 sk) {
  if (uCirrus <= 0.0 || d.y < -0.02) return vec4(0.0, 0.0, 0.0, 1.0);
  // From inside the shells, the ray leaves each one once.
  float b = (R + H) * d.y;
  float ta = -b + sqrt(b * b - ((R + H) * (R + H) - (R + 12.1) * (R + 12.1)));
  float tb = -b + sqrt(b * b - ((R + H) * (R + H) - (R + 12.8) * (R + 12.8)));
  tb = min(tb, ta + 70.0);
  const int N = 5;
  float ds = (tb - ta) / float(N);
  float mu = max(dot(d, uSun), 0.0);
  // Ice crystals: strong forward scatter and the 22 degree halo.
  float ang = acos(clamp(dot(d, uSun), -1.0, 1.0));
  float halo = exp(-pow((ang - 0.384) / 0.012, 2.0)) * 0.6 + exp(-pow((ang - 0.384) / 0.04, 2.0)) * 0.15;
  vec3 light = sk * 1.2 + uAmb * 0.006 + uSunL * 0.05 * (0.4 + 3.0 * pow(mu, 10.0) + halo * 4.0);
  float Tc = 1.0;
  float t = ta + ds * 0.5;
  for (int i = 0; i < N; i++) {
    vec2 w = uCam + d.xz * t + vec2(uTime * 0.03, 0.0);
    // The wind stretches the streaks along one bearing.
    vec2 q = mat2(0.8, -0.6, 0.6, 0.8) * w;
    float y = heightAt(d, t);
    float lod = lodAt(t, 24.0);
    float n = cn(vec3(q.x / 6.0, y * 2.0, q.y), 24.0, lod).r * 0.7 + cn(vec3(q.x / 4.0, y * 3.0, q.y) + 0.5, 6.0, lod).g * 0.3;
    float dn = smoothstep(0.6, 0.84, n) * uCirrus * smoothstep(12.1, 12.3, y) * smoothstep(12.8, 12.6, y);
    Tc *= exp(-0.9 * dn * ds);
    t += ds;
  }
  // Far streaks fade into the horizon glow.
  float a = (1.0 - Tc) * exp(-ta / 220.0);
  return vec4(light * a, 1.0 - a);
}

// skyA turns 1 where the ray reaches open sky, 0 where it hits ground.
vec3 outside(vec3 d, float focal1, out float skyA) {
  gFocal1 = focal1;
  vec2 uv = skyUV(d);
  vec3 L = texture(uSkyL, uv).rgb, T = texture(uSkyT, uv).rgb;
  float tg = hitLayer(d, 0.0);
  if (tg < 0.0) {
    // A tight glow round the sun, finer than the table holds.
    float ang = acos(clamp(dot(d, uSun), -1.0, 1.0));
    vec3 sk = L + uFloor + uSunL * 0.03 * exp(-ang * 22.0) + aurora(d, 0.0);
    // Far deck and mid-layer tops rise above the ground's horizon.
    vec4 cl = deck(d), ml = midLayer(d), ci = cirrus(d, sk);
    // Tops seen above the horizon are hundreds of km off: haze softens them.
    cl.rgb = mix(cl.rgb, sk * (1.0 - cl.a), 0.65);
    ml.rgb = mix(ml.rgb, sk * (1.0 - ml.a), 0.5);
    sk = sk * cl.a + cl.rgb;
    sk = sk * ml.a + ml.rgb;
    sk = sk * ci.a + ci.rgb;
    skyA = cl.a * ml.a * ci.a;
    return sk;
  }
  skyA = 0.0;
  vec2 w = uCam + (vec3(0.0, R + H, 0.0) + d * tg).xz;
  // Ground footprint of one pixel, in km, grows at grazing angles.
  float fw = tg / focal1 / max(-d.y, 0.03);
  vec3 g = ground(w, fw);
  vec4 cl = deck(d);
  g = g * cl.a + cl.rgb;
  vec4 ml = midLayer(d);
  g = g * ml.a + ml.rgb;
  // The air between: the baked view ray dims the ground and adds its glow.
  return g * T + L + uFloor * 0.5;
}

// Tower billows from the cloud noise volume.
float tnoise(vec3 p, int oct) {
  float s = cnS(p, 5.0).r;
  if (oct > 1) { vec4 m = cnS(p + 0.63, 1.7); s = s * 0.65 + (m.g * 0.6 + m.b * 0.4) * 0.35; }
  return s;
}

// Storm towers: true volumes, a column under a sheared anvil.
// uTw: centre xz on the map, radius, top height, all in km.
// uTwB: seed, strength, anvil bearing, town glow under the cell.
// uTwC: flash xyz on the map, flash level.
// The column radius, the anvil radius and the top height.
vec3 towerSize(vec4 a, vec4 b) { return vec3(a.z * 0.36 * (0.55 + 0.45 * b.y), a.z * 1.0 * b.y, a.w); }

// A safe distance to the tower's outer bound, in km; it allows for the billows.
// It follows the column's taper and the anvil's slab, so empty space is skipped.
float towerBound(vec3 p, vec3 sz, vec2 sh) {
  float y = p.y, top = sz.z;
  float rc = sz.x * (0.62 + 0.45 * smoothstep(2.0, 6.5, y) - 0.2 * smoothstep(6.5, top, y));
  float dc = max(length(p.xz) - rc - sz.x * 0.36 - 1.8, max(1.8 - y, y - top - 1.4));
  float ra = length(p.xz - sh * smoothstep(top - 4.0, top, y));
  float k = clamp(ra / max(sz.y, 0.1), 0.0, 1.0);
  float lo = top - 3.4 + 2.6 * k, hi = top + 0.25 - 1.0 * k * k;
  float da = max(ra - sz.y * 1.36 - 1.9, max(lo - 1.3 - y, y - hi - 0.6));
  return min(dc, da);
}

// oct 0 gives the smooth shape alone, for cheap light taps.
float towerDens(vec3 p, vec4 b, vec3 sz, vec2 sh, int oct) {
  float y = p.y, top = sz.z;
  float bl = oct > 0 ? (tnoise(vec3(p.x, p.y * 1.25, p.z) + b.x, oct) - 0.47) * 1.3 : 0.0;
  // The column: narrow at the base, bulging mid-height, cauliflower billows.
  float rc = sz.x * (0.62 + 0.45 * smoothstep(2.0, 6.5, y) - 0.2 * smoothstep(6.5, top, y));
  float big = oct > 0 ? textureLod(uNoise, p / 14.0 + b.x * 0.37, 0.0).r - 0.47 : 0.0;
  float col = smoothstep(0.0, 0.7, rc - length(p.xz) + bl * 3.4 + big * sz.x * 0.7);
  // The overshooting top domes over the core.
  float cap = top + 0.8 * exp(-dot(p.xz, p.xz) / (sz.x * sz.x * 0.5));
  col *= smoothstep(cap + 0.2, cap - 0.6, y + bl * 0.8);
  // The anvil: a slab sheared downwind, thick at the core, thin at its rim.
  // Its underside sags in lumps; its rim frays.
  float ra = length(p.xz - sh * smoothstep(top - 4.0, top, y));
  float k = clamp(ra / max(sz.y, 0.1), 0.0, 1.0);
  float lo = top - 3.4 + 2.6 * k, hi = top + 0.25 - 1.0 * k * k;
  // Broad lobes break the anvil's rim from a circle.
  float lobe = vnoise(p.xz / (sz.y * 0.35 + 1.0) + b.x) - 0.5;
  float anv = smoothstep(0.0, 1.5, sz.y * (1.0 + lobe * 0.7) - ra + bl * 3.5) * smoothstep(lo - 0.4, lo + 0.4, y + bl * 1.6) * smoothstep(hi + 0.2, hi - 0.3, y + bl * 0.5);
  return max(col, anv) * smoothstep(1.8, 3.0, y) * b.y;
}

// Each tower marches only inside its bounding cylinder.
// tEnd stops the march where the ray meets the ground.
vec3 towers(vec3 d, float tEnd, vec3 c, inout float skyA) {
  // Far towers melt into the haze along their own bearing.
  float he = uHorEl - 0.004;
  vec2 hz = normalize(d.xz + 1e-5);
  vec3 haze = skyL(vec3(hz.x * cos(he), sin(he), hz.y * cos(he))) * 0.9;
  vec2 dh = d.xz;
  float a2 = max(dot(dh, dh), 1e-6);
  float mu = max(dot(d, uSun), 0.0);
  float phase = 0.55 + 1.4 * pow(mu, 5.0) + 2.0 * pow(mu, 40.0);
  float sunK = smoothstep(-0.05, 0.3, uSun.y + 0.1);
  float jit = fract(52.98 * fract(dot(gl_FragCoord.xy, vec2(0.0671, 0.00584))));
  for (int i = 0; i < ${MAXCELL}; i++) {
    if (i >= uNTw) break;
    vec4 a = uTw[i], b = uTwB[i], f = uTwC[i];
    vec3 sz = towerSize(a, b);
    vec2 sh = vec2(cos(b.z), sin(b.z)) * a.z * 0.55 * b.y;
    // The ray against a cylinder round both column and anvil.
    vec2 Cb = a.xy - uCam + sh * 0.5;
    float Rb = max(sz.x * 1.45 + 1.8, sz.y * 1.36 + 1.9) + length(sh) * 0.5 + 0.5;
    float bq = dot(dh, Cb), cq = dot(Cb, Cb) - Rb * Rb, disc = bq * bq - a2 * cq;
    if (disc <= 0.0) continue;
    float sq = sqrt(disc);
    float t0 = max((bq - sq) / a2, 0.0), t1 = min((bq + sq) / a2, tEnd);
    if (t1 <= t0) continue;
    vec3 pf = vec3(f.x - a.x, f.y, f.z - a.y);
    vec3 col = vec3(0.0);
    float Tc = 1.0, t = t0 + uTowStep * jit, tIn = -1.0;
    for (int k = 0; k < 96; k++) {
      if (k >= uTowSteps || t > t1) break;
      vec2 w = uCam + dh * t;
      vec3 p = vec3(w.x - a.x, heightAt(d, t), w.y - a.y);
      // Outside the bound, skip ahead by the safe distance.
      float bd = towerBound(p, sz, sh);
      if (bd > 0.0) { t += max(bd, uTowStep); continue; }
      float dn = towerDens(p, b, sz, sh, uTowOct);
      // Empty space near the cloud takes longer steps.
      if (dn <= 0.003) { t += uTowStep * 1.5; continue; }
      {
        if (tIn < 0.0) tIn = t;
        // One smooth tap toward the light gives its shadow inside the cloud.
        float Tl = exp(-2.9 * towerDens(p + uSun * 1.2, b, sz, sh, 0));
        float h01 = clamp((p.y - 2.0) / (sz.z - 2.0), 0.0, 1.0);
        vec3 S = uSunL * 0.08 * sunK * Tl * phase;
        S += uAmb * 0.026 * (0.3 + 0.7 * h01) * (0.4 + 0.6 * Tl);
        // Streets under the cell light its base orange.
        S += vec3(1.0, 0.5, 0.2) * b.w * 0.05 * exp(-(p.y - 2.0) / 1.5);
        // Lightning lights the volume from inside.
        vec3 q = p - pf;
        S += vec3(0.72, 0.74, 1.0) * f.w * 1.6 * exp(-length(q) / 1.8);
        float al = 1.0 - exp(-2.6 * dn * uTowStep);
        col += Tc * S * al;
        Tc *= 1.0 - al;
        if (Tc < 0.05) break;
      }
      t += uTowStep;
    }
    if (tIn < 0.0) continue;
    float fog = 1.0 - exp(-tIn / 160.0);
    col = col * (1.0 - fog) + haze * (1.0 - Tc) * fog;
    c = c * Tc + col;
    skyA *= Tc;
  }
  return c;
}

// A ray hits a flat convex quad: the wing or its winglet.
// Returns the hit distance, or -1; uv gives chord and span from 0 to 1.
float quad(vec3 d, vec3 v[4], vec3 n, out vec2 uv) {
  float dn = dot(d, n);
  if (abs(dn) < 1e-4) return -1.0;
  float t = dot(v[0], n) / dn;
  if (t <= 0.0) return -1.0;
  vec3 p = d * t;
  // Inside a convex quad, every edge test has the same sign.
  float s0 = 0.0;
  for (int i = 0; i < 4; i++) {
    vec3 e = v[(i + 1) % 4] - v[i];
    float s = dot(cross(e, p - v[i]), n);
    if (i == 0) s0 = s;
    else if (s * s0 < 0.0) return -1.0;
  }
  // Span runs root to tip; chord runs leading to trailing edge.
  vec3 le = v[1] - v[0];
  float sp = clamp(dot(p - v[0], le) / dot(le, le), 0.0, 1.0);
  vec3 a = mix(v[0], v[1], sp), b = mix(v[3], v[2], sp);
  uv = vec2(clamp(dot(p - a, b - a) / dot(b - a, b - a), 0.0, 1.0), sp);
  return t;
}
// The wing is painted grey; its top mirrors the sky at a grazing angle.
// uv.x runs leading to trailing edge; uv.y runs root to tip.
vec3 wingCol(vec3 d, vec3 n, vec2 uv, float t, float E, float strobe) {
  // A satin finish blurs the mirror toward the horizon glow.
  vec3 r = reflect(d, n);
  vec3 rd = normalize(vec3(r.x, max(r.y, -0.02) * 0.45, r.z));
  // The satin paint blurs the aurora into soft bands.
  vec3 env = skyL(rd) + aurora(rd, 1.0) * 0.5;
  // Grey paint keeps half the sky's colour.
  env = mix(vec3(dot(env, vec3(0.3, 0.5, 0.2))), env, 0.5);
  float fres = 0.05 + 0.6 * pow(1.0 - abs(dot(d, n)), 4.0);
  // Diffuse light from the whole sky dome on grey paint.
  vec3 c = uAmb * 0.03 * (0.85 + 0.3 * uv.y);
  c += env * fres * 0.9;
  // Panel joints run chordwise; spars and the flap seam run spanwise.
  float sp = uv.y * 15.0;
  c *= 1.0 - 0.25 * smoothstep(0.03, 0.0, abs(fract(sp) - 0.5) - 0.47);
  c *= 1.0 - 0.3 * smoothstep(0.008, 0.0, abs(uv.x - 0.24));
  c *= 1.0 - 0.5 * smoothstep(0.01, 0.0, abs(uv.x - 0.7));
  c *= 0.92 + 0.16 * vnoise(vec2(uv.x * 8.0, uv.y * 60.0));
  // The leading edge is round, so it catches a bright line of sky.
  c += env * 1.4 * smoothstep(0.045, 0.0, uv.x);
  // The trailing edge thins to a dark line.
  c *= 1.0 - 0.6 * smoothstep(0.95, 1.0, uv.x);
  // The cabin windows throw warm pools on the wing near the root.
  float row = smoothstep(0.1, 0.02, uv.y) * smoothstep(0.0, 0.015, uv.y);
  float pane = smoothstep(0.3, 0.12, abs(fract(uv.x * 14.0) - 0.5));
  c += vec3(1.0, 0.72, 0.42) * 0.01 * row * pane;
  // The nav light and the strobe light the wing near the tip.
  vec3 tp = d * t - uTip;
  c += vec3(1.0, 0.08, 0.05) * exp(-dot(tp, tp) / 0.8) * 0.02 + vec3(0.9, 0.95, 1.0) * exp(-dot(tp, tp) / 4.0) * strobe * 0.3;
  c += vec3(0.72, 0.74, 1.0) * E * 0.25;
  return c;
}

void main() {
  // Pass 1 pixels map onto full-size screen pixels.
  vec2 px = gl_FragCoord.xy * uRes / uOutRes;
  vec3 da = normalize(uF * uFocal + uR * (px.x - uRes.x * 0.5) + uU * (px.y - uRes.y * 0.5));
  // Only rays that pass the skin opening pay for the outside.
  if (da.z <= 0.0 || sdBox(at(da, Z_OUT), SKIN, RSK) > 0.008) { o = vec4(0.0); return; }
  vec3 d = toWorld(da);
  float E = 0.004 + uFlash * 0.07;
  float skyA;
  vec3 c = outside(d, uFocal * uOutRes.x / uRes.x, skyA);
  float tg = hitLayer(d, 0.0);
  c = towers(d, tg > 0.0 ? tg : 1e4, c, skyA);
  vec2 uv, uv2;
  float tw = quad(d, uWing, uWingN, uv);
  if (tw > 0.0) { c = wingCol(d, uWingN, uv, tw, E, uStrobe); skyA = 0.0; }
  float tl = quad(d, uLet, uLetN, uv2);
  if (tl > 0.0 && (tw < 0.0 || tl < tw)) { c = wingCol(d, uLetN, uv2.yx, tl, E, uStrobe) * 0.8; skyA = 0.0; }
  o = vec4(c, skyA);
}`;

/* ---------- pass 2: cabin, frame and glass ---------- */
export const cabinFS = ({ ALT, WIN }) => `#version 300 es
precision highp float;
${common({ ALT, WIN })}
uniform vec2 uRes; uniform float uTime, uDpr, uFocal, uFlash, uDimE, uDimC;
uniform vec3 uF, uR, uU;
uniform int uSteps;
uniform sampler2D uOut;
uniform vec3 uGlow, uSun, uDisc, uTint, uTip; uniform float uSunR, uSquash, uMoon, uStars, uStrobe;
uniform vec4 uFlr[4]; uniform vec3 uFlrC[4];
out vec4 o;

// Stars hold still; they fade toward the horizon glow.
vec3 stars(vec3 d) {
  vec2 sp = vec2(atan(d.x, d.z) * 160.0, d.y * 160.0);
  vec2 si = floor(sp), sf = fract(sp) - 0.5;
  float st = step(0.985, hash12(si)) * exp(-dot(sf, sf) * 40.0) * smoothstep(0.02, 0.3, d.y - uHorEl);
  return vec3(0.8, 0.85, 1.0) * st * (0.2 + hash12(si + 3.0)) * 0.12 * uStars;
}

// The sun or moon disc, dimmed and reddened by the air along the ray.
vec3 disc(vec3 d) {
  if (dot(d, uSun) < cos(uSunR * 10.0)) return vec3(0.0);
  vec3 e = normalize(cross(vec3(0.0, 1.0, 0.0), uSun)), n = cross(uSun, e);
  // Refraction squashes the disc near the horizon.
  vec2 q = vec2(dot(d, e), dot(d, n) / uSquash) / uSunR;
  float r = length(q);
  float aa = 1.2 / (uFocal * uSunR);
  float body = smoothstep(1.0 + aa, 1.0 - aa, r);
  float mu = sqrt(max(0.0, 1.0 - r * r));
  vec3 c;
  if (uMoon > 0.5) {
    // Faint maria, and a soft halo of ice haze.
    float maria = smoothstep(0.42, 0.62, fbm(q * 1.6 + 4.0, 4)) * 0.3 + 0.08 * vnoise(q * 9.0);
    c = uDisc * (1.0 - maria) * (0.88 + 0.12 * mu) * body;
    c += uDisc * 0.035 * exp(-max(r - 1.0, 0.0) * 0.9) * (1.0 - body);
  } else {
    // Limb darkening: the edge of the sun looks dimmer and redder.
    c = uDisc * vec3(1.0 - 0.5 * (1.0 - mu), 1.0 - 0.62 * (1.0 - mu), 1.0 - 0.75 * (1.0 - mu)) * body;
  }
  return c * texture(uSkyT, skyUV(d)).rgb;
}

vec3 glass(vec3 da, vec2 px) {
  vec4 out1 = texture(uOut, px / uRes);
  vec3 view = out1.rgb;
  vec3 d = toWorld(da);
  // Point sources draw at full size; pass 1 says where sky shows.
  if (out1.a > 0.001) view += out1.a * (stars(d) + disc(d));
  // The red nav light: a hot core and a soft halo.
  float ang = acos(clamp(dot(d, normalize(uTip)), -1.0, 1.0)) * uFocal / uDpr;
  view += vec3(1.0, 0.06, 0.04) * (exp(-ang * ang / 3.0) * 1.5 + exp(-ang / 14.0) * 0.05);
  view += vec3(0.9, 0.95, 1.0) * uStrobe * (exp(-ang * ang / 5.0) * 4.0 + exp(-ang / 40.0) * 0.12);
  return view;
}

// Fine scratches on the scratch pane, pG in metres.
// A scratch glints when it runs across the line to a bright source.
// So the glints ring each source in arcs.
vec3 scratches(vec2 pG, vec2 px) {
  vec3 s = vec3(0.0);
  float fw = max(fwidth(pG.x), 1e-6);
  for (int l = 0; l < 2; l++) {
    float cs = l == 0 ? 0.006 : 0.0105;
    vec2 g = pG / cs + float(l) * 17.3;
    vec2 id = floor(g), f = fract(g) - 0.5;
    if (hash12(id + 3.1) > 0.22) continue;
    float a = hash12(id) * PI;
    vec2 t = vec2(cos(a), sin(a));
    float along = dot(f, t), across = dot(f, vec2(-t.y, t.x));
    float line = smoothstep(fw / cs * 1.3, 0.0, abs(across)) * smoothstep(0.5, 0.25, abs(along));
    if (line <= 0.0) continue;
    for (int i = 0; i < 4; i++) {
      vec4 fl = uFlr[i];
      if (fl.z <= 0.0) continue;
      vec2 r = px - fl.xy;
      float dist = length(r);
      float al = dot(r / max(dist, 1.0), t);
      s += uFlrC[i] * fl.z * line * exp(-al * al * 90.0) * exp(-dist / (uRes.y * 0.1)) * 0.22;
    }
  }
  return s;
}
// A faint ghost of each bright source, bounced between the panes.
vec3 ghosts(vec2 px) {
  vec3 s = vec3(0.0);
  for (int i = 0; i < 4; i++) {
    vec4 fl = uFlr[i];
    if (fl.z <= 0.0) continue;
    vec2 at2 = fl.xy + (fl.xy - uRes * 0.5) * 0.07 + vec2(0.0, -uRes.y * 0.012);
    float gr = length(px - at2) / (fl.w * uRes.y * 0.01 + 2.0 * uDpr);
    s += uFlrC[i] * fl.z * exp(-gr * gr) * 0.2;
  }
  return s;
}
// Ice crystals grow up from the bottom edge of the outer pane.
// edge: the distance inside the skin opening, in metres.
float ice(vec2 pO, float edge) {
  float grow = 0.02 * (0.4 + fbm(pO * 55.0, 3)) * smoothstep(-0.01, -0.12, pO.y);
  if (grow <= 0.001 || edge > grow) return 0.0;
  vec2 q = pO * 900.0;
  // Ridged noise gives the feathered, branching look of frost.
  float rid = (1.0 - abs(2.0 * vnoise(q) - 1.0)) * 0.6 + (1.0 - abs(2.0 * vnoise(q * 2.7 + 5.0) - 1.0)) * 0.4;
  return smoothstep(0.5, 0.85, rid + 0.7 * (1.0 - edge / grow) - 0.35) * smoothstep(grow, grow * 0.4, edge);
}

// Lens flare, after Buoy Business (see Beach walker): haze, orb,
// an anamorphic streak and warm ghosts on the line through the centre.
// uFlr: source xy in pixels, gain times cover, size. uFlrC: colour.
vec3 flare(vec2 px, vec3 base) {
  const vec3 ORANGE = vec3(1.0, 0.42, 0.1);
  vec2 uv = px / uRes;
  float aspect = uRes.x / uRes.y;
  vec3 add = vec3(0.0);
  for (int i = 0; i < 4; i++) {
    vec4 f = uFlr[i];
    if (f.z <= 0.0) continue;
    vec3 col = uFlrC[i];
    vec2 sp = f.xy / uRes;
    vec2 d = (uv - sp) / f.w;
    float ax = d.x * aspect, ay = d.y;
    // A wide veil of haze and a soft orb, squashed sideways.
    float r = length(vec2(ax * 0.6, ay));
    vec3 a = col * (0.025 * exp(-r * 1.5) + 0.08 * exp(-r * 5.0) + 0.4 * exp(-r * 22.0));
    // The streak grows with its source, in three nested bands.
    float line = 0.9 * exp(-abs(ay) * 34.0) + 0.3 * exp(-abs(ay) * 9.0) + 0.07 * exp(-abs(ay) * 2.6);
    a += mix(col, vec3(0.85, 0.8, 1.0), 0.25) * line * exp(-abs(ax) / (0.3 * f.w));
    // Ghosts sit on the line from the source through the frame centre.
    vec2 toC = vec2(0.5) - sp;
    for (int k = 0; k < 4; k++) {
      vec3 gs = k == 0 ? vec3(0.7, 0.05, 0.9) : k == 1 ? vec3(1.4, 0.09, 0.6) : k == 2 ? vec3(2.2, 0.15, 0.4) : vec3(-0.45, 0.03, 0.5);
      vec2 g = (uv - (sp + toC * gs.x)) * vec2(aspect, 1.0);
      float gr = length(g) / (gs.y * f.w);
      a += mix(col, col * ORANGE, 0.4) * exp(-gr * gr) * gs.z * 0.12;
    }
    add += a * f.z;
  }
  // Screen blend: the flare washes the frame instead of clipping it.
  vec3 c = 1.0 - (1.0 - base) * (1.0 - min(add, 1.0));
  // The lens darkens toward the corners.
  vec2 vq = (uv - 0.5) * vec2(aspect, 1.0);
  return c * mix(1.0, 0.6, smoothstep(0.3, 1.0, length(vq)));
}

void main() {
  vec2 px = gl_FragCoord.xy;
  // The camera ray, in the cabin frame.
  vec3 da = normalize(uF * uFocal + uR * (px.x - uRes.x * 0.5) + uU * (px.y - uRes.y * 0.5));
  float E = 0.004 + uFlash * 0.07;
  vec3 eCol = mix(vec3(1.0, 0.86, 0.72), vec3(0.75, 0.8, 1.0), clamp(uFlash * 3.0, 0.0, 1.0));
  // Warm cabin light, low and dim, for a night flight.
  vec3 cabin = vec3(0.016, 0.012, 0.0095);
  vec3 outGlow = uGlow * 0.014 + eCol * E;
  float alb = 0.5;
  // Cabin light falls from above and a little aft.
  vec3 Lc = normalize(vec3(-0.3, 0.85, -0.45));

  vec2 p0 = da.z > 0.0 ? at(da, 0.0) : vec2(9.0);
  float sOut = sdBox(p0, OUTB, ROUT);
  // Wall: curved plastic panels, lit from above and by the window.
  float wy = p0.y;
  vec3 wall = alb * cabin * (0.55 + 0.6 * smoothstep(-0.6, 0.5, wy)) * (0.85 + 0.15 * vnoise(p0 * 900.0));
  // A seam between two wall panels gives the plane its slant.
  wall *= 1.0 - 0.35 * smoothstep(0.004, 0.0, abs(p0.x - 0.5));
  wall += alb * outGlow * 0.8 * exp(-max(sOut, 0.0) / 0.07);
  // A soft shadow rings the rim of the recess.
  wall *= 1.0 - 0.4 * exp(-max(sOut, 0.0) / 0.012);
  // The rim rolls over into the wall; its outward face catches the light from above.
  vec2 nR = normalize(p0 - clamp(p0, -(OUTB - ROUT), OUTB - ROUT) + 1e-6);
  float faceUp = max(dot(nR, normalize(Lc.xy)), 0.0);
  float roll = smoothstep(0.0, 0.003, sOut) * smoothstep(0.011, 0.004, sOut);
  wall += alb * cabin * 0.9 * roll * (0.3 + faceUp);
  wall *= 1.0 - 0.35 * smoothstep(0.002, 0.0, abs(sOut - 0.012));
  // A moulded seam joins the bezel to the wall panel.
  float sSeam = sdBox(p0, OUTB + 0.05, ROUT + 0.05);
  wall *= 1.0 - 0.45 * smoothstep(0.0016, 0.0, abs(sSeam));
  wall += alb * cabin * 0.6 * smoothstep(0.0018, 0.0, abs(sSeam - 0.0022)) * (0.2 + faceUp);
  vec3 c = wall;

  if (da.z > 0.0 && sOut < 0.01) {
    // March the recess from the rim to the pane.
    float z0 = 0.0, hit = -1.0;
    for (int i = 1; i <= 32; i++) {
      if (i > uSteps) break;
      float z = DEPTH * float(i) / float(uSteps);
      if (sdRecess(at(da, z), z) > 0.0) { hit = z; break; }
      z0 = z;
    }
    if (hit > 0.0) {
      for (int k = 0; k < 5; k++) { float m = 0.5 * (z0 + hit); if (sdRecess(at(da, m), m) > 0.0) hit = m; else z0 = m; }
    }
    vec3 inner;
    if (hit > 0.0) {
      // Bezel: the tunnel wall faces into the hole and toward the cabin.
      vec2 ph = at(da, hit);
      float k = hit / DEPTH;
      vec2 e = vec2(0.002, 0.0);
      vec2 g2 = normalize(vec2(sdRecess(ph + e.xy, hit) - sdRecess(ph - e.xy, hit), sdRecess(ph + e.yx, hit) - sdRecess(ph - e.yx, hit)) + 1e-6);
      float slope = (OUTB.x - INB.x) / DEPTH;
      vec3 n = normalize(vec3(-g2, -slope));
      float diff = max(dot(n, Lc), 0.0);
      // Sky light through the glass falls on the sill and lower walls.
      float sky = (0.35 + 0.65 * max(-g2.y, 0.0)) * pow(k, 1.5);
      inner = alb * (cabin * (0.25 + 1.3 * diff) + outGlow * 1.6 * sky);
      // The rolled lip at the rim catches the cabin light.
      inner += alb * cabin * 1.2 * smoothstep(0.0, 0.003, hit) * smoothstep(0.01, 0.004, hit) * (0.3 + diff);
      // The corners and the joint to the pane sit in soft shadow.
      vec2 bq = abs(ph) - (mix(OUTB, INB, k) - mix(ROUT, RIN, k));
      float corner = smoothstep(0.0, mix(ROUT, RIN, k) * 0.7, min(bq.x, bq.y));
      inner *= (1.0 - 0.3 * corner) * mix(1.0, 0.55, smoothstep(0.75, 1.0, k));
    } else {
      // Glass: three panes, each at its own depth, so they shift as the head moves.
      vec2 pG = at(da, DEPTH), pI = at(da, Z_IN), pO = at(da, Z_OUT);
      float sSk = sdBox(pO, SKIN, RSK);
      float aaO = fwidth(sSk) * 1.2;
      float sI = sdBox(pI, SKIN + 0.007, RSK + 0.007), aaI = fwidth(sI) * 1.5;
      vec3 view = vec3(0.0);
      if (sSk < aaO) {
        // Through the skin opening: the outside, then ice on the outer pane.
        view = glass(da, px) + ghosts(px);
        float ic = ice(pO, -sSk);
        view = mix(view, view * 1.3 + uGlow * 0.02 + eCol * E * 0.6 + vec3(0.004, 0.0045, 0.005), ic * 0.75);
        // The outer pane's edge glints where it meets the skin.
        view += outGlow * 0.5 * smoothstep(aaO * 2.0, 0.0, abs(sSk + 0.0015));
      }
      if (sSk > -aaO) {
        // Between the panes: the grey rubber gasket, lit through the glass.
        float gk = clamp(sSk / 0.03, 0.0, 1.0);
        vec3 gasket = alb * 0.4 * (cabin * 0.5 + outGlow * (1.5 - gk));
        // The inner pane's edge catches a thin line of light.
        gasket += outGlow * 0.45 * smoothstep(aaI, 0.0, abs(sI));
        view = mix(view, gasket, smoothstep(-aaO, aaO, sSk));
      }
      // The middle pane dims: the tint spreads in from the rim, a little mottled.
      float eIn = smoothstep(0.0, 1.0, clamp(-sSk / 0.12, 0.0, 1.0));
      float dm = mix(uDimE, uDimC, eIn) + (uDimE - uDimC) * (vnoise(pO * 40.0) - 0.5) * 0.6;
      vec3 Tg = exp(-max(dm, 0.0) * vec3(4.6, 3.3, 2.2));
      view = mix(view, view * Tg, smoothstep(aaO, -aaO, sSk));
      // Scratches on the scratch pane ring each bright source.
      view += scratches(pG, px) * Tg;
      // A faint reflection of the lit cabin in the glass.
      view += vec3(0.0018, 0.0015, 0.0012) * smoothstep(0.2, -0.15, pG.x + pG.y * 0.5);
      float bh = length(pG - vec2(0.0, -INB.y * 0.72));
      view = mix(view, vec3(0.0), smoothstep(0.0028, 0.0018, bh) * 0.85);
      inner = view;
    }
    // Soften the step from wall to rim over about a pixel.
    float aa = fwidth(sOut) * 1.2;
    c = mix(wall, inner, smoothstep(aa, -aa, sOut));
  }
  // Each hour carries a small colour grade.
  c *= uTint;
  c = 1.0 - exp(-c * 3.2);
  c = flare(px, c);
  c += (hash12(px + fract(uTime * 7.13) * 911.0) - 0.5) * 0.006;
  c = pow(max(c, 0.0), vec3(1.0 / 2.2));
  // A soft S-curve for contrast, as in Beach walker's grade.
  c = mix(c, c * c * (3.0 - 2.0 * c), 0.3);
  o = vec4(c, 1.0);
}`;
