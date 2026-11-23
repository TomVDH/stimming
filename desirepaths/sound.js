// Desire paths sound in Web Audio. Muted by default; the kit holds the context.
// Each print makes a step: a swish on turf, dry grit on bare earth, a scuff on the flags.
// A soft breeze bed sits under them while the lawn drifts.
// No two steps are alike.

const jit = (k = 0.1) => 1 + (Math.random() * 2 - 1) * k;

export function makeSound(kit) {
  let bed = null, budget = 0, lastT = 0;
  const live = new Set();

  function voice(ac, pan = 0) {
    const g = ac.createGain();
    g.gain.value = 0;
    const p = ac.createStereoPanner();
    p.pan.value = Math.max(-1, Math.min(1, pan));
    g.connect(p).connect(kit.out);
    return g;
  }
  // One shot of filtered noise with an attack and a fall.
  function burst(ac, t, { f, q = 1, type = 'bandpass', level, a = 0.004, len, pan = 0, sweep = 1 }) {
    const s = ac.createBufferSource();
    s.buffer = kit.noise;
    const fl = ac.createBiquadFilter();
    fl.type = type;
    fl.frequency.setValueAtTime(f, t);
    if (sweep !== 1) fl.frequency.exponentialRampToValueAtTime(f * sweep, t + len);
    fl.Q.value = q;
    const g = voice(ac, pan);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(level, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + len);
    s.connect(fl).connect(g);
    s.start(t, Math.random() * 0.9);
    s.stop(t + a + len + 0.03);
    live.add(s);
    s.onended = () => live.delete(s);
  }

  // One step. Turf swishes; yellow turf is drier; bare earth crunches; flags scuff.
  function step({ paved = false, wear = 0, pan = 0, crowd = false, stand = false }) {
    const ac = kit.live();
    if (!ac || !kit.noise) return;
    const t = Math.max(ac.currentTime, lastT) + Math.random() * 0.012;
    // A crowd makes many steps: thin them, so the mix stays clean.
    budget = Math.min(budget, 14);
    if (budget > 12) return;
    budget += 1;
    lastT = t;
    const lv = (crowd ? 0.6 : 1) * (stand ? 1.15 : 1) * jit(0.2);
    if (paved) {
      // A soft heel tap, then the sole's scuff.
      burst(ac, t, { f: 700 * jit(0.2), q: 1.4, level: 0.18 * lv, a: 0.002, len: 0.035 });
      burst(ac, t + 0.03, { f: 2600 * jit(0.2), q: 0.8, level: 0.05 * lv, a: 0.01, len: 0.06, sweep: 0.7 });
      return;
    }
    const bare = Math.min(1, Math.max(0, (wear - 0.5) / 0.5));
    const dry = Math.min(1, Math.max(0, (wear - 0.2) / 0.35));
    // The swish: blades brushing the shoe, brighter as they dry.
    const sw = 1 - bare * 0.85;
    if (sw > 0.05) burst(ac, t, { f: (1900 + 1800 * dry) * jit(0.15), q: 0.7, level: 0.13 * sw * lv, a: 0.02, len: 0.11 * jit(0.2), sweep: 1.4 });
    // A dull thud of the heel on soft ground.
    burst(ac, t, { f: 180 * jit(0.15), q: 0.9, type: 'lowpass', level: (0.22 + 0.15 * bare) * lv, a: 0.003, len: 0.05 });
    // Grit: a few dry grains on packed earth, never the same pattern.
    const n = Math.round(bare * (3 + Math.random() * 4));
    for (let i = 0; i < n; i++) {
      burst(ac, t + 0.01 + Math.random() * 0.07, { f: 2400 + Math.random() * 3800, q: 2 + Math.random() * 3, level: (0.05 + 0.07 * Math.random()) * lv, a: 0.001, len: 0.006 + Math.random() * 0.012 });
    }
  }

  // Each frame: the step budget refills; the breeze follows the drift.
  function frame({ dt, amb = 0 }) {
    budget = Math.max(0, budget - dt * 24);
    const ac = kit.live();
    if (!ac || !kit.noise) return;
    if (!bed && amb > 0) {
      const s = ac.createBufferSource();
      s.buffer = kit.noise;
      s.loop = true;
      const fl = ac.createBiquadFilter();
      fl.type = 'bandpass';
      fl.frequency.value = 900;
      fl.Q.value = 0.5;
      const g = voice(ac, 0);
      s.connect(fl).connect(g);
      s.start(0, Math.random() * 0.9);
      bed = { s, fl, g };
    }
    if (bed) {
      const t = ac.currentTime;
      bed.g.gain.setTargetAtTime(0.05 * amb * (0.75 + 0.5 * Math.random()), t, 0.4);
      bed.fl.frequency.setTargetAtTime(700 + 600 * Math.random(), t, 0.8);
    }
  }

  // A fresh lawn: a long soft swell, as of new turf rolled out.
  function mow() {
    const ac = kit.live();
    if (!ac || !kit.noise) return;
    const t = ac.currentTime;
    const s = ac.createBufferSource();
    s.buffer = kit.noise;
    s.loop = true;
    const fl = ac.createBiquadFilter();
    fl.type = 'bandpass';
    fl.Q.value = 0.9;
    fl.frequency.setValueAtTime(400 * jit(0.1), t);
    fl.frequency.exponentialRampToValueAtTime(3200 * jit(0.1), t + 1.6);
    const g = voice(ac, -0.6);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.16 * jit(0.1), t + 0.5);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 2.2);
    s.connect(fl).connect(g);
    s.start(t, Math.random() * 0.9);
    s.stop(t + 2.3);
    live.add(s);
    s.onended = () => live.delete(s);
  }

  // Fades the bed and stops its nodes. cut: also stop steps in flight.
  function quiet(cut = false) {
    const ac = kit.ac;
    if (!ac) return;
    const t = ac.currentTime;
    if (bed) {
      const b = bed;
      bed = null;
      b.g.gain.setTargetAtTime(0, t, 0.15);
      try { b.s.stop(t + 0.8); } catch { /* stopped already */ }
    }
    if (cut) {
      for (const n of live) { try { n.stop(); } catch { /* not started */ } }
      live.clear();
    }
  }

  return { step, frame, mow, quiet, get busy() { return live.size > 0; } };
}
