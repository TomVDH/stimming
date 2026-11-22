// Jellyfish tank sound in Web Audio. Muted by default; the kit holds the context.
// The bed: the pump's hum and the water's hush, which follows the flow.
// A tap: a knuckle on thick acrylic, a click and a low boom in the water.
// A flinch: a soft swoosh where a jelly pulses hard.

const jit = (k = 0.1) => 1 + (Math.random() * 2 - 1) * k;

export function makeSound(kit) {
  let bed = null, pending = 0;

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
  const done = n => { pending++; n.onended = () => { pending--; }; };

  // The bed starts on the first live frame.
  function startBed(ac) {
    // Water: noise under a low lowpass, a slow swell in its level.
    const water = noiseSrc(ac);
    const lp = ac.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 380;
    lp.Q.value = 0.4;
    const lp2 = ac.createBiquadFilter();
    lp2.type = 'lowpass';
    lp2.frequency.value = 900;
    const waterG = voice(ac, 0);
    water.connect(lp).connect(lp2).connect(waterG);
    // The inflow at the top: a faint high trickle, a little to the left.
    const trick = noiseSrc(ac);
    const bp = ac.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 2400;
    bp.Q.value = 1.2;
    const trickG = voice(ac, -0.35);
    trick.connect(bp).connect(trickG);
    // The pump: a mains hum with two soft partials.
    const humG = voice(ac, 0.2);
    const hums = [50, 100, 150].map((f, i) => {
      const o = ac.createOscillator();
      o.frequency.value = f * jit(0.002);
      const g = ac.createGain();
      g.gain.value = [1, 0.45, 0.12][i];
      o.connect(g).connect(humG);
      o.start();
      return o;
    });
    bed = { water, lp, waterG, trick, bp, trickG, humG, hums, ph: Math.random() * 10 };
  }

  // Each frame: the bed follows the flow and the awake level.
  function frame({ flow, amb, dt }) {
    const ac = kit.live();
    if (!ac || !kit.noise) return;
    if (!bed) startBed(ac);
    const t = ac.currentTime;
    bed.ph += dt * 0.21;
    const swell = 0.75 + 0.25 * Math.sin(bed.ph) * Math.sin(bed.ph * 0.43 + 1.1);
    bed.waterG.gain.setTargetAtTime((0.07 + 0.12 * flow) * swell * amb, t, 0.6);
    bed.lp.frequency.setTargetAtTime(260 + 320 * flow * swell, t, 0.8);
    bed.trickG.gain.setTargetAtTime(0.006 * (0.4 + flow) * amb, t, 0.6);
    bed.bp.frequency.setTargetAtTime(2100 + 700 * swell, t, 0.9);
    bed.humG.gain.setTargetAtTime(0.012 * amb, t, 0.6);
  }

  // A knuckle on the glass: x is the pan, k the strength.
  function knock(x, k = 1) {
    const ac = kit.live();
    if (!ac || !kit.noise) return;
    const t = ac.currentTime + 0.005, pan = x * 0.7;
    // The thud: a low sine that drops in pitch.
    const o = ac.createOscillator();
    const f0 = 150 * jit(0.08);
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(f0 * 0.5, t + 0.12);
    const g = voice(ac, pan);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.6 * k * jit(0.15), t + 0.003);
    g.gain.exponentialRampToValueAtTime(0.0004, t + 0.22 * jit(0.1));
    o.connect(g); o.start(t); o.stop(t + 0.3); done(o);
    // The click of the knuckle, dulled by thick acrylic.
    const c = ac.createBufferSource();
    c.buffer = kit.noise;
    const cb = ac.createBiquadFilter();
    cb.type = 'bandpass';
    cb.frequency.value = 1500 * jit(0.15);
    cb.Q.value = 1.6;
    const cg = voice(ac, pan);
    cg.gain.setValueAtTime(0, t);
    cg.gain.linearRampToValueAtTime(0.18 * k * jit(0.2), t + 0.002);
    cg.gain.exponentialRampToValueAtTime(0.0003, t + 0.045);
    c.connect(cb).connect(cg); c.start(t, Math.random() * 0.5, 0.06); done(c);
    // The acrylic panel rings, short and dull.
    const r = ac.createOscillator();
    r.type = 'triangle';
    r.frequency.value = 410 * jit(0.05);
    const rg = voice(ac, pan);
    rg.gain.setValueAtTime(0, t);
    rg.gain.linearRampToValueAtTime(0.03 * k, t + 0.004);
    rg.gain.exponentialRampToValueAtTime(0.0002, t + 0.16);
    r.connect(rg); r.start(t); r.stop(t + 0.2); done(r);
    // The water answers: a low boom that swells and dies.
    const b = ac.createOscillator();
    b.frequency.setValueAtTime(58 * jit(0.06), t);
    b.frequency.exponentialRampToValueAtTime(38, t + 0.7);
    const bg = voice(ac, pan * 0.5);
    bg.gain.setValueAtTime(0, t);
    bg.gain.linearRampToValueAtTime(0.36 * k, t + 0.04);
    bg.gain.exponentialRampToValueAtTime(0.0003, t + 0.9 * jit(0.1));
    b.connect(bg); b.start(t); b.stop(t + 1.0); done(b);
  }

  // A jelly's hard pulse: a soft swoosh, panned with it.
  function swoosh(x, k, delay = 0) {
    const ac = kit.live();
    if (!ac || !kit.noise) return;
    const t = ac.currentTime + delay, len = 0.6 * jit(0.2);
    const s = ac.createBufferSource();
    s.buffer = kit.noise;
    const bp = ac.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 0.9;
    bp.frequency.setValueAtTime(260 * jit(0.2), t);
    bp.frequency.linearRampToValueAtTime(620 * jit(0.2), t + 0.12);
    bp.frequency.exponentialRampToValueAtTime(220, t + len);
    const g = voice(ac, x * 0.8);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.07 * Math.min(1, k) * jit(0.25), t + 0.09);
    g.gain.exponentialRampToValueAtTime(0.0003, t + len);
    s.connect(bp).connect(g); s.start(t, Math.random() * 0.3, len + 0.05); done(s);
  }

  // The bed fades and its nodes stop; the kit then sleeps.
  function quiet() {
    const ac = kit.ac;
    if (!bed || !ac) return;
    const b = bed, t = ac.currentTime;
    bed = null;
    [b.waterG, b.trickG, b.humG].forEach(g => g.gain.setTargetAtTime(0, t, 0.15));
    [...b.hums, b.water, b.trick].forEach(n => { try { n.stop(t + 0.8); } catch { /* stopped already */ } });
  }

  return { frame, knock, swoosh, quiet, get busy() { return pending > 0; } };
}
