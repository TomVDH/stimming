// @ts-nocheck
// Load order: sound/surge runs first.
import './surge.ts';
import * as THREE from 'three';
import { goMix, goOpen } from '../setup.ts';
import { charge } from '../play/charge.ts';
import { blip, burst, filt, jit, kit, track } from './kit.ts';
import { MIX, MIX0, VOWEL } from './hum.ts';
import { SURGE, stackStart, stackUpdate } from './surge.ts';

/* ---------- the game-over surge ---------- */
// The picked surge plays the rock's last fall to the game over.
// The strike calls surgeOver every sim step with d: { u, vol, over }.
// d.u: nearness, 0 at the horizon line, 1 at contact; d.vol: the level.
// d.over: the strain; the strike sends 0, so the chord stays clean.
// Null stops it. A null ac (muted) stops it hard.
export let goSurge = null;
// The game over plays its surge without the machines.
// Each pick gets a machine-free copy on first use.
function goMixP(key) {
  const k = MIX[key] && MIX[key].stack ? key : 'penta', S = SURGE[MIX[k].stack];
  SURGE[k + '_go'] ??= { ...S, mech: [] };
  return { ...MIX[k], stack: k + '_go' };
}
export function surgeOver(ac, d, hold = 0) {
  if (!d || !ac) { surgeOverStop(!ac, hold); return; }
  if (goSurge && goSurge.ac !== ac) surgeOverStop(true);
  // A take from GO_TAKES builds its own voices; a surge mix builds a stack.
  if (!goSurge) { goSurge = GO_TAKES[goMix] ? GO_TAKES[goMix](ac) : goStack(ac, goMixP(goMix)); goSurge.ac = ac; }
  (goSurge.upd || goStackUpdate)(ac, goSurge, d);
}
// A machine-free stack for the game over, with a slow tape wobble.
function goStack(ac, P) {
  const h = stackStart(ac, P);
  // The wobble settles as the rock comes down.
  const lfo = ac.createOscillator(), lg = ac.createGain();
  lfo.frequency.value = 0.55; lg.gain.value = 0;
  lfo.connect(lg);
  for (const n of h.src) if (n.detune && n.frequency.value > 30) lg.connect(n.detune);
  lfo.start(); h.src.push(lfo); h.wob = lg;
  return h;
}
function goStackUpdate(ac, h, d) {
  h.wob.gain.setTargetAtTime(30 * (1 - THREE.MathUtils.smoothstep(d.u, 0.2, 0.85)), ac.currentTime, 0.3);
  const ss = THREE.MathUtils.smoothstep;
  // The chord resolves gently near contact and holds through the burn.
  // A live charge keeps the lead; the surge ducks under it.
  // The machines build straight with nearness, across the whole fall.
  stackUpdate(ac, h, {
    c: d.u, lock: d.lock ?? d.u >= 0.999, rage: ss(d.u, 0.55, 0.85),
    // A full accent and a quick glide: the chord hits at contact.
    accent: 1, glide: 0.3,
    // The strain sours the chord at half depth, so the chord still reads.
    over: 0.5 * d.over, vol: GO_LEVEL * d.vol * (charge ? 0.35 : 1),
    // The bass layer plays from the start; the rest enter as the rock nears.
    choir: 0.3 + 0.7 * Math.pow(d.choir ?? 1, 1.3),
    // A bright filter and a light drive keep the chord clean.
    open: 1800, drive: 0.45 + 0.25 * d.u,
  });
}
// The game-over stack's level, against its light drive.
const GO_LEVEL = 1.6;
// now: a hard stop for mute and a hidden tab; else a two-second fade.
// hold: the sound holds this many seconds, then cuts in 0.2 s.
// cut: every output and the echo drop to silence at once.
export function surgeOverStop(now = false, hold = 0, cut = false) {
  if (!goSurge) return;
  const h = goSurge, ac = h.ac, t = ac.currentTime;
  goSurge = null;
  if (now || ac.state !== 'running') { for (const n of h.src) { try { n.stop(); n.disconnect(); } catch { /* gone */ } } return; }
  if (cut) {
    // The dry take and the echo stop; only the hall rings on.
    for (const n of [h.g, h.sg, h.eo]) if (n) { n.gain.cancelScheduledValues(t); n.gain.setTargetAtTime(0, t, 0.05); }
    for (const n of h.src) n.stop(t + 0.4);
    track(t + 0.5, ...h.src);
    return;
  }
  for (const n of [h.g, h.sg]) n.gain.setTargetAtTime(0, t + hold, hold ? 0.07 : 0.5);
  for (const n of h.src) n.stop(t + hold + 2.5);
  track(t + hold + 2.6, ...h.src);
}
/* ---------- game-over takes ---------- */
// Three takes beside the surge mixes; the Dev row picks one.
// Each take returns { src, g, sg, upd }; the stop fades g and sg.
// Ascent: a Shepard hum climbs forever under the Surge choir.
// Requiem: a sung minor chord over a pedal; it turns major.
// Undertow: a Shepard hum and a dark cluster sink, then open.
const GO_TAKES = { ascent: goAscent, requiem: goRequiem, undertow: goUndertow };
// A Shepard hum: octave-spaced tones under one fixed bell.
// The tones glide by octaves, so the pitch seems to move forever.
function shepard(ac, src, dest, base = 27.5, n = 7) {
  const lp = filt(ac, 'lowpass', 1200, 0.7), g = ac.createGain();
  g.gain.value = 0; lp.connect(g).connect(dest);
  const parts = [];
  for (let i = 0; i < n; i++) {
    const pg = ac.createGain();
    pg.gain.value = 0; pg.connect(lp);
    const os = [-5, 5].map(dt => { const o = ac.createOscillator(); o.type = 'triangle'; o.frequency.value = base; o.detune.value = dt; o.connect(pg); o.start(); src.push(o); return o; });
    parts.push({ os, pg, p: -1 });
  }
  return { g, lp, parts, base, n, ph: 0, last: 0, land: null };
}
// rate: octaves a second; a negative rate falls.
// lock: the tones settle on the root's octaves and hold.
function shepardStep(ac, s, rate, lock) {
  const t = ac.currentTime, dt = s.last ? Math.min(t - s.last, 0.2) : 0;
  s.last = t;
  if (lock) {
    // The glide completes its octave in its own direction.
    s.land ??= rate >= 0 ? Math.ceil(s.ph) : Math.floor(s.ph);
    s.ph += (s.land - s.ph) * Math.min(1, dt / 0.5);
  } else { s.land = null; s.ph += rate * dt; }
  for (let i = 0; i < s.n; i++) {
    const P = s.parts[i], p = (((i + s.ph) % s.n) + s.n) % s.n, f = s.base * Math.pow(2, p);
    // A wrap jumps seven octaves at zero level, so it jumps at once.
    const wrap = P.p >= 0 && Math.abs(p - P.p) > s.n / 2;
    for (const o of P.os) {
      if (wrap) { o.frequency.cancelScheduledValues(t); o.frequency.setValueAtTime(f, t); } else o.frequency.setTargetAtTime(f, t, 0.04);
    }
    P.pg.gain.setTargetAtTime(0.06 * (0.5 - 0.5 * Math.cos(2 * Math.PI * p / s.n)), t, 0.04);
    P.p = p;
  }
}
// Ascent: the Surge choir over a hum that climbs from the horizon line.
function goAscent(ac) {
  const h = goStack(ac, goMixP('penta'));
  h.shep = shepard(ac, h.src, h.cg);
  h.upd = (ac, h, d) => {
    goStackUpdate(ac, h, d);
    const t = ac.currentTime, s = h.shep;
    // The climb quickens to an octave in four seconds at contact.
    shepardStep(ac, s, 0.03 + 0.22 * d.u * d.u, d.lock);
    s.lp.frequency.setTargetAtTime(1200 * Math.pow(2, 2 * d.u), t, 0.1);
    s.g.gain.setTargetAtTime(GO_SHEP * (0.35 + 1.25 * d.u), t, 0.1);
  };
  return h;
}
// The Shepard hum's level into the stack's soft clip.
const GO_SHEP = 1.6;
// Undertow: a dark cluster sinks a fourth, then opens bright at the lock.
SURGE.undertow = {
  root: 0, wave: 'saw', mech: [], sub: false,
  bass: [-12, 0, 7, 12], mid: [12, 19, 24, 28, 31, 36, 40, 43], high: [43, 48, 52, 55, 60, 64],
  pre: { bass: [-12, -1, 0, 1], mid: [11, 12, 13, 14, 15, 16, 17, 18], high: [22, 23, 24, 25, 26, 27] },
};
function goUndertow(ac) {
  const h = goStack(ac, { ...MIX0, stack: 'undertow', verb: 0.6, pre: 0.08, dark: 9000 });
  // One offset bends every swarm voice down together.
  const bend = ac.createConstantSource();
  bend.offset.value = 0;
  for (const v of h.voices) for (const o of v.os) bend.connect(o.detune);
  bend.start(); h.src.push(bend); h.bend = bend;
  h.shep = shepard(ac, h.src, h.cg);
  // The sub sinks from E1 to A0 across the fall.
  const sub = ac.createOscillator(), subG = ac.createGain();
  subG.gain.value = 0.6; subG.connect(h.sg);
  sub.frequency.value = 41.2; sub.connect(subG); sub.start(); h.src.push(sub); h.sub = sub;
  h.upd = (ac, h, d) => {
    goStackUpdate(ac, h, d);
    const t = ac.currentTime, s = h.shep;
    shepardStep(ac, s, -(0.03 + 0.22 * d.u * d.u), d.lock);
    s.lp.frequency.setTargetAtTime(1000 * Math.pow(2, 2 * d.u), t, 0.1);
    s.g.gain.setTargetAtTime(GO_SHEP * (0.35 + 1.25 * d.u), t, 0.1);
    // At the lock the bend lets go, so the chord rises as it opens.
    h.bend.offset.setTargetAtTime(d.lock ? 0 : -500 * Math.pow(d.u, 1.5), t, d.lock ? 0.5 : 0.2);
    h.sub.frequency.setTargetAtTime(41.2 * Math.pow(2, -0.58 * d.u), t, 0.3);
  };
  return h;
}
// Requiem voices: [minor tone, lock tone], in semitones from A1.
// The lock lifts each minor third to a major third.
const REQ = [[0, 0], [7, 7], [12, 12], [15, 16], [19, 19], [24, 24], [27, 28], [31, 31], [36, 36], [39, 40], [43, 43]];
// The Requiem's levels: voices, pedal, forte layer, echo, whole take.
const GO_REQ = { voice: 0.42, pedal: 0.25, forte: 0.05, echo: 0.45, out: 0.32 };
function goRequiem(ac) {
  const src = [], R = 55;
  const osc = (type, f, to, dt = 0) => { const o = ac.createOscillator(); o.type = type; o.frequency.value = f; o.detune.value = dt; o.connect(to); o.start(); src.push(o); return o; };
  // One soft clip glues the take; the stop fades g and sg.
  const drive = ac.createGain(), shape = ac.createWaveShaper(), g = ac.createGain(), sg = ac.createGain();
  const curve = new Float32Array(257);
  for (let i = 0; i < 257; i++) curve[i] = Math.tanh(2 * (i / 128 - 1));
  shape.curve = curve; shape.oversample = '2x';
  drive.gain.value = 0.6; g.gain.value = 0; sg.gain.value = 0;
  drive.connect(shape).connect(g).connect(goBus(ac)); sg.connect(goBus(ac));
  // The pedal: A0, A1 and a soft square on A2, under a low lid.
  const plp = filt(ac, 'lowpass', 500, 0.8), pg = ac.createGain(), sq = ac.createGain();
  pg.gain.value = 0; sq.gain.value = 0.3;
  plp.connect(pg).connect(drive); sq.connect(plp);
  osc('sine', R / 2, plp); osc('sine', R, plp, 3); osc('square', 2 * R, sq, -4);
  // The choir bus, and three slow vibratos shared round the voices.
  const cb = ac.createGain();
  cb.gain.value = 0; cb.connect(drive);
  const vib = [4.7, 5.2, 5.7].map(fr => { const lg = ac.createGain(); lg.gain.value = 0; osc('sine', fr, lg); return lg; });
  const voices = REQ.map(([tgt, maj], i) => {
    const low = tgt < 12, vg = ac.createGain(), pn = ac.createStereoPanner(), lid = filt(ac, 'lowpass', 12000, 0.7);
    const f1 = low ? filt(ac, 'lowpass', 900, 0.7) : filt(ac, 'bandpass', VOWEL.oo[0], 6), f2 = filt(ac, 'bandpass', low ? VOWEL.uu[1] : VOWEL.oo[1], 8);
    vg.gain.value = 0; pn.pan.value = (i % 2 ? 1 : -1) * Math.min(0.8, 0.08 * i);
    f1.connect(vg); f2.connect(vg); vg.connect(lid).connect(pn).connect(cb);
    // Two saws six cents apart make each voice.
    const os = [-6, 6].map(dt => { const o = osc('sawtooth', R * Math.pow(2, (tgt - 2) / 12), f1, dt); o.connect(f2); vib[i % 3].connect(o.detune); return o; });
    // Voices enter low to high; the last is in when the choir is full.
    return { os, f1, f2, vg, lid, tgt, maj, low, enter: 0.02 + 0.83 * i / (REQ.length - 1), ph: 6.28 * Math.random(), sour: Math.random() < 0.5 ? -1 : 1 };
  });
  // The forte: bright saws an octave over the upper chord, on at contact.
  const fg = ac.createGain(), flp = filt(ac, 'lowpass', 7000, 0.7);
  fg.gain.value = 0; flp.connect(fg).connect(drive);
  for (const [, maj] of REQ) if (maj >= 24) for (const dt of [-8, 8]) vib[0].connect(osc('sawtooth', R * Math.pow(2, (maj + 12) / 12), flp, dt).detune);
  // The plain's echoes take the whole take.
  const vs = ac.createGain(), dl = ac.createDelay(0.2), dk = filt(ac, 'lowpass', 9000, 0.5);
  vs.gain.value = 0; dl.delayTime.value = 0.06;
  // The take's hall: a smooth tail that rings on after the stop.
  const rc = ac.createConvolver(), ro = ac.createGain();
  rc.normalize = true; rc.buffer = hallIR(ac); ro.gain.value = 0.9;
  g.connect(vs).connect(dl).connect(dk).connect(rc).connect(ro).connect(goBus(ac));
  // The echo: a feedback delay the forte opens; the stop rings through it.
  const es = ac.createGain(), edl = ac.createDelay(1), efb = ac.createGain(), elp = filt(ac, 'lowpass', 4000, 0.5);
  es.gain.value = 0; edl.delayTime.value = 0.42; efb.gain.value = 0.5;
  // eo: the echo's output; the stop silences it, so no repeats ring on.
  const eo = ac.createGain();
  g.connect(es).connect(edl).connect(elp).connect(efb).connect(edl);
  elp.connect(eo).connect(goBus(ac));
  return { src, g, sg, drive, plp, pg, cb, vib, voices, fg, vs, es, eo, next: 0, locked: false, lockAt: -1e9, upd: requiemUpdate };
}
// A concert-hall tail: dense noise that darkens and dies over 6 s.
let hallBuf = null;
function hallIR(ac) {
  if (hallBuf && hallBuf.sampleRate === ac.sampleRate) return hallBuf;
  const sr = ac.sampleRate, len = Math.round(6 * sr), b = ac.createBuffer(2, len, sr);
  for (let ch = 0; ch < 2; ch++) {
    const d = b.getChannelData(ch);
    let y = 0;
    for (let i = 0; i < len; i++) {
      const x = i / sr, k = 0.5 - 0.42 * Math.min(1, x / 4);
      // The lowpass closes with time, so the tail darkens as it dies.
      y += k * (Math.random() * 2 - 1 - y);
      d[i] = y * Math.exp(-6.9 * x / 6) * Math.min(1, x / 0.02);
    }
  }
  return (hallBuf = b);
}
// The game-over bus: the take's every output goes through it.
// QA records it alone, with no other sound.
let goBusN = null;
export function goBus(ac) {
  if (!goBusN || goBusN.context !== ac) { goBusN = ac.createGain(); goBusN.connect(kit.out); }
  return goBusN;
}
function requiemUpdate(ac, h, d) {
  const t = ac.currentTime, ss = THREE.MathUtils.smoothstep, lerp = THREE.MathUtils.lerp;
  const u = d.u, cu = d.choir ?? 1, lock = d.lock ?? u >= 0.999, ov = 0.5 * d.over, vol = d.vol * (charge ? 0.35 : 1);
  if (lock && !h.locked) h.lockAt = t;
  h.locked = lock;
  // The pedal grows from the horizon line; its lid opens with nearness.
  h.pg.gain.setTargetAtTime(GO_REQ.pedal * (0.15 + 0.85 * u), t, 0.1);
  h.plp.frequency.setTargetAtTime(150 * Math.pow(2, 4.3 * u), t, 0.1);
  // The voices hold one vowel, oo; they only fade in.
  const F1 = lerp(VOWEL.oo[0], VOWEL.scream[0], ov), F2 = lerp(VOWEL.oo[1], VOWEL.scream[1], ov);
  const B2 = lerp(VOWEL.uu[1], VOWEL.ah[1], 0.5 * ov);
  for (const v of h.voices) {
    const k = ss(cu, v.enter, v.enter + 0.15);
    // A voice scoops up two semitones as it enters, and wanders until the lock.
    const p = (lock ? v.maj : v.tgt) - 2 * (1 - k) + (lock ? 0 : 0.25 * Math.sin(t * 0.6 + v.ph)) + ov * v.sour * 0.6;
    for (const o of v.os) o.frequency.setTargetAtTime(55 * Math.pow(2, p / 12), t, lock ? 0.4 : 0.15);
    if (v.low) v.f2.frequency.setTargetAtTime(B2, t, 0.1);
    else { v.f1.frequency.setTargetAtTime(F1, t, 0.1); v.f2.frequency.setTargetAtTime(F2, t, 0.1); }
    v.vg.gain.setTargetAtTime(GO_REQ.voice * k, t, 0.1);
    // A voice enters muffled and clears as the next voices blend in.
    const op = lock || !goOpen ? 1 : ss(cu, v.enter + 0.08, v.enter + 0.35);
    v.lid.frequency.setTargetAtTime(250 * Math.pow(48, op), t, 0.15);
  }
  for (const l of h.vib) l.gain.setTargetAtTime(14 * cu, t, 0.2);
  // The choir swells over the pedal as its voices fill in.
  // At contact the climax ramps in over about two seconds, with no jump.
  // Its level follows nearness, so the build keeps climbing to contact.
  const ramp = lock ? 0.7 : 0.08;
  h.cb.gain.setTargetAtTime(ss(cu, 0, 0.5) * (1 + cu) * (0.3 + 0.7 * u) * (lock ? 1.4 : 1), t, ramp);
  h.fg.gain.setTargetAtTime(lock ? GO_REQ.forte : 0, t, lock ? 0.7 : 0.2);
  h.es.gain.setTargetAtTime(lock ? GO_REQ.echo : 0, t, 0.7);
  // A light drive keeps the chord clean.
  h.drive.gain.setTargetAtTime(0.3 + 0.3 * u, t, 0.1);
  h.g.gain.setTargetAtTime(GO_REQ.out * vol, t, 0.08);
  h.vs.gain.setTargetAtTime(0.6 * (0.5 + 0.5 * u) * (lock ? 1.3 : 1) * vol, t, lock ? 0.7 : 0.1);
}
// A temple bell: inharmonic partials two octaves over the root, long decay.
export function bell(ac, h, t, u) {
  const f = 4 * h.R, k = 0.5 + 0.5 * u;
  track(t + 5, ...[[0.5, 0.05, 4.5], [1, 0.06, 3.5], [1.19, 0.035, 2.8], [1.5, 0.03, 2.2], [2, 0.025, 1.6], [2.74, 0.015, 1.1]].map(([r, lv, d]) => blip(ac, h.g, t, { f0: f * r * jit(0.004), peak: lv * k, a: 0.004, dur: d })));
}
// A ratchet tooth: a low metal clank with a short bright click.
export function ratchet(ac, h, t, u) {
  const f = (h.n = (h.n || 0) + 1) % 2 ? 180 : 140, k = (0.5 + 0.5 * u) * jit(0.15);
  track(t + 0.4, ...[[1, 0.07, 0.3], [2.4, 0.04, 0.18], [4.1, 0.02, 0.1]].map(([r, lv, d]) => blip(ac, h.g, t, { f0: f * r * jit(0.02), peak: lv * k, a: 0.001, dur: d })),
    burst(ac, h.g, t, { dur: 0.03, rate: 1.2, f: 2500, q: 1.2, peak: 0.04 * k, a: 0.0008 }).src);
}
