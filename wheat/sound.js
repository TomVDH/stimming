// Wheat storm sound in Web Audio. Muted by default; the kit holds the context.
// The bed: a dry rustle of heads and a low wind, both swelling with the gusts.
// Thunder comes late, on the audio clock, by the strike's distance:
// a crack and a boom when near, a long low roll when far. No two are alike.

const jit = (k = 0.1) => 1 + (Math.random() * 2 - 1) * k;

export function makeSound(kit, { onIdle = () => {} } = {}) {
  let bed = null;
  // Every scheduled thunder node, so a mute or a hidden tab can stop them.
  const live = new Set();

  function voice(ac, pan = 0) {
    const g = ac.createGain();
    g.gain.value = 0;
    const p = ac.createStereoPanner();
    p.pan.value = Math.max(-1, Math.min(1, pan));
    g.connect(p).connect(kit.out);
    return g;
  }
  // The last thunder node to end lets the context sleep.
  const done = n => { live.delete(n); if (!live.size) onIdle(); };
  const noiseSrc = (ac, loop = true) => {
    const s = ac.createBufferSource();
    s.buffer = kit.noise;
    s.loop = loop;
    return s;
  };

  // The bed starts on the first live frame.
  function startBed(ac) {
    // The rustle: heads and awns brushing, a dry band of noise.
    const rustle = noiseSrc(ac);
    const bp = ac.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 2600;
    bp.Q.value = 0.7;
    const rustleG = voice(ac, -0.15);
    rustle.connect(bp).connect(rustleG);
    // The hiss: fine grains of the awns, a second source on the right.
    const hiss = noiseSrc(ac);
    const hp = ac.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 5200;
    const hissG = voice(ac, 0.25);
    hiss.connect(hp).connect(hissG);
    // The wind itself: a low roar that opens in the gusts.
    const roar = noiseSrc(ac);
    const lp = ac.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 260;
    lp.Q.value = 0.9;
    const roarG = voice(ac, 0);
    roar.connect(lp).connect(roarG);
    [rustle, hiss, roar].forEach(s => s.start(0, Math.random() * 0.9));
    bed = { rustle, bp, rustleG, hiss, hissG, roar, lp, roarG };
  }

  // Each frame: the bed follows the wind at the eye and any gust front there.
  // gust: the gust field in the near wheat, 0 to 1. front: the gust front at the eye.
  function frame({ wind, gust, front }) {
    const ac = kit.live();
    if (!ac || !kit.noise) return;
    if (!bed) startBed(ac);
    const t = ac.currentTime;
    const w = Math.min(1, wind * (0.35 + 0.9 * gust) + front);
    bed.rustleG.gain.setTargetAtTime(0.003 + 0.09 * w, t, 0.25);
    bed.bp.frequency.setTargetAtTime(1800 + 1800 * w, t, 0.3);
    // Grains crackle: the hiss level jitters frame to frame.
    bed.hissG.gain.setTargetAtTime((0.004 + 0.03 * w * w) * (0.7 + 0.6 * Math.random()), t, 0.05);
    bed.roarG.gain.setTargetAtTime(0.02 * wind + 0.16 * front, t, 0.4);
    bed.lp.frequency.setTargetAtTime(180 + 500 * w, t, 0.5);
  }

  // One burst of filtered noise, at time t, for len seconds.
  function burst(ac, t, { pan = 0, level = 0.1, f = 400, q = 0.7, type = 'lowpass', attack = 0.01, len = 1 }) {
    const s = noiseSrc(ac);
    const fl = ac.createBiquadFilter();
    fl.type = type;
    fl.frequency.value = f;
    fl.Q.value = q;
    const g = voice(ac, pan);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(level, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + len);
    s.connect(fl).connect(g);
    s.start(t, Math.random() * 0.9);
    s.stop(t + attack + len + 0.05);
    live.add(s);
    s.onended = () => done(s);
  }

  // Thunder for a strike: dist in metres, pan -1 to 1, delay in seconds.
  function strike({ dist, pan, delay }) {
    const ac = kit.live();
    if (!ac || !kit.noise) return;
    const t0 = ac.currentTime + delay + 0.02;
    // Air takes the highs first: far thunder only rolls, low.
    const near = 1 / (1 + dist / 250);
    const top = 220 + 7000 * near * near;
    const lvl = 0.06 + 0.5 * near;
    // The crack: a tearing of sharp clicks, only when close.
    if (dist < 600) {
      const n = 3 + Math.floor(Math.random() * 5);
      let t = t0;
      for (let i = 0; i < n; i++) {
        burst(ac, t, { pan, level: lvl * (0.6 + 0.4 * Math.random()) * near, f: 2500 * jit(0.4), type: 'highpass', q: 0.5, attack: 0.002, len: 0.05 + 0.08 * Math.random() });
        t += 0.012 + 0.05 * Math.random();
      }
    }
    // The boom: a wide low burst, with a felt thump under it.
    burst(ac, t0 + 0.01, { pan, level: lvl * 1.1, f: Math.min(top, 900) * jit(0.2), q: 0.6, attack: 0.02 + 0.2 * (1 - near), len: 1.4 + 1.6 * (1 - near) });
    const o = ac.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(58 * jit(0.15), t0);
    o.frequency.exponentialRampToValueAtTime(32, t0 + 1.2);
    const og = voice(ac, pan * 0.5);
    og.gain.setValueAtTime(0, t0);
    og.gain.linearRampToValueAtTime(0.25 * lvl, t0 + 0.04 + 0.15 * (1 - near));
    og.gain.exponentialRampToValueAtTime(0.0001, t0 + 2.2);
    o.connect(og);
    o.start(t0); o.stop(t0 + 2.3);
    live.add(o);
    o.onended = () => done(o);
    // The roll: the far parts of the channel arrive later, lower and softer.
    const span = 1.5 + 5.5 * (1 - near);
    const n = 7 + Math.floor(Math.random() * 7);
    for (let i = 0; i < n; i++) {
      const u = Math.random() ** 0.8;
      const at = t0 + 0.15 + u * span;
      burst(ac, at, {
        pan: pan + (Math.random() - 0.5) * 0.5,
        level: lvl * 0.55 * (1 - 0.6 * u) * (0.4 + 0.6 * Math.random()),
        f: Math.max(90, top * 0.35 * (1 - 0.5 * u)) * jit(0.3),
        q: 0.5 + Math.random(),
        attack: 0.08 + 0.4 * Math.random(),
        len: 0.6 + 1.6 * Math.random(),
      });
    }
  }

  // Fades the bed and stops its nodes. cut: also stop thunder in flight.
  function quiet(cut = false) {
    const ac = kit.ac;
    if (!ac) return;
    const t = ac.currentTime;
    if (bed) {
      const b = bed;
      bed = null;
      [b.rustleG, b.hissG, b.roarG].forEach(g => g.gain.setTargetAtTime(0, t, 0.15));
      [b.rustle, b.hiss, b.roar].forEach(n => { try { n.stop(t + 0.8); } catch { /* stopped already */ } });
    }
    if (cut) {
      for (const n of live) { try { n.stop(); } catch { /* not started */ } }
      live.clear();
    }
  }

  return { frame, strike, quiet, get busy() { return live.size > 0; } };
}
