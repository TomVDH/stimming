// Cloud in a bottle fluid: the gas in the jug moves the cloud.
/* ---------- K3: volume fluid (raw WebGL2 port of shared/fire.js) ---------- */
// The method follows Fire: advect, buoyancy, turbulence, vorticity confinement,
// a Jacobi pressure solve, dye transport.
// The grid packs its y slices as tiles in one 2D atlas.
// The jug's glass is a solid wall; the mouth is open while the stopper is out.
import { TRI_VS, program, target, free, bind, tri } from '../shared/gl.js';
import { JUG, PROFILE } from './jug.js';

// Grid size in cells, and tiles per atlas row.
const NX = 32, NY = 40, NZ = 32, TC = 8;
const AW = NX * TC, AH = NZ * Math.ceil(NY / TC);
// Cells are 7.5 mm cubes; the box holds the jug from the water to the mouth.
const CELL = 0.0075;
const BMIN = [-NX * CELL / 2, JUG.WATER, -NZ * CELL / 2];
// An even count leaves the pressure in slot 0.
const JACOBI = 24;

const f = n => n.toFixed(5);
// The atlas lookups, also used by the fog pass.
export const ATLAS = `
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
precision highp sampler3D;
${PROFILE}
${ATLAS}
uniform sampler2D tMask;
uniform float uOpen;
out vec4 o;
// True inside the jug's air.
bool wet(ivec3 c) {
  if (any(lessThan(c, ivec3(0))) || c.x >= NX || c.y >= NY || c.z >= NZ) return false;
  return F(tMask, c).r > 0.5;
}
// True in the open mouth, over the grid, while the stopper is out.
bool open(ivec3 c) {
  return c.y >= NY && uOpen > 0.5 && length(BMIN.xz + (vec2(c.xz) + 0.5) * CELL) < RN - TH;
}
float h31(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
float vn3(vec3 p) {
  vec3 i = floor(p), u = fract(p);
  u = u * u * (3.0 - 2.0 * u);
  return mix(mix(mix(h31(i), h31(i + vec3(1, 0, 0)), u.x), mix(h31(i + vec3(0, 1, 0)), h31(i + vec3(1, 1, 0)), u.x), u.y),
             mix(mix(h31(i + vec3(0, 0, 1)), h31(i + vec3(1, 0, 1)), u.x), mix(h31(i + vec3(0, 1, 1)), h31(i + vec3(1, 1, 1)), u.x), u.y), u.z);
}
`;

// The mask: r is 1 in the jug's air, g is 1 at the glass and 0 three cells in.
const MASK = `${HEAD}
void main() {
  ivec3 c = cellOf(gl_FragCoord.xy);
  float m = jugInner(BMIN + (vec3(c) + 0.5) * CELL);
  float w = m < 0.0 ? 1.0 : 0.0;
  o = vec4(w, w * smoothstep(-3.0 * CELL, 0.0, m), 0.0, 0.0);
}`;

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

// Velocity in metres per second.
const ADVECT_VEL = `${HEAD}
uniform sampler2D tVel, tDye, tCurl;
uniform float uDt, uTime, uBuoy, uWeight, uTurb, uTurbF, uVort, uDamp, uJet;
void main() {
  ivec3 c = cellOf(gl_FragCoord.xy);
  if (!wet(c)) { o = vec4(0.0); return; }
  vec3 pc = vec3(c) + 0.5, P = BMIN + pc * CELL;
  vec3 v = S(tVel, pc - F(tVel, c).xyz * uDt / CELL).xyz;
  vec4 dye = F(tDye, c);
  float fog = clamp(dye.r, 0.0, 1.5);
  // Warm gas rises; the droplets weigh the cloud down a little.
  v.y += (dye.g * uBuoy - fog * uWeight) * uDt;
  // Fire's ambient turbulence: a drifting noise field stirs the cloud.
  vec3 q = P * uTurbF + vec3(0.0, uTime * 0.25, uTime * 0.06);
  vec3 n = vec3(vn3(q), vn3(q + 17.1), vn3(q + 41.7)) - 0.5;
  v += n * uTurb * (0.3 + fog) * uDt;
  // Vorticity confinement spins small curls back up into rolls.
  vec4 wC = F(tCurl, c);
  vec3 eta = vec3(F(tCurl, c + ivec3(1, 0, 0)).w - F(tCurl, c - ivec3(1, 0, 0)).w,
                  F(tCurl, c + ivec3(0, 1, 0)).w - F(tCurl, c - ivec3(0, 1, 0)).w,
                  F(tCurl, c + ivec3(0, 0, 1)).w - F(tCurl, c - ivec3(0, 0, 1)).w);
  v += cross(eta / (length(eta) + 1e-5), wC.xyz) * uVort * CELL * uDt;
  v *= max(1.0 - uDamp * uDt, 0.0);
  // A squeeze blows air from the stopper down the neck.
  // The jet reaches past the shoulder and spreads as it slows.
  float jet = uJet * smoothstep(0.016, 0.004, length(P.xz)) * smoothstep(TOP - 0.2, TOP - 0.08, P.y);
  v = mix(v, vec3(0.0, -1.3, 0.0), jet * 0.85);
  o = vec4(v, 0.0);
}`;

// A solid face passes nothing; the open mouth passes all.
const DIVERGE = `${HEAD}
uniform sampler2D tVel;
uniform float uExpand;
float side(ivec3 n, int k, float vc) {
  if (wet(n)) return F(tVel, n)[k];
  return open(n) ? vc : -vc;
}
void main() {
  ivec3 c = cellOf(gl_FragCoord.xy);
  if (!wet(c)) { o = vec4(0.0); return; }
  vec3 v = F(tVel, c).xyz;
  float d = side(c + ivec3(1, 0, 0), 0, v.x) - side(c - ivec3(1, 0, 0), 0, v.x)
          + side(c + ivec3(0, 1, 0), 1, v.y) - side(c - ivec3(0, 1, 0), 1, v.y)
          + side(c + ivec3(0, 0, 1), 2, v.z) - side(c - ivec3(0, 0, 1), 2, v.z);
  // After a pop the gas expands everywhere and leaves by the mouth.
  o = vec4(0.5 * d - uExpand, 0.0, 0.0, 0.0);
}`;

// Pressure: zero in the open mouth, mirrored at the glass.
const PRESSURE = `
float Pr(sampler2D t, ivec3 c, float pc) {
  if (wet(c)) return F(t, c).x;
  return open(c) ? 0.0 : pc;
}`;
const JACOBI_FS = `${HEAD}${PRESSURE}
uniform sampler2D tP, tDiv;
void main() {
  ivec3 c = cellOf(gl_FragCoord.xy);
  if (!wet(c)) { o = vec4(0.0); return; }
  float pc = F(tP, c).x;
  float s = Pr(tP, c + ivec3(1, 0, 0), pc) + Pr(tP, c - ivec3(1, 0, 0), pc) + Pr(tP, c + ivec3(0, 1, 0), pc)
          + Pr(tP, c - ivec3(0, 1, 0), pc) + Pr(tP, c + ivec3(0, 0, 1), pc) + Pr(tP, c - ivec3(0, 0, 1), pc);
  o = vec4((s - F(tDiv, c).x) / 6.0, 0.0, 0.0, 0.0);
}`;
const PROJECT = `${HEAD}${PRESSURE}
uniform sampler2D tP, tVel;
void main() {
  ivec3 c = cellOf(gl_FragCoord.xy);
  if (!wet(c)) { o = vec4(0.0); return; }
  float pc = F(tP, c).x;
  vec3 g = vec3(Pr(tP, c + ivec3(1, 0, 0), pc) - Pr(tP, c - ivec3(1, 0, 0), pc),
                Pr(tP, c + ivec3(0, 1, 0), pc) - Pr(tP, c - ivec3(0, 1, 0), pc),
                Pr(tP, c + ivec3(0, 0, 1), pc) - Pr(tP, c - ivec3(0, 0, 1), pc));
  vec3 v = F(tVel, c).xyz - 0.5 * g;
  // A light blur with the wet neighbours damps the grid's checkerboard mode.
  vec3 sum = vec3(0.0);
  float n = 0.0;
  for (int k = 0; k < 6; k++) {
    ivec3 e = ivec3(k == 0 ? 1 : k == 1 ? -1 : 0, k == 2 ? 1 : k == 3 ? -1 : 0, k == 4 ? 1 : k == 5 ? -1 : 0);
    if (wet(c + e)) { sum += F(tVel, c + e).xyz; n += 1.0; }
  }
  if (n > 0.0) v = mix(v, sum / n, 0.2);
  o = vec4(v, 0.0);
}`;

// Dye: r the cloud, g the gas warmth against the jug's mean.
const ADVECT_DYE = `${HEAD}
uniform sampler2D tVel, tDye;
uniform sampler3D uNoise;
uniform float uDt, uFill, uWall, uEvap, uCool, uJet;
void main() {
  ivec3 c = cellOf(gl_FragCoord.xy);
  if (!wet(c)) {
    // The glass holds the mean of its wet neighbours, so advection loses no cloud there.
    float sum = 0.0, n = 0.0;
    for (int k = 0; k < 6; k++) {
      ivec3 e = ivec3(k == 0 ? 1 : k == 1 ? -1 : 0, k == 2 ? 1 : k == 3 ? -1 : 0, k == 4 ? 1 : k == 5 ? -1 : 0);
      if (wet(c + e)) { sum += F(tDye, c + e).r; n += 1.0; }
    }
    o = vec4(n > 0.0 ? sum / n : 0.0, uWall, 0.0, 0.0);
    return;
  }
  vec3 pc = vec3(c) + 0.5, P = BMIN + pc * CELL;
  vec4 d = S(tDye, pc - F(tVel, c).xyz * uDt / CELL);
  float fog = d.r, heat = d.g;
  // The glass warms or cools the gas beside it.
  heat += (uWall - heat) * F(tMask, c).g * min(uDt * 3.0, 1.0);
  heat *= max(1.0 - uCool * uDt, 0.0);
  // Warm gas takes its droplets back up as vapour.
  fog *= max(1.0 - max(heat, 0.0) * uEvap * uDt, 0.0);
  // The squeeze's jet is clear air: it bores into the cloud and mixes in.
  float jet = uJet * smoothstep(0.012, 0.003, length(P.xz)) * smoothstep(TOP - 0.05, TOP - 0.02, P.y);
  fog *= 1.0 - min(jet * uDt * 30.0, 0.9);
  // A pop lights the nuclei: dense patches and thin gaps.
  if (uFill > 0.0) {
    float puff = texture(uNoise, P * 3.4).g;
    float big = texture(uNoise, P * 1.3 + vec3(0.3, 0.0, 0.0)).r;
    float b = clamp(puff * 0.8 + big * 0.6 - 0.35, 0.0, 1.0);
    fog = mix(fog, 0.04 + 2.2 * b * b, uFill);
    heat = mix(heat, 0.0, uFill);
  }
  o = vec4(fog, heat, 0.0, 0.0);
}`;

// Material coordinates: where the gas in each cell started, stored as an offset.
// Small offsets keep half floats precise; noise read there curls with the flow.
const ADVECT_UVW = `${HEAD}
uniform sampler2D tVel, tUvw;
uniform float uDt, uReset;
void main() {
  ivec3 c = cellOf(gl_FragCoord.xy);
  vec3 pc = vec3(c) + 0.5, P = BMIN + pc * CELL;
  if (uReset > 0.5 || !wet(c)) { o = vec4(0.0); return; }
  // A smoothed velocity: a one-cell ripple would crease the coordinates.
  vec3 v = 0.4 * F(tVel, c).xyz + 0.1 * (F(tVel, c + ivec3(1, 0, 0)).xyz + F(tVel, c - ivec3(1, 0, 0)).xyz
         + F(tVel, c + ivec3(0, 1, 0)).xyz + F(tVel, c - ivec3(0, 1, 0)).xyz
         + F(tVel, c + ivec3(0, 0, 1)).xyz + F(tVel, c - ivec3(0, 0, 1)).xyz);
  o = vec4(S(tUvw, pc - v * uDt / CELL).xyz - v * uDt, 0.0);
}`;
// Each coordinate field resets once a period, half a period apart.
const PERIOD = 1.6;

/** The fluid's programs, for one linked() call with the scene's. */
export function fluidPrograms(gl) {
  return {
    fMask: program(gl, TRI_VS, MASK),
    fCurl: program(gl, TRI_VS, CURL),
    fVel: program(gl, TRI_VS, ADVECT_VEL),
    fDiv: program(gl, TRI_VS, DIVERGE),
    fJac: program(gl, TRI_VS, JACOBI_FS),
    fProj: program(gl, TRI_VS, PROJECT),
    fDye: program(gl, TRI_VS, ADVECT_DYE),
    fUvw: program(gl, TRI_VS, ADVECT_UVW),
  };
}

/**
 * The fluid on linked programs.
 * step() takes one time step; dye() and vel() are the current atlases.
 */
export function makeFluid(gl, P, empty, noise) {
  const grid = () => target(gl, AW, AH, { clear: true });
  const mask = target(gl, AW, AH, { filter: gl.NEAREST, clear: true });
  const vel = [grid(), grid()], dye = [grid(), grid()], pr = [grid(), grid()], div = grid(), curl = grid();
  const uvA = [grid(), grid()], uvB = [grid(), grid()];
  // The sim clock for the coordinate resets; -1 resets both on the first step.
  let simT = 0, lastA = -1, lastB = -1;
  const swap = a => { const t = a[0]; a[0] = a[1]; a[1] = t; };
  const set = (p, name, v) => { if (p.u[name] != null) gl.uniform1f(p.u[name], v); };
  const use = (p, open) => {
    gl.useProgram(p.p);
    bind(gl, p, 'tMask', 7, mask);
    set(p, 'uOpen', open ? 1 : 0);
  };

  gl.useProgram(P.fMask.p);
  tri(gl, mask, empty);

  // s: dt, t, open, buoy, turb, jet, expand, fill, wall.
  function step(s) {
    const dt = s.dt;
    if (dt <= 0 && !(s.fill > 0)) return;
    gl.disable(gl.BLEND);
    if (dt > 0) {
      let p = P.fCurl;
      use(p, s.open);
      bind(gl, p, 'tVel', 0, vel[0]);
      tri(gl, curl, empty);

      p = P.fVel;
      use(p, s.open);
      bind(gl, p, 'tVel', 0, vel[0]);
      bind(gl, p, 'tDye', 1, dye[0]);
      bind(gl, p, 'tCurl', 2, curl);
      set(p, 'uDt', dt); set(p, 'uTime', s.t);
      set(p, 'uBuoy', 0.09); set(p, 'uWeight', 0.0015);
      set(p, 'uTurb', s.turb); set(p, 'uTurbF', 16);
      set(p, 'uVort', 1.0); set(p, 'uDamp', 0.12);
      set(p, 'uJet', s.jet);
      tri(gl, vel[1], empty);
      swap(vel);

      p = P.fDiv;
      use(p, s.open);
      bind(gl, p, 'tVel', 0, vel[0]);
      set(p, 'uExpand', s.expand);
      tri(gl, div, empty);

      p = P.fJac;
      use(p, s.open);
      bind(gl, p, 'tDiv', 1, div);
      for (let i = 0; i < JACOBI; i++) {
        bind(gl, p, 'tP', 0, pr[0]);
        tri(gl, pr[1], empty);
        swap(pr);
      }

      p = P.fProj;
      use(p, s.open);
      bind(gl, p, 'tP', 0, pr[0]);
      bind(gl, p, 'tVel', 1, vel[0]);
      tri(gl, vel[1], empty);
      swap(vel);

      simT += dt;
      const a = Math.floor(simT / PERIOD), b = Math.floor(simT / PERIOD + 0.5);
      p = P.fUvw;
      use(p, s.open);
      bind(gl, p, 'tVel', 0, vel[0]);
      set(p, 'uDt', dt);
      for (const [f, reset] of [[uvA, a !== lastA], [uvB, b !== lastB]]) {
        bind(gl, p, 'tUvw', 1, f[0]);
        set(p, 'uReset', reset ? 1 : 0);
        tri(gl, f[1], empty);
        swap(f);
      }
      lastA = a; lastB = b;
    }
    const p = P.fDye;
    use(p, s.open);
    bind(gl, p, 'tVel', 0, vel[0]);
    bind(gl, p, 'tDye', 1, dye[0]);
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_3D, noise);
    gl.uniform1i(p.u.uNoise, 2);
    set(p, 'uDt', Math.max(dt, 0));
    set(p, 'uFill', s.fill || 0);
    set(p, 'uWall', s.wall);
    set(p, 'uEvap', 0.05);
    set(p, 'uCool', 0.35);
    set(p, 'uJet', s.jet);
    tri(gl, dye[1], empty);
    gl.bindTexture(gl.TEXTURE_3D, null);
    swap(dye);
  }

  return {
    step,
    dye: () => dye[0],
    vel: () => vel[0],
    uvA: () => uvA[0],
    uvB: () => uvB[0],
    // The weight of field A: zero when it resets, one when B resets.
    wA: () => 1 - Math.abs(2 * ((simT / PERIOD) % 1) - 1),
    // QA: reads one atlas back as floats.
    read(which = 'dye') {
      const t = (which === 'vel' ? vel : dye)[0];
      gl.bindFramebuffer(gl.FRAMEBUFFER, t.fb);
      const out = new Float32Array(AW * AH * 4);
      gl.readPixels(0, 0, AW, AH, gl.RGBA, gl.FLOAT, out);
      return { out, AW, AH, NX, NY, NZ, TC };
    },
    free() { [mask, div, curl, ...vel, ...dye, ...pr, ...uvA, ...uvB].forEach(t => free(gl, t)); },
  };
}
