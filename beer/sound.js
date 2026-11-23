// Beer pour sound in Web Audio. Muted by default; the kit holds the context.
// Loops: the stream into the glass. One-shots: glugs, fizz ticks, the ring, the sip, the clink.

const jit = (k = 0.1) => 1 + (Math.random() * 2 - 1) * k;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

export function makeSound(kit) {
  let stream = null, glugPh = 0, fizzAcc = 0;
  const live = new Set();
  const track = node => { live.add(node); node.onended = () => live.delete(node); return node; };

  function filt(ac, type, f, q = 0.7) {
    const b = ac.createBiquadFilter();
    b.type = type; b.frequency.value = f; b.Q.value = q;
    return b;
  }
  function voice(ac, pan = 0) {
    const g = ac.createGain();
    g.gain.value = 0;
    const p = ac.createStereoPanner();
    p.pan.value = clamp(pan, -1, 1);
    g.connect(p).connect(kit.out);
    return g;
  }
  // A quick rise to the peak, then a fall to silence.
  function env(g, t, peak, rise, fall) {
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(peak, t + rise);
    g.gain.exponentialRampToValueAtTime(0.0002, t + rise + fall);
  }
  function noise(ac, t, len, rate = 1) {
    const s = ac.createBufferSource();
    s.buffer = kit.noise;
    s.loop = true;
    s.playbackRate.value = rate;
    s.start(t, Math.random() * 0.9);
    s.stop(t + len);
    return track(s);
  }
  function osc(ac, type, f, t, len) {
    const o = ac.createOscillator();
    o.type = type; o.frequency.value = f;
    o.start(t); o.stop(t + len);
    return track(o);
  }

  // The stream: a hiss that rises in pitch as the glass fills, and a low splash.
  function streamOn(ac) {
    if (stream && stream.ac === ac) return stream;
    const src = ac.createBufferSource();
    src.buffer = kit.noise; src.loop = true; src.start();
    const bp = filt(ac, 'bandpass', 900, 1.1), lp = filt(ac, 'lowpass', 380, 0.9);
    const g = voice(ac, 0.15), g2 = voice(ac, 0.1);
    src.connect(bp).connect(g);
    src.connect(lp).connect(g2);
    stream = { ac, src, bp, g, g2 };
    return stream;
  }
  function streamOff(now = false) {
    if (!stream) return;
    const { ac, src, g, g2 } = stream, t = ac.currentTime;
    g.gain.cancelScheduledValues(t); g2.gain.cancelScheduledValues(t);
    g.gain.setTargetAtTime(0, t, 0.05); g2.gain.setTargetAtTime(0, t, 0.05);
    try { src.stop(now ? t : t + 0.3); } catch { /* It has stopped already. */ }
    stream = null;
  }

  // A glug: air gulps into the bottle; the note falls as the bottle empties.
  function glug(ac, t, air, amt) {
    const f = (330 - 170 * air) * jit(0.08);
    const g = voice(ac, 0.3);
    env(g, t, 0.09 * amt * jit(0.2), 0.008, 0.07);
    const o = osc(ac, 'sine', f, t, 0.12);
    o.frequency.setValueAtTime(f * 0.8, t);
    o.frequency.exponentialRampToValueAtTime(f * 1.25, t + 0.05);
    o.connect(g);
  }
  // A fizz tick: one bubble bursts at the surface.
  function tick(ac, t, amt) {
    const g = voice(ac, (Math.random() - 0.5) * 0.5);
    env(g, t, 0.022 * amt * jit(0.5), 0.0006, 0.004 + 0.01 * Math.random());
    noise(ac, t, 0.03, 1.4).connect(filt(ac, 'highpass', 3200 + 4000 * Math.random(), 0.8)).connect(g);
  }

  return {
    // s: flow (0 to 1), fill (0 to 1 of the glass), air (0 to 1 of the bottle), fizz (ticks per s), awake.
    update(dt, s) {
      const ac = kit.live();
      if (!ac || !kit.noise || !s.awake) { streamOff(); return; }
      const t = ac.currentTime;
      if (s.flow > 0.02) {
        const st = streamOn(ac);
        st.bp.frequency.setTargetAtTime(600 + 2200 * s.fill * s.fill, t, 0.1);
        st.g.gain.setTargetAtTime(0.05 + 0.11 * s.flow, t, 0.06);
        st.g2.gain.setTargetAtTime(0.1 * s.flow * (1 - 0.6 * s.fill), t, 0.06);
        // Four to seven glugs a second, faster at a full flow.
        glugPh += dt * (4 + 3 * s.flow) * jit(0.15);
        if (glugPh >= 1) { glugPh -= 1; glug(ac, t + Math.random() * 0.02, s.air, s.flow); }
      } else streamOff();
      // The fizz: random ticks at the head's surface; a cap keeps the node count low.
      fizzAcc += dt * Math.min(s.fizz, 45);
      while (fizzAcc >= 1) { fizzAcc -= 1; tick(ac, t + Math.random() * Math.max(dt, 0.02), clamp(s.fizz / 20, 0.3, 1)); }
    },
    // A tap on the glass: inharmonic partials; a fuller glass rings lower and shorter.
    ring(fill) {
      const ac = kit.live();
      if (!ac) return;
      const t = ac.currentTime + 0.003;
      const f0 = (1450 - 650 * fill) * jit(0.03), damp = 1 - 0.6 * fill;
      [[1, 0.09, 1.6], [2.32, 0.05, 1.1], [4.25, 0.025, 0.6], [6.63, 0.012, 0.35]].forEach(([k, a, len]) => {
        const g = voice(ac, -0.1);
        env(g, t, a * jit(0.1), 0.002, len * damp);
        osc(ac, 'sine', f0 * k * jit(0.004), t, len * damp + 0.1).connect(g);
      });
      const n = voice(ac, -0.1);
      env(n, t, 0.04, 0.001, 0.02);
      noise(ac, t, 0.04).connect(filt(ac, 'bandpass', 5000, 1.5)).connect(n);
    },
    // A sip: a soft draw of air and beer.
    sip() {
      const ac = kit.live();
      if (!ac) return;
      const t = ac.currentTime + 0.01;
      const g = voice(ac, 0);
      env(g, t, 0.07, 0.12, 0.35);
      const lp = filt(ac, 'bandpass', 900 * jit(0.1), 0.8);
      lp.frequency.setValueAtTime(700, t);
      lp.frequency.linearRampToValueAtTime(1300, t + 0.4);
      noise(ac, t, 0.6, 0.7).connect(lp).connect(g);
    },
    // A fresh glass set down on the table.
    clink() {
      const ac = kit.live();
      if (!ac) return;
      const t = ac.currentTime + 0.005;
      const g = voice(ac, 0);
      env(g, t, 0.05, 0.002, 0.12);
      noise(ac, t, 0.15).connect(filt(ac, 'bandpass', 2400, 2)).connect(g);
      const r = voice(ac, 0);
      env(r, t, 0.025, 0.002, 0.5);
      osc(ac, 'sine', 2150 * jit(0.03), t, 0.6).connect(r);
    },
    // A hidden tab stops every voice at once.
    stop() {
      streamOff(true);
      for (const n of live) { try { n.stop(); } catch { /* It has ended already. */ } }
      live.clear();
    },
  };
}
