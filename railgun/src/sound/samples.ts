// Load order: sound/rumble runs first.
import './rumble.ts';
import { filt, hiss, jit } from './kit.ts';

/* ---------- baked buffers ---------- */
// The slug's N-wave and the debris rattle.
// They build once per context, in idle time during the charge.
// The baked buffers of one context.
export interface Baked { ac: BaseAudioContext; nwave: AudioBuffer; rattle: AudioBuffer }
export let baked: Baked | null = null;
export function bake(ac: BaseAudioContext) {
  if (baked?.ac === ac) return baked;
  baked = {
    ac, nwave: nWave(ac),
    // Rattle: thick at first, then thinning; ticks, grit and a few stones.
    rattle: grains(ac, 3.5, 24000, t => 70 * Math.exp(-t / 0.8) + 4, t => {
      const r = Math.random(), a = Math.exp(-t / 1.4) * (0.3 + 0.7 * Math.random());
      return r < 0.55 ? [0.004 + 0.012 * Math.random(), 1500 + 3500 * Math.random(), 0.5 * a] : r < 0.88 ? [0.01 + 0.02 * Math.random(), 0, 0.9 * a] : [0.03 + 0.05 * Math.random(), 250 + 450 * Math.random(), 0.7 * a];
    }),
  };
  return baked;
}
// The slug's sonic boom: a jump up, a straight fall, a jump back.
function nWave(ac: BaseAudioContext) {
  const sr = ac.sampleRate, n = Math.round(0.012 * sr), b = ac.createBuffer(1, n + 8, sr), d = b.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = 1 - 2 * i / n;
  return b;
}
// A stereo buffer of short grains at a falling rate.
// rate(t): grains a second. grain(t): [length s, ring hertz or 0, level].
function grains(ac: BaseAudioContext, dur: number, sr: number, rate: (t: number) => number, grain: (t: number) => [number, number, number]) {
  const b = ac.createBuffer(2, Math.round(dur * sr), sr), L = b.getChannelData(0), R = b.getChannelData(1);
  for (let t = 0.01; t < dur; t += -Math.log(1 - Math.random()) / rate(t)) {
    const [len, ring, lv] = grain(t), n = Math.round(len * sr), i0 = Math.round(t * sr), p = Math.random();
    const gl = lv * Math.sqrt(1 - p), gr = lv * Math.sqrt(p), w = 2 * Math.PI * ring / sr;
    let y = 0;
    for (let i = 0; i < n && i0 + i < L.length; i++) {
      const e = Math.exp(-5 * i / n);
      // A ring is a struck partial; no ring is a dull puff of noise.
      const s = ring ? Math.sin(w * i) : (y += 0.35 * (Math.random() * 2 - 1 - y)) * 2;
      L[i0 + i] += gl * e * s; R[i0 + i] += gr * e * s;
    }
  }
  return b;
}
// A rolling tail: low noise whose level waves on two slow beats.
// It swells, ebbs over dur seconds and drifts across the plain.
export function roll(ac: BaseAudioContext, dest: AudioNode, t: number, dur: number, lvl: number, cut: number) {
  const n = hiss(ac, t, dur, 0.3), lp = filt(ac, 'lowpass', cut, 0.6), am = ac.createGain(), g = ac.createGain(), pn = ac.createStereoPanner();
  am.gain.value = 0.65;
  const srcs: AudioScheduledSourceNode[] = [n];
  for (const [fr, dp] of [[0.21, 0.22], [0.47, 0.13], [0.06, 0]]) {
    const l = ac.createOscillator(), lg = ac.createGain();
    l.frequency.value = fr * jit(0.3); lg.gain.value = dp || 0.45;
    // The slowest beat moves the pan, not the level.
    l.connect(lg).connect(dp ? am.gain : pn.pan); l.start(t); l.stop(t + dur); srcs.push(l);
  }
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(lvl, t + Math.min(2, dur * 0.2));
  g.gain.setTargetAtTime(0.0001, t + Math.min(3, dur * 0.3), dur / 6);
  lp.frequency.setValueAtTime(cut, t); lp.frequency.setTargetAtTime(cut * 0.45, t + 2, dur / 3);
  n.connect(lp).connect(am).connect(g).connect(pn).connect(dest);
  return srcs;
}
