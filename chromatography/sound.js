// Chromatography sound in Web Audio. Muted by default; the kit holds the context.
// A felt nib ticks on the paper; a drop lands with a soft plip;
// the soaking paper fizzes with the front's speed; a new sheet slides.

const jit = (k = 0.1) => 1 + (Math.random() * 2 - 1) * k;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

export function makeSound(kit) {
  let bus = null, pending = 0, hiss = null, crackT = 0;
  const live = new Set();

  function ensureBus(ac) {
    if (bus) return bus;
    const lim = ac.createDynamicsCompressor();
    lim.threshold.value = -8; lim.knee.value = 0; lim.ratio.value = 20;
    lim.attack.value = 0.002; lim.release.value = 0.15;
    lim.connect(kit.out);
    const dry = ac.createGain();
    dry.gain.value = 0.9;
    dry.connect(lim);
    // A small quiet room: a desk by a window.
    const room = ac.createConvolver();
    room.buffer = roomIR(ac);
    const wet = ac.createGain();
    wet.gain.value = 0.16;
    dry.connect(room).connect(wet).connect(lim);
    bus = { dry, lim };
    return bus;
  }
  function roomIR(ac) {
    const sr = ac.sampleRate, n = Math.round(sr * 0.9);
    const b = ac.createBuffer(2, n, sr);
    for (let ch = 0; ch < 2; ch++) {
      const d = b.getChannelData(ch);
      let lp = 0;
      for (let i = 0; i < n; i++) {
        const t = i / sr;
        lp += 0.5 * ((Math.random() * 2 - 1) - lp);
        d[i] = lp * Math.exp(-t * 6.5) * Math.min(1, t / 0.006);
      }
    }
    return b;
  }
  // A one-shot node chain; it counts as busy until it ends.
  function own(src, nodes, stopAt) {
    pending++;
    const v = { src };
    live.add(v);
    src.onended = () => { pending--; live.delete(v); nodes.forEach(nd => nd.disconnect()); };
    src.stop(stopAt);
  }
  function panner(ac, pan) {
    const p = ac.createStereoPanner();
    p.pan.value = clamp(pan, -1, 1) * 0.6;
    return p;
  }
  function noiseSrc(ac) {
    const s = ac.createBufferSource();
    s.buffer = kit.noise;
    s.loop = true;
    s.loopStart = Math.random() * 0.5;
    return s;
  }

  // The felt nib meets the paper: a soft dry tick and a small press.
  function nib(pan) {
    const ac = kit.live();
    if (!ac || !kit.noise) return;
    const { dry } = ensureBus(ac);
    const t = ac.currentTime + 0.005;
    const n = noiseSrc(ac);
    const bp = ac.createBiquadFilter();
    bp.type = 'bandpass'; bp.frequency.value = 2600 * jit(0.15); bp.Q.value = 1.4;
    const g = ac.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.32 * jit(0.15), t + 0.003);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    const p = panner(ac, pan);
    n.connect(bp).connect(g).connect(p).connect(dry);
    n.start(t);
    own(n, [n, bp, g, p], t + 0.08);
    const o = ac.createOscillator();
    o.frequency.setValueAtTime(190 * jit(0.1), t);
    o.frequency.exponentialRampToValueAtTime(90, t + 0.04);
    const og = ac.createGain();
    og.gain.setValueAtTime(0.18, t);
    og.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    const p2 = panner(ac, pan);
    o.connect(og).connect(p2).connect(dry);
    o.start(t);
    own(o, [o, og, p2], t + 0.07);
  }
  // A drop lands on the dot: a round, falling plip, very short.
  function plip(pan, size = 1) {
    const ac = kit.live();
    if (!ac) return;
    const { dry } = ensureBus(ac);
    const t = ac.currentTime + 0.004;
    const f0 = 1500 * jit(0.12) / Math.sqrt(size);
    const o = ac.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(f0 * 0.55, t);
    o.frequency.exponentialRampToValueAtTime(f0, t + 0.035);
    const g = ac.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.2 * jit(0.15), t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
    const p = panner(ac, pan);
    o.connect(g).connect(p).connect(dry);
    o.start(t);
    own(o, [o, g, p], t + 0.12);
    if (!kit.noise) return;
    // The wet slap under the plip.
    const n = noiseSrc(ac);
    const lp = ac.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 1800;
    const ng = ac.createGain();
    ng.gain.setValueAtTime(0.1, t);
    ng.gain.exponentialRampToValueAtTime(0.001, t + 0.03);
    const p2 = panner(ac, pan);
    n.connect(lp).connect(ng).connect(p2).connect(dry);
    n.start(t);
    own(n, [n, lp, ng, p2], t + 0.05);
  }
  // One fibre gives way: a click of a few milliseconds.
  function crackle(ac, dry, pan, lvl) {
    const t = ac.currentTime + Math.random() * 0.03;
    const n = noiseSrc(ac);
    const hp = ac.createBiquadFilter();
    hp.type = 'bandpass'; hp.frequency.value = 3500 + Math.random() * 4500; hp.Q.value = 2.5;
    const g = ac.createGain();
    g.gain.setValueAtTime(lvl * (0.3 + Math.random() * 0.7), t);
    g.gain.exponentialRampToValueAtTime(0.0005, t + 0.004 + Math.random() * 0.006);
    const p = panner(ac, pan + (Math.random() - 0.5) * 0.2);
    n.connect(hp).connect(g).connect(p).connect(dry);
    n.start(t);
    own(n, [n, hp, g, p], t + 0.02);
  }
  // The soaking paper: a faint hiss and fibre crackle, by the front's speed.
  function fizz(rate, pan, dt) {
    const ac = kit.live();
    if (!ac || !kit.noise) { if (hiss && !ac) stopHiss(); return; }
    const { dry } = ensureBus(ac);
    const lvl = clamp(rate, 0, 1);
    if (lvl > 0.01 && !hiss) {
      const n = noiseSrc(ac);
      const hp = ac.createBiquadFilter();
      hp.type = 'highpass'; hp.frequency.value = 5200;
      const g = ac.createGain();
      g.gain.value = 0;
      const p = ac.createStereoPanner();
      n.connect(hp).connect(g).connect(p).connect(dry);
      n.start();
      hiss = { n, hp, g, p };
      pending++;
    }
    if (hiss) {
      const now = ac.currentTime;
      hiss.g.gain.setTargetAtTime(0.022 * lvl, now, 0.12);
      hiss.p.pan.setTargetAtTime(clamp(pan, -1, 1) * 0.5, now, 0.2);
      if (lvl <= 0.01) {
        crackT += dt;
        if (crackT > 0.6) stopHiss();
      } else crackT = 0;
    }
    // Crackles fall at random, more while the front runs fast.
    const want = lvl * 28 * dt;
    if (Math.random() < want) crackle(ac, dry, pan, 0.05 + 0.08 * lvl);
  }
  function stopHiss() {
    if (!hiss) return;
    const h = hiss;
    hiss = null;
    pending--;
    try { h.n.stop(); } catch { /* already stopped */ }
    [h.n, h.hp, h.g, h.p].forEach(nd => nd.disconnect());
  }
  // A clean sheet slides across the slate.
  function slide() {
    const ac = kit.live();
    if (!ac || !kit.noise) return;
    const { dry } = ensureBus(ac);
    const t = ac.currentTime + 0.01, len = 0.55 * jit(0.1);
    const n = noiseSrc(ac);
    const bp = ac.createBiquadFilter();
    bp.type = 'bandpass'; bp.Q.value = 0.8;
    bp.frequency.setValueAtTime(900, t);
    bp.frequency.linearRampToValueAtTime(2600 * jit(0.1), t + len * 0.5);
    bp.frequency.linearRampToValueAtTime(1300, t + len);
    const g = ac.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.16, t + len * 0.25);
    g.gain.linearRampToValueAtTime(0.1, t + len * 0.7);
    g.gain.linearRampToValueAtTime(0, t + len);
    const p = ac.createStereoPanner();
    p.pan.setValueAtTime(-0.5, t);
    p.pan.linearRampToValueAtTime(0.5, t + len);
    n.connect(bp).connect(g).connect(p).connect(dry);
    n.start(t);
    own(n, [n, bp, g, p], t + len + 0.05);
  }
  function quiet() {
    stopHiss();
    for (const v of live) { try { v.src.stop(); } catch { /* already stopped */ } }
  }
  return {
    nib, plip, fizz, slide, quiet,
    get busy() { return pending > 0; },
  };
}
