// Lava coast sound in Web Audio. Muted by default; the kit holds the context.
// The bed: the surf. The fountain roars and thumps from the vent, late by its distance.
// The crust clinks as it cools. The sea entry hisses; waves on hot rock pop.
// No two pops or thumps are alike.

const jit = (k = 0.1) => 1 + (Math.random() * 2 - 1) * k;

export function makeSound(kit, { onIdle = () => {} } = {}) {
  let bed = null;
  // Every scheduled one-shot node, so a mute or a hidden tab can stop them.
  const live = new Set();
  // The hiss comes from the shore, about 1.5 s late: a delay line of levels.
  const hissLog = [];
  let swellPh = Math.random() * 6;

  function voice(ac, pan = 0) {
    const g = ac.createGain();
    g.gain.value = 0;
    const p = ac.createStereoPanner();
    p.pan.value = Math.max(-1, Math.min(1, pan));
    g.connect(p).connect(kit.out);
    return { g, p };
  }
  // The last one-shot to end lets the context sleep.
  const done = n => { live.delete(n); if (!live.size) onIdle(); };
  const noiseSrc = (ac, loop = true) => {
    const s = ac.createBufferSource();
    s.buffer = kit.noise;
    s.loop = loop;
    return s;
  };
  const filter = (ac, type, f, q = 0.7) => {
    const b = ac.createBiquadFilter();
    b.type = type; b.frequency.value = f; b.Q.value = q;
    return b;
  };

  function startBed(ac) {
    // The surf: a low wash that swells and falls with the waves.
    const surf = noiseSrc(ac), surfF = filter(ac, 'lowpass', 520, 0.5), surfV = voice(ac, 0);
    surf.connect(surfF).connect(surfV.g);
    // The surf's fizz: the foam running back.
    const fizz = noiseSrc(ac), fizzF = filter(ac, 'bandpass', 2400, 0.4), fizzV = voice(ac, -0.2);
    fizz.connect(fizzF).connect(fizzV.g);
    // The fountain: a deep roar of gas and spray.
    const roar = noiseSrc(ac), roarF = filter(ac, 'lowpass', 220, 1.1), roarV = voice(ac, 0);
    roar.connect(roarF).connect(roarV.g);
    const spray = noiseSrc(ac), sprayF = filter(ac, 'bandpass', 900, 0.8), sprayV = voice(ac, 0);
    spray.connect(sprayF).connect(sprayV.g);
    // The sea entry: a hiss of steam, with a rougher band under it.
    const hiss = noiseSrc(ac), hissF = filter(ac, 'highpass', 3200, 0.5), hissV = voice(ac, 0);
    hiss.connect(hissF).connect(hissV.g);
    const boil = noiseSrc(ac), boilF = filter(ac, 'bandpass', 1300, 1.2), boilV = voice(ac, 0);
    boil.connect(boilF).connect(boilV.g);
    [surf, fizz, roar, spray, hiss, boil].forEach(s => s.start(0, Math.random() * 0.9));
    bed = { srcs: [surf, fizz, roar, spray, hiss, boil], surfV, surfF, fizzV, roarV, roarF, sprayV, hissV, boilV };
  }

  // One burst of filtered noise at time t.
  function burst(ac, t, { pan = 0, level = 0.1, f = 400, q = 0.7, type = 'lowpass', attack = 0.005, len = 0.2 }) {
    const s = noiseSrc(ac), fl = filter(ac, type, f, q), v = voice(ac, pan);
    v.g.gain.setValueAtTime(0, t);
    v.g.gain.linearRampToValueAtTime(level, t + attack);
    v.g.gain.exponentialRampToValueAtTime(0.0001, t + attack + len);
    s.connect(fl).connect(v.g);
    s.start(t, Math.random() * 0.9);
    s.stop(t + attack + len + 0.05);
    live.add(s);
    s.onended = () => done(s);
  }
  // A low thump: a sine that drops in pitch.
  function thump(ac, t, { pan = 0, level = 0.2, f = 55, len = 0.5 }) {
    const o = ac.createOscillator(), v = voice(ac, pan);
    o.frequency.setValueAtTime(f, t);
    o.frequency.exponentialRampToValueAtTime(f * 0.55, t + len);
    v.g.gain.setValueAtTime(0, t);
    v.g.gain.linearRampToValueAtTime(level, t + 0.012);
    v.g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    o.connect(v.g);
    o.start(t); o.stop(t + len + 0.05);
    live.add(o);
    o.onended = () => done(o);
  }

  // Each frame. fount: the fountain level as heard (already late).
  // hiss: the steam now; crackle: the hot area, 0 to 1.
  function frame({ surf, fount, fountPan, hiss, hissPan, crackle }) {
    const ac = kit.live();
    if (!ac || !kit.noise) return;
    if (!bed) startBed(ac);
    const t = ac.currentTime;
    // The swell: a slow wave of level, now and then a set breaks.
    swellPh += 1 / 60;
    const sw = 0.5 + 0.5 * Math.sin(swellPh * 0.9) * Math.sin(swellPh * 0.23 + 1.3);
    bed.surfV.g.gain.setTargetAtTime(surf * (0.05 + 0.09 * sw), t, 0.3);
    bed.surfF.frequency.setTargetAtTime(380 + 500 * sw, t, 0.4);
    bed.fizzV.g.gain.setTargetAtTime(surf * 0.014 * sw * sw, t, 0.5);
    // The fountain swells with its pulses.
    bed.roarV.p.pan.setTargetAtTime(fountPan, t, 0.2);
    bed.sprayV.p.pan.setTargetAtTime(fountPan, t, 0.2);
    bed.roarV.g.gain.setTargetAtTime(0.32 * fount, t, 0.12);
    bed.roarF.frequency.setTargetAtTime(150 + 220 * fount, t, 0.2);
    bed.sprayV.g.gain.setTargetAtTime(0.05 * fount * fount, t, 0.15);
    // Gas bursts in the fountain: a thump now and then.
    if (fount > 0.15 && Math.random() < fount * 0.04) thump(ac, t + 0.01, { pan: fountPan, level: 0.18 * fount * jit(0.3), f: 48 * jit(0.2), len: 0.5 * jit(0.3) });
    // The steam comes from the shore, late.
    hissLog.push([t, hiss, hissPan]);
    while (hissLog.length > 2 && hissLog[1][0] < t - 1.5) hissLog.shift();
    const [, h, hp] = hissLog[0];
    const hs = Math.min(1.5, h);
    bed.hissV.p.pan.setTargetAtTime(hp, t, 0.3);
    bed.boilV.p.pan.setTargetAtTime(hp, t, 0.3);
    // Steam crackles: the hiss level jitters frame to frame.
    bed.hissV.g.gain.setTargetAtTime((0.004 + 0.06 * hs) * (0.75 + 0.5 * Math.random()), t, 0.04);
    bed.boilV.g.gain.setTargetAtTime(0.03 * hs, t, 0.2);
    // The crust clinks as it cools and cracks.
    if (crackle > 0.01 && Math.random() < crackle * 0.5) {
      burst(ac, t + Math.random() * 0.03, { pan: fountPan + (Math.random() - 0.5) * 0.8, level: 0.02 * jit(0.5), f: 3500 * jit(0.4), type: 'bandpass', q: 3, attack: 0.001, len: 0.02 + 0.03 * Math.random() });
    }
  }

  // A wave bursts on hot rock: a crack, a thump and a gush of steam.
  // pan -1 to 1, delay in seconds, size the steam there.
  function pop({ pan, delay, size }) {
    const ac = kit.live();
    if (!ac || !kit.noise) return;
    const t0 = ac.currentTime + delay;
    const lvl = Math.min(1, 0.4 + 0.5 * size) * jit(0.25);
    const n = 1 + Math.floor(Math.random() * 3);
    for (let i = 0; i < n; i++) burst(ac, t0 + i * (0.02 + 0.05 * Math.random()), { pan, level: 0.11 * lvl, f: 1800 * jit(0.4), type: 'highpass', q: 0.6, attack: 0.002, len: 0.05 + 0.06 * Math.random() });
    thump(ac, t0, { pan, level: 0.16 * lvl, f: 70 * jit(0.25), len: 0.35 * jit(0.3) });
    burst(ac, t0 + 0.03, { pan, level: 0.05 * lvl, f: 5000 * jit(0.2), type: 'highpass', q: 0.4, attack: 0.06, len: 0.9 * jit(0.3) });
  }

  // Fades the bed and stops its nodes. cut: also stop one-shots in flight.
  function quiet(cut = false) {
    const ac = kit.ac;
    if (!ac) return;
    const t = ac.currentTime;
    if (bed) {
      const b = bed;
      bed = null;
      [b.surfV, b.fizzV, b.roarV, b.sprayV, b.hissV, b.boilV].forEach(v => v.g.gain.setTargetAtTime(0, t, 0.15));
      b.srcs.forEach(n => { try { n.stop(t + 0.8); } catch { /* stopped already */ } });
    }
    hissLog.length = 0;
    if (cut) {
      for (const n of live) { try { n.stop(); } catch { /* not started */ } }
      live.clear();
    }
  }

  return { frame, pop, quiet, get busy() { return live.size > 0; } };
}
