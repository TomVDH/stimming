// Window seat shaders: two passes on one full-screen quad.
// Pass 1 draws the outside into its own buffer, only behind the glass.
// Pass 2 draws the cabin, the frame and the panes; the glass samples pass 1.

import { GLASS_RAIN } from '../shared/glassrain.js';

export const QUAD_VS = `#version 300 es
in vec2 aPos; void main() { gl_Position = vec4(aPos, 0.0, 1.0); }`;

const W2 = v => `vec2(${v[0].toFixed(4)}, ${v[1].toFixed(4)})`;

// Noise, the window shape and the sky lookup, for both passes.
const common = ({ ALT, WIN }) => `
const float R = 6371.0, H = ${ALT.toFixed(1)};
const float PI = 3.14159265;
// Lightning's colour inside cloud: a cold, slightly violet blue-white.
const vec3 FLASH_C = vec3(0.64, 0.72, 1.0);
uniform vec3 uEye; uniform vec2 uBank;
uniform sampler2D uSkyL, uSkyT; uniform vec2 uSunAz; uniform float uHorEl;
float hash12(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
vec2 hash22(vec2 p) { return vec2(hash12(p), hash12(p + 19.19)); }
float vnoise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash12(i), hash12(i + vec2(1, 0)), f.x), mix(hash12(i + vec2(0, 1)), hash12(i + vec2(1, 1)), f.x), f.y); }
float fbm(vec2 p, int n) { float a = 0.5, s = 0.0; for (int i = 0; i < 10; i++) { if (i >= n) break; s += a * vnoise(p); p = p * 2.03 + 17.1; a *= 0.5; } return s; }

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
// uLit: how strongly street and town lights burn; daylight turns them down.
uniform vec2 uRes, uOutRes; uniform float uTime, uTowns, uLit, uFocal, uCover, uFlash, uCirrus;
uniform int uDeckSteps, uTowSteps, uTowOct, uLightSteps; uniform float uTowStep, uMid, uAurora;
uniform highp sampler3D uNoise;
uniform vec2 uCam;
// Airports: map site xz, then the landing heading's cos and sin.
// uApB: runway half length, twin runway offset, seed, apron size.
uniform vec4 uAp[8], uApB[8];
// Planes on final: point relative to the eye in km, on flag; colour.
uniform vec4 uApp[12], uAppC[12];
// Flashing airport lights: 1, or 0 for reduced motion.
uniform float uBlink;
uniform vec3 uF, uR, uU;
uniform vec3 uAmb, uSun, uSunL, uFloor;
// The wing: six stations of leading and trailing edge, five panel normals.
uniform vec3 uWP[12], uWN[5], uLet[4], uLetN, uTip; uniform float uWS[6], uStrobe;
// Straight leading edge: root x, root z, tip x, tip z; straight trailing edge: root x, tip x.
uniform vec4 uWL; uniform vec2 uWT;
// The engine nacelle as a capsule, and three flap-track fairings as canoes.
// uFairA: the nose and its radius; uFairB: the tail and its radius.
uniform vec3 uNacA, uNacB, uChord, uUpA, uSpan; uniform float uNacR; uniform vec4 uFairA[3], uFairB[3];
uniform vec4 uTw[${MAXCELL}]; uniform vec4 uTwB[${MAXCELL}]; uniform vec4 uTwC[${MAXCELL}]; uniform int uNTw;
// Each cell's type: anvil size, lean, turret spread, decay.
uniform vec4 uTwD[${MAXCELL}];
uniform vec4 uFl[${MAXFL}];
// Trail points live in a 128 by 2 float texture: row 0 point and radius, row 1 colour and shell.
uniform highp sampler2D uTrail; uniform int uTrN;
// The passing jet's body, and the impact's fireball dome.
uniform vec3 uJetF0, uJetF1, uJetW0, uJetW1, uJetT0, uJetT1; uniform float uJetOn;
// The impact's fireball: centre and radius; colour and glow; squash and life.
uniform vec4 uBall, uBallC, uBallS;
// The impact: site xz, shock ring radius, ring strength; then flash light, crater glow.
uniform vec4 uBoom; uniform vec2 uBoomL;
// The storm: haze and cover follow uStorm.
// uFog is the fog bank now.
// uSpr: red sprites high over the storm, as map xz, level, seed.
uniform float uStorm, uFog; uniform vec4 uSpr[2];
// uWisp: the plane's wrapped place in metres, for wing fog.
uniform vec3 uWisp;
// The wingtip nav light: red on the left wing, green on the right.
uniform vec3 uNavC;
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

/* ---------- the land: relief, cover, water and airports ---------- */
// Value noise with its gradient, for hill shading.
vec3 vnoiseD(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f), du = 6.0 * f * (1.0 - f);
  float a = hash12(i), b = hash12(i + vec2(1, 0)), c = hash12(i + vec2(0, 1)), e = hash12(i + vec2(1, 1));
  float k1 = b - a, k2 = c - a, k3 = a - b - c + e;
  return vec3(a + k1 * u.x + k2 * u.y + k3 * u.x * u.y, du * vec2(k1 + k3 * u.y, k2 + k3 * u.x));
}
// A ridge: 1 on the crest, with its gradient.
vec3 ridge(vec3 n) { return vec3(1.0 - abs(2.0 * n.x - 1.0), -2.0 * sign(n.x - 0.5) * n.yz); }
// Pixel coverage of a band rw either side of a line.
float band(float x, float rw, float fw) { return clamp((min(x + fw * 0.5, rw) - max(x - fw * 0.5, -rw)) / fw, 0.0, 1.0); }
// Detail at scale sc fades to its mean once a pixel spans it.
float fd(float sc, float fw) { return smoothstep(sc * 0.6, sc * 0.2, fw); }
// The sea: a broad field, open water below SEA. index.html mirrors it.
const float SEA = 0.3;
float seaField(vec2 w) { return vnoise(w / 260.0 + 3.7) * 0.65 + vnoise(mat2(0.8, -0.6, 0.6, 0.8) * w / 95.0 + 1.3) * 0.35; }

// Set by landBase for landCover: the water share, the open sea share.
float gWater = 0.0, gSea = 0.0;
// The nearest airport, and the pixel in its runway frame.
int gAp = -1; vec2 gApQ = vec2(1e3);

// The bare land under the lights: fields, woods, hills and snow.
vec3 landBase(vec2 w, float fw) {
  float apD = 1e3;
  gAp = -1;
  for (int i = 0; i < 8; i++) {
    if (uApB[i].x <= 0.0) continue;
    vec4 a = uAp[i];
    vec2 q = w - a.xy;
    float d2 = dot(q, q);
    if (d2 < apD * apD) { apD = sqrt(d2); gAp = i; gApQ = vec2(dot(q, a.zw), dot(q, vec2(-a.w, a.z))); }
  }
  vec2 wr = mat2(0.8, -0.6, 0.6, 0.8) * w;
  // Regions over tens of km: hill country, wooded belts, wet lowland.
  float relief = smoothstep(0.4, 0.8, vnoise(w / 85.0 + 7.1));
  float woods = vnoise(wr / 55.0 + 2.3), wet = vnoise(w / 70.0 - 4.4);
  // The coast: the broad sea field, frayed into bays and spits.
  float sf = seaField(w) + 0.06 * (vnoise(wr / 9.0) - 0.5) + 0.03 * (vnoise(w / 2.6 + 4.0) - 0.5) * fd(2.6, fw);
  float sa = 0.002 + fw * 0.008;
  gSea = smoothstep(SEA + sa, SEA - sa, sf);
  // The land rises from the shore, never straight out of the sea.
  relief *= smoothstep(SEA, SEA + 0.12, sf);
  // Rivers: contour lines of a warped field, wider in wet country.
  vec2 wq = w + 16.0 * vec2(vnoise(w / 21.0), vnoise(w / 21.0 + 8.3));
  vec3 rv = vnoiseD(wq / 34.0), rt = vnoiseD(wq / 11.0 + 3.0);
  float rd = abs(rv.x - 0.5) * 34.0 / max(length(rv.yz), 0.05);
  float rdt = abs(rt.x - 0.5) * 11.0 / max(length(rt.yz), 0.05);
  float river = max(band(rd, 0.12 * smoothstep(0.3, 0.7, wet), fw), band(rdt, 0.035 * smoothstep(0.45, 0.8, wet), fw));
  // Lakes gather in wet lowland.
  float lk = vnoise(wr / 5.0 + 3.3) * 0.75 + mix(0.5, vnoise(w / 1.4 + 1.1), fd(1.4, fw)) * 0.25;
  float lv = 0.12 + 0.16 * smoothstep(0.35, 0.75, wet) - 0.1 * relief;
  float la = 0.004 + fw * 0.08;
  float lake = smoothstep(lv + la, lv - la, lk);
  // Airports keep their ground dry and flat.
  float calm = smoothstep(4.0, 7.0, apD);
  gWater = max(gSea, max(lake, river) * calm);
  // Hills: two ridge octaves and a low roll; rivers carve the valleys.
  vec3 h1 = ridge(vnoiseD(wr / 13.0 + 1.9)), h2 = ridge(vnoiseD(w / 4.1 + 6.2)), h3 = vnoiseD(wr / 1.3 + 2.8);
  float k2 = fd(4.1, fw) * 0.35, k3 = fd(1.3, fw) * 0.06;
  float valley = 0.3 + 0.7 * smoothstep(0.0, 3.0, rd);
  float hgt = (relief * (h1.x + k2 * h2.x) + k3 * h3.x) * valley;
  vec2 gr = (relief * (h1.yz / 13.0 + k2 * h2.yz / 4.1) + k3 * h3.yz / 1.3) * valley * calm;
  // Woods grow in belts, thickest on the hills.
  float fn = vnoise(wr / 2.7 + 1.7) * 0.7 + mix(0.5, vnoise(w / 0.55 + 4.4), fd(0.55, fw)) * 0.3;
  float fth = 0.78 - 0.4 * woods - 0.3 * relief, fa = 0.03 + fw * 0.15;
  float forest = smoothstep(fth - fa, fth + fa, fn);
  // Fields: a patchwork of pale stubble and dark ploughland.
  vec2 fp = floor(vec2(w.x * 1.7 + w.y * 0.4, w.y * 2.4 - w.x * 0.3));
  float parcel = mix(0.5 + 1.1 * hash12(fp), 1.05, smoothstep(0.15, 0.5, fw));
  float alb = mix(parcel, 0.15, forest);
  // Snow lies on the high ridges.
  alb += 2.2 * smoothstep(0.8, 1.15, hgt);
  if (gAp >= 0) {
    // Inside the fence: mown grass, dark runways, a pale apron.
    vec4 b = uApB[gAp]; vec2 q = gApQ;
    float fence = smoothstep(0.08, 0.0, max(abs(q.x) - b.x - 0.4, max(-0.85 - q.y, q.y - 0.3 - b.y)));
    alb = mix(alb, 1.0, fence);
    float run = band(abs(q.y), 0.03, fw) * step(abs(q.x), b.x);
    if (b.y > 0.0) run = max(run, band(abs(q.y - b.y), 0.03, fw) * step(abs(q.x - 0.5), b.x * 0.75));
    alb = mix(alb, 0.3, run);
    alb = mix(alb, 1.7, band(abs(q.y + 0.5), 0.16, fw) * band(abs(q.x - 0.2 * b.x), 0.55 * b.w, fw));
  }
  // Shading triples the slopes, so relief reads from 11 km.
  vec3 n = normalize(vec3(-3.0 * gr.x, 1.0, -3.0 * gr.y));
  // Steep ground sees less sky; slopes toward the bright side see more.
  vec2 lz = normalize(uSun.xz + 1e-5);
  float skyK = clamp(1.0 - 3.0 * length(gr), 0.4, 1.0) + 0.5 * dot(n.xz, lz);
  vec3 g = uAmb * 0.03 * alb * skyK;
  g += uSunL * 0.1 * alb * max(dot(n, uSun), 0.0);
  return g;
}

// The pixel's ground footprint: view heading xy, then along and across radii.
// Each light spreads over this footprint and keeps one pixel's energy.
float foot(vec2 dq, vec4 F) {
  float a = dot(dq, F.xy), c = dot(dq, vec2(-F.y, F.x));
  return exp(-(a * a / (F.z * F.z) + c * c / (F.w * F.w))) / (PI * F.z * F.w);
}
// A row of lights from a0 to a1 along q.x, sp apart, each of energy E.
// Lights closer than a pixel merge into one even line.
float row(vec2 q, float a0, float a1, float sp, float E, vec4 F) {
  vec2 f2 = F.zw * F.zw;
  float rx = sqrt(f2.x * F.x * F.x + f2.y * F.y * F.y), ry = sqrt(f2.x * F.y * F.y + f2.y * F.x * F.x);
  if (abs(q.y) > 3.0 * ry || q.x < a0 - 3.0 * rx || q.x > a1 + 3.0 * rx) return 0.0;
  vec2 dq = vec2(q.x - clamp(floor(q.x / sp + 0.5) * sp, a0, a1), q.y);
  float line = exp(-q.y * q.y / (ry * ry)) / (1.7725 * ry * sp) * clamp((min(q.x + rx, a1) - max(q.x - rx, a0)) / (2.0 * rx), 0.0, 1.0);
  return mix(foot(dq, F), line, smoothstep(0.5, 1.2, rx / sp)) * E;
}
// Airport lights, in the runway frame: x along the landing heading, y across.
vec3 airport(vec2 q, vec4 b, vec4 F) {
  if (abs(q.x) > b.x + 1.3 || q.y < -1.0 || q.y > b.y + 0.5) return vec3(0.0);
  vec3 white = vec3(1.0, 0.9, 0.75), green = vec3(0.2, 1.0, 0.45), red = vec3(1.0, 0.1, 0.05), blue = vec3(0.2, 0.35, 1.0);
  vec3 c = vec3(0.0);
  for (int k = 0; k < 2; k++) {
    if (k == 1 && b.y <= 0.0) break;
    vec2 p = k == 0 ? q : vec2(q.x - 0.5, q.y - b.y);
    float L = k == 0 ? b.x : b.x * 0.75;
    // Edge lights; the last 600 m glow amber.
    float e = row(vec2(p.x, abs(p.y) - 0.023), -L, L, 0.06, 1e-3, F);
    c += mix(white, vec3(1.0, 0.7, 0.2), step(L - 0.6, p.x)) * e;
    // The centre line turns red over the last 300 m.
    c += mix(white, red, step(L - 0.3, p.x)) * row(p, -L, L, 0.03, 3e-4, F);
    // Green across the landing end, red across the far end.
    c += green * row(vec2(p.y, p.x + L), -0.03, 0.03, 0.006, 6e-4, F.yxzw);
    c += red * row(vec2(p.y, p.x - L), -0.03, 0.03, 0.006, 2e-4, F.yxzw);
    // The approach lights: a bar every 30 m out to 900 m, and a cross bar.
    float ax = -L - p.x;
    if (ax > -0.05 && ax < 0.95) {
      c += white * row(vec2(ax, p.y), 0.03, 0.9, 0.03, 1.6e-3, F);
      c += white * row(vec2(p.y, ax - 0.3), -0.03, 0.03, 0.006, 4e-4, F.yxzw);
      // The rabbit: one flash runs toward the runway twice a second.
      float ph = fract(uTime * 2.0 + b.z + float(k) * 0.37) * 21.0, kf = floor(ph);
      c += vec3(0.85, 0.9, 1.0) * 0.02 * foot(vec2(ax - 0.9 + kf * 0.03, p.y), F) * exp(-fract(ph) * 3.0) * uBlink;
    }
  }
  // The taxiway: blue edges, a green centre line.
  vec2 tq = vec2(q.x, q.y + 0.2);
  c += blue * row(vec2(tq.x, abs(tq.y) - 0.012), -b.x, b.x, 0.06, 4e-4, F);
  c += green * row(tq, -b.x, b.x, 0.03, 0.8e-4, F);
  // The apron: floodlit concrete under high masts, the terminal behind.
  vec2 aq = vec2(q.x - 0.2 * b.x, q.y + 0.5);
  float hw = 0.55 * b.w;
  float apron = band(abs(aq.x), hw, F.w * 1.6) * band(abs(aq.y), 0.16, F.z * 1.6);
  c += vec3(1.0, 0.82, 0.6) * apron * 0.025;
  vec2 mq = vec2(aq.x - clamp(floor(aq.x / 0.15 + 0.5) * 0.15, -hw, hw), aq.y - 0.13);
  c += vec3(1.0, 0.85, 0.65) * 6e-4 * foot(mq, F);
  c += vec3(1.0, 0.7, 0.4) * row(vec2(aq.x, aq.y + 0.2), -hw, hw, 0.02, 1.2e-4, F);
  // The beacon flashes green, then white, every two seconds.
  float bp = fract(uTime * 0.5 + b.z);
  c += (bp < 0.5 ? green : white) * 4e-3 * foot(vec2(aq.x + hw + 0.05, aq.y + 0.2), F) * exp(-fract(bp * 2.0) * 12.0) * uBlink;
  return c;
}

// Water over the land, then airport lights.
// up is the local vertical at the ground point.
vec3 landCover(vec3 g, float fw, vec3 d, vec3 up) {
  if (gWater > 0.0) {
    vec3 r = reflect(d, up);
    float nv = max(dot(-d, up), 0.05);
    float fres = 0.02 + 0.98 * pow(1.0 - nv, 5.0);
    vec3 wc = (skyL(r) + aurora(r, 1.0) * 0.5) * fres + uAmb * 0.0008 * vec3(0.5, 0.8, 1.0);
    // Ripples spread the light into a glitter path: Beckmann slopes.
    if (dot(uSunL, vec3(1.0)) > 1e-4) {
      vec3 hv = normalize(uSun - d);
      float hz = max(dot(hv, up), 1e-3), m2 = mix(0.004, 0.018, gSea);
      float D = exp(-(1.0 - hz * hz) / (hz * hz * m2)) / (PI * m2 * hz * hz * hz * hz);
      wc += uSunL * 0.014 * fres * D / (4.0 * nv);
    }
    g = mix(g, wc, gWater);
  }
  if (gAp >= 0) {
    vec4 a = uAp[gAp];
    vec2 v = normalize(d.xz + 1e-6);
    float sd = max(-d.y, 0.03);
    g += airport(gApQ, uApB[gAp], vec4(dot(v, a.zw), dot(v, vec2(-a.w, a.z)), max(0.6 * fw, 0.004), max(0.6 * fw * sd, 0.004)));
  }
  return g;
}
// Towns: one site per 16 km cell, with a size from 0 to uTowns.
// Small sites are hamlets; large ones are cities with a core.
vec3 townSite(vec2 c) {
  vec2 h = hash22(c);
  float z = fract(h.x * 17.31 + h.y * 5.13);
  return vec3((c + 0.15 + 0.7 * h) * 16.0, z * sqrt(z) * uTowns);
}
// A slow warp bends towns and roads alike, as valleys and rivers do.
// Nested sines cost less than noise and never repeat at this scale.
vec2 townWarp(vec2 w) {
  return w + 1.2 * vec2(sin(w.y * 0.091 + 1.7 * sin(w.x * 0.063)), sin(w.x * 0.083 + 1.7 * sin(w.y * 0.057)));
}
// Town light under the deck, spread wide as the cloud scatters it.
// It grows with town size; each falls to zero inside 15 km.
float townDome(vec2 w) {
  vec2 i = floor(w / 16.0);
  float g = 0.0;
  for (int k = 0; k < 9; k++) {
    vec3 s = townSite(i + vec2(k % 3 - 1, k / 3 - 1));
    vec2 q = w - s.xy;
    float rd = 2.5 + 9.0 * min(s.z, 1.4);
    g += s.z * sqrt(s.z) * exp(-dot(q, q) / (rd * rd)) * smoothstep(15.0, 9.0, length(q));
  }
  // The scale keeps the deck's mean glow at its approved level.
  return g * 0.83 * uLit;
}

// The town field at one ground point.
// dens: built-up density; dome: haze light; road: distance to the nearest road;
// along: km along that road; rank: its size class; seed: its own number.
// core: nearness to a big town's centre; fade: the road's own fade.
// len, sp, pe: the road's length, and the point's offset across and past it.
// wq: the warped point.
struct Town { float dens, dome, road, along, rank, seed, core, fade, len, sp, pe; vec2 wq; };
// A road from site a to site b; some links are missing.
void roadSeg(inout Town t, vec2 p, vec3 a, vec3 b, float id) {
  if (fract(id * 7.13) > 0.68) return;
  vec2 ab = b.xy - a.xy, ap = p - a.xy;
  float h = clamp(dot(ap, ab) / dot(ab, ab), 0.0, 1.0);
  float d = length(ap - ab * h);
  if (d < t.road) {
    float L = length(ab), u = dot(ap, ab) / L;
    t.road = d; t.along = h * L; t.len = L; t.sp = (ap.x * ab.y - ap.y * ab.x) / L; t.pe = u - clamp(u, 0.0, L);
    t.rank = min(a.z, b.z) + 0.3 * max(a.z, b.z); t.seed = id; t.fade = 1.0;
  }
}
// fw is the pixel's ground footprint; fine detail drops out when it is large.
Town townAt(vec2 w, float fw) {
  vec2 wq = townWarp(w), i = floor(wq / 16.0);
  Town t = Town(0.0, 0.0, 1e3, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, wq);
  vec3 S[9];
  vec3 best = vec3(0.0);
  vec2 bq = vec2(1e3), bc = vec2(0.0);
  for (int k = 0; k < 9; k++) {
    vec3 s = townSite(i + vec2(k % 3 - 1, k / 3 - 1));
    S[k] = s;
    vec2 q = wq - s.xy;
    float d = length(q), win = smoothstep(15.0, 9.0, d);
    // Each town stretches along its own axis, up to twice as long as wide.
    vec2 ax = fract(s.xy * vec2(3.17, 2.71)) - 0.5;
    float qa = dot(q, ax), de2 = d * d - 1.5 * qa * qa;
    // Density falls off fast from the core and slowly through the sprawl.
    float r = 0.4 + 2.3 * s.z;
    float v = (0.3 + s.z) * exp(-sqrt(de2 + 0.02) / r) * win;
    t.dens += v;
    if (v > best.x) { best = vec3(v, s.z, r); bq = q; bc = i + vec2(k % 3 - 1, k / 3 - 1); }
    // The dome reuses the falloff, at twice the reach.
    t.dome += s.z * sqrt(s.z * v);
  }
  // Only roads that touch the centre cell come within 2 km of the point.
  // The site's own random position gives each road its number.
  vec3 id = fract(vec3(S[3].x + S[3].y, S[4].x + S[4].y, S[1].x + S[1].y) * 0.731);
  roadSeg(t, wq, S[3], S[4], id.x);
  roadSeg(t, wq, S[4], S[5], id.y);
  roadSeg(t, wq, S[1], S[4], id.z + 0.31);
  roadSeg(t, wq, S[4], S[7], id.y + 0.31);
  // One diagonal per square, on about half the squares.
  for (int k = 0; k < 4; k++) {
    int c = k + k / 2;
    float d = fract((S[c].x + S[c].y) * 0.731);
    if (d < 0.25) roadSeg(t, wq, S[c], S[c + 4], d + 0.53);
    else if (d < 0.5) roadSeg(t, wq, S[c + 1], S[c + 3], d + 0.53);
  }
  // The nearest road wanders from side to side, but meets each town square on.
  if (t.road < 3.0) {
    float x = t.along / 1.8 + t.seed * 37.0, xf = fract(x);
    float o = mix(hash12(vec2(floor(x), 3.1)), hash12(vec2(floor(x) + 1.0, 3.1)), xf * xf * (3.0 - 2.0 * xf)) - 0.5;
    o *= 0.7 * smoothstep(0.0, 1.5, t.along) * smoothstep(0.0, 1.5, t.len - t.along);
    t.road = length(vec2(t.pe, t.sp - o));
  }
  t.core = best.y * exp(-length(bq) / best.z);
  // Towns spill out along their roads.
  t.dens += exp(-t.road / 0.2) * min(t.dens, 0.7) * 0.9;
  // Villages string along the roads between towns.
  if (t.road < 1.2) t.dens += smoothstep(0.62, 0.88, vnoise(vec2(t.along / 0.9, t.seed * 61.0))) * 0.35 * exp(-t.road / 0.3);
  // Bigger towns add their own radial avenues and a ring road.
  // They fade out into the sprawl; t.fade carries that.
  if (best.y > 0.4 && fw < 0.12) {
    float d = length(bq), hb = hash12(bc + 5.9);
    // Each avenue bends as it runs out from the centre.
    float n = floor(3.0 + 4.0 * hb), a = atan(bq.y, bq.x) + hb * 6.28 + 0.5 * vnoise(vec2(d / 1.6, hb * 40.0));
    float spoke = abs(fract(a * n / 6.2832) - 0.5) * 6.2832 / n * d;
    float own = smoothstep(0.45, 0.75, best.x / t.dens) * smoothstep(0.12, 0.07, fw), f = smoothstep(1.7, 0.2, d / best.z) * own;
    if (spoke < t.road && f > 0.0) { t.road = spoke; t.along = d; t.rank = best.y; t.seed = hb; t.fade = f; }
    float ring = abs(d - best.z * (0.75 + 0.3 * vnoise(wq / 1.3)));
    if (best.y > 0.6 && own > 0.0 && ring < t.road) { t.road = ring; t.along = a * d; t.rank = best.y; t.seed = hb + 0.5; t.fade = 0.6 * own; }
  }
  return t;
}

// Distance to the nearest cell edge, from the two nearest jittered points.
// About a third of the edges stay dark, so blocks merge.
float streetCells(vec2 p) {
  vec2 i = floor(p), f = fract(p), c1 = vec2(0.0), c2 = vec2(0.0);
  float d1 = 9.0, d2 = 9.0;
  for (int k = 0; k < 9; k++) {
    vec2 o = vec2(k % 3 - 1, k / 3 - 1);
    vec2 r = o + 0.1 + 0.8 * hash22(i + o + 31.0) - f;
    float d = dot(r, r);
    if (d < d1) { d2 = d1; c2 = c1; d1 = d; c1 = i + o; } else if (d < d2) { d2 = d; c2 = i + o; }
  }
  return (sqrt(d2) - sqrt(d1)) + step(hash12(c1 + c2 + 0.5), 0.33);
}
// Lamps: one jittered point per cell of s km, lit with chance p.
// h returns the lamp's own random number, for colour and twinkle.
// Far away, lamps blend into their average glow.
float lampField(vec2 w, float s, float p, float fw, float seed, out float h, out float nearK) {
  vec2 id = floor(w / s), f = fract(w / s) - 0.15 - 0.7 * hash22(id + seed);
  h = hash12(id + seed + 4.1);
  float lit = step(hash12(id + seed + 7.7), p);
  float r = max(0.1, fw / s * 0.6);
  nearK = smoothstep(1.0, 0.3, fw / s);
  float b = lit * (0.4 + 1.2 * fract(h * 37.0)) / (r * r) * exp(-dot(f, f) / (r * r));
  return mix(p * PI, b, nearK);
}
// Twinkle: air between plane and ground makes each lamp flicker.
// Far lamps flicker more, through more air.
float twinkle(float h, float fw) {
  return 1.0 + 0.35 * smoothstep(0.006, 0.04, fw) * sin(uTime * (7.0 + 11.0 * h) + h * 60.0);
}
// Lamp colour: sodium orange, LED white, or a few green-white.
// led is this district's share of LED lamps.
vec3 lampCol(float h, float led) {
  vec3 sodium = vec3(1.0, 0.5, 0.16), cool = vec3(0.8, 0.88, 1.0), warm = vec3(1.0, 0.82, 0.58), green = vec3(0.7, 1.0, 0.76);
  if (h < 0.07) return green;
  if (h < 0.07 + led) return fract(h * 13.0) < 0.5 ? cool : warm;
  return sodium;
}
vec3 lampAvg(float led) {
  return vec3(0.7, 1.0, 0.76) * 0.07 + vec3(0.9, 0.85, 0.79) * led + vec3(1.0, 0.5, 0.16) * (0.93 - led);
}

// Coloured, twinkling lamp light from one lamp layer.
vec3 lampLight(vec2 w, float s, float p, float fw, float seed, float led) {
  float h, nearK;
  float b = lampField(w, s, p, fw, seed, h, nearK);
  return mix(lampAvg(led), lampCol(h, led), nearK) * b * mix(1.0, twinkle(h, fw), nearK);
}

// Orange light from the impact, falling off with distance from the site.
vec3 boomLight(vec2 w, float reach) {
  if (uBoomL.x <= 0.0 && uBoomL.y <= 0.0) return vec3(0.0);
  float d2 = dot(w - uBoom.xy, w - uBoom.xy);
  return vec3(1.0, 0.6, 0.32) * uBoomL.x / (1.0 + d2 / (reach * reach));
}
vec3 ground(vec2 w, float fw) {
  // The land under the lights: fields, woods, hills.
  vec3 g = landBase(w, fw);
  // The impact lights the land round it; the crater glows on for minutes.
  g += boomLight(w, 45.0) * 0.25;
  if (uBoomL.y > 0.0) { vec2 cq = w - uBoom.xy; g += vec3(1.0, 0.4, 0.1) * uBoomL.y * 0.6 * exp(-dot(cq, cq) / 3.0); }
  // Everything added after this point is man-made light.
  vec3 gLand = g;
  Town t = townAt(w, fw);
  vec2 wq = t.wq;
  // Districts differ in their share of LED lamps.
  // Old centres have new LED lamps; the sprawl keeps sodium.
  float dn = vnoise(wq / 5.0 + 40.0);
  float led = 0.05 + 0.35 * dn + 0.45 * min(t.core * 2.0, 1.0);
  vec3 avg = lampAvg(led);
  // The light dome: haze over each town, wider and brighter for big towns.
  // It shows through a long, slant path of air, not straight down.
  g += mix(avg, vec3(1.0, 0.55, 0.24), 0.6) * t.dome * 0.008 * smoothstep(0.015, 0.25, fw);
  // Built-up land: parks, rivers and fields break it into ragged patches.
  float lit = 0.0;
  // The finest octave is smaller than a far pixel, so it fades to its mean there.
  if (t.dens > 0.03) {
    vec2 lp = wq / 1.2 + 7.0;
    float n3 = fw < 0.12 ? mix(0.5, vnoise((lp * 2.03 + 17.1) * 2.03 + 17.1), smoothstep(0.12, 0.07, fw)) : 0.5;
    lit = smoothstep(0.1, 0.65, t.dens * (0.3 + 1.4 * (fbm(lp, 2) + 0.125 * n3)));
  }
  if (lit > 0.002) {
    // Streets: edges of irregular cells make blocks of every shape.
    // Lanes: contour lines of noise wander between them.
    // Far away, only their average share is left.
    float web = 0.4;
    if (fw < 0.055) {
      vec2 sb = mat2(-0.47, -0.88, 0.88, -0.47) * wq / 0.09;
      float e = max(1.0 - smoothstep(0.0, 0.12, streetCells(wq / 0.2)), 0.6 * (1.0 - smoothstep(0.0, 0.1, abs(vnoise(sb) - 0.5))));
      web = mix(0.4, e, smoothstep(0.5, 0.15, fw / 0.11));
    }
    // Lamps string along the streets; cores burn brighter than the sprawl.
    float P = lit * (0.4 + 0.6 * web), gain = (0.15 + 1.6 * web) * (0.3 + 0.8 * min(t.dens, 1.2)) * 0.054;
    // Far away, lamps merge into coarser points, so towns stay grainy.
    float lv = clamp(log2(fw / 0.02), 0.0, 6.0), l0 = floor(lv), lf = lv - l0;
    vec3 L = lampLight(wq, 0.035 * exp2(l0), P, fw, 2.3 + l0 * 7.0, led) * (1.0 - lf);
    if (lf > 0.0) L += lampLight(wq, 0.07 * exp2(l0), P, fw, 9.3 + l0 * 7.0, led) * lf;
    g += L * gain;
    // Roofs and the low haze catch some of the street light.
    g += avg * lit * min(t.dens, 1.3) * 0.01;
  }
  // Roads: a faint thread of traffic, lit with lamps through towns and villages.
  float rw = max(0.012, fw * 0.6);
  if (t.road < 0.3 + 4.0 * rw) {
    float line = exp(-t.road * t.road / (rw * rw)) * 0.012 / rw;
    float town = smoothstep(0.08, 0.4, t.dens);
    // Near, the line breaks into lamps every 50 m and moving cars.
    float k = smoothstep(0.6, 0.25, rw / 0.05), dots = line, car = 1.0;
    if (k > 0.0) {
      float la = (fract(t.along / 0.05) - 0.5) * 0.05;
      dots = exp(-(la * la + t.road * t.road) / (rw * rw)) * 0.012 * 0.05 / (1.77 * rw * rw);
      // Cars: one lane each way, about half the slots full.
      float slot = t.along / 0.35 + sign(fract(t.seed * 3.0) - 0.5) * uTime * 0.09;
      float cq = (fract(slot) - 0.5) * 0.35;
      car = step(0.5, hash12(vec2(floor(slot), t.seed * 97.0))) * exp(-(cq * cq) / (rw * rw)) * 0.35 / (1.77 * rw);
    }
    float traffic = 0.03 + 0.6 * min(t.rank * t.rank, 1.0);
    vec3 rc = mix(vec3(1.0, 0.92, 0.8), avg, town);
    g += rc * t.fade * (traffic * (1.0 - town) * mix(0.15 * line, 0.1 * line + 0.08 * line * car, k) + town * 0.18 * mix(line, dots, k));
  }
  // Farms and hamlets: lone lamps, most of them near a road.
  // They cluster by the district noise, so the dark between stays dark.
  float near = exp(-t.road / 0.5);
  float pf = 0.06 * min(uTowns, 1.3) * (0.25 + 1.6 * near) * smoothstep(0.25, 0.65, dn);
  g += lampLight(w, 0.45, pf, fw, 41.0, led) * 0.0016;
  return gLand + (g - gLand) * uLit;
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
  return FLASH_C * f * (0.1 + dens * 1.5);
}

// Cloud noise: one tiling 3D texture, sampled at a level of detail.
// R holds the base shape; G, B, A hold Worley noise for erosion.
float gFocal1 = 1.0;
// What the deck lets through along this pixel's ray; trails below it dim by this.
float gDeckT = 1.0;
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
// Cover on the map from two slices of the volume, about 0.2 to 0.8.
// The slices turn at odd angles and odd scales, so the pattern never repeats.
float coverAt(vec2 w, float sc, float z) {
  vec2 a = mat2(0.825, -0.565, 0.565, 0.825) * w / sc;
  vec2 b = mat2(-0.32, -0.947, 0.947, -0.32) * w / (sc * 0.389);
  return textureLod(uNoise, vec3(a, z), 0.0).r * 0.65 + textureLod(uNoise, vec3(b, z + 0.31), 0.0).r * 0.35;
}
// Two Henyey-Greenstein lobes: a strong forward one and a soft back one.
float hg(float mu, float g) { float g2 = g * g; return (1.0 - g2) / pow(1.0 + g2 - 2.0 * g * mu, 1.5); }
float cloudPhase(float mu) { return mix(hg(mu, 0.72), hg(mu, -0.2), 0.35); }
// The glory: coloured rings round the point opposite the light, on cloud tops.
// th is the angle from that point, in radians; red rings sit outside blue.
// It tints the cloud's colour, so it still reads on a bright white deck.
vec3 glory(float th) {
  float a = th * 57.2958;
  // Small droplets make a wide glory; these rings suit 6 micron drops.
  vec3 r1 = vec3(4.3, 3.7, 3.2), r2 = vec3(7.6, 6.6, 5.7);
  vec3 g = 0.72 + 0.6 * exp(-pow((a - r1) / 0.55, vec3(2.0))) + 0.32 * exp(-pow((a - r2) / 0.75, vec3(2.0)));
  g += 0.7 * exp(-a * a / 2.0);
  return mix(vec3(1.0), g, smoothstep(10.5, 8.5, a));
}
// The plane's own shadow at the glory's heart, t km below along the ray.
// u runs along the flight line, v across it, in radians from the centre.
float planeShadow(vec2 uv, float t) {
  vec2 q = abs(uv * t * 1000.0);
  // Fuselage and wings, in metres.
  float body = step(q.x, 30.0) * step(q.y, 3.0);
  float wing = step(q.y, 30.0) * step(abs(uv.x * t * 1000.0 + 3.0 + q.y * 0.5), 3.5);
  return max(body, wing);
}

/* The deck: stratocumulus at 1.5 to 3.7 km, fully volumetric. */
const float DECK_LO = 1.45, DECK_HI = 3.8, SIG = 9.0;
// In a storm the deck weaves into bands and heaves up.
// gWeave and gSkirt hold both for the current main sample.
// Light taps near it reuse them.
float gWeave = 0.0, gSkirt = 0.0;
// Weaves: long bands along the wind, crossed by a second, finer set.
float weave(vec2 w) {
  vec2 b = mat2(0.94, 0.34, -0.34, 0.94) * w;
  return textureLod(uNoise, vec3(w.x / 55.0, w.y / 9.0, 0.41), 0.0).r * 0.6 + textureLod(uNoise, vec3(b.x / 38.0, b.y / 5.5, 0.67), 0.0).r * 0.4;
}
// The skirt: the deck swells round each tower's base.
float towerSkirt(vec2 w) {
  float k = 0.0;
  for (int i = 0; i < ${MAXCELL}; i++) {
    if (i >= uNTw) break;
    vec4 a = uTw[i], b = uTwB[i];
    if (b.x < 0.0) continue;
    vec2 q = w - a.xy;
    float r = a.z * 0.7;
    k = max(k, b.y * exp(-dot(q, q) / (r * r)));
  }
  return k;
}
// Sets the storm terms for a main deck sample at w.
void deckStorm(vec2 w) {
  if (uStorm <= 0.0) return;
  gWeave = weave(w + vec2(uTime * 0.012, 0.0));
  gSkirt = towerSkirt(w);
}
// Deck billows: round lumps at three sizes, as on the towers.
// The lumps rise slowly, so the tops boil.
float deckBillow(vec2 w, float y, float lod) {
  vec4 m = cn(vec3(w.x * 0.8 - w.y * 0.6, y - uTime * 0.008, w.x * 0.6 + w.y * 0.8), 2.6, lod);
  return m.g * 0.55 + m.b * 0.3 + m.a * 0.15 - 0.48;
}
// Small lumps on the big ones, at an odd scale and angle.
float deckBillowFine(vec2 w, float y, float lod) {
  vec4 m = cn(vec3(w.x * 0.47 + w.y * 0.88, y * 1.1 - uTime * 0.014, w.y * 0.47 - w.x * 0.88) + 3.7, 0.8, lod);
  return m.g * 0.6 + m.b * 0.4 - 0.48;
}
// The last main sample's shape terms, for the crease light.
// gDeckSh: depth inside the smooth dome. gDeckA: lump size. gDeckFb: depth with lumps.
float gDeckSh = 0.0, gDeckA = 1.0, gDeckFb = 0.0;
// Deck density at p = (map x, height, map z) in km, from 0 to 1.
// Each cell is a dome with a flat base; billows break its surface, as on the towers.
// fine adds the small lumps; light taps go without them.
float deckDens(vec3 p, float lod, bool fine) {
  vec2 w = p.xz + vec2(uTime * 0.012, 0.0);
  float cv = coverAt(w, 70.0, 0.13), lift = 0.0;
  if (uStorm > 0.0) {
    // Bands rise as ridges; the skirt peaks at each core.
    float wv = smoothstep(0.35, 0.75, gWeave);
    cv += uStorm * (0.35 * (wv - 0.4) + 0.5 * gSkirt);
    lift = uStorm * (1.8 * wv + 4.6 * gSkirt * gSkirt);
  }
  float c = smoothstep(uCover - 0.1, uCover + 0.14, cv);
  if (c <= 0.0) return 0.0;
  const float base = 1.55;
  // The cell map sets each dome's height; more cover makes bigger, closer cells.
  float cell = cn(vec3(w.x, 3.1, w.y), 7.0, lod).r;
  float loc = clamp((cell - (1.0 - c)) / max(c, 0.05), 0.0, 1.0);
  float top = base - 0.1 + (0.6 + 1.4 * c) * sqrt(loc) + lift;
  // Depth inside, in km: the dome above, the flat base below.
  float sh = min(top - p.y, (p.y - base) * 1.5);
  float A = 0.16 + 0.34 * loc + 0.4 * lift / (lift + 1.0);
  // Even the biggest lump cannot reach this point.
  if (sh < -A * 0.55) return 0.0;
  float fb = sh + A * deckBillow(w, p.y, lod);
  if (fine) fb += A * 0.4 * deckBillowFine(w, p.y, lod);
  gDeckSh = sh; gDeckA = A; gDeckFb = fb;
  // The edge is crisp near; far off it softens with the footprint.
  return smoothstep(0.0, 0.1 + 0.08 * lod, fb);
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

vec3 stormGlow(vec3 d);
// The deck as a volume: light from above through the cloud, town light from below.
// It returns the light it scatters and, in alpha, what it lets through.
vec4 deck(vec3 d) {
  // A storm lifts the deck's ceiling for the heaved tops.
  vec2 seg = shellSeg(d, DECK_LO, DECK_HI + uStorm * 6.0);
  if (seg.x < 0.0) return vec4(0.0, 0.0, 0.0, 1.0);
  float t0 = seg.x, t1 = seg.y;
  int N = uDeckSteps;
  // Steps start short and grow, so far cloud reaches the horizon.
  float len = t1 - t0;
  float ds = min(len / float(N), 0.45);
  float grow = clamp(pow(max(len / (ds * float(N)), 1.0), 1.7 / float(N)), 1.0, 1.3);
  // Plain random jitter: structured jitter ripples on long grazing paths.
  float t = t0 + ds * hash12(gl_FragCoord.xy);
  // Town light under the deck, sampled at both ends of the segment.
  float ua = townDome(uCam + d.xz * t0), ub = townDome(uCam + d.xz * t1);
  float mu = dot(d, uSun);
  float phase = cloudPhase(mu);
  // The glory and the plane's shadow ride the point opposite the light.
  float gTh = acos(clamp(-mu, -1.0, 1.0));
  vec3 gF = normalize(vec3(1.0, 0.0, 0.0) - uSun * uSun.x), gS = cross(-uSun, gF);
  vec2 gUV = vec2(dot(d, gF), dot(d, gS));
  // A low sun reaches only the tops that face it.
  float sunK = smoothstep(-0.05, 0.3, uSun.y + 0.1);
  bool lit = dot(uSunL, vec3(1.0)) > 1e-4;
  // In a storm the deck takes the towers' murk light and their dimmed sun.
  // So deck and towers read as one.
  vec3 murk = uStorm > 0.0 ? stormGlow(vec3(0.0, 1.0, 0.0)) * 1.05 : vec3(0.0);
  float sunStorm = 1.0 - 0.85 * uStorm;
  vec3 col = vec3(0.0), last = vec3(0.0);
  float Tc = 1.0, lastD = 0.0;
  for (int i = 0; i < 40; i++) {
    if (i >= N || t > t1) break;
    vec2 w = uCam + d.xz * t;
    vec3 p = vec3(w.x, heightAt(d, t), w.y);
    float lod = lodAt(t, 7.0);
    deckStorm(w);
    float dn = deckDens(p, lod, lod < 3.0);
    // Light taps overwrite the shape terms, so keep this sample's.
    float dSh = gDeckSh, dA = gDeckA, dFb = gDeckFb;
    if (dn > 0.002) {
      float h01 = clamp((p.y - 1.55) / 2.0, 0.0, 1.0);
      vec3 S = vec3(0.0);
      if (lit) {
        float od = deckLight(p, lod);
        // Beer's law, with a slower tail for light that scatters many times.
        float Tl = max(exp(-SIG * od), 0.5 * exp(-SIG * od * 0.2));
        // Powder: thin edges facing away from the light look dark.
        float powder = 1.0 - exp(-SIG * dn * 0.6);
        S += uSunL * 0.05 * sunK * sunStorm * Tl * phase * mix(1.0, powder, 0.55);
      }
      // Sky light from above; the base sees less of it.
      // Lump crowns catch the sky; creases deep in the dome do not.
      float crease = clamp(0.7 - 1.4 * dSh / max(dA, 0.05), 0.15, 1.2);
      float open = exp(-3.0 * max(dFb, 0.0)) * crease;
      float sky = (0.3 + 0.7 * h01) * (0.3 + 0.9 * open);
      // Murk light is flat, as on the towers: folds and crowns see about the same.
      float hk = clamp((p.y - 1.55) / (2.0 + 3.0 * gSkirt), 0.0, 1.0);
      sky = mix(sky, 0.45 * (0.4 + 0.6 * hk), 0.6 * uStorm);
      S += mix(uAmb * 0.026, murk, uStorm) * sky;
      // Streets light the base; the cloud filters that light as it rises.
      float town = mix(ua, ub, (t - t0) / max(t1 - t0, 1e-3));
      S += vec3(1.0, 0.5, 0.2) * town * 0.04 * exp(-SIG * 0.4 * max(p.y - 1.55, 0.0));
      S += flashAt(w, 1.0) * 0.6 * (0.4 + 0.6 * h01);
      // The impact lights the deck, and its shock ring races out across the tops.
      S += boomLight(w, 70.0) * 0.9 * (0.4 + 0.6 * h01);
      if (uBoom.w > 0.0) { float rr = length(w - uBoom.xy) - uBoom.z; S += vec3(1.0, 0.92, 0.82) * uBoom.w * 0.35 * exp(-rr * rr / 2.5) * h01; }
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
    deckStorm(wm);
    float far = deckDens(vec3(wm.x, heightAt(d, tm), wm.y), 6.0, false);
    float a = 1.0 - exp(-SIG * 0.35 * far * (t1 - t));
    col += Tc * last * a;
    Tc *= 1.0 - a;
  }
  // The glory rings the plane's small shadow on the tops below.
  if (gTh < 0.19 && lit) {
    col *= glory(gTh);
    if (gTh < 0.01) col *= 1.0 - 0.7 * planeShadow(gUV, t0);
  }
  return vec4(col, Tc);
}

/* The mid layer: thin altocumulus at 5.2 to 6.1 km, in cells and rolls. */
// The last mid sample's shape terms, for the crease light.
float gMidSh = 0.0, gMidA = 1.0, gMidFb = 0.0;
// Each cell is a low dome with a flat base; small billows break it, as on the deck.
float midDens(vec3 p, float lod) {
  vec2 w = p.xz + vec2(uTime * 0.02, 0.0);
  float cv = coverAt(w, 55.0, 0.71), lo = 5.25, hi = 6.05;
  // In a storm the mid layer runs in bands along the wind.
  if (uStorm > 0.0) {
    float wv = smoothstep(0.35, 0.75, weave(w * 0.8 + 31.0));
    cv += uStorm * 0.4 * (wv - 0.35);
    lo -= uStorm * 0.7 * wv; hi += uStorm * 0.6 * wv;
  }
  float c = smoothstep(0.66 - uMid * 0.18, 0.86 - uMid * 0.18, cv) * step(0.01, uMid);
  if (c <= 0.0) return 0.0;
  // Small cells in rolls: the cell map is stretched across the wind.
  float cell = cn(vec3(w.x, 1.7, w.y * 1.6), 3.0, lod).r;
  float loc = clamp((cell - (1.0 - c)) / max(c, 0.05), 0.0, 1.0);
  float top = lo - 0.05 + (hi - lo) * sqrt(loc);
  float sh = min(top - p.y, (p.y - lo) * 2.0);
  float A = 0.06 + 0.14 * loc;
  if (sh < -A * 0.55) return 0.0;
  vec4 m = cn(vec3(w.x * 0.8 - w.y * 0.6, p.y * 1.2 - uTime * 0.01, w.x * 0.6 + w.y * 0.8) + 5.3, 0.9, lod);
  float fb = sh + A * (m.g * 0.55 + m.b * 0.3 + m.a * 0.15 - 0.48);
  gMidSh = sh; gMidA = A; gMidFb = fb;
  return smoothstep(0.0, 0.05 + 0.05 * lod, fb);
}
vec4 midLayer(vec3 d) {
  vec2 seg = shellSeg(d, 5.2 - uStorm * 0.7, 6.25 + uStorm * 0.6);
  if (seg.x < 0.0 || uMid <= 0.0) return vec4(0.0, 0.0, 0.0, 1.0);
  float t0 = seg.x, t1 = seg.y;
  const int N = 12;
  float ds = min((t1 - t0) / float(N), 0.8);
  float grow = clamp(pow(max((t1 - t0) / (ds * float(N)), 1.0), 1.7 / float(N)), 1.0, 1.45);
  float t = t0 + ds * hash12(gl_FragCoord.xy + 17.0);
  float phase = cloudPhase(dot(d, uSun));
  float sunK = smoothstep(-0.05, 0.3, uSun.y + 0.15);
  vec3 col = vec3(0.0);
  float Tc = 1.0;
  for (int i = 0; i < N; i++) {
    if (t > t1) break;
    vec2 w = uCam + d.xz * t;
    vec3 p = vec3(w.x, heightAt(d, t), w.y);
    float dn = midDens(p, lodAt(t, 3.0));
    if (dn > 0.002) {
      float mSh = gMidSh, mA = gMidA, mFb = gMidFb;
      // Thin cloud: one tap toward the light is enough.
      float Tl = exp(-SIG * 0.6 * midDens(p + uSun * 0.3, lodAt(t, 3.0) + 1.0) * 0.3);
      // Lump crowns catch the sky; the folds between them do not.
      float open = exp(-6.0 * max(mFb, 0.0)) * clamp(0.7 - 1.4 * mSh / max(mA, 0.03), 0.15, 1.2);
      vec3 S = uSunL * 0.05 * sunK * Tl * mix(1.0, phase, 0.45) + uAmb * 0.03 * (0.35 + 0.9 * open);
      if (uStorm > 0.0) S += stormGlow(vec3(0.0, 1.0, 0.0)) * 0.6 * uStorm;
      float a = 1.0 - exp(-SIG * 0.6 * dn * ds);
      col += Tc * S * a;
      Tc *= 1.0 - a;
    }
    t += ds;
    ds *= grow;
  }
  // Far off, the thin layer melts into the haze instead of banding.
  float fade = exp(-t0 / 140.0);
  return vec4(col * fade, 1.0 - (1.0 - Tc) * fade);
}

/* Cirrus: a thin ice slab at 12.1 to 12.8 km, streaked by the wind. */
vec4 cirrus(vec3 d, vec3 sk) {
  if (uCirrus <= 0.0 || d.y < -0.02) return vec4(0.0, 0.0, 0.0, 1.0);
  // From inside the shells, the ray leaves each one once.
  float b = (R + H) * d.y;
  float ta = -b + sqrt(b * b - ((R + H) * (R + H) - (R + 12.1) * (R + 12.1)));
  float tb = -b + sqrt(b * b - ((R + H) * (R + H) - (R + 12.9) * (R + 12.9)));
  tb = min(tb, ta + 55.0);
  const int N = 8;
  float ds = (tb - ta) / float(N);
  float mu = dot(d, uSun);
  // Ice: a sharp forward lobe and the 22 degree halo round the light.
  float ang = acos(clamp(mu, -1.0, 1.0));
  float halo = exp(-pow((ang - 0.384) / 0.012, 2.0)) * 0.6 + exp(-pow((ang - 0.384) / 0.04, 2.0)) * 0.15;
  float ice = 0.5 + 0.6 * hg(mu, 0.8) * 0.25 + halo * 3.0;
  // Light on the ice: the sun or moon, the sky all round, and its own glow.
  vec3 S = uSunL * 0.045 * ice + uAmb * 0.016 + sk * 0.55;
  vec3 col = vec3(0.0);
  float Tc = 1.0;
  // Mid-step samples: in so thin a layer, jitter shows as grain.
  float t = ta + ds * 0.5;
  for (int i = 0; i < N; i++) {
    vec2 w = uCam + d.xz * t + vec2(uTime * 0.03, 0.0);
    // The wind draws the ice out into long fibres: mares' tails.
    vec2 q = mat2(0.8, -0.6, 0.6, 0.8) * w;
    float y = heightAt(d, t);
    float lod = lodAt(t, 18.0);
    float body = cn(vec3(q.x / 5.0, y * 1.5, q.y), 18.0, lod).r;
    // Far away the fine fibres would only alias; they fade to their mean.
    float fl = lodAt(t, 5.0);
    float fibre = mix(cn(vec3(q.x / 9.0, y * 4.0, q.y * 1.4) + 0.5, 5.0, fl + 0.5).g, 0.47, smoothstep(1.0, 3.0, fl));
    float dn = smoothstep(0.66, 0.88, body * 0.75 + fibre * 0.4) * uCirrus;
    dn *= smoothstep(12.1, 12.35, y) * smoothstep(12.9, 12.6, y);
    float a = 1.0 - exp(-0.45 * dn * ds);
    col += Tc * S * a;
    Tc *= 1.0 - a;
    t += ds;
  }
  // Far fibres fade into the horizon glow.
  float fade = exp(-ta / 110.0);
  return vec4(col * fade, 1.0 - (1.0 - Tc) * fade);
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
    // The air over the impact glows with its light, low on the horizon.
    if (uBoomL.x > 0.0) {
      vec3 bd = normalize(vec3(uBoom.x - uCam.x, 0.0, uBoom.y - uCam.y));
      float ba = acos(clamp(dot(normalize(vec3(d.x, 0.0, d.z)), bd), -1.0, 1.0));
      sk += vec3(1.0, 0.58, 0.32) * uBoomL.x * 0.3 * exp(-ba / 0.3) * exp(-max(d.y - uHorEl, 0.0) / 0.2);
    }
    // Far deck and mid-layer tops rise above the ground's horizon.
    vec4 cl = deck(d), ml = midLayer(d), ci = cirrus(d, sk);
    gDeckT = cl.a;
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
  vec3 P = vec3(0.0, R + H, 0.0) + d * tg;
  vec2 w = uCam + P.xz;
  // Ground footprint of one pixel, in km, grows at grazing angles.
  float fw = tg / focal1 / max(-d.y, 0.03);
  vec4 cl = deck(d), ml = midLayer(d);
  gDeckT = cl.a;
  // Ground under thick cloud never shows, so it costs nothing.
  vec3 g = cl.a * ml.a > 0.002 ? landCover(ground(w, fw), fw, d, normalize(P)) : vec3(0.0);
  g = g * cl.a + cl.rgb;
  g = g * ml.a + ml.rgb;
  // The air between: the baked view ray dims the ground and adds its glow.
  return g * T + L + uFloor * 0.5;
}


/* Storm air: milky haze far off, fog banks close by, sprites up high. */
// The air's own light: the horizon sky, greyed and dimmed.
// Lightning lights the murk from inside.
vec3 stormGlow(vec3 d) {
  vec2 hz = normalize(d.xz + 1e-5);
  float e = uHorEl + 0.03;
  vec3 hc = skyL(vec3(hz.x * cos(e), sin(e), hz.y * cos(e))) * 0.5 + skyL(vec3(0.0, 1.0, 0.0)) * 0.5;
  vec3 air = mix(vec3(dot(hc, vec3(0.3, 0.5, 0.2))), hc, 0.3) * vec3(0.9, 0.96, 1.06) * (0.55 - 0.25 * uStorm);
  // Each flash lights the murk round its bearing, and some everywhere.
  float g = 0.0;
  for (int i = 0; i < ${MAXFL}; i++) {
    vec4 l = uFl[i];
    if (l.z <= 0.0) continue;
    vec3 fd = normalize(vec3(l.x - uCam.x, 5.0 - H, l.y - uCam.y));
    float m = max(dot(d, fd), 0.0);
    // A broad soft swell round the flash bearing, never a hard point.
    // Far flashes stay on the horizon: they barely light the murk round us.
    vec2 fq = (l.xy - uCam) / 50.0;
    g += l.z * (0.08 + 0.7 * pow(m, 6.0) + 0.6 * pow(m, 18.0)) / (1.0 + dot(fq, fq));
    // Inside a fog bank, a flash a few km off lights the whole murk round the plane.
    vec2 fk = (l.xy - uCam) / 4.0;
    g += l.z * uFog * 2.2 / (1.0 + dot(fk, fk));
  }
  return air + FLASH_C * g * 0.02 * max(uStorm, uFog);
}
// How much of the view the fog bank hides, t km out.
// Wisps rush aft past the window as the plane flies through them.
float fogAt(vec3 d, float t) {
  if (uFog <= 0.0) return 0.0;
  // The far veil has no pattern of its own: it thickens and thins as the plane flies on.
  // The near curtains carry all the shape.
  float w = textureLod(uNoise, vec3(uWisp.x / 816.0, 0.31, uTime * 0.01), 0.0).r;
  // Visibility falls from 120 km to under a kilometre in a thick bank.
  float vis = 120.0 * exp(-11.0 * pow(uFog, 1.3)) / (0.35 + 1.3 * w);
  return (1.0 - exp(-min(t, 60.0) / vis)) * smoothstep(0.0, 0.12, uFog);
}
// Storm air over a colour, t km out; sky rays pass 1e4.
// It also dims skyA, so stars and the disc fade too.
vec3 stormAir(vec3 c, vec3 d, float t, inout float skyA) {
  if (uStorm <= 0.0 && uFog <= 0.0) return c;
  vec3 air = stormGlow(d);
  // Haze: the far land fades out; the sky itself turns milky.
  float hz = uStorm * (t > 5e3 ? 0.7 : 1.0 - exp(-t / mix(500.0, 110.0, uStorm)));
  c = mix(c * (1.0 - 0.35 * uStorm), air, hz);
  float scud = 0.0;
  // Scud: loose patches of murk drift between the towers, fixed to the ground.
  // They sit on a layer 4.5 km below the eye, or on the first surface nearer than that.
  if (uStorm > 0.0 && d.y < 0.05) {
    float tp = min(4.5 / max(-d.y, 0.02), t);
    vec2 w = d.xz * tp + uCam;
    float n = textureLod(uNoise, vec3(w / 23.0, uTime * 0.004), 0.0).r * 0.65 + textureLod(uNoise, vec3(w / 7.0, 0.37 + uTime * 0.007), 0.0).g * 0.35;
    scud = smoothstep(0.42, 0.72, n) * uStorm * (1.0 - exp(-tp / 40.0));
    c = mix(c, air * 1.15, scud * 0.55);
    skyA *= 1.0 - scud * 0.55;
  }
  float fa = fogAt(d, t);
  // In fog, the strobe and the nav light bloom into the murk.
  float tip = dot(d, normalize(uTip));
  vec3 fc = air * 1.25 + (vec3(0.9, 0.95, 1.0) * uStrobe * 0.05 + uNavC * 0.6 * 0.004) * exp(-(1.0 - tip) * 60.0);
  c = mix(c, fc, fa);
  skyA *= clamp(1.0 - 2.2 * hz, 0.0, 1.0) * (1.0 - fa);
  return c;
}

// Fog by the wing: layered wisps in the near 30 m.
// The air stands still, so wisps stream aft past the plane.
// tEnd is the distance to the nearest surface, in metres.
// Fog curtains: tall, thin sheets parallel to the cabin, long along the flight line.
// A ray out of the window crosses several, so each veils its own stretch of wing.
// wing3.js repeats this field for the aircraft; keep the two the same.
// Large banks, about wing-sized, swallow whole stretches: the tip goes, the root stays.
float wispDens(vec3 p) {
  float n = textureLod(uNoise, p / vec3(136.0, 30.0, 9.0), 0.0).r * 0.78 + textureLod(uNoise, p / vec3(68.0, 10.0, 3.2) + 0.37, 0.0).g * 0.22;
  float bank = textureLod(uNoise, p / vec3(408.0, 80.0, 26.0) + 0.71, 0.0).b;
  float d = max(smoothstep(0.64 - 0.16 * uFog, 0.78 - 0.14 * uFog, n), smoothstep(0.62 - 0.2 * uFog, 0.76 - 0.2 * uFog, bank) * 0.85);
  return d * smoothstep(0.05, 0.5, uFog);
}
vec3 nearFog(vec3 c, vec3 d, float tEnd) {
  if (uFog <= 0.05) return c;
  float t1 = min(tEnd, 32.0), T = 1.0;
  vec3 air = stormGlow(d) * 1.3, col = vec3(0.0);
  // Sixteen even steps, jittered per pixel; the resolve smooths the grain.
  float dt = (t1 - 0.5) / 16.0, t = 0.5 + dt * hash12(gl_FragCoord.xy + 5.3);
  for (int i = 0; i < 16; i++) {
    if (t >= t1) break;
    float dn = wispDens(d * t + uWisp);
    // The strobe and nav light bloom thickly in fog round the tip.
    float ft = length(d * t - uTip);
    vec3 L = air + (vec3(0.9, 0.95, 1.0) * uStrobe * 3.0 + uNavC * 0.25) * exp(-ft / 6.0);
    float a = 1.0 - exp(-0.22 * dn * min(dt, t1 - t));
    col += T * L * a;
    T *= 1.0 - a;
    t += dt;
  }
  return c * T + col;
}
// Red sprites: brief red glows 50 to 90 km up.
// Tendrils hang under a red crown; their feet turn blue.
vec3 sprites(vec3 d) {
  vec3 e = vec3(0.0);
  float hl = max(length(d.xz), 1e-4);
  vec2 dh = d.xz / hl;
  for (int i = 0; i < 2; i++) {
    vec4 s = uSpr[i];
    if (s.z <= 0.0) continue;
    vec2 C = s.xy - uCam;
    // The ray passes the sprite closest at along km out.
    float along = dot(dh, C);
    if (along <= 0.0) continue;
    float lat = dh.x * C.y - dh.y * C.x;
    float y = H + d.y / hl * along + along * along / (2.0 * R);
    if (y < 35.0 || y > 95.0) continue;
    float f = 0.0;
    for (int k = 0; k < 7; k++) {
      vec2 h = hash22(vec2(s.w, float(k) * 3.7));
      // Tendrils splay out as they fall from the crown.
      float x0 = (h.x - 0.5) * (6.0 + 0.35 * (80.0 - y)), w = 0.25 + 0.6 * h.y;
      float top = 76.0 + 6.0 * h.y, bot = 40.0 + 18.0 * h.x;
      float str = smoothstep(0.3, 0.8, vnoise(vec2((lat - x0) * 3.0, y * 0.15 + s.w + float(k))));
      float fall = smoothstep(bot, bot + 14.0, y) * smoothstep(top + 2.0, top - 4.0, y);
      f += exp(-(lat - x0) * (lat - x0) / (w * w)) * fall * fall * (0.3 + 0.7 * str);
    }
    // The crown: a diffuse red glow that spreads above the tendrils.
    float crown = exp(-(y - 80.0) * (y - 80.0) / 30.0) * exp(-lat * lat / 90.0);
    vec3 col = mix(vec3(0.35, 0.3, 1.0), vec3(1.0, 0.12, 0.22), smoothstep(48.0, 62.0, y));
    e += (col * f + vec3(1.0, 0.18, 0.28) * crown * 0.8) * s.z;
  }
  return e * 0.03;
}

/* Storm towers: cumulonimbus volumes, one per cell. */
// uTw: centre xz on the map, radius, top height, all in km.
// uTwB: seed, strength, anvil bearing, town glow under the cell.
// uTwC: flash xyz on the map, flash level.
// A negative seed marks the impact's mushroom stem.
// The stem keeps its own simple shape.

// Soft union and soft cut of two shape fields.
// k is the blend width.
float smax(float a, float b, float k) { float h = clamp(0.5 + 0.5 * (a - b) / k, 0.0, 1.0); return mix(b, a, h) + k * h * (1.0 - h); }
float smin(float a, float b, float k) { return -smax(-a, -b, k); }
// A 2D capsule: radius r1 at the origin, r2 at (0, h).
float sdUnevenCapsule(vec2 p, float r1, float r2, float h) {
  p.x = abs(p.x);
  float b = (r1 - r2) / h, a = sqrt(1.0 - b * b), k = dot(p, vec2(-b, a));
  if (k < 0.0) return length(p) - r1;
  if (k > a * h) return length(p - vec2(0.0, h)) - r2;
  return dot(p, vec2(a, b)) - r1;
}

// The current storm tower, set once per cell before its march.
// All sizes are in km.
// gRc: core radius. gBase, gTop: cloud base and anvil top.
// gLen: anvil reach downwind. gAx: the downwind bearing.
// gR1, gR2: anvil half-width at the core and at the rim.
// gLean: core drift downwind at the top. gOver: overshoot dome radius.
// gAmp: billow size. gTile: billow noise tile.
// gGrow: density as the cell forms.
// gAnv: how far the anvil has spread.
// gSpread: how far the side turrets stand out. gDecay: how far the column has thinned.
// gRain: the rain shaft's strength.
vec2 gAx; vec3 gSeed;
float gRc, gBase, gTop, gLen, gR1, gR2, gLean, gOver, gAmp, gTile, gGrow, gAnv;
float gHasAnv, gSpread, gDecay, gRain;
vec4 gTur[4];

void setTower(vec4 a, vec4 b, vec4 v) {
  float s = b.y;
  gGrow = smoothstep(0.0, 0.3, s);
  gRc = a.z * 0.36;
  gBase = 2.3;
  // A towering cumulus has no anvil; a decaying cell keeps a wide one.
  gHasAnv = step(0.01, v.x);
  gSpread = v.z; gDecay = v.w;
  gRain = mix(0.25, 1.0 - 0.5 * v.w, gHasAnv);
  // The top climbs first.
  // The anvil spreads once the top meets the tropopause.
  gTop = mix(gBase + 3.5, a.w, smoothstep(0.05, 0.6, s));
  gAnv = smoothstep(0.3, 0.9, s) * gHasAnv;
  gLen = a.z * 1.35 * gAnv * v.x + 0.3;
  gAx = vec2(cos(b.z), sin(b.z));
  gLean = gRc * 0.4 * v.y;
  gR1 = gRc * (0.8 + 0.45 * gAnv);
  gR2 = clamp(gRc * 0.7 + gLen * 0.42, gR1 - gLen * 0.8, gR1 + gLen * 0.8);
  // The overshooting top heaves slowly up and down.
  gOver = gRc * 0.45 * smoothstep(0.5, 1.0, s) * (0.8 + 0.2 * sin(uTime * 0.05 + b.x)) * gHasAnv * (1.0 - v.w);
  gAmp = gRc * 0.4;
  gTile = clamp(gRc * 1.6, 5.0, 11.0);
  gSeed = vec3(b.x * 0.71, b.x * 0.37, b.x * 0.53);
  // The core turret feeds the anvil.
  // Three side turrets stand lower round it.
  // A young cell is narrow; it fattens as it climbs.
  float wide = 0.55 + 0.45 * smoothstep(0.0, 0.6, s);
  for (int j = 0; j < 4; j++) {
    float fj = float(j);
    vec2 h = hash22(vec2(b.x * 1.37 + fj * 7.1, fj * 3.3 + 1.0));
    float ang = h.x * 6.2832, off = j == 0 ? 0.0 : gRc * (0.4 + 0.4 * h.y) * gSpread;
    float rad = j == 0 ? gRc * 0.8 : gRc * (0.4 + 0.22 * hash12(h * 9.1));
    float top = mix(gBase + 3.0, gTop - 3.2, 0.2 + 0.8 * hash12(h + 4.2));
    // In a multicell cluster the side turrets climb nearly as high as the core.
    top = mix(top, gTop - 0.8 - 1.6 * hash12(h + 8.3), clamp(gSpread - 1.0, 0.0, 1.0));
    top = j == 0 ? gTop - 0.4 : mix(gBase + 1.5, top, smoothstep(0.0, 0.8, s));
    gTur[j] = vec4(vec2(cos(ang), sin(ang)) * off * wide, rad * wide, top);
  }
}

// The tower's shape without billows: about the depth inside, in km.
// aw gives the anvil's share of the point, from 0 to 1.
float towerShape(vec3 p, out float aw) {
  float y = p.y;
  float hk = clamp((y - gBase) / (gTop - gBase), 0.0, 1.0);
  // The core leans downwind as it climbs.
  vec2 q = p.xz - gAx * gLean * hk * hk;
  float col = -1e3;
  for (int j = 0; j < 4; j++) {
    vec4 tu = gTur[j];
    // Each turret is a capsule: a near-straight body and a domed head.
    float r = tu.z * (1.0 + 0.12 * (1.0 - hk));
    float dy = y - clamp(y, gBase - 1.0, tu.w - r);
    col = smax(col, r - length(vec2(length(q - tu.xy), dy * 1.25)), gRc * 0.3);
  }
  // The foot: a broad, low swell into the deck.
  // It narrows as it climbs, so the column rises out of it.
  // Lobes break its outline from a circle.
  float lobe = 1.0 + 0.28 * sin(3.0 * atan(q.y, q.x) + gSeed.x) + 0.15 * sin(5.0 * atan(q.y, q.x) - gSeed.y);
  float fr = gRc * mix(2.4, 0.9, smoothstep(gBase + 0.5, gBase + 4.5, y)) * gGrow * lobe * mix(1.0, gSpread, 0.5);
  col = smax(col, min(fr - length(q), (gBase + 4.5 - y) * 0.8), gRc * 0.5);
  // The base is flat.
  col = smin(col, (y - gBase) * 2.0, 0.3);
  // The anvil: a fan that widens downwind.
  // It is flat on top and thins to its rim.
  vec2 a = p.xz - gAx * gLean;
  vec2 uv = vec2(dot(a, vec2(-gAx.y, gAx.x)), dot(a, gAx));
  float k = clamp(uv.y / gLen, 0.0, 1.0);
  // Upwind, the anvil only rounds over the core and thins fast.
  float ku = clamp(-uv.y / gR1, 0.0, 1.0);
  float top = gTop + 0.2 - 0.5 * k * k - 0.8 * ku * ku;
  float bot = top - mix(3.0, 0.25, pow(k, 0.7)) * (0.4 + 0.6 * gAnv) * (1.0 - 0.85 * ku * ku);
  float an = smin(-sdUnevenCapsule(uv, gR1, gR2, gLen), smin(top - y, y - bot, 0.3), 0.8);
  // A young cell has no anvil yet; a towering cumulus never grows one.
  an -= (1.0 - gAnv) * 4.0 + (1.0 - gHasAnv) * 20.0;
  // The overshooting top: a squat dome rooted on the core turret's head.
  float ov = gOver - length(vec3(q.x, (y - gTop + 0.4 + gOver * 0.2) * 1.35, q.y));
  // The overshoot boils like the column, so it takes full billows.
  aw = smoothstep(-0.6, 0.6, an - col) * smoothstep(0.6, -0.6, ov - max(col, an));
  return smax(smax(col, an, 0.9), ov, 1.0);
}
// Cauliflower billows: round Worley lumps at three sizes in one fetch.
// Each tower turns and shifts its sample.
// So no two towers share a pattern.
// The lumps rise slowly, so the tops boil.
float billow(vec3 p, float lod, float aw) {
  p.xz -= gAx * dot(p.xz, gAx) * 0.6 * aw;
  vec3 r = vec3(p.x * 0.8 - p.z * 0.6, p.y - uTime * 0.012, p.x * 0.6 + p.z * 0.8) + gSeed;
  vec4 m = textureLod(uNoise, r / gTile, lod);
  return m.g * 0.55 + m.b * 0.3 + m.a * 0.15 - 0.48;
}
// Small lumps on the big ones, at an odd scale and angle.
float billowFine(vec3 p, float lod, float aw) {
  p.xz -= gAx * dot(p.xz, gAx) * 0.7 * aw;
  vec3 r = vec3(p.x * 0.47 + p.z * 0.88, p.y * 1.1 - uTime * 0.02, p.z * 0.47 - p.x * 0.88) - gSeed.zxy;
  vec4 m = textureLod(uNoise, r / (gTile * 0.29), lod);
  return m.g * 0.6 + m.b * 0.4 - 0.48;
}
// Billow size: full on the column, small on the anvil's top.
float billowAmp(float y, float aw) {
  return gAmp * mix(1.0, mix(0.45, 0.18, smoothstep(gTop - 0.9, gTop + 0.1, y)), aw);
}
// Density for light taps: the shape with the big lumps only.
float towerLightDens(vec3 p, float lod) {
  float aw, sh = towerShape(p, aw), A = billowAmp(p.y, aw);
  if (sh < -A * 0.45 - 0.5) return 0.0;
  return smoothstep(0.0, 0.5, sh + A * billow(p, lod, aw));
}

// The rain shaft: a grey curtain from the base to the ground.
// Four taps integrate it; the deck in front hides it.
vec4 rainShaft(vec3 d, vec2 dh, float a2, vec2 C, float tEnd, vec3 pf, float fl, float glow, vec3 dome) {
  vec2 Cs = C + gAx * gRc * 0.3;
  float rs = gRc * 0.8;
  float bq = dot(dh, Cs), cq = dot(Cs, Cs) - rs * rs, disc = bq * bq - a2 * cq;
  if (disc <= 0.0) return vec4(0.0, 0.0, 0.0, 1.0);
  float sq = sqrt(disc);
  float ta = max((bq - sq) / a2, 0.0), tb = min((bq + sq) / a2, tEnd);
  if (tb <= ta) return vec4(0.0, 0.0, 0.0, 1.0);
  float dt = (tb - ta) * 0.25, od = 0.0;
  vec3 col = vec3(0.0);
  // Rain is grey: the sky's brightness, little of its hue.
  vec3 grey = mix(vec3(dot(dome, vec3(0.3, 0.5, 0.2))), dome, 0.35) * 0.14;
  for (int i = 0; i < 4; i++) {
    float t = ta + dt * (float(i) + 0.5);
    float y = heightAt(d, t);
    vec2 rel = dh * t - Cs;
    float r01 = dot(rel, rel) / (rs * rs);
    // Streaks: noise across the map only, so it runs down in strands.
    vec2 sl = rel + gAx * y * 0.25;
    float str = vnoise(sl * 2.2 + gSeed.xy) * 0.7 + vnoise(sl * 6.0 - gSeed.yx) * 0.3;
    float dn = 0.4 * (1.0 - r01) * smoothstep(0.4, 0.8, str) * smoothstep(gBase + 0.1, gBase - 0.5, y);
    od += dn * dt;
    vec3 q = vec3(rel.x, y, rel.y) - (pf - vec3(Cs.x - C.x, 0.0, Cs.y - C.y));
    col += dn * dt * (grey + vec3(1.0, 0.5, 0.2) * glow * 0.04 + FLASH_C * fl * 0.8 * exp(-length(q) / 5.0));
  }
  float al = (1.0 - exp(-0.5 * od)) * gDeckT * gGrow * gRain;
  return vec4(col / max(od, 1e-4) * al, 1.0 - al);
}

// The impact's mushroom stem: a column under a sheared slab.
float tnoise(vec3 p, int oct) {
  float s = cnS(p, 5.0).r;
  if (oct > 1) { vec4 m = cnS(p + 0.63, 1.7); s = s * 0.65 + (m.g * 0.6 + m.b * 0.4) * 0.35; }
  return s;
}
// The stem radius, the cap radius and the top height.
vec3 stemSize(vec4 a, vec4 b) { return vec3(a.z * 0.36 * (0.55 + 0.45 * b.y), a.z * 1.0 * b.y, a.w); }
// A safe distance to the stem's outer bound, in km; it allows for the billows.
float stemBound(vec3 p, vec3 sz, vec2 sh) {
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
float stemDens(vec3 p, vec4 b, vec3 sz, vec2 sh, int oct) {
  float y = p.y, top = sz.z;
  float bl = oct > 0 ? (tnoise(vec3(p.x, p.y * 1.25, p.z) + b.x, oct) - 0.47) * 1.3 : 0.0;
  float rc = sz.x * (0.62 + 0.45 * smoothstep(2.0, 6.5, y) - 0.2 * smoothstep(6.5, top, y));
  float big = oct > 0 ? textureLod(uNoise, p / 14.0 + b.x * 0.37, 0.0).r - 0.47 : 0.0;
  float col = smoothstep(0.0, 0.7, rc - length(p.xz) + bl * 3.4 + big * sz.x * 0.7);
  float cap = top + 0.8 * exp(-dot(p.xz, p.xz) / (sz.x * sz.x * 0.5));
  col *= smoothstep(cap + 0.2, cap - 0.6, y + bl * 0.8);
  float ra = length(p.xz - sh * smoothstep(top - 4.0, top, y));
  float k = clamp(ra / max(sz.y, 0.1), 0.0, 1.0);
  float lo = top - 3.4 + 2.6 * k, hi = top + 0.25 - 1.0 * k * k;
  float lobe = vnoise(p.xz / (sz.y * 0.35 + 1.0) + b.x) - 0.5;
  float anv = smoothstep(0.0, 1.5, sz.y * (1.0 + lobe * 0.7) - ra + bl * 3.5) * smoothstep(lo - 0.4, lo + 0.4, y + bl * 1.6) * smoothstep(hi + 0.2, hi - 0.3, y + bl * 0.5);
  return max(col, anv) * smoothstep(1.8, 3.0, y) * b.y;
}
// The stem's march; it returns the light and, in alpha, what passes.
vec4 stem(vec3 d, vec2 dh, float t0, float t1, vec4 a, vec4 b, vec4 f, float jit, float phase, float sunK, out float tIn) {
  vec3 sz = stemSize(a, b);
  vec2 sh = vec2(cos(b.z), sin(b.z)) * a.z * 0.55 * b.y;
  vec3 pf = vec3(f.x - a.x, f.y, f.z - a.y);
  vec3 col = vec3(0.0);
  float Tc = 1.0, t = t0 + uTowStep * jit;
  tIn = -1.0;
  for (int k = 0; k < 96; k++) {
    if (k >= uTowSteps || t > t1) break;
    vec2 w = uCam + dh * t;
    vec3 p = vec3(w.x - a.x, heightAt(d, t), w.y - a.y);
    float bd = stemBound(p, sz, sh);
    if (bd > 0.0) { t += max(bd, uTowStep); continue; }
    float dn = stemDens(p, b, sz, sh, uTowOct);
    if (dn <= 0.003) { t += uTowStep * 1.5; continue; }
    if (tIn < 0.0) tIn = t;
    float Tl = exp(-2.9 * stemDens(p + uSun * 1.2, b, sz, sh, 0));
    float h01 = clamp((p.y - 2.0) / (sz.z - 2.0), 0.0, 1.0);
    vec3 S = uSunL * 0.08 * sunK * Tl * phase;
    S += uAmb * 0.026 * (0.3 + 0.7 * h01) * (0.4 + 0.6 * Tl);
    S += vec3(1.0, 0.5, 0.2) * b.w * 0.05 * exp(-(p.y - 2.0) / 9.0);
    // The flash lights the cloud from within: blue-white, soft, reaching about 9 km.
    float fd = length(p - pf);
    S += vec3(0.72, 0.76, 1.0) * f.w * (4.5 * exp(-fd / 3.0) + 1.2 * exp(-fd / 9.0));
    float al = 1.0 - exp(-2.6 * dn * uTowStep);
    col += Tc * S * al;
    Tc *= 1.0 - al;
    if (Tc < 0.05) break;
    t += uTowStep;
  }
  return vec4(col, Tc);
}

// Each tower marches only inside its bounding cylinder, far to near.
// tEnd stops the march where the ray meets the ground.
vec3 towers(vec3 d, float tEnd, vec3 c, inout float skyA) {
  // Far towers melt into the haze along their own bearing.
  float he = uHorEl - 0.004;
  vec2 hz = normalize(d.xz + 1e-5);
  vec3 haze = skyL(vec3(hz.x * cos(he), sin(he), hz.y * cos(he))) * 0.9;
  vec2 dh = d.xz;
  float a2 = max(dot(dh, dh), 1e-6);
  float mu = dot(d, uSun);
  float sunK = smoothstep(-0.05, 0.3, uSun.y + 0.1);
  // The stem keeps its old phase curve.
  float phaseOld = 0.55 + 1.4 * pow(max(mu, 0.0), 5.0) + 2.0 * pow(max(mu, 0.0), 40.0);
  float phase = cloudPhase(mu);
  float jit = fract(52.98 * fract(dot(gl_FragCoord.xy, vec2(0.0671, 0.00584))));
  bool hi = uTowOct > 2;
  // Sky light on the towers: zenith, sun-side glow, far side.
  vec2 sH = normalize(uSun.xz + 1e-5);
  float ce = cos(uHorEl + 0.06), se = sin(uHorEl + 0.06);
  vec3 twi = skyL(vec3(sH.x * ce, se, sH.y * ce));
  vec3 dome = skyL(vec3(0.0, 1.0, 0.0)) * 0.5 + twi * 0.25 + skyL(vec3(-sH.x * ce, se, -sH.y * ce)) * 0.25;
  // In a storm the murk, not the clear sky, lights the towers.
  dome = mix(dome, stormGlow(vec3(0.0, 1.0, 0.0)) * 0.7, uStorm);
  twi *= 1.0 - 0.7 * uStorm;
  for (int i = 0; i < ${MAXCELL}; i++) {
    if (i >= uNTw) break;
    vec4 a = uTw[i], b = uTwB[i], f = uTwC[i];
    vec2 C = a.xy - uCam;
    vec3 pf = vec3(f.x - a.x, f.y, f.z - a.y);
    vec3 col = vec3(0.0);
    float Tc = 1.0, tIn = -1.0;
    bool boom = b.x < 0.0;
    if (boom) {
      vec3 sz = stemSize(a, b);
      vec2 sh = vec2(cos(b.z), sin(b.z)) * a.z * 0.55 * b.y;
      vec2 Cb = C + sh * 0.5;
      float Rb = max(sz.x * 1.45 + 1.8, sz.y * 1.36 + 1.9) + length(sh) * 0.5 + 0.5;
      float bq = dot(dh, Cb), cq = dot(Cb, Cb) - Rb * Rb, disc = bq * bq - a2 * cq;
      if (disc <= 0.0) continue;
      float sq = sqrt(disc);
      float t0 = max((bq - sq) / a2, 0.0), t1 = min((bq + sq) / a2, tEnd);
      if (t1 <= t0) continue;
      vec4 r = stem(d, dh, t0, t1, a, b, f, jit, phaseOld, sunK, tIn);
      col = r.rgb; Tc = r.a;
    } else {
      setTower(a, b, uTwD[i]);
      float deckTop = DECK_HI;
      // The bound: a cylinder round the core, the foot and the whole anvil fan.
      float foot = gRc * 2.5 * max(1.0, gSpread * 0.9);
      float back = max(gR1, foot) + gLean, fwd = max(gLen + gR2, foot - gLean);
      vec2 Cb = C + gAx * (gLean + 0.5 * (fwd - back));
      float Rb = 0.5 * (fwd + back) + gAmp * 0.5 + 0.6;
      float bq = dot(dh, Cb), cq = dot(Cb, Cb) - Rb * Rb, disc = bq * bq - a2 * cq;
      if (disc <= 0.0) continue;
      float sq = sqrt(disc);
      float t0 = max((bq - sq) / a2, 0.0), t1 = min((bq + sq) / a2, tEnd);
      if (t1 <= t0) continue;
      float fBoost = 1.0 + clamp(t0 / 120.0, 0.0, 1.5);
      // The rain shaft lies under the tower, so it goes in first.
      vec4 rs = rainShaft(d, dh, a2, C, tEnd, pf, f.w, b.w, dome);
      c = c * rs.a + rs.rgb;
      // Steps grow with distance, as a pixel's footprint does.
      float st = uTowStep * clamp(t0 / 70.0, 0.75, 2.2);
      float t = t0 + st * jit;
      for (int k = 0; k < 96; k++) {
        if (k >= uTowSteps || t > t1) break;
        vec2 w = dh * t - C;
        vec3 p = vec3(w.x, heightAt(d, t), w.y);
        float aw, sh = towerShape(p, aw);
        float A = billowAmp(p.y, aw);
        // Far outside the shape, even the biggest lump cannot reach: skip ahead.
        float gap = -sh - A * 0.45 - 0.5;
        if (gap > 0.0) { t += max(gap * 0.8, st); continue; }
        float lod = lodAt(t, gTile);
        float fb = sh + A * billow(p, lod, aw);
        if (hi) fb += A * (0.4 + 0.5 * aw) * billowFine(p, lodAt(t, gTile * 0.29), aw);
        // The anvil is ice: far out, it frays to a veil.
        float far = aw * smoothstep(0.0, gLen + gR2, dot(p.xz, gAx));
        fb -= far * 0.6;
        // A decaying column frays and thins below its anvil.
        float dc = gDecay * (1.0 - aw);
        fb -= dc * A * 0.5;
        float dn = smoothstep(0.0, 0.3 + 0.9 * dc, fb) * gGrow * (1.0 - 0.7 * far) * (1.0 - 0.5 * dc);
        if (dn < 0.004) { t += st; continue; }
        if (tIn < 0.0) tIn = t;
        float h01 = clamp((p.y - gBase) / (gTop - gBase), 0.0, 1.0);
        // Light toward the sun: a lumpy tap near, a smooth tap far.
        float aw2;
        float od = hi ? towerLightDens(p + uSun * 0.5, lod + 1.0) * 0.8 : smoothstep(-0.2, 0.6, towerShape(p + uSun * 0.5, aw2)) * 0.8;
        od += smoothstep(-0.3, 0.6, towerShape(p + uSun * 2.2, aw2)) * 1.8;
        // Beer's law for the direct beam; light scattered many times spreads evenly.
        float Tl = exp(-3.0 * od), Tm = 0.3 * exp(-0.6 * od);
        // Powder: thin edges that face away from the light stay dark.
        float powder = mix(1.0, 1.0 - exp(-5.0 * dn), 0.5 * (1.0 - max(mu, 0.0)));
        // Storm haze veils the sun or moon, so the silver lining fades.
        vec3 S = uSunL * 0.1 * sunK * (1.0 - 0.85 * uStorm) * (Tl * phase + Tm * 0.7) * powder;
        // Sky light falls from above; folds and the base see little.
        // Creases sit deep in the base shape.
        // Lump crowns stand out of it.
        float crease = clamp(0.7 - 1.4 * sh / max(A, 0.1), 0.15, 1.2);
        float open = exp(-0.45 * max(fb, 0.0)) * crease;
        // A tap outward and up finds a lump in the way.
        // So lump crowns catch the sky, and folds do not.
        vec2 rad = normalize(p.xz - gAx * gLean * h01 + 1e-4);
        if (hi) open *= 1.0 - 0.75 * towerLightDens(p + vec3(rad.x * 0.4, 0.3, rad.y * 0.4), lod + 1.0);
        float sky = (0.2 + 0.8 * h01) * (0.25 + 0.75 * open);
        // Murk light is flat: edges and folds see about the same.
        sky = mix(sky, 0.45 * (0.4 + 0.6 * h01), 0.6 * uStorm);
        S += (dome * 1.5 + uAmb * 0.015) * sky;
        // The glow round the sun lights the side that faces it.
        S += twi * 0.3 * Tl * (0.3 + 0.25 * phase) * open;
        // Streets under the cell light its base orange.
        S += vec3(1.0, 0.5, 0.2) * b.w * 0.05 * exp(-(p.y - gBase) / 1.5);
        // Lightning: a hot core round the flash.
        // A wide glow fills the tower.
        float fd = length(p - pf);
        // The flash is a soft ball of light inside the cloud, brightest deep in.
        // Far flashes punch through the haze, so distant storms still flicker.
        S += FLASH_C * f.w * (1.8 * exp(-fd * fd / 5.0) + 0.5 * exp(-fd / 4.5)) * (1.0 - 0.6 * clamp(open, 0.0, 1.0)) * fBoost;
        // Below the deck top, the deck in front hides the tower.
        float al = (1.0 - exp(-7.0 * dn * st)) * mix(1.0, gDeckT, smoothstep(deckTop, deckTop - 1.2, p.y));
        col += Tc * S * al;
        Tc *= 1.0 - al;
        if (Tc < 0.03) break;
        t += st;
      }
    }
    if (tIn < 0.0) continue;
    // In a storm the haze thickens and takes the storm's grey.
    // Towers stand nearer than the sky's haze: they keep more of their own shade.
    float fog = (1.0 - exp(-tIn / mix(160.0, 260.0, uStorm))) * (boom ? 0.35 : 1.0);
    vec3 hzC = mix(haze, stormGlow(d), uStorm);
    col = col * (1.0 - fog) + hzC * (1.0 - Tc) * fog;
    // Close fog banks hide the tower too.
    float fb = fogAt(d, tIn);
    col = col * (1.0 - fb) + stormGlow(d) * 1.25 * (1.0 - Tc) * fb;
    c = c * Tc + col;
    skyA *= Tc;
  }
  return c;
}

// Painted metal for the nacelle and fairings: sky reflection, sky fill, glint.
vec3 paint(vec3 d, vec3 n, float E, float shade) {
  vec3 r = reflect(d, n);
  vec3 env = skyL(normalize(vec3(r.x, max(r.y, -0.02) * 0.45, r.z)));
  env = mix(vec3(dot(env, vec3(0.3, 0.5, 0.2))), env, 0.5);
  float fres = 0.05 + 0.6 * pow(1.0 - abs(dot(d, n)), 4.0);
  // The sky dome lights the upper side; the lower side stays dim.
  float up = 0.5 + 0.5 * n.y;
  vec3 c = uAmb * 0.03 * shade * (0.35 + 0.75 * up) + env * fres * 0.9;
  // The sun or moon lights the side that faces it.
  c += uSunL * 0.012 * shade * max(dot(n, uSun), 0.0);
  c += uSunL * 0.06 * pow(max(dot(r, uSun), 0.0), 80.0);
  return c + vec3(0.72, 0.74, 1.0) * E * 0.25 * shade;
}
// A ray from the eye against a capsule from a to b; the hit distance or -1.
float capsule(vec3 rd, vec3 pa, vec3 pb, float ra) {
  vec3 ba = pb - pa, oa = -pa;
  float baba = dot(ba, ba), bard = dot(ba, rd), baoa = dot(ba, oa), rdoa = dot(rd, oa), oaoa = dot(oa, oa);
  float a = baba - bard * bard, b = baba * rdoa - baoa * bard, c = baba * oaoa - baoa * baoa - ra * ra * baba;
  float h = b * b - a * c;
  if (h < 0.0) return -1.0;
  float t = (-b - sqrt(h)) / a, y = baoa + t * bard;
  if (y > 0.0 && y < baba) return t;
  vec3 oc = y <= 0.0 ? oa : -pb;
  b = dot(rd, oc); c = dot(oc, oc) - ra * ra; h = b * b - c;
  return h > 0.0 ? -b - sqrt(h) : -1.0;
}
// A round cone from a to b, with radius r1 at a and r2 at b.
float sdCone(vec3 p, vec3 a, vec3 b, float r1, float r2) {
  vec3 ba = b - a, pa = p - a;
  float l2 = dot(ba, ba), rr = r1 - r2, a2 = l2 - rr * rr, il2 = 1.0 / l2;
  float y = dot(pa, ba), z = y - l2;
  vec3 xv = pa * l2 - ba * y;
  float x2 = dot(xv, xv), y2 = y * y * l2, z2 = z * z * l2;
  float k = sign(rr) * rr * rr * x2;
  if (sign(z) * a2 * z2 > k) return sqrt(x2 + z2) * il2 - r2;
  if (sign(y) * a2 * y2 < k) return sqrt(x2 + y2) * il2 - r1;
  return (sqrt(x2 * a2 * il2) + y * rr) * il2 - r1;
}
// A canoe body: the round cone, narrower across the span than tall.
float canoe(vec3 p, vec4 a, vec4 b) {
  vec3 q = p - a.xyz;
  q += uSpan * dot(q, uSpan) * 0.6;
  return sdCone(q, vec3(0.0), b.xyz - a.xyz, a.w, b.w);
}
// A ray from the eye against a canoe; the hit distance or -1.
float canoeHit(vec3 rd, vec4 a, vec4 b, out vec3 nrm) {
  // A bounding sphere limits the march.
  vec3 ctr = (a.xyz + b.xyz) * 0.5;
  float rb = length(b.xyz - a.xyz) * 0.5 + a.w;
  float bc = dot(rd, ctr), h = bc * bc - dot(ctr, ctr) + rb * rb;
  if (h < 0.0) return -1.0;
  float t = max(bc - sqrt(h), 0.0), t1 = bc + sqrt(h);
  for (int i = 0; i < 40; i++) {
    float s = canoe(rd * t, a, b);
    if (s < 0.0004 * t) {
      vec2 e = vec2(0.002 * t, 0.0);
      vec3 p = rd * t;
      nrm = normalize(vec3(canoe(p + e.xyy, a, b) - canoe(p - e.xyy, a, b),
        canoe(p + e.yxy, a, b) - canoe(p - e.yxy, a, b), canoe(p + e.yyx, a, b) - canoe(p - e.yyx, a, b)));
      return t;
    }
    // The span squash overstates distance, so each step shrinks.
    t += s * 0.6;
    if (t > t1) break;
  }
  return -1.0;
}

// Trails: rocket plumes and contrails, as chains of glowing capsules.
// uTrA: point relative to the eye in km, radius; uTrB: colour.
// tEnd stops them at the ground; below the deck they dim by gDeckT.
vec3 trails(vec3 d, float tEnd) {
  vec3 e = vec3(0.0);
  float pxK = 1.3 / gFocal1;
  for (int i = 0; i < 127; i++) {
    if (i + 1 >= uTrN) break;
    vec4 a = texelFetch(uTrail, ivec2(i, 0), 0), b = texelFetch(uTrail, ivec2(i + 1, 0), 0);
    if (a.w <= 0.0 || b.w <= 0.0) continue;
    // Closest approach between the ray and the segment from a to b.
    vec3 u = b.xyz - a.xyz;
    float bb = dot(d, u), cc = max(dot(u, u), 1e-6), dd = dot(d, -a.xyz), ee = dot(u, -a.xyz);
    float den = cc - bb * bb;
    float k = den > 1e-6 ? clamp((ee - bb * dd) / den, 0.0, 1.0) : 0.0;
    vec3 q = a.xyz + u * k;
    float s = dot(d, q);
    if (s <= 0.0 || s > tEnd) continue;
    float dist = length(d * s - q);
    // A trail is never thinner than about a pixel.
    float rad = max(mix(a.w, b.w, k), s * pxK);
    // Tubes glow at the core; thin sheets glow at their rim, like a jellyfish bell.
    vec4 ca = texelFetch(uTrail, ivec2(i, 1), 0), cb = texelFetch(uTrail, ivec2(i + 1, 1), 0);
    float rr = dist / rad, shell = mix(ca.w, cb.w, k);
    float glow = mix(exp(-rr * rr), exp(-rr * rr) * 0.3 + exp(-pow((rr - 0.85) / 0.13, 2.0)) * 0.9, shell);
    if (glow < 0.002) continue;
    vec3 col = mix(ca.rgb, cb.rgb, k);
    // Thin far trails keep their brightness per pixel, not per km.
    col *= min(1.0, mix(a.w, b.w, k) / rad + 0.15);
    float y = q.y + H + dot(q.xz, q.xz) / 12742.0;
    // Neighbouring segments overlap at their joints; the brighter one wins.
    e = max(e, col * glow * (y < 3.5 ? gDeckT : 1.0));
  }
  return e;
}

// Planes on final: their lights as points, under the deck.
vec3 approach(vec3 d, float tEnd) {
  vec3 e = vec3(0.0);
  float px = 1.0 / gFocal1;
  for (int i = 0; i < 12; i++) {
    vec4 a = uApp[i];
    if (a.w <= 0.0) continue;
    float s = dot(d, a.xyz);
    if (s <= 0.0 || s > tEnd + 1.0) continue;
    float q = length(d * s - a.xyz) / (s * px);
    if (q < 3.0) e += uAppC[i].rgb * exp(-q * q * 1.4);
  }
  return e * gDeckT;
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
// The fireball's billows, as a share of its radius, from the noise volume.
// The pattern rides on the direction, so the billows grow with the ball.
float ballBump(vec3 p, vec3 sq) {
  vec3 u = normalize(p * sq);
  // Large Worley lobes, with a middle octave rolling over them.
  vec3 w = u * 0.45 + vec3(0.0, -uTime * 0.004, 0.0);
  float n1 = textureLod(uNoise, w, 0.0).g, n2 = textureLod(uNoise, w * 1.9 + 0.3, 0.0).b;
  return 0.18 * (n1 - 0.5) + 0.07 * (n2 - 0.5);
}
// Fire colour by heat, 0 to 1: dull red, orange, yellow, white.
vec3 fireRamp(float x) {
  return vec3(1.0, 0.3, 0.06) * smoothstep(0.0, 0.4, x) + vec3(0.0, 0.42, 0.18) * smoothstep(0.3, 0.75, x) + vec3(0.0, 0.2, 0.6) * smoothstep(0.7, 1.0, x);
}
vec3 wingCol(vec3 d, vec3 n, vec2 uv, float t, float E, float strobe) {
  // The upper skin curves over the airfoil: it faces forward near the leading edge, aft near the trailing edge.
  n = normalize(n + uChord * (uv.x - 0.35) * 0.45);
  // A satin finish blurs the mirror toward the horizon glow.
  vec3 r = reflect(d, n);
  // Satin paint never mirrors the hard horizon line: it sees the sky just above.
  vec3 rd = normalize(vec3(r.x, max(r.y, 0.0) * 0.45 + 0.03, r.z));
  vec3 rd2 = normalize(vec3(r.x, max(r.y, 0.0) * 0.45 + 0.12, r.z));
  // The satin paint blurs the aurora into soft bands.
  vec3 env = (skyL(rd) + skyL(rd2)) * 0.5 + aurora(rd, 1.0) * 0.5;
  // Grey paint keeps half the sky's colour.
  env = mix(vec3(dot(env, vec3(0.3, 0.5, 0.2))), env, 0.5);
  // Gloss paint: Schlick's Fresnel, so grazing skin mirrors the bright sky.
  float fres = 0.04 + 0.76 * pow(1.0 - abs(dot(d, n)), 5.0);
  // Diffuse light from the whole sky dome on grey paint.
  vec3 c = uAmb * 0.03 * (0.85 + 0.3 * uv.y);
  // The sun or moon lights the skin directly when it stands above it.
  c += uSunL * 0.012 * max(dot(n, uSun), 0.0);
  c += env * fres;
  // The sun or moon glints off the top skin: a hot core, a sheen, a wide haze.
  float sd = max(dot(r, uSun), 0.0);
  c += uSunL * (0.14 * pow(sd, 500.0) + 0.035 * pow(sd, 70.0) + 0.006 * pow(sd, 10.0)) * (0.4 + fres);
  // Panel lines follow straight edges in plan, so they never kink at a station.
  vec3 P = d * t;
  float ax = -dot(P, uChord), az = dot(P, uSpan);
  float sS = clamp((az - uWL.y) / (uWL.w - uWL.y), 0.0, 1.0);
  float leS = mix(uWL.x, uWL.z, sS), teS = mix(uWT.x, uWT.y, sS);
  // On the winglet, uv.y is 0.97 and the skin stays plain.
  float onW = step(uv.y, 0.96);
  vec2 cu = uv;
  uv = vec2((leS - ax) / (leS - teS), sS);
  // Lines are about 3 cm wide, never under a pixel; thin ones fade out.
  float pxm = t / gFocal1, lm = max(0.03, pxm), lk = min(1.0, 0.03 / pxm);
  float lx = lm / (leS - teS), ly = lm / (uWL.w - uWL.y);
  // A composite skin shows few joints: faint ones every couple of metres.
  float seam = 0.07 * smoothstep(0.5 - ly * 12.0, 0.5, abs(fract(uv.y * 12.0) - 0.5));
  // Control surfaces stop short of the tip.
  float inb = step(uv.y, 0.86);
  // The front spar.
  seam = max(seam, 0.2 * smoothstep(lx, 0.0, abs(uv.x - 0.24)));
  // Slats: the leading edge splits into segments that slide forward.
  seam = max(seam, 0.35 * smoothstep(lx, 0.0, abs(uv.x - 0.085)) * step(0.04, uv.y) * inb);
  seam = max(seam, 0.3 * step(uv.x, 0.085) * smoothstep(0.5 - ly * 9.0, 0.5, abs(fract(uv.y * 9.0) - 0.5)) * inb);
  // Spoilers: a row of panels ahead of the flap, inboard.
  float spo = step(0.56, uv.x) * step(uv.x, 0.72) * step(0.05, uv.y) * step(uv.y, 0.55);
  seam = max(seam, 0.45 * spo * smoothstep(0.5 - ly / 0.09, 0.5, abs(fract(uv.y / 0.09) - 0.5)));
  seam = max(seam, 0.4 * smoothstep(lx, 0.0, abs(uv.x - 0.56)) * step(0.05, uv.y) * step(uv.y, 0.55));
  // The flap hinge line, and the aileron outboard.
  seam = max(seam, 0.5 * smoothstep(lx * 1.3, 0.0, abs(uv.x - 0.72)) * inb * step(uv.x, 1.0));
  seam = max(seam, 0.45 * smoothstep(ly, 0.0, abs(uv.y - 0.6)) * step(0.72, uv.x));
  seam = max(seam, 0.45 * smoothstep(ly, 0.0, abs(uv.y - 0.86)) * step(0.72, uv.x));
  seam *= lk;
  c *= 1.0 - seam * onW;
  uv = cu;
  c *= 0.96 + 0.08 * vnoise(vec2(uv.x * 8.0, uv.y * 80.0));
  // The leading edge is round, so it catches a bright line of sky.
  c += env * 1.4 * smoothstep(0.045, 0.0, uv.x);
  // The trailing edge thins to a dark line.
  c *= 1.0 - 0.6 * smoothstep(0.95, 1.0, uv.x);
  // The cabin windows throw warm pools on the wing near the root.
  float row = smoothstep(0.06, 0.012, uv.y) * smoothstep(0.0, 0.01, uv.y);
  float pane = smoothstep(0.3, 0.12, abs(fract(uv.x * 14.0) - 0.5));
  c += vec3(1.0, 0.72, 0.42) * 0.01 * row * pane;
  // The nav light and the strobe light the wing near the tip.
  vec3 tp = d * t - uTip;
  c += uNavC * exp(-dot(tp, tp) / 0.8) * 0.02 + vec3(0.9, 0.95, 1.0) * exp(-dot(tp, tp) / 4.0) * strobe * 0.3;
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
  gFocal1 = uFocal * uOutRes.x / uRes.x;
  // The wing panels: the nearest hit wins.
  float tw = 1e5; vec2 uvW; vec3 nW;
  for (int i = 0; i < 5; i++) {
    vec3 v[4] = vec3[4](uWP[i * 2], uWP[i * 2 + 2], uWP[i * 2 + 3], uWP[i * 2 + 1]);
    vec2 uv;
    float t = quad(d, v, uWN[i], uv);
    if (t > 0.0 && t < tw) {
      tw = t;
      // Station normals blend the panels on each side, so the bend shades smooth.
      vec3 nA = i > 0 ? normalize(uWN[i - 1] + uWN[i]) : uWN[i];
      vec3 nB = i < 4 ? normalize(uWN[i] + uWN[i + 1]) : uWN[i];
      nW = normalize(mix(nA, nB, uv.y));
      uvW = vec2(uv.x, mix(uWS[i], uWS[i + 1], uv.y));
    }
  }
  // The winglet takes the plain skin: its span coordinate sits past the control surfaces.
  vec2 uvL;
  float tl = quad(d, uLet, uLetN, uvL);
  if (tl > 0.0 && tl < tw) { tw = tl; nW = uLetN; uvW = vec2(uvL.x, 0.97); }
  // The wing is the nearest thing outside: where it shows, nothing behind it needs tracing.
  float skyA = 0.0;
  // Wing distances are in metres; the storm air takes km.
  if (tw < 1e5) { o = vec4(nearFog(stormAir(wingCol(d, nW, uvW, tw, E, uStrobe), d, tw * 0.001, skyA), d, tw), 0.0); return; }
  vec3 c = vec3(0.0);
  float tg = hitLayer(d, 0.0);
  // In a thick fog bank nothing far shows; skip the far view.
  bool blind = fogAt(d, 60.0) > 0.995;
  if (!blind) {
  c = outside(d, uFocal * uOutRes.x / uRes.x, skyA);
  // Storm air hazes the background first; each tower takes its own haze.
  c = stormAir(c, d, tg > 0.0 ? tg : 1e4, skyA);
  c = towers(d, tg > 0.0 ? tg : 1e4, c, skyA);
  if (tg < 0.0 && uSpr[0].z + uSpr[1].z > 0.0) c += sprites(d) * skyA;
  // The impact's fireball: a billowing ball that rises, cools to smoke and flattens into the cap.
  if (uBallS.y > 0.0) {
    vec3 sq = vec3(1.0, 1.0 / uBallS.x, 1.0);
    vec3 glowC = uBallC.rgb * uBallC.w;
    // A bound 25 % wider than the ball limits the march.
    vec3 oc = -uBall.xyz * sq, ds = d * sq;
    float Rb = uBall.w * 1.25;
    float a2 = dot(ds, ds), bb = dot(oc, ds), cc = dot(oc, oc) - Rb * Rb, hh = bb * bb - a2 * cc;
    float q = length(oc - ds * bb / a2);
    if (hh > 0.0 && (-bb + sqrt(hh)) / a2 > 0.0) {
      float t = max((-bb - sqrt(hh)) / a2, 0.0), t1 = (-bb + sqrt(hh)) / a2;
      float bump = 0.0;
      bool hit = false;
      for (int i = 0; i < 28; i++) {
        bump = ballBump(d * t - uBall.xyz, sq);
        vec3 qp = (d * t - uBall.xyz) * sq;
        float sd = length(qp) - uBall.w * (1.0 + bump);
        if (sd < uBall.w * 0.004) { hit = true; break; }
        t += sd * 0.6;
        if (t > t1) break;
      }
      if (hit) {
        vec3 p = d * t - uBall.xyz;
        // The normal from the bumpy surface, by small steps.
        float e = uBall.w * 0.02;
        vec3 g = vec3(
          length((p + vec3(e, 0, 0)) * sq) - uBall.w * (1.0 + ballBump(p + vec3(e, 0, 0), sq)),
          length((p + vec3(0, e, 0)) * sq) - uBall.w * (1.0 + ballBump(p + vec3(0, e, 0), sq)),
          length((p + vec3(0, 0, e)) * sq) - uBall.w * (1.0 + ballBump(p + vec3(0, 0, e), sq)));
        vec3 nn = normalize(g - (length(p * sq) - uBall.w * (1.0 + bump)));
        float limb = max(dot(nn, -d), 0.0);
        // Fire shows in the folds; the bumps crust over with smoke as it cools.
        float heat = clamp(uBallC.w / 0.9, 0.0, 1.0);
        float fold = clamp(0.5 - bump * 3.5, 0.0, 1.0);
        float fine = textureLod(uNoise, p / uBall.w * 0.6 + vec3(0.0, uTime * 0.01, 0.0), 0.0).b;
        float T = clamp(heat * (0.25 + 1.1 * fold) + 0.25 * heat * (fine - 0.5), 0.0, 1.0);
        vec3 fire = fireRamp(T) * (0.15 + 2.2 * T * T) * (0.05 + uBallC.w);
        // Smoke: lit by the sky above and by the fire below.
        vec3 smoke = uAmb * 0.03 * (0.4 + 0.6 * max(nn.y, 0.0)) * (0.6 + 0.6 * fine);
        smoke += vec3(1.0, 0.4, 0.12) * (uBoomL.y * 0.3 + uBallC.w * 0.15) * max(-nn.y, 0.0);
        smoke += uSunL * 0.01 * max(dot(nn, uSun), 0.0);
        vec3 col = mix(smoke, fire + smoke * 0.3, smoothstep(0.05, 0.35, T));
        float op = smoothstep(0.0, 0.15, limb) * uBallS.y;
        // The cloud deck hides the part below its tops.
        float up = (d * t).y + H + dot((d * t).xz, (d * t).xz) / 12742.0;
        op *= mix(gDeckT, 1.0, smoothstep(3.2, 4.2, up));
        c = mix(c, col, op);
        skyA *= 1.0 - op;
      }
    }
    // Its glow spills into the air round it.
    c += glowC * 0.2 * exp(-max(q - uBall.w, 0.0) / (uBall.w * 0.7 + 1.0));
  }
  }
  // The passing jet: a small moonlit body of fuselage, wing and fin.
  if (uJetOn > 0.0) {
    float tj = 1e9; vec3 nj = vec3(0.0, 1.0, 0.0);
    float t1 = capsule(d, uJetF0, uJetF1, 0.0028);
    if (t1 > 0.0 && t1 < tj) { tj = t1; vec3 p = d * t1, ba = uJetF1 - uJetF0; nj = normalize(p - (uJetF0 + ba * clamp(dot(p - uJetF0, ba) / dot(ba, ba), 0.0, 1.0))); }
    float t2 = capsule(d, uJetW0, uJetW1, 0.0012);
    if (t2 > 0.0 && t2 < tj) { tj = t2; nj = vec3(0.0, 1.0, 0.0); }
    float t3 = capsule(d, uJetT0, uJetT1, 0.0012);
    if (t3 > 0.0 && t3 < tj) { tj = t3; nj = vec3(0.0, 0.0, -1.0); }
    if (tj < 1e8 && (tg < 0.0 || tj < tg)) { c = paint(d, nj, 0.004, 1.0) * 1.2; skyA = 0.0; }
  }
  // Trails and approach lights add light; storm air dims it by distance.
  vec3 add = approach(d, tg > 0.0 ? tg : 1e4);
  if (uTrN > 1) add += trails(d, tg > 0.0 ? tg : 1e4);
  if (uStorm > 0.0 || uFog > 0.0) {
    float tt = tg > 0.0 ? tg : 1e4;
    float hzA = uStorm * (tt > 5e3 ? 0.7 : 1.0 - exp(-tt / mix(500.0, 110.0, uStorm)));
    add *= (1.0 - 0.35 * uStorm) * (1.0 - hzA) * (1.0 - fogAt(d, tt));
  }
  c += add;
  float tNear = tw;
  float skyN = 0.0;
  // The engine nacelle hangs under the wing; its inlet shows ahead of the leading edge.
  float tn = capsule(d, uNacA, uNacB, uNacR);
  if (tn > 0.0 && tn < tNear) {
    vec3 p = d * tn, ba = uNacB - uNacA;
    float h = clamp(dot(p - uNacA, ba) / dot(ba, ba), 0.0, 1.0);
    vec3 n = normalize(p - (uNacA + ba * h));
    c = paint(d, n, E, 1.0) * 1.15;
    // The inlet: a polished lip round a dark fan face.
    if (h >= 1.0) {
      float rr = length(p - uNacB - ba * dot(p - uNacB, ba) / dot(ba, ba)) / uNacR;
      float lip = smoothstep(0.7, 0.82, rr) * smoothstep(1.0, 0.9, rr);
      c = mix(vec3(0.0015, 0.0016, 0.002) * (0.6 + 0.4 * sin(atan(n.y, n.z) * 22.0)), c * 1.5, lip);
    }
    // Panel lines ring the cowling.
    c *= 1.0 - 0.35 * smoothstep(0.008, 0.0, abs(h - 0.35)) - 0.3 * smoothstep(0.008, 0.0, abs(h - 0.7));
    c = stormAir(c, d, tn * 0.001, skyN);
    tNear = tn; skyA = 0.0;
  }
  // Flap-track fairings: canoes under the trailing edge, tails pointing aft.
  for (int i = 0; i < 3; i++) {
    vec3 nf;
    float tf = canoeHit(d, uFairA[i], uFairB[i], nf);
    if (tf > 0.0 && tf < tNear) {
      vec3 p = d * tf;
      c = paint(d, nf, E, 0.9);
      // A seam marks where the moving tail section starts.
      float k = dot(p - uFairA[i].xyz, uChord) / max(dot(uFairB[i].xyz - uFairA[i].xyz, uChord), 1e-3);
      c *= 1.0 - 0.4 * smoothstep(0.012, 0.0, abs(k - 0.62));
      c = stormAir(c, d, tf * 0.001, skyN);
      tNear = tf; skyA = 0.0;
    }
  }
  c = nearFog(c, d, tNear);
  o = vec4(c, skyA);
}`;

/* ---------- pass 2: cabin, frame and glass ---------- */
export const cabinFS = ({ ALT, WIN }) => `#version 300 es
precision highp float;
${common({ ALT, WIN })}
uniform vec2 uRes; uniform float uTime, uDpr, uFocal, uFlash, uDimE, uDimC, uRain, uStorm;
uniform vec3 uF, uR, uU;
uniform int uSteps;
uniform sampler2D uOut;
// A soft copy of the outside lights the bezel; uEnvOn is 0 where no page binds it.
uniform sampler2D uEnv; uniform float uEnvOn;
// The sun or moon's light, for the patch it throws through the opening; 0 where unset.
uniform vec3 uSunC;
uniform vec3 uGlow, uSun, uDisc, uTint, uTip, uCabin; uniform float uSunR, uSquash, uMoon, uStars, uStrobe;
// The wingtip nav light: red on the left wing, green on the right.
uniform vec3 uNavC;
uniform vec4 uFlr[10]; uniform vec4 uFlrC[10];
// Extra ghost strength per flare; 0 keeps the old ghosts.
uniform float uFlrG[10];
uniform vec3 uMetA, uMetB; uniform vec4 uMet, uMetF;
// The wing light: lamp point and level; beam axis and the fog level.
uniform vec4 uBeamL, uBeamA;
// Breath on the scratch pane: R fog, G the finger's trace; uBreathOn is 0 when clear.
uniform sampler2D uBreath; uniform float uBreathOn;
// The shade: 0 open, 1 shut.
uniform float uShade;
uniform vec4 uPt[10]; uniform vec3 uPtC[10];
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
    // Maria: broad grey seas, upper left heavier, as seen from the north.
    float sea = smoothstep(0.46, 0.6, fbm(q * 1.25 + vec2(4.0, 1.7), 5) + 0.12 * (q.y - q.x) * 0.5);
    // Highlands: fine bright speckle, and one rayed crater low on the disc.
    float speck = fbm(q * 7.0 + 2.0, 3);
    vec2 cq = q - vec2(-0.15, -0.55);
    float crater = exp(-dot(cq, cq) * 90.0) * 0.6 + exp(-dot(cq, cq) * 6.0) * 0.12 * (0.6 + 0.4 * sin(atan(cq.y, cq.x) * 9.0));
    c = uDisc * vec3(1.0, 0.97, 0.9) * (1.0 - 0.42 * sea) * (0.85 + 0.25 * speck + crater) * (0.9 + 0.1 * mu) * body;
    c += uDisc * 0.035 * exp(-max(r - 1.0, 0.0) * 0.9) * (1.0 - body);
  } else {
    // Limb darkening: the edge of the sun looks dimmer and redder.
    c = uDisc * vec3(1.0 - 0.5 * (1.0 - mu), 1.0 - 0.62 * (1.0 - mu), 1.0 - 0.75 * (1.0 - mu)) * body;
  }
  return c * texture(uSkyT, skyUV(d)).rgb;
}

// A meteor along a great circle of the sky.
// uMet: head progress, persistence length, brightness, train glow.
// uMetF: fireball flag, seed, train age 0 to 1, colour pick 0 to 1.
vec3 meteor(vec3 d) {
  if (uMet.z <= 0.0 && uMet.w <= 0.0) return vec3(0.0);
  vec3 n = normalize(cross(uMetA, uMetB));
  float off = dot(d, n);
  vec3 dp = normalize(d - n * off);
  float total = max(acos(clamp(dot(uMetA, uMetB), -1.0, 1.0)), 1e-4);
  float along = atan(dot(cross(uMetA, dp), n), dot(uMetA, dp)) / total;
  float px = 1.0 / uFocal;
  float head = uMet.x, behind = head - along, behR = behind * total;
  bool fire = uMetF.x > 0.5;
  // Plain meteors burn white with a green or blue cast; fireballs burn green.
  vec3 tint = fire ? vec3(0.45, 1.0, 0.6) : mix(vec3(0.75, 1.0, 0.8), vec3(0.75, 0.85, 1.0), uMetF.w);
  vec3 c = vec3(0.0);
  if (uMet.z > 0.0) {
    float fl = 0.8 + 0.2 * sin(uTime * 61.0 + along * 50.0) * sin(uTime * 37.0 + uMetF.y);
    // The streak: a thin core with a soft bloom, fading fast behind the head.
    // A fireball's wake widens behind it, into a teardrop.
    float fade = behind >= 0.0 ? exp(-behind / uMet.y) : 0.0;
    float wid = px * (fire ? 1.6 : 0.9) + max(behR, 0.0) * (fire ? 0.08 : 0.015);
    // The wake runs back past the start: the meteor burned before it came into view.
    float line = (exp(-off * off / (wid * wid)) + 0.22 * exp(-off * off / (9.0 * wid * wid))) * fade;
    // Hot white at the head, its own colour behind, a little orange at the end.
    vec3 col = mix(vec3(1.0, 0.97, 0.92), tint, smoothstep(0.0, 0.25, 1.0 - fade));
    col = mix(col, vec3(1.0, 0.55, 0.3), smoothstep(0.55, 0.95, 1.0 - fade) * 0.6);
    vec3 hd = normalize(mix(uMetA, uMetB, head));
    float hr = acos(clamp(dot(d, hd), -1.0, 1.0)) / px;
    float core = exp(-hr * hr / (fire ? 4.0 : 1.4)) + exp(-hr / (fire ? 12.0 : 4.0)) * (fire ? 0.3 : 0.07);
    // After the breakup, the main body is smaller.
    float split = fire ? 1.0 - 0.55 * smoothstep(0.62, 0.7, head) : 1.0;
    c += (vec3(1.0, 0.98, 0.95) * core * 1.8 * split + col * line) * uMet.z * fl;
    // A fireball breaks up: fragments fan out from the break point, each with its own streak.
    if (fire && head > 0.62) {
      float br = head - 0.62;
      vec3 bp = normalize(mix(uMetA, uMetB, 0.62));
      vec3 tg = normalize(uMetB - uMetA);
      for (int k = 0; k < 7; k++) {
        float fk = float(k);
        float h1 = hash12(vec2(fk, uMetF.y)), h2 = hash12(vec2(fk + 7.0, uMetF.y));
        // Each fragment keeps its own speed and drifts to one side.
        vec3 fd = tg * (0.5 + 0.5 * h2) + n * (h1 - 0.5) * 0.6;
        vec3 fp = normalize(bp + fd * br * total);
        // The streak from the break point to the fragment, faded toward the break.
        vec3 ab = fp - bp, ap = d - bp;
        float hh = clamp(dot(ap, ab) / max(dot(ab, ab), 1e-10), 0.0, 1.0);
        float dist = length(ap - ab * hh) / px;
        float trailK = exp(-(1.0 - hh) * length(ab) / px / (25.0 + 40.0 * h2));
        float wk = 0.7 + 1.1 * h2;
        float hr2 = length(d - fp) / px;
        float coreK = exp(-hr2 * hr2 / (1.2 + 2.5 * h2));
        // Small fragments burn out before the big ones.
        float life = smoothstep(0.38, 0.12, br * (0.6 + 0.9 * h1));
        float fl2 = 0.75 + 0.25 * sin(uTime * 53.0 + fk * 3.1);
        vec3 fc = mix(vec3(1.0, 0.72, 0.42), tint, h1 * 0.7);
        c += fc * (coreK * 1.6 + exp(-dist * dist / (wk * wk)) * trailK * 0.55) * life * fl2 * uMet.z * 0.6;
      }
    }
  }
  // The persistent train: a glowing thread that twists in the high wind.
  // Green-cyan at first, then dull red, then a grey ghost.
  if (uMet.w > 0.0 && along > -0.4 && along < head) {
    float age = uMetF.z;
    float tw = px * (1.4 + 26.0 * age);
    float wob = (sin(along * 13.0 + age * 3.0 + uMetF.y) + 0.5 * sin(along * 31.0 - age * 2.0)) * px * 22.0 * age;
    float g = exp(-pow((off - wob) / tw, 2.0)) * smoothstep(-0.4, -0.2, along) * smoothstep(0.0, 0.05, head - along + 0.02);
    vec3 tc = mix(vec3(0.3, 1.0, 0.65), vec3(0.95, 0.4, 0.3), smoothstep(0.05, 0.4, age));
    tc = mix(tc, vec3(0.5, 0.48, 0.5), smoothstep(0.4, 0.9, age));
    c += tc * uMet.w * 0.3 * g / (1.0 + 6.0 * age);
  }
  return c;
}


// Rain in the air outside: streaks that race aft past the window.
// Three layers: near ones are longer, wider and faster.
// amt sets how many drops fall.
float rainStreaks(vec2 px, float amt) {
  if (amt <= 0.05) return 0.0;
  vec2 q = px / uDpr;
  float s = 0.0;
  for (int l = 0; l < 3; l++) {
    float fl = float(l), k = 1.0 + fl * 0.9;
    // Drops fall a little as they race aft, so the streaks slant.
    float row = 9.0 / k;
    vec2 g = vec2((q.x - q.y * 0.1) + uTime * 2600.0 * k, q.y) / vec2(220.0 * k, row);
    vec2 id = floor(g), f = fract(g);
    vec2 h = hash22(id + fl * 31.7);
    if (h.x > amt * 0.18) continue;
    float len = 0.25 + 0.5 * h.y;
    float across = abs(f.y - 0.5) * row;
    s += smoothstep(0.45 * k, 0.0, across) * smoothstep(0.0, 0.05, f.x) * smoothstep(len, len - 0.15, f.x) * hash12(id + 7.1) * 0.6;
  }
  return s;
}
// The soft outside along cabin direction d.
// The eye sees d where d crosses the skin plane; that point stays inside the opening.
vec3 envDir(vec3 d) {
  vec2 q = uEye.xy + d.xy * ((Z_OUT - uEye.z) / max(d.z, 1e-3));
  q /= max(1.0, length(q / (SKIN * 0.8)));
  vec3 P = vec3(q, Z_OUT) - uEye;
  vec2 sp = uRes * 0.5 + vec2(dot(P, uR), dot(P, uU)) / max(dot(P, uF), 1e-3) * uFocal;
  // The clamp keeps the sun's bloom from counting twice with the direct patch.
  return min(texture(uEnv, sp / uRes).rgb, vec3(0.6));
}
// The soft outside as the eye sees it through point q of the opening.
vec3 envAt(vec2 q) {
  vec3 P = vec3(q, Z_OUT) - uEye;
  vec2 sp = uRes * 0.5 + vec2(dot(P, uR), dot(P, uU)) / max(dot(P, uF), 1e-3) * uFocal;
  return min(texture(uEnv, clamp(sp / uRes, 0.0, 1.0)).rgb, vec3(0.6));
}
const float SKIN_A = 4.0 * SKIN.x * SKIN.y - (4.0 - PI) * RSK * RSK;
// Diffuse light at cabin point P, facing n, from the whole skin opening.
// It sums an n by n grid of patches: radiance times form factor.
// Each patch glows with the light the eye sees there, so nothing projects.
vec3 irr(vec3 P, vec3 n, int g) {
  vec3 s = vec3(0.0);
  float fg = float(g);
  for (int j = 0; j < 4; j++) for (int i = 0; i < 4; i++) {
    if (i >= g || j >= g) continue;
    vec2 q = ((vec2(i, j) + 0.5) / fg * 2.0 - 1.0) * SKIN * 0.8;
    vec3 v = vec3(q, Z_OUT) - P;
    float r2 = dot(v, v);
    vec3 d = v * inversesqrt(r2);
    float w = max(dot(n, d), 0.0) * d.z / r2;
    if (w > 0.0) s += envAt(q) * w;
  }
  return s * SKIN_A / (fg * fg * PI);
}
// The sun in the cabin frame: the bank turned back out.
vec3 sunCabin() { return vec3(uSun.x, uSun.y * uBank.x + uSun.z * uBank.y, -uSun.y * uBank.y + uSun.z * uBank.x); }
// How much of the sun reaches cabin point P through the skin opening, from 0 to 1.
// The penumbra grows with the distance to the opening and the disc's size.
float sunThrough(vec3 P) {
  vec3 L = sunCabin();
  if (L.z <= 0.02) return 0.0;
  float t = (Z_OUT - P.z) / L.z;
  vec2 q = P.xy + L.xy * t;
  float pw = 0.0005 + t * max(uSunR, 0.0047);
  return smoothstep(pw, -pw, sdBox(q, SKIN, RSK));
}
// The open sky at the sun's place in the view: wing, towers and cloud block it.
float sunOpen() {
  vec3 L = sunCabin();
  if (dot(L, uF) <= 0.0) return 1.0;
  vec2 sp = uRes * 0.5 + vec2(dot(L, uR), dot(L, uU)) / dot(L, uF) * uFocal;
  if (any(lessThan(sp, vec2(0.0))) || any(greaterThan(sp, uRes))) return 1.0;
  // Only a sun seen through the pane says anything; elsewhere it counts as open.
  vec3 P = vec3(uEye.xy + L.xy * ((Z_OUT - uEye.z) / max(L.z, 1e-3)), Z_OUT);
  if (sdBox(P.xy, SKIN, RSK) > -0.01) return 1.0;
  return clamp(texture(uOut, sp / uRes).a, 0.0, 1.0);
}
// The glass dims all light that comes in: the mean of edge and core tint.
vec3 dimT() { return exp(-max(mix(uDimE, uDimC, 0.6), 0.0) * vec3(4.6, 3.3, 2.2)); }
// Fine pebble grain of the moulded plastic, about 0.7 mm across.
float grainH(vec2 p) { return vnoise(p * 1400.0) * 0.65 + vnoise(p * 3100.0 + 7.1) * 0.35; }
// The grain tilts normal n on a face with tangents t1 and t2.
// fp is the pixel's footprint in grains; the grain fades out above one.
vec3 grainN(vec3 n, vec2 uv, vec3 t1, vec3 t2, float fp, float amp) {
  amp *= 1.0 - smoothstep(0.35, 1.1, fp);
  if (amp <= 0.0) return n;
  const float e = 0.00012;
  float h = grainH(uv);
  vec2 g = vec2(grainH(uv + vec2(e, 0.0)) - h, grainH(uv + vec2(0.0, e)) - h) / e;
  return normalize(n - amp * 0.00012 * (g.x * t1 + g.y * t2));
}
// Low-gloss sheen of a sanded plastic, from one light: GGX, roughness 0.55.
float sheen(vec3 n, vec3 v, vec3 l) {
  vec3 h = normalize(v + l);
  float nh = max(dot(n, h), 0.0), nl = max(dot(n, l), 0.0), nv = max(dot(n, v), 0.05);
  const float a2 = 0.3025 * 0.3025;
  float dd = nh * nh * (a2 - 1.0) + 1.0;
  float F = 0.04 + 0.96 * pow(1.0 - max(dot(v, h), 0.0), 5.0);
  return a2 / (PI * dd * dd) * F * nl / (4.0 * max(nl, nv));
}
// Mist streams aft through the beam: noise stretched along the flight line.
float beamMist(vec2 px) {
  vec2 q = px / uDpr;
  float n = vnoise(vec2(q.x * 0.005 + uTime * 7.0, q.y * 0.04)) * 0.6 + vnoise(vec2(q.x * 0.012 + uTime * 13.0, q.y * 0.1) + 4.0) * 0.4;
  return 0.35 + 1.3 * n * n;
}
// Drops and crystals in the beam: short, bright dashes racing aft.
// amt sets the share of cells that hold one.
float beamMotes(vec2 px, float amt) {
  vec2 q = px / uDpr;
  float s = 0.0;
  for (int l = 0; l < 2; l++) {
    float k = 1.0 + float(l) * 1.4;
    vec2 g = vec2(q.x - q.y * 0.12 + uTime * 1500.0 * k, q.y + float(l) * 5.0) / vec2(70.0 * k, 16.0);
    vec2 id = floor(g), f = fract(g);
    vec2 h = hash22(id + float(l) * 13.1);
    if (h.x > amt * 0.3) continue;
    float y0 = 0.2 + 0.6 * h.y, len = 0.25 + 0.3 * hash12(id + 2.7);
    float across = abs(f.y - y0) * 16.0 / k;
    s += smoothstep(0.9, 0.0, across) * smoothstep(0.0, 0.08, f.x) * smoothstep(len, len - 0.12, f.x) * (0.3 + hash12(id + 9.3));
  }
  return s;
}
// The wing light's beam along cabin ray da: 1 on its axis, 0 outside the cone.
// s returns the distance from the lamp along the beam, in metres.
float beamAt(vec3 da, out float s) {
  vec3 a = uBeamA.xyz, w0 = uEye - uBeamL.xyz;
  float b = dot(da, a), dd = dot(da, w0), e = dot(a, w0), den = max(1.0 - b * b, 1e-4);
  // The nearest points of the view ray and the beam axis.
  float tr = (b * e - dd) / den;
  s = (e - b * dd) / den;
  if (tr < 0.3 || s < 0.3) return 0.0;
  float dist = length(w0 + da * tr - a * s), r = s * 0.36;
  return smoothstep(r, r * 0.15, dist) * smoothstep(0.3, 2.5, s) * smoothstep(45.0, 12.0, s);
}
vec3 glass(vec3 da, vec2 px) {
  vec4 out1 = texture(uOut, px / uRes);
  vec3 view = out1.rgb;
  vec3 d = toWorld(da);
  // Point sources draw at full size; pass 1 says where sky shows.
  if (out1.a > 0.001) view += out1.a * (stars(d) + disc(d) + meteor(d));
  // Small steady lights: a jet's nav lights, strobes and beacons.
  for (int i = 0; i < 10; i++) {
    vec4 pt = uPt[i];
    if (pt.w <= 0.0) continue;
    float r2 = dot(px - pt.xy, px - pt.xy);
    view += uPtC[i] * pt.w * (exp(-r2 / (pt.z * pt.z)) + 0.06 * exp(-sqrt(r2) / (pt.z * 5.0)));
  }
  // The nav light: a hot core and a soft halo.
  float ang = acos(clamp(dot(d, normalize(uTip)), -1.0, 1.0)) * uFocal / uDpr;
  view += uNavC * (exp(-ang * ang / 3.0) * 1.5 + exp(-ang / 14.0) * 0.05);
  view += vec3(0.9, 0.95, 1.0) * uStrobe * (exp(-ang * ang / 5.0) * 4.0 + exp(-ang / 40.0) * 0.12);
  // Rain streaks catch the sky glow, the strobe and the lightning.
  float rs = rainStreaks(px, uStorm);
  if (rs > 0.0) view += rs * (uGlow * 0.012 + vec3(0.8, 0.85, 1.0) * (uFlash * 0.012 + uStrobe * 0.012 * exp(-ang / 150.0)));
  // The wing light's beam glows in fog and lights what falls through it.
  if (uBeamL.w > 0.001) {
    float bs, bk = beamAt(da, bs) * uBeamL.w;
    if (bk > 0.0) {
      // Light falls off with the square of the distance from the lamp.
      float fall = 60.0 / (bs * bs + 20.0);
      // Cloud, rain or storm fills the beam with streaming drops and crystals.
      float wet = max(max(uStorm, uRain * 0.8), uBeamA.w);
      vec3 BEAM = vec3(1.0, 0.95, 0.86);
      // The haze is brightest where the eye looks down the beam.
      view += BEAM * bk * fall * (beamMotes(px, 0.1 + 0.5 * wet) * (0.04 + 0.08 * wet) + 0.0015 + 0.06 * wet * bk * beamMist(px));
    }
  }
  return view;
}

// The cabin behind the eye, as the panes mirror it: a soft map, no texture.
// r points back into the cabin: -z across the aisle, x to the nose, y up.
// rgb is in units of cabin light; a is the far windows' share of outside light.
vec4 cabinEnv(vec3 r) {
  float az = atan(r.x, -r.z), el = asin(clamp(r.y, -1.0, 1.0));
  vec3 c = vec3(0.3);
  // A cove light runs fore and aft along the ceiling, above the bins.
  c += 3.0 * exp(-pow((el - 0.62) / 0.05, 2.0));
  // The bins: a darker band with a bright lower lip.
  c *= 1.0 - 0.4 * smoothstep(0.28, 0.32, el) * smoothstep(0.56, 0.5, el);
  c += 0.8 * exp(-pow((el - 0.29) / 0.012, 2.0));
  // Seat backs: dark rows below the window line; their tops catch the light.
  c *= 1.0 - 0.6 * smoothstep(-0.02, -0.07, el);
  c += 0.35 * exp(-pow((el + 0.06) / 0.015, 2.0)) * (0.6 + 0.4 * sin(az * 38.0));
  // The far side's windows: a row of soft ovals, bright by day.
  float wx = fract(az / 0.16 + 0.5) - 0.5;
  float win = smoothstep(0.3, 0.18, abs(wx)) * smoothstep(0.11, 0.06, abs(el - 0.09));
  return vec4(c, win);
}
// The seat in front: its back faces us, a little reclined, by the wall.
// Window metres; it returns the hit point and, in w, coverage from 0 to 1.
const float SEAT_X = 0.2;
vec4 seatBack(vec3 da) {
  // The back leans aft toward its top: x falls as y rises.
  float den = da.x + 0.12 * da.y;
  if (den <= 1e-4) return vec4(0.0);
  float t = (SEAT_X - 0.12 * uEye.y - uEye.x) / den;
  vec3 P = uEye + da * t;
  if (t <= 0.0 || P.z > -0.03) return vec4(0.0);
  float sd = sdBox(vec2(P.z + 0.475, P.y + 0.43), vec2(0.425, 0.47), 0.08);
  float aa = fwidth(sd) * 1.2;
  return vec4(P, smoothstep(aa, -aa, sd));
}
// Fine scratches on the scratch pane, pG in metres.
// A scratch glints when it runs across the line to a bright source.
// So the glints ring each source in arcs.
vec3 scratches(vec2 pG, vec2 px) {
  vec3 s = vec3(0.0);
  float fw = max(fwidth(pG.x), 1e-6);
  // A scratch shows only when light reaches it: the cabin a little, a bright view behind it more.
  vec3 back = texture(uOut, px / uRes).rgb;
  vec3 amb = (uCabin * 1.2 + uGlow * 0.012) * 0.18 + back * 0.08;
  for (int l = 0; l < 3; l++) {
    float cs = l == 0 ? 0.0045 : l == 1 ? 0.008 : 0.017;
    vec2 g = pG / cs + float(l) * 17.3;
    vec2 id = floor(g), f = fract(g) - 0.5;
    if (hash12(id + 3.1) > (l == 2 ? 0.1 : 0.3)) continue;
    float a = hash12(id) * PI;
    vec2 t = vec2(cos(a), sin(a));
    float along = dot(f, t), across = dot(f, vec2(-t.y, t.x));
    // Long scratches bow a little.
    across += along * along * (hash12(id + 7.7) - 0.5) * 0.5;
    float w = fw / cs * (l == 2 ? 1.5 : 1.1);
    float line = smoothstep(w, 0.0, abs(across)) * smoothstep(0.5, 0.2, abs(along)) * (0.35 + 0.65 * hash12(id + 1.3));
    if (line <= 0.0) continue;
    s += amb * line * (l == 2 ? 0.55 : 0.3);
    // A bright source glints along the scratch that lies across its line.
    for (int i = 0; i < 10; i++) {
      vec4 fl = uFlr[i];
      if (fl.z <= 0.0) continue;
      vec2 r = px - fl.xy;
      float dist = length(r);
      float al = dot(r / max(dist, 1.0), t);
      s += uFlrC[i].rgb * fl.z * line * exp(-al * al * 90.0) * exp(-dist / (uRes.y * 0.12)) * 0.25;
    }
  }
  // Cleaning swirls: broken arcs round one centre, from a cloth.
  vec2 sc = pG - vec2(0.03, -0.04);
  float rr = length(sc), ring = floor(rr / 0.0045);
  float seg = floor((atan(sc.y, sc.x) + PI) * 5.0 + hash12(vec2(ring, 2.0)) * 9.0);
  if (hash12(vec2(ring, seg)) < 0.16) {
    float arc = smoothstep(fw / 0.0045 * 1.2, 0.0, abs(fract(rr / 0.0045) - 0.5));
    s += amb * arc * 0.18 * smoothstep(0.2, 0.02, rr);
  }
  return s;
}
// A faint ghost of each bright source, bounced between the panes.
vec3 ghosts(vec2 px) {
  vec3 s = vec3(0.0);
  for (int i = 0; i < 10; i++) {
    vec4 fl = uFlr[i];
    if (fl.z <= 0.0) continue;
    vec2 at2 = fl.xy + (fl.xy - uRes * 0.5) * 0.07 + vec2(0.0, -uRes.y * 0.012);
    float gr = length(px - at2) / (fl.w * uRes.y * 0.01 + 2.0 * uDpr);
    s += uFlrC[i].rgb * fl.z * exp(-gr * gr) * 0.2;
  }
  return s;
}
// Ice crystals grow up from the bottom edge of the outer pane.
// edge: the distance inside the skin opening, in metres.
// Rain on the outer pane: the shared glass-rain shader.
${GLASS_RAIN}

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
// glassK: 1 where the pixel looks through the skin opening, 0 on the frame.
vec3 flare(vec2 px, vec3 base, float glassK) {
  const vec3 ORANGE = vec3(1.0, 0.42, 0.1);
  vec2 uv = px / uRes;
  float aspect = uRes.x / uRes.y;
  vec3 add = vec3(0.0);
  for (int i = 0; i < 10; i++) {
    vec4 f = uFlr[i];
    if (f.z <= 0.0) continue;
    vec3 col = uFlrC[i].rgb;
    float streak = uFlrC[i].w;
    vec2 sp = f.xy / uRes;
    vec2 d = (uv - sp) / f.w;
    float ax = d.x * aspect, ay = d.y;
    // A wide veil of haze and a soft orb, squashed sideways.
    float r = length(vec2(ax * 0.6, ay));
    vec3 a = col * (0.025 * exp(-r * 1.5) + 0.08 * exp(-r * 5.0) + 0.4 * exp(-r * 22.0));
    // A short streak, only for sources that throw one: the sun, lightning, the strobe.
    float line = 0.9 * exp(-abs(ay) * 40.0) + 0.25 * exp(-abs(ay) * 12.0);
    a += mix(col, vec3(0.85, 0.8, 1.0), 0.25) * line * exp(-abs(ax) / (0.18 * f.w)) * streak;
    // Ghosts sit on the line from the source through the frame centre.
    vec2 toC = vec2(0.5) - sp;
    for (int k = 0; k < 4; k++) {
      vec3 gs = k == 0 ? vec3(0.7, 0.05, 0.9) : k == 1 ? vec3(1.4, 0.09, 0.6) : k == 2 ? vec3(2.2, 0.15, 0.4) : vec3(-0.45, 0.03, 0.5);
      vec2 g = (uv - (sp + toC * gs.x)) * vec2(aspect, 1.0);
      float gr = length(g) / (gs.y * f.w);
      a += mix(col, col * ORANGE, 0.4) * exp(-gr * gr) * gs.z * 0.12 * (0.3 + 0.7 * streak) * (1.0 + uFlrG[i]);
    }
    // The wingtip lights glow only in the glass: their halo stops at the frame.
    if (i == 2 || i == 3) a *= glassK;
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
  vec3 eCol = mix(vec3(1.0, 0.86, 0.72), vec3(0.68, 0.76, 1.0), clamp(uFlash * 3.0, 0.0, 1.0));
  // Cabin mood light, set per hour: amber, deep night blue, or dawn rose.
  vec3 cabin = uCabin;
  vec3 outGlow = uGlow * 0.014 + eCol * E;
  float alb = 0.5;
  // Cabin light falls from above and a little aft.
  vec3 Lc = normalize(vec3(-0.3, 0.85, -0.45));

  vec2 p0 = da.z > 0.0 ? at(da, 0.0) : vec2(9.0);
  float sOut = sdBox(p0, OUTB, ROUT);
  // Outside light, through the dimmable glass, for the bezel, gasket and wall.
  vec3 Tdim = dimT(), Ls = sunCabin(), V = -da;
  // A lowered shade cuts the light the window sends into the cabin.
  vec3 outGlow0 = outGlow;
  Tdim *= 1.0 - 0.9 * uShade; outGlow *= 1.0 - 0.8 * uShade;
  vec3 sunE = uSunC * 0.3 * sunOpen() * Tdim;
  float slope = (OUTB.x - INB.x) / DEPTH;
  // Fake GI: the lit reveal sends light back to its other faces and the wall.
  vec3 bounce = vec3(0.0);
  if (uEnvOn > 0.5 && sOut < 0.2) {
    float pat = 0.0;
    vec2 mid = mix(OUTB, INB, 0.5);
    for (int i = 0; i < 8; i++) {
      vec2 cs = vec2(cos(float(i) * PI * 0.25), sin(float(i) * PI * 0.25));
      pat += sunThrough(vec3(cs * mid, DEPTH * 0.5)) * max(dot(normalize(vec3(-cs, -slope)), Ls), 0.0);
    }
    bounce = alb * (irr(vec3(0.0), vec3(0.0, 0.0, 1.0), 2) * Tdim * 0.5 + sunE * pat / 8.0);
  }
  // Wall: matte plastic panels with a fine grain, lit from above.
  float wy = p0.y;
  float fpW = length(vec3(p0, 0.0) - uEye) / uFocal / max(abs(da.z), 0.15) * 1400.0;
  vec3 nW = grainN(vec3(0.0, 0.0, -1.0), p0, vec3(1.0, 0.0, 0.0), vec3(0.0, 1.0, 0.0), fpW, 0.8);
  float gW = clamp(dot(nW, Lc) / max(-Lc.z, 0.05), 0.6, 1.4);
  vec3 wall = alb * cabin * (0.55 + 0.6 * smoothstep(-0.6, 0.5, wy)) * mix(1.0, gW, 0.5);
  // A seam between two wall panels gives the plane its slant.
  wall *= 1.0 - 0.35 * smoothstep(0.004, 0.0, abs(p0.x - 0.5));
  // The wall faces away from the glass: only the reveal's bounce reaches it.
  wall += alb * (outGlow * 0.5 + bounce * 0.6) * exp(-max(sOut, 0.0) / 0.06);
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

  float glassK = 0.0;
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
      vec3 n = normalize(vec3(-g2, -slope));
      vec3 P = vec3(ph, hit);
      // Triplanar grain: sill and head use x and z; the sides use y and z.
      bool horiz = abs(n.y) > abs(n.x);
      vec2 uv = horiz ? P.xz : P.yz;
      vec3 t1 = horiz ? vec3(1.0, 0.0, 0.0) : vec3(0.0, 1.0, 0.0), t2 = vec3(0.0, 0.0, 1.0);
      float fp = length(P - uEye) / uFocal / max(abs(dot(n, da)), 0.15) * 1400.0;
      vec3 nb = grainN(n, uv, t1, t2, fp, 1.0);
      float diff = max(dot(nb, Lc), 0.0);
      // Without the soft outside, the sill takes a plain glow.
      vec3 envL = outGlow * 1.6 * (0.35 + 0.65 * max(-g2.y, 0.0)) * pow(k, 1.5);
      vec3 spec = vec3(0.0);
      if (uEnvOn > 0.5) {
        // Each face takes the light of all the opening it can see.
        // The sill sees sky, the head sees ground and deck, the depth sets how much.
        envL = irr(P, n, 4) * Tdim * 9.0 + outGlow * 0.4 * k;
        // The sun or moon lays a sharp patch in the opening's own shape.
        float sv = sunThrough(P);
        envL += sunE * max(dot(nb, Ls), 0.0) * sv;
        // The lit faces glow back onto the rest.
        envL += bounce * (1.0 - 0.6 * sv);
        // The grain breaks the sun's sheen into a soft, low gloss.
        spec = sunE * sv * sheen(nb, V, Ls) * 0.5;
        // At grazing angles the face mirrors the bright opening, broad and dim.
        vec3 Rr = reflect(da, nb);
        if (Rr.z > 0.0) {
          float tr = (Z_OUT - P.z) / Rr.z;
          float w = 0.01 + tr * 0.5;
          float m = smoothstep(w, -w, sdBox(P.xy + Rr.xy * tr, SKIN, RSK));
          float F = 0.04 + 0.96 * pow(1.0 - max(dot(nb, V), 0.0), 5.0);
          spec += envDir(Rr) * Tdim * m * F * 0.08;
        }
      }
      inner = alb * (cabin * (0.25 + 1.3 * diff) + envL) + spec;
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
      glassK = smoothstep(aaO, -aaO, sSk);
      float sI = sdBox(pI, SKIN + 0.007, RSK + 0.007), aaI = fwidth(sI) * 1.5;
      vec3 view = vec3(0.0);
      if (sSk < aaO) {
        // Through the skin opening: the outside, then rain and ice on the outer pane.
        vec2 rOff = vec2(0.0);
        float rRim = 0.0, rSpec = 0.0;
        if (uRain > 0.0) {
          vec2 m = normalize(vec2(-1.0, -0.12));
          vec3 L = vec3(-0.3, 0.6, 0.74);
          // Rain space: the glass lab's shared look shows 0.45 units across the pane.
          // This pane shows about 0.55 m, so drops scale by 0.45 / 0.55.
          const float RS = 0.818;
          vec2 pr = pO * RS;
          float rCover = 0.0, rClear = 0.0;
          // At flight speed the airflow strips the larger beads; runs race aft.
          grBeads(pr, uRain, 0.15 * (1.0 - 0.6 * uStorm), L, rOff, rRim, rSpec, rCover);
          grRuns(pr, m, uTime * 0.9, uRain, 1.0, L, rOff, rRim, rSpec, rCover, rClear);
          rOff /= RS;
        }
        // The bent ray leaves the pane at pO + rOff: project that point, so the pane's tilt and the head hold.
        vec3 Pr = vec3(pO + rOff, Z_OUT) - uEye;
        vec2 rPx = uRes * 0.5 + vec2(dot(Pr, uR), dot(Pr, uU)) / max(dot(Pr, uF), 1e-3) * uFocal;
        view = glass(da, rPx) + ghosts(px);
        view *= 1.0 - 0.7 * rRim;
        view += (outGlow * 3.0 + cabin * 1.2) * rSpec * 0.6;
        float ic = ice(pO, -sSk);
        view = mix(view, view * 1.3 + uGlow * 0.02 + eCol * E * 0.6 + vec3(0.004, 0.0045, 0.005), ic * 0.75);
        // The outer pane's edge glints where it meets the skin.
        view += outGlow * 0.5 * smoothstep(aaO * 2.0, 0.0, abs(sSk + 0.0015));
      }
      if (sSk > -aaO) {
        // Between the panes: the grey rubber gasket, lit through the glass.
        float gk = clamp(sSk / 0.03, 0.0, 1.0);
        vec3 gasket = alb * 0.4 * (cabin * 0.5 + outGlow * (1.5 - gk));
        if (uEnvOn > 0.5) {
          // The rubber faces in toward the opening and sees it at a grazing angle.
          vec3 nG = normalize(vec3(-normalize(pO + 1e-6), -0.3));
          gasket += alb * irr(vec3(pO, Z_IN), nG, 2) * Tdim * 4.0 * (1.0 - 0.7 * gk);
        }
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
      // Breath fogs the scratch pane; a finger's trace stays clear in new fog.
      if (uBreathOn > 0.5) {
        vec2 bm = texture(uBreath, pG / vec2(0.34, 0.56) + 0.5).rg;
        float fb = bm.r * (1.0 - 0.85 * bm.g);
        if (fb > 0.003) {
          // Tiny droplets scatter the view into a pale, soft blur.
          vec3 soft = uEnvOn > 0.5 ? texture(uEnv, px / uRes).rgb : view;
          float grain = 0.85 + 0.3 * hash12(floor(pG * 3000.0));
          vec3 haze = (mix(view, soft, 0.8) * 0.85 + cabin * 0.5 + outGlow * 0.4) * grain;
          view = mix(view, haze, smoothstep(0.0, 0.6, fb) * 0.92);
        }
      }
      // The pane mirrors the dim cabin, shifted as the head moves.
      // The shift follows the head's move from its rest pose at (-0.04, 0.06).
      vec2 rq = pG + (uEye.xy - vec2(-0.04, 0.06)) * 0.4;
      view += cabin * 0.12 * smoothstep(0.25, -0.2, rq.x + rq.y * 0.5);
      // A very faint mirror of the cabin: cove lights, bins, the far windows.
      vec4 ce = cabinEnv(vec3(da.xy, -da.z));
      view += (cabin * ce.rgb + outGlow0 * 2.0 * ce.a) * 0.05;
      // A reading light further up the cabin, as a soft warm smear.
      vec2 lq = (rq - vec2(-0.1, 0.19)) * vec2(1.0, 1.8);
      view += vec3(1.0, 0.8, 0.55) * 0.004 * exp(-dot(lq, lq) / 0.0016);
      float bh = length(pG - vec2(0.0, -INB.y * 0.72));
      view = mix(view, vec3(0.0), smoothstep(0.0028, 0.0018, bh) * 0.85);
      inner = view;
    }
    // The shade slides down its slot behind the bezel lip.
    // Its lip always shows at the head of the opening, ready to pull.
    {
      vec2 ps = at(da, SLOT);
      float ext = mix(OUTB.y, INB.y, SLOT / DEPTH);
      float edge = ext - 0.012 - uShade * (2.0 * ext - 0.012);
      float sR = sdRecess(ps, SLOT), ly = ps.y - edge;
      float aaS = fwidth(ly) * 1.2;
      if ((hit < 0.0 || hit > SLOT) && sR < 0.0 && ly > -aaS) {
        // Matte plastic with a fine grain, lit by the cabin.
        float fpS = length(vec3(ps, SLOT) - uEye) / uFocal / max(da.z, 0.15) * 1400.0;
        vec3 nS = grainN(vec3(0.0, 0.0, -1.0), ps, vec3(1.0, 0.0, 0.0), vec3(0.0, 1.0, 0.0), fpS, 0.8);
        float dS = clamp(dot(nS, Lc) / max(-Lc.z, 0.05), 0.6, 1.4);
        // Off-white plastic; daylight glows warmly through it.
        vec3 sh = alb * 1.6 * (cabin * 1.4 * mix(1.0, dS, 0.5) + outGlow0 * vec3(0.55, 0.5, 0.42));
        // The lip: a rounded bar along the lower edge, lit on top, shadowed under.
        sh *= 1.0 + 0.35 * smoothstep(0.004, 0.011, ly) * smoothstep(0.014, 0.011, ly) - 0.3 * smoothstep(0.004, 0.0, ly);
        // A finger notch in the middle of the lip.
        sh *= 1.0 - 0.45 * smoothstep(0.03, 0.022, abs(ps.x)) * smoothstep(0.011, 0.005, ly);
        // A thin line of daylight leaks round the edges in the slot.
        sh += outGlow0 * 0.5 * smoothstep(-0.003, 0.0, sR) * step(0.014, ly);
        inner = mix(inner, sh, smoothstep(-aaS, aaS, ly));
        glassK *= 1.0 - smoothstep(-aaS, aaS, ly);
      }
    }
    // Soften the step from wall to rim over about a pixel.
    float aa = fwidth(sOut) * 1.2;
    c = mix(wall, inner, smoothstep(aa, -aa, sOut));
    glassK *= smoothstep(aa, -aa, sOut);
  }
  // The seat in front stands between the eye and the wall's nose side.
  vec4 sb = seatBack(da);
  if (sb.w > 0.0) {
    vec3 P = sb.xyz;
    // Fabric: dark blue-grey with a fine weave; the headrest wears a cream cover.
    float cover = smoothstep(-0.155, -0.15, P.y);
    vec3 alS = mix(vec3(0.16, 0.17, 0.21), vec3(0.72, 0.69, 0.63), cover);
    alS *= 0.9 + 0.2 * hash12(floor(P.zy * 900.0));
    // A stitched seam rings the cover.
    alS *= 1.0 - 0.3 * smoothstep(0.003, 0.0, abs(P.y + 0.15));
    // Cabin light from above; the side by the window takes its light too.
    vec3 Ls2 = cabin * (0.7 + 0.5 * smoothstep(-0.5, 0.05, P.y)) + outGlow * 2.5 * exp((P.z + 0.03) / 0.22);
    vec3 seat = alS * Ls2;
    // The rounded edge by the wall catches a rim of window light.
    float sdS = sdBox(vec2(P.z + 0.475, P.y + 0.43), vec2(0.425, 0.47), 0.08);
    seat += outGlow * 1.5 * smoothstep(-0.02, 0.0, sdS) * smoothstep(-0.3, -0.03, P.z);
    c = mix(c, seat, sb.w);
    glassK *= 1.0 - sb.w;
  }
  // Each hour carries a small colour grade.
  c *= uTint;
  c = 1.0 - exp(-c * 3.2);
  c = flare(px, c, glassK);
  c += (hash12(px + fract(uTime * 7.13) * 911.0) - 0.5) * 0.006;
  c = pow(max(c, 0.0), vec3(1.0 / 2.2));
  // A soft S-curve for contrast, as in Beach walker's grade.
  c = mix(c, c * c * (3.0 - 2.0 * c), 0.3);
  o = vec4(c, 1.0);
}`;
