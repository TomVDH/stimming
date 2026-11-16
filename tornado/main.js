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
// Ground width in metres per F level; the shader holds the same table in fWidth().
const F_WIDTH = [25, 70, 160, 320, 600, 1100];
// Travel speed in m/s, and how far the condensation reaches down (1 is the ground).
const F_SPEED = [6, 8, 10, 12, 14, 16];
const F_COND = [0.72, 0.86, 1, 1, 1, 1];
// Seconds a tornado lives before it ropes out by itself.
const F_LIFE = [55, 70, 85, 100, 115, 130];
const MAX_TOR = 4;
// Linear lookup in a per-level table at an eased level.
const fAt = (tab, f) => { const i = Math.min(4, Math.floor(f)), u = clamp(f - i); return tab[i] + (tab[i + 1] - tab[i]) * u; };

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
// The eye crouches in the wheat beside a two-lane road and looks along it.
// Ground units are metres; the storm's units are kilometres.
// Golden lines: the horizon sits 0.382 up the frame.
const GOLD = 0.381966;
const horizon = () => GOLD;
const SCENE = /* glsl */`
uniform vec3 uSun, uSunCol, uAmb;
uniform float uFoc, uHz, uYaw, uStorm, uWind, uT;
// The tornadoes: see the tornado section for what A and B hold.
uniform vec4 uTor0, uTor1, uTor2, uTor3, uTorB0, uTorB1, uTorB2, uTorB3;
// The eye crouches just over the ears, 1.25 m up.
const float CAMH = 1.25;
// The storm's parts in km, in camera space. The updraft, the wall cloud, the rain core.
// The updraft and the wall cloud sit on the left golden line of a wide frame.
const vec2 TOWER = vec2(-9.5, -40.0);
const vec2 WALL = vec2(-6.0, -25.0);
const vec2 CORE = vec2(3.0, -36.0);
const float BASE = 1.35;
// The base shelf: its centre and its two half widths.
const vec2 SHELF = vec2(-4.0, -29.0);
const vec2 SHELF_R = vec2(17.0, 14.0);
// The sun's direction in camera space, and the pixel size; set once per pixel.
vec3 gSunC;
float gPx;

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
vec3 skyCol(vec3 d) {
  vec3 c = skDusk(d, uSun, uZen, uMid, uBand, uAnti);
  // Storm air is dusty: a little grey in the blue.
  c = mix(c, vec3(dot(c, vec3(0.3, 0.55, 0.15))), 0.3);
  // Low sun lights the dust over the plain: a warm band at the horizon.
  float low = exp(-max(d.y, 0.0) * 9.0);
  return mix(c, uSunCol * vec3(0.16, 0.12, 0.09) + uAmb * 0.1, low * 0.6);
}
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
  float shelf = max((length(b) - 1.0) * SHELF_R.y * mix(0.4, 1.0, g), abs(p.y - (BASE + 0.6)) - 0.6);
  // The anvil: flat on top, thin at its edge, and streaming off to the right.
  vec3 a = p - vec3(TOWER.x + mix(2.0, 14.0, g), top - 0.5, TOWER.y - 2.0);
  float anvil = max((length(a / vec3(mix(6.0, 28.0, g), 1.7, mix(4.0, 9.0, g))) - 1.0) * 1.6, p.y - top - 0.5);
  // The overshooting top domes above the anvil, over the updraft.
  vec3 o = p - vec3(TOWER.x + 0.28 * (top - BASE), top + 0.4, TOWER.y - 0.12 * (top - BASE));
  float dome = length(o * vec3(1.0, 1.6, 1.0)) / 1.6 - mix(1.4, 2.8, g);
  // The wall cloud: a lowered block under the base, by the rotation.
  float wall = max(length(p.xz - WALL) - mix(0.5, 2.4, g) * (1.0 - 0.25 * smoothstep(BASE, 0.5, p.y)), abs(p.y - BASE + 0.35) - 0.5);
  float d = smin(tower, shelf, 1.4);
  d = smin(d, dome, 1.2);
  d = smin(d, anvil, 2.2);
  d = smin(d, wall, 0.6);
  return d;
}
float stormD(vec3 p) {
  float d = stormShape(p);
  if (d > 2.5) return d;
  // Lumpy towers, a smoother anvil.
  float amp = mix(1.1, 0.45, smoothstep(9.0, 12.0, p.y)) * mix(0.55, 1.0, smoothstep(BASE + 0.5, BASE + 2.5, p.y));
  vec3 n = p * 0.75 + vec3(0.0, -uT * 0.006, 0.0);
  d += (fbm3(n) + 0.0625 * vn3(n * 8.3) - 0.5) * amp;
  // The base: stacked plates on its flank, turning round the updraft.
  float flank = smoothstep(BASE, BASE + 0.3, p.y) * (1.0 - smoothstep(BASE + 1.6, BASE + 2.4, p.y));
  float turn = atan(p.z - TOWER.y, p.x - TOWER.x);
  d += 0.16 * flank * sin(p.y * 15.0 + turn * 2.0 + 1.3 * vn3(p * 1.4));
  // Ragged scud hangs under the base.
  float low = 1.0 - smoothstep(BASE - 0.2, BASE + 0.4, p.y);
  return d + low * (vn3(p * 3.1 + vec3(uT * 0.01, 0.0, 0.0)) - 0.45) * 0.55;
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
  // The core: between the updraft and the rain, low down.
  vec2 cc = mix(TOWER, CORE, 0.55);
  float core = (1.0 - smoothstep(3.0, 9.0, length(p.xz - cc))) * (1.0 - smoothstep(3.0, 8.0, p.y));
  vec3 amb = uAmb * mix(0.08, 0.85, up) * (1.0 - 0.7 * under);
  // The lower flank stays dark: the storm's own bulk shades it.
  vec3 c = uSunCol * lit * lit * mix(0.14, 0.8, up * up) + amb;
  // The core goes black-green behind its rain.
  return mix(c, c * vec3(0.22, 0.46, 0.38), core * 0.9);
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
// The eye hangs over the road's left edge; the road centre runs 3.4 m to its right.
const float ROAD_X = 3.4, WHEAT_GAP = 6.2;
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
// Each shell adds soft coverage, front to back. a is what still shows of the ground below.
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
    // Over the road and its verges this shell holds no wheat.
    if (abs(xz.x - ROAD_X) < WHEAT_GAP) continue;
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
      // Lower in the stand the light fails a little; the low sun behind lights the field's face.
      float depth = clamp((h - 0.6) / 0.5, 0.0, 1.0);
      vec3 ear = mix(vec3(0.3, 0.2, 0.08), vec3(0.5, 0.36, 0.15), th(cell + 1.3));
      ear = mix(ear, vec3(0.52, 0.45, 0.28), g * 0.45);
      acc += T * k * ear * lit * mix(0.78, 1.0, depth);
      T *= 1.0 - k;
      if (T < 0.03) break;
    }
  }
  // Under the ears: stalks in their own shade.
  // Under the ears: shaded stalks, unless the ray ends on a verge or the road.
  float gx = rd.x * CAMH / -rd.y;
  if (abs(gx - ROAD_X) >= WHEAT_GAP) { acc += T * vec3(0.3, 0.21, 0.09) * lit * 0.8; T = 0.0; }
  return vec4(acc, T);
}
vec3 ground(vec3 rd, float px) {
  float t = CAMH / -rd.y;
  vec3 P = rd * t;
  // The footprint of one pixel on the ground, in metres.
  float fx = t * px / uFoc;
  float ax = abs(P.x - ROAD_X);
  vec3 col = wheatFar(P.xz, fx);
  // The ditch and verge, gravel shoulders, asphalt, a white edge line, a double yellow line.
  vec3 lit = uSunCol * 0.55 + uAmb * 0.6;
  float tuft = vn(P.xz * vec2(9.0, 2.0)) * 0.5 + vn(P.xz * 31.0) * 0.5;
  col = mix(col, vec3(0.13, 0.15, 0.05) * (0.6 + 0.8 * tuft) * lit, band(ax - 5.5, 0.7, fx));
  float grit = mix(0.75, 1.2, vn(P.xz * 40.0) * clamp(1.0 - fx * 40.0, 0.0, 1.0) + 0.5 * clamp(fx * 40.0, 0.0, 1.0));
  col = mix(col, vec3(0.2, 0.18, 0.15) * grit * lit, band(ax - 4.25, 0.57, fx));
  col = mix(col, vec3(0.05, 0.05, 0.052) * (0.9 + 0.2 * vn(P.xz * 0.7)) * lit, band(ax, 3.7, fx));
  col = mix(col, vec3(0.7) * lit, band(ax - 3.45, 0.06, fx));
  float dx = P.x - ROAD_X;
  col = mix(col, vec3(0.62, 0.42, 0.04) * lit, max(band(dx - 0.12, 0.05, fx), band(dx + 0.12, 0.05, fx)));
  // Near the eye the wheat stands up in shells over the ground, faded out before it shimmers.
  float nearK = 1.0 - smoothstep(0.01, 0.03, fx);
  if (nearK > 0.0) {
    vec4 w = wheatNear(rd, fx);
    col = mix(col, w.rgb + w.a * col, nearK);
  }
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
/* ---------- the tornadoes ---------- */
// One tornado in two vectors.
// A: its foot (x, z in metres), the eased F level, 1 when live.
// B: condensation (0 in the cloud, 1 down to the ground), dust, rope-out (0 to 2), a seed.
// The funnel rises to here, in metres, and merges into the wall cloud.
const float TOR_TOP = 1150.0;
// The F-scale table: ground width in metres, F0 to F5.
float fWidth(float f) {
  if (f < 1.0) return mix(25.0, 70.0, f);
  if (f < 2.0) return mix(70.0, 160.0, f - 1.0);
  if (f < 3.0) return mix(160.0, 320.0, f - 2.0);
  if (f < 4.0) return mix(320.0, 600.0, f - 3.0);
  return mix(600.0, 1100.0, clamp(f - 4.0, 0.0, 1.0));
}
// How much wider the funnel grows toward the cloud: ropes flare most, wedges least.
float fFlare(float f) { return mix(3.4, 1.35, f / 5.0); }
// The axis: a slow sway, a lean, and on rope-out a long bent S.
vec2 torAxis(float h, vec4 A, vec4 B) {
  float u = h / TOR_TOP, thin = 1.0 - A.z / 5.0, sd = B.w * 6.2832;
  vec2 o = vec2(sin(u * 2.6 + uT * 0.21 + sd), cos(u * 2.1 + uT * 0.17 + sd * 1.3)) * (20.0 + 140.0 * thin) * u;
  // The top trails toward the wall cloud.
  o += vec2(-0.9, -0.3) * u * (40.0 + 220.0 * thin);
  float r = clamp(B.z, 0.0, 1.0);
  o += vec2(1.0, -0.25) * r * (sin(u * 3.1416) * 700.0 * (1.0 + 0.3 * sin(uT * 0.3 + sd)) + u * 500.0);
  return o;
}
float torRadius(float h, vec4 A, vec4 B) {
  float u = h / TOR_TOP, f = A.z;
  // Roping out, the funnel narrows to a rope about 35 m across.
  float r0 = mix(0.5 * fWidth(f), min(0.5 * fWidth(f), 18.0), clamp(B.z, 0.0, 1.0));
  // The last stretch spreads out into the wall cloud.
  return r0 * mix(1.0, fFlare(f), pow(u, mix(2.6, 1.3, f / 5.0))) * (1.0 + 1.6 * smoothstep(0.82, 1.0, u));
}
// Marches one tornado. Returns its colour, premultiplied, and its cover.
vec4 tornado(vec3 ro, vec3 rd, float tMax, vec4 A, vec4 B) {
  if (A.w < 0.5) return vec4(0.0);
  vec3 G = vec3(A.x, 0.0, A.y);
  float f = A.z, fk = f / 5.0, rope = B.z;
  float w = fWidth(f);
  // The F-scale sets the spin, the dust skirt's height and the debris.
  float vt = mix(45.0, 120.0, fk);
  float skirtH = mix(45.0, 380.0, fk) * B.y;
  // A near-level ray crosses the funnel at one height: find it, then march only near the axis.
  float k2 = max(dot(rd.xz, rd.xz), 1e-6), kl = sqrt(k2);
  float hs = ro.y + rd.y * dot(G.xz - ro.xz, rd.xz) / k2;
  if (hs < -20.0 || hs > TOR_TOP + 80.0) return vec4(0.0);
  float hc0 = clamp(hs, 0.0, TOR_TOP);
  vec2 C = G.xz + torAxis(hc0, A, B);
  float tc = dot(C - ro.xz, rd.xz) / k2;
  vec2 miss = ro.xz + rd.xz * tc - C;
  // The pixel's footprint there: a thin rope stays at least about a pixel wide.
  float foot = tc * gPx / uFoc;
  float Rl = max(torRadius(hc0, A, B), foot) * 1.9 + 30.0;
  if (hs < skirtH * 1.6) Rl = max(Rl, 0.5 * w * 2.2 * 2.3 + 40.0);
  if (length(miss) > Rl) return vec4(0.0);
  float t0 = max(tc - Rl / kl, 0.0), t1 = min(tc + Rl / kl, tMax);
  if (t1 <= t0) return vec4(0.0);
  float hc = mix(TOR_TOP, 0.0, B.x);
  float fade = 1.0 - clamp(rope - 1.0, 0.0, 1.0);
  vec2 sunXZ = normalize(uSun.xz + vec2(1e-4));
  const int STEPS = 36;
  float dt = (t1 - t0) / float(STEPS);
  float t = t0 + dt * th(gl_FragCoord.xy + B.w * 71.0);
  vec3 acc = vec3(0.0);
  float T = 1.0;
  for (int i = 0; i < STEPS; i++) {
    vec3 p = ro + rd * t - G;
    t += dt;
    float h = p.y;
    if (h < 0.0 || h > TOR_TOP + 60.0) continue;
    vec2 q = p.xz - torAxis(h, A, B);
    float r = length(q);
    float Rt = torRadius(h, A, B);
    // Under a pixel wide, the rope keeps a pixel's width and thins its density.
    float R = max(Rt, foot * 0.7), thinK = (Rt / R) * (Rt / R);
    float ang = atan(q.y, q.x);
    // Spin: the wall turns at vt over R; a twist up the height draws helices.
    float om = min(vt / max(R, 8.0), 3.0);
    float a1 = ang - om * uT + h / (R * 3.0 + 30.0);
    vec3 nc = vec3(cos(a1) * 1.6, sin(a1) * 1.6, h / (R * 2.2 + 40.0) - uT * 0.05) + B.w * 13.0;
    float n = fbm3(nc);
    // The condensation funnel: a ragged wall and a ragged lower edge.
    float edge = R * (1.0 + mix(0.55, 0.85, fk) * (n - 0.45));
    float cond = smoothstep(edge, edge * 0.55, r) * smoothstep(hc - 50.0, hc + 50.0, h + (n - 0.5) * 0.25 * TOR_TOP);
    // Rope-out tears the funnel into pieces.
    if (rope > 0.4) cond *= smoothstep(0.0, 0.25, vn(vec2(h * 0.006 + uT * 0.05, B.w * 9.0)) - (rope - 0.4) * 0.55);
    // The top thins into the cloud base, so no hard rim shows.
    cond *= fade * thinK * (1.0 - smoothstep(TOR_TOP * 0.86, TOR_TOP + 40.0, h + (n - 0.5) * 120.0));
    // The dust skirt: wider than the funnel, spinning faster, low and turbulent.
    float dust = 0.0;
    if (skirtH > 1.0 && h < skirtH * 1.6) {
      float a2 = ang - om * 1.6 * uT;
      float nd = fbm3(vec3(cos(a2) * 2.2, sin(a2) * 2.2, h / (skirtH * 0.5) - uT * 0.3) + B.w * 5.0);
      float Rd = 0.5 * w * mix(2.2, 1.7, fk) * (1.0 + 0.9 * h / skirtH);
      // Billows: only the dense half of the noise holds dust.
      float puff = smoothstep(0.38, 0.7, nd);
      dust = smoothstep(Rd, Rd * 0.25, r * (0.75 + 0.6 * nd)) * (1.0 - smoothstep(skirtH * 0.3, skirtH * 1.3, h + (nd - 0.5) * skirtH * 1.4)) * puff * 2.2 * fade;
    }
    float sig = cond * 0.05 + dust * mix(0.012, 0.03, fk);
    if (sig <= 1e-4) continue;
    float a = 1.0 - exp(-sig * dt);
    // The low sun behind the eye lights the near face; the far side and the core fall dark.
    float ndl = clamp(dot(q / max(r, 1e-3), sunXZ), 0.0, 1.0);
    float lit = (0.3 + 0.7 * ndl) * smoothstep(0.0, 1.0, r / max(R, 1e-3));
    // Helical bands and lumps in the wall catch the light unevenly.
    float band = 0.5 + 0.5 * sin(a1 * 5.0 + h / (R * 0.7 + 10.0) + n * 4.0);
    lit *= (0.55 + 0.9 * n) * (0.75 + 0.45 * band);
    // Strong tornadoes are dark with dirt and rain: grey at F2, near black at F5.
    float dark = mix(1.0, 0.38, smoothstep(1.5, 5.0, f));
    vec3 cc = (uAmb * 0.17 + uSunCol * 0.1 * lit) * dark;
    // Up near the base the funnel takes the gloom's colour.
    cc = mix(cc, uAmb * vec3(0.05, 0.085, 0.075), smoothstep(TOR_TOP * 0.6, TOR_TOP, h) * 0.7);
    // Dirt drawn up into the foot of a strong funnel.
    cc = mix(cc, cc * vec3(0.72, 0.6, 0.48), (1.0 - smoothstep(0.0, 0.35 * TOR_TOP, h)) * fk);
    vec3 dc = (uAmb * 0.12 + uSunCol * 0.08 * (0.4 + 0.6 * ndl)) * vec3(0.78, 0.62, 0.46);
    vec3 col = (cc * cond * 0.05 + dc * dust * mix(0.012, 0.03, fk)) / sig;
    acc += T * a * col;
    T *= 1.0 - a;
    if (T < 0.02) break;
  }
  // Air between the eye and the tornado; under the storm the haze is thin.
  float hz = 1.0 - exp(-t0 / 70000.0);
  acc = mix(acc, hazeCol(rd) * (1.0 - T), hz);
  return vec4(acc, 1.0 - T);
}
void tornadoes(inout vec3 c, vec3 rd) {
  vec3 ro = vec3(0.0, CAMH, 0.0);
  float tMax = rd.y < 0.0 ? CAMH / -rd.y : 1e9;
  vec4 r;
  r = tornado(ro, rd, tMax, uTor0, uTorB0); c = c * (1.0 - r.a) + r.rgb;
  r = tornado(ro, rd, tMax, uTor1, uTorB1); c = c * (1.0 - r.a) + r.rgb;
  r = tornado(ro, rd, tMax, uTor2, uTorB2); c = c * (1.0 - r.a) + r.rgb;
  r = tornado(ro, rd, tMax, uTor3, uTorB3); c = c * (1.0 - r.a) + r.rgb;
}

// The foreground: large ears a metre or two off, soft with defocus, swaying in the gusts.
// They live in camera space; far ones draw first, so near ones cover them.
float segD(vec2 p, vec2 a, vec2 b, out float u) {
  vec2 ab = b - a;
  u = clamp(dot(p - a, ab) / dot(ab, ab), 0.0, 1.0);
  return length(p - a - ab * u);
}
void nearEars(inout vec3 c, vec2 s, float px, float asp) {
  // The tallest ear, with its tuft, stays below this line.
  if (s.y > 0.0) return;
  vec3 lit = uSunCol * 0.5 + uAmb * 0.55;
  const int N = 56;
  for (int i = 0; i < N; i++) {
    float fi = float(i);
    float z = 4.0 - fi * (3.3 / float(N));
    float hw = 0.5 * asp / uFoc * z;
    float x = (th(vec2(fi, 4.2)) - 0.5) * 2.2 * hw;
    float top = 0.98 + 0.12 * th(vec2(fi, 9.1));
    // The gust at this ear, from its place in the world.
    vec3 W = toWorld(vec3(x, 0.0, -z));
    // No ears on the road or its verges.
    if (abs(W.x - ROAD_X) < WHEAT_GAP) continue;
    float g = gust(W.xz);
    vec2 lean = bend(W.xz, 1.0, g);
    // The lean in camera space, as screen units at this depth.
    float lx = (lean.x * cos(uYaw) - lean.y * sin(uYaw)) / z * uFoc;
    vec2 tip = vec2(x / z * uFoc + lx, (top - CAMH) / z * uFoc);
    vec2 base = vec2(x / z * uFoc + lx * 0.55, (top - 0.11 - CAMH) / z * uFoc);
    if (s.y > tip.y + 0.1 / z) continue;
    float w = 0.011 / z * uFoc;
    // Defocus: the nearer the ear, the softer its edge.
    float bl = 0.009 / z * uFoc + px;
    float u;
    float d = segD(s, base, tip, u);
    // Kernel rows bead the ear's edge.
    float ww = w * (0.55 + 0.45 * sin(3.14159 * sqrt(u))) * (0.88 + 0.12 * sin(u * 30.0));
    float k = smoothstep(ww + bl, ww - bl, d);
    // The stalk: thin, down out of the frame.
    float us;
    vec2 foot = vec2(x / z * uFoc, -1.0);
    float ds = segD(s, foot, base, us);
    float ws = 0.0022 / z * uFoc;
    k = max(k, smoothstep(ws + bl, ws - bl, ds) * 0.9);
    // The awns: a pale tuft past the tip.
    float ua;
    float da = segD(s, tip, tip + (tip - base) * 0.75, ua);
    k = max(k, smoothstep(w * 1.1 + bl, 0.0, da) * 0.35 * (1.0 - ua));
    if (k <= 0.0) continue;
    vec3 ear = mix(vec3(0.42, 0.29, 0.11), vec3(0.6, 0.45, 0.2), th(vec2(fi, 2.7)));
    // Lit face toward the eye, darker at the rim.
    float rim = clamp(d / max(ww, 1e-4), 0.0, 1.0);
    c = mix(c, ear * lit * (1.05 - 0.4 * rim * rim), clamp(k, 0.0, 1.0));
  }
}

vec3 envScene(vec2 uv) {
  float asp = uRes.x / uRes.y, px = 1.0 / uRes.y;
  vec2 s = vec2((uv.x - 0.5) * asp, uv.y - uHz);
  vec3 rc = normalize(vec3(s, -uFoc));
  vec3 rd = toWorld(rc);
  gSunC = toCam(uSun);
  gPx = px;
  vec3 c;
  if (rd.y < -1e-4) {
    c = ground(rd, px);
  } else {
    c = skyCol(rd);
    // The sky dims round the storm: its shadow and its outflow haze.
    float near = dot(rc, normalize(vec3(SHELF.x, 4.0, SHELF.y)));
    c *= mix(1.0, 0.55, smoothstep(0.8, 0.98, near));
    float tHit;
    vec4 st = storm(rc, tHit);
    // The far storm sinks into the haze.
    float h = 1.0 - exp(-tHit / 70.0);
    c = c * (1.0 - st.a) + mix(st.rgb, hazeCol(rd) * st.a, h * 0.8);
    // Under the base: the gloom, and the rain curtain hanging out of the core.
    vec3 ro = vec3(0.0, CAMH * 0.001, 0.0);
    vec2 gl = cylinder(ro, rc, SHELF, SHELF_R.y * mix(0.4, 0.95, uStorm), 0.0, BASE + 0.2);
    vec2 rn = cylinder(ro, rc, CORE, mix(1.3, 4.6, uStorm), 0.0, BASE + 0.4);
    vec3 gloom = uAmb * vec3(0.05, 0.085, 0.075);
    c = mix(c, gloom, 1.0 - exp(-gl.y * gl.y * 0.003 * uStorm));
    float streak = 0.6 + 0.4 * vn(vec2(atan(rc.x, -rc.z) * 900.0, 0.5));
    c = mix(c, gloom * vec3(0.8, 1.0, 0.95) + uSunCol * 0.01, (1.0 - exp(-rn.y * rn.y * 0.05 * uStorm * streak)) * smoothstep(0.0, 0.003, rd.y + 0.001));
  }
  // The thin band where ground meets sky takes the haze.
  c = mix(c, hazeCol(rd), exp(-abs(rd.y) * 900.0) * 0.6);
  tornadoes(c, rd);
  farm(c, s, rd, px);
  poles(c, s, rd, px);
  nearEars(c, s, px, asp);
  return c;
}
`;

/* ---------- state ---------- */
let storm = 0.85, fLevel = 2, visible = true, simT = 0, lastInput = 0, asleep = false;
// Each tornado: its foot in metres, the eased and the set F level, its life state.
/** @typedef {{ x: number, z: number, f: number, fT: number, cond: number, dust: number, rope: number, roping: boolean, age: number, life: number, seed: number }} Tor */
/** @type {Tor[]} */
const tors = [];
const torU = [0, 1, 2, 3].map(() => [0, 0, 0, 0]);
const torB = [0, 1, 2, 3].map(() => [0, 0, 0, 0]);
// The storm carries its tornadoes to the right and a little toward the eye.
const DRIFT = [0.93, 0.36];
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
      uTorB0: () => torB[0], uTorB1: () => torB[1], uTorB2: () => torB[2], uTorB3: () => torB[3],
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
    torU[i] = t ? [t.x, t.z, t.f, 1] : [0, 0, 0, 0];
    torB[i] = t ? [t.cond, t.dust, t.rope, t.seed] : [0, 0, 0, 0];
  }
}
// One tornado's life: dust spins up, the funnel lowers, it travels, then ropes out.
function live(t, dt) {
  t.age += dt;
  // A new F level eases in over a few seconds.
  t.f += (t.fT - t.f) * (1 - Math.exp(-dt / 2.5));
  if (!t.roping) {
    // Dust rises from the ground before the funnel reaches it.
    t.dust = Math.min(1, t.dust + dt / 3);
    if (t.age > 1.5) t.cond += (fAt(F_COND, t.f) - t.cond) * (1 - Math.exp(-dt / 2.2));
    if (t.age > t.life) t.roping = true;
  } else {
    // The rope bends out over 14 s, then breaks up and fades over 7 s.
    t.rope += dt / (t.rope < 1 ? 14 : 7);
    t.dust = Math.max(0, t.dust - dt / 4);
  }
  if (t !== drag) {
    const v = fAt(F_SPEED, t.f) * (1 - 0.6 * clamp(t.rope));
    t.x += DRIFT[0] * v * dt; t.z += DRIFT[1] * v * dt;
  }
}
// The frame loop: tornadoes live; with none left, 60 s with no input puts the scene to sleep.
function step(dt) {
  simT += dt;
  for (const t of tors) live(t, dt);
  for (let i = tors.length - 1; i >= 0; i--) if (tors[i].rope >= 2) tors.splice(i, 1);
  packTors();
  if (!asleep && !tors.length && performance.now() - lastInput > 60000) { asleep = true; env.paused = true; }
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
  // Funnels stay far off, under the base: 17 km out at the nearest, 36 km at the most.
  const dist = sy < -1e-4 ? clamp(1.25 * Math.hypot(foc, sx) / -sy, 17000, 36000) : 36000;
  const [x, z] = toWorld(dist * sx / Math.hypot(foc, sx), -dist * foc / Math.hypot(foc, sx));
  return { x, z };
}
function touchDown(x, z) {
  // The oldest ropes out to make room; at the cap it goes at once.
  const standing = tors.filter(t => !t.roping);
  if (standing.length >= MAX_TOR - 1) standing[0].roping = true;
  if (tors.length >= MAX_TOR) tors.shift();
  const still = reduced();
  tors.push({ x, z, f: fLevel, fT: fLevel, cond: still ? F_COND[fLevel] : 0, dust: still ? 1 : 0, rope: 0, roping: false, age: 0, life: F_LIFE[fLevel] * (0.85 + 0.3 * Math.random()), seed: Math.random() });
  packTors();
  wake();
}
// The tornado nearest a screen point, if the point is near enough.
function tornadoAt(clientX, clientY) {
  const g = groundAt(clientX, clientY);
  let best = null, bd = Infinity;
  for (const t of tors) {
    const d = Math.hypot(t.x - g.x, t.z - g.z);
    if (d < bd && d < Math.max(1200, F_WIDTH[t.fT] * 1.6, Math.hypot(t.x, t.z) * 0.09)) { bd = d; best = t; }
  }
  return best;
}
function ropeOut(t) { if (t && !t.roping) { t.roping = true; if (reduced()) t.rope = 2; wake(); } }
function setF(t, f) {
  if (!t || t.roping) return;
  t.fT = clamp(f, 0, 5);
  if (reduced()) t.f = t.fT;
  wake();
}
let hover = null;
let drag = null;
canvas.addEventListener('pointerdown', e => {
  if (e.button !== 0) return;
  const g = groundAt(e.clientX, e.clientY);
  // A press near a funnel's foot steers it; elsewhere it touches one down.
  const near = tornadoAt(e.clientX, e.clientY);
  if (near) { drag = near; canvas.setPointerCapture(e.pointerId); wake(); return; }
  touchDown(g.x, g.z);
});
canvas.addEventListener('pointermove', e => {
  hover = tornadoAt(e.clientX, e.clientY);
  if (!drag) return;
  const g = groundAt(e.clientX, e.clientY);
  drag.x = g.x; drag.z = g.z;
  packTors();
  wake();
});
const endDrag = () => { drag = null; };
canvas.addEventListener('pointerup', endDrag);
canvas.addEventListener('pointercancel', endDrag);
// A right click or a double click ropes a tornado out.
canvas.addEventListener('contextmenu', e => { const t = tornadoAt(e.clientX, e.clientY); if (t) { e.preventDefault(); ropeOut(t); } });
canvas.addEventListener('dblclick', e => ropeOut(tornadoAt(e.clientX, e.clientY)));
// The wheel over a tornado steps its F level.
canvas.addEventListener('wheel', e => {
  const t = tornadoAt(e.clientX, e.clientY);
  if (!t) return;
  e.preventDefault();
  setF(t, t.fT + (e.deltaY < 0 ? 1 : -1));
}, { passive: false });
// The tornado under the pointer, or else the newest one.
const target = () => (hover && tors.includes(hover) ? hover : [...tors].reverse().find(t => !t.roping));
stage.addEventListener('keydown', e => {
  if (e.key === '[' || e.key === ']') { const t = target(); if (t) setF(t, t.fT + (e.key === ']' ? 1 : -1)); return; }
  if (e.target !== stage || (e.key !== ' ' && e.key !== 'Enter')) return;
  e.preventDefault();
  act.add();
});

act.f = v => {
  fLevel = +v.slice(1);
  // The stepper sets the next touchdown, and the newest live tornado too.
  setF(target(), fLevel);
  wake();
};
act.add = () => {
  // A new funnel drops under the wall cloud, a little off from the last one.
  const n = tors.length;
  const [x, z] = toWorld(-6000 + (n % 2 ? 1 : -1) * 1300 * Math.ceil(n / 2) + (Math.random() - 0.5) * 400, -25000 + (Math.random() - 0.5) * 2500);
  touchDown(x, z);
};
// Clear ropes every tornado out; a second Clear takes them away at once.
act.clear = () => {
  if (tors.some(t => !t.roping)) tors.forEach(t => ropeOut(t));
  else tors.length = 0;
  packTors();
  wake();
};
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
// QA: ?near=8 puts the newest tornado 8 km out; ?age=20 runs every tornado 20 s on.
if (qs.has('near') && tors.length) { const [x, z] = toWorld(-1800, -1000 * +qs.get('near')); Object.assign(tors[tors.length - 1], { x, z }); }
const qaRun = sec => { for (let k = 0, n = sec * 20; k < n; k++) { simT += 0.05; tors.forEach(t => live(t, 0.05)); } packTors(); };
if (qs.has('age')) qaRun(+qs.get('age'));
// QA: ?rope=6 starts the rope-out, then runs 6 s on.
if (qs.has('rope')) { tors.forEach(t => { t.roping = true; }); qaRun(+qs.get('rope')); }
if (qs.has('qa')) window.__qa = { tors, live, ropeOut, setF, step };
lastInput = performance.now();
env.draw();
canvas.classList.add('on');
mark('first-frame');
// A hidden tab stops the loop and the clock.
whenVisible(stage, v => { visible = v; if (v) env.touch(); });
