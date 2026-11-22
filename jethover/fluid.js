// Jet hover gas: a 3D fluid on the GPU, drawn as a lit volume with heat.
/* ---------- K3: volume fluid (WebGL2 port) ---------- */
// The method follows shared/fire.js: advect, buoyancy, turbulence,
// vorticity confinement, a Jacobi pressure solve, dye transport.
// The grid packs its y slices as tiles in one 2D texture.
import * as THREE from 'three';

// Grid size in cells, and tiles per atlas row.
const NX = 64, NY = 28, NZ = 64, TC = 7;
const AW = NX * TC, AH = NZ * Math.ceil(NY / TC);
export const CELL = 0.375;
// The box: 24 m wide and deep, 10.5 m tall, on the pad.
export const BOX_MIN = new THREE.Vector3(-NX * CELL / 2, 0, -NZ * CELL / 2);
export const BOX_MAX = new THREE.Vector3(NX * CELL / 2, NY * CELL, NZ * CELL / 2);
const JACOBI = 20;

const f = n => n.toFixed(1);
const HEAD = /* glsl */`
precision highp float;
precision highp sampler2D;
const int NX = ${NX}, NY = ${NY}, NZ = ${NZ}, TC = ${TC};
const vec3 NF = vec3(${f(NX)}, ${f(NY)}, ${f(NZ)});
const vec2 ATLAS = vec2(${f(AW)}, ${f(AH)});
const float CELL = ${CELL};
const vec3 BMIN = vec3(${f(BOX_MIN.x)}, 0.0, ${f(BOX_MIN.z)});
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
const VS = /* glsl */`
in vec3 position;
void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }`;

/* ---------- sim kernels ---------- */
const CURL = /* glsl */`${HEAD}
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

// The jets: nozzle point and radius, axis and column length, speed and heat.
const JETS = /* glsl */`
uniform vec4 uJetP[3];
uniform vec4 uJetA[3];
uniform vec4 uJetK[3];
// How much a point lies in jet i's core: 1 on the axis, 0 outside.
float inJet(int i, vec3 P) {
  vec3 d = P - uJetP[i].xyz;
  float t = dot(d, uJetA[i].xyz);
  if (t < -0.2 || t > uJetA[i].w) return 0.0;
  float r = length(d - uJetA[i].xyz * t);
  return smoothstep(uJetP[i].w, uJetP[i].w * 0.35, r);
}`;

const ADVECT_VEL = /* glsl */`${HEAD}${JETS}
uniform sampler2D tVel, tDye, tCurl;
uniform float uDt, uTime, uBuoy, uWeight, uTurb, uVort, uDamp;
out vec4 o;
void main() {
  ivec3 c = cellOf(gl_FragCoord.xy);
  vec3 pc = vec3(c) + 0.5, P = BMIN + pc * CELL;
  vec3 v0 = F(tVel, c).xyz;
  vec3 v = S(tVel, pc - v0 * uDt / CELL).xyz;
  vec4 dye = F(tDye, c);
  float stuff = clamp(dye.g * 0.5 + dye.r, 0.0, 1.0);
  // Hot gas rises; warm steam rises too, by a negative weight.
  v.y += (dye.g * uBuoy - dye.r * uWeight) * uDt;
  // Turbulence: a drifting noise field; the projection makes it swirl.
  vec3 q = P * 0.3 + vec3(0.0, -uTime * 0.7, uTime * 0.23);
  vec3 n = vec3(vn3(q), vn3(q + 17.1), vn3(q + 41.7)) - 0.5;
  v += n * uTurb * stuff * uDt;
  // Vorticity confinement spins small curls back up into rolls.
  vec4 wC = F(tCurl, c);
  vec3 eta = vec3(F(tCurl, c + ivec3(1, 0, 0)).w - F(tCurl, c - ivec3(1, 0, 0)).w,
                  F(tCurl, c + ivec3(0, 1, 0)).w - F(tCurl, c - ivec3(0, 1, 0)).w,
                  F(tCurl, c + ivec3(0, 0, 1)).w - F(tCurl, c - ivec3(0, 0, 1)).w);
  v += cross(eta / (length(eta) + 1e-5), wC.xyz) * uVort * CELL * stuff * uDt;
  v *= max(1.0 - uDamp * uDt, 0.0);
  // Each jet drives its core straight down its axis.
  for (int i = 0; i < 3; i++) {
    float k = inJet(i, P);
    v = mix(v, uJetA[i].xyz * uJetK[i].x, k * 0.9);
  }
  // The pad is solid; the far walls and the roof let gas out.
  if (c.y == 0) v.y = max(v.y, 0.0);
  o = vec4(v, 0.0);
}`;

const DIVERGE = /* glsl */`${HEAD}
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

// Pressure: zero past the open walls, mirrored at the pad.
const PRESSURE = /* glsl */`
float Pr(sampler2D t, ivec3 c, float pc) {
  if (c.y < 0) return pc;
  if (c.x < 0 || c.z < 0 || c.x >= NX || c.z >= NZ || c.y >= NY) return 0.0;
  return F(t, c).x;
}`;
const JACOBI_FS = /* glsl */`${HEAD}${PRESSURE}
uniform sampler2D tP, tDiv;
out vec4 o;
void main() {
  ivec3 c = cellOf(gl_FragCoord.xy);
  float pc = F(tP, c).x;
  float s = Pr(tP, c + ivec3(1, 0, 0), pc) + Pr(tP, c - ivec3(1, 0, 0), pc) + Pr(tP, c + ivec3(0, 1, 0), pc)
          + Pr(tP, c - ivec3(0, 1, 0), pc) + Pr(tP, c + ivec3(0, 0, 1), pc) + Pr(tP, c - ivec3(0, 0, 1), pc);
  o = vec4((s - F(tDiv, c).x) / 6.0, 0.0, 0.0, 0.0);
}`;
const PROJECT = /* glsl */`${HEAD}${PRESSURE}
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

// Dye: r dust and spray, g heat, b age.
const ADVECT_DYE = /* glsl */`${HEAD}${JETS}
uniform sampler2D tVel, tDye;
uniform float uDt, uTime, uDiss, uCool, uPick;
out vec4 o;
void main() {
  ivec3 c = cellOf(gl_FragCoord.xy);
  vec3 pc = vec3(c) + 0.5, P = BMIN + pc * CELL;
  vec3 v = F(tVel, c).xyz;
  vec4 d = S(tDye, pc - v * uDt / CELL);
  float dust = d.r * max(1.0 - uDiss * uDt, 0.0);
  float heat = d.g * max(1.0 - uCool * uDt, 0.0);
  float age = d.b + uDt;
  float add = 0.0;
  // The hot jets heat their columns.
  for (int i = 0; i < 3; i++) {
    float k = inJet(i, P);
    heat += k * uJetK[i].y * uDt;
    // The jet blows its own core clear.
    dust *= 1.0 - k * 0.5;
    // Steam flashes off the damp pad where the jet lands.
    float land = smoothstep(1.6, 0.0, P.y) * smoothstep(uJetP[i].w * 2.5, 0.0, length((P - uJetP[i].xyz - uJetA[i].xyz * uJetA[i].w).xz));
    float h = land * uJetK[i].z * uDt;
    dust += h; add += h;
  }
  // The wall jet tears dust and spray off the pad where it runs fast.
  if (c.y <= 1) {
    float sp = length(v.xz);
    float n = vn3(P * vec3(1.3, 0.0, 1.3) + vec3(uTime * 0.9, 0.0, -uTime * 0.6));
    float a = uPick * max(sp - 1.5, 0.0) * (0.35 + 1.3 * n) * (c.y == 0 ? 1.0 : 0.45) * uDt;
    dust += a; add += a;
  }
  age = mix(age, 0.0, clamp(add / max(dust, 1e-3), 0.0, 1.0));
  // Gas fades out before it meets the far walls and the roof.
  vec3 e = min(pc, NF - pc);
  float fade = smoothstep(0.0, 6.0, min(e.x, e.z)) * smoothstep(0.0, 4.0, e.y + (c.y < 4 ? 9.0 : 0.0));
  o = vec4(dust * fade, clamp(heat, 0.0, 8.0) * fade, dust < 0.003 ? 0.0 : age, 0.0);
}`;

/* ---------- the volume: a half-size ray march ---------- */
const VOLUME = /* glsl */`${HEAD}
uniform sampler2D tDye, tVel, tDepth;
uniform vec2 uRes;
uniform mat4 uInvProj, uCamWorld;
uniform vec3 uCam, uFwd, uBoxMax, uLightP, uLightC, uAmb, uAlbedo, uJetA0, uJetA1, uJetC;
uniform float uNear, uFar, uTime, uFrame, uSigma, uAbs, uG, uHeatGlow;
uniform int uSteps;
layout(location = 0) out vec4 oCol;
layout(location = 1) out vec4 oHeat;
float hg(float c, float g) { float g2 = g * g; return (1.0 - g2) / pow(1.0 + g2 - 2.0 * g * c, 1.5) * 0.0796; }
void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  vec4 v = uInvProj * vec4(uv * 2.0 - 1.0, 1.0, 1.0);
  vec3 dir = normalize((uCamWorld * vec4(v.xyz / v.w, 0.0)).xyz);
  // The ray meets the box, and stops at the craft.
  vec3 inv = 1.0 / dir, a = (BMIN - uCam) * inv, b = (uBoxMax - uCam) * inv;
  vec3 lo = min(a, b), hi = max(a, b);
  float t0 = max(max(lo.x, lo.y), max(lo.z, 0.0)), t1 = min(hi.x, min(hi.y, hi.z));
  float zn = texture(tDepth, uv).x * 2.0 - 1.0;
  float ze = 2.0 * uNear * uFar / (uFar + uNear - zn * (uFar - uNear));
  t1 = min(t1, ze / max(dot(dir, uFwd), 1e-3));
  oCol = vec4(0.0); oHeat = vec4(0.0);
  if (t1 <= t0) return;
  float ds = (t1 - t0) / float(uSteps);
  // Interleaved gradient noise, turned each frame, hides the step bands.
  float j = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))) + uFrame * 0.618034);
  float tr = 1.0, hSum = 0.0, hNoise = 0.0;
  vec3 col = vec3(0.0);
  for (int i = 0; i < 96; i++) {
    if (i >= uSteps || tr < 0.01) break;
    vec3 p = uCam + dir * (t0 + (float(i) + j) * ds);
    vec3 c = (p - BMIN) / CELL;
    vec4 s = S(tDye, c);
    // Velocity warps the lookup, so the gas streaks with its flow.
    vec3 vw = S(tVel, c).xyz;
    s = S(tDye, c - vw * 0.05 / CELL);
    // Heat bends light: the march sums it, with moving cells for the shimmer.
    // Fine fast cells; the hot core saturates, so the plume stays readable.
    float hot = min(s.g, 2.5);
    hSum += s.g * ds;
    hNoise += hot * (vn3(p * vec3(5.0, 3.0, 5.0) + vec3(0.0, -uTime * 4.5, 0.0)) - 0.5) * ds;
    // Billows: coarse lumps, then fine wisps that age away.
    vec3 q = p - vw * 0.08 + vec3(0.0, -s.b * 0.6 - uTime * 0.25, 0.0);
    // Cloud erosion: the grid gives the body, three octaves cut its edges.
    float fb = vn3(q * 1.1) * 0.55 + vn3(q * 2.5 + 7.3) * 0.3 + vn3(q * 5.7 + vec3(uTime * 0.4, 0.0, 0.0)) * 0.15;
    float body = min(s.r, 3.0);
    float den = body * smoothstep(0.42, 0.62, fb + min(body, 1.0) * 0.12) * 2.6;
    if (den < 0.003) continue;
    // Light from the hot pools, through two short shadow taps.
    vec3 L = uLightP - p;
    float dl = length(L);
    L /= dl;
    float sh = S(tDye, c + L * (0.5 / CELL)).r * 0.5 + S(tDye, c + L * (1.2 / CELL)).r * 0.7 + S(tDye, c + L * (2.4 / CELL)).r * 1.2;
    float tau = sh * uAbs;
    float lt = exp(-tau) + 0.35 * exp(-tau * 0.25);
    float powder = 1.0 - exp(-den * 4.0);
    // Cool sky light from above, dimmed by the gas over this point.
    float up = exp(-S(tDye, c + vec3(0.0, 1.5 / CELL, 0.0)).r * uAbs * 0.8);
    vec3 Li = uAmb * (0.35 + 1.3 * up) + uLightC * lt * (0.4 + 0.6 * powder) * hg(dot(dir, L), uG) * 12.566 * (0.35 + 0.65 * smoothstep(0.2, 2.0, dl)) / (1.0 + dl * dl * 0.2);
    // The plumes are a line light: the gas round them takes their glow.
    vec3 ab = uJetA1 - uJetA0;
    vec3 cp = uJetA0 + ab * clamp(dot(p - uJetA0, ab) / max(dot(ab, ab), 1e-3), 0.0, 1.0);
    vec3 J = cp - p;
    float dj = length(J);
    Li += uJetC * hg(dot(dir, J / max(dj, 1e-3)), 0.2) * 12.566 / (1.0 + dj * dj * 1.2);
    // Hot gas glows a little by itself near the jets.
    vec3 Le = vec3(1.0, 0.38, 0.12) * s.g * s.g * uHeatGlow;
    float al = 1.0 - exp(-den * uSigma * ds);
    col += tr * al * (Li * uAlbedo + Le);
    tr *= 1.0 - al;
  }
  oCol = vec4(col, 1.0 - tr);
  oHeat = vec4(hSum, hNoise, 0.0, 1.0);
}`;

// A three-tap blur along one axis, on both targets.
const BLUR = /* glsl */`
precision highp float;
uniform sampler2D tA, tB;
uniform vec2 uStep;
layout(location = 0) out vec4 oA;
layout(location = 1) out vec4 oB;
void main() {
  vec2 uv = gl_FragCoord.xy / vec2(textureSize(tA, 0));
  vec2 s = uStep / vec2(textureSize(tA, 0));
  oA = texture(tA, uv) * 0.5 + (texture(tA, uv + s) + texture(tA, uv - s)) * 0.25;
  oB = texture(tB, uv) * 0.5 + (texture(tB, uv + s) + texture(tB, uv - s)) * 0.25;
}`;

export function makeFluid(renderer) {
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
    uJetP: { value: [0, 1, 2].map(() => new THREE.Vector4()) },
    uJetA: { value: [0, 1, 2].map(() => new THREE.Vector4(0, -1, 0, 0)) },
    uJetK: { value: [0, 1, 2].map(() => new THREE.Vector4()) },
  };
  const U = {
    uDt: { value: 1 / 60 }, uTime: { value: 0 },
    uBuoy: { value: 3.0 }, uWeight: { value: -2.6 }, uTurb: { value: 70 }, uVort: { value: 30 }, uDamp: { value: 0.6 },
    uDiss: { value: 0.16 }, uCool: { value: 0.35 }, uPick: { value: 0.2 },
  };
  const mCurl = raw(CURL, { tVel: { value: null } });
  const mAdvV = raw(ADVECT_VEL, { ...jetU, tVel: { value: null }, tDye: { value: null }, tCurl: { value: curl.texture }, uDt: U.uDt, uTime: U.uTime, uBuoy: U.uBuoy, uWeight: U.uWeight, uTurb: U.uTurb, uVort: U.uVort, uDamp: U.uDamp });
  const mDiv = raw(DIVERGE, { tVel: { value: null } });
  const mJac = raw(JACOBI_FS, { tP: { value: null }, tDiv: { value: div.texture } });
  const mProj = raw(PROJECT, { tP: { value: null }, tVel: { value: null } });
  const mAdvD = raw(ADVECT_DYE, { ...jetU, tVel: { value: null }, tDye: { value: null }, uDt: U.uDt, uTime: U.uTime, uDiss: U.uDiss, uCool: U.uCool, uPick: U.uPick });

  // One fixed step of the whole fluid.
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
  }

  /* ---------- the volume and its blur ---------- */
  const mrt = () => {
    const t = new THREE.WebGLRenderTarget(1, 1, { count: 2, type: THREE.HalfFloatType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false });
    t.textures.forEach(x => { x.generateMipmaps = false; });
    return t;
  };
  const volRT = mrt(), blurRT = mrt();
  const VU = {
    tDye: { value: null }, tVel: { value: null }, tDepth: { value: null }, uRes: { value: new THREE.Vector2(1, 1) },
    uInvProj: { value: new THREE.Matrix4() }, uCamWorld: { value: new THREE.Matrix4() },
    uCam: { value: new THREE.Vector3() }, uFwd: { value: new THREE.Vector3() }, uBoxMax: { value: BOX_MAX.clone() },
    uLightP: { value: new THREE.Vector3() }, uLightC: { value: new THREE.Color() },
    uJetA0: { value: new THREE.Vector3() }, uJetA1: { value: new THREE.Vector3() }, uJetC: { value: new THREE.Color() },
    uAmb: { value: new THREE.Color(0.032, 0.046, 0.09) }, uAlbedo: { value: new THREE.Color(0.9, 0.86, 0.8) },
    uNear: { value: 0.5 }, uFar: { value: 2000 }, uTime: { value: 0 }, uFrame: { value: 0 },
    uSigma: { value: 2.4 }, uAbs: { value: 2.2 }, uG: { value: 0.35 }, uHeatGlow: { value: 0.01 }, uSteps: { value: 64 },
  };
  const mVol = raw(VOLUME, VU);
  const mBlur = new THREE.RawShaderMaterial({ glslVersion: THREE.GLSL3, vertexShader: VS, fragmentShader: BLUR, uniforms: { tA: { value: null }, tB: { value: null }, uStep: { value: new THREE.Vector2() } }, depthTest: false, depthWrite: false });

  function draw(camera, depthTex, frame) {
    VU.tDye.value = dye[0].texture;
    VU.tVel.value = vel[0].texture;
    VU.tDepth.value = depthTex;
    VU.uInvProj.value.copy(camera.projectionMatrixInverse);
    VU.uCamWorld.value.copy(camera.matrixWorld);
    VU.uCam.value.setFromMatrixPosition(camera.matrixWorld);
    camera.getWorldDirection(VU.uFwd.value);
    VU.uNear.value = camera.near; VU.uFar.value = camera.far;
    VU.uTime.value = U.uTime.value;
    VU.uFrame.value = frame % 64;
    run(mVol, volRT);
    // Blur across, then down: the dither melts into soft billows.
    mBlur.uniforms.tA.value = volRT.textures[0]; mBlur.uniforms.tB.value = volRT.textures[1];
    mBlur.uniforms.uStep.value.set(1, 0);
    run(mBlur, blurRT);
    mBlur.uniforms.tA.value = blurRT.textures[0]; mBlur.uniforms.tB.value = blurRT.textures[1];
    mBlur.uniforms.uStep.value.set(0, 1);
    run(mBlur, volRT);
  }

  function resize(w, h) {
    volRT.setSize(w, h); blurRT.setSize(w, h);
    VU.uRes.value.set(w, h);
  }

  // Empties the grid: no gas, no motion.
  function clear() {
    const c = renderer.getClearColor(new THREE.Color()), a = renderer.getClearAlpha();
    renderer.setClearColor(0x000000, 0);
    for (const t of [...vel, ...dye, ...pr, div, curl]) { renderer.setRenderTarget(t); renderer.clear(); }
    renderer.setClearColor(c, a);
  }
  clear();

  return {
    jetU, U, VU, step, draw, resize, clear,
    get col() { return volRT.textures[0]; },
    get heat() { return volRT.textures[1]; },
    // Debug: per-channel max and mean of a grid, and per-slice dust.
    stats(which = 'dye', ch = 0) {
      const rt = which === 'vel' ? vel[0] : dye[0];
      const buf = new Uint16Array(AW * AH * 4);
      renderer.readRenderTargetPixels(rt, 0, 0, AW, AH, buf);
      const h = THREE.DataUtils.fromHalfFloat;
      const mx = [0, 0, 0, 0], sum = [0, 0, 0, 0], ys = new Array(NY).fill(0);
      for (let i = 0; i < AW * AH; i++) for (let k = 0; k < 4; k++) {
        const v = h(buf[i * 4 + k]); mx[k] = Math.max(mx[k], Math.abs(v)); sum[k] += Math.abs(v);
        if (k === ch) { const px = i % AW, py = (i / AW) | 0; ys[((py / NZ) | 0) * TC + ((px / NX) | 0)] += Math.abs(v); }
      }
      return { max: mx.map(v => +v.toFixed(3)), mean: sum.map(v => +(v / (AW * AH)).toFixed(4)), slices: ys.map(v => +v.toFixed(1)) };
    },
    // The materials, for an early compile.
    mats: [mCurl, mAdvV, mDiv, mJac, mProj, mAdvD, mVol, mBlur],
  };
}
/* ---------- end K3 ---------- */
