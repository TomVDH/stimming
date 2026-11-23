// Load order: world/laser runs first.
import '../world/laser.ts';
import {
  AdditiveBlending, BufferAttribute, BufferGeometry, Color, DoubleSide, InstancedBufferAttribute, InstancedBufferGeometry,
  Matrix4, Mesh, Points, ShaderMaterial, Vector2, Vector4,
} from 'three';
import { disposeTree, onLeave, scene, starFile } from '../setup.ts';
import { dirAltAz, lst, shellDir, skyRows, turn, type AltAz } from '../core/sky.ts';
import type { Star } from '../core/catalog.ts';

/* ---------- tonight's real sky: the catalog stars at the site, by sidereal time ---------- */
// The site: 51 N, 0 E at first.
// A named site moves the latitude; the hill stays.
export let LAT = 51;
export const LON = 0;
// Sets the site's latitude and turns the sky at the last sky time.
export function setLat(deg: number): void {
  LAT = deg;
  skyAt(lastMs);
}
// The star shell stays inside the camera far plane.
const RADIUS = 4000;
// A star fades in over this many magnitudes past the limit.
const FADE_MAG = 0.75;

// The star group's matrix for a sky time.
// The maths is skyRows in core/sky.ts.
// One matrix per redraw turns the whole sky.
// The CPU does no work per star.
function skyMatrix(ms: number, out = new Matrix4()): Matrix4 {
  const r = skyRows(lst(ms, LON), LAT);
  return out.set(
    r[0], r[1], r[2], 0,
    r[3], r[4], r[5], 0,
    r[6], r[7], r[8], 0,
    0, 0, 0, 1,
  );
}

// Blackbody tint from the colour index B-V.
// It uses the Ballesteros temperature and the Helland fit.
// An unknown index gives white.
function tint(ci: number, out: Color): Color {
  if (Number.isNaN(ci)) return out.setRGB(1, 1, 1);
  const bv = Math.max(-0.4, Math.min(2, ci));
  const t = (4600 * (1 / (0.92 * bv + 1.7) + 1 / (0.92 * bv + 0.62))) / 100;
  const r = t <= 66 ? 255 : 329.698727446 * Math.pow(t - 60, -0.1332047592);
  const g = t <= 66 ? 99.4708025861 * Math.log(t) - 161.1195681661 : 288.1221695283 * Math.pow(t - 60, -0.0755148492);
  const b = t >= 66 ? 255 : t <= 19 ? 0 : 138.5177312231 * Math.log(t - 10) - 305.0447927307;
  const c = (v: number) => Math.max(0, Math.min(255, v)) / 255;
  return out.setRGB(c(r), c(g), c(b));
}

const vert = /* glsl */ `
  attribute vec3 tint;
  attribute vec3 look; // x: size in CSS px, y: brightness, z: magnitude
  uniform float uDpr, uMagLim;
  // x: the size's lift, y: the brightness's lift.
  uniform vec2 uLift;
  varying vec3 vColor;
  varying float vUp;
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    // The shell's centre is the origin, near the camera.
    // So world.y under 0 is below the horizon.
    vUp = world.y;
    // Low stars shine through more air: 0.3 magnitudes per airmass.
    float airmass = 1.0 / max(world.y / ${RADIUS.toFixed(1)}, 0.03);
    vColor = tint * look.y * pow(10.0, -0.12 * (airmass - 1.0));
    // At dusk a star fades in as the limit passes its magnitude.
    // A star at the limit or brighter shows in full.
    vColor *= clamp(1.0 + (uMagLim - look.z) / ${FADE_MAG.toFixed(2)}, 0.0, 1.0);
    vColor *= uLift.y;
    gl_PointSize = look.x * uDpr * uLift.x;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;
const frag = /* glsl */ `
  varying vec3 vColor;
  varying float vUp;
  void main() {
    if (vUp < 0.0) discard;
    // A soft round dot.
    float d = length(gl_PointCoord - 0.5) * 2.0;
    float a = clamp(1.0 - d, 0.0, 1.0);
    gl_FragColor = vec4(vColor * a, 1.0);
  }
`;

/* ---------- the opening: each star as a streak along its turn ---------- */
// The idea comes from railgun/src/sky/k2-sky.glsl, the Time drag.
// Each star is one quad on screen, from its tail to its head.
// The head is the star now.
// The tail is the star uTurn ago, turned back about the pole.
// A few degrees of arc are near straight on screen.
// So one quad follows the arc.
// At night the Points draw instead, so the night frame is unchanged.

// A streak's radius stays in this range, in CSS px.
// A faint streak widens, so it does not shimmer.
// A bright streak narrows, so its light holds together.
const MIN_R = 0.9, MAX_R = 1.3;
// The tail's light, as a share of the head's.
const TAIL = 0.3;
// The head keeps this share of the light as the star's own dot.
// So each streak reads as a star that moves.
const HEAD = 0.3;
// A streak's total light is the dot's light times up to 1 + GAIN.
const GAIN = 3;
// The gain is full from a streak this long, in degrees.
const GAIN_DEG = 1;

const streakVert = /* glsl */ `
  attribute vec3 star;
  attribute vec3 tint;
  attribute vec3 look; // as in the Points
  uniform float uDpr, uMagLim, uTurn, uGain;
  // Half the viewport, in device px.
  uniform vec2 uHalf;
  varying vec3 vColor, vHead;
  // Device px: x along the streak from the tail, y across.
  varying vec2 vQ;
  varying float vLen, vR, vDot, vTail, vUp;
  void main() {
    // The shell's z axis is the pole.
    float c = cos(uTurn), s = sin(uTurn);
    vec3 back = vec3(c * star.x + s * star.y, c * star.y - s * star.x, star.z);
    vec4 w1 = modelMatrix * vec4(star, 1.0), w0 = modelMatrix * vec4(back, 1.0);
    vec4 c1 = projectionMatrix * viewMatrix * w1, c0 = projectionMatrix * viewMatrix * w0;
    // A star behind the eye draws nothing.
    if (c1.w <= 0.0 || c0.w <= 0.0) { gl_Position = vec4(0.0, 0.0, 2.0, 1.0); return; }
    // The colour, the air and the dusk fade are as in the Points.
    float airmass = 1.0 / max(w1.y / ${RADIUS.toFixed(1)}, 0.03);
    vec3 col = tint * look.y * pow(10.0, -0.12 * (airmass - 1.0));
    col *= clamp(1.0 + (uMagLim - look.z) / ${FADE_MAG.toFixed(2)}, 0.0, 1.0);
    vec2 p1 = c1.xy / c1.w * uHalf, p0 = c0.xy / c0.w * uHalf;
    float len = length(p1 - p0);
    vec2 t = len > 1e-4 ? (p1 - p0) / len : vec2(1.0, 0.0), n = vec2(-t.y, t.x);
    // The dot's radius, as gl_PointSize gives it.
    float r = look.x * uDpr * 0.5;
    float rw = mix(r, clamp(r, ${MIN_R.toFixed(2)} * uDpr, ${MAX_R.toFixed(2)} * uDpr), clamp(len / 8.0, 0.0, 1.0));
    float tail = mix(1.0, ${TAIL.toFixed(2)}, clamp(len / (4.0 * rw), 0.0, 1.0));
    // The light of a cone dot is pi r squared over 3.
    // The streak spreads the rest of that light, times uGain, over its length.
    float area = 3.14159265 * r * r / 3.0;
    col *= uGain;
    vHead = col * ${HEAD.toFixed(2)};
    col *= ${(1 - HEAD).toFixed(2)} * area / (0.5 * (1.0 + tail) * (3.14159265 * rw * rw / 3.0 + len * rw));
    float a = mix(-rw, len + rw, position.x), b = position.y * rw;
    vColor = col; vQ = vec2(a, b); vLen = len; vR = rw; vDot = r; vTail = tail;
    vUp = mix(w0.y, w1.y, position.x);
    gl_Position = vec4((p0 + t * a + n * b) / uHalf * c1.w, c1.z, c1.w);
  }
`;
const streakFrag = /* glsl */ `
  varying vec3 vColor, vHead;
  varying vec2 vQ;
  varying float vLen, vR, vDot, vTail, vUp;
  void main() {
    if (vUp < 0.0) discard;
    // The cone of the dot, drawn along the streak's centre line.
    float x = vQ.x - clamp(vQ.x, 0.0, vLen);
    float a = clamp(1.0 - length(vec2(x, vQ.y)) / vR, 0.0, 1.0);
    // The head is bright and the tail fades.
    float k = vLen > 1e-4 ? clamp(vQ.x / vLen, 0.0, 1.0) : 1.0;
    // The star's own dot sits at the head.
    float h = clamp(1.0 - length(vQ - vec2(vLen, 0.0)) / vDot, 0.0, 1.0);
    gl_FragColor = vec4(vColor * a * mix(vTail, 1.0, k) + vHead * h, 1.0);
  }
`;

// The device pixel ratio.
// The stage's resize sets it.
const starDpr = { value: 1 };
export function setStarDpr(dpr: number): void { starDpr.value = dpr; }
// The faintest magnitude in full.
// The dusk sets it.
// At night it is far past the catalog's 6.5.
export const NIGHT_MAG = 99;
const magLim = { value: NIGHT_MAG };
export function setStarLimit(mag: number): void { magLim.value = mag; }
// The stars' lift: the cuts' mirror shot sets it, so the stars read in the mirror.
// 1 and 1 draw the stars as they are.
const liftU = { value: new Vector2(1, 1) };
export function setStarLift(size: number, gain: number): void { liftU.value.set(size, gain); }
// The streak's turn in radians, and its gain.
// Both rest at night.
const turnU = { value: 0 }, gainU = { value: 1 };
// Sets the streak, in degrees of the sky's turn.
// At 0 the Points draw, as at night.
export function setStreak(deg: number): void {
  turnU.value = deg * Math.PI / 180;
  gainU.value = 1 + GAIN * Math.min(1, deg / GAIN_DEG);
  showStreaks();
}
// One of the two draws shows.
function showStreaks(): void {
  if (sky.points) sky.points.visible = turnU.value === 0;
  if (sky.streaks) sky.streaks.visible = turnU.value > 0;
}

export const sky = {
  stars: [] as Star[], index: new Map<number, number>(),
  points: null as Points | null, streaks: null as Mesh | null,
};

// setup.ts starts the catalog early.
// The promise settles when the stars are in the scene.
// It rejects when the catalog does not load.
export const skyReady: Promise<void> = starFile.then((stars) => {
  const n = stars.length;
  const pos = new Float32Array(n * 3), col = new Float32Array(n * 3), look = new Float32Array(n * 3);
  const c = new Color();
  stars.forEach((s, i) => {
    const d = shellDir(s.ra, s.dec);
    pos.set([RADIUS * d.x, RADIUS * d.y, RADIUS * d.z], i * 3);
    tint(s.ci, c).toArray(col, i * 3);
    // A brighter star is larger and brighter.
    // Magnitude 6.5 barely shows.
    const k = Math.max(0, Math.min(1, (6.5 - s.mag) / 7.9));
    look[i * 3] = 1.2 + 3.6 * k;
    look[i * 3 + 1] = 0.12 + 0.88 * Math.pow(k, 0.7);
    look[i * 3 + 2] = s.mag;
    if (s.hip) sky.index.set(s.hip, i);
  });
  const geo = new BufferGeometry();
  geo.setAttribute('position', new BufferAttribute(pos, 3));
  geo.setAttribute('tint', new BufferAttribute(col, 3));
  geo.setAttribute('look', new BufferAttribute(look, 3));
  // The stars add over the sky's glow.
  const pts = new Points(geo, new ShaderMaterial({ uniforms: { uDpr: starDpr, uMagLim: magLim, uLift: liftU }, vertexShader: vert, fragmentShader: frag, depthWrite: false, blending: AdditiveBlending }));
  pts.matrixAutoUpdate = false;
  pts.frustumCulled = false;
  scene.add(pts);
  // The streaks: one quad per star, in one instanced draw.
  // They share the stars' arrays.
  const sg = new InstancedBufferGeometry();
  sg.setAttribute('position', new BufferAttribute(new Float32Array([0, -1, 0, 0, 1, 0, 1, -1, 0, 1, 1, 0]), 3));
  sg.setIndex([0, 2, 1, 1, 2, 3]);
  sg.setAttribute('star', new InstancedBufferAttribute(pos, 3));
  sg.setAttribute('tint', new InstancedBufferAttribute(col, 3));
  sg.setAttribute('look', new InstancedBufferAttribute(look, 3));
  sg.instanceCount = n;
  const half = { value: new Vector2(1, 1) }, vp = new Vector4();
  const sm = new ShaderMaterial({
    uniforms: { uDpr: starDpr, uMagLim: magLim, uTurn: turnU, uGain: gainU, uHalf: half },
    vertexShader: streakVert, fragmentShader: streakFrag, depthWrite: false, blending: AdditiveBlending,
    // The sky matrix is a mirror turn, so three.js flips the front face.
    side: DoubleSide,
  });
  const streaks = new Mesh(sg, sm);
  streaks.matrixAutoUpdate = false;
  streaks.frustumCulled = false;
  // The quads are in device px of the target that draws them.
  streaks.onBeforeRender = (r) => { r.getCurrentViewport(vp); half.value.set(vp.z / 2, vp.w / 2); };
  scene.add(streaks);
  sky.stars = stars; sky.points = pts; sky.streaks = streaks;
  showStreaks();
  skyAt(lastMs);
  onLeave(() => { disposeTree(pts); disposeTree(streaks); });
});

let lastMs = Date.now();
// Turn the sky to a sky time.
export function skyAt(ms: number): void {
  lastMs = ms;
  if (sky.points) skyMatrix(ms, sky.points.matrix);
  if (sky.streaks && sky.points) sky.streaks.matrix.copy(sky.points.matrix);
}

// Where a star by Hipparcos id stands at a sky time.
// It reads back through the sky matrix.
export function starAltAz(hip: number, ms: number): AltAz | null {
  const i = sky.index.get(hip);
  if (i === undefined) return null;
  const s = sky.stars[i];
  return dirAltAz(turn(skyRows(lst(ms, LON), LAT), shellDir(s.ra, s.dec)));
}
