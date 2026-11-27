// Subtle laboratory microscope audio on audioKit (muted by default).

import { sound } from '../../shared/stim.js';

interface Kit {
  readonly ac: AudioContext | null;
  readonly out: GainNode | null;
  readonly noise: AudioBuffer | null;
  live(): void;
}

export interface MicroscopeSound {
  turretClick(pitch?: number): void;
  focusTick(layerIdx: number): void;
  scanPing(): void;
  found(count: number, total: number): void;
  complete(): void;
  miss(): void;
  cancel(): void;
}

const PENTATONIC = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5, 1174.66, 1318.51, 1567.98, 1760.0];

export function createMicroscopeSound(kit: Kit): MicroscopeSound {
  let lastTick = 0;
  const active = new Set<AudioScheduledSourceNode>();

  function track(src: AudioScheduledSourceNode, end: AudioNode) {
    active.add(src);
    src.onended = () => {
      active.delete(src);
      try { end.disconnect(); } catch { /* already disconnected */ }
    };
  }

  // Crisp mechanical objective / illumination turret detent click.
  function turretClick(pitch = 1) {
    if (!sound.on || !kit.ac || !kit.out || !kit.noise) return;
    kit.live();
    const ac = kit.ac;
    const t0 = ac.currentTime;

    const src = ac.createBufferSource();
    src.buffer = kit.noise;
    src.playbackRate.value = 1.3 * pitch;

    const bp = ac.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(1950 * pitch, t0);
    bp.Q.value = 5.5;

    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.24, t0 + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.042);

    src.connect(bp).connect(g).connect(kit.out);
    track(src, g);
    src.start(t0);
    src.stop(t0 + 0.05);
  }

  // Soft piezo focus detent when crossing a metal layer (M1..M4).
  function focusTick(layerIdx: number) {
    if (!sound.on || !kit.ac || !kit.out) return;
    const now = performance.now();
    if (now - lastTick < 55) return;
    lastTick = now;

    kit.live();
    const ac = kit.ac;
    const t0 = ac.currentTime;
    const osc = ac.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(420 + layerIdx * 115, t0);
    osc.frequency.exponentialRampToValueAtTime(280 + layerIdx * 80, t0 + 0.025);

    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.065, t0 + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.032);

    osc.connect(g).connect(kit.out);
    track(osc, g);
    osc.start(t0);
    osc.stop(t0 + 0.04);
  }

  // Soft optical interferometry radar sweep.
  function scanPing() {
    if (!sound.on || !kit.ac || !kit.out) return;
    kit.live();
    const ac = kit.ac;
    const t0 = ac.currentTime;

    const osc = ac.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(640, t0);
    osc.frequency.exponentialRampToValueAtTime(1180, t0 + 0.34);

    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.11, t0 + 0.04);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.42);

    osc.connect(g).connect(kit.out);
    track(osc, g);
    osc.start(t0);
    osc.stop(t0 + 0.45);
  }

  // Shimmering ascending crystalline bell when logging a hidden doodle.
  function found(count: number, _total: number) {
    if (!sound.on || !kit.ac || !kit.out) return;
    kit.live();
    const ac = kit.ac;
    const t0 = ac.currentTime;
    const baseFreq = PENTATONIC[Math.max(0, Math.min(PENTATONIC.length - 1, count - 1))];

    [1, 1.5].forEach((mult, i) => {
      const osc = ac.createOscillator();
      osc.type = i === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(baseFreq * mult, t0 + i * 0.045);

      const g = ac.createGain();
      g.gain.setValueAtTime(0.0001, t0 + i * 0.045);
      g.gain.exponentialRampToValueAtTime(i === 0 ? 0.16 : 0.075, t0 + i * 0.045 + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + i * 0.045 + 0.55);

      osc.connect(g).connect(kit.out!);
      track(osc, g);
      osc.start(t0 + i * 0.045);
      osc.stop(t0 + i * 0.045 + 0.6);
    });
  }

  // Celebratory warm harmonic arpeggio when 10/10 doodles are logged.
  function complete() {
    if (!sound.on || !kit.ac || !kit.out) return;
    kit.live();
    const ac = kit.ac;
    const t0 = ac.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.51];
    notes.forEach((freq, i) => {
      const st = t0 + i * 0.075;
      const osc = ac.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, st);

      const g = ac.createGain();
      g.gain.setValueAtTime(0.0001, st);
      g.gain.exponentialRampToValueAtTime(0.12, st + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, st + 0.95);

      osc.connect(g).connect(kit.out!);
      track(osc, g);
      osc.start(st);
      osc.stop(st + 1.0);
    });
  }

  // Quiet muted tap on empty silicon.
  function miss() {
    if (!sound.on || !kit.ac || !kit.out) return;
    kit.live();
    const ac = kit.ac;
    const t0 = ac.currentTime;
    const osc = ac.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(170, t0);
    osc.frequency.exponentialRampToValueAtTime(95, t0 + 0.045);

    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.045, t0 + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.055);

    osc.connect(g).connect(kit.out);
    track(osc, g);
    osc.start(t0);
    osc.stop(t0 + 0.065);
  }

  return {
    turretClick,
    focusTick,
    scanPing,
    found,
    complete,
    miss,
    cancel() {
      for (const s of active) {
        try { s.stop(); } catch { /* already stopped */ }
      }
      active.clear();
    },
  };
}
