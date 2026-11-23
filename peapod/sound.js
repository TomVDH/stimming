// Pea pod: sound. Raw Web Audio on the shared kit, muted by default.
// Each sound has a visible cause: the squeeze, the snap, each pea hit, the roll.

const rand = (a, b) => a + Math.random() * (b - a);
// No hit repeats exactly: a small random factor on pitch, time and level.
const jit = x => 1 + (Math.random() * 2 - 1) * x;
const clampPan = p => Math.max(-1, Math.min(1, p));

export function podSound(kit) {
  let V = null;
  // Two beds: fibres that creak under the squeeze, and peas that roll.
  function voices() {
    const ac = kit.live();
    if (!ac || !kit.out || !kit.noise) return null;
    if (V) return V;
    const bed = (type, f, q) => {
      const src = ac.createBufferSource();
      src.buffer = kit.noise; src.loop = true;
      const bp = ac.createBiquadFilter();
      bp.type = type; bp.frequency.value = f; bp.Q.value = q;
      const g = ac.createGain();
      g.gain.value = 0;
      const pan = ac.createStereoPanner();
      src.connect(bp).connect(g).connect(pan).connect(kit.out);
      src.start();
      return { bp, g, pan };
    };
    // A fresh pod squeaks under the thumb: a thin tone through a narrow band.
    const sq = ac.createOscillator();
    sq.type = 'sawtooth'; sq.frequency.value = 700;
    const sqf = ac.createBiquadFilter();
    sqf.type = 'bandpass'; sqf.frequency.value = 1400; sqf.Q.value = 5;
    const sqg = ac.createGain();
    sqg.gain.value = 0;
    sq.connect(sqf).connect(sqg).connect(kit.out);
    sq.start();
    V = { ac, roll: bed('lowpass', 420, 0.7), strain: bed('bandpass', 900, 3.5), squeak: { o: sq, f: sqf, g: sqg }, grainT: 0, hits: 0, hitT: 0 };
    return V;
  }

  function osc(t, { type = 'sine', f0, f1 = f0, glide = 0.05, gain, att = 0.002, dur, pan = 0 }) {
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
  function noise(t, { f0, f1 = f0, q = 1, type = 'bandpass', gain, att = 0.002, dur, pan = 0 }) {
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
    s.start(t, Math.random() * 0.8, dur + 0.05);
  }
  // Many peas can land in one frame; a cap keeps the mix clean.
  function room(v) {
    const now = v.ac.currentTime;
    if (now - v.hitT > 0.05) { v.hitT = now; v.hits = 0; }
    return ++v.hits <= 6;
  }
  // One fibre crack: a short, bright, resonant tick.
  function grain(t, p, pan) {
    noise(t, { f0: rand(1500, 3200) * (1 + p * 0.6), q: rand(6, 14), gain: (0.12 + 0.26 * p) * jit(0.4), dur: rand(0.012, 0.035), pan });
  }

  return {
    // The thumb meets the pod: a soft, wet squish.
    press(pan, p) {
      if (!voices()) return;
      const t = kit.ac.currentTime + 0.003;
      noise(t, { type: 'lowpass', f0: 900 * jit(0.15), f1: 300, q: 0.8, gain: 0.16 * jit(0.2), dur: 0.09, pan });
      osc(t, { f0: 210 * jit(0.1), f1: 150, glide: 0.06, gain: 0.08 * jit(0.2), dur: 0.08, pan });
      if (p > 0.3) grain(t + rand(0.01, 0.04), p, pan);
    },
    // The seam gives: a crack, a zip along the pod, a knock, a wet tear.
    snap(pan, sp) {
      if (!voices()) return;
      const t = kit.ac.currentTime + 0.002;
      noise(t, { type: 'highpass', f0: 2600 * jit(0.1), q: 0.7, gain: 0.55 * jit(0.1), att: 0.0008, dur: 0.035, pan });
      osc(t, { type: 'triangle', f0: 3400 * jit(0.08), f1: 1300, glide: 0.012, gain: 0.22 * jit(0.15), att: 0.0006, dur: 0.03, pan });
      osc(t, { f0: 190 * jit(0.08), f1: 85, glide: 0.08, gain: 0.32 * jit(0.12), att: 0.001, dur: 0.12, pan });
      noise(t + 0.01, { f0: 1100 * jit(0.1), f1: 420, q: 1.6, gain: 0.16 * (0.6 + sp * 0.6), dur: 0.16, pan });
      // The crack runs both ways: ticks spread out from the dent.
      const n = 7 + Math.round(5 * sp);
      for (let i = 1; i <= n; i++) {
        const d = i * rand(0.006, 0.011);
        grain(t + d, 0.9, pan + (i % 2 ? -1 : 1) * i * 0.04);
      }
    },
    // An open valve lands on its back: a soft papery thud.
    valve(pan, v) {
      if (!voices()) return;
      const t = kit.ac.currentTime + 0.002;
      const k = Math.min(1, v / 10);
      noise(t, { type: 'lowpass', f0: 600 * jit(0.15), q: 0.6, gain: 0.14 * k * jit(0.2), dur: 0.07, pan });
      noise(t, { f0: 2400 * jit(0.2), q: 2, gain: 0.03 * k, dur: 0.03, pan });
    },
    // A pea tears free of its stalk: a tiny dry tick.
    launch(pan, v) {
      if (!voices() || !room(V)) return;
      const t = kit.ac.currentTime + rand(0, 0.006);
      osc(t, { type: 'triangle', f0: 2200 * jit(0.15), f1: 1500, glide: 0.01, gain: 0.04 * Math.min(1, v / 100), att: 0.0006, dur: 0.02, pan });
    },
    // A pea hits the table: a small wooden tock, higher for a smaller pea.
    bounce(pan, v, r) {
      if (!voices() || !room(V)) return;
      const t = kit.ac.currentTime + rand(0, 0.004);
      const k = Math.min(1, v / 170) ** 1.2;
      const f = 1050 * (0.4 / r) ** 0.7 * jit(0.07);
      osc(t, { f0: f, f1: f * 0.92, glide: 0.03, gain: 0.3 * k * jit(0.2), att: 0.0008, dur: 0.05, pan });
      osc(t, { f0: f * 2.63, gain: 0.08 * k * jit(0.3), att: 0.0006, dur: 0.025, pan });
      noise(t, { type: 'lowpass', f0: 1400, q: 0.6, gain: 0.12 * k * jit(0.2), dur: 0.03, pan });
    },
    // Two peas meet: a glassy click.
    click(pan, v) {
      if (!voices() || !room(V)) return;
      const t = kit.ac.currentTime + rand(0, 0.004);
      const k = Math.min(1, v / 120);
      osc(t, { f0: rand(2900, 3900), gain: 0.1 * k * jit(0.25), att: 0.0005, dur: 0.022, pan });
      noise(t, { type: 'highpass', f0: 4200, q: 0.7, gain: 0.06 * k, dur: 0.012, pan });
    },
    // The view moves along the table: a low, soft breath.
    pan(cut) {
      if (!voices() || cut) return;
      const t = kit.ac.currentTime + 0.01;
      noise(t, { f0: 260, f1: 520, q: 0.9, gain: 0.045, att: 0.6, dur: 1.5, pan: 0.2 });
    },
    // The new pod lands on the table: a dull tap.
    land(pan, v) {
      if (!voices()) return;
      const t = kit.ac.currentTime + 0.002;
      const k = Math.min(1, v / 60);
      osc(t, { f0: 150 * jit(0.1), f1: 95, glide: 0.06, gain: 0.2 * k, dur: 0.1, pan });
      noise(t, { type: 'lowpass', f0: 800, q: 0.6, gain: 0.12 * k, dur: 0.05, pan });
    },
    // Each frame: fibre strain under the squeeze, and the roll of the peas.
    tick(dt, world, panOf) {
      if (!voices()) return;
      const ac = V.ac, t = ac.currentTime;
      const pod = world.pod;
      const strain = pod.held && !pod.split ? Math.min(1, pod.press) : 0;
      V.strain.g.gain.setTargetAtTime(0.16 * strain * strain, t, 0.04);
      // The squeak wavers in pitch and rises with the pressure.
      V.squeak.g.gain.setTargetAtTime(0.05 * strain ** 1.5, t, 0.03);
      V.squeak.o.frequency.setTargetAtTime((520 + 520 * strain) * jit(0.06), t, 0.02);
      V.squeak.f.frequency.setTargetAtTime(1200 + 1600 * strain, t, 0.05);
      V.strain.bp.frequency.setTargetAtTime(700 + 1400 * strain, t, 0.05);
      V.strain.pan.pan.setTargetAtTime(clampPan(panOf(world.pod.x0)), t, 0.1);
      // Creak grains come faster as the pressure nears the snap.
      if (strain > 0.15) {
        V.grainT -= dt;
        if (V.grainT <= 0) {
          V.grainT = rand(0.02, 0.09) / (0.3 + strain * strain * 2.5);
          grain(t + rand(0, 0.01), strain, panOf(world.pod.x0) + rand(-0.1, 0.1));
        }
      }
      let sum = 0, sx = 0;
      for (const p of world.peas) {
        if (p.asleep || p.y > p.r + 0.05) continue;
        const v = Math.hypot(p.vx, p.vz);
        sum += v; sx += v * p.x;
      }
      const g = Math.min(0.09, sum * 0.0012);
      V.roll.g.gain.setTargetAtTime(g, t, 0.05);
      V.roll.bp.frequency.setTargetAtTime(260 + Math.min(500, sum * 3), t, 0.08);
      if (sum > 0) V.roll.pan.pan.setTargetAtTime(clampPan(panOf(sx / sum)), t, 0.08);
    },
    // Beds fall silent when the loop stops or the tab hides.
    hush() {
      if (!V) return;
      const t = V.ac.currentTime;
      V.roll.g.gain.setTargetAtTime(0, t, 0.03);
      V.strain.g.gain.setTargetAtTime(0, t, 0.03);
      V.squeak.g.gain.setTargetAtTime(0, t, 0.02);
    },
  };
}
