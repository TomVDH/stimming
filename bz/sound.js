// BZ reaction sound in Web Audio. Muted by default; the kit holds the context.
// A seed lands with a drop's plip; each new ring rings a soft glass note.
// A drag swishes; a low hum swells with the length of live fronts.

// D minor pentatonic over two octaves, in semitones from D4.
const SCALE = [0, 3, 5, 7, 10, 12, 15, 17, 19, 22];
const D4 = 293.66;
const jit = (k = 0.1) => 1 + (Math.random() * 2 - 1) * k;

export function makeSound(kit) {
  let hum = null, swish = null;

  // A short voice: an envelope and a pan, wired to the kit's output.
  function voice(ac, pan) {
    const g = ac.createGain();
    g.gain.value = 0;
    const p = ac.createStereoPanner();
    p.pan.value = Math.max(-1, Math.min(1, pan));
    g.connect(p).connect(kit.out);
    return g;
  }

  // A drop lands: a sine that chirps up, then a faint glass tick.
  function seed(_p, x) {
    const ac = kit.live();
    if (!ac) return;
    const t = ac.currentTime + 0.005;
    const g = voice(ac, x * 0.6);
    const o = ac.createOscillator();
    const f = 620 * jit(0.14);
    o.frequency.setValueAtTime(f, t);
    o.frequency.exponentialRampToValueAtTime(f * 2.3, t + 0.04);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.22 * jit(0.2), t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0008, t + 0.11);
    o.connect(g);
    o.start(t); o.stop(t + 0.13);
    const tick = ac.createOscillator();
    tick.type = 'triangle';
    tick.frequency.value = 3300 * jit(0.08);
    const tg = voice(ac, x * 0.6);
    tg.gain.setValueAtTime(0, t + 0.012);
    tg.gain.linearRampToValueAtTime(0.035, t + 0.014);
    tg.gain.exponentialRampToValueAtTime(0.0005, t + 0.06);
    tick.connect(tg);
    tick.start(t + 0.01); tick.stop(t + 0.08);
  }

  // A ring leaves its seed: one quiet glass note per seed.
  function ring(p) {
    const ac = kit.live();
    if (!ac) return;
    const t = ac.currentTime + 0.01 + Math.random() * 0.02;
    const f = D4 * 2 ** (SCALE[p.note % SCALE.length] / 12) * jit(0.004);
    const level = 0.045 * jit(0.25);
    const out = voice(ac, p.x * 0.65);
    const lp = ac.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 2600;
    lp.connect(out);
    out.gain.setValueAtTime(1, t);
    // A struck glass: the fundamental and two inharmonic partials.
    [[1, 1, 1.6], [2.76, 0.22, 0.5], [5.4, 0.07, 0.22]].forEach(([m, a, d]) => {
      const o = ac.createOscillator();
      o.frequency.value = f * m;
      const g = ac.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(level * a, t + 0.006);
      g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(g).connect(lp);
      o.start(t); o.stop(t + d + 0.05);
    });
  }

  // A drag stirs the liquid: band-passed noise that follows the speed.
  function stir(len, x) {
    const ac = kit.live();
    if (!ac || !kit.noise) return;
    const t = ac.currentTime;
    if (!swish && len > 0) {
      const src = ac.createBufferSource();
      src.buffer = kit.noise;
      src.loop = true;
      const bp = ac.createBiquadFilter();
      bp.type = 'bandpass';
      bp.Q.value = 0.9;
      bp.frequency.value = 900;
      const g = voice(ac, x * 0.6);
      src.connect(bp).connect(g);
      src.start();
      swish = { src, bp, g };
    }
    if (!swish) return;
    const v = Math.min(1, len / 30);
    swish.g.gain.setTargetAtTime(0.12 * v, t, len > 0 ? 0.03 : 0.12);
    swish.bp.frequency.setTargetAtTime(600 + 1400 * v * jit(0.1), t, 0.05);
    if (len <= 0) {
      const s = swish;
      swish = null;
      s.src.stop(t + 0.6);
    }
  }

  // Clear and Shuffle: a slow swirl of the dish.
  function swirl() {
    const ac = kit.live();
    if (!ac || !kit.noise) return;
    const t = ac.currentTime + 0.005;
    const src = ac.createBufferSource();
    src.buffer = kit.noise;
    src.loop = true;
    const bp = ac.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 1.4;
    bp.frequency.setValueAtTime(380, t);
    bp.frequency.exponentialRampToValueAtTime(1300 * jit(0.1), t + 0.45);
    bp.frequency.exponentialRampToValueAtTime(420, t + 1.1);
    const g = voice(ac, 0);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.16, t + 0.25);
    g.gain.exponentialRampToValueAtTime(0.0005, t + 1.2);
    src.connect(bp).connect(g);
    src.start(t); src.stop(t + 1.25);
  }

  // The hum: two low sines and a slow beat, as loud as the fronts are long.
  function update(fronts, ease) {
    const ac = kit.live();
    const want = Math.min(0.06, fronts * 0.9) * ease;
    if (!ac) return;
    if (!hum && want > 0.002) {
      const g = ac.createGain();
      g.gain.value = 0;
      const lp = ac.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 340;
      lp.connect(g).connect(kit.out);
      const oscs = [73.42, 110.0 * 1.003, 146.83 * 0.998].map((f, i) => {
        const o = ac.createOscillator();
        o.type = i ? 'sine' : 'triangle';
        o.frequency.value = f;
        const og = ac.createGain();
        og.gain.value = [0.8, 0.45, 0.3][i];
        o.connect(og).connect(lp);
        o.start();
        return o;
      });
      hum = { g, lp, oscs };
    }
    if (hum) {
      hum.g.gain.setTargetAtTime(want, ac.currentTime, 0.6);
      hum.lp.frequency.setTargetAtTime(220 + 900 * Math.min(1, fronts * 8), ac.currentTime, 0.8);
    }
  }

  // The loop sleeps: the hum and any swish fade and stop.
  function quiet() {
    const ac = kit.ac;
    if (!ac) return;
    const t = ac.currentTime;
    if (hum) {
      const h = hum;
      hum = null;
      h.g.gain.setTargetAtTime(0, t, 0.15);
      h.oscs.forEach(o => o.stop(t + 0.8));
    }
    if (swish) { swish.g.gain.setTargetAtTime(0, t, 0.05); swish.src.stop(t + 0.3); swish = null; }
  }

  return { seed, ring, stir, swirl, update, quiet, get busy() { return !!hum || !!swish; } };
}
