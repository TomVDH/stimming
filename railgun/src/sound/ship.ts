// @ts-nocheck
// Load order: sound/hit runs first.
import './hit.ts';
import * as THREE from 'three';
import { hulkAt, VACUUM } from '../../ship.js';
import { state } from '../state.ts';
import { ship } from '../ship/battleship.ts';
import { killVoice, shipDue, shipRumbles, shipSfxLog, shipVoice } from '../ship/hulks.ts';
import { fill, spin } from '../play/reset.ts';
import { filt, hiss, jit, kit, pend, track } from './kit.ts';
import { blastBus, echo } from './rumble.ts';

/* ---------- the ship's voices ---------- */
// A queued sound waits for its sim time.
// A hide or a mute cannot lose it.
// at is the sim time.
// A sound later than tol seconds drops.
// ref: the sim time of the flash it answers.
export function sfxQueue(kind, at, tol, i, k, ref, play) {
  const r = { kind, i, k, due: at, tol, ref, play, started: null, ctx: null };
  shipDue.push(r); shipSfxLog.push(r);
  return r;
}
// The crack comes four seconds after the flash.
// Each thud lags its joint's flash.
export function queueShipSounds(fx, k) {
  sfxQueue('crack', fx.t0 + 4, 8, 0, k, fx.t0, ac => shipCrack(ac, k));
  fx.joints.forEach((j, n) => sfxQueue('thud', j.t + 0.3 + 0.5 * Math.random(), 3, n, k, j.t, ac => jointThud(ac, fx.kill ? k : 0.8 * k)));
}
// Start what is due, then steer the roars.
export function stepShipSound() {
  if (state.tgtKind !== 'ship' || (!shipDue.length && !ship.go)) return;
  // A Reset starts no new sound.
  if (spin || (fill && !fill.cut)) return;
  const ac = kit.live();
  for (let n = shipDue.length - 1; n >= 0; n--) {
    const r = shipDue[n], late = state.simT - r.due;
    if (late < 0 || (late <= r.tol && !ac)) continue;
    shipDue.splice(n, 1);
    if (late > r.tol) continue;
    r.started = state.simT; r.ctx = ac.currentTime;
    const h = r.play(ac);
    if (h) shipRumbles.push(h);
  }
  if (!ac) return;
  // Ended handles leave the list.
  for (let n = shipRumbles.length - 1; n >= 0; n--) if (shipRumbles[n].end < ac.currentTime) shipRumbles.splice(n, 1);
  for (let i = 0; i < ship.hulks.length; i++) stepRoar(ac, ship.hulks[i], i);
}
// Hide stops every roar.
// The live hulks start new roars on return.
export function hushRoars() {
  for (const v of shipVoice) if (v?.roar) { killVoice(v.roar); v.roar = null; }
}
// One roar per hulk in the air, all into one bus.
// The roar follows the live hulk.
// A late unmute still hears it.
function stepRoar(ac, h, i) {
  const v = shipVoice[i] ??= { groan: false, roar: null, done: false };
  if (h.breakAt === null || v.done) return;
  const age = state.simT - h.breakAt, a = hulkAt(h, age), now = ac.currentTime;
  const alive = !!v.roar && pend.has(v.roar);
  if (h.landedAt !== null || a.landed) {
    v.done = true;
    if (alive) {
      v.roar.g.gain.setTargetAtTime(0, now, 0.25);
      try { v.roar.src.stop(now + 1.6); v.roar.lfo.stop(now + 1.6); } catch { /* gone */ }
      v.roar.end = now + 1.7;
    }
    return;
  }
  if (a.entry <= 0) return;
  const at = h.breakAt + VACUUM;
  if (!v.groan && a.entry < 0.3) {
    v.groan = true;
    shipRumbles.push(shipGroan(ac, i));
    shipSfxLog.push({ kind: 'groan', i, k: 1, due: at, ref: at, started: state.simT, ctx: now });
  }
  if (!alive) {
    // A dropped handle leaves no orphan voice.
    if (v.roar) killVoice(v.roar);
    v.roar = entryRoar(ac);
    shipSfxLog.push({ kind: 'roar', i, k: 1, due: at, ref: at, started: state.simT, ctx: now });
  }
  // The roar builds over twenty seconds of entry, then holds.
  const b = THREE.MathUtils.smoothstep(age - VACUUM, 0, 20);
  const r = v.roar, lvl = 0.04 + 0.2 * b, fc = 160 + 700 * b;
  if (Math.abs(lvl - r.lvl) > 0.003) { r.lvl = lvl; r.g.gain.setTargetAtTime(lvl, now, 0.5); }
  if (Math.abs(fc - r.fc) > 4) { r.fc = fc; r.lp.frequency.setTargetAtTime(fc, now, 0.5); }
  // The sources stop on their own when the frames stop.
  if (r.end - now < 20) {
    r.end = now + 30;
    try { r.src.stop(r.end); r.lfo.stop(r.end); } catch { /* gone */ }
  }
}
// A far, thin crack: a high-passed burst.
// A second tick follows it.
// The ship's voices feed the blast bus, as the rock's impact does.
function shipCrack(ac, k) {
  const t = ac.currentTime + 0.02, g = ac.createGain(), g2 = ac.createGain();
  const n = hiss(ac, t, 0.5, 1.2), n2 = hiss(ac, t + 0.11, 0.4, 0.9);
  const hp = filt(ac, 'highpass', 1500, 0.7), bp = filt(ac, 'bandpass', 2800, 1.1);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.7 * k, t + 0.003); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
  g2.gain.setValueAtTime(0.0001, t + 0.11); g2.gain.exponentialRampToValueAtTime(0.18 * k, t + 0.115); g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
  n.connect(g).connect(hp); n2.connect(g2).connect(hp);
  hp.connect(bp).connect(blastBus(ac));
  echo(ac, bp, 0.6, 5000);
  return track(t + 0.7, n, n2, hp, bp, g, g2);
}
// A low, muffled thud: a falling sine and a dull noise knock.
function jointThud(ac, k) {
  const t = ac.currentTime + 0.02, o = ac.createOscillator(), og = ac.createGain();
  const n = hiss(ac, t, 0.6, 0.5), lp = filt(ac, 'lowpass', 150), ng = ac.createGain();
  o.frequency.setValueAtTime(66 * jit(0.08), t); o.frequency.exponentialRampToValueAtTime(34, t + 0.4);
  og.gain.setValueAtTime(0.0001, t); og.gain.exponentialRampToValueAtTime(0.42 * k, t + 0.012); og.gain.setTargetAtTime(0.0001, t + 0.05, 0.14);
  ng.gain.setValueAtTime(0.0001, t); ng.gain.exponentialRampToValueAtTime(0.45 * k, t + 0.01); ng.gain.setTargetAtTime(0.0001, t + 0.04, 0.1);
  const bus = blastBus(ac);
  o.connect(og).connect(bus); n.connect(lp).connect(ng).connect(bus);
  echo(ac, og, 0.3, 300);
  o.start(t); o.stop(t + 1.2);
  return track(t + 1.3, o, n, lp, og, ng);
}
// A tearing groan: a sliding saw pair and creaking noise.
function shipGroan(ac, i) {
  const t = ac.currentTime + 0.02, d = 7 + 2 * Math.random(), f = 64 * jit(0.12) + 3 * i;
  const o1 = ac.createOscillator(), o2 = ac.createOscillator(), lp = filt(ac, 'lowpass', 520, 3), g = ac.createGain(), o2g = ac.createGain();
  o1.type = o2.type = 'sawtooth';
  o1.frequency.setValueAtTime(f, t); o1.frequency.exponentialRampToValueAtTime(f * 0.55, t + d);
  o2.frequency.setValueAtTime(f * 1.51, t); o2.frequency.exponentialRampToValueAtTime(f * 0.8, t + d);
  lp.frequency.setValueAtTime(520, t); lp.frequency.exponentialRampToValueAtTime(170, t + d);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.16, t + 1.8); g.gain.setTargetAtTime(0.0001, t + d * 0.6, d * 0.2);
  o2g.gain.value = 0.45;
  const bus = blastBus(ac);
  o1.connect(lp); o2.connect(o2g).connect(lp); lp.connect(g).connect(bus);
  // Tearing noise passes a falling band.
  // A fast uneven wobble chops it.
  const n = hiss(ac, t, d + 0.5, 0.8), bp = filt(ac, 'bandpass', 900, 4), cg = ac.createGain(), lfo = ac.createOscillator(), lg = ac.createGain(), ng = ac.createGain();
  bp.frequency.setValueAtTime(900, t); bp.frequency.exponentialRampToValueAtTime(260, t + d);
  lfo.frequency.value = 9 * jit(0.3); lg.gain.value = 0.5; cg.gain.value = 0.5;
  lfo.connect(lg).connect(cg.gain);
  ng.gain.setValueAtTime(0.0001, t); ng.gain.exponentialRampToValueAtTime(0.1, t + 1.5); ng.gain.setTargetAtTime(0.0001, t + d * 0.6, d * 0.2);
  n.connect(bp).connect(cg).connect(ng).connect(bus);
  echo(ac, g, 0.3, 500);
  for (const o of [o1, o2, lfo]) { o.start(t); o.stop(t + d + 1); }
  return track(t + d + 1.1, o1, o2, lfo, n, lp, g, o2g, bp, cg, lg, ng);
}
// Every roar feeds this one bus.
let roarBus = null;
// QA counts the roars that hold a running source.
export const roarSet = new Set();
function roarOut(ac) {
  if (roarBus && roarBus.ac === ac) return roarBus.g;
  const g = ac.createGain();
  g.gain.value = 0.9; g.connect(blastBus(ac));
  echo(ac, g, 0.22, 900);
  roarBus = { ac, g };
  return g;
}
// A roar voice: dark rushing noise with a rolling swell.
// The hulk sets its level each frame.
function entryRoar(ac) {
  const t = ac.currentTime, src = ac.createBufferSource(), lp = filt(ac, 'lowpass', 160, 0.9), g = ac.createGain(), am = ac.createGain();
  const bp = filt(ac, 'bandpass', 700, 0.5), hg = ac.createGain(), lfo = ac.createOscillator(), lg = ac.createGain();
  src.buffer = kit.noise; src.loop = true; src.playbackRate.value = (0.4 + 0.2 * Math.random()) * jit(0.05);
  g.gain.value = 0.0001; am.gain.value = 0.8; hg.gain.value = 0.25;
  lfo.frequency.value = 0.15 + 0.2 * Math.random(); lg.gain.value = 0.25;
  lfo.connect(lg).connect(am.gain);
  src.connect(lp).connect(g); src.connect(bp).connect(hg).connect(g);
  g.connect(am).connect(roarOut(ac));
  src.start(t, Math.random() * 0.9); lfo.start(t);
  // A roar never outlives its handle.
  src.stop(t + 30); lfo.stop(t + 30);
  const r = Object.assign(track(t + 30, src, lfo, lp, bp, hg, g, am, lg), { src, lfo, g, lp, lvl: -1, fc: -1 });
  roarSet.add(r);
  return r;
}
// The rumble of a landing: lower and longer than the rock's.
export function shipRumble(ac, k) {
  const t = ac.currentTime + 0.02, s = hiss(ac, t, 15, 0.22), lp = filt(ac, 'lowpass', 120), g = ac.createGain();
  const lvl = 0.34 * k * jit(0.1);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(lvl, t + 1.4); g.gain.setTargetAtTime(0.0001, t + 2.6, 3.2);
  const bus = blastBus(ac);
  s.connect(lp).connect(g).connect(bus);
  const o = ac.createOscillator(), o2 = ac.createOscillator(), og = ac.createGain();
  o.frequency.value = 24 * jit(0.05); o2.frequency.value = 37 * jit(0.05);
  og.gain.setValueAtTime(0.0001, t); og.gain.exponentialRampToValueAtTime(lvl * 0.8, t + 1.4); og.gain.setTargetAtTime(0.0001, t + 2.6, 3.2);
  o.connect(og); o2.connect(og); og.connect(bus);
  echo(ac, g, 0.2, 150);
  o.start(t); o.stop(t + 15); o2.start(t); o2.stop(t + 15);
  return track(t + 15.5, s, o, o2, lp, g, og);
}
