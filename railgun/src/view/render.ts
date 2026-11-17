// Load order: view/camera runs first.
import './camera.ts';
import * as THREE from 'three';
import { pixelRatio, quality, reduced } from '../../../shared/stim.js';
import { state } from '../state.ts';
import { RES_STEP, camera, gfx, opts, renderer, stage } from '../setup.ts';
import { L, MUZZLE, barrelPt } from '../world/axis.ts';
import { U } from '../world/uniforms.ts';
import { sun, sunDeg } from '../sky/sun.ts';
import { updateShafts } from '../clouds/shafts.ts';
import { FAR_U, farBake, farBaked } from '../world/farcountry.ts';
import { CLOUD_U } from '../clouds/clouds.ts';
import { stepStorms } from '../clouds/lightning.ts';
import { drawGunDepth, drawShadow } from '../world/shadows.ts';
import { ast, astMat, astMesh } from '../rock/asteroid.ts';
import { placeShip } from '../ship/battleship.ts';
import { PU } from '../rock/trail.ts';
import { frags } from '../rock/fragments.ts';
import { updateDust } from '../fx/dust.ts';
import { commitStars, starMat } from '../fx/burst.ts';
import { updateArcs } from '../gun/arcs.ts';
import { bloomPass, composer, fxaa, grade, setSamples } from '../post/chain.ts';
import { sightKey, sightSize } from './sight.ts';
import { aimAst, frame, sight } from './camera.ts';
import { drawAmbient, farLight } from '../play/ambient.ts';
import { over, rage } from '../play/charge.ts';
import { updateBow } from '../fx/bowshock.ts';
import { updateIon } from '../fx/ion.ts';
import type { Warp } from '../gun/muzzle.ts';
import { caseDustV, chargeDust, muzzleSmoke, plume, shotDust, updateCaseDust, updateChargeDust, updateMuzzleSmoke, updateShotDust, warpH, warpM } from '../gun/muzzle.ts';
import { updateVents } from '../gun/vents.ts';
import { updateFlap } from '../gun/flap.ts';
import { updateLaser } from '../gun/laser.ts';
import { updateBeacon } from '../gun/beacon.ts';
import { pullOf } from '../fx/blast.ts';
import { updateDomes } from '../ship/hulks.ts';
import { drawVolumes, updateBlast } from '../fx/volumes.ts';
import { updateBolt } from '../ship/hit.ts';
import { cutFlash, spin } from '../play/reset.ts';
import { updateStrike } from '../rock/strike.ts';
import { vilKey } from '../post/settings.ts';

export function resize() {
  const r = stage.getBoundingClientRect();
  const w = Math.max(1, r.width), h = Math.max(1, r.height);
  // Each rung renders at a smaller share of the quality's resolution.
  // High caps at 2x: the volumes march every pixel.
  // Rung 2 also drops multisampling for FXAA and shrinks the bloom.
  const base = Math.min(2, pixelRatio(w, h, { maxDpr: 1.5, budget: 1.6e6 }));
  state.size = { w, h, dpr: Math.max(0.4, base * RES_STEP[Math.min(state.rung, 3)] * gfx.res) };
  renderer.setPixelRatio(state.size.dpr);
  renderer.setSize(w, h, false);
  setSamples(state.rung >= 2 ? 0 : 4);
  fxaa.enabled = gfx.fxaa === 'on' || (gfx.fxaa === 'auto' && state.rung >= 2);
  bloomPass.compositeMaterial.uniforms.uDirtK.value = state.rung >= 3 ? 0 : 1.6;
  fxaa.material.uniforms.resolution.value.set(1 / (w * state.size.dpr), 1 / (h * state.size.dpr));
  composer.setPixelRatio(state.size.dpr);
  composer.setSize(w, h);
  grade.uniforms.uRes.value.set(w * state.size.dpr, h * state.size.dpr);
  starMat.uniforms.uRes.value.set(w * state.size.dpr, h * state.size.dpr);
  starMat.uniforms.uDpr.value = state.size.dpr;
  // Rungs 2 and 3 march the trail in fewer steps.
  PU.uSteps.value = Math.min(96, Math.round((state.rung >= 3 ? 24 : state.rung >= 2 ? 40 : 72) * gfx.detail));
  PU.uLSteps.value = state.rung >= 2 ? 2 : 4;
  // The far country's march: fewer steps on Standard and on the ladder's rungs.
  FAR_U.uFarSteps.value = state.rung >= 2 ? 140 : quality() === 'high' ? 360 : 260;
  // Rung 2 drops multisampling: the baked edge then cuts at half cover.
  farBaked.uniforms.uA2C.value = state.rung >= 2 ? 0 : 1;
  farBake.dirty = true;
  // Rung 3 drops the ember cracks.
  astMat.uniforms.uCracks.value = state.rung >= 3 ? 0 : 1;
  sightSize();
  frame();
  draw();
}
state.visible = !document.hidden;
export let drawN = 0; state.compiled = false;
export function draw() {
  if (!state.visible || !state.compiled) return;
  drawN++;
  astMesh.rotateOnAxis(ast.spin, 0.0012);
  for (const f of frags) if (f.on) f.m.rotateOnAxis(f.spin, 0.004);
  aimAst();
  // The ship follows the clock and the sun.
  if (state.tgtKind === 'ship') placeShip();
  updateDomes();
  drawAmbient();
  commitStars();
  updateDust();
  updateArcs();
  updateBolt();
  farLight();
  updateIon();
  updateBlast();
  updateStrike();
  updateChargeDust(1 / 30);
  // The blast's dust round the gun: under half its old strength.
  updateShotDust(state.dustShot ? state.simT - state.dustShot.t0 - 0.3 : -1, state.dustShot ? 0.45 * state.dustShot.c : 0, state.dustShot ? state.dustShot.foot : MUZZLE);
  updateCaseDust();
  updateMuzzleSmoke();
  updateVents();
  updateFlap();
  updateBow();
  updateLaser();
  updateBeacon(1 / 30);
  CLOUD_U.uCloudC.value = state.simT;
  updateShafts();
  stepStorms();
  // The thermal lens sees through smoke and dust.
  if (sight) plume.visible = chargeDust.visible = shotDust.visible = caseDustV.visible = muzzleSmoke.visible = false;
  grade.uniforms.uRage.value = reduced() ? 0 : (rage + 1.5 * over) * (0.5 + 0.5 * Math.random());
  grade.uniforms.uFlash.value = (reduced() ? 0.3 * state.flashNow : state.flashNow) + cutFlash;
  if (!reduced()) grade.uniforms.uSeed.value = (grade.uniforms.uSeed.value % 997) + 1;
  updateWarp();
  // The sun creeps three degrees either way over ten minutes; it never sets for it.
  if (Math.abs(state.simT - state.sunT) > 2) {
    state.sunT = state.simT;
    const d0 = sunDeg(opts.sun);
    if (!reduced() && d0 > 3 && !spin) sun(Math.max(2, d0 + 3 * Math.sin(state.simT * Math.PI * 2 / 600)));
  }
  // The eye stops down after the hit's flash and the muzzle's, then opens again.
  const ha = state.simT - U.uHitP.value.w, hk = state.blastFx ? 1 : U.uBk.value > 0 ? 0.6 : 0;
  const ma = state.muzzleFx ? state.simT - state.muzzleFx.t0 : 99;
  const dip = (reduced() ? 0.5 : 1) * (hk * 0.42 * (1 - Math.exp(-ha / 0.2)) * Math.exp(-ha / 3.5) * (ha > 0 ? 1 : 0) + 0.15 * (1 - Math.exp(-ma / 0.1)) * Math.exp(-ma / 1.5));
  renderer.toneMappingExposure = state.baseExp * gfx.exp * (1 - dip);
  grade.uniforms.uExp.value = renderer.toneMappingExposure;
  vilKey();
  // The lens softens on the hit and finds focus again.
  grade.uniforms.uSoft.value = reduced() ? 0 : hk * 0.8 * (1 - Math.exp(-Math.max(ha, 0) / 0.08)) * Math.exp(-Math.max(ha, 0) / 0.6) * (ha > 0 && ha < 6 ? 1 : 0);
  drawShadow();
  drawGunDepth();
  drawVolumes();
  if (sight) sightKey();
  state.farBakeUpdate();
  composer.render();
}
// Project the shock fronts and the hot barrel for the grade's warp.
const wv = new THREE.Vector3(), wb = new THREE.Vector3();
function warpFront(src: Warp, out: THREE.Vector4, gain: number) {
  const s = src.strength || 0;
  wv.set(src.x, src.y, src.z);
  const D = wv.distanceTo(camera.position);
  wv.project(camera);
  if (s < 0.002 || wv.z > 1 || D < 1) { out.w = 0; return; }
  const tn = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
  out.set(wv.x * 0.5 * camera.aspect, wv.y * 0.5, Math.min(src.w / (D * tn * 2), 3), gain * s);
}
// Steer the soot's shadow: it lands far out, then sweeps in over the gun.
const sootFar = new THREE.Vector3(), sootTo = new THREE.Vector3();
function updateSootShade() {
  if (!state.blastFx) return;
  const ha = state.simT - state.blastFx.t0, s = THREE.MathUtils.smoothstep(ha, 2, 24);
  sootFar.set(state.blastFx.P.x, 0, state.blastFx.P.z).sub(camera.position).setY(0).setLength(14000).add(camera.position).setY(0);
  sootTo.set(-1200, 0, -900).lerp(sootFar, 1 - s);
  U.uSootL.value.copy(U.uSootS.value).sub(sootTo).normalize();
}
function updateWarp() {
  updateSootShade();
  const g = grade.uniforms;
  warpFront(warpM, g.uShk0.value, 0.012);
  warpFront(warpH, g.uShk1.value, 0.008);
  // The fire's heat wavers the sky above it: strong for 8 s, faint to 30 s.
  g.uHtA.value.w = 0;
  if (state.blastFx && !reduced() && !sight) {
    const ha = state.simT - state.blastFx.t0, R = state.blastFx.R, Rf = 0.8 * R * (1 + 7 * (1 - Math.exp(-ha / 1.1))) * (1 - 0.45 * pullOf(ha));
    wv.copy(state.blastFx.P).setY(state.blastFx.P.y + 25 * ha + 0.7 * Rf);
    const D = wv.distanceTo(camera.position), tn = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
    wv.project(camera);
    if (wv.z < 1) g.uHtA.value.set(wv.x * 0.5 * camera.aspect, wv.y * 0.5, Math.min(Rf / (D * tn * 2), 1), 0.006 * state.blastFx.k * (0.9 * Math.exp(-ha / 8) + 0.1 * Math.exp(-ha / 30)) * Math.min(1, ha / 0.5));
  }
  // The time drives the shimmer's drift.
  g.uHzK.value.z = state.simT;
  // The barrel shimmers while it is hot.
  const ht = reduced() || sight ? 0 : U.uHeat.value;
  if (ht < 0.02) { g.uHzK.value.y = 0; return; }
  barrelPt(L * 0.15, 0, 0, wv).project(camera); barrelPt(L * 1.02, 0, 0, wb).project(camera);
  g.uHzA.value.set(wv.x * 0.5 + 0.5, wv.y * 0.5 + 0.5, wb.x * 0.5 + 0.5, wb.y * 0.5 + 0.5);
  g.uHzK.value.set(0.025, 0.004 * ht, state.simT);
}
