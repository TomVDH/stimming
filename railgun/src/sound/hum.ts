// @ts-nocheck
// Load order: sound/wind runs first.
import './wind.ts';
import * as THREE from 'three';
import { state } from '../state.ts';
import { chargeMix, clamp } from '../setup.ts';
import { CHASE_T, chaos, charge, over, rage } from '../play/charge.ts';
import { filt, kit, track } from './kit.ts';
import { stackStart, stackUpdate } from './surge.ts';
import { bake, baked } from './samples.ts';

/* ---------- the charge hum ---------- */
// One root carries ten harmonic partials.
// Each partial enters as the chaos grows: [ratio, wave, enter, level].
const PARTIALS = [
  [1, 'sawtooth', 0, 1], [1.5, 'triangle', 0.1, 0.7], [2, 'sawtooth', 0.22, 0.6], [3, 'triangle', 0.34, 0.6], [4, 'sawtooth', 0.46, 0.4],
  [5, 'sine', 0.56, 0.5], [6, 'sine', 0.66, 0.45], [8, 'sine', 0.74, 0.4], [12, 'sine', 0.82, 0.3], [16, 'sine', 0.88, 0.25],
];
// The choir: voices grow out of the hum and lock into one chord.
// The chord is the gun's own: a minor eleventh with no third, on the root.
// Each voice: [target semitones, start harmonic, arrival curve, sour sign, pan].
const CHORD = [0, 0, 7, 12, 14, 17, 19, 22, 24, 26, 29, 31, 34, 36, 38, 41, 43, 48];
const VOICES = CHORD.map((tgt, i) => [tgt, 1 + (i % 8), 0.7 + 1.5 * Math.random(), Math.random() < 0.5 ? -1 : 1, (i % 2 ? 1 : -1) * Math.min(0.85, 0.05 * i)]);
// Bass voices sit an octave and a fifth under the root.
const BASS = [-12, -12, -5, 0];
// Vowel formants in hertz: oo, ah, a bright scream, a low uu.
export const VOWEL = { oo: [300, 870], ah: [730, 1090], scream: [900, 2500], uu: [250, 595] };
// One profile per charge mix.
// hum, choir: bus levels. oct: hum pitch factor. sub: sub level.
// glide: voice lag in seconds. late: arrival curve power.
// tier: voices enter low to high. bass: low voices, two saws per voice.
// wob: tape wobble in semitones. bloom: a closed filter opens at the lock.
// verb: plain send. pre: echo pre-delay in seconds. dark: send cutoff.
// accent: the swell at the lock.
export const MIX0 = { hum: 1, choir: 0, oct: 1, sub: 1, glide: 0.06, late: 1, tier: false, bass: false, wob: 0, bloom: false, verb: 0, pre: 0, dark: 0, accent: 0.5 };
export const MIX = {
  hum: MIX0,
  blend: { ...MIX0, choir: 0.55 },
  choir: { ...MIX0, hum: 0.6, choir: 1 },
  // Expanse: the choir stacks bass to soprano over the open plain.
  vast: { hum: 0.85, choir: 1, oct: 1, sub: 1.7, glide: 0.35, late: 1.5, tier: true, bass: true, wob: 0.12, bloom: false, verb: 0.5, pre: 0.03, dark: 9000, accent: 1 },
  // Titan: an octave down, a slow drawl, the choir bursts open at the lock.
  titan: { hum: 0.8, choir: 0.85, oct: 0.5, sub: 1.5, glide: 0.6, late: 1.8, tier: true, bass: true, wob: 0.35, bloom: true, verb: 0.4, pre: 0.09, dark: 2600, accent: 1 },
  // Surges: mechanical layers, then a saw swarm gliding into a chord; see SURGE.
  penta: { ...MIX0, stack: 'penta', verb: 0.45, pre: 0.04, dark: 7000 },
  hijaz: { ...MIX0, stack: 'hijaz', verb: 0.5, pre: 0.06, dark: 6000 },
  syl: { ...MIX0, stack: 'syl', verb: 0.55, pre: 0.05, dark: 7000 },
  colossus: { ...MIX0, stack: 'colossus', verb: 0.55, pre: 0.08, dark: 5000 },
  dirge: { ...MIX0, stack: 'dirge', verb: 0.6, pre: 0.09, dark: 4000 },
  leviathan: { ...MIX0, stack: 'leviathan', verb: 0.5, pre: 0.07, dark: 3500 },
  eclipse: { ...MIX0, stack: 'eclipse', verb: 0.5, pre: 0.05, dark: 7000 },
  monolith: { ...MIX0, stack: 'monolith', verb: 0.45, pre: 0.06, dark: 5000 },
  // Monolith Hum: the plain hum ramps up, then Monolith's swarm joins it.
  monohum: { ...MIX0, surge: 'monohum', verb: 0.45, pre: 0.05, dark: 6000 },
};
// The plain: one convolver per context, built on first use.
// Open flats have no room: a ground bounce, mesa echoes, a low roll.
let verb = null;
export function plainVerb(ac) {
  if (verb && verb.ac === ac) return verb.in;
  const sr = ac.sampleRate, len = Math.round(sr * 6), ir = ac.createBuffer(2, len, sr);
  // Mesa echoes: [delay s, level, pan side]; far ones come back darker.
  const ECHO = [[0.38, 0.5, -1], [0.61, 0.42, 1], [0.95, 0.33, -1], [1.3, 0.27, 1], [1.75, 0.2, -1], [2.3, 0.15, 1], [3.0, 0.1, -1]];
  for (let ch = 0; ch < 2; ch++) {
    const d = ir.getChannelData(ch), side = ch ? 1 : -1;
    d[0] = 1; d[Math.round(0.006 * sr)] = 0.6;
    for (const [at, lv, pn] of ECHO) {
      // Each echo is a smeared burst; distance widens and darkens it.
      const i0 = Math.round(at * sr), w = Math.round((0.03 + 0.05 * at) * sr), k = 0.25 / (1 + 2 * at);
      const amp = lv * (pn === side ? 1 : 0.55);
      let y = 0;
      for (let i = 0; i < w && i0 + i < len; i++) { y += k * (Math.random() * 2 - 1 - y); d[i0 + i] += amp * 6 * y * Math.exp(-4 * i / w); }
    }
    // The roll: a dark tail that thins to -60 dB at six seconds.
    let y = 0;
    for (let i = Math.round(0.15 * sr); i < len; i++) {
      const x = i / len;
      y += (0.03 - 0.02 * x) * (Math.random() * 2 - 1 - y);
      d[i] += 2.2 * y * Math.exp(-6.9 * x) * Math.min(1, (i / sr - 0.15) / 0.4);
    }
  }
  const conv = ac.createConvolver(), inG = ac.createGain(), wet = ac.createGain();
  conv.normalize = true; conv.buffer = ir; wet.gain.value = 0.8;
  inG.connect(conv).connect(wet).connect(kit.out);
  verb = { ac, in: inG, ir };
  return inG;
}
// The charge bus: the charge sound's every output goes through it.
// QA records it alone, with no other sound.
let chargeBusN = null;
export function chargeBus(ac) {
  if (!chargeBusN || chargeBusN.context !== ac) { chargeBusN = ac.createGain(); chargeBusN.connect(kit.out); }
  return chargeBusN;
}
export let hum = null;
export function humStart(ac) {
  if (hum) return;
  // The echo's impulse builds in idle time during the hold, not on the shot.
  if (!verb || verb.ac !== ac) (window.requestIdleCallback || setTimeout)(() => plainVerb(ac), { timeout: 1500 });
  if (baked?.ac !== ac) (window.requestIdleCallback || setTimeout)(() => bake(ac), { timeout: 2500 });
  const P = MIX[chargeMix] || MIX.vast;
  if (P.stack) { hum = stackStart(ac, P, chargeBus(ac)); return; }
  const lp = filt(ac, 'lowpass', 180, 1.2), pre = ac.createGain(), shape = ac.createWaveShaper(), trem = ac.createGain(), g = ac.createGain();
  // A soft clip glues the stack and growls under drive.
  const curve = new Float32Array(257);
  for (let i = 0; i < 257; i++) curve[i] = Math.tanh(2.5 * (i / 128 - 1));
  shape.curve = curve; shape.oversample = '2x';
  pre.gain.value = 0.5; trem.gain.value = 1; g.gain.value = 0;
  lp.connect(pre).connect(shape).connect(trem).connect(g).connect(chargeBus(ac));
  const src = [], layers = [];
  PARTIALS.forEach(([ratio, type, enter, level], i) => {
    const lg = ac.createGain(), pan = ac.createStereoPanner(), os = [];
    lg.gain.value = 0;
    // High partials sit wide; the root sits in the middle.
    pan.pan.value = (i % 2 ? 1 : -1) * Math.min(0.7, 0.1 * i);
    for (const sgn of [-1, 1]) {
      const o = ac.createOscillator();
      o.type = type; o.detune.value = sgn * (3 + i); o.frequency.value = 55 * P.oct * ratio;
      o.connect(lg); o.start(); os.push(o); src.push(o);
    }
    lg.connect(pan).connect(lp);
    layers.push({ os, lg, ratio, enter, level });
  });
  const sub = ac.createOscillator(), sg = ac.createGain();
  sub.frequency.value = 27.5; sg.gain.value = 0;
  sub.connect(sg).connect(chargeBus(ac)); sub.start(); src.push(sub);
  const lfo = ac.createOscillator(), lg = ac.createGain();
  lfo.frequency.value = 0.5; lg.gain.value = 0.5;
  lfo.connect(lg).connect(trem.gain); lfo.start(); src.push(lfo);
  // Air tears round the barrel at rage.
  const nz = ac.createBufferSource(), nb = filt(ac, 'bandpass', 1200, 0.8), ng = ac.createGain();
  nz.buffer = kit.noise; nz.loop = true; ng.gain.value = 0;
  nz.connect(nb).connect(ng).connect(chargeBus(ac)); nz.start(); src.push(nz);
  // The choir runs through its own soft clip; the over-hold drives it.
  const cpre = ac.createGain(), cshape = ac.createWaveShaper(), cg = ac.createGain();
  cshape.curve = curve; cshape.oversample = '2x';
  cpre.gain.value = 0.6; cg.gain.value = 0;
  // Bloom: a closed lowpass holds the choir dark until the lock.
  const bloom = P.bloom ? filt(ac, 'lowpass', 380, 0.9) : null;
  if (bloom) cpre.connect(cshape).connect(bloom).connect(cg).connect(chargeBus(ac));
  else cpre.connect(cshape).connect(cg).connect(chargeBus(ac));
  // Each voice: [target, start semitones, arrival curve, sour sign, pan, bass].
  const list = VOICES.map(([tgt, harm, k, sour, pn]) => [tgt, 12 * Math.log2(harm), k, sour, pn, false]);
  // Bass voices rise a fifth into place.
  if (P.bass) BASS.forEach((tgt, i) => list.push([tgt, tgt - 7, 0.8 + 0.8 * Math.random(), Math.random() < 0.5 ? -1 : 1, (i % 2 ? 1 : -1) * 0.2 * i, true]));
  // Tiered mixes enter low to high; the top voices arrive at the climax.
  const rank = list.map((v, i) => i).sort((a, b) => list[a][0] - list[b][0]);
  const n = list.length, dual = P.bass;
  const voices = list.map(([tgt, start, k, sour, pn, low], i) => {
    const f1 = low ? filt(ac, 'lowpass', 320, 0.7) : filt(ac, 'bandpass', VOWEL.oo[0], 6);
    const f2 = filt(ac, 'bandpass', low ? VOWEL.uu[1] : VOWEL.oo[1], 8), vg = ac.createGain(), pan = ac.createStereoPanner();
    vg.gain.value = 0; pan.pan.value = pn;
    // Two saws six cents apart thicken each voice.
    const os = (dual ? [-6, 6] : [0]).map(dt => {
      const o = ac.createOscillator();
      o.type = 'sawtooth'; o.frequency.value = 55 * Math.pow(2, start / 12); o.detune.value = dt;
      o.connect(f1); o.connect(f2); o.start(); src.push(o);
      return o;
    });
    f1.connect(vg); f2.connect(vg);
    vg.connect(pan).connect(cpre);
    const enter = P.tier ? 0.04 + 0.78 * rank.indexOf(i) / (n - 1) : 0.6 * i / VOICES.length;
    return { os, f1, f2, vg, tgt, start, k, sour, low, ph: Math.random() * 6.28, enter };
  });
  // The plain send takes the hum and the choir.
  let vs = null;
  if (P.verb) {
    vs = ac.createGain(); vs.gain.value = 0;
    const dl = ac.createDelay(0.2), dk = filt(ac, 'lowpass', P.dark, 0.5);
    dl.delayTime.value = P.pre;
    g.connect(vs); cg.connect(vs);
    vs.connect(dl).connect(dk).connect(plainVerb(ac));
  }
  hum = { P, layers, src, lp, pre, g, sub, sg, lfo, lg, nb, ng, voices, cpre, cg, bloom, vs, vlev: dual ? 0.5 * Math.sqrt(18 / n) * 0.7 : 0.5, locked: false, lockAt: -1e9, sour: 0 };
  // A blend runs a surge swarm on top of the hum.
  if (P.surge) {
    const s = stackStart(ac, { ...P, stack: P.surge, verb: 0 }, chargeBus(ac));
    hum.surge = s; src.push(...s.src);
    if (vs) s.g.connect(vs);
  }
}
// Semitones from the hum's root for a voice at power c.
function voicePitch(v, c, t, P, wow, over) {
  const u = clamp((c - 0.12) / 0.88, 0, 1);
  const lock = THREE.MathUtils.smoothstep(c, 0.93, 1.0);
  // Each voice climbs on its own curve.
  let p = v.start + (v.tgt - v.start) * Math.pow(u, v.k * P.late);
  // Before the lock the voices wander and beat.
  p += (1 - lock) * u * 1.4 * Math.sin(t * (0.7 + v.k) + v.ph);
  // The over-hold pulls each voice sharp or flat.
  p += over * v.sour * (0.5 + 1.4 * v.k / 2.2) + over * 0.6 * Math.sin(t * 7.0 + v.ph);
  // A tiered voice scoops up from below as it enters.
  if (P.tier) p -= 5 * (1 - THREE.MathUtils.smoothstep(u, v.enter, v.enter + 0.2));
  return p + wow;
}
// s: the drive; the hold's own by default, the strike's surge otherwise.
// vol fades the whole stack in.
export function humUpdate(ac, s = charge && { c: charge.c, chaos, rage, over, vol: 1 }) {
  if (!hum || !s) return;
  // A stacked charge sound runs its own update, only while a hold lasts.
  if (hum.stack) { if (charge) stackUpdate(ac, hum); return; }
  const { c, chaos, rage, over, vol } = s, P = hum.P, t = ac.currentTime;
  // A slow tape wobble bends the whole charge.
  const wow = P.wob * Math.min(c, 1) * Math.sin(t * 1.9 + 0.8 * Math.sin(t * 0.7));
  // In Salvo each banked round lifts the hum a semitone.
  const lift = state.fireMode === 'salvo' ? (charge.bank || 0) : 0;
  const f = 55 * P.oct * Math.pow(2, (c * 7 + wow + lift) / 12), hg = Math.max(0.05, 0.5 * P.glide);
  for (const l of hum.layers) {
    for (const o of l.os) o.frequency.setTargetAtTime(f * l.ratio, t, hg);
    l.lg.gain.setTargetAtTime(0.12 * l.level * THREE.MathUtils.smoothstep(chaos, l.enter, l.enter + 0.1), t, 0.08);
  }
  const lockK = THREE.MathUtils.smoothstep(c, 0.93, 1.0);
  hum.sub.frequency.setTargetAtTime(55 * Math.pow(2, c * 7 / 12) / 2, t, hg);
  hum.lp.frequency.setTargetAtTime(180 * Math.pow(2, 4.8 * c), t, 0.05);
  hum.pre.gain.setTargetAtTime(0.5 + 2.5 * rage, t, 0.08);
  // In a blend the hum steps back a little as the swarm arrives.
  const duck = hum.surge ? 1 - 0.35 * THREE.MathUtils.smoothstep(c, 0.6, 1) : 1;
  hum.g.gain.setTargetAtTime(vol * 0.12 * (0.3 + 0.7 * c) * (0.6 + 0.4 * chaos) * P.hum * duck, t, 0.05);
  // Bloom mixes drop the sub in hard at the lock.
  hum.sg.gain.setTargetAtTime(vol * 0.14 * c * c * P.sub * (P.bloom ? 1 + 1.2 * lockK : 1), t, 0.05);
  hum.lfo.frequency.setTargetAtTime(1 / CHASE_T(c) + 14 * rage, t, 0.05);
  hum.lg.gain.setTargetAtTime(0.5 - 0.4 * c + 0.35 * rage, t, 0.05);
  hum.nb.frequency.setTargetAtTime(1200 + 2500 * rage, t, 0.08);
  hum.ng.gain.setTargetAtTime(vol * (0.05 * rage + 0.07 * over), t, 0.08);
  // The choir: the root stays at the full-power pitch once locked.
  const root = 55 * Math.pow(2, Math.min(c, 1) * 7 / 12);
  const u = clamp((c - 0.12) / 0.88, 0, 1);
  const locked = c >= 0.999 && over < 0.15;
  if (locked && !hum.locked) hum.lockAt = t;
  hum.locked = locked; hum.sour = over;
  // The vowel opens from oo to ah, then screams in the over-hold.
  const vo = THREE.MathUtils.smoothstep(u, 0.3, 0.95);
  const F1 = THREE.MathUtils.lerp(THREE.MathUtils.lerp(VOWEL.oo[0], VOWEL.ah[0], vo), VOWEL.scream[0], over);
  const F2 = THREE.MathUtils.lerp(THREE.MathUtils.lerp(VOWEL.oo[1], VOWEL.ah[1], vo), VOWEL.scream[1], over);
  // Bass voices open only halfway, from uu toward ah.
  const B2 = THREE.MathUtils.lerp(VOWEL.uu[1], VOWEL.ah[1], 0.5 * vo + 0.5 * over);
  const ramp = P.tier ? 0.15 : 0.25;
  for (const v of hum.voices) {
    const fr = root * Math.pow(2, voicePitch(v, c, t, P, wow, over) / 12);
    for (const o of v.os) o.frequency.setTargetAtTime(fr, t, P.glide);
    if (v.low) v.f2.frequency.setTargetAtTime(B2, t, 0.1);
    else { v.f1.frequency.setTargetAtTime(F1, t, 0.1); v.f2.frequency.setTargetAtTime(F2, t, 0.1); }
    v.vg.gain.setTargetAtTime(hum.vlev * THREE.MathUtils.smoothstep(u, v.enter, v.enter + ramp), t, 0.1);
  }
  // A swell at the lock, then a held chord.
  const accent = Math.exp(-(t - hum.lockAt) / 1.2);
  const env = P.tier ? THREE.MathUtils.smoothstep(u, 0.02, 0.5) : THREE.MathUtils.smoothstep(u, 0.15, 0.9);
  hum.cg.gain.setTargetAtTime(vol * 0.11 * P.choir * env * (1 + P.accent * accent) * (1 + 0.3 * over), t, 0.08);
  hum.cpre.gain.setTargetAtTime(0.6 + 4 * over, t, 0.08);
  // The bloom opens from 380 Hz to 7.5 kHz over the last stretch.
  if (hum.bloom) hum.bloom.frequency.setTargetAtTime(380 * Math.pow(2, 4.3 * Math.max(THREE.MathUtils.smoothstep(u, 0.8, 1.0), over)), t, 0.15);
  // The echoes grow with the charge and swell at the lock.
  if (hum.vs) hum.vs.gain.setTargetAtTime(P.verb * (0.5 + 0.5 * u) * (1 + 0.6 * accent), t, 0.1);
  if (hum.surge) stackUpdate(ac, hum.surge);
}
// The vent: the choir groans down two octaves and dies.
export function humGroan(ac) {
  if (!hum || !ac) { humStop(ac, true); return; }
  const h = hum, t = ac.currentTime;
  hum = null;
  // Plain mixes fall slower and roll on across the flats.
  const long = !!h.P.verb, fall = long ? 0.9 : 0.5, end = long ? 4.5 : 2.6;
  for (const v of h.surge ? [...h.voices, ...h.surge.voices] : h.voices) for (const o of v.os) o.frequency.setTargetAtTime(o.frequency.value / 4, t, fall);
  h.cg.gain.setTargetAtTime(0, t + (long ? 0.6 : 0.3), fall);
  if (h.surge) h.surge.g.gain.setTargetAtTime(0, t + (long ? 0.6 : 0.3), fall);
  for (const n of [h.g, h.sg, h.ng]) n.gain.setTargetAtTime(0, t, 0.05);
  for (const n of h.src) n.stop(t + end);
  track(t + end + 0.1, ...h.src);
}
export function humStop(ac, now = false) {
  if (!hum) return;
  const h = hum, t = ac ? ac.currentTime : 0;
  hum = null;
  if (!ac || now) { for (const n of h.src) { try { n.stop(); n.disconnect(); } catch { /* not started */ } } return; }
  for (const n of [h.g, h.sg, h.ng, h.cg, h.surge?.g].filter(Boolean)) n.gain.setTargetAtTime(0, t, 0.03);
  for (const n of h.src) n.stop(t + 0.4);
  track(t + 0.5, ...h.src);
}
