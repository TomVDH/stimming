// Mechanical laboratory microscope audio on audioKit (muted by default).

import { sound } from '../../shared/stim.js';

interface Kit {
  readonly ac: AudioContext | null;
  readonly out: GainNode | null;
  readonly noise: AudioBuffer | null;
  live(): void;
}

export interface MicroscopeSound {
  turretClick(pitch?: number): void;
  filterClick(): void;
  focusTick(step: number): void;
  stageSwap(): void;
  cancel(): void;
}

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

  // Heavy machined brass/steel objective nosepiece detent click.
  function turretClick(pitch = 1) {
    if (!sound.on || !kit.ac || !kit.out || !kit.noise) return;
    kit.live();
    const ac = kit.ac;
    const t0 = ac.currentTime;

    const src = ac.createBufferSource();
    src.buffer = kit.noise;
    src.playbackRate.value = 1.05 * pitch;

    const bp = ac.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(1680 * pitch, t0);
    bp.Q.value = 6.2;

    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.22, t0 + 0.003);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.038);

    src.connect(bp).connect(g).connect(kit.out);
    track(src, g);
    src.start(t0);
    src.stop(t0 + 0.045);

    // Low mechanical body thump of the nosepiece seating.
    const osc = ac.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(210 * pitch, t0);
    osc.frequency.exponentialRampToValueAtTime(88, t0 + 0.032);

    const og = ac.createGain();
    og.gain.setValueAtTime(0.0001, t0);
    og.gain.exponentialRampToValueAtTime(0.11, t0 + 0.004);
    og.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.036);

    osc.connect(og).connect(kit.out);
    track(osc, og);
    osc.start(t0);
    osc.stop(t0 + 0.042);
  }

  // Crisp optical filter cube / prism slider snap.
  function filterClick() {
    turretClick(1.26);
  }

  // Subtle fine-focus micrometer gear detent.
  function focusTick(step: number) {
    if (!sound.on || !kit.ac || !kit.out || !kit.noise) return;
    const now = performance.now();
    if (now - lastTick < 52) return;
    lastTick = now;

    kit.live();
    const ac = kit.ac;
    const t0 = ac.currentTime;

    const src = ac.createBufferSource();
    src.buffer = kit.noise;
    src.playbackRate.value = 1.4 + (step % 3) * 0.08;

    const bp = ac.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(2800 + step * 140, t0);
    bp.Q.value = 8.0;

    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.055, t0 + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.018);

    src.connect(bp).connect(g).connect(kit.out);
    track(src, g);
    src.start(t0);
    src.stop(t0 + 0.024);
  }

  // Ceramic carrier seating onto the microscope chuck.
  function stageSwap() {
    if (!sound.on || !kit.ac || !kit.out || !kit.noise) return;
    kit.live();
    const ac = kit.ac;
    const t0 = ac.currentTime;

    const osc = ac.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(145, t0);
    osc.frequency.exponentialRampToValueAtTime(58, t0 + 0.065);

    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.15, t0 + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.075);

    osc.connect(g).connect(kit.out);
    track(osc, g);
    osc.start(t0);
    osc.stop(t0 + 0.085);
  }

  return {
    turretClick,
    filterClick,
    focusTick,
    stageSwap,
    cancel() {
      for (const s of active) {
        try { s.stop(); } catch { /* already stopped */ }
      }
      active.clear();
    },
  };
}
