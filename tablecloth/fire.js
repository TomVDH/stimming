// Tablecloth yank: fire and smoke over burning cloth.
/* ---------- K3: volume fluid (three.js 0.170 WebGL2 port of shared/fire.js) ---------- */
// The method follows Fire: advect, buoyancy, turbulence, vorticity confinement,
// a Jacobi pressure solve, dye transport. The dye holds r smoke and g heat.
// The grid packs its y slices as tiles in one 2D atlas, after cloudbottle/fluid.js.
// The table top is a solid slab; the top of the box is open.
// Burning cloth particles are the emitters: points drawn into the dye.
import * as THREE from 'three';
import { FullScreenQuad, Pass } from 'three/addons/postprocessing/Pass.js';
import { TOP, TABLE } from './shapes.js';

// Grid size in cells, and tiles per atlas row.
const NX = 96, NY = 48, NZ = 60, TC = 8;
const AW = NX * TC, AH = NZ * Math.ceil(NY / TC);
// Cells are 3.3 cm cubes; the box holds the table, its pull end and the floor before it.
const CELL = 1 / 30;
const BMIN = [-1.0, 0.0, -1.0];
export const BOX = { min: BMIN, max: [BMIN[0] + NX * CELL, BMIN[1] + NY * CELL, BMIN[2] + NZ * CELL] };
// An even count leaves the pressure in slot 0.
const JACOBI = 12;

const f = n => n.toFixed(5);
const ATLAS = `
const int NX = ${NX}, NY = ${NY}, NZ = ${NZ}, TC = ${TC};
const vec3 NF = vec3(${f(NX)}, ${f(NY)}, ${f(NZ)});
const vec2 ATLAS = vec2(${f(AW)}, ${f(AH)});
const float CELL = ${f(CELL)};
const vec3 BMIN = vec3(${BMIN.map(f).join(', ')});
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

const HEAD = `
precision highp float;
precision highp sampler2D;
${ATLAS}
const vec3 SLAB0 = vec3(${f(-TABLE.hx)}, ${f(TOP - TABLE.th)}, ${f(-TABLE.hz)});
const vec3 SLAB1 = vec3(${f(TABLE.hx)}, ${f(TOP)}, ${f(TABLE.hz)});
// True in open air inside the box; false in the table top and past the walls.
bool wet(ivec3 c) {
  if (any(lessThan(c, ivec3(0))) || c.x >= NX || c.y >= NY || c.z >= NZ) return false;
  vec3 p = BMIN + (vec3(c) + 0.5) * CELL;
  return !(all(greaterThan(p, SLAB0)) && all(lessThan(p, SLAB1)));
}
// The top of the box lets smoke out.
bool open(ivec3 c) { return c.y >= NY; }
`;
const VS = 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';

const CURL = `${HEAD}
uniform sampler2D tVel;
void main() {
  ivec3 c = cellOf(gl_FragCoord.xy);
  vec3 vR = F(tVel, c + ivec3(1, 0, 0)).xyz, vL = F(tVel, c - ivec3(1, 0, 0)).xyz;
  vec3 vU = F(tVel, c + ivec3(0, 1, 0)).xyz, vD = F(tVel, c - ivec3(0, 1, 0)).xyz;
  vec3 vF = F(tVel, c + ivec3(0, 0, 1)).xyz, vB = F(tVel, c - ivec3(0, 0, 1)).xyz;
  vec3 w = vec3(vU.z - vD.z - (vF.y - vB.y), vF.x - vB.x - (vR.z - vL.z), vR.y - vL.y - (vU.x - vD.x)) / (2.0 * CELL);
  gl_FragColor = vec4(w, length(w));
}`;

// Velocity in metres per second.
const ADVECT_VEL = `${HEAD}
uniform sampler2D tVel, tDye, tCurl;
uniform float uDt, uTime, uBuoy, uWeight, uTurb, uTurbF, uVort, uDamp;
void main() {
  ivec3 c = cellOf(gl_FragCoord.xy);
  if (!wet(c)) { gl_FragColor = vec4(0.0); return; }
  vec3 pc = vec3(c) + 0.5, P = BMIN + pc * CELL;
  vec3 v = S(tVel, pc - F(tVel, c).xyz * uDt / CELL).xyz;
  vec4 dye = F(tDye, c);
  float smoke = clamp(dye.r, 0.0, 4.0), heat = clamp(dye.g, 0.0, 12.0);
  // Hot gas rises; smoke weighs it down a little.
  v.y += (heat * uBuoy - smoke * uWeight) * uDt;
  // Thermal turbulence follows the heat; ambient turbulence stirs the cooled smoke.
  vec3 q = P * uTurbF + vec3(0.0, -uTime * 2.2, uTime * 0.4);
  vec3 n = vec3(vn3(q), vn3(q + 17.1), vn3(q + 41.7)) - 0.5;
  vec3 qa = P * uTurbF * 0.4 + vec3(0.0, uTime * 0.25, uTime * 0.06);
  vec3 na = vec3(vn3(qa), vn3(qa + 9.3), vn3(qa + 27.1)) - 0.5;
  v += (n * uTurb * min(heat, 2.0) + na * uTurb * 0.25 * min(smoke, 1.5)) * uDt;
  // Vorticity confinement spins small curls back up into tongues.
  vec4 wC = F(tCurl, c);
  vec3 eta = vec3(F(tCurl, c + ivec3(1, 0, 0)).w - F(tCurl, c - ivec3(1, 0, 0)).w,
                  F(tCurl, c + ivec3(0, 1, 0)).w - F(tCurl, c - ivec3(0, 1, 0)).w,
                  F(tCurl, c + ivec3(0, 0, 1)).w - F(tCurl, c - ivec3(0, 0, 1)).w);
  float where = clamp(heat + smoke * 0.5, 0.0, 1.0);
  v += cross(eta / (length(eta) + 1e-5), wC.xyz) * uVort * CELL * where * uDt;
  v *= max(1.0 - uDamp * uDt, 0.0);
  // Velocity fades near the side walls.
  vec3 e = min(pc, NF - pc);
  v *= smoothstep(0.0, 3.0, min(e.x, e.z));
  gl_FragColor = vec4(v, 0.0);
}`;

// A solid face passes nothing; the open top passes all.
const DIVERGE = `${HEAD}
uniform sampler2D tVel;
// One return each: the D3D compiler warns on early returns here.
float side(ivec3 n, int k, float vc) {
  vec3 v = F(tVel, n).xyz;
  float w = k == 0 ? v.x : k == 1 ? v.y : v.z;
  return wet(n) ? w : open(n) ? vc : -vc;
}
void main() {
  ivec3 c = cellOf(gl_FragCoord.xy);
  if (!wet(c)) { gl_FragColor = vec4(0.0); return; }
  vec3 v = F(tVel, c).xyz;
  float d = side(c + ivec3(1, 0, 0), 0, v.x) - side(c - ivec3(1, 0, 0), 0, v.x)
          + side(c + ivec3(0, 1, 0), 1, v.y) - side(c - ivec3(0, 1, 0), 1, v.y)
          + side(c + ivec3(0, 0, 1), 2, v.z) - side(c - ivec3(0, 0, 1), 2, v.z);
  gl_FragColor = vec4(0.5 * d * CELL, 0.0, 0.0, 0.0);
}`;

// Pressure: zero at the open top, mirrored at the solids.
const PRESSURE = `
float Pr(sampler2D t, ivec3 c, float pc) {
  float p = F(t, c).x;
  return wet(c) ? p : open(c) ? 0.0 : pc;
}`;
const JACOBI_FS = `${HEAD}${PRESSURE}
uniform sampler2D tP, tDiv;
void main() {
  ivec3 c = cellOf(gl_FragCoord.xy);
  if (!wet(c)) { gl_FragColor = vec4(0.0); return; }
  float pc = F(tP, c).x;
  float s = Pr(tP, c + ivec3(1, 0, 0), pc) + Pr(tP, c - ivec3(1, 0, 0), pc) + Pr(tP, c + ivec3(0, 1, 0), pc)
          + Pr(tP, c - ivec3(0, 1, 0), pc) + Pr(tP, c + ivec3(0, 0, 1), pc) + Pr(tP, c - ivec3(0, 0, 1), pc);
  gl_FragColor = vec4((s - F(tDiv, c).x) / 6.0, 0.0, 0.0, 0.0);
}`;
const PROJECT = `${HEAD}${PRESSURE}
uniform sampler2D tP, tVel;
void main() {
  ivec3 c = cellOf(gl_FragCoord.xy);
  if (!wet(c)) { gl_FragColor = vec4(0.0); return; }
  float pc = F(tP, c).x;
  vec3 g = vec3(Pr(tP, c + ivec3(1, 0, 0), pc) - Pr(tP, c - ivec3(1, 0, 0), pc),
                Pr(tP, c + ivec3(0, 1, 0), pc) - Pr(tP, c - ivec3(0, 1, 0), pc),
                Pr(tP, c + ivec3(0, 0, 1), pc) - Pr(tP, c - ivec3(0, 0, 1), pc));
  gl_FragColor = vec4(F(tVel, c).xyz - 0.5 * g / CELL, 0.0);
}`;

// Smoke dissipates and heat cools as both ride the flow.
const ADVECT_DYE = `${HEAD}
uniform sampler2D tVel, tDye;
uniform float uDt, uDiss, uCool;
void main() {
  ivec3 c = cellOf(gl_FragCoord.xy);
  if (!wet(c)) { gl_FragColor = vec4(0.0); return; }
  vec3 pc = vec3(c) + 0.5;
  vec4 d = S(tDye, pc - F(tVel, c).xyz * uDt / CELL);
  float smoke = d.r * max(1.0 - uDiss * uDt, 0.0);
  float heat = clamp(d.g * max(1.0 - uCool * uDt, 0.0), 0.0, 12.0);
  gl_FragColor = vec4(smoke, heat, 0.0, 0.0);
}`;

// An emitter is a point in one y slice: a soft splat of smoke and heat.
const EMIT_VS = `
${ATLAS}
attribute vec3 aGive;
varying vec2 vGive;
void main() {
  // aGive: x smoke, y heat, z the slice offset 0 or 1.
  vec3 pc = (position - BMIN) / CELL;
  float y = clamp(pc.y - 0.5, 0.0, NF.y - 1.0), y0 = floor(y), sl = min(y0 + aGive.z, NF.y - 1.0);
  float w = aGive.z > 0.5 ? y - y0 : 1.0 - (y - y0);
  vec2 px = vec2(mod(sl, float(TC)) * NF.x, floor(sl / float(TC)) * NF.z) + clamp(pc.xz, vec2(1.0), NF.xz - 1.0);
  gl_Position = vec4(px / ATLAS * 2.0 - 1.0, 0.0, 1.0);
  gl_PointSize = 3.0;
  vGive = aGive.xy * w;
}`;
const EMIT_FS = `
varying vec2 vGive;
void main() {
  vec2 q = gl_PointCoord - 0.5;
  float k = exp(-dot(q, q) * 6.0);
  gl_FragColor = vec4(vGive * k, 0.0, 0.0);
}`;

/* ---------- K3 lighting: Fire's volume shading (shared/fire.js, volume()) ---------- */
// Fire is emission tinted by heat through the flame ramp, times the heat, times the smoke.
// Smoke takes the key light through a short self-shadow march toward the lamp:
// Beer plus a multiple-scatter lobe, the powder term, an ambient floor, and a
// Henyey-Greenstein phase times 4 pi. The wood ramp is Fire's, from its CHEMS table.
const MARCH = `
precision highp float;
precision highp sampler2D;
${ATLAS}
#include <packing>
uniform sampler2D tDye, tVel, tDepth;
uniform mat4 uInvProj, uCamWorld;
uniform vec3 uCam, uLamp, uB0, uB1;
uniform float uNear, uFar, uTime, uFrame, uIntensity, uSteps;
uniform vec3 uStart, uMid, uEnd, uSmoke;
varying vec2 vUv;
const float ABSORB = 2.0, AMBIENT = 0.5, POWDER = 0.59, MULTI = 1.0, G_HG = 0.0;
const float SIG = 9.0;
float hg(float c, float g) { float g2 = g * g; return (1.0 - g2) / pow(max(1.0 + g2 - 2.0 * g * c, 1e-4), 1.5) * 0.079577; }
vec3 ramp(float t) {
  vec3 c = mix(vec3(0.0), uEnd, smoothstep(0.05, 0.35, t));
  c = mix(c, uMid, smoothstep(0.35, 0.65, t));
  return mix(c, uStart, smoothstep(0.65, 1.0, t));
}
vec2 dyeAt(vec3 p) {
  vec3 pc = (p - BMIN) / CELL;
  // Velocity warps the lookup, so smoke turns wispy.
  pc += S(tVel, pc).xyz * 0.02 / CELL;
  vec2 d = S(tDye, pc).rg;
  vec3 e = min(pc, NF - pc);
  return d * smoothstep(0.0, 2.0, min(e.x, min(e.y, e.z)));
}
float lightT(vec3 p) {
  vec3 L = normalize(uLamp - p);
  float sum = dyeAt(p + L * 0.06).r * 0.06 + dyeAt(p + L * 0.18).r * 0.12;
  float tau = sum * SIG * ABSORB * 0.5;
  float beer = exp(-tau);
  float base = mix(beer, beer + exp(-tau * 0.25) * 0.5, MULTI);
  float fin = mix(base, base * (1.0 - exp(-tau * 2.0)), POWDER);
  return clamp(fin + AMBIENT, 0.0, 1.0);
}
float ign(vec2 p) { return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715)))); }
void main() {
  vec2 ndc = vUv * 2.0 - 1.0;
  vec4 v = uInvProj * vec4(ndc, 1.0, 1.0);
  vec3 dv = normalize(v.xyz / v.w);
  vec3 rd = normalize(mat3(uCamWorld) * dv);
  // The scene's depth stops the ray at the first solid surface.
  float z = texture2D(tDepth, vUv).x;
  float vz = perspectiveDepthToViewZ(z, uNear, uFar);
  float tScene = z >= 1.0 ? 1e6 : vz / dv.z;
  vec3 inv = 1.0 / rd;
  vec3 t0 = (uB0 - uCam) * inv, t1 = (uB1 - uCam) * inv;
  vec3 tn = min(t0, t1), tf = max(t0, t1);
  float ta = max(max(tn.x, tn.y), max(tn.z, 0.0)), tb = min(min(tf.x, tf.y), min(tf.z, tScene));
  if (tb <= ta) { gl_FragColor = vec4(0.0); return; }
  float n = uSteps, dl = (tb - ta) / n;
  // Dithering hides banding; the frame count turns the pattern.
  float t = ta + dl * fract(ign(gl_FragCoord.xy) + uFrame * 0.618034);
  vec3 col = vec3(0.0);
  float T = 1.0;
  for (int i = 0; i < 64; i++) {
    if (float(i) >= n || T < 0.02) break;
    vec3 p = uCam + rd * t;
    vec2 d = dyeAt(p);
    float smoke = d.r, heat = d.g;
    if (smoke + heat > 0.002) {
      // Fine noise breaks the smoke and the flame into wisps.
      float det = vn3(p * vec3(26.0, 14.0, 26.0) + vec3(0.0, -uTime * 2.4, 0.0)) * 0.6 + vn3(p * vec3(60.0, 34.0, 60.0) + vec3(0.0, -uTime * 4.0, 0.0)) * 0.4;
      smoke *= det + 0.45;
      // The flame shows where the noise lets it: tongues, not a glow.
      float h = clamp(heat * (0.35 + 0.8 * det), 0.0, 1.0);
      vec3 fire = ramp(h) * h * h * uIntensity * (smoke + 0.25);
      float sig = smoke * SIG;
      vec3 Ld = normalize(uLamp - p), V = normalize(uCam - p);
      vec3 sc = uSmoke * lightT(p) * hg(dot(V, Ld), G_HG) * 12.56637 * 0.35;
      // The fire lights its own smoke from below.
      sc += uMid * 0.06 * clamp(heat * 4.0, 0.0, 1.0);
      float a = exp(-sig * dl);
      col += T * (fire * dl + sc * (1.0 - a));
      T *= a;
    }
    t += dl;
  }
  gl_FragColor = vec4(col, 1.0 - T);
}`;
// The volume lays over the scene in place: premultiplied, so smoke hides what is behind.
// A small blur hides the march's dither, as Fire's blur pass does.
const COMPOSE = `
uniform sampler2D tVol;
uniform vec2 uTexel;
varying vec2 vUv;
void main() {
  vec4 c = texture2D(tVol, vUv) * 0.36;
  c += texture2D(tVol, vUv + uTexel * vec2(1.2, 0.4)) * 0.16;
  c += texture2D(tVol, vUv + uTexel * vec2(-0.4, 1.2)) * 0.16;
  c += texture2D(tVol, vUv + uTexel * vec2(-1.2, -0.4)) * 0.16;
  c += texture2D(tVol, vUv + uTexel * vec2(0.4, -1.2)) * 0.16;
  gl_FragColor = c;
}`;
/* ---------- end K3 lighting ---------- */

// OKLCH to linear sRGB, for Fire's ramp stops.
function okl(L, C, h, out) {
  const a = C * Math.cos(h * Math.PI / 180), b = C * Math.sin(h * Math.PI / 180);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3, m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3, s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return out.set(Math.max(0, 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s), Math.max(0, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s), Math.max(0, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s));
}
// Fire's wood stops in OKLCH: start, mid, end, smoke.
// Tom wants more orange: the hot stops lose lightness and turn toward orange.
const WOOD = [[0.85, 0.16, 66], [0.7, 0.2, 47], [0.57, 0.22, 33], [0.8, 0.03, 50]];
export const FIRE_LIGHT = okl(...WOOD[1], new THREE.Color());

export function createFire(renderer, camera, lamp) {
  const grid = () => new THREE.WebGLRenderTarget(AW, AH, { type: THREE.HalfFloatType, format: THREE.RGBAFormat, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false, stencilBuffer: false });
  const vel = [grid(), grid()], dye = [grid(), grid()], pr = [grid(), grid()], div = grid(), curl = grid();
  const swap = a => { const t = a[0]; a[0] = a[1]; a[1] = t; };
  const mat = (fs, uniforms) => new THREE.ShaderMaterial({ vertexShader: VS, fragmentShader: fs, uniforms, depthTest: false, depthWrite: false });
  const u = v => ({ value: v });
  const M = {
    curl: mat(CURL, { tVel: u(null) }),
    vel: mat(ADVECT_VEL, { tVel: u(null), tDye: u(null), tCurl: u(null), uDt: u(0), uTime: u(0), uBuoy: u(5.5), uWeight: u(0.4), uTurb: u(7.0), uTurbF: u(9.0), uVort: u(7.0), uDamp: u(0.6) }),
    div: mat(DIVERGE, { tVel: u(null) }),
    jac: mat(JACOBI_FS, { tP: u(null), tDiv: u(null) }),
    proj: mat(PROJECT, { tP: u(null), tVel: u(null) }),
    dye: mat(ADVECT_DYE, { tVel: u(null), tDye: u(null), uDt: u(0), uDiss: u(0.45), uCool: u(3.2) }),
  };
  const quad = new FullScreenQuad(null);
  function run(m, target) { quad.material = m; renderer.setRenderTarget(target); quad.render(renderer); }

  // Emitters: two vertices each, one per y slice.
  const EMAX = 2600;
  const eg = new THREE.BufferGeometry();
  const epos = new Float32Array(EMAX * 2 * 3), egive = new Float32Array(EMAX * 2 * 3);
  eg.setAttribute('position', new THREE.BufferAttribute(epos, 3).setUsage(THREE.DynamicDrawUsage));
  eg.setAttribute('aGive', new THREE.BufferAttribute(egive, 3).setUsage(THREE.DynamicDrawUsage));
  const emat = new THREE.ShaderMaterial({ vertexShader: EMIT_VS, fragmentShader: EMIT_FS, transparent: true, depthTest: false, depthWrite: false,
    blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor });
  const points = new THREE.Points(eg, emat);
  points.frustumCulled = false;
  const escene = new THREE.Scene();
  escene.add(points);
  const ecam = new THREE.Camera();
  let en = 0;
  function emit(x, y, z, smoke, heat) {
    if (en >= EMAX) return;
    for (let s = 0; s < 2; s++) {
      const o = (en * 2 + s) * 3;
      epos[o] = x; epos[o + 1] = y; epos[o + 2] = z;
      egive[o] = smoke; egive[o + 1] = heat; egive[o + 2] = s;
    }
    en++;
  }

  let live = false, time = 0;
  function clear() {
    const c = renderer.getClearColor(new THREE.Color()), a = renderer.getClearAlpha();
    renderer.setClearColor(0x000000, 0);
    for (const t of [...vel, ...dye, ...pr, div, curl]) { renderer.setRenderTarget(t); renderer.clear(true, false, false); }
    renderer.setClearColor(c, a);
    renderer.setRenderTarget(null);
  }
  clear();

  // One step: the emitters given since the last step go in after the dye moves.
  function step(dt, fade = 0) {
    time += dt;
    live = true;
    const prev = renderer.getRenderTarget(), auto = renderer.autoClear;
    renderer.autoClear = false;
    M.curl.uniforms.tVel.value = vel[0].texture;
    run(M.curl, curl);
    const V = M.vel.uniforms;
    V.tVel.value = vel[0].texture; V.tDye.value = dye[0].texture; V.tCurl.value = curl.texture;
    V.uDt.value = dt; V.uTime.value = time;
    run(M.vel, vel[1]); swap(vel);
    M.div.uniforms.tVel.value = vel[0].texture;
    run(M.div, div);
    M.jac.uniforms.tDiv.value = div.texture;
    for (let i = 0; i < JACOBI; i++) { M.jac.uniforms.tP.value = pr[0].texture; run(M.jac, pr[1]); swap(pr); }
    M.proj.uniforms.tP.value = pr[0].texture; M.proj.uniforms.tVel.value = vel[0].texture;
    run(M.proj, vel[1]); swap(vel);
    const D = M.dye.uniforms;
    D.tVel.value = vel[0].texture; D.tDye.value = dye[0].texture; D.uDt.value = dt;
    // A reset clears the air fast.
    D.uDiss.value = 0.45 + fade * 6; D.uCool.value = 3.2 + fade * 12;
    run(M.dye, dye[1]); swap(dye);
    if (en) {
      eg.setDrawRange(0, en * 2);
      eg.attributes.position.needsUpdate = true; eg.attributes.aGive.needsUpdate = true;
      renderer.setRenderTarget(dye[0]);
      renderer.render(escene, ecam);
    }
    en = 0;
    renderer.setRenderTarget(prev);
    renderer.autoClear = auto;
  }

  /* ---------- the volume pass ---------- */
  // The march runs at half size and stops at the scene's depth.
  const half = new THREE.WebGLRenderTarget(2, 2, { type: THREE.HalfFloatType, depthBuffer: false });
  const stops = WOOD.map(c => okl(...c, new THREE.Color()));
  const marchMat = new THREE.ShaderMaterial({
    vertexShader: VS, fragmentShader: MARCH, depthTest: false, depthWrite: false,
    uniforms: {
      tDye: u(null), tVel: u(null), tDepth: u(null), uInvProj: u(new THREE.Matrix4()), uCamWorld: u(new THREE.Matrix4()),
      uCam: u(new THREE.Vector3()), uLamp: u(lamp.clone()), uB0: u(new THREE.Vector3(...BOX.min)), uB1: u(new THREE.Vector3(...BOX.max)),
      uNear: u(camera.near), uFar: u(camera.far), uTime: u(0), uFrame: u(0), uIntensity: u(7), uSteps: u(48),
      uStart: u(stops[0]), uMid: u(stops[1]), uEnd: u(stops[2]), uSmoke: u(stops[3].clone().multiplyScalar(0.09)),
    },
  });
  const composeMat = new THREE.ShaderMaterial({ vertexShader: VS, fragmentShader: COMPOSE, uniforms: { tVol: u(null), uTexel: u(new THREE.Vector2()) }, depthTest: false, depthWrite: false,
    transparent: true, blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
    blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor });
  let frameN = 0;
  // The pass draws into the read buffer and does not swap, so the buffers keep their order.
  class VolumePass extends Pass {
    constructor() { super(); this.needsSwap = false; this.enabled = false; }
    setSize(w, h) { half.setSize(Math.max(1, Math.round(w / 2)), Math.max(1, Math.round(h / 2))); }
    render(r, writeBuffer, readBuffer) {
      const U = marchMat.uniforms;
      U.tDye.value = dye[0].texture; U.tVel.value = vel[0].texture; U.tDepth.value = readBuffer.depthTexture;
      U.uInvProj.value.copy(camera.projectionMatrixInverse); U.uCamWorld.value.copy(camera.matrixWorld);
      U.uCam.value.setFromMatrixPosition(camera.matrixWorld); U.uNear.value = camera.near; U.uFar.value = camera.far;
      U.uTime.value = time; U.uFrame.value = frameN++ % 64;
      run(marchMat, half);
      composeMat.uniforms.tVol.value = half.texture;
      composeMat.uniforms.uTexel.value.set(1 / half.width, 1 / half.height);
      quad.material = composeMat;
      const auto = r.autoClear;
      r.autoClear = false;
      r.setRenderTarget(this.renderToScreen ? null : readBuffer);
      quad.render(r);
      r.autoClear = auto;
    }
  }
  const pass = new VolumePass();

  return {
    pass, emit, step, BOX,
    get live() { return live; },
    // The march covers only the part of the box where fire or smoke can be.
    bounds(x0, y0, z0, x1, y1, z1) {
      marchMat.uniforms.uB0.value.set(Math.max(BOX.min[0], x0), Math.max(BOX.min[1], y0), Math.max(BOX.min[2], z0));
      marchMat.uniforms.uB1.value.set(Math.min(BOX.max[0], x1), Math.min(BOX.max[1], y1), Math.min(BOX.max[2], z1));
    },
    steps(n) { marchMat.uniforms.uSteps.value = n; },
    stop() { if (live) { clear(); live = false; } },
    dispose() {
      [...vel, ...dye, ...pr, div, curl, half].forEach(t => t.dispose());
      Object.values(M).forEach(m => m.dispose());
      eg.dispose(); emat.dispose(); marchMat.dispose(); composeMat.dispose(); quad.dispose();
    },
  };
}
