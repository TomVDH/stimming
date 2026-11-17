// @ts-nocheck
// Load order: sound/samples runs first.
import './samples.ts';
import { state } from '../state.ts';
import { shotMix } from '../setup.ts';
import { wake } from '../loop.ts';
import { blip, burst, filt, hiss, jit, kit, track } from './kit.ts';
import { plainVerb } from './hum.ts';
import { echo, sample } from './rumble.ts';
import { bake, roll } from './samples.ts';

/* ---------- the shot ---------- */
// The shot bus: the impact's prelude ducks the shot's tail under its swell.
// The duck holds the dry sound and the send into the echoes.
let shotG = null, shotW = null;
function shotBus(ac) {
  if (shotG?.context !== ac) {
    shotG = ac.createGain(); shotG.connect(kit.out);
    shotW = ac.createGain(); shotW.connect(plainVerb(ac));
  }
  return shotG;
}
const shotSend = ac => (shotBus(ac), shotW);
export function shotDuck(ac, to, at, tau) {
  for (const p of [shotBus(ac).gain, shotW.gain]) { p.cancelScheduledValues(at); p.setValueAtTime(p.value, at); p.setTargetAtTime(to, at, tau); }
}
// The shot plays as the slug leaves the muzzle.
export function shotSound(ac, sh) {
  const at = ac.currentTime + 0.3;
  sh.sfx = { ...sh.sfx, shot: at, shotLate: 0, take: shotMix };
  playShot(ac, at, Math.min(sh.c, 1.25), shotMix, sh);
}
// One take at time t with charge k.
// A report that decodes after its shot is gone stays silent.
export function playShot(ac, t, k, name, sh = null) {
  // A new shot lifts the last duck.
  shotDuck(ac, 1, ac.currentTime, 0.005);
  if (name === 'report' || !TAKES[name]) {
    sample(ac, 'shot').then(buf => {
      if (!buf || (sh && state.shot !== sh) || !kit.live()) return;
      t = Math.max(ac.currentTime, t);
      if (sh) sh.sfx.shot = t;
      report(ac, buf, t, k);
    });
    return;
  }
  const { srcs, end } = TAKES[name](ac, t, k);
  track(end, ...srcs);
}
// A pick in Settings plays the take once, while no shot flies.
function audition(name) {
  const ac = kit.live();
  if (!ac || state.shot) return;
  playShot(ac, ac.currentTime + 0.05, 1, name);
  wake();
}
// Report: Tom's cannon sample with a sub punch under it.
function report(ac, buf, t0, k) {
  const src = ac.createBufferSource(), g = ac.createGain();
  src.buffer = buf; src.playbackRate.value = jit(0.03);
  // Its long tail fades out before the boom lands.
  const lvl = 1.4 * k * jit(0.1);
  g.gain.setValueAtTime(lvl, t0); g.gain.setTargetAtTime(0, t0 + 4, 3.5);
  src.connect(g).connect(shotBus(ac));
  // The report rolls off the mesas across the flats.
  echo(ac, g, 0.35, 6000, shotSend(ac));
  src.start(t0); src.stop(t0 + 20);
  const o = blip(ac, shotBus(ac), t0, { f0: 52, f1: 28, glide: 0.7, peak: 0.8 * k, a: 0.015, dur: 0.9 });
  echo(ac, o, 0.25, 400, shotSend(ac));
  track(t0 + 20.1, src, o);
}
// Mesa echoes: [delay s, pan, level].
const MESAS = [[0.85, -0.7, 0.55], [1.5, 0.75, 0.42], [2.35, -0.5, 0.33], [3.4, 0.6, 0.24], [4.7, -0.35, 0.16], [6.3, 0.4, 0.1]];
// The synth takes: each plays at t with charge k.
// Each returns its sources and its end time.
const TAKES = {
  // Mesa: a deep cannon; its echo rolls off the mesas for ten seconds.
  mesa(ac, t, k) {
    const o = shotBus(ac), b = burst(ac, o, t, { dur: 1.8, rate: 0.6, type: 'lowpass', f: 2600, f1: 150, q: 0.8, peak: 0.85 * k, a: 0.005 });
    echo(ac, b.g, 0.6, 2000, shotSend(ac));
    // The body: two low tones sink under the blast.
    const srcs = [b.src,
      blip(ac, o, t, { f0: 56, f1: 23, glide: 1.3, peak: 0.95 * k, a: 0.01, dur: 1.7 }),
      blip(ac, o, t, { type: 'triangle', f0: 120, f1: 40, glide: 0.45, peak: 0.3 * k, a: 0.004, dur: 0.7 })];
    // Each mesa wall answers later, wider and darker.
    MESAS.forEach(([dt, pan, lv], i) => srcs.push(burst(ac, o, t + dt, { dur: 0.9 + 0.4 * i, rate: 0.45, type: 'lowpass', f: 1100 / (1 + 0.6 * i), f1: 110, q: 0.6, peak: lv * k, a: 0.03 + 0.04 * i, pan }).src));
    srcs.push(...roll(ac, o, t + 0.3, 10, 0.3 * k, 170));
    return { srcs, end: t + 10.5 };
  },
  // Coil: a hard electric crack, a ringing barrel, the slug's supersonic snap.
  coil(ac, t, k) {
    const o = shotBus(ac), srcs = [];
    // The crack: a bright tear of noise, then a sizzle that falls.
    srcs.push(burst(ac, o, t, { dur: 0.05, rate: 1.5, type: 'highpass', f: 2200, peak: 0.9 * k, a: 0.0008 }).src,
      burst(ac, o, t, { dur: 0.35, rate: 1.2, f: 6000, f1: 1500, q: 1.2, peak: 0.25 * k, a: 0.002 }).src);
    // The discharge: a saw falls from a shriek to a growl.
    const lp = filt(ac, 'lowpass', 5000, 0.7);
    lp.connect(o);
    srcs.push(blip(ac, lp, t, { type: 'sawtooth', f0: 2600, f1: 70, glide: 0.2, peak: 0.16 * k, a: 0.001, dur: 0.32 }),
      blip(ac, o, t, { f0: 62, f1: 30, glide: 0.5, peak: 0.75 * k, a: 0.006, dur: 0.7 }));
    // The barrel rings: struck-bar partials, each a beating pair.
    const ring = ac.createGain(), f = 360 * jit(0.03);
    ring.connect(o);
    echo(ac, ring, 0.45, 7000, shotSend(ac));
    for (const [r, lv, d] of [[1, 0.22, 3.4], [2.76, 0.15, 2.5], [5.4, 0.1, 1.7], [8.93, 0.06, 1.1]]) {
      for (const det of [-0.6, 0.6]) srcs.push(blip(ac, ring, t + 0.002, { f0: f * r + det, peak: lv * k, a: 0.002, dur: d }));
    }
    // The snap: the slug's N-wave, then its flutter off the plain.
    const hp = filt(ac, 'highpass', 180, 0.7), nw = bake(ac).nwave;
    hp.connect(o);
    for (const [dt, lv] of [[0.09, 0.9], [0.13, 0.35], [0.21, 0.2], [0.34, 0.1]]) {
      const s = ac.createBufferSource(), g = ac.createGain();
      s.buffer = nw; g.gain.value = lv * k;
      s.connect(g).connect(hp); s.start(t + dt); srcs.push(s);
    }
    return { srcs, end: t + 3.6 };
  },
  // Thump: a heavy knock, a pressure whoomp, then debris rattling down.
  thump(ac, t, k) {
    const o = shotBus(ac), srcs = [];
    // The knock: a dull burst and a deep falling tone.
    srcs.push(burst(ac, o, t, { dur: 0.14, rate: 0.7, type: 'lowpass', f: 600, f1: 140, peak: 0.9 * k, a: 0.002 }).src,
      blip(ac, o, t, { f0: 78, f1: 27, glide: 0.4, peak: 1.0 * k, a: 0.004, dur: 1.0 }));
    // The whoomp: low air pushed out; a resonant filter opens and shuts.
    const n = hiss(ac, t, 1.6, 0.4), lp = filt(ac, 'lowpass', 90, 3), g = ac.createGain();
    lp.frequency.setValueAtTime(90, t); lp.frequency.exponentialRampToValueAtTime(750, t + 0.16); lp.frequency.exponentialRampToValueAtTime(100, t + 1.1);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.8 * k, t + 0.1); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.5);
    n.connect(lp).connect(g).connect(o);
    echo(ac, g, 0.45, 900, shotSend(ac));
    srcs.push(n, blip(ac, o, t + 0.04, { f0: 24, f1: 19, glide: 1.2, peak: 0.55 * k, a: 0.12, dur: 1.5 }));
    // Debris: grit and stones rattle off the gun for three seconds.
    const r = ac.createBufferSource(), hp = filt(ac, 'highpass', 350, 0.7), rg = ac.createGain();
    r.buffer = bake(ac).rattle; r.playbackRate.value = jit(0.08); rg.gain.value = 0.6 * k;
    r.connect(hp).connect(rg).connect(o);
    echo(ac, rg, 0.2, 5000, shotSend(ac));
    r.start(t + 0.18); srcs.push(r);
    return { srcs, end: t + 4 };
  },
};
