// Volcano sound: tremor at once, then the boom, the roar, thunder and landings late by distance.
// Raw Web Audio on the shared kit; muted until the toy's sound is on.
import { sound } from '../shared/stim.js';

const jit = (v, k) => v * (1 + (Math.random() * 2 - 1) * k);
const panOf = x => Math.max(-0.8, Math.min(0.8, x * 0.7));

export function volcanoSound(kit) {
  // Every scheduled source, so mute and a hidden tab can stop them.
  const pending = new Set();
  let bed = null, landT = 0, landN = 0, restT = 0;
  const live = () => (sound.on ? kit.live() : null);
  const gain = (ac, g = 0) => { const n = ac.createGain(); n.gain.value = g; return n; };
  const filt = (ac, type, f, q = 0.7) => { const n = ac.createBiquadFilter(); n.type = type; n.frequency.value = f; n.Q.value = q; return n; };
  const pan = (ac, x) => { const p = ac.createStereoPanner(); p.pan.value = panOf(x); p.connect(kit.out); return p; };
  function track(src, tail) {
    pending.add(src);
    src.onended = () => { pending.delete(src); tail.disconnect(); };
  }
  // A noise source through a chain, with an attack and an exponential tail.
  function noise(ac, x, { at, chain, level, attack = 0.01, hold = 0, decay, rate = 1 }) {
    const t = ac.currentTime + at, s = ac.createBufferSource(), g = gain(ac), p = pan(ac, x);
    s.buffer = kit.noise; s.loop = true; s.playbackRate.value = jit(rate, 0.1);
    let n = s;
    chain.forEach(f => { n.connect(f); n = f; });
    n.connect(g).connect(p);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(level, t + attack);
    g.gain.setValueAtTime(level, t + attack + hold);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + hold + decay);
    s.start(t, Math.random() * 0.5);
    s.stop(t + attack + hold + decay + 0.05);
    track(s, p);
    return g;
  }
  function tone(ac, x, { at, f0, f1, level, decay, type = 'sine' }) {
    const t = ac.currentTime + at, o = ac.createOscillator(), g = gain(ac), p = pan(ac, x);
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(f1, t + decay);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(level, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
    o.connect(g).connect(p);
    o.start(t); o.stop(t + decay + 0.05);
    track(o, p);
  }

  // The tremor bed: a deep rumble and a sub hum that follow the pressure.
  function startBed(ac) {
    if (bed || !kit.noise) return;
    const s = ac.createBufferSource();
    s.buffer = kit.noise; s.loop = true; s.playbackRate.value = 0.35;
    const lo = filt(ac, 'lowpass', 75, 0.9), o = ac.createOscillator();
    o.frequency.value = 33;
    const gN = gain(ac), gO = gain(ac), out = gain(ac, 1);
    s.connect(lo).connect(gN).connect(out);
    o.connect(gO).connect(out);
    out.connect(kit.out);
    s.start(); o.start();
    bed = { s, o, gN, gO, out, quiet: 0 };
  }
  function stopBed() {
    if (!bed) return;
    const b = bed, ac = kit.ac;
    bed = null;
    if (ac) {
      b.out.gain.setTargetAtTime(0, ac.currentTime, 0.15);
      try { b.s.stop(ac.currentTime + 0.8); b.o.stop(ac.currentTime + 0.8); } catch { /* stopped */ }
    }
    setTimeout(() => b.out.disconnect(), 1000);
  }
  function cancel() {
    for (const s of pending) { try { s.stop(); } catch { /* not started */ } }
    pending.clear();
  }

  return {
    // The blast reaches the ear late: a deep thump, a dulled crack, echoes off the land, then the roar.
    blast(size, delay, x, roarFor) {
      const ac = live(); if (!ac) return;
      const L = 0.4 + 0.6 * Math.sqrt(size);
      tone(ac, x, { at: delay, f0: jit(58, 0.08), f1: 22, level: 0.85 * L, decay: jit(2.4, 0.1) });
      noise(ac, x, { at: delay, chain: [filt(ac, 'lowpass', jit(340, 0.1), 0.6)], level: 0.75 * L, attack: 0.008, decay: jit(1.9, 0.15) });
      noise(ac, x, { at: delay, chain: [filt(ac, 'bandpass', jit(950, 0.15), 0.8), filt(ac, 'lowpass', 2400, 0.7)], level: 0.32 * L, attack: 0.004, decay: 0.28 });
      // Two echoes come back off the land round the cone.
      [[jit(0.75, 0.15), 0.22], [jit(1.7, 0.15), 0.1]].forEach(([dt, k], i) => noise(ac, x * (i ? -0.5 : 0.4), { at: delay + dt, chain: [filt(ac, 'lowpass', 230, 0.6)], level: k * L, attack: 0.03, decay: 1.6 }));
      // The roar of the jet, as long as the fountain stands.
      const hold = Math.max(0.5, roarFor * 0.35);
      noise(ac, x, { at: delay + 0.15, chain: [filt(ac, 'lowpass', jit(260 + 260 * size, 0.1), 0.8)], level: 0.3 * L, attack: 0.5, hold, decay: roarFor * 0.65 + 2.5, rate: 0.7 });
      noise(ac, x, { at: delay + 0.2, chain: [filt(ac, 'bandpass', jit(700, 0.1), 0.6)], level: 0.06 * L, attack: 0.6, hold, decay: roarFor * 0.5 + 1.5 });
      // Crackle: spatter pops inside the roar.
      const n = Math.round(10 + 50 * size);
      for (let i = 0; i < n; i++) {
        const at = delay + 0.2 + Math.pow(Math.random(), 1.6) * roarFor;
        noise(ac, x + (Math.random() - 0.5) * 0.2, { at, chain: [filt(ac, 'bandpass', jit(1700, 0.4), 1.6), filt(ac, 'lowpass', 3200, 0.7)], level: jit(0.05, 0.5), attack: 0.002, decay: jit(0.04, 0.4) });
      }
    },
    // Thunder: a crack when the bolt is near, then a long rolling rumble.
    thunder(delay, dist, x, s) {
      const ac = live(); if (!ac) return;
      const near = Math.max(0, 1 - dist / 2200), L = 0.45 + 0.4 * s;
      if (near > 0.2) noise(ac, x, { at: delay, chain: [filt(ac, 'bandpass', jit(1400, 0.2), 0.9)], level: 0.22 * near * L, attack: 0.003, decay: 0.22 });
      const parts = 5 + ((Math.random() * 4) | 0);
      let at = delay + 0.05;
      for (let i = 0; i < parts; i++) {
        const k = Math.exp(-i * 0.35);
        noise(ac, x + (Math.random() - 0.5) * 0.4, { at, chain: [filt(ac, 'lowpass', jit(240 + 200 * near, 0.25), 0.7)], level: jit(0.32, 0.35) * k * L, attack: jit(0.08, 0.5), decay: jit(0.9, 0.3) });
        at += jit(0.35, 0.5);
      }
    },
    // A bomb lands: a dull thud, and a rattle of stones for a big one.
    land(e, delay, x) {
      const ac = live(); if (!ac) return;
      // Landings come in clusters; a cap keeps the mix clean.
      const now = performance.now();
      if (now - landT > 1000) { landT = now; landN = 0; }
      if (++landN > 14) return;
      tone(ac, x, { at: delay, f0: jit(95, 0.2), f1: 45, level: 0.1 + 0.25 * e, decay: jit(0.22, 0.2) });
      noise(ac, x, { at: delay, chain: [filt(ac, 'lowpass', jit(520, 0.25), 0.8)], level: 0.06 + 0.16 * e, attack: 0.004, decay: jit(0.16, 0.3) });
      if (e > 0.4) noise(ac, x, { at: delay + 0.05, chain: [filt(ac, 'bandpass', jit(1100, 0.3), 1.2)], level: 0.025 * e, attack: 0.02, decay: jit(0.6, 0.3) });
    },
    // The tremor follows the pressure at once: the ground carries it fast.
    update({ tremor, heat }) {
      const ac = live();
      const want = tremor > 0.01 || heat > 0.9;
      if (!ac) { if (bed && !sound.on) stopBed(); return; }
      if (want) startBed(ac);
      if (!bed) return;
      const t = ac.currentTime;
      bed.gN.gain.setTargetAtTime(0.5 * tremor + 0.08 * Math.max(0, heat - 0.9), t, 0.15);
      bed.gO.gain.setTargetAtTime(0.18 * tremor, t, 0.2);
      bed.o.frequency.setTargetAtTime(30 + 8 * tremor, t, 0.3);
      bed.quiet = want ? 0 : bed.quiet + 1;
      if (bed.quiet > 40) stopBed();
    },
    get pending() { return pending.size; },
    // The context sleeps only after the last late sound has played.
    rest() {
      stopBed();
      clearTimeout(restT);
      const tryRest = () => { if (pending.size) restT = setTimeout(tryRest, 500); else kit.rest(() => !bed && pending.size === 0); };
      tryRest();
    },
    cancel() { cancel(); stopBed(); },
    hide() { clearTimeout(restT); cancel(); stopBed(); kit.ac?.suspend()?.catch(() => {}); },
  };
}
