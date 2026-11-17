// @ts-nocheck
// Load order: sound/hum runs first.
import './hum.ts';
import * as THREE from 'three';
import { clamp } from '../setup.ts';
import { charge, over, rage } from '../play/charge.ts';
import { filt, kit } from './kit.ts';
import { hum, plainVerb } from './hum.ts';
import { bell, ratchet } from './gameover.ts';

/* ---------- the surge charge ---------- */
// Surge mixes: mechanical layers enter one by one as the charge grows.
// On top, a swarm of saws glides from chaos into one massive chord.
// Each profile: root (semitones from A1), chord tones per register,
// pre (an optional chord held until the lock), wave, mechanical layers.
// late and fade: a later swarm entry and a longer fade-in, for blends.
// Waves: saw (two detuned saws), organ (two squares), brass (saws, resonant filter),
// pipe (drawbar harmonics, a little buzz). leslie: a rotary tremolo on the swarm.
// Layers: mains, whine, turbine, grind (stone), toll (bells), ratchet (clanks).
export const SURGE = {
  // Surge: a pentatonic chord, open fifths, thirds and sixths.
  penta: { root: 0, wave: 'saw', mech: ['mains', 'whine', 'turbine'], bass: [-12, 0, 0, 7], mid: [12, 19, 24, 28, 31, 33, 36, 40], high: [43, 45, 48, 52, 55, 60] },
  // Surge Syl: Surge's chord and machines, with pipe-organ voices and a rotary tremolo.
  syl: { root: 0, wave: 'pipe', leslie: true, mech: ['mains', 'whine', 'turbine'], bass: [-12, 0, 0, 7], mid: [12, 19, 24, 28, 31, 33, 36, 40], high: [43, 45, 48, 52, 55, 60] },
  // Surge Hijaz: the flat second, the augmented second and the flat sixth.
  hijaz: { root: 0, wave: 'saw', mech: ['mains', 'whine', 'turbine'], bass: [-12, 0, 0, 7], mid: [12, 19, 24, 25, 28, 31, 32, 36], high: [37, 40, 43, 44, 48, 55] },
  // Colossus: a Lydian chord on D, bright and vast, over grinding stone.
  colossus: { root: 5, wave: 'brass', mech: ['mains', 'grind', 'turbine'], bass: [-12, 0, 0, 7], mid: [12, 19, 24, 26, 28, 30, 31, 35], high: [36, 38, 40, 42, 43, 47] },
  // Dirge: a minor eleventh on G, a temple organ, bells tolling faster.
  dirge: { root: -2, wave: 'organ', mech: ['grind', 'toll', 'mains'], bass: [-12, 0, 0, 7], mid: [12, 15, 19, 22, 24, 26, 27, 31], high: [34, 36, 39, 41, 43, 48] },
  // Leviathan: stacked fourths on E, very low, with a ratchet winding up.
  leviathan: { root: -5, wave: 'saw', mech: ['mains', 'ratchet', 'turbine'], bass: [-12, 0, 0, 7], mid: [12, 17, 22, 24, 27, 29, 32, 34], high: [36, 39, 41, 44, 46, 48] },
  // Eclipse: a whole-tone cloud that resolves to a major chord at the lock.
  eclipse: { root: 0, wave: 'brass', mech: ['mains', 'whine', 'turbine'], bass: [-12, 0, 0, 7], mid: [12, 16, 19, 24, 28, 31, 36, 40], high: [43, 48, 52, 55, 60, 64], pre: { bass: [-12, 0, 0, 6], mid: [12, 14, 18, 20, 22, 26, 28, 30], high: [32, 34, 36, 38, 40, 42] } },
  // Monolith Hum: the swarm alone, on E, where the hum's pitch lands.
  // The hum carries the machines; the swarm enters late.
  monohum: { root: 7, wave: 'saw', mech: [], sub: false, late: 0.3, fade: 0.18, bass: [-12, 0, 0, 7], mid: [12, 12, 19, 19, 24, 24, 31, 31], high: [36, 36, 43, 43, 48, 55] },
  // Monolith: octaves and fifths only, every machine running.
  monolith: { root: 0, wave: 'saw', mech: ['mains', 'whine', 'grind', 'turbine'], bass: [-12, 0, 0, 7], mid: [12, 12, 19, 19, 24, 24, 31, 31], high: [36, 36, 43, 43, 48, 55] },
};
// Per register: [entry charge, start low Hz, start high Hz, voice level].
const REG = { bass: [0.32, 40, 90, 0.12], mid: [0.48, 150, 450, 0.075], high: [0.72, 500, 1500, 0.05] };
export function stackStart(ac, P, dest = kit.out) {
  const src = [], S = SURGE[P.stack], R = 55 * Math.pow(2, S.root / 12), has = l => S.mech.includes(l);
  const osc = (type, f, to, dt = 0) => { const o = ac.createOscillator(); o.type = type; o.frequency.value = f; o.detune.value = dt; o.connect(to); o.start(); src.push(o); return o; };
  const gain = (to, v = 0) => { const n = ac.createGain(); n.gain.value = v; n.connect(to); return n; };
  const noise = (to, rate = 1) => { const n = ac.createBufferSource(); n.buffer = kit.noise; n.loop = true; n.playbackRate.value = rate; n.connect(to); n.start(); src.push(n); return n; };
  // Every layer runs through one soft clip for glue and growl.
  const cg = ac.createGain(), shape = ac.createWaveShaper(), g = ac.createGain();
  const curve = new Float32Array(257);
  for (let i = 0; i < 257; i++) curve[i] = Math.tanh(2 * (i / 128 - 1));
  shape.curve = curve; shape.oversample = '2x'; cg.gain.value = 0.8; g.gain.value = 0;
  cg.connect(shape).connect(g).connect(dest);
  const h = { P, S, R, stack: true, src, g, cg, locked: false, lockAt: -1e9, sour: 0, next: 0 };
  // The mains: a transformer hum, saw and square on the root.
  if (has('mains')) {
    const mlp = filt(ac, 'lowpass', 380, 1.5);
    h.mainsG = gain(cg); mlp.connect(h.mainsG);
    osc('sawtooth', R, mlp); osc('square', 2 * R, mlp, 7); osc('sawtooth', 3 * R, mlp, -5);
  }
  // The capacitor whine: a thin tone climbs four octaves.
  if (has('whine')) { h.whineG = gain(cg); h.whine = osc('sine', 180, h.whineG); h.whine2 = osc('triangle', 90, gain(h.whineG, 0.5)); }
  // Grinding stone: dark noise that heaves on two slow beats.
  if (has('grind')) {
    const gb = filt(ac, 'bandpass', 160, 1.6), gam = ac.createGain();
    h.grindG = gain(cg); gam.gain.value = 0.6; gb.connect(gam).connect(h.grindG);
    noise(gb, 0.35);
    for (const [fr, d] of [[0.37, 0.3], [0.83, 0.15]]) osc('sine', fr, gain(gam.gain, d));
    h.gb = gb;
  }
  // The sub: the root and the octave under it; a blend leaves it to the hum.
  h.sg = gain(dest);
  if (S.sub !== false) { osc('sine', R / 2, h.sg); osc('sine', R, gain(h.sg, 0.5)); }
  // The turbine: a saw and a band of noise throb faster and faster.
  // Its gain doubles as the rage noise the stop and the vent fade.
  h.ng = gain(cg);
  if (has('turbine')) {
    const am = gain(h.ng, 0.6);
    h.tb = filt(ac, 'bandpass', 500, 2.5); h.tb.connect(am);
    h.turb = osc('sawtooth', 2 * R, h.tb); noise(h.tb);
    h.thr = osc('sine', 3, gain(am.gain, 0.5));
  }
  // The swarm: two oscillators per voice, under a filter that opens with the charge.
  // Brass rings a resonant filter; organ uses squares.
  h.sw = filt(ac, 'lowpass', 600, S.wave === 'brass' ? 5 : 0.9);
  // The rotary tremolo: the swarm's level wobbles at 5.6 Hz.
  if (S.leslie) {
    const rot = ac.createGain();
    rot.gain.value = 0.85;
    osc('sine', 5.6, gain(rot.gain, 0.15));
    h.sw.connect(rot).connect(cg);
  } else h.sw.connect(cg);
  // Pipe: drawbar harmonics 1, 2, 3, 4, 6 and 8, over a faint saw buzz.
  let pw = null;
  if (S.wave === 'pipe') {
    const im = new Float32Array(17), DRAW = { 1: 1, 2: 0.75, 3: 0.45, 4: 0.55, 5: 0.12, 6: 0.3, 8: 0.25 };
    for (let n = 1; n < 17; n++) im[n] = (DRAW[n] || 0) + 0.08 / n;
    pw = ac.createPeriodicWave(new Float32Array(17), im);
  }
  const type = S.wave === 'organ' ? 'square' : 'sawtooth', wk = S.wave === 'organ' ? 0.7 : S.wave === 'pipe' ? 0.85 : 1;
  h.voices = [];
  for (const reg of ['bass', 'mid', 'high']) {
    const [enter, lo, hi, lv] = REG[reg], tg = S[reg];
    tg.forEach((s, i) => {
      const pn = ac.createStereoPanner();
      pn.pan.value = reg === 'bass' ? (i % 2 ? 0.15 : -0.15) : (i % 2 ? 1 : -1) * (0.25 + 0.5 * Math.random());
      pn.connect(h.sw);
      const vg = gain(pn), start = lo * Math.pow(hi / lo, Math.random());
      const os = (pw ? [-4, 4] : [-7, 7]).map(dt => osc(type, start, vg, dt));
      if (pw) for (const o of os) o.setPeriodicWave(pw);
      // late: the swarm's entries squeeze into the last part of the charge.
      const e = enter + 0.1 * i / tg.length;
      h.voices.push({ os, vg, ps: 12 * Math.log2(start / R), tgt: s, pre: S.pre ? S.pre[reg][i] : s, enter: S.late ? S.late + (1 - S.late) * e : e, lv: lv * wk, ph: 6.28 * Math.random(), rate: 0.3 + 0.5 * Math.random(), k: 1 + Math.random(), sour: Math.random() < 0.5 ? -1 : 1 });
    });
  }
  // The plain send takes the whole surge.
  if (P.verb) {
    h.vs = ac.createGain(); h.vs.gain.value = 0;
    const dl = ac.createDelay(0.2), dk = filt(ac, 'lowpass', P.dark, 0.5);
    dl.delayTime.value = P.pre;
    g.connect(h.vs).connect(dl).connect(dk).connect(plainVerb(ac));
  }
  return h;
}
// dv: an optional drive { c, over, rage, lock, vol, choir } in place of the charge.
// dv.choir drives the swarm alone; without it the swarm follows c.
// dv.accent scales the lock's accent; dv.glide sets the lock's glide in seconds.
export function stackUpdate(ac, h = hum, dv = null) {
  const P = h.P, c = dv ? dv.c : charge.c, t = ac.currentTime, u = clamp(c, 0, 1), ss = THREE.MathUtils.smoothstep;
  const cu = dv && dv.choir != null ? clamp(dv.choir, 0, 1) : u;
  const ov = dv ? dv.over : over, rg = dv ? dv.rage : rage, vol = dv ? dv.vol : 1;
  const locked = dv ? dv.lock : c >= 0.999 && ov < 0.15;
  if (locked && !h.locked) h.lockAt = t;
  h.locked = locked; h.sour = ov;
  const accent = (dv?.accent ?? 1) * Math.exp(-(t - h.lockAt) / 1.2);
  // The mains hum from the first instant.
  if (h.mainsG) h.mainsG.gain.setTargetAtTime(0.2 * ss(u, 0, 0.12) * (0.45 + 0.55 * u), t, 0.08);
  // The whine climbs from 180 Hz to 4 kHz.
  if (h.whine) {
    h.whine.frequency.setTargetAtTime(180 * Math.pow(2, 4.5 * u), t, 0.08);
    h.whine2.frequency.setTargetAtTime(90 * Math.pow(2, 4.5 * u), t, 0.08);
    h.whineG.gain.setTargetAtTime(0.035 * ss(u, 0.1, 0.22) * (1 - 0.5 * ss(u, 0.9, 1)), t, 0.08);
  }
  // The stone grinds louder and higher.
  if (h.grindG) { h.grindG.gain.setTargetAtTime(0.5 * ss(u, 0.08, 0.3) * (0.6 + 0.4 * u), t, 0.1); h.gb.frequency.setTargetAtTime(140 + 220 * u, t, 0.2); }
  // The sub swells, and drops in hard at the lock.
  h.sg.gain.setTargetAtTime(0.2 * ss(u, 0.22, 1) * (1 + 0.8 * accent) * vol, t, 0.08);
  // The turbine spins up from 3 to 18 throbs a second.
  h.ng.gain.setTargetAtTime((h.turb ? 0.1 * ss(u, 0.6, 0.72) : 0) + 0.06 * rg + 0.08 * ov, t, 0.08);
  if (h.turb) {
    h.thr.frequency.setTargetAtTime(3 + 15 * u + 10 * rg, t, 0.1);
    h.tb.frequency.setTargetAtTime(400 + 1600 * u + 2000 * rg, t, 0.1);
    h.turb.frequency.setTargetAtTime(2 * h.R * (1 + u), t, 0.1);
  }
  // Bells toll and the ratchet clanks, faster with the charge.
  // Each strike is scheduled ahead, so the rhythm holds between frames.
  if (u > 0.15 && (h.S.mech.includes('toll') || h.S.mech.includes('ratchet'))) {
    if (!h.next) h.next = t + 0.05;
    const toll = h.S.mech.includes('toll');
    while (h.next < t + 0.15) {
      if (toll) bell(ac, h, Math.max(t, h.next), u); else ratchet(ac, h, Math.max(t, h.next), u);
      h.next += toll ? 3.2 - 2.4 * u : 1 / (1 + 9 * u);
    }
  }
  // The swarm: each voice wanders, then glides to its chord tone.
  // A pre chord holds until the lock, then resolves slowly.
  for (const v of h.voices) {
    const k = ss(cu, v.enter, v.enter + (h.S.fade || 0.08)), conv = Math.pow(ss(cu, v.enter, 0.97), v.k);
    const p = v.ps + 1.5 * Math.sin(t * v.rate + v.ph) * (1 - conv), q = p + ((locked ? v.tgt : v.pre) - p) * conv;
    const fr = h.R * Math.pow(2, (q + ov * v.sour * 0.6) / 12);
    for (const o of v.os) o.frequency.setTargetAtTime(fr, t, locked && v.pre !== v.tgt ? (dv?.glide ?? 0.45) : 0.15);
    v.vg.gain.setTargetAtTime(v.lv * k, t, 0.1);
  }
  // The swarm's filter opens from 600 Hz to 9 kHz.
  // Pipe voices open less: from 1.5 kHz to 9 kHz.
  // dv.open sets the filter's floor in its place.
  h.sw.frequency.setTargetAtTime(dv?.open ? dv.open * Math.pow(9000 / dv.open, u) : h.S.wave === 'pipe' ? 1500 * Math.pow(2, 2.6 * u) : 600 * Math.pow(2, 3.9 * u), t, 0.1);
  // The drive grows with the charge and the over-hold.
  // dv.drive sets the drive in its place.
  h.cg.gain.setTargetAtTime(dv?.drive ?? 0.8 + 0.8 * u + 2.5 * ov, t, 0.1);
  h.g.gain.setTargetAtTime(0.42 * (0.25 + 0.75 * u) * P.hum * (1 + 0.5 * accent) * vol, t, 0.08);
  if (h.vs) h.vs.gain.setTargetAtTime(P.verb * (0.5 + 0.5 * u) * (1 + 0.6 * accent) * vol, t, 0.1);
}
