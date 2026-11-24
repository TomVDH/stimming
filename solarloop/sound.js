// Solar loop sound in Web Audio. Muted by default; the kit holds the context.
// Space is silent, so the sound is a sonification: each part has a visible cause.
// A flare: a crack, a rush as the rope lifts, a low roar, a glassy note per arcade loop,
// a slow chord while the arcade glows, then soft drips as the rain drains.
// A drag: a low wind that follows the speed of the turn.
// Awake, a deep hum swells and fades; flares and eruptions land on a low brass blast.

const jit = (k = 0.1) => 1 + (Math.random() * 2 - 1) * k;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
// A minor pentatonic over two octaves: each arcade loop sounds one step higher.
const STEPS = [0, 3, 5, 7, 10, 12, 15, 17, 19, 22, 24];
// The key falls as the star grows: the hypergiant hums lowest.
const ROOT = { neutron: 440, siriusb: 392, wise: 329.63, luhman: 293.66, proxima: 261.63, epseri: 233.08, sun: 220, procyon: 207.65, sirius: 196, vega: 185, ttauri: 185, regulus: 174.61, zetaoph: 164.81, rigel: 146.83, arcturus: 138.59, betelgeuse: 123.47, vycma: 110 };

export function makeSound(kit) {
  let pending = 0;
  // Every scheduled source, so mute or a hidden tab can stop them.
  const live = new Set();
  const track = node => {
    pending++;
    live.add(node);
    node.onended = () => { pending--; live.delete(node); };
    return node;
  };

  function voice(ac, pan, dest = kit.out) {
    const g = ac.createGain();
    g.gain.value = 0;
    const p = ac.createStereoPanner();
    p.pan.value = clamp(pan, -1, 1);
    g.connect(p).connect(dest);
    return g;
  }
  function noise(ac, t, len, rate = 1) {
    const src = ac.createBufferSource();
    src.buffer = kit.noise;
    src.loop = true;
    src.playbackRate.value = rate;
    src.start(t, Math.random() * 0.9);
    src.stop(t + len);
    return track(src);
  }
  function osc(ac, type, f, t, len) {
    const o = ac.createOscillator();
    o.type = type;
    o.frequency.value = f;
    o.start(t); o.stop(t + len);
    return track(o);
  }
  function filt(ac, type, f, q = 0.7) {
    const b = ac.createBiquadFilter();
    b.type = type; b.frequency.value = f; b.Q.value = q;
    return b;
  }
  function env(g, t, peak, rise, fall) {
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(peak, t + rise);
    g.gain.exponentialRampToValueAtTime(0.0002, t + rise + fall);
  }
  // A wide hall: three long echoes, low passed.
  let hall = null;
  function hallOf(ac) {
    if (hall && hall.ac === ac) return hall.in;
    const inp = ac.createGain();
    const lp = filt(ac, 'lowpass', 3200);
    inp.connect(lp);
    for (const [d, g, p] of [[0.11, 0.3, -0.6], [0.23, 0.22, 0.6], [0.41, 0.15, 0]]) {
      const dl = ac.createDelay(1);
      dl.delayTime.value = d;
      const gn = ac.createGain();
      gn.gain.value = g;
      const pn = ac.createStereoPanner();
      pn.pan.value = p;
      lp.connect(dl).connect(gn).connect(pn).connect(kit.out);
    }
    hall = { ac, in: inp };
    return inp;
  }
  function send(ac, g, amt) {
    const s = ac.createGain();
    s.gain.value = amt;
    g.connect(s).connect(hallOf(ac));
  }

  // A soft clip gives the blast its brass edge.
  let clip = null;
  function clipOf(ac) {
    if (clip && clip.context === ac) return clip;
    clip = ac.createWaveShaper();
    const c = new Float32Array(1024);
    for (let i = 0; i < c.length; i++) { const x = i / 511.5 - 1; c[i] = Math.tanh(2.2 * x) / Math.tanh(2.2); }
    clip.curve = c;
    return clip;
  }
  // The blast: stacked saws an octave and a fifth apart, a filter that opens and closes.
  function braam(ac, t, pan, band, K, len = 6) {
    const root = (ROOT[band] || 220) / 4;
    const g = voice(ac, pan * 0.3);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.2 * K, t + 0.22);
    g.gain.setTargetAtTime(0.0001, t + 1.1, len / 4);
    const lp = filt(ac, 'lowpass', 110, 3);
    lp.frequency.setValueAtTime(110, t);
    lp.frequency.exponentialRampToValueAtTime(260 + 700 * K, t + 0.45);
    lp.frequency.exponentialRampToValueAtTime(140, t + len);
    const sh = ac.createGain();
    sh.gain.value = 0.5;
    sh.connect(clipOf(ac)).connect(lp);
    lp.connect(g);
    for (const m of [0.5, 1, 1.004, 1.498, 2, 2.996]) osc(ac, 'sawtooth', root * m * jit(0.002), t, len + 1).connect(sh);
    send(ac, g, 0.7);
  }

  // The hum: a deep chord that swells and fades while the toy is awake.
  let drone = null;
  function hum(band) {
    const ac = kit.live();
    if (!ac) return;
    if (drone && drone.ac === ac && drone.band === band) return;
    const t = ac.currentTime + 0.01;
    if (drone && drone.ac === ac) {
      drone.g.gain.setTargetAtTime(0, t, 0.8);
      for (const o of drone.os) { try { o.stop(t + 4); } catch { /* stopped */ } }
    }
    const root = (ROOT[band] || 220) / 4;
    const g = voice(ac, 0);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.05, t + 5);
    const lp = filt(ac, 'lowpass', 150, 0.7);
    lp.connect(g);
    // A slow swell: the filter breathes about every twenty seconds.
    const lfo = osc(ac, 'sine', 0.05, t, 1e5);
    const lg = ac.createGain();
    lg.gain.value = 70;
    lfo.connect(lg).connect(lp.frequency);
    const os = [lfo];
    for (const [m, ty] of [[0.5, 'sine'], [1, 'sawtooth'], [1.003, 'sawtooth'], [1.5, 'triangle'], [2.002, 'sawtooth']]) {
      const o = osc(ac, ty, root * m, t, 1e5);
      o.connect(lp);
      os.push(o);
    }
    send(ac, g, 0.5);
    drone = { ac, band, g, os };
  }

  // A prominence lifts off: the blast, a long rising rush, a tone that bends up.
  function rise(pan, band, k = 1) {
    const ac = kit.live();
    if (!ac || !kit.noise) return;
    const t = ac.currentTime + 0.005;
    const K = clamp(k, 0.3, 1);
    braam(ac, t, pan, band, K, 9);
    const r = voice(ac, pan * 0.6);
    r.gain.setValueAtTime(0, t);
    r.gain.linearRampToValueAtTime(0.12 * K, t + 6);
    r.gain.exponentialRampToValueAtTime(0.0002, t + 15);
    const bp = filt(ac, 'bandpass', 90, 1.2);
    bp.frequency.setValueAtTime(90, t);
    bp.frequency.exponentialRampToValueAtTime(2200, t + 13);
    noise(ac, t, 15.2, 0.6).connect(bp).connect(r);
    send(ac, r, 0.7);
    const root = (ROOT[band] || 220) / 2;
    const tg = voice(ac, pan * 0.4);
    tg.gain.setValueAtTime(0, t + 1);
    tg.gain.linearRampToValueAtTime(0.05 * K, t + 7);
    tg.gain.exponentialRampToValueAtTime(0.0002, t + 18);
    const o = osc(ac, 'triangle', root, t + 1, 17.5);
    o.frequency.setValueAtTime(root, t + 1);
    o.frequency.exponentialRampToValueAtTime(root * 1.498, t + 14);
    o.connect(tg);
    send(ac, tg, 0.6);
  }

  // The flare: every layer starts now or later on the audio clock.
  function flare(pan, band, k = 1) {
    const ac = kit.live();
    if (!ac || !kit.noise) return;
    const t = ac.currentTime + 0.005;
    const K = clamp(k, 0.3, 1);
    braam(ac, t, pan, band, K * 0.7, 6);
    // The crack: a burst of bright noise on a falling thump.
    const c = voice(ac, pan);
    env(c, t, 0.32 * K * jit(0.15), 0.003, 0.32 * jit(0.2));
    noise(ac, t, 0.5, jit(0.1)).connect(filt(ac, 'highpass', 900 * jit(0.15), 0.8)).connect(c);
    send(ac, c, 0.5);
    const th = voice(ac, pan * 0.5);
    env(th, t, 0.5 * K, 0.006, 0.9);
    const o = osc(ac, 'sine', 82 * jit(0.08), t, 1.1);
    o.frequency.exponentialRampToValueAtTime(31, t + 0.8);
    o.connect(th);
    // The rush: noise swept upward as the rope lifts away.
    const r = voice(ac, pan * 0.7);
    r.gain.setValueAtTime(0, t + 0.1);
    r.gain.linearRampToValueAtTime(0.14 * K, t + 1.3);
    r.gain.exponentialRampToValueAtTime(0.0002, t + 4.6);
    const bp = filt(ac, 'bandpass', 160, 1.4);
    bp.frequency.setValueAtTime(160 * jit(0.1), t + 0.1);
    bp.frequency.exponentialRampToValueAtTime(1500 * jit(0.12), t + 3.6);
    noise(ac, t + 0.1, 4.7, 0.8).connect(bp).connect(r);
    send(ac, r, 0.6);
    // The roar: a low buzz under the whole eruption.
    const lo = voice(ac, pan * 0.4);
    lo.gain.setValueAtTime(0, t);
    lo.gain.linearRampToValueAtTime(0.09 * K, t + 0.6);
    lo.gain.exponentialRampToValueAtTime(0.0002, t + 7);
    const lp = filt(ac, 'lowpass', 220, 0.9);
    for (const f of [41.2, 41.2 * 1.006]) osc(ac, 'sawtooth', f * jit(0.02), t, 7.1).connect(lp);
    lp.connect(lo);
    // The glow: a slow chord while the arcade shines.
    const root = (ROOT[band] || 220) / 2;
    const pad = voice(ac, pan * 0.5);
    pad.gain.setValueAtTime(0, t + 1.5);
    pad.gain.linearRampToValueAtTime(0.05 * K, t + 8);
    pad.gain.setValueAtTime(0.05 * K, t + 16);
    pad.gain.exponentialRampToValueAtTime(0.0002, t + 34);
    const plp = filt(ac, 'lowpass', 900, 0.5);
    plp.connect(pad);
    for (const m of [1, 1.4983, 2, 2.9966]) {
      const a = osc(ac, 'triangle', root * m * jit(0.004), t + 1.5, 33);
      a.detune.value = (Math.random() - 0.5) * 12;
      a.connect(plp);
    }
    send(ac, pad, 0.4);
    // The rain: soft drips, each a falling note, as the arcade drains.
    const n = 9 + Math.floor(Math.random() * 5);
    for (let i = 0; i < n; i++) {
      const at = t + 12 + Math.random() * 18;
      const d = voice(ac, clamp(pan + (Math.random() - 0.5) * 0.4, -1, 1));
      env(d, at, 0.05 * K * jit(0.4), 0.004, 0.22 * jit(0.3));
      const f = 900 * jit(0.25);
      const s = osc(ac, 'sine', f, at, 0.3);
      s.frequency.exponentialRampToValueAtTime(f * 0.55, at + 0.18);
      s.connect(d);
      send(ac, d, 0.5);
    }
  }

  // One arcade loop snaps in: a glassy note, one step above the last.
  function snap(j, pan, band) {
    const ac = kit.live();
    if (!ac) return;
    const t = ac.currentTime + 0.004;
    const f = (ROOT[band] || 220) * Math.pow(2, STEPS[j % STEPS.length] / 12) * jit(0.004);
    const lvl = 0.07 * Math.pow(0.93, j) * jit(0.2);
    const g = voice(ac, clamp(pan + (Math.random() - 0.5) * 0.3, -1, 1));
    env(g, t, lvl, 0.006, 1.6 * jit(0.2));
    osc(ac, 'sine', f, t, 1.8).connect(g);
    const h = ac.createGain();
    h.gain.value = 0.28;
    osc(ac, 'sine', f * 2.756, t, 0.6).connect(h).connect(g);
    send(ac, g, 0.7);
  }

  // The turn: a low wind whose level follows the drag speed.
  let wind = null;
  function turn(speed) {
    const ac = kit.live();
    if (!ac || !kit.noise) return;
    if (!wind || wind.ac !== ac) {
      const g = voice(ac, 0);
      const lp = filt(ac, 'lowpass', 240, 0.9);
      const src = ac.createBufferSource();
      src.buffer = kit.noise; src.loop = true; src.playbackRate.value = 0.5;
      src.connect(lp).connect(g);
      src.start();
      track(src);
      wind = { ac, g, lp, src };
    }
    const v = clamp(speed / 900, 0, 1);
    wind.g.gain.setTargetAtTime(0.16 * v, ac.currentTime, 0.06);
    wind.lp.frequency.setTargetAtTime(160 + 520 * v, ac.currentTime, 0.08);
  }
  function endTurn() {
    if (!wind) return;
    const { ac, g, src } = wind;
    g.gain.setTargetAtTime(0, ac.currentTime, 0.12);
    try { src.stop(ac.currentTime + 0.8); } catch { /* already stopped */ }
    wind = null;
  }

  // A pulsar's tick: a dry click on a short low thump, each time a beam sweeps past.
  function tick() {
    const ac = kit.live();
    if (!ac || !kit.noise) return;
    const t = ac.currentTime + 0.003;
    const c = voice(ac, 0);
    env(c, t, 0.12, 0.001, 0.05);
    noise(ac, t, 0.08, 1.4).connect(filt(ac, 'bandpass', 2400, 2)).connect(c);
    const th = voice(ac, 0);
    env(th, t, 0.16, 0.002, 0.14);
    const o = osc(ac, 'sine', 120, t, 0.2);
    o.frequency.exponentialRampToValueAtTime(50, t + 0.12);
    o.connect(th);
    send(ac, c, 0.3);
  }

  // The Carrington storm reaches the earth: a far telegraph sounder clacks, its line sparks.
  // In 1859 operators sent messages on the storm's current alone.
  function telegraph() {
    const ac = kit.live();
    if (!ac || !kit.noise) return;
    const t0 = ac.currentTime + 0.02;
    const pan = Math.random() < 0.5 ? -0.55 : 0.55;
    const bar = (at, f, lvl) => {
      const g = voice(ac, pan);
      env(g, at, lvl, 0.0015, 0.05);
      noise(ac, at, 0.07, 1.2).connect(filt(ac, 'bandpass', f, 6)).connect(g);
      send(ac, g, 0.6);
    };
    // The sounder: a click as the key goes down, a clack as it comes up.
    let at = t0;
    for (let i = 0; i < 22; i++) {
      const len = Math.random() < 0.35 ? 0.2 : 0.07;
      bar(at, 1500 * jit(0.05), 0.09);
      bar(at + len, 900 * jit(0.05), 0.06);
      at += len + (Math.random() < 0.2 ? 0.3 : 0.09);
    }
    // Sparks: short crackles where the current jumps at the instrument.
    for (let i = 0; i < 9; i++) {
      const sp = t0 + Math.random() * (at - t0);
      const g = voice(ac, clamp(pan + (Math.random() - 0.5) * 0.3, -1, 1));
      env(g, sp, 0.07 * jit(0.5), 0.001, 0.03 + 0.05 * Math.random());
      noise(ac, sp, 0.12, 2).connect(filt(ac, 'highpass', 3500, 0.7)).connect(g);
    }
  }

  // Stops every sound now: mute, a hidden tab, or sleep.
  function quiet() {
    wind = null;
    drone = null;
    for (const n of live) { try { n.stop(); } catch { /* not started */ } }
  }
  return { flare, rise, hum, tick, telegraph, snap, turn, endTurn, quiet, get busy() { return pending > 0; } };
}
