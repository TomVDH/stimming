// Calaeno's air: the sun, a deep blue sky and thin haze.
// Every shader in the scene pastes AIR and shares AIR_U.
import * as THREE from 'three';
import { SKY } from '../shared/sky.js';

const lin = (r, g, b) => ({ value: new THREE.Vector3(r, g, b) });
export const AIR_U = {
  uSun: lin(0, 0.5, -0.86),
  // The sun's light, and the glow it gives lit dust.
  uSunC: lin(1.9, 1.8, 1.62), uGlowC: lin(0.3, 0.28, 0.24),
  // The sky in three stops, in linear light: the rim, 20 degrees up, the top.
  uSkyLow: lin(0.3, 0.55, 0.87), uSkyMid: lin(0.03, 0.17, 0.7), uSkyTop: lin(0.004, 0.022, 0.25),
  // The smoke's fill light: from the horizon, from the zenith.
  uHorC: lin(0.22, 0.42, 0.75), uZenC: lin(0.02, 0.1, 0.5),
  // Haze per metre at the ground, and the height where it thins.
  uHaze: { value: 1.4e-5 }, uHazeH: { value: 2600 },
  uTime: { value: 0 },
};

export const AIR = /* glsl */`
uniform vec3 uSun, uSunC, uGlowC, uSkyLow, uSkyMid, uSkyTop, uHorC, uZenC;
uniform float uHaze, uHazeH, uTime;
${SKY}
// The sky by direction, with no sun in it: the colour of lit air.
vec3 caAirC(vec3 d) {
  float y = max(d.y, 0.0);
  vec3 c = mix(uSkyLow, uSkyMid, smoothstep(0.0, 0.36, y));
  return mix(c, uSkyTop, smoothstep(0.3, 0.95, y));
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
