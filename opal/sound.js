// Opal turn sound in Web Audio. Muted by default; the kit holds the context.
// A flaring patch rings a small glass tone: red low, blue high.
// The tone pans with the patch. Velvet whispers under a fast tilt.

const jit = (k = 0.1) => 1 + (Math.random() * 2 - 1) * k;
// A major pentatonic over two octaves, from C5.
const STEPS = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24];

export function makeSound(kit) {
  let hall = null, brush = null, lastChime = 0;
  const live = new Set();

  // A short bright room: a noise burst that dies over 2.4 s.
  function makeHall(ac) {
    const len = Math.round(ac.sampleRate * 2.4);
    const ir = ac.createBuffer(2, len, ac.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = ir.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2);
    }
    const cv = ac.createConvolver();
    cv.buffer = ir;
    const g = ac.createGain();
    g.gain.value = 0.32;
    cv.connect(g).connect(kit.out);
    return cv;
  }

  // One glass tone. lam: the patch's wavelength; level 0 to 1; pan -1 to 1.
  function chime({ lam, level, pan }) {
    const ac = kit.live();
    if (!ac) return;
    const now = ac.currentTime;
    // Flares that crowd in one moment merge into one tone; weak ones stay silent.
    if (now - lastChime < 0.28 || level < 0.18) return;
    lastChime = now;
    hall ||= makeHall(ac);
    const idx = Math.round((700 - Math.min(700, Math.max(420, lam))) / 280 * (STEPS.length - 1));
    const f0 = 523.25 * Math.pow(2, STEPS[idx] / 12) * jit(0.004);
    const t = now + Math.random() * 0.015;
    const p = ac.createStereoPanner();
    p.pan.value = Math.max(-0.9, Math.min(0.9, pan));
    const bus = ac.createGain();
    bus.gain.value = 0.11 * Math.min(1, level) * jit(0.15);
    bus.connect(p);
    p.connect(kit.out);
    p.connect(hall);
    // A small glass bar: the fundamental and two inharmonic partials.
    const parts = [[1, 1, 2.4], [2.76, 0.3, 0.9], [5.4, 0.1, 0.35]];
    let end = t;
    for (const [ratio, amp, dec] of parts) {
      const o = ac.createOscillator();
      o.frequency.value = f0 * ratio * jit(0.002);
      const g = ac.createGain();
      const d = dec * jit(0.2);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(amp, t + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(g).connect(bus);
      o.start(t);
      o.stop(t + d + 0.05);
      end = Math.max(end, t + d + 0.05);
      live.add(o);
      o.onended = () => live.delete(o);
    }
  }

  // Each frame: velvet rustle follows the tilt's speed in radians a second.
  function frame({ speed }) {
    const ac = kit.live();
    if (!ac || !kit.noise) return;
    const t = ac.currentTime;
    if (!brush) {
      const s = ac.createBufferSource();
      s.buffer = kit.noise;
      s.loop = true;
      const fl = ac.createBiquadFilter();
      fl.type = 'bandpass';
      fl.frequency.value = 1400;
      fl.Q.value = 0.6;
      const g = ac.createGain();
      g.gain.value = 0;
      s.connect(fl).connect(g).connect(kit.out);
      s.start(0, Math.random() * 0.9);
      brush = { s, fl, g };
    }
    const v = Math.min(1, speed / 2.2);
    brush.g.gain.setTargetAtTime(0.07 * v * v, t, 0.08);
    brush.fl.frequency.setTargetAtTime(900 + 1600 * v, t, 0.12);
  }

  // Fades the rustle. cut: also stop tones that still ring.
  function quiet(cut = false) {
    const ac = kit.ac;
    if (!ac) return;
    const t = ac.currentTime;
    if (brush) {
      const b = brush;
      brush = null;
      b.g.gain.setTargetAtTime(0, t, 0.1);
      try { b.s.stop(t + 0.6); } catch { /* stopped already */ }
    }
    if (cut) {
      for (const n of live) { try { n.stop(); } catch { /* not started */ } }
      live.clear();
    }
  }

  return { chime, frame, quiet, get busy() { return live.size > 0; } };
}
