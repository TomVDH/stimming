// Load order: world/hill runs first.
import { EYE_H, RISE, hillHeight } from './hill.ts';
// Crest noise ported from ridge2 in railgun/ranges.js.
// Foot melt copied from railgun/src/world/farcountry.ts, trimmed to one term.
import { BufferGeometry, DoubleSide, Float32BufferAttribute, Mesh, ShaderMaterial } from 'three';
import { disposeTree, onLeave, scene } from '../setup.ts';
import { SKY_GLSL, fog, skyU } from '../sky/haze.ts';

/* ---------- the far view: ridgelines on the southern horizon ---------- */
// The camera never moves far.
// So each ridge is a ring round the wide eye.
// A ring stands inside the sky shell.
// It still shows the angles of far ranges.
// Each ridge's crest height is an angle over the horizon, in degrees.

// One ridge: ring radius in metres, crest angles, feature scale, fade.
// The feature scale sets the hills round the full circle.
// Further ranges show smaller features and fade more into the sky.
type Ridge = { r: number; lo: number; hi: number; f: number; fade: number; seed: number };
// Back to front: about 38 km, 22 km and 12 km out.
// The back range is alpine and snow-capped; the front ranges are boreal forest.
const RIDGES: Ridge[] = [
  { r: 3400, lo: 2.2, hi: 5.2, f: 44, fade: 0.55, seed: 31 },
  { r: 3200, lo: 1.6, hi: 3.4, f: 26, fade: 0.3, seed: 17 },
  { r: 3000, lo: 1.1, hi: 2.3, f: 15, fade: 0.08, seed: 5 },
];
// Snow caps the back range's crests over this angle, in degrees.
const SNOW_ALT = 3.6;
// The snow reaches this many degrees down from a crest.
const SNOW_DEPTH = 0.45;
// Crest points per ridge: one every tenth of a degree.
const STEPS = 3600;
// The ring's foot lies under the flat land.
const FOOT_Y = -80;
const DEG = Math.PI / 180;
// The share the crests lose straight behind the complex.
const SADDLE = 0.3;
// A crest that falls this many degrees per degree west is a full west face.
const WEST_SLOPE = 0.25;
// The late sun lights a west face this many degrees down from its crest.
const WEST_DEPTH = 0.3;

// A hash of a lattice point and a seed, in [0, 1).
function hash(i: number, j: number, s: number): number {
  const h = Math.sin(i * 127.1 + j * 311.7 + s * 74.7) * 43758.5453;
  return h - Math.floor(h);
}

// Smooth value noise in [0, 1).
function noise(x: number, y: number, s: number): number {
  const i = Math.floor(x), j = Math.floor(y);
  const u = x - i, v = y - j;
  const a = u * u * (3 - 2 * u), b = v * v * (3 - 2 * v);
  const n0 = hash(i, j, s) + (hash(i + 1, j, s) - hash(i, j, s)) * a;
  const n1 = hash(i, j + 1, s) + (hash(i + 1, j + 1, s) - hash(i, j + 1, s)) * a;
  return n0 + (n1 - n0) * b;
}

// Sharp ridges in [0, 1]: lines of 1, narrow Vs between.
function ridge2(x: number, y: number, s: number): number {
  let sum = 0, amp = 0.5, w = 1;
  for (let i = 0; i < 3; i++) {
    const n = 1 - Math.abs(noise(x, y, s) * 2 - 1);
    // Each octave is strongest high on the ridge above it.
    sum += amp * n * n * w;
    w = Math.min(1, Math.max(0, n * 1.6));
    x = x * 2.11 + 13.7; y = y * 2.11 + 5.3; amp *= 0.5;
  }
  return sum / 0.875;
}

// The crest angle of a ridge at an azimuth, in degrees.
// The noise runs round a circle.
// So the ring closes without a seam.
function crest(k: Ridge, az: number): number {
  const x = Math.sin(az * DEG) * k.f / (2 * Math.PI), z = Math.cos(az * DEG) * k.f / (2 * Math.PI);
  // Broad swells carry the sharp ridges.
  const s = 0.5 * noise(x * 0.5 + 40, z * 0.5, k.seed) + 0.5 * ridge2(x * 2, z * 2, k.seed);
  // The stretch spreads the crests over the full band.
  const t = Math.min(1, Math.max(0, (s - 0.25) / 0.5));
  // The crests dip behind the complex, so its skyline stays clear.
  const dip = 1 - SADDLE * Math.exp(-(((az - 180) / 8) ** 2));
  return (k.lo + (k.hi - k.lo) * t) * dip;
}

// The wide eye: the rings centre on it.
const EYE = { x: RISE.x, y: hillHeight(RISE.x, RISE.z) + EYE_H, z: RISE.z };

function ridgeMesh(): BufferGeometry {
  const p: number[] = [], alt: number[] = [], fade: number[] = [], west: number[] = [], idx: number[] = [];
  for (const k of RIDGES) {
    const base = p.length / 3;
    const footAlt = Math.atan((FOOT_Y - EYE.y) / k.r) / DEG;
    for (let i = 0; i <= STEPS; i++) {
      const az = (i / STEPS) * 360, a = crest(k, az);
      const x = EYE.x + Math.sin(az * DEG) * k.r, z = EYE.z - Math.cos(az * DEG) * k.r;
      p.push(x, EYE.y + Math.tan(a * DEG) * k.r, z, x, FOOT_Y, z);
      alt.push(a, footAlt);
      fade.push(k.fade, k.fade);
      // Azimuth grows to the west in the south.
      // So a crest that falls as azimuth grows faces west.
      const slope = (crest(k, az + 0.25) - crest(k, az - 0.25)) / 0.5;
      const w = Math.min(1, Math.max(0, -slope / WEST_SLOPE));
      west.push(w, a, w, a);
    }
    for (let i = 0; i < STEPS; i++) {
      const t = base + i * 2;
      idx.push(t, t + 1, t + 2, t + 2, t + 1, t + 3);
    }
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(p, 3));
  g.setAttribute('aAlt', new Float32BufferAttribute(alt, 1));
  g.setAttribute('aFade', new Float32BufferAttribute(fade, 1));
  g.setAttribute('aWest', new Float32BufferAttribute(west, 2));
  g.setIndex(idx);
  return g;
}

// The ridges take the sky's own colours.
// So the dusk drives them too.
const farMat = new ShaderMaterial({
  uniforms: { ...skyU, uFog: { value: fog.color } },
  // The eye sees the rings from inside.
  side: DoubleSide,
  vertexShader: /* glsl */`
  attribute float aAlt, aFade;
  // x: how much the face looks west, y: its crest angle.
  attribute vec2 aWest;
  varying vec3 vP;
  varying float vAlt, vFade;
  varying vec2 vWest;
  void main() {
    vAlt = aAlt; vFade = aFade; vWest = aWest;
    vP = (modelMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * viewMatrix * vec4(vP, 1.0);
  }`,
  fragmentShader: /* glsl */`
  ${SKY_GLSL}
  uniform vec3 uFog, uRidge;
  varying vec3 vP;
  varying float vAlt, vFade;
  varying vec2 vWest;
  void main() {
    vec3 d = normalize(vP - cameraPosition);
    // The rock is a dark slate of the horizon.
    vec3 body = uHor * 0.4;
    // Toward the sunset it holds a little warm light.
    // At night uWarm is black, so the night frame skips this branch.
    if (uWarm != vec3(0.0)) {
      vec2 h = d.xz / max(length(d.xz), 1e-4);
      float away = acos(clamp(dot(h, uSun.xz), -1.0, 1.0));
      body += uWarm * exp(-away / 0.75) * 0.12;
      // In the golden hour the late sun lights the west faces.
      // The light fades from the crest down.
      body += uRidge * vWest.x * exp(-(vWest.y - vAlt) / ${WEST_DEPTH.toFixed(2)});
    }
    // Snow caps the highest crests of the back range.
    float snow = step(0.5, vFade) * smoothstep(${SNOW_ALT.toFixed(2)}, ${(SNOW_ALT + 0.8).toFixed(2)}, vWest.y)
      * (1.0 - smoothstep(0.0, ${SNOW_DEPTH.toFixed(2)}, vWest.y - vAlt));
    body = mix(body, uHor * 1.5, snow * 0.7);
    // Each range fades by its distance into the sky behind it.
    vec3 col = mix(body, skyColor(d), vFade);
    // The foot melts into the valley haze, so no seam shows.
    col = mix(col, uFog, clamp(exp(-(vAlt + 0.2) / 0.35), 0.0, 1.0));
    gl_FragColor = vec4(col, 1.0);
  }`,
});

export const far = new Mesh(ridgeMesh(), farMat);
scene.add(far);
onLeave(() => disposeTree(far));
