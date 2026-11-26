// Synthesized crisp paper flick, air gust, and bill flip sounds on audioKit.

import { sound } from '../../shared/stim.js';

interface Kit {
  readonly ac: AudioContext | null;
  readonly out: GainNode | null;
  readonly noise: AudioBuffer | null;
  live(): void;
}

export interface CashSound {
  flick(pan?: number, strength?: number): void;
  gust(pan?: number, speed?: number): void;
  flip(pan?: number): void;
  unfurl(pan?: number, wear?: number): void;
  burst(count?: number): void;
  cancel(): void;
}

export function createCashSound(kit: Kit): CashSound {
  let lastFlick = 0;
  let lastGust = 0;
  const active = new Set<AudioNode>();

  function track(src: AudioScheduledSourceNode, endNode: AudioNode) {
    active.add(src);
    src.onended = () => {
      active.delete(src);
      try { endNode.disconnect(); } catch { /* node already detached */ }
    };
  }

  function makePan(ac: AudioContext, pan: number, dest: AudioNode): AudioNode {
    if (typeof ac.createStereoPanner !== 'function') return dest;
    const p = ac.createStereoPanner();
    p.pan.value = Math.max(-0.85, Math.min(0.85, pan));
    p.connect(dest);
    return p;
  }

  // Short crisp bandpass noise burst mimics snapping a banknote off a stack.
  function flick(pan = 0, strength = 1) {
    if (!sound.on || !kit.ac || !kit.out || !kit.noise) return;
    const now = performance.now();
    if (now - lastFlick < 26) return;
    lastFlick = now;

    kit.live();
    const ac = kit.ac;
    const t0 = ac.currentTime;
    const src = ac.createBufferSource();
    src.buffer = kit.noise;
    src.playbackRate.value = 0.85 + Math.random() * 0.4;

    const bp = ac.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(2100 + Math.random() * 1400, t0);
    bp.frequency.exponentialRampToValueAtTime(950 + Math.random() * 400, t0 + 0.055);
    bp.Q.value = 2.2;

    const gain = ac.createGain();
    const peak = Math.min(0.24, 0.14 * strength);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.linearRampToValueAtTime(peak, t0 + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.068);

    const out = makePan(ac, pan, kit.out);
    src.connect(bp).connect(gain).connect(out);
    const offset = Math.random() * Math.max(0.1, kit.noise.duration - 0.15);
    src.start(t0, offset, 0.08);
    track(src, out === kit.out ? gain : out);
  }

  // Soft low-mid whoosh answers fast pointer swipes through falling bills.
  function gust(pan = 0, speed = 1) {
    if (!sound.on || !kit.ac || !kit.out || !kit.noise) return;
    const now = performance.now();
    if (now - lastGust < 110) return;
    lastGust = now;

    kit.live();
    const ac = kit.ac;
    const t0 = ac.currentTime;
    const src = ac.createBufferSource();
    src.buffer = kit.noise;

    const lp = ac.createBiquadFilter();
    lp.type = 'bandpass';
    lp.frequency.setValueAtTime(280 + speed * 260, t0);
    lp.frequency.exponentialRampToValueAtTime(160, t0 + 0.22);
    lp.Q.value = 1.1;

    const gain = ac.createGain();
    const peak = Math.min(0.16, 0.06 + speed * 0.05);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.linearRampToValueAtTime(peak, t0 + 0.035);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.24);

    const out = makePan(ac, pan, kit.out);
    src.connect(lp).connect(gain).connect(out);
    src.start(t0, Math.random() * 0.5, 0.26);
    track(src, out === kit.out ? gain : out);
  }

  // Crisp page-turn flutter for inspection pluck and front/back flips.
  function flip(pan = 0) {
    if (!sound.on || !kit.ac || !kit.out || !kit.noise) return;
    kit.live();
    const ac = kit.ac;
    const t0 = ac.currentTime;
    const src = ac.createBufferSource();
    src.buffer = kit.noise;

    const bp = ac.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(1400, t0);
    bp.frequency.exponentialRampToValueAtTime(2900, t0 + 0.05);
    bp.frequency.exponentialRampToValueAtTime(1100, t0 + 0.14);
    bp.Q.value = 1.8;

    const gain = ac.createGain();
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.linearRampToValueAtTime(0.16, t0 + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.16);

    const out = makePan(ac, pan, kit.out);
    src.connect(bp).connect(gain).connect(out);
    src.start(t0, Math.random() * 0.5, 0.18);
    track(src, out === kit.out ? gain : out);
  }

  // Rapid fanned riffle scheduled on the audio clock for a cash burst.
  function burst(count = 7) {
    if (!sound.on || !kit.ac || !kit.out || !kit.noise) return;
    kit.live();
    const ac = kit.ac;
    const n = Math.min(10, Math.max(3, count));
    for (let i = 0; i < n; i++) {
      const delay = i * 0.032 + Math.random() * 0.01;
      const t0 = ac.currentTime + delay;
      const src = ac.createBufferSource();
      src.buffer = kit.noise;
      src.playbackRate.value = 0.9 + (i / n) * 0.35 + Math.random() * 0.15;

      const bp = ac.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(1850 + i * 160 + Math.random() * 400, t0);
      bp.Q.value = 2.4;

      const gain = ac.createGain();
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.linearRampToValueAtTime(0.11, t0 + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.052);

      const pan = (i / (n - 1) - 0.5) * 1.1;
      const out = makePan(ac, pan, kit.out);
      src.connect(bp).connect(gain).connect(out);
      src.start(t0, Math.random() * 0.5, 0.06);
      track(src, out === kit.out ? gain : out);
    }
  }

  // Multi-crinkle paper straightening rustle when unfolding a crumpled note.
  function unfurl(pan = 0, wear = 0.7) {
    if (!sound.on || !kit.ac || !kit.out || !kit.noise) return;
    kit.live();
    const ac = kit.ac;
    const taps = wear > 0.55 ? 4 : 2;
    for (let i = 0; i < taps; i++) {
      const delay = i * 0.068 + Math.random() * 0.022;
      const t0 = ac.currentTime + delay;
      const src = ac.createBufferSource();
      src.buffer = kit.noise;
      src.playbackRate.value = 0.92 + i * 0.14 + Math.random() * 0.18;

      const bp = ac.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(2400 + i * 320, t0);
      bp.frequency.exponentialRampToValueAtTime(1250, t0 + 0.09);
      bp.Q.value = 2.6;

      const gain = ac.createGain();
      const peak = (0.09 + 0.08 * wear) * (1 - i * 0.14);
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.linearRampToValueAtTime(peak, t0 + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.105);

      const out = makePan(ac, pan + (i % 2 === 0 ? -0.15 : 0.15), kit.out);
      src.connect(bp).connect(gain).connect(out);
      src.start(t0, Math.random() * 0.5, 0.12);
      track(src, out === kit.out ? gain : out);
    }
  }

  function cancel() {
    for (const node of active) {
      try { (node as AudioScheduledSourceNode).stop(); } catch { /* already stopped */ }
    }
    active.clear();
  }

  return { flick, gust, flip, unfurl, burst, cancel };
}
