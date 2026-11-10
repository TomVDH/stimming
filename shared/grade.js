// Shared GLSL: the grade. A tint, a vignette and film grain on linear colour.
// It runs before tone mapping, as in the night-scene toys.
// Paste GRADE into a fragment shader. It declares no uniforms.
// It compiles in raw WebGL2 and in a three.js ShaderMaterial.
//
// One call:
//   c = gdGrade(c, uv, asp, gl_FragCoord.xy, tint, vig, vigIn, grain);
// uv is 0 to 1 on the frame. asp is width over height.
// tint lifts the blacks. vig darkens the corners; vigIn is where that starts.
// Add an offset to gl_FragCoord.xy to move the grain from frame to frame.
//
// The parts, for a grade with its own steps:
//   c *= gdVignette(uv, asp, vig, vigIn);
//   c *= gdGrain(gdHash(gl_FragCoord.xy), gdLuma(c), grain, vec2(0.6, 1.0));
// The vec2 is the grain strength in the shadows and in the lights.
//
// three.js: new ShaderPass(gradePass({ tint, vig, vigIn, grain })).
// fxlab/ shows each toy's copy against this module.

export const GRADE = /* glsl */`
float gdLuma(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
// An integer hash per pixel; float hashes draw faint stripes.
float gdHashU(uvec2 q) {
  uint n = (q.x * 1597334677u) ^ (q.y * 3812015801u);
  n *= 1597334677u; n ^= n >> 16; n *= 2246822519u; n ^= n >> 13;
  return float(n) / 4294967295.0;
}
float gdHash(vec2 p) { return gdHashU(uvec2(p)); }
// Interleaved gradient noise: fine grain with no banding.
float gdIgn(vec2 p) { return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715)))); }
// The old sine hash. Night viaduct keeps it.
float gdHashSin(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
// The vignette factor: 1 inside the inner edge, darker toward the corners.
float gdVignette(vec2 uv, float asp, float amt, float inner) {
  vec2 q = (uv - 0.5) * vec2(asp, 1.0);
  return 1.0 - amt * smoothstep(inner, 1.1, length(q));
}
// The grain factor. n is a hash from 0 to 1; lum is the pixel's brightness.
// w holds the strength in the shadows and in the lights.
float gdGrain(float n, float lum, float amt, vec2 w) {
  return 1.0 + (n - 0.5) * amt * mix(w.x, w.y, smoothstep(0.0, 0.3, lum)) * 2.0;
}
// The night-scene grade: tint, vignette, then grain that eases off in the shadows.
vec3 gdGrade(vec3 c, vec2 uv, float asp, vec2 px, vec3 tint, float vig, float vigIn, float grain) {
  c += tint;
  c *= gdVignette(uv, asp, vig, vigIn);
  c *= gdGrain(gdHash(px), gdLuma(c), grain, vec2(0.6, 1.0));
  return max(c, 0.0);
}
`;

// The grain source per noise kind. Only the integer hash moves with uSeed.
const NOISE = {
  int: 'gdHash(gl_FragCoord.xy + vec2(uSeed * 37.0, uSeed * 91.0))',
  ign: 'gdIgn(vUv * uRes)',
  sin: 'gdHashSin(vUv * uRes)',
};

// A shader for a three.js ShaderPass: the night-scene grade.
// Set uRes to the frame size in pixels. Step uSeed to move the grain.
// tint and res pass through as given: arrays, or three.js vectors.
// noise: 'int' (default), 'ign' or 'sin'.
export function gradePass({ tint = [0, 0, 0], vig = 0.5, vigIn = 0.4, grain = 0.03, res = [1, 1], noise = 'int' } = {}) {
  return {
    uniforms: {
      tDiffuse: { value: null }, uRes: { value: res }, uTint: { value: tint },
      uVig: { value: vig }, uVigIn: { value: vigIn }, uGrain: { value: grain }, uSeed: { value: 0 },
    },
    vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform sampler2D tDiffuse; uniform vec2 uRes; uniform vec3 uTint; uniform float uVig, uVigIn, uGrain, uSeed; varying vec2 vUv;
${GRADE}
void main() {
  vec3 c = texture(tDiffuse, vUv).rgb + uTint;
  c *= gdVignette(vUv, uRes.x / uRes.y, uVig, uVigIn);
  c *= gdGrain(${NOISE[noise] || NOISE.int}, gdLuma(c), uGrain, vec2(0.6, 1.0));
  gl_FragColor = vec4(max(c, 0.0), 1.0);
}`,
  };
}
