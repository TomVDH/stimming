// Fruit sound: squelch, boing, the knife and the juice, the thunk on a join.
// Raw Web Audio on the shared kit; muted until the toy's sound is on.
import { sound } from '../shared/stim.js';

const jit = (v, k) => v * (1 + (Math.random() * 2 - 1) * k);

export function fruitSound(kit) {
  const live = () => (sound.on ? kit.live() : null);
  // Every scheduled source, so a hidden tab can stop them all.
  const nodes = new Set();
  const keep = n => { nodes.add(n); n.onended = () => nodes.delete(n); return n; };
  const gain = (ac, g = 0) => { const n = ac.createGain(); n.gain.value = g; return n; };
  const filt = (ac, type, f, q = 0.7) => { const n = ac.createBiquadFilter(); n.type = type; n.frequency.value = f; n.Q.value = q; return n; };
  const pan = (ac, p) => { const n = ac.createStereoPanner(); n.pan.value = Math.max(-1, Math.min(1, p)); return n; };

  // A burst of filtered noise, with an optional sweep.
  function burst(ac, { f, f1 = 0, q = 1, dur, lvl, type = 'bandpass', at = 0, p = 0, atk = 0.004 }) {
    if (!kit.noise) return;
    const t = ac.currentTime + at, s = keep(ac.createBufferSource()), g = gain(ac), b = filt(ac, type, jit(f, 0.1), q), pn = pan(ac, p);
    s.buffer = kit.noise;
    if (f1) b.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(jit(lvl, 0.15), t + atk);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(b).connect(g).connect(pn).connect(kit.out);
    s.start(t, Math.random() * 0.5, dur + 0.05);
  }
  // A sine that glides: thumps, plops, the boing.
  function tone(ac, { f, f1, dur, lvl, at = 0, p = 0, type = 'sine', vib = 0, vibF = 0 }) {
    const t = ac.currentTime + at, o = keep(ac.createOscillator()), g = gain(ac), pn = pan(ac, p);
    o.type = type;
    o.frequency.setValueAtTime(jit(f, 0.04), t);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    if (vib) {
      // A wobble that dies with the note.
      const l = keep(ac.createOscillator()), lg = gain(ac, vib);
      l.frequency.value = vibF;
      lg.gain.setValueAtTime(vib, t);
      lg.gain.exponentialRampToValueAtTime(0.5, t + dur);
      l.connect(lg).connect(o.frequency);
      l.start(t); l.stop(t + dur + 0.05);
    }
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(lvl, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(pn).connect(kit.out);
    o.start(t); o.stop(t + dur + 0.05);
  }

  return {
    get busy() { return nodes.size > 0; },
    update() {},
    // A wet squelch; k from a light press to a full squeeze.
    squish(k = 1) {
      const ac = live(); if (!ac) return;
      burst(ac, { f: 700, f1: 220, q: 3, dur: 0.12 + 0.2 * k, lvl: 0.12 + 0.2 * k, atk: 0.02 });
      tone(ac, { f: 170, f1: 85, dur: 0.15 + 0.15 * k, lvl: 0.12 + 0.12 * k });
    },
    // The spring back: a rising wobble.
    boing(k = 1) {
      const ac = live(); if (!ac) return;
      tone(ac, { f: 120 + 30 * k, f1: 260 + 80 * k, dur: 0.35 + 0.25 * k, lvl: 0.1 + 0.12 * k, vib: 30 * k, vibF: 16, type: 'triangle' });
    },
    // The knife, the split, then juice raining down.
    slice() {
      const ac = live(); if (!ac) return;
      burst(ac, { f: 2600, f1: 7500, q: 1.4, dur: 0.14, lvl: 0.25, type: 'bandpass', atk: 0.03 });
      burst(ac, { f: 900, f1: 300, q: 2, dur: 0.16, lvl: 0.3, at: 0.06 });
      tone(ac, { f: 240, f1: 110, dur: 0.12, lvl: 0.15, at: 0.06 });
      for (let i = 0; i < 14; i++) {
        const at = 0.35 + Math.random() * 0.7;
        burst(ac, { f: 1800 + Math.random() * 2500, q: 6, dur: 0.035, lvl: 0.05 + Math.random() * 0.05, at, p: Math.random() * 1.6 - 0.8, atk: 0.002 });
      }
    },
    // A seed or an aril lands: a small wet tick, louder for a harder fall.
    tick(v = 1) {
      const ac = live(); if (!ac) return;
      const k = Math.min(1, v / 3);
      burst(ac, { f: 2800 + Math.random() * 2400, q: 5, dur: 0.03, lvl: 0.03 + 0.06 * k, p: Math.random() * 1.2 - 0.6, atk: 0.001 });
    },
    // The halves meet: a soft thunk.
    join(at = 0) {
      const ac = live(); if (!ac) return;
      tone(ac, { f: 140, f1: 60, dur: 0.18, lvl: 0.28, at });
      burst(ac, { f: 400, q: 1.2, dur: 0.07, lvl: 0.18, at, type: 'lowpass' });
    },
    rest() { kit.rest(() => nodes.size === 0); },
    // A hidden tab stops every sound at once.
    hide() {
      for (const n of nodes) { try { n.stop(); } catch { /* not started */ } }
      nodes.clear();
    },
  };
}
