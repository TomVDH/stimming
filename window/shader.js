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
uniform vec2 uRes, uOutRes; uniform float uTime, uTowns, uFocal, uCover, uFlash, uCirrus;
uniform int uDeckSteps, uTowSteps, uTowOct, uLightSteps; uniform float uTowStep, uMid, uAurora;
uniform highp sampler3D uNoise;
uniform vec2 uCam;
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
uniform vec4 uFl[${MAXFL}];
// Trail points live in a 128 by 2 float texture: row 0 point and radius, row 1 colour and shell.
uniform highp sampler2D uTrail; uniform int uTrN;
// The passing jet's body, and the impact's fireball dome.
uniform vec3 uJetF0, uJetF1, uJetW0, uJetW1, uJetT0, uJetT1; uniform float uJetOn;
// The impact's fireball: centre and radius; colour and glow; squash and life.
uniform vec4 uBall, uBallC, uBallS;
// The impact: site xz, shock ring radius, ring strength; then flash light, crater glow.
uniform vec4 uBoom; uniform vec2 uBoomL;
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
  return g * 0.83;
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
  // Fields: a patchwork that catches the sky light.
  vec2 fp = floor(vec2(w.x * 1.7 + w.y * 0.4, w.y * 2.4 - w.x * 0.3));
  float parcel = 0.45 + 0.9 * hash12(fp);
  vec3 g = uAmb * 0.005 * parcel * (0.7 + 0.6 * fbm(w / 9.0, 3));
  g += uSunL * 0.004 * parcel * max(uSun.y, 0.0);
  // The impact lights the land round it; the crater glows on for minutes.
  g += boomLight(w, 45.0) * 0.25;
  if (uBoomL.y > 0.0) { vec2 cq = w - uBoom.xy; g += vec3(1.0, 0.4, 0.1) * uBoomL.y * 0.6 * exp(-dot(cq, cq) / 3.0); }
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

/* The deck: stratocumulus at 1.5 to 3.7 km, fully volumetric. */
const float DECK_LO = 1.45, DECK_HI = 3.8, SIG = 9.0;
// Deck density at p = (map x, height, map z) in km, from 0 to 1.
// fine adds the Worley erosion that frays the edges.
float deckDens(vec3 p, float lod, bool fine) {
  vec2 w = p.xz + vec2(uTime * 0.012, 0.0);
  float c = smoothstep(uCover - 0.1, uCover + 0.14, coverAt(w, 70.0, 0.13));
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
  // Plain random jitter: structured jitter ripples on long grazing paths.
  float t = t0 + ds * hash12(gl_FragCoord.xy);
  // Town light under the deck, sampled at both ends of the segment.
  float ua = townDome(uCam + d.xz * t0), ub = townDome(uCam + d.xz * t1);
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
  float c = smoothstep(0.66 - uMid * 0.18, 0.86 - uMid * 0.18, coverAt(w, 55.0, 0.71)) * step(0.01, uMid);
  if (c <= 0.0) return 0.0;
  float hgt = smoothstep(5.2, 5.45, p.y) * smoothstep(6.1, 5.75, p.y);
  vec4 n = cn(vec3(w.x * 1.0, p.y * 3.0, w.y * 1.6), 6.0, lod);
  return clamp((n.r * hgt - (1.0 - c)) / max(c, 0.05) - (n.b * 0.3), 0.0, 1.0);
}
vec4 midLayer(vec3 d) {
  vec2 seg = shellSeg(d, 5.2, 6.1);
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
    float dn = midDens(p, lodAt(t, 6.0) + 0.5);
    if (dn > 0.002) {
      // Thin cloud: one tap toward the light is enough.
      float Tl = exp(-SIG * 0.6 * midDens(p + uSun * 0.3, lodAt(t, 6.0) + 1.5) * 0.3);
      vec3 S = uSunL * 0.05 * sunK * Tl * mix(1.0, phase, 0.45) + uAmb * 0.03;
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
  vec2 w = uCam + (vec3(0.0, R + H, 0.0) + d * tg).xz;
  // Ground footprint of one pixel, in km, grows at grazing angles.
  float fw = tg / focal1 / max(-d.y, 0.03);
  vec4 cl = deck(d), ml = midLayer(d);
  gDeckT = cl.a;
  // Ground under thick cloud never shows, so it costs nothing.
  vec3 g = cl.a * ml.a > 0.002 ? ground(w, fw) : vec3(0.0);
  g = g * cl.a + cl.rgb;
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
    // A negative seed marks the impact's mushroom cloud: it glows orange, and haze touches it less.
    bool boom = b.x < 0.0;
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
        S += vec3(1.0, 0.5, 0.2) * b.w * 0.05 * exp(-(p.y - 2.0) / (boom ? 9.0 : 1.5));
        // Lightning lights the volume from inside.
        vec3 q = p - pf;
        S += (boom ? vec3(1.0, 0.55, 0.25) : vec3(0.72, 0.74, 1.0)) * f.w * 1.6 * exp(-length(q) / (boom ? 6.0 : 1.8));
        float al = 1.0 - exp(-2.6 * dn * uTowStep);
        col += Tc * S * al;
        Tc *= 1.0 - al;
        if (Tc < 0.05) break;
      }
      t += uTowStep;
    }
    if (tIn < 0.0) continue;
    float fog = (1.0 - exp(-tIn / 160.0)) * (boom ? 0.35 : 1.0);
    col = col * (1.0 - fog) + haze * (1.0 - Tc) * fog;
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
  if (tw < 1e5) { o = vec4(wingCol(d, nW, uvW, tw, E, uStrobe), 0.0); return; }
  float skyA;
  vec3 c = outside(d, uFocal * uOutRes.x / uRes.x, skyA);
  float tg = hitLayer(d, 0.0);
  c = towers(d, tg > 0.0 ? tg : 1e4, c, skyA);
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
  if (uTrN > 1) c += trails(d, tg > 0.0 ? tg : 1e4);
  float tNear = tw;
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
      tNear = tf; skyA = 0.0;
    }
  }
  o = vec4(c, skyA);
}`;

/* ---------- pass 2: cabin, frame and glass ---------- */
export const cabinFS = ({ ALT, WIN }) => `#version 300 es
precision highp float;
${common({ ALT, WIN })}
uniform vec2 uRes; uniform float uTime, uDpr, uFocal, uFlash, uDimE, uDimC, uRain;
uniform vec3 uF, uR, uU;
uniform int uSteps;
uniform sampler2D uOut;
uniform vec3 uGlow, uSun, uDisc, uTint, uTip, uCabin; uniform float uSunR, uSquash, uMoon, uStars, uStrobe;
uniform vec4 uFlr[10]; uniform vec4 uFlrC[10];
uniform vec3 uMetA, uMetB; uniform vec4 uMet, uMetF;
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
      s += uFlrC[i].rgb * fl.z * line * exp(-al * al * 90.0) * exp(-dist / (uRes.y * 0.1)) * 0.22;
    }
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
// Rain on the outer pane, after the train ride's window.
// Still beads: one per cell, by chance.
// xy is the spot inside the drop, z its radius in metres, w its weight.
vec4 rainBead(vec2 p, float sc, float dens, float seed) {
  vec2 g = p * sc, i = floor(g), f = fract(g);
  if (hash12(i + seed) > dens) return vec4(0.0);
  vec2 o = 0.25 + 0.5 * hash22(i + seed * 3.0);
  float r = 0.06 + 0.14 * hash12(i + seed + 5.0);
  vec2 dv = (f - o) / r;
  if (dot(dv, dv) > 1.0) return vec4(0.0);
  return vec4(dv, r / sc, 1.0);
}
// Running drops: the airflow drives them aft in lanes, fast heads with thin trails.
vec4 rainRun(vec2 p, vec2 m, float flow, float Wc, float keep, float seed) {
  vec2 ax = vec2(-m.y, m.x);
  float u = dot(p, ax), v = dot(p, m);
  float col = floor(u / Wc);
  float h = hash12(vec2(col, seed));
  if (h > keep) return vec4(0.0);
  // Gusts make each run wander across its lane.
  float fu = (fract(u / Wc) - 0.5) * Wc + sin(v * 60.0 + h * 40.0) * 0.0015 + (h - 0.5) * Wc * 0.4;
  float sp = 0.6 + 0.8 * hash12(vec2(col, seed + 7.0));
  float head = mod(flow * sp + h * 17.0, 1.6) - 0.8;
  float dv = v - head;
  float hr = 0.0016 + 0.0016 * h;
  vec2 q = vec2(fu / hr, dv / (hr * 1.6));
  if (dot(q, q) < 1.0) return vec4(ax * q.x + m * q.y, hr * 1.2, 1.0);
  // Behind the head, a thin thread breaks into small beads.
  float tl = 0.1 + 0.12 * h;
  if (dv < 0.0 && dv > -tl) {
    float age = -dv / tl;
    float cell = v * 260.0 + h * 9.0;
    vec2 tb = vec2(fu / 0.0008, (fract(cell) - 0.5) * 2.4);
    if (hash12(vec2(col, floor(cell))) > 0.55 && dot(tb, tb) < 1.0) return vec4(ax * tb.x + m * tb.y, 0.0008, 0.7);
    float tw = 0.0008 * (1.0 - 0.6 * age);
    if (abs(fu) < tw) return vec4(ax * (fu / tw), tw, 0.8 * (1.0 - age));
  }
  return vec4(0.0);
}
// A drop acts as a lens: it flips the view behind it, and its edge reads dark.
void rainLens(vec4 b, inout vec2 off, inout float rim, inout float spec) {
  if (b.w <= 0.0) return;
  float dd = dot(b.xy, b.xy), h = sqrt(max(1.0 - dd, 0.0));
  off -= b.xy / max(h, 0.2) * b.z * 4.0 * b.w;
  rim = max(rim, b.w * smoothstep(0.45, 0.98, dd));
  vec3 N = normalize(vec3(b.xy, h * 1.4));
  spec = max(spec, b.w * pow(max(dot(N, vec3(-0.3, 0.6, 0.74)), 0.0), 60.0));
}

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
      a += mix(col, col * ORANGE, 0.4) * exp(-gr * gr) * gs.z * 0.12 * (0.3 + 0.7 * streak);
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
  // Cabin mood light, set per hour: amber, deep night blue, or dawn rose.
  vec3 cabin = uCabin;
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
        // Through the skin opening: the outside, then rain and ice on the outer pane.
        vec2 rOff = vec2(0.0);
        float rRim = 0.0, rSpec = 0.0;
        if (uRain > 0.0) {
          vec2 m = normalize(vec2(-1.0, -0.12));
          rainLens(rainBead(pO, 70.0, 0.32 * uRain, 1.0), rOff, rRim, rSpec);
          rainLens(rainBead(pO + 0.37, 160.0, 0.36 * uRain, 2.0), rOff, rRim, rSpec);
          rainLens(rainBead(pO + 0.71, 380.0, 0.42 * uRain, 3.0), rOff, rRim, rSpec);
          rainLens(rainRun(pO, m, uTime * 0.9, 0.01, 0.8 * uRain, 4.0), rOff, rRim, rSpec);
          rainLens(rainRun(pO * 1.3 + 0.2, m, uTime * 0.9, 0.01, 0.7 * uRain, 5.0), rOff, rRim, rSpec);
        }
        // The pane sits about 0.44 m from the eye.
        vec2 rPx = px + vec2(dot(vec3(rOff, 0.0), uR), dot(vec3(rOff, 0.0), uU)) * uFocal / 0.44;
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
      // The pane mirrors the dim cabin, shifted as the head moves.
      // The shift follows the head's move from its rest pose at (-0.04, 0.06).
      vec2 rq = pG + (uEye.xy - vec2(-0.04, 0.06)) * 0.4;
      view += cabin * 0.12 * smoothstep(0.25, -0.2, rq.x + rq.y * 0.5);
      // A reading light further up the cabin, as a soft warm smear.
      vec2 lq = (rq - vec2(-0.1, 0.19)) * vec2(1.0, 1.8);
      view += vec3(1.0, 0.8, 0.55) * 0.004 * exp(-dot(lq, lq) / 0.0016);
      // A ghost of the bezel's far rim, just inside the pane's edge.
      float gr = sdBox(rq * 1.02, INB, RIN);
      view += cabin * 0.22 * smoothstep(0.005, 0.0, abs(gr + 0.01)) * smoothstep(-0.05, 0.15, rq.y);
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
