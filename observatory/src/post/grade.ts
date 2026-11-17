// Load order: post/bloom runs first.
import './bloom.ts';
// Copied from railgun/src/post/grade.ts.
// Only the base grade and grain stay.
import { Vector2, Vector3 } from 'three';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

/* ---------- grade ---------- */
// Linear grade before tone mapping: split tone, contrast, vignette, grain.
// The grade's base look: shadow tint, vignette and grain.
export interface GradeLook { tint: [number, number, number]; vig: number; vigIn: number; grain: number }
export function makeGrade({ tint, vig, vigIn, grain }: GradeLook) {
  return new ShaderPass({
    uniforms: {
      tDiffuse: { value: null },
      uRes: { value: new Vector2(1, 1) },
      uTint: { value: new Vector3(...tint) },
      uVig: { value: vig },
      uVigIn: { value: vigIn },
      uGrain: { value: grain },
      uSeed: { value: 0 },
      // The grain's cell in device pixels: 1 is one hash per pixel.
      uCell: { value: 1 },
      // Contrast power, saturation and brightness: Railgun's defaults.
      uCon: { value: 0.24 }, uSat: { value: 1.06 }, uBri: { value: 0.78 },
    },
    vertexShader: /* glsl */`varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse;
    uniform vec2 uRes;
    uniform vec3 uTint;
    uniform float uVig, uVigIn, uGrain, uSeed, uCell, uCon, uSat, uBri;
    varying vec2 vUv;
    float h(vec2 p) {
      uvec2 q = uvec2(p);
      uint n = (q.x * 1597334677u) ^ (q.y * 3812015801u);
      n *= 1597334677u; n ^= n >> 16; n *= 2246822519u; n ^= n >> 13;
      return float(n) / 4294967295.0;
    }
    void main() {
      vec3 c = texture2D(tDiffuse, vUv).rgb + uTint;
      float l0 = dot(c, vec3(0.2126, 0.7152, 0.0722));
      c *= mix(vec3(0.9, 0.97, 1.12), vec3(1.1, 1.0, 0.88), smoothstep(0.0, 0.5, sqrt(max(l0, 0.0))));
      // Contrast: shadows sink and highs lift round a mid grey.
      float lc = max(dot(c, vec3(0.2126, 0.7152, 0.0722)), 1e-5);
      c *= pow(lc / 0.18, uCon);
      lc = dot(c, vec3(0.2126, 0.7152, 0.0722));
      // A restrained palette: colour pulled back, shadows cool, highs warm.
      c = max(mix(vec3(lc), c, uSat), 0.0) * uBri;
      c *= mix(vec3(0.94, 0.98, 1.06), vec3(1.04, 1.0, 0.95), smoothstep(0.02, 0.6, lc));
      // A soft matte floor: the deepest blacks lift a touch.
      c += vec3(0.004, 0.0045, 0.006) * (1.0 - smoothstep(0.0, 0.05, lc));
      vec2 q = (vUv - 0.5) * vec2(uRes.x / uRes.y, 1.0);
      c *= 1.0 - uVig * smoothstep(uVigIn, 1.1, length(q));
      // Grain: one hash per cell, strongest in the shadows.
      float lum = dot(c, vec3(0.2126, 0.7152, 0.0722));
      vec2 gp = floor(gl_FragCoord.xy / uCell) + vec2(uSeed * 37.0, uSeed * 91.0);
      c *= 1.0 + (h(gp) - 0.5) * uGrain * (1.2 - 0.6 * smoothstep(0.0, 0.3, lum)) * 2.0;
      gl_FragColor = vec4(max(c, 0.0), 1.0);
    }`,
  });
}
