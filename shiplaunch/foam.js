// Ship launch foam: a tileable foam pattern, baked once on the GPU.
// Ported to GLSL from Ponlai's FoamPattern.ts (github.com/HuberyLL/ponlai),
// which adapts tidewater's FoamTexture.js (github.com/dgreenheck/tidewater).
// Copyright (c) 2026 DRG Software Solutions LLC. MIT licence.
// R: the fresh mat. G: the aged lace, 1 on a vein. B: soft mottling. A: streaks.
// The water thresholds them by the local foam: a mat tears, then thins to lace.
import * as THREE from 'three';

const FS = /* glsl */`
precision highp float;
uniform float uSize;
out vec4 fc;
vec2 hash2(vec2 p) { return fract(sin(vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)))) * 43758.5453); }
// Periodic Worley: the distances to the nearest and second nearest point.
vec2 worley2(vec2 uv, float cells) {
  vec2 p = uv * cells, ip = floor(p), fp = fract(p);
  float f1 = 8.0, f2 = 8.0;
  for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
    vec2 o = vec2(float(i), float(j));
    vec2 h = hash2(mod(ip + o, cells));
    float d = length(o + h - fp);
    f2 = max(min(f2, d), f1);
    f1 = min(f1, d);
  }
  return vec2(f1, f2);
}
float worley(vec2 uv, float cells) { return worley2(uv, cells).x; }
float vnoise(vec2 uv, float cells) {
  vec2 p = uv * cells, i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash2(mod(i, cells)).x, b = hash2(mod(i + vec2(1, 0), cells)).x;
  float c = hash2(mod(i + vec2(0, 1), cells)).x, d = hash2(mod(i + vec2(1, 1), cells)).x;
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}
float fbm(vec2 uv, float base, int oct) {
  float s = 0.0, a = 0.5, n = 0.0, c = base;
  for (int o = 0; o < 6; o++) {
    if (o >= oct) break;
    s += vnoise(uv, c) * a; n += a; a *= 0.5; c *= 2.0;
  }
  return s / n;
}
void main() {
  vec2 uv = gl_FragCoord.xy / uSize;
  // A domain warp gives flowing shapes.
  vec2 w1 = (vec2(fbm(uv, 3.0, 4), fbm(uv + 0.43, 3.0, 4)) - 0.5) * 0.14;
  vec2 wuv = uv + w1;
  float dens = fbm(wuv, 4.0, 6);
  // Holes of many sizes punch through the mat.
  float holeA = smoothstep(0.28, 0.12, worley(wuv, 7.0) + (fbm(uv, 16.0, 3) - 0.5) * 0.25);
  float holeB = smoothstep(0.30, 0.16, worley(wuv + 0.17, 19.0) + (fbm(uv, 32.0, 2) - 0.5) * 0.3);
  float holeC = smoothstep(0.32, 0.18, worley(wuv + 0.61, 47.0));
  float holes = clamp(holeA * 0.9 + holeB * 0.7 + holeC * 0.45, 0.0, 1.0);
  float bubbles = smoothstep(0.24, 0.08, worley(uv + 0.33, 140.0)) * 0.8 + smoothstep(0.2, 0.05, worley(uv + 0.71, 260.0)) * 0.5;
  float streak = fbm(uv + w1 * 2.0, 12.0, 4);
  float foam = clamp(dens * 1.35 - holes * 0.55 + bubbles * 0.08, 0.0, 1.0);
  float mottle = fbm(uv, 2.0, 3);
  // Lace: veins on the borders of warped Worley cells, of two sizes.
  vec2 lw = (vec2(fbm(uv + 0.11, 5.0, 4), fbm(uv + 0.67, 5.0, 4)) - 0.5) * 0.2;
  vec2 luv = uv + lw + w1;
  vec2 cA = worley2(luv, 13.0), cB = worley2(luv + 0.29, 31.0);
  float veinA = 1.0 - smoothstep(0.0, 0.55, cA.y - cA.x);
  float veinB = 1.0 - smoothstep(0.0, 0.5, cB.y - cB.x);
  float str = fbm(uv + 0.53, 24.0, 3);
  float lace = clamp(max(veinA * (str * 0.5 + 0.62), veinB * (str * 0.6 + 0.42)) + bubbles * 0.12, 0.0, 1.0);
  fc = vec4(foam, lace, mottle, streak);
}`;

/** Bakes the pattern into a repeating, mipmapped texture. */
export function bakeFoam(renderer, size = 512) {
  const rt = new THREE.WebGLRenderTarget(size, size, {
    type: THREE.HalfFloatType, wrapS: THREE.RepeatWrapping, wrapT: THREE.RepeatWrapping,
    minFilter: THREE.LinearMipmapLinearFilter, magFilter: THREE.LinearFilter, generateMipmaps: true, depthBuffer: false,
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
  const mat = new THREE.RawShaderMaterial({
    uniforms: { uSize: { value: size } }, glslVersion: THREE.GLSL3,
    vertexShader: 'in vec3 position; void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }', fragmentShader: FS,
  });
  const scene = new THREE.Scene();
  scene.add(new THREE.Mesh(geo, mat));
  renderer.setRenderTarget(rt);
  renderer.render(scene, new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1));
  renderer.setRenderTarget(null);
  geo.dispose(); mat.dispose();
  return rt.texture;
}
