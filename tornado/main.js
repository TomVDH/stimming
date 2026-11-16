// Tornado alley: the toy's module, loaded by index.html.
// Stage 1 is the blockout: the shot, the bar and placeholder funnels.
import { initPage, whenVisible, reduced, stage as mark, pageReady } from '../shared/stim.js';
import { intro as playIntro } from '../shared/intro.js';
import { environment } from '../shared/environment.js';
mark('libs');

const stage = document.getElementById('stage');
const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);

playIntro({ ready: pageReady(9000) });
mark('build');

/* ---------- the F-scale ---------- */
// Ground width of the funnel in metres, per F level.
const F_WIDTH = [25, 70, 160, 320, 600, 1100];
// Each funnel lifts this much wider into the wall cloud.
const F_FLARE = [3, 3.5, 3.2, 2.6, 2.0, 1.4];
const MAX_TOR = 4;

/* ---------- bar ---------- */
// The hour for each Time choice. The sun stands behind the camera.
const HOURS = { afternoon: 16, golden: 18.3, dusk: 19.4 };
/** @type {{ f: (v: string) => void, add: () => void, clear: () => void, storm: (v: number) => void, time: (v: string) => void, expo: (v: number) => void }} */
const act = { f() {}, add() {}, clear() {}, storm() {}, time() {}, expo() {} };
const ui = initPage({ id: 'tornado', bar: {
  choice: { label: 'F-scale', display: 'stepper', value: 'F2', options: [0, 1, 2, 3, 4, 5].map(n => ({ value: `F${n}`, label: `F${n}`, key: String(n) })), onPick: v => act.f(v) },
  actions: [
    { verb: 'add', noun: 'Tornado', key: 'T', onPress: () => act.add() },
    { verb: 'clear', key: 'C', onPress: () => act.clear() },
  ],
  slider: { label: 'Storm', min: 0, max: 1, step: 0.01, value: 0.85, onInput: v => act.storm(v) },
  settings: [
    { type: 'choice', id: 'time', label: 'Time', value: 'golden', persist: true, options: [
      { value: 'afternoon', label: 'Afternoon' },
      { value: 'golden', label: 'Golden hour' },
      { value: 'dusk', label: 'Dusk' },
    ], onPick: v => act.time(v) },
  ],
  dev: [
    { type: 'slider', id: 'expo', label: 'Exposure', min: 0.4, max: 2, step: 0.01, value: 1, persist: true, onInput: v => act.expo(v) },
  ],
  quality: true,
  keys: [['click', 'touch down'], ['drag', 'steer'], ['0-5', 'F-scale']],
} });

/* ---------- the scene ---------- */
// The eye stands on the centre line of a two-lane road, 1.7 m up, and looks down it.
// Ground units are metres; the storm's units are kilometres.
// Golden lines: the horizon sits 0.382 up the frame.
const GOLD = 0.381966;
const horizon = () => GOLD;
const SCENE = /* glsl */`
uniform vec3 uSun, uSunCol, uAmb;
uniform float uFoc, uHz, uYaw, uStorm, uWind, uT;
// Placeholder funnels: x, z in metres, ground width, then 1 when live.
uniform vec4 uTor0, uTor1, uTor2, uTor3;
const float CAMH = 1.7;
// The storm's parts in km, in camera space. The updraft, the wall cloud, the rain core.
// The updraft and the wall cloud sit on the left golden line of a wide frame.
const vec2 TOWER = vec2(-9.5, -40.0);
const vec2 WALL = vec2(-6.0, -25.0);
const vec2 CORE = vec2(3.0, -36.0);
const float BASE = 1.35;
// The base shelf: its centre and its two half widths.
const vec2 SHELF = vec2(-4.0, -31.0);
const vec2 SHELF_R = vec2(17.0, 12.0);
// The sun's direction in camera space, set once per pixel.
vec3 gSunC;

float th(vec2 p) { p = fract(p * vec2(233.34, 851.73)); p += dot(p, p + 23.45); return fract(p.x * p.y); }
float th3(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float vn(vec2 p) {
  vec2 i = floor(p), f = fract(p), u = f * f * (3.0 - 2.0 * f);
  return mix(mix(th(i), th(i + vec2(1, 0)), u.x), mix(th(i + vec2(0, 1)), th(i + vec2(1, 1)), u.x), u.y);
}
float vn3(vec3 p) {
  vec3 i = floor(p), f = fract(p), u = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(th3(i), th3(i + vec3(1, 0, 0)), u.x), mix(th3(i + vec3(0, 1, 0)), th3(i + vec3(1, 1, 0)), u.x), u.y),
             mix(mix(th3(i + vec3(0, 0, 1)), th3(i + vec3(1, 0, 1)), u.x), mix(th3(i + vec3(0, 1, 1)), th3(i + vec3(1, 1, 1)), u.x), u.y), u.z);
}
float fbm3(vec3 p) { return 0.5 * vn3(p) + 0.25 * vn3(p * 2.03 + 7.1) + 0.125 * vn3(p * 4.1 + 3.7); }
float smin(float a, float b, float k) { float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0); return mix(b, a, h) - k * h * (1.0 - h); }

// The sky in a direction: the shared dusk sky, turned away from the sun.
vec3 skyCol(vec3 d) { return skDusk(d, uSun, uZen, uMid, uBand, uAnti); }
// The haze colour: the low sky that way.
vec3 hazeCol(vec3 d) { return skyCol(normalize(vec3(d.x, 0.03, d.z))) * 0.95; }

/* ---------- the supercell ---------- */
// The storm as one distance field, in km. uStorm grows a young cell into a full supercell.
float stormShape(vec3 p) {
  float g = uStorm;
  float top = mix(8.0, 12.5, g);
  // The updraft tower leans downshear as it climbs.
  vec2 q = p.xz - TOWER - vec2(0.28, -0.12) * (p.y - BASE);
  float rT = mix(3.5, 7.0, g) * (1.0 - 0.25 * smoothstep(BASE, 6.0, p.y) + 0.2 * smoothstep(top - 3.0, top, p.y));
  float tower = max(length(q) - rT, max(BASE + 0.1 - p.y, p.y - top));
  // The base: a broad flat shelf, its underside level.
  vec2 b = (p.xz - SHELF) / (SHELF_R * mix(0.4, 1.0, g));
  float shelf = max((length(b) - 1.0) * SHELF_R.y * mix(0.4, 1.0, g), abs(p.y - (BASE + 0.35)) - 0.35);
  // The anvil: flat on top, thin at its edge, and streaming off to the right.
  vec3 a = p - vec3(TOWER.x + mix(2.0, 14.0, g), top - 0.5, TOWER.y - 2.0);
  float anvil = max((length(a / vec3(mix(6.0, 28.0, g), 1.7, mix(4.0, 9.0, g))) - 1.0) * 1.6, p.y - top - 0.5);
  // The overshooting top domes above the anvil, over the updraft.
  vec3 o = p - vec3(TOWER.x + 0.28 * (top - BASE), top + 0.4, TOWER.y - 0.12 * (top - BASE));
  float dome = length(o * vec3(1.0, 1.6, 1.0)) / 1.6 - mix(1.4, 2.8, g);
  // The wall cloud: a lowered block under the base, by the rotation.
  float wall = max(length(p.xz - WALL) - mix(0.4, 1.8, g), abs(p.y - BASE + 0.3) - 0.45);
  float d = smin(tower, shelf, 1.4);
  d = smin(d, dome, 1.2);
  d = smin(d, anvil, 2.2);
  d = smin(d, wall, 0.6);
  return d;
}
float stormD(vec3 p) {
  float d = stormShape(p);
  if (d > 2.5) return d;
  // Lumpy towers, smoother anvil, ragged base.
  float amp = mix(1.1, 0.45, smoothstep(9.0, 12.0, p.y)) * mix(0.35, 1.0, smoothstep(BASE + 0.5, BASE + 2.5, p.y));
  vec3 n = p * 0.75 + vec3(0.0, -uT * 0.006, 0.0);
  return d + (fbm3(n) + 0.0625 * vn3(n * 8.3) - 0.5) * amp;
}
// The colour of one storm sample.
vec3 stormLit(vec3 p, float d) {
  // A step toward the sun: thinner cloud there means this side is lit.
  float ds = stormD(p + gSunC * 0.9);
  float lit = clamp((ds - d) / 0.9 * 0.8 + 0.3, 0.0, 1.0);
  // A step up: deeper cloud above means an underside, out of the sun.
  float under = clamp((d - stormD(p + vec3(0.0, 0.4, 0.0))) / 0.4, 0.0, 1.0);
  lit *= 1.0 - 0.9 * under;
  // Thick cloud overhead darkens the base and the core.
  float up = smoothstep(0.6, 9.0, p.y);
  float core = (1.0 - smoothstep(2.5, 7.0, length(p.xz - TOWER - vec2(2.5, 1.0)))) * (1.0 - smoothstep(3.0, 8.0, p.y));
  vec3 amb = uAmb * mix(0.1, 0.85, up) * (1.0 - 0.7 * under);
  vec3 c = uSunCol * lit * lit * mix(0.3, 0.8, up) + amb;
  // The core goes black-green behind its rain.
  return mix(c, c * vec3(0.32, 0.5, 0.46), core * 0.85);
}
// Marches the storm. Returns colour and coverage; t is the hit distance in km.
vec4 storm(vec3 rd, out float tHit) {
  vec3 ro = vec3(0.0, CAMH * 0.001, 0.0);
  float t = 1.0, T = 1.0;
  vec3 acc = vec3(0.0);
  tHit = 120.0;
  for (int i = 0; i < 110; i++) {
    vec3 p = ro + rd * t;
    if (p.y > 16.0 || p.y < -0.01 || t > 110.0 || T < 0.03) break;
    float d = stormD(p);
    if (d < 0.12) {
      if (tHit > 119.0) tHit = t;
      float a = clamp(0.5 - d / 0.12, 0.0, 1.0) * 0.8;
      acc += T * a * stormLit(p, d);
      T *= 1.0 - a;
      t += 0.12 + 0.006 * t;
    } else t += d * 0.75 + 0.01 * t;
  }
  return vec4(acc, 1.0 - T);
}
// The length a ray runs inside a vertical cylinder; x is where it enters.
vec2 cylinder(vec3 ro, vec3 rd, vec2 c, float r, float y0, float y1) {
  vec2 o = ro.xz - c;
  float A = dot(rd.xz, rd.xz), B = dot(o, rd.xz), C = dot(o, o) - r * r, D = B * B - A * C;
  if (D < 0.0 || A < 1e-6) return vec2(0.0);
  float s = sqrt(D), t0 = (-B - s) / A, t1 = (-B + s) / A;
  // Clip to the slab between y0 and y1.
  float a0 = (y0 - ro.y) / rd.y, a1 = (y1 - ro.y) / rd.y;
  if (rd.y < 0.0) { float k = a0; a0 = a1; a1 = k; }
  t0 = max(max(t0, a0), 0.0); t1 = min(t1, a1);
  return t1 > t0 ? vec2(t0, t1 - t0) : vec2(0.0);
}

/* ---------- the camera ---------- */
// The eye turns left by uYaw, so the road vanishes on the right golden line.
// Ground, road, poles, farm and funnels live in world space; the storm lives in camera space.
vec3 toWorld(vec3 c) { float s = sin(uYaw), k = cos(uYaw); return vec3(c.x * k + c.z * s, c.y, -c.x * s + c.z * k); }
vec3 toCam(vec3 w) { float s = sin(uYaw), k = cos(uYaw); return vec3(w.x * k - w.z * s, w.y, w.x * s + w.z * k); }

/* ---------- the wind ---------- */
// The wind blows left to right and a little toward the eye.
const vec2 WDIR = vec2(0.944, 0.33);
// Gust fronts: broad patches that roll downwind over the wheat, 0 calm to 1 full gust.
float gust(vec2 xz) {
  vec2 q = xz - WDIR * uT * (3.0 + 6.0 * uWind);
  float g = vn(q * vec2(0.022, 0.04)) * 0.65 + vn(q * 0.1 + 4.0) * 0.35;
  return smoothstep(0.4, 0.78, g);
}
// How far a stalk's tip leans at height h, in metres.
vec2 bend(vec2 xz, float h, float g) {
  float lean = (0.03 + 0.22 * g) * (0.25 + 0.75 * uWind);
  float flutter = 0.015 * sin(uT * 3.1 + xz.x * 1.7 + xz.y * 2.3) * (0.3 + uWind);
  return WDIR * (lean + flutter) * h * h;
}

/* ---------- the plain ---------- */
// The road runs past the eye, 7.5 m to its right; its near end leaves the frame.
const float ROAD_X = 7.5, WHEAT_GAP = 6.2;
// Coverage of a band of half width w round 0, at pixel footprint f.
float band(float x, float w, float f) { return clamp((w - abs(x)) / f + 0.5, 0.0, 1.0) * min(1.0, 2.0 * w / f); }
// The wheat's colour seen from far off: ripe patches, and the gusts as a paler sheen.
vec3 wheatFar(vec2 xz, float fx) {
  float patchN = vn(xz * vec2(0.012, 0.004)) * 0.6 + vn(xz * vec2(0.05, 0.015)) * 0.4;
  vec3 alb = mix(vec3(0.26, 0.17, 0.07), vec3(0.44, 0.32, 0.13), patchN);
  // A bent stalk shows its pale side.
  float g = gust(xz);
  alb = mix(alb, vec3(0.55, 0.47, 0.3), g * 0.6);
  return alb * (0.7 + 0.5 * g) * (uSunCol * 0.5 + uAmb * 0.55);
}
// The near wheat: shells of ears, from the tallest ear down into the stalks.
// Each shell adds soft coverage, front to back. a is 1 when the ray finds no wheat.
vec4 wheatNear(vec3 rd, float fx) {
  vec3 lit = uSunCol * 0.5 + uAmb * 0.55;
  vec3 acc = vec3(0.0);
  float T = 1.0;
  // The soft edge of an ear, in cell units, grows with the pixel footprint.
  float aa = clamp(fx / 0.045 * 1.5, 0.04, 0.5);
  for (int i = 0; i < 18; i++) {
    float h = 1.1 - float(i) * 0.03;
    float t = (CAMH - h) / -rd.y;
    vec2 xz = rd.xz * t;
    if (abs(xz.x - ROAD_X) < WHEAT_GAP) return vec4(0.0, 0.0, 0.0, 1.0);
    float g = gust(xz);
    // Undo the lean, to find the stalk that holds this point.
    vec2 b = xz - bend(xz, h, g);
    // A turned, warped grid: no straight rows line up across the shells.
    b = mat2(0.83, -0.56, 0.56, 0.83) * b;
    vec2 q = b / 0.045 + 1.8 * vec2(vn(b * 1.7), vn(b * 1.7 + 9.0));
    // The offset keeps the hash clear of cell index 0, where it degenerates.
    vec2 cell = floor(q) + 517.0, f = fract(q);
    // The ear stays inside its cell, so no cell edge cuts it.
    vec2 o = 0.32 + 0.36 * vec2(th(cell), th(cell + 3.1));
    float top = 0.9 + 0.17 * th(cell + 7.7);
    // An ear is 11 cm long and thickest in its middle; below it, a thin stalk.
    float e = (top - h) / 0.11;
    float r = e > 0.0 && e < 1.0 ? 0.24 * sin(3.14159 * sqrt(e)) : (e >= 1.0 ? 0.07 : 0.0);
    float d = length(f - o);
    float k = smoothstep(r + aa, r - aa, d) * step(0.0, e);
    // The awns: a pale fringe round the top of the ear.
    float awn = e > -0.35 && e < 0.6 ? smoothstep(0.31 + aa, 0.2, d) * 0.35 : 0.0;
    k = max(k, awn);
    if (k > 0.0) {
      // Lower in the stand the light fails; a gust tips the pale stalks into view.
      float depth = clamp((h - 0.6) / 0.5, 0.0, 1.0);
      vec3 ear = mix(vec3(0.3, 0.2, 0.08), vec3(0.5, 0.36, 0.15), th(cell + 1.3));
      ear = mix(ear, vec3(0.52, 0.45, 0.28), g * 0.45);
      acc += T * k * ear * lit * mix(0.55, 1.0, depth);
      T *= 1.0 - k;
      if (T < 0.03) break;
    }
  }
  // Under the ears: stalks in their own shade.
  acc += T * vec3(0.2, 0.13, 0.05) * lit * 0.55;
  return vec4(acc, 0.0);
}
vec3 ground(vec3 rd, float px) {
  float t = CAMH / -rd.y;
  vec3 P = rd * t;
  // The footprint of one pixel on the ground, in metres.
  float fx = t * px / uFoc;
  float ax = abs(P.x - ROAD_X);
  vec3 col = wheatFar(P.xz, fx);
  // Near the eye the wheat stands up in shells, faded out before it shimmers.
  float nearK = 1.0 - smoothstep(0.01, 0.03, fx);
  if (nearK > 0.0) {
    vec4 w = wheatNear(rd, fx);
    if (w.a < 0.5) col = mix(col, w.rgb, nearK);
  }
  // The ditch and verge, gravel shoulders, asphalt, a white edge line, a double yellow line.
  vec3 lit = uSunCol * 0.55 + uAmb * 0.6;
  col = mix(col, vec3(0.16, 0.17, 0.06) * lit, band(ax - 5.5, 0.7, fx));
  col = mix(col, vec3(0.2, 0.18, 0.15) * lit, band(ax - 4.3, 0.5, fx));
  col = mix(col, vec3(0.05, 0.05, 0.052) * (0.9 + 0.2 * vn(P.xz * 0.7)) * lit, band(ax, 3.7, fx));
  col = mix(col, vec3(0.7) * lit, band(ax - 3.45, 0.06, fx));
  float dx = P.x - ROAD_X;
  col = mix(col, vec3(0.62, 0.42, 0.04) * lit, max(band(dx - 0.12, 0.05, fx), band(dx + 0.12, 0.05, fx)));
  // The storm shades the plain under its base.
  vec3 C = toCam(P) * 0.001;
  float under = 1.0 - smoothstep(0.6, 1.0, length((C.xz - SHELF) / SHELF_R));
  col = mix(col, col * uAmb * 0.35, under);
  // Air between the eye and the ground.
  return mix(col, hazeCol(rd), 1.0 - exp(-t / 22000.0));
}

/* ---------- objects on the plain ---------- */
// Screen x and y of a world point in metres.
vec2 proj(vec3 P) { vec3 c = toCam(P); return vec2(c.x, c.y - CAMH) / -c.z * uFoc; }
float depthOf(vec3 P) { return -toCam(P).z; }
// Pastes a lit flat shape over c. k is coverage.
void over(inout vec3 c, vec3 col, float k) { c = mix(c, col, clamp(k, 0.0, 1.0)); }
// Coverage of the box a..b in screen units, at pixel size px.
float box(vec2 s, vec2 a, vec2 b, float px) {
  vec2 lo = clamp((s - a) / px + 0.5, 0.0, 1.0), hi = clamp((b - s) / px + 0.5, 0.0, 1.0);
  return lo.x * lo.y * hi.x * hi.y * min(1.0, (b.x - a.x) / px) * min(1.0, (b.y - a.y) / px);
}
// The haze over a thing t metres off, in direction d.
vec3 hazed(vec3 col, vec3 d, float t) { return mix(col, hazeCol(d), 1.0 - exp(-t / 30000.0)); }

// Telephone poles down the far verge, 55 m apart, with three sagging wires.
const float POLE_X = ROAD_X + 9.0, POLE_Z0 = 10.0, POLE_GAP = 55.0;
void poles(inout vec3 c, vec2 s, vec3 rd, float px) {
  vec3 wood = uSunCol * vec3(0.16, 0.1, 0.06) + uAmb * 0.03;
  for (int i = 0; i < 48; i++) {
    vec3 P = vec3(POLE_X, 0.0, -(POLE_Z0 + POLE_GAP * float(i)));
    float z = depthOf(P);
    vec2 b = proj(P);
    if (abs(s.x - b.x) > 2.6 / z * uFoc + px) continue;
    float w = 0.15 / z * uFoc;
    vec2 tp = proj(P + vec3(0.0, 10.0, 0.0));
    float k = box(s, vec2(b.x - w, b.y), vec2(b.x + w, tp.y), px);
    // The cross-arm.
    vec2 ca = proj(P + vec3(-1.2, 9.1, 0.0)), cb = proj(P + vec3(1.2, 9.25, 0.0));
    k = max(k, box(s, vec2(min(ca.x, cb.x), ca.y), vec2(max(ca.x, cb.x), cb.y), px));
    over(c, hazed(wood, rd, z), k);
  }
  // The wires: for each screen column, the place along the line of poles.
  vec3 wire = uAmb * 0.05;
  float sn = sin(uYaw), cs = cos(uYaw), k = s.x / uFoc;
  for (int j = 0; j < 3; j++) {
    float wx = POLE_X + float(j - 1) * 1.1, wy = j == 1 ? 9.9 : 9.2;
    float den = k * cs - sn;
    if (abs(den) < 1e-5) continue;
    float wz = -wx * (cs + k * sn) / den;
    float zz = depthOf(vec3(wx, 0.0, wz));
    if (zz < 1.0 || -wz < POLE_Z0 || -wz > 2700.0) continue;
    float u = fract((-wz - POLE_Z0) / POLE_GAP);
    float y = wy - 0.8 * 4.0 * u * (1.0 - u);
    float sy = (y - CAMH) / zz * uFoc;
    float thick = 0.02 / zz * uFoc;
    float a = clamp(1.0 - abs(s.y - sy) / (px * 0.8), 0.0, 1.0) * min(1.0, thick * 2.0 / px + 0.15);
    over(c, hazed(wire, rd, zz), a * 0.9);
  }
}
// The farm, about a mile off to the left: a house, a barn, a windmill, a shelterbelt.
void farm(inout vec3 c, vec2 s, vec3 rd, float px) {
  float z = -1500.0, x = -420.0;
  vec2 at = proj(vec3(x, 0.0, z));
  if (abs(s.x - at.x) > 0.06 || s.y > at.y + 0.03) return;
  // The trees behind the house: a dark ragged hedge.
  vec2 t0 = proj(vec3(x - 60.0, 0.0, z - 40.0)), t1 = proj(vec3(x + 30.0, 0.0, z - 40.0));
  if (s.x > t0.x && s.x < t1.x) {
    float u = (s.x - t0.x) / (t1.x - t0.x);
    float h = 9.0 + 6.0 * vn(vec2(u * 9.0, 1.3)) * (0.4 + 0.6 * sin(u * 3.14159));
    float top = proj(vec3(x, h, z - 40.0)).y;
    over(c, hazed(vec3(0.012, 0.016, 0.008) + uSunCol * 0.012, rd, -z), clamp((top - s.y) / px + 0.5, 0.0, 1.0) * step(t0.y, s.y));
  }
  // The barn: red, with a gambrel roof.
  {
    float zb = z - 20.0;
    vec2 a = proj(vec3(x - 35.0, 0.0, zb)), b = proj(vec3(x - 17.0, 7.0, zb));
    vec3 red = uSunCol * vec3(0.16, 0.035, 0.025) + uAmb * vec3(0.03, 0.01, 0.01);
    float k = box(s, a, b, px);
    float mid = (a.x + b.x) * 0.5, hw = (b.x - a.x) * 0.5, u = abs(s.x - mid) / hw;
    float roof = proj(vec3(x - 26.0, mix(12.0, 7.0, u < 0.55 ? u * 0.45 : 0.25 + (u - 0.55) * 1.65), zb)).y;
    k = max(k, clamp((roof - s.y) / px + 0.5, 0.0, 1.0) * step(b.y - px, s.y) * step(u, 1.0));
    over(c, hazed(red, rd, -zb), k);
  }
  // The house: white boards, a dark gable roof.
  {
    vec2 a = proj(vec3(x - 3.0, 0.0, z)), b = proj(vec3(x + 9.0, 5.5, z));
    over(c, hazed(uSunCol * 0.42 + uAmb * 0.12, rd, -z), box(s, a, b, px));
    float mid = (a.x + b.x) * 0.5, hw = (b.x - a.x) * 0.5 * 1.1, u = abs(s.x - mid) / hw;
    float roof = proj(vec3(x + 3.0, 5.5 + 3.2 * (1.0 - u), z)).y;
    float k = clamp((roof - s.y) / px + 0.5, 0.0, 1.0) * step(b.y - px * 0.5, s.y) * step(u, 1.0);
    over(c, hazed(uAmb * 0.05 + uSunCol * 0.02, rd, -z), k);
  }
  // The windmill: a thin lattice tower and a wheel of blades that turns with the wind.
  {
    vec3 W = vec3(x + 25.0, 0.0, z + 30.0);
    float zw = depthOf(W);
    vec2 a = proj(W), tp = proj(W + vec3(0.0, 13.0, 0.0));
    float w = mix(1.0, 0.25, clamp((s.y - a.y) / (tp.y - a.y), 0.0, 1.0)) / zw * uFoc;
    vec3 steel = uAmb * 0.05 + uSunCol * 0.03;
    float k = box(s, vec2(a.x - w, a.y), vec2(a.x + w, tp.y), px) * 0.8;
    vec2 r = s - tp;
    float rad = 2.4 / zw * uFoc;
    float ang = atan(r.y, r.x) + uT * (0.8 + 3.0 * uWind);
    float blades = smoothstep(0.2, 0.6, abs(sin(ang * 9.0))) * 0.5 + 0.5;
    k = max(k, clamp((rad - length(r)) / px + 0.5, 0.0, 1.0) * blades);
    over(c, hazed(steel, rd, zw), k);
  }
}
// Stage 1 funnels: flat grey cones from the wall cloud to the ground.
void funnel(inout vec3 c, vec2 s, vec3 rd, float px, vec4 tor) {
  if (tor.w < 0.5) return;
  vec3 G = vec3(tor.x, 0.0, tor.y);
  float z = depthOf(G);
  float f = clamp(tor.z / 1100.0, 0.0, 1.0);
  vec2 g = proj(G);
  float topY = proj(G + vec3(0.0, BASE * 1000.0 - 250.0, 0.0)).y;
  if (s.y < g.y - px * 2.0 || s.y > topY + px * 2.0) return;
  // u runs 0 at the ground to 1 in the cloud.
  float u = clamp((s.y - g.y) / (topY - g.y), 0.0, 1.0);
  float flare = mix(1.0, mix(2.2, 1.3, f), pow(u, 3.0));
  float hw = 0.5 * tor.z * flare / z * uFoc;
  // The rope leans and wanders a little.
  float lean = (sin(u * 3.0 + uT * 0.4 + tor.x) * 0.04 + u * 0.06) * (1.0 - f) * (topY - g.y);
  float dx = s.x - g.x - lean;
  float k = clamp((hw - abs(dx)) / px + 0.5, 0.0, 1.0) * min(1.0, 2.0 * hw / px + 0.3);
  k *= smoothstep(g.y - px, g.y + px, s.y);
  // Lit on its near side by the low sun; dirt darkens the foot.
  float side = 0.5 + 0.5 * dx / max(hw, px);
  vec3 col = uAmb * 0.12 + uSunCol * 0.05 * (0.6 + 0.4 * side);
  col = mix(col * vec3(0.7, 0.6, 0.5), col, smoothstep(0.0, 0.3, u));
  over(c, hazed(col, rd, z), k * mix(0.75, 0.97, f));
  // A dust whirl at the foot.
  vec2 dq = (s - g) / (tor.z * 1.6 / z * uFoc);
  float dust = exp(-dot(dq * vec2(1.0, 2.2), dq * vec2(1.0, 2.2)) * 2.0) * step(g.y - px, s.y);
  over(c, hazed(uAmb * 0.08 + uSunCol * vec3(0.06, 0.04, 0.025), rd, z), dust * 0.6);
}

vec3 envScene(vec2 uv) {
  float asp = uRes.x / uRes.y, px = 1.0 / uRes.y;
  vec2 s = vec2((uv.x - 0.5) * asp, uv.y - uHz);
  vec3 rc = normalize(vec3(s, -uFoc));
  vec3 rd = toWorld(rc);
  gSunC = toCam(uSun);
  vec3 c;
  if (rd.y < -1e-4) {
    c = ground(rd, px);
  } else {
    c = skyCol(rd);
    float tHit;
    vec4 st = storm(rc, tHit);
    // The far storm sinks into the haze.
    float h = 1.0 - exp(-tHit / 70.0);
    c = c * (1.0 - st.a) + mix(st.rgb, hazeCol(rd) * st.a, h * 0.8);
    // Under the base: the gloom, and the rain curtain hanging out of the core.
    vec3 ro = vec3(0.0, CAMH * 0.001, 0.0);
    vec2 gl = cylinder(ro, rc, SHELF, SHELF_R.y * mix(0.4, 0.95, uStorm), 0.0, BASE + 0.2);
    vec2 rn = cylinder(ro, rc, CORE, mix(1.3, 4.6, uStorm), 0.0, BASE + 0.4);
    vec3 gloom = uAmb * vec3(0.07, 0.09, 0.09);
    c = mix(c, gloom, 1.0 - exp(-gl.y * gl.y * 0.003 * uStorm));
    float streak = 0.6 + 0.4 * vn(vec2(atan(rc.x, -rc.z) * 900.0, 0.5));
    c = mix(c, gloom * vec3(0.8, 1.0, 0.95) + uSunCol * 0.01, (1.0 - exp(-rn.y * rn.y * 0.05 * uStorm * streak)) * smoothstep(0.0, 0.003, rd.y + 0.001));
  }
  // The thin band where ground meets sky takes the haze.
  c = mix(c, hazeCol(rd), exp(-abs(rd.y) * 900.0) * 0.6);
  funnel(c, s, rd, px, uTor0);
  funnel(c, s, rd, px, uTor1);
  funnel(c, s, rd, px, uTor2);
  funnel(c, s, rd, px, uTor3);
  farm(c, s, rd, px);
  poles(c, s, rd, px);
  return c;
}
`;

/* ---------- state ---------- */
let storm = 0.85, fLevel = 2, visible = true, simT = 0, lastInput = 0, asleep = false;
// Placeholder funnels: x and z in metres, the F level, and its eased width.
/** @type {{ x: number, z: number, f: number, w: number }[]} */
const tors = [];
const torU = [0, 1, 2, 3].map(() => [0, 0, 0, 0]);
// The sun behind the eye, low, a little off to the left.
const sun = [0, 0, 0], sunCol = [0, 0, 0], amb = [0, 0, 0];
function setSun(hour) {
  // Elevation in degrees: 25 in the afternoon, 1 at dusk.
  const el = clamp((19.6 - hour) / 3.6) * 25 * Math.PI / 180 + 0.015;
  const az = 0.35;
  sun[0] = -Math.sin(az) * Math.cos(el); sun[1] = Math.sin(el); sun[2] = Math.cos(az) * Math.cos(el);
  // Low light is warm and weak; the sky's fill turns blue and dim.
  const k = clamp(el / 0.44);
  const g = 0.5 + 0.5 * k;
  sunCol[0] = 2.6 * (0.45 + 0.55 * g); sunCol[1] = 2.6 * (0.2 + 0.7 * g * g); sunCol[2] = 2.6 * (0.08 + 0.72 * k * k);
  amb[0] = 0.18 + 0.2 * k; amb[1] = 0.22 + 0.24 * k; amb[2] = 0.32 + 0.3 * k;
}
const aspect = () => canvas.clientWidth / Math.max(1, canvas.clientHeight);
// The lens: a narrow frame takes a somewhat wider one and crops the storm's sides.
const focal = () => 0.95 * Math.min(1, Math.sqrt(aspect() / 1.3));
// The road vanishes on the right golden line.
const ROAD_VP = 1 - GOLD;
// The eye turns left until the road's vanishing point lies there.
const yaw = () => Math.atan((ROAD_VP - 0.5) * aspect() / focal());
// Camera space to world space, and back, about the vertical axis.
const toWorld = (x, z, a = yaw()) => [x * Math.cos(a) + z * Math.sin(a), -x * Math.sin(a) + z * Math.cos(a)];

const canvas = document.createElement('canvas');
stage.prepend(canvas);
let env = null;
try {
  env = environment(canvas, {
    scene: SCENE,
    animated: true,
    budget: 1.8e6,
    active: () => visible,
    onFrame: raw => step(Math.min(raw, 0.05)),
    uniforms: {
      uSun: () => sun, uSunCol: () => sunCol, uAmb: () => amb,
      uFoc: focal, uHz: horizon, uYaw: yaw, uWind: () => storm, uStorm: () => storm, uT: () => simT,
      uTor0: () => torU[0], uTor1: () => torU[1], uTor2: () => torU[2], uTor3: () => torU[3],
    },
  });
} catch (err) {
  /** @type {HTMLElement} */ (stage.querySelector('.fail')).hidden = false;
  ui.hideControls?.();
  mark('first-frame');
  throw err;
}
const S = env.state;
// No pane, no rain in the air, no water: the plain under a clear sky behind the eye.
Object.assign(S.on, { glass: false, water: false, air: false, flare: false, sky: false });
Object.assign(S, { clouds: 0, stars: 0, haze: 0.4, bloom: 0.18, thr: 1.4, orbs: 0, vig: 0.38, grain: 0.035, tintK: 0, expo: 1 });
S.frame = false;

function packTors() {
  for (let i = 0; i < 4; i++) {
    const t = tors[i];
    torU[i] = t ? [t.x, t.z, t.w, 1] : [0, 0, 0, 0];
  }
}
// The frame loop: funnels ease to their width; 60 s with no input puts the scene to sleep.
function step(dt) {
  simT += dt;
  for (const t of tors) t.w += (F_WIDTH[t.f] - t.w) * (1 - Math.exp(-dt / 1.2));
  packTors();
  if (!asleep && performance.now() - lastInput > 60000) { asleep = true; env.paused = true; }
}
function wake() {
  lastInput = performance.now();
  if (asleep) { asleep = false; env.paused = false; }
  env.touch();
}

/* ---------- placing funnels ---------- */
// The ground point under a screen point, kept under the storm's reach.
function groundAt(clientX, clientY) {
  const r = canvas.getBoundingClientRect();
  const asp = r.width / r.height, foc = focal();
  const sx = ((clientX - r.left) / r.width - 0.5) * asp, sy = (1 - (clientY - r.top) / r.height) - horizon();
  // Funnels stay far off: a near click puts one 8 km out, a sky click 36 km out.
  const dist = sy < -1e-4 ? clamp(1.7 * Math.hypot(foc, sx) / -sy, 8000, 36000) : 36000;
  const [x, z] = toWorld(dist * sx / Math.hypot(foc, sx), -dist * foc / Math.hypot(foc, sx));
  return { x, z };
}
function touchDown(x, z) {
  if (tors.length >= MAX_TOR) tors.shift();
  // A fresh funnel starts as a thread and eases to its width.
  tors.push({ x, z, f: fLevel, w: reduced() ? F_WIDTH[fLevel] : F_WIDTH[0] * 0.3 });
  packTors();
  wake();
}
let drag = null;
canvas.addEventListener('pointerdown', e => {
  if (e.button !== 0) return;
  const g = groundAt(e.clientX, e.clientY);
  // A press near a funnel's foot steers it; elsewhere it touches one down.
  const near = tors.find(t => Math.hypot(t.x - g.x, t.z - g.z) < Math.max(900, t.w * 1.5, Math.hypot(t.x, t.z) * 0.08));
  if (near) { drag = near; canvas.setPointerCapture(e.pointerId); wake(); return; }
  touchDown(g.x, g.z);
});
canvas.addEventListener('pointermove', e => {
  if (!drag) return;
  const g = groundAt(e.clientX, e.clientY);
  drag.x = g.x; drag.z = g.z;
  packTors();
  wake();
});
const endDrag = () => { drag = null; };
canvas.addEventListener('pointerup', endDrag);
canvas.addEventListener('pointercancel', endDrag);
stage.addEventListener('keydown', e => {
  if (e.target !== stage || (e.key !== ' ' && e.key !== 'Enter')) return;
  e.preventDefault();
  act.add();
});

act.f = v => {
  fLevel = +v.slice(1);
  // Stage 1: the newest funnel takes the new level.
  const last = tors[tors.length - 1];
  if (last) last.f = fLevel;
  wake();
};
act.add = () => {
  // A new funnel drops under the wall cloud, a little off from the last one.
  const n = tors.length;
  const [x, z] = toWorld(-6000 + (n % 2 ? 1 : -1) * 1300 * Math.ceil(n / 2) + (Math.random() - 0.5) * 400, -25000 + (Math.random() - 0.5) * 2500);
  touchDown(x, z);
};
act.clear = () => { tors.length = 0; packTors(); wake(); };
act.storm = v => { storm = v; wake(); };
act.time = v => { S.hour = HOURS[v] ?? HOURS.golden; setSun(S.hour); wake(); };
act.expo = v => { S.expo = v; wake(); };

/* ---------- start ---------- */
storm = ui.slider?.value ?? storm;
act.time(ui.setting('time')?.value ?? 'golden');
S.expo = ui.setting('expo')?.value ?? 1;
// QA can start with funnels down: ?tor=F3,F5 places them under the wall cloud.
const qs = new URLSearchParams(location.search);
if (qs.has('tor')) for (const f of qs.get('tor').split(',')) { fLevel = clamp(+f.replace(/\D/g, '') || 0, 0, 5); act.add(); }
lastInput = performance.now();
env.draw();
canvas.classList.add('on');
mark('first-frame');
// A hidden tab stops the loop and the clock.
whenVisible(stage, v => { visible = v; if (v) env.touch(); });
