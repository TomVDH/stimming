// The Gimbal view as the onboard camera's feed: a modern sensor.
// One scene render and one pass: mono with a cool white tint, fine grain, a wide lens.
// The HUD burns in through a key canvas, white and engraved, as in Railgun's sight.
import {
  ShaderMaterial, GLSL3, CanvasTexture, LinearFilter, WebGLRenderTarget, HalfFloatType,
  Scene, OrthographicCamera, Mesh, BufferGeometry, Float32BufferAttribute, Vector2
} from 'three';

const FEED_FS = /* glsl */`
  out highp vec4 outColor;
  uniform sampler2D tScene, tKey;
  uniform vec2 uTexel, uKeyTexel;
  uniform float uExpo, uGrain, uFrame, uLost;
  in vec2 vUv;
  float hash(vec2 p) { p = fract(p * vec2(443.897, 441.423)); p += dot(p, p.yx + 19.19); return fract((p.x + p.y) * p.x); }
  float lum(vec3 c) { return dot(max(c, 0.0), vec3(0.2126, 0.7152, 0.0722)); }
  // The main view's tone curve: three.js ACES at the same exposure.
  vec3 rrt(vec3 v) { vec3 a = v * (v + 0.0245786) - 0.000090537; vec3 b = v * (0.983729 * v + 0.4329510) + 0.238081; return a / b; }
  vec3 aces(vec3 c) {
    const mat3 IN = mat3(vec3(0.59719, 0.07600, 0.02840), vec3(0.35458, 0.90834, 0.13383), vec3(0.04823, 0.01566, 0.83777));
    const mat3 OUT = mat3(vec3(1.60475, -0.10208, -0.00327), vec3(-0.53108, 1.10813, -0.07276), vec3(-0.07367, -0.00605, 1.07602));
    return clamp(OUT * rrt(IN * (c * uExpo / 0.6)), 0.0, 1.0);
  }
  void main() {
    // A wide lens bends the frame a little toward its corners.
    vec2 p = vUv - 0.5;
    float r2 = dot(p, p);
    vec2 uv = 0.5 + p * (1.0 - 0.07 * r2);
    // A lost signal tears the rows sideways.
    float row = floor(uv.y * 180.0);
    uv.x += uLost * (hash(vec2(row, uFrame)) - 0.5) * 0.08;
    vec3 c = texture(tScene, uv).rgb;
    // Light sharpening: the camera's own edge boost.
    vec3 n = texture(tScene, uv + vec2(uTexel.x, 0.0)).rgb + texture(tScene, uv - vec2(uTexel.x, 0.0)).rgb
           + texture(tScene, uv + vec2(0.0, uTexel.y)).rgb + texture(tScene, uv - vec2(0.0, uTexel.y)).rgb;
    vec3 d = aces(max(c + 0.55 * (c - n * 0.25), 0.0));
    // Display gamma, then mono with a touch more contrast.
    float v = pow(lum(d), 1.0 / 2.2);
    v = clamp((v - 0.5) * 1.12 + 0.5, 0.0, 1.0);
    // Fine grain, a little stronger in the shadows.
    float g = hash(gl_FragCoord.xy + vec2(uFrame * 17.0, uFrame * 31.0)) - 0.5;
    v += g * (uGrain * (0.4 + 0.6 * (1.0 - v)) + uLost * 0.6);
    v *= 1.0 - 0.55 * r2;
    v *= 1.0 - 0.6 * uLost;
    vec3 o = vec3(clamp(v, 0.0, 1.0)) * vec3(0.93, 0.96, 1.0);

    // The HUD: white marks, engraved, with a soft dark rim.
    float b = texture(tKey, vUv).b;
    float rim = 0.0;
    for (int i = 0; i < 8; i++) {
      float a = float(i) * 0.7854;
      rim += texture(tKey, vUv + vec2(cos(a), sin(a)) * uKeyTexel * 2.5).b;
    }
    rim = clamp(rim / 8.0 * 1.6 - b, 0.0, 1.0);
    if (b > 0.002 || rim > 0.002) {
      float e = texture(tKey, vUv + vec2(-1.2, 1.2) * uKeyTexel).b - texture(tKey, vUv + vec2(1.2, -1.2) * uKeyTexel).b;
      o *= 1.0 - 0.4 * rim;
      o = mix(o, vec3(0.95, 0.97, 1.0), b * 0.92);
      // The offset sample lights one edge and shades the other.
      o += vec3(0.9, 0.95, 1.0) * clamp(e, -1.0, 1.0) * 0.3;
    }
    outColor = vec4(o, 1.0);
  }`;

/** @param {import('three').WebGLRenderer} renderer */
export function createFeed(renderer) {
  const f = { rt: null, kc: null, kx: null, tex: null, mat: null, size: '', w: 1, h: 1, frame: 0 };
  const quad = new Mesh((() => {
    const g = new BufferGeometry();
    g.setAttribute('position', new Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
    return g;
  })());
  quad.frustumCulled = false;
  const qScene = new Scene(), qCam = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  qScene.add(quad);

  function setup() {
    f.kc = document.createElement('canvas');
    f.kx = f.kc.getContext('2d');
    f.tex = new CanvasTexture(f.kc);
    f.tex.minFilter = LinearFilter;
    f.tex.generateMipmaps = false;
    f.mat = new ShaderMaterial({
      glslVersion: GLSL3, depthTest: false, depthWrite: false,
      uniforms: {
        tScene: { value: null }, tKey: { value: f.tex }, uTexel: { value: new Vector2() }, uKeyTexel: { value: new Vector2() },
        uExpo: { value: 1.15 }, uGrain: { value: .05 }, uFrame: { value: 0 }, uLost: { value: 0 }
      },
      vertexShader: /* glsl */`out vec2 vUv; void main() { vUv = position.xy * 0.5 + 0.5; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
      fragmentShader: FEED_FS
    });
    quad.material = f.mat;
  }

  return {
    size(w, h, dpr) {
      if (!f.mat) setup();
      const key = `${w}x${h}x${dpr}`;
      if (f.size === key) return;
      f.size = key;
      // The scene draws at up to 2.2 million pixels, with 4x MSAA.
      const s = Math.min(dpr, Math.sqrt(2.2e6 / (w * h)));
      const bw = Math.max(8, Math.round(w * s)), bh = Math.max(8, Math.round(h * s));
      f.rt?.dispose();
      f.rt = new WebGLRenderTarget(bw, bh, { type: HalfFloatType, samples: 4 });
      f.mat.uniforms.tScene.value = f.rt.texture;
      f.mat.uniforms.uTexel.value.set(1 / bw, 1 / bh);
      // The key canvas is one canvas pixel per CSS pixel.
      f.kc.width = Math.round(w); f.kc.height = Math.round(h);
      f.mat.uniforms.uKeyTexel.value.set(1 / f.kc.width, 1 / f.kc.height);
      f.tex.dispose();
      f.w = w; f.h = h;
    },
    cold() {},
    /**
     * One feed frame.
     * @param {(x: CanvasRenderingContext2D, w: number, h: number) => void} draw Draws the HUD in CSS pixels.
     * @param {number} lost 0 to 1: how far the signal is gone.
     */
    render(scene, camera, draw, reduced, lost) {
      f.frame++;
      renderer.setRenderTarget(f.rt);
      renderer.render(scene, camera);
      // The HUD redraws at 30 Hz; its marks move slower than the picture.
      if (f.frame % 2 === 0) {
        f.kx.setTransform(1, 0, 0, 1, 0, 0);
        f.kx.clearRect(0, 0, f.kc.width, f.kc.height);
        draw(f.kx, f.w, f.h);
        f.tex.needsUpdate = true;
      }
      const u = f.mat.uniforms;
      // Reduced motion holds the grain still.
      u.uFrame.value = reduced ? 1 : f.frame % 997;
      u.uLost.value = lost;
      renderer.setRenderTarget(null);
      renderer.render(qScene, qCam);
    }
  };
}
