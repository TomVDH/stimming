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
// The eye stands 3 m over the water. The far shore lies 1.5 km off.
const CAMH = 3, FOC = 1.5;
// The horizon's place on the frame: a tall frame lifts it.
const horizon = asp => 0.4 + 0.04 * Math.min(1, Math.max(0, (1.2 - asp) / 0.7));
const SCENE = `
uniform float uMist, uHz;
const float FOC = 1.5, CAMH = 3.0, SHORE = 1500.0, RIDGE = 4200.0;
const vec3 CAM = vec3(0.0, CAMH, 0.0);
// The lens: a narrow frame takes a wider one.
float gFoc;
// The sun sits a little right of the view, so the last light lies over the hills.
vec3 gSun;

float h1(float x) { return wtNoised(vec2(x, 7.3)).x; }
// The far shore's height in metres at x: low hills, then pines on them.
float hills(float x) { return 22.0 + 46.0 * h1(x / 520.0) + 18.0 * h1(x / 170.0 + 11.0); }
float pines(float x) {
  // Pines grow in stands; open ground lies between.
  float stand = smoothstep(0.38, 0.62, h1(x / 260.0 + 31.0));
  float c = floor(x / 7.0), top = 0.0;
  for (int i = -1; i <= 1; i++) {
    float ci = c + float(i), hs = wtH(vec2(ci, 3.0));
    float at = (ci + 0.3 + 0.4 * wtH(vec2(ci, 9.0))) * 7.0;
    float tall = (9.0 + 15.0 * hs) * stand * step(0.22, wtH(vec2(ci, 5.0)));
    top = max(top, tall * clamp(1.0 - abs(x - at) / (2.4 + 1.4 * hs), 0.0, 1.0));
  }
  return top;
}
float shore(float x) { return hills(x) + pines(x); }
// The far ridge: big, bare hills, pale in the haze.
float ridge(float x) { return 90.0 + 190.0 * h1(x / 1400.0 + 53.0) + 50.0 * h1(x / 430.0 + 71.0); }

// The mist's colour: the low sky that way.
vec3 mistCol(vec3 d) { return skDusk(normalize(vec3(d.x, 0.03, d.z)), gSun, uZen, uMid, uBand, uAnti) * 0.85; }
// The mist lies low and thick on the water, and drifts a little.
float mistAt(vec3 o, vec3 P) {
  float drift = 0.75 + 0.5 * wtNoised(vec2(P.x * 0.003 + uTime * 0.01, P.z * 0.002)).x;
  return skHaze(o, P, uMist * drift, 8.0);
}
// The shore's dark: a little sky light, more by day.
vec3 shoreDark() { return vec3(0.003, 0.004, 0.006) + uZen * 0.05; }

// The sky, the far ridge and the shore, along a ray from o that meets no water first.
// blur widens each edge, in radians: the ripples smear a mirrored edge.
vec3 above(vec3 o, vec3 d, float blur) {
  vec3 sun = gSun;
  vec3 c = skSky(d, sun, uZen, uMid, uBand, uAnti, uStars, uTime);
  vec4 cl = skCloudsN(d, sun, uTime, uCloud, uCloudLit, uCloudShade, uCloudOct);
  c = mix(c, cl.rgb, cl.a);
  // The mist rises off the lake and veils the low sky.
  c = mix(c, mistCol(d), mistAt(o, o + d * 9000.0) * 0.7);
  if (d.z > -1e-4) return c;
  // The far ridge stands pale through the haze.
  float t = (RIDGE + o.z) / -d.z;
  vec3 P = o + d * t;
  float px = t * (1.0 / (gFoc * uRes.y) + blur);
  float cov = smoothstep(-px, px, ridge(P.x) - P.y);
  if (cov > 0.0) {
    vec3 r = mix(shoreDark() * 1.4, mistCol(d), 0.55 + 0.35 * skHaze(o, P, uMist * 0.9, 30.0));
    c = mix(c, r, cov);
  }
  // The near shore: hills and pines in one dark tone, with a rim of sky light.
  t = (SHORE + o.z) / -d.z;
  P = o + d * t;
  px = t * (1.0 / (gFoc * uRes.y) + blur);
  float top = shore(P.x), under = top - P.y;
  cov = smoothstep(-px, px, under) * step(-0.5, P.y);
  if (cov > 0.0) {
    vec3 s = shoreDark();
    s += (uBand * 0.06 + uMid * 0.03) * exp(-max(under, 0.0) / (1.6 * px + 0.4));
    s = mix(s, mistCol(d), mistAt(o, P));
    c = mix(c, s, cov);
  }
  return c;
}

// A few warm windows on the far shore. The water mirrors them.
const int NWIN = 6;
const vec3 WIN[NWIN] = vec3[NWIN](vec3(-410.0, 6.0, -1490.0), vec3(-396.0, 7.5, -1490.0), vec3(-120.0, 5.0, -1490.0), vec3(235.0, 6.5, -1490.0), vec3(252.0, 6.0, -1490.0), vec3(640.0, 9.0, -1490.0));
vec3 windows(vec2 uv, float asp) {
  vec3 c = vec3(0.0);
  float s = 1.2 / uRes.y;
  for (int i = 0; i < NWIN; i++) {
    vec3 P = WIN[i];
    vec2 at = vec2(0.5 + P.x / -P.z * gFoc / asp, uHz + (P.y - CAMH) / -P.z * gFoc);
    vec2 d = (uv - at) * vec2(asp, 1.0);
    if (abs(d.x) > 0.06 || abs(d.y) > 0.04) continue;
    float k = (0.55 + 0.45 * wtH(vec2(float(i), 1.0))) * (1.0 - 0.5 * mistAt(CAM, P));
    float core = exp(-dot(d, d) / (s * s));
    c += vec3(1.0, 0.52, 0.18) * k * (core * 3.0 + gwOrb(uv, at, asp, 0.05) * 0.05 * uOrbs);
  }
  return c;
}

vec3 envScene(vec2 uv) {
  float asp = uRes.x / uRes.y;
  gFoc = FOC * min(1.0, sqrt(asp / 1.2));
  gSun = normalize(vec3(0.35 * length(uSunD.xz), uSunD.y, -length(uSunD.xz)));
  vec3 d = normalize(vec3((uv.x - 0.5) * asp, uv.y - uHz, -gFoc));
  // A ray that meets the shore above the water sees the shore.
  bool shoreFirst = d.z < 0.0 && CAMH + d.y * SHORE / -d.z >= 0.0;
  vec3 c;
  if (d.y >= 0.0 || shoreFirst) c = above(CAM, d, 0.0);
  else {
    // water.js: slow ripples tilt the mirror.
    float dist = CAMH / -d.y;
    vec2 p = d.xz * dist;
    vec3 P = vec3(p.x, 0.0, p.y);
    float sig2, foot = wtFoot(dist, -d.y, uRes.y * gFoc);
    vec2 slope = wtWavesN(p, uTime, foot, uSwell, uChop, uSets, uOct, sig2);
    vec3 n = wtNormal(slope);
    vec3 r = reflect(d, n);
    r.y = abs(r.y);
    float F = wtFresnel(d, n), rz = max(-r.z, 0.05);
    vec2 ur = vec2(0.5 + r.x / rz * gFoc / asp, uHz + r.y / rz * gFoc);
    // Each window smears into a tall streak; rougher water makes it longer.
    float len = 2.0 * sqrt(sig2) * gFoc, ws = 0.0;
    vec3 refl = vec3(0.0);
    for (int i = -3; i <= 3; i++) {
      if (abs(i) > uTapN) continue;
      float fi = float(i) / float(uTapN), w = exp(-fi * fi * 2.0);
      vec2 at = ur + vec2(0.0, fi * len);
      at.y = uHz + abs(at.y - uHz);
      refl += windows(at, asp) * w;
      ws += w;
    }
    refl = refl / ws + above(P, r, 0.004 + 1.5 * sqrt(sig2));
    c = mix(vec3(0.0015, 0.0025, 0.004) + uZen * 0.02, refl, F);
    c = mix(c, mistCol(d), mistAt(CAM, P));
  }
  return c + windows(uv, asp);
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
      uMist: () => 0.0012,
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
