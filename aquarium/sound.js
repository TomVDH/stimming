// Aquarium sound: the knock, food patter, nips, darts, pearls and a water bed.
// Raw Web Audio on the shared kit; muted until the toy's sound is on.
import { sound } from '../shared/stim.js';

const jit = (v, k) => v * (1 + (Math.random() * 2 - 1) * k);
const panOf = x => Math.max(-0.85, Math.min(0.85, x * 0.8));

export function aquariumSound(kit) {
  let bed = null;
  const live = () => (sound.on ? kit.live() : null);
  const gain = (ac, g = 0) => { const n = ac.createGain(); n.gain.value = g; return n; };
  const filt = (ac, type, f, q = 0.7) => { const n = ac.createBiquadFilter(); n.type = type; n.frequency.value = f; n.Q.value = q; return n; };
  const pan = (ac, x) => { const p = ac.createStereoPanner(); p.pan.value = panOf(x); p.connect(kit.out); return p; };
  // A noise burst through a filter.
  function burst(ac, x, { type = 'bandpass', f = 2000, q = 1, level = 0.2, decay = 0.05, at = 0 }) {
    const t = ac.currentTime + at, s = ac.createBufferSource(), g = gain(ac), p = pan(ac, x);
    s.buffer = kit.noise;
    s.playbackRate.value = jit(1, 0.2);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(level, t + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
    s.connect(filt(ac, type, f, q)).connect(g).connect(p);
    s.start(t, Math.random() * 0.5, decay + 0.05);
    s.onended = () => p.disconnect();
  }
  // A sine with a pitch glide.
  function tone(ac, x, { f0, f1, level, decay, at = 0, type = 'sine' }) {
    const t = ac.currentTime + at, o = ac.createOscillator(), g = gain(ac), p = pan(ac, x);
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(f1, t + decay);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(level, t + 0.003);
    g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
    o.connect(g).connect(p);
    o.start(t); o.stop(t + decay + 0.02);
    o.onended = () => p.disconnect();
  }

  // The water bed: a low hum of moving water and a faint high trickle.
  function startBed(ac) {
    if (bed || !kit.noise) return;
    const s = ac.createBufferSource();
    s.buffer = kit.noise; s.loop = true; s.playbackRate.value = 0.5;
    const lo = filt(ac, 'lowpass', 260, 0.5), hi = filt(ac, 'bandpass', 1500, 1.4);
    const gLo = gain(ac), gHi = gain(ac), out = gain(ac, 1);
    s.connect(lo).connect(gLo).connect(out);
    s.connect(hi).connect(gHi).connect(out);
    out.connect(kit.out);
    s.start();
    bed = { s, gLo, gHi, hi, out };
  }
  function stopBed() {
    if (!bed) return;
    const b = bed, ac = kit.ac;
    bed = null;
    if (ac) { b.out.gain.setTargetAtTime(0, ac.currentTime, 0.1); try { b.s.stop(ac.currentTime + 0.6); } catch { /* stopped */ } }
    setTimeout(() => b.out.disconnect(), 800);
  }

  return {
    // A knuckle on glass: a dull thump, a short glassy ring, a buzz of water.
    knock(x) {
      const ac = live(); if (!ac) return;
      tone(ac, x, { f0: jit(150, 0.08), f1: 62, level: jit(0.55, 0.1), decay: 0.16 });
      burst(ac, x, { type: 'lowpass', f: jit(900, 0.15), q: 0.8, level: 0.45, decay: 0.035 });
      [jit(1180, 0.04), jit(2270, 0.05), jit(3410, 0.05)].forEach((f, i) => tone(ac, x, { f0: f, f1: f * 0.995, level: 0.05 / (i + 1), decay: jit(0.32, 0.2) / (1 + i * 0.6) }));
      burst(ac, x, { f: 420, q: 2, level: 0.06, decay: 0.35, at: 0.01 });
    },
    // Food: a pinch of flakes patters on the surface.
    patter(x) {
      const ac = live(); if (!ac) return;
      const n = 7 + ((Math.random() * 5) | 0);
      for (let i = 0; i < n; i++) burst(ac, x + (Math.random() - 0.5) * 0.15, { f: jit(4600, 0.25), q: 2.5, level: jit(0.1, 0.4), decay: 0.025, at: Math.random() * 0.28 });
    },
    // A nip: at the surface a tiny plip; below, a soft tick.
    nip(x, top) {
      const ac = live(); if (!ac) return;
      if (top) { tone(ac, x, { f0: jit(900, 0.15), f1: jit(1800, 0.1), level: 0.07, decay: 0.05 }); burst(ac, x, { f: 3800, q: 2, level: 0.04, decay: 0.015 }); }
      else burst(ac, x, { f: jit(2600, 0.2), q: 4, level: 0.03, decay: 0.012 });
    },
    // A dart: the swish of a startled fish.
    dart(x) {
      const ac = live(); if (!ac) return;
      burst(ac, x, { f: jit(700, 0.3), q: 1.5, level: jit(0.035, 0.3), decay: 0.09, at: Math.random() * 0.03 });
    },
    // A pearl reaches the surface: a small rising blip.
    pearl(x) {
      const ac = live(); if (!ac) return;
      tone(ac, x, { f0: jit(1700, 0.2), f1: jit(2900, 0.15), level: 0.022, decay: 0.045 });
    },
    // Keeps the bed at the lamp's level while the loop runs.
    update({ lamp }) {
      const ac = live();
      if (!ac) { if (bed && !sound.on) stopBed(); return; }
      startBed(ac);
      const t = ac.currentTime;
      bed.gLo.gain.setTargetAtTime(0.09, t, 0.4);
      bed.gHi.gain.setTargetAtTime(0.006 + 0.006 * lamp, t, 0.4);
    },
    rest() { stopBed(); kit.rest(() => !bed); },
    hide() { stopBed(); kit.ac?.suspend()?.catch(() => {}); },
  };
}
