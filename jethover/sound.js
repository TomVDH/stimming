// Jet hover sound: turbine whine, jet roar, the low rumble and reheat crackle.
// Raw Web Audio on the shared kit; muted until the toy's sound is on.
import { sound } from '../shared/stim.js';

const jit = (v, k) => v * (1 + (Math.random() * 2 - 1) * k);

export function jetSound(kit) {
  let v = null, level = 0;
  const live = () => (sound.on ? kit.live() : null);
  const gain = (ac, g = 0) => { const n = ac.createGain(); n.gain.value = g; return n; };
  const filt = (ac, type, f, q = 0.7) => { const n = ac.createBiquadFilter(); n.type = type; n.frequency.value = f; n.Q.value = q; return n; };

  // One engine voice: built when sound is first heard, torn down at rest.
  function start(ac) {
    if (v || !kit.noise) return;
    const out = gain(ac, 0), pan = ac.createStereoPanner();
    out.connect(pan).connect(kit.out);
    const src = ac.createBufferSource();
    src.buffer = kit.noise; src.loop = true;
    // Roar: broadband noise, brighter with power.
    const roarF = filt(ac, 'lowpass', 600, 0.4), roarG = gain(ac);
    src.connect(roarF).connect(roarG).connect(out);
    // Rumble: the ground shakes under the jet.
    const src2 = ac.createBufferSource();
    src2.buffer = kit.noise; src2.loop = true; src2.playbackRate.value = 0.37;
    const rumF = filt(ac, 'lowpass', 120, 0.9), rumG = gain(ac);
    src2.connect(rumF).connect(rumG).connect(out);
    // Hiss: the hot jet tears the air.
    const hisF = filt(ac, 'bandpass', 3200, 0.6), hisG = gain(ac);
    src.connect(hisF).connect(hisG).connect(out);
    // Whine: two inharmonic turbine tones and a fan buzz.
    const w1 = ac.createOscillator(), w2 = ac.createOscillator(), fan = ac.createOscillator();
    w1.type = 'sine'; w2.type = 'sine'; fan.type = 'sawtooth';
    const wG = gain(ac), fanF = filt(ac, 'bandpass', 900, 3), fanG = gain(ac);
    w1.connect(wG); w2.connect(wG); wG.connect(out);
    fan.connect(fanF).connect(fanG).connect(out);
    // A slow wobble: the tones beat as the spools hunt.
    const lfo = ac.createOscillator(), lfoG = gain(ac, 9);
    lfo.frequency.value = 0.7; lfo.connect(lfoG).connect(w1.frequency);
    [src, src2, w1, w2, fan, lfo].forEach(n => n.start());
    v = { out, pan, src, src2, roarF, roarG, rumF, rumG, hisF, hisG, w1, w2, wG, fan, fanF, fanG, lfo };
  }
  function stop() {
    if (!v) return;
    const n = v, ac = kit.ac;
    v = null;
    if (ac) {
      n.out.gain.setTargetAtTime(0, ac.currentTime, 0.12);
      [n.src, n.src2, n.w1, n.w2, n.fan, n.lfo].forEach(o => { try { o.stop(ac.currentTime + 0.8); } catch { /* stopped */ } });
    }
    setTimeout(() => n.out.disconnect(), 1000);
  }
  // A crackle: a short torn burst from the reheat.
  function crack(ac, x, k) {
    const t = ac.currentTime + Math.random() * 0.03, s = ac.createBufferSource(), g = gain(ac), p = ac.createStereoPanner();
    p.pan.value = Math.max(-0.8, Math.min(0.8, x + (Math.random() - 0.5) * 0.3));
    s.buffer = kit.noise; s.playbackRate.value = jit(0.8, 0.3);
    const f = filt(ac, 'bandpass', jit(1400, 0.4), 0.9);
    const d = jit(0.035, 0.5);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(jit(0.16, 0.5) * k, t + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    s.connect(f).connect(g).connect(p).connect(kit.out);
    s.start(t, Math.random() * 0.8, d + 0.03);
    s.onended = () => p.disconnect();
  }

  return {
    // rpm 0 to 1; pan -1 to 1; hand says the throttle is being worked.
    update(rpm, pan, dt, hand) {
      // The voice follows the hand, then fades after the spool-down.
      level = hand ? Math.min(1, level + dt * 6) : Math.max(0, level - dt * 0.28);
      const ac = live();
      if (!ac) { if (v && !sound.on) stop(); return; }
      // The context sleeps once the voice is gone, while the hover drifts on.
      if (level <= 0) { if (v) { stop(); kit.rest(() => !v && level <= 0); } return; }
      start(ac);
      const t = ac.currentTime, k = 0.06;
      const r = rpm * rpm;
      v.out.gain.setTargetAtTime(level * level, t, 0.08);
      v.pan.pan.setTargetAtTime(Math.max(-0.7, Math.min(0.7, pan)), t, 0.2);
      v.roarF.frequency.setTargetAtTime(380 + 2600 * r, t, k);
      v.roarG.gain.setTargetAtTime(0.1 + 0.5 * r, t, k);
      v.rumG.gain.setTargetAtTime(0.25 + 0.75 * r, t, k);
      v.hisG.gain.setTargetAtTime(0.012 + 0.1 * r * rpm, t, k);
      v.w1.frequency.setTargetAtTime(1650 + 2900 * rpm, t, k);
      v.w2.frequency.setTargetAtTime((1650 + 2900 * rpm) * 1.507, t, k);
      v.wG.gain.setTargetAtTime(0.018 + 0.018 * (1 - rpm), t, k);
      v.fan.frequency.setTargetAtTime(110 + 190 * rpm, t, k);
      v.fanF.frequency.setTargetAtTime(700 + 900 * rpm, t, k);
      v.fanG.gain.setTargetAtTime(0.02 + 0.03 * rpm, t, k);
      // Crackle runs only near full reheat.
      const rate = Math.max(0, rpm - 0.62) * 90 * level;
      if (Math.random() < rate * dt) crack(ac, pan, Math.min(1, (rpm - 0.62) * 3));
    },
    get busy() { return level > 0; },
    rest() { level = 0; stop(); kit.rest(() => !v); },
    hide() { level = 0; stop(); kit.ac?.suspend()?.catch(() => {}); },
  };
}
