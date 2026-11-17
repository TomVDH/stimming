// Tornado alley: the toy's module, loaded by index.html.
// The shot, the bar, the supercell, and the lab's tornado (funnel.js) in its own pass.
import { initPage, whenVisible, reduced, stage as mark, pageReady } from '../shared/stim.js';
import { intro as playIntro } from '../shared/intro.js';
import { environment } from '../shared/environment.js';
import { program, linked, target as glTarget, free, TRI_VS } from '../shared/gl.js';
import { SKY, skyAt } from '../shared/sky.js';
import { paneBlur, GLASS_STEP, PANE_HEAD } from './pane.js';
import { funnelFS, noiseVolume, spinLayers, at, densAt, labM, KNOB, KNOBS, MAX_FUNNELS } from './funnel.js';
import { WHEAT_GLSL } from './wheat.js';
import { ROAD_GLSL } from './road.js';
import { PLAIN_GLSL } from './plain.js';
import { TRAFFIC_GLSL, trafficState, trafficRun, trafficStep, trafficUniforms, trafficBusy } from './traffic.js';
import { LINE_GLSL, lineState, lineReset, lineStep, lineUniforms } from './line.js';
import { DAMAGE_GLSL, damageState, damageStep, damageReset, damageTex, debrisUniforms } from './damage.js';
import { FARM_GLSL, farmState, farmStep, farmUniforms } from './farm.js';
import { INFRA_GLSL, infraState, infraStep, infraReset, infraUniforms } from './infra.js';
mark('libs');

const stage = document.getElementById('stage');
const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);

playIntro({ ready: pageReady(9000) });
mark('build');

/* ---------- the F-scale ---------- */
// The look per F level is the lab's table in funnel.js.
// Travel speed in m/s.
const F_SPEED = [6, 8, 10, 12, 14, 16];
// Seconds a tornado lives before it ropes out by itself.
const F_LIFE = [55, 70, 85, 100, 115, 130];
const MAX_TOR = 4;
// Linear lookup in a per-level table at an eased level.
const fAt = (tab, f) => { const i = Math.min(4, Math.floor(f)), u = clamp(f - i); return tab[i] + (tab[i + 1] - tab[i]) * u; };

/* ---------- bar ---------- */
// The hour for each Time choice. The sun stands behind the camera.
const HOURS = { afternoon: 16, golden: 18.3, dusk: 19.4 };
/** @type {{ rise: () => void, riseDur: (v: number) => void, riseTop: (v: number) => void, vehicles: () => void, f: (v: string) => void, add: () => void, clear: () => void, storm: (v: number) => void, time: (v: string) => void, lens: (v: string) => void, expo: (v: number) => void, tone: (v: string) => void, preset: (v: string, keepGrain?: boolean) => void, look: (k: string, v: number | boolean) => void, sunAz: (v: number) => void, base: (v: number) => void, tod: (v: number) => void, wind: (v: number) => void, windDir: (v: number) => void, god: (v: number) => void, buildUp: (v: number) => void, bakeFrom: (v: number) => void, deckReach: (v: number) => void, front: (v: number) => void, knob: (id: string, v: number) => void, knobCopy: () => void, knobReset: () => void, eye: (v: number) => void, funnel: (v: string) => void }} */
const act = { rise() {}, riseDur() {}, riseTop() {}, vehicles() {}, f() {}, add() {}, clear() {}, storm() {}, time() {}, lens() {}, expo() {}, tone() {}, preset() {}, look() {}, sunAz() {}, base() {}, tod() {}, wind() {}, windDir() {}, god() {}, buildUp() {}, bakeFrom() {}, deckReach() {}, front() {}, knob() {}, knobCopy() {}, knobReset() {}, eye() {}, funnel() {} };
const ui = initPage({ id: 'tornado', bar: {
  choice: { label: 'F-scale', display: 'stepper', value: 'F2', options: [0, 1, 2, 3, 4, 5].map(n => ({ value: `F${n}`, label: `F${n}`, key: String(n) })), onPick: v => act.f(v) },
  actions: [
    { verb: 'add', noun: 'Tornado', key: 'T', onPress: () => act.add() },
    { verb: 'clear', key: 'C', onPress: () => act.clear() },
    // Rise: the eye cranes up while the lens widens; a second press eases it back.
    { verb: 'rise', label: 'Rise', key: 'R', onPress: () => act.rise() },
  ],
  slider: { label: 'Storm', min: 0, max: 1, step: 0.01, value: 0.85, onInput: v => act.storm(v) },
  settings: [
    { type: 'choice', id: 'time', label: 'Time', value: 'golden', persist: true, options: [
      { value: 'afternoon', label: 'Afternoon' },
      { value: 'golden', label: 'Golden hour' },
      { value: 'dusk', label: 'Dusk' },
    ], onPick: v => act.time(v) },
    // A new key: a 50 saved under the old one does not hold back the new wide default.
    { type: 'choice', id: 'lensWide', label: 'Lens', value: '28', persist: true, options: [
      { value: '28', label: '28 mm' },
      { value: '35', label: '35 mm' },
      { value: '50', label: '50 mm' },
      { value: '85', label: '85 mm' },
    ], onPick: v => act.lens(v) },
  ],
  dev: [
    { type: 'slider', id: 'expo', label: 'Exposure', min: 0.4, max: 2, step: 0.01, value: 1, persist: true, onInput: v => act.expo(v) },
    { type: 'choice', id: 'preset', label: 'Look', value: 'stimming', persist: true, options: [
      { value: 'stimming', label: 'Stimming' },
      { value: 'photoreal', label: 'Photoreal' },
    ], onPick: v => act.preset(v) },
    { type: 'choice', id: 'tone', label: 'Tone map', value: 'aces', persist: true, options: [
      { value: 'film', label: 'Film' },
      { value: 'aces', label: 'ACES' },
    ], onPick: v => act.tone(v) },
    { type: 'slider', id: 'wind', label: 'Wind', min: 0, max: 1, step: 0.01, value: 0.85, persist: true, onInput: v => act.wind(v) },
    { type: 'slider', id: 'windDir', label: 'Wind dir', min: -180, max: 180, step: 1, value: 19, persist: true, onInput: v => act.windDir(v) },
    { type: 'slider', id: 'tod', label: 'Time of day', min: 14, max: 21, step: 0.05, value: 18.3, persist: true, onInput: v => act.tod(v) },
    { type: 'slider', id: 'eye', label: 'Eye height', min: 1, max: 40, step: 0.5, value: 8, persist: true, onInput: v => act.eye(v) },
    // Rise: how long the crane takes each way, and how high it goes.
    { type: 'slider', id: 'riseDur', label: 'Rise time (s)', min: 6, max: 30, step: 1, value: 15, persist: true, onInput: v => act.riseDur(v) },
    { type: 'slider', id: 'riseTop', label: 'Rise height (m)', min: 10, max: 80, step: 1, value: 35, persist: true, onInput: v => act.riseTop(v) },
    { type: 'slider', id: 'base', label: 'Cloud base', min: 0.8, max: 3, step: 0.05, value: 1.35, persist: true, onInput: v => act.base(v) },
    { type: 'slider', id: 'sunAz', label: 'Sun dir', min: -180, max: 180, step: 1, value: 20, persist: true, onInput: v => act.sunAz(v) },
    // Where the live march stops and the baked far field begins, and how far the deck runs.
    { type: 'slider', id: 'bakeFrom', label: 'Bake from (km)', min: 6, max: 40, step: 1, value: 16, persist: true, onInput: v => act.bakeFrom(v) },
    // The opening build-up's length: the storm grows from nothing over this many seconds.
    // Its key is new, so an old saved length gives way to the 45 s default.
    { type: 'slider', id: 'buildUpU', label: 'Build-up (s)', min: 10, max: 600, step: 5, value: 45, persist: true, onInput: v => act.buildUp(v) },
    { type: 'slider', id: 'god', label: 'God rays', min: 0, max: 1, step: 0.01, value: 0.6, persist: true, onInput: v => act.god(v) },
    { type: 'slider', id: 'deckReach', label: 'Deck reach (km)', min: 20, max: 200, step: 5, value: 146, persist: true, onInput: v => act.deckReach(v) },
    // Where the deck's front edge stands, km ahead of the eye; below 0 it runs on behind the eye.
    // Ahead of the eye, the sun behind it lights a bright plain under a dark storm.
    { type: 'slider', id: 'front', label: 'Front edge (km)', min: -6, max: 15, step: 0.5, value: -6, persist: true, onInput: v => act.front(v) },
    // The window, rain in the air and grain. The defaults keep the shot as it was.
    { type: 'toggle', group: 'Window', id: 'glass', label: 'Glass', value: false, persist: true, onToggle: v => act.look('glass', v) },
    { type: 'slider', group: 'Window', id: 'wet', label: 'Drops', min: 0, max: 1, step: 0.01, value: 0.6, persist: true, onInput: v => act.look('wet', v) },
    { type: 'slider', group: 'Window', id: 'fog', label: 'Fog', min: 0, max: 1, step: 0.01, value: 0.15, persist: true, onInput: v => act.look('fog', v) },
    { type: 'slider', group: 'Window', id: 'bokeh', label: 'Bokeh', min: 0, max: 0.3, step: 0.005, value: 0, persist: true, onInput: v => act.look('bokeh', v) },
    { type: 'slider', group: 'Window', id: 'nearBlur', label: 'Drop blur', min: 0, max: 0.04, step: 0.001, value: 0.01, persist: true, onInput: v => act.look('nearBlur', v) },
    { type: 'slider', group: 'Window', id: 'rain', label: 'Rain', min: 0, max: 1, step: 0.01, value: 0, persist: true, onInput: v => act.look('rain', v) },
    { type: 'slider', group: 'Window', id: 'grain', label: 'Grain', min: 0, max: 0.2, step: 0.005, value: 0.035, persist: true, onInput: v => act.look('grain', v) },
    // The funnel's and the deck's knobs, live; ?dens=2 and the like set one for one load.
    // The Tube group opens with the funnel's mode: the deck's cloud as a tube (Tom's default) or the analytic shells.
    // The key is new, so an old saved Shells gives way to the new default.
    ...KNOBS.flatMap(([group, id, label, min, max, step, value]) => [
      ...(id === 'tbBands' ? [{ type: 'choice', group, id: 'funnelMode', label: 'Funnel', value: 'tube', persist: true, options: [
        { value: 'tube', label: 'Cloud tube' },
        { value: 'shells', label: 'Shells' },
      ], onPick: v => act.funnel(v) }] : []),
      { type: 'slider', group, id: 'k_' + id, label, min, max, step, value, persist: true, onInput: v => act.knob(id, v) },
    ]),
    // The road scene: a pickup flees the storm, then two chasers rush in. Key V.
    { type: 'button', group: 'Road', id: 'vehicles', label: 'Vehicles', text: 'Run', onClick: () => act.vehicles() },
    { type: 'button', group: 'Knobs', id: 'kCopy', label: 'Copy JSON', text: 'Copy', onClick: () => act.knobCopy() },
    { type: 'button', group: 'Knobs', id: 'kReset', label: 'Defaults', text: 'Reset', onClick: () => act.knobReset() },
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
// The scene pass and the funnel pass share this GLSL: the camera, the sky, the haze and the supercell.
// It reads uSun, uSunCol, uAmb, uYaw, uStorm and uT, and the sky palette (uZen, uMid, uBand, uAnti).
const SHARED = /* glsl */`
// The lab's noise volume: red is value noise, green is Worley cells. main.js binds it.
precision highp sampler3D;
uniform sampler3D tNoise;
// The tornadoes; both passes set them. uTorOn is 1 while the funnel pass draws.
// uTorZ: each whirl's texture seed (two numbers), its twist, and 0.01 plus its pit's depth in km (0 when off).
// uTorN: each top in camera km, its pit's radius, and the horn's top radius, in km.
// uTorH: each horn's strength, 0 to 1; its whirl's turn in radians, reach in km and strength.
uniform float uTorOn;
uniform vec4 uTorZ[${MAX_FUNNELS}], uTorN[${MAX_FUNNELS}], uTorH[${MAX_FUNNELS}];
// The eye's height in metres: Dev's Eye height (8 by default).
uniform float uCamH;
#define CAMH uCamH
// The storm's parts in km, in camera space: the updraft and the rain core. The base fills the sky above.
// Each tornado brings its own wall cloud.
const vec2 TOWER = vec2(-4.3, -23.0);
const vec2 CORE = vec2(6.5, -19.0);
// The base's height in km: Dev's Cloud base sets it (1.35 by default).
uniform float uBase;
#define BASE uBase
// How far ahead the deck runs, in km: Dev's Deck reach (146 by default).
uniform float uReach;
// The deck's front edge, km ahead of the eye: Dev's Front edge (-6, behind the eye, by default).
uniform float uFront;
// The wind's bearing as a world direction: the deck and its breaks drift with it.
uniform vec2 uWDir;
// The wind's strength, 0 to 1: Dev's Wind.
uniform float uWind;
#define WDIR uWDir
// The base shelf: its centre and its two half widths.
const vec2 SHELF = vec2(1.0, -13.0);
const vec2 SHELF_R = vec2(15.0, 9.0);
// The sun's direction in camera space, and the pixel size; set once per pixel.
vec3 gSunC;
// The view ray in camera space, and the sky's light for the cloud: lightInit() sets them.
// gSkyZ: the zenith. gSkySun, gSkyAnti: the low sky toward the sun and away from it.
vec3 gRdC = vec3(0.0, 0.0, -1.0), gSkyZ, gSkySun, gSkyAnti;
// The share of the plain the sun reaches under the deck, 0 to 1: the ground's bounce.
uniform float uPlainLit;
// The green phase, 0 to 1: as the storm grows, its light turns the green-teal of a hail core.
// It peaks near Storm 0.5 to 0.6 and sinks into the slate gloom by full storm.
uniform float uGreen;
// The deck's finest noise, 0 to 1: it fades with distance, and the light's probes skip it.
float gFine = 1.0;
float gPx;

float th(vec2 p) { p = fract(p * vec2(233.34, 851.73)); p += dot(p, p + 23.45); return fract(p.x * p.y); }
float vn(vec2 p) {
  vec2 i = floor(p), f = fract(p), u = f * f * (3.0 - 2.0 * f);
  return mix(mix(th(i), th(i + vec2(1, 0)), u.x), mix(th(i + vec2(0, 1)), th(i + vec2(1, 1)), u.x), u.y);
}
// The volume holds 64 cells per unit: a sixteenth makes one unit four cells wide.
float N(vec3 p) { return texture(tNoise, p * 0.0625).r; }
float W(vec3 p) { return texture(tNoise, p * 0.0625).g; }
// The storm's noise: one cell per km.
float vn3(vec3 p) { return N(p * 0.25); }
float fbm3(vec3 p) { return 0.5 * vn3(p) + 0.25 * vn3(p * 2.03 + 7.1) + 0.125 * vn3(p * 4.1 + 3.7); }
// The storm's growth for the deck's own terms: 1 from the default storm up, so that look holds.
float stormK() { return clamp(uStorm / 0.85, 0.0, 1.0); }
float smin(float a, float b, float k) { float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0); return mix(b, a, h) - k * h * (1.0 - h); }
// The front edge's distance over a camera-space x in km: ragged, never a straight line.
float frontAt(float x) { return uFront + (vn(vec2(x * 0.3, 1.7)) - 0.5) * 2.4 + (vn(vec2(x * 1.1, 4.2)) - 0.5) * 0.7; }

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
// In the green phase the air turns sickly yellow-green, most toward the low sun.
vec3 hazeCol(vec3 d) {
  vec3 h = skyCol(normalize(vec3(d.x, 0.03, d.z))) * 0.95;
  if (uGreen <= 0.0) return h;
  float toSun = pow(max(dot(normalize(d.xz + 1e-5), normalize(uSun.xz + 1e-5)), 0.0), 2.0);
  return mix(h, h * vec3(0.8, 1.0, 0.62), uGreen * (0.3 + 0.5 * toSun));
}
// The gloom under the base: a cool slate at full storm.
// In the green phase it turns the green-teal of a hail core.
vec3 gloomCol() { return uAmb * mix(vec3(0.06, 0.066, 0.078), vec3(0.045, 0.075, 0.066), uGreen); }

/* ---------- the supercell ---------- */
// The storm as one distance field, in km. uStorm grows a young cell into a full supercell.
float stormShapeSun(vec3 p) {
  float g = uStorm;
  // The tower and its top stay tall in a young storm: the sky keeps its height over a thin deck.
  float gT = max(g, 0.6);
  float top = mix(8.0, 12.5, gT);
  // The updraft tower leans downshear as it climbs.
  vec2 q = p.xz - TOWER - vec2(0.28, -0.12) * (p.y - BASE);
  // A young tower is a narrow column; it widens as the storm matures.
  float rT = mix(2.2, 7.0, g) * (1.0 - 0.25 * smoothstep(BASE, 6.0, p.y) + 0.2 * smoothstep(top - 3.0, top, p.y));
  float tower = max(length(q) - rT, max(BASE + 0.1 - p.y, p.y - top));
  // The tower is stacked turrets: Worley cells on a warped domain, larger and softer up high.
  // The sunward side is rougher. Only points near the tower pay for it.
  if (tower < 2.5) {
    float hk = smoothstep(BASE, top, p.y);
    vec3 pw = p + vec3(vn(p.yz * 0.7) - 0.5, 0.0, vn(p.xy * 0.7 + 3.0) - 0.5) * 0.8;
    float sc = mix(0.55, 0.22, hk);
    float sun = 0.75 + 0.5 * max(dot(normalize(vec2(q.x, q.y) + 1e-4), normalize(gSunC.xz + 1e-5)), 0.0);
    tower -= ((W(pw * sc + 2.0) - 0.4) * mix(0.9, 1.7, hk) + (W(pw * sc * 2.7 + 5.0) - 0.4) * 0.45) * sun;
  }
  // The base: a broad flat shelf, its underside level.
  // A young cell's shelf is small, so its tower stands clear; by the default storm it is as before.
  float sr = g < 0.85 ? mix(0.2, 0.91, g / 0.85) : mix(0.4, 1.0, g);
  vec2 b = (p.xz - SHELF) / (SHELF_R * sr);
  float shelf = max((length(b) - 1.0) * SHELF_R.y * sr, abs(p.y - (BASE + 0.6)) - 0.6);
  // A young storm's shelf billows: domed Worley tops, not a flat lid.
  float yk = 1.0 - stormK();
  if (yk > 0.0 && shelf < 1.5 && p.y > BASE + 0.4) shelf -= yk * ((W(p * 0.35 + 4.7) - 0.4) * 1.2 + (W(p * 1.1 + 2.2) - 0.4) * 0.4);
  // The anvil: flat on top, thin at its edge, and streaming off to the right.
  vec3 a = p - vec3(TOWER.x + mix(2.0, 14.0, g), top - 0.5, TOWER.y - 2.0);
  float anvil = max((length(a / vec3(mix(6.0, 28.0, g), 1.7, mix(4.0, 9.0, g))) - 1.0) * 1.6, p.y - top - 0.5);
  // A young cell has no anvil yet: it spreads out as the storm matures.
  anvil += 4.0 * (1.0 - smoothstep(0.25, 0.65, g));
  // The anvil's edge streams out in fibres along its spread.
  if (anvil < 1.5) anvil -= (vn(vec2(a.z * 1.6, a.y * 3.0) + a.x * 0.08) - 0.5) * 0.9;
  // The overshooting top domes above the anvil, over the updraft.
  vec3 o = p - vec3(TOWER.x + 0.28 * (top - BASE), top + 0.4, TOWER.y - 0.12 * (top - BASE));
  float dome = length(o * vec3(1.0, 1.6, 1.0)) / 1.6 - mix(1.7, 2.8, g);
  // The overshooting top boils in big soft cells.
  if (dome < 2.5) dome -= (W(o * 0.25 + 9.0) - 0.4) * 2.0 + (W(o * 0.7 + 3.0) - 0.4) * 0.7;
  float d = smin(tower, shelf, 1.4);
  d = smin(d, dome, 1.2);
  d = smin(d, anvil, 2.2);
  // Each tornado lowers its own wall cloud, the pit, centred on its top.
  // It forms with the whirl, follows the tornado, and leaves with it. With no tornado the base is plain.
  if (uTorOn > 0.5) for (int i = 0; i < ${MAX_FUNNELS}; i++) {
    float dep = uTorZ[i].w - 0.01;
    if (dep <= 0.0) continue;
    vec4 n = uTorN[i];
    float wall = max(length(p.xz - n.xy) - n.z * (1.0 - 0.25 * smoothstep(BASE, BASE - dep, p.y)), abs(p.y - (BASE + 0.075 - 0.5 * dep)) - (0.075 + 0.5 * dep));
    // The join softens as the pit deepens, so a young pit adds no bulge.
    d = smin(d, wall, 0.01 + 0.6 * smoothstep(0.0, 0.3, dep));
  }
  return d;
}
// The deck's breaks, in world km: broad ragged gaps that drift downwind with the deck.
float breakN(vec2 xz) {
  vec2 c = xz - WDIR * uT * 0.012;
  return 0.7 * vn(c * 0.4 + 11.0) + 0.3 * vn(c * 1.3 + 3.0);
}
// Holes in the deck from one world grid, in world km: each cell holds one by chance.
// A hole is a soft ragged ellipse of radius r0 to r1 km. soft widens its edge.
float holes(vec2 w, float cell, float prob, float r0, float r1, float soft, float seed) {
  vec2 b = floor(w / cell - 0.5);
  float open = 0.0;
  for (int k = 0; k < 4; k++) {
    vec2 c = b + vec2(float(k & 1), float(k >> 1)) + seed;
    if (th(c + 31.7) > prob) continue;
    vec2 ctr = (c - seed + 0.2 + 0.6 * vec2(th(c + 1.3), th(c + 7.1))) * cell;
    float r = length(w - ctr) / mix(r0, r1, th(c + 4.4)) + (vn(w * 0.8 + c * 3.1) - 0.5) * 0.35;
    open = max(open, smoothstep(1.0, 0.6 - soft, r));
  }
  return open;
}
// The beam's hole: one large opening on the sun's side, in world km: its centre and radius.
// main.js places it, so its shaft falls in frame. Only this hole lights god rays.
uniform vec3 uBeam;
// How open the beam's hole is over a world point in km, 0 to 1: a soft, ragged disc.
float beamHole(vec2 w, float soft) {
  if (uBeam.z <= 0.0) return 0.0;
  float r = length(w - uBeam.xy) / uBeam.z + (vn(w * 0.7 + 5.0) - 0.5) * 0.3 + (vn(w * 2.1) - 0.5) * 0.1;
  return smoothstep(1.0, 0.55 - soft, r);
}
// How open the deck is over a camera-space point, 0 shut to 1 open. They drift downwind with the deck.
// Far off, a few big holes, 3 to 8 km wide, 15 to 40 km out. Everywhere, overhead too, sparse small breaks.
// A young storm has more and wider ones of both.
float deckOpen(vec3 p, float soft) {
  float sy = sin(uYaw), cy = cos(uYaw), k = stormK();
  vec2 w = vec2(p.x * cy + p.z * sy, -p.x * sy + p.z * cy) - WDIR * uT * 0.012;
  float dist = length(p.xz);
  float band = smoothstep(12.0, 18.0, dist) * (1.0 - smoothstep(40.0, 48.0, dist));
  float open = band > 0.0 ? band * holes(w, 10.0, mix(0.5, 0.28, k), 1.5 * mix(1.3, 1.0, k), 4.0 * mix(1.3, 1.0, k), soft, 0.0) : 0.0;
  open = max(open, beamHole(w + WDIR * uT * 0.012, soft));
  return max(open, holes(w, 6.0, mix(0.4, 0.2, k), 0.6, 1.6, soft, 17.0));
}
// The young deck's gaps between its rafts over a camera-space point, 0 to 1.
// At no storm the sky is mostly clear: a few rafts and the far cells. The gaps close by the default storm.
float raftGap(vec3 p) {
  if (stormK() >= 1.0) return 0.0;
  float n = vn(p.xz * 0.11 + 3.7) * 0.7 + vn(p.xz * 0.37 + 9.1) * 0.3;
  return smoothstep(0.15 + 0.8 * stormK(), 0.35 + 0.8 * stormK(), n);
}
// The deck's openness at the last point stormShape() read, and a held value for the probes.
float gOpen = 0.0, gOpenHold = -1.0;
// Where gOpen was last read, in camera km.
vec2 gOpenP = vec2(1e9);
// The storm as the eye sees it: the base runs out over and behind the eye, and far left, right and ahead.
// It reads as a vast system, not one cell; its underside rises a little toward the eye.
// No edge of the deck shows in frame at any lens; far off it meets the horizon's glow.
// The sun still reaches the plain under it: shade reads stormShapeSun(), without this part.
float stormShape(vec3 p) {
  float d = stormShapeSun(p);
  float under = BASE + 0.12 + 0.25 * smoothstep(-6.0, 4.0, p.z);
  // The slab runs from 6 km behind the eye to uReach ahead.
  // The slab runs from its front edge to uReach ahead.
  float zN = frontAt(p.x);
  vec2 q = vec2(abs(p.x) - 150.0, abs(p.z + 0.5 * (uReach + zN)) - 0.5 * (uReach - zN));
  // A young storm's deck is thin; a full one is a kilometre deep.
  float topY = BASE + mix(0.35, 1.0, stormK()), botY = under;
  // A young deck breaks into rafts with sky between; the gaps close as the storm grows.
  // Each raft billows: its own height, domed lumpy tops in two sizes, a ragged base that heaves.
  float yk = 1.0 - stormK();
  if (yk > 0.0 && p.y > BASE - 0.6 && p.y < BASE + 3.0) {
    vec3 pd = p + vec3(uT * 0.004, 0.0, uT * 0.002);
    float hN = vn(pd.xz * 0.15 + 5.3);
    float lumps = (W(pd * 0.35 + 1.3) - 0.4) * 0.9 + (W(pd * 1.1 + 7.1) - 0.4) * 0.35;
    topY += yk * (hN * 1.1 + lumps);
    botY -= yk * (vn(pd.xz * 0.6 + 2.0) - 0.5) * 0.3;
  }
  float front = max(length(max(q, 0.0)) + min(max(q.x, q.y), 0.0), max(botY - p.y, p.y - topY));
  front += 1.6 * raftGap(p);
  // The deck's breaks. A point a kilometre off the slab skips them: they only push it further.
  // The light's probes reuse the last sample's value: the breaks are kilometres wide.
  if (front < 1.0) {
    // Along one ray the value holds for 0.3 km: the breaks' edges are wider.
    if (gOpenHold < 0.0 && distance(p.xz, gOpenP) > 0.3) { gOpen = deckOpen(p, 0.0); gOpenP = p.xz; }
    front += 1.5 * (gOpenHold < 0.0 ? gOpen : gOpenHold);
  }
  return smin(d, front, 0.8);
}
// The cloud base over a point, in km: lower in each tornado's pit. main.js deckAt() holds the same curve.
float baseAt(vec2 c) {
  float b = BASE;
  if (uTorOn > 0.5) for (int i = 0; i < ${MAX_FUNNELS}; i++) {
    float dep = uTorZ[i].w - 0.01;
    if (dep <= 0.0) continue;
    vec4 n = uTorN[i];
    b = min(b, BASE - dep * (1.0 - smoothstep(n.z * 0.57, n.z * 1.33, length(c - n.xy))));
  }
  return b;
}
// Near a tornado's horn the deck's ragged noise eases, most by the funnel.
float stormCalm(vec3 p) {
  if (uTorOn < 0.5) return 1.0;
  float lb = baseAt(p.xz);
  float hk = mix(0.85, 0.35, smoothstep(lb - 0.5, lb - 0.05, p.y)) * (1.0 - smoothstep(lb - 0.05, lb + 0.3, p.y));
  if (hk <= 0.0) return 1.0;
  float c = 1.0;
  for (int i = 0; i < ${MAX_FUNNELS}; i++) {
    if (uTorZ[i].w <= 0.0) continue;
    vec4 n = uTorN[i];
    c *= 1.0 - uTorH[i].x * (1.0 - smoothstep(n.w * 1.3, n.w * 2.4, length(p.xz - n.xy))) * hk;
  }
  return c;
}
// How much of a horn hangs here, 0 to 1. A low sun reaches its sides under the base.
// At the base the bell is lit as the deck round it; down the bell it takes the sun by degrees.
float hornUnder(vec3 p) {
  if (uTorOn < 0.5) return 0.0;
  float lb = baseAt(p.xz), u = 0.0;
  // At the base the bell takes half the sun, as the deck's lumps round it do; down the bell, all of it.
  float hk = mix(0.5, 1.0, smoothstep(lb, lb * 0.8, p.y)) * (1.0 - smoothstep(lb, lb + 0.3, p.y));
  if (hk <= 0.0) return 0.0;
  for (int i = 0; i < ${MAX_FUNNELS}; i++) {
    if (uTorZ[i].w <= 0.0) continue;
    vec4 n = uTorN[i];
    u = max(u, uTorH[i].x * (1.0 - smoothstep(n.w * 0.9, n.w * 1.5, length(p.xz - n.xy))) * hk);
  }
  return u;
}
// The deck's whirls: each tornado turns the deck above it, and the wall cloud has a gentle one.
// A whirl's texture lies on angle and log distance, so a turn and an inflow are one plain slide.
// It never winds up, and it moves with its centre.
// The inflow's speed: Dev's Inflow.
uniform float uSpIn;
// One whirl's noise point at p, round centre c with reach R, in km. w returns its weight there.
// turn is its angle, summed on the CPU, so a change of speed never jumps.
// twist sets how tightly its arms wind; seed keeps two whirls apart.
vec3 whirlPt(vec3 p, vec2 c, float R, float turn, float twist, vec2 seed, out float w) {
  vec2 q = p.xz - c;
  float r = max(length(q), 0.08);
  w = (1.0 - smoothstep(R * 0.55, R, r)) * (1.0 - smoothstep(BASE + 1.0, BASE + 2.6, p.y));
  float lr = log(r) + uSpIn * uT;
  float ang = atan(q.y, q.x) + turn - twist * lr;
  return vec3(cos(ang) * 2.2 + lr * 2.8 + seed.x, p.y, sin(ang) * 2.2 + seed.y);
}
// One layer of the deck's texture. p sets the masks; pn is the noise point.
// QA: the deck's noise reads on this pixel, counted for ?qa.
int gWork = 0;
float deckN(vec3 p, vec3 pn, float calm) {
  gWork++;
  // Lumpy towers, a smoother anvil.
  float amp = mix(1.1, 0.45, smoothstep(9.0, 12.0, p.y)) * mix(0.55, 1.0, smoothstep(BASE + 0.5, BASE + 2.5, p.y));
  vec3 n = pn * 0.75 + vec3(0.0, -uT * 0.006, 0.0);
  // A faded term gives way to its mean, so the cloud keeps its size.
  float d = (fbm3(n) + 0.0625 * (gFine > 0.0 ? gFine * (vn3(n * 8.3) - 0.5) + 0.5 : 0.5) - 0.5) * amp * calm;
  // The base heaves: broad swells drift under it and breathe.
  float swell = (vn3(pn * 0.45 + vec3(uT * 0.03, 0.0, uT * 0.02)) - 0.5) * (0.6 + 0.4 * sin(uT * 0.6 + vn3(pn * 0.2) * 6.28));
  swell += (vn3(pn * 1.2 - vec3(uT * 0.05, 0.0, 0.0)) - 0.5) * 0.35;
  d += swell * 0.5 * (1.0 - smoothstep(BASE + 0.3, BASE + 1.5, p.y));
  // Plates on the flank, turning round the updraft. They stay off the underside and away from the wall cloud.
  float flank = smoothstep(BASE + 0.4, BASE + 0.8, p.y) * (1.0 - smoothstep(BASE + 1.6, BASE + 2.4, p.y));
  // Up close the plates read as contour bands: they stay away from each tornado's pit.
  if (uTorOn > 0.5) for (int i = 0; i < ${MAX_FUNNELS}; i++) if (uTorZ[i].w > 0.0) flank *= smoothstep(2.8, 6.2, length(p.xz - uTorN[i].xy));
  if (flank > 0.0) d += 0.09 * flank * sin(p.y * 15.0 + atan(p.z - TOWER.y, p.x - TOWER.x) * 2.0 + 1.3 * vn3(pn * 1.4));
  // Cauliflower lumps round the tower's top and the overshooting dome.
  if (p.y > 6.0) d -= smoothstep(6.0, 9.0, p.y) * (W(pn * 0.55 + 3.1) - 0.4) * 0.7;
  // Fine lumps, for the near base.
  if (gFine > 0.0) d += (vn3(pn * 4.3) - 0.5) * 0.14 * gFine * (1.0 - smoothstep(BASE + 2.0, BASE + 4.0, p.y)) * calm;
  // Ragged scud hangs under the base.
  float low = (1.0 - smoothstep(BASE - 0.2, BASE + 0.4, p.y)) * calm;
  d += low * (vn3(pn * 3.1 + vec3(uT * 0.01, 0.0, 0.0)) - 0.45) * 0.55;
  // Rounded lumps hang from the underside, in two sizes.
  float under = (1.0 - smoothstep(BASE - 0.1, BASE + 0.7, p.y)) * mix(1.0, calm, 0.6);
  float wf = gFine > 0.0 ? mix(0.07, W(pn * 8.0) - 0.35, gFine) : 0.07;
  return d - under * ((W(pn * 2.6 + 1.7) - 0.35) * 0.32 + wf * 0.16);
}
// The deck's texture on a shape distance d. In a tornado's column the horn is in d already.
// Where whirls meet, the two strongest each read their own noise and the values blend.
// Blending their noise points instead squeezed the texture into hanging streaks.
float stormNoise(vec3 p, float d) {
  // With no tornado the deck has no whirl.
  float calm = stormCalm(p), w, w1 = 0.0, w2 = 0.0;
  vec3 p1 = p, p2 = p;
  if (uTorOn > 0.5) for (int i = 0; i < ${MAX_FUNNELS}; i++) {
    vec4 h = uTorH[i], z = uTorZ[i];
    if (z.w <= 0.0 || h.w <= 0.0) continue;
    vec3 q = whirlPt(p, uTorN[i].xy, h.z, h.y, z.z, z.xy, w);
    w *= h.w;
    if (w > w1) { w2 = w1; p2 = p1; w1 = w; p1 = q; }
    else if (w > w2) { w2 = w; p2 = q; }
  }
  float W = w1 + w2, wS = clamp(W, 0.0, 1.0);
  // The still deck and each whirl read only where they show.
  float n0 = wS < 1.0 ? deckN(p, p, calm) : 0.0;
  float n1 = w1 > 1e-4 ? deckN(p, p1, calm) : 0.0;
  float n2 = w2 > 0.02 ? deckN(p, p2, calm) : n1;
  float nw = W > 1e-4 ? (n1 * w1 + n2 * w2) / W : 0.0;
  return d + mix(n0, nw, wS);
}
float stormD(vec3 p) {
  float d = stormShape(p);
  return d > 2.5 ? d : stormNoise(p, d);
}
// Two Henyey-Greenstein lobes, after Window seat's and Railgun's clouds: a strong forward one, a soft back one.
// Isotropic is 1. Toward the sun it reaches about 14: the silver lining.
float cloudPh(float mu) {
  float a = 1.5184 - 1.44 * mu, b = 1.04 + 0.4 * mu;
  return mix(0.4816 / (a * sqrt(a)), 0.96 / (b * sqrt(b)), 0.35);
}
// Where rain falls from the deck, 0 to 1, over a camera-space point in km.
// Ragged shafts in world space drift and slant downwind; most fall round the core.
// Rain starts as the storm grows.
// The rain field's blur, 0 to 1: a coarse march sets it, so curtains do not speckle.
float gRainLod = 0.0;
// How far rain slants downwind per km it falls: more with the wind and the storm.
float rainSlant() { return (0.25 + 0.6 * uWind) * (0.6 + 0.4 * stormK()); }
float rainAt(vec3 p) {
  float sy = sin(uYaw), cy = cos(uYaw), fall = max(BASE - p.y, 0.0);
  // The shafts slant downwind as they fall, and gusts sway them slowly.
  vec2 w = vec2(p.x * cy + p.z * sy, -p.x * sy + p.z * cy) - WDIR * uT * 0.012;
  w -= WDIR * fall * (rainSlant() + 0.08 * sin(uT * 0.21 + w.x * 0.4 + w.y * 0.3));
  // Curtains one to three km wide, with clear air between them.
  float f = vn(w * 0.3 + 31.0) * 0.65 + 0.15 * (1.0 - smoothstep(3.0, 9.0, length(p.xz - mix(TOWER, CORE, 0.55))));
  // Each tornado has a curtain on its rear flank, upwind and to the left of it.
  // Round the funnel itself the air stays clear, so the rain never hides it.
  if (uTorOn > 0.5) {
    vec2 wc = vec2(WDIR.x * cy - WDIR.y * sy, WDIR.x * sy + WDIR.y * cy), q = p.xz - wc * fall * rainSlant();
    for (int i = 0; i < ${MAX_FUNNELS}; i++) {
      if (uTorZ[i].w <= 0.0) continue;
      vec2 rear = uTorN[i].xy - wc * 2.4 + vec2(-wc.y, wc.x) * 0.8;
      f += 0.6 * uTorH[i].x * (1.0 - smoothstep(0.6, 1.7, length(q - rear)));
      f -= 0.6 * uTorH[i].x * (1.0 - smoothstep(1.0, 2.2, length(p.xz - uTorN[i].xy)));
    }
  }
  float lo = 0.6 - 0.15 * gRainLod;
  // Even the fine octave at its top cannot reach the threshold: no rain here.
  if (f + 0.35 < lo) return 0.0;
  // A blurred field keeps the fine octave at its mean.
  f += mix(vn(w * 0.9 + 7.0), 0.5, gRainLod) * 0.35;
  return smoothstep(lo, 0.85 + 0.1 * gRainLod, f) * smoothstep(0.3, 0.6, uStorm);
}
// The colour of one storm sample. Its light follows Window seat's and Railgun's cloud light:
// Beer's law with a slower multiple-scatter tail, powder, a silver lining, sky light by direction, ground bounce.
vec3 stormLit(vec3 p, float d) {
  // A step toward the sun: thinner cloud there means this side is lit.
  // The probes read the light's broad shape: they skip the finest noise.
  float fine = gFine;
  gFine = 0.0;
  gOpenHold = gOpen;
  float ds = stormD(p + gSunC * 0.9);
  float lit = clamp((ds - d) / 0.9 * 0.8 + 0.3, 0.0, 1.0);
  // A step up: deeper cloud above means an underside, out of the sun.
  // A horn hangs below the base: its sides take the low sun as the funnel does, not the underside's shade.
  float under = clamp((d - stormD(p + vec3(0.0, 0.4, 0.0))) / 0.4, 0.0, 1.0) * (1.0 - hornUnder(p));
  gFine = fine;
  gOpenHold = -1.0;
  // A young deck is thin: its underside takes more light.
  under *= mix(0.45, 1.0, stormK());
  lit *= 1.0 - 0.9 * under;
  // Thick cloud overhead darkens the base and the core.
  float up = smoothstep(0.6, 9.0, p.y);
  // The core: between the updraft and the rain, low down.
  vec2 cc = mix(TOWER, CORE, 0.55);
  float core = (1.0 - smoothstep(3.0, 9.0, length(p.xz - cc))) * (1.0 - smoothstep(3.0, 8.0, p.y));
  float mu = dot(gRdC, gSunC);
  // Sky light by direction: tops see the zenith, sides the low sky.
  // A sunlit side sees the warm sky round the sun; a shaded side the cool sky away from it.
  vec3 skyS = mix(gSkyAnti, gSkySun, lit);
  vec3 skyD = mix(skyS, gSkyZ, (1.0 - under) * (0.35 + 0.5 * up));
  // The dome keeps the old fill's strength; only its hue and its direction come from the sky.
  float yA = dot(uAmb, vec3(0.2126, 0.7152, 0.0722)), yS = max(dot(skyD, vec3(0.2126, 0.7152, 0.0722)), 1e-4);
  vec3 amb = mix(uAmb, skyD * (yA / yS), 0.6) * mix(mix(0.3, 0.08, stormK()), 0.85, up) * (1.0 - 0.7 * under);
  // The sunlit plain lights the underside warm from below.
  amb += uSunCol * vec3(0.3, 0.21, 0.09) * 0.16 * uPlainLit * under * (1.0 - up);
  // The storm's palette, never a wash: shade under the deck takes a bruised violet, shaded flanks a slate.
  float shadeK = (1.0 - lit) * stormK();
  amb *= mix(vec3(1.0), vec3(1.07, 0.93, 1.12), 0.6 * under * shadeK);
  amb *= mix(vec3(1.0), vec3(0.93, 0.98, 1.07), 0.6 * (1.0 - under) * shadeK);
  // Beer's law for the direct beam; light scattered many times leaves a slower tail.
  float Tl = lit * lit, Tm = 0.22 * lit;
  // Powder: thin edges that face away from the light stay dark. Thick cloud does not.
  float dn = clamp(0.4 - d / 0.25, 0.0, 1.0);
  float powder = mix(1.0, 1.0 - exp(-4.0 * dn), 0.3 * (1.0 - max(mu, 0.0)));
  // The silver lining: the forward lobe on a lit edge, toward the sun only.
  // Storm haze veils it, but never all of it.
  float silver = mu > 0.0 ? max(cloudPh(mu) - 0.4, 0.0) * 0.35 * Tl * (1.0 - 0.6 * stormK()) : 0.0;
  // The lower flank stays dark: the storm's own bulk shades it.
  vec3 c = uSunCol * ((Tl * 0.85 + Tm) * powder + silver) * mix(0.14, 0.8, up * up) + amb;
  // The core goes dark slate behind its rain.
  c = mix(c, c * vec3(0.3, 0.33, 0.37), core * 0.8);
  // Light that passes the rain under the base turns green-teal, most where rain falls.
  // It is strongest in the green phase; a trace stays in the rain at full storm.
  float low = 1.0 - smoothstep(BASE - 0.2, BASE + 0.8, p.y), wet = 0.0;
  if (low > 0.0) {
    wet = rainAt(p);
    c = mix(c, c * vec3(0.62, 1.0, 0.85), uGreen * low * (0.35 + 0.65 * wet));
    wet *= low * (0.3 + 1.7 * uGreen);
  }
  return c + (uAmb * vec3(0.004, 0.017, 0.015) + uSunCol * vec3(0.002, 0.008, 0.006) * lit) * wet;
}
// Marches the storm at full size, while the storm pass builds. Returns colour and coverage.
// tHit is the hit distance in km. jit, 0 to 1 per pixel, offsets the steps: no contour bands.
vec4 storm(vec3 rd, float jit, out float tHit) {
  vec3 ro = vec3(0.0, CAMH * 0.001, 0.0);
  float t = 1.0, T = 1.0;
  bool outside = true;
  vec3 acc = vec3(0.0);
  tHit = 120.0;
  for (int i = 0; i < 110; i++) {
    vec3 p = ro + rd * t;
    if (p.y > 16.0 || p.y < -0.01 || t > 110.0 || T < 0.03) break;
    gFine = 1.0 - smoothstep(25.0, 45.0, t);
    float d = stormD(p);
    // The soft edge grows with distance, a little wider than the inner step.
    // A sample then covers part of a step, not all of it: no terraces and less grain.
    float soft = 1.2 * (0.03 + 0.006 * t);
    // The first step into the cloud is a random part of a step.
    if (d < soft && outside) { outside = false; t += (0.03 + 0.006 * t) * jit; continue; }
    if (d < soft) {
      if (tHit > 119.0) tHit = t;
      float a = clamp(0.5 - d / soft, 0.0, 1.0) * 0.8;
      acc += T * a * stormLit(p, d);
      T *= 1.0 - a;
      t += 0.03 + 0.006 * t;
    // A step scale per pixel keeps grazing rays off one shared lattice: no stripes.
    } else t += (d * 0.75 + 0.01 * t) * (0.85 + 0.3 * jit);
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
// Sets the sun and the view ray in camera space, and the sky's light for the cloud. rc is the camera ray.
void lightInit(vec3 rc) {
  gSunC = toCam(uSun);
  gRdC = rc;
  gSkyZ = skyCol(vec3(0.0, 1.0, 0.0));
  vec2 sh = normalize(uSun.xz + 1e-5);
  gSkySun = skyCol(normalize(vec3(sh.x, 0.05, sh.y)));
  gSkyAnti = skyCol(normalize(vec3(-sh.x, 0.05, -sh.y)));
}

/* ---------- the deck's shadow ---------- */
// The deck's cover along the sun's ray from a world point w, in km: 0 is open sun, 1 full shade.
// It reads the ray where it crosses the base, so a point in the air gets the same answer: god rays use it too.
float sunCover(vec3 w) {
  if (uSun.y <= 0.0) return 0.0;
  float L = max(BASE - w.y, 0.0) / max(uSun.y, 0.017);
  vec3 qc = toCam(w + uSun * L);
  // The supercell's bulk blocks the sun outright, until the sun slips under its far edge.
  float core = smoothstep(0.5, -0.5, stormShapeSun(qc)) * (1.0 - smoothstep(12.0, 20.0, L));
  // The deck follows the storm: none at the start, a full lid at full storm.
  // The sun reaches the plain only through its openings: the breaks and a young deck's gaps.
  float deck = smoothstep(0.05, 0.85, uStorm) * (1.0 - max(deckOpen(qc, 0.05), raftGap(qc)));
  // Past the front edge, nearer the eye, there is no deck to shade the plain.
  deck *= smoothstep(-frontAt(qc.x) + 1.2, -frontAt(qc.x) - 1.2, qc.z);
  return max(core, 0.92 * deck);
}
`;
const SCENE = /* glsl */`
uniform vec3 uSun, uSunCol, uAmb;
uniform float uFoc, uHz, uYaw, uStorm, uT;
uniform float uRain;
uniform vec2 uRainDir;
uniform vec3 uWB;
uniform float uSat, uCon;
// The storm pass's picture: colour, premultiplied, and cover. uStormOn is 1 once it draws.
uniform sampler2D tTor;
uniform float uStormOn;
// Lightning, far off: the channel's top under the base and its foot on the ground, in camera km.
// uBolt: the stroke's light (0 when dark), its seed, 1 for cloud to ground or 0 in cloud, and its glow.
uniform vec3 uBoltT, uBoltG;
uniform vec4 uBolt;
${SHARED}

/* ---------- the wind ---------- */
// The wind blows left to right and a little toward the eye.
// Dev's Wind sets its bearing and strength (uWind); WDIR comes with the storm GLSL.
// The field's wind, 0 to 1: Wind times the storm's growth, more near a working tornado.
uniform float uGust;
// Each tornado's foot in world metres, its pull on the field, 0 to 1, and its reach in metres.
uniform vec4 uTorF[${MAX_TOR}];
// The wind over the wheat at a point, for a pixel footprint of fx metres.
// xy: the lean of a stalk's tip per metre of height squared. z: the sheen, -1 dark to 1 pale.
// w: the gust, 0 calm to 1 full.
vec4 gust(vec2 xz, float fx) {
  float K = uGust;
  // Wind frame: x runs downwind, y across. The pattern rides downwind at the gusts' speed.
  vec2 w = vec2(dot(xz, WDIR), dot(xz, vec2(-WDIR.y, WDIR.x)));
  w.x -= (1.5 + 8.5 * K) * uT;
  // Gust patches: short along the wind, long across it; they grow and die as they go.
  float n = N(vec3(w.x * 0.007, w.y * 0.0025, uT * 0.04)) * 0.6 + N(vec3(w.x * 0.022, w.y * 0.008, uT * 0.09 + 5.0)) * 0.4;
  float g = smoothstep(0.55 - 0.08 * K, 0.7 - 0.06 * K, n) * (0.2 + 0.8 * K);
  // Waves inside a gust: short crests across the wind, 4 to 7 m apart, bent by a warp.
  vec3 wq = vec3(w.y * 0.05, w.x * 0.02, uT * 0.1);
  float ph = w.x * 1.15 + 9.0 * N(wq + 9.0);
  float wv = sin(ph) * smoothstep(0.3, 0.6, N(wq * 2.0 + 3.0)) * (1.0 - smoothstep(0.4, 1.2, fx));
  // The mean lean, the gust's push, and the wave on top.
  float lean = (0.02 + 0.06 * K) * (0.3 + 0.7 * uWind) + g * (0.16 + 0.1 * wv);
  // A stalk shows its pale side as it bends; it swings back a little dark behind the crest.
  float sh = g * (0.75 + 0.45 * wv) - 0.25 * g * smoothstep(0.3, 1.0, -wv);
  // A tiny flutter: each stalk on its own beat, never in step with its neighbours.
  float fl = 0.012 * sin(uT * (2.6 + 2.0 * K) + xz.x * 1.7 + xz.y * 2.3) * (0.2 + K);
  vec2 v = WDIR * (lean + fl);
  // Near a tornado the inflow swirls in and lays the wheat flat toward the funnel.
  for (int i = 0; i < ${MAX_TOR}; i++) {
    vec4 t = uTorF[i];
    if (t.w <= 0.0) continue;
    vec2 d = t.xy - xz;
    float r = length(d);
    float k = t.z * (1.0 - smoothstep(0.15 * t.w, t.w, r));
    if (k <= 0.0) continue;
    // The inflow turns in cyclonically: about 40 degrees off the straight line.
    vec2 dir = mat2(0.77, 0.64, -0.64, 0.77) * (d / max(r, 1.0));
    v = mix(v, dir * 0.9, k);
    sh = mix(sh, 0.9, k * 0.8);
    g = max(g, k);
  }
  return vec4(v, sh, g);
}
// How far a stalk's tip leans at height h, in metres.
vec2 bend(vec4 gw, float h) { return gw.xy * h * h; }
// The short form: the gust alone, 0 calm to 1 full.
float gust(vec2 xz) { return gust(xz, 0.0).w; }

// The share of a lit colour left in shade: the sun's part goes, the sky's fill stays.
vec3 shadeK(float cover) {
  vec3 l = uSunCol * 0.5 + uAmb * 0.55;
  return (uSunCol * 0.5 * (1.0 - cover) + uAmb * 0.55) / max(l, vec3(1e-4));
}

/* ---------- the plain ---------- */
// The eye hangs over the road's left edge; the road centre runs 3.4 m to its right.
const float ROAD_X = 3.4, WHEAT_GAP = 6.2;
// Coverage of a band of half width w round 0, at pixel footprint f.
float band(float x, float w, float f) { return clamp((w - abs(x)) / f + 0.5, 0.0, 1.0) * min(1.0, 2.0 * w / f); }
// A detail of size s fades out as the pixel's footprint f grows past it.
float detail(float s, float f) { return 1.0 - smoothstep(0.25 * s, 0.7 * s, f); }
/* ---------- the fields ---------- */
// The damage field's peak wind and its direction: damage.js defines it further on.
vec3 dmgAt(vec2 xz);
// A tornado's track on the wheat at a point, from the peak wind in m/s.
// x: lodged flat, from 30 m/s. y: scoured to stubble in the F3 core, from 80 m/s. z: bare soil, from 100 m/s.
// The wind's reach wavers in 40 m patches, so the track's edges are ragged.
vec3 hurtAt(vec2 xz) {
  float v = dmgAt(xz).x;
  if (v <= 0.0) return vec3(0.0);
  v += 16.0 * (vn(xz * 0.025 + 3.0) - 0.5);
  return vec3(smoothstep(30.0, 50.0, v), smoothstep(80.0, 95.0, v), smoothstep(100.0, 115.0, v));
}
// Quarter-mile squares (402 m) run out from both verges; a few are cut into strips.
// Crops: 0 ripe wheat, 1 stubble, 2 fallow, 3 green; -1 is the verge and the road.
const float QM = 402.3;
// Each crop's height in metres; a field's margin is short grass.
const vec4 CROP_H = vec4(0.95, 0.15, 0.0, 0.45);
const float MARGIN = 2.5;
// The crop at a point. edge: metres to the field's own boundary. id: a hash per field.
float cropAt(vec2 xz, out float edge, out float id) {
  float side = sign(xz.x - ROAD_X), u = abs(xz.x - ROAD_X) - WHEAT_GAP;
  edge = 0.0; id = 0.0;
  if (u < 0.0) return -1.0;
  // The fields beside the eye end 180 m ahead.
  vec2 q = vec2(u, 222.0 - xz.y) / QM, c = floor(q), f = fract(q) * QM;
  id = th(c + vec2(41.0 + 7.0 * side, 13.0));
  // No margin on the verge side: the verge is the margin there.
  edge = min(min(c.x > 0.5 ? f.x : 1e4, QM - f.x), min(f.y, QM - f.y));
  float crop = id < 0.45 ? 0.0 : (id < 0.7 ? 1.0 : (id < 0.87 ? 2.0 : 3.0));
  // Beside the eye, on both sides of the road: ripe wheat.
  if (c.x < 0.5 && c.y < 0.5) return 0.0;
  // Strip fields: wheat and fallow side by side, 60 to 110 m wide.
  if (th(c + vec2(9.3 * side, 2.0)) < 0.22) {
    float sw = 60.0 + 50.0 * th(c + 2.2), s = mod(f.x, sw);
    crop = mod(floor(f.x / sw), 2.0) < 0.5 ? 0.0 : 2.0;
    edge = min(edge, min(s, sw - s) + MARGIN * 0.6);
  }
  return crop;
}
float cropH(float crop, float edge) { return crop < 0.0 ? -1.0 : (edge < MARGIN ? 0.12 : CROP_H[int(crop)]); }
bool isWheat(vec2 xz) { float e, id; return cropAt(xz, e, id) == 0.0 && e >= MARGIN; }
// The ray of the pixel ground() shades: the field's tops read it for their light.
vec3 gRd;
// The wheat's top seen from afar: ripe patches, and the gusts as a paler sheen.
// fx and fz: the pixel's footprint across and along the view, in metres.
vec3 wheatFar(vec2 xz, float fx, float fz) {
  float patchN = vn(xz * vec2(0.012, 0.004)) * 0.6 + vn(xz * vec2(0.05, 0.015)) * 0.4;
  // Ripe wheat in storm light: a dull gold, not a blown one.
  vec3 alb = mix(vec3(0.17, 0.11, 0.045), vec3(0.3, 0.21, 0.085), patchN);
  // Lodged by a tornado: the stalks lie combed along its wind and show their pale straw.
  vec3 dm = dmgAt(xz);
  float lodge = hurtAt(xz).x;
  if (lodge > 0.0) {
    vec2 ld = normalize(dm.yz + 1e-4);
    float comb = vn(vec2(dot(xz, ld) * 0.4, dot(xz, vec2(-ld.y, ld.x)) * 6.0) + 7.0);
    alb = mix(alb, vec3(0.33, 0.26, 0.14) * mix(1.0, 0.75 + 0.5 * comb, detail(0.3, fx)), lodge);
  }
  // A bent stalk shows its pale side; behind a crest it swings back dark.
  vec4 gw = gust(xz, fx + 0.35 * fz);
  alb = mix(alb, vec3(0.36, 0.3, 0.19), max(gw.z, 0.0) * 0.45);
  alb *= 1.0 + 0.3 * min(gw.z, 0.0);
  // Up close: clumps of ears with darker gaps between. They fade before they alias.
  float fm = max(fx, fz), near = detail(0.8, fm);
  if (near > 0.0) {
    // Each term reads turned, stretched noise: no grid or row lines up across the field.
    vec2 r1 = mat2(0.8, -0.6, 0.6, 0.8) * xz, r2 = mat2(0.36, 0.93, -0.93, 0.36) * xz;
    float rows = mix(0.5, vn(r1 * vec2(5.3, 1.7) + 3.0), detail(0.3, fm));
    float clump = vn(r2 * 2.3) * 0.6 + mix(0.5, vn(r1 * 7.1 + 11.0), detail(0.3, fm)) * 0.4;
    alb *= mix(1.0, (0.8 + 0.3 * clump) * (0.86 + 0.24 * rows) * (1.0 - 0.45 * smoothstep(0.38, 0.18, clump)), near);
  }
  // The heads: lit clusters about 10 cm across with dark gaps, then single heads 4 cm apart.
  // Each fades where a pixel no longer resolves it.
  // The axes are the camera's, so the grain holds still on the ground.
  vec2 va = toWorld(vec3(1.0, 0.0, 0.0)).xz, vd = toWorld(vec3(0.0, 0.0, -1.0)).xz;
  vec2 hu = vec2(dot(xz, va), dot(xz, vd));
  // Across the view it stays sharp; along it, it stretches up to four times, then fades out.
  float h1 = vn(vec2(hu.x * 10.0, hu.y * clamp(0.025 / max(fz, 1e-4), 2.5, 10.0)));
  float h2 = vn(vec2(hu.x * 25.0, hu.y * clamp(0.025 / max(fz, 1e-4), 6.25, 25.0)) + 5.0);
  float hg = (h1 - 0.5) * detail(0.1, fx) * detail(0.4, fz) + 0.7 * (h2 - 0.5) * detail(0.04, fx) * detail(0.16, fz);
  alb *= 1.0 + 0.8 * hg;
  // Toward the sun the tops glow: the light comes through the heads and awns.
  vec3 sunD = normalize(uSun + vec3(0.0, 0.02, 0.0));
  float back = pow(max(dot(gRd, sunD), 0.0), 3.0);
  // The shade takes the low sky's colour, at the fill's brightness.
  vec3 sky = hazeCol(-sunD) + hazeCol(sunD);
  sky = mix(uAmb, sky * dot(uAmb, vec3(0.3, 0.55, 0.15)) / max(dot(sky, vec3(0.15, 0.275, 0.075)), 1e-4), 0.5);
  return alb * (0.85 + 0.2 * gw.w) * (uSunCol * 0.5 * (1.0 + 1.2 * back * vec3(1.0, 0.85, 0.55)) + sky * 0.55);
}
// A low field's top: stubble, fallow, green, or a grass margin.
vec3 lowField(float crop, vec2 xz, float edge, float id, float fx, float fz) {
  float fm = max(fx, fz), nz = vn(xz * vec2(0.02, 0.008) + id * 50.0);
  vec3 alb;
  if (edge < MARGIN) {
    // Dry June grass, tan and olive.
    alb = mix(vec3(0.16, 0.15, 0.07), vec3(0.22, 0.19, 0.1), nz);
  } else if (crop < 1.5) {
    // Stubble: pale cut straw in drill rows, and the combine's straw swaths every 9 m.
    alb = mix(vec3(0.28, 0.23, 0.13), vec3(0.36, 0.3, 0.18), nz);
    float row = 0.5 + 0.5 * cos(xz.x * 6.2832 / 0.19);
    alb *= mix(1.0, 0.75 + 0.4 * row, detail(0.19, fx));
    float sw = abs(fract(xz.x / 9.1 + 0.2 * vn(vec2(xz.y * 0.01, id))) - 0.5) * 9.1;
    alb = mix(alb, vec3(0.42, 0.35, 0.2), band(sw, 0.7, fx) * 0.6);
    alb *= mix(1.0, 0.8 + 0.4 * vn(xz * 3.0), detail(0.4, fm));
  } else if (crop < 2.5) {
    // Fallow: dark tilled soil in disk furrows, clods up close.
    alb = mix(vec3(0.09, 0.065, 0.045), vec3(0.14, 0.1, 0.065), nz);
    float fur = 0.5 + 0.5 * cos(xz.x * 6.2832 / 0.35 + vn(xz * 0.05) * 6.0);
    alb *= mix(1.0, 0.75 + 0.45 * fur, detail(0.35, fx));
    alb *= mix(1.0, 0.7 + 0.6 * vn(xz * 9.0), detail(0.15, fm));
  } else {
    // Green: young milo in rows 76 cm apart, darker where it is thick.
    alb = mix(vec3(0.05, 0.075, 0.025), vec3(0.09, 0.12, 0.04), nz);
    float row = 0.5 + 0.5 * cos(xz.x * 6.2832 / 0.76);
    alb *= mix(1.0, 0.7 + 0.5 * row, detail(0.76, fx));
    alb = mix(alb, vec3(0.12, 0.13, 0.06), max(gust(xz, fx + 0.35 * fz).z, 0.0) * 0.3);
  }
  return alb * (uSunCol * 0.55 + uAmb * 0.6);
}
// The wheat's tops, where the far field's eye meets it.
const float CANOPY = 0.95;
// Light inside the stand at height y, edge metres in from the field's road edge.
// side is -1 for the field left of the road, 1 for the one right of it.
// The sun reaches in through the tops, or through the edge where it faces the sun.
// Straw and ears scatter some sunlight down into the stand.
// The sky's light comes down through the tops and in at the edge.
vec3 standLight(float y, float edge, float side) {
  float depth = max(CANOPY + 0.04 - y, 0.0), dTop = depth / max(uSun.y, 0.03);
  float toSun = -side * uSun.x;
  float dSun = toSun > 0.02 ? min(dTop, edge / toSun) : dTop;
  float sky = exp(-2.5 * min(depth, edge));
  return uSunCol * 0.5 * (exp(-3.5 * dSun) + 0.3 * exp(-2.0 * depth)) + uAmb * 0.55 * mix(0.45, 1.0, sky);
}
// The near wheat walks the stalks: wheat.js.
${WHEAT_GLSL}
${ROAD_GLSL}
vec3 ground(vec3 rd, float px) {
  gRd = rd;
  float t = CAMH / -rd.y;
  vec3 P = rd * t;
  // The footprint of one pixel on the ground, in metres.
  float fx = t * px / uFoc;
  // The plain, top down: the ray meets a field at its crop's top, or a taller crop's side.
  // A wheat field's side is a wall of stalks under the ears, in the stand's own light.
  vec3 col = vec3(0.0);
  bool hit = false;
  float hPrev = CAMH;
  for (int i = 0; i < 4; i++) {
    float h = i == 0 ? CROP_H.x : (i == 1 ? CROP_H.w : (i == 2 ? CROP_H.y : 0.0));
    if (h >= CAMH) continue;
    float th_ = (CAMH - h) / -rd.y;
    vec2 Q = rd.xz * th_;
    float edge, id, crop = cropAt(Q, edge, id);
    // A tornado's track: lodged wheat lies low, a stronger wind scours a crop to stubble, then to soil.
    vec3 hk = crop >= 0.0 ? hurtAt(Q) : vec3(0.0);
    if (hk.z > 0.5) crop = 2.0; else if (hk.y > 0.5) crop = 1.0;
    float H = cropH(crop, edge);
    if (crop == 0.0 && hk.x > 0.5) H = CROP_H.y;
    if (H < h - 0.01) { hPrev = h; continue; }
    hit = true;
    float fq = th_ * px / uFoc, fz = fq * th_ / (CAMH - h);
    if (H > h + 0.01) {
      // The side of a taller crop, met somewhere between this level and the last.
      // On the road's side the meeting height is exact.
      float side = sign(Q.x - ROAD_X), ye = 0.5 * (h + min(hPrev, H));
      if (abs(rd.x * (CAMH - hPrev) / -rd.y - ROAD_X) < WHEAT_GAP) ye = CAMH + rd.y * (ROAD_X + side * WHEAT_GAP) / rd.x;
      if (crop == 0.0 && edge >= MARGIN) col = mix(vec3(0.13, 0.11, 0.05), vec3(0.3, 0.21, 0.09), smoothstep(0.7, 0.95, ye)) * standLight(ye, 0.15, side) * 1.3;
      else col = lowField(crop, Q, edge, id, fq, fz) * 0.7;
    } else if (crop == 0.0 && edge >= MARGIN) col = wheatFar(Q, fq, fz);
    else col = lowField(crop, Q, edge, id, fq, fz);
    // Scoured ground is torn: dark soil and shredded straw in clots, no rows.
    float sc = max(hk.y, hk.z);
    if (sc > 0.0) col = mix(col, mix(vec3(0.07, 0.05, 0.035), vec3(0.2, 0.16, 0.09), vn(Q * 1.7) * (1.0 - hk.z * 0.6)) * (uSunCol * 0.55 + uAmb * 0.6), sc * 0.7);
    break;
  }
  if (!hit) {
    // Seen from the verge, the near field's edge is a wall of stalks under the ears.
    float side = sign(P.x - ROAD_X), te = (ROAD_X + side * WHEAT_GAP) / rd.x, ye = CAMH + rd.y * te;
    col = mix(vec3(0.13, 0.11, 0.05), vec3(0.3, 0.21, 0.09), smoothstep(0.7, 0.95, ye)) * standLight(ye, 0.15, side) * 1.3;
  }
  // The ditch and verge, the gravel berm, asphalt and paint: road.js.
  col = roadside(col, P, rd, fx);
  // Near the eye the wheat stands as stalks over the ground, faded out before it shimmers.
  // The fade reads the pixel's size where the ray meets the canopy, not the ground.
  float fxc = max(CAMH - 1.0, 0.05) / -rd.y * px / uFoc;
  float nearK = 1.0 - smoothstep(0.012, 0.03, fxc);
  if (nearK > 0.0) {
    vec4 w = wheatStand(rd, px);
    col = mix(col, w.rgb + w.a * col, nearK);
  }
  // The deck's cover along the sun's ray darkens the plain in soft patches.
  float cover = sunCover(P * 0.001 + vec3(0.0, CAMH * 0.001, 0.0));
  col *= shadeK(cover);
  // In the green phase the sun's light through the rain lays a sickly yellow-green on the lit plain.
  col = mix(col, col * vec3(0.86, 1.0, 0.6), uGreen * 0.7 * (1.0 - cover));
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
// Lays a lit flat shape z metres off into the objects' layers. k is coverage.
// put() lives in line.js: it sorts each shape behind or in front of the funnels.
void put(vec3 col, float k, float z);
// The haze over a thing t metres off, in direction d.
vec3 hazed(vec3 col, vec3 d, float t) { return mix(col, hazeCol(d), 1.0 - exp(-t / 30000.0)); }

// The telephone poles and their wires live in line.js.
// The farm lives in farm.js.
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
  // The eye's shade is read once, at the first ear that covers this pixel.
  vec3 lit = vec3(-1.0);
  const int N = 56;
  for (int i = 0; i < N; i++) {
    float fi = float(i);
    // The ears stand nearer on a wider lens, so they keep their size on screen at any lens.
    // At 28 mm the 50 mm distances drew them as thin strokes.
    float z = (4.0 - fi * (3.3 / float(N))) * uFoc / 2.083;
    float hw = 0.5 * asp / uFoc * z;
    float x = (th(vec2(fi, 4.2)) - 0.5) * 2.2 * hw;
    float top = 0.98 + 0.12 * th(vec2(fi, 9.1));
    // The gust at this ear, from its place in the world.
    vec3 W = toWorld(vec3(x, 0.0, -z));
    // No ears on the road or its verges.
    if (abs(W.x - ROAD_X) < WHEAT_GAP) continue;
    vec2 lean = bend(gust(W.xz, 0.0), 1.0);
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
    // A stalk thinner than its blur covers only its share of the blur: at a wide lens it is a hair, not a stroke.
    k = max(k, smoothstep(ws + bl, ws - bl, ds) * 0.9 * clamp(ws / bl, 0.0, 1.0));
    // The awns: a pale tuft past the tip.
    float ua;
    float da = segD(s, tip, tip + (tip - base) * 0.75, ua);
    k = max(k, smoothstep(w * 1.1 + bl, 0.0, da) * 0.35 * (1.0 - ua));
    if (k <= 0.0) continue;
    if (lit.x < 0.0) lit = (uSunCol * 0.5 + uAmb * 0.55) * shadeK(sunCover(vec3(0.0)));
    vec3 ear = mix(vec3(0.42, 0.29, 0.11), vec3(0.6, 0.45, 0.2), th(vec2(fi, 2.7)));
    // Lit face toward the eye, darker at the rim.
    float rim = clamp(d / max(ww, 1e-4), 0.0, 1.0);
    c = mix(c, ear * lit * (1.05 - 0.4 * rim * rim), clamp(k, 0.0, 1.0));
  }
}

${LINE_GLSL}
${DAMAGE_GLSL}
${PLAIN_GLSL}
${TRAFFIC_GLSL}
${FARM_GLSL}
${INFRA_GLSL}
// A cloud-to-ground channel on screen: a jagged bright line from the base to the ground,
// with two or three short branches. Thin, with a soft glow; s is the screen point.
float boltChannel(vec2 s, float px) {
  vec2 a = uBoltT.xy / -uBoltT.z * uFoc - vec2(0.0, CAMH * 0.001 / -uBoltT.z * uFoc), b = uBoltG.xy / -uBoltG.z * uFoc - vec2(0.0, CAMH * 0.001 / -uBoltG.z * uFoc);
  float h = a.y - b.y;
  if (h <= 0.0 || s.y > a.y + 4.0 * px || s.y < b.y - 4.0 * px || abs(s.x - mix(a.x, b.x, 0.5)) > h * 0.6) return 0.0;
  float sd = uBolt.y * 37.0;
  // How far down the channel this row is, 0 at the base, 1 at the ground.
  float u = clamp((a.y - s.y) / h, 0.0, 1.0);
  float xc = mix(a.x, b.x, u) + h * ((vn(vec2(u * 7.0, sd)) - 0.5) * 0.22 + (vn(vec2(u * 26.0, sd + 3.0)) - 0.5) * 0.07 + (vn(vec2(u * 90.0, sd + 7.0)) - 0.5) * 0.02);
  float d = abs(s.x - xc);
  float k = exp(-pow(d / (1.1 * px), 2.0)) + 0.3 * exp(-d / (7.0 * px));
  // The branches fork off down the upper half and fade toward their tips.
  for (int j = 0; j < 3; j++) {
    float fj = float(j), ub = 0.12 + 0.4 * th(vec2(sd, fj)), len = 0.15 + 0.25 * th(vec2(fj, sd));
    if (u < ub || u > ub + len) continue;
    float side = th(vec2(sd + fj, 9.0)) < 0.5 ? -1.0 : 1.0, v = (u - ub) / len;
    float x0 = mix(a.x, b.x, ub) + h * (vn(vec2(ub * 7.0, sd)) - 0.5) * 0.22;
    float xb = x0 + side * v * h * len * 0.6 + h * (vn(vec2(u * 30.0, sd + fj * 5.0)) - 0.5) * 0.05;
    float db = abs(s.x - xb);
    k += (exp(-pow(db / (0.9 * px), 2.0)) * 0.6 + 0.12 * exp(-db / (5.0 * px))) * (1.0 - v);
  }
  // The foot fades a little into the dust; the top into the base.
  return k * smoothstep(0.0, 0.06, u) * (0.7 + 0.3 * smoothstep(1.0, 0.85, u));
}
vec3 envScene(vec2 uv) {
  float asp = uRes.x / uRes.y, px = 1.0 / uRes.y;
  vec2 s = vec2((uv.x - 0.5) * asp, uv.y - uHz);
  vec3 rc = normalize(vec3(s, -uFoc));
  vec3 rd = toWorld(rc);
  lightInit(rc);
  gPx = px;
  vec3 c;
  // The objects on the plain first: each one sorts itself behind or in front of the funnels.
  objInit(s);
  farm(c, s, rd, px);
  // Vehicles far off lay down before the line; near ones after it, over it.
  traffic(s, rd, px, false);
  linePoles(s, rd, px);
  wires(s, rd, px);
  plain(s, rd, px);
  infra(s, rd, px);
  debris(s, rd, px);
  traffic(s, rd, px, true);
  // The storm pass: the whole deck and every funnel, at half size. Until it builds, the sky marches here.
  vec4 tv = uStormOn > 0.5 ? texture(tTor, uv) : vec4(0.0);
  if (rd.y < -1e-4) {
    c = ground(rd, px);
    c = c * (1.0 - gOB.a) + gOB.rgb;
    c = c * (1.0 - tv.a) + tv.rgb;
  } else {
    c = skyCol(rd);
    // The sun's globe and its close glow; the storm laid on next hides them where the deck is.
    float cs = max(dot(rd, uSun), 0.0);
    // Thick cloud hides the globe and its ring outright: the cover alone let a bright globe leak through.
    c += uSunCol * (24.0 * smoothstep(0.99997, 0.99999, cs) + 0.35 * pow(cs, 900.0) + 0.06 * pow(cs, 60.0)) * smoothstep(0.85, 0.4, tv.a);
    // The sky dims round the storm: its shadow and its outflow haze.
    float near = dot(rc, normalize(vec3(SHELF.x, 4.0, SHELF.y)));
    c *= mix(1.0, 0.55, smoothstep(0.8, 0.98, near));
    // The low sky under and beyond the storm: light from far off, brightest at the horizon,
    // warmest toward the sun. The deck laid on later hides it wherever the deck is.
    float el = max(rd.y, 0.0);
    vec3 lowSky = skyCol(normalize(vec3(rd.x, 0.0, rd.z)));
    float toSun = pow(max(dot(normalize(rd.xz + 1e-5), normalize(uSun.xz + 1e-5)), 0.0), 2.0);
    c += mix(lowSky, uSunCol * vec3(0.5, 0.33, 0.2), 0.3 * toSun) * exp(-el * 60.0) * 0.5;
    // Distant haze lies in layers: a few thin bands just over the horizon, each ragged along it.
    float az = atan(rd.x, -rd.z);
    for (int i = 0; i < 3; i++) {
      float fi = float(i), e = 0.004 + 0.008 * fi, w = 0.003 + 0.002 * fi;
      float rag = vn(vec2(az * (30.0 + 12.0 * fi) + fi * 17.0, fi * 3.1));
      float b = exp(-pow((el - e) / w, 2.0)) * (0.35 + 0.5 * rag);
      // The bands are dust, warm in the low light, not the sky's own hue.
      c = mix(c, mix(hazeCol(rd), uSunCol * vec3(0.3, 0.22, 0.15) + uAmb * 0.15, 0.5) * (1.0 - 0.12 * fi), b * 0.35);
    }
    // The objects behind the funnels stand in front of the sky and under the rain.
    c = c * (1.0 - gOB.a) + gOB.rgb;
    // Under the base: the gloom, and the rain curtain hanging out of the core.
    vec3 ro = vec3(0.0, CAMH * 0.001, 0.0);
    vec2 gl = cylinder(ro, rc, SHELF, SHELF_R.y * mix(0.4, 0.95, uStorm), 0.0, BASE + 0.2);
    vec2 rn = cylinder(ro, rc, CORE, mix(1.3, 4.6, uStorm), 0.0, BASE + 0.4);
    // The gloom under the base: slate at full storm, green-teal in the green phase.
    vec3 gloom = gloomCol();
    float glK = 1.0 - exp(-gl.y * gl.y * 0.003 * uStorm);
    // The rain shaft: ragged and soft at its sides, never a solid block.
    float raz = atan(rc.x, -rc.z);
    float rag = vn(vec2(raz * 90.0, 1.3)) * 0.6 + vn(vec2(raz * 23.0, 4.1)) * 0.4;
    float streak = 0.8 + 0.2 * vn(vec2(raz * 260.0, 0.5));
    float rnL = max(rn.y - 2.0 * rag, 0.0);
    float rnK = (1.0 - exp(-rnL * 0.08 * uStorm * streak)) * 0.65 * smoothstep(0.0, 0.003, rd.y + 0.001);
    // It lies 20 km off: the haze takes it, most near the ground.
    float rnLow = 1.0 - smoothstep(0.0, 0.06, rd.y);
    rnK *= 1.0 - 0.4 * rnLow;
    vec3 rainC = mix(gloom * vec3(0.95, 0.98, 1.0) + uSunCol * 0.008, hazeCol(rd), 0.3 + 0.4 * rnLow);
    if (uStormOn > 0.5) {
      // The sky behind takes the gloom and the rain; the storm pass carries its own gloom, sample by sample.
      // Laid over everything, the gloom drew a backlit funnel in the sky's own tone: it read as hollow.
      c = mix(mix(c, gloom, glK), rainC, rnK);
      c = c * (1.0 - tv.a) + tv.rgb;
    } else {
      // White noise per pixel, new each frame: it reads as film grain, not a pattern.
      float jit = th(gl_FragCoord.xy + fract(uT * 7.31) * 113.0);
      float tHit;
      vec4 st = storm(rc, jit, tHit);
      // The far storm sinks into the haze.
      float h = 1.0 - exp(-tHit / 70.0);
      c = c * (1.0 - st.a) + mix(st.rgb, hazeCol(rd) * st.a, h * 0.8);
      c = mix(mix(c, gloom, glK), rainC, rnK);
    }
  }
  // The thin band where ground meets sky takes the haze.
  c = mix(c, hazeCol(rd), exp(-abs(rd.y) * 900.0) * 0.6);
  // The sun's glow in the haze: a soft half globe low on the sun's side, never streaks.
  // It is the far sunlit air seen under the deck, so it fades up from the horizon.
  float cA = dot(normalize(rd.xz + 1e-5), normalize(uSun.xz + 1e-5));
  c += uSunCol * vec3(1.0, 0.82, 0.6) * 0.03 * exp(-(1.0 - cA) * 3.0) * exp(-abs(rd.y) * 7.0);
  // Lightning: a cloud-to-ground channel, behind rain and funnels; its light on the plain and in the air.
  if (uBolt.x > 0.0) {
    vec3 fl = vec3(0.75, 0.8, 1.0);
    if (uBolt.z > 0.5) c += fl * boltChannel(s, px) * uBolt.x * 3.0 * (1.0 - 0.7 * tv.a);
    vec3 dG = normalize(uBoltG + vec3(0.0, 0.3, 0.0));
    float aG = max(dot(rc, dG), 0.0);
    // A faint glow round the strike, low over the plain, and a flicker across the whole air.
    c += fl * uBolt.x * uBolt.w * (0.05 * exp(-(1.0 - aG) / 0.004) + 0.004);
  }
  c = c * (1.0 - gOF.a) + gOF.rgb;
  // Arcs and sparks on the line: their light shows through the dust, and lights it.
  c += sparks(s, px, tv.a);
  // The vehicles' lamps glow through the dust.
  c += gVehGlow * (1.0 - 0.6 * tv.a);
  nearEars(c, s, px, asp);
  // Near rain: the low sun at the eye's back lights the streaks against the storm.
  if (uRain > 0.0) {
    // Rain veils the distance: the far plain and the sky go grey, the near ground less.
    vec3 veil = uAmb * 0.14 + uSunCol * 0.015;
    c = mix(c, veil, uRain * 0.3 * (1.0 - smoothstep(0.0, 0.25, -rd.y)));
    // The frame at 1.8x scale: shorter, finer, slower streaks.
    float w = ppRain(uv * 1.8, asp, uT, uRain, uRainDir, uAirN);
    c = c * (1.0 - 0.1 * min(w, 1.0)) + (uSunCol * 0.04 + uAmb * 0.07) * w;
  }
  // The Look preset's camera: white balance, saturation, then contrast about a dark mid tone.
  c *= uWB;
  c = max(mix(vec3(dot(c, vec3(0.2126, 0.7152, 0.0722))), c, uSat), 0.0);
  c = 0.05 * pow(c / 0.05, vec3(uCon));
  return c;
}
`;

/* ---------- state ---------- */
// qaHold stops the loop while a QA timing runs.
let qaHold = false;
// The storm's base in km: Dev's Cloud base.
let base = 1.35;
// The base as drawn: the slider's height at the default storm, a third higher for a young one.
const baseNow = () => base * (1 + 0.4 * (0.85 - storm));
// The eye's height in metres: Dev's Eye height. It stands higher than a crouch, for a wider view.
let camH = 8;
// The eye height Dev sets; camH is that height plus the Rise.
let eyeSet = 8;
// Rise: u runs 0 to 1 and back; dir is +1 up, -1 down, 0 at rest.
// At the top it holds hold seconds, then eases back by itself.
const rise = { u: 0, dir: 0, dur: 15, top: 35, hold: 0 };
// The lens widens by this share at the top of the Rise.
const RISE_WIDEN = 0.3;
// A soft ease with flat ends.
const easeRise = x => x * x * x * (x * (6 * x - 15) + 10);
let storm = 0.85, fLevel = 2, visible = true, simT = 0, lastInput = 0, asleep = false;
// Each tornado: its foot in metres, the eased and the set F level, its life state.
/** @typedef {{ x: number, z: number, f: number, fT: number, cond: number, dust: number, form: number, low: number, desc: number, turn: number, rope: number, roping: boolean, age: number, life: number, seed: number, ph: Float32Array, zs: number, ds: number }} Tor */
/** @type {Tor[]} */
const tors = [];
// The wind: its strength, 0 to 1, and its bearing as a world direction.
// 0 degrees blows to the right; positive turns it toward the eye. The storm drifts with it.
let wind = 0.85;
const windDir = [0.944, 0.33];
// The field's wind, 0 to 1: a young cell barely stirs the wheat, a full storm drives it hard.
// A working tornado adds its inflow, most within a few kilometres of the eye.
function fieldGust() {
  let k = wind * (0.12 + 0.88 * sstep(0.1, 0.9, storm));
  for (const t of tors) k += 0.5 * t.dust * (0.3 + 0.7 * t.f / 5) * Math.exp(-Math.hypot(t.x, t.z) / 4000);
  return clamp(k);
}
// Each tornado's foot for the wheat: x and z in metres, its pull, and its reach.
const feet = new Float32Array(MAX_TOR * 4);
function torFeet() {
  feet.fill(0);
  tors.slice(0, MAX_TOR).forEach((t, i) => feet.set([t.x, t.z, t.dust * (0.4 + 0.6 * t.f / 5), 250 + 150 * t.f], i * 4));
  return feet;
}
// The sun behind the eye, low, a little off to the left.
const sun = [0, 0, 0], sunCol = [0, 0, 0], amb = [0, 0, 0];
// The sun's bearing in radians: 0 is straight behind the eye. Dev sets it in degrees.
let sunAz = 0.35;
function setSun(hour) {
  // Elevation in degrees: 25 in the afternoon, 1 at dusk, and on down below the horizon after 19:40.
  const el = clamp((19.6 - hour) / 3.6, -0.3, 1) * 25 * Math.PI / 180 + 0.015;
  const az = sunAz;
  sun[0] = -Math.sin(az) * Math.cos(el); sun[1] = Math.sin(el); sun[2] = Math.cos(az) * Math.cos(el);
  // Low light is warm and weak; the sky's fill turns blue and dim.
  const k = clamp(el / 0.44);
  const g = 0.5 + 0.5 * k;
  // Under the storm the light is low and precious: the sun rakes in at about two thirds of open-sky strength.
  sunCol[0] = 1.7 * (0.45 + 0.55 * g); sunCol[1] = 1.7 * (0.2 + 0.7 * g * g); sunCol[2] = 1.7 * (0.08 + 0.72 * k * k);
  amb[0] = 0.14 + 0.16 * k; amb[1] = 0.17 + 0.19 * k; amb[2] = 0.25 + 0.24 * k;
  // Once the sun is down its light goes, and the sky's fill dims into twilight.
  const up = sstep(-0.035, 0.012, el), tw = 0.45 + 0.55 * sstep(-0.12, 0.0, el);
  for (let i = 0; i < 3; i++) { sunCol[i] *= up; amb[i] *= tw; }
  // The Look preset scales the sun and the sky's fill.
  for (let i = 0; i < 3; i++) { sunCol[i] *= LOOK_NOW.sunK; amb[i] *= LOOK_NOW.skyK; }
}
const aspect = () => canvas.clientWidth / Math.max(1, canvas.clientHeight);
// The lens in mm on a 24 mm tall frame: the factor is focal length over 24.
let lensMM = 28;
// A narrow frame takes a somewhat wider lens and crops the storm's sides.
const focal = () => (lensMM / 24) * Math.min(1, Math.sqrt(aspect() / 1.3)) * (1 - RISE_WIDEN * easeRise(rise.u));
// The road vanishes on the right golden line.
const ROAD_VP = 1 - GOLD;
// The eye turns left until the road's vanishing point lies there.
const yaw = () => Math.atan((ROAD_VP - 0.5) * aspect() / focal());
// Camera space to world space, and back, about the vertical axis.
const toWorld = (x, z, a = yaw()) => [x * Math.cos(a) + z * Math.sin(a), -x * Math.sin(a) + z * Math.cos(a)];

// The power line's state: leans, breaks and spark events.
const line = lineState();
// The vehicles on the road: a pickup fleeing, then two chasers rushing in.
const traf = trafficState();
// The damage field: each ground point's peak wind, kept until the second Clear.
const dmg = damageState();
// The farm's buildings, each a site in the damage field.
const farmS = farmState(dmg);
// The water tower, the billboard, the pivot and the bales.
const inf = infraState(dmg);
const canvas = document.createElement('canvas');
stage.prepend(canvas);
// The funnel pass: its program, the noise volume, two targets for the history, and its state.
const fun = { n: 0, prog: null, progs: {}, mode: 'tube', noise: null, A: null, B: null, w: 0, h: 0, on: false, loopT: 0, frame: 0, fresh: true, farT: 0, farDur: 0 };
let env = null;
try {
  env = environment(canvas, {
    scene: SCENE,
    glass: GLASS_STEP,
    pane: { head: PANE_HEAD, uniforms: { uNearBlur: () => (S.on.glass && drops?.ready ? nearBlur : 0) }, textures: { tDrops: () => drops?.tex() ?? null } },
    animated: true,
    budget: 1.8e6,
    active: () => visible && !qaHold,
    onFrame: raw => { fun.loopT = performance.now(); step(Math.min(raw, 0.05)); },
    before: (w, h) => { damageTex(dmg, env.gl); debrisUniforms(dmg, simT); infraUniforms(inf); lineUniforms(line, tors); trafficUniforms(traf, simT); funnelPass(w, h); bindNoise(); sunFlare(); if (S.on.glass && nearBlur > 0) drops?.pass(w, h, env.motion, S, nearBlur); },
    textures: { tTor: () => (fun.on ? fun.A.tex : null), tDmg: () => dmg.tex },
    uniforms: {
      uSun: () => sun, uSunCol: () => sunCol, uAmb: () => amb,
      uFoc: focal, uHz: horizon, uYaw: yaw, uWind: () => wind, uWDir: () => windDir, uStorm: () => storm, uT: () => simT,
      uBase: baseNow, uReach: () => deckReach, uFront: () => front, uCamH: () => camH, uSpIn: () => KNOB.spIn, uStormOn: () => (fun.on ? 1 : 0), uPlainLit: () => plainLit(), uGreen: () => greenK(), uBoltT: () => bolt.top, uBoltG: () => bolt.foot, uBolt: () => bolt.u, uBeam: () => beam, uTorOn: () => (fun.on && fun.n ? 1 : 0),
      uRain: () => rain, uRainDir: () => rainAim(),
      uWB: () => LOOK_NOW.wb, uSat: () => LOOK_NOW.sat, uCon: () => LOOK_NOW.con,
      uTorZ: () => pk.Z, uTorN: () => pk.NR, uTorH: () => pk.H,
      uGust: fieldGust, uTorF: torFeet,
      uPole: () => line.uPole, uSpan: () => line.uSpan, uArc: () => line.uArc, uArcK: () => line.uArcK, uFoot: () => line.uFoot, uCasc: () => line.uCasc, uVeh: () => traf.u, uVehB: () => traf.uB, uVehC: () => traf.uC, uFarm: () => farmUniforms(farmS), uDeb: () => dmg.uDeb, uDebB: () => dmg.uDebB, uInfra: () => inf.uInfra, uBale: () => inf.uBale, uBaleB: () => inf.uBaleB, uSwayPh: () => line.uSwayPh,
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

/* ---------- the Look preset ---------- */
// Stimming is the tuned shot. Photoreal reads as a camera on the plain:
// a harder sun over a dimmer sky, a daylight white balance, a camera's saturation,
// more contrast, a faint wide lens glare, a natural lens falloff and fine grain.
const LOOKS = {
  stimming: { sunK: 1, skyK: 1, expoK: 1, wb: [1, 1, 1], sat: 1, con: 1, bloom: 0.18, thr: 1.4, vig: 0.38, grain: 0.035, tintK: 0 },
  photoreal: { sunK: 1.3, skyK: 0.85, expoK: 1, wb: [0.92, 1, 1.12], sat: 0.85, con: 1.15, bloom: 0.07, thr: 0.6, vig: 0.22, grain: 0.02, tintK: 3 },
};
let LOOK_NOW = LOOKS.stimming;
// It sets the post values and the Grain row; Tone map stays as it is.
// On load, keepGrain keeps the Grain row's saved value.
act.preset = (v, keepGrain = false) => {
  LOOK_NOW = LOOKS[v] || LOOKS.stimming;
  const L = LOOK_NOW;
  Object.assign(S, { bloom: L.bloom, thr: L.thr, vig: L.vig, tintK: L.tintK });
  if (!keepGrain) ui.setting('grain')?.set(L.grain, true);
  setSun(S.hour);
  act.expo(expoTrim);
};

/* ---------- near rain ---------- */
// The Rain row: 0 is dry.
let rain = 0;
// The Drop blur row: the disc radius for the pane's drops, in frame heights.
let nearBlur = 0.01;
const rainDir = [0, -1];
// The rain slants with the wind across the frame.
// Full wind gives about 25 degrees: heavy drops, not speed lines.
function rainAim() {
  const a = yaw(), across = windDir[0] * Math.cos(a) - windDir[1] * Math.sin(a);
  const x = clamp(across * wind * 0.55, -0.6, 0.6), l = Math.hypot(x, 1);
  rainDir[0] = x / l; rainDir[1] = -1 / l;
  return rainDir;
}

/* ---------- the sun's flare ---------- */
// The storm's shape in camera km, as the scene's GLSL has it, with no noise: for the sun's cover.
const sstep = (a, b, x) => { const k = clamp((x - a) / (b - a)); return k * k * (3 - 2 * k); };
const smin = (a, b, k) => { const h = clamp(0.5 + 0.5 * (b - a) / k); return b + (a - b) * h - k * h * (1 - h); };
const mixN = (a, b, t) => a + (b - a) * t;
function stormShapeJS(x, y, z) {
  const g = storm, gT = Math.max(g, 0.6), B = baseNow(), top = mixN(8, 12.5, gT);
  const T = [-4.3, -23], SH = [1, -13], SR = [15, 9];
  const qx = x - T[0] - 0.28 * (y - B), qz = z - T[1] + 0.12 * (y - B);
  const rT = mixN(2.2, 7, g) * (1 - 0.25 * sstep(B, 6, y) + 0.2 * sstep(top - 3, top, y));
  const tower = Math.max(Math.hypot(qx, qz) - rT, Math.max(B + 0.1 - y, y - top));
  const k = g < 0.85 ? mixN(0.2, 0.91, g / 0.85) : mixN(0.4, 1, g), bx = (x - SH[0]) / (SR[0] * k), bz = (z - SH[1]) / (SR[1] * k);
  const shelf = Math.max((Math.hypot(bx, bz) - 1) * SR[1] * k, Math.abs(y - (B + 0.6)) - 0.6);
  const ax = x - (T[0] + mixN(2, 14, g)), ay = y - (top - 0.5), az = z - (T[1] - 2);
  const anvil = Math.max((Math.hypot(ax / mixN(6, 28, g), ay / 1.7, az / mixN(4, 9, g)) - 1) * 1.6, y - top - 0.5) + 4 * (1 - sstep(0.25, 0.65, g));
  const ox = x - (T[0] + 0.28 * (top - B)), oy = (y - (top + 0.4)) * 1.6, oz = z - (T[1] - 0.12 * (top - B));
  const dome = Math.hypot(ox, oy, oz) / 1.6 - mixN(1.7, 2.8, g);
  let d = smin(tower, shelf, 1.4);
  d = smin(d, dome, 1.2);
  d = smin(d, anvil, 2.2);
  const under = B + 0.12 + 0.25 * sstep(-6, 4, z);
  const fx = Math.abs(x) - 150, fz = Math.abs(z + 0.5 * (deckReach + front)) - 0.5 * (deckReach - front);
  // The deck's slab, from its front edge to its reach.
  const slab = Math.max(Math.hypot(Math.max(fx, 0), Math.max(fz, 0)) + Math.min(Math.max(fx, fz), 0), Math.max(under - y, y - (B + mixN(0.35, 1, clamp(g / 0.85)))));
  return smin(d, slab, 0.8);
}
// The sun's flare through the lens: full in frame, a veil just past the edge, none behind the eye.
// The storm hides it where the sun is behind the deck; its ragged edge makes the cover soft.
function sunFlare() {
  const a = yaw(), sx = sun[0] * Math.cos(a) - sun[2] * Math.sin(a), sz = sun[0] * Math.sin(a) + sun[2] * Math.cos(a), sy = sun[1];
  let gain = 0;
  if (sz < -0.05 && sy > -0.01) {
    const foc = focal(), u = sx / -sz * foc / aspect() + 0.5, v = sy / -sz * foc + horizon();
    const out = Math.max(0, -u, u - 1) + Math.max(0, -v, v - 1);
    // The cover: the lowest distance to the storm's shape along the sun's ray.
    let t = 0.3, minD = 1e9;
    for (let i = 0; i < 120 && t < 120; i++) {
      const d = stormShapeJS(sx * t, camH * 0.001 + sy * t, sz * t);
      minD = Math.min(minD, d);
      if (d < -0.3) break;
      t += Math.max(d * 0.8, 0.1);
    }
    const cover = clamp((0.8 - minD) / 1.0);
    gain = Math.exp(-out * 4) * (1 - cover) * clamp(sy / 0.02 + 0.5);
    S.light = [u, v];
  }
  // A sun behind the eye or the storm lights no drops and no fog on the pane.
  if (gain < 0.01) S.light = [0.5, 4];
  const m = Math.max(sunCol[0], sunCol[1], sunCol[2], 1e-3);
  S.lightColor = [sunCol[0] / m, sunCol[1] / m, sunCol[2] / m];
  S.on.flare = gain > 0.01;
  S.flGain = 0.5 * gain;
  S.flSize = 0.8;
}

/* ---------- the funnel pass ---------- */
// The tornadoes draw at this share of the frame's size, into their own target.
const FUN_RES = 0.5;
const gl = env.gl;
// The pane's drops, out of focus: the focus is on the far plain.
const drops = paneBlur(gl);
// The pass compiles beside the first frames; until then the plain shows no funnel.
// The poll waits on a timer, so a background tab still finishes the link.
// Each funnel mode has its own program; the Cloud tube compiles when first picked.
function useFunnel(mode) {
  fun.mode = mode;
  if (fun.progs[mode]) { fun.prog = fun.progs[mode]; fun.fresh = true; env.touch(); return; }
  if (fun.progs[mode] === null) return;
  fun.progs[mode] = null;
  linked(gl, { f: program(gl, TRI_VS, funnelFS(SKY, SHARED, mode === 'tube')) }, { wait: () => new Promise(r => setTimeout(r, 30)) })
    .then(set => { fun.progs[mode] = set.f; if (fun.mode === mode) { fun.prog = set.f; fun.fresh = true; } env.touch(); })
    .catch(err => { delete fun.progs[mode]; console.error('funnel pass:', err); });
}
act.funnel = v => useFunnel(v === 'shells' ? 'shells' : 'tube');
// The old key held the old default; it goes.
try { localStorage.removeItem('stimming.tornado.funnel'); } catch { /* no storage */ }
// QA: ?funnel=shells picks the Shells for one load.
act.funnel(new URLSearchParams(location.search).get('funnel') || ui.setting('funnelMode')?.value || 'tube');
// The storm's noise volume: the scene pass reads it from the first frame.
fun.noise = noiseVolume(gl);
// The scene pass reads the volume on unit 0, its sampler's default: the runner binds only 2D textures there.
function bindNoise() {
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_3D, fun.noise);
}
// The cloud base over a point in camera metres, lower in each tornado's pit. baseAt() in the GLSL holds the same curve.
// pits holds each pit's centre in camera km, radius and depth in km.
function deckAt(cx, cz, pits) {
  let b = baseNow();
  for (const [px, pz, R, dep] of pits) b = Math.min(b, baseNow() - dep * (1 - sstep(R * 0.57, R * 1.33, Math.hypot(cx * 0.001 - px, cz * 0.001 - pz))));
  return b * 1000;
}
// A tornado's pit: it deepens as its whirl forms, to 0.55 km under the base.
const pitOf = t => {
  const f = t.f, reachF = (1.5 + 3 * f / 5) * KNOB.spR;
  // A young storm's thin deck has no pits.
  return [(0.6 + 0.35 * reachF) * (0.6 + 0.4 * storm), 0.55 * sstep(0, 1, t.low) * sstep(0.15, 0.7, storm)];
};
const pk = { Z: new Float32Array(MAX_FUNNELS * 4), NR: new Float32Array(MAX_FUNNELS * 4), H: new Float32Array(MAX_FUNNELS * 4), A: new Float32Array(16), B: new Float32Array(16), C: new Float32Array(16), D: new Float32Array(16), E: new Float32Array(16), F: new Float32Array(16), ph: new Float32Array(MAX_FUNNELS * 14) };
// Packs the tornadoes nearest first and finds their box on the target. Returns the count.
// The wind's direction in camera space, for the funnels' lean and bow.
const windC = [1, 0];
function packFunnels(rw, rh) {
  const a = yaw(), co = Math.cos(a), si = Math.sin(a), foc = focal(), asp = rw / rh, hz = horizon();
  windC[0] = windDir[0] * co - windDir[1] * si; windC[1] = windDir[0] * si + windDir[1] * co;
  const list = [];
  let x0 = rw, y0 = rh, x1 = 0, y1 = 0;
  // Each tornado's top and pit first: a funnel's height hangs from the pits round it.
  const tops = tors.map(t => {
    const cx = t.x * co - t.z * si, cz = t.x * si + t.z * co, lean = at('lean', t.f) * KNOB.lean * (0.4 + 0.8 * wind);
    return [cx + windC[0] * lean + 500 * clamp(t.rope), cz + windC[1] * lean - 125 * clamp(t.rope)];
  });
  const pits = tors.map((t, i) => [tops[i][0] * 0.001, tops[i][1] * 0.001, ...pitOf(t)]);
  for (const [ti, t] of tors.entries()) {
    // The foot in camera space.
    const cx = t.x * co - t.z * si, cz = t.x * si + t.z * co;
    const f = t.f, fade = 1 - clamp(t.rope - 1), lm = labM(f), deck = deckAt(tops[ti][0], tops[ti][1], pits);
    const r0 = at('r0', f) * KNOB.width, flare = at('flare', f) * KNOB.flare;
    // Roping out, the funnel narrows to a rope about 35 m across.
    const r = r0 + (Math.min(r0, 18) - r0) * clamp(t.rope);
    // The march's column, as wide as the shader's, so the box holds all of it.
    const rTop = r * flare * 1.15;
    // The wind leans the funnel and bows its trunk; gusts swell the bow slowly. Thin funnels bend most.
    const lean = at('lean', f) * KNOB.lean * (0.4 + 0.8 * wind);
    const gust = 0.5 + 0.5 * Math.sin(simT * 0.13 + t.seed * 9) * Math.sin(simT * 0.071 + t.seed * 4);
    const bow = wind * (350 + (50 - 350) * f / 5) * (0.7 + 0.6 * gust) * (1 - clamp(t.rope));
    const Rb = Math.max(r * Math.max(flare * 2, 2.6), (rTop * 1.9 + 20) * 1.3) + lean + bow + at('sway', f) * KNOB.sway * 2 + 140 + 1300 * clamp(t.rope);
    // The horn's top radius and the near deck's reach, in km, as funnel.js finds them.
    const ss = (e0, e1, x) => { const k = clamp((x - e0) / (e1 - e0)); return k * k * (3 - 2 * k); };
    const fs = ss(0, 1, f / 5), wallRad = Math.max((0.9 + 1.5 * fs) * lm, rTop * 1.7);
    const hornA = clamp(rTop * (0.9 - 0.4 * fs) + 20, rTop * 0.25, Math.max(wallRad * 0.85 - rTop, rTop * 0.25));
    const rTopKm = (rTop + hornA) * 0.001, nearR = Math.max(rTopKm * 1.6 + 0.4, 0.9);
    const [tx, tz] = tops[ti];
    const H = deck - 0.3 * lm, nrM = nearR * 1000, topC = deck + 600;
    const nr = [tx * 0.001, tz * 0.001, pits[ti][2], rTopKm];
    // The horn's strength, and the near deck's height over the base in km.
    // Its whirl in the deck grows with F and fades as it ropes out.
    // Its whirl in the deck: only its weight grows as it forms.
    // Its reach and twist stay fixed: a changing mapping swept the deck's texture fast.
    const form = ss(0, 1, t.form), reachF = (1.5 + 3 * f / 5) * KNOB.spR;
    const horn = [ss(0, 0.35, t.cond), t.turn, reachF, (0.5 + 0.5 * f / 5) * form];
    let bx0 = 1, by0 = 1, bx1 = 0, by1 = 0, behind = false;
    // The box on screen holds the funnel's column and the near deck's.
    for (const [ux, uz, R, y0b, y1b] of [[cx, cz, Rb, 0, deck + 60], [tx, tz, nrM, H - 200, topC]]) {
      for (const ox of [-R, R]) for (const oz of [-R, R]) for (const oy of [y0b, y1b]) {
        const z = -(uz + oz);
        if (z < 50) { behind = true; continue; }
        const u = (ux + ox) / z * foc / asp + 0.5, v = (oy - camH) / z * foc + hz;
        bx0 = Math.min(bx0, u); bx1 = Math.max(bx1, u); by0 = Math.min(by0, v); by1 = Math.max(by1, v);
      }
    }
    if (behind) { bx0 = 0; by0 = 0; bx1 = 1; by1 = 1; }
    if (bx1 < 0 || bx0 > 1 || by1 < 0 || by0 > 1 || fade <= 0) continue;
    x0 = Math.min(x0, bx0 * rw); x1 = Math.max(x1, bx1 * rw); y0 = Math.min(y0, by0 * rh); y1 = Math.max(y1, by1 * rh);
    // The cover test reaches as far as the near deck, so it has no edge inside the pass's picture.
    const reach = Math.max(Rb, Math.hypot(tx - cx, tz - cz) + nrM);
    list.push({ t, d: -cz, rb: reach, nr, horn, dep: pits[ti][3], v: [
      [cx, cz, H, deck],
      [r, flare, at('prof', f), at('vmax', f)],
      [t.cond, at('debris', f) * KNOB.debris * t.dust, at('dustH', f) * KNOB.dustH, clamp(at('rain', f) * (1 + 3 * (storm - 0.85)) + 0.6 * Math.max(0, storm - 0.85), 0, 1) * fade],
      [at('dark', f) * KNOB.darkK, lean, at('sway', f) * KNOB.sway, f / 5],
      [t.ds, t.zs, t.rope, t.seed],
      // A heavier storm packs the funnel denser; a young one leaves it thinner.
      [lm, fade, densAt(f) * clamp(1 + 1.5 * (storm - 0.85), 0.6, 1.25), bow],
    ] });
  }
  list.sort((p, q) => p.d - q.d);
  pk.Z.fill(0);
  pk.NR.fill(0);
  pk.H.fill(0);
  list.slice(0, MAX_FUNNELS).forEach(({ t, v, rb, nr, horn, dep }, i) => {
    ['A', 'B', 'C', 'D', 'E', 'F'].forEach((k, j) => pk[k].set(v[j], i * 4));
    pk.ph.set(t.ph, i * 14);
    pk.Z.set([t.seed * 37.1, t.seed * 53.7, KNOB.spTwist, 0.01 + dep], i * 4);
    pk.NR.set(nr, i * 4);
    pk.H.set(horn, i * 4);
  });
  const pad = 3;
  pk.box = [Math.max(0, Math.floor(x0) - pad), Math.max(0, Math.floor(y0) - pad), Math.min(rw, Math.ceil(x1) + pad), Math.min(rh, Math.ceil(y1) + pad)];
  return Math.min(list.length, MAX_FUNNELS);
}
// The far field: past Bake from (farD km) the deck is baked, not marched each frame (the camera is locked off).
// It renews when the light, the base, the storm, the eye or the lens change, in strips over frames.
// The bake's slices: funnel.js discards rows by the same count, 8.
const FAR_STRIPS = 8;
// Dev's Bake from and Deck reach, in km.
let farD = 16, deckReach = 146;
// Dev's Front edge, km ahead of the eye.
let front = -6;
// Dev's God rays: the shafts' strength.
let god = 0.6;
// The beam's hole in world km: centre x, z and radius; radius 0 when the sun is down.
// The hole stands in frame, a fifth of the frame in from the middle on the sun's side.
// It lies past the supercell's shelf, which would block its light: 10 km out at the nearest.
// Its shaft falls from it, away from the sun.
const beam = new Float32Array(3);
function beamSpot() {
  const a = yaw(), sx = sun[0] * Math.cos(a) - sun[2] * Math.sin(a);
  if (sun[1] < 0.01) { beam[2] = 0; return beam; }
  const u = (sx < 0 ? -0.22 : 0.22) * aspect(), foc = focal(), h = Math.hypot(foc, u);
  // The shelf's ellipse in camera km, as stormShapeSun() sizes it.
  const k = storm < 0.85 ? mixN(0.2, 0.91, storm / 0.85) : mixN(0.4, 1, storm);
  let D = 10;
  for (; D < 40; D += 1) {
    const cx = D * u / h, cz = -D * foc / h;
    if (Math.hypot((cx - 1) / (15 * k), (cz + 13) / (9 * k)) > 1 + 3.5 / (9 * k)) break;
  }
  [beam[0], beam[1]] = toWorld(D * u / h, -D * foc / h);
  beam[2] = 2.6;
  return beam;
}
// The share of the plain in sun under the deck, 0 to 1: the cloud's ground bounce.
const plainLit = () => 1 - 0.92 * sstep(0.05, 0.85, storm);
// The green phase (Tom: the scary green comes in before the big dark clouds).
// It grows from Storm 0.3 and sinks into the slate gloom between 0.62 and 0.85.
const greenK = () => sstep(0.3, 0.5, storm) * (1 - sstep(0.62, 0.85, storm));
// The opening build-up: the storm grows from nothing to its set level on a gentle in-out sine ease.
// Touching Storm stops it. Past 0.67 the first tornado touches down on its own.
/** @type {{ t: number, dur: number, to: number, spawned: boolean } | null} */
let build = null;
// Long, soft ends and no fast middle.
const easeSine = x => 0.5 - 0.5 * Math.cos(Math.PI * x);
function bakeFar(u, rw, rh, n) {
  // The key holds the whole projection: a new aspect with the same buffer moves the deck on screen.
  // Storm counts in steps of 0.02: the build-up moves it every frame.
  // During the Rise the eye and the lens leave the key: the far field is read through its own lens.
  const lens = rise.dir ? ['rise'] : [camH, focal(), yaw()];
  const key = [S.hour, sunAz, base, Math.round(storm * 50) / 50, ...lens, horizon(), farD, deckReach, front, rw, rh].map(v => (typeof v === 'string' ? v : +(+v).toFixed(4))).join();
  // A change bakes whole at once, so the far field follows a moving slider with no lag.
  const moved = key !== fun.farKey;
  if (moved) { fun.farKey = key; fun.farRow = 0; fun.farBusy = true; }
  // The build-up moves Storm in small steps: it renews in strips, so no frame stalls on a whole bake.
  const whole = !fun.farReady || fun.farHold || (moved && !build);
  // A running page renews the far field strip by strip, so its breaks drift with the deck.
  if (!fun.farBusy) { if (fun.farHold) return; fun.farRow = 0; fun.farBusy = true; }
  // A bake keeps the lens it started with through all its strips.
  if (fun.farRow === 0) fun.farLens = [focal(), yaw()];
  gl.uniform1f(u.uFoc, fun.farLens[0]);
  gl.uniform1f(u.uYaw, fun.farLens[1]);
  // The bake reads no tornado and no history; its noise keeps the time it was baked at.
  gl.uniform1i(u.uMode, 1);
  gl.uniform1f(u.uFarD, farD);
  gl.uniform1i(u.uN, 0);
  gl.uniform1f(u.uTorOn, 0);
  gl.uniform1f(u.uBlend, 1);
  gl.uniform2f(u.uJit, 0, 0);
  // tFar points away from the target: on unit 0 it could meet farB and make a feedback loop.
  // That loop drops the draw, and the far field came out empty on the first load.
  gl.activeTexture(gl.TEXTURE7); gl.bindTexture(gl.TEXTURE_2D, fun.farA.tex); gl.uniform1i(u.tFar, 7);
  gl.activeTexture(gl.TEXTURE8); gl.bindTexture(gl.TEXTURE_2D, fun.farC.tex); gl.uniform1i(u.tFarPrev, 8);
  gl.bindFramebuffer(gl.FRAMEBUFFER, fun.farB.fb);
  gl.viewport(0, 0, rw, rh);
  // The first bake, or a still page, bakes whole; a running page bakes one slice a frame.
  // A slice is every eighth row, not a band: a band across the horizon cost far more and hitched.
  if (whole) { gl.uniform1i(u.uSlice, -1); gl.drawArrays(gl.TRIANGLES, 0, 3); fun.farRow = FAR_STRIPS; }
  else { gl.uniform1i(u.uSlice, fun.farRow); gl.drawArrays(gl.TRIANGLES, 0, 3); fun.farRow++; }
  // A finished bake fades in over the last one: no step shows, during the build-up or a drag.
  if (fun.farRow >= FAR_STRIPS) {
    [fun.farC, fun.farA, fun.farB] = [fun.farA, fun.farB, fun.farC];
    // Each picture keeps the lens it was baked through: the live read reprojects by it.
    [fun.farFocC, fun.farFocA] = [fun.farFocA ?? fun.farLens[0], fun.farLens[0]];
    fun.farT = performance.now(); fun.farDur = !fun.farReady ? 0 : build ? 2500 : rise.dir ? 400 : 250;
    fun.farBusy = false; fun.farReady = true;
  }
  // The live draw that follows takes these back.
  gl.uniform1f(u.uFoc, focal());
  gl.uniform1f(u.uYaw, yaw());
  gl.uniform1i(u.uN, n);
  gl.uniform1f(u.uTorOn, n ? 1 : 0);
}
// Draws every tornado into the funnel target. The runner calls it before its passes.
function funnelPass(w, h) {
  fun.on = false;
  if (!fun.prog || !visible) return;
  fun.noise ||= noiseVolume(gl);
  const rw = Math.max(32, Math.round(w * FUN_RES)), rh = Math.max(32, Math.round(h * FUN_RES));
  if (rw !== fun.w || rh !== fun.h) {
    for (const k of ['A', 'B', 'farA', 'farB', 'farC']) free(gl, fun[k]);
    fun.A = glTarget(gl, rw, rh, { clear: true }); fun.B = glTarget(gl, rw, rh, { clear: true });
    fun.farA = glTarget(gl, rw, rh, { clear: true }); fun.farB = glTarget(gl, rw, rh, { clear: true }); fun.farC = glTarget(gl, rw, rh, { clear: true });
    fun.w = rw; fun.h = rh; fun.fresh = true; fun.farKey = '';
  }
  const n = fun.n = packFunnels(rw, rh);
  // The history blend runs only while the loop runs; a still frame draws whole.
  const hist = !fun.fresh && performance.now() - fun.loopT < 150;
  // A still page bakes the far field whole, at once.
  fun.farHold = !hist;
  const P = fun.prog, u = P.u;
  gl.useProgram(P.p);
  gl.bindFramebuffer(gl.FRAMEBUFFER, fun.B.fb);
  gl.viewport(0, 0, rw, rh);
  gl.disable(gl.BLEND);
  gl.disable(gl.SCISSOR_TEST);
  // Units 0 to 4 belong to the runner; the pass uses 5 and 6.
  gl.activeTexture(gl.TEXTURE5); gl.bindTexture(gl.TEXTURE_2D, fun.A.tex); gl.uniform1i(u.tPrev, 5);
  gl.activeTexture(gl.TEXTURE6); gl.bindTexture(gl.TEXTURE_3D, fun.noise); gl.uniform1i(u.tNoise, 6);
  const sk = skyAt(S.hour);
  gl.uniform2f(u.uRes, rw, rh);
  const fr = fun.frame++;
  gl.uniform1f(u.uTrans, KNOB.trans); gl.uniform1f(u.uRim, KNOB.rim);
  gl.uniform1f(u.uWid, KNOB.width); gl.uniform1f(u.uGap, KNOB.gap); gl.uniform1f(u.uSheathK, KNOB.sheath); gl.uniform1f(u.uEdgeW, KNOB.edge); gl.uniform1f(u.uAmp, KNOB.amp);
  gl.uniform1f(u.uAlb, KNOB.alb); gl.uniform1f(u.uSunK, KNOB.sunK); gl.uniform1f(u.uAmbK, KNOB.ambK);
  gl.uniform1f(u.uHazeK, KNOB.hazeK); gl.uniform1f(u.uTopDark, KNOB.topK); gl.uniform1f(u.uDustK, KNOB.dustK);
  gl.uniform1f(u.uSpIn, KNOB.spIn);
  if (P === fun.progs.tube) { gl.uniform1f(u.uTbBands, KNOB.tbBands); gl.uniform1f(u.uTbCount, KNOB.tbCount); gl.uniform1f(u.uTbStretch, KNOB.tbStretch); }
  gl.uniform3fv(u.uSun, sun); gl.uniform3fv(u.uSunCol, sunCol); gl.uniform3fv(u.uAmb, amb);
  gl.uniform3fv(u.uZen, sk.zen); gl.uniform3fv(u.uMid, sk.mid); gl.uniform3fv(u.uBand, sk.band); gl.uniform3fv(u.uAnti, sk.anti);
  gl.uniform1f(u.uFoc, focal()); gl.uniform1f(u.uHz, horizon()); gl.uniform1f(u.uYaw, yaw()); gl.uniform1f(u.uStorm, storm); gl.uniform1f(u.uT, simT);
  gl.uniform1i(u.uN, n);
  gl.uniform1f(u.uBase, baseNow());
  gl.uniform1f(u.uReach, deckReach);
  gl.uniform1f(u.uFront, front);
  gl.uniform1f(u.uGod, god);
  gl.uniform1f(u.uPlainLit, plainLit());
  gl.uniform1f(u.uGreen, greenK());
  gl.uniform3fv(u.uBoltT, bolt.top);
  gl.uniform4fv(u.uBolt, bolt.u);
  gl.uniform3fv(u.uBeam, beamSpot());
  gl.uniform2f(u.uWDir, windDir[0], windDir[1]);
  gl.uniform1f(u.uCamH, camH);
  gl.uniform2f(u.uWindC, windC[0], windC[1]);
  gl.uniform1f(u.uWind, wind);
  for (const k of ['A', 'B', 'C', 'D', 'E', 'F']) gl.uniform4fv(u['uT' + k], pk[k]);
  gl.uniform2fv(u.uPhs, pk.ph);
  // The storm GLSL reads every tornado too: the horns' calm and shade.
  gl.uniform1f(u.uTorOn, n ? 1 : 0); gl.uniform4fv(u.uTorZ, pk.Z); gl.uniform4fv(u.uTorN, pk.NR); gl.uniform4fv(u.uTorH, pk.H);
  gl.bindVertexArray(null);
  bakeFar(u, rw, rh, n);
  gl.uniform1i(u.uMode, 0);
  gl.uniform1f(u.uFarD, farD);
  gl.activeTexture(gl.TEXTURE7); gl.bindTexture(gl.TEXTURE_2D, fun.farA.tex); gl.uniform1i(u.tFar, 7);
  gl.activeTexture(gl.TEXTURE8); gl.bindTexture(gl.TEXTURE_2D, fun.farC.tex); gl.uniform1i(u.tFarPrev, 8);
  gl.uniform1f(u.uFarK, fun.farDur > 0 ? clamp((performance.now() - fun.farT) / fun.farDur) : 1);
  gl.uniform2f(u.uFarFoc, fun.farFocA ?? focal(), fun.farFocC ?? fun.farFocA ?? focal());
  // A running page blends each frame into a long history: the march's grain averages out.
  // A still frame has no history: it averages four jittered draws of its own.
  const subs = hist ? 1 : 4;
  for (let k = 0; k < subs; k++) {
    if (k) { [fun.A, fun.B] = [fun.B, fun.A]; gl.activeTexture(gl.TEXTURE5); gl.bindTexture(gl.TEXTURE_2D, fun.A.tex); }
    const j = hist ? fr : k, on = hist || k > 0;
    gl.uniform2f(u.uJit, on ? ((j * 0.618) % 1) - 0.5 : 0, on ? ((j * 0.382) % 1) - 0.5 : 0);
    gl.uniform1f(u.uBlend, hist ? 0.35 : 1 / (k + 1));
    gl.bindFramebuffer(gl.FRAMEBUFFER, fun.B.fb);
    gl.viewport(0, 0, rw, rh);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  // The runner wants the context in its default state.
  gl.bindTexture(gl.TEXTURE_3D, null);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  [fun.A, fun.B] = [fun.B, fun.A];
  fun.on = true;
  fun.fresh = false;
}

// One tornado's life: dust spins up, the funnel lowers, it travels, then ropes out.
function live(t, dt) {
  t.age += dt;
  // A new F level eases in over several seconds.
  t.f += (t.fT - t.f) * (1 - Math.exp(-dt / 5));
  // Each layer's spin and climb integrate here, so a new F only changes speed.
  const sp = spinLayers(t.ph, dt, t.f);
  t.zs = sp.zs; t.ds = sp.ds;
  // Its whirl in the deck turns faster as it forms, and with F; the angle sums here, so it never jumps.
  t.turn = (t.turn + 0.08 * KNOB.spTurn * (0.25 + (0.75 + 0.5 * t.f / 5) * t.form) * dt) % (Math.PI * 200);
  if (!t.roping) {
    // Touchdown takes about 38 s, in three slow stages.
    // The whirl gathers in the deck over 20 s.
    t.form = Math.min(1, t.form + dt / 20);
    // From 15 s the pit and the horn lower, over 10 s.
    if (t.form > 0.75) t.low = Math.min(1, t.low + dt / 10);
    // From 23 s the funnel descends, over 12 s.
    if (t.low > 0.85) t.desc = Math.min(1, t.desc + dt / 12);
    // The dust spins up on the ground just before the funnel meets it.
    if (t.desc > 0.7) t.dust = Math.min(1, t.dust + dt / 4);
    if (t.age > t.life) t.roping = true;
  } else {
    // The rope bends out over 14 s, then breaks up and fades over 7 s.
    t.rope = Math.min(2, t.rope + dt / (t.rope < 1 ? 14 : 7));
    t.dust = Math.max(0, t.dust - dt / 6);
    // The funnel lifts as it fades; then the pit rises and the whirl unwinds.
    if (t.rope > 0.6) t.desc = Math.max(0, t.desc - dt / 12);
    if (t.rope > 1.2) t.low = Math.max(0, t.low - dt / 10);
    if (t.rope > 1.4) t.form = Math.max(0, t.form - dt / 15);
  }
  // The condensation reaches down as the descent goes; a new F moves its reach.
  t.cond = clamp(at('cond', t.f) + KNOB.reach) * sstep(0, 1, t.desc);
  if (t !== drag) {
    const v = fAt(F_SPEED, t.f) * (1 - 0.6 * clamp(t.rope));
    t.x += windDir[0] * v * dt; t.z += windDir[1] * v * dt;
  }
  keepOff(t);
}
// A tornado comes no nearer than its dust's reach plus a margin, and never under the eye.
const nearMin = t => Math.max(1000, 2.2 * at('r0', t.f) * KNOB.width + 300);
function keepOff(t) {
  const d = Math.hypot(t.x, t.z), m = nearMin(t);
  if (d < m) { t.x *= m / Math.max(d, 1); t.z *= m / Math.max(d, 1); }
}
// The frame loop: tornadoes live; with none left, 60 s with no input puts the scene to sleep.
// The Rise moves the eye and the lens; reduced motion jumps to the end.
// Lightning far off: rare bursts 15 to 50 km out, every 8 to 30 s, never near the eye.
// Most strike the ground; some flash inside the cloud. A burst is two or three strokes over 0.4 s.
const bolt = { next: 8 + 14 * Math.random(), t0: -9, strokes: [], top: new Float32Array(3), foot: new Float32Array(3), u: new Float32Array(4) };
function boltStep() {
  if (reduced()) { bolt.u[0] = 0; return; }
  if (simT >= bolt.next && storm > 0.5) {
    bolt.next = simT + 8 + 22 * Math.random();
    bolt.t0 = simT;
    // Somewhere in the view's width, a little past either edge.
    const D = 15 + 35 * Math.random(), a = (Math.random() - 0.5) * 2 * Math.atan(0.6 * aspect() / focal());
    const cx = Math.sin(a) * D, cz = -Math.cos(a) * D, B = baseNow();
    const lean = (Math.random() - 0.5) * 0.25 * D * 0.1;
    bolt.top.set([cx, B * 0.95, cz]);
    bolt.foot.set([cx + lean, 0, cz]);
    bolt.u[1] = Math.random() * 10;
    bolt.u[2] = Math.random() < 0.7 ? 1 : 0;
    bolt.u[3] = 0.6 + 0.8 * Math.random();
    // The strokes: times and strengths, the first the brightest.
    const n = 2 + (Math.random() < 0.5 ? 1 : 0);
    bolt.strokes = Array.from({ length: n }, (_, i) => [i ? 0.08 + i * 0.13 + 0.05 * Math.random() : 0, i ? 0.4 + 0.5 * Math.random() : 1]);
  }
  // Each stroke snaps on, then dies in a tenth of a second with a flicker.
  const age = simT - bolt.t0;
  let k = 0;
  for (const [t, L] of bolt.strokes) { const x = age - t; if (x >= 0) k = Math.max(k, L * Math.exp(-x / 0.06) * (0.8 + 0.2 * Math.sin(x * 150))); }
  bolt.u[0] = k > 0.01 ? k * Math.min(1, (storm - 0.5) * 4) : 0;
}
function riseStep(dt) {
  if (!rise.dir) return;
  if (rise.dir > 0 && rise.u >= 1) {
    // At the top it holds 4 s, then eases back.
    rise.hold += dt;
    if (rise.hold > 4) rise.dir = -1;
  } else rise.u = clamp(rise.u + rise.dir * (reduced() ? 1 : dt / rise.dur));
  if (rise.dir < 0 && rise.u <= 0) rise.dir = 0;
  camH = eyeSet + (rise.top - eyeSet) * easeRise(rise.u);
}
function step(dt) {
  simT += dt;
  riseStep(dt);
  boltStep();
  for (const t of tors) live(t, dt);
  lineStep(line, tors, dt, simT, wind, storm);
  damageStep(dmg, tors, simT);
  farmStep(farmS, dmg, simT);
  infraStep(inf, dmg, tors, dt, simT, traf);
  lineUniforms(line, tors);
  trafficStep(traf, tors, simT, dt, line);
  // A tornado leaves once its funnel has faded and its whirl has unwound.
  for (let i = tors.length - 1; i >= 0; i--) if (tors[i].rope >= 2 && tors[i].form <= 0) tors.splice(i, 1);
  // A tornado that leaves frees a place: + Tornado and the click come back.
  capUI();
  if (build) {
    build.t += dt;
    // The scene opens in sun: the storm waits 7 s, then builds.
    const k = clamp((build.t - 7) / build.dur);
    storm = build.to * easeSine(k);
    ui.slider?.set(+storm.toFixed(2));
    if (!build.spawned && (storm >= Math.min(0.67, build.to) || k >= 1)) { build.spawned = true; if (!tors.length) heroDown(); }
    if (k >= 1) build = null;
  }
  if (!asleep && !build && !rise.dir && !tors.length && !trafficBusy(traf) && performance.now() - lastInput > 60000) { asleep = true; env.paused = true; }
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
  // Funnels stay in the live march: 1.2 km out at the nearest, up to the bake's crossover at the most.
  const far = Math.max(5000, (farD - 0.125 * farD) * 1000 - 500);
  const dist = sy < -1e-4 ? clamp(camH * Math.hypot(foc, sx) / -sy, 1200, far) : far;
  const [x, z] = toWorld(dist * sx / Math.hypot(foc, sx), -dist * foc / Math.hypot(foc, sx));
  return { x, z };
}
// The first tornado: on the left golden line, 6.5 km out, at a strong angle to the eye.
function heroDown() {
  const sx = (0.355 - 0.5) * aspect(), foc = focal(), h = Math.hypot(foc, sx);
  const [x, z] = toWorld(6500 * sx / h, -6500 * foc / h);
  touchDown(x, z);
}
// At four tornadoes a spawn does nothing: none ropes out or leaves to make room (Tom).
// A roping tornado counts until it leaves.
const full = () => tors.length >= MAX_TOR;
// Quiet feedback at the cap: + Tornado greys out, and a click on open ground shows not-allowed.
function capUI() {
  const a = ui.action?.('add');
  if (a && a.disabled !== full()) a.disabled = full();
  const c = full() && !hover && !drag ? 'not-allowed' : '';
  if (canvas.style.cursor !== c) canvas.style.cursor = c;
}
function touchDown(x, z) {
  if (full()) return;
  const still = reduced();
  tors.push({ x, z, f: fLevel, fT: fLevel, cond: still ? at('cond', fLevel) : 0, dust: still ? 1 : 0, form: still ? 1 : 0, low: still ? 1 : 0, desc: still ? 1 : 0, turn: 0, rope: 0, roping: false, age: 0, life: F_LIFE[Math.round(fLevel)] * (0.85 + 0.3 * Math.random()), seed: Math.random(), ph: new Float32Array(14), zs: 28, ds: 20 });
  capUI();
  wake();
}
// The tornado nearest a screen point, if the point is near enough.
function tornadoAt(clientX, clientY) {
  const g = groundAt(clientX, clientY);
  let best = null, bd = Infinity;
  for (const t of tors) {
    const d = Math.hypot(t.x - g.x, t.z - g.z);
    if (d < bd && d < Math.max(1200, at('r0', t.fT) * KNOB.width * 3.2, Math.hypot(t.x, t.z) * 0.09)) { bd = d; best = t; }
  }
  return best;
}
function ropeOut(t) { if (t && !t.roping) { t.roping = true; if (reduced()) { t.rope = 2; t.desc = 0; t.low = 0; t.form = 0; } wake(); } }
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
  capUI();
  if (!drag) return;
  const g = groundAt(e.clientX, e.clientY);
  drag.x = g.x; drag.z = g.z;
  keepOff(drag);
  wake();
});
const endDrag = () => { drag = null; capUI(); };
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
  if (e.key === 'v' || e.key === 'V') { act.vehicles(); return; }
  if (e.target !== stage || (e.key !== ' ' && e.key !== 'Enter')) return;
  e.preventDefault();
  act.add();
});
act.vehicles = () => { trafficRun(traf, simT); wake(); };

act.f = v => {
  fLevel = +v.slice(1);
  // The stepper sets the next touchdown, and the newest live tornado too.
  setF(target(), fLevel);
  wake();
};
act.add = () => {
  // A new funnel drops under the wall cloud, a little off from the last one.
  const n = tors.length;
  const [x, z] = toWorld(-900 + (n % 2 ? 1 : -1) * 900 * Math.ceil(n / 2) + (Math.random() - 0.5) * 300, -8000 + (Math.random() - 0.5) * 1500);
  touchDown(x, z);
};
// Clear ropes every tornado out; a second Clear takes them away at once.
act.clear = () => {
  if (tors.some(t => !t.roping)) tors.forEach(t => ropeOut(t));
  // The second Clear mends the power line and every damaged thing too.
  else { tors.length = 0; lineReset(line); damageReset(dmg); infraReset(inf); }
  wake();
};
act.storm = v => { storm = v; build = null; wake(); };
act.buildUp = v => { if (build) build.dur = clamp(+v || 45, 10, 600); };
// The Time choice sets the hour and moves Dev's Time of day to it; Dev's slider then fine-tunes it.
act.time = v => { act.tod(HOURS[v] ?? HOURS.golden); ui.setting('tod')?.set(S.hour); };
act.tod = v => { S.hour = clamp(+v || HOURS.golden, 14, 21); setSun(S.hour); wake(); };
act.lens = v => { lensMM = +v || 28; wake(); };
// Each curve's own gain sets the scene's level; Exposure trims both.
const TONE_GAIN = { film: 1, aces: 1.1 };
let expoTrim = 1;
act.expo = v => { expoTrim = +v || 1; S.expo = expoTrim * TONE_GAIN[S.tone] * LOOK_NOW.expoK; wake(); };
act.tone = v => { S.tone = v === 'film' ? 'film' : 'aces'; act.expo(expoTrim); };
// Each Window row and the runner value it sets. The scene draws the rain itself.
const LOOK = { glass: 'glass', wet: 'wet', fog: 'fog', bokeh: 'defocus', grain: 'grain' };
act.look = (id, v) => {
  if (id === 'glass') S.on.glass = v === true || v === '1' || v === 1;
  else if (id === 'rain') rain = clamp(+v || 0);
  else if (id === 'nearBlur') nearBlur = clamp(+v || 0, 0, 0.04);
  else S[LOOK[id]] = +v || 0;
  // The fog patches follow the fog.
  S.patch = S.fog;
  // The runner lights the pane's drops by its daylight, and only with its sky on.
  // The scene draws its own sky and does not read that switch.
  S.on.sky = S.on.glass;
  wake();
};
act.base = v => { base = clamp(+v || 1.35, 0.8, 3); wake(); };
act.bakeFrom = v => { farD = clamp(+v || 16, 6, 40); wake(); };
act.god = v => { god = clamp(+v, 0, 1); wake(); };
act.deckReach = v => { deckReach = clamp(+v || 146, 20, 200); wake(); };
act.front = v => { front = clamp(Number.isFinite(+v) ? +v : -6, -6, 15); wake(); };
act.eye = v => { eyeSet = clamp(+v || 8, 1, 40); camH = eyeSet + (rise.top - eyeSet) * easeRise(rise.u); wake(); };
// A press starts the Rise, or turns it back at any point.
act.rise = () => { rise.dir = rise.dir > 0 || (rise.dir === 0 && rise.u >= 1) ? -1 : 1; rise.hold = 0; wake(); };
act.riseDur = v => { rise.dur = clamp(+v || 15, 6, 30); };
act.riseTop = v => { rise.top = clamp(+v || 35, 10, 80); act.eye(eyeSet); };
act.knob = (id, v) => { KNOB[id] = +v; wake(); };
// Copy JSON: every knob, to paste back as defaults.
act.knobCopy = async () => {
  const text = JSON.stringify(KNOB, null, 2);
  try { await navigator.clipboard.writeText(text); } catch { console.log(text); }
};
act.knobReset = () => { for (const [, id, , , , , value] of KNOBS) ui.setting('k_' + id)?.set(value, true); };
act.wind = v => { wind = clamp(+v); S.wind = wind * 12; wake(); };
act.windDir = v => { const a = (+v || 0) * Math.PI / 180; windDir[0] = Math.cos(a); windDir[1] = Math.sin(a); wake(); };
act.sunAz = v => { sunAz = v * Math.PI / 180; setSun(S.hour); wake(); };

/* ---------- start ---------- */
// QA: ?lens=85 picks the lens for one load.
const qs0 = new URLSearchParams(location.search);
storm = ui.slider?.value ?? storm;
// QA: ?time=golden picks the time for one load; Settings keep Tom's choice.
// The hour: ?tod for one load, else Dev's saved Time of day, else the Time choice's hour.
let savedTod = null;
try { savedTod = localStorage.getItem('stimming.tornado.tod'); } catch { /* no storage */ }
if (qs0.has('tod')) act.tod(+qs0.get('tod'));
else if (qs0.has('time')) act.tod(HOURS[qs0.get('time')] ?? HOURS.golden);
else if (savedTod !== null) act.tod(+savedTod);
else act.tod(HOURS[ui.setting('time')?.value] ?? HOURS.golden);
lensMM = +(qs0.get('lens') || ui.setting('lensWide')?.value || 28);
// QA: ?look=photoreal picks the Look for one load.
act.preset(qs0.get('look') || ui.setting('preset')?.value || 'stimming', !qs0.has('look'));
// QA: ?tone=film picks the curve for one load.
act.tone(qs0.get('tone') || ui.setting('tone')?.value || 'aces');
act.expo(ui.setting('expo')?.value ?? 1);
// QA: ?glass=1&wet=0.6&fog=0.2&bokeh=0.1&rain=0.5&grain=0.05 set the Window rows for one load.
for (const id of [...Object.keys(LOOK), 'rain', 'nearBlur']) act.look(id, qs0.has(id) ? qs0.get(id) : ui.setting(id)?.value ?? S[LOOK[id]] ?? 0);
// Each knob: the address for one load, else Dev's saved value, else its default.
for (const [, id, , , , , value] of KNOBS) KNOB[id] = qs0.has(id) ? +qs0.get(id) : +(ui.setting('k_' + id)?.value ?? value);
// QA: ?wind=0.5 and ?winddir=19 set the wind for one load.
act.wind(qs0.has('wind') ? +qs0.get('wind') : ui.setting('wind')?.value ?? 0.85);
act.windDir(qs0.has('winddir') ? +qs0.get('winddir') : ui.setting('windDir')?.value ?? 19);
// QA: ?eye=20 sets the eye's height for one load.
act.eye(qs0.has('eye') ? +qs0.get('eye') : ui.setting('eye')?.value ?? 8);
// QA: ?base=2 sets the cloud base for one load.
act.base(qs0.has('base') ? +qs0.get('base') : ui.setting('base')?.value ?? 1.35);
// ?bakefrom=30 and ?deckreach=60 set them for one load.
act.bakeFrom(qs0.has('bakefrom') ? +qs0.get('bakefrom') : ui.setting('bakeFrom')?.value ?? 16);
act.god(qs0.has('god') ? +qs0.get('god') : ui.setting('god')?.value ?? 0.6);
act.deckReach(qs0.has('deckreach') ? +qs0.get('deckreach') : ui.setting('deckReach')?.value ?? 146);
// QA: ?front=4 puts the deck's front edge 4 km ahead for one load.
act.front(qs0.has('front') ? +qs0.get('front') : ui.setting('front')?.value ?? -6);
// QA: ?storm=0.2 sets the storm for one load.
if (qs0.has('storm')) act.storm(clamp(+qs0.get('storm'), 0, 1));
// QA: ?sunaz=20 sets the sun's bearing for one load.
act.sunAz(qs0.has('sunaz') ? +qs0.get('sunaz') : ui.setting('sunAz')?.value ?? 20);
// QA can start with funnels down: ?tor=F3,F5 places them under the wall cloud.
const qs = new URLSearchParams(location.search);
if (qs.has('tor')) for (const f of qs.get('tor').split(',')) { fLevel = clamp(parseFloat(f.replace(/[^\d.]/g, '')) || 0, 0, 5); act.add(); }
// QA: ?near=8 puts the newest tornado 8 km out; ?age=20 runs every tornado 20 s on.
if (qs.has('near') && tors.length) { const [x, z] = toWorld(-900, -1000 * +qs.get('near')); Object.assign(tors[tors.length - 1], { x, z }); }
// QA: ?line=1.6 puts the newest tornado 1.6 km out, left of the power line, drifting into it.
if (qs.has('line') && tors.length) Object.assign(tors[tors.length - 1], { x: -400, z: -1000 * +qs.get('line') });
const qaRun = sec => { for (let k = 0, n = sec * 20; k < n; k++) { simT += 0.05; tors.forEach(t => live(t, 0.05)); lineStep(line, tors, 0.05, simT, wind, storm); damageStep(dmg, tors, simT); farmStep(farmS, dmg, simT); infraStep(inf, dmg, tors, 0.05, simT, traf); } };
if (qs.has('age')) qaRun(+qs.get('age'));
// QA: ?rope=6 starts the rope-out, then runs 6 s on.
if (qs.has('rope')) { tors.forEach(t => { t.roping = true; }); qaRun(+qs.get('rope')); }
// The opening build-up, unless QA set the storm or placed funnels. ?buildup=0 starts at full.
// Reduced motion starts at full storm with the first tornado formed.
{
  try { ['buildUp', 'buildUpS', 'buildUpT'].forEach(k => localStorage.removeItem('stimming.tornado.' + k)); } catch { /* no storage */ }
  const bu = qs.has('buildup') ? +qs.get('buildup') : +(ui.setting('buildUpU')?.value ?? 45);
  if (!qs.has('tor') && !qs.has('storm')) {
    if (reduced() || !(bu > 0)) heroDown();
    else { build = { t: 0, dur: clamp(bu, 10, 600), to: storm, spawned: false }; storm = 0; ui.slider?.set(0); }
  }
}
// QA: GPU time per frame, or of the funnel pass alone, from timer queries.
// The frame holds px pixels at the canvas's own shape, so runs compare at one size.
async function gpuTime(n = 20, part = 'frame', px = 1.8e6) {
  const k = Math.sqrt(px / (canvas.clientWidth * canvas.clientHeight));
  const fw = Math.round(canvas.clientWidth * k), fh = Math.round(canvas.clientHeight * k);
  // The loop stops while the queries run, so no other frame shares the GPU.
  qaHold = true;
  await new Promise(r => setTimeout(r, 100));
  // One frame first: the funnel targets take this size before the timing.
  if (part === 'pass') funnelPass(fw, fh); else env.draw(fw, fh);
  const ext = gl.getExtension('EXT_disjoint_timer_query_webgl2');
  if (!ext) return null;
  const list = [];
  for (let i = 0; i < n; i++) {
    const q = gl.createQuery();
    // Each timed frame counts as a running one: one draw with history, not a still's four.
    fun.loopT = performance.now();
    gl.beginQuery(ext.TIME_ELAPSED_EXT, q);
    if (part === 'pass') funnelPass(fw, fh); else env.draw(fw, fh);
    gl.endQuery(ext.TIME_ELAPSED_EXT);
    gl.flush();
    list.push(q);
    await new Promise(r => setTimeout(r, 20));
  }
  // A hidden pane can leave queries pending: wait for each, and drop the ones that never land.
  const avail = q => gl.getQueryParameter(q, gl.QUERY_RESULT_AVAILABLE);
  for (let k = 0; k < 300 && !list.every(avail); k++) await new Promise(r => setTimeout(r, 20));
  qaHold = false;
  env.touch();
  if (gl.getParameter(ext.GPU_DISJOINT_EXT)) return 'disjoint';
  const ms = list.filter(avail).map(q => gl.getQueryParameter(q, gl.QUERY_RESULT) / 1e6).filter(v => v > 0).sort((p, q) => p - q);
  list.forEach(q => gl.deleteQuery(q));
  if (!ms.length) return 'no results';
  n = ms.length;
  return { n, median: +ms[n >> 1].toFixed(2), min: +ms[0].toFixed(2), max: +ms[n - 1].toFixed(2), size: [fw, fh, fun.w, fun.h] };
}
// QA: the same timing by the wall clock, each frame waited out with a pixel read.
// It counts the CPU's share too; timer queries can stall in a hidden pane.
async function syncTime(n = 20, part = 'frame', px = 1.8e6) {
  const k = Math.sqrt(px / (canvas.clientWidth * canvas.clientHeight));
  const fw = Math.round(canvas.clientWidth * k), fh = Math.round(canvas.clientHeight * k);
  qaHold = true;
  await new Promise(r => setTimeout(r, 100));
  // The pass is read back from its own target: the read waits for it to finish.
  const pix = new Float32Array(4), run = () => {
    if (part === 'pass') funnelPass(fw, fh); else env.draw(fw, fh);
    gl.bindFramebuffer(gl.FRAMEBUFFER, fun.A.fb);
    gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.FLOAT, pix);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  };
  run();
  const ms = [];
  for (let i = 0; i < n; i++) { const t0 = performance.now(); run(); ms.push(performance.now() - t0); }
  qaHold = false;
  env.touch();
  ms.sort((p, q) => p - q);
  return { median: +ms[n >> 1].toFixed(2), min: +ms[0].toFixed(2), size: [fw, fh, fun.w, fun.h] };
}
if (qs.has('qa')) window.__qa = { bolt, preset: act.preset, traf, trafficRun, line, lineReset, dmg, farmS, inf, hold: v => { qaHold = !!v; }, syncTime, tors, live, ropeOut, setF, step, gpuTime, fun, env, canvas, funnel: act.funnel, pass: funnelPass };
lastInput = performance.now();
env.draw();
canvas.classList.add('on');
mark('first-frame');
// A hidden tab stops the loop and the clock.
whenVisible(stage, v => { visible = v; if (v) env.touch(); });
