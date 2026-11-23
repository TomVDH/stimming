// Forge shaders and the heat colour ramp, in GLSL and in JS.
// World: metres; the smithy floor is y = 0.

// The smith's colour chart, in degrees C, as linear light.
// 650 dull red, 750 cherry, 900 orange, 1050 yellow-orange, 1200 yellow.
export const STOPS = [
  [450, 0, 0, 0],
  [560, 0.03, 0.001, 0],
  [650, 0.28, 0.012, 0.001],
  [750, 0.95, 0.07, 0.006],
  [900, 2.4, 0.46, 0.05],
  [1050, 4.2, 1.6, 0.3],
  [1200, 6.0, 3.6, 1.1],
  [1320, 7.5, 5.8, 2.8],
  [1450, 9.0, 8.0, 5.5],
];

// The same ramp in JS: degrees C to [r, g, b].
export function heatRGB(T, out = [0, 0, 0]) {
  if (T <= STOPS[0][0]) { out[0] = out[1] = out[2] = 0; return out; }
  for (let i = 1; i < STOPS.length; i++) {
    const a = STOPS[i - 1], b = STOPS[i];
    if (T <= b[0] || i === STOPS.length - 1) {
      const k = Math.min(1, (T - a[0]) / (b[0] - a[0]));
      out[0] = a[1] + (b[1] - a[1]) * k; out[1] = a[2] + (b[2] - a[2]) * k; out[2] = a[3] + (b[3] - a[3]) * k;
      return out;
    }
  }
  return out;
}

const v = n => n.toFixed(4);
export const HEAT = /* glsl */`
const int NSTOP = ${STOPS.length};
const vec4 STOP[NSTOP] = vec4[NSTOP](${STOPS.map(s => `vec4(${v(s[0])}, ${v(s[1])}, ${v(s[2])}, ${v(s[3])})`).join(', ')});
vec3 heatRGB(float T) {
  if (T <= STOP[0].x) return vec3(0.0);
  vec3 c = STOP[NSTOP - 1].yzw;
  for (int i = 1; i < NSTOP; i++) {
    if (T <= STOP[i].x) {
      float k = (T - STOP[i - 1].x) / (STOP[i].x - STOP[i - 1].x);
      return mix(STOP[i - 1].yzw, STOP[i].yzw, k);
    }
  }
  return c;
}`;

export const NOISE = /* glsl */`
float h31(vec3 p) { p = fract(p * 0.1031); p += dot(p, p.zyx + 31.32); return fract((p.x + p.y) * p.z); }
float vn3(vec3 p) {
  vec3 i = floor(p), u = fract(p);
  u = u * u * (3.0 - 2.0 * u);
  return mix(mix(mix(h31(i), h31(i + vec3(1, 0, 0)), u.x), mix(h31(i + vec3(0, 1, 0)), h31(i + vec3(1, 1, 0)), u.x), u.y),
             mix(mix(h31(i + vec3(0, 0, 1)), h31(i + vec3(1, 0, 1)), u.x), mix(h31(i + vec3(0, 1, 1)), h31(i + vec3(1, 1, 1)), u.x), u.y), u.z);
}`;

/* ---------- post: haze, steam over the scene, the grade ---------- */
// Copied from steelworks/shaders.js and retuned: two lights, one window shaft.
const PASS_VS = 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }';
export const NL = 3;
export const HAZE = {
  uniforms: {
    tDiffuse: { value: null }, tDepth: { value: null },
    uProjInv: { value: null }, uCamW: { value: null }, uCamP: { value: null },
    uLP: { value: null }, uLC: { value: null }, uShaftC: { value: null },
    uWin: { value: null }, uShaftD: { value: null },
    uSigma: { value: 0.09 }, uSteps: { value: 24 }, uFrame: { value: 0 },
  },
  vertexShader: PASS_VS,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse, tDepth;
    uniform mat4 uProjInv, uCamW;
    uniform vec3 uCamP, uShaftC, uShaftD;
    uniform vec4 uWin;
    uniform vec4 uLP[${NL}];
    uniform vec3 uLC[${NL}];
    uniform float uSigma, uSteps, uFrame;
    varying vec2 vUv;
    float ign(vec2 p) { return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715)))); }
    // The window's light: trace back along the shaft to the wall.
    float shaftAt(vec3 p) {
      float t = (p.z - uWin.z) / uShaftD.z;
      if (t < 0.0) return 0.0;
      vec3 q = p - uShaftD * t;
      float soft = 0.02 + 0.03 * t;
      vec2 d = abs(q.xy - uWin.xy) - vec2(uWin.w, uWin.w * 0.8) * 0.5;
      float on = smoothstep(soft, -soft, max(d.x, d.y));
      // Two bars cut the window into three panes.
      float bx = abs(abs(q.x - uWin.x) - uWin.w / 6.0);
      on *= mix(1.0, 0.15, smoothstep(0.014 + soft, 0.012, bx));
      return on;
    }
    void main() {
      vec3 c = texture2D(tDiffuse, vUv).rgb;
      float z = texture2D(tDepth, vUv).r;
      vec4 v = uProjInv * vec4(vUv * 2.0 - 1.0, z * 2.0 - 1.0, 1.0);
      vec3 pw = (uCamW * vec4(v.xyz / v.w, 1.0)).xyz;
      vec3 rd = pw - uCamP;
      float L = min(length(rd), 12.0);
      rd = normalize(rd);
      float T = exp(-uSigma * L * 0.15);
      float n = uSteps, dt = L / n, j = ign(gl_FragCoord.xy + uFrame * 5.588);
      float sh = 0.0;
      for (int i = 0; i < 40; i++) {
        if (float(i) >= n) break;
        vec3 p = uCamP + rd * (float(i) + j) * dt;
        // Smoke hangs thicker up under the roof.
        sh += shaftAt(p) * (0.6 + 0.5 * smoothstep(0.5, 2.2, p.y));
      }
      float mu = dot(rd, -uShaftD);
      float ph = 0.4 + 1.8 * pow(max(mu, 0.0), 5.0);
      vec3 ins = uShaftC * sh * dt * uSigma * ph;
      // The fire's and the bar's glow: inverse-square scatter along the ray.
      for (int k = 0; k < ${NL}; k++) {
        vec3 op = uLP[k].xyz - uCamP;
        float b = dot(op, rd);
        float h2 = max(dot(op, op) - b * b, 0.0) + uLP[k].w;
        float h = sqrt(h2);
        ins += uLC[k] * (atan((L - b) / h) - atan(-b / h)) / h * uSigma * 0.035;
      }
      gl_FragColor = vec4(c * T + ins, 1.0);
    }`,
};

export const STEAMMIX = {
  uniforms: {
    tDiffuse: { value: null }, tVol: { value: null }, tVolHeat: { value: null },
    uRes: { value: null }, uAmp: { value: 1 }, uBend: { value: 14 },
  },
  vertexShader: PASS_VS,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse, tVol, tVolHeat;
    uniform vec2 uRes;
    uniform float uAmp, uBend;
    varying vec2 vUv;
    void main() {
      // Hot steam bends light along the gradient of its shimmer.
      vec2 px = 2.0 / uRes;
      float hx = texture2D(tVolHeat, vUv + vec2(px.x, 0.0)).g - texture2D(tVolHeat, vUv - vec2(px.x, 0.0)).g;
      float hy = texture2D(tVolHeat, vUv + vec2(0.0, px.y)).g - texture2D(tVolHeat, vUv - vec2(0.0, px.y)).g;
      vec2 off = vec2(hx, hy) * uBend * uAmp;
      off *= min(1.0, 4.0 * uAmp / max(length(off), 1e-4));
      vec2 uv = vUv + off / uRes;
      vec3 c = texture2D(tDiffuse, uv).rgb;
      vec4 g = texture2D(tVol, uv);
      gl_FragColor = vec4(c * (1.0 - g.a) + g.rgb, 1.0);
    }`,
};

export const GRADE = {
  uniforms: { tDiffuse: { value: null }, uGrain: { value: 0 }, uAsp: { value: 1 } },
  vertexShader: PASS_VS,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse;
    uniform float uGrain, uAsp;
    varying vec2 vUv;
    float h(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main() {
      vec3 c = texture2D(tDiffuse, vUv).rgb;
      // Cool shadows, warm lights, a soft vignette, fine grain.
      float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
      c += vec3(-0.0008, 0.0, 0.003) * (1.0 - smoothstep(0.0, 0.12, l));
      vec2 q = (vUv - 0.5) * vec2(uAsp, 1.0);
      c *= 1.0 - 0.35 * dot(q, q);
      c += (h(vUv * 917.0 + uGrain) - 0.5) * 0.008 * (0.25 + c);
      gl_FragColor = vec4(max(c, 0.0), 1.0);
    }`,
};
