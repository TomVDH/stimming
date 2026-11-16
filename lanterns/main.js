// Lantern lake: the toy's module, loaded by index.html.
import { initPage, whenVisible, reduced, audioKit, sound, oklchLinear, onQuality, stage as mark, pageReady } from '../shared/stim.js';
import { intro as playIntro } from '../shared/intro.js';
import { environment } from '../shared/environment.js';
import { swellHeight } from '../shared/water.js';
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
// The mist's density on the water, per metre at the surface.
const MIST = { off: 0.0004, light: 0.003, thick: 0.007 };
/** @type {{ time: (v: string) => void, festival: () => void, clear: () => void, wind: (v: number) => void, redraw: () => void }} */
const act = { time() {}, festival() {}, clear() {}, wind() {}, redraw() {} };
const qs = new URLSearchParams(location.search);
// The hour and the wind persist; storage may be off, so each read is guarded.
const saved = (k, d) => { try { return localStorage.getItem(`stimming.lanterns.${k}`) ?? d; } catch (err) { return d; } };
const save = (k, v) => { try { localStorage.setItem(`stimming.lanterns.${k}`, String(v)); } catch (err) { /* Storage is off. */ } };
// QA can open on an hour: ?t=blue.
const firstSaved = saved('time', 'dusk');
const first = qs.get('t') in HOURS ? qs.get('t') : firstSaved in HOURS ? firstSaved : 'dusk';
const ui = initPage({ id: 'lanterns', bar: {
  choice: { label: 'Time', value: first, options: [
    { value: 'dusk', label: 'Dusk', key: '1' },
    { value: 'blue', label: 'Blue hour', key: '2' },
    { value: 'night', label: 'Night', key: '3' },
  ], onPick: v => act.time(v) },
  actions: [
    { verb: 'festival', key: 'space', onPress: () => act.festival() },
    { verb: 'clear', onPress: () => act.clear() },
  ],
  // Calm: they rise nearly straight. Breezy: they lean and run sideways.
  slider: { label: 'Wind', min: 0, max: 1, step: 0.01, value: +saved('wind', 0.4), onInput: v => act.wind(v) },
  settings: [
    { type: 'choice', id: 'mist', label: 'Mist', value: 'light', persist: true, options: [
      { value: 'off', label: 'Off' }, { value: 'light', label: 'Light' }, { value: 'thick', label: 'Thick' },
    ], onPick: () => act.redraw() },
    { type: 'toggle', id: 'letterbox', label: 'Letterbox', value: false, persist: true, onToggle: () => act.redraw() },
  ],
  // Tuning for the people who build the toy; the Dev button shows with ?dev.
  dev: [
    { type: 'slider', id: 'hue', label: 'Paper hue', min: 30, max: 80, step: 1, value: 55, persist: true, onInput: () => act.redraw() },
    { type: 'slider', id: 'flicker', label: 'Flicker', min: 0, max: 3, step: 0.05, value: 1, persist: true },
    { type: 'slider', id: 'rise', label: 'Rise speed', min: 0.3, max: 2.5, step: 0.05, value: 1, persist: true },
    { type: 'slider', id: 'burn', label: 'Burn time', min: 20, max: 160, step: 5, value: 60, persist: true },
    { type: 'slider', id: 'cap', label: 'Lantern cap', min: 8, max: 160, step: 1, value: 160, persist: true },
  ],
  quality: true,
  keys: [['click', 'release'], ['hold', 'many'], ['drag', 'look'], ['space', 'festival']],
} });

// A row's value: its stored or default value, from Settings or Dev.
const row = (id, d) => ui.setting?.(id)?.value ?? d;

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
// The paper's colour, lit from inside: linear light from the Dev hue.
uniform vec3 uPaper;
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
    // A lantern on the water skips the test: the water under it would hide its base.
    if (mir < 0.5 && dist > depth + 4.0 && a.y > 1.5) continue;
    vec4 b = texelFetch(tLan, ivec2(2 * i + 1, 0), 0);
    // Paper lit by a flame, about 2000 K, with a small flicker.
    float fl = 1.0 + uFlick * (0.035 * sin(uTime * (20.0 + 15.0 * fract(b.z * 7.3)) + b.z * 40.0) + 0.025 * sin(uTime * 31.0 + b.z * 13.0));
    vec3 paper = uPaper * b.x * fl;
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
let visible = true, sleepAt = 0, target = HOURS[first];
const canvas = document.createElement('canvas');
stage.prepend(canvas);
const tall = () => tallOf(canvas.clientWidth / Math.max(1, canvas.clientHeight));
// The drag's look: yaw in degrees, tilt as a shift of the horizon.
const look = { yaw: 0, tilt: 0 };

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
  const foc = CAM.foc * Math.min(1, Math.sqrt(asp / 1.2)), hz = horizon(asp, CAM.hz) + look.tilt;
  const pitch = CAM.fish > 0 ? (hz - 0.5) * CAM.fish : Math.atan((hz - 0.5) / foc);
  const yaw = (CAM.yaw + 6 * tall() + look.yaw) * Math.PI / 180, cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
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
  return shoreUnder(eye, d);
}
// The far shore under a view ray: the first land past open water, along the ray's bearing.
function shoreUnder(eye, d) {
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
// A pool of lanterns, in the air and on the water. The cap follows the detail level.
const CAPS = [64, 120, 160], MAXN = 160;
/**
 * One lantern. fade is how long it takes to go out; float marks one on the water.
 * @typedef {{ p: number[], v: number[], age: number, life: number, fade: number, size: number, phase: number, lean: number, leanV: number, rate: number, float: boolean, fest: boolean, from?: number }} Lantern
 */
/** @type {Lantern[]} */
export const pool = [];
const wind = createNoise2D();
// The Wind slider: 0 is calm, 1 is about 4 m/s.
const windOf = v => 0.15 + 3.85 * v * v;
let simT = 0, windSpeed = windOf(+saved('wind', 0.4));
// The festival: how long it has run, how many it has let go, and its river's line.
const FEST_N = 80, FEST_T = 6;
let fest = null;
/** @param {number[]} at @param {boolean} float @param {boolean} [inFest] */
function add(at, float, inFest = false) {
  // At the cap the oldest burning lantern fades out in 0.5 s; none vanishes at once.
  const cap = Math.min(CAPS[env.detail.level] ?? MAXN, row('cap', MAXN));
  let burning = pool.reduce((n, L) => n + (L.age < L.life ? 1 : 0), 0);
  for (const L of pool) {
    if (burning < cap) break;
    if (L.age < L.life) { L.life = L.age; L.fade = 0.5; burning--; }
  }
  // The texture holds MAXN; only past that does the oldest go at once.
  while (pool.length >= MAXN) pool.shift();
  // No two start in one place, so a held press never stacks them.
  // A sky lantern starts within 12 m of the spot: about 40 px at the far shore.
  const j = () => (Math.random() - 0.5) * (float ? 3 : 24);
  pool.push({
    p: [at[0] + j(), float ? 0.3 : at[1] + 0.9, at[2] + j()], v: [0, 0, 0],
    age: 0, life: row('burn', 60) * (float ? 1.5 + 0.8 * Math.random() : 1 + 0.66 * Math.random()), fade: 6,
    // No two share a size, a flicker or a sway.
    size: (float ? 0.7 : 1.4) * (0.85 + 0.3 * Math.random()), phase: Math.random() * 100, lean: 0, leanV: 0,
    // Each flame lifts its paper at its own rate, so a crowd strings out.
    rate: 0.7 + 0.6 * Math.random(),
    float, fest: inFest,
  });
}
// A tap on the water sets a lantern afloat there; anywhere else one lifts into the air.
// kind 'sky' always lifts one, from the shore under the point if the point is on the water.
export function release(u, v, kind = 'auto') {
  const at = launchAt(u, v), wet = at[1] <= 0 && coast(at[0], at[2]) < 0;
  if (wet && kind === 'auto') add(at, true);
  // A sky lantern lifts from the water's edge, in front of the trees, so it shows at once.
  else { const { eye, d } = rayAt(u, v); add(shoreUnder(eye, d), false); }
  releaseSound(u, wet && kind === 'auto', false);
  wake();
}
// Festival: eighty lanterns lift along the far shore over 6 s.
export function festival() {
  // The river's line: the shore under the middle of the frame.
  const r0 = rayAt(0.5, 0.5), mid = shoreUnder(r0.eye, r0.d);
  fest = { t: 0, n: 0, x: mid[0], z: mid[2] };
  wake();
}
// Clear: every lantern goes out within 1.5 s, in no fixed order.
export function clearAll() {
  fest = null;
  for (const L of pool) {
    if (L.fade <= 0.5) continue;
    // A burning lantern starts out within 1 s; an ember fades from its own glow now.
    const from = glowOf(L);
    if (L.age < L.life) L.life = Math.min(L.life, L.age + Math.random());
    else { L.life = L.age; L.from = from; }
    L.fade = 0.5;
  }
  wake();
}
// The glow of one lantern: a flare as it catches, steady, then an ember that goes out.
function glowOf(L) {
  const flare = 1 + 1.4 * Math.exp(-L.age / 0.12);
  if (L.age < L.life) return flare;
  const out = Math.max(0, 1 - (L.age - L.life) / L.fade);
  // A cleared lantern goes straight out from its glow; a spent one keeps an ember for 2 s.
  if (L.fade < 6) return (L.from ?? 1) * out * out;
  return (0.08 + 0.92 * out * out) * (L.age < L.life + L.fade ? 1 : Math.max(0, 1 - (L.age - L.life - L.fade) / 2));
}
export function stepLanterns(dt) {
  const slow = reduced() ? 0.5 : 1;
  dt *= slow;
  simT += dt;
  if (fest) {
    // The festival lets its lanterns go along the shore, a few at a time.
    fest.t += dt;
    const due = Math.min(FEST_N, Math.floor(fest.t / FEST_T * FEST_N));
    for (; fest.n < due; fest.n++) {
      const u = 0.04 + 0.92 * Math.random(), r = rayAt(u, 0.5);
      add(shoreUnder(r.eye, r.d), false, true);
      // One in four rustles, softly; the drone carries the rest.
      if (Math.random() < 0.25) releaseSound(u, false, true);
    }
    if (fest.n >= FEST_N && fest.t > FEST_T + 120) fest = null;
  }
  for (let i = pool.length - 1; i >= 0; i--) {
    const L = pool[i];
    L.age += dt;
    if (L.age > L.life + L.fade + (L.fade < 6 ? 0 : 2)) { pool.splice(i, 1); continue; }
    const g = wind(simT * 0.04 + L.phase, L.p[1] * 0.01);
    if (L.float) {
      // On the water: the wind pushes at 5 %, and the swell lifts it.
      const k = 1 - Math.exp(-dt / 8);
      L.v[0] += (windSpeed * 0.05 * (1 + 0.5 * g) - L.v[0]) * k;
      L.v[2] += (-windSpeed * 0.02 - L.v[2]) * k;
      L.p[0] += L.v[0] * dt;
      L.p[2] += L.v[2] * dt;
      L.p[1] = 0.3 + swellHeight(L.p[0], L.p[2], env.clock.time, S.swell) * 6;
      L.lean = slow < 1 ? 0 : 0.05 * Math.sin(simT * 1.1 + L.phase);
      continue;
    }
    // Lift: the flame's heat climbs to about 1.3 m/s; an ember barely rises.
    const heat = L.age < L.life ? 1 : Math.max(0, 1 - (L.age - L.life) / L.fade);
    const up = (0.15 + 1.15 * L.rate * heat * Math.min(1, L.age / 4)) * row('rise', 1);
    L.v[1] += (up - L.v[1]) * (1 - Math.exp(-dt / 2.5));
    // Wind: the slider speed plus slow gusts, stronger with height.
    const lift = 0.45 + 0.55 * Math.min(1, L.p[1] / 90);
    let wx = windSpeed * lift * (1 + 0.35 * g), wz = -windSpeed * lift * 0.35 * (1 + 0.5 * wind(L.phase, simT * 0.03));
    if (L.fest && fest) {
      // The festival's wind has a slow channel: it gathers its lanterns into one band.
      // The band leans with the wind as it climbs, and runs off into the haze.
      const pull = Math.min(1, L.age / 8);
      // Each keeps its own lane in the band, so the river stays wide.
      const lane = (fract(L.phase) - 0.5) * 30;
      wx += (fest.x + lane + L.p[1] * 1.3 - L.p[0]) * 0.05 * pull;
      wz -= windSpeed * (0.4 + 0.9 * L.rate) * pull;
    }
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
    // The toy runs its own loop (see frame()), so the runner never loops.
    active: () => false,
    textures: { tLan: lanTexture },
    uniforms: {
      uLanN: () => pool.length,
      uFlick: () => (reduced() ? 0 : row('flicker', 1)),
      uPaper: () => paperCol(),
      uMist: () => MIST[row('mist', 'light')] ?? MIST.light,
      uHz: () => horizon(canvas.clientWidth / Math.max(1, canvas.clientHeight), CAM.hz) + look.tilt,
      uEye: () => [CAM.x, CAM.z, CAM.lift],
      // A tall frame turns a little right, so the lit windows stay in it.
      uView: () => [(CAM.yaw + 6 * tall() + look.yaw) * Math.PI / 180, CAM.roll * Math.PI / 180, CAM.foc, CAM.fish],
      uBars: () => (CAM.bars || row('letterbox', false) ? 1 : 0),
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
// The paper: about 2000 K at hue 55, warmer or yellower from Dev.
let paperHue = -1, paperRGB = [1, 0.48, 0.15];
function paperCol() {
  const h = row('hue', 55);
  if (h !== paperHue) {
    paperHue = h;
    const c = oklchLinear(0.8, 0.17, h), m = Math.max(...c);
    paperRGB = c.map(x => Math.max(0, x / m));
  }
  return paperRGB;
}

function step(dt) {
  // The sky and the exposure ease to the chosen hour.
  const k = 1 - Math.exp(-dt / 0.6);
  S.hour += (target - S.hour) * k;
  S.expo += (expoTarget - S.expo) * k;
  stepLanterns(dt);
  // A held press lets a lantern go every 0.25 s.
  if (press?.mode === 'hold') {
    holdAcc += dt;
    for (; holdAcc >= 0.25; holdAcc -= 0.25) release(press.u, press.v);
  }
  soundTick(dt);
}
/* ---------- the frame loop ---------- */
// Lively (lanterns, a press, a change in flight): every frame.
// Drifting (the water alone): 30 fps. Asleep 60 s after the last input, with the sky empty.
// Hidden: no frames, and the clock stops. Reduced motion: the water holds still.
let running = false, lastT = 0, lastDraw = 0;
const lively = () => pool.length > 0 || !!fest || !!press || Math.abs(target - S.hour) > 0.004 || Math.abs(expoTarget - S.expo) > 0.004;
function kick() {
  if (!visible) return;
  if (!running) { running = true; lastT = 0; requestAnimationFrame(frame); }
}
function frame(now) {
  try {
    const live = lively(), drift = !reduced() && now < sleepAt;
    if (!visible || (!live && !drift)) {
      running = false;
      // The last frame stays on screen; a hidden page draws nothing.
      if (visible) env.draw();
      if (!live) soundRest();
      return;
    }
    const raw = lastT ? (now - lastT) / 1000 : 0.016, dt = Math.min(0.05, raw);
    lastT = now;
    // Only full-rate frames feed the slow-frame watch.
    if (live && raw < 0.2) env.detail.frame(raw);
    if (!reduced()) {
      env.clock.time += dt;
      if (++env.clock.frame & 1) env.clock.seed = env.clock.seed % 997 + 1;
    }
    step(dt);
    env.draw();
    lastDraw = now;
  } finally {
    if (running) {
      // A drifting lake asks for its next frame only after 31 ms.
      if (lively()) requestAnimationFrame(frame);
      else setTimeout(() => requestAnimationFrame(frame), Math.max(0, 31 - (performance.now() - lastDraw)));
    }
  }
}
// Any input wakes the loop for another 60 s.
function wake() {
  sleepAt = performance.now() + 60000;
  kick();
}
act.redraw = () => kick();
onQuality(() => kick());
act.wind = v => { windSpeed = windOf(v); save('wind', v); wake(); };
act.festival = () => festival();
act.clear = () => clearAll();
act.time = v => {
  target = HOURS[v];
  expoTarget = EXPO[v];
  save('time', v);
  // With motion off, the sky changes at once.
  if (reduced()) { S.hour = target; S.expo = expoTarget; }
  wake();
};
for (const ev of ['pointerdown', 'pointermove', 'keydown']) stage.addEventListener(ev, wake, { passive: true });
// The pointer: a press turns into a drag after 8 px, or a hold after 260 ms.
// A release that is neither is a tap.
/** @type {{ id: number, x: number, y: number, u: number, v: number, mode: string, timer: number } | null} */
let press = null, holdAcc = 0;
const uvOf = e => { const r = canvas.getBoundingClientRect(); return [(e.clientX - r.left) / r.width, 1 - (e.clientY - r.top) / r.height]; };
canvas.addEventListener('pointerdown', e => {
  if (e.button !== 0 || press) return;
  canvas.setPointerCapture(e.pointerId);
  const [u, v] = uvOf(e);
  press = { id: e.pointerId, x: e.clientX, y: e.clientY, u, v, mode: 'press', timer: 0 };
  press.timer = window.setTimeout(() => {
    if (press?.mode !== 'press') return;
    // Hold: one lantern each 0.25 s from under the pointer.
    press.mode = 'hold';
    holdAcc = 0;
    release(press.u, press.v);
  }, 260);
});
canvas.addEventListener('pointermove', e => {
  if (!press || e.pointerId !== press.id) return;
  const [u, v] = uvOf(e);
  if (press.mode === 'press' && Math.hypot(e.clientX - press.x, e.clientY - press.y) > 8) {
    clearTimeout(press.timer);
    press.mode = 'drag';
  }
  if (press.mode === 'drag') {
    // Drag: a small pan and tilt, so the eye can follow the river.
    look.yaw = Math.max(-12, Math.min(12, look.yaw - (u - press.u) * 14));
    look.tilt = Math.max(-0.2, Math.min(0.2, look.tilt + (v - press.v) * 0.5));
    kick();
  }
  press.u = u;
  press.v = v;
});
function endPress(e, tap) {
  if (!press || e.pointerId !== press.id) return;
  clearTimeout(press.timer);
  if (tap && press.mode === 'press') {
    release(press.u, press.v);
  }
  press = null;
}
canvas.addEventListener('pointerup', e => endPress(e, true));
canvas.addEventListener('pointercancel', e => endPress(e, false));
canvas.addEventListener('lostpointercapture', e => endPress(e, false));
new ResizeObserver(wake).observe(stage);

/* ---------- sound ---------- */
// Web Audio on the shared kit: muted by default, it starts on a gesture and sleeps when idle.
const kit = audioKit({ keys: new Set([' ', 'Enter']), noiseSeconds: 2 });
const jit = (a, b) => a + (b - a) * Math.random();
/** @type {{ src: AudioBufferSourceNode, lfo: OscillatorNode, lapBp: BiquadFilterNode, lapG: GainNode, lapPan: StereoPannerNode, night: GainNode } | null} */
let bed = null;
/** @type {{ oscs: OscillatorNode[], g: GainNode, quietFor: number } | null} */
let drone = null;
let nextLap = 0, nextChirp = 0, nextFrog = 2;
// The lake bed: low noise that swells slowly, and soft laps at the shore.
function startBed() {
  const ac = kit.live();
  if (!ac || bed || !kit.noise) return;
  const src = ac.createBufferSource();
  src.buffer = kit.noise;
  src.loop = true;
  const bp = ac.createBiquadFilter(), g = ac.createGain(), lfo = ac.createOscillator(), depth = ac.createGain();
  bp.type = 'bandpass';
  bp.frequency.value = 340;
  bp.Q.value = 0.7;
  g.gain.value = 0.04;
  lfo.frequency.value = 0.08;
  depth.gain.value = 0.025;
  lfo.connect(depth).connect(g.gain);
  src.connect(bp).connect(g).connect(kit.out);
  // Each lap is a short swell of brighter noise, never two alike.
  const lapBp = ac.createBiquadFilter(), lapG = ac.createGain(), lapPan = ac.createStereoPanner();
  lapBp.type = 'bandpass';
  lapBp.Q.value = 1.4;
  lapG.gain.value = 0;
  src.connect(lapBp).connect(lapG).connect(lapPan).connect(kit.out);
  // The night's voices share one gain, so they fade in and out with the hour.
  const night = ac.createGain();
  night.gain.value = 0;
  night.connect(kit.out);
  src.start();
  lfo.start();
  bed = { src, lfo, lapBp, lapG, lapPan, night };
}
function stopAll() {
  if (bed) { try { bed.src.stop(); bed.lfo.stop(); } catch (err) { /* The context closed first. */ } bed = null; }
  if (drone) { try { drone.oscs.forEach(o => o.stop()); } catch (err) { /* The context closed first. */ } drone = null; }
}
// Release: a dry paper rustle, then a breathy whoosh as the flame catches.
// A floating lantern lands with a soft plop instead.
function releaseSound(u, float, quiet) {
  const ac = kit.live();
  if (!ac || !kit.noise) return;
  const t = ac.currentTime + 0.01, k = quiet ? 0.35 : 1;
  const pan = ac.createStereoPanner();
  pan.pan.value = Math.max(-0.8, Math.min(0.8, (u - 0.5) * 1.5));
  pan.connect(kit.out);
  const burst = (at, dur, type, f, q, peak) => {
    const s = ac.createBufferSource(), bp = ac.createBiquadFilter(), g = ac.createGain();
    s.buffer = kit.noise;
    bp.type = type;
    bp.frequency.value = f;
    bp.Q.value = q;
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(peak, at + Math.min(0.02, dur * 0.3));
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    s.connect(bp).connect(g).connect(pan);
    s.start(at, Math.random() * 1.5, dur + 0.05);
    return bp;
  };
  // The rustle: a few crinkles of high noise in a quarter second.
  for (let i = 0, n = 3 + Math.floor(Math.random() * 3); i < n; i++) burst(t + jit(0, 0.22), jit(0.03, 0.07), 'highpass', jit(2600, 4200), 0.7, jit(0.05, 0.1) * k);
  if (float) {
    // The plop: a short falling tone, and a little splash.
    const o = ac.createOscillator(), g = ac.createGain(), at = t + 0.25;
    o.frequency.setValueAtTime(jit(190, 240), at);
    o.frequency.exponentialRampToValueAtTime(jit(80, 100), at + 0.14);
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(0.12 * k, at + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, at + 0.18);
    o.connect(g).connect(pan);
    o.start(at);
    o.stop(at + 0.2);
    burst(at, 0.12, 'bandpass', jit(1200, 1800), 1.2, 0.04 * k);
    return;
  }
  // The whoosh: a band of noise that rises as the flame catches.
  const bp = burst(t + jit(0.1, 0.16), jit(0.35, 0.5), 'bandpass', jit(260, 340), 1.1, jit(0.12, 0.16) * k);
  bp.frequency.exponentialRampToValueAtTime(jit(800, 1100), t + 0.5);
}
// One cricket: three or four quick pulses, high and far.
function chirp(ac, at) {
  const o = ac.createOscillator(), g = ac.createGain(), p = ac.createStereoPanner();
  o.frequency.value = jit(4100, 4800);
  p.pan.value = jit(-0.7, 0.7);
  g.gain.value = 0;
  const peak = jit(0.006, 0.014);
  for (let i = 0, n = 3 + Math.floor(Math.random() * 2); i < n; i++) {
    const s = at + i * jit(0.045, 0.055);
    g.gain.setValueAtTime(0, s);
    g.gain.linearRampToValueAtTime(peak, s + 0.008);
    g.gain.linearRampToValueAtTime(0, s + 0.03);
  }
  o.connect(g).connect(p).connect(bed.night);
  o.start(at);
  o.stop(at + 0.3);
}
// One frog: a low, buzzing croak across the water.
function croak(ac, at) {
  const o = ac.createOscillator(), am = ac.createOscillator(), amG = ac.createGain(), bp = ac.createBiquadFilter(), g = ac.createGain(), p = ac.createStereoPanner();
  const dur = jit(0.18, 0.35);
  o.type = 'sawtooth';
  o.frequency.setValueAtTime(jit(110, 170), at);
  o.frequency.linearRampToValueAtTime(jit(90, 120), at + dur);
  am.frequency.value = jit(22, 32);
  // The buzz: a gain that swings 0 to 1, ahead of the envelope.
  const buzz = ac.createGain();
  buzz.gain.value = 0.5;
  amG.gain.value = 0.5;
  bp.type = 'bandpass';
  bp.frequency.value = jit(500, 800);
  bp.Q.value = 2;
  p.pan.value = jit(-0.8, 0.8);
  const peak = jit(0.015, 0.03);
  g.gain.setValueAtTime(0, at);
  g.gain.linearRampToValueAtTime(peak, at + 0.03);
  g.gain.setValueAtTime(peak, at + dur - 0.05);
  g.gain.linearRampToValueAtTime(0, at + dur);
  am.connect(amG).connect(buzz.gain);
  o.connect(bp).connect(buzz).connect(g).connect(p).connect(bed.night);
  o.start(at); am.start(at);
  o.stop(at + dur); am.stop(at + dur);
}
// The festival drone: a low, warm chord that swells with the lanterns in the air.
function startDrone(ac) {
  const g = ac.createGain(), lp = ac.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 340;
  lp.Q.value = 0.5;
  g.gain.value = 0;
  lp.connect(g).connect(kit.out);
  const oscs = [[55, 'sawtooth', -6], [55, 'sawtooth', 7], [82.4, 'triangle', 0], [110, 'triangle', 4]].map(([f, type, det]) => {
    const o = ac.createOscillator();
    o.type = /** @type {OscillatorType} */ (type);
    o.frequency.value = f;
    o.detune.value = det;
    o.connect(lp);
    o.start();
    return o;
  });
  drone = { oscs, g, quietFor: 0 };
}
// Each frame: laps, the night's voices and the drone, on the audio clock.
function soundTick(dt) {
  const ac = kit.live();
  if (!ac) return;
  if (!bed) startBed();
  if (!bed) return;
  const t = ac.currentTime;
  if ((nextLap -= dt) <= 0) {
    nextLap = jit(1.2, 4.2);
    bed.lapBp.frequency.setValueAtTime(jit(650, 1300), t);
    bed.lapPan.pan.setValueAtTime(jit(-0.5, 0.5), t);
    bed.lapG.gain.cancelScheduledValues(t);
    bed.lapG.gain.setValueAtTime(0, t);
    bed.lapG.gain.linearRampToValueAtTime(jit(0.02, 0.05), t + jit(0.06, 0.12));
    bed.lapG.gain.exponentialRampToValueAtTime(0.0001, t + jit(0.5, 0.9));
  }
  // Frogs and crickets: only at Night, far and quiet.
  const night = S.hour > 21.6 ? 1 : 0;
  bed.night.gain.setTargetAtTime(night, t, 1.5);
  if (night) {
    if ((nextChirp -= dt) <= 0) { nextChirp = jit(0.35, 1.4); chirp(ac, t + 0.02); }
    if ((nextFrog -= dt) <= 0) { nextFrog = jit(2.5, 7); croak(ac, t + 0.02); }
  }
  // The drone follows the festival lanterns still burning.
  let n = 0;
  for (const L of pool) if (L.fest && L.age < L.life) n++;
  const want = 0.09 * Math.sqrt(n / FEST_N);
  if (want > 0.001 && !drone) startDrone(ac);
  if (drone) {
    drone.g.gain.setTargetAtTime(want, t, n ? 1.2 : 2.5);
    drone.quietFor = want > 0.001 ? 0 : drone.quietFor + dt;
    if (drone.quietFor > 10) { drone.oscs.forEach(o => o.stop()); drone = null; }
  }
}
// The loop sleeps, or the tab hides: every voice stops and the context sleeps.
function soundRest() {
  stopAll();
  kit.rest(() => !running || !visible);
}

/* ---------- start ---------- */
// QA: ?qa shows the pool to a test as window.__lanterns.
if (qs.has('qa')) Object.assign(window, { __lanterns: { pool, glowOf, clearAll, kit } });
// QA: ?lan=10 starts with ten lanterns in the air, ?float=8 with eight on the water.
// ?fest=25 starts 25 s into a festival.
const preset = Math.min(MAXN, +(qs.get('lan') || 0));
for (let i = 0; i < preset; i++) {
  release(0.15 + 0.7 * Math.random(), 0.2 + 0.25 * Math.random(), 'sky');
  for (let k = 0; k < 40; k++) stepLanterns(0.1);
}
for (let i = 0; i < Math.min(MAXN, +(qs.get('float') || 0)); i++) release(0.1 + 0.8 * Math.random(), 0.05 + 0.3 * Math.random());
if (qs.has('fest')) {
  festival();
  for (let k = 0; k < +qs.get('fest') * 10; k++) stepLanterns(0.1);
}
wake();
env.draw();
canvas.classList.add('on');
mark('first-frame');
// A hidden tab stops the loop and the clock.
whenVisible(stage, v => {
  visible = v;
  // Back in view, the sound wakes with no new gesture, unless it is muted.
  if (v) { if (kit.ac && sound.on) kit.wake(); kick(); }
  else soundRest();
});
