// Lantern lake: the toy's module, loaded by index.html.
import { initPage, whenVisible, reduced, stage as mark, pageReady } from '../shared/stim.js';
import { intro as playIntro } from '../shared/intro.js';
import { environment } from '../shared/environment.js';
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
const horizon = asp => 0.72 - 0.1 * Math.min(1, Math.max(0, (1.2 - asp) / 0.7));
const SCENE = `
uniform float uMist, uHz;
const float FOC = 1.5;
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
  stand *= smoothstep(26.0, 40.0, length(v));
  // A lane down the slope keeps the lake clear; pines frame it at the sides.
  float lane = smoothstep(0.3 * gLane, 0.55 * gLane, abs(v.x) / max(-v.y, 1.0));
  stand *= mix(lane, 1.0, smoothstep(150.0, 220.0, length(v)));
  if (stand <= 0.0) return 0.0;
  vec2 c = floor(p / 9.0);
  float hs = wtH(c + 3.0);
  vec2 at = (c + 0.5 + 0.3 * (vec2(wtH(c + 7.0), wtH(c + 11.0)) - 0.5)) * 9.0;
  float tall = (13.0 + 11.0 * hs) * stand * step(0.3, wtH(c + 5.0));
  // A slender pine in tiers: each whorl of boughs flares, then narrows.
  float r = length(p - at), base = 2.3 + 0.8 * hs;
  float y = tall * max(0.0, 1.0 - r / base), tier = tall * 0.12;
  float flare = 0.86 + 0.14 * fract((tall - y) / tier + hs);
  float tree = tall * max(0.0, 1.0 - r / (base * flare));
  // The far canopy follows the stands, not the cells, so it shows no grid.
  float canopy = stand * (4.0 + 3.0 * n2(p / 14.0) + 5.0 * n2(p / 5.0));
  return mix(tree, canopy, smoothstep(0.3, 1.5, foot));
}
float surf(vec2 p, float foot) {
  float s, g = ground(p, s);
  return g + pines(p, s, foot);
}

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
    float gap = P.y - surf(P.xz, t * px);
    if (gap < 0.0) { h.land = true; break; }
    float m = gap / (t * px);
    if (m < h.mn) { h.mn = m; h.tm = t; }
    last = t;
    // Inside the canopy band the trees are steep, so the steps shrink.
    t += gap < 26.0 ? max(gap * 0.12, 0.002 * t + 0.15) : max(gap * 0.45, 0.008 * t + 0.2);
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

vec3 envScene(vec2 uv) {
  float asp = uRes.x / uRes.y;
  gFoc = FOC * min(1.0, sqrt(asp / 1.2));
  gPx = 1.0 / (gFoc * uRes.y);
  gLane = clamp(asp / 1.6, 0.3, 1.0);
  gSun = normalize(vec3(0.35 * length(uSunD.xz), uSunD.y, -length(uSunD.xz)));
  float s;
  gCam = vec3(0.0, max(ground(vec2(0.0), s), 0.0) + 5.0, 0.0);
  float pitch = atan((uHz - 0.5) / gFoc);
  gF = vec3(0.0, -sin(pitch), -cos(pitch));
  gU = vec3(0.0, cos(pitch), -sin(pitch));
  gR = vec3(1.0, 0.0, 0.0);
  placeWindows();
  vec3 d = normalize(gR * (uv.x - 0.5) * asp + gU * (uv.y - 0.5) + gF * gFoc);
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
    base = mix(vec3(0.0015, 0.0025, 0.004) + uZen * 0.02, refl, F);
    base = mix(base, mistCol(d), mistAt(gCam, P));
  }
  return view(gCam, d, h, base, gPx) + windows(gCam, d, gPx * 1.2, gPx * 1.2);
}`;

/* ---------- state ---------- */
let visible = true, awake = true, sleepAt = 0, target = HOURS[first];
const canvas = document.createElement('canvas');
stage.prepend(canvas);
let env = null;
try {
  env = environment(canvas, {
    scene: SCENE,
    // The loop sleeps 60 s after the last input; the last frame stays.
    active: () => visible && awake,
    onFrame: raw => step(Math.min(raw, 0.05)),
    uniforms: {
      uMist: () => 0.003,
      uHz: () => horizon(canvas.clientWidth / Math.max(1, canvas.clientHeight)),
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
  if (performance.now() > sleepAt) awake = false;
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
new ResizeObserver(wake).observe(stage);

/* ---------- start ---------- */
wake();
env.draw();
canvas.classList.add('on');
mark('first-frame');
// A hidden tab stops the loop and the clock.
whenVisible(stage, v => {
  visible = v;
  if (v) env.touch();
});
