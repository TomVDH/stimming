// Interchange trails sound in Web Audio. Muted by default; the kit holds the context.
// The bed: motorway roar and a low engine drone that follow the mean speed.
// Brake lights coming on in a knot make soft tyre scrubs, panned to the car.

const jit = (k = 0.1) => 1 + (Math.random() * 2 - 1) * k;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
// Above this rate, brake scrubs thin out.
const MAX_RATE = 9;

export function makeSound(kit) {
  let bus = null, bed = null, bedOn = false, pending = 0, gateAt = 0, onQuiet = null;
  // The last sound in flight tells the toy, so the context can sleep.
  const done = () => { pending--; if (pending <= 0 && !bed) onQuiet?.(); };
  const live = new Set();

  // The bus: dry, and a dark slap off the open lot, into a limiter.
  function ensureBus(ac) {
    if (bus) return bus;
    const lim = ac.createDynamicsCompressor();
    lim.threshold.value = -6; lim.knee.value = 0; lim.ratio.value = 20;
    lim.attack.value = 0.002; lim.release.value = 0.15;
    lim.connect(kit.out);
    const dry = ac.createGain();
    dry.gain.value = 0.9;
    dry.connect(lim);
    const slap = ac.createDelay(0.5);
    slap.delayTime.value = 0.13;
    const dark = ac.createBiquadFilter();
    dark.type = 'lowpass'; dark.frequency.value = 1400;
    const back = ac.createGain();
    back.gain.value = 0.16;
    dry.connect(slap).connect(dark).connect(back).connect(lim);
    bus = { dry };
    return bus;
  }

  function track(src, stopAt, nodes) {
    pending++;
    const v = { src, nodes };
    live.add(v);
    src.stop(stopAt);
    src.onended = () => { live.delete(v); nodes.forEach(n => n.disconnect()); done(); };
  }

  // A burst of filtered noise: tyre on stone.
  function scrub(ac, t, { f, q, dur, level, pan }) {
    const b = ensureBus(ac);
    const src = ac.createBufferSource();
    src.buffer = kit.noise;
    src.playbackRate.value = jit(0.08);
    const bp = ac.createBiquadFilter();
    bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = q;
    const g = ac.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(level, t + 0.012);
    g.gain.setTargetAtTime(0, t + dur * 0.35, dur * 0.3);
    const p = ac.createStereoPanner();
    p.pan.value = clamp(pan, -1, 1) * 0.75;
    src.connect(bp).connect(g).connect(p).connect(b.dry);
    src.start(t, Math.random() * 0.5);
    track(src, t + dur * 2.4, [bp, g, p]);
  }

  // A pad squeal: a sine that wavers and slides down.
  function squeal(ac, t, { f, dur, level, pan }) {
    const b = ensureBus(ac);
    const o = ac.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(f, t);
    o.frequency.exponentialRampToValueAtTime(f * 0.86, t + dur);
    const lfo = ac.createOscillator();
    lfo.frequency.value = 23 * jit(0.2);
    const depth = ac.createGain();
    depth.gain.value = f * 0.012;
    lfo.connect(depth).connect(o.frequency);
    const g = ac.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(level, t + 0.03);
    g.gain.setTargetAtTime(0, t + dur * 0.6, dur * 0.18);
    const p = ac.createStereoPanner();
    p.pan.value = clamp(pan, -1, 1) * 0.75;
    o.connect(g).connect(p).connect(b.dry);
    o.start(t); lfo.start(t);
    lfo.stop(t + dur * 1.6);
    track(o, t + dur * 1.6, [g, p, depth, lfo]);
  }

  /**
   * Brake lights that came on this frame.
   * Each: { pan: -1 to 1, hard: 0 to 1 }.
   */
  function brakes(list) {
    const ac = kit.live();
    if (!ac || !kit.noise || !list.length) return;
    const t0 = ac.currentTime + 0.02;
    list.forEach((e, i) => {
      const t = t0 + i * 0.03 * jit(0.4);
      if (t < gateAt) return;
      gateAt = t + (1 / MAX_RATE) * jit(0.3);
      scrub(ac, t, { f: 820 * jit(0.18), q: 1.6, dur: 0.11 + 0.1 * e.hard, level: 0.15 * (0.45 + 0.55 * e.hard) * jit(0.15), pan: e.pan });
      if (e.hard > 0.55) squeal(ac, t + 0.02, { f: 1250 * jit(0.12), dur: 0.22 * jit(0.2), level: 0.035 * e.hard, pan: e.pan });
    });
  }

  // The tapped car: a firm stop, a short squeal and a scrub.
  function stop(pan) {
    const ac = kit.live();
    if (!ac || !kit.noise) return;
    const t = ac.currentTime + 0.01;
    scrub(ac, t, { f: 1150 * jit(0.08), q: 3.5, dur: 0.42, level: 0.24, pan });
    scrub(ac, t, { f: 260 * jit(0.1), q: 0.9, dur: 0.3, level: 0.18, pan });
    squeal(ac, t + 0.03, { f: 960 * jit(0.06), dur: 0.5, level: 0.09, pan });
    gateAt = t + 0.25;
  }

  // Even out: a soft swell of air.
  function swell() {
    const ac = kit.live();
    if (!ac || !kit.noise) return;
    const b = ensureBus(ac), t = ac.currentTime + 0.01;
    const src = ac.createBufferSource();
    src.buffer = kit.noise;
    src.loop = true;
    const lp = ac.createBiquadFilter();
    lp.type = 'lowpass'; lp.Q.value = 2.5;
    lp.frequency.setValueAtTime(260, t);
    lp.frequency.exponentialRampToValueAtTime(2200, t + 0.9);
    lp.frequency.exponentialRampToValueAtTime(600, t + 1.7);
    const g = ac.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.14, t + 0.7);
    g.gain.setTargetAtTime(0, t + 1.0, 0.3);
    src.connect(lp).connect(g).connect(b.dry);
    src.start(t);
    track(src, t + 2.6, [lp, g]);
  }

  // The bed follows the mean speed in m/s; level is 0 to 1.
  function drive(mean, crowd, level) {
    const ac = kit.live();
    if (!ac || !kit.noise) { bedOn = false; return; }
    const want = level > 0.01;
    if (!bed && want) {
      const b = ensureBus(ac);
      const src = ac.createBufferSource();
      src.buffer = kit.noise;
      src.loop = true;
      const bp = ac.createBiquadFilter();
      bp.type = 'bandpass'; bp.Q.value = 0.6;
      const lp = ac.createBiquadFilter();
      lp.type = 'lowpass'; lp.frequency.value = 2600;
      const roar = ac.createGain();
      roar.gain.value = 0;
      src.connect(bp).connect(lp).connect(roar).connect(b.dry);
      // The engines: three saws, a little apart, under a low lid.
      const lid = ac.createBiquadFilter();
      lid.type = 'lowpass'; lid.frequency.value = 240; lid.Q.value = 0.8;
      const hum = ac.createGain();
      hum.gain.value = 0;
      lid.connect(hum).connect(b.dry);
      const oscs = [1, 1.006, 1.5].map(m => {
        const o = ac.createOscillator();
        o.type = 'sawtooth';
        o.frequency.value = 40 * m;
        const g = ac.createGain();
        g.gain.value = m === 1.5 ? 0.35 : 0.5;
        o.connect(g).connect(lid);
        o.start();
        return { o, m };
      });
      src.start();
      bed = { src, bp, roar, hum, oscs, lid };
    }
    if (!bed) return;
    const t = ac.currentTime;
    const sp = clamp(mean / 9, 0, 1.4);
    const k = Math.sqrt(clamp(crowd / 22, 0.4, 1.5));
    bed.roar.gain.setTargetAtTime(0.13 * sp ** 1.4 * k * level, t, 0.3);
    bed.bp.frequency.setTargetAtTime(380 + 90 * mean, t, 0.4);
    bed.hum.gain.setTargetAtTime(0.1 * (0.35 + 0.65 * sp) * k * level, t, 0.3);
    bed.lid.frequency.setTargetAtTime(170 + 30 * mean, t, 0.4);
    for (const { o, m } of bed.oscs) o.frequency.setTargetAtTime((34 + 4.4 * mean) * m, t, 0.5);
    bedOn = want;
    // A silent bed fades out and stops itself, so the context can sleep.
    if (!want) stopBed(t + 1.6);
  }
  // Stops the bed at time at, or at once.
  function stopBed(at = 0) {
    if (!bed) return;
    const b = bed;
    bed = null;
    bedOn = false;
    if (at) {
      b.roar.gain.setTargetAtTime(0, at - 1.6, 0.3);
      b.hum.gain.setTargetAtTime(0, at - 1.6, 0.3);
      // The fade counts as a sound in flight until it ends.
      pending++;
      b.src.onended = done;
    }
    try { b.src.stop(at); } catch { /* stopped */ }
    for (const { o } of b.oscs) { try { o.stop(at); } catch { /* stopped */ } }
  }

  // Stops every sound at once.
  function quiet() {
    for (const v of live) { try { v.src.stop(); } catch { /* stopped */ } }
    live.clear();
    stopBed();
    gateAt = kit.ac ? kit.ac.currentTime : 0;
  }

  return {
    brakes, stop, swell, drive, quiet,
    get busy() { return pending > 0 || bedOn || !!bed; },
    set onQuiet(fn) { onQuiet = fn; },
  };
}
