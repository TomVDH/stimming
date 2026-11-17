// @ts-nocheck
// Load order: play/shot runs first.
import '../play/shot.ts';
import * as THREE from 'three';
import { linFit, reduced } from '../../../shared/stim.js';
import { HULL, hitShip, jointOrder, hulkAt } from '../../ship.js';
import { recoilAt } from '../../salvo.js';
import { state } from '../state.ts';
import { camera, clamp, devSize, opts, rad, rnd, ui } from '../setup.ts';
import { A0, AX, AX_UP, ELEV, L, LIFT, MUZZLE, TRUN_Y, axisAt, barrelPt } from '../world/axis.ts';
import { U } from '../world/uniforms.ts';
import { WELL } from '../gun/gun.ts';
import { ejectCase } from '../gun/case.ts';
import { ast, astAt, astMat, astMesh, astSize, placeAst, turnPath } from '../rock/asteroid.ts';
import { SHIP_MID, SHIP_SCALE, STREAK_R, hulkPos, hulkTurn, ship, shipAim, shipAt, shipMat, shipMeshes, shipPose } from './battleship.ts';
import { PU, smoke } from '../rock/trail.ts';
import { seedFrags, shedSpark } from '../rock/fragments.ts';
import { puff } from '../fx/dust.ts';
import { commitStars, writeStar } from '../fx/burst.ts';
import { grade } from '../post/chain.ts';
import { cam, sight } from '../view/camera.ts';
import { fallT } from '../play/approach.ts';
import { charge, dustP, dustV, rage, ranging, ventP, ventT } from '../play/charge.ts';
import { makeFlare, muzzleFlare } from '../fx/flares.ts';
import { flare, headFlare, hitFlare, hitGlow, muzzleGlow } from '../fx/bowshock.ts';
import { BOLT_SEG, bolt } from '../fx/bolt.ts';
import { tracers } from '../fx/ion.ts';
import { glint, headGlint, headStreak } from '../fx/glints.ts';
import { jets, muzzleSkirt, plume, shellMesh, shockRing, spike, warpM } from '../gun/muzzle.ts';
import { stepMotes } from '../gun/motes.ts';
import { fireVents, flapSound } from '../gun/vents.ts';
import { updateMuzzle } from '../gun/beacon.ts';
import { rumbleDue } from './hulks.ts';
import { burstLight } from '../fx/volumes.ts';
import { SALVO_CAP, bp, bq, bv, clearHits, landOf, newest, roundAt, stepRounds, tgtLead } from '../play/shot.ts';
import { resetReady } from '../play/reset.ts';
import { contactS } from '../rock/strike.ts';
import { wake } from '../loop.ts';
import { kit } from '../sound/kit.ts';
import { queueShipSounds } from '../sound/ship.ts';
import { clunk } from '../sound/motor.ts';

/* ---------- the ship's hit: the kill and the wound ---------- */
// The hit's flash has no tail and a half share.
const SHIP_FLASH = 0.5;
// A wound bends the hull 4 degrees.
// It smoulders for 20 s.
const BEND = rad(4), SMOULDER = 20;
// A hard white point shows first.
// Then a vapour sphere fades inside 1 s.
const shipSpark = makeFlare(linFit(0.98, 0.02, 90));
const shipVapour = makeFlare(linFit(0.9, 0.03, 225), 'float d = length(vUv); float a = (1.0 - smoothstep(0.7, 1.0, d)) * (0.25 + 0.75 * d * d);');
// Each joint flashes once as it fails.
const jointFlares = HULL.joints.map(() => makeFlare(linFit(0.95, 0.08, 70)));
const fxP = new THREE.Vector3(), fxV = new THREE.Vector3(), fxF = new THREE.Vector3(), fxQ = new THREE.Quaternion();
// A random unit vector.
const rndDir = out => out.set(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).normalize();
// A hull-frame point, in the world now.
function hullPt(x, y, out) {
  shipPose(state.simT, fxP, fxQ, fxF);
  return out.set(x, y, 0).multiplyScalar(SHIP_SCALE).applyQuaternion(fxQ).add(fxP);
}
// The bolt strikes the ship at the mid hull.
// r is the round.
// It returns 'wound', 'kill' or null.
export function shipHit(c, r) {
  const res = hitShip(ship, c, state.simT, SHIP_MID.x);
  if (!res) return null;
  const P = shipAim(state.simT, new THREE.Vector3()), kill = res === 'kill';
  // The flash lights the sky round the ship.
  fxV.subVectors(P, camera.position).normalize();
  U.uHit.value.set(fxV.x, fxV.y, fxV.z, 1);
  if (!reduced()) cam.shake += 0.3 * Math.min(c, 1);
  // Molten spray flies out in straight lines, mostly along the bolt.
  const fw = new THREE.Vector3().subVectors(P, r ? r.muzzle : MUZZLE).normalize();
  for (let i = 0, n = kill ? 260 : 90; i < n; i++) {
    const f = rnd();
    rndDir(fxV).addScaledVector(fw, 0.7 * rnd()).normalize().multiplyScalar(300 + 1700 * f * f);
    writeStar(P, state.simT + 0.12 * rnd(), fxV, -0.02, rnd() < 0.6 ? 2 : 0, 1.2 + 2.6 * rnd(), 0.2 + 0.5 * f, 1.3 + 1.5 * rnd(), 0, 0.5 + 0.6 * rnd());
  }
  commitStars();
  // A kill fails each joint in turn.
  // A wound fails the nearest joint.
  const joints = kill ? jointOrder(SHIP_MID.x) : [{ joint: ship.wound.joint, at: 0.12 }];
  ship.fx = { t0: state.simT, P, kill, joints: joints.map(j => ({ joint: j.joint, t: state.simT + j.at, done: false, P: new THREE.Vector3() })) };
  queueShipSounds(ship.fx, Math.min(c, 1.25));
  if (!kill) return res;
  // Each hulk leaves its joints.
  // The ends go fore and aft.
  // The tower goes up.
  ship.go = HULL.sections.map((sec, i) => {
    const dx = shipMeshes[i].userData.c.x - SHIP_MID.x;
    const dir = sec.id === 'tower' ? new THREE.Vector3(-0.3, 1, 0) : new THREE.Vector3(Math.abs(dx) < 1 ? 0 : Math.sign(dx), sec.id === 'mid' ? -0.8 : 0, 0);
    dir.add(fxV.set(0.3 * (rnd() - 0.5), 0.5 * (rnd() - 0.5), rnd() - 0.5)).normalize();
    // Far hulks fly faster, so the end hulks part too.
    const far = Math.abs(dx) * SHIP_SCALE;
    return { dir, pop: 300 + 0.2 * far + 200 * rnd(), v: 30 + 0.012 * far + 20 * rnd(), axis: rndDir(new THREE.Vector3()) };
  });  return res;
}
// A joint fails with a short flash and thrown plates.
function jointBurst(j, wound) {
  hullPt(j.joint, 0, j.P);
  // A wound throws one big plate.
  // A kill throws many.
  for (let i = 0, n = wound ? 1 : 12; i < n; i++) {
    rndDir(fxV).multiplyScalar(wound ? 160 : 100 + 300 * rnd());
    writeStar(j.P, state.simT, fxV, -0.01, rnd() < 0.5 ? 2 : 0, (wound ? 9 : 4) + 4 * rnd(), 0.6, (wound ? 3.4 : 2.2) + rnd(), 3, 0.7);
  }
  for (let i = 0, n = wound ? 30 : 45; i < n; i++) {
    rndDir(fxV).multiplyScalar(400 + 1000 * rnd());
    writeStar(j.P, state.simT + 0.08 * rnd(), fxV, -0.03, 1, 0.6 + 0.8 * rnd(), 0.15, 1.2 + 0.8 * rnd(), 0, 0.9, 2);
  }
  commitStars();
  if (!reduced()) cam.shake += wound ? 0.1 : 0.15;
}
// The smoulder's level, a seconds into a wound.
const smoulderAt = a => THREE.MathUtils.smoothstep(a, 0, 0.4) * (1 - THREE.MathUtils.smoothstep(a, SMOULDER - 6, SMOULDER));
// The ship's hit effects, on the sim clock.
export function stepShipFx(dt) {
  const W = shipMat.uniforms.uWound.value, fx = state.tgtKind === 'ship' ? ship.fx : null;
  if (state.tgtKind === 'ship' && ship.wound) {
    const a = state.simT - ship.wound.t0;
    // The crack glows in a slow, uneven flicker.
    W.set(ship.wound.joint, BEND * THREE.MathUtils.smootherstep(a, 0, 0.8), smoulderAt(a) * (0.85 + 0.15 * Math.sin(state.simT * 7.3) * Math.sin(state.simT * 2.9)), 0);
  } else W.set(0, 0, 0, 0);
  if (!fx) {
    if (shipSpark.visible || shipVapour.visible) shipSpark.visible = shipVapour.visible = false;
    for (const f of jointFlares) f.visible = false;
    return;
  }
  const ha = state.simT - fx.t0, k = state.lit && state.lit.bk ? state.lit.bk : 1;
  flare(shipSpark, fx.P, 1400 * (1 + 0.6 * (1 - Math.exp(-ha / 0.15))), ha < 1.5 ? k * 7 * Math.exp(-ha / 0.12) : 0);
  // The vapour sphere swells and fades inside 1 s.
  flare(shipVapour, fx.P, 500 + 2600 * (1 - Math.exp(-ha / 0.25)), k * 1.1 * THREE.MathUtils.smoothstep(ha, 0, 0.05) * (1 - THREE.MathUtils.smoothstep(ha, 0.25, 0.9)));
  fx.joints.forEach((j, i) => {
    if (!j.done && state.simT >= j.t) { j.done = true; jointBurst(j, !fx.kill); }
    const a = state.simT - j.t;
    flare(jointFlares[i], j.P, 700 + 500 * (1 - Math.exp(-a / 0.1)), j.done && a < 0.8 ? (fx.kill ? 4 : 2.5) * Math.exp(-a / 0.1) : 0);
  });
}
// True while the ship's hit effects need frames.
export function shipBusy() {
  if (state.tgtKind !== 'ship') return false;
  // A gone ship waits for its last dome.
  if (ship.state === 'breakup' || ship.state === 'falling' || ship.state === 'gone') return true;
  if (rumbleDue()) return true;
  return !!ship.wound && state.simT - ship.wound.t0 < SMOULDER + 1;
}
// Sparks per second from each hulk's cracks in vacuum.
const VENT_RATE = 6;
// Burning pieces per second from each hulk in the air.
const SHED_RATE = 0.8;
export let ventN = 0;
const crackP = new THREE.Vector3(), crackB = new THREE.Vector3(), crackV = new THREE.Vector3(), crackQ = new THREE.Quaternion();
const hulkSrc = { pos: new THREE.Vector3(), away: new THREE.Vector3(), side: new THREE.Vector3(), R: 0, vel: new THREE.Vector3() };
// The hulks vent sparks in vacuum.
// In the air they shed burning pieces.
// The counts follow the sim step.
// A long jump sends one short burst.
export function stepHulks(dt) {
  if (state.tgtKind !== 'ship' || !ship.go || dt <= 0 || reduced()) return;
  ship.hulks.forEach((h, i) => {
    if (h.breakAt === null) return;
    const age = state.simT - h.breakAt;
    if (age <= 0 || age >= h.fallT) return;
    const a = hulkAt(h, age), m = shipMeshes[i], src = hulkSrc;
    hulkPos(i, state.simT, src.pos);
    // The hulk's velocity, in metres per second.
    src.vel.subVectors(src.pos, hulkPos(i, state.simT - 0.25, crackB)).multiplyScalar(4);
    if (a.entry < 1) {
      hulkTurn(i, state.simT, crackQ);
      const cr = m.userData.cracks;
      for (let n = Math.min(10, Math.floor(dt * VENT_RATE * (1 - a.entry) + rnd())); n > 0; n--) {
        crackP.copy(cr[Math.floor(rnd() * cr.length)]).sub(m.userData.c).multiplyScalar(SHIP_SCALE).applyQuaternion(crackQ).add(src.pos);
        rndDir(crackV).multiplyScalar(150 + 450 * rnd()).add(src.vel);
        writeStar(crackP, state.simT, crackV, -0.03, 1, 0.5 + 0.9 * rnd(), 0.15, 1.2 + 0.8 * rnd(), 0, 0.8, 2);
        ventN++;
      }
    }
    if (a.entry > 0) {
      src.away.copy(src.vel).negate().normalize();
      src.side.set(0, 1, 0).cross(src.away);
      if (src.side.lengthSq() < 1e-6) src.side.set(1, 0, 0);
      src.side.normalize();
      src.R = STREAK_R * m.geometry.boundingSphere.radius * SHIP_SCALE;
      for (let n = Math.min(4, Math.floor(dt * SHED_RATE * a.entry + rnd())); n > 0; n--) shedSpark(0, src);
    }
  });
}
export function respawn() {
  // Each new rock turns a fresh face to the eye.
  astMesh.quaternion.random();
  seedFrags();
  ast.s = 0; ast.state = 'approach'; ast.holdT = 0;
  clearHits();
  // Each new rock rolls its size.
  // Random runs through the three common sizes; Aerosmith is picked on purpose.
  if (devSize === 'random') { const ks = ['boulder', 'mountain', 'moon']; opts.size = ks[(ks.indexOf(opts.size) + 1) % ks.length]; }
  // Each rock comes in a little to one side of the last.
  turnPath(ast.next);
  PU.uTrail.value = 0;
  placeAst();
  astSize();
  astMesh.visible = true;
  smoke.visible = true;
}
// The gun's aim: yaw left of negative z, elevation over the plain.
// vy and ve: slew rates. dy and de: the error to the target.
export const aimNow = { yaw: 0, elev: ELEV, sy: 0, se: ELEV, err: 0, vy: 0, ve: 0, dy: 0, de: 0 };
// The cradle's kick and the deck's sway, in radians.
export const kick = { p: 0, y: 0 };
export function setAim(yaw, elev) {
  aimNow.yaw = yaw; aimNow.elev = elev;
  applyAim();
}
// The cradle rocks on its trunnions as the gun brakes: p and y, rates vp and vy.
export const sway = { p: 0, y: 0, vp: 0, vy: 0 };
// The drawn aim adds the kick and the sway to the commanded aim.
function applyAim() {
  const yaw = aimNow.yaw + kick.y + sway.y, elev = aimNow.elev + kick.p + sway.p;
  state.SE = Math.sin(elev); state.CE = Math.cos(elev); state.SY = Math.sin(yaw); state.CY = Math.cos(yaw);
  AX.set(-state.SY * state.CE, state.SE, -state.CY * state.CE);
  AX_UP.set(state.SY * state.SE, state.CE, state.CY * state.SE);
  U.uDrop.value.set(Math.cos(ELEV - elev), Math.sin(ELEV - elev));
  U.uYaw.value.set(state.CY, state.SY);
  axisAt(1, MUZZLE);
  // The shadow map redraws after a visible turn.
  if (Math.abs(yaw - aimNow.sy) + Math.abs(elev - aimNow.se) > 3e-4) { aimNow.sy = yaw; aimNow.se = elev; state.shadowDirty = true; }
}
const aimP = new THREE.Vector3();
// Free aim: the arrow keys or WASD lay the gun by hand.
// Left turns the muzzle to the frame's left; up raises it.
export const manual = { on: false, yaw: 0, elev: rad(8), hold: 0, idle: 0 };
export const tkeys = new Set();
export const TRAV = { ArrowLeft: [1, 0], KeyA: [1, 0], ArrowRight: [-1, 0], KeyD: [-1, 0], ArrowUp: [0, 1], KeyW: [0, 1], ArrowDown: [0, -1], KeyS: [0, -1] };
export function setAimMode(v) {
  manual.on = v === 'free';
  if (manual.on) { manual.yaw = aimNow.yaw; manual.elev = aimNow.elev; }
  wake();
}
function stepTraverse(dt) {
  if (dt <= 0) return;
  if (!tkeys.size) {
    manual.hold = 0;
    // Left alone for five seconds, the gun goes back to its default lay.
    const busyGun = charge || ranging || (state.shot && !state.shot.hit);
    manual.idle = busyGun ? 0 : manual.idle + dt;
    if (manual.on && manual.idle > 5) ui.setting('aim').set('track', true);
    return;
  }
  manual.idle = 0;
  // The first key press hands the gun over to the keys.
  if (!manual.on) ui.setting('aim').set('free', true);
  let y = 0, e = 0;
  for (const k of tkeys) { y += TRAV[k][0]; e += TRAV[k][1]; }
  // A heavy mount: it starts slow and builds over four seconds of hold.
  manual.hold += dt;
  const ramp = THREE.MathUtils.smoothstep(manual.hold, 0, 4);
  manual.yaw += Math.sign(y) * rad(1.5 + 13.5 * ramp) * dt;
  manual.elev = clamp(manual.elev + Math.sign(e) * rad(1 + 5 * ramp) * dt, rad(2), rad(state.tgtKind === 'ship' ? 50 : 35));
}
// In ship mode the gun rests laid on the risen ship.
// A broken ship is no target.
// The gun parks.
const laidP = new THREE.Vector3();
export function shipLaid() {
  if (state.tgtKind !== 'ship') return false;
  if (ship.state === 'station' || ship.state === 'wounded') return true;
  return ship.state === 'arrive' && shipAt(state.simT, laidP).y > A0.y;
}
// The parked aim: straight down the causeway, eight degrees up.
const PARK = new THREE.Vector3(0, Math.sin(rad(8)), -Math.cos(rad(8)));
// At rest the gun parks.
// A hold traverses it to lead the rock by the bolt's flight time.
export function stepAim(dt, snap = false) {
  stepTraverse(dt);
  if (state.shot && !state.shot.hit) return;
  // After the hit the gun waits, then parks; laid by hand, it stays where it is put.
  if (!manual.on && !snap && state.shot && state.shot.hit && state.simT - state.shot.t0 < state.shot.hitT + 2.5) return;
  const parking = !manual.on && !charge && state.shot && state.shot.hit;
  if (manual.on) aimP.set(-Math.sin(manual.yaw) * Math.cos(manual.elev), Math.sin(manual.elev), -Math.cos(manual.yaw) * Math.cos(manual.elev));
  // The gun starts to lay on the rock as the ranging starts.
  else if ((charge || ranging) && state.tgtKind === 'rock' && ast.state !== 'shatter') astAt(Math.min(contactS(), ast.s + 10 / fallT()), aimP).sub(A0);
  // A ship at rest keeps the gun laid on it.
  else if (shipLaid()) tgtLead(9.7, aimP).sub(A0);
  else aimP.copy(PARK);
  // The short way round: the mount turns a full circle.
  let dy = Math.atan2(-aimP.x, -aimP.z) - aimNow.yaw;
  dy -= Math.PI * 2 * Math.round(dy / (Math.PI * 2));
  const de = Math.atan2(aimP.y, Math.hypot(aimP.x, aimP.z)) - aimNow.elev;
  aimNow.dy = dy; aimNow.de = de; aimNow.err = Math.hypot(dy, de);
  // The gun's swing home: its first error, for the breech's half-way cue.
  if (parking && state.shot.parkErr0 == null) state.shot.parkErr0 = aimNow.err;
  // The target's own turn rate, for the feed-forward.
  const ty = aimNow.yaw + dy, te = aimNow.elev + de;
  if (snap) { aimNow.vy = aimNow.ve = 0; aimNow.ty = ty; aimNow.te = te; setAim(ty, te); return; }
  if (dt <= 0) return;
  // A low-pass keeps a target switch from jolting the feed-forward.
  const fy = aimNow.ty == null ? 0 : clamp(wrapPi(ty - aimNow.ty) / dt, -SLEW.yaw.v, SLEW.yaw.v), fe = aimNow.te == null ? 0 : clamp((te - aimNow.te) / dt, -SLEW.elev.v, SLEW.elev.v);
  const lp = Math.min(1, dt / 0.4);
  aimNow.fy = (aimNow.fy || 0) + (fy - (aimNow.fy || 0)) * lp; aimNow.fe = (aimNow.fe || 0) + (fe - (aimNow.fe || 0)) * lp;
  aimNow.ty = ty; aimNow.te = te;
  const settled = aimNow.err < 1e-5 && Math.abs(aimNow.vy) + Math.abs(aimNow.ve) < 1e-5;
  if (settled && Math.abs(sway.p) + Math.abs(sway.y) < 1e-6) return;
  // Each axis ramps up, cruises and brakes onto the target.
  // By hand the gun turns faster and harder.
  const M = manual.on ? SLEW.hand : SLEW;
  const vy0 = aimNow.vy, ve0 = aimNow.ve;
  aimNow.vy = slewAxis(dy, aimNow.vy, aimNow.fy, M.yaw, dt);
  aimNow.ve = slewAxis(de, aimNow.ve, aimNow.fe, M.elev, dt);
  // The braking rocks the cradle; the sway rings down in a few seconds.
  stepSway((aimNow.vy - vy0) / dt, (aimNow.ve - ve0) / dt, dt);
  setAim(aimNow.yaw + aimNow.vy * dt, aimNow.elev + aimNow.ve * dt);
}
const wrapPi = a => a - Math.PI * 2 * Math.round(a / (Math.PI * 2));
// Slew limits per axis: top speed v and acceleration a, in radians.
// The mount traverses faster than the cradle climbs.
const SLEW = { yaw: { v: rad(3.2), a: rad(2) }, elev: { v: rad(2.4), a: rad(1.5) }, hand: { yaw: { v: rad(16), a: rad(10) }, elev: { v: rad(7), a: rad(6) } } };
// One axis: the speed that stops on the target, plus the target's own rate.
// The square-root ramp brakes at the axis's own acceleration.
function slewAxis(d, v, rate, L, dt) {
  const a = Math.abs(d), want = Math.sign(d) * Math.min(L.v, Math.sqrt(2 * L.a * a * 0.9), 3 * a);
  const vd = clamp(want + clamp(rate, -L.v, L.v), -1.2 * L.v, 1.2 * L.v);
  return v + clamp(vd - v, -L.a * dt, L.a * dt);
}
// The sway: a damped spring at 0.8 Hz that the slew's acceleration drives.
function stepSway(ay, ae, dt) {
  if (reduced()) { sway.p = sway.y = sway.vp = sway.vy = 0; return; }
  const W = 2 * Math.PI * 0.8, Z = 0.22, K = 0.9;
  sway.vy += (-W * W * sway.y - 2 * Z * W * sway.vy - K * ay) * dt;
  sway.vp += (-W * W * sway.p - 2 * Z * W * sway.vp - K * ae) * dt;
  sway.y += sway.vy * dt; sway.p += sway.vp * dt;
}
// Sand streams: each pours small puffs straight down from a ledge.
export const sandStreams = [];
function stepSand(dt) {
  for (let i = sandStreams.length - 1; i >= 0; i--) {
    const s = sandStreams[i], a = state.simT - s.t0;
    if (a > s.dur) { sandStreams.splice(i, 1); continue; }
    if (a < 0) continue;
    s.acc += dt * 14 * (1 - a / s.dur);
    for (; s.acc >= 1; s.acc--) {
      dustV.set((rnd() - 0.5) * 1.5, -12 - rnd() * 6, (rnd() - 0.5) * 1.5);
      puff(dustP.copy(s.p).add(bq.set((rnd() - 0.5) * 3, 0, (rnd() - 0.5) * 3)), dustV, 2.5 + rnd(), 3 + rnd() * 3);
    }
  }
}
// Variable recoil: the slide shortens where the breech would strike.
// Over the well the counterweight may drop to its floor.
// Past the well it must clear the deck, then the apron and teeth.
const CW = { a: -368, u: -35, gap: 8 };
function cwClear(s, se, ce) {
  const a = CW.a - 0.85 * s, z = -a * ce + CW.u * se, y = TRUN_Y + a * se + CW.u * ce - LIFT;
  // The base's height under z: well, deck, apron and teeth, then the plain.
  const floor = z < WELL.z1 - 6 ? WELL.floor : z < 396 ? 34 : z < 477 ? 30 : z < 529 ? 30 * (529 - z) / 52 : 4;
  return y >= floor + CW.gap;
}
export function recoilRoom() {
  const e = aimNow.elev + kick.p, se = Math.sin(e), ce = Math.cos(e);
  for (let s = 0; s <= 420; s += 5) if (!cwClear(s, se, ce)) return Math.max(0, s - 5);
  return 1e9;
}
// A soft knee eases the slide into the buffer.
function capRecoil(v) {
  const r = recoilRoom(), k = 0.8 * r;
  return v <= k ? v : k + (r - k) * (1 - Math.exp(-(v - k) / Math.max(r - k, 1e-3)));
}
// The run-out: the barrel holds back, then the recuperator draws it home.
// It speeds up, then the buffer eases it onto battery.
const RUN = { hold: 0.6, t: 4.2 };
function runOut(ra) {
  const u = clamp((ra - RUN.hold) / RUN.t, 0, 1);
  return 1 - u * u * u * (u * (6 * u - 15) + 10);
}
export function stepShot(dt) {
  stepRounds();
  stepSand(dt);
  stepMotes(dt);
  // Flashes and kicks let go.
  cam.shake *= Math.exp(-dt / 0.4);
  cam.kickP *= Math.exp(-dt / 0.3); cam.kickY *= Math.exp(-dt / 0.3);
  // The blast light: a hard flash, then a slow fireball.
  if (state.lit) {
    const ha = state.simT - state.lit.t0 - state.lit.hitT;
    // A ship's hit has no fireball.
    // The flash has no tail.
    if (state.lit.kind === 'ship') state.hitFlash = SHIP_FLASH * state.lit.bk * Math.exp(-ha / 0.4);
    else state.hitFlash = state.lit.bk * (Math.exp(-ha / 0.4) + 0.3 * Math.exp(-ha / 5) + burstLight(ha));
  } else state.hitFlash *= Math.exp(-dt / 0.35);
  U.uHit.value.w = state.hitFlash;
  // uBlast: the blast's world place and the same strength as hitFlash.
  if (state.blastFx) U.uBlast.value.set(state.blastFx.P.x, state.blastFx.P.y, state.blastFx.P.z, state.hitFlash > 0.003 ? state.hitFlash : 0);
  else U.uBlast.value.w = 0;
  // The power holds after the fireball; the shaders taper the light.
  if (state.blastFx) U.uBk.value = (state.lit ? state.lit.bk : state.blastFx.k) * (reduced() ? 0.5 : 1);
  // The barrel cools in about ten seconds.
  U.uHeat.value *= Math.exp(-dt / 3.5);
  U.uDustLoad.value *= Math.exp(-dt / 60);
  U.uHeatT.value *= Math.exp(-dt / 40);
  if (U.uHeatT.value < 0.01) U.uHeatT.value = 0;
  if (U.uDustLoad.value < 0.002) U.uDustLoad.value = 0;
  if (U.uHeat.value < 0.003) U.uHeat.value = 0;
  if (ast.state === 'shatter') astMat.uniforms.uBurn.value *= Math.exp(-dt / 0.6);
  // The smoke outlives the fire, then grows back behind the next rock.
  // After the hit the tail fades out as a whole over about 90 s.
  // It drifts on a high wind and thins as it goes.
  if (ast.state === 'shatter' && ast.hitAt != null) {
    const ha = state.simT - ast.hitAt;
    // The whole tail drifts; it starts to thin 2.5 s after the hit.
    // x eases in, then grows at one rate, so the fade starts soft and keeps pace.
    const x = Math.max(0, ha - 2.5), s = x * x / (x + 1.5);
    PU.uCut.value = 1e9;
    PU.uDrift.value.set(45, 8, 15).multiplyScalar(ha);
    // The density falls by e every 10 s; erosion opens it as it goes.
    PU.uBreak.value = 0.5 * (1 - Math.exp(-s / 30));
    // A small shove only, so the trail still runs into the fireball.
    PU.uSwipe.value.z = 0.12 * (1 - Math.exp(-ha / 2.5));
    PU.uTrail.value = Math.exp(-s / 10) * (1 - THREE.MathUtils.smoothstep(ha, 60, 90));
  } else if (ast.state !== 'shatter') {
    PU.uCut.value = 1e9; PU.uDrift.value.set(0, 0, 0); PU.uBreak.value = 0; PU.uSwipe.value.z = 0;
    PU.uTrail.value = Math.min(1, PU.uTrail.value + dt / 3);
  }
  // Steam rises off the hot barrel.
  if (U.uHeat.value > 0.15 && !reduced()) {
    for (let n = Math.floor(dt * 14 * U.uHeat.value + rnd()); n > 0; n--) {
      barrelPt(460 + rnd() * (L - 460), (rnd() - 0.5) * 20, 18, dustP);
      dustV.set(1.5 + rnd() * 2, 4 + rnd() * 5, (rnd() - 0.5) * 2);
      puff(dustP, dustV, 3 + rnd() * 2, 6 + rnd() * 8, true);
    }
  }
  if (!state.shot) {
    U.uFire.value *= Math.exp(-dt / 0.15);
    if (U.uRecoil.value) { U.uRecoil.value = 0; state.shadowDirty = true; }
    if (kick.p || kick.y) { kick.p = kick.y = 0; applyAim(); }
    // The vent sends a shock ring out over the plain.
    const va = state.simT - ventT;
    if (va < 14) {
      barrelPt(L * 0.6, 0, 0, ventP);
      U.uShocks.value[0].set(ventP.x, ventP.z, 340 * va, (reduced() ? 0.6 : 1.2) * (Math.max(0, 1 - va / 14) + 1.5 * Math.exp(-va / 1.5)));
    }
    return;
  }
  const age = state.simT - state.shot.t0, nw = newest(state.shot), ra = nw.ra, gp = nw.gp;
  U.uFire.value = Math.exp(-(ra + 0.3) / 0.15);
  // The barrel slams back 320 m, holds half a second, then runs out over seconds.
  // Recoil starts once the slug has left the muzzle, 0.3 s after the release.
  // A salvo kicks harder round by round, up to the clearance point.
  if (state.shot.salvo) U.uRecoil.value = reduced() ? 0 : recoilAt(age, state.shot.n, SALVO_CAP);
  else U.uRecoil.value = reduced() || ra <= 0 ? 0 : 320 * Math.min(state.shot.c, 1.25) * (1 - Math.exp(-ra / 0.06)) * runOut(ra);
  U.uRecoil.value = Math.max(U.uRecoil.value, state.shot.slide0 * Math.exp(-age / 0.6));
  U.uRecoil.value = capRecoil(U.uRecoil.value);
  state.shadowDirty = true;
  // The barrel seats at battery: a thunk, a jolt, a nod of the cradle.
  if (!state.shot.salvo && !state.shot.battery && ra > RUN.hold + RUN.t) {
    state.shot.battery = true;
    if (!reduced()) { cam.shake += 0.3 * gp; sway.vp -= rad(0.12) * gp; }
    const ac = kit.live();
    if (ac) clunk(ac, 1.2 * gp);
  }
  // The cradle kicks up 0.5 degrees and settles; the deck sways.
  if (!reduced()) {
    kick.p = ra > 0 ? rad(0.5) * gp * 1.55 * Math.exp(-ra / 0.6) * Math.sin(ra * Math.PI / 0.6) : 0;
    kick.y = ra > 0 ? rad(0.1) * gp * Math.exp(-ra / 0.8) * Math.sin(ra * 2 * Math.PI / 0.9) : 0;
  }
  applyAim();
  // Each round blasts as it leaves the muzzle.
  if ((state.shot.blasts || 0) < nw.j && ra >= 0) { state.shot.blasts = nw.j; blast(state.shot, gp); }
  // The Mach ring reaches the eye: a jolt, no sound of its own.
  if (!state.shot.jolt && age >= state.shot.arrive) { state.shot.jolt = true; cam.shake += 0.6 * state.shot.c; }
  // The back vents blow in a ripple; then the flap opens and the case leaves.
  // Half-way home the back vents blow; then the flap opens and the case leaves.
  // Laid by hand the gun does not park: the breech cycles 3.5 s after the hit.
  const halfHome = state.shot.parkErr0 != null && (state.shot.parkErr0 < 0.01 || aimNow.err < 0.5 * state.shot.parkErr0);
  if (!state.shot.vented && state.shot.hit && (halfHome || (manual.on && age > state.shot.hitT + 3.5) || age > state.shot.hitT + 12)) { state.shot.vented = true; state.shot.ventT = age; fireVents(); }
  if (!state.shot.flapped && state.shot.vented && age > state.shot.ventT + 0.7) { state.shot.flapped = true; flapSound(); }
  // The breech throws the spent case just before the gun parks.
  if (!state.shot.ejected && state.shot.vented && age > state.shot.ventT + 1.0) { state.shot.ejected = true; ejectCase(); }
  // After a kill the Reset chip glows; only a press starts the timelapse.
  // A wound leaves the ship alive, so the chip stays dark.
  if (state.lit && state.lit.res !== 'wound' && state.simT - state.lit.t0 > state.lit.hitT + 6) resetReady(true);
  // A ship's hit has no fire.
  // The next shot comes sooner.
  if (age > state.shot.hitT + (state.shot.kind === 'ship' ? 15 : 50) && age > state.shot.arrive + 1) endShot();
}
// The shot ends. A shattered sky waits for Reset.
export function endShot() {
  state.shot = null; state.lit = null;
  bolt.visible = false;
  flare(headFlare, MUZZLE, 1, 0);
}

// The blast: the slug leaves the muzzle.
function blast(sh, k = sh.c) {
  cam.shake += 2.3 * k; cam.kickP += rad(1.0) * k; cam.kickY -= rad(0.3) * k;
  // shotDust carries the dust of the blast.
}
// The ribbon, the head and the flares, each drawn frame.
// The last stretch: the slug's light dies away into the distance before it strikes.
function farFade(r, a) {
  const ux = 1 - Math.pow(1 - Math.min(1, Math.max(0, (a - 0.3) / r.T)), 2.6);
  return 1 - THREE.MathUtils.smoothstep(ux, 0.84, 0.97);
}
// Each round's ribbon: one hot streak with shock diamonds behind the head.
// It returns the leading round in flight.
function updateRibbons() {
  let lead = null;
  for (const t of tracers) {
    const r = t.round, a = r ? state.simT - r.s0 : -1, land = r ? landOf(r) : 0;
    const live = !!r && a >= 0 && a < land + 0.3;
    t.bolt.visible = live;
    if (!live) continue;
    if (!lead || r.s0 < lead.s0) lead = r;
    const tail = 0.55 + 0.03 * r.T, g = t.bolt.geometry;
    const p0 = g.attributes.aP0, p1 = g.attributes.aP1, kk = g.attributes.aK;
    const fade = (1 - THREE.MathUtils.smoothstep(a, land, land + 0.3)) * farFade(r, a);
    for (let k = 0; k < BOLT_SEG; k++) {
      const ta = a - tail * (1 - k / BOLT_SEG), tb = a - tail * (1 - (k + 1) / BOLT_SEG);
      roundAt(r, ta, bp); roundAt(r, tb, bq);
      const lag = (a - tb) / tail;
      // Inside the barrel the slug is hidden.
      const b = tb < 0.3 ? 0 : Math.exp(-lag * 4.5) * (1 + 0.45 * Math.cos(lag * 44) * Math.exp(-lag * 3)) * 1.3 * fade;
      // The streak tapers to a point at its tail.
      const taper = 0.12 + 0.88 * Math.exp(-lag * 2.6);
      for (let v = 0; v < 4; v++) {
        const vi = k * 4 + v;
        p0.setXYZ(vi, bp.x, bp.y, bp.z);
        p1.setXYZ(vi, bq.x, bq.y, bq.z);
        kk.setXY(vi, b, taper);
      }
    }
    p0.needsUpdate = p1.needsUpdate = kk.needsUpdate = true;
  }
  return lead;
}
export function updateBolt() {
  const lead = updateRibbons();
  if (!state.shot) {
    // A corona spits at the muzzle at rage.
    const cg = charge && !reduced() ? rage * (0.5 + 0.5 * Math.abs(Math.sin(state.simT * 71) * Math.sin(state.simT * 13.7))) : 0;
    flare(muzzleFlare, MUZZLE, 50 + 70 * cg, 1.6 * cg); flare(muzzleGlow, MUZZLE, 1, 0);
    plume.visible = false; spike.visible = false; shellMesh.visible = muzzleSkirt.visible = shockRing.visible = false; warpM.strength = 0; grade.uniforms.uLF2.value.z = 0;
    for (const j of jets) j.visible = false;
    U.uMuzL.value.set(MUZZLE.x, MUZZLE.y, MUZZLE.z, 1.2 * cg); state.flashNow = 0;
    // The vent's strike lights the gun and the plain.
    const va = state.simT - ventT;
    if (va < 3) {
      const vl = Math.exp(-va / 0.25) * (0.7 + 0.3 * Math.random());
      barrelPt(L * 0.6, 0, -80, ventP);
      U.uMuzL.value.set(ventP.x, ventP.y, ventP.z, 10 * vl);
      flare(muzzleFlare, ventP, 420, 3 * vl);
      state.flashNow = 0.5 * vl;
    }
    glint(headGlint, MUZZLE, AX, 1, 1, 0); glint(headStreak, MUZZLE, AX, 1, 1, 0);
    flare(hitGlow, MUZZLE, 1, 0);
    flare(headFlare, MUZZLE, 1, 0); flare(hitFlare, MUZZLE, 1, 0); U.uBolt.value.w = 0; grade.uniforms.uLF.value.z = 0; grade.uniforms.uGod.value.z = grade.uniforms.uGod.value.w = 0; return; }
  let c = state.shot.c;
  if (lead) {
    // The head's glints and flare follow the leading round.
    const a = state.simT - lead.s0, land = landOf(lead), fade = (1 - THREE.MathUtils.smoothstep(a, land, land + 0.3)) * farFade(lead, a);
    roundAt(lead, a, bp); roundAt(lead, a - 0.02, bq);
    // The glint lies along the flight line.
    bv.subVectors(bp, bq);
    if (bv.lengthSq() < 1e-6) bv.copy(state.shot.ax); else bv.normalize();
    const inGun = a < 0.3, pw = 0.6 + lead.c;
    bq.copy(bp).addScaledVector(bv, inGun ? -40 : -220 * pw);
    glint(headGlint, bq, bv, 1100 * pw, 70 * pw, inGun ? 0 : 5 * fade);
    // A lens streak crosses the head, level with the frame.
    bv.setFromMatrixColumn(camera.matrixWorld, 0);
    glint(headStreak, bp, bv, 800 * pw, 9, inGun ? 0 : 1.6 * fade);
    flare(headFlare, bp, 70 * pw, inGun ? 0 : 1.4 * fade);
    U.uBolt.value.set(bp.x, bp.y, bp.z, inGun ? 0 : 0.8 * pw * fade);
  } else {
    glint(headGlint, MUZZLE, AX, 1, 1, 0); glint(headStreak, MUZZLE, AX, 1, 1, 0);
    flare(headFlare, MUZZLE, 1, 0);
    U.uBolt.value.w = 0;
  }
  // The muzzle flash: a burst as each round leaves.
  const nw = newest(state.shot), ma = nw.ra;
  c = nw.gp; state.shot.jN = nw.j;
  const on = ma > 0 ? 1 : 0, m0 = state.shot.muzzle;
  // A small hot core for a few frames; the spike and the fire carry the rest.
  flare(muzzleFlare, m0, 110 * (0.6 + c), on * c * 9 * Math.exp(-ma / 0.035));
  // A glow globe swells round the muzzle; at night it is the brightest thing on the plain.
  flare(muzzleGlow, m0, 900 * (0.6 + c) * (1 + 0.6 * (1 - Math.exp(-ma / 0.3))), on * c * (0.3 + 0.5 * U.uStars.value) * (0.7 * Math.exp(-ma / 0.35) + 0.3 * Math.exp(-ma / 1.2)));
  // The blast lights the plain and the gun.
  U.uMuzL.value.set(m0.x, m0.y, m0.z, on * 9 * c * Math.exp(-ma / 0.18));
  state.flashNow = on * 0.35 * c * Math.exp(-ma / 0.09);
  updateMuzzle(ma, c, m0);
  // The blast: a white core, a wide warm glow, two shock shells.
  // A ship's hit draws its own flash in stepShipFx.
  const ha = state.lit ? state.simT - state.lit.t0 - state.lit.hitT : 0, hk = state.lit && state.lit.kind !== 'ship' ? state.lit.bk : 0, R = ast.R, hitP = state.lit ? state.lit.target : MUZZLE;
  // A short white core; the fireball carries the rest.
  flare(hitFlare, hitP, R * (2 + 2 * (1 - Math.exp(-ha / 0.4))), hk * 14 * Math.exp(-ha / 0.15));
  // A gentle globe of glow swells a little and lingers after the flash.
  // Its tail follows the fire: strong for 8 s, faint to 40 s.
  flare(hitGlow, hitP, R * (18 + 6 * (1 - Math.exp(-ha / 6))), hk * (0.5 * Math.exp(-ha / 0.5) + 0.1 * Math.exp(-ha / 2.5) + 0.06 * Math.exp(-ha / 8) + 0.01 * Math.exp(-ha / 40)));
  // The whole frame overexposes for an instant.
  if (hk > 0) state.flashNow += hk * (0.6 * Math.exp(-ha / 0.14) + 0.1 * Math.exp(-ha / 1.2));
  // A ship's hit overexposes the frame for a blink only.
  if (state.lit && state.lit.kind === 'ship') state.flashNow += 0.2 * state.lit.bk * Math.exp(-ha / 0.1);
  // A white lens flare with ghosts, if the hit is in front of the lens.
  bq.copy(hitP).project(camera);
  const lfOn = hk > 0 && bq.z < 1 && Math.abs(bq.x) < 1.4 && Math.abs(bq.y) < 1.4;
  grade.uniforms.uLF.value.set(bq.x * 0.5 + 0.5, bq.y * 0.5 + 0.5, lfOn && !sight ? (reduced() ? 0.5 : 1) * hk * (1.3 * Math.exp(-ha / 0.3) + 0.25 * Math.exp(-ha / 2.5)) : 0);
  // God rays from the core for the hot flash, a few seconds; the sky fills with them.
  const gk = lfOn && !sight && ha > 0 ? (reduced() ? 0.4 : 1) * hk * (1.4 * Math.exp(-ha / 0.7) + 0.35 * Math.exp(-ha / 3)) : 0;
  grade.uniforms.uGod.value.set(bq.x * 0.5 + 0.5, bq.y * 0.5 + 0.5, gk, gk);
}
