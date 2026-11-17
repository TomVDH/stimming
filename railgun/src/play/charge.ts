// @ts-nocheck
// Load order: play/approach runs first.
import './approach.ts';
import * as THREE from 'three';
import { reduced } from '../../../shared/stim.js';
import { ROUND_C, launchAt, bankAt } from '../../salvo.js';
import { state } from '../state.ts';
import { act, clamp, rnd, stage, ui } from '../setup.ts';
import { L, MUZZLE, barrelPt } from '../world/axis.ts';
import { U } from '../world/uniforms.ts';
import { ast } from '../rock/asteroid.ts';
import { puff } from '../fx/dust.ts';
import { writeStar } from '../fx/burst.ts';
import { spawnArc } from '../gun/arcs.ts';
import { cam } from '../view/camera.ts';
import { dustPulse } from '../gun/muzzle.ts';
import { spawnMote } from '../gun/motes.ts';
import { aimNow, manual } from '../ship/hit.ts';
import { spin } from './reset.ts';
import { wake } from '../loop.ts';
import { crackle, kit } from '../sound/kit.ts';
import { humGroan, humStart, humStop, humUpdate } from '../sound/hum.ts';

/* ---------- the charge ---------- */
// A press starts the charge.
// The level follows the hold time.
// Any release fires.
export let charge = null;
// Hold times in seconds: full power, end of the ready window, the vent.
// Full power at 8.6 s; a 4 s ready window; then 4 s of over-hold before the vent.
export const HOLD = { full: 8.6, ready: 12.6, vent: 16.6 };
export const CHASE_T = c => THREE.MathUtils.lerp(2.0, 0.08, Math.pow(Math.min(c, 1), 1.5));
// The ease reaches full power at HOLD.full.
const EASE_P = 2.4;
// The over-hold, 0 to 1 from the ready window to the vent.
const overOf = held => clamp((held - HOLD.ready) / (HOLD.vent - HOLD.ready), 0, 1);
// Past the ready window the power climbs to 1.25.
const levelOf = held => held >= HOLD.full ? 1 + 0.25 * overOf(held) : 0.12 + 0.88 * (1 - Math.pow(1 - held / HOLD.full, EASE_P));
// The inverse of levelOf.
export const heldOf = c => c > 1 ? HOLD.ready + (HOLD.vent - HOLD.ready) * Math.min(1, (c - 1) / 0.25) : HOLD.full * (1 - Math.pow(1 - clamp((c - 0.12) / 0.88, 0, 1), 1 / EASE_P));
export const stageOf = held => held < HOLD.full ? 'build' : held < HOLD.full + 0.4 ? 'full' : held < HOLD.ready ? 'ready' : held < HOLD.vent ? 'over' : 'vent';
// Chaos keeps growing after the power has saturated.
export let chaos = 0;
// Rage is the last stretch of the build.
export let rage = 0;
// Over is the gun acting out past the ready window.
export let over = 0;
const chaosOf = held => 1 - Math.exp(-held / 8);
// The vent's start time; a vent has no shot.
export let ventT = -1e9;
// A hold belongs to the pointer or to Space.
// Only its owner releases it.
// A press first ranges the rock: two pulses, then the paint.
// The charge starts once the range locks; a release before that cancels.
// QA can skip the ranging.
const RANGE_T = 1.0;
export let ranging = null;
function startCharge(by) {
  charge = { t0: state.simT, c: 0.12, chase: 0, dust: 0, by };
  // The shake starts on this very frame.
  U.uCharge.value = 0.12;
}
// The live fire mode; a new pick lands at the next press.
state.fireMode = 'rail';
act.press = (by = 'pointer', skip = false) => {
  // After contact the gun stands down.
  if (charge || spin || ranging || state.strike?.hit) return;
  state.fireMode = ui.setting('firemode').value;
  if (skip || reduced()) { startCharge(by); return; }
  ranging = { t0: state.simT, by };
};
// The gun fires only once armed and aimed; else a release fizzles.
const ARM = 0.6;
// The arm cue: a clunk and a spark down the rails.
function armCue() {
  cam.shake += 0.25;
  if (!reduced()) { spawnArc(0.5); spawnArc(0.8); }
  dustPulse(0.9); state.armSound();
}
act.release = (by = 'pointer') => {
  if (ranging && ranging.by === by) { ranging = null; return; }
  if (!charge || charge.by !== by) return;
  releaseHint.style.opacity = '0';
  const c = charge.c, bank = charge.bank || 0;
  charge = null;
  // It fires only on target: a release while the gun still swings bleeds the charge.
  const aimed = manual.on || ast.state === 'shatter' || aimNow.err < 0.012;
  if (c < ARM || !aimed || (state.fireMode === 'salvo' && !bank)) { fizzle(); return; }
  humStop(kit.live());
  if (state.fireMode === 'salvo') state.fire(ROUND_C, bank, true);
  else state.fire(c);
};
// The charge bleeds off with a falling groan and a few sparks.
function fizzle() {
  humGroan(kit.live());
  if (reduced()) return;
  for (let i = 0; i < 24; i++) {
    dustV.set(rnd() - 0.5, rnd() - 0.2, rnd() - 0.5).normalize().multiplyScalar(20 + rnd() * 50);
    writeStar(MUZZLE, state.simT, dustV, 0.8, 3, 0.5 + rnd() * 0.6, 0.15, 1.2, 2, 0.6);
  }
}
// A lost window or a hidden tab cancels the hold.
// No shot.
export function cancelHold() {
  charge = null; ranging = null;
  state.spaceDown = false;
  if (state.press) { try { stage.releasePointerCapture(state.press.id); } catch { /* gone */ } }
  state.press = null;
  stage.classList.remove('held');
  humStop(kit.live());
}
// The vent: the gun dumps its charge into the plain.
// No shot; the rock keeps coming.
function vent() {
  charge = null;
  releaseHint.style.opacity = '0';
  ventT = state.simT;
  humGroan(kit.live());
  cam.shake += reduced() ? 0 : 2.4;
  U.uHeat.value = Math.max(U.uHeat.value, 0.8);
  // The strike throws the plain up under the barrel.
  for (let i = 0; i < 160; i++) {
    const th = rnd() * Math.PI * 2, r = 30 + rnd() * 420, v = 14 + rnd() * 26, sx = Math.sin(th), cz = Math.cos(th);
    barrelPt(L * (0.35 + 0.5 * rnd()), 0, 0, dustP);
    dustP.set(dustP.x + sx * r, 2 + rnd() * 8, dustP.z + cz * r);
    dustV.set(sx * v, 5 + rnd() * 12, cz * v);
    puff(dustP, dustV, 6 + rnd() * 6, 70 + rnd() * 110);
  }
  state.ventSound();
  wake();
}
// The vent's strike point, under the barrel's middle.
export const ventP = new THREE.Vector3();
state.ventSound = () => {};
state.armSound = () => {};
// The shot assigns this below.
state.fire = () => {};
export const dustP = new THREE.Vector3(), dustV = new THREE.Vector3();
const releaseHint = document.querySelector('.release-hint');
// The ranging laser's beats, in seconds from the press.
// It pulses twice, then paints the target with a faint steady beam.
// The paint holds through the charge.
// On the release it strobes fast and goes out as the slug leaves.
const RANGE = { pulses: [[0.1, 0.22], [0.42, 0.54]], paint: 0.75, hold: 0.4, hz: 22 };
const inB = (t, [a, b]) => t >= a && t < b;
// The laser's gain now: 0 is dark, 1 is a full pulse.
export function laserGain() {
  if (ranging) {
    const t = state.simT - ranging.t0;
    if (RANGE.pulses.some(p => inB(t, p))) return 1;
    return t >= RANGE.paint ? RANGE.hold * Math.min(1, (t - RANGE.paint) / 0.2) : 0;
  }
  if (charge) return RANGE.hold;
  if (state.shot && !state.shot.hit) {
    const a = state.simT - state.shot.t0;
    // Reduced motion holds the paint and drops the strobe.
    if (a < launchAt(1)) return reduced() ? RANGE.hold : fract(a * RANGE.hz) < 0.5 ? 0.9 : 0;
  }
  return 0;
}
const fract = x => x - Math.floor(x);
export function stepCharge(dt) {
  if (ranging) {
    const t = state.simT - ranging.t0;
    if (t >= RANGE_T) { const by = ranging.by; ranging = null; startCharge(by); }
  }
  if (charge) {
    const held = state.simT - charge.t0;
    // A hold past the over-hold vents the charge.
    if (held >= HOLD.vent) { vent(); return; }
    charge.c = levelOf(held);
    chaos = chaosOf(held);
    rage = THREE.MathUtils.smoothstep(chaos, 0.55, 0.85);
    over = overOf(held);
    // Past the overcharge point the gun strains: a quiet hint, and a crackle that grows.
    releaseHint.style.opacity = held > HOLD.ready + 1.3 ? '1' : '0';
    if (over > 0) { const ac = kit.live(); if (ac && rnd() < dt * (4 + 26 * over)) crackle(ac, over); }
    U.uRage.value = reduced() ? 0 : rage;
    U.uOver.value = reduced() ? 0 : over;
    const c = charge.c;
    // Full power locks with one hard shudder.
    if (!charge.locked && held >= HOLD.full) { charge.locked = true; cam.shake += 0.7; }
    // The gun arms: a clunk and a spark down the rails.
    if (!charge.armed && c >= ARM) { charge.armed = true; if (state.fireMode !== 'salvo') armCue(); }
    // In Salvo each banked round gives the arm cue.
    if (state.fireMode === 'salvo') for (const n = bankAt(held); (charge.bank || 0) < n;) { charge.bank = (charge.bank || 0) + 1; armCue(); }
    // Sparks spit from the brake through the over-hold.
    if (over > 0 && !reduced()) {
      for (let n = Math.floor(dt * 60 * over + rnd()); n > 0; n--) {
        dustV.set(rnd() - 0.5, rnd() - 0.2, rnd() - 0.5).normalize().multiplyScalar(30 + rnd() * 90);
        writeStar(MUZZLE, state.simT, dustV, 0.8, rnd() < 0.5 ? 0 : 2, 0.6 + rnd() * 0.9, 0.2, 1.2 + rnd(), 2, 0.7);
      }
    }
    charge.chase = (charge.chase + dt / CHASE_T(c)) % 1;
    U.uCharge.value = c;
    const ac = kit.live();
    if (ac) { humStart(ac); humUpdate(ac); }
    // The housing's joints vent steam as the charge builds.
    if (!reduced() && chaos > 0.15) for (let n = Math.floor(dt * 10 * chaos + rnd()); n > 0; n--) {
      barrelPt([-160, -40, 90][Math.floor(rnd() * 3)], (rnd() < 0.5 ? -1 : 1) * 34, 30 + rnd() * 20, dustP);
      dustV.set((rnd() - 0.5) * 6, 6 + rnd() * 8, (rnd() - 0.5) * 6);
      puff(dustP, dustV, 1.5 + rnd(), 8 + rnd() * 10, true);
    }
    // Arcs: a few a second at first, then a storm.
    if (chaos > 0.1 && !reduced()) {
      const rate = THREE.MathUtils.lerp(1, 24, chaos) + 40 * rage + 40 * over;
      if (rnd() < dt * rate) {
        const st = rnd() < 0.6 ? clamp(charge.chase + (rnd() - 0.5) * 0.3, 0.03, 0.97) : 0.03 + rnd() * 0.94;
        spawnArc(st);
      }
    }
    // Streamers reach off the brake as the field grows.
    if (chaos > 0.3 && !reduced() && rnd() < dt * (2 + 10 * chaos + 16 * rage + 20 * over)) spawnArc(1, 'corona');
    // The field draws dust in: motes spiral in to the barrel and stream to the muzzle.
    // At full power the field draws in what it has; new motes all but stop.
    if (!reduced()) for (let n = Math.floor(dt * (25 + 160 * chaos + 120 * rage) * (held >= HOLD.full ? 0.1 : 1) + rnd()); n > 0; n--) spawnMote(Math.min(1, c));
    // The dust round the mount is one volume: chargeDust.
  } else {
    // The vent strikes the plain for most of a second.
    const va = state.simT - ventT;
    if (va < 0.9 && !reduced() && rnd() < dt * 45) spawnArc(0.3 + rnd() * 0.6, 'vent');
    // Level, chaos and chase let go in a fraction of a second.
    U.uCharge.value *= Math.exp(-dt / 0.2);
    chaos *= Math.exp(-dt / 0.3);
    rage *= Math.exp(-dt / 0.3);
    over *= Math.exp(-dt / 0.3);
    U.uRage.value = reduced() ? 0 : rage;
    U.uOver.value = reduced() ? 0 : over;
    if (U.uCharge.value < 0.005) U.uCharge.value = 0;
  }
}
