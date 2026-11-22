// Jet hover effects: the plumes, the spray, the heat field and the post passes.
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

/* ---------- heat over the ground: an upright sheet at each pool ---------- */
const SHEET_VS = /* glsl */`
uniform vec3 uC;
uniform vec2 uSize;
varying vec2 vQ;
void main() {
  vec3 fwd = cameraPosition - uC; fwd.y = 0.0; fwd = normalize(fwd);
  vec3 side = vec3(fwd.z, 0.0, -fwd.x);
  vec3 P = uC + side * position.x * uSize.x + vec3(0.0, (position.y + 0.5) * uSize.y, 0.0);
  vQ = vec2(position.x * 2.0, position.y + 0.5);
  gl_Position = projectionMatrix * viewMatrix * vec4(P, 1.0);
}`;
const SHEET_FS = /* glsl */`
uniform float uK;
varying vec2 vQ;
void main() {
  float s = exp(-vQ.x * vQ.x * 3.0) * exp(-vQ.y * 3.2) * smoothstep(0.0, 0.04, vQ.y) * uK;
  gl_FragColor = vec4(s, 0.0, 0.0, 1.0);
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

export function makeSheet() {
  const U = { uC: { value: new THREE.Vector3() }, uSize: { value: new THREE.Vector2(9, 3.5) }, uK: { value: 0 } };
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShaderMaterial({
    vertexShader: SHEET_VS, fragmentShader: SHEET_FS, uniforms: U,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  }));
  m.frustumCulled = false;
  return m;
}

/* ---------- spray and smoke: soft points thrown along the ground ---------- */
const SPRAY_VS = /* glsl */`
attribute vec4 aData;
uniform float uPx;
uniform vec4 uHot[3];
uniform vec3 uHotCol;
varying vec3 vCol;
varying float vA;
varying float vSeed;
varying float vHeat;
void main() {
  vHeat = aData.z;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = min(aData.x * uPx / -mv.z, 700.0);
  // Light: the cool sky, the hot pools close by, and the gas's own heat.
  vec3 c = vec3(0.045, 0.055, 0.09);
  for (int i = 0; i < 3; i++) {
    vec3 d = position - uHot[i].xyz;
    c += uHotCol * uHot[i].w * 0.9 / (1.0 + dot(d, d) * 0.3);
  }
  c += vec3(1.0, 0.45, 0.15) * aData.z * 1.6;
  vCol = c;
  vA = aData.y;
  vSeed = aData.w;
}`;
const SPRAY_FS = /* glsl */`
${NOISE}
varying vec3 vCol;
varying float vA;
varying float vSeed;
void main() {
  vec2 q = gl_PointCoord * 2.0 - 1.0;
  float r2 = dot(q, q);
  if (r2 > 1.0) discard;
  float lump = 0.65 + 0.7 * vn(q * 2.2 + vSeed * 31.0);
  float a = (1.0 - r2) * (1.0 - r2) * vA * lump;
  gl_FragColor = vec4(vCol * a, a);
}`;
const SPRAY_HEAT_FS = /* glsl */`
varying float vA;
varying float vHeat;
void main() {
  vec2 q = gl_PointCoord * 2.0 - 1.0;
  float r2 = dot(q, q);
  if (r2 > 1.0) discard;
  gl_FragColor = vec4((1.0 - r2) * (vA * 0.08 + vHeat * 0.25), 0.0, 0.0, 1.0);
}`;

export function makeSpray(max, hotU) {
  const pos = new Float32Array(max * 3), data = new Float32Array(max * 4);
  const geo = new THREE.BufferGeometry();
  const aPos = new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage);
  const aData = new THREE.BufferAttribute(data, 4).setUsage(THREE.DynamicDrawUsage);
  geo.setAttribute('position', aPos);
  geo.setAttribute('aData', aData);
  geo.setDrawRange(0, 0);
  const U = { uPx: { value: 400 }, uHot: hotU.uHot, uHotCol: hotU.uHotCol };
  const points = new THREE.Points(geo, new THREE.ShaderMaterial({
    vertexShader: SPRAY_VS, fragmentShader: SPRAY_FS, uniforms: U, transparent: true, depthWrite: false,
    blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
  }));
  points.frustumCulled = false;
  points.renderOrder = 3;
  const heat = new THREE.Points(geo, new THREE.ShaderMaterial({
    vertexShader: SPRAY_VS, fragmentShader: SPRAY_HEAT_FS, uniforms: U, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  heat.frustumCulled = false;

  // The particle store: plain arrays, oldest first.
  const P = [];
  const rnd = (a, b) => a + Math.random() * (b - a);
  const s = {
    points, heat, U, P, max,
    // A burst along the ground from a pool: n particles at a power.
    emit(c, n, power, cold) {
      for (let i = 0; i < n; i++) {
        if (P.length >= max) P.shift();
        const a = Math.random() * Math.PI * 2, v = rnd(5, 15) * (0.4 + 0.8 * power) * (cold ? 0.7 : 1);
        P.push({
          x: c.x + Math.cos(a) * 0.5, y: rnd(0.1, 0.5), z: c.z + Math.sin(a) * 0.5,
          vx: Math.cos(a) * v, vy: rnd(0.2, 1.6), vz: Math.sin(a) * v,
          age: 0, life: rnd(1.6, 3.6), s0: rnd(0.5, 1.1), grow: rnd(1.4, 2.6),
          heat: cold ? 0 : power * rnd(0.3, 1), buoy: cold ? rnd(0.1, 0.5) : rnd(0.6, 1.6), seed: Math.random(),
          k: cold ? 0.55 : 1,
        });
      }
    },
    step(dt) {
      const drag = Math.exp(-dt * 1.5);
      for (let i = P.length - 1; i >= 0; i--) {
        const p = P[i];
        p.age += dt;
        if (p.age > p.life) { P.splice(i, 1); continue; }
        p.vx *= drag; p.vz *= drag;
        p.vy += (p.buoy - p.vy) * dt * 0.9;
        p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
        if (p.y < 0.15) { p.y = 0.15; p.vy = Math.abs(p.vy) * 0.3; }
      }
    },
    upload() {
      const n = P.length;
      for (let i = 0; i < n; i++) {
        const p = P[i], u = p.age / p.life;
        pos[i * 3] = p.x; pos[i * 3 + 1] = p.y; pos[i * 3 + 2] = p.z;
        const fade = Math.min(1, p.age / 0.12) * (1 - u) ** 1.6;
        data[i * 4] = p.s0 + p.age * p.grow;
        data[i * 4 + 1] = fade * 0.36 * p.k;
        data[i * 4 + 2] = p.heat * Math.exp(-p.age * 3.5);
        data[i * 4 + 3] = p.seed;
      }
      geo.setDrawRange(0, n);
      aPos.needsUpdate = true; aData.needsUpdate = true;
    },
  };
  return s;
}

/* ---------- post: heat refraction, then the grade ---------- */
export const REFRACT = {
  uniforms: { tDiffuse: { value: null }, tHeat: { value: null }, uRes: { value: new THREE.Vector2(1, 1) }, uTime: { value: 0 }, uAmp: { value: 1 } },
  vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: /* glsl */`
    ${NOISE}
    uniform sampler2D tDiffuse, tHeat;
    uniform vec2 uRes;
    uniform float uTime, uAmp;
    varying vec2 vUv;
    void main() {
      float s = texture2D(tHeat, vUv).r;
      vec2 uv = vUv;
      if (s > 0.002) {
        // Cells of hot air rise and wobble; the scale is in screen pixels.
        vec2 q = vUv * uRes / (16.0 * uAmp);
        vec2 o = vec2(vn(q + vec2(0.0, -uTime * 2.6)) - 0.5, vn(q * 1.3 + vec2(7.1, -uTime * 3.3)) - 0.5);
        o += 0.5 * vec2(vn(q * 2.7 + vec2(3.0, -uTime * 5.0)) - 0.5, vn(q * 2.4 + vec2(1.0, -uTime * 4.4)) - 0.5);
        uv += o * min(s, 1.0) * 9.0 * uAmp / uRes;
      }
      gl_FragColor = vec4(texture2D(tDiffuse, uv).rgb, 1.0);
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
