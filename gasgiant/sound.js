// Gas giant dive sound: wind, buffets, a pressure hum, and thunder late by distance.
// Sound in hydrogen at 5 bar runs at about 1.2 km/s, so thunder comes slowly.
// Raw Web Audio on the shared kit; muted until the toy's sound is on.
import { sound } from '../shared/stim.js';

export const C_SOUND = 1.2;
const jit = (v, k) => v * (1 + (Math.random() * 2 - 1) * k);

export function diveSound(kit) {
  const pending = new Set();
  let bed = null, buffT = 0;
  const live = () => (sound.on ? kit.live() : null);
  const gain = (ac, g = 0) => { const n = ac.createGain(); n.gain.value = g; return n; };
  const filt = (ac, type, f, q = 0.7) => { const n = ac.createBiquadFilter(); n.type = type; n.frequency.value = f; n.Q.value = q; return n; };
  function track(src, tail) {
    pending.add(src);
    src.onended = () => { pending.delete(src); tail.disconnect(); };
  }
  function burst(ac, { at, f, q = 0.7, level, attack, decay, rate = 1, pan = 0 }) {
    const t = ac.currentTime + at, s = ac.createBufferSource(), g = gain(ac), lp = filt(ac, 'lowpass', f, q);
    const p = ac.createStereoPanner();
    p.pan.value = Math.max(-0.8, Math.min(0.8, pan));
    p.connect(kit.out);
    s.buffer = kit.noise; s.loop = true; s.playbackRate.value = jit(rate, 0.12);
    s.connect(lp).connect(g).connect(p);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(level, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
    s.start(t, Math.random() * 0.5);
    s.stop(t + attack + decay + 0.05);
    track(s, p);
  }
  // The bed: wind noise through a low-pass that falls with pressure, and a low hum.
  function startBed(ac) {
    if (bed || !kit.noise) return;
    const s = ac.createBufferSource();
    s.buffer = kit.noise; s.loop = true; s.playbackRate.value = 0.6;
    const lp = filt(ac, 'lowpass', 900, 0.6), bp = filt(ac, 'bandpass', 300, 0.5);
    const o = ac.createOscillator();
    o.type = 'sine'; o.frequency.value = 30;
    const gW = gain(ac), gO = gain(ac), out = gain(ac, 1);
    s.connect(lp).connect(bp).connect(gW).connect(out);
    o.connect(gO).connect(out);
    out.connect(kit.out);
    s.start(); o.start();
    bed = { s, o, lp, bp, gW, gO, out };
  }
  function stopBed() {
    if (!bed) return;
    const b = bed, ac = kit.ac;
    bed = null;
    if (ac) {
      b.out.gain.setTargetAtTime(0, ac.currentTime, 0.2);
      try { b.s.stop(ac.currentTime + 1); b.o.stop(ac.currentTime + 1); } catch { /* stopped */ }
    }
    setTimeout(() => b.out.disconnect(), 1200);
  }
  function cancel() {
    for (const s of pending) { try { s.stop(); } catch { /* not started */ } }
    pending.clear();
  }
  return {
    // Each frame: the fall speed in km/s, the depth 0 to 1, and whether the hand dives.
    update(dt, speed, depth, diving) {
      const ac = live();
      if (!ac) { if (bed) stopBed(); return; }
      const loud = Math.min(1, speed / 7);
      if (loud > 0.01 || diving) startBed(ac);
      if (!bed) return;
      const t = ac.currentTime;
      // Thick air sounds darker: the cut-off falls as the pressure grows.
      bed.lp.frequency.setTargetAtTime(1400 * Math.exp(-2.6 * depth) + 90, t, 0.3);
      bed.bp.frequency.setTargetAtTime(420 * Math.exp(-1.6 * depth) + 60, t, 0.3);
      bed.gW.gain.setTargetAtTime(0.5 * loud, t, 0.25);
      bed.o.frequency.setTargetAtTime(26 + 26 * depth, t, 0.5);
      bed.gO.gain.setTargetAtTime(0.12 * depth * (0.4 + 0.6 * loud), t, 0.5);
      if (diving && loud > 0.15) {
        buffT -= dt;
        if (buffT <= 0) {
          buffT = 0.25 + Math.random() * 0.9;
          burst(ac, { at: 0, f: 160 + 200 * (1 - depth), level: 0.25 * loud, attack: 0.02, decay: 0.35, rate: 0.5, pan: Math.random() * 1.2 - 0.6 });
        }
      }
    },
    // Thunder from a flash dist km away, late by the speed of sound in hydrogen.
    thunder(dist, level, pan) {
      const ac = live();
      if (!ac || dist > 45) return;
      const at = dist / C_SOUND, near = Math.max(0, 1 - dist / 45);
      if (dist < 12) burst(ac, { at, f: 2400, level: 0.3 * level * near, attack: 0.005, decay: 0.25, pan });
      burst(ac, { at: at + 0.03, f: 120 + 260 * near, q: 0.9, level: 0.6 * level * (0.3 + 0.7 * near), attack: 0.08, decay: jit(4.5, 0.3), rate: 0.4, pan });
      burst(ac, { at: at + jit(0.6, 0.4), f: 90, level: 0.35 * level * near, attack: 0.3, decay: jit(3, 0.3), rate: 0.3, pan: -pan * 0.5 });
    },
    // Thunder still on its way keeps the context awake.
    get busy() { return pending.size > 0; },
    cancel,
    hide() { cancel(); stopBed(); },
    rest() { stopBed(); kit.rest(() => pending.size === 0); },
  };
}
