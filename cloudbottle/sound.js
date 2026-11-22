// Cloud in a bottle sound in Web Audio. Muted by default; the kit holds the context.
// A rubber wheeze per squeeze, stopper creaks, the pop with its hiss, a soft land.
// Every sound is a one-shot node, so an idle page runs no audio.

const jit = (k = 0.1) => 1 + (Math.random() * 2 - 1) * k;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

export function makeSound(kit) {
  let pending = 0;
  const track = node => { pending++; node.onended = () => { pending--; }; };

  function voice(ac, pan) {
    const g = ac.createGain();
    g.gain.value = 0;
    const p = ac.createStereoPanner();
    p.pan.value = clamp(pan, -1, 1);
    g.connect(p).connect(kit.out);
    return g;
  }
  function noise(ac, t, len) {
    const src = ac.createBufferSource();
    src.buffer = kit.noise;
    src.loop = true;
    src.start(t, Math.random() * 0.9);
    src.stop(t + len);
    track(src);
    return src;
  }

  // The squeeze: air pushed through the bulb's valve, then the bulb draws in.
  // p is the gauge pressure; the push gets tighter and higher as it climbs.
  function squeeze(pan, p) {
    const ac = kit.live();
    if (!ac || !kit.noise) return;
    const t = ac.currentTime + 0.005;
    const k = clamp(p / 0.6, 0, 1.3);
    // The push: a breathy band that rises with the pressure.
    const bp = ac.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 2.2 + 3 * k;
    bp.frequency.setValueAtTime((700 + 900 * k) * jit(0.08), t);
    bp.frequency.exponentialRampToValueAtTime((1300 + 1500 * k) * jit(0.08), t + 0.14);
    const g = voice(ac, pan);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.13 * jit(0.15), t + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0005, t + 0.2 * jit(0.1));
    noise(ac, t, 0.25).connect(bp).connect(g);
    // The valve reed: a short buzz with a pitch that rises with the pressure.
    const o = ac.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime((210 + 260 * k) * jit(0.05), t + 0.02);
    o.frequency.linearRampToValueAtTime((260 + 320 * k) * jit(0.05), t + 0.12);
    const lp = ac.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 1600;
    const og = voice(ac, pan);
    og.gain.setValueAtTime(0, t + 0.02);
    og.gain.linearRampToValueAtTime(0.022 * jit(0.3) * (0.4 + k), t + 0.05);
    og.gain.exponentialRampToValueAtTime(0.0005, t + 0.15);
    o.connect(lp).connect(og);
    o.start(t + 0.02); o.stop(t + 0.18);
    track(o);
    // The refill: the bulb sucks air back in through its tail valve.
    const hp = ac.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 2600 * jit(0.1);
    const rg = voice(ac, pan);
    const r0 = t + 0.2 * jit(0.1);
    rg.gain.setValueAtTime(0, r0);
    rg.gain.linearRampToValueAtTime(0.035 * jit(0.2), r0 + 0.08);
    rg.gain.exponentialRampToValueAtTime(0.0005, r0 + 0.32);
    noise(ac, r0, 0.35).connect(hp).connect(rg);
  }

  // A creak: the rubber stopper slips in the glass neck in a few stick-slip ticks.
  function creak(pan, k) {
    const ac = kit.live();
    if (!ac) return;
    let t = ac.currentTime + 0.04 + Math.random() * 0.08;
    const n = 3 + Math.floor(Math.random() * 5 * k);
    const f = (520 + 400 * Math.random()) * (0.8 + 0.4 * k);
    for (let i = 0; i < n; i++) {
      const o = ac.createOscillator();
      o.type = 'triangle';
      o.frequency.value = f * jit(0.04);
      const g = voice(ac, pan + (Math.random() - 0.5) * 0.1);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.03 * k * jit(0.3), t + 0.003);
      g.gain.exponentialRampToValueAtTime(0.0004, t + 0.035);
      o.connect(g);
      o.start(t); o.stop(t + 0.05);
      track(o);
      t += 0.018 + Math.random() * 0.03;
    }
  }

  // The pop: a crack, the jug's hollow note, the hiss of escaping air.
  // k is the pressure drop, 0 to 1; fog is how much cloud formed.
  function pop(pan, k, fog) {
    const ac = kit.live();
    if (!ac || !kit.noise) return;
    const t = ac.currentTime + 0.005;
    const lvl = 0.25 + 0.75 * k;
    // The crack: a bright, short burst.
    const bp = ac.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 0.9;
    bp.frequency.value = 1800 * jit(0.15);
    const cg = voice(ac, pan);
    cg.gain.setValueAtTime(0.5 * lvl * jit(0.1), t);
    cg.gain.exponentialRampToValueAtTime(0.0005, t + 0.05);
    noise(ac, t, 0.08).connect(bp).connect(cg);
    // The hollow note: the jug rings as a Helmholtz resonator, near 110 Hz.
    const o = ac.createOscillator();
    o.type = 'sine';
    const f = 112 * jit(0.06);
    o.frequency.setValueAtTime(f * 1.25, t);
    o.frequency.exponentialRampToValueAtTime(f, t + 0.05);
    const og = voice(ac, pan * 0.6);
    og.gain.setValueAtTime(0, t);
    og.gain.linearRampToValueAtTime(0.32 * lvl, t + 0.006);
    og.gain.exponentialRampToValueAtTime(0.0005, t + 0.35 * jit(0.1));
    o.connect(og);
    o.start(t); o.stop(t + 0.4);
    track(o);
    // The hiss: air rushes out of the mouth and dies away.
    if (k > 0.05) {
      const hp = ac.createBiquadFilter();
      hp.type = 'bandpass';
      hp.Q.value = 0.5;
      hp.frequency.setValueAtTime(5200 * jit(0.1), t);
      hp.frequency.exponentialRampToValueAtTime(2200, t + 0.5);
      const hg = voice(ac, pan);
      const len = (0.35 + 0.5 * k) * jit(0.1);
      hg.gain.setValueAtTime(0, t);
      hg.gain.linearRampToValueAtTime(0.16 * lvl, t + 0.01);
      hg.gain.exponentialRampToValueAtTime(0.0005, t + len);
      noise(ac, t, len + 0.05).connect(hp).connect(hg);
    }
    // The cloud: a soft low breath as the fog fills the jug.
    if (fog > 0.05) {
      const lp = ac.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 340 * jit(0.1);
      const fg = voice(ac, pan * 0.5);
      fg.gain.setValueAtTime(0, t + 0.04);
      fg.gain.linearRampToValueAtTime(0.09 * Math.min(1, fog), t + 0.2);
      fg.gain.exponentialRampToValueAtTime(0.0005, t + 1.1);
      noise(ac, t + 0.04, 1.2).connect(lp).connect(fg);
    }
  }

  // The stopper lands loose on the mouth: a dull rubber knock on glass.
  function land(pan, k) {
    const ac = kit.live();
    if (!ac) return;
    const t = ac.currentTime + 0.003;
    const o = ac.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(300 * jit(0.1), t);
    o.frequency.exponentialRampToValueAtTime(160, t + 0.05);
    const g = voice(ac, pan);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.12 * k * jit(0.2), t + 0.003);
    g.gain.exponentialRampToValueAtTime(0.0004, t + 0.09);
    o.connect(g);
    o.start(t); o.stop(t + 0.1);
    track(o);
    // The glass answers with a short ring.
    const r = ac.createOscillator();
    r.type = 'sine';
    r.frequency.value = 2350 * jit(0.05);
    const rg = voice(ac, pan);
    rg.gain.setValueAtTime(0, t);
    rg.gain.linearRampToValueAtTime(0.012 * k, t + 0.002);
    rg.gain.exponentialRampToValueAtTime(0.0003, t + 0.25);
    r.connect(rg);
    r.start(t); r.stop(t + 0.3);
    track(r);
  }

  // The stopper goes home: a rubber squeak into the neck and a soft thud.
  function seat(pan) {
    const ac = kit.live();
    if (!ac) return;
    const t = ac.currentTime + 0.005;
    const o = ac.createOscillator();
    o.type = 'triangle';
    o.frequency.setValueAtTime(700 * jit(0.08), t);
    o.frequency.exponentialRampToValueAtTime(980 * jit(0.08), t + 0.09);
    const g = voice(ac, pan);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.025 * jit(0.2), t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0004, t + 0.11);
    o.connect(g);
    o.start(t); o.stop(t + 0.13);
    track(o);
    land(pan, 0.5);
  }

  // A grip on the stopper: one faint tick.
  function grip(pan) {
    const ac = kit.live();
    if (!ac) return;
    const t = ac.currentTime + 0.003;
    const o = ac.createOscillator();
    o.type = 'triangle';
    o.frequency.value = 640 * jit(0.1);
    const g = voice(ac, pan);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.015, t + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0003, t + 0.04);
    o.connect(g);
    o.start(t); o.stop(t + 0.05);
    track(o);
  }

  // One-shot nodes stop by themselves; nothing loops.
  function quiet() {}

  return { squeeze, creak, pop, land, seat, grip, quiet, get busy() { return pending > 0; } };
}
