// Load order: world/laser runs first.
import '../world/laser.ts';
import { BufferAttribute, BufferGeometry, Color, Matrix4, Points, ShaderMaterial, Vector3 } from 'three';
import { scene } from '../setup.ts';
import { lst, type AltAz } from '../core/sky.ts';
import { loadStars, type Star } from '../core/catalog.ts';

/* ---------- tonight's real sky: the catalog stars at the site, by sidereal time ---------- */
// The site: 51 N, 0 E.
export const LAT = 51, LON = 0;
// The star shell stays inside the camera far plane.
const RADIUS = 4000;
const RAD = Math.PI / 180;

// The blockout sky is a near-black blue-grey, so the faint stars show.
scene.background = new Color(0x090a0f);

// The star group's matrix for a sky time.
// Star positions sit on the shell at hour angle zero (x to the meridian, y to the west, z to the pole).
// The sky turns by LST about the pole, then tilts so the pole stands at the latitude.
// One matrix per redraw does the whole sky; no per-star work on the CPU.
// Scene axes: x east, y up, z south.
function skyMatrix(ms: number, out = new Matrix4()): Matrix4 {
  const L = lst(ms, LON) * RAD, cl = Math.cos(L), sl = Math.sin(L);
  const cp = Math.cos(LAT * RAD), sp = Math.sin(LAT * RAD);
  // Tilt (east = -y, up = x cos + z sin, south = x sin - z cos) times a turn by L about z.
  // Rows are the scene x, y and z; columns take the star's (x, y, z).
  return out.set(
    -sl, -cl, 0, 0,
    cp * cl, -cp * sl, sp, 0,
    sp * cl, -sp * sl, -cp, 0,
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
  attribute vec2 look; // x: size in px, y: brightness
  varying vec3 vColor;
  varying float vUp;
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    // The star shell is centred on the origin, the camera sits near it: below the horizon is hidden.
    vUp = world.y;
    vColor = tint * look.y;
    gl_PointSize = look.x;
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

export const sky = { stars: [] as Star[], index: new Map<number, number>(), points: null as Points | null };

// The bundle is observatory/dist/main.js, so the catalog sits one folder up.
// The catalog loads in the background; the promise settles when the stars are in the scene.
export const skyReady: Promise<void> = loadStars(new URL('../stars.bin', import.meta.url).href).then((stars) => {
  const n = stars.length;
  const pos = new Float32Array(n * 3), col = new Float32Array(n * 3), look = new Float32Array(n * 2);
  const c = new Color();
  stars.forEach((s, i) => {
    const ra = s.ra * RAD, dec = s.dec * RAD, cd = Math.cos(dec);
    // Hour angle zero at RA zero: x toward the meridian, y west.
    pos.set([RADIUS * cd * Math.cos(ra), -RADIUS * cd * Math.sin(ra), RADIUS * Math.sin(dec)], i * 3);
    tint(s.ci, c).toArray(col, i * 3);
    // Brighter is larger and brighter; magnitude 6.5 barely shows.
    const k = Math.max(0, Math.min(1, (6.5 - s.mag) / 7.9));
    look[i * 2] = 1.2 + 3.6 * k;
    look[i * 2 + 1] = 0.12 + 0.88 * Math.pow(k, 0.7);
    if (s.hip) sky.index.set(s.hip, i);
  });
  const geo = new BufferGeometry();
  geo.setAttribute('position', new BufferAttribute(pos, 3));
  geo.setAttribute('tint', new BufferAttribute(col, 3));
  geo.setAttribute('look', new BufferAttribute(look, 2));
  const pts = new Points(geo, new ShaderMaterial({ vertexShader: vert, fragmentShader: frag, depthWrite: false }));
  pts.matrixAutoUpdate = false;
  pts.frustumCulled = false;
  scene.add(pts);
  sky.stars = stars; sky.points = pts;
  skyAt(lastMs);
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
  const s = sky.stars[i], ra = s.ra * RAD, dec = s.dec * RAD, cd = Math.cos(dec);
  const v = new Vector3(cd * Math.cos(ra), -cd * Math.sin(ra), Math.sin(dec)).applyMatrix4(skyMatrix(ms));
  // Invert altAzDir in world/laser.ts: x = sin(az) cos(alt), z = -cos(az) cos(alt).
  const alt = Math.asin(Math.max(-1, Math.min(1, v.y))) / RAD;
  const az = ((Math.atan2(v.x, -v.z) / RAD) + 360) % 360;
  return { alt, az };
}
