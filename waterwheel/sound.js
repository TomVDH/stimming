// Water wheel sound: pour, splash, gurgle, knock and creak.
// Raw Web Audio on the shared kit; muted until the toy's sound is on.
import { sound } from '../shared/stim.js';

const jit = (v, k) => v * (1 + (Math.random() * 2 - 1) * k);

// Noise that loops without a seam.
function noise(ac, seconds, brown) {
  const n = Math.round(ac.sampleRate * seconds), b = ac.createBuffer(1, n, ac.sampleRate), d = b.getChannelData(0);
  let last = 0;
  for (let i = 0; i < n; i++) {
    const w = Math.random() * 2 - 1;
    d[i] = brown ? (last = (last + 0.02 * w) / 1.02) * 3.5 : w;
  }
  const f = Math.round(ac.sampleRate * 0.05);
  for (let i = 0; i < f; i++) d[n - f + i] = d[n - f + i] * (1 - i / f) + d[i] * (i / f);
  return b;
}

export function wheelSound(kit) {
  let v = null, bufs = null, wantOn = false, span = { c: 0, h: 6 };
  const ctx = () => (sound.on && kit.ac ? kit.live() : null);
  const pan = x => Math.max(-0.85, Math.min(0.85, (x - span.c) / span.h));
  const filt = (ac, type, f, q) => { const n = ac.createBiquadFilter(); n.type = type; n.frequency.value = f; n.Q.value = q; return n; };
  const gain = (ac, g = 0) => { const n = ac.createGain(); n.gain.value = g; return n; };

  // Three beds: the pour stream, the run in the flumes, the splash where water lands.
  function build(ac) {
    bufs ||= { brown: noise(ac, 4.3, true), white: noise(ac, 3.7, false) };
    const out = kit.out;
    const sA = ac.createBufferSource(), sB = ac.createBufferSource();
    sA.buffer = bufs.brown; sB.buffer = bufs.white; sA.loop = sB.loop = true;
    const pp = ac.createStereoPanner(), sp = ac.createStereoPanner();
    pp.connect(out); sp.connect(out);
    const pour = gain(ac), run = gain(ac), splash = gain(ac), low = gain(ac);
    const pf = filt(ac, 'bandpass', 2400, 0.7);
    sB.connect(pf).connect(pour).connect(pp);
    const rf = filt(ac, 'bandpass', 620, 1.4);
    sB.connect(rf).connect(run).connect(out);
    const sf = filt(ac, 'bandpass', 1500, 0.6);
    sB.connect(sf).connect(splash).connect(sp);
    sA.connect(filt(ac, 'lowpass', 300, 0.7)).connect(low).connect(sp);
    const t = ac.currentTime;
    sA.start(t, Math.random() * 3); sB.start(t, Math.random() * 3);
    v = { sA, sB, pp, sp, pour, run, splash, low, rf, sf };
  }
  function stop() {
    if (!v) return;
    const ac = kit.ac, t = ac ? ac.currentTime : 0;
    for (const g of [v.pour, v.run, v.splash, v.low]) { g.gain.cancelScheduledValues(t); g.gain.setTargetAtTime(0, t, 0.08); }
    const dead = v;
    v = null;
    [dead.sA, dead.sB].forEach(s => { try { s.stop(t + 0.5); } catch { /* already stopped */ } });
    setTimeout(() => [dead.pp, dead.sp].forEach(n => n.disconnect()), 700);
  }
  // A bubble in the flume: a short sine that rises in pitch.
  function bubble(ac, x, level) {
    const t = ac.currentTime + Math.random() * 0.02, f = jit(520, 0.4), d = jit(0.07, 0.3);
    const o = ac.createOscillator(), g = gain(ac), p = ac.createStereoPanner();
    o.frequency.setValueAtTime(f, t);
    o.frequency.exponentialRampToValueAtTime(f * 1.7, t + d);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(level, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    p.pan.value = pan(x);
    o.connect(g).connect(p).connect(kit.out);
    o.start(t); o.stop(t + d + 0.02);
    o.onended = () => p.disconnect();
  }
  // An arm passes the top: a dull wooden knock, lower on a big wheel.
  function knock(ac, x, w, R) {
    const t = ac.currentTime + Math.random() * 0.012, k = Math.min(1, w / 0.9);
    const p = ac.createStereoPanner();
    p.pan.value = pan(x);
    p.connect(kit.out);
    const o = ac.createOscillator(), g = gain(ac);
    o.frequency.value = jit(260 / R, 0.06);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(jit(0.12, 0.25) * k, t + 0.003);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
    o.connect(g).connect(p);
    o.start(t); o.stop(t + 0.18);
    if (kit.noise) {
      const n = ac.createBufferSource(), ng = gain(ac), bp = filt(ac, 'bandpass', jit(900 / R, 0.1), 4);
      n.buffer = kit.noise;
      ng.gain.setValueAtTime(jit(0.22, 0.2) * k, t);
      ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
      n.connect(bp).connect(ng).connect(p);
      n.start(t, Math.random() * 0.5); n.stop(t + 0.08);
    }
    setTimeout(() => p.disconnect(), 400);
  }
  // A creak: stick-slip pulses through a wooden resonance, with a slow glide.
  function creak(ac, x, w, R) {
    const t = ac.currentTime + Math.random() * 0.05, d = jit(0.45, 0.35), k = Math.min(1, 0.3 + w);
    const o = ac.createOscillator(), g = gain(ac), p = ac.createStereoPanner();
    const bp = filt(ac, 'bandpass', jit(780 / Math.sqrt(R), 0.15), 9);
    o.type = 'square';
    const f0 = jit(34, 0.2);
    o.frequency.setValueAtTime(f0, t);
    o.frequency.linearRampToValueAtTime(f0 * jit(1.5, 0.2), t + d * 0.6);
    o.frequency.linearRampToValueAtTime(f0 * 0.9, t + d);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.05 * k, t + d * 0.25);
    g.gain.linearRampToValueAtTime(0.035 * k, t + d * 0.7);
    g.gain.linearRampToValueAtTime(0, t + d);
    p.pan.value = pan(x);
    o.connect(bp).connect(g).connect(p).connect(kit.out);
    o.start(t); o.stop(t + d + 0.02);
    o.onended = () => p.disconnect();
  }
  const settle = () => kit.rest(() => !v);
  const creakT = new Map();

  return {
    // Per frame: read the sim's events, then clear them.
    update(sim, dt) {
      const ev = sim.ev, E = sim.L?.edge;
      if (E) span = { c: (E.left + E.right) / 2, h: (E.right - E.left) / 2 };
      const splashes = ev.splash, knocks = ev.knock, flumeN = ev.flume;
      ev.splash = []; ev.spill = []; ev.knock = [];
      const turning = sim.wheels.some(w => Math.abs(w.w) > 0.05);
      const need = sim.pour.gate > 0.01 || flumeN > 0 || splashes.length > 0 || turning;
      if (!need) { if (wantOn) { wantOn = false; stop(); settle(); } return; }
      const ac = ctx();
      if (!ac || !kit.out) { if (v) stop(); return; }
      if (!v) build(ac);
      wantOn = true;
      const t = ac.currentTime, set = (g, x, tc = 0.2) => g.gain.setTargetAtTime(x, t, tc);
      set(v.pour, 0.16 * sim.pour.gate * (0.4 + 0.6 * sim.pour.rate / 220), 0.05);
      v.pp.pan.setTargetAtTime(pan(sim.pour.x), t, 0.05);
      const run = Math.min(1, Math.sqrt(flumeN / 900));
      set(v.run, 0.2 * run, 0.3);
      v.rf.frequency.setTargetAtTime(jit(560 + 240 * run, 0.12), t, 0.25);
      // Splash: loudness follows the landings this frame, panned to their middle.
      let sx = 0, s = 0;
      for (const [x, k] of splashes) { sx += x * k; s += k; }
      const rate = s / Math.max(dt, 1 / 120);
      const lvl = Math.min(1, Math.sqrt(rate / 260));
      set(v.splash, 0.2 * lvl, 0.12);
      set(v.low, 0.35 * lvl, 0.2);
      if (s > 0) v.sp.pan.setTargetAtTime(pan(sx / s), t, 0.15);
      v.sf.frequency.setTargetAtTime(jit(1300 + 700 * lvl, 0.2), t, 0.1);
      // Bubbles: as many as the flumes carry.
      if (run > 0 && Math.random() < run * 22 * dt) {
        const f = sim.P.n ? (Math.random() * sim.P.n) | 0 : 0;
        bubble(ac, sim.P.x[f] || span.c, 0.035 * run);
      }
      for (const [x, w, R] of knocks) knock(ac, x, w, R);
      // Each turning wheel creaks now and then, more often when it turns fast.
      for (const w of sim.wheels) {
        const a = Math.abs(w.w);
        const next = creakT.get(w) ?? 0;
        if (a > 0.08 && t > next) {
          creak(ac, w.cx, a, w.R);
          creakT.set(w, t + jit(2.6 / Math.min(2, 0.4 + a), 0.4));
        }
      }
    },
    gate() { ctx(); },
    rest() { if (v) stop(); wantOn = false; settle(); },
    hide() { if (v) stop(); wantOn = false; kit.ac?.suspend()?.catch(() => {}); },
  };
}
