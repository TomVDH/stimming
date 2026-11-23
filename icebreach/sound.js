// Ice breach sound: the floe groans and cracks, the sail breaks through, slabs knock, the sea rushes.
// Ice cracks ring with a falling chirp: sea ice is a dispersive plate.
// Raw Web Audio on the shared kit; muted until the toy's sound is on.
import { sound } from '../shared/stim.js';

const jit = (v, k) => v * (1 + (Math.random() * 2 - 1) * k);
const panOf = x => Math.max(-0.8, Math.min(0.8, x * 0.7));

export function breachSound(kit) {
  // Every scheduled source, so mute and a hidden tab can stop them.
  const pending = new Set();
  let bed = null, restT = 0, groanT = 0;
  const live = () => (sound.on ? kit.live() : null);
  const gain = (ac, g = 0) => { const n = ac.createGain(); n.gain.value = g; return n; };
  const filt = (ac, type, f, q = 0.7) => { const n = ac.createBiquadFilter(); n.type = type; n.frequency.value = f; n.Q.value = q; return n; };
  const pan = (ac, x) => { const p = ac.createStereoPanner(); p.pan.value = panOf(x); p.connect(kit.out); return p; };
  function track(src, tail) {
    pending.add(src);
    src.onended = () => { pending.delete(src); tail.disconnect(); };
  }
  function noise(ac, x, { at = 0, chain, level, attack = 0.01, hold = 0, decay, rate = 1 }) {
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
  }
  function tone(ac, x, { at = 0, f0, f1, level, decay, type = 'sine', attack = 0.004, glide = decay }) {
    const t = ac.currentTime + at, o = ac.createOscillator(), g = gain(ac), p = pan(ac, x);
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(f1, t + glide);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(level, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
    o.connect(g).connect(p);
    o.start(t); o.stop(t + decay + 0.05);
    track(o, p);
  }
  // A crack: a hard tick, then the plate rings in a falling chirp.
  function crack(ac, x, at, k) {
    noise(ac, x, { at, chain: [filt(ac, 'highpass', 2200, 0.7)], level: 0.3 * k, attack: 0.001, decay: 0.03 });
    tone(ac, x, { at: at + 0.004, f0: jit(5200, 0.25), f1: jit(380, 0.2), level: 0.11 * k, decay: jit(0.32, 0.3), glide: 0.18 });
    tone(ac, x, { at: at + 0.02, f0: jit(2600, 0.25), f1: jit(220, 0.2), level: 0.07 * k, decay: jit(0.5, 0.3), glide: 0.28 });
    noise(ac, x, { at, chain: [filt(ac, 'lowpass', 240, 0.8)], level: 0.25 * k, attack: 0.003, decay: 0.25 });
  }

  // The bed: the floe's groan, the hull's rush, the water in the hole.
  function startBed(ac) {
    if (bed || !kit.noise) return;
    const src = rate => { const s = ac.createBufferSource(); s.buffer = kit.noise; s.loop = true; s.playbackRate.value = rate; s.start(0, Math.random()); return s; };
    const out = gain(ac, 1);
    out.connect(kit.out);
    // The groan: a low resonant creak whose pitch wanders.
    const gr = gain(ac), grBp = filt(ac, 'bandpass', 70, 9), grBp2 = filt(ac, 'bandpass', 140, 6), saw = ac.createOscillator(), sawG = gain(ac, 0.05);
    saw.type = 'sawtooth'; saw.frequency.value = 38;
    saw.connect(sawG).connect(grBp);
    src(0.3).connect(grBp);
    grBp.connect(gr); src(0.5).connect(grBp2).connect(gr);
    gr.connect(out);
    saw.start();
    // The rush: water streaming past the hull and off the casing.
    const ru = gain(ac), ruLo = filt(ac, 'lowpass', 600, 0.5), ruHi = filt(ac, 'bandpass', 1800, 0.4);
    src(0.7).connect(ruLo).connect(ru); src(1.0).connect(ruHi).connect(ru);
    ru.connect(out);
    // The water: slop and gurgle in the hole.
    const wa = gain(ac), waBp = filt(ac, 'bandpass', 420, 1.2);
    src(0.6).connect(waBp).connect(wa).connect(out);
    bed = { out, gr, grBp, grBp2, saw, ru, wa, quiet: 0, g: 0, r: 0, w: 0 };
  }
  function stopBed() {
    if (!bed) return;
    const b = bed, ac = kit.ac;
    bed = null;
    if (ac) b.out.gain.setTargetAtTime(0, ac.currentTime, 0.2);
    setTimeout(() => { try { b.saw.stop(); } catch { /* stopped */ } b.out.disconnect(); }, 1200);
  }
  function cancel() {
    for (const s of pending) { try { s.stop(); } catch { /* not started */ } }
    pending.clear();
  }
  function bedSet() {
    const ac = live();
    const want = bed ? bed.g + bed.r + bed.w > 0.01 : false;
    if (!ac || !bed) return;
    const t = ac.currentTime;
    bed.gr.gain.setTargetAtTime(0.55 * bed.g, t, 0.15);
    // The groan's pitch wanders as the strain shifts.
    if (t > groanT) {
      groanT = t + jit(0.45, 0.5);
      const f = jit(52 + 40 * bed.g, 0.25);
      bed.grBp.frequency.setTargetAtTime(f, t, 0.18);
      bed.grBp2.frequency.setTargetAtTime(f * 2.03, t, 0.18);
      bed.saw.frequency.setTargetAtTime(f * 0.5, t, 0.2);
    }
    bed.ru.gain.setTargetAtTime(0.45 * bed.r, t, 0.2);
    bed.wa.gain.setTargetAtTime(0.25 * bed.w, t, 0.3);
    bed.quiet = want ? 0 : bed.quiet + 1;
    if (bed.quiet > 90) stopBed();
  }
  const ensure = () => { const ac = live(); if (ac) startBed(ac); return ac; };

  return {
    // The ballast blows: a long hiss far below.
    blow() {
      const ac = live(); if (!ac) return;
      noise(ac, 0.1, { chain: [filt(ac, 'bandpass', 900, 0.6), filt(ac, 'lowpass', 1400, 0.5)], level: 0.12, attack: 0.4, hold: 1.2, decay: 1.6 });
    },
    // The vents open for the dive: a roar of air, then the sea closing.
    vent() {
      const ac = live(); if (!ac) return;
      noise(ac, 0.1, { chain: [filt(ac, 'bandpass', 1400, 0.5)], level: 0.22, attack: 0.08, hold: 0.8, decay: 1.8 });
      noise(ac, 0.1, { at: 0.6, chain: [filt(ac, 'lowpass', 300, 0.7)], level: 0.3, attack: 0.3, hold: 1.0, decay: 2.4 });
    },
    // The floe groans under the sail: k 0 to 1, 0 stops it.
    groan(k) {
      if (k > 0.01) ensure();
      if (bed) { bed.g = k; bedSet(); }
    },
    crack(k, x) {
      const ac = live(); if (!ac) return;
      crack(ac, x, 0, k);
    },
    // The breach: a deep boom, a volley of cracks, the slabs heaving off.
    breach() {
      const ac = live(); if (!ac) return;
      tone(ac, 0.1, { f0: 64, f1: 28, level: 0.8, decay: 2.2, attack: 0.01 });
      noise(ac, 0.1, { chain: [filt(ac, 'lowpass', 380, 0.6)], level: 0.6, attack: 0.02, hold: 0.4, decay: 2.4 });
      for (let i = 0; i < 9; i++) crack(ac, (Math.random() - 0.5) * 1.2, i * jit(0.07, 0.6), jit(0.8, 0.3));
      noise(ac, 0.1, { at: 0.2, chain: [filt(ac, 'highpass', 2000, 0.6)], level: 0.14, attack: 0.3, hold: 1.0, decay: 2.4 });
    },
    // A slab strikes the hull or another slab: a dull thud with a ring of ice.
    clack(k, x) {
      const ac = live(); if (!ac || k < 0.05) return;
      tone(ac, x, { f0: jit(140, 0.2), f1: 60, level: 0.35 * k, decay: jit(0.2, 0.2), type: 'triangle', attack: 0.002 });
      noise(ac, x, { chain: [filt(ac, 'bandpass', jit(1100, 0.3), 1.0)], level: 0.2 * k, attack: 0.001, decay: 0.09 });
      if (k > 0.4) tone(ac, x, { at: 0.005, f0: jit(3200, 0.3), f1: 500, level: 0.04 * k, decay: 0.25, glide: 0.15 });
    },
    rush(k) {
      if (k > 0.01) ensure();
      if (bed) { bed.r = k; bedSet(); }
    },
    water(k) {
      if (bed) { bed.w = k; bedSet(); }
    },
    get busy() { return !!bed || pending.size > 0; },
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
