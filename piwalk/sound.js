// Pi walk sound in Web Audio. Muted by default; the kit holds the context.
// Each digit is a note of the A major pentatonic, two octaves from A3.
// A note is a soft mallet on a glass bar, rendered once into a buffer.

const jit = (k = 0.1) => 1 + (Math.random() * 2 - 1) * k;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
// Semitones above A3 for the digits 0 to 9.
const SCALE = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21];
const A3 = 220;
export const freqOf = d => A3 * 2 ** (SCALE[d] / 12);
// Above this rate the notes thin to it.
const MAX_RATE = 14;

export function makeSound(kit) {
  let bus = null, pending = 0, gateAt = 0, bed = null, bedOn = false;
  const live = new Set();
  const bufs = [];

  // The bus: dry and a small room into a limiter, then the kit.
  function ensureBus(ac) {
    if (bus) return bus;
    // A high threshold keeps the limiter's make-up gain small.
    const lim = ac.createDynamicsCompressor();
    lim.threshold.value = -4; lim.knee.value = 0; lim.ratio.value = 20;
    lim.attack.value = 0.001; lim.release.value = 0.12;
    lim.connect(kit.out);
    const dry = ac.createGain();
    dry.gain.value = 0.8;
    dry.connect(lim);
    const room = ac.createConvolver();
    room.buffer = roomIR(ac);
    const wet = ac.createGain();
    wet.gain.value = 0.3;
    dry.connect(room).connect(wet).connect(lim);
    bus = { dry, lim };
    return bus;
  }

  // A soft stereo room: two and a half seconds of darkening noise.
  function roomIR(ac) {
    const sr = ac.sampleRate, n = Math.round(sr * 2.5);
    const b = ac.createBuffer(2, n, sr);
    for (let ch = 0; ch < 2; ch++) {
      const d = b.getChannelData(ch);
      let lp = 0;
      for (let i = 0; i < n; i++) {
        const t = i / sr;
        // The low-pass closes over time, so the tail is dark.
        const k = 0.5 * Math.exp(-t * 1.8) + 0.03;
        lp += k * ((Math.random() * 2 - 1) - lp);
        d[i] = lp * Math.exp(-t * 2.6) * Math.min(1, t / 0.015) * 0.9;
      }
    }
    return b;
  }

  // One digit's note: a round fundamental, a quiet octave, a short tick of wood.
  // A recursive sine needs no sin() per sample.
  function noteBuf(ac, d) {
    if (bufs[d]) return bufs[d];
    const sr = ac.sampleRate, f = freqOf(d);
    // Low notes ring longer than high ones.
    const k = clamp((330 / f) ** 0.45, 0.6, 1.4);
    const N = Math.round(sr * (1.3 * k + 0.15));
    const b = ac.createBuffer(1, N, sr);
    const out = b.getChannelData(0);
    const parts = [[1, 1, 0.62 * k], [2, 0.12, 0.3 * k], [3.93, 0.1, 0.05], [9.2, 0.025, 0.012]];
    for (const [m, amp, tau] of parts) {
      // A partial above 12 kHz adds only hiss.
      if (f * m > 12000) continue;
      const w = 2 * Math.PI * f * m * jit(0.002) / sr;
      const c2 = 2 * Math.cos(w);
      let s1 = Math.sin(-w), s2 = Math.sin(-2 * w);
      const dec = Math.exp(-1 / (tau * sr));
      let g = amp;
      for (let i = 0; i < N; i++) {
        const s0 = c2 * s1 - s2;
        s2 = s1; s1 = s0;
        out[i] += s0 * g;
        g *= dec;
      }
    }
    // A 5 ms raised-cosine attack: soft, with no click.
    const atk = Math.round(sr * 0.005);
    for (let i = 0; i < atk; i++) out[i] *= 0.5 - 0.5 * Math.cos(Math.PI * i / atk);
    const tail = Math.round(sr * 0.05);
    for (let i = 0; i < tail; i++) out[N - 1 - i] *= i / tail;
    let peak = 0;
    for (let i = 0; i < N; i++) peak = Math.max(peak, Math.abs(out[i]));
    for (let i = 0; i < N; i++) out[i] /= peak || 1;
    bufs[d] = b;
    return b;
  }

  // Starts one note at time t: digit d, level, pan, ring time.
  function voice(ac, t, d, level, pan, hold) {
    const b = ensureBus(ac);
    const src = ac.createBufferSource();
    src.buffer = noteBuf(ac, d);
    src.playbackRate.value = jit(0.002);
    const g = ac.createGain();
    g.gain.setValueAtTime(level, t);
    let stopAt = t + src.buffer.duration;
    if (hold < src.buffer.duration) {
      // A short note ends on an exponential fade, never a cut.
      const tau = clamp(hold * 0.4, 0.03, 0.4);
      g.gain.setTargetAtTime(0, t + hold, tau);
      stopAt = Math.min(stopAt, t + hold + tau * 7);
    }
    const p = ac.createStereoPanner();
    p.pan.value = clamp(pan, -1, 1) * 0.6;
    src.connect(g).connect(p).connect(b.dry);
    src.start(t);
    src.stop(stopAt);
    pending++;
    const v = { src, g };
    live.add(v);
    src.onended = () => { pending--; live.delete(v); p.disconnect(); };
  }

  /**
   * Plays one frame of steps.
   * Each event: { d: digit, at: seconds from now }. rate: steps a second.
   * pan: the head's place across the stage, -1 to 1.
   */
  function steps(events, rate, pan) {
    const ac = kit.live();
    if (!ac || !events.length) return;
    const t0 = ac.currentTime + 0.03;
    const slow = rate <= MAX_RATE;
    // Faster runs ring shorter and softer, so the notes never pile up.
    const hold = clamp(5 / Math.max(1, rate), 0.12, 1.6);
    const lvl = 0.17 * clamp(Math.sqrt(5 / Math.max(1, rate)), 0.5, 1);
    for (const e of events) {
      const t = t0 + e.at;
      if (!slow && t < gateAt) continue;
      gateAt = t + (1 / MAX_RATE) * jit(0.25);
      voice(ac, t, e.d, lvl * jit(0.12), pan + (Math.random() - 0.5) * 0.1, hold);
    }
  }

  // The air bed: filtered noise that rises with the pace.
  function air(rate, on) {
    const ac = kit.live();
    const want = on ? clamp(Math.log10(Math.max(1, rate / 20)) / 2.2, 0, 1) : 0;
    if (!ac || !kit.noise) { bedOn = false; return; }
    if (!bed && want > 0.01) {
      const b = ensureBus(ac);
      const src = ac.createBufferSource();
      src.buffer = kit.noise;
      src.loop = true;
      const bp = ac.createBiquadFilter();
      bp.type = 'bandpass'; bp.Q.value = 0.7;
      bp.frequency.value = 600;
      const lp = ac.createBiquadFilter();
      lp.type = 'lowpass'; lp.frequency.value = 2400;
      const g = ac.createGain();
      g.gain.value = 0;
      src.connect(bp).connect(lp).connect(g).connect(b.dry);
      src.start();
      bed = { src, bp, g };
    }
    if (!bed) return;
    const t = ac.currentTime;
    bed.g.gain.setTargetAtTime(want * 0.03, t, 0.4);
    bed.bp.frequency.setTargetAtTime(500 + 1600 * want, t, 0.6);
    bedOn = want > 0.01;
    // A silent bed stops, so the context can sleep.
    if (!bedOn && bed.g.gain.value < 0.002) { const s = bed.src; bed = null; try { s.stop(); } catch { /* stopped */ } }
  }

  // The last digit: a soft open chord, strummed upward.
  function chord(pan) {
    const ac = kit.live();
    if (!ac) return;
    const t = ac.currentTime + 0.04;
    [0, 3, 5, 7, 9].forEach((d, i) => voice(ac, t + i * 0.07 * jit(0.2), d, 0.26 * jit(0.08), pan * 0.5 + (i - 2) * 0.15, 3));
  }

  // One soft note for a press: pause, go on, start again.
  function tap(d, pan) {
    const ac = kit.live();
    if (!ac) return;
    voice(ac, ac.currentTime + 0.01, d, 0.14, pan, 0.5);
  }

  // Stops every sound at once.
  function quiet() {
    const ac = kit.ac;
    for (const v of live) { try { v.src.stop(); } catch { /* stopped */ } }
    live.clear();
    if (bed) { try { bed.src.stop(); } catch { /* stopped */ } bed = null; }
    bedOn = false;
    gateAt = ac ? ac.currentTime : 0;
  }

  return {
    steps, air, chord, tap, quiet,
    get busy() { return pending > 0 || bedOn; },
  };
}
