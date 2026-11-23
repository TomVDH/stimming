// Calving sound: the crack, the groan, the fall and the boom arrive late, by distance.
// The surge and the floes knocking are near the camera and arrive at once.
// Raw Web Audio on the shared kit; muted until the toy's sound is on.
import { sound } from '../shared/stim.js';

const jit = (v, k) => v * (1 + (Math.random() * 2 - 1) * k);
const panOf = x => Math.max(-0.85, Math.min(0.85, x * 0.75));

export function calvingSound(kit) {
  // Every scheduled source, so mute and a hidden tab can stop them.
  const pending = new Set();
  let restT = 0, hitT = 0, hitN = 0;
  const live = () => (sound.on ? kit.live() : null);
  const gain = (ac, g = 0) => { const n = ac.createGain(); n.gain.value = g; return n; };
  const filt = (ac, type, f, q = 0.7) => { const n = ac.createBiquadFilter(); n.type = type; n.frequency.value = f; n.Q.value = q; return n; };
  const pan = (ac, x) => { const p = ac.createStereoPanner(); p.pan.value = panOf(x); p.connect(kit.out); return p; };
  function track(src, tail) {
    pending.add(src);
    src.onended = () => { pending.delete(src); tail.disconnect(); };
  }
  // Air dulls a far sound: the top end goes first.
  const far = (ac, delay) => filt(ac, 'lowpass', Math.max(1400, 9000 - delay * 2600), 0.5);
  // A noise source through a chain, with an attack, a hold and an exponential tail.
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
    return { s, g, chain };
  }
  function tone(ac, x, { at, f0, f1, level, decay, attack = 0.012, type = 'sine' }) {
    const t = ac.currentTime + at, o = ac.createOscillator(), g = gain(ac), p = pan(ac, x);
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(f1, t + decay);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(level, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
    o.connect(g).connect(p);
    o.start(t); o.stop(t + decay + 0.05);
    track(o, p);
  }
  // One report: a sharp snap with a low thud under it.
  function report(ac, x, at, L, delay) {
    noise(ac, x, { at, chain: [filt(ac, 'bandpass', jit(1700, 0.2), 0.9), far(ac, delay)], level: 0.3 * L, attack: 0.002, decay: jit(0.14, 0.3) });
    noise(ac, x, { at, chain: [filt(ac, 'lowpass', jit(260, 0.2), 0.7)], level: 0.4 * L, attack: 0.004, decay: jit(0.55, 0.2) });
    tone(ac, x, { at, f0: jit(70, 0.1), f1: 34, level: 0.3 * L, decay: jit(0.7, 0.15) });
  }
  // The fjord walls send each loud sound back, later and duller.
  function echoes(ac, x, at, L, len) {
    [[jit(1.3, 0.2), 0.18, -0.6], [jit(2.6, 0.2), 0.09, 0.5]].forEach(([dt, k, side]) =>
      noise(ac, x * 0.3 + side, { at: at + dt, chain: [filt(ac, 'lowpass', 320, 0.6)], level: k * L, attack: 0.05, decay: len }));
  }
  function cancel() {
    for (const s of pending) { try { s.stop(); } catch { /* not started */ } }
    pending.clear();
  }

  return {
    // The first crack, late by distance: a gunshot snap and its echo.
    crack(size, delay, x) {
      const ac = live(); if (!ac) return;
      const L = 0.45 + 0.55 * size;
      report(ac, x, delay, L, delay);
      echoes(ac, x, delay, L * 0.8, 0.9);
    },
    // The crack runs: small dry snaps.
    tick(size, delay, x) {
      const ac = live(); if (!ac) return;
      noise(ac, x, { at: delay, chain: [filt(ac, 'bandpass', jit(2200, 0.3), 1.4), far(ac, delay)], level: jit(0.08, 0.4) * (0.6 + size), attack: 0.002, decay: jit(0.07, 0.3) });
      noise(ac, x, { at: delay, chain: [filt(ac, 'lowpass', 300, 0.7)], level: 0.06 * (0.5 + size), attack: 0.003, decay: 0.2 });
    },
    // The tower leans: a deep groan that rises, broken by snaps.
    groan(size, delay, x, dur) {
      const ac = live(); if (!ac) return;
      const L = 0.4 + 0.6 * size;
      const bp = filt(ac, 'bandpass', jit(150, 0.15), 7);
      const n = noise(ac, x, { at: delay, chain: [bp, filt(ac, 'lowpass', 600, 0.7)], level: 0.5 * L, attack: dur * 0.7, hold: dur * 0.2, decay: 1.2, rate: 0.6 });
      // The pitch creeps up as the strain builds.
      const t = ac.currentTime + delay;
      bp.frequency.setValueAtTime(jit(120, 0.15), t);
      bp.frequency.linearRampToValueAtTime(jit(230, 0.15), t + dur);
      void n;
      tone(ac, x, { at: delay, f0: jit(42, 0.1), f1: 30, level: 0.12 * L, attack: dur * 0.6, decay: dur + 1 });
      const snaps = Math.round(4 + 8 * size);
      for (let i = 0; i < snaps; i++) {
        const at = delay + Math.pow(Math.random(), 0.7) * dur;
        noise(ac, x + (Math.random() - 0.5) * 0.1, { at, chain: [filt(ac, 'bandpass', jit(1500, 0.4), 1.2), far(ac, delay)], level: jit(0.09, 0.5) * L, attack: 0.002, decay: jit(0.09, 0.4) });
      }
    },
    // The tower breaks and drops: a loud report, then the roar of ice falling.
    fall(size, delay, x, fallT) {
      const ac = live(); if (!ac) return;
      const L = 0.5 + 0.5 * size;
      report(ac, x, delay, L * 1.1, delay);
      echoes(ac, x, delay, L, 1.4);
      noise(ac, x, { at: delay + 0.05, chain: [filt(ac, 'lowpass', jit(220 + 120 * size, 0.1), 0.8)], level: 0.32 * L, attack: fallT * 0.6, hold: fallT * 0.3, decay: 1.2, rate: 0.7 });
      noise(ac, x, { at: delay + 0.1, chain: [filt(ac, 'bandpass', jit(650, 0.15), 0.8), far(ac, delay)], level: 0.1 * L, attack: fallT * 0.5, hold: fallT * 0.4, decay: 0.8 });
      // Crumbles: blocks grind and shed as they fall.
      const n = Math.round(6 + 14 * size);
      for (let i = 0; i < n; i++) {
        const at = delay + 0.2 + Math.random() * fallT;
        noise(ac, x + (Math.random() - 0.5) * 0.15, { at, chain: [filt(ac, 'bandpass', jit(900, 0.5), 1.5), far(ac, delay)], level: jit(0.05, 0.5) * L, attack: 0.004, decay: jit(0.12, 0.4) });
      }
    },
    // White thunder: the boom of ice into water, then the long hiss of the splash.
    impact(size, delay, x) {
      const ac = live(); if (!ac) return;
      // Blocks land in clusters; a cap keeps the mix clean.
      const now = performance.now();
      if (now - hitT > 600) { hitT = now; hitN = 0; }
      if (++hitN > 4) return;
      const L = 0.3 + 0.7 * Math.min(1, size);
      tone(ac, x, { at: delay, f0: jit(52, 0.1), f1: 22, level: 0.85 * L, decay: jit(2.6, 0.1) });
      noise(ac, x, { at: delay, chain: [filt(ac, 'lowpass', jit(380, 0.15), 0.6)], level: 0.7 * L, attack: 0.01, decay: jit(1.8, 0.15) });
      noise(ac, x, { at: delay + 0.08, chain: [filt(ac, 'bandpass', jit(1200, 0.2), 0.5), far(ac, delay)], level: 0.2 * L, attack: 0.25, hold: 0.6 + 1.5 * size, decay: 2.5 + 3 * size, rate: 0.9 });
      noise(ac, x, { at: delay + 0.15, chain: [filt(ac, 'lowpass', 520, 0.7)], level: 0.16 * L, attack: 0.4, hold: 1 + size, decay: 3 + 3 * size, rate: 0.7 });
      echoes(ac, x, delay, L * 0.9, 1.8);
    },
    // A small chip: a snap, then a far plop when it lands.
    chip(size, delay, x) {
      const ac = live(); if (!ac) return;
      const L = 0.25 + 0.3 * size;
      noise(ac, x, { at: delay, chain: [filt(ac, 'bandpass', jit(1900, 0.3), 1.1), far(ac, delay)], level: 0.12 * L, attack: 0.002, decay: 0.1 });
      const land = delay + jit(2.1, 0.15);
      tone(ac, x, { at: land, f0: jit(110, 0.2), f1: 50, level: 0.12 * L, decay: 0.35 });
      noise(ac, x, { at: land, chain: [filt(ac, 'bandpass', jit(900, 0.3), 0.8), far(ac, delay)], level: 0.08 * L, attack: 0.02, decay: jit(0.8, 0.2) });
    },
    // The surge reaches the camera: a long wash that swells and ebbs.
    surge(amp) {
      const ac = live(); if (!ac) return;
      const L = Math.min(1, 0.25 + amp * 0.9);
      const lp = filt(ac, 'lowpass', 500, 0.6);
      noise(ac, 0, { at: 0, chain: [lp], level: 0.28 * L, attack: 2.2, hold: 2.5, decay: 6, rate: 0.8 });
      const t = ac.currentTime;
      lp.frequency.setValueAtTime(350, t);
      lp.frequency.linearRampToValueAtTime(1300, t + 3.5);
      lp.frequency.linearRampToValueAtTime(400, t + 10);
      // Laps on the hull, one per crest.
      for (let i = 0; i < 4; i++) {
        noise(ac, (Math.random() - 0.5) * 0.6, { at: 0.8 + i * jit(3.9, 0.1), chain: [filt(ac, 'bandpass', jit(420, 0.2), 1.1)], level: 0.14 * L * Math.exp(-i * 0.45), attack: 0.25, decay: 1.1 });
      }
    },
    // Floes knock together: a short wooden tock with a glassy ring.
    clink(delay, x, k) {
      const ac = live(); if (!ac) return;
      tone(ac, x, { at: delay, f0: jit(1700, 0.35), f1: jit(1500, 0.3), level: 0.035 * k, decay: jit(0.09, 0.3), attack: 0.002 });
      noise(ac, x, { at: delay, chain: [filt(ac, 'bandpass', jit(800, 0.3), 1.2)], level: 0.05 * k, attack: 0.002, decay: jit(0.05, 0.3) });
    },
    get pending() { return pending.size; },
    // The context sleeps only after the last late sound has played.
    rest() {
      clearTimeout(restT);
      const tryRest = () => { if (pending.size) restT = setTimeout(tryRest, 500); else kit.rest(() => pending.size === 0); };
      tryRest();
    },
    cancel() { cancel(); },
    hide() { clearTimeout(restT); cancel(); kit.ac?.suspend()?.catch(() => {}); },
  };
}
