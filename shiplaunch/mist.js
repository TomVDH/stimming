// Ship launch mist: spray mist and chain dust as a 3D fluid on the GPU, drawn as a lit volume.
// Smoke follows Fire: the K3 fluid and Fire's smoke shading, as Volcano's plume.js ports them.
import * as THREE from 'three';

/* ---------- K3: volume fluid (WebGL2 port, from volcano/plume.js) ---------- */
// The method follows shared/fire.js: advect, buoyancy, turbulence,
// vorticity confinement, a Jacobi pressure solve, dye transport.
// The grid packs its y slices as tiles in one 2D texture.

// Grid size in cells, and tiles per atlas row.
const NX = 80, NY = 22, NZ = 60, TC = 8;
const AW = NX * TC, AH = NZ * Math.ceil(NY / TC);
export const CELL = 1.5;
// The box: 120 m along the canal, 33 m tall, from behind the berth to the near quay.
export const BOX_MIN = new THREE.Vector3(-60, -1, -58);
export const BOX_MAX = new THREE.Vector3(BOX_MIN.x + NX * CELL, BOX_MIN.y + NY * CELL, BOX_MIN.z + NZ * CELL);
const JACOBI = 14;

const f = n => n.toFixed(1);
export const HEAD = /* glsl */`
const int NX = ${NX}, NY = ${NY}, NZ = ${NZ}, TC = ${TC};
const vec3 NF = vec3(${f(NX)}, ${f(NY)}, ${f(NZ)});
const vec2 ATLAS = vec2(${f(AW)}, ${f(AH)});
const float CELL = ${CELL.toFixed(2)};
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

// The emitters: segments with a radius, a velocity, and mist and dust rates.
const JETS = /* glsl */`
uniform vec4 uJetP[4];
uniform vec4 uJetA[4];
uniform vec4 uJetK[4];
uniform vec4 uJetD[4];
// How much a point lies in emitter i's capsule: 1 on the segment, 0 outside.
float inJet(int i, vec3 P) {
  vec3 a = uJetP[i].xyz, ab = uJetA[i].xyz - a;
  float t = clamp(dot(P - a, ab) / max(dot(ab, ab), 1e-4), 0.0, 1.0);
  float r = length(P - a - ab * t);
  return uJetP[i].w > 0.0 ? smoothstep(uJetP[i].w, uJetP[i].w * 0.3, r) : 0.0;
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
  float stuff = clamp(dye.g + dye.r, 0.0, 1.0);
  // Mist sinks a little; dust lifts a little in the warm low sun.
  v.y += (dye.g * uBuoy - dye.r * uWeight) * uDt;
  // Turbulence: a drifting noise field; the projection makes it swirl.
  vec3 q = P * 0.09 + vec3(0.0, -uTime * 0.3, uTime * 0.11);
  vec3 n = vec3(vn3(q), vn3(q + 17.1), vn3(q + 41.7)) - 0.5;
  v += n * uTurb * stuff * uDt;
  // Vorticity confinement spins small curls back up into rolls.
  vec4 wC = F(tCurl, c);
  vec3 eta = vec3(F(tCurl, c + ivec3(1, 0, 0)).w - F(tCurl, c - ivec3(1, 0, 0)).w,
                  F(tCurl, c + ivec3(0, 1, 0)).w - F(tCurl, c - ivec3(0, 1, 0)).w,
                  F(tCurl, c + ivec3(0, 0, 1)).w - F(tCurl, c - ivec3(0, 0, 1)).w);
  v += cross(eta / (length(eta) + 1e-5), wC.xyz) * uVort * CELL * stuff * uDt;
  v *= max(1.0 - uDamp * uDt, 0.0);
  // A light breeze along the canal carries it off.
  v.xz = mix(v.xz, uWind, 1.0 - exp(-uDt * 0.25));
  // Each emitter drives its capsule toward its own velocity.
  for (int i = 0; i < 4; i++) {
    float k = inJet(i, P);
    v = mix(v, uJetK[i].xyz, k * uJetK[i].w);
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

// Dye: r mist, g dust, b age.
const ADVECT_DYE = /* glsl */`${PREC}${HEAD}${JETS}
uniform sampler2D tVel, tDye;
uniform float uDt, uDiss, uCool;
out vec4 o;
void main() {
  ivec3 c = cellOf(gl_FragCoord.xy);
  vec3 pc = vec3(c) + 0.5, P = BMIN + pc * CELL;
  vec3 v = F(tVel, c).xyz;
  vec4 d = S(tDye, pc - v * uDt / CELL);
  // Mist settles out on the water; dust thins as it spreads.
  float mist = d.r * max(1.0 - uDiss * uDt, 0.0);
  float dust = d.g * max(1.0 - uCool * uDt, 0.0);
  float age = d.b + uDt, add = 0.0;
  for (int i = 0; i < 4; i++) {
    float k = inJet(i, P);
    float a = k * uJetD[i].x * uDt, b = k * uJetD[i].y * uDt;
    mist += a; dust += b; add += a + b;
  }
  age = mix(age, 0.0, clamp(add / max(mist + dust, 1e-3), 0.0, 1.0));
  // Gas fades out before it meets the walls and the roof.
  vec3 e = min(pc, NF - pc);
  float fade = smoothstep(0.0, 3.0, min(e.x, e.z)) * smoothstep(0.0, 3.0, e.y + (c.y < 3 ? 9.0 : 0.0));
  o = vec4(clamp(mist, 0.0, 4.0) * fade, clamp(dust, 0.0, 4.0) * fade, mist + dust < 0.003 ? 0.0 : age, 0.0);
}`;
/* ---------- end K3 ---------- */

/* ---------- the march ---------- */
const MARCH = /* glsl */`
uniform sampler2D tDye, tVel, tDepth;
uniform mat4 uInvVP;
uniform vec3 uCam, uFwd, uSun, uSunCol, uSky, uFog;
uniform float uFogD, uNear, uFar, uT;
in vec2 vUv;
out vec4 o;
/* ---------- K3 lighting: Fire's smoke shading (shared/fire.js, volume()) ---------- */
// A short self-shadow march toward the key, Beer plus a multiple-scatter lobe,
// the powder term, an ambient floor, and a Henyey-Greenstein phase times 4 pi.
const float ABSORB = 2.0, AMBIENT = 0.5, POWDER = 0.59, MULTI = 1.0;
float hg(float c, float g) { float g2 = g * g; return (1.0 - g2) / pow(max(1.0 + g2 - 2.0 * g * c, 1e-4), 1.5) * 0.079577; }
float dens(vec3 p) { vec4 s = S(tDye, (p - BMIN) / CELL); return s.r * 0.55 + s.g * 0.8; }
float lightT(vec3 p, vec3 L) {
  // Three taps toward the sun; the far tap stands for the rest of the way.
  float sum = dens(p + L * 1.5) * 1.5 + dens(p + L * 4.0) * 2.5 + dens(p + L * 9.0) * 5.0;
  float tau = sum * ABSORB * 0.5;
  float beer = exp(-tau);
  float ms = exp(-tau * 0.25) * 0.5;
  float base = mix(beer, beer + ms, MULTI);
  float powder = 1.0 - exp(-tau * 2.0);
  float fin = mix(base, base * powder, POWDER);
  return clamp(fin + AMBIENT * 0.35, 0.0, 1.0);
}
/* ---------- end K3 lighting ---------- */
void main() {
  vec4 w = uInvVP * vec4(vUv * 2.0 - 1.0, 1.0, 1.0);
  vec3 ro = uCam, rd = normalize(w.xyz / w.w - ro);
  // The scene's distance along the ray, from its depth.
  float d = texture(tDepth, vUv).r;
  float zv = 2.0 * uNear * uFar / ((uFar + uNear) - (d * 2.0 - 1.0) * (uFar - uNear));
  float tEnd = zv / max(dot(rd, uFwd), 1e-3);
  vec3 inv = 1.0 / rd, a = (BMIN - ro) * inv, b = (BMAX - ro) * inv;
  vec3 lo = min(a, b), hi = max(a, b);
  float t0 = max(max(lo.x, lo.y), max(lo.z, 0.0)), t1 = min(min(hi.x, min(hi.y, hi.z)), tEnd);
  if (t1 <= t0) { o = vec4(0.0); return; }
  const int N = 48;
  float ds = (t1 - t0) / float(N);
  float j = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));
  float tr = 1.0;
  vec3 col = vec3(0.0);
  float cs = dot(rd, uSun);
  for (int i = 0; i < N; i++) {
    if (tr < 0.01) break;
    float t = t0 + (float(i) + j) * ds;
    vec3 p = ro + rd * t;
    vec3 c = (p - BMIN) / CELL;
    vec3 vw = S(tVel, c).xyz;
    vec4 s = S(tDye, c - vw * 0.4 / CELL);
    float m = s.r, du = s.g;
    if (m + du < 0.003) continue;
    // Fire's erosion: three octaves cut the grid's soft edges into curls.
    vec3 q = (p - vw * 0.6) * 0.28 + vec3(0.0, -s.b * 0.08 - uT * 0.05, 0.0);
    float fb = vn3(q) * 0.55 + vn3(q * 2.3 + 7.3) * 0.3 + vn3(q * 5.1 + 3.1) * 0.15;
    float er = smoothstep(0.36, 0.62, fb + min(m + du, 1.0) * 0.18);
    float sig = (m * 0.55 + du * 0.8) * er;
    // Mist scatters forward hard; dust is browner and duller.
    float share = du / (m + du);
    float ph = mix(hg(cs, 0.62) * 0.8 + hg(cs, -0.2) * 0.2, hg(cs, 0.35), share) * 12.566;
    vec3 alb = mix(vec3(0.92, 0.94, 0.97), vec3(0.62, 0.43, 0.28), share);
    vec3 Li = uSky * (0.35 + 0.4 * smoothstep(0.0, 20.0, p.y)) + uSunCol * lightT(p, uSun) * ph * 0.55;
    float al = 1.0 - exp(-sig * ds);
    col += tr * al * Li * alb;
    tr *= 1.0 - al;
  }
  float a2 = 1.0 - tr;
  // The air between the eye and the mist.
  float fh = 1.0 - exp(-uFogD * uFogD * t0 * t0);
  col = mix(col, uFog * a2, fh);
  o = vec4(col, a2);
}`;

export const COMPOSITE = {
  uniforms: { tDiffuse: { value: null }, tMist: { value: null } },
  vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse, tMist;
    varying vec2 vUv;
    void main() {
      vec4 c = texture2D(tDiffuse, vUv), m = texture2D(tMist, vUv);
      gl_FragColor = vec4(c.rgb * (1.0 - m.a) + m.rgb, c.a);
    }`,
};

export function makeMist(renderer) {
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
    uJetP: { value: [0, 1, 2, 3].map(() => new THREE.Vector4()) },
    uJetA: { value: [0, 1, 2, 3].map(() => new THREE.Vector4()) },
    uJetK: { value: [0, 1, 2, 3].map(() => new THREE.Vector4()) },
    uJetD: { value: [0, 1, 2, 3].map(() => new THREE.Vector4()) },
  };
  const U = {
    uDt: { value: 1 / 30 }, uTime: { value: 0 },
    uBuoy: { value: 0.6 }, uWeight: { value: 0.9 }, uTurb: { value: 9 }, uVort: { value: 1.2 }, uDamp: { value: 0.25 },
    uDiss: { value: 0.14 }, uCool: { value: 0.05 }, uWind: { value: new THREE.Vector2(1.2, 0.2) },
  };
  const mCurl = raw(CURL, { tVel: { value: null } });
  const mAdvV = raw(ADVECT_VEL, { ...jetU, tVel: { value: null }, tDye: { value: null }, tCurl: { value: curl.texture }, uDt: U.uDt, uTime: U.uTime, uBuoy: U.uBuoy, uWeight: U.uWeight, uTurb: U.uTurb, uVort: U.uVort, uDamp: U.uDamp, uWind: U.uWind });
  const mDiv = raw(DIVERGE, { tVel: { value: null } });
  const mJac = raw(JACOBI_FS, { tP: { value: null }, tDiv: { value: div.texture } });
  const mProj = raw(PROJECT, { tP: { value: null }, tVel: { value: null } });
  const mAdvD = raw(ADVECT_DYE, { ...jetU, tVel: { value: null }, tDye: { value: null }, uDt: U.uDt, uDiss: U.uDiss, uCool: U.uCool });

  /* ---------- the draw ---------- */
  // The scene's depth at half size, for the march to stop at.
  const depthRT = new THREE.WebGLRenderTarget(2, 2, { depthTexture: new THREE.DepthTexture(2, 2), depthBuffer: true });
  const depthMat = new THREE.MeshBasicMaterial({ colorWrite: false });
  const rt = new THREE.WebGLRenderTarget(2, 2, { type: THREE.HalfFloatType, depthBuffer: false });
  const MU = {
    tDye: { value: dye[0].texture }, tVel: { value: vel[0].texture }, tDepth: { value: depthRT.depthTexture },
    uInvVP: { value: new THREE.Matrix4() }, uCam: { value: new THREE.Vector3() }, uFwd: { value: new THREE.Vector3() },
    uSun: { value: new THREE.Vector3(0, 1, 0) }, uSunCol: { value: new THREE.Color() }, uSky: { value: new THREE.Color() },
    uFog: { value: new THREE.Color() }, uFogD: { value: 0 }, uNear: { value: 0.5 }, uFar: { value: 4000 }, uT: U.uTime,
  };

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
  function clearGrid() {
    const c = renderer.getClearColor(new THREE.Color()), a = renderer.getClearAlpha();
    renderer.setClearColor(0x000000, 0);
    for (const t of [...vel, ...dye, ...pr, div, curl]) { renderer.setRenderTarget(t); renderer.clear(); }
    renderer.setRenderTarget(null);
    renderer.setClearColor(c, a);
  }
  /** Sets emitter i: a segment a to b of radius r, a velocity and its pull, mist and dust rates. */
  function jet(i, a, b, r, v, pull, mist, dust) {
    jetU.uJetP.value[i].set(a[0], a[1], a[2], r);
    jetU.uJetA.value[i].set(b[0], b[1], b[2], 0);
    jetU.uJetK.value[i].set(v[0], v[1], v[2], pull);
    jetU.uJetD.value[i].set(mist, dust, 0, 0);
  }
  const off = i => jetU.uJetP.value[i].set(0, 0, 0, 0);

  const marchMat = new THREE.RawShaderMaterial({
    glslVersion: THREE.GLSL3, uniforms: MU, depthTest: false, depthWrite: false,
    vertexShader: 'in vec3 position; out vec2 vUv; void main() { vUv = position.xy * 0.5 + 0.5; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: PREC + HEAD + MARCH,
  });
  function setSize(w, h) {
    const hw = Math.max(1, w >> 1), hh = Math.max(1, h >> 1);
    depthRT.setSize(hw, hh);
    rt.setSize(hw, hh);
  }
  /** Marches the mist into its half-size target; hide lists what the depth pass leaves out. */
  function draw(scene, camera, hide) {
    for (const o of hide) o.visible = false;
    scene.overrideMaterial = depthMat;
    const sm = renderer.shadowMap.autoUpdate;
    renderer.shadowMap.autoUpdate = false;
    renderer.setRenderTarget(depthRT);
    renderer.clear();
    renderer.render(scene, camera);
    renderer.shadowMap.autoUpdate = sm;
    scene.overrideMaterial = null;
    for (const o of hide) o.visible = true;
    MU.uInvVP.value.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse).invert();
    MU.uCam.value.copy(camera.position);
    camera.getWorldDirection(MU.uFwd.value);
    MU.uNear.value = camera.near; MU.uFar.value = camera.far;
    run(marchMat, rt);
    renderer.setRenderTarget(null);
  }
  function blank() {
    const c = renderer.getClearColor(new THREE.Color()), a = renderer.getClearAlpha();
    renderer.setRenderTarget(rt);
    renderer.setClearColor(0x000000, 0);
    renderer.clear();
    renderer.setRenderTarget(null);
    renderer.setClearColor(c, a);
  }
  clearGrid();
  blank();
  return { U, MU, step, clear: () => { clearGrid(); blank(); }, jet, off, draw, setSize, blank, texture: rt.texture, marchMat };
}
