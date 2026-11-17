// Load order: gun/laser runs first.
import './laser.ts';
import * as THREE from 'three';
import { linFit, reduced } from '../../../shared/stim.js';
import { state } from '../state.ts';
import { camera, rnd } from '../setup.ts';
import { AX, barrelPt } from '../world/axis.ts';
import { U } from '../world/uniforms.ts';
import { ANT, BRAKE_PORTS } from './gun.ts';
import { WHITE } from '../rock/asteroid.ts';
import { puff } from '../fx/dust.ts';
import { writeStar } from '../fx/burst.ts';
import { grade } from '../post/chain.ts';
import { sight } from '../view/camera.ts';
import { charge, ranging, ventT } from '../play/charge.ts';
import { makeFlare } from '../fx/flares.ts';
import { flare } from '../fx/bowshock.ts';
import { glint } from '../fx/glints.ts';
import { volLSteps, volSteps } from '../fx/volfx.ts';
import { jets, muzzleSkirt, plume, shellMesh, shockRing, spike, warpM, zAx } from './muzzle.ts';
import { bv } from '../play/shot.ts';

/* ---------- the antenna's beacon ---------- */
// A faint red light that blinks slowly while the gun idles.
// It goes dark as a charge starts and relights once the gun has parked.
const beacon = makeFlare(linFit(0.62, 0.21, 27));
const beaconP = new THREE.Vector3();
let beaconK = 1;
export function updateBeacon(dt: number) {
  const busyGun = !!charge || !!ranging || (state.shot && !(state.shot.hit && state.simT - state.shot.t0 > state.shot.hitT + 4)) || state.simT - ventT < 4;
  // Out in a breath; back on slowly.
  beaconK = busyGun ? beaconK * Math.exp(-dt / 0.08) : Math.min(1, beaconK + dt / 1.5);
  const blink = 0.35 + 0.65 * THREE.MathUtils.smoothstep(Math.sin(state.simT * Math.PI * 0.8), -0.2, 0.6);
  // The plumb mast's tip: straight up from its foot.
  barrelPt(ANT.a, 0, 49, beaconP).addScaledVector(AX, -0.85 * U.uRecoil.value); beaconP.y += ANT.u - 49;
  flare(beacon, beaconP, 9, sight ? 0 : 0.5 * beaconK * blink * (0.45 + 0.55 * U.uStars.value));
}

const jp = new THREE.Vector3();
const spV = new THREE.Vector3(), spP = new THREE.Vector3();
// The armature burns off as the slug leaves.
// Sparks spray forward in a cone; heavy drops of molten metal lob and fall.
function muzzleSpray(m0: THREE.Vector3, cc: number, ax: THREE.Vector3, side: THREE.Vector3, up: THREE.Vector3) {
  const few = reduced() ? 0.3 : 1;
  const cone = (spread: number, out: THREE.Vector3) => {
    const a = rnd() * Math.PI * 2, r = spread * Math.sqrt(rnd());
    return out.copy(ax).addScaledVector(side, Math.cos(a) * r).addScaledVector(up, Math.sin(a) * r).normalize();
  };
  // Fine sparks: white-hot, then orange, gone in about two seconds.
  // The core of the cone is a long spear; a quarter fan out wide and slow.
  for (let i = Math.round(70 * cc * few); i > 0; i--) {
    const wide = rnd() < 0.25;
    cone(wide ? 0.5 : 0.12, spV).multiplyScalar(wide ? 400 + 600 * rnd() : 1000 + 1800 * rnd());
    spP.copy(m0).addScaledVector(ax, 10 * rnd());
    writeStar(spP, state.simT + 0.03 * rnd(), spV, wide ? 1.4 + rnd() : 0.8 + 0.8 * rnd(), 1, 0.8 + 1.8 * rnd(), 0.1 + 0.16 * rnd(), 1.1 + 1.4 * rnd(), 2, 1.1, 2);
  }
  // Molten drops: slower, heavier, long trails; they arc down onto the plain.
  for (let i = Math.round(7 * cc * few); i > 0; i--) {
    cone(0.35, spV).multiplyScalar(260 + 420 * rnd());
    spV.addScaledVector(up, 60 + 80 * rnd());
    writeStar(m0, state.simT + 0.05 * rnd(), spV, 0.35 + 0.3 * rnd(), 2, 2.6 + 1.6 * rnd(), 0.35 + 0.25 * rnd(), 2.2 + 1.6 * rnd(), 3, 1.0, 0);
  }
  // The brake's ports spit short side sprays.
  for (const a of BRAKE_PORTS) for (const sd of [-1, 1]) for (let k = Math.round(3 * cc * few); k > 0; k--) {
    barrelPt(a, sd * 24, 0, spP);
    spV.copy(side).multiplyScalar(sd * (250 + 400 * rnd())).addScaledVector(ax, 80 + 160 * rnd()).addScaledVector(up, (rnd() - 0.3) * 160);
    writeStar(spP, state.simT, spV, 2.0 + rnd(), 1, 0.4 + 0.7 * rnd(), 0.06 + 0.08 * rnd(), 1 + rnd(), 2, 0.9, 2);
  }
}
// ma: seconds since the slug left. c: power. m0: the muzzle at the shot.
export function updateMuzzle(ma: number, c: number, m0: THREE.Vector3) {
  const on = ma > 0, cc = Math.min(c, 1.25);
  // The plume drifts with the wind and coasts on along the bore.
  const pu = plume.material.uniforms, age = Math.max(ma, 0), Lj = 900 * cc * (1 - Math.exp(-age / 0.05));
  pu.uMz.value.copy(m0); pu.uMx.value.copy(state.shot!.ax);
  pu.uDrift.value.set(6 * age, 2.5 * age, 0).addScaledVector(state.shot!.ax, 120 * (1 - Math.exp(-age / 1.5)));
  // Reduced motion halves the fire.
  pu.uPl.value.set(age, cc, Lj, (reduced() ? 4 : 8) * cc * Math.exp(-age / 0.18));
  const Rm = 16 + 0.23 * Lj + 75 * Math.sqrt(age);
  pu.uC.value.copy(m0).add(pu.uDrift.value).addScaledVector(state.shot!.ax, 0.45 * Lj);
  pu.uR.value = 0.8 * Lj + Rm;
  pu.uVSteps.value = volSteps(); pu.uLSteps.value = volLSteps(); pu.uLs.value = 0.05 * pu.uR.value;
  // The conical plume is off; the flash, the disc and the brake smoke carry the shot.
  plume.visible = false;
  // The barrel glows once the slug has left it.
  if (on && state.shot!.heated !== state.shot!.jN) {
    state.shot!.heated = state.shot!.jN; U.uHeat.value = Math.max(U.uHeat.value, 0.75 + 0.4 * cc); U.uHeatT.value = 1;
    // The blast throws its smoke out of the muzzle.
    state.muzzleFx = { t0: state.simT, P: m0.clone(), ax: state.shot!.ax.clone(), k: Math.min(1, 0.5 + 0.5 * cc) };
  }
  // The bore throws a cone of burning plasma once.
  if (on && state.shot!.sprayed !== state.shot!.jN) { state.shot!.sprayed = state.shot!.jN; muzzleSpray(m0, cc, state.shot!.ax, state.shot!.side, state.shot!.up); }
  // Six jets for 0.15 s.
  const jg = on ? 3.5 * cc * Math.exp(-ma / 0.06) : 0;
  // The brake spits smoke out of its ports once, sideways; it drifts and thins.
  if (on && state.shot!.puffed !== state.shot!.jN && !reduced()) {
    state.shot!.puffed = state.shot!.jN;
    for (const a of BRAKE_PORTS) for (const sd of [-1, 1]) for (let k = 0; k < 5; k++) {
      barrelPt(a, sd * 24, 0, jp);
      bv.copy(state.shot!.side).multiplyScalar(sd * (50 + 70 * rnd()) * cc).addScaledVector(state.shot!.ax, 10 + 25 * rnd()).addScaledVector(state.shot!.up, 4 + 10 * rnd());
      puff(jp, bv, 2 + 1.5 * rnd(), 18 + 22 * rnd(), true);
    }
  }
  jets.forEach((j, i) => {
    const sd = i % 2 ? 1 : -1, a = BRAKE_PORTS[i >> 1];
    barrelPt(a, sd * 24, 0, jp);
    bv.copy(state.shot!.side).multiplyScalar(sd);
    glint(j, jp, bv, 250 * cc, 22, jg > 0.02 ? jg * 1.3 : 0);
  });
  // A bright, brief flash.
  flare(spike, m0, 700 * (0.6 + cc), on ? 2.4 * cc * Math.exp(-ma / 0.05) : 0);
  // Its streak crosses the frame for a tenth of a second.
  jp.copy(m0).project(camera);
  grade.uniforms.uLF2.value.set(jp.x * 0.5 + 0.5, jp.y * 0.5 + 0.5, on && jp.z < 1 ? (reduced() ? 0.5 : 1) * 1.1 * cc * Math.exp(-ma / 0.1) : 0);
  // The shell runs out ahead of the muzzle and burns off in a second.
  const sg = 0, su = shellMesh.material.uniforms;
  su.uR.value = 30 + 650 * (1 - Math.exp(-ma / 0.3));
  su.uC.value.copy(m0).addScaledVector(state.shot!.ax, 0.6 * su.uR.value);
  su.uGain.value = reduced() ? sg * 0.5 : sg;
  shellMesh.visible = sg > 0.01;
  // The skirt grows round the muzzle to about a kilometre and fades.
  // A circular shock ring square to the bore: a flat shell shows only its rim.
  const ku = muzzleSkirt.material.uniforms, kr = 30 + 750 * (1 - Math.exp(-ma / 0.35));
  ku.uC.value.copy(m0).addScaledVector(state.shot!.ax, 0.05 * kr); ku.uR.value = kr;
  ku.uSq.value.set(state.shot!.ax.x, state.shot!.ax.y, state.shot!.ax.z, 0.1);
  ku.uGain.value = 0;
  // The ring rides out from the muzzle, square to the bore, and fades.
  const rg = 0;
  shockRing.position.copy(m0).addScaledVector(state.shot!.ax, 0.08 * kr);
  shockRing.quaternion.setFromUnitVectors(zAx, state.shot!.ax);
  shockRing.scale.setScalar(kr);
  shockRing.material.uniforms.uGain.value = rg;
  shockRing.material.uniforms.uSeed.value = state.shot!.t0 % 17;
  shockRing.visible = rg > 0.01;
  ku.uEm.value.set(...WHITE).multiplyScalar(3 * Math.exp(-ma / 0.12));
  muzzleSkirt.visible = ku.uGain.value > 0.01;
  warpM.set(m0.x, m0.y, m0.z, kr);
  warpM.strength = on && !reduced() ? cc * Math.exp(-ma / 0.8) : 0;
}
