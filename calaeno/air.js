// Calaeno's air: the sun, a deep blue sky and thin haze.
// Every shader in the scene pastes AIR and shares AIR_U.
import * as THREE from 'three';
import { SKY } from '../shared/sky.js';

const lin = (r, g, b) => ({ value: new THREE.Vector3(r, g, b) });
export const AIR_U = {
  uSun: lin(0, 0.5, -0.86),
  // The sun's light, and the glow it gives lit dust.
  uSunC: lin(1.6, 1.52, 1.38), uGlowC: lin(0.26, 0.25, 0.22),
  // The sky in three stops, in linear light: the rim, cobalt, the navy top.
  uSkyLow: lin(0.16, 0.4, 0.86), uSkyMid: lin(0.01, 0.085, 0.6), uSkyTop: lin(0.0015, 0.01, 0.17),
  // The smoke's fill light: from the horizon, from the zenith.
  uHorC: lin(0.16, 0.36, 0.75), uZenC: lin(0.012, 0.07, 0.42),
  // Haze per metre at the ground, and the height where it thins.
  uHaze: { value: 1.2e-5 }, uHazeH: { value: 2600 },
  uTime: { value: 0 },
};

export const AIR = /* glsl */`
uniform vec3 uSun, uSunC, uGlowC, uSkyLow, uSkyMid, uSkyTop, uHorC, uZenC;
uniform float uHaze, uHazeH, uTime;
${SKY}
// The sky by direction, with no sun in it: the colour of lit air.
// The cobalt band sits where the lens looks; navy closes the top.
vec3 caAirC(vec3 d) {
  float y = max(d.y, 0.0);
  vec3 c = mix(uSkyLow, uSkyMid, smoothstep(0.0, 0.66, y));
  return mix(c, uSkyTop, smoothstep(0.66, 1.0, y));
}
// The sky with the sun's glow and corona, and no disc.
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
