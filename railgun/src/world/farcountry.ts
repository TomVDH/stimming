// @ts-nocheck
// Load order: world/ground runs first.
import './ground.ts';
import * as THREE from 'three';
import { RANGE_MAX, rangeRg, rangeRa, landValues, RANGE_GLSL, RANGE_CEIL, LAND_KEYS } from '../../ranges.js';
import { linFit } from '../../../shared/stim.js';
import { state } from '../state.ts';
import { FAR_MODE, camera, canvas, rad, renderer, scene, v3 } from '../setup.ts';
import { U } from './uniforms.ts';
import { HEAD } from '../sky/atmosphere.ts';
import { AIR } from '../sky/air.ts';
import { BAND } from '../clouds/bands.ts';
import { GROUND_C, PLANET_R } from './ground.ts';
import { sight } from '../view/camera.ts';

/* ---------- far country: crescent ranges on a curved planet, raymarched ---------- */
// Angles turn left from negative z, about the landscape eye.
export const polar = (th, d) => v3(1670 - Math.sin(th) * d, 0, 1990 - Math.cos(th) * d);
// RANGES and the height GLSL live in ranges.js.
export const FAR_U = {
  // Centre x, z, arc radius, crest; then the arc's start, span and phase, in radians.
  // Both arrays fill all RANGE_MAX slots; an empty slot has no crest.
  uRg: { value: Array.from({ length: RANGE_MAX }, (_, i) => new THREE.Vector4(...(rangeRg()[i] || [0, 0, 0, 0]))) },
  uRa: { value: Array.from({ length: RANGE_MAX }, (_, i) => new THREE.Vector4(...(rangeRa()[i] || [0, 0, 0, 0]))) },
  // The landscape's knobs, from ranges.js.
  uLand: { value: landValues() },
  // Forms: 0 draws every range as a crescent and hides the cone.
  uForms: { value: 1 },
  uInvVP: { value: new THREE.Matrix4() }, uVP: { value: new THREE.Matrix4() },
  // March steps: High takes more, the ladder's rungs fewer.
  uFarSteps: { value: 96 },
  uFarStride: { value: new THREE.Vector2(0.0015, 0.005) },
  // Erosion: the depth of the gullies and crags; 0 leaves the smooth ranges.
  uEro: { value: 1 },
  // Face bump: fine gullies and strata in the light only; 0 turns it off.
  uBump: { value: 1 },
  uRockC: { value: new THREE.Vector3() }, uSlopeC: { value: new THREE.Vector3() }, uGroundC: { value: new THREE.Vector3(...GROUND_C) },
  // The ranges' light: sun and key, sky, and the effects (blast, rock light).
  // The sun stays low by default, so the ranges read far and vast.
  uRangeL: { value: new THREE.Vector3(0.6, 0.85, 1) },
};
// The ranges' rock: [slope, wall] in OKLCH; each differs from the sand plain.
const ROCK_COLS = {
  umber: [[0.43, 0.035, 48], [0.37, 0.045, 32]],
  slate: [[0.42, 0.02, 250], [0.35, 0.025, 265]],
  rust: [[0.44, 0.06, 40], [0.39, 0.08, 24]],
};
export function setRockCol(k) {
  const c = ROCK_COLS[k] || ROCK_COLS.umber;
  FAR_U.uSlopeC.value.set(...linFit(...c[0]));
  FAR_U.uRockC.value.set(...linFit(...c[1]));
}
setRockCol('umber');
const FAR_GLSL = RANGE_GLSL;
// The far pass's parts: the march, the normal, the shadow and the light.
// The live pass and the bake share them, so both draw the same country.
// The height grid: a fine and a coarse level about the landscape eye.
// It rebuilds only when the ranges' shape changes.
export const farGrid = { n: 256, half: 330000, key: '', builds: 0 };
farGrid.f = new THREE.WebGLRenderTarget(farGrid.n, farGrid.n, { type: THREE.HalfFloatType, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, depthBuffer: false });
farGrid.c = new THREE.WebGLRenderTarget(farGrid.n / 4, farGrid.n / 4, { type: THREE.HalfFloatType, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, depthBuffer: false });
export const GRID_U = {
  uGridF: { value: farGrid.f.texture }, uGridC: { value: farGrid.c.texture },
  uGrid: { value: new THREE.Vector4(1670 - farGrid.half, 1990 - farGrid.half, 2 * farGrid.half / farGrid.n, farGrid.n) },
  uGridOn: { value: 1 },
};
const FAR_FN = /* glsl */`
  uniform mat4 uInvVP, uVP;
  uniform int uFarSteps;
  // The stride's floor and cap near a range, as shares of the range.
  uniform vec2 uFarStride;
  uniform vec3 uRockC, uSlopeC, uGroundC, uEye, uRangeL;
  ${HEAD}
  ${AIR}
  ${FAR_GLSL}
  const float PLANET_R = ${PLANET_R.toFixed(1)};
  // The curved ground's drop at p, below the eye's level plane.
  float drop(vec3 p) { vec2 d = p.xz - uEye.xz; return dot(d, d) / (2.0 * PLANET_R); }
  // The height grid: the most each cell's ground can rise, in kilometres.
  // uGrid: the grid's corner x and z, the fine cell's size, the fine cell count.
  // The coarse grid's cells are four fine cells wide.
  uniform sampler2D uGridF, uGridC;
  uniform vec4 uGrid;
  uniform float uGridOn;
  // The bound in the cell under xz, or -1 off the grid.
  float gridMax(sampler2D t, vec2 xz, float c, float n) {
    vec2 g = (xz - uGrid.xy) / c;
    if (g.x < 0.0 || g.y < 0.0 || g.x >= n || g.y >= n) return -1.0;
    return texelFetch(t, ivec2(g), 0).r * 1000.0;
  }
  // The distance along the ray to the walls of the cell under p.
  float cellExit(vec3 p, vec3 rd, float c) {
    vec2 g = floor((p.xz - uGrid.xy) / c), wall = uGrid.xy + (g + step(0.0, rd.xz)) * c;
    vec2 r = vec2(abs(rd.x) < 1e-6 ? 1e-6 : rd.x, abs(rd.z) < 1e-6 ? 1e-6 : rd.z);
    vec2 tt = (wall - p.xz) / r;
    return min(tt.x, tt.y);
  }
  // A safe leap over empty air: to the cell's wall, or to where the ray could drop to the bound.
  // up is the rate the ray rises over the curved ground; it only grows along the ray.
  // 0 means no leap: the ray is not above the cell's bound.
  float leap(vec3 p, vec3 rd, float above, float up) {
    float c = uGrid.z, hc = gridMax(uGridC, p.xz, 4.0 * c, uGrid.w / 4.0);
    if (hc >= 0.0 && above > hc) return min(cellExit(p, rd, 4.0 * c), up < 0.0 ? (above - hc) / -up : 1e9);
    float hf = gridMax(uGridF, p.xz, c, uGrid.w);
    if (hf >= 0.0 && above > hf) return min(cellExit(p, rd, c), up < 0.0 ? (above - hf) / -up : 1e9);
    return 0.0;
  }
  // The view ray through clip point c of the inverse view-projection m.
  vec3 rayOf(mat4 m, vec2 c, vec3 ro) { vec4 w = m * vec4(c, 1.0, 1.0); return normalize(w.xyz / w.w - ro); }
  // The distance to the ranges along the ray, or -1 for a miss.
  float farMarch(vec3 ro, vec3 rd) {
    // The march starts past the near plain's heart and ends past the far ranges.
    float t = 25000.0, tp = t;
    for (int i = 0; i < 700; i++) {
      if (i >= uFarSteps) break;
      vec3 p = ro + rd * t;
      float nr, hh = farHN(p.xz, nr), dy = p.y - (hh - drop(p));
      if (dy < 0.0) {
        // The ray crossed the surface: halve the last step to find it.
        float a = tp, b = t;
        for (int k = 0; k < 7; k++) {
          float m = 0.5 * (a + b);
          vec3 q = ro + rd * m;
          if (q.y - (farH(q.xz) - drop(q)) < 0.0) b = m; else a = m;
        }
        return b;
      }
      // Rising past every crest on the curved ground: the ray leaves the country.
      // The ceiling sits above the tallest crest (RANGE_CEIL in ranges.js).
      if (p.y + drop(p) > ${RANGE_CEIL.toFixed(1)} && rd.y + t * dot(rd.xz, rd.xz) / PLANET_R > 0.0) break;
      tp = t;
      // Over a cell's highest ground the ray leaps to the cell's edge.
      if (uGridOn > 0.5) {
        float lp = leap(p, rd, p.y + drop(p), rd.y + t * dot(rd.xz, rd.xz) / PLANET_R);
        if (lp > 0.0) { t += lp + 2.0; if (t > 650000.0) break; continue; }
      }
      // Over open plain a stride of 3% keeps grazing rays inside the budget.
      // Near any range the stride shrinks, so no crest or horn is skipped.
      // In a band the stride stays short: 0.5% near the surface, 1% high above it.
      // A narrow summit can rise between two long strides.
      t += nr > 0.5 ? clamp(0.3 * dy, uFarStride.x * t, dy < 0.05 * t ? uFarStride.y * t : 0.01 * t) : max(0.45 * dy, 0.03 * t);
      if (t > 650000.0) break;
    }
    return -1.0;
  }
  // The surface normal at p; the step grows with the distance.
  vec3 farNormal(vec2 p, float hit) {
    float e = max(60.0, 0.002 * hit);
    return normalize(vec3(farH(p - vec2(e, 0.0)) - farH(p + vec2(e, 0.0)), 2.0 * e, farH(p - vec2(0.0, e)) - farH(p + vec2(0.0, e))));
  }
  // A short march toward the light: the crests shade the valleys.
  // Each pixel starts at its own offset, so the shadow never bands.
  float farShadow(vec3 P) {
    float sh = 1.0, sd = 300.0 * (1.0 + fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715)))));
    for (int j = 0; j < 9; j++) {
      vec3 q = P + uSun * sd;
      sh = min(sh, clamp(3.0 * (q.y - farH(q.xz)) / sd + 0.5, 0.0, 1.0));
      sd *= 1.7;
    }
    return sh;
  }
  // Cavity: 0 deep in a gully, 0.5 on a plain slope, 1 on a spur.
  // The ground's height against its mean in a small ring.
  float farCavity(vec2 p, float hit) {
    float r = max(500.0, 0.004 * hit), h = farH(p);
    float a = 0.25 * (farH(p + vec2(r, 0.0)) + farH(p - vec2(r, 0.0)) + farH(p + vec2(0.0, r)) + farH(p - vec2(0.0, r)));
    return clamp(0.5 + (h - a) / (0.5 * r), 0.0, 1.0);
  }
  // The lit colour of surface point p at range hit, ground height h0, in the air.
  // The face bump's detail: vertical flutes on steep faces, faint strata across them.
  float farDetail(vec3 P) {
    vec2 q = P.xz / 2500.0;
    q += 0.6 * vec2(k2noise(q * 0.3), k2noise(q * 0.3 + 7.7)) - 0.3;
    float st = k2noise(vec2(P.y / 260.0 + 2.0 * k2noise(q * 0.5), dot(P.xz, vec2(0.6, 0.8)) / 9000.0));
    return ridge2(q, 3) + 0.12 * st;
  }
  // As the card clouds do, the face's normal tilts with the detail's slope.
  // The taps run across the face and up it; only walls take the tilt.
  vec3 farBump(vec3 P, vec3 N, float hit, float wall) {
    // The bump fades out where one pixel spans a gully.
    float k = uBump * wall * (1.0 - smoothstep(250.0, 900.0, 0.0015 * hit));
    if (k < 0.01) return N;
    vec3 T = normalize(cross(vec3(0.0, 1.0, 0.0), N) + vec3(1e-4, 0.0, 0.0)), B = cross(N, T);
    float e = max(120.0, 0.0015 * hit), f0 = farDetail(P);
    float dT = (farDetail(P + T * e) - f0) / e, dB = (farDetail(P + B * e) - f0) / e;
    return normalize(N - 0.35 * k * 2500.0 * (dT * T + dB * B));
  }
  vec3 farShade(vec3 ro, vec3 rd, vec3 p, float hit, float h0, vec3 N, float sh, float cav) {
    // Shade on the flat world: the curve only moves the image.
    vec3 P = vec3(p.x, h0, p.z);
    float wall = smoothstep(0.92, 0.5, N.y);
    // Slopes are scree in the rock's colour; walls are bare rock, darker.
    vec3 alb = mix(uSlopeC, uRockC * (0.75 + 0.5 * ridged(P.xz / 2500.0)), wall);
    // Only the foot of a range blends into the sand plain.
    alb = mix(uGroundC * 0.95, alb, smoothstep(20.0, 300.0, h0));
    // Gullies hold dark scree and shade; spurs catch the light.
    alb *= 0.25 + 1.5 * cav;
    N = farBump(P, N, hit, wall);
    float nl = max(dot(N, uSun), 0.0), wr = max(dot(N, uSun) * 0.5 + 0.5, 0.0);
    vec3 col = alb * (uRangeL.y * ambient(N) * (0.55 + 0.45 * N.y) + uRangeL.x * (uSunC * (1.5 * nl * sh + 0.12 * wr) + keyLight(N)));
    // The blast lights the faces turned to it, faintly at this range.
    col += uRangeL.z * alb * blastLight(P) * 2.5 * (0.25 + 0.75 * max(dot(N, normalize(uBlast.xyz - P)), 0.0));
    // The nearing rock warms the faces turned to it.
    col += uRangeL.z * alb * uAstC * uFill * 0.18 * (0.3 + 0.7 * max(dot(N, normalize(uRockL.xyz - P)), 0.0));
    // Aerial perspective: the shared air, along the ray to the hit.
    col = aerialFrom(col, ro, ro + rd * hit + vec3(0.0, P.y - (ro + rd * hit).y, 0.0));
    vec3 inL = k2skyB(normalize(vec3(rd.x, 0.02, rd.z)), 0.0) * 0.95;
    // Fog pools in the far valleys: low ground goes pale, the crests stand clear.
    // Each range then stands apart from the one behind it.
    float vf = uLayer.y * smoothstep(30000.0, 120000.0, hit) * exp(-h0 / 1600.0);
    col = mix(col, inL * 1.05, min(0.85 * vf, 1.0));
    // The very foot of a range melts into the plain's own haze at the horizon.
    // So no dark seam shows where the ranges meet the sand.
    return mix(col, k2hazeColor(rd), 0.85 * exp(-h0 / 350.0) * smoothstep(30000.0, 90000.0, hit));
  }
  // The depth of world point p, for the near world to test against.
  float farDepth(vec3 p) { vec4 cp = uVP * vec4(p, 1.0); return clamp(cp.z / cp.w * 0.5 + 0.5, 0.0, 1.0); }`;
const FAR_VS = /* glsl */`varying vec2 vN; void main() { vN = position.xy; gl_Position = vec4(position.xy, 1.0, 1.0); }`;
// The live pass marches every pixel, every frame.
const farLive = new THREE.ShaderMaterial({
  uniforms: { ...U, ...FAR_U, ...GRID_U, uEye: { value: new THREE.Vector3() } },
  depthWrite: true, depthTest: true,
  vertexShader: FAR_VS,
  fragmentShader: /* glsl */`
  varying vec2 vN;
  ${FAR_FN}
  void main() {
    vec3 ro = uEye, rd = rayOf(uInvVP, vN, ro);
    float hit = farMarch(ro, rd);
    if (hit < 0.0) discard;
    vec3 p = ro + rd * hit;
    // Bare ground in reach of the near plain: the plain draws it.
    float h0 = farH(p.xz);
    if (h0 < 2.0 && length(p.xz - ro.xz) < 118000.0) discard;
    vec3 N = farNormal(p.xz, hit);
    gl_FragColor = vec4(farShade(ro, rd, p, hit, h0, N, farShadow(vec3(p.x, h0, p.z)), farCavity(p.xz, hit)), 1.0);
    gl_FragDepth = farDepth(p);
  }`,
});
// The bake: the eye is locked off, so the ranges' shape holds still on screen.
// One march fills a buffer a little wider than the view.
// Each frame then only lights that buffer; the shadows rebake when the sun moves.
// Two buffers: the pass reads the front one while the back one fills.
const fbBuf = () => ({
  g: new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, depthBuffer: false }),
  l: new THREE.WebGLRenderTarget(1, 1, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, depthBuffer: false }),
  // The window's rotation-only view-projection and its inverse; its lens and eye.
  vp: new THREE.Matrix4(), inv: new THREE.Matrix4(), q: new THREE.Quaternion(), eye: new THREE.Vector3(), tb: 1, M: 1, aspect: 0, ok: false,
});
export const farBake = {
  on: true,
  // The window's margin: the sight follows the gun, so its margin is wider.
  M: 1.15, Msight: 1.3,
  // The buffer's share of the screen's density.
  res: 1,
  bufs: [fbBuf(), fbBuf()], front: 0,
  // A bake in progress: its buffer and the next row to fill.
  job: null, rows: 8,
  sun: new THREE.Vector3(), dirty: true, bakes: 0, hard: 0, lights: 0,
};
// The bake passes' inputs: the buffer under construction.
const FB_U = { uPhase: { value: new THREE.Vector2(1, 0) }, uRefInv: { value: new THREE.Matrix4() }, uBakeSize: { value: new THREE.Vector2(1, 1) }, uFarG: { value: null }, uBakeEye: { value: new THREE.Vector3() } };
// The baked pass's inputs: the front buffer.
export const FS_U = { uRefVP: { value: new THREE.Matrix4() }, uBakeSize: { value: new THREE.Vector2(1, 1) }, uFarG: { value: null }, uFarL: { value: null } };
// The geometry bake: range and normal per texel.
// The range splits in two halves, so the half floats keep a quarter metre.
export const farBakeG = new THREE.ShaderMaterial({
  uniforms: { ...U, ...FAR_U, ...FB_U, ...GRID_U, uFarSteps: { value: 640 }, uFarStride: { value: new THREE.Vector2(0.0005, 0.003) }, uEye: FB_U.uBakeEye },
  depthWrite: false, depthTest: false,
  vertexShader: FAR_VS,
  fragmentShader: /* glsl */`
  varying vec2 vN;
  uniform mat4 uRefInv;
  // The pass: x passes in all, this one is y.
  // It fills bands of 8 rows, every x-th band: the GPU shades rows in blocks.
  uniform vec2 uPhase;
  ${FAR_FN}
  void main() {
    if (mod(floor(gl_FragCoord.y / 8.0), uPhase.x) != uPhase.y) discard;
    vec3 ro = uEye, rd = rayOf(uRefInv, vN, vec3(0.0));
    float hit = farMarch(ro, rd);
    vec3 p = ro + rd * hit;
    float h0 = farH(p.xz);
    // A miss, or bare ground the near plain draws, marks the texel empty.
    if (hit < 0.0 || (h0 < 2.0 && length(p.xz - ro.xz) < 118000.0)) { gl_FragColor = vec4(-1.0, 0.0, 0.0, 0.0); return; }
    vec3 N = farNormal(p.xz, hit);
    float q = hit / 512.0;
    gl_FragColor = vec4(floor(q), fract(q), N.x, N.z);
  }`,
});
// The light bake: the sun's shadow and the cavity per texel, from the geometry bake.
export const farBakeL = new THREE.ShaderMaterial({
  uniforms: { ...U, ...FAR_U, ...FB_U, uEye: FB_U.uBakeEye },
  depthWrite: false, depthTest: false,
  vertexShader: FAR_VS,
  fragmentShader: /* glsl */`
  varying vec2 vN;
  uniform mat4 uRefInv;
  uniform sampler2D uFarG;
  ${FAR_FN}
  void main() {
    vec4 g = texelFetch(uFarG, ivec2(gl_FragCoord.xy), 0);
    if (g.x < 0.0) { gl_FragColor = vec4(1.0); return; }
    float hit = (g.x + g.y) * 512.0;
    vec3 p = uEye + rayOf(uRefInv, vN, vec3(0.0)) * hit;
    gl_FragColor = vec4(farShadow(vec3(p.x, farH(p.xz), p.z)), farCavity(p.xz, hit), 0.0, 1.0);
  }`,
});
// The baked pass: each pixel reads the four nearest texels and lights them.
// Texels on the nearest surface weigh most, so a crest stays crisp on the range behind it.
export const farBaked = new THREE.ShaderMaterial({
  uniforms: { ...U, ...FAR_U, ...FS_U, uEye: farLive.uniforms.uEye, uA2C: { value: 1 } },
  depthWrite: true, depthTest: true, alphaToCoverage: true,
  vertexShader: FAR_VS,
  fragmentShader: /* glsl */`
  varying vec2 vN;
  uniform mat4 uRefVP;
  uniform vec2 uBakeSize;
  uniform sampler2D uFarG, uFarL;
  uniform float uA2C;
  ${FAR_FN}
  void main() {
    vec3 ro = uEye, rd = rayOf(uInvVP, vN, ro);
    vec4 c = uRefVP * vec4(rd, 1.0);
    if (c.w <= 0.0) discard;
    vec2 f = (c.xy / c.w * 0.5 + 0.5) * uBakeSize - 0.5, fr = fract(f);
    ivec2 i0 = ivec2(floor(f)), hi = ivec2(uBakeSize) - 1;
    vec4 g[4];
    float t[4], b[4], cov = 0.0, tmin = 1e9;
    for (int k = 0; k < 4; k++) {
      ivec2 o = ivec2(k & 1, k >> 1);
      g[k] = texelFetch(uFarG, clamp(i0 + o, ivec2(0), hi), 0);
      t[k] = (g[k].x + g[k].y) * 512.0;
      b[k] = g[k].x < 0.0 ? 0.0 : (o.x == 1 ? fr.x : 1.0 - fr.x) * (o.y == 1 ? fr.y : 1.0 - fr.y);
      cov += b[k];
      if (g[k].x >= 0.0) tmin = min(tmin, t[k]);
    }
    // Without multisampling, a pixel shows only past half cover.
    if (cov < (uA2C > 0.5 ? 0.02 : 0.5)) discard;
    float W = 0.0, T = 0.0, sh = 0.0, cav = 0.0;
    vec3 N = vec3(0.0);
    for (int k = 0; k < 4; k++) {
      float w = b[k] * exp(-abs(t[k] - tmin) / (0.01 * tmin)) + 1e-6 * step(0.0, g[k].x) * step(t[k], tmin);
      W += w; T += w * t[k];
      N += w * vec3(g[k].z, sqrt(max(1.0 - g[k].z * g[k].z - g[k].w * g[k].w, 0.0)), g[k].w);
      vec2 L = texelFetch(uFarL, clamp(i0 + ivec2(k & 1, k >> 1), ivec2(0), hi), 0).rg;
      sh += w * L.x; cav += w * L.y;
    }
    T /= W; sh /= W; cav /= W; N = normalize(N);
    vec3 p = ro + rd * T;
    gl_FragColor = vec4(farShade(ro, rd, p, T, p.y + drop(p), N, sh, cav), uA2C > 0.5 ? smoothstep(0.0, 1.0, cov) : 1.0);
    gl_FragDepth = farDepth(p);
  }`,
});
export const farPass = new THREE.Mesh(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3)), farBaked);
farPass.frustumCulled = false;
// After the sky dome, before everything nearer.
farPass.renderOrder = BAND.country;
farPass.onBeforeRender = (r, sc, cam) => { const u = FAR_U; u.uVP.value.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse); u.uInvVP.value.copy(u.uVP.value).invert(); farLive.uniforms.uEye.value.copy(cam.position); };
scene.add(farPass);
// The bake's own quad and scene; the vertex shader ignores the camera.
export const fbScene = new THREE.Scene(), fbQuad = new THREE.Mesh(farPass.geometry, farBakeG), fbCam = new THREE.OrthographicCamera();
fbQuad.frustumCulled = false;
fbScene.add(fbQuad);
const fbD = new THREE.Vector3(), fbF = new THREE.Vector3(), fbR = new THREE.Matrix4();
// The grid's fine pass: the highest of 7 x 7 samples over each cell and half a cell round it.
// A margin covers the peaks between the samples.
export const farGridF = new THREE.ShaderMaterial({
  uniforms: { ...U, ...FAR_U, ...GRID_U, uEye: { value: new THREE.Vector3() } },
  depthWrite: false, depthTest: false,
  vertexShader: FAR_VS,
  fragmentShader: /* glsl */`
  varying vec2 vN;
  ${FAR_FN}
  void main() {
    vec2 lo = uGrid.xy + floor(gl_FragCoord.xy) * uGrid.z;
    float m = 0.0;
    for (int j = 0; j < 7; j++) for (int i = 0; i < 7; i++) m = max(m, farH(lo + (vec2(i, j) / 3.0 - 0.5) * uGrid.z));
    gl_FragColor = vec4(m < 1.0 ? 0.0 : (m * 1.06 + 400.0) / 1000.0, 0.0, 0.0, 1.0);
  }`,
});
// The grid's coarse pass: the highest of each 4 x 4 block of fine cells.
export const farGridC = new THREE.ShaderMaterial({
  uniforms: { uGridF: GRID_U.uGridF },
  depthWrite: false, depthTest: false,
  vertexShader: FAR_VS,
  fragmentShader: /* glsl */`
  uniform sampler2D uGridF;
  void main() {
    ivec2 b = ivec2(gl_FragCoord.xy) * 4;
    float m = 0.0;
    for (int j = 0; j < 4; j++) for (int i = 0; i < 4; i++) m = max(m, texelFetch(uGridF, b + ivec2(i, j), 0).r);
    gl_FragColor = vec4(m, 0.0, 0.0, 1.0);
  }`,
});
// Rebuild the grid when the ranges' shape uniforms change; a new grid needs a new bake.
export function farGridUpdate() {
  const u = FAR_U, key = [u.uRg.value.map(v => v.toArray()), u.uRa.value.map(v => v.toArray()), Array.from(u.uLand.value), u.uEro.value, u.uForms.value].join();
  if (key === farGrid.key) return false;
  farGrid.key = key; farGrid.builds++;
  // The grid reaches past every range's band: centre, plus 1.42 radii at the current width, plus 15 km.
  const wk = u.uLand.value[LAND_KEYS.indexOf('width')] ?? 1;
  farGrid.half = u.uRg.value.reduce((m, g) => (g.w > 0 ? Math.max(m, Math.hypot(g.x - 1670, g.y - 1990) + 1.42 * g.z * wk + 15000) : m), 200000);
  GRID_U.uGrid.value.set(1670 - farGrid.half, 1990 - farGrid.half, 2 * farGrid.half / farGrid.n, farGrid.n);
  const rt = renderer.getRenderTarget();
  fbQuad.material = farGridF;
  renderer.setRenderTarget(farGrid.f);
  renderer.render(fbScene, fbCam);
  fbQuad.material = farGridC;
  renderer.setRenderTarget(farGrid.c);
  renderer.render(fbScene, fbCam);
  renderer.setRenderTarget(rt);
  farBake.dirty = true;
  return true;
}
// Pick the live march or the bake.
export function setFarMode(on) {
  farBake.on = on && renderer.extensions.has('EXT_color_buffer_float');
  farPass.material = farBake.on ? farBaked : farLive;
  farBake.dirty = true;
}
// How far the view sits from buffer f's window: 1 is at its edge.
// The eye's drift and the lens's zoom count too.
function fbReach(f, c, building) {
  if ((!f.ok && !building) || c.aspect !== f.aspect) return 9;
  const tn = Math.tan(rad(c.fov / 2));
  let r = Math.max(c.position.distanceTo(f.eye) / 25, f.tb / (tn * f.M * 1.15));
  fbF.set(0, 0, -1).applyQuaternion(f.q);
  for (let k = 0; k < 4; k++) {
    fbD.set(k & 1 ? 1 : -1, k & 2 ? 1 : -1, 1).unproject(c).sub(c.position).normalize();
    if (fbD.dot(fbF) <= 0) return 9;
    fbD.applyMatrix4(f.vp);
    r = Math.max(r, Math.abs(fbD.x), Math.abs(fbD.y));
  }
  return r;
}
// Start a bake of the back buffer around the view as it is now.
// k scales the buffer: a quick bake runs at a quarter of the size.
export function fbStart(c, k = 1) {
  const B = farBake, f = B.bufs[1 - B.front], M = sight ? B.Msight : B.M;
  f.ok = false; f.aspect = c.aspect; f.M = M;
  f.eye.copy(c.position); f.q.copy(c.quaternion);
  f.tb = Math.tan(rad(c.fov / 2)) * M;
  const cam = new THREE.PerspectiveCamera(THREE.MathUtils.radToDeg(2 * Math.atan(f.tb)), c.aspect, 1, 10);
  f.vp.multiplyMatrices(cam.projectionMatrix, fbR.makeRotationFromQuaternion(c.quaternion).invert());
  f.inv.copy(f.vp).invert();
  const w = Math.max(1, Math.round(canvas.width * M * B.res * k)), h = Math.max(1, Math.round(canvas.height * M * B.res * k));
  f.g.setSize(w, h); f.l.setSize(w, h);
  B.job = { f, pass: 0, lit: false, h, w };
}
// One step of the job: a pass over every B.rows-th band of rows, so each pass costs about the same.
// After the last pass, one frame lights the buffer; then it turns front.
// all runs the whole job at once.
export function fbStep(all = false) {
  const B = farBake, j = B.job, f = j.f, n = all ? 1 : B.rows;
  if (j.pass < n) {
    FB_U.uRefInv.value.copy(f.inv); FB_U.uBakeSize.value.set(j.w, j.h); FB_U.uBakeEye.value.copy(f.eye); FB_U.uFarG.value = f.g.texture;
    FB_U.uPhase.value.set(n, j.pass);
    fbQuad.material = farBakeG;
    renderer.setRenderTarget(f.g);
    // Only the first pass clears: the later passes add their bands to it.
    const ac = renderer.autoClear;
    renderer.autoClear = j.pass === 0;
    renderer.render(fbScene, fbCam);
    renderer.autoClear = ac;
    j.pass = all ? n : j.pass + 1;
    if (!all) return;
  }
  fbLight(f);
  f.ok = true; B.job = null; B.bakes++;
  B.front = B.bufs.indexOf(f);
  FS_U.uRefVP.value.copy(f.vp); FS_U.uBakeSize.value.set(j.w, j.h); FS_U.uFarG.value = f.g.texture; FS_U.uFarL.value = f.l.texture;
}
// Light buffer f: the sun's shadow per texel.
function fbLight(f) {
  const B = farBake;
  FB_U.uRefInv.value.copy(f.inv); FB_U.uBakeSize.value.set(f.g.width, f.g.height); FB_U.uBakeEye.value.copy(f.eye); FB_U.uFarG.value = f.g.texture;
  B.sun.copy(U.uSun.value); B.lights++;
  fbQuad.material = farBakeL;
  renderer.setRenderTarget(f.l);
  renderer.render(fbScene, fbCam);
}
// Each frame: past the window's edge, bake at once.
// Near the edge, bake the back buffer one row pass a frame, then swap.
// A tenth of a degree of sun moves the shadows: relight.
function farBakeRun() {
  const B = farBake, c = camera;
  farGridUpdate();
  if (!B.on) return;
  const rt = renderer.getRenderTarget(), f = B.bufs[B.front];
  const r = B.dirty ? 9 : fbReach(f, c);
  if (r > 1 || (B.job && fbReach(B.job.f, c, true) > 1)) {
    // A quarter-size bake shows at once, at a sixteenth of the cost.
    // The full bake then fills over the next frames and swaps in.
    B.dirty = false; B.hard++;
    fbStart(c, 0.25);
    fbStep(true);
    fbStart(c);
  } else {
    if (!B.job && r > 0.94) fbStart(c);
    if (B.job) fbStep();
    else if (B.sun.dot(U.uSun.value) < 0.9999985) fbLight(f);
  }
  renderer.setRenderTarget(rt);
}
state.farBakeUpdate = farBakeRun;
setFarMode(FAR_MODE === 'bake');
