// Steelworks sound: the hall, the drill, the tap roar, sparks, the clay gun.
// Raw Web Audio on the shared kit; muted until the toy's sound is on.
import { sound } from '../shared/stim.js';

const jit = (v, k) => v * (1 + (Math.random() * 2 - 1) * k);

export function steelSound(kit) {
  let v = null, level = 0;
  const live = () => (sound.on ? kit.live() : null);
  const gain = (ac, g = 0) => { const n = ac.createGain(); n.gain.value = g; return n; };
  const filt = (ac, type, f, q = 0.7) => { const n = ac.createBiquadFilter(); n.type = type; n.frequency.value = f; n.Q.value = q; return n; };
  const noise = (ac, rate = 1) => { const s = ac.createBufferSource(); s.buffer = kit.noise; s.loop = true; s.playbackRate.value = rate; return s; };

  // The beds: built when sound is first heard, torn down at rest.
  function start(ac) {
    if (v || !kit.noise) return;
    const out = gain(ac, 0);
    out.connect(kit.out);
    // The hall: extraction fans, a broad low hiss and a mains hum.
    const fanS = noise(ac, 0.6), fanF = filt(ac, 'bandpass', 220, 0.5), fanG = gain(ac, 0.05);
    fanS.connect(fanF).connect(fanG).connect(out);
    const hum = ac.createOscillator(), humG = gain(ac, 0.012);
    hum.frequency.value = 50; hum.type = 'triangle';
    hum.connect(humG).connect(out);
    // The drill: a grinding band with a hammer rattle on it.
    const drS = noise(ac, 1.4), drF = filt(ac, 'bandpass', 900, 2.2), drG = gain(ac, 0), drA = gain(ac, 0.5);
    const rat = ac.createOscillator(), ratG = gain(ac, 0.5);
    rat.frequency.value = 19; rat.type = 'square';
    rat.connect(ratG).connect(drA.gain);
    drS.connect(drF).connect(drA).connect(drG).connect(out);
    // The tap: a deep roar of gas and iron, and the rush of the run.
    const roS = noise(ac, 0.8), roF = filt(ac, 'lowpass', 500, 0.6), roG = gain(ac, 0);
    roS.connect(roF).connect(roG).connect(out);
    const ruS = noise(ac, 0.45), ruF = filt(ac, 'bandpass', 160, 0.8), ruG = gain(ac, 0);
    ruS.connect(ruF).connect(ruG).connect(out);
    [fanS, hum, drS, rat, roS, ruS].forEach(n => n.start());
    v = { out, fanG, drG, drF, roG, roF, ruG, nodes: [fanS, hum, drS, rat, roS, ruS] };
  }
  function stop() {
    if (!v) return;
    const n = v, ac = kit.ac;
    v = null;
    if (ac) {
      n.out.gain.setTargetAtTime(0, ac.currentTime, 0.15);
      n.nodes.forEach(o => { try { o.stop(ac.currentTime + 1); } catch { /* stopped */ } });
    }
    setTimeout(() => n.out.disconnect(), 1200);
  }
  // One short burst of filtered noise.
  function burst(ac, { f, q = 1, dur, lvl, type = 'bandpass', at = 0, rate = 1 }) {
    const t = ac.currentTime + at, s = ac.createBufferSource(), g = gain(ac), b = filt(ac, type, jit(f, 0.15), q);
    s.buffer = kit.noise; s.playbackRate.value = jit(rate, 0.2);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(jit(lvl, 0.2), t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(b).connect(g).connect(kit.out);
    s.start(t, Math.random() * 0.5, dur + 0.05);
    s.onended = () => g.disconnect();
  }
  // A low knock: a sine that drops in pitch.
  function knock(ac, f, dur, lvl, at = 0) {
    const t = ac.currentTime + at, o = ac.createOscillator(), g = gain(ac);
    o.frequency.setValueAtTime(jit(f, 0.1), t);
    o.frequency.exponentialRampToValueAtTime(f * 0.5, t + dur);
    g.gain.setValueAtTime(jit(lvl, 0.2), t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(kit.out);
    o.start(t); o.stop(t + dur + 0.05);
    o.onended = () => g.disconnect();
  }

  return {
    // s: drill, bore, jet (0 to about 2), run (hot iron), sparks.
    update(dt, s) {
      const act = s.drill || s.jet > 0.02 || s.run > 0.002;
      level = act ? Math.min(1, level + dt * 4) : Math.max(0, level - dt * 0.25);
      const ac = live();
      if (!ac) { if (v && !sound.on) stop(); return; }
      if (level <= 0) { if (v) { stop(); kit.rest(() => !v && level <= 0); } return; }
      start(ac);
      const t = ac.currentTime, k = 0.08, j = Math.min(2, s.jet);
      v.out.gain.setTargetAtTime(level, t, 0.1);
      v.fanG.gain.setTargetAtTime(0.04 + 0.05 * Math.min(1, s.run * 20), t, 0.5);
      v.drG.gain.setTargetAtTime(s.drill ? 0.12 + 0.1 * s.bore : 0, t, 0.03);
      v.drF.frequency.setTargetAtTime(700 + 900 * s.bore, t, k);
      v.roG.gain.setTargetAtTime(0.32 * Math.min(1, j), t, k);
      v.roF.frequency.setTargetAtTime(300 + 500 * j, t, k);
      v.ruG.gain.setTargetAtTime(0.3 * Math.min(1, s.run * 12), t, 0.3);
      // Sparks crackle at a rate that follows the fountains.
      if (Math.random() < Math.min(1, s.sparks) * 40 * dt) burst(ac, { f: 3200, q: 1.4, dur: 0.03, lvl: 0.06 * Math.min(1, s.sparks), rate: 1.5 });
      // Gas thumps inside the roar.
      if (j > 0.1 && Math.random() < j * 2.5 * dt) knock(ac, 60, 0.25, 0.12 * Math.min(1, j));
    },
    // One-off events: the blow, the clay gun, a splash.
    event(e) {
      const ac = live();
      if (!ac) return;
      if (e === 'blow') {
        knock(ac, 48, 0.9, 0.5);
        burst(ac, { f: 300, q: 0.5, dur: 1.4, lvl: 0.4, type: 'lowpass' });
        burst(ac, { f: 2200, q: 0.6, dur: 0.8, lvl: 0.12, at: 0.05 });
      } else if (e === 'gun') {
        knock(ac, 90, 0.35, 0.35);
        burst(ac, { f: 1200, q: 0.8, dur: 0.12, lvl: 0.15, type: 'highpass' });
        burst(ac, { f: 1800, q: 0.5, dur: 1.2, lvl: 0.08, at: 0.6 });
      } else if (e === 'splash') {
        burst(ac, { f: 2600, q: 0.9, dur: 0.18, lvl: 0.14 });
        knock(ac, 120, 0.12, 0.08);
      }
    },
    get busy() { return level > 0; },
    rest() { level = 0; stop(); kit.rest(() => !v); },
    hide() { level = 0; stop(); kit.ac?.suspend()?.catch(() => {}); },
  };
}
