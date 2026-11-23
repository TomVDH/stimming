// Gas giant dive: the planet, its decks, its rings and the light that fails with depth.
// Units are km, seconds and bar. Altitude counts from the 1 bar level.
// The local frame: y up, x east, -z north. The planet's centre lies at (0, -R, 0).

export const R = 70000;
// The dive's latitude: 35 degrees south. The rings arch over the northern sky.
const LAT = -35 * Math.PI / 180;
export const AXIS = [0, Math.sin(LAT), -Math.cos(LAT)];

const norm = a => { const l = Math.hypot(...a); return a.map(x => x / l); };
// Mid-morning sun, 35 degrees east of north, 28 degrees up.
// It stands 19 degrees over the ring plane, so the A ring's shadow lies on the deck ahead.
const AZ = 35 * Math.PI / 180, EL = 28 * Math.PI / 180;
export const SUN = norm([Math.sin(AZ) * Math.cos(EL), Math.sin(EL), -Math.cos(AZ) * Math.cos(EL)]);

// The descent column, km.
export const ALT_TOP = 260, ALT_DEEP = -150;
// The pressure at an altitude, for the docs and the sound. 20 bar at -150 km.
export const bar = h => Math.exp(-h / (h > 0 ? 27 : 50));

// The decks, km over the 1 bar level.
export const DECKS = {
  ammonia: [0, 22],
  hydrosulfide: [-46, -22],
  water: [-92, -56],
};

// The light table: diffuse light by altitude, rgb, from the keyframes below.
// The light turns teal in the ammonia deck, green in the brown deck, violet in the water deck, then fails.
// Values interpolate in log space.
const KEYS = [
  [300, [1, 1, 1]],
  [30, [0.97, 0.99, 0.99]],
  [15, [0.86, 0.95, 0.93]],
  [0, [0.5, 0.66, 0.62]],
  [-24, [0.3, 0.48, 0.38]],
  [-38, [0.16, 0.3, 0.2]],
  [-50, [0.11, 0.14, 0.16]],
  [-64, [0.07, 0.05, 0.12]],
  [-80, [0.03, 0.012, 0.05]],
  [-100, [0.008, 0.002, 0.014]],
  [-125, [0.0012, 0.0002, 0.002]],
  [-150, [0.00012, 0.00002, 0.0002]],
  [-170, [0.00002, 0.000003, 0.00003]],
];
export const LUT_LO = -170, LUT_HI = 300, LUT_N = 256;

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
const vec3 SUN = vec3(${SUN.map(v => v.toFixed(6)).join(', ')});
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
