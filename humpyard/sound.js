// Hump yard sound in Web Audio. Muted by default; the kit holds the context.
// Clanks of couplers, the scream of retarders, switch clunks, a shunter's idle.
// Far sounds arrive late and dark, by distance.

const jit = (k = 0.1) => 1 + (Math.random() * 2 - 1) * k;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const C_SOUND = 343;

export function makeSound(kit) {
  let bus = null, bed = null, squealV = null, pending = 0, onQuiet = null;
  const live = new Set();
  const done = () => { pending--; if (pending <= 0 && !bed && !squealV) onQuiet?.(); };

  // The bus: dry, and a long slap off the yard's far sheds, into a limiter.
  function ensureBus(ac) {
    if (bus) return bus;
    const lim = ac.createDynamicsCompressor();
    lim.threshold.value = -8; lim.knee.value = 0; lim.ratio.value = 20;
    lim.attack.value = 0.002; lim.release.value = 0.2;
    lim.connect(kit.out);
    const dry = ac.createGain();
    dry.connect(lim);
    const echo = ac.createDelay(1.5);
    echo.delayTime.value = 0.42;
    const dark = ac.createBiquadFilter();
    dark.type = 'lowpass'; dark.frequency.value = 1200;
    const fb = ac.createGain();
    fb.gain.value = 0.3;
    const wet = ac.createGain();
    wet.gain.value = 0.32;
    dry.connect(echo).connect(dark).connect(fb).connect(echo);
    dark.connect(wet).connect(lim);
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
  // A voice placed by distance and side: delay, level and a lowpass for the air.
  function place(ac, dist, pan) {
    const b = ensureBus(ac);
    const lp = ac.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = clamp(9000 / (1 + dist / 60), 600, 9000);
    const p = ac.createStereoPanner();
    p.pan.value = clamp(pan, -1, 1) * 0.8;
    lp.connect(p).connect(b.dry);
    return { in: lp, nodes: [lp, p], t: ac.currentTime + 0.01 + dist / C_SOUND, k: 1 / (1 + dist / 45) };
  }

  // Couplers meet: a hard knock, then the steel rings in a few bands.
  function clank(dist, pan, k, buffer = false) {
    const ac = kit.live();
    if (!ac || !kit.noise) return;
    const v = place(ac, dist, pan), t = v.t, lvl = (0.35 + 0.65 * k) * v.k;
    const src = ac.createBufferSource();
    src.buffer = kit.noise;
    const bp = ac.createBiquadFilter();
    bp.type = 'bandpass'; bp.frequency.value = 900 * jit(0.2); bp.Q.value = 1.2;
    const g = ac.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.5 * lvl, t + 0.003);
    g.gain.setTargetAtTime(0, t + 0.01, 0.03);
    src.connect(bp).connect(g).connect(v.in);
    src.start(t, Math.random() * 0.5);
    track(src, t + 0.4, [bp, g, ...v.nodes]);
    // Rings: inharmonic partials, a ring of steel.
    for (const f of buffer ? [180, 410] : [310, 742, 1290, 2110]) {
      const o = ac.createOscillator();
      o.frequency.value = f * jit(0.04);
      const og = ac.createGain();
      og.gain.setValueAtTime(0, t);
      og.gain.linearRampToValueAtTime(0.07 * lvl, t + 0.004);
      og.gain.setTargetAtTime(0, t + 0.01, (buffer ? 0.12 : 0.22) * jit(0.2));
      o.connect(og).connect(v.in);
      o.start(t);
      track(o, t + 1.4, [og]);
    }
    // A second, softer knock as the cut settles back.
    if (k > 0.35) {
      const s2 = ac.createBufferSource();
      s2.buffer = kit.noise;
      const g2 = ac.createGain(), b2 = ac.createBiquadFilter();
      b2.type = 'bandpass'; b2.frequency.value = 620; b2.Q.value = 1.5;
      g2.gain.setValueAtTime(0, t + 0.16);
      g2.gain.linearRampToValueAtTime(0.18 * lvl, t + 0.163);
      g2.gain.setTargetAtTime(0, t + 0.17, 0.03);
      s2.connect(b2).connect(g2).connect(v.in);
      s2.start(t + 0.16, Math.random() * 0.5);
      track(s2, t + 0.5, [b2, g2]);
    }
  }

  // The retarder: a held scream that follows how hard it grips.
  function squeal(dist, pan, k) {
    const ac = kit.live();
    if (!ac || !kit.noise) return;
    const t = ac.currentTime;
    if (!squealV && k > 0.02) {
      const b = ensureBus(ac);
      const g = ac.createGain();
      g.gain.value = 0;
      const p = ac.createStereoPanner();
      const oscs = [2840, 3650, 5210].map((f, i) => {
        const o = ac.createOscillator();
        o.type = i ? 'sine' : 'triangle';
        o.frequency.value = f;
        const lfo = ac.createOscillator(), d = ac.createGain();
        lfo.frequency.value = 6 + i * 3.3;
        d.gain.value = f * 0.012;
        lfo.connect(d).connect(o.frequency);
        const og = ac.createGain();
        og.gain.value = [0.5, 0.3, 0.15][i];
        o.connect(og).connect(g);
        o.start(); lfo.start();
        return { o, lfo, og, d };
      });
      const n = ac.createBufferSource();
      n.buffer = kit.noise; n.loop = true;
      const hp = ac.createBiquadFilter();
      hp.type = 'highpass'; hp.frequency.value = 3000;
      const ng = ac.createGain();
      ng.gain.value = 0.6;
      n.connect(hp).connect(ng).connect(g);
      n.start();
      g.connect(p).connect(b.dry);
      squealV = { g, p, oscs, n, hp, ng };
    }
    if (!squealV) return;
    squealV.g.gain.setTargetAtTime(0.06 * k / (1 + dist / 70), t, k > 0 ? 0.05 : 0.12);
    squealV.p.pan.setTargetAtTime(clamp(pan, -1, 1) * 0.7, t, 0.1);
    if (k <= 0.001) {
      const v = squealV;
      squealV = null;
      pending++;
      setTimeout(() => {
        for (const x of v.oscs) { try { x.o.stop(); x.lfo.stop(); } catch { /* stopped */ } }
        try { v.n.stop(); } catch { /* stopped */ }
        v.g.disconnect();
        done();
      }, 900);
    }
  }

  // A switch throws: a motor whirr and a heavy clunk.
  function thump(dist, pan) {
    const ac = kit.live();
    if (!ac || !kit.noise) return;
    const v = place(ac, dist, pan), t = v.t;
    const o = ac.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(90, t);
    o.frequency.linearRampToValueAtTime(140, t + 0.25);
    const lp = ac.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 500;
    const g = ac.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.05 * v.k, t + 0.04);
    g.gain.setTargetAtTime(0, t + 0.24, 0.03);
    o.connect(lp).connect(g).connect(v.in);
    o.start(t);
    track(o, t + 0.5, [lp, g, ...v.nodes]);
    const s = ac.createBufferSource();
    s.buffer = kit.noise;
    const bp = ac.createBiquadFilter();
    bp.type = 'bandpass'; bp.frequency.value = 260; bp.Q.value = 1;
    const g2 = ac.createGain();
    g2.gain.setValueAtTime(0, t + 0.28);
    g2.gain.linearRampToValueAtTime(0.3 * v.k, t + 0.285);
    g2.gain.setTargetAtTime(0, t + 0.29, 0.04);
    s.connect(bp).connect(g2).connect(v.in);
    s.start(t + 0.28, Math.random() * 0.5);
    track(s, t + 0.7, [bp, g2]);
  }

  // The pin lifts at the crest: a short hiss of air.
  function hiss(dist, pan) {
    const ac = kit.live();
    if (!ac || !kit.noise) return;
    const v = place(ac, dist, pan), t = v.t;
    const s = ac.createBufferSource();
    s.buffer = kit.noise;
    const hp = ac.createBiquadFilter();
    hp.type = 'highpass'; hp.frequency.value = 2400;
    const g = ac.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.08 * v.k, t + 0.02);
    g.gain.setTargetAtTime(0, t + 0.15, 0.08);
    s.connect(hp).connect(g).connect(v.in);
    s.start(t, Math.random() * 0.5);
    track(s, t + 0.8, [hp, g, ...v.nodes]);
  }

  // The bed: the shunter's diesel idle and the low hum of the yard.
  function drive(level, rev) {
    const ac = kit.live();
    if (!ac || !kit.noise) return;
    const want = level > 0.01;
    if (!bed && want) {
      const b = ensureBus(ac);
      const lid = ac.createBiquadFilter();
      lid.type = 'lowpass'; lid.frequency.value = 220; lid.Q.value = 1.2;
      const g = ac.createGain();
      g.gain.value = 0;
      lid.connect(g).connect(b.dry);
      const oscs = [1, 2, 3.02].map(m => {
        const o = ac.createOscillator();
        o.type = 'sawtooth';
        o.frequency.value = 26 * m;
        const og = ac.createGain();
        og.gain.value = 0.4 / m;
        o.connect(og).connect(lid);
        o.start();
        return { o, m };
      });
      bed = { g, oscs, lid };
    }
    if (!bed) return;
    const t = ac.currentTime;
    bed.g.gain.setTargetAtTime(0.09 * level, t, 0.4);
    for (const { o, m } of bed.oscs) o.frequency.setTargetAtTime((24 + 14 * rev) * m, t, 0.6);
    bed.lid.frequency.setTargetAtTime(180 + 260 * rev, t, 0.5);
    if (!want) {
      const v = bed;
      bed = null;
      pending++;
      setTimeout(() => { for (const { o } of v.oscs) { try { o.stop(); } catch { /* stopped */ } } v.g.disconnect(); done(); }, 1600);
    }
  }

  function quiet() {
    for (const v of live) { try { v.src.stop(); } catch { /* stopped */ } }
    live.clear();
    if (squealV) squeal(0, 0, 0);
    if (bed) drive(0, 0);
  }

  return {
    clank, squeal, thump, hiss, drive, quiet,
    get busy() { return pending > 0 || !!bed || !!squealV; },
    set onQuiet(fn) { onQuiet = fn; },
  };
}
