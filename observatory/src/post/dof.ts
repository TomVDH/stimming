// Load order: none.
// The module builds its pass when the chain asks.
import { ShaderMaterial, Vector2 } from 'three';
import type { PerspectiveCamera, WebGLRenderer, WebGLRenderTarget } from 'three';
import { FullScreenQuad, Pass } from 'three/addons/postprocessing/Pass.js';

/* ---------- depth of field: a gather blur from the scene's depth ---------- */
// Only the cuts turn it on.
// Off, the composer skips the pass, so the wide shot pays nothing.
// Each pixel gathers a spiral of samples.
// A sample counts when its own blur circle reaches this pixel.
// So bright out-of-focus points spread into round discs.

// Samples in the spiral.
const N = 48;
// The largest blur circle, in pixels at a 752 px tall frame.
const MAX_R = 14;

const vert = /* glsl */`
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;

const frag = /* glsl */`
  uniform sampler2D tColor, tDepth;
  uniform vec2 uRes;
  uniform float uNear, uFar, uFocus, uAperture, uMaxR;
  varying vec2 vUv;
  // The depth buffer's value to metres from the eye.
  float metres(float d) { return uNear * uFar / (uFar - d * (uFar - uNear)); }
  // The blur circle's radius in pixels at a distance.
  // It grows with the distance from the focus plane, on both sides.
  float coc(float z) { return min(uMaxR, uAperture * uRes.y * abs(1.0 - uFocus / z)); }
  // A random turn per pixel.
  // It breaks the spiral's rings into fine noise.
  float spin(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453) * 6.2832; }
  void main() {
    vec4 c0 = texture2D(tColor, vUv);
    float rot = spin(gl_FragCoord.xy);
    float z0 = metres(texture2D(tDepth, vUv).x);
    float r0 = coc(z0);
    vec3 acc = c0.rgb;
    float wsum = 1.0;
    for (int i = 0; i < ${N}; i++) {
      float f = (float(i) + 0.5) / float(${N});
      float r = sqrt(f) * uMaxR;
      float a = float(i) * 2.39996 + rot;
      vec2 uv = vUv + vec2(cos(a), sin(a)) * r / uRes;
      vec3 c = texture2D(tColor, uv).rgb;
      float z = metres(texture2D(tDepth, uv).x);
      // A sample behind this pixel spreads no wider than this pixel's blur.
      // So a sharp subject keeps its edge over a soft background.
      float rs = z > z0 ? min(coc(z), r0) : coc(z);
      float w = smoothstep(r - 1.0, r + 1.0, rs);
      // Bright samples weigh more, so highlights open into discs.
      float lum = dot(c, vec3(0.2126, 0.7152, 0.0722));
      w *= 1.0 + 4.0 * max(0.0, lum - 0.8);
      acc += c * w;
      wsum += w;
    }
    gl_FragColor = vec4(acc / wsum, c0.a);
  }`;

export type Dof = Pass & {
  // focus: metres from the eye.
  // aperture: the blur at infinity, a share of the frame's height.
  set(focus: number, aperture: number): void;
};

export function makeDof(camera: PerspectiveCamera): Dof {
  const mat = new ShaderMaterial({
    uniforms: {
      tColor: { value: null }, tDepth: { value: null },
      uRes: { value: new Vector2(1, 1) },
      uNear: { value: camera.near }, uFar: { value: camera.far },
      uFocus: { value: 10 }, uAperture: { value: 0.01 }, uMaxR: { value: MAX_R },
    },
    vertexShader: vert,
    fragmentShader: frag,
    depthTest: false,
    depthWrite: false,
  });
  const quad = new FullScreenQuad(mat);
  const U = mat.uniforms;

  class DofPass extends Pass {
    set(focus: number, aperture: number): void {
      U.uFocus.value = focus;
      U.uAperture.value = aperture;
    }
    setSize(w: number, h: number): void {
      U.uRes.value.set(w, h);
      // The largest circle keeps its share of the frame's height.
      U.uMaxR.value = MAX_R * h / 752;
    }
    render(r: WebGLRenderer, write: WebGLRenderTarget, read: WebGLRenderTarget): void {
      U.tColor.value = read.texture;
      U.tDepth.value = read.depthTexture;
      U.uNear.value = camera.near;
      U.uFar.value = camera.far;
      r.setRenderTarget(this.renderToScreen ? null : write);
      quad.render(r);
    }
    dispose(): void {
      mat.dispose();
      quad.dispose();
    }
  }
  const pass = new DofPass();
  return pass;
}
