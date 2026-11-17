// Load order: rock/trail runs first.
import './trail.ts';
import * as THREE from 'three';
import { linFit } from '../../../shared/stim.js';
import { HULL } from '../../ship.js';
import { state } from '../state.ts';
import { camera, clamp, rnd, scene } from '../setup.ts';
import { FALL } from '../world/axis.ts';
import { U } from '../world/uniforms.ts';
import { HEAD } from '../sky/atmosphere.ts';
import { AIR } from '../sky/air.ts';
import { BAND } from '../clouds/bands.ts';
import { ast, astMat, astMesh, bakeRock } from './asteroid.ts';
import { shipTrains } from '../ship/battleship.ts';
import { PU, makeMini, makeTrain } from './trail.ts';
import { starMat, writeStar } from '../fx/burst.ts';
import { fallT } from '../play/approach.ts';
import { makeFlare } from '../fx/flares.ts';
import { flare } from '../fx/bowshock.ts';

/* ---------- fragments: small rocks on their own tracks ---------- */
// Two to four pieces fall beside the main rock, on parallel tracks.
// The blast's shock breaks each one when it arrives.
const FRAG_GEO = bakeRock(3, 4, 'lumpy');
const FRAG_SEG = 32;
const fragTrailGeo = new THREE.BufferGeometry();
{
  const n = FRAG_SEG, pos = new Float32Array(n * 12), f = new Float32Array(n * 8), idx = [];
  for (let i = 0; i < n; i++) {
    const b = i * 4, f0 = i / n, f1 = (i + 1) / n;
    pos.set([0, -1, 0, 0, 1, 0, 1, -1, 0, 1, 1, 0], i * 12);
    f.set([f0, f1, f0, f1, f1, f0, f1, f0], i * 8);
    idx.push(b, b + 2, b + 3, b, b + 3, b + 1);
  }
  fragTrailGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  fragTrailGeo.setAttribute('aF', new THREE.BufferAttribute(f, 2));
  fragTrailGeo.setIndex(idx);
}
// A cheap smoke ribbon: fire at the head, soot to ash behind.
// own: the trail keeps its own direction instead of the rock's.
export function makeFragTrail(own = false) {
  const m = new THREE.Mesh(fragTrailGeo, new THREE.ShaderMaterial({
    uniforms: {
      ...U, uRes: { value: new THREE.Vector2(1, 1) }, uDpr: { value: 1 }, uP: { value: new THREE.Vector3() }, uR: { value: 100 }, uLen: { value: 5000 },
      uOn: { value: 0 }, uLift: { value: new THREE.Vector3() }, uSeed: { value: rnd() * 50 }, uAway: own ? { value: new THREE.Vector3(0, 1, 0) } : PU.uAway, uSide: own ? { value: new THREE.Vector3(1, 0, 0) } : PU.uSide, uSoot: PU.uSoot, uAsh: PU.uAsh, uFireC: PU.uFireC,
    },
    transparent: true, depthWrite: false,
    blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
    blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor,
    vertexShader: /* glsl */`
    attribute vec2 aF;
    uniform vec3 uP, uAway, uSide;
    uniform vec2 uRes;
    uniform float uDpr, uR, uLen, uSeed;
    varying float vY, vF;
    varying vec3 vP;
    vec3 at(float f) { return uP + uAway * uLen * f + uSide * uR * 2.0 * f * sin(f * 9.0 + uSeed); }
    void main() {
      vec3 p = at(aF.x), q = at(aF.y);
      vec4 c0 = projectionMatrix * viewMatrix * vec4(p, 1.0), c1 = projectionMatrix * viewMatrix * vec4(q, 1.0);
      vec2 d = (c1.xy / c1.w - c0.xy / c0.w) * uRes * (position.x < 0.5 ? 1.0 : -1.0);
      d = length(d) > 1e-3 ? normalize(d) : vec2(0.0, 1.0);
      float ppm = 0.5 * uRes.y * projectionMatrix[1][1] / max(c0.w, 1.0);
      float W = max(uR * (1.1 + 3.5 * aF.x) * ppm, 1.5 * uDpr);
      c0.xy += vec2(-d.y, d.x) * position.y * W / (0.5 * uRes) * c0.w;
      vY = position.y; vF = aF.x; vP = p;
      gl_Position = c0;
    }`,
    fragmentShader: /* glsl */`
    uniform vec3 uSoot, uAsh, uFireC;
    uniform float uOn, uTime, uSeed;
    // uLift holds a fade floor along the ribbon.
    // It also holds the weight and the fire's level.
    // A landed hulk's ribbon fades from the ground up.
    uniform vec3 uLift;
    varying float vY, vF;
    varying vec3 vP;
    ${HEAD}
    ${AIR}
    void main() {
      float edge = exp(-vY * vY * 2.5);
      float n = k2fbm(vec2(vF * 14.0 - uTime * 0.5 + uSeed, vY * 1.3 + uSeed));
      // The clamp keeps pow off a negative base.
      float lift = mix(1.0, smoothstep(uLift.x, uLift.x + 0.25, vF), uLift.y);
      float a = pow(clamp(1.0 - vF, 0.0, 1.0), 1.4) * smoothstep(0.2, 0.75, n * 0.7 + 0.45 * edge) * edge * 0.8 * uOn * lift;
      vec3 smoke = mix(uSoot, uAsh, smoothstep(0.0, 0.6, vF)) * (ambient(vec3(0.0, 1.0, 0.0)) + uSunC * 0.8 + blastLight(vP));
      // A short hot tip; a long glow hides the piece.
      vec3 fire = uFireC * exp(-vF * 16.0) * edge * 0.8 * uOn * lift * mix(1.0, uLift.z, uLift.y);
      gl_FragColor = vec4(aerial(smoke, vP) * a + fire * aerialT(vP), a);
    }`,
  }));
  m.frustumCulled = false; m.renderOrder = BAND.ribbons; m.visible = false;
  scene.add(m);
  return m;
}
// Each hulk's streak has its own uniforms.
// It shares the rock train's noise, colours and step counts.
// This block restores the seed, so the rock's draws do not change.
{
  const s0 = state.seed;
  for (const sec of HULL.sections) {
    const pu = {
      uAstP: { value: new THREE.Vector3() }, uAstRad: { value: 1000 }, uAway: { value: new THREE.Vector3(0, 1, 0) }, uSide: { value: new THREE.Vector3(1, 0, 0) }, uUpv: { value: new THREE.Vector3(0, 0, 1) },
      uBurn: { value: 0 }, uVol: PU.uVol, uLen: { value: 1000 }, uK: { value: 0.05 }, uTrail: { value: 0 }, uFlow: { value: 0 },
      // The blocker stops the sheath's glow inside the hulk.
      uSolid: { value: 0.5 }, uLift: { value: new THREE.Vector2() },
      uSteps: PU.uSteps, uLSteps: PU.uLSteps, uBreak: { value: 0 }, uEatK: { value: 0 }, uJoin: { value: 0 }, uCut: { value: 1e9 }, uDrift: { value: new THREE.Vector3() }, uX0: { value: 0 }, uSeg: { value: 0 }, uSwipe: { value: new THREE.Vector3() },
      uHot: PU.uHot, uFireC: PU.uFireC, uEmberC: PU.uEmberC, uSoot: PU.uSoot, uAsh: PU.uAsh,
    };
    const m = makeTrain(pu);
    m.frustumCulled = false; m.renderOrder = BAND.debris; m.visible = false;
    scene.add(m);
    shipTrains.push({ m, pu, rib: sec.id === 'prow' || sec.id === 'tower' ? makeFragTrail(true) : null, cheap: false });
  }
  state.seed = s0;
}
// Small rocks shimmer at a few pixels; they take no cracks and a steady burn.
const fragMat = new THREE.ShaderMaterial({ uniforms: { ...astMat.uniforms, uCracks: { value: 0 }, uBurn: { value: 0.55 }, uCrater: { value: [new THREE.Vector4(0, 0, 0, -1), new THREE.Vector4(0, 0, 0, -1)] } }, vertexShader: astMat.vertexShader, fragmentShader: astMat.fragmentShader });
// Up to sixteen companions ride with the main rock.
export const frags = Array.from({ length: 16 }, () => {
  const m = new THREE.Mesh(FRAG_GEO, fragMat);
  m.frustumCulled = false; m.visible = false;
  scene.add(m);
  // splitS: the fall fraction where a piece breaks off; -1 rides from the start.
  // splitT: when it broke off; its gap grows from the rock's flank.
  // glow: a split piece's own soft halo, so it stands apart from riders.
  return { m, glow: makeFlare(linFit(0.85, 0.14, 55)), trail: makeFragTrail(), mini: makeMini(), on: false, ox: 0, oy: 0, oz: 0, k: 0.2, pos: new THREE.Vector3(), breakT: 0, broke: -1, spin: new THREE.Vector3(0, 1, 0), splitS: -1, splitT: -1e9 };
});
export type Frag = (typeof frags)[number];
const fragGlowP = new THREE.Vector3();
// Seconds a split piece takes to drift out to its own track.
const SPLIT_T = 40;
// Offsets count main-rock radii, so a size change keeps the gaps.
export function seedFrags() {
  // Six to nine spread wide across the sky; four to six split off later.
  const n = 6 + Math.floor(rnd() * 4), ns = 4 + Math.floor(rnd() * 3);
  frags.forEach((f, i) => {
    const split = i >= n && i < n + ns;
    f.on = i < n; f.broke = -1; f.breakT = 0;
    // Splits come faster as the rock nears the ground, on even steps.
    // A square root packs the steps toward the end of the fall.
    // The last ones break off in the strike, past the horizon line.
    const j = i - n, u = (j + 0.25 + 0.5 * rnd()) / ns;
    f.splitS = split ? 0.3 + 0.9 * Math.sqrt(u) : -1; f.splitT = -1e9;
    const th = (i / n) * Math.PI * 2 + rnd() * 1.4;
    // Riders scatter from close by to far across the sky.
    // A split piece drags more than the rock: it falls back down the wake.
    // It drifts only a little aside, to the edge of the smoke, never ahead.
    const gap = split ? 1.6 + 1.2 * rnd() : 2.8 + 22 * rnd() * rnd();
    f.ox = Math.cos(th) * gap; f.oy = Math.sin(th) * gap; f.oz = split ? 5 + 10 * rnd() : -8 + 30 * rnd();
    f.k = 0.06 + 0.1 * rnd();
    // Medium pieces come a little bigger.
    if (f.k >= 0.18) f.k *= 1.25;
    // A split piece is bigger than a rider, so it reads as torn off.
    if (split) f.k = 0.17 + 0.08 * rnd();
    f.glow.visible = false;
    f.spin.set(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).normalize();
    f.m.quaternion.random();
    f.m.visible = f.on; f.trail.visible = f.on; f.mini.m.visible = false;
    f.trail.material.uniforms.uOn.value = 0;
  });
}
export function placeFrags() {
  const live = state.tgtKind === 'rock' && astMesh.visible && (ast.state === 'approach' || ast.state === 'hold' || ast.state === 'strike');
  for (const f of frags) {
    // A pending piece breaks off once the rock passes its fall fraction.
    if (!f.on && f.splitS >= 0 && f.broke < 0 && live && ast.s >= f.splitS) splitFrag(f);
    if (!f.on) continue;
    // A split piece leaves the rock's flank and eases out to its track.
    const st = clamp((state.simT - f.splitT) / SPLIT_T, 0, 1);
    const e = f.splitS < 0 ? 1 : 1 - Math.pow(1 - st, 2);
    // Drag slows it gently at first, so it falls back on an ease-in.
    const eb = f.splitS < 0 ? 1 : st * st * (3 - 2 * st);
    const g = THREE.MathUtils.lerp(1.1 / Math.max(Math.hypot(f.ox, f.oy), 1e-3), 1, e);
    f.pos.copy(ast.pos).addScaledVector(ast.side, f.ox * g * ast.R).addScaledVector(ast.upv, f.oy * g * ast.R).addScaledVector(ast.away, f.oz * eb * ast.R);
    f.m.position.copy(f.pos);
    f.m.scale.setScalar(f.k * ast.R);
    const u = f.trail.material.uniforms;
    u.uP.value.copy(f.pos); u.uR.value = f.k * ast.R; u.uLen.value = f.k * ast.R * (f.k >= 0.18 ? 90 : 60);
    // A split piece burns hotter: a longer fire tip and its own halo.
    if (f.splitS >= 0) {
      u.uLift.value.set(-1, 1, 2.6);
      // The halo stands toward the eye, so the piece never hides it.
      fragGlowP.subVectors(camera.position, f.pos).setLength(f.k * ast.R * 1.6).add(f.pos);
      flare(f.glow, fragGlowP, f.k * ast.R * 4.5, 0.5 * Math.min(1, u.uOn.value) * (0.5 + 0.5 * astMat.uniforms.uBurn.value));
    }
  }
}
// The last split's time; it swells the sky's fiery glow.
export let fillPopT = -1e9;
// A piece breaks off the main rock and swells the sky's glow.
// A rock already deep in its fall shows the piece already apart.
function splitFrag(f: Frag) {
  f.on = true; f.m.visible = true; f.trail.visible = true;
  f.splitT = ast.s - f.splitS > 0.02 ? -1e9 : state.simT;
  f.trail.material.uniforms.uOn.value = f.splitT < 0 ? 1 : 0;
  // A split swells the sky's fiery glow; it throws no ember sparks.
  if (f.splitT >= 0) fillPopT = state.simT;
}
// The shock front's radius, ha seconds after the hit.
// It sweeps out slowly toward the eye: 36 km, over half a minute.
export const shockR = (ha: number, R: number) => R * 1.4 + 36000 * (1 - Math.exp(-ha / 9));
// The hit sets each fragment's break time by its distance.
export function armFrags() {
  for (const f of frags) {
    if (!f.on || f.broke >= 0) continue;
    const d = f.pos.distanceTo(ast.pos), x = clamp((d - ast.R * 1.4) / 36000, 0, 0.95);
    f.breakT = state.simT - 9 * Math.log(1 - x);
  }
}
export function stepFrags() {
  for (const f of frags) {
    if (!f.on) continue;
    const u = f.trail.material.uniforms;
    u.uRes.value.copy(starMat.uniforms.uRes.value); u.uDpr.value = starMat.uniforms.uDpr.value;
    if (f.broke < 0) {
      u.uOn.value = Math.min(1, u.uOn.value + 1 / 90);
      if (f.breakT && state.simT >= f.breakT) breakFrag(f);
    } else u.uOn.value = Math.exp(-(state.simT - f.broke) / 1.5);
    // Every fragment keeps its ribbon trail (Tom); medium ones run longer.
    f.trail.visible = u.uOn.value > 0.01;
    f.mini.m.visible = false;
  }
}
// A fragment bursts into embers.
function breakFrag(f: Frag) {
  f.broke = state.simT; f.m.visible = false; f.glow.visible = false;
  const r = f.k * ast.R, sp = r / 120;
  // It throws no ember sparks (Tom: no small yellow wisps).
  void sp;
}
// One glowing bit off the rock's hot face.
export let ablN = 0, shedN = 0;
const shedP = new THREE.Vector3(), shedV = new THREE.Vector3();
// age > 0 backdates a bit: it left the rock where the rock was then.
const shedU = new THREE.Vector3();
// src: a falling hulk { pos, away, side, R, vel }.
// A null src sheds from the rock.
export interface ShedSrc { pos: THREE.Vector3; away: THREE.Vector3; side: THREE.Vector3; R: number; vel: THREE.Vector3; }
export function shedSpark(age = 0, src: ShedSrc | null = null) {
  if (src) { shedHulk(src); return; }
  const R = ast.R, tp = astMat.uniforms.uToPlanet.value;
  // They leave from anywhere across the rock's back, not from one spot.
  const th = rnd() * Math.PI * 2, rr = 1.05 * R * Math.sqrt(rnd());
  shedU.crossVectors(ast.away, ast.side);
  shedP.copy(ast.pos).addScaledVector(ast.away, FALL / fallT() * age + 0.45 * R).addScaledVector(ast.side, Math.cos(th) * rr).addScaledVector(shedU, Math.sin(th) * rr).addScaledVector(tp, 0.15 * R);
  // Big burning pieces drift slowly back up the smoke train.
  // They carry no weight, so they never arc off; they go 12 to 25 km.
  // They stay close to the smoke; small, dim, cooling orange to red.
  shedV.copy(ast.away).multiplyScalar(350 + rnd() * 300).addScaledVector(ast.side, (rnd() - 0.5) * 110).addScaledVector(shedU, (rnd() - 0.5) * 110);
  writeStar(shedP, state.simT - age, shedV, -0.008, 2, 38 + rnd() * 14, 0.8, 0.9 + rnd() * 0.6, 3, 0.15);
  ablN++;
}
// A burning piece leaves a hulk's back in the air.
// Drag stops it.
// Its weight then sinks it back along the streak.
function shedHulk(src: ShedSrc) {
  const th = rnd() * Math.PI * 2, rr = src.R * Math.sqrt(rnd());
  shedU.crossVectors(src.away, src.side);
  shedP.copy(src.pos).addScaledVector(src.away, 0.5 * src.R).addScaledVector(src.side, Math.cos(th) * rr).addScaledVector(shedU, Math.sin(th) * rr);
  shedV.copy(src.vel).multiplyScalar(0.8).addScaledVector(src.side, (rnd() - 0.5) * 300).addScaledVector(shedU, (rnd() - 0.5) * 300);
  writeStar(shedP, state.simT, shedV, 0.12, 2, 14 + rnd() * 8, 1.2, 2 + rnd(), 3, 0.5);
  shedN++;
}
// A rock already in flight already has its trail of embers.
// The rock carries no ember trail (Tom, 2026-11-16).
export function prewarmEmbers() {}
