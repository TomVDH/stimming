// Shared GLSL: the last step of a frame. Tone curve, sRGB and dither.
// For raw WebGL2 toys; a three.js toy has its renderer's ACES and an OutputPass.
// Paste OUTPUT into a fragment shader. It declares no uniforms.
// It compiles in raw WebGL2 and in a three.js ShaderMaterial.
//
// One call, for a scene with bright lights:
//   outC = vec4(ouFilm(col, exposure, gl_FragCoord.xy), 1.0);
// The parts, for a toy with its own order:
//   ouAces(c)        the film curve: bright light rolls off, never clips
//   ouKnee(c)        a soft shoulder above 0.8, for a scene that is not HDR
//   ouSrgb(c)        linear light to the screen's sRGB
//   ouDither(c, px)  half a step of noise, so dark gradients do not band
// Dither comes last, after ouSrgb. Add an offset to px to move the noise.

export const OUTPUT = /* glsl */`
float ouHash(vec2 p) { vec3 q = fract(p.xyx * 0.1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
vec3 ouAces(vec3 x) { return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0); }
vec3 ouKnee(vec3 c) { return mix(c, 0.8 + 0.2 * (1.0 - exp(-(c - 0.8) * 5.0)), step(0.8, c)); }
vec3 ouSrgb(vec3 c) { return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }
vec3 ouDither(vec3 c, vec2 px) { return c + (ouHash(px) - 0.5) / 255.0; }
// Exposure, the film curve, sRGB, then dither.
vec3 ouFilm(vec3 c, float exposure, vec2 px) { return ouDither(ouSrgb(ouAces(c * exposure)), px); }
`;
