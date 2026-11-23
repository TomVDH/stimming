// Sorting sounds in Web Audio. Muted by default; the kit holds the context.
// Each bar is a note of the A major pentatonic, from A2 to A6.
// A note is a struck glass bar, rendered once into a buffer.

const jit = (k = 0.1) => 1 + (Math.random() * 2 - 1) * k;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
// Semitones of the major pentatonic within one octave.
const PENTA = [0, 2, 4, 7, 9];
export const NOTES = 21;
const A2 = 110;
const freqOf = n => A2 * 2 ** ((Math.floor(n / 5) * 12 + PENTA[n % 5]) / 12);
// A bar's note: its height on the scale, value 0 to count - 1.
export const noteOf = (v, count) => Math.round((v / Math.max(1, count - 1)) * (NOTES - 1));
// At most this many tones start in one frame.
const PER_FRAME = 4;

export function makeSound(kit) {
  let bus = null, pending = 0;
  const live = new Set();
  const bufs = new Map();

  // The bus: dry and a small room into a limiter, then the kit.
  function ensureBus(ac) {
    if (bus) return bus;
    // A safety limiter: high threshold, so its make-up gain stays small.
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
    wet.gain.value = 0.22;
    dry.connect(room).connect(wet).connect(lim);
    bus = { dry, lim };
    return bus;
  }

  // A short stereo room: two seconds of noise that darkens as it decays.
  function roomIR(ac) {
    const sr = ac.sampleRate, n = Math.round(sr * 2.0);
    const b = ac.createBuffer(2, n, sr);
    for (let ch = 0; ch < 2; ch++) {
      const d = b.getChannelData(ch);
      let lp = 0;
      for (let i = 0; i < n; i++) {
        const t = i / sr;
        // The low-pass closes over time, so the tail is dark.
        const k = 0.65 * Math.exp(-t * 1.6) + 0.04;
        lp += k * ((Math.random() * 2 - 1) - lp);
        const fadeIn = Math.min(1, t / 0.012);
        d[i] = lp * Math.exp(-t * 3.1) * fadeIn * 0.9;
      }
    }
    return b;
  }

  // One note as a struck glass bar; bright adds the strike and upper partials.
  // A recursive sine needs no sin() per sample.
  function noteBuf(ac, n, bright) {
    const key = n * 2 + (bright ? 1 : 0);
    if (bufs.has(key)) return bufs.get(key);
    const sr = ac.sampleRate, f = freqOf(n);
    // Low notes ring longer than high ones.
    const k = clamp((220 / f) ** 0.4, 0.45, 1.5);
    const len = 1.6 * k + 0.2;
    const N = Math.round(sr * len);
    const b = ac.createBuffer(1, N, sr);
    const d = b.getChannelData(0);
    const parts = bright
      ? [[1, 1, 0.85 * k], [2, 0.3, 0.32 * k], [2.76, 0.16, 0.16 * k], [5.4, 0.07, 0.035], [8.9, 0.035, 0.012]]
      : [[1, 1, 0.55 * k], [2, 0.1, 0.18 * k], [2.76, 0.04, 0.08 * k]];
    for (const [m, amp, tau] of parts) {
      const w = 2 * Math.PI * f * m * jit(0.002) / sr;
      // A partial above 14 kHz adds only hiss.
      if (f * m > 14000) continue;
      const c2 = 2 * Math.cos(w);
      let s1 = Math.sin(-w), s2 = Math.sin(-2 * w);
      const dec = Math.exp(-1 / (tau * sr));
      let g = amp;
      for (let i = 0; i < N; i++) {
        const s0 = c2 * s1 - s2;
        s2 = s1; s1 = s0;
        d[i] += s0 * g;
        g *= dec;
      }
    }
    // A 3 ms raised-cosine attack: no click at the start.
    const atk = Math.round(sr * 0.003);
    for (let i = 0; i < atk; i++) d[i] *= 0.5 - 0.5 * Math.cos(Math.PI * i / atk);
    // The tail fades to zero over its last 50 ms.
    const tail = Math.round(sr * 0.05);
    for (let i = 0; i < tail; i++) d[N - 1 - i] *= i / tail;
    let peak = 0;
    for (let i = 0; i < N; i++) peak = Math.max(peak, Math.abs(d[i]));
    const s = 1 / (peak || 1);
    for (let i = 0; i < N; i++) d[i] *= s;
    bufs.set(key, b);
    return b;
  }

  // Starts one tone at time t: note n, level, pan, ring time.
  function voice(ac, t, n, bright, level, pan, hold) {
    const b = ensureBus(ac);
    const src = ac.createBufferSource();
    src.buffer = noteBuf(ac, clamp(n, 0, NOTES - 1), bright);
    src.playbackRate.value = jit(0.0025);
    const g = ac.createGain();
    g.gain.setValueAtTime(level, t);
    const end = src.buffer.duration;
    let stopAt = t + end;
    if (hold < end) {
      // A short tone ends on an exponential fade, never a cut.
      const tau = clamp(hold * 0.45, 0.025, 0.4);
      g.gain.setTargetAtTime(0, t + hold, tau);
      stopAt = Math.min(stopAt, t + hold + tau * 7);
    }
    const p = ac.createStereoPanner();
    p.pan.value = clamp(pan, -1, 1) * 0.7;
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
   * Each event: { n: note, x: pan -1 to 1, bright, at: seconds from now }.
   * rate is the sort's steps per second.
   */
  function steps(events, rate) {
    const ac = kit.live();
    if (!ac || !events.length) return;
    // Bright tones first, then soft ones, until the frame's budget ends.
    let list = events;
    if (events.length > PER_FRAME) list = events.filter(e => e.bright).concat(events.filter(e => !e.bright)).slice(0, PER_FRAME);
    const slow = rate <= 12;
    const hold = clamp(3 / rate, 0.06, 1.4);
    const lvl = 0.34 * (slow ? 1 : Math.sqrt(12 / rate));
    const t0 = ac.currentTime + 0.02;
    for (const e of list) voice(ac, t0 + e.at, e.n, e.bright, lvl * (e.bright ? 1 : 0.42) * jit(0.12), e.x, e.ring || hold);
  }

  // One rod rung by hand or by the sweep.
  function ring(n, x, level = 0.55, hold = 1.4) {
    const ac = kit.live();
    if (!ac) return;
    voice(ac, ac.currentTime + 0.01, n, true, level * jit(0.1), x, hold);
  }

  // A strum: rods crossed in one move ring in order over span seconds.
  function strum(list, span) {
    const ac = kit.live();
    if (!ac || !list.length) return;
    const n = Math.min(8, list.length);
    const lvl = 0.5 / Math.sqrt(Math.max(1, list.length / 3));
    const t = ac.currentTime + 0.01;
    for (let i = 0; i < n; i++) {
      const e = list[Math.floor((i * list.length) / n)];
      voice(ac, t + (i / n) * span, e.n, true, lvl * jit(0.1), e.x, 1.3);
    }
  }

  // The shuffle: a soft riffle of notes over a swish of air.
  function riffle() {
    const ac = kit.live();
    if (!ac) return;
    const t = ac.currentTime + 0.01;
    for (let i = 0; i < 14; i++) {
      voice(ac, t + i * 0.034 * jit(0.3), Math.floor(Math.random() * NOTES), false, 0.16 * jit(0.3), Math.random() * 2 - 1, 0.22);
    }
    if (!kit.noise) return;
    const b = ensureBus(ac);
    const src = ac.createBufferSource();
    src.buffer = kit.noise;
    const bp = ac.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 1.1;
    bp.frequency.setValueAtTime(700, t);
    bp.frequency.exponentialRampToValueAtTime(3400 * jit(0.1), t + 0.5);
    const g = ac.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.05, t + 0.12);
    g.gain.setTargetAtTime(0, t + 0.3, 0.12);
    src.connect(bp).connect(g).connect(b.dry);
    src.start(t, Math.random() * 0.2);
    src.stop(t + 1.1);
    pending++;
    const v = { src, g };
    live.add(v);
    src.onended = () => { pending--; live.delete(v); g.disconnect(); };
  }

  // The row is sorted: a soft A major chord swells under the last note.
  function chord() {
    const ac = kit.live();
    if (!ac) return;
    const t = ac.currentTime + 0.02;
    // A3, E4, A4, C#5: notes 5, 8, 10, 12 of the scale.
    [5, 8, 10, 12].forEach((n, i) => voice(ac, t + i * 0.045 * jit(0.2), n, i > 1, 0.2 * jit(0.1), (i - 1.5) * 0.3, 2.2));
  }

  // Stops every tone at once, for a hidden tab or a reset.
  function quiet() {
    const ac = kit.ac;
    if (!ac) return;
    const t = ac.currentTime;
    for (const v of live) {
      v.g.gain.cancelScheduledValues(t);
      v.g.gain.setTargetAtTime(0, t, 0.015);
      try { v.src.stop(t + 0.1); } catch { /* already stopped */ }
    }
  }

  return { steps, ring, strum, riffle, chord, quiet, get busy() { return pending > 0; } };
}
