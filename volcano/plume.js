// Volcano plume: the ash column as a 3D fluid on the GPU, shaded as Fire's smoke and flame.
/* ---------- K3: volume fluid (WebGL2 port, from jethover/fluid.js) ---------- */
// The method follows shared/fire.js: advect, buoyancy, turbulence,
// vorticity confinement, a Jacobi pressure solve, dye transport.
// The grid packs its y slices as tiles in one 2D texture.
import * as THREE from 'three';
import { VENT } from './erupt.js';

// Grid size in cells, and tiles per atlas row.
const NX = 48, NY = 72, NZ = 48, TC = 9;
const AW = NX * TC, AH = NZ * Math.ceil(NY / TC);
export const CELL = 70;
// The box: 3.4 km wide and deep, 5 km tall, from just under the vent.
// It sits downwind of the vent, so a bent column stays inside.
export const BOX_MIN = new THREE.Vector3(VENT[0] - NX * CELL * 0.62, VENT[1] - 60, VENT[2] - NZ * CELL / 2);
export const BOX_MAX = new THREE.Vector3(BOX_MIN.x + NX * CELL, BOX_MIN.y + NY * CELL, BOX_MIN.z + NZ * CELL);
const JACOBI = 18;

const f = n => n.toFixed(1);
export const HEAD = /* glsl */`
const int NX = ${NX}, NY = ${NY}, NZ = ${NZ}, TC = ${TC};
const vec3 NF = vec3(${f(NX)}, ${f(NY)}, ${f(NZ)});
const vec2 ATLAS = vec2(${f(AW)}, ${f(AH)});
const float CELL = ${f(CELL)};
const vec3 BMIN = vec3(${f(BOX_MIN.x)}, ${f(BOX_MIN.y)}, ${f(BOX_MIN.z)});
const vec3 BMAX = vec3(${f(BOX_MAX.x)}, ${f(BOX_MAX.y)}, ${f(BOX_MAX.z)});
// The cell this atlas pixel holds.
ivec3 cellOf(vec2 fc) {
  ivec2 p = ivec2(fc);
  int tx = p.x / NX, ty = p.y / NZ;
  return ivec3(p.x - tx * NX, ty * TC + tx, p.y - ty * NZ);
}
vec4 F(sampler2D t, ivec3 c) {
  c = clamp(c, ivec3(0), ivec3(NX - 1, NY - 1, NZ - 1));
  return texelFetch(t, ivec2((c.y % TC) * NX + c.x, (c.y / TC) * NZ + c.z), 0);
}
vec2 tuv(float y, vec2 xz) { return (vec2(mod(y, float(TC)) * NF.x, floor(y / float(TC)) * NF.z) + xz) / ATLAS; }
// Trilinear: bilinear in the tile, a mix between two slices.
vec4 S(sampler2D t, vec3 c) {
  vec2 xz = clamp(c.xz, vec2(0.5), NF.xz - 0.5);
  float y = clamp(c.y - 0.5, 0.0, NF.y - 1.0), y0 = floor(y);
  return mix(texture(t, tuv(y0, xz)), texture(t, tuv(min(y0 + 1.0, NF.y - 1.0), xz)), y - y0);
}
float h31(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
float vn3(vec3 p) {
  vec3 i = floor(p), u = fract(p);
  u = u * u * (3.0 - 2.0 * u);
  return mix(mix(mix(h31(i), h31(i + vec3(1, 0, 0)), u.x), mix(h31(i + vec3(0, 1, 0)), h31(i + vec3(1, 1, 0)), u.x), u.y),
             mix(mix(h31(i + vec3(0, 0, 1)), h31(i + vec3(1, 0, 1)), u.x), mix(h31(i + vec3(0, 1, 1)), h31(i + vec3(1, 1, 1)), u.x), u.y), u.z);
}
`;
const PREC = /* glsl */`precision highp float;\nprecision highp sampler2D;\n`;
const VS = /* glsl */`
in vec3 position;
void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }`;

/* ---------- sim kernels ---------- */
const CURL = /* glsl */`${PREC}${HEAD}
uniform sampler2D tVel;
out vec4 o;
void main() {
  ivec3 c = cellOf(gl_FragCoord.xy);
  vec3 vR = F(tVel, c + ivec3(1, 0, 0)).xyz, vL = F(tVel, c - ivec3(1, 0, 0)).xyz;
  vec3 vU = F(tVel, c + ivec3(0, 1, 0)).xyz, vD = F(tVel, c - ivec3(0, 1, 0)).xyz;
  vec3 vF = F(tVel, c + ivec3(0, 0, 1)).xyz, vB = F(tVel, c - ivec3(0, 0, 1)).xyz;
  vec3 w = vec3(vU.z - vD.z - (vF.y - vB.y), vF.x - vB.x - (vR.z - vL.z), vR.y - vL.y - (vU.x - vD.x)) / (2.0 * CELL);
  o = vec4(w, length(w));
}`;

// The jets: nozzle point and radius, axis and length, then speed, heat and ash.
const JETS = /* glsl */`
uniform vec4 uJetP[2];
uniform vec4 uJetA[2];
uniform vec4 uJetK[2];
// How much a point lies in jet i's core: 1 on the axis, 0 outside.
float inJet(int i, vec3 P) {
  vec3 d = P - uJetP[i].xyz;
  float t = dot(d, uJetA[i].xyz);
  if (t < -CELL || t > uJetA[i].w) return 0.0;
  float r = length(d - uJetA[i].xyz * t);
  return smoothstep(uJetP[i].w, uJetP[i].w * 0.35, r);
}`;

const ADVECT_VEL = /* glsl */`${PREC}${HEAD}${JETS}
uniform sampler2D tVel, tDye, tCurl;
uniform float uDt, uTime, uBuoy, uWeight, uTurb, uVort, uDamp;
uniform vec2 uWind;
out vec4 o;
void main() {
  ivec3 c = cellOf(gl_FragCoord.xy);
  vec3 pc = vec3(c) + 0.5, P = BMIN + pc * CELL;
  vec3 v0 = F(tVel, c).xyz;
  vec3 v = S(tVel, pc - v0 * uDt / CELL).xyz;
  vec4 dye = F(tDye, c);
  float stuff = clamp(dye.g * 0.5 + dye.r, 0.0, 1.0);
  // Hot gas rises; ash weighs it down.
  v.y += (dye.g * uBuoy - dye.r * uWeight) * uDt;
  // Turbulence: a drifting noise field; the projection makes it swirl.
  vec3 q = P * 0.0019 + vec3(0.0, -uTime * 0.05, uTime * 0.017);
  vec3 n = vec3(vn3(q), vn3(q + 17.1), vn3(q + 41.7)) - 0.5;
  v += n * uTurb * stuff * uDt;
  // Vorticity confinement spins small curls back up into rolls.
  vec4 wC = F(tCurl, c);
  vec3 eta = vec3(F(tCurl, c + ivec3(1, 0, 0)).w - F(tCurl, c - ivec3(1, 0, 0)).w,
                  F(tCurl, c + ivec3(0, 1, 0)).w - F(tCurl, c - ivec3(0, 1, 0)).w,
                  F(tCurl, c + ivec3(0, 0, 1)).w - F(tCurl, c - ivec3(0, 0, 1)).w);
  v += cross(eta / (length(eta) + 1e-5), wC.xyz) * uVort * CELL * stuff * uDt;
  v *= max(1.0 - uDamp * uDt, 0.0);
  // The wind drags the gas; it grows with height over the vent.
  vec2 wv = uWind * (0.25 + 0.75 * smoothstep(0.0, 3000.0, P.y - BMIN.y));
  v.xz = mix(v.xz, wv, 1.0 - exp(-uDt * 0.12));
  // Each jet drives its core straight up its axis.
  for (int i = 0; i < 2; i++) {
    float k = inJet(i, P);
    v = mix(v, uJetA[i].xyz * uJetK[i].x, k * 0.9);
  }
  if (c.y == 0) v.y = max(v.y, 0.0);
  o = vec4(v, 0.0);
}`;

const DIVERGE = /* glsl */`${PREC}${HEAD}
uniform sampler2D tVel;
out vec4 o;
void main() {
  ivec3 c = cellOf(gl_FragCoord.xy);
  vec3 vC = F(tVel, c).xyz;
  float vD = c.y == 0 ? -vC.y : F(tVel, c - ivec3(0, 1, 0)).y;
  float d = F(tVel, c + ivec3(1, 0, 0)).x - F(tVel, c - ivec3(1, 0, 0)).x
          + F(tVel, c + ivec3(0, 1, 0)).y - vD
          + F(tVel, c + ivec3(0, 0, 1)).z - F(tVel, c - ivec3(0, 0, 1)).z;
  o = vec4(0.5 * d, 0.0, 0.0, 0.0);
}`;

// Pressure: zero past the open walls, mirrored at the floor.
const PRESSURE = /* glsl */`
float Pr(sampler2D t, ivec3 c, float pc) {
  if (c.y < 0) return pc;
  if (c.x < 0 || c.z < 0 || c.x >= NX || c.z >= NZ || c.y >= NY) return 0.0;
  return F(t, c).x;
}`;
const JACOBI_FS = /* glsl */`${PREC}${HEAD}${PRESSURE}
uniform sampler2D tP, tDiv;
out vec4 o;
void main() {
  ivec3 c = cellOf(gl_FragCoord.xy);
  float pc = F(tP, c).x;
  float s = Pr(tP, c + ivec3(1, 0, 0), pc) + Pr(tP, c - ivec3(1, 0, 0), pc) + Pr(tP, c + ivec3(0, 1, 0), pc)
          + Pr(tP, c - ivec3(0, 1, 0), pc) + Pr(tP, c + ivec3(0, 0, 1), pc) + Pr(tP, c - ivec3(0, 0, 1), pc);
  o = vec4((s - F(tDiv, c).x) / 6.0, 0.0, 0.0, 0.0);
}`;
const PROJECT = /* glsl */`${PREC}${HEAD}${PRESSURE}
uniform sampler2D tP, tVel;
out vec4 o;
void main() {
  ivec3 c = cellOf(gl_FragCoord.xy);
  float pc = F(tP, c).x;
  vec3 g = vec3(Pr(tP, c + ivec3(1, 0, 0), pc) - Pr(tP, c - ivec3(1, 0, 0), pc),
                Pr(tP, c + ivec3(0, 1, 0), pc) - Pr(tP, c - ivec3(0, 1, 0), pc),
                Pr(tP, c + ivec3(0, 0, 1), pc) - Pr(tP, c - ivec3(0, 0, 1), pc));
  vec3 v = F(tVel, c).xyz - 0.5 * g;
  if (c.y == 0) v.y = max(v.y, 0.0);
  o = vec4(v, 0.0);
}`;

// Dye: r ash, g heat, b age.
const ADVECT_DYE = /* glsl */`${PREC}${HEAD}${JETS}
uniform sampler2D tVel, tDye;
uniform float uDt, uDiss, uCool;
out vec4 o;
void main() {
  ivec3 c = cellOf(gl_FragCoord.xy);
  vec3 pc = vec3(c) + 0.5, P = BMIN + pc * CELL;
  vec3 v = F(tVel, c).xyz;
  vec4 d = S(tDye, pc - v * uDt / CELL);
  float ash = d.r * max(1.0 - uDiss * uDt, 0.0);
  float heat = d.g * max(1.0 - uCool * uDt, 0.0);
  float age = d.b + uDt, add = 0.0;
  // The vent jets load their cores with heat and ash.
  // Only the nozzle loads the gas; the flow carries it up the jet.
  for (int i = 0; i < 2; i++) {
    float near = smoothstep(3.0 * CELL, CELL, dot(P - uJetP[i].xyz, uJetA[i].xyz));
    float k = inJet(i, P) * near * 2.5;
    heat += k * uJetK[i].y * uDt;
    float a = k * uJetK[i].z * uDt;
    ash += a; add += a;
  }
  age = mix(age, 0.0, clamp(add / max(ash, 1e-3), 0.0, 1.0));
  // Gas fades out before it meets the walls and the roof.
  vec3 e = min(pc, NF - pc);
  float fade = smoothstep(0.0, 4.0, min(e.x, e.z)) * smoothstep(0.0, 4.0, e.y + (c.y < 4 ? 9.0 : 0.0));
  o = vec4(clamp(ash, 0.0, 6.0) * fade, clamp(heat, 0.0, 8.0) * fade, ash < 0.003 ? 0.0 : age, 0.0);
}`;
/* ---------- end K3 ---------- */

// OKLCH to linear sRGB, for Fire's ramp stops.
function oklch(L, C, h) {
  const a = C * Math.cos((h * Math.PI) / 180), b = C * Math.sin((h * Math.PI) / 180);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return new THREE.Vector3(
    Math.max(0, 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    Math.max(0, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    Math.max(0, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s));
}

// The march of the plume, pasted into the cloud pass.
// The host declares FIRE, BOLT, uLight, uHeat, uFlash, uBolt, uBoltPos and hg().
export const PLUME_GLSL = /* glsl */`
uniform sampler2D tDye, tVel;
uniform float uPlumeT;
uniform vec3 uRampS, uRampM, uRampE, uSmoke;
// Fire's blackbody ramp: end, mid, then start colour.
vec3 fireRamp(float t) {
  vec3 c = mix(vec3(0.0), uRampE, smoothstep(0.05, 0.35, t));
  c = mix(c, uRampM, smoothstep(0.35, 0.65, t));
  return mix(c, uRampS, smoothstep(0.65, 1.0, t));
}
// The light the plume scatters along the ray, cover in alpha; tHit is its first ash.
vec4 plumeMarch(vec3 ro, vec3 rd, float tEnd, out float tHit) {
  tHit = -1.0;
  vec3 inv = 1.0 / rd, a = (BMIN - ro) * inv, b = (BMAX - ro) * inv;
  vec3 lo = min(a, b), hi = max(a, b);
  float t0 = max(max(lo.x, lo.y), max(lo.z, 0.0)), t1 = min(min(hi.x, min(hi.y, hi.z)), tEnd);
  if (t1 <= t0) return vec4(0.0);
  const int N = 72;
  float ds = (t1 - t0) / float(N);
  float j = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));
  float tr = 1.0;
  vec3 col = vec3(0.0);
  for (int i = 0; i < N; i++) {
    if (tr < 0.01) break;
    float t = t0 + (float(i) + j) * ds;
    vec3 p = ro + rd * t;
    vec3 c = (p - BMIN) / CELL;
    // Velocity warps the lookup, so the ash streaks with its flow.
    vec3 vw = S(tVel, c).xyz;
    vec4 s = S(tDye, c - vw * 1.2 / CELL);
    float body = min(s.r, 3.0);
    if (body < 0.004 && s.g < 0.02) continue;
    // Cloud erosion, as in Fire: the grid gives the body, three octaves cut its edges.
    vec3 q = (p - vw * 1.5) * 0.0062 + vec3(0.0, -s.b * 0.02 - uPlumeT * 0.01, 0.0);
    float fb = vn3(q * 1.1) * 0.55 + vn3(q * 2.5 + 7.3) * 0.3 + vn3(q * 5.7 + vec3(uPlumeT * 0.02, 0.0, 0.0)) * 0.15;
    float den = body * smoothstep(0.42, 0.62, fb + min(body, 1.0) * 0.12) * 2.6;
    // Fire's smoke: two short shadow taps toward the vent light.
    vec3 Lv = uLight - p;
    float dl = length(Lv);
    vec3 L = Lv / dl;
    float sh = S(tDye, c + L * (90.0 / CELL)).r * 0.5 + S(tDye, c + L * (220.0 / CELL)).r * 0.7 + S(tDye, c + L * (450.0 / CELL)).r * 1.2;
    float tau = sh * 1.6;
    float beer = exp(-tau);
    float base = beer + exp(-tau * 0.25) * 0.5;
    float powder = 1.0 - exp(-tau * 2.0);
    float lt = clamp(mix(base, base * powder, 0.35) + 0.06, 0.0, 1.0);
    float ph = hg(dot(rd, L), 0.35) * 12.566;
    float rf = 4.0e6 / (dl * dl + 4.0e6);
    vec3 Li = FIRE * (uHeat * 2.2 + uFlash * 6.0) * rf * lt * ph;
    // Cool sky light from above, dimmed by the ash over this point.
    float up = exp(-S(tDye, c + vec3(0.0, 300.0 / CELL, 0.0)).r * 1.4);
    Li += vec3(0.022, 0.03, 0.055) * (0.35 + 1.3 * up);
    // A bolt in the column lights the ash round it.
    vec3 bq = uBoltPos - p;
    Li += BOLT * uBolt * 2.5 * exp(-dot(bq, bq) / 4.0e5);
    // Fire's flame: emission tinted by heat, strongest in the hot core.
    // Only the hottest gas, near the vent, glows; the ash above takes light.
    float ht = clamp((s.g - 2.5) * 0.3, 0.0, 1.0);
    // Fire breaks its flame with the smoke's own noise, so the glow is ragged.
    float rag = smoothstep(0.3, 0.7, fb);
    vec3 Le = fireRamp(ht) * pow(ht, 1.1) * 0.9 * (den + 0.15) * (0.25 + 1.2 * rag);
    float al = 1.0 - exp(-den * 0.026 * ds);
    // The hot core glows even where the ash is thin.
    col += tr * (al * Li * uSmoke + Le * (al + 0.003 * ds * smoothstep(0.3, 0.9, ht) * rag));
    tr *= 1.0 - al;
    if (tHit < 0.0 && al > 0.02) tHit = t;
  }
  if (tHit < 0.0) tHit = t0;
  return vec4(col, 1.0 - tr);
}
`;

export function makePlume(renderer) {
  const raw = (fs, uniforms) => new THREE.RawShaderMaterial({ glslVersion: THREE.GLSL3, vertexShader: VS, fragmentShader: fs, uniforms, depthTest: false, depthWrite: false });
  const grid = () => {
    const t = new THREE.WebGLRenderTarget(AW, AH, { type: THREE.HalfFloatType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false });
    t.texture.generateMipmaps = false;
    return t;
  };
  const vel = [grid(), grid()], dye = [grid(), grid()], pr = [grid(), grid()], div = grid(), curl = grid();
  const quad = new THREE.Mesh(new THREE.BufferGeometry(), null);
  quad.geometry.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
  quad.frustumCulled = false;
  const qScene = new THREE.Scene(), qCam = new THREE.Camera();
  qScene.add(quad);
  const run = (m, rt) => { quad.material = m; renderer.setRenderTarget(rt); renderer.render(qScene, qCam); };

  const jetU = {
    uJetP: { value: [0, 1].map(() => new THREE.Vector4()) },
    uJetA: { value: [0, 1].map(() => new THREE.Vector4(0, 1, 0, 0)) },
    uJetK: { value: [0, 1].map(() => new THREE.Vector4()) },
  };
  const U = {
    uDt: { value: 1 / 60 }, uTime: { value: 0 },
    uBuoy: { value: 8 }, uWeight: { value: 0.4 }, uTurb: { value: 60 }, uVort: { value: 1.6 }, uDamp: { value: 0.03 },
    uDiss: { value: 0.006 }, uCool: { value: 0.11 }, uWind: { value: new THREE.Vector2() },
  };
  const mCurl = raw(CURL, { tVel: { value: null } });
  const mAdvV = raw(ADVECT_VEL, { ...jetU, tVel: { value: null }, tDye: { value: null }, tCurl: { value: curl.texture }, uDt: U.uDt, uTime: U.uTime, uBuoy: U.uBuoy, uWeight: U.uWeight, uTurb: U.uTurb, uVort: U.uVort, uDamp: U.uDamp, uWind: U.uWind });
  const mDiv = raw(DIVERGE, { tVel: { value: null } });
  const mJac = raw(JACOBI_FS, { tP: { value: null }, tDiv: { value: div.texture } });
  const mProj = raw(PROJECT, { tP: { value: null }, tVel: { value: null } });
  const mAdvD = raw(ADVECT_DYE, { ...jetU, tVel: { value: null }, tDye: { value: null }, uDt: U.uDt, uDiss: U.uDiss, uCool: U.uCool });

  // The uniforms the cloud pass reads to march the plume.
  const MU = {
    tDye: { value: dye[0].texture }, tVel: { value: vel[0].texture }, uPlumeT: U.uTime,
    // Fire's wood ramp and smoke tint (fire/index.html CHEMS.wood), at the middle Temperature.
    uRampS: { value: oklch(0.93, 0.11, 95) }, uRampM: { value: oklch(0.72, 0.19, 52) }, uRampE: { value: oklch(0.6, 0.24, 30) },
    // Ash is darker than wood smoke: Fire's tint at half its lightness.
    uSmoke: { value: oklch(0.8, 0.03, 50).multiplyScalar(0.55) },
  };

  // One step of the whole fluid.
  function step(dt) {
    U.uDt.value = dt;
    U.uTime.value += dt;
    mCurl.uniforms.tVel.value = vel[0].texture;
    run(mCurl, curl);
    mAdvV.uniforms.tVel.value = vel[0].texture;
    mAdvV.uniforms.tDye.value = dye[0].texture;
    run(mAdvV, vel[1]);
    mDiv.uniforms.tVel.value = vel[1].texture;
    run(mDiv, div);
    for (let i = 0; i < JACOBI; i++) {
      mJac.uniforms.tP.value = pr[i & 1].texture;
      run(mJac, pr[(i + 1) & 1]);
    }
    mProj.uniforms.tP.value = pr[JACOBI & 1].texture;
    mProj.uniforms.tVel.value = vel[1].texture;
    run(mProj, vel[0]);
    mAdvD.uniforms.tVel.value = vel[0].texture;
    mAdvD.uniforms.tDye.value = dye[0].texture;
    run(mAdvD, dye[1]);
    dye.reverse();
    MU.tDye.value = dye[0].texture;
    MU.tVel.value = vel[0].texture;
    renderer.setRenderTarget(null);
  }

  // Empties the grid: no gas, no motion.
  function clear() {
    const c = renderer.getClearColor(new THREE.Color()), a = renderer.getClearAlpha();
    renderer.setClearColor(0x000000, 0);
    for (const t of [...vel, ...dye, ...pr, div, curl]) { renderer.setRenderTarget(t); renderer.clear(); }
    renderer.setRenderTarget(null);
    renderer.setClearColor(c, a);
  }
  clear();

  // Sets jet i: the nozzle, its axis, then speed, heat and ash.
  function jet(i, p, r, axis, len, speed, heat, ash) {
    jetU.uJetP.value[i].set(p[0], p[1], p[2], r);
    jetU.uJetA.value[i].set(axis[0], axis[1], axis[2], len);
    jetU.uJetK.value[i].set(speed, heat, ash, 0);
  }

  return {
    U, MU, step, clear, jet,
    // Debug: the max and mean of each channel of the dye or the velocity.
    stats(which = 'dye') {
      const buf = new Uint16Array(AW * AH * 4);
      renderer.readRenderTargetPixels(which === 'vel' ? vel[0] : dye[0], 0, 0, AW, AH, buf);
      const h = THREE.DataUtils.fromHalfFloat;
      const mx = [0, 0, 0, 0], sum = [0, 0, 0, 0];
      for (let i = 0; i < AW * AH; i++) for (let k = 0; k < 4; k++) { const v = h(buf[i * 4 + k]); mx[k] = Math.max(mx[k], Math.abs(v)); sum[k] += Math.abs(v); }
      return { max: mx.map(v => +v.toFixed(3)), mean: sum.map(v => +(v / (AW * AH)).toFixed(4)) };
    },
    mats: [mCurl, mAdvV, mDiv, mJac, mProj, mAdvD],
  };
}
