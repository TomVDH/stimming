import * as THREE from 'three';

// Two-pass separable Gaussian backdrop blur and darkening behind the inspected hero bill.
// Keeps the hero banknote at full native sharpness while background rain melts into bokeh.

const FULL_VERT = /* glsl */ `
precision highp float;
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

const BLUR_FRAG = /* glsl */ `
precision highp float;

uniform sampler2D uTex;
uniform vec2 uStep;

varying vec2 vUv;

void main() {
  // Nine-tap wide Gaussian kernel produces smooth, ring-free bokeh in two passes.
  vec3 sum = texture2D(uTex, vUv).rgb * 0.204164;
  vec2 s1 = uStep * 1.407333;
  vec2 s2 = uStep * 3.294215;
  vec2 s3 = uStep * 5.2;
  vec2 s4 = uStep * 7.1;

  sum += (texture2D(uTex, vUv + s1).rgb + texture2D(uTex, vUv - s1).rgb) * 0.180173;
  sum += (texture2D(uTex, vUv + s2).rgb + texture2D(uTex, vUv - s2).rgb) * 0.123832;
  sum += (texture2D(uTex, vUv + s3).rgb + texture2D(uTex, vUv - s3).rgb) * 0.0642;
  sum += (texture2D(uTex, vUv + s4).rgb + texture2D(uTex, vUv - s4).rgb) * 0.029713;

  gl_FragColor = vec4(sum, 1.0);
}
`;

const COMPOSITE_FRAG = /* glsl */ `
precision highp float;

uniform sampler2D uSharp;
uniform sampler2D uBlur;
uniform float uMix;
uniform float uDarken;

varying vec2 vUv;

void main() {
  vec3 sharp = texture2D(uSharp, vUv).rgb;
  vec3 blurred = texture2D(uBlur, vUv).rgb;
  vec3 col = mix(sharp, blurred, smoothstep(0.0, 0.85, uMix));

  // Softly dims and vignettes the backdrop so the inspected bill floats while clear windows glow.
  vec2 p = vUv * 2.0 - 1.0;
  float vig = 1.0 - smoothstep(0.28, 1.48, length(p * vec2(0.9, 0.95)));
  float dim = mix(1.0, uDarken * (0.72 + 0.28 * vig), uMix);
  col *= dim;

  gl_FragColor = vec4(col, 1.0);
}
`;

export class InspectBackdrop {
  private bgTarget: THREE.WebGLRenderTarget;
  private blurA: THREE.WebGLRenderTarget;
  private blurB: THREE.WebGLRenderTarget;
  private quadGeo: THREE.PlaneGeometry;
  private blurMat: THREE.ShaderMaterial;
  private compMat: THREE.ShaderMaterial;
  private blurScene = new THREE.Scene();
  private compScene = new THREE.Scene();
  private orthoCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private blurW = 640;
  private blurH = 360;

  constructor() {
    const opts: THREE.RenderTargetOptions = {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      depthBuffer: true,
      stencilBuffer: false,
    };
    const blurOpts: THREE.RenderTargetOptions = {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      depthBuffer: false,
      stencilBuffer: false,
    };

    this.bgTarget = new THREE.WebGLRenderTarget(640, 360, opts);
    this.blurA = new THREE.WebGLRenderTarget(320, 180, blurOpts);
    this.blurB = new THREE.WebGLRenderTarget(320, 180, blurOpts);

    this.quadGeo = new THREE.PlaneGeometry(2, 2);
    this.blurMat = new THREE.ShaderMaterial({
      vertexShader: FULL_VERT,
      fragmentShader: BLUR_FRAG,
      uniforms: {
        uTex: { value: null },
        uStep: { value: new THREE.Vector2(1 / 320, 0) },
      },
      depthTest: false,
      depthWrite: false,
    });
    this.compMat = new THREE.ShaderMaterial({
      vertexShader: FULL_VERT,
      fragmentShader: COMPOSITE_FRAG,
      uniforms: {
        uSharp: { value: this.bgTarget.texture },
        uBlur: { value: this.blurB.texture },
        uMix: { value: 0 },
        uDarken: { value: 0.62 },
      },
      depthTest: false,
      depthWrite: false,
    });

    this.blurScene.add(new THREE.Mesh(this.quadGeo, this.blurMat));
    this.compScene.add(new THREE.Mesh(this.quadGeo, this.compMat));
  }

  resize(widthPx: number, heightPx: number) {
    const w = Math.max(2, Math.round(widthPx));
    const h = Math.max(2, Math.round(heightPx));
    // Half-resolution capture and quarter-resolution blur keep bokeh wide and silky at 60 fps.
    const capW = Math.max(2, Math.round(w * 0.55));
    const capH = Math.max(2, Math.round(h * 0.55));
    this.blurW = Math.max(2, Math.round(w * 0.28));
    this.blurH = Math.max(2, Math.round(h * 0.28));

    this.bgTarget.setSize(capW, capH);
    this.blurA.setSize(this.blurW, this.blurH);
    this.blurB.setSize(this.blurW, this.blurH);
  }

  render(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.Camera,
    heroMesh: THREE.Object3D,
    inspectMix: number,
    blurStrength: number,
    darkenLevel: number,
  ) {
    // Fast direct path when not inspecting incurs zero offscreen render cost.
    if (inspectMix <= 0.004) {
      renderer.setRenderTarget(null);
      renderer.render(scene, camera);
      return;
    }

    const heroWasVisible = heroMesh.visible;

    // 1. Capture stage and falling rain bills without the hero bill.
    heroMesh.visible = false;
    renderer.setRenderTarget(this.bgTarget);
    renderer.clear();
    renderer.render(scene, camera);

    // 2. Two-pass separable wide Gaussian blur (horizontal, then vertical), repeated once for creamy bokeh.
    const radius = (0.65 + 1.85 * inspectMix) * blurStrength;

    this.blurMat.uniforms.uTex.value = this.bgTarget.texture;
    (this.blurMat.uniforms.uStep.value as THREE.Vector2).set(radius / this.blurW, 0);
    renderer.setRenderTarget(this.blurA);
    renderer.render(this.blurScene, this.orthoCam);

    this.blurMat.uniforms.uTex.value = this.blurA.texture;
    (this.blurMat.uniforms.uStep.value as THREE.Vector2).set(0, radius / this.blurH);
    renderer.setRenderTarget(this.blurB);
    renderer.render(this.blurScene, this.orthoCam);

    // Second soft pass eliminates any directional banding at large blur radii.
    const r2 = radius * 1.35;
    this.blurMat.uniforms.uTex.value = this.blurB.texture;
    (this.blurMat.uniforms.uStep.value as THREE.Vector2).set(r2 / this.blurW, 0);
    renderer.setRenderTarget(this.blurA);
    renderer.render(this.blurScene, this.orthoCam);

    this.blurMat.uniforms.uTex.value = this.blurA.texture;
    (this.blurMat.uniforms.uStep.value as THREE.Vector2).set(0, r2 / this.blurH);
    renderer.setRenderTarget(this.blurB);
    renderer.render(this.blurScene, this.orthoCam);

    // 3. Draw darkened blurred backdrop onto main framebuffer.
    this.compMat.uniforms.uMix.value = inspectMix;
    this.compMat.uniforms.uDarken.value = darkenLevel;
    renderer.setRenderTarget(null);
    renderer.clear();
    renderer.render(this.compScene, this.orthoCam);

    // 4. Render hero bill directly to full-res MSAA framebuffer with crisp depth.
    heroMesh.visible = heroWasVisible;
    if (heroWasVisible) {
      const prevAuto = renderer.autoClear;
      renderer.autoClear = false;
      renderer.clearDepth();
      const hidden: THREE.Object3D[] = [];
      for (const child of scene.children) {
        if (child !== heroMesh && child.visible) {
          child.visible = false;
          hidden.push(child);
        }
      }
      renderer.render(scene, camera);
      for (const child of hidden) child.visible = true;
      renderer.autoClear = prevAuto;
    }
  }

  dispose() {
    this.bgTarget.dispose();
    this.blurA.dispose();
    this.blurB.dispose();
    this.quadGeo.dispose();
    this.blurMat.dispose();
    this.compMat.dispose();
  }
}
