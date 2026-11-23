// Steelworks shaders. Each program stays small, so D3D11 links each fast.
// World: metres; the cast floor is y = 0.
import { FURNACE, SHAFT, WIN } from './layout.js';

const f = n => n.toFixed(4);

export const NOISE = /* glsl */`
float h21(vec2 p) { vec3 q = fract(p.xyx * 0.1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
float vn(vec2 p) {
  vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y);
}
// Cells: distance to the nearest edge between two cell centres.
float crack(vec2 p) {
  vec2 i = floor(p), fr = fract(p);
  float d1 = 9.0, d2 = 9.0;
  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
    vec2 g = vec2(x, y), o = vec2(h21(i + g), h21(i + g + 17.1));
    float d = length(g + o - fr);
    if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) d2 = d;
  }
  return d2 - d1;
}`;

// Iron and slag glow: heat 1 is tap heat, 1,500 °C; 0 is cold.
export const INCAND = /* glsl */`
vec3 incand(float T) {
  float t = clamp((T - 0.22) / 0.78, 0.0, 1.0);
  vec3 c = mix(vec3(0.55, 0.03, 0.004), vec3(1.0, 0.2, 0.02), smoothstep(0.0, 0.4, t));
  c = mix(c, vec3(1.0, 0.52, 0.13), smoothstep(0.4, 0.8, t));
  c = mix(c, vec3(1.0, 0.86, 0.62), smoothstep(0.8, 1.0, t));
  return c * (0.03 * t + 0.9 * t * t + 2.4 * t * t * t * t);
}`;

// The yard lights through the right wall's windows; the furnace shades them.
export const SHAFTS = /* glsl */`
const vec3 SHAFT = vec3(${f(SHAFT.x)}, ${f(SHAFT.y)}, ${f(SHAFT.z)});
float shaftAt(vec3 p) {
  float t = (${f(WIN.x)} - p.x) / -SHAFT.x;
  if (t < 0.0) return 0.0;
  vec3 q = p - SHAFT * t;
  float soft = 0.05 + 0.012 * t;
  float on = smoothstep(${f(WIN.y0)} - soft, ${f(WIN.y0)} + soft, q.y) * smoothstep(${f(WIN.y1)} + soft, ${f(WIN.y1)} - soft, q.y);
  on *= smoothstep(${f(WIN.z0)}, ${f(WIN.z0)} + 1.0, q.z) * smoothstep(${f(WIN.z1)}, ${f(WIN.z1)} - 1.0, q.z);
  float bz = mod(q.z - ${f(WIN.z0)}, ${f(WIN.bay)});
  on *= smoothstep(-soft, soft, bz - 0.3) * smoothstep(${f(WIN.w + 0.3)} + soft, ${f(WIN.w + 0.3)} - soft, bz);
  // Mullions and a transom cut each window into panes.
  float mz = abs(fract((bz - 0.3) / 1.15) - 0.5) * 1.15;
  float my = abs(q.y - ${f((WIN.y0 + WIN.y1) / 2)});
  on *= mix(1.0, 0.0, (1.0 - smoothstep(0.05, 0.05 + soft, mz)) * 0.8);
  on *= mix(1.0, 0.0, (1.0 - smoothstep(0.09, 0.09 + soft, my)) * 0.8);
  // The furnace shell blocks the shafts behind it.
  vec2 o = p.xz - vec2(${f(FURNACE.x)}, ${f(FURNACE.z)});
  vec2 dr = normalize(-SHAFT.xz);
  float b = dot(o, dr), c = dot(o, o) - ${f((FURNACE.r + 1.2) ** 2)};
  float disc = b * b - c;
  if (disc > 0.0) {
    float s = -b - sqrt(disc);
    float y = p.y - SHAFT.y / length(SHAFT.xz) * max(s, 0.0);
    if (s > 0.0 && y < 30.0) on *= 0.0;
  }
  return on;
}`;

// The lights the iron casts: up to ten, packed position and colour.
export const NL = 10;
export const LIGHTS = /* glsl */`
uniform vec4 uLP[${NL}];
uniform vec3 uLC[${NL}];
vec3 ironLight(vec3 p, vec3 n) {
  vec3 s = vec3(0.0);
  for (int i = 0; i < ${NL}; i++) {
    vec3 d = uLP[i].xyz - p;
    float r2 = dot(d, d) + uLP[i].w;
    float nl = max(dot(n, d) * inversesqrt(r2), 0.0) * 0.85 + 0.15;
    s += uLC[i] * nl / r2;
  }
  return s;
}`;

/* ---------- the hall: shell, columns, trusses, floor, gear ---------- */
export const HALL_VS = /* glsl */`
attribute vec3 color;
attribute float glow;
varying vec3 vP, vN, vC;
varying float vG;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vP = w.xyz;
  vN = normalize(mat3(modelMatrix) * normal);
  vC = color;
  vG = glow;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

export const HALL_FS = /* glsl */`
${NOISE}
${SHAFTS}
${LIGHTS}
uniform vec3 uShaftC, uAmb, uGlowC;
uniform float uGlowK, uHot;
varying vec3 vP, vN, vC;
varying float vG;
void main() {
  vec3 n = normalize(vN);
  // Grime: soot and dust break up every face.
  float g = vn(vP.xz * 1.7 + vP.y * 0.9) * 0.5 + vn(vP.zy * 5.3 + vP.x) * 0.3 + 0.45;
  vec3 alb = vC * g;
  vec3 L = uAmb * (0.6 + 0.4 * n.y);
  L += ironLight(vP, n);
  float sh = shaftAt(vP + n * 0.05);
  L += uShaftC * sh * max(dot(n, -SHAFT), 0.0);
  vec3 c = alb * L;
  // Glow 1: a peephole. Glow 2: the taphole clay. Glow -1: a window pane.
  c += uGlowC * uGlowK * (1.0 - smoothstep(0.0, 0.5, abs(vG - 1.0)));
  c += vec3(1.0, 0.3, 0.05) * uHot * g * (1.0 - smoothstep(0.0, 0.5, abs(vG - 2.0)));
  c += uShaftC * 0.05 * (1.0 - smoothstep(0.0, 0.5, abs(vG + 1.0)));
  gl_FragColor = vec4(c, 1.0);
}`;

/* ---------- the iron and slag in the channels ---------- */
// aCell: the sim cell; aU: across, -1 to 1; aS: metres along; aBed: bed height.
export const IRON_VS = /* glsl */`
uniform sampler2D uSim;
attribute float aCell, aU, aS, aBed, aW;
varying vec4 vSim;
varying vec3 vP;
varying vec2 vQ;
varying float vU;
void main() {
  int c = int(aCell);
  vec4 s = texelFetch(uSim, ivec2(c, 0), 0);
  float h = s.r + s.g;
  // An empty cell sinks under the bed and hides.
  vec3 p = position;
  // The surface bulges a little at the centre and wets the walls.
  p.y = aBed + (h > 0.003 ? h * (0.92 + 0.08 * (1.0 - aU * aU)) : -0.06);
  vSim = s;
  vP = p;
  vQ = vec2(aU * aW * 0.5, aS);
  vU = aU;
  gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
}`;

export const IRON_FS = /* glsl */`
${NOISE}
${INCAND}
${SHAFTS}
uniform vec3 uShaftC;
uniform float uTime;
varying vec4 vSim;
varying vec3 vP;
varying vec2 vQ;
varying float vU;
void main() {
  float hI = vSim.r, hS = vSim.g, T = vSim.b, spd = vSim.a;
  float h = hI + hS;
  if (h < 0.003) discard;
  float sp = abs(spd);
  // Two phases of the same noise slide with the flow, in turn: no smear.
  float ph = fract(uTime * 0.35), w = abs(ph * 2.0 - 1.0);
  float adv = spd * 2.8;
  vec2 q0 = vec2(vQ.x, vQ.y - adv * ph), q1 = vec2(vQ.x, vQ.y - adv * fract(ph + 0.5)) + 7.3;
  float st0 = vn(q0 * vec2(3.0, 0.9)) * 0.6 + vn(q0 * vec2(9.0, 2.6)) * 0.4;
  float st1 = vn(q1 * vec2(3.0, 0.9)) * 0.6 + vn(q1 * vec2(9.0, 2.6)) * 0.4;
  float st = mix(st0, st1, w);
  // Slag rides on top in drifting patches; its share sets their size.
  float fs = hS / max(h, 1e-4);
  float sn = mix(vn(q0 * 1.6 + 3.0), vn(q1 * 1.6 + 3.0), w);
  float slag = smoothstep(1.0 - fs - 0.08, 1.0 - fs + 0.08, sn);
  // Crust: slow and cooling iron skins over, first at the walls.
  float edge = smoothstep(0.55, 1.0, abs(vU));
  float still = 1.0 - smoothstep(0.05, 0.5, sp);
  float crust = clamp(smoothstep(0.92, 0.6, T) * (0.35 + 0.65 * still) + edge * smoothstep(0.99, 0.8, T) + 0.5 * slag * smoothstep(0.9, 0.7, T), 0.0, 1.0);
  vec2 cq = vQ * vec2(2.6, 1.6);
  float cr = crack(cq);
  float fw = fwidth(cr);
  float wide = mix(0.03, 0.14, smoothstep(0.35, 0.9, T));
  float open = 1.0 - smoothstep(0.0, wide + fw, cr);
  // The liquid: a bright mirror that streams along the flow.
  // The liquid stays under bloom's white: the streaks must read.
  vec3 hot = incand(T * (0.95 + 0.06 * st)) * (0.32 + 0.3 * st);
  vec3 slagC = incand(T * 0.9) * (0.45 + 0.4 * vn(vQ * 11.0 + uTime * 0.3));
  vec3 liq = mix(hot, slagC, slag);
  // Crust: dark plates with glowing cracks; cold iron turns grey-silver.
  vec3 plate = mix(vec3(0.018, 0.016, 0.015), vec3(0.09, 0.09, 0.1), smoothstep(0.4, 0.15, T) * (1.0 - slag));
  vec3 crustC = plate + incand(T * 0.95) * (open * 0.9 + 0.04 * smoothstep(0.7, 0.9, T));
  vec3 c = mix(liq, crustC, crust);
  // Skull from the last cast: a few cracks still glow dull red.
  float ember = smoothstep(0.08, 0.2, T) * (1.0 - smoothstep(0.3, 0.45, T)) * smoothstep(0.55, 0.8, vn(vQ * 0.7 + 3.1));
  c += vec3(0.5, 0.05, 0.005) * open * ember * 0.5;
  // Mirror glints of the cool shafts on the open liquid.
  vec3 V = normalize(cameraPosition - vP);
  vec3 n = normalize(vec3((st0 - 0.5) * 0.12, 1.0, (st1 - 0.5) * 0.12));
  float spec = pow(max(dot(reflect(-V, n), -SHAFT), 0.0), 60.0) * shaftAt(vP + vec3(0.0, 0.05, 0.0));
  c += uShaftC * spec * 2.0 * (1.0 - crust * 0.6);
  // Cold silver skin catches the shafts too.
  c += uShaftC * 0.3 * smoothstep(0.35, 0.1, T) * max(dot(n, -SHAFT), 0.0) * shaftAt(vP + vec3(0.0, 0.05, 0.0));
  gl_FragColor = vec4(c, 1.0);
}`;

/* ---------- streams: the jet from the taphole, the fall from the spout ---------- */
// A tube along a parabola: position.y runs 0 to 1 along it, x round it.
export const STREAM_VS = /* glsl */`
uniform vec3 uA, uV;
uniform float uLen, uR, uG, uTime;
varying vec2 vQ;
varying float vF;
void main() {
  float t = position.y * uLen;
  vec3 p = uA + uV * t + vec3(0.0, -0.5 * uG * t * t, 0.0);
  vec3 tg = normalize(uV + vec3(0.0, -uG * t, 0.0));
  vec3 side = normalize(cross(tg, normalize(cameraPosition - p)));
  // The stream necks as it falls and frays at its end.
  float r = uR * (1.0 - 0.25 * position.y);
  p += side * position.x * r;
  vQ = vec2(position.x, t);
  vF = position.y;
  gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
}`;

export const STREAM_FS = /* glsl */`
${NOISE}
${INCAND}
uniform float uTime, uHeat, uOn, uLen;
varying vec2 vQ;
varying float vF;
void main() {
  float x = vQ.x;
  float n = vn(vec2(x * 3.0, vQ.y * 2.2 - uTime * 9.0)) * 0.6 + vn(vec2(x * 7.0, vQ.y * 6.0 - uTime * 14.0)) * 0.4;
  float core = 1.0 - smoothstep(0.35 + 0.4 * n, 1.0, abs(x));
  if (core < 0.01 || uOn < 0.01) discard;
  vec3 c = incand(uHeat * (0.94 + 0.06 * n)) * (0.4 + 0.35 * n) * core * uOn;
  gl_FragColor = vec4(c, core * uOn);
}`;

/* ---------- sparks: streaks solved from launch time and speed ---------- */
// iO: origin; iV: launch velocity; iT: t0, life, drag, size.
export const SPARK_VS = /* glsl */`
${INCAND}
attribute vec3 iO, iV;
attribute vec4 iT;
uniform float uTime, uShutter, uPx;
uniform vec2 uView;
varying float vSide, vAlong;
varying vec3 vC;
vec3 at(float t) {
  float k = iT.z, e = exp(-k * t);
  vec3 g = vec3(0.0, -9.81, 0.0);
  return iO + iV * (1.0 - e) / k + g * (t / k - (1.0 - e) / (k * k));
}
void main() {
  float t = uTime - iT.x;
  vAlong = 0.0;
  if (t < 0.0 || t > iT.y) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); vC = vec3(0.0); vSide = 0.0; return; }
  vec3 pa = at(t), pb = at(max(t - uShutter, 0.0));
  vec4 ca = projectionMatrix * viewMatrix * vec4(pa, 1.0);
  vec4 cb = projectionMatrix * viewMatrix * vec4(pb, 1.0);
  if (ca.w < 0.1 || cb.w < 0.1) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); vC = vec3(0.0); vSide = 0.0; return; }
  vec2 sa = ca.xy / ca.w * 0.5 * uView, sb = cb.xy / cb.w * 0.5 * uView;
  vec2 d = sa - sb;
  float l = max(length(d), 1e-3);
  vec2 nn = vec2(-d.y, d.x) / l;
  float w = (0.55 + 0.8 * iT.w) * uPx;
  float side = position.y;
  bool head = position.x > 0.5;
  vec4 cc = head ? ca : cb;
  vec2 sp = (head ? sa : sb) + nn * w * side + d / l * w * (head ? 1.0 : -1.0);
  gl_Position = vec4(sp / (0.5 * uView) * cc.w, cc.z, cc.w);
  vSide = side;
  vAlong = position.x * 2.0 - 1.0;
  // A spark cools as it flies; it flares once just before it bursts.
  float a = t / iT.y;
  float heat = 1.0 - 0.45 * a + 0.12 * smoothstep(0.82, 0.95, a) * step(0.5, iT.w);
  vC = incand(heat) * 1.5 * (1.0 - smoothstep(0.85, 1.0, a)) * min(1.0, 3.0 * w / (l + w));
}`;

export const SPARK_FS = /* glsl */`
varying float vSide, vAlong;
varying vec3 vC;
void main() {
  // Round at both ends, so a short streak is a soft dot, not a square.
  float a = 1.0 - smoothstep(0.55, 1.0, abs(vAlong));
  gl_FragColor = vec4(vC * exp(-vSide * vSide * 2.2) * (0.35 + 0.65 * a), 1.0);
}`;

/* ---------- post: shimmer, then the grade ---------- */
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
      // Cool shadows, a soft vignette, fine grain.
      float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
      c += vec3(-0.001, 0.0, 0.004) * (1.0 - smoothstep(0.0, 0.15, l));
      vec2 q = (vUv - 0.5) * vec2(uAsp, 1.0);
      c *= 1.0 - 0.3 * dot(q, q);
      c += (h(vUv * 917.0 + uGrain) - 0.5) * 0.007 * (0.25 + c);
      gl_FragColor = vec4(max(c, 0.0), 1.0);
    }`,
};

/* ---------- haze: shafts by march, the iron's glow in closed form ---------- */
export const HAZE = {
  uniforms: {
    tDiffuse: { value: null }, tDepth: { value: null },
    uProjInv: { value: null }, uCamW: { value: null }, uCamP: { value: null },
    uLP: { value: null }, uLC: { value: null }, uShaftC: { value: null },
    uSigma: { value: 0.022 }, uSteps: { value: 28 }, uFrame: { value: 0 }, uWarm: { value: 1 },
  },
  vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: /* glsl */`
    ${SHAFTS}
    uniform sampler2D tDiffuse, tDepth;
    uniform mat4 uProjInv, uCamW;
    uniform vec3 uCamP, uShaftC;
    uniform vec4 uLP[${NL}];
    uniform vec3 uLC[${NL}];
    uniform float uSigma, uSteps, uFrame, uWarm;
    varying vec2 vUv;
    float ign(vec2 p) { return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715)))); }
    void main() {
      vec3 c = texture2D(tDiffuse, vUv).rgb;
      float z = texture2D(tDepth, vUv).r;
      vec4 v = uProjInv * vec4(vUv * 2.0 - 1.0, z * 2.0 - 1.0, 1.0);
      vec3 pw = (uCamW * vec4(v.xyz / v.w, 1.0)).xyz;
      vec3 rd = pw - uCamP;
      float L = min(length(rd), 90.0);
      rd = normalize(rd);
      // Thicker haze under the roof, where fume gathers.
      float dens = uSigma;
      float T = exp(-dens * L);
      // The shafts: a short march with a jittered start.
      float n = uSteps, dt = L / n, j = ign(gl_FragCoord.xy + uFrame * 5.588);
      float sh = 0.0;
      for (int i = 0; i < 48; i++) {
        if (float(i) >= n) break;
        float t = (float(i) + j) * dt;
        vec3 p = uCamP + rd * t;
        float hk = 0.6 + 0.8 * smoothstep(4.0, 22.0, p.y);
        // Shafts fade near the lens, so the eye never stands in glare.
        sh += shaftAt(p) * hk * exp(-dens * t) * smoothstep(2.0, 12.0, t);
      }
      // Forward scatter makes the shafts brighter toward the windows.
      float mu = dot(rd, -SHAFT);
      float ph = 0.5 + 1.6 * pow(max(mu, 0.0), 6.0);
      vec3 ins = uShaftC * sh * dt * dens * ph * 1.4;
      // The iron's lights: inverse-square scatter integrated along the ray.
      vec3 warm = vec3(0.0);
      for (int k = 0; k < ${NL}; k++) {
        vec3 op = uLP[k].xyz - uCamP;
        float b = dot(op, rd);
        float h2 = max(dot(op, op) - b * b, 0.0) + uLP[k].w + 0.3;
        float h = sqrt(h2);
        warm += uLC[k] * (atan((L - b) / h) - atan(-b / h)) / h;
      }
      ins += warm * dens * 0.05 * uWarm;
      gl_FragColor = vec4(c * T + ins, 1.0);
    }`,
};

/* ---------- fume over the scene, and the heat's shimmer ---------- */
export const FUMEMIX = {
  uniforms: {
    tDiffuse: { value: null }, tVol: { value: null }, tVolHeat: { value: null },
    uRes: { value: null }, uAmp: { value: 1 }, uBend: { value: 30 },
  },
  vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse, tVol, tVolHeat;
    uniform vec2 uRes;
    uniform float uAmp, uBend;
    varying vec2 vUv;
    void main() {
      // Hot gas bends light along the gradient of its shimmer.
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
