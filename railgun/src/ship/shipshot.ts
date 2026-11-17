// @ts-nocheck
// Load order: play/reset runs first.
import '../play/reset.ts';
import * as THREE from 'three';
import { linFit, reduced } from '../../../shared/stim.js';
import { state } from '../state.ts';
import { camera, rnd, ui } from '../setup.ts';
import { TRUN_Y } from '../world/axis.ts';
import { ship, shipMeshes } from './battleship.ts';
import { puff } from '../fx/dust.ts';
import { commitStars, writeStar } from '../fx/burst.ts';
import { cam } from '../view/camera.ts';
import { makeFlare } from '../fx/flares.ts';
import { flare } from '../fx/bowshock.ts';
import { glint, makeGlint } from '../fx/glints.ts';
import { wake } from '../loop.ts';

/* ---------- the ship's shot: a test round to the plain ---------- */
// The round leaves the hull's belly.
// It lands on a spot on the plain.
const SSHOT_T = 2;
export const sRound = makeFlare(linFit(0.97, 0.04, 225));
export const sRoundGlint = makeGlint(linFit(0.9, 0.08, 225));
export const sPop = makeFlare(linFit(0.95, 0.16, 95));
export const sPopGlow = makeFlare(linFit(0.8, 0.2, 340));
state.sshot = null;
// The chip keeps its last state.
// The DOM changes only on a change.
let fireOff = true;
const sP = new THREE.Vector3(), sD = new THREE.Vector3(), sV = new THREE.Vector3(), sN = new THREE.Vector3();
// The belly is the hull's -y side.
// The mesh matrix takes it to world space.
function shipBelly(out) {
  const m = shipMeshes[0];
  m.updateMatrixWorld(true);
  return out.set(0, m.geometry.boundingBox.min.y, 0).applyMatrix4(m.matrixWorld);
}
// A spot on the plain, 3 to 8 km out.
// It stays inside a safe band of the frame.
function pickLanding(out) {
  camera.updateMatrixWorld(true);
  const cp = camera.position;
  for (let i = 0; i < 80; i++) {
    const nx = (rnd() * 2 - 1) * 0.7;
    sD.set(nx, 0, 0.5).unproject(camera).sub(cp);
    sD.y = 0;
    if (sD.lengthSq() < 1e-6) continue;
    sD.normalize();
    const d = 3000 + rnd() * 5000;
    out.copy(cp).addScaledVector(sD, d);
    out.y = 0;
    if (Math.hypot(out.x, out.z) < 1800) continue;
    sN.copy(out).project(camera);
    // The fresh point must clear the gun and the frame edge.
    sV.set(0, TRUN_Y * 0.5, 0).project(camera);
    if (sN.z > 1 || Math.abs(sN.x) > 0.8 || Math.abs(sN.y) > 0.9) continue;
    if (Math.hypot(sN.x - sV.x, sN.y - sV.y) < 0.35) continue;
    return out;
  }
  // The fallback sits in frame at all three sizes.
  // It lies 6.6 to 7.5 km out.
  return out.set(600, 0, -4500);
}
function shipShotReady() { return state.tgtKind === 'ship' && (ship.state === 'station' || ship.state === 'wounded'); }
export function shipShot() {
  if (!shipShotReady() || state.sshot) return;
  const from = shipBelly(new THREE.Vector3()), to = pickLanding(new THREE.Vector3());
  state.sshot = { state: 'flight', t0: state.simT, from, to, pos: from.clone(), boomT: 0, ring2: false };
  wake();
}
// The round speeds up all the way down.
// The boom runs on its own clock.
export function stepShipShot(dt) {
  const off = !shipShotReady() || !!state.sshot;
  if (off !== fireOff) ui.setting('shipfire').disabled = fireOff = off;
  if (!state.sshot) return;
  const age = state.simT - state.sshot.t0;
  if (state.sshot.state === 'flight') {
    const u = Math.min(1, age / SSHOT_T), s = u * u;
    state.sshot.pos.lerpVectors(state.sshot.from, state.sshot.to, s);
    sD.subVectors(state.sshot.to, state.sshot.from).normalize();
    const dist = state.sshot.pos.distanceTo(camera.position);
    const spd = 2 * state.sshot.from.distanceTo(state.sshot.to) * u / SSHOT_T;
    // A floor of 1.6 mrad keeps the far round a visible point.
    flare(sRound, state.sshot.pos, Math.max(10, dist * 0.0016), 2.2);
    const len = Math.min(spd * 0.05, dist * 0.3);
    sP.copy(state.sshot.pos).addScaledVector(sD, -len);
    glint(sRoundGlint, sP, sD, len, 2.5, 1.6 * (0.3 + u));
    if (u >= 1) {
      state.sshot.state = 'boom'; state.sshot.boomT = state.simT;
      sRound.visible = false; sRoundGlint.visible = false;
      sillyBoom(state.sshot.to);
    }
    return;
  }
  const a = state.simT - state.sshot.boomT;
  // A second, smaller bounce of the ring.
  if (!state.sshot.ring2 && a > 0.35) { state.sshot.ring2 = true; sillyRing(state.sshot.to, 0.6); }
  // The pop overshoots, then settles like a cartoon spring.
  const spring = 1 - Math.exp(-9 * a) * Math.cos(16 * a);
  flare(sPop, state.sshot.to, 700 * Math.max(0, spring), 3.2 * Math.exp(-a / 0.45));
  flare(sPopGlow, state.sshot.to, 2200 * Math.min(1, a * 3), 0.9 * Math.exp(-a / 0.9));
  if (a > 3) { sPop.visible = false; sPopGlow.visible = false; }
  if (a > 5) { state.sshot = null; sPop.visible = sPopGlow.visible = false; }
}
function sillyRing(p, k) {
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2 + rnd() * 0.3, v = (260 + 120 * rnd()) * k;
    puff(sP.set(p.x, 6, p.z), sV.set(Math.cos(a) * v, 60 + 90 * rnd(), Math.sin(a) * v), 3.5 + 1.5 * rnd(), (260 + 160 * rnd()) * k);
  }
}
// A placeholder shows an oversized pop, a dust ring and sparks.
function sillyBoom(p) {
  sillyRing(p, 1);
  for (let i = 0; i < (reduced() ? 0 : 18); i++) {
    const a = rnd() * Math.PI * 2, v = 200 + 350 * rnd();
    writeStar(sP.set(p.x, 10, p.z), state.simT, sV.set(Math.cos(a) * v, 300 + 300 * rnd(), Math.sin(a) * v), 0.15, i % 2 ? 0 : 2, 2.2 + rnd() * 1.4, 0.5, 16 + 12 * rnd(), 2, 1.6);
  }
  commitStars();
  if (!reduced()) cam.shake += 0.5;
}
/* ---------- end the ship's shot ---------- */
