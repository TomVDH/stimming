// Load order: none.
// The module builds its pass when the chain asks.
import { Color, HalfFloatType, Matrix4, ShaderMaterial, Vector2, Vector3, WebGLRenderTarget } from 'three';
import type { DepthTexture, PerspectiveCamera, WebGLRenderer } from 'three';
import { FullScreenQuad, Pass } from 'three/addons/postprocessing/Pass.js';
import { reduced } from '../../../shared/stim.js';
import { fog, skyU } from '../sky/haze.ts';

/* ---------- valley mist and distant clouds: lit volumes ---------- */
// A ray march through a slab of mist that lies in the valleys.
// It stops at the scene's depth, so the mist sits in front of the far land.
// It runs at half size; a two-way blur melts the step dither.
// A tap after the render keeps the scene's depth for it.
// So the mist can run after the depth of field.

// The slab's top and the height over which its density falls by e, in metres.
// The top stays under the summit pads, so the complex stands clear.
const MIST_TOP = 212, MIST_H = 75;
// The slope band: its height, half-thickness and strength.
const BAND_Y = 150, BAND_W = 24, BAND_K = 0.55;
// Extinction per metre at full density.
const SIGMA = 0.0045;
// The mist's sky light is the haze colour times this.
const AMB_K = 1.5;
// The cloud deck: base and top heights, its near edge from the summit, extinction per metre.
// It lies high and far, so it shows 1 to 15 degrees over the horizon.
const CLOUD_Y0 = 400, CLOUD_Y1 = 1500, CLOUD_NEAR = 3000, CLOUD_SIGMA = 0.003;
// The wind stretches the banks along this direction on the ground, x then z.
const WIND = new Vector2(0.9, 0.42).normalize();
// The key light from world/hill: faint, cool, high in the north-west.
const KEY_DIR = new Vector3(-60, 120, -90).normalize();
const KEY_C = new Color(0.05, 0.056, 0.075);

const vert = /* glsl */`
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

/* ---------- kit section: Fire's smoke lighting, from jethover/fluid.js ---------- */
// Henyey-Greenstein phase, powder, two-lobe multiple scatter.
// Short shadow taps toward the light, sky light dimmed by the gas above.
// Three noise octaves erode the edges.
const KIT = /* glsl */`
  float hg(float c, float g) { float g2 = g * g; return (1.0 - g2) / pow(1.0 + g2 - 2.0 * g * c, 1.5) * 0.0796; }
  float h31(vec3 p) { p = fract(p * 0.1031); p += dot(p, p.zyx + 31.32); return fract((p.x + p.y) * p.z); }
  float vn3(vec3 p) {
    vec3 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(h31(i), h31(i + vec3(1, 0, 0)), f.x), mix(h31(i + vec3(0, 1, 0)), h31(i + vec3(1, 1, 0)), f.x), f.y),
               mix(mix(h31(i + vec3(0, 0, 1)), h31(i + vec3(1, 0, 1)), f.x), mix(h31(i + vec3(0, 1, 1)), h31(i + vec3(1, 1, 1)), f.x), f.y), f.z);
  }`;

const march = /* glsl */`
  uniform sampler2D tDepth;
  uniform mat4 uInvProj, uCamWorld;
  uniform vec3 uCam, uFwd, uL, uLightC, uAmb, uSun, uWarm, uHor, uZen;
  uniform float uNear, uFar, uTime;
  varying vec2 vUv;
  ${KIT}
  // Density: thick on the valley floor, thinning with height.
  // A thin cloud band lies across the slopes at BAND_Y, among the trees.
  // Banks and wisps come from the eroding noise, strongest near the top.
  float dens(vec3 p) {
    float band = ${BAND_K.toFixed(2)} * exp(-pow((p.y - ${BAND_Y.toFixed(1)}) / ${BAND_W.toFixed(1)}, 2.0));
    float h = (exp(-max(p.y, 0.0) / ${MIST_H.toFixed(1)}) + band) * smoothstep(${MIST_TOP.toFixed(1)}, ${(MIST_TOP - 95).toFixed(1)}, p.y);
    if (h < 0.002) return 0.0;
    vec3 q = p * vec3(1.0 / 150.0, 1.0 / 55.0, 1.0 / 150.0) + vec3(uTime * 0.004, 0.0, uTime * 0.0025);
    float fb = vn3(q) * 0.55 + vn3(q * 2.7 + 7.3) * 0.3 + vn3(q * 6.3 + 3.1) * 0.15;
    return h * smoothstep(0.62 - 0.3 * h, 0.78 - 0.2 * h, fb + 0.15);
  }
  // The cloud deck: sweeping banks stretched along the wind, far from the summit.
  // Its coverage changes over tens of kilometres, so the sky holds gaps.
  float cdens(vec3 p) {
    float far_ = smoothstep(${CLOUD_NEAR.toFixed(1)}, ${(CLOUD_NEAR * 2.4).toFixed(1)}, length(p.xz));
    float hy = (p.y - ${CLOUD_Y0.toFixed(1)}) / ${(CLOUD_Y1 - CLOUD_Y0).toFixed(1)};
    float prof = smoothstep(0.0, 0.06, hy) * smoothstep(1.0, 0.3, hy);
    if (far_ * prof < 0.01) return 0.0;
    vec2 w = vec2(${WIND.x.toFixed(4)}, ${WIND.y.toFixed(4)});
    vec2 xz = vec2(dot(p.xz, w), dot(p.xz, vec2(-w.y, w.x)));
    vec3 q = vec3(xz.x / 5200.0 + uTime * 0.0006, p.y / 700.0, xz.y / 1500.0);
    float cov = vn3(vec3(p.xz / 16000.0, 2.0));
    float fb = vn3(q) * 0.5 + vn3(q * 2.6 + 5.1) * 0.27 + vn3(q * 6.4 + 1.7) * 0.15 + vn3(q * 15.0 + 9.2) * 0.08;
    return far_ * prof * smoothstep(0.68 - 0.25 * cov, 0.76 - 0.2 * cov, fb + 0.25 * (1.0 - hy));
  }
  void main() {
    vec4 v = uInvProj * vec4(vUv * 2.0 - 1.0, 1.0, 1.0);
    vec3 dir = normalize((uCamWorld * vec4(v.xyz / v.w, 0.0)).xyz);
    float zd = texture2D(tDepth, vUv).x;
    float zn = zd * 2.0 - 1.0;
    float ze = 2.0 * uNear * uFar / (uFar + uNear - zn * (uFar - uNear));
    float tS = zd >= 0.99999 ? 1e9 : ze / max(dot(dir, uFwd), 1e-3);
    float t1 = min(tS, 9000.0), t0 = 0.0;
    // The ray meets the slab from above and leaves it below the valley floor.
    if (dir.y < -1e-4) {
      t0 = max(0.0, (${MIST_TOP.toFixed(1)} - uCam.y) / dir.y);
      t1 = min(t1, (-40.0 - uCam.y) / dir.y);
    } else if (uCam.y > ${MIST_TOP.toFixed(1)}) {
      t1 = 0.0;
    }
    t1 = min(t1, 9000.0);
    // Interleaved gradient noise hides the step bands.
    float j = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));
    float tr = 1.0;
    vec3 col = vec3(0.0);
    const int N = 40;
    float ds = (t1 - t0) / float(N);
    float ph = hg(dot(dir, uL), 0.3) * 12.566;
    for (int i = 0; i < N; i++) {
      if (t1 <= t0) break;
      if (tr < 0.01) break;
      vec3 p = uCam + dir * (t0 + (float(i) + j) * ds);
      float den = dens(p);
      if (den < 0.003) continue;
      // Two shadow taps toward the light.
      float tau = (dens(p + uL * 25.0) * 25.0 + dens(p + uL * 80.0) * 55.0) * ${SIGMA.toFixed(4)} * 4.0;
      float lt = exp(-tau) + 0.35 * exp(-tau * 0.25);
      float powder = 1.0 - exp(-den * 4.0);
      // Sky light from above, dimmed by the mist over this point.
      float up = exp(-dens(p + vec3(0.0, 30.0, 0.0)) * 1.6);
      vec3 Li = uAmb * (0.45 + 0.9 * up) + uLightC * lt * (0.4 + 0.6 * powder) * ph;
      float al = 1.0 - exp(-den * ${SIGMA.toFixed(4)} * ds);
      col += tr * al * Li;
      tr *= 1.0 - al;
    }
    // Only rays that climb meet the cloud deck.
    if (dir.y > 0.002 && tr > 0.01) {
      float c0 = max(0.0, (${CLOUD_Y0.toFixed(1)} - uCam.y) / dir.y);
      float c1 = min(min((${CLOUD_Y1.toFixed(1)} - uCam.y) / dir.y, tS), 26000.0);
      // The sun stands a little over the horizon at the sunset point.
      vec3 Ls = normalize(uSun + vec3(0.0, 0.06, 0.0));
      // The late sun lights the clouds; at night only the faint key does.
      vec3 sunC = uWarm * 2.2 + uLightC * 0.6;
      vec3 skyA = mix(uHor, uZen, 0.35) * 1.3;
      // A forward lobe gives the silver lining toward the sun.
      float cph = mix(hg(dot(dir, Ls), 0.6), hg(dot(dir, Ls), -0.15), 0.35) * 12.566;
      // Steps of about 450 m keep the banks free of streaks.
      const int M = 56;
      float cs = (c1 - c0) / float(M);
      for (int i = 0; i < M; i++) {
        if (c1 <= c0 || tr < 0.01) break;
        float t = c0 + (float(i) + j) * cs;
        vec3 p = uCam + dir * t;
        float den = cdens(p);
        if (den < 0.003) continue;
        float tau = (cdens(p + Ls * 180.0) * 180.0 + cdens(p + Ls * 500.0) * 380.0) * ${CLOUD_SIGMA.toFixed(4)} * 2.0;
        float lt = exp(-tau) + 0.35 * exp(-tau * 0.25);
        float powder = 1.0 - exp(-den * 4.0);
        float up = exp(-cdens(p + vec3(0.0, 150.0, 0.0)) * 1.5);
        vec3 Li = skyA * (0.5 + 0.8 * up) + sunC * lt * (0.4 + 0.6 * powder) * cph;
        // Far cloud takes the horizon's colour.
        Li = mix(Li, uHor * 1.1, (1.0 - exp(-t / 30000.0)) * 0.6);
        float al = 1.0 - exp(-den * ${CLOUD_SIGMA.toFixed(4)} * cs);
        col += tr * al * Li;
        tr *= 1.0 - al;
      }
    }
    gl_FragColor = vec4(col, tr);
  }`;

// A three-tap blur along one axis.
const blur = /* glsl */`
  uniform sampler2D tA;
  uniform vec2 uStep;
  varying vec2 vUv;
  void main() { gl_FragColor = texture2D(tA, vUv) * 0.5 + (texture2D(tA, vUv + uStep) + texture2D(tA, vUv - uStep)) * 0.25; }`;

// The mist over the frame: its light adds, its transmittance dims what lies behind.
const lay = /* glsl */`
  uniform sampler2D tA, tScene;
  varying vec2 vUv;
  void main() {
    vec4 m = texture2D(tA, vUv), s = texture2D(tScene, vUv);
    gl_FragColor = vec4(s.rgb * m.a + m.rgb, s.a);
  }`;

// The scene's depth, kept by the tap.
let sceneDepth: DepthTexture | null = null;
// The beam tests itself against this depth, after the mist.
export const tappedDepth = (): DepthTexture | null => sceneDepth;
// A pass that only keeps the depth of the target the scene drew into.
export function makeDepthTap(): Pass {
  class Tap extends Pass {
    constructor() { super(); this.needsSwap = false; }
    render(_r: WebGLRenderer, _w: WebGLRenderTarget, read: WebGLRenderTarget): void { sceneDepth = read.depthTexture; }
  }
  return new Tap();
}

export function makeMist(camera: PerspectiveCamera): Pass {
  const half = (): WebGLRenderTarget => new WebGLRenderTarget(2, 2, { type: HalfFloatType, depthBuffer: false });
  const rtA = half(), rtB = half();
  const MU = {
    tDepth: { value: null }, uInvProj: { value: new Matrix4() }, uCamWorld: { value: new Matrix4() },
    uCam: { value: new Vector3() }, uFwd: { value: new Vector3() }, uL: { value: KEY_DIR.clone() },
    uLightC: { value: KEY_C.clone() }, uAmb: { value: new Color() },
    // The sky's own uniforms, so the clouds follow the dusk.
    uSun: skyU.uSun, uWarm: skyU.uWarm, uHor: skyU.uHor, uZen: skyU.uZen,
    uNear: { value: camera.near }, uFar: { value: camera.far }, uTime: { value: 0 },
  };
  const mMarch = new ShaderMaterial({ uniforms: MU, vertexShader: vert, fragmentShader: march, depthTest: false, depthWrite: false });
  const BU = { tA: { value: null }, uStep: { value: new Vector2() } };
  const mBlur = new ShaderMaterial({ uniforms: BU, vertexShader: vert, fragmentShader: blur, depthTest: false, depthWrite: false });
  const mLay = new ShaderMaterial({ uniforms: { tA: { value: null }, tScene: { value: null } }, vertexShader: vert, fragmentShader: lay, depthTest: false, depthWrite: false });
  const quad = new FullScreenQuad(mMarch);

  class MistPass extends Pass {
    setSize(w: number, h: number): void {
      rtA.setSize(Math.max(1, w >> 1), Math.max(1, h >> 1));
      rtB.setSize(Math.max(1, w >> 1), Math.max(1, h >> 1));
    }
    render(r: WebGLRenderer, write: WebGLRenderTarget, read: WebGLRenderTarget): void {
      MU.tDepth.value = (sceneDepth ?? read.depthTexture) as never;
      MU.uInvProj.value.copy(camera.projectionMatrixInverse);
      MU.uCamWorld.value.copy(camera.matrixWorld);
      MU.uCam.value.setFromMatrixPosition(camera.matrixWorld);
      camera.getWorldDirection(MU.uFwd.value);
      MU.uNear.value = camera.near; MU.uFar.value = camera.far;
      // The dusk drives the haze colour, so the mist takes the dusk light too.
      MU.uAmb.value.copy(fog.color).multiplyScalar(AMB_K);
      // The banks drift only while frames draw; reduced motion holds them.
      if (!reduced()) MU.uTime.value = (performance.now() / 1000) % 10000;
      quad.material = mMarch;
      r.setRenderTarget(rtA); quad.render(r);
      // Blur across, then down.
      quad.material = mBlur;
      BU.tA.value = rtA.texture as never; BU.uStep.value.set(1 / rtA.width, 0);
      r.setRenderTarget(rtB); quad.render(r);
      BU.tA.value = rtB.texture as never; BU.uStep.value.set(0, 1 / rtA.height);
      r.setRenderTarget(rtA); quad.render(r);
      quad.material = mLay;
      mLay.uniforms.tA.value = rtA.texture;
      mLay.uniforms.tScene.value = read.texture;
      r.setRenderTarget(this.renderToScreen ? null : write); quad.render(r);
    }
    dispose(): void {
      rtA.dispose(); rtB.dispose();
      mMarch.dispose(); mBlur.dispose(); mLay.dispose();
      quad.dispose();
    }
  }
  return new MistPass();
}
