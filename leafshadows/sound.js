// Leaf shadows sound in Web Audio. Muted by default; the kit holds the context.
// Leaves rustle left and right with the gusts in the crown.
// Leaf ticks come faster as the leaves flutter; a low breath sits under them.
// A gust swells from the left and runs to the right. No two ticks are alike.
import { windAt } from './tree.js';

const jit = (k = 0.1) => 1 + (Math.random() * 2 - 1) * k;

export function makeSound(kit) {
  let bed = null, tickDebt = 0;
  const live = new Set();

  function voice(ac, pan = 0) {
    const g = ac.createGain();
    g.gain.value = 0;
    const p = ac.createStereoPanner();
    p.pan.value = Math.max(-1, Math.min(1, pan));
    g.connect(p).connect(kit.out);
    return { g, p };
  }
  const noiseSrc = (ac, loop = true) => {
    const s = ac.createBufferSource();
    s.buffer = kit.noise;
    s.loop = loop;
    return s;
  };
  function band(ac, pan, f, q, type = 'bandpass') {
    const s = noiseSrc(ac);
    const fl = ac.createBiquadFilter();
    fl.type = type;
    fl.frequency.value = f;
    fl.Q.value = q;
    const v = voice(ac, pan);
    s.connect(fl).connect(v.g);
    s.start(0, Math.random() * 0.9);
    return { s, fl, g: v.g };
  }

  // The bed starts on the first live frame.
  function startBed(ac) {
    bed = {
      // The crown to the left is denser: its rustle is fuller.
      left: band(ac, -0.55, 3000, 0.55),
      right: band(ac, 0.45, 3600, 0.7),
      // The shimmer: fine dry grains of many small leaves.
      hiss: band(ac, -0.1, 7000, 0.4, 'highpass'),
      // The breath: air moving, low and soft.
      breath: band(ac, 0, 300, 0.7, 'lowpass'),
    };
  }

  // One leaf tick: a short click of noise, never the same twice.
  function tick(ac, t, level, pan) {
    const s = noiseSrc(ac, false);
    const fl = ac.createBiquadFilter();
    fl.type = 'bandpass';
    fl.frequency.value = 1800 + Math.random() * 4500;
    fl.Q.value = 1.2 + Math.random() * 2;
    const v = voice(ac, pan);
    const len = 0.004 + Math.random() * 0.014;
    v.g.gain.setValueAtTime(0, t);
    v.g.gain.linearRampToValueAtTime(level, t + 0.001);
    v.g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    s.connect(fl).connect(v.g);
    s.start(t, Math.random() * 0.95);
    s.stop(t + len + 0.02);
    live.add(s);
    s.onended = () => live.delete(s);
  }

  // Each frame: the bed follows the wind in the left and right halves of the view.
  function frame({ breeze, mean, fronts, view, g }) {
    const ac = kit.live();
    if (!ac || !kit.noise) return;
    if (!bed) startBed(ac);
    const t = ac.currentTime;
    const wl = Math.min(1.5, windAt(view.x + view.w * 0.2, breeze, g, fronts));
    const wr = Math.min(1.5, windAt(view.x + view.w * 0.8, breeze, g, fronts));
    const m = Math.min(1.5, mean);
    bed.left.g.gain.setTargetAtTime(0.55 * Math.pow(wl, 1.3) + 0.04 * Math.sqrt(wl), t, 0.2);
    bed.left.fl.frequency.setTargetAtTime(2200 + 1600 * Math.min(1, wl), t, 0.3);
    bed.right.g.gain.setTargetAtTime(0.4 * Math.pow(wr, 1.3) + 0.03 * Math.sqrt(wr), t, 0.2);
    bed.right.fl.frequency.setTargetAtTime(2600 + 1600 * Math.min(1, wr), t, 0.3);
    bed.hiss.g.gain.setTargetAtTime(0.05 * Math.pow(m, 1.5) * (0.6 + 0.8 * Math.random()), t, 0.05);
    bed.breath.g.gain.setTargetAtTime(0.3 * Math.pow(m, 1.5), t, 0.5);
    bed.breath.fl.frequency.setTargetAtTime(220 + 360 * Math.min(1, m), t, 0.6);
    // Ticks: about 45 a second in a strong gust, none in still air.
    tickDebt += 45 * Math.pow(Math.min(1, m), 1.6) / 30;
    let n = 0;
    while (tickDebt >= 1 && n < 4) {
      tickDebt -= Math.random() < 0.5 ? 1 : 0.6;
      tick(ac, t + Math.random() * 0.03, 0.04 + 0.08 * Math.random() * Math.min(1, m), Math.random() * 1.4 - 0.75);
      n++;
    }
    if (tickDebt > 3) tickDebt = 0;
  }

  // A gust heard coming: a swell that pans across from where it starts.
  function gust({ a, pan }) {
    const ac = kit.live();
    if (!ac || !kit.noise) return;
    const t = ac.currentTime;
    const s = noiseSrc(ac, false);
    const fl = ac.createBiquadFilter();
    fl.type = 'bandpass';
    fl.Q.value = 0.8;
    fl.frequency.setValueAtTime(500 * jit(0.2), t);
    fl.frequency.exponentialRampToValueAtTime(1900 * jit(0.2), t + 0.9);
    fl.frequency.exponentialRampToValueAtTime(700, t + 3.2);
    const v = voice(ac, pan);
    v.p.pan.setValueAtTime(Math.max(-1, pan), t);
    v.p.pan.linearRampToValueAtTime(0.85, t + 2.8);
    v.g.gain.setValueAtTime(0, t);
    v.g.gain.linearRampToValueAtTime(0.42 * a * jit(0.15), t + 0.45);
    v.g.gain.exponentialRampToValueAtTime(0.0001, t + 3.4);
    s.connect(fl).connect(v.g);
    // The noise buffer is one second long: loop it under the swell.
    s.loop = true;
    s.start(t, Math.random() * 0.9);
    s.stop(t + 3.5);
    live.add(s);
    s.onended = () => live.delete(s);
  }

  // Fades the bed and stops its nodes. cut: also stop a gust in flight.
  function quiet(cut = false) {
    const ac = kit.ac;
    if (!ac) return;
    const t = ac.currentTime;
    if (bed) {
      const b = bed;
      bed = null;
      for (const x of Object.values(b)) {
        x.g.gain.setTargetAtTime(0, t, 0.15);
        try { x.s.stop(t + 0.8); } catch { /* stopped already */ }
      }
    }
    if (cut) {
      for (const n of live) { try { n.stop(); } catch { /* not started */ } }
      live.clear();
    }
  }

  return { frame, gust, quiet, get busy() { return live.size > 0; } };
}
