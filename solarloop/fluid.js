// Solar loop fluid probe: an eruption as Fire's 3D fluid. Only with ?fluid (spike stimming-8gez).
// A box stands on the star at the erupting site: up is radial, the surface is its floor.
// The box fills with a rope of plasma; heat and a growing lift throw it out into space.
/* ---------- K3: volume fluid (raw WebGL2 port of shared/fire.js, from cloudbottle/fluid.js) ---------- */
// The method follows Fire: advect, buoyancy, turbulence, vorticity confinement,
// a Jacobi pressure solve, dye transport.
// The grid packs its y slices as tiles in one 2D atlas.
import { TRI_VS, program, target, free, bind, tri } from '../shared/gl.js';
import { R } from './sun.js';

// Grid size in cells, and tiles per atlas row.
const NX = 32, NY = 48, NZ = 32, TC = 8;
const AW = NX * TC, AH = NZ * Math.ceil(NY / TC);
// One cell is 12.5 star units: the box is 400 wide and 600 tall.
const CELL = 12.5;
const BMIN = [-NX * CELL / 2, 0, -NZ * CELL / 2];
// An even count leaves the pressure in slot 0.
const JACOBI = 20;

const f = n => n.toFixed(5);
const ATLAS = `
const int NX = ${NX}, NY = ${NY}, NZ = ${NZ}, TC = ${TC};
const vec3 NF = vec3(${f(NX)}, ${f(NY)}, ${f(NZ)});
const vec2 ATLAS = vec2(${f(AW)}, ${f(AH)});
const float CELL = ${f(CELL)};
const vec3 BMIN = vec3(${BMIN.map(f).join(', ')});
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
`;

const HEAD = `#version 300 es
precision highp float;
precision highp sampler2D;
${ATLAS}
out vec4 o;
// Every cell in the box is open gas.
bool wet(ivec3 c) { return all(greaterThanEqual(c, ivec3(0))) && c.x < NX && c.y < NY && c.z < NZ; }
// Outside the box is open space, except below the floor: the star's surface.
bool open(ivec3 c) { return c.y >= 0; }
float h31(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
float vn3(vec3 p) {
  vec3 i = floor(p), u = fract(p);
  u = u * u * (3.0 - 2.0 * u);
  return mix(mix(mix(h31(i), h31(i + vec3(1, 0, 0)), u.x), mix(h31(i + vec3(0, 1, 0)), h31(i + vec3(1, 1, 0)), u.x), u.y),
             mix(mix(h31(i + vec3(0, 0, 1)), h31(i + vec3(1, 0, 1)), u.x), mix(h31(i + vec3(0, 1, 1)), h31(i + vec3(1, 1, 1)), u.x), u.y), u.z);
}
`;

const CURL = `${HEAD}
uniform sampler2D tVel;
void main() {
  ivec3 c = cellOf(gl_FragCoord.xy);
  vec3 vR = F(tVel, c + ivec3(1, 0, 0)).xyz, vL = F(tVel, c - ivec3(1, 0, 0)).xyz;
  vec3 vU = F(tVel, c + ivec3(0, 1, 0)).xyz, vD = F(tVel, c - ivec3(0, 1, 0)).xyz;
  vec3 vF = F(tVel, c + ivec3(0, 0, 1)).xyz, vB = F(tVel, c - ivec3(0, 0, 1)).xyz;
  vec3 w = vec3(vU.z - vD.z - (vF.y - vB.y), vF.x - vB.x - (vR.z - vL.z), vR.y - vL.y - (vU.x - vD.x)) / (2.0 * CELL);
  o = vec4(w, length(w));
}`;

// Velocity in star units per second.
const ADVECT_VEL = `${HEAD}
uniform sampler2D tVel, tDye, tCurl;
uniform float uDt, uTime, uBuoy, uLift, uTurb, uTurbF, uVort, uDamp;
void main() {
  ivec3 c = cellOf(gl_FragCoord.xy);
  vec3 pc = vec3(c) + 0.5, P = BMIN + pc * CELL;
  vec3 v = S(tVel, pc - F(tVel, c).xyz * uDt / CELL).xyz;
  vec4 dye = F(tDye, c);
  // Hot plasma rises; the field's growing lift carries the plasma itself out.
  v.y += (dye.g * uBuoy + clamp(dye.r, 0.0, 1.5) * uLift) * uDt;
  // Fire's ambient turbulence: a drifting noise field stirs the gas.
  vec3 q = P * uTurbF + vec3(0.0, uTime * 0.25, uTime * 0.06);
  vec3 n = vec3(vn3(q), vn3(q + 17.1), vn3(q + 41.7)) - 0.5;
  v += n * uTurb * (0.3 + dye.r) * uDt;
  // Vorticity confinement spins small curls back up into rolls.
  vec4 wC = F(tCurl, c);
  vec3 eta = vec3(F(tCurl, c + ivec3(1, 0, 0)).w - F(tCurl, c - ivec3(1, 0, 0)).w,
                  F(tCurl, c + ivec3(0, 1, 0)).w - F(tCurl, c - ivec3(0, 1, 0)).w,
                  F(tCurl, c + ivec3(0, 0, 1)).w - F(tCurl, c - ivec3(0, 0, 1)).w);
  v += cross(eta / (length(eta) + 1e-5), wC.xyz) * uVort * CELL * uDt;
  v *= max(1.0 - uDamp * uDt, 0.0);
  o = vec4(v, 0.0);
}`;

// The floor passes nothing; open space passes all.
const DIVERGE = `${HEAD}
uniform sampler2D tVel;
float side(ivec3 n, int k, float vc) {
  if (wet(n)) return F(tVel, n)[k];
  return open(n) ? vc : -vc;
}
void main() {
  ivec3 c = cellOf(gl_FragCoord.xy);
  vec3 v = F(tVel, c).xyz;
  float d = side(c + ivec3(1, 0, 0), 0, v.x) - side(c - ivec3(1, 0, 0), 0, v.x)
          + side(c + ivec3(0, 1, 0), 1, v.y) - side(c - ivec3(0, 1, 0), 1, v.y)
          + side(c + ivec3(0, 0, 1), 2, v.z) - side(c - ivec3(0, 0, 1), 2, v.z);
  o = vec4(0.5 * d, 0.0, 0.0, 0.0);
}`;

// Pressure: zero in open space, mirrored at the floor.
const PRESSURE = `
float Pr(sampler2D t, ivec3 c, float pc) {
  if (wet(c)) return F(t, c).x;
  return open(c) ? 0.0 : pc;
}`;
const JACOBI_FS = `${HEAD}${PRESSURE}
uniform sampler2D tP, tDiv;
void main() {
  ivec3 c = cellOf(gl_FragCoord.xy);
  float pc = F(tP, c).x;
  float s = Pr(tP, c + ivec3(1, 0, 0), pc) + Pr(tP, c - ivec3(1, 0, 0), pc) + Pr(tP, c + ivec3(0, 1, 0), pc)
          + Pr(tP, c - ivec3(0, 1, 0), pc) + Pr(tP, c + ivec3(0, 0, 1), pc) + Pr(tP, c - ivec3(0, 0, 1), pc);
  o = vec4((s - F(tDiv, c).x) / 6.0, 0.0, 0.0, 0.0);
}`;
const PROJECT = `${HEAD}${PRESSURE}
uniform sampler2D tP, tVel;
void main() {
  ivec3 c = cellOf(gl_FragCoord.xy);
  float pc = F(tP, c).x;
  vec3 g = vec3(Pr(tP, c + ivec3(1, 0, 0), pc) - Pr(tP, c - ivec3(1, 0, 0), pc),
                Pr(tP, c + ivec3(0, 1, 0), pc) - Pr(tP, c - ivec3(0, 1, 0), pc),
                Pr(tP, c + ivec3(0, 0, 1), pc) - Pr(tP, c - ivec3(0, 0, 1), pc));
  vec3 v = F(tVel, c).xyz - 0.5 * g;
  // A light blur with the neighbours damps the grid's checkerboard mode.
  vec3 sum = vec3(0.0);
  float n = 0.0;
  for (int k = 0; k < 6; k++) {
    ivec3 e = ivec3(k == 0 ? 1 : k == 1 ? -1 : 0, k == 2 ? 1 : k == 3 ? -1 : 0, k == 4 ? 1 : k == 5 ? -1 : 0);
    if (wet(c + e)) { sum += F(tVel, c + e).xyz; n += 1.0; }
  }
  if (n > 0.0) v = mix(v, sum / n, 0.2);
  o = vec4(v, 0.0);
}`;

// Dye: r the plasma, g its heat.
const ADVECT_DYE = `${HEAD}
uniform sampler2D tVel, tDye;
uniform float uDt, uFill, uEmit, uSpan, uTime;
void main() {
  ivec3 c = cellOf(gl_FragCoord.xy);
  vec3 pc = vec3(c) + 0.5, P = BMIN + pc * CELL;
  vec4 d = S(tDye, pc - F(tVel, c).xyz * uDt / CELL);
  float gas = d.r * max(1.0 - 0.04 * uDt, 0.0), heat = d.g * max(1.0 - 0.25 * uDt, 0.0);
  // The foot keeps feeding the eruption: a ragged line of plasma along the site.
  float line = smoothstep(uSpan, uSpan * 0.7, abs(P.x)) * smoothstep(3.0 * CELL, 0.0, P.y) * smoothstep(0.14 * NF.z * CELL, 0.0, abs(P.z));
  float rag = 0.6 + 0.8 * vn3(P * 0.05 + vec3(0.0, 0.0, uTime));
  gas += line * uEmit * uDt * 2.5 * rag;
  heat += line * uEmit * uDt * 3.0;
  // At the start the box holds the prominence: a rope along the site, low over the floor.
  if (uFill > 0.0) {
    float hy = 0.2 * NF.y * CELL, ry = 0.06 * NF.y * CELL, rz = 0.1 * NF.z * CELL;
    float rope = exp(-pow((P.y - hy) / ry, 2.0)) * exp(-pow(P.z / rz, 2.0)) * smoothstep(uSpan, uSpan * 0.6, abs(P.x));
    float n = vn3(P * 0.04);
    gas = mix(gas, rope * (0.6 + 1.2 * n), uFill);
    heat = mix(heat, rope * 0.8, uFill);
  }
  o = vec4(gas, heat, 0.0, 0.0);
}`;
/* ---------- end K3 fluid ---------- */

// The draw: a march through the box only, front to back, for glowing optically thin plasma.
const DRAW = `${HEAD}
uniform sampler2D tDye;
uniform vec4 uView;
uniform mat3 uToSun, uBox, uBoxT;
uniform vec3 uO;
uniform float uGain;
in vec2 vUv;
const float R = ${R.toFixed(1)};
void main() {
  vec2 P = uView.xy + (vUv * 2.0 - 1.0) * uView.zw;
  // An orthographic ray from in front of the star, into the box's own frame.
  vec3 ro = uBoxT * (uToSun * vec3(P, 3.0 * R) - uO);
  vec3 rd = uBoxT * (uToSun * vec3(0.0, 0.0, -1.0));
  vec3 lo = BMIN, hi = BMIN + NF * CELL;
  vec3 inv = 1.0 / (rd + sign(rd) * 1e-6 + vec3(1e-9));
  vec3 a = (lo - ro) * inv, b = (hi - ro) * inv;
  float t0 = max(max(min(a.x, b.x), min(a.y, b.y)), min(a.z, b.z));
  float t1 = min(min(max(a.x, b.x), max(a.y, b.y)), max(a.z, b.z));
  if (t1 <= max(t0, 0.0)) { o = vec4(0.0); return; }
  t0 = max(t0, 0.0);
  const int N = 48;
  float dt = (t1 - t0) / float(N);
  float j = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));
  float acc = 0.0, T = 1.0;
  for (int i = 0; i < N; i++) {
    vec3 p = ro + rd * (t0 + dt * (float(i) + j));
    // Past the star's surface nothing more shows.
    if (length(uBox * p + uO) < R) break;
    float d = max(S(tDye, (p - BMIN) / CELL).r, 0.0);
    if (d < 0.002) continue;
    acc += T * d * dt;
    T *= exp(-d * dt * 0.004);
  }
  o = vec4(0.0, acc * uGain, 0.0, 1.0);
}`;

// Adds the half-size plasma into the full-size light, before bloom.
const ADD = `#version 300 es
precision highp float;
uniform sampler2D uSrc;
in vec2 vUv;
out vec4 o;
void main() { o = texture(uSrc, vUv); }`;

/** The probe's programs, for one linked() call with the renderer's. */
export function fluidPrograms(gl) {
  return {
    fCurl: program(gl, TRI_VS, CURL),
    fVel: program(gl, TRI_VS, ADVECT_VEL),
    fDiv: program(gl, TRI_VS, DIVERGE),
    fJac: program(gl, TRI_VS, JACOBI_FS),
    fProj: program(gl, TRI_VS, PROJECT),
    fDye: program(gl, TRI_VS, ADVECT_DYE),
    fDraw: program(gl, TRI_VS, DRAW),
    fAdd: program(gl, TRI_VS, ADD),
  };
}

/** The fluid on linked programs: step() advances it, draw() adds it to the light. */
export function makeFluid(gl, P, empty) {
  const grid = () => target(gl, AW, AH, { clear: true });
  let vel = [grid(), grid()], dye = [grid(), grid()];
  const pr = [grid(), grid()], div = grid(), curl = grid();
  let img = null;
  const swap = a => { const t = a[0]; a[0] = a[1]; a[1] = t; };
  const set = (p, name, v) => { if (p.u[name] != null) gl.uniform1f(p.u[name], v); };
  const clear = t => { gl.bindFramebuffer(gl.FRAMEBUFFER, t.fb); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); };

  // s: dt, t, fill, emit, lift, span.
  function step(s) {
    gl.disable(gl.BLEND);
    if (s.reset) [...vel, ...dye, ...pr].forEach(clear);
    const dt = s.dt;
    if (dt > 0) {
      let p = P.fCurl;
      gl.useProgram(p.p);
      bind(gl, p, 'tVel', 0, vel[0]);
      tri(gl, curl, empty);

      p = P.fVel;
      gl.useProgram(p.p);
      bind(gl, p, 'tVel', 0, vel[0]);
      bind(gl, p, 'tDye', 1, dye[0]);
      bind(gl, p, 'tCurl', 2, curl);
      set(p, 'uDt', dt); set(p, 'uTime', s.t);
      set(p, 'uBuoy', 45); set(p, 'uLift', s.lift);
      set(p, 'uTurb', 70); set(p, 'uTurbF', 1 / 70);
      set(p, 'uVort', 1.2); set(p, 'uDamp', 0.08);
      tri(gl, vel[1], empty);
      swap(vel);

      p = P.fDiv;
      gl.useProgram(p.p);
      bind(gl, p, 'tVel', 0, vel[0]);
      tri(gl, div, empty);

      p = P.fJac;
      gl.useProgram(p.p);
      bind(gl, p, 'tDiv', 1, div);
      for (let i = 0; i < JACOBI; i++) {
        bind(gl, p, 'tP', 0, pr[0]);
        tri(gl, pr[1], empty);
        swap(pr);
      }

      p = P.fProj;
      gl.useProgram(p.p);
      bind(gl, p, 'tP', 0, pr[0]);
      bind(gl, p, 'tVel', 1, vel[0]);
      tri(gl, vel[1], empty);
      swap(vel);
    }
    const p = P.fDye;
    gl.useProgram(p.p);
    bind(gl, p, 'tVel', 0, vel[0]);
    bind(gl, p, 'tDye', 1, dye[0]);
    set(p, 'uDt', Math.max(dt, 0)); set(p, 'uTime', s.t);
    set(p, 'uFill', s.fill || 0); set(p, 'uEmit', s.emit); set(p, 'uSpan', s.span);
    tri(gl, dye[1], empty);
    swap(dye);
  }

  // v: view, toSun, box (local to star), boxT (star to local), origin, gain; dst: the light target.
  function draw(v, W, H, dst) {
    const w = Math.max(2, W >> 1), h = Math.max(2, H >> 1);
    if (!img || img.w !== w || img.h !== h) { free(gl, img); img = target(gl, w, h); }
    gl.disable(gl.BLEND);
    let p = P.fDraw;
    gl.useProgram(p.p);
    bind(gl, p, 'tDye', 0, dye[0]);
    gl.uniform4fv(p.u.uView, v.view);
    gl.uniformMatrix3fv(p.u.uToSun, false, v.toSun);
    gl.uniformMatrix3fv(p.u.uBox, false, v.box);
    gl.uniformMatrix3fv(p.u.uBoxT, false, v.boxT);
    gl.uniform3fv(p.u.uO, v.origin);
    gl.uniform1f(p.u.uGain, v.gain);
    tri(gl, img, empty);
    p = P.fAdd;
    gl.useProgram(p.p);
    bind(gl, p, 'uSrc', 0, img);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);
    tri(gl, dst, empty);
    gl.disable(gl.BLEND);
  }

  return {
    step, draw,
    free() { [div, curl, img, ...vel, ...dye, ...pr].forEach(t => free(gl, t)); },
  };
}
