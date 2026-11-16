// Calaeno's air: the key light, the sky, the haze, and the hour.
// Every shader in the scene pastes AIR and shares AIR_U.
// setTime() turns one number into the whole air: day, gold, dusk, night.
import * as THREE from 'three';
import { SKY } from '../shared/sky.js';

const lin = (r = 0, g = 0, b = 0) => ({ value: new THREE.Vector3(r, g, b) });
export const AIR_U = {
  // The key light: the sun by day, the moon by night.
  uSun: lin(0, 0.5, -0.86),
  // Its colour, and the glow it gives lit dust.
  uSunC: lin(), uGlowC: lin(),
  // The sky in three stops, in linear light: the rim, the middle, the top.
  uSkyLow: lin(), uSkyMid: lin(), uSkyTop: lin(),
  // A warm band low on the key light's side.
  uBandC: lin(),
  // Fill light on smoke and craft: from the horizon, from the zenith.
  uHorC: lin(), uZenC: lin(),
  // The shade inside cloud, and the sea.
  uShadeC: lin(), uSeaC: lin(),
  // Stars, the disc's gain, the night share for lamps and windows.
  uStars: { value: 0 }, uDisc: { value: 50 }, uNight: { value: 0 },
  // 1 when the key light is out of the frame: the sky goes deeper.
  uDeep: { value: 0 },
  // Haze per metre at the ground, and the height where it thins.
  uHaze: { value: 1.2e-5 }, uHazeH: { value: 2600 },
  uTime: { value: 0 },
};

export const AIR = /* glsl */`
uniform vec3 uSun, uSunC, uGlowC, uSkyLow, uSkyMid, uSkyTop, uBandC, uHorC, uZenC, uShadeC, uSeaC;
uniform float uStars, uDisc, uNight, uDeep, uHaze, uHazeH, uTime;
${SKY}
// The sky by direction, with no disc in it: the colour of lit air.
vec3 caAirC(vec3 d) {
  float y = max(d.y, 0.0);
  vec3 c = mix(uSkyLow, uSkyMid, smoothstep(0.0, 0.4, y));
  c = mix(c, uSkyTop, smoothstep(0.55, 1.0, y));
  // The warm band hugs the rim on the key light's side.
  float side = pow(0.5 + 0.5 * dot(normalize(d.xz + 1e-5), normalize(uSun.xz + 1e-5)), 3.0);
  c += uBandC * side * exp(-y * 5.0);
  // With the key light out of the frame, the blue goes deeper.
  return c * mix(vec3(1.0), vec3(0.4, 0.5, 0.8), uDeep);
}
// The sky with the key light's glow and corona, and no disc.
vec3 caSky(vec3 d) {
  float sd = max(dot(d, uSun), 0.0);
  return caAirC(d) + uSunC * (0.02 * pow(sd, 24.0) + 0.07 * pow(sd, 300.0) + 0.5 * pow(sd, 4000.0));
}
// The air between the eye and P. al is the colour's own cover.
vec3 caAir(vec3 col, vec3 P, float al) {
  float a = skHaze(cameraPosition, P, uHaze, uHazeH);
  return mix(col, caAirC(normalize(P - cameraPosition)) * al, a);
}
`;

/* ---------- the hour ---------- */
// Four keys in linear light. t runs 0 at full day to 1 at night.
const KEYS = [
  [0, {
    sun: [1.6, 1.52, 1.38], glow: [0.26, 0.25, 0.22], low: [0.16, 0.4, 0.86], mid: [0.01, 0.085, 0.6], top: [0.0015, 0.01, 0.17],
    band: [0, 0, 0], hor: [0.16, 0.36, 0.75], zen: [0.012, 0.07, 0.42], shade: [0.26, 0.42, 0.95], sea: [0.006, 0.03, 0.11], stars: 0, expo: 1,
  }],
  // Gold: a low, red sun; the rim burns and the top stays blue.
  [0.45, {
    sun: [1.9, 0.92, 0.36], glow: [0.5, 0.22, 0.07], low: [0.5, 0.36, 0.34], mid: [0.035, 0.08, 0.42], top: [0.003, 0.01, 0.13],
    band: [0.9, 0.34, 0.08], hor: [0.42, 0.3, 0.32], zen: [0.025, 0.05, 0.3], shade: [0.2, 0.2, 0.52], sea: [0.016, 0.02, 0.06], stars: 0, expo: 1.05,
  }],
  // Dusk: the sun is under the rim; a red band, first stars.
  [0.7, {
    sun: [0.42, 0.13, 0.05], glow: [0.2, 0.06, 0.03], low: [0.2, 0.09, 0.1], mid: [0.02, 0.025, 0.16], top: [0.0015, 0.004, 0.05],
    band: [0.5, 0.12, 0.03], hor: [0.14, 0.08, 0.13], zen: [0.01, 0.016, 0.1], shade: [0.06, 0.07, 0.22], sea: [0.005, 0.007, 0.026], stars: 0.45, expo: 1.3,
  }],
  // Night: the moon stands where the sun stood; the sky is near black.
  [1, {
    sun: [0.2, 0.25, 0.36], glow: [0.02, 0.026, 0.04], low: [0.006, 0.012, 0.04], mid: [0.002, 0.005, 0.022], top: [0.0005, 0.0012, 0.008],
    band: [0, 0, 0], hor: [0.012, 0.018, 0.045], zen: [0.004, 0.008, 0.026], shade: [0.014, 0.022, 0.06], sea: [0.001, 0.002, 0.006], stars: 1, expo: 1.9,
  }],
];
const sstep = THREE.MathUtils.smoothstep;
const down = new THREE.Vector3(), flat = new THREE.Vector3();

// Sets the air for hour t. anchor is the unit direction where the key light stands by day.
// The sun sinks from there and sets; then the moon rises to the same place.
// It returns the exposure for that hour.
export function setTime(t, anchor) {
  let i = 0;
  while (i < KEYS.length - 2 && t >= KEYS[i + 1][0]) i++;
  const [t0, a] = KEYS[i], [t1, b] = KEYS[i + 1], k = (t - t0) / (t1 - t0);
  const mix = key => a[key].map((v, n) => v + (b[key][n] - v) * k);
  const U = AIR_U;
  // The key light goes dark for a moment as the sun hands over to the moon.
  const swap = 0.8, on = sstep(Math.abs(t - swap), 0, 0.07);
  U.uSunC.value.set(...mix('sun')).multiplyScalar(on);
  U.uGlowC.value.set(...mix('glow')).multiplyScalar(on);
  U.uSkyLow.value.set(...mix('low')); U.uSkyMid.value.set(...mix('mid')); U.uSkyTop.value.set(...mix('top'));
  U.uBandC.value.set(...mix('band'));
  U.uHorC.value.set(...mix('hor')); U.uZenC.value.set(...mix('zen'));
  U.uShadeC.value.set(...mix('shade')); U.uSeaC.value.set(...mix('sea'));
  U.uStars.value = a.stars + (b.stars - a.stars) * k;
  U.uNight.value = sstep(t, 0.58, 0.9);
  // The moon's disc is far dimmer than the sun's.
  U.uDisc.value = t < swap ? 50 : 14;
  if (t < swap) {
    // The sun keeps its bearing and sinks: under the rim by dusk.
    const el0 = Math.asin(anchor.y), el = el0 + (-0.12 - el0) * sstep(t, 0, 0.74);
    flat.set(anchor.x, 0, anchor.z).normalize();
    U.uSun.value.copy(flat).multiplyScalar(Math.cos(el)).add(down.set(0, Math.sin(el), 0));
  } else {
    U.uSun.value.copy(anchor);
  }
  return a.expo + (b.expo - a.expo) * k;
}
