// Spillway sound: roar, trickle, gate motor and clank, drips.
// Raw Web Audio on the shared kit; muted until the toy's sound is on.
import { sound } from '../shared/stim.js';

const pan = x => Math.max(-0.9, Math.min(0.9, x / 24));
const jit = (v, k) => v * (1 + (Math.random() * 2 - 1) * k);

// Noise that loops without a seam: brown for the rumble, white for the hiss.
function noise(ac, seconds, brown) {
  const n = Math.round(ac.sampleRate * seconds), b = ac.createBuffer(1, n, ac.sampleRate), d = b.getChannelData(0);
  let last = 0;
  for (let i = 0; i < n; i++) {
    const w = Math.random() * 2 - 1;
    d[i] = brown ? (last = (last + 0.02 * w) / 1.02) * 3.5 : w;
  }
  // A short crossfade hides the loop point.
  const f = Math.round(ac.sampleRate * 0.05);
  for (let i = 0; i < f; i++) d[n - f + i] = d[n - f + i] * (1 - i / f) + d[i] * (i / f);
  return b;
}

export function spillwaySound(kit) {
  let v = null, bufs = null, lastT = performance.now(), wantOn = false;
  // The context, only once a gesture has made it and sound is on.
  const ctx = () => (sound.on && kit.ac ? kit.wake() : null);

  function filt(ac, type, f, q) { const n = ac.createBiquadFilter(); n.type = type; n.frequency.value = f; n.Q.value = q; return n; }
  function gain(ac, g = 0) { const n = ac.createGain(); n.gain.value = g; return n; }

  function build(ac) {
    bufs ||= { brown: noise(ac, 4.3, true), white: noise(ac, 3.7, false) };
    const out = kit.out;
    const sA = ac.createBufferSource(), sB = ac.createBufferSource();
    sA.buffer = bufs.brown; sB.buffer = bufs.white; sA.loop = sB.loop = true;
    const p = ac.createStereoPanner();
    p.connect(out);
    const rumble = gain(ac), hiss = gain(ac), spray = gain(ac), trickle = gain(ac);
    sA.connect(filt(ac, 'lowpass', 240, 0.6)).connect(rumble).connect(p);
    const band = filt(ac, 'bandpass', 950, 0.5);
    sB.connect(band).connect(hiss).connect(p);
    sB.connect(filt(ac, 'highpass', 4200, 0.5)).connect(spray).connect(p);
    const tb = filt(ac, 'bandpass', 2600, 2.5);
    sB.connect(tb).connect(trickle).connect(p);
    // The gate motor: two low tones through a dull filter.
    const mp = ac.createStereoPanner(), motor = gain(ac), mf = filt(ac, 'lowpass', 280, 1.2);
    const o1 = ac.createOscillator(), o2 = ac.createOscillator();
    o1.type = 'sawtooth'; o1.frequency.value = 47; o2.type = 'square'; o2.frequency.value = 94.6;
    o1.connect(mf); o2.connect(gain(ac, 0.3)).connect(mf);
    mf.connect(motor).connect(mp).connect(out);
    const t = ac.currentTime;
    [sA, sB, o1, o2].forEach(s => s.start(t));
    v = { sA, sB, o1, o2, p, mp, rumble, hiss, spray, trickle, motor, band, tb, all: [sA, sB, o1, o2] };
  }
  function stop() {
    if (!v) return;
    const ac = kit.ac, t = ac ? ac.currentTime : 0;
    for (const g of [v.rumble, v.hiss, v.spray, v.trickle, v.motor]) { g.gain.cancelScheduledValues(t); g.gain.setTargetAtTime(0, t, 0.08); }
    const dead = v;
    v = null;
    dead.all.forEach(s => { try { s.stop(t + 0.5); } catch { /* already stopped */ } });
    setTimeout(() => [dead.p, dead.mp].forEach(n => n.disconnect()), 700);
  }
  // A short tone that falls in pitch: drips and trickle plinks.
  function plink(ac, x, f, level, decay) {
    const t = ac.currentTime + Math.random() * 0.01;
    const o = ac.createOscillator(), g = gain(ac), p = ac.createStereoPanner();
    o.type = 'sine';
    o.frequency.setValueAtTime(f, t);
    o.frequency.exponentialRampToValueAtTime(f * 0.62, t + decay * 0.5);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(level, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
    p.pan.value = pan(x);
    o.connect(g).connect(p).connect(kit.out);
    o.start(t); o.stop(t + decay + 0.02);
    o.onended = () => p.disconnect();
  }
  const settle = () => kit.rest(() => !v);

  return {
    // Per frame: F is the mean flow, 0 to 1; k fades all at sleep.
    update({ F, cx, moving, trickle, k }) {
      const now = performance.now(), dt = Math.min(0.1, (now - lastT) / 1000);
      lastT = now;
      const need = (F > 0.0015 || moving || trickle > 0.0005) && k > 0.01;
      if (!need) { if (wantOn) { wantOn = false; stop(); settle(); } return; }
      const ac = kit.live();
      if (!ac) { if (v) stop(); return; }
      if (!v) build(ac);
      wantOn = true;
      const t = ac.currentTime, set = (g, x, tc = 0.25) => g.gain.setTargetAtTime(x, t, tc);
      set(v.rumble, 0.95 * Math.pow(F, 0.7) * k);
      set(v.hiss, 0.42 * Math.pow(F, 0.9) * k);
      set(v.spray, 0.1 * F * k);
      const tr = Math.min(1, trickle * 14);
      set(v.trickle, 0.22 * tr * (0.45 + 0.55 * Math.random()) * k, 0.03);
      set(v.motor, moving ? 0.2 * k : 0, moving ? 0.08 : 0.15);
      v.band.frequency.setTargetAtTime(jit(900 + 500 * F, 0.15), t, 0.4);
      v.o1.frequency.setTargetAtTime(jit(47, 0.02), t, 0.3);
      v.p.pan.setTargetAtTime(pan(cx) * 0.6, t, 0.5);
      // Plinks: water that breaks on the face, as many as the trickle carries.
      if (tr > 0 && Math.random() < tr * 16 * dt) plink(ac, cx + (Math.random() - 0.5) * 6, jit(1300, 0.35), 0.05 * k, 0.09);
    },
    // A gate starts or stops: a heavy clank, panned to its bay.
    clank(x, starting) {
      const ac = ctx();
      if (!ac || !kit.out) return;
      const t = ac.currentTime + Math.random() * 0.015;
      const p = ac.createStereoPanner();
      p.pan.value = pan(x);
      p.connect(kit.out);
      if (v) v.mp.pan.setTargetAtTime(pan(x), t, 0.05);
      for (const [f, d, l] of [[jit(starting ? 168 : 142, 0.06), 0.55, 0.22], [jit(431, 0.05), 0.3, 0.08], [jit(1180, 0.08), 0.12, 0.03]]) {
        const o = ac.createOscillator(), g = gain(ac);
        o.frequency.value = f;
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(jit(l, 0.2), t + 0.003);
        g.gain.exponentialRampToValueAtTime(0.0001, t + d);
        o.connect(g).connect(p);
        o.start(t); o.stop(t + d + 0.02);
      }
      if (kit.noise) {
        const n = ac.createBufferSource(), g = gain(ac), bp = filt(ac, 'bandpass', jit(260, 0.1), 3);
        n.buffer = kit.noise;
        g.gain.setValueAtTime(jit(0.35, 0.2), t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
        n.connect(bp).connect(g).connect(p);
        n.start(t, Math.random() * 0.5); n.stop(t + 0.2);
      }
      setTimeout(() => p.disconnect(), 900);
      settle();
    },
    // A drip lands in the pool.
    drip(x, k) {
      const ac = ctx();
      if (!ac || !kit.out) return;
      plink(ac, x, jit(1500, 0.25), 0.07 * k, 0.22);
      settle();
    },
    rest() { if (v) stop(); wantOn = false; settle(); },
    hide() { if (v) stop(); wantOn = false; kit.ac?.suspend()?.catch(() => {}); },
  };
}
