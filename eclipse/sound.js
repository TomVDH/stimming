// Desert eclipse sound in Web Audio. Muted by default; the kit holds the context.
// Desert wind follows the heat of the pan; it drops as the light goes.
// The air hushes: its top falls away. The diamond ring rings like glass.
// At totality a low chord swells, and crickets start, faint.

const jit = (k = 0.1) => 1 + (Math.random() * 2 - 1) * k;
// The swell: D with its fifth, ninth and octave.
const CHORD = [73.42, 110, 146.83, 164.81, 220];
// A bell: inharmonic partials over a high G.
const BELL = [1, 2.76, 5.4, 8.93];

export function makeSound(kit) {
  let bed = null, pending = 0, gustP = Math.random() * 100, cricketT = 0;

  function voice(ac, pan = 0) {
    const g = ac.createGain();
    g.gain.value = 0;
    const p = ac.createStereoPanner();
    p.pan.value = Math.max(-1, Math.min(1, pan));
    g.connect(p).connect(kit.out);
    return g;
  }
  const noiseSrc = ac => {
    const s = ac.createBufferSource();
    s.buffer = kit.noise;
    s.loop = true;
    s.start(0, Math.random() * 0.9);
    return s;
  };

  // The bed: wind, sand hiss and the totality chord. It starts on the first live frame.
  function startBed(ac) {
    const hush = ac.createBiquadFilter();
    hush.type = 'lowpass';
    hush.frequency.value = 5000;
    hush.Q.value = 0.5;
    const windG = voice(ac, -0.1);
    hush.connect(windG);
    const wind = noiseSrc(ac);
    const bp = ac.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 480;
    bp.Q.value = 0.8;
    wind.connect(bp).connect(hush);
    // Sand: a high hiss of grains on the crust.
    const sand = noiseSrc(ac);
    const hp = ac.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 3200;
    const sandG = voice(ac, 0.25);
    sand.connect(hp).connect(sandG);
    // The chord, behind a lowpass that opens with totality.
    const lp = ac.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 200;
    lp.Q.value = 0.6;
    const padG = voice(ac, 0);
    lp.connect(padG);
    const oscs = CHORD.map((f, i) => {
      const o = ac.createOscillator();
      o.type = i === 0 ? 'sawtooth' : 'triangle';
      o.frequency.value = f;
      o.detune.value = (Math.random() * 2 - 1) * 6;
      const g = ac.createGain();
      g.gain.value = [0.4, 0.34, 0.26, 0.16, 0.12][i];
      o.connect(g).connect(lp);
      o.start();
      return o;
    });
    // A slow wobble of the detune keeps the chord alive.
    const lfo = ac.createOscillator();
    lfo.frequency.value = 0.09;
    const lg = ac.createGain();
    lg.gain.value = 5;
    lfo.connect(lg);
    oscs.forEach(o => lg.connect(o.detune));
    lfo.start();
    const sub = ac.createOscillator();
    sub.frequency.value = 36.71;
    const subG = voice(ac, 0);
    sub.connect(subG);
    sub.start();
    bed = { hush, windG, wind, bp, sand, sandG, lp, padG, oscs, lfo, sub, subG };
  }

  // Each frame: wind and hiss follow the heat; the chord follows totality.
  function frame({ F, heat, tot, dt }) {
    const ac = kit.live();
    if (!ac || !kit.noise) return;
    if (!bed) startBed(ac);
    const t = ac.currentTime;
    // Gusts: a slow wander, never the same twice.
    gustP += dt * 0.35;
    const gust = 0.6 + 0.4 * Math.sin(gustP) * Math.sin(gustP * 0.37 + 1.3);
    const w = Math.max(0, heat) ** 0.6;
    bed.windG.gain.setTargetAtTime(0.004 + 0.07 * w * gust, t, 0.5);
    bed.bp.frequency.setTargetAtTime(300 + 360 * w * gust, t, 0.6);
    bed.hush.frequency.setTargetAtTime(500 + 4800 * Math.max(F, heat) ** 0.5, t, 0.7);
    bed.sandG.gain.setTargetAtTime(0.012 * w * gust * gust, t, 0.4);
    bed.padG.gain.setTargetAtTime(0.055 * tot, t, 1.1);
    bed.lp.frequency.setTargetAtTime(180 + 1100 * tot, t, 2.2);
    bed.subG.gain.setTargetAtTime(0.09 * tot, t, 1.5);
    // Crickets wake once the dark holds.
    cricketT -= dt;
    if (tot > 0.6 && cricketT <= 0) {
      chirp(ac, tot);
      cricketT = (0.35 + Math.random() * 0.9) / tot;
    }
  }

  // One cricket chirp: three or four pulses of a high tone.
  function chirp(ac, k) {
    const f = 4300 * jit(0.06), pan = Math.random() * 1.6 - 0.8, n = 3 + (Math.random() < 0.4 ? 1 : 0);
    const o = ac.createOscillator();
    o.type = 'sine';
    o.frequency.value = f;
    const g = voice(ac, pan);
    let t = ac.currentTime + 0.02;
    const lv = 0.008 * k * jit(0.4);
    for (let i = 0; i < n; i++) {
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(lv, t + 0.004);
      g.gain.linearRampToValueAtTime(0, t + 0.016);
      t += 0.026 * jit(0.1);
    }
    o.connect(g);
    o.start(ac.currentTime);
    o.stop(t + 0.05);
    pending++;
    o.onended = () => { pending--; };
  }

  // The diamond ring: a glass bell where the last bead flares.
  function ring(x) {
    const ac = kit.live();
    if (!ac || !kit.noise) return;
    const t = ac.currentTime + 0.01, base = 1568 * jit(0.02);
    BELL.forEach((m, i) => {
      const o = ac.createOscillator();
      o.type = 'sine';
      o.frequency.value = base * m * jit(0.003);
      const g = voice(ac, x * 0.7);
      const len = (3.6 - i * 0.7) * jit(0.15);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime([0.07, 0.035, 0.02, 0.01][i] * jit(0.2), t + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0002, t + len);
      o.connect(g);
      o.start(t); o.stop(t + len + 0.05);
      pending++;
      o.onended = () => { pending--; };
    });
    // A breath of shimmer under the strike.
    const src = ac.createBufferSource();
    src.buffer = kit.noise;
    const bp = ac.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 7000 * jit(0.2);
    bp.Q.value = 2;
    const g = voice(ac, x * 0.7);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.02, t + 0.05);
    g.gain.exponentialRampToValueAtTime(0.0003, t + 1.6);
    src.connect(bp).connect(g);
    src.start(t, Math.random() * 0.3, 1.7);
  }

  // The bed fades and its nodes stop; the kit then sleeps.
  function quiet() {
    const ac = kit.ac;
    if (!bed || !ac) return;
    const b = bed, t = ac.currentTime;
    bed = null;
    [b.windG, b.sandG, b.padG, b.subG].forEach(g => g.gain.setTargetAtTime(0, t, 0.15));
    [...b.oscs, b.lfo, b.sub, b.wind, b.sand].forEach(n => { try { n.stop(t + 0.8); } catch { /* stopped already */ } });
  }

  return { frame, ring, quiet, get busy() { return pending > 0; } };
}
