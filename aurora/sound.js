// Fjord aurora sound in Web Audio. Muted by default; the kit holds the context.
// A low pad follows the activity; air moves over the water.
// A strong storm crackles faintly, as observers report.
// The surge sweeps east to west; a gust rings a soft shimmer.

const jit = (k = 0.1) => 1 + (Math.random() * 2 - 1) * k;
// The pad: a low A with its fifth and octave.
const PAD = [55, 82.41, 110, 164.8];
// Shimmer notes: an A minor pentatonic, two octaves up.
const BELLS = [880, 987.8, 1174.7, 1318.5, 1568, 1760, 1975.5];

export function makeSound(kit) {
  let bed = null, pending = 0, crackT = 0, level = 0.45;

  function voice(ac, pan = 0) {
    const g = ac.createGain();
    g.gain.value = 0;
    const p = ac.createStereoPanner();
    p.pan.value = Math.max(-1, Math.min(1, pan));
    g.connect(p).connect(kit.out);
    return g;
  }

  // The bed: the pad and the air. It starts on the first live frame.
  function startBed(ac) {
    const out = voice(ac, 0);
    const lp = ac.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 260;
    lp.Q.value = 0.7;
    lp.connect(out);
    const oscs = PAD.map((f, i) => {
      const o = ac.createOscillator();
      o.type = i < 2 ? 'sawtooth' : 'triangle';
      o.frequency.value = f;
      o.detune.value = (Math.random() * 2 - 1) * 7;
      const g = ac.createGain();
      g.gain.value = [0.5, 0.32, 0.26, 0.12][i];
      o.connect(g).connect(lp);
      o.start();
      return o;
    });
    // A slow wobble of the detune keeps the pad alive.
    const lfo = ac.createOscillator();
    lfo.frequency.value = 0.07;
    const lg = ac.createGain();
    lg.gain.value = 6;
    lfo.connect(lg);
    oscs.forEach(o => lg.connect(o.detune));
    lfo.start();
    // The air: soft noise low over the water.
    const air = ac.createBufferSource();
    air.buffer = kit.noise;
    air.loop = true;
    const alp = ac.createBiquadFilter();
    alp.type = 'bandpass';
    alp.frequency.value = 420;
    alp.Q.value = 0.6;
    const ag = voice(ac, 0);
    air.connect(alp).connect(ag);
    air.start(0, Math.random() * 0.9);
    bed = { out, lp, oscs, lfo, air, alp, ag };
  }

  // Each frame: the pad opens with the activity; crackles in a strong storm.
  function frame(act, storm, dt) {
    const ac = kit.live();
    if (!ac || !kit.noise) return;
    if (!bed) startBed(ac);
    const t = ac.currentTime;
    bed.out.gain.setTargetAtTime(0.05 + 0.05 * Math.min(act, 1.2), t, 0.6);
    bed.lp.frequency.setTargetAtTime(220 + 900 * Math.min(act, 1.3) + 600 * storm, t, 0.8);
    bed.ag.gain.setTargetAtTime(0.025 + 0.02 * level, t, 0.8);
    bed.alp.frequency.setTargetAtTime(360 + 260 * level, t, 1.2);
    // The crackle rate rises above an activity of 0.7.
    const rate = Math.max(0, act - 0.7) * 9 + storm * 2.5;
    crackT -= dt;
    if (rate > 0.05 && crackT <= 0) {
      crackle(ac);
      crackT = -Math.log(1 - Math.random()) / rate;
    }
  }

  // One crackle: a dry snap, or a short run of them.
  function crackle(ac) {
    const n = Math.random() < 0.3 ? 2 + Math.floor(Math.random() * 4) : 1;
    const pan = Math.random() * 1.6 - 0.8;
    let t = ac.currentTime + 0.01;
    for (let i = 0; i < n; i++) {
      const g = voice(ac, pan + (Math.random() - 0.5) * 0.1);
      const src = ac.createBufferSource();
      src.buffer = kit.noise;
      const bp = ac.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 1400 + Math.random() * 3200;
      bp.Q.value = 1.5 + Math.random() * 3;
      const len = 0.006 + Math.random() * 0.014;
      const lv = 0.12 * jit(0.5);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(lv, t + 0.0008);
      g.gain.exponentialRampToValueAtTime(0.0003, t + len);
      src.connect(bp).connect(g);
      src.start(t, Math.random() * 0.9, len + 0.01);
      pending++;
      src.onended = () => { pending--; };
      t += 0.02 + Math.random() * 0.07;
    }
  }

  // The surge: a breath that sweeps east to west, and a swell of the pad.
  function surge(k) {
    const ac = kit.live();
    if (!ac || !kit.noise) return;
    const t = ac.currentTime + 0.02, len = 5.5 * jit(0.1);
    const src = ac.createBufferSource();
    src.buffer = kit.noise;
    src.loop = true;
    const bp = ac.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 1.4;
    bp.frequency.setValueAtTime(260 * jit(0.1), t);
    bp.frequency.exponentialRampToValueAtTime(1900 * jit(0.15), t + len * 0.45);
    bp.frequency.exponentialRampToValueAtTime(500, t + len);
    const g = ac.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.09 * k, t + len * 0.35);
    g.gain.exponentialRampToValueAtTime(0.0004, t + len);
    const p = ac.createStereoPanner();
    p.pan.setValueAtTime(0.85, t);
    p.pan.linearRampToValueAtTime(-0.85, t + len);
    src.connect(bp).connect(g).connect(p).connect(kit.out);
    src.start(t);
    src.stop(t + len + 0.05);
    pending++;
    src.onended = () => { pending--; };
    // A low tone rises under the breath.
    const o = ac.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(55, t);
    o.frequency.exponentialRampToValueAtTime(82.4, t + len * 0.6);
    const og = voice(ac, 0);
    og.gain.setValueAtTime(0, t);
    og.gain.linearRampToValueAtTime(0.12 * k, t + 1.2);
    og.gain.exponentialRampToValueAtTime(0.0004, t + len);
    o.connect(og);
    o.start(t); o.stop(t + len + 0.05);
  }

  // A gust: three soft bell partials, never the same, and a breath.
  function gust(sx) {
    const ac = kit.live();
    if (!ac || !kit.noise) return;
    const t = ac.currentTime + 0.01;
    const picks = BELLS.slice().sort(() => Math.random() - 0.5).slice(0, 3);
    picks.forEach((f, i) => {
      const o = ac.createOscillator();
      o.type = 'sine';
      o.frequency.value = f * jit(0.004);
      const g = voice(ac, sx * 0.8 + (i - 1) * 0.15);
      const at = t + i * (0.05 + Math.random() * 0.08);
      const len = 2.2 * jit(0.25);
      g.gain.setValueAtTime(0, at);
      g.gain.linearRampToValueAtTime(0.035 * jit(0.3), at + 0.12);
      g.gain.exponentialRampToValueAtTime(0.0003, at + len);
      o.connect(g);
      o.start(at); o.stop(at + len + 0.05);
      pending++;
      o.onended = () => { pending--; };
    });
    const src = ac.createBufferSource();
    src.buffer = kit.noise;
    const hp = ac.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 2400 * jit(0.2);
    const g = voice(ac, sx * 0.8);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.03, t + 0.25);
    g.gain.exponentialRampToValueAtTime(0.0003, t + 1.4);
    src.connect(hp).connect(g);
    src.start(t, Math.random() * 0.4, 1.5);
  }

  function wind(v) { level = v; }

  // The bed fades and its nodes stop; the kit then sleeps.
  function quiet() {
    const ac = kit.ac;
    if (!bed || !ac) return;
    const b = bed, t = ac.currentTime;
    bed = null;
    b.out.gain.setTargetAtTime(0, t, 0.15);
    b.ag.gain.setTargetAtTime(0, t, 0.15);
    [...b.oscs, b.lfo, b.air].forEach(n => { try { n.stop(t + 0.8); } catch { /* stopped already */ } });
  }

  return { wind, surge, gust, frame, quiet, get busy() { return pending > 0; } };
}
