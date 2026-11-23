// Dichroic glass sound in Web Audio. Muted by default; the kit holds the context.
// A leaf rings when the lamp crosses its face: one note per leaf.
// A rubbed-glass hum follows the lamp's speed; its pitch follows the colour.
// A coating change sets the glass down with a small clink.

const jit = (k = 0.1) => 1 + (Math.random() * 2 - 1) * k;
// Each leaf's step above the coating's root: a major triad.
const LEAF_STEPS = [0, 4, 7];

export function makeSound(kit) {
  let hall = null, hum = null;
  const live = new Set();

  // A small bright room: a noise burst that dies over 2.8 s.
  function makeHall(ac) {
    const len = Math.round(ac.sampleRate * 2.8);
    const ir = ac.createBuffer(2, len, ac.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = ir.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.4);
    }
    const cv = ac.createConvolver();
    cv.buffer = ir;
    const g = ac.createGain();
    g.gain.value = 0.36;
    cv.connect(g).connect(kit.out);
    return cv;
  }

  // One struck glass sound: partials as [ratio, level, decay in s].
  function strike(ac, { f0, parts, level, pan, at = 0 }) {
    hall ||= makeHall(ac);
    const t = ac.currentTime + at + Math.random() * 0.012;
    const p = ac.createStereoPanner();
    p.pan.value = Math.max(-0.9, Math.min(0.9, pan));
    const bus = ac.createGain();
    bus.gain.value = level * jit(0.12);
    bus.connect(p);
    p.connect(kit.out);
    p.connect(hall);
    for (const [ratio, amp, dec] of parts) {
      const o = ac.createOscillator();
      o.frequency.value = f0 * ratio * jit(0.003);
      const g = ac.createGain();
      const d = dec * jit(0.18);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(amp, t + 0.003);
      g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(g).connect(bus);
      o.start(t);
      o.stop(t + d + 0.05);
      live.add(o);
      o.onended = () => live.delete(o);
    }
  }

  // A leaf flips: k its index, root the coating's root, pan -1 to 1.
  function ring(k, root, pan, level = 1) {
    const ac = kit.live();
    if (!ac) return;
    const f0 = 880 * Math.pow(2, (root + LEAF_STEPS[k]) / 12) * jit(0.003);
    strike(ac, { f0, level: 0.075 * level, pan, parts: [[1, 1, 3.2], [2.32, 0.28, 1.4], [4.25, 0.12, 0.6], [6.8, 0.05, 0.25]] });
  }

  // The coating changes: the screen is lifted and set down.
  function clink(root) {
    const ac = kit.live();
    if (!ac) return;
    const f0 = 1760 * Math.pow(2, root / 12) * jit(0.01);
    strike(ac, { f0, level: 0.05, pan: (Math.random() - 0.5) * 0.3, parts: [[1, 0.6, 0.5], [1.51, 0.5, 0.35], [2.73, 0.3, 0.2]] });
    strike(ac, { f0: f0 * 0.5, level: 0.04, pan: 0, at: 0.09, parts: [[1, 1, 1.6], [2.32, 0.3, 0.7]] });
  }

  // Each lively frame: speed in units a second, lam the reflected band in nm.
  function frame({ speed, lam, pan }) {
    const ac = kit.live();
    if (!ac) return;
    const t = ac.currentTime;
    if (!hum) {
      hall ||= makeHall(ac);
      const g = ac.createGain();
      g.gain.value = 0;
      const p = ac.createStereoPanner();
      const lp = ac.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 2400;
      g.connect(lp).connect(p);
      p.connect(kit.out);
      p.connect(hall);
      // A rubbed rim: a sine, its beating twin, a soft third partial.
      const os = [[1, 1], [1.004, 0.7], [2.98, 0.12]].map(([r, a]) => {
        const o = ac.createOscillator();
        const og = ac.createGain();
        og.gain.value = a;
        o.connect(og).connect(g);
        o.start();
        return { o, r };
      });
      hum = { g, p, os };
    }
    // Long waves sing low, short waves high: 600 nm is A4.
    const f = 440 * Math.pow(2, (600 - lam) / 160);
    for (const { o, r } of hum.os) o.frequency.setTargetAtTime(f * r, t, 0.15);
    const v = Math.min(1, speed / 6);
    hum.g.gain.setTargetAtTime(0.05 * Math.sqrt(v), t, 0.12);
    hum.p.pan.setTargetAtTime(Math.max(-0.8, Math.min(0.8, pan)), t, 0.2);
  }

  // Fades the hum. cut: also stop rings that still sound.
  function quiet(cut = false) {
    const ac = kit.ac;
    if (!ac) return;
    const t = ac.currentTime;
    if (hum) {
      const h = hum;
      hum = null;
      h.g.gain.setTargetAtTime(0, t, 0.12);
      for (const { o } of h.os) { try { o.stop(t + 0.8); } catch { /* stopped already */ } }
    }
    if (cut) {
      for (const n of live) { try { n.stop(); } catch { /* not started */ } }
      live.clear();
    }
  }

  return { ring, clink, frame, quiet, get busy() { return live.size > 0; } };
}
