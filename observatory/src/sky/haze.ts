// Load order: setup runs first.
import '../setup.ts';
// Haze amount copied from railgun/src/sky/k2-haze.glsl; night colours from railgun/src/sky/sun.ts.
import { BackSide, Color, FogExp2, Mesh, ShaderChunk, ShaderMaterial, SphereGeometry, Vector3 } from 'three';
import { disposeTree, onLeave, scene } from '../setup.ts';

/* ---------- the night air: a moonless sky, a faint horizon glow, low haze ---------- */
// Linear colours. The zenith is near black; the horizon glows a little.
export const ZENITH = new Color(0.0035, 0.0048, 0.011);
export const HORIZON = new Color(0.022, 0.024, 0.034);
// The haze takes the horizon colour, a little darker.
export const HAZE_C = HORIZON.clone().multiplyScalar(0.9);
// Haze density at the valley floor, per metre.
const HAZE_D = 0.003;
// The haze thins by e every 40 m of height: it lies in the valleys.
export const HAZE_H = 40;

// The haze along the line from the eye to P: 0 clear, 1 full.
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

// The sky shell sits inside the star shell; the stars add over it.
// The gradient follows Railgun's bare sky: zenith to horizon, a low band.
// The dusk sets these.
// At night they hold the night values.
// uWarm is the sunset glow, black at night.
// uSun points at the sunset on the horizon.
export const skyU = {
  uZen: { value: ZENITH.clone() }, uHor: { value: HORIZON.clone() },
  uWarm: { value: new Color(0, 0, 0) }, uSun: { value: new Vector3(-1, 0, 0) },
};
// The sky's colour in direction d.
// The far ridges share it, so they fade into the sky behind them.
export const SKY_GLSL = /* glsl */`
uniform vec3 uZen, uHor, uWarm, uSun;
vec3 skyColor(vec3 d) {
  float up = max(d.y, 0.0);
  vec3 col = mix(uHor, uZen, pow(up, 0.45));
  // The glow gathers in a thin band on the horizon.
  col = mix(col, uHor * 1.15, exp(-up * 14.0) * 0.55);
  // The sunset glow lies low and spreads wide round the sun.
  // The guard keeps the zenith free of a zero-length vector.
  vec2 h = d.xz / max(length(d.xz), 1e-4);
  float away = acos(clamp(dot(h, uSun.xz), -1.0, 1.0));
  col += uWarm * exp(-away / 0.75) * exp(-up * 10.0);
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
