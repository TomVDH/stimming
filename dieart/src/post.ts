// Optical microscope post-processing pipeline: subtle bloom + eyepiece vignette,
// edge chromatic dispersion, sensor micro-grain, and focus-plane defocus bokeh.

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

const MICROSCOPE_OPTICS_SHADER = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    uResolution: { value: new THREE.Vector2(1280, 720) },
    uDefocus: { value: 0.0 },
    uAberration: { value: 0.0022 },
    uVignette: { value: 0.42 },
    uTime: { value: 0.0 },
    uReduced: { value: 0.0 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform vec2 uResolution;
    uniform float uDefocus;
    uniform float uAberration;
    uniform float uVignette;
    uniform float uTime;
    uniform float uReduced;
    varying vec2 vUv;

    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
    }

    void main() {
      vec2 centered = vUv - 0.5;
      float aspect = uResolution.x / max(1.0, uResolution.y);
      vec2 radial = vec2(centered.x * aspect, centered.y);
      float r2 = dot(radial, radial);

      // Lateral objective chromatic dispersion (strongest near lens periphery)
      vec2 caOff = centered * uAberration * (0.45 + 1.85 * r2) * (1.0 - 0.65 * uReduced);

      vec3 col;
      if (uDefocus > 0.008) {
        // Soft 9-tap circular optical bokeh when focal plane sits outside active metal stack
        vec2 texel = (1.0 / max(uResolution, vec2(1.0))) * (uDefocus * 5.2);
        vec3 acc = vec3(0.0);
        acc += texture2D(tDiffuse, vUv).rgb * 0.22;
        acc += texture2D(tDiffuse, vUv + vec2( texel.x,  0.0)).rgb * 0.105;
        acc += texture2D(tDiffuse, vUv + vec2(-texel.x,  0.0)).rgb * 0.105;
        acc += texture2D(tDiffuse, vUv + vec2( 0.0,  texel.y)).rgb * 0.105;
        acc += texture2D(tDiffuse, vUv + vec2( 0.0, -texel.y)).rgb * 0.105;
        vec2 d = texel * 0.72;
        acc += texture2D(tDiffuse, vUv + vec2( d.x,  d.y)).rgb * 0.09;
        acc += texture2D(tDiffuse, vUv + vec2(-d.x,  d.y)).rgb * 0.09;
        acc += texture2D(tDiffuse, vUv + vec2( d.x, -d.y)).rgb * 0.09;
        acc += texture2D(tDiffuse, vUv + vec2(-d.x, -d.y)).rgb * 0.09;
        col = acc;
      } else {
        float r = texture2D(tDiffuse, vUv + caOff).r;
        float g = texture2D(tDiffuse, vUv).g;
        float b = texture2D(tDiffuse, vUv - caOff).b;
        col = vec3(r, g, b);
      }

      // Gentle optical eyepiece vignette
      float vig = 1.0 - smoothstep(0.18, 1.32, r2) * uVignette;
      col *= vig;

      // Subtle photographic sensor grain to eliminate darkfield banding
      float gSeed = uReduced > 0.5 ? 0.0 : floor(uTime * 15.0) * 0.13;
      float grain = (hash(gl_FragCoord.xy + gSeed) - 0.5) * 0.016;
      col += grain;

      // Clean ACES-like filmic shoulder so bright darkfield glints never clip harshly
      col = (col * (2.51 * col + 0.03)) / (col * (2.43 * col + 0.59) + 0.14);

      gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
    }
  `,
};

export interface OpticsPipeline {
  composer: EffectComposer;
  bloom: UnrealBloomPass;
  opticsPass: ShaderPass;
  resize(w: number, h: number, dpr: number, highQuality: boolean): void;
  dispose(): void;
}

export function createOpticsPipeline(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.Camera
): OpticsPipeline {
  const composer = new EffectComposer(renderer);
  const renderPass = new RenderPass(scene, camera);
  const bloom = new UnrealBloomPass(new THREE.Vector2(512, 512), 0.34, 0.42, 0.72);
  const opticsPass = new ShaderPass(MICROSCOPE_OPTICS_SHADER);

  composer.addPass(renderPass);
  composer.addPass(bloom);
  composer.addPass(opticsPass);

  return {
    composer,
    bloom,
    opticsPass,
    resize(w: number, h: number, dpr: number, highQuality: boolean) {
      composer.setPixelRatio(dpr);
      composer.setSize(w, h);
      const bloomScale = highQuality ? 0.75 : 0.45;
      bloom.resolution.set(
        Math.max(128, Math.floor(w * dpr * bloomScale)),
        Math.max(128, Math.floor(h * dpr * bloomScale))
      );
      opticsPass.uniforms.uResolution.value.set(w * dpr, h * dpr);
    },
    dispose() {
      bloom.dispose();
      composer.dispose();
    },
  };
}
