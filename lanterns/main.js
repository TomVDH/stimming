// Lantern lake: the toy's module, loaded by index.html.
import { initPage, whenVisible, reduced, stage as mark, pageReady } from '../shared/stim.js';
import { intro as playIntro } from '../shared/intro.js';
import { environment } from '../shared/environment.js';
import { createNoise2D } from 'simplex-noise';
mark('libs');

const stage = document.getElementById('stage');

playIntro({ ready: pageReady(9000) });
mark('build');

/* ---------- bar ---------- */
// The hour for each choice. The sky eases to it over 2 s.
export const HOURS = { dusk: 19.8, blue: 20.6, night: 22.5 };
// Exposure for each hour: the night needs more light to read.
const EXPO = { dusk: 1.0, blue: 1.25, night: 1.7 };
/** @type {{ time: (v: string) => void }} */
const act = { time() {} };
const qs = new URLSearchParams(location.search);
// QA can open on an hour: ?t=blue.
const first = qs.get('t') in HOURS ? qs.get('t') : 'dusk';
const ui = initPage({ id: 'lanterns', bar: {
  choice: { label: 'Time', value: first, options: [
    { value: 'dusk', label: 'Dusk', key: '1' },
    { value: 'blue', label: 'Blue hour', key: '2' },
    { value: 'night', label: 'Night', key: '3' },
  ], onPick: v => act.time(v) },
  quality: true,
} });

/* ---------- the scene ---------- */
// The eye stands on a wooded hill, 5 m over the ground, and looks down on the lake.
// The lake is a bowl about 1.4 km long; low hills and pines ring it.
// The horizon's place on the frame: a tall frame lifts it.
// A tall frame lowers it, so the slope underfoot fills less of the frame.
// How tall the frame is: 0 at 1.2 to 1 and wider, 1 at 1 to 2 and taller.
const tallOf = asp => Math.min(1, Math.max(0, (1.2 - asp) / 0.7));
const horizon = (asp, hz) => hz - 0.1 * tallOf(asp);
// Camera trials, Tom 2026-11-16: ?cam=<name> picks one; tele is the default.
// x and z place the eye; lift is its height over the ground or the water.
// hz is the horizon's place on the frame; it sets the pitch.
// yaw turns right in degrees; roll tilts the frame (a dutch angle); foc is the lens.
// fish bends the frame round: its value is the angle per frame height, in radians.
// bars crops the frame to 2.39 to 1.
export const CAMS = {
  hill: { x: 0, z: 0, lift: 5, hz: 0.72, yaw: 0, roll: 0, foc: 1.5, fish: 0, bars: 0 },
  wide: { foc: 0.7, hz: 0.66 },
  fish: { fish: 2.4, hz: 0.66, lift: 7 },
  dutch: { roll: -10, foc: 1.1, hz: 0.68 },
  tele: { foc: 4.5, hz: 0.6, yaw: 6 },
  scope: { foc: 1.25, hz: 0.66, bars: 1 },
  shore: { x: 20, z: -165, lift: 1.6, hz: 0.3, foc: 1.1 },
  along: { x: -760, z: -500, lift: 6, yaw: 66, hz: 0.66, foc: 1.1 },
  drone: { lift: 140, hz: 1.0, foc: 1.1, yaw: 4 },
};
const camName = new URLSearchParams(location.search).get('cam');
// Tom picked tele on 2026-11-16: the long lens on the far bank.
const CAM = { ...CAMS.hill, ...(CAMS[camName] || CAMS.tele) };
const SCENE = `
uniform float uMist, uHz, uBars;
// The eye: x, z and lift. The view: yaw, roll, lens and fisheye, in radians where angles.
uniform vec3 uEye;
uniform vec4 uView;
// The lake: its centre and its two radii, in metres. The eye stands at the origin.
const vec2 LC = vec2(60.0, -650.0), LR = vec2(700.0, 520.0);
// The camera: its place, then its frame. The pitch puts the horizon at uHz.
vec3 gCam, gF, gU, gR;
// The lens: a narrow frame takes a wider one.
float gFoc, gPx;
// The lane's width: a narrow frame takes a narrow lane, so pines still frame it.
float gLane;
// The sun sits a little right of the view, so the last light lies over the hills.
vec3 gSun;

float n2(vec2 p) { return wtNoised(p).x; }
// How far a point lies from the lake, in lake radii. Under 0 is water.
float coast(vec2 p) {
  vec2 q = (p - LC) / LR;
  return length(q) - 1.0 + 0.2 * (n2(p / 420.0) - 0.5) + 0.08 * (n2(p / 130.0 + 9.0) - 0.5);
}
// The ground's height in metres. The lake bed lies under the water.
float ground(vec2 p, out float s) {
  s = coast(p);
  if (s < 0.0) return -2.0 + 40.0 * s;
  // The hills rise from the shore and level off at about 110 m.
  float rise = 110.0 * (1.0 - exp(-2.5 * s)) + 70.0 * smoothstep(0.05, 0.8, s) * (n2(p / 640.0 + 3.0) - 0.35);
  return -2.0 + rise + 2.0 * smoothstep(0.0, 0.01, s);
}
// Pines grow in stands on the slopes, one cone to a 9 m cell.
// Far off, where a pixel spans a tree, the cones blend into one canopy.
float pines(vec2 p, float s, float foot) {
  if (s < 0.012) return 0.0;
  float stand = smoothstep(0.42, 0.6, n2(p / 220.0 + 31.0)) * smoothstep(0.012, 0.03, s);
  // The eye stands in a clearing.
  vec2 v = p - gCam.xz;
  // The lane runs along the view.
  v = vec2(cos(uView.x) * v.x + sin(uView.x) * v.y, -sin(uView.x) * v.x + cos(uView.x) * v.y);
  stand *= smoothstep(26.0, 40.0, length(v));
  // A lane down the slope keeps the lake clear; pines frame it at the sides.
  float lane = smoothstep(0.3 * gLane, 0.55 * gLane, abs(v.x) / max(-v.y, 1.0));
  stand *= mix(lane, 1.0, smoothstep(150.0, 220.0, length(v)));
  if (stand <= 0.0) return 0.0;
  // The grid turns 31 degrees, so no row lines up with the view.
  vec2 g = mat2(0.857, -0.515, 0.515, 0.857) * p;
  vec2 c = floor(g / 9.0);
  float hs = wtH(c + 3.0);
  vec2 at = (c + 0.5 + 0.5 * (vec2(wtH(c + 7.0), wtH(c + 11.0)) - 0.5)) * 9.0;
  float tall = (13.0 + 11.0 * hs) * stand * step(0.3, wtH(c + 5.0));
  // A slender pine in tiers: each whorl of boughs flares, then narrows.
  float r = length(g - at), base = 2.0 + 1.0 * hs;
  float y = tall * max(0.0, 1.0 - r / base), tier = tall * 0.12;
  float flare = 0.86 + 0.14 * fract((tall - y) / tier + hs);
  float tree = tall * max(0.0, 1.0 - r / (base * flare));
  // The far canopy follows the stands, not the cells, so it shows no grid.
  float canopy = stand * (4.0 + 3.0 * n2(p / 14.0) + 5.0 * n2(p / 5.0));
  return mix(tree, canopy, smoothstep(0.3, 1.5, foot));
}
float surf(vec2 p, float foot, out float s) {
  float g = ground(p, s);
  return g + pines(p, s, foot);
}
float surf(vec2 p, float foot) { float s; return surf(p, foot, s); }

// The mist's colour: the low sky that way.
vec3 mistCol(vec3 d) { return skDusk(normalize(vec3(d.x, 0.03, d.z)), gSun, uZen, uMid, uBand, uAnti) * 0.85; }
// The mist lies low and thick on the water, and drifts a little.
float mistAt(vec3 o, vec3 P) {
  float drift = 0.75 + 0.5 * n2(vec2(P.x * 0.003 + uTime * 0.01, P.z * 0.002));
  return skHaze(o, P, uMist * drift, 8.0);
}
// The sky over everything, veiled low down by the mist.
vec3 skyCol(vec3 o, vec3 d) {
  vec3 c = skSky(d, gSun, uZen, uMid, uBand, uAnti, uStars, uTime);
  vec4 cl = skCloudsN(d, gSun, uTime, uCloud, uCloudLit, uCloudShade, uCloudOct);
  c = mix(c, cl.rgb, cl.a);
  return mix(c, mistCol(d), mistAt(o, o + d * 9000.0) * 0.7);
}
// The land at P: near black, a little sky light on top, the last light on the slopes toward the sun.
vec3 landCol(vec3 o, vec3 d, vec3 P, float t, float px) {
  float e = max(2.0, t * px * 2.0), s;
  float h0 = ground(P.xz, s);
  // A pine is a plain silhouette: no last light on it.
  float tree = smoothstep(0.4, 1.5, P.y - h0);
  vec3 n = normalize(vec3(h0 - ground(P.xz + vec2(e, 0.0), s), e, h0 - ground(P.xz + vec2(0.0, e), s)));
  vec3 c = (vec3(0.004, 0.005, 0.007) + uZen * 0.05) * (0.5 + 0.5 * n.y);
  c += uBand * 0.035 * max(0.0, dot(normalize(n.xz + 1e-5), normalize(gSun.xz))) * (1.0 - n.y * 0.5) * (1.0 - tree);
  // Far hills grow pale in the haze; the low mist swallows the shore.
  c = mix(c, mistCol(d), skHaze(o, P, uMist * 0.08, 220.0));
  return mix(c, mistCol(d), mistAt(o, P));
}
// Marches a ray over the land, up to tMax.
// land: it hit. t: where. mn: its closest pass in pixels, for a soft edge. tm: where that was.
struct Hit { bool land; float t; float mn; float tm; };
Hit march(vec3 o, vec3 d, float tMax, float px, int steps) {
  Hit h = Hit(false, tMax, 1e9, tMax);
  float t = 1.0, last = 1.0;
  for (int i = 0; i < 128; i++) {
    if (i >= steps || t > tMax) break;
    vec3 P = o + d * t;
    float s, gap = P.y - surf(P.xz, t * px, s);
    if (gap < 0.0) { h.land = true; break; }
    float m = gap / (t * px);
    if (m < h.mn) { h.mn = m; h.tm = t; }
    last = t;
    // Inside the canopy band the trees are steep, so the steps shrink.
    float stride = gap < 26.0 ? max(gap * 0.12, 0.002 * t + 0.15) : max(gap * 0.45, 0.008 * t + 0.2);
    // Over open water the coast is far: stride most of the way to it.
    if (s < -0.02) stride = max(stride, -s * 300.0);
    t += stride;
  }
  if (!h.land) return h;
  // Five halvings find the edge.
  float a = last, b = t;
  for (int i = 0; i < 5; i++) {
    float m = 0.5 * (a + b);
    vec3 P = o + d * m;
    if (P.y - surf(P.xz, m * px) < 0.0) b = m; else a = m;
  }
  h.t = b;
  return h;
}
// The view along a ray that meets no water first: land, with a soft edge, or sky.
vec3 view(vec3 o, vec3 d, Hit h, vec3 base, float px) {
  if (h.land) return landCol(o, d, o + d * h.t, h.t, px);
  float cov = 1.0 - smoothstep(0.0, 1.2, h.mn);
  return cov > 0.0 ? mix(base, landCol(o, d, o + d * h.tm, h.tm, px), cov) : base;
}

// A few warm windows on the far bank. The water mirrors them.
const int NWIN = 6;
const float WINA[NWIN] = float[NWIN](-2.45, -2.4, -1.95, -1.3, -1.26, -0.72);
vec3 gWin[NWIN];
void placeWindows() {
  for (int i = 0; i < NWIN; i++) {
    float a = WINA[i];
    vec2 p = LC + LR * 1.035 * vec2(cos(a), sin(a));
    float s;
    gWin[i] = vec3(p.x, max(ground(p, s), 0.0) + 4.0 + 3.0 * wtH(vec2(float(i), 4.0)), p.y);
  }
}
// The windows seen from o along d. sx and sy set each light's spread, in radians.
vec3 windows(vec3 o, vec3 d, float sx, float sy) {
  vec3 c = vec3(0.0);
  vec3 side = normalize(cross(d, vec3(0.0, 1.0, 0.0)));
  for (int i = 0; i < NWIN; i++) {
    vec3 w = gWin[i] - o;
    float dist = length(w);
    w /= dist;
    float ax = dot(w, side), ay = w.y - d.y;
    if (dot(w, d) < 0.0 || abs(ax) > 0.03 || abs(ay) > sy * 4.0 + 0.03) continue;
    float k = (0.55 + 0.45 * wtH(vec2(float(i), 1.0))) * (1.0 - 0.6 * mistAt(o, gWin[i]));
    float core = exp(-ax * ax / (sx * sx) - ay * ay / (sy * sy)) * sx / sy;
    float halo = exp(-(ax * ax + ay * ay) / (sx * sx * 400.0));
    c += vec3(1.0, 0.52, 0.18) * k * (core * 3.0 + halo * 0.012 * uOrbs);
  }
  return c;
}


// The sky lanterns: two texels each in tLan, from the pool on the CPU.
// Texel one: place in metres, then height. Texel two: glow, lean, phase, paper fill.
uniform sampler2D tLan;
uniform float uLanN, uFlick;
// The lanterns along this pixel. q is the pixel on the frame; depth is the scene's distance.
// mir 1 draws the mirror images; sy stretches them down the water.
vec3 lanterns(vec2 q, float depth, float mir, float sy, float brk) {
  vec3 acc = vec3(0.0);
  int n = int(uLanN);
  float px = 1.0 / uRes.y;
  for (int i = 0; i < 160; i++) {
    if (i >= n) break;
    vec4 a = texelFetch(tLan, ivec2(2 * i, 0), 0);
    vec3 P = a.xyz;
    if (mir > 0.5) P.y = -P.y;
    vec3 v = P - gCam;
    float z = dot(v, gF);
    if (z < 2.0) continue;
    vec2 c = vec2(dot(v, gR), dot(v, gU)) / z * gFoc, dq = q - c;
    float s = a.w / z * gFoc;
    // Each glow fades to nothing well inside this reach, so no edge shows.
    float reach = s * 3.0 + px * 12.0;
    if (abs(dq.x) > reach || abs(dq.y) > reach + sy * 0.6 * mir) continue;
    // A lantern behind the land is hidden.
    float dist = length(v);
    if (mir < 0.5 && dist > depth + 4.0) continue;
    vec4 b = texelFetch(tLan, ivec2(2 * i + 1, 0), 0);
    // Paper lit by a flame, about 2000 K, with a small flicker.
    float fl = 1.0 + uFlick * (0.035 * sin(uTime * (20.0 + 15.0 * fract(b.z * 7.3)) + b.z * 40.0) + 0.025 * sin(uTime * 31.0 + b.z * 13.0));
    vec3 paper = vec3(1.0, 0.48, 0.15) * b.x * fl;
    // Far lanterns grow redder and dimmer through the haze.
    float hz = max(skHaze(gCam, P, uMist * 0.08, 220.0), mistAt(gCam, P) * 0.6);
    paper *= (1.0 - 0.65 * hz) * vec3(1.0, 1.0 - 0.25 * hz, 1.0 - 0.45 * hz);
    if (mir > 0.5) {
      // The mirror image: a soft streak, longer on rougher water, broken by ripples.
      float sx = max(s * 0.3, px * 1.3), sv = max(s * 0.45, px * 1.3) + sy * 0.15;
      acc += paper * exp(-dq.x * dq.x / (sx * sx) - dq.y * dq.y / (sv * sv)) * (max(s * 0.45, px * 1.3) / sv) * brk * 2.2;
      continue;
    }
    float spx = s / px;
    // Far off, a lantern is one warm point with a soft halo.
    float orb = exp(-dot(dq, dq) / (px * px * 1.3)) * clamp(spx * spx * 0.09, 0.05, 0.6) * 3.5 + exp(-dot(dq, dq) / (px * px * 14.0)) * 0.05;
    vec3 col = paper * orb;
    if (spx > 2.0) {
      // Near, it is a box of paper: wider at the top, a flame low inside.
      float cl = cos(b.y), sl = sin(b.y);
      vec2 l = vec2(cl * dq.x + sl * dq.y, -sl * dq.x + cl * dq.y) / s;
      float w = 0.27 + 0.07 * (l.y + 0.5);
      vec2 e = abs(l) - vec2(w, 0.5);
      float sd = length(max(e, 0.0)) + min(max(e.x, e.y), 0.0) - 0.04;
      float cov = smoothstep(px / s, -px / s, sd);
      float lum = mix(1.7, 0.55, clamp(l.y + 0.5, 0.0, 1.0));
      lum *= 1.0 - 0.55 * smoothstep(0.32, 0.5, l.y);
      lum *= 1.0 - 0.4 * pow(clamp(abs(l.x) / w, 0.0, 1.0), 4.0);
      float flame = exp(-(l.x * l.x * 60.0 + (l.y + 0.36) * (l.y + 0.36) * 40.0));
      vec3 box = paper * lum * (0.15 + 0.85 * b.w) * 1.5 + vec3(1.0, 0.7, 0.4) * b.x * flame * 3.0;
      // A soft halo of light round the paper.
      vec3 halo = paper * exp(-dot(dq, dq) / (s * s * 1.5)) * 0.32;
      col = mix(col, box * cov + halo, smoothstep(2.0, 4.0, spx));
    }
    acc += col;
  }
  return acc;
}

vec3 envScene(vec2 uv) {
  float asp = uRes.x / uRes.y;
  gFoc = uView.z * min(1.0, sqrt(asp / 1.2));
  float fish = uView.w;
  gPx = fish > 0.0 ? fish / uRes.y : 1.0 / (gFoc * uRes.y);
  // The letterbox: black bars above and below a 2.39 frame.
  if (uBars > 0.5 && abs(uv.y - 0.5) * 2.0 > asp / 2.39) return vec3(0.0);
  gLane = clamp(asp / 1.6, 0.3, 1.0);
  gSun = normalize(vec3(0.35 * length(uSunD.xz), uSunD.y, -length(uSunD.xz)));
  float s;
  gCam = vec3(uEye.x, max(ground(uEye.xy, s), 0.0) + uEye.z, uEye.y);
  float pitch = fish > 0.0 ? (uHz - 0.5) * fish : atan((uHz - 0.5) / gFoc);
  float cy = cos(uView.x), sy = sin(uView.x);
  gF = vec3(sy * cos(pitch), -sin(pitch), -cy * cos(pitch));
  gU = vec3(sy * sin(pitch), cos(pitch), -cy * sin(pitch));
  gR = vec3(cy, 0.0, sy);
  placeWindows();
  // The roll turns the frame about its centre.
  vec2 q = vec2((uv.x - 0.5) * asp, uv.y - 0.5);
  q = vec2(cos(uView.y) * q.x - sin(uView.y) * q.y, sin(uView.y) * q.x + cos(uView.y) * q.y);
  vec3 dc;
  if (fish > 0.0) {
    // An even fisheye: the angle off the axis grows with the distance from the centre.
    float r = length(q) + 1e-6, th = min(r * fish, 3.1);
    dc = vec3(q / r * sin(th), cos(th));
  } else dc = vec3(q, gFoc);
  vec3 d = normalize(gR * dc.x + gU * dc.y + gF * dc.z);
  float tw = d.y < 0.0 ? gCam.y / -d.y : 9000.0;
  Hit h = march(gCam, d, min(tw, 9000.0), gPx, 128);
  vec3 base;
  if (d.y >= 0.0 || h.land) base = skyCol(gCam, d);
  else {
    // water.js: slow ripples tilt the mirror.
    vec3 P = gCam + d * tw;
    vec2 p = P.xz;
    P.y = 0.0;
    float sig2, foot = wtFoot(tw, -d.y, uRes.y * gFoc);
    vec2 slope = wtWavesN(p, uTime, foot, uSwell, uChop, uSets, uOct, sig2);
    vec3 n = wtNormal(slope);
    vec3 r = reflect(d, n);
    r.y = abs(r.y);
    float F = wtFresnel(d, n), rough = sqrt(sig2);
    // The mirror: the same land and sky, softened by the ripples.
    float blur = 0.003 + 1.5 * rough;
    Hit hr = march(P, r, 7000.0, gPx + blur, 48);
    vec3 refl = view(P, r, hr, skyCol(P, r), gPx + blur);
    // Each window smears into a tall streak; rougher water makes it longer.
    refl += windows(P, r, gPx * 1.5, gPx * 1.5 + 2.0 * rough);
    // Each lantern burns twice: once in the air, once in the lake.
    if (uLanN > 0.0) refl += lanterns(q, 0.0, 1.0, 2.0 * rough * gFoc, clamp(1.0 + slope.y * 9.0, 0.15, 1.7));
    base = mix(vec3(0.0015, 0.0025, 0.004) + uZen * 0.02, refl, F);
    base = mix(base, mistCol(d), mistAt(gCam, P));
  }
  float depth = h.land ? h.t : d.y < 0.0 ? tw : 1e6;
  vec3 c = view(gCam, d, h, base, gPx) + windows(gCam, d, gPx * 1.2, gPx * 1.2);
  if (uLanN > 0.0) c += lanterns(q, depth, 0.0, 0.0, 1.0);
  return c;
}`;

/* ---------- state ---------- */
let visible = true, awake = true, sleepAt = 0, target = HOURS[first];
const canvas = document.createElement('canvas');
stage.prepend(canvas);
const tall = () => tallOf(canvas.clientWidth / Math.max(1, canvas.clientHeight));

/* ---------- the land, on the CPU ---------- */
// These mirror the shader's wtH, wtNoised, coast and ground, so a tap finds the shore.
const fract = x => x - Math.floor(x);
function hash(x, y) {
  let a = fract(x * 0.1031), b = fract(y * 0.1031), c = fract(x * 0.1031);
  const d = a * (b + 33.33) + b * (c + 33.33) + c * (a + 33.33);
  a += d; b += d; c += d;
  return fract((a + b) * c);
}
function noise(x, y) {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
  const a = hash(ix, iy), b = hash(ix + 1, iy), c = hash(ix, iy + 1), d = hash(ix + 1, iy + 1);
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}
const smooth = (e0, e1, x) => { const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };
function coast(x, z) {
  return Math.hypot((x - 60) / 700, (z + 650) / 520) - 1 + 0.2 * (noise(x / 420, z / 420) - 0.5) + 0.08 * (noise(x / 130 + 9, z / 130 + 9) - 0.5);
}
function ground(x, z) {
  const s = coast(x, z);
  if (s < 0) return -2 + 40 * s;
  return -2 + 110 * (1 - Math.exp(-2.5 * s)) + 70 * smooth(0.05, 0.8, s) * (noise(x / 640 + 3, z / 640 + 3) - 0.35) + 2 * smooth(0, 0.01, s);
}
// The camera, as the shader builds it.
function camera() {
  const cw = Math.max(1, canvas.clientWidth), ch = Math.max(1, canvas.clientHeight), asp = cw / ch;
  const foc = CAM.foc * Math.min(1, Math.sqrt(asp / 1.2)), hz = horizon(asp, CAM.hz);
  const pitch = CAM.fish > 0 ? (hz - 0.5) * CAM.fish : Math.atan((hz - 0.5) / foc);
  const yaw = (CAM.yaw + 6 * tall()) * Math.PI / 180, cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
  return {
    asp, foc, roll: CAM.roll * Math.PI / 180,
    eye: [CAM.x, Math.max(ground(CAM.x, CAM.z), 0) + CAM.lift, CAM.z],
    F: [sy * cp, -sp, -cy * cp], U: [sy * sp, cp, -cy * sp], R: [cy, 0, sy],
  };
}
// The view ray through a point on the frame; u and v run 0 to 1 from the bottom left.
function rayAt(u, v) {
  const c = camera();
  let qx = (u - 0.5) * c.asp, qy = v - 0.5;
  [qx, qy] = [Math.cos(c.roll) * qx - Math.sin(c.roll) * qy, Math.sin(c.roll) * qx + Math.cos(c.roll) * qy];
  let dc = [qx, qy, c.foc];
  if (CAM.fish > 0) {
    const r = Math.hypot(qx, qy) + 1e-6, th = Math.min(r * CAM.fish, 3.1);
    dc = [qx / r * Math.sin(th), qy / r * Math.sin(th), Math.cos(th)];
  }
  const d = [0, 1, 2].map(k => c.R[k] * dc[0] + c.U[k] * dc[1] + c.F[k] * dc[2]), l = Math.hypot(...d);
  return { eye: c.eye, d: d.map(x => x / l) };
}
// Where a lantern lifts from: the land or water under the tap.
// A tap on the sky finds the far shore under that point.
function launchAt(u, v) {
  const { eye, d } = rayAt(u, v);
  let t = 5;
  for (let i = 0; i < 500 && t < 6000; i++) {
    const x = eye[0] + d[0] * t, y = eye[1] + d[1] * t, z = eye[2] + d[2] * t, h = Math.max(ground(x, z), 0);
    if (y < h) return [x, h, z];
    t += Math.max((y - h) * 0.5, 0.01 * t + 0.3);
  }
  const l = Math.hypot(d[0], d[2]), ax = d[0] / l, az = d[2] / l;
  let wet = false;
  for (let r = 40; r < 4000; r += 8) {
    const x = eye[0] + ax * r, z = eye[2] + az * r;
    if (coast(x, z) < 0) wet = true;
    else if (wet) return [x, Math.max(ground(x, z), 0), z];
  }
  return [eye[0] + ax * 1100, 0, eye[2] + az * 1100];
}

/* ---------- the lanterns, on the CPU ---------- */
// A pool of sky lanterns. The cap follows the detail level.
const CAPS = [64, 120, 160], MAXN = 160;
/** @type {{ p: number[], v: number[], age: number, life: number, size: number, phase: number, lean: number, leanV: number }[]} */
export const pool = [];
const wind = createNoise2D();
let simT = 0, windSpeed = 1.6;
// One lantern lifts from the land or water under a point on the frame.
export function release(u, v) {
  if (pool.length >= (CAPS[env.detail.level] ?? MAXN)) pool.shift();
  const at = launchAt(u, v), j = () => (Math.random() - 0.5) * 6;
  pool.push({
    // No two start in one place, so a held press never stacks them.
    p: [at[0] + j(), at[1] + 0.9, at[2] + j()], v: [0, 0, 0],
    age: 0, life: 60 + 40 * Math.random(),
    // No two share a size, a flicker or a sway.
    size: 1.4 * (0.85 + 0.3 * Math.random()), phase: Math.random() * 100, lean: 0, leanV: 0,
  });
  wake();
  env.touch();
}
// The glow of one lantern: a flare as it catches, steady, then an ember that goes out.
function glowOf(L) {
  const flare = 1 + 1.4 * Math.exp(-L.age / 0.12);
  const out = L.age < L.life ? 1 : Math.max(0, 1 - (L.age - L.life) / 6);
  return flare * (0.08 + 0.92 * out * out) * (L.age < L.life + 6 ? 1 : Math.max(0, 1 - (L.age - L.life - 6) / 2));
}
export function stepLanterns(dt) {
  const slow = reduced() ? 0.5 : 1;
  dt *= slow;
  simT += dt;
  for (let i = pool.length - 1; i >= 0; i--) {
    const L = pool[i];
    L.age += dt;
    if (L.age > L.life + 8) { pool.splice(i, 1); continue; }
    // Lift: the flame's heat climbs to about 1.3 m/s; an ember barely rises.
    const heat = L.age < L.life ? 1 : Math.max(0, 1 - (L.age - L.life) / 6);
    const up = 0.15 + 1.15 * heat * Math.min(1, L.age / 4);
    L.v[1] += (up - L.v[1]) * (1 - Math.exp(-dt / 2.5));
    // Wind: the slider speed plus slow gusts, stronger with height.
    const lift = 0.45 + 0.55 * Math.min(1, L.p[1] / 90);
    const g = wind(simT * 0.04 + L.phase, L.p[1] * 0.01);
    const wx = windSpeed * lift * (1 + 0.35 * g), wz = -windSpeed * lift * 0.35 * (1 + 0.5 * wind(L.phase, simT * 0.03));
    const k = 1 - Math.exp(-dt / 5);
    L.v[0] += (wx - L.v[0]) * k;
    L.v[2] += (wz - L.v[2]) * k;
    for (let a = 0; a < 3; a++) L.p[a] += L.v[a] * dt;
    // Sway: the lean is a damped pendulum, pushed by the wind against the lift.
    if (slow < 1) { L.lean = 0; continue; }
    const want = Math.max(-0.3, Math.min(0.3, -(wx - L.v[0]) * 0.25 + 0.04 * Math.sin(simT * 0.8 + L.phase)));
    L.leanV += ((want - L.lean) * 5 - L.leanV * 1.2) * dt;
    L.lean += L.leanV * dt;
  }
}
// The pool goes to the GPU as one small float texture each frame.
const lanData = new Float32Array(MAXN * 8);
let lanTex = null;
function lanTexture() {
  const gl = env.gl;
  if (!lanTex) {
    lanTex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, lanTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, MAXN * 2, 1, 0, gl.RGBA, gl.FLOAT, null);
    for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.NEAREST], [gl.TEXTURE_MAG_FILTER, gl.NEAREST], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
  }
  pool.forEach((L, i) => {
    const o = i * 8;
    lanData[o] = L.p[0]; lanData[o + 1] = L.p[1]; lanData[o + 2] = L.p[2]; lanData[o + 3] = L.size;
    lanData[o + 4] = glowOf(L); lanData[o + 5] = L.lean; lanData[o + 6] = L.phase; lanData[o + 7] = Math.min(1, L.age / 1.0);
  });
  gl.bindTexture(gl.TEXTURE_2D, lanTex);
  if (pool.length) gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, pool.length * 2, 1, gl.RGBA, gl.FLOAT, lanData);
  return lanTex;
}
let env = null;
try {
  env = environment(canvas, {
    scene: SCENE,
    // The loop sleeps 60 s after the last input; the last frame stays.
    active: () => visible && awake,
    onFrame: raw => step(Math.min(raw, 0.05)),
    textures: { tLan: lanTexture },
    uniforms: {
      uLanN: () => pool.length,
      uFlick: () => (reduced() ? 0 : 1),
      uMist: () => 0.003,
      uHz: () => horizon(canvas.clientWidth / Math.max(1, canvas.clientHeight), CAM.hz),
      uEye: () => [CAM.x, CAM.z, CAM.lift],
      // A tall frame turns a little right, so the lit windows stay in it.
      uView: () => [(CAM.yaw + 6 * tall()) * Math.PI / 180, CAM.roll * Math.PI / 180, CAM.foc, CAM.fish],
      uBars: () => CAM.bars,
    },
  });
} catch (err) {
  /** @type {HTMLElement} */ (stage.querySelector('.fail')).hidden = false;
  ui.hideControls?.();
  mark('first-frame');
  throw err;
}
const S = env.state;
// A calm lake under a clear sky. No pane, no rain, no key light.
Object.assign(S, { hour: target, swell: 0.006, chop: 0.05, sets: 0.3, rings: 0, air: 0, clouds: 0.2, stars: 1, haze: 0.4, bloom: 0.45, thr: 0.8, orbs: 1, vig: 0.45, grain: 0.035, expo: EXPO[first], flGain: 0 });
Object.assign(S.on, { glass: false, air: false, flare: false });
S.lightColor = [0, 0, 0];
S.frame = false;
let expoTarget = EXPO[first];

function step(dt) {
  // The sky and the exposure ease to the chosen hour.
  const k = 1 - Math.exp(-dt / 0.6);
  S.hour += (target - S.hour) * k;
  S.expo += (expoTarget - S.expo) * k;
  stepLanterns(dt);
  // The loop sleeps once the sky is empty and no one has touched it for 60 s.
  if (performance.now() > sleepAt && !pool.length) awake = false;
}
// Any input wakes the loop for another 60 s.
function wake() {
  sleepAt = performance.now() + 60000;
  if (!awake) { awake = true; env.touch(); }
}
act.time = v => {
  target = HOURS[v];
  expoTarget = EXPO[v];
  // With motion off, the sky changes at once.
  if (reduced()) { S.hour = target; S.expo = expoTarget; }
  wake();
  env.touch();
};
for (const ev of ['pointerdown', 'pointermove', 'keydown']) stage.addEventListener(ev, wake, { passive: true });
// A tap sets one lantern free from under that point.
canvas.addEventListener('pointerdown', e => {
  if (e.button !== 0) return;
  const r = canvas.getBoundingClientRect();
  release((e.clientX - r.left) / r.width, 1 - (e.clientY - r.top) / r.height);
  if (reduced()) still();
});
// With motion off the runner draws no loop, so the lanterns get their own.
let stillOn = false;
function still() {
  if (stillOn) return;
  stillOn = true;
  let last = performance.now();
  const tick = now => {
    step(Math.min(0.05, (now - last) / 1000));
    last = now;
    env.draw();
    if (pool.length && visible) requestAnimationFrame(tick);
    else stillOn = false;
  };
  requestAnimationFrame(tick);
}
new ResizeObserver(wake).observe(stage);

/* ---------- start ---------- */
// QA: ?lan=10 starts with ten lanterns already in the air.
const preset = Math.min(MAXN, +(qs.get('lan') || 0));
for (let i = 0; i < preset; i++) {
  release(0.15 + 0.7 * Math.random(), 0.2 + 0.25 * Math.random());
  for (let k = 0; k < 40; k++) stepLanterns(0.1);
}
wake();
env.draw();
canvas.classList.add('on');
mark('first-frame');
// A hidden tab stops the loop and the clock.
whenVisible(stage, v => {
  visible = v;
  if (v) env.touch();
});
