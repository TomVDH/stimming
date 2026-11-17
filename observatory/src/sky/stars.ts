// Load order: world/laser runs first.
import '../world/laser.ts';
import { AdditiveBlending, BufferAttribute, BufferGeometry, Color, Matrix4, Points, ShaderMaterial } from 'three';
import { disposeTree, onLeave, scene, starFile } from '../setup.ts';
import { dirAltAz, lst, shellDir, skyRows, turn, type AltAz } from '../core/sky.ts';
import type { Star } from '../core/catalog.ts';

/* ---------- tonight's real sky: the catalog stars at the site, by sidereal time ---------- */
// The site: 51 N, 0 E.
export const LAT = 51, LON = 0;
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

// Blackbody tint from the colour index B-V (Ballesteros temperature, Helland fit). Unknown is white.
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
  varying vec3 vColor;
  varying float vUp;
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    // The star shell is centred on the origin, the camera sits near it: below the horizon is hidden.
    vUp = world.y;
    // Low stars shine through more air: 0.3 magnitudes per airmass.
    float airmass = 1.0 / max(world.y / ${RADIUS.toFixed(1)}, 0.03);
    vColor = tint * look.y * pow(10.0, -0.12 * (airmass - 1.0));
    // At dusk a star fades in as the limit passes its magnitude.
    // A star at the limit or brighter shows in full.
    vColor *= clamp(1.0 + (uMagLim - look.z) / ${FADE_MAG.toFixed(2)}, 0.0, 1.0);
    gl_PointSize = look.x * uDpr;
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

// The device pixel ratio; the stage's resize sets it.
const starDpr = { value: 1 };
export function setStarDpr(dpr: number): void { starDpr.value = dpr; }
// The faintest magnitude in full.
// The dusk sets it.
// At night it is far past the catalog's 6.5.
export const NIGHT_MAG = 99;
const magLim = { value: NIGHT_MAG };
export function setStarLimit(mag: number): void { magLim.value = mag; }

export const sky = { stars: [] as Star[], index: new Map<number, number>(), points: null as Points | null };

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
    // Brighter is larger and brighter; magnitude 6.5 barely shows.
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
  const pts = new Points(geo, new ShaderMaterial({ uniforms: { uDpr: starDpr, uMagLim: magLim }, vertexShader: vert, fragmentShader: frag, depthWrite: false, blending: AdditiveBlending }));
  pts.matrixAutoUpdate = false;
  pts.frustumCulled = false;
  scene.add(pts);
  sky.stars = stars; sky.points = pts;
  skyAt(lastMs);
  onLeave(() => disposeTree(pts));
});

let lastMs = Date.now();
// Turn the sky to a sky time.
export function skyAt(ms: number): void {
  lastMs = ms;
  if (sky.points) skyMatrix(ms, sky.points.matrix);
}

// Where a star by Hipparcos id stands at a sky time, read back through the sky matrix.
export function starAltAz(hip: number, ms: number): AltAz | null {
  const i = sky.index.get(hip);
  if (i === undefined) return null;
  const s = sky.stars[i];
  return dirAltAz(turn(skyRows(lst(ms, LON), LAT), shellDir(s.ra, s.dec)));
}
