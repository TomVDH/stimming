// Ship launch sound: the rope and the shores, the slide's rumble, the chains, the hit, the wash, the crowd.
// Every sound from the hull comes late by its distance; the shed throws the rumble back.
// Raw Web Audio on the shared kit; muted until the toy's sound is on.
import { sound } from '../shared/stim.js';

const jit = (v, k) => v * (1 + (Math.random() * 2 - 1) * k);
const panOf = x => Math.max(-0.8, Math.min(0.8, x * 0.7));

export function launchSound(kit) {
  // Every scheduled source, so mute and a hidden tab can stop them.
  const pending = new Set();
  let bed = null, restT = 0;
  const live = () => (sound.on ? kit.live() : null);
  const gain = (ac, g = 0) => { const n = ac.createGain(); n.gain.value = g; return n; };
  const filt = (ac, type, f, q = 0.7) => { const n = ac.createBiquadFilter(); n.type = type; n.frequency.value = f; n.Q.value = q; return n; };
  const pan = (ac, x) => { const p = ac.createStereoPanner(); p.pan.value = panOf(x); p.connect(kit.out); return p; };
  function track(src, tail) {
    pending.add(src);
    src.onended = () => { pending.delete(src); tail.disconnect(); };
  }
  function noise(ac, x, { at, chain, level, attack = 0.01, hold = 0, decay, rate = 1 }) {
    const t = ac.currentTime + at, s = ac.createBufferSource(), g = gain(ac), p = pan(ac, x);
    s.buffer = kit.noise; s.loop = true; s.playbackRate.value = jit(rate, 0.1);
    let n = s;
    chain.forEach(f => { n.connect(f); n = f; });
    n.connect(g).connect(p);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(level, t + attack);
    g.gain.setValueAtTime(level, t + attack + hold);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + hold + decay);
    s.start(t, Math.random() * 0.5);
    s.stop(t + attack + hold + decay + 0.05);
    track(s, p);
  }
  function tone(ac, x, { at, f0, f1, level, decay, type = 'sine', attack = 0.012 }) {
    const t = ac.currentTime + at, o = ac.createOscillator(), g = gain(ac), p = pan(ac, x);
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(f1, t + decay);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(level, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
    o.connect(g).connect(p);
    o.start(t); o.stop(t + decay + 0.05);
    track(o, p);
  }
  // A wooden knock: a short low tone and a dull click.
  function knock(ac, x, at, k) {
    tone(ac, x, { at, f0: jit(170, 0.15), f1: 90, level: 0.22 * k, decay: jit(0.12, 0.2), type: 'triangle', attack: 0.002 });
    noise(ac, x, { at, chain: [filt(ac, 'bandpass', jit(900, 0.2), 1.2)], level: 0.12 * k, attack: 0.001, decay: 0.05 });
  }

  // The bed: the slide's rumble, the chains' rattle and the canal's wash, each following the scene.
  function startBed(ac) {
    if (bed || !kit.noise) return;
    const src = rate => { const s = ac.createBufferSource(); s.buffer = kit.noise; s.loop = true; s.playbackRate.value = rate; s.start(0, Math.random()); return s; };
    const out = gain(ac, 1);
    out.connect(kit.out);
    // The rumble: low grinding noise and its echo off the shed, a quarter second later.
    const rum = gain(ac), rumLo = filt(ac, 'lowpass', 140, 0.9);
    src(0.4).connect(rumLo).connect(rum).connect(out);
    const echo = ac.createDelay(1), echoG = gain(ac, 0.35), echoLo = filt(ac, 'lowpass', 110, 0.7);
    rum.connect(echo).connect(echoLo).connect(echoG).connect(out);
    echo.delayTime.value = 0.26;
    // The chains: a bright rattle, chopped by a fast tremolo.
    const ch = gain(ac), chBp = filt(ac, 'bandpass', 2300, 1.4), trem = gain(ac, 0.5), lfo = ac.createOscillator(), lfoG = gain(ac, 0.5);
    lfo.type = 'square'; lfo.frequency.value = 17;
    lfo.connect(lfoG).connect(trem.gain);
    src(1.1).connect(chBp).connect(trem).connect(ch).connect(out);
    lfo.start();
    // The wash: water rushing over stone, swelling as the wave nears.
    const wash = gain(ac), washBp = filt(ac, 'bandpass', 700, 0.5);
    src(0.8).connect(washBp).connect(wash).connect(out);
    bed = { out, rum, ch, wash, lfo, quiet: 0 };
  }
  function stopBed() {
    if (!bed) return;
    const b = bed, ac = kit.ac;
    bed = null;
    if (ac) b.out.gain.setTargetAtTime(0, ac.currentTime, 0.2);
    setTimeout(() => { try { b.lfo.stop(); } catch { /* stopped */ } b.out.disconnect(); }, 1200);
  }
  function cancel() {
    for (const s of pending) { try { s.stop(); } catch { /* not started */ } }
    pending.clear();
  }

  return {
    // The rope parts, the weight drops, the shores go out in a ragged row.
    release(delay, x) {
      const ac = live(); if (!ac) return;
      noise(ac, x, { at: delay, chain: [filt(ac, 'highpass', 1800, 0.8)], level: 0.18, attack: 0.002, decay: 0.08 });
      tone(ac, x, { at: delay + 0.18, f0: 120, f1: 55, level: 0.3, decay: 0.3, attack: 0.003 });
      for (let i = 0; i < 8; i++) knock(ac, x + (i - 3.5) * 0.12, delay + 0.35 + i * jit(0.09, 0.4), jit(0.8, 0.3));
    },
    // She groans: a deep creak before she moves.
    groan(delay, x) {
      const ac = live(); if (!ac) return;
      tone(ac, x, { at: delay, f0: jit(62, 0.1), f1: jit(48, 0.1), level: 0.16, decay: 1.6, type: 'sawtooth', attack: 0.4 });
      noise(ac, x, { at: delay, chain: [filt(ac, 'bandpass', 260, 4)], level: 0.1, attack: 0.3, decay: 1.4 });
    },
    // The hit: a deep whump, the roar of the sheet, its patter falling back.
    hit(size, delay, x) {
      const ac = live(); if (!ac) return;
      const L = 0.45 + 0.55 * size;
      tone(ac, x, { at: delay, f0: jit(52, 0.08), f1: 24, level: 0.9 * L, decay: jit(1.8, 0.1), attack: 0.02 });
      noise(ac, x, { at: delay, chain: [filt(ac, 'lowpass', jit(420, 0.1), 0.6)], level: 0.7 * L, attack: 0.05, hold: 0.5, decay: 2.6 });
      noise(ac, x, { at: delay + 0.1, chain: [filt(ac, 'bandpass', jit(1500, 0.15), 0.5)], level: 0.3 * L, attack: 0.15, hold: 0.6, decay: 2.2 });
      noise(ac, x, { at: delay + 1.2, chain: [filt(ac, 'highpass', 2500, 0.6)], level: 0.12 * L, attack: 0.3, hold: 0.8, decay: 1.6 });
      // The shed throws the whump back.
      noise(ac, -x * 0.5, { at: delay + 0.3, chain: [filt(ac, 'lowpass', 240, 0.6)], level: 0.22 * L, attack: 0.04, decay: 1.4 });
    },
    // The wave slaps the near quay wall and sheets over the stones.
    slap(k, x) {
      const ac = live(); if (!ac) return;
      noise(ac, x, { at: 0, chain: [filt(ac, 'lowpass', jit(900, 0.2), 0.7)], level: 0.35 * k, attack: 0.01, decay: 0.5 });
      noise(ac, x, { at: 0.05, chain: [filt(ac, 'highpass', 1600, 0.6)], level: 0.18 * k, attack: 0.05, hold: 0.3, decay: 1.4 });
    },
    // The crowd: a swelling cheer, many voices as shaped noise.
    cheer(delay, k) {
      const ac = live(); if (!ac) return;
      for (let i = 0; i < 5; i++) noise(ac, (i - 2) * 0.3, { at: delay + i * 0.12, chain: [filt(ac, 'bandpass', jit(900 + i * 260, 0.2), 1.8)], level: 0.07 * k, attack: 0.5, hold: 1.2, decay: 2.8 });
    },
    // The bed follows the slide, the chains and the water near the eye.
    update({ rumble, chains, wash }) {
      const ac = live();
      const want = rumble > 0.01 || chains > 0.01 || wash > 0.01;
      if (!ac) { if (bed && !sound.on) stopBed(); return; }
      if (want) startBed(ac);
      if (!bed) return;
      const t = ac.currentTime;
      bed.rum.gain.setTargetAtTime(0.6 * rumble, t, 0.12);
      bed.ch.gain.setTargetAtTime(0.25 * chains, t, 0.08);
      bed.wash.gain.setTargetAtTime(0.3 * wash, t, 0.25);
      bed.quiet = want ? 0 : bed.quiet + 1;
      if (bed.quiet > 60) stopBed();
    },
    get pending() { return pending.size; },
    get busy() { return !!bed || pending.size > 0; },
    // The context sleeps only after the last late sound has played.
    rest() {
      stopBed();
      clearTimeout(restT);
      const tryRest = () => { if (pending.size) restT = setTimeout(tryRest, 500); else kit.rest(() => !bed && pending.size === 0); };
      tryRest();
    },
    cancel() { cancel(); stopBed(); },
    hide() { clearTimeout(restT); cancel(); stopBed(); kit.ac?.suspend()?.catch(() => {}); },
  };
}
