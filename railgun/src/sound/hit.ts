// @ts-nocheck
// Load order: sound/shot runs first.
import './shot.ts';
import { roundGain } from '../../salvo.js';
import { state } from '../state.ts';
import { SIZES, camera, opts } from '../setup.ts';
import { DA } from '../world/axis.ts';
import { rounds } from '../play/shot.ts';
import { filt, hiss, jit, kit, track, trackS } from './kit.ts';
import { IMPACT_AT, blastBus, echo, playSample, sample, sampleHit } from './rumble.ts';
import { roll } from './samples.ts';
import { shotDuck } from './shot.ts';

/* ---------- the hit ---------- */
// The prelude: the whoosh swells and brightens into the hit.
// A short hush before the peak makes the hit land harder.
function impactSound(ac, buf, hit, k, tag = null) {
  const rate = jit(0.03), start = hit - IMPACT_AT / rate, t = Math.max(ac.currentTime, start);
  const bus = blastBus(ac), src = ac.createBufferSource(), lp = filt(ac, 'lowpass', 700, 0.9), g = ac.createGain();
  src.buffer = buf; src.playbackRate.value = rate;
  // The shot's tail and its echoes dip 20 dB before the swell.
  // The swell then climbs out of a quiet sky.
  shotDuck(ac, 0.1, Math.max(ac.currentTime, t - 1.6), 0.45);
  // The swell climbs 18 dB up the whoosh; the filter opens with it.
  const lvl = 0.55 * k * jit(0.08);
  g.gain.setValueAtTime(lvl * 0.12, t); g.gain.exponentialRampToValueAtTime(lvl, hit - 0.1);
  // The hush and the rise take 60 ms each, so the gain never clicks.
  g.gain.linearRampToValueAtTime(lvl * 0.3, hit - 0.06); g.gain.linearRampToValueAtTime(lvl * 1.2, hit + 0.06);
  lp.frequency.setValueAtTime(700, t); lp.frequency.exponentialRampToValueAtTime(14000, hit);
  src.connect(lp).connect(g).connect(bus);
  echo(ac, g, 0.3);
  src.start(t, (t - start) * rate);
  // The riser: noise climbs in pitch, and a sub tone climbs under it.
  const r0 = Math.min(t + 0.1, hit - 0.3), n = hiss(ac, r0, hit - r0, 1), bp = filt(ac, 'bandpass', 250, 1.4), ng = ac.createGain();
  bp.frequency.setValueAtTime(250, r0); bp.frequency.exponentialRampToValueAtTime(4200, hit - 0.02);
  ng.gain.setValueAtTime(0.0001, r0); ng.gain.exponentialRampToValueAtTime(0.14 * k, hit - 0.06); ng.gain.linearRampToValueAtTime(0.0001, hit - 0.015);
  n.connect(bp).connect(ng).connect(bus);
  const o = ac.createOscillator(), og = ac.createGain();
  o.frequency.setValueAtTime(30, r0); o.frequency.exponentialRampToValueAtTime(85, hit - 0.02);
  og.gain.setValueAtTime(0.0001, r0); og.gain.exponentialRampToValueAtTime(0.3 * k, hit - 0.06); og.gain.linearRampToValueAtTime(0.0001, hit - 0.015);
  o.connect(og).connect(bus); o.start(r0); o.stop(hit);
  // The sample alone carries the strike: no synthetic crack or knock.
  (tag ? trackS : track)(hit + (buf.duration - IMPACT_AT) / rate + 0.1, src, n, o);
}
// Salvo sound counts, for QA.
export const sfxN = { round: 0, crater: 0, hunt: 0 };
// One salvo round's report: the shot take, louder round by round.
// Early rounds cut their tail short so the ripple stays crisp.
export function roundSound(ac, r) {
  const at = ac.currentTime + 0.3, k = roundGain(r.j, r.n), last = r.j === r.n;
  sfxN.round++;
  sample(ac, 'shot').then(buf => {
    if (!buf || !rounds.includes(r) || !kit.live()) return;
    const src = ac.createBufferSource(), g = ac.createGain(), t0 = Math.max(ac.currentTime, at);
    src.buffer = buf; src.playbackRate.value = jit(0.03) * (1.06 - 0.06 * k);
    g.gain.setValueAtTime(1.4 * k * jit(0.1), t0);
    if (last) g.gain.setTargetAtTime(0, t0 + 4, 3.5); else g.gain.setTargetAtTime(0, t0 + 0.2, 0.5);
    src.connect(g).connect(kit.out);
    echo(ac, g, 0.35 * k);
    src.start(t0); src.stop(t0 + (last ? 20 : 2.5));
    // A sub punch under each report.
    const o = ac.createOscillator(), og = ac.createGain();
    o.frequency.setValueAtTime(52, t0); o.frequency.exponentialRampToValueAtTime(28, t0 + 0.7);
    og.gain.setValueAtTime(0.0001, t0); og.gain.exponentialRampToValueAtTime(0.8 * k, t0 + 0.015); og.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.9);
    o.connect(og).connect(kit.out); o.start(t0); o.stop(t0 + 1);
    trackS(t0 + (last ? 20.1 : 2.6), src, o);
  });
}
// A far strike: the impact's tail, slowed and darkened, after the sound's delay.
// It has no synthetic crack, tick or crackle.
function farHit(ac, P, k, rate) {
  const t = ac.currentTime + camera.position.distanceTo(P) / 343 / 28;
  sampleHit(ac, trackS(t + 0.5), t, 0.55 * k, rate * jit(0.04), 1400, blastBus(ac), 0.3);
}
export function craterSound(P) { sfxN.crater++; const ac = kit.live(); if (ac) farHit(ac, P, 0.9, 0.8); }
export function huntSound(P) { sfxN.hunt++; const ac = kit.live(); if (ac) farHit(ac, P, 0.6, 1.0); }
// The impact's prelude lands on the flash.
// The boom crosses the distance at sound speed, compressed 28 times.
export function hitSounds(ac, sh, alive = () => state.shot === sh) {
  // A ship hit does not play the rock's samples.
  if (!sh.canHit || sh.kind === 'ship') return;
  const hit = ac.currentTime + sh.hitT, k = SIZES[opts.size].rumble * Math.min(sh.c, 1.25);
  // Compressed 28 times: the boom lands about 5 s after the flash.
  const late = camera.position.distanceTo(sh.target) / 343 / 28;
  sh.sfx = { ...sh.sfx, hit, impact: 0, boom: 0, late };
  blastBus(ac);
  Promise.all([sample(ac, 'impact'), sample(ac, 'boom')]).then(([imp, boom]) => {
    if (!alive() || !kit.live()) return;
    if (imp) { sh.sfx.impact = hit - IMPACT_AT; impactSound(ac, imp, hit, k, sh.tag); }
    sh.sfx.boom = hit + late;
    boomSound(ac, boom, sh.sfx.boom, k, sh.tag);
  });
}
// The boom: Tom's far boom at half speed, an octave down, about 45 s long.
// Under it: a sub swell and a rolling tail.
// Without the file the synth body plays alone.
function boomSound(ac, buf, t, k, tag = null) {
  const bus = blastBus(ac), srcs = [];
  if (buf) playSample(ac, buf, t, 1.5 * k * jit(0.1), 0.5 * jit(0.03), 1200, 0.2, bus, tag);
  // The sub swell: two low tones beat slowly and sink as they fade.
  for (const [f, lv] of [[31, 0.22], [43, 0.12]]) {
    const o = ac.createOscillator(), g = ac.createGain();
    o.frequency.setValueAtTime(f * jit(0.04), t); o.frequency.exponentialRampToValueAtTime(f * 0.75, t + 16);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(lv * k, t + 1.8); g.gain.setTargetAtTime(0.0001, t + 3.5, 4.5);
    o.connect(g).connect(bus); o.start(t); o.stop(t + 28); srcs.push(o);
  }
  // The rolling tail: low noise rolls on across the plain.
  srcs.push(...roll(ac, bus, t + 0.4, 28, 0.22 * k, 200));
  (tag ? trackS : track)(t + 30, ...srcs);
}
// The rumble crosses forty kilometres of air, compressed eight times.
// It lands fifteen seconds after the flash.
// It plays only when the hit's sounds were not scheduled.
export function rumble(c) {
  const ac = kit.live();
  if (!ac) return;
  const t = ac.currentTime + DA / 343 / 8, k = SIZES[opts.size].rumble, bus = blastBus(ac);
  const s = hiss(ac, t, 7, 0.3), lp = filt(ac, 'lowpass', 180), g = ac.createGain();
  const lvl = 0.25 * (0.5 + 0.5 * c) * k * jit(0.1);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(lvl, t + 0.6); g.gain.setTargetAtTime(0.0001, t + 1.2, 1.4);
  s.connect(lp).connect(g).connect(bus);
  const o = ac.createOscillator(), og = ac.createGain();
  o.frequency.value = 30 * jit(0.05);
  og.gain.setValueAtTime(0.0001, t); og.gain.exponentialRampToValueAtTime(lvl * 0.8, t + 0.6); og.gain.setTargetAtTime(0.0001, t + 1.2, 1.4);
  o.connect(og).connect(bus); o.start(t); o.stop(t + 7);
  track(t + 7.5, s, o);
}
