// Glowworm cave sound in Web Audio. Muted by default; the kit holds the context.
// Every sound runs into a long stone echo, as in a grotto.
// The bed: a low murmur of the river and a far trickle. The boat laps as it drifts.
// One-shots: the drop's plink, the hand in the water, a soft voice.

const jit = (k = 0.1) => 1 + (Math.random() * 2 - 1) * k;
const rnd = (a, b) => a + Math.random() * (b - a);

export function makeSound(kit) {
  let echo = null, bus = null, bed = null, pending = 0, lapT = 1.5;
  // The quiet cave sits low; one bus lifts every voice to the site's level.
  function out(ac) {
    if (!bus) { bus = ac.createGain(); bus.gain.value = 7; bus.connect(kit.out); }
    return bus;
  }

  // A stone room: early taps, then a dark tail of about 4.5 s.
  function room(ac) {
    if (echo) return echo;
    const len = Math.round(ac.sampleRate * 4.6), buf = ac.createBuffer(2, len, ac.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      let lp = 0;
      for (let i = 0; i < len; i++) {
        const t = i / ac.sampleRate;
        // The tail darkens as it decays: a one-pole filter closes with time.
        const k = 0.75 * Math.exp(-t / 1.4) + 0.05;
        lp += (Math.random() * 2 - 1 - lp) * k;
        d[i] = lp * Math.exp(-t / 1.25) * (t < 0.012 ? t / 0.012 : 1);
      }
      // Early reflections off the water and the near walls.
      [0.021, 0.037, 0.058, 0.083, 0.117].forEach((t, j) => {
        const i = Math.round((t + ch * 0.004 * (j + 1)) * ac.sampleRate);
        if (i < len) d[i] += (0.55 - j * 0.08) * (Math.random() < 0.5 ? -1 : 1);
      });
    }
    const conv = ac.createConvolver();
    conv.buffer = buf;
    const wet = ac.createGain();
    wet.gain.value = 0.5;
    conv.connect(wet).connect(out(ac));
    echo = conv;
    return echo;
  }

  // One voice: a gain, a pan, the dry path and a send to the echo.
  function voice(ac, pan = 0, send = 0.6) {
    const g = ac.createGain();
    g.gain.value = 0;
    const p = ac.createStereoPanner();
    p.pan.value = Math.max(-1, Math.min(1, pan));
    g.connect(p).connect(out(ac));
    const s = ac.createGain();
    s.gain.value = send;
    g.connect(s).connect(room(ac));
    return g;
  }
  // A sound counts as busy until its echo has mostly died away.
  const track = n => { pending++; n.onended = () => { setTimeout(() => { pending--; }, 2500); }; };

  // The bed starts on the first live frame.
  function startBed(ac) {
    // The river: brown-ish noise, deep and slow.
    const src = ac.createBufferSource();
    src.buffer = kit.noise;
    src.loop = true;
    const lp = ac.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 160; lp.Q.value = 0.5;
    const lp2 = ac.createBiquadFilter();
    lp2.type = 'lowpass'; lp2.frequency.value = 220;
    const g = voice(ac, 0, 0.3);
    src.connect(lp).connect(lp2).connect(g);
    src.start(0, Math.random() * 0.9);
    // A far trickle round the bend, mostly echo.
    const tr = ac.createBufferSource();
    tr.buffer = kit.noise;
    tr.loop = true;
    const bp = ac.createBiquadFilter();
    bp.type = 'bandpass'; bp.frequency.value = 2400; bp.Q.value = 1.3;
    const tg = voice(ac, 0.45, 1.4);
    tr.connect(bp).connect(tg);
    tr.start(0, Math.random() * 0.9);
    // The trickle swells and falls on two slow, uneven waves.
    const l1 = ac.createOscillator(), l2 = ac.createOscillator();
    l1.frequency.value = 0.13; l2.frequency.value = 0.31;
    const k1 = ac.createGain(), k2 = ac.createGain();
    k1.gain.value = 0.0025; k2.gain.value = 0.0015;
    l1.connect(k1).connect(tg.gain); l2.connect(k2).connect(tg.gain);
    l1.start(); l2.start();
    bed = { g, tg, nodes: [src, tr, l1, l2] };
    const t = ac.currentTime;
    g.gain.setTargetAtTime(0.06, t, 0.8);
    tg.gain.setTargetAtTime(0.005, t, 1.2);
  }

  // Each frame: the bed, and the boat's laps while it drifts.
  function frame(dt, pace) {
    const ac = kit.live();
    if (!ac || !kit.noise) return;
    if (!bed) startBed(ac);
    lapT -= dt * (0.4 + pace);
    if (pace > 0.02 && lapT <= 0) {
      lap(ac, pace);
      lapT = rnd(1.4, 3.2);
    }
  }

  // A lap of water on the hull: a soft low slap, now and then a plip.
  function lap(ac, pace) {
    const t = ac.currentTime + 0.01, len = 0.45 * jit(0.3);
    const src = ac.createBufferSource();
    src.buffer = kit.noise;
    const lp = ac.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 420 * jit(0.3); lp.Q.value = 2;
    const g = voice(ac, rnd(-0.3, 0.3), 0.35);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.05 * Math.min(1, 0.3 + pace) * jit(0.3), t + 0.07);
    g.gain.exponentialRampToValueAtTime(0.0003, t + len);
    src.connect(lp).connect(g);
    src.start(t, Math.random() * 0.5, len + 0.05);
    track(src);
    if (Math.random() < 0.3) bubble(ac, t + rnd(0.05, 0.2), rnd(-0.3, 0.3), rnd(1100, 1700), 0.012, 0.5);
  }

  // A bubble rings as a drop lands: a sine whose pitch rises fast.
  function bubble(ac, t, pan, f, lv, send = 0.8) {
    const o = ac.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(f, t);
    o.frequency.exponentialRampToValueAtTime(f * rnd(1.5, 1.9), t + rnd(0.02, 0.04));
    const len = rnd(0.06, 0.11);
    const g = voice(ac, pan, send);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(lv, t + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0002, t + len);
    o.connect(g);
    o.start(t); o.stop(t + len + 0.02);
    track(o);
  }
  // A short tick of noise: the moment of impact.
  function click(ac, t, pan, lv, f = 3500) {
    const src = ac.createBufferSource();
    src.buffer = kit.noise;
    const hp = ac.createBiquadFilter();
    hp.type = 'bandpass'; hp.frequency.value = f * jit(0.2); hp.Q.value = 0.9;
    const g = voice(ac, pan, 0.6);
    g.gain.setValueAtTime(lv, t);
    g.gain.exponentialRampToValueAtTime(0.0002, t + 0.012);
    src.connect(hp).connect(g);
    src.start(t, Math.random() * 0.9, 0.02);
  }

  // The drop lands: a plink in the echo. Far drops are quieter and wetter.
  function plink(pan, dist, height) {
    const ac = kit.live();
    if (!ac || !kit.noise) return;
    const t = ac.currentTime + 0.005, near = 1 / (1 + dist * 0.18);
    click(ac, t, pan, 0.05 * near);
    bubble(ac, t + 0.003, pan, rnd(650, 1300) * (0.9 + 0.05 * height), 0.13 * near * jit(0.2), 0.9 + (1 - near));
    // Half the time a second, smaller ring follows.
    if (Math.random() < 0.5) bubble(ac, t + rnd(0.04, 0.09), pan, rnd(1300, 2100), 0.04 * near, 1.0);
  }

  // A hand in the water: a soft slosh, a low gloop, bubbles, then drips off the fingers.
  // Far taps are a flick: a few small plips.
  function dip(pan, near, dist) {
    const ac = kit.live();
    if (!ac || !kit.noise) return;
    const t = ac.currentTime + 0.01;
    if (!near) {
      const k = 1 / (1 + dist * 0.12);
      for (let i = 0; i < 3; i++) {
        const at = t + i * rnd(0.03, 0.08);
        click(ac, at, pan + rnd(-0.08, 0.08), 0.03 * k);
        bubble(ac, at + 0.002, pan, rnd(900, 1800), 0.06 * k * jit(0.3), 1.1);
      }
      return;
    }
    const src = ac.createBufferSource();
    src.buffer = kit.noise;
    const bp = ac.createBiquadFilter();
    bp.type = 'bandpass'; bp.Q.value = 0.8;
    bp.frequency.setValueAtTime(1400 * jit(0.15), t);
    bp.frequency.exponentialRampToValueAtTime(500, t + 0.35);
    const g = voice(ac, pan, 0.45);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.11 * jit(0.2), t + 0.035);
    g.gain.exponentialRampToValueAtTime(0.0003, t + 0.42);
    src.connect(bp).connect(g);
    src.start(t, Math.random() * 0.5, 0.5);
    track(src);
    // The gloop: the hand's air pocket closes.
    const o = ac.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(240 * jit(0.1), t + 0.03);
    o.frequency.exponentialRampToValueAtTime(120, t + 0.16);
    const og = voice(ac, pan, 0.4);
    og.gain.setValueAtTime(0, t + 0.03);
    og.gain.linearRampToValueAtTime(0.09, t + 0.045);
    og.gain.exponentialRampToValueAtTime(0.0003, t + 0.2);
    o.connect(og);
    o.start(t + 0.03); o.stop(t + 0.25);
    for (let i = 0; i < 4; i++) bubble(ac, t + rnd(0.05, 0.4), pan + rnd(-0.1, 0.1), rnd(800, 2200), 0.035 * jit(0.4), 0.7);
    // The hand lifts out; drops fall off the fingers.
    const lift = t + rnd(0.8, 1.1);
    for (let i = 0; i < 3 + Math.floor(Math.random() * 3); i++) bubble(ac, lift + i * rnd(0.12, 0.35), pan, rnd(1100, 2000), 0.03 * jit(0.4), 1.0);
  }

  // A soft voice in the boat: two syllables, "o-oh", low and hushed.
  // A glottal buzz runs through three vowel formants; a breath runs under it.
  function speak() {
    const ac = kit.live();
    if (!ac || !kit.noise) return;
    const t = ac.currentTime + 0.02, f0 = rnd(108, 132), len = 1.35 * jit(0.1);
    const src = ac.createOscillator();
    src.type = 'sawtooth';
    src.frequency.setValueAtTime(f0 * 1.04, t);
    src.frequency.linearRampToValueAtTime(f0 * 1.08, t + 0.25);
    src.frequency.setValueAtTime(f0 * 1.02, t + 0.42);
    src.frequency.linearRampToValueAtTime(f0 * 0.86, t + len);
    // A slow vibrato keeps the buzz human.
    const vib = ac.createOscillator(), vg = ac.createGain();
    vib.frequency.value = 5.2 * jit(0.1);
    vg.gain.value = f0 * 0.006;
    vib.connect(vg).connect(src.frequency);
    const out = voice(ac, rnd(-0.08, 0.08), 0.75);
    const soft = ac.createBiquadFilter();
    soft.type = 'lowpass'; soft.frequency.value = 2600;
    soft.connect(out);
    // The vowel: "o" to a darker "oh".
    [[430, 380, 1, 8], [820, 720, 0.55, 10], [2600, 2450, 0.12, 12]].forEach(([a, b, lv, q]) => {
      const bp = ac.createBiquadFilter();
      bp.type = 'bandpass'; bp.Q.value = q;
      bp.frequency.setValueAtTime(a * jit(0.04), t);
      bp.frequency.linearRampToValueAtTime(b, t + len);
      const g = ac.createGain();
      g.gain.value = lv;
      src.connect(bp).connect(g).connect(soft);
    });
    // Two syllables: a short one, a gap, a long one that fades.
    const e = out.gain;
    e.setValueAtTime(0, t);
    e.linearRampToValueAtTime(0.16, t + 0.06);
    e.setTargetAtTime(0.1, t + 0.12, 0.08);
    e.linearRampToValueAtTime(0.012, t + 0.36);
    e.linearRampToValueAtTime(0.18, t + 0.5);
    e.setTargetAtTime(0.11, t + 0.6, 0.2);
    e.linearRampToValueAtTime(0.0004, t + len);
    // A breath under the voice.
    const br = ac.createBufferSource();
    br.buffer = kit.noise;
    const bbp = ac.createBiquadFilter();
    bbp.type = 'bandpass'; bbp.frequency.value = 1500; bbp.Q.value = 0.7;
    const bg = voice(ac, 0, 0.5);
    bg.gain.setValueAtTime(0, t);
    bg.gain.linearRampToValueAtTime(0.012, t + 0.1);
    bg.gain.linearRampToValueAtTime(0.0003, t + len);
    br.connect(bbp).connect(bg);
    src.start(t); vib.start(t); br.start(t, Math.random() * 0.3, len);
    src.stop(t + len + 0.05); vib.stop(t + len + 0.05);
    track(src);
  }

  // The bed fades and its nodes stop; the kit then sleeps.
  function quiet() {
    const ac = kit.ac;
    if (!bed || !ac) return;
    const b = bed, t = ac.currentTime;
    bed = null;
    b.g.gain.setTargetAtTime(0, t, 0.2);
    b.tg.gain.cancelScheduledValues(t);
    b.tg.gain.setTargetAtTime(0, t, 0.2);
    b.nodes.forEach(n => { try { n.stop(t + 1); } catch { /* stopped already */ } });
  }

  return { frame, plink, dip, voice: speak, detach() { /* a drop leaves the rock in silence */ }, quiet, get busy() { return pending > 0; } };
}
