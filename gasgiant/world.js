// Gas giant dive: the planet, its decks, its rings and the light that fails with depth.
// Units are km, seconds and bar. Altitude counts from the 1 bar level.
// The local frame: y up, x east, -z north. The planet's centre lies at (0, -R, 0).

export const R = 70000;
// The dive's latitude: 35 degrees south. The rings arch over the northern sky.
const LAT = -35 * Math.PI / 180;
export const AXIS = [0, Math.sin(LAT), -Math.cos(LAT)];

const norm = a => { const l = Math.hypot(...a); return a.map(x => x / l); };
// A low sun at the side of the view: 65 degrees east of north, 10 degrees up.
// Its long light throws the heads' shadows across the deck.
// It stands 14 degrees over the ring plane, so the rings still show their unlit face.
export const SUN_AZ = 65, SUN_EL = 10;
/** The sun's direction from its azimuth and elevation in degrees. */
export const sunDir = (az, el) => {
  const a = az * Math.PI / 180, e = el * Math.PI / 180;
  return norm([Math.sin(a) * Math.cos(e), Math.sin(e), -Math.cos(a) * Math.cos(e)]);
};
export const SUN = sunDir(SUN_AZ, SUN_EL);

// The descent column, km. The hull fails at about 1,000 bar, 640 km down.
export const ALT_TOP = 260, ALT_DEEP = -640;
// The pressure at an altitude, for the docs and the sound.
// Under the 1 bar level the gas warms on an adiabat: 22 bar at -150 km, 1,000 bar at -640 km.
export const bar = h => h > 0 ? Math.exp(-h / 27) : Math.pow(1 - h / 105.6, 3.5);

// The layers, top down, km over the 1 bar level.
// kind: lid (thin haze over the tops), deck (heaped cloud), void (towers), sheets (thin layers), haze (gauze), dark (clear gas).
// bolts: lightning starts in it. The march in clouds.js holds the same bounds.
export const LAYERS = [
  { id: 'haze lid', kind: 'lid', top: 40, bot: 22 },
  { id: 'ammonia', kind: 'deck', top: 22, bot: 0 },
  { id: 'upper void', kind: 'void', top: 0, bot: -40 },
  { id: 'brown', kind: 'deck', top: -40, bot: -50 },
  { id: 'mushball fall', kind: 'void', top: -50, bot: -64 },
  { id: 'water', kind: 'deck', top: -64, bot: -92, bolts: 1 },
  { id: 'shelves', kind: 'sheets', top: -92, bot: -140 },
  { id: 'veil', kind: 'haze', top: -140, bot: -158 },
  { id: 'nave', kind: 'void', top: -158, bot: -230 },
  { id: 'indigo', kind: 'deck', top: -230, bot: -262, bolts: 1 },
  { id: 'gyre', kind: 'void', top: -262, bot: -360 },
  { id: 'salt', kind: 'deck', top: -360, bot: -385, bolts: 0.6 },
  { id: 'lightning nest', kind: 'void', top: -385, bot: -425, bolts: 3 },
  { id: 'stairs', kind: 'sheets', top: -425, bot: -470 },
  { id: 'last', kind: 'deck', top: -470, bot: -500, bolts: 0.3 },
  { id: 'dark', kind: 'dark', top: -500, bot: -640 },
];
/** The layer that holds altitude h. */
export const layerAt = h => LAYERS.find(l => h > l.bot) || LAYERS[LAYERS.length - 1];

// The light table: diffuse light by altitude, rgb, from the keyframes below.
// Each layer tints the light: teal, green, violet, magenta, deep teal, indigo, jade, violet.
// The light fades slowly through the abyss and fails under the last deck, at -500 km.
// Values interpolate in log space.
const KEYS = [
  [300, [1, 1, 1]],
  [30, [0.97, 0.99, 0.99]],
  [15, [0.86, 0.95, 0.93]],
  [0, [0.5, 0.66, 0.62]],
  [-40, [0.3, 0.48, 0.38]],
  [-50, [0.18, 0.32, 0.22]],
  [-64, [0.1, 0.1, 0.16]],
  [-92, [0.08, 0.06, 0.12]],
  [-140, [0.075, 0.045, 0.1]],
  [-158, [0.065, 0.04, 0.085]],
  [-230, [0.04, 0.062, 0.066]],
  [-262, [0.036, 0.034, 0.07]],
  [-360, [0.026, 0.038, 0.04]],
  [-385, [0.022, 0.036, 0.024]],
  [-470, [0.016, 0.012, 0.024]],
  [-500, [0.005, 0.0035, 0.0075]],
  [-540, [0.0004, 0.00025, 0.0006]],
  [-600, [0.00002, 0.00001, 0.00003]],
  [-660, [0.000002, 0.000001, 0.000003]],
];
export const LUT_LO = -660, LUT_HI = 300, LUT_N = 512;

/** The light at altitude h: [r, g, b, direct], direct is the share of the beam. */
export function lightAt(h) {
  let i = 0;
  while (i < KEYS.length - 2 && h < KEYS[i + 1][0]) i++;
  const [h0, c0] = KEYS[i], [h1, c1] = KEYS[i + 1];
  const f = Math.max(0, Math.min(1, (h - h0) / (h1 - h0)));
  const c = c0.map((v, k) => Math.exp(Math.log(v) + (Math.log(c1[k]) - Math.log(v)) * f));
  // The beam dies in the ammonia deck; under it all light is diffuse.
  const direct = Math.max(0, Math.min(1, (h + 6) / 26));
  return [...c, direct * direct * (3 - 2 * direct)];
}

/** The light table as half floats for a 256 x 1 RGBA16F texture. */
export function lightTable() {
  const out = new Float32Array(LUT_N * 4);
  for (let i = 0; i < LUT_N; i++) {
    const h = LUT_LO + (LUT_HI - LUT_LO) * (i / (LUT_N - 1));
    out.set(lightAt(h), i * 4);
  }
  return out;
}

export const luma = c => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];

// The map's square, km: it covers what the eye sees from the top.
export const MAP_C = [0, -2800], MAP_S = 16000;
// The great storm: centre and half axes, km.
export const STORM = { c: [750, -950], ax: [1500, 1000] };

// The GLSL every pass shares: the planet, the rings, the ring shadow, the palette.
export const COMMON = /* glsl */`
// The palette by hue 0 to 1.2: mint, jade, teal, purple, magenta.
vec3 pal(float t) {
  t = clamp(t, 0.0, 1.2);
  vec3 c = mix(vec3(0.78, 0.92, 0.84), vec3(0.3, 0.66, 0.44), smoothstep(0.0, 0.33, t));
  c = mix(c, vec3(0.18, 0.6, 0.66), smoothstep(0.33, 0.66, t));
  c = mix(c, vec3(0.48, 0.27, 0.68), smoothstep(0.66, 1.0, t));
  return mix(c, vec3(0.64, 0.2, 0.52), smoothstep(1.0, 1.2, t));
}
const float R = ${R.toFixed(1)};
const vec3 PC = vec3(0.0, -R, 0.0);
const vec3 AXIS = vec3(${AXIS.map(v => v.toFixed(6)).join(', ')});
// The sun is a uniform, so the dev panel can move it.
uniform vec3 uSun;
#define SUN uSun
const vec2 MAP_C = vec2(${MAP_C[0].toFixed(1)}, ${MAP_C[1].toFixed(1)});
const vec2 ST_C = vec2(${STORM.c[0].toFixed(1)}, ${STORM.c[1].toFixed(1)});
const vec2 ST_AX = vec2(${STORM.ax[0].toFixed(1)}, ${STORM.ax[1].toFixed(1)});
const float MAP_S = ${MAP_S.toFixed(1)};
const float LUT_LO = ${LUT_LO.toFixed(1)}, LUT_HI = ${LUT_HI.toFixed(1)};
float altOf(vec3 p) { return length(p - PC) - R; }
// The near and far hit of a ray on a sphere round the centre; x > y means a miss.
vec2 sphereHit(vec3 ro, vec3 rd, float rad) {
  vec3 oc = ro - PC;
  float b = dot(oc, rd), c = dot(oc, oc) - rad * rad, d = b * b - c;
  if (d < 0.0) return vec2(1e9, -1e9);
  float s = sqrt(d);
  return vec2(-b - s, -b + s);
}
float rh1(float x) { return fract(sin(x * 127.1) * 43758.5453); }
float rn1(float x) { float i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f); return mix(rh1(i), rh1(i + 1.0), f); }
// The rings' normal optical depth at radius r, in planet radii.
// C ring, dense B ring, the division, A ring with its gap, the thin F ring.
float ringTau(float r) {
  float ringlets = 0.7 + 0.3 * rn1(r * 900.0);
  float tau = 0.0;
  tau += 0.09 * step(1.29, r) * step(r, 1.59) * (0.6 + 0.8 * rn1(r * 260.0));
  tau += mix(1.1, 2.6, smoothstep(1.59, 1.8, r)) * step(1.59, r) * step(r, 2.04) * (0.75 + 0.5 * rn1(r * 420.0));
  tau += 0.08 * step(2.04, r) * step(r, 2.11);
  tau += 0.38 * smoothstep(2.11, 2.13, r) * (1.0 - smoothstep(2.355, 2.37, r)) * (1.0 - step(2.307, r) * step(r, 2.313)) * (0.5 + rn1(r * 1700.0));
  float fr = (r - 2.43) / 0.0018;
  tau += 0.35 * exp(-fr * fr);
  return tau * ringlets;
}
// The share of sunlight that passes the rings to the point p.
float ringShadow(vec3 p) {
  float mu = dot(SUN, AXIS);
  float s = -dot(p - PC, AXIS) / mu;
  float r = length(p - PC + SUN * max(s, 0.0)) / R;
  // Light the ring scatters fills its own shadow a little.
  return s > 0.0 ? mix(exp(-ringTau(r) / max(mu, 0.05)), 1.0, 0.22) : 1.0;
}
`;
