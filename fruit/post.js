// Fruit post: the lens finish.
// Scene to a float target, then depth of field, bloom, then ACES, vignette and grain.
import * as THREE from 'three';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { FullScreenQuad } from 'three/addons/postprocessing/Pass.js';

// Depth of field: a disc gather. Each tap counts if its own blur reaches the centre.
const DOF = /* glsl */`
uniform sampler2D tCol, tDepth;
uniform vec2 uRes;
uniform float uNear, uFar, uFocus, uAperture, uMaxR;
varying vec2 vUv;
#ifndef TAPS
#define TAPS 32
#endif
float lin(float d) { float z = d * 2.0 - 1.0; return 2.0 * uNear * uFar / (uFar + uNear - z * (uFar - uNear)); }
// The blur radius in pixels; negative in front of the focus plane.
float coc(float z) { return clamp(uAperture * (z - uFocus) / z * uRes.y, -uMaxR, uMaxR); }
void main() {
  vec3 c0 = texture2D(tCol, vUv).rgb;
  float r0 = coc(lin(texture2D(tDepth, vUv).r));
  vec3 acc = c0;
  float wsum = 1.0, fg = 0.0;
  const float GA = 2.39996323;
  float R = uMaxR;
  // A turn per pixel breaks the spiral into fine noise.
  float rot = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) * 6.2832;
  for (int i = 1; i < TAPS; i++) {
    float fi = float(i);
    float r = sqrt(fi / float(TAPS)) * R;
    vec2 o = vec2(cos(fi * GA + rot), sin(fi * GA + rot)) * r;
    vec2 uv = vUv + o / uRes;
    vec3 c = texture2D(tCol, uv).rgb;
    float rs = coc(lin(texture2D(tDepth, uv).r));
    // A far tap behind a sharp centre cannot bleed onto it.
    float rr = rs > r0 ? clamp(abs(r0) * 2.0, 0.0, abs(rs)) : abs(rs);
    float w = smoothstep(r - 1.5, r + 1.5, rr);
    // Bright taps weigh more: highlights open into discs.
    w *= 1.0 + 0.6 * smoothstep(1.2, 4.0, dot(c, vec3(0.3, 0.5, 0.2)));
    acc += c * w;
    wsum += w;
    if (rs < -abs(r0) - 1.0) fg += w;
  }
  vec3 b = acc / wsum;
  // A sharp centre keeps its own colour, unless a near blur covers it.
  float k = max(smoothstep(0.5, 1.8, abs(r0)), clamp(fg / float(TAPS) * 3.0, 0.0, 1.0));
  gl_FragColor = vec4(mix(c0, b, k), 1.0);
}`;

const GRADE = /* glsl */`
#include <tonemapping_pars_fragment>
uniform sampler2D tCol;
uniform float uFrame, uAsp, uGrain;
varying vec2 vUv;
float hh(vec2 p) { vec3 q = fract(vec3(p.xyx) * 0.1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
void main() {
  vec3 c = texture2D(tCol, vUv).rgb;
  // A lens vignette: a wide oval falloff.
  vec2 q = (vUv - 0.5) * vec2(uAsp, 1.0);
  c *= mix(1.0, 0.55, smoothstep(0.35, 1.05, length(q)));
  c = ACESFilmicToneMapping(c);
  c = sRGBTransferOETF(vec4(c, 1.0)).rgb;
  // Film grain, a new field each frame, finer in the lights.
  float g = hh(gl_FragCoord.xy + uFrame * 17.0) - 0.5;
  c += g * uGrain * (1.0 - 0.6 * dot(c, vec3(0.33)));
  gl_FragColor = vec4(c, 1.0);
}`;

const VERT = 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';

export function makePost(renderer) {
  let rt = null, rtB = null, level = 1, w = 2, h = 2;
  const dofM = new THREE.ShaderMaterial({
    uniforms: {
      tCol: { value: null }, tDepth: { value: null }, uRes: { value: new THREE.Vector2() },
      uNear: { value: 0.1 }, uFar: { value: 80 }, uFocus: { value: 5 }, uAperture: { value: 0.012 }, uMaxR: { value: 14 },
    },
    vertexShader: VERT, fragmentShader: DOF, depthTest: false, depthWrite: false,
  });
  const gradeM = new THREE.ShaderMaterial({
    uniforms: { tCol: { value: null }, uFrame: { value: 0 }, uAsp: { value: 1.6 }, uGrain: { value: 0.035 }, toneMappingExposure: { value: 1.0 } },
    vertexShader: VERT, fragmentShader: GRADE, depthTest: false, depthWrite: false,
  });
  const dofQ = new FullScreenQuad(dofM), gradeQ = new FullScreenQuad(gradeM);
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.32, 0.55, 1.15);

  function build() {
    rt?.dispose(); rtB?.dispose();
    const depth = new THREE.DepthTexture(w, h);
    depth.type = THREE.FloatType;
    rt = new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, samples: level >= 1 ? 4 : 0, depthTexture: depth, depthBuffer: true });
    rtB = new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, depthBuffer: false });
    dofM.uniforms.tCol.value = rt.texture;
    dofM.uniforms.tDepth.value = depth;
  }

  return {
    // The quality level sets the taps, the samples and the bloom size.
    resize(W, H, lv, rung) {
      const re = !rt || W !== w || H !== h || level !== lv;
      w = W; h = H; level = lv;
      if (re) build();
      dofM.defines.TAPS = lv >= 2 ? 48 : 28;
      dofM.needsUpdate = true;
      dofM.uniforms.uRes.value.set(w, h);
      dofM.uniforms.uMaxR.value = Math.max(5, h / 800 * (lv >= 2 ? 22 : 16));
      gradeM.uniforms.uAsp.value = w / h;
      const bk = rung >= 2 || lv === 0 ? 0.25 : 0.5;
      bloom.setSize(Math.round(w * bk), Math.round(h * bk));
    },
    render(scene, camera, { frame = 0, focus = 5, aperture = 0.012 } = {}) {
      renderer.setRenderTarget(rt);
      renderer.render(scene, camera);
      let src = rt;
      if (level >= 1) {
        dofM.uniforms.uNear.value = camera.near;
        dofM.uniforms.uFar.value = camera.far;
        dofM.uniforms.uFocus.value = focus;
        dofM.uniforms.uAperture.value = aperture;
        renderer.setRenderTarget(rtB);
        dofQ.render(renderer);
        src = rtB;
      }
      bloom.render(renderer, null, src, 0, false);
      gradeM.uniforms.tCol.value = src.texture;
      gradeM.uniforms.uFrame.value = frame % 97;
      renderer.setRenderTarget(null);
      gradeQ.render(renderer);
    },
    dispose() { rt?.dispose(); rtB?.dispose(); bloom.dispose(); dofM.dispose(); gradeM.dispose(); },
  };
}
