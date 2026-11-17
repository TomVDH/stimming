// Load order: fx/volfx runs first.
import '../fx/volfx.ts';
import * as THREE from 'three';
import { linFit, reduced } from '../../../shared/stim.js';
import { state } from '../state.ts';
import { clamp, rnd, scene } from '../setup.ts';
import { U } from '../world/uniforms.ts';
import { HEAD } from '../sky/atmosphere.ts';
import { BAND } from '../clouds/bands.ts';
import { BRAKE_PORTS } from './gun.ts';
import { volRT } from '../fx/volnoise.ts';
import { chaos, charge, rage } from '../play/charge.ts';
import { makeFlare } from '../fx/flares.ts';
import { makeGlint } from '../fx/glints.ts';
import { dustSteps, makeVol, volLSteps, volSteps } from '../fx/volfx.ts';
import { bq } from '../play/shot.ts';

/* ---------- the muzzle: a plume, side jets, a spiked flare, a shell ---------- */
// The plume: white-blue fire for a fifth of a second, then grey smoke.
// uPl: age, power, jet length, fire strength.
export const plume = makeVol(/* glsl */`
uniform vec3 uMz, uMx, uDrift, uHotC, uSmokeC;
uniform vec4 uPl;
float dens(vec3 p, out vec3 em) {
  em = vec3(0.0);
  vec3 q = p - uMz - uDrift;
  float x = dot(q, uMx), age = uPl.x;
  float rr = length(q - uMx * x);
  float R = 16.0 + 0.18 * max(x, 0.0) + 75.0 * sqrt(age);
  // A soft rim: coverage thins toward the edge.
  float cov = pow(smoothstep(1.0, 0.0, rr / R), 1.5) * smoothstep(-30.0 - 0.5 * R, 10.0, x) * smoothstep(uPl.z * 1.25, uPl.z * 0.3, x);
  if (cov < 0.002) return 0.0;
  vec3 w = q * 0.006 + vec3(age * 0.04, 0.0, -age * 0.03);
  float d = clamp((texture(uVol, w).r - (1.0 - cov)) * 2.0, 0.0, 1.0);
  // Fine cells carve the rim into small lobes.
  if (d > 0.0) d = clamp((d - (1.0 - texture(uVol, w * 3.1).g) * 0.4) * 1.7, 0.0, 1.0);
  em = uHotC * uPl.w * d * exp(-rr / (0.35 * R)) * 0.1;
  // The fire burns out in a second; no smoke hangs at the muzzle.
  return d * 0.05 * (1.0 - smoothstep(0.3, 1.0, age));
}
vec3 alb(vec3 p) { return uSmokeC; }
// The blast's light reaches into the smoke.
vec3 vlight(vec3 p) { vec3 m = uMuzL.xyz - p; return vec3(0.75, 0.85, 1.0) * uMuzL.w * 6.0e4 / (dot(m, m) + 6.0e4) + blastLight(p); }`, {
  uMz: { value: new THREE.Vector3() }, uMx: { value: new THREE.Vector3(0, 0, -1) }, uDrift: { value: new THREE.Vector3() }, uPl: { value: new THREE.Vector4() },
  uHotC: { value: new THREE.Vector3(...linFit(0.95, 0.05, 230)) }, uSmokeC: { value: new THREE.Vector3(...linFit(0.74, 0.012, 70)) },
});
// The spike: a hot core, four rays and a level streak.
export const spike = makeFlare(linFit(0.95, 0.05, 230), /* glsl */`
      float d = length(vUv), x = abs(vUv.x), y = abs(vUv.y);
      // Anamorphic: a hot core and a long level streak, no cross.
      float a = (exp(-y * 120.0 - x * 0.9) + 0.35 * exp(-y * 30.0 - x * 2.2) + exp(-d * d * 30.0)) * (1.0 - smoothstep(0.8, 1.0, max(x, y)));`);
// Side jets blow out of the brake's ports, square to the barrel.
export const jets = Array.from({ length: BRAKE_PORTS.length * 2 }, () => makeGlint(linFit(0.92, 0.07, 230)));
// A shell: a thin skin of condensed air, lit by the sun and by uEm.
// glob draws the whole sphere: a veil, Worley patches and a lit side.
export function makeShell(sharp = 3.5, lo = 0.32, hi = 0.62, glob = false) {
  const m = new THREE.Mesh(new THREE.IcosahedronGeometry(1, glob ? 5 : 4), new THREE.ShaderMaterial({
  uniforms: { ...U, uC: { value: new THREE.Vector3() }, uR: { value: 1 }, uGain: { value: 0 }, uSeed: { value: rnd() * 60 }, uEm: { value: new THREE.Vector3() }, uSq: { value: new THREE.Vector4(0, 1, 0, 1) }, uVol: { value: volRT.texture } },
  transparent: true, depthWrite: false, side: glob ? THREE.DoubleSide : THREE.FrontSide,
  blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
  blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor,
  vertexShader: /* glsl */`uniform vec3 uC; uniform float uR; uniform vec4 uSq; varying vec3 vP, vN;
  void main() {
    // uSq squashes the shell along its axis; 1 keeps it round.
    vec3 p = position - uSq.xyz * dot(position, uSq.xyz) * (1.0 - uSq.w);
    vN = normalize(position + uSq.xyz * dot(position, uSq.xyz) * (1.0 / uSq.w - 1.0));
    vP = uC + p * uR;
    gl_Position = projectionMatrix * viewMatrix * vec4(vP, 1.0);
  }`,
  fragmentShader: glob ? /* glsl */`precision highp sampler3D; uniform sampler3D uVol;
  varying vec3 vP, vN; uniform float uGain, uSeed; uniform vec3 uEm; ${HEAD}
  void main() {
    vec3 V = normalize(cameraPosition - vP), N = normalize(vN);
    float f = 1.0 - abs(dot(N, V));
    // Condensation gathers in round Worley patches on the skin.
    float w = textureLod(uVol, N * 0.9 + vec3(uSeed * 0.013), 0.0).b;
    float w2 = textureLod(uVol, N * 2.3 + vec3(0.3, uSeed * 0.007, 0.6), 0.0).g;
    float cells = smoothstep(${lo.toFixed(2)}, ${hi.toFixed(2)}, 0.7 * w + 0.3 * w2);
    // The whole sphere shows faintly; its rim, seen edge on, thickens.
    float a = (0.18 + 1.6 * pow(max(f, 0.0), ${sharp.toFixed(1)})) * (0.3 + 0.7 * cells) * uGain;
    // The far side shows through the near side, dimmer.
    if (!gl_FrontFacing) a *= 0.45;
    // A soft terminator; the skin toward the sun glows through.
    float lit = smoothstep(-0.35, 0.7, dot(N, uSun));
    vec3 col = vec3(0.95) * (0.8 * ambient(N) + uSunC * (0.15 + 0.85 * lit)) + uSunC * 0.6 * pow(max(dot(-V, uSun), 0.0), 6.0) + uEm;
    gl_FragColor = vec4(k2haze(col, vP) * a, a);
  }` : /* glsl */`varying vec3 vP, vN; uniform float uGain, uSeed; uniform vec3 uEm; ${HEAD}
  void main() {
    vec3 V = normalize(cameraPosition - vP), N = normalize(vN);
    float f = 1.0 - abs(dot(N, V));
    // The skin shows at its rim and breaks up into patches.
    float n = k3fbm(N * 3.2 + uSeed);
    float a = pow(max(f, 0.0), ${sharp.toFixed(1)}) * smoothstep(${lo.toFixed(2)}, ${hi.toFixed(2)}, n) * uGain;
    vec3 col = vec3(0.95) * (ambient(N) + uSunC * (0.4 + 0.6 * max(dot(N, uSun), 0.0))) + uEm;
    gl_FragColor = vec4(k2haze(col, vP) * a, a);
  }`,
  }));
  m.frustumCulled = false; m.renderOrder = BAND.shell; m.visible = false;
  scene.add(m);
  return m;
}
export const shellMesh = makeShell();
// The muzzle skirt: a thin, nearly whole shock sphere.
export const muzzleSkirt = makeShell(10.0, -0.3, 0.35);
// The shock ring: a thin glowing torus square to the bore, broken by noise.
export const shockRing = new THREE.Mesh(new THREE.TorusGeometry(1, 0.035, 6, 160), new THREE.ShaderMaterial({
  uniforms: { ...U, uGain: { value: 0 }, uSeed: { value: 0 } },
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  vertexShader: /* glsl */`varying vec3 vP, vO; void main() { vO = position; vP = (modelMatrix * vec4(position, 1.0)).xyz; gl_Position = projectionMatrix * viewMatrix * vec4(vP, 1.0); }`,
  fragmentShader: /* glsl */`varying vec3 vP, vO; uniform float uGain, uSeed; ${HEAD}
  void main() {
    // The ring breaks into bright and faint arcs round its sweep.
    float a = atan(vO.y, vO.x), n = 0.45 + 0.55 * k2fbm(vec2(a * 3.0 + uSeed, uSeed * 0.3));
    gl_FragColor = vec4(k2haze(vec3(0.92, 0.96, 1.0) * uGain * n, vP), 1.0);
  }`,
}));
shockRing.frustumCulled = false; shockRing.renderOrder = BAND.shockRing; shockRing.visible = false;
scene.add(shockRing);
export const zAx = new THREE.Vector3(0, 0, 1);
// Air distortion: world place and radius of each shock, and the strength.
// strength is undefined until the first shot or blast sets it.
export type Warp = THREE.Vector4 & { strength?: number };
export const warpM = new THREE.Vector4() as Warp, warpH = new THREE.Vector4() as Warp;
// Charge dust: one raymarched volume round the plinth.
// The gun draws dust in, beats throw rings out, devils climb at rage.
// uDu: strength, spread in metres, height in metres, time.
// uDf: inflow in metres, devil strength, blow-out age (-1 off), blow-out power.
// uPu: each pulse's front radius, strength and height.
export const chargeDust = makeVol(/* glsl */`
#define VSHADE
uniform vec4 uDu, uDf;
uniform vec4 uPu[4];
uniform int uPn;
uniform vec2 uFw;
uniform vec3 uDustC;
float dens(vec3 p, out vec3 em) {
  em = vec3(0.0);
  if (p.y < 0.0) return 0.0;
  float r0 = length(p.xz);
  vec2 dir = p.xz / max(r0, 1.0);
  // The shot throws the ring outward, hardest ahead of the bore.
  float bo = uDf.z >= 0.0 ? uDf.w * (1.0 - exp(-uDf.z / 0.7)) * (0.45 + 0.55 * smoothstep(-0.3, 0.8, dot(dir, uFw))) : 0.0;
  float r = r0 - 420.0 * bo;
  // Cheap shape terms first; texture reads only where dust can be.
  float band = smoothstep(420.0, 520.0, r) * (1.0 - smoothstep(470.0 + 0.6 * uDu.y, 470.0 + uDu.y, r));
  // The inflow sheet reaches far out over the plain as the charge builds.
  float sheet = smoothstep(480.0, 600.0, r) * (1.0 - smoothstep(470.0 + 1.1 * uDu.y, 470.0 + 1.6 * uDu.y, r)) * exp(-p.y / 10.0);
  float cov = 0.0;
  // Each beat throws a low ring of dust outward.
  for (int i = 0; i < 4; i++) {
    if (i >= uPn) break;
    vec4 q = uPu[i];
    float x = (r0 - q.x) / (35.0 + 0.2 * (q.x - 420.0));
    cov += q.y * exp(-x * x) * exp(-p.y / q.z);
  }
  // At rage, dust devils climb off the ring and lean downwind.
  if (uDf.y > 0.01) {
    for (int i = 0; i < 4; i++) {
      float a = float(i) * 1.5708 + 0.6 + uDu.w * (mod(float(i), 2.0) < 0.5 ? 0.05 : -0.04);
      vec2 o = p.xz - vec2(cos(a), sin(a)) * (540.0 + 60.0 * float(i)) - vec2(0.18, 0.06) * p.y;
      float cr = 16.0 + 0.1 * p.y;
      cov = max(cov, smoothstep(cr, 0.25 * cr, length(o)) * (1.0 - smoothstep(0.0, 480.0 * uDf.y, p.y)) * 0.85 * uDf.y);
    }
  }
  if (band * uDu.x < 0.004 && sheet * uDu.x < 0.004 && cov < 0.004) return 0.0;
  // The pattern slides toward the mount: the gun pulls the dust in.
  float rs = r + uDf.x;
  float ang = atan(p.z, p.x);
  // A spiral: streaks curl tighter as they near the mount, and the whole field turns.
  float sw = ang + 0.9 * log(max(r, 120.0) / 470.0) - uDf.x * 0.0011;
  vec3 w = vec3(cos(sw) * rs, p.y * 1.8, sin(sw) * rs) * 0.004 - vec3(0.0, uDu.w * 0.04, 0.0);
  if (band > 0.0) {
    // A slow noise lifts some stretches higher, so the top is not a dome.
    float hn = texture(uVol, vec3(sw * 1.2732, 0.37, rs * 0.0015 + uDu.w * 0.01)).r;
    cov = max(cov, band * exp(-p.y / (uDu.z * (0.3 + 1.0 * hn))) * uDu.x);
  }
  // A low sheet streams in across the plain in radial streaks.
  if (sheet > 0.01) cov = max(cov, sheet * uDu.x * smoothstep(0.45, 0.8, texture(uVol, vec3(sw * 3.1831, p.y * 0.01, rs * 0.0012)).r) * 0.8);
  if (cov < 0.004) return 0.0;
  cov = min(cov, 1.0);
  float n = dustN(w);
  // Billows ride on a thin floor, so the ring never breaks.
  float d = clamp((n - (1.0 - cov)) * 2.2, 0.0, 1.0) * 0.8 + 0.3 * cov;
  // Fine cells carve soft wisps into it.
  d *= 0.7 + 0.3 * texture(uVol, w * 3.1).g;
  return d * 0.03;
}
// The sun's path through the dust: density times the layer's height, longer when the sun is low.
float vshade(vec3 p, float d) { return clamp(d * uDu.z * 0.8 / max(uSun.y, 0.15), 0.0, 4.0); }
vec3 alb(vec3 p) { return uDustC; }
// The arcs, the muzzle and the blast light the dust.
vec3 vlight(vec3 p) {
  vec3 a = uArcL.xyz - p, m = uMuzL.xyz - p;
  return vec3(0.7, 0.8, 1.0) * uArcL.w * 4.0e4 / (dot(a, a) + 4.0e4) + vec3(0.75, 0.85, 1.0) * uMuzL.w * 6.0e5 / (dot(m, m) + 6.0e5) + blastLight(p);
}`, {
  uDu: { value: new THREE.Vector4() }, uDf: { value: new THREE.Vector4(0, 0, -1, 0) }, uFw: { value: new THREE.Vector2(0, -1) },
  uPu: { value: Array.from({ length: 4 }, () => new THREE.Vector4()) }, uPn: { value: 0 },
  uDustC: { value: new THREE.Vector3(...linFit(0.66, 0.045, 65)) },
});
state.cdust = 0; state.dustShot = null;
// dIn: inflow so far. devil: devil strength. blow: the shot's blow-out.
let dIn = 0, beatT = 0, dustT = 0, pulseI = 0; state.devil = 0; state.blow = null;
export const pulses = Array.from({ length: 4 }, () => ({ t0: -1e9, k: 0 }));
// A beat throws one ring of dust out from the mount.
export function dustPulse(k: number) {
  if (reduced()) return;
  const q = pulses[pulseI++ % 4];
  q.t0 = state.simT; q.k = k;
}
export function updateChargeDust(dt: number) {
  // It builds with the chaos and settles over a few seconds.
  const want = charge ? chaos : 0;
  state.cdust += (want - state.cdust) * (1 - Math.exp(-dt / (want > state.cdust ? 1.0 : 3.0)));
  const st = clamp(state.simT - dustT, 0, 0.1);
  dustT = state.simT;
  // The draw speeds up with the charge.
  dIn += st * (20 + 110 * state.cdust + 140 * rage);
  const dw = charge ? rage : 0;
  state.devil += (dw - state.devil) * (1 - Math.exp(-st / (dw > state.devil ? 1.2 : 2.5)));
  // Beats come faster as the chaos grows.
  if (charge && chaos > 0.12) {
    beatT -= st;
    if (beatT <= 0) { dustPulse(0.3 + 0.6 * chaos); beatT = THREE.MathUtils.lerp(1.8, 0.4, chaos) * (0.7 + 0.6 * rnd()); }
  }
  const u = chargeDust.material.uniforms;
  let ph = 0, pn = 0;
  for (const q of pulses) {
    const a = state.simT - q.t0, k = a < 6 ? q.k * Math.exp(-a / 1.1) : 0;
    if (k < 0.01) continue;
    u.uPu.value[pn++].set(420 + 260 * a, k, 30 + 60 * a, 0);
    ph = Math.max(ph, 30 + 60 * a);
  }
  u.uPn.value = pn;
  if (state.blow && state.simT - state.blow.t0 > 10) state.blow = null;
  u.uDf.value.set(dIn, state.devil, state.blow ? state.simT - state.blow.t0 : -1, state.blow ? 0.4 * state.blow.k : 0);
  // A tighter, lower ring: the gun stays the subject.
  u.uDu.value.set(state.cdust, 120 + 380 * state.cdust, 18 + 60 * state.cdust + 50 * rage, state.simT);
  const sp = u.uDu.value.y;
  u.uC.value.set(0, 0, 0); u.uR.value = 470 + 1.6 * sp + (state.blow ? 420 : 0) + 40;
  // Fewer steps than shot dust: the ring is thick and soft.
  // More steps over a smaller ring: less grain at the same cost.
  u.uVSteps.value = Math.round(dustSteps() * 0.85);
  // The slab holds the march near the ground; devils and beats raise it.
  u.uLs.value = 10 + 0.12 * u.uDu.value.z; u.uSlab.value = Math.max(4.5 * u.uDu.value.z, 500 * state.devil + 40, 3 * ph);
  chargeDust.visible = !reduced() && (state.cdust > 0.02 || ph > 0 || state.devil > 0.02);
}
// Shot dust: the blast's skirt and the Mach wall, one raymarched volume.
// uBd: the muzzle foot (x, z), the age, the power.
// uFwd: the bore's heading on the plain.
export const shotDust = makeVol(/* glsl */`
uniform vec4 uBd;
uniform vec2 uFwd;
// Plain devils: place (x, z), birth age, strength.
uniform vec4 uDv[3];
uniform vec3 uDustC;
float dens(vec3 p, out vec3 em) {
  em = vec3(0.0);
  if (p.y < 0.0) return 0.0;
  vec2 q = p.xz - uBd.xy;
  float r = length(q), age = uBd.z, R = 340.0 * age, wd = 70.0 + 0.25 * R;
  // The wall rides the Mach front and thins as it spreads.
  float wall = exp(-pow((r - R) / wd, 2.0)) * exp(-R / 2600.0);
  // A pall hangs behind the front and settles.
  float pall = 0.55 * (1.0 - smoothstep(R - wd, R + 0.3 * wd, r)) * exp(-r / 900.0);
  // Wall and pall fan out in an arc ahead of the gun.
  float arc = 0.1 + 0.9 * smoothstep(-0.25, 0.65, dot(q, uFwd) / max(r, 1.0));
  wall *= arc; pall *= arc;
  // The skirt: the blast slams the plain under the muzzle.
  float skirt = exp(-pow(r / (220.0 + 160.0 * min(age, 3.0)), 2.0)) * exp(-age / 3.0);
  float hw = 30.0 + 70.0 * min(age, 4.0), hs = 60.0 + 110.0 * min(age, 4.0);
  float cov = (max(wall, pall) * exp(-p.y / hw) + skirt * exp(-p.y / hs)) * uBd.w;
  // Thin devils climb where the front passed, then die down.
  for (int i = 0; i < 3; i++) {
    float da = age - uDv[i].z;
    if (da < 0.0 || da > 10.0) continue;
    vec2 o = p.xz - uDv[i].xy - vec2(0.12, 0.05) * p.y;
    float cr = 14.0 + 0.09 * p.y;
    float life = smoothstep(0.0, 1.5, da) * (1.0 - smoothstep(6.0, 10.0, da));
    cov = max(cov, smoothstep(cr, 0.25 * cr, length(o)) * (1.0 - smoothstep(0.0, 320.0, p.y)) * life * uDv[i].w);
  }
  if (cov < 0.004) return 0.0;
  // The dust rolls outward and climbs.
  vec2 dir = q / max(r, 1.0);
  vec3 w = vec3(q.x, p.y * 1.5, q.y) * 0.0032 - vec3(dir.x, 0.8, dir.y) * age * 0.05;
  // A soft ramp, then wisps carved at the rim.
  float d = clamp((dustN(w) - (1.0 - min(cov, 1.0))) * 2.2, 0.0, 1.0);
  if (d > 0.0) d = clamp((d - (1.0 - texture(uVol, w * 3.1).g) * 0.45) * 1.6, 0.0, 1.0);
  return d * 0.04;
}
vec3 alb(vec3 p) { return uDustC; }
// The blast's light reaches the dust strongly; the moon lights it through Ls.
vec3 vlight(vec3 p) { vec3 m = uMuzL.xyz - p; return vec3(0.75, 0.85, 1.0) * uMuzL.w * 6.0e5 / (dot(m, m) + 6.0e5) + blastLight(p) * 2.5; }`, { uBd: { value: new THREE.Vector4() }, uFwd: { value: new THREE.Vector2(0, -1) }, uDv: { value: Array.from({ length: 3 }, () => new THREE.Vector4()) }, uDustC: { value: new THREE.Vector3(...linFit(0.46, 0.035, 60)) } });
// sa: seconds since the blast left the muzzle. c: power.
export function updateShotDust(sa: number, c: number, foot: THREE.Vector3) {
  const u = shotDust.material.uniforms, on = !reduced() && sa >= 0 && sa < 16;
  shotDust.visible = on;
  if (!on) return;
  // It fades over sixteen seconds.
  const k = Math.min(c, 1.25) * Math.exp(-sa / 6) * (1 - clamp((sa - 12) / 4, 0, 1));
  u.uBd.value.set(foot.x, foot.z, sa, k);
  const R = 340 * sa;
  u.uC.value.set(foot.x, 0, foot.z); u.uR.value = R + 140 + 0.5 * R;
  u.uSlab.value = 120 + 500 * Math.min(sa, 4); u.uLs.value = 12 + 20 * Math.min(sa, 4);
  u.uVSteps.value = dustSteps(); u.uLSteps.value = volLSteps();
}
// Case dust: a burst where the spent case lands. uCd: place, age.
export const caseDustV = makeVol(/* glsl */`
uniform vec4 uCd;
uniform vec3 uDustC;
float dens(vec3 p, out vec3 em) {
  em = vec3(0.0);
  if (p.y < 0.0) return 0.0;
  float age = uCd.w, sa = sqrt(age);
  vec3 q = p - uCd.xyz;
  float r = length(q.xz), R = 30.0 + 75.0 * sa, H = 10.0 + 40.0 * sa;
  float cov = exp(-pow(r / R, 2.0)) * exp(-p.y / H) * 1.6 * exp(-age / 3.5);
  if (cov < 0.004) return 0.0;
  vec2 dir = q.xz / max(r, 1.0);
  vec3 w = vec3(q.x, p.y * 1.4, q.z) * 0.012 - vec3(dir.x, 0.6, dir.y) * age * 0.08;
  // A soft ramp, then wisps carved at the rim.
  float d = clamp((dustN(w) - (1.0 - min(cov, 1.0))) * 2.2, 0.0, 1.0);
  if (d > 0.0) d = clamp((d - (1.0 - texture(uVol, w * 3.1).g) * 0.45) * 1.6, 0.0, 1.0);
  return d * 0.1;
}
vec3 alb(vec3 p) { return uDustC; }
vec3 vlight(vec3 p) { return blastLight(p); }`, { uCd: { value: new THREE.Vector4() }, uDustC: chargeDust.material.uniforms.uDustC });
// The case lands well in front of the gun, so its dust draws over it.
caseDustV.material.depthTest = false;
caseDustV.renderOrder = BAND.sparks;
state.caseDust = null;
export function updateCaseDust() {
  const age = state.caseDust ? state.simT - state.caseDust.t0 : 99, on = age < 12;
  caseDustV.visible = on;
  if (!on) return;
  const u = caseDustV.material.uniforms, sa = Math.sqrt(age);
  u.uCd.value.set(state.caseDust!.P.x, 0, state.caseDust!.P.z, age);
  u.uC.value.set(state.caseDust!.P.x, 0, state.caseDust!.P.z); u.uR.value = 2 * (30 + 75 * sa);
  u.uSlab.value = 4 * (10 + 40 * sa); u.uLs.value = 4 + 6 * sa;
  u.uVSteps.value = dustSteps(); u.uLSteps.value = volLSteps();
}
// Muzzle blast: a white vapour ring that bursts square to the bore,
// a short fireball, and a lobed smoke burst that coasts out and drifts.
// uMs: muzzle place, age. uMx: bore axis, power.
const VRING = /* glsl */`
// One vapour ring: born at delay d, scale s of the first.
// It starts off metres ahead and runs a further run metres down the bore.
float vring(vec3 p, float d, float s, float off, float run, float seed) {
  float age = uMs.w - d;
  if (age <= 0.0) return 0.0;
  off += run * (1.0 - exp(-age / 0.6));
  float Rv = (30.0 + 560.0 * (1.0 - exp(-age / 0.28))) * s, tv = (22.0 + 0.16 * Rv) * mix(1.0, s, 0.5);
  vec3 q = p - uMs.xyz - uMx.xyz * (0.12 * Rv + off);
  float x = dot(q, uMx.xyz);
  vec3 rq = q - uMx.xyz * x;
  float rr = length(rq);
  // The ring tears: its strength wanders round the rim.
  vec3 e1 = normalize(cross(uMx.xyz, vec3(0.0, 1.0, 0.0))), e2 = cross(uMx.xyz, e1);
  float ph = atan(dot(rq, e2), dot(rq, e1));
  vec3 cp = vec3(cos(ph), sin(ph), 0.0);
  float tear = smoothstep(0.35, 0.65, texture(uVol, cp * 0.9 + vec3(0.3 + seed, 0.6, 0.1 + 0.05 * age)).r);
  // The rim wobbles in and out, so the torus is not a perfect circle.
  float wob = 1.0 + 0.16 * (texture(uVol, cp * 0.35 + vec3(0.7, 0.2 + seed, 0.5)).g - 0.5);
  float tw = tv * (0.55 + 0.7 * tear);
  return exp(-pow((rr - Rv * wob) / tw, 2.0)) * exp(-pow(x / (0.8 * tw), 2.0)) * exp(-age / 0.55)
    * smoothstep(0.0, 0.05, age) * (0.08 + 0.92 * tear);
}
`;
export const muzzleSmoke = makeVol(/* glsl */`
uniform vec4 uMs, uMx;
uniform vec3 uSmC, uVapC;
${VRING}
vec3 msCentre() { float a = uMs.w; return uMs.xyz + uMx.xyz * 360.0 * (1.0 - exp(-a / 0.6)) + vec3(6.0, 5.0, 2.0) * a; }
// The first ring; the smaller ones that follow have their own tight volumes.
float vapour(vec3 p) { return vring(p, 0.0, 1.0, 0.0, 0.0, 0.0); }
float dens(vec3 p, out vec3 em) {
  em = vec3(0.0);
  float age = uMs.w, R = 60.0 + 240.0 * sqrt(age);
  vec3 q = p - msCentre();
  float x = dot(q, uMx.xyz);
  vec3 rq = q - uMx.xyz * x;
  // Smoke: a ring round the bore, a core, and tongues thrown forward.
  float ring = exp(-pow((length(rq) - 0.55 * R) / (0.42 * R), 2.0)) * exp(-pow(x / (0.6 * R), 2.0));
  float core = exp(-dot(q, q) / (R * R * 0.5));
  // The core starts as fire and turns to smoke; it is thin for the first breath.
  float smoke = max(ring, 0.85 * core) * exp(-age / 1.8) * (0.35 + 0.65 * smoothstep(0.05, 0.4, age));
  float vap = vapour(p) * 1.1;
  float cov = max(smoke, vap) * uMx.w;
  if (cov < 0.004) return 0.0;
  vec3 w = q * (1.3 / R) + vec3(0.0, -age * 0.05, age * 0.04);
  // Big lobes, then fine wisps carved at the rim.
  float n = 0.65 * dustN(w) + 0.35 * texture(uVol, w * 0.45 + vec3(uMs.w * 0.02)).r;
  float d = clamp((n - (1.0 - min(cov, 1.0))) * 2.4, 0.0, 1.0);
  if (d > 0.0) d = clamp((d - (1.0 - texture(uVol, w * 3.6).g) * 0.38) * 1.6, 0.0, 1.0);
  // The fireball: white-hot at the bore, then yellow, orange and a deep red.
  // It rolls forward with the smoke and burns out in under a second.
  vec3 f = p - msCentre();
  float hot = exp(-age / 0.22) * exp(-dot(f, f) / (R * R * 0.45));
  float tk = exp(-age / 0.08), tm = exp(-age / 0.3);
  vec3 bb = mix(mix(vec3(0.9, 0.22, 0.05), vec3(1.0, 0.55, 0.18), tm), vec3(1.0, 0.92, 0.8), tk);
  // Cool cells in the fire read as turbulence.
  float cell = 0.45 + 0.55 * texture(uVol, w * 2.2 + vec3(age * 0.3)).r;
  // About two units through the ball: fire colour, not a clipped white disc.
  em = bb * d * cell * uMx.w * (2.5 + 10.0 * tk) * hot / R;
  // Thin smoke: it spreads wide and lets the sky through.
  return d * 1.3 / R;
}
// Vapour is white; smoke is a warm grey.
vec3 alb(vec3 p) { return mix(uSmC, uVapC, smoothstep(0.05, 0.4, vapour(p))); }
// The fire lights the smoke from inside, warm, not the white of the flash.
vec3 vlight(vec3 p) { vec3 m = uMuzL.xyz - p; return vec3(1.0, 0.72, 0.48) * uMuzL.w * 3.5e4 / (dot(m, m) + 3.5e4) + blastLight(p); }`, {
  uMs: { value: new THREE.Vector4() }, uMx: { value: new THREE.Vector4() },
  uSmC: { value: new THREE.Vector3(...linFit(0.66, 0.014, 65)) }, uVapC: { value: new THREE.Vector3(...linFit(0.96, 0.006, 240)) },
});
state.muzzleFx = null;
const msC = new THREE.Vector3();
export function updateMuzzleSmoke() {
  const age = state.muzzleFx ? state.simT - state.muzzleFx.t0 : 99, on = age < 6 && !reduced();
  muzzleSmoke.visible = on;
  updateRingVols(age, on);
  if (!on) return;
  const u = muzzleSmoke.material.uniforms, f = state.muzzleFx!, R = 60 + 240 * Math.sqrt(age);
  u.uMs.value.set(f.P.x, f.P.y, f.P.z, age);
  u.uMx.value.set(f.ax.x, f.ax.y, f.ax.z, f.k);
  msC.copy(f.P).addScaledVector(f.ax, 360 * (1 - Math.exp(-age / 0.6))).add(bq.set(6, 5, 2).multiplyScalar(age));
  // The bound holds both the smoke and the vapour ring at the muzzle.
  const Rv = 30 + 560 * (1 - Math.exp(-age / 0.28)), vOn = age < 3;
  u.uC.value.copy(msC); u.uR.value = Math.max(1.4 * R + 30, vOn ? msC.distanceTo(f.P) + Rv * 1.35 + 60 : 0);
  // Once the fire is out, thin smoke needs fewer steps.
  const late = age > 1.2;
  u.uVSteps.value = late ? Math.max(8, Math.round(volSteps() * 0.55)) : volSteps(); u.uLSteps.value = late ? 1 : volLSteps(); u.uLs.value = 0.15 * R;
}
// The two follow-up rings: each its own small volume on a tight bound.
// d: delay, s: scale, off: start ahead, run: further run, g: strength.
const RINGS = [{ d: 0.14, s: 0.5, off: 260, run: 420, seed: 0.37, g: 0.8 }, { d: 0.28, s: 0.32, off: 520, run: 700, seed: 0.71, g: 0.65 }];
export const ringVols = RINGS.map(r => makeVol(/* glsl */`
uniform vec4 uMs, uMx;
uniform vec3 uVapC;
${VRING}
float dens(vec3 p, out vec3 em) {
  em = vec3(0.0);
  float v = vring(p, ${r.d.toFixed(2)}, ${r.s.toFixed(2)}, ${r.off.toFixed(1)}, ${r.run.toFixed(1)}, ${r.seed.toFixed(2)}) * ${r.g.toFixed(2)} * uMx.w;
  if (v < 0.004) return 0.0;
  vec3 w = p * 0.006 + vec3(0.0, -uMs.w * 0.05, 0.0);
  float d = clamp((dustN(w) - (1.0 - min(v, 1.0))) * 2.4, 0.0, 1.0);
  return d * 0.03;
}
vec3 alb(vec3 p) { return uVapC; }
vec3 vlight(vec3 p) { vec3 m = uMuzL.xyz - p; return vec3(1.0, 0.72, 0.48) * uMuzL.w * 3.5e4 / (dot(m, m) + 3.5e4) + blastLight(p); }`, {
  uMs: { value: new THREE.Vector4() }, uMx: { value: new THREE.Vector4() }, uVapC: { value: new THREE.Vector3(...linFit(0.96, 0.006, 240)) },
}));
function updateRingVols(age: number, on: boolean) {
  RINGS.forEach((r, i) => {
    const m = ringVols[i], a = age - r.d, live = on && a > 0 && a < 2.5;
    m.visible = live;
    if (!live) return;
    const u = m.material.uniforms, f = state.muzzleFx!;
    u.uMs.value.set(f.P.x, f.P.y, f.P.z, age);
    u.uMx.value.set(f.ax.x, f.ax.y, f.ax.z, f.k);
    const Rv = (30 + 560 * (1 - Math.exp(-a / 0.28))) * r.s, tv = (22 + 0.16 * Rv) * (1 + r.s) / 2;
    const off = 0.12 * Rv + r.off + r.run * (1 - Math.exp(-a / 0.6));
    u.uC.value.copy(f.P).addScaledVector(f.ax, off);
    u.uR.value = Rv * 1.2 + 2 * tv;
    u.uVSteps.value = Math.max(8, Math.round(volSteps() * 0.6)); u.uLSteps.value = 1; u.uLs.value = 20;
  });
}
