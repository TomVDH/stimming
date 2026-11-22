// Chemical garden: sound. Raw Web Audio on the shared kit, muted by default.
// Each sound has a visible cause: the drop, the landing, each burst, the growth.

const rand = (a, b) => a + Math.random() * (b - a);
// No hit repeats exactly: a small random factor on pitch, time and level.
const jit = x => 1 + (Math.random() * 2 - 1) * x;
const clampPan = p => Math.max(-1, Math.min(1, p));

export function gardenSound(kit) {
  let V = null;
  // The fizz bed: looped noise through a band-pass; growth opens it.
  function voices() {
    const ac = kit.live();
    if (!ac || !kit.out || !kit.noise) return null;
    if (V) return V;
    const src = ac.createBufferSource();
    src.buffer = kit.noise; src.loop = true;
    const bp = ac.createBiquadFilter();
    bp.type = 'bandpass'; bp.frequency.value = 3200; bp.Q.value = 0.9;
    const g = ac.createGain();
    g.gain.value = 0;
    const pan = ac.createStereoPanner();
    src.connect(bp).connect(g).connect(pan).connect(kit.out);
    src.start();
    V = { ac, g, bp, pan, grain: 0 };
    return V;
  }

  function osc(t, { type = 'sine', f0, f1 = f0, glide = 0.05, gain, att = 0.003, dur, pan = 0 }) {
    const ac = kit.ac, o = ac.createOscillator(), g = ac.createGain(), p = ac.createStereoPanner();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + glide);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain, t + att);
    g.gain.exponentialRampToValueAtTime(1e-4, t + dur);
    p.pan.value = clampPan(pan);
    o.connect(g).connect(p).connect(kit.out);
    o.start(t); o.stop(t + dur + 0.05);
  }
  function noise(t, { f0, f1 = f0, q = 1, type = 'bandpass', gain, att = 0.004, dur, pan = 0 }) {
    const ac = kit.ac, s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain(), p = ac.createStereoPanner();
    s.buffer = kit.noise;
    f.type = type; f.Q.value = q;
    f.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) f.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain, t + att);
    g.gain.exponentialRampToValueAtTime(1e-4, t + dur);
    p.pan.value = clampPan(pan);
    s.connect(f).connect(g).connect(p).connect(kit.out);
    s.start(t, Math.random() * 0.5, dur + 0.05);
  }

  return {
    // The crystal breaks the surface: a small plink and a splash, then bubbles.
    drop(pan) {
      if (!voices()) return;
      const t = kit.ac.currentTime + 0.005;
      osc(t, { f0: 700 * jit(0.12), f1: 1900 * jit(0.12), glide: 0.045, gain: 0.16 * jit(0.2), dur: 0.09, pan });
      noise(t, { f0: 2600 * jit(0.15), f1: 1200, q: 1.4, gain: 0.07 * jit(0.25), dur: 0.12, pan });
      for (let i = 0; i < 3; i++) {
        const d = 0.08 + i * rand(0.05, 0.11);
        osc(t + d, { f0: rand(1800, 3400), f1: rand(3600, 5200), glide: 0.025, gain: 0.025 * jit(0.4), dur: 0.035, pan: pan + rand(-0.1, 0.1) });
      }
    },
    // The crystal lands on the glass floor: a small glass tick and a thud.
    land(pan, size) {
      if (!voices()) return;
      const t = kit.ac.currentTime + 0.003;
      const f = 3000 * jit(0.08) * (0.016 / Math.max(size, 0.008)) ** 0.3;
      osc(t, { f0: f, gain: 0.07 * jit(0.2), att: 0.001, dur: 0.14, pan });
      osc(t, { f0: f * 1.73, gain: 0.03 * jit(0.3), att: 0.001, dur: 0.07, pan });
      noise(t, { type: 'lowpass', f0: 500, q: 0.5, gain: 0.1 * jit(0.2), dur: 0.08, pan });
    },
    // A skin bursts: a soft wet pop, higher for a thinner tube.
    pop(pan, r, big = false) {
      if (!voices()) return;
      const t = kit.ac.currentTime + rand(0, 0.012);
      const f = Math.min(1400, 5.2 / Math.max(r, 0.003)) * jit(0.15);
      osc(t, { f0: f, f1: f * 0.55, glide: 0.07, gain: (big ? 0.2 : 0.11) * jit(0.3), att: 0.002, dur: big ? 0.16 : 0.1, pan });
      noise(t, { f0: 1800 * jit(0.2), q: 2, gain: (big ? 0.05 : 0.025) * jit(0.3), att: 0.001, dur: 0.03, pan });
    },
    // A tip meets the surface: a faint bright touch.
    surface(pan) {
      if (!voices()) return;
      const t = kit.ac.currentTime + 0.004;
      osc(t, { f0: 2400 * jit(0.1), f1: 2900, glide: 0.03, gain: 0.03 * jit(0.3), dur: 0.12, pan });
    },
    // The towers crumble: a soft rustle across the tank.
    crumble(pan, delay = 0) {
      if (!voices()) return;
      const t = kit.ac.currentTime + delay;
      noise(t, { type: 'lowpass', f0: 1400, f1: 300, q: 0.6, gain: 0.06 * jit(0.3), att: 0.12, dur: 0.9, pan });
      for (let i = 0; i < 4; i++) noise(t + rand(0.05, 0.7), { f0: rand(2500, 5000), q: 3, gain: 0.02 * jit(0.4), att: 0.001, dur: 0.025, pan: pan + rand(-0.2, 0.2) });
    },
    // Growth: the fizz bed and tiny crackles follow the growth rate.
    tick(dt, rate, pan) {
      const v = voices();
      if (!v) return;
      const t = v.ac.currentTime, k = Math.min(1, rate / 6);
      v.g.gain.setTargetAtTime(0.045 * Math.sqrt(k), t, 0.15);
      v.bp.frequency.setTargetAtTime(2600 + 1600 * k, t, 0.2);
      v.pan.pan.setTargetAtTime(clampPan(pan), t, 0.3);
      v.grain += dt * 22 * k;
      while (v.grain > 1) {
        v.grain -= 1;
        noise(t + Math.random() * dt, { f0: rand(3000, 7000), q: 4, gain: 0.012 * jit(0.5), att: 0.001, dur: 0.015, pan: pan + rand(-0.4, 0.4) });
      }
    },
    hush() { if (V) V.g.gain.setTargetAtTime(0, V.ac.currentTime, 0.08); },
  };
}
