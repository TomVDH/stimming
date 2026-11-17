// Load order: sky/sun runs first.
import './sun.ts';
// Lifted from Marsh launch, which lifted it from Fireworks.
import K2_NOISE from './k2-noise.glsl';
// A day sky replaces the night one.
// Zenith, horizon, dust band, the sun.
// Long cirrus streaks hang across it.
// New: the rock, the bolt and the hit light the air.
import K2_SKY from './k2-sky.glsl';
import K2_HAZE from './k2-haze.glsl';
// Shared lighting: sky hemisphere, sun, rim, the rock's glow.
import LIGHT from './light.glsl';

export const HZFADE = /* glsl */`
// Far things sink behind the horizon: the earth's curve, drawn four times deeper,
// with a band of thick low haze over it. Within 8 km of the eye nothing fades.
float hzFade(vec3 P) {
  float d = length(P.xz - cameraPosition.xz), drop = d * d / 3.2e6;
  return mix(1.0, smoothstep(drop, drop + 300.0 + 0.012 * d, P.y), smoothstep(8000.0, 16000.0, d));
}`;
export const HEAD = `${K2_NOISE}\nuniform vec3 uSun;\n${K2_SKY}\n${K2_HAZE}\n${LIGHT}
${HZFADE}`;
