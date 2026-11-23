// Forge sound: the fire's roar, the bellows, the anvil's ring, the quench.
// Raw Web Audio on the shared kit; muted until the toy's sound is on.
import { sound } from '../shared/stim.js';

const jit = (v, k) => v * (1 + (Math.random() * 2 - 1) * k);
// The anvil's ring: inharmonic modes of a steel block.
const MODES = [[1, 1, 1.7], [2.31, 0.55, 1.15], [3.9, 0.42, 0.8], [5.6, 0.3, 0.5], [7.3, 0.18, 0.32]];

export function forgeSound(kit) {
  let v = null, level = 0;
  const live = () => (sound.on ? kit.live() : null);
  const gain = (ac, g = 0) => { const n = ac.createGain(); n.gain.value = g; return n; };
  const filt = (ac, type, f, q = 0.7) => { const n = ac.createBiquadFilter(); n.type = type; n.frequency.value = f; n.Q.value = q; return n; };
  const noise = (ac, rate = 1) => { const s = ac.createBufferSource(); s.buffer = kit.noise; s.loop = true; s.playbackRate.value = rate; return s; };
  const pan = (ac, p) => { const n = ac.createStereoPanner(); n.pan.value = Math.max(-1, Math.min(1, p)); return n; };

  // The beds: built when sound is first heard, torn down at rest.
  function start(ac) {
    if (v || !kit.noise) return;
    const out = gain(ac, 0);
    out.connect(kit.out);
    // The fire: a soft low roar that the blast opens up.
    const fS = noise(ac, 0.5), fF = filt(ac, 'lowpass', 260, 0.6), fG = gain(ac, 0), fP = pan(ac, -0.55);
    fS.connect(fF).connect(fG).connect(fP).connect(out);
    // The quench: a hiss over a deep rush, on the trough's side.
    const hS = noise(ac, 1.3), hF = filt(ac, 'highpass', 2400, 0.5), hG = gain(ac, 0), hP = pan(ac, 0.6);
    hS.connect(hF).connect(hG).connect(hP).connect(out);
    const rS = noise(ac, 0.6), rF = filt(ac, 'bandpass', 380, 0.7), rG = gain(ac, 0);
    rS.connect(rF).connect(rG).connect(hP);
    [fS, hS, rS].forEach(n => n.start(0, Math.random()));
    v = { out, fG, fF, hG, hF, rG, rF, hP, nodes: [fS, hS, rS] };
  }
  function stop() {
    if (!v) return;
    const n = v, ac = kit.ac;
    v = null;
    if (ac) {
      n.out.gain.setTargetAtTime(0, ac.currentTime, 0.12);
      n.nodes.forEach(o => { try { o.stop(ac.currentTime + 0.8); } catch { /* stopped */ } });
    }
    setTimeout(() => n.out.disconnect(), 1000);
  }
  // One short burst of filtered noise.
  function burst(ac, { f, q = 1, dur, lvl, type = 'bandpass', at = 0, rate = 1, p = 0, f1 = 0, atk = 0.004 }) {
    const t = ac.currentTime + at, s = ac.createBufferSource(), g = gain(ac), b = filt(ac, type, jit(f, 0.12), q), pn = pan(ac, p);
    s.buffer = kit.noise; s.playbackRate.value = jit(rate, 0.15);
    if (f1) b.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(jit(lvl, 0.15), t + atk);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(b).connect(g).connect(pn).connect(kit.out);
    s.start(t, Math.random() * 0.5, dur + 0.05);
    s.onended = () => pn.disconnect();
  }
  // A sine with a fall in pitch: thuds, knocks, bubbles.
  function knock(ac, f, dur, lvl, { at = 0, p = 0, drop = 0.5, type = 'sine' } = {}) {
    const t = ac.currentTime + at, o = ac.createOscillator(), g = gain(ac), pn = pan(ac, p);
    o.type = type;
    o.frequency.setValueAtTime(jit(f, 0.06), t);
    o.frequency.exponentialRampToValueAtTime(f * drop, t + dur);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(jit(lvl, 0.15), t + 0.003);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(pn).connect(kit.out);
    o.start(t); o.stop(t + dur + 0.05);
    o.onended = () => pn.disconnect();
  }
  // A bank of decaying sines: the anvil and the bar ring.
  function ring(ac, f0, lvl, decay, p, bright = 1) {
    const t = ac.currentTime, pn = pan(ac, p), bus = gain(ac, 1);
    bus.connect(pn).connect(kit.out);
    let end = 0;
    for (const [r, a, d] of MODES) {
      const o = ac.createOscillator(), g = gain(ac);
      o.frequency.value = jit(f0 * r, 0.004);
      const dd = d * decay * (r > 3 ? bright : 1);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(lvl * a * (r > 3 ? bright : 1), t + 0.002);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dd);
      o.connect(g).connect(bus);
      o.start(t); o.stop(t + dd + 0.05);
      end = Math.max(end, dd);
    }
    setTimeout(() => pn.disconnect(), (end + 0.3) * 1000);
  }

  return {
    // s: fire (0 to 1), steam (0 to 1), boil (0 to 1).
    update(dt, s) {
      const act = s.fire > 0.05 || s.steam > 0.01 || s.boil > 0.02;
      level = act ? Math.min(1, level + dt * 4) : Math.max(0, level - dt * 0.6);
      const ac = live();
      if (!ac) { if (v && !sound.on) stop(); return; }
      if (level <= 0) { if (v) { stop(); kit.rest(() => !v && level <= 0); } return; }
      start(ac);
      const t = ac.currentTime;
      v.out.gain.setTargetAtTime(level, t, 0.08);
      v.fG.gain.setTargetAtTime(0.06 + 0.3 * s.fire * s.fire, t, 0.12);
      v.fF.frequency.setTargetAtTime(180 + 700 * s.fire, t, 0.15);
      const st = Math.min(1, s.steam);
      v.hG.gain.setTargetAtTime(0.42 * st, t, st > 0.3 ? 0.03 : 0.2);
      v.hF.frequency.setTargetAtTime(1600 + 2400 * st, t, 0.1);
      v.rG.gain.setTargetAtTime(0.5 * st, t, 0.05);
      v.rF.frequency.setTargetAtTime(220 + 500 * st, t, 0.1);
      // The coals tick and crack as they burn.
      if (Math.random() < (0.5 + 6 * s.fire) * dt) burst(ac, { f: 3800, q: 2, dur: 0.02, lvl: 0.05 + 0.08 * s.fire, p: -0.55 + (Math.random() - 0.5) * 0.2, rate: 1.6 });
      // Boiling water: bubbles burst and gulp under the hiss.
      if (Math.random() < s.boil * 40 * dt) knock(ac, 200 + Math.random() * 500, 0.05 + Math.random() * 0.06, 0.08 * s.boil, { p: 0.6, drop: 1.6 });
    },
    // One stroke of the bellows: a whoosh through the tuyere, a creak, a knock.
    pump(k = 1) {
      const ac = live();
      if (!ac) return;
      burst(ac, { f: 900, q: 0.8, dur: 0.55, lvl: 0.22 * k, f1: 320, p: -0.8, atk: 0.09 });
      burst(ac, { f: 240, q: 4, dur: 0.18, lvl: 0.07, at: 0.02, p: -0.85, rate: 0.4 });
      knock(ac, 110, 0.08, 0.06, { at: 0.3, p: -0.85, drop: 0.7 });
    },
    // A blow. heat in C; soft 0 cold to 1 yellow; weight 0.5 to 2 kg.
    blow(heat, soft, weight, p) {
      const ac = live();
      if (!ac) return;
      const hard = 1 - soft;
      // The strike: a click, then the thud of soft steel taking the blow.
      burst(ac, { f: 5200, q: 0.7, dur: 0.012, lvl: 0.35, type: 'highpass', p });
      knock(ac, 150 / Math.sqrt(weight), 0.11 + 0.06 * soft, 0.25 + 0.3 * soft, { p, drop: 0.6 });
      // The anvil rings: bright on cold steel, damped when the bar is hot.
      ring(ac, jit(780, 0.01), 0.09 + 0.12 * hard, 0.35 + 0.75 * hard, p, 0.5 + 0.5 * hard);
      // Cold steel rings back itself, high and short.
      if (hard > 0.6) ring(ac, jit(2350, 0.02), 0.05 * hard, 0.25, p, 1);
      // Scale bursts off hot steel with a dry crackle.
      if (heat > 800) for (let i = 0; i < 5; i++) burst(ac, { f: 3000 + Math.random() * 3000, q: 1.5, dur: 0.02, lvl: 0.06, at: 0.01 + Math.random() * 0.12, p: p + (Math.random() - 0.5) * 0.4 });
    },
    // The bar meets the water: a slap, then the roar from update().
    plunge(heat) {
      const ac = live();
      if (!ac) return;
      burst(ac, { f: 700, q: 0.6, dur: 0.25, lvl: 0.25, type: 'lowpass', p: 0.6 });
      if (heat > 300) burst(ac, { f: 3000, q: 0.5, dur: 0.5, lvl: 0.3, type: 'highpass', p: 0.6, atk: 0.01 });
      knock(ac, 90, 0.2, 0.18, { p: 0.6, drop: 0.6 });
    },
    // Iron on iron: the bar set down on the anvil, or lifted.
    clink(p, k = 1) {
      const ac = live();
      if (!ac) return;
      ring(ac, jit(1900, 0.03), 0.04 * k, 0.12, p, 1);
      burst(ac, { f: 4200, q: 1.2, dur: 0.015, lvl: 0.08 * k, p });
    },
    // A new bar laid on the coals.
    lay() {
      const ac = live();
      if (!ac) return;
      burst(ac, { f: 1800, q: 0.6, dur: 0.25, lvl: 0.12, p: -0.5 });
      ring(ac, jit(1300, 0.03), 0.035, 0.2, -0.5, 1);
    },
    get busy() { return level > 0; },
    rest() { level = 0; stop(); kit.rest(() => !v); },
    hide() { level = 0; stop(); kit.ac?.suspend()?.catch(() => {}); },
  };
}
