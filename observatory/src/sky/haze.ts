// Load order: setup runs first.
import '../setup.ts';
// The haze amount is copied from railgun/src/sky/k2-haze.glsl.
// The night colours come from railgun/src/sky/sun.ts.
import { BackSide, Color, FogExp2, Mesh, ShaderChunk, ShaderMaterial, SphereGeometry, Vector2, Vector3, Vector4 } from 'three';
import { disposeTree, onLeave, scene } from '../setup.ts';

/* ---------- the night air: a moonless sky, a faint horizon glow, low haze ---------- */
// Linear colours.
// The zenith is near black.
// The horizon glows a little.
export const ZENITH = new Color(0.0035, 0.0048, 0.011);
export const HORIZON = new Color(0.022, 0.024, 0.034);
// The night haze holds faint, cool moonlight.
// So the mist in the valleys glows a little and shows their depth.
export const HAZE_C = new Color(0.046, 0.054, 0.078);
// Haze density at the valley floor, per metre.
const HAZE_D = 0.003;
// The haze thins by e every 40 m of height.
// So it lies in the valleys.
export const HAZE_H = 40;

// The haze from the eye to P: 0 clear, 1 full.
// It integrates a density that falls off with height.
export const HAZE_GLSL = /* glsl */`
float hazeAmount(vec3 P, float density) {
  float dist = length(P - cameraPosition);
  float k = 1.0 / ${HAZE_H.toFixed(1)};
  float h0 = max(cameraPosition.y, 0.0), h1 = max(P.y, 0.0), dh = h1 - h0;
  float avg = abs(dh) < 0.01 ? exp(-h0 * k) : (exp(-h0 * k) - exp(-h1 * k)) / (dh * k);
  return 1.0 - exp(-dist * density * max(avg, 0.0));
}`;

// Every built-in material with fog takes the height haze.
// The fog chunks now carry the world position, not only the depth.
ShaderChunk.fog_pars_vertex = '#ifdef USE_FOG\nvarying vec3 vHazeP;\n#endif';
// Instanced meshes carry their own matrix.
ShaderChunk.fog_vertex = /* glsl */`#ifdef USE_FOG
  vec4 hzP = vec4(transformed, 1.0);
  #ifdef USE_INSTANCING
    hzP = instanceMatrix * hzP;
  #endif
  vHazeP = (modelMatrix * hzP).xyz;
#endif`;
ShaderChunk.fog_pars_fragment = `#ifdef USE_FOG
uniform vec3 fogColor;
uniform float fogDensity;
varying vec3 vHazeP;
${HAZE_GLSL}
#endif`;
ShaderChunk.fog_fragment = '#ifdef USE_FOG\ngl_FragColor.rgb = mix(gl_FragColor.rgb, fogColor, hazeAmount(vHazeP, fogDensity));\n#endif';
// FogExp2 only carries the colour and the density.
export const fog = new FogExp2(HAZE_C.clone(), HAZE_D);
scene.fog = fog;

// The sky shell sits inside the star shell.
// The stars add over it.
// The gradient follows Railgun's bare sky: zenith to horizon, a low band.
// The dusk sets these.
// At night they hold the night values.
// uWarm is the sunset glow, black at night.
// uSun points at the sunset on the horizon.
// uGlow shapes the glow: x is its spread round the sun, in radians.
// y is how fast it fades with height.
// The golden hour spreads it wider and higher.
// uRidge is the late sun on the far ridges, black after the golden hour.
// uLift and uTown are the Sky row's light pollution, from core/skyctl bortleGlow.
// uLift lifts the whole night sky; uTown lights four valley towns.
export const skyU = {
  uZen: { value: ZENITH.clone() }, uHor: { value: HORIZON.clone() },
  uWarm: { value: new Color(0, 0, 0) }, uSun: { value: new Vector3(-1, 0, 0) },
  uGlow: { value: new Vector2(0.75, 10) }, uRidge: { value: new Color(0, 0, 0) },
  uLift: { value: 0 }, uTown: { value: new Vector4() },
};
// The sky's colour in direction d.
// The far ridges share it.
// So they fade into the sky behind them.
export const SKY_GLSL = /* glsl */`
uniform vec3 uZen, uHor, uWarm, uSun;
uniform vec2 uGlow;
uniform float uLift;
uniform vec4 uTown;
// The towns' azimuths, in the south-facing frame, in radians.
const vec4 TOWN_AZ = vec4(158.0, 199.0, 216.0, 143.0) * 0.0174533;
// The towns' widths in radians.
const vec4 TOWN_W = vec4(0.10, 0.07, 0.12, 0.06);
// Sodium light, scaled to the night sky's linear colours.
const vec3 TOWN_C = vec3(0.020, 0.011, 0.005);
vec3 skyColor(vec3 d) {
  float up = max(d.y, 0.0);
  vec3 col = mix(uHor, uZen, pow(up, 0.45));
  // The glow gathers in a thin band on the horizon.
  col = mix(col, uHor * 1.15, exp(-up * 14.0) * 0.55);
  // Light pollution: a warm lift, stronger low; light domes over the towns.
  // In a dark sky both are zero, so the branch is skipped.
  if (uLift > 0.0 || uTown.x > 0.0) {
    col += uLift * vec3(0.010, 0.008, 0.006) * (0.35 + 0.65 * exp(-up * 3.0));
    float az = atan(d.x, -d.z);
    az += az < 0.0 ? 6.2831853 : 0.0;
    vec4 da = (vec4(az) - TOWN_AZ) / TOWN_W;
    vec4 dome = uTown * exp(-da * da) * exp(-up * 9.0);
    col += TOWN_C * (dome.x + dome.y + dome.z + dome.w);
  }
  // The sunset glow lies low and spreads wide round the sun.
  // At night uWarm is black, so the night frame skips this branch.
  if (uWarm != vec3(0.0)) {
    // The guard keeps the zenith free of a zero-length vector.
    vec2 h = d.xz / max(length(d.xz), 1e-4);
    float away = acos(clamp(dot(h, uSun.xz), -1.0, 1.0));
    col += uWarm * exp(-away / uGlow.x) * exp(-up * uGlow.y);
  }
  return col;
}`;
const skyMat = new ShaderMaterial({
  uniforms: skyU,
  side: BackSide, depthWrite: false,
  vertexShader: /* glsl */`varying vec3 vP; void main() { vP = (modelMatrix * vec4(position, 1.0)).xyz; gl_Position = projectionMatrix * viewMatrix * vec4(vP, 1.0); }`,
  fragmentShader: /* glsl */`
  ${SKY_GLSL}
  varying vec3 vP;
  void main() { gl_FragColor = vec4(skyColor(normalize(vP - cameraPosition)), 1.0); }`,
});
const sky = new Mesh(new SphereGeometry(3900, 32, 16), skyMat);
// The shell draws first, behind everything.
sky.renderOrder = -1;
sky.frustumCulled = false;
scene.add(sky);
scene.background = null;
onLeave(() => disposeTree(sky));
