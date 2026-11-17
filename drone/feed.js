// The Gimbal view as the onboard camera's feed.
// The frame runs through the NVG toy's image tube, white phosphor, as Railgun's sight does.
// A modern sensor: a strong signal and fine grain, so the picture stays clean.
// Marks and numbers burn in as negatives through a key canvas.
import { ShaderMaterial, GLSL3, CanvasTexture, LinearFilter, WebGLRenderTarget, HalfFloatType } from 'three';
import { Tube } from '../nvg/tube.js';

const KEY_FS = /* glsl */`
  out highp vec4 outColor;
  uniform sampler2D tImg, tKey;
  uniform vec2 uTexel;
  uniform float uNeg;
  in vec2 vUv;
  void main() {
    vec3 c = texture(tImg, vUv).rgb;
    vec4 k = texture(tKey, vUv);
    // Green: the picture turns to its negative under the live marks.
    vec3 o = mix(c, 1.0 - c, clamp(k.g, 0.0, 1.0) * uNeg);
    // Red: the text core takes the far extreme of the light round it.
    // A plain negative vanishes on mid grey; the core never does.
    if (k.r > 0.004) {
      float L = 0.0;
      for (int y = -2; y <= 2; y++) for (int x = -2; x <= 2; x++)
        L += dot(texture(tImg, vUv + vec2(x, y) * uTexel * 3.0).rgb, vec3(0.2126, 0.7152, 0.0722));
      L /= 25.0;
      vec3 far = L < 0.5 ? vec3(0.93, 0.96, 1.0) : vec3(0.02);
      o = mix(o, far, clamp(k.r, 0.0, 1.0));
    }
    // Blue: the HUD is burned into the phosphor, as Railgun's sight is.
    // The picture dims inside the marks; its own grain shows through.
    // An offset sample lights one edge and shades the other.
    float b = clamp(k.b, 0.0, 1.0);
    // A wider ring of samples: the soft rim round each mark.
    float rim = 0.0;
    for (int i = 0; i < 8; i++) {
      float a = float(i) * 0.7854;
      rim += texture(tKey, vUv + vec2(cos(a), sin(a)) * uTexel * 3.0).b;
    }
    rim = clamp(rim / 8.0 * 1.6 - b, 0.0, 1.0);
    if (b > 0.002 || rim > 0.002) {
      float e = texture(tKey, vUv + vec2(-1.5, 1.5) * uTexel).b - texture(tKey, vUv + vec2(1.5, -1.5) * uTexel).b;
      // Tom: white marks, still engraved.
      // A dark rim lets white read on a bright sky.
      o *= 1.0 - 0.4 * rim;
      o = mix(o, vec3(0.95, 0.97, 1.0), b * 0.92);
      // The offset sample lights one edge and shades the other.
      o += vec3(0.9, 0.95, 1.0) * clamp(e, -1.0, 1.0) * 0.3;
    }
    outColor = vec4(o, 1.0);
  }`;

/** @param {import('three').WebGLRenderer} renderer */
export function createFeed(renderer) {
  const f = { tube: null, out: null, kc: null, kx: null, tex: null, mat: null, size: '', kd: 1, last: 0 };

  function setup() {
    // Known warning: on Windows D3D11 the tube shaders log X4000 notes once.
    // They come from nvg/tube.js; the shaders still compile and run.
    const t = f.tube = new Tube(renderer);
    // The tube renders the scene itself, then works on the light.
    t.sigU.uCam.value = 0;
    t.sigU.uExpo.value = 320;
    const tu = t.mTube.uniforms;
    tu.uPower.value = 1; tu.uScint.value = 0.00003; tu.uKq.value = 0.55;
    tu.uTail.value = 0.03; tu.uTau.value = 0.08;
    t.mGain.uniforms.uGmax.value = 0.022 * Math.pow(14, 0.55);
    t.mOut.uniforms.uPhos.value = 1;
    // No colour fringe and no honeycomb, as in Railgun's sight.
    // A modern sensor has no dead spots either: the blemish loop runs zero times.
    t.mOut.fragmentShader = t.mOut.fragmentShader.replace('float ca = 0.006 * d * d;', 'float ca = 0.0;');
    t.mTube.fragmentShader = t.mTube.fragmentShader
      .replace('float fp = 1.0 + 0.07 * (h2(fib.xy * 4.0, 11.0 + fi) - 0.5);', 'float fp = 1.0;')
      .replace('fp *= 1.0 - 0.14 * smoothstep(0.04, 0.0, mf.z);', '')
      .replace('for (int k = 0; k < 6; k++) {', 'for (int k = 0; k < 0; k++) {');
    // The tube's last pass draws into a target; the key pass then draws on screen.
    const pass0 = t.pass.bind(t);
    t.pass = (m, target) => pass0(m, m === t.mOut ? f.out : target);
    f.kc = document.createElement('canvas');
    f.kx = f.kc.getContext('2d');
    f.tex = new CanvasTexture(f.kc);
    f.tex.minFilter = LinearFilter;
    f.tex.generateMipmaps = false;
    f.tex.premultiplyAlpha = true;
    f.mat = new ShaderMaterial({
      glslVersion: GLSL3, depthTest: false, depthWrite: false,
      uniforms: { tImg: { value: null }, tKey: { value: f.tex }, uTexel: { value: null }, uNeg: { value: .9 } },
      vertexShader: /* glsl */`out vec2 vUv; void main() { vUv = position.xy * 0.5 + 0.5; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
      fragmentShader: KEY_FS
    });
  }

  function size(w, h, dpr) {
    if (!f.tube) setup();
    const key = `${w}x${h}x${dpr}`;
    if (f.size === key) return;
    f.size = key;
    // Finer grain cells than the NVG toy's, for a sharper sensor.
    const s = Math.min(dpr, Math.sqrt(2e6 / (w * h)));
    f.tube.resize(w, h, s, .8, 0);
    f.tube.setTubes([{ x: w / 2, y: h / 2, r: Math.hypot(w, h) / 2 * 1.08, trim: 1 }]);
    f.tube.cold();
    const bw = Math.round(w * dpr), bh = Math.round(h * dpr);
    f.out?.dispose();
    f.out = new WebGLRenderTarget(bw, bh, { type: HalfFloatType, minFilter: LinearFilter, magFilter: LinearFilter, depthBuffer: false });
    f.mat.uniforms.uTexel.value = { x: 1 / bw, y: 1 / bh };
    f.kd = Math.min(dpr, 1.5);
    f.kc.width = Math.round(w * f.kd);
    f.kc.height = Math.round(h * f.kd);
    f.tex.dispose();
  }

  return {
    size,
    /** Restart the tube's memory, so an old frame never glows through. */
    cold() { f.tube?.cold(); },
    /**
     * One feed frame.
     * @param {(x: CanvasRenderingContext2D, w: number, h: number) => void} draw Draws the marks in CSS pixels.
     */
    render(scene, camera, focusDist, draw, t, reduced) {
      const now = performance.now(), dt = f.last ? Math.min(.1, Math.max(1 / 120, (now - f.last) / 1000)) : 1 / 30;
      f.last = now;
      const H = f.tube.cssH;
      f.tube.setFocus(focusDist, (H / 2) / Math.tan(camera.fov * Math.PI / 360));
      f.tube.mOut.uniforms.uFlick.value = reduced ? 0 : 1;
      f.tube.render(scene, camera, dt, t);
      const x = f.kx;
      x.setTransform(1, 0, 0, 1, 0, 0);
      x.clearRect(0, 0, f.kc.width, f.kc.height);
      x.setTransform(f.kd, 0, 0, f.kd, 0, 0);
      draw(x, f.tube.cssW, f.tube.cssH);
      f.tex.needsUpdate = true;
      f.mat.uniforms.tImg.value = f.out.texture;
      f.mat.uniforms.uNeg.value = reduced ? .9 : .86 + .08 * Math.sin(t * 1.3);
      f.tube.quad.material = f.mat;
      renderer.setRenderTarget(null);
      renderer.render(f.tube.scene, f.tube.cam);
    }
  };
}
