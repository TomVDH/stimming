// Jet hover effects: the plumes, the jet-core heat and the post passes.
// Each program stays small, so the Windows D3D11 link stays fast.
import * as THREE from 'three';

const NOISE = /* glsl */`
float h21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vn(vec2 p) {
  vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y);
}`;

/* ---------- plume ribbons: view-facing strips along each nozzle axis ---------- */
// x across in metres, t along the axis in metres.
const RIBBON_VS = /* glsl */`
uniform vec3 uN, uAxis;
uniform float uLen, uR, uSpread, uWide;
varying vec2 vUV;
varying float vR;
void main() {
  float v = position.y + 0.5;
  float t = v * uLen;
  vec3 P = uN + uAxis * t;
  vec3 side = normalize(cross(uAxis, normalize(cameraPosition - P)));
  float r = uR * (1.0 + t * uSpread);
  float w = r * uWide;
  P += side * position.x * w;
  vUV = vec2(position.x * w, t);
  vR = r;
  gl_Position = projectionMatrix * viewMatrix * vec4(P, 1.0);
}`;

const PLUME_FS = /* glsl */`
${NOISE}
uniform float uThr, uTime, uLen, uSeed, uWide, uCold;
varying vec2 vUV;
varying float vR;
void main() {
  float t = vUV.y, xn = vUV.x / vR, thr = uThr;
  float edge = 1.0 - smoothstep(0.7, 1.0, abs(xn) / uWide);
  float flow = t * 1.2 - uTime * (5.0 + 9.0 * thr);
  float tb = vn(vec2(xn * 1.6 + uSeed, flow)) * 0.6 + vn(vec2(xn * 3.7 - uSeed, flow * 2.2)) * 0.4;
  float flame = 1.6 + 3.6 * thr;
  float along = exp(-t / flame);
  float core = exp(-xn * xn * 2.6);
  float body = exp(-xn * xn * 1.1) * (0.55 + 0.9 * tb);
  // Shock diamonds: rhombs along the axis, each dimmer than the last.
  float S = vR * 2.0 * (0.7 + 0.55 * thr);
  float k = t / S - 0.55, kc = floor(k + 0.5), f = k - kc;
  float dsh = 1.0 - abs(f) * 2.6 - abs(xn) * 2.3;
  float dia = smoothstep(0.0, 0.7, dsh) * step(-0.5, kc) * exp(-max(kc, 0.0) * (0.85 - 0.4 * thr));
  dia *= smoothstep(0.1, 0.55, thr) * (0.75 + 0.5 * tb);
  float mouth = exp(-t * 3.2) * core;
  // Hot yellow at the throat, orange, then violet blue down the jet.
  vec3 cMouth = vec3(1.0, 0.55, 0.2), cDia = vec3(1.0, 0.55, 0.28);
  vec3 cBody = mix(vec3(1.0, 0.36, 0.1), vec3(0.75, 0.22, 0.5), smoothstep(0.3, 1.4, t));
  cBody = mix(cBody, vec3(0.3, 0.26, 0.95), smoothstep(1.2, 3.2, t));
  vec3 col = cMouth * mouth * (0.8 + 1.4 * thr);
  col += cBody * body * along * (0.45 + 1.3 * thr);
  col += cDia * dia * (0.55 + 1.9 * thr);
  // A wide warm halo where the haze holds the glow.
  col += vec3(1.0, 0.32, 0.08) * exp(-xn * xn * 0.1) * 0.05 * (0.3 + thr) * exp(-t / (flame * 1.6));
  // The cold lift-fan jet shows only as a faint grey sheet.
  col = mix(col, vec3(0.05, 0.06, 0.08) * body * (0.3 + 0.7 * thr) * 0.25, uCold);
  col *= edge * smoothstep(uLen + 0.05, uLen - 0.7, t);
  gl_FragColor = vec4(col, 1.0);
}`;

const HEAT_RIBBON_FS = /* glsl */`
uniform float uThr, uLen, uWide, uCold;
varying vec2 vUV;
varying float vR;
void main() {
  float t = vUV.y, xn = vUV.x / vR;
  float edge = 1.0 - smoothstep(0.6, 1.0, abs(xn) / uWide);
  float s = exp(-xn * xn * 0.35) * smoothstep(0.0, 0.8, t) * (0.35 + 0.65 * uThr) * mix(1.0, 0.35, uCold);
  // Strongest near the ground, where the jet turns.
  s *= 0.7 + 0.6 * smoothstep(uLen * 0.4, uLen, t);
  gl_FragColor = vec4(s * edge, 0.0, 0.0, 1.0);
}`;

export function makePlumes(count) {
  const geo = new THREE.PlaneGeometry(2, 1, 1, 56);
  const plumes = [], heats = [];
  for (let i = 0; i < count; i++) {
    const U = {
      uN: { value: new THREE.Vector3() }, uAxis: { value: new THREE.Vector3(0, -1, 0) },
      uLen: { value: 4 }, uR: { value: 0.4 }, uSpread: { value: 0.11 }, uWide: { value: 4.5 },
      uThr: { value: 0.5 }, uTime: { value: 0 }, uSeed: { value: i * 17.3 }, uCold: { value: 0 },
    };
    const m = new THREE.Mesh(geo, new THREE.ShaderMaterial({
      vertexShader: RIBBON_VS, fragmentShader: PLUME_FS, uniforms: U,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    }));
    m.frustumCulled = false;
    m.renderOrder = 2;
    plumes.push(m);
    const hU = { ...U, uWide: { value: 3.0 } };
    const h = new THREE.Mesh(geo, new THREE.ShaderMaterial({
      vertexShader: RIBBON_VS, fragmentShader: HEAT_RIBBON_FS, uniforms: hU,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    }));
    h.frustumCulled = false;
    heats.push(h);
  }
  return { plumes, heats };
}

/* ---------- post: heat refraction and the gas, then the grade ---------- */
export const REFRACT = {
  uniforms: {
    tDiffuse: { value: null }, tHeat: { value: null }, tVol: { value: null }, tVolHeat: { value: null },
    uRes: { value: new THREE.Vector2(1, 1) }, uTime: { value: 0 }, uAmp: { value: 1 }, uBend: { value: 45 },
  },
  vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: /* glsl */`
    ${NOISE}
    uniform sampler2D tDiffuse, tHeat, tVol, tVolHeat;
    uniform vec2 uRes;
    uniform float uTime, uAmp, uBend;
    varying vec2 vUv;
    void main() {
      vec2 uv = vUv;
      // The hot gas in the volume: light bends along the gradient of its shimmer.
      vec2 px = 2.0 / uRes;
      float hx = texture2D(tVolHeat, vUv + vec2(px.x, 0.0)).g - texture2D(tVolHeat, vUv - vec2(px.x, 0.0)).g;
      float hy = texture2D(tVolHeat, vUv + vec2(0.0, px.y)).g - texture2D(tVolHeat, vUv - vec2(0.0, px.y)).g;
      vec2 off = vec2(hx, hy) * uBend * uAmp;
      // A long grazing path over the pad must not tear the frame.
      off *= min(1.0, 4.0 * uAmp / max(length(off), 1e-4));
      uv += off / uRes;
      // The jet cores: fine cells along each plume.
      float s = texture2D(tHeat, vUv).r;
      if (s > 0.002) {
        vec2 q = vUv * uRes / (12.0 * uAmp);
        vec2 o = vec2(vn(q + vec2(0.0, uTime * 6.0)) - 0.5, vn(q * 1.3 + vec2(7.1, uTime * 7.0)) - 0.5);
        uv += o * min(s, 1.0) * 2.5 * uAmp / uRes;
      }
      vec3 c = texture2D(tDiffuse, uv).rgb;
      // The lit gas lies over the bent scene.
      vec4 g = texture2D(tVol, uv);
      gl_FragColor = vec4(c * (1.0 - g.a) + g.rgb, 1.0);
    }`,
};

export const GRADE = {
  uniforms: { tDiffuse: { value: null }, uGrain: { value: 0 }, uAsp: { value: 1 } },
  vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse;
    uniform float uGrain, uAsp;
    varying vec2 vUv;
    float h(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main() {
      vec3 c = texture2D(tDiffuse, vUv).rgb;
      // Cool shadows, warm highlights, a soft vignette.
      float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
      c += vec3(-0.002, 0.0, 0.006) * (1.0 - smoothstep(0.0, 0.2, l));
      vec2 q = (vUv - 0.5) * vec2(uAsp, 1.0);
      c *= 1.0 - 0.32 * dot(q, q);
      c += (h(vUv * 917.0 + uGrain) - 0.5) * 0.006 * (0.25 + c);
      gl_FragColor = vec4(max(c, 0.0), 1.0);
    }`,
};
