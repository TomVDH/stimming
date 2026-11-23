// Gas giant dive, passes 4 and 5: the composite and the final grade.
// Composite: the sky behind the half-size clouds. Final: bloom, exposure, shake, grade, the film curve.
import { COMMON } from './world.js';
import { SKY } from './sky.js';
import { GRADE } from '../shared/grade.js';
import { OUTPUT } from '../shared/output.js';

export const COMPOSITE_FS = /* glsl */`#version 300 es
precision highp float;
in vec2 vUv;
out vec4 o;
uniform sampler2D uClouds;
uniform vec3 uCam, uFwd, uRight, uUp;
${COMMON}
${SKY}
void main() {
  vec2 c = vUv * 2.0 - 1.0;
  vec3 rd = normalize(uFwd + c.x * uRight + c.y * uUp);
  vec4 cl = texture(uClouds, vUv);
  vec3 sky = skyAt(uCam, rd, altOf(uCam));
  o = vec4(sky * (1.0 - cl.a) + cl.rgb, 1.0);
}`;

// The final pass: exposure, the grade and the film curve. The cabin pass comes before it.
export const FINAL_FS = /* glsl */`#version 300 es
precision highp float;
in vec2 vUv;
out vec4 o;
uniform sampler2D uScene;
uniform float uExp, uSeed, uAsp;
${GRADE}
${OUTPUT}
void main() {
  vec3 c = texture(uScene, vUv).rgb;
  c = gdGrade(c * uExp, vUv, uAsp, gl_FragCoord.xy + vec2(uSeed * 37.0, uSeed * 91.0), vec3(0.0005, 0.0004, 0.0006), 0.42, 0.45, 0.035);
  o = vec4(ouFilmAces(c, 1.0, gl_FragCoord.xy), 1.0);
}`;
