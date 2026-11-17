// Load order: ship/hulks runs first.
import '../ship/hulks.ts';
import * as THREE from 'three';
import { reduced, linFit } from '../../../shared/stim.js';
import { state } from '../state.ts';
import type { Burst } from '../state.ts';
import { camera, renderer, rnd, scene } from '../setup.ts';
import { MUZZLE } from '../world/axis.ts';
import { U } from '../world/uniforms.ts';
import { BAND } from '../clouds/bands.ts';
import { WHITE, ast } from '../rock/asteroid.ts';
import { PU, aimMini, makeMini } from '../rock/trail.ts';
import type { Mini } from '../rock/trail.ts';
import { shockR } from '../rock/fragments.ts';
import { puff } from './dust.ts';
import { writeStar } from './burst.ts';
import { dustP, dustV } from '../play/charge.ts';
import { makeFlare } from './flares.ts';
import { burstFlares, flare } from './bowshock.ts';
import { volSteps } from './volfx.ts';
import type { Vol } from './volfx.ts';
import { caseDustV, chargeDust, makeShell, muzzleSmoke, plume, ringVols, shotDust, warpH } from '../gun/muzzle.ts';
import { ventJets } from '../gun/vents.ts';
import { sPos, sSeed, sVel, shardGeo } from '../rock/shards.ts';
import { fireball, pullOf } from './blast.ts';
import { domeVols, shipDomes } from '../ship/hulks.ts';
import { stepHail } from './hail.ts';
import { bp, bv } from '../play/shot.ts';

/* ---------- volumes at 75% resolution ---------- */
// The volumes march into a smaller target; one quad lays it over the frame.
// Each group keeps its draw order, so the layering holds.
// A depth-tested volume tests its quad at the far side of its proxy.
// Full resolution by default: the 75% composite darkens a hard disc round the blast.
// ?volres=0.75 turns the low-resolution path on, for its fix.
// Unary plus turns a missing value into 0, so the 1 holds.
const VOL_RES = Math.min(1, +new URLSearchParams(location.search).get('volres')! || 1);
// A low-resolution group: its layer, target, quad, volumes, depth volume.
interface VolGroup { layer: number; rt: THREE.WebGLRenderTarget; quad: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>; meshes: VolMesh[]; depthOf: Vol | null }
// A volume mesh with a shader material.
type VolMesh = THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial>;
const volGroups: VolGroup[] = [];
const volDepthP = new THREE.Vector3(), volClear = new THREE.Color();
function lowRes(order: number, meshes: VolMesh[], depthOf: Vol | null = null) {
  if (VOL_RES >= 1) return;
  const layer = volGroups.length + 1;
  const rt = new THREE.WebGLRenderTarget(2, 2, { type: THREE.HalfFloatType, depthBuffer: false });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
    uniforms: { tVol: { value: rt.texture }, uDepthP: { value: new THREE.Vector3() }, uDepthOn: { value: depthOf ? 1 : 0 } },
    transparent: true, depthWrite: false, depthTest: !!depthOf,
    blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
    blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor,
    vertexShader: /* glsl */`uniform vec3 uDepthP; varying vec2 vUv; varying float vDepth;
    void main() {
      vUv = uv;
      vec4 c = projectionMatrix * viewMatrix * vec4(uDepthP, 1.0);
      vDepth = clamp(0.5 + 0.5 * c.z / c.w, 0.0, 1.0);
      gl_Position = vec4(position.xy, 0.0, 1.0);
    }`,
    fragmentShader: /* glsl */`uniform sampler2D tVol; uniform float uDepthOn; varying vec2 vUv; varying float vDepth;
    void main() {
      gl_FragColor = texture2D(tVol, vUv);
      gl_FragDepth = uDepthOn > 0.5 ? vDepth : 0.0;
    }`,
  }));
  quad.frustumCulled = false; quad.renderOrder = order; quad.visible = false;
  scene.add(quad);
  for (const m of meshes) {
    m.layers.set(layer);
    // The target starts clear, so alpha must build up as cover.
    m.material.blendSrcAlpha = THREE.OneFactor;
    m.material.blendDstAlpha = THREE.OneMinusSrcAlphaFactor;
    if (depthOf) m.material.depthTest = false;
  }
  volGroups.push({ layer, rt, quad, meshes, depthOf });
}
lowRes(BAND.fireball, [fireball], fireball);
lowRes(BAND.plume, [plume, chargeDust, shotDust, muzzleSmoke, ...ringVols, ventJets]);
lowRes(BAND.sparks, [caseDustV]);
// Runs after drawGunDepth: the volumes read the gun's depth by their own size.
export function drawVolumes() {
  const w = Math.max(1, Math.round(renderer.domElement.width * VOL_RES));
  const h = Math.max(1, Math.round(renderer.domElement.height * VOL_RES));
  U.uDRes.value.set(w, h);
  if (!volGroups.length) return;
  const mask = camera.layers.mask, ca = renderer.getClearAlpha();
  renderer.getClearColor(volClear);
  renderer.setClearColor(0x000000, 0);
  for (const g of volGroups) {
    g.quad.visible = g.meshes.some(m => m.visible);
    if (!g.quad.visible) continue;
    if (g.rt.width !== w || g.rt.height !== h) g.rt.setSize(w, h);
    if (g.depthOf) {
      const u = g.depthOf.material.uniforms;
      volDepthP.subVectors(u.uC.value, camera.position).normalize().multiplyScalar(u.uR.value * 1.08).add(u.uC.value);
      g.quad.material.uniforms.uDepthP.value.copy(volDepthP);
    }
    camera.layers.set(g.layer);
    renderer.setRenderTarget(g.rt);
    renderer.render(scene, camera);
  }
  camera.layers.mask = mask;
  renderer.setClearColor(volClear, ca);
  renderer.setRenderTarget(null);
}
// The soot draws before the trails, so they can lie in front of it.
fireball.renderOrder = BAND.fireball;
// The Wilson cloud and the shock front are whole spheres.
export const hitShellA = makeShell(3.0, 0.45, 0.75, true), hitShellB = makeShell(4.0, 0.35, 0.7, true);
// The skirt: a thin, nearly whole skin that leaves the hit first.
const hitShellC = makeShell(7.0, -0.1, 0.45);
// The live blast: start time, place, rock radius and power.
state.blastFx = null; state.voidFx = null;
// The sky void and the torn deck outlive the blast; Reset clears them.
function updateVoid() {
  if (!state.voidFx) { U.uVoidK.value = 0; return; }
  const ha = state.simT - state.voidFx.t0, P = state.voidFx.P;
  U.uVoid.value.set(P.x, P.y, P.z, state.voidFx.R * 2 + 13000 * (1 - Math.exp(-ha / 8)));
  U.uVoidK.value = state.voidFx.k * THREE.MathUtils.smoothstep(ha, 0.4, 2.5);
  U.uVoidT.value = ha;
  // The deck hole opens where the eye's line through the blast meets the 9 km deck.
  const c = camera.position, t = (9000 - c.y) / Math.max(P.y - c.y, 1);
  U.uVoidD.value.set(c.x + (P.x - c.x) * t, c.z + (P.z - c.z) * t);
}
export function updateBlast() {
  updateVoid();
  if (!state.blastFx) { fireball.visible = hitShellA.visible = hitShellB.visible = hitShellC.visible = false; warpH.strength = 0; U.uSootK.value = 0; for (const m of burstFlares) m.visible = false; return; }
  const ha = state.simT - state.blastFx.t0, R = state.blastFx.R, k = state.blastFx.k;
  // The void outlives the soot: the blast state holds until the sky heals.
  if (ha > 95) { state.blastFx = null; updateBlast(); return; }
  const u = fireball.material.uniforms;
  u.uBP.value.copy(state.blastFx.P);
  u.uFb.value.set(ha, R, reduced() ? 0.5 * k : k, state.blastFx.seed);
  const Rb = R * (1 + 11 * (1 - Math.exp(-ha / 4.5)));
  u.uC.value.copy(state.blastFx.P).y += 25 * ha;
  // The bound holds the soot and the faster fire sphere.
  // The fire's heads bulge out to about 1.4 of its radius.
  u.uR.value = Math.max(Rb * 1.6, R * (1 + 7 * (1 - Math.exp(-ha / 1.1))) * 1.45);
  // The soot ball others fade behind: thick early, thin as it erodes.
  U.uSootS.value.set(u.uC.value.x, u.uC.value.y, u.uC.value.z, Rb * 0.95);
  // The tail's eaten end grows with the cloud and keeps its last size.
  U.uEat.value.set(state.blastFx.P.x, state.blastFx.P.y, state.blastFx.P.z, Math.max(U.uEat.value.w, Rb * 0.08));
  U.uSootK.value = 1.2 * (1 - 0.6 * THREE.MathUtils.smoothstep(ha, 10, 70)) * (1 - THREE.MathUtils.smoothstep(ha, 65, 90));
  // Soot needs fewer steps than fire.
  // While the fire burns it needs full steps; soot alone needs fewer.
  const soot = ha > 12;
  // A deeper march toward the sun: the ball shades itself in billows, as the tail does.
  u.uVSteps.value = soot ? Math.max(8, Math.round(volSteps() * 0.6)) : volSteps(); u.uLSteps.value = soot ? 3 : 4; u.uLs.value = 0.1 * Rb;
  // The soot is gone by 90 s; the blast state lives on for the void.
  fireball.visible = ha < 91;
  // The Wilson shell flashes round the fireball and burns off.
  const ga = reduced() ? 0.5 : 1, A = hitShellA.material.uniforms, B = hitShellB.material.uniforms;
  A.uC.value.copy(state.blastFx.P); A.uR.value = R * 1.4 + 20000 * (1 - Math.exp(-ha / 5));
  A.uGain.value = ga * 1.6 * k * Math.exp(-ha / 2.5);
  A.uEm.value.copy(U.uAstC.value).multiplyScalar(2.5 * Math.exp(-ha / 1.5));
  hitShellA.visible = A.uGain.value > 0.01;
  // The shock front runs on; it breaks the fragments as it passes.
  B.uC.value.copy(state.blastFx.P); B.uR.value = shockR(ha, R);
  B.uGain.value = ga * 0.7 * k * Math.exp(-ha / 7);
  hitShellB.visible = B.uGain.value > 0.01;
  // The skirt runs out to ten radii in a second and fades.
  const C = hitShellC.material.uniforms;
  C.uC.value.copy(state.blastFx.P); C.uR.value = R * (1.05 + 9 * (1 - Math.exp(-ha / 0.45)));
  C.uGain.value = ga * 3.5 * k * Math.exp(-ha / 0.5) * Math.min(1, ha / 0.04);
  C.uEm.value.set(...WHITE).multiplyScalar(3 * Math.exp(-ha / 0.25)).addScaledVector(U.uAstC.value, 2 * Math.exp(-ha / 0.8));
  hitShellC.visible = C.uGain.value > 0.01;
  warpH.set(state.blastFx.P.x, state.blastFx.P.y, state.blastFx.P.z, C.uR.value);
  warpH.strength = reduced() ? 0 : k * Math.exp(-ha / 1.2);
  // The void: the blast clears a sphere of sky that grows for twenty seconds.
  // It stays until Reset.
  if (!state.voidFx) state.voidFx = { P: state.blastFx.P.clone(), R, k: Math.min(1, k), t0: state.blastFx.t0 };
  updateBursts(ha, R, k);
}
// Each burst: a warm flash through the soot, a spray of sparks, a flicker of light.
const burstP = new THREE.Vector3();
// Both run only while a blast is live, so blastFx is set.
function burstAt(b: Burst, out: THREE.Vector3) { return out.copy(state.blastFx!.P).add(b.off).setY(state.blastFx!.P.y + b.off.y + 25 * b.t); }
function updateBursts(ha: number, R: number, k: number) {
  state.blastFx!.bursts.forEach((b, i) => {
    const bt = ha - b.t, m = burstFlares[i];
    if (bt < 0 || bt > 4) { flare(m, state.blastFx!.P, 1, 0); return; }
    burstAt(b, burstP);
    flare(m, burstP, R * b.k * (2.5 + 3 * (1 - Math.exp(-bt / 0.3))), k * b.k * (3 * Math.exp(-bt / 0.08) + 0.7 * Math.exp(-bt / 1.1)));
    if (b.done) return;
    b.done = true;
    if (reduced()) return;
    const sp = R / 600;
    for (let n = 0; n < 70; n++) {
      bv.set(rnd() - 0.5, rnd() - 0.4, rnd() - 0.5).normalize().multiplyScalar((60 + 220 * rnd()) * sp);
      writeStar(burstP, state.simT + 0.03 * rnd(), bv, 0.3 + 0.3 * rnd(), 1, 1.5 + 2 * rnd(), 0.4 + 0.4 * rnd(), 1.1 + 0.9 * rnd(), 2, 0.7, 2);
    }
  });
}
// The bursts' light, as a share of the blast light.
export function burstLight(ha: number) {
  if (!state.blastFx) return 0;
  let s = 0;
  for (const b of state.blastFx.bursts) if (ha > b.t) s += 0.22 * b.k * Math.exp(-(ha - b.t) / 0.3);
  return s;
}
// Burning fragments rain from the cloud's underside for about ten seconds.
// The rate is on the sim clock, so a slow frame drops none.
let rainAcc = 0;
export function stepRain(dt: number) {
  if (!state.blastFx || reduced()) return;
  const ha = state.simT - state.blastFx.t0;
  if (ha < 0.6 || ha > 12) { rainAcc = 0; return; }
  const R = state.blastFx.R, P = state.blastFx.P, sp = R / 600;
  rainAcc += dt * 45 * state.blastFx.k * Math.exp(-(ha - 0.6) / 4);
  // The fire sphere's radius, as the fireball shader has it.
  const Rf = 0.8 * R * (1 + 7 * (1 - Math.exp(-ha / 1.1))) * (1 - 0.45 * pullOf(ha));
  for (; rainAcc >= 1; rainAcc--) {
    const th = rnd() * Math.PI * 2, r = Rf * Math.sqrt(rnd());
    bp.set(P.x + Math.cos(th) * r, P.y + 25 * ha - Rf * (0.2 + 0.5 * rnd()), P.z + Math.sin(th) * r);
    // A few big lumps fall slow and burn long among the crumbs.
    const big = rnd() < 0.18;
    // The crumbs leave slow and wide; the wind leans them one way.
    bv.set((rnd() - 0.5) * 160 + 35, -(30 + 170 * rnd()), (rnd() - 0.5) * 160 + 12).multiplyScalar(sp);
    writeStar(bp, state.simT, bv, big ? 0.3 + 0.1 * rnd() : 0.12 + 0.08 * rnd(), 2, big ? 9 + 5 * rnd() : 5 + 4 * rnd(), big ? 1.6 + rnd() : 0.8 + 0.7 * rnd(), big ? 2.2 + 1.2 * rnd() : 1.1 + 0.9 * rnd(), 3, big ? 0.45 : 0.3, 0);
  }
}
// The shards trail burning smoke while they are hot.
// Twelve emissions a second on the sim clock keep the star budget.
let shardAcc = 0;
export function stepShards(dt: number) {
  if (state.simT > state.shardsEnd || reduced()) return;
  shardAcc += dt;
  if (shardAcc < 1 / 12) return;
  shardAcc %= 1 / 12;
  const n = shardGeo.instanceCount, S = sSeed.array;
  for (let i = 0; i < n; i++) {
    const age = state.simT - S[i * 4 + 2];
    shardAt(i, age, bp, bv);
    // The fall's speed keeps a piece hot; it cools as it slows.
    const fast = THREE.MathUtils.smoothstep(bv.length(), 180, 520);
    const heat = Math.max(Math.exp(-age / S[i * 4 + 3]), fast, 1.3 * THREE.MathUtils.smoothstep(1600 - bp.y, 0, 1250));
    if (age < 0 || age > 58 || heat < 0.08 || bp.y < 150) continue;
    // Small pieces shed a faint ember now and then; ribbons carry the rest.
    if (S[i * 4 + 1] > 0.12 * ast.R || rnd() > 0.25) continue;
    bv.multiplyScalar(0.05);
    writeStar(bp, state.simT, bv, 0.6, 2, 0.8 + rnd() * 0.6, 0.3, 0.8, 3, 0.1 * Math.min(heat, 1), 0);
  }
}
// A shard's place and velocity at age, as the shard shader has them.
export function shardAt(i: number, age: number, out: THREE.Vector3, vel: THREE.Vector3) {
  const P = sPos.array, V = sVel.array, S = sSeed.array, kh = 0.035, kv = 0.1, vt = 260 + 480 * ((S[i * 4] * 3.7) % 1);
  // The clock halts at touchdown: a landed piece lies still.
  const yAt = (t: number) => P[i * 3 + 1] + V[i * 4 + 1] * (1 - Math.exp(-kv * t)) / kv - vt * (t - (1 - Math.exp(-0.2 * t)) / 0.2);
  if (yAt(age) < 15) { let lo = 0, hi = age; for (let b = 0; b < 12; b++) { const m = 0.5 * (lo + hi); if (yAt(m) < 15) hi = m; else lo = m; } age = hi; }
  const e = (1 - Math.exp(-kh * age)) / kh, ek = Math.exp(-kh * age), ev = (1 - Math.exp(-kv * age)) / kv, ekv = Math.exp(-kv * age);
  out.set(P[i * 3] + V[i * 4] * e, Math.max(15, P[i * 3 + 1] + V[i * 4 + 1] * ev - vt * (age - (1 - Math.exp(-0.2 * age)) / 0.2)), P[i * 3 + 2] + V[i * 4 + 2] * e);
  vel.set(V[i * 4] * ek, V[i * 4 + 1] * ekv - vt * (1 - Math.exp(-0.2 * age)), V[i * 4 + 2] * ek);
}
// Chunk trails: smoke ribbons behind the biggest falling shards.
// Each trail is a chain of short trains laid along the shard's own arc.
const SEG = 5;
// Four trailed pieces: scaled-down rocks, not slabs.
// uDebL and uPool hold one slot per piece.
// One trailed piece: its trains, its shard, its burst and its landing.
// The shot sets the burst fields; the trail step sets the landing.
export interface Chunk {
  segs: Mini[];
  i: number;
  burstAt?: number;
  burstAge?: number;
  r0?: number;
  burstP?: THREE.Vector3 | null;
  landAt?: number;
  landP?: THREE.Vector3 | null;
}
export const chunks: Chunk[] = Array.from({ length: 4 }, () => ({ segs: Array.from({ length: SEG }, makeMini), i: -1 }));
const chP = new THREE.Vector3(), chV = new THREE.Vector3(), chA = new THREE.Vector3();
const chPts = Array.from({ length: SEG + 1 }, () => new THREE.Vector3()), chX = new Float32Array(SEG + 1);
// A faint warm globe of glow hangs round each falling piece.
const chunkGlow = chunks.map(() => makeFlare(linFit(0.78, 0.13, 52)));
// A hunted chunk's burst flash.
const huntFlares = chunks.map(() => makeFlare(linFit(0.9, 0.12, 60)));
export function stepChunks() {
  stepHail();
  for (const [ci, ch] of chunks.entries()) {
    if (ch.i < 0 || state.simT > state.shardsEnd || reduced()) { for (const m of ch.segs) m.m.visible = false; chunkGlow[ci].visible = false; U.uDebL.value[ci].w = 0; U.uPool.value[ci].z = 0; huntFlares[ci].visible = false; continue; }
    // A hunted chunk stops where it burst; its trail holds, then fades.
    // A set burstAt comes with burstAge and r0.
    const age = ch.burstAt ? ch.burstAge! : state.simT - sSeed.array[ch.i * 4 + 2], r = ch.burstAt ? ch.r0! : sSeed.array[ch.i * 4 + 1];
    const bt = ch.burstAt ? state.simT - ch.burstAt : -1;
    flare(huntFlares[ci], ch.burstP || MUZZLE, r * 12 * (1 + (1 - Math.exp(-Math.max(bt, 0) / 0.3))), bt >= 0 && bt < 4 ? 3 * Math.exp(-bt / 0.08) + 0.7 * Math.exp(-bt / 1.1) : 0);
    shardAt(ch.i, age, chP, chV);
    // Half the pieces burn away in the air; the shader shrinks the same ones.
    const shr = ((sSeed.array[ch.i * 4] * 5.13) % 1) < 0.5 ? 1 - THREE.MathUtils.smoothstep(age, 8, 22) : 1;
    // A landed piece's trail lingers, then fades; nothing cuts.
    if (chP.y <= 15.5 && !ch.landAt) {
      ch.landAt = state.simT; ch.landP = chP.clone();
      // A piece that still has its bulk lands with a flash and a dust dome.
      // The rock mode leaves the ship's dome slots free.
      // A near dome is smaller; a far one must read past the ranges.
      const dk = THREE.MathUtils.clamp(Math.hypot(chP.x - camera.position.x, chP.z - camera.position.z) / 60000, 0.25, 1);
      if (state.tgtKind === 'rock' && shr > 0.3) shipDomes.push({ m: domeVols[ci], t0: state.simT, i: ci, P: new THREE.Vector3(chP.x, 0, chP.z), S: (2600 + 22 * r) * dk });
      // The landing throws a ring of dust.
      if (!reduced()) for (let n = 0; n < 24; n++) {
        const a = rnd() * Math.PI * 2, v = 10 + 25 * rnd();
        puff(dustP.set(chP.x, 4, chP.z), dustV.set(Math.cos(a) * v, 4 + 8 * rnd(), Math.sin(a) * v), 4 + 3 * rnd(), 25 + 30 * rnd());
      }
    }
    // The ember pool cools over about twenty seconds.
    U.uPool.value[ci].set(ch.landP ? ch.landP.x : 0, ch.landP ? ch.landP.z : 0, ch.landAt ? Math.exp(-(state.simT - ch.landAt) / 8) * (1 - THREE.MathUtils.smoothstep(state.simT - ch.landAt, 15, 22)) : 0, r * 3);
    const landed = ch.landAt ? 1 - THREE.MathUtils.smoothstep(state.simT - ch.landAt, 0, 10) : 1;
    const on = Math.min(1, age / 2) * shr * landed * (1 - THREE.MathUtils.smoothstep(age, 50, 58)) * (bt >= 0 ? 1 - THREE.MathUtils.smoothstep(bt, 0, 6) : 1);
    // A faint globe swells as the piece falls and fades as it cools.
    flare(chunkGlow[ci], chP, r * (8 + 0.15 * age) * Math.max(shr, 0.3), on * (0.022 + 0.05 * Math.exp(-age / 6)));
    // Each piece's glow lights the smoke round it.
    U.uDebL.value[ci].set(chP.x, chP.y, chP.z, on * r * (0.35 + 0.8 * Math.exp(-age / 6)));
    // The train reaches all the way back to the burst, where the main trail ends.
    // So the main trail splits into the debris trains.
    // Each joint sits at a fixed share of the age, so no joint jumps.
    // The square packs joints near the burst, where the piece flew fastest.
    chPts[0].copy(chP); chX[0] = 0;
    for (let k = 1; k <= SEG; k++) {
      const f = 1 - k / SEG;
      shardAt(ch.i, age * f * f, chPts[k], chV);
      chX[k] = chX[k - 1] + chPts[k].distanceTo(chPts[k - 1]);
    }
    const len = chX[SEG] + r;
    for (let j = 0; j < SEG; j++) {
      const t = ch.segs[j], seg = chPts[j].distanceTo(chPts[j + 1]);
      if (seg < 1) { t.m.visible = false; continue; }
      chA.subVectors(chPts[j + 1], chPts[j]);
      aimMini(t, chPts[j], chA, r * 0.8 * Math.max(shr, 0.25), len, on, j ? 0 : 0.18 + 0.22 * Math.exp(-age / 8));
      t.pu.uX0.value = chX[j]; t.pu.uSeg.value = seg * 1.03;
      // The far end stays full while the main trail does, and fades with it.
      t.pu.uJoin.value = Math.min(1, 3 * PU.uTrail.value);
      t.pu.uSteps.value = state.rung >= 2 ? 8 : 12;
      // A debris trail widens fast and billows; it frays only a little.
      t.pu.uK.value = 0.06;
      t.pu.uBreak.value = 0.25 * THREE.MathUtils.smoothstep(age, 10, 40);
    }
  }
}
