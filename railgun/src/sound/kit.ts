// Load order: loop runs first.
import '../loop.ts';
import { audioKit } from '../../../shared/stim.js';
import { state } from '../state.ts';

/* ---------- sound scaffolding ---------- */
// Sounds play only on a live context, so out and noise exist then.
export type SoundKit = Omit<ReturnType<typeof audioKit>, 'out' | 'noise'> & { readonly out: GainNode; readonly noise: AudioBuffer };
// A node in a held sound; a source node also stops.
export type SoundNode = AudioNode & { stop?: (when?: number) => void };
// A held sound: its nodes live until the end time.
export interface Held { end: number; nodes: SoundNode[]; tag?: string }
export const kit = audioKit({ keys: new Set([' ']) }) as SoundKit;
export const pend = new Set<Held>();
export function track(end: number, ...nodes: SoundNode[]): Held { const h = { end, nodes }; pend.add(h); return h; }
// Salvo sounds carry a tag, so a Reset can stop them.
export function trackS(end: number, ...nodes: SoundNode[]): Held { const h = { end, nodes, tag: 'salvo' }; pend.add(h); return h; }
export function prune() { const now = kit.ac?.currentTime ?? 0; for (const h of pend) if (h.end < now) pend.delete(h); }
export const pending = () => { prune(); return pend.size > 0; };
state.click = () => {};
export function stopAll() {
  for (const h of pend) for (const n of h.nodes) { try { n.stop?.(); } catch { /* not started */ } try { n.disconnect(); } catch { /* gone */ } }
  pend.clear();
}
export const jit = (a = 0.1) => 1 + (Math.random() * 2 - 1) * a;
export function filt(ac: BaseAudioContext, type: BiquadFilterType, fr: number, q = 0.7) { const b = ac.createBiquadFilter(); b.type = type; b.frequency.value = fr; b.Q.value = q; return b; }
// The over-hold crackle: a short bright burst of noise, panned at random.
export function crackle(ac: BaseAudioContext, k: number) {
  const t = ac.currentTime, d = 0.015 + 0.05 * Math.random(), n = hiss(ac, t, d + 0.02, 1.5);
  const bp = filt(ac, 'bandpass', 1800 + 4200 * Math.random(), 2.5), g = ac.createGain(), pn = ac.createStereoPanner();
  pn.pan.value = Math.random() * 1.6 - 0.8;
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.05 + 0.16 * k, t + 0.003); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  n.connect(bp).connect(g).connect(pn).connect(kit.out);
  track(t + d + 0.05, n);
}
export function hiss(ac: BaseAudioContext, t: number, dur: number, rate = 1) {
  const s = ac.createBufferSource();
  s.buffer = kit.noise; s.loop = true; s.playbackRate.value = rate;
  s.start(t, Math.random() * 0.9); s.stop(t + dur);
  return s;
}
// The options for blip(): f0 and f1 in Hz, times in seconds.
export interface BlipOpts { type?: OscillatorType; f0: number; f1?: number; glide?: number; peak: number; a?: number; dur: number }
// A tone with a pitch glide and a struck envelope; returns the oscillator.
export function blip(ac: BaseAudioContext, dest: AudioNode, t: number, { type = 'sine', f0, f1 = f0, glide = 0.5, peak, a = 0.01, dur }: BlipOpts) {
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + glide);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(peak, 2e-4), t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(dest); o.start(t); o.stop(t + dur + 0.05);
  return o;
}
// The options for burst(): f and f1 in Hz, times in seconds.
export interface BurstOpts { dur: number; rate?: number; type?: BiquadFilterType; f?: number; f1?: number; q?: number; peak: number; a?: number; pan?: number }
// A burst of filtered noise with a struck envelope; returns the source and its gain.
export function burst(ac: BaseAudioContext, dest: AudioNode, t: number, { dur, rate = 1, type = 'bandpass', f = 1000, f1 = f, q = 0.7, peak, a = 0.004, pan = 0 }: BurstOpts) {
  const src = hiss(ac, t, dur + 0.05, rate), b = filt(ac, type, f, q), g = ac.createGain();
  if (f1 !== f) b.frequency.exponentialRampToValueAtTime(f1, t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(peak, 2e-4), t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  let n = src.connect(b).connect(g);
  if (pan) { const p = ac.createStereoPanner(); p.pan.value = pan; n = n.connect(p); }
  n.connect(dest);
  return { src, g };
}
